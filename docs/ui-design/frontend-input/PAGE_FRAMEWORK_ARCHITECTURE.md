# 页面框架归一架构

目标：把现有静态 `frontend-input/` 从“每页独立复刻”推进到“同一套页面框架 + 页面内容替换”。本文是后续开发和重构的优先约束。

命名格式统一使用 `中文名称（English Name）`。已完成内容、规划内容和组件分层的总览见 `FRAMEWORK_COMPONENT_ROADMAP.md`。

## 当前判断

当前 29 个页面已经统一了交付格式，并按各自页面类型进入统一 shell 运行层。

已统一的部分：
- 每页都有 `frontend-input/` 输入包、fixture、renderer、preview、state matrix、README、组件规格和 manifest 校验目标。
- 所有页面都接入 `tokens.css` 或经由 `component-library/library.css`、`shared-settings-kit/kit.css` 间接接入同一批设计 token。
- 公共组件库已经沉淀 `AppFrame`、`MainNav`、`SettingRow`、`BottomSheet`、`ConfirmDialog`、`LoadingState`、`ErrorState` 等候选组件。
- 中心化共享框架包已经建立：`frontend-input/shared-shell-kit/kit.js` 输出 `MainTabShell`、`LibraryShell`、`ReaderShell`、`SettingsShell`、`FlowShell` 五类页面框架。

仍需注意的部分：
- 阅读链路 9 页已经接入中心化 `ReaderShellKit`；后续只需要真实前端映射，不再保留独立阅读器 frame。
- 横向 `换源` 已接入中心化 `FlowShell`，保持横屏流程，不塞进普通竖屏 `ReaderShell`。
- 设置链路 7 页已经共用 `SettingsPageKit`，都输出 `sk-page-frame`；`App通用设置` 和 `书架与搜索设置` 作为薄适配器保留页面外观 class。
- 主标签页 4 页已经共用 `MainTabPageKit`，都输出 `mt-app-frame`、固定四按钮 `MainNav` 和真实 DOM slots。
- 书架链路 8 页已经共用 `LibraryPageKit`。
- 当前 `shared-shell-kit` 预览、`frontend-demo-draft`、阅读链路 9 页和 `换源` 已经直接消费中心化 shell。

因此，当前产物已经具备统一页面框架的本地代码入口；剩余工作集中在真实前端映射。

## 目标框架层

后续统一为四层：

1. `DesignTokens`
   - 只承载颜色、字体、字号层级、圆角、阴影、间距、安全区和 focus 规则。
   - 契约来源：`design-tokens.json`。
   - HTML 来源：`tokens.css`。
   - Compose 追溯：`ReaderDesignTokenContractTest` 对照 `ReaderColors`、`ReaderSpacing`、`ReaderTypography`、`ReaderShapes`、`ReaderElevation`。

2. `PrimitiveComponents`
   - 图标按钮、开关、chip、badge、进度条、搜索框、行、卡片、toast、dialog、sheet。
   - 来源文件：`component-library/`。

3. `PageShells`
   - 负责稳定页面框架：手机画布、状态栏、顶部栏、内容区、底部导航、覆盖层、状态容器、横竖屏画布。
   - 页面 shell 只允许通过 slots 填内容，不允许页面重新定义同义 frame。
   - 中心化来源：`frontend-input/shared-shell-kit/kit.js`。

4. `PageFixtures`
   - 页面只提供数据、状态和 slot 声明。
   - 页面 renderer 应逐步变成 shell kit 的薄包装，不再复制顶部栏、状态矩阵、列表行和弹窗逻辑。

## Shell 分类

### MainTabShell

适用页面：
- `02-主标签页/书架`
- `02-主标签页/发现`
- `02-主标签页/RSS`
- `02-主标签页/设置`

固定结构：
- `AppFrame`
- `StatusBar`
- `AppTopBar`
- `ContentRegion`
- `MainNav`
- `StateHost`

内容 slot：
- `headerActions`
- `searchEntry`
- `primarySections`
- `listContent`
- `stateContent`

准入要求：
- 四个主导航按钮固定为 `书架 / 发现 / RSS / 设置`。
- active 只改变背景、中心图标和文字颜色，不改变按钮相对位置。
- loading、empty、error 只能替换内容区，不替换主导航和根页面框架。

### LibraryShell

适用页面：
- `03-书架链路/书架空状态`
- `03-书架链路/书籍搜索`
- `03-书架链路/书籍详情`
- `03-书架链路/书籍目录`
- `03-书架链路/排序与筛选`
- `03-书架链路/书籍操作底表`
- `03-书架链路/分组管理`
- `03-书架链路/本地书导入`

固定结构：
- `StackFrame`
- `BackTopBar`
- `ContentRegion`
- `BottomActionHost`
- `SheetHost`
- `DialogHost`
- `StateHost`

内容 slot：
- `bookHeader`
- `searchControls`
- `chapterList`
- `groupList`
- `importFlow`
- `sheetContent`
- `dialogContent`

准入要求：
- 书籍详情、目录和操作底表必须共享同一套书籍上下文字段。
- 危险操作必须进入 `ConfirmDialog`，确认按钮必须说明具体结果。
- 本地文件导入必须保留系统文件选择器和权限边界说明。

### ReaderShell

适用页面：
- `04-阅读链路/阅读控制层`
- `04-阅读链路/目录与书签`
- `04-阅读链路/阅读外观`
- `04-阅读链路/朗读`
- `04-阅读链路/阅读设置`
- `04-阅读链路/自动翻页`
- `04-阅读链路/内容搜索`
- `04-阅读链路/内容替换`
- `04-阅读链路/沉浸阅读`

固定结构：
- `ReaderFrame`
- `ReadingSurface`
- `ReaderOverlayHost`
- `ReaderModuleNav`
- `BottomSheetHost`
- `ReaderStateHost`

内容 slot：
- `readingText`
- `controlLayer`
- `modulePanel`
- `tocContent`
- `appearanceContent`
- `ttsContent`
- `autoPageContent`
- `searchContent`
- `replaceContent`
- `sourceSwitchContent`

准入要求：
- 阅读控制层四个按钮进入对应页面后，背景颜色加深，中间图标颜色反转，下方文字颜色变化，相对位置不发生变化。
- 沉浸阅读不得显示主底部导航。
- 阅读中状态切换必须保留当前书籍、章节和阅读进度上下文。

### SettingsShell

适用页面：
- `05-设置链路/App通用设置`
- `05-设置链路/书架与搜索设置`
- `05-设置链路/隐私与权限`
- `05-设置链路/缓存管理`
- `05-设置链路/关于与反馈`
- `05-设置链路/同步与备份`
- `05-设置链路/书源管理`

固定结构：
- `SettingsFrame`
- `BackTopBar`
- `SettingsContent`
- `SettingSection`
- `ActionList`
- `ToastHost`
- `DialogHost`
- `SettingsStateHost`

内容 slot：
- `metrics`
- `storage`
- `searchBox`
- `filters`
- `groups`
- `sections`
- `records`
- `sourceList`
- `formPanel`
- `logPanel`

准入要求：
- 7 个设置二级页必须继续通过 `SettingsPageKit` 输出同一 SettingsShell 结构。
- 设置页危险操作统一使用 `DangerActionRow + ConfirmDialog`。
- 权限、离线、加载、错误状态不得替换整页框架。

### FlowShell

适用页面：
- 横向流程、跨页面对照、未来导入向导或多设备同步冲突处理。

固定结构：
- `FlowFrame`
- `StepRegion`
- `ComparisonRegion`
- `ResultRegion`
- `StateHost`

准入要求：
- FlowShell 可以横屏，但必须显式声明 viewport、画布尺寸和状态卡数量。
- 不得混用 MainTabShell 的底部导航。

## 当前页面归类和迁移状态

| 页面组 | 页面数量 | 当前状态 | 迁移目标 |
| --- | ---: | --- | --- |
| 主标签页 | 4 | 4 页已使用 `MainTabPageKit`，并通过 DOM slot 与主导航结构校验 | 保持 MainTabShell，后续真实前端映射 |
| 书架链路 | 8 | 8 页已使用 `LibraryPageKit`，并通过 DOM slot 校验 | 保持 LibraryShell，后续真实前端映射 |
| 阅读链路 | 9 | `shared-shell-kit` 已提供 `ReaderShell`；阅读控制层、目录与书签、阅读外观、朗读、阅读设置、自动翻页、内容搜索、内容替换、沉浸阅读 9 页已迁移并通过 DOM slot 校验 | 保持 ReaderShell，后续真实前端映射 |
| 设置链路 | 7 | 7 页已使用 `SettingsPageKit`，并通过 DOM slot 校验 | 保持 SettingsShell，后续真实前端映射 |
| 横向流程 | 1 | `shared-shell-kit` 已提供 `FlowShell`，`换源` 已通过 `ReaderShellKit.renderFlowShell(...)` 输出真实 DOM slots | 保持 FlowShell，后续真实前端映射 |

## 后续开发顺序

1. 冻结 shell 命名和 slots
   - 已在 `contracts.d.ts` 增加 shell、role、slot 和 state model 契约。
   - 已在 manifest 每个 target 增加 `shellName`、`pageRole`、`slots` 和 `stateModel`。
   - 已在验证脚本中增加 shell 元数据准入校验。

2. 先统一设置链路
   - 已把 `App通用设置` 和 `书架与搜索设置` 迁入 `SettingsPageKit`。
   - 7 个设置页均通过 `SettingsPageKit` 输出真实 DOM slots，后续进入真实前端映射。

3. 抽 MainTabShell
   - 已将书架、发现、RSS、设置首页统一成 `MainTabShell`。
   - 已校验四个主导航按钮的结构、标签、active 状态和位置稳定。

4. 抽 LibraryShell
   - 已迁移 `书架空状态`、`书籍搜索`、`书籍详情`、`书籍目录`、`排序与筛选`、`书籍操作底表`、`分组管理`、`本地书导入`。
   - 8 个书架链路页面均通过 `LibraryPageKit` 输出真实 DOM slots。

5. 抽 ReaderShell 和 FlowShell
   - 已在 `frontend-input/shared-shell-kit/kit.js` 建立 `ReaderShell` 和 `FlowShell`。
   - 已在 `frontend-demo-draft` 验证阅读控制层与换源的 shell/slot 结构。
   - 已迁移旧 `04-阅读链路/阅读控制层`、`目录与书签`、`阅读外观`、`朗读`、`阅读设置`、`自动翻页`、`内容搜索`、`内容替换`、`沉浸阅读` 到 `ReaderShellKit.renderReaderShell(...)`。
   - 阅读链路 9 页已完成 ReaderShell 归一。
   - 已迁移旧 `04-阅读链路/换源` 到 `ReaderShellKit.renderFlowShell(...)`。

6. 增强验证脚本
   - 校验每页 `shellName` 是否存在。
   - 已对 `MainTabShell`、8 个 `LibraryPageKit` 页面、10 个 `ReaderShellKit` 页面和 1 个 `FlowShell` 页面校验 shell 必备 slot 是否在 DOM 中存在。
   - 校验同一 shell 下 frame class、导航 class 和 state host class 不漂移。
   - 已校验 `design-tokens.json` 与 `tokens.css` 的 70 个 token、manifest inventory、29 个组件参考页 smoke 和 `frontend-demo-draft` 返回/视口/键盘/底表/弹窗交互。

## 完成标准

只有同时满足以下条件，才能说页面架构已经规划清楚并可作为真实前端输入：

- 每个页面声明 `shellName`、`pageRole`、`slots`、`stateModel`。
- 每个 shell 有统一 renderer kit，而不是只共享 CSS token。
- 页面 renderer 只做 fixture 到 shell slots 的映射。
- 同一 shell 的 top bar、content region、state host、overlay host、navigation host 由同一套 DOM 结构输出。
- manifest 校验 shell 名称、slot 完整性、状态矩阵、截图尺寸和核心文本。
- manifest 校验还必须通过 token 契约、manifest inventory、组件参考页 smoke 和 demo 交互 smoke。
- 公共组件库、contracts、页面 README 和组件规格都引用相同的 shell 名称。
- 本地 HTML 文件遵守 `HTML_FILE_REQUIREMENTS.md`：预览页和状态矩阵页进入 manifest，组件拆分页可直接打开，历史临时预览不作为输入件。
