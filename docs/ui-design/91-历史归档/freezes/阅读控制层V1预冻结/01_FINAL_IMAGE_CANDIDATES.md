# Final 图片候选清单

状态说明：

- `CANDIDATE_OK`：可作为候选 final，但仍需正式冻结确认。
- `NEEDS_REDRAW`：图片存在底部进度条、控制层位置、尺寸或规范冲突，需要重画。
- `NEEDS_HEIGHT_ONLY_REDRAW`：需要重画/重生成，但只允许调整相对高度，其他元素不修改。
- `NEEDS_DECISION`：存在多张同状态或边界不清，需要人工选择。
- `NOT_FOUND`：未找到对应图片。
- `CONTENT_REFERENCE_ONLY`：只保留内容或交互语义，不可作为 freeze final。
- `CURRENT_BASELINE`：当前唯一视觉与几何基线，可直接用于派生图校验。

| 状态 ID | 状态说明 | 首选候选图 | 备选图 | 是否可直接冻结 | 问题 | 建议 |
| ----- | ---- | ----- | --- | ------- | -- | -- |
| `reader_immersive` | 阅读沉浸页 | `docs/ui-design/04-阅读链路/沉浸阅读/图片/01-沉浸阅读-默认态.png` | 无 | `CANDIDATE_OK` | 已确认 `03` 不变。 | 作为候选进入预冻结清单。 |
| `reader_overlay_default` | 阅读控制层默认态 | `docs/ui-design/04-阅读链路/阅读控制层/图片/03-当前视觉基线.png` | `docs/ui-design/04-阅读链路/阅读控制层/图片/01-阅读控制层-默认总控态.png` | `CURRENT_BASELINE` | `04-2` 是唯一视觉与几何基线；`04` 只保留默认功能组成参考。 | 以 `04-2` 进入预冻结清单。 |
| `reader_overlay_progress_drag` | 章节进度拖动辅助态 | `docs/ui-design/04-阅读链路/阅读控制层/图片/10-章节进度控制.png` | 无 | `NEEDS_DECISION` | 现有图是流程/辅助示意，不是标准手机 final 截图。 | 决定是否需要单独标准手机图。 |
| `reader_overlay_brightness` | 亮度辅助状态 | `docs/ui-design/04-阅读链路/阅读控制层/图片/09-亮度系统模式状态.png` | 无 | `NEEDS_DECISION` | 现有图为横向辅助状态示意，不是标准手机 final 截图。 | 决定是否仅作为说明图，或补标准手机状态图。 |
| `reader_overlay_directory` | 目录/书签快捷模块 | `docs/ui-design/04-阅读链路/目录与书签/图片/07-目录快捷模块当前候选.png` | `docs/ui-design/04-阅读链路/目录与书签/图片/06-目录快捷模块高度对齐版.png` | `CANDIDATE_OK` | 已按 `04-2` 固定骨架重绘；旧图只保留内容参考。 | 进入预冻结候选。 |
| `reader_overlay_tts` | 朗读快捷模块 | `docs/ui-design/04-阅读链路/朗读/图片/05-朗读快捷模块当前候选.png` | `docs/ui-design/04-阅读链路/朗读/图片/04-朗读快捷模块高度对齐版.png` | `CANDIDATE_OK` | 已按 `04-2` 固定骨架重绘；旧图只保留内容参考。 | 进入预冻结候选。 |
| `reader_tts_running` | 朗读运行胶囊 | `docs/ui-design/04-阅读链路/朗读/图片/07-朗读运行胶囊当前采用版.png` | `docs/ui-design/04-阅读链路/朗读/图片/06-朗读运行胶囊旧版.png` | `CANDIDATE_OK` | 已完成历史高度对齐；是否纳入 V1 仍需按 `04-2` 锚点复核。 | 如纳入 V1，使用高度对齐版。 |
| `reader_tts_settings` | 朗读设置页 | `docs/ui-design/04-阅读链路/朗读/图片/08-朗读设置页.png` | 无 | `CANDIDATE_OK` | 是否纳入阅读控制层 V1 未确认。 | 人工确认是否作为 V1 附属完整页进入。 |
| `reader_overlay_appearance` | 界面快捷模块 | `docs/ui-design/04-阅读链路/阅读外观/图片/03-界面快捷模块当前候选.png` | `docs/ui-design/04-阅读链路/阅读外观/图片/02-界面快捷模块旧版.png` | `CANDIDATE_OK` | 已按 `04-2` 固定骨架重绘；旧图只保留内容参考。 | 进入预冻结候选。 |
| `reader_appearance_full_font` | 完整字体选择页面 | `docs/ui-design/04-阅读链路/阅读外观/图片/11-字体选择标准比例图.png` | 无 | `CANDIDATE_OK` | 已确认 `35-39` 作为完整界面全页面候选。 | 进入完整界面全页面候选组。 |
| `reader_appearance_full_theme` | 完整主题选择页面 | `docs/ui-design/04-阅读链路/阅读外观/图片/12-主题选择标准比例图.png` | 无 | `CANDIDATE_OK` | 已确认 `35-39` 作为完整界面全页面候选。 | 进入完整界面全页面候选组。 |
| `reader_appearance_full_theme_edit` | 完整主题编辑页面 | `docs/ui-design/04-阅读链路/阅读外观/图片/13-主题编辑标准比例图.png` | 无 | `CANDIDATE_OK` | 已确认 `35-39` 作为完整界面全页面候选。 | 进入完整界面全页面候选组。 |
| `reader_appearance_full_layout` | 完整版式高级页面 | `docs/ui-design/04-阅读链路/阅读外观/图片/14-版式高级标准比例图.png` | 无 | `CANDIDATE_OK` | 已确认 `35-39` 作为完整界面全页面候选。 | 进入完整界面全页面候选组。 |
| `reader_appearance_full_page_turn` | 完整翻页动画页面 | `docs/ui-design/04-阅读链路/阅读外观/图片/15-翻页动画标准比例图.png` | 无 | `CANDIDATE_OK` | 已确认 `35-39` 作为完整界面全页面候选。 | 进入完整界面全页面候选组。 |
| `reader_overlay_settings` | 设置快捷模块 | `docs/ui-design/04-阅读链路/阅读设置/图片/04-设置快捷模块当前候选.png` | `docs/ui-design/04-阅读链路/阅读设置/图片/03-设置快捷模块高度对齐版.png` | `CANDIDATE_OK` | 已按 `04-2` 固定骨架重绘；旧图只保留内容参考。 | 进入预冻结候选。 |
| `reader_overlay_auto_scroll` | 自动翻页设置覆盖层 | `docs/ui-design/04-阅读链路/自动翻页/图片/01-自动翻页设置覆盖层.png` | `docs/ui-design/04-阅读链路/自动翻页/图片/02-自动翻页运行胶囊.png` | `CANDIDATE_OK` | 属于临时覆盖层，不是四主按钮快捷模块；是否纳入 V1 需确认。 | 作为入口覆盖层候选，运行胶囊单独决策。 |
| `reader_overlay_content_search` | 内容搜索覆盖层 | `docs/ui-design/04-阅读链路/内容搜索/图片/01-内容搜索覆盖层.png` | `docs/ui-design/04-阅读链路/内容搜索/图片/02-完整内容搜索页.png` | `CANDIDATE_OK` | 完整搜索页是否纳入 V1 未确认。 | V1 优先纳入覆盖层，完整页作为延展。 |
| `reader_overlay_replace` | 内容替换覆盖层 | `docs/ui-design/04-阅读链路/内容替换/图片/01-内容替换快捷覆盖层.png` | `docs/ui-design/04-阅读链路/内容替换/图片/02-替换规则管理页.png` | `CANDIDATE_OK` | 完整规则页是否纳入 V1 未确认。 | V1 优先纳入快捷覆盖层。 |
| `reader_top_more_menu` | 顶部更多菜单 | `docs/ui-design/04-阅读链路/阅读控制层/图片/06-顶部更多菜单当前采用版.png` | `docs/ui-design/04-阅读链路/阅读控制层/图片/05-顶部更多菜单旧版.png`、`docs/ui-design/04-阅读链路/阅读控制层/图片/07-刷新本章反馈.png`、`docs/ui-design/04-阅读链路/阅读控制层/图片/08-调试信息底表.png` | `CANDIDATE_OK` | 已完成历史高度对齐；是否纳入 V1 需按 `04-2` 锚点复核。 | 如纳入 V1，使用高度对齐版。 |

## 复制到候选目录的图片

候选图已复制到：

`docs/ui-design/91-历史归档/freezes/阅读控制层V1预冻结/image-candidates/`

`image-candidates/_superseded/` 只保存高度对齐前的旧候选复制件，不作为 final 来源。
`CONTENT_REFERENCE_ONLY` 图片不得复制为 `.CANDIDATE.png`；目录中的历史复制件在正式打包前必须移入
`_superseded/` 或删除。
