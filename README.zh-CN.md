# 上帝之眼 · God's Eye View（中文汉化版）

> 本仓库是 [bilawalsidhu/gods-eye-view](https://github.com/bilawalsidhu/gods-eye-view)（MIT 许可证）的中文汉化 fork，基于上游 **v0.1.1**（commit `65bc522`）。
> 汉化采用**运行时注入**方式，不改动上游核心逻辑，可随时 `git pull` 同步上游更新而不冲突。

浏览器里的「上帝视角」：把全球公开广播的实时信号（航班 ADS-B、船舶 AIS、卫星轨道根数、地震台网、公共摄像头、电台）聚合进同一个写实 3D 地球（CesiumJS + Vite，无前端框架）。

## 快速开始

```bash
git clone <本仓库地址>
cd gods-eye-view
cp .env.example .env        # 可选：所有 Key 均为增强项，零 Key 也能启动
npm install
npm run dev -- --host localhost --port 4173
```

打开 **http://localhost:4173** 即可。

### 环境要求与已知坑

- **Node.js 24.14+ 或 26.x**（Node 22/25 会报 too old；PATH 里若有旧版托管 Node 需先切换）。
- 建议把 `.env` 中 `OPENSKY_AUTH_MODE` 改为 `anon`（匿名模式，免 OpenSky OAuth 凭据，航班层走匿名 + adsb.lol 双源）。
- 运行 `npm run doctor` 可自检环境与各数据源状态。

## 中文汉化说明

- 汉化补丁位于 **`public/zh.js`**，由 `index.html` 中的一行 `<script src="/zh.js"></script>` 挂载。
- 界面右上角有 **「中 / EN」切换按钮**（状态存于 `localStorage['gev-lang']`，切换自动刷新）。
- 覆盖范围：品牌标语、首次启动向导、全部面板（数据图层/场景/显示/公共监控/情报/电台）、情报 CONTEXT 面板、HUD 抬头显示、驾驶舱、视觉预设、语音模块、加载提示等 170+ 条文案及动态读数串。
- 刻意保留英文：坐标读数（MGRS/经纬度）、呼号/航班号、数据源品牌名——符合情报界面惯例，避免误译数据。
- 技术要点：精确词典 + 正则规则表（动态串）+ MutationObserver 监听动态内容 + 防回环（译文含中文即跳过）。
- 不想要汉化：删除 `index.html` 中那行 script 引用，或点「中 / EN」切回英文。

## 数据层与 Key

13 个实时图层中 **11 个零 Key 可用**：Esri 卫星底图、民航航班、军用航班、卫星、地震、交通（无 Key 为模拟并明确标注）、公共摄像头、电台、共享单车、发射任务、已标注设施；另有静态数据集（数据中心/水坝/海底光缆）。

| 能力 | Key | 成本 |
|---|---|---|
| 全球船舶 | AISStream | 免费 |
| 活跃火点 | NASA FIRMS | 免费 |
| 真实路况 | TomTom | 免费额度 |
| 3D 实景城市 | Cesium ion | 免费社区版 |
| Google 3D + 地点搜索 | Google Maps | 计费 |
| 语音控制 | OpenAI | 计费 |

在界面右下角 **POWER UP** 面板粘贴 Key 即可启用（写入本 checkout 的 `.env` 并自动重启）。

## 安全提醒

- 默认只绑定 `localhost`。**不要**随意设置 `HOST=0.0.0.0` 暴露到局域网——dev server 会代理你配置的 API Key，任何能访问的人都能消耗你的配额。
- 确需共享时，先配置 `GEV_RATELIMIT_OPENAI_PER_MIN` / `GEV_RATELIMIT_GOOGLE_PER_MIN` 限流。

## 同步上游

```bash
git remote add upstream https://github.com/bilawalsidhu/gods-eye-view.git
git fetch upstream && git merge upstream/main   # 汉化文件独立，通常无冲突
```

## 许可证

上游代码遵循 MIT 许可证（Copyright (c) 2026 Bilawal Sidhu），汉化补丁同样以 MIT 发布。详见 [LICENSE](./LICENSE)。
