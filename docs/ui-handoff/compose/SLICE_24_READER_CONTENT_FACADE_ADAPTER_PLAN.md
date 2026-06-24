# Slice 24 Reader Content Facade Adapter Plan

## 1. 总体结论

SLICE_24_READER_CONTENT_FACADE_ADAPTER_PLAN_READY

接入等级：**A. READY_FOR_CONTENT_FACADE_ADAPTER**。CoreBridge.getContent() 直接提供正文内容和章节标题。需补充 TOC → Content 连接（ReaderTocEntryUiModel 加 url 字段）。

## 2. Git 状态

| 项目 | 值 |
|------|-----|
| 当前 HEAD | `c5703eb` |
| Slice 23 是否提交 | 是 |
| 是否 push | 否 |

## 3. 输入基线

| 文件 | 用途 |
|------|------|
| `ReaderRuntimeState.kt` | ReaderContentUiModel / ReaderChapterUiModel / ReaderRuntimeUiState |
| `ReaderRuntimeFixture.kt` | sampleContent / sampleChapter |
| `ReaderScreen.kt` | ContentArea + legacy ViewModel(ContentParser) |
| `DomainModels.kt` | ContentPage(content, title, nextPageUrl) |
| `CoreBridge.kt` | getContent(contentUrl, source) → ContentPage |

## 4. 当前 Reader content UI 状态

### UI Models

```kotlin
ReaderContentUiModel(text, prevPageAvailable, nextPageAvailable)
ReaderChapterUiModel(chapterTitle, chapterIndex, totalChapters)
ReaderPageProgressUiModel(progress, currentPage, totalPages)
ReaderBookUiModel(bookTitle, sourceName, tocUrl)
```

### Fixture

- Book: "深空信号", sourceName="本地书籍"
- Chapter: "第一章：阿长与《山海经》", index=0, total=42
- Content: 5 paragraphs sci-fi sample text
- Progress: 0.25f

### Current flow (legacy ViewModel)
`ReaderViewModel` 直接调用 `FakeCoreBridge.getContent()` 或 `HttpClient + ContentParser`（real 分支）。State-driven path 通过 `ReaderRuntimeUiState.content` fixture 渲染。

### CoreBridge.getContent facade

```
getContent(contentUrl: String, source: BookSource) → ContentPage
```

ContentPage: `content: String`, `title: String?`, `nextPageUrl: String?`

## 5. CoreBridge.getContent facade 审计

### 输入参数

| 参数 | 来源 | 可用性 |
|------|------|--------|
| contentUrl | TOC entry url / chapterUrl | ⚠️ ReaderTocEntryUiModel 缺 url 字段 |
| source | BookSource | ✅ BookSource(surl, sname) |

### 输出 DTO 映射

| Core ContentPage | Reader UI | 状态 |
|-----------------|-----------|------|
| content | ReaderContentUiModel.text | ✅ 直接 |
| title | ReaderChapterUiModel.chapterTitle | ✅ 直接 |
| nextPageUrl | ReaderContentUiModel.nextPageAvailable | ✅ nextPageUrl != null |
| - | prevPageAvailable | ⚠️ 需 TOC 上下文 |
| - | chapterIndex/totalChapters | ⚠️ 需 TOC 上下文 |
| - | pageIndex/pageCount | ⚠️ 需本地分页计算 |
| - | loading/error state | ⚠️ 需 adapter 封装 |
| - | cache/offline | ⚠️ 需本地缓存 |

### 接入等级：**A. READY_FOR_CONTENT_FACADE_ADAPTER**

Core getContent 提供核心字段（content, title, nextPageUrl）。TOC → Content 的 url 连接是主要缺口，可在 Slice 25 通过 ReaderTocEntryUiModel 加字段解决。

## 6. Reader content 字段映射矩阵

| UI 字段 | Fixture | Core DTO | 可映射 | Local | 缺口 | 风险 |
|---------|---------|---------|--------|-------|------|------|
| text | 硬编码 5 段 | ContentPage.content | ✅ | - | - | - |
| chapterTitle | 硬编码 | ContentPage.title | ✅ | - | - | - |
| nextPageAvailable | false | nextPageUrl!=null | ✅ | - | - | - |
| prevPageAvailable | false | - | ❌ | TOC 上下文 | 需上一章 url | 低 |
| chapterIndex | 0 | - | ❌ | TOC 上下文 | 需 TOC list + url 匹配 | 低 |
| totalChapters | 42 | - | ❌ | TOC 上下文 | 需 TOC list size | 低 |
| bookTitle | "深空信号" | BookInfo.name | ✅ | - | - | 已由 book 模型提供 |
| sourceName | "本地书籍" | BookSource.sourceName | ✅ | - | - | 已提供 |
| loading | false | - | - | adapter 封装 | 需 ContentAdapterShell | 低 |
| error | null | - | - | adapter 封装 | 需 ContentFacadeErrorMapper | 低 |
| pageIndex | - | - | ❌ | 本地分页 | 正文分页策略 | 低 |
| pageCount | - | - | ❌ | 本地分页 | 正文分页策略 | 低 |
| progress | 0.25f | - | ❌ | ReadingProgress | per-chapter progress | 低 |
| cacheStatus | - | - | ❌ | ChapterCache | 缓存状态 | 低 |
| isOfflineAvailable | - | - | ❌ | ChapterCache | 离线可用性 | 低 |

**直接可映射**: 5/15 (33%) — text, chapterTitle, nextPageAvailable, bookTitle, sourceName
**需 TOC 上下文**: 3/15 — prevPageAvailable, chapterIndex, totalChapters
**需 adapter 封装**: 2/15 — loading, error
**需本地状态**: 5/15 — pageIndex, pageCount, progress, cacheStatus, offline

## 7. TOC → Content 连接规划

### 当前缺口
`ReaderTocEntryUiModel` 仅有 `(title, level, isCurrent, hasBookmark, progress)` — 缺少 `url` 字段。CoreTocToReaderTocMapper 未填充 url。

### 连接流程（Slice 25 实现）

```
目录项点击
  → ReaderTocEntryUiModel.url (contentUrl)
  → ContentAdapterShell.loadContent(url, source)
  → CoreBridge.getContent(url, source)
  → ContentPage → ReaderContentUiModel
  → 更新 ReaderRuntimeUiState.content
  → 关闭 directory overlay
```

### 所需改动
1. `ReaderTocEntryUiModel` 加 `url: String = ""` 字段
2. `CoreTocToReaderTocMapper` 填充 `url = item.url`
3. 新增 `ContentAdapterShell`（FAKE/REAL 边界）
4. 新增 `ContentFacadeResultMapper`（ContentPage → ReaderContentUiModel）
5. 新增 `ContentFacadeErrorMapper`

## 8. Local state join 需求

| 状态 | 来源 | Slice 25 | 后续 |
|------|------|---------|------|
| reading progress | ReadingProgress storage | fixture 默认 | repository 接入 |
| chapterIndex/totalChapters | TOC list context | 从 TOC adapter 获取 | - |
| prevPageAvailable | TOC 上一章 url | 从 TOC 上下文计算 | - |
| cache status | ChapterCache | "未缓存" 默认 | 缓存管理器 |
| offline availability | ChapterCache | false 默认 | 离线管理器 |
| pageIndex/pageCount | 本地分页 | 不分页（全文渲染） | 可选分页 |

## 9. 风险与阻塞

| 风险 | 级别 | 缓解 |
|------|------|------|
| ReaderTocEntryUiModel 缺 url | 低 | Slice 25 加字段 |
| ContentPage 无 prevPageUrl | 低 | 从 TOC list 计算上一章 url |
| 真实正文可能含 HTML | 中 | getContent 返回 text，ContentParser 处理 |
| 正文可能很长 | 低 | 全文渲染 + verticalScroll，不分页 |

**无阻塞项**。所有缺口均可通过 TOC url 连接 + local state join 解决。

## 10. 下一步建议

允许进入 Slice 25 Reader content facade adapter implementation。

建议 Slice 25 实现顺序：
1. `ReaderTocEntryUiModel` 加 `url: String` 字段
2. `CoreTocToReaderTocMapper` 填充 url
3. `ContentFacadeResultMapper`（ContentPage → ReaderContentUiModel）
4. `ContentFacadeErrorMapper`
5. `ContentAdapterShell`（FAKE/REAL，调用 CoreBridge.getContent()）
6. 更新 `ReaderRuntimeFixture` content fixture
7. 测试：content 映射、error handling、TOC url 连接

## 11. 测试结果

| 检查项 | 结果 |
|--------|------|
| `./gradlew test --no-daemon` | BUILD SUCCESSFUL (754/754) |
| `./gradlew assembleDebug --no-daemon` | BUILD SUCCESSFUL |
| `./gradlew lintDebug --no-daemon` | BUILD SUCCESSFUL |

## 12. 是否仍有 P0

无。

## 13. 是否仍有 P1

无。
