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

## 后续目录规划

```text
contracts/
  route.schema.json
  ui-event.schema.json
  ui-state.schema.json
  view-state.schema.json
  motion.schema.json
  token.schema.json

../tools/codegen/
  swift/
  kotlin/
  arkts/

../generated/
  swift/
  kotlin/
  arkts/
```

## 当前边界

- 本目录可以新增 schema、fixtures、contract tests 和 codegen 入口。
- 本目录不承载生产 UI，不实现 SwiftUI / Compose / ArkUI 页面。
- 本目录不实现 Reader-Core-Native 的业务协议。
- 本目录不实现跨端共享 reducer runtime。

平台仓库接入时必须把 schema 生成或映射为本地类型，再在本地 reducer/coordinator 中使用。
