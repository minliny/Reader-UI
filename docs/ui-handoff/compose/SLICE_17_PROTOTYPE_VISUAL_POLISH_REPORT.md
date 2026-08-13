# Slice 17 Prototype Visual Polish Report

## 1. 总体结论

SLICE_17_PROTOTYPE_VISUAL_POLISH_READY

## 2. Git 状态

- 当前 HEAD: `36a5afa feat: harden UI state integration`
- Slice 16 是否提交: 是，commit `36a5afa`
- 是否 push: 否

## 3. 修改范围

生产 Kotlin:

- `app/src/main/kotlin/com/reader/android/ui/prototype/ReaderPrototypeCatalog.kt`
- `app/src/main/kotlin/com/reader/android/ui/prototype/ReaderPrototypeGallery.kt`

测试:

- `app/src/test/kotlin/com/reader/android/ui/prototype/ReaderPrototypeVisualPolishTest.kt`
- `app/src/test/kotlin/com/reader/android/ui/navigation/AppMainNavVisualRegressionTest.kt`
- `app/src/test/kotlin/com/reader/android/ui/reader/ReaderControlVisualRegressionTest.kt`

报告:

- `docs/ui-handoff/compose/SLICE_17_PROTOTYPE_VISUAL_POLISH_REPORT.md`

## 4. Prototype Gallery polish 结果

- 首页: 标题从英文调试感较强的 `Reader UI Prototype Gallery` 调整为 `UI 原型预览`。
- 分组: 保留既有 9 个分组，分组仍用于原型目录，不等同正式 App 主导航。
- entry: 38 个 entry 保持不变；每个 entry 的说明从 `Prototype fixture only` 改为中文模块说明。
- 选中态: 顶部新增 `当前：...` chip，当前列表项新增 `已选` 标识和独立卡片样式。
- 可读性: 首页新增“共 38 个页面，全部使用 UI fixture，不接真实网络”的说明；列表项点击区域保持整行可点，适合设备端滚动校对。

## 5. 四主模块视觉校对结果

书架:

- 书架入口仍作为 App Shell 默认 selected。
- 书架封面、列表、空状态 entry 保留。
- 搜索入口仍在页面内，不进入底部主导航。

发现:

- 发现仍为主底栏第二项。
- 发现/RSS entry 文案明确为“发现与 RSS 状态预览”，不混同书源管理。

书源:

- 书源仍为主底栏第三项。
- 书源管理、详情、编辑/导入、测试/禁用/错误状态 entry 保留。
- 本轮只调整 prototype 文案与呈现，不触发真实网络或书源测试。

我的:

- 我的仍为主底栏第四项。
- WebDAV、备份、同步、关于仍归入“我的”相关页面或 WebDAV / Sync 原型分组。
- 未恢复“设置”作为 App 主底栏名称。

## 6. 阅读页视觉回归结果

- 快捷按钮: 保持无正式文字标签，仅保留语义描述。
- 页内控制: 保持本章内上一页/下一页语义，不使用 `skip_previous` / `skip_next`。
- 阅读页底栏: 仍为目录 / 朗读 / 界面 / 设置。
- overlays: 9 个 Reader prototype entry 均保留。
- 亮度条: 未加重视觉或改变既有停靠/自动亮度状态。
- 夜间状态: 仍是状态切换，不是弹窗。

## 7. 状态页视觉结果

- loading: 保持统一 `ReaderLoadingState`。
- empty: 增加明确下一步 action `去搜索`。
- error: 明确显示 `重试` action。
- offline: 明确显示 `重试` action。
- permission: 文案调整为“授权后才能继续读取本地文件”，降低惊吓感并保留授权 action。

## 8. 设备端验证

- 是否重新安装 debug app: 是，`installDebug` 通过并安装到已连接设备 `dc54254d`。
- 是否人工查看: 是，已启动 App 并通过 UI dump 确认打开 `UI 原型预览`，首页显示 `原型目录`、`当前：App Shell / Main Tabs`、`已选`、`书架封面模式` 等关键内容。
- 发现问题: 无 P0/P1。当前原型目录仍保留英文分组名，这是既定 catalog 分组命名，不等同 App 主底栏。

## 9. 测试结果

- `./gradlew test --no-daemon`: 通过。为避免本机 Gradle 测试进程卡住，最终执行 `./gradlew cleanTestDebugUnitTest cleanTestReleaseUnitTest test --no-daemon --no-parallel --max-workers=1`，`BUILD SUCCESSFUL in 19s`。
- `./gradlew assembleDebug --no-daemon`: 通过，`BUILD SUCCESSFUL in 41s`。
- `./gradlew lintDebug --no-daemon`: 通过，`BUILD SUCCESSFUL in 2m 8s`。
- `./gradlew installDebug --no-daemon`: 通过，Installed on 1 device。

## 10. 回归守卫

- 主底栏仍为: 书架 / 发现 / 书源 / 我的。
- 阅读页底栏仍为: 目录 / 朗读 / 界面 / 设置。
- 无 Stitch 旧色/旧类。
- 无 WebView runtime。
- 未接真实网络。
- fake/real boundary 未破坏。

## 11. 是否仍有 P0

无

## 12. 是否仍有 P1

无

## 13. 是否建议提交

建议提交 Slice 17 visual polish 成果。
