# Reader UI Design Planning Index

状态：已确认设计规划索引；不代表当前 demo、合同或三端 Host 已完成实现

更新时间：2026-07-19

## 设计基线

- [Paper Flow Motion Language](./PAPER_FLOW_MOTION_LANGUAGE.md)：统一动效艺术语言、动效家族、节奏、缓动和阅读纪律。
- [静态视觉闭环计划 (2026-07-14)](./VISUAL_CLOSURE_PLAN_2026-07-14.md)：把现有 Figma 装配候选经过逐页审计、Figma 修正、Design Delta、Reader-UI 回写和浏览器复验变成可冻结的静态基线；Reader 2 已完成 VC2 / VC3，其他页面族不因此自动关闭。
- [Reader 2 静态 Design Delta (2026-07-15)](./READER2_STATIC_DESIGN_DELTA_2026-07-15.md)：`15 · Reader 2` 权威节点、唯一原子源、Reader-UI 回写落点、三档冻结值和 VC3 证据。
- [Reader 2 AppearanceSpec 更新流程 (2026-07-17)](./APPEARANCE_SPEC_UPDATE_FLOW_2026-07-17.md)：把主题、字体、选择项和步进器从 Figma delta 收敛到一个 fixture，并生成 Web / Swift / Kotlin / ArkTS 消费产物。
- [Motion 四层交付规划 (2026-07-14)](./MOTION_DELIVERY_PLAN_2026-07-14.md)：VC3 通过后的 Figma / Contract / demo / 三端 Host 职责边界、十个核心动效家族与 MR0–MR5 执行门槛。
- [Paper Flow Icon System](./PAPER_FLOW_ICON_SYSTEM.md)：图标网格、静态状态、图标动效和禁止项。
- [Figma Handoff Status (updated 2026-07-19)](./FIGMA_HANDOFF_STATUS_2026-07-12.md)：`15 · Reader 2` 是 Reader 控制层唯一静态源；同时记录 Material M0–M5 候选、reference-only 边界、当前 29 页结构，以及其他页面族和 Motion 尚未完成的闭环。
- [Figma Material Coverage Inventory (2026-07-13)](./FIGMA_MATERIAL_INVENTORY_2026-07-13.md)：M0–M5 的 25 页历史物料快照，记录 497 个变量、24 个新响应式页面 Set、139 个 Tabler 图标和五类素材覆盖矩阵；当前 Figma 已扩展到 29 页，历史数量不代表实时数量或完成度。

## 控件视觉基线

- [Reader Control Primitives](./READER_CONTROL_PRIMITIVES.md)：FieldRow、Select、Input、Switch、Button、SegmentedControl、Slider 的统一尺寸、表面、状态、响应式与可访问性约束。

Reader 控制层的静态视觉以 Figma `15 · Reader 2` 为唯一输入；`frontend-demo-optimized/` 是 route、state、交互、连续分页与响应式浏览器 proof。`23 · Pages · Final` 只保留为其他页面族的候选装配区。

当前完成口径：M0–M5 只表示物料、参考、master 与候选实例已经装配；Reader 2 静态 VC2 / VC3 已关闭，其他 24 个页面/状态族的 VC0–VC3 尚未关闭。Motion 已建立独立 `25 · Motion Reference`，MR1 控制层完成自验但待用户确认，MR2 进行中，十个核心家族及 MR3–MR5 尚未闭环。

## 阅读视口与系统区域

- [Reader Viewport and Chrome Policy](./READER_VIEWPORT_AND_CHROME_POLICY.md)：状态栏显示/隐藏、物理遮挡、阅读信息槽位、Session 胶囊锚点和全 Host 输入输出边界。

## 权威边界

这些文档记录已确认的产品与视觉规划。当前机器可执行权威源仍是：

1. `contracts/` schema 与 fixtures。
2. Figma `15 · Reader 2` 的 Reader 控制层静态视觉。
3. `frontend-demo-optimized/` 的可执行 route、state、交互、连续分页与响应式 proof。
4. `generated/` 与 `packages/` 三端消费产物。

规划落地时必须先升级合同或明确 demo-only 阶段，不能仅凭本文档宣称 Host 已支持。Reader 2 的 VC3 静态门禁、Motion contract/demo 与三个 Host 的 Appearance 接线均已落地；三个 Host 的正式 consumer lock 仍为 Reader-UI 2.5.1，3.0 发布消费和 fresh 设备证据尚未关闭。

Motion 另遵循四层边界：Figma 定义关键视觉参考，`contracts/motion*` 定义跨端规则，`frontend-demo-optimized/` 验证可执行行为，三个 Host 用原生 MotionAdapter 实现并提供设备证据。Motion 不进入 Core，动画与手势也不属于 HostAdapter。
