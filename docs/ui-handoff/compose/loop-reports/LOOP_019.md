# Loop 019 Report

## 当前 Slice
Slice 5：Source management UI integration — 迁移 BookSourceScreen

## 本轮任务
LOOP-019：迁移 `BookSourceScreen.kt` 到 Slice 1/2 组件 — 使用 `ReaderAppTopBar`、`ReaderEmptyState`、`ReaderTheme`

## 修改文件
- `app/src/main/kotlin/com/reader/android/ui/booksource/BookSourceScreen.kt` (156→130 lines)：
  - 移除 `Scaffold` / `TopAppBar` / `Card` / `CardDefaults` / `Checkbox` / `MaterialTheme` / `ExperimentalMaterial3Api` 导入
  - 新增 `ReaderTheme` / `ReaderAppTopBar` / `ReaderEmptyState` 导入
  - 用 `ReaderTheme` + `Box` 包裹（保留 FAB overlay）
  - 用 `ReaderAppTopBar(title = "书源管理")` 替换 `TopAppBar`
  - 用 `ReaderEmptyState(title = "暂无书源", message = "点击右下角按钮导入书源")` 替换内联空状态
  - SourceItem：Card/Checkbox → Row + `Switch`（ReaderTheme 色彩）
  - SourceItem：文字样式 → `ReaderTheme.typography.bookTitle` / `bookMeta`
  - SourceItem：颜色 → `ReaderTheme.colors.controlInk` / `bodyText`
  - FAB 保留（功能性元素，无 Compose 替代）
  - 保留 `SourceManagementViewModel` + `BookSourceRepository` / `FakeBookSourceRepository` 完全不变
  - 保留 `toggleEnabled` / `delete` 行为不变
  - 保留 SAMPLE_SOURCES_JSON 初始数据不变

## 测试命令
```bash
./gradlew test
```

## 测试结果
**PASS** — BUILD SUCCESSFUL in 3s，49 tasks
旧模式计数：0 (MaterialTheme/Scaffold/TopAppBar/CardDefaults/Checkbox/ExperimentalMaterial3Api)

## P0/P1
- P0：0
- P1：0

## 是否允许继续
允许。进入 LOOP-020。

## 下一轮建议
LOOP-020：新增 `SourceDetailScreen.kt` 静态 UI — 参照 `source-detail.html`
