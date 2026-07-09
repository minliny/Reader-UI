window.ReaderAssetLibraryFixture = {
  meta: {
    title: "Reader 素材库",
    summary: "统一登记当前 30 张 UI 设计图、6 张书籍封面和当前输入件使用的图标 token。",
    version: "2026-06-20",
    screenCount: 30,
    bookCoverCount: 6,
    fixtureIconTokenCount: 55,
    validationScreenshotCount: 60
  },
  screenGroups: [
    {
      title: "主标签页（Main Tabs）",
      items: [
        { name: "书架（Bookshelf）", path: "../../02-主标签页/书架/UI设计图.png", shell: "MainTabShell" },
        { name: "发现（Discover）", path: "../../02-主标签页/发现/UI设计图.png", shell: "MainTabShell" },
        { name: "RSS（RSS）", path: "../../02-主标签页/RSS/UI设计图.png", shell: "MainTabShell" },
        { name: "设置（Settings）", path: "../../02-主标签页/设置/UI设计图.png", shell: "MainTabShell" }
      ]
    },
    {
      title: "书架链路（Library Flow）",
      items: [
        { name: "书架空状态（Bookshelf Empty）", path: "../../03-书架链路/书架空状态/UI设计图.png", shell: "MainTabShell" },
        { name: "书籍搜索（Book Search）", path: "../../03-书架链路/书籍搜索/UI设计图.png", shell: "LibraryShell" },
        { name: "书籍详情（Book Detail）", path: "../../03-书架链路/书籍详情/UI设计图.png", shell: "LibraryShell" },
        { name: "书籍目录（Book Directory）", path: "../../03-书架链路/书籍目录/UI设计图.png", shell: "LibraryShell" },
        { name: "排序与筛选（Sort and Filter）", path: "../../03-书架链路/排序与筛选/UI设计图.png", shell: "LibraryShell" },
        { name: "书籍操作底表（Book Action Sheet）", path: "../../03-书架链路/书籍操作底表/UI设计图.png", shell: "LibraryShell" },
        { name: "分组管理（Group Management）", path: "../../03-书架链路/分组管理/UI设计图.png", shell: "LibraryShell" },
        { name: "本地书导入（Local Book Import）", path: "../../03-书架链路/本地书导入/UI设计图.png", shell: "LibraryShell" }
      ]
    },
    {
      title: "阅读链路（Reader Flow）",
      items: [
        { name: "阅读控制层（Reader Control Layer）", path: "../../04-阅读链路/阅读控制层/UI设计图.png", shell: "ReaderShell" },
        { name: "目录与书签（TOC and Bookmarks）", path: "../../04-阅读链路/目录与书签/UI设计图.png", shell: "ReaderShell" },
        { name: "阅读外观（Reading Appearance）", path: "../../04-阅读链路/阅读外观/UI设计图.png", shell: "ReaderShell" },
        { name: "朗读（TTS）", path: "../../04-阅读链路/朗读/UI设计图.png", shell: "ReaderShell" },
        { name: "阅读设置（Reader Settings）", path: "../../04-阅读链路/阅读设置/UI设计图.png", shell: "ReaderShell" },
        { name: "自动翻页（Auto Page）", path: "../../04-阅读链路/自动翻页/UI设计图.png", shell: "ReaderShell" },
        { name: "内容搜索（Content Search）", path: "../../04-阅读链路/内容搜索/UI设计图.png", shell: "ReaderShell" },
        { name: "内容替换（Content Replacement）", path: "../../04-阅读链路/内容替换/UI设计图.png", shell: "ReaderShell" },
        { name: "阅读入口（Reading Entry）", path: "../../04-阅读链路/阅读入口/UI设计图.png", shell: "ReaderShell" },
        { name: "沉浸阅读（Immersive Reading）", path: "../../04-阅读链路/沉浸阅读/UI设计图.png", shell: "ReaderShell" },
        { name: "换源（Source Switching）", path: "../../04-阅读链路/换源/UI设计图.png", shell: "FlowShell" }
      ]
    },
    {
      title: "设置链路（Settings Flow）",
      items: [
        { name: "通用设置（General Settings）", path: "../../05-设置链路/App通用设置/UI设计图.png", shell: "SettingsShell" },
        { name: "书架与搜索设置（Bookshelf and Search Settings）", path: "../../05-设置链路/书架与搜索设置/UI设计图.png", shell: "SettingsShell" },
        { name: "关于与反馈（About and Feedback）", path: "../../05-设置链路/关于与反馈/UI设计图.png", shell: "SettingsShell" },
        { name: "同步与备份（Sync and Backup）", path: "../../05-设置链路/同步与备份/UI设计图.png", shell: "SettingsShell" },
        { name: "书源管理（Source Management）", path: "../../05-设置链路/书源管理/UI设计图.png", shell: "SettingsShell" }
      ]
    }
  ],
  bookCovers: [
    { name: "长夜余火（Long Night）", path: "../../02-主标签页/书架/bookshelf-cover-assets/long-night.png" },
    { name: "三体（Three Body）", path: "../../02-主标签页/书架/bookshelf-cover-assets/three-body.png" },
    { name: "诡秘之主（Mystery Lord）", path: "../../02-主标签页/书架/bookshelf-cover-assets/mystery-lord.png" },
    { name: "人间词话（Renjian Cihua）", path: "../../02-主标签页/书架/bookshelf-cover-assets/renjian-cihua.png" },
    { name: "明月几时有（Bright Moon）", path: "../../02-主标签页/书架/bookshelf-cover-assets/bright-moon.png" },
    { name: "Android Notes（Android Notes）", path: "../../02-主标签页/书架/bookshelf-cover-assets/android-notes.png" }
  ],
  iconGroups: [
    { title: "导航图标（Navigation Icons）", items: ["bookshelf", "discover", "rss", "settings", "back", "more", "search", "chevron", "chevron-left", "close"] },
    { title: "阅读图标（Reader Icons）", items: ["directory", "tts", "appearance", "auto-page", "replace", "reader-content-search", "reader-auto-page", "reader-content-replace", "reader-module-directory", "reader-module-tts", "reader-module-appearance", "reader-module-settings", "bookmark", "book-open", "play", "pause", "stop", "volume", "sun", "night-mode", "current-location", "progress"] },
    { title: "书籍与来源图标（Book and Source Icons）", items: ["book", "source", "source-stack", "source-switch", "database", "storage", "folder", "folder-off", "file", "image", "download", "upload", "cloud"] },
    { title: "设置图标（Settings Icons）", items: ["home", "palette", "globe", "bell", "battery", "eyeOff", "bug", "shield", "permission", "trash", "gear", "columns", "grid", "badge"] },
    { title: "状态与动作图标（Status and Action Icons）", items: ["signal", "wifi", "clock", "check", "checkmark", "warning", "info", "refresh", "sync", "sort", "people", "link", "message", "mail", "phone", "monitor", "gesture", "assist", "motion", "top", "list", "edit", "log", "add", "text", "typo", "clear", "offline", "sparkle", "code", "help"] }
  ],
  supplementedIcons: ["back", "more", "chevron", "chevron-left", "close", "directory", "tts", "auto-page", "replace", "reader-content-search", "reader-auto-page", "reader-content-replace", "reader-module-directory", "reader-module-tts", "reader-module-appearance", "reader-module-settings", "pause", "stop", "book-open", "source-stack", "source-switch", "progress", "volume", "gear", "clear", "offline", "sparkle", "folder-off", "night-mode", "current-location", "permission", "code", "help", "signal", "wifi"],
  usageRules: [
    "新增页面前必须先查询素材库。",
    "已有图标 token 不得新增同义名称。",
    "缺少图标时先补 icons.js，再进入页面 renderer。",
    "UI 设计图只作为源图引用，验证截图只作为验收证据引用。",
    "封面素材可复用，但不得替代真实业务图片字段。"
  ]
};
