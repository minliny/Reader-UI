// Discover & RSS 域 canonical controlId 常量
// 来源：tools/interaction-inventory/generated/control-id-registry.json (A2 baseline c7c2730)
//
// 本模块只暴露 B3 · Discover & RSS 工作包需要接入的稳定身份；其它 B
// 工作包不得从此处取 ID。当 registry 重算后，需同步更新本文件。
//
// 命名规则：{domain}.{family}.{route}.{state}.{viewport}.{role}.{discriminator}
// 详细规则见 contracts/control-identity.schema.json 与
// tools/interaction-inventory/MIGRATION_REPORT.md。

(function attachReaderDiscoverRssControlIds(window) {
  "use strict";

  // --- Discover 域 ----------------------------------------------------------

  // 顶栏刷新（在 mainTabDiscover 的 actions: ["refresh"] 中由 shell 渲染；
  // 仍需在自定义顶栏控件中接入相同 ID）
  const DISCOVER_TOP_REFRESH = "discover.button.discover.default.phone.button.top-action-refresh-h-7b0c1442";

  // Discover 主页（discover / discover-home，default state）的入口 chips
  const DISCOVER_ENTRY = {
    ranking: "discover.button.discover.default.phone.button.route-discover-entry-ranking-h-adeeb905",
    source: "discover.button.discover.default.phone.button.route-discover-entry-source-h-3eb72183",
    category: "discover.button.discover.default.phone.button.route-discover-entry-category-h-b685e4b5",
    finished: "discover.button.discover.default.phone.button.route-discover-entry-finished-h-dabbea86",
    latest: "discover.button.discover.default.phone.button.route-discover-entry-latest-h-b188100a",
    booklist: "discover.button.discover.default.phone.button.route-discover-entry-booklist-h-76acab55",
    // 跳转到 discover-control 的 source bar / 入口按钮
    control: "discover.button.discover.default.phone.button.route-discover-control-h-c0f15790",
    // 进入刷新中状态
    refreshing: "discover.button.discover.default.phone.button.route-discover-refreshing-h-fde0f54f"
  };

  // Discover 控制层（discover-control，default state）
  // 主筛选/排序/源操作控件
  const DISCOVER_CONTROL = {
    backToDiscover: "discover.button.discover-control.default.phone.button.route-discover-h-0f433f80",
    switchingSource: "discover.button.discover-control.default.phone.button.route-discover-switching-source-h-2b88df49",
    cacheConfirm: "discover.button.discover-control.default.phone.button.route-discover-cache-confirm-h-6c19d3ba",
    sourceLogin: "discover.button.discover-control.default.phone.button.route-discover-source-login-h-9f28109f",
    ruleTest: "discover.button.discover-control.default.phone.button.route-discover-rule-test-h-5706bebc",
    sourceBulk: "discover.button.discover-control.default.phone.button.route-discover-source-bulk-h-fc79eb67",
    filterMale: "discover.button.discover-control.default.phone.button.route-discover-filter-male-h-265b809d",
    filterFemale: "discover.button.discover-control.default.phone.button.route-discover-filter-female-h-43275f40",
    sortToggle: "discover.button.discover-control.default.phone.button.route-discover-sort-h-6adc507d",
    topRefresh: "discover.button.discover-control.default.phone.button.top-action-refresh-h-d8bed267"
  };

  // Discover 排序弹层（discover-sort，default state）
  const DISCOVER_SORT = {
    filterKeyword: "discover.button.discover-sort.default.phone.button.route-discover-filter-keyword-h-4147e432",
    filterMale: "discover.button.discover-sort.default.phone.button.route-discover-filter-male-h-1b7e5470",
    filterFemale: "discover.button.discover-sort.default.phone.button.route-discover-filter-female-h-1658b1bb",
    filterSourceType: "discover.button.discover-sort.default.phone.button.route-discover-filter-source-type-h-fdbe8abf",
    filterCategory: "discover.button.discover-sort.default.phone.button.route-discover-filter-category-h-03d0fe96",
    topRefresh: "discover.button.discover-sort.default.phone.button.top-action-refresh-h-ce1dd885",
    refreshing: "discover.button.discover-sort.default.phone.button.route-discover-refreshing-h-e9347356"
  };

  // Discover 状态路由的顶栏/重试按钮
  const DISCOVER_STATE = {
    noResultsReset: "discover.button.discover-no-results.empty.phone.button.route-discover-h-a9436943",
    noResultsControl: "discover.button.discover-no-results.empty.phone.button.route-discover-control-h-145e7fb3",
    noResultsRefresh: "discover.button.discover-no-results.empty.phone.button.route-discover-refreshing-h-e22259ff",
    loadingRefresh: "discover.button.discover-loading.loading.phone.button.route-discover-refreshing-h-48be3229",
    refreshingTopRefresh: "discover.button.discover-refreshing.default.phone.button.top-action-refresh-h-73ca9e76",
    refreshingRetry: "discover.button.discover-refreshing.default.phone.button.route-discover-refreshing-h-613f33e7"
  };

  // Discover 书籍行（listrow-action）— 5 条样例，按位置稳定
  const DISCOVER_BOOK_ROWS = [
    "discover.listrow-action.discover.default.phone.button.route-book-detail-h-9bd140e8",
    "discover.listrow-action.discover.default.phone.button.route-book-detail-h-6dc96d63",
    "discover.listrow-action.discover.default.phone.button.route-book-detail-h-e4979b03",
    "discover.listrow-action.discover.default.phone.button.route-book-detail-h-461760fe",
    "discover.listrow-action.discover.default.phone.button.route-book-detail-h-5068f5e8"
  ];

  // --- RSS 域 ---------------------------------------------------------------

  // RSS 顶栏（rss default state）
  const RSS_TOP = {
    refreshing: "rss.button.rss.default.phone.button.route-rss-refreshing-h-e098b611",
    subscriptionManagement: "rss.button.rss.default.phone.button.route-rss-subscription-management-h-2296df25",
    search: "rss.button.rss.default.phone.button.route-rss-search-h-6ed3337c",
    home: "rss.button.rss.default.phone.button.route-rss-h-c7ddc5db",
    all: "rss.button.rss.default.phone.button.route-rss-all-h-6abc4394",
    starred: "rss.button.rss.default.phone.button.route-rss-starred-h-c5cee3a5",
    ruleSubscription: "rss.button.rss.default.phone.button.route-rss-rule-subscription-h-f1322f55",
    sourceImport: "rss.button.rss.default.phone.button.route-rss-source-import-h-6e5b86e4",
    sourceEdit: "rss.button.rss.default.phone.button.route-rss-source-edit-h-bd66e5ad"
  };

  // RSS 主标签导航（nav-type-*）
  const RSS_NAV = {
    bookshelf: "rss.button.rss.default.phone.button.nav-type-bookshelf-h-b431f7fc",
    discover: "rss.button.rss.default.phone.button.nav-type-discover-h-dfef3a8e",
    rss: "rss.button.rss.default.phone.button.nav-type-rss-h-8be0e08f",
    settings: "rss.button.rss.default.phone.button.nav-type-settings-h-6856dfaa"
  };

  // RSS 模式导航（rssModeNav：源列表/全部/收藏/规则订阅）
  // 使用 rss default state 下 4 个 route-rss-* 控件作为稳定 ID
  const RSS_MODE_NAV = {
    sources: RSS_TOP.home,
    all: RSS_TOP.all,
    starred: RSS_TOP.starred,
    ruleSubscription: RSS_TOP.ruleSubscription
  };

  // RSS 单源条目（rss-source-feed default state）
  const RSS_SOURCE_FEED = {
    refreshing: "rss.button.rss-source-feed.default.phone.button.route-rss-refreshing-h-232451d1",
    sourceEdit: "rss.button.rss-source-feed.default.phone.button.route-rss-source-edit-h-1bdb8b03",
    readRecord: "rss.button.rss-source-feed.default.phone.button.route-rss-read-record-h-904ebca5",
    sourceDebug: "rss.button.rss-source-feed.default.phone.button.route-rss-source-debug-h-208fcbe1",
    sourceActions: "rss.button.rss-source-feed.default.phone.button.route-rss-source-actions-h-4964ef99"
  };

  // RSS 文章行（listrow-action rss default state -> rss-detail）— 3 条样例
  const RSS_ARTICLE_ROWS = [
    "rss.listrow-action.rss.default.phone.button.route-rss-detail-h-8c803e8d",
    "rss.listrow-action.rss.default.phone.button.route-rss-detail-h-ef8e35b6",
    "rss.listrow-action.rss.default.phone.button.route-rss-detail-h-80371da1"
  ];

  // RSS 刷新中状态（rss-refreshing refreshing state）
  const RSS_REFRESHING = {
    home: "rss.button.rss-refreshing.refreshing.phone.button.route-rss-h-10ad0b20",
    all: "rss.button.rss-refreshing.refreshing.phone.button.route-rss-all-h-86e1c0e8",
    search: "rss.button.rss-refreshing.refreshing.phone.button.route-rss-search-h-5c1db42a"
  };

  // RSS 状态路由（rss-empty / rss-error）
  const RSS_STATE = {
    emptyAll: "rss.button.rss-empty.empty.phone.button.route-rss-all-h-dd917b5f",
    emptyManagement: "rss.button.rss-empty.empty.phone.button.route-rss-subscription-management-h-8429a214",
    errorRefresh: "rss.button.rss-error.error.phone.button.route-rss-refreshing-h-9c7ab4f5",
    errorManagement: "rss.button.rss-error.error.phone.button.route-rss-subscription-management-h-1581f70f"
  };

  // --- UiEvent 规范化提示 ---------------------------------------------------
  // 这些控件在 IC0 audit 中标记为 ambiguous-needs-review（缺 canonical
  // UiEvent），B3 实现时同时设置 data-ui-event，使后续 audit 能升级为
  // auto-mapped。事件名遵循 ScreenGraph 既有的 uiEvent 词汇（route.push /
  // tab.item.select / refresh.invoke / filter.apply 等）。

  const UI_EVENT_HINTS = Object.freeze({
    [DISCOVER_TOP_REFRESH]: "refresh.invoke",
    [DISCOVER_ENTRY.control]: "route.push",
    [DISCOVER_ENTRY.refreshing]: "route.push",
    [DISCOVER_CONTROL.backToDiscover]: "route.push",
    [DISCOVER_CONTROL.switchingSource]: "route.push",
    [DISCOVER_CONTROL.cacheConfirm]: "route.push",
    [DISCOVER_CONTROL.sourceLogin]: "route.push",
    [DISCOVER_CONTROL.ruleTest]: "route.push",
    [DISCOVER_CONTROL.sourceBulk]: "route.push",
    [DISCOVER_CONTROL.filterMale]: "filter.apply",
    [DISCOVER_CONTROL.filterFemale]: "filter.apply",
    [DISCOVER_CONTROL.sortToggle]: "sort.cycle",
    [DISCOVER_SORT.filterKeyword]: "filter.apply",
    [DISCOVER_SORT.filterMale]: "filter.apply",
    [DISCOVER_SORT.filterFemale]: "filter.apply",
    [DISCOVER_SORT.filterSourceType]: "filter.apply",
    [DISCOVER_SORT.filterCategory]: "filter.apply",
    [DISCOVER_SORT.refreshing]: "route.push",
    [DISCOVER_STATE.noResultsReset]: "filter.reset",
    [DISCOVER_STATE.noResultsControl]: "route.push",
    [DISCOVER_STATE.noResultsRefresh]: "refresh.invoke",
    [DISCOVER_STATE.loadingRefresh]: "refresh.invoke",
    [DISCOVER_STATE.refreshingTopRefresh]: "refresh.invoke",
    [DISCOVER_STATE.refreshingRetry]: "refresh.invoke",
    [RSS_TOP.refreshing]: "refresh.invoke",
    [RSS_TOP.subscriptionManagement]: "route.push",
    [RSS_TOP.search]: "route.push",
    [RSS_TOP.home]: "tab.item.select",
    [RSS_TOP.all]: "tab.item.select",
    [RSS_TOP.starred]: "tab.item.select",
    [RSS_TOP.ruleSubscription]: "tab.item.select",
    [RSS_TOP.sourceImport]: "route.push",
    [RSS_TOP.sourceEdit]: "route.push",
    [RSS_SOURCE_FEED.refreshing]: "refresh.invoke",
    [RSS_SOURCE_FEED.sourceEdit]: "route.push",
    [RSS_SOURCE_FEED.readRecord]: "route.push",
    [RSS_SOURCE_FEED.sourceDebug]: "route.push",
    [RSS_SOURCE_FEED.sourceActions]: "route.push",
    [RSS_REFRESHING.home]: "route.push",
    [RSS_REFRESHING.all]: "route.push",
    [RSS_REFRESHING.search]: "route.push",
    [RSS_STATE.emptyAll]: "route.push",
    [RSS_STATE.emptyManagement]: "route.push",
    [RSS_STATE.errorRefresh]: "refresh.invoke",
    [RSS_STATE.errorManagement]: "route.push"
  });

  // --- 便捷查询 -------------------------------------------------------------

  function allDiscoverControlIds() {
    return Object.values(DISCOVER_ENTRY)
      .concat(Object.values(DISCOVER_CONTROL))
      .concat(Object.values(DISCOVER_SORT))
      .concat(Object.values(DISCOVER_STATE))
      .concat(DISCOVER_BOOK_ROWS)
      .concat([DISCOVER_TOP_REFRESH]);
  }

  function allRssControlIds() {
    return Object.values(RSS_TOP)
      .concat(Object.values(RSS_NAV))
      .concat(Object.values(RSS_SOURCE_FEED))
      .concat(Object.values(RSS_REFRESHING))
      .concat(Object.values(RSS_STATE))
      .concat(RSS_ARTICLE_ROWS);
  }

  function uiEventFor(controlId) {
    return UI_EVENT_HINTS[controlId] || null;
  }

  window.ReaderDiscoverRssControlIds = Object.freeze({
    DISCOVER_TOP_REFRESH,
    DISCOVER_ENTRY,
    DISCOVER_CONTROL,
    DISCOVER_SORT,
    DISCOVER_STATE,
    DISCOVER_BOOK_ROWS,
    RSS_TOP,
    RSS_NAV,
    RSS_MODE_NAV,
    RSS_SOURCE_FEED,
    RSS_ARTICLE_ROWS,
    RSS_REFRESHING,
    RSS_STATE,
    UI_EVENT_HINTS,
    allDiscoverControlIds,
    allRssControlIds,
    uiEventFor
  });
})(typeof window !== "undefined" ? window : this);
