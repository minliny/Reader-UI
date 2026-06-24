(function attachContentReplacementRenderer(window) {
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
      return window.ReaderShellKit.icon(semantic, "cr-icon");
    }
    if (window.ReaderAssetIcons && window.ReaderAssetIcons.renderIcon) {
      return window.ReaderAssetIcons.renderIcon(semantic, "cr-icon");
    }
    return "";
  }

  function shellKit() {
    if (!window.ReaderShellKit) {
      throw new Error("ReaderShellKit is required before 内容替换/frontend-input/render.js");
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
    return `<header class="cr-status-row"><span>${esc(status.left)}</span><span>${esc(status.time)}</span></header>`;
  }

  function topControl(data) {
    const top = data.topControl || {};
    return `
      <section class="cr-top-control" aria-label="内容替换顶部控制">
        <button type="button" aria-label="关闭">${icon("close")}</button>
        <span><h1>${esc(top.title)}</h1><p>${esc(top.bookTitle)}</p></span>
        <button type="button" aria-label="${esc(top.settingsLabel)}">${icon("settings")}</button>
      </section>`;
  }

  function readingText(lines) {
    return `<article class="cr-reading-text">${(lines || []).map((line) => `<p>${esc(line)}</p>`).join("")}</article>`;
  }

  function switchNode(enabled) {
    return `<span class="cr-switch ${enabled ? "is-on" : ""}" aria-hidden="true"></span>`;
  }

  function ruleRow(rule) {
    return `
      <button class="cr-rule-row" type="button">
        <span class="cr-rule-icon">${icon(rule.icon)}</span>
        <span><strong>${esc(rule.title)}</strong><small>${esc(rule.meta)}</small></span>
        ${switchNode(rule.enabled)}
        ${icon("chevron")}
      </button>`;
  }

  function enableCard(data) {
    const panel = data.panel || {};
    return `
      <button class="cr-enable-card" type="button">
        <span><strong>${esc(panel.enableTitle)}</strong><small>${esc(panel.enableCopy)}</small></span>
        ${switchNode(data.enabled)}
      </button>`;
  }

  function rulesCard(rules) {
    return `<section class="cr-rule-card" aria-label="替换规则列表">${(rules || []).map(ruleRow).join("")}</section>`;
  }

  function previewCard(data) {
    const preview = data.preview || {};
    return `
      <section class="cr-preview-card" aria-label="${esc(preview.title)}">
        <h2>${esc(preview.title)}</h2>
        <p><span>${esc(preview.beforeLabel)}：</span>${highlight(preview.beforeText, "反着光")}</p>
        <p><span>${esc(preview.afterLabel)}：</span>${highlight(preview.afterText, "映着光")}</p>
      </section>`;
  }

  function editForm(data, errored) {
    const form = data.form || {};
    const error = ((data.feedback || {}).error || {});
    return `
      <section class="cr-edit-card ${errored ? "is-error" : ""}" aria-label="规则编辑表单">
        <h2>${errored ? esc(error.title) : "新增规则"}</h2>
        <label><span>${esc(form.beforeLabel)}</span><strong>${esc(form.beforeValue)}</strong></label>
        <label><span>${esc(form.afterLabel)}</span><strong>${esc(form.afterValue)}</strong></label>
        ${errored ? `<p>${esc(error.copy)}</p>` : ""}
        <div><button type="button">${esc(form.testLabel)}</button><button class="is-primary" type="button">${esc(form.saveLabel)}</button></div>
      </section>`;
  }

  function actionRow(data) {
    const panel = data.panel || {};
    return `
      <footer class="cr-action-row">
        <button type="button">${esc(panel.tempCloseLabel)}</button>
        <button class="is-primary" type="button">${esc(panel.addRuleLabel)}</button>
      </footer>`;
  }

  function loadingPanel(data) {
    const feedback = (data.feedback || {}).loading || {};
    return `
      <section class="cr-feedback-panel is-loading">
        <h2>${esc(feedback.title)}</h2>
        <p>${esc(feedback.copy)}</p>
        <div>${Array.from({ length: 5 }).map(() => `<span></span>`).join("")}</div>
      </section>`;
  }

  function emptyPanel(data) {
    const feedback = (data.feedback || {}).empty || {};
    return `
      <section class="cr-feedback-panel">
        <i>${icon("text")}</i>
        <h2>${esc(feedback.title)}</h2>
        <p>${esc(feedback.copy)}</p>
        <button type="button">${esc(feedback.primaryAction)}</button>
      </section>`;
  }

  function panelBody(data, state) {
    if (state === "loading") return loadingPanel(data);
    if (state === "empty") return emptyPanel(data);
    if (state === "edit") return `${editForm(data, false)}${previewCard(data)}`;
    if (state === "error") return `${editForm(data, true)}${previewCard(data)}`;
    return `${enableCard(data)}${rulesCard(data.rules)}${previewCard(data)}${actionRow(data)}`;
  }

  function bottomSheet(data, state) {
    const panel = data.panel || {};
    return `
      <section class="cr-bottom-sheet" aria-label="内容替换面板">
        <span class="cr-grabber" aria-hidden="true"></span>
        <header class="cr-panel-head">
          <h2>${esc(panel.title)}</h2>
          <button type="button">${esc(panel.allRulesLabel)} ${icon("chevron")}</button>
        </header>
        ${panelBody(data, state)}
      </section>`;
  }

  function replacementHtml(data, options) {
    const state = options && options.state ? options.state : "default";
    return shellKit().renderReaderShell({
      frameClass: "cr-page-frame",
      readingSurfaceClass: "cr-reading-surface-host",
      overlayClass: "cr-reader-overlay-host",
      bottomSheetHostClass: "cr-reader-bottom-sheet-host",
      moduleNavClass: "cr-reader-module-nav-host",
      stateHostClass: "cr-reader-state-host",
      ariaLabel: "内容替换组件预览",
      readingSurfaceHtml: `
        <div class="cr-reading-haze" aria-hidden="true"></div>
        ${readingText(data.readingText)}`,
      overlayHtml: `
        ${statusRow(data)}
        ${topControl(data)}`,
      bottomSheetHtml: bottomSheet(data, state),
      moduleNavHtml: ""
    });
  }

  function renderContentReplacement(target, data, options) {
    target.innerHTML = replacementHtml(data, options || {});
  }

  function renderContentReplacementStateMatrix(target, data) {
    const states = [
      { key: "default", title: "规则列表态", desc: "当前书替换规则、总开关、规则开关和替换预览。" },
      { key: "edit", title: "新增编辑态", desc: "替换前、替换后、测试和保存动作可见。" },
      { key: "empty", title: "无规则态", desc: "无规则时说明影响范围并提供新增规则。" },
      { key: "loading", title: "替换加载态", desc: "读取规则时保留当前阅读上下文。" },
      { key: "error", title: "格式错误态", desc: "规则格式错误时保留输入并提供重试路径。" }
    ];

    target.innerHTML = `
      <section class="cr-state-workbench">
        <header class="cr-state-header">
          <h1>内容替换状态矩阵</h1>
          <p>用于核对规则列表、新增编辑、无规则、加载和错误状态。</p>
        </header>
        <div class="cr-state-grid">
          ${states.map((state) => `
            <article class="cr-state-card">
              <div class="cr-state-meta">
                <h2>${esc(state.title)}</h2>
                <p>${esc(state.desc)}</p>
              </div>
              <div class="cr-state-viewport">
                <div class="cr-state-scale">
                  ${replacementHtml(data, { state: state.key })}
                </div>
              </div>
            </article>`).join("")}
        </div>
      </section>`;
  }

  window.ContentReplacementInput = {
    renderContentReplacement,
    renderContentReplacementStateMatrix
  };
})(window);
