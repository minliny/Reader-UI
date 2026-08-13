# Loop 025 Report

## 当前 Slice
Slice 6：Discover / RSS / WebDAV static UI — DiscoverScreen

## 本轮任务
LOOP-025：新增 `DiscoverScreen.kt` 静态 UI — 参照 `discover-home.html`

## 修改文件
- `app/src/main/kotlin/com/reader/android/ui/discover/DiscoverScreen.kt`（新增）：
  - `DiscoverBook` data class
  - `DiscoverScreen(books, onMoreClick, onBookClick, onRssClick)` — 发现首页
  - ReaderTheme + ReaderAppTopBar("发现")
  - ReaderSectionHeader("推荐")
  - 3 列 BookCard 网格（chunked + Row 布局）
  - ReaderSettingsRow("RSS 订阅") + chevron 跳转

## 测试命令
./gradlew test
## 测试结果: PASS — BUILD SUCCESSFUL in 3s, 49 tasks
## P0/P1: 0/0
## 下一轮建议: LOOP-026：RssListScreen + RssDetailScreen
