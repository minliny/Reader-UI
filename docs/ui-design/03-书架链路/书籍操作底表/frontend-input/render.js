(function attachBookActionSheetRenderer(window) {
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function pct(value) {
    const numeric = Number(value);
    return `${Math.max(0, Math.min(100, Number.isFinite(numeric) ? numeric : 0))}%`;
  }

  function clone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function icon(name) {
    const icons = {
      search: '<svg class="ba-icon" viewBox="0 0 48 48"><circle cx="21" cy="21" r="13"></circle><path d="M31 31 42 42"></path></svg>',
      more: '<svg class="ba-icon" viewBox="0 0 48 48"><circle cx="24" cy="10" r="3" fill="currentColor" stroke="none"></circle><circle cx="24" cy="24" r="3" fill="currentColor" stroke="none"></circle><circle cx="24" cy="38" r="3" fill="currentColor" stroke="none"></circle></svg>',
      chevron: '<svg class="ba-icon" viewBox="0 0 48 48"><path d="m18 10 13 14-13 14"></path></svg>',
      warning: '<svg class="ba-icon" viewBox="0 0 48 48"><path d="M24 7 43 40H5L24 7Z"></path><path d="M24 18v11"></path><path d="M24 35h.01"></path></svg>',
      retry: '<svg class="ba-icon" viewBox="0 0 48 48"><path d="M37 17a15 15 0 1 0 1 15"></path><path d="M37 8v9h-9"></path></svg>'
    };
    return icons[name] || icons.chevron;
  }

  function statusBar(data) {
    return `<header class="ba-status-bar" aria-label="系统状态栏"><span>${esc((data.status || {}).time || "9:41")}</span><span class="ba-battery" aria-hidden="true"></span></header>`;
  }

  function cover(book, modifier) {
    const label = esc(book.coverLabel || book.title || "");
    return `<span class="ba-cover ${modifier || ""} is-${esc(book.coverTone || "blue")}" aria-label="${esc(book.title)}封面"><span>${label}</span><i></i></span>`;
  }

  function backdrop(data) {
    const backdropData = data.backdrop || {};
    return `
      <div class="ba-backdrop-content" aria-label="来源书架上下文">
        <section class="ba-bookshelf-top">
          <h1>${esc(backdropData.title || "书架")}</h1>
          <div class="ba-top-icons">${icon("search")}${icon("more")}</div>
        </section>
        <nav class="ba-backdrop-groups" aria-label="书架分组">
          ${(backdropData.groups || []).map((group) => `<button class="${group.active ? "is-active" : ""}" type="button">${esc(group.label)}</button>`).join("")}
        </nav>
        <section class="ba-backdrop-books" aria-label="书架书籍预览">
          ${(backdropData.books || []).map((book) => `
            <article class="${book.selected ? "is-selected" : ""}">
              ${cover(book)}
              <span class="ba-book-row-main">
                <strong>${esc(book.title)}</strong>
                <small>${esc(book.author)} · ${esc(book.chapter)}</small>
                <span class="ba-progress" style="--value: ${pct(book.progress)}"><i></i></span>
              </span>
              <button type="button" aria-label="${esc(book.title)}更多">${icon("more")}</button>
            </article>`).join("")}
        </section>
      </div>`;
  }

  function bookSummary(book) {
    return `
      <article class="ba-book-summary" aria-label="书籍摘要">
        ${cover(book, "is-large")}
        <span>
          <strong>${esc(book.title)}</strong>
          <small>${esc(book.author)} · ${esc(book.chapter)} · ${esc(book.progress)}%</small>
        </span>
      </article>`;
  }

  function actionRow(action, state) {
    const disabled = state === "loading" && action.type === "delete";
    return `
      <button class="ba-action-row ${action.tone === "danger" ? "is-danger" : ""} ${disabled ? "is-disabled" : ""}" type="button" ${disabled ? "disabled" : ""}>
        <span>
          <strong>${esc(action.title)}</strong>
          <small>${esc(action.copy)}</small>
        </span>
        ${icon("chevron")}
      </button>`;
  }

  function inlineFeedback(data, state) {
    if (state === "loading") {
      const feedback = (data.feedback || {}).loading || {};
      return `
        <section class="ba-inline-feedback is-loading" aria-label="${esc(feedback.title)}">
          <span class="ba-spinner" aria-hidden="true"></span>
          <span><strong>${esc(feedback.title)}</strong><small>${esc(feedback.copy)}</small></span>
        </section>`;
    }
    if (state === "error") {
      const feedback = (data.feedback || {}).error || {};
      return `
        <section class="ba-inline-feedback is-error" aria-label="${esc(feedback.title)}">
          ${icon("retry")}
          <span><strong>${esc(feedback.title)}</strong><small>${esc(feedback.copy)}</small></span>
          <button type="button">${esc(feedback.primaryAction || "重试")}</button>
        </section>`;
    }
    return "";
  }

  function confirmDialog(data, state) {
    if (state !== "danger" && state !== "loading" && state !== "error") {
      return "";
    }
    const confirm = data.confirm || {};
    const loading = state === "loading";
    return `
      <div class="ba-confirm-layer" aria-label="删除确认层">
        <section class="ba-confirm-dialog" role="dialog" aria-modal="true" aria-label="${esc(confirm.title)}">
          <span class="ba-confirm-icon" aria-hidden="true">${icon("warning")}</span>
          <h2>${esc(confirm.title)}</h2>
          <p>${esc(confirm.copy)}</p>
          <div class="ba-confirm-actions">
            <button class="ba-cancel-button" type="button" ${loading ? "disabled" : ""}>${esc(confirm.cancelLabel || "取消")}</button>
            <button class="ba-danger-button" type="button" ${loading ? "disabled" : ""}>${loading ? esc(confirm.loadingLabel || "移除中") : esc(confirm.confirmLabel || "确认移除")}</button>
          </div>
        </section>
      </div>`;
  }

  function bottomSheet(data, state) {
    return `
      <section class="ba-bottom-sheet" aria-label="书籍操作底表">
        <span class="ba-grabber" aria-hidden="true"></span>
        ${bookSummary(data.selectedBook || {})}
        <div class="ba-action-list">
          ${(data.actions || []).map((action) => actionRow(action, state)).join("")}
        </div>
        ${inlineFeedback(data, state)}
        <p class="ba-sheet-hint">${esc(((data.sheet || {}).closeHint) || "删除需二次确认，确认页不属于默认操作底表")}</p>
      </section>`;
  }

  function bookActionSheetHtml(data, options) {
    const state = options && options.state ? options.state : "default";
    return window.LibraryPageKit.renderPage({
      data,
      ariaLabel: "书籍操作底表组件预览",
      pageClass: "ba-page-frame",
      statusHtml: statusBar(data),
      topBarHidden: true,
      contentHtml: backdrop(data),
      bottomActionHtml: '<div class="ba-dim" aria-hidden="true"></div>',
      sheetHtml: bottomSheet(data, state),
      dialogHtml: confirmDialog(data, state)
    });
  }

  function renderBookActionSheet(target, data, options) {
    target.innerHTML = bookActionSheetHtml(data, options || {});
  }

  function stateData(data, state) {
    const next = clone(data);
    if (state === "error") {
      next.feedback.error.copy = "移除失败后仍停留在当前底表，用户可以重试或取消。";
    }
    return next;
  }

  function renderBookActionSheetStateMatrix(target, data) {
    const states = [
      { key: "default", title: "默认操作态", desc: "底表只展示书籍摘要、修改和删除两项。" },
      { key: "danger", title: "删除确认态", desc: "删除必须弹出二次确认，并说明只移除书架记录。" },
      { key: "loading", title: "移除提交中", desc: "确认移除提交中禁用重复点击，保留底表上下文。" },
      { key: "error", title: "移除失败态", desc: "失败时保留当前书籍和来源书架状态，提供重试。" }
    ];

    target.innerHTML = window.LibraryPageKit.renderStateMatrix({
      data,
      states,
      title: "书籍操作底表状态矩阵",
      desc: "用于核对单书操作底表、危险色、二次确认、提交中和失败重试状态。",
      stateClass: "ba-state-workbench",
      stateHeaderClass: "ba-state-header",
      stateGridClass: "ba-state-grid",
      stateCardClass: "ba-state-card",
      stateMetaClass: "ba-state-meta",
      stateViewportClass: "ba-state-viewport",
      stateScaleClass: "ba-state-scale",
      getStateData: stateData,
      renderFrame: bookActionSheetHtml
    });
  }

  window.BookActionSheetInput = {
    renderBookActionSheet,
    renderBookActionSheetStateMatrix
  };
})(window);
