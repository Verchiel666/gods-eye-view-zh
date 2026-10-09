import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { expandApplicationHtml } from '../../build/application-html.js';

/**
 * 汉化补丁（public/zh.js）回归测试。
 *
 * 这个 fork 用运行时 DOM 注入做汉化：词典精确匹配 + 正则动态规则 + ' · ' 分段兜底。
 * 上游一旦重构 UI（改文案、改拼接方式），补丁会静默失效——界面悄悄退回英文，
 * 没有任何报错。本测试把「覆盖率」变成可执行门槛：
 *
 *   - 静态文案必须 100% 覆盖（title / 文本节点 / placeholder / aria-label）
 *   - 关键动态串规则必须仍能译出
 *   - 幂等性：译文回写后不得被 MutationObserver 反复改写（否则 DOM 持续抖动）
 *   - 专有名词（地名、呼号、电台名）必须保留原文
 *
 * 同步上游后若本测试变红，说明上游改了文案，需补 public/zh.js 词典。
 *
 * ⚠ 「静态文案」的来源（2026-09-15 上游重构后）：
 * 上游已把 index.html 瘦成壳（约 40 行），真实标记拆进 src/ui/templates/*.html，
 * 由 build/application-html.js 的 expandApplicationHtml() 在 Vite
 * transformIndexHtml 阶段展开 `<!-- gev:template X -->` 占位符。
 * 本测试因此直接复用上游那个展开函数（与 src/*.test.mjs 同款相对路径写法），
 * 测的才是浏览器真正渲染出来的标记——上游再加模板会自动纳入门槛，
 * 不会因「index.html 里找不到文案」而假绿。
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PATCH_PATH = path.join(REPO_ROOT, 'public/zh.js');
const HTML_PATH = path.join(REPO_ROOT, 'index.html');

/** 在 vm 沙箱中加载 zh.js，暴露内部 lookup / translateNode 供断言。 */
function loadPatch() {
  const source = readFileSync(PATCH_PATH, 'utf8');
  // 追加测试句柄导出；不修改源文件本身。
  const instrumented = source.replace(
    /\n\}\)\(\);\s*$/,
    "\n  try { globalThis.__GEV_ZH__ = { lookup: lookup, translateNode: translateNode, DICT: DICT }; } catch (e) {}\n})();\n",
  );
  assert.notEqual(instrumented, source, 'zh.js 结构变化：未找到 IIFE 结尾，无法注入测试句柄');

  const dialogCalls = { confirm: [], alert: [], prompt: [] };
  const sandbox = {
    globalThis: null,
    window: {
      confirm: (m) => { dialogCalls.confirm.push(m); return true; },
      alert: (m) => { dialogCalls.alert.push(m); },
      prompt: (m, d) => { dialogCalls.prompt.push([m, d]); return ''; },
    },
    localStorage: { getItem: () => 'zh', setItem: () => {} },
    document: {
      readyState: 'complete',
      title: '',
      body: { appendChild() {} },
      documentElement: { appendChild() {} },
      createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
      createTreeWalker: () => ({ nextNode: () => null }),
      addEventListener() {},
    },
    MutationObserver: class { observe() {} },
    NodeFilter: { SHOW_TEXT: 4, SHOW_ELEMENT: 1 },
    setInterval: () => 0,
    location: { reload() {} },
    WeakSet,
    console,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(instrumented, sandbox, { filename: 'zh.js' });

  const api = sandbox.__GEV_ZH__;
  assert.ok(api, 'zh.js 未暴露测试句柄');
  return { lookup: api.lookup, translateNode: api.translateNode, dict: api.DICT, sandbox, dialogCalls };
}

/* ---------- 最小 DOM 桩：统计写入次数以验证幂等性 ---------- */
function textNode(data, parentNode = null) {
  const node = {
    nodeType: 3,
    writes: 0,
    parentNode,
    _data: data,
  };
  Object.defineProperty(node, 'data', {
    get() { return node._data; },
    set(v) { node.writes += 1; node._data = v; },
  });
  return node;
}

function element(tagName, attrs = {}) {
  const store = { ...attrs };
  const el = {
    nodeType: 1,
    tagName,
    writes: 0,
    // className / classList 是补丁识别 Material Symbols 图标容器的依据
    className: attrs.class || '',
    hasAttribute: (k) => k in store,
    getAttribute: (k) => (k in store ? store[k] : null),
    setAttribute(k, v) { this.writes += 1; store[k] = v; },
  };
  el.classList = {
    contains: (c) => (el.className || '').split(/\s+/).includes(c),
  };
  return el;
}

/* ---------- HTML 实体解码（还原 DOM 运行时的真实文本） ---------- */
function decodeEntities(input) {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)));
}

/**
 * 只保留"值得翻译"的文案：含英文单词、非纯数据、非中文。
 *
 * 单词标签（Draw / Shape / Clear / Snow）同样必须覆盖——它们是按钮上的可见文案，
 * 漏译就是界面上明晃晃的英文。排除项：
 *   - **不含空白的**标识符/域名/文件名（adsb.lol、feeds_osm、vite.config 等数据源名，不译）
 *   - 纯数值读数（`0.9 dB`、`87.5`、`24°` 等，无翻译价值）
 *   - 需含 2 个以上连续字母（挡掉纯数据）
 *
 * ⚠ 曾经的盲区（2026-09-28 修正）：早期这里写的是 `if (/[._]/.test(t)) return false;`
 * ——一刀切排除所有含点号的串，把**句号结尾的整句说明文案**也一起误杀了，
 * 例如 `Connect an RTL-SDR to begin.`、`Initializing photorealistic world...`、
 * `Search any location...`。这类文案是界面上大段可见文本，漏译最刺眼，
 * 而门槛却一路假绿。改成「含点号 **且** 不含空白」才排除，只放过真正的标识符。
 * 代价是要显式排除纯数值读数（`0.9 dB` 这类下拉选项会涌进来），故加了数值正则。
 */
function isTranslatable(raw) {
  const t = raw.replace(/\s+/g, ' ').trim();
  if (t.length < 2) return false;
  if (/[一-鿿]/.test(t)) return false;
  if (!/[A-Za-z]{2}/.test(t)) return false;
  // 标识符 / 域名 / 文件名：adsb.lol、feeds_osm、vite.config —— 均不含空白
  if (/[._]/.test(t) && !/\s/.test(t)) return false;
  // 纯数值读数（含可选单位）：0.9 dB、87.5、108、24°
  if (/^[\d.,\s]+(dB|km\/h|km|m|s|min|h|MHz|kt|°|%|m²)?$/i.test(t)) return false;
  return true;
}

/**
 * 提取浏览器实际渲染出来的可翻译静态文案。
 *
 * 上游已把 index.html 瘦成壳，真实标记在 src/ui/templates/*.html，
 * 由 expandApplicationHtml() 在构建期展开 `<!-- gev:template X -->` 占位符。
 * 这里复用同一个函数，确保测的是运行时标记，而不是壳。
 *
 * 两个必须剔除的假阳性：
 *   - script/style/注释（不参与渲染）
 *   - Material Symbols 图标连字（<span class="... material-symbols-outlined">draw</span>）：
 *     那是字体连字码点，译了就渲染成方框，绝不能进词典/门槛
 */
function collectHtmlStrings() {
  const expanded = expandApplicationHtml(readFileSync(HTML_PATH, 'utf8'));
  const html = expanded
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    // 先整体抹掉图标 span（含其文本连字），再提文案
    .replace(/<span[^>]*material-symbols-outlined[^>]*>[\s\S]*?<\/span>/gi, '');

  const groups = [
    { name: 'title', re: /\btitle\s*=\s*"([^"]+)"/g },
    { name: 'text', re: />([^<>{}]+)</g },
    { name: 'placeholder', re: /\bplaceholder\s*=\s*"([^"]+)"/g },
    { name: 'aria-label', re: /\baria-label\s*=\s*"([^"]+)"/g },
  ];

  const out = [];
  const seen = new Set();
  for (const { name, re } of groups) {
    const items = new Set();
    for (const m of html.matchAll(re)) {
      const t = decodeEntities(m[1]).replace(/\s+/g, ' ').trim();
      if (isTranslatable(t) && !seen.has(t)) {
        seen.add(t);
        items.add(t);
      }
    }
    out.push({ name, items: [...items] });
  }
  return out;
}

/**
 * 采集 JS 源码里内嵌 HTML 模板中的可见文案。
 *
 * ⚠ 为什么需要它（2026-10-09 实测教训）：
 * collectHtmlStrings() 只看 index.html + src/ui/templates/*.html。但上游有多个
 * 模块把整块面板标记写成 JS 里的 innerHTML 模板字符串，例如：
 *   - src/voice/control.js        语音助手控件与语音卡片（2026-09-15 引入）
 *   - src/hud.js                  HUD 抬头显示
 *   - src/layers/launches/panel.js 太空任务面板
 *   - src/layers/awareness/panel.js 军事目标情报面板
 *   - src/data/bhoteKoshiEvent.js 尼泊尔洪水事件面板
 * 这些文案浏览器确实渲染，但静态门槛一条也扫不到 —— 语音卡片自引入起就是
 * 英文，欠账潜伏了 3 周，门槛一路 21/21 全绿。
 *
 * 两层盲区，必须都覆盖：
 *   1. **变量间接赋值** —— awareness/panel.js 先 `const markup = \`...\`` 再
 *      `panel.innerHTML = markup`。只匹配 `innerHTML = \`...\`` 会整块漏掉，
 *      因此这里不按赋值形态匹配，改为抓所有「含 HTML 标签的反引号模板」。
 *      代价是可能扫到非 innerHTML 的模板，但下面只提取属性值与标签间文本，
 *      不会误伤（纯 JS 模板里的字符串不带 HTML 标签）。
 *   2. **插值里的三元字面量** —— `${layerState.enabled ? 'CONTEXT READY' : 'GLOBAL CONTEXT OFF'}`
 *      文案藏在 `${}` 内部。标签间文本正则 />([^<>{}]+)</ 刻意排除了 `{}`，
 *      这类串必须单独抓，否则开关文案永远漏。
 *
 * 已知噪声：箭头函数 `names.map((name) => escapeHtml(name)).join('<br>')`
 * 会让文本正则匹配到 `escapeHtml(name)).join('` 这类代码碎片。用 isTranslatable
 * 之外的形状过滤（含 `(` / `=>` / `'` 的碎片）剔除，见下方 KEEP_RE。
 */
function collectInlineHtmlStrings() {
  const SRC_ROOT = path.join(REPO_ROOT, 'src');
  const files = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.js$/.test(entry) && !/\.test\.m?js$/.test(entry)) files.push(full);
    }
  })(SRC_ROOT);

  const HTMLISH = /<[a-z][a-z0-9-]*[\s>/]/i;
  // 代码碎片过滤：真文案不会长成这样
  const CODE_FRAGMENT = /[()='`]|=>|\bjoin\b|\bmap\b|\bfunction\b/;
  const groups = [
    { name: 'title', re: /\btitle\s*=\s*"([^"${]+)"/g },
    { name: 'text', re: />([^<>{}]+)</g },
    { name: 'placeholder', re: /\bplaceholder\s*=\s*"([^"${]+)"/g },
    { name: 'aria-label', re: /\baria-label\s*=\s*"([^"${]+)"/g },
  ];

  const out = [];
  const seen = new Set();
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    if (!source.includes('innerHTML')) continue;
    const blocks = [...source.matchAll(/`([\s\S]*?)`/g)]
      .map((m) => m[1])
      .filter((b) => HTMLISH.test(b));
    if (!blocks.length) continue;
    const html = blocks.join('\n');

    const items = new Set();
    for (const { name, re } of groups) {
      for (const m of html.matchAll(re)) {
        const t = decodeEntities(m[1]).replace(/\s+/g, ' ').trim();
        if (!isTranslatable(t) || CODE_FRAGMENT.test(t)) continue;
        if (seen.has(t)) continue;
        seen.add(t);
        items.add(t);
      }
    }
    // 插值里的三元字面量（第二层盲区）
    for (const m of html.matchAll(/\?\s*'([^']+)'\s*:\s*'([^']+)'/g)) {
      for (const candidate of [m[1], m[2]]) {
        const t = candidate.replace(/\s+/g, ' ').trim();
        if (!isTranslatable(t) || CODE_FRAGMENT.test(t)) continue;
        if (seen.has(t)) continue;
        seen.add(t);
        items.add(t);
      }
    }
    if (items.size) {
      // Windows 下 path.relative 返回反斜杠，与断言里写的 POSIX 路径不匹配。
      // 统一成正斜杠，否则自检 2 会把「扫到了」误判成「没扫到」。
      out.push({
        file: path.relative(REPO_ROOT, file).split(path.sep).join('/'),
        items: [...items],
      });
    }
  }
  return out;
}

test('zh.js 语法有效且可加载', () => {
  const { dict } = loadPatch();
  assert.ok(dict && typeof dict === 'object', '词典未加载');
  const size = Object.keys(dict).length;
  assert.ok(size >= 400, `词典规模异常缩水：${size} 条（期望 >= 400）`);
});
test('词典无重复键（重复会让后者静默覆盖前者）', () => {
  const source = readFileSync(PATCH_PATH, 'utf8');
  const block = source.slice(
    source.indexOf('var DICT = {'),
    source.indexOf('/* ---------- 动态串规则'),
  );
  assert.ok(block.length > 0, '未定位到 DICT 区块');

  const keyRe = new RegExp('(["\'])((?:\\\\.|(?!\\1)[^\\\\])*)\\1\\s*:', 'g');
  const seen = new Set();
  const duplicates = [];
  for (const m of block.matchAll(keyRe)) {
    if (seen.has(m[2])) duplicates.push(m[2]);
    else seen.add(m[2]);
  }
  assert.deepEqual(duplicates, [], `词典存在重复键：${duplicates.join(', ')}`);
});

test('静态文案 100% 覆盖（同步上游后的覆盖率门槛）', () => {
  const { lookup } = loadPatch();
  const missing = [];
  let total = 0;
  const all = new Set();

  for (const group of collectHtmlStrings()) {
    total += group.items.length;
    for (const text of group.items) {
      all.add(text);
      if (lookup(text) === null) missing.push(`[${group.name}] ${JSON.stringify(text)}`);
    }
  }

  assert.ok(
    total > 300,
    `静态文案提取异常：仅 ${total} 条。`
      + '上游可能又改了标记来源（index.html 现为壳，真实文案在 src/ui/templates/*.html，'
      + '经 build/application-html.js 的 expandApplicationHtml 展开），请同步更新 collectHtmlStrings()',
  );
  // 过滤规则自身的防回归：句号结尾的整句必须仍在提取范围内。
  // 旧版 isTranslatable 用 /[._]/ 一刀切排除，把这类句子连带误杀过（门槛假绿）。
  assert.ok(
    all.has('Connect an RTL-SDR to begin.'),
    'collectHtmlStrings 又把句号结尾的整句过滤掉了（isTranslatable 的点号排除过宽），门槛会假绿',
  );
  assert.deepEqual(
    missing,
    [],
    `有 ${missing.length}/${total} 条静态文案未汉化（上游可能改了文案，需补 public/zh.js）：\n  ${missing.join('\n  ')}`,
  );
});

/**
 * JS 内嵌 HTML 门槛：补齐静态门槛扫不到的第二片盲区。
 *
 * 存在理由见 collectInlineHtmlStrings() 的注释。语音卡片、HUD、太空任务面板、
 * 军事情报面板、洪水事件面板全部走 innerHTML，静态门槛一条也扫不到。
 *
 * 防假绿的三道自检（吸取 2026-09-28「门槛自身失效」与 2026-09-29「虚构断言」两次教训）：
 *   1. 提取条数下限：内嵌文案总量必须 > 60 条。若上游改了注入方式（如换成
 *      createElement + textContent），提取数会骤降 → 下限触发，提示同步更新采集器。
 *   2. 采集器必须真扫到已知的 5 个文件：写死文件名断言，防止「扫不到任何文件
 *      → 循环体一次都没进 → missing 恒为空 → 门槛假绿」。
 *   3. 三层盲区各留一条已知文案做正向对照：直接 innerHTML 模板（语音卡片）、
 *      变量间接赋值（军事情报面板的开关文案）、插值三元字面量。任一层采集器
 *      退化，对应断言会精确报红，而不是让整道门槛静默变绿。
 */
test('JS 内嵌 HTML 文案 100% 覆盖（静态门槛的第二片盲区）', () => {
  const { lookup } = loadPatch();
  const groups = collectInlineHtmlStrings();
  const byFile = new Map(groups.map((g) => [g.file, g.items]));

  // 自检 1：提取条数下限
  const total = groups.reduce((sum, g) => sum + g.items.length, 0);
  assert.ok(
    total > 60,
    `JS 内嵌 HTML 提取异常：仅 ${total} 条（期望 > 60）。`
      + '上游可能改了 DOM 注入方式（不再用 innerHTML + 反引号模板），'
      + '请检查 collectInlineHtmlStrings() 是否还能扫到文案，否则本门槛会假绿',
  );

  // 自检 2：5 个已知的内嵌 HTML 模块必须都被扫到
  const expectedFiles = [
    'src/voice/control.js',
    'src/hud.js',
    'src/layers/launches/panel.js',
    'src/layers/awareness/panel.js',
    'src/data/bhoteKoshiEvent.js',
  ];
  const notScanned = expectedFiles.filter((f) => !byFile.has(f));
  assert.deepEqual(
    notScanned,
    [],
    `以下已知内嵌 HTML 模块没被采集器扫到（采集器退化 → 门槛会假绿）：${notScanned.join(', ')}。`
      + ' 请检查它们是否改了注入方式，并同步更新 collectInlineHtmlStrings()',
  );

  // 自检 3：三层盲区各留一条正向对照（这些串必须在提取结果里）
  const allItems = new Set(groups.flatMap((g) => g.items));
  const sentinels = [
    // 直接 innerHTML 模板
    ['src/voice/control.js', 'VOICE SYSTEM ERROR'],
    // 变量间接赋值（const markup = `...` 再赋给 innerHTML）
    ['src/layers/awareness/panel.js', 'Global Context navigation'],
    // 插值三元字面量 ${cond ? 'A' : 'B'}
    ['src/layers/awareness/panel.js', 'CONTEXT READY'],
    ['src/layers/awareness/panel.js', 'GLOBAL CONTEXT OFF'],
  ];
  for (const [file, text] of sentinels) {
    assert.ok(
      allItems.has(text),
      `采集器漏了已知文案 ${JSON.stringify(text)}（${file}）——`
        + '某一层盲区的提取退化，门槛会假绿。请检查 collectInlineHtmlStrings()',
    );
  }

  // 正式覆盖断言
  const missing = [];
  for (const { file, items } of groups) {
    for (const text of items) {
      if (lookup(text) === null) missing.push(`${file}: ${JSON.stringify(text)}`);
    }
  }
  assert.deepEqual(
    missing,
    [],
    `有 ${missing.length}/${total} 条 JS 内嵌 HTML 文案未汉化（需补 public/zh.js）：\n  ${missing.join('\n  ')}`,
  );
});

test('关键动态串仍能译出（上游改拼接方式时本测试变红）', () => {
  const { lookup } = loadPatch();
  const cases = [
    // 帧率监视器
    ['FPS 60', '帧率 60'],
    ['FPS —', '帧率 —'],
    // 面板展开/收起
    ['Expand Radio section', '展开电台分区'],
    ['Collapse Radio section', '收起电台分区'],
    // 驾驶舱视觉风格
    ['Current style: FLIR — click for next', '当前风格: 热成像 — 点击切换下一个'],
    // 天气开关
    ['Enable cockpit weather effects', '启用驾驶舱天气效果'],
    ['Disable cockpit weather effects', '禁用驾驶舱天气效果'],
    // 场景运行状态
    ['Loaded: Orbital Watch / Shot 1', '已加载: 轨道监视 / Shot 1'],
    ['Captured: City Overload / Night Pass', '已抓拍: 城市过载 / Night Pass'],
    ['Running 2/5: Global Flights Radar / Sweep', '正在播放 2/5: 全球航班雷达 / Sweep'],
    // 原生弹窗文案
    ['Delete scene "Orbital Watch" and all shots?', '删除场景「Orbital Watch」及其全部镜头？'],
    ['Delete shot "Night Pass"?', '删除镜头「Night Pass」？'],
    ['Shot title', '镜头标题'],
    // 密钥管理
    ["Remove GOOGLE MAPS from this app's saved keys", '从本应用已保存的密钥中移除 GOOGLE MAPS'],
    // 太空任务计数与回放速度
    ['12 / 30D', '12 / 30 天'],
    ['2.5×', '2.5 倍'],
    // 驾驶舱读数
    ['DEST 045°', '目的 045°'],
    ['L 030°', '左 030°'],
    ['R 120°', '右 120°'],
    ['HDG 045°', '航向 045°'],
    ['COLL: 12:34:56Z', '采集: 12:34:56Z'],
    ['ONA: 33.5°', '离天底角: 33.5°'],
    ['SYNCING ROAD NETWORK 42%', '正在同步路网 42%'],
    ['CONTACTS · 250 KM', '目标 · 250 公里'],
    // 错误与加载
    ['Error: network timeout', '错误: network timeout'],
    ['LOAD COMPLETE', '加载完成'],
    ['LOAD FAILED', '加载失败'],
    ['TURNING OFF LIVE DATA', '正在关闭实时数据'],
  ];


  const failures = [];
  for (const [input, expected] of cases) {
    const got = lookup(input);
    if (got !== expected) failures.push(`${JSON.stringify(input)}\n      期望: ${JSON.stringify(expected)}\n      实际: ${JSON.stringify(got)}`);
  }
  assert.deepEqual(failures, [], `动态串规则回归：\n  ${failures.join('\n  ')}`);
});

test("' · ' 分段翻译：译出已知段，保留专有名词段", () => {
  const { lookup } = loadPatch();
  const cases = [
    // 驾驶舱芯片（src/ui/cockpitInstruments.js:136）：
    //   `${MILITARY|COMMERCIAL} · ${feedState} · COURSE ALIGNED`
    // feedState 只有四种取值：ACQUIRING SURFACE / SURFACE FALLBACK /
    // STALE FEED / LIVE TRACK。下面四条覆盖全部取值，全部必须整串译出。
    // ⚠ 历史教训：这里曾写成 'MILITARY · LIVE · COURSE ALIGNED'（期望 LIVE
    // 保留英文）——上游从不输出裸 LIVE，那条断言是凭想象编的，而且正因为词典
    // 里没有 LIVE 才「通过」，属假绿。2026-09-29 补齐状态词后立刻暴露。
    ['MILITARY · LIVE TRACK · COURSE ALIGNED', '军用 · 实时轨迹 · 航向对齐'],
    ['COMMERCIAL · LIVE TRACK · COURSE ALIGNED', '民航 · 实时轨迹 · 航向对齐'],
    ['MILITARY · STALE FEED · COURSE ALIGNED', '军用 · 数据过期 · 航向对齐'],
    ['COMMERCIAL · SURFACE FALLBACK · COURSE ALIGNED', '民航 · 地表回退 · 航向对齐'],
    // 交通图层状态行（src/layers/traffic/model.js、controls.js）——本轮上游
    // Overpass 卸载重构新增，' · ' 段内是 JS 现拼的动态串。
    ['LIVE · Roads: TomTom · Flow 42%', '实时 · 路网来源: TomTom · 路况覆盖 42%'],
    ['SIMULATED · Roads: OpenStreetMap · Flow 0%', '模拟 · 路网来源: OpenStreetMap · 路况覆盖 0%'],
    ['ASCENT PATH · 3.2 km', '上升轨迹 · 3.2 km'],
    ['LAUNCH SITE · Vandenberg SLC-4E', '发射场 · Vandenberg SLC-4E'],
    ['SATELLITE SPEED · 7.6 km/s', '卫星速度 · 7.6 km/s'],
    ['CURRENT DISTANCE FROM EARTH · 412 km', '当前离地距离 · 412 km'],
    ['Playing BBC World Service · stale directory', '正在播放 BBC World Service · 目录过期'],
    ['Ready — playback starts only from your action · muted during voice interaction', '就绪 — 仅在你操作后才开始播放 · 语音交互期间静音'],
    ['GOOGLE NEWS RSS · LOCATION QUERY', 'GOOGLE NEWS RSS · 位置查询'],
  ];

  const failures = [];
  for (const [input, expected] of cases) {
    const got = lookup(input);
    if (got !== expected) failures.push(`${JSON.stringify(input)}\n      期望: ${JSON.stringify(expected)}\n      实际: ${JSON.stringify(got)}`);
  }
  assert.deepEqual(failures, [], `分段翻译回归：\n  ${failures.join('\n  ')}`);
});

/**
 * 气象三模块动态串门槛（上游 2026-09-23 新增 weather / wind / cyclones 图层）。
 *
 * 这三套图层的文案几乎全是 JS 拼接出来的动态串，**静态 HTML 门槛扫不到**：
 * `collectHtmlStrings()` 只看 src/ui/templates/*.html，而这些串由
 * src/layers/{weather,wind,cyclones}/index.js 的 getRowControls() 现拼，
 * 再由 src/ui/layerPanel.js / railCards.js / weatherPanel.js 写进 DOM。
 * 所以必须在这里单独固化，否则上游改拼接方式时汉化会静默退回英文。
 *
 * 其中两类最容易坏，专门各留了断言：
 *   1. **多行 info 串** — layerPanel.js 把 `controls.info` 直接 textContent 进 DOM，
 *      而 lookup() 会把所有空白压成单空格，整串必然查不到。补丁因此在压平之前
 *      先按 '\n' 逐行翻译（translateLines）。删掉那段就会整块退回英文。
 *   2. **量词段** — `Air temperature · 2 m · 18.5 °C` 里的 `2 m` 只含 1 个字母，
 *      旧版 translateSegments 把它当纯数据段直接保留、根本不查规则。
 *      现在纯数据段也会过一遍 lookup（命中才替换），故 `2 m` → `2 米`，
 *      而 `18.5 °C`、`3.2 km` 仍保留原文（见下方防误译断言）。
 */
test('气象/风场/气旋动态串（含多行 info）必须译出', () => {
  const { lookup } = loadPatch();
  const cases = [
    // 右侧气象栏面板壳
    ['WEATHER', '气象'],
    ['Active weather products', '当前生效的气象产品'],
    ['Observed history', '观测历史'],
    ['LATEST · newest per product', '最新 · 各产品取最新帧'],

    // weatherPanel.js 的 detail：' · ' 复合串 + 相对时间 + 帧关系后缀
    ['Rain radar · US', '降雨雷达 · 美国'],
    ['Observed · 09-23 12:00 UTC · 45m ago', '观测 · 09-23 12:00 UTC · 45 分钟前'],
    ['Observed · 09-23 12:00 UTC · 2h 15m ago', '观测 · 09-23 12:00 UTC · 2 小时 15 分钟前'],
    ['History · 09-23 11:00 UTC · 25 min ago · synced', '历史 · 09-23 11:00 UTC · 25 分钟前 · 已同步'],
    ['History · 09-23 11:00 UTC · 25 min ago · nearest', '历史 · 09-23 11:00 UTC · 25 分钟前 · 最近帧'],

    // weather/index.js 多行 info（layerPanel 直接 textContent 进 DOM）
    [
      'RADAR REFLECTIVITY · dBZ\nLatest observation: 09-23 12:00 UTC\n45m ago · frame 3/12 · loading\nContiguous US · gaps ≠ no rain',
      '雷达反射率 · dBZ\n最新观测: 09-23 12:00 UTC\n45 分钟前 · 第 3/12 帧 · 加载中\n美国本土 · 空白处不代表无降雨',
    ],
    [
      'LIGHTNING DENSITY · 15 min accumulation\nHistory: 09-23 11:00 UTC\n25 min ago\nAmericas + Pacific · not individual strikes\nColor: strikes/km²/min ×10³',
      '闪电密度 · 15 分钟累计\n历史: 09-23 11:00 UTC\n25 分钟前\n美洲 + 太平洋 · 非单次闪电\n颜色: 次/平方公里/分钟 ×10³',
    ],

    // wind/index.js：summary + 读数卡
    ['Global · 1° grid', '全球 · 1° 网格'],
    ['GFS forecast · 09-23 12:00 UTC', 'GFS 预报 · 09-23 12:00 UTC'],
    ['Loading forecast', '正在加载预报'],
    ['Preparing flow', '正在准备流场'],
    ['12.3 km/h from NNE', '12.3 km/h 来自东北偏北'],
    ['0.0 km/h · calm', '0.0 km/h · 无风'],
    ['WIND AT 34.56°N 120.34°W', '风况 @ 34.56°N 120.34°W'],
    ['GFS · valid 09-23 12:00 UTC', 'GFS · 有效时间 09-23 12:00 UTC'],
    // 量词段：'2 m' 必须译出，同时 '18.5 °C' 保留
    ['Air temperature · 2 m · 18.5 °C', '气温 · 2 米 · 18.5 °C'],
    ['Sea-level pressure · 1013.2 hPa', '海平面气压 · 1013.2 hPa'],
    ['Forecast · does not follow history', '预报 · 不随历史回放变化'],
    [
      'Forecast · valid 09-23 12:00 UTC · issued 09-23 06:00 UTC · Does not follow history',
      '预报 · 有效时间 09-23 12:00 UTC · 发布于 09-23 06:00 UTC · 不随历史回放变化',
    ],
    [
      'GFS forecast · Wind speed (km/h)\nValid: 09-23 12:00 UTC · loading\nIssued: 09-23 06:00 UTC · STALE',
      'GFS 预报 · 风速（km/h）\n有效时间: 09-23 12:00 UTC · 加载中\n发布时间: 09-23 06:00 UTC · 已过期',
    ],
    ['No frame within 30 min of 09-23 12:00 UTC', '在 09-23 12:00 UTC 前后 30 分钟内无可用帧'],
    ['No frame within 2 h of 09-23 12:00 UTC', '在 09-23 12:00 UTC 前后 2 小时内无可用帧'],

    // cyclones/index.js：NHC 强度分级 + 风暴详情
    ['Cyclones · NHC / CPHC', '气旋 · NHC / CPHC'],
    ['Atlantic · E/C Pacific', '大西洋 · 东/中太平洋'],
    ['Official advisory ↗', '官方公报 ↗'],
    ['Center-track uncertainty cone', '中心路径不确定性锥'],
    ['Track and cone match this advisory', '路径与锥体均对应本份公报'],
    ['Track/cone awaiting advisory 12', '路径/锥体待第 12 号公报'],
    ['No active NHC/CPHC systems', '当前无生效的 NHC/CPHC 气旋系统'],
    ['Hurricane', '飓风'],
    ['Tropical storm', '热带风暴'],
    ['Tropical depression', '热带低压'],
    ['Potential tropical cyclone', '潜在热带气旋'],
    ['Subtropical depression', '副热带低压'],
    ['3 active storms', '3 个活跃风暴'],
    ['1 active storm', '1 个活跃风暴'],
    ['Position as of 09-23 12:00 UTC', '位置截至 09-23 12:00 UTC'],
    ['Maximum sustained wind: 85 kt · Pressure: 965 hPa', '最大持续风速: 85 kt · 气压: 965 hPa'],
    [
      'Katrina · Hurricane · Advisory 12 · issued 09-23 06:00 UTC\nPosition as of 09-23 12:00 UTC\nMaximum sustained wind: 85 kt · Pressure: 965 hPa\nTrack and cone match this advisory\nAtlantic and eastern/central North Pacific; not worldwide cyclone coverage.',
      'Katrina · 飓风 · 第 12 号公报 · 发布于 09-23 06:00 UTC\n位置截至 09-23 12:00 UTC\n最大持续风速: 85 kt · 气压: 965 hPa\n路径与锥体均对应本份公报\n大西洋与北太平洋东部/中部；并非全球气旋覆盖。',
    ],
    // labels.js 预报点悬停标注（提前小时数）
    ['24 h', '24 小时'],
  ];

  const failures = [];
  for (const [input, expected] of cases) {
    const got = lookup(input);
    if (got !== expected) failures.push(`${JSON.stringify(input)}\n      期望: ${JSON.stringify(expected)}\n      实际: ${JSON.stringify(got)}`);
  }
  assert.deepEqual(failures, [], `气象三模块动态串回归（上游改了拼接方式或补丁的多行/量词处理坏了）：\n  ${failures.join('\n  ')}`);
});

test('SDR / 近期影像 / 赛博声呐动态串必须译出（2026-09-28 上游新增三模块）', () => {
  const { lookup } = loadPatch();
  // 下列用例全部来自 .workbuddy/probe-lookup.mjs 的实测输出，不是凭源码推测。
  // 上游改拼接格式时本测试变红 —— 这类串在 JS 里现拼，静态门槛扫不到。
  const cases = [
    // 本地 ADS-B 接收器统计（src/layers/localAdsb/status.js）
    ['14 heard · 3.2 msg/s', '收到 14 架 · 3.2 条/秒'],
    ['14 heard', '收到 14 架'],
    ['3.2 msg/s', '3.2 条/秒'],
    ['2 feeds live · 14 heard', '2 路数据源在线 · 收到 14 架'],
    ['2 feeds live · 14 heard · USB 5.8 msg/s', '2 路数据源在线 · 收到 14 架 · USB 5.8 条/秒'],
    ['3 heard · USB 5.8 msg/s · feed 1090 stale', '收到 3 架 · USB 5.8 条/秒 · 数据源 1090 已过期'],
    // describeFeedProblems 的真实格式是「feed(s) + 数据源名 + 状态」，**没有**数字前缀。
    // 曾按想象写成 '1 feed adsb.lol stale' 被探针打回 —— 用例必须从源码抠。
    ['feed 978 unreachable', '数据源 978 不可达'],
    ['feeds 1090, 978 stale', '数据源 1090, 978 已过期'],
    ['feed adsb.lol invalid', '数据源 adsb.lol 无效'],

    // SDR 调频 / 搜台（src/sdr/controller.js）
    ['Tuned to 98.5 MHz FM', '已调谐到 98.5 MHz 调频'],
    ['FM signal found at 101.3 MHz', '在 101.3 MHz 发现调频信号'],
    ['Scanning 98.5 MHz…', '正在扫描 98.5 MHz…'],
    ['Found 101.3 MHz · 12.5 dB', '发现 101.3 MHz · 12.5 dB'],
    ['Seeking up…', '向上搜台…'],
    ['Seeking down…', '向下搜台…'],
    // 中文前缀接中文时不补空格（否则是「正在切换到 调频」）
    ['Switching to FM', '正在切换到调频'],
    ['Switching to ADS-B · 1090', '正在切换到 ADS-B · 1090'],

    // statusText 的 ' · ' 原子片段
    ['DSP 48 blocks', 'DSP 48 个数据块'],
    ['DSP waiting', 'DSP 等待中'],
    ['RF -12.5 dBFS', '射频 -12.5 dBFS'],
    ['-18.3 dBFS audio', '音频 -18.3 dBFS'],
    ['audio signal --', '音频信号 --'],
    ['audio playing', '音频播放中'],
    ['audio buffering', '音频缓冲中'],
    ['1204 messages', '1204 条报文'],
    ['Decoder feeds: 1090 · read while Local ADS-B is on', '解码数据源: 1090 · 本地 ADS-B 开启时读取'],
    ['waiting for IQ', '等待 IQ 数据'],
    ['opening receiver', '正在打开接收器'],

    // 近期影像（src/ui/recentImagery.js）
    ['5 DAYS', '5 天'],
    ['1 DAY', '1 天'],
    ['32% cloud', '云量 32%'],
    ['18–47% cloud', '云量 18–47%'],
    ['SHOW EMPTY DAYS · 3', '显示空白日 · 3'],
    ['Sentinel-2 · 30 m', 'Sentinel-2 · 30 米'],
    ['Landsat 8/9 · 30 m', 'Landsat 8/9 · 30 米'],
    // 影像日卡片 aria-label 是 ' · ' 复合串：日期/传感器保留，云量与推荐标记译出
    [
      '2026-09-28 · Sentinel-2 · 30 m · 32% cloud · start here',
      '2026-09-28 · Sentinel-2 · 30 米 · 云量 32% · 建议首选',
    ],

    // 赛博声呐 GPU 降级提示（src/cyberSonarScene.js）
    ['Contact GPU unavailable. Native contacts remain visible.', '目标 GPU 加速不可用，仍显示原生目标。'],

    // 火灾边界（src/layers/perimeters/cards.js）：火场名是专有名词，只译前缀
    ['FIRE · Cedar Complex', '火灾 · Cedar Complex'],
    ['part of Cedar Complex', '隶属 Cedar Complex'],
    ['Unnamed incident', '未命名火场'],
  ];

  const failures = cases
    .filter(([input, expected]) => lookup(input) !== expected)
    .map(([input, expected]) => `${JSON.stringify(input)} → ${JSON.stringify(lookup(input))}（期望 ${JSON.stringify(expected)}）`);
  assert.deepEqual(failures, [], `以下动态串译文不符：\n  ${failures.join('\n  ')}`);

  // 这三个模块的数据/专有名词仍必须保持原样（补丁不得介入）
  const keep = ['0.9 dB', '49.6 dB', 'Sentinel-2', 'Landsat 8/9', 'VIIRS', 'adsb.lol',
    'Cedar Complex', 'NASA GIBS', 'RTL-SDR', '2026-09-28', '1090', '12.5 dB'];
  const wronglyTouched = keep.filter((t) => lookup(t) !== null);
  assert.deepEqual(
    wronglyTouched,
    [],
    `以下数据/专有名词被误译：${wronglyTouched.map((f) => `${JSON.stringify(f)} → ${JSON.stringify(lookup(f))}`).join(', ')}`,
  );

  // 幂等：译文回写后不得被二次改写
  for (const settled of ['收到 14 架 · 3.2 条/秒', '数据源 978 不可达', '云量 32%',
    '正在切换到调频', '音频播放中', '火灾 · Cedar Complex']) {
    assert.equal(lookup(settled), null, `译文被二次改写：${JSON.stringify(settled)}`);
  }
});

test('量词段翻译不得波及单位数据与既有距离显示', () => {
  const { lookup } = loadPatch();
  // translateSegments 现在让「纯数据段」也过一遍 lookup（为了让 '2 m' 能译成 '2 米'）。
  // 这道测试守住它的副作用边界。分两类断言，不要混在一起：
  //   A. 单段数据串必须完全不动（lookup 返回 null = 补丁不介入）；
  //   B. 含 ' · ' 的复合串允许译出已知段，但数据段/专有名词段必须原样保留。
  const untouched = [
    '18.5 °C',
    '3.2 km',
    '7.6 km/s',
    '5 m²',
    '1013.2 hPa',
    '85 kt',
    '09-23 12:00 UTC',
  ];
  const wronglyTouched = untouched.filter((t) => lookup(t) !== null);
  assert.deepEqual(
    wronglyTouched,
    [],
    `以下单位/数据串被误译（量词规则波及过宽）：${wronglyTouched.map((f) => `${JSON.stringify(f)} → ${JSON.stringify(lookup(f))}`).join(', ')}`,
  );

  // B 类：数据段与专有名词段必须留在原位
  assert.equal(lookup('ASCENT PATH · 3.2 km'), '上升轨迹 · 3.2 km');
  assert.equal(lookup('SATELLITE SPEED · 7.6 km/s'), '卫星速度 · 7.6 km/s');
  assert.equal(lookup('CURRENT DISTANCE FROM EARTH · 412 km'), '当前离地距离 · 412 km');
  assert.equal(lookup('LAUNCH SITE · Vandenberg SLC-4E'), '发射场 · Vandenberg SLC-4E');
  // 面积单位 m² 不得被成长度量词规则当成 'N m'
  assert.equal(lookup('5 m²'), null);

  // 距离显示语境里 `N m` 就是米，与气温高度量词同义，这是预期收益
  assert.equal(lookup('350 m'), '350 米');

  // 幂等：译文回写后不得被二次改写（MutationObserver 抖动防线）
  for (const settled of ['2 米', '气温 · 2 米', '降雨雷达 · 美国', '加载中', '第 3/12 帧']) {
    assert.equal(lookup(settled), null, `译文被二次改写：${JSON.stringify(settled)}`);
  }
});

test("上游用已汉化标题拼串：'Expand 数据图层' 不得半中半英", () => {
  const { lookup } = loadPatch();
  // applicationShell.js 读取面板标题（已被本补丁汉化为中文）拼 title：
  // `btn.title = `${action} ${panelName}`` → "Expand 数据图层"。
  // 防回环守卫默认会跳过含中文的串，导致悬停提示半中半英——
  // 必须靠 mixed 规则窄通道修复。这是每次都会发生的场景，不是边缘情况。
  const cases = [
    ['Expand 数据图层', '展开 数据图层'],
    ['Collapse 数据图层', '收起 数据图层'],
    ['Expand 定位', '展开 定位'],
    ['Collapse 电台', '收起 电台'],
    // 纯英文面板名仍正常
    ['Expand DATA LAYERS', '展开 数据图层'],
    // 译不出后半段时整条放弃（不产出半中半英）
    ['Expand detailed Radio controls', null],
    // 防回环未破：已译内容不得被改写
    ['军用 · 实时轨迹 · 航向对齐', null],
    ['帧率 60', null],
  ];
  const failures = [];
  for (const [input, expected] of cases) {
    const got = lookup(input);
    if (got !== expected) failures.push(`${JSON.stringify(input)} 期望 ${JSON.stringify(expected)} 实际 ${JSON.stringify(got)}`);
  }
  assert.deepEqual(failures, [], `混合串回归：\n  ${failures.join('\n  ')}`);
});

test('专有名词、数据、代码串必须保留原文（防误译）', () => {
  const { lookup } = loadPatch();
  const keep = [
    'Alcatraz Island',      // 地名
    'Burj Khalifa',          // 地名
    'Vandenberg SLC-4E',     // 发射场
    'BBC World Service',     // 电台名
    'CA1234',                // 航班号
    'https://www.openstreetmap.org/copyright',
    '.panel-title, .pp-header-label',  // CSS 选择器
    'icao24',                // 数据字段
    '42%',
    '7.6 km/s',
    '上帝之眼',              // 已是中文（防回环）
  ];

  const failures = keep.filter((t) => lookup(t) !== null);
  assert.deepEqual(failures, [], `以下内容被误译：${failures.map((f) => JSON.stringify(f)).join(', ')}`);
});

test('幂等性：译文回写后不得被反复改写（防 MutationObserver 抖动）', () => {
  const { translateNode } = loadPatch();
  // 这些译文自身仍含 ' · '，是最容易触发回环的场景
  const inputs = [
    'MILITARY · LIVE TRACK · COURSE ALIGNED',
    // 本轮上游 Overpass 卸载重构新增的交通状态行，译文同样含 ' · '
    'LIVE · Roads: TomTom · Flow 42%',
    'SIMULATED · Roads: OpenStreetMap · Flow: TomTom (no matches)',
    'ASCENT PATH · 3.2 km',
    'LAUNCH SITE · Vandenberg SLC-4E',
    'Ready — playback starts only from your action · muted during voice interaction',
    'Playing BBC World Service · stale directory',
  ];

  for (const input of inputs) {
    const node = textNode(input);
    // 模拟 observer 回环 + 周期补扫：连扫 5 轮
    for (let round = 0; round < 5; round += 1) translateNode(node);
    assert.equal(
      node.writes,
      1,
      `${JSON.stringify(input)} 被写入 ${node.writes} 次（应为 1）；结果=${JSON.stringify(node.data)}`,
    );
  }

  // 已含中文的复合串必须零写入
  const settled = textNode('军用 · 实时轨迹 · 航向对齐');
  for (let round = 0; round < 5; round += 1) translateNode(settled);
  assert.equal(settled.writes, 0, '已翻译内容被重复写入');
  assert.equal(settled.data, '军用 · 实时轨迹 · 航向对齐');
});

test('高频动态串压力：200 轮重扫只应写入节点数次', () => {
  const { translateNode } = loadPatch();
  const nodes = ['FPS 60', 'SYNCING ROAD NETWORK 42%', 'CONTACTS · 250 KM', 'HDG 045°'].map(textNode);
  for (let round = 0; round < 200; round += 1) {
    for (const node of nodes) translateNode(node);
  }
  const totalWrites = nodes.reduce((sum, n) => sum + n.writes, 0);
  assert.equal(totalWrites, nodes.length, `200 轮重扫产生 ${totalWrites} 次写入（应为 ${nodes.length}）`);
});

test('属性翻译：title / aria-label / alt / placeholder 各写入一次', () => {
  const { translateNode } = loadPatch();
  const el = element('BUTTON', {
    title: 'Current style: NORMAL — click for next',
    'aria-label': 'Next cockpit vision style',
    alt: 'CCTV feed frame',
    placeholder: 'Search any location...',
  });
  for (let round = 0; round < 4; round += 1) translateNode(el);

  assert.equal(el.getAttribute('title'), '当前风格: 标准 — 点击切换下一个');
  assert.equal(el.getAttribute('aria-label'), '下一个驾驶舱视觉风格');
  assert.equal(el.getAttribute('alt'), '公共监控画面帧');
  assert.equal(el.getAttribute('placeholder'), '搜索任意地点...');
  assert.equal(el.writes, 4, `属性被写入 ${el.writes} 次（应为 4，每属性一次）`);
});

test('SKIP_TAGS 与 data-gev-zh 标记的节点被跳过', () => {
  const { translateNode } = loadPatch();
  for (const tag of ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'CANVAS', 'SVG']) {
    const el = element(tag, { title: 'READY' });
    translateNode(el);
    assert.equal(el.getAttribute('title'), 'READY', `${tag} 不应被翻译`);
    assert.equal(el.writes, 0, `${tag} 发生写入`);
  }

  const marked = element('DIV', { 'data-gev-zh': '1', title: 'READY' });
  translateNode(marked);
  assert.equal(marked.getAttribute('title'), 'READY', 'data-gev-zh 节点不应被翻译');
  assert.equal(marked.writes, 0);
});

test('Material Symbols 图标连字不得被翻译（译了图标就退化成方块/汉字）', () => {
  const { translateNode, lookup } = loadPatch();

  // 这些值既是图标连字、又是常用英文词，是最容易踩中的组合。
  // 词典里 radio/adjust/on/normal 都有词条（'电台'/'调节'/'开'/'标准'），
  // draw 也是本 fork 新加的（'手绘'），必须全部拦住。
  const ligatures = [
    'radio', 'adjust', 'on', 'normal', 'draw', 'public', 'close',
    'flight', 'navigation', 'east', 'radar', 'bolt', 'flare',
    'light_mode', 'dark_mode', 'chevron_left', 'right_panel_open',
    // 2026-09-28 本轮往词典加了 'TUNE'（SDR 调谐按钮），而 Material Symbols
    // 恰好有 tune 图标；词典精确匹配优先 + DOM 容器拦截应确保图标不被误译。
    'tune',
    // 2026-10-09 本轮为街景/语音/HUD 补的词条里有大量常用词，Material Symbols
    // 存在同名或近名图标（fit_screen / expand / done / plan / work 等）。
    // 更危险的是 dictOnly 的大小写兜底：词典键是全大写 'FIT'/'FILL'/'ALL'/'DONE'，
    // 小写形态 'fit'/'fill'/'all'/'done' 也会被译出 —— 若哪天上游把图标连字
    // 写成小写，没有 DOM 容器拦截就会退化。这里防御性锁定。
    'fit', 'fill', 'all', 'expand', 'follow', 'flat', 'since', 'shrink',
    'voice', 'done', 'previous', 'plan', 'stage', 'cause', 'working', 'manage',
    'notes', 'sources', 'dismiss', 'providers', 'imagery',
  ];

  for (const cls of ['material-symbols-outlined', 'pp-icon material-symbols-outlined',
    'cockpit-heading-caret material-symbols-outlined',
    'celestial-marker celestial-sun material-symbols-outlined']) {
    const iconEl = element('SPAN', { class: cls });
    for (const name of ligatures) {
      const t = textNode(name, iconEl);
      translateNode(t);
      assert.equal(t.writes, 0, `图标连字 ${JSON.stringify(name)} 在 class="${cls}" 内被改写了`);
      assert.equal(t.data, name, `图标连字 ${JSON.stringify(name)} 内容变了`);
    }
    // 图标元素自身的属性也不该被翻译（连字容器上没有可见文案）
    translateNode(iconEl);
    assert.equal(iconEl.writes, 0, `图标容器 class="${cls}" 发生写入`);
  }

  // 反向确认：同一批词在【非图标】上下文里必须照常翻译，
  // 否则说明保护过宽、把正常文案也一起拦掉了
  const btn = element('SPAN', { class: 'pp-label' });
  const label = textNode('Draw', btn);
  translateNode(label);
  assert.equal(label.data, '手绘', '普通按钮文案 Draw 应被翻译（保护不得过宽）');

  assert.equal(lookup('radio'), '电台', '词典本身应仍能译出 radio（是 DOM 层拦的，不是词典删的）');
});

test('上下文相关词：CLEAR 在按钮里是「清除」、在气象读数里是「晴」', () => {
  const { translateNode, lookup } = loadPatch();

  // 2026-09-28 上游新增「近期影像」面板后，清除按钮 label 是全大写 CLEAR，
  // 与驾驶舱气象读数 weatherCodeLabel(0) 返回的 CLEAR(晴) **大小写完全相同**，
  // 词典层无法区分（两个键会互相覆盖）。只能按容器类型判：
  // 按钮类容器 = 动作（清除），其余 = 状态（晴）。
  // 这是界面上看得见的错译，必须守住，不能回退成纯文本匹配。

  // 气象读数：<strong id="cockpit-local-condition">CLEAR</strong>
  const condition = element('STRONG', { id: 'cockpit-local-condition' });
  const conditionText = textNode('CLEAR', condition);
  translateNode(conditionText);
  assert.equal(conditionText.data, '晴', '气象读数里的 CLEAR 应译作「晴」');

  // 近期影像清除按钮：railCardBlocks.js 渲染出 data-action-id="clear"
  const actionBtn = element('BUTTON', { 'data-action-id': 'clear', type: 'button' });
  const actionText = textNode('CLEAR', actionBtn);
  translateNode(actionText);
  assert.equal(actionText.data, '清除', '影像面板清除按钮应译作「清除」');

  // 路径规划清除按钮：chipGroup.js 渲染出 data-chip-id="clear"
  const chipBtn = element('BUTTON', { 'data-chip-id': 'clear' });
  const chipText = textNode('CLEAR', chipBtn);
  translateNode(chipText);
  assert.equal(chipText.data, '清除', '路径规划清除按钮应译作「清除」');

  // 手绘面板的 Clear（首字母大写）仍走词典，不受消歧影响
  assert.equal(lookup('Clear'), '清除', "词典的 'Clear' 应仍译作「清除」");

  // 幂等：消歧结果回写后不得被反复改写（译文「晴」不含 CLEAR，但要确认只写一次）
  const again = textNode('CLEAR', condition);
  translateNode(again);
  translateNode(again);
  translateNode(again);
  assert.equal(again.writes, 1, `气象读数被写入 ${again.writes} 次（应为 1）`);

  // 属性也要过消歧：按钮 title 里的 CLEAR 按动作译
  const titledBtn = element('BUTTON', { 'data-action-id': 'clear', title: 'CLEAR' });
  translateNode(titledBtn);
  assert.equal(titledBtn.getAttribute('title'), '清除', '按钮 title 里的 CLEAR 应译作「清除」');
});

test('原生弹窗 hook：confirm / prompt / alert 文案被汉化', () => {
  const { sandbox, dialogCalls } = loadPatch();
  // boot() 在 readyState=complete 时同步执行 hookDialogs
  assert.equal(typeof sandbox.window.confirm, 'function');

  sandbox.window.confirm('Delete scene "Orbital Watch" and all shots?');
  sandbox.window.prompt('Shot title', 'Night Pass');
  sandbox.window.alert('Broadcaster stream unavailable');

  assert.equal(dialogCalls.confirm[0], '删除场景「Orbital Watch」及其全部镜头？');
  assert.deepEqual(dialogCalls.prompt[0], ['镜头标题', 'Night Pass']);
  assert.equal(dialogCalls.alert[0], '广播流不可用');
});

test('语言开关：gev-lang=en 时补丁完全不介入', () => {
  const source = readFileSync(PATCH_PATH, 'utf8');
  const instrumented = source.replace(
    /\n\}\)\(\);\s*$/,
    "\n  try { globalThis.__GEV_ZH_EN__ = true; } catch (e) {}\n})();\n",
  );

  const dialogCalls = [];
  const nativeConfirm = () => true;
  const sandbox = {
    globalThis: null,
    window: { confirm: (...a) => { dialogCalls.push(a); return nativeConfirm(); }, alert() {}, prompt: () => '' },
    localStorage: { getItem: () => 'en', setItem: () => {} },
    document: {
      readyState: 'complete',
      title: 'ORIGINAL',
      body: { appendChild() {} },
      documentElement: { appendChild() {} },
      createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
      createTreeWalker: () => ({ nextNode: () => null }),
      addEventListener() {},
    },
    MutationObserver: class { observe() {} },
    NodeFilter: { SHOW_TEXT: 4, SHOW_ELEMENT: 1 },
    setInterval: () => 0,
    location: { reload() {} },
    WeakSet,
    console,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(instrumented, sandbox, { filename: 'zh-en.js' });

  // 提前 return：既不导出句柄，也不改 title，也不 hook 弹窗
  assert.equal(sandbox.__GEV_ZH_EN__, undefined, 'gev-lang=en 时补丁不应继续执行');
  assert.equal(sandbox.document.title, 'ORIGINAL', 'gev-lang=en 时不应改写标题');
  sandbox.window.confirm('Delete scene "X" and all shots?');
  assert.deepEqual(dialogCalls[0], ['Delete scene "X" and all shots?'], 'gev-lang=en 时不应 hook 弹窗');
});

test('图层面板明细行 / feed 状态：JS 现拼的动态串必须译出', () => {
  const { lookup } = loadPatch();

  // 这批串全是 JS 运行时拼出来的（src/ui/layerPanel.js 渲染
  // `${source} · ${loadingLabel}` 与 stats.error），**静态门槛看不到**——
  // 门槛只扫 src/ui/templates/*.html。2026-09-29 同步上游 Overpass 卸载重构后
  // 实测 79 条未译，其中 14 条是本轮引入的退化。故单独建门槛守住。
  const cases = [
    // feed 状态徽标（src/data/layerSnapshot.js FEED_STATE_LABELS）
    ['UNAVAILABLE', '不可用'],
    ['DEGRADED', '降级'],
    ['FALLBACK', '回退'],
    ['LIVE', '实时'],
    ['SIMULATED', '模拟'],

    // 交通图层状态行原子段（src/layers/traffic/controls.js roadStatusLabel）
    ['Roads unavailable', '路网数据不可用'],
    ['Local surface still loading', '本地路面数据加载中'],
    ['Partial coverage', '部分覆盖'],
    ['Detailed roads unavailable', '详细路网不可用'],
    ['Reduced detail coverage', '细节覆盖降级'],
    ['Hybrid needs a TomTom key', 'Hybrid 模式需要 TomTom 密钥'],
    ['TomTom roads need a TomTom key', 'TomTom 路网需要 TomTom 密钥'],
    // 复合串：状态词 + ' · ' 段内动态部分
    ['UNAVAILABLE · OpenStreetMap · Roads unavailable', '不可用 · OpenStreetMap · 路网数据不可用'],
    ['TomTom roads unavailable while the traffic service is unreachable',
      '路况服务不可达，TomTom 路网暂不可用'],
    ['SIMULATED — traffic service unreachable', '模拟 — 路况服务不可达'],
    ['SIMULATED — add TomTom key for live', '模拟 — 请配置 TomTom 密钥以启用实时数据'],
    ['TomTom daily budget reached', 'TomTom 当日额度已用完'],

    // 已标注设施（src/data/installationFeedback.js）——计数串是动态拼接
    ['Map tiles temporarily unavailable', '地图瓦片暂不可用'],
    ['Mapped names temporarily unavailable', '已标注名称暂不可用'],
    ['No mapped sites in view', '视野内无已标注设施'],
    ['12 mapped sites in view', '视野内有 12 处已标注设施'],
    ['1 mapped site in view', '视野内有 1 处已标注设施'],
    ['No mapped sites within 5 km of the contact', '目标周边 5 公里内无已标注设施'],
    ['3 mapped sites within 5 km of the contact', '目标周边 5 公里内有 3 处已标注设施'],
    ['Map tiles temporarily unavailable — retrying in 12s', '地图瓦片暂不可用 — 12 秒后重试'],
    ['Overpass timed out — retry pending', 'Overpass 请求超时 — 等待重试'],
    ['Too many mapped sites in view to list them all', '视野内已标注设施过多，无法全部列出'],
    ['Installation context unavailable', '设施周边信息不可用'],

    // ALPR 摄像头（src/layers/alpr/index.js、source.js）
    ['Zoom in to load mapped cameras', '请放大以加载已标注摄像头'],
    ['Showing cached locations', '正在显示缓存位置'],
    ['Coverage limited — zoom in', '覆盖受限 — 请放大'],
    ['No ALPR data for this area — US and Canada only', '该区域无 ALPR 数据 — 仅覆盖美国与加拿大'],
    ['None on screen — nearby cameras are outside the view', '屏幕内无目标 — 附近摄像头在视野之外'],
    ['Camera coverage unavailable', '摄像头覆盖范围不可用'],

    // 矢量瓦片（src/sources/vectorTiles.js）
    ['Vector tiles unavailable', '矢量瓦片不可用'],
    ['Vector tiles unavailable (HTTP 429)', '矢量瓦片不可用（HTTP 429）'],
    ['Zoom in for vector tile coverage', '请放大以获取矢量瓦片覆盖'],
    ['Vector tile metadata unavailable', '矢量瓦片元数据不可用'],
    ['Invalid vector tile metadata', '矢量瓦片元数据无效'],
    ['Invalid vector tile origin', '矢量瓦片原点无效'],

    // 错误消息经 `error?.message || '...'` 透传后被拼进复合明细行
    //（src/layers/traffic/ingestion.js:594）。后半段必须能译出，否则
    // trKeep 会让整条规则放弃、界面显示完整英文。这是本轮最隐蔽的一类缺口。
    ['TomTom flow timed out', 'TomTom 路况请求超时'],
    ['Upstream response too large', '上游响应过大'],
    ['Camera source temporarily unavailable', '摄像头数据源暂不可用'],
    ['Detailed roads unavailable — TomTom flow timed out', '详细路网不可用 — TomTom 路况请求超时'],
    ['Detailed roads unavailable — Vector tile metadata unavailable', '详细路网不可用 — 矢量瓦片元数据不可用'],
    ['Detailed roads unavailable — OpenFreeMap tiles timed out', '详细路网不可用 — OpenFreeMap 瓦片请求超时'],

    // 标注轮廓 / 地点导航 toast
    ['Detailed outline unavailable', '详细轮廓不可用'],
    ['Cedar Complex · Detailed outline unavailable', 'Cedar Complex · 详细轮廓不可用'],
    ['Military area', '军事区域'],
    ['Location not found', '未找到该地点'],
    ['Search failed', '搜索失败'],
    ['Fly to a POI first', '请先飞往一个兴趣点'],

    // layerPanel 通用片段
    ['never', '从未'],
    ['loading...', '加载中…'],
    ['12 of 40 records accepted', '40 条记录中已接受 12 条'],
    ['incomplete snapshot', '快照不完整'],
  ];

  const failures = [];
  for (const [input, expected] of cases) {
    const got = lookup(input);
    if (got !== expected) {
      failures.push(`${JSON.stringify(input)}\n      期望: ${JSON.stringify(expected)}\n      实际: ${JSON.stringify(got)}`);
    }
  }
  assert.deepEqual(
    failures,
    [],
    `图层面板 / 状态行动态串回归（这些是 JS 现拼、静态门槛覆盖不到的串）：\n  ${failures.join('\n  ')}`,
  );
});

test('专有名词不得因状态词规则被误译（防过宽）', () => {
  const { lookup } = loadPatch();

  // 新增了 LIVE / SIMULATED / UNAVAILABLE 等高频状态词与一批 ' — '、
  // '(HTTP nnn)'、计数类规则后，必须确认它们没有波及数据源名、地名、
  // 纯数据读数。lookup 返回 null 表示补丁不介入（原样保留）。
  const keep = [
    // 数据源 / 品牌名（图层 source 标签，两个都是专有名词）
    'OpenStreetMap / TomTom',
    'TomTom + OpenStreetMap',
    // 地名、火场名等专有名词
    'Cedar Complex',
    'Vandenberg SLC-4E',
    'BBC World Service',
    // 纯数据读数与坐标
    '3.2 km',
    '7.6 km/s',
    '18.5 °C',
    '42%',
    'HTTP 429',
    // 上游内部标识符
    'military_land',
    'ofm:3/2/1:4',
  ];

  const failures = keep.filter((t) => lookup(t) !== null);
  assert.deepEqual(
    failures,
    [],
    `以下内容被误译（状态词规则过宽）：${failures.map((f) => JSON.stringify(f)).join(', ')}`,
  );

  // 反向确认：这些规则确实生效，而不是因为 lookup 整体失灵才「保留原文」
  assert.equal(lookup('LIVE'), '实时');
  assert.equal(lookup('Vector tiles unavailable (HTTP 429)'), '矢量瓦片不可用（HTTP 429）');
  assert.equal(lookup('12 mapped sites in view'), '视野内有 12 处已标注设施');
});

test('小写状态词的 dictOnly 大小写兜底：锁定行为并确认其安全性', () => {
  const { lookup } = loadPatch();

  // dictOnly 的匹配顺序是「精确 → toUpperCase() → toLowerCase()」，这是补丁的
  // 既有设计（为了让 calm/Calm、clear/CLEAR 这类不同大小写写法各自命中）。
  // 副作用是：新增全大写状态词条后，小写同名串也会被兜底翻译。
  //
  // 这条断言**锁定**该行为，避免后人误以为是 bug 去「修」，或反过来在不知情
  // 下依赖它。它安全的前提是（2026-09-29 已逐一 grep 核实）：
  //   1. 上游凡把状态词渲染成可见文本的路径，都先做 .toUpperCase()
  //      （src/ui/cctvFrames.js:109）或直接使用大写字面量
  //      （src/ui/cockpitInstruments.js:136 的 LIVE TRACK / STALE FEED、
  //        src/ui/layerPanel.js 走 FEED_STATE_LABELS 映射）。
  //   2. 小写形式只出现在内部状态值、dataset.state、CSS class（如
  //      `classList.toggle('unavailable', …)`、`dataset.state = 'unavailable'`）。
  //   3. 补丁翻译的属性白名单只有 placeholder / title / aria-label / alt，
  //      data-state 不在其中，故 CSS 钩子不受影响。
  //
  // ⚠ 若日后上游新增「把小写状态词直接 textContent 进 DOM」的代码，这条
  // 兜底就会把它译成中文——届时应在 CONTEXT_WORDS 里消歧，而不是删本断言。
  const lower = ['unavailable', 'degraded', 'fallback', 'simulated', 'live'];
  for (const word of lower) {
    assert.equal(
      lookup(word),
      lookup(word.toUpperCase()),
      `小写 ${word} 未走大小写兜底（dictOnly 匹配顺序被改动了？）`,
    );
  }

  // 大小写共存仍须成立：精确匹配优先，兜底不得覆盖已有的独立词条。
  // 例如手绘面板的 Clear（清除）与气象读数 CLEAR（晴）——历史血泪教训。
  assert.equal(lookup('Clear'), '清除');
  assert.notEqual(lookup('Clear'), lookup('CLEAR'));
});

/**
 * 尾随分隔符标签串必须译出（太空任务面板的字段标签）。
 *
 * src/layers/launches/panel.js 把字段写成 `STATUS · <b data-mission-status></b>`，
 * 于是标签的文本节点是 `'STATUS · '`（带尾随空格）。补丁的 lookup() 开头会 trim，
 * 空格被吃掉后 `' · '` 不再完整 → translateSegments 的分隔符检测够不着 →
 * 整串原样留在界面上。7 个字段标签全是这个形态，用户看到的就是
 * 「STATUS · 正常」这种半英半中。
 *
 * 修法是 lookup() 里单开一个尾随分隔符分支：只译标签部分，分隔符与尾随空白
 * 原样保留（那个空格是 `<b>` 前的排版间距）。反向验证过：把该分支禁用后
 * 下面 7 条全部退回原文。
 *
 * 注意别把它「简化」掉——曾经有人以为 trim 之后再查词典就够了，
 * 那样 `'STATUS ·'`（trim 后无尾随空格）能译，但真实 DOM 里的 `'STATUS · '`
 * 经 translateNode 拿到的是**未 trim 的原始 data**，行为并不一致。
 */
test('尾随分隔符标签串（太空任务面板字段）必须译出', () => {
  const { lookup, translateNode } = loadPatch();
  const cases = [
    ['STATUS · ', '状态 · '],
    ['ASCENT PATH · ', '上升轨迹 · '],
    ['CURRENT DISTANCE FROM EARTH · ', '当前离地距离 · '],
    ['LAUNCH SITE · ', '发射场 · '],
    ['LAUNCH TIME · ', '发射时间 · '],
    ['ORBIT · ', '轨道 · '],
    ['SATELLITE SPEED · ', '卫星速度 · '],
  ];
  const failures = [];
  for (const [input, expected] of cases) {
    const got = lookup(input);
    if (got !== expected) {
      failures.push(`${JSON.stringify(input)}\n      期望: ${JSON.stringify(expected)}\n      实际: ${JSON.stringify(got)}`);
    }
  }
  assert.deepEqual(failures, [], `尾随分隔符标签串未译出：\n  ${failures.join('\n  ')}`);

  // 尾随空白必须原样保留（<b> 前的排版间距，丢了会让标签与数值贴在一起）
  assert.equal(lookup('STATUS · ').endsWith('· '), true, '尾随空格被吃掉了');

  // 幂等：译文回写后不得被反复改写（MutationObserver 抖动防线）
  const node = textNode('STATUS · ');
  for (let i = 0; i < 5; i += 1) translateNode(node);
  assert.equal(node.writes, 1, `尾随分隔符串写入 ${node.writes} 次（应 1 次）→ ${JSON.stringify(node.data)}`);

  // 反向对照：不带尾随分隔符的普通复合串仍走 translateSegments，行为不变
  assert.equal(lookup('ASCENT PATH · 3.2 km'), '上升轨迹 · 3.2 km');
});

/**
 * 街景 / OAuth 语音 / 语音卡片的动态串必须译出。
 *
 * 2026-10-08 上游合并引入街景图层，2026-10-09 引入 ChatGPT OAuth 语音认证（#621）。
 * 这批串全是 JS 现拼，静态门槛（扫 src/ui/templates/*.html）与内嵌 HTML 门槛
 * （扫反引号模板）都看不到，只能靠规则覆盖。
 *
 * 三个必须留意的点：
 *   1. **语音只译显示串，不译播报串** —— speech.js 里 `display.title` / `lines`
 *      / `notes` 进 DOM，而 `say` 是给语音模型念的内容，刻意不译（上游语音
 *      提示词全是英文语境）。下面的用例都取自 display 路径。
 *   2. **透传错误消息** —— keySetup.js 的 `OAuth check failed: ${error?.message}`
 *      把服务端 codex-auth.js 的消息拼进复合串，规则用 trKeep 严格匹配，
 *      后半段译不出会**整条放弃**。所以那批服务端消息必须自己有词条。
 *   3. **`Frame ${target}` 与 `N ${noun} in frame` 的取值域不同** —— 前者来自
 *      actionSchemas.js 的 frame_overhead 枚举（flights/military/satellites/vessels），
 *      后者来自 speech.js 的 LAYER_NOUNS（aircraft/ships/...）。写混了规则会永远匹配不上。
 */
test('街景 / OAuth 语音 / 语音卡片动态串必须译出', () => {
  const { lookup } = loadPatch();
  const cases = [
    // 街景数据源 chip 的 title（`${provider.name} imagery on|off`）
    ['Mapillary imagery on', 'Mapillary 影像已开启'],
    ['Mapillary imagery off', 'Mapillary 影像已关闭'],
    // 密钥缺失提示（keySetupCore.mjs 的 keySetupRequirement）
    ['Needs MAPILLARY_TOKEN — add it in Provider Settings', '需要 MAPILLARY_TOKEN — 请在「数据源配置」中添加'],
    ['Mapillary: Needs MAPILLARY_TOKEN — add it in Provider Settings', 'Mapillary: 需要 MAPILLARY_TOKEN — 请在「数据源配置」中添加'],
    // 覆盖统计（数字带千分位逗号）
    ['12 images in this sequence', '本序列有 12 张照片'],
    ['1,234 sequences in view', '视野内有 1,234 条序列'],
    ['Image by Geo George Shadrach', '照片来源 Geo George Shadrach'],
    ['LAST 45 DAYS', '近 45 天'],

    // OAuth 语音认证（keySetup.js 的 say → statusLine.textContent）
    ['VOICE AUTH · CHATGPT OAUTH', '语音认证 · ChatGPT OAuth'],
    ['USE CHATGPT OAUTH', '改用 ChatGPT OAuth'],
    ['Checking local ChatGPT OAuth sign-in…', '正在检查本机 ChatGPT OAuth 登录状态…'],
    // 透传型复合串：后半段是服务端消息，两者都必须有词条
    ['OAuth check failed: Could not start ChatGPT sign-in', 'OAuth 检查失败: 无法启动 ChatGPT 登录'],
    ['Save failed: ChatGPT sign-in is unavailable', '保存失败: ChatGPT 登录不可用'],
    ['Save failed (500).', '保存失败（HTTP 500）。'],

    // 费用读数（realtimeCost.js，模型 ID 与金额保留原文）
    ['COST UNKNOWN', '费用未知'],
    ['Next session: gpt-realtime-mini — this session stays on gpt-realtime', '下次会话: gpt-realtime-mini — 本次会话仍使用 gpt-realtime'],
    ['Voice model: gpt-realtime-mini — click to switch to standard; applies next session', '语音模型: gpt-realtime-mini — 点击切换到标准档；下次会话生效'],
    ['Estimated session cost on gpt-realtime — 3 response(s). Warns at $1.00, ends the session at $5.00.', 'gpt-realtime 上的会话费用估算 — 已产生 3 次响应。达到 $1.00 时告警，达到 $5.00 时结束会话。'],
    ['STANDARD applies next session', '标准档将在下次会话生效'],
    ['MINI applies next session', '迷你档将在下次会话生效'],

    // 语音卡片：显示串（display.title / lines / notes / planStepLabel）
    ['View state', '视图状态'],
    ['Wind on', '风场 已开启'],
    ['Street Level off', '街景 已关闭'],
    ['Frame flights', '取景航班'],
    ['Frame vessels', '取景船舶'],
    ['7 aircraft in frame', '画面内有 7 个航班'],
    ['12 ships in frame', '画面内有 12 个船舶'],
    ['Within 200 km of the view', '视野范围内 200 公里'],
    ['Altitude 35,000 feet', '高度 35,000 英尺'],
    ['12 km from Paris', '距 Paris 12 公里'],
    ['Camera range 5 km', '相机距离 5 公里'],
    ['Marked 3 places', '已标注 3 个地点'],
    ['Not found: Paris, Lyon', '未找到: Paris, Lyon'],
    ['Source: OpenStreetMap', '来源: OpenStreetMap'],
    ['Labels on', '标注已开启'],
    ['Finding places: Paris', '正在查找地点: Paris'],
    ['Tracing outline: Paris', '正在描绘轮廓: Paris'],
    ['Nearest ships to Paris', '距 Paris 最近的船舶'],
    // 卡片步骤状态（voiceCard.js 拼成 `, ${statusText}`）
    [', done', '，已完成'],
    [', failed', '，失败'],
    // JS 内嵌 HTML 里的计数串
    ['Named areas (3)', '具名区域（3）'],
    ['+2 additional payload records', '另有 2 条载荷记录'],
    ['FIELD REPORTS · 4', '实地报告 · 4'],
    ['01 · Rasuwagadhi witness', '01 · Rasuwagadhi witness'],
  ];
  const failures = [];
  for (const [input, expected] of cases) {
    const got = lookup(input);
    if (got !== expected) {
      failures.push(`${JSON.stringify(input)}\n      期望: ${JSON.stringify(expected)}\n      实际: ${JSON.stringify(got)}`);
    }
  }
  assert.deepEqual(failures, [], `街景/语音动态串回归：\n  ${failures.join('\n  ')}`);

  // 反向对照（防止用例因「词典整体失灵」而假绿）：
  // 语音的 say 播报串是**刻意不译**的，必须保留原文。
  // 若哪天有人把它们也加进词典，这条会报红提醒：那是给模型念的，不是给界面看的。
  const spoken = [
    "Couldn't frame the aircraft right now.",
    'Finding Paris on the map.',
    'Picking the nearest aircraft.',
  ];
  for (const text of spoken) {
    assert.equal(lookup(text), null, `播报串被误译（say 不进 DOM，不该有词条）：${JSON.stringify(text)}`);
  }
  // MCP 工具表的 title/description 也不进浏览器（src/tools/* 只被 MCP protocol 消费）
  assert.equal(lookup('Weather map'), null, 'MCP 工具 title 被误译（它不进浏览器 UI）');
});

