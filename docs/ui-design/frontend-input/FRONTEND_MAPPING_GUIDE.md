# 真实前端映射指南（Frontend Mapping Guide）

本文只说明本地 `frontend-input` 如何进入 Android Compose 前端实现，不替代设计输入件、不替代页面 `COMPONENT_SPEC.md`，也不要求直接照 HTML DOM 重写 Android 代码。

## 使用目标（Usage Goal）

- 设计输入件（Design Inputs）：以 `manifest.json`、`contracts.d.ts`、共享 shell kit、页面 `fixture.json`、页面 `COMPONENT_SPEC.md`、顶层 `UI设计图.png` 和 `LOCAL_DEMO_DESIGN_ASSET_MAP.md` 为准。
- 本地视觉来源（Local Visual Source）：顶层 `UI设计图.png` 必须由根目录 `frontend-demo/` 的当前页面状态生成；旧候选稿只保留为历史参考，不作为新设计图或视觉审计源头。
- Android 实现（Android Implementation）：以 `app/src/main/kotlin/com/reader/android/ui/` 下的 Compose 结构为落点。
- 映射边界（Mapping Boundary）：把 fixture/state/event 转成 Kotlin UI state、Composable 参数和事件回调；不要把 HTML class 名当作 Android 类名强行搬运。
- 验收方式（Acceptance Method）：同一页面先对齐 shell、导航、slot、状态矩阵和核心文案，再做动效和业务数据接入。
- 专项清单（Specialized Checklists）：主导航收敛见 `MAIN_NAV_RECONCILIATION.md`，图标映射见 `ICON_COMPOSE_MAPPING.md`。

## 阶段完成口径（Phase Done Criteria）

当前大步骤的目标是把 UI 设计图转换成可继续开发的前端设计稿输入件，并建立 Android Compose 输入框架。达到以下程度可判定本阶段完成：

- 设计输入闭合（Design Input Closure）：30 个页面的 preview、state matrix、components、fixture、renderer、README、COMPONENT_SPEC 和 manifest 目标齐备；manifest 正式目标必须固定为 30 个页面预览、30 个状态矩阵和 4 个公共库/示例目标。
- 框架输入闭合（Shell Input Closure）：页面都落在五类 shell 中，slot、导航、状态宿主和弹层宿主由共享 kit 或对应 Compose shell 承接；manifest 中五个 runtime shell 的分类必须能追溯到 Compose 骨架、slot 或 preview 锚点。
- 状态输入闭合（State Input Closure）：每个正式页面至少有默认态和关键异常/展开态的 HTML 状态矩阵，`COMPONENT_SPEC.md` 状态名和 manifest 状态卡数量必须与 `contracts.d.ts` 对应 State union 一致，并有 Compose preview 或 fixture-driven state 对应。
- 事件契约闭合（Event Contract Closure）：每个页面 `COMPONENT_SPEC.md` 必须声明前端事件入口，且事件名必须与 `contracts.d.ts` 对应 Event union 一致；后续 Compose 实现按明确回调接入，不从截图倒推交互。
- 覆盖守卫闭合（Coverage Guard Closure）：`FrontendInputComposeCoverageTest` 必须证明 30 张 UI 设计图、30 个输入包、30 个正式页面、`contracts.d.ts` 全局契约、事件到 Compose 回调映射、spec 状态与事件声明、状态名、事件名、manifest 64 个正式目标集合、`shellName/pageRole/slots` 正式 taxonomy、验证报告目标集合、preview/state-matrix 目标和状态卡数量、Compose 源码落点和 preview 状态完全一致；`ReaderSharedComponentsStructureTest` 必须证明五个 runtime shell 的 manifest taxonomy 能追溯到 Compose 实现锚点；HTML、素材库、组件库、FlowShell 和阶段摘要分别由 `FrontendInputHtmlInventoryTest`、`FrontendInputAssetLibraryInventoryTest`、`FrontendInputComponentLibraryInventoryTest`、`FrontendInputFlowShellInventoryTest` 和 `FrontendInputPhaseCompletionGuardTest` 守住。
- 后续边界清楚（Remaining Boundary）：真实业务数据、完整事件链路、动效细节和端到端 UI test 属于下一阶段，不阻塞当前“输入件完成”结论。

## 输入优先级（Source Priority）

| 优先级（Priority） | 文件（File） | 用途（Purpose） |
| --- | --- | --- |
| 1 | `frontend-demo/` + 顶层 `UI设计图.png` | 本地 demo 当前视觉样式和页面截图；设计图必须从这里同步生成。 |
| 2 | `docs/ui-design/frontend-input/LOCAL_DEMO_DESIGN_ASSET_MAP.md` | 页面到 demo route、截图动作和输出图的映射报告。 |
| 3 | `docs/ui-design/frontend-input/manifest.json` | 验证目标、viewport、shellName、slots、状态模型和必需文案；正式目标集合不得包含 `preview 2.html` 或 `components.html`。 |
| 4 | `docs/ui-design/frontend-input/contracts.d.ts` | 页面数据结构、状态枚举和事件语义。 |
| 5 | `docs/ui-design/frontend-input/EVENT_CALLBACK_MAPPING.md` | 页面事件到 Compose 回调名的映射，禁止用泛化 `onClick` 替代明确事件入口。 |
| 6 | `docs/ui-design/frontend-input/shared-shell-kit/` | 五类 shell 的固定 slot 结构和不应漂移的骨架。 |
| 7 | 页面 `fixture.json` / `fixture.js` | 页面默认数据、状态矩阵数据和可见文案。 |
| 8 | 页面 `COMPONENT_SPEC.md` / `README.md` | 页面级组件、事件、状态覆盖和验收标准。 |
| 9 | `verify/*.png` | 结构验证证据，不作为新视觉源头。 |

## 当前 Android 落点（Current Android Targets）

| 层级（Layer） | 当前文件（Current Files） | 映射说明（Mapping Notes） |
| --- | --- | --- |
| 应用入口（App Entry） | `app/src/main/kotlin/com/reader/android/ui/ReaderAndroidApp.kt` | 继续承载 `ReaderTheme` 和根 `Surface`。 |
| 路由与主框架（Routes and App Shell） | `app/src/main/kotlin/com/reader/android/ui/AppNavigation.kt`、`ReaderRouteHost.kt` | 对齐 MainTabShell、二级页栈、阅读页全屏和设置页入口。 |
| 主题 token（Theme Tokens） | `ui/theme/ReaderColors.kt`、`ReaderSpacing.kt`、`ReaderShapes.kt`、`ReaderTypography.kt`、`ReaderElevation.kt` | 对照 `tokens.css` 建立颜色、间距、圆角、阴影和字体映射。 |
| 通用组件（Common Components） | `ui/components/CommonComponents.kt`、`BookComponents.kt`、`SearchComponents.kt`、`SettingsComponents.kt`、`StateComponents.kt`、`ReaderNativeComponents.kt` | 承接公共组件库中的 primitive、book、settings、state、reader components。 |
| 主标签页（Main Tabs） | `ui/bookshelf/BookshelfScreen.kt`、`ui/discover/DiscoverScreen.kt`、`ui/discover/RssScreens.kt`、`ui/settings/MineScreen.kt::SettingsRootScreen`、`ui/settings/SettingsScreen.kt` | 需要先解决主导航标签差异，再映射四个主标签页。 |
| 书架链路（Library Flow） | `ui/search/SearchScreen.kt`、`ui/detail/BookDetailScreen.kt`、`ui/toc/TOCScreen.kt`、`ui/bookshelf/*` | 映射 LibraryShell 的返回顶栏、内容区、底部操作、底表、弹窗和状态宿主。 |
| 阅读链路（Reader Flow） | `ui/reader/ReaderScreen.kt`、`ui/reader/components/*` | 映射 ReaderShell 的正文底层、覆盖层、模块导航、底表宿主和阅读状态。 |
| 横向流程（Flow Shell） | `ui/reader/source/SourceSwitchFlowScreen.kt`、`ReaderRoutes.SOURCE_SWITCH` | 换源已建立独立 FlowShell Compose 输入框架，并由阅读控制层换源入口进入；后续接真实来源检测数据。 |
| 设置链路（Settings Flow） | `ui/settings/*`、`ui/booksource/*` | 映射 SettingsShell；书源管理属于设置链路输入件，但当前 Android 代码里也作为 `sources` 主入口存在。 |
| 过渡原型（Prototype / Stitch） | `ui/stitch/*`、`ui/prototype/*` | 可作为历史参考，不应作为最终组件命名边界。 |

## 已发现差异（Known Gaps）

| 差异（Gap） | 当前代码（Current Code） | 设计输入件（Design Input） | 处理要求（Required Action） |
| --- | --- | --- | --- |
| 主导航标签（Main Navigation Labels） | `AppScreen` 已使用 `书架 / 发现 / RSS / 设置`，运行时底栏已切到 `ReaderMainTabShell` | `MainNavType` 固定为 `书架 / 发现 / RSS / 设置` | 已完成主导航代码收敛；后续继续迁移 MainTabShell 内部页面内容。 |
| 主标签页内容状态（Main Tab Content State） | `bookshelf` 进入 `BookshelfScreen` + `BookshelfHomeUiState`，`discover` 进入 `DiscoverScreen` + `DiscoveryHomeUiState`，`rss` 进入 `RssHomeScreen` + `RssHomeDesignUiState`，`settings` 进入 `SettingsRootScreen` + `SettingsHomeMapper` | 四个主标签页均来自 `MainTabPageKit` 对应输入件 | 书架已补 default/filtering/loading/empty，发现页已补 default/subscription/loading/empty/error/offline，RSS 已补 default/loading/empty/unreadEmpty/error，设置已补 default/loadingOverview/noBackup/permissionNeeded；后续继续接真实业务数据。 |
| 图标体系（Icon System） | 主导航、书架、发现、RSS、设置二级页、书源链路、共享状态组件和阅读控制层已通过 `ReaderIconToken` 映射；`ui/stitch/*` prototype 仍保留历史直连 Material Icons | 本地素材库登记 79 个统一语义图标 token；`ReaderIconImportBoundaryTest` 守卫生产 UI 不再直连 Material Icons | 新增图标先补 `ReaderIconToken` 和素材库语义，不在页面内临时直连 Material Icons。 |
| 换源落点（Source Switching Target） | `ReaderControlBase.onSourceChangeClick` 已进入 `ReaderRoutes.SOURCE_SWITCH`，渲染 `SourceSwitchFlowScreen` | `换源` 是横屏 `FlowShell` | 后续接入真实候选来源与检测结果，继续保持不进入主导航。 |
| 状态矩阵（State Matrix） | 30 张 UI 设计图和 30 个正式输入包均已建立第一批 Compose 输入状态，并由 `FrontendInputComposeCoverageTest` 守卫 | 每页都有 `state-matrix.html` 和 manifest 状态，manifest 目标集合锁定为 64 个正式目标 | 后续重点转为真实业务数据、事件回调、动效和可交互 UI test 接入。 |

## Shell 到 Compose 映射（Shell to Compose Mapping）

| Shell | Compose 结构（Compose Structure） | 固定内容（Fixed Content） | 可替换内容（Replaceable Content） |
| --- | --- | --- | --- |
| `MainTabShell` | 根 `Scaffold` + 顶栏 + 内容 slot + 底部四栏导航 | 状态栏、顶部栏、主导航、状态宿主 | 书架、发现、RSS、设置的内容区。 |
| `LibraryShell` | 二级页 `Scaffold` 或 `Column` + 返回顶栏 + 内容 slot + 弹层宿主 | 返回顶栏、内容容器、底部操作区、sheet/dialog/state host | 搜索、详情、目录、筛选、导入、分组内容。 |
| `ReaderShell` | 全屏 `Box` + `ReadingSurface` + 覆盖层 + 模块导航 + 底表 | 阅读正文底层、顶部控制、模块导航、亮度栏、进度信息、状态宿主 | 目录、朗读、外观、设置、搜索、替换、自动翻页内容。 |
| `FlowShell` | 横屏或大画布 `Box/Row` + 步骤区 + 对照区 + 结果区 | 横向画布、流程列、对照列、结果列、状态卡 | 换源候选、检测结果、切换结果。 |
| `SettingsShell` | 设置页 `Scaffold/Column` + 返回顶栏 + 分组列表 + toast/dialog/state host | 返回顶栏、设置内容区、设置分组、toast/dialog/state host | 通用、书架搜索、权限、缓存、关于、同步、书源内容。 |

## 组件映射（Component Mapping）

| 输入组件（Input Component） | Compose 建议落点（Suggested Compose Target） | 说明（Notes） |
| --- | --- | --- |
| `IconButton`、`SearchBar`、`Chip`、`SegmentControl`、`Switch` | `ui/components/CommonComponents.kt`、`SearchComponents.kt`、`SettingsComponents.kt` | 先建 primitive，再被页面组合使用。 |
| `BookCover`、`BookCard`、`BookRow`、`BookSummary` | `ui/components/BookComponents.kt` | 书架、搜索、详情、RSS 共用。 |
| `BottomSheet`、`ConfirmDialog`、`OptionSheet` | `ui/components/CommonComponents.kt`、`SettingsComponents.kt` | 保持危险操作确认文案明确。 |
| `LoadingState`、`EmptyState`、`ErrorState`、`PermissionState` | `ui/components/StateComponents.kt` | 状态只能替换对应内容 slot，不替换根 shell。 |
| `ReaderModuleNav`、`ReadingSurface`、`ReaderPanel`、`BrightnessSlider` | `ui/reader/components/*`、`ui/components/ReaderNativeComponents.kt` | 四按钮选中态只改变背景、图标颜色、文字颜色，不改变位置。 |
| `SettingRow`、`SettingGroupCard`、`StatusBadge`、`DangerActionRow` | `ui/components/SettingsComponents.kt` | 设置链路和阅读设置都应复用同一语义。 |
| `SourceCandidateRow`、`DetectStatusBadge`、`SwitchSourceButton` | `ui/reader/source/SourceSwitchFlowScreen.kt` | 属于 FlowShell，不应混成普通列表行；当前先作为换源输入框架私有组件落地。 |

当前组件映射守卫（Current Component Mapping Guard）：`ReaderSharedComponentsStructureTest` 已检查公共组件库中的核心语义组件能追溯到 Compose 实现锚点，覆盖主导航、按钮、搜索、书籍、设置、状态、阅读控件和 FlowShell 换源组件；同时守住 `MainTabShell`、`LibraryShell`、`ReaderShell`、`FlowShell`、`SettingsShell` 的 manifest 计数和 Compose 骨架/slot/preview 锚点。

## 状态与事件映射（State and Event Mapping）

- 数据模型（Data Model）：把 `contracts.d.ts` 的 Fixture/State/Event 转成 Kotlin `data class`、状态枚举或事件回调；全局契约由 `FrontendInputComposeCoverageTest` 守卫，不从 HTML class 名反推数据。
- 状态模型（State Model）：把 `state-matrix.html` 的状态转成 Compose preview states、UI test fixtures 或 debug gallery entries。
- 事件回调（Event Callback）：页面 `COMPONENT_SPEC.md` 中的事件应按 `EVENT_CALLBACK_MAPPING.md` 转成 `onSearch`、`onOpenBook`、`onRetry`、`onModuleChange` 等明确回调；payload 必须保留对应 Event union 的语义。
- 可见文案（Visible Text）：默认使用 `fixture.json` 和页面规格中的文案；示例正文只作为示例时，不应当成不可替换产品文案。
- 错误与空态（Error and Empty States）：状态卡在对应 shell 的 `StateHost` 内显示，不应清空导航、顶栏或根画布。

## 实现顺序（Implementation Order）

1. Token 桥接（Token Bridge）：对齐 `tokens.css` 与 `ReaderTheme`，先固定颜色、间距、圆角、阴影和文字层级。
2. 主导航决策（Main Navigation Decision）：已按 `MAIN_NAV_RECONCILIATION.md` 完成第一轮 `书架 / 发现 / RSS / 设置` 代码收敛。
3. Shell Composable（Shell Composables）：先实现 `MainTabShell`、`LibraryShell`、`ReaderShell`、`SettingsShell`、`FlowShell` 的骨架。
4. Primitive 组件（Primitive Components）：沉淀按钮、搜索、chip、分段控件、开关、弹窗、状态卡。
5. 页面状态（Page State）：按 `contracts.d.ts` 和 `fixture.json` 建 Kotlin state，禁止页面直接硬编码大段示例数据。
6. 页面实现（Page Implementation）：把页面内容填入 shell slots，先主标签页，再书架链路，再阅读链路，再设置链路，最后 FlowShell。
7. 验证覆盖（Validation Coverage）：主标签页（书架 default/filtering/loading/empty、发现 default/subscription/loading/empty/error/offline、RSS default/loading/empty/unreadEmpty/error、设置 default/loadingOverview/noBackup/permissionNeeded）、书源管理链路、设置二级页、阅读链路、书架链路和换源 FlowShell 已建立第一批 Compose preview/state matrix；`FrontendInputComposeCoverageTest` 负责守住 30 个正式页面的 spec、manifest 64 个正式目标集合、shell taxonomy、验证报告目标集合、Compose source 和 preview 覆盖，`ReaderSharedComponentsStructureTest` 负责守住 runtime shell 到 Compose 锚点的追溯关系，`FrontendInputPhaseCompletionGuardTest` 负责守住阶段完成摘要和下一阶段边界。

## 开发禁用项（Do Not）

- 不要只看截图拆 Compose 结构；必须从 shell、fixture、contracts 和组件规格进入。
- 不要在每个页面重写状态栏、顶栏、底部导航、弹层宿主和状态容器。
- 不要把 `preview 2.html` 当作正式输入件。
- 不要把 Material Icons 的临时选择当成最终图标库；必须能回到素材库 token。
- 不要把 FlowShell 的横向换源塞进主标签页或普通设置页。
- 不要让选中态按钮通过位移、缩放或尺寸变化表达状态。
