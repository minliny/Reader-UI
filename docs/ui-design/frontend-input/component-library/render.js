(function attachReaderComponentLibrary(window) {
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
    const icons = {
      search: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="21" cy="21" r="12"></circle><path d="M31 31 42 42"></path></svg>',
      more: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="24" cy="10" r="2.8" fill="currentColor" stroke="none"></circle><circle cx="24" cy="24" r="2.8" fill="currentColor" stroke="none"></circle><circle cx="24" cy="38" r="2.8" fill="currentColor" stroke="none"></circle></svg>',
      back: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M29 10 15 24l14 14"></path><path d="M16 24h27"></path></svg>',
      sort: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M8 13h22"></path><path d="M8 24h16"></path><path d="M8 35h10"></path><path d="M34 12v22"></path><path d="m27 28 7 7 7-7"></path></svg>',
      settings: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="7"></circle><path d="M24 5v6M24 37v6M7.5 14.5l5.2 3M35.3 30.5l5.2 3M7.5 33.5l5.2-3M35.3 17.5l5.2-3M5 24h6M37 24h6"></path></svg>',
      bookshelf: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M12 10c5 0 9 1.5 12 5v25c-3-3.5-7-5-12-5V10Z" fill="currentColor" stroke="none"></path><path d="M36 10c-5 0-9 1.5-12 5v25c3-3.5 7-5 12-5V10Z" fill="currentColor" stroke="none"></path></svg>',
      book: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M12 10c5 0 9 1.5 12 5v25c-3-3.5-7-5-12-5V10Z" fill="currentColor" stroke="none"></path><path d="M36 10c-5 0-9 1.5-12 5v25c3-3.5 7-5 12-5V10Z" fill="currentColor" stroke="none"></path></svg>',
      discover: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="16"></circle><path d="m30 17-4 12-8 4 4-12 8-4Z"></path></svg>',
      rss: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M10 30a8 8 0 0 1 8 8"></path><path d="M10 20a18 18 0 0 1 18 18"></path><path d="M10 10a28 28 0 0 1 28 28"></path><circle cx="13" cy="35" r="2" fill="currentColor" stroke="none"></circle></svg>',
      "auto-page": '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="17"></circle><path d="M22 16v16l12-8-12-8Z" fill="currentColor" stroke="none"></path><path d="M9 24h4M35 24h4M24 9v4M24 35v4"></path></svg>',
      replace: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M33 8h7v7"></path><path d="M8 22v-4a10 10 0 0 1 10-10h20"></path><path d="M15 40H8v-7"></path><path d="M40 26v4a10 10 0 0 1-10 10H10"></path></svg>',
      directory: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M13 12h22"></path><path d="M13 24h22"></path><path d="M13 36h22"></path><path d="M7 12h.01M7 24h.01M7 36h.01"></path></svg>',
      tts: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M12 26v-4"></path><path d="M18 34V14"></path><path d="M24 39V9"></path><path d="M30 34V14"></path><path d="M36 26v-4"></path></svg>',
      appearance: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M8 35 18 12h2l10 23"></path><path d="M12 27h14"></path><path d="M31 35V20"></path><path d="M31 20c7 0 9 3 9 7v8"></path></svg>',
      bookmark: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M14 7h20v34l-10-7-10 7V7Z"></path></svg>',
      play: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M18 12v24l20-12-20-12Z" fill="currentColor" stroke="none"></path></svg>',
      pause: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M16 12v24M32 12v24"></path></svg>',
      source: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M11 16h22l-6-6"></path><path d="M37 32H15l6 6"></path><path d="M33 10l6 6-6 6"></path><path d="M15 38l-6-6 6-6"></path></svg>',
      storage: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M10 15c0-4 6-7 14-7s14 3 14 7-6 7-14 7-14-3-14-7Z"></path><path d="M10 15v18c0 4 6 7 14 7s14-3 14-7V15"></path><path d="M10 24c0 4 6 7 14 7s14-3 14-7"></path></svg>',
      sync: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M33 8h7v7"></path><path d="M8 22v-4a10 10 0 0 1 10-10h20"></path><path d="M15 40H8v-7"></path><path d="M40 26v4a10 10 0 0 1-10 10H10"></path></svg>',
      refresh: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M37 17a15 15 0 1 0 1 15"></path><path d="M37 8v9h-9"></path></svg>',
      database: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M10 15c0-4 6-7 14-7s14 3 14 7-6 7-14 7-14-3-14-7Z" fill="currentColor" stroke="none"></path><path d="M10 15v18c0 4 6 7 14 7s14-3 14-7V15"></path><path d="M10 24c0 4 6 7 14 7s14-3 14-7"></path></svg>',
      shield: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M24 6 39 12v12c0 10-6 16-15 19C15 40 9 34 9 24V12l15-6Z"></path><path d="m17 24 5 5 10-12"></path></svg>',
      mail: '<svg class="rl-icon" viewBox="0 0 48 48"><rect x="9" y="12" width="30" height="24" rx="4" fill="currentColor" stroke="none"></rect><path d="m11 15 13 11 13-11" stroke="#fff" stroke-width="3.8"></path></svg>',
      phone: '<svg class="rl-icon" viewBox="0 0 48 48"><rect x="15" y="6" width="18" height="36" rx="4"></rect><path d="M22 36h4"></path></svg>',
      globe: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="17"></circle><path d="M7 24h34"></path><path d="M24 7c5 5 7 11 7 17s-2 12-7 17"></path><path d="M24 7c-5 5-7 11-7 17s2 12 7 17"></path></svg>',
      monitor: '<svg class="rl-icon" viewBox="0 0 48 48"><rect x="7" y="10" width="34" height="24" rx="3"></rect><path d="M18 41h12M24 34v7"></path></svg>',
      gesture: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M19 25V12a4 4 0 0 1 8 0v13"></path><path d="M27 22a4 4 0 0 1 8 0v8"></path><path d="M19 22a4 4 0 0 0-8 0v5c0 9 5 15 14 15h4c6 0 10-4 10-10v-6"></path><path d="M11 20c-3-3-3-7 0-10"></path></svg>',
      assist: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="24" cy="13" r="6"></circle><path d="M12 42c1-10 6-15 12-15s11 5 12 15"></path></svg>',
      progressPie: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M24 7a17 17 0 1 0 17 17H24V7Z"></path><path d="M29 8v11h11"></path></svg>',
      clock: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="17" fill="currentColor" stroke="none"></circle><path d="M24 14v11h9" stroke="#fff" stroke-width="3.8"></path></svg>',
      check: '<svg class="rl-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="currentColor" stroke="none"></circle><path d="m15 24 6 6 13-15" stroke="#fff" stroke-width="4.2"></path></svg>',
      warning: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M24 7 43 40H5L24 7Z"></path><path d="M24 18v11"></path><path d="M24 35h.01"></path></svg>',
      chevron: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="m18 10 13 14-13 14"></path></svg>',
      drag: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M14 16h20"></path><path d="M14 24h20"></path><path d="M14 32h20"></path></svg>',
      folder: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M7 16h13l4 5h17v19H7V16Z"></path><path d="M7 21h34"></path></svg>',
      file: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M14 7h14l8 8v26H14V7Z"></path><path d="M28 7v9h8"></path></svg>'
      ,
      trash: '<svg class="rl-icon" viewBox="0 0 48 48"><path d="M10 13h28"></path><path d="M18 13V8h12v5"></path><path d="M14 13l2 28h16l2-28"></path><path d="M21 21v12M27 21v12"></path></svg>'
    };
    return icons[name] || icons.settings;
  }

  function componentCard(title, note, body) {
    return `
      <article class="rl-component-card">
        <div class="rl-component-meta">
          <h3>${esc(title)}</h3>
          <p>${esc(note)}</p>
        </div>
        <div class="rl-component-demo">${body}</div>
      </article>`;
  }

  function swatches(colors) {
    return `
      <div class="rl-swatch-grid">
        ${colors.map((color) => `
          <div class="rl-swatch">
            <div class="rl-swatch-color" style="--swatch: ${esc(color.value)}"></div>
            <div class="rl-swatch-name">${esc(color.name)}<br>${esc(color.value)}</div>
          </div>`).join("")}
      </div>`;
  }

  function chips(items) {
    return `<div class="rl-chip-row">${items.map((label, index) => `<button class="rl-chip${index === 0 ? " is-active" : ""}" type="button">${esc(label)}</button>`).join("")}</div>`;
  }

  function progress(value) {
    return `<div class="rl-progress" style="--value: ${pct(value)}"><span></span></div>`;
  }

  function slider(value) {
    return `
      <div class="rl-slider" style="--value: ${pct(value)}">
        <span class="rl-slider-track"></span>
        <span class="rl-slider-fill"></span>
        <span class="rl-slider-thumb"></span>
      </div>`;
  }

  function bookCard(book) {
    return `
      <article class="rl-book-card">
        <img class="rl-book-cover" src="${esc(book.cover)}" alt="${esc(book.title)}封面">
        <h4 class="rl-book-title">${esc(book.title)}</h4>
        <p class="rl-book-meta">${esc(book.author)}</p>
        <p class="rl-book-meta">${esc(book.chapter)}</p>
        ${progress(book.progress)}
      </article>`;
  }

  function bookRow(book) {
    return `
      <article class="rl-book-row">
        <img class="rl-book-cover" src="${esc(book.cover)}" alt="${esc(book.title)}封面">
        <div>
          <h4 class="rl-row-title">${esc(book.title)}</h4>
          <p class="rl-row-meta">${esc(book.author)} · ${esc(book.chapter)}</p>
        </div>
        <span class="rl-row-value">${esc(book.progress)}%</span>
      </article>`;
  }

  function searchResults(items) {
    return `
      <div class="rl-demo-stack">
        ${(items || []).map((item) => `
          <article class="rl-search-result">
            <img class="rl-book-cover" src="${esc(item.cover)}" alt="${esc(item.title)}封面">
            <div class="rl-search-result-main">
              <h4 class="rl-row-title">${esc(item.title)}</h4>
              <p class="rl-row-meta">${esc(item.author)} · ${esc(item.source)}</p>
              <p class="rl-row-meta">${esc(item.latest)}</p>
              <span class="rl-row-value">${esc(item.meta)}</span>
            </div>
            <div class="rl-search-result-actions">
              <button class="rl-mini-button${item.inBookshelf ? " is-primary" : ""}" type="button">${esc(item.inBookshelf ? "阅读" : "加入书架")}</button>
              <button class="rl-mini-text-button" type="button">详情</button>
            </div>
          </article>`).join("")}
      </div>`;
  }

  function sourceTypeSegment(items) {
    return `
      <div class="rl-source-segment">
        ${(items || []).map((item) => `
          <button class="rl-source-tab${item.active ? " is-active" : ""}" type="button">${esc(item.label)}</button>`).join("")}
      </div>`;
  }

  function currentSourceCard(source, sourceTypes, categories) {
    return `
      <div class="rl-demo-stack">
        ${sourceTypeSegment(sourceTypes)}
        <article class="rl-current-source-card">
          <span class="rl-source-avatar">${icon("source")}</span>
          <span class="rl-source-main">
            <strong>${esc((source || {}).title)}</strong>
            <span>${esc((source || {}).meta)} · ${esc((source || {}).status)}</span>
          </span>
          <button class="rl-mini-text-button" type="button">${esc((source || {}).actionLabel)}</button>
        </article>
        <div class="rl-chip-row">
          ${(categories || []).map((item) => `<button class="rl-chip${item.active ? " is-active" : ""}" type="button">${esc(item.label)}</button>`).join("")}
        </div>
      </div>`;
  }

  function discoveryContent(content) {
    const item = ((content || {}).featured || [])[0] || {};
    return `
      <article class="rl-discovery-content">
        <div class="rl-discovery-head">
          <h4>${esc((content || {}).title)}</h4>
          <button class="rl-mini-text-button" type="button">${esc((content || {}).refreshLabel)} ${icon("refresh")}</button>
        </div>
        <div class="rl-discovery-book">
          <img class="rl-book-cover" src="${esc(item.cover)}" alt="${esc(item.title)}封面">
          <span>
            <strong>${esc(item.title)}</strong>
            <small>${esc(item.author)} · ${esc(item.source)}</small>
            <small>${esc(item.desc)}</small>
          </span>
          <button class="rl-mini-button is-primary" type="button">${esc(item.actionLabel || "阅读")}</button>
        </div>
      </article>`;
  }

  function sourceStatus(status) {
    return `
      <article class="rl-source-status">
        <span>${icon("database")} ${esc((status || {}).sourceCount)} · ${esc((status || {}).availableCount)} · ${esc((status || {}).updatedAt)}</span>
        <button type="button">${icon("shield")} ${esc((status || {}).actionLabel)}</button>
      </article>`;
  }

  function rankingList(ranking) {
    return `
      <div class="rl-ranking-list">
        ${((ranking || {}).items || []).map((item) => `
          <article class="rl-ranking-row">
            <span class="rl-rank-number">${esc(item.rank)}</span>
            <img class="rl-book-cover" src="${esc(item.cover)}" alt="${esc(item.title)}封面">
            <span>
              <strong>${esc(item.title)}</strong>
              <small>${esc(item.author)} · ${esc(item.source)}</small>
            </span>
            <span class="rl-row-value">${esc(item.state)}</span>
          </article>`).join("")}
      </div>`;
  }

  function rssSummary(summary) {
    return `
      <article class="rl-rss-summary">
        <div class="rl-discovery-head">
          <h4>${esc((summary || {}).title)}</h4>
          <button class="rl-mini-text-button" type="button">${icon("refresh")} ${esc((summary || {}).refreshLabel)}</button>
        </div>
        <div class="rl-rss-summary-grid">
          ${((summary || {}).items || []).map((item) => `
            <span>
              <i>${icon(item.icon)}</i>
              <strong>${esc(item.value)}</strong>
              <small>${esc(item.label)}</small>
            </span>`).join("")}
        </div>
      </article>`;
  }

  function rssFilters(statusFilters, sourceFilters) {
    const render = (items) => `<div class="rl-chip-row">${(items || []).map((item) => `<button class="rl-chip${item.active ? " is-active" : ""}" type="button">${esc(item.label)}</button>`).join("")}</div>`;
    return `<div class="rl-demo-stack">${render(statusFilters)}${render(sourceFilters)}</div>`;
  }

  function rssEntryList(entries) {
    return `
      <div class="rl-rss-entry-list">
        ${(entries || []).map((entry) => `
          <article class="rl-rss-entry">
            <span class="rl-unread-dot${entry.unread ? " is-on" : ""}"></span>
            <img class="rl-book-cover" src="${esc(entry.cover)}" alt="${esc(entry.title)}封面">
            <span>
              <strong>${esc(entry.title)}</strong>
              <small>${esc(entry.source)} · ${esc(entry.excerpt)}</small>
            </span>
            <span class="rl-row-value">${esc(entry.time)}</span>
          </article>`).join("")}
      </div>`;
  }

  function bookDetailHeader(book) {
    return `
      <article class="rl-book-detail-header">
        <img class="rl-book-cover" src="${esc(book.cover)}" alt="${esc(book.title)}封面">
        <span>
          <strong>${esc(book.title)}</strong>
          <small>${esc(book.author)}</small>
          <small>当前来源：${esc(book.source)} · ${esc(book.latest)}</small>
        </span>
        <button class="rl-mini-button is-primary" type="button">${esc(book.readAction)}</button>
      </article>`;
  }

  function chapterPreview(progress, chapters) {
    return `
      <div class="rl-chapter-preview">
        <div class="rl-current-chapter"><span>${esc(progress.current)} · ${esc(progress.label)}</span><strong>${esc(progress.percent)}%</strong></div>
        ${(chapters || []).map((chapter) => `
          <div class="rl-chapter-row">
            <span>${esc(chapter.title)}${chapter.isNew ? " · 新" : ""}</span>
            <strong>${esc(chapter.state)}</strong>
          </div>`).join("")}
      </div>`;
  }

  function introCard(intro) {
    return `
      <article class="rl-intro-card">
        <h4>${esc(intro.title)} <button class="rl-mini-text-button" type="button">${esc(intro.actionLabel)}</button></h4>
        <p>${esc(intro.copy)}</p>
      </article>`;
  }

  function sourceRows(sources) {
    return `
      <div class="rl-source-sheet-demo">
        ${(sources || []).map((source) => `
          <article class="rl-source-sheet-row${source.current ? " is-current" : ""}">
            <span>${source.current ? icon("check") : icon("source")}</span>
            <strong>${esc(source.title)}</strong>
            <small>${esc(source.meta)}</small>
          </article>`).join("")}
      </div>`;
  }

  function directorySummary(summary) {
    return `
      <article class="rl-directory-summary">
        <strong>${esc(summary.title)}</strong>
        <small>${esc(summary.sourceLabel)} · ${esc(summary.chapterCount)}</small>
      </article>`;
  }

  function directoryRows(current, chapters) {
    return `
      <div class="rl-directory-list">
        <div class="rl-directory-current">
          <span><strong>${esc(current.title)}</strong><small>${esc(current.status)}</small></span>
          <em>${esc(current.progress)}%</em>
        </div>
        ${(chapters || []).map((chapter) => `
          <div class="rl-directory-row">
            <span>${esc(chapter.title)}${chapter.isNew ? "<i>新</i>" : ""}</span>
            <strong>${esc(chapter.status)}</strong>
          </div>`).join("")}
      </div>`;
  }

  function readingSegmentTabs(tabs) {
    return `
      <div class="rl-reading-segment-tabs">
        ${(tabs || []).map((tab) => `<button class="${tab.active ? "is-active" : ""}" type="button">${esc(tab.label)}</button>`).join("")}
      </div>`;
  }

  function readingSearchField(searchData) {
    return `
      <label class="rl-reading-search-field">
        ${icon("search")}
        <span>${esc((searchData || {}).query || "搜索章节")}</span>
        <strong>${esc((searchData || {}).resultsLabel || "")}</strong>
      </label>`;
  }

  function readingChapterRows(chapters) {
    return `
      <div class="rl-reading-chapter-list">
        ${(chapters || []).map((chapter) => `
          <button class="rl-reading-chapter-row${chapter.current ? " is-current" : ""}" type="button">
            <span>${esc(chapter.title)}</span>
            <strong>${esc(chapter.status)}</strong>
          </button>`).join("")}
      </div>`;
  }

  function readingBookmarkRows(bookmarks) {
    return `
      <div class="rl-reading-bookmark-list">
        ${(bookmarks || []).map((bookmark) => `
          <button class="rl-reading-bookmark-row" type="button">
            ${icon("bookmark")}
            <span>
              <strong>${esc(bookmark.chapter)} · ${esc(bookmark.location)}</strong>
              <small>${esc(bookmark.excerpt)} · ${esc(bookmark.time)}</small>
            </span>
          </button>`).join("")}
      </div>`;
  }

  function readingMoreMenu(items) {
    return `
      <div class="rl-reading-more-menu">
        ${(items || []).map((item) => `
          <button type="button">
            <strong>${esc(item.label)}</strong>
            <small>${esc(item.desc)}</small>
          </button>`).join("")}
      </div>`;
  }

  function readingTocControls(tabs, chapters, bookmarks, searchData, menuItems) {
    return `
      <div class="rl-reading-toc-demo">
        ${readingSearchField(searchData)}
        ${readingSegmentTabs(tabs)}
        ${readingChapterRows(chapters)}
        ${readingBookmarkRows(bookmarks)}
        ${readingMoreMenu(menuItems)}
      </div>`;
  }

  function appearanceStepper(stepperData) {
    stepperData = stepperData || {};
    return `
      <section class="rl-appearance-control-row">
        <strong>${esc(stepperData.title)}</strong>
        <div class="rl-appearance-stepper">
          <button type="button">${esc(stepperData.minLabel)}</button>
          <span>${esc(stepperData.value)}</span>
          <button type="button">${esc(stepperData.plusLabel)}</button>
        </div>
      </section>`;
  }

  function appearanceSegmentControl(lineSpacing) {
    lineSpacing = lineSpacing || {};
    return `
      <section class="rl-appearance-control-row">
        <strong>${esc(lineSpacing.title)}</strong>
        <div class="rl-appearance-segment">
          ${((lineSpacing || {}).options || []).map((item) => `<button class="${item.active ? "is-active" : ""}" type="button">${esc(item.label)}</button>`).join("")}
        </div>
      </section>`;
  }

  function appearanceThemeSwatches(themes) {
    return `
      <section class="rl-appearance-theme-row">
        <strong>主题</strong>
        <div>
          ${(themes || []).map((theme) => `
            <button class="${theme.active ? "is-active" : ""}" type="button" style="--bg:${esc(theme.background)}; --fg:${esc(theme.text)}">
              <span></span><small>${esc(theme.label)}</small>
            </button>`).join("")}
        </div>
      </section>`;
  }

  function appearanceFontOptions(fonts) {
    return `
      <div class="rl-appearance-font-list">
        ${(fonts || []).map((font) => `
          <button class="${font.active ? "is-active" : ""}" type="button">
            <span><strong>${esc(font.label)}</strong><small>${esc(font.meta)}</small></span>
            <em>${esc(font.preview)}</em>
          </button>`).join("")}
      </div>`;
  }

  function appearancePreviewCards(animations, preview) {
    const animation = ((animations || []).find((item) => item.active) || (animations || [])[0]) || {};
    return `
      <div class="rl-appearance-preview-grid">
        <article>
          <strong>${esc((preview || {}).previewTitle || "预览")}</strong>
          <p>${esc((preview || {}).previewCopy)}</p>
        </article>
        <article>
          <strong>翻页动画</strong>
          <p>${esc(animation.label)}</p>
        </article>
      </div>`;
  }

  function appearanceControls(stepperData, lineSpacing, themes, fonts, animations, preview) {
    return `
      <div class="rl-appearance-demo">
        ${appearanceStepper(stepperData)}
        ${appearanceSegmentControl(lineSpacing)}
        ${appearanceThemeSwatches(themes)}
        ${appearanceFontOptions(fonts)}
        ${appearancePreviewCards(animations, preview)}
      </div>`;
  }

  function aloudSpeedControl(options) {
    return `
      <section class="rl-aloud-speed">
        <strong>语速</strong>
        <div>
          ${(options || []).map((item) => `<button class="${item.active ? "is-active" : ""}" type="button">${esc(item.label)}</button>`).join("")}
        </div>
      </section>`;
  }

  function aloudVoiceOptions(voices) {
    return `
      <div class="rl-aloud-voices">
        ${(voices || []).map((voice) => `
          <button class="${voice.active ? "is-active" : ""}" type="button">
            <strong>${esc(voice.label)}</strong>
            <small>${esc(voice.meta)}</small>
          </button>`).join("")}
      </div>`;
  }

  function aloudRunningCapsule(capsule) {
    capsule = capsule || {};
    return `
      <article class="rl-aloud-capsule">
        ${icon("pause")}
        <span><strong>${esc(capsule.title)}</strong><small>${esc(capsule.sentence)}</small></span>
        <button type="button">${esc(capsule.actionLabel)}</button>
      </article>`;
  }

  function aloudSettingGrid(controls) {
    return `
      <div class="rl-aloud-setting-grid">
        ${Object.keys(controls || {}).map((key) => {
          const item = controls[key] || {};
          return `<button type="button"><strong>${esc(item.label)}</strong><span>${esc(item.value)}</span></button>`;
        }).join("")}
      </div>`;
  }

  function aloudControls(controls, voices, speedOptions, capsule) {
    return `
      <div class="rl-aloud-demo">
        <div class="rl-aloud-play-row">
          <button type="button">上一句</button>
          <button class="rl-aloud-play-button" type="button">${icon("play")}<span>开始</span></button>
          <button type="button">下一句</button>
        </div>
        ${aloudRunningCapsule(capsule)}
        ${aloudSpeedControl(speedOptions)}
        ${aloudVoiceOptions(voices)}
        ${aloudSettingGrid(controls)}
      </div>`;
  }

  function autoPageControls(control) {
    control = control || {};
    const speed = control.speed || {};
    const capsule = control.runningCapsule || {};
    return `
      <div class="rl-auto-page-demo">
        <section class="rl-auto-speed" style="--value: ${pct(speed.value)}">
          <header><strong>${esc(speed.title)}</strong><span>${esc(speed.valueLabel)}</span></header>
          <div><i></i><b></b></div>
          <footer><span>${esc(speed.slowLabel)}</span><span>${esc(speed.fastLabel)}</span></footer>
        </section>
        <div class="rl-auto-modes">
          ${(control.modes || []).map((mode) => `<button class="${mode.active ? "is-active" : ""}" type="button">${esc(mode.label)}</button>`).join("")}
        </div>
        <article class="rl-aloud-capsule">
          ${icon("auto-page")}
          <span><strong>${esc(capsule.title)}</strong><small>${esc(capsule.sentence)}</small></span>
          <button type="button">${esc(capsule.actionLabel)}</button>
        </article>
        <div class="rl-auto-actions">
          <button type="button">${esc(control.stopLabel)}</button>
          <button class="is-primary" type="button">${esc(control.startLabel)}</button>
        </div>
      </div>`;
  }

  function highlight(text, query) {
    const source = esc(text);
    const term = esc(query);
    if (!term) return source;
    return source.split(term).join(`<mark>${term}</mark>`);
  }

  function contentSearchControls(search) {
    search = search || {};
    return `
      <div class="rl-content-search-demo">
        <label class="rl-content-search-input">
          ${icon("search")}
          <span>${esc(search.query)}</span>
          <small>${esc(search.countLabel)}</small>
        </label>
        <div class="rl-content-search-filters">
          ${(search.filters || []).map((filter) => `<button class="${filter.active ? "is-active" : ""}" type="button">${esc(filter.label)}</button>`).join("")}
        </div>
        <div class="rl-content-result-list">
          ${(search.results || []).map((result) => `
            <button class="rl-content-result-row" type="button">
              <span><strong>${esc(result.title)}</strong><small>${esc(result.meta)}</small></span>
              <p>${highlight(result.excerpt, search.query)}</p>
            </button>`).join("")}
        </div>
        <section class="rl-content-search-empty">
          <strong>${esc((search.empty || {}).title)}</strong>
          <small>${esc((search.empty || {}).copy)}</small>
          <button type="button">${esc((search.empty || {}).primaryAction)}</button>
        </section>
      </div>`;
  }

  function replacementControls(replacement) {
    replacement = replacement || {};
    const preview = replacement.preview || {};
    const form = replacement.form || {};
    return `
      <div class="rl-replacement-demo">
        <div class="rl-replacement-rules">
          ${(replacement.rules || []).map((rule) => `
            <button class="rl-replacement-row" type="button">
              <span>${icon(rule.icon)}</span>
              <strong>${esc(rule.title)}</strong>
              <small>${esc(rule.meta)}</small>
              <i class="${rule.enabled ? "is-on" : ""}"></i>
            </button>`).join("")}
        </div>
        <section class="rl-replacement-preview">
          <strong>${esc(preview.title)}</strong>
          <p><span>${esc(preview.beforeLabel)}：</span>${highlight(preview.beforeText, "反着光")}</p>
          <p><span>${esc(preview.afterLabel)}：</span>${highlight(preview.afterText, "映着光")}</p>
        </section>
        <section class="rl-replacement-form">
          <label><span>${esc(form.beforeLabel)}</span><strong>${esc(form.beforeValue)}</strong></label>
          <label><span>${esc(form.afterLabel)}</span><strong>${esc(form.afterValue)}</strong></label>
          <div><button type="button">${esc(form.testLabel)}</button><button class="is-primary" type="button">${esc(form.saveLabel)}</button></div>
        </section>
      </div>`;
  }

  function readerOpenStateControls(entry) {
    entry = entry || {};
    return `
      <div class="rl-reader-open-demo">
        <section class="rl-reader-open-context">
          <strong>${esc(entry.source)}</strong>
          <small>${esc(entry.context)}</small>
        </section>
        <div class="rl-reader-open-actions">
          <button class="is-primary" type="button">
            ${icon("play")}
            <span><strong>${esc(entry.continueLabel)}</strong><small>${esc(entry.continueMeta)}</small></span>
          </button>
          <button type="button">
            ${icon("book")}
            <span><strong>${esc(entry.startLabel)}</strong><small>${esc(entry.startMeta)}</small></span>
          </button>
        </div>
        <section class="rl-reader-open-loading">
          ${icon("clock")}
          <strong>${esc(entry.loadingTitle)}</strong>
          <i></i>
        </section>
        <section class="rl-reader-open-repair">
          ${icon("warning")}
          <span><strong>${esc(entry.errorTitle)}</strong><small>${esc(entry.retryLabel)} · ${esc(entry.repairLabel)}</small></span>
          <button type="button">${esc(entry.repairLabel)}</button>
        </section>
      </div>`;
  }

  function immersiveReadingControls(reading) {
    reading = reading || {};
    return `
      <div class="rl-immersive-demo">
        <section class="rl-immersive-page">
          <span class="is-top-left">${esc(reading.topLeft)}</span>
          <span class="is-top-right">${esc(reading.time)}</span>
          <article>
            <strong>${esc(reading.title)}</strong>
            <p>${esc(reading.paragraph)}</p>
          </article>
          <span class="is-bottom-left">${esc(reading.progress)}</span>
          <span class="is-bottom-right">${esc(reading.chapterOnly)}</span>
          <div class="rl-immersive-tap-zones">
            ${(reading.tapZones || []).map((label) => `<i>${esc(label)}</i>`).join("")}
          </div>
        </section>
      </div>`;
  }

  function sourceSwitchControls(sourceSwitch) {
    sourceSwitch = sourceSwitch || {};
    const filters = sourceSwitch.filters || [];
    const candidates = sourceSwitch.candidates || [];
    return `
      <div class="rl-source-switch-demo">
        <div class="rl-source-switch-filter">
          ${filters.map((filter, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button">${esc(filter)}</button>`).join("")}
        </div>
        <div class="rl-source-switch-list">
          ${candidates.map((candidate) => `
            <article class="rl-source-candidate-row${candidate.current ? " is-current" : ""}${candidate.checking ? " is-checking" : ""}">
              <span class="rl-source-candidate-icon">${icon(candidate.current ? "check" : "source")}</span>
              <span class="rl-source-candidate-main">
                <strong>${esc(candidate.name)} <em class="${candidate.current ? "is-current" : candidate.checking ? "is-checking" : candidate.status === "失效" ? "is-error" : ""}">${esc(candidate.status)}</em></strong>
                <small>${esc(candidate.chapter)} · ${esc(candidate.meta)}</small>
              </span>
              <button type="button" ${candidate.disabled ? "disabled" : ""}>${esc(candidate.current ? "当前来源" : candidate.disabled ? "不可用" : sourceSwitch.switchLabel)}</button>
            </article>`).join("")}
        </div>
        <section class="rl-source-switch-result">
          ${icon("check")}
          <span><strong>${esc(sourceSwitch.selectedSource)}</strong><small>${esc(sourceSwitch.checking)} · 内容校验后保留阅读位置</small></span>
        </section>
      </div>`;
  }

  function settingIcon(name) {
    return name === "progress" ? icon("progressPie") : icon(name);
  }

  function readingSettingControls(groups, presets, advanced) {
    return `
      <div class="rl-reading-setting-demo">
        <div class="rl-reading-preset-grid">
          ${(presets || []).map((preset) => `
            <button type="button">
              ${settingIcon(preset.icon)}
              <strong>${esc(preset.title)}</strong>
              <small>${esc(preset.value)}</small>
            </button>`).join("")}
        </div>
        <div class="rl-reading-setting-groups">
          ${(groups || []).map((group) => `
            <button type="button">
              <span>${settingIcon(group.icon)}</span>
              <strong>${esc(group.title)}</strong>
              <small>${esc(group.meta)}</small>
              ${icon("chevron")}
            </button>`).join("")}
        </div>
        <div class="rl-reading-advanced-list">
          ${(advanced || []).map((item) => `
            <button type="button">
              <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
              <i class="${item.enabled ? "is-on" : ""}"></i>
            </button>`).join("")}
        </div>
      </div>`;
  }

  function generalSettingsControls(settings) {
    settings = settings || {};
    const selected = ((settings.selectRows || [])[0] || {}).value;
    return `
      <div class="rl-general-settings-demo">
        <div class="rl-general-select-list">
          ${((settings.selectRows || [])).map((row) => `
            <button class="rl-general-select-row" type="button">
              <span>${icon(row.icon)}</span>
              <strong>${esc(row.title)}</strong>
              <small>${esc(row.value)}</small>
              ${icon("chevron")}
            </button>`).join("")}
        </div>
        <section class="rl-general-option-sheet">
          <header><strong>语言</strong><small>OptionSheet</small></header>
          ${(((settings.selectRows || [])[0] || {}).options || []).map((option) => `
            <button class="${option === selected ? "is-selected" : ""}" type="button">
              <span>${esc(option)}</span>
              ${option === selected ? icon("check") : ""}
            </button>`).join("")}
        </section>
        <div class="rl-general-switch-list">
          ${((settings.switches || [])).map((item) => `
            <button type="button">
              <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
              <i class="${item.enabled ? "is-on" : ""}"></i>
            </button>`).join("")}
        </div>
        <section class="rl-general-toast">
          ${icon("check")}
          <strong>${esc((settings.toast || {}).success)}</strong>
          <small>${esc((settings.toast || {}).error)}</small>
        </section>
      </div>`;
  }

  function settingsManagementControls(settings) {
    settings = settings || {};
    const badge = (label, tone) => `<em class="rl-management-badge is-${esc(tone || "muted")}">${esc(label)}</em>`;
    return `
      <div class="rl-management-demo">
        <button class="rl-management-danger" type="button">
          ${icon("trash")}
          <span><strong>${esc((settings.danger || {}).title)}</strong><small>${esc((settings.danger || {}).meta)} · ${esc((settings.danger || {}).confirmLabel)}</small></span>
        </button>
        <div class="rl-management-list">
          ${(settings.permissions || []).map((item) => `
            <article>
              ${icon(item.actionLabel ? "shield" : "file")}
              <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
              ${badge(item.status, item.tone)}
              ${item.actionLabel ? `<button type="button">${esc(item.actionLabel)}</button>` : ""}
            </article>`).join("")}
        </div>
        <section class="rl-management-cache">
          <header><strong>${esc((settings.cache || {}).title)}</strong><span>${esc((settings.cache || {}).value)}</span></header>
          <i><b></b></i>
          ${(((settings.cache || {}).categories) || []).map((item) => `<p><span>${esc(item.title)}</span><strong>${esc(item.value)}</strong></p>`).join("")}
        </section>
        <div class="rl-management-list">
          ${(settings.backup || []).map((item) => `
            <article>
              ${icon("file")}
              <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
              ${badge(item.status, "info")}
            </article>`).join("")}
        </div>
        <div class="rl-management-source-list">
          ${(settings.sources || []).map((item) => `
            <article>
              ${icon("source")}
              <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
              ${badge(item.status, item.status === "可用" ? "good" : "warn")}
              <i class="${item.enabled ? "is-on" : ""}"></i>
            </article>`).join("")}
        </div>
        <section class="rl-management-form">
          <strong>${esc((settings.form || {}).title)}</strong>
          ${(((settings.form || {}).fields) || []).map((field) => `<label>${esc(field)}</label>`).join("")}
          <button type="button">${esc((settings.form || {}).saveLabel)}</button>
        </section>
        <section class="rl-management-log">
          ${(settings.logs || []).map((line) => `<p>${esc(line)}</p>`).join("")}
        </section>
      </div>`;
  }

  function sortFilterControls(sections) {
    return `
      <div class="rl-sort-filter-demo">
        ${(sections || []).map((section) => `
          <section>
            <h4>${esc(section.title)}</h4>
            <div>
              ${(section.options || []).map((option) => `
                <button class="rl-filter-option${option.active ? " is-active" : ""}${section.mode === "multi" ? " is-chip" : ""}" type="button">${esc(option.label)}</button>`).join("")}
            </div>
          </section>`).join("")}
        <div class="rl-filter-actions">
          <button class="rl-filter-reset" type="button">重置</button>
          <button class="rl-filter-apply" type="button">应用</button>
        </div>
      </div>`;
  }

  function bookActionCover(book) {
    return `<span class="rl-book-action-cover is-${esc(book.coverTone || "blue")}"><span>${esc(book.coverLabel || book.title)}</span><i></i></span>`;
  }

  function bookActionControls(book, actionsData, confirm) {
    return `
      <div class="rl-book-action-demo">
        <article class="rl-book-action-summary">
          ${bookActionCover(book || {})}
          <span>
            <strong>${esc((book || {}).title)}</strong>
            <small>${esc((book || {}).author)} · ${esc((book || {}).chapter)} · ${esc((book || {}).progress)}%</small>
          </span>
        </article>
        <div class="rl-book-action-list">
          ${(actionsData || []).map((action) => `
            <button class="rl-book-action-row${action.tone === "danger" ? " is-danger" : ""}" type="button">
              <span><strong>${esc(action.title)}</strong><small>${esc(action.copy)}</small></span>
              ${icon("chevron")}
            </button>`).join("")}
        </div>
        <section class="rl-confirm-dialog-demo">
          <span>${icon("warning")}</span>
          <strong>${esc((confirm || {}).title)}</strong>
          <small>${esc((confirm || {}).copy)}</small>
          <div>
            <button type="button">${esc((confirm || {}).cancelLabel)}</button>
            <button class="is-danger" type="button">${esc((confirm || {}).confirmLabel)}</button>
          </div>
        </section>
      </div>`;
  }

  function groupManagementControls(groupsData, dialog, confirm) {
    return `
      <div class="rl-group-management-demo">
        <div class="rl-group-list-demo">
          ${(groupsData || []).map((group) => `
            <article class="rl-group-row${group.system ? " is-system" : ""}">
              <span>${group.canReorder ? icon("drag") : ""}</span>
              <strong>${esc(group.title)}</strong>
              <small>${esc(group.meta)}</small>
              <em>${group.system && !group.canReorder ? `${esc(group.count)} 本` : icon("more")}</em>
            </article>`).join("")}
        </div>
        <section class="rl-group-dialog-demo">
          <strong>${esc((dialog || {}).newTitle)}</strong>
          <span>${esc((dialog || {}).inputPlaceholder)}</span>
          <small>${esc((dialog || {}).helper)}</small>
          <div><button type="button">${esc((dialog || {}).cancelLabel)}</button><button type="button" class="is-primary">${esc((dialog || {}).saveLabel)}</button></div>
        </section>
        <section class="rl-group-delete-demo">
          ${icon("warning")}
          <span><strong>${esc((confirm || {}).title)}</strong><small>${esc((confirm || {}).copy)}</small></span>
          <button type="button">${esc((confirm || {}).confirmLabel)}</button>
        </section>
      </div>`;
  }

  function localImportControls(intro, permission, formats, progressData, counts, results) {
    return `
      <div class="rl-local-import-demo">
        <article class="rl-local-import-intro">
          <span>${icon("folder")}</span>
          <div>
            <strong>${esc((intro || {}).title)}</strong>
            <small>${esc((intro || {}).copy)}</small>
            <div>${((intro || {}).formats || []).map((item) => `<em>${esc(item)}</em>`).join("")}</div>
            <button type="button">${esc((intro || {}).primaryAction)}</button>
          </div>
        </article>
        <article class="rl-local-import-permission">
          ${icon("shield")}
          <span><strong>${esc((permission || {}).title)}</strong><small>${esc((permission || {}).copy)}</small></span>
        </article>
        <div class="rl-local-import-formats">
          ${(formats || []).map((item) => `<span class="is-${esc(item.tone)}"><strong>${esc(item.label)}</strong><small>${esc(item.copy)}</small></span>`).join("")}
        </div>
        <article class="rl-local-import-progress" style="--value:${pct((progressData || {}).progress)}">
          <strong>${esc((progressData || {}).title)}</strong>
          <small>${esc((progressData || {}).currentFile)}</small>
          <i></i>
        </article>
        <div class="rl-local-import-counts">
          ${(counts || []).map((item) => `<span class="is-${esc(item.tone)}"><strong>${esc(item.value)}</strong><small>${esc(item.label)}</small></span>`).join("")}
        </div>
        <div class="rl-local-import-results">
          ${(results || []).map((item) => `
            <article class="is-${esc(item.tone)}">
              ${icon(item.tone === "success" ? "check" : item.tone === "skip" ? "file" : "warning")}
              <span><strong>${esc(item.fileName)}</strong><small>${esc(item.status)}${item.reason ? ` · ${esc(item.reason)}` : ""}</small></span>
            </article>`).join("")}
        </div>
      </div>`;
  }

  function rows(items) {
    return `
      <div class="rl-demo-stack">
        ${items.map((item) => `
          <article class="rl-setting-row">
            <span class="rl-row-icon">${icon(item.icon)}</span>
            <div>
              <h4 class="rl-row-title">${esc(item.title)}</h4>
              <p class="rl-row-meta">${esc(item.meta)}</p>
            </div>
            <span class="rl-row-value">${esc(item.value)}</span>
          </article>`).join("")}
      </div>`;
  }

  function mainNav(items) {
    return `
      <nav class="rl-bottom-nav" aria-label="公共主导航">
        ${items.map((item) => `
          <button class="rl-bottom-nav-item${item.active ? " is-active" : ""}" type="button">
            ${icon(item.type)}
            <span>${esc(item.label)}</span>
          </button>`).join("")}
      </nav>`;
  }

  function actions(items) {
    return `
      <div class="rl-quick-grid">
        ${items.map((item) => `
          <button class="rl-action" type="button">
            <span class="rl-action-icon">${icon(item.type)}</span>
            <span>${esc(item.label)}</span>
          </button>`).join("")}
      </div>`;
  }

  function modules(items) {
    return `
      <div class="rl-module-grid">
        ${items.map((item) => `
          <button class="rl-action${item.active ? " is-active" : ""}" type="button">
            <span class="rl-action-icon">${icon(item.type)}</span>
            <span>${esc(item.label)}</span>
          </button>`).join("")}
      </div>`;
  }

  function verticalSlider(value) {
    return `
      <div class="rl-panel rl-vertical-slider">
        <strong>亮度</strong>
        ${icon("settings")}
        <div class="rl-vertical-rail" style="--value: ${pct(value)}">
          <span class="rl-vertical-fill"></span>
          <span class="rl-vertical-thumb"></span>
        </div>
        <span>A</span>
        <span>系统</span>
      </div>`;
  }

  function states(items) {
    return `
      <div class="rl-demo-stack">
        <div class="rl-skeleton" aria-label="加载态">
          <span class="rl-skeleton-block"></span>
          <span class="rl-skeleton-line"></span>
          <span class="rl-skeleton-line is-short"></span>
        </div>
        ${items.map((item) => `
          <div class="rl-state-block">
            <div>
              <h4 class="rl-state-title">${esc(item.title)}</h4>
              <p class="rl-state-copy">${esc(item.copy)}</p>
            </div>
          </div>`).join("")}
      </div>`;
  }

  function renderComponentLibrary(target, data) {
    target.innerHTML = `
      <main class="rl-library">
        <header class="rl-library-header">
          <div>
            <h1 class="rl-library-title">${esc(data.meta.title)}</h1>
            <p class="rl-library-summary">${esc(data.meta.summary)}</p>
          </div>
          <span class="rl-library-badge">v${esc(data.meta.version)}</span>
        </header>

        <section class="rl-section">
          <div class="rl-section-head">
            <h2 class="rl-section-title">Foundations</h2>
            <p class="rl-section-note">所有页面先引用共享 token，再使用组件库局部结构。</p>
          </div>
          <div class="rl-component-grid is-two">
            ${componentCard("Color Tokens", "纸张、墨色、主色、强调色和边线。", swatches(data.colors))}
            ${componentCard("Typography / Elevation", "阅读正文用 serif，操作和列表用 sans。", `
              <div class="rl-demo-stack">
                <div class="rl-card"><h4 class="rl-card-title">卡片标题</h4><p class="rl-card-copy">使用共享圆角、边线和阴影，禁止随页面任意漂移。</p></div>
                <div class="rl-panel" style="padding:18px">Panel / Sheet 内层容器</div>
              </div>`)}
          </div>
        </section>

        <section class="rl-section">
          <div class="rl-section-head">
            <h2 class="rl-section-title">App Shell</h2>
            <p class="rl-section-note">主标签页、设置页和大部分书架链路先复用此组骨架。</p>
          </div>
          <div class="rl-component-grid">
            ${componentCard("AppFrame / StatusBar", "手机画布、系统状态栏和安全区。", `
              <div class="rl-app-frame" style="--frame-width: 254px; --frame-height: 180px">
                <header class="rl-status-bar" style="height:46px; padding:16px 18px 0; font-size:15px">
                  <span>10:30</span>
                  <span class="rl-system-icons" style="gap:5px; transform:scale(.58); transform-origin:right center">
                    <span class="rl-wifi"></span><span class="rl-signal"></span><span class="rl-battery"></span><span>82%</span>
                  </span>
                </header>
              </div>`)}
            ${componentCard("AppTopBar", "主页面标题、搜索和更多。", `
              <div class="rl-app-top-bar" style="padding:0">
                <h3 class="rl-app-title" style="font-size:34px">设置</h3>
                <div class="rl-top-actions" style="gap:18px">${icon("search")}${icon("more")}</div>
              </div>`)}
            ${componentCard("IconButton", "顶部搜索、更多、返回、设置等图标按钮。", `
              <div class="rl-demo-row">
                <button class="rl-icon-button is-filled">${icon("search")}</button>
                <button class="rl-icon-button">${icon("more")}</button>
                <button class="rl-icon-button is-filled">${icon("back")}</button>
                <button class="rl-icon-button">${icon("sort")}</button>
              </div>`)}
            ${componentCard("MainNav", "书架、发现、RSS、设置四个公共主导航按钮固定结构。", mainNav(data.bottomNav))}
            ${componentCard("SearchBar", "搜索页、书源页和内容搜索的基础输入槽。", `
              <div class="rl-search-bar">${icon("search")}<span>搜索书名、作者或书源</span><strong>取消</strong></div>`)}
          </div>
        </section>

        <section class="rl-section">
          <div class="rl-section-head">
            <h2 class="rl-section-title">Basic Controls</h2>
            <p class="rl-section-note">Chip、进度条和滑杆在书架、阅读控制、筛选页共用。</p>
          </div>
          <div class="rl-component-grid">
            ${componentCard("Chip", "分组、筛选、状态切换。", chips(data.chips))}
            ${componentCard("ProgressBar / Slider", "阅读进度和章节进度。", `<div class="rl-demo-stack">${progress(38)}${slider(42)}</div>`)}
            ${componentCard("Badge / Switch", "设置行状态提示和二级页开关。", `
              <div class="rl-demo-row">
                <span class="rl-badge">可用</span>
                <span class="rl-badge is-warning">待授权</span>
                <span class="rl-badge is-muted">未设置</span>
                <span class="rl-switch is-on"></span>
                <span class="rl-switch"></span>
              </div>`)}
          </div>
          <div class="rl-component-grid" style="margin-top:18px">
            ${componentCard("QuickAction", "阅读控制层快捷操作按钮。", actions(data.quickActions))}
            ${componentCard("ActionButton", "空态、导入、重试和管理入口。", `
              <div class="rl-demo-stack">
                <button class="rl-primary-button" type="button">添加书籍</button>
                <button class="rl-secondary-button" type="button">导入本地书</button>
                <button class="rl-text-button" type="button">换个分组看看</button>
              </div>`)}
          </div>
        </section>

        <section class="rl-section">
          <div class="rl-section-head">
            <h2 class="rl-section-title">Cards & Rows</h2>
            <p class="rl-section-note">书籍、设置、书源、RSS 和普通列表的基础单元。</p>
          </div>
          <div class="rl-component-grid">
            ${componentCard("BookCard", "封面网格卡片。", bookCard(data.book))}
            ${componentCard("BookRow", "搜索、目录、最近阅读可复用的行。", bookRow(data.book))}
            ${componentCard("ListRow / SettingRow", "设置链路、书源管理和缓存管理基础行。", rows(data.rows))}
            ${componentCard("SearchResultItem", "书籍搜索、发现和 RSS 可进入详情或加入书架的结果行。", searchResults(data.searchResults))}
            ${componentCard("DiscoverySourceControls", "发现与 RSS 复用的来源类型、当前来源和分类 chips。", currentSourceCard(data.currentSource, data.sourceTypes, data.discoveryCategories))}
            ${componentCard("DiscoveryContentCard", "发现首页推荐内容和来源内栏目内容。", discoveryContent(data.discoveryContent))}
            ${componentCard("SourceStatusBar / RankingRow", "来源数量、检测入口和榜单列表。", `<div class="rl-demo-stack">${sourceStatus(data.sourceStatus)}${rankingList(data.ranking)}</div>`)}
            ${componentCard("SubscriptionSummaryCard", "RSS 根页订阅概览和刷新入口。", rssSummary(data.rssSummary))}
            ${componentCard("FeedStatusChips / FeedSourceChips", "RSS 内容筛选和订阅源筛选。", rssFilters(data.rssStatusFilters, data.rssSourceFilters))}
            ${componentCard("RssEntryItem", "订阅流条目、未读点和时间状态。", rssEntryList(data.rssEntries))}
            ${componentCard("BookDetailHeader", "书籍详情头部信息、来源和主操作。", bookDetailHeader(data.bookDetail))}
            ${componentCard("ChapterPreviewList", "详情页章节预览，完整页要求不少于 20 条。", chapterPreview(data.bookDetailProgress, data.bookDetailChapters))}
            ${componentCard("IntroCard / SourceChangeSheet", "简介卡与详情页内换源来源行。", `<div class="rl-demo-stack">${introCard(data.bookDetailIntro)}${sourceRows(data.bookDetailSources)}</div>`)}
            ${componentCard("DirectorySummaryBar", "目录页书名、来源和章节数量摘要。", directorySummary(data.directorySummary))}
            ${componentCard("ChapterRow / CurrentChapterRow", "书籍目录和阅读目录共用的章节行。", directoryRows(data.directoryCurrentChapter, data.directoryChapters))}
            ${componentCard("SegmentTab / BookmarkRow / SearchField / MoreMenu", "阅读目录与书签面板的切换、检索、书签行和更多操作。", readingTocControls(data.readingSegmentTabs, data.readingTocChapters, data.readingBookmarks, data.readingSearch, data.readingMoreMenu))}
            ${componentCard("ThemeSwatch / FontOption / Stepper / PreviewCard / SegmentControl", "阅读外观、阅读设置和通用外观设置可复用的外观控件。", appearanceControls(data.appearanceStepper, data.appearanceLineSpacing, data.appearanceThemes, data.appearanceFonts, data.appearanceAnimations, data.appearancePreview))}
            ${componentCard("ReadAloudButton / PlayPauseControl / SpeedControl / VoiceOption / RunningCapsule", "朗读控制、语速、声音和运行状态胶囊。", aloudControls(data.aloudControls, data.aloudVoices, data.aloudSpeedOptions, data.aloudRunningCapsule))}
            ${componentCard("SpeedSlider / StartButton / StopButton", "自动翻页速度、模式、开始和停止控制。", autoPageControls(data.autoPageControl))}
            ${componentCard("SearchInput / ResultRow / EmptySearchState / KeyboardAvoidance", "正文内搜索输入、匹配结果、无结果和键盘避让规则。", contentSearchControls(data.contentSearch))}
            ${componentCard("ReplacementRuleRow / TextField / PatternInput / SaveButton", "正文替换规则、表单、测试和保存控制。", replacementControls(data.replacementControl))}
            ${componentCard("StartReadingAction / ContinueReadingAction / OpenLoadingState / ReadingRepairAction", "阅读打开状态的开始、继续、打开中和失败修复动作。", readerOpenStateControls(data.readerOpenState))}
            ${componentCard("ReadingParagraph / WeakInfoText / ProgressInfo / TapZone", "沉浸阅读正文、弱信息、进度和透明点击热区。", immersiveReadingControls(data.immersiveReading))}
            ${componentCard("SourceCandidateRow / CurrentSourceBadge / DetectStatusBadge / SwitchSourceButton", "阅读中换源候选行、当前来源、检测状态和切换操作。", sourceSwitchControls(data.sourceSwitch))}
            ${componentCard("SettingGroupCard / PresetRow", "阅读设置和通用设置页复用的分组入口、预设和高级开关。", readingSettingControls(data.readingSettingGroups, data.readingSettingPresets, data.readingAdvancedSettings))}
            ${componentCard("SelectRow / OptionSheet / SettingsToast", "设置二级页的选择项、可选项底表和轻量反馈。", generalSettingsControls(data.generalSettings))}
            ${componentCard("DangerActionRow / PermissionRow / CacheSizeCard / BackupRecordRow / SourceRow / LogPanel", "设置管理页的危险操作、权限、缓存、备份、书源和日志组件。", settingsManagementControls(data.settingsManagement))}
            ${componentCard("RadioOption / FilterChip", "排序与筛选底表的单选和多选控件。", sortFilterControls(data.sortFilterSections))}
            ${componentCard("BookSummary / ActionRow / ConfirmDialog", "书籍操作底表、危险操作和二次确认。", bookActionControls(data.bookActionBook, data.bookActionActions, data.bookActionConfirm))}
            ${componentCard("GroupRow / RenameDialog / ReorderHandle", "分组管理列表、命名弹窗、删除确认和排序手柄。", groupManagementControls(data.groupManagementGroups, data.groupManagementDialog, data.groupDeleteConfirm))}
            ${componentCard("ImportIntro / FilePicker / ImportResult", "本地书导入授权说明、系统文件选择器入口、进度和结果行。", localImportControls(data.localImportIntro, data.localImportPermission, data.localImportFormats, data.localImportProgress, data.localImportSummaryCounts, data.localImportResults))}
          </div>
        </section>

        <section class="rl-section">
          <div class="rl-section-head">
            <h2 class="rl-section-title">Sheets & Panels</h2>
            <p class="rl-section-note">底表、阅读面板、模块导航和亮度滑杆。</p>
          </div>
          <div class="rl-component-grid">
            ${componentCard("BottomSheet", "排序筛选、书籍操作、阅读控制层外壳。", `
              <div class="rl-bottom-sheet">
                <span class="rl-grabber"></span>
                <div class="rl-demo-stack">${actions(data.quickActions)}${slider(42)}</div>
              </div>`)}
            ${componentCard("ReaderModuleNav", "目录、朗读、界面、设置模块切换。", modules(data.moduleNav))}
            ${componentCard("BrightnessSlider", "阅读控制层竖向亮度控制。", verticalSlider(56))}
          </div>
        </section>

        <section class="rl-section">
          <div class="rl-section-head">
            <h2 class="rl-section-title">States</h2>
            <p class="rl-section-note">加载、空、错误、权限状态必须语义分离。</p>
          </div>
          <div class="rl-component-grid is-two">
            ${componentCard("EmptyStateCard", "空状态必须说明原因，并提供一个主行动作。", `
              <div class="rl-empty-state-card">
                <svg class="rl-empty-illustration" viewBox="0 0 120 120">
                  <rect x="20" y="18" width="80" height="84" rx="13" fill="none" stroke="currentColor" stroke-width="4"></rect>
                  <path d="M60 30v60M34 48h26M34 66h26M34 84h26M60 48h26M60 66h26M60 84h26" stroke="currentColor" stroke-width="3"></path>
                </svg>
                <h4 class="rl-empty-title">暂无书籍</h4>
                <p class="rl-empty-copy">可以搜索书籍，也可以导入本地书。</p>
                <button class="rl-primary-button" type="button">添加书籍</button>
              </div>`)}
            ${componentCard("Loading / Empty / Error", "所有页面必须使用稳定容器，避免布局跳动。", states(data.states))}
            ${componentCard("Conversion Guardrail", "页面转换时必须先查组件库，缺组件再扩展。", `
              <div class="rl-state-block">
                <div>
                  <h4 class="rl-state-title">先复用，再扩展</h4>
                  <p class="rl-state-copy">新增页面不得重新定义顶部栏、底部导航、Chip、卡片、滑杆、底表和状态块。</p>
                </div>
              </div>`)}
          </div>
        </section>
      </main>`;
  }

  window.ReaderComponentLibrary = {
    renderComponentLibrary
  };
})(window);
