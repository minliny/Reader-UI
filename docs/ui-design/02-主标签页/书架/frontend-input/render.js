(function attachBookshelfRenderer(window) {
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

  function icon(name, sizeClass) {
    const cls = sizeClass || "bs-icon";
    const icons = {
      search: `<svg class="${cls}" viewBox="0 0 48 48"><circle cx="21" cy="21" r="13"></circle><path d="M31 31 42 42"></path></svg>`,
      more: `<svg class="${cls}" viewBox="0 0 48 48"><circle cx="24" cy="10" r="2.8" fill="currentColor" stroke="none"></circle><circle cx="24" cy="24" r="2.8" fill="currentColor" stroke="none"></circle><circle cx="24" cy="38" r="2.8" fill="currentColor" stroke="none"></circle></svg>`,
      chevron: `<svg class="${cls}" viewBox="0 0 48 48"><path d="m18 9 15 15-15 15"></path></svg>`,
      sort: `<svg class="${cls}" viewBox="0 0 48 48"><path d="M8 13h22"></path><path d="M8 24h16"></path><path d="M8 35h10"></path><path d="M34 12v22"></path><path d="m27 28 7 7 7-7"></path></svg>`,
      settings: `<svg class="${cls}" viewBox="0 0 48 48"><circle cx="24" cy="24" r="7"></circle><path d="M24 5v6M24 37v6M7.5 14.5l5.2 3M35.3 30.5l5.2 3M7.5 33.5l5.2-3M35.3 17.5l5.2-3M5 24h6M37 24h6"></path></svg>`,
      book: `<svg class="${cls}" viewBox="0 0 48 48"><path d="M12 10c5 0 9 1.5 12 5v25c-3-3.5-7-5-12-5V10Z" fill="currentColor" stroke="none"></path><path d="M36 10c-5 0-9 1.5-12 5v25c3-3.5 7-5 12-5V10Z" fill="currentColor" stroke="none"></path></svg>`,
      discover: `<svg class="${cls}" viewBox="0 0 48 48"><circle cx="24" cy="24" r="16"></circle><path d="m30 17-4 12-8 4 4-12 8-4Z"></path></svg>`,
      rss: `<svg class="${cls}" viewBox="0 0 48 48"><path d="M10 30a8 8 0 0 1 8 8"></path><path d="M10 20a18 18 0 0 1 18 18"></path><path d="M10 10a28 28 0 0 1 28 28"></path><circle cx="13" cy="35" r="2" fill="currentColor" stroke="none"></circle></svg>`
    };
    return icons[name] || "";
  }

  function chipGroup(groups) {
    return `
      <nav class="bs-chip-group" aria-label="书架分组">
        ${(groups || []).map((group) => `<button type="button" class="bs-chip${group.active ? " is-active" : ""}">${esc(group.label)}</button>`).join("")}
      </nav>`;
  }

  function continueCard(item) {
    if (!item) {
      return `
        <article class="bs-summary-card bs-continue-card">
          <h3 class="bs-card-title">继续阅读</h3>
          <div class="bs-continue-body">
            <div class="bs-cover-placeholder" aria-hidden="true">+</div>
            <div class="bs-continue-info">
              <h4 class="bs-continue-title">暂无继续阅读</h4>
              <p class="bs-meta">添加一本书开始阅读</p>
              <p class="bs-chapter">从本地书或书源导入</p>
            </div>
          </div>
          <button class="bs-read-button" type="button">导入</button>
        </article>`;
    }

    return `
      <article class="bs-summary-card bs-continue-card">
        <h3 class="bs-card-title">继续阅读</h3>
        <div class="bs-continue-body">
          <img class="bs-continue-cover" src="${esc(item.cover)}" alt="${esc(item.title)}封面">
          <div class="bs-continue-info">
            <h4 class="bs-continue-title">${esc(item.title)}</h4>
            <p class="bs-meta">${esc(item.author)}</p>
            <p class="bs-chapter">${esc(item.chapter)}</p>
            <div class="bs-read-line">
              <span class="bs-percent">${esc(item.progressLabel || pct(item.progress))}</span>
              <span class="bs-progress" style="--value: ${pct(item.progress)}"><span></span></span>
            </div>
          </div>
        </div>
        <button class="bs-read-button" type="button">阅读</button>
      </article>`;
  }

  function recentCard(items) {
    const rows = (items || []).map((item) => `
      <div class="bs-update-item">
        <img class="bs-update-cover" src="${esc(item.cover)}" alt="${esc(item.title)}封面">
        <div>
          <p class="bs-update-title">${esc(item.title)}</p>
          <p class="bs-chapter">${esc(item.chapter)}</p>
        </div>
        ${item.unread ? '<span class="bs-dot" aria-hidden="true"></span>' : '<span></span>'}
      </div>`).join("");

    return `
      <article class="bs-summary-card bs-recent-card">
        <div class="bs-recent-head">
          <h3 class="bs-card-title">最近更新</h3>
          <span class="bs-recent-count">${(items || []).length} ${icon("chevron", "bs-icon-sm")}</span>
        </div>
        ${rows || '<div class="bs-empty-row">暂无更新<br>下拉书架可刷新书源</div>'}
      </article>`;
  }

  function summary(data) {
    return `
      <section class="bs-summary-row" aria-label="顶部信息模块">
        ${continueCard(data.continueReading)}
        ${recentCard(data.recentUpdates)}
      </section>`;
  }

  function sectionHead(label) {
    return `
      <section class="bs-section-head" aria-label="我的书架工具栏">
        <h2 class="bs-section-title">我的书架</h2>
        <div class="bs-section-tools">
          <span class="bs-mode-label">${esc(label || "封面")}</span>
          <button type="button" aria-label="排序筛选">${icon("sort", "bs-icon-sm")}</button>
          <button type="button" aria-label="书架设置">${icon("settings", "bs-icon-sm")}</button>
        </div>
      </section>`;
  }

  function loadingGrid() {
    return `
      <section class="bs-book-grid" aria-label="封面网格加载态">
        ${Array.from({ length: 6 }).map(() => `
          <article class="bs-book-card bs-skeleton-card" aria-hidden="true">
            <span class="bs-skeleton-cover"></span>
            <span class="bs-skeleton-line"></span>
            <span class="bs-skeleton-line is-short"></span>
            <span class="bs-skeleton-line is-tiny"></span>
          </article>`).join("")}
      </section>`;
  }

  function bookGrid(books, state) {
    if (state === "loading") {
      return loadingGrid();
    }

    const rows = (books || []).map((book) => `
      <article class="bs-book-card">
        <img class="bs-book-cover" src="${esc(book.cover)}" alt="${esc(book.title)}封面">
        <h3 class="bs-book-title">${esc(book.title)}</h3>
        <p class="bs-book-meta">${esc(book.author)}</p>
        <p class="bs-book-meta">${esc(book.chapter)}</p>
        <div class="bs-book-progress" style="--value: ${pct(book.progress)}"><span></span></div>
      </article>`).join("");

    return `
      <section class="bs-book-grid" aria-label="封面网格">
        ${rows || '<div class="bs-empty-library">书架为空<br>导入本地书或添加书源后会显示在这里</div>'}
      </section>`;
  }

  function mainTabFrame(data, contentHtml) {
    return window.MainTabPageKit.renderPage({
      data,
      contentHtml,
      ariaLabel: "书架封面模式组件预览",
      defaultTitle: "书架",
      frameWidth: 853,
      frameHeight: 1844,
      pageClass: "bs-phone-frame",
      statusBarClass: "bs-status-bar",
      systemIconsClass: "bs-system-icons",
      wifiClass: "bs-wifi",
      signalClass: "bs-signal",
      batteryClass: "bs-battery",
      topBarClass: "bs-app-top-bar",
      titleClass: "bs-app-title",
      topActionsClass: "bs-top-actions",
      iconClass: "bs-icon",
      navClass: "bs-bottom-nav",
      navItemClass: "bs-nav-item",
      navIconClass: "bs-nav-icon"
    });
  }

  function bookshelfHtml(data, options) {
    const state = options && options.state ? options.state : "default";
    const modeLabel = state === "filtering" ? "追更" : "封面";
    return mainTabFrame(data, `
        ${chipGroup(data.groups)}
        ${summary(data)}
        ${sectionHead(modeLabel)}
        ${bookGrid(data.books, state)}`);
  }

  function renderBookshelf(target, data, options) {
    target.innerHTML = bookshelfHtml(data, options || {});
  }

  function stateData(data, state) {
    const next = clone(data);
    if (state === "empty") {
      next.continueReading = null;
      next.recentUpdates = [];
      next.books = [];
    }
    if (state === "filtering") {
      next.groups = next.groups.map((group) => ({ label: group.label, active: group.label === "追更" }));
      next.books = next.books.filter((book) => book.title === "长夜余火" || book.title === "诡秘之主" || book.title === "明朝那些事儿");
    }
    return next;
  }

  function renderBookshelfStateMatrix(target, data) {
    const states = [
      { key: "default", title: "默认封面态", desc: "完整书架、继续阅读、最近更新和底部导航。" },
      { key: "filtering", title: "追更筛选态", desc: "分组切换后只显示追更相关书籍，顶部模式标签同步变化。" },
      { key: "loading", title: "加载态", desc: "保留固定网格尺寸，用骨架块避免布局跳动。" },
      { key: "empty", title: "空书架态", desc: "无继续阅读、无更新、无书籍时的导入引导。" }
    ];

    target.innerHTML = window.MainTabPageKit.renderStateMatrix({
      data,
      title: "书架封面模式状态矩阵",
      desc: "用于前端实现时核对 props、空态、加载态和筛选态。",
      states,
      frameWidth: 853,
      frameHeight: 1844,
      stateClass: "bs-state-workbench",
      stateHeaderClass: "bs-state-header",
      stateGridClass: "bs-state-grid",
      stateCardClass: "bs-state-card",
      stateMetaClass: "bs-state-meta",
      stateViewportClass: "bs-state-viewport",
      stateScaleClass: "bs-state-scale",
      getStateData: stateData,
      renderFrame: bookshelfHtml
    });
  }

  window.BookshelfInput = {
    renderBookshelf,
    renderBookshelfStateMatrix
  };
})(window);
