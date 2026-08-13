# App Main Navigation Full Redesign Report

## 1. 总体结论

APP_MAIN_NAV_FULL_REDESIGN_READY

本轮已将正式 App 一级底部主模块收敛为 4 项：书架 / 发现 / 书源 / 我的。搜索、阅读页、全局设置均不再作为 App 主底栏按钮；阅读页控制层底栏仍保持 ReaderScreen 内部的目录 / 朗读 / 界面 / 设置。

## 2. 输入审计

输入审计引用：`docs/ui-handoff/compose/APP_MAIN_BOTTOM_NAV_DESIGN_AUDIT.md`。

路径核对说明：

- `app/src/main/kotlin/com/reader/android/ReaderAndroidApp.kt` 不存在，实际入口文件为 `app/src/main/kotlin/com/reader/android/ui/ReaderAndroidApp.kt`。
- `app/src/main/kotlin/com/reader/android/ui/navigation/` 不存在，实际导航定义在 `AppNavigation.kt` 与 `ReaderRouteHost.kt`。
- `app/src/main/kotlin/com/reader/android/ui/screens/` 不存在，实际 screen 以 `bookshelf/`、`discover/`、`booksource/`、`settings/`、`reader/` 等目录拆分。

审计中的 P0 已处理：

- “发现”已加入 App 主底栏。
- “我的”已加入 App 主底栏。
- “设置”已从 App 主底栏移除并归入“我的”。
- “阅读”已从 App 主底栏移除，保留为二级阅读 route。
- Prototype Gallery 的 App Shell / Main Tabs 已改为 4 主模块。
- 搜索仍可达，但仅作为书架/全局功能入口。
- 阅读页底栏未混同 App 主底栏。

## 3. 修改范围

代码：

- `app/src/main/kotlin/com/reader/android/ui/AppNavigation.kt`
- `app/src/main/kotlin/com/reader/android/ui/ReaderRouteHost.kt`
- `app/src/main/kotlin/com/reader/android/ui/settings/MineScreen.kt`
- `app/src/main/kotlin/com/reader/android/ui/prototype/ReaderPrototypeGallery.kt`

测试：

- `app/src/test/kotlin/com/reader/android/ProjectSkeletonTest.kt`
- `app/src/test/kotlin/com/reader/android/ui/NavigationRouteTest.kt`
- `app/src/test/kotlin/com/reader/android/ui/NavigationRouteHostSmokeTest.kt`
- `app/src/test/kotlin/com/reader/android/ui/ReaderRouteHostSmokeTest.kt`
- `app/src/test/kotlin/com/reader/android/ui/ReaderRouteReachabilityTest.kt`
- `app/src/test/kotlin/com/reader/android/ui/navigation/AppMainBottomNavDesignFixTest.kt`
- `app/src/test/kotlin/com/reader/android/ui/navigation/AppRouteGroupingTest.kt`
- `app/src/test/kotlin/com/reader/android/ui/prototype/PrototypeMainTabsDesignFixTest.kt`

文档：

- `docs/ui-handoff/ROUTE_MAP.md`
- `docs/ui-handoff/SCREEN_MATRIX.md`
- `docs/cross-platform-ui/CROSS_PLATFORM_UI_BASELINE.md`
- `docs/cross-platform-ui/CROSS_PLATFORM_ROUTE_MATRIX.md`
- `docs/cross-platform-ui/CROSS_PLATFORM_COMPONENT_MAPPING.md`
- `docs/cross-platform-ui/CROSS_PLATFORM_STATE_MATRIX.md`
- `docs/ui-handoff/compose/APP_MAIN_NAV_FULL_REDESIGN_REPORT.md`

## 4. 主底栏整改结果

| 项目 | 修正前 | 修正后 | 是否通过 |
|---|---|---|---|
| 按钮数量 | 4，但内容错误 | 4 | 通过 |
| 按钮名称 | 书架 / 书源 / 阅读 / 设置 | 书架 / 发现 / 书源 / 我的 | 通过 |
| 搜索是否移除主底栏 | 生产底栏未包含；Prototype App Shell 旧示例包含 | 搜索仅保留为顶部/页面内入口 | 通过 |
| 阅读是否移除主底栏 | 阅读是主底栏按钮 | 阅读仅保留为二级 route | 通过 |
| 设置是否移除主底栏 | 设置是主底栏按钮 | 全局设置归入“我的” | 通过 |
| 我的是否加入 | 缺失 | 已加入 `mine` | 通过 |
| 发现是否加入 | route 存在但不是主底栏 | 已加入 `discover` | 通过 |

## 5. 四个主模块内容规划落地

书架：

- `bookshelf` 仍为 release 默认首页。
- 书架顶部搜索入口继续通过 `onSearchClick` 进入 `search`。
- 书架承载已加入书籍、封面/列表模式、空态、阅读进度、来源与缓存状态。

发现：

- `discover` 成为主底栏 Tab。
- RSS 列表、RSS 详情、RSS 订阅管理归入发现 route group。
- 未接真实网络，仍使用已有 state/fixture/fake 边界。

书源：

- `sources` 成为主底栏 Tab。
- 书源管理列表、详情、编辑、导入归入书源 route group。
- 未修改 repository、parser 或 book source 业务逻辑。

我的：

- 新增 `MineScreen` 承载“同步与备份”“阅读与应用设置”“系统与关于”三组入口。
- WebDAV、备份、阅读进度同步、远程 WebDAV 书籍、全局阅读设置、关于版本、隐私与权限均归入“我的”。
- debug-only Prototype Gallery 入口保留在“我的”中。

## 6. Search / Detail 二级入口结果

`search`、`detail/{detailUrl}`、`toc/{tocUrl}`、`reader_content/{contentUrl}/{chapterTitle}` 仍可达，但不在 `appScreens` 主底栏列表中。搜索入口由书架顶部或页面内操作触发，不作为底部主按钮。

## 7. Reader 页面入口结果

`reader` 与 `reader_content/{contentUrl}/{chapterTitle}` 保留为二级阅读入口。`ReaderRouteHost` 现在只在当前 route 属于 4 个主 Tab 时显示 App 主底栏，因此阅读页不会显示 App 主底栏，也不会与阅读页控制层底栏混淆。

## 8. Prototype Gallery 修正结果

Prototype Gallery 保持 debug-only。`App Shell / Main Tabs` prototype 现在复用 `appScreens`，展示：

书架 / 发现 / 书源 / 我的

Prototype Gallery 分组目录仍可存在，但不等同正式 App 主底栏。

## 9. Route / Matrix / 文档同步结果

已更新：

- `ROUTE_MAP.md`：明确 4 主 Tab 和二级 route 归属。
- `SCREEN_MATRIX.md`：将 RSS 归入“发现”，WebDAV/同步/备份/关于归入“我的”。
- `CROSS_PLATFORM_UI_BASELINE.md`：新增跨端 4 主模块基线。
- `CROSS_PLATFORM_ROUTE_MATRIX.md`：新增跨端 route 归属矩阵。
- `CROSS_PLATFORM_COMPONENT_MAPPING.md`：新增组件与模块映射。
- `CROSS_PLATFORM_STATE_MATRIX.md`：新增状态归属矩阵。

## 10. 测试结果

- `./gradlew test --no-daemon`：BUILD SUCCESSFUL in 4s
- `./gradlew assembleDebug --no-daemon`：BUILD SUCCESSFUL in 3s
- `./gradlew lintDebug --no-daemon`：BUILD SUCCESSFUL in 3s

说明：按顺序执行 Gradle 命令，三项均通过。

## 11. 回归守卫

- 无 Stitch 旧色 / 旧类：通过源码扫描与测试守卫。
- 无 WebView runtime：通过源码扫描与测试守卫。
- 阅读页控制层不回归：阅读页底栏仍为目录 / 朗读 / 界面 / 设置，且不承载 WebDAV / 书源 / RSS / 关于。
- fake/real boundary 不破坏：本轮未接真实网络、未接真实 WebDAV/RSS、未修改 Reader-Core bridge/parser/repository/book source。

## 12. 是否仍有 P0

无

## 13. 是否仍有 P1

无

## 14. 是否建议人工校对

建议重新安装 debug app，打开 Prototype Gallery，优先校对 App Shell / Main Tabs、书架、发现、书源、我的四个主模块。
