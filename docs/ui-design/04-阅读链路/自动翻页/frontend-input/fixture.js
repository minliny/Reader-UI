window.AUTO_PAGE_FIXTURE = {
  status: {
    left: "长夜余火 · 第 32 章",
    time: "10:30"
  },
  topControl: {
    title: "自动翻页",
    sourceLine: "长夜余火 · 第 32 章"
  },
  readingText: [
    "雨，下了一整夜。",
    "城市像是被泼了一盆凉水，街灯昏黄，水面反着光，连呼吸都带着潮气。",
    "他站在巷口，手里攥着那封信。纸已经被雨水润湿，边角微微卷起，字迹却依旧清晰。"
  ],
  speed: {
    title: "翻页速度",
    valueLabel: "每 8 秒一页",
    value: 42,
    slowLabel: "慢",
    fastLabel: "快"
  },
  modes: [
    { label: "滚动", active: false },
    { label: "翻页", active: true },
    { label: "仿真翻页", active: false }
  ],
  optionsTitle: "更多选项",
  options: [
    {
      title: "屏幕常亮",
      meta: "自动翻页时保持屏幕点亮",
      icon: "sun",
      enabled: true
    },
    {
      title: "到章末停止",
      meta: "当前章节结束后自动停止",
      icon: "bookmark",
      enabled: false
    },
    {
      title: "音量键调速",
      meta: "运行中用音量键微调速度",
      icon: "volume",
      enabled: false
    }
  ],
  actions: {
    cancelLabel: "取消",
    startLabel: "开始自动翻页",
    stopLabel: "停止"
  },
  runningCapsule: {
    title: "正在自动翻页",
    pausedTitle: "自动翻页已暂停",
    sentence: "每 8 秒一页 · 翻页模式",
    actionLabel: "暂停",
    continueLabel: "继续",
    stopLabel: "停止",
    settingsLabel: "设置"
  },
  feedback: {
    error: {
      title: "操作失败，请重试",
      copy: "当前章节暂时无法继续翻页，已停止自动翻页并保留阅读位置。",
      primaryAction: "重试"
    }
  }
};
