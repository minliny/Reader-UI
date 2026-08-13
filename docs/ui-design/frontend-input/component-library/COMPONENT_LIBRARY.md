# Reader 公共组件库

## 边界

本组件库先完成“可作为所有 UI 设计图前端输入件的公共约束”。它不是最终 React/Vue/Compose 代码库，但必须能约束后续页面转换的结构、命名、状态和验收。

## Foundations

- `tokens.css`：全局颜色、字体、圆角、阴影、focus。
- `rl-` 前缀：公共组件库命名空间。
- 页面专属前缀：允许继续使用 `bs-`、`rc-` 等，但不得重复定义公共控件语义。

## App Shell

- `IconButton`：搜索、更多、返回、排序、设置。
- `AppFrame`：手机画布、页面背景和安全区边界。
- `StatusBar`：时间、电量、系统图标。
- `AppTopBar`：标题、返回或页面显式声明的顶部动作；不得默认生成搜索/更多。
- `SearchBar`：书籍搜索、内容搜索、书源搜索。
- `SearchEntry`：主页面进入搜索链路的只读入口。
- `SearchInput`：阅读覆盖层内的可编辑搜索框，必须保留关闭、清空和当前关键词。
- `MainNav` / `MainNavItem`：公共主导航四项，固定为 `书架 / 发现 / RSS / 设置`。

已规划边界：
- 横向页面当前只有 `换源` 一例，FlowShell 的步骤区、对照区、结果区、状态区已固化为公共横向流程结构；新增横向页面必须复用此结构或先补新的 FlowShell 变体。

## Page Shells

后续页面不再只按单个页面复刻，应迁移到 `../PAGE_FRAMEWORK_ARCHITECTURE.md` 定义的 shell；逐页现状以 `../PAGE_FRAMEWORK_AUDIT.md` 为准：

- `MainTabShell`：四个主标签页，固定 `AppFrame + StatusBar + AppTopBar + ContentRegion + MainNav + StateHost`。
- `LibraryShell`：书架链路二级页，固定 `StackFrame + BackTopBar + ContentRegion + BottomActionHost + SheetHost + DialogHost + StateHost`。
- `ReaderShell`：阅读页和阅读覆盖层，固定 `ReaderFrame + ReadingSurface + ReaderOverlayHost + ReaderModuleNav + BottomSheetHost + ReaderStateHost`。
- `SettingsShell`：设置二级页，固定 `SettingsFrame + BackTopBar + SettingsContent + SettingSection + ToastHost + DialogHost + SettingsStateHost`。
- `FlowShell`：横向流程和跨页面对照，固定 `FlowFrame + StepRegion + ComparisonRegion + ResultRegion + StateHost`。

当前 `SettingsPageKit` 已覆盖 7 个设置二级页，是 `SettingsShell` 的第一版实现；`MainTabPageKit` 已覆盖 4 个主标签页，是 `MainTabShell` 的第一版实现；`LibraryShell`、`ReaderShell`、`FlowShell` 的规划边界见 `PAGE_STRUCTURE_MAP.md` 和 `FRONTEND_EXECUTABLE_PLANNING_CONTRACT.md`。

## Basic Controls

- `Chip`：分组、筛选、状态切换。
- `SegmentTab`：阅读目录与书签切换，后续可派生设置分段控件。
- `SegmentControl`：阅读外观、阅读设置和通用设置中的多选一分段控件。
- `Stepper`：字号、边距等小步进数值。
- `ReadAloudButton`：朗读开始、暂停、继续的主控制按钮。
- `PlayPauseControl`：上一句、主播放控制、下一句组合。
- `SpeedControl`：朗读语速分段控制。
- `SpeedSlider`：自动翻页速度滑杆，必须同时展示当前速度、慢/快端点和稳定滑块位置。
- `StartButton`：自动翻页开始主按钮，按钮文案必须写清结果，例如 `开始自动翻页`。
- `StopButton`：自动翻页运行态停止按钮，必须与暂停按钮语义分离。
- `StartReadingAction`：阅读打开开始动作，必须表达从章节开头或指定章节重新打开。
- `ContinueReadingAction`：阅读打开继续动作，必须保留当前章节和阅读进度。
- `SwitchSourceButton`：换源候选行的切换按钮，必须显示具体结果文案 `切换来源`，当前源和失效源不可提交。
- `SelectRow`：设置二级页选择项，默认只展示当前值；短选项点击后在当前行上方或下方打开选项下拉浮层。
- `ProgressBar`：书籍进度、阅读百分比。
- `ProgressSlider`：章节进度。
- `SearchField`：阅读面板内过滤目录或书签的轻量搜索字段。
- `QuickAction`：阅读控制层快捷入口。
- `Badge`：设置行状态提示，如 `可用`、`待授权`、`未设置`。
- `Switch`：二级设置页开关，设置首页仅可作为状态预览，不直接执行破坏性操作。
- `TextField`：设置和内容替换中的单行文本输入，必须保留 label、当前值和错误提示槽。
- `PatternInput`：内容替换规则的匹配表达输入，必须与普通书源规则区分。
- `PrimaryActionButton`：空态、导入、重试的主行动作。
- `SecondaryActionButton`：导入、管理、切换等次级行动作。
- `TextActionButton`：低权重跳转，如换个分组。
- `ResetButton`：恢复默认排序和全部筛选。
- `ApplyButton`：提交当前筛选或设置选择。

已规划边界：
- `Checkbox` 作为 `Switch` 的同级二值控件纳入 Basic Controls，适用于多选确认、批量选择和非即时开关；尺寸、点击区和 disabled/focused 规则与 `Switch` 一致。
- disabled、pressed、focused、loading、error 状态已纳入 `FRONTEND_EXECUTABLE_PLANNING_CONTRACT.md`，实现时必须补入对应状态矩阵或 Compose preview。

## Cards & Rows

- `BookCover`
- `BookCard`
- `BookRow`
- `SearchResultItem`：搜索、发现和 RSS 场景中可进入详情、加入书架或阅读的书籍结果行。
- `DiscoverySourceControls`：来源类型、当前来源和来源内分类。
- `DiscoveryContentCard`：发现首页推荐内容和来源内栏目内容。
- `SourceStatusBar`：来源数量、可用数、更新时间和检测入口。
- `RankingRow`：来源榜单和更新列表行。
- `SubscriptionSummaryCard`：RSS 根页订阅源、未读和更新时间概览。
- `FeedStatusChips`：RSS 内容筛选。
- `FeedSourceChips`：RSS 订阅源筛选。
- `RssEntryItem`：订阅流条目行。
- `UnreadIndicator`：RSS 未读点。
- `BookDetailHeader`：详情页封面、来源、最新章节和主操作。
- `ChapterPreviewList`：详情页章节预览长列表，完整页要求不少于 20 条。
- `IntroCard`：书籍简介折叠卡。
- `DirectorySummaryBar`：目录页书名、来源和章节数量摘要。
- `ChapterRow`：目录页和阅读目录共用章节行。
- `CurrentChapterRow`：当前阅读章节高亮行。
- `BookmarkRow`：阅读目录面板内书签列表行，包含章节、位置、摘录和时间。
- `ThemeSwatch`：阅读背景主题色块，必须同时表达背景和文字对比；色块内不放图标，选中态通过边框、阴影或外层状态表达。
- `FontOption`：字体选择行，包含字体名称、说明和预览文本。
- `PreviewCard`：字体、主题和翻页动画即时预览。
- `VoiceOption`：朗读声音选择行，只使用系统声音，不出现会员或主播入口。
- `RuntimeCapsule / RunningCapsule`：朗读或自动翻页启动后的沉浸态最小运行胶囊，必须避让正文安全空区并提供暂停 / 继续 / 停止。
- `SettingGroupCard`：阅读设置和通用设置二级页的分组入口卡。
- `PresetRow`：阅读设置快捷预设和预设管理行。
- `ResultRow`：内容搜索结果行，包含章节、段落位置、进度、摘录和关键词高亮。
- `ReplacementRuleSummaryRow`：内容替换快捷窗摘要行，包含规则名、配置摘要、执行范围、命中反馈和启用状态。
- `ReplacementRuleRow`：内容替换完整设置页规则行，包含完整规则配置、命中说明、启用开关和进入编辑的语义。
- `ReadingRepairAction`：阅读打开失败修复行，必须保留来源上下文并提供 `重试` 与 `更换来源`。
- `ReadingParagraph`：沉浸阅读正文段落，使用阅读字体、行高和首行缩进，不承载点击逻辑。
- `WeakInfoText`：沉浸阅读四角弱信息，与控制层顶部栏互斥。
- `ProgressInfo`：沉浸阅读进度信息，右下只显示当前章节，不显示总章节数。
- `SourceCandidateRow`：阅读中换源候选行，必须展示来源名、章节、延迟、可用状态和切换入口。
- `CurrentSourceBadge`：当前来源标记，必须与普通可用源区分，并禁用重复切换。
- `DetectStatusBadge`：来源检测状态，`检测中`、`可用`、`失效` 必须有不同语义。
- `DangerActionRow`：设置页危险操作行，必须使用危险色并进入二次确认。
- `PermissionRow`：权限管理行，必须同时展示权限用途、状态和系统设置入口。
- `StatusBadge`：权限、书源、备份等状态标签，必须按 good/warn/danger/info 区分。
- `CacheSizeCard`：缓存占用摘要，必须展示总占用和计算说明。
- `CacheCategoryRow`：缓存分类行，必须展示分类、说明和占用大小。
- `VersionCard`：关于页版本摘要，必须展示当前版本和更新状态。
- `LinkRow`：协议、许可、帮助等低风险跳转行。
- `FeedbackEntry`：问题反馈入口，必须明确是提交问题或建议。
- `BackupActionRow`：备份、导出、恢复等同步备份操作行。
- `BackupRecordRow`：备份记录行，必须展示时间、位置和可恢复状态。
- `SourceRow`：书源管理列表行，必须展示名称、域名、分组、检测状态和启用开关。
- `RadioOption`：排序与筛选底表单选项。
- `FilterChip`：排序与筛选底表多选筛选项。
- `BookSummary`：书籍操作底表中的当前书籍摘要。
- `ActionRow.Edit`：进入书籍详情修改配置的普通操作行。
- `ActionRow.Delete`：移除书架的危险操作行。
- `GroupRow`：分组管理列表行，区分系统分组、自定义分组和不可删除分组。
- `ReorderHandle`：分组排序手柄，只用于可排序行。
- `ImportIntroCard`：本地书导入授权方式和隐私边界说明。
- `SupportedFormatRow`：本地导入支持格式说明。
- `ImportResultSummary`：导入成功、跳过和失败数量汇总。
- `ImportResultRow`：文件名、状态和失败原因行。
- `ListRow`
- `SettingRow`

已规划边界：
- `SourceListItem` 收敛为 `SourceRow`，不再另起同义组件。
- `RSSSourceItem` 收敛为 `RssEntryItem` / `FeedSourceChips` 的组合，不再单独拆新组件。
- `NoteCard` 暂不作为公共组件；页面说明优先使用 `WeakInfoText`、`IntroCard` 或对应状态组件。
- 行内 badge、开关、二级说明使用 `SettingRow` / `SourceRow` 的固定分区规则：主文本单行，说明两行，值区和尾部控件固定列宽。

## Sheets & Panels

- `BottomSheet`
- `SourceChangeSheet`：详情页内换源底表，不能跳转到阅读控制层。
- `BookActionSheet`：单书操作底表，只允许修改和移除书架两个主操作。
- `ConfirmDialog`：危险操作二次确认，确认按钮必须使用具体结果文案，例如 `确认移除`。
- `RenameDialog`：新建分组和重命名共用命名弹窗，保存失败时保留输入。
- `DeleteConfirmDialog`：删除分组前说明书籍去向，不能等同删除书籍。
- `ImportProgressCard`：本地文件解析进度和当前文件提示。
- `ReaderModuleNav`：阅读控制层四模块入口，active 时只允许背景加深、中心图标反转和文字变色，不允许改变按钮相对位置。
- `MoreMenu`：阅读目录面板的轻量更多菜单，只放当前页面声明的操作项。
- `BrightnessSlider`
- `BottomActionBar`：结果页底部操作栏，只允许一个主按钮。
- `SaveButton`：内容替换编辑表单保存按钮，必须在提交中禁用重复点击。
- `SourceSwitchPanel`：阅读中换源底表，包含筛选 chips、候选源列表、检测中行和失败反馈。
- `OptionDropdown`：设置短选项下拉浮层，锚定当前设置行，以列表展示全部选项并标识当前项；选项字号必须与设置行当前值一致，可覆盖下一行部分内容但不能改变列表结构，选择后立即回写当前值。
- `OptionSheet`：长列表或复杂选择项底表，必须有标题、当前项、取消和关闭入口。
- `RestoreConfirmDialog`：恢复备份确认弹窗，必须说明会覆盖当前数据。
- `SourceDetailPanel`：书源详情面板，展示状态、分组和检测入口。
- `SourceEditForm`：书源新增/编辑表单，保存失败必须保留输入。
- `LogPanel`：书源检测日志面板，展示错误级别和失败原因。
- `Panel`

已规划边界：
- `SortFilterSheet` 是 `BottomSheet + RadioOption + FilterChip + ResetButton + ApplyButton` 的固定组合。
- `AppearancePanel` 是 `ReaderPanel + ThemeSwatch + FontOption + PreviewCard + ProgressSlider` 的固定组合；当前 demo 使用无图标纯色主题色块和两列字号 / 行距 / 段距 / 字距控制。
- `TTSPanel` 是 `ReaderPanel + ReadAloudButton + PlayPauseControl + SpeedControl + VoiceOption` 的固定组合；当前 demo 不展示示例正文，播放按钮中间只显示图标。
- `SourceSwitchPanel` 是 `ReaderPanel / FlowShell + SourceCandidateRow + CurrentSourceBadge + DetectStatusBadge + SwitchSourceButton` 的固定组合。

## States

- `LoadingState`
- `EmptyState`
- `ErrorState`
- `PermissionState`
- `EmptyStateCard`：插画、标题、原因说明、主操作、可选次操作。
- `EmptySearchState`：正文内搜索无结果状态，必须保留关键词并提供清空或改搜。
- `KeyboardAvoidance`：搜索层输入聚焦时的键盘安全区规则，不得遮挡结果列表主操作。
- `OpenLoadingState`：ReaderStateHost 打开章节时的加载状态，必须显示 `正在打开` 并禁止重复提交。
- `TapZone`：沉浸阅读透明点击热区，只定义交互区域，不作为可见入口。
- `SettingsToast`：设置页轻量反馈，只表达保存成功、操作失败或权限提示，不改变页面主结构。

已规划边界：
- `OfflineState` 使用 ErrorState 外观但原因固定为网络不可用，并提供重试 / 使用缓存。
- `UnknownState` 用于无法归类错误，必须保留错误码或来源说明。
- `PartialLoadingState` 用于列表局部加载，不能替换根 Shell。
- `SyncConflictState` 用于同步与备份冲突，必须提供保留本地、使用远端或稍后处理的路径。

## 复用判断

可以直接作为其他页面框架组件的部分：
- 顶部图标按钮。
- 公共主导航。
- Chip 分组。
- 图书封面和图书卡。
- 进度条和进度滑杆。
- 阅读底表外壳。
- 快捷操作。
- 模块导航。
- 亮度滑杆。
- 加载、空、错误、权限状态块。
- 搜索入口、来源类型、当前来源、来源状态条。
- 订阅概览、RSS 筛选 chips、订阅条目和未读点。
- 书籍详情头部、章节预览、简介卡和详情页内换源来源行。
- 目录摘要、通用章节行和当前阅读章节行。
- 排序选项、筛选 chip、重置和应用按钮。
- 书籍摘要、普通操作行、危险操作行和确认弹窗。
- 分组行、排序手柄、命名弹窗和删除分组确认。
- 本地导入说明、文件选择入口、导入进度、结果摘要和文件结果行。
- 阅读目录标签、面板搜索字段、书签行和更多菜单。
- 阅读外观主题、字体、步进器、预览卡和分段控件。
- 朗读播放控制、语速、声音和沉浸态运行胶囊。
- 自动翻页速度、模式、开始和停止控制。
- 正文搜索输入、搜索结果行、无结果状态和键盘安全区规则。
- 正文替换规则、匹配输入、预览、测试和保存控制。
- 阅读打开状态开始、继续、打开中和失败修复动作。
- 沉浸阅读正文段落、弱信息、进度和透明点击热区。
- 换源候选行、当前来源 badge、检测 badge 和切换来源按钮。
- 阅读设置分组卡、高级开关和预设行。
- 设置选择行、选项下拉浮层、长列表选项底表和轻量反馈 toast。
- 设置页危险行、权限行、缓存占用、备份记录、书源行、编辑表单和日志面板。

当前公共库已经覆盖本轮已转化页面需要的框架组件；后续新增页面仍按准入规则先补组件再生成页面。

## 库存守卫

- 当前公共组件库预览输出 49 个组件卡，覆盖 Foundations、App Shell、Basic Controls、Cards & Rows、Sheets & Panels、States 六个 section。
- `FrontendInputComponentLibraryInventoryTest` 守住 `render.js`、`fixture.json`、`fixture.js`、`manifest.json`、`frontend-input-design-draft-validation.json` 和素材库图标 token 的同步关系。
- 新增页面优先复用已有组件；如果必须新增公共组件，需要同步组件规格、fixture、renderer、manifest 阈值、验证报告和 Compose 映射守卫。

## 准入规则

后续每转换一个页面：
1. 先列出页面使用到的公共组件。
2. 缺组件时先扩展公共库，再写页面。
3. 页面完成后必须加入 `manifest.json`。
4. 页面必须提供 `fixture.json`、`fixture.js`、`render.js`、`preview.html`、`state-matrix.html` 或说明为什么不需要状态矩阵。
5. 运行 `validate-frontend-inputs.js` 通过后，才算转化完成。
6. 运行 `FrontendInputComponentLibraryInventoryTest`，确认公共组件库仍保持 49 个组件卡和素材 token 对齐。
7. 危险操作必须使用危险色、说明影响范围，并经过 `ConfirmDialog` 二次确认；不得把 `确认移除` 这类结果文案替换为 `确定`。
