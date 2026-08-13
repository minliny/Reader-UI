# 重画或重导出任务清单

优先级：

- `P0`：阻塞正式冻结包。
- `P1`：影响一致性，但可在 P0 解决后处理。

## 已完成的历史高度对齐

以下图片曾按 `04-reader-controls.png` 完成相对高度对齐，但不满足当前 `04-2` freeze 标准。
它们只保留内容或交互参考，不再作为当前采用版。

| 历史图 | 当前采用图 | 影响状态 | 完成标准 | 优先级 |
| -- | -- | ---- | ---- | --- |
| `docs/ui-design/04-阅读链路/目录与书签/图片/05-目录快捷模块旧版.png` | `docs/ui-design/04-阅读链路/目录与书签/图片/06-目录快捷模块高度对齐版.png` | `reader_overlay_directory` | 历史高度对齐完成；只保留内容参考。 | `REFERENCE_ONLY` |
| `docs/ui-design/04-阅读链路/朗读/图片/03-朗读快捷模块修正版.png` | `docs/ui-design/04-阅读链路/朗读/图片/04-朗读快捷模块高度对齐版.png` | `reader_overlay_tts` | 历史高度对齐完成；只保留内容参考。 | `REFERENCE_ONLY` |
| `docs/ui-design/04-阅读链路/朗读/图片/06-朗读运行胶囊旧版.png` | `docs/ui-design/04-阅读链路/朗读/图片/07-朗读运行胶囊当前采用版.png` | `reader_tts_running` | 仅调整相对高度；运行胶囊不挤压正文。 | `DONE` |
| `docs/ui-design/04-阅读链路/阅读设置/图片/02-设置快捷模块旧版.png` | `docs/ui-design/04-阅读链路/阅读设置/图片/03-设置快捷模块高度对齐版.png` | `reader_overlay_settings` | 历史高度对齐完成；只保留内容参考。 | `REFERENCE_ONLY` |
| `docs/ui-design/04-阅读链路/阅读控制层/图片/05-顶部更多菜单旧版.png` | `docs/ui-design/04-阅读链路/阅读控制层/图片/06-顶部更多菜单当前采用版.png` | `reader_top_more_menu` | 仅调整相对高度；顶部菜单位置稳定。 | `DONE` |

## 已完成 P0 标准重绘

| 内容参考图 | 目标图 | 影响状态 | 重画要求 | 优先级 |
| -- | -- | -- | -- | -- |
| `16-5-reader-toc-quick-panel-height-aligned.png` | `16-6-reader-toc-quick-panel-04-2-standard.png` | `reader_overlay_directory` | 保留目录字段和状态语义，完整继承 `04-2` 固定外壳与 token。 | `DONE` |
| `18-3-read-aloud-quick-panel-height-aligned.png` | `18-4-read-aloud-quick-panel-04-2-standard.png` | `reader_overlay_tts` | 保留朗读字段和状态语义，完整继承 `04-2` 固定外壳与 token。 | `DONE` |
| `21-1-reader-appearance-quick-panel.png` | `21-2-reader-appearance-quick-panel-04-2-standard.png` | `reader_overlay_appearance` | 保留界面字段和状态语义，完整继承 `04-2` 固定外壳与 token。 | `DONE` |
| `22-2-reader-settings-quick-panel-height-aligned.png` | `22-3-reader-settings-quick-panel-04-2-standard.png` | `reader_overlay_settings` | 保留设置字段和状态语义，完整继承 `04-2` 固定外壳与 token。 | `DONE` |

## 待决 P1

| 图片 | 问题 | 影响状态 | 重画要求 | 优先级 |
| -- | -- | ---- | ---- | --- |
| `docs/ui-design/04-阅读链路/阅读控制层/图片/09-亮度系统模式状态.png` | 横向辅助示意，不是标准手机 final。 | `reader_overlay_brightness` | 决定是否需要重画标准手机状态图；亮度条不得影响正文布局。 | `P1` |
| `docs/ui-design/04-阅读链路/阅读控制层/图片/10-章节进度控制.png` | 横向辅助示意，不是标准手机 final。 | `reader_overlay_progress_drag` | 决定是否需要重画标准手机状态图；章节进度提示必须为浮层。 | `P1` |

## 已确认不调整

以下图片不做调整：

- `docs/ui-design/04-阅读链路/沉浸阅读/图片/01-沉浸阅读-默认态.png`
- `docs/ui-design/04-阅读链路/阅读控制层/图片/03-当前视觉基线.png`

## 已确认不使用

`28-34` 不进入后续冻结候选，不需要重画：

- `docs/ui-design/04-阅读链路/阅读外观/图片/04-外观主面板结构参考.png`
- `docs/ui-design/04-阅读链路/阅读外观/图片/05-字体选择结构参考.png`
- `docs/ui-design/04-阅读链路/阅读外观/图片/06-主题选择结构参考.png`
- `docs/ui-design/04-阅读链路/阅读外观/图片/07-主题编辑结构参考.png`
- `docs/ui-design/04-阅读链路/阅读外观/图片/08-版式高级结构参考.png`
- `docs/ui-design/04-阅读链路/阅读外观/图片/09-翻页动画结构参考.png`
- `docs/ui-design/04-阅读链路/阅读外观/图片/10-外观主面板废弃.png`
