# 版本说明（中文汉化版）

本文件记录中文汉化 fork 相对上游的变更。上游变更记录见 [CHANGELOG.md](./CHANGELOG.md)。

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
