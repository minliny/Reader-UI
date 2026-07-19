# Reader 全产品能力交付矩阵

状态：规划基线；用于补齐“项目能力全量”到设计、Reader-UI、Core/Host 与三端原生实现的任务分工，不代表任一能力已经完成

扫描日期：2026-07-19

第一批平台：iOS / Android / HarmonyOS

## 1. 目的与权威边界

本矩阵解决两个长期混用的“全量”概念：

1. **当前合同全量**：Reader-UI 当前已登记的 route、state、event、component、motion、token、Core/Host bridge 与 ScreenGraph 全集。
2. **项目能力全量**：以 Reader 项目章程规定的“兼容 Legado 全部能力”为上界，包含尚未进入 Reader-UI route、schema、demo、设计代表稿或三端原生实现的能力。

权威顺序：

1. [Reader 项目章程](../../Reader-Core-Native/docs/PROJECT_CHARTER.md)：项目能力底线、平台范围、Core/Host 红线与完成判定。
2. [Legado 能力清单与 Reader 对标审计](../../Reader-Core-Native/docs/LEGADO_CAPABILITY_INVENTORY.md)：能力枚举及 Core 侧证据等级。
3. [Reader UI Contract 验收门槛](./ACCEPTANCE.md)：当前 Reader-UI 合同与生成物事实。
4. [Slice Plan](./SLICE_PLAN.md)：正式 Slice 0–12 的三端交付范围；计划登记不得覆盖当前 schema 和执行 evidence 事实。
5. [静态视觉闭环计划](../docs/design/VISUAL_CLOSURE_PLAN_2026-07-14.md) 与 [Motion 四层交付规划](../docs/design/MOTION_DELIVERY_PLAN_2026-07-14.md)：静态和动效交付顺序。

本文件中的 “Figma 代表稿” 仅转录本地规划文档所声明的页面族或 Reference，不是对 Figma 现场状态的再次验证。`无` 表示当前规划中没有能够承接该产品能力的代表稿，不表示以后禁止新增。

## 2. 两种全量的当前差异

### 2.1 当前合同全量

当前 schema/fixtures 的机器事实与 [ACCEPTANCE.md](./ACCEPTANCE.md) 最近同步基线共同表明：

- `route.schema.json` 与 route fixtures 已扩展为 260 个 `RouteId`，其中 24 个是本轮项目能力 intake route；
- 300 个 `UiEventType`、174 个 `ComponentType`、95 个 `MotionId`；本轮 intake 新增 30 个 canonical UiEvent，但它们被明确标为 planned/fail-closed，runtime implemented action 仍为 63 个，也没有伪造新的 component 或 motion；
- 71 个 `CoreCommandType`、95 个 `CoreEventType`、58 个 `HostRequestType` 与 58 个 `HostResultType`；
- 当前 190 个 ViewState variant 覆盖 184 个 direct route，另有 76 个 alias；动态 ScreenGraph 语义检查为 260/260 resolvable、0 explicit gap；
- 以上 260/260 只证明合同结构可解析，30 个新增事件仍 fail-closed；D6 只证明这些 route 有明确的本地展示与禁用边界，不证明 Core/Host 行为、设计代表稿、可执行业务、原生 renderer、真实业务链路或设备验收完成。ScreenGraph、runtime coverage 与说明文档已按新分母重生成，后续门禁会阻止 236/270 旧分母回流。

### 2.2 项目能力全量

[PROJECT_CHARTER.md](../../Reader-Core-Native/docs/PROJECT_CHARTER.md) 规定项目底线是兼容 Legado 全部能力，至少包含书源规则、主题、RSS、本地书 TXT/EPUB/PDF/Mobi/Umd、WebDAV、探索发现、替换/字典/目录规则、系统 TTS 与 HttpTTS，并覆盖 Android、iOS、HarmonyOS 和折叠屏。

当前 260 个 RouteId 已新增 onboarding/permission、local-format/PDF/manga、HttpTTS、内容编辑、换封面/封面搜索、段评、书签管理、下载/存储、WebView 登录挑战和设置补充等 24 个 intake route，并为这些入口登记 30 个 planned/fail-closed UiEvent。它们把此前“完全未登记”提升为“合同结构、最小事件语义与 D6 展示已占位”，但没有同步新增 runtime action、CoreCommand、HostRequest 或 MotionId，也没有自动产生 Figma 代表稿或三端实现。因此这些能力仍属于交付缺口，只是缺口位置从“无 route”前移到“缺可执行语义与跨端闭环”。音频/有声书、Mobi/Umd 专用阅读、DictRule/TxtTocRule 管理等仍没有专用 route。

### 2.3 完成判定

以下任一项都不能单独把能力标记为完成：Figma 有画面、route 可解析、fixture 通过、Core 单测通过、单端 renderer 存在、模拟器截图存在。

能力完成必须同时具备：

1. Legado 对应语义或数据结构来源；
2. Reader-UI 的 route/state/event/component/motion/token 或明确的“无 UI”结论；
3. CoreCommand/CoreEvent 或 HostRequest/HostResult 的真实边界；
4. iOS/Android/HarmonyOS 原生实现与 reducer/adapter 测试；
5. 正常、空、错误、离线、权限、取消/重试等关键状态；
6. 同一 fixture/corpus 的跨端结果以及所需的 App/device evidence。

## 3. 全产品能力交付矩阵

状态说明：

- `现行承接`：正式 Slice 0–12 已明确分配实现与验收；`planned` 仍不是实现完成。
- `部分承接`：已有页面、合同或局部实现，但缺少完整产品流或跨端验收。
- `项目能力缺口`：Core/项目基线存在，但当前 Reader-UI 与设计规划没有完整承接。
- `后置门禁`：能力本身已分配，最终结论必须等待原生或设备证据。

| ID | 全项目能力 | 当前 UI 承接 | Figma 代表稿（按本地规划） | Reader-UI 契约 / 本地实现 | Core / Host | 原生 Host | 状态 | 验收门槛 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A01 | App Shell、四主 Tab、深链、返回栈 | `app-shell`、`main-tabs`、bookshelf/discover/rss/settings 根页 | `05 · Navigation & Shells`、Main Tab 候选 | Route/ViewState/runtime 与 demo 返回栈已有 | Core 不持有导航；Host 持有原生 navigator | Slice 1 三端 AppShell | 现行承接 | 冷启动、Tab 独立栈、深链、系统返回、overlay 优先关闭三端一致 |
| A02 | 首次启动、引导、权限、文件选择与拒绝恢复 | 新增 `onboarding-welcome`、`onboarding-capability-setup`、`permission-recovery`；尚无完整行为流 | `07 · States & Overlays` 仅有通用状态；无完整首次使用代表流 | intake route/ViewState/planned event 与 D6 展示已登记；`permission.request/check`、`file.select` 已有，缺可执行恢复状态机与 Host 回流闭环 | Host 负责文件授权、系统设置跳转和回流检测 | 各端仅有零散权限/导入实现 | 合同占位，仍需 Slice 12 | 首次/非首次、允许/拒绝/永久拒绝、去设置、返回自动检测、无权限降级均可复跑 |
| A03 | 全局 loading/empty/error/offline/permission 与恢复 | 通用 PageState、全局状态 route 已有 | `07 · States & Overlays`、M3 状态参考 | 通用状态合同已存在；业务错误与恢复 action 仍不齐 | Core/Host 输出结构化错误；UI 不猜错误来源 | Slice 1/6/8 局部覆盖 | 部分承接 | 每个业务族都映射错误来源、可重试性、离线可用范围和最终恢复状态 |
| A04 | Phone、横屏、Tablet、折叠屏、safe area | demo 有 viewport class 与三档/四视口规则；折叠 hinge/pane 未闭合 | `24 · Responsive Masters` 为 Phone/Compact/Tablet 候选；无完整 fold posture 代表稿 | 响应式 CSS/runtime 已有；fold posture 与 pane contract 不完整 | Host 提供窗口、hinge、safe area 和旋转事件 | Slice 8 仅要求 fold/orientation evidence | 部分承接 → Slice 12 | 关键页面在 phone/landscape/tablet/fold posture 下无裁切，旋转保持 route、anchor、focus 与 session |
| A05 | 无障碍、动态字体、键盘、reduced-motion、性能 | 新增 `settings-accessibility`；仍无全应用语义矩阵 | 无独立全应用无障碍代表稿 | 设置入口、planned event 与 D6 展示已登记；Motion/focus 较强，语义树、阅读顺序和错误播报未逐页登记 | Host 负责 VoiceOver/TalkBack/屏幕阅读器和性能工具 | Slice 8 只有录屏/设备证明要求 | 合同占位/部分承接 → Slice 12 | 三端语义树、焦点回还、动态字体、目标尺寸、状态播报、reduced-motion、帧性能逐族通过 |
| B01 | 书架封面/列表、继续阅读、分组、排序、批量与更多操作 | 相关 routes 与 demo 页面较全 | `08 · Library & Import`、Bookshelf 页面族候选 | 书架 route/ViewState 已有；部分动作仍缺 exact binding | Core 拥有 Book/BookGroup/BookshelfStore | 各端覆盖不一，BookMoreMenu 仍有 visible gap | 部分承接 | 真实 Core 数据下增删、分组、排序、批量、撤销、空态和重启持久化三端一致 |
| B02 | 本地书导入：TXT/EPUB/PDF/Mobi/Umd、TXT 目录规则 | 通用 import 外新增 `local-format-support`；格式行为仍未闭合 | Import 候选和 M3 五个代表状态；没有格式专属阅读稿 | intake route/ViewState/planned event 与 D6 展示已登记；无元数据分流、Core mapping 与 runtime action | Core 已有五种格式和 TxtTocRule；Host 负责文件授权 | LocalBookImport 在原生端仍有 gap | 合同占位，仍需 Slice 9 | 五种真实文件均能选择、解析、冲突处理、入架、打开；格式错误/大文件/取消/权限恢复有设备证据 |
| B03 | 搜索、搜索历史、发现、筛选、排序与分页 | Search/Discover routes 和状态较广 | `09 · Discover`、`11 · Search`、M3 状态参考 | route/state/demo 已有；真实分页、历史持久化和部分 action 仍需闭合 | Core 拥有 source search/explore 与 SearchBook/SearchKeyword | Slice 5 | 现行承接但未闭合 | 真实源搜索/发现、分页、筛选、空错态、历史增删和并发 latest-wins 三端一致 |
| B04 | 书籍详情、目录预览、加入书架、开始阅读 | `book-detail`、TOC preview/directory 已有 | Book Detail 页面族候选 | route/ViewState/demo 已有 | Core 拥有 detail、TOC、bookshelf mutation | Slice 2 | 现行承接但未闭合 | 本地/网络书详情差异、加入/移除、目录刷新、无源/失效源、打开阅读链完整 |
| C01 | 文本阅读、分页、章节跳转、进度恢复 | `immersive-reading`、ReaderShell、TapZones 与边界状态 | `15 · Reader 2` 为控制层静态源；Reader 页面族 | 文本 reader、分页 transaction、进度提交和部分 motion 已有 | Core 拥有 content/location/progress；Host 拥有布局测量 | Slice 2，Reader host-composite 仍需设备证明 | 现行承接 / 后置门禁 | 真实正文、首末页、章节跳转、后台/旋转恢复、stored 后 visible commit 和跨端 canonical location 一致 |
| C02 | 漫画阅读、图片序列、缩放/滚动、预加载与失败恢复 | 新增 `manga-reader` 结构入口 | 无 | intake route/ViewState/planned event 与 D6 platform-renderer surface 已登记；无 runtime action、Core/Host mapping 与 motion | Core 已有 `manga.pages.extract`；Host 负责图片请求、解码、缓存与手势 | 未形成统一三端切片 | 合同占位，仍需 Slice 9 | 真实漫画源页序列、长图/分页、缩放、旋转、预加载、单页重试、缓存和进度三端通过 |
| C03 | PDF 与其他本地格式专用阅读体验 | 新增 `pdf-reader`；Mobi/Umd 仍仅有通用格式入口 | 无 | PDF intake route/ViewState/planned event 与 D6 platform-renderer surface 已登记；无 runtime action、工具栏、page model、Core/Host mapping 与原生映射 | Core 已有 PDF/Mobi/Umd parser；Host 负责原生渲染与文件生命周期 | 未形成统一三端切片 | 合同占位，仍需 Slice 9 | PDF 页码/缩放/目录/密码或损坏态；Mobi/Umd 章节/编码/图片；不能静默降级为纯文本 |
| C04 | 目录、书签、进度、阅读时长与历史 | TOC/bookmarks 与 bookmark add/remove 外新增 `bookmarks-manager` | Reader Directory/Quick/Full 代表态，未覆盖完整 CRUD | 管理 route/ViewState/planned event 与 D6 展示已登记；bookmark edit/list、ReadRecord 行为仍不完整 | Core 已有 Bookmark、ReadRecord 与 progress store | Slice 2/4 只覆盖目录与进度 | 合同占位/部分承接 → Slice 10 | 书签增删改跳转、目录定位、阅读时长、历史清理与重启恢复采用 Core 事实源 |
| C05 | 全文搜索与结果定位 | `content-search` 已有 | Reader Search/overlay 候选 | route/event/demo 已有 | Core 已有 `search_content` | 未在现行 Slice 2 中单列完整验收 | 部分承接 → Slice 10 | 大章搜索、取消、空错态、关键字高亮、结果跳转与返回原位置三端一致 |
| C06 | 正文内容编辑与原文恢复 | 新增 `content-edit` 结构入口 | 无 | intake route/ViewState/planned event 与 D6 replacement-only 展示已登记；无 runtime save action、CoreCommand bridge 与 motion | Core 已有 `content-edit.*` 与 edited-content 优先语义 | 未分配 | 合同占位，仍需 Slice 10 | 编辑、保存、取消、恢复原文、章节切换、冲突与持久化三端通过 |
| C07 | 替换规则、字典规则、TXT 目录规则与内容净化 | 替换规则页面较多；字典/TXT 目录规则管理缺失 | Reader Replace 候选；无 Dict/TxtTocRule 代表稿 | replacement route/state 已有；DictRule/TxtTocRule 未完整进入合同 | Core 已有 ReplaceRule、DictRule、TxtTocRule 与 ContentProcessor | 原生只覆盖部分 replacement | 部分承接 → Slice 10 | 三类规则 CRUD、排序/启停、导入导出、预览、语法错误和真实章节结果可验证 |
| C08 | 换源、预览、回滚与失效源恢复 | Source Switch 正常/空/错/超时/预览/回滚 routes 已有 | `16 · Source Switch` reusable 与响应式候选 | route/state/runtime 较完整，生产 action 仍多为 Shadow | Core 已有 ChangeBookSource；Host 执行网络请求 | 现行 Slice 2/5 边界分散 | 部分承接 → Slice 10 | 真实候选、延迟/章节匹配、切换、失败回滚、进度保持、连续切换 exactly-once 三端通过 |
| C09 | 封面加载、搜索、解密、换封面与图片缓存 | 新增 `book-cover-change`、`book-cover-search` | Book Detail/Bookshelf 有封面视觉，无管理代表稿 | intake route/ViewState/planned event 与 D6 预览展示已登记；无 runtime action、Core bridge 与图片缓存事务 | Core 已有 searchCover/changeCover/coverDecodeJs；Host 负责加载与 LRU | 未分配统一任务 | 合同占位，仍需 Slice 10 | 默认/自定义/规则搜索、预览、解密失败、选择保存、回滚、离线缓存与重启显示一致 |
| C10 | 章节段评/评论 | 新增 `chapter-reviews` | 无 | intake route/ViewState/planned event 与 D6 状态展示已登记；无 runtime action 或 Core bridge | Core 已有 BookChapterReview V1 | 未分配 | 合同占位，仍需 Slice 10 | 列表、加载/空/错、章节切换、作者/时间/评分、无分页能力的明确降级三端一致 |
| C11 | 音频/有声书内容播放、流媒体与外部媒体描述符 | 当前 TTS 页面不能承接有声书；无 audio reader route | 无 | 无 audio/media ViewState、播放队列和业务事件 | Core 正文链可产 audio/media descriptor；Host 负责播放器、流媒体、音频焦点与后台 | 未形成统一三端切片 | 项目能力缺口 → Slice 9 | 真实音频源的章节、播放/暂停/seek、失效 URL、HLS/外链、后台、音频焦点、媒体键和进度恢复三端通过 |
| D01 | 系统 TTS、队列、语速、暂停恢复与位置 | TTS panel、full TTS、session capsule 已有 | Reader 2 TTS Quick/Full 与 Motion 代表家族 | TTS UI/runtime/Motion 与 `tts.system.*` HostRequest 已有 | Core 拥有队列/切片；Host 发声 | Slice 4 + Slice 7 | 现行承接 / 后置门禁 | 真实系统引擎启动、暂停、seek、章节衔接、错误、中断、后台和位置持久化三端通过 |
| D02 | HttpTTS 配置、CRUD、请求构建、试听与播放 | 新增 `http-tts-management/editor/test` 与 `settings-tts` | 无 | intake route/ViewState/planned event 与 D6 管理/编辑/测试状态已登记；无 runtime action、CoreCommand/HostResult 与 playback 闭环 | Core 已有 HttpTTS CRUD、build-request 和 TtsConfig；Host 执行 HTTP/媒体播放 | 未分配 | 合同占位，仍需 Slice 10 | 服务列表、新增编辑删除、模板校验、试听、选择默认、网络错误、凭据保护和播放证据齐全 |
| D03 | 自动翻页、唯一 Session Capsule、媒体键/后台控制 | auto-page、TTS/auto-page 互斥与 capsule 已有；媒体键未承接 | Reader 2 / Motion Session Capsule 代表稿 | session runtime/motion 已有；media button 无 Host/UI contract | Core 拥有 session 语义；Host 拥有计时、媒体键和后台 | Slice 4，媒体键/后台证据不足 | 部分承接 → Slice 10/12 | 自动翻页和 TTS 互斥、暂停恢复、锁屏/耳机键、后台退出、reduced-motion 与最终状态一致 |
| E00 | Legado 书源规则语言：CSS/XPath/JSONPath/Regex/变量/JS/链式组合 | 仅由规则编辑/调试页面间接承接；无能力级兼容状态展示 | Source Management 可作为入口；无独立规则语言代表稿要求 | UI contract 尚未登记规则语法版本、诊断位置和兼容能力集 | Core 拥有 DSL、JS sandbox 和 request descriptor；Host 只执行声明的网络/WebView/file 能力 | 三端不得各自解释规则 | 部分承接 → Slice 11 | 同一真实 Legado 规则/corpus 在 CLI 和三端得到 canonical 同结果；编辑器能显示语法、阶段、错误位置与 Host-required 分类 |
| E01 | 书源 CRUD、导入导出、分组、检测和批量 | Source Management routes 较广 | `13 · Source Management` reusable/候选 | route/state/demo 已有，部分按钮无 exact binding | Core 拥有 BookSource、import/export/check；Host 执行请求 | Slice 5 | 现行承接但未闭合 | 真实 Legado 源导入、编辑、启停、分组、检测、批量、重复/冲突和回滚三端通过 |
| E02 | 规则编辑、规则订阅、调试、日志与源码查看 | rule edit/debug/result/log routes 已有；规则订阅与真实执行不完整 | Source Management 候选；无完整编辑器/订阅代表流 | 多为 route/scaffold；语法诊断、版本和 subscription dispatch 未完整桥接 | Core 有规则 DSL、source.debug、RuleSub storage | Slice 5 仅笼统覆盖管理/调试 | 部分承接 → Slice 11 | 编辑器校验、保存版本、订阅更新、逐阶段调试、日志复制/清理和真实源结果三端一致 |
| E03 | WebView 登录、验证码、Cookie 回流、反爬挑战 | 新增 `webview-login/captcha/challenge/cookie-return` | 无独立登录/挑战代表稿 | intake route/ViewState/planned event 与 D6 状态展示已登记，`webview.*`、`cookie.*` 已有；缺可执行 profile/session 状态机与返回事务 | Core 产 descriptor；Host 负责 WebView、Cookie、captcha、challenge | Slice 7 只有能力 API，非用户旅程 | 合同占位，仍需 Slice 11 | 打开登录、验证码/挑战、Cookie 隔离与持久化、成功/取消/超时、回流重试真实源三端通过 |
| E04 | RSS 列表、订阅管理、刷新、详情和原文 | RSS routes 与状态广 | `10 · RSS`、M3 RSS 代表状态 | route/state/demo 已有；真实数据与 WebView 闭环待证明 | Core 已有 RSS 解析、内容和 subscription CRUD；Host 打开原文 | Slice 5 | 现行承接但未闭合 | RSS2/Atom/JSON Feed 真实源、订阅 CRUD、刷新、详情、原文、离线/失效源三端通过 |
| E05 | RSS 收藏、阅读记录、分组与规则订阅 | 有 favorite/read-record/rule-subscription routes | RSS 候选中仅有部分代表状态 | route 已有，Core bridge/action 完整性不足 | Core 已有 RssStar、RssReadRecord；RuleSub 仍需 dispatch 对齐 | Slice 5 未逐项验收 | 部分承接 → Slice 11 | 收藏增删/清组、已读同步、分组、订阅规则更新与重启持久化三端一致 |
| E06 | 图片/音频/媒体下载、缓存文件和 Host media lane | 新增 `download-queue`、`download-task-detail`；受保护媒体流仍未闭合 | 无 | intake route/ViewState/planned event 与 D6 队列/任务状态已登记；无 runtime action、Core/Host transaction 与真实进度模型 | Core 已有 request descriptor/cacheFile/downloadFile 路由；Host media_download 需证明 | 原生 Host 无统一 App-level proof | 合同占位，仍需 Slice 9/11 | 下载任务状态、进度、取消/重试、目标路径、凭据/Cookie、文件校验与离线消费三端通过 |
| F01 | WebDAV、同步、备份、恢复与冲突 | Sync/Restore/WebDAV routes 与多状态已有 | `14 · Sync · Backup · Restore` 候选/M3 状态 | contract/demo 较广，生产 workflow 仍多为 Shadow | Core 已有 WebDAV/sync/diff/recovery；Host 负责 transport/credential/file | Slice 6 | 现行承接 / 后置门禁 | 两设备 push/pull、加密备份、范围预览、冲突五种 resolution、失败恢复和真实服务器三端通过 |
| F02 | 离线缓存、下载队列、存储空间、历史与清理 | reader/settings cache 外新增 download queue/detail、`storage-management`、`settings-storage` | Reader Book Cache/Settings 候选不完整 | intake route/ViewState/planned event 与 D6 队列/存储展示已登记；cache clear/prefetch/status 已有，queue transaction/history/配额 runtime 未入合同 | Core storage 已有 cache/progress/history/download queue | 未形成统一三端交付 | 合同占位/部分承接 → Slice 9/12 | 队列、并发、暂停恢复、配额、空间不足、清理确认、离线可读和重启恢复三端通过 |
| F03 | 主题、字体、排版、背景、翻页方式与阅读设置 | Reader Appearance/Settings 完整度较高 | `15 · Reader 2` Appearance/Settings 静态源 | AppearanceSpec、token、ViewState 和 demo 四视口已建立 | Core 保存稳定语义；Host 解析字体/颜色/原生控件 | 三端 consumer 尚需正式 lock 与设备视觉证据 | 现行承接 / 后置门禁 | 配置生成单源、稳定 wire value、三端视觉/持久化/迁移、动态字体与重启一致 |
| F04 | 通用设置、开发者工具、关于、日志和危险操作 | settings/developer/about/log 外新增 `settings-tts/storage/accessibility` | `12 · Settings & About`、M3 About 参考；新增入口无代表稿 | intake route/ViewState/planned event 与 D6 设置展示已登记；权限、缓存、日志、reset 和新增设置的 runtime action/owner 需逐项补 | Core/Host 按业务归属执行 | Slice 1 仅根页，Slice 5/6/7 分散承接 | 合同占位/部分承接 → Slice 12 | 每个设置项有 owner、默认值、持久化、错误/确认、重置、版本信息和跨端一致性 |
| F05 | 后台任务、通知、分享、剪贴板与系统集成 | 只有少量入口或无专用 UI | 无完整系统集成代表稿 | HostRequest 已有多项；缺用户可见状态与业务触发映射 | Host 完全负责，Core 只发合法 request | Slice 7 列能力但未给产品场景 | 部分承接 → Slice 12 | 每项至少一个真实业务触发、权限/取消/错误、后台恢复和三端 happy/error device evidence |
| F06 | 统一交互动效、手势、中断与降级 | 95 MotionId，89 active exact；证据仍不完整 | Motion Reference 十个家族；Reader 2 为首个样板 | MotionSpec/Policy/runtime/demo 已有；统一 harness 与动态 evidence 未闭合 | Motion 不进入 Core/HostAdapter；原生 MotionAdapter 实现 | MR3–MR5 后置 | 现行承接 / 后置门禁 | 每家族 normal/repeat/opposite/interrupt/reduced/viewport，三端原生最终态与性能证据一致 |
| F07 | 合同发布、consumer lock、跨端 corpus/App/device release gate | 有 contract/release/device conformance 工具；非 UI 页面能力 | 无 | 3.0.0 候选与本地门禁存在，immutable artifact/locks 未关闭 | Core/Host 必须同协议和同 corpus | 三端正式 lock 仍需升级，真机证据未闭合 | 后置门禁 → Slice 12 | 精确 commit/tag、不可变制品 digest、三端 lock、完整构建、同 corpus diff=0、关键 App/device flow 全绿 |
| F08 | macOS、Windows、Linux 后续平台 | 共享合同可复用；当前无桌面专属 IA/交互任务 | 无桌面专属代表稿 | Reader-UI 合同保持平台中立；不得假设移动布局直接适用桌面 | 继续消费同一 Rust Core 与协议 | 项目章程明确为后续批次 | 明确后置，不纳入 Slice 9–12 | 后续立项时补桌面窗口/键鼠/菜单/文件系统/打包能力，并通过与移动端同 corpus 的 parity gate |

## 4. 基础 Slice 0–8 的覆盖边界

| Slice | 现行目标 | 能覆盖的矩阵项 | 不能据此宣称完成的内容 |
| --- | --- | --- | --- |
| Slice 0 | contract/generated/tooling 接入 | 合同基础和三端骨架 | 任何真实业务能力 |
| Slice 1 | AppShell + main tabs | A01、A03、B03/F04 根入口 | onboarding、完整设置、真实业务数据 |
| Slice 2 | bookshelf → detail → text reader | B01、B04、C01 的主链 | 多格式、漫画、PDF、编辑、封面、段评 |
| Slice 3 | Reader 控制层 | C01/F03 控制层 | 现行计划已恢复 Reader Control / overlay / full panel，但不能外推为多格式阅读或完整阅读能力已交付 |
| Slice 4 | progress/session/TTS/auto-page | C04、D01、D03 的一部分 | HttpTTS、媒体键、完整历史/书签管理 |
| Slice 5 | RSS/source/search/discover | B03、E01、E04 的主链 | 规则订阅、WebView 登录/captcha、媒体下载、RSS 长尾实体完整闭环 |
| Slice 6 | sync/conflict/offline | F01、A03 的一部分 | 全局下载/缓存中心、真实服务器和全错误恢复 |
| Slice 7 | Host Adapter | HTTP/Cookie/WebView/File/Credential/TTS/Background/Notification 等能力入口 | 现行计划已按 58 个 HostRequest/58 个 HostResult 建账；API/fixture 存在不等于用户旅程、原生实现或 App/device proof |
| Slice 8 | consistency/device evidence | A04、A05、F06、F07 的后置证据 | 单一文本阅读 smoke 不能代表全产品能力验收 |

## 5. 正式 Slice 9–12

Slice 9–12 已于 2026-07-19 正式写入 [SLICE_PLAN.md](./SLICE_PLAN.md)，不再只是能力建议。它们不替换 Slice 0–8，而是补齐其能力上界。每个 Slice 都必须同时更新设计代表稿、Reader-UI contract/demo、Core/Host mapping、三端原生实现和设备验收；若某能力确认“无 UI”，也必须在矩阵中登记原因与 API 证据。计划登记不等于 runtime、原生或设备完成，当前真实状态继续以本矩阵各层 evidence 为准。

### Slice 9：多格式、本地书、漫画与媒体交付

范围：

- TXT/EPUB/PDF/Mobi/Umd 导入、元数据与格式专属错误；
- PDF/Mobi/Umd 专用阅读器分流；
- 漫画图片序列阅读、缩放、滚动、预加载与进度；
- 音频/有声书播放器、流媒体、音频焦点与媒体键；
- 图片/音频/media download、下载队列、缓存与离线消费；
- 文件权限、空间不足、取消/重试和重启恢复。

主要矩阵项：B02、C02、C03、C11、E06、F02。

完成门槛：五种本地真实文件与至少一组真实漫画/媒体源在三端通过相同导入/打开/继续阅读/缓存/恢复链；不允许把非文本格式静默渲染为 `ReadingTextFlow`。

### Slice 10：阅读数据、编辑、规则、封面与扩展 TTS

范围：

- 目录、书签、阅读记录与全文搜索；
- 内容编辑、恢复原文；
- ReplaceRule/DictRule/TxtTocRule CRUD、预览和应用；
- 换源完整事务、封面搜索/解密/更换；
- 章节段评；
- HttpTTS CRUD、配置、试听和播放；
- 媒体键与 Reader session 的后台控制。

主要矩阵项：C04–C10、D02、D03。

完成门槛：所有实体由 Core 持久化并经 reducer/effect 单链变更；三端不得维护第二份业务数据。编辑、规则、封面、HttpTTS 都需正常/空/错/取消/回滚与重启恢复证据。

### Slice 11：动态书源、规则订阅、登录挑战与 RSS 深链

范围：

- 书源导入导出、分组、检测、规则编辑、版本和调试；
- RuleSub/RSS 规则订阅及更新冲突；
- WebView 登录、验证码、Cookie/profile 隔离、反爬 challenge 与回流重试；
- RSS 收藏、阅读记录、原文浏览器和认证源；
- Host image/media request 与受保护下载。

主要矩阵项：E00–E06。

完成门槛：至少一组需要 Cookie 登录、一组 WebView/captcha、一组普通 HTTP、一组 RSS 规则源在三端跑通同一 Legado 语义；Core 只产 descriptor，Host 不把平台对象或明文凭据写回 Core。

### Slice 12：完整应用生命周期、设置、无障碍与 Release Gate

范围：

- onboarding、权限教育、系统设置回流；
- 通用/开发者/存储/通知/危险设置的 owner 与持久化；
- Phone/landscape/tablet/fold posture 的全页面族回归；
- VoiceOver/TalkBack/屏幕阅读器、动态字体、键盘、reduced-motion、性能；
- background/notification/share/clipboard 的真实业务入口；
- 不可变 Reader-UI/Core 制品、consumer lock、同 corpus、App/device 全链路。

主要矩阵项：A02–A05、F03–F07。

完成门槛：三端至少覆盖首次启动→权限→导入/搜索→阅读→编辑/书签/TTS→缓存/下载→同步恢复→退出重进的完整路径，并为 Slice 9–11 的关键能力各保留一条 App/device smoke；单一文本阅读 smoke 不再作为“完整应用”验收代理。

## 6. 规划漂移与当前同步项

这些动作只修正分母和任务边界，不代表新增能力已经实现：

1. **本轮已修正**：[SLICE_PLAN.md](./SLICE_PLAN.md) 的 Slice 3 已恢复为 Reader Control / overlay / full panel，Slice 7 已按当前 `58 HostRequest/58 HostResult` 建账。它们只修正计划，不构成 runtime、Host 或设备完成证据。
2. **本轮已同步**：[ACCEPTANCE.md](./ACCEPTANCE.md)、[ROUTE_COMPONENT_MATRIX.md](./ROUTE_COMPONENT_MATRIX.md)、ScreenGraph、runtime coverage 与三语言 generated 已统一为 260 RouteId、300 UiEventType、190 ViewState variant、184 direct + 76 alias、260 resolvable、0 explicit gap；门禁会阻止旧分母回流。
3. **本轮已补齐**：[ROUTE_COMPONENT_MATRIX.md](./ROUTE_COMPONENT_MATRIX.md) 已为 24 个 intake route 补全结构索引，D6 renderer 已显式覆盖，且明确“合同登记/planned event/D6 展示不等于 runtime、Host、原生或设备完成”。
4. **本轮已明确**：“当前合同全量”与“项目能力全量”在本矩阵及 route matrix 中分开命名；后续文档继续沿用该口径。
5. Slice 8 的最低 device smoke 必须扩展为按 Slice 9–12 分域验收，不能只覆盖文本书架→阅读→TTS→同步；全产品 Release Gate 归 Slice 12。
6. Slice 9–12 的正式依赖、Core/Host 前置、三端交付物、并行规则与 evidence bundle 以 [SLICE_PLAN.md](./SLICE_PLAN.md) 和 [PLATFORM_EVIDENCE_SPEC.md](./PLATFORM_EVIDENCE_SPEC.md) 为准。

## 7. 维护规则

1. 每新增或确认一项项目能力，先更新本矩阵，再决定是否进入已有 Slice 或新增 Slice；不得只加 Figma 页面或只加 route。
2. `状态` 必须区分 `设计代表稿`、`Reader-UI contract/demo`、`Core/Host`、`原生 Host` 与 `App/device`，禁止合并成一个完成百分比。
3. 能力状态以当前仓库、可执行命令、真实 fixture/corpus 和设备证据为准；历史审计数字只作来源说明。
4. Figma 负责视觉和交互意图，不是 Core 能力清单或平台完成证明；Reader-UI contract 负责跨端语义，不是生产原生 renderer 完成证明。
5. 项目能力从 `项目能力缺口` 提升为 `现行承接` 时，必须同时补 route/state/event、设计代表稿、Core/Host mapping、三端任务与验收门槛，或记录明确的“无 UI”决策。

## 8. 验证与重审命令

以下命令从 `Reader-UI` 仓库根目录执行，用于验证当前合同分母和本矩阵所述的缺口；它们不替代 Core corpus 或三端设备证明：

```bash
# 当前合同分母
jq '.properties.id.enum | length' contracts/route.schema.json
jq '.properties.type.enum | length' contracts/ui-event.schema.json
jq '.properties.type.enum | length' contracts/core-command.schema.json
jq '.properties.type.enum | length' contracts/host-request.schema.json

# 检查能力 intake route；命中只证明已登记，不等于事件、业务、Host 或设备完成
jq '[.properties.id.enum[] | select(test("audio|manga|comic|pdf|mobi|umd|http.*tts|content-edit|change-cover|search-cover|download"; "i"))]' contracts/route.schema.json

# 检查仍未获得专用入口的能力；结果用于继续维护本矩阵，不直接决定 UI 形态
jq '[.properties.id.enum[] | select(test("audio|audiobook|mobi|umd|dict|txt.*toc"; "i"))]' contracts/route.schema.json

# Reader-UI 合同与 demo 门禁
node --test contracts/tests/*.test.mjs
node contracts/tests/validate.mjs
node frontend-demo-optimized/verify/contract/verify-demo-contract-consistency.mjs
node frontend-demo-optimized/verify/verify-p0-chain-matrix.mjs
node frontend-demo-optimized/verify/motion/verify-motion-coverage.mjs
```

Core 能力状态更新前应在 `Reader-Core-Native` 重新运行对应 crate/protocol/FFI/corpus 验证；原生 Host 状态更新前应在 iOS/Android/HarmonyOS 仓库分别提交构建、reducer/adapter test 和 App/device evidence。任何单仓命令通过都不能把本矩阵的全产品能力直接提升为完成。
