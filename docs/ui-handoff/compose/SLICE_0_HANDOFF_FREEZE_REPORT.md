# Slice 0 Handoff Freeze Report

## 1. 总体结论

SLICE_0_HANDOFF_FREEZE_READY

## 2. Handoff 真源

`docs/ui-handoff/normalized-html/` 是 Reader for Android UI handoff 真源，`docs/ui-handoff/css/` 是 token、颜色层级、组件视觉规格真源。

## 3. Stitch 状态

Stitch raw 仅作为历史参考和结构追溯来源，不再作为 Android Compose 实装依据。本阶段不再修改 Stitch screen，不再依赖 Stitch token patch。

## 4. Android Compose 实装约束

Android Compose 实装不得运行时依赖 normalized HTML，不得用 WebView 承载 handoff HTML。normalized HTML 只用于设计对齐和审计，生产 UI 必须使用 Kotlin / Jetpack Compose 原生组件。

## 5. 阅读控制层禁止回归

- 不允许旧 Bottom Control Stack 三层堆叠回归。
- 不允许快捷按钮恢复文字标签。
- 不允许夜间模式变成弹窗。
- 不允许阅读页底栏设置混入全局设置。
- 不允许全局设置混入阅读页底栏设置。

## 6. 后续执行方式

后续实现必须按 `docs/ui-handoff/compose/COMPOSE_IMPLEMENTATION_SLICES.md` 分阶段执行。Slice 1 只建立 Theme/token foundation，不接真实数据、不改 bridge/parser/repository、不重写 navigation。
