window.PRIVACY_PERMISSIONS_FIXTURE = {
  pageClass: "pv-page-frame",
  stateClass: "pv-state-workbench",
  topBar: {
    title: "隐私与权限",
    backLabel: "返回"
  },
  sections: [
    {
      title: "系统权限",
      rows: [
        { type: "link", icon: "folder", title: "文件访问", meta: "访问设备上的文件和媒体内容", status: "已授权", statusTone: "good", value: "已允许" },
        { type: "link", icon: "bell", title: "通知权限", meta: "接收系统通知和消息提醒", status: "未授权", statusTone: "warn", actionLabel: "去设置" },
        { type: "link", icon: "battery", title: "电池优化", meta: "后台运行与电池使用受系统管理", value: "受系统管理" }
      ]
    },
    {
      title: "隐私设置",
      rows: [
        { type: "switch", icon: "eyeOff", title: "隐私开关", meta: "不记录最近阅读与搜索历史", enabled: false },
        { type: "switch", icon: "clock", title: "保存搜索历史", meta: "记录搜索关键词以便快速访问", enabled: true },
        { type: "switch", icon: "bug", title: "发送崩溃日志", meta: "仅在你主动确认后发送", enabled: false }
      ]
    },
    {
      title: "数据与说明",
      rows: [
        { type: "link", icon: "info", title: "网络访问说明", meta: "说明网络访问用途和可用边界" },
        { type: "link", icon: "file", title: "本地数据说明", meta: "了解本地数据的存储与使用" },
        { type: "link", icon: "shield", title: "隐私说明", meta: "查看隐私政策与相关条款" }
      ]
    }
  ],
  actions: [
    { tone: "danger", icon: "trash", title: "清除隐私数据", meta: "清除所有隐私相关数据与记录" }
  ],
  confirm: {
    title: "清除隐私数据？",
    copy: "清除后将移除搜索历史、阅读痕迹和本地隐私记录。",
    cancelLabel: "取消",
    confirmLabel: "确认清除"
  },
  toast: {
    success: "保存成功",
    error: "操作失败，请重试",
    permission: "需要系统权限"
  },
  states: [
    { key: "default", toast: "success", title: "隐私权限默认态", desc: "系统权限、隐私开关、数据说明和危险操作可见。" },
    { key: "confirm", title: "清除隐私确认态", desc: "清除隐私数据必须二次确认并说明影响范围。" },
    { key: "loading", title: "权限加载态", desc: "读取系统权限状态时保留页面结构。" },
    { key: "error", title: "权限读取失败态", desc: "读取失败保留入口并提供可恢复反馈。" },
    { key: "permission", toast: "permission", title: "系统权限态", desc: "未授权项提供去设置入口，不能进入空白页。" }
  ],
  stateSummary: "用于核对权限状态、隐私开关、说明入口和清除确认。"
};
