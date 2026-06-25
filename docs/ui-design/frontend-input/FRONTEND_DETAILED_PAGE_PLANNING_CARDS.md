# 全量详版页面规划卡（Full Detailed Page Planning Cards）

本文补齐 30 个正式页面的详版规划字段。`FRONTEND_PAGE_PLANNING_CARDS.md` 负责页面任务、P0/P1/P2 和压缩验收；本文负责把每页展开到可实现层：固定区、滚动区、覆盖区、状态区、可覆盖内容、必须完整展示、入口、返回、上下文、事件、适配、文本、组件和验收。

## 使用规则（Usage Rules）

- 本文不是视觉示例图说明，而是应用页面实现前的结构输入。
- 页面实现必须先满足本文的 Shell、slot、覆盖、上下文和验收字段，再处理具体视觉细节。
- 首批 4 页的完整单页卡仍见 `FRONTEND_FIRST_PAGE_PLANNING_CARDS.md`；本文把同一字段口径推广到 30 页。
- 表中 `StateHost` 只表示状态宿主或状态替换 slot，不允许替换根 Shell。

## 结构与覆盖（Structure and Overlay）

| 页面（Page） | Shell | 固定区（Fixed Regions） | 滚动区（Scrollable Regions） | 覆盖区 / 状态区（Overlay / State Hosts） | 可覆盖内容（Coverable Content） | 必须完整展示（Must Fully Display） |
|---|---|---|---|---|---|---|
| 书架（Bookshelf） | MainTabShell | `StatusBar`、`AppTopBar`、`MainNav` | 分组、继续阅读、最近更新、书籍集合 | `StateHost`、后续筛选底表 | 书籍集合底部过渡区、弱提示 | 最后一项书籍卡片、主导航四按钮、继续阅读动作、空态主动作 |
| 发现（Discover） | MainTabShell | `StatusBar`、`AppTopBar`、`MainNav` | 推荐、来源入口、榜单、分类 | `StateHost`、刷新提示 | 运营说明、榜单尾部过渡区 | 推荐书、来源入口、打开详情 / 加入书架 / 阅读动作、主导航 active |
| RSS（RSS） | MainTabShell | `StatusBar`、`AppTopBar`、`MainNav` | 订阅流、筛选、订阅入口 | `StateHost`、刷新状态 | 条目尾部过渡区、弱提示 | 未读状态、条目主信息、打开条目动作、空态主动作 |
| 设置首页（Settings Home） | MainTabShell | `StatusBar`、`AppTopBar`、`MainNav` | 设置入口、关键提示、概览 | `StateHost`、`ToastHost` | 权限 / 备份提示的补充说明 | 设置入口、权限 / 备份关键状态、主导航 active |
| 书架空状态（Bookshelf Empty） | LibraryShell 或 MainTabShell state slot | `BackTopBar` 或主 tab 顶栏、可选底部主动作 | 空态说明、入口卡片、权限 / 离线说明 | `StateHost`、权限提示 | 插图、弱说明 | 搜索、导入、发现入口、权限恢复动作 |
| 书籍搜索（Book Search） | LibraryShell | `BackTopBar`、`BottomActionHost` | 搜索范围、分组、历史、结果列表、状态反馈 | `StateHost`、可选 `SheetHost` / `DialogHost` | 结果尾部过渡区、历史尾部、弱提示 | 聚焦搜索框、提交动作、最后一个结果项、错误重试、权限授权 |
| 书籍详情（Book Detail） | LibraryShell | `BackTopBar`、底部阅读 / 加入动作 | 摘要、简介、章节预览、来源状态 | `SheetHost`、`DialogHost`、`StateHost` | 长简介折叠区、元信息 | 阅读、目录、加入书架、来源状态、返回入口 |
| 书籍目录（Book Directory） | LibraryShell | `BackTopBar`、可选当前章节定位条 | 当前章节、章节列表、筛选 / 定位 | `StateHost`、可选筛选底表 | 章节列表尾部、卷说明 | 当前章节、可点击章节行、列表末项、返回详情 |
| 排序与筛选（Sort and Filter） | LibraryShell | `BackTopBar` 或底表标题、应用 / 重置动作 | 排序项、筛选项、说明 | `SheetHost` 或二级内容、`StateHost` | 说明文字、装饰区 | 排序选项、筛选选项、应用、重置、关闭路径 |
| 书籍操作底表（Book Action Sheet） | 非页面路由；归属来源 Shell | 来源页面结构、操作列表宿主、危险确认入口 | 修改信息、移动分组、移除书架、辅助说明 | `DialogHost`；必要时使用来源页 `SheetHost` | 来源页面内容、辅助说明 | 操作列表、编辑、分组、删除请求、删除确认 / 取消 |
| 分组管理（Group Management） | LibraryShell | `BackTopBar`、新建动作、可选保存动作 | 分组列表、重命名、排序说明 | `DialogHost`、`SheetHost`、`StateHost` | 列表尾部、弱说明 | 分组行、新建、重命名、删除、排序手柄、命名保存 |
| 本地书导入（Local Import） | LibraryShell | `BackTopBar`、完成动作 | 文件选择、进度、结果列表、失败原因 | `StateHost`、系统文件选择器边界 | 格式说明、结果尾部 | 文件选择、导入进度、失败重试、结果项、完成 |
| 阅读入口（Reading Entry） | ReaderShell | `ReadingSurface`、`ReaderStateHost` 入口浮层、继续 / 开始动作 | 阅读背景正文、来源上下文、入口卡片内容 | `ReaderStateHost`、加载 / 错误 / 离线状态 | 非当前阅读焦点段落、来源说明 | 继续阅读、开始阅读、正在打开、失败修复、离线继续、返回来源 |
| 沉浸阅读（Immersive Reading） | ReaderShell | `ReadingSurface`、点击热区、页脚读数、`RuntimeCapsuleHost` | 正文分页内容、打开 / 错误 / 离线状态 | `ReaderStateHost`、临时提示、自动翻页 / 朗读运行胶囊 | 非当前阅读焦点段落、页脚弱信息；运行胶囊只能覆盖正文安全空区 | 当前正文、点击热区、阅读进度、返回来源、打开失败修复、运行胶囊暂停 / 停止入口 |
| 阅读控制层（Reader Control Layer） | ReaderShell | `ReaderOverlayHost`、`ReaderTopBar`、`ReaderModuleNav`、亮度栏 | 底部面板内容、章节进度 | `BottomSheetHost`、`ReaderStateHost` | 正文顶部 / 底部过渡段落 | 返回、换源、章节进度、四模块按钮、底部面板主动作、重复点击当前模块关闭面板 |
| 目录与书签（TOC and Bookmarks） | ReaderShell | `ReaderModuleNav`、面板标题 / tabs | 目录列表、书签列表、搜索结果 | `BottomSheetHost`、`ReaderStateHost`、更多菜单 | 列表尾部、卷说明 | 当前章节、目录行以章节名为主且右侧有下载/书签状态图标、书签行、打开动作、面板关闭 |
| 阅读外观（Reading Appearance） | ReaderShell | `ReaderModuleNav`、面板标题、即时控制区 | 字号、行距、段距、字距、纯色主题、字体 | `BottomSheetHost`、`ReaderStateHost` | 预览补充说明 | 字号 / 行距 / 段距 / 字距控制、无图标主题色块、字体选项、即时回写 |
| 朗读（Read Aloud） | ReaderShell | `ReaderModuleNav`、播放图标控制、沉浸态运行胶囊 | 语速、声音、范围、定时、设置入口 | `BottomSheetHost`、`ReaderStateHost`、`RuntimeCapsuleHost` | 状态说明、面板尾部；运行胶囊只能覆盖正文安全空区 | 播放 / 暂停图标、语速、声音、朗读范围、停止或关闭路径；不展示示例正文；运行胶囊可暂停 / 继续 / 停止 |
| 阅读设置（Reading Settings） | ReaderShell | `ReaderModuleNav`、即时设置项 | 设置开关和值项：自动翻页、点击翻页方式、音量键翻页、翻页动画、横屏锁定、屏幕常亮、页脚进度、触摸反馈、自动缓存后续章节 | `BottomSheetHost`、`ReaderStateHost` | 弱说明 | 开关和值项即时切换；快捷窗不展示更多阅读设置入口；关闭路径明确 |
| 自动翻页（Auto Page） | ReaderShell | `ReaderModuleNav`、运行态控制、沉浸态运行胶囊 | 速度、模式、选项、说明 | `BottomSheetHost`、`ReaderStateHost`、`RuntimeCapsuleHost` | 说明文字、非当前选项；运行胶囊只能覆盖正文安全空区 | 开始 / 暂停 / 继续 / 停止、速度控制、退出路径；运行胶囊可暂停 / 继续 / 停止 |
| 内容搜索（Content Search） | ReaderShell | 搜索输入、上一条 / 下一条、打开结果 | 搜索结果、筛选、状态反馈 | `BottomSheetHost`、`KeyboardAvoidance`、`ReaderStateHost` | 结果尾部、提示 | 输入框、结果导航、打开结果、键盘上方主动作 |
| 内容替换（Content Replacement） | ReaderShell | 替换开关、保存动作 | 规则列表、编辑字段、测试反馈 | `BottomSheetHost`、`KeyboardAvoidance`、`ReaderStateHost` | 说明、列表尾部 | 开关、规则行、编辑字段、测试反馈、保存、临时关闭 |
| 换源（Source Switch） | FlowShell | `StepRegion`、`ComparisonRegion`、`ResultRegion`、返回阅读 | 候选来源、对照详情、检测结果 | `StateHost`、可选来源底表 | 候选列表非当前项、流程说明 | 当前来源、候选来源、检测状态、切换确认、返回阅读 |
| App 通用设置（General Settings） | SettingsShell | `BackTopBar`、可选恢复入口 | 设置分组、设置行、系统入口 | `OptionSheet`、`DialogHost`、`ToastHost`、`StateHost` | 说明文字、列表尾部 | 设置行、选项值、开关、恢复确认、返回 |
| 书架与搜索设置（Bookshelf and Search Settings） | SettingsShell | `BackTopBar`、清空确认入口 | 布局、列数、搜索历史、预览 | `OptionSheet`、`DialogHost`、`ToastHost` | 预览说明、列表尾部 | 布局选择、列数、清空历史确认、回写书架 |
| 隐私与权限（Privacy and Permissions） | SettingsShell | `BackTopBar`、系统设置入口 | 权限行、隐私开关、协议入口 | `DialogHost`、`ToastHost`、系统设置边界 | 协议说明、列表尾部 | 权限状态、系统设置入口、隐私开关、清理确认 |
| 缓存管理（Cache Management） | SettingsShell | `BackTopBar`、清理确认入口 | 缓存占用、分类、策略、进度 | `DialogHost`、`ToastHost`、`StateHost` | 位置说明、列表尾部 | 缓存占用、分类行、清理确认、清理进度、取消路径 |
| 关于与反馈（About and Feedback） | SettingsShell | `BackTopBar`、更新检查入口 | 版本卡、反馈、源码仓库、开源许可、帮助、诊断导出 | `ToastHost`、外部链接边界、`DialogHost`、`StateHost` | 贡献说明、弱提示 | 版本、反馈、源码、许可、帮助、更新检查、诊断导出、返回 |
| 同步与备份（Sync and Backup） | SettingsShell | `BackTopBar`、立即备份 / 恢复入口 | 备份位置、记录、自动备份、冲突处理 | `DialogHost`、`ToastHost`、权限边界、`StateHost` | 说明、历史尾部 | 立即备份、恢复确认、冲突解决、权限授权、进度 |
| 书源管理（Source Management） | SettingsShell | `BackTopBar`、检测全部、添加 / 编辑入口 | 搜索、筛选、来源列表、检测日志 | `DialogHost`、`ToastHost`、`StateHost`、编辑子状态 | 列表尾部、说明 | 搜索、筛选、启用开关、检测、编辑、日志、返回 |

## 入口、返回、上下文、事件（Entry, Back, Context, Events）

| 页面（Page） | 入口来源（Entry Sources） | 返回路径（Back Path） | 上下文字段（Context Fields） | 事件字段（Event Fields） |
|---|---|---|---|---|
| 书架（Bookshelf） | 应用启动、主导航、导入 / 加入 / 删除后返回 | 主 tab 根页；从二级页返回时恢复 tab、分组、滚动 | `MainNavContext.currentTab`、`LibraryContext.group/sort/filter/layout/selectedBook` | `search`、`more`、`groupChange(label)`、`read(book)`、`sortFilter`、`settings`、`openBook(book)`、`navChange(navType)` |
| 发现（Discover） | 主导航、来源推荐入口、刷新返回 | 返回主 tab；打开详情后回到发现原位置 | `MainNavContext.currentTab`、`BookContext`、`SourceContext`、推荐 / 榜单筛选 | `refresh`、`openBookDetail(book)`、`addToBookshelf(book)`、`read(book)`、`sourceDetect(source)`、`navChange(navType)` |
| RSS（RSS） | 主导航、订阅刷新、通知入口 | 返回主 tab；打开条目后恢复订阅流筛选 | `MainNavContext.currentTab`、`RssEntryContext`、未读筛选、订阅源 | `refresh`、`statusFilterChange(filter)`、`openEntry(entry)`、`addSubscription`、`markRead(entry)`、`navChange(navType)` |
| 设置首页（Settings Home） | 主导航、权限 / 备份提示回流 | 返回主 tab；二级页返回恢复设置入口位置 | `SettingsContext.entryKey`、权限状态、备份状态 | `openSetting(key)`、`quickEntry(key)`、`search(query)`、`navChange(navType)` |
| 书架空状态（Bookshelf Empty） | 书架无书、筛选无结果、首次启动 | 主 tab 空态返回根；搜索 / 导入完成后回书架 | `LibraryContext.group/sort/filter/layout`、空态原因 | `primaryAction`、`secondaryAction`、`search`、`importLocal`、`openDiscover`、`navChange(navType)` |
| 书籍搜索（Book Search） | 书架搜索、空态主动作、发现搜索入口 | 返回来源页并保留 tab、分组、筛选、滚动 | `LibraryContext.query/scope/group/sourceEntry`、`BookContext` | `back`、`more`、`queryChange(value)`、`clearQuery`、`scopeChange(scope)`、`groupChange(label)`、`historySelect(label)`、`submitSearch`、`openDetail(result)`、`addToBookshelf(result)`、`read(result)`、`retry`、`requestPermission` |
| 书籍详情（Book Detail） | 书架、搜索结果、发现、RSS、目录回退 | 返回来源列表；阅读进入 ReaderShell；来源选择关闭回详情 | `BookContext.bookId/title/author/cover/sourceId/chapter/progress` | `back`、`read(book)`、`addToBookshelf(book)`、`openDirectory(book)`、`openChapter(chapter)`、`sourceSelect(source)`、`toggleIntro` |
| 书籍目录（Book Directory） | 书籍详情、阅读控制层、当前章节入口 | 返回详情或 ReaderShell 来源；打开章节进入阅读 | `BookContext`、`ChapterContext.currentChapter/filter/anchor` | `backToDetail`、`openCurrentChapter`、`openChapter(chapter)`、`filterChange(filter)`、`locateCurrent` |
| 排序与筛选（Sort and Filter） | 书架更多、书架筛选、设置回写 | 应用 / 重置后回书架并刷新 LibraryContext | `LibraryContext.group/sort/order/filter/layout` | `sortSelect(sort)`、`orderSelect(order)`、`filterToggle(key)`、`reset`、`apply`、`dismiss` |
| 书籍操作底表（Book Action Sheet） | 书架管理态、书籍详情页、书籍长按浮层 | 不跳转页面；关闭回来源状态；删除确认后回书架并刷新集合 | `BookContext`、`LibraryContext`、来源页面、删除影响范围 | `edit(book)`、`moveGroup(book)`、`deleteRequest(book)`、`deleteCancel`、`deleteConfirm(book)`、`dismiss` |
| 分组管理（Group Management） | 书架分组入口、设置书架入口 | 返回书架并保留 group/sort/filter；命名弹窗关闭回列表 | `LibraryContext.groups/currentGroup/order` | `addGroupOpen`、`groupRenameOpen(group)`、`groupDeleteOpen(group)`、`groupReorder(from,to)`、`dialogSave(value)`、`dialogCancel` |
| 本地书导入（Local Import） | 书架空态、书架更多、系统分享入口 | 完成回书架并刷新集合；取消回来源页 | `LibraryContext.targetGroup`、`ImportContext.files/progress/results`、`BookContext` | `openSystemFilePicker`、`importProgress(event)`、`resultRowOpen(result)`、`chooseAgain`、`done`、`retryFailed` |
| 阅读入口（Reading Entry） | 书架继续阅读、书籍详情阅读、目录章节、换源成功后修复入口 | 继续 / 开始进入沉浸阅读；失败可回来源或进入换源；离线可继续缓存章节 | `ReaderContext.bookId/chapterId/progress/sourceId/openState`、`BookContext`、`SourceContext` | `backToSource`、`continueReading`、`startReading`、`openLoading`、`retryOpen`、`switchSource`、`continueCached` |
| 沉浸阅读（Immersive Reading） | 书架继续阅读、封面点击、书籍详情阅读、目录章节、控制层关闭、换源成功、自动翻页 / 朗读启动后返回 | 中心点击打开控制层；返回关闭阅读或回来源；运行胶囊展开时返回先收起胶囊；失败可返回来源或进入换源 | `ReaderContext.bookId/chapterId/progress/sourceId/appearance/runtimeCapsule`、`BookContext` | `tapPrevious`、`tapCenter`、`tapNext`、`pageChange(progress)`、`retry`、`openControls`、`switchSource`、`continueCached`、`backToSource`、`pauseRuntimeCapsule`、`stopRuntimeCapsule`、`dragRuntimeCapsule(anchor)` |
| 阅读控制层（Reader Control Layer） | 沉浸阅读中心点击、阅读模块返回、打开书籍后进入沉浸阅读 | 正文中部点击关闭控制层回沉浸阅读；重复点击当前 active 模块回默认控制层；换源进入 FlowShell 后回 ReaderShell | `ReaderContext.bookId/chapterId/progress/sourceId/appearance/ttsState` | `back`、`sourceChange`、`more`、`quickAction(actionType)`、`chapterChange(direction)`、`progressChange(value)`、`moduleChange(moduleType)`、`brightnessChange(value)`、`dismissControlLayer` |
| 目录与书签（TOC and Bookmarks） | 阅读控制层目录模块、阅读目录入口 | 打开章节后回沉浸阅读定位；重复点击目录模块回控制层 | `ReaderContext`、`ChapterContext.currentChapter`、`BookmarkContext` | `tabChange(tab)`、`openChapter(chapter)`、`openBookmark(bookmark)`、`moreAction(action)`、`dismiss` |
| 阅读外观（Reading Appearance） | 阅读控制层界面模块 | 参数即时回写 ReadingSurface；重复点击界面模块回控制层 | `ReaderContext.appearance/theme/fontSize/lineHeight/paragraphGap/letterSpacing/font` | `fontSizeDecrease`、`fontSizeIncrease`、`lineHeightChange(value)`、`paragraphGapChange(value)`、`letterSpacingChange(value)`、`themeChange(theme)`、`fontChange(font)` |
| 朗读（Read Aloud） | 阅读控制层朗读模块、阅读设置入口 | 关闭面板回阅读；开始朗读后回沉浸阅读并显示朗读运行胶囊；运行态保留 ReaderContext；重复点击朗读模块回控制层 | `ReaderContext.ttsState/range/chapterId/progress/runtimeCapsuleAnchor`、声音设置 | `startReadAloud`、`pauseReadAloud`、`continueReadAloud`、`stopReadAloud`、`previousSentence`、`nextSentence`、`speedChange(value)`、`voiceChange(voice)`、`rangeChange(range)`、`timerChange(value)`、`dragRuntimeCapsule(anchor)` |
| 阅读设置（Reading Settings） | 阅读控制层设置模块 | 应用设置后保留 ReaderShell；重复点击设置模块回控制层，不进入 SettingsShell | `ReaderContext.settings/appearance/behavior` | `toggleSetting(key)`、`cycleTapMode(value)`、`cyclePageAnimation(value)` |
| 自动翻页（Auto Page） | 阅读控制层快捷操作、阅读设置入口 | 开始后回沉浸阅读并显示自动翻页运行胶囊；停止 / 关闭回沉浸阅读；运行态保留退出入口 | `ReaderContext.autoPageState/speed/mode/progress/runtimeCapsuleAnchor` | `speedChange(value)`、`modeChange(mode)`、`startAutoPage`、`pauseAutoPage`、`continueAutoPage`、`stopAutoPage`、`dragRuntimeCapsule(anchor)` |
| 内容搜索（Content Search） | 阅读控制层搜索快捷操作 | 打开结果回正文定位；关闭回控制层并保留阅读进度 | `ReaderContext.bookId/chapterId/progress`、搜索 query/resultIndex | `queryChange(value)`、`previousResult`、`nextResult`、`openResult(result)`、`retry`、`clearQuery` |
| 内容替换（Content Replacement） | 阅读控制层替换快捷操作、阅读设置入口 | 快捷窗用于快速启停和查看规则摘要；打开规则或新增后进入完整设置页；保存后回控制层或正文；临时关闭不删除规则 | `ReaderContext.bookId`、`ReplacementContext.rules/enabled/draftRule/ruleName/ruleConfig/scope/matchCount` | `toggleReplacement(enabled)`、`toggleRule(rule)`、`openRule(rule)`、`addRule`、`ruleNameChange(value)`、`patternChange(value)`、`replacementChange(value)`、`scopeChange(scope)`、`testReplacement`、`saveRule` |
| 换源（Source Switch） | 阅读控制层换源、阅读打开失败、阅读中来源选择 | 取消 / 成功 / 失败都回 ReaderShell，保留书籍章节进度 | `ReaderContext.bookId/chapterId/progress/sourceId`、`SourceContext.candidateId/candidateList/detectResult` | `backToReading`、`openSourceSheet`、`filterChange(filter)`、`startDetect`、`cancelDetect`、`switchSource(source)`、`retry`、`grantPermission` |
| App 通用设置（General Settings） | 设置首页入口、系统设置回流 | 返回设置首页；OptionSheet / Dialog 先关闭 | `SettingsContext.settingKey/currentValue/pendingValue` | `themeChange(value)`、`selectOpen(key)`、`selectOption(value)`、`switchChange(key,value)`、`restoreConfirm`、`dismiss` |
| 书架与搜索设置（Bookshelf and Search Settings） | 设置首页、书架设置入口 | 返回设置首页或书架来源；布局变更回写 LibraryContext | `SettingsContext`、`LibraryContext.layout/columnCount/searchHistory` | `layoutChange(layout)`、`columnCountChange(count)`、`clearHistoryOpen`、`clearHistoryConfirm`、`previewChange` |
| 隐私与权限（Privacy and Permissions） | 设置首页权限提示、系统授权回流 | 系统设置返回后恢复来源设置项 | `SettingsContext.permissionState/privacyOptions/sourceEntry` | `openSystemSettings(permission)`、`togglePrivacyOption(key,value)`、`openPrivacyPolicy`、`clearPrivacyDataConfirm`、`refreshPermission` |
| 缓存管理（Cache Management） | 设置首页、阅读缓存提示 | 返回设置首页；清理中不丢返回路径 | `SettingsContext`、`CacheContext.size/categories/progress/strategy` | `calculateCache`、`openCleanupConfirm(category)`、`cleanupConfirm`、`cleanupCancel`、`toggleCacheStrategy(value)` |
| 关于与反馈（About and Feedback） | 设置首页、错误反馈入口 | 外部链接返回后恢复页面；离线状态保留重试 | `SettingsContext`、版本、网络状态、外部链接来源 | `checkUpdate`、`openFeedback`、`openSuggestion`、`openRepository`、`openLicense`、`exportDiagnosticLog`、`openHelp`、`retryNetwork` |
| 同步与备份（Sync and Backup） | 设置首页、备份提示、权限提示 | 恢复 / 授权 / 冲突处理后回本页并保留进度 | `SettingsContext`、`BackupContext.location/records/progress/conflict` | `selectBackupLocation`、`runBackupNow`、`restoreBackup(record)`、`restoreConfirm`、`resolveConflict(choice)`、`grantPermission` |
| 书源管理（Source Management） | 设置首页、发现来源入口、换源关联入口 | 返回设置首页；编辑 / 日志作为子状态返回列表 | `SourceContext.sourceId/group/query/detectResult`、`SettingsContext` | `queryChange(value)`、`groupFilterChange(group)`、`toggleSource(source,value)`、`detectSource(source)`、`detectAll`、`openSourceEdit(source)`、`saveSource(source)`、`openLog(source)` |

## 适配、文本、组件、验收（Adaptation, Text, Components, Acceptance）

| 页面（Page） | 断点 / 安全区 / 键盘（Breakpoint / Safe Area / Keyboard） | 文本规则（Text Rules） | 组件抽象（Componentization） | 验收项目（Acceptance Checks） |
|---|---|---|---|---|
| 书架（Bookshelf） | `sm` 单栏，`md+` 提高书籍密度；`ContentRegion` 底部 inset 避让 `MainNav`；本页不弹键盘 | 书名最多两行，作者 / 进度单行，主导航标签单行 | `BookCover`、`BookCoverGrid`、`ContinueReadingCard`、`ShelfChipGroup`、`MainNavItem` | 继续阅读不压过书籍集合；封面不错误裁切；最后一本书可滚到主导航上方 |
| 发现（Discover） | 主 tab 断点保持导航语义；底部 inset 避让 `MainNav`；搜索入口跳转后再接键盘 | 推荐标题两行，来源名 / 榜单项单行或两行截断 | `BookCard`、`SourceStatusBar`、`RankingRow`、`FilterChip`、`MainNavItem` | 推荐与来源入口优先；刷新不遮挡主导航；列表长文本不重叠 |
| RSS（RSS） | 主 tab 底部 inset；刷新态不改变根 Shell；订阅输入另页处理键盘 | 条目标题两行，来源 / 时间 / 未读状态单行 | `SegmentControl`、`SearchResultItem`、`StatusBadge`、`EmptyState` | 未读筛选不重置 tab；空态动作不被导航遮挡；末项可达 |
| 设置首页（Settings Home） | 主 tab 底部 inset；提示浮层不替换导航；搜索另页或内联时声明键盘 owner | 设置入口主文案单行，说明最多两行，状态徽标短文本 | `SettingRow`、`StatusBadge`、`SettingGroupCard`、`MainNavItem` | 入口列表末项可达；权限 / 备份提示可折叠但不遮挡入口 |
| 书架空状态（Bookshelf Empty） | 空态插图可压缩；主动作首屏可见；无键盘或跳转搜索处理 | 标题两行内，说明最多两行，按钮完整显示 | `EmptyState`、`PrimaryActionButton`、`SecondaryActionButton` | 主动作可见；权限 / 离线状态有恢复路径；空态不替换根 Shell |
| 书籍搜索（Book Search） | `sm` 单栏；键盘出现时输入框、错误提示、提交动作同时可见；结果列表底部 inset 避让 `BottomActionHost` | 结果书名两行，作者 / 来源 / 状态单行，按钮完整；搜索未提交时展示建议 / 历史 / 热门关键词，提交后展示结果，不显示 `搜索前` / `搜索后` 这类内部状态名 | `SearchBar`、`FilterChip`、`GroupRow`、`SearchResultItem`、`StateHost` | 键盘不遮挡搜索和提交；结果末项可达；事件 payload 不丢 result；内部状态名不进入用户可见文案 |
| 书籍详情（Book Detail） | 顶部避让安全区；底部动作避让系统底部；来源选择底表避让主动作 | 书名两行，简介折叠，来源状态短文本 | `BookDetailHeader`、`BookSummary`、`ChapterPreviewList`、`SourceStatusBar`、`PrimaryActionButton` | 阅读 / 目录主动作完整可见；长简介可折叠；来源选择关闭后详情不丢 |
| 书籍目录（Book Directory） | 列表底部 inset；定位当前章节不改变滚动语义；无键盘 | 章节名两行或截断，卷信息弱化 | `ChapterRow`、`CurrentChapterRow`、`SegmentControl`、`StateHost` | 当前章节可定位；长章节名不挤压状态；列表末项可达 |
| 排序与筛选（Sort and Filter） | 底表形态时高度不超过安全可操作区；键盘仅在搜索筛选出现时接管 | 选项文案单行，说明最多两行，按钮完整 | `OptionSheet`、`FilterChip`、`SegmentControl`、`PrimaryActionButton` | 应用 / 重置不被遮挡；底表 / 二级页形态明确；回写书架上下文 |
| 书籍操作底表（Book Action Sheet） | 操作列表随来源页布局；确认弹窗高于来源页面；无键盘 | 操作项单行或两行摘要，危险说明最多两行 | `ActionRow.Edit`、`ActionRow.Group`、`DangerActionRow`、`ConfirmDialog` | 不出现独立路由；Dialog 高于来源页面；删除影响范围明确 |
| 分组管理（Group Management） | 命名输入时保存动作位于键盘上方；列表底部 inset | 分组名单行截断，说明短两行 | `GroupRow`、`ReorderHandle`、`TextField`、`ConfirmDialog` | 命名不被键盘遮挡；删除后书籍去向明确；拖拽不改变语义 |
| 本地书导入（Local Import） | 系统文件选择器为外部边界；进度 / 结果列表底部 inset | 文件名两行，失败原因两行，按钮完整 | `ProgressBar`、`BookRow`、`ErrorState`、`PrimaryActionButton` | 失败可重试；结果末项可达；完成回书架并刷新 |
| 阅读入口（Reading Entry） | 入口浮层使用 ReaderStateHost；加载、失败、离线状态不替换 ReaderShell 根；无键盘 | 标题两行内，来源 / 进度短文本单行，继续 / 开始按钮完整 | `ReadingSurface`、`ReaderStateHost`、`StartReadingButton`、`ContinueReadingButton`、`ErrorState`、`OfflineState` | 继续和开始动作首屏可见；失败可重试和换源；离线继续保留章节和进度上下文 |
| 沉浸阅读（Immersive Reading） | 正文按阅读排版单位适配；点击热区稳定；打开 / 错误状态在 ReaderStateHost；运行胶囊锚定正文安全空区，必要时收起到边缘；无键盘 | 正文遵循阅读字号 / 行距，页脚短文本；错误标题两行，来源说明短文本；胶囊文案一行短句 | `ReadingSurface`、`ReadingParagraph`、`FooterProgressInfo`、`RuntimeCapsule`、`LoadingState`、`ErrorState`、`SourceStatusBar`、`TextActionButton` | 正文不被截断；运行胶囊不触发正文重新分页；胶囊不遮挡首段首两行、末段末两行和页脚；点击热区明确；失败不丢书籍和进度 |
| 阅读控制层（Reader Control Layer） | 覆盖层不改变正文布局；底部面板和 `ReaderModuleNav` 避让安全区；搜索 / 替换模块另行接管键盘 | 书名 / 来源单行，章节标题两行，模块标签单行 | `ReaderTopBar`、`QuickAction`、`ChapterProgressCard`、`BrightnessSlider`、`ReaderModuleButton` | 四模块 active 只变颜色和背景；尺寸 / 间距 / 相对位置不变；切模块不重置正文；重复点击当前模块关闭模块面板 |
| 目录与书签（TOC and Bookmarks） | 面板列表滚动；`ReaderModuleNav` 固定；搜索出现时键盘避让输入和结果导航 | 当前 demo 中目录章节名单行、无下方小字；书签可显示摘要、时间 / 位置单行 | `TocPanel`、`ChapterRow`、`BookmarkRow`、`SegmentControl` | 面板末项可达；打开章节回正文定位；更多菜单不遮挡主动作 |
| 阅读外观（Reading Appearance） | 面板高度固定区间；主题预览不替代正文状态；无键盘 | 主题名、字体名、参数值单行；主题色块为无图标纯色块 | `AppearancePanel`、`ThemeSwatch`、`FontOption`、`PreviewCard`、`ProgressSlider` | 主题即时预览；字号、行距、段距、字距映射 ReaderShell 运行态 |
| 朗读（Read Aloud） | 播放控制固定可见；启动后用沉浸态运行胶囊承载暂停 / 继续 / 停止；胶囊锚定正文安全空区，必要时收起到边缘；无键盘 | 声音名 / 范围单行；无示例正文；开始/暂停按钮只显示图标；胶囊文案只显示状态和句序 / 范围 | `TTSPanel`、`ReadAloudButton`、`PlayPauseControl`、`RuntimeCapsule`、`ProgressSlider` | 播放控制不被滚动挤出；后台运行不重建阅读页；胶囊不遮挡正文主阅读区；停止路径明确 |
| 阅读设置（Reading Settings） | 设置面板在 ReaderShell 内；不进入 SettingsShell；无键盘 | 设置主文本和值文本单行；开关和值项即时反馈；无更多阅读设置入口 | `ReaderPanel`、`SettingRow`、`Switch`、`SegmentControl`、`OptionSheet` | 与 SettingsShell 边界明确；设置变化不重置正文；设置快捷窗只承载当前 demo 的实际控件 |
| 自动翻页（Auto Page） | 运行态使用沉浸态运行胶囊，不使用正文中央浮窗；速度控制固定可达；胶囊锚定正文安全空区，必要时收起到边缘；无键盘 | 模式名单行，说明短两行；胶囊只显示速度 / 模式摘要 | `ProgressSlider`、`SegmentControl`、`PlayPauseControl`、`RuntimeCapsule`、`ReaderPanel` | 开始 / 暂停 / 继续 / 停止都可达；停止后回沉浸阅读；胶囊不遮挡正文主阅读区 |
| 内容搜索（Content Search） | 键盘出现时输入、结果导航、打开动作可见；结果列表底部 inset | 搜索词单行，结果摘要两行，高亮不破坏行高 | `SearchBar`、`SearchResultItem`、`IconButton`、`ReaderPanel` | 结果定位不丢进度；上一条 / 下一条可达；键盘不遮挡主动作 |
| 内容替换（Content Replacement） | 快捷窗固定展示规则摘要，内部滚动承载 2-3 条以上规则；完整页编辑字段聚焦时保存 / 测试位于键盘上方；规则列表可滚动 | 快捷窗规则名单行、配置摘要单行、范围 / 命中标签短文本；完整页正则 / 替换文本可横向或两行处理 | `Switch`、`TextField`、`SettingRow`、`ReplacementRuleSummaryRow`、`PrimaryActionButton`、`ReaderPanel` | 快捷窗可同时判断规则名、配置摘要、执行范围和启用状态；输入、测试反馈、保存同时可达；保存和临时关闭语义分离 |
| 换源（Source Switch） | 默认横向三块区；窄屏降级纵向分步；左右安全区和系统手势区避让；筛选输入出现时结果确认仍可达 | 来源名单行，检测状态短文本，章节 / 延迟两行内 | `SourceCandidateRow`、`CurrentSourceBadge`、`DetectStatusBadge`、`SwitchSourceButton` | 状态区不遮挡切换确认；检测可取消；成功保留阅读位置；Flow 不进主导航 |
| App 通用设置（General Settings） | 设置列表底部 inset；OptionSheet 避让安全区；无键盘 | 设置主文本单行，说明两行，值文本单行 | `SettingGroupCard`、`SettingRow`、`SelectRow`、`OptionSheet`、`ConfirmDialog` | 恢复确认焦点清楚；列表末项可达；选项回写 SettingsContext |
| 书架与搜索设置（Bookshelf and Search Settings） | 列表底部 inset；清空确认弹窗高于设置内容；无键盘 | 布局名 / 值单行，预览说明两行 | `SettingRow`、`SegmentControl`、`OptionSheet`、`ConfirmDialog`、`PreviewCard` | 布局设置回写书架；清空历史有确认；预览不挤压主设置项 |
| 隐私与权限（Privacy and Permissions） | 系统设置为外部边界；权限返回后恢复状态；无键盘 | 权限名单行，影响说明两行，协议链接短文本 | `PermissionRow`、`Switch`、`StatusBadge`、`ConfirmDialog`、`LinkRow` | 系统设置返回保留来源；清理隐私数据说明影响范围；权限状态可恢复 |
| 缓存管理（Cache Management） | 清理进度不替换返回栏；列表底部 inset；无键盘 | 缓存分类名单行，占用值单行，说明两行 | `CacheSizeCard`、`CacheCategoryRow`、`ProgressBar`、`ConfirmDialog` | 清理有取消路径；分类文本不重叠；危险清理必须确认 |
| 关于与反馈（About and Feedback） | 外部链接不替换设置栈；离线状态进 state slot；无键盘 | 版本号单行，链接名单行，贡献说明弱化 | `VersionCard`、`LinkRow`、`FeedbackEntry`、`DiagnosticExportAction`、`StatusBadge`、`ToastHost` | 离线有恢复；外部链接边界清楚；版本卡不遮挡入口；不出现用户协议或隐私协议 |
| 同步与备份（Sync and Backup） | 备份 / 恢复进度固定可见；权限弹窗高于内容；无键盘 | 备份记录名两行，状态 / 时间单行 | `BackupActionRow`、`BackupRecordRow`、`ProgressBar`、`ConfirmDialog`、`PermissionRow` | 进度可见；恢复覆盖影响明确；权限状态有入口；冲突可解决 |
| 书源管理（Source Management） | 搜索输入出现时列表滚动并保留检测动作；编辑子状态可处理键盘 | 来源名单行，URL / 状态两行内，日志摘要两行 | `SearchBar`、`FilterChip`、`SourceRow`、`StatusBadge`、`Switch` | 检测全量不阻塞返回；编辑 / 日志不变成主 tab；长来源名截断 |

## 规划闭合判断（Planning Closure Judgment）

- 30 个页面均有 owner Shell、固定 / 滚动 / 覆盖 / 状态归属。
- 30 个页面均有入口、返回、上下文和事件字段。
- 30 个页面均有断点 / 安全区 / 键盘、文本、组件和验收字段。
- 当前闭合的是“页面规划输入”；真实实现仍需要 ViewModel、Navigation、真实业务状态、极端文本、无障碍和设备验证继续闭合。
