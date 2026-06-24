# Slice 28 Reader Progress Cache Local State Adapter Report

## 1. 总体结论

SLICE_28_READER_PROGRESS_CACHE_LOCAL_STATE_ADAPTER_READY

## 2. Git 状态

| 项目 | 值 |
|------|-----|
| 当前 HEAD | `38667d0` |
| 是否 push | 否 |

## 3. 修改范围

### 新增文件（5 files）

| 文件 | 说明 |
|------|------|
| `app/.../reader/ReaderProgressLocalStateAdapter.kt` | 阅读进度状态 adapter（isCurrentChapter, progressFor） |
| `app/.../reader/ReaderCacheLocalStateAdapter.kt` | 章节缓存状态 adapter（statusFor, isOfflineAvailable） |
| `app/.../reader/ReaderContentLocalStateJoiner.kt` | Content cache/offline 状态 join |
| `app/.../reader/ReaderProgressCacheLocalStateAdapterTest.kt` | 13 tests |
| `docs/.../SLICE_28_READER_PROGRESS_CACHE_LOCAL_STATE_ADAPTER_REPORT.md` | 本报告 |

### 修改文件（1 file）

| 文件 | 说明 |
|------|------|
| `app/.../reader/ReaderTocLocalStateJoiner.kt` | 接入 `ReaderProgressLocalStateAdapter`，真正使用 `entry.url` 匹配 |

## 4. Progress adapter 结果

**ReaderProgressLocalStateAdapter**:
- `isCurrentChapter(url)` — URL 匹配当前章节
- `progressFor(url)` — 当前章节返回 scrollPosition，其他返回 0
- `Empty` 单例 — 空状态 safe fallback
- TODO: 接入 Room `ReadingProgressDao`

## 5. Cache adapter 结果

**ReaderCacheLocalStateAdapter**:
- `statusFor(url)` → `CacheStatus.CACHED / NOT_CACHED / STALE`
- `isOfflineAvailable(url)` — 缓存命中时 true
- `Empty` 单例
- TODO: 接入 Room `ChapterCacheManager`

## 6. TOC joiner 修复

**ReaderTocLocalStateJoiner** (修复后):
```kotlin
entry.copy(
    isCurrent = progress.isCurrentChapter(entry.url),
    hasBookmark = entry.url in bookmarkedUrls,
    progress = progress.progressFor(entry.url)
)
```
- 现在真正使用 `entry.url` 匹配（之前一直是 `false` default）
- blank url 永不匹配（安全 fallback）

## 7. Content joiner 结果

**ReaderContentLocalStateJoiner**:
- `cacheStatus(url)` / `isOfflineAvailable(url)` 委托给 cache adapter
- `enrich(request)` 返回 cache metadata map

## 8. 测试结果

| 检查项 | 结果 |
|--------|------|
| `./gradlew test --no-daemon` | BUILD SUCCESSFUL (~784 tests) |
| `./gradlew assembleDebug --no-daemon` | BUILD SUCCESSFUL |
| `./gradlew lintDebug --no-daemon` | BUILD SUCCESSFUL |

**新增测试 (13 tests)**:
- Progress adapter (4): current match, progressFor, empty fallback, blank url
- Cache adapter (4): cached, not cached, blank url, offline
- TOC joiner (4): current, bookmark, progress fill, empty
- Content joiner (1): cache status

## 9. 回归守卫

| 守卫项 | 状态 |
|--------|------|
| App 主底栏 书架/发现/书源/我的 | ✅ |
| 阅读页底栏 目录/朗读/界面/设置 | ✅ |
| 无 WebView runtime | ✅ |
| 无 secret | ✅ |
| 未改 Core/parser/repository/book source | ✅ |
| fake/real boundary 未破坏 | ✅ |

## 10. 是否仍有 P0

无。

## 11. 是否仍有 P1

无。

## 12. 是否允许进入 Slice 29

允许进入 Slice 29 Reader Bookmark Storage Foundation。
