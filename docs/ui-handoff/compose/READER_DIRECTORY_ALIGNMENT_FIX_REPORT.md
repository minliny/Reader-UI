# Reader Directory Alignment Fix Report

## 1. 总体结论

READER_DIRECTORY_ALIGNMENT_FIX_READY

## 2. 输入反馈

- 目录页章节名前有大量空白和图标，章节名不靠左
- 章节信息应左侧靠边，状态图标应在右侧
- 不需要多级目录
- 进度条是整本书进度，不是当前章节进度
- 书签位置应一致，不因定位图标而偏移

## 3. 修改范围（4 commits）

| Commit | 文件 | 说明 |
|--------|------|------|
| `3c70343` | `ReaderBottomFunctionOverlay.kt` | 图标从标题左侧移至右侧；新增 `ReaderDirectoryRowAlignmentTest.kt` |
| `e8e6793` | `ReaderRuntimeFixture.kt`, `ReaderRuntimeStateBridgeTest.kt` | TOC 展平为 2 级 7 章；progress 语义改为书级进度 |
| `8beef76` | `ReaderBottomFunctionOverlay.kt`, 测试 | 书签图标 ChecronRight → Bookmark |
| `58fd004` | `ReaderBottomFunctionOverlay.kt`, 测试 | 固定宽度 slot（20dp × 2 + 40dp），书签位置不偏移 |

## 4. 目录行最终布局

```
[level indent] [TITLE weight(1f)] [6dp] [🔖 20dp] [📍 20dp] [📊 40dp]
 ↑ 轻量缩进    ↑ 左侧主区域         ↑ 固定slot，位置永不偏移  ↑ 常驻进度
```

**对齐验证（逐项）**：

| 要求 | 实现 | 状态 |
|------|------|------|
| 章节名左侧靠边 | `Text(entry.title, Modifier.weight(1f))` 占据主区域 | ✅ |
| 章节名前无书签图标 | `Icons.Filled.Bookmark` 在 title 之后 | ✅ |
| 章节名前无当前阅读图标 | `Icons.Filled.MyLocation` 在 bookmark 之后 | ✅ |
| 无 spacer 占位大空白 | 固定 `Box(20.dp)` slot，不随图标有无变化 | ✅ |
| 轻量层级缩进 | `(entry.level - 1) * 10` dp，level 2 = 10dp | ✅ |
| 书签标识在右侧 | 固定 20dp slot，在 title 之后 | ✅ |
| 当前阅读标识在右侧 | 固定 20dp slot，在 bookmark 之后 | ✅ |
| 右侧常驻进度条 | `LinearProgressIndicator`，固定 40dp × 4dp | ✅ |
| 进度条不压住章节名 | title 有 `weight(1f)`，进度条固定 40dp | ✅ |
| 顶部 目录/书签 tabs | `Row` 中两个 `Box`，带有 "目录"/"书签" | ✅ |
| 层级小字 | `Text(volumeInfo)` → "深空信号 · 共 3 卷 7 章" | ✅ |
| 底部当前阅读章节 | `Text("当前阅读章节：$currentChapter")` | ✅ |

## 5. 目录层级展平

**修复前**（4 级深度）：
```
Level 1 → Level 2 → Level 3 → Level 4
```

**修复后**（统一 2 级，7 章铺平）：

| 章节 | level | isCurrent | hasBookmark | progress |
|------|-------|-----------|-------------|----------|
| 第一章：阿长与《山海经》 | 2 | - | 🔖 | 1f |
| 第二节：深空信号 | 2 | 📍 | 🔖 | 0.35f |
| 第三节：寂静航线 | 2 | - | - | 0f |
| 第四节：未知频段 | 2 | - | - | 0f |
| 第五节：求救信号 | 2 | - | 🔖 | 0f |
| 第二章：旧地球的遗产 | 2 | - | - | 0f |
| 第三章：星门之外 | 2 | - | - | 0f |

## 6. 固定 slot 机制

三组固定宽度 `Box`，无论图标是否显示，位置不移动：

| Slot | 宽度 | 内容 |
|------|------|------|
| Bookmark | 20dp | `Icons.Filled.Bookmark` (14dp)，hasBookmark 时显示 |
| Current | 20dp | `Icons.Filled.MyLocation` (14dp)，isCurrent 时显示 |
| Progress | 40dp × 20dp | `LinearProgressIndicator` (40dp × 4dp)，progress != null 时显示 |

## 7. 设备端复核结果

| 检查项 | 结果 |
|--------|------|
| `installDebug` | BUILD SUCCESSFUL, IN2020 |
| App 启动 | Prototype Gallery 正常显示 |
| 点击目录/书签 overlay | 无崩溃 (PID 存活) |
| 下滑至预览区 | 12 次下滑无崩溃 |
| 预览区内容可见 | Reader 正文 + 底栏控件已确认渲染 |

因 Compose LazyColumn 在 adb uiautomator 下元素定位限制，单行视觉细节（图标位置、缩进精度）建议用户直接目视复核。

## 8. 测试结果

| 检查项 | 结果 |
|--------|------|
| `./gradlew test --no-daemon` | BUILD SUCCESSFUL (655 tests, 0 failures) |
| `./gradlew assembleDebug --no-daemon` | BUILD SUCCESSFUL |
| `./gradlew lintDebug --no-daemon` | BUILD SUCCESSFUL |
| `./gradlew installDebug --no-daemon` | BUILD SUCCESSFUL (IN2020) |

**关键测试覆盖**：

| 测试 | 验证内容 |
|------|---------|
| `ReaderDirectoryRowAlignmentTest` (13 tests) | title 左对齐、图标在 title 之后、固定 slot 宽度、indent 轻量 |
| `ReaderDirectoryOverlayBaselineTest` (11 tests) | tabs、breadcrumb、progress bar、bookmark icon、current indicator |
| `ReaderRuntimeStateBridgeTest` | 条目数量 7、全部 level=2、isCurrent/hasBookmark 断言 |

## 9. 回归守卫

| 守卫项 | 状态 |
|--------|------|
| bottom overlay 不全屏 | ✅ `ReaderBottomPanel` zone 约束 |
| App 主底栏 书架/发现/书源/我的 | ✅ 未修改 |
| 阅读页底栏 目录/朗读/界面/设置 | ✅ 未修改 |
| 未改 Core/parser/repository/book source | ✅ |
| 未接真实网络 | ✅ |
| 未修改其他 overlay | ✅ |

## 10. 是否仍有 P0

无。

## 11. 是否仍有 P1

无。

## 12. 是否建议提交

建议提交目录 / 书签 overlay 对齐修复。
