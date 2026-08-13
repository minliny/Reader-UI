# 阅读主链 Figma-first 差异矩阵

状态：`F0_BASELINE_INCOMPLETE_DO_NOT_CLAIM_PARITY`。本文件不是视觉完成声明，也不授权修改 Figma；它把当前“设计从哪里来”的问题变成可逐项关闭的门禁。

## 已定位的根因

HarmonyOS 目前的实际链路是：本地 fixture / route metadata → 手写 ArkUI → 本地 token、尺寸和 SVG。`frontend-demo-optimized` 还直接输出书架、详情和阅读控制层的视觉结构。Figma 因而只是人工参考，而不是本地构建可验证的输入；两边独立演进后，字体、圆角、图标、空态、控制栏和动效自然会漂移。

从现在起，职责固定如下：

| 归属 | 负责 | 不负责 |
| --- | --- | --- |
| Figma canonical master | 布局、Auto Layout/约束、字体、颜色、圆角、阴影、图标、可见状态、动效意图 | Core 调用、网络、文件选择、业务状态机 |
| Reader-UI / Core | 路由、UiEvent、状态 owner、数据、成功/失败语义、Host 合同 | 新画视觉或用 demo 决定视觉 |
| HarmonyOS | 按绑定 node 实现 ArkUI、系统文件/权限/设备能力、真实设备验收 | 用手写样式替代或补完 Figma 缺失界面 |

`23 · Pages · Final` 只能看作装配验收，不是设计真源；截图、普通 Frame、旧 revision 和 Reference Seeds 均不能替代 canonical master。

## 2026-07-23 current-node audit — 可实施差异，不是 parity 声明

下表来自当前 Figma canonical node 的只读代码/截图读取。`revision` 仍为
`null`，所以“已回填”仅表示 ArkUI 已按一个具名 node 的明确数值改动，绝不
表示已经完成像素或真机验证。

| 链路节点 | 当前 Figma 证据 | 当前 ArkUI 发现 | 分类 | 允许的修复 |
| --- | --- | --- | --- | --- |
| 书架 BookCard `493:196` / Phone List `493:191` | Phone cover `96.962×145.443`、Tablet `186.672×280`；两者都是圆角 8，且仅封面有 `0 8 26 rgba(89,70,50,.10)`。Phone List `493:191` 是 `350.903×71.988` 的无背景/无分隔行：`48×72` cover（`493:192`，shadow `0 6 12 rgba(52,38,26,.12)`）+ 10px gap + 内容列 + 10px gap + `34×34` More；More 图标源为 `271:333`。 | `BookCover` 已只保留准确阴影。`BookListRow` 已按 Phone 行结构改为无行背景、padding、separator；More 仅呈现，因 Figma 无 reaction 而不绑定操作。source/cache pills 是 Core 数据缺口，未编造文本。BookCard 也无 Figma press reaction，已去掉本地 pressed-card 表现。 | `drift` | 只待 Phone 同尺寸截图、字体和当前 revision；Figma 没有 Tablet List，必须 fail closed，不能缩放 Phone 行。 |
| 继续阅读 `493:200` / `2236:1382/1394` | Phone `350.903×100`，cover `61.997×92.995`；Tablet context `620×100`；阅读 action 可见 `81.997×40`，命中目标 44。Figma 只有 populated card。 | Core 的“恢复真实章节和位置”保持不变；ArkUI 现在仅在书架 loaded 且非空、continue data loaded/无错误且存在真实书籍时显示卡片。loading、无可用进度、失败和 local badge 均无 Figma 状态，已 fail closed。 | `unverified` | 不改恢复逻辑，只做 Phone/Tablet 截图测量。 |
| 书架 SectionAction `487:75` | `941:6`/`2236:1454` context 下有 Grid/List/Filter/Search/Settings 的 Default/Active 十个变体（`487:5/13/23/28/34/40/48/58/63/69`）；可见区 34，命中区 44，只有 Hover `.08` / Pressed `.12` 的橙色 interaction overlay。 | 原本 4 个本地圆角/pill 操作已改为 5 个 Figma 源读 vector；不再常驻橙色底或自行添加 business reaction。local bytes 尚未对官方当前 export 做验证。 | `drift` | 仅待 current revision 与同尺寸截图；保留既有 ReaderUiStore 路由/状态 owner，不从 interaction overlay 推导业务流程。 |
| BottomNav `344:379` | Phone `343:22` 是 `362×68`、白色 `.90` / `#C1C7CD` 1px、无 shadow；Tablet `343:246` 为 `82×266` 左侧导航，8px padding、四个 `66×58` item、6px gap，inactive transparent。 | 已移除通用 `0 8 26` shadow 和未选中纸色底。8 个 tab 图标均已从当前 BottomNav source read，但本地 byte / official revision 仍未验证。 | `drift` | 只待 current revision、同尺寸截图和 export-byte 核对；不得把当前读取称为 exact/parity。 |
| 详情 Hero `2260:1460`、Summary `2265:14` | Hero Phone/Tablet `350/720×152`，Section padding=`14`、1px border 后子项视觉 x/y=`15`，86×122 cover、14px content gap；Summary Phone `120.313`，Tablet `98.875`。 | `BookHero`/`BookSummaryCard` 已直接按具名 master 重建；旧文档中“15px padding”的说法已撤销。 | `drift` → `bound-code-pending-screenshot` | 仅校验同尺寸截图；local-book 隐藏换源是用户确认的业务例外。 |
| 详情 ChapterSection `2265:121`、ChapterRow `2266:66` | `282 = 1 + 48 + 4×58 + 1`；Selected 是 3px `#1B3C2D` 指示条 + 8% overlay，不是“当前”胶囊。目录按钮图标是 `2265:72` 的 20px 缩进列表。Phone Default/Pressed/Focus/Disabled/Loading/Selected=`2266:5/9/14/19/23/31`；Tablet=`2266:37/41/46/51/55/63`。 | 本地只有 Default/Selected 是具名当前绑定；Pressed/Focus/Disabled/Loading、字体和同尺寸截图仍未闭合。 | `drift` | 不再用“多显示几行”的本地推导改视觉密度，也不得把未闭合状态合并为一个本地“错误行”。 |
| 阅读页换源 `SourceSwitch/Window 568:134` | 当前组件页 `259:13` 已读 canonical Window=`568:134`、WindowHeader=`568:47`、CandidateList=`568:79`、Phone assembly=`568:209`。Window 为 `300×385`、Phone 右侧 12px 定位；尚未读到独立 Tablet terminal source。 | `SourceSwitchWindow` 已按当前 Window 静态接入；远程书候选项直接切换，本地书没有换源入口。 | `bound-code-pending-screenshot` | `2265:225 QuickSourceSheet` 只保留历史组件证据，不能再做运行时绑定。不得补确认按钮、状态矩阵、Tablet 终态或未定义动效。 |
| 详情恢复状态 `RetryStatus 2269:101`、`RecoveryAction 2274:211` | `RetryStatus` 已读 Loading/Error/Offline=`2269:77/89/100`（`352×180`）；`RecoveryAction` 已读 7 intent × 6 state 共 42 个子节点（`112×44`，完整矩阵见 F0 crosswalk/evidence）。official revision 仍不可读。 | `FigmaBookDetailRetryStatus` 已替换 `book-detail` 的现有 Loading/Error/Offline 视觉，保留 retry/guarded source-switch owner；`FigmaBookDetailRecoveryAction` 已按六种视觉状态建立，但无现有独立 intent branch，未强行挂载。 | `unverified` | 静态源测试/HAP 已过；仍需 Phone/Tablet 同尺寸截图和字体核对。不得用 DeleteDialog Failed 或无关按钮冒充，也不得为了展示 RecoveryAction 自行造流程。 |
| 详情删除弹窗 `2269:66` | canonical Default `2269:46` / Loading `2269:54` / Failed `2269:65`，`306×190` 居中危险操作卡，危险色 `#D7473E`。 | 全宽底部 sheet 已替换为该三态；本地保留 exact Core target、epoch 和失败重试，Loading 期间禁止 Back/backdrop 清事务。 | `drift` | 仅待字体与 Phone/Tablet 同尺寸截图；Figma 无 reaction，不能编造删除专属动效。 |
| Reader TopBar `1023:18380` | Phone `1023:18381`=`360×53.993`，Tablet `1023:18403`=`702×53.993`；Back/换源/More 触发区已读。Phone MoreHitArea/icon=`1023:18390/1023:18391`。 | `ReaderTopArea` 仍有本地 token/font/SVG 与 Figma 逐项未闭合。 | `drift` | 只按 TopBar master 和已记录 Tabler context 校对；不把 responsive parent `1023:18737` 当成 TopBar master。 |
| Reader More menu visual | 当前只读搜索未发现 canonical menu master 或 screen target；TopBar 只定义 trigger/icon。 | `ReaderTopArea.ReaderMorePanel` 是本地 214px 带阴影“刷新/缓存/调试”菜单，不能复用书架 action overlay。 | `figma-absent-fail-closed` | 收回该本地菜单可见 UI；More 的后续视觉 target 必须先由用户/Figma author 给出。可保留无视觉的业务 action contract。 |
| Reader Settings Phone `1023:17978` | 364.896×330，286×190 content + 37.995 brightness rail；翻页样式为 `覆盖/滑动/仿真/滚动/无动画` 的单轨。 | 原本错误复用了纵向 10 行设置；Phone 已换成 bound segmented tracks。Figma 没有 Tablet Settings quick variant。 | Phone `bound-code-pending-screenshot`；Tablet `figma-absent-fail-closed` | Phone 只校对截图；Tablet 不得按 Phone 比例自造。 |
| 阅读表面/图标/动效 | Figma Reader uses named Songti SC/Inter and explicit Tabler instances; page-turn Motion 仍无当前 timeline。 | 本地字体 fallback、SVG export hash、真实页面/滚动播放尚未逐项与 Figma 绑定。 | `unverified` | 先做 asset hash/font fallback 表和同尺寸截图；再单独进入 Motion，不用 source-string test 代替。 |

### 已立即移除的错误验收方式

- 不再把 `height(280)`、`5×46` 或“所有封面无 shadow”写成 Figma parity。
- 静态脚本现在只叫 **bound source guard**：它防止已读取 node 的实现倒退，不能替代 revision、icon export 或截图验收。
- 当前 Figma 确有封面阴影；系统性“正文左上角阴影”只能作为未绑定的错误视觉删除，不能误删 canonical cover shadow。
- `check_figma_shadow_allowlist.mjs` 只允许三个已读取 effect source：BookCard cover `493:196`、Phone List cover `493:192`、DeleteDialog `2269:66`；它是防回归 guard，不是视觉完成证据。

## 当前差异与处理动作

分类仅可使用：`exact`、`drift`、`figma-absent-fail-closed`、`authority-conflict`、`historical-only`、`unverified`。目前没有任何一项可标为 `exact`，因为当前官方 Figma revision 仍不可读，也没有同尺寸 ArkUI 对比证据。

| 页面/能力 | Figma 真源 | 当前本地实现 | 分类 | 允许的下一步 |
| --- | --- | --- | --- | --- |
| 书架默认页 | `Page/Bookshelf 941:6`；Phone `941:3`；Tablet `941:5` | `bookshelfV2` / `BookshelfShelfSection` 及手写 CSS | `unverified` | 读取 current revision 后，以 390×844、760×960 截图测量后逐项回写 |
| 继续阅读 | `Library/ContinueReadingCard 493:200`，上下文 `2236:1382/1394` | `ContinueReadingCard` + Core progress recovery；Figma-absent loading/error/no-progress card状态已隐藏 | `unverified` | 保留已确认的“恢复真实章节与位置”；只校对 populated card，不重建业务流程 |
| 书架封面/长按与 Phone List | `Library/BookCard 493:196`；Phone List `493:191` | `BookCard`、`BookCover`、`BookGrid`、`BookList` | `drift` | 保留封面直入阅读、长按书籍操作；Phone List 消费已读结构；Tablet List 不存在，fail closed |
| 书架分组动作 | `Library/SectionAction 487:75`；上下文 `941:6/2236:1454` | `ShelfSectionHeader` 的 Grid/List/Filter/Search/Settings | `drift` | 仅消费十个已读 Default/Active 资源；不得把 hover/press overlay 当业务 state |
| 书架底部导航 | `Navigation/BottomNav 344:379`；Phone `343:22`；Tablet `343:246` | `BottomNav` / `MainTabShell` | `drift` | 仅回填无 shadow/transparent inactive 表面；8 个图标 source-read 未 byte/revision 闭合 |
| 书架空态 | `State/BookshelfEmpty 286:31`（Phone 352×350） | `BookshelfEmptyState` | `unverified` | Core 无书时隐藏 Recent/Continue；只消费此 Phone master，Tablet 不得按比例自造；待同尺寸截图和 official revision |
| 本地导入结果 | `Library/LocalImportDialog 2657:918` / `State=Import Result 2657:917` | `FigmaLocalImportDialog` + 系统文件选择 | `unverified` | 系统选择器不属于 Figma；选择后只显示 Figma 结果弹窗的 processing/success/failure 行。不得恢复整页导入；Retry 在 Figma 无 reaction 前不绑定业务动作 |
| 书籍详情默认页 | `Page/Book Detail 941:10`；Phone `941:7`；Tablet `941:9` | `BookHero`、`BookSummaryCard`、`BookChapterList` | `unverified` | current master 已只读读取；official revision 与同尺寸结构/密度对比仍未完成 |
| 章节密度 | `ChapterRow 2266:66` / `ChapterSection 2265:121` | `BookChapterList` 采用 `4×58`、282 高和直接导出的目录图标 | `drift` | 只待同尺寸截图与其余 Figma row variants；不能由“多显示几行”反推数值 |
| 本地书换源 / remote 换源 | 当前运行时真源为 `SourceSwitch/Window 568:134`，Phone assembly=`568:209`；没有当前 Tablet binding。`QuickSourceSheet 2265:225` 是历史组件，不再代表当前终态。 | `canSwitchBookSourceId` 业务 guard + `SourceSwitchWindow` | `bound-code-pending-screenshot` | 保持本地书不显示/不执行换源；remote 候选项点击即切换。无 Figma source 的 Tablet/动效仍 fail closed。 |
| 删除/重试/恢复 | `2269:66` 的 Default/Loading/Failed 变体 | `OverlayHost`、`ReaderReducer`、`ReaderEffects` 已绑定到现有 Core 书架移除事务 | `drift` | 不新增流程；只使用 Figma 已有三态并保留本地 Core owner、epoch 和焦点规则 |
| 沉浸阅读表面 | `ReadingSurface 1023:18354`；Phone `1023:18355`；Tablet `1023:18371` | `ReaderBase`、`ReadingBackgroundLayer`、`ReadingTextFlow` | `unverified` | current master/variants 已读取；再在真机做长文本、分页和主题终态对比 |
| Reader Control 首页 | 响应式装配 Phone `1023:18737` / Tablet `1023:18745`；TopBar set `1023:18380`，ControlSheet set `1023:18713`，ControlDock set `1023:18726` | `ReaderTopArea`、`ReaderControlSheet`、`ReaderBottomBar`、本地 SVG | `unverified` | 已分离真实 master 与装配 parent；仍需 export byte、same-size ArkUI 与 per-module motion evidence，禁止按名字猜绑定 |
| Reader More | `TopBar 1023:18380` 仅有 trigger/icon | `ReaderTopArea.ReaderMorePanel` | `figma-absent-fail-closed` | 保持独立 Reader 控制栏；在用户/Figma author 给 menu node 前，收回本地带阴影 menu，不得复用书架长按菜单 |
| 控制栏图标 | `02 · Assets · Icons 270:2` 中 Tabler master | `reader_control_*.svg` | `unverified` | `F0_LOCAL_ASSET_PROVENANCE.json` 已记录每个资源的 `Figma node → context → ArkUI resource`；export byte 和同尺寸渲染仍未闭合，不能称正确 |
| 控制栏动效 | Review A `1276:2667`，展开/收起 `1505:16662/17003` | `ReaderControlMotionCoordinator`、本地 motion CSS/JS | `unverified` | 为每个 MotionId 对齐 trigger/from/to/interrupt/cleanup/reduced-motion；设备播放验证后才可关闭 |
| 书架 Cover/List | `1497:2`、`1497:811` 仅为视觉参考 | local motion spec | `unverified` | 只允许记录 `bookshelf.view.switch`；Figma 尚无 node-level production MotionId、interrupt/reduced-motion 证据，禁止复活 `cover-to-list/list-to-cover` 标签 |
| 封面进入阅读 | Review R `1548:17907` | motion policy 只有名称 | `unverified` | 实现可验证的 shared-element actor 前不得宣称 matched-cover 已完成 |

## 视觉来源泄漏点

下列文件暂时只允许修复行为、无障碍、状态 owner 或已有绑定的 Design Delta；任何视觉改动都必须先满足下方门禁。

| 本地文件 | 当前问题 | 约束 |
| --- | --- | --- |
| `frontend-demo-optimized/renderers/d2-bookshelf-discover-renderers.js` | 手写 `bookshelfV2`、`bookDetailV2` | 必须引用本 crosswalk 中的 current node + frozen Design Delta |
| `frontend-demo-optimized/renderers/d3-control-layers-renderers.js` | 手写全部 Reader control 布局 | Reader 同名组件冲突未解决前禁止视觉回写 |
| `frontend-demo-optimized/styles/12-bookshelf-vc3.css` | 本地推导 Tablet geometry | 只能作为实施候选，必须通过同尺寸验证 |
| `frontend-demo-optimized/styles/02a-reader-control.css` | 直接决定 sheet、阴影和控件尺寸 | 必须先解析 exact Reader control variant |
| `frontend-demo-optimized/styles/03c-reader-viewport.css` | 含 compact/landscape 旧规则 | 不得新增 compact；横屏一律 Tablet alias |
| `frontend-demo-optimized/motion-tokens.css`、`motion-controller.js`、`reader-control-transition.js` | 本地动效真源 | 每项要有 Figma timeline 和完整 Motion contract |
| `ReaderControlFigmaTokens.ets` | 手写快照放在 generated 目录 | 不视为 generator output 或 Figma crosswalk |

## 关闭顺序

1. 只读读取 Figma 官方 current revision；当前 connector 失败时记录 `null`，不能伪造。
2. 为每个表内 canonical master 建立 `fileKey + page + master + variant + revision → Reader-UI target → ArkUI target → icon asset → MotionId` 的 current binding，并保留 `revision:null`，直到 connector 可读。
3. 读取或由用户给出 Figma-absent Reader More 菜单视觉 target；没有 node 时只可 withhold，不能按本地菜单续画。
4. 冻结第一个 `FIGMA_DESIGN_DELTA`：必须写旧值、新值、node、Phone/Tablet、影响的 state/MotionId；没有 revision 不生成 frozen delta。
5. 串行实施书架 → 详情 → 阅读器 → 控制栏。每一页仅消费当页 delta；不顺手修改其它页面族。
6. 在相同 390×844 和 760×960 画布进行 Figma/ArkUI 静态截图比对；业务测试、Core 结果、设备截图分别留证，不相互替代。
7. 静态终态冻结后，单独进入 Motion：show/hide、press、activate、settle、interrupt/cancel、reduced-motion 都要有同一 MotionId 的证据。

在步骤 1–4 完成前，视觉工作处于 fail-closed；业务修复仍可继续，但它不得改变可见设计结果或凭空增加页面、弹窗、控件、状态、图标和动效。
