(function attachReadingAppearanceRenderer(window) {
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

  function icon(name) {
    const aliases = {
      swap: "source",
      retry: "refresh",
      font: "text"
    };
    const semantic = aliases[name] || name;
    if (window.ReaderShellKit && window.ReaderShellKit.icon) {
      return window.ReaderShellKit.icon(semantic, "ra-icon");
    }
    if (window.ReaderAssetIcons && window.ReaderAssetIcons.renderIcon) {
      return window.ReaderAssetIcons.renderIcon(semantic, "ra-icon");
    }
    return "";
  }

  function shellKit() {
    if (!window.ReaderShellKit) {
      throw new Error("ReaderShellKit is required before 阅读外观/frontend-input/render.js");
    }
    return window.ReaderShellKit;
  }

  function statusRow(data) {
    const status = data.status || {};
    return `<header class="ra-status-row" aria-label="阅读状态"><span>${esc(status.left)}</span><span>${esc(status.time)}</span></header>`;
  }

  function topControl(data) {
    const control = data.topControl || {};
    return `
      <section class="ra-top-control-bar" aria-label="顶部控制栏">
        <button class="ra-top-icon" type="button" aria-label="返回">${icon("back")}</button>
        <div class="ra-book-info">
          <h1>${esc(control.bookTitle)}</h1>
          <p>${esc(control.sourceLine)}</p>
        </div>
        <button class="ra-swap-button" type="button" aria-label="${esc(control.sourceActionLabel)}">${icon("swap")}<span>${esc(control.sourceActionLabel)}</span></button>
        <button class="ra-more-dots" type="button" aria-label="更多">${icon("more")}</button>
      </section>`;
  }

  function readingText(lines) {
    return `<article class="ra-reading-text" aria-label="阅读正文">${(lines || []).map((line) => `<p>${esc(line)}</p>`).join("")}</article>`;
  }

  function panelHeader(data, titleOverride) {
    const panel = data.panel || {};
    return `
      <header class="ra-panel-head">
        <span><h2>${esc(titleOverride || panel.title)}</h2><p>${esc(panel.subtitle)}</p></span>
        <button type="button">${esc(panel.moreLabel)}</button>
      </header>`;
  }

  function stepper(fontSize) {
    fontSize = fontSize || {};
    return `
      <section class="ra-control-row" aria-label="${esc(fontSize.title)}">
        <strong>${esc(fontSize.title)}</strong>
        <div class="ra-stepper">
          <button type="button">${esc(fontSize.minLabel)}</button>
          <span>${esc(fontSize.value)}</span>
          <button type="button">${esc(fontSize.plusLabel)}</button>
        </div>
      </section>`;
  }

  function segmentControl(lineSpacing) {
    lineSpacing = lineSpacing || {};
    return `
      <section class="ra-control-row is-stacked" aria-label="${esc(lineSpacing.title)}">
        <strong>${esc(lineSpacing.title)}</strong>
        <div class="ra-segment-control">
          ${(lineSpacing.options || []).map((item) => `<button class="${item.active ? "is-active" : ""}" type="button">${esc(item.label)}</button>`).join("")}
        </div>
      </section>`;
  }

  function themeSwatches(themes) {
    return `
      <section class="ra-theme-row" aria-label="主题">
        <strong>主题 / 背景</strong>
        <div class="ra-theme-swatches">
          ${(themes || []).map((theme) => `
            <button class="${theme.active ? "is-active" : ""}" type="button" style="--bg:${esc(theme.background)}; --fg:${esc(theme.text)}" aria-label="${esc(theme.label)}">
              <span></span>
            </button>`).join("")}
        </div>
      </section>`;
  }

  function previewCards(data) {
    const panel = data.panel || {};
    const font = ((data.fonts || []).find((item) => item.active) || (data.fonts || [])[0]) || {};
    const animation = ((data.animations || []).find((item) => item.active) || (data.animations || [])[0]) || {};
    return `
      <div class="ra-preview-card-grid">
        <button class="ra-preview-card" type="button">
          <strong>${esc(panel.fontTitle)}</strong>
          <span>${esc(font.label)}</span>
          <small>${esc(panel.fontPreviewLabel)}</small>
        </button>
        <button class="ra-preview-card" type="button">
          <strong>${esc(panel.animationTitle)}</strong>
          <span>${esc(animation.label)}</span>
          <small>${esc(panel.animationPreview)}</small>
        </button>
      </div>`;
  }

  function resetInline(data) {
    return `<button class="ra-reset-inline" type="button">${esc((data.panel || {}).resetLabel)}</button>`;
  }

  function fontOptions(data) {
    return `
      <div class="ra-option-list" aria-label="字体">
        ${(data.fonts || []).map((font) => `
          <button class="ra-font-option${font.active ? " is-active" : ""}" type="button">
            <span><strong>${esc(font.label)}</strong><small>${esc(font.meta)}</small></span>
            <em>${esc(font.preview)}</em>
            ${font.active ? icon("check") : ""}
          </button>`).join("")}
      </div>`;
  }

  function animationOptions(data) {
    return `
      <section class="ra-animation-panel" aria-label="翻页动画">
        <h3>翻页动画</h3>
        <div class="ra-segment-control">
          ${(data.animations || []).map((item) => `<button class="${item.active ? "is-active" : ""}" type="button">${esc(item.label)}</button>`).join("")}
        </div>
      </section>`;
  }

  function editThemePanel(data) {
    const edit = data.editTheme || {};
    return `
      <div class="ra-edit-theme-panel">
        <section>
          <h3>${esc(edit.backgroundLabel)}</h3>
          <div class="ra-theme-swatches is-labeled">
            ${(edit.colors || []).map((color) => `
              <button class="${color.active ? "is-active" : ""}" type="button" style="--bg:${esc(color.value)}; --fg:#17130f">
                <span></span><small>${esc(color.label)}</small>
              </button>`).join("")}
          </div>
        </section>
        <section class="ra-edit-preview">
          <strong>${esc(edit.previewTitle)}</strong>
          <p>${esc(edit.previewCopy)}</p>
        </section>
        <div class="ra-edit-actions">
          <button type="button">${esc((data.panel || {}).resetLabel)}</button>
          <button class="is-primary" type="button">${esc((data.panel || {}).saveLabel)}</button>
        </div>
      </div>`;
  }

  function loadingPanel(data) {
    const feedback = (data.feedback || {}).loading || {};
    return `
      <section class="ra-feedback-panel is-loading" aria-label="${esc(feedback.title)}">
        <h3>${esc(feedback.title)}</h3>
        <p>${esc(feedback.copy)}</p>
        <div>${Array.from({ length: 5 }).map(() => `<span></span>`).join("")}</div>
      </section>`;
  }

  function feedbackPanel(data, key) {
    const feedback = (data.feedback || {})[key] || {};
    return `
      <section class="ra-feedback-panel" aria-label="${esc(feedback.title)}">
        <i>${icon(key === "error" ? "retry" : "font")}</i>
        <h3>${esc(feedback.title)}</h3>
        <p>${esc(feedback.copy)}</p>
        <button type="button">${esc(feedback.primaryAction || "重试")}</button>
      </section>`;
  }

  function appearancePanel(data, state) {
    if (state === "loading") {
      return `${panelHeader(data)}${loadingPanel(data)}`;
    }
    if (state === "error") {
      return `${panelHeader(data)}${feedbackPanel(data, "error")}`;
    }
    if (state === "font") {
      return `${panelHeader(data, "字体")}${fontOptions(data)}${previewCards(data)}`;
    }
    if (state === "theme") {
      return `${panelHeader(data, "主题")}${themeSwatches(data.themes)}${animationOptions(data)}${previewCards(data)}`;
    }
    if (state === "edit") {
      return `${panelHeader(data, "编辑主题")}${editThemePanel(data)}`;
    }
    return `${panelHeader(data)}${stepper(data.fontSize)}<div class="ra-combined-row">${segmentControl(data.lineSpacing)}${themeSwatches(data.themes)}</div>${previewCards(data)}${resetInline(data)}`;
  }

  function moduleNav(items) {
    return `
      <nav class="ra-module-nav" data-slot="readerModuleNav" aria-label="底部模块导航">
        ${(items || []).map((item) => `<button class="${item.active ? "is-active" : ""}" type="button">${icon(item.type)}<span>${esc(item.label)}</span></button>`).join("")}
      </nav>`;
  }

  function brightnessPanel(brightness) {
    brightness = brightness || {};
    return `
      <aside class="ra-brightness-panel" aria-label="亮度控制">
        <strong>${esc(brightness.title)}</strong>
        ${icon("sun")}
        <div class="ra-brightness-rail" style="--value: ${pct(brightness.value)}"><span></span><i></i></div>
        <em>${esc(brightness.autoLabel)}</em>
        <small>${esc(brightness.modeLabel)}</small>
      </aside>`;
  }

  function controlSheet(data, state) {
    return `
      <section class="ra-control-sheet" aria-label="阅读外观面板">
        <span class="ra-grabber" aria-hidden="true"></span>
        <div class="ra-sheet-main">
          <section class="ra-appearance-panel" aria-label="阅读外观">
            ${appearancePanel(data, state)}
          </section>
          ${moduleNav(data.moduleNav)}
        </div>
        ${brightnessPanel(data.brightness)}
      </section>`;
  }

  function bottomReadout(data) {
    const readout = data.bottomReadout || {};
    return `<footer class="ra-bottom-readout"><span>${esc(readout.progress)}</span><span>${esc(readout.chapter)}</span></footer><div class="ra-bottom-line"></div>`;
  }

  function readingAppearanceHtml(data, options) {
    const state = options && options.state ? options.state : "default";
    return shellKit().renderReaderShell({
      frameClass: "ra-page-frame",
      readingSurfaceClass: "ra-reading-surface-host",
      overlayClass: "ra-reader-overlay-host",
      bottomSheetHostClass: "ra-reader-bottom-sheet-host",
      moduleNavClass: "ra-reader-module-nav-host",
      stateHostClass: "ra-reader-state-host",
      ariaLabel: "阅读外观组件预览",
      readingSurfaceHtml: `
        <div class="ra-reading-haze" aria-hidden="true"></div>
        ${readingText(data.readingText)}`,
      overlayHtml: `
        ${statusRow(data)}
        ${topControl(data)}
        ${bottomReadout(data)}`,
      bottomSheetHtml: controlSheet(data, state),
      moduleNavHtml: ""
    });
  }

  function renderReadingAppearance(target, data, options) {
    target.innerHTML = readingAppearanceHtml(data, options || {});
  }

  function renderReadingAppearanceStateMatrix(target, data) {
    const states = [
      { key: "default", title: "外观默认态", desc: "展示字号、行距、主题、字体和翻页动画入口。" },
      { key: "font", title: "字体选择态", desc: "字体列表加载完成，当前字体保持高亮。" },
      { key: "theme", title: "主题选择态", desc: "主题 swatch 和翻页动画即时预览。" },
      { key: "edit", title: "主题编辑态", desc: "编辑背景并保留预览，保存前可恢复默认。" },
      { key: "loading", title: "外观加载态", desc: "只替换面板内容，不清空阅读上下文。" },
      { key: "error", title: "字体加载失败态", desc: "保留当前阅读外观，提供重试。" }
    ];

    target.innerHTML = `
      <section class="ra-state-workbench">
        <header class="ra-state-header">
          <h1>阅读外观状态矩阵</h1>
          <p>用于核对外观主面板、字体、主题、编辑主题、加载和错误状态。</p>
        </header>
        <div class="ra-state-grid">
          ${states.map((state) => `
            <article class="ra-state-card">
              <div class="ra-state-meta">
                <h2>${esc(state.title)}</h2>
                <p>${esc(state.desc)}</p>
              </div>
              <div class="ra-state-viewport">
                <div class="ra-state-scale">
                  ${readingAppearanceHtml(data, { state: state.key })}
                </div>
              </div>
            </article>`).join("")}
        </div>
      </section>`;
  }

  window.ReadingAppearanceInput = {
    renderReadingAppearance,
    renderReadingAppearanceStateMatrix
  };
})(window);
