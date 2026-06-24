# Slice 1 Theme Token Foundation Report

## 1. 总体结论

SLICE_1_THEME_TOKEN_FOUNDATION_READY

## 2. 修改范围

新增 Kotlin 文件：

- `app/src/main/kotlin/com/reader/android/ui/theme/ReaderColors.kt`
- `app/src/main/kotlin/com/reader/android/ui/theme/ReaderTypography.kt`
- `app/src/main/kotlin/com/reader/android/ui/theme/ReaderSpacing.kt`
- `app/src/main/kotlin/com/reader/android/ui/theme/ReaderShapes.kt`
- `app/src/main/kotlin/com/reader/android/ui/theme/ReaderElevation.kt`
- `app/src/main/kotlin/com/reader/android/ui/theme/ReaderTheme.kt`
- `app/src/main/kotlin/com/reader/android/ui/theme/ReaderHandoffBoundary.kt`

新增测试：

- `app/src/test/kotlin/com/reader/android/ui/theme/ReaderThemeTokenTest.kt`

新增 / 更新文档：

- `docs/ui-handoff/compose/SLICE_0_HANDOFF_FREEZE_REPORT.md`
- `docs/ui-handoff/compose/SLICE_1_THEME_TOKEN_FOUNDATION_REPORT.md`

未修改现有 navigation、Reader-Core bridge、parser、source repository、source management 业务逻辑或既有 UI 文件。

## 3. Slice 0 handoff freeze 结果

已完成。`normalized-html/` 继续作为 UI handoff 真源，Stitch raw 仅作为历史参考；Android Compose 实装不得运行 normalized HTML，也不得用 WebView 承载 handoff HTML。后续实装按 `COMPOSE_IMPLEMENTATION_SLICES.md` 分阶段推进。

## 4. Theme/token 文件结果

| 文件 | 用途 | 是否生成 | 是否通过 |
|---|---|---|---|
| `ReaderColors.kt` | Reader day / night 专属颜色 token | 是 | 是 |
| `ReaderTypography.kt` | Reader 专属文字层级 | 是 | 是 |
| `ReaderSpacing.kt` | 通用间距与阅读控制层尺寸 token | 是 | 是 |
| `ReaderShapes.kt` | card、chip、floating、overlay 等形状 token | 是 | 是 |
| `ReaderElevation.kt` | 轻量阴影 / 浮出层级 token | 是 | 是 |
| `ReaderTheme.kt` | CompositionLocal token holder，支持 day/night | 是 | 是 |
| `ReaderHandoffBoundary.kt` | debug/handoff 边界 Modifier，默认关闭 | 是 | 是 |

## 5. Token 映射结果

| CSS token | Compose token | 值 | 是否通过 |
|---|---|---:|---|
| `--reader-paper-bg` | `ReaderColors.Day.paperBg` | `#FFF8F4` | 是 |
| `--reader-body-text` | `ReaderColors.Day.bodyText` | `#53433F` | 是 |
| `--reader-control-ink` | `ReaderColors.Day.controlInk` | `#3F4D52` | 是 |
| `--reader-primary` | `ReaderColors.Day.primary` | `#366179` | 是 |
| `--reader-bottom-bar-bg` | `ReaderColors.Day.bottomBarBg` | `#E9DED6` | 是 |
| `--reader-floating-control-bg` | `ReaderColors.Day.floatingControlBg` | `#EFE2D8` | 是 |
| `--reader-floating-control-bg-alt` | `ReaderColors.Day.floatingControlBgAlt` | `#EADBD0` | 是 |
| `--reader-quick-button-bg` | `ReaderColors.Day.quickButtonBg` | `#F7EBE1` | 是 |
| `--reader-control-border` | `ReaderColors.Day.controlBorder` | `rgba(63,77,82,0.12)` | 是 |
| `--reader-boundary` | `ReaderColors.Day.handoffBoundary` | `rgba(63,77,82,0.18)` | 是 |
| `--reader-bottom-bar-height` | `ReaderSpacing.bottomBarHeight` | `68.dp` | 是 |
| `--reader-bottom-safe-gap` | `ReaderSpacing.bottomSafeGap` | `8.dp` | 是 |
| `--reader-floating-page-control-height` | `ReaderSpacing.floatingPageControlHeight` | `52.dp` | 是 |
| `--reader-quick-circle-size` | `ReaderSpacing.quickCircleSize` | `48.dp` | 是 |
| `--reader-quick-circle-gap` | `ReaderSpacing.quickCircleGap` | `20.dp` | 是 |

## 6. Reader night state 与 App dark mode 分离说明

`ReaderVisualMode.Day` / `ReaderVisualMode.Night` 只控制 Reader 阅读页专属 token。`ReaderTheme()` 通过 `LocalReaderTheme` 提供 Reader token，不强制替换 `MaterialTheme`，也不把阅读页夜间模式等同于 App 全局 dark mode。后续 App dark mode 可继续由 Material `colorScheme` 管理，Reader 夜间阅读状态由 `ReaderVisualMode.Night` 单独切换。

## 7. Handoff boundary 结果

已提供 `Modifier.readerHandoffBoundary(enabled: Boolean = false, label: String? = null)`。默认关闭；启用后使用轻量 dashed border 辅助对齐 normalized HTML 边界，不影响生产 UI。当前 `label` 预留给后续 debug overlay 或 inspector 使用。

## 8. 测试结果

| 命令 | 结果 | 备注 |
|---|---|---|
| `./gradlew test` | 通过 | 49 个 task 执行/复用成功；存在既有测试 warning，无失败 |

新增测试覆盖：

- ReaderColors 关键色值正确。
- ReaderSpacing 阅读控制层关键尺寸正确。
- ReaderTheme token holder 默认不替换 MaterialTheme。
- Reader night state 与 day reader token 分离。
- Reader 主 token 文件不引入 Stitch 旧色常量。

## 9. 是否仍有 P0

无。

## 10. 是否仍有 P1

无。

## 11. 是否允许进入 Slice 2

允许进入 Slice 2 Shared UI components。
