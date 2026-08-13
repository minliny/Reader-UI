(function attachLocalImportRenderer(window) {
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
    const assetName = name === "warn" ? "warning" : name;
    if (window.ReaderAssetIcons && window.ReaderAssetIcons.renderIcon && window.ReaderAssetIcons.has(assetName)) {
      return window.ReaderAssetIcons.renderIcon(assetName, "li-icon");
    }

    const icons = {
      back: '<svg class="li-icon" viewBox="0 0 48 48"><path d="M29 10 15 24l14 14"></path><path d="M16 24h27"></path></svg>',
      folder: '<svg class="li-icon" viewBox="0 0 48 48"><path d="M7 16h13l4 5h17v19H7V16Z"></path><path d="M7 21h34"></path></svg>',
      shield: '<svg class="li-icon" viewBox="0 0 48 48"><path d="M24 6 39 12v12c0 10-6 16-15 19C15 40 9 34 9 24V12l15-6Z"></path><path d="m17 24 5 5 10-12"></path></svg>',
      check: '<svg class="li-icon" viewBox="0 0 48 48"><path d="m14 25 7 7 14-17"></path></svg>',
      warn: '<svg class="li-icon" viewBox="0 0 48 48"><path d="M24 7 43 40H5L24 7Z"></path><path d="M24 18v11"></path><path d="M24 35h.01"></path></svg>',
      file: '<svg class="li-icon" viewBox="0 0 48 48"><path d="M14 7h14l8 8v26H14V7Z"></path><path d="M28 7v9h8"></path></svg>'
    };
    return icons[name] || icons.file;
  }

  function statusBar(data) {
    const status = data.status || {};
    return `
      <header class="li-status-bar" aria-label="系统状态栏">
        <span>${esc(status.time || "10:30")}</span>
        <span class="li-system-icons"><i class="li-wifi"></i><i class="li-signal"></i><i class="li-battery"></i><strong>${esc(status.battery || "82%")}</strong></span>
      </header>`;
  }

  function topBar(data) {
    const top = data.topBar || {};
    return `
      <section class="li-top-bar">
        <button type="button" aria-label="${esc(top.backLabel || "返回")}">${icon("back")}</button>
        <h1>${esc(top.title || "导入本地书")}</h1>
      </section>`;
  }

  function introCard(data) {
    const intro = data.intro || {};
    return `
      <section class="li-card li-intro-card" aria-label="${esc(intro.title)}">
        <span class="li-folder-icon">${icon("folder")}</span>
        <div class="li-intro-main">
          <h2>${esc(intro.title)}</h2>
          <p>${esc(intro.copy)}</p>
          <div class="li-format-chips">${(intro.formats || []).map((item) => `<span>${esc(item)}</span>`).join("")}</div>
          <button class="li-file-picker" type="button">${esc(intro.primaryAction || "选择文件")}</button>
        </div>
      </section>`;
  }

  function permissionCard(data) {
    const permission = data.permission || {};
    return `
      <section class="li-card li-permission-card" aria-label="${esc(permission.title)}">
        <span class="li-shield-icon">${icon("shield")}</span>
        <div>
          <h2>${esc(permission.title)}</h2>
          <p>${esc(permission.copy)}</p>
        </div>
        <small>${esc(permission.footnote)}</small>
      </section>`;
  }

  function supportedFormats(data) {
    return `
      <section class="li-card li-supported-card" aria-label="支持格式">
        <h2>支持格式</h2>
        <div class="li-supported-list">
          ${(data.supportedFormats || []).map((item) => `
            <article>
              <span class="is-${esc(item.tone)}">${esc(item.label)}</span>
              <p>${esc(item.copy)}</p>
            </article>`).join("")}
        </div>
      </section>`;
  }

  function flowCard(data) {
    return `
      <section class="li-card li-flow-card" aria-label="导入流程">
        <h2>导入流程</h2>
        <div class="li-flow-steps">
          ${(data.flow || []).map((item, index, arr) => `
            <span><i>${esc(item.step)}</i><strong>${esc(item.label)}</strong></span>
            ${index < arr.length - 1 ? "<em></em>" : ""}`).join("")}
        </div>
      </section>`;
  }

  function reminderCard(data) {
    const reminder = data.reminder || {};
    return `
      <section class="li-card li-reminder-card">
        <h2>${esc(reminder.title)}</h2>
        <p>${esc(reminder.copy)}</p>
      </section>`;
  }

  function importingCard(data) {
    const importing = data.importing || {};
    return `
      <section class="li-card li-importing-card" aria-label="${esc(importing.title)}">
        <span class="li-spinner" aria-hidden="true"></span>
        <h2>${esc(importing.title)}</h2>
        <p>${esc(importing.copy)}</p>
        <strong>${esc(importing.currentFile)}</strong>
        <div class="li-progress" style="--value: ${pct(importing.progress)}"><i></i></div>
        <small>${esc(importing.progress)}% · 解析中禁止重复选择文件</small>
      </section>`;
  }

  function summaryCard(data, state) {
    const summary = data.resultSummary || {};
    const title = state === "success" ? summary.successTitle : state === "failed" ? summary.failedTitle : summary.partialTitle;
    const copy = state === "success" ? summary.successCopy : state === "failed" ? summary.failedCopy : summary.partialCopy;
    const counts = state === "success"
      ? [{ label: "已导入", value: 3, tone: "success" }, { label: "跳过", value: 1, tone: "skip" }, { label: "失败", value: 0, tone: "muted" }]
      : state === "failed"
        ? [{ label: "已导入", value: 0, tone: "muted" }, { label: "跳过", value: 0, tone: "muted" }, { label: "失败", value: 3, tone: "failed" }]
        : summary.counts || [];
    return `
      <section class="li-card li-summary-card" aria-label="${esc(title)}">
        <h2>${esc(title)}</h2>
        <p>${esc(copy)}</p>
        <div class="li-summary-grid">
          ${counts.map((item) => `<span class="is-${esc(item.tone)}"><strong>${esc(item.value)}</strong><small>${esc(item.label)}</small></span>`).join("")}
        </div>
      </section>`;
  }

  function resultsForState(data, state) {
    const results = data.results || [];
    if (state === "success") {
      return results.filter((item) => item.tone === "success" || item.tone === "skip").slice(0, 4);
    }
    if (state === "failed") {
      return results.filter((item) => item.tone === "failed");
    }
    return results;
  }

  function resultRows(data, state) {
    return `
      <section class="li-card li-result-list" aria-label="文件结果列表">
        ${resultsForState(data, state).map((item) => `
          <article class="li-result-row is-${esc(item.tone)}">
            <span>${icon(item.tone === "failed" ? "warn" : item.tone === "skip" ? "file" : "check")}</span>
            <div>
              <strong>${esc(item.fileName)}</strong>
              <small>${esc(item.status)}${item.reason ? ` · ${esc(item.reason)}` : ""}</small>
            </div>
          </article>`).join("")}
      </section>`;
  }

  function errorGuidance(data) {
    return `
      <section class="li-card li-error-guidance" aria-label="失败原因和下一步">
        <h2>失败原因和下一步</h2>
        <p>不支持或解析失败的文件不会被静默丢弃。请查看每一行原因后，重新选择 TXT 或 EPUB 文件。</p>
      </section>`;
  }

  function bottomActionBar(data, state) {
    const actions = data.actions || {};
    const primary = state === "success" ? actions.done : actions.chooseAgain;
    const secondary = state === "failed" ? actions.backToBookshelf : state === "partial_failed" ? actions.done : "";
    return `
      <nav class="li-bottom-actions" aria-label="底部操作">
        ${secondary ? `<button class="li-secondary-action" type="button">${esc(secondary)}</button>` : ""}
        <button class="li-primary-action" type="button">${esc(primary)}</button>
      </nav>`;
  }

  function cancelledCard(data) {
    const cancel = data.cancelState || {};
    return `
      <section class="li-card li-cancelled-card" aria-label="${esc(cancel.title)}">
        <h2>${esc(cancel.title)}</h2>
        <p>${esc(cancel.copy)}</p>
        <button type="button">返回书架</button>
      </section>`;
  }

  function localImportHtml(data, options) {
    const state = options && options.state ? options.state : "default";
    const isResult = state === "success" || state === "partial_failed" || state === "failed";
    return window.LibraryPageKit.renderPage({
      data,
      pageClass: "li-page-frame",
      ariaLabel: "本地书导入组件预览",
      statusHtml: statusBar(data),
      topBarHtml: topBar(data),
      contentHtml: `
        <section class="li-scroll-area">
          ${state === "default" ? `${introCard(data)}${permissionCard(data)}${supportedFormats(data)}${flowCard(data)}${reminderCard(data)}` : ""}
          ${state === "importing" ? `${importingCard(data)}${permissionCard(data)}` : ""}
          ${isResult ? `${summaryCard(data, state)}${state === "failed" ? errorGuidance(data) : ""}${resultRows(data, state)}` : ""}
          ${state === "picker_cancelled" ? cancelledCard(data) : ""}
        </section>`,
      bottomActionHtml: isResult ? bottomActionBar(data, state) : ""
    });
  }

  function renderLocalImport(target, data, options) {
    target.innerHTML = localImportHtml(data, options || {});
  }

  function stateData(data, state) {
    const next = clone(data);
    if (state === "failed") {
      next.results = next.results.filter((item) => item.tone === "failed");
    }
    return next;
  }

  function renderLocalImportStateMatrix(target, data) {
    const states = [
      { key: "default", title: "默认导入说明态", desc: "说明系统文件选择器授权方式和支持格式。" },
      { key: "importing", title: "解析导入中", desc: "展示当前文件和进度，禁止重复选择。" },
      { key: "success", title: "全部完成态", desc: "成功或重复跳过无错误时返回书架。" },
      { key: "partial_failed", title: "部分失败态", desc: "混合结果列表必须展示失败原因。" },
      { key: "failed", title: "全部失败态", desc: "不自动返回书架，提供重新选择和返回书架。" },
      { key: "picker_cancelled", title: "取消选择态", desc: "取消系统文件选择器不是错误，返回入口上下文。" }
    ];

    target.innerHTML = window.LibraryPageKit.renderStateMatrix({
      data,
      states,
      title: "本地书导入状态矩阵",
      desc: "用于核对系统文件选择器授权边界、导入进度、结果列表、失败原因和底部操作。",
      stateClass: "li-state-workbench",
      stateHeaderClass: "li-state-header",
      stateGridClass: "li-state-grid",
      stateCardClass: "li-state-card",
      stateMetaClass: "li-state-meta",
      stateViewportClass: "li-state-viewport",
      stateScaleClass: "li-state-scale",
      getStateData: stateData,
      renderFrame: localImportHtml
    });
  }

  window.LocalImportInput = {
    renderLocalImport,
    renderLocalImportStateMatrix
  };
})(window);
