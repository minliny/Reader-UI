# Slice 12 Search Detail Boundary Planning Report

## 1. 总体结论

SLICE_12_SEARCH_DETAIL_BOUNDARY_PLANNING_READY

本轮完成 Search / BookDetail fake-to-real boundary planning，并新增轻量 UI state、fixture、纯 mapper skeleton。未接真实搜索，未接真实详情，未修改 Reader-Core bridge / parser / repository / book source 业务逻辑，未 push。

## 2. Git 状态

- 当前 HEAD: `7741c3a feat: integrate bookshelf UI state`
- Slice 11 是否提交: 是，提交为 `7741c3a feat: integrate bookshelf UI state`
- 是否 push: 否
- 当前新修改: Slice 12 UI state / fixture / mapper skeleton、测试、本文档

## 3. 修改范围

新增 Kotlin 文件：

- `app/src/main/kotlin/com/reader/android/ui/search/SearchUiState.kt`
- `app/src/main/kotlin/com/reader/android/ui/detail/BookDetailUiState.kt`
- `app/src/test/kotlin/com/reader/android/ui/search/SearchUiStateMappingTest.kt`
- `app/src/test/kotlin/com/reader/android/ui/search/SearchDetailBoundaryPlanningTest.kt`
- `app/src/test/kotlin/com/reader/android/ui/detail/BookDetailUiStateMappingTest.kt`

新增文档：

- `docs/ui-handoff/compose/SLICE_12_SEARCH_DETAIL_BOUNDARY_PLANNING_REPORT.md`

未修改：

- Reader-Core bridge
- parser
- repository
- book source 业务逻辑
- SearchScreen / BookDetailScreen 视觉结构
- ReaderScreen / SourceManagement / WebDAV / RSS

## 4. Search 当前状态审计

- 当前数据来源: `SearchViewModel` 默认使用 `FakeCoreBridge`，同时保留 `useRealHttp` 开关和 `HttpClient` / `SearchParser` 分支。
- 当前 UI state: 本轮前没有独立 `SearchUiState` / `SearchResultUiModel`；本轮新增 `SearchUiState`、`SearchResultUiModel`、`SearchUiStateMapper`、`SearchFixture`。
- 可复用数据流: 存在 fake bridge 和 parser 能力，但真实搜索路径当前会直接触碰 HTTP / parser / hardcoded source，尚不适合直接作为 Compose UI 真实数据接入口。
- fake/real boundary 风险: 存在。`useRealHttp` 可绕过 UI adapter 层直接进入 runtime HTTP / parser 分支；真实接入前需要明确数据来源、错误模型、source selection、BridgeResult 对齐策略。
- 接入等级: `NEEDS_ADAPTER`

本轮处理方式：

- Search fixture 可映射为明确 UI state。
- loading / empty / error state 可表达。
- `allowRealDataIntegration = false`。
- mapper 不访问网络、不读写数据库、不调用 Reader-Core、不调用 repository / parser。

## 5. BookDetail 当前状态审计

- 当前数据来源: `BookDetailViewModel` 默认使用 `FakeCoreBridge`，同时保留 `useRealHttp` 开关和 `HttpClient` / `BookInfoParser` 分支。
- 当前 UI state: 本轮前没有独立 `BookDetailUiState` / `BookDetailUiModel` / `BookDetailTocPreviewUiModel`；本轮新增对应 state、mapper、fixture。
- TOC preview 状态: 本轮前详情页只暴露 TOC 入口；本轮新增 `BookDetailTocPreviewUiModel` 表达章节数量、首章、最新章节和 toc target。
- 可复用数据流: 存在 fake bridge 和 parser 能力，但真实详情路径当前会直接触碰 HTTP / parser / hardcoded source，尚不适合直接作为 Compose UI 真实数据接入口。
- fake/real boundary 风险: 存在。真实详情和 TOC 预览接入前需要明确 detail source、TOC source、BridgeResult 错误模型、缓存策略和 UI adapter 边界。
- 接入等级: `NEEDS_ADAPTER`

本轮处理方式：

- BookDetail fixture 可映射为明确 UI state。
- loading / empty / error state 可表达。
- TOC preview 可表达。
- `allowRealDataIntegration = false`。
- mapper 不访问网络、不读写数据库、不调用 Reader-Core、不调用 repository / parser。

## 6. Adapter / Mapper 规划

Search 后续 adapter 规划：

- `SearchUiState` 作为 Compose 层唯一渲染状态。
- `SearchResultUiModel` 只承载 UI 所需字段。
- `SearchUiStateMapper` 保持纯函数，后续真实接入时只替换 input 来源。
- 真实接入前需要新增只读 adapter，将安全数据流映射为 `SearchResultUiModel`，并统一错误、空态、加载态。

BookDetail 后续 adapter 规划：

- `BookDetailUiState` 作为详情页唯一渲染状态。
- `BookDetailUiModel` 承载详情 UI 字段。
- `BookDetailTocPreviewUiModel` 单独承载 TOC preview。
- `BookDetailUiStateMapper` 保持纯函数，后续真实接入时只替换 input 来源。
- 真实接入前需要明确 detail 与 TOC 的 source selection、错误模型和缓存边界。

## 7. BLOCKED / NEEDS_ADAPTER 项

- Search: `NEEDS_ADAPTER`
  - 缺口: 真实数据源选择、BridgeResult 对齐、错误模型、source selection、fake/real mode guard。
  - 本轮不接真实搜索。
- BookDetail: `NEEDS_ADAPTER`
  - 缺口: detail / TOC 数据源边界、BridgeResult 对齐、parser/source 隔离、TOC preview 数据来源。
  - 本轮不接真实详情。
- BLOCKED 项: 本轮未新增 BLOCKED；既有 BLOCKED screen 保持隔离，未处理。

## 8. 测试结果

- `./gradlew test`: 通过，`BUILD SUCCESSFUL in 8s`
- `./gradlew assembleDebug`: 通过，`BUILD SUCCESSFUL in 12s`
- `./gradlew lintDebug`: 通过，`BUILD SUCCESSFUL in 54s`

新增 / 更新测试覆盖：

- Search fake fixture 可映射为 `SearchUiState`
- Search empty / loading / error state 可表达
- `SearchResultUiModel` 字段满足 UI 需要
- BookDetail fake fixture 可映射为 `BookDetailUiState`
- TOC preview 可表达
- BookDetail loading / error state 可表达
- mapper 不依赖 repository / parser / bridge
- 不访问网络
- 不出现 Stitch 旧色 / 旧类
- 不出现 WebView normalized HTML runtime

## 9. 是否仍有 P0

无

## 10. 是否仍有 P1

无

## 11. 是否允许进入 Slice 13

允许进入 Slice 13 Source management existing flow hardening。

Search / Detail 若后续进入真实接入，应先以本轮 state / mapper 为边界，不在 screen 中直接开启真实 HTTP / parser 调用。
