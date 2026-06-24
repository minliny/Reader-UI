(function attachSortFilterRenderer(window) {
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function clone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function icon(name) {
    const assetName = name === "retry" ? "refresh" : name === "empty" ? "list" : name;
    if (window.ReaderAssetIcons && window.ReaderAssetIcons.renderIcon && window.ReaderAssetIcons.has(assetName)) {
      return window.ReaderAssetIcons.renderIcon(assetName, "sf-icon");
    }

    const icons = {
      search: '<svg class="sf-icon" viewBox="0 0 48 48"><circle cx="21" cy="21" r="13"></circle><path d="M31 31 42 42"></path></svg>',
      more: '<svg class="sf-icon" viewBox="0 0 48 48"><circle cx="24" cy="10" r="3" fill="currentColor" stroke="none"></circle><circle cx="24" cy="24" r="3" fill="currentColor" stroke="none"></circle><circle cx="24" cy="38" r="3" fill="currentColor" stroke="none"></circle></svg>',
      retry: '<svg class="sf-icon" viewBox="0 0 48 48"><path d="M37 17a15 15 0 1 0 1 15"></path><path d="M37 8v9h-9"></path></svg>',
      empty: '<svg class="sf-icon" viewBox="0 0 48 48"><path d="M10 13h28"></path><path d="M14 24h20"></path><path d="M18 35h12"></path></svg>'
    };
    return icons[name] || icons.search;
  }

  function statusBar(data) {
    return `<header class="sf-status-bar" aria-label="系统状态栏"><span>${esc((data.status || {}).time || "9:41")}</span><span class="sf-battery" aria-hidden="true"></span></header>`;
  }

  function backdrop(data) {
    const backdropData = data.backdrop || {};
    return `
      <div class="sf-backdrop-content" aria-label="来源书架上下文">
        <section class="sf-bookshelf-top">
          <h1>${esc(backdropData.title || "书架")}</h1>
          <div class="sf-top-icons">${icon("search")}${icon("more")}</div>
        </section>
        <nav class="sf-backdrop-groups" aria-label="书架分组">
          ${(backdropData.groups || []).map((group) => `<button class="${group.active ? "is-active" : ""}" type="button">${esc(group.label)}</button>`).join("")}
        </nav>
        <section class="sf-backdrop-books" aria-label="书架书籍预览">
          ${(backdropData.books || []).map((book) => `
            <article>
              <img src="${esc(book.cover)}" alt="${esc(book.title)}封面">
              <span>
                <strong>${esc(book.title)}</strong>
                <small>${esc(book.meta)}</small>
              </span>
            </article>`).join("")}
        </section>
      </div>`;
  }

  function optionButton(option, mode) {
    return `<button class="sf-option ${option.active ? "is-active" : ""} ${mode === "multi" ? "is-chip" : "is-radio"}" type="button">${esc(option.label)}</button>`;
  }

  function sheetControls(sheet) {
    return `
      <div class="sf-sheet-body">
        ${(sheet.sections || []).map((section) => `
          <section class="sf-control-section" aria-label="${esc(section.title)}">
            <h2>${esc(section.title)}</h2>
            <div class="sf-option-row ${section.mode === "multi" ? "is-wrap" : ""}">
              ${(section.options || []).map((option) => optionButton(option, section.mode)).join("")}
            </div>
          </section>`).join("")}
      </div>`;
  }

  function feedbackBlock(feedback, state) {
    const data = (feedback || {})[state] || {};
    return `
      <section class="sf-feedback-card" aria-label="${esc(data.title)}">
        <div class="sf-feedback-icon">${icon(state === "error" ? "retry" : "empty")}</div>
        <h2>${esc(data.title)}</h2>
        <p>${esc(data.copy)}</p>
        <div class="sf-feedback-actions">
          <button class="sf-apply-button" type="button">${esc(data.primaryAction || "重试")}</button>
          <button class="sf-reset-button" type="button">${esc(data.secondaryAction || "取消")}</button>
        </div>
      </section>`;
  }

  function bottomSheet(data, state) {
    const sheet = data.sheet || {};
    const feedbackState = state === "empty" || state === "error";
    return `
      <section class="sf-bottom-sheet" aria-label="排序与筛选">
        <span class="sf-grabber" aria-hidden="true"></span>
        <h1>${esc(sheet.title || "排序与筛选")}</h1>
        ${feedbackState ? feedbackBlock(data.feedback, state) : sheetControls(sheet)}
        ${feedbackState ? "" : `
          <div class="sf-action-row">
            <button class="sf-reset-button" type="button">${esc(sheet.resetLabel || "重置")}</button>
            <button class="sf-apply-button" type="button">${esc(sheet.applyLabel || "应用")}</button>
          </div>`}
        ${state === "selected" ? `<p class="sf-toast">${esc((data.toast || {}).success || "保存成功")}</p>` : ""}
      </section>`;
  }

  function sortFilterHtml(data, options) {
    const state = options && options.state ? options.state : "default";
    return window.LibraryPageKit.renderPage({
      data,
      pageClass: "sf-page-frame",
      ariaLabel: "排序与筛选组件预览",
      statusHtml: statusBar(data),
      topBarHidden: true,
      defaultTitle: "排序与筛选",
      contentHtml: backdrop(data),
      bottomActionHtml: '<div class="sf-dim" aria-hidden="true"></div>',
      sheetHtml: bottomSheet(data, state)
    });
  }

  function renderSortFilter(target, data, options) {
    target.innerHTML = sortFilterHtml(data, options || {});
  }

  function stateData(data, state) {
    const next = clone(data);
    if (state === "selected") {
      next.sheet.sections[0].options = next.sheet.sections[0].options.map((option) => Object.assign({}, option, { active: option.type === "recent-update" }));
      next.sheet.sections[1].options = next.sheet.sections[1].options.map((option) => Object.assign({}, option, { active: option.type === "asc" }));
      next.sheet.sections[2].options = next.sheet.sections[2].options.map((option) => Object.assign({}, option, { active: option.type === "local" || option.type === "cached" }));
    }
    return next;
  }

  function renderSortFilterStateMatrix(target, data) {
    const states = [
      { key: "default", title: "默认筛选态", desc: "展示当前排序、筛选条件和底部重置/应用操作。" },
      { key: "selected", title: "已选项高亮态", desc: "选择变更后高亮更新，显示轻量保存成功反馈。" },
      { key: "empty", title: "筛选无结果态", desc: "保留底表层级，提示重置后重新筛选。" },
      { key: "error", title: "应用失败态", desc: "保留用户选择，提供重试和取消。" }
    ];

    target.innerHTML = window.LibraryPageKit.renderStateMatrix({
      data,
      states,
      title: "排序与筛选状态矩阵",
      desc: "用于核对底表分层、筛选控件、应用失败和无结果状态。",
      stateClass: "sf-state-workbench",
      stateHeaderClass: "sf-state-header",
      stateGridClass: "sf-state-grid",
      stateCardClass: "sf-state-card",
      stateMetaClass: "sf-state-meta",
      stateViewportClass: "sf-state-viewport",
      stateScaleClass: "sf-state-scale",
      getStateData: stateData,
      renderFrame: sortFilterHtml
    });
  }

  window.SortFilterInput = {
    renderSortFilter,
    renderSortFilterStateMatrix
  };
})(window);
