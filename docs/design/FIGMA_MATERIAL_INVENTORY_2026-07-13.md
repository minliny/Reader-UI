# Reader UI Figma 素材覆盖清单

执行日期：2026-07-13；Reader M2 复核更新：2026-07-14

状态：M0–M5 已形成素材、master 与响应式装配候选；最终视觉闭环待 VC0–VC3

Figma 文件：<https://www.figma.com/design/klhs2jMM4MncaJFqZMfqEK?node-id=426-3>

## 结论

当前已完成素材清理、来源分级、覆盖口径重建、共享导航、Shell Slot API、状态与 Overlay 属性化、Reader Control Home L1 候选链，以及 24 个页面/状态族的三档响应式 master 与候选实例矩阵。

本文后续沿用的“M0–M5 已完成”只表示当时定义的素材、结构、捕获或装配任务已有产物和内部检查，不表示用户逐页视觉确认、Figma 改版、Reader-UI 回写或浏览器闭环已经完成。最终视觉状态以 [静态视觉闭环计划](./VISUAL_CLOSURE_PLAN_2026-07-14.md) 为准。

Figma 中继续明确分开五种状态：`存在`、`分散`、`reference-only`、`可复用`、`缺失`。原始捕获仍不能直接进入最终页；本轮捕获在形成独立的 Phone/Compact/Tablet 页面级 component set 后，最终页只放实例。

本地 `frontend-demo-optimized/` 继续作为 route、structure、state、token、motion 和响应式行为的 runnable 权威源。Figma 承担视觉系统、组件 API、设计标注和评审，不替代可运行 demo。

## 当前实测计数

| 类型 | 数量 | 口径 |
| --- | ---: | --- |
| Pages | 25 | 新增 `23 · Pages · Final` 与 `24 · Responsive Masters · Phase 4` |
| Variable collections | 11 | 当前 Figma 本地集合 |
| Variables | 497 | 当前 Figma 全文件实测 |
| Text styles | 107 | 当前 Figma 全文件实测 |
| Effect styles | 16 | 当前 Figma 全文件实测 |
| Paint styles | 2 | 当前 Figma 全文件实测 |
| Components（含 variants） | 929 | 当前 Figma 全文件实测；存在不等于内部全部原子化 |
| Component sets | 115 | 当前 Figma 全文件实测 |
| Variants | 608 | 当前 Figma 全文件实测 |
| Tabler icon components | 139 | 128 个 outline 语义图标 + 11 个 filled 图标 |
| Raw cover images | 6 | 仓库原始封面 |
| Unique phone references | 35 | 原 13 个参考 + M3 六域 22 个实页状态 |
| Responsive live references | 12 | M4 六个布局族各补两个缺失的非手机实页视口 |
| Candidate responsive page sets | 25 | 24 个新页面级 Set + 既有 Reader Control Home Set；待 VC0–VC3 |
| Candidate viewport instances | 75 | 25 个 Set × Phone / Compact / Tablet；待视觉验收 |

这些数量描述的是“文件里有什么”，不能用来证明组件库已经完成。

## 五类覆盖矩阵

| 分类 | 当前内容 | 后续处理 |
| --- | --- | --- |
| 存在 | MainTabItem、BottomNav、IconButton、AppTopBar、BackTopBar；5 个 Shell Slot API；States/Overlays；viewport profile token；Library、Settings、Source Management、Source Switch；Reader L1 链；24 个响应式页面级 Set | 保持最终页只引用已验收实例 |
| 分散 | 历史 Reader Seed 与 08–16 旧捕获稿继续隔离 | 不从散落节点直接拼最终页 |
| Reference-only | 35 个手机实页参考；12 个 M4 响应式实页参考；Reader Baseline；State instance matrix；08–16 的捕获派生组件；14 个 Reader Seed | 只作视觉与坐标依据；节点已统一使用 `Reference/*` 命名或 `reader_ui/material_status=reference-only` 元数据 |
| 可复用 | 497 variables；107 text styles；16 effects；139 个 Tabler 图标组件；6 张原始封面；M1/M2 共享族；24 个页面级响应式 Set；Reader Control Home Set | 可被最终装配引用；仍须保持实页坐标校验 |
| 缺失 | 独立 Motion Reference、Figma MotionId/关键帧映射、集中 motion harness、自动 Figma → Reader-UI 代码同步、Code Connect release gate、Host 原生实现证明 | 不把静态 Figma 完成写成动效、代码或 Host 完成 |

## M0 已完成内容

1. 删除空白、会误导为“已有响应式实页证据”的三个页面：
   - `20 · Reference · Expanded`
   - `21 · Reference · Tablet`
   - `22 · Reference · Landscape`
2. 将原状态参考页和 Inventory 页归并为：
   - `20 · Reference · States`
   - `21 · Inventory`
3. 修正页面顺序为 `00`–`21`。
4. 将 08–16 产品域中从捕获稿拆出的素材统一标记为 `reference-only` / `capture-derived`，并使用 `Reference/CaptureDerived/*` 前缀。
5. 将 Reader Baseline、Reader Seed、Phone Reference 和 State Reference 明确为参考资产。
6. 在 `21 · Inventory` 重建五类覆盖矩阵、M0–M5 阶段门和事实规则。
7. 对 Inventory 做截图回归，修复多行文本高度与卡片自适应问题。

说明：Figma Plugin API 没有在本次流程中提供可验证的“禁止发布某个组件”开关。因此当前通过命名和共享元数据声明 `reference-only`；任何正式发布流程仍必须显式排除这些节点，不能宣称已经自动隐藏。

## M1 已完成内容

1. `Navigation/MainTabItem`：Phone/Tablet × Selected/Unselected 四个变体，图标为 24px Tabler 实例，标签和图标均暴露组件属性。
2. `Navigation/BottomNav`：Phone/Tablet × 四个 active-tab 共八个变体，内部只复用 MainTabItem。
3. `Navigation/IconButton`、`Navigation/AppTopBar`、`Navigation/BackTopBar`：按 390px 实页的 44px 点击区、24px 图标、58px 顶栏、10/18px 间距重建并截图验收。
4. 五个 Shell 保持原 demo 尺寸和坐标，将文字 Frame 占位改成真实 `INSTANCE_SWAP` Slot；Main/Library/Settings 默认接入已验收的 TopBar/Nav 组件。
5. `Overlay/Toast`、`Overlay/Dialog`、`Overlay/BottomSheet`、`State/StatusPanel`、`State/DiscoverFeedback` 已补齐文本、操作和显隐属性；BottomSheet 的第三项显隐已绑定到整行而非单独文字。
6. M1 结构矩阵通过：五个 Shell 无残留 Slot Frame、所有槽位坐标未变化、状态与 Overlay 属性均绑定到实际节点。

## M2 状态：五域与 Reader 已完成

Library 页面新增独立的 `M2 · Library Reusable Components` 文档区（`487:2`），没有修改或晋升旧的 `Reference/CaptureDerived/Library & Import` 根节点。

已完成并通过程序坐标矩阵与截图复核的 reusable 组件：

1. `Library/SectionAction`（`487:75`）与 `Library/SectionHeader`（`487:228`）：34px 点击区、20px 本地 Tabler 图标、封面/列表/筛选状态。
2. `Library/BookCover`（`493:185`）：6 张本地 demo 书封；`Library/BookCard`（`493:196`）：Cover/List 与 1/2 行标题容量。
3. `Library/ContinueAction`（`493:198`）与 `Library/ContinueReadingCard`（`493:200`）。
4. `Library/InlineRouteButton`（`500:182`）、`Library/ChapterRow`（`500:193`）、`Library/DetailActionButton`（`500:199`）、`Library/BookDetailActionBar`（`500:200`）。
5. `Library/SourceInlineAction`（`504:192`）、`Library/BookDetailHero`（`504:194`）、`Library/BookSummaryCard`（`504:209`）、`Library/ChapterSection`（`505:184`）。

验收依据是本地 `bookshelf` 和 `book-detail` 的 390×844 实页测量，不是旧捕获组件。当前证据：`/tmp/reader-m2-library-complete.png`、`/tmp/reader-m2-library-detail-hero-final.png`、`/tmp/reader-m2-library-detail-actions.png`。Library 的加载、离线、无目录、已移除、Import 等代表状态仍属于 M3，不在 M2 正常态内猜画。

Settings 页面新增独立的 `M2 · Settings Reusable Components` 文档区（`518:6`），旧 `Reference/CaptureDerived/Settings & About` 根节点没有被晋升。

已完成并通过实页坐标矩阵与截图复核的 Settings 组件：

1. Settings 首页：`Settings/LeadingIcon`（`518:44`）、`Settings/TrailingChevron`（`518:45`）、`Settings/NavigationRow`（`518:50`）、`Settings/CategorySection`（`518:63`）。
2. 通用设置图标与控件：`Settings/GeneralRowIcon`（`530:165`）直接使用从本地实页提取的 12 个 Tabler SVG；`Settings/Switch`（`531:108`）、`Settings/StatusBadge`（`531:115`）、`Settings/InlineAction`（`531:116`）按最终浏览器渲染尺寸构建。
3. 行结构：`Settings/ValueTrailing`（`531:118`）、`Settings/RichTrailing`（`531:125`）、`Settings/ActionTrailing`（`534:157`）、`Settings/BadgeSwitchTrailing`（`534:160`）与六变体 `Settings/SettingRow`（`534:248`）。
4. 实页分组：`Settings/GeneralSection`（`535:411`）包含“基础偏好 / 行为与反馈 / 系统权限”三个固定标题 variant；`Settings/DangerActionRow`（`535:412`）对应“恢复默认”。

验收依据是本地 `settings` 与 `settings-general` 的 390×844 实页，不是历史捕获稿。程序校验覆盖 12 个图标、44×24/20px 开关、24×18/7px 状态点、六种行结构、三种分组尺寸和危险操作行，当前为零失败；截图证据为 `/tmp/reader-m2-settings-home.png`、`/tmp/reader-m2-settings-sections.png`、`/tmp/reader-m2-settings-complete.png`。About 及非正常态继续留在 M3。

Source Management 页面新增独立文档区 `M2 · Source Management Reusable Components`（`545:170`），旧 `Reference/CaptureDerived/Source Management · Needs M2`（`392:2`）保持 reference-only。

已完成并通过实页坐标矩阵与截图复核的 Source Management 组件：

1. `SourceManagement/Icon`（`546:41`）：8 个来自当前本地 demo 的 Tabler SVG，分别按指标卡 20px 与行控件 15px 实例化。
2. `SourceManagement/MetricCard`（`547:3`）与 `SourceManagement/MetricGrid`（`547:12`）：171.454×55.998 指标卡、350.903×119.991 的 2×2 实页矩阵。
3. `SourceManagement/StateControl`（`549:51`）、`SourceManagement/SourceRow`（`549:52`）、`SourceManagement/SourceList`（`549:67`）：复用 Settings 的 44×24 Switch 与 24×18 StatusBadge，补齐 muted/off 状态和双行书源信息。
4. `SourceManagement/ActionRow`（`550:155`）与 `SourceManagement/ActionSection`（`550:156`）：五个固定语义动作复用 `Settings/InlineAction`，不复制按钮视觉。
5. `SourceManagement/FooterAction`（`550:239`）与 `SourceManagement/FooterActionList`（`550:240`）：新增书源和批量删除两种语义。

验收依据是本地 `source-management` 的 390×844 实页。11 项程序校验覆盖图标来源、指标卡/矩阵、三种状态、双行书源行、4 行列表、5 个批量动作、2 个底部动作及 reference-only 边界，当前为零失败；截图证据为 `/tmp/reader-m2-source-management.png`。

Reader 旧文档区 `560:61` 已于 2026-07-14 删除。旧区的 4 个组件集存在变体全部堆叠在 `(0,0)`、图标和组合组件失真的问题，原“已完成”结论作废。

当前 Reader 重建区为 `M2 · Reader Reusable Components`（`654:500`）：

1. 13 个 `Reader/Icon/*` 独立组件直接来自已验证 `226:2` 捕获中的当前 Tabler 路径，不再用 Name 轴把不同图标堆成一个组件集。
2. `Reader/PhoneControlHome`（`654:674`）与 `226:2` 同尺寸截图的主体像素一致率约 99.992%；`Reader/ReadingSurface`（`654:692`）和 `Reader/ImmersiveInfo`（`654:693`）分别保留 390×844 正文表面与 340.903×794.783 信息层。
3. `Reader/QuickAction`（`654:739`）、`Reader/ChapterStep`（`654:748`）和 `Reader/ModuleButton`（`654:781`）的 3 / 2 / 4 个变体均有唯一坐标，零堆叠、零越界。
4. `Reader/TopBar`（`654:719`）、`Reader/QuickActionPanel`（`654:799`）、`Reader/ChapterProgress`（`654:819`）、`Reader/BrightnessRail`（`654:829`）、`Reader/ModuleNav`（`654:859`）、`Reader/ControlMain`（`654:896`）、`Reader/ControlSheet`（`654:944`）与 `Reader/ControlDock`（`654:1022`）均为 source-exact 子树。
5. 当前区共 27 个直接素材入口、33 个 component、3 个 component set；结构检查为零缺失、零未标记、零变体越界。

Reader Control Home 后续已在 `15 · Reader` 中完成 13 个响应式 L1 component set，并形成最终 `Reader/Responsive/ControlHome`（`819:11132`）。7 个快捷/模块态与 4 个完整控制页也已形成 Phone/Compact/Tablet 页面级 master。HTML-to-Figma 纸张复合背景造成的左上色块已在 33 个 Reader variants 中统一移除，Reader 现计入可复用完成。

Source Switch 页面新增独立文档区 `M2 · Source Switch Reusable Components`（`566:49`），旧 `Reference/CaptureDerived/Source Switch · Needs M2`（`311:416`）保持 reference-only。

已完成并通过实页坐标矩阵与截图复核的 Source Switch 组件：

1. `SourceSwitch/Icon`（`566:67`）：`SwitchHorizontal` 与 `Close` 两个 variant 分别实例化本地图标 master `Icon/SourceSwitch`（`271:532`）和 `Icon/Close`（`271:142`），可见尺寸为 18px / 20px，没有手绘路径。
2. `SourceSwitch/CloseButton`（`568:40`）与 `SourceSwitch/WindowHeader`（`568:47`）：24×24/R8 关闭目标，以及 280.903×31.997 的 20px 图标列、标题填充列、50px 排序列和 24px 关闭列。
3. `SourceSwitch/CandidateRow`（`568:78`）与 `SourceSwitch/CandidateList`（`568:79`）：Current / Available / Unavailable 三态，11 个 31.9965px 候选行和 10 条 0.556px 分隔线；书源名、延迟和章节均暴露文本属性。
4. `SourceSwitch/Window`（`568:134`）：300×391.892、R24，内部锚点为 header x9.549/y7.552、list x9.549/y39.548。
5. `SourceSwitch/Overlay`（`568:209`）：390×844，只实例化已验收的 Reader 组件并保持实页 z 轴顺序：ReadingSurface → TopBar → ControlSheet → SourceSwitch Window → ModuleNav。

验收依据是本地 `source-switch` 的 390×844 最终浏览器渲染。7 项顶层组件矩阵、2 项 Tabler master 来源、11 行/10 分隔线、窗口与 Overlay 锚点、零尺寸和 reference 泄漏检查均通过；截图证据为 `/tmp/reader-m2-source-switch-complete.png`。

## M3 已完成：Library 与 Import 代表状态（5/22）

Library & Import 页面新增 `M3 · Live References · Library & Import`（`580:198`），只容纳 HTML-to-Figma 实页捕获，不创建组件、变量或样式。

当前已完成 5 个 390×843.889 reference-only Frame：

1. `bookshelf-empty`（`574:198`）：主 Tab 空书架状态。
2. `import-permission-denied`（`576:198`）：导入权限错误与恢复动作。
3. `import-parsing`（`578:198`）：导入解析进度状态。
4. `import-conflict-resolve`（`577:198`）：导入冲突处理状态。
5. `import-partial-success`（`579:198`）：部分成功结果状态。

五个节点均使用 `Reference/LiveCapture/M3/*` 命名，并写入 `reader_ui/material_status=reference-only`、route source 和 `390x844` viewport 元数据。几何、parent、reference 状态和组件泄漏检查均为零失败；域截图为 `/tmp/reader-m3-library-import-references.png`。HTML 捕获把系统 sans 映射为 Inter、宋体保留为 Songti SC，因此这些 Frame 不能作为字体 token 或可复用组件来源；正式组件仍使用已验收的 Noto Sans/Serif Text Style。

## M3 已完成：Discover 代表状态（9/22）

Discover 页面新增 `M3 · Live References · Discover`（`589:2`），集中收纳 4 个 390×843.889 reference-only Frame：

1. `discover-loading`（`586:29`）：排行榜骨架加载态。
2. `discover-no-results`（`585:29`）：筛选无结果与恢复动作。
3. `discover-entry-error`（`587:29`）：发现入口展开及解析失败反馈。
4. `discover-cache-confirm`（`588:29`）：清理发现缓存确认 Dialog。

四个节点均来自本地 390×844 实页，使用 `Reference/LiveCapture/M3/*` 命名，并写入 reference-only、route、viewport 和 domain 元数据。整域一次性检查覆盖尺寸、坐标、parent、共享状态和组件泄漏，均为零失败；整域截图为 `/tmp/reader-m3-discover-references.png`。本域没有新增 component、variant、variable、style，也不把 HTML 捕获字体映射纳入 token。

## M3 已完成：RSS 代表状态（13/22）

RSS 页面新增 `M3 · Live References · RSS`（`596:2`），集中收纳 4 个 390×843.889 reference-only Frame：

1. `rss-refreshing`（`594:2`）：刷新订阅、订阅源状态与最近未读。
2. `rss-empty`（`592:2`）：RSS 空状态与恢复入口。
3. `rss-error`（`591:2`）：订阅刷新失败及分项错误。
4. `rss-detail`（`593:2`）：RSS 文章阅读详情。

四个节点均来自本地 390×844 实页，旧 capture-derived RSS 节点没有被晋升。整域一次性检查覆盖尺寸、坐标、parent、reference-only 元数据和组件泄漏，均为零失败；整域截图为 `/tmp/reader-m3-rss-references.png`。本域没有新增 component、variant、variable 或 style。

## M3 已完成：Search 代表状态（16/22）

Search 页面新增 `M3 · Live References · Search`（`603:2`），集中收纳 3 个 390×843.889 reference-only Frame：

1. `search-loading`（`601:3`）：搜索请求进行中。
2. `search-empty`（`599:3`）：无搜索结果与恢复入口。
3. `search-error`（`600:3`）：搜索失败与书源管理入口。

正常搜索首页与结果页已有 `379:2`、`381:2` 两个独立实页参考，本域没有重复捕获。三项尺寸、坐标、parent、reference-only 元数据和组件泄漏检查均为零失败；整域截图为 `/tmp/reader-m3-search-references.png`。本域没有新增 component、variant、variable 或 style。

## M3 已完成：Sync / Restore 代表状态（20/22）

Sync 页面新增 `M3 · Live References · Sync & Restore`（`611:2`），集中收纳 4 个 390×843.889 reference-only Frame：

1. `sync-error`（`606:25`）：同步错误与恢复动作。
2. `restore-preview`（`609:25`）：恢复内容预览。
3. `restore-conflict`（`608:25`）：恢复冲突逐项选择与批量处理。
4. `restore-result`（`607:25`）：恢复结果与分类统计。

既有正常同步、WebDAV 和恢复进度参考继续保留，本域没有重复捕获，也没有晋升旧 capture-derived 节点。四项尺寸、坐标、parent、reference-only 元数据和组件泄漏检查均为零失败；整域截图为 `/tmp/reader-m3-sync-restore-references.png`。本域没有新增 component、variant、variable 或 style。

## M3 已完成：About 代表状态与跨域门禁（22/22）

Settings & About 页面新增 `M3 · Live References · About`（`617:2`），集中收纳：

1. `about`（`614:334`）：项目介绍、团队、法律入口。
2. `about-version`（`615:334`）：版本、构建、发布日期与更新日志。

两个节点均为本地 390×844 实页直接捕获，节点本体为 390×843.889；整域截图为 `/tmp/reader-m3-about-references.png`。最终跨域门禁覆盖 6 个 wrapper 和 22 个状态节点：missing、geometry、parent、reference status、component leakage、wrapper schema 均为 0 失败。Figma components 保持 613、component sets 保持 57，证明 M3 捕获没有生成或污染 reusable 组件。Library/Import 早期节点的 route 与 wrapper 元数据已统一到跨域 schema；仓库中临时 HTML-to-Figma capture script 已删除。

## M4 已完成：六布局族响应式实页矩阵

新增 `22 · Reference · Responsive`（`624:2`），不是空白占位页；页面包含说明区 `624:3`、6 个 family wrapper 和 12 个本地实页捕获。

M4 没有把 6 个 viewport profile 与全部页面做笛卡尔积，而是复用 M2/M3 已验收的 Phone / Stack Phone 基线，只补真正缺失的非手机证据：

1. Main Tab / `bookshelf`：Expanded `629:2`、Tablet `630:2`，wrapper `638:2`。
2. Library Stack / `book-detail`：Expanded `628:2`、Tablet `625:2`，wrapper `638:7`。
3. Settings Stack / `settings-general`：Expanded `627:2`、Tablet `626:2`，wrapper `638:12`。
4. Reader Control / `reader`：Tablet `634:2`、Compact Landscape `631:2`，wrapper `638:17`。
5. Flow Continuity / `source-switch`：Tablet `635:2`、Compact Landscape `640:2`，wrapper `638:22`。
6. Wide Workspace / `restore-preview`：Wide `633:2`、Compact Landscape `632:2`，wrapper `638:27`。

浏览器一次性实页审计 12/12 命中预期 route、layout、viewport class 和输入尺寸；Figma 矩阵的 missing、wrapper schema、geometry、parent、reference status、component leakage 均为 0 失败。Components 仍为 613、component sets 仍为 57。整页证据为 `/tmp/reader-m4-responsive-matrix.png`。

审计同时发现本地 demo 的 `source-switch` 在 Compact Landscape 下把候选窗口压成 0 高度。该问题属于 Codex 可修的响应式锚点错误，不在 Figma 补画：`styles/06-responsive.css` 现在把候选窗口固定在左侧 420×300 阅读平面，Reader dock 保持右侧且不重叠；错误捕获 `636:2` 已删除，修正捕获为 `640:2`，放大证据为 `/tmp/reader-m4-flow-compact-fixed.png`。新增回归用例后 `reader-control-continuity` 13/13、Phase 0/1 6/6、Settings viewport 8/8、contract consistency 均通过；临时 capture script 已删除。

## M5 已装配：响应式候选页面矩阵

1. 从当前 demo 锁定 24 个实际页面/状态族，每个族均有 Phone、Compact、Tablet 三个实页基线，共 72 个捕获。
2. 72 个基线转为 `Final Responsive Page Masters · 24 Sets`（`941:2`）中的 24 个页面级 component set；原始捕获不留在候选装配页。
3. `23 · Pages · Final`（`834:2`）按 13 个产品分区装配 25 个 Set、75 个顶层 viewport 实例；额外的 1 个 Set 是既有 `Reader/Responsive/ControlHome`（`819:11132`）。`Final` 是节点名，不是当前验收结论。
4. 候选装配结构检查为：13 个分区、75 个带历史 final 标记的 viewport 实例、0 detached instance、0 原始捕获屏幕 Frame、0 临时 capture 节点；节点标记不等于最终视觉结论。
5. Compact 尺寸遵循实页事实：MainTab/Library/Settings 类页面保持居中的 390×390 设备画布；Reader/Flow/Restore Preview 使用 844×390 全宽画布；Tablet 统一为 760×960。
6. 纸张纹理的 HTML-to-Figma IMAGE/RADIAL 解析会产生左上色块；Reader 33 个正文 variant 已改为安全的基础线性纸张色，视觉抽查无残留色块。
7. 本轮“全量”是产品页面/状态族覆盖，不将 235 个 route 与 alias 重复绘成 235 张 Figma 页面。

## 当前页面结构

| Page | 当前定位 |
| --- | --- |
| `00 · Cover` | 文件边界与来源说明 |
| `01 · Foundations` | 变量、排版、效果等基础素材 |
| `02 · Assets · Icons` | 139 个 Tabler 图标组件 |
| `03 · Assets · Covers` | 6 张仓库原始封面 |
| `04 · Viewports` | viewport profile token；不是响应式实页证据 |
| `05 · Navigation & Shells` | M1 共享导航、TopBar 和五个 Shell Slot API 已通过 |
| `06 · Shared Primitives` | 已存在，等待 M1/M2 结构验收 |
| `07 · States & Overlays` | M1 文本、操作与显隐属性已通过 |
| `08 · Library & Import` | Library 正常态 reusable 组件链已完成；M3 已补 5 个 Library/Import 实页状态；旧 capture-derived 节点仍为 reference-only |
| `09 · Discover` | M3 已补 loading、无结果、入口错误、清缓存确认 4 个实页状态；旧 capture-derived 节点仍为 reference-only |
| `10 · RSS` | M3 已补 refreshing、empty、error、detail 4 个实页状态；旧 capture-derived 节点仍为 reference-only |
| `11 · Search` | 已有 normal before/results 实页参考；M3 已补 loading、empty、error 3 个状态；旧 capture-derived 节点仍为 reference-only |
| `12 · Settings & About` | Settings reusable 组件链已完成；M3 已补 about、about-version 两个实页参考；旧 capture-derived 节点仍为 reference-only |
| `13 · Source Management` | reusable 组件链已完成；旧 capture-derived 节点仍为 reference-only |
| `14 · Sync · Backup · Restore` | 已有 normal、WebDAV、restore progress 实页参考；M3 已补 sync-error、restore-preview、restore-conflict、restore-result；旧 capture-derived 节点仍为 reference-only |
| `15 · Reader` | reusable 组件链已完成；旧 capture-derived 与 Reader Seed 仍为 reference-only |
| `16 · Source Switch` | reusable 组件链已完成；旧 capture-derived 根节点仍为 reference-only |
| `17 · Reference · Reader Baseline` | 已确认 Reader 控制层视觉基准，仅作参考 |
| `18 · Reference · Reader Seeds` | 14 个历史依赖 seed，仅作参考；新组件使用 Tabler |
| `19 · Reference · Phone` | 集中的手机实页参考 |
| `20 · Reference · States` | 状态实例参考矩阵 |
| `21 · Inventory` | 五类覆盖矩阵与 M0–M5 阶段门 |
| `22 · Reference · Responsive` | M4 六布局族、12 个非手机实页参考和 Phone/Stack Phone 基线复用说明 |
| `23 · Pages · Final` | 13 个产品分区、25 个响应式 Set、75 个最终 viewport 实例 |
| `24 · Responsive Masters · Phase 4` | 24 个页面级响应式 component set、72 个 Phone/Compact/Tablet variants |

## Tabler 图标边界

- 通用 UI 图标统一使用当前仓库纳入的开源 Tabler SVG，不再手绘近似图标。
- Figma 当前有 139 个 Tabler 组件，其中 128 个为 outline 语义图标，11 个为 filled 状态图标。
- Reader 专属语义优先由 Tabler 组合表达；只有 Tabler 无法表达且 demo 有明确原始证据时，才允许新增专属图形。
- `18 · Reference · Reader Seeds` 仍保留，是因为旧捕获组件存在实例依赖；它们不是后续新组件的图标源。

## 后续阶段门

| 阶段 | 状态 | 完成条件 |
| --- | --- | --- |
| M0 | 完成 | 清理、重分类、五类 Inventory 和截图回归完成 |
| M1 | 完成 | MainTabItem/BottomNav、AppTopBar/BackTopBar/IconButton、五个 Shell Slot API、State/Overlay 属性已通过结构与截图验收 |
| M2 | 完成 | Reader Control Home L1 链、7 个快捷/模块态和 4 个完整控制页均已通过 |
| M3 | 完成 | 六个域 22 个代表状态全部为本地实页捕获，跨域结构门禁与整域截图均通过 |
| M4 | 完成 | 六布局族均形成三视口证据；新增 12 个非手机实页参考并通过整页截图与结构矩阵 |
| M5 | 完成 | 24 个页面/状态族、25 个 Set、75 个三档实例通过结构与整节截图验收 |

## 权威与同步边界

- Figma 修改不会自动修改本地 Git。
- 本地 demo 修改也不会自动覆盖 Figma。
- 当前仓库没有经过验证的 Figma → Reader-UI 自动同步、双向镜像或 Code Connect release gate。
- Figma 中确认的变化必须由 Codex 显式映射为 token、component、shell、fixture 或 renderer 变更，再运行浏览器和仓库门禁。
- 后续 Figma 变更仍必须显式回写代码；M5 完成不等于自动代码同步或 Host 实现完成。
