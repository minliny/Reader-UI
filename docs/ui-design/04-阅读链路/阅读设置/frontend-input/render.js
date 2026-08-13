(function attachReadingSettingsRenderer(window) {
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function icon(name) {
    const aliases = {
      menu: "list",
      retry: "refresh"
    };
    const semantic = aliases[name] || name;
    if (window.ReaderShellKit && window.ReaderShellKit.icon) {
      return window.ReaderShellKit.icon(semantic, "rset-icon");
    }
    if (window.ReaderAssetIcons && window.ReaderAssetIcons.renderIcon) {
      return window.ReaderAssetIcons.renderIcon(semantic, "rset-icon");
    }
    return "";
  }

  function shellKit() {
    if (!window.ReaderShellKit) {
      throw new Error("ReaderShellKit is required before 阅读设置/frontend-input/render.js");
    }
    return window.ReaderShellKit;
  }

  function topBar(data, title) {
    const top = data.topBar || {};
    return `
      <header class="rset-top-bar">
        <button class="rset-icon-button" type="button" aria-label="返回">${icon("back")}</button>
        <h1>${esc(title || top.title)}</h1>
        <button class="rset-preset-button" type="button">${icon("menu")}<span>${esc(top.presetLabel)}</span></button>
      </header>`;
  }

  function quickPresets(items) {
    return `
      <section class="rset-quick-section" aria-label="预设管理">
        <h2>预设管理</h2>
        <div class="rset-quick-card">
          ${(items || []).map((item) => `
            <button class="rset-preset-tile" type="button">
              ${icon(item.icon)}
              <strong>${esc(item.title)}</strong>
              <span>${esc(item.value)}</span>
            </button>`).join("")}
        </div>
      </section>`;
  }

  function groupList(groups) {
    return `
      <section class="rset-group-card" aria-label="设置分组">
        ${(groups || []).map((group) => `
          <button class="rset-group-row" type="button">
            <span class="rset-group-icon">${icon(group.icon)}</span>
            <span><strong>${esc(group.title)}</strong><small>${esc(group.meta)}</small></span>
            ${icon("chevron")}
          </button>`).join("")}
      </section>`;
  }

  function switchNode(enabled) {
    return `<span class="rset-switch ${enabled ? "is-on" : ""}" aria-hidden="true"></span>`;
  }

  function advancedList(data) {
    return `
      <section class="rset-advanced-section">
        <h2>${esc(data.advancedTitle)}</h2>
        <div class="rset-advanced-card">
          ${(data.advanced || []).map((item) => `
            <button class="rset-setting-row" type="button">
              <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
              ${switchNode(item.enabled)}
            </button>`).join("")}
        </div>
      </section>`;
  }

  function restoreRow(data) {
    const restore = data.restore || {};
    return `<button class="rset-restore-row" type="button"><span>${esc(restore.title)}</span>${icon("chevron")}</button>`;
  }

  function stepper(value) {
    return `<span class="rset-stepper"><button type="button">-</button><strong>${esc(value)}</strong><button type="button">+</button></span>`;
  }

  function segment(options, active) {
    return `<span class="rset-segment">${(options || []).map((item) => `<button class="${item === active ? "is-active" : ""}" type="button">${esc(item)}</button>`).join("")}</span>`;
  }

  function subpage(data) {
    const sub = data.subpage || {};
    return `
      <section class="rset-subpage-card">
        <header><h2>${esc(sub.title)}</h2><p>${esc(sub.subtitle)}</p></header>
        ${(sub.sections || []).map((section) => `
          <section class="rset-sub-section">
            <h3>${esc(section.title)}</h3>
            ${(section.rows || []).map((row) => {
              let control = "";
              if (row.type === "segment") control = segment(row.options, row.active);
              if (row.type === "switch") control = switchNode(row.enabled);
              if (row.type === "stepper") control = stepper(row.value);
              if (!row.type) control = `<span class="rset-preset-state ${row.active ? "is-active" : ""}">${row.active ? "当前" : "应用"}</span>`;
              return `<button class="rset-sub-row" type="button"><span><strong>${esc(row.title)}</strong><small>${esc(row.meta)}</small></span>${control}</button>`;
            }).join("")}
          </section>`).join("")}
      </section>`;
  }

  function loading(data) {
    const feedback = (data.feedback || {}).loading || {};
    return `
      <section class="rset-feedback-panel is-loading">
        <h2>${esc(feedback.title)}</h2>
        <p>${esc(feedback.copy)}</p>
        <div>${Array.from({ length: 6 }).map(() => `<span></span>`).join("")}</div>
      </section>`;
  }

  function errorPanel(data) {
    const feedback = (data.feedback || {}).error || {};
    return `
      <section class="rset-feedback-panel">
        <i>${icon("retry")}</i>
        <h2>${esc(feedback.title)}</h2>
        <p>${esc(feedback.copy)}</p>
        <button type="button">${esc(feedback.primaryAction)}</button>
      </section>`;
  }

  function pageBody(data, state) {
    if (state === "loading") return loading(data);
    if (state === "error") return errorPanel(data);
    if (state === "subpage") return subpage(data);
    return `${quickPresets(data.quickPresets)}${groupList(data.groups)}${advancedList(data)}${restoreRow(data)}`;
  }

  function readingSettingsHtml(data, options) {
    const state = options && options.state ? options.state : "default";
    const title = state === "subpage" ? (data.subpage || {}).title : (data.topBar || {}).title;
    return shellKit().renderReaderShell({
      frameClass: "rset-page-frame",
      readingSurfaceClass: "rset-reading-surface-host",
      overlayClass: "rset-reader-overlay-host",
      bottomSheetHostClass: "rset-reader-bottom-sheet-host",
      moduleNavClass: "rset-reader-module-nav-host",
      stateHostClass: "rset-reader-state-host",
      ariaLabel: "阅读设置组件预览",
      readingSurfaceHtml: "",
      overlayHtml: `
        ${topBar(data, title)}
        <div class="rset-content">
          ${pageBody(data, state)}
        </div>`,
      bottomSheetHtml: "",
      moduleNavHtml: ""
    });
  }

  function renderReadingSettings(target, data, options) {
    target.innerHTML = readingSettingsHtml(data, options || {});
  }

  function renderReadingSettingsStateMatrix(target, data) {
    const states = [
      { key: "default", title: "设置首页态", desc: "阅读设置分组、高级开关和恢复默认入口。" },
      { key: "subpage", title: "分组二级页态", desc: "屏幕与显示二级页，包含分段、开关、步进和预设行。" },
      { key: "loading", title: "设置加载态", desc: "读取设置时保留页面结构。" },
      { key: "error", title: "保存失败态", desc: "失败时保留当前设置并提供重试。" }
    ];

    target.innerHTML = `
      <section class="rset-state-workbench">
        <header class="rset-state-header">
          <h1>阅读设置状态矩阵</h1>
          <p>用于核对阅读设置首页、分组二级页、加载和保存失败状态。</p>
        </header>
        <div class="rset-state-grid">
          ${states.map((state) => `
            <article class="rset-state-card">
              <div class="rset-state-meta">
                <h2>${esc(state.title)}</h2>
                <p>${esc(state.desc)}</p>
              </div>
              <div class="rset-state-viewport">
                <div class="rset-state-scale">
                  ${readingSettingsHtml(data, { state: state.key })}
                </div>
              </div>
            </article>`).join("")}
        </div>
      </section>`;
  }

  window.ReadingSettingsInput = {
    renderReadingSettings,
    renderReadingSettingsStateMatrix
  };
})(window);
