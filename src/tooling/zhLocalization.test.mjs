import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
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
 *   - 含 `.` 或 `_` 的标识符/域名（adsb.lol、feeds_osm 等数据源名，不译）
 *   - 纯数据（需含 2 个以上连续字母）
 */
function isTranslatable(raw) {
  const t = raw.replace(/\s+/g, ' ').trim();
  if (t.length < 2) return false;
  if (/[一-鿿]/.test(t)) return false;
  if (!/[A-Za-z]{2}/.test(t)) return false;
  if (/[._]/.test(t)) return false;
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

  for (const group of collectHtmlStrings()) {
    total += group.items.length;
    for (const text of group.items) {
      if (lookup(text) === null) missing.push(`[${group.name}] ${JSON.stringify(text)}`);
    }
  }

  assert.ok(
    total > 100,
    `静态文案提取异常：仅 ${total} 条。`
      + '上游可能又改了标记来源（index.html 现为壳，真实文案在 src/ui/templates/*.html，'
      + '经 build/application-html.js 的 expandApplicationHtml 展开），请同步更新 collectHtmlStrings()',
  );
  assert.deepEqual(
    missing,
    [],
    `有 ${missing.length}/${total} 条静态文案未汉化（上游可能改了文案，需补 public/zh.js）：\n  ${missing.join('\n  ')}`,
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
    ['MILITARY · LIVE · COURSE ALIGNED', '军用 · LIVE · 航向对齐'],
    ['COMMERCIAL · STANDBY · COURSE ALIGNED', '民航 · STANDBY · 航向对齐'],
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
    ['军用 · LIVE · 航向对齐', null],
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
    'MILITARY · LIVE · COURSE ALIGNED',
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
  const settled = textNode('军用 · LIVE · 航向对齐');
  for (let round = 0; round < 5; round += 1) translateNode(settled);
  assert.equal(settled.writes, 0, '已翻译内容被重复写入');
  assert.equal(settled.data, '军用 · LIVE · 航向对齐');
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
