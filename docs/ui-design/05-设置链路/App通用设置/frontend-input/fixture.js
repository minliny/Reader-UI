window.GENERAL_SETTINGS_FIXTURE = {
  topBar: {
    title: "通用设置",
    backLabel: "返回"
  },
  groups: [
    {
      title: "基础偏好",
      rows: [
        {
          type: "segment",
          icon: "palette",
          title: "App主题",
          value: "跟随系统",
          options: ["跟随系统", "浅色", "深色"]
        },
        {
          type: "select",
          icon: "globe",
          title: "语言",
          value: "简体中文",
          options: ["简体中文", "繁體中文", "English"]
        },
        {
          type: "select",
          icon: "home",
          title: "启动时打开",
          value: "书架",
          options: ["书架", "发现", "RSS", "设置"]
        }
      ]
    },
    {
      title: "行为与反馈",
      rows: [
        {
          type: "switch",
          icon: "refresh",
          title: "自动检查更新",
          meta: "有新版本时自动检查并提示",
          enabled: true
        },
        {
          type: "switch",
          icon: "top",
          title: "点击当前底栏回顶部",
          meta: "再次点击当前底栏按钮时回到页面顶部",
          enabled: true
        },
        {
          type: "switch",
          icon: "motion",
          title: "减少动态效果",
          meta: "降低动画效果以提升流畅度",
          enabled: true
        },
        {
          type: "switch",
          icon: "bug",
          title: "崩溃日志",
          meta: "仅保存本地诊断日志，便于排查问题",
          enabled: true,
          permission: "已开启"
        },
        {
          type: "select",
          icon: "play",
          title: "动画效果",
          meta: "设置界面内的动画播放效果强度",
          value: "标准",
          options: ["减少", "标准", "增强"]
        }
      ]
    }
  ],
  restore: {
    title: "恢复通用设置",
    confirmTitle: "恢复通用设置？",
    copy: "恢复后将重置 App 主题、语言、启动页面和行为偏好。",
    cancelLabel: "取消",
    confirmLabel: "确认恢复"
  },
  toast: {
    success: "保存成功",
    error: "操作失败，请重试",
    permission: "需要系统权限"
  },
  feedback: {
    loading: {
      title: "正在加载",
      copy: "正在读取通用设置，请稍候。"
    },
    error: {
      title: "加载失败，请重试",
      copy: "设置读取失败，已保留本地已知配置。",
      primaryAction: "重试"
    },
    permission: {
      title: "需要系统权限",
      copy: "崩溃日志需要系统日志权限，授权后才能继续保存。",
      primaryAction: "去设置"
    }
  }
};
