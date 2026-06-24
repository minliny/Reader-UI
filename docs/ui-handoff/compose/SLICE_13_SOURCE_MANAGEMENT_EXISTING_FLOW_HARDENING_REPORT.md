# Slice 13 Source Management Existing Flow Hardening Report

## 1. 总体结论

SLICE_13_SOURCE_MANAGEMENT_EXISTING_FLOW_HARDENING_READY

本轮完成书源管理 existing flow hardening。实现范围仅限 Source management UI state / mapper / fixture / smoke guard，并让书源列表从 `BookSource` domain model 映射到 `SourceUiModel` 后渲染。未接真实搜索、真实详情、阅读页真实数据、WebDAV/RSS；未修改 Reader-Core bridge / parser / repository / book source 业务逻辑；未 push。

## 2. Git 状态

- 当前 HEAD: `83cab1e feat: add search detail UI state boundaries`
- Slice 12 是否提交: 是，commit `83cab1e`
- 是否 push: 否
- 当前新修改: Slice 13 Kotlin、测试、本文档

## 3. 修改范围

新增 Kotlin：

- `app/src/main/kotlin/com/reader/android/ui/booksource/SourceManagementUiState.kt`
- `app/src/test/kotlin/com/reader/android/ui/booksource/SourceManagementUiStateMappingTest.kt`
- `app/src/test/kotlin/com/reader/android/ui/booksource/SourceManagementDataIntegrationTest.kt`
- `app/src/test/kotlin/com/reader/android/ui/booksource/SourceManagementBoundaryGuardTest.kt`

修改 Kotlin：

- `app/src/main/kotlin/com/reader/android/ui/booksource/BookSourceScreen.kt`

新增文档：

- `docs/ui-handoff/compose/SLICE_13_SOURCE_MANAGEMENT_EXISTING_FLOW_HARDENING_REPORT.md`

未修改：

- Reader-Core bridge
- parser
- repository
- book source 业务逻辑
- Search / BookDetail / ReaderScreen / WebDAV / RSS

## 4. 现有书源管理数据流核对

- 复用数据流: `BookSourceRepository` contract、`FakeBookSourceRepository` fake flow、`DataStoreBookSourceRepository` existing flow 形态。
- 本轮 UI 接入方式: `BookSourceScreen` 仍由 `SourceManagementViewModel` 读取 repository source list，再经 `SourceManagementMapper.fromSources(...)` 映射到 `SourceManagementUiState` / `SourceUiModel`。
- 是否修改 repository: 否。
- 是否修改 bridge/parser: 否。
- fake/real boundary 是否保持: 是。默认仍使用 `FakeBookSourceRepository` fallback；mapper 只消费已取得的 `BookSource` 列表，不创建真实网络、不绕过 repository contract。

## 5. Source Management UI State 结果

新增 UI state:

- `SourceManagementUiState`
- `SourceUiModel`
- `SourceImportUiState`
- `SourceTestUiState`
- `SourceUrlInputUiState`
- `SourceUiStatus`
- `SourceImportMode`
- `SourceImportStatus`
- `SourceTestStatus`

状态覆盖：

- SourceManagement list: `SourceManagementUiState.sources`
- SourceDetail: `SourceManagementMapper.detailDataOf(...)`
- SourceEdit: `SourceUrlInputUiState` 可表达自定义 URL / repository URL 输入状态
- SourceImport: `SourceImportUiState`
- SourceTestResult: `SourceTestUiState`
- disabled / error: `SourceUiStatus.Disabled` / `SourceUiStatus.Error`
- JSON import: blank / ready / imported / error 状态
- 启用 / 禁用: `SourceUiModel.enabled` 与 `SourceUiStatus`
- fake / real mode: `fakeRealModeLabel` 与 `allowRealDataIntegration`

## 6. Adapter / Mapper 结果

`SourceManagementMapper` 是 UI 层纯映射：

- 输入: `List<BookSource>` 或本地 UI 输入字符串。
- 输出: `SourceManagementUiState`、`SourceUiModel`、`SourceImportUiState`、`SourceTestUiState`。
- 不访问网络。
- 不读写数据库。
- 不调用 Reader-Core。
- 不调用 parser。
- 不直接调用 repository。
- 后续真实数据接入时只替换 `BookSource` 列表来源，不改变 mapper 责任。

## 7. 重点硬化项结果

- blank JSON import: `SourceManagementMapper.importPreview("   ")` 返回 `SourceImportStatus.BlankJson` 与本地提示，不调用 repository，不崩溃。
- URL validation: `validateUrlInput(...)` 可表达 `CustomUrl` 与 `RepositoryUrl` 的 blank / invalid / valid 状态，不发起网络。
- no-op notice: `noOpNotice(action)` 提供本地提示。
- disabled source: disabled repository source 映射为 `SourceUiStatus.Disabled`。
- source test loading / success / failure: `SourceTestUiState` 覆盖 `Loading` / `Success` / `Failure`。
- fake/real mode: 默认 `FakeBookSourceRepository` fallback 保持，mapper 不改变 real mode boundary。

## 8. 测试结果

- `./gradlew test`: 通过，`BUILD SUCCESSFUL in 9s`
- `./gradlew assembleDebug`: 通过，`BUILD SUCCESSFUL in 12s`
- `./gradlew lintDebug`: 通过，`BUILD SUCCESSFUL in 1m`

新增 / 更新测试覆盖：

- existing source list 可映射为 `SourceManagementUiState`
- disabled source 可表达
- blank JSON import 状态可表达
- URL validation / custom URL / repository URL 状态不回归
- source test loading / success / failure 可表达
- fake / real mode boundary 不被破坏
- mapper 不直接调用 parser / bridge internals
- 不访问真实网络
- 不出现 Stitch 旧色 / 旧类
- 不出现 WebView normalized HTML runtime

## 9. 回归守卫

- 无 Stitch 旧类/旧色。
- 无 WebView normalized HTML runtime。
- 未修改 Reader-Core bridge/parser/repository。
- fake/real boundary 未破坏。

## 10. 是否仍有 P0

无

## 11. 是否仍有 P1

无

## 12. 是否允许进入 Slice 14

允许进入 Slice 14 ReaderScreen runtime state bridge。
