# Reader UI Figma Handoff Status

状态：M0–M5 仅完成候选装配；Reader 2 控制层已完成 VC2 / VC3，其他静态页面族与 Motion 全量闭环仍未完成

更新时间：2026-07-19

Reader 2 权威页：<https://www.figma.com/design/klhs2jMM4MncaJFqZMfqEK?node-id=1023-17636>

全局 M5 历史候选页：<https://www.figma.com/design/klhs2jMM4MncaJFqZMfqEK?node-id=834-2>

详细清单：[FIGMA_MATERIAL_INVENTORY_2026-07-13.md](./FIGMA_MATERIAL_INVENTORY_2026-07-13.md)

2026-07-19 现场审计：[FIGMA_FULL_AUDIT_2026-07-19.md](./FIGMA_FULL_AUDIT_2026-07-19.md)

## 当前事实

- Figma 当前有 29 个页面（`00`–`28`）。M0–M5 物料快照之后已新增 `25 · Motion Reference`、`26 · Reader Control Continuity`、`27 · Interaction Playground` 与 `28 · Project Index & Audit`；新增页面不自动关闭 VC/MR 门禁。
- M0–M5 物料快照记录 11 个 variable collections、497 个 variables、107 个 text styles、16 个 effect styles、2 个 paint styles、929 个 components（含 variants）、115 个 component sets 和 608 个 variants；这些历史计数不能单独证明当前组件复用质量，实时数量以 Figma 现场审计为准。
- 当前通用图标源为 139 个 Tabler 图标组件，不再使用手绘近似图标作为新组件输入。
- 保留 6 张原始封面和 35 个唯一手机实页参考，其中 22 个为本轮 M3 六域代表状态。
- 除既有 M4 参考外，本轮从当前 demo 重新锁定 24 个页面/状态族 × Phone / Compact / Tablet，共 72 个实页基线。
- `23 · Pages · Final` 已装配 25 个响应式 Set（含既有 Reader Control Home）、75 个顶层 viewport 实例；`24 · Responsive Masters · Phase 4` 保存 24 个新页面级 Set / 72 个 variants。2026-07-19 exact-set 门禁确认 72/72 variant 和 75/75 prototype viewport 尺寸、引用与原点一致，11 个普通页面 Compact 母版已按 live demo 的居中受限 surface 规则修复；`Final` 仍不代表用户视觉确认或 Host 已完成。
- `21 · Inventory` 已建立“存在 / 分散 / reference-only / 可复用 / 缺失”五类矩阵。

## 当前闭环状态

| 工作 | 当前状态 |
| --- | --- |
| 页面级 master 与三档实例装配 | 结构门禁通过：24×3 variants、25×3 prototype viewports exact；用户视觉确认仍独立 |
| Reader 2 Figma 静态源冻结 | 已完成 |
| Reader 2 Design Delta 与 Reader-UI 显式回写 | VC2 已完成 |
| Reader 2 三档浏览器复验 | VC3 已完成 |
| Reader 2 之外的页面/状态族结构复核 | 已完成 exact-set 与引用门禁；11 个 Compact 明确缺陷已修复 |
| Reader 2 之外的页面/状态族逐页视觉确认 | 未完成 |
| Reader 2 之外的用户视觉确认与改版决策 | 未完成 |
| 其他页面族 Figma 设计修正 | 未完成 |
| 其他页面族 Design Delta 与 Reader-UI 回写 | 未完成 |
| 其他页面族本地 demo 浏览器复验 | 未完成 |
| MR1 Reader Control Motion 样板 | 已完成自验，待用户确认 |
| MR2 十个核心 Motion 家族 | 进行中；Review artifact 不等于闭环 |
| MR3 canonical registry + 确定性 trace | 已完成十家族 × 5 模式；7 段代表性 browser WebM 已补，十家族/三档完整媒体未完成 |
| MR4–MR5 Native/device Motion 闭环 | 未完成 |
| 三个 Host 最终实现与设备证明 | 未完成 |

Reader 之外的页面族仍按 [静态视觉闭环计划](./VISUAL_CLOSURE_PLAN_2026-07-14.md) 的 VC0–VC3 推进。独立 `25 · Motion Reference` 已存在：MR1 控制层完成自验但待用户确认，MR2 Review Batch 进行中；十个核心家族的 MR3 确定性 trace 已闭合，但动态媒体、原生实现和设备证据尚未闭合。后续状态以 [Motion 四层交付规划](./MOTION_DELIVERY_PLAN_2026-07-14.md) 与 [Motion Reference Index](./MOTION_REFERENCE_INDEX_2026-07-15.md) 为准。

## 可复用与不可复用边界

当前可作为重建输入的基础资产：

1. 497 个 variables。
2. 107 个 text styles。
3. 16 个 effect styles 与 2 个 paint styles。
4. 139 个 Tabler 图标组件。
5. 6 张仓库原始封面。
6. 本地 demo 的当前 CSS、HTML、fixture、route 和真实浏览器坐标。
7. 已通过 M1 验收的 MainTab、TopBar、IconButton、五个 Shell Slot API 与 State/Overlay 属性组件。
8. 已通过 M2 实页坐标矩阵和截图验收的 Library、Settings、Source Management、Source Switch 与 Reader Control Home 组件链。
9. 已通过本轮响应式结构与截图门禁的 24 个页面级 master；最终页面只引用这些 master 或既有 Reader Control Home 的实例。

当前只能作为参考、不能直接装配最终页面的资产：

1. 08–16 产品域的 capture-derived components。
2. `17 · Reference · Reader Baseline`。
3. `18 · Reference · Reader Seeds`。
4. `19 · Reference · Phone`。
5. `20 · Reference · States`。

这些节点使用 `Reference/*` 命名或 `reader_ui/material_status=reference-only` 元数据。Figma Plugin API 未在本次流程中提供可验证的组件发布排除开关，因此发布时仍需显式排除，不能把“已标记”写成“已自动隐藏”。

## 已确认的 Reader 基准

- Node：`226:2`。
- 当前定位：Reader 控制层的坐标与视觉参考，不是可直接复用的最终 Reader 组件。
- 画布约为 `390 × 844`。
- 后续 Reader 组件必须以本地 demo 实页、该基准和当前 Tabler 图标共同校验；不能从旧 Phase 4 稿或历史 seed 近似重画。
- `18 · Reference · Reader Seeds` 仅因旧捕获节点仍有实例依赖而保留；新组件不得继续以它们作为图标源。

## Material 阶段状态

| 阶段 | 当前状态 | 下一步 |
| --- | --- | --- |
| M0 | 装配完成 | 保持五类 Inventory 为事实源；最终视觉进入 VC0–VC3 |
| M1 | 结构完成 | 共享导航、TopBar、IconButton、五个 Shell Slot/INSTANCE_SWAP API、State/Overlay 属性化已有结构门禁；最终视觉待 VC0–VC3 |
| M2 | 候选完成 | 已有产品域 reusable 候选；此前坐标和截图检查不能替代本轮用户视觉确认 |
| M3 | 参考完成 | 六域 22 个代表状态实页捕获与 reference-only 组织已存在；不等于改版完成 |
| M4 | 基线完成 | 六布局族已有非手机实页参考与结构矩阵；最终响应式视觉待 VC0–VC3 |
| M5 | 候选装配完成 | 24 个页面/状态族、25 个 Set、75 个三档实例已装配；它们是 VC0 的审计输入，不是最终验收结果 |

## M1 完成证据

M1 不是“把已有节点改个名字”；当前以下结构均已成立：

1. `Navigation/MainTabItem`（`342:175`）有 Phone/Tablet × 选中/未选中状态和明确图标实例属性。
2. `Navigation/BottomNav`（`344:379`）有八个变体，内部只复用 MainTabItem。
3. `Navigation/IconButton`（`453:418`）、`Navigation/AppTopBar`（`461:468`）、`Navigation/BackTopBar`（`463:486`）已按本地实页坐标重建。
4. 五个 Shell 保持原尺寸与坐标，全部暴露真实 Slot/INSTANCE_SWAP API；可选 Host 另有显隐属性。
5. `Overlay/Toast`、`Overlay/Dialog`、`Overlay/BottomSheet`、`State/StatusPanel`、`State/DiscoverFeedback` 已暴露文本、操作、状态和可见性属性。
6. 新建导航组件使用本地 Tabler 实例、现有 variables、Text Style 和 Auto Layout。
7. Shell 与 Overlay 的结构矩阵均为零失败，Navigation/Shells 和 States/Overlays 已完成全页截图复核。

## M2 Library 完成证据

1. 本地 390×844 `bookshelf` 实页测得 SectionHeader、BookCard Cover/List、ContinueReading 的实际坐标；图标直接复用本地 Tabler master，不手绘。
2. 本地 390×844 `book-detail` 实页测得 Hero、Summary、ChapterSection、固定操作栏的实际坐标。
3. 新建 14 个 `Library/*` reusable 组件/组件集，全部使用组件实例、变量、Text Style 和约束明确的 Auto Layout/固定实页几何。
4. 旧 `Reference/CaptureDerived/Library/*` 节点仍保持 reference-only，没有改名冒充 reusable 组件。
5. 六张书封来自本地 `frontend-demo-optimized/covers/`；目录等通用图标来自本地 Tabler 源。
6. 坐标/属性矩阵均为零失败；截图证据为 `/tmp/reader-m2-library-complete.png`、`/tmp/reader-m2-library-detail-hero-final.png`、`/tmp/reader-m2-library-detail-actions.png`。
7. Library 非正常态和 Import 没有凭空补画，继续进入 M3 代表状态捕获。

## M2 Settings 完成证据

1. Settings 首页与 `settings-general` 均从本地 390×844 实页读取最终浏览器坐标，没有复用旧 capture-derived 组件作最终稿。
2. 新建 Settings 文档区 `518:6`；Settings 首页四个顶层组件、通用设置 11 个顶层组件/组件集均使用变量、Text Style、Auto Layout 或明确的固定实页几何。
3. `Settings/GeneralRowIcon`（`530:165`）的 12 个图标来自本地 demo 当前使用的 Tabler SVG path，不是历史 seed 或手绘近似图标。
4. `Settings/Switch` 为 44×24、thumb 为 20×20；状态点为 24×18/7；`Settings/SettingRow` 有 Value、SwitchOn、SwitchOff、BadgeSwitch、Action、Rich 六种结构。
5. `Settings/GeneralSection`（`535:411`）固定保留“基础偏好 / 行为与反馈 / 系统权限”三个实页标题和对应 3/6/3 行结构；`Settings/DangerActionRow`（`535:412`）对应“恢复默认”。
6. 十项节点矩阵为零失败；截图证据为 `/tmp/reader-m2-settings-home.png`、`/tmp/reader-m2-settings-sections.png`、`/tmp/reader-m2-settings-complete.png`。
7. About 和非正常态没有在 M2 猜画，继续进入 M3 代表状态捕获。

## M2 Source Management 完成证据

1. `source-management` 的 390×844 最终浏览器渲染是唯一几何依据；旧 capture-derived 根节点 `392:2` 没有被晋升。
2. 新建文档区 `545:170`，包含 10 个顶层 `SourceManagement/*` 组件/组件集；8 个图标均来自本地 demo 当前使用的 Tabler path。
3. 指标卡为 171.454×55.998，2×2 指标矩阵为 350.903×119.991；书源列表继续复用 Settings 的 44×24 开关和状态点。
4. `SourceManagement/SourceRow` 暴露标题、说明和状态实例属性；`SourceManagement/ActionRow` 五个语义 variant 复用 `Settings/InlineAction`。
5. `SourceManagement/FooterAction` 有新增和危险删除两态，保持 350.903×57.995 的实页尺寸。
6. 11 项节点矩阵为零失败；截图证据为 `/tmp/reader-m2-source-management.png`。

## Reader 2 当前静态源与 VC2 / VC3 证据

1. Reader 控制层的唯一静态视觉页为 `15 · Reader 2` (`1023:17636`)；旧 `15 · Reader`、`819:11132` 和 `23 · Pages · Final` 内的 Reader 候选不再向下游传播。
2. 权威装配节点为控制首页 `654:674`、7 状态集 `1023:18314`、4 完整页集 `1023:18294`；三档 master 为 `1023:18737` / `1023:18741` / `1023:18745`。
3. ThemeSwatch `1023:17824`、FontCell `1023:17903`、timer-card `1137:10098` 分别是主题色块、字体模块、定时模块的唯一输入源。
4. PaperLayer 保留暗角、左上柔光、线性纸色、tile 纹理四层。正文左上方形色块是实现伪影，不是删除复合纸张背景的理由。
5. 显式回写矩阵见 [READER2_STATIC_DESIGN_DELTA_2026-07-15.md](./READER2_STATIC_DESIGN_DELTA_2026-07-15.md)；回写后没有从 Figma 直接生成或覆盖页面结构。
6. VC3 已覆盖 12 个 primary 状态、7 个兼容路由、Phone / Compact / Tablet 三档实页、动态分页、模块/快捷交互、console 与阴影伪影。Demo verify `46/46`、P0 matrix `120/120`、Tabler `staticGaps=0`、Contract consistency `unapproved=0`。
7. Reader 2 控制层 VC2 / VC3 已关闭；Motion 已进入 MR1/MR2 工作轨但尚未全量闭环，三个 Host 的最终实现与设备证明仍未完成。

## M2 Source Switch 完成证据

1. 一次性审计本地 390×844 `source-switch` 的 DOM、CSS、Tabler SVG、11 个候选源和实际坐标；旧 capture-derived 根节点 `311:416` 没有被晋升。
2. 新建文档区 `566:49`，包含 7 个顶层 `SourceSwitch/*` 组件/组件集；新增图标只实例化本地 `Icon/SourceSwitch` 与 `Icon/Close` master。
3. 换源窗口为 300×391.892/R24，header 为 280.903×31.997，候选行高 31.9965；CandidateRow 暴露三态和书源名、延迟、章节文本属性。
4. `SourceSwitch/CandidateList`（`568:79`）严格保留 11 行与 10 条分隔线；`SourceSwitch/Window`（`568:134`）保留 x9.549/y7.552 与 x9.549/y39.548 的内部锚点。
5. `SourceSwitch/Overlay`（`568:209`）不复制 Reader 截图，按 ReadingSurface → TopBar → ControlSheet → Window → ModuleNav 的真实 z 轴顺序引用已验收组件。
6. 7 项顶层矩阵、2 个 Tabler master、11 行/10 分隔线、窗口与 Overlay 锚点、零尺寸和 reference 泄漏均为零失败；截图证据为 `/tmp/reader-m2-source-switch-complete.png`。

## M3 Library / Import 代表状态证据

1. 从 22 个候选代表状态中先完成 Library/Import 域 5 个：`bookshelf-empty`、`import-permission-denied`、`import-parsing`、`import-conflict-resolve`、`import-partial-success`。
2. 五个节点均由本地 390×844 实页直接 HTML-to-Figma 捕获，节点本体为 390×843.889；截图外扩尺寸只来自设备阴影，不是屏幕比例变化。
3. 统一收纳在 `M3 · Live References · Library & Import`（`580:198`），使用 `Reference/LiveCapture/M3/*` 命名和 reference-only 共享元数据。
4. 本域没有新增 Figma component、variant、variable 或 style；捕获稿只提供视觉、坐标、文案和状态参考。
5. 捕获字体映射为 Inter / Songti SC，不进入正式 typography token；正式组件继续使用已验收的 Noto Sans/Serif Text Style。
6. 五项几何、parent、reference 状态和组件泄漏检查全部通过；整域截图为 `/tmp/reader-m3-library-import-references.png`。

## M3 Discover 代表状态证据

1. 一次性完成 `discover-loading`、`discover-no-results`、`discover-entry-error`、`discover-cache-confirm` 四个代表状态。
2. 四个节点均由本地 390×844 实页直接捕获，节点本体为 390×843.889，统一收纳在 `M3 · Live References · Discover`（`589:2`）。
3. 节点使用 `Reference/LiveCapture/M3/*` 命名，并写入 reference-only、route、viewport 与 domain 共享元数据。
4. 本域没有新增 component、variant、variable 或 style；旧 capture-derived Discover 节点没有被晋升。
5. 四项尺寸、坐标、parent、reference 状态和组件泄漏检查全部通过；整域截图为 `/tmp/reader-m3-discover-references.png`。

## M3 RSS 代表状态证据

1. 一次性完成 `rss-refreshing`、`rss-empty`、`rss-error`、`rss-detail` 四个代表状态。
2. 四个节点均由本地 390×844 实页直接捕获，节点本体为 390×843.889，统一收纳在 `M3 · Live References · RSS`（`596:2`）。
3. 节点使用 `Reference/LiveCapture/M3/*` 命名，并写入 reference-only、route、viewport 与 domain 共享元数据。
4. 本域没有新增 component、variant、variable 或 style；旧 capture-derived RSS 节点没有被晋升。
5. 四项尺寸、坐标、parent、reference 状态和组件泄漏检查全部通过；整域截图为 `/tmp/reader-m3-rss-references.png`。

## M3 Search 代表状态证据

1. 一次性完成 `search-loading`、`search-empty`、`search-error` 三个代表状态；normal before/results 已有独立实页参考，没有重复捕获。
2. 三个节点均由本地 390×844 实页直接捕获，节点本体为 390×843.889，统一收纳在 `M3 · Live References · Search`（`603:2`）。
3. 节点使用 `Reference/LiveCapture/M3/*` 命名，并写入 reference-only、route、viewport 与 domain 共享元数据。
4. 本域没有新增 component、variant、variable 或 style；旧 capture-derived Search 节点没有被晋升。
5. 三项尺寸、坐标、parent、reference 状态和组件泄漏检查全部通过；整域截图为 `/tmp/reader-m3-search-references.png`。

## M3 Sync / Restore 代表状态证据

1. 一次性完成 `sync-error`、`restore-preview`、`restore-conflict`、`restore-result` 四个代表状态；normal、WebDAV、restore progress 已有独立实页参考，没有重复捕获。
2. 四个节点均由本地 390×844 实页直接捕获，节点本体为 390×843.889，统一收纳在 `M3 · Live References · Sync & Restore`（`611:2`）。
3. 节点使用 `Reference/LiveCapture/M3/*` 命名，并写入 reference-only、route、viewport 与 domain 共享元数据。
4. 本域没有新增 component、variant、variable 或 style；旧 capture-derived Sync/Restore 节点没有被晋升。
5. 四项尺寸、坐标、parent、reference 状态和组件泄漏检查全部通过；整域截图为 `/tmp/reader-m3-sync-restore-references.png`。

## M3 About 与跨域完成证据

1. 完成 `about`、`about-version` 两个代表状态，统一收纳在 `M3 · Live References · About`（`617:2`）；整域截图为 `/tmp/reader-m3-about-references.png`。
2. M3 最终覆盖 Library/Import 5、Discover 4、RSS 4、Search 3、Sync/Restore 4、About 2，共 22 个本地 390×844 实页状态。
3. 跨域门禁覆盖 6 个 wrapper 与 22 个 capture：missing、geometry、parent、reference status、component leakage、wrapper schema 全部为 0 失败。
4. Figma components 仍为 613、component sets 仍为 57；M3 没有把 raw capture 变成 reusable 组件。
5. Library/Import 的早期 route/wrapper 元数据已统一到跨域 schema；本地 demo 的临时 HTML-to-Figma capture script 已删除。

## M4 响应式矩阵与本地修复证据

1. `22 · Reference · Responsive`（`624:2`）包含 6 个 family wrapper、12 个新实页捕获；既有 Phone/Stack Phone 参考被复用，没有重复捕获。
2. Main Tab、Library Stack、Settings Stack 分别补 Expanded + Tablet；Reader Control、Flow Continuity 分别补 Tablet + Compact Landscape；Wide Workspace 补 Wide + Compact Landscape。
3. 浏览器实页矩阵 12/12 命中 route/layout/viewport class；Figma missing、wrapper schema、geometry、parent、reference status、component leakage 全部为 0 失败。
4. 整页证据为 `/tmp/reader-m4-responsive-matrix.png`；613 components / 57 component sets 是当时的 M4 历史快照，当前计数以本文“当前事实”为准。
5. M4 审计发现并修复本地 `source-switch` Compact Landscape 候选窗口 0 高度问题：窗口现为左侧 420×300，Reader dock 仍在右侧且不重叠；错误节点 `636:2` 已删除，修正节点为 `640:2`，证据为 `/tmp/reader-m4-flow-compact-fixed.png`。
6. 新增回归用例后 `reader-control-continuity` 13/13、Phase 0/1 6/6、Settings viewport 8/8、contract consistency 均通过；临时 capture script 已删除。

## M5 响应式候选页面矩阵

1. 候选装配页为 `23 · Pages · Final`（`834:2`），按 13 个产品分区组织：Bookshelf、Book Detail、Import、Discover、RSS、Search、Settings & About、Source Management、Sync/Restore/WebDAV、Reader Control Home、Reader Quick & Module、Reader Full、Source Switch；`Final` 仅为节点名。
2. 页面级 master 位于 `24 · Responsive Masters · Phase 4`（`834:3`）的 `Final Responsive Page Masters · 24 Sets`（`941:2`）；共 24 个 component set、72 个 Phone/Compact/Tablet variants。
3. 25 个 Set / 75 个顶层 viewport 实例只保留为 M5 历史候选快照。Reader Control Home 与 Reader Quick / Full 不再从该快照或旧 `819:11132` 传播，统一消费 `15 · Reader 2` 的控制首页、状态集和三档 master。
4. 候选装配页结构检查：13 个分区、75 个带历史 `instance/final/*` 标记的顶层 viewport 实例、0 个 detached instance、0 个 `Container (阅读器 App)` 原始捕获 Frame；标记名称不代表视觉验收状态。
5. 此前内部截图检查覆盖主 Tab、Sync/Restore/WebDAV、Reader Control Home、7 个 Reader 快捷/模块态和 4 个 Reader 完整控制页；证据分别为 `/tmp/reader-p4-bookshelf-set.png`、`/tmp/reader-p4-final-sync.png`、`/tmp/reader-p4-final-control-home.png`、`/tmp/reader-p4-final-reader-quick-fixed.png`、`/tmp/reader-p4-final-reader-full-fixed.png`。这些记录不能替代当前逐页对照和用户视觉确认。
6. 72 个 HTML-to-Figma 节点在形成页面级 master 后已从临时区移除；空 staging 与错误的 757px 旧书架节点均已删除，仓库临时 capture script 也已移除。
7. “全量”指 24 个实际页面/状态族的设计覆盖，不把当前 260 个 route/alias 做重复页面；加载、空、错误、确认和进度等状态继续由 M3 参考与共享 State/Overlay 组件覆盖。新增 24 个项目能力 intake route 是否增加视觉代表稿，由产品能力矩阵和后续 Figma 任务决定，不能由 route 数反推页面数。

```text
M0–M5 Figma 代表页面矩阵已装配，尚未定稿
  -> VC0 用户逐页审计并分类视觉差异
  -> VC1 在 Figma 修正需要设计判断的差异
  -> VC2 冻结 Design Delta，Codex 显式回写 token / component / shell / renderer
  -> VC3 浏览器实页与仓库门禁
  -> MR0–MR3 Motion Contract / Reference / demo harness
  -> 各 Host 分别实现确认后的静态 UI 与 Motion
```

## 权威与同步边界

1. Figma `15 · Reader 2` 定义 Reader 控制层静态视觉；`frontend-demo-optimized/` 定义 route、structure、state、交互、连续分页与响应式行为 proof。两者冲突时必须先形成 Design Delta，不允许静默覆盖。
2. Motion 的跨端语义与规则以 `contracts/motion*` 为权威，demo 只提供可执行 proof。Figma 可用于视觉编辑、组件组织、核心动效关键帧和视觉复核，不承载当前 260 个 route 的运行时状态机，也不替代 Motion Contract。
3. Figma 中确认的修改必须形成可审计差异，再由 Codex 显式映射为 token、component、shell slot、fixture 或 renderer 变更。
4. 当前仓库没有经过验证的 Figma → Reader-UI 自动同步、双向镜像或 Code Connect release gate。
5. 修改 Figma 不会修改本地 Git；修改本地 demo 也不会自动覆盖 Figma。
6. 动画、matched geometry、导航转场、手势、安全区与 reduced-motion 必须分别进入 iOS、Android、HarmonyOS 的 Native UI / MotionAdapter；HTTP、文件、系统 TTS、通知等设备能力才进入 HostAdapter。Motion 不进入 Core；仅更新 Figma 不构成 Host 完成证据。
