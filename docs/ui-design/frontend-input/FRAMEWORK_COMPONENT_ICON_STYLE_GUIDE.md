# UI 框架、组件、图标与风格总规划（UI Framework, Components, Icons, and Style Master Plan）

## 文档定位（Document Purpose）

本文档用于保存当前 UI 设计稿的全局规划结论（global planning conclusions），并作为后续 Figma Design 整理、前端 Demo 开发、组件库补齐和人工审计的统一依据。

命名格式（Naming Format）：后续新增或重写的文档条目统一使用 `中文名称（English Name）`。本地 HTML 文件角色和文档准入规则以 `HTML_FILE_REQUIREMENTS.md` 为准。UI 图、封面和图标 token 以 `asset-library/ASSET_LIBRARY.md` 和 `asset-library/icons.js` 为统一素材库来源。

页面框架本地来源（Local page shell source）：`docs/ui-design/frontend-input/shared-shell-kit/kit.js`。前端 demo 入口（Frontend demo entry）：`frontend-demo/index.html`；顶层 `UI设计图.png` 由该本地 demo 生成，根目录 `frontend-demo/` 是当前视觉源头。

本文档只基于本地资料（local sources）整理，不依赖当前 Figma 文件状态：

- 本地高保真规范（Local high-fidelity spec）：`/Users/minliny/Downloads/阅读器App_UI高保真设计规范_v2.md`
- 本地 UI 设计图（Local UI screenshots）：`docs/ui-design/**/UI设计图.png`
- 页面框架文档（Page framework docs）：`docs/ui-design/frontend-input/PAGE_FRAMEWORK_ARCHITECTURE.md`
- 页面框架审计（Page framework audit）：`docs/ui-design/frontend-input/PAGE_FRAMEWORK_AUDIT.md`
- 公共组件库文档（Shared component library docs）：`docs/ui-design/frontend-input/component-library/COMPONENT_LIBRARY.md`
- 设计 Token 与样式文件（Design tokens and style files）：`docs/ui-design/frontend-input/tokens.css`、`docs/ui-design/frontend-input/component-library/library.css`

## 总体原则（Overall Principles）

| 中文（Chinese） | English | 约束（Rule） |
| --- | --- | --- |
| 框架化 | Shellization | 只抽页面骨架，包括状态栏、顶部栏、内容区、底部导航、弹层宿主和状态宿主。 |
| 组件化 | Componentization | 只抽可复用 UI 单元，包括按钮、搜索框、列表行、卡片、滑杆、开关和弹窗。 |
| 页面内容 | Page Content | 业务内容只作为数据和页面 slot 渲染，不强行抽成巨大通用组件。 |
| 视觉分支 | Visual Scheme | 保留 BlueEditorial、ForestUtility、Reader 三套视觉分支，不跨分支混用。 |
| 图标语义 | Icon Semantics | 图标先按语义命名，再映射到具体矢量图形；禁止临场手画无法复用的图标。 |
| 状态稳定 | State Stability | selected、pressed、focused、disabled、loading 等状态不得改变控件尺寸和相对位置。 |

## 页面框架（Page Shells）

| 中文名称（Chinese Name） | English Name | 适用页面（Applicable Pages） | 固定结构（Fixed Structure） | 可变内容（Variable Slots） |
| --- | --- | --- | --- | --- |
| 主标签页框架 | MainTabShell | 书架、发现、RSS、设置（Bookshelf, Discover, RSS, Settings） | 手机画布、状态栏、顶部栏、内容区、底部四栏导航、状态容器（App frame, status bar, top bar, content region, bottom navigation, state host） | 当前 Tab、页面标题、搜索入口、列表/卡片内容、状态内容（active tab, title, search entry, page content, state content） |
| 书架链路框架 | LibraryShell | 书架空状态、书籍搜索、书籍详情、书籍目录、排序筛选、书籍操作底表、分组管理、本地书导入（library empty, book search, book detail, directory, sort/filter, action sheet, group management, local import） | 返回顶栏、内容区、底部操作区、底表宿主、弹窗宿主、状态容器（back top bar, content region, bottom action host, sheet host, dialog host, state host） | 书籍上下文、搜索控件、章节列表、分组列表、导入流程、底表内容（book context, search controls, chapter list, group list, import flow, sheet content） |
| 阅读器框架 | ReaderShell | 阅读入口、阅读控制层、目录与书签、阅读外观、朗读、阅读设置、自动翻页、内容搜索、内容替换、沉浸阅读（reading entry, reader controls, TOC/bookmarks, appearance, TTS, settings, auto page, in-book search, replacement, immersive reading） | 阅读正文底层、阅读覆盖层、模块导航、底表宿主、阅读状态容器（reading surface, overlay host, module navigation, bottom sheet host, reader state host） | 当前模块面板、正文内容、搜索/替换/自动翻页业务内容（module panel, reading text, search/replacement/auto-page content） |
| 设置页框架 | SettingsShell | App 通用设置、书架与搜索设置、隐私与权限、缓存管理、关于与反馈、同步与备份、书源管理（general settings, bookshelf/search settings, privacy/permissions, cache, about/feedback, sync/backup, source management） | 返回顶栏、设置内容区、设置分组、提示宿主、弹窗宿主、状态容器（back top bar, settings content, setting sections, toast host, dialog host, state host） | 设置组、权限状态、缓存数据、备份记录、书源列表（setting groups, permission state, cache data, backup records, source list） |
| 横向流程框架 | FlowShell | 换源（source switching） | 横向画布、步骤区、对照区、结果区、状态区（landscape frame, step region, comparison region, result region, state host） | 来源候选、检测状态、切换结果（source candidates, detection state, switch result） |

## 组件边界（Component Boundaries）

### 必须组件化（Must Be Componentized）

| 分类（Category） | 中文名称（Chinese Name） | English Name | 说明（Notes） |
| --- | --- | --- | --- |
| 基础外壳 | 手机画布 | AppFrame | 固定页面尺寸、安全区、背景和裁切规则。 |
| 基础外壳 | 状态栏 | StatusBar | 支持 Android 10:30、Compact 9:41、Reader Minimal 三种 profile。 |
| 基础外壳 | 顶部栏 | AppTopBar / BackTopBar / ReaderTopBar | 主标签、二级页、阅读器分别使用不同 variant。 |
| 导航 | 底部导航 | MainNav / MainNavItem | 固定四项：书架、发现、RSS、设置（Bookshelf, Discover, RSS, Settings）。 |
| 控件 | 图标按钮 | IconButton | 返回、关闭、搜索、更多、排序、设置等动作统一命中区。 |
| 控件 | 搜索入口 | SearchEntry | 主页面只读入口。 |
| 控件 | 搜索输入框 | SearchBar / SearchInput | 搜索页和阅读覆盖层使用不同尺寸 variant。 |
| 控件 | 胶囊筛选 | Chip / FilterChip | 支持 single、multi、selected、disabled。 |
| 控件 | 分段控件 | SegmentControl / SegmentTab | 用于搜索范围、目录/书签、外观设置等。 |
| 控件 | 开关 | Switch | 必须自定义尺寸和颜色，不使用默认 Material 外观。 |
| 控件 | 输入框 | TextField / PatternInput | 设置页、分组命名、内容替换规则使用。 |
| 控件 | 进度条 | ProgressBar | 书籍进度、阅读百分比。 |
| 控件 | 滑杆 | ProgressSlider / BrightnessSlider / SpeedSlider | 章节进度、亮度、自动翻页速度。 |
| 控件 | 主按钮 | PrimaryActionButton | 导入、搜索、开始阅读、开始自动翻页。 |
| 控件 | 次按钮 | SecondaryActionButton / TextActionButton | 取消、管理、换个分组等低权重动作。 |
| 卡片与行 | 书籍封面 | BookCover | 只有书封允许使用位图，其他 UI 必须可编辑。 |
| 卡片与行 | 书籍卡片 | BookCard | 书架封面网格、详情和阅读打开动作复用。 |
| 卡片与行 | 书籍列表行 | BookRow | 书架列表、搜索结果、书源结果复用。 |
| 卡片与行 | 章节行 | ChapterRow / CurrentChapterRow | 完整目录、章节预览、阅读目录面板复用。 |
| 卡片与行 | 设置分组卡 | SettingGroupCard | 设置二级页和阅读设置复用。 |
| 卡片与行 | 设置行 | SettingRow / SelectRow | 设置页所有行项统一结构。 |
| 弹层 | 底表 | BottomSheet | 书籍操作、排序筛选、阅读搜索、内容替换、自动翻页复用外壳。 |
| 弹层 | 确认弹窗 | ConfirmDialog | 危险操作必须二次确认。 |
| 状态 | 加载状态 | LoadingState | 替换内容区，不替换整页框架。 |
| 状态 | 空状态 | EmptyState | 必须说明原因和主行动作。 |
| 状态 | 错误状态 | ErrorState | 必须保留返回入口和重试动作。 |
| 状态 | 权限状态 | PermissionState | 必须说明权限用途和系统设置入口。 |

### 不应组件化（Should Not Be Componentized）

| 中文（Chinese） | English | 原因（Reason） |
| --- | --- | --- |
| 整屏截图 | Full-screen screenshot | 只能作为参考层或验收层，不能作为最终 UI。 |
| 阅读正文具体内容 | Actual reading text content | 属于数据内容，组件只定义段落样式和排版规则。 |
| 书籍详情完整 Hero 组合 | Full book detail hero composition | 应拆成封面、标题、来源、按钮和章节预览，不抽整块巨大组件。 |
| 发现页整页内容 | Full Discover page content | 应拆成来源控件、结果行、榜单行和状态条。 |
| 设置页整页内容 | Full Settings page content | 应通过 SettingsShell + SettingGroupCard + SettingRow 渲染。 |
| 换源横向整屏流程 | Full landscape source-switching flow | 应归入 FlowShell 特例，不作为普通 Reader 组件。 |
| 混合风格组件 | Mixed-scheme component | BlueEditorial、ForestUtility、Reader 不得混合成一套模糊视觉。 |

## 阅读控制层（Reader Control Layer）

阅读控制层（Reader Control Layer）必须归入阅读器框架（ReaderShell），不是普通详情页框架（LibraryShell），也不是主标签页框架（MainTabShell）。

| 中文（Chinese） | English | 归类（Classification） | 规则（Rule） |
| --- | --- | --- | --- |
| 阅读正文底层 | Reading Surface | 框架化（Shellized） | 显示正文、纸张背景和点击热区。 |
| 顶部阅读控制栏 | Reader Top Bar | 组件化（Componentized） | 返回、书名、来源/章节、换源、更多。 |
| 底部控制面板 | Bottom Control Panel | 框架化 + 组件化（Shellized + Componentized） | 外壳固定，内部按 default、toc、tts、appearance、settings 切换。 |
| 右侧亮度栏 | Brightness Rail | 组件化（Componentized） | 亮度标题、太阳图标、纵向滑杆、系统按钮。 |
| 模块导航 | Reader Module Navigation | 组件化（Componentized） | 四项固定：目录、朗读、界面、设置（TOC, TTS, Appearance, Settings）。 |
| 快捷操作 | Quick Actions | 组件化（Componentized） | 三项固定：搜索、自动翻页、替换（Search, Auto Page, Replacement）。 |
| 主题色块 | Theme Swatch | 非图标控件（Non-icon Control） | 色块只表达阅读背景 / 文字对比和选中态；不得在色块内放 check、moon、leaf、text 或其他图标。 |

四个模块按钮交互（Four module button interaction）：

- 选中后背景加深（selected background becomes darker）。
- 中间图标颜色反转（center icon color is inverted）。
- 下方文字颜色变化（label color changes）。
- 按钮尺寸不变（button size stays fixed）。
- 按钮间距不变（spacing stays fixed）。
- 相对位置不变（relative position stays stable）。
- 重复点击当前 active 模块关闭模块面板并回到默认阅读控制层（re-clicking the active module closes the panel and returns to the default reader control layer）。

## 图标体系（Icon System）

### 图标总规则（General Icon Rules）

| 中文（Chinese） | English | 规则（Rule） |
| --- | --- | --- |
| 语义命名 | Semantic naming | 图标名表达动作或对象，不表达页面临时样式。 |
| 统一线性风格 | Unified outline style | 默认使用线性图标，`fill: none`，`stroke: currentColor`，圆角端点和圆角连接。 |
| 尺寸可变 | Size variants | 顶栏、底栏、卡片、设置行、状态反馈使用不同视觉尺寸，但命中区不低于 48 dp。 |
| 颜色继承 | Color inheritance | 默认继承文本色或 scheme 主色，selected/active 通过父容器状态改变颜色。 |
| 不现场手画 | No one-off drawing | 页面内不得临时绘制不可复用 SVG；必须回流到图标语义表或公共组件库。 |
| 不用 emoji 替代 | No emoji substitution | 功能图标不能用 emoji 代替，状态装饰符号必须单独评估。 |

### 图标规格（Icon Specs）

| 场景（Scenario） | 中文名称（Chinese Name） | English Name | 视觉尺寸（Visual Size） | 命中区（Hit Area） | 颜色规则（Color Rule） |
| --- | --- | --- | ---: | ---: | --- |
| 顶部动作 | 顶部图标按钮 | Top Icon Button | 24-28 dp | 48 dp | 默认 `neutral.icon`，active 使用当前 scheme 主色。 |
| 主导航 | 底部导航图标 | Bottom Nav Icon | 24-26 dp | 等分导航项 | 选中仅改变图标和文字颜色，不加整列大背景。 |
| 阅读模块 | 阅读模块图标 | Reader Module Icon | 22-26 dp | 44-52 dp | selected 时图标反色，容器加深，位置不变。 |
| 快捷操作 | 阅读快捷图标 | Reader Quick Icon | 24 dp | 48 dp | 默认 Reader 蓝灰，pressed / selected 只改图标色和文字色，不改变背景、尺寸或位置。 |
| 设置行 | 设置行图标 | Settings Row Icon | 22-28 dp | 48 dp | 普通项继承文本色，危险项使用 danger。 |
| 状态反馈 | 状态反馈图标 | State Feedback Icon | 28-44 dp | 不单独点击 | good/warn/danger/info 按语义色。 |
| 系统状态 | 系统状态图标 | System Status Icon | 14-16 dp | 不可点击 | 仅用于 QA 参考，生产端由系统管理。 |

### 图标光学校准（Icon Optical Calibration）

| 中文名称（Chinese Name） | English Name | 外框尺寸（Frame Size） | 图形占比（Optical Fill） | 规则（Rule） |
| --- | --- | ---: | ---: | --- |
| 小图标 | Small Icon | 20 dp | 15-18 dp | 用于列表行、辅助信息、章节状态、行尾标识。 |
| 常规图标 | Regular Icon | 24 dp | 18-21 dp | 用于顶部按钮、阅读快捷操作、底部导航和常规动作。 |
| 中号图标 | Medium Icon | 28 dp | 21-24 dp | 只用于卡片、状态块或需要更高识别度的非密集区域。 |
| 大状态图标 | State Icon | 36-44 dp | 28-36 dp | 只用于空状态、错误状态和状态反馈，不进入工具栏。 |

光学校准（optical calibration）优先级高于原始 SVG viewBox：

- 圆形、放大镜、双箭头这类几何图标不得顶满外框，常规图标的图形主体应控制在外框的 75%-86%。
- 宽图标或实心路径图标必须在 SVG viewBox 内留出额外内边距，不能只依赖 CSS `width / height`。
- 同一工具栏内的图标必须以“视觉重量”统一，不以 SVG 源图实际边界统一。
- 从 image2、Figma 或截图抠图并用 `potrace` 转成 SVG 后，必须重新检查光学占比；如果图形偏大，优先扩大 viewBox 留白，不改变按钮尺寸。
- 点击 / 选中 / 反色状态不得改变图标外框尺寸、图形占比、相对位置或文字位置。

### 图标语义清单（Icon Semantic Inventory）

| 中文语义（Chinese Semantics） | English Semantics | 当前标识（Current IDs） | 主要使用位置（Primary Usage） |
| --- | --- | --- | --- |
| 返回、关闭、清空 | back, close, clear | `back`, `close`, `clear` | 顶部栏、搜索框、弹层。 |
| 搜索、更多、菜单 | search, more, menu | `search`, `more`, `menu` | 主标签页、书架、发现、搜索页、顶栏动作。 |
| 书架、发现、RSS、设置 | bookshelf, discover, RSS, settings | `bookshelf`, `discover`, `rss`, `settings`, `gear` | 底部主导航和设置入口。 |
| 书籍、打开书籍、目录 | book, open book, directory | `book`, `book-open`, `directory`, `list` | 书架、目录、详情、设置概览。 |
| 章节、书签、进度 | chapter, bookmark, progress | `bookmark`, `progress`, `progressPie`, `clock` | 阅读目录、自动翻页、阅读设置。 |
| 朗读、播放、暂停、声音 | TTS, play, pause, sound | `tts`, `play`, `pause`, `sound`, `volume` | 阅读控制层、朗读页、自动翻页选项。 |
| 外观、字体、主题 | appearance, font, theme | `appearance`, `font`, `palette`, `text`, `typo`, `sun` | 阅读外观、阅读控制层、亮度栏。 |
| 自动翻页、继续、切换 | auto page, continue, switch | `continue`, `switch`, `swap`, `refresh` | 自动翻页、换源、继续阅读。 |
| 来源、书源、同步 | source, source stack, sync | `source`, `source-stack`, `sync`, `cloud` | 发现页、换源、书源管理、同步备份。 |
| 文件、文件夹、导入导出 | file, folder, import/export | `file`, `folder`, `upload`, `download` | 本地书导入、同步备份、缓存管理、权限。 |
| 存储、数据库、缓存 | storage, database, cache | `storage`, `database` | 设置首页、缓存管理。 |
| 权限、安全、隐私 | permission, security, privacy | `shield`, `eyeOff` | 隐私权限、内容替换、防误操作说明。 |
| 通知、电池、网络 | notification, battery, network | `bell`, `battery`, `globe`, `wifi`, `signal` | 权限页、状态栏、通用设置。 |
| 状态：成功、警告、错误 | status: success, warning, error | `check`, `warning`, `warn`, `retry`, `empty`, `offline` | 状态反馈、书源检测、导入结果。 |
| 编辑、删除、日志、信息 | edit, delete, log, info | `edit`, `trash`, `log`, `info` | 书籍操作、分组管理、书源管理、关于页。 |
| 布局：网格、列表、列 | layout: grid, list, columns | `grid`, `list`, `columns` | 书架展示、设置选项、排序筛选。 |
| 辅助、手势、设备 | assist, gesture, device | `assist`, `gesture`, `phone`, `monitor`, `motion` | 阅读设置、通用设置。 |
| 消息、链接、邮件 | message, link, mail | `message`, `link`, `mail` | RSS、关于反馈、反馈入口。 |

### 图标回流规则（Icon Backflow Rules）

新增图标（new icon）必须按以下顺序处理：

1. 先确认是否已有语义图标（check existing semantic icon）。
2. 如果只是尺寸或状态不同，新增 variant，不新增图标名（add variant, not new icon name）。
3. 如果是新语义，加入本文 `图标语义清单（Icon Semantic Inventory）`。
4. 同步到公共组件库（sync to shared component library）。
5. 页面只引用图标 ID 或组件实例（page references only icon ID or component instance）。

## UI 风格体系（UI Style System）

### 视觉分支（Visual Schemes）

| 中文名称（Chinese Name） | English Name | 适用页面（Applicable Pages） | 字体（Typography） | 色彩（Color） | 质感（Texture） |
| --- | --- | --- | --- | --- | --- |
| 蓝色编辑风 | BlueEditorial | 主产品、发现、封面书架、设置首页、搜索、书籍详情、目录（main product, discover, cover bookshelf, settings home, search, book detail, directory） | 中文衬线为主，标题、书名、正文和多数 UI 文案使用 serif（serif-first Chinese typography） | 暖白纸张 + 低饱和蓝（warm paper + muted blue） | 柔和卡片阴影、暖纸背景、低对比描边。 |
| 森林工具风 | ForestUtility | 列表书架、书籍操作底表、排序筛选、分组管理、新建分组弹窗（compact bookshelf, book action sheet, sort/filter, group management, group dialog） | 无衬线中文（sans-serif Chinese typography） | 暖白实体面 + 森林绿（warm surface + forest green） | 弱阴影、细描边、中性暗色遮罩。 |
| 阅读器风 | Reader | 沉浸阅读、阅读控制层、目录与书签、朗读、阅读外观、阅读设置、内容搜索、内容替换、自动翻页（immersive reading, reader controls, TOC/bookmarks, TTS, appearance, settings, search, replacement, auto page） | 正文使用阅读字体，控制层可使用更克制的 UI 字体（reading type for content, restrained UI type for controls） | 更暖纸张 + Reader 蓝（warmer paper + reader blue） | 浮动顶栏、浮动控制面板、弱信息、纸张柔光。 |

### 色彩规则（Color Rules）

| 中文（Chinese） | English | 规则（Rule） |
| --- | --- | --- |
| 暖白背景 | Warm paper background | 主背景使用暖白纸张，不使用纯白或冷灰。 |
| 低饱和蓝 | Muted blue | 不把所有蓝色压成一个高饱和蓝；发现、书架、目录、搜索、Reader 各有语义蓝。 |
| 森林绿隔离 | Isolated forest green | ForestUtility 只用于书架管理流，不进入 BlueEditorial 或 Reader。 |
| 危险色一致 | Consistent danger color | 删除、清空、恢复覆盖等危险操作统一 danger 色和二次确认。 |
| 选中态不位移 | Stable selected state | selected 只改颜色、背景、描边或图标反色，不改变布局尺寸。 |

### 字体规则（Typography Rules）

| 中文（Chinese） | English | 规则（Rule） |
| --- | --- | --- |
| BlueEditorial 衬线 | BlueEditorial serif | 页面标题、书名、正文、重要 UI 文案优先使用中文衬线。 |
| ForestUtility 无衬线 | ForestUtility sans-serif | 列表书架和工具流使用无衬线，不混入宋体风格。 |
| Reader 正文 | Reader body text | 正文 18/36 左右，段间距明确，弱信息不抢正文。 |
| 设置链路 | Settings pages | 设置二级页以清晰可读为优先，行标题、副标题和值保持层级稳定。 |
| 不横向压缩 | No horizontal squashing | 标题和底部导航标签不允许横向压缩变形。 |

### 几何规则（Geometry Rules）

| 中文（Chinese） | English | 规则（Rule） |
| --- | --- | --- |
| 基准宽度 | Base width | Production 使用 420 dp 宽度，QA 使用原图 50% 精确尺寸。 |
| 栅格 | Grid | 2 dp 微栅格、4 dp 组件栅格、8 dp 主布局栅格。 |
| 常规边距 | Common margin | 普通页面左右 14-18 dp，阅读正文 34-36 dp。 |
| 触控命中区 | Touch target | 视觉图标可以小于 48 dp，但命中区不低于 48 x 48 dp。 |
| 圆角 | Radius | 卡片、底栏、底表、弹窗分别使用不同圆角层级，不能全部统一成一个值。 |
| 列表滚动 | Scroll viewport | 章节、搜索结果、设置项和 Sheet 内容溢出时使用内部滚动，不撑破屏幕。 |

### 状态规则（State Rules）

| 中文状态（Chinese State） | English State | 视觉规则（Visual Rule） |
| --- | --- | --- |
| 默认 | Default | 使用语义 token 原值。 |
| 按下 | Pressed | 黑色 5-7% 覆盖或 Scale 0.98，100 ms 左右。 |
| 选中 | Selected | 使用 scheme 主色或浅容器，不改变控件尺寸。 |
| 聚焦 | Focused | 2 dp 主色描边或外扩 focus ring。 |
| 禁用 | Disabled | 38% 不透明度，移除点击。 |
| 加载 | Loading | 保持原尺寸，替换内容或显示骨架。 |
| 错误 | Error | 使用危险色和说明文案，不改变页面框架。 |
| 权限 | Permission | 说明用途，提供去设置入口，不进入空白页。 |

## 页面到风格映射（Page-to-Style Mapping）

| 页面组（Page Group） | 中文页面（Chinese Pages） | English Pages | 框架（Shell） | 风格（Style） |
| --- | --- | --- | --- | --- |
| 主标签页 | 书架、发现、RSS、设置 | Bookshelf, Discover, RSS, Settings | 主标签页框架（MainTabShell） | 蓝色编辑风（BlueEditorial） |
| 书架链路 | 书架空状态、书籍搜索、书籍详情、书籍目录、本地书导入 | Library empty, book search, book detail, directory, local import | 书架链路框架（LibraryShell） | 蓝色编辑风（BlueEditorial） |
| 书架工具流 | 书籍操作底表、排序筛选、分组管理 | Book action sheet, sort/filter, group management | 书架链路框架（LibraryShell） | 森林工具风（ForestUtility） |
| 阅读链路 | 阅读控制层、目录与书签、阅读外观、朗读、阅读设置、自动翻页、内容搜索、内容替换、沉浸阅读 | Reader controls, TOC/bookmarks, appearance, TTS, settings, auto page, search, replacement, immersive reading | 阅读器框架（ReaderShell） | 阅读器风（Reader） |
| 换源流程 | 换源 | Source switching | 横向流程框架（FlowShell） | 阅读器流程风（Reader + Flow） |
| 设置链路 | App 通用设置、书架与搜索设置、隐私与权限、缓存管理、关于与反馈、同步与备份、书源管理 | General settings, bookshelf/search settings, privacy/permissions, cache, about/feedback, sync/backup, source management | 设置页框架（SettingsShell） | 蓝色编辑风设置变体（BlueEditorial Settings Variant） |

## 落地优先级（Implementation Priority）

| 优先级（Priority） | 中文任务（Chinese Task） | English Task | 验收标准（Acceptance） |
| --- | --- | --- | --- |
| P0 | 冻结框架和 slot 命名 | Freeze shell and slot names | 每个页面声明 shell、role、slots、state model。 |
| P1 | 稳定主标签页框架 | Stabilize MainTabShell | 四个主 Tab 使用同一底部导航和内容 slot。 |
| P1 | 稳定设置页框架 | Stabilize SettingsShell | 七个设置页使用同一 SettingsShell。 |
| P2 | 抽书架链路框架 | Extract LibraryShell | 书籍详情、目录、操作底表先共享 book context、SheetHost、DialogHost。 |
| P2 | 抽阅读器框架 | Extract ReaderShell | `shared-shell-kit` 已建立 ReaderShell，阅读入口、阅读控制层、目录与书签、外观、朗读、阅读设置、自动翻页、内容搜索、内容替换、沉浸阅读 10 页已迁移。 |
| P3 | 固化图标库 | Stabilize icon library | 所有页面引用语义图标，不保留不可复用 inline icon。 |
| P3 | 固化横向换源 | Stabilize FlowShell | `shared-shell-kit` 已建立 FlowShell，换源页面已迁入中心化 FlowShell；不得塞进普通竖屏 ReaderShell。 |

## 审计检查清单（Audit Checklist）

| 检查项（Check Item） | English | 通过标准（Pass Criteria） |
| --- | --- | --- |
| 框架一致 | Shell consistency | 同一 shell 下页面的状态栏、顶部栏、内容区、状态宿主结构一致。 |
| 组件实例 | Component instances | 同一组件跨页面必须复用组件实例或同一代码组件，不复制后局部改形。 |
| 图标来源 | Icon source | 图标来自语义图标库或公共组件，页面内不新增一次性 SVG。 |
| 风格分支 | Visual scheme | BlueEditorial、ForestUtility、Reader 不混用字体、色彩和控件样式。 |
| 状态矩阵 | State matrix | default、loading、empty、error、permission 等状态不替换整页框架。 |
| 触控尺寸 | Touch target | 可点击目标不小于 48 x 48 dp。 |
| 文案固定 | Fixed copy | 固定中文文案、章节、书名、数字和状态不得随机替换。 |
| 截图验收 | Screenshot validation | QA 以本地 UI 图 50% 叠加检查，不凭主观相似度通过。 |
