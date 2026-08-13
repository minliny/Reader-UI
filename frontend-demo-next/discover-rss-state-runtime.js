// Discover & RSS 域交互状态扩展
// B3 · Discover & RSS 工作包（基础 commit c7c2730）
//
// 本文件为 Discover/RSS 域提供与 control identity 协同的交互状态契约：
// - loading / empty / error / offline 终态
// - async 结果（成功 / 部分成功 / stale / repeat-tap）
// - focus / keyboard / reduced-motion 终态
// - stable final state 描述
//
// 严格不修改 render-runtime.js 内的视觉布局；render-runtime.js 通过
// window.ReaderDiscoverRssState 在 Discover/RSS 函数末尾调用 describe*
// 系列函数为各状态追加 data-* 属性与 aria-* 属性，最终在 DOM 上呈现
// 稳定的终态语义，便于浏览器自动化 trace 与无障碍审计。

(function attachReaderDiscoverRssState(window) {
  "use strict";

  // --- 状态词汇表（与 ScreenGraph pageState 对齐） -------------------------
  const PAGE_STATES = Object.freeze({
    DEFAULT: "default",
    LOADING: "loading",
    REFRESHING: "refreshing",
    EMPTY: "empty",
    ERROR: "error",
    OFFLINE: "offline",
    NO_RESULTS: "no-results",
    CONFLICT: "conflict",
    RESULT: "result"
  });

  // --- 异步结果状态 ---------------------------------------------------------
  // 用于 refresh / filter / segment / source-switch / cache-clear / login
  // / import / export 等异步操作
  const ASYNC_RESULTS = Object.freeze({
    IDLE: "idle",
    PENDING: "pending",
    SUCCESS: "success",
    PARTIAL_SUCCESS: "partial-success",
    STALE: "stale",          // 旧结果，已被新请求覆盖
    REPEAT_TAP: "repeat-tap", // 用户重复点击；需要去抖
    FAILED: "failed",
    CANCELED: "canceled"
  });

  // --- reduced-motion / focus / keyboard 终态 ------------------------------
  const MOTION_STATES = Object.freeze({
    FULL: "full",
    REDUCED: "reduced"
  });

  const FOCUS_STATES = Object.freeze({
    NONE: "none",
    REQUESTED: "requested", // 渲染完成后请求焦点
    RESTORED: "restored",   // 从前一个控件恢复焦点
    TRAPPED: "trapped"      // 在 Dialog / Sheet 中焦点被陷阱
  });

  const KEYBOARD_STATES = Object.freeze({
    NONE: "none",
    ACTIVATED: "activated", // 通过 Enter / Space 触发
    ESCAPED: "escaped"      // Esc 关闭浮层
  });

  // --- 路由 → pageState 映射 -----------------------------------------------
  // Discover 域
  const DISCOVER_ROUTE_STATE = Object.freeze({
    "discover": PAGE_STATES.DEFAULT,
    "discover-home": PAGE_STATES.DEFAULT,
    "discover-control": PAGE_STATES.DEFAULT,
    "discover-sort": PAGE_STATES.DEFAULT,
    "discover-entry-ranking": PAGE_STATES.DEFAULT,
    "discover-entry-source": PAGE_STATES.DEFAULT,
    "discover-entry-category": PAGE_STATES.DEFAULT,
    "discover-entry-finished": PAGE_STATES.DEFAULT,
    "discover-entry-latest": PAGE_STATES.DEFAULT,
    "discover-entry-booklist": PAGE_STATES.DEFAULT,
    "discover-filter-keyword": PAGE_STATES.DEFAULT,
    "discover-filter-male": PAGE_STATES.DEFAULT,
    "discover-filter-female": PAGE_STATES.DEFAULT,
    "discover-sort-popularity": PAGE_STATES.DEFAULT,
    "discover-sort-update": PAGE_STATES.DEFAULT,
    "discover-sort-collection": PAGE_STATES.DEFAULT,
    "discover-sort-finished": PAGE_STATES.DEFAULT,
    "discover-sort-words": PAGE_STATES.DEFAULT,
    "discover-loading": PAGE_STATES.LOADING,
    "discover-refreshing": PAGE_STATES.REFRESHING,
    "discover-infinite-loading": PAGE_STATES.LOADING,
    "discover-page-two": PAGE_STATES.DEFAULT,
    "discover-no-results": PAGE_STATES.NO_RESULTS,
    "discover-cache-empty": PAGE_STATES.EMPTY,
    "discover-cache-stale": "stale",
    "discover-cache-fresh": "fresh",
    "discover-cache-confirm": PAGE_STATES.CONFLICT,
    "discover-cache-toast": PAGE_STATES.RESULT,
    "discover-login-return": PAGE_STATES.REFRESHING,
    "discover-switching-source": PAGE_STATES.LOADING,
    "discover-switched-source": PAGE_STATES.RESULT,
    "discover-entry-error": PAGE_STATES.ERROR,
    "discover-empty": PAGE_STATES.EMPTY,
    "discover-error": PAGE_STATES.ERROR,
    "discover-source-login": PAGE_STATES.DEFAULT,
    "discover-rule-test": PAGE_STATES.DEFAULT,
    "discover-source-bulk": PAGE_STATES.DEFAULT
  });

  // RSS 域
  const RSS_ROUTE_STATE = Object.freeze({
    "rss": PAGE_STATES.DEFAULT,
    "rss-all": PAGE_STATES.DEFAULT,
    "rss-starred": PAGE_STATES.DEFAULT,
    "rss-source-feed": PAGE_STATES.DEFAULT,
    "rss-source-category-releases": PAGE_STATES.DEFAULT,
    "rss-source-category-issues": PAGE_STATES.DEFAULT,
    "rss-source-category-discussions": PAGE_STATES.DEFAULT,
    "rss-source-category-novel": PAGE_STATES.DEFAULT,
    "rss-source-category-tech": PAGE_STATES.DEFAULT,
    "rss-source-category-booklist": PAGE_STATES.DEFAULT,
    "rss-refreshing": PAGE_STATES.REFRESHING,
    "rss-search": PAGE_STATES.DEFAULT,
    "rss-detail": PAGE_STATES.DEFAULT,
    "rss-empty": PAGE_STATES.EMPTY,
    "rss-error": PAGE_STATES.ERROR
  });

  // --- 异步操作 → 终态契约 -------------------------------------------------
  // 每个操作的 stable final state：在终态时控件应处于的可观察状态。
  // 这里的契约用于：1) 渲染器在渲染对应 route 时设置 data-async-* 属性；
  // 2) 测试断言这些属性存在并符合预期；3) 浏览器 trace 可读取属性值。

  const DISCOVER_ASYNC_CONTRACTS = Object.freeze({
    refresh: {
      idle: { "data-async-refresh": ASYNC_RESULTS.IDLE },
      pending: { "data-async-refresh": ASYNC_RESULTS.PENDING, "aria-busy": "true" },
      success: { "data-async-refresh": ASYNC_RESULTS.SUCCESS, "data-async-result-at": "" },
      stale: { "data-async-refresh": ASYNC_RESULTS.STALE, "data-async-stale-since": "" },
      failed: { "data-async-refresh": ASYNC_RESULTS.FAILED, "aria-invalid": "true" },
      // repeat-tap：用户在 pending 期间再次点击刷新
      repeatTap: { "data-async-refresh": ASYNC_RESULTS.REPEAT_TAP, "data-async-repeat-tap-count": "2" },
      stableFinal: { "data-async-refresh": ASYNC_RESULTS.SUCCESS, "data-async-stable": "true" }
    },
    filter: {
      idle: { "data-async-filter": ASYNC_RESULTS.IDLE },
      pending: { "data-async-filter": ASYNC_RESULTS.PENDING },
      success: { "data-async-filter": ASYNC_RESULTS.SUCCESS },
      repeatTap: { "data-async-filter": ASYNC_RESULTS.REPEAT_TAP },
      stableFinal: { "data-async-filter": ASYNC_RESULTS.SUCCESS, "data-async-stable": "true" }
    },
    segment: {
      // segment 排序切换是同步操作；但仍记录终态以验证焦点恢复
      idle: { "data-async-segment": ASYNC_RESULTS.IDLE },
      activated: { "data-async-segment": ASYNC_RESULTS.SUCCESS },
      stableFinal: { "data-async-segment": ASYNC_RESULTS.SUCCESS, "data-async-stable": "true" }
    },
    sourceSwitch: {
      idle: { "data-async-source-switch": ASYNC_RESULTS.IDLE },
      pending: { "data-async-source-switch": ASYNC_RESULTS.PENDING, "aria-busy": "true" },
      success: { "data-async-source-switch": ASYNC_RESULTS.SUCCESS },
      failed: { "data-async-source-switch": ASYNC_RESULTS.FAILED, "data-async-rollback": "true" },
      canceled: { "data-async-source-switch": ASYNC_RESULTS.CANCELED },
      stableFinal: { "data-async-source-switch": ASYNC_RESULTS.SUCCESS, "data-async-stable": "true" }
    },
    cacheClear: {
      idle: { "data-async-cache-clear": ASYNC_RESULTS.IDLE },
      pending: { "data-async-cache-clear": ASYNC_RESULTS.PENDING, "aria-busy": "true" },
      success: { "data-async-cache-clear": ASYNC_RESULTS.SUCCESS },
      stableFinal: { "data-async-cache-clear": ASYNC_RESULTS.SUCCESS, "data-async-stable": "true" }
    },
    login: {
      idle: { "data-async-login": ASYNC_RESULTS.IDLE },
      pending: { "data-async-login": ASYNC_RESULTS.PENDING },
      success: { "data-async-login": ASYNC_RESULTS.SUCCESS },
      canceled: { "data-async-login": ASYNC_RESULTS.CANCELED },
      failed: { "data-async-login": ASYNC_RESULTS.FAILED },
      stableFinal: { "data-async-login": ASYNC_RESULTS.SUCCESS, "data-async-stable": "true" }
    }
  });

  const RSS_ASYNC_CONTRACTS = Object.freeze({
    refresh: {
      idle: { "data-async-refresh": ASYNC_RESULTS.IDLE },
      pending: { "data-async-refresh": ASYNC_RESULTS.PENDING, "aria-busy": "true" },
      partialSuccess: { "data-async-refresh": ASYNC_RESULTS.PARTIAL_SUCCESS, "data-async-partial-detail": "" },
      success: { "data-async-refresh": ASYNC_RESULTS.SUCCESS },
      stale: { "data-async-refresh": ASYNC_RESULTS.STALE, "data-async-stale-since": "" },
      failed: { "data-async-refresh": ASYNC_RESULTS.FAILED, "aria-invalid": "true" },
      repeatTap: { "data-async-refresh": ASYNC_RESULTS.REPEAT_TAP, "data-async-repeat-tap-count": "2" },
      stableFinal: { "data-async-refresh": ASYNC_RESULTS.SUCCESS, "data-async-stable": "true" }
    },
    filter: {
      idle: { "data-async-filter": ASYNC_RESULTS.IDLE },
      pending: { "data-async-filter": ASYNC_RESULTS.PENDING },
      success: { "data-async-filter": ASYNC_RESULTS.SUCCESS },
      stableFinal: { "data-async-filter": ASYNC_RESULTS.SUCCESS, "data-async-stable": "true" }
    },
    markRead: {
      idle: { "data-async-mark-read": ASYNC_RESULTS.IDLE },
      pending: { "data-async-mark-read": ASYNC_RESULTS.PENDING },
      success: { "data-async-mark-read": ASYNC_RESULTS.SUCCESS },
      repeatTap: { "data-async-mark-read": ASYNC_RESULTS.REPEAT_TAP },
      stableFinal: { "data-async-mark-read": ASYNC_RESULTS.SUCCESS, "data-async-stable": "true" }
    },
    sourceImport: {
      idle: { "data-async-source-import": ASYNC_RESULTS.IDLE },
      pending: { "data-async-source-import": ASYNC_RESULTS.PENDING },
      partialSuccess: { "data-async-source-import": ASYNC_RESULTS.PARTIAL_SUCCESS },
      success: { "data-async-source-import": ASYNC_RESULTS.SUCCESS },
      failed: { "data-async-source-import": ASYNC_RESULTS.FAILED },
      stableFinal: { "data-async-source-import": ASYNC_RESULTS.SUCCESS, "data-async-stable": "true" }
    },
    sourceExport: {
      idle: { "data-async-source-export": ASYNC_RESULTS.IDLE },
      pending: { "data-async-source-export": ASYNC_RESULTS.PENDING },
      success: { "data-async-source-export": ASYNC_RESULTS.SUCCESS },
      failed: { "data-async-source-export": ASYNC_RESULTS.FAILED },
      stableFinal: { "data-async-source-export": ASYNC_RESULTS.SUCCESS, "data-async-stable": "true" }
    }
  });

  // --- reduced-motion / focus / keyboard 终态契约 --------------------------
  // 这些是渲染器在渲染任何 Discover/RSS 控件时应同时设置的全终态属性；
  // 控件 root 上至少设置 data-motion、data-focus-state、data-keyboard-state
  // 中的一个，以保证 audit 可观察到稳定终态。

  const TERMINAL_STATE_ATTRS = Object.freeze({
    motion: "data-motion",
    focus: "data-focus-state",
    keyboard: "data-keyboard-state",
    asyncStable: "data-async-stable"
  });

  function reducedMotionAttrs(prefersReducedMotion) {
    return {
      [TERMINAL_STATE_ATTRS.motion]: prefersReducedMotion ? MOTION_STATES.REDUCED : MOTION_STATES.FULL
    };
  }

  function focusAttrs(state) {
    return { [TERMINAL_STATE_ATTRS.focus]: state };
  }

  function keyboardAttrs(state) {
    return { [TERMINAL_STATE_ATTRS.keyboard]: state };
  }

  // --- 公共描述 API ---------------------------------------------------------

  // 给定 route，返回 Discover 域的 pageState
  function discoverPageState(route) {
    return DISCOVER_ROUTE_STATE[route] || PAGE_STATES.DEFAULT;
  }

  // 给定 route，返回 RSS 域的 pageState
  function rssPageState(route) {
    return RSS_ROUTE_STATE[route] || PAGE_STATES.DEFAULT;
  }

  // 给定 route 与 appState，返回该 route 下控件 root 应携带的稳定终态属性集合
  // （用于在 render-runtime.js 中通过 attrHtml 注入）
  function discoverTerminalAttrs(route, appState) {
    const pageState = discoverPageState(route);
    const reduced = Boolean(appState?.prefersReducedMotion);
    const attrs = Object.assign({}, reducedMotionAttrs(reduced));
    if (pageState === PAGE_STATES.LOADING) {
      attrs["data-loading"] = "true";
      attrs["aria-busy"] = "true";
    } else if (pageState === PAGE_STATES.REFRESHING) {
      attrs["data-refreshing"] = "true";
      attrs["aria-busy"] = "true";
    } else if (pageState === PAGE_STATES.EMPTY) {
      attrs["data-empty"] = "true";
    } else if (pageState === PAGE_STATES.ERROR) {
      attrs["data-error"] = "true";
      attrs["aria-invalid"] = "true";
    } else if (pageState === PAGE_STATES.NO_RESULTS) {
      attrs["data-no-results"] = "true";
    } else if (pageState === "stale") {
      attrs["data-cache-stale"] = "true";
    } else if (pageState === "fresh") {
      attrs["data-cache-fresh"] = "true";
    } else if (pageState === PAGE_STATES.RESULT) {
      attrs["data-result"] = "true";
      attrs[TERMINAL_STATE_ATTRS.asyncStable] = "true";
    } else if (pageState === PAGE_STATES.CONFLICT) {
      attrs["data-conflict"] = "true";
    }
    return attrs;
  }

  function rssTerminalAttrs(route, appState) {
    const pageState = rssPageState(route);
    const reduced = Boolean(appState?.prefersReducedMotion);
    const attrs = Object.assign({}, reducedMotionAttrs(reduced));
    if (pageState === PAGE_STATES.REFRESHING) {
      attrs["data-refreshing"] = "true";
      attrs["aria-busy"] = "true";
    } else if (pageState === PAGE_STATES.EMPTY) {
      attrs["data-empty"] = "true";
    } else if (pageState === PAGE_STATES.ERROR) {
      attrs["data-error"] = "true";
      attrs["aria-invalid"] = "true";
    }
    return attrs;
  }

  // 给定异步操作名 + 阶段，返回应设置的 data-async-* 属性集合
  function discoverAsyncAttrs(operation, phase) {
    const contract = DISCOVER_ASYNC_CONTRACTS[operation];
    if (!contract || !contract[phase]) return {};
    return Object.assign({}, contract[phase]);
  }

  function rssAsyncAttrs(operation, phase) {
    const contract = RSS_ASYNC_CONTRACTS[operation];
    if (!contract || !contract[phase]) return {};
    return Object.assign({}, contract[phase]);
  }

  // Dialog / Sheet 焦点陷阱契约
  function dialogFocusTrapAttrs(open) {
    return open
      ? Object.assign(focusAttrs(FOCUS_STATES.TRAPPED), { "aria-modal": "true", "data-focus-trap": "true" })
      : focusAttrs(FOCUS_STATES.NONE);
  }

  // Repeat-tap 防抖契约：当控件在 pending 期间再次被激活时，渲染器应附加
  // 该属性集合；测试断言 pending 控件被再次点击后出现 data-async-repeat-tap-count
  function repeatTapAttrs(count) {
    return {
      "data-async-repeat-tap": "true",
      "data-async-repeat-tap-count": String(Math.max(2, count | 0))
    };
  }

  // 暴露 API
  window.ReaderDiscoverRssState = Object.freeze({
    PAGE_STATES,
    ASYNC_RESULTS,
    MOTION_STATES,
    FOCUS_STATES,
    KEYBOARD_STATES,
    DISCOVER_ROUTE_STATE,
    RSS_ROUTE_STATE,
    DISCOVER_ASYNC_CONTRACTS,
    RSS_ASYNC_CONTRACTS,
    TERMINAL_STATE_ATTRS,
    discoverPageState,
    rssPageState,
    discoverTerminalAttrs,
    rssTerminalAttrs,
    discoverAsyncAttrs,
    rssAsyncAttrs,
    dialogFocusTrapAttrs,
    repeatTapAttrs,
    reducedMotionAttrs,
    focusAttrs,
    keyboardAttrs
  });
})(typeof window !== "undefined" ? window : this);
