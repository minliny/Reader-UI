# Reader UI Contract 验收门槛

本文档逐项回答 [CONTRACT_FIRST_NATIVE_UI_PLAN.md](./CONTRACT_FIRST_NATIVE_UI_PLAN.md) §10 合并门槛 7 问，
标注 Reader UI 仓库范围内的完成度与剩余缺口。

Reader UI 仓库是 UI Contract 与平台无关 Executable UI Runtime 的源。验收范围包括：
- `contracts/` 下的 schema、fixtures、tests
- `tools/codegen/` 的 codegen 脚本
- `generated/` 下的三端生成类型
- `ui-spec/`、`tools/runtime/` 与 `packages/{swift,kotlin,arkts,reference}`
- `frontend-demo-optimized/verify/contract/` 的 demo 一致性校验

## §10 合并门槛 7 问

### 1. 这个状态属于 DomainState、UiState 还是 EphemeralState？

- **DomainState**：归 `Reader-Core-Native`，由 `core-command` / `core-event` / `progress-location` / `content` / `sync-conflict` schema 定义形状
- **UiState**：归 ReaderUIRuntime，由 `ui-state` schema 与 runtime actions 定义/执行；三层状态归属见 [STATE_OWNERSHIP.md](./STATE_OWNERSHIP.md)
- **EphemeralState**：归 Native UI，不进入本仓 schema（dragOffset、scrollPixel、layoutMeasurement 等）

ReaderUIRuntime 持有共享的确定性 UiState 实例；Host 只持有 EphemeralState 与平台对象。

### 2. 是否已经进入 schema？

**Phase 1 契约基础（6 schema）**：
- ✓ `route.schema.json` —— 260 个 RouteId
- ✓ `ui-event.schema.json` —— 300 个 UiEventType
- ✓ `ui-state.schema.json` —— 9 必填字段 + 派生状态
- ✓ `view-state.schema.json` —— 174 个 ComponentType
- ✓ `motion.schema.json` —— 95 个 MotionId
- ✓ `token.schema.json` —— 14 个 TokenCategory

**Phase 2 Core bridge 规划契约（7 schema）**：
- ✓ `core-command.schema.json` —— 72 个 CoreCommandType
- ✓ `core-event.schema.json` —— 95 个 CoreEventType
- ✓ `host-request.schema.json` —— 58 个 strict HostRequestType
- ✓ `host-result.schema.json` —— 与 HostRequest 同序的 58 个 strict success result
- ✓ `progress-location.schema.json` —— Locator + ProgressSource
- ✓ `content.schema.json` —— Block 模型（8 种 BlockType）
- ✓ `sync-conflict.schema.json` —— 5 种冲突类型 + 5 种 resolution

**Phase 1 收尾（1 schema）**：
- ✓ `state-rule.schema.json` —— 5 种 kind（mutex / async-guard / required-with / forbidden-with / transition-guard）

**Phase 1-2 Motion Runtime（1 schema）**：
- ✓ `motion-policy.schema.json` —— MotionPolicy 规则表 + ReaderMotionResolver 输入契约，覆盖 12 个 operation

**R18 Device Conformance（2 schema）**：
- ✓ `device-conformance-plan.schema.json` —— 三端 3 × 58 确定性执行计划
- ✓ `device-conformance-evidence.schema.json` —— source/manifest/device/type/artifact 逐项证据与 fail-closed 汇总

**Platform Slice Evidence（1 schema）**：
- ✓ `platform-evidence-manifest.schema.json` —— Slice 0–12 exact-set 登记、可信 release identity、测试/artifact/gate 与 `passed` fail-closed；模板登记不构成执行证据

**辅助验证边界（3 schema）**：
- ✓ `appearance.schema.json` —— Reader 2 AppearanceSpec
- ✓ `design-delta.schema.json` —— Figma/Reader-UI/Core/Host 变更批次与发布事务
- ✓ `product-capability.schema.json` —— 项目能力四层交付矩阵

当前合计 22 个 schema、1333 项可扫描 fixtures；其中 platform evidence fixture 是 Slice 0–12 的 planned 空白模板，不增加任何平台完成分子。

**FFI 协议**：
- ✓ `ffi-protocol-version.md` —— FFI 协议版本 1.0.0

### 3. 三端生成类型是否通过？

**（15 个 native-codegen contract + ScreenGraph）× 3 端 = 48 个 generated 代码文件**：
- ✓ `generated/swift/` —— 16 个 .swift 文件（含 `Appearance.swift` / `MotionPolicy.swift` / `ScreenGraph.swift`）
- ✓ `generated/kotlin/` —— 16 个 .kt 文件（含 `Appearance.kt` / `MotionPolicy.kt` / `ScreenGraph.kt`）
- ✓ `generated/arkts/` —— 16 个 .ets 文件（含 `Appearance.ets` / `MotionPolicy.ets` / `ScreenGraph.ets`）

校验方式：
- `node --test contracts/tests/codegen-consistency.test.mjs` —— 校验三端 generated 文件的 enum 值与 schema 一致
- `node tools/codegen/generate.mjs` —— 可重复生成，不依赖本机绝对路径
- `node tools/codegen/check-drift.mjs` —— 重新生成并校验 generated 与 schema / fixtures 无漂移

### 4. reducer 是否有 golden test？

**Reader UI 仓库范围内**：已提供 reference/Swift/Kotlin runtime golden tests；ArkTS 通过消费方 HAP harness 执行 parity tests。

Reader UI 提供 `state-rule.fixtures.json`（16 项）与 `runtime-actions.json`（67 条 action，其中 7 Pilot、28 Shadow、32 staging-only）。三端还必须保留本端 renderer/bridge/HostAdapter 测试；Pilot 或 Shadow rollout 不能等同 production authority。

当前 `state-rule.fixtures.json` 覆盖：
- overlay 互斥
- activeSession 互斥
- loading async guard（禁止 route 切换）
- overlay async guard（禁止 tab 切换）
- TTS/auto-page session 互斥
- readerMode 转移限制
- overlay 转移限制（经 null 中转）
- 首次开屏 async guard
- 搜索 loading async guard
- sync loading async guard
- error 与 pageState 关联

### 5. UI 是否只渲染 ViewState？

**Reader UI 仓库范围内**：`view-state.schema.json` 定义了 174 个 ComponentType，覆盖 AppShell、main tabs、bookshelf→reader、reader overlay、session、focus、RSS、source、search、sync、conflict、offline 链路。

三端 Native UI 是否只渲染 ViewState，由各端仓库自验。Reader UI 仓库通过 `view-state.fixtures.json`（190 项，覆盖 184 个 unique direct route；另有 76 个 alias）提供可渲染状态样本，260/260 route graph 均可解析，三端可作为渲染输入。`260 graph resolvable` 不等于三端 native renderer 已完成；新增 24 个 route 的 30 个项目能力事件仍为 planned/fail-closed。

### 6. 是否绕过了 Core 或 Host Adapter？

**Reader UI 仓库范围内**：不绕过。

- Core 业务事实源由 `Reader-Core-Native` 持有，本仓 `core-command` / `core-event` / `progress-location` / `content` / `sync-conflict` schema 只定义 Reader UI 侧 Core bridge 规划形状，不实现业务逻辑
- `CoreCommand` / `CoreEvent` 不等于 Reader-Core-Native 当前协议已经完全对齐；后续仍需 Core bridge mapping / 协议收敛，把契约项逐项映射到真实 Core 命令、事件、错误与 Host 边界
- Host Adapter 能力由三端实现，本仓 `host-request` schema 只列能力清单 enum，不实现平台调用
- `ffi-protocol-version.md` 只描述 FFI 入口形状，不写 Rust 代码

### 7. 是否会造成三端行为漂移？

**Reader UI 仓库范围内**：通过契约约束降低漂移风险。

- 三端从同一套 schema 生成类型，schema breaking change 会触发三端编译或测试失败
- `state-rule.fixtures.json` 定义统一的状态约束，三端 reducer 必须遵守
- `motion-policy.fixtures.json` 定义统一的 motion 选择规则，三端通过同一套 generated resolver 解析 MotionId
- `phase1-slice.test.mjs`（40 项）校验 6 个优先链路（Slice 1-6）在 fixtures 中的覆盖完整
- `demo-consistency.test.mjs`（6 项）校验 frontend-demo-optimized 与 schema 的一致性：route/token unknown 必须为 0，motion unknown 必须为 schema 命中或 `demo-contract-exceptions.json` 中的 explicit alias/deprecated/exception；当前计数以脚本生成的 baseline 与 machine report 为准
- `matrix-coverage.test.mjs` / `motion-guard.test.mjs` / `motion-policy.test.mjs` / `motion-resolver.test.mjs` / `token-group.test.mjs` / `core-host-boundary.test.mjs` 校验 P0 矩阵、motion guard、MotionPolicy / Resolver、token 分组、Core/Host 边界引用一致性

剩余风险：
- 三端 reducer 实现可能对同一 StateRule 有不同解释（需 Phase 3 golden test 验证）
- 三端 MotionAdapter 仍需在平台仓库证明 native animation、reduced-motion、interrupt/back stack 与设备行为一致；本仓只提供 contract / resolver
- demo 中仍由 explicit alias/deprecated/exception 批准的 motion-like id，需后续按产品与契约决策逐步补入 schema、归一化或删除例外；批准清单不等于 0 drift，具体数量以 machine report 为准

## 当前完成度汇总

| 阶段 | 状态 | 仓库范围 |
|---|---|---|
| Phase 0 架构冻结 | ✓ 完成 | Reader UI/contracts |
| Phase 1 契约基础 | ✓ 完成（6 schema + codegen + tests + Slice 1-6 fixtures + StateRule） | Reader UI |
| Phase 2 Core bridge 规划契约 | ✓ Reader UI 侧完成（7 schema + codegen + tests + FFI 协议）；跨仓 Core bridge mapping / 协议收敛未完成 | Reader UI + Reader-Core-Native |
| Phase 1-2 Motion Runtime | 基础 registry / policy / resolver 已完成；筛选、批量选择、文本选择、危险确认与 tooling 模式切换已完成逐项状态审计，当前 canonical exact 为 89/95。其余 6 项均不属于当前生产路径：3 个 `controlSpace.*` contract-reserved，3 个 combined/source-switch 兼容 ID 已 deprecated；不存在未分类的 active MotionSpec。P0 47 项中 45 项 exact，另两项 controlSpace 为 contract-reserved。真实 Demo 已通过 stepper 快速 redirect、slider pointer / keyboard、自动亮度 toggle、button activate、discover chip、card press/select/route、source-switch listRow 与 reduced-motion 浏览器验收，并修复恢复卡片与书源候选行被 `state.content.replace` 覆盖的 selector 优先级问题。双 dropdown redirect / 自动 reposition 仍无真实同屏消费者；Figma timeline、平台 MotionAdapter / navigator 接入与设备证据均未完成 | Reader UI + platforms |
| P0 可执行参考规格 | ✓ 完成（PAGE_REFERENCE + TOKEN_SPEC + MOTION_SPEC + CORE_HOST_BOUNDARY） | Reader UI |
| 完整矩阵 | ✓ 完成（ROUTE_COMPONENT_MATRIX：route × component × state × motion × token） | Reader UI |
| 三端开发切片 | ✓ 计划完成（SLICE_PLAN：正式 Slice 0–12 启动顺序、Core/Host 前置、三端交付物、并行/串行与验收）；Slice 9–12 实现未因此完成 | Reader UI |
| 验收和防漂移机制 | ✓ 本仓 schema/模板/脚本完成（含 Slice 0–12 manifest fail-closed）；三端真实 tests/artifact/device evidence 仍归平台仓库 | Reader UI + platforms |
| Phase 3 三端 reducer 落地 | 进行中（平台仓负责；Android / iOS 已有局部 reducer/golden evidence，HarmonyOS reducer/store 工作已开放；完成度以各端 gap matrix 和 evidence 为准） | iOS / Android / HarmonyOS |
| Phase 4 Host Adapter 补齐 | 进行中/部分证明（平台仓负责；Android / iOS 已有部分 Host Adapter / Core bridge executor proof，HarmonyOS NAPI / Host Adapter 工作已开放；仍需跨端 App/device proof） | iOS / Android / HarmonyOS |
| Phase 5 一致性验证 | 部分（Reader UI contract 防漂移测试 ✓；Slice 8 既有主链与 Slice 9–11 分域 evidence 尚需平台收口，Slice 12 全产品 Release Gate 未关闭） | 跨仓 |

## P0 可执行参考规格文档清单

| 文档 | 覆盖 | 状态 |
|---|---|---|
| [PAGE_REFERENCE.md](./PAGE_REFERENCE.md) | Slice 1-6 P0 route 的页面结构 / 组件树 / 状态归属 [C]/[R]/[E] / 入口返回 overlay keyboard 行为 | ✓ 完成 |
| [TOKEN_SPEC.md](./TOKEN_SPEC.md) | 10 个语义 token 分组 + 三端 TokenAdapter 映射规则 + raw 值禁止检查口径 | ✓ 完成 |
| [MOTION_SPEC.md](./MOTION_SPEC.md) | 47 个 P0 MotionId 触发/结束/打断/reduced-motion + 手势阈值 + 拖拽边界 + 焦点恢复 + system back + 键盘 inset + demo 等价性边界 | ✓ 完成 |
| [CORE_HOST_BOUNDARY.md](./CORE_HOST_BOUNDARY.md) | 业务域归属表 + UiEvent→CoreCommand 映射 + 当前 58 项 HostRequest 机器分母 + 平台持久化禁令 | ✓ Reader-UI 合同侧完成 |
| [ROUTE_COMPONENT_MATRIX.md](./ROUTE_COMPONENT_MATRIX.md) | 全量 RouteId × Shell × mainTab + ComponentType × Shell + PageState × Route + Route × MotionId + Route × Token 分组 | ✓ 完成 |
| [SLICE_PLAN.md](./SLICE_PLAN.md) | 正式 Slice 0–12 启动顺序 + 输入 + Core/Host 前置 + 每端 iOS/Android/HarmonyOS 交付物 + 并行/串行 + 验收 | ✓ 计划完成；实现另验 |
| [PLATFORM_EVIDENCE_SPEC.md](./PLATFORM_EVIDENCE_SPEC.md) | Slice 0–12 每端 evidence bundle + manifest schema + 防漂移/传导 + template 与 passed 边界 | ✓ 本仓机制完成；平台证据另验 |
| [platform-evidence-manifest.schema.json](./platform-evidence-manifest.schema.json) | 三端 Slice exact-set、release identity、coverage、gates、tests、artifact 与 fail-closed | ✓ schema/fixture/test 完成 |

## 测试与校验入口

```bash
# 全量契约测试
node --test contracts/tests/*.test.mjs
# 当前结果以本命令输出为准；不要在文档中固化易漂移的测试总数

# fixtures 校验
node contracts/tests/validate.mjs

# codegen 重生成
node tools/codegen/generate.mjs

# demo 一致性校验
node frontend-demo-optimized/verify/contract/verify-demo-contract-consistency.mjs

# P0 四仓链路矩阵
node frontend-demo-optimized/verify/verify-p0-chain-matrix.mjs

# canonical demo motion coverage
node frontend-demo-optimized/verify/motion/verify-motion-coverage.mjs
```

## 版本

见 [VERSION.json](./VERSION.json)。当前 Reader-UI Contract head 为 3.1.0；三个 Host consumer lock 仍为 2.5.1。
