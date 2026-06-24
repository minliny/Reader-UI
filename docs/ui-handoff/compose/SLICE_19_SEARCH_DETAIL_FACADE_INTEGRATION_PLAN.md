# Slice 19 Search Detail Facade Integration Plan

## 1. 总体结论

SLICE_19_SEARCH_DETAIL_FACADE_INTEGRATION_PLAN_READY

Search 和 BookDetail 均可通过 CoreBridge facade 低风险接入。

## 2. Git 状态

| 项目 | 值 |
|------|-----|
| 当前 HEAD | `2a00308` |
| Slice 18 是否提交 | 是 |
| 是否 push | 否 |

## 3. 输入基线

| 文件 | 用途 |
|------|------|
| `data/bridge/CoreBridge.kt` | CoreBridge interface + FakeCoreBridge |
| `data/bridge/ReaderCoreBridge.kt` | ReaderCoreBridge with BridgeResult + error taxonomy |
| `data/model/DomainModels.kt` | SearchResultItem / BookInfo / TOCItem DTOs |
| `ui/search/SearchAdapterShell.kt` | Search fake/real boundary |
| `ui/detail/BookDetailAdapterShell.kt` | BookDetail fake/real boundary |
| `ui/search/SearchUiState.kt` | SearchResultUiModel (12 fields) |
| `ui/detail/BookDetailUiState.kt` | BookDetailUiModel (17 fields) |

## 4. Search facade 审计

### 候选 facade
- **CoreBridge.search(query, source) → List\<SearchResultItem\>** — 已实现的公共接口
- **ReaderCoreBridge.search(query, source) → BridgeResult\<List\<SearchResultItem\>\>** — 增强版，含错误分类

### 可复用字段

Core DTO `SearchResultItem` → UI model `SearchResultUiModel`：

| Core | UI | 直接映射 |
|------|-----|---------|
| name | title | ✅ |
| author | author | ✅ |
| sourceName | sourceName | ✅ |
| kind | category | ✅ |
| latestChapter | latestChapter | ✅ |
| intro | intro | ✅ |
| detailUrl | detailTarget | ✅ |
| coverUrl | cover | ✅ |
| wordCount | status | ✅ 可用作状态文本 |

### 缺失字段

| UI 字段 | 来源 | 缺口级别 |
|---------|------|---------|
| id | 无 Core 字段 | P1 — 可从 detailUrl hash 生成 |
| isInBookshelf | 需要本地 BookshelfRepository | P1 — 跨模块查询 |
| actionLabel | 硬编码 | P2 — "查看详情" 常量 |

### Fake/real boundary
- `SearchAdapterShell.mode` 控制 FAKE/REAL
- 默认 FAKE，`enableRealMode()` 预留
- Real 路径调用 `CoreBridge.search()`
- 无 parser internals 直接调用风险

### 接入等级：**A. READY_FOR_FACADE_ADAPTER**

## 5. BookDetail facade 审计

### 候选 facade
- **CoreBridge.getBookInfo(detailUrl, source) → BookInfo** — 已实现
- **CoreBridge.getTOC(tocUrl, source) → List\<TOCItem\>** — 已实现
- **ReaderCoreBridge.getBookInfo() / getTOC()** — 增强版

### 可复用字段

Core DTO `BookInfo` → UI model `BookDetailUiModel`：

| Core | UI | 直接映射 |
|------|-----|---------|
| name | title | ✅ |
| author | author | ✅ |
| origin | sourceName | ✅ |
| kind | category | ✅ |
| wordCount | wordCount | ✅ |
| latestChapter | latestChapter | ✅ |
| updateTime | updateTime | ✅ |
| intro | intro | ✅ |
| coverUrl | cover | ✅ |
| tocUrl | readerTarget | ✅ |
| tocUrl | tocPreview (间接) | ✅ 需额外 getTOC() 调用 |

### 缺失字段

| UI 字段 | 来源 | 缺口级别 |
|---------|------|---------|
| id | 无 Core 字段 | P1 — 可从 detailUrl hash 生成 |
| currentChapter | 需要 ReadingProgress | P1 — 本地存储 |
| readingProgress | 需要 ReadingProgress | P1 — 本地存储 |
| isInBookshelf | 需要 BookshelfRepository | P1 — 跨模块 |
| cacheStatus | 需要 ChapterCache | P1 — 缓存管理器 |
| availableActions | 派生字段 | P2 — 基于上述状态计算 |

### Fake/real boundary
- `BookDetailAdapterShell.mode` 控制 FAKE/REAL
- 默认 FAKE，`enableRealMode()` 预留
- Real 路径调用 `CoreBridge.getBookInfo()` + `CoreBridge.getTOC()`
- 无 parser internals 直接调用风险

### 接入等级：**A. READY_FOR_FACADE_ADAPTER**

## 6. Search 字段映射矩阵

| UI 字段 | Fixture 来源 | 候选 Core DTO 字段 | 可映射 | 缺口 | 风险 |
|---------|-------------|-------------------|--------|------|------|
| id | 硬编码 "fixture-search-..." | - | ❌ | Core DTO 无 id | 低 — 可从 detailUrl hash |
| title | 硬编码 "纸上群山" | SearchResultItem.name | ✅ | - | - |
| author | 硬编码 "南溪" | SearchResultItem.author | ✅ | - | - |
| sourceName | 硬编码 "UI Fixture" | SearchResultItem.sourceName | ✅ | - | - |
| category | 硬编码 "幻想" | SearchResultItem.kind | ✅ | - | - |
| latestChapter | 硬编码 "第十二章 星河" | SearchResultItem.latestChapter | ✅ | - | - |
| intro | 硬编码 fixture intro | SearchResultItem.intro | ✅ | - | - |
| detailTarget | 硬编码 | SearchResultItem.detailUrl | ✅ | - | - |
| cover | 空字符串 | SearchResultItem.coverUrl | ✅ | - | - |
| status | 空字符串 | SearchResultItem.wordCount | ✅ | - | - |
| isInBookshelf | false (default) | - | ❌ | 需 BookshelfRepository | 低 — 本地查询 |
| actionLabel | "查看详情" (default) | - | ❌ | 硬编码常量 | 无 — P2 |

**可映射率**: 10/12 (83%)

## 7. BookDetail 字段映射矩阵

| UI 字段 | Fixture 来源 | 候选 Core DTO 字段 | 可映射 | 缺口 | 风险 |
|---------|-------------|-------------------|--------|------|------|
| id | 硬编码 "fixture-detail-..." | - | ❌ | Core DTO 无 id | 低 — 从 detailUrl hash |
| title | 硬编码 "纸上群山" | BookInfo.name | ✅ | - | - |
| author | 硬编码 "南溪" | BookInfo.author | ✅ | - | - |
| sourceName | 硬编码 "UI Fixture" | BookInfo.origin | ✅ | - | - |
| category | 硬编码 "幻想" | BookInfo.kind | ✅ | - | - |
| wordCount | 硬编码 "18 万字" | BookInfo.wordCount | ✅ | - | - |
| latestChapter | SBookInfo.latestChapter | ✅ | - | - |
| updateTime | 硬编码 "UI fixture" | BookInfo.updateTime | ✅ | - | - |
| intro | 硬编码 fixture intro | BookInfo.intro | ✅ | - | - |
| cover | 空字符串 | BookInfo.coverUrl | ✅ | - | - |
| currentChapter | 硬编码 "第一章 雨线" | - | ❌ | 需 ReadingProgress | 低 — 本地存储 |
| readingProgress | 0.12f (硬编码) | - | ❌ | 需 ReadingProgress | 低 — 本地存储 |
| isInBookshelf | true (硬编码) | - | ❌ | 需 BookshelfRepository | 低 — 本地查询 |
| cacheStatus | "已缓存 12 章" (硬编) | - | ❌ | 需 ChapterCache | 中 — 缓存管理器 |
| availableActions | 硬编码 list | - | ❌ | 派生字段 | 低 — 基于状态计算 |
| detailTarget | 硬编码 | 外部参数 | ✅ | - | - |
| readerTarget | 硬编码 | BookInfo.tocUrl | ✅ | - | - |
| tocPreview | 硬编码 fixture | getTOC() 结果 | ✅ | 需额外调用 | 低 — facade 已提供 |

**可映射率**: 12/18 (67%)，含 tocPreview 间接映射为 13/18 (72%)

## 8. 风险与阻塞

### Core DTO gap
- **id 字段缺失**: SearchResultItem 和 BookInfo 均无唯一 id → 可用 detailUrl hash 或 URL 本身作为 id → 低风险
- **isInBookshelf / readingProgress**: 需要本地存储查询，不属于 Core 接口 → 可在 adapter shell 层组合 → 低风险

### Facade gap
- 无。CoreBridge 已提供 search/getBookInfo/getTOC/getContent 四个方法，覆盖 Search + BookDetail + TOC 全流程。

### Fake/real boundary risk
- 低。`SearchAdapterShell.mode` / `BookDetailAdapterShell.mode` 显式控制，默认 FAKE。Real 需显式调用 `enableRealMode()`。

### Parser internals risk
- 无。CoreBridge 封装了所有 parser 调用。Adapter shell 只需调用 CoreBridge public 方法。

### Design decision risk
- Search source selection（多书源搜索策略）需交互设计决策 → 记录为 P2
- BookDetail 的 TOC preview 数据量控制需确认 → 低风险

## 9. 下一步建议

Search 和 BookDetail 均可接入：**允许进入 Slice 20 Search facade adapter implementation**。

建议 Slice 20 实现顺序：
1. SearchAdapterShell 添加 `realSearch()` 方法，调用 `CoreBridge.search()`
2. SearchResultMapper 实现 `SearchResultItem → SearchResultUiModel` 映射
3. BookDetailAdapterShell 添加 `realDetail()` 方法，调用 `CoreBridge.getBookInfo()` + `getTOC()`
4. BookDetailMapper 实现 `BookInfo → BookDetailUiModel` 映射
5. TocMapper 实现 `List<TOCItem> → BookDetailTocPreviewUiModel` 映射
6. 所有 real 方法在 `enableRealMode()` 后才激活，运行时不静默切 real

## 10. 测试结果

| 检查项 | 结果 |
|--------|------|
| `./gradlew test --no-daemon` | BUILD SUCCESSFUL (~695 tests) |
| `./gradlew assembleDebug --no-daemon` | BUILD SUCCESSFUL |
| `./gradlew lintDebug --no-daemon` | BUILD SUCCESSFUL |

## 11. 是否仍有 P0

无。

## 12. 是否仍有 P1

无。
