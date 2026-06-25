(function attachReaderFrontendDemoDraftRouteContract(window) {
  const routes = {
    bookshelf: { title: "书架（Bookshelf）", shell: "MainTabShell" },
    discover: { title: "发现（Discover）", shell: "MainTabShell" },
    rss: { title: "RSS", shell: "MainTabShell" },
    "rss-detail": { title: "RSS 详情（RSS Detail）", shell: "MainTabShell" },
    "rss-subscription-management": { title: "RSS 订阅管理（RSS Subscription Management）", shell: "MainTabShell" },
    "rss-empty": { title: "RSS 空状态（RSS Empty）", shell: "MainTabShell" },
    "rss-error": { title: "RSS 错误状态（RSS Error）", shell: "MainTabShell" },
    settings: { title: "设置首页（Settings Home）", shell: "MainTabShell" },
    "book-search": { title: "书籍搜索（Book Search）", shell: "LibraryShell" },
    "book-detail": { title: "书籍详情（Book Detail）", shell: "LibraryShell" },
    "book-directory": { title: "书籍目录（Book Directory）", shell: "LibraryShell" },
    "bookshelf-empty": { title: "书架空状态（Bookshelf Empty）", shell: "MainTabShell" },
    "book-batch-management": { title: "书籍批量管理（Book Batch Management）", shell: "LibraryShell" },
    "sort-filter": { title: "排序与筛选（Sort and Filter）", shell: "LibraryShell" },
    "group-management": { title: "分组管理（Group Management）", shell: "LibraryShell" },
    "local-import": { title: "本地书导入（Local Import）", shell: "LibraryShell" },
    "immersive-reading": { title: "沉浸阅读（Immersive Reading）", shell: "ReaderShell" },
    reader: { title: "阅读控制层（Reader Control Layer）", shell: "ReaderShell" },
    "toc-bookmarks": { title: "目录与书签（TOC and Bookmarks）", shell: "ReaderShell" },
    "reader-appearance": { title: "阅读外观（Reading Appearance）", shell: "ReaderShell" },
    tts: { title: "朗读（Read Aloud）", shell: "ReaderShell" },
    "reader-settings": { title: "阅读设置（Reading Settings）", shell: "ReaderShell" },
    "reader-full-directory": { title: "目录大半屏控制窗（Expanded Directory Panel）", shell: "ReaderShell" },
    "reader-full-tts": { title: "朗读大半屏控制窗（Expanded TTS Panel）", shell: "ReaderShell" },
    "reader-full-appearance": { title: "界面大半屏控制窗（Expanded Appearance Panel）", shell: "ReaderShell" },
    "reader-full-settings": { title: "阅读设置大半屏控制窗（Expanded Reading Settings Panel）", shell: "ReaderShell" },
    "reader-book-cache": { title: "书籍缓存（Book Cache）", shell: "ReaderShell" },
    "reader-debug-info": { title: "调试信息（Debug Info）", shell: "ReaderShell" },
    "auto-page": { title: "自动翻页（Auto Page）", shell: "ReaderShell" },
    "content-search": { title: "内容搜索（Content Search）", shell: "ReaderShell" },
    "content-replacement": { title: "内容替换（Content Replacement）", shell: "ReaderShell" },
    "source-switch": { title: "换源（Source Switching）", shell: "FlowShell" },
    "settings-general": { title: "App 通用设置（General Settings）", shell: "SettingsShell" },
    "bookshelf-search-settings": { title: "书架与搜索设置（Bookshelf and Search Settings）", shell: "SettingsShell" },
    "privacy-permissions": { title: "隐私与权限（Privacy and Permissions）", shell: "SettingsShell" },
    "about-feedback": { title: "关于与反馈（About and Feedback）", shell: "SettingsShell" },
    "cache-management": { title: "缓存管理（Cache Management）", shell: "SettingsShell" },
    "sync-backup": { title: "同步与备份（Sync and Backup）", shell: "SettingsShell" },
    "webdav-config": { title: "同步与备份（Sync and Backup）", shell: "SettingsShell" },
    "restore-confirm": { title: "恢复确认（Restore Confirm）", shell: "SettingsShell" },
    "restore-progress": { title: "恢复进度（Restore Progress）", shell: "SettingsShell" },
    "restore-conflict": { title: "恢复冲突（Restore Conflict）", shell: "SettingsShell" },
    "restore-result": { title: "恢复结果（Restore Result）", shell: "SettingsShell" },
    "source-management": { title: "书源管理（Source Management）", shell: "SettingsShell" },
    "source-import-options": { title: "添加书源（Add Source）", shell: "SettingsShell" },
    "source-import-preview": { title: "导入书源（Import Sources）", shell: "SettingsShell" },
    "source-batch": { title: "批量管理（Batch Source Management）", shell: "SettingsShell" },
    "source-groups": { title: "分组管理（Source Groups）", shell: "SettingsShell" },
    "source-detail": { title: "书源详情（Source Detail）", shell: "SettingsShell" },
    "source-detect": { title: "书源检测（Source Detection）", shell: "SettingsShell" },
    "source-rule-edit": { title: "规则编辑（Source Rule Edit）", shell: "SettingsShell" },
    "source-debug": { title: "书源调测（Source Debug）", shell: "SettingsShell" },
    "source-debug-search-result": { title: "搜索调测结果（Source Debug Search Result）", shell: "SettingsShell" },
    "source-debug-detail-result": { title: "详情调测结果（Source Debug Detail Result）", shell: "SettingsShell" },
    "source-debug-catalog-result": { title: "目录调测结果（Source Debug Catalog Result）", shell: "SettingsShell" },
    "source-debug-content-log": { title: "正文调测日志（Source Debug Content Log）", shell: "SettingsShell" },
    "source-edit-debug": { title: "规则编辑（Source Rule Edit）", shell: "SettingsShell" },
    "source-logs": { title: "错误日志（Source Error Logs）", shell: "SettingsShell" },
    "source-code-view": { title: "源码查看（Source Code View）", shell: "SettingsShell" },
    "source-delete-confirm": { title: "删除书源（Delete Sources）", shell: "SettingsShell" }
  };

  const deepRouteClosure = {
    discover: {
      label: "发现",
      demoRoutes: ["discover"],
      manifestTargets: ["discovery-home-preview", "discovery-home-state-matrix"],
      routeManifestTargets: {
        discover: ["discovery-home-preview", "discovery-home-state-matrix"]
      },
      handoffPages: ["discover-home.html"],
      handoffRouteMap: {
        "discover-home.html": "discover"
      }
    },
    rss: {
      label: "RSS",
      demoRoutes: ["rss", "rss-detail", "rss-subscription-management", "rss-empty", "rss-error"],
      manifestTargets: ["rss-home-preview", "rss-home-state-matrix"],
      routeManifestTargets: {
        rss: ["rss-home-preview", "rss-home-state-matrix"]
      },
      handoffPages: ["rss-list.html", "rss-detail.html", "rss-subscription-management.html", "rss-empty.html", "rss-error.html"],
      handoffRouteMap: {
        "rss-list.html": "rss",
        "rss-detail.html": "rss-detail",
        "rss-subscription-management.html": "rss-subscription-management",
        "rss-empty.html": "rss-empty",
        "rss-error.html": "rss-error"
      }
    },
    settings: {
      label: "设置",
      demoRoutes: [
        "settings",
        "settings-general",
        "bookshelf-search-settings",
        "privacy-permissions",
        "about-feedback",
        "cache-management",
        "sync-backup",
        "webdav-config",
        "source-management"
      ],
      manifestTargets: [
        "settings-home-preview",
        "settings-home-state-matrix",
        "general-settings-preview",
        "general-settings-state-matrix",
        "bookshelf-search-settings-preview",
        "bookshelf-search-settings-state-matrix",
        "privacy-permissions-preview",
        "privacy-permissions-state-matrix",
        "cache-management-preview",
        "cache-management-state-matrix",
        "about-feedback-preview",
        "about-feedback-state-matrix",
        "sync-backup-preview",
        "sync-backup-state-matrix",
        "source-management-preview",
        "source-management-state-matrix"
      ],
      routeManifestTargets: {
        settings: ["settings-home-preview", "settings-home-state-matrix"],
        "settings-general": ["general-settings-preview", "general-settings-state-matrix"],
        "bookshelf-search-settings": ["bookshelf-search-settings-preview", "bookshelf-search-settings-state-matrix"],
        "privacy-permissions": ["privacy-permissions-preview", "privacy-permissions-state-matrix"],
        "cache-management": ["cache-management-preview", "cache-management-state-matrix"],
        "about-feedback": ["about-feedback-preview", "about-feedback-state-matrix"],
        "sync-backup": ["sync-backup-preview", "sync-backup-state-matrix"],
        "source-management": ["source-management-preview", "source-management-state-matrix"]
      },
      handoffPages: [
        "global-settings.html",
        "backup-settings.html",
        "sync-settings-entry.html",
        "webdav-config.html",
        "source-settings-entry.html",
        "source-management-list.html",
        "source-add.html",
        "source-import.html",
        "source-detail.html",
        "source-edit.html",
        "source-test-result.html",
        "source-disabled-error.html",
        "reading-settings-entry.html",
        "about-version.html",
        "permission-required.html"
      ],
      handoffRouteMap: {
        "global-settings.html": "settings",
        "backup-settings.html": "sync-backup",
        "sync-settings-entry.html": "sync-backup",
        "webdav-config.html": "webdav-config",
        "source-settings-entry.html": "source-management",
        "source-management-list.html": "source-management",
        "source-add.html": "source-import-options",
        "source-import.html": "source-import-preview",
        "source-detail.html": "source-detail",
        "source-edit.html": "source-rule-edit",
        "source-test-result.html": "source-detect",
        "source-disabled-error.html": "source-management",
        "reading-settings-entry.html": "reader-settings",
        "about-version.html": "about-feedback",
        "permission-required.html": "privacy-permissions"
      }
    }
  };

  window.ReaderFrontendDemoDraftRouteContract = {
    routes,
    deepRouteClosure
  };
})(window);
