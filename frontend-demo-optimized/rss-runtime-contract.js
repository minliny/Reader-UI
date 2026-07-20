(function attachRssRuntimeContract(window) {
  "use strict";

  const PRIMARY_ROUTES = Object.freeze([
    "rss",
    "rss-all",
    "rss-source-feed",
    "rss-source-category-novel",
    "rss-source-category-tech",
    "rss-source-category-booklist",
    "rss-refreshing",
    "rss-source-category-releases",
    "rss-source-category-issues",
    "rss-source-category-discussions"
  ]);

  const FEED_IDS = Object.freeze([
    "github-releases",
    "reader-discussions",
    "source-maintenance",
    "local-system"
  ]);
  const ARTICLE_IDS = Object.freeze([
    "reader-ui-update",
    "source-rule-debug",
    "legado-rss-config",
    "local-import-complete",
    "reader-roadmap"
  ]);

  const CONTROL_SPECS = [];
  function add(route, selector, settingsKey, uiEvent, label, role, focusReturn) {
    CONTROL_SPECS.push(Object.freeze({
      route,
      selector,
      settingsKey,
      uiEvent,
      label,
      role: role || "button",
      focusReturn: Boolean(focusReturn)
    }));
  }

  function addBack(route) {
    add(route, "[data-slot='backTopBar'] > button", "back", "route.pop", "返回 RSS");
  }
  function addSearch(route) {
    add(route, "[data-route='rss-search']", "search-open", "search.open", "搜索订阅源、文章标题或分组", "button", true);
  }
  function addModes(route) {
    add(route, ".fd-rss-mode-row [data-route='rss']", "mode-sources", "tab.item.select", "源列表");
    add(route, ".fd-rss-mode-row [data-route='rss-all']", "mode-all", "tab.item.select", "全部文章");
    add(route, ".fd-rss-mode-row [data-route='rss-starred']", "mode-starred", "tab.item.select", "收藏文章");
    add(route, ".fd-rss-mode-row [data-route='rss-rule-subscription']", "mode-rule-subscription", "rss.subscription.open", "规则订阅");
  }
  function addFeedEntries(route, tagName) {
    FEED_IDS.forEach((feedId) => add(
      route,
      `${tagName}[data-route='rss-source-feed'][data-rss-source-id='${feedId}']`,
      `feed-open-${feedId}`,
      "rss.subscription.open",
      `打开订阅源 ${feedId}`,
      "button",
      true
    ));
  }
  function addArticleEntries(route, articleIds) {
    articleIds.forEach((articleId) => add(
      route,
      `article[data-route='rss-detail'][data-rss-article-id='${articleId}']`,
      `article-open-${articleId}`,
      "rss.entry.open",
      `打开文章 ${articleId}`,
      "button",
      true
    ));
  }
  function addHomeBody(route) {
    add(route, "[data-route='rss-source-import']", "source-import", "source.import.open", "导入订阅源", "button", true);
    add(route, ".fd-rss-source-overview [data-route='rss-source-edit']", "source-create", "rss.subscription.add", "新建订阅源", "button", true);
    add(route, "[data-rss-group-filter-toggle]", "group-filter-toggle", "rss.filter.select", "筛选订阅源分组");
    addFeedEntries(route, "article");
    add(route, ".fd-rss-article-section header [data-route='rss-all']", "articles-view-all", "route.push", "查看全部文章");
    addArticleEntries(route, ARTICLE_IDS.slice(0, 3));
  }

  add("rss", ".fd-rss-top-actions [data-route='rss-refreshing']", "refresh", "rss.refresh", "刷新当前订阅");
  add("rss", ".fd-rss-top-actions [data-route='rss-subscription-management']", "subscription-management", "rss.subscription.open", "进入订阅管理", "button", true);
  addSearch("rss");
  addModes("rss");
  addHomeBody("rss");
  ["bookshelf", "discover", "rss", "settings"].forEach((tab) => add(
    "rss",
    `[data-slot='mainNav'] [data-nav-type='${tab}']`,
    `main-tab-${tab}`,
    "mainTab.select",
    `切换主导航 ${tab}`
  ));

  addBack("rss-all");
  addSearch("rss-all");
  addModes("rss-all");
  addFeedEntries("rss-all", "button");
  add("rss-all", ".fd-rss-article-section header [data-route='rss-subscription-management']", "subscription-management", "rss.subscription.open", "管理订阅源", "button", true);
  addArticleEntries("rss-all", ARTICLE_IDS);

  addBack("rss-refreshing");
  addSearch("rss-refreshing");
  addModes("rss-refreshing");
  addHomeBody("rss-refreshing");

  function addSourceRoute(route, articleIds) {
    addBack(route);
    add(route, ".fd-rss-source-toolbar [data-route='rss-refreshing']", "refresh", "rss.refresh", "刷新订阅源");
    add(route, ".fd-rss-source-toolbar [data-route='rss-source-edit']", "source-edit", "rss.subscription.edit", "编辑订阅源", "button", true);
    add(route, ".fd-rss-source-toolbar [data-route='rss-read-record']", "read-record", "route.push", "查看阅读记录");
    add(route, ".fd-rss-source-toolbar [data-route='rss-source-debug']", "source-debug", "source.debug.open", "调试订阅源", "button", true);
    add(route, "[data-rss-category-filter-toggle]", "category-filter-toggle", "rss.sourceFilter.select", "筛选订阅源分类");
    add(route, ".fd-rss-article-section header [data-route='rss-source-actions']", "source-actions", "route.push", "打开订阅源操作", "button", true);
    addArticleEntries(route, articleIds);
  }
  addSourceRoute("rss-source-feed", ["reader-ui-update"]);
  addSourceRoute("rss-source-category-novel", []);
  addSourceRoute("rss-source-category-tech", ["reader-ui-update"]);
  addSourceRoute("rss-source-category-booklist", []);
  addSourceRoute("rss-source-category-releases", ["reader-ui-update"]);
  addSourceRoute("rss-source-category-issues", []);
  addSourceRoute("rss-source-category-discussions", []);

  const ROUTE_SET = new Set(PRIMARY_ROUTES);
  const SPEC_BY_ROUTE = new Map();
  CONTROL_SPECS.forEach((spec) => {
    const routeSpecs = SPEC_BY_ROUTE.get(spec.route) || [];
    routeSpecs.push(spec);
    SPEC_BY_ROUTE.set(spec.route, routeSpecs);
  });

  function identityFor(spec) {
    const entityKey = `rss.control.${spec.role}.${spec.settingsKey}`;
    return Object.freeze({
      entityKey,
      controlKey: `${entityKey}@${spec.route}.default`,
      controlId: `rss.control.${spec.route}.default.${spec.role}.${spec.settingsKey}`,
      uiEvent: spec.uiEvent,
      settingsKey: spec.settingsKey
    });
  }

  function viewportFor(root) {
    const viewportHost = typeof root.closest === "function" ? root.closest(".fd-demo") : null;
    const width = Number(viewportHost?.getAttribute?.("data-viewport-width")) || 390;
    const orientation = viewportHost?.getAttribute?.("data-orientation") || "portrait";
    return orientation === "landscape" || width >= 600 ? "tablet" : "phone";
  }

  function instrumentDom(root, route) {
    if (!root || !ROUTE_SET.has(route)) return Object.freeze({ route, stamped: 0, missing: 0, ambiguous: 0 });
    const viewport = viewportFor(root);
    let stamped = 0;
    let missing = 0;
    let ambiguous = 0;
    (SPEC_BY_ROUTE.get(route) || []).forEach((spec) => {
      const matches = Array.from(root.querySelectorAll(spec.selector));
      if (matches.length === 0) {
        missing += 1;
        return;
      }
      if (matches.length !== 1) {
        ambiguous += 1;
        return;
      }
      const node = matches[0];
      const identity = identityFor(spec);
      node.setAttribute("data-entity-key", identity.entityKey);
      node.setAttribute("data-control-key", identity.controlKey);
      node.setAttribute("data-control-id", identity.controlId);
      node.setAttribute("data-ui-event", identity.uiEvent);
      node.setAttribute("data-settings-key", identity.settingsKey);
      node.setAttribute("data-viewport", viewport);
      if (spec.focusReturn) node.setAttribute("data-restore-focus", identity.controlKey);
      if (node.tagName?.toLowerCase() === "article") {
        node.setAttribute("role", "button");
        if (!node.hasAttribute("tabindex")) node.setAttribute("tabindex", "0");
      }
      if (!node.hasAttribute("aria-label") && spec.label) node.setAttribute("aria-label", spec.label);
      stamped += 1;
    });
    root.setAttribute("data-rss-runtime-route", route);
    root.setAttribute("data-rss-runtime-identity-count", String(stamped));
    return Object.freeze({ route, stamped, missing, ambiguous });
  }

  function identityAttrs(spec, viewport) {
    const identity = identityFor(spec);
    const focusAttr = spec.focusReturn ? ` data-restore-focus="${identity.controlKey}"` : "";
    return ` data-entity-key="${identity.entityKey}" data-control-key="${identity.controlKey}" data-control-id="${identity.controlId}" data-ui-event="${identity.uiEvent}" data-settings-key="${identity.settingsKey}" data-viewport="${viewport}"${focusAttr}`;
  }

  function instrumentHtml(html, route) {
    if (!ROUTE_SET.has(route)) return String(html || "");
    const specs = SPEC_BY_ROUTE.get(route) || [];
    const source = String(html || "");
    const matches = [...source.matchAll(/<(button\b[^>]*|article\b(?=[^>]*\bdata-route=)[^>]*)>/g)];
    if (matches.length !== specs.length) return source;
    const orientation = Number(window.innerWidth) > Number(window.innerHeight) ? "landscape" : "portrait";
    const viewport = orientation === "landscape" || Number(window.innerWidth) >= 600 ? "tablet" : "phone";
    let cursor = 0;
    return source.replace(/<(button\b[^>]*|article\b(?=[^>]*\bdata-route=)[^>]*)>/g, (tag, body) => {
      const spec = specs[cursor++];
      const articleAttrs = body.startsWith("article") && !/\brole=/.test(body) ? ' role="button" tabindex="0"' : "";
      const ariaAttr = /\baria-label=/.test(body) ? "" : ` aria-label="${spec.label}"`;
      return `<${body}${articleAttrs}${ariaAttr}${identityAttrs(spec, viewport)}>`;
    });
  }

  const INITIAL_STATE = Object.freeze({
    phase: "ready",
    selectedFeedId: "github-releases",
    selectedArticleId: null,
    request: null,
    requestEpoch: 0,
    error: null,
    focusReturnKey: null
  });

  function cloneInitialState() {
    return { ...INITIAL_STATE };
  }

  function reducer(state, action) {
    const current = state || cloneInitialState();
    switch (action?.type) {
      case "SELECT_FEED":
        if (!FEED_IDS.includes(action.feedId)) return current;
        return { ...current, selectedFeedId: action.feedId, focusReturnKey: action.focusReturnKey || current.focusReturnKey };
      case "SELECT_ARTICLE":
        if (!ARTICLE_IDS.includes(action.articleId)) return current;
        return { ...current, phase: "detail", selectedArticleId: action.articleId, error: null, focusReturnKey: action.focusReturnKey || current.focusReturnKey };
      case "DETAIL_CLOSE":
        return { ...current, phase: "ready", selectedArticleId: null };
      case "SHOW_EMPTY":
        return { ...current, phase: "empty", selectedArticleId: null, error: null };
      case "SHOW_ERROR":
        return { ...current, phase: "error", error: action.error || "RSS 刷新失败" };
      case "RESET":
        return cloneInitialState();
      case "REQUEST_START":
        return { ...current, phase: "loading", error: null, request: { id: action.requestId, status: "loading" }, requestEpoch: action.epoch };
      case "REQUEST_SUCCESS":
        if (current.request?.id !== action.requestId) return current;
        return { ...current, phase: "ready", request: { id: action.requestId, status: "success" }, error: null };
      case "REQUEST_FAILED":
        if (current.request?.id !== action.requestId) return current;
        return { ...current, phase: "error", request: { id: action.requestId, status: "failed" }, error: action.error || "RSS 刷新失败" };
      case "REQUEST_CANCEL":
        if (current.request?.status !== "loading") return current;
        return { ...current, phase: "ready", request: { ...current.request, status: "cancelled" }, requestEpoch: current.requestEpoch + 1 };
      default:
        return current;
    }
  }

  function createOwner(initialState) {
    let state = { ...cloneInitialState(), ...(initialState || {}) };
    const listeners = new Set();
    return Object.freeze({
      getState: () => state,
      dispatch(action) {
        const previous = state;
        state = reducer(state, action);
        if (state !== previous) listeners.forEach((listener) => listener(state, previous, action));
        return state;
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }
    });
  }

  let requestSequence = 0;
  async function executeRefresh(owner, effect) {
    if (!owner || typeof owner.dispatch !== "function") return Object.freeze({ status: "invalid" });
    if (owner.getState().request?.status === "loading") return Object.freeze({ status: "duplicate" });
    const epoch = owner.getState().requestEpoch + 1;
    const requestId = `rss-refresh:${++requestSequence}`;
    owner.dispatch({ type: "REQUEST_START", requestId, epoch });
    try {
      const value = await (typeof effect === "function" ? effect({ requestId, epoch }) : Promise.resolve());
      const before = owner.getState();
      if (before.request?.id !== requestId || before.request?.status !== "loading" || before.requestEpoch !== epoch) {
        return Object.freeze({ status: "stale", requestId });
      }
      owner.dispatch({ type: "REQUEST_SUCCESS", requestId });
      return Object.freeze({ status: "success", requestId, value });
    } catch (error) {
      const before = owner.getState();
      if (before.request?.id !== requestId || before.request?.status !== "loading" || before.requestEpoch !== epoch) {
        return Object.freeze({ status: "stale", requestId });
      }
      owner.dispatch({ type: "REQUEST_FAILED", requestId, error: error?.message || String(error) });
      return Object.freeze({ status: "failed", requestId });
    }
  }

  function cancelRefresh(owner) {
    if (!owner || owner.getState().request?.status !== "loading") return Object.freeze({ status: "idle" });
    owner.dispatch({ type: "REQUEST_CANCEL" });
    return Object.freeze({ status: "cancelled" });
  }

  function stateHostHtml(state) {
    const current = state || INITIAL_STATE;
    if (current.phase === "loading") return '<section class="fd-rss-runtime-state" role="status" aria-live="polite" aria-busy="true">正在刷新 RSS</section>';
    if (current.phase === "error") return `<section class="fd-rss-runtime-state" role="alert" aria-live="assertive">${String(current.error || "RSS 刷新失败")}</section>`;
    if (current.phase === "empty") return '<section class="fd-rss-runtime-state" role="status" aria-live="polite">当前没有 RSS 内容</section>';
    if (current.phase === "detail") return `<section class="fd-rss-runtime-state" role="region" aria-live="polite" data-rss-detail-id="${current.selectedArticleId || ""}">已打开文章详情</section>`;
    return "";
  }

  const api = Object.freeze({
    PRIMARY_ROUTES,
    FEED_IDS,
    ARTICLE_IDS,
    CONTROL_SPECS: Object.freeze(CONTROL_SPECS.slice()),
    INITIAL_STATE,
    identityFor,
    instrumentHtml,
    instrumentDom,
    reducer,
    createOwner,
    executeRefresh,
    cancelRefresh,
    stateHostHtml
  });

  window.ReaderRssRuntimeContract = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
