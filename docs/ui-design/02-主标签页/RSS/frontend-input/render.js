(function attachRssHomeRenderer(window) {
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
      search: '<svg class="rs-icon" viewBox="0 0 48 48"><circle cx="21" cy="21" r="13"></circle><path d="M31 31 42 42"></path></svg>',
      more: '<svg class="rs-icon" viewBox="0 0 48 48"><circle cx="24" cy="10" r="3" fill="currentColor" stroke="none"></circle><circle cx="24" cy="24" r="3" fill="currentColor" stroke="none"></circle><circle cx="24" cy="38" r="3" fill="currentColor" stroke="none"></circle></svg>',
      refresh: '<svg class="rs-icon" viewBox="0 0 48 48"><path d="M37 17a15 15 0 1 0 1 15"></path><path d="M37 8v9h-9"></path></svg>',
      book: '<svg class="rs-icon" viewBox="0 0 48 48"><path d="M12 10c5 0 9 1.5 12 5v25c-3-3.5-7-5-12-5V10Z" fill="currentColor" stroke="none"></path><path d="M36 10c-5 0-9 1.5-12 5v25c3-3.5 7-5 12-5V10Z" fill="currentColor" stroke="none"></path></svg>',
      mail: '<svg class="rs-icon" viewBox="0 0 48 48"><rect x="9" y="12" width="30" height="24" rx="4" fill="currentColor" stroke="none"></rect><path d="m11 15 13 11 13-11" stroke="#fff" stroke-width="3.8"></path></svg>',
      clock: '<svg class="rs-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="17" fill="currentColor" stroke="none"></circle><path d="M24 14v11h9" stroke="#fff" stroke-width="3.8"></path></svg>',
      chevron: '<svg class="rs-icon" viewBox="0 0 48 48"><path d="m18 9 15 15-15 15"></path></svg>',
      bookshelf: '<svg class="rs-icon" viewBox="0 0 48 48"><path d="M12 10c5 0 9 1.5 12 5v25c-3-3.5-7-5-12-5V10Z" fill="currentColor" stroke="none"></path><path d="M36 10c-5 0-9 1.5-12 5v25c3-3.5 7-5 12-5V10Z" fill="currentColor" stroke="none"></path></svg>',
      discover: '<svg class="rs-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="16"></circle><path d="m30 17-4 12-8 4 4-12 8-4Z"></path></svg>',
      rss: '<svg class="rs-icon" viewBox="0 0 48 48"><path d="M10 30a8 8 0 0 1 8 8"></path><path d="M10 20a18 18 0 0 1 18 18"></path><path d="M10 10a28 28 0 0 1 28 28"></path><circle cx="13" cy="35" r="2" fill="currentColor" stroke="none"></circle></svg>',
      settings: '<svg class="rs-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="7"></circle><path d="M24 5v6M24 37v6M7.5 14.5l5.2 3M35.3 30.5l5.2 3M7.5 33.5l5.2-3M35.3 17.5l5.2-3M5 24h6M37 24h6"></path></svg>'
    };
    return icons[name] || icons.rss;
  }

  function summaryCard(summary) {
    return `
      <section class="rs-summary-card" aria-label="订阅概览">
        <div class="rs-summary-head">
          <h2>${esc((summary || {}).title || "订阅概览")}</h2>
          <button type="button">${icon("refresh")} ${esc((summary || {}).refreshLabel || "刷新")}</button>
        </div>
        <div class="rs-summary-grid">
          ${((summary || {}).items || []).map((item) => `
            <div class="rs-summary-item">
              <span class="rs-summary-icon">${icon(item.icon)}</span>
              <strong>${esc(item.value)}</strong>
              <span>${esc(item.label)}</span>
              ${item.meta ? `<small>${esc(item.meta)}</small>` : ""}
            </div>`).join("")}
        </div>
      </section>`;
  }

  function chips(items, className) {
    return `
      <nav class="${className}" aria-label="筛选">
        ${(items || []).map((item) => `
          <button class="rs-chip${item.active ? " is-active" : ""}" type="button">${esc(item.label)}</button>`).join("")}
      </nav>`;
  }

  function sourceBadge(label) {
    const cls = label === "技术文章" ? " is-green" : label === "书单推送" ? " is-orange" : "";
    return `<span class="rs-source-badge${cls}">${esc(label)}</span>`;
  }

  function entryList(entries) {
    return `
      <div class="rs-entry-list">
        ${(entries || []).map((entry) => `
          <article class="rs-entry-item">
            <span class="rs-unread-dot${entry.unread ? " is-on" : ""}" aria-hidden="true"></span>
            <img class="rs-entry-cover" src="${esc(entry.cover)}" alt="${esc(entry.title)}封面">
            <div class="rs-entry-main">
              <h3>${esc(entry.title)}</h3>
              <p>${sourceBadge(entry.source)}</p>
              <p>${esc(entry.excerpt)}</p>
            </div>
            <div class="rs-entry-side">
              <button type="button" aria-label="${esc(entry.menuLabel || "更多")}">${icon("more")}</button>
              <span>${esc(entry.time)}</span>
              <span class="rs-time-dot${entry.unread ? " is-on" : ""}" aria-hidden="true"></span>
            </div>
          </article>`).join("")}
      </div>`;
  }

  function loadingList() {
    return `
      <div class="rs-entry-list rs-loading-list">
        ${Array.from({ length: 3 }).map(() => `
          <article class="rs-entry-item">
            <span class="rs-unread-dot is-on"></span>
            <span class="rs-skeleton-cover"></span>
            <span class="rs-skeleton-lines">
              <span class="rs-skeleton-line"></span>
              <span class="rs-skeleton-line is-short"></span>
              <span class="rs-skeleton-line is-tiny"></span>
            </span>
            <span class="rs-skeleton-side"></span>
          </article>`).join("")}
      </div>`;
  }

  function feedbackBlock(feedback, state) {
    const data = (feedback || {})[state] || {};
    return `
      <section class="rs-feedback-card" aria-label="${esc(data.title)}">
        <div class="rs-feedback-icon">${icon(state === "error" ? "refresh" : "rss")}</div>
        <h2>${esc(data.title)}</h2>
        <p>${esc(data.copy)}</p>
        <div class="rs-feedback-actions">
          <button class="rs-action-button is-primary" type="button">${esc(data.primaryAction || "重试")}</button>
          <button class="rs-action-button" type="button">${esc(data.secondaryAction || "刷新")}</button>
        </div>
      </section>`;
  }

  function entriesSection(data, state) {
    const isFeedback = ["empty", "unreadEmpty", "error"].includes(state);
    return `
      <section class="rs-section" aria-label="最新订阅">
        <h2 class="rs-section-title">${esc(data.entriesTitle || "最新订阅")}</h2>
        ${state === "loading" ? loadingList() : ""}
        ${isFeedback ? feedbackBlock(data.feedback, state) : ""}
        ${state !== "loading" && !isFeedback ? entryList(data.entries) : ""}
        ${state !== "loading" && !isFeedback ? `<p class="rs-footer">${esc(data.footer || "")}</p>` : ""}
      </section>`;
  }

  function mainTabFrame(data, contentHtml) {
    return window.MainTabPageKit.renderPage({
      data,
      contentHtml,
      ariaLabel: "RSS 首页组件预览",
      defaultTitle: "RSS",
      frameWidth: 866,
      frameHeight: 1815,
      pageClass: "rs-page-frame",
      statusBarClass: "rs-status-bar",
      systemIconsClass: "rs-system-icons",
      wifiClass: "rs-wifi",
      signalClass: "rs-signal",
      batteryClass: "rs-battery",
      topBarClass: "rs-app-top-bar",
      titleClass: "rs-app-title",
      topActionsClass: "rs-top-actions",
      iconClass: "rs-icon",
      navClass: "rs-bottom-nav",
      navItemClass: "rs-nav-item"
    });
  }

  function rssHomeHtml(data, options) {
    const state = options && options.state ? options.state : "default";
    return mainTabFrame(data, `
        <div class="rs-scroll-area">
          ${summaryCard(data.summary)}
          ${chips(data.statusFilters, "rs-status-filters")}
          <section class="rs-source-card" aria-label="订阅源">
            <h2>订阅源</h2>
            ${chips(data.sourceFilters, "rs-source-filters")}
          </section>
          ${entriesSection(data, state)}
        </div>`);
  }

  function renderRssHome(target, data, options) {
    target.innerHTML = rssHomeHtml(data, options || {});
  }

  function stateData(data, state) {
    const next = clone(data);
    if (state === "loading") {
      next.summary.items = next.summary.items.map((item) =>
        item.label === "最近更新" ? Object.assign({}, item, { value: "刷新中", meta: "10:30" }) : item
      );
    }
    if (state === "unreadEmpty") {
      next.statusFilters = next.statusFilters.map((item) => Object.assign({}, item, { active: item.type === "unread" }));
    }
    if (state === "empty") {
      next.summary.items = next.summary.items.map((item) =>
        item.label === "个订阅源" ? Object.assign({}, item, { value: "0" }) : item.label === "条未读" ? Object.assign({}, item, { value: "0" }) : item
      );
    }
    if (state === "error") {
      next.summary.items = next.summary.items.map((item) =>
        item.label === "最近更新" ? Object.assign({}, item, { value: "加载失败", meta: "10:30" }) : item
      );
    }
    return next;
  }

  function renderRssHomeStateMatrix(target, data) {
    const states = [
      { key: "default", title: "RSS 默认态", desc: "完整订阅概览、两组筛选 chip、最新订阅列表和底部导航。" },
      { key: "loading", title: "订阅流刷新中", desc: "概览和筛选不动，只让列表区进入骨架加载。" },
      { key: "empty", title: "无订阅内容态", desc: "没有订阅源或内容时提供添加订阅源入口。" },
      { key: "unreadEmpty", title: "无未读内容态", desc: "保留未读筛选上下文，提示可切回全部。" },
      { key: "error", title: "订阅流加载失败态", desc: "保留页面框架和筛选条件，提供重试。" }
    ];

    target.innerHTML = window.MainTabPageKit.renderStateMatrix({
      data,
      title: "RSS 首页状态矩阵",
      desc: "用于前端实现时核对 RSS 根页、订阅筛选、条目列表和异常状态。",
      states,
      frameWidth: 866,
      frameHeight: 1815,
      stateClass: "rs-state-workbench",
      stateHeaderClass: "rs-state-header",
      stateGridClass: "rs-state-grid",
      stateCardClass: "rs-state-card",
      stateMetaClass: "rs-state-meta",
      stateViewportClass: "rs-state-viewport",
      stateScaleClass: "rs-state-scale",
      getStateData: stateData,
      renderFrame: rssHomeHtml
    });
  }

  window.RssHomeInput = {
    renderRssHome,
    renderRssHomeStateMatrix
  };
})(window);
