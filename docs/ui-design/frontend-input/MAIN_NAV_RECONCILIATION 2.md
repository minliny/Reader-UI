# 主导航差异收敛清单（Main Navigation Reconciliation）

本文把本地设计输入件和当前 Android Compose 代码之间的主导航差异明确成实施清单。本文不改产品逻辑，只约束后续真实前端实现时必须先统一的结构。

## 目标结构（Target Structure）

本地设计输入件固定主导航四项：

| 顺序（Order） | 标签（Label） | Type | Shell | 入口说明（Entry Notes） |
| ---: | --- | --- | --- | --- |
| 1 | 书架 | `bookshelf` | `MainTabShell` | 书架根页、继续阅读、我的书架。 |
| 2 | 发现 | `discover` | `MainTabShell` | 发现内容、书源内容聚合、榜单和推荐。 |
| 3 | RSS | `rss` | `MainTabShell` | RSS 订阅流、订阅源筛选和订阅管理入口。 |
| 4 | 设置 | `settings` | `MainTabShell` | 设置首页、书源管理、同步备份、隐私权限和关于反馈入口。 |

证据文件：

- `docs/ui-design/frontend-input/contracts.d.ts`：`MainNavType = "bookshelf" | "discover" | "rss" | "settings"`。
- `docs/ui-design/02-主标签页/*/frontend-input/fixture.json`：四个根页的 `bottomNav[]` 均使用 `书架 / 发现 / RSS / 设置`。
- `docs/ui-design/frontend-input/component-library/COMPONENT_LIBRARY.md`：`MainNav` / `MainNavItem` 固定四项。

## 当前 Android 状态（Current Android Status）

| 文件（File） | 当前结构（Current Structure） | 状态（Status） | 后续动作（Next Action） |
| --- | --- | --- | --- |
| `app/src/main/kotlin/com/reader/android/ui/AppNavigation.kt` | `AppScreen.Bookshelf / Discover / Rss / Settings` | 已收敛（Done） | 后续只允许从这里派生主 tab 顺序、标签和图标。 |
| `app/src/main/kotlin/com/reader/android/ui/ReaderRouteHost.kt` | 主底栏读取 `appScreens`，并通过 `ReaderMainTabShell` 输出正式主标签页框架 | 已收敛（Done） | 后续只把页面内容迁入 MainTabShell content slot。 |
| `app/src/main/kotlin/com/reader/android/ui/stitch/StitchAppShell.kt` | 不再提供底部主导航，也不再作为书架主 tab 入口 | 已收敛（Done） | 仅保留为历史 prototype 内容；不得再承担主导航或书架根页。 |
| `app/src/main/kotlin/com/reader/android/ui/booksource/*` | 书源管理保留 legacy route，同时从设置页进入 | 部分完成（Partially Done） | 后续继续拆成 SettingsShell 下的书源管理二级页。 |
| `app/src/main/kotlin/com/reader/android/ui/settings/MineScreen.kt` | 新增正式 `SettingsRootScreen`、`SettingsHomeState` 和 `SettingsHomeDisplayState`，内容已覆盖本地概览、常用管理、全部设置、概览加载、无备份和权限缺失状态；`MineScreen` 仅保留为 legacy wrapper | 已收敛（Done） | 后续继续补图标 token。 |
| `app/src/main/kotlin/com/reader/android/ui/discover/RssScreens.kt` | 新增 `RssHomeScreen` 作为 RSS 主 tab 内容，`RssListScreen` 保留为二级列表 | 已收敛（Done） | 后续补齐完整状态矩阵和图标 token。 |

## 建议路由归并（Route Reconciliation）

| 当前路由（Current Route） | 目标归属（Target Owner） | 处理方式（Handling） |
| --- | --- | --- |
| `ReaderRoutes.BOOKSHELF` | 书架（Bookshelf） | 保留为第 1 个主 tab。 |
| `ReaderRoutes.DISCOVER` | 发现（Discover） | 保留为第 2 个主 tab。 |
| `ReaderRoutes.SOURCES` | 设置 > 书源管理（Settings > Source Management） | 不再作为主 tab，功能进入设置链路。 |
| `ReaderRoutes.MINE` | 设置（Settings） | 不再作为主 tab，内容拆入设置首页。 |
| `ReaderRoutes.RSS` | RSS（RSS） | 第 3 个主 tab，渲染 `RssHomeScreen`。 |
| `ReaderRoutes.RSS_LIST` | RSS 二级列表（RSS Secondary List） | 保留为 RSS 链路内的二级列表路由，不作为主 tab。 |
| `ReaderRoutes.GLOBAL_SETTINGS` | 设置（Settings） | 可作为第 4 个主 tab 的真实内容，或由设置首页进入二级通用设置。 |
| `ReaderRoutes.SOURCE_DETAIL / SOURCE_EDIT / SOURCE_IMPORT` | 设置 > 书源管理（Settings > Source Management） | 保留二级栈，不出现在主导航。 |
| `ReaderRoutes.WEBDAV_CONFIG / BACKUP_SETTINGS / ABOUT` | 设置链路（Settings Flow） | 保留二级栈，从设置首页进入。 |

## 实施顺序（Implementation Order）

1. 改 `AppScreen`（AppScreen Update）：已完成，主 tab 为 `Bookshelf / Discover / Rss / Settings`。
2. 改路由分组（Route Group Update）：已完成，RSS 子路由归入 `rss`，书源、备份、关于等归入 `settings`。
3. 改底栏数据源（Bottom Nav Source）：已完成，`ReaderRouteHost` 底栏读取 `appScreens` 并使用 `ReaderMainTabShell`，旧 `StitchBottomNav` 已移除。
4. 建设置首页（Settings Root）：已完成第一轮，主 tab 使用 `SettingsRootScreen`，内容覆盖本地概览、常用管理、全部设置、概览加载、无备份和权限缺失状态；`MineScreen` 仅兼容 legacy route。后续继续补图标 token。
5. 建 RSS 根页（RSS Root）：已完成第一轮，`ReaderRoutes.RSS` 渲染 `RssHomeScreen`，包含订阅概览、筛选和最新订阅列表；后续继续补完整状态矩阵和图标 token。
6. 回归验证（Regression）：已完成主导航相关 JVM 测试；后续重构 Settings/RSS 内容时继续补 UI 状态覆盖。

## 验收标准（Acceptance Criteria）

- 主导航顺序必须是 `书架 / 发现 / RSS / 设置`。
- 主导航 active 状态只改变背景、图标颜色和文字颜色，不改变按钮尺寸、间距和位置。
- Android 代码中不得同时存在两套主导航标签来源。
- 书源管理不再作为主 tab，但必须能从设置首页进入。
- RSS 不再只是发现页里的入口，必须有独立主 tab 状态。
- 状态页、二级页和阅读页不得显示错误的主导航高亮。

## 非目标（Non-goals）

- 本文不决定真实产品是否保留 `我的` 概念；若保留，只能作为设置页内分组，不作为主 tab。
- 本文不改后端、同步、书源或 RSS 业务逻辑。
- 本文不要求立即删除 `ui/stitch/*`，但真实前端实现不得继续以其硬编码底栏为准。
