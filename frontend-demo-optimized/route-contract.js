(function attachReaderFrontendDemoDraftRouteContract(window) {
  const routes = {
    bookshelf: { title: "书架（Bookshelf）", shell: "MainTabShell" },
    discover: { title: "发现（Discover）", shell: "MainTabShell" },
    "discover-control": { title: "发现控制层（Discover Control）", shell: "MainTabShell" },
    "discover-sort": { title: "发现排序选择（Discover Sort）", shell: "MainTabShell" },
    "discover-entry-ranking": { title: "发现入口：排行榜（Discover Entry Ranking）", shell: "MainTabShell" },
    "discover-entry-bestseller": { title: "发现入口：畅销（Discover Entry Bestseller）", shell: "MainTabShell" },
    "discover-entry-category": { title: "发现入口：分类（Discover Entry Category）", shell: "MainTabShell" },
    "discover-entry-finished": { title: "发现入口：完本（Discover Entry Finished）", shell: "MainTabShell" },
    "discover-entry-latest": { title: "发现入口：最新（Discover Entry Latest）", shell: "MainTabShell" },
    "discover-entry-new": { title: "发现入口：新书（Discover Entry New）", shell: "MainTabShell" },
    "discover-entry-booklist": { title: "发现入口：书单（Discover Entry Booklist）", shell: "MainTabShell" },
    "discover-filter-keyword": { title: "发现筛选：关键词（Discover Filter Keyword）", shell: "MainTabShell" },
    "discover-filter-male": { title: "发现筛选：男频（Discover Filter Male）", shell: "MainTabShell" },
    "discover-filter-female": { title: "发现筛选：女频（Discover Filter Female）", shell: "MainTabShell" },
    "discover-sort-popularity": { title: "发现排序：人气（Discover Sort Popularity）", shell: "MainTabShell" },
    "discover-sort-update": { title: "发现排序：更新（Discover Sort Update）", shell: "MainTabShell" },
    "discover-sort-collection": { title: "发现排序：收藏（Discover Sort Collection）", shell: "MainTabShell" },
    "discover-sort-finished": { title: "发现排序：完本（Discover Sort Finished）", shell: "MainTabShell" },
    "discover-sort-words": { title: "发现排序：字数（Discover Sort Words）", shell: "MainTabShell" },
    "discover-no-results": { title: "发现无结果（Discover No Results）", shell: "MainTabShell" },
    "discover-loading": { title: "发现加载中（Discover Loading）", shell: "MainTabShell" },
    "discover-refreshing": { title: "发现刷新中（Discover Refreshing）", shell: "MainTabShell" },
    "discover-infinite-loading": { title: "发现继续加载（Discover Infinite Loading）", shell: "MainTabShell" },
    "discover-page-two": { title: "发现第二屏（Discover Loaded More）", shell: "MainTabShell" },
    "discover-cache-confirm": { title: "清除发现缓存（Discover Cache Confirm）", shell: "MainTabShell" },
    "discover-cache-toast": { title: "发现缓存已清除（Discover Cache Toast）", shell: "MainTabShell" },
    "discover-login-return": { title: "发现登录返回（Discover Login Return）", shell: "MainTabShell" },
    "discover-switching-source": { title: "发现切换书源中（Discover Switching Source）", shell: "MainTabShell" },
    "discover-switched-source": { title: "发现已切换书源（Discover Switched Source）", shell: "MainTabShell" },
    "discover-entry-error": { title: "发现入口解析失败（Discover Entry Error）", shell: "MainTabShell" },
    "discover-empty": { title: "发现空状态（Discover Empty）", shell: "MainTabShell" },
    "discover-error": { title: "发现错误状态（Discover Error）", shell: "MainTabShell" },
    "discover-source-login": { title: "书源登录（Discover Source Login）", shell: "LibraryShell" },
    "discover-rule-test": { title: "发现规则测试（Discover Rule Test）", shell: "SettingsShell" },
    "discover-source-bulk": { title: "发现源批量管理（Discover Source Bulk）", shell: "SettingsShell" },
    rss: { title: "RSS", shell: "MainTabShell" },
    "rss-all": { title: "RSS 全部条目（RSS All Items）", shell: "LibraryShell" },
    "rss-starred": { title: "RSS 收藏（RSS Starred）", shell: "LibraryShell" },
    "rss-source-feed": { title: "RSS 单源条目（RSS Source Feed）", shell: "LibraryShell" },
    "rss-source-category-releases": { title: "RSS 单源分类：Releases（RSS Source Category Releases）", shell: "LibraryShell" },
    "rss-source-category-issues": { title: "RSS 单源分类：Issues（RSS Source Category Issues）", shell: "LibraryShell" },
    "rss-source-category-discussions": { title: "RSS 单源分类：Discussions（RSS Source Category Discussions）", shell: "LibraryShell" },
    "rss-refreshing": { title: "RSS 刷新中（RSS Refreshing）", shell: "LibraryShell" },
    "rss-search": { title: "RSS 搜索（RSS Search）", shell: "LibraryShell" },
    "rss-detail": { title: "RSS 阅读（RSS Reader）", shell: "LibraryShell" },
    "rss-original": { title: "RSS 原文页面（RSS Original Page）", shell: "LibraryShell" },
    "rss-original-browser": { title: "RSS 系统浏览器打开（RSS Open In Browser）", shell: "LibraryShell" },
    "rss-subscription-management": { title: "RSS 订阅管理（RSS Subscription Management）", shell: "LibraryShell" },
    "rss-source-actions": { title: "RSS 源操作（RSS Source Actions）", shell: "LibraryShell" },
    "rss-source-edit": { title: "RSS 源编辑（RSS Source Edit）", shell: "LibraryShell" },
    "rss-source-debug": { title: "RSS 规则调试（RSS Source Debug）", shell: "LibraryShell" },
    "rss-source-vars": { title: "RSS 源变量（RSS Source Variables）", shell: "LibraryShell" },
    "rss-source-login": { title: "RSS 源登录（RSS Source Login）", shell: "LibraryShell" },
    "rss-source-login-web": { title: "RSS 网页登录（RSS Source Web Login）", shell: "LibraryShell" },
    "rss-source-login-cookie": { title: "RSS Cookie 提取（RSS Source Login Cookie）", shell: "LibraryShell" },
    "rss-source-login-clear": { title: "RSS 清除登录（RSS Source Login Clear）", shell: "LibraryShell" },
    "rss-source-groups": { title: "RSS 分组管理（RSS Source Groups）", shell: "LibraryShell" },
    "rss-source-group-edit": { title: "RSS 分组编辑（RSS Source Group Edit）", shell: "LibraryShell" },
    "rss-source-batch": { title: "RSS 批量管理（RSS Source Batch）", shell: "LibraryShell" },
    "rss-source-export": { title: "RSS 导出订阅源（RSS Source Export）", shell: "LibraryShell" },
    "rss-source-export-detail": { title: "RSS 导出预览（RSS Source Export Detail）", shell: "LibraryShell" },
    "rss-source-export-result": { title: "RSS 导出完成（RSS Source Export Result）", shell: "LibraryShell" },
    "rss-source-pin": { title: "RSS 置顶确认（RSS Source Pin）", shell: "LibraryShell" },
    "rss-source-disable": { title: "RSS 禁用确认（RSS Source Disable）", shell: "LibraryShell" },
    "rss-source-batch-disable": { title: "RSS 批量禁用确认（RSS Source Batch Disable）", shell: "LibraryShell" },
    "rss-source-import": { title: "RSS 源导入（RSS Source Import）", shell: "LibraryShell" },
    "rss-source-import-detail": { title: "RSS 源导入详情（RSS Source Import Detail）", shell: "LibraryShell" },
    "rss-source-import-result": { title: "RSS 源导入完成（RSS Source Import Result）", shell: "LibraryShell" },
    "rss-read-record": { title: "RSS 阅读记录（RSS Read Record）", shell: "LibraryShell" },
    "rss-record-clear": { title: "RSS 清空阅读记录（RSS Clear Read Record）", shell: "LibraryShell" },
    "rss-rule-subscription": { title: "RSS 规则订阅（RSS Rule Subscription）", shell: "LibraryShell" },
    "rss-rule-subscription-detail": { title: "RSS 规则订阅详情（RSS Rule Subscription Detail）", shell: "LibraryShell" },
    "rss-rule-subscription-edit": { title: "RSS 规则订阅编辑（RSS Rule Subscription Edit）", shell: "LibraryShell" },
    "rss-rule-subscription-test": { title: "RSS 规则订阅测试（RSS Rule Subscription Test）", shell: "LibraryShell" },
    "rss-rule-subscription-apply": { title: "RSS 应用订阅更新（RSS Rule Subscription Apply）", shell: "LibraryShell" },
    "rss-favorite-groups": { title: "RSS 收藏分组（RSS Favorite Groups）", shell: "LibraryShell" },
    "rss-favorite-group-edit": { title: "RSS 收藏分组编辑（RSS Favorite Group Edit）", shell: "LibraryShell" },
    "rss-favorite-clear": { title: "RSS 清空收藏分组（RSS Clear Favorite Group）", shell: "LibraryShell" },
    "rss-empty": { title: "RSS 空状态（RSS Empty）", shell: "LibraryShell" },
    "rss-error": { title: "RSS 错误状态（RSS Error）", shell: "LibraryShell" },
    settings: { title: "设置首页（Settings Home）", shell: "MainTabShell" },
    "book-search": { title: "书籍搜索（Book Search）", shell: "LibraryShell" },
    "book-detail": { title: "书籍详情（Book Detail）", shell: "LibraryShell" },
    "book-directory": { title: "书籍目录（Book Directory）", shell: "LibraryShell" },
    "bookshelf-empty": { title: "书架空状态（Bookshelf Empty）", shell: "MainTabShell" },
    "book-batch-management": { title: "书籍批量管理（Book Batch Management）", shell: "LibraryShell" },
    "sort-filter": { title: "书架排序筛选弹层（Bookshelf Sort Filter Popover）", shell: "MainTabShell" },
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
    "settings-general": { title: "通用设置（General Settings）", shell: "SettingsShell" },
    "settings-developer": { title: "开发模式（Developer Mode）", shell: "SettingsShell" },
    "bookshelf-search-settings": { title: "书架与搜索设置（Bookshelf and Search Settings）", shell: "SettingsShell" },
    "about-feedback": { title: "关于与反馈（About and Feedback）", shell: "SettingsShell" },
    "sync-backup": { title: "同步与备份（Sync and Backup）", shell: "SettingsShell" },
    "webdav-config": { title: "WebDAV 配置（WebDAV Config）", shell: "SettingsShell" },
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

  Object.assign(routes, {
    "bookshelf-cover-mode": { title: "书架封面模式（Bookshelf Cover Mode）", shell: "MainTabShell" },
    "bookshelf-list-mode": { title: "书架列表模式（Bookshelf List Mode）", shell: "MainTabShell" },
    "bookshelf-book-more-menu": { title: "书籍更多操作（Bookshelf Book More Menu）", shell: "MainTabShell" },
    "bookshelf-group-management": { title: "书架分组管理（Bookshelf Group Management）", shell: "LibraryShell" },
    "search-home": { title: "搜索首页（Search Home）", shell: "LibraryShell" },
    "search-results": { title: "搜索结果（Search Results）", shell: "LibraryShell" },
    "search-loading": { title: "搜索加载中（Search Loading）", shell: "LibraryShell" },
    "search-empty": { title: "搜索空状态（Search Empty）", shell: "LibraryShell" },
    "search-error": { title: "搜索错误状态（Search Error）", shell: "LibraryShell" },
    "book-detail-toc-preview": { title: "书籍详情目录预览（Book Detail TOC Preview）", shell: "LibraryShell" },
    "reader_content": { title: "阅读正文（Reader Content）", shell: "ReaderShell" },
    "reader-appearance-overlay-v2": { title: "阅读外观覆盖层 V2（Reader Appearance Overlay V2）", shell: "ReaderShell" },
    "reader-directory-overlay-v2": { title: "目录覆盖层 V2（Reader Directory Overlay V2）", shell: "ReaderShell" },
    "reader-tts-overlay-v2": { title: "朗读覆盖层 V2（Reader TTS Overlay V2）", shell: "ReaderShell" },
    "reader-settings-overlay-v2": { title: "阅读设置覆盖层 V2（Reader Settings Overlay V2）", shell: "ReaderShell" },
    "reader-full-font": { title: "字体完整设置（Reader Full Font）", shell: "ReaderShell" },
    "reader-full-theme": { title: "主题完整设置（Reader Full Theme）", shell: "ReaderShell" },
    "reader-full-theme-edit": { title: "自定义主题编辑（Reader Theme Edit）", shell: "ReaderShell" },
    "reader-full-layout": { title: "版式完整设置（Reader Full Layout）", shell: "ReaderShell" },
    "reader-full-page-turn": { title: "翻页完整设置（Reader Page Turn）", shell: "ReaderShell" },
    "reader-auto-scroll-overlay-v2": { title: "自动翻页覆盖层 V2（Reader Auto Scroll Overlay V2）", shell: "ReaderShell" },
    "reader-search-overlay-v2": { title: "内容搜索覆盖层 V2（Reader Search Overlay V2）", shell: "ReaderShell" },
    "reader-replace-overlay-v2": { title: "内容替换覆盖层 V2（Reader Replace Overlay V2）", shell: "ReaderShell" },
    "source-switch-results": { title: "换源结果（Source Switch Results）", shell: "FlowShell" },
    "reader-night-state-v2": { title: "阅读夜间状态 V2（Reader Night State V2）", shell: "ReaderShell" },
    "discover-home": { title: "发现首页（Discover Home）", shell: "MainTabShell" },
    "discover-entry-source": { title: "发现入口：书源（Discover Entry Source）", shell: "MainTabShell" },
    "discover-filter-source-type": { title: "发现筛选：源类型（Discover Filter Source Type）", shell: "MainTabShell" },
    "discover-filter-category": { title: "发现筛选：分类（Discover Filter Category）", shell: "MainTabShell" },
    "discover-cache-empty": { title: "发现缓存空状态（Discover Cache Empty）", shell: "MainTabShell" },
    "discover-cache-stale": { title: "发现缓存过期（Discover Cache Stale）", shell: "MainTabShell" },
    "discover-cache-fresh": { title: "发现缓存新鲜（Discover Cache Fresh）", shell: "MainTabShell" },
    "rss-source-category-novel": { title: "RSS 单源分类：Novel（RSS Source Category Novel）", shell: "LibraryShell" },
    "rss-source-category-tech": { title: "RSS 单源分类：Tech（RSS Source Category Tech）", shell: "LibraryShell" },
    "rss-source-category-booklist": { title: "RSS 单源分类：Booklist（RSS Source Category Booklist）", shell: "LibraryShell" },
    "rss-source-add": { title: "RSS 源新增（RSS Source Add）", shell: "LibraryShell" },
    "rss-source-delete-confirm": { title: "RSS 源删除确认（RSS Source Delete Confirm）", shell: "LibraryShell" },
    "rss-rule-subscription-create": { title: "RSS 规则订阅创建（RSS Rule Subscription Create）", shell: "LibraryShell" },
    "rss-favorite-add": { title: "RSS 添加收藏（RSS Favorite Add）", shell: "LibraryShell" },
    "rss-favorite-remove": { title: "RSS 移除收藏（RSS Favorite Remove）", shell: "LibraryShell" },
    "global-settings": { title: "全局设置（Global Settings）", shell: "SettingsShell" },
    "restore-scopes": { title: "恢复范围（Restore Scopes）", shell: "SettingsShell" },
    "restore-preview": { title: "恢复预览（Restore Preview）", shell: "SettingsShell" },
    "restore-running": { title: "恢复运行中（Restore Running）", shell: "SettingsShell" },
    "source-edit": { title: "书源编辑（Source Edit）", shell: "SettingsShell" },
    "source-add": { title: "新增书源（Source Add）", shell: "SettingsShell" },
    "source-debug-running": { title: "书源调测运行中（Source Debug Running）", shell: "SettingsShell" },
    "source-debug-result": { title: "书源调测结果（Source Debug Result）", shell: "SettingsShell" },
    "source-test-result": { title: "书源测试结果（Source Test Result）", shell: "SettingsShell" },
    "source-settings-entry": { title: "书源设置入口（Source Settings Entry）", shell: "SettingsShell" },
    "sync-settings-entry": { title: "同步设置入口（Sync Settings Entry）", shell: "SettingsShell" },
    "reading-settings-entry": { title: "阅读设置入口（Reading Settings Entry）", shell: "SettingsShell" },
    "app-shell": { title: "应用壳（App Shell）", shell: "MainTabShell" },
    "main-tabs": { title: "主标签（Main Tabs）", shell: "MainTabShell" },
    "global-loading": { title: "全局加载中（Global Loading）", shell: "SettingsShell" },
    "global-empty": { title: "全局空状态（Global Empty）", shell: "SettingsShell" },
    "global-error": { title: "全局错误状态（Global Error）", shell: "SettingsShell" },
    "offline-state": { title: "离线状态（Offline State）", shell: "SettingsShell" },
    "permission-required": { title: "权限需要（Permission Required）", shell: "SettingsShell" },
    "progress-sync-status": { title: "进度同步状态（Progress Sync Status）", shell: "SettingsShell" },
    "sync-error": { title: "同步错误（Sync Error）", shell: "SettingsShell" },
    "backup-settings": { title: "备份设置（Backup Settings）", shell: "SettingsShell" },
    "progress-sync": { title: "进度同步（Progress Sync）", shell: "SettingsShell" },
    "remote-webdav-books": { title: "远程 WebDAV 书籍（Remote WebDAV Books）", shell: "SettingsShell" },
    "about": { title: "关于（About）", shell: "SettingsShell" },
    "about-version": { title: "关于版本（About Version）", shell: "SettingsShell" },
    "state-error": { title: "状态错误（State Error）", shell: "SettingsShell" },
    "state-offline": { title: "状态离线（State Offline）", shell: "SettingsShell" },
    "control-layer-base-v2": { title: "阅读控制层基线 V2（Control Layer Base V2）", shell: "ReaderShell" },
    // R16B W1：canonical direct ViewState 路由（renderer/state fixture 已闭合）
    "import-permission-denied": { title: "导入权限被拒绝（Import Permission Denied）", shell: "LibraryShell" },
    "import-format-unsupported": { title: "格式不支持（Import Format Unsupported）", shell: "LibraryShell" },
    "import-empty-file": { title: "空文件（Import Empty File）", shell: "LibraryShell" },
    "import-parsing": { title: "解析中（Import Parsing）", shell: "LibraryShell" },
    "import-duplicate": { title: "重复检测（Import Duplicate）", shell: "LibraryShell" },
    "import-conflict-resolve": { title: "冲突解决（Import Conflict Resolve）", shell: "LibraryShell" },
    "import-partial-success": { title: "部分导入成功（Import Partial Success）", shell: "LibraryShell" },
    "import-result-detail": { title: "导入结果详情（Import Result Detail）", shell: "LibraryShell" },
    // R16B W2：canonical direct ViewState 路由（TOC/content/boundary/restore）
    "reader-content-loading": { title: "正文加载中（Reader Content Loading）", shell: "ReaderShell" },
    "reader-content-offline": { title: "正文离线（Reader Content Offline）", shell: "ReaderShell" },
    "reader-content-error": { title: "正文加载错误（Reader Content Error）", shell: "ReaderShell" },
    "reader-toc-loading": { title: "目录加载中（Reader TOC Loading）", shell: "ReaderShell" },
    "reader-toc-offline": { title: "目录离线（Reader TOC Offline）", shell: "ReaderShell" },
    "reader-toc-error": { title: "目录加载错误（Reader TOC Error）", shell: "ReaderShell" },
    "reader-page-boundary-first": { title: "首章边界（Reader Page Boundary First）", shell: "ReaderShell" },
    "reader-page-boundary-last": { title: "末章边界（Reader Page Boundary Last）", shell: "ReaderShell" },
    "reader-progress-restore": { title: "阅读进度恢复（Reader Progress Restore）", shell: "ReaderShell" },
    "reader-background-restore": { title: "后台恢复提示（Reader Background Restore）", shell: "ReaderShell" },
    // R16B W3：canonical direct ViewState 路由（sourceSwitchState）
    "source-switch-empty": { title: "无可用源（Source Switch Empty）", shell: "FlowShell" },
    "source-switch-error": { title: "换源失败（Source Switch Error）", shell: "FlowShell" },
    "source-switch-timeout": { title: "换源超时（Source Switch Timeout）", shell: "FlowShell" },
    "source-switch-loading": { title: "换源加载中（Source Switch Loading）", shell: "FlowShell" },
    "source-switch-rollback": { title: "回滚书源（Source Switch Rollback）", shell: "FlowShell" },
    "source-switch-preview": { title: "换源预览（Source Switch Preview）", shell: "FlowShell" },
    // R16B W4：canonical direct ViewState 路由（font/theme/typography state）
    "reader-font-import-confirm": { title: "导入字体确认（Reader Font Import Confirm）", shell: "ReaderShell" },
    "reader-font-delete-confirm": { title: "删除字体确认（Reader Font Delete Confirm）", shell: "ReaderShell" },
    "reader-font-fallback": { title: "字体回退（Reader Font Fallback）", shell: "ReaderShell" },
    "reader-theme-new": { title: "新建主题（Reader Theme New）", shell: "ReaderShell" },
    "reader-theme-delete-confirm": { title: "删除主题确认（Reader Theme Delete Confirm）", shell: "ReaderShell" },
    "reader-typography-reset-confirm": { title: "排版重置确认（Reader Typography Reset Confirm）", shell: "ReaderShell" },
    // R16B W5：canonical direct ViewState 路由（replaceRulesState）
    "reader-replace-delete-confirm": { title: "删除替换规则确认（Reader Replace Delete Confirm）", shell: "ReaderShell" },
    "reader-replace-apply-result": { title: "替换规则应用结果（Reader Replace Apply Result）", shell: "ReaderShell" },
    "reader-replace-import-export": { title: "替换规则导入导出（Reader Replace Import Export）", shell: "ReaderShell" },
    "reader-replace-preview": { title: "替换规则预览（Reader Replace Preview）", shell: "ReaderShell" },
    "reader-replace-page": { title: "替换规则管理（Reader Replace Page）", shell: "ReaderShell" }
  });

  // Capability-complete frontend surfaces. Registration here states that the
  // UI owns a route and canonical ViewState; it does not manufacture a missing
  // CoreCommand. Host/app-owned surfaces declare that boundary in their fixture
  // props and must remain capability-gated at runtime.
  Object.assign(routes, {
    "onboarding-welcome": { title: "首次使用（Onboarding Welcome）", shell: "FlowShell" },
    "onboarding-capability-setup": { title: "能力与权限设置（Onboarding Capability Setup）", shell: "FlowShell" },
    "permission-recovery": { title: "权限恢复（Permission Recovery）", shell: "FlowShell" },
    "local-format-support": { title: "本地格式支持（Local Format Support）", shell: "LibraryShell" },
    "pdf-reader": { title: "PDF 阅读（PDF Reader）", shell: "ReaderShell" },
    "manga-reader": { title: "漫画阅读（Manga Reader）", shell: "ReaderShell" },
    "http-tts-management": { title: "HTTP TTS 管理（HTTP TTS Management）", shell: "SettingsShell" },
    "http-tts-editor": { title: "HTTP TTS 编辑（HTTP TTS Editor）", shell: "SettingsShell" },
    "http-tts-test": { title: "HTTP TTS 测试（HTTP TTS Test）", shell: "SettingsShell" },
    "content-edit": { title: "正文编辑（Content Edit）", shell: "ReaderShell" },
    "book-cover-change": { title: "更换封面（Change Book Cover）", shell: "LibraryShell" },
    "book-cover-search": { title: "搜索封面（Search Book Cover）", shell: "LibraryShell" },
    "chapter-reviews": { title: "章节评论（Chapter Reviews）", shell: "LibraryShell" },
    "bookmarks-manager": { title: "书签管理（Bookmarks Manager）", shell: "LibraryShell" },
    "download-queue": { title: "下载队列（Download Queue）", shell: "LibraryShell" },
    "download-task-detail": { title: "下载任务（Download Task Detail）", shell: "LibraryShell" },
    "storage-management": { title: "存储管理（Storage Management）", shell: "SettingsShell" },
    "webview-login": { title: "网页登录（WebView Login）", shell: "FlowShell" },
    "webview-captcha": { title: "人机验证（WebView Captcha）", shell: "FlowShell" },
    "webview-challenge": { title: "验证恢复（WebView Challenge Recovery）", shell: "FlowShell" },
    "webview-cookie-return": { title: "Cookie 回传（WebView Cookie Return）", shell: "FlowShell" },
    "settings-tts": { title: "朗读设置（TTS Settings）", shell: "SettingsShell" },
    "settings-storage": { title: "存储设置（Storage Settings）", shell: "SettingsShell" },
    "settings-accessibility": { title: "无障碍设置（Accessibility Settings）", shell: "SettingsShell" }
  });

  const deepRouteClosure = {
    discover: {
      label: "发现",
      demoRoutes: [
        "discover",
        "discover-control",
        "discover-sort",
        "discover-entry-ranking",
        "discover-entry-bestseller",
        "discover-entry-category",
        "discover-entry-finished",
        "discover-entry-latest",
        "discover-entry-new",
        "discover-entry-booklist",
        "discover-filter-keyword",
        "discover-filter-male",
        "discover-filter-female",
        "discover-sort-popularity",
        "discover-sort-update",
        "discover-sort-collection",
        "discover-sort-finished",
        "discover-sort-words",
        "discover-no-results",
        "discover-loading",
        "discover-refreshing",
        "discover-infinite-loading",
        "discover-page-two",
        "discover-cache-confirm",
        "discover-cache-toast",
        "discover-login-return",
        "discover-switching-source",
        "discover-switched-source",
        "discover-entry-error",
        "discover-empty",
        "discover-error",
        "discover-source-login",
        "discover-rule-test",
        "discover-source-bulk",
        "discover-home",
        "discover-entry-source",
        "discover-filter-source-type",
        "discover-filter-category",
        "discover-cache-empty",
        "discover-cache-stale",
        "discover-cache-fresh"
      ],
      manifestTargets: ["discovery-home-preview", "discovery-home-state-matrix"],
      routeManifestTargets: {
        discover: ["discovery-home-preview", "discovery-home-state-matrix"],
        "discover-control": ["discovery-home-preview", "discovery-home-state-matrix"],
        "discover-sort": ["discovery-home-preview", "discovery-home-state-matrix"],
        "discover-entry-ranking": ["discovery-home-preview", "discovery-home-state-matrix"],
        "discover-entry-bestseller": ["discovery-home-preview", "discovery-home-state-matrix"],
        "discover-entry-category": ["discovery-home-preview", "discovery-home-state-matrix"],
        "discover-entry-finished": ["discovery-home-preview", "discovery-home-state-matrix"],
        "discover-entry-latest": ["discovery-home-preview", "discovery-home-state-matrix"],
        "discover-entry-new": ["discovery-home-preview", "discovery-home-state-matrix"],
        "discover-entry-booklist": ["discovery-home-preview", "discovery-home-state-matrix"],
        "discover-filter-keyword": ["discovery-home-preview", "discovery-home-state-matrix"],
        "discover-filter-male": ["discovery-home-preview", "discovery-home-state-matrix"],
        "discover-filter-female": ["discovery-home-preview", "discovery-home-state-matrix"],
        "discover-sort-popularity": ["discovery-home-preview", "discovery-home-state-matrix"],
        "discover-sort-update": ["discovery-home-preview", "discovery-home-state-matrix"],
        "discover-sort-collection": ["discovery-home-preview", "discovery-home-state-matrix"],
        "discover-sort-finished": ["discovery-home-preview", "discovery-home-state-matrix"],
        "discover-sort-words": ["discovery-home-preview", "discovery-home-state-matrix"],
        "discover-no-results": ["discovery-home-state-matrix"],
        "discover-loading": ["discovery-home-state-matrix"],
        "discover-refreshing": ["discovery-home-state-matrix"],
        "discover-infinite-loading": ["discovery-home-state-matrix"],
        "discover-page-two": ["discovery-home-state-matrix"],
        "discover-cache-confirm": ["discovery-home-state-matrix"],
        "discover-cache-toast": ["discovery-home-state-matrix"],
        "discover-login-return": ["discovery-home-state-matrix"],
        "discover-switching-source": ["discovery-home-state-matrix"],
        "discover-switched-source": ["discovery-home-state-matrix"],
        "discover-entry-error": ["discovery-home-state-matrix"],
        "discover-empty": ["discovery-home-state-matrix"],
        "discover-error": ["discovery-home-state-matrix"],
        "discover-source-login": ["discovery-home-state-matrix"],
        "discover-rule-test": ["discovery-home-state-matrix"],
        "discover-source-bulk": ["discovery-home-state-matrix"],
        "discover-home": ["discovery-home-preview", "discovery-home-state-matrix"],
        "discover-entry-source": ["discovery-home-preview", "discovery-home-state-matrix"],
        "discover-filter-source-type": ["discovery-home-preview", "discovery-home-state-matrix"],
        "discover-filter-category": ["discovery-home-preview", "discovery-home-state-matrix"],
        "discover-cache-empty": ["discovery-home-state-matrix"],
        "discover-cache-stale": ["discovery-home-state-matrix"],
        "discover-cache-fresh": ["discovery-home-state-matrix"]
      }
    },
    rss: {
      label: "RSS",
      demoRoutes: ["rss", "rss-all", "rss-starred", "rss-source-feed", "rss-source-category-releases", "rss-source-category-issues", "rss-source-category-discussions", "rss-refreshing", "rss-search", "rss-detail", "rss-original", "rss-original-browser", "rss-subscription-management", "rss-source-actions", "rss-source-edit", "rss-source-debug", "rss-source-vars", "rss-source-login", "rss-source-login-web", "rss-source-login-cookie", "rss-source-login-clear", "rss-source-groups", "rss-source-group-edit", "rss-source-batch", "rss-source-export", "rss-source-export-detail", "rss-source-export-result", "rss-source-pin", "rss-source-disable", "rss-source-batch-disable", "rss-source-import", "rss-source-import-detail", "rss-source-import-result", "rss-read-record", "rss-record-clear", "rss-rule-subscription", "rss-rule-subscription-detail", "rss-rule-subscription-edit", "rss-rule-subscription-test", "rss-rule-subscription-apply", "rss-favorite-groups", "rss-favorite-group-edit", "rss-favorite-clear", "rss-empty", "rss-error", "rss-source-category-novel", "rss-source-category-tech", "rss-source-category-booklist", "rss-source-add", "rss-source-delete-confirm", "rss-rule-subscription-create", "rss-favorite-add", "rss-favorite-remove"],
      manifestTargets: ["rss-home-preview", "rss-home-state-matrix"],
      routeManifestTargets: {
        rss: ["rss-home-preview", "rss-home-state-matrix"],
        "rss-all": ["rss-home-preview", "rss-home-state-matrix"],
        "rss-starred": ["rss-home-preview", "rss-home-state-matrix"],
        "rss-source-feed": ["rss-home-preview", "rss-home-state-matrix"],
        "rss-source-category-releases": ["rss-home-preview", "rss-home-state-matrix"],
        "rss-source-category-issues": ["rss-home-preview", "rss-home-state-matrix"],
        "rss-source-category-discussions": ["rss-home-preview", "rss-home-state-matrix"],
        "rss-refreshing": ["rss-home-preview", "rss-home-state-matrix"],
        "rss-search": ["rss-home-preview", "rss-home-state-matrix"],
        "rss-detail": ["rss-home-state-matrix"],
        "rss-original": ["rss-home-state-matrix"],
        "rss-original-browser": ["rss-home-state-matrix"],
        "rss-subscription-management": ["rss-home-state-matrix"],
        "rss-source-actions": ["rss-home-state-matrix"],
        "rss-source-edit": ["rss-home-state-matrix"],
        "rss-source-debug": ["rss-home-state-matrix"],
        "rss-source-vars": ["rss-home-state-matrix"],
        "rss-source-login": ["rss-home-state-matrix"],
        "rss-source-login-web": ["rss-home-state-matrix"],
        "rss-source-login-cookie": ["rss-home-state-matrix"],
        "rss-source-login-clear": ["rss-home-state-matrix"],
        "rss-source-groups": ["rss-home-state-matrix"],
        "rss-source-group-edit": ["rss-home-state-matrix"],
        "rss-source-batch": ["rss-home-state-matrix"],
        "rss-source-export": ["rss-home-state-matrix"],
        "rss-source-export-detail": ["rss-home-state-matrix"],
        "rss-source-export-result": ["rss-home-state-matrix"],
        "rss-source-pin": ["rss-home-state-matrix"],
        "rss-source-disable": ["rss-home-state-matrix"],
        "rss-source-batch-disable": ["rss-home-state-matrix"],
        "rss-source-import": ["rss-home-state-matrix"],
        "rss-source-import-detail": ["rss-home-state-matrix"],
        "rss-source-import-result": ["rss-home-state-matrix"],
        "rss-read-record": ["rss-home-state-matrix"],
        "rss-record-clear": ["rss-home-state-matrix"],
        "rss-rule-subscription": ["rss-home-state-matrix"],
        "rss-rule-subscription-detail": ["rss-home-state-matrix"],
        "rss-rule-subscription-edit": ["rss-home-state-matrix"],
        "rss-rule-subscription-test": ["rss-home-state-matrix"],
        "rss-rule-subscription-apply": ["rss-home-state-matrix"],
        "rss-favorite-groups": ["rss-home-state-matrix"],
        "rss-favorite-group-edit": ["rss-home-state-matrix"],
        "rss-favorite-clear": ["rss-home-state-matrix"],
        "rss-empty": ["rss-home-state-matrix"],
        "rss-error": ["rss-home-state-matrix"],
        "rss-source-category-novel": ["rss-home-preview", "rss-home-state-matrix"],
        "rss-source-category-tech": ["rss-home-preview", "rss-home-state-matrix"],
        "rss-source-category-booklist": ["rss-home-preview", "rss-home-state-matrix"],
        "rss-source-add": ["rss-home-state-matrix"],
        "rss-source-delete-confirm": ["rss-home-state-matrix"],
        "rss-rule-subscription-create": ["rss-home-state-matrix"],
        "rss-favorite-add": ["rss-home-state-matrix"],
        "rss-favorite-remove": ["rss-home-state-matrix"]
      }
    },
    settings: {
      label: "设置",
      demoRoutes: [
        "settings",
        "settings-general",
        "settings-developer",
        "bookshelf-search-settings",
        "about-feedback",
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
        "settings-developer": ["general-settings-preview", "general-settings-state-matrix"],
        "bookshelf-search-settings": ["bookshelf-search-settings-preview", "bookshelf-search-settings-state-matrix"],
        "about-feedback": ["about-feedback-preview", "about-feedback-state-matrix"],
        "sync-backup": ["sync-backup-preview", "sync-backup-state-matrix"],
        "webdav-config": ["sync-backup-state-matrix"],
        "source-management": ["source-management-preview", "source-management-state-matrix"]
      }
    }
  };

  // Route ids remain stable wire values, but they are not all independent
  // canvases. A RouteId owns family/layout and a default surface only. The
  // active surface is resolved from the current ViewState/OverlayState because
  // one RouteId may render default, loading, offline and dialog variants.
  // CSS must consume the resolved `layout`/`surface` from the demo root instead
  // of branching on individual route ids.
  function routeFamily(routeId) {
    if (routeId === "immersive-reading" || routeId === "tts" || routeId === "auto-page" || routeId === "toc-bookmarks" || routeId === "pdf-reader" || routeId === "manga-reader" || routeId.startsWith("reader") || routeId.startsWith("content-")) return "reader";
    if (routeId.startsWith("onboarding-") || routeId === "permission-recovery") return "onboarding";
    if (routeId.startsWith("webview-")) return "web-auth";
    if (routeId.startsWith("http-tts-")) return "settings";
    if (routeId === "local-format-support") return "import";
    if (routeId.startsWith("download-") || routeId.startsWith("book-cover-") || routeId === "chapter-reviews" || routeId === "bookmarks-manager") return "library";
    if (routeId === "storage-management") return "settings";
    if (routeId.startsWith("source-switch")) return "source-switch";
    if (routeId.startsWith("discover")) return "discover";
    if (routeId.startsWith("rss")) return "rss";
    if (routeId.startsWith("import-") || routeId === "local-import") return "import";
    if (routeId.startsWith("source-")) return "source";
    if (routeId.startsWith("restore-") || routeId.startsWith("sync-") || routeId.startsWith("webdav") || routeId.startsWith("backup-") || routeId.startsWith("progress-") || routeId.startsWith("remote-")) return "sync";
    if (routeId.startsWith("settings") || routeId.startsWith("global-settings") || routeId.startsWith("about")) return "settings";
    if (routeId.startsWith("book") || routeId.startsWith("bookshelf") || routeId.startsWith("search-") || routeId.startsWith("group-") || routeId === "sort-filter") return "library";
    return "system";
  }

  // These sets describe the default renderer for routes whose default fixture
  // is itself an overlay/state. They intentionally do not try to encode every
  // possible ViewState in the RouteId.
  const defaultOverlayRoutes = new Set([
    "bookshelf-book-more-menu",
    "discover-cache-confirm",
    "discover-cache-toast",
    "import-conflict-resolve",
    "import-duplicate",
    "reader-appearance-overlay-v2",
    "reader-auto-scroll-overlay-v2",
    "reader-background-restore",
    "reader-directory-overlay-v2",
    "reader-font-delete-confirm",
    "reader-font-fallback",
    "reader-font-import-confirm",
    "reader-night-state-v2",
    "reader-progress-restore",
    "reader-replace-delete-confirm",
    "reader-replace-overlay-v2",
    "reader-search-overlay-v2",
    "reader-settings-overlay-v2",
    "reader-theme-delete-confirm",
    "reader-tts-overlay-v2",
    "reader-typography-reset-confirm",
    "restore-confirm",
    "restore-preview",
    "restore-scopes",
    "rss-source-delete-confirm",
    "source-delete-confirm"
  ]);

  const defaultStateRoutes = new Set([
    "bookshelf-empty",
    "discover-cache-empty",
    "discover-empty",
    "discover-entry-error",
    "discover-error",
    "discover-infinite-loading",
    "discover-loading",
    "discover-no-results",
    "discover-refreshing",
    "global-empty",
    "global-error",
    "global-loading",
    "import-empty-file",
    "import-format-unsupported",
    "import-parsing",
    "import-partial-success",
    "import-permission-denied",
    "offline-state",
    "permission-required",
    "reader-content-error",
    "reader-content-loading",
    "reader-content-offline",
    "reader-toc-error",
    "reader-toc-loading",
    "reader-toc-offline",
    "restore-conflict",
    "restore-progress",
    "restore-running",
    "rss-empty",
    "rss-error",
    "rss-refreshing",
    "search-empty",
    "search-error",
    "search-loading",
    "source-debug-running",
    "source-switch-empty",
    "source-switch-error",
    "source-switch-loading",
    "source-switch-timeout",
    "state-error",
    "state-offline",
    "sync-error"
  ]);

  const statePageStates = new Set([
    "empty",
    "error",
    "format-unsupported",
    "loading",
    "offline",
    "partial-success",
    "permission",
    "permission-denied",
    "refreshing",
    "rollback",
    "running",
    "shelf-empty",
    "source-unavailable",
    "timeout"
  ]);

  const overlayComponentTypes = new Set(["Dialog", "NightToast", "Toast"]);

  function routeDefaultSurface(routeId) {
    if (defaultOverlayRoutes.has(routeId)) return "overlay";
    if (defaultStateRoutes.has(routeId)) return "state";
    return "page";
  }

  function componentTreeContainsOverlay(components) {
    return (Array.isArray(components) ? components : []).some((component) => (
      overlayComponentTypes.has(component && component.type)
      || componentTreeContainsOverlay(component && component.children)
    ));
  }

  function hasActiveOverlayState(overlayState) {
    if (overlayState == null || overlayState === false) return false;
    if (typeof overlayState === "string") {
      return !["", "closed", "hidden", "none"].includes(overlayState.toLowerCase());
    }
    if (typeof overlayState === "object") {
      if (overlayState.active === false || overlayState.visible === false || overlayState.open === false) return false;
      return true;
    }
    return Boolean(overlayState);
  }

  function routeLayout(routeId, shell) {
    if (routeId.startsWith("source-switch")) return "flow-continuity";
    if (routeId.startsWith("restore-") || routeId.startsWith("source-debug") || routeId === "source-code-view" || routeId === "source-logs") return "wide-workspace";
    if (shell === "ReaderShell") return "reader-control";
    if (shell === "FlowShell") return "flow-continuity";
    if (shell === "SettingsShell") return "settings-stack";
    if (shell === "LibraryShell") return "library-stack";
    return "main-tab";
  }

  const routePresentation = Object.fromEntries(Object.entries(routes).map(([routeId, meta]) => [
    routeId,
    Object.freeze({
      family: routeFamily(routeId),
      defaultSurface: routeDefaultSurface(routeId),
      layout: routeLayout(routeId, meta.shell)
    })
  ]));

  function resolveRoutePresentation(routeId, viewState) {
    const base = routePresentation[routeId] || Object.freeze({
      family: "system",
      defaultSurface: "page",
      layout: "main-tab"
    });
    const state = viewState && typeof viewState === "object" ? viewState : {};
    const overlayActive = hasActiveOverlayState(state.overlayState)
      || componentTreeContainsOverlay(state.components);
    const pageState = typeof state.pageState === "string" ? state.pageState.toLowerCase() : "default";
    const surface = overlayActive
      ? "overlay"
      : statePageStates.has(pageState)
        ? "state"
        : base.defaultSurface;
    return Object.freeze({
      family: base.family,
      surface,
      defaultSurface: base.defaultSurface,
      layout: base.layout,
      pageState,
      overlayActive
    });
  }

  window.ReaderFrontendDemoDraftRouteContract = {
    routes,
    deepRouteClosure,
    routePresentation,
    resolveRoutePresentation
  };
})(window);
