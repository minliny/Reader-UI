# 全量页面规划卡（Full Page Planning Cards）

本文按 `FRONTEND_PLANNING_REQUIREMENTS_TEMPLATE.md` 补齐 30 个正式页面的规划卡。每一行都是一张压缩规划卡，覆盖页面身份、Shell、核心任务、P0/P1/P2、结构与覆盖、上下文与事件、适配与验收。首批 4 张详版卡见 `FRONTEND_FIRST_PAGE_PLANNING_CARDS.md`，30 页详版字段矩阵见 `FRONTEND_DETAILED_PAGE_PLANNING_CARDS.md`。

## 字段覆盖规则（Field Coverage Rule）

| 字段组（Field Group） | 本文落点（Where Covered） |
|---|---|
| 页面身份（Page Identity） | 页面、页面 id、输入包路径、Shell。 |
| 页面任务（Page Task） | 核心任务与 P0。 |
| 内容优先级（Content Priority） | P0、P1/P2。 |
| Shell 结构（Shell Structure） | 结构与覆盖。 |
| 覆盖避让（Overlay Avoidance） | 结构与覆盖、适配与验收。 |
| 上下文事件（Context and Events） | 上下文与关键事件。 |
| 运行时适配（Runtime Adaptation） | 适配与验收。 |
| 组件抽象（Componentization） | 结构与覆盖中的组件归属。 |
| 验收（Acceptance） | 适配与验收。 |

## 主标签页（Main Tabs）

| 页面（Page） | 页面 id / 路径（Page ID / Path） | 核心任务与 P0（Primary Task and P0） | P1/P2 | 结构与覆盖（Structure and Overlay） | 上下文与关键事件（Context and Key Events） | 适配与验收（Adaptation and Acceptance） |
|---|---|---|---|---|---|---|
| 书架（Bookshelf） | `bookshelf-preview` / `docs/ui-design/02-主标签页/书架/frontend-input/` | 管理并打开已有书籍；P0 为书籍集合、分组、打开书籍、继续阅读动作。 | P1 搜索、排序筛选、最近更新；P2 弱提示。 | `MainTabShell`：StatusBar、AppTopBar、ContentRegion、MainNav、StateHost；MainNav 只覆盖底部过渡区。 | MainNavContext、LibraryContext；`search`、`groupChange`、`read`、`openBook`、`navChange`。 | 继续阅读不能压过书籍集合；封面不错误裁切；最后一本书可滚到 MainNav 上方。 |
| 发现（Discover） | `discovery-home-preview` / `docs/ui-design/02-主标签页/发现/frontend-input/` | 浏览推荐和来源并进入书籍；P0 为推荐书、来源入口、打开详情、加入书架、阅读。 | P1 榜单、分类、刷新；P2 运营/说明信息。 | `MainTabShell` 内容区承载推荐、来源、榜单；StateHost 替换内容不替换主导航。 | BookContext、SourceContext；`openBookDetail`、`addToBookshelf`、`read`、`sourceDetect`、`navChange`。 | 推荐与来源入口必须优先于大块说明；列表文本截断；刷新状态不遮挡主导航 active。 |
| RSS（RSS） | `rss-home-preview` / `docs/ui-design/02-主标签页/RSS/frontend-input/` | 查看订阅流并打开条目；P0 为订阅条目、未读状态、打开条目。 | P1 筛选、刷新、订阅入口；P2 弱提示。 | `MainTabShell` 内容区承载订阅流；空态/错误态进 StateHost。 | MainNavContext、BookContext/entry context；`refresh`、`statusFilterChange`、`openEntry`、`addSubscription`、`navChange`。 | 未读筛选不重置 tab；条目末项可达；空态动作不能被 MainNav 遮挡。 |
| 设置首页（Settings Home） | `settings-home-preview` / `docs/ui-design/02-主标签页/设置/frontend-input/` | 进入设置二级页并查看关键提示；P0 为设置入口、权限/备份关键状态。 | P1 搜索、更多、概览；P2 版本弱信息。 | `MainTabShell` 内容区承载设置入口；Toast/状态提示不得替换主导航。 | SettingsContext；`openSetting`、`quickEntry`、`search`、`navChange`。 | 设置入口列表末项可达；权限/备份提示可被折叠但不能遮挡入口。 |

## 书架链路（Library Flow）

| 页面（Page） | 页面 id / 路径（Page ID / Path） | 核心任务与 P0（Primary Task and P0） | P1/P2 | 结构与覆盖（Structure and Overlay） | 上下文与关键事件（Context and Key Events） | 适配与验收（Adaptation and Acceptance） |
|---|---|---|---|---|---|---|
| 书架空状态（Bookshelf Empty） | `bookshelf-empty-preview` / `docs/ui-design/03-书架链路/书架空状态/frontend-input/` | 引导用户添加第一本书；P0 为搜索、导入、发现入口。 | P1 权限/离线说明；P2 插图和弱提示。 | `LibraryShell` 或主 tab 空态 slot；状态不替换根 Shell。 | LibraryContext；`primaryAction`、`secondaryAction`、`search`、`navChange`。 | 主动作首屏可见；空态插图可压缩；离线/权限状态有恢复路径。 |
| 书籍搜索（Book Search） | `book-search-preview` / `docs/ui-design/03-书架链路/书籍搜索/frontend-input/` | 搜索书籍并加入或阅读；P0 为搜索框、结果、打开详情、加入书架、阅读。 | P1 范围、分组、历史；P2 说明。 | `LibraryShell`：BackTopBar、ContentRegion、BottomActionHost、StateHost；键盘由页面和 Shell 协同避让。 | LibraryContext、BookContext；`queryChange`、`submitSearch`、`openDetail`、`addToBookshelf`、`read`。 | 键盘弹出时输入框、错误提示、提交动作可见；结果末项可达。 |
| 书籍详情（Book Detail） | `book-detail-preview` / `docs/ui-design/03-书架链路/书籍详情/frontend-input/` | 判断并开始阅读单本书；P0 为摘要、来源状态、阅读、目录、加入书架。 | P1 简介、章节预览、来源选择；P2 元信息。 | `LibraryShell` 内容区承载详情；来源选择用 SheetHost，危险确认用 DialogHost。 | BookContext；`read`、`addToBookshelf`、`openDirectory`、`openChapter`、`sourceSelect`。 | 阅读/目录主动作完整可见；详情 Hero 不抽成跨页面通用组件；长简介可折叠。 |
| 书籍目录（Book Directory） | `book-directory-preview` / `docs/ui-design/03-书架链路/书籍目录/frontend-input/` | 选择章节进入阅读；P0 为当前章节、章节列表、打开章节。 | P1 定位/筛选；P2 卷信息。 | `LibraryShell` 内容区列表滚动；StateHost 只替换章节列表区域。 | BookContext、ChapterContext；`openCurrentChapter`、`openChapter`、`backToDetail`。 | 当前章节可定位；长章节名截断或两行；列表末项避让底部。 |
| 排序与筛选（Sort and Filter） | `sort-filter-preview` / `docs/ui-design/03-书架链路/排序与筛选/frontend-input/` | 改变书架列表排序和筛选；P0 为排序、筛选、应用、重置。 | P1 说明；P2 装饰。 | `LibraryShell` 的底表或二级页；应用后回写书架。 | LibraryContext；`sortSelect`、`orderSelect`、`filterToggle`、`reset`、`apply`。 | 必须明确底表/二级页形态；应用按钮不被底部安全区或键盘遮挡。 |
| 书籍操作底表（Book Action Sheet） | `book-action-sheet-preview` / `docs/ui-design/03-书架链路/书籍操作底表/frontend-input/` | 仅作为组件参考输入件；运行时在书架管理态或书籍详情页执行单书操作；P0 为修改信息、移动分组、移除书架确认。 | P1 操作说明；P2 弱反馈。 | 来源页面内容区列表 + `DialogHost`；必要时可用 `SheetHost`，但不生成独立页面。 | BookContext、LibraryContext；`edit`、`moveGroup`、`deleteRequest`、`deleteCancel`、`deleteConfirm`。 | 不出现 `book-action-sheet` 路由；操作必须保留来源页滚动/筛选/书籍上下文；危险操作二次确认。 |
| 分组管理（Group Management） | `group-management-preview` / `docs/ui-design/03-书架链路/分组管理/frontend-input/` | 管理书架分组；P0 为分组列表、新建、重命名、删除、排序。 | P1 说明；P2 空提示。 | `LibraryShell` 内容区 + DialogHost；命名输入由 Dialog 或 Sheet 承载。 | LibraryContext；`addGroupOpen`、`groupRenameOpen`、`groupDeleteOpen`、`groupReorder`、`dialogSave`。 | 命名键盘不遮挡保存；删除后书籍去向明确；拖拽不改变列表语义。 |
| 本地书导入（Local Import） | `local-import-preview` / `docs/ui-design/03-书架链路/本地书导入/frontend-input/` | 导入本地书籍并处理结果；P0 为文件选择、进度、结果、完成。 | P1 失败重试；P2 格式说明。 | `LibraryShell` 内容区承载导入状态；系统文件选择器是外部边界。 | LibraryContext、BookContext；`openSystemFilePicker`、`importProgress`、`resultRowOpen`、`chooseAgain`、`done`。 | 导入结果末项可达；失败态保留重试；完成返回书架并刷新集合。 |

## 阅读链路（Reader Flow）

| 页面（Page） | 页面 id / 路径（Page ID / Path） | 核心任务与 P0（Primary Task and P0） | P1/P2 | 结构与覆盖（Structure and Overlay） | 上下文与关键事件（Context and Key Events） | 适配与验收（Adaptation and Acceptance） |
|---|---|---|---|---|---|---|
| 阅读入口（Reading Entry） | `reading-entry-preview` / `docs/ui-design/04-阅读链路/阅读入口/frontend-input/` | 从书籍上下文进入阅读；P0 为继续阅读、开始阅读、加载中、失败修复和离线继续。 | P1 来源上下文；P2 弱提示。 | `ReaderShell` 的 ReaderStateHost 浮层，保留 ReadingSurface 背景，不生成独立详情页。 | ReaderContext、BookContext、SourceContext；`continueReading`、`startReading`、`retryOpen`、`switchSource`、`continueCached`。 | 入口浮层不遮挡正文关键内容；失败/离线保留来源和章节上下文；继续/开始动作首屏可见。 |
| 沉浸阅读（Immersive Reading） | `immersive-reading-preview` / `docs/ui-design/04-阅读链路/沉浸阅读/frontend-input/` | 阅读正文并翻页；P0 为正文、点击热区、阅读进度、返回来源，并承载打开/失败/离线状态。 | P1 页脚信息；P2 弱提示。 | `ReaderShell` 的 ReadingSurface；覆盖层关闭时正文位置不变；ReaderStateHost 处理打开、错误和缓存继续状态。 | ReaderContext；`tapPrevious`、`tapCenter`、`tapNext`、`retry`、`continueCached`。 | 点击热区明确；正文不被截断；页脚信息不遮挡正文主阅读区；打开状态不形成独立页面。 |
| 阅读控制层（Reader Control Layer） | `reader-control-preview` / `docs/ui-design/04-阅读链路/阅读控制层/frontend-input/` | 在阅读中控制模块；P0 为顶部控制、章节进度、四模块导航、正文位置保留。 | P1 快捷操作、亮度、底部读数；P2 背景正文。 | `ReaderShell`：ReadingSurface + ReaderOverlayHost + BottomSheetHost + ReaderModuleNav。 | ReaderContext；`sourceChange`、`quickAction`、`chapterChange`、`progressChange`、`moduleChange`、`brightnessChange`。 | 四模块 active 不改变尺寸/间距/相对位置；切模块不重置正文；重复点击当前模块回默认控制层。 |
| 目录与书签（TOC and Bookmarks） | `reading-toc-bookmark-preview` / `docs/ui-design/04-阅读链路/目录与书签/frontend-input/` | 选择章节或书签定位；P0 为目录/书签列表、打开章节/书签、当前进度。 | P1 搜索、更多；P2 卷说明。 | `ReaderShell` BottomSheetHost 面板滚动；ReaderModuleNav 保持固定。 | ReaderContext、ChapterContext；`tabChange`、`searchChange`、`openChapter`、`openBookmark`、`moreAction`。 | 面板内列表末项可达；打开章节回到正文定位；更多菜单不遮挡主动作。 |
| 阅读外观（Reading Appearance） | `reading-appearance-preview` / `docs/ui-design/04-阅读链路/阅读外观/frontend-input/` | 调整阅读显示；P0 为字号、行距、段距、字距、纯色主题、字体。 | P1 翻页动画；P2 说明。 | `ReaderShell` 外观面板覆盖正文，控制项即时作用于 ReadingSurface，预览不替代正文状态。 | ReaderContext；`fontSizeDecrease`、`fontSizeIncrease`、`lineHeightChange`、`paragraphGapChange`、`letterSpacingChange`、`themeChange`、`fontChange`。 | Typography token 必须可映射；主题色块无图标；主题和排版即时预览。 |
| 朗读（Read Aloud） | `reading-aloud-preview` / `docs/ui-design/04-阅读链路/朗读/frontend-input/` | 控制朗读播放；P0 为播放/暂停、语速、声音、朗读范围。 | P1 定时、设置入口；P2 状态说明。 | `ReaderShell` 朗读面板覆盖正文；运行态可有悬浮反馈。 | ReaderContext；`startReadAloud`、`pauseReadAloud`、`continueReadAloud`、`speedChange`、`voiceChange`、`rangeChange`。 | 播放控制不被面板滚动挤出；后台/运行态不重建阅读页。 |
| 阅读设置（Reading Settings） | `reading-settings-preview` / `docs/ui-design/04-阅读链路/阅读设置/frontend-input/` | 调整阅读行为；P0 为设置分组、开关、预设、恢复。 | P1 说明；P2 弱提示。 | `ReaderShell` 设置模块，不进入 SettingsShell。 | ReaderContext；`openPreset`、`toggleSetting`、`segmentChange`、`stepperChange`、`presetApply`、`restoreDefault`。 | 与 SettingsShell 边界明确；预设应用反馈不重置正文。 |
| 自动翻页（Auto Page） | `auto-page-preview` / `docs/ui-design/04-阅读链路/自动翻页/frontend-input/` | 启停自动翻页；P0 为速度、模式、开始/暂停/继续/停止。 | P1 选项；P2 说明。 | `ReaderShell` 自动翻页面板；运行后可回沉浸阅读。 | ReaderContext；`speedChange`、`modeChange`、`startAutoPage`、`pauseAutoPage`、`continueAutoPage`、`stopAutoPage`。 | 停止路径明确；运行态覆盖不遮挡关键退出动作。 |
| 内容搜索（Content Search） | `content-search-preview` / `docs/ui-design/04-阅读链路/内容搜索/frontend-input/` | 在当前书内搜索并定位；P0 为搜索框、结果、上一条/下一条、打开结果。 | P1 筛选；P2 提示。 | `ReaderShell` 搜索面板；键盘由面板和 Shell 共同避让。 | ReaderContext；`queryChange`、`previousResult`、`nextResult`、`openResult`、`retry`。 | 键盘不遮挡输入、结果导航和打开动作；结果定位不丢阅读进度。 |
| 内容替换（Content Replacement） | `content-replacement-preview` / `docs/ui-design/04-阅读链路/内容替换/frontend-input/` | 管理当前阅读替换规则；P0 为开关、规则列表、编辑、测试、保存。 | P1 临时关闭；P2 说明。 | `ReaderShell` 替换面板；规则编辑可进入局部输入态。 | ReaderContext；`toggleReplacement`、`openRule`、`addRule`、`patternChange`、`replacementChange`、`testReplacement`、`saveRule`。 | 输入字段、测试反馈、保存动作同时可达；保存与临时关闭语义分离。 |
| 换源（Source Switch） | `source-switch-preview` / `docs/ui-design/04-阅读链路/换源/frontend-input/` | 对照来源并切换阅读来源；P0 为步骤、候选、检测、切换确认、返回阅读。 | P1 筛选、检测状态；P2 说明。 | `FlowShell`：StepRegion、ComparisonRegion、ResultRegion、StateHost。 | ReaderContext、SourceContext；`backToReading`、`filterChange`、`startDetect`、`cancelDetect`、`switchSource`。 | 横向流程状态区不遮挡确认；成功/取消/失败回到 ReaderShell 并保留进度。 |

## 设置链路（Settings Flow）

| 页面（Page） | 页面 id / 路径（Page ID / Path） | 核心任务与 P0（Primary Task and P0） | P1/P2 | 结构与覆盖（Structure and Overlay） | 上下文与关键事件（Context and Key Events） | 适配与验收（Adaptation and Acceptance） |
|---|---|---|---|---|---|---|
| App 通用设置（General Settings） | `general-settings-preview` / `docs/ui-design/05-设置链路/App通用设置/frontend-input/` | 调整通用设置；P0 为设置行、短选项下拉浮层、恢复确认。 | P1 系统设置入口；P2 说明。 | `SettingsShell`：BackTopBar、SettingsContent、ToastHost、DialogHost、StateHost。 | SettingsContext；`themeChange`、`optionDropdownOpen`、`selectOption`、`switchChange`、`restoreConfirm`。 | 短选项不打开底部 OptionSheet、不改变列表结构；恢复确认焦点清楚；设置列表末项可达。 |
| 书架与搜索设置（Bookshelf and Search Settings） | `bookshelf-search-settings-preview` / `docs/ui-design/05-设置链路/书架与搜索设置/frontend-input/` | 调整书架和搜索行为；P0 为布局、列数、搜索历史、清空确认。 | P1 预览；P2 说明。 | `SettingsShell` 设置分组；危险操作进入 DialogHost。 | SettingsContext、LibraryContext；`layoutChange`、`columnCountChange`、`clearHistoryOpen`、`clearHistoryConfirm`。 | 布局设置必须回写书架；清空历史有确认；预览不挤压主设置项。 |
| 隐私与权限（Privacy and Permissions） | `privacy-permissions-preview` / `docs/ui-design/05-设置链路/隐私与权限/frontend-input/` | 查看和调整隐私权限；P0 为权限状态、系统设置入口、隐私开关、清理确认。 | P1 协议入口；P2 说明。 | `SettingsShell` 权限行 + DialogHost；系统设置是外部边界。 | SettingsContext；`openSystemSettings`、`togglePrivacyOption`、`openPrivacyPolicy`、`clearPrivacyDataConfirm`。 | 系统设置返回后保留来源；清理隐私数据必须说明影响范围。 |
| 缓存管理（Cache Management） | `cache-management-preview` / `docs/ui-design/05-设置链路/缓存管理/frontend-input/` | 查看和清理缓存；P0 为缓存占用、分类、清理确认、进度。 | P1 策略切换；P2 位置说明。 | `SettingsShell` 缓存卡和分类行；清理确认进入 DialogHost。 | SettingsContext、Reader cache context；`calculateCache`、`openCleanupConfirm`、`cleanupConfirm`、`toggleCacheStrategy`。 | 清理进度不替换返回栏；分类行文本不重叠；危险清理有取消路径。 |
| 关于与反馈（About and Feedback） | `about-feedback-preview` / `docs/ui-design/05-设置链路/关于与反馈/frontend-input/` | 查看个人开源项目版本并进入反馈；P0 为版本、问题反馈、功能建议、源码仓库、开源许可、更新检查、诊断导出。 | P1 外部链接；P2 贡献说明。 | `SettingsShell` 链接列表；外部链接不替换设置栈。 | SettingsContext；`checkUpdate`、`openFeedback`、`openSuggestion`、`openRepository`、`openLicense`、`exportDiagnosticLog`、`openHelp`。 | 离线状态有恢复；外部链接边界清楚；版本卡不遮挡入口；不出现用户协议或隐私协议。 |
| 同步与备份（Sync and Backup） | `sync-backup-preview` / `docs/ui-design/05-设置链路/同步与备份/frontend-input/` | 备份、恢复和同步设置；P0 为备份位置、立即备份、恢复确认、冲突解决。 | P1 自动备份、WebDAV；P2 说明。 | `SettingsShell` 备份记录和操作行；恢复覆盖确认进入 DialogHost。 | SettingsContext；`selectBackupLocation`、`runBackupNow`、`restoreBackup`、`restoreConfirm`、`resolveConflict`、`grantPermission`。 | 备份/恢复进度可见；恢复覆盖影响明确；权限状态有入口。 |
| 书源管理（Source Management） | `source-management-preview` / `docs/ui-design/05-设置链路/书源管理/frontend-input/` | 管理书源和检测状态；P0 为搜索、筛选、启用、检测、编辑、日志。 | P1 分组；P2 说明。 | `SettingsShell` 书源列表；编辑/日志作为子状态或二级内容。 | SourceContext、SettingsContext；`queryChange`、`groupFilterChange`、`toggleSource`、`detectSource`、`detectAll`、`openSourceEdit`、`saveSource`、`openLog`。 | 检测全量动效不阻塞返回；编辑/日志不变成主 tab；长来源名截断。 |

## 全量规划验收（Full Planning Acceptance）

- 30 个正式 preview 页面都有页面 id、输入包路径、Shell、核心任务和 P0/P1/P2。
- 30 个页面都明确固定区、滚动区、覆盖区或状态区的归属。
- 30 个页面的详版固定区、滚动区、覆盖区、状态区、入口、返回、上下文、事件、适配、文本、组件和验收字段见 `FRONTEND_DETAILED_PAGE_PLANNING_CARDS.md`。
- 输入型页面明确键盘归属，底部固定层页面明确最后一项可达。
- 阅读链路页面统一保留 ReaderContext，设置链路页面统一保留 SettingsContext。
- FlowShell 只用于换源横向流程，不进入主导航。
- 后续 HTML 调整、可互动 demo 和 Compose 实现必须引用本文或对应详版规划卡，不再以单张截图作为结构依据。
