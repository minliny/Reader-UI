# Android Compose Mapping

| HTML/CSS 组件 | Compose 组件名 | 参数 | 状态 | 事件 | 可访问性 label | token 使用 | 是否已完成 |
|---|---|---|---|---|---|---|---|
| AppShell: `reader-app-shell / app-shell.html` | `@Composable ReaderAppShell()` | currentRoute, content | normal | onNavigate | 应用壳 | reader tokens | 是 |
| MainTabBar: `reader-main-tab-bar / main-tabs.html` | `@Composable MainTabBar()` | tabs, selectedTab | normal | onTabClick | 主导航 | bottom bar token | 是 |
| BookshelfScreen: `bookshelf-cover-mode.html / bookshelf-list-mode.html` | `@Composable BookshelfScreen()` | books, viewMode, groups | cover/list/empty | onBookClick | 书架 | reader screen tokens | 是 |
| BookCard: `book-card.html` | `@Composable BookCard()` | book, progress | normal | onClick | 书籍卡片 | card tokens | 是 |
| BookListItem: `book-list-item.html` | `@Composable BookListItem()` | book, progress | normal | onClick | 书籍列表项 | list tokens | 是 |
| SearchScreen: `search-home.html / search-results.html` | `@Composable SearchScreen()` | query, results, state | home/loading/empty/error/results | onSearch | 搜索 | search tokens | 是 |
| SearchResultItem: `search-result-item.html` | `@Composable SearchResultItem()` | book, sources | normal | onClick | 搜索结果 | list tokens | 是 |
| BookDetailScreen: `book-detail.html` | `@Composable BookDetailScreen()` | book, toc, sources | detail/toc/added | onRead, onAdd | 书籍详情 | detail tokens | 是 |
| SourceManagementScreen: `source-management-list.html` | `@Composable SourceManagementScreen()` | sources, state | list/error/disabled | onEdit,onTest | 书源管理 | source tokens | 是 |
| SourceListItem: `source-list-item.html` | `@Composable SourceListItem()` | source | enabled/disabled/error | onClick | 书源项 | list tokens | 是 |
| DiscoverScreen: `discover-home.html` | `@Composable DiscoverScreen()` | recommendations, rss | normal | onOpen | 发现 | screen tokens | 是 |
| RssListScreen: `rss-list.html` | `@Composable RssListScreen()` | items, state | list/empty/error | onOpen | RSS列表 | rss tokens | 是 |
| SettingsScreen: `global-settings.html` | `@Composable SettingsScreen()` | settings entries | normal | onNavigate | 全局设置 | settings tokens | 是 |
| WebDavSettingsScreen: `webdav-config.html` | `@Composable WebDavSettingsScreen()` | config, status | config/auth/error | onLogin,onTest | WebDAV设置 | webdav tokens | 是 |
| StatePage: `global-loading.html / global-empty.html / global-error.html` | `@Composable StatePage()` | title, message, action | loading/empty/error/offline/permission | onAction | 状态页 | state tokens | 是 |
