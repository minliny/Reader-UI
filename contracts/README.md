# Reader UI Contracts

本目录是 Reader 多端 UI 契约源入口，用于把现有 `frontend-demo-optimized/`
route/motion/token/state 资料升级为机器可读契约。

当前架构不复用 Web/CSS/DOM；它用 Executable UI Spec 共享确定性 reducer/effects，并由三端原生 renderer 绘制：

```text
Reader-Core-Native
  -> 业务事实源

Reader UI Executable Spec
  -> contract schema + runtime-actions + Swift/Kotlin/ArkTS packages

Native Renderer + Thin Coordinator
  -> SwiftUI / Compose / ArkUI + Core/Host effect execution

Host Adapter
  -> HTTP / WebView / Cookie / 文件 / 权限 / TTS / 后台任务

Native UI
  -> SwiftUI / Compose / ArkUI 渲染 ViewState，发送 UiEvent
```

## 规划入口

- [../docs/READER_PRODUCT_EXECUTION_BASELINE_2026-07-19.md](../docs/READER_PRODUCT_EXECUTION_BASELINE_2026-07-19.md) —— 全产品、Figma、Reader-UI、Core、三端、evidence 与发布的唯一执行顺序和统一状态口径
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [../EXECUTABLE_UI_RUNTIME.md](../EXECUTABLE_UI_RUNTIME.md)
- [CONTRACT_FIRST_NATIVE_UI_PLAN.md](./CONTRACT_FIRST_NATIVE_UI_PLAN.md) —— 2.1 以前的历史迁移规划
- [ACCEPTANCE.md](./ACCEPTANCE.md) —— §10 合并门槛 7 问逐项回答
- [COMPLETE_APP_CLOSURE_WORKBREAKDOWN.md](./COMPLETE_APP_CLOSURE_WORKBREAKDOWN.md) —— Reader UI / Core / 三端拆分后的闭环工作单
- [FULL_PRODUCT_CAPABILITY_DELIVERY_MATRIX.md](./FULL_PRODUCT_CAPABILITY_DELIVERY_MATRIX.md) —— 区分当前合同全量与项目能力全量；Slice 9–12 已升级为正式跨仓施工范围
- [SLICE_PLAN.md](./SLICE_PLAN.md) / [PLATFORM_EVIDENCE_SPEC.md](./PLATFORM_EVIDENCE_SPEC.md) —— Slice 0–12 依赖、三端交付物与 evidence 门禁
- [design-delta.schema.json](./design-delta.schema.json) —— 冻结 Figma 批次、影响集、兼容策略、四端证据与发布事务的机器校验入口

## 已交付清单

### Schema（22 个）

| 阶段 | Schema | 说明 |
|---|---|---|
| Phase 1 | route / ui-event / ui-state / view-state / motion / token | UI 契约基础 6 schema |
| Phase 2 | core-command / core-event / host-request / host-result / progress-location / content / sync-conflict | Core bridge 与 Host 双向 wire 契约 7 schema |
| Phase 1 收尾 | state-rule | 状态归属与转移约束（5 种 kind） |
| Phase 1-2 Motion Runtime | motion-policy | MotionPolicy 规则表 + ReaderMotionResolver 输入契约 |
| R18 device conformance | device-conformance-plan / device-conformance-evidence | Host58 三端逐项计划、可信 release/device/artifact 证据与 fail-closed 验证 |
| Platform slice evidence | platform-evidence-manifest | Slice 0–12 三端登记、可信 release identity、测试/artifact/gate 与 `passed` fail-closed |
| Reader 2 Appearance | appearance | 主题、字体、选择项和步进器的单一跨端配置源 |
| Design intake | design-delta | 冻结 Figma revision、D0-D4 影响集、兼容/回滚、Host 证据和发布要求 |
| Product capability | product-capability | 项目能力到 Figma、Reader-UI、Core/Host、原生 Host 的分层交付与验收状态 |

### Fixtures（1333 项）

- Phase 1：route 247 / ui-event 188 / ui-state 43 / view-state 183 / motion 95 / token 269
- Phase 2：core-command 49 / core-event 35 / host-request 58 / host-result 58 / progress-location 6 / content 3 / sync-conflict 6
- Phase 1 收尾：state-rule 16
- Phase 1-2 Motion Runtime：motion-policy 53
- Reader 2 Appearance：appearance 1
- Design intake：design-delta 1
- Product capability：product-capability 1（24 个能力条目）
- Platform slice evidence：platform-evidence-manifest 1（Slice 0–12 空白登记模板，不是执行证据）

Slice 覆盖：业务 fixtures 按 `_comment` 标注 Slice 1–6，覆盖 6 个优先链路
（AppShell / main tabs / bookshelf→reader / reader overlay / session·focus / RSS·source·search / sync·conflict·offline）；platform evidence template 另以 exact-set 登记正式 Slice 0–12，但不增加任何平台完成分子。

### Generated（48 个 =（15 个 native-codegen contract + ScreenGraph）× 3 端）

22 个 contract schema 中，R18 的 2 个 device-conformance schema、platform-evidence-manifest、host-result、design-delta、product-capability 与 control-identity 是验证/证据边界；当前原生 enum/model codegen 仍以 15 个 contract schema（含 Reader 2 AppearanceSpec）加 ScreenGraph 为输入。

- `generated/swift/` —— 16 个 .swift 文件
- `generated/kotlin/` —— 16 个 .kt 文件
- `generated/arkts/` —— 16 个 .ets 文件
- `Motion.*` 包含 95 条 canonical motion fixtures 的 registry；89 个当前生产 MotionId 已带精确结构化状态机字段，其余 6 个严格限定为 3 个 contract-reserved `controlSpace.*` 与 3 个 deprecated 兼容 ID。
- `MotionPolicy.*` 包含 53 条显式 policy、`RouteShellLookup`、registry、带 no-match diagnostic 的 resolver；未知请求不再映射到 interrupt fallback。
- `Token.*` 包含 269 条 token fixtures 的 registry。
- `Appearance.*` 与 `frontend-demo-optimized/appearance-spec.js` 由同一 fixture 生成，承载 Reader 2 的主题、字体、选择项和步进器配置。

入口：`node tools/codegen/generate.mjs`，无本机绝对路径依赖，可重复生成。

### Tests（以 `npm test` 当前输出为准）

| 测试文件 | 项数 | 覆盖 |
|---|---|---|
| contract.test.mjs | — | Phase 1 schema 自检 + fixtures 校验 |
| phase2-contract.test.mjs | — | Phase 2 schema + fixtures + §5/§7 对齐 |
| phase1-slice.test.mjs | 40 | 6 个优先链路 Slice 1-6 覆盖 + 过渡连续性 |
| state-rule.test.mjs | — | StateRule schema + fixtures + 关键规则 |
| codegen-consistency.test.mjs | — | 三端 generated enum 一致性 + drift check |
| codegen-idempotent.test.mjs | 6 | codegen 可执行性 + 48 个 generated 文件幂等性 |
| screen-graph.test.mjs | 33 | 247-route graph、97 canonical bindings（41 executable runtime payload + 56 planned/fail-closed，61 explicit target）/ 19 state evidence / 6 action gaps、authority/composition semantics、三语言 registry 与 fail-closed |
| device-conformance-kit.test.mjs | 9 | 三端 174 项计划、可信 identity/artifact、低 tier/伪证据拒绝 |
| registry-codegen.test.mjs | 8 | MotionSpecRegistry / TokenRegistry 三端输出、fixture 关键项、token refs、guardRules、reducedMotion、value registry 覆盖 |
| motion-policy.test.mjs | 14 | MotionPolicy schema / fixtures / motionId 引用 / operation 覆盖 / no-match diagnostic / 示例 policy |
| motion-resolver.test.mjs | 28 | ReaderMotionResolver route、tab、overlay、reader surface、drag、session、orientation、优先级、no-match diagnostic 与纯函数行为 |
| demo-consistency.test.mjs | 6 | frontend-demo-optimized 与 schema 一致性 baseline + explicit exception policy |
| matrix-coverage.test.mjs | 5 | P0 route token/motion matrix + MotionId / token group 引用一致性 |
| motion-guard.test.mjs | 19 | 47 个 P0 MotionId + 95 个 schema MotionId fixture、token refs、guardRules、89 个 active MotionId 的结构化状态机字段与 6 个非生产豁免 exact-set |
| token-group.test.mjs | 5 | TOKEN_SPEC 语义分组、fixtures 引用、route token group 一致性 |
| core-host-boundary.test.mjs | 4 | Core/Host 边界域归属、UiEvent/CoreCommand/HostRequest schema 引用一致性 |
| design-delta.test.mjs | 5 | frozen revision、精确合同引用、D3/D4 milestone、wire migration 与安全路径 |
| product-capability-coverage.test.mjs | 5 | 24 项产品能力分母、Route/UiEvent 引用、四层状态与证据边界 |
| platform-evidence-manifest.test.mjs | 6 | Slice 0–12 exact-set、三端模板、canonical route、依赖 DAG、template 防冒充与 execution `passed` fail-closed |
| planning-consistency.test.mjs | 8 | 规划分母、Slice 3/7、正式 Slice 9–12、evidence/README/ACCEPTANCE 与 Figma VC/MR 口径防漂移 |

### Demo 一致性校验

- 脚本：`frontend-demo-optimized/verify/contract/verify-demo-contract-consistency.mjs`
- Baseline：`frontend-demo-optimized/verify/contract/demo-contract-baseline.json`
- Exception policy：`frontend-demo-optimized/verify/contract/demo-contract-exceptions.json`
- 当前统计以校验脚本生成的 baseline 与 machine report 为准，不在说明文档中固化易漂移计数。
- 策略：route/token unknown 必须为 0；motion unknown 必须是 explicit alias/deprecated/exception，否则脚本失败。当前 machine report 的 unapproved unknown 为 0；批准过的 alias/deprecated/exception 仍按清单独立维护。

## 目录结构

```text
contracts/
  *.schema.json          # 22 个契约 schema
  fixtures/              # 1333 项可被 schema 扫描的 fixtures
  tests/                 # 31 个测试文件 + validate.mjs
  ACCEPTANCE.md          # §10 合并门槛 7 问
  VERSION.json           # 语义版本与 changelog

../ui-spec/
  runtime-actions.json
  host-consumer-lock.schema.json

../packages/
  reference/ swift/ kotlin/ arkts/

../tools/codegen/
  generate.mjs           # Node codegen 入口
  swift/ kotlin/ arkts/  # 各端模板

../generated/
  swift/ kotlin/ arkts/  # 三端生成类型

../frontend-demo-optimized/verify/contract/
  verify-demo-contract-consistency.mjs
  demo-contract-baseline.json
```

## 当前边界

- 本目录可以新增 schema、fixtures、contract tests 和 codegen 入口。
- 本目录不承载生产 UI，不实现 SwiftUI / Compose / ArkUI 页面。
- 本目录不实现 Reader-Core-Native 的业务协议。
- `core-command` 是 Reader UI 侧的 Core bridge 规划契约，不证明 Reader-Core-Native 当前协议已完全对齐。
- 后续仍需要在 Core bridge mapping / 协议收敛中把本契约逐项映射到 Reader-Core-Native 真实命令、事件与错误模型。
- 本目录实现平台无关的共享 reducer/effect runtime，但不得调用 SwiftUI / Compose / ArkUI 或平台 API。

平台仓库必须消费同版本 generated contract + ReaderUIRuntime；本地只保留 renderer、EphemeralState、bridge 和 Host Adapter。

## 测试与校验入口

```bash
# 全量契约测试
node --test contracts/tests/*.test.mjs

# fixtures 校验
node contracts/tests/validate.mjs

# codegen 重生成（drift check）
node tools/codegen/generate.mjs
node tools/runtime/generate-runtime.mjs
node tools/runtime/check-runtime-release.mjs

# demo 一致性校验
node frontend-demo-optimized/verify/contract/verify-demo-contract-consistency.mjs

# P0 四仓链路矩阵
node frontend-demo-optimized/verify/verify-p0-chain-matrix.mjs

# canonical demo motion coverage
node frontend-demo-optimized/verify/motion/verify-motion-coverage.mjs
```
