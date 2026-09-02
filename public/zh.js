/* God's Eye View 汉化补丁（运行时注入，不改核心源码）
 * 启用：index.html 引入本脚本 + localStorage['gev-lang']='zh'
 * 切换：界面右上角「中/EN」按钮（切换后自动刷新）
 */
(function () {
  'use strict';
  var LANG = 'zh';
  try { if ((localStorage.getItem('gev-lang') || LANG) !== 'zh') return; } catch (e) { return; }

  /* ---------- 词典（键为英文原文，trim 后精确匹配，大小写多形态回退） ---------- */
  var DICT = {
    // 品牌 / 标语
    "GOD'S EYE": '上帝之眼', "God's Eye View": '上帝之眼', "VIEW": '视角',
    'NO PLACE LEFT BEHIND': '不遗漏世界任何角落',
    'Initializing systems...': '正在初始化系统...',
    'Initializing photorealistic world...': '正在初始化写实世界...',
    'Data attribution': '数据归属说明',
    // 主面板
    'ACTIVE STYLE': '当前风格', 'NORMAL': '标准', 'Normal': '标准',
    'DATA LAYERS': '数据图层', 'SCENES': '场景', 'DISPLAY': '显示',
    'CCTV': '公共监控', 'CONTEXT': '情报', 'LOCATION': '定位',
    'VISUAL PRESETS': '视觉预设', 'POWER UP': '增强配置',
    'Power up the globe': '为地球注入增强能力',
    'GROUND STATION · PROVIDER SETTINGS': '地面站 · 数据源配置',
    'SAVE KEYS': '保存密钥', 'MAP SOURCE': '地图源',
    'OpenSky': 'OpenSky 航班', 'OpenStreetMap': 'OpenStreetMap', 'AISStream': 'AISStream 船舶',
    // 首次启动向导
    'MISSION CONTROL · FIRST LAUNCH': '任务控制 · 首次启动',
    'Choose your first view': '选择你的第一个视角',
    "It feels like a forbidden cockpit—then you realize the sources are public and the data is real.":
      '它看起来像禁用的驾驶舱——但你会意识到：数据源全部公开，数据全部真实。',
    'LIVE CONTACTS': '实时目标',
    'Aircraft, vessels and nearby intelligence': '飞机、船舶与周边情报',
    'SPACE MISSIONS': '太空任务',
    'Launches, spacecraft and orbital context': '发射、航天器与轨道态势',
    'ENVIRONMENTAL': '环境事件',
    'Live earthquakes and active fires, from USGS and NASA': '来自 USGS 与 NASA 的实时地震与活跃火点',
    'EXPLORE MANUALLY': '自由探索', 'Begin with a clean globe': '从一颗干净的地球开始',
    "Don't show this again": '不再显示', 'ESC to dismiss': '按 ESC 关闭', 'ESC to close': '按 ESC 关闭',
    'Tip: the GEV MIC button in the dock lets you talk to the map.': '提示：底座上的 GEV MIC 按钮可让你用语音指挥地图。',
    // 情报面板
    'CONTACTS': '目标', 'CONTACT': '目标', 'CONTACTS · 250 KM': '目标 · 250 公里',
    'CONTACTS — nearest planes · vessels · sites': '目标 — 最近的飞机 · 船舶 · 设施',
    'SEARCH NEARBY SITES': '搜索附近设施', 'COCKPIT': '驾驶舱',
    'FOCUS': '聚焦', 'NEXT': '下一个', 'PREV': '上一个',
    'Flights': '民航航班', 'Military flights': '军用航班', 'AIS vessels': 'AIS 船舶',
    'Mapped installations': '已标注设施',
    'OpenSky Network · observed or mapped nearby context': 'OpenSky 网络 · 观测或已标注的周边态势',
    'adsb.lol · no observed or mapped objects in current feeds': 'adsb.lol · 当前信号源中暂无观测或已标注目标',
    'AISStream · feed unavailable': 'AISStream · 信号源不可用',
    'NEAREST': '最近', 'NEAREST OBSERVED / MAPPED': '最近观测 / 已标注',
    'OBSERVED / MAPPED PINGS': '观测 / 已标注信号',
    'SELECT CONTACTS TO LOAD OBSERVED / MAPPED PROXIMITY': '选择目标以加载观测/已标注的周边态势',
    'ENABLE GLOBAL CONTEXT FOR PROXIMITY PINGS': '启用全球情报以接收周边信号',
    'CONTEXT ONLY': '仅情报', 'CONTEXT STANDBY': '情报待命', 'SELECT CONTEXT': '选择情报',
    // HUD 抬头显示
    'TOP SECRET // SI-TK // NOFORN': '绝密 // SI-TK // 禁止外传',
    'AVAILABLE INPUTS ONLY · NOT AN ALL-CLEAR': '仅含可用输入 · 非全面许可',
    'SUMMARY': '摘要', 'LOCAL': '本地', 'LOCAL INFO': '本地信息',
    'LIVE SIGNALS': '实时信号', 'LIVE TRACK': '实时轨迹',
    'LIVE TRACK · COURSE ALIGNED': '实时轨迹 · 航向对齐',
    'ALTITUDE': '高度', 'ALTITUDE · FT': '高度 · 英尺',
    'GROUND SPEED': '地速', 'GROUND SPEED · KTS': '地速 · 节',
    'AIRCRAFT': '飞行器', 'COMMERCIAL FLIGHT': '民航航班', 'COMMERCIAL': '民航',
    'ESTIMATED FLIGHT PLAN': '估算飞行计划', 'ARROW · ESTIMATED DIRECTION': '箭头 · 估算方向',
    'VISOR LOCK · ACTIVE': '目镜锁定 · 激活', 'FIRST PERSON': '第一人称',
    'EXIT COCKPIT': '退出驾驶舱', 'EXIT CLEAN VIEW': '退出纯净视图', 'Clean UI': '纯净界面',
    'CAPTURE SHOT': '抓拍', 'UPDATE SHOT': '更新截图',
    'CALIBRATION': '校准', 'CALIBRATED': '已校准', 'SAVE CAL': '保存校准', 'RESET CAL': '重置校准',
    'CAL · --': '校准 · --',
    // 图层 / 状态
    'SYNCING ROAD NETWORK': '正在同步路网', 'LOADING LIVE DATA': '正在加载实时数据',
    'LOADING 30-DAY MISSION INDEX': '正在加载 30 天任务索引',
    'ACQUIRING REGIONAL NEWS': '正在获取区域新闻', 'ACQUIRING SURFACE': '正在获取地表',
    'ACQUIRING': '获取中', 'RESOLVING REGION': '正在解析区域',
    'ROUTE DATA UNAVAILABLE': '航线数据不可用', 'SOURCE · UNKNOWN': '来源 · 未知',
    'UNKNOWN': '未知', 'READY': '就绪', 'Ready': '就绪', 'RADIO READY': '电台就绪', 'Radio off': '电台关闭',
    'ENABLE': '启用', 'DISABLE': '禁用', 'DETECT': '探测', 'RESET': '重置',
    'COVERAGE OFF': '覆盖 关', 'COVERAGE ON': '覆盖 开',
    'CCTV OFF': '监控 关', 'CCTV ON': '监控 开',
    'CYCLE OFF': '轮巡 关', 'CYCLE ON': '轮巡 开',
    'AUTO HOP OFF': '自动跳转 关', 'AUTO HOP ON': '自动跳转 开',
    'Enable CCTV to load camera intersections': '启用公共监控以加载摄像头交汇',
    'Enable CCTV to start camera-linked intelligence summaries.': '启用公共监控以开始摄像头关联的情报摘要。',
    'Enable Radio, then choose a globe marker or use next.': '启用电台后，选择地球标记或使用「下一个」。',
    'PROJECTION ON': '投影 开启', 'SNAPS TO AVAILABLE STATIONS': '自动吸附可用电台',
    'DRAG TO TUNE': '拖动调谐', 'ALL · DRAG THE NEEDLE': '全部 · 拖动指针',
    'DIRECTORY BAND': '目录频段', 'DIRECTORY: RADIO BROWSER': '目录：Radio Browser',
    'NO STATION SELECTED': '未选择电台', 'STATION SITE': '电台站点', 'STATION TAG': '电台标签',
    'RADIO': '电台', 'PLAY': '播放', 'STOP': '停止', 'VOLUME': '音量', 'LEVEL': '电平',
    'SOURCE-BACKED EVENTS · NO SYNTHETIC NEWS': '基于信源的事件 · 无合成新闻',
    'GOOGLE NEWS RSS · LOCATION QUERY · RECENT': 'Google 新闻 RSS · 位置查询 · 近期',
    'LATEST LOCATION-MATCHED REPORTING': '最新位置匹配报道', 'NEWS': '新闻',
    'SCENE SUMMARY': '场景摘要', 'RUN LOG': '运行日志',
    'AVAILABLE MISSIONS': '可用任务', 'SELECT A MISSION TO INSPECT': '选择任务以查看',
    'NO AVAILABLE EXAMPLE': '暂无可用示例',
    'SPACE MISSIONS — launches & orbital assets': '太空任务 — 发射与轨道资产',
    // 视觉预设
    'FLIR': '热成像', 'Tactical': '战术', 'Noir': '黑色电影', 'Anime': '动漫',
    'Celestial': '星空', 'Minimal': '极简', 'Style': '风格',
    'Bloom': '泛光', 'Density': '密度', 'Sharpen': '锐化', 'Proximity': '邻近感',
    'Fade': '衰减', 'Feather': '羽化', 'Elastic': '弹性', 'Weighted': '加权',
    'Scope': '视野', 'Layout': '布局', 'Models': '模型', 'Operator': '操作员', 'Outside': '外部',
    'PARAMETERS': '参数', 'ADJUST': '调节', 'ADJUST ON': '调节 开',
    'EXPORT PRESETS': '导出预设', 'IMPORT': '导入',
    'Weather data by Open-Meteo.com': '天气数据来自 Open-Meteo.com',
    'OPEN-METEO': 'OPEN-METEO 气象', 'TEMP': '气温', 'WIND': '风', 'PRECIP': '降水',
    'CLOUD UNKNOWN': '云量未知', 'DIR UNKNOWN': '方向未知', 'DISTANCE UNKNOWN': '距离未知',
    // 语音
    'VOICE STANDBY': '语音待命', 'AI AGENT': 'AI 智能体', 'ON/OFF': '开/关',
    'loading frames': '正在加载画面', 'syncing road network': '正在同步路网',
    'FROM': '自', 'CURRENT': '当前', 'SITE': '设施', 'VIEW': '视角',
    'FOV --': '视场 --', 'HDG --': '航向 --', 'HGT --': '高度 --', 'PITCH --': '俯仰 --', 'RANGE --': '距离 --',
    'DEST ---°': '目的 ---°', 'ΔE --': '东偏 --', 'ΔN --': '北偏 --',
    'ESC EXIT': '按 ESC 退出',
    'REC': '录制'
  };

  /* ---------- 动态串规则（正则 → 译文函数） ---------- */
  var RULES = [
    [/^Flying to (.+)$/i, function (m) { return '正在飞往 ' + m[1] + '...'; }],
    [/^●?\s*REC (.+)$/i, function (m) { return '● 录制 ' + m[1]; }],
    [/^POWER UP · (\d+) KEYS WAITING$/i, function (m) { return '增强配置 · ' + m[1] + ' 个密钥待配置'; }],
    [/^ORB: (\S+)\s+PASS: (\S+)$/i, function (m) { return '轨道: ' + m[1] + ' 过境: ' + m[2]; }],
    [/^GSD: (.+?) NIIRS: (.+)$/i, function (m) { return '地面采样: ' + m[1] + ' 影像等级: ' + m[2]; }],
    [/^ALT: (.+?) SUN: (.+)$/i, function (m) { return '高度: ' + m[1] + ' 太阳角: ' + m[2]; }],
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
    [/^GRID: (.+)$/, function (m) { return '格网: ' + m[1]; }]
  ];

  function lookup(raw) {
    var t = String(raw).replace(/\s+/g, ' ').trim();
    if (!t || t.length < 2) return null;
    if (/[一-鿿]/.test(t)) return null;           // 已含中文，跳过（防回环）
    if (!/[A-Za-z]{2,}/.test(t)) return null;      // 无英文字母，跳过
    if (DICT[t]) return DICT[t];
    var u = t.toUpperCase();
    if (DICT[u]) return DICT[u];
    var l = t.toLowerCase();
    if (DICT[l]) return DICT[l];
    for (var i = 0; i < RULES.length; i++) {
      var m = t.match(RULES[i][0]);
      if (m) return RULES[i][1](m);
    }
    return null;
  }

  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, INPUT: 1, CANVAS: 1, SVG: 1 };
  var done = typeof WeakSet !== 'undefined' ? new WeakSet() : null;

  function translateNode(node) {
    if (node.nodeType === 3) {
      var out = lookup(node.data);
      if (out !== null && out !== node.data) node.data = out;
      return;
    }
    if (node.nodeType !== 1) return;
    if (SKIP_TAGS[node.tagName]) return;
    if (node.hasAttribute && node.hasAttribute('data-gev-zh')) return;
    ['placeholder', 'title', 'aria-label'].forEach(function (attr) {
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
    walk(document.body);
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'characterData') { if (!done || !done.has(m.target)) translateNode(m.target); if (done) done.add(m.target); }
        else if (m.type === 'childList') { for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]); }
        else if (m.type === 'attributes') translateNode(m.target);
      }
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label'] });
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
