(function attachReaderFrontendDemoDraft(window) {
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function icon(name, className) {
    if (window.ReaderShellKit && window.ReaderShellKit.icon) {
      return window.ReaderShellKit.icon(name, className || "fd-icon");
    }
    if (window.ReaderAssetIcons && window.ReaderAssetIcons.renderIcon) {
      return window.ReaderAssetIcons.renderIcon(name, className || "fd-icon");
    }
    return `<span class="${esc(className || "fd-icon")}">${esc(name)}</span>`;
  }

  function cover(data, coverKey) {
    return esc((data.covers || {})[coverKey] || "");
  }

  function shellKit() {
    if (!window.ReaderShellKit) {
      throw new Error("ReaderShellKit is required before frontend-demo-draft/render.js");
    }
    return window.ReaderShellKit;
  }

  function phoneShellClasses(extra) {
    return {
      frameClass: `fd-phone ${extra || ""}`.trim(),
      statusBarClass: "fd-status-bar",
      systemIconsClass: "fd-system-icons",
      signalClass: "fd-signal",
      wifiClass: "fd-wifi",
      batteryClass: "fd-battery",
      topBarClass: "fd-top-bar",
      topActionsClass: "fd-top-actions",
      iconButtonClass: "fd-icon-button",
      iconClass: "fd-icon",
      contentClass: "fd-phone-content",
      navClass: "fd-main-nav",
      navItemClass: "fd-main-nav-item",
      navIconShellClass: "fd-main-nav-icon-shell",
      navIconClass: "fd-nav-icon",
      stateHostClass: "fd-state-host"
    };
  }

  function bookCard(data, book) {
    return `
      <article class="fd-book-card">
        <img src="${cover(data, book.coverKey)}" alt="${esc(book.title)}封面">
        <strong>${esc(book.title)}</strong>
        <span>${esc(book.author)}</span>
        <small>${esc(book.chapter)}</small>
        <i style="--progress:${esc(book.progress)}"><b></b></i>
      </article>`;
  }

  function mainTabBookshelf(data) {
    const first = data.mainTabs.books[0];
    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone"), {
      data,
      title: "书架",
      activeType: "bookshelf",
      actions: ["search", "more"],
      ariaLabel: "书架",
      contentHtml: `
        <nav class="fd-chip-row" aria-label="书架分组">
          ${["全部", "默认", "本地书", "追更"].map((item, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button">${esc(item)}</button>`).join("")}
        </nav>
        <section class="fd-continue-card">
          <div>
            <h2>继续阅读</h2>
            <strong>${esc(first.title)}</strong>
            <span>${esc(first.chapter)}</span>
            <i style="--progress:${esc(first.progress)}"><b></b></i>
          </div>
          <img src="${cover(data, first.coverKey)}" alt="${esc(first.title)}封面">
          <button type="button">阅读</button>
        </section>
        <section class="fd-section-head">
          <h2>我的书架</h2>
          <span>${icon("sort", "fd-small-icon")}${icon("settings", "fd-small-icon")}</span>
        </section>
        <section class="fd-book-grid" aria-label="书籍封面网格">
          ${data.mainTabs.books.map((book) => bookCard(data, book)).join("")}
        </section>`
    }));
  }

  function mainTabDiscover(data) {
    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone"), {
      data,
      title: "发现",
      activeType: "discover",
      actions: ["search", "refresh"],
      ariaLabel: "发现",
      contentHtml: `
        <label class="fd-search-entry">${icon("search", "fd-small-icon")}<span>搜索书名、作者或书源</span></label>
        <section class="fd-source-summary">
          <div>${icon("source-stack", "fd-medium-icon")}<strong>书源广场</strong><span>128 个可用 · 12 个更新</span></div>
          <button type="button">管理</button>
        </section>
        <section class="fd-ranking-list">
          <h2>今日推荐</h2>
          ${data.mainTabs.discovery.map((item) => `
            <article class="fd-ranking-row">
              <em>${esc(item.rank)}</em>
              <img src="${cover(data, item.coverKey)}" alt="${esc(item.title)}封面">
              <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
              ${icon("chevron", "fd-small-icon")}
            </article>
          `).join("")}
        </section>`
    }));
  }

  function libraryScreen(data) {
    const book = data.library.book;
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title: "书籍详情",
      ariaLabel: "书籍详情",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      sheetHostClass: "fd-sheet-host",
      dialogHostClass: "fd-dialog-host",
      contentHtml: `
        <section class="fd-book-hero">
          <img src="${cover(data, book.coverKey)}" alt="${esc(book.title)}封面">
          <div>
            <h2>${esc(book.title)}</h2>
            <p>${esc(book.author)}</p>
            <p>${esc(book.meta)}</p>
            <span>${esc(book.source)}</span>
          </div>
        </section>
        <div class="fd-action-row">
          <button type="button">开始阅读</button>
          <button type="button">加入书架</button>
        </div>
        <section class="fd-chapter-list">
          <h2>章节目录</h2>
          ${data.library.chapters.map((chapter) => `
            <article class="${chapter.state === "当前" ? "is-current" : ""}">
              ${icon(chapter.state === "当前" ? "bookmark" : "directory", "fd-small-icon")}
              <span>${esc(chapter.title)}</span>
              <em>${esc(chapter.state)}</em>
            </article>
          `).join("")}
        </section>`
    }));
  }

  function readerScreen(data) {
    const moduleNavHtml = data.reader.modules.map((item) => `
      <button class="fd-reader-module${item.active ? " is-active" : ""}" type="button"${item.active ? ' aria-current="page"' : ""}>
        <span>${icon(item.type, "fd-medium-icon")}</span>
        <small>${esc(item.label)}</small>
      </button>
    `).join("");

    return shellKit().renderReaderShell({
      frameClass: "fd-reader-frame",
      readingSurfaceClass: "fd-reading-surface",
      overlayClass: "fd-reader-overlay",
      bottomSheetHostClass: "fd-reader-sheet",
      moduleNavClass: "fd-reader-module-nav",
      stateHostClass: "fd-reader-state-host",
      ariaLabel: "阅读控制层",
      readingSurfaceHtml: `
          <header><span>${esc(data.reader.status.left)}</span><span>${esc(data.reader.status.time)}</span></header>
          ${data.reader.readingText.map((line) => `<p>${esc(line)}</p>`).join("")}`,
      overlayHtml: `
        <section class="fd-reader-top">
          <button type="button" aria-label="返回">${icon("back", "fd-icon")}</button>
          <span><strong>${esc(data.reader.title)}</strong><small>${esc(data.reader.sourceLine)}</small></span>
          <button type="button">${icon("source", "fd-small-icon")}换源</button>
        </section>
        <aside class="fd-brightness-rail" aria-label="亮度控制">
          ${icon("sun", "fd-small-icon")}
          <i><b></b></i>
          <span>自动</span>
        </aside>`,
      bottomSheetHtml: `
        <div class="fd-reader-grabber"></div>
        <nav class="fd-reader-actions">
          ${data.reader.quickActions.map((item) => `
            <button type="button">${icon(item.type, "fd-medium-icon")}<span>${esc(item.label)}</span></button>
          `).join("")}
        </nav>
        <section class="fd-reader-progress">
          <button type="button">上一章</button>
          <i><b></b></i>
          <button type="button">下一章</button>
        </section>`,
      moduleNavHtml
    });
  }

  function settingsScreen(data) {
    return shellKit().renderSettingsShell(Object.assign(phoneShellClasses("fd-settings-phone"), {
      data,
      title: "App 通用设置",
      ariaLabel: "App 通用设置",
      topBarClass: "fd-back-bar",
      contentClass: "fd-phone-content fd-settings-content",
      toastHostClass: "fd-toast-host",
      dialogHostClass: "fd-dialog-host",
      stateHostClass: "fd-settings-state-host",
      contentHtml: `
        <section class="fd-setting-section" data-slot="settingSection">
          <h2>基础设置</h2>
          ${data.settings.rows.map((row) => `
            <article class="fd-setting-row">
              <span>${icon(row.icon, "fd-small-icon")}</span>
              <strong>${esc(row.title)}<small>${esc(row.meta)}</small></strong>
              <em>${esc(row.value)}</em>
            </article>
          `).join("")}
        </section>`
    }));
  }

  function flowScreen(data) {
    return shellKit().renderFlowShell({
      frameClass: "fd-flow-frame",
      stepClass: "fd-flow-step",
      comparisonClass: "fd-flow-comparison",
      resultClass: "fd-flow-result",
      stateHostClass: "fd-state-host",
      ariaLabel: "换源",
      stepHtml: `
          <h2>换源</h2>
          <p>保持当前书籍、章节和阅读进度，检查候选书源后再切换。</p>
          <ol>
            <li>检测章节名</li>
            <li>比较正文片段</li>
            <li>确认切换结果</li>
          </ol>`,
      comparisonHtml: `
          ${data.flow.candidates.map((item) => `
            <article class="${item.state === "当前" ? "is-current" : ""}">
              ${icon(item.state === "当前" ? "check" : "source", "fd-small-icon")}
              <span><strong>${esc(item.source)}</strong><small>${esc(item.chapter)} · ${esc(item.speed)}</small></span>
              <em>${esc(item.state)}</em>
            </article>
          `).join("")}`,
      resultHtml: `
          <h2>切换结果</h2>
          <p>目标书源章节一致，可保留 38% 阅读进度。</p>
          <button type="button">切换到候选书源</button>`
    });
  }

  function sourceStrip(data) {
    return `
      <section class="fd-source-strip" data-slot="states">
        <h2>本地 UI 图参考层（Local UI Screenshot References）</h2>
        <div>
          ${data.screenshots.map((item) => `
            <article>
              <img src="${esc(item.src)}" alt="${esc(item.title)}">
              <strong>${esc(item.title)}</strong>
              <span>${esc(item.shell)}</span>
            </article>
          `).join("")}
        </div>
      </section>`;
  }

  function shellOverview(data) {
    return `
      <section class="fd-shell-overview" data-slot="appShell">
        <h2>页面框架总览（Page Shell Overview）</h2>
        <div>
          ${data.shells.map((shell) => `
            <article>
              <h3>${esc(shell.name)}</h3>
              <p>${esc(shell.pages)}</p>
              <code>${esc(shell.slots)}</code>
              <span>${esc(shell.status)}</span>
            </article>
          `).join("")}
        </div>
      </section>`;
  }

  function render(target, data) {
    target.innerHTML = `
      <main class="fd-demo" data-shell="ComponentLibraryShell" aria-label="前端 Demo 设计稿">
        <header class="fd-demo-header" data-slot="foundations">
          <div>
            <p>Reader Android</p>
            <h1>${esc(data.meta.title)}</h1>
            <span>${esc(data.meta.subtitle)}</span>
          </div>
          <dl>
            <div><dt>UI 图</dt><dd>${esc(data.meta.screenCount)}</dd></div>
            <div><dt>页面框架</dt><dd>${esc(data.meta.shellCount)}</dd></div>
            <div><dt>图标来源</dt><dd>${esc(data.meta.iconSource)}</dd></div>
          </dl>
        </header>
        ${shellOverview(data)}
        <section class="fd-screen-board" data-slot="basicControls">
          <h2>统一前端设计稿（Unified Frontend Screens）</h2>
          <div class="fd-screen-grid">
            <article><h3>书架（Bookshelf）</h3>${mainTabBookshelf(data)}</article>
            <article><h3>发现（Discover）</h3>${mainTabDiscover(data)}</article>
            <article><h3>阅读控制层（Reader Control Layer）</h3>${readerScreen(data)}</article>
            <article><h3>书籍详情（Book Detail）</h3>${libraryScreen(data)}</article>
            <article><h3>App 通用设置（General Settings）</h3>${settingsScreen(data)}</article>
            <article class="fd-wide-card"><h3>换源（Source Switching）</h3>${flowScreen(data)}</article>
          </div>
        </section>
        <section class="fd-component-rules" data-slot="cardsRows">
          <h2>组件化规则（Componentization Rules）</h2>
          <div>
            <article>${icon("bookshelf", "fd-medium-icon")}<strong>完全一致</strong><span>状态栏、主导航、图标按钮、搜索入口、设置行、底表、弹窗、状态宿主。</span></article>
            <article>${icon("book-open", "fd-medium-icon")}<strong>框架一致</strong><span>主标签、书架二级页、阅读器、设置页、横向流程使用各自 shell。</span></article>
            <article>${icon("palette", "fd-medium-icon")}<strong>风格分支</strong><span>BlueEditorial、ForestUtility、Reader 只在规定页面组内使用。</span></article>
            <article>${icon("check", "fd-medium-icon")}<strong>选中态稳定</strong><span>阅读控制层四按钮只改背景、图标色和文字色，不改位置。</span></article>
          </div>
        </section>
        <section class="fd-handoff-notes" data-slot="sheetsPanels">
          <h2>前端交付说明（Frontend Handoff Notes）</h2>
          <ul>
            <li>先按五个 shell 建立页面骨架，再把旧 30 页迁入对应 slots。</li>
            <li>所有图标调用 ReaderAssetIcons.renderIcon(id, className)，页面内不新增一次性 SVG。</li>
            <li>书封图片只作为内容资源；UI 控件、导航、弹层必须用可编辑 DOM/CSS 实现。</li>
            <li>正式迁移时把每个 preview/state-matrix 加回 manifest.json 做截图校验。</li>
          </ul>
        </section>
        ${sourceStrip(data)}
      </main>`;
  }

  window.ReaderFrontendDemoDraft = {
    render
  };
})(window);
