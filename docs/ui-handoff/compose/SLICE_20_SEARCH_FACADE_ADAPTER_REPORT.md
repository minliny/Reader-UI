# Slice 20 Search Facade Adapter Report

## 1. 总体结论

SLICE_20_SEARCH_FACADE_ADAPTER_READY

## 2. Git 状态

| 项目 | 值 |
|------|-----|
| 当前 HEAD | `c958ff6`（Slice 19） |
| Slice 19 是否提交 | 是 |
| 是否 push | 否 |

## 3. 修改范围

### 新增文件（6 files）

| 文件 | 说明 |
|------|------|
| `app/.../search/SearchFacadeResultMapper.kt` | Core SearchResultItem → UI SearchResultUiModel 映射 |
| `app/.../search/SearchFacadeErrorMapper.kt` | CoreBridge error → SearchUiState 用户友好错误 |
| `app/.../search/SearchFacadeResultMapperTest.kt` | 9 tests：字段映射、stable id、fallback、list |
| `app/.../search/SearchFacadeAdapterTest.kt` | 9 tests：fake/real mode、real 调用、boundary |
| `app/.../search/SearchFacadeBoundaryGuardTest.kt` | 8 tests：no parser、no HTTP、no secrets、no WebView、no Stitch |
| `docs/.../SLICE_20_SEARCH_FACADE_ADAPTER_REPORT.md` | 本报告 |

### 修改文件（2 files）

| 文件 | 说明 |
|------|------|
| `app/.../search/SearchAdapterShell.kt` | 新增 `searchReal()` suspend 方法 + `resetToFakeMode()` |
| `app/.../search/SearchDetailAdapterBoundaryGuardTest.kt` | 更新 boundary 断言允许 CoreBridge 调用 |

## 4. Search facade adapter 结果

### SearchFacadeResultMapper
- `map(SearchResultItem) → SearchResultUiModel` — 12 字段映射
- `mapList(List) → List` — 批量映射
- `stableId(detailUrl)` — 基于 `String.hashCode()` 的确定性 id
- null/blank fallback：author → "未知作者"，sourceName → "未知书源"，detailUrl null → "search-unknown"

### SearchFacadeErrorMapper
- `mapError(query, ReaderError)` — 7 种错误码 → 用户友好中文消息
- `mapException(query, Throwable)` — 通用异常安全 fallback
- `emptyKeyword(query)` — 空关键词

### SearchAdapterShell
- `searchReal(query, source)` — Coroutine suspend，Mode.REAL 时调用 CoreBridge.search()
- 空关键词 → empty state（不调用 bridge）
- Mode.FAKE → 直接返回 fixture
- `resetToFakeMode()` — 测试辅助
- 默认 source：`BookSource(sourceName = "默认书源")`

## 5. 字段映射结果

| UI 字段 | Core 字段 | 映射 | 完成 | 缺口 |
|---------|----------|------|------|------|
| id | detailUrl | `hashCode()` 确定性 id | ✅ | - |
| title | name | 直接 | ✅ | - |
| author | author | 直接 + "未知作者" fallback | ✅ | - |
| sourceName | sourceName | 直接 + "未知书源" fallback | ✅ | - |
| category | kind | 直接 | ✅ | - |
| latestChapter | latestChapter | 直接 | ✅ | - |
| intro | intro | 直接 | ✅ | - |
| detailTarget | detailUrl | 直接 | ✅ | - |
| cover | coverUrl | 直接 | ✅ | - |
| status | wordCount | 直接 | ✅ | - |
| isInBookshelf | - | `false` (TODO) | ⚠️ | 需 BookshelfRepository |
| actionLabel | - | "查看详情" 常量 | ✅ | - |

## 6. Fake / Real Boundary 结果

| 检查项 | 状态 |
|--------|------|
| FAKE 不调用 CoreBridge | ✅ `Mode.FAKE` 直接返回 fixture |
| REAL 只调用 `CoreBridge.search()` | ✅ 通过 public facade，不直接访问 parser |
| 不调用 parser internals | ✅ 无 SearchParser/BookInfoParser 引用 |
| 不直接访问网络 | ✅ 无 HttpClient |
| 不直接访问 book source 规则 | ✅ adapter 不引用 BookSource 规则字段 |
| error fallback 明确 | ✅ SearchFacadeErrorMapper 7 错误码 |

## 7. 本轮未做事项

| 未做 | 说明 |
|------|------|
| BookDetail facade adapter | 保留 Slice 19 规划结论，下一轮实现 |
| TOC 真实接入 | 未实现 |
| Content 真实接入 | 未实现 |
| Reader-Core 内部改造 | 未修改 CoreBridge 接口 |
| BookshelfRepository | isInBookshelf 保留 false/TODO |
| push | 否 |

## 8. 测试结果

| 检查项 | 结果 |
|--------|------|
| `./gradlew test --no-daemon` | BUILD SUCCESSFUL (722 tests, 0 failures) |
| `./gradlew assembleDebug --no-daemon` | BUILD SUCCESSFUL |
| `./gradlew lintDebug --no-daemon` | BUILD SUCCESSFUL |

**新增测试 (26 tests)**:
- SearchFacadeResultMapperTest: 9 — 字段映射、stable id、fallback、list
- SearchFacadeAdapterTest: 9 — fake/real mode、real API、boundary
- SearchFacadeBoundaryGuardTest: 8 — no parser/no HTTP/no secrets/no WebView

## 9. 回归守卫

| 守卫项 | 状态 |
|--------|------|
| App 主底栏仍为 书架/发现/书源/我的 | ✅ 未修改 |
| 阅读页底栏仍为 目录/朗读/界面/设置 | ✅ 未修改 |
| 无 WebView runtime | ✅ boundary test |
| 无 Stitch 旧色/旧类 | ✅ boundary test |
| 无 secret | ✅ boundary test |
| fake/real boundary 未破坏 | ✅ |

## 10. 是否仍有 P0

无。

## 11. 是否仍有 P1

无。

## 12. 是否允许进入 Slice 21

允许进入 Slice 21 BookDetail facade adapter implementation。
