# 版本说明（中文汉化版）

本文件记录中文汉化 fork 相对上游的变更。上游变更记录见 [CHANGELOG.md](./CHANGELOG.md)。

## zh-1.2.1 — 2026-09-16

同步上游 62 个提交（Director 场景数据包与镜头指令 #610–#613、实时公交 GTFS-Realtime #587、尼泊尔洪水场景 #590、语音 Realtime 状态归属重构、transit/voice 若干修复）后的一轮汉化补全。上游无冲突，汉化补丁文件独立。

### 新增

- **地图朝向 / 倾斜控制按钮**（上游新增 `src/ui/templates/scene-chrome.html` 的 `#tilt-map-view`、`#north-up-view`）— 覆盖率门槛测试直接报出 4/320 条未汉化：
  - `Toggle straight-down and tilted map views`(切换正俯视与倾斜地图视角)、`Reset map bearing to north`(将地图朝向重置为正北)、`Tilt map to oblique view`(将地图倾斜为斜视角)、`Reset map to north up`(重置地图为上北朝向)。
  - 另补 `Return map to straight-down view`(恢复地图为正俯视视角) — 这是 `src/ui/cameraOrientationControls.js` 在倾斜态运行时改写的 `aria-label`，静态门槛扫不到，但漏了界面会切态后退回英文。
- **动态航向读数规则** — 上游每帧把北向按钮的 `aria-label` 改写成 `` `Reset map to north up. Current heading ${heading} degrees` ``，新增规则译出「重置地图为上北朝向。当前航向 N 度」。属性在 MutationObserver 的 `attributeFilter` 内，会被正常抓到。
- 词典从 496 条扩充到 **501 条**，动态串规则 50 → **51 条**。

### 验证

- 汉化门槛测试 **14/14 全绿**，静态文案覆盖 **320/320 = 100%**。
- 图标连字安全复查：本次上游新增 3 个 Material Symbols 连字 `view_in_ar`、`navigation`、`public`，均未被词典命中；`navigation`/`public` 已在既有 DOM 容器拦截测试的连字清单内（保护不靠黑名单）。
- 完整测试套件 **4149 / 4139 通过 / 0 失败 / 10 跳过**；`npm run build` 通过；`check:boundaries` 通过（上游本轮把它扩成 `check-import-directions.mjs` + `check-package-boundaries.mjs` 两步）。
- 依赖未漂移：`package.json` 仅扩充 `exports` 子路径映射与 `scripts`，`package-lock.json` 无变更，**无需 `npm install`**。

## zh-1.2.0 — 2026-09-15

同步上游 69 个提交（含手绘标注 `feat(annotations)` #547、无密钥导航 #564、Open Calgary 摄像头包 #514、UI 组件化模板拆分等）后，对汉化补丁做的一轮修复。**重点不是补词典，而是修两个会让汉化静默失效的结构性问题。**

### 修复

- **Material Symbols 图标连字被误译（既有 bug，本次根治）** — 图标 `<span class="material-symbols-outlined">radio</span>` 里的文本是字体连字码点，不是文案。而 `radio`/`adjust`/`on`/`normal` 等连字名恰好都是常用英文词，词典里早有词条（`电台`/`调节`/`开`/`标准`），于是 MutationObserver 会把图标译成汉字，连字不成立 → 图标退化成方块或一串字。上游还会在 JS 里动态换图标（`cockpitLayout` 切 `chevron_left/right`、`celestialRing` 建 `light_mode/dark_mode`），`characterData` 变更同样被观测到。
  - 现在 `translateNode` 在文本节点这层就拦截：父元素 `className`/`classList` 命中 `material-symbols` 即整段跳过，图标容器自身的属性翻译也一并跳过。
  - **只靠"别往词典加图标名"防不住**——上游随时可能加新图标名，而图标名与常用词撞车是必然的。必须在 DOM 层按容器类型拦。
  - 新增回归测试 `Material Symbols 图标连字不得被翻译`：17 个真实连字 × 4 种容器 class 全部断言零写入，同时反向确认 `Draw` 这类普通按钮文案在 `class="pp-label"` 下仍正常翻译（防止保护过宽）。

- **静态文案覆盖率门槛失效** — 上游把 `index.html` 从 929 行瘦成 40 行的壳，真实标记拆进 `src/ui/templates/*.html`，由 `build/application-html.js` 的 `expandApplicationHtml()` 在 Vite `transformIndexHtml` 阶段展开 `<!-- gev:template X -->` 占位符。原测试直接解析 `index.html`，结果只能提取到 1 条文案，门槛形同虚设（会假绿）。
  - 测试改为复用上游同一个 `expandApplicationHtml()`（与 `src/*.test.mjs` 同款相对路径 import），测的才是浏览器真正渲染出来的标记。上游今后再加模板会自动纳入门槛。
  - 提取范围放宽到单词标签（`Draw`/`Shape`/`Clear`/`Snow`），并剔除图标 span、含 `.`/`_` 的标识符（数据源名如 `adsb.lol` 不译）。门槛从 295 条提升到 **317 条**。

### 新增

- **手绘标注（PR #547）** — `Draw`(手绘)、`Shape`(形状)、`Area`/`Line`/`Pin`(区域/线条/图钉)、颜色 `Primary`/`Amber`/`Cyan`/`Green`/`Red`、`Clear`(清除)，及绘制提示与 `aria-label` 长句。
- **驾驶舱气象简报** — `regionalModel.js` 的 `weatherCodeLabel()` 全大写状态词此前完全未译：`CLEAR`(晴)、`PARTLY CLOUDY`、`OVERCAST`、`FOG`、`DRIZZLE`、`RAIN`、`SNOW`、`RAIN SHOWERS`、`SNOW SHOWERS`、`THUNDERSTORM`、`MIXED CONDITIONS`、`CONDITIONS UNKNOWN`。
  - **大小写歧义处理**：手绘面板有 `Clear`(清除按钮) 和 `Snow`(视觉风格"雪白"，不是天气"雪")，气象简报有 `CLEAR`(晴) 和 `SNOW`(雪)。`dictOnly` 精确匹配优先于大小写兜底，故两套词条共存不冲突；图标保护又在 DOM 层兜住小写连字。
- **`📍 Location: --`** — LOCATION 折叠态空态读数。带 emoji 前缀走不到既有 `Location: (.+)` 规则，单列词条；非空态填城市名属专有名词，保留原文。
- 词典从 462 条扩充到 **496 条**，动态串规则 50 条。

### 验证

- 汉化门槛测试 14 例全绿；完整测试套件 **3601 / 3592 通过 / 0 失败 / 9 跳过**（其中 2 个是 Node 24 预算基准，与汉化无关）；`npm run build` 通过，`dist/index.html` 58.83 kB（模板已正确展开）、`dist/zh.js` 保留；`check:boundaries` 通过。

## zh-1.1.0 — 2026-09-14

同步上游 255 个提交（含 `src/ui/` 组件化大重构、太空任务回放、电台生命周期状态机等）后，对汉化补丁做的一轮补全。词典从 170+ 条扩充到 **462 条**，`index.html` 静态文案覆盖率 **100%**（title / 静态文本 / placeholder / aria-label 全部覆盖）。

### 新增

- **分段翻译（`translateSegments`）** — 上游重构后大量状态串改用 `' · '` 拼接（如 `MILITARY · LIVE · COURSE ALIGNED`、`Playing BBC World Service · stale directory`）。整串精确匹配会全部失效，现改为按分隔符逐段查词典再拼回：
  - 命中的段落译出，未命中的段落（电台名、地名等专有名词）原样保留；
  - 至少译出一段才生效，避免把纯数据串改得支离破碎。
- **原生弹窗 hook（`hookDialogs`）** — 上游新增 `window.confirm` / `prompt` / `alert` 调用（删除场景、删除镜头、重命名镜头）。原生弹窗不是 DOM，MutationObserver 覆盖不到，现包装这三个方法在调用前翻译文案。
- **`alt` 属性翻译** — 属性翻译范围从 `placeholder / title / aria-label` 扩展到 `alt`。
- **新覆盖模块**：
  - 太空任务与发射回放（`REPLAY ASCENT`、`ASCENT PATH`、`LAUNCH SITE`、`STAGE / RE-ENTRY / RECOVERY`、`NO STAGE RE-ENTRY / RECOVERY DATA`、回放速度 `2.5×`、`12 / 30D`）；
  - 电台播放状态机（`Ready — playback starts only from your action`、`Connecting directly to broadcaster…`、`Radio lifecycle is uncertain…`、`Station unavailable after directory refresh…` 及全部 ` · ` 后缀）；
  - 加载反馈（`LOAD COMPLETE / CANCELLED / FAILED`、`TURNING OFF LIVE DATA`、`FETCHING / RETRYING MAPPED SITES`）；
  - 密钥配置面板（`GET KEY ↗`、`Free key — register, paste, done`、`browser-side`、`configured externally` 及两条安全说明长句）；
  - 场景截图（`LOAD` / `DEL` / `START`、`No shots yet…`、5 个内置场景名）；
  - 帧率监视器（`FPS 60`、`Rendered globe frames per second · toggle with \``）；
  - 新增视觉滤镜（`CRT`、`NVG`、`Pixelation`）与探测覆盖层参数（`Detection fade distance`、`Detection label density` 等）；
  - 相机姿态输入提示（7 条 `… — click to type`）。

### 变更

- **`lookup` 匹配顺序调整** — 由「词典 → 字母数守卫 → 规则 → 分段」改为「词典 → 规则 → 分段」，字母数守卫下移到分段兜底前。原顺序会把 `12 / 30D`、`L 030°`、`2.5×` 这类以数据为主的动态串挡在规则之前。
- **规则支持「主动放弃」** — 规则返回 `null` 不再终止匹配，会继续尝试后续规则与分段兜底。配合新增的 `trKeep`（严格翻译），`Expand / Collapse / Open / Close + 面板名` 这类规则在后半段译不出时整条放弃，避免产出「打开 detailed Radio controls」这种半中半英。
- **混合中英串窄通道（`mixed` 规则标记）** — 上游 `applicationShell.js` 会读取面板标题拼悬停提示（``btn.title = `${action} ${panelName}``），而面板标题已被本补丁汉化成中文，于是运行时产生 `Expand 数据图层` 这种混合串。防回环守卫默认「含中文即跳过」会让它原样显示。现为「动作词 + 面板名」这几条规则打上 `mixed: 1` 标记，允许它们在输入含中文时仍生效（其余规则不受影响，防回环保留）。**这是每次都会发生的场景，不是边缘情况。**
- **`Current style:` / `Current cockpit vision style:` 规则** — 风格名递归走词典（`FLIR` → 热成像），未收录的风格名保留原文。

### 验证

本轮改动附带三套临时校验脚本（位于 `.workbuddy/`，不入库）：

- 翻译正确性 78 例全通过（词典直查 / 加载状态 / 电台状态 / 动态规则 / 分段翻译 / 专有名词保留 / 弹窗 hook）；
- 稳定性与幂等性 32 例全通过 —— 重点验证分段译文仍含 ` · ` 时不会被 MutationObserver 反复改写：高频动态串 200 轮重扫，DOM 写入次数等于节点数，无抖动；
- 词典 462 键无重复；`npm run build` 通过，`dist/zh.js` 正常产出。

另新增仓库内回归测试 **`src/tooling/zhLocalization.test.mjs`**（13 例，被项目 `npm test` 自动发现）：把 `index.html` 静态文案 100% 覆盖率、关键动态串、分段翻译、混合中英串、专有名词保留、幂等性、弹窗 hook、语言开关固化成可执行门槛。**上游再改文案时 `npm test` 会直接变红，汉化不再静默失效。**

### 已知问题

- 上游新增的 216 条纯 `aria-label`（多为组件化重构后的无障碍描述）已覆盖 `index.html` 内的静态部分；JS 动态生成的无障碍标签若有遗漏，属低影响（不影响视觉呈现）。
- 语音模块（OpenAI Realtime）的口语回复仍为英文（属模型输出，不在 DOM 翻译范围）。

## zh-1.0.0 — 2026-09-02

基于上游 v0.1.1（commit `65bc522`）的首个汉化版本。

### 新增

- **`public/zh.js`** — 运行时汉化补丁：
  - 170+ 条精确词典，覆盖品牌标语、首次启动向导、全部面板、情报 CONTEXT、HUD 抬头、驾驶舱、视觉预设、语音模块、加载提示；
  - 正则规则表翻译动态读数串（● 录制、轨道/过境、目标 · N 公里、正在加载画面 N/N、增强配置 · N 个密钥待配置、正在飞往…）；
  - MutationObserver + 周期补扫，实时翻译动态 DOM；
  - 防回环保护（译文含中文即跳过）、WeakSet 去重、跳过 SCRIPT/STYLE/INPUT/CANVAS/SVG；
  - 同步翻译 `placeholder` / `title` / `aria-label` 属性。
- **界面语言切换**：右上角「中 / EN」按钮，状态存 `localStorage['gev-lang']`，切换自动刷新；默认中文。
- **`README.zh-CN.md`** — 中文使用手册（部署、汉化说明、数据层与 Key、安全提醒、同步上游）。

### 变更

- `index.html` — 仅新增一行 `<script src="/zh.js"></script>`（挂载汉化补丁）。

### 刻意保留英文

坐标读数（MGRS/经纬度）、呼号/航班号、数据源品牌名（OpenSky、AISStream 等）——符合情报界面惯例，避免误译数据。

### 已知问题

- 个别第三方浮层（如 Cesium ion 归属标识）保留原文。
- 语音模块（OpenAI Realtime）的口语回复仍为英文（属模型输出，不在 DOM 翻译范围）。

### 部署注意

- Node.js 24.14+ / 26.x；建议 `.env` 设 `OPENSKY_AUTH_MODE=anon` 免凭据启动。
