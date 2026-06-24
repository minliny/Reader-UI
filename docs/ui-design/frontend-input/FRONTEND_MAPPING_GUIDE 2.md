# 真实前端映射指南（Frontend Mapping Guide）

本文只说明本地 `frontend-input` 如何进入 Android Compose 前端实现，不替代设计输入件、不替代页面 `COMPONENT_SPEC.md`，也不要求直接照 HTML DOM 重写 Android 代码。

## 使用目标（Usage Goal）

- 设计输入件（Design Inputs）：以 `manifest.json`、`contracts.d.ts`、共享 shell kit、页面 `fixture.json`、页面 `COMPONENT_SPEC.md` 和验证截图为准。
- Android 实现（Android Implementation）：以 `app/src/main/kotlin/com/reader/android/ui/` 下的 Compose 结构为落点。
- 映射边界（Mapping Boundary）：把 fixture/state/event 转成 Kotlin UI state、Composable 参数和事件回调；不要把 HTML class 名当作 Android 类名强行搬运。
- 验收方式（Acceptance Method）：同一页面先对齐 shell、导航、slot、状态矩阵和核心文案，再做动效和业务数据接入。
- 专项清单（Specialized Checklists）：主导航收敛见 `MAIN_NAV_RECONCILIATION.md`，图标映射见 `ICON_COMPOSE_MAPPING.md`。

## 输入优先级（Source Priority）

| 优先级（Priority） | 文件（File） | 用途（Purpose） |
| --- | --- | --- |
| 1 | `docs/ui-design/frontend-input/manifest.json` | 验证目标、viewport、shellName、slots、状态模型和必需文案。 |
| 2 | `docs/ui-design/frontend-input/contracts.d.ts` | 页面数据结构、状态枚举和事件语义。 |
| 3 | `docs/ui-design/frontend-input/shared-shell-kit/` | 五类 shell 的固定 slot 结构和不应漂移的骨架。 |
| 4 | 页面 `fixture.json` / `fixture.js` | 页面默认数据、状态矩阵数据和可见文案。 |
| 5 | 页面 `COMPONENT_SPEC.md` / `README.md` | 页面级组件、事件、状态覆盖和验收标准。 |
| 6 | `verify/*.png` | 视觉走查证据，不作为组件拆分的唯一来源。 |

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
| 书架实现来源（Bookshelf Implementation Source） | `ReaderRouteHost` 当前 `bookshelf` 路由进入 `BookshelfScreen`，状态来自 `BookshelfAdapterShell` | 书架输入件由 `MainTabPageKit` + `BookshelfInput` 输出 | 已脱离 `StitchAppShell`；后续继续把 `BookshelfAdapterShell` 数据收敛到正式 fixture/state 驱动。 |
| 图标体系（Icon System） | 主导航、书架、发现、RSS、设置二级页、书源链路、共享状态组件和阅读控制层已通过 `ReaderIconToken` 映射；`ui/stitch/*` prototype 仍保留历史直连 Material Icons | 本地素材库登记 71 个统一语义图标 token | 新增图标先补 `ReaderIconToken` 和素材库语义，不在页面内临时直连 Material Icons。 |
| 换源落点（Source Switching Target） | `ReaderControlBase.onSourceChangeClick` 已进入 `ReaderRoutes.SOURCE_SWITCH`，渲染 `SourceSwitchFlowScreen` | `换源` 是横屏 `FlowShell` | 后续接入真实候选来源与检测结果，继续保持不进入主导航。 |
| 状态矩阵（State Matrix） | Compose 现有状态覆盖分散在 screen/state 文件 | 每页都有 `state-matrix.html` 和 manifest 状态 | 应转成 Compose previews、UI tests 或 fixture-driven preview states。 |

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

## 状态与事件映射（State and Event Mapping）

- 数据模型（Data Model）：把 `contracts.d.ts` 的 fixture interface 转成 Kotlin `data class` 或现有 `UiState` 字段，不从 HTML class 名反推数据。
- 状态模型（State Model）：把 `state-matrix.html` 的状态转成 Compose preview states、UI test fixtures 或 debug gallery entries。
- 事件回调（Event Callback）：页面 `COMPONENT_SPEC.md` 中的事件应转成 `onSearchClick`、`onBookClick`、`onRetry`、`onModuleChange` 等明确回调。
- 可见文案（Visible Text）：默认使用 `fixture.json` 和页面规格中的文案；示例正文只作为示例时，不应当成不可替换产品文案。
- 错误与空态（Error and Empty States）：状态卡在对应 shell 的 `StateHost` 内显示，不应清空导航、顶栏或根画布。

## 实现顺序（Implementation Order）

1. Token 桥接（Token Bridge）：对齐 `tokens.css` 与 `ReaderTheme`，先固定颜色、间距、圆角、阴影和文字层级。
2. 主导航决策（Main Navigation Decision）：已按 `MAIN_NAV_RECONCILIATION.md` 完成第一轮 `书架 / 发现 / RSS / 设置` 代码收敛。
3. Shell Composable（Shell Composables）：先实现 `MainTabShell`、`LibraryShell`、`ReaderShell`、`SettingsShell`、`FlowShell` 的骨架。
4. Primitive 组件（Primitive Components）：沉淀按钮、搜索、chip、分段控件、开关、弹窗、状态卡。
5. 页面状态（Page State）：按 `contracts.d.ts` 和 `fixture.json` 建 Kotlin state，禁止页面直接硬编码大段示例数据。
6. 页面实现（Page Implementation）：把页面内容填入 shell slots，先主标签页，再书架链路，再阅读链路，再设置链路，最后 FlowShell。
7. 验证覆盖（Validation Coverage）：主标签页、书源管理链路、设置二级页、阅读控制层、阅读入口、沉浸阅读、目录与书签、阅读外观、朗读、阅读设置、自动翻页、书架搜索/详情/目录/排序筛选/分组管理/本地书导入链路和换源 FlowShell 已建立第一批 Compose preview/state matrix；后续每个页面至少保留默认、加载、空、错误或模块展开态的 Compose preview / UI test / prototype gallery 状态。

## 开发禁用项（Do Not）

- 不要只看截图拆 Compose 结构；必须从 shell、fixture、contracts 和组件规格进入。
- 不要在每个页面重写状态栏、顶栏、底部导航、弹层宿主和状态容器。
- 不要把 `preview 2.html` 当作正式输入件。
- 不要把 Material Icons 的临时选择当成最终图标库；必须能回到素材库 token。
- 不要把 FlowShell 的横向换源塞进主标签页或普通设置页。
- 不要让选中态按钮通过位移、缩放或尺寸变化表达状态。
