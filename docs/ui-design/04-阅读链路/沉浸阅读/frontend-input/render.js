(function attachImmersiveReadingRenderer(window) {
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
      return window.ReaderShellKit.icon(semantic, "ir-icon");
    }
    if (window.ReaderAssetIcons && window.ReaderAssetIcons.renderIcon) {
      return window.ReaderAssetIcons.renderIcon(semantic, "ir-icon");
    }
    return "";
  }

  function shellKit() {
    if (!window.ReaderShellKit) {
      throw new Error("ReaderShellKit is required before 沉浸阅读/frontend-input/render.js");
    }
    return window.ReaderShellKit;
  }

  function backgroundLayer() {
    return `<div class="ir-background-layer" aria-hidden="true"></div>`;
  }

  function infoLayer(data) {
    const info = data.info || {};
    return `
      <section class="ir-info-layer" aria-label="阅读信息层">
        <span class="ir-info-top-left">${esc(info.topLeft)}</span>
        <span class="ir-info-top-right">${esc(info.time)}</span>
        <span class="ir-info-bottom-left">${esc(info.progress)}</span>
        <span class="ir-info-bottom-right">${esc(info.chapterOnly)}</span>
      </section>`;
  }

  function readingLayer(data) {
    const reading = data.reading || {};
    return `
      <article class="ir-reading-layer" aria-label="正文排版层">
        <h1>${esc(reading.title)}</h1>
        ${(reading.paragraphs || []).map((line) => `<p>${esc(line)}</p>`).join("")}
      </article>`;
  }

  function tapZoneLayer(data) {
    return `
      <section class="ir-tap-zone-layer" aria-label="透明点击热区层">
        ${(data.zones || []).map((zone) => `<button class="is-${esc(zone.type)}" type="button" aria-label="${esc(zone.label)}"></button>`).join("")}
      </section>`;
  }

  function loadingLayer(data) {
    const feedback = (data.feedback || {}).loading || {};
    return `
      <section class="ir-feedback-layer is-loading" aria-label="${esc(feedback.title)}">
        <span>${icon("book")}</span>
        <h2>${esc(feedback.title)}</h2>
        <p>${esc(feedback.copy)}</p>
        <div><i></i><i></i><i></i></div>
      </section>`;
  }

  function feedbackLayer(data, key) {
    const feedback = (data.feedback || {})[key] || {};
    return `
      <section class="ir-feedback-layer is-${esc(key)}" aria-label="${esc(feedback.title)}">
        <span>${icon(key === "offline" ? "offline" : "retry")}</span>
        <h2>${esc(feedback.title)}</h2>
        <p>${esc(feedback.copy)}</p>
        <button type="button">${esc(feedback.primaryAction)}</button>
      </section>`;
  }

  function stateLayer(data, state) {
    if (state === "loading") return loadingLayer(data);
    if (state === "error") return feedbackLayer(data, "error");
    if (state === "offline") return feedbackLayer(data, "offline");
    return "";
  }

  function immersiveReadingHtml(data, options) {
    const state = options && options.state ? options.state : "default";
    return shellKit().renderReaderShell({
      frameClass: "ir-page-frame",
      readingSurfaceClass: "ir-reading-surface-host",
      overlayClass: "ir-reader-overlay-host",
      bottomSheetHostClass: "ir-reader-bottom-sheet-host",
      moduleNavClass: "ir-reader-module-nav-host",
      stateHostClass: "ir-reader-state-host",
      ariaLabel: "沉浸阅读组件预览",
      readingSurfaceHtml: `
        ${backgroundLayer()}
        ${readingLayer(data)}`,
      overlayHtml: `
        ${infoLayer(data)}
        ${tapZoneLayer(data)}`,
      bottomSheetHtml: "",
      moduleNavHtml: "",
      stateHostHtml: stateLayer(data, state)
    });
  }

  function renderImmersiveReading(target, data, options) {
    target.innerHTML = immersiveReadingHtml(data, options || {});
  }

  function renderImmersiveReadingStateMatrix(target, data) {
    const states = [
      { key: "default", title: "正文沉浸态", desc: "背景层、正文排版层、弱信息层和透明点击热区分离。" },
      { key: "loading", title: "章节加载态", desc: "保留阅读背景，只在状态层显示加载反馈。" },
      { key: "error", title: "章节失败态", desc: "章节读取失败时提供重试，不进入空白页。" },
      { key: "offline", title: "离线缓存态", desc: "网络不可用时显示缓存章节和弱提示。" }
    ];

    target.innerHTML = `
      <section class="ir-state-workbench">
        <header class="ir-state-header">
          <h1>沉浸阅读状态矩阵</h1>
          <p>${esc((data.rules || {}).chapterOnlyNote)}；不得显示主底部导航。</p>
        </header>
        <div class="ir-state-grid">
          ${states.map((state) => `
            <article class="ir-state-card">
              <div class="ir-state-meta">
                <h2>${esc(state.title)}</h2>
                <p>${esc(state.desc)}</p>
              </div>
              <div class="ir-state-viewport">
                <div class="ir-state-scale">
                  ${immersiveReadingHtml(data, { state: state.key })}
                </div>
              </div>
            </article>`).join("")}
        </div>
      </section>`;
  }

  window.ImmersiveReadingInput = {
    renderImmersiveReading,
    renderImmersiveReadingStateMatrix
  };
})(window);
