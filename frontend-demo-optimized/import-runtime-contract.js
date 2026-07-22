(function attachImportRuntimeContract(window) {
  "use strict";

  const PRIMARY_ROUTES = Object.freeze([
    "import-conflict-resolve",
    "import-duplicate",
    "import-empty-file",
    "import-format-unsupported",
    "import-parsing",
    "import-partial-success",
    "import-permission-denied",
    "import-result-detail"
  ]);
  const BATCH_ID = "local-book-import-20260721";
  const ITEM_IDS = Object.freeze(["rain-night", "old-book-scan", "missing-chapters"]);
  const CONFLICT_IDS = Object.freeze(["title", "author", "group"]);
  const CONFLICT_CHOICES = Object.freeze(["keep-local", "overwrite", "keep-both"]);

  const CONTROL_SPECS = [];
  function add(route, state, settingsKey, uiEvent, label, focusReturn) {
    CONTROL_SPECS.push(Object.freeze({ route, state, role: "button", settingsKey, uiEvent, label, focusReturn: Boolean(focusReturn) }));
  }
  function addBack(route, state) { add(route, state, "back", "route.pop", "返回导入来源", false); }

  addBack("import-conflict-resolve", "default");
  add("import-conflict-resolve", "default", "conflict-keep-local", "import.conflict.resolve", "全部保留本地", true);
  add("import-conflict-resolve", "default", "conflict-overwrite", "import.conflict.resolve", "全部覆盖本地", true);
  add("import-conflict-resolve", "default", "conflict-keep-both", "import.conflict.resolve", "全部保留两份", true);
  add("import-conflict-resolve", "default", "import-rollback", "import.cancel", "取消并回滚", true);

  addBack("import-duplicate", "default");
  add("import-duplicate", "default", "duplicate-skip-all", "batch.select-all.toggle", "全部跳过", true);
  add("import-duplicate", "default", "duplicate-overwrite-all", "batch.select-all.toggle", "全部覆盖", true);
  add("import-duplicate", "default", "duplicate-review", "selection.item.toggle", "逐项处理", true);
  add("import-duplicate", "default", "import-cancel", "import.cancel", "取消导入", true);

  addBack("import-empty-file", "empty");
  add("import-empty-file", "empty", "file-reselect", "route.push", "重新选择文件", true);
  add("import-empty-file", "empty", "bookshelf-return", "route.popToRoot", "返回书架", true);

  addBack("import-format-unsupported", "error");
  add("import-format-unsupported", "error", "format-convert", "import.format.unsupported", "尝试转换格式", true);
  add("import-format-unsupported", "error", "file-reselect", "route.push", "重新选择文件", true);
  add("import-format-unsupported", "error", "import-cancel", "import.cancel", "取消导入", true);

  addBack("import-parsing", "loading");
  add("import-parsing", "loading", "parse-cancel", "import.cancel", "取消解析", true);
  add("import-parsing", "loading", "parse-background", "route.popToRoot", "后台运行并返回书架", true);

  addBack("import-partial-success", "default");
  add("import-partial-success", "default", "retry-failed", "import.retry.failed", "重试失败项", true);
  add("import-partial-success", "default", "result-detail-open", "route.push", "查看导入详情", true);
  add("import-partial-success", "default", "import-complete", "route.popToRoot", "完成并返回书架", true);

  addBack("import-permission-denied", "permission");
  add("import-permission-denied", "permission", "permission-settings", "permission.open-settings", "前往系统设置", true);
  add("import-permission-denied", "permission", "file-reselect", "permission.recovery.retry", "重新选择文件", true);
  add("import-permission-denied", "permission", "bookshelf-return", "route.popToRoot", "返回书架", true);

  addBack("import-result-detail", "default");
  add("import-result-detail", "default", "report-export", "import.apply", "导出报告", true);
  add("import-result-detail", "default", "import-continue", "route.push", "继续导入", true);
  add("import-result-detail", "default", "bookshelf-return", "route.popToRoot", "返回书架", true);

  const SPEC_BY_ROUTE = new Map();
  CONTROL_SPECS.forEach((spec) => {
    const specs = SPEC_BY_ROUTE.get(spec.route) || [];
    specs.push(spec);
    SPEC_BY_ROUTE.set(spec.route, specs);
  });
  function identityFor(spec) {
    const entityKey = `import-conflict-resolve.control.button.${spec.settingsKey}`;
    const declaration = (window.CANONICAL_CONTROL_DECLARATIONS || []).find((entry) =>
      entry.source === "import-conflict-action" && entry.route === spec.route &&
      entry.state === spec.state && entry.settingsKey === spec.settingsKey
    ) || null;
    return Object.freeze({
      entityKey,
      controlKey: `${entityKey}@${spec.route}.${spec.state}`,
      controlId: `import-conflict-resolve.control.${spec.route}.${spec.state}.button.${spec.settingsKey}`,
      uiEvent: declaration?.uiEvent || null,
      controlIdentityToken: declaration?.controlIdentityToken || null,
      settingsKey: spec.settingsKey
    });
  }
  function instrumentHtml(html, route) {
    const source = String(html || "");
    const specs = SPEC_BY_ROUTE.get(route);
    if (!specs) return source;
    const matches = [...source.matchAll(/<button\b[^>]*>/g)];
    if (matches.length !== specs.length) return source;
    let index = 0;
    return source.replace(/<button\b[^>]*>/g, (tag) => {
      const spec = specs[index++];
      const identity = identityFor(spec);
      const aria = /\baria-label=/.test(tag) ? "" : ` aria-label="${spec.label}"`;
      const restore = spec.focusReturn ? ` data-restore-focus="${identity.controlKey}"` : "";
      const semantic = identity.uiEvent
        ? ` data-ui-event="${identity.uiEvent}"`
        : identity.controlIdentityToken ? ` data-control-token="${identity.controlIdentityToken}"` : "";
      return tag.replace(/>$/, `${aria} data-entity-key="${identity.entityKey}" data-control-key="${identity.controlKey}" data-control-id="${identity.controlId}"${semantic} data-settings-key="${identity.settingsKey}"${restore}>`);
    });
  }

  function defaults() {
    return {
      batchId: BATCH_ID,
      phase: "conflict",
      selectedItemIds: [],
      conflictChoices: Object.fromEntries(CONFLICT_IDS.map((id) => [id, null])),
      pending: null,
      requestEpoch: 0,
      error: null,
      closed: false,
      focusReturnKey: null
    };
  }
  function reducer(state, action) {
    const current = state || defaults();
    switch (action?.type) {
      case "ITEM_TOGGLE": {
        if (!ITEM_IDS.includes(action.itemId)) return current;
        const selected = new Set(current.selectedItemIds);
        if (selected.has(action.itemId)) selected.delete(action.itemId); else selected.add(action.itemId);
        return { ...current, selectedItemIds: [...selected] };
      }
      case "ITEM_SELECT_ALL":
        return { ...current, selectedItemIds: ITEM_IDS.slice() };
      case "ITEM_CLEAR_ALL":
        return { ...current, selectedItemIds: [] };
      case "CONFLICT_CHOOSE":
        if (!CONFLICT_IDS.includes(action.conflictId) || !CONFLICT_CHOICES.includes(action.choice)) return current;
        return { ...current, conflictChoices: { ...current.conflictChoices, [action.conflictId]: action.choice } };
      case "CONFLICT_CHOOSE_ALL":
        if (!CONFLICT_CHOICES.includes(action.choice)) return current;
        return { ...current, conflictChoices: Object.fromEntries(CONFLICT_IDS.map((id) => [id, action.choice])) };
      case "OPERATION_START":
        if (current.pending?.status === "loading") return current;
        return { ...current, phase: action.kind === "retry" ? "parsing" : "applying", pending: { id: action.requestId, kind: action.kind, status: "loading" }, requestEpoch: action.epoch, error: null, closed: false };
      case "OPERATION_SUCCESS":
        if (current.pending?.id !== action.requestId || current.pending.status !== "loading") return current;
        return { ...current, phase: "result", pending: { ...current.pending, status: "success" }, error: null };
      case "OPERATION_FAILED":
        if (current.pending?.id !== action.requestId || current.pending.status !== "loading") return current;
        return { ...current, phase: "error", pending: { ...current.pending, status: "failed" }, error: action.error || "导入操作失败" };
      case "CLOSE":
        return { ...current, phase: "cancelled", pending: current.pending?.status === "loading" ? { ...current.pending, status: "cancelled" } : current.pending, requestEpoch: current.requestEpoch + 1, closed: true, focusReturnKey: action.focusReturnKey || current.focusReturnKey };
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
    if (owner.getState().pending?.status === "loading") return Object.freeze({ status: "duplicate" });
    const epoch = owner.getState().requestEpoch + 1;
    const requestId = `import-${kind}:${++requestSequence}`;
    owner.dispatch({ type: "OPERATION_START", requestId, epoch, kind });
    try {
      const value = await (typeof effect === "function" ? effect({ requestId, epoch, kind, batchId: BATCH_ID }) : Promise.resolve());
      const before = owner.getState();
      if (before.pending?.id !== requestId || before.pending.status !== "loading" || before.requestEpoch !== epoch || before.closed) return Object.freeze({ status: "stale", requestId });
      owner.dispatch({ type: "OPERATION_SUCCESS", requestId });
      return Object.freeze({ status: "success", requestId, value });
    } catch (error) {
      const before = owner.getState();
      if (before.pending?.id !== requestId || before.pending.status !== "loading" || before.requestEpoch !== epoch || before.closed) return Object.freeze({ status: "stale", requestId });
      owner.dispatch({ type: "OPERATION_FAILED", requestId, error: error?.message || String(error) });
      return Object.freeze({ status: "failed", requestId });
    }
  }
  function close(owner, focusReturnKey) {
    if (!owner || owner.getState().closed) return Object.freeze({ status: "closed" });
    owner.dispatch({ type: "CLOSE", focusReturnKey });
    return Object.freeze({ status: "cancelled" });
  }

  const api = Object.freeze({
    PRIMARY_ROUTES,
    BATCH_ID,
    ITEM_IDS,
    CONFLICT_IDS,
    CONFLICT_CHOICES,
    CONTROL_SPECS: Object.freeze(CONTROL_SPECS.slice()),
    defaults,
    reducer,
    createOwner,
    instrumentHtml,
    executeResolve: (owner, effect) => execute(owner, "resolve", effect),
    executeCommit: (owner, effect) => execute(owner, "commit", effect),
    executeRetry: (owner, effect) => execute(owner, "retry", effect),
    close
  });
  window.ReaderImportRuntimeContract = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
