window.READING_APPEARANCE_FIXTURE = {
  status: {
    left: "长夜余火 · 第 32 章",
    time: "10:30"
  },
  topControl: {
    bookTitle: "长夜余火",
    sourceLine: "起点中文网 · 第 32 章",
    sourceActionLabel: "换源"
  },
  readingText: [
    "雨，下了一整夜。",
    "城市像是被泼了一盆凉水，街灯昏黄，水面反着光，连呼吸都带着潮气。",
    "他站在巷口，手里攥着那封信。纸已经被雨水润湿，边角微微卷起，字迹却依旧清晰。",
    "“等你回来。”",
    "没有署名，只有短短四个字。",
    "他笑了笑，笑得很轻，像是自言自语。然后转身，沿着雨声走进夜里。"
  ],
  panel: {
    title: "界面",
    subtitle: "阅读外观",
    moreLabel: "更多外观 >",
    fontTitle: "字体",
    fontPreviewLabel: "预览",
    animationTitle: "翻页动画",
    animationPreview: "雨，下了一整夜。",
    resetLabel: "恢复默认",
    saveLabel: "保存主题",
    savingLabel: "保存中"
  },
  fontSize: {
    title: "字号",
    value: 18,
    minLabel: "-",
    plusLabel: "+"
  },
  lineSpacing: {
    title: "行距",
    options: [
      { label: "紧凑", type: "compact", active: false },
      { label: "标准", type: "standard", active: true },
      { label: "舒展", type: "wide", active: false }
    ]
  },
  themes: [
    { label: "纸张", type: "paper", background: "#fbf6ee", text: "#17130f", active: true },
    { label: "浅绿", type: "green", background: "#edf6ed", text: "#1c2a1d", active: false },
    { label: "夜间", type: "dark", background: "#1b1f1c", text: "#f7f0e8", active: false },
    { label: "暖黄", type: "warm", background: "#f1ddb4", text: "#2a2118", active: false }
  ],
  fonts: [
    { label: "系统宋体", meta: "当前字体", preview: "雨，下了一整夜。", active: true },
    { label: "思源宋体", meta: "适合长篇正文", preview: "城市像是被泼了一盆凉水。", active: false },
    { label: "系统黑体", meta: "清晰紧凑", preview: "水面反着光。", active: false }
  ],
  animations: [
    { label: "仿真滑动", type: "simulation", active: true },
    { label: "覆盖", type: "cover", active: false },
    { label: "无动画", type: "none", active: false }
  ],
  editTheme: {
    title: "编辑主题",
    backgroundLabel: "背景",
    textLabel: "文字",
    previewTitle: "预览",
    previewCopy: "雨，下了一整夜。城市像是被泼了一盆凉水。",
    colors: [
      { label: "纸张", value: "#fbf6ee", active: true },
      { label: "淡绿", value: "#edf6ed", active: false },
      { label: "夜黑", value: "#1b1f1c", active: false },
      { label: "暖黄", value: "#f1ddb4", active: false }
    ]
  },
  feedback: {
    loading: {
      title: "正在加载",
      copy: "正在读取字体和主题配置，请稍候。"
    },
    error: {
      title: "加载失败，请重试",
      copy: "字体列表加载失败，已保留当前阅读外观。",
      primaryAction: "重试"
    },
    offline: {
      title: "网络不可用，请稍后重试",
      copy: "本地外观仍可调整，在线字体暂不可用。",
      primaryAction: "知道了"
    },
    saved: {
      title: "保存成功",
      copy: "自定义主题已保存到阅读外观。"
    },
    failed: {
      title: "操作失败，请重试",
      copy: "保存失败，已保留当前选择。"
    }
  },
  moduleNav: [
    { label: "目录", type: "directory", active: false },
    { label: "朗读", type: "tts", active: false },
    { label: "界面", type: "appearance", active: true },
    { label: "设置", type: "settings", active: false }
  ],
  brightness: {
    title: "亮度",
    value: 56,
    autoLabel: "A",
    modeLabel: "系统"
  },
  bottomReadout: {
    progress: "38%",
    chapter: "第 32/128 章"
  }
};
