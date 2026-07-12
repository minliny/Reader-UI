# Boundary Rules

状态：2.2 边界冻结
日期：2026-07-10
权威源：[ARCHITECTURE.md](./ARCHITECTURE.md)

本文定义各层之间允许和禁止的调用路径。任何违反禁止路径的实现都不允许进入主线。

## 1. 允许路径

```text
Native UI -> ReaderUIRuntime (emit UiEvent)
ReaderUIRuntime -> Thin Host Coordinator (emit effect)
Thin Host Coordinator -> Reader-Core-Native (emit CoreCommand)
Thin Host Coordinator -> Host Adapter (emit HostRequest)
Reader-Core-Native -> Host Adapter (emit HostRequest)
Reader-Core-Native -> Thin Host Coordinator (return CoreEvent / DomainResult)
Host Adapter -> Thin Host Coordinator (return HostResult)
Thin Host Coordinator -> ReaderUIRuntime (structured result)
ReaderUIRuntime -> Native UI (produce UiState / ViewState)
```

## 2. 禁止路径

```text
UI -> Core -> UI 直接回调
UI -> Storage / Sync 直接写入
UI 页面组件之间互相改全局状态
Core -> 直接调用平台 HTTP / WebView / Cookie
ReaderUIRuntime -> 持有平台 View 引用或调用平台 API
ReaderUIRuntime -> 解析书籍 / 计算业务进度 / 直接写数据库 / 直接做 WebDAV 冲突策略
Native UI -> 直接修改 DomainState
Host Adapter -> 直接改 Core 或 UI 状态
平台仓库 -> 复制并分叉 runtime action table
```

## 3. 跨仓库依赖方向

```text
Reader UI Executable Spec
  -> 被三端平台仓库消费（generated types + ReaderUIRuntime package）
  -> 不依赖任何平台仓库

Reader-Core-Native
  -> 被三端平台仓库通过 FFI / NAPI / bridge 消费
  -> 不依赖 UI Contract

Reader for iOS / Android / HarmonyOS
  -> 依赖同版本 Reader UI Contract + ReaderUIRuntime
  -> 依赖 Reader-Core-Native 协议
  -> 各自实现 native renderer / thin coordinator / Host Adapter
  -> 不互相依赖

Reader-Core
  -> 仅作为迁移参考和历史兼容证据
  -> 不作为新主线扩展
```

## 4. 本仓库（Reader UI）边界

允许：

- 新增 / 修改 `contracts/` 下的 schema、fixtures、contract tests。
- 新增 / 修改 `tools/codegen/` 下的生成器。
- 新增 / 修改 `generated/` 下的生成产物。
- 新增 / 修改 `ui-spec/`、`packages/` 与 `tools/runtime/` 下的平台无关 reducer/effect runtime。
- 维护 `frontend-demo-optimized/` 作为 route / motion / state / token 的语义参考与运行演示。

禁止：

- 在本仓库实现 SwiftUI / Compose / ArkUI 页面。
- 在本仓库实现 Reader-Core-Native 的业务协议。
- 在共享 runtime 中调用 SwiftUI / Compose / ArkUI 或任何平台 API。
- 让 `generated/` 目录出现未经 codegen 产出的人工编辑文件。
- 让 schema 与 `frontend-demo-optimized/` 实际出现的 route / motion / state 漂移。

## 5. Contract 变更传导

1. 先修改 `contracts/ARCHITECTURE.md` 或对应 schema。
2. 同步更新 fixtures 与 contract tests。
3. 若影响交互，修改 `ui-spec/runtime-actions.json` 并跑 `tools/runtime/generate-runtime.mjs`。
4. 跑 contract、reference runtime、Swift/Kotlin runtime 测试。
5. 更新 `VERSION.json` 和三端 consumer lock。
6. 提交时必须包含 schema/spec + fixtures + tests + generated/runtime outputs + version 五类变更，缺一不可。

## 6. demo 与 contract 的关系

- `frontend-demo-optimized/` 是 route / motion / state / token 语义的参考来源，不是契约本身。
- demo 中出现的 route / motion / state 必须能在 `contracts/*.schema.json` 中找到。
- contract 不允许出现 demo 中从未使用的虚构 id。
- demo 大文件（`render.js` / `styles.css`）的拆分不阻塞 contract 推进，但拆分结果必须保持 route / motion / state 集合不变。

## 7. 历史源边界

- 旧文档页面包、设计导出、Stitch 草案和截图基线已从本仓移除，不能作为当前 source。
- 历史 route / motion / state 不得反向覆盖当前 `frontend-demo-optimized/` 和 contract fixtures。
- 旧 `Reader-Core` 的 Swift 实现只用于行为对照，不进入当前 schema。
