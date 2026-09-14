# 版本说明（中文汉化版）

本文件记录中文汉化 fork 相对上游的变更。上游变更记录见 [CHANGELOG.md](./CHANGELOG.md)。

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
- **`Current style:` / `Current cockpit vision style:` 规则** — 风格名递归走词典（`FLIR` → 热成像），未收录的风格名保留原文。

### 验证

本轮改动附带三套临时校验脚本（位于 `.workbuddy/`，不入库）：

- 翻译正确性 78 例全通过（词典直查 / 加载状态 / 电台状态 / 动态规则 / 分段翻译 / 专有名词保留 / 弹窗 hook）；
- 稳定性与幂等性 32 例全通过 —— 重点验证分段译文仍含 ` · ` 时不会被 MutationObserver 反复改写：高频动态串 200 轮重扫，DOM 写入次数等于节点数，无抖动；
- 词典 462 键无重复；`npm run build` 通过，`dist/zh.js` 正常产出。

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
