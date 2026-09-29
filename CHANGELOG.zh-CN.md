# 版本说明（中文汉化版）

本文件记录中文汉化 fork 相对上游的变更。上游变更记录见 [CHANGELOG.md](./CHANGELOG.md)。

## zh-1.5.0 — 2026-09-29

同步上游 2 个提交（201 文件，+26668/-1976）后的一轮汉化补全。上游无冲突，汉化补丁文件独立。**本轮上游是一次数据源架构重构——`fix(osm): stop using public Overpass by default`（#648 / #742）**：交通路网改走 OpenFreeMap 矢量瓦片（配 TomTom 密钥时为 Hybrid），军事区域改用 OpenFreeMap 多边形加自带全球名称索引，ALPR 改读 OSM 小时级抽取，驾驶舱地点上下文与国/州/县边界改用内置 Natural Earth 与 US Census 数据，Overpass 仅在运维自行配置端点时才使用；数据署名统一为一条 OpenStreetMap。另有 #821 提示既有安装更新。

### 新增

- **交通图层状态行**（`src/layers/traffic/controls.js` 的 `roadStatusLabel()`、`model.js` 的 `trafficFeedPresentation()`）— 本轮重构新写的一整套状态串：`Roads unavailable`、`Local surface still loading`、`Partial coverage`、`Detailed roads unavailable`、`Reduced detail coverage`、`Roads without flow hidden`、`No flow roads in view`、`Unmatched: simulated`、`Hybrid needs a TomTom key`、`TomTom roads need a TomTom key`、`… unavailable while the traffic service is unreachable`，以及复合串 `LIVE · Roads: TomTom · Flow 42%`、`SIMULATED · Roads: OpenStreetMap · Flow: TomTom (no matches)`。
- **已标注设施图层**（`src/data/installationFeedback.js`、`controls.js`、`ingestion.js`）— `Map tiles temporarily unavailable`、`Mapped names temporarily unavailable`、Overpass 四种失败原因、`— retrying in 12s` / `— retry pending` 倒计时、`Zoom in to search mapped installations`、`Showing cached mapped sites`，以及本轮新增的**计数串**：`No mapped sites in view`、`12 mapped sites in view`、`3 mapped sites within 5 km of the contact`（单复数与范围两种形态各建规则）。
- **ALPR 摄像头图层**（`src/layers/alpr/index.js`、`source.js`）— `Zoom in to load mapped cameras`、`Showing cached locations`、`Coverage limited — zoom in`、`No ALPR data for this area — US and Canada only`、`None on screen — nearby cameras are outside the view`、`Camera coverage unavailable`。
- **矢量瓦片数据源**（`src/sources/vectorTiles.js`、`src/layers/traffic/source.js`、`flow.js`）— `Vector tiles unavailable`（含 `(HTTP nnn)` 形态）、`Zoom in for vector tile coverage`、`OpenFreeMap tiles rate-limited / timed out / unavailable`、TomTom 流量错误四种。
- **图层 feed 状态徽标补全**（`src/data/layerSnapshot.js` 的 `FEED_STATE_LABELS`）— 上游有五个状态词，词典此前只建了 `STALE`、`LOADING` 两个，`UNAVAILABLE`/`DEGRADED`/`FALLBACK` 一直缺失，导致明细行长期半中半英；另补 `ENABLING`/`DISABLING`。
- **图层面板通用片段**（`src/ui/layerPanel.js`）— `never`、`loading...`、`incomplete snapshot`、`12 of 40 records accepted`、`lifecycle state requires reconciliation`。
- **标注轮廓与地点导航** — `Detailed outline unavailable`（`screenAnnotationRenderer.js` 把它拼进 SVG text）、`Military area`（`openFreeMap.js` 无名军事区占位名）、三条地点导航 toast：`Location not found`、`Search failed`、`Fly to a POI first`。
- 词典从 766 条扩充到 **841 条**（+75），动态串规则 117 → **139 条**（+22）。

### 修复（一处是门槛里的假绿断言，两处是真实漏译）

- **门槛里有一条凭想象编的用例，一直假绿** — 分段翻译测试断言 `'MILITARY · LIVE · COURSE ALIGNED'` → `'军用 · LIVE · 航向对齐'`（即期望 `LIVE` 保留英文），以及 `'COMMERCIAL · STANDBY · COURSE ALIGNED'` → `'民航 · STANDBY · 航向对齐'`。核查上游源码（`src/ui/cockpitInstruments.js:128-136`）后发现**两条都是虚构的**：芯片串的 feedState 只有 `ACQUIRING SURFACE` / `SURFACE FALLBACK` / `STALE FEED` / `LIVE TRACK` 四种取值，上游从不输出裸 `LIVE`；`STANDBY` 更是全仓 grep 无任何输出点。它们能「通过」恰恰是因为词典里没有 `LIVE`/`STANDBY` 条目、被当成专有名词原样保留——**是假绿，不是保护**。本轮补齐状态词后，`LIVE` 断言立刻报红，把问题暴露出来。
  - 已把这两条替换为上游真实输出的四种 feedState，并把本轮新增的交通状态行也纳入分段翻译断言。
- **`STALE FEED`、`SURFACE FALLBACK` 漏译** — 驾驶舱芯片四种状态里，只有 `LIVE TRACK`、`ACQUIRING SURFACE` 有词条，另两种一直显示英文（合并前就存在）。用探针喂上游真实串才发现，不是靠读代码推出来的。
- **小写状态词的大小写兜底行为无断言保护** — 补 `LIVE`/`UNAVAILABLE` 等全大写状态词后，`dictOnly` 既有的「精确 → `toUpperCase()` → `toLowerCase()`」兜底会让小写 `live`/`unavailable` 也被翻译。这**不是 bug 而是既有设计**（`calm`/`Calm`、`Clear`/`CLEAR` 靠它共存），但此前没有任何断言锁定它，后人容易误当 bug 去「修」，或反过来在不知情下依赖它。已新增专门测试锁定该行为，并在注释里写明它安全的前提（上游凡把状态词渲染成可见文本的路径都先 `.toUpperCase()` 或用大写字面量；小写形式只出现在内部状态值、`dataset.state`、CSS class，而补丁的属性白名单只有 `placeholder`/`title`/`aria-label`/`alt`，不含 `data-state`）。同一测试还断言大小写共存仍成立：`Clear`=清除 ≠ `CLEAR`=晴（zh-1.4.0 的血泪教训不得回退）。

### 门槛强化

- 新增测试 **`图层面板明细行 / feed 状态：JS 现拼的动态串必须译出`** — 固化 56 条真实动态串。这批串全是 JS 运行时拼的（`layerPanel.js` 渲染 `${source} · ${loadingLabel}` 与 `stats.error`、`installationFeedback()` 拼计数与重试倒计时），**静态 HTML 门槛扫不到**：门槛只读 `src/ui/templates/*.html`，本轮上游一个模板都没动，所以门槛 18/18 全绿的同时实测有 79 条未译。不单独设门槛就没有任何信号。
- 新增测试 **`专有名词不得因状态词规则被误译（防过宽）`** — 新增高频状态词与 `— retrying in Ns`、`(HTTP nnn)`、计数类规则后，守住数据源名（`OpenStreetMap / TomTom`、`TomTom + OpenStreetMap`）、专有名词（`Cedar Complex`、`Vandenberg SLC-4E`、`BBC World Service`）、纯数据读数（`3.2 km`、`7.6 km/s`、`42%`、`HTTP 429`）与上游内部标识符（`military_land`、`ofm:3/2/1:4`）不被波及。同一测试内**反向确认规则确实生效**（断言 `LIVE`→实时、`Vector tiles unavailable (HTTP 429)` 与计数串译对），避免「因为 lookup 整体失灵所以全都保留原文」这种假绿。
- 新增测试 **`小写状态词的 dictOnly 大小写兜底：锁定行为并确认其安全性`** — 见上文修复第三条。
- **三处修复与两处新门槛都做了反向验证**（不是只看绿灯）：
  - 删掉 `'STALE FEED'` 词条 → 分段翻译测试精确报红；
  - 删掉 `'Map tiles temporarily unavailable'` 词条 → 仅新门槛 test 19 报红；
  - 把 `Vector tiles unavailable \(HTTP (\d+)\)` 规则换成永不匹配的规则（**先确认文件语法仍有效**，排除级联失败）→ test 19 与 test 20 精确报红；
  - 每次还原后 21/21 全绿。
- 汉化门槛测试从 18 例增至 **21 例**；静态文案覆盖维持 **386/386 = 100%**（本轮上游未改 `index.html` 或任何 `src/ui/templates/*.html`，条数与 zh-1.4.0 持平）。
- 探针实测：86 条候选动态串，修复前命中 7 / 未命中 79，修复后命中 **85 / 未命中 1**——唯一未译的是 `OpenStreetMap / TomTom`（图层数据源标签，两个都是专有名词，按纪律保留原文，`lookup` 返回 null 正是预期）。
- 图标连字复查：本轮上游模板唯一出现的连字仍是 `arrow_left`/`arrow_right`，均已在保护清单；新增词条（含 `Military area`）无与连字同名者。

### 排错教训

- **「门槛全绿」不等于「汉化没退化」，静态门槛有结构性盲区。** 本轮门槛 18/18 全绿、完整测试 0 失败，但实测有 79 条用户可见文案是英文——因为它们由 JS 运行时拼接，而门槛只扫 HTML 模板。判读方法：**上游没动模板文件 ≠ 没有新文案**。凡是改了图层状态机、反馈函数、错误消息目录（本轮的 `installationFeedback()`、`roadStatusLabel()`、`roadRequestError()`、`deriveTrafficFlowError()` 都属于这类），就必须从源码里抠出真实串跑探针，不能只看门槛。
- **测试用例本身也会过期/虚构，且过期方式偏偏是「假绿」。** `LIVE`/`STANDBY` 那两条断言写的时候可能上游确实输出过，也可能一开始就是凭印象编的；无论哪种，它们后来的「通过」都只是因为词典缺条目。**给分段翻译写用例时，断言必须能区分「刻意保留专有名词」和「词典漏了」**——前者要有正向对照（同一测试里断言某个专有名词确实译不出、某个相邻段确实译得出），否则漏译会伪装成保护。本轮的修法是把用例全部换成上游源码里能 grep 到的真实输出。
- **反向验证要先确认「破坏动作本身语法有效」。** 第一次做规则级破坏时用 shell 内联 `node -e` 改正则，转义层层出错把文件改成语法错误，结果门槛一片红——那不是规则级验证，是级联失败。改为先 `node --check` 确认文件仍可加载、再跑测试，红才有意义。
- **从 diff 粗提取的候选串，补之前也要 grep 出处。** 第一轮提取把 `Invalid vector tile selection` / `Invalid vector tile viewport` 列为候选，实际 `grep -rn` 全仓源码（排除测试）**根本不存在这两个串**——它们只出现在测试文件里。真正存在的是 `Invalid vector tile metadata` / `Invalid vector tile origin`。差点照单全收补进词典，那就是在翻译幽灵文案。这和上文那条虚构测试用例是同一类错误：**候选串和测试用例一样，都必须能 grep 到出处**。

### 同步记录

- 守门检查：远程 `e7707d9` vs 本地缓存 `81eb443` → 上游有更新，落后 2 个提交。
- 合并无冲突，merge 提交 `0f5da30`（parents `92b4f9b` + `e7707d9`），已推送 `92b4f9b..0f5da30 -> origin main`（SSH）。
- 依赖检查：`package.json` / `package-lock.json` **均未变** → 无需 `npm install`。
- 完整验证：`npm test` **5391 / 5378 pass / 0 fail / 10 skip / 3 cancelled**；`npm run build` ✓（16.2s）；`check:boundaries` ✓。
- 本轮改动的 `public/zh.js` 与 `src/tooling/zhLocalization.test.mjs` 均不在 `scripts/format-scope.json` 管辖范围内，不会引入格式检查失败。

## zh-1.4.0 — 2026-09-28

同步上游 41 个提交（247 文件，+39137/-2569）后的一轮汉化补全。上游无冲突，汉化补丁文件独立。**本轮上游一口气落地了四个新功能模块——赛博 HUD 与 GPU 接触声呐（#706）、本地接收器体系：浏览器 RTL-SDR + 本地 ADS-B 图层 + 解码数据源（#732）、近期影像面板（#716）、火灾边界图层与 Active Fires 的 MODIS 数据（#737）**，外加赛博 HUD 的驾驶舱框线/扫描阵列视觉（纯 SVG，无文案）。

### 新增

- **赛博声呐**（`src/ui/cyberSonarControls.js`、`src/cyberSonar*.js`、`display-controls.html`）— HUD 布局新增第四个风格选项 `Cyber`(赛博)，以及五个滑杆：`Sonar`(声呐)、`Rings`(环数)、`Range`(范围)、`Power`(强度)、`Sector`(扇区)；GPU 不可用时的降级提示也一并译出。
- **本地 RTL-SDR 接收器**（`src/sdr/controller.js`、`src/ui/localSdr*.js`、`context.html #sdr-radio-card`）— 整张卡片：`LOCAL RTL-SDR`/`NO USB`/`CONNECT`/`DISCONNECT`/`LOCATE`/`CHANGE DEVICE`、模式切换 `FM`(调频)/`ADS-B · 1090`、增益 `GAIN`/`AUTO`、统计行 `MSG/S`(条/秒)/`HEARD`(已收到)/`POSITIONED`(已定位)/`IQ`、`FM MHZ`/`TUNE`/`◀ SEEK`/`SEEK ▶`/`SDR VOL`，以及全部状态串（`STREAMING`/`CONNECTING`/`TUNING`/`IDLE`、调谐与搜台消息、`DSP n blocks`、`RF ...`、`audio ...`）和本地 ADS-B 的数据源聚合状态（`2 feeds live · 14 heard`、`feed 978 unreachable`）。
- **近期影像面板**（`src/ui/recentImagery.js`、`imageryBoxTool.js`、`imagerySplit.js`、`context.html #recent-imagery-panel`）— 面板壳 `RECENT IMAGERY`、模式 `IMAGE`/`VS BASEMAP`/`A / B`、动作按钮 `SELECT BOX`/`USE VIEW`/`CLEAR`/`SWAP`/`EXPORT`/`START HERE`/`PREVIEW`/`ZOOM IN`、云量读数 `32% cloud`、天数计数 `5 DAYS`、七条快捷键提示（`← → preview · A or B pins ...`）、框选工具引导（`Press on the ground, not the sky`）与数据源署名。
- **火灾边界图层**（`src/layers/perimeters/cards.js`）— 卡片标题 `FIRE · Cedar Complex`（火场名为专有名词，保留原文只译前缀）、`part of ...`、`Unnamed incident`、InciWeb 外链的无障碍标签。
- 词典从 634 条扩充到 **766 条**，动态串规则 81 → **117 条**。

### 修复（三处，其中一处是界面上看得见的错译）

- **`CLEAR` 撞车导致清除按钮显示成「晴」** — 这是本轮最要紧的一条，而且**在合并前就已经存在于线上**：2026-09-23 那轮为气象读数加了 `'CLEAR': '晴'`，而本轮上游新增的近期影像面板和既有的路径规划面板，它们的清除按钮 label 都是**全大写 `CLEAR`**，与气象状态词大小写**完全一致**。
  - 以前那套「靠大小写共存」的办法（`'Clear'`=清除 / `'CLEAR'`=晴，见 zh-1.2.0）在这里彻底失效：词典两个键会互相覆盖，结果是按钮上明晃晃显示「晴」。
  - 改为**按 DOM 容器类型消歧**：新增 `CONTEXT_WORDS` 表与 `contextLookup()`，在 `translateNode` 的文本节点分支和属性分支**优先于词典**判定——按钮类容器（`<button>`/`<a>`/`role=button`/带 `data-action-id`/`data-chip-id`）里的 `CLEAR` 译作「清除」，其余（如 `<strong id="cockpit-local-condition">`）译作「晴」。
  - 以后上游再加同形词，往 `CONTEXT_WORDS` 加一条即可，**不要去改词典**（改了就是又一次互相覆盖）。
- **覆盖率门槛自己有个「句号盲区」** — `isTranslatable()` 用 `if (/[._]/.test(t)) return false` 排除标识符（`adsb.lol`、`feeds_osm`），但这是**一刀切**：凡是含点号的串全部排除，于是**句号结尾的整句说明文案**被连带误杀，例如 `Connect an RTL-SDR to begin.`、`Initializing photorealistic world...`、`Search any location...`、`Imagery on Esri · Google 3D returns when cleared`。这些都是界面上大段可见文本，漏译最刺眼，而门槛一路**假绿**。
  - 改成「含点号 **且** 不含空白」才排除，只放过真正的标识符/域名；同时显式排除纯数值读数（`0.9 dB` 这类增益下拉选项会涌进来）。提取条数从 322 → **386**，多出的 22 条句号结尾整句里，大部分是此前一直漏在门槛之外的既有文案（视觉风格 tooltip、密钥配置说明、`Initializing photorealistic world...`、`Search any location...` 等），少数来自本轮新增的 SDR 卡片说明段。
  - 条数下限断言从 `> 100` 提到 `> 300`，并**新增一条针对过滤规则本身的防回归断言**（断言 `Connect an RTL-SDR to begin.` 必须在提取范围内），报错信息直接写明「又把句号结尾的整句过滤掉了，门槛会假绿」。
- **探针抓出 6 处半译与多余空格** — `14 heard · 3.2 msg/s` 译成「收到 14 架 · 3.2 msg/s」（捕获组没过 `tr()`）、`Switching to FM` 译成「正在切换到 调频」（中文之间多补空格）、`feed 1090 invalid · 5 heard` 整块失效（规则把 `feed` 后的名字误当数字前缀）等。新增 `joinZh()` 处理中文前缀拼接，并把数据源问题串的正则改成上游真实格式。

### 门槛强化

- 新增测试 **`SDR / 近期影像 / 赛博声呐动态串必须译出`** — 固化 40 条真实动态串。这三个模块的文案几乎全是 JS 里现拼的（`localSdrPresentation.js` 的 `statusText()`、`recentImagery.js` 的 `countText()`/`cloudText()`/`hintText()`、`localAdsb/status.js` 的 `describeFeedProblems()`），**静态 HTML 门槛扫不到**，不单独设门槛就没有任何信号。同一道测试里还守住「数据/专有名词必须原样」（`0.9 dB`、`Sentinel-2`、`adsb.lol`、`Cedar Complex`、`1090` 等 12 条）与「译文不得被二次改写」（幂等）。
- 新增测试 **`上下文相关词：CLEAR 在按钮里是「清除」、在气象读数里是「晴」`** — 覆盖四种容器（气象 `<strong>`、`data-action-id` 按钮、`data-chip-id` 按钮、按钮 `title` 属性），并断言幂等（连扫 3 轮只写 1 次）。
- **三处修复都做了反向验证**（不是只看绿灯）：禁用 `contextLookup` → CLEAR 测试精确报红；把 `isTranslatable` 改回旧的一刀切 → 句号盲区断言报红并指出「门槛会假绿」；把 `^(\d+) heard$` 规则改成返回 `null` → 动态串测试报红。恢复后 18/18 全绿。
- 汉化门槛测试从 16 例增至 **18 例**，静态文案覆盖 **386/386 = 100%**。
- 图标连字清单补 `tune`：本轮往词典加了 `'TUNE'`（SDR 调谐按钮），而 Material Symbols 恰好有 `tune` 图标。保护靠 DOM 容器拦截而非黑名单，测试清单补上这个词只是让「词典里存在图标同名词」这件事有断言守着。上游本轮模板唯一新增的连字是 `radar`，早已在清单内。

### 排错教训

- **用例必须从上游源码里抠，别凭想象编。** 我最初把数据源问题串写成 `1 feed adsb.lol stale`、`2 feeds adsb.lol, opensky unreachable`（带数字前缀），探针报「未译」；去读 `describeFeedProblems()` 才发现真实格式是 `feed 978 unreachable` / `feeds 1090, 978 stale`（**没有**数字前缀），是正则写错而非用例写错。改对用例后一次通过。这条纪律在 zh-1.3.0 也踩过，值得再记一次。
- **规则里带前导分隔符的键永远匹配不上。** 曾写过 `/^ · read while Local ADS-B is on$/`，但 `lookup()` 开头会 `trim()`，这条规则永远进不去。已删掉并在注释里写明原因。

### 验证

- 汉化门槛 **18/18 全绿**；完整测试套件 **5108 / 5098 通过 / 0 失败 / 10 跳过**；`npm run build` 通过（50s）；`check:boundaries` 通过。
- **依赖有漂移，已 `npm install`**：`package-lock.json` 变更（硬信号），上游新增 `@jtarrio/signals@^0.10.0` 与 `@jtarrio/webrtlsdr@^3.0.6`（本地 RTL-SDR 的 WebUSB 驱动与解码），另带入 `@types/w3c-web-usb`。不装的话本地构建/测试会因缺模块失败。

## zh-1.3.0 — 2026-09-23

同步上游 17 个提交（198 文件，+31641/-1852）后的一轮汉化补全。上游无冲突，汉化补丁文件独立。**本轮上游新增了三个全新图层模块——气象影像（`src/layers/weather/`）、风场（`src/layers/wind/`）、热带气旋（`src/layers/cyclones/`），以及配套的读数面板体系（`src/ui/weatherPanel.js`、`railCards.js`、`railTimeline.js`、`chipGroup.js`）**，文案量远超前几轮。

### 新增

- **右侧气象栏面板壳**（上游新增 `src/ui/templates/context.html` 的 `#weather-panel`）— 覆盖率门槛测试直接报出 2/322 条未汉化：`WEATHER`(气象)、`Active weather products`(当前生效的气象产品)。
- **气象影像图层**（雷达反射率 / 闪电密度 / GOES 红外 / 全球红外）：产品名、区域覆盖徽标（`CONUS`→美国本土、`Americas + Pacific`→美洲 + 太平洋）、影像模式（`Clouds only`/`Full`/`Soft`/`Vivid`）、`REGION`/`IMAGE`/`OPACITY` 设置分组、全部状态串与三段 `infoTitle` 长说明。
- **风场图层**：`Wind motion`/`Wind speed`/`Sea-level pressure`/`Air temperature · 2 m` 场数据名、`MODEL`/`FIELD`/`UNITS`/`MOTION` 分组、GFS 与 ECMWF IFS 模式名、16 方位罗盘（`NNE`→东北偏北 等）、读数卡 `WIND AT ...`、以及 10 米地面风那段最长的 `infoTitle` 免责声明。
- **热带气旋图层**：NHC 六级强度分级（`Hurricane`→飓风、`Tropical depression`→热带低压 等）、公报编号、路径/不确定性锥说明、`Maximum sustained wind: ... · Pressure: ...` 动态行。
- 词典从 501 条扩充到 **634 条**，动态串规则 51 → **81 条**。

### 修复（两处结构性缺陷，均由实测探针抓出）

- **多行 `info` 串完全无法汉化** — `src/ui/layerPanel.js` 把 `controls.info` 直接 `textContent` 进 DOM，而三个新图层都用 `\n` 拼接多行说明文本。`lookup()` 开头会把所有空白压成单空格，于是这些串在词典/规则里永远查不到对应键，整块静默退回英文。
  - 现在 `lookup()` 在压平空白**之前**先走 `translateLines()`：按 `\n` 拆开逐行翻译（行内不含换行，不会递归回来），再拼回。与 `translateSegments` 同样的保守口径——一行都没译出就整体放弃，绝不产出半中半英。
- **`' · '` 复合串里的单位量词段被跳过** — `Air temperature · 2 m · 18.5 °C` 会译成「气温 · 2 m · 18.5 °C」。根因是 `translateSegments` 把「不含 2 个连续字母」的段判定为纯数据后**直接 push 原文、根本不调用 lookup**，`2 m` 只有 1 个字母，量词规则因此没有生效机会。
  - 改为纯数据段也过一遍 `lookup()`：命中才替换（`2 m`→`2 米`、`30 min`→`30 分钟`、`24 h`→`24 小时`），查不到照旧保留。
  - **副作用边界已守住并加了测试**：`3.2 km`、`7.6 km/s`、`18.5 °C`、`1013.2 hPa`、`85 kt`、`09-23 12:00 UTC` 全部仍返回 `null`（补丁不介入）；面积单位 `5 m²` 不会被成长度量词误当；既有的 `ASCENT PATH · 3.2 km`、`LAUNCH SITE · Vandenberg SLC-4E` 等分段行为无回退。
- **`dictOnly` 不做「首字母大写提升」** — 风速读数走 `0.0 km/h · calm`（小写）而 `windFrom()` 返回 `'Calm'`（大写），两者会分别落到分段与词典两条路径。原以为写一个 `'Calm'` 就能靠大小写兜底命中，实测不行：`dictOnly` 只试精确 / 全大写 / 全小写三种形式，`calm` → `CALM`/`calm` 都不等于 `Calm`。**两个大小写形式必须各自建键**，已在词典注释里写明。

### 门槛强化（防止本轮工作再次静默失效）

- 新增测试 **`气象/风场/气旋动态串（含多行 info）必须译出`** — 固化 40+ 条真实动态串。这三套图层的文案几乎全是 `getRowControls()` 现拼的，**静态 HTML 门槛（`collectHtmlStrings()` 只扫 `src/ui/templates/*.html`）扫不到**，所以必须单独设门槛，否则上游改拼接方式时不会有任何信号。
- 新增测试 **`量词段翻译不得波及单位数据与既有距离显示`** — 上面第二处修复放开了纯数据段的规则匹配，这道测试守住它的副作用边界，分「单段串必须完全不动」与「复合串的数据段必须原位保留」两类断言。
- 两道新门槛都做了**反向验证**（不是只看绿灯）：临时禁用多行分段 → 气象测试变红；把 `translateSegments` 改回旧行为 → 精确报出「期望 `气温 · 2 米 · 18.5 °C` / 实际 `气温 · 2 m · 18.5 °C`」。恢复后 16/16 全绿。
- 汉化门槛测试从 14 例增至 **16 例**，静态文案覆盖 **322/322 = 100%**。

### 验证

- 汉化门槛 **16/16 全绿**；完整测试套件 **4642 / 4632 通过 / 0 失败 / 10 跳过**；`npm run build` 通过；`check:boundaries` 通过。
- **依赖有漂移，已 `npm install`**：`package-lock.json` 变更（硬信号），上游新增 `@meri-imperiumi/eccodes-wasm@^2.48.2`（GRIB 气象数据解码）与 `hls.js@^1.7.3`（CCTV 视频流）。不装的话本地构建/测试会因缺模块失败。

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
