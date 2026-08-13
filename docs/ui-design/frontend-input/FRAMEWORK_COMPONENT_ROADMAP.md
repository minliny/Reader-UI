# 框架与组件路线图（Framework and Component Roadmap）

本文按统一格式 `中文名称（English Name）` 梳理当前已完成内容和后续规划。后续文档、组件规格、审计结论和实现说明都应沿用这个命名格式。

完整框架、共享 kit、页面归属和组件化清单见 `FRAMEWORK_COMPONENT_CATALOG.md`。当前项目规划需求见 `FRONTEND_PLANNING_REQUIREMENTS.md`，开工前规划需求模板见 `FRONTEND_PLANNING_REQUIREMENTS_TEMPLATE.md`，完整应用前端设计稿模板见 `FRONTEND_DESIGN_SPEC_TEMPLATE.md`，当前 30 页完成度审计见 `FRONTEND_DESIGN_COMPLETION_AUDIT.md`。页面结构和 UI 设计稿的 shell/slot 梳理见 `PAGE_STRUCTURE_MAP.md`，页面间关系和跨 shell 交互流向见 `PAGE_RELATIONSHIP_MAP.md`。真实 Android Compose 接入顺序见 `FRONTEND_MAPPING_GUIDE.md`，主导航和图标专项清单见 `MAIN_NAV_RECONCILIATION.md`、`ICON_COMPOSE_MAPPING.md`。

## 总原则（Overall Rule）

- 框架化（Shellization）：抽页面骨架，例如状态栏、顶部栏、内容区、底部导航、弹层宿主和状态容器。
- 组件化（Componentization）：抽可复用 UI 单元，例如按钮、搜索框、卡片、列表行、开关和滑杆。
- 页面内容（Page Content）：只作为业务内容渲染，不强行抽成跨页面通用组件。
- 视觉分支（Visual Scheme）：保留蓝色编辑风（BlueEditorial）、森林工具风（ForestUtility）和阅读器风（Reader），不得把不同视觉风格硬合并成一个混合组件。

## 已完成内容（Completed Work）

| 中文名称（English Name） | 当前状态（Current Status） | 证据与说明（Evidence and Notes） |
|---|---|---|
| 前端输入件交付格式（Frontend Input Delivery Format） | 已完成（Completed） | 30 个页面都有输入包、fixture、renderer、preview、state matrix、README、组件规格和 manifest 目标。 |
| 框架元数据契约（Shell Metadata Contract） | 已完成（Completed） | `contracts.d.ts`、`manifest.json` 和 `validate-frontend-inputs.js` 已覆盖 `shellName`、`pageRole`、`slots`、`stateModel`；`FrontendInputComposeCoverageTest` 守住正式 shell taxonomy 和目标数量，`ReaderSharedComponentsStructureTest` 守住五个 runtime shell 到 Compose 骨架、slot 和 preview 的锚点。 |
| 设置页框架（SettingsShell） | 已完成（Completed） | 7 个设置二级页已通过 `SettingsPageKit` 输出统一设置页结构和真实 DOM slots。 |
| 主标签页框架（MainTabShell） | 已完成第一版（First Version Completed） | 书架、发现、RSS、设置 4 个主标签页已通过 `MainTabPageKit` 输出统一主标签结构；Compose 侧已补四个主标签页状态矩阵。 |
| 书架链路框架（LibraryShell） | 已完成（Completed） | 8 个书架链路页面已通过 `LibraryPageKit` 输出统一 `StackFrame / BackTopBar / ContentRegion / BottomActionHost / SheetHost / DialogHost / StateHost`。 |
| 主导航交互规则（Main Navigation Interaction Rule） | 已完成并已校验（Completed and Validated） | 四个按钮固定为书架、发现、RSS、设置；选中态只改变背景、图标颜色和文字颜色，不改变位置。 |
| 本地 HTML 文件要求（Local HTML File Requirements） | 已梳理并守卫（Documented and Guarded） | 96 个本地 HTML 已按预览页、状态矩阵页、组件拆分页、组件库预览页、共享 Shell Kit 预览页、素材库预览页和历史临时预览分层，并由 `FrontendInputHtmlInventoryTest` 守住库存分类和 manifest 排除规则。 |
| 框架与组件总目录（Framework and Component Catalog） | 已梳理（Documented） | `FRAMEWORK_COMPONENT_CATALOG.md` 已按 Shell、共享 kit、页面归属、组件类别和固定交互规则整理。 |
| 公共组件库（Component Library） | 已覆盖并守卫当前输入件（Covered and Guarded for Current Inputs） | 当前公共库已经覆盖本轮已转化页面需要的框架组件和高复用组件；49 个组件卡、6 个 section、fixture 图标 token、manifest 和验证报告由 `FrontendInputComponentLibraryInventoryTest` 守住，核心语义组件及五个 runtime shell 的 Compose 实现锚点由 `ReaderSharedComponentsStructureTest` 守住。 |
| 公共素材库（Asset Library） | 已完成第一版并守卫（First Version Completed and Guarded） | `asset-library` 已登记 30 张 UI 设计图、6 张封面素材和统一图标 token，并由 `FrontendInputAssetLibraryInventoryTest` 守住 fixture、图标注册表、manifest 和验证报告同步。 |
| 设计 Token 契约（Design Token Contract） | 已完成首版并守卫（First Version Completed and Guarded） | `design-tokens.json` 定义 70 个 token，`tokens.css` 负责 HTML 变量落地，覆盖颜色、基础间距、frame、安全区、shell 尺寸、z-index、文本范围、字号、圆角、阴影和 focus；`ReaderDesignTokenContractTest` 追溯 Compose theme 源文件，`validate-frontend-inputs.js` 校验运行时关键 CSS 变量。 |
| 阅读器框架（ReaderShell） | 已完成（Completed） | 阅读入口、阅读控制层、目录与书签、阅读外观、朗读、阅读设置、自动翻页、内容搜索、内容替换、沉浸阅读 10 页已接入 `ReaderShellKit`，并通过 DOM slot 校验。 |
| 横向流程框架（FlowShell） | 已完成并守卫（Completed and Guarded） | 换源页面已通过 `ReaderShellKit.renderFlowShell(...)` 输出 `FlowFrame / StepRegion / ComparisonRegion / ResultRegion / StateHost`，并通过 DOM slot 校验；`FlowShell StateHost` 已固化为非空状态摘要，由 `FrontendInputFlowShellInventoryTest` 守住输入包、manifest、验证报告、文档和 Compose preview 锚点同步。 |
| Compose 覆盖守卫（Compose Coverage Guard） | 已建立并扩展（Established and Extended） | `FrontendInputComposeCoverageTest` 已覆盖 30 张 UI 设计图、30 个输入包、spec 状态声明、manifest preview/state-matrix 目标、shell taxonomy、验证报告同步、Compose 源码落点和 preview 状态；`ReaderSharedComponentsStructureTest` 已覆盖 runtime shell taxonomy 到 Compose 骨架/slot/preview 锚点；`ReaderShellComposeUiTest` 已作为首个 androidTest UI test 编译通过。 |

## 页面框架（Page Shells）

| 中文名称（English Name） | 适用页面（Applicable Pages） | 固定结构（Fixed Structure） | 当前状态（Current Status） |
|---|---|---|---|
| 公共素材库框架（AssetLibraryShell） | UI 设计图、书籍封面、图标 token（UI design screens, book covers, icon tokens） | 基础信息、UI 图、图标、封面、补齐图标、使用规则（Foundations, screen assets, icon assets, cover assets, supplemented icons, usage rules） | 已完成（Completed） |
| 主标签页框架（MainTabShell） | 书架、发现、RSS、设置（Bookshelf, Discover, RSS, Settings） | 手机画布、状态栏、顶部栏、内容区、底部四栏导航、状态容器（App frame, status bar, top bar, content region, bottom navigation, state host） | 已完成（Completed） |
| 设置页框架（SettingsShell） | App 通用设置、书架与搜索设置、隐私与权限、缓存管理、关于与反馈、同步与备份、书源管理（General settings, bookshelf/search settings, privacy/permissions, cache, about/feedback, sync/backup, source management） | 返回顶栏、设置内容区、设置分组、提示宿主、弹窗宿主、状态容器（Back top bar, settings content, setting sections, toast host, dialog host, state host） | 已完成（Completed） |
| 书架链路框架（LibraryShell） | 书架空状态、书籍搜索、书籍详情、书籍目录、排序筛选、书籍操作底表、分组管理、本地书导入（Library empty, book search, book detail, directory, sort/filter, action sheet, group management, local import） | 返回顶栏、内容区、底部操作区、底表宿主、弹窗宿主、状态容器（Back top bar, content region, bottom action host, sheet host, dialog host, state host） | 已完成（Completed） |
| 阅读器框架（ReaderShell） | 阅读入口、阅读控制层、目录与书签、阅读外观、朗读、阅读设置、自动翻页、内容搜索、内容替换、沉浸阅读（Reading entry, reader controls, TOC/bookmarks, appearance, TTS, settings, auto page, in-book search, replacement, immersive reading） | 阅读正文底层、阅读覆盖层、模块导航、底表宿主、阅读状态容器（Reading surface, overlay host, module navigation, bottom sheet host, reader state host） | 已完成（Completed） |
| 横向流程框架（FlowShell） | 换源（Source switching） | 横向画布、步骤区、对照区、结果区、状态区（Landscape frame, step region, comparison region, result region, state host） | 已完成（Completed） |

## 基础组件（Primitive Components）

| 中文名称（English Name） | 当前状态（Current Status） | 说明（Notes） |
|---|---|---|
| 图标按钮（IconButton） | 已沉淀（Available） | 顶栏、操作入口和列表行通用。 |
| 搜索框（SearchBar / SearchInput） | 已沉淀（Available） | 书籍搜索、发现入口、阅读内搜索复用同一语义。 |
| 筛选胶囊（Chip / FilterChip） | 已沉淀（Available） | 分组、RSS 筛选、排序筛选复用。 |
| 分段控件（SegmentControl / SegmentTab） | 已沉淀（Available） | 设置页、阅读目录/书签、阅读外观复用。 |
| 开关（Switch） | 已沉淀（Available） | 设置二级页和管理页复用。 |
| 输入框（TextField） | 已定义（Defined） | 内容替换和书源编辑场景复用。 |
| 进度条（ProgressBar） | 已沉淀（Available） | 书籍进度和阅读进度复用。 |
| 进度滑杆（ProgressSlider） | 已定义（Defined） | 阅读控制层和自动翻页相关页面复用。 |
| 主按钮（PrimaryActionButton） | 已沉淀（Available） | 空态、导入、重试和开始类动作。 |
| 次按钮（SecondaryActionButton） | 已沉淀（Available） | 管理、切换、辅助动作。 |
| 文本按钮（TextActionButton） | 已沉淀（Available） | 低权重跳转和局部操作。 |
| 底表（BottomSheet） | 已沉淀（Available） | 操作底表、选择底表和阅读模块底表。 |
| 确认弹窗（ConfirmDialog） | 已沉淀（Available） | 危险操作必须使用具体结果文案。 |
| 加载状态（LoadingState） | 已沉淀（Available） | 只替换内容区，不替换根框架。 |
| 空状态（EmptyState） | 已沉淀（Available） | 保留当前 shell 和上下文。 |
| 错误状态（ErrorState） | 已沉淀（Available） | 保留重试或替代入口。 |
| 权限状态（PermissionState） | 已沉淀（Available） | 权限说明和系统设置入口。 |

## 业务组件（Product Components）

| 中文名称（English Name） | 当前状态（Current Status） | 说明（Notes） |
|---|---|---|
| 书籍封面（BookCover） | 已沉淀（Available） | 书架、详情、搜索、RSS 和发现内容复用。 |
| 书籍卡片（BookCard） | 已沉淀（Available） | 书架封面模式和推荐内容复用。 |
| 书籍列表行（BookRow） | 已沉淀（Available） | 搜索、目录外关联列表可复用。 |
| 书籍摘要（BookSummary） | 已定义（Defined） | 操作底表和详情相关页面复用。 |
| 书籍详情头部（BookDetailHeader） | 已有页面组件，已进入 LibraryShell（Page Component Exists, In LibraryShell） | 不把完整 Hero 组合抽成跨域通用组件。 |
| 章节行（ChapterRow） | 已沉淀（Available） | 目录页和阅读目录共用。 |
| 当前章节行（CurrentChapterRow） | 已定义（Defined） | 当前阅读位置高亮。 |
| 章节预览列表（ChapterPreviewList） | 已定义（Defined） | 详情页章节预览复用。 |
| 简介卡片（IntroCard） | 已定义（Defined） | 详情页内复用。 |
| 搜索结果项（SearchResultItem） | 已沉淀（Available） | 书籍搜索、发现和内容搜索有不同数据映射。 |
| 来源状态条（SourceStatusBar） | 已沉淀（Available） | 发现、书源管理和来源检测复用。 |
| 榜单行（RankingRow） | 已沉淀（Available） | 发现来源榜单复用。 |
| 分组行（GroupRow） | 已定义，已进入 LibraryShell（Defined, In LibraryShell） | 分组管理通过 `DialogHost` 承载命名和删除确认。 |
| 排序手柄（ReorderHandle） | 已定义（Defined） | 只用于可排序行。 |

## 阅读组件（Reader Components）

| 中文名称（English Name） | 当前状态（Current Status） | 说明（Notes） |
|---|---|---|
| 阅读正文区域（ReadingSurface） | 已接入 ReaderShell（In ReaderShell） | 属于 ReaderShell，不作为普通内容卡。 |
| 阅读段落（ReadingParagraph） | 已定义（Defined） | 只承载正文样式，不承载跨页面业务逻辑。 |
| 阅读顶部栏（ReaderTopBar） | 已接入 ReaderShell（In ReaderShell） | 阅读控制层固定骨架的一部分。 |
| 阅读模块导航（ReaderModuleNav） | 已接入 ReaderShell（In ReaderShell） | 四个模块按钮必须保持位置稳定。 |
| 快捷操作（QuickAction） | 已定义（Defined） | 搜索、自动翻页、替换等入口。 |
| 阅读面板（ReaderPanel） | 已接入 ReaderShell（In ReaderShell） | 目录、外观、朗读、设置等模块面板的宿主结构。 |
| 目录面板（TocPanel） | 已接入 ReaderShell（In ReaderShell） | 与目录与书签页面合并规则。 |
| 外观面板（AppearancePanel） | 已接入 ReaderShell（In ReaderShell） | 主题、字体、预览卡。 |
| 朗读面板（TTSPanel） | 已接入 ReaderShell（In ReaderShell） | 播放控制、声音、语速。 |
| 亮度滑杆（BrightnessSlider） | 已定义（Defined） | 阅读控制层必须组件化。 |
| 书签行（BookmarkRow） | 已定义（Defined） | 阅读目录与书签复用。 |
| 主题色块（ThemeSwatch） | 已定义（Defined） | 必须表达背景和文字对比。 |
| 字体选项（FontOption） | 已定义（Defined） | 阅读外观复用。 |
| 预览卡片（PreviewCard） | 已定义（Defined） | 阅读外观即时预览。 |
| 朗读按钮（ReadAloudButton） | 已定义（Defined） | 开始、暂停、继续。 |
| 播放控制（PlayPauseControl） | 已定义（Defined） | 上一句、播放/暂停、下一句。 |

## 设置组件（Settings Components）

| 中文名称（English Name） | 当前状态（Current Status） | 说明（Notes） |
|---|---|---|
| 设置分组卡（SettingGroupCard） | 已沉淀（Available） | 设置首页和设置二级页复用。 |
| 设置行（SettingRow） | 已沉淀（Available） | SettingsPageKit 核心组件。 |
| 选择行（SelectRow） | 已沉淀（Available） | 默认只展示当前值；短选项点击后打开锚定当前行的选项下拉浮层。 |
| 选项下拉浮层（OptionDropdown） | 已沉淀（Available） | App 主题、语言、启动页等短选项使用；以列表展示全部选项并标识当前项；选项字号与设置行当前值一致；可覆盖下一行部分内容，但不改变列表结构，也不覆盖屏幕底部。 |
| 选项底表（OptionSheet） | 已沉淀（Available） | 仅用于长列表、复杂说明或需要独立确认的选择。 |
| 危险操作行（DangerActionRow） | 已沉淀（Available） | 必须接确认弹窗。 |
| 权限行（PermissionRow） | 已沉淀（Available） | 权限状态和系统设置入口。 |
| 状态徽标（StatusBadge） | 已沉淀（Available） | good、warn、danger、info 语义。 |
| 缓存占用卡（CacheSizeCard） | 已沉淀（Available） | 缓存管理复用。 |
| 缓存分类行（CacheCategoryRow） | 已沉淀（Available） | 缓存分类和占用量。 |
| 版本卡（VersionCard） | 已沉淀（Available） | 关于与反馈复用。 |
| 链接行（LinkRow） | 已沉淀（Available） | 协议、许可、帮助等跳转。 |
| 备份操作行（BackupActionRow） | 已沉淀（Available） | 同步与备份复用。 |
| 备份记录行（BackupRecordRow） | 已沉淀（Available） | 备份时间、位置、可恢复状态。 |
| 书源行（SourceRow） | 已沉淀（Available） | 书源管理复用。 |

## 阅读控制层（Reader Control Layer）

阅读控制层（Reader Control Layer）必须归入阅读器框架（ReaderShell），不是书架链路框架（LibraryShell），也不是主标签页框架（MainTabShell）。

当前状态（Current Status）：阅读控制层、目录与书签、阅读外观、朗读、阅读设置、自动翻页、内容搜索、内容替换、沉浸阅读已完成 ReaderShell kit 统一。

必须框架化（Must Be Shellized）：

- 阅读正文底层（Reading Surface）
- 顶部阅读控制栏（Reader Top Bar）
- 底部控制面板（Bottom Control Panel）
- 右侧亮度栏（Brightness Rail）
- 四模块导航（Reader Module Navigation）
- 页脚进度信息（Footer Progress Info）

必须组件化（Must Be Componentized）：

- 目录按钮（TOC Button）
- 朗读按钮（TTS Button）
- 界面按钮（Appearance Button）
- 设置按钮（Settings Button）
- 搜索快捷操作（Search Quick Action）
- 自动翻页快捷操作（Auto Page Quick Action）
- 替换快捷操作（Replacement Quick Action）
- 章节进度卡（Chapter Progress Card）
- 亮度滑杆（Brightness Slider）

四个模块按钮交互（Four Module Button Interaction）：

- 选中后背景加深（Darker selected background）
- 中间图标颜色反转（Inverted center icon color）
- 下方文字颜色变化（Changed label color）
- 按钮尺寸不变（Fixed button size）
- 按钮间距不变（Fixed spacing）
- 相对位置不变（Stable relative position）
- 重复点击当前选中模块，退出模块面板并回到默认阅读控制层（Tap active module again to close the module panel and return to default reader controls）

当前 demo 模块面板规则（Current Demo Module Panel Rules）：

- 目录面板（TOC Panel）：目录行以章节名为主，右侧显示下载和书签状态图标；不显示章节摘要、更新时间、搜索或完整目录入口。
- 朗读面板（TTS Panel）：不展示示例正文；开始/暂停按钮中间只显示图标。
- 界面面板（Appearance Panel）：主题色块是无图标纯色块；参数区按字号、行距、段距、字距两列展示。
- 设置面板（Reader Settings Panel）：开关和值项在 ReaderShell 内即时切换，不进入 SettingsShell。

## 不应组件化（Should Not Be Componentized）

- 整屏截图（Full-screen screenshot）
- 阅读正文具体内容（Actual reading text content）
- 书籍详情页完整 Hero 组合（Full book detail hero composition）
- 发现页整页大块内容（Entire Discover page content block）
- 设置页整页大块内容（Entire Settings page content block）
- 换源横向整屏流程（Full landscape source-switching flow）
- 混合视觉风格组件（Mixed-scheme components）

## 后续开发顺序（Development Order）

1. 真实前端映射（Frontend Mapping）：按 `FRONTEND_MAPPING_GUIDE.md` 把已归一的 MainTabShell、LibraryShell、ReaderShell、FlowShell、SettingsShell 映射到实际 Android Compose 组件结构；公共组件库核心语义和五个 runtime shell 已由 `ReaderSharedComponentsStructureTest` 追溯到 Compose 实现锚点。
2. 主导航差异收敛（Main Navigation Reconciliation）：Android 代码中的主入口已收敛到 `书架 / 发现 / RSS / 设置`；后续变更不得恢复 `书源 / 我的` 作为主 tab。
3. 图标映射收敛（Icon Mapping Reconciliation）：主导航、书架、发现、RSS、设置二级页、书源链路、共享状态组件和阅读控制层已接入 `ReaderIconToken`；生产 UI 直连 Material Icons 已由 `ReaderIconImportBoundaryTest` 守卫，后续重点是同步素材库缺源状态。
4. 状态矩阵落地（State Matrix Implementation）：30 张 UI 设计图和 30 个正式输入包已建立第一批 Compose preview/state matrix 输入，并由 `FrontendInputComposeCoverageTest` 守卫输入包、spec、manifest、Compose source 和 preview 覆盖；后续继续把这些状态接入真实导航、真实业务数据和可交互 UI test。

## 本地 HTML 要求（Local HTML Requirements）

本地 HTML 文件的角色、准入规则和相关文档写法以 `HTML_FILE_REQUIREMENTS.md` 为准。可见 UI 文案（Visible UI Text）必须保持设计稿原文；文档标题、组件标题和验收条目使用 `中文名称（English Name）`。
