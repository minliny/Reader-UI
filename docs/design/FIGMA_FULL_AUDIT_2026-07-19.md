# Figma Full Audit · 2026-07-19

状态：本轮结构整理与明确缺陷修复已完成；Motion 动态播放、三个 Host 原生实现和设备证据仍按各自门禁验收

Figma 文件：`klhs2jMM4MncaJFqZMfqEK`

## 1. 审计边界

本轮直接读取并修改当前 Figma 文件，不从截图反推项目范围，也不把本地 demo、Figma 静态页面、Motion Reference 或 Host 设备实现混成同一完成口径。

- Figma：页面角色、静态视觉、响应式母版、原型引用、关键帧参考与项目索引。
- Reader-UI：route / state / action / motion 合同及浏览器可执行行为。
- iOS / Android / HarmonyOS：原生渲染、手势、系统能力和设备证据。
- Core：业务实体、解析、规则、同步和 canonical result；不拥有视觉或 Host API。

## 2. 全文件结构

| 项目 | 当前结果 |
| --- | --- |
| 页面 | `29`，连续编号 `00–28` |
| 项目索引 | `28 · Project Index & Audit`；页面仅保留一个顶层审计 Frame |
| 静态 Reader 主源 | `15 · Reader 2`，原有 canonical 结构未改 |
| 最终装配 | `23 · Pages · Final` |
| 响应式母版 | `24 · Responsive Masters · Phase 4` |
| Motion Reference | `25 · Motion Reference` |
| Reader 连续性 | `26 · Reader Control Continuity` |
| 按钮交互样板 | `27 · Interaction Playground` |

页面职责、Reference / Components / Assets / Deliverable 命名和 Archive 边界已统一写入第 28 页。经确认无内容、位于审计主 Frame 外的 `2022:18112 / Slice 1` 已删除；未删除原始页面、canonical component、variant、reaction 或 Flow Start。

## 3. 响应式母版与原型

### 3.1 机器验收结果

| 门禁 | 结果 |
| --- | --- |
| 页面级 Component Set | `24/24` |
| 每 Set variants | Phone / Compact / Tablet，`72/72` exact |
| Phone | `390×844` |
| Compact | `844×390` |
| Tablet | `760×960` |
| Final prototype routes | `25/25` |
| 每 route 视口 | `3/3` |
| Prototype viewport frame | `75/75`；实例 `x=0, y=0` 且尺寸等于父视口 |
| variant 缺失 / 重叠 | `0 / 0` |

### 3.2 已修复的明确缺陷

以下 11 个 Compact variant 原为 `390×390`，导致 `844×390` 原型 Frame 内实例左偏或只占一部分：

- `Page/Bookshelf`
- `Page/Book Detail`
- `Page/Import Conflict`
- `Page/Discover`
- `Page/RSS`
- `Page/Search Results`
- `Page/Settings General`
- `Page/About`
- `Page/Source Management`
- `Page/Sync Backup`
- `Page/WebDAV Config`

修复规则来自 `frontend-demo-optimized` 在真实 `844×390` viewport 下的布局，不把手机内容强行拉宽：

- variant 负责完整 `844×390` viewport；
- 普通页面的 `390×390` 产品 surface 保持原尺寸并水平居中（`x=227`）；
- viewport 使用当前 surface 背景色并裁切溢出；
- Component Set 重新排为 Phone `x=0`、Compact `x=470`、Tablet `x=1394`，避免 variant 重叠；
- `23 · Pages · Final` 中 11 个 Compact prototype instance 统一回到 `x=0, y=0, 844×390`。

Reader、Source Switch、Restore Preview 等已经使用真实宽屏组合的 Compact 页面保持原宽屏结构，没有被改成居中手机 surface。

## 4. 交互与 Motion

### 4.1 按钮与连续性

- `26 · Reader Control Continuity`：一个连续矩阵 Section，包含 `8` 组 Expand / Collapse，共 `16` 个画面；当前含 `596` 个实例和 `336` 条 reaction。
- `27 · Interaction Playground`：Standard、Reduced、State Matrix 三块完整区域；当前含 `25` 条 reaction，用于按钮 resting / pressed / disabled / loading / reduced-motion 对照。

### 4.2 Motion Reference 现场值

| 项目 | 当前结果 |
| --- | --- |
| timeline container | `22`（MR1 production section + `21` 个 Review artifact） |
| animated node | `196` |
| Review artifact | `14` 个手工关键帧主导、`7` 个 Motion Style 主导 |
| timeline 越界 | `0` |
| 当前 connector 动态视频 | `export_video` 未暴露，不能用 resting screenshot 替代 |

已确认所有手工关键帧和已应用 Motion Style 的结束时间均未超过所属 timeline。部分 review timeline 为人工审视而放慢，不回写生产 duration；生产节奏仍以 `contracts/motion*` 和 canonical token 为准。

MR1 Reader Control 样板已有真实 Figma track、合同和本地 harness。MR2 页面上的 Review A–R 不自动等于十个核心家族全部完成；通用 Route / Tab、翻页 / 章节、直接操控手势、Overlay / Keyboard / Source Switch 和完整 Orientation / Interrupt 仍须按 Motion 计划补齐动态证据。MR3–MR5 不能由 Figma 静态审计代替。

## 5. 本地合同快照

本轮第 28 页同步记录 Reader-UI `3.0.0` 当前快照：

- `260` routes
- `190` screen variants
- `615` screen-graph nodes
- `97` screen bindings
- `95` canonical MotionIds（`89` active exact、`3` reserved、`3` deprecated）

这些数字只证明合同和 screen graph 完整，不证明三个 Host 已锁定 `3.0.0` 或已有真机结果。Host consumer lock、release artifact digest、设备型号 / OS / operator / video 必须由对应仓库和发布流水线提供。

## 6. 结论

Figma 的页面组织、响应式 exact-set、25×3 原型引用和已存在 Motion 轨道已完成本轮可自动验收的整理；11 个明确 Compact 缺陷已经统一修复。当前仍不能宣称“完整应用已交付”的部分均属于明确外部门禁：Motion 动态导出与用户节奏确认、三个 Host 的原生实现 / consumer lock、设备 / 性能 / 无障碍证据，以及 Slice 9–12 的真实 Core / Host 业务链。
