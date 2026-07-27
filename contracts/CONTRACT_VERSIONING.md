# Contract Versioning

状态：Phase 0 版本规则冻结
日期：2026-07-04
权威源：[ARCHITECTURE.md](./ARCHITECTURE.md)

本文定义 UI Contract 的版本号、变更类型、向后兼容策略和三端传导规则。

## 1. 版本号

采用 SemVer：`MAJOR.MINOR.PATCH`。

- `MAJOR`：破坏性变更。三端必须同步升级，否则编译或测试失败。
- `MINOR`：向后兼容的新增。三端可延迟升级，但不得跳过。
- `PATCH`：向后兼容的修复。三端应尽快升级。

初始版本：`1.0.0`。

## 2. 版本文件位置

```text
contracts/VERSION.json
```

格式：

```json
{
  "version": "1.0.0",
  "schema": {
    "route": "1.0.0",
    "ui-event": "1.0.0",
    "ui-state": "1.0.0",
    "view-state": "1.0.0",
    "motion": "1.0.0",
    "token": "1.0.0",
    "appearance": "1.0.0"
  },
  "changelog": [
    {
      "version": "1.0.0",
      "date": "2026-07-04",
      "summary": "Phase 0 / Phase 1 初始冻结",
      "changes": [
        "新增 ARCHITECTURE.md / BOUNDARY_RULES.md / STATE_OWNERSHIP.md / CONTRACT_VERSIONING.md",
        "新增 route / ui-event / ui-state / view-state / motion / token schema",
        "新增 fixtures 与 contract tests",
        "新增 codegen 与 generated Swift / Kotlin / ArkTS 类型"
      ]
    }
  ]
}
```

## 3. 变更类型

| 类型 | 例子 | 等级 |
| --- | --- | --- |
| 破坏性 | 删除 RouteId、改名 MotionId、枚举值变更、必填字段新增 | MAJOR |
| 兼容新增 | 新增 RouteId、新增 MotionId、新增 token、新增可选字段 | MINOR |
| 修复 | 文案、默认值、描述修正 | PATCH |

AppearanceSpec 同样遵循 SemVer：现有 id 改名/删除或字段变为必填属于 MAJOR，新增可选项属于 MINOR，只改标签、顺序、默认值或视觉值且 wire 语义不变属于 PATCH。

## 4. 向后兼容策略

- RouteId 一经发布不得改名或删除，只能标记 `deprecated`。
- MotionId 同上。
- Token name 同上。
- Enum 值一经发布不得删除，新增值视为 MINOR。
- 必填字段新增视为 MAJOR，可选字段新增视为 MINOR。
- fixtures 中的 id 集合是 contract 的子集，新增 fixtures 视为 MINOR。

## 5. 变更流程

1. 修改对应 schema 文件。
2. 同步更新 fixtures 与 contract tests。
3. 跑 `tools/codegen` 重新生成 `generated/{swift,kotlin,arkts}`。
4. 跑 `contracts/tests` 校验。
5. 若交互语义变化，更新 `ui-spec/runtime-actions.json` 并运行 `tools/runtime/generate-runtime.mjs`。
6. 更新 runtime ownership 后运行 tools/runtime/generate-runtime-coverage.mjs；300-event ownership/report drift 必须为零。
7. 若 Host rollout/covered event 或 HostRequest schema 变化，更新对应 READER_UI_CONSUMER.json 与 ui-spec/host-consumers.json，并运行 tools/runtime/check-host-consumers.mjs；effectPolicy 必须同时识别 descriptor effect 与 runtime 动态 effect（例如 foreground timer）。
8. 更新 `VERSION.json`：bump 版本号、追加 changelog 条目，并同步 native package 版本。
9. 提交时 schema/spec + fixtures + tests + generated/runtime outputs + VERSION.json 五类变更必须同提交。

## 6. 三端传导

- `generated/` 与 `packages/` 共同构成平台仓库依赖入口。优先使用 SwiftPM / Gradle composite or artifact / ohpm path or registry；禁止复制后分叉。
- 平台仓库接入后，必须消费同一版本的 contract 与 ReaderUIRuntime；本地 coordinator 只负责 effect 执行与结果回送。
- contract 变更必须能触发三端编译或测试失败。三端 CI 必须包含 schema 校验或 generated 类型编译。
- 三端不得绕过 generated/runtime package 另建同名 action table 或 UiState 真源。

## 7. 与 demo 的关系

- `frontend-demo-optimized/` 不需要随 contract 版本升级。
- demo 是 contract 的语义参考，不是版本载体。
- demo 中出现的 route / motion / state 必须在 contract 中找到，否则视为 contract 缺漏，需补 schema。

## 8. 废弃流程

- 标记 `deprecated: true` 并记录替代项。
- 至少保留一个 MINOR 周期。
- 之后在 MAJOR 升级时删除。
- 删除前必须确认三端平台仓库已迁移完成。
