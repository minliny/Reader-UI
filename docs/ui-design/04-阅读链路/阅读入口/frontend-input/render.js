(function attachReadingEntryRenderer(window) {
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function icon(name) {
    const aliases = {
      continue: "auto-page",
      retry: "refresh"
    };
    const semantic = aliases[name] || name;
    if (window.ReaderShellKit && window.ReaderShellKit.icon) {
      return window.ReaderShellKit.icon(semantic, "re-icon");
    }
    if (window.ReaderAssetIcons && window.ReaderAssetIcons.renderIcon) {
      return window.ReaderAssetIcons.renderIcon(semantic, "re-icon");
    }
    return "";
  }

  function shellKit() {
    if (!window.ReaderShellKit) {
      throw new Error("ReaderShellKit is required before 阅读入口/frontend-input/render.js");
    }
    return window.ReaderShellKit;
  }

  function statusRow(data) {
    const status = data.status || {};
    return `<header class="re-status-row"><span>${esc(status.left)}</span><span>${esc(status.time)}</span></header>`;
  }

  function readingBody(data) {
    const reader = data.reader || {};
    return `
      <article class="re-reading-body" aria-label="阅读正文">
        <h1>${esc(reader.title)}</h1>
        ${(reader.paragraphs || []).map((line) => `<p>${esc(line)}</p>`).join("")}
      </article>`;
  }

  function readingInfo(data) {
    const reader = data.reader || {};
    return `<footer class="re-reading-info"><span>${esc(reader.progress)}</span><span>${esc(reader.chapterLabel)}</span></footer>`;
  }

  function entryActionCard(type, title, meta, actionLabel, primary) {
    return `
      <article class="re-entry-action-card ${primary ? "is-primary" : ""}">
        <span>${icon(type)}</span>
        <div>
          <strong>${esc(title)}</strong>
          <small>${esc(meta)}</small>
        </div>
        <button type="button">${esc(actionLabel)}</button>
      </article>`;
  }

  function entryDock(data) {
    const entry = data.entry || {};
    return `
      <section class="re-entry-dock" aria-label="${esc(entry.title)}">
        <header>
          <span>
            <em>${esc(entry.title)}</em>
            <strong>${esc(entry.source)}</strong>
            <small>${esc(entry.context)}</small>
          </span>
          <button type="button">${esc(entry.backLabel)}</button>
        </header>
        <div>
          ${entryActionCard("continue", entry.resumeTitle, entry.resumeMeta, entry.continueLabel, true)}
          ${entryActionCard("play", entry.startTitle, entry.startMeta, entry.startLabel, false)}
        </div>
      </section>`;
  }

  function loadingOverlay(data) {
    const loading = (data.feedback || {}).loading || {};
    return `
      <section class="re-open-state is-loading" aria-label="${esc(loading.title)}">
        <span>${icon("continue")}</span>
        <h2>${esc(loading.title)}</h2>
        <p>${esc(loading.copy)}</p>
        <div><i></i><i></i><i></i></div>
      </section>`;
  }

  function errorOverlay(data) {
    const error = (data.feedback || {}).error || {};
    return `
      <section class="re-open-state is-error" aria-label="${esc(error.title)}">
        <span>${icon("retry")}</span>
        <h2>${esc(error.title)}</h2>
        <p>${esc(error.copy)}</p>
        <div class="re-repair-actions">
          <button type="button">${esc(error.retryLabel)}</button>
          <button class="is-primary" type="button">${icon("source")} ${esc(error.repairLabel)}</button>
        </div>
      </section>`;
  }

  function offlineOverlay(data) {
    const offline = (data.feedback || {}).offline || {};
    return `
      <section class="re-open-state is-offline" aria-label="${esc(offline.title)}">
        <span>${icon("offline")}</span>
        <h2>${esc(offline.title)}</h2>
        <p>${esc(offline.copy)}</p>
        <div class="re-repair-actions">
          <button class="is-primary" type="button">${esc(offline.primaryAction)}</button>
          <button type="button" disabled>${esc(offline.disabledAction)}</button>
        </div>
      </section>`;
  }

  function stateLayer(data, state) {
    if (state === "loading") return loadingOverlay(data);
    if (state === "error") return errorOverlay(data);
    if (state === "offline") return offlineOverlay(data);
    return entryDock(data);
  }

  function readingEntryHtml(data, options) {
    const state = options && options.state ? options.state : "default";
    const showEntry = !options || options.showEntry !== false;
    return shellKit().renderReaderShell({
      frameClass: "re-page-frame",
      readingSurfaceClass: "re-reading-surface-host",
      overlayClass: "re-reader-overlay-host",
      bottomSheetHostClass: "re-reader-bottom-sheet-host",
      moduleNavClass: "re-reader-module-nav-host",
      stateHostClass: "re-reader-state-host",
      ariaLabel: "阅读入口组件预览",
      readingSurfaceHtml: `
        <div class="re-paper-texture" aria-hidden="true"></div>
        ${readingBody(data)}`,
      overlayHtml: `
        ${statusRow(data)}
        ${readingInfo(data)}`,
      bottomSheetHtml: "",
      moduleNavHtml: "",
      stateHostHtml: showEntry ? stateLayer(data, state) : ""
    });
  }

  function renderReadingEntry(target, data, options) {
    target.innerHTML = readingEntryHtml(data, options || {});
  }

  function renderReadingEntryStateMatrix(target, data) {
    const states = [
      { key: "default", title: "入口可点击态", desc: "从来源页恢复上下文，同时提供开始阅读和继续阅读。" },
      { key: "loading", title: "正在打开态", desc: "提交中禁用重复点击，只显示打开进度。" },
      { key: "error", title: "内容加载异常态", desc: "保留来源上下文，提供重试和更换来源。" },
      { key: "offline", title: "离线缓存态", desc: "网络不可用时保留缓存章节，禁用联网换源。" }
    ];

    target.innerHTML = `
      <section class="re-state-workbench">
        <header class="re-state-header">
          <h1>阅读入口状态矩阵</h1>
          <p>用于核对开始阅读、继续阅读、正在打开、失败修复和离线缓存入口。</p>
        </header>
        <div class="re-state-grid">
          ${states.map((state) => `
            <article class="re-state-card">
              <div class="re-state-meta">
                <h2>${esc(state.title)}</h2>
                <p>${esc(state.desc)}</p>
              </div>
              <div class="re-state-viewport">
                <div class="re-state-scale">
                  ${readingEntryHtml(data, { state: state.key })}
                </div>
              </div>
            </article>`).join("")}
        </div>
      </section>`;
  }

  window.ReadingEntryInput = {
    renderReadingEntry,
    renderReadingEntryStateMatrix
  };
})(window);
