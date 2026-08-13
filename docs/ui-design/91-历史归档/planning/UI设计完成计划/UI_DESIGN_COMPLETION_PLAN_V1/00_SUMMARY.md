# UI 设计补齐规划 V1

> 状态更新（2026-06-11）：原始规划编写于图片批量生成前。当前以
> `UI_DESIGN_FULL_AUDIT_2026-06-11.md` 为准：46、47、48、51 系列已生成；49、50 系列仍缺；
> 阅读控制层四张快捷图需按 04-2 标准重绘。

## 基线结论

`PLANNING_SCOPE_MOSTLY_EXECUTED_FREEZE_GAPS_REMAIN`

依据：`docs/ui-design/90-审计与索引/02-页面覆盖与图片完整性审计.md`

本目录只做 UI 补齐规划和设计任务拆解，不是正式冻结包。

## 总体判断

当前 UI 资料中，阅读控制层最接近冻结，但 `16-5 / 18-3 / 21-1 / 22-2` 只作内容参考，
必须产出 04-2 标准版。阅读设置、书源管理、App 设置和全局状态模板已有 46/47/48/51
系列图片，待 spec 整合与人工终审。真实高优先级缺图为 49/50 系列共 9 张。

## P0 收敛方向

1. 对 46/47/48/51 系列完成 spec 整合和人工终审。
2. 补齐 49/50 系列 9 张高优先级状态图。
3. 按 preflight Contract 和 token 表执行 Reader Control Layer freeze 验收。

## 当前不做

- 不生成正式冻结包。
- 不生成新 UI 图。
- 不写前端代码。
- 不做 git 操作。

## 规划补充

- `09_MISSING_PAGE_TEXT_DESCRIPTIONS.md`：记录主页面和缺页文字描述。
- `10_MISSING_PAGE_LAYOUT_PLAN.md`：记录欠缺页面的具体内容、布局和建议补图顺序。
- `11_ADDITIONAL_PAGE_LAYOUT_PLAN.md`：记录后续功能页、弹层、底表和状态模板的内容与 UI 结构。

## 文档索引

| 文档 | 责任 |
| --- | --- |
| `01_READER_CONTROL_LAYER_FIX_TASKS.md` | 阅读控制层重绘与验收 |
| `02_MISSING_CORE_PAGES_TASKS.md` | 核心页面缺口 |
| `03_READER_SETTINGS_PAGE_TASKS.md` | 46 系列阅读设置 |
| `04_SOURCE_MANAGEMENT_PAGE_TASKS.md` | 47 系列书源管理 |
| `05_GLOBAL_STATE_TEMPLATES.md` | 51 系列全局状态 |
| `06_STITCH_PROMPTS.md` | Stitch 输入要求 |
| `07_FIGMA_FRAME_PLAN.md` | 设计文件 frame 组织 |
| `08_FREEZE_SEQUENCE.md` | Freeze 包顺序 |
| `09_MISSING_PAGE_TEXT_DESCRIPTIONS.md` | 页面文案 |
| `10_MISSING_PAGE_LAYOUT_PLAN.md` | 第一批缺页布局 |
| `11_ADDITIONAL_PAGE_LAYOUT_PLAN.md` | 后续页面布局 |

## 时间线

| 日期 | 事件 |
| --- | --- |
| 2026-06-05 | V1 规划建立 |
| 2026-06-07 至 2026-06-11 | 46/47/48/51 系列图片生成 |
| 2026-06-11 | 全量审计校正图片缺口与 freeze 阻塞项 |

## 规划阶段退出检查

- [x] 页面与状态任务已拆分。
- [x] 46/47/48/51 系列设计图已生成并登记。
- [x] Reader Control Layer 权威基线统一为 04-2。
- [x] 04-2 标准快捷图 `16-6 / 18-4 / 21-2 / 22-3` 已生成并完成首轮视觉检查。
- [ ] 49/50 系列 9 张缺图已生成并验收。
- [ ] 46/47/48/51 系列已写入对应正式 spec 的采用状态。
- [ ] 所有 freeze P0 检查通过。
