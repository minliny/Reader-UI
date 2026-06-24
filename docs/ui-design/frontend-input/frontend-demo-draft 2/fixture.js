window.READER_FRONTEND_DEMO_DRAFT_FIXTURE = {
  meta: {
    title: "前端 Demo 设计稿（Frontend Demo Draft）",
    subtitle: "按统一页面框架重制的前端输入稿，保留本地 UI 图作为参考源，不再从旧 Figma Make 页面直接拆结构。",
    sourceSpec: "/Users/minliny/Downloads/阅读器App_UI高保真设计规范_v2.md",
    screenCount: 30,
    shellCount: 5,
    iconSource: "asset-library/icons.js"
  },
  shells: [
    {
      name: "主标签页框架（MainTabShell）",
      pages: "书架、发现、RSS、设置",
      slots: "AppFrame / StatusBar / AppTopBar / ContentRegion / MainNav / StateHost",
      status: "四个 Tab 共享同一套底部导航和顶部结构"
    },
    {
      name: "书架链路框架（LibraryShell）",
      pages: "书架空状态、书籍搜索、详情、目录、排序筛选、底表、分组、本地导入",
      slots: "StackFrame / BackTopBar / ContentRegion / BottomActionHost / SheetHost / DialogHost / StateHost",
      status: "二级页共享返回顶栏、内容区和弹层宿主"
    },
    {
      name: "阅读器框架（ReaderShell）",
      pages: "阅读控制层、目录与书签、外观、朗读、设置、自动翻页、搜索、替换、入口、沉浸阅读",
      slots: "ReaderFrame / ReadingSurface / ReaderOverlayHost / ReaderModuleNav / BottomSheetHost / ReaderStateHost",
      status: "阅读正文底层和控制层分离，四模块按钮位置固定"
    },
    {
      name: "设置页框架（SettingsShell）",
      pages: "通用设置、书架搜索、隐私权限、缓存、关于反馈、同步备份、书源管理",
      slots: "SettingsFrame / BackTopBar / SettingsContent / SettingSection / ToastHost / DialogHost / SettingsStateHost",
      status: "七个设置二级页共享设置行、分组卡和状态宿主"
    },
    {
      name: "横向流程框架（FlowShell）",
      pages: "换源",
      slots: "FlowFrame / StepRegion / ComparisonRegion / ResultRegion / StateHost",
      status: "横向流程独立于竖屏 ReaderShell 和 MainTabShell"
    }
  ],
  status: {
    time: "10:30",
    battery: "82%"
  },
  covers: {
    longNight: "../../02-主标签页/书架/bookshelf-cover-assets/long-night.png",
    mysteryLord: "../../02-主标签页/书架/bookshelf-cover-assets/mystery-lord.png",
    brightMoon: "../../02-主标签页/书架/bookshelf-cover-assets/bright-moon.png",
    threeBody: "../../02-主标签页/书架/bookshelf-cover-assets/three-body.png",
    renjian: "../../02-主标签页/书架/bookshelf-cover-assets/renjian-cihua.png",
    androidNotes: "../../02-主标签页/书架/bookshelf-cover-assets/android-notes.png"
  },
  screenshots: [
    {
      title: "书架（Bookshelf）",
      shell: "MainTabShell",
      src: "../../02-主标签页/书架/UI设计图.png"
    },
    {
      title: "书籍详情（Book Detail）",
      shell: "LibraryShell",
      src: "../../03-书架链路/书籍详情/UI设计图.png"
    },
    {
      title: "阅读控制层（Reader Control Layer）",
      shell: "ReaderShell",
      src: "../../04-阅读链路/阅读控制层/UI设计图.png"
    },
    {
      title: "换源（Source Switching）",
      shell: "FlowShell",
      src: "../../04-阅读链路/换源/UI设计图.png"
    },
    {
      title: "App 通用设置（General Settings）",
      shell: "SettingsShell",
      src: "../../05-设置链路/App通用设置/UI设计图.png"
    }
  ],
  mainTabs: {
    nav: [
      { label: "书架", type: "bookshelf" },
      { label: "发现", type: "discover" },
      { label: "RSS", type: "rss" },
      { label: "设置", type: "settings" }
    ],
    books: [
      {
        title: "长夜余火",
        author: "爱潜水的乌贼",
        chapter: "第 32 章 雨夜",
        progress: "38%",
        coverKey: "longNight"
      },
      {
        title: "诡秘之主",
        author: "爱潜水的乌贼",
        chapter: "第 1426 章",
        progress: "58%",
        coverKey: "mysteryLord"
      },
      {
        title: "明朝那些事儿",
        author: "当年明月",
        chapter: "第 218 章",
        progress: "58%",
        coverKey: "brightMoon"
      },
      {
        title: "三体",
        author: "刘慈欣",
        chapter: "65%",
        progress: "65%",
        coverKey: "threeBody"
      }
    ],
    discovery: [
      { rank: "01", title: "长夜余火", meta: "优书网 · 今日热读", coverKey: "longNight" },
      { rank: "02", title: "诡秘之主", meta: "起点中文 · 完本精选", coverKey: "mysteryLord" },
      { rank: "03", title: "三体", meta: "本地书库 · 科幻", coverKey: "threeBody" }
    ]
  },
  library: {
    book: {
      title: "长夜余火",
      author: "爱潜水的乌贼",
      meta: "科幻 · 连载 · 83.6 万字",
      latest: "第 32 章 雨夜",
      source: "优书网 · 20 分钟前更新",
      coverKey: "longNight"
    },
    chapters: [
      { title: "第 30 章 旧日", state: "已读" },
      { title: "第 31 章 归途", state: "已读" },
      { title: "第 32 章 雨夜", state: "当前" },
      { title: "第 33 章 灯塔", state: "未读" }
    ]
  },
  reader: {
    status: {
      left: "长夜余火 · 38%",
      time: "10:30"
    },
    title: "长夜余火",
    sourceLine: "第 32 章 雨夜 · 优书网",
    readingText: [
      "雨夜的风格外冷，玻璃窗被吹得轻轻发响。",
      "他把书页往回翻了一页，确认刚才那句并不是自己的错觉。",
      "远处的灯光像被雾气揉碎，只剩下一团模糊的暖色。"
    ],
    quickActions: [
      { label: "搜索", type: "search" },
      { label: "自动翻页", type: "auto-page" },
      { label: "替换", type: "replace" }
    ],
    modules: [
      { label: "目录", type: "directory" },
      { label: "朗读", type: "tts" },
      { label: "界面", type: "appearance", active: true },
      { label: "设置", type: "settings" }
    ]
  },
  settings: {
    rows: [
      { icon: "palette", title: "主题与外观", meta: "跟随系统 · 暖纸背景", value: "默认" },
      { icon: "globe", title: "网络与书源", meta: "移动网络允许搜索", value: "已开启" },
      { icon: "shield", title: "隐私与权限", meta: "本地书、通知、剪贴板", value: "管理" },
      { icon: "storage", title: "缓存管理", meta: "封面、章节、日志缓存", value: "1.2 GB" }
    ]
  },
  flow: {
    candidates: [
      { source: "优书网", chapter: "第 32 章 雨夜", speed: "120 ms", state: "当前" },
      { source: "笔趣阁镜像", chapter: "第 32 章 雨夜", speed: "180 ms", state: "可切换" },
      { source: "本地缓存", chapter: "第 31 章 归途", speed: "离线", state: "落后" }
    ]
  }
};
