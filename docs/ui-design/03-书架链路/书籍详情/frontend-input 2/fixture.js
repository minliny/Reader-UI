window.BOOK_DETAIL_FIXTURE = {
  status: {
    time: "10:30"
  },
  topBar: {
    title: "书籍信息"
  },
  book: {
    title: "长夜余火",
    author: "爱潜水的乌贼",
    source: "起点中文网",
    latest: "第 1862 章 新世界",
    cover: "../../../02-主标签页/书架/bookshelf-cover-assets/long-night.png",
    inBookshelf: true,
    readAction: "开始阅读",
    bookshelfAction: "已加入"
  },
  progress: {
    current: "第 32 章 雨夜",
    label: "当前阅读",
    percent: 38
  },
  chapters: [
    { title: "第 1862 章 新世界", state: "未读", isNew: true },
    { title: "第 1861 章 旧日回声", state: "未读", isNew: true },
    { title: "第 1860 章 雨停之后", state: "未读", isNew: false },
    { title: "第 1859 章 灰土边界", state: "未读", isNew: false },
    { title: "第 1858 章 北方来信", state: "未读", isNew: false },
    { title: "第 1857 章 火种", state: "未读", isNew: false },
    { title: "第 1856 章 漫长街区", state: "已读", isNew: false },
    { title: "第 1855 章 另一盏灯", state: "已读", isNew: false },
    { title: "第 1854 章 夜行者", state: "已读", isNew: false },
    { title: "第 1853 章 旧城风声", state: "已读", isNew: false },
    { title: "第 1852 章 回到营地", state: "已读", isNew: false },
    { title: "第 1851 章 雾中车站", state: "已读", isNew: false },
    { title: "第 1850 章 通讯恢复", state: "已读", isNew: false },
    { title: "第 1849 章 追踪痕迹", state: "已读", isNew: false },
    { title: "第 1848 章 荒原灯塔", state: "已读", isNew: false },
    { title: "第 1847 章 秘密通道", state: "已读", isNew: false },
    { title: "第 1846 章 机械残响", state: "已读", isNew: false },
    { title: "第 1845 章 黄昏会面", state: "已读", isNew: false },
    { title: "第 1844 章 新的委托", state: "已读", isNew: false },
    { title: "第 1843 章 火光尽头", state: "已读", isNew: false }
  ],
  chapterFooter: "共 20 章预览，继续下滑查看更多",
  intro: {
    title: "简介",
    actionLabel: "展开",
    copy: "灰土荒原上，余烬燃烧。长夜降临，火种不熄。旧世界留下的线索仍在雨夜中闪动，新的旅程从一座沉默的城市展开。"
  },
  feedback: {
    loading: {
      title: "正在加载",
      copy: "保留已存在的书籍信息，只刷新章节和来源状态。"
    },
    empty: {
      title: "暂无章节预览",
      copy: "可以刷新目录，或切换到其他可用来源。",
      primaryAction: "刷新目录",
      secondaryAction: "换源"
    },
    error: {
      title: "加载失败，请重试",
      copy: "书籍详情仍保留在当前页面，可以重试或切换来源。",
      primaryAction: "重试",
      secondaryAction: "换源"
    },
    offline: {
      title: "网络不可用，请稍后重试",
      copy: "已缓存章节仍可阅读，联网后可刷新来源。",
      primaryAction: "阅读缓存",
      secondaryAction: "重试"
    },
    permission: {
      title: "需要本地访问权限",
      copy: "本地书籍详情需要访问授权，授权后才能刷新目录。",
      primaryAction: "去授权",
      secondaryAction: "取消"
    }
  },
  sourceSheet: {
    title: "可用来源",
    subtitle: "详情页内换源，不跳转阅读控制层。",
    refreshLabel: "刷新来源",
    cancelLabel: "取消",
    confirmLabel: "确认",
    sources: [
      { title: "起点中文网", meta: "当前使用 · 最新第 1862 章", current: true, available: true },
      { title: "笔趣阁", meta: "可用 · 最新第 1861 章", current: false, available: true },
      { title: "自定义书源", meta: "可用 · 章节延迟 2 章", current: false, available: true },
      { title: "缓存来源", meta: "离线可读 · 仅本地缓存", current: false, available: true }
    ]
  }
};
