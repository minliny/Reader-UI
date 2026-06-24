# 组件清单草案

| 组件 ID | 组件名称 | 所属状态 | 位置规则 | 层级 | 是否固定 | 是否可滚动 | 是否影响正文布局 | 备注 |
| ----- | ---- | ---- | ---- | -- | ---- | ----- | -------- | -- |
| `ReaderPage` | 阅读页容器 | 全部阅读状态 | 全屏 | 0 | 是 | 否 | 否 | 承载正文和覆盖层。 |
| `ReaderTextLayer` | 阅读正文层 | `reader_immersive` 及所有覆盖状态 | 阅读页内容区 | 0 | 是 | 是 | 否 | 覆盖层出现不得重排正文。 |
| `ReaderControlOverlay` | 阅读控制层遮罩 | `reader_overlay_default` 及快捷模块 | 覆盖正文 | 2 | 是 | 否 | 否 | 控制层打开时出现。 |
| `ReaderTopControlBar` | 顶部控制栏 | 控制层状态 | 顶部安全区下方 | 3 | 是 | 否 | 否 | 返回、标题、换源、三点菜单。 |
| `ReaderBottomControlBar` | 底部四主按钮 | 控制层状态 | 控制层底部区域 | 5 | 是 | 否 | 否 | `目录 / 朗读 / 界面 / 设置`。 |
| `ChapterProgressBar` | 章节进度条 | 默认控制层、可选快捷模块 | 底部工具栏上方 | 4 | 是 | 否 | 否 | 不等于贴屏幕底部阅读细进度条。 |
| `BrightnessSlider` | 亮度条 | 控制层状态 | 右侧控制区 | 7 | 是 | 否 | 否 | 四主按钮切换时保留。 |
| `QuickPanel` | 快捷面板容器 | 四主按钮模块 | 左侧主内容区 | 6 | 是 | 可选 | 否 | 替换左侧主内容区。 |
| `QuickActionButton` | 快捷操作按钮 | 默认控制层 | 左侧主内容区 | 6 | 是 | 否 | 否 | `搜索 / 自动翻页 / 替换`。 |
| `DirectoryOverlay` | 目录覆盖层 | `reader_overlay_directory` 或完整目录延展 | 覆盖阅读页或控制层左侧模块 | 8 或 6 | 是 | 是 | 否 | 需区分快捷模块和覆盖层。 |
| `BookmarkTab` | 书签标签 | 目录/书签状态 | 目录模块内 | 6 或 8 | 是 | 是 | 否 | 只显示书签记录。 |
| `TTSQuickPanel` | 朗读快捷模块 | `reader_overlay_tts` | 左侧主内容区 | 6 | 是 | 可选 | 否 | 语速/音色/范围/定时需大尺寸模块。 |
| `TTSRunningCapsule` | 朗读运行胶囊 | `reader_tts_running` | 阅读页浮层 | 7 | 是 | 否 | 否 | 朗读开始后控制收起。 |
| `TTSSettingsPanel` | 朗读设置页 | `reader_tts_settings` | 完整管理页 | 8 | 是 | 是 | 否 | 是否纳入 V1 待确认。 |
| `AppearanceQuickPanel` | 界面快捷模块 | `reader_overlay_appearance` | 左侧主内容区 | 6 | 是 | 可选 | 否 | 字号、行距、主题、字体入口。 |
| `SettingsQuickPanel` | 设置快捷模块 | `reader_overlay_settings` | 左侧主内容区 | 6 | 是 | 可选 | 否 | 高频阅读行为设置。 |
| `AutoScrollPanel` | 自动翻页面板 | `reader_overlay_auto_scroll` | 阅读页覆盖层/底表 | 8 | 是 | 可选 | 否 | 打开时控制层应收起或被覆盖。 |
| `ContentSearchOverlay` | 内容搜索覆盖层 | `reader_overlay_content_search` | 阅读页覆盖层 | 8 | 是 | 是 | 否 | 搜索当前书籍内部。 |
| `ContentReplaceOverlay` | 内容替换覆盖层 | `reader_overlay_replace` | 阅读页覆盖层 | 8 | 是 | 是 | 否 | 只影响阅读显示。 |
| `TopMoreMenu` | 顶部更多菜单 | `reader_top_more_menu` | 顶部栏右侧弹出 | 8 | 是 | 否 | 否 | 是否纳入 V1 待确认。 |

