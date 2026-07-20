(function attachReaderRuntimeContract(window) {
  "use strict";

  const PRIMARY_ROUTES = Object.freeze([
    "immersive-reading",
    "reader",
    "reader-directory-overlay-v2",
    "reader-tts-overlay-v2",
    "reader-appearance-overlay-v2",
    "reader-settings-overlay-v2",
    "reader-search-overlay-v2",
    "reader-auto-scroll-overlay-v2",
    "reader-replace-overlay-v2",
    "reader-full-directory",
    "reader-full-tts",
    "reader-full-appearance",
    "reader-full-settings"
  ]);

  const COMPATIBILITY_ROUTE_CROSSWALK = Object.freeze({
    "toc-bookmarks": "reader-directory-overlay-v2",
    "tts": "reader-tts-overlay-v2",
    "reader-appearance": "reader-appearance-overlay-v2",
    "reader-settings": "reader-settings-overlay-v2",
    "content-search": "reader-search-overlay-v2",
    "auto-page": "reader-auto-scroll-overlay-v2",
    "content-replacement": "reader-replace-overlay-v2"
  });

  const ALL_ROUTES = Object.freeze(PRIMARY_ROUTES.concat(Object.keys(COMPATIBILITY_ROUTE_CROSSWALK)));
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

  function routesForVisual(canonicalRoute) {
    return [canonicalRoute].concat(
      Object.entries(COMPATIBILITY_ROUTE_CROSSWALK)
        .filter((entry) => entry[1] === canonicalRoute)
        .map((entry) => entry[0])
    );
  }

  const CONTROL_SURFACE_ROUTES = PRIMARY_ROUTES.filter((route) => route !== "immersive-reading")
    .concat(Object.keys(COMPATIBILITY_ROUTE_CROSSWALK));
  CONTROL_SURFACE_ROUTES.forEach((route) => {
    add(route, "[data-reader-dismiss]", "control-hide", "reader.control.toggle", "隐藏阅读控制层");
    add(route, "[data-reader-exit]", "reader-exit", "reader.exit", "退出阅读器");
    add(route, "[data-route='source-switch']", "source-switch-open", "reader.sourceSwitch.open", "打开换源", "button", true);
    add(route, "[data-reader-more-toggle]", "more-menu-toggle", "menu.toggle", "打开更多菜单", "button", true);
    add(route, "[data-reader-brightness-auto]", "brightness-auto-toggle", "toggle.switch", "自动亮度");
    ["directory", "tts", "appearance", "settings"].forEach((moduleName) => {
      add(route, `[data-module='${moduleName}']`, `module-${moduleName}`, "reader.module.switch", `切换 ${moduleName} 模块`, "button", true);
    });
  });

  add("immersive-reading", "[data-reader-page-action='prev']", "page-prev", "reader.page.prev", "上一页");
  add("immersive-reading", "[data-reader-control-show]", "control-show", "reader.control.toggle", "显示阅读控制层", "button", true);
  add("immersive-reading", "[data-reader-page-action='next']", "page-next", "reader.page.next", "下一页");

  add("reader", "[data-reader-panel-expand]", "panel-expand-settings", "reader.control.handleRelease", "展开完整设置", "button", true);
  [["search", "reader.contentSearch.open"], ["auto-page", "reader.autoPage.start"], ["replace", "reader.contentReplacement.open"]].forEach((item) => {
    add("reader", `[data-quick-action='${item[0]}']`, `quick-${item[0]}`, item[1], `打开 ${item[0]}`, "button", true);
  });
  [["prev", "reader.page.prev"], ["next", "reader.page.next"]].forEach((item) => {
    add("reader", `[data-reader-chapter-action='${item[0]}']`, `chapter-${item[0]}`, item[1], `${item[0]} chapter`);
  });
  add("reader", "[data-reader-chapter-progress]", "chapter-progress", "reader.chapter.jump", "调整章节进度");

  const CHAPTER_KEYS = ["chapter-30-old-day", "chapter-31-return", "chapter-32-rain-night", "chapter-33-lighthouse"];
  routesForVisual("reader-directory-overlay-v2").concat(["reader-full-directory"]).forEach((route) => {
    add(route, "[data-reader-panel-expand]", "panel-expand-directory", "reader.control.handleRelease", "展开完整目录", "button", true);
    add(route, ".fd-reader-full-grabber[data-reader-panel-collapse]", "panel-collapse-handle", "reader.control.handleRelease", "通过把手收起目录");
    add(route, ".fd-reader-full-head [data-reader-panel-collapse]", "panel-collapse-action", "reader.directory.close", "收起目录");
    [["directory", "目录"], ["bookmark", "书签"]].forEach((item) => {
      add(route, `[data-reader-toc-mode='${item[0]}']`, `toc-${item[0]}`, "tab.item.select", `切换到${item[1]}`);
    });
    CHAPTER_KEYS.forEach((chapterKey) => {
      add(route, `[data-reader-chapter-key='${chapterKey}']`, chapterKey, "reader.chapter.jump", `跳转 ${chapterKey}`, "button", true);
      add(route, `[data-reader-chapter-download-key='${chapterKey}']`, `download-${chapterKey}`, "download.task.open", `下载 ${chapterKey}`);
    });
    [["top", "顶部"], ["bottom", "底部"]].forEach((item) => {
      add(route, `[data-reader-directory-jump='${item[0]}']`, `directory-jump-${item[0]}`, "reader.chapter.jump", `跳到目录${item[1]}`);
    });
    add(route, "[data-reader-directory-sort]", "directory-sort", "selection.option.toggle", "切换目录排序");
  });

  routesForVisual("reader-tts-overlay-v2").concat(["reader-full-tts"]).forEach((route) => {
    add(route, "[data-reader-panel-expand]", "panel-expand-tts", "reader.control.handleRelease", "展开完整朗读", "button", true);
    add(route, ".fd-reader-full-grabber[data-reader-panel-collapse]", "panel-collapse-handle", "reader.control.handleRelease", "通过把手收起朗读");
    add(route, ".fd-reader-full-head [data-reader-panel-collapse]", "panel-collapse-action", "reader.tts.stop", "收起朗读");
    [["prev", "上一句"], ["toggle", "播放暂停"], ["next", "下一句"]].forEach((item) => {
      add(route, `[data-reader-tts-action='${item[0]}']`, `tts-${item[0]}`, item[0] === "toggle" ? "reader.tts.toggle" : "reader.chapter.jump", item[1]);
    });
    add(route, "[data-reader-session-stop='tts']", "tts-stop", "reader.tts.stop", "停止朗读");
    add(route, "[data-reader-tts-timer-preset]", "tts-timer-preset", "selection.option.toggle", "朗读定时", "select");
    add(route, "[data-reader-tts-speed-range]", "tts-speed", "selection.option.toggle", "朗读语速", "slider");
  });

  const THEMES = ["blue", "warm", "blue-night", "warm-night", "paper", "green", "paper-night", "green-night"];
  const FONTS = ["system", "serif", "sans", "kai", "fangsong", "mono", "source-han-serif", "lxgw-wenkai"];
  routesForVisual("reader-appearance-overlay-v2").concat(["reader-full-appearance"]).forEach((route) => {
    add(route, "[data-reader-panel-expand]", "panel-expand-appearance", "reader.control.handleRelease", "展开完整界面", "button", true);
    add(route, ".fd-reader-full-grabber[data-reader-panel-collapse]", "panel-collapse-handle", "reader.control.handleRelease", "通过把手收起界面");
    add(route, ".fd-reader-full-head [data-reader-panel-collapse]", "panel-collapse-action", "reader.settings.close", "收起界面");
    THEMES.forEach((value) => add(route, `[data-reader-theme='${value}']`, `theme-${value}`, "selection.option.toggle", `主题 ${value}`));
    FONTS.forEach((value) => add(route, `[data-reader-typography-set='fontFamily'][data-reader-typography-value='${value}']`, `font-${value}`, "selection.option.toggle", `字体 ${value}`));
    ["font-size-decrease", "font-size-increase", "line-height-decrease", "line-height-increase", "paragraph-gap-decrease", "paragraph-gap-increase", "letter-spacing-decrease", "letter-spacing-increase"].forEach((value) => {
      add(route, `[data-reader-typography-action='${value}']`, `typography-${value}`, "selection.option.toggle", value);
    });
  });

  const SETTING_OPTIONS = Object.freeze({
    screenOrientation: ["跟随系统", "竖屏", "横屏"],
    pageAnimation: ["覆盖", "滑动", "仿真", "滚动", "无动画"],
    screenTimeout: ["跟随系统", "1 分钟", "5 分钟", "10 分钟", "始终开启"]
  });
  routesForVisual("reader-settings-overlay-v2").concat(["reader-full-settings"]).forEach((route) => {
    add(route, "[data-reader-panel-expand]", "panel-expand-settings", "reader.control.handleRelease", "展开完整设置", "button", true);
    add(route, ".fd-reader-full-grabber[data-reader-panel-collapse]", "panel-collapse-handle", "reader.control.handleRelease", "通过把手收起设置");
    add(route, ".fd-reader-full-head [data-reader-panel-collapse]", "panel-collapse-action", "reader.settings.close", "收起设置");
    Object.entries(SETTING_OPTIONS).forEach(([key, values]) => values.forEach((value) => {
      const valueKey = value.replace(/\s+/g, "-");
      add(route, `[data-reader-setting-option='${key}'][data-reader-setting-value='${value}']`, `setting-${key}-${valueKey}`, "selection.option.toggle", `${key} ${value}`);
    }));
    ["hideStatusBar", "hideNavigationBar", "extendIntoCutout", "textJustify", "bottomAlign", "volumePage", "stopTtsOnScreenOff", "longPressSelection"].forEach((key) => {
      add(route, `[data-reader-setting-toggle='${key}']`, `setting-${key}`, "toggle.switch", key);
    });
  });

  routesForVisual("reader-search-overlay-v2").forEach((route) => {
    add(route, "[data-reader-quick-expand='search']", "search-expand", "reader.control.handleRelease", "展开全文搜索", "button", true);
    add(route, "[data-reader-search-input]", "search-input", "input.search", "搜索正文", "input");
    add(route, "[data-reader-search-submit]", "search-submit", "search.submit", "提交正文搜索");
  });

  routesForVisual("reader-auto-scroll-overlay-v2").forEach((route) => {
    add(route, "[data-reader-quick-expand='auto-page']", "auto-page-expand", "reader.control.handleRelease", "展开自动翻页", "button", true);
    [["prev", "reader.page.prev"], ["next", "reader.page.next"]].forEach((item) => add(route, `[data-reader-chapter-action='${item[0]}']`, `chapter-${item[0]}`, item[1], item[0]));
    add(route, "[data-reader-setting-toggle='autoPage']", "auto-page-toggle", "reader.autoPage.start", "自动翻页开关");
    add(route, "[data-reader-session-stop='autoPage']", "auto-page-stop", "reader.autoPage.stop", "停止自动翻页");
    add(route, "[data-reader-auto-speed-step='-1']", "auto-page-slower", "selection.option.toggle", "减慢自动翻页");
    add(route, "[data-reader-auto-speed-step='1']", "auto-page-faster", "selection.option.toggle", "加快自动翻页");
  });

  routesForVisual("reader-replace-overlay-v2").forEach((route) => {
    add(route, "[data-reader-panel-expand]", "replace-expand", "reader.control.handleRelease", "展开替换规则", "button", true);
    ["rain-name", "old-name", "punctuation", "ad-filter"].forEach((key) => add(route, `[data-w5-rule-toggle='${key}']`, `replace-${key}`, "reader.contentReplacement.rule.toggle", key));
  });

  const ROUTE_SET = new Set(ALL_ROUTES);
  const SPEC_BY_ROUTE = new Map();
  CONTROL_SPECS.forEach((spec) => {
    const entries = SPEC_BY_ROUTE.get(spec.route) || [];
    entries.push(spec);
    SPEC_BY_ROUTE.set(spec.route, entries);
  });

  function identityFor(spec) {
    const entityKey = `reader.control.${spec.role}.${spec.settingsKey}`;
    return Object.freeze({
      entityKey,
      controlKey: `${entityKey}@${spec.route}.default`,
      controlId: `reader.control.${spec.route}.default.${spec.role}.${spec.settingsKey}`,
      uiEvent: spec.uiEvent,
      settingsKey: spec.settingsKey
    });
  }

  function instrumentDom(root, route) {
    if (!root || !ROUTE_SET.has(route)) return Object.freeze({ route, stamped: 0, missing: 0, ambiguous: 0 });
    const viewportHost = typeof root.closest === "function" ? root.closest(".fd-demo") : null;
    const viewportWidth = Number(viewportHost?.getAttribute?.("data-viewport-width")) || 390;
    const viewportOrientation = viewportHost?.getAttribute?.("data-orientation") || "portrait";
    const viewport = viewportOrientation === "landscape" || viewportWidth >= 600 ? "tablet" : "phone";
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
      if (node.getAttribute("role") === "button" && !node.hasAttribute("tabindex")) node.setAttribute("tabindex", "0");
      if (!node.hasAttribute("aria-label") && spec.label) node.setAttribute("aria-label", spec.label);
      stamped += 1;
    });
    root.setAttribute("data-reader-runtime-route", route);
    root.setAttribute("data-reader-runtime-identity-count", String(stamped));
    return Object.freeze({ route, stamped, missing, ambiguous });
  }

  const INITIAL_STATE = Object.freeze({
    route: "immersive-reading",
    mode: "immersive",
    module: null,
    panel: "closed",
    pageIndex: 0,
    chapterKey: "chapter-32-rain-night",
    session: null,
    contentRequest: null,
    tocRequest: null,
    error: null,
    focusReturnKey: null,
    interruptSequence: 0
  });

  function routeState(route) {
    const canonical = COMPATIBILITY_ROUTE_CROSSWALK[route] || route;
    if (canonical === "immersive-reading") return { mode: "immersive", module: null, panel: "closed" };
    if (canonical === "reader") return { mode: "control", module: null, panel: "quick" };
    if (canonical.startsWith("reader-full-")) return { mode: "full", module: canonical.replace("reader-full-", ""), panel: "full" };
    const moduleMap = {
      "reader-directory-overlay-v2": "directory",
      "reader-tts-overlay-v2": "tts",
      "reader-appearance-overlay-v2": "appearance",
      "reader-settings-overlay-v2": "settings",
      "reader-search-overlay-v2": "search",
      "reader-auto-scroll-overlay-v2": "auto-page",
      "reader-replace-overlay-v2": "replace"
    };
    return { mode: "module", module: moduleMap[canonical] || null, panel: "quick" };
  }

  function reducer(state, action) {
    const current = state || INITIAL_STATE;
    const input = action || {};
    switch (input.type) {
      case "ROUTE_COMMIT": {
        if (!ROUTE_SET.has(input.route)) return current;
        return Object.assign({}, current, routeState(input.route), { route: input.route, focusReturnKey: input.focusReturnKey || current.focusReturnKey });
      }
      case "PAGE_TURN": {
        if (input.direction !== "prev" && input.direction !== "next") return current;
        return Object.assign({}, current, { pageIndex: Math.max(0, current.pageIndex + (input.direction === "next" ? 1 : -1)), error: null });
      }
      case "CHAPTER_JUMP":
        return CHAPTER_KEYS.includes(input.chapterKey) ? Object.assign({}, current, { chapterKey: input.chapterKey, pageIndex: 0, error: null }) : current;
      case "TTS_START":
        return Object.assign({}, current, { session: "tts" });
      case "AUTO_PAGE_START":
        return Object.assign({}, current, { session: "auto-page" });
      case "SESSION_STOP":
        return current.session ? Object.assign({}, current, { session: null }) : current;
      case "REQUEST_START": {
        if (!['content', 'toc'].includes(input.kind) || !input.requestId) return current;
        const field = input.kind === "content" ? "contentRequest" : "tocRequest";
        if (current[field]?.status === "loading") return current;
        return Object.assign({}, current, { [field]: { requestId: input.requestId, status: "loading" }, error: null });
      }
      case "REQUEST_SUCCESS":
      case "REQUEST_FAILED": {
        if (!['content', 'toc'].includes(input.kind) || !input.requestId) return current;
        const field = input.kind === "content" ? "contentRequest" : "tocRequest";
        if (current[field]?.requestId !== input.requestId || current[field]?.status !== "loading") return current;
        const failed = input.type === "REQUEST_FAILED";
        return Object.assign({}, current, {
          [field]: { requestId: input.requestId, status: failed ? "failed" : "success" },
          error: failed ? String(input.error || `${input.kind}-request-failed`) : null
        });
      }
      case "INTERRUPT":
        return Object.assign({}, current, {
          contentRequest: current.contentRequest?.status === "loading" ? Object.assign({}, current.contentRequest, { status: "cancelled" }) : current.contentRequest,
          tocRequest: current.tocRequest?.status === "loading" ? Object.assign({}, current.tocRequest, { status: "cancelled" }) : current.tocRequest,
          session: null,
          interruptSequence: current.interruptSequence + 1
        });
      case "RESET":
        return Object.assign({}, INITIAL_STATE);
      default:
        return current;
    }
  }

  function createOwner(initialState) {
    let state = Object.assign({}, INITIAL_STATE, initialState || {});
    const listeners = new Set();
    return Object.freeze({
      getState: () => state,
      dispatch(action) {
        const next = reducer(state, action);
        if (next !== state) {
          state = next;
          listeners.forEach((listener) => listener(state, action));
        }
        return state;
      },
      subscribe(listener) {
        if (typeof listener !== "function") return () => {};
        listeners.add(listener);
        return () => listeners.delete(listener);
      }
    });
  }

  let requestSequence = 0;
  async function executeRequest(owner, kind, effect) {
    if (!owner || typeof owner.dispatch !== "function" || !['content', 'toc'].includes(kind)) return Object.freeze({ status: "invalid" });
    const field = kind === "content" ? "contentRequest" : "tocRequest";
    if (owner.getState()[field]?.status === "loading") return Object.freeze({ status: "duplicate" });
    const requestId = `${kind}:${++requestSequence}`;
    owner.dispatch({ type: "REQUEST_START", kind, requestId });
    try {
      const value = await (typeof effect === "function" ? effect({ requestId, kind }) : Promise.resolve());
      const before = owner.getState()[field];
      owner.dispatch({ type: "REQUEST_SUCCESS", kind, requestId });
      return Object.freeze({ status: before?.requestId === requestId && before?.status === "loading" ? "success" : "stale", requestId, value });
    } catch (error) {
      const before = owner.getState()[field];
      owner.dispatch({ type: "REQUEST_FAILED", kind, requestId, error: error?.message || String(error) });
      return Object.freeze({ status: before?.requestId === requestId && before?.status === "loading" ? "failed" : "stale", requestId });
    }
  }

  const api = Object.freeze({
    PRIMARY_ROUTES,
    COMPATIBILITY_ROUTE_CROSSWALK,
    ALL_ROUTES,
    CONTROL_SPECS: Object.freeze(CONTROL_SPECS.slice()),
    INITIAL_STATE,
    routeState,
    reducer,
    createOwner,
    instrumentDom,
    executeContentRetry: (owner, effect) => executeRequest(owner, "content", effect),
    executeTocRetry: (owner, effect) => executeRequest(owner, "toc", effect)
  });

  window.ReaderRuntimeContract = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
