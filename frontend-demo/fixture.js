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
    longNight: "./covers/long-night.png",
    mysteryLord: "./covers/mystery-lord.png",
    brightMoon: "./covers/bright-moon.png",
    threeBody: "./covers/three-body.png",
    renjian: "./covers/renjian-cihua.png",
    androidNotes: "./covers/android-notes.png"
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
      },
      {
        title: "人间词话",
        author: "王国维",
        chapter: "卷上 · 境界",
        progress: "24%",
        coverKey: "renjian"
      },
      {
        title: "Android 开发笔记",
        author: "本地文档",
        chapter: "Compose Shell 结构",
        progress: "12%",
        coverKey: "androidNotes"
      },
      {
        title: "旧日回响",
        author: "离线书库",
        chapter: "第 18 章",
        progress: "41%",
        coverKey: "longNight"
      },
      {
        title: "群星之间",
        author: "本地导入",
        chapter: "第 7 章",
        progress: "16%",
        coverKey: "threeBody"
      },
      {
        title: "灯塔与雾",
        author: "书源同步",
        chapter: "第 51 章",
        progress: "73%",
        coverKey: "brightMoon"
      },
      {
        title: "纸上城市",
        author: "默认分组",
        chapter: "第 12 章",
        progress: "33%",
        coverKey: "mysteryLord"
      },
      {
        title: "长标题测试：这本书的名字很长需要两行截断",
        author: "排版样本",
        chapter: "很长的章节名称需要保持单行省略",
        progress: "8%",
        coverKey: "renjian"
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
      { title: "第 30 章 旧日", markers: ["已缓存"] },
      { title: "第 31 章 归途", markers: ["已缓存", "书签"] },
      { title: "第 32 章 雨夜", current: true, markers: ["书签"] },
      { title: "第 33 章 灯塔", markers: [] }
    ]
  },
  reader: {
    status: {
      left: "长夜余火 · 38%",
      time: "10:30"
    },
    title: "长夜余火",
    sourceLine: "第 32 章 雨夜 · 优书网",
    chapterTitle: "雨夜",
    chapterMeta: "第 32 章",
    typography: {
      fontSize: 18,
      lineHeight: 1.96,
      paragraphGap: 16,
      letterSpacing: 0,
      fontFamily: "serif"
    },
    typographyConfig: {
      fontSize: { min: 14, max: 26, step: 1, precision: 0 },
      lineHeight: { min: 1.4, max: 2.4, step: 0.08, precision: 2 },
      paragraphGap: { min: 4, max: 32, step: 2, precision: 0 },
      letterSpacing: { min: 0, max: 2, step: 0.2, precision: 1 }
    },
    themeDefault: "paper",
    themeOptions: [
      { value: "paper", label: "纸色", scheme: "day", pair: "paper-night", swatch: "#fff7ec", paperStart: "#fff9f0", paperEnd: "#f7ead9", ink: "#2b241d" },
      { value: "warm", label: "暖白", scheme: "day", pair: "warm-night", swatch: "#fff1df", paperStart: "#fff4e8", paperEnd: "#f2dfc8", ink: "#2e241b" },
      { value: "green", label: "护眼", scheme: "day", pair: "green-night", swatch: "#dbecc9", paperStart: "#eef7df", paperEnd: "#dcebc8", ink: "#253421" },
      { value: "blue", label: "浅蓝", scheme: "day", pair: "blue-night", swatch: "#dce9f3", paperStart: "#edf5fb", paperEnd: "#d9e7f1", ink: "#21313b" },
      { value: "paper-night", label: "夜纸", scheme: "night", pair: "paper", swatch: "#3b352f", paperStart: "#37312c", paperEnd: "#24211e", ink: "#eadfd0" },
      { value: "warm-night", label: "暖夜", scheme: "night", pair: "warm", swatch: "#3d3027", paperStart: "#3a2d25", paperEnd: "#241f1b", ink: "#f0ded0" },
      { value: "green-night", label: "墨绿", scheme: "night", pair: "green", swatch: "#24362d", paperStart: "#25372f", paperEnd: "#18231f", ink: "#dce9d5" },
      { value: "blue-night", label: "深蓝", scheme: "night", pair: "blue", swatch: "#263541", paperStart: "#263642", paperEnd: "#171f28", ink: "#dce8f1" }
    ],
    fontOptions: [
      { label: "系统", value: "system", fontStack: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif" },
      { label: "宋体", value: "serif", fontStack: "var(--fd-serif)" },
      { label: "黑体", value: "sans", fontStack: "var(--fd-sans)" },
      { label: "楷体", value: "kai", fontStack: "\"Kaiti SC\", \"KaiTi\", serif" },
      { label: "仿宋", value: "fangsong", fontStack: "\"FangSong\", \"STFangsong\", serif" },
      { label: "等宽", value: "mono", fontStack: "\"SFMono-Regular\", Consolas, \"Liberation Mono\", monospace" }
    ],
    readingText: [
      "雨声在窗外连成一片，像无数细小的针，密密地刺在玻璃上，汇成一层朦胧的水幕，将城市的灯光晕成模糊的光团。",
      "他站在窗前，手里握着那封被雨水润湿的信。纸页边角微微卷起，字迹却依旧清晰，像某个迟到许久的答案终于抵达。",
      "这座城市在夜里显得格外安静，街道尽头偶尔有车灯掠过，又很快被雨幕吞没，只留下短暂而摇晃的光。",
      "他曾经以为自己已经习惯等待，习惯在没有回音的日子里把所有疑问折起来，塞进抽屉最深处。",
      "可真正看到信上那行字时，他才发现那些被压下去的情绪并没有消失，只是一直在暗处积蓄，等着这一刻重新涌上来。",
      "远处的灯光像被雾气揉碎，只剩下一团模糊的暖色。也许有些选择，从一开始就注定要在某个雨夜到来。",
      "楼下传来轻微的脚步声，先是停在单元门外，随后沿着湿滑的台阶一点点靠近，每一步都像敲在他心口。",
      "他没有立刻开门，而是把信重新摊平，用指腹抹过那几个被水痕晕开的字，确认自己没有看错。",
      "门铃响起时，窗外的雷声恰好滚过天际。屋内短暂地亮了一瞬，墙上的旧照片也在那道白光里变得清晰。",
      "照片里的人站在同一场雨中，笑得毫无防备，仿佛后来所有的分离、沉默和追问都还没有发生。",
      "那张照片的边缘已经泛黄，角落压着一枚旧车票，目的地早已看不清，只剩日期仍然固执地留在纸上。",
      "窗外的雨还在下，敲打着屋檐，也敲打着这座城市里无数个未眠的人。",
      "他终于走向门口，手搭上门把时又停了半秒。那半秒里，过去几年的画面像被翻乱的书页，从眼前一页页掠过。",
      "门外的人没有再按铃，只是安静地等着。隔着一扇门，他听见对方压得很低的呼吸声，也听见自己越来越快的心跳。",
      "门开后，走廊里的冷风和雨气一起涌进来。来人摘下帽檐，脸上带着疲惫，却仍旧把那句迟到的话完整地说了出来。",
      "他没有回答，只是侧过身，让出一条狭窄的路。雨夜仍在继续，而故事终于从这一页，翻到了下一页。",
      "屋里的灯光落在两人之间，照见地面上缓慢扩散的水迹，也照见那些被时间藏起来的犹豫。",
      "他们在玄关站了很久，谁都没有先坐下。雨声填满沉默，也把那些准备好的解释一点点冲淡。",
      "来人从口袋里取出另一张折起的纸，纸面被保护得很好，没有水痕，只有折缝处泛着浅浅的白。",
      "他接过那张纸，指尖碰到对方冰冷的手背，才发现这个人并不像想象中那样笃定，甚至比自己更疲惫。",
      "纸上没有长篇解释，只有几行地址和一个日期。那是他们最后一次分别后的第三天，也是他以为一切已经结束的那天。",
      "客厅里的钟慢慢走过半点，声音清晰得近乎刺耳。他抬起头，发现对方一直看着窗外，没有催促，也没有辩解。",
      "那些年错过的消息、没能抵达的车站、被人转交又遗失的信件，像雨水一样从不同方向汇到脚边。",
      "他终于明白，自己握着的不是某一个答案，而是一整段被迫中断的时间。时间没有替任何人解释，只把他们推回同一扇门前。",
      "夜色越来越深，楼道里的灯自动熄灭又亮起。每一次光线变化，都像在提醒他们，这一次不能再让沉默替自己作答。",
      "他把两张纸并排放在桌上，纸角被窗缝吹进来的风轻轻掀起。那些字迹在灯下交错，像两条迟迟没有汇合的河。",
      "来人低声说，对不起。声音很轻，却不像旧日里那些含糊的告别，这一次每一个字都落在了实处。",
      "他没有立刻回应，只是走到窗边，把没有关紧的窗扣扣上。雨声被隔在外面，房间里终于安静了一些。",
      "安静下来以后，他才听见自己长长地呼出一口气。那口气像在胸口停了很多年，如今才找到离开的方向。",
      "他们坐到桌边，从最早的一封信说起，说到误会从哪里开始，又如何在一次次错过里变成无法解释的距离。",
      "有些话说出口时已经不再锋利，却仍然沉重。它们落在桌面上，像一枚枚迟到的钉子，把摇晃的过去一点点固定住。",
      "窗外的雨势渐渐小了，远处有车轮压过积水，声音短促而清亮。城市并没有因为这一夜停下，只是他们终于停下来回头看了一眼。",
      "天色微亮时，云层后透出一线灰白。来人站起身，问他是否还愿意一起去那个地址看看。",
      "他望向桌上的旧车票，又望向窗边逐渐清晰的街道。很久以后，他点了点头，把那封湿信重新折好，放进了外套内侧的口袋。",
      "门外的雨已经停了，只剩屋檐偶尔滴下一两声水响。清晨的空气带着潮意，从打开的门缝里慢慢涌进来。",
      "他们没有急着出门，而是把桌上的纸和旧车票重新整理好。每一件东西都很轻，却像压着一段终于能够被重新触碰的往事。",
      "电梯下行时，金属门上映出两个人并肩的影子。影子仍有些陌生，却不再像昨夜那样隔着看不见的距离。",
      "走出楼道时，积水倒映着渐亮的天空。他们沿着街边慢慢向前，谁都没有再回头。远处第一班车穿过薄雾，带来新一天的声音。"
    ],
    quickActions: [
      { label: "搜索", type: "search" },
      { label: "自动翻页", type: "auto-page" },
      { label: "替换", type: "replace" }
    ],
    chapterProgress: {
      title: "第 32 章 雨夜",
      progressLabel: "本章 38%",
      progress: "38%",
      min: 0,
      max: 100,
      step: 5,
      previousLabel: "上一章",
      nextLabel: "下一章"
    },
    modules: [
      { label: "目录", type: "directory", icon: "reader-module-directory" },
      { label: "朗读", type: "tts", icon: "reader-module-tts" },
      { label: "界面", type: "appearance", icon: "reader-module-appearance", active: true },
      { label: "设置", type: "settings", icon: "reader-module-settings" }
    ],
    brightness: {
      title: "亮度",
      modeLabel: "系统",
      autoLabel: "A",
      min: 5,
      max: 100,
      step: 5,
      value: "100%"
    },
    tts: {
      sentenceMin: 1,
      sentenceMax: 12,
      defaults: {
        playing: false,
        sentenceIndex: 1,
        speed: "1.0x",
        voice: "清晰女声",
        scope: "当前章节",
        timer: "15 分钟"
      },
      options: {
        speed: ["0.8x", "1.0x", "1.2x", "1.5x"],
        voice: ["清晰女声", "沉稳男声", "系统默认"],
        scope: ["当前章节", "本书剩余", "当前页"],
        timer: ["15 分钟", "30 分钟", "不定时"]
      }
    },
    controlSettings: {
      defaults: {
        autoPage: false,
        tapMode: "左右区域",
        volumePage: true,
        pageAnimation: "平滑",
        landscapeLock: false,
        keepScreenOn: true,
        statusInfo: true,
        hapticFeedback: false,
        cacheNext: true
      },
      options: {
        tapMode: ["左右区域", "上下区域", "整屏翻页"],
        pageAnimation: ["平滑", "仿真", "无动画"]
      }
    },
    bottomReadout: {
      progress: "38%",
      chapter: "第 32 / 128 章"
    }
  },
  settings: {
    rows: [
      { icon: "palette", title: "主题与外观", meta: "跟随系统 · 暖纸背景", value: "默认" },
      { icon: "globe", title: "网络与书源", meta: "移动网络允许搜索", value: "已开启" },
      { icon: "shield", title: "隐私与权限", meta: "本地书、通知、剪贴板", value: "管理" }
    ]
  },
  flow: {
    chapter: "第 32 章 雨夜",
    filters: ["全部", "更新快", "已缓存", "可用"],
    candidates: [
      {
        source: "优书网",
        chapter: "第 32 章 雨夜",
        latestChapter: "第 32 章 雨夜",
        speed: "120 ms",
        updated: "刚刚",
        state: "当前",
        match: "100% 匹配",
        checkDone: 3,
        checks: ["目录", "章节", "正文"]
      },
      {
        source: "笔趣阁镜像",
        chapter: "第 32 章 雨夜",
        latestChapter: "第 32 章 雨夜",
        speed: "180 ms",
        updated: "2 分钟前",
        state: "可切换",
        match: "98% 匹配",
        checkDone: 3,
        checks: ["目录", "章节", "正文"]
      },
      {
        source: "轻小说书站",
        chapter: "第 32 章 雨夜",
        latestChapter: "第 32 章 雨夜",
        speed: "210 ms",
        updated: "4 分钟前",
        state: "可切换",
        match: "97% 匹配",
        checkDone: 3,
        checks: ["目录", "章节", "正文"]
      },
      {
        source: "云端书库",
        chapter: "第 32 章 雨夜",
        latestChapter: "第 32 章 雨夜",
        speed: "260 ms",
        updated: "7 分钟前",
        state: "可切换",
        match: "96% 匹配",
        checkDone: 3,
        checks: ["目录", "章节", "正文"]
      },
      {
        source: "聚合书源一",
        chapter: "第 32 章 雨夜",
        latestChapter: "第 32 章 雨夜",
        speed: "320 ms",
        updated: "11 分钟前",
        state: "可切换",
        match: "95% 匹配",
        checkDone: 3,
        checks: ["目录", "章节", "正文"]
      },
      {
        source: "聚合书源二",
        chapter: "第 32 章 雨夜",
        latestChapter: "第 32 章 雨夜",
        speed: "390 ms",
        updated: "18 分钟前",
        state: "可切换",
        match: "94% 匹配",
        checkDone: 3,
        checks: ["目录", "章节", "正文"]
      },
      {
        source: "备用线路 A",
        chapter: "第 32 章 雨夜",
        latestChapter: "第 32 章 雨夜",
        speed: "510 ms",
        updated: "25 分钟前",
        state: "可切换",
        match: "93% 匹配",
        checkDone: 3,
        checks: ["目录", "章节", "正文"]
      },
      {
        source: "备用线路 B",
        chapter: "第 32 章 雨夜",
        latestChapter: "第 32 章 雨夜",
        speed: "680 ms",
        updated: "42 分钟前",
        state: "可切换",
        match: "92% 匹配",
        checkDone: 3,
        checks: ["目录", "章节", "正文"]
      },
      {
        source: "章节同步源",
        chapter: "第 32 章 雨夜",
        latestChapter: "第 32 章 雨夜",
        speed: "760 ms",
        updated: "1 小时前",
        state: "可切换",
        match: "91% 匹配",
        checkDone: 3,
        checks: ["目录", "章节", "正文"]
      },
      {
        source: "本地缓存",
        chapter: "第 32 章 雨夜",
        latestChapter: "第 32 章 雨夜",
        speed: "离线",
        updated: "昨天 23:15",
        state: "可切换",
        match: "已缓存",
        checkDone: 2,
        checks: ["目录", "章节", "正文"]
      },
      {
        source: "旧源备份",
        chapter: "第 31 章 归途",
        latestChapter: "第 31 章 归途",
        speed: "超时",
        updated: "3 天前",
        state: "落后",
        match: "章节落后",
        checkDone: 1,
        checks: ["目录", "章节", "正文"]
      }
    ]
  }
};
