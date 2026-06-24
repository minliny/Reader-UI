(function attachDiscoveryHomeRenderer(window) {
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
    const icons = {
      search: '<svg class="ds-icon" viewBox="0 0 48 48"><circle cx="21" cy="21" r="13"></circle><path d="M31 31 42 42"></path></svg>',
      more: '<svg class="ds-icon" viewBox="0 0 48 48"><circle cx="24" cy="10" r="3" fill="currentColor" stroke="none"></circle><circle cx="24" cy="24" r="3" fill="currentColor" stroke="none"></circle><circle cx="24" cy="38" r="3" fill="currentColor" stroke="none"></circle></svg>',
      chevron: '<svg class="ds-icon" viewBox="0 0 48 48"><path d="m18 9 15 15-15 15"></path></svg>',
      refresh: '<svg class="ds-icon" viewBox="0 0 48 48"><path d="M37 17a15 15 0 1 0 1 15"></path><path d="M37 8v9h-9"></path></svg>',
      source: '<svg class="ds-icon" viewBox="0 0 48 48"><path d="m24 8 17 8-17 8-17-8 17-8Z" fill="currentColor" stroke="none"></path><path d="m7 24 17 8 17-8"></path><path d="m7 32 17 8 17-8"></path></svg>',
      database: '<svg class="ds-icon" viewBox="0 0 48 48"><path d="M10 15c0-4 6-7 14-7s14 3 14 7-6 7-14 7-14-3-14-7Z" fill="currentColor" stroke="none"></path><path d="M10 15v18c0 4 6 7 14 7s14-3 14-7V15"></path><path d="M10 24c0 4 6 7 14 7s14-3 14-7"></path></svg>',
      shield: '<svg class="ds-icon" viewBox="0 0 48 48"><path d="M24 6 39 12v12c0 10-6 16-15 19C15 40 9 34 9 24V12l15-6Z"></path><path d="m17 24 5 5 10-12"></path></svg>',
      bookshelf: '<svg class="ds-icon" viewBox="0 0 48 48"><path d="M12 10c5 0 9 1.5 12 5v25c-3-3.5-7-5-12-5V10Z" fill="currentColor" stroke="none"></path><path d="M36 10c-5 0-9 1.5-12 5v25c3-3.5 7-5 12-5V10Z" fill="currentColor" stroke="none"></path></svg>',
      discover: '<svg class="ds-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="16"></circle><path d="m30 17-4 12-8 4 4-12 8-4Z"></path></svg>',
      rss: '<svg class="ds-icon" viewBox="0 0 48 48"><path d="M10 30a8 8 0 0 1 8 8"></path><path d="M10 20a18 18 0 0 1 18 18"></path><path d="M10 10a28 28 0 0 1 28 28"></path><circle cx="13" cy="35" r="2" fill="currentColor" stroke="none"></circle></svg>',
      settings: '<svg class="ds-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="7"></circle><path d="M24 5v6M24 37v6M7.5 14.5l5.2 3M35.3 30.5l5.2 3M7.5 33.5l5.2-3M35.3 17.5l5.2-3M5 24h6M37 24h6"></path></svg>'
    };
    return icons[name] || icons.search;
  }

  function searchEntry(search) {
    return `
      <button class="ds-search-entry" type="button" aria-label="进入书籍搜索">
        <span class="ds-search-entry-icon">${icon("search")}</span>
        <span>${esc((search || {}).placeholder || "搜索书名、作者或来源")}</span>
      </button>`;
  }

  function sourceTypeSegment(types) {
    return `
      <nav class="ds-source-segment" aria-label="信息源类型">
        ${(types || []).map((type) => `
          <button class="ds-source-tab${type.active ? " is-active" : ""}" type="button"${type.active ? ' aria-current="true"' : ""}>
            ${esc(type.label)}
          </button>`).join("")}
      </nav>`;
  }

  function currentSourceCard(data) {
    return `
      <section class="ds-card ds-source-card" aria-label="信息源">
        <div class="ds-card-head">
          <h2>信息源</h2>
          ${sourceTypeSegment(data.sourceTypes || [])}
        </div>
        <button class="ds-current-source" type="button">
          <span class="ds-source-icon" aria-hidden="true">${icon("source")}</span>
          <span class="ds-current-main">
            <strong>${esc((data.currentSource || {}).title || "当前来源")}</strong>
            <span>${esc((data.currentSource || {}).meta || "")}</span>
          </span>
          <span class="ds-down">${icon("chevron")}</span>
          <span class="ds-change-source">${esc((data.currentSource || {}).actionLabel || "切换来源")}</span>
        </button>
        <p class="ds-source-note">${esc((data.currentSource || {}).status || "")}</p>
      </section>`;
  }

  function categoryPanel(data) {
    return `
      <section class="ds-card ds-category-card" aria-label="当前分类">
        <h2>当前分类</h2>
        <div class="ds-category-row">
          ${(data.categories || []).map((item) => `
            <button class="ds-category-chip${item.active ? " is-active" : ""}" type="button">${esc(item.label)}</button>`).join("")}
          <button class="ds-more-category" type="button">
            ${esc(data.categoryMoreLabel || "更多分类")}
            ${icon("chevron")}
          </button>
        </div>
      </section>`;
  }

  function sourceBadge(label) {
    return `<span class="ds-source-badge">${esc(label)}</span>`;
  }

  function discoveryContentCard(content, state) {
    if (state === "loading") {
      return `
        <section class="ds-card ds-content-card" aria-label="推荐内容加载中">
          <div class="ds-content-head">
            <h2>${esc((content || {}).title || "推荐内容")}</h2>
            <span class="ds-link-button">刷新 ${icon("refresh")}</span>
          </div>
          <div class="ds-loading-list">
            <span class="ds-skeleton-cover"></span>
            <span class="ds-skeleton-copy">
              <span class="ds-skeleton-line"></span>
              <span class="ds-skeleton-line is-short"></span>
              <span class="ds-skeleton-line is-tiny"></span>
            </span>
            <span class="ds-skeleton-cover"></span>
            <span class="ds-skeleton-copy">
              <span class="ds-skeleton-line"></span>
              <span class="ds-skeleton-line is-short"></span>
              <span class="ds-skeleton-line is-tiny"></span>
            </span>
          </div>
        </section>`;
    }

    return `
      <section class="ds-card ds-content-card" aria-label="推荐内容">
        <div class="ds-content-head">
          <h2>${esc((content || {}).title || "推荐内容")}</h2>
          <button class="ds-link-button" type="button">${esc((content || {}).refreshLabel || "刷新")} ${icon("refresh")}</button>
        </div>
        <div class="ds-featured-list">
          ${((content || {}).featured || []).map((item) => `
            <article class="ds-featured-item">
              <img class="ds-book-cover" src="${esc(item.cover)}" alt="${esc(item.title)}封面">
              <div class="ds-book-info">
                <h3>${esc(item.title)}</h3>
                <p>${esc(item.author)} ${sourceBadge(item.source)}</p>
                <p>${esc(item.desc)}</p>
              </div>
              <button class="ds-action-button${item.inBookshelf ? " is-primary" : ""}" type="button">${esc(item.actionLabel)}</button>
            </article>`).join("")}
        </div>
      </section>`;
  }

  function sourceStatusBar(status) {
    return `
      <section class="ds-source-status" aria-label="来源状态条">
        <span class="ds-status-left">${icon("database")} ${esc((status || {}).sourceCount || "")} · ${esc((status || {}).availableCount || "")} · ${esc((status || {}).updatedAt || "")}</span>
        <button type="button">${icon("shield")} ${esc((status || {}).actionLabel || "检测")}</button>
      </section>`;
  }

  function rankTone(tone) {
    return ` is-${tone || "muted"}`;
  }

  function rankingCard(ranking) {
    return `
      <section class="ds-card ds-ranking-card" aria-label="榜单更新">
        <div class="ds-ranking-head">
          <h2>${esc((ranking || {}).title || "榜单更新")}</h2>
          <button class="ds-link-button" type="button">${esc((ranking || {}).moreLabel || "更多")} ${icon("chevron")}</button>
        </div>
        <div class="ds-ranking-list">
          ${((ranking || {}).items || []).map((item) => `
            <article class="ds-rank-row">
              <img class="ds-rank-cover" src="${esc(item.cover)}" alt="${esc(item.title)}封面">
              <span class="ds-rank-number${item.rank <= 3 ? " is-top" : ""}">${esc(item.rank)}</span>
              <div class="ds-rank-info">
                <h3>${esc(item.title)} ${sourceBadge(item.source)}</h3>
                <p>${esc(item.author)}</p>
              </div>
              <span class="ds-rank-state${rankTone(item.tone)}">${esc(item.state)}</span>
              <span class="ds-rank-chevron">${icon("chevron")}</span>
            </article>`).join("")}
        </div>
      </section>`;
  }

  function feedbackBlock(data, state) {
    const feedback = ((data.feedback || {})[state] || {});
    return `
      <section class="ds-card ds-feedback-card" aria-label="${esc(feedback.title)}">
        <div class="ds-feedback-icon">${state === "error" || state === "offline" ? icon("refresh") : icon("source")}</div>
        <h2>${esc(feedback.title)}</h2>
        <p>${esc(feedback.copy)}</p>
        <div class="ds-feedback-actions">
          <button class="ds-action-button is-primary" type="button">${esc(feedback.primaryAction || "刷新")}</button>
          <button class="ds-action-button" type="button">${esc(feedback.secondaryAction || "切换来源")}</button>
        </div>
      </section>`;
  }

  function mainTabFrame(data, contentHtml) {
    return window.MainTabPageKit.renderPage({
      data,
      contentHtml,
      ariaLabel: "发现首页组件预览",
      defaultTitle: "发现",
      frameWidth: 831,
      frameHeight: 1893,
      pageClass: "ds-page-frame",
      statusBarClass: "ds-status-bar",
      systemIconsClass: "ds-system-icons",
      wifiClass: "ds-wifi",
      signalClass: "ds-signal",
      batteryClass: "ds-battery",
      topBarClass: "ds-app-top-bar",
      titleClass: "ds-app-title",
      topActionsClass: "ds-top-actions",
      iconClass: "ds-icon",
      navClass: "ds-bottom-nav",
      navItemClass: "ds-nav-item"
    });
  }

  function discoveryHomeHtml(data, options) {
    const state = options && options.state ? options.state : "default";
    const feedbackState = ["empty", "error", "offline"].includes(state);
    return mainTabFrame(data, `
        ${searchEntry(data.search)}
        <div class="ds-scroll-area">
          ${currentSourceCard(data)}
          ${categoryPanel(data)}
          ${feedbackState ? feedbackBlock(data, state) : discoveryContentCard(data.content, state)}
          ${feedbackState ? "" : `${sourceStatusBar(data.statusBar)}${rankingCard(data.ranking)}`}
        </div>`);
  }

  function renderDiscoveryHome(target, data, options) {
    target.innerHTML = discoveryHomeHtml(data, options || {});
  }

  function stateData(data, state) {
    const next = clone(data);
    if (state === "subscription") {
      next.sourceTypes = next.sourceTypes.map((type) => Object.assign({}, type, { active: type.type === "subscription" }));
      next.currentSource.title = "RSS 订阅源";
      next.currentSource.meta = "6 个订阅源";
      next.currentSource.status = "分类来自当前订阅源";
      next.categories = [
        { label: "全部", active: true },
        { label: "科技", active: false },
        { label: "阅读", active: false },
        { label: "博客", active: false },
        { label: "更新", active: false }
      ];
      next.content.title = "RSS 订阅源 · 全部";
    }
    if (state === "loading") {
      next.sourceTypes = next.sourceTypes.map((type) => Object.assign({}, type, { active: type.type === "all" }));
    }
    if (state === "empty") {
      next.currentSource.title = "冷门书源组";
      next.statusBar.updatedAt = "1 小时前";
    }
    if (state === "error") {
      next.currentSource.status = "当前来源暂不可用";
    }
    if (state === "offline") {
      next.statusBar.availableCount = "0 个可用";
    }
    return next;
  }

  function renderDiscoveryHomeStateMatrix(target, data) {
    const states = [
      { key: "default", title: "发现默认态", desc: "书源类型、当前来源、分类、推荐内容、状态条和榜单完整展示。" },
      { key: "subscription", title: "订阅源切换态", desc: "来源类型切换到订阅，分类来自当前来源，不混入全局分类池。" },
      { key: "loading", title: "来源切换加载态", desc: "页面框架和来源上下文不变，只让内容区进入骨架态。" },
      { key: "empty", title: "来源无内容态", desc: "使用稳定状态卡，提供刷新和管理来源入口。" },
      { key: "error", title: "来源加载失败态", desc: "保留当前来源与分类，提供重试和切换来源。" },
      { key: "offline", title: "网络不可用态", desc: "说明离线影响，同时保留已缓存入口。" }
    ];

    target.innerHTML = window.MainTabPageKit.renderStateMatrix({
      data,
      title: "发现首页状态矩阵",
      desc: "用于前端实现时核对主导航高亮、来源类型切换、内容加载和异常状态。",
      states,
      frameWidth: 831,
      frameHeight: 1893,
      stateClass: "ds-state-workbench",
      stateHeaderClass: "ds-state-header",
      stateGridClass: "ds-state-grid",
      stateCardClass: "ds-state-card",
      stateMetaClass: "ds-state-meta",
      stateViewportClass: "ds-state-viewport",
      stateScaleClass: "ds-state-scale",
      getStateData: stateData,
      renderFrame: discoveryHomeHtml
    });
  }

  window.DiscoveryHomeInput = {
    renderDiscoveryHome,
    renderDiscoveryHomeStateMatrix
  };
})(window);
