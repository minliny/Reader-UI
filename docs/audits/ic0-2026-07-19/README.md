# IC0 / VC0 审计包 · 2026-07-19

本目录是第 1 执行项的完整单包，不把内容拆散到多个无入口页面。

## 入口

1. [IC0 交互控件全量事实审计](./IC0_INTERACTION_CONTROL_AUDIT.md)
2. [Settings General VC0 代表页面审计](./SETTINGS_GENERAL_VC0_SAMPLE.md)
3. [机器 coverage](./generated/interaction-control-coverage.json)
4. [机器 inventory](./generated/interaction-control-inventory.json)
5. [Settings General 浏览器操作记录](./settings-general-browser-observation.json)

## 图片证据

每个 viewport 只保留一次当前 Figma、一次当前 Browser 和一张同尺寸并排图；`*-capture.png` 是 Browser 原始 capture，未用于直接视觉判定。

| Viewport | Figma | Browser | Comparison |
| --- | --- | --- | --- |
| Phone | [390 × 844](./figma-settings-general-phone.png) | [390 × 844](./browser-settings-general-phone.png) | [并排](./settings-general-phone-comparison.png) |
| Compact | [844 × 390](./figma-settings-general-compact.png) | [844 × 390](./browser-settings-general-compact.png) | [并排](./settings-general-compact-comparison.png) |
| Tablet | [760 × 960](./figma-settings-general-tablet.png) | [760 × 960](./browser-settings-general-tablet.png) | [并排](./settings-general-tablet-comparison.png) |

## 当前状态

- 审计工具可重复重算 266 个 route / variant case、3,752 个语义控件和 63 个疑似非语义交互候选。
- `Settings General` VC0 分类为 `两阶段`：先修 Reader-UI 交互，再确认 Figma Design Delta。
- `IC0 · Inventory Exact` 未通过：3,815 个候选仍无 canonical control id 和跨 Figma / ScreenGraph / DOM join key。
- 本目录不属于 release manifest；没有发布、consumer lock、模拟器或真机状态变化。
