window.SYNC_BACKUP_FIXTURE = {
  pageClass: "sb-page-frame",
  stateClass: "sb-state-workbench",
  topBar: {
    title: "同步与备份",
    backLabel: "返回"
  },
  sections: [
    {
      title: "本地备份",
      rows: [
        { type: "link", icon: "clock", title: "立即备份", meta: "手动备份所有数据到本地", value: "今天 10:30" },
        { type: "switch", icon: "clock", title: "自动备份", meta: "每天保留最近 7 份备份", enabled: true },
        { type: "select", icon: "folder", title: "备份位置", meta: "选择本地备份文件存储位置", value: "内部存储" },
        { type: "link", icon: "upload", title: "导出数据", meta: "将数据导出为文件到本地" },
        { type: "link", icon: "download", title: "恢复备份", meta: "从备份文件导入数据并恢复" }
      ]
    },
    {
      title: "WebDAV",
      rows: [
        { type: "link", icon: "source", title: "WebDAV 未配置", meta: "配置 WebDAV 以同步数据", actionLabel: "去配置" },
        { type: "switch", icon: "refresh", title: "自动同步阅读进度", meta: "通过 WebDAV 自动同步阅读进度", enabled: false },
        { type: "select", icon: "warning", title: "同步冲突处理", meta: "当出现数据冲突时如何处理", value: "询问我" }
      ]
    },
    {
      title: "同步状态",
      rows: [
        { type: "link", icon: "refresh", title: "上次同步：尚未同步", meta: "暂无同步记录", actionLabel: "立即同步" },
        { type: "link", icon: "warning", title: "同步失败", meta: "WebDAV 未配置时无法自动同步", status: "待配置", statusTone: "warn" }
      ]
    }
  ],
  records: [
    { icon: "file", title: "备份记录 2026-06-20 10:30", meta: "本地备份 · 12.8 MB", status: "可恢复", tone: "good" },
    { icon: "file", title: "备份记录 2026-06-19 22:10", meta: "本地备份 · 12.4 MB", status: "已校验", tone: "info" }
  ],
  confirm: {
    title: "恢复备份？",
    copy: "恢复备份会覆盖当前书架、阅读进度和设置，请确认已完成当前数据备份。",
    cancelLabel: "取消",
    confirmLabel: "确认恢复"
  },
  empty: {
    title: "暂无备份记录",
    copy: "立即备份后会在这里显示备份记录。",
    primaryAction: "立即备份"
  },
  toast: {
    success: "保存成功",
    error: "同步失败",
    offline: "网络不可用，请稍后重试",
    permission: "需要文件访问权限"
  },
  states: [
    { key: "default", title: "同步备份默认态", desc: "本地备份、WebDAV、同步状态和备份记录可见。" },
    { key: "confirm", title: "恢复备份确认态", desc: "恢复备份必须说明覆盖范围并二次确认。" },
    { key: "loading", title: "备份读取态", desc: "读取备份记录时保留页面骨架。" },
    { key: "empty", title: "无备份记录态", desc: "没有备份时提供立即备份入口。" },
    { key: "error", title: "同步失败态", desc: "同步失败保留上下文并显示失败提示。" },
    { key: "default", toast: "offline", title: "离线同步态", desc: "离线时阻断 WebDAV 同步，不影响本地备份查看。" },
    { key: "permission", toast: "permission", title: "文件权限态", desc: "导出、恢复备份需要文件访问权限。" }
  ],
  stateSummary: "用于核对备份、恢复、自动同步、记录、离线、权限和冲突提示。"
};
