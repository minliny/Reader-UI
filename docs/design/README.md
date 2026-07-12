# Reader UI Design Planning Index

状态：已确认设计规划索引；不代表当前 demo、合同或三端 Host 已完成实现

更新时间：2026-07-11

## 设计基线

- [Paper Flow Motion Language](./PAPER_FLOW_MOTION_LANGUAGE.md)：统一动效艺术语言、动效家族、节奏、缓动和阅读纪律。
- [Paper Flow Icon System](./PAPER_FLOW_ICON_SYSTEM.md)：图标网格、静态状态、图标动效和禁止项。
- [Figma Handoff Status (2026-07-12)](./FIGMA_HANDOFF_STATUS_2026-07-12.md)：当前可编辑组件、Phase 4 三视口基线、代码回写方式和不可自动同步边界。

## 控件视觉基线

- [Reader Control Primitives](./READER_CONTROL_PRIMITIVES.md)：FieldRow、Select、Input、Switch、Button、SegmentedControl、Slider 的统一尺寸、表面、状态、响应式与可访问性约束。

本文档集不再定义阅读控制层的结构、层级、模块内容、导航、展开或收起逻辑；相关产品结构等待新的权威规格。

## 阅读视口与系统区域

- [Reader Viewport and Chrome Policy](./READER_VIEWPORT_AND_CHROME_POLICY.md)：状态栏显示/隐藏、物理遮挡、阅读信息槽位、Session 胶囊锚点和全 Host 输入输出边界。

## 权威边界

这些文档记录已确认的产品与视觉规划。当前机器可执行权威源仍是：

1. `contracts/` schema 与 fixtures。
2. `frontend-demo-optimized/` 当前 canonical runnable demo。
3. `generated/` 与 `packages/` 三端消费产物。

规划落地时必须先升级合同或明确 demo-only 阶段，不能仅凭本文档宣称 Host 已支持。
