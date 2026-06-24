# 应用前端设计稿完成度审计（Application Frontend Design Completion Audit）

本文按规划需求和 `FRONTEND_DESIGN_SPEC_TEMPLATE.md` 的 17 类规范审计当前 29 个 UI 设计页。审计目标是区分“规划文档层是否闭合”和“真实实现是否完成”。规划需求口径见 `FRONTEND_PLANNING_REQUIREMENTS.md`、`FRONTEND_PLANNING_REQUIREMENTS_TEMPLATE.md` 和 `FRONTEND_EXECUTABLE_PLANNING_CONTRACT.md`。

## 审计口径（Audit Rule）

| 状态（Status） | 含义（Meaning） |
|---|---|
| 已闭合（Closed） | 已有明确文档、契约、实现锚点和验收依据。 |
| 基本闭合（Mostly Closed） | 主体已明确，但仍有局部字段或验证缺口。 |
| 部分闭合（Partial） | 有基础输入或局部文档，但不足以直接指导实现。 |
| 缺口（Gap） | 当前没有足够规范或验证依据。 |

## 总体完成度（Overall Completion）

| 规范类别（Spec Category） | 当前状态（Current Status） | 本地依据（Local Evidence） | 缺口（Gap） |
|---|---|---|---|
| 规划需求（Planning Requirements） | 已闭合（Closed） | `FRONTEND_PLANNING_REQUIREMENTS.md`、`FRONTEND_PLANNING_REQUIREMENTS_TEMPLATE.md`、`FRONTEND_PAGE_PLANNING_CARDS.md`、`FRONTEND_DETAILED_PAGE_PLANNING_CARDS.md`、`FRONTEND_FIRST_PAGE_PLANNING_CARDS.md`、`FRONTEND_EXECUTABLE_PLANNING_CONTRACT.md`。 | 后续是真实状态接入、动效代码和设备级验收，不再是规划需求缺口。 |
| 设计稿输入总规范（Frontend Input Spec） | 已闭合（Closed） | `COMPONENT_SPEC.md`、`manifest.json`、29 个输入包、`FRONTEND_EXECUTABLE_PLANNING_CONTRACT.md`。 | 实现侧仍需接入真实业务数据。 |
| 页面框架结构规范（Page Shell Structure Spec） | 已闭合（Closed） | `PAGE_STRUCTURE_MAP.md`、`PAGE_FRAMEWORK_ARCHITECTURE.md`、shared shell kit、可执行规划契约。 | 实现侧新增尺寸必须回填 token 或页面契约。 |
| 页面结构清单（Page Structure Inventory） | 已闭合（Closed） | `PAGE_STRUCTURE_MAP.md` 已逐页列核心结构，`FRONTEND_DETAILED_PAGE_PLANNING_CARDS.md` 已补齐 29 页详版字段。 | 实现侧需转成更多脚本或 UI test。 |
| 组件结构规范（Component Structure Spec） | 已闭合（Closed） | `component-library/COMPONENT_LIBRARY.md`、`FRAMEWORK_COMPONENT_CATALOG.md`、`FRONTEND_EXECUTABLE_PLANNING_CONTRACT.md`。 | 实现侧需补完整组件代码和状态矩阵。 |
| 组件覆盖关系矩阵（Overlay Matrix） | 已闭合（Closed） | `PAGE_STRUCTURE_MAP.md` 覆盖矩阵、`FRONTEND_EXECUTABLE_PLANNING_CONTRACT.md`、`frontend-demo-draft` 首批交互验证。 | 实现侧需扩展全部真实运行态组合。 |
| 几何与排版 Token（Geometry and Typography Tokens） | 已闭合到规划层（Planning Closed） | `design-tokens.json` 定义 70 个 token，`tokens.css` 已含关键 runtime token，可执行规划契约补齐几何基线。 | 实现侧需继续把新增散值回填 token，并跑极端字体缩放。 |
| 页面关系图（Page Relationship Map） | 已闭合（Closed） | `PAGE_RELATIONSHIP_MAP.md`、`FRONTEND_DETAILED_PAGE_PLANNING_CARDS.md`。 | 实现侧需接入真实 Navigation。 |
| 导航栈规则（Navigation Stack Rules） | 已闭合（Closed） | `PAGE_RELATIONSHIP_MAP.md` 已补导航栈和状态替换规则，demo 已验证首批入栈 / 返回。 | 实现侧需接入真实返回栈。 |
| 数据上下文契约（Context Contract） | 已闭合（Closed） | `contracts.d.ts`、`PAGE_RELATIONSHIP_MAP.md`、`FRONTEND_DETAILED_PAGE_PLANNING_CARDS.md`。 | 实现侧需接入 ViewModel / persistence。 |
| 状态与事件契约（State and Event Contract） | 已闭合（Closed） | `contracts.d.ts`、`EVENT_CALLBACK_MAPPING.md`、state matrix、状态替换规则。 | 实现侧需接入真实事件副作用。 |
| 内容优先级规则（Content Priority Rules） | 已闭合（Closed） | `FRONTEND_PAGE_PLANNING_CARDS.md`、`FRONTEND_DETAILED_PAGE_PLANNING_CARDS.md`。 | 实现侧需验证 P0 可见性和最后一项可达。 |
| 交互动效规则（Motion Rules） | 已闭合到规划层（Planning Closed） | `FRONTEND_EXECUTABLE_PLANNING_CONTRACT.md` 已定义 pressed、active、sheet、dialog、reader overlay、键盘、Flow 检测和危险操作动效。 | 实现侧需补真实动画曲线代码。 |
| 响应式与安全区规则（Viewport and Safe Area Rules） | 部分闭合（Partial） | `RUNTIME_ADAPTATION_CONTRACT.md`、`FRONTEND_EXECUTABLE_PLANNING_CONTRACT.md`、`ADAPTIVE_CONSTRAINT_AUDIT.md`。 | 规划契约已存在，但当前 demo 仍主要是固定 390px 竖屏手机画布；需要补 viewport-class、orientation、foldable / tablet 切换和多视口验收。 |
| 无障碍规则（Accessibility Rules） | 已闭合到规划层（Planning Closed） | `FRONTEND_EXECUTABLE_PLANNING_CONTRACT.md` 已补语义、焦点、点击区、对比度、文本缩放、读屏和减少动态效果规则。 | 实现侧需补语义属性和对比度测试。 |
| 资源与图标规则（Asset Rules） | 已闭合（Closed） | `asset-library`、`icons.js`、图标 token、素材裁切与占位规则、可执行规划契约。 | 实现侧需保证新增素材先登记。 |
| 实现映射规则（Implementation Mapping） | 已闭合到规划层（Planning Closed） | `FRONTEND_MAPPING_GUIDE.md`、`EVENT_CALLBACK_MAPPING.md`、`ReaderDesignTokenContractTest`、`ReaderShellComposeUiTest`。 | 实现侧需把全部页面事件接入真实 ViewModel / navigation / persistence。 |
| 验收与验证矩阵（Acceptance Matrix） | 已闭合到规划层（Planning Closed） | `manifest.json`、validate 脚本、测试守卫、`FRONTEND_EXECUTABLE_PLANNING_CONTRACT.md`。 | 实现侧仍需真实设备、无障碍、极端文本和全量业务状态验证。 |

## 逐页应用范围（Per Page Application Scope）

下表把 29 个正式页面按完整规范模板套入第一版审计。`结构基础` 表示页面已归入 shell 和 slots；`待补重点` 现在表示实现与验证侧还需要闭合的内容，不再表示这些页面缺少 P0/P1/P2 或详版规划字段。

| 页面（Page） | Shell | 结构基础（Structure Base） | 待补重点（Next Required Work） |
|---|---|---|---|
| 书架（Bookshelf） | MainTabShell | 已有主 tab shell、状态矩阵、事件契约、页面结构描述。 | 已规划 P0/P1/P2 的实现验收；书籍网格几何 token；MainNav inset 验证；封面裁切规则。 |
| 发现（Discover） | MainTabShell | 已有主 tab shell、发现内容和事件契约。 | 推荐/来源/榜单优先级；来源入口上下文；刷新动效；列表文字范围。 |
| RSS（RSS） | MainTabShell | 已有主 tab shell、订阅流状态和事件契约。 | 未读筛选上下文；订阅条目打开目标；空态/错误态 slot 规则。 |
| 设置首页（Settings Home） | MainTabShell | 已有主 tab shell 和设置入口事件。 | 入口优先级；设置二级栈返回规则；权限/备份提示覆盖规则。 |
| 书架空状态（Bookshelf Empty） | LibraryShell | 已有 LibraryShell、状态矩阵、主要事件。 | MainTab 内空态和 LibraryShell 空态边界；主/次行动作优先级。 |
| 书籍搜索（Book Search） | LibraryShell | 已有搜索 fixture、状态、事件。 | 键盘避让；搜索结果文本范围；搜索上下文传递。 |
| 书籍详情（Book Detail） | LibraryShell | 已有详情结构、来源 sheet、阅读事件。 | BookContext 标准化；阅读/目录/来源选择的返回规则。 |
| 书籍目录（Book Directory） | LibraryShell | 已有章节列表和状态事件。 | ChapterContext；当前章节定位；长章节名截断规则。 |
| 排序与筛选（Sort and Filter） | LibraryShell | 已有筛选事件和状态。 | 作为底表还是二级页的结构边界；应用后回写书架上下文。 |
| 书籍操作底表（Book Action Sheet） | LibraryShell | 已有底表和危险操作事件。 | Sheet/Dialog 层级验证；删除影响范围文案和焦点顺序。 |
| 分组管理（Group Management） | LibraryShell | 已有分组事件和 dialog host。 | 拖拽/排序动效；命名输入键盘避让；删除后的书籍去向。 |
| 本地书导入（Local Import） | LibraryShell | 已有导入流程状态和事件。 | 系统文件选择器边界；进度/结果列表优先级；失败恢复路径。 |
| 沉浸阅读（Immersive Reading） | ReaderShell | 已有 ReadingSurface、点击事件、状态，并承载打开 / 失败 / 离线状态。 | 点击热区几何；文字缩放；页脚信息显示范围；ReaderContext 初始化与加载失败恢复。 |
| 阅读控制层（Reader Control Layer） | ReaderShell | 已有阅读覆盖层和四模块 active 规则。 | 控制层出现/隐藏动效；底部面板高度；亮度栏几何。 |
| 目录与书签（TOC and Bookmarks） | ReaderShell | 已有目录/书签状态和事件。 | 面板内滚动范围；章节打开后正文定位；更多菜单层级。 |
| 阅读外观（Reading Appearance） | ReaderShell | 当前 demo 已有无图标纯色主题、字号、行距、段距、字距、字体即时控制。 | Typography token；主题和排版即时预览；完整页保存/重置不作为当前快捷窗验收项。 |
| 朗读（Read Aloud） | ReaderShell | 当前 demo 已有朗读状态、图标播放控制、语速/声音/范围/定时循环。 | 运行态悬浮反馈；语速/声音控件范围；后台状态；快捷窗不展示示例正文。 |
| 阅读设置（Reading Settings） | ReaderShell | 当前 demo 已有阅读设置开关、循环值和更多设置入口。 | 与 SettingsShell 的边界；设置项文字范围；模块内即时反馈。 |
| 自动翻页（Auto Page） | ReaderShell | 已有运行/暂停状态和事件。 | 自动翻页运行态覆盖规则；速度控件几何；停止路径。 |
| 内容搜索（Content Search） | ReaderShell | 已有搜索状态和事件。 | 键盘避让；结果定位上下文；上一条/下一条按钮可达。 |
| 内容替换（Content Replacement） | ReaderShell | 已有规则编辑和保存事件。 | 输入字段范围；测试反馈；临时关闭和保存区别。 |
| 换源（Source Switch） | FlowShell | 已有 FlowShell、步骤/对照/结果区和事件。 | 横屏响应式；候选检测动效；切换确认不被状态覆盖。 |
| App 通用设置（General Settings） | SettingsShell | 已有 SettingsShell、选项、恢复事件。 | OptionSheet 几何；恢复确认焦点顺序；设置 token。 |
| 书架与搜索设置（Bookshelf and Search Settings） | SettingsShell | 已有布局/列数/清空事件。 | 书架布局回写契约；清空历史确认；预览区域文本规则。 |
| 隐私与权限（Privacy and Permissions） | SettingsShell | 已有权限和隐私事件。 | 系统设置返回；权限状态 slot；清理隐私数据影响范围。 |
| 缓存管理（Cache Management） | SettingsShell | 已有缓存计算和清理事件。 | 清理进度状态；缓存分类行文本范围；策略切换反馈。 |
| 关于与反馈（About and Feedback） | SettingsShell | 已有版本、反馈、源码仓库、开源许可和诊断导出入口。 | 外部链接边界；离线状态；反馈入口返回路径；不出现用户协议或隐私协议。 |
| 同步与备份（Sync and Backup） | SettingsShell | 已有备份、恢复、权限事件。 | 备份上下文；冲突解决流；恢复覆盖确认和进度。 |
| 书源管理（Source Management） | SettingsShell | 已有搜索、筛选、启用、检测、编辑、日志事件。 | SourceContext；编辑/日志子状态；检测全量动效和错误恢复。 |

## 优先闭合顺序（Closure Order）

1. 内容优先级实现验收：按 `FRONTEND_PAGE_PLANNING_CARDS.md` 校验 29 页 P0/P1/P2 的 HTML/Compose 实现。
2. 导航栈和上下文实现：把 BookContext、ReaderContext、LibraryContext、SettingsContext、SourceContext 落到真实状态、回调和返回恢复。
3. 响应式、安全区和键盘深化：按 `ADAPTIVE_CONSTRAINT_AUDIT.md` 先补 viewport-class、orientation、foldable / tablet 约束，再覆盖搜索、替换、命名、权限等输入场景。
4. 动效和无障碍：补 pressed/focused/disabled、底表/弹窗/阅读覆盖层动效、焦点顺序、点击区域和对比度。
5. 验证矩阵扩展：把极端文本、最后一项可达、真实滚动、状态 slot 和事件 payload 纳入脚本或 Compose preview/UI test 守卫。
