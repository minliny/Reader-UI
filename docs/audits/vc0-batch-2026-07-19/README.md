# VC0 批量审计暂存包 · 2026-07-19

状态：A1 · VC0 Evidence Closure 工作包已完成 24 族 manifest、12 族 Figma / Browser 对照现状、最小交互 trace、最终分类、artifact SHA-256 与证据限制；IC0 仍因 3,815 / 3,815 controls 缺稳定 join key 未通过，VC0 证据收口不等于 VC0 门禁通过。

## 已落盘

### A1 工作包写入

- `generated/family-manifest.json`：24 族 exact manifest（F01-F11 Reader 历史、F12 Settings 样板、F13-F24 本批 12 族）；不把 Figma 24 Set、25 原型 route 和 Reader-UI runtime family 混成一个分母。
- `generated/visual-comparison-manifest.json`：12 族 Figma / Browser 视觉对照现状清单。18 张 browser raw 截图齐备；Figma 截图 0 张；comparison 图 0 张（不伪造）。
- `generated/browser-structure-observations.json`：36 条当前浏览器观测（12 族 × 3 视口，部分族仅 phone）。
- `generated/interaction-traces.json`：12 族 23 个最小交互 trace。before / operationTarget / derivableUiEvent 从静态 DOM 推导；after / focus / console / 稳定终态标记 `missing-needs-browser-automation`。
- `final-classification.md`：12 族最终分类，保持预分类（keep=2 / codex-fix=1 / two-stage=9 / figma-modify=0）。
- `artifact-hashes.json`：A1 写入的 9 个文件 + 18 张 browser raw 截图 + 8 个引用文件的 SHA-256；worktree HEAD `8f9eea1c31cb4b3328f76a06fd286868ea7b9f13`。
- `evidence/browser-raw/`：12 个 Phone 原始截图，以及 Bookshelf / Restore Preview / Source Switch 的 Compact、Tablet 原始截图，共 18 张。

### A1 修正的 IC0 文件

- `../ic0-2026-07-19/settings-general-browser-observation.json`：新增 `domBoundsCaliber` 字段，明确仅 productCanvas / mainSurface 外框，标题 / 区块 / 控件行 / 滚动范围 / 安全区域 / focus / hit target 缺失。
- `../ic0-2026-07-19/SETTINGS_GENERAL_VC0_SAMPLE.md`：新增 Section 6 DOM bounds 证据口径修正；Section 7 增加控件语义与 DOM bounds 补齐条目；Section 8 VC0 判定表更新 DOM bounds 行与新增「可以宣称 DOM geometry 已完整 | 否」行。

## 已确认的 Figma 现场事实

- `23 · Pages · Final`：25 个 family × 3 个 viewport prototype frame。
- `24 · Responsive Masters · Phase 4`：24 个 Component Set、72 个 Component、0 个 instance、0 条 reaction。
- 24 个来源族只有外置 `PrototypeHit` 导航；唯一具有组件内 hover / press reaction 的族是来自 `15 · Reader 2` 的 Reader Control Home。
- 本批只处理剩余 12 个非 Reader 页面族；不重审或覆盖 Reader 2。
- Figma 端 Node ID 已在 `family-manifest.json` 登记，但未导出为 PNG。

## 最终分类结论

| 顺序 | familyId | routeId | 最终分类 | 下一 owner |
| --- | --- | --- | --- | --- |
| 1 | F13-source-management | `source-management` | 两阶段 | Reader-UI 先修 |
| 2 | F14-webdav-config | `webdav-config` | 两阶段 | Reader-UI 先修 |
| 3 | F15-sync-backup | `sync-backup` | 两阶段 | Reader-UI 先修 |
| 4 | F16-search-results | `search-results` | 两阶段 | Reader-UI 先修 |
| 5 | F17-bookshelf | `bookshelf` | 两阶段 | Reader-UI 先修 |
| 6 | F18-book-detail | `book-detail` | 两阶段 | Reader-UI 先修 |
| 7 | F19-import-conflict-resolve | `import-conflict-resolve` | 两阶段 | Reader-UI 先修 |
| 8 | F20-discover | `discover` | 两阶段 | Reader-UI 先修 |
| 9 | F21-rss | `rss` | 两阶段 | Reader-UI 先修 |
| 10 | F22-source-switch | `source-switch` | Codex 修复 | Reader-UI |
| 11 | F23-about | `about` | 保持 | VC0 确认 |
| 12 | F24-restore-preview | `restore-preview` | 保持 | VC0 确认 |

合计：保持 2、Codex 修复 1、两阶段 9、Figma 修改 0。详见 [final-classification.md](./final-classification.md)。

## 尚缺（不在此工作包范围）

1. **IC0 仍因无稳定 join key 未通过**：3,815 / 3,815 controls 缺稳定跨层身份；A2 · Control Identity Foundation 的第一阻塞。
2. **Figma 截图全部缺失**：12 族均未采集 Figma 静态截图，无法做同尺寸 Figma / Browser 对照；需要后续工作包补齐或由用户确认跳过。
3. **浏览器自动化 trace 缺失**：`interaction-traces.json` 中 12 族 23 个 trace 的 after / focus / console / 稳定终态字段一律标记为 `missing-needs-browser-automation`。
4. **compact / tablet 视口 DOM 部分缺失**：仅 F17-bookshelf / F22-source-switch / F24-restore-preview 三族三视口齐备，其余 9 族仅 phone 视口。
5. **12 族最终分类待用户确认**：A1 保持预分类，需用户确认后方可进入 VC1 / VC2 / VC3 串行流程。

完整施工指导见 [Reader 后续多 agent 执行指导](../../READER_MULTI_AGENT_EXECUTION_GUIDE_2026-07-19.md)。
