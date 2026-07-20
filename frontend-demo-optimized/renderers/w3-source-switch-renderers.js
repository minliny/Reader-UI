/**
 * Canonical Source Switch renderer + local interaction owner.
 * Phone 390x844 and Tablet 760x960 share one structure; landscape aliases Tablet.
 */
(function attachW3SourceSwitchRenderers(window) {
  "use strict";

  var ROUTES = Object.freeze([
    "source-switch", "source-switch-results", "source-switch-empty", "source-switch-error",
    "source-switch-timeout", "source-switch-loading", "source-switch-rollback", "source-switch-preview"
  ]);
  var SOURCE_IDS = Object.freeze([
    "source-youshu", "source-biquge-mirror", "source-light-novel", "source-cloud-library",
    "source-aggregate-1", "source-aggregate-2", "source-backup-a", "source-backup-b",
    "source-chapter-sync", "source-local-cache", "source-old-backup"
  ]);
  var SOURCE_ID_SET = new Set(SOURCE_IDS);

  function candidateSpecs(route) {
    return SOURCE_IDS.map(function (sourceId) {
      return Object.freeze({ route: route, settingsKey: "source-option-" + sourceId, uiEvent: "source.switch.select", label: "选择书源 " + sourceId });
    });
  }
  var SOURCE_CONTROL_SPECS = Object.freeze(
    candidateSpecs("source-switch").concat([
      { route: "source-switch", settingsKey: "close", uiEvent: "source.switch.cancel", label: "关闭换源" },
      { route: "source-switch", settingsKey: "confirm", uiEvent: "source.switch.confirm", label: "确认候选书源" }
    ], candidateSpecs("source-switch-results"), [
      { route: "source-switch-results", settingsKey: "close", uiEvent: "source.switch.cancel", label: "关闭换源" },
      { route: "source-switch-results", settingsKey: "confirm", uiEvent: "source.switch.confirm", label: "检查并确认换源" },
      { route: "source-switch-empty", settingsKey: "source-management", uiEvent: "source.management.open", label: "前往书源管理" },
      { route: "source-switch-empty", settingsKey: "cancel", uiEvent: "source.switch.cancel", label: "取消换源" },
      { route: "source-switch-error", settingsKey: "retry", uiEvent: "source.switch.confirm", label: "重试换源" },
      { route: "source-switch-error", settingsKey: "cancel", uiEvent: "source.switch.cancel", label: "保留原书源" },
      { route: "source-switch-timeout", settingsKey: "retry", uiEvent: "source.switch.confirm", label: "重试换源" },
      { route: "source-switch-timeout", settingsKey: "cancel", uiEvent: "source.switch.cancel", label: "取消换源" },
      { route: "source-switch-loading", settingsKey: "cancel", uiEvent: "source.switch.cancel", label: "取消加载" },
      { route: "source-switch-rollback", settingsKey: "rollback-confirm", uiEvent: "source.switch.rollback", label: "确认回滚" },
      { route: "source-switch-rollback", settingsKey: "rollback-cancel", uiEvent: "route.pop", label: "取消回滚" },
      { route: "source-switch-preview", settingsKey: "confirm", uiEvent: "source.switch.confirm", label: "确认换源" },
      { route: "source-switch-preview", settingsKey: "back-to-candidates", uiEvent: "route.pop", label: "返回候选列表" }
    ].map(Object.freeze))
  );
  var SPEC_BY_KEY = new Map(SOURCE_CONTROL_SPECS.map(function (spec) { return [spec.route + "::" + spec.settingsKey, spec]; }));

  function esc(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function shellKit() {
    if (!window.ReaderShellKit) throw new Error("ReaderShellKit is required before w3-source-switch-renderers.js");
    return window.ReaderShellKit;
  }
  function icon(name, className) {
    return window.ReaderShellKit && window.ReaderShellKit.icon
      ? window.ReaderShellKit.icon(name, className || "fd-icon")
      : '<span class="' + esc(className || "fd-icon") + '" data-icon-missing="' + esc(name) + '" aria-hidden="true"></span>';
  }
  function identity(route, settingsKey) {
    var spec = SPEC_BY_KEY.get(route + "::" + settingsKey);
    if (!spec) return null;
    var entityKey = "source-switch.control.button." + settingsKey;
    return Object.freeze({
      entityKey: entityKey,
      controlKey: entityKey + "@" + route + ".default",
      controlId: "source-switch.control." + route + ".default.button." + settingsKey,
      uiEvent: spec.uiEvent,
      settingsKey: settingsKey
    });
  }
  function identityAttrs(route, settingsKey) {
    var value = identity(route, settingsKey);
    if (!value) return "";
    return ' data-entity-key="' + esc(value.entityKey) + '" data-control-key="' + esc(value.controlKey) +
      '" data-control-id="' + esc(value.controlId) + '" data-ui-event="' + esc(value.uiEvent) +
      '" data-settings-key="' + esc(value.settingsKey) + '"';
  }

  var INITIAL_STATE = Object.freeze({
    phase: "idle", selectedSourceId: null, originalSourceId: "source-youshu", committedSourceId: "source-youshu",
    navigationOriginRoute: "", visualContextRoute: "reader", originControlKey: "", focusReturnKey: "",
    requestId: null, pendingKind: null, error: null, rollbackToken: null, interruptSequence: 0
  });
  var state = Object.assign({}, INITIAL_STATE);
  var listeners = [];
  function acceptedSourceId(value) { return SOURCE_ID_SET.has(value) ? value : null; }
  function reducer(current, action) {
    var input = action || {};
    switch (input.type) {
      case "OPEN":
        return Object.assign({}, current, {
          phase: "idle", selectedSourceId: null,
          navigationOriginRoute: String(input.navigationOriginRoute || ""),
          visualContextRoute: String(input.visualContextRoute || "reader"),
          originControlKey: String(input.originControlKey || ""), focusReturnKey: "", requestId: null,
          pendingKind: null, error: null, rollbackToken: null, interruptSequence: current.interruptSequence + 1
        });
      case "SELECT": {
        var sourceId = acceptedSourceId(input.sourceId);
        if (!sourceId || sourceId === current.originalSourceId || sourceId === current.selectedSourceId || input.disabled) return current;
        return Object.assign({}, current, { phase: "selected", selectedSourceId: sourceId, error: null });
      }
      case "CHECK_START":
        if (!current.selectedSourceId || current.selectedSourceId === current.originalSourceId || current.pendingKind || !input.requestId) return current;
        return Object.assign({}, current, { phase: "loading", pendingKind: "check", requestId: input.requestId, error: null });
      case "CHECK_SUCCESS":
        if (current.pendingKind !== "check" || current.requestId !== input.requestId) return current;
        return Object.assign({}, current, { phase: "preview", pendingKind: null, requestId: null, error: null });
      case "CHECK_FAILED":
      case "CHECK_TIMEOUT":
        if (current.pendingKind !== "check" || current.requestId !== input.requestId) return current;
        return Object.assign({}, current, { phase: input.type === "CHECK_TIMEOUT" ? "timeout" : "error", pendingKind: null, requestId: null, error: String(input.error || "书源检查失败") });
      case "COMMIT_START":
        if (!current.selectedSourceId || current.pendingKind || !input.requestId) return current;
        return Object.assign({}, current, { phase: "loading", pendingKind: "commit", requestId: input.requestId, error: null });
      case "COMMIT_SUCCESS":
        if (current.pendingKind !== "commit" || current.requestId !== input.requestId) return current;
        return Object.assign({}, current, { phase: "settled", committedSourceId: current.selectedSourceId, originalSourceId: current.selectedSourceId, pendingKind: null, requestId: null, error: null, focusReturnKey: current.originControlKey });
      case "COMMIT_FAILED":
        if (current.pendingKind !== "commit" || current.requestId !== input.requestId) return current;
        return Object.assign({}, current, { phase: "rollback", pendingKind: null, requestId: null, error: String(input.error || "新书源正文异常"), rollbackToken: String(input.rollbackToken || "rollback-ready") });
      case "CANCEL":
        if (current.phase === "settled" && !current.pendingKind) return current;
        return Object.assign({}, current, { phase: "settled", pendingKind: null, requestId: null, error: null, focusReturnKey: current.originControlKey, interruptSequence: current.interruptSequence + 1 });
      case "ROLLBACK_OPEN":
        return current.rollbackToken ? Object.assign({}, current, { phase: "rollback" }) : current;
      case "ROLLBACK_START":
        if (!current.rollbackToken || current.pendingKind || !input.requestId) return current;
        return Object.assign({}, current, { phase: "loading", pendingKind: "rollback", requestId: input.requestId, error: null });
      case "ROLLBACK_SUCCESS":
        if (current.pendingKind !== "rollback" || current.requestId !== input.requestId) return current;
        return Object.assign({}, current, { phase: "settled", committedSourceId: current.originalSourceId, selectedSourceId: current.originalSourceId, pendingKind: null, requestId: null, rollbackToken: null, focusReturnKey: current.originControlKey });
      case "ROLLBACK_FAILED":
        if (current.pendingKind !== "rollback" || current.requestId !== input.requestId) return current;
        return Object.assign({}, current, { phase: "rollback", pendingKind: null, requestId: null, error: String(input.error || "回滚失败") });
      case "ROLLBACK_CLOSE":
        return current.phase === "rollback" ? Object.assign({}, current, { phase: "preview" }) : current;
      case "RESET":
        return Object.assign({}, INITIAL_STATE);
      default:
        return current;
    }
  }
  function dispatch(action) {
    var next = reducer(state, action);
    if (next === state) return state;
    state = next;
    listeners.slice().forEach(function (listener) { listener(state, action); });
    return state;
  }
  function getState() { return state; }
  function subscribe(listener) {
    if (typeof listener !== "function") return function () {};
    listeners.push(listener);
    return function () { listeners = listeners.filter(function (item) { return item !== listener; }); };
  }
  function injectAppState(appState) {
    if (!appState) return state;
    var patch = {};
    if (typeof appState.sourceSwitchNavigationOriginRoute === "string") patch.navigationOriginRoute = appState.sourceSwitchNavigationOriginRoute;
    if (typeof appState.sourceSwitchVisualContextRoute === "string") patch.visualContextRoute = appState.sourceSwitchVisualContextRoute || "reader";
    if (typeof appState.sourceSwitchOriginControlKey === "string") patch.originControlKey = appState.sourceSwitchOriginControlKey;
    if (acceptedSourceId(appState.sourceSwitchSelectedSourceId)) patch.selectedSourceId = appState.sourceSwitchSelectedSourceId;
    state = Object.assign({}, state, patch);
    return state;
  }

  var requestSequence = 0;
  function delayFor(options) { return Math.max(0, Number(options && options.delay) || 0); }
  function execute(kind, startType, successType, failedType, options) {
    options = options || {};
    if (state.pendingKind) return Promise.resolve(Object.freeze({ status: "duplicate" }));
    var requestId = kind + ":" + (++requestSequence);
    var before = state;
    dispatch({ type: startType, requestId: requestId });
    if (state === before) return Promise.resolve(Object.freeze({ status: "invalid" }));
    return new Promise(function (resolve) {
      window.setTimeout(function () {
        if (state.pendingKind !== kind || state.requestId !== requestId) {
          resolve(Object.freeze({ status: "stale", requestId: requestId }));
          return;
        }
        var result = options.simulateResult || "success";
        if (result === "timeout" && kind === "check") dispatch({ type: "CHECK_TIMEOUT", requestId: requestId, error: options.error || "书源检查超时" });
        else if (result === "failed") dispatch({ type: failedType, requestId: requestId, error: options.error, rollbackToken: options.rollbackToken });
        else dispatch({ type: successType, requestId: requestId });
        resolve(Object.freeze({ status: result === "success" ? "success" : result, requestId: requestId }));
      }, delayFor(options));
    });
  }
  function executeCandidateCheck(options) { return execute("check", "CHECK_START", "CHECK_SUCCESS", "CHECK_FAILED", options); }
  function executeSwitchCommit(options) { return execute("commit", "COMMIT_START", "COMMIT_SUCCESS", "COMMIT_FAILED", options); }
  function executeRollback(options) { return execute("rollback", "ROLLBACK_START", "ROLLBACK_SUCCESS", "ROLLBACK_FAILED", options); }

  function candidates(data) {
    var raw = data && data.flow && Array.isArray(data.flow.candidates) ? data.flow.candidates : [];
    return raw.map(function (item, index) {
      var sourceId = acceptedSourceId(item && item.sourceId);
      if (!sourceId) throw new Error("source-switch candidate requires stable sourceId at index " + index);
      return Object.assign({}, item, { sourceId: sourceId });
    });
  }
  function currentCandidate(data) { return candidates(data).find(function (item) { return item.state === "当前"; }) || candidates(data)[0] || {}; }
  function selectedCandidate(data, owned) {
    var rows = candidates(data);
    return rows.find(function (item) { return item.sourceId === owned.selectedSourceId; }) || rows.find(function (item) { return item.state === "可切换"; }) || currentCandidate(data);
  }
  function readerContext(data) {
    var current = currentCandidate(data);
    return { title: data && data.reader && data.reader.title || "长夜余火", chapter: data && data.flow && data.flow.chapter || "第 32 章 雨夜", source: current.source || "优书网" };
  }
  function originReaderHtml(data, appState, owned) {
    var fragments = window.ReaderRuntimeSharedFragments;
    var merged = Object.assign({}, appState || {}, { sourceSwitchVisualContextRoute: owned.visualContextRoute || "reader" });
    if (fragments && typeof fragments.originReaderScreen === "function") {
      try { return fragments.originReaderScreen(data, merged); } catch (_error) {}
    }
    var ctx = readerContext(data);
    return '<section class="fd-w3-reader-continuity" aria-label="换源期间阅读续读层"><article class="fd-w3-reader-surface"><h1>' + esc(ctx.chapter) + '</h1><p>阅读位置保持不变，完成换源后继续当前章节。</p></article></section>';
  }
  function flowShell(data, appState, owned, body, ariaLabel, extraClass) {
    return shellKit().renderFlowShell({
      frameClass: "fd-flow-frame fd-source-phone-flow fd-source-reader-continuation fd-w3-source-switch " + (extraClass || ""),
      stepClass: "fd-flow-step fd-source-continuity-slot fd-w3-step",
      comparisonClass: "fd-flow-comparison fd-source-window-slot fd-w3-comparison",
      resultClass: "fd-flow-result fd-source-result-slot fd-w3-result",
      stateHostClass: "fd-source-unused-slot fd-w3-state-host",
      ariaLabel: ariaLabel || "换源",
      stepHtml: '<div data-source-switch-continuity data-source-switch-visual-route="' + esc(owned.visualContextRoute || "reader") + '">' + originReaderHtml(data, appState, owned) + "</div>",
      comparisonHtml: body,
      resultHtml: "", stateHostHtml: ""
    });
  }
  function candidateRow(item, route, owned) {
    var current = item.sourceId === owned.originalSourceId || item.state === "当前";
    var unavailable = item.state === "落后" || item.state === "失效";
    var disabled = current || unavailable || owned.pendingKind !== null;
    var selected = item.sourceId === owned.selectedSourceId;
    var key = "source-option-" + item.sourceId;
    return '<button class="fd-source-candidate-row' + (current ? " is-current" : "") + (selected ? " is-selected" : "") + (disabled ? " is-muted" : " is-switchable") +
      '" type="button" role="option"' + identityAttrs(route, key) + ' data-source-switch-action="select" data-source-id="' + esc(item.sourceId) +
      '" aria-selected="' + (selected ? "true" : "false") + '" aria-disabled="' + (disabled ? "true" : "false") + '"' + (disabled ? " disabled" : "") +
      '><span class="fd-source-row-main"><b>' + esc(item.source) + '</b><em>' + esc(item.speed || "未知") + '</em><strong>' + esc(item.latestChapter || item.chapter || "章节同步") + '</strong></span></button>';
  }
  function candidateWindow(data, route, appState, owned) {
    var rows = candidates(data);
    var selected = selectedCandidate(data, owned);
    var disabled = !owned.selectedSourceId || owned.selectedSourceId === owned.originalSourceId || owned.pendingKind !== null;
    return '<section class="fd-source-switch-window" role="dialog" aria-modal="true" aria-labelledby="source-switch-title" data-source-switch-window>' +
      '<header class="fd-source-window-info"><i>' + icon("source-switch", "fd-small-icon") + '</i><strong id="source-switch-title">换源</strong><span>按延迟排序</span>' +
      '<button class="fd-source-window-close" type="button"' + identityAttrs(route, "close") + ' data-source-switch-action="cancel" data-restore-focus="' + esc(owned.originControlKey) + '" aria-label="关闭换源窗口">' + icon("close", "fd-small-icon") + '</button></header>' +
      '<div class="fd-source-candidate-list" role="listbox" aria-label="候选书源" aria-busy="' + (owned.pendingKind ? "true" : "false") + '">' + rows.map(function (item) { return candidateRow(item, route, owned); }).join("") + '</div>' +
      '<section class="fd-source-switch-result" aria-live="polite"><strong>' + esc(selected.source || "请选择书源") + '</strong><small>' + esc(selected.speed || "") + ' · ' + esc(selected.latestChapter || selected.chapter || "") + '</small>' +
      '<button type="button"' + identityAttrs(route, "confirm") + ' data-source-switch-action="confirm" aria-busy="' + (owned.pendingKind ? "true" : "false") + '"' + (disabled ? " disabled" : "") + '>' + (route === "source-switch-results" ? "检查并确认" : "继续") + '</button></section></section>';
  }
  function actionButton(route, key, label, action, options) {
    options = options || {};
    return '<button type="button" class="fd-w3-state-action' + (options.primary ? " fd-w3-state-action--primary" : "") + '"' + identityAttrs(route, key) +
      ' data-source-switch-action="' + esc(action) + '"' + (options.initial ? ' data-dialog-initial-focus="' + esc(key) + '"' : "") +
      (options.busy ? ' aria-busy="true"' : "") + (options.disabled ? " disabled" : "") + '>' + esc(label) + '</button>';
  }
  function stateCard(data, route, appState, owned) {
    var ctx = readerContext(data);
    var selected = selectedCandidate(data, owned);
    var title = "换源";
    var detail = "";
    var role = "status";
    var actions = "";
    var extra = "";
    if (route === "source-switch-empty") {
      title = "无可用源"; detail = "当前书籍没有可切换的其它书源。";
      actions = actionButton(route, "source-management", "去书源管理", "source-management", { primary: true }) + actionButton(route, "cancel", "返回阅读", "cancel");
    } else if (route === "source-switch-error") {
      title = "换源失败"; detail = owned.error || "目标书源解析失败。"; role = "alert";
      actions = actionButton(route, "retry", "重试换源", "retry", { primary: true }) + actionButton(route, "cancel", "保留原源", "cancel");
    } else if (route === "source-switch-timeout") {
      title = "换源超时"; detail = owned.error || "目标书源未在限定时间内返回。";
      actions = actionButton(route, "retry", "重试换源", "retry", { primary: true }) + actionButton(route, "cancel", "取消", "cancel");
    } else if (route === "source-switch-loading") {
      title = "正在切换书源"; detail = "正在检查「" + (selected.source || "目标书源") + "」，期间可取消。";
      extra = '<div class="fd-w3-state-card-progress" role="status" aria-live="polite" aria-busy="true"><span class="fd-w3-state-card-progress-bar"></span><span>正在请求目录</span></div>';
      actions = actionButton(route, "cancel", "取消", "cancel");
    } else if (route === "source-switch-rollback") {
      title = "回滚书源？"; detail = owned.error || "新源正文异常，是否回滚到原书源？"; role = "dialog";
      actions = actionButton(route, "rollback-confirm", "确认回滚", "rollback-confirm", { primary: true }) + actionButton(route, "rollback-cancel", "取消", "rollback-cancel", { initial: true });
    } else {
      title = "换源预览"; detail = "目录、章节与正文检查已通过。确认后保留当前阅读位置。";
      extra = '<section class="fd-w3-preview-grid"><article><strong>原源</strong><span>' + esc(ctx.source) + '</span></article><article><strong>新源</strong><span>' + esc(selected.source || "—") + '</span></article></section>';
      actions = actionButton(route, "confirm", "确认换源", "commit", { primary: true }) + actionButton(route, "back-to-candidates", "返回候选列表", "back-to-candidates");
    }
    return '<section class="fd-w3-state-card fd-w3-state-card--' + esc(route.replace("source-switch-", "")) + '" role="' + role + '"' + (role === "dialog" ? ' aria-modal="true" aria-labelledby="source-switch-state-title"' : ' aria-label="' + esc(title) + '"') + ' data-w3-state-card>' +
      '<header><span aria-hidden="true">' + icon(route === "source-switch-error" ? "warning" : "source-switch", "fd-medium-icon") + '</span><strong id="source-switch-state-title">' + esc(title) + '</strong></header><p>' + esc(detail) + '</p>' + extra +
      '<dl><dt>书籍</dt><dd>' + esc(ctx.title) + '</dd><dt>章节</dt><dd>' + esc(ctx.chapter) + '</dd></dl><section class="fd-w3-state-actions">' + actions + '</section></section>';
  }
  function sourceSwitchV2(data, route, appState) {
    if (ROUTES.indexOf(route) < 0) return null;
    var owned = injectAppState(appState);
    if (route === "source-switch-results" && !owned.selectedSourceId) {
      var firstAvailable = candidates(data).find(function (item) { return item.state === "可切换"; });
      if (firstAvailable) owned = dispatch({ type: "SELECT", sourceId: firstAvailable.sourceId });
    }
    var body = route === "source-switch" || route === "source-switch-results"
      ? candidateWindow(data, route, appState, owned)
      : stateCard(data, route, appState, owned);
    return flowShell(data, appState, owned, body, route.replace(/-/g, " "), route === "source-switch-rollback" ? "fd-w3-source-switch-dialog" : "");
  }
  function instrumentDom(root, route) {
    if (!root || ROUTES.indexOf(route) < 0) return Object.freeze({ route: route, continuity: null });
    var host = root.querySelector && root.querySelector("[data-source-switch-continuity]");
    var visualRoute = host && host.getAttribute("data-source-switch-visual-route") || "reader";
    var report = window.ReaderRuntimeContract && typeof window.ReaderRuntimeContract.instrumentDom === "function"
      ? window.ReaderRuntimeContract.instrumentDom(host || root, visualRoute)
      : null;
    if (root.setAttribute) root.setAttribute("data-source-switch-runtime-route", route);
    return Object.freeze({ route: route, continuity: report });
  }

  var sourceSwitch = Object.freeze({
    INITIAL_STATE: INITIAL_STATE, SOURCE_IDS: SOURCE_IDS, getState: getState, reducer: reducer, dispatch: dispatch,
    subscribe: subscribe, injectAppState: injectAppState, executeCandidateCheck: executeCandidateCheck,
    executeSwitchCommit: executeSwitchCommit, executeRollback: executeRollback, reset: function () { return dispatch({ type: "RESET" }); }
  });
  function sourceSwitchEmptyScreen(data, appState) { return sourceSwitchV2(data, "source-switch-empty", appState); }
  function sourceSwitchErrorScreen(data, appState) { return sourceSwitchV2(data, "source-switch-error", appState); }
  function sourceSwitchTimeoutScreen(data, appState) { return sourceSwitchV2(data, "source-switch-timeout", appState); }
  function sourceSwitchLoadingScreen(data, appState) { return sourceSwitchV2(data, "source-switch-loading", appState); }
  function sourceSwitchRollbackScreen(data, appState) { return sourceSwitchV2(data, "source-switch-rollback", appState); }
  function sourceSwitchPreviewScreen(data, appState) { return sourceSwitchV2(data, "source-switch-preview", appState); }
  var INTEGRATION_MAP = Object.freeze(ROUTES.reduce(function (map, route) { map[route] = "sourceSwitchV2"; return map; }, {}));
  window.ReaderW3SourceSwitchRenderers = Object.freeze({
    ROUTES: ROUTES, SOURCE_IDS: SOURCE_IDS, SOURCE_CONTROL_SPECS: SOURCE_CONTROL_SPECS, INTEGRATION_MAP: INTEGRATION_MAP,
    sourceSwitchV2: sourceSwitchV2, sourceSwitchEmptyScreen: sourceSwitchEmptyScreen,
    sourceSwitchErrorScreen: sourceSwitchErrorScreen, sourceSwitchTimeoutScreen: sourceSwitchTimeoutScreen,
    sourceSwitchLoadingScreen: sourceSwitchLoadingScreen, sourceSwitchRollbackScreen: sourceSwitchRollbackScreen,
    sourceSwitchPreviewScreen: sourceSwitchPreviewScreen,
    identity: identity, identityAttrs: identityAttrs, instrumentDom: instrumentDom,
    sourceSwitch: sourceSwitch
  });
  if (typeof module !== "undefined" && module.exports) module.exports = window.ReaderW3SourceSwitchRenderers;
})(typeof window !== "undefined" ? window : globalThis);
