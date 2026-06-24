(function attachReadingAloudRenderer(window) {
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
    const semantic = name === "swap" ? "source" : name === "retry" ? "refresh" : name;
    if (window.ReaderShellKit && window.ReaderShellKit.icon) {
      return window.ReaderShellKit.icon(semantic, "al-icon");
    }
    if (window.ReaderAssetIcons && window.ReaderAssetIcons.renderIcon) {
      return window.ReaderAssetIcons.renderIcon(semantic, "al-icon");
    }
    return "";
  }

  function shellKit() {
    if (!window.ReaderShellKit) {
      throw new Error("ReaderShellKit is required before 朗读/frontend-input/render.js");
    }
    return window.ReaderShellKit;
  }

  function statusRow(data) {
    const status = data.status || {};
    return `<header class="al-status-row" aria-label="阅读状态"><span>${esc(status.left)}</span><span>${esc(status.time)}</span></header>`;
  }

  function topControl(data) {
    const control = data.topControl || {};
    return `
      <section class="al-top-control-bar" aria-label="顶部控制栏">
        <button class="al-top-icon" type="button" aria-label="返回">${icon("back")}</button>
        <div class="al-book-info"><h1>${esc(control.bookTitle)}</h1><p>${esc(control.sourceLine)}</p></div>
        <button class="al-swap-button" type="button" aria-label="${esc(control.sourceActionLabel)}">${icon("swap")}<span>${esc(control.sourceActionLabel)}</span></button>
        <button class="al-more-dots" type="button" aria-label="更多">${icon("more")}</button>
      </section>`;
  }

  function readingText(lines) {
    return `<article class="al-reading-text" aria-label="阅读正文">${(lines || []).map((line) => `<p>${esc(line)}</p>`).join("")}</article>`;
  }

  function panelHeader(data) {
    const panel = data.panel || {};
    return `
      <header class="al-panel-head">
        <span><h2>${esc(panel.title)}</h2><p>${esc(panel.subtitle)}</p></span>
        <button type="button">${esc(panel.settingsLabel)}</button>
      </header>`;
  }

  function currentSentence(data) {
    const sentence = data.currentSentence || {};
    return `
      <section class="al-sentence-card" aria-label="当前朗读句">
        <strong>${esc(sentence.text)}</strong>
        <span>${esc(sentence.label)}</span>
      </section>`;
  }

  function playPauseControl(data, state) {
    const panel = data.panel || {};
    const paused = state === "paused";
    const running = state === "running";
    const label = running ? panel.pauseLabel : paused ? panel.continueLabel : panel.startLabel;
    return `
      <section class="al-transport" aria-label="播放控制">
        <button type="button">${esc(panel.previousLabel)}</button>
        <button class="al-play-button ${running ? "is-running" : ""}" type="button" aria-label="${esc(label)}">
          ${icon(running ? "pause" : "play")}
          <span>${esc(label)}</span>
        </button>
        <button type="button">${esc(panel.nextLabel)}</button>
      </section>`;
  }

  function settingGrid(data) {
    const controls = data.controls || {};
    return `
      <div class="al-setting-grid">
        ${Object.keys(controls).map((key) => {
          const item = controls[key] || {};
          return `<button type="button"><strong>${esc(item.label)}</strong><span>${esc(item.value)}</span></button>`;
        }).join("")}
      </div>`;
  }

  function voiceOptions(data) {
    return `
      <div class="al-voice-list">
        ${(data.voices || []).map((voice) => `
          <button class="${voice.active ? "is-active" : ""}" type="button">
            <strong>${esc(voice.label)}</strong>
            <span>${esc(voice.meta)}</span>
          </button>`).join("")}
      </div>`;
  }

  function speedControl(data) {
    return `
      <section class="al-speed-control" aria-label="语速">
        <h3>语速</h3>
        <div>
          ${(data.speedOptions || []).map((item) => `<button class="${item.active ? "is-active" : ""}" type="button">${esc(item.label)}</button>`).join("")}
        </div>
      </section>`;
  }

  function runningCapsule(data, state) {
    if (state !== "running" && state !== "paused") {
      return "";
    }
    const capsule = data.runningCapsule || {};
    const paused = state === "paused";
    return `
      <aside class="al-running-capsule ${paused ? "is-paused" : ""}" aria-label="朗读运行状态">
        ${icon(paused ? "play" : "pause")}
        <span><strong>${esc(paused ? capsule.pausedTitle : capsule.title)}</strong><small>${esc(capsule.sentence)}</small></span>
        <button type="button">${esc(paused ? capsule.continueLabel : capsule.actionLabel)}</button>
        <button type="button">${esc(capsule.settingsLabel)}</button>
      </aside>`;
  }

  function feedbackPanel(data) {
    const feedback = (data.feedback || {}).error || {};
    return `
      <section class="al-feedback-panel" aria-label="${esc(feedback.title)}">
        <i>${icon("retry")}</i>
        <h3>${esc(feedback.title)}</h3>
        <p>${esc(feedback.copy)}</p>
        <button type="button">${esc(feedback.primaryAction)}</button>
      </section>`;
  }

  function aloudPanel(data, state) {
    if (state === "error") {
      return `${panelHeader(data)}${feedbackPanel(data)}`;
    }
    return `${panelHeader(data)}${currentSentence(data)}${runningCapsule(data, state)}${playPauseControl(data, state)}${speedControl(data)}${voiceOptions(data)}${settingGrid(data)}`;
  }

  function moduleNav(items) {
    return `
      <nav class="al-module-nav" data-slot="readerModuleNav" aria-label="底部模块导航">
        ${(items || []).map((item) => `<button class="${item.active ? "is-active" : ""}" type="button">${icon(item.type)}<span>${esc(item.label)}</span></button>`).join("")}
      </nav>`;
  }

  function brightnessPanel(brightness) {
    brightness = brightness || {};
    return `
      <aside class="al-brightness-panel" aria-label="亮度控制">
        <strong>${esc(brightness.title)}</strong>
        ${icon("sun")}
        <div class="al-brightness-rail" style="--value: ${pct(brightness.value)}"><span></span><i></i></div>
        <em>${esc(brightness.autoLabel)}</em>
        <small>${esc(brightness.modeLabel)}</small>
      </aside>`;
  }

  function controlSheet(data, state) {
    return `
      <section class="al-control-sheet" aria-label="朗读面板">
        <span class="al-grabber" aria-hidden="true"></span>
        <div class="al-sheet-main">
          <section class="al-aloud-panel" aria-label="朗读">
            ${aloudPanel(data, state)}
          </section>
          ${moduleNav(data.moduleNav)}
        </div>
        ${brightnessPanel(data.brightness)}
      </section>`;
  }

  function bottomReadout(data) {
    const readout = data.bottomReadout || {};
    return `<footer class="al-bottom-readout"><span>${esc(readout.progress)}</span><span>${esc(readout.chapter)}</span></footer><div class="al-bottom-line"></div>`;
  }

  function readingAloudHtml(data, options) {
    const state = options && options.state ? options.state : "default";
    return shellKit().renderReaderShell({
      frameClass: "al-page-frame",
      readingSurfaceClass: "al-reading-surface-host",
      overlayClass: "al-reader-overlay-host",
      bottomSheetHostClass: "al-reader-bottom-sheet-host",
      moduleNavClass: "al-reader-module-nav-host",
      stateHostClass: "al-reader-state-host",
      ariaLabel: "朗读组件预览",
      readingSurfaceHtml: `
        <div class="al-reading-haze" aria-hidden="true"></div>
        ${readingText(data.readingText)}`,
      overlayHtml: `
        ${statusRow(data)}
        ${topControl(data)}
        ${bottomReadout(data)}`,
      bottomSheetHtml: controlSheet(data, state),
      moduleNavHtml: ""
    });
  }

  function renderReadingAloud(target, data, options) {
    target.innerHTML = readingAloudHtml(data, options || {});
  }

  function renderReadingAloudStateMatrix(target, data) {
    const states = [
      { key: "default", title: "朗读默认态", desc: "未开始朗读，开始按钮、语速、声音和定时关闭可见。" },
      { key: "running", title: "朗读运行态", desc: "显示运行胶囊，可暂停或进入设置。" },
      { key: "paused", title: "朗读暂停态", desc: "保留当前句和当前位置，可继续朗读。" },
      { key: "error", title: "TTS 不可用态", desc: "系统能力不可用时保留阅读上下文并提供重试。" }
    ];

    target.innerHTML = `
      <section class="al-state-workbench">
        <header class="al-state-header">
          <h1>朗读状态矩阵</h1>
          <p>用于核对朗读默认、运行、暂停和 TTS 不可用状态。</p>
        </header>
        <div class="al-state-grid">
          ${states.map((state) => `
            <article class="al-state-card">
              <div class="al-state-meta">
                <h2>${esc(state.title)}</h2>
                <p>${esc(state.desc)}</p>
              </div>
              <div class="al-state-viewport">
                <div class="al-state-scale">
                  ${readingAloudHtml(data, { state: state.key })}
                </div>
              </div>
            </article>`).join("")}
        </div>
      </section>`;
  }

  window.ReadingAloudInput = {
    renderReadingAloud,
    renderReadingAloudStateMatrix
  };
})(window);
