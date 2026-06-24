window.RSS_HOME_FIXTURE = {
  status: {
    time: "10:30",
    battery: "82%"
  },
  topBar: {
    title: "RSS"
  },
  summary: {
    title: "订阅概览",
    refreshLabel: "刷新",
    items: [
      { label: "个订阅源", value: "12", icon: "book" },
      { label: "条未读", value: "38", icon: "mail" },
      { label: "最近更新", value: "刚刚更新", meta: "10:30", icon: "clock" }
    ]
  },
  statusFilters: [
    { label: "全部", type: "all", active: true },
    { label: "未读", type: "unread", active: false },
    { label: "收藏", type: "favorite", active: false },
    { label: "稍后读", type: "later", active: false },
    { label: "书单", type: "booklist", active: false }
  ],
  sourceFilters: [
    { label: "全部来源", type: "all", active: true },
    { label: "小说更新", type: "novel", active: false },
    { label: "技术文章", type: "tech", active: false },
    { label: "书单推送", type: "booklist", active: false }
  ],
  entriesTitle: "最新订阅",
  entries: [
    {
      title: "《长夜余火》更新到第 33 章",
      source: "小说更新",
      excerpt: "雨夜之后，旧城线索继续展开。",
      time: "12 分钟前",
      cover: "../../书架/bookshelf-cover-assets/long-night.png",
      unread: true,
      menuLabel: "更多"
    },
    {
      title: "本周 Android Compose 动画笔记",
      source: "技术文章",
      excerpt: "整理了过渡、手势和性能优化。",
      time: "35 分钟前",
      cover: "../../书架/bookshelf-cover-assets/android-notes.png",
      unread: true,
      menuLabel: "更多"
    },
    {
      title: "六月完结书单精选",
      source: "书单推送",
      excerpt: "悬疑、科幻、修真共 18 本。",
      time: "1 小时前",
      cover: "../../书架/bookshelf-cover-assets/renjian-cihua.png",
      unread: true,
      menuLabel: "更多"
    },
    {
      title: "诡秘之主番外整理",
      source: "小说更新",
      excerpt: "新增章节索引和来源链接。",
      time: "2 小时前",
      cover: "../../书架/bookshelf-cover-assets/mystery-lord.png",
      unread: true,
      menuLabel: "更多"
    }
  ],
  footer: "已显示最新 24 条",
  feedback: {
    loading: {
      title: "订阅流刷新中",
      copy: "保留订阅概览和筛选条件，只刷新列表内容。"
    },
    empty: {
      title: "还没有订阅内容",
      copy: "添加订阅源后，最新内容会显示在这里。",
      primaryAction: "添加订阅源",
      secondaryAction: "刷新"
    },
    unreadEmpty: {
      title: "当前没有未读内容",
      copy: "筛选条件仍保留，可以切回全部查看历史订阅。",
      primaryAction: "查看全部",
      secondaryAction: "刷新"
    },
    error: {
      title: "订阅流加载失败",
      copy: "保留上次订阅框架，可以重试刷新。",
      primaryAction: "重试",
      secondaryAction: "查看缓存"
    }
  },
  bottomNav: [
    { label: "书架", type: "bookshelf", active: false },
    { label: "发现", type: "discover", active: false },
    { label: "RSS", type: "rss", active: true },
    { label: "设置", type: "settings", active: false }
  ]
};
