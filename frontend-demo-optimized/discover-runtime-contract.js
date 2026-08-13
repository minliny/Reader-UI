(function attachDiscoverRuntimeContract(window) {
  "use strict";

  const PRIMARY_ROUTES = Object.freeze([
    "discover", "discover-home", "discover-control", "discover-sort",
    "discover-entry-bestseller", "discover-entry-booklist", "discover-entry-category",
    "discover-entry-finished", "discover-entry-latest", "discover-entry-new",
    "discover-entry-ranking", "discover-entry-source"
  ]);
  const SECONDARY_ROUTES = Object.freeze([
    "discover-filter-keyword", "discover-filter-male", "discover-filter-female",
    "discover-sort-popularity", "discover-sort-update", "discover-sort-collection",
    "discover-sort-finished", "discover-sort-words", "discover-no-results",
    "discover-loading", "discover-refreshing", "discover-infinite-loading",
    "discover-page-two", "discover-cache-confirm", "discover-cache-toast",
    "discover-login-return", "discover-switching-source", "discover-switched-source",
    "discover-entry-error", "discover-empty", "discover-error", "discover-source-login",
    "discover-rule-test", "discover-source-bulk", "discover-filter-source-type",
    "discover-filter-category", "discover-cache-empty", "discover-cache-stale",
    "discover-cache-fresh"
  ]);
  const ALL_ROUTES = Object.freeze(PRIMARY_ROUTES.concat(SECONDARY_ROUTES));
  const SECTION_IDS = Object.freeze(["source", "entries", "filters", "results"]);
  const BOOK_IDS = Object.freeze(["long-night", "mystery-lord", "three-body", "ming-dynasty-stories", "paper-city"]);
  const SOURCE_IDS = Object.freeze(["youshu", "qidian-import", "light-novel-library", "local-aggregate"]);
  const ENTRY_IDS = Object.freeze(["ranking", "source", "category", "finished", "latest", "booklist", "bestseller", "new"]);
  const FILTER_IDS = Object.freeze(["keyword", "male", "female", "licensed-source", "category"]);
  const SORT_IDS = Object.freeze(["popularity", "update", "collection", "finished", "words"]);

  const CONTROL_SPECS = [];
  function add(route, settingsKey, uiEvent, label, role, focusReturn) {
    CONTROL_SPECS.push(Object.freeze({
      route, state: "default", settingsKey, uiEvent, label,
      role: role || "button", focusReturn: focusReturn !== false
    }));
  }
  function addTop(route) { add(route, "refresh", "discover.refresh", "刷新发现内容"); }
  function addSourceBar(route) { add(route, "source-bar-youshu", "route.push", "打开发现书源控制层"); }
  function addEntries(route) {
    ["ranking", "source", "category", "finished", "latest", "booklist"].forEach((id) =>
      add(route, `entry-${id}`, "discover.entry.select", `选择发现入口 ${id}`));
  }
  function addBooks(route) {
    BOOK_IDS.forEach((id) => add(route, `book-open-${id}`, "route.push", `打开发现书籍 ${id}`, "listrow-action"));
  }
  function addNav(route) {
    ["bookshelf", "discover", "rss", "settings"].forEach((id) =>
      add(route, `main-tab-${id}`, "mainTab.select", `切换主导航 ${id}`, "button", false));
  }
  function addStandard(route) {
    addTop(route);
    addSourceBar(route);
    addEntries(route);
    add(route, "filter-toggle", "discover.sort.toggle", "展开发现筛选与排序");
    add(route, "filter-apply", "discover.filter.apply", "应用发现筛选");
    addBooks(route);
    addNav(route);
  }
  [
    "discover", "discover-home", "discover-entry-bestseller", "discover-entry-booklist",
    "discover-entry-category", "discover-entry-finished", "discover-entry-latest",
    "discover-entry-new", "discover-entry-ranking", "discover-entry-source"
  ].forEach(addStandard);

  addTop("discover-control");
  addSourceBar("discover-control");
  SOURCE_IDS.forEach((id) => add("discover-control", `source-select-${id}`, "discover.sourceType.select", `选择发现书源 ${id}`));
  addEntries("discover-control");
  ["male", "female"].forEach((id) => add("discover-control", `filter-${id}`, "discover.filter.apply", `选择发现筛选 ${id}`));
  add("discover-control", "sort-toggle", "discover.sort.toggle", "展开发现排序");
  add("discover-control", "filter-reset", "discover.filter.reset", "重置发现筛选");
  add("discover-control", "filter-apply", "discover.filter.apply", "应用发现筛选");
  add("discover-control", "entry-refresh", "discover.refresh", "刷新发现入口");
  add("discover-control", "cache-clear", "route.push", "清除发现缓存");
  add("discover-control", "source-login", "route.push", "登录发现书源");
  add("discover-control", "source-edit", "source.edit.open", "编辑发现书源");
  add("discover-control", "source-manage", "route.push", "管理发现书源");
  addBooks("discover-control");
  addNav("discover-control");

  addTop("discover-sort");
  addSourceBar("discover-sort");
  addEntries("discover-sort");
  add("discover-sort", "filter-toggle", "discover.sort.toggle", "展开发现筛选与排序");
  add("discover-sort", "filter-apply", "discover.filter.apply", "应用发现筛选");
  FILTER_IDS.forEach((id) => add("discover-sort", `filter-${id}`, "discover.filter.apply", `选择发现筛选 ${id}`));
  SORT_IDS.forEach((id) => add("discover-sort", `sort-${id}`, "discover.sort.toggle", `选择发现排序 ${id}`));
  addBooks("discover-sort");
  addNav("discover-sort");

  const PRIMARY_SET = new Set(PRIMARY_ROUTES);
  const SPECS_BY_ROUTE = new Map();
  CONTROL_SPECS.forEach((spec) => {
    const specs = SPECS_BY_ROUTE.get(spec.route) || [];
    specs.push(spec);
    SPECS_BY_ROUTE.set(spec.route, specs);
  });
  function identityFor(spec) {
    const entityKey = `discover.control.${spec.role}.${spec.settingsKey}`;
    return Object.freeze({
      entityKey,
      controlKey: `${entityKey}@${spec.route}.default`,
      controlId: `discover.control.${spec.route}.default.${spec.role}.${spec.settingsKey}`,
      uiEvent: spec.uiEvent,
      settingsKey: spec.settingsKey
    });
  }
  function instrumentHtml(html, route) {
    const source = String(html || "");
    if (!PRIMARY_SET.has(route)) return source;
    const specs = SPECS_BY_ROUTE.get(route) || [];
    const controlPattern = /<(button\b[^>]*|article\b(?=[^>]*\bdata-route=)[^>]*)>/g;
    const matches = [...source.matchAll(controlPattern)];
    if (matches.length !== specs.length) return source;
    let index = 0;
    const stamped = source.replace(controlPattern, (_tag, body) => {
      const spec = specs[index++];
      const identity = identityFor(spec);
      const articleAttrs = body.startsWith("article") && !/\brole=/.test(body) ? ' role="button" tabindex="0"' : "";
      const aria = /\baria-label=/.test(body) ? "" : ` aria-label="${spec.label}"`;
      const restore = spec.focusReturn ? ` data-restore-focus="${identity.controlKey}"` : "";
      const bookId = spec.settingsKey.startsWith("book-open-") ? spec.settingsKey.slice("book-open-".length) : "";
      const sourceId = spec.settingsKey === "source-bar-youshu"
        ? "youshu"
        : spec.settingsKey.startsWith("source-select-") ? spec.settingsKey.slice("source-select-".length) : "";
      const stableEntityAttrs = bookId
        ? ` data-book-id="${bookId}" data-discover-card-id="book-${bookId}"`
        : sourceId ? ` data-discover-source-id="${sourceId}"` : "";
      const selectedState = spec.settingsKey.startsWith("sort-")
        ? ` aria-pressed="${spec.settingsKey === "sort-popularity" ? "true" : "false"}"`
        : spec.settingsKey.startsWith("filter-") && spec.settingsKey !== "filter-toggle" && spec.settingsKey !== "filter-apply" && spec.settingsKey !== "filter-reset"
          ? ` aria-pressed="${spec.settingsKey === "filter-male" ? "true" : "false"}"`
          : "";
      return `<${body}${articleAttrs}${aria}${stableEntityAttrs}${selectedState} data-entity-key="${identity.entityKey}" data-control-key="${identity.controlKey}" data-control-id="${identity.controlId}" data-ui-event="${identity.uiEvent}" data-settings-key="${identity.settingsKey}"${restore}>`;
    });
    return stamped
      .replace(/class="fd-discover-source-bar([^"]*)"/, 'class="fd-discover-source-bar$1" data-discover-section-id="source"')
      .replace(/class="fd-discover-entry-row"/, 'class="fd-discover-entry-row" data-discover-section-id="entries"')
      .replace(/class="fd-filter-control ([^"]*)"/, 'class="fd-filter-control $1" data-discover-section-id="filters"')
      .replace(/class="fd-discover-book-list([^"]*)"/, 'class="fd-discover-book-list$1" data-discover-section-id="results"')
      .replace(/class="fd-discover-control-panel([^"]*)"/, 'class="fd-discover-control-panel$1" data-discover-section-id="source"');
  }

  const INITIAL_STATE = Object.freeze({
    phase: "ready",
    sectionId: "ranking",
    selectedEntryId: "ranking",
    selectedBookId: null,
    selectedSourceId: "youshu",
    selectedFilterId: "male",
    selectedSortId: "popularity",
    page: 1,
    request: null,
    requestEpoch: 0,
    error: null,
    closed: false,
    focusReturnKey: null
  });
  function defaults() { return { ...INITIAL_STATE }; }
  function reducer(state, action) {
    const current = state || defaults();
    switch (action?.type) {
      case "ENTRY_SELECT":
        if (!ENTRY_IDS.includes(action.entryId)) return current;
        return { ...current, phase: "ready", sectionId: action.entryId, selectedEntryId: action.entryId, page: 1, error: null, focusReturnKey: action.focusReturnKey || current.focusReturnKey };
      case "BOOK_SELECT":
        if (!BOOK_IDS.includes(action.bookId)) return current;
        return { ...current, selectedBookId: action.bookId, focusReturnKey: action.focusReturnKey || current.focusReturnKey };
      case "SOURCE_SELECT":
        if (!SOURCE_IDS.includes(action.sourceId)) return current;
        return { ...current, selectedSourceId: action.sourceId, page: 1, error: null, focusReturnKey: action.focusReturnKey || current.focusReturnKey };
      case "FILTER_SELECT":
        if (!FILTER_IDS.includes(action.filterId)) return current;
        return { ...current, selectedFilterId: action.filterId, page: 1, error: null };
      case "SORT_SELECT":
        if (!SORT_IDS.includes(action.sortId)) return current;
        return { ...current, selectedSortId: action.sortId, page: 1, error: null };
      case "REQUEST_START":
        if (current.request?.status === "loading") return current;
        return { ...current, phase: action.kind === "load-more" ? "loading-more" : "loading", request: { id: action.requestId, kind: action.kind, status: "loading" }, requestEpoch: action.epoch, error: null, closed: false };
      case "REQUEST_SUCCESS":
        if (current.request?.id !== action.requestId || current.request.status !== "loading") return current;
        return { ...current, phase: "ready", page: current.request.kind === "load-more" ? current.page + 1 : current.page, request: { ...current.request, status: "success" }, error: null };
      case "REQUEST_FAILED":
        if (current.request?.id !== action.requestId || current.request.status !== "loading") return current;
        return { ...current, phase: "error", request: { ...current.request, status: "failed" }, error: action.error || "发现内容加载失败" };
      case "CLOSE":
        return { ...current, phase: "closed", request: current.request?.status === "loading" ? { ...current.request, status: "cancelled" } : current.request, requestEpoch: current.requestEpoch + 1, closed: true, focusReturnKey: action.focusReturnKey || current.focusReturnKey };
      case "RESET":
        return defaults();
      default:
        return current;
    }
  }
  function createOwner(initialState) {
    let state = { ...defaults(), ...(initialState || {}) };
    const listeners = new Set();
    return Object.freeze({
      getState: () => state,
      dispatch(action) {
        const previous = state;
        state = reducer(state, action);
        if (state !== previous) listeners.forEach((listener) => listener(state, previous, action));
        return state;
      },
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
    });
  }
  let requestSequence = 0;
  async function execute(owner, kind, effect) {
    if (!owner || typeof owner.dispatch !== "function") return Object.freeze({ status: "invalid" });
    if (owner.getState().request?.status === "loading") return Object.freeze({ status: "duplicate" });
    const epoch = owner.getState().requestEpoch + 1;
    const requestId = `discover-${kind}:${++requestSequence}`;
    owner.dispatch({ type: "REQUEST_START", requestId, epoch, kind });
    try {
      const value = await (typeof effect === "function" ? effect({ requestId, epoch, kind }) : Promise.resolve());
      const before = owner.getState();
      if (before.request?.id !== requestId || before.request.status !== "loading" || before.requestEpoch !== epoch || before.closed) return Object.freeze({ status: "stale", requestId });
      owner.dispatch({ type: "REQUEST_SUCCESS", requestId });
      return Object.freeze({ status: "success", requestId, value });
    } catch (error) {
      const before = owner.getState();
      if (before.request?.id !== requestId || before.request.status !== "loading" || before.requestEpoch !== epoch || before.closed) return Object.freeze({ status: "stale", requestId });
      owner.dispatch({ type: "REQUEST_FAILED", requestId, error: error?.message || String(error) });
      return Object.freeze({ status: "failed", requestId });
    }
  }
  function close(owner, focusReturnKey) {
    if (!owner || owner.getState().closed) return Object.freeze({ status: "closed" });
    owner.dispatch({ type: "CLOSE", focusReturnKey });
    return Object.freeze({ status: "cancelled" });
  }

  const api = Object.freeze({
    PRIMARY_ROUTES, SECONDARY_ROUTES, ALL_ROUTES, SECTION_IDS, BOOK_IDS, SOURCE_IDS,
    ENTRY_IDS, FILTER_IDS, SORT_IDS, CONTROL_SPECS: Object.freeze(CONTROL_SPECS.slice()),
    defaults, reducer, createOwner, instrumentHtml,
    executeRefresh: (owner, effect) => execute(owner, "refresh", effect),
    executeLoadMore: (owner, effect) => execute(owner, "load-more", effect),
    executeRetry: (owner, effect) => execute(owner, "retry", effect),
    close
  });
  window.ReaderDiscoverRuntimeContract = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
