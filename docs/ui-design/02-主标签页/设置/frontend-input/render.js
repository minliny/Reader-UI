(function attachSettingsHomeRenderer(window) {
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function clone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function icon(name) {
    const icons = {
      search: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="21" cy="21" r="12"></circle><path d="M31 31 42 42"></path></svg>',
      more: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="24" cy="10" r="2.8" fill="currentColor" stroke="none"></circle><circle cx="24" cy="24" r="2.8" fill="currentColor" stroke="none"></circle><circle cx="24" cy="38" r="2.8" fill="currentColor" stroke="none"></circle></svg>',
      chevron: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="m18 9 15 15-15 15"></path></svg>',
      book: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M12 10c5 0 9 1.5 12 5v25c-3-3.5-7-5-12-5V10Z" fill="currentColor" stroke="none"></path><path d="M36 10c-5 0-9 1.5-12 5v25c3-3.5 7-5 12-5V10Z" fill="currentColor" stroke="none"></path></svg>',
      bookshelf: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M12 10c5 0 9 1.5 12 5v25c-3-3.5-7-5-12-5V10Z" fill="currentColor" stroke="none"></path><path d="M36 10c-5 0-9 1.5-12 5v25c3-3.5 7-5 12-5V10Z" fill="currentColor" stroke="none"></path></svg>',
      "book-open": '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M10 12c5 0 10 1.4 14 5v23c-4-3.6-9-5-14-5V12Z" fill="currentColor" stroke="none"></path><path d="M38 12c-5 0-10 1.4-14 5v23c4-3.6 9-5 14-5V12Z" fill="currentColor" stroke="none"></path></svg>',
      rss: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M10 30a8 8 0 0 1 8 8"></path><path d="M10 20a18 18 0 0 1 18 18"></path><path d="M10 10a28 28 0 0 1 28 28"></path><circle cx="13" cy="35" r="2" fill="currentColor" stroke="none"></circle></svg>',
      "source-stack": '<svg class="rl-icon" viewBox="0 0 48 48"><path d="m24 8 17 8-17 8-17-8 17-8Z" fill="currentColor" stroke="none"></path><path d="m7 24 17 8 17-8"></path><path d="m7 32 17 8 17-8"></path></svg>',
      clock: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="17" fill="currentColor" stroke="none" opacity=".88"></circle><path d="M24 14v11h9" stroke="#fff" stroke-width="3.8"></path></svg>',
      database: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M10 15c0-4 6-7 14-7s14 3 14 7-6 7-14 7-14-3-14-7Z" fill="currentColor" stroke="none"></path><path d="M10 15v18c0 4 6 7 14 7s14-3 14-7V15"></path><path d="M10 24c0 4 6 7 14 7s14-3 14-7"></path></svg>',
      storage: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M10 15c0-4 6-7 14-7s14 3 14 7-6 7-14 7-14-3-14-7Z" fill="currentColor" stroke="none"></path><path d="M10 15v18c0 4 6 7 14 7s14-3 14-7V15"></path><path d="M10 24c0 4 6 7 14 7s14-3 14-7"></path></svg>',
      gear: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="7" fill="#fff" stroke="none"></circle><path d="M24 5v6M24 37v6M7.5 14.5l5.2 3M35.3 30.5l5.2 3M7.5 33.5l5.2-3M35.3 17.5l5.2-3M5 24h6M37 24h6" stroke-width="5"></path></svg>',
      cloud: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M17 37h19a8 8 0 0 0 0-16 13 13 0 0 0-25 4 6 6 0 0 0 6 12Z" fill="currentColor" stroke="none"></path><path d="M24 19v13M18 27l6 6 6-6" stroke="#fff" stroke-width="3.4"></path></svg>',
      shield: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M24 6 39 12v12c0 10-6 16-15 19C15 40 9 34 9 24V12l15-6Z" fill="currentColor" stroke="none"></path><rect x="17" y="22" width="14" height="12" rx="2" stroke="#fff" stroke-width="3"></rect><path d="M20 22v-4a4 4 0 0 1 8 0v4" stroke="#fff" stroke-width="3"></path></svg>',
      info: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="17" fill="currentColor" stroke="none"></circle><path d="M24 21v12M24 14h.01" stroke="#fff" stroke-width="4.6"></path></svg>',
      discover: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="16"></circle><path d="m30 17-4 12-8 4 4-12 8-4Z"></path></svg>',
      settings: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="7"></circle><path d="M24 5v6M24 37v6M7.5 14.5l5.2 3M35.3 30.5l5.2 3M7.5 33.5l5.2-3M35.3 17.5l5.2-3M5 24h6M37 24h6"></path></svg>'
    };
    return icons[name] || icons.settings;
  }

  function toneClass(tone) {
    return `st-tone-${tone || "blue"}`;
  }

  function overviewCard(overview, state) {
    const loading = state === "loading-overview";
    return `
      <section class="st-overview-card" aria-label="本地概览">
        <h2 class="st-card-title">${esc(overview.title)}</h2>
        <div class="st-overview-grid">
          ${(overview.items || []).map((item) => `
            <div class="st-overview-item${loading ? " st-skeleton-card" : ""}">
              ${loading
                ? '<span class="st-skeleton-block"></span><span><span class="st-skeleton-line"></span><span class="st-skeleton-line is-short"></span></span>'
                : `<span class="st-overview-icon ${toneClass(item.tone)}">${icon(item.icon)}</span>
                  <span>
                    <p class="st-overview-label">${esc(item.label)}</p>
                    <p class="st-overview-value">${esc(item.value)}</p>
                  </span>`}
            </div>`).join("")}
        </div>
      </section>`;
  }

  function quickEntryGrid(items) {
    return `
      <section class="st-section" aria-label="常用管理">
        <h2 class="st-section-title">常用管理</h2>
        <div class="st-quick-grid">
          ${(items || []).map((item) => `
            <button class="st-quick-card" type="button" data-target="${esc(item.target)}">
              <span class="st-entry-icon ${toneClass(item.tone)}">${icon(item.icon)}</span>
              <span>
                <span class="st-quick-title">${esc(item.title)}</span>
                <span class="st-quick-meta">${esc(item.meta)}</span>
              </span>
              <span class="st-chevron" aria-hidden="true">${icon("chevron")}</span>
            </button>`).join("")}
        </div>
      </section>`;
  }

  function stateBadge(label) {
    if (!label) {
      return "";
    }
    const cls = label === "待授权" ? " is-warning" : label === "未设置" ? " is-muted" : "";
    return `<span class="rl-badge${cls}">${esc(label)}</span>`;
  }

  function settingsSections(sections) {
    return `
      ${(sections || []).map((section) => `
        <section class="st-section" aria-label="${esc(section.title)}">
          <h2 class="st-section-title">${esc(section.title)}</h2>
          <div class="st-settings-card">
            ${(section.items || []).map((item) => `
              <button class="st-setting-row" type="button">
                <span class="st-row-icon ${toneClass(item.tone)}">${icon(item.icon)}</span>
                <span class="st-row-content">
                  <span class="st-row-title">${esc(item.title)}</span>
                  <span class="st-row-meta">${esc(item.meta)}</span>
                </span>
                <span class="st-row-state">${stateBadge(item.state)}</span>
                <span class="st-chevron" aria-hidden="true">${icon("chevron")}</span>
              </button>`).join("")}
          </div>
        </section>`).join("")}`;
  }

  function mainTabFrame(data, contentHtml) {
    return window.MainTabPageKit.renderPage({
      data,
      contentHtml,
      ariaLabel: "设置首页组件预览",
      defaultTitle: "设置",
      frameWidth: 852,
      frameHeight: 1846,
      pageClass: "rl-app-frame st-page-frame",
      statusBarClass: "rl-status-bar",
      systemIconsClass: "rl-system-icons",
      wifiClass: "rl-wifi",
      signalClass: "rl-signal",
      batteryClass: "rl-battery",
      topBarClass: "rl-app-top-bar",
      titleClass: "rl-app-title",
      topActionsClass: "rl-top-actions st-top-actions",
      iconClass: "rl-icon",
      navClass: "rl-bottom-nav st-bottom-nav",
      navItemClass: "rl-bottom-nav-item"
    });
  }

  function settingsHomeHtml(data, options) {
    const state = options && options.state ? options.state : "default";
    return mainTabFrame(data, `
        ${overviewCard(data.overview, state)}
        ${quickEntryGrid(data.quickEntries)}
        ${settingsSections(data.sections)}`);
  }

  function renderSettingsHome(target, data, options) {
    target.innerHTML = settingsHomeHtml(data, options || {});
  }

  function stateData(data, state) {
    const next = clone(data);
    if (state === "no-backup") {
      next.overview.items = next.overview.items.map((item) =>
        item.label === "最近备份" ? Object.assign({}, item, { value: "未设置" }) : item
      );
      next.sections[0].items = next.sections[0].items.map((item) =>
        item.title === "同步与备份" ? Object.assign({}, item, { state: "未设置" }) : item
      );
    }
    if (state === "permission-needed") {
      next.sections[0].items = next.sections[0].items.map((item) =>
        item.title === "隐私与权限" ? Object.assign({}, item, { state: "待授权" }) : item
      );
    }
    return next;
  }

  function renderSettingsHomeStateMatrix(target, data) {
    const states = [
      { key: "default", title: "默认态", desc: "完整本地概览、常用管理和全部设置列表。" },
      { key: "loading-overview", title: "概览加载态", desc: "概览卡骨架加载，常用入口和设置列表保持可进入。" },
      { key: "no-backup", title: "无备份态", desc: "最近备份显示未设置，同步与备份行给出状态提示。" },
      { key: "permission-needed", title: "权限缺失态", desc: "隐私与权限行显示待授权，不弹全屏错误。" }
    ];

    target.innerHTML = window.MainTabPageKit.renderStateMatrix({
      data,
      title: "设置首页状态矩阵",
      desc: "用于前端实现时核对概览加载、无备份和权限缺失状态。",
      states,
      frameWidth: 852,
      frameHeight: 1846,
      stateClass: "st-state-workbench",
      stateHeaderClass: "st-state-header",
      stateGridClass: "st-state-grid",
      stateCardClass: "st-state-card",
      stateMetaClass: "st-state-meta",
      stateViewportClass: "st-state-viewport",
      stateScaleClass: "st-state-scale",
      getStateData: stateData,
      renderFrame: settingsHomeHtml
    });
  }

  window.SettingsHomeInput = {
    renderSettingsHome,
    renderSettingsHomeStateMatrix
  };
})(window);
