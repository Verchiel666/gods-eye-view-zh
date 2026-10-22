# 版本说明（中文汉化版）

本文件记录中文汉化 fork 相对上游的变更。上游变更记录见 [CHANGELOG.md](./CHANGELOG.md)。

## zh-2.0.2 — 2026-10-22

**同步上游 147 个提交**（97 个非合并提交，272 文件 +24379/-25144）并补齐新增文案翻译。上游本轮重点：**街景序列与覆盖重写**（`lineCoverage`/`sequenceCones` 新模块、provider 目录扁平化、segmented selectors 统一、hover/legend/byte-budget 缓存删除、改为等待 image cones/photo line 可拾取）、**浮动可缩放右侧面板整体移除**（`fbbc4cda`，`qa-panel-resize.mjs` 随之删除）、provider 响应格式校验（PR #1317）、共享 statusBadge/dropdown/numeric field 控件面等。

### 变更

- 合并冲突 3 处（自动化按策略中止后人工解决）：
  - `scripts/package-boundaries.json`（与 zh-2.0.1 同一冲突点：上游 statusBadge / mapillary policy.js 条目 vs 本地 zh locale 条目）→ **双方条目并集**，`check:boundaries` 实测通过
  - `scripts/qa-panel-resize.mjs`（modify/delete：被测功能本身已随面板重构移除）→ **接受删除**
  - `scripts/qa-street-level.mjs`（上游整文件重写）→ **取上游版**，英文 pin 重贴到新 `boot()`；顺手把 pin 键从旧 `gev-lang` 升级为原生 **`gev:locale:v1`**（旧键仅靠 zh.js 的迁移逻辑兜底）
- `zh.json`：**+9 条新译**（街景覆盖/序列/筛选/全屏按钮），**-13 条陈旧**（`--prune`：globe→ground 改写、面板缩放相关、`FOLLOW`/`Selected` 等被移除串），目录 2675 → **2671 条**，`npm run i18n` 三语言 complete
- `public/zh.js` 词典 1 条换新：`Expand the street-level view (Esc shrinks it)` → `Show the street-level view full screen (Esc shrinks it)`（全屏显示街景视图（按 Esc 缩小）），与 zh.json 译法一致——该串在模板 `<button title>` 里，归补丁的静态门槛管
- **修上游 win32 缺陷 1 处**：`skyAssets.paintOut.test.mjs`（本轮新引入）用 `URL.pathname` 拼资源路径，win32 下带前导斜杠（`/C:/...`）sharp 打不开 → 改 `fileURLToPath()`（与上游自己在 `0265ad4` 修 `codexOauthRealtime` 同款修法，可回馈）

### 验证

- `npm run i18n`：zh / es / ru 三语言 **complete**（2671 条）
- 汉化门槛 **28/28**；`check:boundaries` ✓；`format:check` ✓（1471 文件）；`npm run build` ✓（18.71s）
- `npm test` **8285 / 8275 pass / 0 fail / 10 skip**
- `package-lock.json` 无变动，未执行 `npm install`

## zh-2.0.1 — 2026-10-20

**同步上游 158 个提交**（82 个非合并提交，134 文件 +21315/-7940）并补齐新增文案翻译。上游本轮重点：**Gemini Live 语音提供方**（`src/voice` 32 文件，新增 `geminiSession.js`/`geminiAudio.js`/`providerCommands.js` 等）、**CCTV 摄像头目录强化**（Tarktee DATEX 编目加固、Kartverket 高程、FL511、后台增量刷新）、发射库请求对齐服务商指引、Agent World Packet 时效修复等。

### 变更

- `zh.json`：**+53 条新译**（Gemini Live 语音会话/音频/令牌错误、语音提供方切换、keySetup 太空任务令牌说明等），**-1 条陈旧**（"Higher space-missions request allowance"，上游已移除），目录 2623 → **2675 条**，`npm run i18n` 三语言 complete
- 合并冲突 1 处：`scripts/package-boundaries.json`（上游 voice/sources 新模块条目 vs 本地 zh locale 条目），按**双方条目并集**解决，`check:boundaries` 实测通过

### 验证

- `npm run i18n`：zh / es / ru 三语言 **complete**（2675 条）
- 汉化门槛 **28/28**；`check:boundaries` ✓；`format:check` ✓（1447 文件）；`npm run build` ✓（9.92s）
- `npm test` **8279 / 8269 pass / 0 fail / 10 skip**（上游本轮新增约 475 个测试；原 win32 恒挂缺陷已随上游修复）
- `package-lock.json` 无变动，未执行 `npm install`

## zh-2.0.0 — 2026-10-19

**切换为上游原生中文语言包**。汉化机制从「DOM 注入补丁」升级为「一等公民 locale」：新增 `src/i18n/locales/zh.json`（**2623 条，覆盖上游全部 `t()`/`tn()`/`msg()` 与 `data-i18n*` 标记**，官方 `npm run i18n` 判定 `zh: 2623 messages, complete`），接入 `LOCALES` 与语言选择器（界面右下角地球按钮，中文名「中文」）。`same-as-english.json` 新增 zh 段 23 条（单位符号、波段、品牌、坐标、调色板名）。`zh.js` 补丁保留但重新分工：只补上游不标记的数据动态串与原生弹窗 hook；其语言门禁改为跟随上游解析顺序（`?lang=` → `gev:locale:v1` → 浏览器语言 → 默认 en），旧键 `gev-lang` 一次性迁移进 `gev:locale:v1`，原「中 / EN」注入按钮移除（由上游选择器接管）。

### 关键设计

- **默认语言保持 en 的解析语义**：中文用户经 `navigator.languages` 自动得到中文（浏览器实测：本机无参启动 `<html lang>=zh` 且界面中文），非中文环境回退英文——上游单测全部暗含英文文案假设，改默认值会让套件系统性变红，浏览器语言检测已能覆盖目标用户。
- **`tn()` 复数回退修正（index.js 一行）**：回退形态的复数判定改走源语言 `'en'` 而非 `DEFAULT_LOCALE`——否则任何默认语言为 zh 的 fork 都会把英文单数也判成 `other` 形态。这行对上游也是语义修正，可回馈。
- **context 键原生消歧**：`t('CLEAR', { context: 'action' })` → 清除、`t('CLEAR')` → 晴，取代补丁的 DOM 容器消歧 hack；导航方向词分三套 context（direction 向X转 / fork direction 靠X / lane direction X侧），44 种机动组合经 `directionsInstruction()` 实测枚举验证。
- **术语修正**：NOT AN ALL-CLEAR 由「非全面许可」改译「并非解除警报」（词典与目录同步）。

### 验证

- `npm run i18n`：zh / es / ru 三语言 **complete**；上游 i18n 测试 **110/110**
- 汉化门槛 **28/28**（补丁作为数据串层全量保留）；`npm test` **7804 / 7794 pass / 0 fail / 10 skip**
- `npm run build` ✓（15.79s）；`check:boundaries` ✓（`package-boundaries.json` 按 es/ru 既有模式登记 zh.json 43 处）；`format:check` ✓（1426 文件）
- 浏览器实测（puppeteer + dist）：默认启动 `lang=zh` 界面中文、`?lang=en` 英文、`?lang=ru` 俄文
- localePicker 测试夹具按第四个语言更新（排序断言 + End 键落点）
- 目录构建管线可重跑：`.workbuddy/i18n-migration/`（build-seed → translations 10 碎片 → merge-catalog 终验 missing 0 / stale 0 / errors 0），同步自动化后续按 Stage 4 走 `npm run i18n` 增量

## zh-1.9.1 — 2026-10-19

**同步上游原生 i18n 设施**（267 个上游提交，558 文件 +40015/-9721）。上游本轮是架构级变更：新增 `src/i18n/` 国际化设施（`t()`/`tn()`/`msg()` 标记函数、es/ru 语言目录、locale 选择器、`scripts/i18n.mjs` 目录同步脚本、`docs/I18N.md`），并把语音卡片、太空任务面板、军事情报面板、洪水事件面板等模块模板里的原始字面量全部包进 `t()` 调用（如 `>${t('AI AGENT')}<`）。**对运行时注入式补丁的影响**：`t()` 在无 zh 目录时返回英文，DOM 仍是英文 → MutationObserver 补丁照常翻译，26 道动态串门槛测试全绿可证覆盖率未退化。

### 新增

- **`ACQUIRING FRAME`**（CCTV 帧加载占位文案，`layer-panels.html` 新增 `data-i18n` 元素）— 「正在获取画面」，与既有 `ACQUIRING SURFACE`/`ACQUIRING REGIONAL NEWS` 口径一致。

### 门槛校准（非覆盖率退化，是测量适配）

- **内嵌 HTML 门槛自检重建**：采集器只认模板里的原始字面量，上游迁移后提取量 101 → **11 条**（全部在 `src/hud.js` 的 HUD 遥测读数，且全部已译）。三道自检相应改为：条数下限 `>60` → `>5`；已知模块 5 个 → `['src/hud.js']`；哨兵只留 `TOP SECRET // SI-TK // NOFORN`（迁移前两外层的活体样本已不存在，三层提取逻辑保留防回退）。反向验证：破坏 `TOP SECRET` 词条 → 精确报红 `src/hud.js`；删 `ACQUIRING FRAME` → 静态门槛精确报红。
- **依赖漂移硬信号命中**：`package-lock.json` 变更（124+/124-）→ 已 `npm install`。

### ⚠ 新战场（本轮未开垦，建议单开一轮）

- **`t()` 标记串是全量文案的新度量衡**：`scripts/i18n.mjs` 同款提取器实测 src/ 下共 **2315 条** `t()/tn()/msg()` 标记，补丁 lookup 命中 **883**，字面未译 **1432**——但其中含大量 `{placeholder}` 插值串（最终渲染形态多被既有动态规则覆盖，字面 lookup 查不到属预期）与刻意保留的专有名词/数据串。真实缺口需占位符感知的探针逐模块实测，规模远超同步自动化职责。
- **战略选项**：上游 `src/i18n/locales/` 已支持 es/ru 目录，未来可评估把词典迁移为上游原生 `zh.json` 目录（883+ 已译串可机械转换），从「DOM 注入补丁」转为「原生语言包」——这是项目级决策，本轮维持补丁路线不变。

### 验证

- 汉化门槛 **28/28**；静态覆盖 **418/418**（上游 +1 `ACQUIRING FRAME`）；内嵌 HTML **11/11**
- `npm test` **7777 / 7767 pass / 0 fail / 10 skip**；`npm run build` ✓（36.27s）；`check:boundaries` ✓
- 词典 1124 → **1125**（+1）、规则 **224**（不变）、门槛 **28 例**（不变）
- 附记：zh-1.9.0 之后有一笔未记版本的中间提交 `7c76a00`（2026-10-16，geo-import 文件选择器 3 词条，词典 1121 → 1124），本轮一并并入记录。

## zh-1.9.0 — 2026-10-15

**同步上游 KartaView 街景数据源**（`providers/kartaview/`，98 个上游提交，106 文件 +11089/-1389）。上游为街景图层接入第二个免密钥数据源 KartaView：新 provider 全套（source/policy/decode/panorama/viewer）、线覆盖 `lineCoverage.js`、序列锥体 `sequenceCones.js`、SINCE 滑块下的 `sinceNote` 标注、NYC DOT 摄像头源（服务端）、Ion→Bing 影像直连。静态门槛首跑全绿（上游只往模板加了一个空的 `<small id="sl-since-note">` 占位）；diff 串扫描 + vm 探针实测出 **33 条未译动态串**，全部补齐。用例形态全部从上游源码**实测**取得（policy/source 消息常量、viewer 的 alt/aria-label、presentMeta 复合拼接点），再经 `probe-lookup.mjs` 复核。

### 新增

- **policy.js 覆盖提示与消息 7 条** — `zoom in to see KartaView coverage`、`no KartaView photos in view`、`Point the camera at the globe…`（hint 三态，经 `coverageStats().hint` → presentMeta 明细行）；限流常驻提示、归档/过滤两种 `nearestImage` 结局（throw → `street.error`）。
- **source.js 照片 API 错误 7 条** — 超时/断网/不可读/数据过大/无此照片/无位置/限流，经 `street.error` 明细行与 toast 渲染；`KartaView answered HTTP ${status}` 走新规则。
- **限流三形态的拆译** — 覆盖 429 独立串 `KartaView is rate-limiting requests`（它同时是既有 `/^(.+) — try again in a moment$/` 规则的前缀捕获段，必须能独立查到，否则复合串整条放弃）、policy 常驻提示整串词条、照片 API 429 复合靠前缀 + 既有规则译出。
- **viewer.js 6 条** — onReopen 失败 toast、open() 竞态（同 Google viewer 的 `street.error` 路径）、img `alt`、根 `aria-label`（含 ← → ↑ ↓ ° − 特殊字符，字节级核对后收录）、序列步进按钮 `title`/`aria-label` 两条。
- **presentMeta 复合串** — kartaview 的 `coverageLabel = {noun: 'streets', action: 'click a line for its nearest photo'}`：新增 `/^([\d,]+) streets in view$/` 规则（区别于 Mapillary 默认的 `sequences`），action 整串词条；单段、两段、三段复合形态全部锁进门槛。
- **`sinceNote`（本轮上游新增 UI 元素）** — `uiState.js` 拼 `${names.join(', ')}: by upload date`，单/多数据源两形态同一条规则（provider 名保留原文）；模板里新增的 `<small id="sl-since-note">` 初始为空，不占静态覆盖条数。
- **sequenceCones / lineCoverage / imagery 各 1 条** — `Sequence images unavailable`（toast）、`Coverage tile failed`（lastError 兜底）、`Ion world imagery did not return a Bing imagery endpoint`（ion 源无 `constructionFallback`，错误经 `controller._onError` 直达错误提示）。

### 刻意不译（逐条追调用链确认）

- `Street Level viewer has no host element` — kartaview viewer.js mount 入参守卫：`viewerHost.open()`/`prewarm()` 已先判 `state.street.host`，同 Google viewer 轮结论（该断言已在 Google 测试里，不重复）。
- `WebGL is unavailable` / `Panorama program failed to link` — panorama.js 建渲染器失败被 viewer.js 的 catch 吞掉并置 `rendererFailed` 走 2D 兜底，到不了面板。
- CCTV NYC 批（`Staten Island`/`New York`/`NYC DOT Traffic Management Center`/`Public NYC DOT…`/`NYC Camera`）— 城市/服务商/许可/兜底名全是数据字段，与 Calgary/Fintraffic 等既有摄像头数据不译的口径一致。
- `dataCredits.js` 的 `NYC_DOT_DISCLAIMER` 与 nyc-cctv html — 署名法律文本，既有 28+ 条 credits 条目均未译，口径一致。

### 验证

- 汉化门槛 **28/28**（新增 KartaView 测试：36 正向用例 + 6 不译断言）；探针 36 条 = 33 命中 / 3 刻意不译
- 反向验证 3 次全部精确报红（破坏词条 / streets 规则改永不匹配露出半译形态 / 给 panorama 串加词条触发不译断言），每次先 `node --check` 确认破坏生效
- `npm test` **6560 / 6550 pass / 0 fail / 10 skip**（上游本轮修复了 `codexOauthRealtime.test.mjs` 的 win32 路径断言，此前恒有的 1 个平台缺陷 fail 已消失）；`npm run build` ✓（26.77s）；`check:boundaries` ✓；`format:check` ✓（1340 文件）
- 词典 1096 → **1121**、规则 221 → **224**、门槛 27 → **28 例**

## zh-1.8.0 — 2026-10-14

**同步上游 Google 街景数据源**（`providers/google/`，18 个上游提交，62 文件 +4547/-177）。上游为街景图层接入 Google Street View：新 provider 全套（mapsLoader/viewer/policy/groundClick）、`OPEN STREET VIEW` 键盘入口按钮、`keySetupWithAlternatives()` 密钥替代引导、`unlocks` 文案更新。

静态门槛首跑即报红（`OPEN STREET VIEW` 未汉化，1/413）；diff 串扫描 + vm 探针实测出 33 条未译（含多条既有欠账），全部补齐。用例形态全部从上游模块**实测**取得（直接 `import()` 调 `keySetupWithAlternatives()` / `presentNearest()` / policy 常量还原真实拼接），再经 `probe-lookup.mjs` 复核期望值。

### 新增

- **`OPEN STREET VIEW` 按钮全链路** — 模板占位文本 + 运行时 `OPEN ${labels}` 覆盖形态（`OPEN GOOGLE STREET VIEW`、多源 ` / ` 连接）；title 两态（`Open … at the centre of the view` / `Zoom in to a street to open … here`）；`hintFor()` 的小写 hint 形态。label/name 是品牌名保留原文，只译动词（与 chip `GOOGLE STREET VIEW ↗` 保留原文的既有口径一致）。
- **google/policy.js 三条消息常量** — 密钥被拒 / 超时无响应 / 地面点击提示。密钥被拒那条同串渲染三处（`street.error` 明细行、chip title、`reportError()` toast），词条一处生效。
- **mapsLoader / viewer 的 reject 消息 5 条** — `GOOGLE_MAPS_API_KEY is not set`、`The Google Maps JavaScript API could not load`、`Street View has no imagery for this place`、`Street View was unmounted`、`Street View is not mounted`。前两条与后三条经 `viewerHost.open()` 的 catch 写进 `street.error` 渲染到面板，是真可见串。
- **`keySetupWithAlternatives()` 引导串**（本轮上游新增函数）— `Needs X — add it in Provider Settings, or light LABEL to use your Name key` 复合形态（可 `, or ` 叠加多个）与 requirement 为空时的 `Light LABEL …` 首字母大写形态。新增 `trAlternatives()` 辅助函数统一解析 offer 段，任一子段译不出整条放弃（防半译）。
- **`unavailableReason()` 地图源提示** — `X needs the Google 3D map: choose it under MAP SOURCE`，术语与既有 `Camera follow needs…` 一致（「地图源」）。
- **`openNearest()` 无影像兜底** — `No street-level imagery within 50 m of that point|the view centre`（两分支封闭枚举写进正则）。
- **`Aim the middle of the view at a street…`** — 瞄准天空时的 `street.error`。
- **密钥面板 `unlocks` 全集 10 条**（`keySetup.js` 直接 `textContent` 渲染）— 本轮 google-maps 那条被上游改文案（+ Street View），其余 8 条是既有欠账（仅 cesium-ion 的早已收录），一并补齐。

### 清欠（既有欠账，本轮顺手）

- **`click a line for its photos`** — presentMeta 三段复合串的第二段，自上游 `2dbc684`（街景层重命名）起缺词条，导致整条明细行半中半英（`视野内有 2,514 条序列 · click a line for its photos · …`）。本轮 diff 触及该拼接点被扫出。
- **viewerHost.js 三条** — `Open the Street Level panel to view imagery`、`Image could not be opened`、`Street-level viewer was closed`（自 `28e6a1f` / `6207e41` 起就是英文）。

### 刻意不译（逐条追调用链确认）

- `Street Level viewer has no host element` — viewer.js mount 入参守卫：`viewerHost.open()` 已先判 `!state.street.host` 并改设自己的兜底串，`prewarm()` 的 catch 直接吞掉，两处都到不了面板。
- `Google Street View needs getApiKey` — `createGoogleProvider` 的装配期 TypeError（constructCatalog 抛出，应用起不来），同 2026-10-12 那批构建期守卫的口径。
- `GOOGLE STREET VIEW` / `Google Street View` / `GOOGLE STREET VIEW ↗` / `MAPILLARY ↗` — 数据源品牌名与链接标签，与既有 `MAPILLARY` 保留原文口径一致。

### 门槛强化

- 新增测试 **`Google 街景数据源动态串必须译出`** — 40 条正向用例 + 6 条不译断言。汉化门槛 26 → **27 例**。
- **`Light aircraft` 碰撞防护**：`keySetupWithAlternatives` 的 `Light LABEL…` 与飞机分类标签（`aircraftClass.js` 的 `light: 'Light aircraft'`）同为 Light 开头。规则用全大写字符类收窄句式，并加断言锁住「宽规则不得搅进分类标签」——反向验证③实测：把规则改成 `/^Light (.+)$/` 后 `Light aircraft` 立即被误译成「点亮 aircraft」，确证收窄正则必要。
- 反向验证 3 次全部精确报红：① 改坏 `GOOGLE_MAPS_API_KEY is not set` 词条 → 报红；② `Light` 规则改永不匹配 → 报红；③ 规则改宽 → 正向用例半译报红 + 探针实测 `Light aircraft` 被误伤。每次破坏后先 `node --check` 确认语法有效再跑。
- 实测数字：词典 **1073 → 1096**（+23）、规则 **212 → 221**（+9）；静态模板覆盖 **413/413**（上轮 412，本轮上游 layer-panels.html 新增 `OPEN STREET VIEW` 按钮 → +1）、JS 内嵌 HTML **101/101**；探针 46 条候选：**39 命中 / 7 刻意不译**。
- 依赖：`package.json` 只新增 1 条 `exports` 映射（google provider 子路径），`package-lock.json` **未变** → 无需 `npm install`。
- QA 脚本：`qa-street-level.mjs` 大幅扩充（+329 行，Google 街景 fixture 路径），但其英文 pin（`gev-lang=en` 经 `boot()` 的 `evaluateOnNewDocument`，第 389 行）覆盖所有 `newPage()` 路径（主页面 + keyless 第二页面都走 `boot()`），无需补 pin。`qa-gbfs-names.mjs`（新增）只断言 API JSON 字段，不碰 DOM 文案。
- 新坑记录：**门槛「词典无重复键」的扫描区块从 `var DICT = {` 一直延伸到动态串规则注释**，其键提取正则会认任何「引号对 + 冒号」形态——新增辅助函数若落在该区块内，代码或注释里都不能出现「空字符串紧跟冒号」的写法（本轮 `trAlternatives` 的注释初版就踩中，被当成空键报重复）。

## zh-1.7.1 — 2026-10-12

**路径规划图层清欠专轮**（zh-1.7.0「已知欠账」清单的第一项）。这批文案自上游 `d78696d`（2026-09-14，#564 无密钥路径规划）引入起就是英文，潜伏近一个月——载体是**第三片盲区**：`directionsRowControls()` 等纯函数只造对象字面量，`chipGroup.js` / `rowList.js` 逐节点 `set(textContent/title)` 赋值，既无 HTML 模板也无反引号标记，静态门槛与内嵌 HTML 门槛都扫不到。

用例形态全部从源模块**实测**取得（直接 `import()` 调 `instructionFor()` / `directionsRowControls()` / `directionsStats()` / `directionsStepCopy()` / `pointerBlockedMessage()` 枚举真实输出，共 38 种指令骨架 + 8 芯片三态 + 全部复合形态），不是手抄猜写。

### 新增

- **模式与端点芯片** — `DRIVE`/`WALK`/`BIKE`（驾车/步行/骑行）、`SET A`/`SET B`/`CLICK MAP`、`FLY`/`FLYING`/`FLY ···`。`A ✓`/`B ✓` 确认态刻意不译（✓ 符号 + 端点代号）。`CLEAR` 走既有 `CONTEXT_WORDS` 容器消歧（按钮=清除），不动词典。
- **芯片 title 悬停提示 14 条** — 含 `${word} — reroute for ${word}` 三态复合、放置/交换/飞行/清除、`Then click the globe to place the start|destination` 双形态。
- **逐向导航指令 38 种骨架**（`src/data/routeSteps.js` 的 `instructionFor`）— 归并为「动词短语」+「onto 道路名」两段规则；道路名是开放域专有名词，过 `tr()` 查不到就保留原文（`Turn left onto Main St` → `向左转，进入 Main St`）。带 `Name (Ref)` 复合形态（`US 101 (US-101)`）实测覆盖。
- **步骤列表与卡片** — `Turn-by-turn directions`、`Only the first N turns…`、`Step N of M`、`Then: …`、`then 300 m · 2 min` 明细段。
- **路线摘要与状态串** — `Routing…`/`Routing timed out`/`Routing unavailable`（含 `(HTTP nnn)` 与 `— no response` 形态）、`No route found between A and B`、`Another map tool is using clicks…`、`OSM routing`（→ OSM 路径规划）、coverage 引导串 `SET A, then click the globe` 等。
- **服务端路由代理错误 9 条**（`server/providers/places/routes.js`，经 `payload.error` 透传）— `no route found`/`invalid profile`/`invalid coordinate`/`need 2-12 coordinates`/`route leg too long`/`route too long`/`route proxy error`/`rate limited`/`routing service is rate limited`/`routing busy…`，及 429 复合 `X — try again in a moment` 与 `Routing failed: X` 透传规则。
- **pointerBlocked toast** — `<name> is active — <leave>, then set <A|B>` 整串规则；已知 owner=draw（`press Escape twice to leave Draw`），未知 owner 走 `turn <id> off` 兜底（id 保留原文）。

词典 **1034 → 1073**（+39，其中 6 条为 429 片段/独立 fallback 形态），规则 **179 → 212**（+33）。

### 修复与发现

- **复合串被 em-dash 规则「先斩后奏」的半译链**：`UNAVAILABLE · OSM routing · Routing is rate limited — try again in a moment` 这种三段复合，会被 `— try again in a moment` 规则在 `translateSegments` **之前**接住，捕获组拿到的是 `UNAVAILABLE · OSM routing · Routing is rate limited`——`trKeep` 内部的 `lookup` 把前两段译了，但第三段 `Routing is rate limited` 作为**片段**没有词条 → 产出「不可用 · OSM 路径规划 · Routing is rate limited — 请稍后再试」。修法：给片段补独立词条。这个模式记进了技能（4j 补充）：**复合串里以 em dash 收尾的段，其前半片段也要能独立查到**。
- **`Continue onto X` 无方向修饰 ≠ `Continue straight onto X`**：`new name` 机动类型产出的是裸 `Continue onto X`（实测），语义是单纯「继续」而非「直行」——初版断言写错，靠探针实测纠正。
- **`A ✓` 加词条是死词条**：`dictOnly` 的 `[A-Za-z]{2,}` 守卫使单字母串永远进不了词典。这是结构性保护（短标签不误译），相应断言注明是弱断言，真正的防线是「没人给它写规则」。

### 门槛强化

- 新增测试 **`路径规划图层：chips / 步骤指令 / 状态串必须译出（第三片盲区清欠）`** — **80 条用例**全部取自源模块实测形态，含 3 条开放域道路名保护断言（`onto Cedar Ridge Road` 保留原文）与 2 条不译断言。汉化门槛 25 → **26 例**。
- 探针全集 98 条：**96 命中 / 2 刻意不译**（`A ✓`/`B ✓`）；6 条「译文含英文」判读项全部为道路名/内部 ID/HTTP 码（专有名词，正确保留）。
- 反向验证 3 次全部精确报红：删 `SET A` 词条 → 报红；`Turn` 规则改永不匹配 → 报红；`A ✓` 死词条实验证实 `dictOnly` 守卫后还原（该方向的反向验证以「结构性不可达」结案，非断言失效）。
- 浏览器 QA 碰撞排查：`qa-directions.mjs` 断言读的是 `module.getRowControls()` 模块对象**非 DOM 文本**，汉化层够不到 → 无碰撞。其余手动 QA 脚本断言的串全是历史词条（`KEY REQUIRED` 2026-10-09 / `Mapped installations` 2026-09-02 / `Select a box…` 2026-09-28），本轮零新增碰撞。CI 只跑已 pin 的 street-level/panel-resize 两个。
- 三道补全前核查记录在案：候选词（含小写 drive/walk/bike/fly/map/swap/set）全部不在 28 个 material-symbols 图标连字清单里；小写形态 grep 确认不作可见文本；`SWAP`/`MAP` 既有词条属近期影像/地图源语境，大小写与语境均不撞车。
- 验证：门槛 **26/26**；完整 `npm test` **6269 / 6258 pass / 1 fail / 10 skip**（那 1 个 fail 仍是上游 win32 平台缺陷 `Codex login…`，非汉化回归）；`build` ✓（26.75s）；`check:boundaries` ✓；`format:check` ✓（1307 文件）。

### 已知限制（本轮明确不处理的）

- **canvas 卡片的 `Step N of M · then …` / `Then: …`**（`createDirectionsStepOverlayEntry` → `worldOverlayDraw.js` 的 `fillText`）：overlay 系统是 canvas 绘制，MutationObserver 抓不到任何文本节点——这是运行时 DOM 注入方案的**硬边界**，规则已备好（list 载体走 `rowList.js` 进 DOM，能译），canvas 卡片只能保持英文，除非上游改用 DOM 卡片。
- zh-1.7.0 清单剩余欠账：近期影像 `notes()`/`guidance()` 3 条 + AIS 首连提示 2 条（规模小，下轮同步顺手补）。

## zh-1.7.0 — 2026-10-12

同步上游 23 个提交（50 文件，+1337/-145）后的汉化补全。上游无冲突，汉化补丁文件独立。**本轮上游主要内容是数据源可用性重构（#982–#986）**：把「数据源没配置」与「数据源返回空数据集」区分开，新增 `src/app/sourceComposition.js` 的 `CATALOG_SOURCE_CONTRACTS` 契约表与 `createAvailabilityLookup()`，把路径规划、近期影像的取数从应用装配里拆成可替换的 source 模块，并让街景图层的 provider 开关走稳定的 ID 编解码（`src/data/idSwitches.js`）进分享链接。

上游**未动任何 HTML 模板**，`package-lock.json` 也未变（`package.json` 只新增两条 `exports` 子路径映射）→ 无需 `npm install`。

### 新增

- **数据源可用性 reason 链路**（`src/app/sourceComposition.js` → `src/data/lifecycle.js` → `src/ui/layerPanel.js` / `src/ui/contextLayerChanges.js`）— 上游给每个消费图层的 `getSourceAvailability()` 造出 `reason`，`lifecycle.js` 的 `_normalizedStats()` 把它写进 `stats.error` 并置 `sourceUnavailable: true`，于是同一条 reason 会在**三处**渲染：图层明细行 `UNAVAILABLE · <source> · <reason>`、开关芯片的 `title`/`aria-label`（`String(layer.stats.error || 'Data source unavailable')`）、以及 `_visibilityBlockReason()` 返回后经 `contextLayerChanges.js` 的 `showToast()` 弹出的 toast。补齐 `Data source unavailable`（数据源不可用）、`No street-level imagery providers configured`（未配置任何街景影像数据源），以及 reason 的两种复合形态：`${layer.name}: data source not configured`（图层名走词典，故捕获段用 `tr()` 而非 `trKeep()`，避免某个图层名恰好缺词条时整条规则放弃）与 `Data source not configured: ${name}`（`${name}` 是 `CATALOG_SOURCE_CONTRACTS` 的内部 slug，保留原文；该串会被近期影像的 `notes()` 拼成 `${label} catalog unavailable · ${error.message}` 透传，故必须能独立查到）。
- **`PARTIAL` feed 徽标**（`src/ui/layerPanel.js` 的 `FEED_STATE_LABELS`）— 长期缺失的既有欠账：该表有 7 个状态，其余 6 个（`ON`/`LOADING`/`DEGRADED`/`STALE`/`FALLBACK`/`UNAVAILABLE`）都在词典，唯独 `partial` 漏了，芯片因此显示英文 `PARTIAL`。小写 `partial` 经 grep 核实只作 `layerFeedState()` 返回值与 CSS class，不作可见文本渲染，`dictOnly` 大写兜底不会误伤。
- 词典从 1031 条扩充到 **1034 条**（+3），动态串规则 177 → **179 条**（+2）。

### 门槛强化

- 新增测试 **`数据源可用性 / PARTIAL 徽标：#982–#986 新增的 reason 链路必须译出`** — 10 条正向用例全部取自源码真实拼接形态（含三条 `UNAVAILABLE · <source> · <reason>` 复合明细行），外加 `PARTIAL · Live Vessels · 12 of 40 records accepted · 3m ago` 的正向对照（确认 `translateSegments` 逐段命中，而非 `lookup` 整体失灵造成的假绿）。
- 内置**刻意不译清单** 6 条：`Catalog sources must be an object` / `Source overrides must be an object` / `Invalid boolean switch IDs` / `Directions require a route source` / `Street Level providers must be an array` / `Street Level provider IDs cannot fit in the 256-character share-link field…`。逐条追过调用链确认它们是**构建期守卫**（`resolveCatalogSources()`、`createStandaloneLayerSources()`、`encodeIdSwitches()`、`validateProviders()` 的入口断言），没有任何 UI 层 `try/catch` 接住它们渲染成 toast 或状态行，只有开发者在控制台与测试里看得到。若哪天上游把它们接进 UI，这条断言会报红提醒重新评估可见性。
- 汉化门槛测试从 24 例增至 **25 例**。静态模板覆盖维持 **412/412 = 100%**，JS 内嵌 HTML 覆盖维持 **101/101 = 100%**（上游本轮未动模板、未新增 innerHTML 模块；两个条数均由采集函数实测打印得出，其中 412 修正了上一版记录里误写的 413）。
- 三次反向验证全部精确报红：删 `PARTIAL` 词条 → 报红指出该条；把 reason 规则改成永不匹配 → 报红；给构建期守卫串加词条 → 「刻意不译清单」断言报红。

### 已知欠账（本轮扫出，未处理）

- **第三片盲区：chips 经纯函数对象 + `set(node, 'textContent')` 逐节点构建，静态门槛与内嵌 HTML 门槛都扫不到。** `src/ui/chipGroup.js` 用 `set(button,'textContent',chip.label)` / `set(button,'title',chip.title)` 赋值，没有任何 HTML 模板或反引号标记可匹配。受影响的是**路径规划图层的整套 chips 文案**（`DRIVE`/`WALK`/`BIKE`、`SET A`/`SET B`/`CLICK MAP`/`A ✓`/`B ✓`、`FLY`/`FLYING`/`FLY ···`、`Swap A and B`、`Fly the camera along the route`、`Place A and B first`、`Remove the route and both markers`、`Then click the globe to place the start|destination`、`Click a spot on the globe to place A|B (click again to cancel)`、`Turn-by-turn directions`、`Only the first N turns of this route are shown`、`Step N of M · then …`、`Then: …`，以及 `${word} — reroute for ${word}` 与 `Routing…`/`Routing timed out`/`Routing unavailable (HTTP nnn)`/`No route found between A and B` 等状态串）。
  - **这些是既有欠账，不是本轮引入的退化**：`directionsRowControls()` 自上游 `d78696d`（2026-09-14，#564 无密钥路径规划）引入起就是英文，因本轮 diff 触及 `src/layers/directions/` 才被 `scan-diff-strings.mjs` 扫出。
  - 未在本轮补的原因：需要新增一个采集器（扫对象字面量的 `label`/`title`/`text`/`ariaLabel`/`details` 等可见键）+ 逐条核对小写碰撞与图标连字（`fly`/`map`/`swap`/`set` 都是常用词），规模与风险都超过同步自动化的职责范围，适合单开一轮人工专做。工作产物 `.workbuddy/scan-row-controls.mjs` 已能枚举全部候选（含三元表达式两个分支），可直接接着用。
- **近期影像面板的 3 条 notes 与 AIS 首连提示**同为既有欠账：`Catalog truncated · a newer clear day may exist`、`Daily overview for today may still be empty until the pass`、`Imagery catalog unavailable`（`src/layers/recentImagery/index.js` 的 `notes()`/`guidance()`，经 `src/ui/recentImagery.js` 逐行 push 进面板）、`awaiting usable AIS positions…` / `awaiting first AIS message…`（`src/layers/vessels/lifecycle.js`、`queries.js`，进 `stats.error`）。已在 `9128f6e` 存在，同样适合并入上述专轮。

## zh-1.6.0 — 2026-10-09

同步上游 22 个提交（33 文件，+2491/-38）后的一轮汉化补全，同时补上 2026-10-08 合并（`fd1288c`，街景图层）遗留的欠账。上游无冲突，汉化补丁文件独立。**本轮上游主要内容是 ChatGPT/Codex OAuth 语音认证（#621，实验性）与矢量瓦片原点跟随 TileJSON 配置（#933/#935）**。本轮真正的重头戏是发现并堵住了覆盖率门槛的**第二片结构性盲区**。

⚠ 本轮与 origin 上已发布的 **PR #1（`1bcb13a` + `299582c`，2026-10-08）撞车**：那个分支已经补过街景面板的 26 条静态词条，并给 `qa-street-level.mjs` / `qa-panel-resize.mjs` 两个浏览器门槛 pin 了英文。处理方式见「同步记录」与「排错教训」，最终 26 条**以 PR #1 的译法为准**，本处只补它没覆盖的动态串与其余模块。

### 新增

- **街景图层的动态串与补充词条**（`src/ui/streetLevelPresentation.js` + `src/layers/streetLevel/index.js`）— 静态部分（`STREET LEVEL`/`EXPAND`/`FIT`/`FILL`/`ALL`/`SINCE` 等 26 条）已由 PR #1 收录，**不重复添加**（重复键会让后者静默覆盖前者）。本处补的是 PR #1 未覆盖的部分：状态芯片（`KEY REQUIRED`/`KEY REJECTED`/`loading coverage...`）、开关 title 的另两种形态（`Turn Street Level on|off`）、SINCE 九个档位（`ANY DATE`/`LAST MONTH`…`LAST 10 YEARS`/自定义 `LAST N DAYS`）、数据源 chip 动态 title（`Mapillary imagery on|off`、密钥缺失与错误透传形态）、覆盖统计（`N images in this sequence`、`N sequences in view`）、`Image by ${creator}` 署名、`SHRINK`、`Street-level image`、相机跟随不可用提示。用词跟随 PR #1 已发布的译法（`FIT`=适应 / `FILL`=填满 / photo=照片 而非图像）。
- **ChatGPT OAuth 语音认证**（本轮上游 #621，`src/keySetup.js` + `src/voice/cloudVoiceAuth.js` + `src/voice/realtimeCost.js`）— 认证方式切换控件（`VOICE AUTH · API KEY|CHATGPT OAUTH`、`USE API KEY`/`USE CHATGPT OAUTH` 及 title）、登录流程全部状态行（检查中/过期重登/浏览器等待/超时/完成等 12 条）、费用读数 `COST UNKNOWN` 与 OAuth 用量 title 复合串（响应数/令牌数/字幕转写数）、模型档位提示（`Next session: … — this session stays on …`、`Voice model: … — click to switch to standard; applies next session`、`STANDARD|MINI applies next session`）、`Save failed (nnn).` 与透传型 `OAuth check failed: ${message}`。
- **OAuth 服务端错误消息 17 条**（`server/providers/openai/codex-auth.js`、`realtime.js`）— 这批消息经 HTTP 响应体 `payload.error` 透传进浏览器状态行（`say(payload.error || '…')`），必须自己有词条，否则复合规则 `trKeep` 译不出会让整条放弃、操作员看到完整英文长串（zh-1.5.0 的 `TomTom flow timed out` 同款模式）。含本机限制三条（`ChatGPT OAuth is available only from this machine` 等）、跨源拒绝、存储路径不匹配、Codex 未安装、登录超时/未完成、auth.json 无可用令牌等。
- **语音助手卡片**（`src/voice/control.js` 用 **innerHTML 内嵌 HTML**，自 2026-09-15 语音核心引入起就是英文——见下文盲区）— 卡片骨架全部文案（`VOICE`/`YOU`/`GEV`/`THIS`/`HERE`/`NOTES & SOURCES`/`VOICE SYSTEM ERROR`/`DISMISS`、aria-label 五条）、步骤状态（`, done`/`, failed` 等带前导逗号的拼接形态）、步骤标签（`STEP_LABELS` 七条 + `progressStepLabel` 的 `${base}: ${label}` 复合形态）、计划步骤（`Mark ${place} +N`/`Fly to ${place}`/`Nearest ${noun} to ${place}`）、结果标题（`View state`/`Nothing marked`/`Marked N places`/`${count} ${noun} in frame`/`Frame ${target}`/`${label} on|off`）、明细行（`Within N km of the view`/`Altitude N feet`/`N km from ${place}`/`Camera range N km`/`Labels on`/`Source: ${label}`/`Not found: ${list}`）。
- **HUD 启动占位串**（`src/hud.js` 同为 innerHTML 内嵌）— `Awaiting telemetry...`、`PAGE 1/1`、`AIS: --`、`BAND: PAN`、`BITS: 11`、`LVL: 1A`、`GSD: --m  NIIRS: --`、`ALT: --m   SUN: --° EL` 等真实遥测到达前的占位文本。
- **尼泊尔洪水事件面板**（`src/data/bhoteKoshiEvent.js` 同为 innerHTML 内嵌）— `BHOTE KOSHI OUTBURST FLOOD` 标题、状态芯片（`OBSERVED IMAGERY`/`SCHEMATIC CORRIDOR`）、故事节拍导航、操作按钮六条（`▶ PLAY`/`◉ CINEMATIC`/`↺ FULL STORY` 等含符号前缀形态）、`FIELD REPORTS · N`、证据面包屑 `01 · ${title}`、云系说明与示意走廊 caveat。
- **军事目标情报面板**（`src/layers/awareness/panel.js`，markup 存变量再赋 innerHTML + 文案藏 `${cond ? 'A' : 'B'}` 插值——双层盲区）— `CONTEXT READY`/`GLOBAL CONTEXT OFF` 开关文案、导航控件（`PREVIOUS` 及两条 250 km 窗口 title）、`Named areas (N)`、开源证据免责长句。
- **太空任务面板控件提示**（`src/layers/launches/panel.js`）— `Show all missions`/`Previous mission`/`Next mission`/`Deselect mission`/`Replay speed multiplier` 等 title/aria-label，`+N additional payload records` 溢出计数。
- **图层显示名 13 条**（`layer.name` 与 `layerPanel.js` 的 `PANEL_LABELS`）— `Live Vessels`/`Bike Share`/`Cameras`/`Street Level`/`Mapped ALPR Cameras`/`Data Centers`/`Active Fires`/`Fire Perimeters`/`Earthquakes (24h)`/`Directions`/`Satellites`/`Transit`/`Wind`。图层名同时是语音卡片 `${label} on|off` 规则的前件（trKeep 严格匹配），缺词条会连带整条复合串放弃。
- **面板拖拽调宽提示**（`src/ui/panelPositionControls.js`）— `Drag to resize · double-click the header to snap back`。
- 词典从 841 条（zh-1.5.0）扩充到 **1031 条**：其中 26 条来自 PR #1，**本轮净增 164 条**（相对 PR #1 基线 867 实测）。动态串规则 139 → **177 条**（+38，全部为本轮新增，PR #1 未动规则）。

### 修复（一处真 bug + 一片从未被扫到的盲区）

- **尾随分隔符标签串整串漏译（真 bug，合并前就存在）** — 太空任务面板把字段写成 `STATUS · <b>值</b>`，标签文本节点是 `'STATUS · '`（带尾随空格）。`lookup()` 开头 `trim()` 把空格吃掉后 `' · '` 不再完整，`translateSegments` 的分隔符检测够不着，整串原样留在界面上——7 个字段标签全是这个形态，用户长期看到「STATUS · 正常」半英半中。修法：`lookup()` 单开尾随分隔符分支，只译标签部分，分隔符与尾随空白原样保留（那个空格是 `<b>` 前的排版间距）。已反向验证：禁用该分支 → 7 条全部退回原文 + 新门槛精确报红。
- **覆盖率门槛的第二片结构性盲区：JS 内嵌 HTML 模板** — 静态门槛只扫 `src/ui/templates/*.html`，但上游有 5 个模块把整块面板标记写成 JS 里的 innerHTML 模板字符串（语音控件/HUD/太空任务/军事情报/洪水事件），共 **101 条可见文案**，门槛一条也扫不到。语音卡片自 2026-09-15 引入起就是英文，欠账潜伏 3 周多，期间门槛一直全绿。军事情报面板更是双层盲区：markup 存变量再赋值（匹配不到 `innerHTML = \`` 形态）+ 文案藏在 `${cond ? 'A' : 'B'}` 插值里（标签间文本正则刻意排除 `{}`）。本轮全部补齐并固化为新门槛（见下）。
- **新增 `'ALL'` 等短词前按纪律做了撞车核查** — 电台调谐器复合串 `ALL · DRAG THE NEEDLE` 整串在词典（dictOnly 精确匹配优先，不会退化）；小写 `all`/`fit`/`fill`/`flat`/`done` 等经 grep 确认不作为独立可见文本出现（大小写兜底不会误伤）；Material Symbols 图标清单 32 个连字与本轮新增词零重合，JS 动态换图标处（`cockpitLayout.js` 的 chevron/right_panel 系列）也不在新增词内。防御性把这批常用词全部加进图标保护测试清单（21 个新词，清单 18 → 39），DOM 容器拦截验证有效。
- **本轮上游新增的语音 QA 脚本会被汉化覆盖层绊倒（PR #1 同类问题的延续）** — `scripts/qa-voice-auth.mjs:215` 断言 `meter.text === 'COST UNKNOWN'`，而本轮正好把 `COST UNKNOWN` 译成了「费用未知」，汉化层默认激活会改写这个 DOM 文本使断言失败。已按 PR #1 确立的模式给它 `evaluateOnNewDocument` pin `gev-lang=en`，且遵循 `299582c` 的教训把 pin 紧跟 `newPage()`（不能放在预置 goto 之后）。**注意它是手动运行的 QA 脚本，不在 CI、也无 npm script 入口**（CI 的浏览器门槛只有已 pin 的 street-level / panel-resize 两个），所以不修也不会让 CI 变红——但留着就是一次手动排查的坑。同批的 `qa-voice-auth-focus.mjs` 断言全是布尔与选择器匹配、`activeLabel` 只进 diagnostic 日志，不受翻译影响，未改。

### 门槛强化

- 新增测试 **`JS 内嵌 HTML 文案 100% 覆盖（静态门槛的第二片盲区）`** — `collectInlineHtmlStrings()` 扫 `src/` 全部非测试 JS 中含 HTML 标签的反引号模板（不按赋值形态匹配，覆盖变量间接），提取 title/text/placeholder/aria-label 四类 + 插值三元字面量一层。内置**三道防假绿自检**：①提取条数下限 > 60；②5 个已知模块必须都被扫到（防「一个文件都扫不到 → missing 恒空 → 假绿」）；③三层盲区各留哨兵串（直接模板/变量间接/插值三元）做正向对照。三道自检都做过反向验证：删词条 → 精确报红指出文件与串；采集器退化成只认直接赋值 → 自检②报红；禁用三元层 → 哨兵断言精确报红。
- 新增测试 **`尾随分隔符标签串（太空任务面板字段）必须译出`** — 7 条 `'LABEL · '` 形态 + 尾随空白保留断言 + 幂等（写入恰 1 次）+ 反向对照（不带尾随分隔符的复合串仍走 translateSegments 行为不变）。
- 新增测试 **`街景 / OAuth 语音 / 语音卡片动态串必须译出`** — 44 条用例全部取自源码真实拼接形态。内置**刻意不译清单**做正向对照：语音 `say` 播报串（经 `realtimeProtocol.js:145` 编进模型 prompt，不进 DOM——译了反而破坏英文语境播报）与 MCP 工具 `title`（只被 `src/tools/mcp/protocol.js` 消费，UI 不导入）必须保持 `lookup` 返回 null，防止后人「顺手补全」造成过度翻译。
- 汉化门槛测试从 21 例增至 **24 例**；静态模板覆盖 **413/413 = 100%**（门槛首跑报红 26 条，全是 10-08 `fd1288c` 合并带入的街景面板文案：7 条 title + 11 条文本 + 8 条 aria-label，已全补）；JS 内嵌 HTML 覆盖 **101/101 = 100%**。
- 图标连字保护清单从 18 词扩到 **39 词**（新增 fit/fill/all/expand/follow/flat/since/shrink/voice/done/previous/plan/stage/cause/working/manage/notes/sources/dismiss/providers/imagery 共 21 个防御性用例），全部通过——本轮新增词虽暂无同名图标，但 `dictOnly` 大小写兜底会译小写形态，上游日后新增小写图标连字时这层拦截就是唯一防线。

### 排错教训

- **「门槛全绿」的盲区不止一片，而且第二片比第一片更深。** zh-1.5.0 已记录过「JS 现拼动态串」盲区（4f），本轮发现的是更底层的「JS 内嵌 HTML 模板」盲区——文案明明写在 HTML 标记里，只是标记本身在 JS 字符串里。判读方法：**grep `innerHTML` 比 grep 模板文件更根本**；采集器必须覆盖变量间接赋值与 `${cond ? 'A' : 'B'}` 插值两个形态，且要配「已知文件必须被扫到」的哨兵断言，否则采集器自身退化时门槛会以「零缺口」的姿态假绿。
- **把扫描候选当缺口清单直接补，会制造重复键。** 本轮曾把 4 条既有词条（250 km window 两条 title、Cancel/Pause replay）又加了一遍——探针当时明明报「已译」，我却照着扫描器的原始输出补。重复键虽被门槛抓住，但暴露了流程错误：**扫描器输出是候选，必须先过探针筛一遍再动手**。
- **修通用逻辑前先跑存量测试，别凭直觉写宽规则。** 第一版给裸 `N km`/`N feet` 写了规则，立即打爆「量词段不得波及单位数据」与「专有名词防过宽」两道存量门槛（`3.2 km` 是刻意保留的数据段）。正确姿势是把单位翻译写进带语境前缀的整串规则（`Within N km of the view`），存量门槛的断言就是设计意图文档，红了的瞬间先读测试注释再改规则。
- **Windows 下 `path.relative` 返回反斜杠** — 新门槛的「已知文件必须被扫到」自检第一次跑就全红，原因是期望值写的 POSIX 路径与 `src\voice\control.js` 不匹配。采集器输出统一 `split(path.sep).join('/')`。跨平台测试的哨兵断言要注意路径形态。
- **推送前必须查 `git ls-remote origin`，本地缓存会骗你。** 本轮准备推送时发现远程 `origin/main` 已经是 `16eb796`（PR #1 的 merge），而本地缓存还停在 `fd1288c`——另一个实例在前一天已经补过街景词条并修了 CI。直接推就会非快进被拒，或者更糟：强推覆盖掉别人已发布的修复。这是 MEMORY.md 里「守门纪律」第 3 条的实例（状态可能被并发实例改变），但过去只在 upstream 侧防过，**origin 侧同样要防**。
- **Git 自动合并成功 ≠ 词典没有重复键。** 双方在**不同位置**添加了同一批键，git 视为两处独立新增、干净合并、零冲突——但 JS 对象字面量里重复键会让后者静默覆盖前者。这次是门槛的「词典无重复键」测试抓住了 26 个重复键。合并别人的汉化提交后必须跑这道门槛，不能只看 merge 是否报冲突。
- **撞车时以已发布的译文为准，不要凭「我的译法更好」去改。** PR #1 的 `FIT`=适应 / `FILL`=填满 / photo=照片 已经推到 origin，我把自己的 `完整`/`铺满`/`图像` 全部删掉、跟随它的用词，并把自己规则里的 `图像来源` 同步改成 `照片来源`（规则译文与测试断言要一起改，否则门槛报红）。术语一致性比个人偏好重要，已发布的字符串是既成事实。

### 同步记录

- 守门检查：远程 `6be2559` vs 本地缓存 `95fa816` → 上游有更新，fetch 后落后 **22** 个提交、领先 22。
- 合并无冲突，merge 提交 `8d7fb93`（parents `fd1288c` + `6be2559`）。
- 依赖检查：`package.json` / `package-lock.json` **均未变** → 无需 `npm install`；**本轮上游未动任何模板**（`git diff fd1288c 8d7fb93 -- src/ui/templates index.html` 为空）。静态条数 387 → 413 的 26 条增量全部来自 10-08 那次 `fd1288c` 合并（该轮合并后没有跟汉化提交），本轮一并补齐。用 `90f2a45`（zh-1.5.0）的模板跑同一采集器实测得 387，与门槛首跑的 26 条缺口清单双向印证。
- 完整验证：`npm test` **6239 / 6228 pass / 1 fail / 10 skip**——唯一失败是本轮上游新增的 `src/codexOauthRealtime.test.mjs`（Windows 路径分隔符平台缺陷：期望 `/home/fixture/.local/bin/codex`，实际 `path.join` 在 win32 产出反斜杠路径）。**已用 stash 对照法确证与汉化无关**：暂存本 fork 全部改动后在纯 merge 状态跑同一文件，同样 7/8 通过 1 失败。属上游测试的平台兼容 bug，不在本 fork 修复范围。
- `npm run build` ✓（16.5s）；`check:boundaries` ✓；`npm run format:check` ✓（1303 文件，`scripts/qa-voice-auth.mjs` 受 format-scope 管辖，pin 改动已验证格式合规）；汉化门槛 24/24 全绿。
- **推送前的并发撞车处理**：准备推送时 `git ls-remote origin` 发现远程 `origin/main` 已是 `16eb796`（PR #1 的 merge 提交，本地缓存还停在 `fd1288c`）。先 `git fetch origin` + `git merge origin/main`（无冲突，git 自动合并），但门槛的「词典无重复键」测试立刻抓出 **26 个重复键**——PR #1 与本轮在不同位置各加了一份街景词条。以 PR #1 已发布的译法为准，删除本轮重复的 26 条、保留本轮独有的动态串与其余模块词条，并统一术语（图像→照片）。
- 探针实测：内嵌 HTML 候选 103 条，以合并前 HEAD 版 `zh.js` 实测的**修复前基线为命中 34 / 未命中 69**，修复后命中 **102 / 未命中 1**（唯一未译 `escapeHtml(name)).join('` 是箭头函数被文本正则误切的扫描伪影，非真实文案）。街景/语音/费用动态串 51 条候选实测修复后命中 48 / 未命中 3，三条未译均为**刻意保留**：`MAPILLARY ↗`（品牌名 + 外链箭头）、`360° · 128° · 2026-09-01`（纯数据段，translateSegments 按纪律保留）、`01 · Rasuwagadhi witness`（序号已译出，地名为专有名词）。
- 四次反向验证全部干净（删词条/禁分支/退化采集器/禁三元层 → 对应断言精确报红；每次先 `node --check` 排除级联失败；还原 → 24/24）。

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
