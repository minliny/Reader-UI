(function attachSettingsPageKit(window) {
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
	      back: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M29 10 15 24l14 14"></path><path d="M16 24h27"></path></svg>',
	      palette: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M24 7a17 17 0 0 0 0 34h4a4 4 0 0 0 2-7 3 3 0 0 1 2-5h2A13 13 0 0 0 24 7Z"></path><circle cx="17" cy="19" r="2" fill="currentColor" stroke="none"></circle><circle cx="24" cy="16" r="2" fill="currentColor" stroke="none"></circle><circle cx="31" cy="20" r="2" fill="currentColor" stroke="none"></circle></svg>',
	      globe: '<svg class="sk-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="17"></circle><path d="M7 24h34"></path><path d="M24 7c5 5 7 11 7 17s-2 12-7 17"></path><path d="M24 7c-5 5-7 11-7 17s2 12 7 17"></path></svg>',
	      home: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M8 24 24 10l16 14"></path><path d="M13 22v18h22V22"></path><path d="M20 40V28h8v12"></path></svg>',
	      file: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M14 7h14l8 8v26H14V7Z"></path><path d="M28 7v9h8"></path></svg>',
	      folder: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M7 16h14l4 5h16v19H7V16Z"></path><path d="M7 21h34"></path></svg>',
	      bell: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M14 21a10 10 0 0 1 20 0v8l4 7H10l4-7v-8Z"></path><path d="M20 39a4 4 0 0 0 8 0"></path></svg>',
	      battery: '<svg class="sk-icon" viewBox="0 0 48 48"><rect x="13" y="7" width="22" height="34" rx="4"></rect><path d="M20 4h8"></path><path d="m27 16-7 10h8l-7 10"></path></svg>',
      eyeOff: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M7 24s6-12 17-12 17 12 17 12-6 12-17 12S7 24 7 24Z"></path><circle cx="24" cy="24" r="6"></circle><path d="M8 8 40 40"></path></svg>',
	      clock: '<svg class="sk-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="17"></circle><path d="M24 14v11h9"></path></svg>',
	      bug: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M18 15a6 6 0 0 1 12 0v4H18v-4Z"></path><rect x="15" y="19" width="18" height="20" rx="8"></rect><path d="M8 25h7M33 25h7M9 37l7-5M39 37l-7-5M12 12l5 5M36 12l-5 5"></path></svg>',
	      top: '<svg class="sk-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="17"></circle><path d="M24 34V15"></path><path d="m16 23 8-8 8 8"></path></svg>',
	      motion: '<svg class="sk-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="16" stroke-dasharray="2 7"></circle><path d="M24 12v24"></path><path d="M14 24h20"></path></svg>',
	      play: '<svg class="sk-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="17"></circle><path d="M21 16v16l12-8-12-8Z" fill="currentColor" stroke="none"></path></svg>',
	      shield: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M24 6 39 12v12c0 10-6 16-15 19C15 40 9 34 9 24V12l15-6Z"></path><path d="m18 24 5 5 9-12"></path></svg>',
	      trash: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M10 13h28"></path><path d="M18 13V8h12v5"></path><path d="M14 13l2 28h16l2-28"></path><path d="M21 21v12M27 21v12"></path></svg>',
	      storage: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M10 15c0-4 6-7 14-7s14 3 14 7-6 7-14 7-14-3-14-7Z"></path><path d="M10 15v18c0 4 6 7 14 7s14-3 14-7V15"></path><path d="M10 24c0 4 6 7 14 7s14-3 14-7"></path></svg>',
	      image: '<svg class="sk-icon" viewBox="0 0 48 48"><rect x="8" y="10" width="32" height="28" rx="4"></rect><circle cx="18" cy="19" r="3"></circle><path d="M12 34 22 24l6 6 4-4 6 8"></path></svg>',
	      book: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M12 10c5 0 9 1.5 12 5v25c-3-3.5-7-5-12-5V10Z"></path><path d="M36 10c-5 0-9 1.5-12 5v25c3-3.5 7-5 12-5V10Z"></path></svg>',
	      grid: '<svg class="sk-icon" viewBox="0 0 48 48"><rect x="9" y="9" width="11" height="11"></rect><rect x="28" y="9" width="11" height="11"></rect><rect x="9" y="28" width="11" height="11"></rect><rect x="28" y="28" width="11" height="11"></rect></svg>',
	      columns: '<svg class="sk-icon" viewBox="0 0 48 48"><rect x="10" y="9" width="10" height="30"></rect><rect x="28" y="9" width="10" height="30"></rect></svg>',
	      badge: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M11 10h26v28l-13-7-13 7V10Z"></path><path d="m19 23 3 3 7-8"></path></svg>',
	      refresh: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M37 17a15 15 0 1 0 1 15"></path><path d="M37 8v9h-9"></path></svg>',
	      info: '<svg class="sk-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="17"></circle><path d="M24 21v12M24 14h.01"></path></svg>',
	      link: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M19 29a8 8 0 0 1 0-11l5-5a8 8 0 0 1 11 11l-3 3"></path><path d="M29 19a8 8 0 0 1 0 11l-5 5a8 8 0 0 1-11-11l3-3"></path></svg>',
      message: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M9 11h30v22H18l-9 7V11Z"></path></svg>',
      cloud: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M17 37h19a8 8 0 0 0 0-16 13 13 0 0 0-25 4 6 6 0 0 0 6 12Z"></path><path d="M24 19v13M18 27l6 6 6-6"></path></svg>',
      upload: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M17 37h19a8 8 0 0 0 0-16 13 13 0 0 0-25 4 6 6 0 0 0 6 12Z"></path><path d="M24 33V18M18 24l6-6 6 6"></path></svg>',
      download: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M17 37h19a8 8 0 0 0 0-16 13 13 0 0 0-25 4 6 6 0 0 0 6 12Z"></path><path d="M24 18v15M18 27l6 6 6-6"></path></svg>',
	      warning: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M24 7 43 40H5L24 7Z"></path><path d="M24 18v11"></path><path d="M24 35h.01"></path></svg>',
	      search: '<svg class="sk-icon" viewBox="0 0 48 48"><circle cx="21" cy="21" r="13"></circle><path d="M31 31 42 42"></path></svg>',
	      sort: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M8 13h22"></path><path d="M8 24h16"></path><path d="M8 35h10"></path><path d="M34 12v22"></path><path d="m27 28 7 7 7-7"></path></svg>',
	      people: '<svg class="sk-icon" viewBox="0 0 48 48"><circle cx="19" cy="17" r="7"></circle><path d="M7 40c1-9 5-14 12-14s11 5 12 14"></path><circle cx="33" cy="20" r="5"></circle><path d="M31 30c5 1 8 4 9 10"></path></svg>',
	      list: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M17 12h24"></path><path d="M17 24h24"></path><path d="M17 36h24"></path><path d="M8 12h.01M8 24h.01M8 36h.01"></path></svg>',
	      source: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M11 16h22l-6-6"></path><path d="M37 32H15l6 6"></path><path d="M33 10l6 6-6 6"></path><path d="M15 38l-6-6 6-6"></path></svg>',
      edit: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M10 38h8L38 18l-8-8-20 20v8Z"></path><path d="m27 13 8 8"></path></svg>',
      log: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M12 7h24v34H12V7Z"></path><path d="M18 17h12M18 25h12M18 33h8"></path></svg>',
      add: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M24 9v30"></path><path d="M9 24h30"></path></svg>',
      check: '<svg class="sk-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18"></circle><path d="m15 24 6 6 13-15"></path></svg>',
      close: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="M11 11 37 37"></path><path d="M37 11 11 37"></path></svg>',
      chevron: '<svg class="sk-icon" viewBox="0 0 48 48"><path d="m18 10 13 14-13 14"></path></svg>'
    };
    return icons[name] || icons.info;
  }

  function topBar(data) {
    return `
      <header class="sk-top-bar" data-slot="backTopBar">
        <button type="button" aria-label="${esc((data.topBar || {}).backLabel || "返回")}">${icon("back")}</button>
        <h1>${esc((data.topBar || {}).title)}</h1>
      </header>`;
  }

  function switchNode(enabled) {
    return `<span class="sk-switch ${enabled ? "is-on" : ""}" aria-hidden="true"><i></i></span>`;
  }

	  function badge(label, tone) {
	    if (!label) return "";
	    return `<em class="sk-badge is-${esc(tone || "muted")}">${esc(label)}</em>`;
	  }

	  function segment(row) {
	    return `
	      <span class="sk-segment-control">
	        ${(row.options || []).map((option) => `<button class="${option === row.value ? "is-active" : ""}" type="button">${esc(option)}</button>`).join("")}
	      </span>`;
	  }

	  function stepper(row) {
	    return `
	      <span class="sk-stepper-control">
	        <button type="button">${esc(row.minLabel || "-")}</button>
	        <strong>${esc(row.value)}</strong>
	        <button type="button">${esc(row.maxLabel || "+")}</button>
	      </span>`;
	  }

  function metricCards(items) {
    if (!items || !items.length) return "";
    return `
      <section class="sk-metric-grid">
        ${items.map((item) => `
          <article class="sk-metric-card">
            ${icon(item.icon)}
            <span><strong>${esc(item.value)}</strong><small>${esc(item.label)}</small></span>
          </article>`).join("")}
      </section>`;
  }

  function storageBar(data) {
    if (!data) return "";
    return `
      <section class="sk-storage-card">
        <header><strong>${esc(data.title)}</strong><span>${esc(data.value)}</span></header>
        <i style="--used:${esc(data.percent || "50%")}"><b></b></i>
        <p>${esc(data.copy)}</p>
      </section>`;
  }

  function searchBox(data) {
    if (!data) return "";
    return `<label class="sk-search-box">${icon("search")}<span>${esc(data.placeholder || "搜索")}</span></label>`;
  }

  function chips(items) {
    if (!items || !items.length) return "";
    return `<nav class="sk-chip-board">${items.map((item) => `<button class="${item.active ? "is-active" : ""}" type="button">${esc(item.label)}</button>`).join("")}</nav>`;
  }

	  function row(row, loading) {
	    const rowClass = row.rowClass ? ` ${esc(row.rowClass)}` : "";
	    if (loading) {
	      return `<article class="sk-row${rowClass} is-loading"><span></span><span><strong></strong><small></small></span><em></em></article>`;
	    }
	    const cls = row.tone === "danger" ? " is-danger" : "";
	    const action = row.actionLabel ? `<button type="button">${esc(row.actionLabel)}</button>` : "";
	    const value = row.value ? `<strong class="sk-row-value">${esc(row.value)}</strong>` : "";
	    const selector = row.type === "segment" ? segment(row) : "";
	    const stepperNode = row.type === "stepper" ? stepper(row) : "";
	    const toggle = row.type === "switch" ? switchNode(row.enabled) : "";
	    const status = row.status ? badge(row.status, row.statusTone) : "";
	    const chevron = row.type === "link" || row.type === "select" || row.type === "danger" ? icon("chevron") : "";
	    return `
	      <article class="sk-row${rowClass}${cls}">
	        <span class="sk-row-icon">${icon(row.icon)}</span>
	        <span class="sk-row-main">
	          <strong>${esc(row.title)}</strong>
	          ${row.meta ? `<small>${esc(row.meta)}</small>` : ""}
	        </span>
	        <span class="sk-row-side">${status}${selector}${stepperNode}${selector || stepperNode ? "" : value}${action}${toggle}${chevron}</span>
	      </article>`;
	  }

	  function bookshelfPreview(preview) {
	    if (!preview) return "";
	    const books = preview.books || [];
	    return `
	      <section class="sk-bookshelf-preview-card">
	        <div class="sk-bookshelf-preview-cover">
	          <h3>${esc(preview.coverTitle)}</h3>
	          <div>${books.map((book) => `<span><img src="${esc(book.cover)}" alt="${esc(book.title)}封面"><i>${esc(book.badge)}</i><strong>${esc(book.title)}</strong></span>`).join("")}</div>
	        </div>
	        <div class="sk-bookshelf-preview-list">
	          <h3>${esc(preview.listTitle)}</h3>
	          ${books.map((book) => `
	            <article>
	              <img src="${esc(book.cover)}" alt="${esc(book.title)}封面">
	              <span><strong>${esc(book.title)}</strong><small>${esc(book.meta)}</small></span>
	              <em>${esc(book.update)}</em>
	            </article>`).join("")}
	        </div>
	      </section>`;
	  }

	  function section(section, loading) {
	    return `
	      <section class="sk-section">
	        <h2>${esc(section.title)}</h2>
	        <div class="sk-card">${(section.rows || []).map((item) => row(item, loading)).join("")}</div>
	        ${loading ? "" : bookshelfPreview(section.preview)}
	      </section>`;
	  }

  function actionRows(items) {
    if (!items || !items.length) return "";
    return `
      <section class="sk-action-list">
        ${items.map((item) => `<button class="sk-action-row ${item.tone === "danger" ? "is-danger" : ""}" type="button">${icon(item.icon)}<span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>${icon("chevron")}</button>`).join("")}
      </section>`;
  }

  function records(items) {
    if (!items || !items.length) return "";
    return `
      <section class="sk-record-list">
        <h2>备份记录</h2>
        <div class="sk-card">${items.map((item) => `
          <article class="sk-record-row">
            ${icon(item.icon || "file")}
            <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
            ${badge(item.status, item.tone)}
          </article>`).join("")}</div>
      </section>`;
  }

  function sourceRows(items) {
    if (!items || !items.length) return "";
    return `
      <section class="sk-source-list">
        <h2>书源列表</h2>
        <div class="sk-card">${items.map((item) => `
          <article class="sk-source-row">
            ${icon("source")}
            <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
            ${badge(item.status, item.tone)}
            ${switchNode(item.enabled)}
          </article>`).join("")}</div>
      </section>`;
  }

  function formPanel(data) {
    if (!data) return "";
    return `
      <section class="sk-form-panel">
        <h2>${esc(data.title)}</h2>
        ${(data.fields || []).map((field) => `<label><span>${esc(field.label)}</span><strong>${esc(field.value)}</strong></label>`).join("")}
        <button type="button">${esc(data.saveLabel)}</button>
      </section>`;
  }

  function logPanel(data) {
    if (!data) return "";
    return `
      <section class="sk-log-panel">
        <h2>${esc(data.title)}</h2>
        ${(data.items || []).map((item) => `<p><strong>${esc(item.level)}</strong>${esc(item.copy)}</p>`).join("")}
      </section>`;
  }

  function toast(data, key) {
    if (!key) return "";
    const label = ((data.toast || {})[key]) || key;
    return `<section class="sk-toast is-${esc(key)}">${icon(key === "success" ? "check" : "warning")}<strong>${esc(label)}</strong></section>`;
  }

	  function confirmDialog(data) {
    const confirm = data.confirm || data.danger || {};
    return `
      <section class="sk-dialog-scrim">
        <div class="sk-confirm-dialog">
          <h2>${esc(confirm.title || confirm.confirmTitle)}</h2>
          <p>${esc(confirm.copy)}</p>
          <div><button type="button">${esc(confirm.cancelLabel || "取消")}</button><button class="is-danger" type="button">${esc(confirm.confirmLabel || "确认")}</button></div>
        </div>
	      </section>`;
	  }

	  function findOptionRow(data) {
	    const sheet = data.optionSheet || {};
	    const rowTitle = sheet.rowTitle || sheet.title;
	    const rows = (data.sections || []).flatMap((section) => section.rows || []);
	    return rows.find((item) => item.title === rowTitle) || rows.find((item) => item.options && item.options.length) || {};
	  }

	  function optionSheet(data) {
	    const row = findOptionRow(data);
	    if (!row.options || !row.options.length) return "";
	    return `
	      <section class="sk-sheet-scrim">
	        <div class="sk-option-sheet">
	          <header>
	            <h2>${esc(row.title || "选择")}</h2>
	            <button type="button" aria-label="关闭">${icon("close")}</button>
	          </header>
	          <div>
	            ${(row.options || []).map((option) => `
	              <button class="${option === row.value ? "is-selected" : ""}" type="button">
	                <span>${esc(option)}</span>
	                ${option === row.value ? icon("check") : ""}
	              </button>`).join("")}
	          </div>
	          <footer><button type="button">${esc((data.optionSheet || {}).cancelLabel || "取消")}</button></footer>
	        </div>
	      </section>`;
	  }

  function stateData(data, state) {
    const next = clone(data);
    if (state === "permission" && next.permissionMutation) next.permissionMutation(next);
    if (state === "empty") {
      next.records = [];
      next.sources = [];
      next.empty = next.empty || { title: "暂无内容", copy: "当前没有可展示的数据。", primaryAction: "刷新" };
    }
    return next;
  }

  function emptyPanel(data) {
    if (!data.empty) return "";
    return `<section class="sk-empty-panel"><h2>${esc(data.empty.title)}</h2><p>${esc(data.empty.copy)}</p><button type="button">${esc(data.empty.primaryAction)}</button></section>`;
  }

  function pageHtml(data, options) {
    const state = options && options.state ? options.state : "default";
    const toastKey = options && options.toast ? options.toast : "";
    const loading = state === "loading";
    const current = stateData(data, state);
    return `
      <main class="sk-page-frame ${esc(current.pageClass || "")}" data-shell="SettingsShell" data-slot="settingsFrame" aria-label="${esc((current.topBar || {}).title)}前端输入件">
        ${topBar(current)}
        <div class="sk-content" data-slot="settingsContent">
          ${metricCards(current.metrics)}
          ${storageBar(current.storage)}
          ${searchBox(current.searchBox)}
          ${chips(current.filters)}
          ${chips(current.groups)}
          ${state === "empty" ? emptyPanel(current) : ""}
          <div class="sk-setting-section-host" data-slot="settingSection">${((current.sections || [])).map((item) => section(item, loading)).join("")}</div>
          ${actionRows(current.actions)}
          ${records(current.records)}
          ${sourceRows(current.sources)}
          ${formPanel(state === "edit" ? current.form : null)}
          ${logPanel(state === "log" ? current.log : null)}
        </div>
        ${current.fab ? `<button class="sk-fab" type="button">${icon(current.fab.icon || "add")}<span>${esc(current.fab.label)}</span></button>` : ""}
        <div class="sk-toast-host" data-slot="toastHost">${toast(current, toastKey)}</div>
        <div class="sk-dialog-host" data-slot="dialogHost">
          ${state === "option_sheet" ? optionSheet(current) : ""}
          ${(current.dialogStates || ["confirm", "error"]).includes(state) ? confirmDialog(current) : ""}
        </div>
        <div class="sk-settings-state-host" data-slot="settingsStateHost"></div>
	      </main>`;
	  }

  function renderPage(target, data, options) {
    target.innerHTML = pageHtml(data, options || {});
  }

  function renderStateMatrix(target, data) {
    const states = data.states || [
      { key: "default", title: "默认态", desc: "完整页面内容。" },
      { key: "loading", title: "加载态", desc: "读取数据时保留结构。" },
      { key: "error", title: "错误态", desc: "错误保留上下文并给出下一步。" }
    ];
    target.innerHTML = `
      <section class="sk-state-workbench ${esc(data.stateClass || "")}">
        <header class="sk-state-header">
          <h1>${esc((data.topBar || {}).title)}状态矩阵</h1>
          <p>${esc(data.stateSummary || "用于核对页面默认、加载、错误和权限状态。")}</p>
        </header>
        <div class="sk-state-grid">
          ${states.map((state) => `
            <article class="sk-state-card">
              <div class="sk-state-meta"><h2>${esc(state.title)}</h2><p>${esc(state.desc)}</p></div>
              <div class="sk-state-viewport"><div class="sk-state-scale">${pageHtml(data, { state: state.key, toast: state.toast })}</div></div>
            </article>`).join("")}
        </div>
      </section>`;
  }

  window.SettingsPageKit = { renderPage, renderStateMatrix };
})(window);
