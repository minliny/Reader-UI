# 框架与组件总目录（Framework and Component Catalog）

本文把当前本地前端输入件中的页面框架、共享 kit、组件库内容和后续抽象边界整理为一个可交付目录。命名统一使用 `中文名称（English Name）`；可见 UI 文案仍以设计稿原文为准，不强行双语化。

## 当前结论（Current Conclusion）

- 前端输入件（Frontend Inputs）：当前 manifest 有 62 个验证目标，包括 29 个页面的 `preview.html` 和 `state-matrix.html`、1 个公共组件库预览、1 个共享 Shell Kit 预览、1 个公共素材库预览，以及 1 个前端 Demo 设计稿预览。
- 本地 HTML（Local HTML）：当前共有 96 个本地 HTML；其中 93 个位于 `frontend-input` 范围（87 个正式页面 HTML、2 个历史临时预览页、4 个公共库/示例 HTML），另有 3 个早期独立复刻页；`preview 2.html` 和早期独立复刻页不作为正式输入件。
- 已有共享 kit（Implemented Shared Kits）：主标签页框架（MainTabShell）、书架链路框架（LibraryShell）、设置页框架（SettingsShell）、阅读器框架（ReaderShell）、横向流程框架（FlowShell）和中心化共享 Shell Kit（Shared Shell Kit）已经可用。
- 已完成共享 kit（Completed Shared Kits）：阅读器框架（ReaderShell）9 页已接入中心化 `ReaderShellKit`；横向流程框架（FlowShell）1 页已接入中心化 `ReaderShellKit.renderFlowShell(...)`。
- 设计 token 状态（Design Token Status）：`design-tokens.json` 已定义 70 个 token，`tokens.css` 已落地颜色、基础间距、frame、安全区、shell 尺寸、z-index、文本范围、字号、圆角、阴影和 focus 变量，并由 HTML 验证脚本和 Compose token 单测守卫。
- 组件库状态（Component Library Status）：公共组件库已经覆盖当前 29 个页面需要的基础控件、书籍组件、阅读组件、设置组件、底表面板和状态组件；49 个组件卡和 fixture/manifest/report 同步由 `FrontendInputComponentLibraryInventoryTest` 守卫，核心语义名已由 `ReaderSharedComponentsStructureTest` 追溯到 Compose 实现锚点。
- 素材库状态（Asset Library Status）：公共素材库已经登记 29 张 UI 设计图、6 张书籍封面和 79 个统一图标 token，并由 `FrontendInputAssetLibraryInventoryTest` 守住 fixture、图标注册表、manifest 和验证报告同步。

## 输入件规模（Input Scale）

| 中文名称（English Name） | 数量（Count） | 说明（Notes） |
|---|---:|---|
| 页面输入包（Page Input Packages） | 29 | 每页包含 `fixture.json`、`fixture.js`、`render.js`、`README.md`、`COMPONENT_SPEC.md`。 |
| 页面预览页（Preview Pages） | 29 | 每页一个正式 `preview.html`。 |
| 状态矩阵页（State Matrix Pages） | 29 | 每页一个正式 `state-matrix.html`。 |
| 组件拆分页（Component Reference Pages） | 29 | 每页一个 `components.html`，作为拆分和审计参考。 |
| 公共组件库页（Component Library Page） | 1 | `frontend-input/component-library/preview.html`。 |
| 公共素材库页（Asset Library Page） | 1 | `frontend-input/asset-library/preview.html`。 |
| manifest 验证目标（Manifest Targets） | 62 | 29 个预览、29 个状态矩阵、1 个组件库预览、1 个共享 Shell Kit 预览、1 个素材库预览、1 个前端 Demo 设计稿预览。 |
| 历史临时预览（Legacy Preview Candidates） | 2 | `preview 2.html` 不进入 manifest。 |
| 历史独立复刻页（Legacy Standalone Reproduction Pages） | 3 | `bookshelf-cover-mode.html`、`frontend-demo/index.html`、`reader-control-layer.html` 仅作历史参考。 |

## 页面框架总览（Page Shell Overview）

| 中文名称（English Name） | manifest 目标（Manifest Targets） | 覆盖页面（Covered Pages） | 固定槽位（Fixed Slots） | 当前状态（Current Status） |
|---|---:|---|---|---|
| 公共素材库框架（AssetLibraryShell） | 1 | 公共素材库（Asset Library） | `foundations`、`screenAssets`、`iconAssets`、`bookCoverAssets`、`missingSupplements`、`usageRules` | 已完成输入件（Input Completed） |
| 公共组件库框架（ComponentLibraryShell） | 3 | 公共组件库、共享 Shell Kit、前端 Demo 设计稿（Component Library, Shared Shell Kit, Frontend Demo Draft） | `foundations`、`appShell`、`basicControls`、`cardsRows`、`sheetsPanels`、`states` | 已完成输入件（Input Completed） |
| 主标签页框架（MainTabShell） | 8 | 书架、发现、RSS、设置（Bookshelf, Discover, RSS, Settings） | `appFrame`、`statusBar`、`appTopBar`、`contentRegion`、`mainNav`、`stateHost` | 已完成共享 kit（Shared Kit Implemented） |
| 书架链路框架（LibraryShell） | 16 | 书架空状态、书籍搜索、书籍详情、书籍目录、排序与筛选、书籍操作底表、分组管理、本地书导入（Library empty, book search, book detail, directory, sort/filter, action sheet, group management, local import） | `stackFrame`、`backTopBar`、`contentRegion`、`bottomActionHost`、`sheetHost`、`dialogHost`、`stateHost` | 已完成共享 kit（Shared Kit Implemented） |
| 阅读器框架（ReaderShell） | 18 | 阅读控制层、目录与书签、阅读外观、朗读、阅读设置、自动翻页、内容搜索、内容替换、沉浸阅读（Reader controls, TOC/bookmarks, appearance, TTS, settings, auto page, in-book search, replacement, immersive reading） | `readerFrame`、`readingSurface`、`readerOverlayHost`、`readerModuleNav`、`bottomSheetHost`、`readerStateHost` | 9 页已接入中心化 kit（9 Pages In Shared Kit） |
| 横向流程框架（FlowShell） | 2 | 换源（Source switching） | `flowFrame`、`stepRegion`、`comparisonRegion`、`resultRegion`、`stateHost` | 已接入中心化 FlowShell，且 StateHost 非空守卫（Central FlowShell With Non-empty StateHost Guard） |
| 设置页框架（SettingsShell） | 14 | App 通用设置、书架与搜索设置、隐私与权限、缓存管理、关于与反馈、同步与备份、书源管理（General settings, bookshelf/search settings, privacy/permissions, cache, about/feedback, sync/backup, source management） | `settingsFrame`、`backTopBar`、`settingsContent`、`settingSection`、`toastHost`、`dialogHost`、`settingsStateHost` | 已完成共享 kit 第一版（Shared Kit First Version Implemented） |

## 共享实现文件（Shared Implementation Files）

| 中文名称（English Name） | 文件（Files） | 作用（Purpose） | 当前状态（Current Status） |
|---|---|---|---|
| 主标签页共享 kit（MainTab Shared Kit） | `docs/ui-design/02-主标签页/shared-main-tab-kit/kit.js`、`kit.css` | 输出手机画布、状态栏、顶部栏、内容 slot、底部四栏导航、状态矩阵外壳。 | 已使用（In Use） |
| 书架链路共享 kit（Library Shared Kit） | `docs/ui-design/03-书架链路/shared-library-kit/kit.js`、`kit.css` | 输出书架栈画布、返回顶栏、内容区、底部操作宿主、底表宿主、弹窗宿主和状态宿主。 | 已覆盖 8 个书架链路页面（In Use Across 8 Pages） |
| 设置页共享 kit（Settings Shared Kit） | `docs/ui-design/05-设置链路/shared-settings-kit/kit.js`、`kit.css` | 输出设置页返回顶栏、设置内容、分组、底表、弹窗、toast 和状态矩阵。 | 已使用（In Use） |
| 中心化共享 Shell Kit（Shared Shell Kit） | `docs/ui-design/frontend-input/shared-shell-kit/kit.js`、`kit.css` | 输出 MainTabShell、LibraryShell、ReaderShell、SettingsShell、FlowShell 的公共槽位结构。 | ReaderShell 9 页和 FlowShell 1 页已使用（In Use For 9 Reader Pages and 1 Flow Page） |
| 公共组件库（Component Library） | `docs/ui-design/frontend-input/component-library/render.js`、`library.css`、`fixture.json` | 展示和约束跨页面组件、状态、底表、卡片、行和交互规则。 | 已使用并由库存守卫校验（In Use and Inventory Guarded） |
| 公共素材库（Asset Library） | `docs/ui-design/frontend-input/asset-library/icons.js`、`render.js`、`fixture.json`、`asset-library.css` | 登记 UI 设计图、封面资源、图标 token 和补齐图标。 | 已使用（In Use） |
| 全局设计 token（Global Design Tokens） | `docs/ui-design/frontend-input/design-tokens.json`、`tokens.css` | 机器可读 token 契约，以及颜色、字体、间距、字号、圆角、阴影、focus 和跨页面基础变量。 | 已使用并由脚本/单测守卫（In Use and Guarded） |
| 前端输入契约（Frontend Input Contracts） | `docs/ui-design/frontend-input/contracts.d.ts` | 定义数据、状态和事件契约。 | 已使用（In Use） |
| 验证清单（Validation Manifest） | `docs/ui-design/frontend-input/manifest.json` | 声明目标、视口、截图、Shell、slot、状态模型和验收文本。 | 已使用（In Use） |

## 页面归属（Page Ownership）

| 页面组（Page Group） | 页面（Pages） | 使用框架（Shell） | 当前实现状态（Implementation Status） |
|---|---|---|---|
| 公共素材库（Asset Library） | UI 设计图、封面素材、图标 token（UI design screens, cover assets, icon tokens） | 公共素材库框架（AssetLibraryShell） | 已完成可视化预览和 manifest 目标。 |
| 主标签页（Main Tabs） | 书架、发现、RSS、设置（Bookshelf, Discover, RSS, Settings） | 主标签页框架（MainTabShell） | 已由 `MainTabPageKit` 输出统一骨架。 |
| 书架链路（Library Flow） | 书架空状态、书籍搜索、书籍详情、书籍目录、排序与筛选、书籍操作底表、分组管理、本地书导入（Library empty, book search, book detail, directory, sort/filter, action sheet, group management, local import） | 书架链路框架（LibraryShell） | 8 个页面均已使用 `LibraryPageKit`。 |
| 阅读链路（Reader Flow） | 阅读控制层、目录与书签、阅读外观、朗读、阅读设置、自动翻页、内容搜索、内容替换、沉浸阅读（Reader controls, TOC/bookmarks, appearance, TTS, settings, auto page, in-book search, replacement, immersive reading） | 阅读器框架（ReaderShell） | 9 页已通过 `ReaderShellKit` 输出统一 `ReaderShell` 槽位。 |
| 横向流程（Landscape Flow） | 换源（Source switching） | 横向流程框架（FlowShell） | 已通过 `ReaderShellKit.renderFlowShell(...)` 输出统一 `FlowShell` 槽位。 |
| 设置链路（Settings Flow） | App 通用设置、书架与搜索设置、隐私与权限、缓存管理、关于与反馈、同步与备份、书源管理（General settings, bookshelf/search settings, privacy/permissions, cache, about/feedback, sync/backup, source management） | 设置页框架（SettingsShell） | 已由 `SettingsPageKit` 输出统一骨架。 |

## 基础组件（Primitive Components）

| 中文名称（English Name） | 复用范围（Reuse Scope） | 当前状态（Current Status） |
|---|---|---|
| 图标按钮（IconButton） | 顶栏、返回、搜索、更多、设置、列表操作。 | 已沉淀（Available） |
| 搜索框（SearchBar / SearchInput / SearchField） | 书籍搜索、内容搜索、书源搜索、目录过滤。 | 已沉淀（Available） |
| 筛选胶囊（Chip / FilterChip） | 书架分组、RSS 筛选、排序筛选、来源筛选。 | 已沉淀（Available） |
| 分段控件（SegmentControl / SegmentTab） | 阅读目录与书签、阅读外观、设置选项。 | 已沉淀（Available） |
| 开关（Switch） | 设置二级页、权限、书源启用、规则启用。 | 已沉淀（Available） |
| 输入框（TextField / PatternInput） | 内容替换、书源表单、命名弹窗。 | 已定义（Defined） |
| 进度条（ProgressBar） | 书籍进度、阅读百分比、任务状态。 | 已沉淀（Available） |
| 进度滑杆（ProgressSlider / SpeedSlider） | 章节进度、自动翻页速度、阅读控制。 | 已定义（Defined） |
| 主按钮（PrimaryActionButton） | 空态、导入、重试、开始、继续。 | 已沉淀（Available） |
| 次按钮（SecondaryActionButton） | 管理、切换、取消、辅助动作。 | 已沉淀（Available） |
| 文本按钮（TextActionButton） | 低权重跳转和局部操作。 | 已沉淀（Available） |
| 徽标（Badge / StatusBadge） | 权限、书源、备份、缓存、运行状态。 | 已沉淀（Available） |
| 步进器（Stepper） | 字号、边距、行距等小步进设置。 | 已定义（Defined） |
| 单选项（RadioOption） | 排序与筛选底表。 | 已定义（Defined） |
| 复选框（Checkbox） | 多选场景。 | 缺口（Gap） |

## 应用框架组件（App Shell Components）

| 中文名称（English Name） | 所属框架（Owner Shell） | 当前状态（Current Status） |
|---|---|---|
| 手机画布（AppFrame） | 主标签页框架（MainTabShell） | 已在 `MainTabPageKit` 中实现。 |
| 状态栏（StatusBar） | 主标签页框架（MainTabShell） | 已在 `MainTabPageKit` 中实现。 |
| 顶部栏（AppTopBar） | 主标签页框架（MainTabShell） | 已在 `MainTabPageKit` 中实现。 |
| 返回顶栏（BackTopBar） | 书架链路框架、设置页框架（LibraryShell, SettingsShell） | 设置页和书架链路已实现。 |
| 内容区（ContentRegion / SettingsContent） | 各页面框架（All Shells） | MainTab、Library、Settings、ReaderShell 9 页和 FlowShell 已统一。 |
| 公共主导航（MainNav / MainNavItem） | 主标签页框架（MainTabShell） | 已实现并固定四项。 |
| 底部操作宿主（BottomActionHost） | 书架链路框架（LibraryShell） | 已由 `LibraryPageKit` 输出。 |
| 弹层宿主（SheetHost / DialogHost / BottomSheetHost） | 书架链路、阅读器、设置页（LibraryShell, ReaderShell, SettingsShell） | 书架、设置和 ReaderShell 9 页已实现。 |
| 状态容器（StateHost / ReaderStateHost / SettingsStateHost） | 各页面框架（All Shells） | MainTab、Library、Settings、ReaderShell 9 页和 FlowShell 已统一。 |

## 业务组件（Product Components）

| 中文名称（English Name） | 复用范围（Reuse Scope） | 当前状态（Current Status） |
|---|---|---|
| 书籍封面（BookCover） | 书架、详情、搜索、发现、RSS。 | 已沉淀（Available） |
| 书籍卡片（BookCard） | 书架封面模式、推荐内容。 | 已沉淀（Available） |
| 书籍列表行（BookRow） | 搜索、最近阅读、目录外关联列表。 | 已沉淀（Available） |
| 搜索结果项（SearchResultItem） | 书籍搜索、发现、RSS、内容搜索。 | 已沉淀（Available） |
| 发现来源控制（DiscoverySourceControls） | 发现页、RSS 来源筛选。 | 已沉淀（Available） |
| 发现内容卡片（DiscoveryContentCard） | 发现首页推荐、来源栏目。 | 已沉淀（Available） |
| 来源状态条（SourceStatusBar） | 发现、书源管理、来源检测。 | 已沉淀（Available） |
| 榜单行（RankingRow） | 来源榜单、更新列表。 | 已沉淀（Available） |
| RSS 订阅概览卡（SubscriptionSummaryCard） | RSS 根页。 | 已沉淀（Available） |
| RSS 筛选胶囊（FeedStatusChips / FeedSourceChips） | RSS 状态与订阅源筛选。 | 已沉淀（Available） |
| RSS 条目行（RssEntryItem） | RSS 订阅流。 | 已沉淀（Available） |
| 未读指示器（UnreadIndicator） | RSS 条目。 | 已沉淀（Available） |
| 书籍详情头部（BookDetailHeader） | 书籍详情页。 | 页面组件已存在，并已进入 `LibraryPageKit` 内容 slot。 |
| 章节预览列表（ChapterPreviewList） | 书籍详情、目录预览。 | 已定义（Defined） |
| 简介卡片（IntroCard） | 书籍详情。 | 已定义（Defined） |
| 目录摘要条（DirectorySummaryBar） | 书籍目录页。 | 已定义（Defined） |
| 章节行（ChapterRow） | 书籍目录、阅读目录。 | 已沉淀（Available） |
| 当前章节行（CurrentChapterRow） | 当前阅读位置。 | 已定义（Defined） |
| 书籍摘要（BookSummary） | 书籍操作底表。 | 已定义（Defined） |
| 操作行（ActionRow.Edit / ActionRow.Delete） | 书籍操作底表。 | 已定义（Defined） |
| 分组行（GroupRow） | 分组管理。 | 已定义（Defined） |
| 排序手柄（ReorderHandle） | 可排序分组行。 | 已定义（Defined） |
| 本地导入说明卡（ImportIntroCard） | 本地书导入。 | 已定义（Defined） |
| 支持格式行（SupportedFormatRow） | 本地书导入。 | 已定义（Defined） |
| 导入结果摘要（ImportResultSummary） | 本地书导入结果。 | 已定义（Defined） |
| 导入结果行（ImportResultRow） | 本地书导入文件结果。 | 已定义（Defined） |

## 阅读组件（Reader Components）

| 中文名称（English Name） | 复用范围（Reuse Scope） | 当前状态（Current Status） |
|---|---|---|
| 阅读正文区域（ReadingSurface） | 阅读控制层、目录与书签、阅读外观、朗读、阅读设置、自动翻页、内容搜索、内容替换、沉浸阅读。 | 9 页已进入 ReaderShell。 |
| 阅读段落（ReadingParagraph） | 沉浸阅读正文。 | 已定义（Defined） |
| 阅读顶部栏（ReaderTopBar） | 阅读控制层和模块面板。 | 已进入 ReaderShell。 |
| 阅读模块导航（ReaderModuleNav） | 目录、朗读、界面、设置四模块。 | 已进入 ReaderShell，按钮交互规则已固定。 |
| 快捷操作（QuickAction） | 搜索、自动翻页、替换等阅读快捷入口。 | 已定义（Defined） |
| 阅读快捷控制窗（ReaderQuickWindow） | 目录、朗读、界面、设置、搜索、自动翻页、替换、换源的短窗口。 | 已规划，待 demo 按新模型重构。 |
| 底栏拖拽手柄（BottomSheetDragHandle） | 底部控制层顶部小横条，点击或上拉展开完整控制页。 | 已规划，待 demo 按新模型重构。 |
| 阅读完整控制页（ReaderFullControlSheet） | 由底栏上拉展开的目录、朗读、外观、设置、搜索、自动翻页、替换完整页。 | 已规划，待 demo 按新模型重构。 |
| 阅读面板（ReaderPanel） | 阅读快捷控制窗和完整控制页宿主。 | 已进入 ReaderShell。 |
| 目录面板（TocPanel） | 目录与书签。 | 已进入 ReaderShell。 |
| 书签行（BookmarkRow） | 阅读目录与书签。 | 已定义（Defined） |
| 更多菜单（MoreMenu） | 阅读目录面板。 | 已定义（Defined） |
| 主题色块（ThemeSwatch） | 阅读外观。 | 已定义（Defined） |
| 字体选项（FontOption） | 阅读外观。 | 已定义（Defined） |
| 预览卡片（PreviewCard） | 阅读外观即时预览。 | 已定义（Defined） |
| 外观面板（AppearancePanel） | 阅读外观模块。 | 已进入 ReaderShell。 |
| 朗读面板（TTSPanel） | 朗读模块。 | 已进入 ReaderShell。 |
| 朗读按钮（ReadAloudButton） | 朗读开始、暂停、继续。 | 已定义（Defined） |
| 播放控制（PlayPauseControl） | 上一句、播放/暂停、下一句。 | 已定义（Defined） |
| 语速控制（SpeedControl） | 朗读语速。 | 已定义（Defined） |
| 声音选项（VoiceOption） | 系统声音选择。 | 已定义（Defined） |
| 沉浸态运行胶囊（RuntimeCapsule / RunningCapsule） | 朗读和自动翻页启动后的沉浸页最小运行控件；提供状态、暂停 / 继续 / 停止和进入快捷窗入口。 | 已定义（Defined），需按正文安全空区避让规则实现 |
| 亮度滑杆（BrightnessSlider） | 阅读控制层右侧亮度栏。 | 已定义（Defined） |
| 自动翻页开始按钮（StartButton） | 自动翻页。 | 已定义（Defined） |
| 自动翻页停止按钮（StopButton） | 自动翻页运行态。 | 已定义（Defined） |
| 正文搜索输入（SearchInput） | 内容搜索。 | 已定义（Defined） |
| 搜索结果行（ResultRow） | 内容搜索结果。 | 已定义（Defined） |
| 空搜索状态（EmptySearchState） | 内容搜索无结果。 | 已定义（Defined） |
| 键盘避让（KeyboardAvoidance） | 内容搜索输入聚焦。 | 已定义（Defined） |
| 替换规则摘要行（ReplacementRuleSummaryRow） | 内容替换快捷控制窗；展示规则名、配置摘要、执行范围和命中反馈。 | 已定义（Defined） |
| 替换规则行（ReplacementRuleRow） | 内容替换完整设置页；展示和编辑完整规则。 | 已定义（Defined） |
| 保存按钮（SaveButton） | 内容替换保存。 | 已定义（Defined） |
| 开始阅读动作（StartReadingAction） | 书籍详情、搜索结果、目录打开后进入沉浸阅读。 | 已定义（Defined） |
| 继续阅读动作（ContinueReadingAction） | 书架继续阅读、缓存继续后进入沉浸阅读。 | 已定义（Defined） |
| 打开加载状态（OpenLoadingState） | ReaderStateHost 打开章节。 | 已定义（Defined） |
| 阅读修复动作（ReadingRepairAction） | ReaderStateHost 失败修复。 | 已定义（Defined） |
| 弱信息文本（WeakInfoText） | 沉浸阅读四角信息。 | 已定义（Defined） |
| 进度信息（ProgressInfo） | 沉浸阅读页脚信息。 | 已定义（Defined） |
| 点击热区（TapZone） | 沉浸阅读透明交互区。 | 已定义（Defined） |
| 换源候选行（SourceCandidateRow） | 阅读中换源。 | 已定义（Defined） |
| 当前来源徽标（CurrentSourceBadge） | 阅读中换源。 | 已定义（Defined） |
| 检测状态徽标（DetectStatusBadge） | 阅读中换源。 | 已定义（Defined） |
| 切换来源按钮（SwitchSourceButton） | 阅读中换源。 | 已定义（Defined） |

## 设置组件（Settings Components）

| 中文名称（English Name） | 复用范围（Reuse Scope） | 当前状态（Current Status） |
|---|---|---|
| 设置分组卡（SettingGroupCard） | 设置首页、阅读设置、设置二级页。 | 已沉淀（Available） |
| 设置行（SettingRow） | 设置二级页基础行。 | 已沉淀（Available） |
| 选择行（SelectRow） | 进入选项底表。 | 已沉淀（Available） |
| 选项底表（OptionSheet） | 设置选择项。 | 已沉淀（Available） |
| 设置提示（SettingsToast） | 保存成功、操作失败、权限提示。 | 已沉淀（Available） |
| 危险操作行（DangerActionRow） | 清理、删除、恢复覆盖等危险动作。 | 已沉淀（Available） |
| 权限行（PermissionRow） | 隐私与权限。 | 已沉淀（Available） |
| 缓存占用卡（CacheSizeCard） | 缓存管理。 | 已沉淀（Available） |
| 缓存分类行（CacheCategoryRow） | 缓存管理。 | 已沉淀（Available） |
| 版本卡（VersionCard） | 关于与反馈。 | 已沉淀（Available） |
| 链接行（LinkRow） | 协议、许可、帮助。 | 已沉淀（Available） |
| 反馈入口（FeedbackEntry） | 关于与反馈。 | 已定义（Defined） |
| 备份操作行（BackupActionRow） | 同步与备份。 | 已沉淀（Available） |
| 备份记录行（BackupRecordRow） | 同步与备份。 | 已沉淀（Available） |
| 书源行（SourceRow） | 书源管理。 | 已沉淀（Available） |
| 书源详情面板（SourceDetailPanel） | 书源管理。 | 已定义（Defined） |
| 书源编辑表单（SourceEditForm） | 书源新增和编辑。 | 已定义（Defined） |
| 日志面板（LogPanel） | 书源检测日志。 | 已定义（Defined） |

## 底表与弹层组件（Sheets and Panels）

| 中文名称（English Name） | 复用范围（Reuse Scope） | 当前状态（Current Status） |
|---|---|---|
| 底表（BottomSheet） | 排序筛选、书籍操作、阅读模块、设置选择。 | 已沉淀（Available） |
| 换源底表（SourceChangeSheet） | 书籍详情页内换源。 | 已定义（Defined） |
| 书籍操作底表（BookActionSheet） | 单书操作。 | 已定义（Defined） |
| 确认弹窗（ConfirmDialog） | 危险操作二次确认。 | 已沉淀（Available） |
| 命名弹窗（RenameDialog） | 新建分组和重命名。 | 已定义（Defined） |
| 删除确认弹窗（DeleteConfirmDialog） | 删除分组。 | 已定义（Defined） |
| 导入进度卡（ImportProgressCard） | 本地导入。 | 已定义（Defined） |
| 底部操作栏（BottomActionBar） | 结果页底部操作。 | 已定义（Defined） |
| 恢复确认弹窗（RestoreConfirmDialog） | 恢复备份覆盖确认。 | 已定义（Defined） |
| 来源切换面板（SourceSwitchPanel） | 阅读中换源。 | 已定义，待单独规格化。 |
| 排序筛选底表（SortFilterSheet） | 排序与筛选。 | 可派生，待单独规格化。 |
| 外观面板（AppearancePanel） | 阅读外观模块。 | 可派生，待单独规格化。 |
| 朗读面板（TTSPanel） | 朗读模块。 | 可派生，待单独规格化。 |

## 状态组件（State Components）

| 中文名称（English Name） | 复用范围（Reuse Scope） | 当前状态（Current Status） |
|---|---|---|
| 加载状态（LoadingState） | 页面内容区、列表、操作过程。 | 已沉淀（Available） |
| 空状态（EmptyState / EmptyStateCard） | 书架空态、搜索无结果、列表为空。 | 已沉淀（Available） |
| 错误状态（ErrorState） | 网络失败、加载失败、操作失败。 | 已沉淀（Available） |
| 权限状态（PermissionState） | 文件权限、系统权限。 | 已沉淀（Available） |
| 空搜索状态（EmptySearchState） | 内容搜索无结果。 | 已定义（Defined） |
| 打开加载状态（OpenLoadingState） | ReaderStateHost 打开章节。 | 已定义（Defined） |
| 离线状态（Offline State） | 离线或网络不可用。 | 缺口（Gap） |
| 未知状态（Unknown State） | 未知异常或不可识别状态。 | 缺口（Gap） |
| 部分加载状态（Partial Loading State） | 列表局部加载。 | 缺口（Gap） |
| 同步冲突状态（Sync Conflict State） | 同步与备份冲突。 | 缺口（Gap） |

## 固定交互规则（Fixed Interaction Rules）

### 公共主导航（Main Navigation）

- 四个按钮固定为书架、发现、RSS、设置（Bookshelf, Discover, RSS, Settings）。
- 选中后背景颜色加深（Darker selected background）。
- 中间图标颜色反转（Inverted center icon color）。
- 下方文字颜色变化（Changed label color）。
- 按钮尺寸不变（Fixed button size）。
- 按钮间距不变（Fixed spacing）。
- 相对位置不变（Stable relative position）。

### 阅读模块导航（Reader Module Navigation）

- 四个按钮固定为目录、朗读、界面、设置（TOC, TTS, Appearance, Settings）。
- 选中后背景颜色加深（Darker selected background）。
- 中间图标颜色反转（Inverted center icon color）。
- 下方文字颜色变化（Changed label color）。
- 按钮尺寸不变（Fixed button size）。
- 按钮间距不变（Fixed spacing）。
- 相对位置不变（Stable relative position）。
- 重复点击当前 active 模块按钮关闭快捷控制窗（Tap active module again to close quick window）。
- 点击或上拉底栏顶部小横条展开当前 active 模块的完整控制页（Tap or drag the bottom handle to expand the full control sheet）。
- 阅读外观主题色块必须是无图标纯色块；选中态通过边框、阴影或容器状态表达，不在色块中放 check / moon / leaf / text 图标。

## 不应组件化内容（Should Not Be Componentized）

- 整屏截图（Full-screen Screenshot）：只能作为参考，不作为组件。
- 阅读正文具体内容（Actual Reading Text Content）：作为页面内容渲染，不抽通用组件。
- 书籍详情页完整 Hero 组合（Full Book Detail Hero Composition）：保留页面组合，不抽跨域通用组件。
- 发现页整页大块内容（Entire Discover Page Content Block）：只抽内部卡片、行和筛选控件。
- 设置页整页大块内容（Entire Settings Page Content Block）：只抽设置行、分组、底表、toast。
- 换源横向整屏流程（Full Landscape Source-switching Flow）：归 FlowShell，不抽成普通页面组件。
- 混合视觉风格组件（Mixed-scheme Components）：蓝色编辑风、森林工具风、阅读器风保留视觉分支。

## 开发优先级（Development Priority）

1. 真实前端映射（Frontend Mapping）：按 `FRONTEND_MAPPING_GUIDE.md` 将已归一的 shell 映射到实际 Android Compose 组件结构。
2. 主导航差异收敛（Main Navigation Reconciliation）：按 `MAIN_NAV_RECONCILIATION.md` 确认 Android 端主导航是否调整为 `书架 / 发现 / RSS / 设置`。
3. 图标映射收敛（Icon Mapping Reconciliation）：按 `ICON_COMPOSE_MAPPING.md` 统一素材库 token 与 Compose 图标实现。

## 使用方式（Usage）

- 新页面转换前，先查本目录和 `component-library/COMPONENT_LIBRARY.md`，确认已有框架和组件。
- 如果页面需要的新控件已在公共库中存在，必须复用组件语义，不新增同义组件名。
- 如果确实缺组件，先扩展公共组件库，再生成页面输入件。
- 页面 renderer 只负责把 fixture 映射到 Shell slots；状态栏、顶部栏、导航、弹层宿主和状态容器应由对应 Shell kit 输出。
- `preview.html` 和 `state-matrix.html` 是正式输入件；`components.html` 是拆分参考；`preview 2.html` 和早期独立复刻页不作为输入件。
