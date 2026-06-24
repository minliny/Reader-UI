# 首批页面规划卡（First Page Planning Cards）

本文按 `FRONTEND_PLANNING_REQUIREMENTS_TEMPLATE.md` 的单页规划卡模板，先补齐 4 张代表页：书架、书籍搜索、阅读控制层、换源。它们分别覆盖 `MainTabShell`、`LibraryShell`、`ReaderShell` 和 `FlowShell`，用于校准后续 29 页的规划口径。

## 书架（Bookshelf）

| 字段（Field） | 内容（Content） |
|---|---|
| 页面名称（Page Name） | 书架（Bookshelf） |
| 页面 id（Page ID） | `bookshelf-preview` |
| 输入包路径（Input Package Path） | `docs/ui-design/02-主标签页/书架/frontend-input/` |
| 所属 Shell（Owner Shell） | `MainTabShell` |
| 核心任务（Primary Task） | 展示用户书架中的书籍集合，并让用户快速打开书籍或继续阅读。 |
| P0 内容（P0 Content） | 书籍集合、分组切换、打开书籍、继续阅读动作、当前 tab active 状态。 |
| P1 内容（P1 Content） | 搜索、排序筛选、书架设置、最近更新。 |
| P2 内容（P2 Content） | 弱提示、装饰信息、非核心摘要。 |
| 固定区（Fixed Regions） | `StatusBar`、`AppTopBar`、`MainNav`。 |
| 滚动区（Scrollable Regions） | `ContentRegion` 内的分组、继续阅读、最近更新、书籍集合。 |
| 覆盖区（Overlay Hosts） | `StateHost`；后续排序筛选可进入 `LibraryShell` 或底表宿主。 |
| 状态区（State Hosts） | `default`、`filtering`、`loading`、`empty`。 |
| 可覆盖内容（Coverable Content） | 书籍集合底部过渡空间、弱提示、非核心空白。 |
| 必须完整展示（Must Fully Display） | 最后一项书籍卡片、主导航四按钮、继续阅读动作、空态主动作。 |
| 入口来源（Entry Sources） | 应用启动、主导航 `bookshelf`、导入/加入书架/删除后返回。 |
| 返回路径（Back Path） | 主 tab 根页，不向上返回二级页；从二级页返回时恢复书架上下文。 |
| 上下文字段（Context Fields） | `MainNavContext.currentTab`、`LibraryContext.group`、`sort`、`filter`、`layout`、`selectedBook`。 |
| 事件字段（Event Fields） | `search`、`more`、`groupChange(label)`、`read(book)`、`sortFilter`、`settings`、`openBook(book)`、`navChange(navType)`。 |
| 断点规则（Breakpoint Rules） | `sm` 单栏滚动；`md` 可提高书籍列密度；`lg/xl` 可改为更宽网格或侧向辅助区，但主导航语义不变。 |
| 安全区规则（Safe Area Rules） | `MainNav` 悬浮于内容上方，`ContentRegion` 底部 inset 必须大于等于 `MainNav` 高度加底部安全区。 |
| 键盘规则（Keyboard Rules） | 书架本页不直接弹键盘；搜索进入 `Book Search` 后由 `LibraryShell` 接管键盘避让。 |
| 文本规则（Text Rules） | 书名可两行或按卡片规则截断；作者/章节/进度单行截断；主导航标签单行且 active 不改变字号。 |
| 组件抽象（Componentization） | `BookCover`、`BookCoverCard`、`BookCoverGrid`、`ContinueReadingCard`、`ShelfChipGroup`、`MainNavItem`。 |
| 验收项目（Acceptance Checks） | 书籍集合密度优先于继续阅读卡片；封面不错误裁切；最后一本书可滚到 `MainNav` 上方完整点击；active 只改变背景、图标色、文字色。 |

### 书架比例决策（Bookshelf Proportion Decision）

- 继续阅读（Continue Reading）是 P1 快捷入口，不是页面主内容；它不能占据过多首屏高度。
- 我的书架（Bookshelf Collection）是 P0 核心内容；首屏必须尽量展示更多书籍。
- 书籍封面（Book Cover）必须保留可识别比例，不允许为填充卡片而裁切关键内容。
- 书籍集合不强制两列；列数由可用宽度、封面最小可读尺寸和滚动密度共同决定。

## 书籍搜索（Book Search）

| 字段（Field） | 内容（Content） |
|---|---|
| 页面名称（Page Name） | 书籍搜索（Book Search） |
| 页面 id（Page ID） | `book-search-preview` |
| 输入包路径（Input Package Path） | `docs/ui-design/03-书架链路/书籍搜索/frontend-input/` |
| 所属 Shell（Owner Shell） | `LibraryShell` |
| 核心任务（Primary Task） | 输入关键词搜索书籍，并打开详情、加入书架或直接阅读。 |
| P0 内容（P0 Content） | 搜索框、提交动作、结果列表、打开详情、加入书架、阅读动作。 |
| P1 内容（P1 Content） | 搜索范围、本地/网络/全局/分组筛选、搜索历史。 |
| P2 内容（P2 Content） | 分组说明、弱提示、空态补充说明。 |
| 固定区（Fixed Regions） | `BackTopBar`、底部 `BottomActionHost` 搜索按钮。 |
| 滚动区（Scrollable Regions） | 搜索范围、分组、历史、结果列表、状态反馈。 |
| 覆盖区（Overlay Hosts） | `StateHost`、后续分组选择/权限说明可进入 `SheetHost` 或 `DialogHost`。 |
| 状态区（State Hosts） | `default`、`results`、`loading`、`empty`、`error`、`offline`、`permission`。 |
| 可覆盖内容（Coverable Content） | 结果列表底部过渡区、历史列表尾部、弱提示。 |
| 必须完整展示（Must Fully Display） | 聚焦搜索框、键盘上方的提交动作、最后一个结果项、错误重试、权限授权动作。 |
| 入口来源（Entry Sources） | 书架搜索、书架空状态主动作、发现搜索入口。 |
| 返回路径（Back Path） | 返回来源页，保留来源页的 tab、分组、筛选和滚动位置。 |
| 上下文字段（Context Fields） | `LibraryContext.query`、`scope`、`group`、`sourceEntry`、`BookContext` for selected result。 |
| 事件字段（Event Fields） | `back`、`more`、`queryChange(value)`、`clearQuery`、`scopeChange(scopeType)`、`groupChange(label)`、`historySelect(label)`、`clearHistory`、`submitSearch`、`openDetail(result)`、`addToBookshelf(result)`、`read(result)`、`retry`、`requestPermission`。 |
| 断点规则（Breakpoint Rules） | `sm` 单栏；`md` 可把筛选和结果分为上下密集区；`lg/xl` 可采用左筛选右结果，但返回和上下文不变。 |
| 安全区规则（Safe Area Rules） | `BackTopBar` 避让顶部安全区；结果列表底部 inset 必须避让 `BottomActionHost` 和底部安全区。 |
| 键盘规则（Keyboard Rules） | `ContentRegion` 滚动，`BottomActionHost` 跟随键盘或由键盘上方确认动作替代；聚焦输入框、错误提示和提交动作必须同时可见。 |
| 文本规则（Text Rules） | 搜索结果书名最多两行；作者、来源、章节、状态单行截断；按钮文案完整显示。 |
| 组件抽象（Componentization） | `SearchBar`、`FilterChip`、`GroupRow`、`SearchResultItem`、`PrimaryActionButton`、`StateHost`。 |
| 验收项目（Acceptance Checks） | 键盘弹出不遮挡搜索框和提交动作；结果末项可达；权限/离线/错误态保留恢复路径；事件 payload 不丢 result。 |

## 阅读控制层（Reader Control Layer）

| 字段（Field） | 内容（Content） |
|---|---|
| 页面名称（Page Name） | 阅读控制层（Reader Control Layer） |
| 页面 id（Page ID） | `reader-control-preview` |
| 输入包路径（Input Package Path） | `docs/ui-design/04-阅读链路/阅读控制层/frontend-input/` |
| 所属 Shell（Owner Shell） | `ReaderShell` |
| 核心任务（Primary Task） | 在不离开阅读上下文的前提下打开阅读控制、切换章节、进入阅读模块。 |
| P0 内容（P0 Content） | `ReadingSurface`、顶部阅读控制、章节进度、四模块导航、正文位置保留。 |
| P1 内容（P1 Content） | 搜索/自动翻页/替换快捷操作、亮度栏、底部读数。 |
| P2 内容（P2 Content） | 背景正文中被覆盖的过渡段落和弱说明。 |
| 固定区（Fixed Regions） | `ReadingSurface` 底层、`ReaderOverlayHost`、`ReaderModuleNav`、底部读数。 |
| 滚动区（Scrollable Regions） | 阅读正文由阅读器排版控制；面板内容在 `BottomSheetHost` 内滚动。 |
| 覆盖区（Overlay Hosts） | `ReaderOverlayHost`、`BottomSheetHost`、`ReaderStateHost`。 |
| 状态区（State Hosts） | `default`、`directory`、`tts`、`appearance`、`settings`。 |
| 可覆盖内容（Coverable Content） | 正文顶部/底部过渡区域、非当前阅读重点段落。 |
| 必须完整展示（Must Fully Display） | 返回、换源、章节进度操作、四模块按钮、底部面板主动作、阅读错误恢复动作。 |
| 入口来源（Entry Sources） | 沉浸阅读中心点击、阅读模块返回、打开书籍或章节后进入沉浸阅读。 |
| 返回路径（Back Path） | 点击正文中部关闭控制层回到沉浸阅读；重复点击当前 active 模块按钮回到默认阅读控制层；顶部返回退出 ReaderShell 回到进入阅读前的页面；换源进入 `FlowShell` 后可回到当前 ReaderContext。 |
| 上下文字段（Context Fields） | `ReaderContext.bookId`、`chapterId`、`progress`、`sourceId`、`appearance`、`ttsState`。 |
| 事件字段（Event Fields） | `back`、`sourceChange`、`more`、`quickAction(actionType)`、`chapterChange(direction)`、`progressChange(value)`、`moduleChange(moduleType)`、`brightnessChange(value)`。 |
| 断点规则（Breakpoint Rules） | `sm` 竖屏覆盖层；`md` 可加宽底部面板；`lg/xl` 可让目录/设置面板更宽，但不改变阅读正文状态。 |
| 安全区规则（Safe Area Rules） | 顶部阅读栏避让状态栏；`ReaderModuleNav` 和底部面板避让底部安全区；覆盖层不改变正文布局计算。 |
| 键盘规则（Keyboard Rules） | 默认控制层不弹键盘；搜索和替换快捷操作进入对应模块后由模块面板接管键盘避让。 |
| 文本规则（Text Rules） | 书名和来源行单行截断；模块标签单行；章节标题可两行或在进度卡内截断；正文不因覆盖层截断。 |
| 组件抽象（Componentization） | `ReadingSurface`、`ReaderTopBar`、`QuickAction`、`ChapterProgressCard`、`BrightnessSlider`、`ReaderModuleButton`、`ReaderPanel`。 |
| 验收项目（Acceptance Checks） | 四模块按钮 active 后只改变背景、图标颜色和文字颜色，尺寸、间距、相对位置不变；重复点击当前 active 模块关闭模块面板；切换模块不重置正文位置；亮度栏不长期遮挡主阅读区域。 |

### 四模块按钮固定规则（Reader Module Button Fixed Rule）

- 目录、朗读、界面、设置四个按钮必须等宽。
- active 状态不得改变按钮宽高、图标壳尺寸、图标位置、文字位置、列间距。
- active 状态只能改变背景深浅、中心图标颜色和下方文字颜色。
- 触发模块后，底部面板和模块导航的相对关系稳定，不通过位移表达选中。
- 重复点击当前 active 模块按钮必须退出模块面板并回到默认阅读控制层。

## 换源（Source Switch）

| 字段（Field） | 内容（Content） |
|---|---|
| 页面名称（Page Name） | 换源（Source Switch） |
| 页面 id（Page ID） | `source-switch-preview` |
| 输入包路径（Input Package Path） | `docs/ui-design/04-阅读链路/换源/frontend-input/` |
| 所属 Shell（Owner Shell） | `FlowShell` |
| 核心任务（Primary Task） | 在阅读上下文中对照候选来源，检测可用性并切换来源。 |
| P0 内容（P0 Content） | 当前来源、候选来源、检测状态、切换确认、返回阅读。 |
| P1 内容（P1 Content） | 筛选、重新检测、来源底表、状态摘要。 |
| P2 内容（P2 Content） | 流程说明、弱提示、非关键来源元信息。 |
| 固定区（Fixed Regions） | `flowFrame`、`stepRegion`、`comparisonRegion`、`resultRegion`、`stateHost`。 |
| 滚动区（Scrollable Regions） | 候选来源列表和对照区域可滚动；结果区主确认尽量固定可见。 |
| 覆盖区（Overlay Hosts） | `stateHost` 只展示状态摘要；后续来源选择可由 Flow 内 sheet 或 Reader 来源面板承载。 |
| 状态区（State Hosts） | `default`、`loading`、`empty`、`error`、`offline`、`permission`。 |
| 可覆盖内容（Coverable Content） | 候选列表的非当前项、弱说明、背景过渡区。 |
| 必须完整展示（Must Fully Display） | 切换确认按钮、返回阅读、当前来源、当前检测结果、错误重试/权限授权。 |
| 入口来源（Entry Sources） | 阅读控制层 `sourceChange`、阅读打开失败修复、阅读中来源选择。 |
| 返回路径（Back Path） | 取消、返回、成功、失败都回到 `ReaderShell`，并保留书籍、章节、进度和来源状态。 |
| 上下文字段（Context Fields） | `ReaderContext.bookId`、`chapterId`、`progress`、`sourceId`；`SourceContext.candidateId`、`candidateList`、`detectResult`。 |
| 事件字段（Event Fields） | `backToReading`、`openSourceSheet`、`filterChange(filter)`、`startDetect`、`cancelDetect`、`switchSource(source)`、`retry`、`grantPermission`。 |
| 断点规则（Breakpoint Rules） | 默认横向 `1690 x 931`；`md/lg/xl` 使用步骤/对照/结果三块区域；窄屏降级为纵向分步流程但仍属于 FlowShell。 |
| 安全区规则（Safe Area Rules） | 横向画布避让左右安全区和系统手势区；结果确认区不得贴近危险边缘。 |
| 键盘规则（Keyboard Rules） | 默认无键盘；筛选输入出现时，候选列表滚动，结果确认保持可达或在键盘上方重排。 |
| 文本规则（Text Rules） | 来源名单行截断；章节、延迟、状态短说明单行或两行；切换按钮文案完整显示。 |
| 组件抽象（Componentization） | `SourceCandidateRow`、`CurrentSourceBadge`、`DetectStatusBadge`、`SwitchSourceButton`、`FlowStateSummary`。 |
| 验收项目（Acceptance Checks） | `stateHost` 有真实内容但不遮挡 `ResultRegion` 主确认；检测中可取消；切换成功保留阅读位置；Flow 不进入主导航。 |

## 批量推广规则（Rollout Rules）

首批 4 张规划卡通过审计后，再按以下顺序推广到其余页面：

1. 主标签页（Main Tabs）：发现、RSS、设置首页。
2. 书架链路（Library Flow）：书籍详情、目录、排序筛选、操作底表、分组、本地导入。
3. 阅读链路（Reader Flow）：沉浸阅读、目录与书签、外观、朗读、设置、自动翻页、内容搜索、内容替换。
4. 设置链路（Settings Flow）：App 通用设置、书架与搜索设置、隐私权限、缓存、关于反馈、同步备份、书源管理。

推广时不得复制视觉块；只能复制 Shell、slot、覆盖、上下文、状态事件和验收规则。

29 个正式页面的推广结果见 `FRONTEND_DETAILED_PAGE_PLANNING_CARDS.md`。本文继续作为四个 Shell 代表页的单页填写样板保留。
