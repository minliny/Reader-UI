# Compose Interaction Contracts

| 交互 | 事件 | 契约 |
|---|---|---|
| 顶栏返回 | onBack() | popBackStack；阅读页回到来源页 |
| refresh 刷新 | onRefreshChapter() | 刷新当前章节内容，不改变控制层状态 |
| swap_horiz 换源 | onOpenSourceSwitch() | 进入换源结果或打开换源 overlay |
| more_vert 更多 | onOpenMoreMenu() | 打开页面更多操作 |
| 圆形快捷方式：搜索 | onQuickSearch() | ReaderControlState.QuickActionOverlay(Search) |
| 圆形快捷方式：自动翻页 | onAutoScroll() | QuickActionOverlay(AutoScroll)，可开始/暂停 |
| 圆形快捷方式：内容替换 | onReplaceRules() | QuickActionOverlay(Replace)，只显示当前书籍匹配规则 |
| 圆形快捷方式：夜间 / 日间切换 | onToggleReaderNightMode() | 切换 ReaderVisualMode，不弹窗 |
| 上一页 | onPreviousPage() | 本章内上一页，不是上一章 |
| 下一页 | onNextPage() | 本章内下一页，不是下一章 |
| 本章进度拖动 | onPageProgressDrag(percent) | 更新本章内进度 |
| 自动亮度 | onToggleAutoBrightness() | 切换自动亮度 |
| 手动亮度 | onBrightnessChange(value) | 更新亮度 slider |
| 亮度条停靠切换 | onToggleBrightnessDock() | 左/右停靠，箭头方向同步 |
| 底栏：目录 | onBottomDirectory() | BottomFunctionOverlay(Directory) |
| 底栏：朗读 | onBottomTts() | BottomFunctionOverlay(Tts) |
| 底栏：界面 | onBottomAppearance() | BottomFunctionOverlay(Appearance) |
| 底栏：设置 | onBottomReaderSettings() | BottomFunctionOverlay(Settings)，只含阅读行为 |
| 搜索结果点击 | onSearchResultClick(book) | 进入 book_detail/{bookId} |
| 加入书架 | onAddToBookshelf(book) | 更新书架状态 |
| 书源启用 / 禁用 | onToggleSource(sourceId) | 调用 repository，不破坏 BookSourceRepository |
| WebDAV 登录 / 断开 | onWebDavLogin(), onWebDavDisconnect() | 更新同步账号状态 |
| 同步冲突处理 | onResolveSyncConflict(choice) | 选择本地或远程版本 |

## Critical Rules

- 点击夜间模式不弹窗，只切换夜间 / 日间状态。
- 内容替换只显示当前书籍匹配规则。
- 快捷 overlay 只隐藏亮度条，保留快捷按钮、浮动页内控制和底栏。
- 底栏 overlay 隐藏亮度条、快捷按钮和浮动页内控制，保留顶栏和底栏。
- 阅读页底栏「设置」只包含阅读行为开关 / 下拉，不包含全局设置。
- 全局设置才包含 WebDAV、书源、同步、关于等入口。
