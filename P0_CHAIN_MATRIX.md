# P0 链路验收矩阵（脚本生成）

> 冻结基线时间：2026-07-09
> 审计范围：Reader UI (Contract) / Reader for iOS / Reader for Android / Reader-for-HarmonyOS
> 验收口径：5 条 P0 链路 × 4 个仓库 × A-F 六列（✅ 通过 / ❌ 失败 / ⚠️ 豁免）
> 生成方式：`node frontend-demo/verify/verify-p0-chain-matrix.mjs`（CI 友好，可重复执行）

## 总表

| 链路 | 仓库 | A | B | C | D | E | F | 状态 |
|------|------|---|---|---|---|---|---|------|
| bookshelf | Contract | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 全绿 |
| bookshelf | iOS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 全绿 |
| bookshelf | Android | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | 有缺口 |
| bookshelf | HarmonyOS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 全绿 |
| reader | Contract | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 全绿 |
| reader | iOS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 全绿 |
| reader | Android | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | 有缺口 |
| reader | HarmonyOS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 全绿 |
| source-switch | Contract | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 全绿 |
| source-switch | iOS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 全绿 |
| source-switch | Android | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | 有缺口 |
| source-switch | HarmonyOS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 全绿 |
| book-detail | Contract | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 全绿 |
| book-detail | iOS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 全绿 |
| book-detail | Android | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 全绿 |
| book-detail | HarmonyOS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 全绿 |
| settings | Contract | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 全绿 |
| settings | iOS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 全绿 |
| settings | Android | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | 有缺口 |
| settings | HarmonyOS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 全绿 |

**汇总：通过 116/120 ｜ 退出码 1（Android E 列有 4 个 ❌）**

## 列定义

### Contract 仓库（A-F）
- A. routeId：route.fixtures.json 中存在该 route
- B. pageState：view-state.fixtures.json 中该 route 有 pageState 定义
- C. ComponentType：view-state.fixtures.json 中该 route 有 ComponentType
- D. state-rule：state-rule.fixtures.json 中有该 route 的规则（routeIds 包含或通用规则）
- E. motion-policy：motion-policy.fixtures.json 中有该 route 对应 shell 的 policy
- F. ui-event：ui-event.fixtures.json 中有该 route 相关的事件

### iOS 仓库（A-F）
- A. registry 生产注册：ComponentRegistry.bootstrapAllSlices 在 ReaderApp 中被调用
- B. factory 非空：该链路 component factory 不返回 EmptyView
- C. reducer 非 stub：ReaderReducer 中有该链路的事件 handler
- D. coordinator 接线：ReaderCoordinator 中有该链路的方法
- E. motion：ReaderMotionAdapter 中有该链路的 motion 接线
- F. test：存在该链路的 golden test 文件

### Android 仓库（A-F）
- A. AppShell route 分支：AppShell.kt 中有该 route 分支
- B. Reducer intent：ReaderUiReducer 中有该链路的 intent handler
- C. Screen：存在该链路的 Screen 文件（Compose）
- D. MotionPolicyAdapter 生产调用：AppShellViewModel 中调用 MotionPolicyAdapter.resolve
- E. token：该链路 Screen 无 raw Color(0x（token 化）
- F. test：存在该链路的 focused test

### HarmonyOS 仓库（A-F）
- A. ViewStateRenderer 注册：ViewStateRenderer/ViewStateTable 中有该 route
- B. RouteTable：RouteTable 中有该 route
- C. Reducer：ReaderReducer 中有该链路的 case
- D. MotionAdapter：该链路组件中有 MotionAdapter.apply
- E. token raw：该链路组件无 raw rgba(
- F. 测试：存在该链路的 test.ets 文件

## 状态图例

- ✅ 通过
- ❌ 失败（缺失或不达标）
- ⚠️ 豁免（附说明）

## 缺口详情

### Android E 列：raw Color(0x 未 token 化（4 个 ❌）

| 链路 | 文件 | 问题 |
|------|------|------|
| bookshelf | BookshelfScreen.kt | `Color(0x572B251F)`, `Color(0x2E1F1B17)` raw 色值 |
| reader | ReaderControlScreen.kt | raw `Color(0x` 字面量 |
| source-switch | ReaderControlScreen.kt（含 FlowShellScreen 定义） | raw `Color(0x` 字面量 |
| settings | SettingsScreen.kt | raw `Color(0x` 字面量 |

**修复方向**：将 raw `Color(0x` 替换为 `ReaderTheme.tokens.*` 语义 token 引用。

## 如何重新生成

```bash
# 在 Reader UI 仓库根目录执行
node frontend-demo/verify/verify-p0-chain-matrix.mjs

# 退出码：
#   0 = 全绿（无 ❌）
#   1 = 有 ❌（⚠️ 豁免不算失败）
```

脚本特性：
- Node.js ESM（.mjs），不依赖外部包
- grep 检查用 readFileSync + 正则，跨平台
- 容忍某仓库缺失（输出 ❌ 但不崩溃）
- CI 友好：可重复执行，退出码可用于 gate
