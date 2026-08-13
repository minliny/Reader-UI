window.CONTENT_SEARCH_FIXTURE = {
  status: {
    left: "长夜余火 · 第 32 章",
    time: "10:30"
  },
  search: {
    label: "搜索本书内容",
    query: "雨夜",
    placeholder: "输入关键词",
    resultCount: "18 处",
    clearLabel: "清空"
  },
  readingText: [
    "雨，下了一整夜。",
    "城市像是被泼了一盆凉水，街灯昏黄，水面反着光，连呼吸都带着潮气。",
    "他站在巷口，手里攥着那封信。纸已经被雨水润湿，边角微微卷起，字迹却依旧清晰。"
  ],
  panel: {
    title: "本书内容搜索",
    bookTitle: "长夜余火",
    resultCount: "18 处",
    tip: "点击结果跳转并高亮"
  },
  filters: [
    { label: "全部", active: false },
    { label: "章节名", active: false },
    { label: "正文", active: true },
    { label: "书签", active: false }
  ],
  results: [
    {
      title: "第 32 章 雨夜",
      meta: "第 3 段 · 约 38%",
      progressLabel: "当前章节",
      excerpt: "雨夜的风格外冷，仿佛能把人骨头里的热意都吹散。他把衣领竖起，沿着巷子往前走去。"
    },
    {
      title: "第 48 章 巷口",
      meta: "第 7 段 · 约 56%",
      progressLabel: "已缓存",
      excerpt: "他站在巷口，看着远处的灯影在雨夜里微微摇晃，像是随时都会熄灭。"
    },
    {
      title: "第 51 章 旧日回声",
      meta: "第 12 段 · 约 72%",
      progressLabel: "书签附近",
      excerpt: "那封信的墨迹已经有些模糊，但在雨夜的光里，她仿佛还能看见当年的字迹。"
    },
    {
      title: "第 68 章 城市",
      meta: "第 5 段 · 约 21%",
      progressLabel: "章节中段",
      excerpt: "雨夜的城市总是安静得过分，只有雨声在屋檐下不断敲打。"
    }
  ],
  feedback: {
    loading: {
      title: "正在加载",
      copy: "正在检索本书正文，请稍候。"
    },
    empty: {
      title: "无匹配结果",
      copy: "当前关键词没有命中正文，换个词或切换到全部范围再搜索。",
      primaryAction: "清空关键词"
    },
    error: {
      title: "搜索失败，请重试",
      copy: "本地索引暂时不可用，已保留关键词和当前阅读位置。",
      primaryAction: "重试"
    },
    offline: {
      title: "网络不可用，请稍后重试",
      copy: "本地缓存正文仍可搜索，在线章节暂不刷新。",
      primaryAction: "知道了"
    }
  }
};
