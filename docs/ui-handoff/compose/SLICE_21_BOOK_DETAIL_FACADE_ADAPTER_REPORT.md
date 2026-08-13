# Slice 21 Book Detail Facade Adapter Report

## 1. 总体结论

SLICE_21_BOOK_DETAIL_FACADE_ADAPTER_READY

## 2. Git 状态

| 项目 | 值 |
|------|-----|
| 当前 HEAD | `1dbf377`（Slice 20） |
| Slice 20 是否提交 | 是 |
| 是否 push | 否 |

## 3. 修改范围

### 新增文件（5 files）

| 文件 | 说明 |
|------|------|
| `app/.../detail/BookDetailFacadeResultMapper.kt` | BookInfo + TOCItem → BookDetailUiModel 映射 |
| `app/.../detail/BookDetailFacadeErrorMapper.kt` | CoreBridge error → 用户友好消息 |
| `app/.../detail/BookDetailFacadeResultMapperTest.kt` | 8 tests：字段映射、stable id、TOC preview、fallback |
| `app/.../detail/BookDetailFacadeAdapterTest.kt` | 9 tests：fake/real mode、detailReal()、boundary |
| `docs/.../SLICE_21_BOOK_DETAIL_FACADE_ADAPTER_REPORT.md` | 本报告 |

### 修改文件（2 files）

| 文件 | 说明 |
|------|------|
| `app/.../detail/BookDetailAdapterShell.kt` | 新增 `detailReal()` suspend 方法 + `resetToFakeMode()` |
| `app/.../search/SearchDetailAdapterBoundaryGuardTest.kt` | 更新 boundary 断言允许 CoreBridge 调用 |

## 4. BookDetail facade adapter 结果

### BookDetailFacadeResultMapper
- `map(BookInfo, detailTarget, tocItems) → BookDetailUiModel` — 18 字段映射
- `stableId(key)` — 确定性 detail-{hash} id
- `tocPreviewFrom()` — 展平嵌套 TOC 为 preview，统计章节数 + 首尾章节名
- `availableActions()` — 基于 isInBookshelf 派生操作列表
- null/blank fallback：author、"未知书源"、detailUrl 等

### BookDetailFacadeErrorMapper
- `mapError(ReaderError)` — 7 错误码 → 用户友好中文
- `mapException(Throwable)` — 通用异常
- `emptyDetailUrl()` — 无效 URL 错误

### BookDetailAdapterShell
- `detailReal(detailUrl, source)` — Coroutine suspend
- 调用 `CoreBridge.getBookInfo()` + `CoreBridge.getTOC()` 通过 public facade
- TOC 失败非致命：getBookInfo 成功时仍返回 detail，TOC preview 为空
- 空 URL → error state
- Mode.FAKE → fixture fallback

## 5. 字段映射结果

| UI 字段 | Core 字段 | 映射 | 完成 | 缺口 |
|---------|----------|------|------|------|
| id | detailTarget | `hashCode()` 确定 | ✅ | - |
| title | BookInfo.name | 直接 | ✅ | - |
| author | BookInfo.author | 直接 + "未知作者" | ✅ | - |
| sourceName | BookInfo.origin | 直接 + "未知书源" | ✅ | - |
| category | BookInfo.kind | 直接 | ✅ | - |
| wordCount | BookInfo.wordCount | 直接 | ✅ | - |
| latestChapter | BookInfo.latestChapter | 直接 | ✅ | - |
| updateTime | BookInfo.updateTime | 直接 | ✅ | - |
| intro | BookInfo.intro | 直接 | ✅ | - |
| cover | BookInfo.coverUrl | 直接 | ✅ | - |
| currentChapter | - | "" (TODO) | ⚠️ | ReadingProgress |
| readingProgress | - | 0f (TODO) | ⚠️ | ReadingProgress |
| isInBookshelf | - | false (TODO) | ⚠️ | BookshelfRepository |
| cacheStatus | - | "未缓存" (TODO) | ⚠️ | ChapterCache |
| availableActions | 派生 | isInBookshelf 派生 | ✅ | - |
| detailTarget | 外部参数 | 直接 | ✅ | - |
| readerTarget | BookInfo.tocUrl | 直接 | ✅ | - |
| tocPreview | getTOC() 结果 | 展平统计 | ✅ | - |

## 6. TOC preview 结果

- 通过 `CoreBridge.getTOC()` public facade 获取
- 使用 `flattenChapters()` 展平嵌套 TOCItem，统计纯章节数量
- `BookDetailTocPreviewUiModel`: chapterCount, firstChapterTitle, latestChapterTitle
- TOC 调用失败时不阻塞详情渲染：`try/catch` 返回 emptyList()
- 空 TOC 产生 chapterCount=0 的 preview

## 7. Fake / Real Boundary 结果

| 检查项 | 状态 |
|--------|------|
| FAKE 不调用 CoreBridge | ✅ |
| REAL 调用 CoreBridge.getBookInfo() + getTOC() | ✅ public facade |
| 不调用 parser internals | ✅ 无 BookInfoParser/HttpClient |
| 不直接访问网络 | ✅ |
| error fallback | ✅ 7 错误码 |
| TOC 失败非致命 | ✅ detail 仍返回 |

## 8. 本轮未做事项

| 未做 | 说明 |
|------|------|
| Reader content facade adapter | 未实现 |
| 完整 TOC 页面真实接入 | 仅 preview |
| getContent reader flow | 未实现 |
| Reader-Core 内部改造 | 未修改 |
| BookshelfRepository/ReadingProgress | 保留 TODO |
| push | 否 |

## 9. 测试结果

| 检查项 | 结果 |
|--------|------|
| `./gradlew test --no-daemon` | BUILD SUCCESSFUL (~731 tests) |
| `./gradlew assembleDebug --no-daemon` | BUILD SUCCESSFUL |
| `./gradlew lintDebug --no-daemon` | BUILD SUCCESSFUL |

**新增测试 (17 tests)**:
- BookDetailFacadeResultMapperTest: 8
- BookDetailFacadeAdapterTest: 9

## 10. 回归守卫

| 守卫项 | 状态 |
|--------|------|
| App 主底栏仍为 书架/发现/书源/我的 | ✅ |
| 阅读页底栏仍为 目录/朗读/界面/设置 | ✅ |
| 无 WebView runtime | ✅ |
| 无 Stitch 旧色/旧类 | ✅ |
| 无 secret | ✅ |
| fake/real boundary 未破坏 | ✅ |

## 11. 是否仍有 P0

无。

## 12. 是否仍有 P1

无。

## 13. 是否允许进入 Slice 22

允许进入 Slice 22 Reader TOC facade adapter planning。
