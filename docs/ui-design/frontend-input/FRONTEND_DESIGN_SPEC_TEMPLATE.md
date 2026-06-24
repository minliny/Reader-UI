# 应用前端设计稿完整规范模板（Application Frontend Design Spec Template）

本文定义把 UI 设计图转换为应用前端设计稿时必须交付的完整规范。它不是页面样张说明，而是后续 HTML 输入件、Compose 实现、状态矩阵和交互验证共同遵守的模板。

## 使用规则（Usage Rules）

- 每张 UI 图进入本文模板前，必须先按 `FRONTEND_PLANNING_REQUIREMENTS_TEMPLATE.md` 完成规划需求梳理。
- 每张 UI 图必须先归入页面、状态和 shell，再进入视觉细节。
- 每个页面必须能套用本文模板，不允许只给截图或静态 HTML。
- 每个字段都必须有“通过标准”，否则不能作为验收依据。
- 页面实现缺少字段时，标记为 `缺口（Gap）`，不能用“视觉接近”代替。

## 1. 设计稿输入总规范（Frontend Input Spec）

每个输入包必须说明：

| 字段（Field） | 必填内容（Required Content） | 通过标准（Pass Criteria） |
|---|---|---|
| 页面身份（Page Identity） | 中文名、英文名、页面 id、所属 UI 图。 | 能唯一对应 `manifest.json` target 和本地 UI 设计图。 |
| 页面性质（Page Nature） | 默认页、状态页、弹层页、横向流程页、组件参考页。 | 不把 `preview.html` 当展示样张，不把 `state-matrix.html` 当无关截图集合。 |
| 输入文件（Input Files） | `fixture.json`、`fixture.js`、`render.js`、`preview.html`、`state-matrix.html`、`README.md`、`COMPONENT_SPEC.md`。 | 文件齐备，且 manifest 中有正式验证目标。 |
| 来源边界（Source Boundary） | UI 图、fixture、contract、组件规格、素材库来源。 | 任何新增字段都能追溯来源，不能临时硬编码成示例图。 |

## 2. 页面框架结构规范（Page Shell Structure Spec）

每个页面必须声明：

| 字段（Field） | 必填内容（Required Content） | 通过标准（Pass Criteria） |
|---|---|---|
| Shell | `MainTabShell`、`LibraryShell`、`ReaderShell`、`FlowShell`、`SettingsShell`。 | 与 `manifest.json.shellName` 一致。 |
| 固定区（Fixed Regions） | 顶栏、返回栏、主导航、阅读模块导航等。 | 固定区不被内容状态替换。 |
| 滚动区（Scrollable Regions） | 正式内容滚动容器。 | 滚动内容有明确 inset，不被悬浮层永久遮挡。 |
| 覆盖区（Overlay Regions） | 底表、弹窗、toast、阅读覆盖层、键盘避让。 | 覆盖层挂在正确 host，不临时复制宿主。 |
| 状态区（State Regions） | loading、empty、error、offline、permission。 | 状态替换内容区或 state host，不替换根 shell。 |

## 3. 页面结构清单（Page Structure Inventory）

每页必须填写：

| 字段（Field） | 必填内容（Required Content） | 通过标准（Pass Criteria） |
|---|---|---|
| 核心内容（Core Content） | 页面最重要的业务对象。 | 首屏和滚动策略优先保障核心内容。 |
| 次要内容（Secondary Content） | 快捷入口、推荐、摘要、弱提示。 | 不压缩核心内容到不可用。 |
| 可覆盖内容（Coverable Content） | 可被导航、底表、控制层临时覆盖的过渡区。 | 被覆盖内容可滚动或可恢复。 |
| 必须完整展示（Must Fully Display） | 最后一项可点击内容、确认按钮、输入框、错误动作。 | 任意状态下都不能被固定层永久遮挡。 |
| 内容分组（Content Sections） | 每个 section 的顺序和容器。 | 顺序服务页面任务，不按截图块随意排。 |

## 4. 组件结构规范（Component Structure Spec）

每个组件必须填写：

| 字段（Field） | 必填内容（Required Content） | 通过标准（Pass Criteria） |
|---|---|---|
| 所属组件族（Component Family） | Primitive、Product、Reader、Settings、Sheet、State。 | 与组件库分类一致。 |
| 所属 slot（Owner Slot） | 组件所在 shell slot。 | 不跨 shell 复制同义组件。 |
| 内部结构（Internal Structure） | 子元素、图标、文本、动作区。 | 能映射为可编辑 DOM/Compose 结构。 |
| 尺寸范围（Size Range） | 固定尺寸、最小尺寸、最大尺寸。 | 状态变化不导致布局跳动。 |
| 相邻距离（Spacing） | 与前后组件、内部元素距离。 | 使用 token 或明确 px/dp 规则。 |
| 文本规则（Text Rule） | 单行、多行、截断、换行、自适应。 | 最长合法文案不溢出、不遮挡。 |
| 状态（States） | default、active、pressed、focused、disabled、loading、error。 | 状态变化有明确视觉反馈，不改变结构边界。 |

## 5. 组件覆盖关系矩阵（Component Overlay Matrix）

每个覆盖组件必须说明：

| 字段（Field） | 必填内容（Required Content） | 通过标准（Pass Criteria） |
|---|---|---|
| 覆盖者（Overlay Component） | 例如 `MainNav`、`SheetHost`、`DialogHost`、`ReaderOverlayHost`。 | 覆盖组件有唯一宿主。 |
| 可覆盖对象（Can Cover） | 允许被遮挡的内容或过渡区。 | 被覆盖对象可滚动、可恢复或非核心。 |
| 禁止覆盖对象（Must Not Cover） | 确认按钮、最后完整项、输入框、主导航状态等。 | 禁止对象始终可见或可达。 |
| 避让规则（Avoidance Rule） | bottom inset、keyboard avoidance、scrim、层级提升。 | 避让规则可执行。 |

## 6. 几何与排版 Token（Geometry and Typography Tokens）

必须沉淀为 token 或显式契约：

| 类别（Category） | 必填 token（Required Tokens） | 通过标准（Pass Criteria） |
|---|---|---|
| Frame | 宽高、安全区、横竖屏 viewport。 | 页面不依赖截图尺寸硬编码。 |
| Shell | 顶栏高度、主导航高度、底部操作高度、底部 inset。 | 固定层和滚动层关系可计算。 |
| Overlay | 底表高度、弹窗宽度、toast 位置、遮罩层级。 | 覆盖组件不靠页面局部 CSS 猜测。 |
| Spacing | 页面边距、section 间距、行间距、组件内部 gap。 | 同类组件跨页面一致。 |
| Typography | 标题、二级标题、行主文本、辅助文本、按钮、导航标签、正文。 | 字号、行高、字重不散落在页面 CSS 中。 |
| Icon/Image | 图标尺寸、封面比例、头像/徽标尺寸。 | 图片不错误裁切，图标不漂移。 |

## 7. 页面关系图（Page Relationship Map）

必须覆盖：

| 字段（Field） | 必填内容（Required Content） | 通过标准（Pass Criteria） |
|---|---|---|
| 进入来源（Entry From） | 页面可以从哪些页面或事件进入。 | 所有入口都有来源上下文。 |
| 后续流向（Outbound） | 页面会进入哪些页面、弹层或状态。 | 所有跳转都有目标 shell。 |
| 返回路径（Back Path） | back / dismiss / close 回到哪里。 | 不出现无上下文返回。 |
| 跨 shell 规则（Cross Shell Rule） | MainTab、Library、Reader、Flow、Settings 之间如何切。 | Flow 不进主导航，Reader 不显示 MainNav。 |

## 8. 导航栈规则（Navigation Stack Rules）

必须说明：

| 字段（Field） | 必填内容（Required Content） | 通过标准（Pass Criteria） |
|---|---|---|
| Tab 栈（Tab Stack） | 四个 tab 是否保留各自滚动和局部状态。 | 切 tab 不丢局部状态。 |
| 二级栈（Secondary Stack） | LibraryShell / SettingsShell 返回路径。 | 返回到来源页面或来源 tab。 |
| 阅读栈（Reader Stack） | ImmersiveReading、ReaderControl 和 ReaderStateHost 的关系。 | 阅读全屏返回保留书籍和进度。 |
| 横向流程栈（Flow Stack） | SourceSwitch 进入和返回。 | 换源成功/取消都回到正确阅读上下文。 |

## 9. 数据上下文契约（Context Contract）

必须明确上下文字段：

| 上下文（Context） | 必填字段（Required Fields） | 通过标准（Pass Criteria） |
|---|---|---|
| BookContext | `bookId`、`title`、`author`、`cover`、`sourceId`。 | 详情、目录、阅读、操作底表共享同一书籍。 |
| ChapterContext | `chapterId`、`chapterTitle`、`index`、`status`。 | 打开章节不丢目录位置。 |
| ReaderContext | `bookId`、`chapterId`、`progress`、`sourceId`、`appearance`。 | 任何阅读模块切换都保留进度。 |
| LibraryContext | `groupId`、`sort`、`filter`、`layout`、`query`。 | 筛选、排序、分组管理回写书架。 |
| SettingsContext | `settingKey`、`currentValue`、`pendingValue`。 | 选择、确认、恢复有明确目标。 |
| SourceContext | `sourceId`、`candidateId`、`detectResult`。 | 换源和书源管理不混淆来源。 |

## 10. 状态与事件契约（State and Event Contract）

每页必须说明：

| 字段（Field） | 必填内容（Required Content） | 通过标准（Pass Criteria） |
|---|---|---|
| State union | 所有页面状态。 | 与 `contracts.d.ts` 和 state matrix 一致。 |
| Event union | 所有交互事件。 | 与 `contracts.d.ts` 和回调映射一致。 |
| Event payload | 事件参数。 | 不压成无参数 `onClick`。 |
| State slot | 状态替换哪个 slot。 | 不替换根 shell。 |
| 可达动作 | 状态下仍可点击的动作。 | 错误、权限、离线状态有恢复路径。 |

## 11. 内容优先级规则（Content Priority Rules）

必须按页面任务排序：

| 字段（Field） | 必填内容（Required Content） | 通过标准（Pass Criteria） |
|---|---|---|
| P0 核心内容 | 页面必须完成的核心任务。 | 首屏和滚动策略优先保障。 |
| P1 辅助内容 | 快捷入口、筛选、摘要。 | 不压缩 P0。 |
| P2 弱内容 | 提示、装饰、补充信息。 | 可被折叠或覆盖。 |
| 可延迟内容 | 可滚动到后面或按需展开。 | 不阻塞主流程。 |

## 12. 交互动效规则（Motion Rules）

必须定义：

| 场景（Scenario） | 必填内容（Required Content） | 通过标准（Pass Criteria） |
|---|---|---|
| 按钮反馈 | pressed / active / disabled。 | 不通过位移或尺寸变化破坏布局。 |
| Tab 切换 | active 变化和内容替换。 | 位置稳定，状态保留。 |
| 底表 | 进入、退出、遮罩。 | 来源上下文不丢。 |
| 弹窗 | 进入、退出、阻塞行为。 | 取消和确认清晰。 |
| 阅读覆盖层 | 显示、隐藏、模块切换。 | 正文位置不重置。 |

## 13. 响应式与安全区规则（Viewport and Safe Area Rules）

必须说明：

| 场景（Scenario） | 必填内容（Required Content） | 通过标准（Pass Criteria） |
|---|---|---|
| 手机竖屏 | 主 viewport、状态栏、底部安全区。 | 主内容不被系统栏或导航永久遮挡。 |
| 横屏流程 | FlowShell 画布和区域比例。 | 换源三块区域可读可操作。 |
| 键盘 | 输入框、提交按钮、结果列表避让。 | 键盘出现后主操作仍可达。 |
| 字体缩放 | 文本增长后的换行/截断。 | 组件不重叠、不溢出。 |

## 14. 无障碍规则（Accessibility Rules）

必须说明：

| 字段（Field） | 必填内容（Required Content） | 通过标准（Pass Criteria） |
|---|---|---|
| 语义标签 | 按钮、导航、输入、列表、弹窗。 | 可被辅助技术识别。 |
| 焦点顺序 | 顶栏、内容、底部操作、弹层。 | 焦点不跳进被遮挡内容。 |
| 点击区域 | 最小可点击尺寸。 | 图标按钮和行操作可触达。 |
| 对比度 | 文本、图标、状态色。 | active/disabled/error 可辨认。 |
| 动效降级 | 减少动态效果。 | 不影响操作完成。 |

## 15. 资源与图标规则（Asset Rules）

必须说明：

| 字段（Field） | 必填内容（Required Content） | 通过标准（Pass Criteria） |
|---|---|---|
| 图标 token | 图标 id、语义、使用范围。 | 页面不新增一次性 SVG。 |
| 图片资源 | 封面、UI 图、占位图。 | 图片无缺失，缺图有占位。 |
| 裁切规则 | cover / contain / fixed ratio。 | 封面可识别，不错误裁切关键信息。 |
| 素材来源 | asset-library 注册。 | 资源能被验证脚本发现。 |

## 16. 实现映射规则（Implementation Mapping）

必须说明：

| 映射对象（Mapping Target） | 必填内容（Required Content） | 通过标准（Pass Criteria） |
|---|---|---|
| HTML | shell kit、slots、fixture、state matrix。 | 页面 renderer 只把数据映射到 slots。 |
| Compose State | Kotlin state / enum / data class。 | 与 contracts 对齐。 |
| Compose 回调 | 明确 `onSearch`、`onOpenBook` 等。 | 不使用泛化 `onClick`。 |
| Preview / Test | 默认态和状态矩阵。 | 每页至少覆盖关键状态。 |

## 17. 验收与验证矩阵（Acceptance and Validation Matrix）

必须验收：

| 验收项（Check） | 通过标准（Pass Criteria） |
|---|---|
| Shell 正确 | 页面根 shell 与 manifest 一致。 |
| Slot 完整 | 所有必需 slot 存在。 |
| 结构正确 | 固定区、滚动区、覆盖区、状态区明确。 |
| 覆盖正确 | 没有永久遮挡核心操作。 |
| 文本正确 | 文本不溢出，最长合法文案有规则。 |
| Token 正确 | 几何、字号、间距来自 token 或明确契约。 |
| 状态正确 | 状态不替换根 shell，有恢复路径。 |
| 事件正确 | 事件和 payload 与 contract 一致。 |
| 视觉正确 | 核心视觉接近 UI 图，但不牺牲结构。 |
| 交互正确 | 可点击、可返回、可恢复、可滚动。 |
