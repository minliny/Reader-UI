# P0 链路对齐审计矩阵

> 冻结基线时间：2026-07-09
> 审计范围：Reader UI (Contract) / Reader for iOS / Reader for Android / Reader-for-HarmonyOS
> 验收口径：5 条 P0 链路在 `Contract → 原生运行时 → reducer/coordinator → token/motion → 测试/设备证据` 全部闭环（A-F 六列 ✅ 或有明确豁免）

## 列定义

| 列 | Contract 仓库 | iOS | Android | HarmonyOS |
|----|---------------|-----|---------|-----------|
| **A** | routeId / pageState / ComponentType 定义存在 | 契约渲染层进生产路径（ReaderApp 注册 ComponentRegistry，AppShellView 走 ViewStateRenderer） | AppShell route 分支存在 | ViewStateRenderer 注册 + RouteTable |
| **B** | state-rule 覆盖（loading / fallback / back-stack / overlay） | ComponentFactory 返回非空（非 EmptyView） | Reducer intent 存在 | Reducer case 存在 |
| **C** | motion-policy 存在（push / pop / replace，containerRole 正确） | reducer/coordinator 非 stub | Screen 存在 | MotionAdapter.apply 接线 |
| **D** | motion 合同存在且语义一致 | token/motion 接线（ReaderMotionAdapter + 无 raw 字面量） | MotionPolicyAdapter 生产调用 + token 渗透 | token raw 清理（无 raw rgba） |
| **E** | ui-event 覆盖 + route-event 覆盖测试 | 测试覆盖（非仅 Slice Golden） | route/reducer focused test | 专属测试（非仅 RouteDispatch） |
| **F** | — | 设备证据（截图 / smoke） | source-switch FlowShell smoke | settings 控件接 reducer（非静态展示） |

状态图例：✅ 有覆盖 ｜ ⚠️ 部分/薄弱 ｜ ❌ 缺失

---

## 矩阵总表

### 链路 1：bookshelf（书架 / first-open / main-tab）

| 列 | Contract | iOS | Android | HarmonyOS |
|----|----------|-----|---------|-----------|
| A | ✅ | ❌ | ✅ | ✅ |
| B | ⚠️ 缺 viewMode/back-stack 专属规则 | ✅ | ✅ | ✅ |
| C | ✅ | ⚠️ bookshelf 子事件 stub | ✅ | ✅ |
| D | ✅ | ⚠️ raw zIndex/padding | ⚠️ MotionPolicyAdapter 孤儿 + 117 raw dp | ✅ |
| E | ✅ 有 route-event | ✅ | ✅ | ✅ |
| F | — | ✅ | — | — |

### 链路 2：reader（沉浸阅读 / reader control）

| 列 | Contract | iOS | Android | HarmonyOS |
|----|----------|-----|---------|-----------|
| A | ✅ | ❌ | ✅ | ✅ |
| B | ✅ 覆盖最完整 | ✅ | ✅ | ✅ |
| C | ✅ | ⚠️ page.next/prev stub | ✅ | ✅ |
| D | ✅ | ⚠️ raw Color.white | ⚠️ MotionPolicyAdapter 孤儿 + 279 raw dp | ❌ ReaderComponents raw rgba |
| E | ✅ 有 route-event | ✅ | ✅ | ✅ |
| F | — | ✅ | — | — |

### 链路 3：source-switch（换源 FlowShell）— 最高风险

| 列 | Contract | iOS | Android | HarmonyOS |
|----|----------|-----|---------|-----------|
| A | ⚠️ FlowShell 声明但 ui-state 混用 overlay/route | ❌ | ✅ | ⚠️ FlowShell 直渲绕过 ViewStateRenderer |
| B | ❌ 无 source-switch/FlowShell 规则 | ✅ | ❌ 无专用 intent | ⚠️ 确认按钮无 dispatch |
| C | ❌ 无 FlowShell policy，仍是 overlay 语义 | ❌ 全 stub | ⚠️ 骨架无换源逻辑 | ❌ 0 处 MotionAdapter |
| D | ⚠️ reader.sourceSwitch.open-close 是 overlay 语义 | ❌ 未接 motion | ❌ 契约已登记 reader.sourceSwitch 但被绕过 | ✅ |
| E | ⚠️ 缺 route-event 覆盖测试 | ⚠️ 仅 route ownership | ❌ 无路由测试 | ❌ 无专属测试 |
| F | — | ❌ 无截图 | ⚠️ 仅骨架 smoke | — |

### 链路 4：book-detail（书籍详情）

| 列 | Contract | iOS | Android | HarmonyOS |
|----|----------|-----|---------|-----------|
| A | ✅ | ❌ | ✅ | ✅ |
| B | ⚠️ error 规则仅 slice-6 | ❌ Factory 缺 .bookDetail case 返回空 | ❌ 无专用 intent | ✅ |
| C | ⚠️ 无 LibraryShell policy，用 appShell 兜底 | ✅ | ✅ | ❌ 0 处 MotionAdapter |
| D | ✅ | ❌ 未接 motion + raw padding | ⚠️ MotionPolicyAdapter 孤儿 + 63 raw dp | ✅ |
| E | ✅ 有 route-event | ✅ | ❌ 无路由测试 | ⚠️ 有 reducer 测试无 ViewState 测试 |
| F | — | ✅ | — | — |

### 链路 5：settings（设置）

| 列 | Contract | iOS | Android | HarmonyOS |
|----|----------|-----|---------|-----------|
| A | ✅ | ❌ | ✅ | ✅ |
| B | ⚠️ 缺 settings 主页/overlay 规则 | ✅ | ⚠️ 子页走通用 PushRoute | ⚠️ reducer case 有但页面未接 |
| C | ⚠️ 有 overlay dialog policy，缺 push/pop | ❌ 全 stub | ✅ | ❌ 0 处 MotionAdapter |
| D | ✅ | ⚠️ raw Color.white | ⚠️ MotionPolicyAdapter 孤儿 + 47 raw dp | ⚠️ SettingsShell raw rgba |
| E | ✅ 有 route-event | ✅ | ⚠️ 仅路由 id 字符串断言 | ❌ 无专属测试 |
| F | — | ✅ | — | ❌ segment/stepper/switch 静态展示 |

---

## 关键发现（按严重度）

### 1. source-switch 是唯一存在 Contract 内部不一致的 P0 链路
- `route.fixtures.json` 声明 `source-switch` shell=FlowShell（route 化），但：
  - `motion-policy.fixtures.json` 无任何 FlowShell policy，仍是 `reader-overlay-sheet-enter`（overlay 语义）
  - `motion.fixtures.json` 的 `reader.sourceSwitch.open-close` containerRole=overlayHost，operation=enter（overlay 语义）
  - `state-rule.fixtures.json` 13 条规则中无 source-switch/FlowShell 任何规则
  - `ui-state.fixtures.json` Slice 3 用 overlay 语义（route.id=reader + overlay=source-switch），Slice 5 用 route stack 语义，混用
  - `ui-event` 存在 `reader.sourceSwitch.*` 和 `source.switch.*` 双命名未收敛
- **motion-policy.schema.json 的 containerRole enum 不含 FlowShell**（仅 appShell/mainTabShell/readerShell/readerSurface/overlayHost/listItem/inlineState/sessionCapsule/card）

### 2. iOS 契约渲染层整体未进生产路径（A 列全红）
- `ReaderApp.init` 未注册 `ComponentRegistry`，`ComponentRegistry.registerSlice*Components()` 仅在测试文件调用
- `AppShellView` 走 legacy feature view（BookshelfView/ReaderView/BookDetailView/SettingsTabView），`contractViewState` 属性注释明确"不参与渲染"
- `ViewStateRenderer` 仅被 `ShellContainers.swift` 引用，未被任何生产 feature view 使用
- **book-detail Factory 缺 `.bookDetail` case**：`ReaderViewState.swift` L297-489 的 `ViewStateComponentFactory` 无 `.bookDetail`，落入 `default: return []` 返回空

### 3. Android MotionPolicyAdapter 是"有测试无生产调用"的孤儿
- `MotionPolicyAdapter.resolve/resolveRouteTransition/resolveGesture` 在 `app/src/main` 下零生产调用
- `AppShellViewModel.motionTransactionFor()` 用硬编码 `MotionIdConstants.*` + `MotionController.contractFor()`，完全绕过 MotionPolicyAdapter
- `ReaderMotionAdapter` 同样是孤儿（仅测试调用）
- `MotionController` 已生产接入（`AppShellViewModel.kt:46`）
- source-switch 的 `reader.sourceSwitch` MotionId 已在 `MotionController.kt:498-503` 登记但 `motionTransactionFor` 未引用

### 4. Android source-switch / book-detail 无专用 reducer intent 和路由测试
- source-switch 仅靠通用 `PushRoute(ReaderRoute.SourceSwitchFlow)`，无状态机
- book-detail 仅靠通用 `PushRoute(ReaderRoute.BookState("book-detail"))`，无状态机
- ReaderUiReducerTest 无 `SourceSwitchFlow` / `BookState("book-detail")` push/pop 用例

### 5. HarmonyOS source-switch 绕过 ViewStateRenderer
- `FlowShell.ets:41` 对非 global-state 路由直接渲染 `SourceSwitchFlowFrame()`，完全绕过 ViewStateRenderer
- ViewStateTable 声明的 `SourceSwitchFlowPage`（ViewStateTable.ets:3362）在 ViewStateRenderer.ets:199 的注册成为死代码
- `SourceSwitchFlowFrame` 既不在 ViewStateTable 契约里，也不在 ViewStateRenderer 注册表里

### 6. 三端 source-switch / book-detail / settings 的 MotionAdapter 普遍缺失
- iOS：source-switch/book-detail 未接 ReaderMotionAdapter；settings 仅 1 处 `.animation`
- Android：MotionPolicyAdapter 孤儿导致所有链路 motion policy 失效
- HarmonyOS：BookDetailComponents / SourceSwitchFlowComponents / SettingsComponents 均 0 处 `MotionAdapter.apply`（reader 链路的 ReaderSettingsComponents 有 11 处，但那是 reader overlay 不是 settings 主链路）

### 7. raw 字面量分布
- iOS：26 处 `.foregroundColor(.white)`/`Color.black`；BookshelfView raw zIndex(10/3)；BookDetailView raw padding(8/10/12)
- Android：ReaderControlScreen 279 raw dp、BookshelfScreen 117、BookRouteScreens 63、SettingsScreen 47
- HarmonyOS：ReaderComponents.ets:88-125 多处 rgba 渐变；LibraryShell/SettingsShell 各 3 处 `rgba(249,240,230,...)` 底栏渐变

### 8. 测试覆盖盲区
- Contract：source-switch 无 route-event 覆盖测试（其他 4 条链路有）
- iOS：仅靠 Slice Golden 证明，无生产渲染测试
- Android：source-switch/book-detail 无路由测试；settings 仅路由 id 字符串断言
- HarmonyOS：source-switch/settings 无专属测试（List.test.ets 8 个 suite 缺席）；book-detail 无 ViewState 测试

---

## P0 修复优先级（阻断三端对齐的事实错误）

| 优先级 | 问题 | 归属阶段 |
|--------|------|----------|
| P0-1 | Contract source-switch motion-policy 缺 FlowShell route policy，遗留 overlay 语义 | 阶段 1 |
| P0-2 | iOS 契约渲染层未进生产路径，book-detail Factory 返回空 | 阶段 2 |
| P0-3 | source-switch 原生端：Android 无专用 reducer/test，HarmonyOS 绕过 ViewStateRenderer，iOS 事件全 stub | 阶段 2-4 |
| P0-4 | book-detail/settings 三端 motion/state-rule/test 偏薄 | 阶段 1-4 |
| P0-5 | token/motion 清理：raw rgba/zIndex/padding + Android MotionPolicyAdapter 孤儿 | 阶段 2-4 |

---

## 验收标准（阶段 5 统一矩阵）

- 5 条 P0 链路每仓 A-F 全部 ✅ 或有明确豁免
- source-switch 不允许再出现"route 化 view-state + overlay motion"的混合状态
- iOS 不允许只靠 Slice Golden 证明生产渲染
- Android 不允许 MotionPolicyAdapter 继续"有测试无生产调用"
- HarmonyOS 不允许 source-switch/settings 无专属测试
