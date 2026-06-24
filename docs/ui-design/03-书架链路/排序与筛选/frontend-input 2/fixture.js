window.SORT_FILTER_FIXTURE = {
  status: {
    time: "9:41"
  },
  backdrop: {
    title: "书架",
    groups: [
      { label: "全部", active: true },
      { label: "长篇追读", active: false },
      { label: "资料", active: false },
      { label: "未分组", active: false }
    ],
    books: [
      {
        title: "深空信号",
        meta: "最近阅读 · 有更新 · 已缓存",
        cover: "../../../02-主标签页/书架/bookshelf-cover-assets/long-night.png"
      },
      {
        title: "纸上群山",
        meta: "网络书 · 未缓存",
        cover: "../../../02-主标签页/书架/bookshelf-cover-assets/renjian-cihua.png"
      },
      {
        title: "雨线手记",
        meta: "本地书 · 已缓存",
        cover: "../../../02-主标签页/书架/bookshelf-cover-assets/bright-moon.png"
      }
    ]
  },
  sheet: {
    title: "排序与筛选",
    sections: [
      {
        title: "排序方式",
        mode: "single",
        options: [
          { label: "最近阅读", type: "recent-read", active: true },
          { label: "最近更新", type: "recent-update", active: false },
          { label: "加入时间", type: "added-at", active: false },
          { label: "书名", type: "title", active: false }
        ]
      },
      {
        title: "排序顺序",
        mode: "single",
        options: [
          { label: "降序", type: "desc", active: true },
          { label: "升序", type: "asc", active: false }
        ]
      },
      {
        title: "筛选条件",
        mode: "multi",
        options: [
          { label: "全部", type: "all", active: true },
          { label: "本地书", type: "local", active: false },
          { label: "网络书", type: "network", active: true },
          { label: "有更新", type: "updated", active: true },
          { label: "已缓存", type: "cached", active: false }
        ]
      }
    ],
    resetLabel: "重置",
    applyLabel: "应用"
  },
  feedback: {
    empty: {
      title: "筛选后没有书籍",
      copy: "当前条件没有匹配结果，可以重置后重新筛选。",
      primaryAction: "重置",
      secondaryAction: "返回"
    },
    error: {
      title: "操作失败，请重试",
      copy: "已保留当前排序和筛选选择，可以重新应用。",
      primaryAction: "重试",
      secondaryAction: "取消"
    }
  },
  toast: {
    success: "保存成功"
  }
};
