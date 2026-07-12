# Architecture

状态：2.2 Executable UI Spec 架构冻结
日期：2026-07-10
权威源：本文；[CONTRACT_FIRST_NATIVE_UI_PLAN.md](./CONTRACT_FIRST_NATIVE_UI_PLAN.md) 仅保留 2.1 以前的迁移背景

本文冻结 Reader 多端 UI 架构。架构一旦变更必须先改本文与 [BOUNDARY_RULES.md](./BOUNDARY_RULES.md)、[STATE_OWNERSHIP.md](./STATE_OWNERSHIP.md)、[CONTRACT_VERSIONING.md](./CONTRACT_VERSIONING.md)，再向下传导到 schema 和 codegen。

## 1. 架构原则

Reader 采用 **Executable UI Spec + Native Renderer Architecture**。统一的是确定性 UI 状态转换、effects、组件语义、token 与 motion；最终绘制、手势测量和系统能力仍由原生平台执行：

```text
Reader-Core-Native
  业务事实源：书源、章节、正文、进度、RSS、TTS queue、同步冲突

Reader UI Executable Spec
  route / state / event / motion / token / view-state schema
  runtime-actions + deterministic reducer/effect runtime
  Swift / Kotlin / ArkTS 可发布包

Native Renderer + Effect Runner
  SwiftUI / Compose / ArkUI 渲染共享 ViewState
  执行 CoreCommand / HostRequest，并把结构化结果送回 runtime

Host Adapter
  平台能力：HTTP、WebView、Cookie、文件、权限、后台任务、系统 TTS、Keychain/Keystore

Platform Ephemeral State
  dragOffset / layout measurement / text selection / accessibility focus
```

在已注册 ComponentType、token、motion 和 HostRequest 能力范围内，页面结构、状态规则、路由和交互变更只修改 Reader-UI，Host 通过升级同版本 runtime 包自动跟随。新增原生组件 primitive、系统能力或平台专属交互时，仍需在每个 Host 扩展一次 renderer/adapter；扩展后后续页面可复用，无需逐页手调。

## 2. 仓库角色

| 仓库 | 当前职责 | 修改方向 |
| --- | --- | --- |
| `Reader UI` | UI demo、Contract、Executable UI Spec | 唯一 UI 语义源；发布 contract + Swift/Kotlin/ArkTS runtime 包，维护参考 runtime 与防漂移测试 |
| `Reader-Core-Native` | Rust 业务内核、FFI、protocol、host bus | 收敛为唯一业务事实源，补齐 CoreCommand/CoreEvent/HostRequest/progress/sync contract |
| `Reader for iOS` | SwiftUI 原生 App | 消费 ReaderUIContract + ReaderUIRuntime；保留 native renderer、Core bridge、Host Adapter 与设备证据 |
| `Reader for Android` | Compose 原生 App | 消费 reader-ui-contract + reader-ui-runtime；保留 native renderer、Core bridge、Host Adapter 与设备证据 |
| `Reader for HarmonyOS` | ArkUI 原生 App | 消费 generated ArkTS + HAR `reader_ui_runtime`；保留 native renderer、NAPI bridge、Host Adapter 与设备证据 |
| `Reader-Core` | 旧 Swift Core、历史样本和兼容参考 | 不再作为新主线扩展；只保留迁移参考、fixture、行为对照和历史兼容证据 |
| `Reader for Windows` | 暂不属于当前 iOS / Android / HarmonyOS 移动三端主线 | 若恢复开发，消费同一套 UI Contract 和 Reader-Core-Native |

## 3. 分层职责

### 3.1 Reader UI Executable Spec（本仓库）

- 产出机器可读 schema：`route` / `ui-event` / `ui-state` / `view-state` / `motion` / `token`。
- 产出 fixtures 与 contract tests 用于三端校验。
- 产出 codegen 入口，生成 Swift / Kotlin / ArkTS 类型。
- 产出 `runtime-actions.json` 与三端 `ReaderUIRuntime` 包，共享 navigation、overlay、session、focus、async guard、reducedMotion 和 effect planning。
- 产出 JavaScript reference runtime，作为三端 golden semantics 的可执行 oracle。
- 不承载生产 UI，不实现 SwiftUI / Compose / ArkUI 页面。
- 不实现 Reader-Core-Native 的业务协议。
- 不调用平台 API，不持有原生 View，不拥有 DomainState 或 EphemeralState。

### 3.2 Reader-Core-Native

- 业务事实源，负责 `book.parse / chapter.list / content.load / reader.location.resolve / reader.progress.update / source.search / source.detail / rss.list / rss.item.read / tts.queue.plan / sync.snapshot / sync.conflict.resolve`。
- `book.open` 是 UI runtime 管理的非原子、结果依赖事务，不在 Core 伪造原子命令；remote 顺序为 `source.detail -> chapter.list -> content.load -> awaiting-layout -> reader.location.resolve`，local 从 `chapter.list` 开始。每一步只能在同 correlationId 的前一步结果后执行，完整约束见 `ui-spec/RUNTIME_BOOK_OPEN_TRANSACTION_PROTOCOL.md`。
- 不负责 SwiftUI / Compose / ArkUI 页面状态、手势识别、平台导航栈、系统权限弹窗、Cookie 保存位置、WebView 生命周期、像素级布局状态。

### 3.3 ReaderUIRuntime 与 Host Coordinator

- 共享 runtime 统一管理：navigation、readerMode、overlay、activeSession、focusTarget、loading/error、async guard、reducedMotion、source switching、sync prompt 与 effect planning。
- 每平台只保留薄 coordinator：把 UiEvent 交给 runtime、执行 effects、接回 CoreEvent/HostResult、将 state 暴露给原生 renderer。
- 平台不得复制或分叉共享 action table；临时兼容分支必须有 version gate、迁移截止版本和 parity test。
- runtime 与 coordinator 均不得解析书籍、计算业务进度、直接写数据库、直接做 WebDAV 冲突策略或持有平台 View 引用。
- 生产 Shadow 必须经真实 App event bus 使用长期 runtime 实例，并只比较 transition/state/effects；Shadow 不得执行 runtime effect 或改写 native state。逐事件 Pilot/Authoritative 由 consumer lock cohort 控制，详细协议见 ui-spec/RUNTIME_LIVE_SHADOW_PROTOCOL.md。

### 3.4 Host Adapter

- 平台能力执行层，不混入页面组件。
- 统一能力清单：`http.execute / webview.open / webview.evaluate / cookie.get-set / file.read-write / storage.path / credential.get-set / tts.system.start-stop / permission.request / background.schedule / timer.foreground.arm-cancel / notification.show / share.invoke`。
- Core 可以发起 `HostRequest`，Reducer 可以发起平台 UI 相关 `HostCommand`。Host Adapter 返回结构化结果，不直接改 Core 或 UI 状态。

### 3.5 Native UI

- 通过稳定的 ComponentType renderer registry 渲染 ViewState，发送 UiEvent。
- 平台负责 SwiftUI / Compose / ArkUI 的自然布局、accessibility、safe area、输入法、手势采样与系统动画接入。
- 不得直接修改 DomainState。
- 不得跨页面组件互改全局状态。

## 4. 数据流

```text
Native Renderer
  -> emit UiEvent

ReaderUIRuntime
  -> deterministic UiState transition
  -> emit CoreCommand / HostRequest effects

Reader-Core-Native
  -> return CoreEvent / DomainResult

Host Adapter
  -> return HostResult

Thin Host Coordinator -> ReaderUIRuntime
  -> merge CoreEvent / HostResult
  -> produce ViewState

Native Renderer
  -> render ViewState
```

## 5. 仓库内目录骨架

```text
contracts/
  ARCHITECTURE.md
  BOUNDARY_RULES.md
  STATE_OWNERSHIP.md
  CONTRACT_VERSIONING.md
  CONTRACT_FIRST_NATIVE_UI_PLAN.md
  README.md
  route.schema.json
  ui-event.schema.json
  ui-state.schema.json
  view-state.schema.json
  motion.schema.json
  token.schema.json
  fixtures/
  tests/

ui-spec/
  runtime-actions.schema.json
  runtime-actions.json

tools/codegen/
  README.md
  swift/
  kotlin/
  arkts/

tools/runtime/
  generate-runtime.mjs

generated/
  README.md
  swift/
  kotlin/
  arkts/

packages/
  reference/
  swift/ReaderUIRuntime/
  kotlin/reader-ui-runtime/
  arkts/reader-ui-runtime/
```

## 6. 验收门槛

- 三端类型能从同一套 schema 生成或验证。
- demo 中出现的 route / motion / state 必须能在 contract 中找到。
- 不允许只靠 Markdown 描述状态。
- runtime action 必须通过 schema，且 UiEvent/CoreCommand/HostRequest 引用必须来自 canonical enum。
- action table 必须由同一输入确定性生成 Swift/Kotlin/ArkTS，codegen drift 阻断合并。
- generated/runtime-coverage.json 必须逐条覆盖 canonical UiEvent，并明确为 implemented、planned 或 platform ephemeral；新增 event、变更 action 数或 ownership 都必须更新预期与测试。
- contract/runtime 版本变更必须触发三端依赖升级、编译或 parity test 失败。
- structural matrix、unit tests、host runtime proof、simulator/device proof 分层记录，不合并成单一“完成”。

## 7. R16A-R16B Canonical Screen Graph 边界

`ui-spec/screen-graph.json` 是 route / ViewState fixture 的确定性机器索引，严格 schema 为 `ui-spec/screen-graph.schema.json`，覆盖报告为 `generated/screen-graph-coverage.json`。生成规则和证明边界见 [SCREEN_GRAPH_FOUNDATION.md](../ui-spec/SCREEN_GRAPH_FOUNDATION.md)。

graph 必须覆盖 `route.schema.json` 的全部 235 个 RouteId，并把三种事实分开：

- `direct`：已有 ViewState fixture，内联 page-state/context/facet variant 与有序 canonical ComponentType tree；
- `alias`：通过 `aliasFor` 解析到 direct route，不复制或伪造组件树；
- `explicit-gap`：尚无 direct fixture/alias，保留 shell 与机器缺口，不使用 `Unknown`、`Fallback`、`Placeholder` 伪覆盖。

graph 的 ComponentType catalog 必须按 `view-state.schema.json` 顺序登记全部 canonical 类型：有真实 fixture 实例的类型为 `referenced`；没有实例的类型为 `explicit-gap`。不得为了让 coverage 变绿而合成组件实例。

action binding 只能来自 fixture 中明确的 canonical UiEvent 与触发语义。人类按钮文案、组件命名或 demo DOM 不能被猜测为 UiEvent；证据不足必须成为计数化 explicit action gap。R16D 将 55 条事件证据拆成 36 条带明确 `tap` trigger 的可执行 binding 与 19 条不可执行 `state-evidence`，避免 Host 把 loading/error/offline 等状态标记误发成用户意图；另有 6 个显式 action gaps。若 executable binding 对应 61-action runtime，其 payload 还必须通过 R14 typed contract；当前 12 条此类 binding 已逐项通过 R14 校验。

R16B 当前机器事实为 159 direct + 76 alias + 0 explicit-gap，235/235 route 可解析；35 个原 gap 均因已有 optimized demo renderer 与独立 reducer state 语义而补成 direct ViewState，没有使用等价性不足的 alias。graph gate 绿色只证明 route/shell/alias/direct fixture tree/gap 的一致性与确定性。`235 graph resolvable` 不证明 iOS/Android/HarmonyOS 原生 renderer 已实现，不证明设备交互或像素一致，也不改变 Pilot/Shadow/Authoritative rollout 状态。
