# 前端设计稿规划需求（Frontend Planning Requirements）

本文把当前 Reader UI 设计图转换为前端设计稿的规划需求落到项目级清单。它回答“当前规划已经覆盖什么、进入实现前必须依据什么、哪些内容属于实现和验收深化”，并作为 `FRONTEND_PLANNING_REQUIREMENTS_TEMPLATE.md` 的当前项目填写版。

## 页面对应内容入口（Page Content Entry）

如果要查看每个页面已经填写好的规划内容，使用以下文件：

| 文件（File） | 内容（Content） | 用途（Usage） |
|---|---|---|
| `FRONTEND_PAGE_PLANNING_CARDS.md` | 30 个正式页面的全量页面规划卡。 | 查看每个页面对应的核心任务、P0/P1/P2、Shell、覆盖关系、上下文事件、适配验收。 |
| `FRONTEND_DETAILED_PAGE_PLANNING_CARDS.md` | 30 个正式页面的详版字段矩阵。 | 查看每个页面的固定区、滚动区、覆盖区、状态区、入口、返回、上下文、事件、适配、文本、组件和验收。 |
| `FRONTEND_FIRST_PAGE_PLANNING_CARDS.md` | 书架、书籍搜索、阅读控制层、换源 4 个代表页详版规划卡。 | 查看更细的单页规划卡填写方式。 |
| `FRONTEND_PLANNING_REQUIREMENTS_TEMPLATE.md` | 空模板和字段说明。 | 新页面或新批次按此模板补。 |

不要把 `FRONTEND_PLANNING_REQUIREMENTS_TEMPLATE.md` 当成页面对应内容；它只是模板。页面对应内容以 `FRONTEND_PAGE_PLANNING_CARDS.md` 和 `FRONTEND_DETAILED_PAGE_PLANNING_CARDS.md` 为准。

## 信息来源（Source of Truth）

| 来源（Source） | 规划用途（Planning Usage） |
|---|---|
| `manifest.json` | 锁定 30 个正式页面、64 个正式验证目标、shellName、pageRole、viewport、slots 和验证目标。 |
| `contracts.d.ts` | 锁定 Fixture、State union、Event union 和 event payload。 |
| `PAGE_STRUCTURE_MAP.md` | 锁定 Shell、slot、层级、覆盖关系和框架几何契约。 |
| `PAGE_RELATIONSHIP_MAP.md` | 锁定页面流向、跨 Shell 关系、上下文传递和交互约束。 |
| `FRONTEND_DESIGN_COMPLETION_AUDIT.md` | 锁定规划层完成度和实现层剩余工作。 |
| `FRONTEND_PLANNING_REQUIREMENTS_TEMPLATE.md` | 锁定新增页面和新增批次必须填写的规划字段。 |
| `FRONTEND_PAGE_PLANNING_CARDS.md` | 锁定 30 个正式页面的全量规划卡。 |
| `FRONTEND_DETAILED_PAGE_PLANNING_CARDS.md` | 锁定 30 个正式页面的详版结构、上下文、适配、文本、组件和验收字段。 |
| `FRONTEND_FIRST_PAGE_PLANNING_CARDS.md` | 锁定首批 4 张代表页的详版规划卡。 |
| `RUNTIME_ADAPTATION_CONTRACT.md` | 锁定断点、单位、安全区、键盘、覆盖层、返回和文字缩放规则。 |
| `FRONTEND_EXECUTABLE_PLANNING_CONTRACT.md` | 锁定几何基线、组件规格、导航栈、状态替换、动效、无障碍、素材和验收规划。 |
| 页面 `README.md` / `COMPONENT_SPEC.md` / `fixture.json` | 锁定页面可见内容、组件、状态、事件和局部验收依据。 |

## 规划完成定义（Planning Done Definition）

规划需求补齐不是生成一张更像的 HTML 图，而是让每个页面在进入实现前都有可执行依据。满足以下条件才算规划闭合：

| 要求（Requirement） | 必须闭合的内容（Required Closure） | 证据（Evidence） |
|---|---|---|
| 页面任务闭合（Page Task Closure） | 每页明确核心任务、成功路径、失败恢复和 P0/P1/P2 内容。 | 本文逐页规划表、`FRONTEND_PAGE_PLANNING_CARDS.md` 和 `FRONTEND_DETAILED_PAGE_PLANNING_CARDS.md`。 |
| Shell 结构闭合（Shell Structure Closure） | 每页明确 owner Shell、固定区、滚动区、覆盖区、状态区。 | `PAGE_STRUCTURE_MAP.md`、`FRONTEND_PAGE_PLANNING_CARDS.md` 和 `FRONTEND_DETAILED_PAGE_PLANNING_CARDS.md`。 |
| 覆盖避让闭合（Overlay Avoidance Closure） | 明确哪些内容可被覆盖、哪些必须完整展示、哪个层消费 inset。 | 覆盖矩阵、运行时适配契约、验证清单。 |
| 运行时适配闭合（Runtime Adaptation Closure） | 明确断点、单位、安全区、键盘、文字缩放、手势冲突。 | `RUNTIME_ADAPTATION_CONTRACT.md` 或等价章节。 |
| 上下文闭合（Context Closure） | 明确 Book、Library、Reader、Settings、Source 上下文字段和保留规则。 | `PAGE_RELATIONSHIP_MAP.md`、`contracts.d.ts`、`FRONTEND_PAGE_PLANNING_CARDS.md`。 |
| 组件抽象闭合（Component Closure） | 明确应抽组件、不应抽组件、组件尺寸范围、文本规则和状态规则。 | 组件库、组件规格、规划卡。 |
| 验收闭合（Validation Closure） | 每个批次有结构、文本、覆盖、状态、事件、适配和返回验证项。 | 验收矩阵、validate 脚本、Compose preview/test 计划。 |

## 总体规划层（Planning Layers）

| 层级（Layer） | 规划问题（Planning Question） | 当前结论（Current Decision） |
|---|---|---|
| 页面任务层（Page Task Layer） | 页面让用户完成什么。 | 先按 P0/P1/P2 拆任务，不再按截图块拆页面。 |
| Shell 层（Shell Layer） | 页面属于哪个框架，哪些区固定、滚动、覆盖。 | 五个 runtime shell 固定为 MainTabShell、LibraryShell、ReaderShell、FlowShell、SettingsShell。 |
| 运行时层（Runtime Layer） | 不同屏幕、键盘、安全区、文字缩放下怎么保持可用。 | 新增运行时适配契约，禁止按单一截图硬编码布局。 |
| 组件层（Component Layer） | 哪些内容复用成组件，哪些只作为页面业务内容。 | Primitive、Product、Reader、Settings、State、Overlay 分族管理。 |
| 关系层（Relationship Layer） | 页面如何进入、返回、保留上下文。 | 主 tab、书架链路、阅读链路、Flow、设置链路分域。 |
| 验收层（Validation Layer） | 怎样证明设计稿可实现、可交互、可回归。 | HTML 输入件、state matrix、Compose preview/test 和人工结构审计并行。 |

## 需求批次（Requirement Batches）

| 优先级（Priority） | 批次（Batch） | 涉及范围（Scope） | 必补需求（Required Planning） | 完成标准（Definition of Done） |
|---:|---|---|---|---|
| 1 | 运行时适配契约（Runtime Adaptation Contract） | 全部 30 页和 5 个 Shell | 断点、单位、安全区、系统栏、键盘、文字缩放、手势冲突、资源倍率。 | 已由 `RUNTIME_ADAPTATION_CONTRACT.md` 和 `FRONTEND_EXECUTABLE_PLANNING_CONTRACT.md` 闭合到规划层；实现侧继续补 token 映射和验证规则。 |
| 2 | 书架核心结构（Bookshelf Core Structure） | 书架、书架空状态、书架与搜索设置 | 书架 P0/P1/P2、书籍集合密度、继续阅读权重、封面比例、MainNav 避让。 | 书架页能展示足够书籍，继续阅读不主导页面，最后一本书可滚到 MainNav 上方。 |
| 3 | 书架链路闭环（Library Flow Closure） | 搜索、详情、目录、排序筛选、操作底表、分组、导入 | BookContext、LibraryContext、搜索键盘避让、底表/弹窗返回、长文本规则。 | 书籍从搜索/详情/目录/操作/导入之间流转不丢上下文。 |
| 4 | 阅读器闭环（Reader Flow Closure） | 沉浸阅读、控制层、目录、外观、朗读、设置、自动翻页、搜索、替换 | ReaderContext、阅读正文底层、覆盖层、模块导航 active、快捷操作、输入键盘。 | 阅读覆盖不重置正文位置，四模块按钮位置稳定，搜索/替换键盘不遮挡主动作。 |
| 5 | 换源横向流程（Source Switch Flow） | 换源 FlowShell | 横向画布、步骤区、对照区、结果区、状态区、返回阅读上下文。 | 切换确认不被状态区覆盖，取消/成功/失败都回到正确阅读上下文。 |
| 6 | 设置链路闭环（Settings Flow Closure） | 设置首页和 7 个设置二级页 | SettingsContext、OptionSheet、ConfirmDialog、Toast、权限/缓存/备份恢复。 | 每个设置动作有返回路径和状态恢复，危险操作走确认弹窗。 |
| 7 | 可互动 Demo 规划（Interactive Demo Planning） | 首批代表页面和跨 Shell 跳转 | 点击、滚动、状态切换、返回、底表、键盘、viewport 切换。 | Demo 用来验证结构和交互逻辑，不作为最终视觉完成标准。 |

## 运行时适配需求（Runtime Adaptation Requirements）

| 需求（Requirement） | 默认规则（Default Rule） | 首批落点（First Targets） |
|---|---|---|
| 语义断点（Semantic Breakpoints） | 使用 `xs/sm/md/lg/xl`，以窗口宽度和高度共同决定布局，不按机型硬编码。 | MainTabShell、ReaderShell、FlowShell。 |
| 单位映射（Unit Mapping） | 布局尺寸和字体尺寸分开，HTML 仅作为输入件表达，Compose 映射到 dp/sp。 | tokens、shared shell kit、Compose theme。 |
| 安全区 owner（Safe Area Owner） | Shell 消费系统顶部/底部基础 inset，Page 或 Overlay 只消费自己新增的尾部/键盘 inset。 | MainNav、BottomActionHost、BottomSheet、ReaderModuleNav。 |
| 键盘归属（Keyboard Ownership） | 输入页面必须声明谁滚动、谁固定、谁抬升、谁保持原位。 | 书籍搜索、内容搜索、内容替换、分组命名、书源编辑。 |
| 文本极值（Text Extremes） | 标题、列表行、按钮、导航标签必须声明单行/多行/截断/滚动优先级。 | 书架、书籍详情、目录、设置行、换源候选。 |
| 手势优先级（Gesture Priority） | 返回先关闭 Dialog，再关闭 Sheet/Reader panel，再返回页面或阅读来源。 | LibraryShell、ReaderShell、FlowShell、SettingsShell。 |
| 最后一项可达（Last Item Reachability） | 固定底栏或底表存在时，滚动内容必须有足够尾部 inset。 | 书架网格、设置列表、搜索结果、目录列表。 |
| 命中区（Hit Target） | 视觉框可以小，但点击区域必须满足平台下限。 | 顶栏图标、主导航、ReaderModuleNav、列表行尾部操作。 |

## 组件与 Token 需求（Component and Token Requirements）

| 类别（Category） | 当前规划结论（Current Planning Decision） | 实现要求（Implementation Requirement） |
|---|---|---|
| Frame token | viewport、safe area、content inset、键盘高度、基础 phone / flow 尺寸已落到 token；新增尺寸必须继续回填 token 或页面契约。 | 不允许在页面局部写不可追溯 frame 尺寸。 |
| Shell token | 顶栏、主导航、底部操作、Reader panel、Reader module nav、Flow 最小高度已有规划基线。 | 每个 Shell 实现必须按 `FRONTEND_EXECUTABLE_PLANNING_CONTRACT.md` 的 min/preferred/inset 关系落地。 |
| Typography token | 标题、书名、辅助信息、阅读正文、阅读控件标签已有层级，长文本策略已在详版规划和可执行契约中声明。 | 极端文本不能靠缩小字号解决，必须截断、换行、折叠或滚动。 |
| z-index / layer token | Content、Overlay、MainNav、BottomSheet、ReaderModuleNav、Dialog、Keyboard 层级已规划。 | 实现中禁止临时覆盖层级压过主导航 active、弹窗或键盘。 |
| BookCover | 默认 2:3，关键内容不得错误裁切，列表小图可 contain，缺失有占位。 | 封面裁切策略必须由组件统一处理。 |
| MainNavItem | 四等分、图标壳、标签单行、active 不位移已锁定。 | active 只能改背景、图标色、文字色。 |
| ReaderModuleButton | 四等分、固定尺寸、固定间距、快捷窗避让和 active 不位移已锁定。 | 切模块不能重排底部导航或重置正文；重复点击当前模块必须关闭快捷控制窗；底栏顶部小横条上拉展开完整控制页。 |
| SettingRow | 主文本、说明、值区、尾部操作的 minmax 和截断规则已锁定。 | 长值文本不挤压开关 / 箭头 / 返回。 |
| BottomSheet / Dialog | 主动作、取消动作、返回优先级、焦点顺序和键盘避让已规划。 | Dialog 永远高于 Sheet；键盘输入态必须保留保存 / 取消。 |

## 上下文需求（Context Requirements）

| 上下文（Context） | 创建位置（Created At） | 必保留字段（Must Preserve） | 首批验证点（First Validation Point） |
|---|---|---|---|
| MainNavContext | MainTabShell | 当前 tab、每个 tab 的滚动位置、筛选状态、加载/错误状态。 | 切换 tab 后书架分组和滚动不重置。 |
| LibraryContext | 书架 | group、sort、filter、layout、query、selectedBook。 | 排序筛选、分组管理、书架设置回写书架。 |
| BookContext | 书架、搜索、发现、RSS | bookId、title、author、cover、sourceId、chapter、progress。 | 详情、目录、沉浸阅读、操作底表共享同一本书。 |
| ReaderContext | 沉浸阅读 | bookId、chapterId、progress、sourceId、appearance、ttsState。 | 控制层、目录、外观、朗读、搜索、替换、换源之间不丢阅读位置。 |
| SettingsContext | 设置首页或业务入口 | settingKey、currentValue、pendingValue、permissionState。 | OptionSheet、ConfirmDialog、系统设置返回后仍知道来源设置项。 |
| SourceContext | 发现、书源管理、换源 | sourceId、candidateId、candidateList、detectResult、sourceStatus。 | 换源成功/取消/失败回到阅读，书源管理不变成主 tab。 |

## 逐页规划需求（Per Page Planning Requirements）

| 页面（Page） | Shell | 核心任务（Primary Task） | P0 内容（P0 Content） | P1/P2 内容（P1/P2 Content） | 首要补齐（First Required Closure） |
|---|---|---|---|---|---|
| 书架（Bookshelf） | MainTabShell | 管理并打开已有书籍。 | 我的书架书籍集合、分组、打开书籍、继续阅读动作。 | P1：排序筛选、搜索、最近更新；P2：弱提示和装饰信息。 | 降低继续阅读权重，提升书籍集合密度，明确封面比例和 MainNav inset。 |
| 发现（Discover） | MainTabShell | 浏览推荐和来源内容并进入书籍。 | 推荐书、来源入口、打开详情/加入书架/阅读。 | P1：榜单、分类、刷新；P2：营销式说明。 | 推荐/来源/榜单优先级和来源上下文。 |
| RSS（RSS） | MainTabShell | 查看订阅流并打开条目。 | 订阅条目、未读状态、打开条目。 | P1：筛选、刷新、订阅入口；P2：弱提示。 | 条目打开目标、未读筛选上下文、空态 slot。 |
| 设置首页（Settings Home） | MainTabShell | 进入设置二级页并查看关键状态。 | 设置入口、权限/备份关键提示。 | P1：搜索、更多、概览；P2：版本弱信息。 | 设置二级栈返回和提示覆盖规则。 |
| 书架空状态（Bookshelf Empty） | LibraryShell | 引导用户添加第一本书。 | 搜索、导入、发现入口。 | P1：权限/离线说明；P2：插图。 | MainTab 空态和 Library 空态边界。 |
| 书籍搜索（Book Search） | LibraryShell | 搜索书籍并加入或阅读。 | 搜索框、结果列表、打开详情、加入书架、阅读。 | P1：历史、范围筛选、分组；P2：弱提示。 | 键盘避让和结果列表最后一项可达。 |
| 书籍详情（Book Detail） | LibraryShell | 判断并开始阅读单本书。 | 书籍摘要、来源状态、阅读、目录、加入书架。 | P1：简介、章节预览、来源选择；P2：补充元信息。 | BookContext、阅读/目录/来源返回规则。 |
| 书籍目录（Book Directory） | LibraryShell | 选择章节进入阅读。 | 当前章节、章节列表、打开章节。 | P1：筛选/定位；P2：卷信息。 | ChapterContext、长章节名截断、当前章节定位。 |
| 排序与筛选（Sort and Filter） | LibraryShell | 改变书架列表排序和筛选。 | 排序项、筛选项、应用、重置。 | P1：说明；P2：装饰。 | 确认它是底表还是二级页，并定义回写 LibraryContext。 |
| 书籍操作底表（Book Action Sheet） | LibraryShell | 对单本书执行操作。 | 书籍摘要、编辑/删除/确认。 | P1：辅助操作；P2：弱说明。 | Sheet/Dialog 层级、危险操作文案、焦点顺序。 |
| 分组管理（Group Management） | LibraryShell | 管理书架分组。 | 分组列表、新建、重命名、删除、排序。 | P1：说明；P2：空提示。 | 命名输入键盘避让和删除后书籍去向。 |
| 本地书导入（Local Import） | LibraryShell | 导入本地书籍并处理结果。 | 文件选择、导入进度、结果列表、完成。 | P1：失败重试；P2：格式说明。 | 系统文件选择器边界和失败恢复路径。 |
| 沉浸阅读（Immersive Reading） | ReaderShell | 阅读正文并翻页，承载打开、失败和离线状态。 | 正文、点击热区、阅读进度、返回来源、失败修复。 | P1：页脚信息；P2：弱状态提示。 | 点击热区几何、文字缩放、页脚范围、ReaderContext 初始化和失败恢复。 |
| 阅读控制层（Reader Control Layer） | ReaderShell | 在阅读中打开控制、快捷控制窗和完整控制页。 | 顶部栏、快捷操作、章节进度、四模块导航、亮度、底栏小横条。 | P1：底部读数；P2：背景正文。 | 覆盖层不重置正文，模块按钮 active 不位移，底栏上拉展开不触发页面重载。 |
| 目录与书签（TOC and Bookmarks） | ReaderShell | 选择章节或书签定位阅读。 | 目录/书签列表、打开章节/书签、当前进度。 | P1：搜索、更多；P2：卷说明。 | 面板滚动范围和章节打开后正文定位。 |
| 阅读外观（Reading Appearance） | ReaderShell | 调整阅读显示。 | 字号、行距、段距、字距、无图标纯色主题、字体。 | P1：翻页动画；P2：说明。 | Typography token、主题色块和即时预览边界；完整保存/重置不作为当前快捷窗要求。 |
| 朗读（Read Aloud） | ReaderShell | 控制朗读播放。 | 图标播放/暂停、语速、声音、范围、定时。 | P1：设置入口；P2：状态说明。 | 运行态悬浮反馈和后台状态；快捷窗不展示示例正文。 |
| 阅读设置（Reading Settings） | ReaderShell | 调整阅读行为设置。 | 即时开关、循环值、更多阅读设置入口。 | P1：说明；P2：弱提示。 | 与 SettingsShell 边界和模块内即时反馈。 |
| 自动翻页（Auto Page） | ReaderShell | 启停自动翻页。 | 速度、模式、开始/暂停/继续/停止。 | P1：选项；P2：说明。 | 运行态覆盖规则和停止路径。 |
| 内容搜索（Content Search） | ReaderShell | 在当前书内搜索并定位。 | 搜索框、结果、上一条/下一条、打开结果。 | P1：筛选；P2：提示。 | 键盘避让和结果定位上下文。 |
| 内容替换（Content Replacement） | ReaderShell | 管理当前阅读替换规则。 | 开关、规则列表、编辑、测试、保存。 | P1：临时关闭；P2：说明。 | 输入字段范围、测试反馈、保存和临时关闭区别。 |
| 换源（Source Switch） | FlowShell | 从阅读内换源快捷窗进入完整来源对照并切换阅读来源。 | 当前来源、候选对照、失败原因、切换确认、返回阅读。 | P1：检测状态；P2：说明。 | 候选默认按延迟排序；手机端窗口不与控制层重叠；SourceContext 不丢。 |
| App 通用设置（General Settings） | SettingsShell | 调整通用设置。 | 设置行、选项、恢复确认。 | P1：系统设置入口；P2：说明。 | OptionSheet 几何和恢复确认焦点。 |
| 书架与搜索设置（Bookshelf and Search Settings） | SettingsShell | 调整书架和搜索行为。 | 布局、列数、搜索历史、清空确认。 | P1：预览；P2：说明。 | 书架布局回写契约和清空历史确认。 |
| 隐私与权限（Privacy and Permissions） | SettingsShell | 查看和调整隐私权限。 | 权限状态、系统设置入口、隐私开关、清理确认。 | P1：协议入口；P2：说明。 | 系统设置返回和权限状态 slot。 |
| 缓存管理（Cache Management） | SettingsShell | 查看和清理缓存。 | 缓存占用、分类、清理确认、进度。 | P1：策略切换；P2：位置说明。 | 清理进度状态和分类行文本范围。 |
| 关于与反馈（About and Feedback） | SettingsShell | 查看个人开源项目版本并进入反馈。 | 版本、反馈、源码仓库、开源许可、帮助、更新检查、诊断导出。 | P1：外部链接；P2：贡献说明。 | 外部链接边界、离线状态和诊断导出确认。 |
| 同步与备份（Sync and Backup） | SettingsShell | 备份、恢复和同步设置。 | 备份位置、立即备份、恢复确认、冲突解决。 | P1：自动备份、WebDAV；P2：说明。 | 备份上下文、恢复覆盖确认和进度。 |
| 书源管理（Source Management） | SettingsShell | 管理书源和检测状态。 | 搜索、筛选、启用、检测、编辑、日志。 | P1：分组；P2：说明。 | SourceContext、编辑/日志子状态、检测全量动效。 |

## 首批单页规划卡要求（First Single Page Cards）

30 个正式页面的全量规划卡见 `FRONTEND_PAGE_PLANNING_CARDS.md`，30 页详版字段矩阵见 `FRONTEND_DETAILED_PAGE_PLANNING_CARDS.md`。首批四张代表页的详版规划卡见 `FRONTEND_FIRST_PAGE_PLANNING_CARDS.md`，用于校准所有 Shell 的规则：

| 顺序（Order） | 页面（Page） | 为什么先做（Reason） | 必须填满的规划字段（Required Fields） |
|---:|---|---|---|
| 1 | 书架（Bookshelf） | 当前比例和交互逻辑问题最集中，是 MainTabShell 基准页。 | P0/P1/P2、书籍密度、封面比例、MainNav inset、滚动末项可达。 |
| 2 | 书籍搜索（Book Search） | 覆盖 LibraryShell、搜索输入、键盘避让、结果列表。 | Keyboard owner、结果文本范围、搜索上下文、状态恢复。 |
| 3 | 阅读控制层（Reader Control Layer） | 覆盖 ReaderShell、阅读覆盖层、四模块导航 active、快捷窗和底栏上拉规则。 | Reader overlay、模块按钮尺寸稳定、快捷控制窗、底栏小横条、完整控制页、亮度栏、正文状态保留。 |
| 4 | 换源（Source Switch） | 覆盖 FlowShell 和横向流程。 | 横向断点、步骤/对照/结果区 min/max、切换确认、返回 ReaderContext。 |

## 验收补齐需求（Validation Requirements）

| 验收类型（Validation Type） | 必补内容（Required Content） | 首批验证方式（First Validation Method） |
|---|---|---|
| 结构验收（Structure Validation） | 每页 Shell、slot、fixed/scroll/overlay/state 区域。 | 扩展现有 manifest 和 DOM slot 校验。 |
| 内容优先级验收（Content Priority Validation） | P0 是否优先可见或可滚动完整可见。 | 单页规划卡人工审计，可继续转脚本规则。 |
| 覆盖验收（Overlay Validation） | MainNav、Sheet、Dialog、ReaderOverlay、Keyboard 不遮挡主动作。 | Playwright viewport 截图和 DOM 标记。 |
| 文本验收（Text Validation） | 长标题、长章节名、长设置项、按钮文案不溢出。 | fixture 极值样本和截图走查。 |
| 适配验收（Adaptation Validation） | sm/md/lg、横屏、键盘、大字体、安全区。 | 先在 HTML demo 验证，再映射 Compose preview。 |
| 返回验收（Back Validation） | dialog > sheet > reader panel > page > tab/root。 | 可互动 demo 和 Compose UI test。 |
| 上下文验收（Context Validation） | 切 tab、进阅读、换源、返回设置不丢上下文。 | 事件 payload 和 preview state 守卫。 |

## 开工门禁（Planning Gate）

后续每个页面进入 HTML 调整、互动 demo 或 Compose 实现前，必须满足：

- 已在本文或单页规划卡中有明确核心任务。
- 已标注 P0/P1/P2、可覆盖内容和必须完整展示内容。
- 已确认 owner Shell、owner slot、状态替换 slot 和覆盖宿主。
- 已确认断点、安全区、键盘、文字缩放和返回优先级。
- 已确认需要新增或补齐的 token、组件、上下文和事件。
- 已确认验收方式，不再用“视觉接近截图”作为唯一完成依据。
