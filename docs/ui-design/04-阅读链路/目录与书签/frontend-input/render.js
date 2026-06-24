(function attachReadingTocBookmarkRenderer(window) {
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
    const semantic = name === "swap" ? "source" : name === "retry" ? "refresh" : name;
    if (window.ReaderShellKit && window.ReaderShellKit.icon) {
      return window.ReaderShellKit.icon(semantic, "tb-icon");
    }
    if (window.ReaderAssetIcons && window.ReaderAssetIcons.renderIcon) {
      return window.ReaderAssetIcons.renderIcon(semantic, "tb-icon");
    }
    return "";
  }

  function shellKit() {
    if (!window.ReaderShellKit) {
      throw new Error("ReaderShellKit is required before 目录与书签/frontend-input/render.js");
    }
    return window.ReaderShellKit;
  }

  function statusRow(data) {
    const status = data.status || {};
    return `<header class="tb-status-row" aria-label="阅读状态"><span>${esc(status.left)}</span><span>${esc(status.time)}</span></header>`;
  }

  function topControl(data) {
    const control = data.topControl || {};
    return `
      <section class="tb-top-control-bar" aria-label="顶部控制栏">
        <button class="tb-top-icon" type="button" aria-label="返回">${icon("back")}</button>
        <div class="tb-book-info">
          <h1>${esc(control.bookTitle)}</h1>
          <p>${esc(control.sourceLine)}</p>
        </div>
        <button class="tb-swap-button" type="button" aria-label="${esc(control.sourceActionLabel)}">${icon("swap")}<span>${esc(control.sourceActionLabel)}</span></button>
        <button class="tb-more-dots" type="button" aria-label="更多">${icon("more")}</button>
      </section>`;
  }

  function readingText(lines) {
    return `<article class="tb-reading-text" aria-label="阅读正文">${(lines || []).map((line) => `<p>${esc(line)}</p>`).join("")}</article>`;
  }

  function segmentTabs(tabs, activeType) {
    return `
      <nav class="tb-segment-tabs" aria-label="目录书签切换">
        ${(tabs || []).map((tab) => {
          const active = (activeType || "directory") === tab.type;
          return `<button class="${active ? "is-active" : ""}" type="button">${esc(tab.label)}</button>`;
        }).join("")}
      </nav>`;
  }

  function searchField(panel, query) {
    return `
      <label class="tb-search-field" aria-label="${esc(panel.searchPlaceholder)}">
        ${icon("search")}
        <span>${esc(query || panel.searchPlaceholder)}</span>
      </label>`;
  }

  function chapterRow(chapter) {
    return `
      <button class="tb-chapter-row ${chapter.current ? "is-current" : ""}" type="button">
        <span>${esc(chapter.title)}</span>
        <strong>${esc(chapter.status)}</strong>
      </button>`;
  }

  function bookmarkRow(bookmark) {
    return `
      <button class="tb-bookmark-row" type="button">
        <span>${icon("bookmark")}</span>
        <div>
          <strong>${esc(bookmark.chapter)} · ${esc(bookmark.location)}</strong>
          <p>${esc(bookmark.excerpt)}</p>
          <small>${esc(bookmark.time)}</small>
        </div>
      </button>`;
  }

  function loadingBlock() {
    return `<div class="tb-list-panel is-loading">${Array.from({ length: 7 }).map(() => `<span class="tb-skeleton-line"></span>`).join("")}</div>`;
  }

  function feedbackBlock(data, key) {
    const feedback = (data.feedback || {})[key] || {};
    return `
      <section class="tb-list-panel tb-feedback-card" aria-label="${esc(feedback.title)}">
        <span>${icon(key === "error" ? "retry" : "bookmark")}</span>
        <h2>${esc(feedback.title)}</h2>
        <p>${esc(feedback.copy)}</p>
        <button type="button">${esc(feedback.primaryAction || "重试")}</button>
      </section>`;
  }

  function directoryList(data, state) {
    if (state === "loading") {
      return loadingBlock();
    }
    if (state === "error") {
      return feedbackBlock(data, "error");
    }
    const panel = data.panel || {};
    const chapters = state === "search" ? (data.search || {}).results || [] : data.chapters || [];
    if (state === "search_empty") {
      return feedbackBlock(data, "searchEmpty");
    }
    return `
      <section class="tb-list-panel" aria-label="目录列表">
        <div class="tb-volume-row"><span>${esc(panel.currentVolume)}</span><button type="button">${esc(panel.returnProgressLabel)}</button></div>
        <div class="tb-chapter-list">${chapters.map(chapterRow).join("")}</div>
        <p class="tb-filter-label">${esc(panel.filterLabel)}</p>
      </section>`;
  }

  function bookmarkList(data, state) {
    if (state === "empty") {
      return feedbackBlock(data, "empty");
    }
    return `<section class="tb-list-panel" aria-label="书签列表">${(data.bookmarks || []).map(bookmarkRow).join("")}</section>`;
  }

  function moreMenu(data, state) {
    if (state !== "more_menu") {
      return "";
    }
    const menu = data.moreMenu || {};
    return `
      <section class="tb-more-menu" aria-label="${esc(menu.title)}">
        <h2>${esc(menu.title)}</h2>
        ${(menu.items || []).map((item) => `<button type="button"><strong>${esc(item.label)}</strong><small>${esc(item.desc)}</small></button>`).join("")}
      </section>`;
  }

  function panelBody(data, state) {
    const tabType = state === "bookmark" || state === "empty" ? "bookmark" : "directory";
    const panel = data.panel || {};
    return `
      <section class="tb-directory-panel" aria-label="目录与书签">
        <header class="tb-panel-head">
          <span><h2>${esc(panel.title)}</h2><p>${esc(panel.meta)}</p></span>
          <button type="button">${esc(panel.fullDirectoryLabel)}</button>
        </header>
        ${state === "search" || state === "search_empty" ? searchField(panel, (data.search || {}).query) : ""}
        ${segmentTabs(panel.tabs, tabType)}
        ${tabType === "bookmark" ? bookmarkList(data, state) : directoryList(data, state)}
        ${moreMenu(data, state)}
      </section>`;
  }

  function moduleNav(items) {
    return (items || []).map((item) => `<button class="${item.active ? "is-active" : ""}" type="button">${icon(item.type)}<span>${esc(item.label)}</span></button>`).join("");
  }

  function brightnessPanel(brightness) {
    brightness = brightness || {};
    return `
      <aside class="tb-brightness-panel" aria-label="亮度控制">
        <strong>${esc(brightness.title)}</strong>
        ${icon("sun")}
        <div class="tb-brightness-rail" style="--value: ${pct(brightness.value)}"><span></span><i></i></div>
        <em>${esc(brightness.autoLabel)}</em>
        <small>${esc(brightness.modeLabel)}</small>
      </aside>`;
  }

  function controlSheet(data, state) {
    return `
      <section class="tb-control-sheet" aria-label="阅读控制层目录面板">
        <span class="tb-grabber" aria-hidden="true"></span>
        <div class="tb-sheet-main">
          ${panelBody(data, state)}
        </div>
        ${brightnessPanel(data.brightness)}
      </section>`;
  }

  function bottomReadout(data) {
    const readout = data.bottomReadout || {};
    return `<footer class="tb-bottom-readout"><span>${esc(readout.progress)}</span><span>${esc(readout.chapter)}</span></footer><div class="tb-bottom-line"></div>`;
  }

  function readingTocBookmarkHtml(data, options) {
    const state = options && options.state ? options.state : "default";
    return shellKit().renderReaderShell({
      frameClass: "tb-page-frame",
      readingSurfaceClass: "tb-reading-surface-host",
      overlayClass: "tb-reader-overlay-host",
      bottomSheetHostClass: "tb-reader-bottom-sheet-host",
      moduleNavClass: "tb-module-nav",
      stateHostClass: "tb-reader-state-host",
      ariaLabel: "目录与书签组件预览",
      readingSurfaceHtml: `
        <div class="tb-reading-haze" aria-hidden="true"></div>
        ${readingText(data.readingText)}`,
      overlayHtml: `
        ${statusRow(data)}
        ${topControl(data)}
        ${bottomReadout(data)}`,
      bottomSheetHtml: controlSheet(data, state),
      moduleNavHtml: moduleNav(data.moduleNav)
    });
  }

  function renderReadingTocBookmark(target, data, options) {
    target.innerHTML = readingTocBookmarkHtml(data, options || {});
  }

  function stateData(data, state) {
    const next = clone(data);
    if (state === "empty") {
      next.bookmarks = [];
    }
    if (state === "search_empty") {
      next.search.query = "星门";
      next.search.results = [];
    }
    return next;
  }

  function renderReadingTocBookmarkStateMatrix(target, data) {
    const states = [
      { key: "default", title: "目录默认态", desc: "目录 tab 激活，当前阅读仅作为章节行弱状态。" },
      { key: "bookmark", title: "书签列表态", desc: "书签 tab 激活，展示章节、摘录、位置和时间。" },
      { key: "search", title: "搜索章节态", desc: "搜索只过滤目录或书签，不跳出阅读上下文。" },
      { key: "empty", title: "暂无书签态", desc: "书签为空时提供返回目录动作。" },
      { key: "loading", title: "目录加载态", desc: "保留阅读和面板结构，只替换列表内容。" },
      { key: "error", title: "目录加载失败态", desc: "保留当前阅读位置，提供重试。" },
      { key: "more_menu", title: "更多菜单态", desc: "更多菜单只包含缓存当前卷和只看未读。" }
    ];

    target.innerHTML = `
      <section class="tb-state-workbench">
        <header class="tb-state-header">
          <h1>目录与书签状态矩阵</h1>
          <p>用于核对阅读目录面板、书签、搜索、更多菜单、加载和错误状态。</p>
        </header>
        <div class="tb-state-grid">
          ${states.map((state) => `
            <article class="tb-state-card">
              <div class="tb-state-meta">
                <h2>${esc(state.title)}</h2>
                <p>${esc(state.desc)}</p>
              </div>
              <div class="tb-state-viewport">
                <div class="tb-state-scale">
                  ${readingTocBookmarkHtml(stateData(data, state.key), { state: state.key })}
                </div>
              </div>
            </article>`).join("")}
        </div>
      </section>`;
  }

  window.ReadingTocBookmarkInput = {
    renderReadingTocBookmark,
    renderReadingTocBookmarkStateMatrix
  };
})(window);
