# Data Integration Readiness Audit

## 1. 总体结论

DATA_INTEGRATION_READINESS_READY

结论含义: 允许进入下一阶段的 Slice 10 UI State Adapter Foundation；不建议直接进入真实网络/真实业务数据接入。当前最安全路径是先建立 UI state、mapper、fixture/fake adapter，再逐屏替换 static/fake/stub 数据来源。

## 2. Git 状态

- 当前 HEAD: `a0d51ca docs: add post commit runtime closure report`
- 是否提交 closure report: 是，`POST_COMMIT_RUNTIME_GIT_CLOSURE_REPORT.md` 已单独提交。
- 是否 push: 否。

提交后 `git status --short` 仅剩既定排除的 untracked 文件，包括 `.agents/`、`.codex/`、旧 Stitch/Control/Quick action 中间报告、`scripts/`、`docs/ui-handoff/stitch-export/` 等；未纳入本轮提交。

## 3. 当前 UI 实装基线

- 14 个 Screen 基线: `BookshelfScreen`, `SearchScreen`, `BookDetailScreen`, `SettingsScreen`, `ReaderScreen`, `BookSourceScreen`, `SourceDetailScreen`, `SourceEditScreen`, `SourceImportScreen`, `DiscoverScreen`, `RssListScreen`, `RssDetailScreen`, `RssSubscriptionManagementScreen`, `WebDavConfigScreen`, `BackupSettingsScreen`。注: handoff 报告称 14 个，但实际枚举含 15 个 artifact；本报告按用户指定的 14 个重点模块归并 RSS 与 GlobalSettings/StatePage。
- 21 条 route: `ReaderRouteHost` 已注册 21 个 `composable` destination。
- 当前测试状态: 最近基线 `./gradlew test`, `./gradlew assembleDebug`, `./gradlew lintDebug` 均通过；本轮只读审计后再次执行 `./gradlew test` 作为验证基线。

## 4. Screen 数据接入矩阵

| Screen | 当前数据状态 | 可接入数据源 | 风险 | 接入等级 | 下一步建议 |
|---|---|---|---|---|---|
| Bookshelf | static/state placeholder；仅 empty/loading/error/offline | `ReadingProgressDao`, `LocalBookProgressMapper`, local book models | 无 UI adapter；直接建 Room 会扩大入口责任 | NEEDS_ADAPTER | Slice 10 定义 `BookshelfUiState` 与 mapper，Slice 11 再接已有本地书架/进度 |
| Search | partially integrated；`SearchViewModel` 默认 `FakeCoreBridge`，可手动 `useRealHttp` | `ReaderCoreBridge` contract, `FakeCoreBridge`, `SearchParser`, `HttpClient`, `BookSourceRepository` | hardcoded source；真实 HTTP 会绕过 bridge result/error taxonomy | NEEDS_ADAPTER | 先定义 search UI adapter，保持 fake 默认，不直接打开 real HTTP |
| BookDetail | partially integrated；`BookDetailViewModel` 默认 fake | `ReaderCoreBridge`, `BookInfoParser`, `HttpClient` | hardcoded source；detail URL 与 route id 语义未统一 | NEEDS_ADAPTER | 建 `BookDetailUiState` mapper，统一 detailUrl/bookId 输入 |
| ReaderScreen | partially integrated；fake content + 控制层状态，`chapterProgress` 写死 | `ReaderCoreBridge`, `ContentParser`, `ChapterCacheManager`, `ReadingProgressDao`, `ChapterTextFeeder` | 章节、分页、进度、缓存边界尚未进入统一 state；不能改阅读引擎 | NEEDS_ADAPTER | Slice 14 只接当前章节/进度/control state bridge，不改 Core |
| SourceManagement | fake repository flow；已有 `BookSourceRepository` 接口 | `BookSourceRepository`, `FakeBookSourceRepository`, `DataStoreBookSourceRepository` | DataStore repo 需 load/save 调用约束；但业务逻辑已存在 | READY_EXISTING_FLOW | 用 DI/adapter 注入 repository，保持 fake/real 边界清晰 |
| SourceDetail | route stub + `SourceDetailData` 参数 | `BookSourceRepository.getByUrl`, `SourceValidation` | 需 sourceId/url 映射；规则状态需要 mapper | NEEDS_ADAPTER | 新增只读 `SourceDetailUiState` mapper，不改 repository |
| SourceEdit | local form state + save callback | `BookSourceRepository.add/setEnabled/remove/importJson` | 表单字段覆盖不足；保存策略与重复 URL 处理未定 | NEEDS_ADAPTER | 先做 UI state/form mapper，保存仍走现有 repository |
| SourceImport | static callback；未选择 URL/clipboard/file 具体流 | `BookSourceRepository.importJson`, local file/import models | 导入方式、权限、剪贴板/文件选择交互需确认 | BLOCKED_BY_DESIGN_DECISION | 先确认导入入口与权限策略，再接 repository import |
| Discover | static recommendation list | `ExploreMapping`, `ExploreSource`, RSS subscription data | 数据来源是推荐、探索源还是本地书架未定 | READY_FAKE_TO_STATE | 先把 static list 提升为 `DiscoverUiState` fixture |
| RSS | static list/detail/subscription；runtime detail/subscription route 是 stub | `RssParser`, `SubscriptionRepository`, `FakeSubscriptionRepository`, `ExploreMapping` | UI data class 与 network model 同名不同包；缺 adapter | NEEDS_ADAPTER | Slice 15 定义 RSS adapter，先接 fake subscription state |
| WebDAVConfig | static form + login callback | `WebDavAuth`, `WebDavClient`, `WebDavRetryPolicy`, `RemoteFileListingParser` | 凭据持久化、真实客户端来源、错误映射未接 UI state | NEEDS_ADAPTER | 先建 WebDAV settings state adapter，继续用 fake client |
| BackupSettings | screen static defaults；runtime route 当前 explicit stub | `BackupRestoreManager`, `BackupPackage`, `WebDavClient` | 备份开关持久化与 WebDAV 依赖边界未建 | NEEDS_ADAPTER | 先 route 到 screen/state adapter，再考虑真实备份 |
| ProgressSyncStatus | route explicit stub | `ProgressSyncProtocol`, `SyncConflictResolver`, `SyncOperationLogDao`, `SyncManager` | 缺 UI state 与冲突展示契约；不要硬接同步写入 | NEEDS_ADAPTER | 新增 read-only sync status state/mapper |
| GlobalSettings / StatePage | Settings 已接 `ThemePreferences` DataStore；StateComponents 可渲染 loading/empty/error/offline/permission | `ThemePreferences`, `ReaderUiState`, `StateComponents` | 全局设置与阅读页设置边界需继续守住 | READY_EXISTING_FLOW | 可保持现有真实 settings flow，补 StatePage wrapper 即可 |

补充: `TOCScreen` 是 21 route 中的支持屏，不在用户指定 14 模块中；它与 Search/Detail/Reader 一样使用 `FakeCoreBridge` + optional `useRealHttp` 模式，真实接入前也需要 adapter。

## 5. 现有数据流核对

### repository

- `BookSourceRepository` 已有 fake 与 DataStore 实现，可支撑 SourceManagement/SourceDetail/SourceEdit/SourceImport 的低风险 UI adapter。
- `SubscriptionRepository` 目前只有 fake，可支撑 RSS fake-to-state，不应直接假定真实订阅持久化。
- `ReadingProgressDao`, `CachedChapterDao`, `SyncOperationLogDao` 存在，但 UI 侧尚无 repository/facade，Bookshelf/Reader/ProgressSync 需要 adapter。

### bridge

- `CoreBridge` + `FakeCoreBridge` 已被 Search/Detail/TOC/Reader ViewModel 直接使用。
- `ReaderCoreBridge` contract 定义了 `BridgeResult` 和错误 taxonomy，但当前 UI ViewModel 尚未接入该 contract。
- 真实数据接入不能绕过 bridge/fake boundary 直接打开 `useRealHttp`；应先做 bridge adapter。

### fake/real mode

- `FakeRealModeBoundaryTest` 明确验证 Search/Detail/TOC/Reader 默认 fake、可构造 real HTTP 模式。
- 风险点: `useRealHttp` 是 Boolean 构造参数，且 ViewModel 内部硬编码 source/parser/http；真实接入前需要用 adapter/factory 替代硬切换。

### ViewModel/state holder

- 已有 ViewModel: `SearchViewModel`, `BookDetailViewModel`, `TOCViewModel`, `ReaderViewModel`, `SourceManagementViewModel`。
- 已有 state holder: `ReaderUiState`、reader control layer 的局部 `remember` state、Settings 的 DataStore Flow。
- 缺口: Bookshelf/Discover/RSS/WebDAV/Backup/ProgressSync/StatePage 缺统一 UI state model。

### 当前可复用项

- UI 组件: `StateComponents`, book/search/settings/common components。
- Data adapters: WebDAV fake client、backup manager、RSS parser、local book mapping、sync conflict resolver、chapter cache/progress models。
- Tests: bridge/repository/parser/adapter contract tests 已覆盖底层能力；UI structure/route guard tests 已覆盖 runtime 接线。

## 6. 阻塞项

- Core gap: 目前没有 `ReaderCoreBridge` 的实际实现接到 UI；Search/Detail/TOC/Reader 只能安全保持 fake 或 adapter facade。
- bridge gap: UI ViewModel 直接依赖 `FakeCoreBridge`/`HttpClient`，未使用 `BridgeResult` 错误模型；真实接入前需 bridge adapter。
- design decision: SourceImport 的 URL/剪贴板/文件入口与权限策略未定；Discover 推荐来源未定。
- architecture risk: 直接从 Composable 创建 DataStore/Room/HTTP/bridge 会扩大 UI 责任；应先用 UI state adapter/factory 隔离。
- fake/real boundary risk: `useRealHttp` Boolean 可被误用为真实接入口；后续应通过构造注入明确 fake/real provider。

## 7. 推荐后续 Slice

1. Slice 10: UI State Adapter Foundation
   - 新增 UI state/mapper/fake fixture 层。
   - 不接真实网络，不改 Core，不改 parser/repository。
   - 建立 `UiState -> Screen` 的可测合同。

2. Slice 11: Bookshelf existing data integration
   - 优先接已有 `ReadingProgress`/local book mapping。
   - 如缺 repository facade，先新增只读 adapter。

3. Slice 12: Search/Detail fake-to-real boundary planning
   - 审计 `ReaderCoreBridge` 实现来源。
   - 把 Search/Detail/TOC/Reader 从 hardcoded `FakeCoreBridge` 迁到 bridge adapter。

4. Slice 13: Source management existing flow hardening
   - 在 `BookSourceRepository` 基础上接 UI。
   - 不改书源解析/导入业务规则。

5. Slice 14: ReaderScreen runtime state bridge
   - 只接当前章节、进度、缓存、控制层状态。
   - 不重写阅读引擎，不改分页/解析核心。

6. Slice 15: WebDAV/RSS static-to-state adapter
   - 先接 fake/state adapter。
   - 不强接真实同步、真实 WebDAV 网络或真实 RSS 拉取。

## 8. 是否仍有 P0

无。

## 9. 是否仍有 P1

无。

## 10. 是否允许进入真实数据接入

允许进入 Slice 10 UI State Adapter Foundation。

不建议直接进入真实数据接入；需先完成 adapter/state foundation，保护 Reader-Core bridge、parser/repository/book source 逻辑和 fake/real mode boundary。
