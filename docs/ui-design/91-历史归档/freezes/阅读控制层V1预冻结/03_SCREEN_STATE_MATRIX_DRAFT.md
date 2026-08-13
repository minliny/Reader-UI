# 屏幕状态矩阵草案

通用规则：

- 控制层出现时，阅读正文层不重排。
- 快捷区是 overlay / bottom sheet / floating panel，不是正文内容流。
- 打开一个快捷区时，其他快捷区关闭。
- 全页弹层如目录、内容搜索、内容替换应覆盖或收起阅读控制层，不能和控制层混乱叠加。
- 拖动章节进度条时显示章节进度辅助浮层。
- 亮度条是临时或常驻控制层浮层，不影响正文布局。

| 状态 ID | 入口 | 退出 | 是否遮罩 | 是否保留正文 | 是否保留顶部栏 | 是否保留底部工具栏 | 是否保留章节进度条 | 是否互斥 | 候选图片 | 状态 |
| ----- | -- | -- | ---- | ------ | ------- | --------- | --------- | ---- | ---- | -- |
| `reader_immersive` | 打开书籍/关闭控制层 | 点击中间区域打开控制层 | 否 | 是 | 否，仅弱信息 | 否 | 否 | 不适用 | `03-reader-immersive.png` | `CANDIDATE_OK` |
| `reader_overlay_default` | 沉浸页点击中间区域 | 点击正文/返回键/自动隐藏 | 是 | 是 | 是 | 是 | 是 | 是 | `04-2-reader-controls-opaque-icon-aligned.png` | `CURRENT_BASELINE` |
| `reader_overlay_progress_drag` | 拖动章节进度条 | 松开滑条 | 是 | 是 | 是 | 是 | 是 | 是 | `27-reader-chapter-progress-flow.png` | `NEEDS_DECISION` |
| `reader_overlay_brightness` | 拖动亮度条或切换系统亮度 | 停止操作/超时 | 是 | 是 | 是 | 是 | 是 | 是 | `26-reader-brightness-system-state.png` | `NEEDS_DECISION` |
| `reader_overlay_directory` | 底栏 `目录` | 再次切换模块/点击章节/关闭控制层 | 是 | 是 | 是 | 是 | 由目录模块替换 | 是 | `16-6-reader-toc-quick-panel-04-2-standard.png` | `CANDIDATE_OK` |
| `reader_overlay_tts` | 底栏 `朗读` | 开始朗读/切换模块/关闭控制层 | 是 | 是 | 是 | 是 | 由朗读模块替换 | 是 | `18-4-read-aloud-quick-panel-04-2-standard.png` | `CANDIDATE_OK` |
| `reader_tts_running` | 朗读快捷区点击开始 | 点击关闭 | 否或轻遮罩，需确认 | 是 | 否 | 否 | 否 | 与控制层互斥 | `19-1-read-aloud-running-capsule-height-aligned.png` | `CANDIDATE_OK` |
| `reader_tts_settings` | 朗读快捷区 `更多设置` | 返回 | 否，完整页 | 否或背景保留需确认 | 否 | 否 | 否 | 与控制层互斥 | `20-read-aloud-settings.png` | `NEEDS_DECISION` |
| `reader_overlay_appearance` | 底栏 `界面` | 切换模块/关闭控制层 | 是 | 是 | 是 | 是 | 由界面模块替换 | 是 | `21-2-reader-appearance-quick-panel-04-2-standard.png` | `CANDIDATE_OK` |
| `reader_overlay_settings` | 底栏 `设置` | 切换模块/关闭控制层 | 是 | 是 | 是 | 是 | 由设置模块替换 | 是 | `22-3-reader-settings-quick-panel-04-2-standard.png` | `CANDIDATE_OK` |
| `reader_overlay_auto_scroll` | 默认快捷区 `自动翻页` | 取消/开始自动翻页 | 是 | 是 | 覆盖层顶部标题 | 否，控制层应收起或被覆盖 | 否 | 与控制层互斥 | `10-auto-page-turn-setup-overlay.png` | `CANDIDATE_OK` |
| `reader_overlay_content_search` | 默认快捷区 `搜索` | 返回/选择结果 | 是 | 是 | 覆盖层搜索栏 | 否，控制层应收起或被覆盖 | 否 | 与控制层互斥 | `08-content-search-overlay.png` | `CANDIDATE_OK` |
| `reader_overlay_replace` | 默认快捷区 `替换` | 返回/临时关闭/新增规则 | 是 | 是 | 覆盖层标题栏 | 否，控制层应收起或被覆盖 | 否 | 与控制层互斥 | `13-replacement-quick-overlay.png` | `CANDIDATE_OK` |
| `reader_top_more_menu` | 顶部三点菜单 | 点击菜单外/选择菜单项/返回 | 是或轻遮罩，需确认 | 是 | 是 | 不适用 | 不适用 | 与其他浮层互斥 | `25-4-reader-top-more-menu-height-aligned.png` | `CANDIDATE_OK` |

## 已确认位置微调规则

`04-2-reader-controls-opaque-icon-aligned.png` 是唯一控制层基底。`16-6 / 18-4 / 21-2 / 22-3`
已按该骨架生成；`16-5 / 18-3 / 21-1 / 22-2` 只保留内容参考。`19-1 / 25-4`
仍作为交互参考候选，正式冻结时复核 04-2 锚点。
