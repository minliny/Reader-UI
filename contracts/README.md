# Reader UI Contracts

本目录是 Reader 多端 UI 契约源入口，用于把现有 `frontend-demo/`、handoff 文档、
route/motion/token/state 资料逐步升级为机器可读契约。

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

## 已交付清单

### Schema（13 个）

| 阶段 | Schema | 说明 |
|---|---|---|
| Phase 1 | route / ui-event / ui-state / view-state / motion / token | UI 契约基础 6 schema |
| Phase 2 | core-command / core-event / host-request / progress-location / content / sync-conflict | Core bridge 规划契约 6 schema |
| Phase 1 收尾 | state-rule | 状态归属与转移约束（5 种 kind） |

### Fixtures（598 项）

- Phase 1：route 76 / ui-event 143 / ui-state 43 / view-state 35 / motion 47 / token 117
- Phase 2：core-command 45 / core-event 33 / host-request 31 / progress-location 6 / content 3 / sync-conflict 6
- Phase 1 收尾：state-rule 13

Slice 覆盖：fixtures 按 `_comment` 标注 Slice 1-6，覆盖 6 个优先链路
（AppShell / main tabs / bookshelf→reader / reader overlay / session·focus / RSS·source·search / sync·conflict·offline）。

### Generated（39 个 = 13 schema × 3 端）

- `generated/swift/` —— 13 个 .swift 文件
- `generated/kotlin/` —— 13 个 .kt 文件
- `generated/arkts/` —— 13 个 .ets 文件

入口：`node tools/codegen/generate.mjs`，无本机绝对路径依赖，可重复生成。

### Tests（143 项 / 0 fail）

| 测试文件 | 项数 | 覆盖 |
|---|---|---|
| contract.test.mjs | — | Phase 1 schema 自检 + fixtures 校验 |
| phase2-contract.test.mjs | — | Phase 2 schema + fixtures + §5/§7 对齐 |
| phase1-slice.test.mjs | 40 | 6 个优先链路 Slice 1-6 覆盖 + 过渡连续性 |
| state-rule.test.mjs | — | StateRule schema + fixtures + 关键规则 |
| codegen-consistency.test.mjs | — | 三端 generated enum 一致性 + drift check |
| codegen-idempotent.test.mjs | 6 | codegen 可执行性 + 39 个 generated 文件幂等性 |
| demo-consistency.test.mjs | 5 | frontend-demo 与 schema 一致性 baseline |

### Demo 一致性校验

- 脚本：`frontend-demo/verify/contract/verify-demo-contract-consistency.mjs`
- Baseline：`frontend-demo/verify/contract/demo-contract-baseline.json`
- 当前 baseline：found=432 / unknown=209
- 策略：demo 是早期设计稿，unknown id 可追踪但不阻塞（退出码恒为 0），后续 schema/demo 收敛时应递减

## 目录结构

```text
contracts/
  *.schema.json          # 13 个契约 schema
  fixtures/              # 598 项 fixtures
  tests/                 # 7 个测试文件 + validate.mjs
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
