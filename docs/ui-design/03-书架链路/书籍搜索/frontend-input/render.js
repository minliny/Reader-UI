(function attachBookSearchRenderer(window) {
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
    const assetName = name === "retry" ? "refresh" : name;
    if (window.ReaderAssetIcons && window.ReaderAssetIcons.renderIcon && window.ReaderAssetIcons.has(assetName)) {
      return window.ReaderAssetIcons.renderIcon(assetName, "rl-icon");
    }

    const icons = {
      back: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M29 10 15 24l14 14"></path><path d="M16 24h27"></path></svg>',
      more: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="24" cy="10" r="3" fill="currentColor" stroke="none"></circle><circle cx="24" cy="24" r="3" fill="currentColor" stroke="none"></circle><circle cx="24" cy="38" r="3" fill="currentColor" stroke="none"></circle></svg>',
      search: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="21" cy="21" r="13"></circle><path d="M31 31 42 42"></path></svg>',
      close: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="currentColor" stroke="none" opacity=".72"></circle><path d="m17 17 14 14M31 17 17 31" stroke="#fff" stroke-width="4"></path></svg>',
      check: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="currentColor" stroke="none"></circle><path d="m15 24 6 6 13-15" stroke="#fff" stroke-width="4.2"></path></svg>',
      chevron: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="m18 9 15 15-15 15"></path></svg>',
      retry: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M37 17a15 15 0 1 0 1 15"></path><path d="M37 8v9h-9"></path></svg>'
    };
    return icons[name] || icons.search;
  }

  function statusBar(data) {
    const status = data.status || {};
    return `
      <header class="ss-status-bar" aria-label="系统状态栏">
        <span>${esc(status.time || "10:30")}</span>
        <span class="ss-system-icons" aria-hidden="true">
          <span class="ss-battery"></span>
        </span>
      </header>`;
  }

  function topBar(data) {
    return `
      <section class="ss-top-bar" aria-label="顶部栏">
        <button class="ss-top-icon" type="button" aria-label="返回">${icon("back")}</button>
        <h1>${esc((data.topBar || {}).title || "书籍搜索")}</h1>
        <button class="ss-top-icon" type="button" aria-label="更多">${icon("more")}</button>
      </section>`;
  }

  function searchBox(search) {
    return `
      <section class="ss-search-box" aria-label="搜索输入">
        <span class="ss-search-icon">${icon("search")}</span>
        <span class="ss-placeholder">${esc(search.query || search.placeholder || "输入书名或作者")}</span>
        <button class="ss-clear-button" type="button" aria-label="${esc(search.clearLabel || "清空")}">${icon("close")}</button>
      </section>`;
  }

  function scopeTabs(scopes) {
    return `
      <nav class="ss-scope-tabs" aria-label="搜索范围">
        ${(scopes || []).map((scope) => `
          <button class="ss-scope-tab${scope.active ? " is-active" : ""}" type="button"${scope.active ? ' aria-current="true"' : ""}>
            ${esc(scope.label)}
          </button>`).join("")}
      </nav>`;
  }

  function groupPanel(panel) {
    return `
      <section class="ss-card ss-group-card" aria-label="选择分组">
        <div class="ss-section-head">
          <div>
            <h2>${esc(panel.title)}</h2>
            <p>${esc(panel.copy)}</p>
          </div>
          <button class="ss-link-button" type="button">
            ${esc(panel.manageLabel)}
            ${icon("chevron")}
          </button>
        </div>
        <div class="ss-chip-grid">
          ${(panel.groups || []).map((group) => `
            <button class="ss-choice-chip${group.active ? " is-active" : ""}" type="button">
              <span>${esc(group.label)}</span>
              ${group.active ? icon("check") : ""}
            </button>`).join("")}
        </div>
      </section>`;
  }

  function historyPanel(history) {
    return `
      <section class="ss-card ss-history-card" aria-label="搜索历史">
        <div class="ss-section-head">
          <h2>${esc(history.title)}</h2>
          <button class="ss-link-button" type="button">${esc(history.clearLabel)}</button>
        </div>
        <div class="ss-history-chips">
          ${(history.items || []).map((item) => `<button class="ss-history-chip" type="button">${esc(item)}</button>`).join("")}
        </div>
      </section>`;
  }

  function resultList(results) {
    return `
      <section class="ss-card ss-results-card" aria-label="搜索结果">
        <div class="ss-section-head">
          <div>
            <h2>搜索结果</h2>
            <p>点击书籍进入详情，或直接加入书架后阅读。</p>
          </div>
        </div>
        <div class="ss-result-list">
          ${(results || []).map((item) => `
            <article class="ss-result-item">
              <img class="ss-result-cover" src="${esc(item.cover)}" alt="${esc(item.title)}封面">
              <div class="ss-result-content">
                <h3>${esc(item.title)}</h3>
                <p>${esc(item.author)} · ${esc(item.source)}</p>
                <p>${esc(item.latest)}</p>
                <span>${esc(item.meta)}</span>
              </div>
              <div class="ss-result-actions">
                <button class="ss-small-button${item.inBookshelf ? " is-muted" : ""}" type="button">${esc(item.inBookshelf ? "阅读" : "加入书架")}</button>
                <button class="ss-text-action" type="button">详情</button>
              </div>
            </article>`).join("")}
        </div>
      </section>`;
  }

  function loadingBlock() {
    return `
      <section class="ss-card ss-feedback-card" aria-label="正在加载">
        <div class="ss-skeleton-row">
          <span class="ss-skeleton-cover"></span>
          <span>
            <span class="ss-skeleton-line"></span>
            <span class="ss-skeleton-line is-short"></span>
            <span class="ss-skeleton-line is-tiny"></span>
          </span>
        </div>
        <div class="ss-skeleton-row">
          <span class="ss-skeleton-cover"></span>
          <span>
            <span class="ss-skeleton-line"></span>
            <span class="ss-skeleton-line is-short"></span>
            <span class="ss-skeleton-line is-tiny"></span>
          </span>
        </div>
      </section>`;
  }

  function feedbackBlock(feedback, state) {
    const data = (feedback || {})[state] || {};
    if (state === "loading") {
      return loadingBlock();
    }
    return `
      <section class="ss-card ss-feedback-card" aria-label="${esc(data.title)}">
        <div class="ss-feedback-icon">${state === "error" ? icon("retry") : icon("search")}</div>
        <h2>${esc(data.title)}</h2>
        <p>${esc(data.copy)}</p>
        ${data.primaryAction ? `<button class="ss-secondary-button" type="button">${esc(data.primaryAction)}</button>` : ""}
      </section>`;
  }

  function primaryAction(data, state) {
    const disabled = state === "loading" ? ' aria-disabled="true"' : "";
    return `<button class="ss-primary-button" type="button"${disabled}>${esc(data.primaryAction || "搜索")}</button>`;
  }

  function bookSearchHtml(data, options) {
    const state = options && options.state ? options.state : "default";
    const isResultState = state === "results";
    const isFeedbackState = ["loading", "empty", "error", "offline", "permission"].includes(state);
    return window.LibraryPageKit.renderPage({
      data,
      pageClass: "ss-page-frame",
      ariaLabel: "书籍搜索组件预览",
      statusHtml: statusBar(data),
      topBarHtml: topBar(data),
      contentHtml: `
        ${searchBox(data.search || {})}
        ${scopeTabs(data.scopes || [])}
        <div class="ss-content">
          ${isResultState ? resultList(data.results || []) : ""}
          ${isFeedbackState ? feedbackBlock(data.feedback || {}, state) : ""}
          ${!isResultState && !isFeedbackState ? `${groupPanel(data.groupPanel || {})}${historyPanel(data.history || {})}` : ""}
        </div>`,
      bottomActionHtml: primaryAction(data, state)
    });
  }

  function renderBookSearch(target, data, options) {
    target.innerHTML = bookSearchHtml(data, options || {});
  }

  function stateData(data, state) {
    const next = clone(data);
    if (state === "results") {
      next.search.query = "长夜余火";
      next.scopes = next.scopes.map((scope) => Object.assign({}, scope, { active: scope.type === "global" }));
    }
    if (state === "empty") {
      next.search.query = "不存在的书名";
    }
    if (state === "offline") {
      next.scopes = next.scopes.map((scope) => Object.assign({}, scope, { active: scope.type === "network" }));
    }
    if (state === "permission") {
      next.scopes = next.scopes.map((scope) => Object.assign({}, scope, { active: scope.type === "local" }));
    }
    return next;
  }

  function renderBookSearchStateMatrix(target, data) {
    const states = [
      { key: "default", title: "默认分组搜索", desc: "未提交关键词时展示搜索框、范围、分组和搜索历史。" },
      { key: "results", title: "结果列表态", desc: "提交关键词后展示搜索结果，支持进入详情或加入书架。" },
      { key: "loading", title: "搜索加载态", desc: "保留搜索上下文，只替换结果区为骨架。" },
      { key: "empty", title: "无结果态", desc: "说明没有结果，并提供清空关键词入口。" },
      { key: "error", title: "失败重试态", desc: "保留关键词和范围，提供重试入口。" },
      { key: "offline", title: "网络不可用态", desc: "阻断网络搜索，但保留本地搜索路径。" },
      { key: "permission", title: "权限说明态", desc: "本地搜索需要授权时先说明用途。" }
    ];

    target.innerHTML = window.LibraryPageKit.renderStateMatrix({
      data,
      states,
      title: "书籍搜索状态矩阵",
      desc: "用于前端实现时核对默认、结果、加载、空、错误、离线和权限状态。",
      stateClass: "ss-state-workbench",
      stateHeaderClass: "ss-state-header",
      stateGridClass: "ss-state-grid",
      stateCardClass: "ss-state-card",
      stateMetaClass: "ss-state-meta",
      stateViewportClass: "ss-state-viewport",
      stateScaleClass: "ss-state-scale",
      getStateData: stateData,
      renderFrame: bookSearchHtml
    });
  }

  window.BookSearchInput = {
    renderBookSearch,
    renderBookSearchStateMatrix
  };
})(window);
