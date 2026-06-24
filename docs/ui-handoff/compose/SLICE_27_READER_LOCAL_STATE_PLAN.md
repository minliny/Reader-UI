# Slice 27 Reader Local State Plan

## 1. 总体结论

SLICE_27_READER_LOCAL_STATE_PLAN_READY

## 2. Git 状态

| 项目 | 值 |
|------|-----|
| 当前 HEAD | `1ced9ac` |
| Slice 26 是否提交 | 是 |
| 是否 push | 否 |

## 3. 输入基线

| 文件 | 用途 |
|------|------|
| `data/storage/ReadingProgress.kt` | Room Entity + DAO + AppDatabase |
| `data/storage/ChapterCache.kt` | CachedChapter Entity + DAO + ChapterCacheManager |
| `data/adapter/LocalBookProgressMapper.kt` | LocalBookSource → ReadingProgress / CachedChapter |
| `data/adapter/DownloadCacheManager.kt` | 离线缓存管理（委托 ChapterCacheManager） |
| `ui/reader/ReaderTocLocalStateJoiner.kt` | currentChapterUrl / bookmarkedUrls / chapterProgress 预留 |

## 4. 当前本地状态能力审计

### Progress 能力

| 组件 | 状态 | 详情 |
|------|------|------|
| Room Entity | ✅ 已有 | `ReadingProgress(bookUrl, bookName, author, currentChapterUrl, currentChapterTitle, chapterIndex, totalChapters, scrollPosition, lastReadTime)` |
| Room DAO | ✅ 已有 | `getAll()`, `getByUrl()`, `upsert()`, `update()`, `delete()` |
| AppDatabase | ✅ 已有 | v3, 含 ReadingProgress + CachedChapter + SyncOperationLog |
| LocalBookProgressMapper | ✅ 已有 | `LocalBookSource → ReadingProgress` |

### Cache 能力

| 组件 | 状态 | 详情 |
|------|------|------|
| Room Entity | ✅ 已有 | `CachedChapter(contentUrl, content, title, nextPageUrl, cachedAt)` |
| Room DAO | ✅ 已有 | `get()`, `put()`, `evictOlderThan()`, `clear()` |
| ChapterCacheManager | ✅ 已有 | `get()`, `put()`, `evictOld(7d)`, `clear()` |
| DownloadCacheManager | ✅ 已有 | `downloadAndCache()`, `getCached()` |

### Bookmark 能力

| 组件 | 状态 | 详情 |
|------|------|------|
| Room Entity | ❌ 无 | 需新建 Bookmark entity |
| Room DAO | ❌ 无 | 需新建 DAO |
| Storage | ❌ 无 | 无持久化 |

## 5. 接入等级判定

| 能力 | 等级 | 理由 |
|------|------|------|
| **Progress** | **A. READY_FOR_LOCAL_STATE_ADAPTER** | Room entity/DAO 完整，Mapper 已有 |
| **Cache** | **A. READY_FOR_LOCAL_STATE_ADAPTER** | Room entity/DAO/Manager 完整 |
| **Bookmark** | **C. NEEDS_STORAGE_INTERFACE** | 无 entity/DAO，需先建 schema |

## 6. Progress 字段映射矩阵

| UI 字段 | 当前 fixture | Room ReadingProgress | 可映射 | 缺口 |
|---------|------------|---------------------|--------|------|
| bookId/bookUrl | 硬编码 | bookUrl (PK) | ✅ | - |
| bookName | "深空信号" | bookName | ✅ | - |
| author | - | author | ✅ | - |
| currentChapterUrl | - | currentChapterUrl | ✅ | - |
| currentChapterTitle | fixture.chapterTitle | currentChapterTitle | ✅ | - |
| chapterIndex | 0 | chapterIndex | ✅ | - |
| totalChapters | 42 | totalChapters | ✅ | - |
| scrollPosition | - | scrollPosition | ✅ | - |
| lastReadTime | - | lastReadTime | ✅ | - |
| percent | 0.25f | scrollPosition ∕ totalPages | ⚠️ | 需 UI 计算 |
| displayProgressText | - | - | ❌ | 需 UI 格式化 |
| syncStatus | - | - | ❌ | 需 SyncOperationLog join |

**可映射率**: 9/12 (75%)。直接可用。

## 7. Cache 字段映射矩阵

| UI 字段 | 当前 fixture | Room CachedChapter | 可映射 | 缺口 |
|---------|------------|--------------------|--------|------|
| contentUrl | 硬编码 | contentUrl (PK) | ✅ | - |
| content | fixture text | content | ✅ | - |
| title | fixture title | title | ✅ | - |
| nextPageUrl | - | nextPageUrl | ✅ | - |
| cachedAt | - | cachedAt | ✅ | - |
| isOfflineAvailable | false | cachedAt != null | ✅ | derived |
| cacheStatus | "未缓存" | - | ❌ | 需 UI 格式化 |
| ttl/expiry | - | 7d evictOld | ✅ | ChapterCacheManager |

**可映射率**: 7/8 (88%)。

## 8. Bookmark 字段映射矩阵

| UI 字段 | 当前 fixture | 需新建 | 缺口 |
|---------|------------|--------|------|
| bookmarkId | - | auto-gen PK | 需 entity |
| bookId/bookUrl | - | FK to bookUrl | 需 entity |
| chapterUrl | - | contentUrl | 需 entity |
| chapterTitle | - | from TOC | 需 entity + join |
| snippet | - | from ContentPage | 需 entity + content fetch |
| position | - | paragraphIndex | 需 entity |
| createdAt | - | timestamp | 需 entity |
| note | - | optional text | 需 entity |
| displayTitle | from TOC | chapterTitle | 需 entity |
| displaySnippet | - | snippet | 需 entity |

**可映射率**: 0/10 (0%)。完全缺失，需新建 Bookmark entity/DAO。

## 9. Local state joiner 规划

### ReaderProgressLocalStateJoiner（接入 Room）
- 读取 `ReadingProgressDao.getByUrl(bookUrl)` 获取当前进度
- 输入：bookUrl
- 输出：isCurrent, progress, chapterIndex, totalChapters, lastReadTime
- 影响：TOC current marker, TOC progress bar, ContentArea chapter info
- 等级：**A — 可直接对接 Room DAO**

### ReaderBookmarkLocalStateJoiner（需先建 entity）
- 读取 BookmarkDao 获取书签列表
- 输入：bookUrl
- 输出：bookmarkedUrls set, bookmark list with snippet
- 影响：TOC bookmark icon, Bookmark tab list
- 等级：**C — 需先建 Bookmark entity/DAO**

### ReaderCacheLocalStateJoiner（接入 Room）
- 读取 `CachedChapterDao.get(url)` 检查缓存
- 输入：contentUrl
- 输出：isCached, cacheStatus, cachedAt
- 影响：BookDetail cache status, Content offline state
- 等级：**A — 可直接对接 Room DAO**

### ReaderDirectoryLocalStateJoiner（组合）
- 组合 Progress + Bookmark joiners
- 输入：bookUrl + tocEntries
- 输出：enriched tocEntries（isCurrent, hasBookmark, progress 真实值）
- 等级：**A（Progress 部分）/ C（Bookmark 部分）**

### ReaderContentLocalStateJoiner（组合）
- 组合 Progress + Cache joiners
- 输入：contentUrl + bookUrl
- 输出：enriched content state（cacheStatus, isOfflineAvailable）
- 等级：**A**

## 10. UI 使用位置

| Local State | TOC overlay | Content area | Bookshelf | BookDetail |
|------------|------------|-------------|-----------|------------|
| Progress.isCurrent | ✅ current marker | ✅ chapter title | ✅ 进度显示 | ✅ 继续阅读 |
| Progress.progress | ✅ right bar | ✅ page bar | ✅ % 封面 | - |
| Bookmark.hasBookmark | ✅ icon | ✅ 加书签入口 | - | - |
| Bookmark.list | ✅ 书签 tab | - | - | - |
| Cache.isCached | - | ✅ offline 标识 | ✅ 缓存标记 | ✅ 缓存状态 |

## 11. 风险与阻塞

| 风险 | 级别 | 缓解 |
|------|------|------|
| Bookmark entity/DAO 缺失 | 中 | Slice 28 新建 Room entity |
| ReadingProgress.bookUrl vs UI bookId | 低 | 统一使用 bookUrl 映射 |
| Room DB 需 runtime 实例 | 低 | AppDatabase 已定义，需 DI 注入 |
| ReaderTocLocalStateJoiner 未接 url | 低 | url 已在 Slice 25 补齐 |
| DownloadCacheManager 依赖 RemoteContentProvider | 中 | FAKE 模式用占位 provider |

## 12. 下一步建议

**Progress + Cache**: 允许进入 Slice 28 Reader progress/cache local state adapter implementation。
**Bookmark**: 进入 Slice 29（需先建 entity/DAO）。

建议 Slice 28 实现：
1. 更新 `ReaderTocLocalStateJoiner.joinOne()` — 使用 `entry.url` 匹配 `currentChapterUrl` / `bookmarkedUrls` / `chapterProgress`
2. 创建 `ReaderProgressAdapter` — 封装 `ReadingProgressDao` 读写
3. 创建 `ReaderCacheAdapter` — 封装 `ChapterCacheManager` 读写
4. 创建 `ReaderDirectoryLocalStateJoiner` — 组合 Progress + Bookmark
5. 更新 `ReaderDirectoryAdapterShell` — REAL 模式 join 真实 progress
6. 测试

## 13. 测试结果

| 检查项 | 结果 |
|--------|------|
| `./gradlew test --no-daemon` | BUILD SUCCESSFUL (~771 tests) |
| `./gradlew assembleDebug --no-daemon` | BUILD SUCCESSFUL |
| `./gradlew lintDebug --no-daemon` | BUILD SUCCESSFUL |

## 14. 是否仍有 P0

无。

## 15. 是否仍有 P1

无。
