# Reader UI Contracts

本目录是 Reader 多端 UI 契约源入口，用于把现有 `frontend-demo/`
route/motion/token/state 资料升级为机器可读契约。

当前阶段的目标不是实现统一 UI runtime，也不是让三端复用 Web/CSS/DOM，而是支撑
Contract-first Native UI Architecture：

```text
Reader-Core-Native
  -> 业务事实源

Reader UI Contract
  -> route / state / event / motion / token / view-state schema + codegen

Platform Interaction Reducer
  -> iOS / Android / HarmonyOS 各自原生 reducer/coordinator

Host Adapter
  -> HTTP / WebView / Cookie / 文件 / 权限 / TTS / 后台任务

Native UI
  -> SwiftUI / Compose / ArkUI 渲染 ViewState，发送 UiEvent
```

## 规划入口

- [CONTRACT_FIRST_NATIVE_UI_PLAN.md](./CONTRACT_FIRST_NATIVE_UI_PLAN.md)
- [ACCEPTANCE.md](./ACCEPTANCE.md) —— §10 合并门槛 7 问逐项回答
- [COMPLETE_APP_CLOSURE_WORKBREAKDOWN.md](./COMPLETE_APP_CLOSURE_WORKBREAKDOWN.md) —— Reader UI / Core / 三端拆分后的闭环工作单

## 已交付清单

### Schema（14 个）

| 阶段 | Schema | 说明 |
|---|---|---|
| Phase 1 | route / ui-event / ui-state / view-state / motion / token | UI 契约基础 6 schema |
| Phase 2 | core-command / core-event / host-request / progress-location / content / sync-conflict | Core bridge 规划契约 6 schema |
| Phase 1 收尾 | state-rule | 状态归属与转移约束（5 种 kind） |
| Phase 1-2 Motion Runtime | motion-policy | MotionPolicy 规则表 + ReaderMotionResolver 输入契约 |

### Fixtures（676 项）

- Phase 1：route 76 / ui-event 143 / ui-state 43 / view-state 35 / motion 84 / token 117
- Phase 2：core-command 45 / core-event 33 / host-request 31 / progress-location 6 / content 3 / sync-conflict 6
- Phase 1 收尾：state-rule 13
- Phase 1-2 Motion Runtime：motion-policy 41（28 条 policy + 13 条注释项）

Slice 覆盖：fixtures 按 `_comment` 标注 Slice 1-6，覆盖 6 个优先链路
（AppShell / main tabs / bookshelf→reader / reader overlay / session·focus / RSS·source·search / sync·conflict·offline）。

### Generated（42 个 = 14 schema × 3 端）

- `generated/swift/` —— 14 个 .swift 文件
- `generated/kotlin/` —— 14 个 .kt 文件
- `generated/arkts/` —— 14 个 .ets 文件
- `Motion.*` 现在包含 84 条 canonical motion fixtures 的 `MotionSpecRegistry` / `motionSpecRegistry`，保留原有 MotionId enum。
- `MotionPolicy.*` 现在包含 28 条 motion policy、`RouteShellLookup`、`MotionPolicyRegistry` 与 `ReaderMotionResolver` / `resolveMotion` 纯函数。
- `Token.*` 现在包含当前 117 条 token fixtures 的 `TokenRegistry` / `tokenRegistry`，保留原有 TokenCategory enum。

入口：`node tools/codegen/generate.mjs`，无本机绝对路径依赖，可重复生成。

### Tests（215 项 / 0 fail）

| 测试文件 | 项数 | 覆盖 |
|---|---|---|
| contract.test.mjs | — | Phase 1 schema 自检 + fixtures 校验 |
| phase2-contract.test.mjs | — | Phase 2 schema + fixtures + §5/§7 对齐 |
| phase1-slice.test.mjs | 40 | 6 个优先链路 Slice 1-6 覆盖 + 过渡连续性 |
| state-rule.test.mjs | — | StateRule schema + fixtures + 关键规则 |
| codegen-consistency.test.mjs | — | 三端 generated enum 一致性 + drift check |
| codegen-idempotent.test.mjs | 6 | codegen 可执行性 + 42 个 generated 文件幂等性 |
| registry-codegen.test.mjs | 6 | MotionSpecRegistry / TokenRegistry 三端输出、fixture 关键项、token refs、guardRules、reducedMotion、value registry 覆盖 |
| motion-policy.test.mjs | 13 | MotionPolicy schema / fixtures / motionId 引用 / operation 覆盖 / fallback / 示例 policy |
| motion-resolver.test.mjs | 23 | ReaderMotionResolver route、tab、overlay、reader surface、drag、session、orientation、优先级与纯函数行为 |
| demo-consistency.test.mjs | 6 | frontend-demo 与 schema 一致性 baseline + explicit exception policy |
| matrix-coverage.test.mjs | 5 | P0 route token/motion matrix + MotionId / token group 引用一致性 |
| motion-guard.test.mjs | 15 | 40 个 P0 MotionId + 84 个 schema MotionId fixture、token refs、guardRules、6 个结构化字段完整性 |
| token-group.test.mjs | 5 | TOKEN_SPEC 语义分组、fixtures 引用、route token group 一致性 |
| core-host-boundary.test.mjs | 4 | Core/Host 边界域归属、UiEvent/CoreCommand/HostRequest schema 引用一致性 |

### Demo 一致性校验

- 脚本：`frontend-demo/verify/contract/verify-demo-contract-consistency.mjs`
- Baseline：`frontend-demo/verify/contract/demo-contract-baseline.json`
- Exception policy：`frontend-demo/verify/contract/demo-contract-exceptions.json`
- 当前 baseline：found=515 / unknown=111 / approved=111 / unapproved=0
- 策略：route/token unknown 必须为 0；motion unknown 必须是 explicit alias/deprecated/exception，否则脚本失败。当前不是 0 drift，后续 schema/demo 收敛时应递减 exception 清单。

## 目录结构

```text
contracts/
  *.schema.json          # 14 个契约 schema
  fixtures/              # 676 项 fixtures
  tests/                 # 14 个测试文件 + validate.mjs
  ACCEPTANCE.md          # §10 合并门槛 7 问
  VERSION.json           # 语义版本与 changelog

../tools/codegen/
  generate.mjs           # Node codegen 入口
  swift/ kotlin/ arkts/  # 各端模板

../generated/
  swift/ kotlin/ arkts/  # 三端生成类型

../frontend-demo/verify/contract/
  verify-demo-contract-consistency.mjs
  demo-contract-baseline.json
```

## 当前边界

- 本目录可以新增 schema、fixtures、contract tests 和 codegen 入口。
- 本目录不承载生产 UI，不实现 SwiftUI / Compose / ArkUI 页面。
- 本目录不实现 Reader-Core-Native 的业务协议。
- `core-command` 是 Reader UI 侧的 Core bridge 规划契约，不证明 Reader-Core-Native 当前协议已完全对齐。
- 后续仍需要在 Core bridge mapping / 协议收敛中把本契约逐项映射到 Reader-Core-Native 真实命令、事件与错误模型。
- 本目录不实现跨端共享 reducer runtime。

平台仓库接入时必须把 schema 生成或映射为本地类型，再在本地 reducer/coordinator 中使用。

## 测试与校验入口

```bash
# 全量契约测试
node --test contracts/tests/*.test.mjs

# fixtures 校验
node contracts/tests/validate.mjs

# codegen 重生成（drift check）
node tools/codegen/generate.mjs

# demo 一致性校验
node frontend-demo/verify/contract/verify-demo-contract-consistency.mjs
```
