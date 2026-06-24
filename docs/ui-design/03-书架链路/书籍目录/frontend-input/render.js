(function attachBookDirectoryRenderer(window) {
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
      back: '<svg class="dr-icon" viewBox="0 0 48 48"><path d="M29 10 15 24l14 14"></path><path d="M16 24h27"></path></svg>',
      retry: '<svg class="dr-icon" viewBox="0 0 48 48"><path d="M37 17a15 15 0 1 0 1 15"></path><path d="M37 8v9h-9"></path></svg>',
      directory: '<svg class="dr-icon" viewBox="0 0 48 48"><path d="M13 12h22"></path><path d="M13 24h22"></path><path d="M13 36h22"></path><path d="M7 12h.01M7 24h.01M7 36h.01"></path></svg>'
    };
    return icons[name] || icons.directory;
  }

  function statusBar(data) {
    const status = data.status || {};
    return `
      <header class="dr-status-bar" aria-label="系统状态栏">
        <span>${esc(status.time || "10:30")}</span>
        <span class="dr-system-icons" aria-hidden="true">
          <span class="dr-wifi"></span>
          <span class="dr-signal"></span>
          <span class="dr-battery"></span>
          <span>${esc(status.battery || "")}</span>
        </span>
      </header>`;
  }

  function topBar(data) {
    return `
      <section class="dr-top-bar" aria-label="顶部栏">
        <button type="button" aria-label="返回">${icon("back")}</button>
        <h1>${esc((data.topBar || {}).title || "目录")}</h1>
        <span aria-hidden="true"></span>
      </section>`;
  }

  function summaryBar(summary) {
    return `
      <section class="dr-summary-bar" aria-label="目录摘要">
        <h2>${esc(summary.title)}</h2>
        <p>${esc(summary.sourceLabel)} · ${esc(summary.chapterCount)}</p>
      </section>`;
  }

  function currentRow(current) {
    return `
      <button class="dr-current-row" type="button" aria-label="当前阅读章节">
        <span>
          <strong>${esc(current.title)}</strong>
          <small>${esc(current.label || "当前阅读")}</small>
        </span>
        <em>${esc(current.progress)}%</em>
      </button>`;
  }

  function chapterMarkers(chapter) {
    return Array.isArray(chapter.markers) ? chapter.markers.filter(Boolean) : [];
  }

  function chapterRow(chapter) {
    const markers = chapterMarkers(chapter);
    return `
      <button class="dr-chapter-row" type="button">
        <span>${esc(chapter.title)}</span>
        ${markers.length ? `<strong>${markers.map((marker) => `<em>${esc(marker)}</em>`).join("")}</strong>` : ""}
      </button>`;
  }

  function loadingList() {
    return `
      <div class="dr-list-panel" aria-label="目录加载骨架">
        ${Array.from({ length: 10 }).map(() => `<span class="dr-skeleton-line"></span>`).join("")}
      </div>`;
  }

  function feedbackBlock(feedback, state) {
    const data = (feedback || {})[state] || {};
    return `
      <section class="dr-list-panel dr-feedback-card" aria-label="${esc(data.title)}">
        <div class="dr-feedback-icon">${icon(state === "error" ? "retry" : "directory")}</div>
        <h2>${esc(data.title)}</h2>
        <p>${esc(data.copy)}</p>
        <div class="dr-feedback-actions">
          <button class="dr-primary-button" type="button">${esc(data.primaryAction || "重试")}</button>
          <button class="dr-secondary-button" type="button">${esc(data.secondaryAction || "返回详情")}</button>
        </div>
      </section>`;
  }

  function chapterList(data, state) {
    if (state === "loading") {
      return loadingList();
    }
    if (state === "empty" || state === "error") {
      return feedbackBlock(data.feedback, state);
    }

    return `
      <section class="dr-list-panel" aria-label="章节列表">
        ${currentRow(data.currentChapter)}
        <div class="dr-chapter-list">
          ${(data.chapters || []).map(chapterRow).join("")}
        </div>
        <p class="dr-footer">${esc(data.footer)}</p>
      </section>`;
  }

  function bookDirectoryHtml(data, options) {
    const state = options && options.state ? options.state : "default";
    return window.LibraryPageKit.renderPage({
      data,
      ariaLabel: "书籍目录组件预览",
      pageClass: "dr-page-frame",
      statusBarClass: "dr-status-bar",
      systemIconsClass: "dr-system-icons",
      wifiClass: "dr-wifi",
      signalClass: "dr-signal",
      batteryClass: "dr-battery",
      topBarClass: "dr-top-bar",
      defaultTitle: "目录",
      trailingIcon: null,
      iconClass: "dr-icon",
      contentClass: "dr-content",
      contentHtml: `
          ${summaryBar(data.summary)}
          ${chapterList(data, state)}
      `
    });
  }

  function renderBookDirectory(target, data, options) {
    target.innerHTML = bookDirectoryHtml(data, options || {});
  }

  function stateData(data, state) {
    const next = clone(data);
    if (state === "empty") {
      next.summary.chapterCount = "共 0 章";
      next.chapters = [];
    }
    return next;
  }

  function renderBookDirectoryStateMatrix(target, data) {
    const states = [
      { key: "default", title: "目录默认态", desc: "摘要栏、当前阅读行和章节列表完整展示。" },
      { key: "loading", title: "目录加载态", desc: "保留顶部栏和摘要栏，章节列表使用骨架。" },
      { key: "empty", title: "暂无目录态", desc: "保留返回和重试入口，不做换源。" },
      { key: "error", title: "目录加载失败态", desc: "保留书籍上下文，提供重试和返回详情。" }
    ];

    target.innerHTML = window.LibraryPageKit.renderStateMatrix({
      data,
      states,
      title: "书籍目录状态矩阵",
      desc: "用于核对目录页无主导航、无换源入口、当前阅读行和可复用 ChapterRow。",
      stateClass: "dr-state-workbench",
      stateHeaderClass: "dr-state-header",
      stateGridClass: "dr-state-grid",
      stateCardClass: "dr-state-card",
      stateMetaClass: "dr-state-meta",
      stateViewportClass: "dr-state-viewport",
      stateScaleClass: "dr-state-scale",
      getStateData: stateData,
      renderFrame: bookDirectoryHtml
    });
  }

  window.BookDirectoryInput = {
    renderBookDirectory,
    renderBookDirectoryStateMatrix
  };
})(window);
