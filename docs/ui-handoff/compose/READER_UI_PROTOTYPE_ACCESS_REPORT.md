# Reader UI Prototype Access Report

## 1. 总体结论

READER_UI_PROTOTYPE_ACCESS_READY

本轮只补 Prototype Gallery 的 debug 可访问入口，并在 debug build 中将启动页直接指向 Prototype Gallery，方便人工立即校对 UI。未进入 Slice 16，未接真实数据，未接真实 WebDAV/RSS，未修改 Reader-Core bridge/parser/repository/book source，未提交，未 push。

## 2. 问题原因

Prototype Gallery 已生成，但之前未接入 `ReaderRouteHost`、`AppNavigation` 或任何可点击入口，所以 debug app 启动后用户看不到 UI 原型。

## 3. 修改范围

生产代码：

- `app/build.gradle.kts`: 启用 app 模块 `BuildConfig`，用于 debug-only 入口判断。
- `app/src/main/kotlin/com/reader/android/ui/ReaderRouteHost.kt`: 新增 `prototype_gallery` debug-only route；debug build 启动页直接进入 `ReaderPrototypeGallery`，release build 仍从书架启动。
- `app/src/main/kotlin/com/reader/android/ui/settings/SettingsScreen.kt`: 新增 debug-only “UI 原型预览”入口。

测试：

- `app/src/test/kotlin/com/reader/android/ui/prototype/ReaderPrototypeEntryRouteTest.kt`
- `app/src/test/kotlin/com/reader/android/ui/prototype/ReaderPrototypeDebugEntryTest.kt`
- `app/src/test/kotlin/com/reader/android/ui/ReaderRouteHostSmokeTest.kt`
- `app/src/test/kotlin/com/reader/android/ui/NavigationRouteHostSmokeTest.kt`
- `app/src/test/kotlin/com/reader/android/ui/reader/ReaderRuntimeBoundaryGuardTest.kt`

报告：

- `docs/ui-handoff/compose/READER_UI_PROTOTYPE_ACCESS_REPORT.md`

## 4. 入口实现

- route 名称: `prototype_gallery`
- 入口位置: debug build 启动后直接打开 Prototype Gallery；设置页也保留“UI 原型预览”入口。
- debug-only: 是，设置入口和 route 注册均受 `BuildConfig.DEBUG` 保护。
- release 是否隐藏: 是，release build 中 `BuildConfig.DEBUG == false`，启动页仍是书架，设置入口不显示，prototype route 不注册。

## 5. Prototype Gallery 覆盖

- Prototype entry 数量: 38
- 分组数量: 9
- 分组: App / Navigation、Bookshelf、Search / Detail、Reader、Source Management、Discover / RSS、WebDAV / Sync、Settings、Global States
- 数据来源: 仍全部使用 `ReaderPrototypeFixtures` 和既有 UI state adapter fixture。
- 真实数据接入: 无。
- 真实网络 / WebDAV 登录 / RSS 请求 / 同步: 无。
- secret: 未新增真实账号、URL、token、授权头或 cookie。

## 6. 运行查看方式

用户可在 debug app 中这样打开 UI 原型：

1. 执行 `JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home ./gradlew installDebug`
2. 打开 Reader App
3. debug app 会直接打开 Reader UI Prototype Gallery

备用入口：

1. 打开 Reader App
2. 进入“设置”
3. 点击“UI 原型预览”

也可先执行 `JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home ./gradlew assembleDebug` 生成 debug APK。

## 7. 测试结果

- `./gradlew test`: 普通 daemon 在本机 JDK/Gradle 状态下卡住收尾；同一任务使用 `JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home ./gradlew --no-daemon test` 通过，`BUILD SUCCESSFUL in 8s`。
- `./gradlew assembleDebug`: 通过，`BUILD SUCCESSFUL in 5s`。
- `./gradlew lintDebug`: 通过，`BUILD SUCCESSFUL in 6s`。

说明：默认 `JAVA_HOME` 指向 `/Applications/DevEco-Studio.app/Contents/jbr/Contents/Home`，该 JBR 缺少 `jlink`，因此本轮验证显式使用 Homebrew OpenJDK 17。

## 8. 是否仍有 P0

无

## 9. 是否仍有 P1

无

## 10. 是否建议提交

建议用户确认能看到 UI 后再提交。
