(function attachReaderShellKit(window) {
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
    const cls = className || "rsk-icon";
    if (window.ReaderAssetIcons && window.ReaderAssetIcons.renderIcon) {
      return window.ReaderAssetIcons.renderIcon(name, cls);
    }
    return `<span class="${esc(cls)}" data-icon-missing="${esc(name)}" aria-hidden="true"></span>`;
  }

  function statusBar(data, config) {
    const status = (data || {}).status || {};
    return `
      <header class="${classList("rsk-status-bar", config.statusBarClass)}" data-slot="statusBar" aria-label="系统状态栏">
        <span>${esc(status.time || "10:30")}</span>
        <span class="${classList("rsk-system-icons", config.systemIconsClass)}" aria-hidden="true">
          ${icon("signal", classList("rsk-system-icon", config.signalClass))}
          ${icon("wifi", classList("rsk-system-icon", config.wifiClass))}
          ${icon("battery", classList("rsk-system-icon", config.batteryClass))}
          ${status.battery ? `<span>${esc(status.battery)}</span>` : ""}
        </span>
      </header>`;
  }

  function topActionButtons(actions, config) {
    const actionLabels = Object.assign({ search: "搜索", more: "更多", refresh: "刷新" }, config.actionLabels || {});
    return (actions || []).map((name) => `
      <button class="${classList("rsk-icon-button", config.iconButtonClass)}" type="button" data-top-action="${esc(name)}" aria-label="${esc(name)}" title="${esc(actionLabels[name] || name)}">
        ${icon(name, classList("rsk-icon", config.iconClass))}
      </button>`).join("");
  }

  function appTopBar(config) {
    if (config.topBarHtml !== undefined) {
      return config.topBarHtml;
    }
    return `
      <section class="${classList("rsk-app-top-bar", config.topBarClass)}" data-slot="appTopBar" aria-label="顶部栏">
        <h1>${esc(config.title || "")}</h1>
        <div class="${classList("rsk-top-actions", config.topActionsClass)}">
          ${topActionButtons(config.actions, config)}
        </div>
      </section>`;
  }

  function backTopBar(config) {
    const trailing = config.trailingHtml !== undefined
      ? config.trailingHtml
      : config.trailingIcon === undefined || config.trailingIcon === null
        ? "<span></span>"
        : `<button type="button" aria-label="${esc(config.trailingLabel || "更多")}">${icon(config.trailingIcon || "more", classList("rsk-icon", config.iconClass))}</button>`;

    return `
      <section class="${classList("rsk-back-top-bar", config.topBarClass)}" data-slot="backTopBar" aria-label="返回顶栏">
        <button type="button" aria-label="${esc(config.backLabel || "返回")}">${icon("back", classList("rsk-icon", config.iconClass))}</button>
        <h1>${esc(config.title || "")}</h1>
        ${trailing}
      </section>`;
  }

  function mainNav(items, activeType, config) {
    const defaults = [
      { label: "书架", type: "bookshelf" },
      { label: "发现", type: "discover" },
      { label: "RSS", type: "rss" },
      { label: "设置", type: "settings" }
    ];
    const byType = new Map((items || []).map((item) => [item.type, item]));
    const normalized = defaults.map((item) => Object.assign({}, item, byType.get(item.type) || {}));

    return `
      <nav class="${classList("rsk-main-nav", config.navClass)}" data-slot="mainNav" aria-label="公共主导航">
        ${normalized.map((item) => {
          const active = item.type === activeType || item.active;
          return `
            <button class="${classList("rsk-main-nav-item", config.navItemClass)}${active ? " is-active" : ""}" type="button" data-nav-type="${esc(item.type)}"${active ? ' aria-current="page"' : ""}>
              <span class="${classList("rsk-main-nav-icon-shell", config.navIconShellClass)}">
                ${icon(item.type === "bookshelf" ? "bookshelf" : item.type, classList("rsk-nav-icon", config.navIconClass))}
              </span>
              <span>${esc(item.label)}</span>
            </button>`;
        }).join("")}
      </nav>`;
  }

  function renderMainTabShell(config) {
    const data = config.data || {};
    return `
      <main class="${classList("rsk-phone", "rsk-main-tab-shell", config.frameClass)}" data-shell="MainTabShell" data-slot="appFrame" aria-label="${esc(config.ariaLabel || config.title || "主标签页")}">
        ${statusBar(data, config)}
        ${appTopBar(config)}
        <div class="${classList("rsk-content-region", config.contentClass)}" data-slot="contentRegion">
          ${config.contentHtml || ""}
        </div>
        <div class="${classList("rsk-state-host", config.stateHostClass)}" data-slot="stateHost">${config.stateHostHtml || ""}</div>
        ${mainNav(config.navItems || data.bottomNav || ((data.mainTabs || {}).nav), config.activeType, config)}
      </main>`;
  }

  function renderLibraryShell(config) {
    const data = config.data || {};
    return `
      <main class="${classList("rsk-phone", "rsk-library-shell", config.frameClass)}" data-shell="LibraryShell" data-slot="stackFrame" aria-label="${esc(config.ariaLabel || config.title || "书架链路页面")}">
        ${statusBar(data, config)}
        ${backTopBar(config)}
        <div class="${classList("rsk-content-region", config.contentClass)}" data-slot="contentRegion">
          ${config.contentHtml || ""}
        </div>
        <div class="${classList("rsk-bottom-action-host", config.bottomActionHostClass)}" data-slot="bottomActionHost">${config.bottomActionHtml || ""}</div>
        <div class="${classList("rsk-sheet-host", config.sheetHostClass)}" data-slot="sheetHost">${config.sheetHtml || ""}</div>
        <div class="${classList("rsk-dialog-host", config.dialogHostClass)}" data-slot="dialogHost">${config.dialogHtml || ""}</div>
        <div class="${classList("rsk-state-host", config.stateHostClass)}" data-slot="stateHost">${config.stateHostHtml || ""}</div>
      </main>`;
  }

  function renderReaderShell(config) {
    const frameStyle = config.frameStyle ? ` style="${config.frameStyle}"` : "";
    return `
      <main class="${classList("rsk-reader-frame", config.frameClass)}"${frameStyle} data-shell="ReaderShell" data-slot="readerFrame" aria-label="${esc(config.ariaLabel || "阅读器页面")}">
        <article class="${classList("rsk-reading-surface", config.readingSurfaceClass)}" data-slot="readingSurface" aria-label="阅读正文">
          ${config.readingSurfaceHtml || ""}
        </article>
        <div class="${classList("rsk-reader-overlay-host", config.overlayClass)}" data-slot="readerOverlayHost">
          ${config.overlayHtml || ""}
          <div class="${classList("rsk-bottom-sheet-host", config.bottomSheetHostClass)}" data-slot="bottomSheetHost">${config.bottomSheetHtml || ""}</div>
          <nav class="${classList("rsk-reader-module-nav", config.moduleNavClass)}" data-slot="readerModuleNav" aria-label="阅读模块导航">
            ${config.moduleNavHtml || ""}
          </nav>
        </div>
        <div class="${classList("rsk-reader-state-host", config.stateHostClass)}" data-slot="readerStateHost">${config.stateHostHtml || ""}</div>
      </main>`;
  }

  function renderSettingsShell(config) {
    const data = config.data || {};
    return `
      <main class="${classList("rsk-phone", "rsk-settings-shell", config.frameClass)}" data-shell="SettingsShell" data-slot="settingsFrame" aria-label="${esc(config.ariaLabel || config.title || "设置页面")}">
        ${statusBar(data, config)}
        ${backTopBar(Object.assign({}, config, { trailingIcon: config.trailingIcon === undefined ? null : config.trailingIcon }))}
        <div class="${classList("rsk-settings-content", config.contentClass)}" data-slot="settingsContent">
          ${config.contentHtml || ""}
        </div>
        <div class="${classList("rsk-bottom-action-host", config.bottomActionHostClass)}" data-slot="bottomActionHost">${config.bottomActionHtml || ""}</div>
        <div class="${classList("rsk-sheet-host", config.sheetHostClass)}" data-slot="sheetHost">${config.sheetHtml || ""}</div>
        <div class="${classList("rsk-toast-host", config.toastHostClass)}" data-slot="toastHost">${config.toastHtml || ""}</div>
        <div class="${classList("rsk-dialog-host", config.dialogHostClass)}" data-slot="dialogHost">${config.dialogHtml || ""}</div>
        <div class="${classList("rsk-settings-state-host", config.stateHostClass)}" data-slot="settingsStateHost">${config.stateHostHtml || ""}</div>
      </main>`;
  }

  function renderFlowShell(config) {
    return `
      <main class="${classList("rsk-flow-frame", config.frameClass)}" data-shell="FlowShell" data-slot="flowFrame" aria-label="${esc(config.ariaLabel || config.title || "横向流程")}">
        <section class="${classList("rsk-flow-step-region", config.stepClass)}" data-slot="stepRegion">${config.stepHtml || ""}</section>
        <section class="${classList("rsk-flow-comparison-region", config.comparisonClass)}" data-slot="comparisonRegion">${config.comparisonHtml || ""}</section>
        <section class="${classList("rsk-flow-result-region", config.resultClass)}" data-slot="resultRegion">${config.resultHtml || ""}</section>
        <div class="${classList("rsk-state-host", config.stateHostClass)}" data-slot="stateHost">${config.stateHostHtml || ""}</div>
      </main>`;
  }

  window.ReaderShellKit = {
    esc,
    classList,
    icon,
    statusBar,
    appTopBar,
    backTopBar,
    mainNav,
    renderMainTabShell,
    renderLibraryShell,
    renderReaderShell,
    renderSettingsShell,
    renderFlowShell
  };
})(window);
