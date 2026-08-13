# 前端设计稿规划需求模板（Frontend Planning Requirements Template）

本文用于在把 UI 设计图转成前端设计稿之前，先把页面规划需求梳理清楚。它不是视觉验收表，也不是单页截图说明，而是开工前必须填写的结构化规划模板。

如果要看当前 30 个页面的对应规划内容，不看本文模板，直接看：

- `FRONTEND_PAGE_PLANNING_CARDS.md`：30 个正式页面的页面对应内容。
- `FRONTEND_FIRST_PAGE_PLANNING_CARDS.md`：书架、书籍搜索、阅读控制层、换源 4 个代表页详版规划卡。
- `FRONTEND_PLANNING_REQUIREMENTS.md`：当前项目整体规划需求和批次要求。

适用范围：

- 单个页面转换规划（Single Page Planning）
- 一组页面批次规划（Batch Planning）
- Shell 和组件库补齐规划（Shell and Component Planning）
- HTML 输入件、Compose 实现、状态矩阵和交互 demo 的前置规划（Frontend Input, Compose, State Matrix and Demo Planning）

## 使用规则（Usage Rules）

- 先规划，后实现：没有完成本模板的页面，不进入 HTML 或 Compose 实现。
- 先页面任务，后视觉细节：必须先确认核心任务、信息优先级、可覆盖内容和可达性。
- 先 Shell，后组件：页面必须先归入 `MainTabShell`、`LibraryShell`、`ReaderShell`、`FlowShell` 或 `SettingsShell`。
- 先运行时契约，后截图复刻：必须声明 viewport、断点、安全区、键盘、文字缩放和覆盖层避让。
- 每个字段必须能落到本地文件、组件、状态、事件或验证规则。

## 1. 规划对象（Planning Target）

| 字段（Field） | 必填内容（Required Content） | 通过标准（Pass Criteria） |
|---|---|---|
| 规划名称（Planning Name） | 页面名或批次名，使用 `中文名称（English Name）`。 | 能唯一识别本次规划范围。 |
| 页面范围（Page Scope） | 涉及的 UI 图、页面 id、输入包目录、manifest target。 | 不把未纳入 manifest 的临时预览当正式页面。 |
| 规划类型（Planning Type） | 单页、批次、Shell、组件、适配、验证。 | 类型明确，后续产物不混杂。 |
| 当前依据（Current Evidence） | UI 图、fixture、README、COMPONENT_SPEC、contracts、现有 HTML。 | 所有结论有本地依据，不靠记忆或主观猜测。 |
| 非目标（Out of Scope） | 本轮明确不处理的视觉细节、业务逻辑或平台。 | 避免在规划阶段扩大范围。 |

## 2. 页面任务定义（Page Task Definition）

每个页面必须先回答“这个页面让用户完成什么”，再谈布局比例。

| 字段（Field） | 必填内容（Required Content） | 通过标准（Pass Criteria） |
|---|---|---|
| 核心任务（Primary Task） | 用户进入页面后必须能完成的第一任务。 | 页面结构优先服务该任务。 |
| 次级任务（Secondary Tasks） | 可在当前页完成但不应压过核心任务的动作。 | 次级任务不挤占核心内容。 |
| 入口来源（Entry Sources） | 从哪些页面、tab、弹层、状态或深链进入。 | 每个入口都有上下文字段。 |
| 成功路径（Success Path） | 用户完成核心任务后的下一步。 | 能对应具体页面、弹层或状态。 |
| 失败与恢复（Failure and Recovery） | loading、empty、error、offline、permission 时如何恢复。 | 每个失败态都有可达动作。 |

## 3. 内容优先级（Content Priority）

内容优先级决定屏幕不足、键盘弹出、覆盖层出现、字体放大时保留什么、压缩什么、延后什么。

| 优先级（Priority） | 必填内容（Required Content） | 规则（Rule） |
|---|---|---|
| P0 核心内容（P0 Core Content） | 页面核心对象和核心动作。 | 必须完整可见或可滚动到完整可见。 |
| P1 辅助内容（P1 Supporting Content） | 筛选、排序、摘要、快捷入口。 | 可压缩、可折叠，但不能阻断 P0。 |
| P2 弱内容（P2 Weak Content） | 提示、装饰、补充说明、非关键推荐。 | 可延后、可覆盖、可隐藏。 |
| 可覆盖内容（Coverable Content） | 允许被 MainNav、底表、阅读控制层短暂覆盖的区域。 | 必须是可滚动、可恢复或非核心内容。 |
| 必须完整展示（Must Fully Display） | 最后一项可点击内容、确认按钮、聚焦输入框、错误恢复动作。 | 任何状态下不能被固定层永久遮挡。 |

## 4. Shell 归属（Shell Assignment）

| 字段（Field） | 必填内容（Required Content） | 通过标准（Pass Criteria） |
|---|---|---|
| 所属 Shell（Owner Shell） | `MainTabShell`、`LibraryShell`、`ReaderShell`、`FlowShell`、`SettingsShell`。 | 与页面任务和 manifest 一致。 |
| 固定区（Fixed Regions） | 状态栏、顶栏、返回栏、底部导航、模块导航、底部操作。 | 固定区不被状态替换。 |
| 滚动区（Scrollable Regions） | 页面正式内容、列表、网格、设置项、阅读正文。 | 滚动归属唯一，有明确 inset。 |
| 覆盖区（Overlay Hosts） | SheetHost、DialogHost、ToastHost、ReaderOverlayHost、BottomSheetHost。 | 覆盖层挂在 Shell 宿主，不在页面局部复制。 |
| 状态区（State Hosts） | Loading、Empty、Error、Offline、Permission 的承载 slot。 | 状态只替换内容或状态宿主，不替换根 Shell。 |

### Shell 选择规则（Shell Selection Rules）

| Shell | 适用条件（Applicable Condition） | 不适用条件（Not Applicable） |
|---|---|---|
| 主标签页框架（MainTabShell） | 书架、发现、RSS、设置四个根 tab。 | 阅读全屏、换源横向流程、设置二级页。 |
| 书架链路框架（LibraryShell） | 书籍搜索、详情、目录、导入、分组、排序、书籍操作。 | 阅读控制层、阅读模块、通用设置二级页。 |
| 阅读器框架（ReaderShell） | 沉浸阅读、控制层、目录、外观、朗读、设置、搜索、替换、自动翻页；打开 / 错误 / 离线状态由 ReaderStateHost 承载。 | 普通书籍详情页和主 tab。 |
| 横向流程框架（FlowShell） | 换源这类横向对照流程。 | 普通设置页、普通列表页。 |
| 设置页框架（SettingsShell） | 通用设置、权限、缓存、备份、书源管理等二级设置页。 | 阅读器内阅读设置模块。 |

## 5. 运行时适配契约（Runtime Adaptation Contract）

本节是本模板新增的关键层。页面不能只按一张 UI 图固化尺寸，必须说明在不同窗口、安全区、键盘和文字缩放条件下如何运行。

| 字段（Field） | 必填内容（Required Content） | 通过标准（Pass Criteria） |
|---|---|---|
| 目标平台矩阵（Target Platform Matrix） | Android、HarmonyOS、iOS 的目标设备族和窗口族。 | 至少明确当前实现优先级和未来平台映射。 |
| 基准视口（Base Viewport） | 设计稿主 viewport、方向、单位。 | 不用截图像素代替运行时窗口。 |
| 语义断点（Semantic Breakpoints） | `xs`、`sm`、`md`、`lg`、`xl` 下的布局模式。 | 每个相关断点都有单栏、双栏、三栏或导航迁移规则。 |
| 单位映射（Unit Mapping） | spacing、size、font、radius、stroke 的平台单位。 | 字体单位和布局单位分离。 |
| 安全区策略（Safe Area Strategy） | 顶部、底部、左右、cutout、圆角、系统栏的 owner。 | inset 不重复消费、不漏消费。 |
| 键盘归属（Keyboard Ownership） | 键盘出现时谁滚动、谁固定、谁抬升、谁不动。 | 聚焦输入框、错误提示和提交动作同时可达。 |
| 手势冲突（Gesture Conflict） | 系统返回、页面横滑、底表拖拽、阅读翻页之间的优先级。 | 系统手势和应用手势不互相吞掉关键动作。 |
| 文字缩放（Text Scaling） | 最大字体、最长文案、换行/截断/滚动优先级。 | 文本不遮挡、不挤掉主操作。 |
| 资源倍率（Asset Density） | 图标矢量、位图倍率、封面比例、字体回退。 | 图标不糊，封面不错误裁切，字体权重可映射。 |

### 默认断点模板（Default Breakpoint Template）

| 断点（Breakpoint） | 窗口宽度（Window Width） | 默认布局（Default Layout） | 适用说明（Applicable Notes） |
|---|---:|---|---|
| `xs` | `<320` | 极简单栏（Minimal Single Column） | 小外屏、极窄悬浮窗，只保留 P0。 |
| `sm` | `320-599` | 单栏 + 底部导航（Single Column with Bottom Nav） | 主流手机竖屏。 |
| `md` | `600-839` | 单栏增强或轻双栏（Enhanced Single Column or Light Two Pane） | 平板竖屏、折叠展开、Android medium。 |
| `lg` | `840-1439` | 双栏或侧边导航（Two Pane or Side Navigation） | 平板横屏、展开大屏。 |
| `xl` | `>=1440` | 双栏增强或三段式（Enhanced Two Pane or Three Pane） | 桌面化窗口、大屏外接。 |

### 平台单位映射模板（Platform Unit Mapping Template）

| 类别（Category） | Android | HarmonyOS | iOS | 规则（Rule） |
|---|---|---|---|---|
| 布局尺寸（Layout Size） | `dp` | `vp` | `pt` | 不使用截图 px 作为实现单位。 |
| 字体尺寸（Font Size） | `sp` | `fp` | `pt` / Dynamic Type | 字体参与系统缩放。 |
| 图片资源（Image Asset） | vector 或 density bucket | vector 或位图资源组 | vector / `@2x` / `@3x` | 图标优先矢量，封面保留比例。 |
| 命中区域（Hit Target） | 不小于平台下限 | 不小于平台下限 | 不小于平台下限 | 视觉框可小于点击框。 |

## 6. 覆盖关系与避让（Overlay and Avoidance）

| 字段（Field） | 必填内容（Required Content） | 通过标准（Pass Criteria） |
|---|---|---|
| 覆盖者（Overlay Component） | MainNav、BottomActionHost、BottomSheet、Dialog、ReaderOverlay、Keyboard。 | 覆盖组件有唯一宿主。 |
| 可覆盖对象（Can Cover） | 可滚动尾部、过渡区、弱提示、背景正文。 | 被覆盖后仍可恢复或可滚动露出。 |
| 禁止覆盖对象（Must Not Cover） | 主确认按钮、最后完整项、聚焦输入框、返回路径、错误恢复动作。 | 禁止对象始终可达。 |
| Inset Owner | Shell、Page、Overlay、Keyboard 中谁负责消费 inset。 | 不出现双重 padding 或完全无避让。 |
| 返回优先级（Back Precedence） | dialog、sheet、reader panel、page、tab root 的关闭顺序。 | 返回动作可预测，不越级 pop。 |

### 返回优先级模板（Back Precedence Template）

```text
系统返回 / 应用返回
1. 关闭阻塞弹窗（DialogHost）
2. 关闭底表或半模态（SheetHost / BottomSheetHost）
3. 关闭阅读覆盖模块或输入态（ReaderOverlayHost / Keyboard）
4. 返回当前二级页上一页（LibraryShell / SettingsShell）
5. 回到当前 tab 根页（MainTabShell）
6. 退出阅读或流程并恢复来源上下文（ReaderShell / FlowShell）
```

## 7. 组件抽象规划（Componentization Planning）

| 字段（Field） | 必填内容（Required Content） | 通过标准（Pass Criteria） |
|---|---|---|
| 应抽组件（Should Componentize） | 可复用、可变状态、跨页面语义一致的 UI 单元。 | 有组件名、owner slot、状态、尺寸、事件。 |
| 不应抽组件（Should Not Componentize） | 整屏截图、整页组合、一次性业务大块、混合视觉风格。 | 不把页面内容误抽成通用组件。 |
| Primitive 组件（Primitive Components） | 按钮、搜索框、输入框、开关、滑杆、分段控件等。 | 可跨 Shell 复用。 |
| Product 组件（Product Components） | 书籍封面、书籍行、章节行、来源行等。 | 数据上下文明确。 |
| Reader 组件（Reader Components） | 阅读正文、模块导航、亮度栏、阅读面板等。 | 只在 ReaderShell/FlowShell 语境内复用。 |
| Settings 组件（Settings Components） | 设置行、选择行、权限行、缓存卡、备份行等。 | 只在 SettingsShell 或设置语义内复用。 |

### 组件规格模板（Component Spec Template）

| 字段（Field） | 必填内容（Required Content） |
|---|---|
| 组件名称（Component Name） | 例如 `BookCover`、`MainNavItem`、`ReaderModuleButton`。 |
| 所属族（Component Family） | Primitive、Product、Reader、Settings、State、Overlay。 |
| Owner Slot | 所属 Shell slot。 |
| 内部结构（Internal Structure） | 图标、文本、状态、操作区、辅助信息。 |
| 尺寸范围（Size Range） | min / preferred / max。 |
| 文本规则（Text Rule） | 单行、多行、截断、换行、滚动、缩放。 |
| 状态规则（State Rule） | default、active、pressed、focused、disabled、loading、error。 |
| 事件契约（Event Contract） | 事件名、payload、回调映射。 |
| 验收规则（Acceptance Rule） | 结构、覆盖、文本、点击、状态、视觉。 |

## 8. 页面关系与上下文（Page Relationship and Context）

| 字段（Field） | 必填内容（Required Content） | 通过标准（Pass Criteria） |
|---|---|---|
| 入口上下文（Entry Context） | 从 tab、搜索、书籍、阅读、设置、深链进入时携带的数据。 | 页面初始化不依赖全局隐式状态。 |
| 出口关系（Outbound Relationship） | 打开页面、弹层、状态、外部系统入口。 | 每个出口有目标 Shell 和返回路径。 |
| 上下文字段（Context Fields） | BookContext、ReaderContext、LibraryContext、SettingsContext、SourceContext。 | 跨页面不丢核心字段。 |
| 状态恢复（State Restoration） | 返回后的滚动、筛选、选中、输入、阅读进度。 | 返回不重置用户上下文。 |
| 跨 Shell 规则（Cross Shell Rule） | Reader、Flow、Settings 和 MainTab 之间如何切换。 | 不把阅读和换源错误放进主 tab。 |

## 9. 状态与事件规划（State and Event Planning）

| 字段（Field） | 必填内容（Required Content） | 通过标准（Pass Criteria） |
|---|---|---|
| State union | default、loading、empty、error、offline、permission、custom states。 | 与 `contracts.d.ts` 和 state matrix 一致。 |
| State slot | 每个状态替换哪个 slot。 | 不替换根 Shell。 |
| Event union | 页面所有交互事件。 | 事件有语义名，不压成泛化 `onClick`。 |
| Event payload | 事件所需数据。 | 回调能执行真实业务，不靠 DOM 查询。 |
| 状态可达动作（Reachable Actions） | 每个状态下仍可点击或可返回的动作。 | 失败态有恢复路径。 |

## 10. 验收矩阵（Acceptance Matrix）

| 验收项（Check） | 必须验证（Must Verify） | 通过标准（Pass Criteria） |
|---|---|---|
| 页面任务（Page Task） | P0 是否优先可见或可达。 | 页面没有被非核心模块主导。 |
| Shell 结构（Shell Structure） | 固定区、滚动区、覆盖区、状态区。 | 与 owner Shell 一致。 |
| 覆盖关系（Overlay） | MainNav、Sheet、Dialog、Keyboard、ReaderOverlay。 | 不永久遮挡核心动作。 |
| 文本极值（Text Extremes） | 最长文案、最大字体、最窄窗口。 | 不重叠、不挤掉主操作。 |
| 安全区（Safe Area） | 状态栏、导航栏、手势区、cutout、圆角。 | 可交互内容不落入危险区。 |
| 键盘（Keyboard） | 输入框、错误提示、提交按钮。 | 键盘出现后仍同时可达。 |
| 返回（Back） | dialog、sheet、page、tab、reader、flow。 | 返回顺序符合优先级。 |
| 状态（State） | loading、empty、error、offline、permission。 | 状态不换壳，有恢复动作。 |
| 组件（Components） | 可复用组件是否进入组件库。 | 没有重复造同义组件。 |
| 实现映射（Implementation Mapping） | HTML slots、Compose state、回调、preview/test。 | 能从设计稿走到可验证实现。 |

## 11. 批次规划模板（Batch Planning Template）

| 字段（Field） | 填写内容（Content） |
|---|---|
| 批次名称（Batch Name） |  |
| 批次目标（Batch Goal） |  |
| 涉及页面（Pages） |  |
| 涉及 Shell（Shells） |  |
| 需要新增组件（New Components） |  |
| 需要补齐组件（Component Updates） |  |
| 需要补齐 token（Token Updates） |  |
| 需要补齐上下文（Context Updates） |  |
| 需要补齐事件（Event Updates） |  |
| 需要补齐状态（State Updates） |  |
| 需要补齐适配规则（Adaptation Updates） |  |
| 需要补齐验收（Validation Updates） |  |
| 不做内容（Out of Scope） |  |
| 完成标准（Definition of Done） |  |

## 12. 单页规划卡模板（Single Page Planning Card Template）

| 字段（Field） | 填写内容（Content） |
|---|---|
| 页面名称（Page Name） |  |
| 页面 id（Page ID） |  |
| 输入包路径（Input Package Path） |  |
| 所属 Shell（Owner Shell） |  |
| 核心任务（Primary Task） |  |
| P0 内容（P0 Content） |  |
| P1 内容（P1 Content） |  |
| P2 内容（P2 Content） |  |
| 固定区（Fixed Regions） |  |
| 滚动区（Scrollable Regions） |  |
| 覆盖区（Overlay Hosts） |  |
| 状态区（State Hosts） |  |
| 可覆盖内容（Coverable Content） |  |
| 必须完整展示（Must Fully Display） |  |
| 入口来源（Entry Sources） |  |
| 返回路径（Back Path） |  |
| 上下文字段（Context Fields） |  |
| 事件字段（Event Fields） |  |
| 断点规则（Breakpoint Rules） |  |
| 安全区规则（Safe Area Rules） |  |
| 键盘规则（Keyboard Rules） |  |
| 文本规则（Text Rules） |  |
| 组件抽象（Componentization） |  |
| 验收项目（Acceptance Checks） |  |

## 13. 当前项目建议批次（Recommended Project Batches）

| 顺序（Order） | 批次（Batch） | 目标（Goal） | 产物（Deliverables） |
|---:|---|---|---|
| 1 | 运行时适配契约（Runtime Adaptation Contract） | 补齐断点、单位、安全区、键盘、文字缩放、返回手势。 | 规划模板、token 需求、验证清单。 |
| 2 | 书架核心结构（Bookshelf Core Structure） | 以书架页验证 MainTabShell 的真实页面逻辑。 | P0/P1/P2、书籍集合布局、MainNav inset、封面比例。 |
| 3 | 书架链路闭环（Library Flow Closure） | 串联搜索、详情、目录、操作底表、导入、分组。 | BookContext、LibraryContext、Sheet/Dialog 规则。 |
| 4 | 阅读器闭环（Reader Flow Closure） | 串联沉浸阅读、控制层、目录、外观、朗读、设置、搜索、替换、自动翻页。 | ReaderContext、ReaderOverlay、ReaderModuleNav、阅读状态矩阵。 |
| 5 | 换源横向流程（Source Switch Flow） | 固化 FlowShell 的横向流程和返回阅读上下文。 | Step/Comparison/Result 三块区域、横向适配、状态摘要。 |
| 6 | 设置链路闭环（Settings Flow Closure） | 串联设置首页和 7 个设置二级页。 | SettingsContext、OptionSheet、ConfirmDialog、权限/缓存/备份状态。 |
| 7 | 可互动 demo（Interactive Demo） | 验证页面间关系、覆盖、返回、状态和适配，不追求最终视觉。 | 可点击 demo、viewport 验证、交互验收记录。 |

## 14. 开工准入检查（Planning Readiness Checklist）

一个页面或批次进入实现前，必须满足以下条件：

- 已明确所属 Shell 和 owner slot。
- 已明确 P0/P1/P2 内容优先级。
- 已明确可覆盖内容和必须完整展示内容。
- 已明确状态区替换规则，不替换根 Shell。
- 已明确入口、出口、返回路径和上下文字段。
- 已明确断点、安全区、键盘和文字缩放规则。
- 已明确需要抽象、复用和禁止抽象的组件。
- 已明确事件名、payload 和回调映射方向。
- 已明确验收项目和失败判定。

未满足任一项时，页面只能继续做规划或补文档，不能进入“视觉复刻完成”的判断。
