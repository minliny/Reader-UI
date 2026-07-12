# Executable UI Runtime

状态：2.5.0 已同步 61-action runtime 与三端 35-event consumer allowlist；7 events 为 Pilot，28 events 保持 Shadow，其余 26 actions 仅 staging
日期：2026-07-11
权威架构：[contracts/ARCHITECTURE.md](./contracts/ARCHITECTURE.md)

## 1. 目标与边界

目标是让页面结构、路由、overlay、session、状态规则、token、motion 和 effect planning 的常规修改只发生在 Reader-UI。iOS、Android、HarmonyOS 升级同一版本依赖后自动获得相同 transition/effects，不再逐端手写同一 reducer 分支。

“Host 零手调”成立的范围：

- 使用已注册的 ComponentType、token、motion、CoreCommand 和 HostRequest。
- 修改现有页面树、文案、显隐、顺序、状态规则、路由和已支持交互。
- 复用现有 renderer 与 Host Adapter 能力。

仍需 Host 一次性扩展的范围：

- 新的原生组件 primitive 或平台专属系统控件。
- 新的系统能力、权限、后台模式、WebView 能力或设备 API。
- 依赖平台测量结果的排版算法、复杂手势、accessibility 与性能专项。

扩展必须落在 renderer/adapter registry，不得回到逐页面分叉 reducer。

## 2. 三层产物

```text
contracts + ui-spec
  -> canonical ids, state, view tree, action descriptors

tools/codegen + tools/runtime
  -> deterministic Swift / Kotlin / ArkTS outputs

packages
  -> ReaderUIRuntime for native hosts
  -> reference JavaScript runtime as executable oracle
```

目录：

- `ui-spec/runtime-actions.schema.json`：action descriptor 的语法与允许操作。
- `ui-spec/runtime-actions.json`：当前 canonical event -> state transition/effects。
- `ui-spec/runtime-payload-contracts.json`：已接入 Core 的 event -> Core DTO typed payload registry；字段名直接采用 Core DTO，不维护 UI alias。
- `contracts/fixtures/runtime-payload-contract.fixtures.json`：typed payload 的 valid / missing / unknown / wrong nested 与语义边界 fixtures。
- `packages/reference/reader-ui-runtime.mjs`：可执行语义 oracle。
- `packages/swift/ReaderUIRuntime`：SwiftPM target `ReaderUIRuntime`。
- `packages/kotlin/reader-ui-runtime`：Gradle module `:reader-ui-runtime`。
- `packages/arkts/reader-ui-runtime`：HAR/source module 与 ohpm package `reader_ui_runtime`。
- `tools/runtime/generate-runtime.mjs`：reference 与三端 action table、typed payload registry、parity fixtures 的唯一生成入口。
- `tools/runtime/check-runtime-payload-source.mjs`：校验 registry 所绑定的 Core DTO / sync / storage 源文件 SHA-256；Core 变更后必须先审查 DTO，再显式 `--update`。

HarmonyOS 的 HAR 由消费方工程以 module mode 编译和执行 parity tests：`assembleHar --mode module -p module=reader_ui_runtime@default` 产出 HAR，`test --mode module -p module=reader_ui_runtime@default` 执行 Hypium。Reader-UI 根目录本身没有完整 DevEco project-level `hvigor-config.json5`，因此不能脱离消费方工程直接启动 hvigor。

## 3. 运行时职责

ReaderUIRuntime：

- 接收 canonical UiEvent 与 lossless recursive JSON payload；object、array、number、boolean、null 保持原生类型。
- Swift/Kotlin 保留 string-map 输入兼容入口；effect 的 canonical 真源为 `jsonPayload: JSONValue`。deprecated `payload` 继续保持三端旧 string-map API 与 W2 标量字符串行为，object/array/null 只在 `jsonPayload` 中保留，不做 stringify，并通过 `legacyPayloadIsComplete=false` 标明 legacy 投影不完整。
- Swift/Kotlin/ArkTS 提供 additive `accept*JSONResult` 回送入口；旧 primitive callback 暂时保留，reference JS 的现有 result-object 入口直接执行递归 JSON 校验。
- 校验 required payload、async guard、overlay guard；进入已登记的 Core compatibility 纵切时，还会递归拒绝缺字段、未知字段、错误嵌套类型与非法语义组合。
- typed payload 的整数 wire subset 固定为 IEEE-754 safe integer（`-9007199254740991...9007199254740991`），避免 Swift/Kotlin/ArkTS/JavaScript 在 JSON 边界产生精度分叉。
- 产生确定性 UiState transition。
- 产生有 correlationId 的 Core/Host effects。
- 对未知 event/action fail closed。
- 对循环引用、非有限数字、字段类型错误或非 JSON 对象等非法 payload/result fail closed；stale correlation 仍按协议无副作用丢弃。

Host coordinator：

- 不重复实现 action table。
- 把 UiEvent dispatch 到 runtime。
- 顺序或并行执行 effects，并把结构化 CoreEvent/HostResult 回送。
- 把 runtime state 暴露给 native renderer。

Native renderer：

- 通过 ComponentType registry 渲染 ViewState。
- 持有 drag offset、scroll position、layout measurement、pressed/text selection、accessibility focus 等 EphemeralState。
- 不修改 DomainState，不复制共享 UiState 真源。

## 4. `book.open` 决策

Core 不新增原子 `book.open`。该事件由 UI runtime 编排现有能力：

```text
source.detail
  -> chapter.list
  -> content.load
  -> reader.location.resolve
```

runtime 立即进入 `immersive-reading`、进入 loading，并以同一 correlationId 串行执行：remote 为 `source.detail → chapter.list → content.load → awaiting-layout → reader.location.resolve`，local 从 `chapter.list` 开始。正文结果后必须等待 renderer 提供真实 layout，不能并发四个 effect。只有未来 Core 真正拥有可恢复的原子阅读会话时，才重新评估 Core 命令。

## 5. 当前覆盖与迁移阶段

当前 2.5.0 action table 包含 61 条 action，覆盖 P0 navigation、main tab、overlay、reader enter/exit/page、TTS/auto-page 互斥、reduced motion、source switch、sync/WebDAV、result-dependent `book.open` 编排，以及 W1/W3/W4/W5/RSS/Sync 的 Core/Host effect plan。三端 consumer lock 已统一到 2.5.0 / HostRequest schema 1.2.0 / runtime hash `0ac249341d8de651314687d8352bc1c3f62d3778371ff500f1f0a025a64be82c`。35 条 covered event 中，directory 2 + `book.open` 1 + TTS 2 + auto-page 2 为 Pilot；page 2 + import 3 + source-switch 6 + replace 3 + RSS 7 + Sync 7 共 28 条保持 Shadow。剩余 26 条 action 仅 staging，不能计入生产接线。

generated/runtime-coverage.json 是 270 条 canonical UiEvent 的强制 ownership 报告：当前 61 条已实现、202 条 runtime/split planned、7 条原生 ephemeral。它由 ui-spec/runtime-ownership.json 生成；canonical event 数或 action 数变化会使 release gate 失败，直到 ownership 和覆盖预期被显式更新。

这不是全量 UiEvent 覆盖。Host 迁移采用以下 gate：

1. Shadow：本地 reducer 仍主写；同一事件同步送入 runtime，比较 route/overlay/session/effects。
2. Pilot：P0 已覆盖 event 由 runtime 主写，本地 reducer 只处理未覆盖 event。
3. Authoritative：目标 workflow 的本地重复分支删除，runtime 成为唯一 UiState owner。
4. Full registry：所有可共享 event 纳入 spec；平台只保留 renderer、ephemeral state、bridge、adapter。

任何阶段都必须公开 runtime 覆盖率和 fallback 命中，不得用“已接入”替代全量覆盖证明。

R8 的首个 Pilot 是 reader.directory.open 与 reader.directory.close 成对 cohort。其 projection、exactly-once、fail-closed 和目录数据门禁定义在 ui-spec/RUNTIME_DIRECTORY_PILOT_PROTOCOL.md；book.open 的串行准入见 ui-spec/RUNTIME_BOOK_OPEN_TRANSACTION_PROTOCOL.md。当前 Pilot 还包含已通过三端单元/构建验证的 `book.open`、TTS 与 auto-page；page 仍为 Shadow。import/source-switch/replace/RSS/Sync 虽已有 descriptor 与 experimental seam，但生产入口/Core DTO 或事务语义未闭合，已明确回退为 Shadow。任何 Pilot 都不能替代物理设备 proof，也不等于 Authoritative。

### 5.1 Lossless typed payload/result 与 Core compatibility 纵切

R14.1 已为 61/61 actions 定义严格 lossless payload contract，并提供 170 个 payload fixtures、70 个 result mappings 与 142 个 result fixtures；reference、Swift、Kotlin、ArkTS 对 nested object/array/null/number/bool 使用同一语义，unknown field、unsafe integer、错误 effect variant 均 fail closed。61 条按责任分为 23 internal、20 Core、10 composite、8 runtime-owned。以下表格保留最早的 13 条 Core compatibility 纵切，rollout 仍保持 Shadow；typed 校验通过不等于 Host 已切换为 Pilot 或 Authoritative：

| UiEvent | CoreCommand | 关键 fail-closed 约束 |
| --- | --- | --- |
| `source.switch.confirm` | `source.switch.commit` | W3 commit DTO 全字段、TOC 非空、安全整数 |
| `source.switch.rollback` | `source.switch.rollback` | 完整 rollback token；ReadingProgress 的非空 nullable id/revision |
| `reader.replace.apply` | `replace.apply` | Core apply DTO、target enum |
| `reader.replace.create` | `replace.persist` | `operation=create`、pattern 非空、regex 可编译、title/content 至少一个 scope |
| `reader.replace.validate` | `replace.validate` | validate 请求只校验 DTO 形状；无效 regex 仍可送 Core 获取验证结果 |
| `rss.refresh` | `rss.feed.refresh` | subscriptionId 非空、安全整数时间戳 |
| `rss.subscription.add` | `rss.subscription.persist` | `operation=create` 与 create params exact shape |
| `rss.subscription.edit` | `rss.subscription.persist` | `operation=update` 与 update params exact shape |
| `rss.subscription.delete` | `rss.subscription.remove` | subscriptionId 非空 |
| `rss.entry.open` | `rss.entry.read` | 显式 read 语义固定为 `true` |
| `rss.favorite.add` | `rss.favorite.persist` | subscriptionId/guid 非空；addedAt 为非负安全整数；拒绝旧 `entryId` alias |
| `rss.favorite.remove` | `rss.favorite.remove` | subscriptionId/guid 非空；拒绝旧 `entryId` alias |
| `sync.conflict` | `sync.conflict.detect` | exact snapshot/record；live record payload 非空，tombstone 可空 |

每个事件至少覆盖 valid、missing、unknown、wrong nested/field type 四类 fixture；canonical `ui-event.fixtures.json` 中同一批 13 个旧事件也必须携带完整 Core DTO，禁止继续使用缩写 payload 或 UI 自定义别名。RSS favorite 另锁定 whitespace、负数与超出 safe-integer wire subset 的拒绝行为。

## 6. 变更传导

```bash
node tools/codegen/generate.mjs
node tools/runtime/generate-runtime.mjs
node tools/runtime/check-runtime-payload-source.mjs
node tools/runtime/generate-runtime-coverage.mjs --check
npm test --prefix contracts/tests
swift test --disable-sandbox
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
  ../Reader-for-Android/gradlew -p . :reader-ui-runtime:test
```

发布/升级顺序：

1. 修改 schema/spec/fixtures。
2. 重生成 contract 与 runtime action tables。
3. reference、Swift、Kotlin、ArkTS 静态/编译测试通过。
4. bump `contracts/VERSION.json`，同步 package 版本。
5. 三端 consumer lock 升级到完全相同版本。
6. 三端 compile + parity test。
7. simulator/device workflow proof；设备不可用时单独记录为 blocked，不能被结构矩阵替代。

每个 Host 根目录必须提交 `READER_UI_CONSUMER.json`。`node tools/runtime/check-host-consumers.mjs` 同时校验版本、runtime action SHA-256、covered event、依赖声明与 shadow/pilot/authoritative 阶段，防止 Host 仍引用旧 UI 语义。

rollout.mode 是该 Host 的默认阶段；可选 rollout.cohorts 为不可重叠的逐事件 override。这样目录可以先处于 Pilot，而 book.open、TTS、auto-page 仍保持 Shadow；cohort event 必须同时列入 coveredEvents，CI 会拒绝重复、未知或未覆盖 event。

Reader-UI 自带 Gradle wrapper 与 `.github/workflows/ui-runtime.yml`。PR/main 会独立编译 Node/Swift/Kotlin；`v<contracts/VERSION.json>` tag 还会校验 tag-version 一致并产出三端 consumer source artifact。Host CI 必须 checkout lock 指定版本的 Reader-UI，再执行本端 consumer gate 与编译测试。

配置仓库 secret `READER_HOST_SYNC_TOKEN` 后，Reader-UI 的 `v<version>` tag 验证通过会向三个 Host 发送 `reader-ui-updated` repository dispatch（携带精确 tag、version、runtime action hash）。未配置 secret 时 workflow 明确记录 skip，不伪装为已通知；各 Host 的 dispatch workflow 必须 checkout 精确 tag，再执行 lock 与本端编译，才构成自动跟随闭环。

## 7. 完成定义

一个 workflow 只有同时满足以下条件才可标记 runtime 迁移完成：

- action/spec 与 canonical enum 无漂移。
- reference + 三端 runtime golden semantics 一致。
- 三端没有该 workflow 的重复 reducer 真源。
- Core/Host effects 有真实 executor，不是仅返回 success/nil。
- native renderer 完成 default/loading/empty/error/offline/permission 状态。
- simulator/device 证据独立通过；无法运行的真实设备 gate 明确阻塞原因。
