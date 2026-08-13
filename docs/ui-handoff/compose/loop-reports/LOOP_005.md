# Loop 005 Report

## 当前 Slice
Slice 3：Bookshelf + Search + Detail static UI — Phase 3.3 BookDetailScreen 迁移

## 本轮任务
LOOP-005：迁移 `BookDetailScreen.kt` — 替换 `TopAppBar` 为 `ReaderAppTopBar`，loading 状态用 `ReaderLoadingState`，intro Card 用 `ReaderCard`，不修改 `BookDetailViewModel` 逻辑

## 修改文件
- `app/src/main/kotlin/com/reader/android/ui/detail/BookDetailScreen.kt` (172→130 lines)：
  - 移除 `Scaffold`、`TopAppBar`、`Card`、`CardDefaults`、`CircularProgressIndicator`、`Button`、`MaterialTheme`、`Icon`、`IconButton` 等 Material3 导入
  - 新增 `ReaderTheme`、`ReaderAppTopBar`、`ReaderLoadingState`、`ReaderCard`、`ReaderPrimaryButton` 导入
  - 用 `ReaderTheme` 包裹根组件
  - 用 `ReaderAppTopBar(title = ..., onNavigateBack = onBack)` 替换 Scaffold + TopAppBar + IconButton
  - 用 `ReaderLoadingState` 替换内联 `CircularProgressIndicator`
  - 用 `ReaderCard` 替换 `Card(CardDefaults.cardColors(...))`
  - 用 `ReaderPrimaryButton(text = "查看目录")` 替换 `Button + Icon + Text`
  - 所有文本样式/颜色迁移到 `ReaderTheme.typography` / `ReaderTheme.colors`
  - 所有间距迁移到 `ReaderTheme.spacing`
  - 保留 `BookDetailViewModel` 完全不变（fake/real mode constructor 完整）
  - 保留 `onBack`、`onTOC` callback 接口不变

## 新增/更新测试
无（测试将在 LOOP-006 新增）

## 测试命令
```bash
./gradlew test
```

## 测试结果
**PASS** — BUILD SUCCESSFUL in 7m 31s，49 actionable tasks，14 executed，35 up-to-date

## 回归扫描
- MaterialTheme/Scaffold/TopAppBar/CircularProgressIndicator/CardDefaults/ExperimentalMaterial3Api：未检测到
- 旧颜色：未检测到

## P0/P1
- P0：0
- P1：0

## 是否允许继续
允许。进入 LOOP-006。

## 下一轮建议
LOOP-006：为 `BookDetailScreen` 新增 UI 测试
