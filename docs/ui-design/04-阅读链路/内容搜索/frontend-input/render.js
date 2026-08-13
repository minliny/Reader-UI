(function attachContentSearchRenderer(window) {
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function icon(name) {
    const semantic = name === "retry" ? "refresh" : name;
    if (window.ReaderShellKit && window.ReaderShellKit.icon) {
      return window.ReaderShellKit.icon(semantic, "cs-icon");
    }
    if (window.ReaderAssetIcons && window.ReaderAssetIcons.renderIcon) {
      return window.ReaderAssetIcons.renderIcon(semantic, "cs-icon");
    }
    return "";
  }

  function shellKit() {
    if (!window.ReaderShellKit) {
      throw new Error("ReaderShellKit is required before 内容搜索/frontend-input/render.js");
    }
    return window.ReaderShellKit;
  }

  function highlight(text, query) {
    const source = esc(text);
    const term = esc(query);
    if (!term) return source;
    return source.split(term).join(`<mark>${term}</mark>`);
  }

  function statusRow(data) {
    const status = data.status || {};
    return `<header class="cs-status-row" aria-label="阅读状态"><span>${esc(status.left)}</span><span>${esc(status.time)}</span></header>`;
  }

  function searchTop(data) {
    const search = data.search || {};
    return `
      <section class="cs-search-top" aria-label="${esc(search.label)}">
        <button class="cs-close-button" type="button" aria-label="关闭搜索">${icon("close")}</button>
        <label class="cs-search-input">
          ${icon("search")}
          <span>${esc(search.query || search.placeholder)}</span>
          <small>${esc(search.label)}</small>
          <button type="button" aria-label="${esc(search.clearLabel)}">${icon("clear")}</button>
        </label>
      </section>`;
  }

  function readingText(data) {
    const query = (data.search || {}).query;
    return `
      <article class="cs-reading-text" aria-label="阅读正文">
        ${(data.readingText || []).map((line) => `<p>${highlight(line, query)}</p>`).join("")}
      </article>`;
  }

  function filters(data) {
    return `
      <nav class="cs-filter-tabs" aria-label="搜索范围">
        ${(data.filters || []).map((filter) => `<button class="${filter.active ? "is-active" : ""}" type="button">${esc(filter.label)}</button>`).join("")}
      </nav>`;
  }

  function resultRow(result, query) {
    return `
      <button class="cs-result-row" type="button">
        <header><strong>${esc(result.title)}</strong><span>${esc(result.meta)}</span>${icon("chevron")}</header>
        <p>${highlight(result.excerpt, query)}</p>
      </button>`;
  }

  function resultList(data) {
    const query = (data.search || {}).query;
    return `<section class="cs-result-list" aria-label="搜索结果">${(data.results || []).map((result) => resultRow(result, query)).join("")}</section>`;
  }

  function loadingBlock(data) {
    const feedback = (data.feedback || {}).loading || {};
    return `
      <section class="cs-feedback-panel is-loading" aria-label="${esc(feedback.title)}">
        <h2>${esc(feedback.title)}</h2>
        <p>${esc(feedback.copy)}</p>
        <div>${Array.from({ length: 4 }).map(() => `<span></span>`).join("")}</div>
      </section>`;
  }

  function feedbackBlock(data, key) {
    const feedback = (data.feedback || {})[key] || {};
    return `
      <section class="cs-feedback-panel" aria-label="${esc(feedback.title)}">
        <i>${icon(key === "empty" ? "search" : "retry")}</i>
        <h2>${esc(feedback.title)}</h2>
        <p>${esc(feedback.copy)}</p>
        <button type="button">${esc(feedback.primaryAction)}</button>
      </section>`;
  }

  function offlineBanner(data) {
    const feedback = (data.feedback || {}).offline || {};
    return `<section class="cs-offline-banner"><strong>${esc(feedback.title)}</strong><span>${esc(feedback.copy)}</span></section>`;
  }

  function panelBody(data, state) {
    if (state === "loading") return loadingBlock(data);
    if (state === "empty") return feedbackBlock(data, "empty");
    if (state === "error") return feedbackBlock(data, "error");
    return `${state === "offline" ? offlineBanner(data) : ""}${resultList(data)}`;
  }

  function panel(data, state) {
    const panelData = data.panel || {};
    return `
      <section class="cs-bottom-sheet" aria-label="${esc(panelData.title)}">
        <span class="cs-grabber" aria-hidden="true"></span>
        <header class="cs-panel-header">
          <span>
            <h1>${esc(panelData.title)}</h1>
            <p>${esc(panelData.bookTitle)} · ${esc((data.search || {}).label)}</p>
          </span>
          <div>
            <strong>${esc(panelData.resultCount)}</strong>
            <nav aria-label="搜索结果切换">
              <button type="button">上一条</button>
              <button type="button">下一条</button>
            </nav>
          </div>
        </header>
        ${filters(data)}
        ${panelBody(data, state)}
        <footer class="cs-panel-tip">${icon("sparkle")}<span>${esc(panelData.tip)}</span></footer>
      </section>`;
  }

  function contentSearchHtml(data, options) {
    const state = options && options.state ? options.state : "default";
    return shellKit().renderReaderShell({
      frameClass: "cs-page-frame",
      readingSurfaceClass: "cs-reading-surface-host",
      overlayClass: "cs-reader-overlay-host",
      bottomSheetHostClass: "cs-reader-bottom-sheet-host",
      moduleNavClass: "cs-reader-module-nav-host",
      stateHostClass: "cs-reader-state-host",
      ariaLabel: "内容搜索组件预览",
      readingSurfaceHtml: `
        <div class="cs-reading-haze" aria-hidden="true"></div>
        ${readingText(data)}`,
      overlayHtml: `
        ${statusRow(data)}
        ${searchTop(data)}
        <div class="cs-keyboard-safe-area" aria-hidden="true"></div>`,
      bottomSheetHtml: panel(data, state),
      moduleNavHtml: ""
    });
  }

  function renderContentSearch(target, data, options) {
    target.innerHTML = contentSearchHtml(data, options || {});
  }

  function renderContentSearchStateMatrix(target, data) {
    const states = [
      { key: "default", title: "搜索结果态", desc: "搜索框聚焦，正文和结果列表均高亮关键词。" },
      { key: "loading", title: "搜索加载态", desc: "保留关键词和范围，只替换结果区为加载态。" },
      { key: "empty", title: "无匹配结果态", desc: "说明无结果并提供清空关键词。" },
      { key: "error", title: "搜索失败态", desc: "索引失败时保留阅读位置并提供重试。" },
      { key: "offline", title: "离线可搜态", desc: "本地内容可搜时不阻断，只提示在线章节不刷新。" }
    ];

    target.innerHTML = `
      <section class="cs-state-workbench">
        <header class="cs-state-header">
          <h1>内容搜索状态矩阵</h1>
          <p>用于核对搜索结果、加载、无匹配、失败和离线可搜状态。</p>
        </header>
        <div class="cs-state-grid">
          ${states.map((state) => `
            <article class="cs-state-card">
              <div class="cs-state-meta">
                <h2>${esc(state.title)}</h2>
                <p>${esc(state.desc)}</p>
              </div>
              <div class="cs-state-viewport">
                <div class="cs-state-scale">
                  ${contentSearchHtml(data, { state: state.key })}
                </div>
              </div>
            </article>`).join("")}
        </div>
      </section>`;
  }

  window.ContentSearchInput = {
    renderContentSearch,
    renderContentSearchStateMatrix
  };
})(window);
