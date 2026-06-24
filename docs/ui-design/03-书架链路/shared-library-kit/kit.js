(function attachLibraryPageKit(window) {
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function classList() {
    return Array.from(arguments)
      .flat()
      .filter(Boolean)
      .join(" ");
  }

  function icon(name, className) {
    const cls = classList("lk-icon", className);
    if (window.ReaderAssetIcons && window.ReaderAssetIcons.renderIcon) {
      return window.ReaderAssetIcons.renderIcon(name, cls);
    }

    const icons = {
      back: `<svg class="${esc(cls)}" viewBox="0 0 48 48"><path d="M29 10 15 24l14 14"></path><path d="M16 24h27"></path></svg>`,
      more: `<svg class="${esc(cls)}" viewBox="0 0 48 48"><circle cx="24" cy="10" r="3" fill="currentColor" stroke="none"></circle><circle cx="24" cy="24" r="3" fill="currentColor" stroke="none"></circle><circle cx="24" cy="38" r="3" fill="currentColor" stroke="none"></circle></svg>`,
      chevron: `<svg class="${esc(cls)}" viewBox="0 0 48 48"><path d="m18 10 13 14-13 14"></path></svg>`
    };
    return icons[name] || icons.chevron;
  }

  function systemIcons(config) {
    if (config.systemIconsHtml) return config.systemIconsHtml;
    if (config.showSystemIcons === false) return "";
    return `
      <span class="${classList("lk-system-icons", config.systemIconsClass)}" aria-hidden="true">
        <span class="${classList("lk-wifi", config.wifiClass)}"></span>
        <span class="${classList("lk-signal", config.signalClass)}"></span>
        <span class="${classList("lk-battery", config.batteryClass)}"></span>
        ${config.batteryText ? `<span>${esc(config.batteryText)}</span>` : ""}
      </span>`;
  }

  function statusBar(data, config) {
    if (config.statusHtml) return config.statusHtml;
    const status = data.status || {};
    return `
      <header class="${classList("lk-status-bar", config.statusBarClass)}" aria-label="系统状态栏">
        <span>${esc(status.time || "10:30")}</span>
        ${systemIcons(Object.assign({}, config, { batteryText: status.battery || config.batteryText }))}
      </header>`;
  }

  function topBar(data, config) {
    const top = data.topBar || {};
    if (config.topBarHidden) {
      return `<section class="lk-back-top-bar is-hidden" data-slot="backTopBar" aria-label="${esc(top.title || config.defaultTitle || "返回")}"></section>`;
    }
    if (config.topBarHtml) {
      return `
      <section class="${classList("lk-back-top-bar", config.topBarClass)}" data-slot="backTopBar" aria-label="${esc(top.title || config.defaultTitle || "顶部栏")}">
        ${config.topBarHtml}
      </section>`;
    }

    const trailingIcon = config.trailingIcon === undefined ? "more" : config.trailingIcon;
    const trailingLabel = config.trailingLabel || "更多";
    const trailing = config.trailingHtml !== undefined
      ? config.trailingHtml
      : trailingIcon
        ? `<button type="button" aria-label="${esc(trailingLabel)}">${icon(trailingIcon, config.iconClass)}</button>`
        : "<span aria-hidden=\"true\"></span>";

    return `
      <section class="${classList("lk-back-top-bar", config.topBarClass)}" data-slot="backTopBar" aria-label="顶部栏">
        <button type="button" aria-label="${esc(config.backLabel || "返回")}">${icon("back", config.iconClass)}</button>
        <h1>${esc(top.title || config.defaultTitle || "")}</h1>
        ${trailing}
      </section>`;
  }

  function renderPage(config) {
    const data = config.data || {};
    return `
      <main class="${classList("lk-stack-frame", config.pageClass)}" data-shell="LibraryShell" data-slot="stackFrame" aria-label="${esc(config.ariaLabel || "书架链路页面")}">
        ${statusBar(data, config)}
        ${topBar(data, config)}
        <div class="${classList("lk-content-region", config.contentClass)}" data-slot="contentRegion">
          ${config.contentHtml || ""}
        </div>
        <div class="${classList("lk-bottom-action-host", config.bottomActionHostClass)}" data-slot="bottomActionHost">
          ${config.bottomActionHtml || ""}
        </div>
        <div class="${classList("lk-sheet-host", config.sheetHostClass)}" data-slot="sheetHost">
          ${config.sheetHtml || ""}
        </div>
        <div class="${classList("lk-dialog-host", config.dialogHostClass)}" data-slot="dialogHost">
          ${config.dialogHtml || ""}
        </div>
        <div class="${classList("lk-state-host", config.stateHostClass)}" data-slot="stateHost">
          ${config.stateHostHtml || ""}
        </div>
      </main>`;
  }

  function renderStateMatrix(config) {
    const states = config.states || [];
    return `
      <section class="${classList("lk-state-workbench", config.stateClass)}" data-shell="LibraryShell" data-slot="stateHost">
        <header class="${classList("lk-state-header", config.stateHeaderClass)}">
          <h1>${esc(config.title)}</h1>
          <p>${esc(config.desc)}</p>
        </header>
        <div class="${classList("lk-state-grid", config.stateGridClass)}">
          ${states.map((state) => {
            const currentData = config.getStateData ? config.getStateData(config.data, state.key) : config.data;
            return `
              <article class="${classList("lk-state-card", config.stateCardClass)}">
                <div class="${classList("lk-state-meta", config.stateMetaClass)}">
                  <h2>${esc(state.title)}</h2>
                  <p>${esc(state.desc)}</p>
                </div>
                <div class="${classList("lk-state-viewport", config.stateViewportClass)}">
                  <div class="${classList("lk-state-scale", config.stateScaleClass)}">
                    ${config.renderFrame(currentData, { state: state.key })}
                  </div>
                </div>
              </article>`;
          }).join("")}
        </div>
      </section>`;
  }

  window.LibraryPageKit = {
    icon,
    renderPage,
    renderStateMatrix
  };
})(window);
