# Loop 016 Report

## 当前 Slice
Slice 4：Reader control layer Compose prototype — Phase 4.4 ReaderScreen 集成

## 本轮任务
LOOP-016：集成 `ReaderScreen` 与所有 reader components — ReaderControlBase + ReaderNightState + ReaderTheme

## 修改文件
- `app/src/main/kotlin/com/reader/android/ui/reader/ReaderScreen.kt`（163→110 lines）：
  - 移除 `Scaffold` / `TopAppBar` / `BottomAppBar` / `CircularProgressIndicator` / `MaterialTheme` / `ArrowForward` 等所有 Material3 旧导入
  - 新增 `ReaderControlBase` / `ReaderNightState` / `ReaderLoadingState` / `ReaderTheme` 导入
  - 新增 `isNight` state（`mutableStateOf(false)`），toggle 切换日/夜间模式
  - 用 `ReaderNightState(isNight)` 包裹全部内容
  - 用 `ReaderControlBase(...)` 替换 Scaffold 结构：
    - `chapterTitle` → viewModel 章节标题
    - `onBackClick` → onBack callback
    - `onNightModeClick` → isNight toggle
    - `content` slot → 阅读正文（verticalScroll + readerBody 排版）
  - loading 状态 → `ReaderLoadingState`
  - 正文样式 → `ReaderTheme.typography.readerBody` + `ReaderTheme.colors.bodyText`
  - 正文内边距：横向 24dp，纵向 128dp（留出顶部控制区和底栏）
  - 保留 `ReaderViewModel` 完全不变（fake/real mode constructor 完整）
  - 保留 `onBack` / `onNextChapter` callback 签名

## 修复
- `readerContent` → `readerBody`（Typography token 名称修正）

## 测试命令
```bash
./gradlew test
```

## 测试结果
**PASS** — BUILD SUCCESSFUL in 7m 15s，49 actionable tasks
MaterialTheme/Scaffold/TopAppBar/CircularProgressIndicator 计数：0

## P0/P1
- P0：0
- P1：0

## 是否允许继续
允许。进入 LOOP-017。

## 下一轮建议
LOOP-017：为 ReaderScreen 集成新增全状态测试 — 9 个状态可独立渲染
