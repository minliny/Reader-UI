# Stitch 执行顺序

## 推荐顺序表

| 顺序 | 任务 | 输入资料 | 输出目标 | 是否阻塞全 App 初稿 |
| -- | -- | ---- | ---- | ------------ |
| 0 | 输入门禁 | `STITCH_INITIAL_DRAFT_V0_PRECONDITIONS.md`、DARK token 草案 | 应用排除清单、唯一基线、49/50 推导标记 | 是 |
| 1 | 组件风格指南 | `docs/ui-design/91-历史归档/drafts/旧全局草稿目录/`、`STITCH_READINESS_IMAGE_ELEMENT_AUDIT.md` | 组件样例、视觉 token、人工测量清单 | 是 |
| 2 | 全局状态模板 | `05_GLOBAL_STATE_TEMPLATES.md`、51 系列结构 | 暖白覆盖后的 loading、empty、error、network_error、delete_confirm、operation feedback、permission_required | 是 |
| 3 | 书源管理首页 | `10_MISSING_PAGE_LAYOUT_PLAN.md`、`11_ADDITIONAL_PAGE_LAYOUT_PLAN.md`、设置页 `43` | 高密度工具型书源管理首页 | 是 |
| 4 | 阅读内完整设置页 | `reader-settings.md`、`03_READER_SETTINGS_PAGE_TASKS.md`、`22-2` | 阅读设置首页及子页方向 | 是 |
| 5 | 49/50 派生状态 | `51` 系列、目标页面默认态 | 标记为 `DERIVED_NOT_FINAL` 的结构草案 | 否 |
| 6 | 26/27 辅助态确认 | `26`、`27`、阅读控制层审计结论 | 标注为 reference 或补 final 图决策 | 否 |

## 执行说明

1. 先应用 Initial Draft v0 门禁与图片排除清单，再读取 drafts。
2. 先做组件风格指南，减少后续页面生成时的样式漂移。
3. 再做全局状态模板，因为它会被书源管理、设置、搜索、书架复用。
4. 书源管理首页是设置页最重要的 P0 管理入口，应先补。
5. 阅读内完整设置页是阅读控制层 `完整设置 >` 的落点，应随后补。
6. 49/50 允许从 51 结构推导，但必须保留 `DERIVED_NOT_FINAL` 标记。
7. 26/27 当前建议作为 reference，不阻塞阅读模块 Stitch 初稿，但应在冻结前标注清楚。
