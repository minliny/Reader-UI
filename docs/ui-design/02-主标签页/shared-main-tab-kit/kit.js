(function attachMainTabPageKit(window) {
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

  function styleVars(config) {
    const entries = [
      ["--mt-frame-width", config.frameWidth],
      ["--mt-frame-height", config.frameHeight],
      ["--mt-state-scale", config.stateScale],
      ["--mt-state-viewport-width", config.stateViewportWidth],
      ["--mt-state-viewport-height", config.stateViewportHeight]
    ];

    return entries
      .filter((entry) => entry[1] !== undefined && entry[1] !== null && entry[1] !== "")
      .map((entry) => `${entry[0]}: ${typeof entry[1] === "number" ? `${entry[1]}px` : entry[1]}`)
      .join("; ");
  }

  function icon(name, className) {
    const cls = esc(className || "mt-icon");
    const icons = {
      search: `<svg class="${cls}" viewBox="0 0 48 48"><circle cx="21" cy="21" r="13"></circle><path d="M31 31 42 42"></path></svg>`,
      more: `<svg class="${cls}" viewBox="0 0 48 48"><circle cx="24" cy="10" r="2.9" fill="currentColor" stroke="none"></circle><circle cx="24" cy="24" r="2.9" fill="currentColor" stroke="none"></circle><circle cx="24" cy="38" r="2.9" fill="currentColor" stroke="none"></circle></svg>`,
      bookshelf: `<svg class="${cls}" viewBox="0 0 48 48"><path d="M12 10c5 0 9 1.5 12 5v25c-3-3.5-7-5-12-5V10Z" fill="currentColor" stroke="none"></path><path d="M36 10c-5 0-9 1.5-12 5v25c3-3.5 7-5 12-5V10Z" fill="currentColor" stroke="none"></path></svg>`,
      book: `<svg class="${cls}" viewBox="0 0 48 48"><path d="M12 10c5 0 9 1.5 12 5v25c-3-3.5-7-5-12-5V10Z" fill="currentColor" stroke="none"></path><path d="M36 10c-5 0-9 1.5-12 5v25c3-3.5 7-5 12-5V10Z" fill="currentColor" stroke="none"></path></svg>`,
      discover: `<svg class="${cls}" viewBox="0 0 48 48"><circle cx="24" cy="24" r="16"></circle><path d="m30 17-4 12-8 4 4-12 8-4Z"></path></svg>`,
      rss: `<svg class="${cls}" viewBox="0 0 48 48"><path d="M10 30a8 8 0 0 1 8 8"></path><path d="M10 20a18 18 0 0 1 18 18"></path><path d="M10 10a28 28 0 0 1 28 28"></path><circle cx="13" cy="35" r="2" fill="currentColor" stroke="none"></circle></svg>`,
      settings: `<svg class="${cls}" viewBox="0 0 48 48"><circle cx="24" cy="24" r="7"></circle><path d="M24 5v6M24 37v6M7.5 14.5l5.2 3M35.3 30.5l5.2 3M7.5 33.5l5.2-3M35.3 17.5l5.2-3M5 24h6M37 24h6"></path></svg>`
    };

    return icons[name] || icons.bookshelf;
  }

  function statusBar(data, config) {
    const status = data.status || {};
    return `
      <header class="${classList("mt-status-bar", config.statusBarClass)}" data-slot="statusBar" aria-label="系统状态栏">
        <span>${esc(status.time || "10:30")}</span>
        <span class="${classList("mt-system-icons", config.systemIconsClass)}" aria-hidden="true">
          <span class="${classList("mt-wifi", config.wifiClass)}"></span>
          <span class="${classList("mt-signal", config.signalClass)}"></span>
          <span class="${classList("mt-battery", config.batteryClass)}"></span>
          <span>${esc(status.battery || "")}</span>
        </span>
      </header>`;
  }

  function topBar(data, config) {
    const top = data.topBar || {};
    const actions = config.topActions || [
      { icon: "search", label: "搜索" },
      { icon: "more", label: "更多" }
    ];

    return `
      <section class="${classList("mt-app-top-bar", config.topBarClass)}" data-slot="appTopBar" aria-label="顶部栏">
        <h1 class="${classList("mt-app-title", config.titleClass)}">${esc(top.title || config.defaultTitle || "")}</h1>
        <div class="${classList("mt-top-actions", config.topActionsClass)}">
          ${actions.map((action) => `
            <button class="${classList("mt-icon-button", config.topActionButtonClass)}" type="button" aria-label="${esc(action.label)}">
              ${icon(action.icon, classList("mt-icon", config.iconClass, config.topActionIconClass))}
            </button>`).join("")}
        </div>
      </section>`;
  }

  function normalizedNav(items) {
    const defaults = [
      { label: "书架", type: "bookshelf", active: false },
      { label: "发现", type: "discover", active: false },
      { label: "RSS", type: "rss", active: false },
      { label: "设置", type: "settings", active: false }
    ];
    const byType = new Map((items || []).map((item) => [item.type, item]));
    return defaults.map((item) => Object.assign({}, item, byType.get(item.type) || {}));
  }

  function mainNav(items, config) {
    return `
      <nav class="${classList("mt-main-nav", config.navClass)}" data-slot="mainNav" aria-label="公共主导航">
        ${normalizedNav(items).map((item) => {
          const active = item.active ? " is-active" : "";
          const type = item.type === "book" ? "bookshelf" : item.type;
          return `
            <button class="${classList("mt-main-nav-item", config.navItemClass)}${active}" type="button" data-nav-type="${esc(type)}"${item.active ? ' aria-current="page"' : ""}>
              <span class="mt-main-nav-icon-shell">
                ${icon(type, classList("mt-icon", "mt-main-nav-icon", config.iconClass, config.navIconClass))}
              </span>
              <span class="${classList("mt-main-nav-label", config.navLabelClass)}">${esc(item.label)}</span>
            </button>`;
        }).join("")}
      </nav>`;
  }

  function renderPage(config) {
    const data = config.data || {};
    const frameStyle = styleVars(config);
    return `
      <main class="${classList("mt-app-frame", config.pageClass)}" data-shell="MainTabShell" data-slot="appFrame" aria-label="${esc(config.ariaLabel || "主标签页")}"${frameStyle ? ` style="${esc(frameStyle)}"` : ""}>
        ${statusBar(data, config)}
        ${topBar(data, config)}
        <div class="${classList("mt-content-region", config.contentClass)}" data-slot="contentRegion">
          ${config.contentHtml || ""}
        </div>
        <div class="${classList("mt-state-host", config.stateHostClass)}" data-slot="stateHost" aria-hidden="true"></div>
        ${mainNav(data.bottomNav, config)}
      </main>`;
  }

  function renderStateMatrix(config) {
    const states = config.states || [];
    const stateStyle = styleVars(config);
    return `
      <section class="${classList("mt-state-workbench", config.stateClass)}" data-shell="MainTabShell" data-slot="stateHost"${stateStyle ? ` style="${esc(stateStyle)}"` : ""}>
        <header class="${classList("mt-state-header", config.stateHeaderClass)}">
          <h1>${esc(config.title)}</h1>
          <p>${esc(config.desc)}</p>
        </header>
        <div class="${classList("mt-state-grid", config.stateGridClass)}">
          ${states.map((state) => {
            const currentData = config.getStateData ? config.getStateData(config.data, state.key) : config.data;
            return `
              <article class="${classList("mt-state-card", config.stateCardClass)}">
                <div class="${classList("mt-state-meta", config.stateMetaClass)}">
                  <h2>${esc(state.title)}</h2>
                  <p>${esc(state.desc)}</p>
                </div>
                <div class="${classList("mt-state-viewport", config.stateViewportClass)}">
                  <div class="${classList("mt-state-scale", config.stateScaleClass)}">
                    ${config.renderFrame(currentData, { state: state.key })}
                  </div>
                </div>
              </article>`;
          }).join("")}
        </div>
      </section>`;
  }

  window.MainTabPageKit = {
    icon,
    renderPage,
    renderStateMatrix
  };
})(window);
