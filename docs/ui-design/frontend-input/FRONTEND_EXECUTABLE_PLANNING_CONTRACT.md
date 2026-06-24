# 可执行前端规划契约（Executable Frontend Planning Contract）

本文把前端设计稿规划中容易停留在“后续补齐”的内容落成明确规则。它用于关闭规划文档层缺口，不表示真实业务实现、真实设备验证或线上交互已经完成。

## 完成口径（Completion Scope）

| 层级（Layer） | 当前规划结论（Planning Decision） | 不属于本文完成范围（Out of Scope） |
|---|---|---|
| 页面规划（Page Planning） | 30 个页面都有 P0/P1/P2、Shell、固定区、滚动区、覆盖区、入口、返回、上下文、事件、适配、文本、组件和验收字段。 | 真实业务状态接入、网络、持久化。 |
| 框架规划（Shell Planning） | 5 个 runtime shell 的层级、slot、覆盖、状态替换和几何基线已明确。 | Compose 真实布局细节的逐像素调试。 |
| 组件规划（Component Planning） | Primitive、Product、Reader、Settings、Overlay、State 组件的尺寸、文本、状态和复用边界已明确。 | 全部组件的最终代码实现和完整视觉精修。 |
| 运行时规划（Runtime Planning） | 断点、安全区、键盘、文字缩放、返回优先级、覆盖避让规则已明确。 | 真实设备矩阵和系统版本兼容性测试。 |
| 验收规划（Acceptance Planning） | 每类页面和组件都有可转成脚本或 UI test 的验收标准。 | 所有验收脚本已经实现。 |

## Shell 几何基线（Shell Geometry Baseline）

| Shell / 组件（Shell / Component） | 位置与尺寸（Position and Size） | 内容避让（Content Inset） | 文本范围（Text Range） |
|---|---|---|---|
| `AppFrame` | 手机基准 `390 x 844`，横向流程使用 `FlowShell` 基准宽度。 | 左右安全区最小 `16px`。 | 不直接承载业务文本。 |
| `StatusBar` | 顶部固定，高度由 `safeAreaTop=24px` 消费。 | 顶栏从状态栏下方开始。 | 系统信息单行。 |
| `AppTopBar` / `BackTopBar` | 高度 `58px`，固定在内容上方。 | 内容区 top inset 至少为状态栏 + 顶栏高度。 | 标题单行截断，尾部操作不挤压返回按钮。 |
| `ContentRegion` | 填充顶栏和底部固定层之间的可滚动区域。 | 有 `MainNav` 时 bottom inset >= `68px + safeAreaBottom`；有 `BottomActionHost` 时同理。 | 由内容组件声明单行、两行、折叠或滚动。 |
| `MainNav` | 底部固定高度 `68px`，四等分 grid，层级 `z-main-nav=20`。 | 只允许覆盖内容底部过渡区。 | 标签单行，active 不改字号、不改位置。 |
| `BottomActionHost` | 底部固定或随键盘抬升，高度按主按钮行计算，不小于 `68px`。 | 列表末项必须滚到操作区上方。 | 主按钮文案单行完整。 |
| `SheetHost` / `BottomSheetHost` | 底部覆盖，层级 `z-bottom-sheet=30`，Reader 面板最小高度 `284px`。 | Sheet 自己消费底部安全区。 | 标题单行，行主文本单行或两行。 |
| `ReaderModuleNav` | ReaderShell 底部固定，高度 `82px`，层级 `z-reader-module-nav=40`。 | 与阅读底表保持稳定相对关系。 | 四模块标签单行，active 不位移。 |
| `DialogHost` | 居中阻塞层，层级 `z-dialog=60`。 | 高于 Sheet、Toast、主导航。 | 标题最多两行，按钮文案完整。 |
| `KeyboardAvoidance` | 键盘基准高度 `320px`，键盘间距 `12px`，层级 `z-keyboard=70`。 | 输入框、错误提示、提交 / 保存动作必须在键盘上方。 | 输入文本不因键盘出现改变字号。 |
| `FlowFrame` | 横向流程按步骤 / 对照 / 结果三块布局，最小高度 `520px`。 | 左右安全区和系统手势区保底。 | 来源名、状态、按钮均有独立截断规则。 |

## 组件规格闭合（Component Specification Closure）

| 组件族（Component Family） | 尺寸与布局（Size and Layout） | 状态（States） | 文本规则（Text Rules） |
|---|---|---|---|
| `IconButton` | 点击区不小于 `48 x 48`，图标居中，视觉框可小于点击区。 | default、pressed、focused、disabled。 | 不用文字替代已有图标。 |
| `SearchBar` / `SearchInput` | 单行输入，清除按钮和提交动作固定位置。 | default、focused、typing、loading、empty、error、disabled。 | query 单行横向滚动或截断，错误说明两行内。 |
| `Chip` / `FilterChip` | 高度按 `32-36px` 区间，横向滚动或换行由页面声明。 | selected、unselected、disabled、loading。 | 标签单行。 |
| `SegmentControl` | 选项等宽或内容宽，选中态不改变容器尺寸。 | selected、unselected、disabled。 | 选项文案单行。 |
| `Switch` / `Checkbox` | 尾部控件固定列宽，不挤压行主文本。 | on、off、disabled、loading。 | 由所在行承担文本。 |
| `TextField` / `PatternInput` | label、输入、错误提示三段结构。 | focused、filled、error、disabled。 | label 单行，错误提示两行内。 |
| `BookCover` | 默认 2:3 比例；列表小封面不低于可识别尺寸；空封面有占位。 | loaded、loading、missing、error。 | 不在封面内放可交互文本。 |
| `BookCard` / `BookRow` | 封面、主信息、进度 / 状态、操作入口分区。 | default、pressed、selected、loading、stale。 | 书名两行，作者 / 章节 / 来源单行。 |
| `ChapterRow` / `CurrentChapterRow` | 行高随两行标题上限增长，当前章节有稳定高亮区。 | default、current、downloaded、locked、loading、error。 | 章节名最多两行，辅助信息单行。 |
| `SettingRow` / `SelectRow` | 主文案、说明、值区、尾部控件使用 `minmax(0,1fr)`。 | default、pressed、focused、disabled、dirty、saving、error。 | 主文案单行，说明两行，值文本单行。 |
| `SourceRow` / `SourceCandidateRow` | 来源名、域名 / 章节、状态、启用 / 切换动作分区。 | current、available、invalid、detecting、disabled、error。 | 来源名单行，URL / 状态两行内。 |
| `BottomSheet` / `OptionSheet` | 标题、列表、底部动作固定分区，滚动只发生在列表。 | open、closing、loading、error、keyboard。 | 标题单行，选项主文本单行，说明两行。 |
| `ConfirmDialog` | 标题、说明、取消、确认四区固定。 | open、submitting、error。 | 说明必须描述影响范围，确认按钮写具体结果。 |
| `ReaderModuleButton` | 四等分，图标壳、图标、标签位置固定。 | default、active、pressed、disabled。 | active 只改变背景、图标颜色、文字颜色；重复点击当前 active 模块关闭模块面板。 |
| `ReaderPanel` | 标题、内容、主动作 / 导航区分层。 | default、loading、error、keyboard、dirty。 | 面板标题单行，列表行按各组件规则。 |
| `StateHost` / `EmptyState` / `ErrorState` / `PermissionState` | 状态卡不替换根 shell，只替换内容 slot 或 state host。 | loading、empty、error、offline、permission、unknown、partial-loading、sync-conflict。 | 标题两行内，说明三行内，主按钮完整。 |

## 导航栈与状态替换（Navigation Stack and State Replacement）

| 场景（Scenario） | 栈规则（Stack Rule） | 状态替换 slot（State Replacement Slot） | 返回优先级（Back Priority） |
|---|---|---|---|
| 主 tab 切换 | 只替换 `MainTabShell.ContentRegion` 和 `MainNav.active`。 | 当前 tab 的 `StateHost` 或内容内 inline state。 | 不退出 app，不重建二级栈。 |
| 书架二级页 | 从书架、发现或 RSS 进入 `LibraryShell`。 | 对应页面 `contentRegion` 或 `stateHost`。 | Dialog > Sheet > Page > 来源 tab。 |
| 书籍详情到阅读 | `BookContext` 进入 `ReaderShell`，不带主导航。 | 沉浸阅读 `ReaderStateHost` 承载打开 / 错误状态。 | Reader overlay > Reader page > 来源页。 |
| 阅读模块切换 | `ReaderShell` 内模块切换不改 ReaderContext。 | `BottomSheetHost` 或 `ReaderStateHost`。 | 先关输入态 / 面板，再回沉浸阅读。 |
| 换源流程 | 从 ReaderShell 进入 FlowShell，保留 ReaderContext 和 SourceContext。 | `FlowShell.StateHost`。 | 成功 / 取消 / 失败都回 ReaderShell。 |
| 设置二级页 | 从设置首页或业务入口进入 SettingsShell。 | `settingsStateHost` 或对应 setting section。 | Dialog > OptionSheet > Settings page > 来源。 |
| 系统边界 | 文件选择器、系统设置、权限弹窗是外部边界。 | 返回后恢复原页面 state。 | 系统返回优先，应用恢复上下文。 |

## 动效与交互规则（Motion and Interaction Rules）

| 场景（Scenario） | 动效规则（Motion Rule） | 降级规则（Reduced Motion） |
|---|---|---|
| 按钮 pressed | 80-120ms 颜色或透明度反馈，不改变尺寸。 | 只保留颜色变化。 |
| 主导航 active | 背景加深、图标色反转、文字色变化；相对位置不变。 | 只保留颜色变化。 |
| ReaderModule active | 与主导航一致；模块切换不重排按钮。 | 只保留颜色变化。 |
| BottomSheet 打开 | 180-240ms 自底部进入，遮罩淡入。 | 直接显示最终位置。 |
| Dialog 打开 | 120-180ms 淡入或轻缩放，中心位置不漂移。 | 直接显示。 |
| ReaderOverlay 显隐 | 160-220ms 淡入 / 淡出，不重新排版正文。 | 直接切换可见性。 |
| 键盘避让 | 输入区随键盘 owner 调整 inset 或滚动。 | 不使用弹性位移，只保证可见。 |
| Flow 候选检测 | 检测状态只更新状态徽标和结果区，不阻塞返回。 | 状态文案即时切换。 |
| 危险操作提交 | 提交中禁用重复点击，失败保留上下文。 | 不使用连续动画。 |

## 无障碍规划（Accessibility Planning）

| 项目（Item） | 规划要求（Planning Requirement） | 适用范围（Scope） |
|---|---|---|
| 语义角色 | 按钮、开关、输入框、列表、tab、dialog、sheet 必须有语义角色。 | 所有页面。 |
| 焦点顺序 | 从顶栏到内容再到底部动作；弹窗打开后焦点限制在弹窗内。 | LibraryShell、SettingsShell、ReaderShell。 |
| 点击区 | 主要触控区域不小于 `48 x 48`。 | 图标按钮、主导航、模块导航、行尾操作。 |
| 对比度 | 正文和关键操作文本目标不低于 4.5:1；大字号和非关键状态不低于 3:1。 | 所有文本和状态徽标。 |
| 文本缩放 | 字体参与系统缩放；长文本用换行、截断或滚动，不通过缩到不可读解决。 | 标题、列表、按钮、设置行、阅读正文。 |
| 屏幕阅读 | 图标按钮需要可读名称；状态变化需要可被读出。 | 顶栏、底部导航、Reader 模块、状态页。 |
| 运动敏感 | 关闭或降低动效后仍能完成操作。 | 底表、弹窗、阅读覆盖层、Flow 检测。 |
| 错误恢复 | 错误和权限状态必须提供可读原因和恢复动作。 | StateHost、PermissionState、ErrorState。 |

## 素材与裁切规则（Asset and Crop Rules）

| 素材类型（Asset Type） | 使用规则（Usage Rule） | 缺失策略（Missing Strategy） |
|---|---|---|
| UI 设计图 | 只作为来源证据，不作为前端布局的整屏背景。 | 缺失时页面不能进入正式规划完成。 |
| 书籍封面 | 书架和详情默认 2:3；关键文字或人物不得被错误裁切；列表小图可 contain。 | 使用语义占位封面，保留书名首字或默认图标。 |
| 图标 | 使用 `icons.js` 语义 token，不在页面 renderer 临时造同义 token。 | 先进入素材库，再进入页面。 |
| 状态插图 | 只能服务 Empty / Permission / Offline，不替代 P0 内容。 | 可用图标 + 文案替代。 |
| 来源 / 书源标识 | 以文本和状态 badge 为主，不依赖不可得 logo。 | 使用 `SourceStatusBar` 或 `StatusBadge`。 |
| 验证截图 | 只作为验证产物和人工比对证据，不进入页面结构规划。 | 重新运行验证生成。 |

## 验收规划矩阵（Acceptance Planning Matrix）

| 验收项（Check） | 必须验证（Must Verify） | 通过标准（Pass Criteria） |
|---|---|---|
| 页面任务 | P0/P1/P2 是否与页面核心任务一致。 | P0 可见或可滚动完整到达，P2 可折叠或覆盖。 |
| Shell 归属 | 页面是否使用正确 Shell 和 slot。 | 不复制根框架，不混用 ReaderShell / LibraryShell / MainTabShell。 |
| 覆盖关系 | 固定层、底表、弹窗、键盘是否遮挡主动作。 | 只覆盖可覆盖内容，必须完整展示项可达。 |
| 上下文 | 进入、返回、切换模块是否保留上下文。 | Book / Reader / Settings / Source 字段不丢。 |
| 文本极值 | 长书名、长章节、长设置项、长按钮文案。 | 不重叠，不挤压关键操作，不缩小到不可读。 |
| 动效 | active、pressed、sheet、dialog、reader overlay。 | 动效不改变稳定布局，不阻塞任务。 |
| 无障碍 | 语义、焦点、点击区、对比度、减少动态效果。 | 关键操作可读、可聚焦、可点击。 |
| 素材 | 封面、图标、状态图、缺失占位。 | 来源可追溯，缺失有占位，不错误裁切。 |

## 规划完成判断（Planning Done Judgment）

到本文为止，可以说：**前端设计稿规划文档层已闭合**。闭合的含义是所有页面、Shell、组件、上下文、动效、无障碍、素材和验收要求都有明确规划落点。

不能说：**前端实现已完成**。实现仍需把这些规划接入真实 ViewModel、Navigation、业务状态、Compose UI、真实设备测试和更多脚本化验收。
