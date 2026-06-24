window.BOOKSHELF_EMPTY_FIXTURE = {
  status: {
    time: "9:41"
  },
  topBar: {
    title: "书架"
  },
  groups: [
    { label: "全部", active: false },
    { label: "长篇追读", active: true },
    { label: "资料", active: false },
    { label: "未分组", active: false }
  ],
  emptyState: {
    title: "当前分组没有书籍",
    copy: "可以切换分组，或把书籍移动到这个分组",
    illustrationLabel: "空书架",
    primaryAction: "搜索书籍",
    secondaryAction: "管理分组",
    hint: "全书架为空变体：书架还是空的 / 导入本地书"
  },
  variants: {
    allEmpty: {
      title: "书架暂无书籍",
      copy: "添加书籍后会出现在这里，也可以先导入本地书",
      primaryAction: "添加书籍",
      secondaryAction: "导入本地书",
      hint: "本地导入不是 P0 强制流程，点击后进入本地书导入页"
    },
    loading: {
      title: "正在加载",
      copy: "正在检查书架数据，常用入口和底部导航保持可用",
      primaryAction: "",
      secondaryAction: "",
      hint: "首次进入可使用骨架屏，局部刷新不清空整页"
    },
    error: {
      title: "加载失败，请重试",
      copy: "书架数据读取失败，保留当前分组和返回入口",
      primaryAction: "重试",
      secondaryAction: "换个分组看看",
      hint: "失败时保留用户当前上下文"
    },
    offline: {
      title: "网络不可用，请稍后重试",
      copy: "联网搜索暂不可用，本地导入和切换分组仍可使用",
      primaryAction: "导入本地书",
      secondaryAction: "换个分组看看",
      hint: "网络不可用只阻断依赖网络的动作"
    },
    permission: {
      title: "导入前再请求权限",
      copy: "选择本地书时说明用途，不提前请求全盘权限",
      primaryAction: "选择本地书",
      secondaryAction: "取消",
      hint: "未授权不得进入空白页"
    }
  },
  bottomNav: [
    { label: "书架", type: "bookshelf", active: true },
    { label: "发现", type: "discover", active: false },
    { label: "RSS", type: "rss", active: false },
    { label: "设置", type: "settings", active: false }
  ]
};
