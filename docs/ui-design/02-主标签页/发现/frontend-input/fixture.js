window.DISCOVERY_HOME_FIXTURE = {
  status: {
    time: "10:30",
    battery: "82%"
  },
  topBar: {
    title: "发现"
  },
  search: {
    placeholder: "搜索书名、作者、关键词"
  },
  sourceTypes: [
    { label: "全部", type: "all", active: false },
    { label: "书源", type: "book-source", active: true },
    { label: "订阅", type: "subscription", active: false }
  ],
  currentSource: {
    title: "玄幻书源组",
    meta: "12 个来源",
    status: "分类随来源变化",
    actionLabel: "切换来源",
    iconLabel: "信息源"
  },
  categories: [
    { label: "全部", active: false },
    { label: "玄幻", active: true },
    { label: "都市", active: false },
    { label: "排行", active: false },
    { label: "新书", active: false },
    { label: "完结", active: false }
  ],
  categoryMoreLabel: "更多分类",
  content: {
    title: "玄幻书源组 · 玄幻",
    refreshLabel: "刷新",
    featured: [
      {
        title: "道诡异仙",
        author: "狐尾的笔",
        source: "笔趣阁",
        desc: "诡异修仙，踏破红尘问长生。",
        cover: "../../书架/bookshelf-cover-assets/mystery-lord.png",
        actionLabel: "阅读",
        inBookshelf: true
      },
      {
        title: "大奉打更人",
        author: "卖报小郎君",
        source: "起点中文网",
        desc: "打更人出世，大奉风云再起。",
        cover: "../../书架/bookshelf-cover-assets/bright-moon.png",
        actionLabel: "加入书架",
        inBookshelf: false
      }
    ]
  },
  statusBar: {
    sourceCount: "12 个来源",
    availableCount: "8 个可用",
    updatedAt: "刚刚更新",
    actionLabel: "检测"
  },
  ranking: {
    title: "来源榜单更新",
    moreLabel: "更多",
    items: [
      {
        rank: 1,
        title: "诡秘之主",
        author: "爱潜水的乌贼",
        source: "起点中文网",
        cover: "../../书架/bookshelf-cover-assets/mystery-lord.png",
        state: "连载中",
        tone: "orange"
      },
      {
        rank: 2,
        title: "三体",
        author: "刘慈欣",
        source: "三体宇宙",
        cover: "../../书架/bookshelf-cover-assets/three-body.png",
        state: "完结",
        tone: "muted"
      },
      {
        rank: 3,
        title: "凡人修仙传",
        author: "忘语",
        source: "笔趣阁",
        cover: "../../书架/bookshelf-cover-assets/renjian-cihua.png",
        state: "新上榜",
        tone: "green"
      }
    ]
  },
  feedback: {
    loading: {
      title: "正在切换来源类型",
      copy: "保留当前来源和分类，只刷新内容区。"
    },
    empty: {
      title: "当前来源暂无内容",
      copy: "可以刷新，或切换到其他来源。",
      primaryAction: "刷新",
      secondaryAction: "去管理来源"
    },
    error: {
      title: "来源加载失败",
      copy: "来源仍保留在当前上下文，可以重试或切换来源。",
      primaryAction: "重试",
      secondaryAction: "切换来源"
    },
    offline: {
      title: "网络不可用",
      copy: "离线时仍可浏览已缓存内容，联网后刷新来源。",
      primaryAction: "重试",
      secondaryAction: "查看缓存"
    }
  },
  bottomNav: [
    { label: "书架", type: "bookshelf", active: false },
    { label: "发现", type: "discover", active: true },
    { label: "RSS", type: "rss", active: false },
    { label: "设置", type: "settings", active: false }
  ]
};
