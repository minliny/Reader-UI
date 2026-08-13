# Compose Component Tree

## 1. 输入基线

- FULL_FRONTEND_NORMALIZED_HTML_REPORT.md: FULL_FRONTEND_NORMALIZED_HTML_READY
- full-frontend-normalized-html-audit.md: FULL_FRONTEND_NORMALIZED_HTML_AUDIT_READY
- SCREEN_MATRIX.md: 53 个 normalized HTML 均已登记
- ROUTE_MAP.md: 16 条核心路由
- STATE_MATRIX.md: 12 类全局状态
- ANDROID_COMPOSE_MAPPING.md: 15 个核心组件映射

## 2. 当前 Android 结构读取

实际读取结果：
- `app/src/main/kotlin/`: 存在，当前仅展开到 `com/reader/android/data` 与 `com/reader/android/ui`。
- `app/src/main/kotlin/com/reader/android/ui/`: 存在，包含 `AppNavigation.kt`、`ReaderAndroidApp.kt` 以及 `bookshelf`、`booksource`、`detail`、`reader`、`search`、`settings`、`toc` 分包。
- `app/src/main/kotlin/com/reader/android/ui/screens/`: 不存在。
- `app/src/main/kotlin/com/reader/android/ui/components/`: 不存在。
- `app/src/main/kotlin/com/reader/android/ui/theme/`: 不存在。
- `app/src/test/kotlin/`: 存在，包含 skeleton、capability matrix、fake/real boundary、navigation route tests。
- `docs/ui-handoff/`: 存在，normalized HTML、CSS、组件片段、矩阵和审计报告齐全。

现有 Android UI 结论：当前 Compose UI 是早期骨架，使用 MaterialTheme 默认色和 Scaffold；真实数据能力通过 `FakeCoreBridge`、parser、repository、ViewModel fake/real mode 边界已有测试保护。本阶段只规划，不直接重写现有 UI。

## 3. App Shell

- `ReaderAppShell()`
  - Source: `app-shell.html`, `main-tabs.html`
  - Owns Material/Reader theme bridge, NavHost, global snackbar/state host.
- `ReaderRouteHost()`
  - Wraps current `AppNavigation` concept, but expands from 4 tab routes to full `ROUTE_MAP.md`.
- `MainTabBar()`
  - tabs: 书架 / 搜索 / 发现 / 书源 / 设置.
- `AppTopBar()`
  - Generic page top bar for non-reader pages.
- `ReaderStateScaffold()`
  - Shared loading / empty / error / offline / permission states.

## 4. Bookshelf

`BookshelfScreen()` -> `BookshelfGroupBar()` + `BookshelfCoverGrid()` / `BookshelfList()` + `BookMoreSheet()` + `LocalBookImportPanel()`.

Components:
- `BookCard()` from `book-card.html`
- `BookListItem()` from `book-list-item.html`
- `BookshelfCoverGrid()` from `bookshelf-cover-mode.html`
- `BookshelfList()` from `bookshelf-list-mode.html`

## 5. Search And Detail

`SearchScreen()` -> `SearchBox()` + `SearchResultList()` + `SearchResultItem()` + `StatePage()`.

`BookDetailScreen()` -> `BookDetailHeader()` + `BookDetailActionBar()` + `BookTocPreview()` + `SourceSwitchResultScreen()`.

Existing code note: `SearchViewModel`, `BookDetailViewModel`, and `TOCViewModel` already provide fake/real mode constructor boundaries. Implementation slices must preserve those constructor APIs and tests.

## 6. Reader Page

`ReaderScreen()` is the highest-risk visual rebuild and must be isolated from current content loading logic first.

Tree:
- `ReaderScreen()`
  - `ReadingTopArea()`
    - `ReadingMetaRow()`
    - `SourceChip()`
  - `ReadingContentLayer()`
  - `FloatingBrightnessControl()`
  - `FloatingQuickActions()`
  - `FloatingPageControl()`
  - `ReaderControlBottomBar()`
  - `ReaderOverlayPanel()`
    - `SearchOverlay()`
    - `AutoScrollOverlay()`
    - `ReplaceOverlay()`
    - `DirectoryBookmarkOverlay()`
    - `TtsOverlay()`
    - `AppearanceOverlay()`
    - `ReaderSettingsOverlay()`
  - `ReaderNightState()` as state variant, not dialog.

## 7. Source Management

`SourceManagementScreen()` -> `SourceList()` -> `SourceListItem()`.

Subscreens:
- `SourceDetailScreen()`
- `SourceEditScreen()`
- `SourceImportScreen()`
- `SourceTestResultPanel()`
- `SourceDisabledErrorPanel()`

Existing code note: `SourceManagementViewModel` uses `BookSourceRepository` and `FakeBookSourceRepository`; keep repository contract unchanged.

## 8. Discover / RSS

- `DiscoverScreen()`
- `RssListScreen()`
- `RssDetailScreen()`
- `RssSubscriptionManagementScreen()`
- `RssItem()`

## 9. Global Settings / WebDAV / State Pages

- `GlobalSettingsScreen()`
- `ReadingSettingsEntry()`
- `SourceSettingsEntry()`
- `SyncSettingsEntry()`
- `WebDavConfigScreen()`
- `BackupSettingsScreen()`
- `ProgressSyncStatusScreen()`
- `RemoteWebDavBooksScreen()`
- `StatePage()` / `LoadingState()` / `EmptyState()` / `ErrorState()` / `OfflineState()` / `PermissionRequiredState()`
