window.SOURCE_SWITCH_FIXTURE = {
  status: {
    left: "长夜余火 · 第 32 章",
    time: "10:30"
  },
  reader: {
    title: "长夜余火",
    chapter: "第 32 章",
    currentSource: "起点中文网",
    switchedSource: "书香阁",
    lines: [
      "雨， 下了一整夜。",
      "城市像是被泼了一盆凉水，街灯昏黄，水面反着光，连呼吸都带着潮气。",
      "他站在巷口，手里攥着那封信。纸已经被雨水润湿，边角微微卷起，字迹却依旧清晰。"
    ],
    progress: "38%",
    chapterProgress: "第 32 / 128 章"
  },
  controls: {
    quickActions: ["搜索", "自动翻页", "替换"],
    modules: ["目录", "朗读", "界面", "设置"],
    brightness: "亮度",
    system: "系统",
    previousChapter: "上一章"
  },
  sheet: {
    title: "换源",
    filters: ["全部", "更新快", "已缓存", "可用"],
    detectHint: "延迟越低越好，内容匹配度将在切换后校验。",
    cancelDetect: "取消检测"
  },
  sources: [
    {
      name: "起点中文网",
      badge: "当前",
      chapter: "第 32 章",
      updated: "刚刚",
      latency: "120ms",
      status: "可用",
      current: true,
      checking: false
    },
    {
      name: "书香阁",
      badge: "",
      chapter: "第 32 章",
      updated: "2 分钟前",
      latency: "98ms",
      status: "可用",
      current: false,
      checking: true
    },
    {
      name: "笔趣阁",
      badge: "",
      chapter: "第 32 章",
      updated: "5 分钟前",
      latency: "156ms",
      status: "可用",
      current: false,
      checking: false
    },
    {
      name: "本地缓存",
      badge: "",
      chapter: "第 32 章",
      updated: "昨天 23:15",
      latency: "本地",
      status: "可用",
      current: false,
      checking: false
    },
    {
      name: "旧源备份",
      badge: "",
      chapter: "第 31 章",
      updated: "3 天前",
      latency: "超时",
      status: "失效",
      current: false,
      checking: false
    }
  ],
  checking: {
    title: "正在检查",
    steps: [
      { label: "目录匹配", done: true },
      { label: "章节可读", done: true },
      { label: "内容校验", done: false }
    ],
    status: "检测中"
  },
  success: {
    title: "已切换到书香阁，阅读位置已保留",
    closeLabel: "关闭"
  },
  feedback: {
    loading: {
      title: "正在加载",
      copy: "正在刷新来源列表，请稍候。"
    },
    empty: {
      title: "暂无可用来源",
      copy: "当前章节没有可切换来源，可以稍后重试。",
      primaryAction: "重试检测"
    },
    error: {
      title: "加载失败，请重试",
      copy: "来源检测失败，已保留当前阅读页和阅读位置。",
      primaryAction: "重试"
    },
    offline: {
      title: "网络不可用，请稍后重试",
      copy: "本地缓存仍可阅读，联网后才能检测和切换来源。",
      primaryAction: "使用本地缓存"
    },
    permission: {
      title: "需要网络权限",
      copy: "检测来源需要访问网络，授权后才能刷新可用结果。",
      primaryAction: "去授权"
    }
  }
};
