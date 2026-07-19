# Reader 后续多 agent 执行指导

状态：当前唯一并行施工指导；任何 agent 开始前先核对本文件与当前工作树，不以旧总结替代现场事实

更新时间：2026-07-19

## 1. 当前已经做到哪里

| 对象 | 当前事实 | 尚不能宣称 |
| --- | --- | --- |
| 总执行基线 | 权威顺序、状态口径、Figma / Reader-UI / Core / 三端 / 设备 / 发布边界已冻结 | 完整产品已完成 |
| Reader 2 | `15 · Reader 2` 已是静态唯一源；12 个 primary 状态已完成 VC2 / VC3 | Motion 用户确认、三端原生和设备通过 |
| IC0 首版 | 已枚举 266 个 route / variant case、3,752 个语义控件和 63 个疑似非语义控件 | Inventory Exact 通过；3,815 个候选仍缺稳定跨层 join key |
| Settings General | 已完成三视口 VC0 样板并判定为 `两阶段`；A1 已修正 DOM bounds 证据口径（仅 productCanvas / mainSurface 外框，标题 / 区块 / 控件行 / 滚动范围 / 安全区域 / focus / hit target 缺失） | 页面交互已完成或可以直接 Figma 定稿；DOM geometry 已完整 |
| VC0 12 族证据收口 | A1 已完成 24 族 exact manifest、12 族 Figma / Browser 对照现状清单、12 族最小交互 trace、最终分类、artifact SHA-256；分类保持预分类（keep=2 / codex-fix=1 / two-stage=9 / figma-modify=0） | 12 族 VC1 / VC2 / VC3 已通过；Figma 截图已采集；after / focus / console / 稳定终态已采集；IC0 已通过 |
| Figma 交互事实 | `23 · Pages · Final` 有 25×3 原型帧；`24 · Responsive Masters` 有 24 个静态 Set / 72 variants / 0 reaction | 所有按钮已有组件级 pressed、loading、disabled 或 Motion 实现 |
| 原生与发布 | 有局部本地代码候选和自动化测试源码 | 人工、模拟器、真机、不可变 artifact、consumer lock 或 Release Ready |

A1 · VC0 Evidence Closure 工作包已完成：24 族 manifest、12 族事实清单、最小交互 trace、最终分类、artifact SHA-256 与证据限制均落盘于 `docs/audits/vc0-batch-2026-07-19/`；IC0 仍因 3,815 / 3,815 controls 缺稳定 join key 未通过，VC0 证据收口不等于 VC0 门禁通过。入口见 [VC0 批量审计暂存包](./audits/vc0-batch-2026-07-19/README.md) 与 [VC0 最终分类](./audits/vc0-batch-2026-07-19/final-classification.md)。

## 2. 现在还差什么

### 2.1 当前最近的未完成项

A1 · VC0 Evidence Closure 的 5 项任务已由 A1 工作包完成（24 族 manifest、12 族 Figma / Browser 对照现状、最小交互 trace、最终分类、Settings DOM bounds 口径修正）。当前最近的未完成项转移为：

1. **IC0 仍因无稳定 join key 未通过**：3,815 / 3,815 controls 缺稳定跨层身份；这是 A2 · Control Identity Foundation 的第一阻塞，必须先于 VC1 / VC2 / VC3。
2. **Figma 截图全部缺失**：12 族均未在 `docs/audits/vc0-batch-2026-07-19/evidence/` 下采集 Figma 静态截图，无法做同尺寸 Figma / Browser 对照；Figma 端 Node ID 已在 `family-manifest.json` 登记，但未导出为 PNG。需要后续工作包补齐或由用户确认跳过。
3. **浏览器自动化 trace 缺失**：`interaction-traces.json` 中 12 族 23 个 trace 的 after / focus / console / 稳定终态字段一律标记为 `missing-needs-browser-automation`；未启动浏览器自动化，无法验证动效实际播放、焦点路径与 console error。
4. **compact / tablet 视口 DOM 部分缺失**：仅 F17-bookshelf / F22-source-switch / F24-restore-preview 三族三视口齐备，其余 9 族仅 phone 视口；compact / tablet 的 motion 等价未单独验证。
5. **12 族最终分类待用户确认**：A1 保持预分类（keep=2 / codex-fix=1 / two-stage=9 / figma-modify=0），但需用户确认后方可进入 VC1 / VC2 / VC3 串行流程。

### 2.2 设计与 Web 前端仍缺

1. `controlId / data-control-id`、ScreenGraph component instance、Figma family/node、DOM selector 的稳定跨层身份；这是 IC0 的第一阻塞。
2. Settings General 的唯一 renderer、Switch / Select / Segment 语义、状态 owner、缓存 / 权限 / 恢复默认可见结果。
3. Source Management / WebDAV / Sync 共享输入控件、Switch / Stepper / Select、异步状态与危险确认。
4. Bookshelf / Book Detail / Import Conflict / Search Results 的 Dialog / Sheet / loading / empty / error、输入与焦点、重复提交和回滚。
5. Discover / RSS 的筛选、Segment、刷新、Toast / Dialog 与异步结果。
6. Source Switch 的本地控件身份和 UiEvent 映射；现有 Figma CandidateRow / Window / Overlay 组件链可以保留。
7. 每个用户确认页面族依次完成 VC1、VC2、VC3；Figma 写入必须串行，Reader-UI 域实现可在共享身份合同冻结后并行。
8. IC1–IC5：canonical component、Action Contract、Web Runtime、Motion / reduced-motion、响应式与无障碍全量门禁。

### 2.3 完整应用仍缺

1. 按 Slice 能力族冻结 Core / Host 协议并关闭尚缺业务语义，不从页面数量反推 Core 范围。
2. iOS / Android / HarmonyOS 的原生 renderer、effect、MotionAdapter、平台状态恢复和无障碍实现。
3. 三端模拟器人工操作证据，再到真机、性能、读屏、权限、后台、旋转和恢复证据。
4. 候选预验收、不可变 Core artifact、SHA-256、正式 consumer lock、锁定字节重跑三端门禁和回滚。

## 3. 12 个页面族当前预分类

这张表是执行排序输入，不替代最终 VC0；所有页面仍受 3,815 / 3,815 无稳定 join key 限制。

| 顺序 | 页面族 / route | 预分类 | 下一 owner | 首要缺口 |
| --- | --- | --- | --- | --- |
| 1 | `source-management` | 两阶段 | Reader-UI 先修 | 4 个可见非语义 Switch；删除确认与异步结果 |
| 2 | `webdav-config` | 两阶段 | Reader-UI 先修 | Switch / Stepper / Select 语义和状态 |
| 3 | `sync-backup` | 两阶段 | Reader-UI 先修 | default / loading 视觉等同、输入与 async 状态 |
| 4 | `search-results` | 两阶段 | Reader-UI 先修 | 2 个空 accessible name、输入 / 焦点 / 重复提交 |
| 5 | `bookshelf` | 两阶段 | Reader-UI 先修 | 稳定事件身份、Sheet / Dialog 状态 |
| 6 | `book-detail` | 两阶段 | Reader-UI 先修 | default / loading 视觉等同、换源 Sheet / 删除 Dialog |
| 7 | `import-conflict-resolve` | 两阶段 | Reader-UI 先修 | 冲突选择、回滚与非语义候选 |
| 8 | `discover` | 两阶段 | Reader-UI 先修 | filter / segment / source-confirm 状态 |
| 9 | `rss` | 两阶段 | Reader-UI 先修 | refresh、筛选、Toast / Dialog 与 async 结果 |
| 10 | `source-switch` | Codex 修复 | Reader-UI | Figma 结构可保留；补稳定身份和 UiEvent |
| 11 | `about` | 保持 | VC0 确认 | 保持仅指当前静态候选 |
| 12 | `restore-preview` | 保持 | VC0 确认 | 保持宽屏结构；仍需全局 ID / crosswalk |

当前没有证据支持纯 `Figma 修改`。出现新的纯 Figma 问题时，必须来自同状态、同尺寸的当前 Figma / Browser 对照，或用户明确改版决定。

## 4. 并行施工拓扑

### Phase A · 现在可以并行

| 工作包 | 写入范围 | 可与谁并行 | 退出条件 |
| --- | --- | --- | --- |
| A1 · VC0 Evidence Closure | 只写 `docs/audits/vc0-batch-2026-07-19/` 与状态文档；Figma / runtime 只读 | A2 | 24 族 manifest、12 族事实、最终分类、证据 hash 和限制完整 |
| A2 · Control Identity Foundation | Reader-UI schema、ScreenGraph、codegen、DOM identity 与测试 | A1 | 稳定 ID 能从 contract 映射到 ScreenGraph / DOM；零重复、零缺失；不谎称 Figma 已 join |

A1 不得修改产品 runtime 或 Figma。A2 不得顺手修页面视觉、业务行为、Motion 或三端代码。两个工作包必须使用隔离 worktree / branch，禁止在同一脏工作树同时写同一文件。

### Phase B · A2 冻结后并行

| 工作包 | 页面族 | 允许写入 | 禁止越界 |
| --- | --- | --- | --- |
| B1 · Settings Operations | settings-general、source-management、webdav-config、sync-backup | SettingsShell、共享输入控件、对应 renderer / state / tests | 不改 Library / Discover / Reader 2 / Figma |
| B2 · Library & Search | bookshelf、book-detail、import-conflict-resolve、search-results | LibraryShell、对应 renderer / state / tests | 不改 Settings / RSS / Reader 2 / Figma |
| B3 · Discover & RSS | discover、rss | MainTabShell 下对应域 renderer / state / tests | 不改 Settings / Library / Reader 2 / Figma |
| B4 · Source Switch | source-switch | FlowShell、CandidateRow / action mapping、tests | 不改 Reader 2 canonical static、Motion Reference 或 Figma |

每个 B 包必须先消费同一个 A2 基础 commit。页面实现完成只可声明 `本地代码候选`；必须另交浏览器人工 / 自动 trace 才能声明 `浏览器已验证`。

### Phase C · 串行 Figma 与浏览器闭环

1. 用户按页面族确认 `保持 / Codex 修复 / Figma 修改 / 两阶段`。
2. 一个 Figma writer 一次只处理一个页面族；先修共享 component，再让实例继承。
3. 输出 Design Delta 后，Codex 显式回写 Reader-UI；Figma 不直接覆盖代码。
4. Phone / Compact / Tablet 完成 VC3，才允许该页面族进入 Motion。
5. Reader 2、`25 · Motion Reference`、`26 · Reader Control Continuity` 和手工 Review artifact 均保持既有边界，除非任务明确点名。

### Phase D · Motion、原生与发布

1. 按已通过 VC3 的页面族关闭 MR0–MR3；静态截图不能证明 Motion。
2. 三端分别实现 MR4，并保存模拟器人工证据。
3. 完成 MR5 真机 / 性能 / 无障碍 / 权限 / 后台 / 恢复。
4. 最后才做 artifact / lock / locked-byte rerun；不得手工改版本号或 lock 冒充正式消费。

## 5. 所有 Agent 的固定开工检查

每个 Agent 在修改前必须报告：

1. 当前仓库绝对路径、branch、HEAD、`git status --short`。
2. 本工作包允许写入的文件边界和现有用户改动。
3. 所消费的 Reader-UI contract revision、Figma fileKey / page / node 和浏览器 URL。
4. 本次证明层级：结构、浏览器、本地代码、模拟器、真机或发布；禁止跨层外推。
5. 计划使用的测试、截图、trace、日志和 hash。

固定禁止项：

- 不删除或替换用户手工 Figma 页面、variant、component、reaction 或 Review artifact。
- 不从截图、Figma 页数或 route 数量反推产品 / Core 全量范围。
- 不把外置 PrototypeHit 导航说成组件内 pressed / loading / Motion 实现。
- 不把静态 Figma、合同测试、本地 build、模拟器和真机混成一个完成状态。
- 不发布 GitHub Release、不更新 consumer lock，除非进入独立发布事务且候选预验收已完成。

## 6. 可直接交给其他 Agent 的任务提示

### A1 · VC0 Evidence Closure

> 在 `/Users/minliny/Documents/Reader/Reader-UI` 只完成 VC0 证据收口。先读 `docs/READER_PRODUCT_EXECUTION_BASELINE_2026-07-19.md`、本指导和 `docs/audits/ic0-2026-07-19/`。范围只含 12 个非 Reader 页面族；Reader 2 已 VC3，Settings General 已有样板。只读 Figma `klhs2jMM4MncaJFqZMfqEK` 和当前浏览器实页，不改 Figma、不改 runtime。建立 24 族 exact manifest，修正 Settings DOM geometry 证据口径，为 12 族完成当前 Figma / Browser 对照、结构观测、最小交互 trace、artifact SHA-256、最终分类与证据限制。截图按视觉等价类保留，不按 alias 重复。最后跑链接、JSON、hash 和 `git diff --check`；明确 IC0 仍因无稳定 join key 未通过。

### A2 · Control Identity Foundation

> 在隔离 worktree 中只实现 Reader-UI 的稳定交互身份基础。为所有语义控件和疑似非语义控件定义 canonical `controlId`，生成 / 验证 `data-control-id`、ScreenGraph component instance / binding 和代码落点，保证零重复、零缺失、可重算。Figma 当前没有 canonical join key，所以只输出待回填 crosswalk，不伪造 Figma node 绑定。不要修页面视觉、业务行为、Motion、三端或发布。新增 schema、codegen、drift test 和迁移报告；说明哪些 3,815 候选仍需人工映射。

### B1 · Settings Operations

> 基于已冻结的 Control Identity commit，按 `settings-general → source-management → webdav-config → sync-backup` 顺序修 Reader-UI。统一唯一 production renderer；使用原生 Switch / Select / Segment / Stepper / input 语义；补 UiEvent、state owner、busy / success / error、repeat tap、stale result、危险确认、权限 / Host 返回和焦点恢复。先完成功能与三视口浏览器 trace，再输出给 Figma 的 Design Delta；本任务不写 Figma、不改 Reader 2、不做原生或发布。

### B2 · Library & Search

> 基于同一 Control Identity commit，修 `bookshelf`、`book-detail`、`import-conflict-resolve`、`search-results`。处理稳定事件身份、搜索输入 / submit / accessible name / focus、cover-list 切换终态、换源 Sheet、目录 / 删除 Dialog、导入冲突选择 / rollback、loading / empty / error。保持既有视觉基线，先用浏览器证明真实行为，再形成 Design Delta；不写 Figma、不改 Settings / Reader 2 / Motion / 原生。

### B3 · Discover & RSS

> 基于同一 Control Identity commit，修 `discover` 与 `rss` 的 filter / segment、刷新、source confirm、Toast / Dialog、loading / empty / error 和异步结果。每个可操作控件必须有唯一 UiEvent / owner / stable final state；补键盘、focus、repeat tap、stale result 和 reduced-motion 终态。只改本域 Reader-UI 与测试，不写 Figma、不做原生或发布。

### B4 · Source Switch

> 基于同一 Control Identity commit，只修 `source-switch` 的本地身份、CandidateRow 选择、close / rollback、UiEvent 与结果状态。复用现有 Figma CandidateRow / Window / Overlay 结构，不修改 `15 · Reader 2` canonical static、Motion Reference 或 Figma。完成 Phone / Compact / Tablet 浏览器 trace，证明选择、取消、失败和稳定终态。

## 7. 合并与声明规则

合并顺序固定为：

```text
A1 证据结论（只读事实）
  + A2 稳定身份基础
  -> B1 / B2 / B3 / B4 域实现
  -> 用户逐族确认
  -> 串行 VC1
  -> VC2 / VC3
  -> IC1–IC5 / MR
  -> 三端模拟器 / 真机
  -> artifact / lock / locked-byte release gate
```

任何 Agent 的最终报告必须采用“对象 + 层级 + 原始证据 + 未完成项”。未产生对应层证据时，不更新为更高状态。
