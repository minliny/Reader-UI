# Compose Route Mapping

| route name | normalized HTML source | Compose screen | ViewModel / state source | entry point | back behavior | required parameters |
|---|---|---|---|---|---|---|
| `bookshelf` | `bookshelf-cover-mode.html`, `bookshelf-list-mode.html` | `BookshelfScreen()` | Bookshelf state, future repository | app start / tab | exit app | none |
| `search` | `search-home.html` | `SearchScreen()` | existing `SearchViewModel` | tab / bookshelf FAB | bookshelf | none |
| `book_detail/{bookId}` | `book-detail.html` | `BookDetailScreen()` | existing `BookDetailViewModel` adapter | search result / bookshelf | previous route | `bookId` or detail URL |
| `reader/{bookId}` | `control-layer-base-v2.html` + 8 reader states | `ReaderScreen()` | existing `ReaderViewModel` + reader UI state | bookshelf / detail | previous route | `bookId`, optional chapter id |
| `source_management` | `source-management-list.html` | `SourceManagementScreen()` | existing `SourceManagementViewModel` | tab / settings | settings or tab root | none |
| `source_detail/{sourceId}` | `source-detail.html` | `SourceDetailScreen()` | `BookSourceRepository` | source list | source management | `sourceId` |
| `discover` | `discover-home.html` | `DiscoverScreen()` | discover/rss state | tab | tab root | none |
| `rss_list` | `rss-list.html` | `RssListScreen()` | rss repository state | discover | discover | none |
| `rss_detail/{rssId}` | `rss-detail.html` | `RssDetailScreen()` | rss item state | rss list | rss list | `rssId` |
| `settings` | `global-settings.html` | `GlobalSettingsScreen()` | settings repositories | tab | tab root | none |
| `webdav_config` | `webdav-config.html` | `WebDavConfigScreen()` | WebDAV settings state | settings / sync | settings | none |
| `backup_settings` | `backup-settings.html` | `BackupSettingsScreen()` | backup state | settings / sync | settings | none |
| `progress_sync` | `progress-sync-status.html` | `ProgressSyncStatusScreen()` | sync state | settings / sync | settings | none |
| `remote_webdav_books` | `remote-webdav-books.html` | `RemoteWebDavBooksScreen()` | remote books state | webdav | webdav config | optional remote path |
| `state/error` | `global-error.html` | `StatePage()` | generic state | any failing route | previous route | message, retry action |
| `state/offline` | `offline-state.html` | `OfflineState()` | network state | any route | previous route | none |

## Migration Note

Existing routes are `bookshelf`, `booksource`, `reader`, `settings`, `search`, `detail/{detailUrl}`, `toc/{tocUrl}`, and `reader_content/{contentUrl}/{chapterTitle}`. Compose implementation should add new routes behind a new `ReaderRouteHost()` while preserving existing tests until replacement tests are ready.
