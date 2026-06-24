# Slice 18 Search Detail Adapter Shell Report

## 1. 总体结论

SLICE_18_SEARCH_DETAIL_ADAPTER_SHELL_READY

## 2. Git 状态

| 项目 | 值 |
|------|-----|
| 当前 HEAD | `e11e159`（开发前） |
| 是否 push | 否 |
| 开发前 git status | 干净 |

## 3. 修改范围

### 新增文件（7 files）

| 文件 | 说明 |
|------|------|
| `app/.../search/SearchAdapterShell.kt` | Search adapter shell — fake/real boundary, 5 个 state 方法 |
| `app/.../detail/BookDetailAdapterShell.kt` | BookDetail adapter shell — fake/real boundary, 4 个 state 方法 |
| `app/.../search/SearchAdapterShellTest.kt` | 9 tests：search states, fields, fake mode |
| `app/.../detail/BookDetailAdapterShellTest.kt` | 9 tests：detail states, TOC, bookshelf, actions |
| `app/.../search/SearchDetailAdapterBoundaryGuardTest.kt` | 11 tests：fake/real boundary, no network, no secrets, no WebView, no Stitch |
| `app/.../search/SearchUiStateMapperTest.kt` | 5 tests：fromFixture, loading, empty, error, fields |
| `app/.../detail/BookDetailUiStateMapperTest.kt` | 5 tests：fromFixture, loading, empty, error, TOC |

### 修改文件（2 files）

| 文件 | 说明 |
|------|------|
| `app/.../search/SearchUiState.kt` | `SearchResultUiModel` 新增 cover/status/isInBookshelf/actionLabel |
| `app/.../detail/BookDetailUiState.kt` | `BookDetailUiModel` 新增 cover/currentChapter/readingProgress/isInBookshelf/cacheStatus/availableActions；Fixture 填充新字段 |

## 4. Search Adapter Shell 结果

**SearchAdapterShell API**:

| Method | State | Fixture |
|--------|-------|---------|
| `searchHome()` | Empty | query="" |
| `searchLoading(query)` | Loading | query preserved |
| `searchResults(query)` | Results | 2 fixture results |
| `searchEmpty(query)` | Empty | query preserved |
| `searchError(query, msg)` | Error | error message |

**SearchResultUiModel 字段** (10 fields):
id, title, author, sourceName, category, latestChapter, intro, detailTarget, cover, status, isInBookshelf, actionLabel

**Fake/real boundary**:
- 默认 `Mode.FAKE`，`allowRealDataIntegration = false`
- `enableRealMode()` 预留，本轮不调用
- `integrationLevel = "NEEDS_ADAPTER"`

## 5. BookDetail Adapter Shell 结果

**BookDetailAdapterShell API**:

| Method | State | Fixture |
|--------|-------|---------|
| `detailLoading()` | Loading | 无 detail |
| `detailReady()` | Ready | "纸上群山" full detail |
| `detailError(msg)` | Error | errorMessage |
| `detailEmpty()` | Empty | 无 detail |

**BookDetailUiModel 字段** (17 fields):
id, title, author, sourceName, category, wordCount, latestChapter, updateTime, intro, cover, currentChapter, readingProgress, isInBookshelf, cacheStatus, availableActions, detailTarget, readerTarget, tocPreview

**Fixture data**:
- isInBookshelf = true
- readingProgress = 0.12f
- cacheStatus = "已缓存 12 章"
- availableActions = ["开始阅读", "查看目录", "移出书架", "缓存全本"]
- tocPreview: 12 章

## 6. Fake / Real Boundary 结果

| 检查项 | 状态 |
|--------|------|
| 当前只使用 fixture | ✅ Mode.FAKE 默认 |
| real hook 是接口预留 | ✅ enableRealMode() 存在但未调用 |
| 未访问真实网络 | ✅ 无 HttpClient/SearchParser/BookInfoParser |
| 未调用 parser internals | ✅ 无直接 parser 使用 |
| 未改 Reader-Core bridge | ✅ FakeCoreBridge 引用为 lazy val 占位 |
| 未改 repository | ✅ 无 repository 引用 |
| 未改 book source | ✅ 无 BookSource 使用 |
| 无 token/cookie/secret | ✅ 源码扫描通过 |

## 7. 测试结果

| 检查项 | 结果 |
|--------|------|
| `./gradlew test --no-daemon` | BUILD SUCCESSFUL (~695 tests, 0 failures) |
| `./gradlew assembleDebug --no-daemon` | BUILD SUCCESSFUL |
| `./gradlew lintDebug --no-daemon` | BUILD SUCCESSFUL |

**新增测试覆盖 (39 tests)**:
- Search adapter states (9)
- BookDetail adapter states (9)
- Boundary guard (11)：fake/real mode, no network, no secrets, no WebView, no Stitch, fixture validation
- SearchUiState mapper (5)
- BookDetailUiState mapper (5)

## 8. 回归守卫

| 守卫项 | 状态 |
|--------|------|
| App 主底栏仍为 书架/发现/书源/我的 | ✅ 未修改 |
| 阅读页底栏仍为 目录/朗读/界面/设置 | ✅ 未修改 |
| 无 WebView runtime | ✅ boundary guard 验证 |
| 无 Stitch 旧色/旧类 | ✅ boundary guard 验证 |
| 无真实网络 | ✅ boundary guard 验证 |
| 无 secret | ✅ boundary guard 验证 |
| fake/real boundary 未破坏 | ✅ Mode.FAKE 默认 |
| 未改 Reader-Core bridge/parser/repository | ✅ |

## 9. 是否仍有 P0

无。

## 10. 是否仍有 P1

无。

## 11. 是否允许进入 Slice 19

允许进入 Slice 19 Search / Detail facade integration planning。
