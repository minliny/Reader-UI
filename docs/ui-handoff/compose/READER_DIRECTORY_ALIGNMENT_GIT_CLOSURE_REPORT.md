# Reader Directory Alignment Git Closure Report

## 1. 总体结论

READER_DIRECTORY_ALIGNMENT_GIT_CLOSURE_READY

## 2. 提交前验证

| 检查项 | 结果 |
|--------|------|
| `./gradlew test --no-daemon` | BUILD SUCCESSFUL (655/655) |
| `./gradlew assembleDebug --no-daemon` | BUILD SUCCESSFUL (clean rebuild) |
| `./gradlew lintDebug --no-daemon` | BUILD SUCCESSFUL |

## 3. 提交范围

已提交 5 个 commits（`3c70343` → `b374105`）：

| Category | File | Commits |
|----------|------|---------|
| 源码 | `app/.../reader/components/ReaderBottomFunctionOverlay.kt` | 3c70343, 8beef76, 58fd004 |
| 源码 | `app/.../reader/ReaderRuntimeFixture.kt` | e8e6793 |
| 测试 | `app/.../reader/ReaderDirectoryRowAlignmentTest.kt` (new) | 3c70343, 58fd004 |
| 测试 | `app/.../reader/ReaderDirectoryOverlayBaselineTest.kt` | 8beef76 |
| 测试 | `app/.../reader/ReaderRuntimeStateBridgeTest.kt` | e8e6793 |
| 报告 | `docs/.../READER_DIRECTORY_ALIGNMENT_FIX_REPORT.md` | b374105 |

## 4. Commit 信息

```
b374105 docs: update directory alignment fix verification report
58fd004 fix: use fixed-width indicator slots so bookmark position never shifts
8beef76 fix: use Bookmark icon instead of ChevronRight for TOC bookmark indicator
e8e6793 fix: flatten TOC levels and clarify progress semantics
3c70343 fix: move TOC row icons from left to right side of chapter title
```

## 5. 提交后状态

```
git status --short
(clean)
```

工作区干净，无未提交文件。

## 6. 修复摘要

| 修复项 | 实现 | 状态 |
|--------|------|------|
| 章节名左侧靠边 | `Text(entry.title, Modifier.weight(1f))` | ✅ |
| 章节名前无图标 | 所有图标在 title 之后 | ✅ |
| 书签标识在右侧 | 固定 `Box(20.dp)` slot，title 之后 | ✅ |
| 当前章节标识在右侧 | 固定 `Box(20.dp)` slot，bookmark 之后 | ✅ |
| 右侧进度条保留 | 固定 `Box(40.dp, 20.dp)` slot，最右侧 | ✅ |
| 层级缩进轻量 | `(entry.level - 1) * 10dp`，统一 level 2 = 10dp | ✅ |
| 书签图标正确 | `Icons.Filled.Bookmark` (非 ChevronRight) | ✅ |
| 书签位置不偏移 | 三个固定宽度 slot，位置始终不变 | ✅ |
| 层级展平 | 从 4 级嵌套 → 统一 2 级 7 章 | ✅ |

## 7. 回归守卫

| 守卫项 | 状态 |
|--------|------|
| App 主底栏仍为 书架/发现/书源/我的 | ✅ |
| 阅读页底栏仍为 目录/朗读/界面/设置 | ✅ |
| bottom overlay 不全屏 | ✅ |
| 未改 Core/parser/repository/book source | ✅ |
| 未接真实网络 | ✅ |
| 未修改其他 overlay | ✅ |

## 8. 是否仍有 P0

无。

## 9. 是否仍有 P1

无。

## 10. 是否建议 push

不建议自动 push，等待用户确认。
