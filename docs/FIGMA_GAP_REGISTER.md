# Figma 缺口登记与未阻塞的前端执行流程

记录日期：2026-08-05（对 08-04 版的重新审计）
唯一视觉来源：[Reader UI - Phase 2 Design System](https://www.figma.com/design/klhs2jMM4MncaJFqZMfqEK)
本次依据：对 `23 · Pages · Final`、`24 · Responsive Masters · Phase 4`、`08 · Components · Library & Import`、`02 · Assets · Covers`、`07 · Components · States & Overlays`、`25 · Motion Reference` 的只读 Plugin API 检查。

## 1. 使用规则

本文件只登记当前实时 Figma 中的缺口、暂停边界和工作顺序；它不是设计稿、导出物、Token、生成输入或第二视觉来源。

- 可见页面、组件、状态、素材、响应式规则和动效轨迹，只有 Figma 可以定义或补齐。
- Reader Core 定义正文、章节、搜索、书源、同步、阅读位置与持久化；HarmonyOS Host 定义文件、网络、存储和系统能力。
- 本地不得用默认样式、通用动效、示例像素或其他端实现补齐 Figma 缺口。
- 缺口关闭后，必须重新读取相应 Figma 节点；本文件只能更新登记结果，不能替代重新读取。

## 2. 2026-08-05 重新审计：已关闭 / 已解决项

下列缺口在 08-04 版仍登记为未闭合，本次重新读取 Figma 后确认已关闭或已由用户决策解决。**不再阻塞对应实现。**

| 登记号 | 原登记 | 本次结论 | 依据 / 决策 |
| --- | --- | --- | --- |
| 封面无封面变体 | 缺 `BookCover` 无封面状态 | ✅ **已关闭** | `Library/BookCover` `493:185` 已新增 `Book=NoCover` 变体 `3612:1796`。无封面书现在有已定义视觉。 |
| `B-BOOKSHELF-TITLELINES-01` | 非默认封面 `TitleLines` 无选择规则 | ✅ **已关闭** | `Library/BookCard` `493:196` 提供 `TitleLines=1/2` 多组变体；产品已明确运行时一律按 `TitleLines=1`（单行）实现。两行变体仅为示例/设计变体，非运行规则。 |
| 无进度书架场景 | 缺"有书但无阅读进度"的 Continue Reading 缺失页 | ✅ **已关闭** | `Page/Bookshelf` `941:6` 已正式补齐 `Viewport × ReadingProgress` 四变体：Phone/Tablet 各自 `Available | None`（`941:3` / `941:5` / `3579:11530` / `3579:11575`）。`None` 移除 `ContinueReading`，保留原 `Container` 纵向自动布局（间距 8）；结构复核：`Available` 书架起点 y=116，`None` 为 y=8。未新增字体、颜色 token、图标、动效。导入后无阅读进度映射到 `None` 变体。 |
| `B-IMPORT-FONT-01`（动态中文字体） | Songti SC Bold 无可再分发字体 | 🟡 **已解决（临时）** | 用户决策：动态中文字体改用**思源宋体（Source Han Serif）**临时替代。固定标题继续用 Figma 导出轮廓 SVG。发布/授权仍是待办。 |
| `A-APP-ICON-01`（应用图标） | Figma 无 app-icon 节点 | 🟡 **已解决（暂定）** | 用户决策：初版图标**暂定**为已授权的 1254×1254 PNG（launcher 图标）。Figma 长期图标权威仍待补。 |

## 3. 当前仍存缺口

> 本节条目若与 §7 用户范围决策冲突，以 §7 为准：Discover/RSS 占位-only 已撤出；`N-COVER-HERO-01`、`H-NOTE-1`、`B-BOOKSHELF-LIST-02`、`S-SEARCH-EMPTY-HISTORY-01` 已按决策关闭；`R-COMPACT-01` 折叠屏降级 out-of-scope。

### 3.1 动效与翻页类 —— 用户已指示暂时搁置

下列「动效类」缺口在本次审计中**不展开、不求解、不推进**，统一搁置等待 Figma 补齐。搁置期间不实现任何作用域内动效，静态终态与业务不暂停。

| 登记号 | 作用域 | 搁置原因 |
| --- | --- | --- |
| `M-RESP-01` | TabletExpanded 所有非零动效、五种翻页多端 | 只有 Phone 轨迹，无 Tablet 轨迹/跨尺寸映射 |
| `M-PANEL-01` | 阅读面板展开/收起动画 | MR1 已新增 `Spec · reader.panel.expand/collapse` 框架节点（`2672:49089` / `2672:49094`，含 MotionId/State/Timing/Reduced 字段），但值未填、无逐轨关键帧/缓动 |
| `PT-INPUT-01` | 全部 `reader.page.turn.*` 前端 | 无 prototype reaction：触发/拖动/阈值/取消/提交/反向/重排恢复 |
| `PT-SLIDE-COVER-01` | slide、cover | 仅 review-only、仅 next、仅 Phone |
| `M-REVIEW-01` | 其余 Review 动效（AutoPage/TTS/书架切换等） | 无生产 MotionId/轨迹，正式 Motion Contract 仅 6 项 |

> 记录：`M-REVIEW-01` 中 Phone 已完整定义的 4 项阅读控制动效（`reader.control.show/hide`、`reader.quick.promote`、`reader.module.switch`）在搁置期也不实现，统一等 Figma 补齐后再恢复。

### 3.2 Book Detail 缺失（详细）

本次全面重读 `24 · Responsive Masters · Phase 4` 的 `F2 · Book Detail · Canonical + Evidence`（`2260:1417`）与 `Page/Book Detail`（`941:10`），确认 Book Detail 的**状态组件体系已相当完整**，修正 08-04 版"上述状态全缺"的登记。

**已具备（组件级状态全覆盖）：**
- `Library/BookDetail/Hero`（`2260:1438/1459/11403/11424`）：Phone/Tablet × SourceType=Remote/Local 四变体
- `Library/BookDetail/Summary`（`2265:7/13`）：Phone/Tablet
- `Library/BookDetail/ChapterSection`（`2265:93/120`）：Phone/Tablet
- `Library/BookDetail/ActionBar`（`2265:181/187`）：Phone/Tablet
- `Library/BookDetail/ChapterRow`（`2266:5-63`）：Phone/Tablet × Default/Pressed/Focus/Disabled/Loading/Selected 六态
- `Library/BookDetail/DeleteDialog`（`2269:46/54/65`）：Default/Loading/Failed
- `Library/BookDetail/RetryStatus`（`2269:77/89/100`）：Loading/Error/Offline
- `Library/BookDetail/RecoveryAction`（`2274:87-210`）：7 意图（NetworkRetry/TocRetry/SourceSwitchInline/SourceSwitchBottom/SourceDebug/Readd/ReturnBookshelf）× 6 状态

**仍缺失的局部状态：**
1. **Hero 无 NoCover 落位**：`BookDetailHero` 的封面是固定 `Image（长夜余火封面）` frame（`2260:1419`），组件集只有 Remote/Local 四变体，无 `NoCover` 变体。`Library/BookCover` 已有 `NoCover`（`3612:1796`），但 Hero 封面切到无封面的落位规则未定义。
2. **Hero / Summary 区块无页面级 loading / empty / error 变体**：虽有通用 `RetryStatus` / `RecoveryAction` / `ChapterRow Loading` 等，但 Hero 与 Summary 两个区块本身没有 loading（加载中封面/标题）、empty（简介为空）、error（加载失败）的页面级装配变体。
3. **Summary 空态**：简介为空时无可见状态。
4. **长内容溢出**：长书名（Title）、长作者（Author）、超长简介（Summary Body）、多章节的截断/省略/滚动规则未定义。

**工程侧当前可先行**：Local Detail 的真实数据读取（`local_book.toc`、`local_book.chapter.content`、`reading.progress.get`、`reader.location.resolve`）不依赖上述状态缺口，可继续。不可做：为 Hero 无封面/loading/error/长内容补近似视觉。

### 3.3 响应式类（详细）

1. **`R-COMPACT-01` Compact 视口缺失**：重读 `24 · Responsive Masters · Phase 4`（`834:3`）确认 21 个页面 Master 全部只提供 **Phone 与 Tablet**（ReadingSurface 的 Tablet 名为 TabletExpanded），均无 Compact 变体。Compact 的可见布局、字体/网格/抽屉位置、切换阈值、与 Phone/Tablet 的约束仍不存在。→ 影响所有 Compact 页面实现与验收。**禁止从 Phone/Tablet 推导 Compact。**
2. **`R-TOC-READING-01` 已关闭（2026-08-05）**：实时 Figma 已将 `Reader Module Directory / Tablet`（`942:60`）的 `Article - 正文排版层`（`917:7`）恢复为 canonical `ReadingContent`（`1023:18373`）的 x44.444、y92.444、**w670**、h810；标题与五个段落容器均为 670 宽，五段正文恢复为 `FILL × HUG`。目录是覆盖层，**不压缩正文**；本地 overlay 也不需额外宽度逻辑。

### 3.4 元数据类剩余（详细）

1. **`B-BOOKSHELF-LIST-01` Phone List 书架无 Final 静态页**：`25 · Motion Reference` 的 Review G `1497:2` 含 `BookCollection/List` `1497:51`，但 `23 · Pages · Final` 没有 List 模式的静态书架终态；Review 转场层不是静态页面合同。→ 影响 Phone List 书架页、Cover↔List 切换、列表滚动起点。**禁止把 Review 转场层提升为 Final。**
2. **`B-BOOKSHELF-LIST-TABLET-01` Tablet List 缺失**：`Library/BookCard` 的 List 变体只提供 Phone；`23 · Pages · Final` 的 Tablet `943:437` 只有 Cover。→ 影响 Tablet List 书架及其任何切换。
3. **`B-BOOKSHELF-LIST-METADATA-01` 行元数据映射**：Phone List 行组件固定绘制 `网络书` 和 `已缓存` 两个 64×18 标签。Figma 没有本地书、未缓存、无章节、超长作者/章节的真实 Core 状态到标签/截断/省略的映射规则。→ 影响真实动态 List 元数据渲染。
4. **`R-LOCAL-TOC-01` 本地目录动态字段**：重读 `Reader Full Directory / Phone`（`942:74`）确认其有完整目录大半屏控制窗（搜索章节名称、目录/书签切换、章节行带「已下载/下载」状态图标、当前章节、`3 / 4` 页码），但章节行**固定为示例第 30–33 章**，无 `SourceType=Local`、可绑定书名/目录项/当前章节的动态字段，也无章行→对应正文的静态目标。→ 影响本地书在目录点任一真实章节后显示对应正文。**静态目录容器与搜索可先行。**

> 已关闭：`B-BOOKSHELF-TITLELINES-01`（见 §2，运行时明确单行）。

## 4. 不受上述缺口阻塞的前端流程

以下顺序是完整 HarmonyOS 前端的实施顺序，不是先做静态页面、以后再补业务。每一批都必须同时完成 Figma 静态终态、页面状态、Core 命令接线和该批所需 Host 能力。

### 阶段 A：最小应用脊柱
在 `Reader-for-HarmonyOS` 建立正常应用所需的入口、导航入口、唯一的 Reader-Core runtime 生命周期入口，以及集中注册的 Host capability 入口。页面不得自行创建 Core runtime，也不得自行处理 Core 协议。

### 阶段 B：书架到阅读入口
按 `23 · Pages · Final` 的 Bookshelf、Book Detail、相关导入终态和 `15 · Reader 2` 的静态 ReadingSurface，实现：书籍列表、详情、目录、章节正文进入阅读面。Phone 与 TabletExpanded 都要实现。当前不实现翻页动效，但必须接入真实书籍、章节与阅读位置，而不是固定演示文本。

### 阶段 C：阅读正文与排版设置
实现 Phone/Tablet 的 PaperLayer、标题与正文、动态正文测量、重新分页、Unicode 阅读位置恢复，以及阅读控制的静态终态。完整设置页中的"首行缩进"使用 Figma 已有的三项选择：`不缩进`、`单字缩进`、`双字缩进`。运行时分别按无缩进、1em、2em 计算，随当前字号重排；不得写死 Figma 演示视口中的像素值。在动效暂停期间，控制显示、Quick/Module/Full 面板只实现最终可见状态和真实业务行为；不播放未解锁的动画。

### 阶段 D：其余最终页面与真实流程
依次实现 Figma Final 中的 Search、Discover、RSS、Settings、Source Management、Source Switch、Sync/Backup/Restore，以及各自的 loading、empty、error、confirm 等已画状态。每条流程只增加它确实需要的 Core 命令和 Host capability；不因复用方便而新建通用页面引擎、设计系统或跨端抽象。

### 阶段 E：响应式与运行验收
按 Figma 的 Phone/Tablet 组件变体和约束验证静态布局、文本度量、真实状态、导航和阅读恢复。验收使用节点属性、原生布局树、文字度量和事件/状态结果；不使用截图作为结论。

### 阶段 F：按缺口逐项恢复动效
只有当某一条 `M-*` 或 `PT-*` 缺口被 Figma 补齐并由你确认后，才重新读取该节点并解锁对应局部。搁置期（§3.1）不执行本阶段。

## 5. 每次前端改动的防越界检查

每项实现开始前必须写明：本次 Figma 节点、目标页面/状态、所用 Core 命令、所需 Host capability 和本次不触碰的暂停项。

出现以下任一情况即停止该局部，不补画、不改 Figma、不写默认视觉：

- Figma 没有可见元素、状态、素材、响应式规则或动效轨迹；
- 需要从 Phone 轨迹推断 Tablet 轨迹；
- 需要从 next 推断 previous、拖动、取消或提交过程；
- 需要把 Review 时间线、演示像素或示例内容提升为生产规则。
## 6. 2026-08-05 新增（Search 页面静默实现发现）

对 `11 · Search` 做只读检查并实现 Phone/Tablet 五态时，发现以下缺口：

FIGMA_VISUAL_GAP
- ID：`S-SEARCH-EMPTY-HISTORY-01`
- Figma 文件 / 页面 / 节点：`11 · Search` `2635:58749`（Phone Initial）与 `2635:59195`（Tablet Initial）
- 缺失内容：Initial 状态只画了"搜索栏 + 最近搜索（历史 chips + 清空记录）"。当 Core 的 `search.history.list` 返回空历史（全新安装）时，没有"无历史"变体；最近搜索区域应如何呈现（隐藏 header、显示空胶囊、或显示引导文案）未定义。
- 影响范围：Search 页 Initial 状态在空历史下的呈现；暂不阻塞其他搜索状态。
- 不能推断的原因：不能从"有历史"推断"无历史"的布局；Figma 没有空历史可见元素。
- 需要补充到 Figma 的内容：Search Initial 的空历史变体（或明确空历史时隐藏最近搜索区域的规则）。
- 当前应用行为：当 `history.length === 0` 时隐藏整个"最近搜索"区块，仅保留搜索栏与书源 chips（错误/空/加载/结果态仍按其 Figma 来源渲染）。
- 已继续完成的无关页面族：Search 其余四态（loading/results/empty/error）与 Bookshelf 本地阅读闭环已按其 Figma 来源实现。

FIGMA_VISUAL_GAP
- ID：`S-SEARCH-RESULT-COVER-01`
- Figma 文件 / 页面 / 节点：`11 · Search` `2635:58985`（Results）`2635:58863`（ResultCard 封面）
- 缺失内容：ResultCard 封面是带渐变（每本书不同色）的占位，且无"封面映射规则"（哪本书用哪个渐变、或书封面 URL 缺失时的降级规则）。Core `SearchBookData.coverUrl` 存在时显示封面；缺失时无色彩映射规则。
- 影响范围：Search 结果卡片无封面书的降级视觉。
- 不能推断的原因：Figma 渐变色彩随书本变化，但没有"书 → 渐变"的映射规则；不能从示例推断。
- 需要补充到 Figma 的内容：无封面结果卡的渐变映射规则（或指定单一占位色）。
- 当前应用行为：结果卡无封面时使用唯一 `linear-gradient(141.7deg, #3D5A4C, #1F3528)` 占位（DESIGN_FIXTURE），不声称逐书映射。
- 已继续完成的无关页面族：Search 其余状态与本地阅读闭环。

FIGMA_VISUAL_GAP
- ID：`D-DISCOVER-STATES-01`
- Figma 文件 / 页面 / 节点：`23 · Pages · Final` `943:1312`（Discover/Phone）与 `943:1684`（Discover/Tablet）；`09 · Reference · Discover` `334:2` 仅含 `Surface/Discover` populated 实例与组件族（CurrentSourceCard / SourceCategoryChips / DiscoveryContentCard / FilterBar）。
- 缺失内容：Discover 只有 populated 主界面（`Surface/Discover`）。没有 loading（搜索/加载中）、empty（无发现结果）、error（加载失败）状态变体；也没有 `source.explore` 结果到卡片字段的映射规则。
- 影响范围：Discover 页的 loading/empty/error 状态不可交付；populated 态需真实 `source.explore` 数据（需网络 + 书源）。
- 不能推断的原因：不能从 populated 推断 loading/empty/error 布局；`source.explore` 返回的真实字段映射未定义。
- 需要补充到 Figma 的内容：Discover 的 loading/empty/error 三态变体 + `source.explore` 结果到 `DiscoveryContentCard` 的字段映射。
- 当前应用行为：Discover 底部导航入口未实现（保持书架页的"发现"标签 inert，无新造入口行为）。
- 已继续完成的无关页面族：Search（五态）、RSS（feed/refreshing/empty/error）、本地阅读闭环。

FIGMA_VISUAL_GAP
- ID：`RC-READER-CONTROL-01`
- Figma 文件 / 页面 / 节点：`23 · Pages · Final` `943:6848`（Reader Control Home）、`943:8625`/`943:9001`/`943:9452`（Quick）、`943:9885`/`943:10351`/`943:10787`/`943:11208`（Module）、`943:11614`/`943:12116`/`943:14166`/`943:14746`（Full）；节点引用 `ReadingSurface` + `TopBar` + `ControlDock`（`3572:36697`，含 ControlSheet + ModuleNav）。
- 缺失内容：Reader Control 各面板（Home/Quick/Module/Full）是叠加在真实阅读表面的控制层。需要与既有 ReadingSurface/TopBar/ControlDock 的装配、触发与返回规则；且多数面板（TTS、AutoPage、翻页、替换）受动效暂停（`M-REVIEW-01`、`PT-*`）约束。静态终态装配与阅读流集成未完成。
- 影响范围：Reader Control 全部面板（Home/Quick/Module/Full）未交付；阅读页控制层未接入。
- 不能推断的原因：不能从阅读表面推断控制 dock 的装配；Quick/Module/Full 的切换与返回规则未确认；动效暂停项不能实现。
- 需要补充到 Figma 的内容：Reader Control 各面板的静态终态装配、触发/返回规则；动效项恢复。
- 当前应用行为：阅读页保持现有 ReadingSurface（无控制 dock 覆盖）；不新造控制面板入口。
- 已继续完成的无关页面族：Search、RSS、Settings、Source Management、Sync/Backup。

FIGMA_VISUAL_GAP
- ID：`SS-SOURCE-SWITCH-01`
- Figma 文件 / 页面 / 节点：`23 · Pages · Final` `943:15215`（Source Switch/Phone）、`943:15705`（Source Switch/Tablet）；节点 = `SourceSwitch/Window`（`568:134`，实例 `3572:41345`）。
- 缺失内容：Source Switch 是换源 overlay，需从远程书详情/阅读页的"换源"触发。**代码已定义（2026-08-05）**：触发入口 = 完整目录顶栏「换源」按钮（`ReaderFullDirectory`）；返回规则 = ✕ 关闭 / 遮罩点击 / 系统返回；结果状态 = discovering/candidates/empty/discoveryError/switching/success/failure（`SourceSwitchPanel`）；本地书置灰规则 = `sourceId === 'local'` → 按钮 opacity 0.4 不可点。但 **Figma 仍缺**：换源按钮 Disabled（置灰）变体、overlay 各结果态画稿、返回规则。
- 影响范围：overlay 结果态视觉未交付到 Figma；代码以规则临时定义，待 Figma 补齐后对齐。
- 不能推断的原因：Figma 只画了 Window 的 candidates 就绪态（`SourceSwitch/CandidateList`），未画切换中/成功/失败/发现失败等结果态；「延迟」与「当前章节」两列无 Core 数据契约（`change.bookSource` 候选只返回 sourceId/bookUrl/bookName/author/coverUrl），代码按用户决定（2026-08-05）以"—"占位。
- 需要补充到 Figma 的内容：换源按钮 Disabled 变体；`SourceSwitch/Window` 结果态变体（Discovering/Switching/Success/Failure/Empty/DiscoveryError）；延迟与当前章节列数据契约（已定"—"占位为终态）。建画提示词已交 codex（2026-08-05）。
- 当前应用行为：本地书 → 换源按钮置灰不可点（VM 已验证）；远程书 → 唤起 overlay 全状态（`SourceSwitchGateway` 已按 Core 契约接通 `change.bookSource`/`book.toc`/`source.switch.commit`/`source.switch.rollback`；真实切换链路待远程书架条目 + 在线阅读路径交付，`http.execute` host 已由在线书工作注册）。
- 已继续完成的无关页面族：Search、RSS、Settings、Source Management、Sync/Backup。

FIGMA_VISUAL_GAP
- ID：`H-NOTE-1`
- Figma 文件 / 页面 / 节点：`07 States` `286:31` 仅提供 Phone 书架 empty 参考（352×350 组件）；`23 · Pages · Final` 无 Tablet empty 装配。
- 缺失内容：Tablet 设备上 `bookshelf.list` 返回空时，Figma 无 Tablet empty 终态可映射。代码当前让 Tablet 复用 Phone 参考布局（固定 350.903 宽、内容左对齐，**未居中**）；Tablet 导入入口已开放。
- 影响范围：Tablet 空书架无 Figma 定义视觉（非推断，是缺口）。
- 不能推断的原因：Figma 缺 Tablet empty 终态；不能从 Phone 推断 Tablet 布局；也不能声称"复用即居中"。
- 需要补充到 Figma 的内容：Tablet Bookshelf empty 终态；或明确 Tablet empty 规则。
- 当前应用行为：Tablet 挂载 `BookshelfEmptyPage`（Phone 参考布局 350.903 宽、左对齐）；Tablet 导入弹窗已开放。等 Figma Tablet empty 终态补齐后重映射。审计认定：入口可用，视觉缺口未关闭。
- 已继续完成的无关页面族：Search、RSS、Settings、Source Management、Sync。

FIGMA_VISUAL_GAP
- ID：`N-COVER-REMAP-01`
- Figma 文件 / 页面 / 节点：`Library/BookCover` `493:185` `3612:1796`（已补 NoCover 变体）；`24 · Responsive Masters · Phase 4` `2260:1438` 等 BookDetail Hero。
- 缺失内容：Figma `Library/BookCover` `Book=NoCover` 变体（`3612:1796`）已存在。代码已放行无封面书（`applyBookshelfState` 不再拒绝），书架卡用 `NoCoverCover` 组件。BookDetail Hero 无 NoCover 变体（`N-COVER-HERO-01`）。
- 影响范围：无封面书书架卡已按 NoCover 渲染；Hero 封面槽为空（无 Figma 定义）。
- 不能推断的原因：Hero NoCover 落位未在 Figma 定义；不能从书架卡推断 Hero。
- 需要补充到 Figma 的内容：BookDetail Hero 在 NoCover 时的具体装配。
- 当前应用行为：已按 Figma `3612:1796` 实现书架卡（奶油 `#F5ECE6` + 两条 `#41484C`@18% 横线 + "暂无封面"）；`BookDetail.hero` 无 NoCover 变体，不渲染封面、登记 `N-COVER-HERO-01`。审计认定：防崩溃已修，基准视觉对齐，非基准实例缩放无来源。
- 已继续完成的无关页面族：Search、RSS、Settings、Source Management、Sync。

FIGMA_VISUAL_GAP
- ID：`R-LOCAL-TOC-01`
- Figma 文件 / 页面 / 节点：`23 · Pages · Final` `943:11617`(Phone) `943:11949`(Tablet)；`F2 · Reader Module Directory`。
- 缺失内容：Full Directory 的 Phone/Tablet 实例无 prototype reaction；章节行为固定样例，无 `SourceType=Local`、可绑定书名/目录项/当前章节的动态字段，也无章行→对应正文的静态目标映射。顶部返回/收起未接通 Reader Control Home。
- 影响范围：Full Directory 选章→正文的 Figma 视觉合同未闭合（代码选章链路已接通，但无 Figma 字段映射）。
- 不能推断的原因：选章回调与字段映射需 Figma 定义；不能从目录视觉推断。
- 需要补充到 Figma 的内容：Full Directory 的本地目录动态字段、章行→正文目标、顶部返回/收起路由。
- 当前应用行为：章节行 `onSelectChapter` 已接通（`FullDirectoryPanel.chapterRow.onClick`→`onSelectChapter`→`LocalReadingExperience.onRequestedChapterChanged`→`openChapter`，含 `chapterSelectionToken` 防过期加载 + 过期 catch 不失败当前流）；顶部返回/收起接通到当前阅读路径回退。2026-08-05 当前 HAP 在 VM 新导入 Gutenberg EPUB `18174` 后，选择 `I. THE WOODLANDS IN JANUARY` 已进入该 fragment 的真实正文，退出后恢复同章位置。Reader Control Home 仍按 `RC-READER-CONTROL-01` 阻塞；Figma 视觉合同（动态字段/原型）仍未闭合。
- 已继续完成的无关页面族：Search、RSS、Settings、Source Management、Sync。

FIGMA_VISUAL_GAP
- ID：`SS-SOURCE-TOGGLE-01`
- Figma 文件 / 页面 / 节点：`23 · Pages · Final` `943:4281`（Source Management，源行带开关）。
- 缺失内容：~~Core 协议无 `source.update` 命令（仅 `source.list/import/export/delete/check`）。书源启用/禁用没有 Core 持久化能力；源码开关无法真实改变书源状态。~~ **已闭环（2026-08-05）**：Core 新增 `source.update {sourceId, enabled}`，幂等、只改写 `bookSource.enabled` 并保留规则与未知 Legado 字段；`bookSource` 非 object 的 V1-only 源 fail closed。
- 影响范围：~~Source Management 开关不能持久化；书源启用/禁用不可交付。~~ 已交付：开关经真实 `source.update` RPC 持久化，成功后重载列表，维持不乐观切换。
- 不能推断的原因：~~不能用 `source.delete`+`source.import` 推断原子开关；无 Core 命令映射。~~ 已按 §7.3 关闭途径①实现（`source.update` + 快照持久化）。
- 需要补充到 Figma 的内容：书源启停的 Core 命令映射；或书源启停的视觉-only 规则。
- 当前应用行为：开关可点击、**不乐观切换**：点击发 `source.update` RPC，成功（含快照持久化确认）后重载列表，失败保持行原状并记录日志。`book.search` / `source.explore` 对 disabled 书源拒绝执行（本地搜索、RSS、`source.check` / `source.check.run` / `source.debug` 不受影响）。
- 已继续完成的无关页面族：Search、RSS、Settings、Sync。

FIGMA_VISUAL_GAP
- ID：`N-COVER-HERO-01`
- Figma 文件 / 页面 / 节点：`24 · Responsive Masters · Phase 4` `2260:1438`/`1459`/`11403`/`11424`（BookDetail Hero 四变体，封面固定 `Image`）。
- 缺失内容：BookDetail Hero 只有 Remote/Local 变体，无 `Book=NoCover` 变体。`Library/BookCover` NoCover（`3612:1796`）适用于书架卡片，不适用于 Hero 装配。
- 影响范围：无封面本地书的 BookDetail Hero 封面槽为空（只显示文字列），无 Figma 定义视觉。
- 不能推断的原因：不能从书架卡 NoCover 推断 Hero 落位；不能补画。
- 需要补充到 Figma 的内容：BookDetail Hero 的 NoCover 变体（或明确空封面槽规则）。
- 当前应用行为：Hero 无封面时不渲染封面图像，保留文字列；登记缺口。
- 已继续完成的无关页面族：Search、RSS、Settings、Source、Sync。

## 7. 2026-08-05 用户范围决策（拍板记录）

下列为设计/产品侧已拍板的范围决定，视觉与规则以本表为准，**不再要求补画**。

### 7.1 全局约束：Discover 与 RSS 为占位-only

Discover 与 RSS 在设计初期已定为「暂时不做，仅保留占位」：RSS 现有「视觉壳 + 缓存数据」即占位本身；Discover 底部导航入口保持 inert。**不推进两页的真实实现**（`rss.subscription.refresh`、`source.explore` 等需 `http.execute` 的能力不在本范围）。覆盖矩阵中两页的 `⊘Core阻塞（http）` / `⊘缺口` 记录以此条为准（out-of-scope 占位，非待补齐缺口）。

### 7.2 逐项决策

| 登记号 | 决策 | 结果 |
| --- | --- | --- |
| `S-SEARCH-EMPTY-HISTORY-01` | 空历史时**整体隐藏**最近搜索区 | 已关闭（代码已如此） |
| `N-COVER-HERO-01` | Hero 无封面**复用书架卡 NoCover `3612:1796` 缩放至 86×122** | 已关闭（代码已改 `LocalBookDetail.ets`，待编译/VM 验证） |
| `H-NOTE-1` | Tablet 空书架**复用** Phone 空态组件 | 已关闭（规则化） |
| `B-BOOKSHELF-LIST-02` | Tablet List 与 Phone 样式**保持一致** | 已关闭（规则化） |
| `D-DISCOVER-STATES-01` | Discover 并入 7.1 占位-only，不再推进 | 已关闭（out-of-scope） |
| `R-COMPACT-01` | 折叠屏模式**降级，暂时不做** | 已关闭（out-of-scope） |
| `S-SEARCH-RESULT-COVER-01` | 无封面结果卡用**单一占位色**（不做逐书渐变映射） | 已关闭（规则化；代码现为单一固定渐变占位，是否改纯色待实施确认） |
| `RC-READER-CONTROL-01`（触发/返回部分） | 控制层**点击沉浸阅读页中间竖栏唤起**（区域大小不写死，待测试微调）；唤起态**返回按钮 / 系统返回 / 点击正文**退出 | 已关闭（契约已定）；面板装配、Quick↔Module↔Full 切换契约、动效暂停项仍开放 |
| `R-TOC-READING-01` | **目录开关不影响正文渲染**，正文恒为 canonical w670；`942:60` 的错误 w314 画稿已恢复为 w670，并采用 canonical 正文 `FILL × HUG` 约束 | 已关闭（实时 Figma 修正并节点属性复核） |
| `SS-SOURCE-TOGGLE-01` | 书源启停走 **Core `source.update {sourceId, enabled}`** 真实 RPC（幂等、只改 `bookSource.enabled`、保留规则/未知字段；V1-only 源 fail closed）；执行门控：`book.search` / `source.explore` 拒绝 disabled，`source.check(.run)` / `source.debug` / 本地搜索 / RSS 不受影响；开关不乐观切换，成功后重载列表 | 已关闭（2026-08-05 Core 命令 + HarmonyOS RPC，详见 §7.3） |

**仍开放**：
- `R-LOCAL-TOC-01`：本地目录动态字段 + 章行→正文映射（代码选章链路已通，Figma 合同 + 当前构建设备回归未闭合）。
- `SS-SOURCE-SWITCH-01`：触发入口（完整目录顶栏「换源」按钮）、返回规则与 overlay 结果态已由代码定义（2026-08-05）；Figma 仍缺换源按钮 Disabled 变体 + overlay 结果态画稿 + 延迟/当前章节数据契约；远程书阅读链路未交付（在线书能力开发中，`http.execute` host 已注册）。
- `B-BOOKSHELF-LIST-01`：Phone List 无 Final 静态页（Review 转场帧不可提升）。
- `B-BOOKSHELF-LIST-03`：List 行元数据映射规则。**List 与 Cover 模式为同一套 ShelfBook 数据、仅展示样式区分（已确认），代码侧复用同一数据管线换行布局。**
- Book Detail 局部状态（无独立登记号）：Hero/Summary 页面级 loading/empty/error 装配、Summary 空态、长内容溢出（长书名/作者/简介/多章节截断省略）。
- Hero 非基准缩放实例：62×93 / Tablet 缩放无 Figma 比例规则（`N-COVER-HERO-01` 只覆盖 86×122 基准）。

Search/Sync/WebDAV 为**真实功能**（非占位），完成仍需 `http.execute`。

### 7.3 `SS-SOURCE-TOGGLE-01` Core 侧详情（2026-08-05 实现确认）

- 书源条目**有** `enabled: bool` 字段，但它是 `Source.book_source`（Legado 原始 JSON）里的键，不是 `Source` 结构体的一等字段；`source.list` 返回该字段并支持 `enabled_only` 过滤。`remote.rs:169` 的 `enabled` 是 **Host 快照持久化开关**，不是书源字段（勿混淆）。
- Core 书源命令面现含：`list / import / export / delete / update / check / check.run / debug / imageRequest / explore / getKey / getVariable / setVariable / switch.commit / switch.rollback`。
- **已实现**：`source.update {sourceId, enabled}`——幂等；未知 `sourceId` 返回 `INVALID_PARAMS`；只改写 `bookSource.enabled`，保留规则与未知 Legado 字段；`bookSource` 非 JSON object 的 V1-only 源 **fail closed**（不补最小 Legado JSON，避免改变 `book_source_semantics()` 路径与 V1 `rules` 解析）。已加入 `remote_method_mutates_storage`，Host 快照启用时成功结果等待 `persistence.put` 确认。
- 执行门控（产品边界，2026-08-05 拍板）：disabled 书源 **书源搜索/探索不可用**（`book.search` / `source.explore` 拒绝，返回空结果、不发 Host 请求；inline source 无 persisted enabled 概念、不门控）；**检测可用性与调试仍可用**（`source.check` / `source.check.run` / `source.debug` 不拦 disabled）；本地书籍搜索与 RSS 订阅不受影响。
- `enabledExplore` 暂不暴露（`source.list` 缺失值默认 `true`、领域投影默认 `false`，且 explore 流程目前不读它——先冻结语义再开放）。
