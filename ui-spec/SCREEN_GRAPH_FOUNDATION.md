# Canonical Screen Graph Foundation, Gap Closure, and Native Registry Publication (R16A-R16D)

状态：R16A foundation + R16B canonical route gap closure + R16C UI-owned native registry publication + R16D explicit bindings and render semantics

`screen-graph.json` 把已有 route、shell、alias 与 ViewState fixture 组合成确定性、机器可校验的 screen graph。它是 Native Renderer 后续消费的结构输入，不是生产 renderer 完成证明。

## 权威输入与生成物

权威输入：

- `contracts/route.schema.json`：260 个 canonical RouteId 与 5 个 Shell。
- `frontend-demo-optimized/route-contract.js`：260/260 route 的标题与 Shell。
- `contracts/fixtures/route.fixtures.json`：260 个 route fixture，其中 184 个 direct、76 个 alias。
- `contracts/view-state.schema.json`：PageState、phase facet 与 174 个 canonical ComponentType。
- `contracts/fixtures/view-state.fixtures.json`：190 个 ViewState variant，覆盖 184 个 direct route；其中本轮 24 个项目能力 intake route 有独立结构、状态和 fail-closed action evidence。
- `contracts/ui-event.schema.json`：binding 可引用的 300 个 canonical UiEvent；新增 30 个能力事件仍为 planned/fail-closed。
- `ui-spec/component-render-semantics.json`：174 个 ComponentType 的 state authority 与 composition mode；默认是 `contract` / `contract-tree`，ReaderBase、TapZones、ReaderTopArea、ReaderBottomBar 显式为 `host-composite`。

确定性生成物：

- `ui-spec/screen-graph.schema.json`：严格 JSON Schema 2020-12；RouteId、Shell、PageState、ComponentType 与 UiEvent 均使用 canonical enum。
- `ui-spec/screen-graph.json`：按 `route.schema.json` 顺序生成的 260 个 route node，并按 `view-state.schema.json` 顺序登记全部 174 个 ComponentType。
- `generated/screen-graph-coverage.json`：direct/alias/gap、variant、组件与 action evidence 计数。
- `generated/swift/ScreenGraph.swift`：Swift 可执行 registry，使用现有 `RouteId`、`RouteShell`、`PageState`、`ComponentType` 与 `UiEventType` 解码，并提供 route/alias/variant 查询 API。
- `generated/kotlin/ScreenGraph.kt`：Kotlin 可执行 registry，使用 kotlinx.serialization 严格解码同一份 canonical asset，并提供等价查询 API。
- `generated/arkts/ScreenGraph.ets`：ArkTS typed registry；除 typed interface 外还内嵌 canonical RouteId、ComponentType、UiEventType exact-set，在构造时递归 fail closed。
- `tools/screen-graph/tests/ScreenGraphRegistrySmoke.swift` 与 `KotlinScreenGraphRegistrySmoke.java`：直接加载生成 asset，递归核对 route/variant/component/binding 计数，并执行 alias 与 variant 查询的原生 smoke 入口。

三语言文件内嵌的是同一份无空白、语义无损的 canonical JSON。generator 将大字符串拆为 8,000 code-point 分块，避免 Kotlin/JVM 单 UTF-8 常量 64 KiB 限制；每份发布物同时记录 canonical asset SHA-256、route/variant/component/binding 计数。

生成与检查：

```bash
node tools/screen-graph/generate-screen-graph.mjs
node tools/screen-graph/check-screen-graph.mjs
node --test contracts/tests/screen-graph.test.mjs
swift build --target ReaderUIContract
./gradlew :reader-ui-contract:compileKotlin --rerun-tasks
```

checker 会逐字节比较确定性生成结果，并阻断 missing/duplicate/orphan route、alias cycle、重复 variant、重复 component id、未知 ComponentType、伪 `Unknown`/`Fallback`/`Placeholder`、未登记 UiEvent binding、重复/非法 binding target、render semantics 漂移、隐藏 action gap、R14 executable binding payload 失配与 source prop drift。

R16C registry generation 额外阻断以下漂移：260 个 RouteId set/order 不完全相等、174 个 ComponentType catalog set/order 不完全相等、递归组件树出现未知 ComponentType、binding 出现非 canonical UiEvent，以及 variant 总数偏离 canonical graph。Route/variant 期望值直接从 schema/fixtures 读取，后续不再维护独立硬编码分母。Swift/Kotlin 的 typed decoder 会在消费时拒绝未知 enum；ArkTS registry 用生成期发布的 exact-set 做同等运行时校验。三端统一消费入口分别是 `ScreenGraphRegistry.loadCanonical()` / `loadCanonical()`，并提供 `route`、`resolve`、`variants`、`variant` API。

ComponentType catalog 当前把 138 个有 fixture 实例的类型标为 `referenced`，把 36 个尚无实例的 canonical 类型标为 `explicit-gap`。书架 cover/list 复用稳定 `BookCard`（`semanticRole=BookItem`），因此通用 `ListRow` 不再为书架合成第二套实体树。能力 intake 复用既有页面级与 primitive ComponentType，没有新增类型，也没有为了消除未使用计数而合成实例。

剩余 36 个未实例化类型继续保留 catalog gap。optimized demo 的对应 route 当前由更高层 page component 承载；在没有 direct ViewState 组件实例前不合成 fixture 消数。

## 三种 route 状态

- `direct`：route 有一个或多个 ViewState fixture；graph 内联有序组件树。
- `alias`：route 通过 `aliasFor` 解析到 direct route；graph 不复制组件树。
- `explicit-gap`：route 当前既无 direct ViewState fixture，也无 alias；graph 保留 shell 与证据缺口，不合成 fallback 组件。

当前机器事实为 184 direct + 76 alias + 0 explicit-gap，260/260 route 均可通过 direct/alias 解析。R16B 的 35 个原 explicit-gap route 已补为 direct ViewState；本轮另外登记 24 个项目能力 intake route，并由 D6 renderer 显式展示，不使用语义不等价 alias 或 bookshelf fallback 压平状态。

R16B 同时增加 `typographyManagePhase = idle/reset/persist`，使 `reader-typography-reset-confirm` 能直接表达 `typographyState.resetConfirm`，并在 generator 中对 W1-W5 的 shell、pageState、phase facet、必要 ComponentType、canonical UiEvent 与首/末页 boundary context 做 fail-closed 校验。

## Action binding 边界

只有 fixture 明确提供 canonical `uiEvent` 或 `eventId`，且 payload 为对象时，generator 才能生成 typed binding。人类可读按钮文案不能推断成 UiEvent。

当前 graph 有 97 个 canonical action binding 与 19 个非执行 state-event evidence，共 116 条 canonical event evidence。97 个 binding 中 41 个 payload 已逐项通过 67-action R14 runtime contract；其余 56 个引用 canonical 但尚未实现的事件，保持 planned/fail-closed。61 个 binding 使用显式 semantic target；其中原有 TapZones 的 10 个 target 继续把 `previous`、`control`、`next` 分别绑定到 `reader.page.prev`、`reader.control.toggle`、`reader.page.next`，并按 loading / first / last boundary 明确禁用方向。其 26% / 48% / 26% 是可执行设计几何；Host 仍需结合真实分页与边界状态做 admission，不能把 fixture enabled 值提升为运行时权威。

从 prop 推导的旧 binding 使用 `target=self`；显式多目标 binding 必须使用非 `self` 的稳定 semantic target。剩余 6 个 `label-without-ui-event` explicit action gap 继续保留；generator 不按按钮文案猜事件。

## Authority 与组合边界

每个 component node 与 catalog entry 都发布 `stateAuthorities` 和 `compositionMode`。`contract-tree` 表示 children 是通用 renderer 可以递归消费的执行树；`host-composite` 表示 Host 必须从声明的 Core、ReaderUIRuntime、Host Store 或 Host Layout authority 组合生产视图，canonical children 若存在只作为 anatomy evidence，不能再次递归渲染。

ReaderBase 的正文、书籍/章节身份、page index/count、anchor、progress、live theme 与 session 均不由 ScreenGraph 持有。ScreenGraph 只声明组件角色和事件意图；三端 adapter 必须继续从真实 owner 读取并保持 exactly-once reducer/effect 边界。

## 证明边界

Screen graph 绿色只证明：

- 260 个 canonical RouteId 的顺序、Shell 与状态分类一致；
- direct component tree 与 ViewState fixture 完全一致；
- 174 个 ComponentType 均在 catalog 中唯一登记，未使用类型保持 explicit gap；
- alias 可解析且无环；
- 缺失 tree/action evidence 被显式计数，没有伪覆盖；
- 生成结果确定且 schema/checker fail closed。

Screen graph 绿色不证明：

- iOS SwiftUI renderer 已实现或完成；
- Android Compose renderer 已实现或完成；
- HarmonyOS ArkUI renderer 已实现或完成；
- simulator/真机交互、accessibility、布局或性能已通过；
- runtime 已进入 Authoritative rollout。

因此，`260 graph resolvable` 和“三语言 registry 已发布”都不等于 iOS/Android/HarmonyOS 三端 native renderer 已接入或完成。R16C/R16D 只完成 Reader-UI 发布物；各 Host 仓的 adapter 消费、Core/Host 事务、模拟器/真机证明与 Authoritative rollout 属于后续独立验收。
