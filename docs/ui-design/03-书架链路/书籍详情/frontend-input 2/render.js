(function attachBookDetailRenderer(window) {
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
      back: '<svg class="bd-icon" viewBox="0 0 48 48"><path d="M29 10 15 24l14 14"></path><path d="M16 24h27"></path></svg>',
      more: '<svg class="bd-icon" viewBox="0 0 48 48"><circle cx="24" cy="10" r="3" fill="currentColor" stroke="none"></circle><circle cx="24" cy="24" r="3" fill="currentColor" stroke="none"></circle><circle cx="24" cy="38" r="3" fill="currentColor" stroke="none"></circle></svg>',
      chevron: '<svg class="bd-icon" viewBox="0 0 48 48"><path d="m18 9 15 15-15 15"></path></svg>',
      refresh: '<svg class="bd-icon" viewBox="0 0 48 48"><path d="M37 17a15 15 0 1 0 1 15"></path><path d="M37 8v9h-9"></path></svg>',
      source: '<svg class="bd-icon" viewBox="0 0 48 48"><path d="M11 16h22l-6-6"></path><path d="M37 32H15l6 6"></path><path d="M33 10l6 6-6 6"></path><path d="M15 38l-6-6 6-6"></path></svg>',
      check: '<svg class="bd-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="currentColor" stroke="none"></circle><path d="m15 24 6 6 13-15" stroke="#fff" stroke-width="4.2"></path></svg>'
    };
    return icons[name] || icons.more;
  }

  function statusBar(data) {
    return `<header class="bd-status-bar" aria-label="系统状态栏"><span>${esc((data.status || {}).time || "10:30")}</span></header>`;
  }

  function topBar(data) {
    return `
      <section class="bd-top-bar" aria-label="顶部栏">
        <button type="button" aria-label="返回">${icon("back")}</button>
        <h1>${esc((data.topBar || {}).title || "书籍信息")}</h1>
        <button type="button" aria-label="更多">${icon("more")}</button>
      </section>`;
  }

  function bookHeader(book) {
    return `
      <section class="bd-card bd-book-header" aria-label="书籍头部信息">
        <img class="bd-cover" src="${esc(book.cover)}" alt="${esc(book.title)}封面">
        <div class="bd-book-main">
          <h2>${esc(book.title)}</h2>
          <p>${esc(book.author)}</p>
          <p>当前来源：${esc(book.source)} <button type="button">换源</button></p>
          <p>最新：${esc(book.latest)}</p>
          <div class="bd-book-actions">
            <button class="bd-secondary-button" type="button">${esc(book.inBookshelf ? book.bookshelfAction : "加入书架")}</button>
            <button class="bd-primary-button" type="button">${esc(book.readAction)}</button>
          </div>
        </div>
      </section>`;
  }

  function chapterPreview(data, state) {
    if (state === "loading") {
      return `
        <section class="bd-card bd-chapter-card" aria-label="章节预览加载">
          <div class="bd-section-head">
            <h2>章节预览</h2>
            <button type="button">查看目录 ${icon("chevron")}</button>
          </div>
          <div class="bd-skeleton-list">
            ${Array.from({ length: 6 }).map(() => `<span class="bd-skeleton-line"></span>`).join("")}
          </div>
        </section>`;
    }

    const feedbackStates = ["empty", "error", "offline", "permission"];
    if (feedbackStates.includes(state)) {
      return feedbackBlock(data.feedback, state, "bd-chapter-card");
    }

    return `
      <section class="bd-card bd-chapter-card" aria-label="章节预览">
        <div class="bd-section-head">
          <h2>章节预览</h2>
          <button type="button">查看目录 ${icon("chevron")}</button>
        </div>
        <button class="bd-current-chapter" type="button">
          <span>${esc(data.progress.current)} · ${esc(data.progress.label)}</span>
          <strong>${esc(data.progress.percent)}%</strong>
        </button>
        <div class="bd-chapter-list" aria-label="章节预览长列表">
          ${(data.chapters || []).map((chapter) => `
            <button class="bd-chapter-row" type="button">
              <span>${esc(chapter.title)} ${chapter.isNew ? '<em>新</em>' : ""}</span>
              <strong>${esc(chapter.state)}</strong>
            </button>`).join("")}
        </div>
        <p class="bd-chapter-footer">${esc(data.chapterFooter)}</p>
      </section>`;
  }

  function introCard(intro) {
    return `
      <section class="bd-card bd-intro-card" aria-label="简介">
        <div class="bd-section-head">
          <h2>${esc(intro.title)}</h2>
          <button type="button">${esc(intro.actionLabel)} ${icon("chevron")}</button>
        </div>
        <p>${esc(intro.copy)}</p>
      </section>`;
  }

  function feedbackBlock(feedback, state, extraClass) {
    const data = (feedback || {})[state] || {};
    return `
      <section class="bd-card bd-feedback-card ${extraClass || ""}" aria-label="${esc(data.title)}">
        <div class="bd-feedback-icon">${icon(state === "error" || state === "offline" ? "refresh" : "source")}</div>
        <h2>${esc(data.title)}</h2>
        <p>${esc(data.copy)}</p>
        <div class="bd-feedback-actions">
          <button class="bd-primary-button" type="button">${esc(data.primaryAction || "重试")}</button>
          <button class="bd-secondary-button" type="button">${esc(data.secondaryAction || "取消")}</button>
        </div>
      </section>`;
  }

  function sourceSheet(sheet) {
    return `
      <div class="bd-sheet-scrim" aria-label="换源底表遮罩">
        <section class="bd-source-sheet" aria-label="可用来源">
          <span class="bd-grabber" aria-hidden="true"></span>
          <div class="bd-sheet-head">
            <div>
              <h2>${esc(sheet.title)}</h2>
              <p>${esc(sheet.subtitle)}</p>
            </div>
            <button type="button">${icon("refresh")} ${esc(sheet.refreshLabel)}</button>
          </div>
          <div class="bd-source-list">
            ${(sheet.sources || []).map((source) => `
              <button class="bd-source-row${source.current ? " is-current" : ""}" type="button">
                <span class="bd-source-icon">${source.current ? icon("check") : icon("source")}</span>
                <span>
                  <strong>${esc(source.title)}</strong>
                  <small>${esc(source.meta)}</small>
                </span>
                <em>${source.current ? "当前使用" : "可用来源"}</em>
              </button>`).join("")}
          </div>
          <div class="bd-sheet-actions">
            <button class="bd-secondary-button" type="button">${esc(sheet.cancelLabel)}</button>
            <button class="bd-primary-button" type="button">${esc(sheet.confirmLabel)}</button>
          </div>
        </section>
      </div>`;
  }

  function bookDetailHtml(data, options) {
    const state = options && options.state ? options.state : "default";
    return window.LibraryPageKit.renderPage({
      data,
      ariaLabel: "书籍详情组件预览",
      pageClass: "bd-page-frame",
      statusBarClass: "bd-status-bar",
      showSystemIcons: false,
      topBarClass: "bd-top-bar",
      defaultTitle: "书籍信息",
      trailingIcon: "more",
      trailingLabel: "更多",
      iconClass: "bd-icon",
      contentClass: "bd-scroll-area",
      contentHtml: `
          ${bookHeader(data.book)}
          ${chapterPreview(data, state)}
          ${introCard(data.intro)}
      `,
      sheetHtml: state === "source_sheet" ? sourceSheet(data.sourceSheet) : ""
    });
  }

  function renderBookDetail(target, data, options) {
    target.innerHTML = bookDetailHtml(data, options || {});
  }

  function stateData(data, state) {
    const next = clone(data);
    if (state === "empty") {
      next.chapters = [];
    }
    if (state === "offline") {
      next.book.latest = "缓存至第 1856 章 漫长街区";
    }
    if (state === "permission") {
      next.book.source = "本地导入";
    }
    return next;
  }

  function renderBookDetailStateMatrix(target, data) {
    const states = [
      { key: "default", title: "详情默认态", desc: "头部信息、20 条章节预览、简介顺序完整。" },
      { key: "loading", title: "章节加载态", desc: "保留头部和简介，只让章节区骨架加载。" },
      { key: "empty", title: "章节空态", desc: "说明暂无章节预览，提供刷新目录和换源。" },
      { key: "error", title: "加载失败态", desc: "保留当前详情上下文，提供重试。" },
      { key: "offline", title: "网络不可用态", desc: "保留可读缓存，阻断联网刷新动作。" },
      { key: "permission", title: "权限说明态", desc: "本地导入详情需要授权时说明用途。" },
      { key: "source_sheet", title: "详情页内换源底表", desc: "底表覆盖详情页，不进入阅读控制层。" }
    ];

    target.innerHTML = window.LibraryPageKit.renderStateMatrix({
      data,
      states,
      title: "书籍详情状态矩阵",
      desc: "用于核对章节预览在简介上方、20 条章节数据、反馈状态和详情页内换源底表。",
      stateClass: "bd-state-workbench",
      stateHeaderClass: "bd-state-header",
      stateGridClass: "bd-state-grid",
      stateCardClass: "bd-state-card",
      stateMetaClass: "bd-state-meta",
      stateViewportClass: "bd-state-viewport",
      stateScaleClass: "bd-state-scale",
      getStateData: stateData,
      renderFrame: bookDetailHtml
    });
  }

  window.BookDetailInput = {
    renderBookDetail,
    renderBookDetailStateMatrix
  };
})(window);
