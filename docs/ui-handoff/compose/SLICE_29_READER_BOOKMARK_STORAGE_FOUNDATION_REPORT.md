# Slice 29 Reader Bookmark Storage Foundation Report

## 1. 总体结论

SLICE_29_READER_BOOKMARK_STORAGE_FOUNDATION_READY

## 2. Git 状态

| 项目 | 值 |
|------|-----|
| 当前 HEAD | `03c7552` |
| 是否 push | 否 |

## 3. 修改范围

| 文件 | 说明 |
|------|------|
| `data/storage/BookmarkEntity.kt` (new) | BookmarkEntity + BookmarkDao（7 操作） |
| `data/storage/ReadingProgress.kt` (mod) | AppDatabase v3→v4 加 BookmarkEntity + bookmarkDao() |
| `ui/reader/ReaderBookmarkLocalStateAdapter.kt` (new) | In-memory bookmark adapter |
| `test/.../ReaderBookmarkStorageFoundationTest.kt` (new) | 8 tests |

## 4. Bookmark 存储结果

**BookmarkEntity** (9 fields):
bookmarkId(PK auto), bookUrl, bookName, chapterUrl, chapterTitle, snippet, paragraphIndex, createdAt, note

**BookmarkDao** (7 operations):
getByBook, getByChapter, isBookmarked(COUNT), insert(REPLACE), deleteById, deleteByChapter, getBookmarkedUrls

**AppDatabase**: v3 → v4, 新增 BookmarkEntity + bookmarkDao()

## 5. Adapter 结果

**ReaderBookmarkLocalStateAdapter**: isBookmarked(url) → Boolean, bookmarkedUrls() → Set

## 6. 测试结果

| 检查项 | 结果 |
|--------|------|
| `./gradlew test --no-daemon` | BUILD SUCCESSFUL (~792 tests) |
| `./gradlew assembleDebug --no-daemon` | BUILD SUCCESSFUL |
| `./gradlew lintDebug --no-daemon` | BUILD SUCCESSFUL |

**新增测试 (8 tests)**: entity fields, DAO operations, DB schema, adapter, TOC joiner, no secrets

## 7. 是否仍有 P0

无。

## 8. 是否仍有 P1

无。

## 9. 是否允许进入下一 Slice

是。
