# Stitch P0 输入包 V1 总结

## 状态

`STITCH_P0_INPUT_PACKAGE_READY`

Initial Draft v0 前置条件：`STITCH_INITIAL_DRAFT_PRECONDITIONS_READY`。

统一门禁见 `docs/ui-design/STITCH_INITIAL_DRAFT_V0_PRECONDITIONS.md`。本输入包可用于初稿，
但不能作为开发交付基准。

## 背景

当前总体结论为 `STITCH_NEAR_READY_WITH_P0_GAPS`。阅读模块和 App Shell 已接近可交给 Stitch 生成初稿；全 App 初稿前仍有 P0 输入缺口需要先整理给 Stitch。

本目录只整理 Stitch 输入包，不生成 UI 图、不调用 Stitch、不写前端代码。

## 输入范围

本包覆盖：

- 书源管理首页 Stitch 提示词。
- 阅读内完整设置页组 Stitch 提示词。
- 全局状态模板 Stitch 提示词。
- 组件风格指南 Stitch 提示词。
- 26/27 辅助态 final 决策。
- Stitch 执行顺序。
- Initial Draft v0 的 DARK token、图片排除、49/50 推导和信息架构硬约束。

## 关键结论

1. App Shell 四个底栏主页面已齐：书架、发现、RSS、设置。
2. 全 App 初稿前 P0 缺口集中在书源管理首页、阅读内完整设置页、全局状态模板。
3. 26/27 可作为阅读辅助交互参考，但不建议直接作为 V1 标准手机 final。

## 参考资料

- `docs/ui-design/90-审计与索引/Stitch审计/05-Stitch-UI草稿就绪审计.md`
- `docs/ui-design/90-审计与索引/Stitch审计/03-Stitch图片元素就绪审计.md`
- `docs/ui-design/90-审计与索引/Stitch审计/04-Stitch就绪摘要.md`
- `docs/ui-design/90-审计与索引/02-页面覆盖与图片完整性审计.md`
- `docs/ui-design/91-历史归档/drafts/旧全局草稿目录/`
- `docs/ui-design/91-历史归档/specs/旧UI规格目录/`
- `docs/ui-design/91-历史归档/planning/UI设计完成计划/UI_DESIGN_COMPLETION_PLAN_V1/`
