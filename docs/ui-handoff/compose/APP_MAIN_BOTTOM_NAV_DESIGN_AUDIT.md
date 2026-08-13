# App Main Bottom Nav Design Audit

## 1. 总体结论

APP_MAIN_BOTTOM_NAV_DESIGN_NOT_READY

当前 Compose 正式 App 主底栏不是旧的 5 项“书架 / 搜索 / 发现 / 书源 / 设置”，但仍不符合用户明确确认的 4 项主模块“书架 / 发现 / 书源 / 我的”。当前生产底栏实际为“书架 / 书源 / 阅读 / 设置”，缺少“发现”和“我的”，并错误保留“设置”作为一级主按钮，同时把“阅读”放成一级主底栏。

Prototype Gallery 本身是 debug 原型目录，不等同正式 App 主页面；但其 `App Shell / Main Tabs` prototype 当前展示“书架 / 搜索 / 设置”，也不符合 4 项主模块规范。

## 2. 审计范围

已读取代码：

- `app/src/main/kotlin/com/reader/android/ui/prototype/ReaderPrototypeCatalog.kt`
- `app/src/main/kotlin/com/reader/android/ui/prototype/ReaderPrototypeFixtures.kt`
- `app/src/main/kotlin/com/reader/android/ui/prototype/ReaderPrototypeGallery.kt`
- `app/src/main/kotlin/com/reader/android/ui/AppNavigation.kt`
- `app/src/main/kotlin/com/reader/android/ui/ReaderAndroidApp.kt`
- `app/src/main/kotlin/com/reader/android/ui/ReaderRouteHost.kt`
- `app/src/main/kotlin/com/reader/android/ui/components/CommonComponents.kt`
- `app/src/main/kotlin/com/reader/android/ui/components/BookComponents.kt`
- `app/src/main/kotlin/com/reader/android/ui/components/SearchComponents.kt`
- `app/src/main/kotlin/com/reader/android/ui/components/SettingsComponents.kt`
- `app/src/main/kotlin/com/reader/android/ui/components/StateComponents.kt`
- `app/src/main/kotlin/com/reader/android/ui/bookshelf/BookshelfScreen.kt`
- `app/src/main/kotlin/com/reader/android/ui/booksource/BookSourceScreen.kt`
- `app/src/main/kotlin/com/reader/android/ui/discover/DiscoverScreen.kt`
- `app/src/main/kotlin/com/reader/android/ui/discover/RssScreens.kt`
- `app/src/main/kotlin/com/reader/android/ui/settings/SettingsScreen.kt`
- `app/src/main/kotlin/com/reader/android/ui/settings/WebDavAndBackupScreens.kt`
- `app/src/main/kotlin/com/reader/android/ui/reader/components/ReaderControlBase.kt`
- `app/src/main/kotlin/com/reader/android/ui/reader/components/ReaderBottomFunctionOverlay.kt`

路径说明：

- `app/src/main/kotlin/com/reader/android/ui/navigation/` 不存在；实际 route host 在 `ReaderRouteHost.kt`。
- `app/src/main/kotlin/com/reader/android/ui/screens/` 不存在；实际 screen 以 `bookshelf/`、`booksource/`、`discover/`、`settings/`、`reader/` 等目录拆分。
- `app/src/main/kotlin/com/reader/android/ReaderAndroidApp.kt` 不存在；实际文件为 `app/src/main/kotlin/com/reader/android/ui/ReaderAndroidApp.kt`。

已读取文档：

- `docs/ui-handoff/ROUTE_MAP.md`
- `docs/ui-handoff/SCREEN_MATRIX.md`
- `docs/ui-handoff/compose/READER_UI_PROTOTYPE_GALLERY_REPORT.md`

缺失文档：

- `docs/cross-platform-ui/CROSS_PLATFORM_UI_BASELINE.md`
- `docs/cross-platform-ui/CROSS_PLATFORM_ROUTE_MATRIX.md`
- `docs/cross-platform-ui/CROSS_PLATFORM_COMPONENT_MAPPING.md`

## 3. 期望主底栏定义

正式 App 主页面底部固定 4 个主模块：

1. 书架
2. 发现
3. 书源
4. 我的

搜索不是底部主按钮，应作为书架顶部搜索、全局搜索或页面内操作入口。设置不是底部主按钮，应归入“我的”。阅读页底栏“目录 / 朗读 / 界面 / 设置”只属于 ReaderScreen 控制层，不是 App 主导航。

## 4. 当前代码主底栏定义

| 位置 | 按钮数量 | 按钮名称 | 对应 route | 是否通过 | 问题 |
|---|---:|---|---|---|---|
| `AppNavigation.kt` `appScreens` | 4 | 书架 / 书源 / 阅读 / 设置 | `bookshelf` / `booksource` / `reader` / `settings` | 否 | 缺少“发现”和“我的”；“设置”应归入“我的”；“阅读”不应作为 App 一级主底栏 |
| `ReaderRouteHost.kt` `Scaffold.bottomBar` | 4 | 来自 `appScreens` | 同上 | 否 | 生产底栏实际使用错误的 `appScreens` |
| `ReaderRouteHost.kt` route registry | 不适用 | `discover`、`rss_list` 等存在 | `discover` / `rss_list` / `rss_detail` / `rss_subscription` | 否 | 发现/RSS 路由存在，但“发现”未注册为主底栏 root |
| `ReaderRouteHost.kt` settings routes | 不适用 | 设置 / WebDAV / 备份 / 进度同步 | `settings` / `webdav_config` / `backup_settings` / `progress_sync` | 否 | 这些入口属于“我的”，当前没有“我的”模块承载 |
| `CommonComponents.kt` `ReaderMainTabBar` | 参数化 | 由调用方传入 | 参数化 | 部分通过 | 组件本身不固定错误项，但没有被用于纠正主底栏 |

当前生产主底栏没有把“搜索”放成正式主按钮，这是通过项；但整体仍不符合 4 项主模块定义。

## 5. 当前 Prototype Gallery 定义

Prototype Gallery 是 debug-only 原型目录，不等同正式 App 主页面：

- `ReaderRouteHost.kt` 中 `prototype_gallery` 仅在 `BuildConfig.DEBUG` 下注册。
- debug 当前为便于人工校对，启动入口指向 `prototype_gallery`。
- `ReaderPrototypeCatalog` 使用 9 个原型分组：App / Navigation、Bookshelf、Search / Detail、Reader、Source Management、Discover / RSS、WebDAV / Sync、Settings、Global States。这些分组不是正式 App 主底栏。

但 `ReaderPrototypeGallery.kt` 的 `AppShellPrototype()` 当前展示：

- 书架
- 搜索
- 设置

这不符合“Prototype 中展示 App Shell 时，主底栏必须是书架 / 发现 / 书源 / 我的”的规则。该问题属于原型 App Shell 表达错误，但未证明 Prototype Gallery 分组被误接为正式主导航。

## 6. 阅读页底栏区分检查

阅读页底栏当前独立存在于 ReaderScreen 控制层：

- `ReaderControlBase.kt` 的 `ReaderControlBottomBar` 使用 4 个阅读控制项：目录、朗读、界面设置、阅读行为设置。
- `ReaderBottomFunctionOverlay.kt` 的设置 overlay 标题为“设置 / 阅读行为”，内容为阅读行为设置。
- 未发现 WebDAV / 书源 / RSS / 关于混入阅读页设置 overlay。

结论：

- 阅读页底栏没有被复用为 App 主页面底栏。
- App 主底栏也没有被复用到阅读页控制层。
- “目录 / 朗读 / 界面 / 设置”作为阅读页控制层是正确的。

## 7. “我的”模块承载检查

当前没有独立“我的”模块：

- `ReaderRoutes` 没有 `MINE` / `ME` / `PROFILE` 等一级 route。
- `appScreens` 没有“我的”。
- `SettingsScreen` 是一级底栏项，标题为“设置”。
- `WebDavConfigScreen`、`BackupSettingsScreen`、`ProgressSyncStatusScreen` 已存在 route，但从命名和当前 route 结构看归属于 settings 子页面，而不是“我的”。
- `RemoteWebDavBooksScreen` 存在于代码和 prototype fixture，但当前 `ReaderRouteHost.kt` 未注册对应 route。
- “关于版本”在 `SCREEN_MATRIX.md` 和 normalized HTML 中存在，但当前 Compose route host 未看到对应 About route。

结论：全局设置、WebDAV、同步、备份、关于尚未归入“我的”；这是主导航信息架构错误。

## 8. P0 问题

1. App 主底栏缺少“发现”。
2. App 主底栏缺少“我的”。
3. App 主底栏包含“设置”而不是“我的”。
4. App 主底栏包含“阅读”，不属于用户确认的 4 个 App 一级主模块。
5. 发现/RSS 路由存在，但未作为“发现”一级主模块接入底栏。
6. 全局设置、WebDAV、同步、备份、关于没有归入“我的”。
7. Prototype 的 `App Shell / Main Tabs` 示例展示“书架 / 搜索 / 设置”，不符合原型中 App Shell 必须展示“书架 / 发现 / 书源 / 我的”的规则。

未发现以下 P0：

- 生产 App 主底栏不是 5 个按钮。
- 生产 App 主底栏未包含“搜索”。
- 阅读页底栏未被误用成 App 主底栏。
- Prototype Gallery 分组未被接成正式主导航。

## 9. P1 问题

1. `docs/ui-handoff/ROUTE_MAP.md` 仍记录 `/search` 入口来源为“主导航”，与用户确认的新规则冲突。
2. normalized HTML 的 `main-tabs.html` 与多个 normalized 页面仍保留旧 5 项主导航“书架 / 搜索 / 发现 / 书源 / 设置”，会继续误导后续实现。
3. `BookSource` 使用 `Icons.Filled.Search` 作为书源图标，语义容易与搜索入口混淆。
4. “关于版本”和“远程 WebDAV 书籍”在 Compose route host 中未形成清晰入口，后续归入“我的”时需要补 route/入口矩阵。

## 10. 修复建议

建议下一轮立即修复：

- 主底栏改为 4 项：书架 / 发现 / 书源 / 我的。
- 搜索从所有 App 主底栏定义中移除，只保留为书架顶部、全局搜索或页面内操作入口。
- 设置从底栏移除，改由“我的”承载。
- WebDAV / 同步 / 备份 / 关于归入“我的”。
- Discover / RSS 归入“发现”主模块。
- 书源列表 / 详情 / 编辑 / 导入 / 测试归入“书源”主模块。
- 阅读页继续保持独立控制层底栏：目录 / 朗读 / 界面 / 设置。
- Prototype Gallery 继续保留 debug-only，不作为正式主导航。
- Prototype 的 `App Shell / Main Tabs` 示例同步改为“书架 / 发现 / 书源 / 我的”。
- 更新 `ROUTE_MAP.md` 和 normalized HTML / cross-platform 基线，避免旧 5 项主导航继续污染后续实现。

## 11. 是否建议立即修复

建议

