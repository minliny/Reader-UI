(function attachAutoPageRenderer(window) {
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
    const semantic = name === "retry" ? "refresh" : name;
    if (window.ReaderShellKit && window.ReaderShellKit.icon) {
      return window.ReaderShellKit.icon(semantic, "ap-icon");
    }
    if (window.ReaderAssetIcons && window.ReaderAssetIcons.renderIcon) {
      return window.ReaderAssetIcons.renderIcon(semantic, "ap-icon");
    }
    return "";
  }

  function shellKit() {
    if (!window.ReaderShellKit) {
      throw new Error("ReaderShellKit is required before 自动翻页/frontend-input/render.js");
    }
    return window.ReaderShellKit;
  }

  function statusRow(data) {
    const status = data.status || {};
    return `<header class="ap-status-row" aria-label="阅读状态"><span>${esc(status.left)}</span><span>${esc(status.time)}</span></header>`;
  }

  function topControl(data) {
    const top = data.topControl || {};
    return `
      <section class="ap-top-control" aria-label="自动翻页顶部控制">
        <button class="ap-close-button" type="button" aria-label="关闭">${icon("close")}</button>
        <span><h1>${esc(top.title)}</h1><p>${esc(top.sourceLine)}</p></span>
        <button class="ap-more-button" type="button" aria-label="更多">${icon("more")}</button>
      </section>`;
  }

  function readingText(lines) {
    return `
      <article class="ap-reading-text" aria-label="阅读正文">
        ${(lines || []).map((line) => `<p>${esc(line)}</p>`).join("")}
      </article>`;
  }

  function speedCard(speed) {
    speed = speed || {};
    const ticks = Array.from({ length: 12 }).map(() => "<i></i>").join("");
    return `
      <section class="ap-card ap-speed-card" aria-label="${esc(speed.title)}" style="--value:${pct(speed.value)}">
        <header><h2>${esc(speed.title)}</h2><strong>${esc(speed.valueLabel)}</strong></header>
        <div class="ap-speed-rail"><span></span><b></b></div>
        <div class="ap-speed-ticks">${ticks}</div>
        <footer><span>${esc(speed.slowLabel)}</span><span>${esc(speed.fastLabel)}</span></footer>
      </section>`;
  }

  function modeCard(modes) {
    return `
      <section class="ap-card ap-mode-card" aria-label="翻页模式">
        <h2>翻页模式</h2>
        <div class="ap-mode-grid">
          ${(modes || []).map((mode) => `<button class="${mode.active ? "is-active" : ""}" type="button">${esc(mode.label)}</button>`).join("")}
        </div>
      </section>`;
  }

  function switchNode(enabled) {
    return `<span class="ap-switch ${enabled ? "is-on" : ""}" aria-hidden="true"></span>`;
  }

  function optionsCard(data) {
    return `
      <section class="ap-card ap-options-card" aria-label="${esc(data.optionsTitle)}">
        <h2>${esc(data.optionsTitle)}</h2>
        <div class="ap-option-list">
          ${(data.options || []).map((option) => `
            <button class="ap-option-row" type="button">
              <span class="ap-option-icon">${icon(option.icon)}</span>
              <span><strong>${esc(option.title)}</strong><small>${esc(option.meta)}</small></span>
              ${switchNode(option.enabled)}
            </button>`).join("")}
        </div>
      </section>`;
  }

  function actionRow(actions) {
    actions = actions || {};
    return `
      <footer class="ap-action-row">
        <button type="button">${esc(actions.cancelLabel)}</button>
        <button class="is-primary" type="button">${esc(actions.startLabel)}</button>
      </footer>`;
  }

  function runningCapsule(data, state) {
    const capsule = data.runningCapsule || {};
    const paused = state === "paused";
    return `
      <aside class="ap-running-capsule ${paused ? "is-paused" : ""}" aria-label="${paused ? esc(capsule.pausedTitle) : esc(capsule.title)}">
        ${icon(paused ? "play" : "pause")}
        <span><strong>${esc(paused ? capsule.pausedTitle : capsule.title)}</strong><small>${esc(capsule.sentence)}</small></span>
        <button type="button">${esc(paused ? capsule.continueLabel : capsule.actionLabel)}</button>
        <button type="button">${esc(capsule.stopLabel)}</button>
      </aside>`;
  }

  function feedbackPanel(data) {
    const feedback = (data.feedback || {}).error || {};
    return `
      <section class="ap-card ap-feedback-panel" aria-label="${esc(feedback.title)}">
        <i>${icon("retry")}</i>
        <h2>${esc(feedback.title)}</h2>
        <p>${esc(feedback.copy)}</p>
        <button type="button">${esc(feedback.primaryAction)}</button>
      </section>`;
  }

  function defaultSheet(data) {
    return `
      <section class="ap-bottom-sheet" aria-label="自动翻页设置">
        <span class="ap-grabber" aria-hidden="true"></span>
        ${speedCard(data.speed)}
        ${modeCard(data.modes)}
        ${optionsCard(data)}
        ${actionRow(data.actions)}
      </section>`;
  }

  function compactSheet(data, state) {
    return `
      <section class="ap-bottom-sheet is-compact" aria-label="自动翻页运行控制">
        <span class="ap-grabber" aria-hidden="true"></span>
        ${runningCapsule(data, state)}
        ${speedCard(data.speed)}
        <footer class="ap-action-row">
          <button type="button">${esc((data.actions || {}).cancelLabel)}</button>
          <button class="is-stop" type="button">${esc((data.actions || {}).stopLabel)}</button>
        </footer>
      </section>`;
  }

  function errorSheet(data) {
    return `
      <section class="ap-bottom-sheet is-error" aria-label="自动翻页错误">
        <span class="ap-grabber" aria-hidden="true"></span>
        ${feedbackPanel(data)}
      </section>`;
  }

  function sheet(data, state) {
    if (state === "running" || state === "paused") return compactSheet(data, state);
    if (state === "error") return errorSheet(data);
    return defaultSheet(data);
  }

  function autoPageHtml(data, options) {
    const state = options && options.state ? options.state : "default";
    return shellKit().renderReaderShell({
      frameClass: "ap-page-frame",
      readingSurfaceClass: "ap-reading-surface-host",
      overlayClass: "ap-reader-overlay-host",
      bottomSheetHostClass: "ap-reader-bottom-sheet-host",
      moduleNavClass: "ap-reader-module-nav-host",
      stateHostClass: "ap-reader-state-host",
      ariaLabel: "自动翻页组件预览",
      readingSurfaceHtml: `
        <div class="ap-reading-haze" aria-hidden="true"></div>
        ${readingText(data.readingText)}`,
      overlayHtml: `
        ${statusRow(data)}
        ${topControl(data)}`,
      bottomSheetHtml: sheet(data, state),
      moduleNavHtml: ""
    });
  }

  function renderAutoPage(target, data, options) {
    target.innerHTML = autoPageHtml(data, options || {});
  }

  function renderAutoPageStateMatrix(target, data) {
    const states = [
      { key: "default", title: "自动翻页默认态", desc: "设置覆盖层，速度、模式、更多选项和开始按钮可见。" },
      { key: "running", title: "运行胶囊态", desc: "开始后显示正在自动翻页胶囊，可暂停或停止。" },
      { key: "paused", title: "暂停态", desc: "保留速度和阅读位置，可继续或停止。" },
      { key: "error", title: "无法翻页态", desc: "停止自动翻页，说明原因并提供重试。" }
    ];

    target.innerHTML = `
      <section class="ap-state-workbench">
        <header class="ap-state-header">
          <h1>自动翻页状态矩阵</h1>
          <p>用于核对设置、运行、暂停和无法翻页四种状态。</p>
        </header>
        <div class="ap-state-grid">
          ${states.map((state) => `
            <article class="ap-state-card">
              <div class="ap-state-meta">
                <h2>${esc(state.title)}</h2>
                <p>${esc(state.desc)}</p>
              </div>
              <div class="ap-state-viewport">
                <div class="ap-state-scale">
                  ${autoPageHtml(data, { state: state.key })}
                </div>
              </div>
            </article>`).join("")}
        </div>
      </section>`;
  }

  window.AutoPageInput = {
    renderAutoPage,
    renderAutoPageStateMatrix
  };
})(window);
