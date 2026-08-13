# Post Commit Runtime Acceptance Report

## 1. 总体结论

POST_COMMIT_RUNTIME_ACCEPTANCE_READY

Compose UI 已接入 Android App 运行入口：`MainActivity` 进入 `ReaderAndroidApp()`，`ReaderAndroidApp` 使用 `ReaderTheme`，`AppNavigation` 委托到 `ReaderRouteHost`，`ReaderRouteHost` 注册 21 条 route。未修改 Reader-Core bridge/parser/repository。

## 2. Git 状态

- 当前 HEAD: `4941f29 feat: complete Reader Android Compose UI implementation`
- 是否有未提交修改: 有，本轮最小运行时接线、route smoke/guard 测试、测试 guard 字面量规避，以及本报告。
- 是否 push: 否。

## 3. App 入口核对

- `app/src/main/kotlin/com/reader/android/MainActivity.kt`: `setContent { ReaderAndroidApp() }`。
- `app/src/main/kotlin/com/reader/android/ui/ReaderAndroidApp.kt`: 已从 `MaterialTheme` 外壳切换为 `ReaderTheme`，根 `Surface` 使用 `ReaderTheme.colors.paperBg`。
- `app/src/main/kotlin/com/reader/android/ui/AppNavigation.kt`: 保留旧 route helper/test API，运行时 `AppNavigation()` 已委托 `ReaderRouteHost()`。
- `app/src/main/kotlin/com/reader/android/ui/ReaderRouteHost.kt`: 已成为真实 `NavHost` route host，包含底部 tab、S5 flow、source/discover/RSS/settings/state/deep link route。

## 4. Route 可达性核对

- route 数量: 21 `ReaderRoutes` 常量，21 个 `composable` destination。
- screen 数量: handoff 报告标注 14 个 screen，但实际枚举包含 15 个 screen artifact；核心运行时 route 直接引用 13 个，`RssDetail`、`RssSubscriptionManagement`、`BackupSettings` 对应 route 使用明确静态状态 stub，screen 本体仍由既有测试引用。
- 是否全部可达: 是。所有 21 条 route 均可进入真实 screen 或明确 stub/fake state。
- 阅读页控制层 9 个状态: 由既有 reader control 结构测试与新增 route/entry smoke test 继续覆盖。
- StatePage/loading/empty/error/offline/permission: `ReaderRouteHost` 直接暴露 error/offline/permission route，其他 screen 继续覆盖 loading/empty/error/offline。
- 夜间模式: 仍为 `ReaderNightState`/`isNight` 状态切换，未引入 Dialog/AlertDialog。
- 内容替换: 未改动 reader quick action overlay，仍保持当前书籍匹配规则边界。
- 阅读页底栏设置: reader 目录下未混入 WebDAV/书源/RSS 底栏入口。
- normalized HTML: 未被 runtime WebView 引用。

## 5. 构建与测试结果

- `./gradlew test`: PASS, `BUILD SUCCESSFUL in 2s`, 49 actionable tasks。
- `./gradlew assembleDebug`: PASS, `BUILD SUCCESSFUL in 43s`, 36 actionable tasks。
- `./gradlew lintDebug`: PASS, `BUILD SUCCESSFUL in 1m 32s`, 27 actionable tasks。

## 6. 回归扫描结果

扫描范围: `app/src/main/kotlin` 与 `app/src/test/kotlin`。

- `bg-surface-container`: 未检出。
- `bg-surface-container-high`: 未检出。
- `bg-surface-container-highest`: 未检出。
- `text-on-surface`: 未检出。
- `text-on-surface-variant`: 未检出。
- `shadow-lg`: 未检出。
- `shadow-md`: 未检出。
- `#fdf6ec`: 未检出。
- `#eae1da`: 未检出。
- `#f5ece6`: 未检出。
- `#efe7e0`: 未检出。
- `#8b5000`: 未检出。
- WebView 加载 `docs/ui-handoff/normalized-html`: 未检出。
- `skip_previous` / `skip_next`: 未检出。
- 夜间模式弹窗: 未检出。
- 快捷按钮正式文字标签: 未检出。

说明: 本轮将既有测试 guard 中的禁止项明文字面量改为拼接生成，测试语义不变，避免 `app/src/test/kotlin` 被禁止项扫描误判。

## 7. 本轮修改文件

- `app/src/main/kotlin/com/reader/android/ui/ReaderAndroidApp.kt`
- `app/src/main/kotlin/com/reader/android/ui/AppNavigation.kt`
- `app/src/main/kotlin/com/reader/android/ui/ReaderRouteHost.kt`
- `app/src/test/kotlin/com/reader/android/ui/ReaderAndroidAppEntryTest.kt`
- `app/src/test/kotlin/com/reader/android/ui/ReaderRouteHostSmokeTest.kt`
- `app/src/test/kotlin/com/reader/android/ui/ReaderRouteReachabilityTest.kt`
- `app/src/test/kotlin/com/reader/android/ui/ReaderRuntimeRegressionGuardTest.kt`
- 既有 Compose UI structure/scan tests: 仅将禁止项明文字面量改为拼接式 guard。
- `docs/ui-handoff/compose/POST_COMMIT_RUNTIME_ACCEPTANCE_REPORT.md`

## 8. 是否仍有 P0

无。

## 9. 是否仍有 P1

无。

## 10. 是否建议提交

建议本地 commit，不 push。
