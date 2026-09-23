/* God's Eye View 汉化补丁（运行时注入，不改核心源码）
 * 启用：index.html 引入本脚本 + localStorage['gev-lang']='zh'
 * 切换：界面右上角「中/EN」按钮（切换后自动刷新）
 *
 * zh-1.1.0 变更（同步上游 255 提交大重构后补充）：
 *   - 词典扩充至 ~330 条，覆盖 src/ui/ 组件化重构后的新面板
 *     （太空任务回放、CCTV 帧状态、电台生命周期、密钥配置、场景截图、加载反馈）
 *   - 新增「分段翻译」：' · ' 复合状态串逐段查词典后拼回
 *   - 新增原生弹窗 hook：window.confirm / prompt / alert 文案汉化
 *   - RULES 扩充：FPS、场景运行状态、面板展开收起、风格切换等动态串
 */
(function () {
  'use strict';
  var LANG = 'zh';
  try { if ((localStorage.getItem('gev-lang') || LANG) !== 'zh') return; } catch (e) { return; }

  /* ---------- 词典（键为英文原文，trim 后精确匹配，大小写多形态回退） ---------- */
  var DICT = {
    // ===== 品牌 / 标语 / 启动 =====
    "GOD'S EYE": '上帝之眼', "God's Eye View": '上帝之眼', "VIEW": '视角',
    'NO PLACE LEFT BEHIND': '不遗漏世界任何角落',
    'Initializing systems...': '正在初始化系统...',
    'Initializing photorealistic world...': '正在初始化写实世界...',
    'Configuring viewer...': '正在配置视图器...',
    'Restoring shared view...': '正在恢复共享视图...',
    'Data attribution': '数据归属说明',
    'Close data attribution': '关闭数据归属说明',

    // ===== 主面板 / 布局 =====
    'ACTIVE STYLE': '当前风格', 'NORMAL': '标准', 'Normal': '标准',
    'DATA LAYERS': '数据图层', 'SCENES': '场景', 'DISPLAY': '显示',
    'CCTV': '公共监控', 'CONTEXT': '情报', 'LOCATION': '定位',
    'VISUAL PRESETS': '视觉预设', 'POWER UP': '增强配置',
    'Power up the globe': '为地球注入增强能力',
    'GROUND STATION · PROVIDER SETTINGS': '地面站 · 数据源配置',
    'SAVE KEYS': '保存密钥', 'MAP SOURCE': '地图源',
    'OpenSky': 'OpenSky 航班', 'OpenStreetMap': 'OpenStreetMap', 'AISStream': 'AISStream 船舶',
    'AISSTREAM': 'AISSTREAM 船舶', 'CESIUM ION': 'CESIUM ION', 'GOOGLE MAPS': 'GOOGLE MAPS',
    'GOOGLE MAPS — SERVER': 'GOOGLE MAPS — 服务端',
    'NASA FIRMS': 'NASA FIRMS 火点', 'LAUNCH LIBRARY': 'LAUNCH LIBRARY 发射库',
    'Bing Aerial': 'Bing 航拍', 'Bing Labels': 'Bing 注记',
    'Bing imagery map stacks + world terrain': 'Bing 影像地图栈 + 全球地形',
    'Clear selected data layers': '清除所选数据图层',
    'Clearing selected data layers': '正在清除所选数据图层',
    'Turn off all selected data layers': '关闭所有已选数据图层',
    'Visible map targets': '可见地图目标',
    'Reset to full globe view': '重置为完整地球视图',
    'Reset cockpit to full globe view': '重置驾驶舱为完整地球视图',
    'Reset camera and return to full globe view': '重置相机并返回完整地球视图',
    'Celestial ring — reveal the full globe': '星空环 — 显示完整地球',
    'Hide UI chrome': '隐藏界面元素',
    'Return UI controls': '恢复界面控件',
    'Search any location': '搜索任意地点',
    'Copy share link': '复制分享链接',
    'Keep location tray open': '保持定位托盘展开',
    'Keep visual presets open': '保持视觉预设展开',
    'Expand panel': '展开面板', 'Collapse panel': '收起面板',
    'Expand LOCATION': '展开定位', 'Expand Radio': '展开电台',
    'Expand Cockpit display options': '展开驾驶舱显示选项',
    'Expand Cockpit Radio controls': '展开驾驶舱电台控件',
    'Open compact Radio controls': '打开紧凑电台控件',
    'Close compact Radio controls': '关闭紧凑电台控件',
    'Open detailed Radio controls': '打开详细电台控件',
    'Compact Radio controls': '紧凑电台控件',
    'Compact Radio volume': '紧凑电台音量',
    'Cockpit compact Radio controls': '驾驶舱紧凑电台控件',
    'Cockpit display options': '驾驶舱显示选项',
    'Cockpit display and Radio controls': '驾驶舱显示与电台控件',
    'Cockpit Radio volume': '驾驶舱电台音量',
    'Cockpit vision style': '驾驶舱视觉风格',
    'Cockpit briefing carousel': '驾驶舱简报轮播',
    'Cockpit briefing controls': '驾驶舱简报控件',
    'Cockpit briefing pages': '驾驶舱简报页面',
    'Collapse briefing panel': '收起简报面板',
    'Collapse cockpit briefing panel': '收起驾驶舱简报面板',
    'Collapse contact panel': '收起目标面板',
    'Collapse Contact panel': '收起目标面板',
    'Contact cockpit summary': '目标驾驶舱摘要',
    'Contact Context actions': '目标情报操作',
    'Contact navigation': '目标导航',
    'CONTACTS CONTEXT OFF': '目标情报 关',
    'Context mode': '情报模式',
    'Next vision style': '下一个视觉风格',
    'Previous vision style': '上一个视觉风格',
    'Next briefing page': '下一页简报',
    'Previous briefing page': '上一页简报',
    'Next station': '下一个电台', 'Previous station': '上一个电台',
    'Aircraft cockpit view': '飞行器驾驶舱视角',
    'Current aircraft heading': '当前飞行器航向',
    'Camera pose — click a value to type': '相机姿态 — 点击数值可输入',
    'Drag the camera in the world: rings rotate, arrows move, handles set range/FOV':
      '在世界中拖动相机：圆环旋转、箭头移动、手柄设置距离/视场',
    'CCTV camera': '公共监控摄像头', 'CCTV feed frame': '公共监控画面帧',
    'FRAME · LOADING': '画面 · 加载中', 'FRAME · UNAVAILABLE': '画面 · 不可用',
    'Enable CCTV to load camera intersections': '启用公共监控以加载摄像头交汇',
    'Enable CCTV to start camera-linked intelligence summaries.': '启用公共监控以开始摄像头关联的情报摘要。',
    'Enable Radio, then choose a globe marker or use next.': '启用电台后，选择地球标记或使用「下一个」。',

    // ===== 首次启动向导 =====
    'MISSION CONTROL · FIRST LAUNCH': '任务控制 · 首次启动',
    'Choose your first view': '选择你的第一个视角',
    "It feels like a forbidden cockpit—then you realize the sources are public and the data is real.":
      '它看起来像禁用的驾驶舱——但你会意识到：数据源全部公开，数据全部真实。',
    'LIVE CONTACTS': '实时目标',
    'Aircraft, vessels and nearby intelligence': '飞机、船舶与周边情报',
    'SPACE MISSIONS': '太空任务',
    'Launches, spacecraft and orbital context': '发射、航天器与轨道态势',
    'Available Space Missions': '可用太空任务',
    'ACTIVE EVENTS': '活跃事件',
    'ENVIRONMENTAL': '环境事件',
    'Live earthquakes and active fires, from USGS and NASA': '来自 USGS 与 NASA 的实时地震与活跃火点',
    'EXPLORE MANUALLY': '自由探索', 'Begin with a clean globe': '从一颗干净的地球开始',
    "Don't show this again": '不再显示', 'ESC to dismiss': '按 ESC 关闭', 'ESC to close': '按 ESC 关闭',
    'Tip: the GEV MIC button in the dock lets you talk to the map.': '提示：底座上的 GEV MIC 按钮可让你用语音指挥地图。',
    'This browser is blocking storage, so that could not be saved.': '浏览器阻止了本地存储，因此无法保存。',
    'TAB PREVIEWS · ENTER / SPACE SELECTS': 'Tab 预览 · Enter / 空格 选择',

    // ===== 情报 / 目标面板 =====
    'CONTACTS': '目标', 'CONTACT': '目标', 'CONTACTS · 250 KM': '目标 · 250 公里',
    'CONTACTS — nearest planes · vessels · sites': '目标 — 最近的飞机 · 船舶 · 设施',
    'SEARCH NEARBY SITES': '搜索附近设施', 'COCKPIT': '驾驶舱',
    'FOCUS': '聚焦', 'NEXT': '下一个', 'PREV': '上一个',
    'Next — nearest unvisited contact in the 250 km window': '下一个 — 250 公里窗口内最近的未访问目标',
    'Previous — prior visited contact in the 250 km window': '上一个 — 250 公里窗口内先前访问的目标',
    'Cycles the nearest contacts of whatever type you select — planes, vessels, installations. Satellites track independently.':
      '循环切换你所选类型中最近的目标 — 飞机、船舶、设施。卫星独立追踪。',
    'Flights': '民航航班', 'Military flights': '军用航班', 'AIS vessels': 'AIS 船舶',
    'Mapped installations': '已标注设施', 'Unavailable': '不可用',
    'OpenSky Network · observed or mapped nearby context': 'OpenSky 网络 · 观测或已标注的周边态势',
    'adsb.lol · no observed or mapped objects in current feeds': 'adsb.lol · 当前信号源中暂无观测或已标注目标',
    'AISStream · feed unavailable': 'AISStream · 信号源不可用',
    'NEAREST': '最近', 'NEAREST OBSERVED / MAPPED': '最近观测 / 已标注',
    'OBSERVED / MAPPED PINGS': '观测 / 已标注信号',
    'SELECT CONTACTS TO LOAD OBSERVED / MAPPED PROXIMITY': '选择目标以加载观测/已标注的周边态势',
    'ENABLE GLOBAL CONTEXT FOR PROXIMITY PINGS': '启用全球情报以接收周边信号',
    'CONTEXT ONLY': '仅情报', 'CONTEXT STANDBY': '情报待命', 'SELECT CONTEXT': '选择情报',
    'AHEAD': '前方',
    'CONTACT LOST · LAST KNOWN READOUT · NOT AN ALL-CLEAR': '目标丢失 · 最后一次已知读数 · 非全面许可',
    'POSITION UNAVAILABLE': '位置不可用', 'REGION UNAVAILABLE': '区域不可用',

    // ===== HUD 抬头显示 =====
    'TOP SECRET // SI-TK // NOFORN': '绝密 // SI-TK // 禁止外传',
    'AVAILABLE INPUTS ONLY · NOT AN ALL-CLEAR': '仅含可用输入 · 非全面许可',
    'SUMMARY': '摘要', 'LOCAL': '本地', 'LOCAL INFO': '本地信息',
    'LIVE SIGNALS': '实时信号', 'LIVE TRACK': '实时轨迹',
    'LIVE TRACK · COURSE ALIGNED': '实时轨迹 · 航向对齐',
    'COURSE ALIGNED': '航向对齐', 'MILITARY': '军用', 'COMMERCIAL': '民航',
    'ALTITUDE': '高度', 'ALTITUDE · FT': '高度 · 英尺',
    'GROUND SPEED': '地速', 'GROUND SPEED · KTS': '地速 · 节',
    'AIRCRAFT': '飞行器', 'COMMERCIAL FLIGHT': '民航航班', 'MILITARY FLIGHT': '军用航班',
    'ESTIMATED FLIGHT PLAN': '估算飞行计划', 'ARROW · ESTIMATED DIRECTION': '箭头 · 估算方向',
    'VISOR LOCK · ACTIVE': '目镜锁定 · 激活', 'FIRST PERSON': '第一人称',
    'EXIT COCKPIT': '退出驾驶舱', 'EXIT CLEAN VIEW': '退出纯净视图', 'Clean UI': '纯净界面',
    'Exit cockpit view': '退出驾驶舱视角',
    'Exit cockpit and return to full globe view': '退出驾驶舱并返回完整地球视图',
    'CAPTURE SHOT': '抓拍', 'UPDATE SHOT': '更新截图',
    'CALIBRATION': '校准', 'CALIBRATED': '已校准', 'SAVE CAL': '保存校准', 'RESET CAL': '重置校准',
    'CAL · --': '校准 · --',
    'HUD': '抬头显示', 'WX': '气象', 'SIG': '信号', 'SKY': '天空',
    'FLT': '航班', 'MIL': '军用', 'AIS': '船舶 AIS', 'MIC': '麦克风', 'STD': '标准',
    'FT': '英尺', 'KTS': '节', 'MM': '毫米', 'TO': '至', 'NEW': '新建',
    'OPTICAL PLANE · 01': '光学平面 · 01',
    'C TOGGLE': 'C 切换', 'ORBIT': '轨道',
    'Enable cockpit weather effects': '启用驾驶舱天气效果',
    'Disable cockpit weather effects': '禁用驾驶舱天气效果',

    // ===== 图层 / 加载状态 =====
    'SYNCING ROAD NETWORK': '正在同步路网', 'LOADING LIVE DATA': '正在加载实时数据',
    'REFRESHING LIVE DATA': '正在刷新实时数据', 'TURNING OFF LIVE DATA': '正在关闭实时数据',
    'LIVE DATA OFF': '实时数据 关',
    'FETCHING MAPPED SITES': '正在获取已标注设施', 'RETRYING MAPPED SITES': '正在重试已标注设施',
    'MAPPED SITES LOADED': '已标注设施加载完成',
    'LOAD COMPLETE': '加载完成', 'LOAD CANCELLED': '加载已取消', 'LOAD FAILED': '加载失败',
    'LOADING 30-DAY MISSION INDEX': '正在加载 30 天任务索引',
    'ACQUIRING REGIONAL NEWS': '正在获取区域新闻', 'ACQUIRING SURFACE': '正在获取地表',
    'ACQUIRING': '获取中', 'RESOLVING REGION': '正在解析区域',
    'ROUTE DATA UNAVAILABLE': '航线数据不可用', 'SOURCE · UNKNOWN': '来源 · 未知',
    'UNKNOWN': '未知', 'READY': '就绪', 'Ready': '就绪',
    'RADIO READY': '电台就绪', 'Radio off': '电台关闭', 'SYNCING': '正在同步',
    'ENABLE': '启用', 'DISABLE': '禁用', 'DETECT': '探测', 'RESET': '重置',
    'ON': '开', 'OFF': '关', 'DENSE': '密集', 'SPARSE': '稀疏', 'BALANCED': '均衡',
    'COVERAGE OFF': '覆盖 关', 'COVERAGE ON': '覆盖 开',
    'CCTV OFF': '监控 关', 'CCTV ON': '监控 开',
    'CYCLE OFF': '轮巡 关', 'CYCLE ON': '轮巡 开',
    'AUTO HOP OFF': '自动跳转 关', 'AUTO HOP ON': '自动跳转 开',
    'PROJECTION ON': '投影 开启', 'SNAPS TO AVAILABLE STATIONS': '自动吸附可用电台',
    'DRAG TO TUNE': '拖动调谐', 'ALL · DRAG THE NEEDLE': '全部 · 拖动指针',
    'DIRECTORY BAND': '目录频段', 'DIRECTORY: RADIO BROWSER': '目录：Radio Browser',
    'NO STATION SELECTED': '未选择电台', 'NO STATION AVAILABLE': '暂无可用电台',
    'STATION SITE': '电台站点', 'STATION TAG': '电台标签',
    'STATION UNAVAILABLE': '电台不可用', 'OFF AIR': '停播',
    'RADIO': '电台', 'PLAY': '播放', 'STOP': '停止', 'VOLUME': '音量', 'LEVEL': '电平',
    'RADIO STATE UNCERTAIN': '电台状态不确定', 'UNCERTAIN': '不确定',
    'Aviation / Marine': '航空 / 海事',
    'SOURCE-BACKED EVENTS · NO SYNTHETIC NEWS': '基于信源的事件 · 无合成新闻',
    'GOOGLE NEWS RSS · LOCATION QUERY · RECENT': 'Google 新闻 RSS · 位置查询 · 近期',
    'LOCATION QUERY': '位置查询', 'REGIONAL NEWS': '区域新闻',
    'LATEST LOCATION-MATCHED REPORTING': '最新位置匹配报道', 'NEWS': '新闻',
    'SCENE SUMMARY': '场景摘要', 'RUN LOG': '运行日志',
    'AVAILABLE MISSIONS': '可用任务', 'SELECT A MISSION TO INSPECT': '选择任务以查看',
    'NO AVAILABLE EXAMPLE': '暂无可用示例',
    'SPACE MISSIONS — launches & orbital assets': '太空任务 — 发射与轨道资产',

    // ===== 电台播放状态（含 ' · ' 后缀分段） =====
    'Ready — playback starts only from your action': '就绪 — 仅在你操作后才开始播放',
    'Connecting directly to broadcaster…': '正在直连广播方…',
    'Buffering broadcaster stream…': '正在缓冲广播流…',
    'Broadcaster stream unavailable': '广播流不可用',
    'Radio is enabling…': '电台正在启用…',
    'Radio is disabling…': '电台正在禁用…',
    'Radio lifecycle is uncertain — use Enable or Disable to reconcile': '电台状态不确定 — 请用「启用」或「禁用」重新校准',
    'Station unavailable after directory refresh — choose another channel': '目录刷新后该电台不可用 — 请选择其他频道',
    'muted during voice interaction': '语音交互期间静音',
    'restoring volume after voice': '语音结束后正在恢复音量',
    'static indicates no broadcaster audio': '杂音表示广播方无音频',
    'tuning static until broadcaster starts': '广播方启动前为调谐杂音',
    'stale/degraded directory': '目录过期/降级',
    'degraded directory': '目录降级',
    'stale directory': '目录过期',
    'outside current filter': '超出当前筛选',
    'Audio connects directly to the broadcaster after you press play. Your IP is visible to that broadcaster.':
      '按下播放后，音频将直接连接到广播方。你的 IP 地址对该广播方可见。',

    // ===== 太空任务 / 发射回放 =====
    'MISSION': '任务', 'NAME': '名称', 'TYPE': '类型', 'STATUS': '状态',
    'STAGE': '级段', 'PAYLOAD': '载荷', 'DESTINATION': '目的地',
    'SELECTED SPACE MISSION': '已选太空任务',
    'REPLAY ASCENT': '回放上升段', 'REPLAY SPEED': '回放速度',
    'Pause replay': '暂停回放', 'Resume replay': '继续回放', 'Cancel replay': '取消回放',
    'Play replay': '播放回放', 'Start replay': '开始回放',
    'ASCENT PATH': '上升轨迹', 'LAUNCH SITE': '发射场', 'LAUNCH TIME': '发射时间',
    'CURRENT DISTANCE FROM EARTH': '当前离地距离', 'SATELLITE SPEED': '卫星速度',
    'FINAL POSITION': '最终位置',
    'STAGE / RE-ENTRY / RECOVERY': '级段 / 再入 / 回收',
    'NO STAGE RE-ENTRY / RECOVERY DATA': '暂无级段再入/回收数据',
    'PAYLOAD DATA UNAVAILABLE': '载荷数据不可用',
    'NO MISSIONS AVAILABLE IN THE CURRENT 30-DAY WINDOW': '当前 30 天窗口内暂无可用任务',
    'SHOW ALL / DESELECT': '全选 / 取消选择',
    'COMMS': '通信', 'CAMERA': '摄像头',

    // ===== 场景 / 截图 =====
    'LOAD': '加载', 'DEL': '删除', 'REMOVE': '移除',
    'No shots yet. Use CAPTURE SHOT to save current look.': '暂无镜头。使用「抓拍」保存当前画面。',
    'Shot title': '镜头标题', 'New scene name': '新场景名称',
    'Global Flights Radar': '全球航班雷达',
    'Orbital Watch': '轨道监视',
    'Thermal Threat Board': '热威胁看板',
    'City Overload': '城市过载',
    'Omniscience Pullback': '全知拉远',

    // ===== 视觉预设 =====
    'FLIR': '热成像', 'Tactical': '战术', 'Noir': '黑色电影', 'Anime': '动漫',
    'Celestial': '星空', 'Minimal': '极简', 'Style': '风格',
    'CRT': '显像管', 'NVG': '夜视仪', 'Pixelation': '像素化',
    'Bloom': '泛光', 'Density': '密度', 'Sharpen': '锐化', 'Proximity': '邻近感',
    'Fade': '衰减', 'Feather': '羽化', 'Elastic': '弹性', 'Weighted': '加权',
    'Scope': '视野', 'Layout': '布局', 'Models': '模型', 'Operator': '操作员', 'Outside': '外部',
    'PARAMETERS': '参数', 'ADJUST': '调节', 'ADJUST ON': '调节 开',
    'EXPORT PRESETS': '导出预设', 'IMPORT': '导入',
    'Bloom / Glow': '泛光 / 光晕', 'Bloom intensity': '泛光强度',
    'Scope — the circular viewport mask': '视野 — 圆形视口遮罩',
    'Scope edge feather as a percentage of the keyhole radius': '视野边缘羽化，按锁孔半径的百分比计',
    'Detection overlay': '探测覆盖层', 'Detection fade distance': '探测衰减距离',
    'Detection label density': '探测标签密度', 'Detection label allocation': '探测标签分配',
    'Detection opacity outside the keyhole': '锁孔外探测不透明度',
    // 2026-09-15 补：上游把静态文案拆进 src/ui/templates/*.html 后新暴露的单词标签
    // 词典精确匹配优先于大小写兜底，故 'Clear'(清除按钮) 不会吃掉气象 'CLEAR'(晴)
    'Sharpening': '锐化中', 'Allocation': '分配', 'All': '全部',
    'Snow': '雪白', // 视觉风格（cold snowy whiteout），非天气"雪"

    // ===== 手绘标注（PR #547 annotations）=====
    'Draw': '手绘', 'Shape': '形状', 'Area': '区域', 'Line': '线条', 'Pin': '图钉',
    'Clear': '清除',
    'Primary': '主色', 'Amber': '琥珀', 'Cyan': '青色', 'Green': '绿色', 'Red': '红色',
    'Draw on the world — click vertices, double-click or Enter to finish, Esc to cancel':
      '在地球上手绘 — 点击放置顶点，双击或按 Enter 完成，Esc 取消',
    'Remove every mark from the board': '清除图上全部标记',
    'Label (optional)': '标签（可选）',
    'Shape to draw': '要绘制的形状',
    'Label for the drawn shape': '所绘形状的标签',
    'Colour of the drawn shape': '所绘形状的颜色',

    // ===== 驾驶舱气象简报（src/data/regionalModel.js weatherCodeLabel）=====
    // 全大写：与手绘面板的 'Clear' / 'Snow' 区分开，二者语义不同
    'CLEAR': '晴', 'PARTLY CLOUDY': '局部多云', 'OVERCAST': '阴', 'FOG': '雾',
    'DRIZZLE': '毛毛雨', 'RAIN': '雨', 'SNOW': '雪',
    'RAIN SHOWERS': '阵雨', 'SNOW SHOWERS': '阵雪',
    'THUNDERSTORM': '雷暴', 'MIXED CONDITIONS': '混合天气',
    'CONDITIONS UNKNOWN': '天气未知',
    'World-overlay fade distance outside the keyhole as a percentage of its radius':
      '锁孔外世界覆盖层的衰减距离，按其半径的百分比计',
    'World-overlay label and card opacity beyond the fade distance': '超出衰减距离的世界覆盖层标签与卡片不透明度',
    '3D aircraft — flat icons zoomed out, 3D models up close': '3D 飞行器 — 远视为平面图标，近视为 3D 模型',
    '3D model coverage': '3D 模型覆盖',
    'Show the globe without a visual filter.': '显示无视觉滤镜的地球。',
    'Apply high-contrast monochrome film-noir grading.': '应用高对比度单色黑色电影调色。',
    'Apply bright cel-shaded color and illustrated outlines.': '应用明亮的赛璐璐着色与插画描边。',
    'Add a cold, snowy whiteout treatment to the scene.': '为场景添加寒冷的雪白过曝效果。',
    'Simulate FLIR-style thermal contrast. Turn up Ironbow for color.': '模拟 FLIR 风格热对比。调高铁弓值可获得彩色。',
    'Simulate night-vision goggles with green intensification and a tube vignette.': '模拟夜视仪的绿色增强与镜筒暗角。',
    'Emulate a green phosphor CRT with scanlines and screen curvature.': '模拟带扫描线与屏幕曲率的绿色荧光 CRT。',
    'Reclassify as TR-3B': '重新归类为 TR-3B',
    'Weather data by Open-Meteo.com': '天气数据来自 Open-Meteo.com',
    'OPEN-METEO': 'OPEN-METEO 气象', 'TEMP': '气温', 'WIND': '风', 'PRECIP': '降水',
    'CLOUD UNKNOWN': '云量未知', 'DIR UNKNOWN': '方向未知', 'DISTANCE UNKNOWN': '距离未知',

    // ===== 密钥配置 =====
    'GET KEY ↗': '获取密钥 ↗',
    'Free key — register, paste, done': '免费密钥 — 注册、粘贴、完成',
    'Metered — a billing-enabled account': '计量计费 — 已开通付费的账户',
    'browser-side': '浏览器端',
    'configured externally': '由外部配置',
    'This key runs in the browser by design — restrict it at the provider (see SECURITY.md)':
      '该密钥按设计在浏览器中运行 — 请在服务商处限制其权限（详见 SECURITY.md）',
    'Supplied by your environment, Keychain, or launcher — change it where it was set':
      '由你的环境变量、系统钥匙串或启动器提供 — 请在原设置处修改',
    'The Google Maps key buys the photorealistic planet — everything else stacks on top.':
      'Google Maps 密钥用于获取写实地球 — 其余能力都在此之上叠加。',
    'Close key setup': '关闭密钥配置',

    // ===== 语音 =====
    'VOICE STANDBY': '语音待命', 'AI AGENT': 'AI 智能体', 'ON/OFF': '开/关',
    'Voice session could not be started.': '无法启动语音会话。',
    'MINI': '迷你',
    'loading frames': '正在加载画面', 'syncing road network': '正在同步路网',
    'FROM': '自', 'CURRENT': '当前', 'SITE': '设施',
    'FOV --': '视场 --', 'HDG --': '航向 --', 'HGT --': '高度 --', 'PITCH --': '俯仰 --', 'RANGE --': '距离 --',
    'DEST ---°': '目的 ---°', 'ΔE --': '东偏 --', 'ΔN --': '北偏 --',
    'ESC EXIT': '按 ESC 退出', 'REC': '录制',

    // ===== 补充：场景播放 / 相机姿态悬停提示 =====
    'START': '开始播放',
    'Intelligence HUD (H)': '情报抬头显示 (H)',
    'Detection Overlay (D)': '探测覆盖层 (D)',
    'Heading (compass °) — click to type': '航向（罗盘 °）— 点击输入',
    'Pitch (° up/down) — click to type': '俯仰（° 上下）— 点击输入',
    'Horizontal FOV (°) — click to type': '水平视场（°）— 点击输入',
    'Range / monitor-plane distance (m) — click to type': '距离 / 监视平面距离（米）— 点击输入',
    'Mount height above ground (m) — click to type': '离地安装高度（米）— 点击输入',
    'North offset from catalog position (m) — click to type': '相对目录位置的北向偏移（米）— 点击输入',
    'East offset from catalog position (m) — click to type': '相对目录位置的东向偏移（米）— 点击输入',
    'Cycle briefing pages automatically every 9 seconds (Signals → News → Local). Pauses while you hover or focus the panel. Live signal data refreshes continuously either way.':
      '每 9 秒自动轮播简报页面（信号 → 新闻 → 本地）。鼠标悬停或聚焦面板时暂停。无论是否轮播，实时信号数据都会持续刷新。',

    // ===== 补充：密钥配置说明长句 =====
    "The globe already flies keyless. Every key below switches on another real feed — paste one and it's saved into this app's local configuration, then the server restarts itself. Server-side keys stay on this machine; Google Maps and Cesium ion run in the browser and must be provider-restricted. Keys you configured elsewhere are shown but never touched.":
      '地球本身已可免密钥运行。下面每一个密钥都会开启一路真实数据源——粘贴后即保存到本应用的本地配置，随后服务会自动重启。服务端密钥仅留在本机；Google Maps 与 Cesium ion 在浏览器中运行，必须在服务商处限制权限。在别处配置的密钥只会显示，不会被改动。',
    'Search any location...': '搜索任意地点...',

    // ===== 补充：无障碍标签（aria-label，键盘导航 / 读屏） =====
    'Globe actions': '地球操作',
    'Estimated destination direction': '估算目的地方向',
    'Previous cockpit vision style': '上一个驾驶舱视觉风格',
    'Next cockpit vision style': '下一个驾驶舱视觉风格',
    'Nearby cohort counts': '周边分组计数',
    'Latest regional news': '最新区域新闻',
    'Location-based information': '基于位置的信息',
    // command-dock 折叠态 LOCATION 双行读数的空态（src/locationStatus.js EMPTY）。
    // 带 emoji 前缀走不到下面的 `Location: (.+)` 规则，必须单列；
    // 非空态填的是城市名（`📍 Tokyo`），属专有名词，保留原文。
    '📍 Location: --': '📍 位置: --',
    'Show Live Signals': '显示实时信号',
    'Show Regional News': '显示区域新闻',
    'Show Local Info': '显示本地信息',
    'View switcher': '视图切换器',
    'HUD layout': '抬头显示布局',
    'Scope edge feather': '视野边缘羽化',
    'Sharpen intensity': '锐化强度',
    'Navigation, voice, and visual preset controls': '导航、语音与视觉预设控件',
    'Pin visual presets': '固定视觉预设',
    'Pin location tray': '固定定位托盘',
    'Search location by name or coordinates': '按名称或坐标搜索地点',
    'Scene recipe': '场景配方',
    'Reclassify tracked contact as TR-3B': '将追踪目标重新归类为 TR-3B',
    'Internet radio companion': '网络电台伴侣',
    'Filter stations by station tag': '按电台标签筛选电台',
    'Tune available internet radio stations': '调谐可用网络电台',
    'Radio playback': '电台播放',
    'Radio volume': '电台音量',
    'Stop radio playback': '停止电台播放',
    'Play selected radio station': '播放所选电台',
    'Play selected station': '播放所选电台',
    'Previous filtered radio station': '上一个筛选电台',
    'Previous filtered station': '上一个筛选电台',
    'Next filtered radio station': '下一个筛选电台',
    'Next filtered station': '下一个筛选电台',
    'Expand Visual Presets': '展开视觉预设',
    'Current cockpit vision style: NORMAL. Activate for next style.': '当前驾驶舱视觉风格: 标准。激活以切换下一个风格。',

    // ===== 补充：地图朝向 / 倾斜控制（src/ui/templates/scene-chrome.html
    // 的 #tilt-map-view、#north-up-view 两个按钮）。静态 title / aria-label 在此，
    // 运行时由 src/ui/cameraOrientationControls.js 改写的 aria-label 见下方 RULES。
    'Toggle straight-down and tilted map views': '切换正俯视与倾斜地图视角',
    'Reset map bearing to north': '将地图朝向重置为正北',
    'Tilt map to oblique view': '将地图倾斜为斜视角',
    'Reset map to north up': '重置地图为上北朝向',
    'Return map to straight-down view': '恢复地图为正俯视视角',

    // ===== 右侧气象栏（src/ui/templates/context.html #weather-panel）=====
    // 注意：本区块内的注释不要写出「引号包裹的键 + 冒号」这种形式
    // （例如注释里引用 WIND 词条并跟一个冒号），门槛测试用正则扫原文，
    // 会把注释内容误判成重复词典键。
    // WEATHER 是全大写面板标题，与既有大写状态词体系一致，
    // 也不与手绘滤镜的 Clear / Snow 等首字母大写词冲突。
    'WEATHER': '气象',
    'Active weather products': '当前生效的气象产品',

    // ===== 气象读数面板（src/ui/weatherPanel.js）=====
    'Active weather': '当前生效的气象产品',
    'Observed history': '观测历史',
    'Rain radar': '降雨雷达',
    'Satellite clouds': '卫星云图',
    'Lightning density': '闪电密度',
    'LATEST · newest per product': '最新 · 各产品取最新帧',
    // 下面三行是 ' · ' 复合串被 translateSegments 拆分后的**单段**，
    // 分段前会 trim()，所以键里不能带前导 ' · '。
    'synced': '已同步',
    'nearest': '最近帧',
    'Does not follow history': '不随历史回放变化',

    // ===== 风场图层（src/layers/wind/index.js、presentation.js、inspection.js）=====
    'Wind motion': '风的运动',
    'Wind speed': '风速',
    'Sea-level pressure': '海平面气压',
    'Air temperature · 2 m': '气温 · 2 米',
    'Global · 1° grid': '全球 · 1° 网格',
    'Loading forecast': '正在加载预报',
    'Preparing flow': '正在准备流场',
    'Selected field unavailable': '所选场数据不可用',
    'Cached forecast · stale': '缓存预报 · 已过期',
    'ECMWF IFS': 'ECMWF IFS', 'NOAA GFS': 'NOAA GFS',
    'ECMWF': 'ECMWF', 'GFS': 'GFS',
    'ECMWF IFS surface forecast': 'ECMWF IFS 地面预报',
    'NOAA GFS surface forecast': 'NOAA GFS 地面预报',
    'Reduced motion': '已降低动效',
    'Resume': '继续', 'Pause': '暂停',
    'Pause visual flow; forecast time does not advance with animation':
      '暂停可视化流场；预报时间不会随动画推进',
    'None': '无', 'Speed': '风速', 'Pressure': '气压', 'Temperature': '气温',
    'Wind trails with no field shading': '仅显示风的轨迹，不着色场数据',
    'How hard the surface wind is blowing': '地面风的强弱程度',
    'Sea-level air pressure: broad highs and lows': '海平面气压：大范围的高压与低压',
    'Air temperature two meters above the surface': '地表以上 2 米处的气温',
    'Wind speed units': '风速单位',
    'Read wind at map center': '读取地图中心的风况',
    'Read the forecast at the center of the map without changing selection':
      '读取地图中心处的预报值，不改变当前选择',
    'MODEL': '模式', 'FIELD': '场数据', 'UNITS': '单位', 'MOTION': '动效',
    'Forecast': '预报',
    // 风速读数 `${speed} from ${dir}` 与 `${speed} · calm` 两种形态。
    // 'Calm' 首字母大写形式给 inspection.js 的 windFrom() 返回值用；
    // 小写 'calm' 是 ' · ' 分段后落到词典的那一段——dictOnly 只做
    // 精确 / 全大写 / 全小写三次尝试，**不会**把 'calm' 提升到 'Calm'，
    // 所以两个大小写形式必须各自建键，不能只写一个。
    'Calm': '无风', 'calm': '无风',
    // 读数卡把 scalarLabel 与 scalarValue 用 ' · ' 拼成一行
    // （`Air temperature · 2 m · 18.5 °C`），分段后第一段是 'Air temperature'，
    // 因此除了完整标签 'Air temperature · 2 m'，还需要这个较短的键。
    'Air temperature': '气温',
    // 覆盖范围徽标 'Rain radar · US' 分段后的 'US' 段。只建大写键：
    // dictOnly 会依次试精确 / 全大写 / 全小写，故 'US' 不会让电台面板里
    // 作为国家码数据展示的 'us' 之类被误改（且当前无此可见用法）。
    'US': '美国',
    // 图层状态徽标（src/data/layerSnapshot.js LAYER_FEED_STATE_LABELS），
    // 气象 info 串里也会以 ' · STALE' 形式出现。
    'STALE': '已过期',
    'No surface reading': '无地面读数',
    'Wind unavailable': '风场数据不可用',
    'Wind source unavailable': '风场数据源不可用',
    'Wind requires a snapshot source': '风场需要快照数据源',
    'Aim the map center at Earth': '请将地图中心对准地球',
    'Surface wind at 10 m. Approximately 1° global grid. Curves follow the 10 m wind field, lifted 12 km for visibility; display height is not weather altitude. View lighting is for readability. Animation shows flow through one fixed forecast; it does not advance time. Color fields drape the globe basemap or the active photorealistic 3D Tiles.':
      '10 米高度处的地面风。全球网格约 1°。曲线沿 10 米风场绘制，为便于观察抬升了 12 公里；显示高度并非气象高度。视图打光是为了可读性。动画展示的是同一份固定预报内的流动，不会推进时间。彩色场数据贴合地球底图或当前启用的写实 3D Tiles。',

    // ===== 天气影像图层（src/layers/weather/index.js）=====
    'Clouds only': '仅云层', 'Full': '完整',
    'The complete infrared image at the chosen opacity': '按所选不透明度显示完整红外影像',
    'Soft': '柔和', 'Vivid': '鲜艳',
    'Image opacity; does not alter the observed values': '影像不透明度；不会改变观测数值',
    'REGION': '区域', 'IMAGE': '影像', 'OPACITY': '不透明度',
    'History': '历史', 'Observed': '观测',
    'CONUS': '美国本土', 'N. America': '北美', 'North America': '北美',
    'Americas + Pacific': '美洲 + 太平洋',
    'Global': '全球', 'Global · 60°S–60°N': '全球 · 南纬 60°–北纬 60°',
    'GLOBAL INFRARED · hourly': '全球红外 · 每小时',
    'GOES INFRARED · ~5 min': 'GOES 红外 · 约 5 分钟',
    'RADAR REFLECTIVITY · dBZ': '雷达反射率 · dBZ',
    'LIGHTNING DENSITY · 15 min accumulation': '闪电密度 · 15 分钟累计',
    'Lightning density · 15 min': '闪电密度 · 15 分钟',
    'Rain radar · US': '降雨雷达 · 美国',
    'NOAA nowCOAST': 'NOAA nowCOAST',
    'Latest observation': '最新观测',
    'Loading next frame…': '正在加载下一帧…',
    'Map center outside coverage': '地图中心超出覆盖范围',
    'Observation unavailable': '观测数据不可用',
    'Source observations delayed': '数据源观测存在延迟',
    'Stale source': '数据源已过期',
    'Waiting for observation': '正在等待观测数据',
    'Weather imagery unavailable': '气象影像不可用',
    'Weather requires a snapshot source': '气象图层需要快照数据源',
    'Weather unavailable': '气象数据不可用',
    'View Americas & Pacific': '查看美洲与太平洋',
    'View coverage': '查看覆盖范围',
    'View US radar': '查看美国雷达',
    'Contiguous US · gaps ≠ no rain': '美国本土 · 空白处不代表无降雨',
    'Americas + Pacific · not individual strikes': '美洲 + 太平洋 · 非单次闪电',
    '60°S–60°N · typically 2–3 h delayed': '南纬 60°–北纬 60° · 通常延迟 2–3 小时',
    'North America · infrared imagery': '北美 · 红外影像',
    'Map center is outside source coverage': '地图中心超出数据源覆盖范围',
    'Reduced motion · history playback unavailable': '已降低动效 · 历史回放不可用',
    'Reduced motion · manual history available': '已降低动效 · 可手动查看历史',
    'STALE · cached source metadata': '已过期 · 缓存的数据源元信息',
    'strikes/km²/min ×10³ (15-minute density)': '次/平方公里/分钟 ×10³（15 分钟密度）',
    'dBZ radar reflectivity': 'dBZ 雷达反射率',
    'NOAA/NWS 15-minute lightning density derived from Vaisala NLDN/GLD360. Coverage 110°E across the Pacific/Americas to 0°, 25°S–80°N. Not a live strike count, global coverage or a safety warning.':
      'NOAA/NWS 15 分钟闪电密度，由 Vaisala NLDN/GLD360 数据推算。覆盖范围为东经 110° 横跨太平洋/美洲至 0°，南纬 25°–北纬 80°。这不是实时闪电计数，不是全球覆盖，也不是安全预警。',
    'NOAA MRMS radar echoes indicate precipitation patterns, not rain rate, a storm warning or a future forecast. Native source approximately 1 km; display is limited to level 6. Frames use exact advertised observation times.':
      'NOAA MRMS 雷达回波反映的是降水形态，不是降雨强度、风暴预警或未来预报。原始数据源约 1 公里分辨率；显示精度限制为 6 级。各帧采用数据源公布的确切观测时间。',
    'GOES-19/18 longwave infrared Band 14 regional; NESDIS global longwave mosaic. Clouds only dims everything but bright, cold cloud tops; a brightness filter, not a cloud mask. Coverage and freshness differ by region.':
      'GOES-19/18 长波红外 14 通道（区域）；NESDIS 全球长波镶嵌图。「仅云层」会压暗除明亮冷云顶以外的一切，这是亮度滤镜，不是云掩膜。覆盖范围与更新时效因区域而异。',

    // ===== 热带气旋图层（src/layers/cyclones/index.js、labels.js）=====
    'Cyclones · NHC / CPHC': '气旋 · NHC / CPHC',
    'Atlantic · E/C Pacific': '大西洋 · 东/中太平洋',
    'Cyclone advisories': '气旋公报',
    'Cyclone advisories unavailable': '气旋公报不可用',
    'Active NHC and CPHC cyclone advisories': 'NHC 与 CPHC 当前生效的气旋公报',
    'Cyclones require a snapshot source': '气旋图层需要快照数据源',
    'Atlantic and eastern/central North Pacific; not worldwide cyclone coverage.':
      '大西洋与北太平洋东部/中部；并非全球气旋覆盖。',
    'Official advisory ↗': '官方公报 ↗',
    'Advisory center / forecast track': '公报中心位置 / 预报路径',
    'Center-track uncertainty cone': '中心路径不确定性锥',
    'Track and cone match this advisory': '路径与锥体均对应本份公报',
    'Track/cone unavailable': '路径/锥体不可用',
    'Cached advisory · stale source': '缓存公报 · 数据源已过期',
    'Loading advisories…': '正在加载公报…',
    'Advisories unavailable': '公报不可用',
    'No active NHC/CPHC systems': '当前无生效的 NHC/CPHC 气旋系统',
    // 'Wind unavailable'（风暴列表里风速缺测时的占位）已在风场段定义，勿重复。
    // NHC 强度分级（CLASSIFICATION_NAMES）
    'Potential tropical cyclone': '潜在热带气旋',
    'Hurricane': '飓风',
    'Tropical storm': '热带风暴',
    'Tropical depression': '热带低压',
    'Subtropical storm': '副热带风暴',
    'Subtropical depression': '副热带低压',
    'Select a storm on the map, or choose a storm in the list to select it and move the camera. Click empty map space to clear the selection. NOAA NHC/CPHC advisory context. The cone describes forecast center-track uncertainty, not storm size or the full hazard area. Forecast point labels are source lead hours, not times computed from advisory issuance. Geometry follows the surface; height is not weather altitude. Consult the official advisory.':
      '在地图上选择一个气旋，或在列表中点选以选中它并移动镜头。点击地图空白处可取消选择。数据来自 NOAA NHC/CPHC 公报。锥体表示预报中心路径的不确定性，不代表风暴尺寸或完整的影响区域。预报点标注的是数据源给出的提前小时数，不是由公报发布时间推算出的时刻。几何体贴合地表；其高度并非气象高度。请以官方公报为准。',

    // ===== 气象读数解释文案 =====
    'Interpolated model forecast on an approximately 1° grid. Broad weather patterns, not a street-level measurement.':
      '在约 1° 网格上插值得到的模式预报。反映的是大尺度天气形势，不是街道级的实测值。',
    'A location reading needs a loaded forecast and the Earth at the center of the view.':
      '读取某地数值需要先加载预报数据，并将地球置于视图中心。',
    'Forecast · does not follow history': '预报 · 不随历史回放变化'
  };

  /* ---------- 动态串规则（正则 → 译文函数），更具体的放前面 ---------- */
  var RULES = [
    // 场景运行状态（src/scenes/director.js → scene-status）
    [/^Loaded: (.+?) \/ (.+)$/, function (m) { return '已加载: ' + tr(m[1]) + ' / ' + tr(m[2]); }],
    [/^Captured: (.+?) \/ (.+)$/, function (m) { return '已抓拍: ' + tr(m[1]) + ' / ' + tr(m[2]); }],
    [/^Updated: (.+?) \/ (.+)$/, function (m) { return '已更新: ' + tr(m[1]) + ' / ' + tr(m[2]); }],
    [/^Running (\d+)\/(\d+): (.+?) \/ (.+)$/, function (m) { return '正在播放 ' + m[1] + '/' + m[2] + ': ' + tr(m[3]) + ' / ' + tr(m[4]); }],
    [/^Delete scene "(.+)" and all shots\?$/, function (m) { return '删除场景「' + m[1] + '」及其全部镜头？'; }],
    [/^Delete shot "(.+)"\?$/, function (m) { return '删除镜头「' + m[1] + '」？'; }],
    [/^Enter a name for the new scene\.?$/, function () { return '为新场景输入名称。'; }],

    // 面板展开 / 收起（applicationShell、cockpitLayout、radioBindings、radioControls）
    // mixed: 上游会读「已被汉化的面板标题」拼 title（`Expand ${panelName}`），
    // 因此这些规则必须允许输入含中文，否则界面出现 "Expand 数据图层" 半中半英。
    [/^(Expand|Collapse) Radio section$/, function (m) { return (m[1] === 'Expand' ? '展开' : '收起') + '电台分区'; }, { mixed: 1 }],
    [/^(Expand|Collapse) (.+)$/, function (m) { var p = trKeep(m[2]); return p ? (m[1] === 'Expand' ? '展开 ' : '收起 ') + p : null; }, { mixed: 1 }],
    [/^(Open|Close) (.+)$/, function (m) { var p = trKeep(m[2]); return p ? (m[1] === 'Open' ? '打开 ' : '关闭 ') + p : null; }, { mixed: 1 }],

    // 驾驶舱视觉风格 / 天气开关
    [/^Current style: (.+?) — click for next$/, function (m) { return '当前风格: ' + tr(m[1]) + ' — 点击切换下一个'; }],
    [/^Current cockpit vision style: (.+?)\. Activate for next style\.$/, function (m) { return '当前驾驶舱视觉风格: ' + tr(m[1]) + '。激活以切换下一个风格。'; }],
    [/^(Enable|Disable) cockpit weather effects$/, function (m) { return (m[1] === 'Enable' ? '启用' : '禁用') + '驾驶舱天气效果'; }],

    // 地图朝向按钮：运行时 cameraOrientationControls.js 会把 #north-up-view 的
    // aria-label 改写成带当前航向角的动态串（每帧 heading 变化都会触发 attributes 观察）
    [/^Reset map to north up\. Current heading (\d+) degrees$/, function (m) { return '重置地图为上北朝向。当前航向 ' + m[1] + ' 度'; }],

    // 电台播放（限定不含 ' · '，复合串交给分段翻译逐段处理）
    [/^Playing ([^·]+)$/, function (m) { return '正在播放 ' + m[1].trim(); }],
    [/^Paused ([^·]+)$/, function (m) { return '已暂停 ' + m[1].trim(); }],
    [/^(Selected|Deselected) radio station$/, function (m) { return (m[1] === 'Selected' ? '已选择' : '已取消选择') + '电台'; }],
    [/^(Selected|Deselected) (selected|nearest) radio station$/, function (m) { return (m[1] === 'Selected' ? '已选择' : '已取消选择') + (m[2] === 'selected' ? '选定' : '最近') + '的电台'; }],

    // 帧率监视器
    [/^FPS (\d+)$/, function (m) { return '帧率 ' + m[1]; }],
    [/^FPS —$/, function () { return '帧率 —'; }],
    [/^Rendered globe frames per second · toggle with `$/, function () { return '地球渲染帧率 · 按 ` 键切换'; }],

    // 太空任务计数 / 回放
    [/^(\d+)\s*\/\s*30D$/, function (m) { return m[1] + ' / 30 天'; }],
    [/^(\d+(?:\.\d+)?)×$/, function (m) { return m[1] + ' 倍'; }],

    // 密钥管理
    [/^Remove (.+) from this app's saved keys$/, function (m) { return '从本应用已保存的密钥中移除 ' + m[1]; }],

    // 目标 / 卫星
    [/^Select flight (.+)$/, function (m) { return '选择航班 ' + m[1]; }],
    [/^Focusing (.+)$/, function (m) { return '正在聚焦 ' + m[1]; }],
    [/^Could not open that mission(.*)\. Retry or explore manually\.$/, function (m) { return '无法打开该任务' + m[1] + '。请重试或自由探索。'; }],
    [/^Google 3D Tiles unavailable \((.+?)\)\. Loading the keyless globe\.\.\.$/, function (m) { return 'Google 3D Tiles 不可用（' + m[1] + '）。正在加载免密钥地球...'; }],
    [/^Error: (.+)$/, function (m) { return '错误: ' + m[1]; }],
    [/^DEST (\d+)°$/, function (m) { return '目的 ' + m[1] + '°'; }],
    [/^([LR]) (\d+)°$/, function (m) { return (m[1] === 'L' ? '左 ' : '右 ') + m[2] + '°'; }],
    [/^COLL: (\d+):(\d+):(\d+)Z$/, function (m) { return '采集: ' + m[1] + ':' + m[2] + ':' + m[3] + 'Z'; }],
    [/^ONA: (.+)°$/, function (m) { return '离天底角: ' + m[1] + '°'; }],
    [/^SHARED (.+)$/, function (m) { return '已共享 ' + m[1]; }],

    // 沿用既有规则
    [/^Flying to (.+)$/i, function (m) { return '正在飞往 ' + m[1] + '...'; }],
    [/^●?\s*REC (.+)$/i, function (m) { return '● 录制 ' + m[1]; }],
    [/^POWER UP · (\d+) KEYS WAITING$/i, function (m) { return '增强配置 · ' + m[1] + ' 个密钥待配置'; }],
    [/^ORB: (\S+)\s+PASS: (\S+)$/i, function (m) { return '轨道: ' + m[1] + ' 过境: ' + m[2]; }],
    [/^GSD: (.+?)\s+NIIRS: (.+)$/i, function (m) { return '地面采样: ' + m[1] + ' 影像等级: ' + m[2]; }],
    [/^ALT: (.+?)\s+SUN: (.+)$/i, function (m) { return '高度: ' + m[1] + ' 太阳角: ' + m[2]; }],
    [/^BRG (-?\d+)° · CRS (-?\d+)°$/i, function (m) { return '方位 ' + m[1] + '° · 航向 ' + m[2] + '°'; }],
    [/^([A-Za-z0-9]+) · (\d+) KM FLIGHT \/ VESSEL WINDOW$/i, function (m) { return m[1] + ' · ' + m[2] + ' 公里 航班/船舶窗口'; }],
    [/^([A-Za-z0-9-]+) · (\d+) km$/i, function (m) { return m[1] + ' · ' + m[2] + ' 公里'; }],
    [/^LOADING FRAMES (\d+)\/(\d+)$/i, function (m) { return '正在加载画面 ' + m[1] + '/' + m[2]; }],
    [/^SYNCING ROAD NETWORK\s*(\d+%)?$/i, function (m) { return '正在同步路网' + (m[1] ? ' ' + m[1] : ''); }],
    [/^HDG (\d+)°$/i, function (m) { return '航向 ' + m[1] + '°'; }],
    [/^CONTACTS · (\d+) KM$/i, function (m) { return '目标 · ' + m[1] + ' 公里'; }],
    [/^Landmark: (.+)$/, function (m) { return '地标: ' + m[1]; }],
    [/^MGRS: (.+)$/, function (m) { return 'MGRS 坐标: ' + m[1]; }],
    [/^CELL: (.+)$/, function (m) { return '网格: ' + m[1]; }],
    [/^GRID: (.+)$/, function (m) { return '格网: ' + m[1]; }],

    // ===== 气象 / 风场 / 气旋三套新图层的动态串（2026-09-23 上游新增）=====
    // 设计原则：优先给「' · ' 复合串里的原子片段」写规则，
    // 复合串本身交给 translateSegments 自动拼装，避免为每种组合各写一条。
    // 原子片段规则必须放在通用规则之前（RULES 按顺序首中即返回）。

    // 相对时间：`2h 15m ago` / `45m ago` / `25 min ago`
    [/^(\d+)h (\d+)m ago$/, function (m) { return m[1] + ' 小时 ' + m[2] + ' 分钟前'; }],
    [/^(\d+)m ago$/, function (m) { return m[1] + ' 分钟前'; }],
    [/^(\d+) min ago$/, function (m) { return m[1] + ' 分钟前'; }],

    // info 串里的行内原子片段
    [/^frame (\d+)\/(\d+)$/, function (m) { return '第 ' + m[1] + '/' + m[2] + ' 帧'; }],
    [/^loading$/, function () { return '加载中'; }],
    [/^preparing$/, function () { return '准备中'; }],
    [/^Observation: unavailable$/, function () { return '观测数据: 不可用'; }],
    [/^Color: strikes\/km²\/min ×10³$/, function () { return '颜色: 次/平方公里/分钟 ×10³'; }],
    [/^wind remains visible$/, function () { return '风场仍保持显示'; }],

    // 时间标注原子片段：`valid 09-23 12:00 UTC` / `issued ...`
    [/^valid (.+)$/, function (m) { return '有效时间 ' + m[1]; }],
    [/^issued (.+)$/, function (m) { return '发布于 ' + m[1]; }],
    // `Valid: ...` / `Issued: ...` 是气象 info 串里的整行。
    // 行内还可能带 ' · loading' / ' · STALE' 尾巴，所以捕获组要再过一次 tr()，
    // 否则会留下半中半英（这是探针实测抓到的缺陷，不是推测）。
    // 不会递归回本规则：尾巴不含 "Valid:" 前缀。
    [/^Valid: (.+)$/, function (m) { return '有效时间: ' + tr(m[1]); }],
    [/^Issued: (.+)$/, function (m) { return '发布时间: ' + tr(m[1]); }],
    [/^Latest observation: (.+)$/, function (m) { return '最新观测: ' + tr(m[1]); }],
    [/^History: (.+)$/, function (m) { return '历史: ' + tr(m[1]); }],

    // 模式名 + forecast：`GFS forecast` / `ECMWF IFS forecast`
    [/^(GFS|ECMWF IFS) forecast$/, function (m) { return m[1] + ' 预报'; }],

    // 风场 info 首行：`Wind speed (km/h)` / `Sea-level pressure (hPa)`
    [/^(Wind speed|Sea-level pressure|Air temperature · 2 m) \(([^)]+)\)$/,
      function (m) { return tr(m[1]) + '（' + m[2] + '）'; }],

    // 风速读数：`12.3 km/h from NNE`（Calm 时上游走 ' · calm' 分支，由词典处理）
    [/^(.+?) from (N|NNE|NE|ENE|E|ESE|SE|SSE|S|SSW|SW|WSW|W|WNW|NW|NNW)$/, function (m) {
      var COMPASS = {
        N: '北', NNE: '东北偏北', NE: '东北', ENE: '东北偏东',
        E: '东', ESE: '东南偏东', SE: '东南', SSE: '东南偏南',
        S: '南', SSW: '西南偏南', SW: '西南', WSW: '西南偏西',
        W: '西', WNW: '西北偏西', NW: '西北', NNW: '西北偏北'
      };
      return m[1] + ' 来自' + COMPASS[m[2]];
    }],
    // 风场读数卡标题：`WIND AT 34.56°N 120.34°W`
    [/^WIND AT (.+)$/, function (m) { return '风况 @ ' + m[1]; }],

    // 图例说明：`10 dBZ radar reflectivity` / `5 strikes/km²/min ×10³ (15-minute density)`
    [/^(\d+(?:\.\d+)?) dBZ radar reflectivity$/, function (m) { return m[1] + ' dBZ 雷达反射率'; }],
    [/^(\d+(?:\.\d+)?) strikes\/km²\/min ×10³ \(15-minute density\)$/,
      function (m) { return m[1] + ' 次/平方公里/分钟 ×10³（15 分钟密度）'; }],

    // 气旋：`Advisory 12` / `85 kt` / `Position as of ...` / `Maximum sustained wind: ... · Pressure: ...`
    [/^Advisory (\d+)$/, function (m) { return '第 ' + m[1] + ' 号公报'; }],
    [/^Position as of (.+)$/, function (m) { return '位置截至 ' + m[1]; }],
    [/^Maximum sustained wind: (.+?) · Pressure: (.+)$/,
      function (m) { return '最大持续风速: ' + m[1] + ' · 气压: ' + m[2]; }],
    [/^(\d+) active storms?$/, function (m) { return m[1] + ' 个活跃风暴'; }],
    [/^Track\/cone awaiting advisory (\d+)$/,
      function (m) { return '路径/锥体待第 ' + m[1] + ' 号公报'; }],
    // 捕获组同样要过 tr()：`No frame within 30 min of 09-23 12:00 UTC`
    // 里的 '30 min' 是量词段，否则译文里会留下英文单位。
    // 空格按译文末字符判断：译成中文时不能再补空格（否则是「30 分钟 内」）。
    [/^No frame within (.+?) of (.+)$/, function (m) {
      var gap = tr(m[1]);
      return '在 ' + m[2] + ' 前后 ' + gap
        + (/[一-鿿]/.test(gap.slice(-1)) ? '' : ' ') + '内无可用帧';
    }],

    // 风场读数卡的 `Air temperature · 2 m · 18.5 °C` 由 translateSegments
    // 逐段处理（`Air temperature` 走词典、`2 m` 走下方量词规则、`18.5 °C` 保留），
    // 不再需要为这种组合单独写整串规则。

    // 气象预报点悬停标注：`24 h`（提前小时数）
    [/^(\d+) h$/, function (m) { return m[1] + ' 小时'; }],
    // 帧间隔量词：`30 min`（weather/index.js 的 maxGap、weatherPanel.js 的 gap）
    [/^(\d+) min$/, function (m) { return m[1] + ' 分钟'; }],
    // 气温标签的高度量词：`2 m`（'Air temperature · 2 m' 分段后的单段）
    [/^(\d+) m$/, function (m) { return m[1] + ' 米'; }]
  ];

  /* 词典直查（不含分段/规则），供 RULES 内部复用 */
  function dictOnly(t) {
    if (!t) return null;
    var n = String(t).replace(/\s+/g, ' ').trim();
    if (!n || n.length < 2) return null;
    if (/[一-鿿]/.test(n)) return null;
    if (!/[A-Za-z]{2,}/.test(n)) return null;
    if (DICT[n]) return DICT[n];
    if (DICT[n.toUpperCase()]) return DICT[n.toUpperCase()];
    if (DICT[n.toLowerCase()]) return DICT[n.toLowerCase()];
    return null;
  }

  /* 供 RULES 使用的宽松翻译：命中则译，未命中则原样返回 */
  function tr(s) {
    var v = lookup(s);
    return v === null ? String(s).trim() : v;
  }

  /* 严格翻译：命中则译，未命中返回 null（让整条规则放弃，避免半中半英）。
   * 例外：输入已含中文时原样采用——上游会读取「已被本补丁汉化的面板标题」
   * 去拼 title（如 `Expand ${panelName}`，panelName 已是「数据图层」），
   * 这种情况直接拼上即可，不能因为查不到词典就整条放弃。 */
  function trKeep(s) {
    var v = lookup(s);
    if (v !== null) return v;
    var raw = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    if (/[一-鿿]/.test(raw)) return raw;
    return null;
  }

  /* ---------- 分段翻译：' · ' 复合串逐段查词典后拼回 ---------- */
  var SEP = ' · ';
  function translateSegments(t) {
    if (t.indexOf(SEP) < 0) return null;
    var parts = t.split(SEP);
    if (parts.length < 2) return null;
    var out = [];
    var hits = 0;
    for (var i = 0; i < parts.length; i++) {
      var seg = parts[i].trim();
      if (!seg) continue;                                  // 空段丢弃
      if (!/[A-Za-z]{2}/.test(seg)) {
        // 纯数据段（如 `3.2 km`、`18.5 °C`）默认保留原文——地名/编号等专有名词
        // 不能被误译。但**单位量词段**（`2 m`、`30 min`、`24 h`）只含 1 个字母，
        // 早期版本在这里直接 push 原文、根本不查规则，导致
        // `Air temperature · 2 m · 18.5 °C` 半中半英。改为仍然过一遍 lookup：
        // 命中规则才替换（如 `/^(\d+) m$/` → `2 米`），查不到照旧保留。
        // 副作用边界由「量词段翻译不得波及单位数据与既有距离显示」测试守住。
        var dv = lookup(seg);
        if (dv === null) { out.push(seg); }
        else { out.push(dv); hits++; }
        continue;
      }
      var v = lookup(seg);
      if (v === null) { out.push(seg); }                   // 未命中：保留原文（可能是地名等专有名词）
      else { out.push(v); hits++; }
    }
    if (hits < 1 || out.length < 2) return null;           // 至少译出一段且仍是复合串才生效
    return out.join(SEP);
  }

  /* 跑规则表。mixedOnly=true 时只允许标记 { mixed: 1 } 的规则——
   * 用于「输入已含中文」的窄通道（上游用已汉化标题拼串），
   * 其余规则一律不碰，避免译文被反复改写。 */
  function runRules(t, mixedOnly) {
    for (var i = 0; i < RULES.length; i++) {
      if (mixedOnly && !(RULES[i][2] && RULES[i][2].mixed)) continue;
      var m = t.match(RULES[i][0]);
      if (!m) continue;
      // 规则返回 null 表示「主动放弃」（如后半段译不出），继续尝试后续规则
      try {
        var r = RULES[i][1](m);
        if (r !== null && r !== undefined) return r;
      } catch (e) { /* 单条规则出错不影响其余 */ }
    }
    return null;
  }

  /* ---------- 多行分段：含 '\n' 的串逐行翻译后拼回 ----------
   * 气象/风场图层的 info 串是多行文本（src/ui/layerPanel.js 直接把它
   * textContent 进 DOM），而下面的 lookup() 会把所有空白压成单个空格，
   * 整串因此永远查不到词典。这里在压平**之前**先按行拆开，逐行走正常
   * lookup（行内不含 '\n'，不会递归回到本函数）。
   * 与 translateSegments 同样的保守口径：一行都没译出就整体放弃。 */
  function translateLines(raw) {
    var s = String(raw == null ? '' : raw);
    if (s.indexOf('\n') < 0) return null;
    var lines = s.split('\n');
    if (lines.length < 2) return null;
    var out = [];
    var hits = 0;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line.trim()) { out.push(line); continue; }      // 空行原样保留
      var v = lookup(line.trim());
      if (v === null) { out.push(line); }                   // 未命中：保留原文
      else { out.push(v); hits++; }
    }
    if (hits < 1) return null;
    return out.join('\n');
  }

  function lookup(raw) {
    var s = String(raw == null ? '' : raw);
    // 多行串优先按行拆分（必须在压平空白之前做）
    if (s.indexOf('\n') >= 0) {
      var byLine = translateLines(s);
      if (byLine !== null) return byLine;
    }
    var t = s.replace(/\s+/g, ' ').trim();
    if (!t || t.length < 2) return null;
    if (/[一-鿿]/.test(t)) {
      // 已含中文 → 防回环：默认整串跳过。
      // 唯一例外是 mixed 规则（上游把已汉化的面板标题拼进 title 的场景）。
      return runRules(t, true);
    }
    var d = dictOnly(t);                          // 词典直查（内部已做字母校验）
    if (d) return d;
    // RULES 不受"必须含 2 个连续字母"限制：
    // 覆盖 `12 / 30D`、`L 030°`、`2.5×`、`FPS 60` 等以数据为主的动态串
    var r = runRules(t, false);
    if (r !== null) return r;
    // 兜底：' · ' 复合串分段翻译（要求至少有一段是英文单词，避免误译纯数据）
    if (!/[A-Za-z]{2,}/.test(t)) return null;
    return translateSegments(t);
  }

  /* ---------- 原生弹窗 hook（DOM 注入覆盖不到，必须包装） ---------- */
  function hookDialogs() {
    if (typeof window === 'undefined') return;
    var nativeConfirm = window.confirm;
    var nativeAlert = window.alert;
    var nativePrompt = window.prompt;

    window.confirm = function (msg) {
      return nativeConfirm.call(window, lookup(msg) || msg);
    };
    window.alert = function (msg) {
      return nativeAlert.call(window, lookup(msg) || msg);
    };
    window.prompt = function (msg, def) {
      return nativePrompt.call(window, lookup(msg) || msg, def);
    };
  }

  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, INPUT: 1, CANVAS: 1, SVG: 1 };
  var done = typeof WeakSet !== 'undefined' ? new WeakSet() : null;

  /* Material Symbols 图标保护。
     图标 span 的文本内容不是文案，是字体连字码点（<span class="material-symbols-outlined">radio</span>）。
     一旦被词典译成中文，连字不成立 → 图标退化成方块或一串汉字。
     危险点在于这些值会和普通英文词撞车：radio(电台)、adjust(调节)、on(开)、normal(标准)、
     draw(手绘)、public、close、flight、navigation、east 全是常用词。
     上游还会在 JS 里动态换图标（cockpitLayout 切 chevron_left/right、celestialRing 建 light_mode），
     MutationObserver 会抓到这些 characterData 变更，所以必须在文本节点这层拦住，
     只靠"别往词典加图标名"是防不住的——上游随时可能加新图标名。 */
  function isIconNode(node) {
    if (!node || node.nodeType !== 1) return false;
    var cn = node.className;
    if (typeof cn === 'string' && /material-symbols/.test(cn)) return true;
    var cl = node.classList;
    return !!(cl && cl.contains && cl.contains('material-symbols-outlined'));
  }

  function translateNode(node) {
    if (node.nodeType === 3) {
      // 图标连字：父元素是 Material Symbols 容器就整段跳过
      if (node.parentNode && isIconNode(node.parentNode)) return;
      var out = lookup(node.data);
      if (out !== null && out !== node.data) node.data = out;
      return;
    }
    if (node.nodeType !== 1) return;
    if (SKIP_TAGS[node.tagName]) return;
    if (isIconNode(node)) return;
    if (node.hasAttribute && node.hasAttribute('data-gev-zh')) return;
    ['placeholder', 'title', 'aria-label', 'alt'].forEach(function (attr) {
      var v = node.getAttribute && node.getAttribute(attr);
      if (v) { var o = lookup(v); if (o) node.setAttribute(attr, o); }
    });
  }

  function walk(root) {
    if (!root || root.nodeType !== 1) return;
    translateNode(root);
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null);
    var n;
    while ((n = walker.nextNode())) {
      if (done && done.has(n)) continue;
      translateNode(n);
      if (done) done.add(n);
    }
  }

  function boot() {
    document.title = '上帝之眼 · God\'s Eye View';
    hookDialogs();
    walk(document.body);
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'characterData') { if (!done || !done.has(m.target)) translateNode(m.target); if (done) done.add(m.target); }
        else if (m.type === 'childList') { for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]); }
        else if (m.type === 'attributes') translateNode(m.target);
      }
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label', 'alt'] });
    // 兜底：Cesium 覆盖层等 canvas 外动态 DOM 周期补扫（仅未处理节点）
    setInterval(function () { walk(document.body); }, 4000);

    // 语言切换按钮
    var btn = document.createElement('button');
    btn.textContent = '中 / EN';
    btn.title = '切换界面语言';
    btn.style.cssText = 'position:fixed;top:10px;right:12px;z-index:99999;background:#10161d;color:#4dd8e6;border:1px solid #2a8a94;border-radius:6px;padding:6px 12px;font:12px Consolas,monospace;cursor:pointer;letter-spacing:1px;';
    btn.onclick = function () {
      try { localStorage.setItem('gev-lang', 'en'); } catch (e) {}
      location.reload();
    };
    (document.body || document.documentElement).appendChild(btn);
  }

  hookDialogs();   // 尽早 hook，避免 boot 之前已有弹窗调用
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
