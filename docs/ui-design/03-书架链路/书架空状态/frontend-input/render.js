(function attachBookshelfEmptyRenderer(window) {
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
    if (window.ReaderAssetIcons && window.ReaderAssetIcons.renderIcon) {
      return window.ReaderAssetIcons.renderIcon(name, "rl-icon");
    }

    const icons = {
      search: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="21" cy="21" r="13"></circle><path d="M31 31 42 42"></path></svg>',
      more: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="24" cy="10" r="3.1" fill="currentColor" stroke="none"></circle><circle cx="24" cy="24" r="3.1" fill="currentColor" stroke="none"></circle><circle cx="24" cy="38" r="3.1" fill="currentColor" stroke="none"></circle></svg>',
      bookshelf: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M12 12h5v24h-5zM21 12h5v24h-5zM30 12h5v24h-5z"></path></svg>',
      discover: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="22" cy="22" r="9"></circle><path d="M29 29 38 38"></path></svg>',
      rss: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M10 30a8 8 0 0 1 8 8"></path><path d="M10 20a18 18 0 0 1 18 18"></path><path d="M10 10a28 28 0 0 1 28 28"></path><circle cx="13" cy="35" r="2" fill="currentColor" stroke="none"></circle></svg>',
      settings: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="7"></circle><path d="M24 5v6M24 37v6M7.5 14.5l5.2 3M35.3 30.5l5.2 3M7.5 33.5l5.2-3M35.3 17.5l5.2-3M5 24h6M37 24h6"></path></svg>'
    };
    return icons[name] || icons.bookshelf;
  }

  function emptyIllustration() {
    return `
      <svg class="se-empty-illustration" viewBox="0 0 249 249" aria-hidden="true">
        <rect x="35" y="19" width="179" height="210" rx="23" fill="none" stroke="currentColor" stroke-width="5"></rect>
        <path d="M125 45v158" stroke="currentColor" stroke-width="5"></path>
        <path d="M73 85h61M73 126h61M73 168h61M144 85h57M144 126h57M144 168h57" stroke="#81786f" stroke-width="3"></path>
      </svg>`;
  }

  function loadingIllustration() {
    return `
      <div class="se-skeleton" aria-label="正在加载">
        <span class="se-skeleton-block"></span>
        <span class="se-skeleton-line"></span>
        <span class="se-skeleton-line is-short"></span>
      </div>`;
  }

  function statusBar(data) {
    return `
      <header class="se-status-bar" aria-label="系统状态栏">
        <span>${esc((data.status || {}).time || "9:41")}</span>
        <span class="se-battery-row" aria-hidden="true">
          <span class="se-battery-outline"></span>
          <span class="se-battery-tip"></span>
        </span>
      </header>`;
  }

  function topBar(data) {
    return `
      <section class="se-top-bar" aria-label="顶部栏">
        <h1 class="se-title">${esc((data.topBar || {}).title || "书架")}</h1>
        <div class="se-top-actions">
          <button type="button" aria-label="搜索">${icon("search")}</button>
          <button type="button" aria-label="更多">${icon("more")}</button>
        </div>
      </section>`;
  }

  function chipRow(groups) {
    return `
      <nav class="se-chip-row" aria-label="书架分组">
        ${(groups || []).map((group) => `<button type="button" class="se-chip${group.active ? " is-active" : ""}">${esc(group.label)}</button>`).join("")}
      </nav>`;
  }

  function emptyContent(state) {
    const loading = state.variant === "loading";
    return `
      <section class="se-content" aria-label="${esc(state.title)}">
        ${loading ? loadingIllustration() : emptyIllustration()}
        <h2 class="se-empty-title">${esc(state.title)}</h2>
        <p class="se-empty-copy">${esc(state.copy)}</p>
        ${(state.primaryAction || state.secondaryAction) ? `
          <div class="se-actions">
            ${state.primaryAction ? `<button class="se-primary-button" type="button">${esc(state.primaryAction)}</button>` : ""}
            ${state.secondaryAction ? `<button class="se-secondary-button" type="button">${esc(state.secondaryAction)}</button>` : ""}
          </div>` : ""}
      </section>`;
  }

  function hint(state) {
    return `<aside class="se-hint">${esc(state.hint || "")}</aside>`;
  }

  function mainNav(items) {
    return `
      <nav class="se-bottom-nav" aria-label="公共主导航">
        ${(items || []).map((item) => `
          <button class="se-nav-item${item.active ? " is-active" : ""}" type="button"${item.active ? ' aria-current="page"' : ""}>
            ${icon(item.type)}
            <span>${esc(item.label)}</span>
          </button>`).join("")}
      </nav>`;
  }

  function statePayload(data, state) {
    if (!state || state === "default") {
      return Object.assign({}, data.emptyState, { variant: "default" });
    }
    if (state === "all-empty") {
      return Object.assign({}, data.variants.allEmpty, { variant: state });
    }
    return Object.assign({}, data.variants[state] || data.emptyState, { variant: state });
  }

  function bookshelfEmptyHtml(data, options) {
    const state = statePayload(data, options && options.state);
    return window.LibraryPageKit.renderPage({
      data,
      pageClass: "se-page-frame",
      ariaLabel: "书架空状态组件预览",
      statusHtml: statusBar(data),
      topBarHtml: topBar(data),
      contentHtml: chipRow(data.groups),
      bottomActionHtml: mainNav(data.bottomNav),
      stateHostHtml: `${emptyContent(state)}${hint(state)}`
    });
  }

  function renderBookshelfEmpty(target, data, options) {
    target.innerHTML = bookshelfEmptyHtml(data, options || {});
  }

  function stateData(data, state) {
    const next = clone(data);
    if (state === "all-empty") {
      next.groups = next.groups.map((group, index) => Object.assign({}, group, { active: index === 0 }));
    }
    return next;
  }

  function renderBookshelfEmptyStateMatrix(target, data) {
    const states = [
      { key: "default", title: "当前分组空态", desc: "当前分组没有书籍，主操作为搜索书籍，次操作为管理分组。" },
      { key: "all-empty", title: "全书架空态", desc: "书架暂无书籍，主操作为添加书籍，次操作为导入本地书。" },
      { key: "loading", title: "首次检查加载态", desc: "只替换主内容区，顶部、分组和底部导航保持稳定。" },
      { key: "error", title: "读取失败态", desc: "保留返回和分组上下文，提供重试入口。" },
      { key: "offline", title: "网络不可用态", desc: "阻断联网搜索，不阻断本地导入和切换分组。" },
      { key: "permission", title: "权限说明态", desc: "本地导入前说明用途，不提前请求全盘权限。" }
    ];

    target.innerHTML = window.LibraryPageKit.renderStateMatrix({
      data,
      states,
      title: "书架空状态矩阵",
      desc: "用于前端实现时核对当前分组空、全书架空、加载、错误、离线和权限说明状态。",
      stateClass: "se-state-workbench",
      stateHeaderClass: "se-state-header",
      stateGridClass: "se-state-grid",
      stateCardClass: "se-state-card",
      stateMetaClass: "se-state-meta",
      stateViewportClass: "se-state-viewport",
      stateScaleClass: "se-state-scale",
      getStateData: stateData,
      renderFrame: bookshelfEmptyHtml
    });
  }

  window.BookshelfEmptyInput = {
    renderBookshelfEmpty,
    renderBookshelfEmptyStateMatrix
  };
})(window);
