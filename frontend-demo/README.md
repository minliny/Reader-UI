# 前端 Demo 设计稿（Frontend Demo）

## 页面定位（Page Role）

这是当前前端 demo 入口，用于把本地 29 张 UI 设计图重新组织成可前端实现的统一结构。它不是 Figma Make 生成物，也不覆盖旧 `frontend-input/` 页面。

入口文件（Entry）：`frontend-demo/index.html`

当前浏览器路径（Browser Path）：`/frontend-demo/`

共享框架来源（Shared Shell Source）：`frontend-demo/shared-shell-kit/kit.js`

## 覆盖范围（Coverage）

- 主标签页框架（MainTabShell）：书架、发现、RSS、设置的统一底部导航和内容区结构。
- 书架链路框架（LibraryShell）：书籍搜索、详情、目录、排序筛选、操作底表、分组管理、本地书导入、底表、弹窗宿主。
- 阅读器框架（ReaderShell）：沉浸阅读、阅读正文底层、控制层、快捷操作、四模块导航、亮度栏。
- 设置页框架（SettingsShell）：设置返回顶栏、设置分组、设置行、Toast/Dialog/State 宿主。
- 流程框架（FlowShell）：换源窗口、阅读控制层延续、候选来源列表。

## 当前可交互范围（Current Interaction Scope）

- 单一应用画布（Single App Canvas）：页面只渲染当前路由，不再把所有页面并排列出；右侧只显示当前 Shell、当前页面和返回栈状态。
- 全量捕获模式（All Routes Capture Mode）：Figma 或审计需要一次查看所有页面时，可用 `?captureMode=all` 进入多路由捕获板；该模式仍复用当前 demo renderer，为每个路由输出一个手机画布，不参与常规应用交互。
- 显示模式（Display Modes）：默认常规显示只保留手机应用画布；开发者模式显示路由状态、Shell、当前页面和返回栈，用于结构审计。
- 页面内跳转（In-page Navigation）：书架搜索、书籍卡片、详情页开始阅读、阅读器换源、设置行、主导航等按钮都从当前页面内部触发路由跳转。
- 深链返回栈（Deep-link Back Stack）：使用 `?captureRoute=` 直接打开二级页面时，demo 会补默认来源上下文；书架链路默认 `bookshelf -> 当前页`，设置链路默认 `settings -> 当前页`，阅读和换源默认从 `bookshelf` 进入，保证页面返回符合应用导航而不是无响应。
- 返回栈（Back Stack）：Demo 返回按钮和页面返回顶栏共享同一返回栈；主 TAB 切换属于根级切换，不压入返回栈。
- 书架滚动密度（Bookshelf Scroll Density）：书架示例以紧凑继续阅读横条、自适应 4 列书籍网格、2:3 封面容器和 MainNav 底部 inset 验证内容密度；主导航可悬浮在内容上方，最后一本书仍可滚动到导航上方。
- 书架链路（Library Flow）：书架页可进入排序筛选、分组管理、本地导入；空状态属于书架内容状态，不作为普通按钮入口；书籍详情可进入目录，操作底表必须作为当前详情页覆盖层打开。
- 阅读链路（Reading Flow）：书架封面、继续阅读、书籍详情开始阅读直接进入沉浸阅读；点击正文中部热区打开阅读控制层，点击控制层正文中部隐藏控制层并回到沉浸阅读；点击控制层顶部返回退出 ReaderShell 并回到进入阅读前的非阅读页面。
- 章节入口（Chapter Entry）：书籍详情和目录页的章节行直接进入沉浸阅读，不进入阅读控制层；控制层只由沉浸阅读正文中部热区唤起。
- 阅读控制层结构（Reader Control Structure）：沉浸阅读、控制层、四模块面板和快捷面板共享同一个 ReadingSurface 正文底层；控制层只覆盖在正文上方，不改变正文文本框、标题、段落边距、透明度或排版；模块/快捷按钮进入目标页面前先在 ReaderShell 内显示加载态，再替换底部控制面板内容。
- 阅读控制层入口分级（Reader Control Entry Tiers）：上一页、下一页、亮度和进度属于即时动作；搜索、自动翻页、替换属于快捷面板，可再进入完整控制页；目录、朗读、界面、设置属于四模块面板，可再进入完整控制页或二级配置；换源不属于普通快捷面板，直接进入 FlowShell 换源流程。
- 阅读模块退出（Reader Module Dismissal）：点击目录、朗读、界面、设置会进入对应模块面板；再次点击当前已选中的同一个模块按钮会退出模块面板，回到默认阅读控制层；点击其他模块按钮则直接切换模块面板；点击正文中部热区隐藏整个控制层并回到沉浸阅读。
- 当前模块面板细节（Current Module Panel Details）：目录面板只显示章节名，不显示章节摘要、时间或右侧小字；朗读面板不展示示例正文，播放按钮中间只显示图标；界面面板使用 4 个纯色主题色块、字号 / 行距两组参数、3 个字体和 2 个自定义入口，色块内不放图标；阅读设置面板使用内部滚动列表承载常用开关和可循环值，不跳出 SettingsShell。
- 快捷到完整页（Quick to Full Page）：只有具备“少量常用修改 + 复杂完整配置”的功能采用二段式，包括目录与书签、朗读、阅读外观、阅读设置、内容搜索、自动翻页、内容替换；完整页仍归 ReaderShell，必须保留同一正文底层和 ReaderContext。
- 阅读正文分页（Reader Body Pagination）：正文 fixture 提供连续正文流，不预切 `readingPages`；进入 ReaderShell 后先按实际 `ReadingTextLayer` 宽高、字号、行距、段距、字距和字体测量，再生成运行时页码；左右热区和控制层上一页/下一页只改变 ReaderShell 运行时页码状态，不切换独立 HTML 页面；页脚同步显示当前进度和第几页。
- 阅读排版状态（Reader Typography State）：阅读外观快捷面板可即时调整正文的主题、字号、行距和字体；页边距、背景色、段距、字距等更复杂项通过完整阅读设置入口继续细化；这些值作为 ReaderShell 运行时状态保留在沉浸阅读、控制层和阅读模块之间。
- 主导航（Main Tab Navigation）：书架、发现、RSS、设置四个主导航按钮进入对应 MainTabShell 页面，并保持按钮数量、尺寸和位置稳定。
- 键盘覆盖（Keyboard Overlay）：搜索页输入入口可打开键盘层，输入框获得焦点，键盘层级高于主导航。
- 底表与弹窗（Bottom Sheet and Dialog）：书籍详情示例可打开底表和确认弹窗，弹窗层级高于底表。
- 阅读模块导航（Reader Module Navigation）：目录、朗读、界面、设置四个按钮进入对应 ReaderShell 模块页面，只改变背景、图标色和文字色，不改变尺寸、间距或相对位置；重复点击当前 active 模块关闭模块页并回到默认阅读控制层；加载态期间按钮位置也保持稳定。
- 换源窗口（Source Switch Window）：阅读器换源从顶部阅读栏进入 FlowShell，不走 ReaderShell 快捷面板；手机端仍是固定 `390 x 844` 应用画布，并延续进入前的阅读控制层，包含顶部阅读栏、正文、底部控制面板、亮度栏和四模块导航；窗口必须落在正文可用区域内，不与顶部栏、底部控制面板或四模块导航重叠，样式沿用阅读控制层面板，不使用暗色遮罩或高亮聚焦；换源窗口与顶栏菜单、底栏控制、四模块导航处于同一交互平面，不能用全屏遮罩或禁用背景的方式阻断顶栏和底栏操作；关闭换源窗口或在换源页切换底栏模块时必须替换当前换源路由，不得把 `source-switch` 留在返回栈里；窗口只展示当前来源和候选源两行信息（书源名、延迟/状态、最新章节），默认按延迟从小到大排序，不展示筛选、检测条、结果保存面板或底部状态摘要。书源管理、书源编辑和批量检测属于 SettingsShell 的书源管理，不塞进阅读中的换源窗口。

这些交互由当前 `frontend-demo/` renderer 覆盖；当前验证页面结构和关键覆盖关系，不代表真实业务数据、完整导航实现或端到端设备测试已经完成。

## 动效规划（Motion Planning）

当前 demo 的动效规划由六份文档组成：`MOTION_CONTRACT.md` 定义跨端共享的 motion token、状态迁移和验收边界；`MOTION_EFFECTS.md` 描述每个场景的实际动画效果、方向、时序和禁用项；`MOTION_SELECTOR_MATRIX.md` 映射 148 个唯一 `data-*` 入口到 Motion ID、demo route、平台组件和证据位置；`MOTION_INTERACTION_COMPONENT_AUDIT.md` 审计当前交互组件族是否被统一 Motion ID 纳管；`MOTION_IMPLEMENTATION_GAP_AUDIT.md` 追踪从规划稿到可执行规格之间的缺口；`../docs/ui-handoff/MOTION_PLATFORM_MAPPING.md` 说明平台应用如何用原生 SwiftUI / Compose / ArkUI 实现，不直接复用 Web CSS 或 DOM 行为。

执行入口是 `motion-controller.js` 暴露的 `ReaderMotionController.CONTRACT`。它把 Motion ID 解析到 family、token、state fields、state machine、平台组件和证据规则；`verify/motion/verify-motion-coverage.mjs` 会检查当前 renderer 绑定的 Motion ID 是否都能被这份 registry 解析，并校验关键 Motion ID 是否有精确 `from/to/interrupt/finalState/reducedMotion` 状态机。平台实现不得照抄 CSS，而应复用同一 Motion ID、state fields、state machine、token 和证据要求，再映射到 Compose / SwiftUI / ArkUI 的原生状态与动画 API。

## 图标来源（Icon Source）

所有设计稿图标通过 `./asset-library/icons.js` 的 `ReaderAssetIcons.renderIcon(id, className)` 渲染。新稿内不新增一次性 SVG。

## 前端拆分规则（Frontend Split Rules）

- 先实现五个页面框架（Page Shells），再迁移旧 29 页到对应 slot。
- `render.js` 只作为同步 bootstrap，主渲染实现放在 `render-runtime.js`。
- `route-contract.js` 是 demo route 与发现 / RSS / 设置深层闭合清单的唯一契约源。
- `styles.css` 只作为 CSS 入口，页面和模块样式放在 `styles/*.css` 分层文件。
- 页面外壳必须通过 `ReaderShellKit.render*Shell(...)` 输出，不在页面 renderer 里重写顶栏、底栏和宿主节点。
- 书封图片是内容资源；UI 控件、导航、弹层和状态必须用组件实现。
- 阅读控制层四个模块按钮选中态只改变背景、图标颜色和文字颜色，不改变尺寸、间距或相对位置。
- 旧 `preview 2.html` 之类临时文件不作为前端输入件。

## 后续动作（Next Actions）

1. 继续把 `render-runtime.js` 内部页面模板按 `main-tabs / library / reader / settings / source-management` 做组件级拆分。
2. 把 demo 中已验证的返回、键盘、底表和弹窗规则迁移到真实平台导航和状态层。
3. 按 `MOTION_SELECTOR_MATRIX.md` 录制 motion 证据，并继续深化 TAB、dropdown、Reader entry、控制层和运行胶囊状态机。
