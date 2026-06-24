# Slice 25 Reader Content Facade Adapter Report

## 1. 总体结论

SLICE_25_READER_CONTENT_FACADE_ADAPTER_READY

## 2. Git 状态

| 项目 | 值 |
|------|-----|
| 当前 HEAD | `7bcf897`（Slice 24） |
| Slice 24 是否提交 | 是 |
| 是否 push | 否 |

## 3. 修改范围

### 新增文件（5 files）

| 文件 | 说明 |
|------|------|
| `app/.../reader/ContentRequest.kt` | TOC → Content 连接模型（chapterUrl, index, totals, hasPrev/Next） |
| `app/.../reader/ContentFacadeResultMapper.kt` | ContentPage → ReaderContentUiModel + ChapterUiModel 映射 |
| `app/.../reader/ContentFacadeErrorMapper.kt` | CoreBridge error → ContentErrorState（含 retryable） |
| `app/.../reader/ContentAdapterShell.kt` | FAKE/REAL 边界，contentFake()/contentReal() |
| `app/.../reader/ReaderContentFacadeAdapterTest.kt` | 7 tests |

### 修改文件（2 files）

| 文件 | 说明 |
|------|------|
| `app/.../reader/ReaderRuntimeState.kt` | `ReaderTocEntryUiModel` 加 `url: String` |
| `app/.../reader/CoreTocToReaderTocMapper.kt` | 填充 `url = item.url` |

## 4. Reader content facade adapter 结果

### ContentRequest
- `chapterUrl, chapterTitle, chapterIndex, totalChapters, bookTitle, sourceName`
- `isValid`, `hasPrevChapter`, `hasNextChapter` 派生属性

### ContentFacadeResultMapper
- `mapContent(ContentPage) → ReaderContentUiModel` — text + nextPageAvailable
- `mapChapter(ContentPage, ContentRequest) → ReaderChapterUiModel` — title + index
- `applyChapterContext(content, request)` — prev/next from TOC context
- `paragraphs(content)` — 按换行切分过滤空行

### ContentFacadeErrorMapper
- `mapError(ReaderError) → ContentErrorState(message, retryable)`
- `mapException(Throwable)` — 通用 fallback
- `missingUrl()` — 无效链接
- `emptyContent()` — 空章节

### ContentAdapterShell
- `contentFake()` → ContentResult.Ready（fixture）
- `contentReal(request, source)` — suspend，调用 CoreBridge.getContent()
- ContentResult: Ready(content, chapter) | Error(error) | Loading
- Mode.FAKE/REAL + resetToFakeMode()

## 5. ReaderTocEntryUiModel.url 补齐结果

| 项目 | 状态 |
|------|------|
| `url: String` 字段 | ✅ 新增，默认 "" |
| `CoreTocToReaderTocMapper` 填充 | ✅ `url = item.url` |
| TOC → Content request | ✅ `ContentRequest(chapterUrl = entry.url)` |
| 目录 UI 无回归 | ✅ url 不在 UI 渲染中 |

## 6. Content 字段映射结果

| UI 字段 | Core DTO | 映射 | 完成 |
|---------|---------|------|------|
| text | ContentPage.content | 直接 | ✅ |
| chapterTitle | ContentPage.title + request fallback | 直接 + fallback | ✅ |
| nextPageAvailable | ContentPage.nextPageUrl != null | 直接 | ✅ |
| prevPageAvailable | request.hasPrevChapter | TOC 上下文 | ✅ |
| chapterIndex | request.chapterIndex | TOC 上下文 | ✅ |
| totalChapters | request.totalChapters | TOC 上下文 | ✅ |
| bookTitle | request.bookTitle | request 携带 | ✅ |
| sourceName | request.sourceName | request 携带 | ✅ |
| loading state | ContentResult.Loading | adapter 封装 | ✅ |
| error state | ContentResult.Error | adapter 封装 | ✅ |

## 7. TOC → Content 连接结果

```kotlin
// Click TOC entry → ContentRequest → ContentAdapterShell → CoreBridge.getContent
val request = ContentRequest(
    chapterUrl = entry.url,
    chapterTitle = entry.title,
    chapterIndex = index,
    totalChapters = entries.size,
    bookTitle = book.bookTitle,
    sourceName = book.sourceName
)
val result = ContentAdapterShell.contentReal(request)
```

- ContentRequest 不含 parser internals/secret
- chapterIndex/totalChapters 从 TOC 展平列表获取
- prev/next chapter 可用性通过 index 计算

## 8. 错误 / 空状态结果

| 场景 | ContentResult |
|------|--------------|
| blank chapterUrl | Error(missingUrl, retryable=false) |
| 空 content | Error(emptyContent, retryable=false) |
| getContent 异常 | Error(mapError) |
| 网络/超时 | Error(retryable=true) |
| 解析/未找到 | Error(retryable=false) |

## 9. 回归守卫

| 守卫项 | 状态 |
|--------|------|
| App 主底栏 书架/发现/书源/我的 | ✅ |
| 阅读页底栏 目录/朗读/界面/设置 | ✅ |
| 目录行布局未回归 | ✅ |
| overlay 不全屏 | ✅ |
| 无 WebView runtime | ✅ |
| 无 Stitch 旧色/旧类 | ✅ |
| 无 secret | ✅ |
| 未改 Core/parser/repository/book source | ✅ |

## 10. 本轮未做事项

| 未做 | 说明 |
|------|------|
| 阅读进度保存 | 未实现 |
| 离线缓存 | 未实现 |
| bookmark annotations | 未实现 |
| 自动预加载下一章 | 未实现 |
| 完整分页引擎 | 未实现 |
| Reader-Core 改造 | 未修改 |

## 11. 测试结果

| 检查项 | 结果 |
|--------|------|
| `./gradlew test --no-daemon` | BUILD SUCCESSFUL (~761 tests) |
| `./gradlew assembleDebug --no-daemon` | BUILD SUCCESSFUL |
| `./gradlew lintDebug --no-daemon` | BUILD SUCCESSFUL |

**新增测试 (7 tests)**: ContentRequest validation, fake/real mode, error states, boundary guard

## 12. 是否仍有 P0

无。

## 13. 是否仍有 P1

无。

## 14. 是否允许进入 Slice 26

允许进入 Slice 26 Reader content UI state integration。
