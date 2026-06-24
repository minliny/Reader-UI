# Compose Handoff Master Plan

## 1. 总体结论

COMPOSE_HANDOFF_READY

## 2. Handoff Baseline

- normalized HTML 真源：`docs/ui-handoff/normalized-html/`
- CSS/token 真源：`docs/ui-handoff/css/`
- 完整前端报告：`docs/ui-handoff/FULL_FRONTEND_NORMALIZED_HTML_REPORT.md`
- 完整前端审计：`docs/ui-handoff/audits/full-frontend-normalized-html-audit.md`

## 3. Scope

本阶段只做 Android Compose handoff 细化，不直接大规模实现 Android UI。Compose 实装必须分 slice 推进，且每个 slice 保留现有 fake/real mode、bridge、repository、route tests 的保护。

## 4. Package Direction

建议新增或逐步迁移到：

- `com.reader.android.ui.theme`：ReaderColors、ReaderTypography、ReaderSpacing、ReaderShapes。
- `com.reader.android.ui.components`：AppTopBar、MainTabBar、StatePage、BookCard、SearchBox、SettingsRow。
- `com.reader.android.ui.screens`：稳定 screen facade，内部可继续委托现有分包。
- `com.reader.android.ui.reader.components`：阅读页控制层专属组件。

当前实际项目中 `ui/screens`、`ui/components`、`ui/theme` 不存在；Slice 1/2 创建它们。

## 5. Execution Order

1. Freeze handoff docs.
2. Build Reader token foundation.
3. Build shared UI components.
4. Static screens with fake state.
5. Reader control layer prototype.
6. Source management integration.
7. Discover/RSS/WebDAV static UI.
8. State integration.
9. Route host integration.
10. Regression test suite.

## 6. Success Criteria

- Compose token layer matches CSS token source.
- All core routes have a screen and state contract.
- Reader control layer follows overlay visibility rules.
- Accessibility labels are defined for icon-only controls.
- No Stitch old class/color concepts enter Kotlin implementation.
- Existing non-UI tests continue to pass.
