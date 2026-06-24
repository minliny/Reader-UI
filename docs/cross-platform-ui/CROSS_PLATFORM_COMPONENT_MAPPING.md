# Cross Platform Component Mapping

| 组件 | Android Compose | 规范 |
|---|---|---|
| App 主底栏 | `appScreens` + `ReaderRouteHost` `NavigationBar` | 只显示书架 / 发现 / 书源 / 我的 |
| App Shell 原型 | `ReaderPrototypeGallery` `AppShellPrototype` | 使用同一 4 项主模块 |
| 书架顶部搜索 | `BookshelfScreen` `onSearchClick` | 搜索是顶部/页面内入口，不是主 Tab |
| 我的入口列表 | `MineScreen` | 承载全局设置、WebDAV、备份、同步、远程书籍、关于 |
| 发现入口 | `DiscoverScreen` / `RssScreens` | RSS 归入发现 |
| 书源入口 | `BookSourceScreen` / source detail/edit/import | 书源管理归入书源 |
| 阅读控制底栏 | `ReaderControlBase` | 目录 / 朗读 / 界面 / 设置，仅 ReaderScreen 内使用 |
| Prototype Gallery | `ReaderPrototypeCatalog` | debug-only fixture 原型目录，不等同正式主导航 |
