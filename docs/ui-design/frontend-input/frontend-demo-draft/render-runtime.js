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
    return `<span class="${esc(className || "fd-icon")}" data-icon-missing="${esc(name)}" aria-hidden="true"></span>`;
  }

  function chevron(className) {
    return icon("chevron", className || "fd-inline-chevron");
  }

  function chapterIsCurrent(chapter) {
    return Boolean(chapter && (chapter.current || chapter.state === "当前"));
  }

  function chapterMarkers(chapter) {
    if (!chapter) {
      return [];
    }
    if (Array.isArray(chapter.markers)) {
      return chapter.markers.filter(Boolean);
    }
    const markers = [];
    if (chapter.cached) {
      markers.push("已缓存");
    }
    if (chapter.bookmarked) {
      markers.push("书签");
    }
    return markers;
  }

  function chapterMarkerText(chapter) {
    return chapterMarkers(chapter).join(" · ");
  }

  function chapterRowIcon(chapter) {
    const markers = chapterMarkers(chapter);
    if (markers.includes("书签")) {
      return "bookmark";
    }
    if (markers.includes("已缓存")) {
      return "storage";
    }
    return "directory";
  }

  function chapterHasMarker(chapter, marker) {
    return chapterMarkers(chapter).includes(marker);
  }

  function cover(data, coverKey) {
    return esc((data.covers || {})[coverKey] || "");
  }

  function viewportClassSnapshot() {
    const visualViewport = window.visualViewport;
    const width = Math.max(
      0,
      Math.round((visualViewport && visualViewport.width) || window.innerWidth || document.documentElement.clientWidth || 0)
    );
    const height = Math.max(
      0,
      Math.round((visualViewport && visualViewport.height) || window.innerHeight || document.documentElement.clientHeight || 0)
    );
    const orientation = width > height ? "landscape" : "portrait";
    const widthClass = width < 360
      ? "compact"
      : width < 480
        ? "standard"
        : width < 600
          ? "large"
          : width < 840
            ? "expanded"
            : "tablet";
    const heightClass = height < 520
      ? "compact"
      : height < 720
        ? "short"
        : "regular";
    const viewportClass = orientation === "landscape" && height < 520
      ? "compact-landscape"
      : width >= 840
        ? "tablet-expanded"
        : width >= 600
          ? "expanded-width"
          : orientation === "portrait" && width >= 480
            ? "large-portrait"
            : orientation === "portrait" && width >= 360
              ? "standard-portrait"
              : orientation === "portrait"
                ? "compact-portrait"
                : `${widthClass}-${orientation}`;

    return {
      width,
      height,
      widthClass,
      heightClass,
      orientation,
      viewportClass
    };
  }

  function applyViewportClass(root) {
    if (!root) {
      return null;
    }
    const snapshot = viewportClassSnapshot();
    root.setAttribute("data-width-class", snapshot.widthClass);
    root.setAttribute("data-height-class", snapshot.heightClass);
    root.setAttribute("data-orientation", snapshot.orientation);
    root.setAttribute("data-viewport-class", snapshot.viewportClass);
    root.setAttribute("data-viewport-width", String(snapshot.width));
    root.setAttribute("data-viewport-height", String(snapshot.height));
    root.style.setProperty("--fd-viewport-width", `${snapshot.width}px`);
    root.style.setProperty("--fd-viewport-height", `${snapshot.height}px`);
    return snapshot;
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

  const routeContract = window.ReaderFrontendDemoDraftRouteContract || {};
  const routes = routeContract.routes || {};
  const deepRouteClosure = routeContract.deepRouteClosure || {};

  function bookCard(data, book) {
    const coverSrc = cover(data, book.coverKey);
    return `
      <article class="fd-book-card" data-book-card>
        <button class="fd-book-cover-frame" type="button" data-book-cover data-route="immersive-reading" data-book-title="${esc(book.title)}" data-book-author="${esc(book.author)}" data-book-chapter="${esc(book.chapter)}" data-cover-src="${coverSrc}" aria-label="打开 ${esc(book.title)}">
          <img src="${coverSrc}" alt="${esc(book.title)}封面">
        </button>
        <strong>${esc(book.title)}</strong>
        <span>${esc(book.author)}</span>
      </article>`;
  }

  function bookFocusLayer(data) {
    const first = data.mainTabs.books[0] || {};
    return `
      <section class="fd-book-focus-layer" data-book-focus-layer aria-hidden="true" aria-label="书籍封面操作层">
        <button class="fd-book-focus-backdrop" type="button" data-close-book-focus aria-label="关闭书籍操作层"></button>
        <section class="fd-book-focus-menu" role="dialog" aria-modal="true" aria-label="书籍操作">
          <header>
            <span class="fd-book-focus-cover" data-focus-cover aria-hidden="true" style="--focus-cover:url('${cover(data, first.coverKey)}')"></span>
            <strong data-focus-title>${esc(first.title || "长夜余火")}</strong>
            <small data-focus-meta>${esc(first.author || "爱潜水的乌贼")} · ${esc(first.chapter || "第 32 章 雨夜")}</small>
          </header>
          <div>
            <button type="button" data-route="book-batch-management">${icon("check", "fd-small-icon")}<span>多选</span></button>
            <button type="button" data-book-action="branch" data-route="group-management">${icon("people", "fd-small-icon")}<span>分支</span></button>
            <button type="button" data-route="book-detail">${icon("info", "fd-small-icon")}<span>书籍详情</span></button>
            <button class="is-danger" type="button" data-book-action="delete">${icon("trash", "fd-small-icon")}<span>删除</span></button>
          </div>
        </section>
      </section>`;
  }

  function bookshelfMoreLayer() {
    const items = [
      { icon: "check", title: "批量管理", meta: "选择多本书后移动或删除", route: "book-batch-management" },
      { icon: "people", title: "分组管理", meta: "编辑书架分组与归属", route: "group-management" },
      { icon: "book-open", title: "本地书导入", meta: "导入本地文件到书架", route: "local-import" },
      { icon: "sort", title: "排序与筛选", meta: "调整当前书架内容顺序", route: "sort-filter" }
    ];
    return `
      <section class="fd-bookshelf-more-layer" data-bookshelf-more-layer aria-hidden="true" aria-label="书架更多操作">
        <button class="fd-bookshelf-more-backdrop" type="button" data-close-bookshelf-more aria-label="关闭书架更多操作"></button>
        <section class="fd-bookshelf-more-menu" role="dialog" aria-modal="true" aria-label="书架更多操作">
          <h2>书架更多操作</h2>
          ${items.map((item) => `
            <button type="button"${item.route ? ` data-route="${esc(item.route)}"` : ` data-book-action="${esc(item.action)}"`}>
              ${icon(item.icon, "fd-small-icon")}
              <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
            </button>
          `).join("")}
        </section>
      </section>`;
  }

  function mainTabBookshelf(data, appState) {
    const first = data.mainTabs.books[0];
    const bookshelfView = appState?.bookshelfView === "list" ? "list" : "cover";
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
          <button class="fd-continue-cover-button" type="button" data-book-cover data-route="immersive-reading" data-book-title="${esc(first.title)}" data-book-author="${esc(first.author)}" data-book-chapter="${esc(first.chapter)}" data-cover-src="${cover(data, first.coverKey)}" aria-label="打开 ${esc(first.title)}">
            <img src="${cover(data, first.coverKey)}" alt="${esc(first.title)}封面">
          </button>
          <div>
            <h2>继续阅读</h2>
            <strong>${esc(first.title)}</strong>
            <span class="fd-continue-author">${esc(first.author)}</span>
          </div>
          <button class="fd-continue-action-button" type="button" data-route="immersive-reading">阅读</button>
        </section>
        <section class="fd-section-head">
          <div>
            <h2>我的书架</h2>
          </div>
          <span>
            <button class="${bookshelfView === "cover" ? "is-active" : ""}" type="button" aria-label="封面视图" data-bookshelf-view-button="cover" aria-pressed="${bookshelfView === "cover" ? "true" : "false"}">${icon("grid", "fd-small-icon")}</button>
            <button class="${bookshelfView === "list" ? "is-active" : ""}" type="button" aria-label="列表视图" data-bookshelf-view-button="list" aria-pressed="${bookshelfView === "list" ? "true" : "false"}">${icon("list", "fd-small-icon")}</button>
            <button type="button" aria-label="书架显示设置" data-route="bookshelf-search-settings" data-settings-scope="bookshelf-display">${icon("gear", "fd-small-icon")}</button>
          </span>
        </section>
        <section class="fd-book-grid ${bookshelfView === "list" ? "is-list-view" : "is-cover-view"}" data-book-grid data-bookshelf-view="${bookshelfView}" aria-label="${bookshelfView === "list" ? "书籍列表" : "书籍封面网格"}">
          ${data.mainTabs.books.map((book) => bookCard(data, book)).join("")}
        </section>`,
      stateHostHtml: `
        <p class="fd-nav-feedback">当前 Tab：书架</p>
        ${bookFocusLayer(data)}
        ${bookshelfMoreLayer()}`
    }));
  }

  function mainTabFeedbackHtml(appState) {
    const message = appState?.mainTabFeedback || "";
    return message ? `<p class="fd-nav-feedback" data-main-tab-feedback>${esc(message)}</p>` : "";
  }

  function mainTabDiscover(data, appState) {
    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone"), {
      data,
      title: "发现",
      activeType: "discover",
      actions: [],
      ariaLabel: "发现",
      contentHtml: `
        <button class="fd-search-entry" type="button" data-route="book-search">${icon("search", "fd-small-icon")}<span>搜索书名、作者或书源</span></button>
        <section class="fd-source-summary">
          <div>${icon("source-stack", "fd-medium-icon")}<strong>书源广场</strong><span>128 个可用 · 12 个更新</span></div>
          <button type="button" data-route="source-management">管理</button>
        </section>
        <section class="fd-ranking-list">
          <h2>今日推荐</h2>
          ${data.mainTabs.discovery.map((item) => `
            <article class="fd-ranking-row" role="button" tabindex="0" data-route="book-detail">
              <em>${esc(item.rank)}</em>
              <img src="${cover(data, item.coverKey)}" alt="${esc(item.title)}封面">
              <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
              ${icon("chevron", "fd-small-icon")}
            </article>
          `).join("")}
        </section>`,
      stateHostHtml: mainTabFeedbackHtml(appState)
    }));
  }

  function mainTabRss(data, appState) {
    const entries = data.mainTabs.rss || [
      { title: "长夜余火更新到第 33 章", meta: "优书网 · 2 分钟前", route: "immersive-reading" },
      { title: "书源维护公告", meta: "RSS 订阅 · 未读", route: "source-management" },
      { title: "本地导入文件已完成解析", meta: "系统通知 · 12 分钟前", route: "book-detail" }
    ];

    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone"), {
      data,
      title: "RSS",
      activeType: "rss",
      actions: [],
      ariaLabel: "RSS",
      contentHtml: `
        <button class="fd-search-entry" type="button" data-route="book-search">
          ${icon("search", "fd-small-icon")}<span>搜索订阅、书名或来源</span>
        </button>
        <section class="fd-ranking-list">
          <h2>订阅更新</h2>
          ${entries.map((item, index) => `
            <article class="fd-feed-row" role="button" tabindex="0" data-route="${esc(item.route)}">
              <em>${index + 1}</em>
              <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
              ${icon("chevron", "fd-small-icon")}
            </article>
          `).join("")}
        </section>`,
      stateHostHtml: mainTabFeedbackHtml(appState)
    }));
  }

  function mainTabSettings(data, appState) {
    const rows = [
      { icon: "settings", title: "App 通用设置", meta: "主题、网络、基础行为", route: "settings-general" },
      { icon: "bookshelf", title: "书架与搜索设置", meta: "布局、列数、搜索历史", route: "bookshelf-search-settings" },
      { icon: "shield", title: "隐私与权限", meta: "本地书、通知、剪贴板", route: "privacy-permissions" },
      { icon: "source", title: "书源管理", meta: "启用、检测、日志", route: "source-management" },
      { icon: "sync", title: "同步与备份", meta: "本地恢复、远程恢复", route: "sync-backup" },
      { icon: "info", title: "关于与反馈", meta: "版本、反馈、开源", route: "about-feedback" }
    ];

    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone"), {
      data,
      title: "设置",
      activeType: "settings",
      actions: [],
      ariaLabel: "设置首页",
      contentHtml: `
        <section class="fd-setting-section" data-slot="settingSection">
          <h2>设置</h2>
          ${rows.map((row) => `
            <article class="fd-setting-row" role="button" tabindex="0" data-route="${esc(row.route)}">
              <span>${icon(row.icon, "fd-small-icon")}</span>
              <strong>${esc(row.title)}<small>${esc(row.meta)}</small></strong>
              ${icon("chevron", "fd-small-icon")}
            </article>
          `).join("")}
        </section>`,
      stateHostHtml: mainTabFeedbackHtml(appState)
    }));
  }

  function bookSearchScreen(data, appState) {
    const phase = appState?.bookSearchPhase === "after" ? "after" : "before";
    const searchResults = [
      {
        title: "三体",
        author: "刘慈欣",
        source: "优书网",
        latest: "最新：第 35 章 尾声",
        coverKey: "threeBody",
        inShelf: true
      },
      {
        title: "三体：黑暗森林",
        author: "刘慈欣",
        source: "书仓",
        latest: "匹配：黑暗森林 · 已完结",
        coverKey: "threeBody",
        inShelf: false
      },
      {
        title: "三体：死神永生",
        author: "刘慈欣",
        source: "本地",
        latest: "最新：广播纪元",
        coverKey: "threeBody",
        inShelf: false
      },
      {
        title: "三体全集",
        author: "刘慈欣",
        source: "快读",
        latest: "匹配：合集版本 · 需确认目录",
        coverKey: "threeBody",
        inShelf: true
      },
      {
        title: "三体前传：球状闪电",
        author: "刘慈欣",
        source: "开源书仓",
        latest: "匹配：球状闪电 · 已完结",
        coverKey: "threeBody",
        inShelf: false
      },
      {
        title: "三体纪事",
        author: "读者整理",
        source: "本地书",
        latest: "匹配：资料合集 · 本地导入",
        coverKey: "threeBody",
        inShelf: true
      }
    ];
    const searchBeforeHtml = `
      <section class="fd-search-state fd-search-state-before" data-search-state="before">
        <header class="fd-search-section-head">
          <h2>搜索历史</h2>
          <button type="button">清空</button>
        </header>
        <div class="fd-search-history-list" aria-label="搜索历史">
          ${[
            ["长夜余火", "书名 · 网络"],
            ["三体", "书名 · 全部"],
            ["爱潜水的乌贼", "作者 · 网络"],
            ["本地导入", "关键词 · 本地"]
          ].map(([keyword, meta]) => `
            <button class="fd-search-history-row" type="button" data-search-submit>
              ${icon("clock", "fd-small-icon")}
              <span><strong>${esc(keyword)}</strong><small>${esc(meta)}</small></span>
              <em>填入</em>
            </button>`).join("")}
        </div>
      </section>`;
    const searchAfterHtml = `
      <section class="fd-search-results" data-search-state="after">
        <header class="fd-search-section-head">
          <h2>搜索结果</h2>
        </header>
        <p>找到 24 个结果 · 已标注书架状态</p>
        <div class="fd-search-result-list" aria-label="搜索结果列表">
          ${searchResults.map((book) => `
            <article class="fd-search-result-row" role="button" tabindex="0" data-route="book-detail">
              <img src="${cover(data, book.coverKey)}" alt="${esc(book.title)}封面">
              <span class="fd-search-result-main">
                <strong>${esc(book.title)}</strong>
                <small><b>${esc(book.author)}</b><em>${esc(book.source)}</em></small>
                <small>${esc(book.latest)}</small>
              </span>
              <span class="fd-search-result-state ${book.inShelf ? "is-in-shelf" : ""}">${book.inShelf ? "已在书架" : "未加入"}</span>
              <button type="button"${book.inShelf ? ` data-route="immersive-reading"` : ` data-add-search-shelf`}>${book.inShelf ? "阅读" : "加入书架"}</button>
            </article>
          `).join("")}
        </div>
      </section>`;
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title: "书籍搜索",
      ariaLabel: "书籍搜索",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      contentHtml: `
        <button class="fd-search-entry fd-keyboard-target" type="button" data-open-keyboard>
          ${icon("search", "fd-small-icon")}<span>${phase === "after" ? "三体" : "搜索书名、作者、关键词"}</span>
        </button>
        <nav class="fd-chip-row ${phase === "before" ? "fd-search-scope-hidden" : ""}" aria-label="搜索范围">
          ${["全部", "书名", "作者", "书源"].map((item, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button">${esc(item)}</button>`).join("")}
        </nav>
        ${phase === "after" ? searchAfterHtml : searchBeforeHtml}
        ${keyboardLayer()}`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          ${phase === "after"
            ? `<button type="button" data-search-reset>重新搜索</button><button type="button" data-route="book-detail">查看详情</button>`
            : `<button type="button" data-search-submit data-primary-search-submit>开始搜索</button><button type="button">清除历史</button>`}
        </div>`
    }));
  }

  function libraryScreen(data) {
    const book = data.library.book;
    const sourceName = String(book.source || "").split("·")[0].trim() || "当前书源";
    const intro = book.intro || "旧世界的余烬尚未冷却，新的秩序已经在废墟之上生长。主角沿着被遗忘的线索追寻真相，也在一次次选择里确认自己想守住的东西。";
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title: "书籍详情",
      ariaLabel: "书籍详情",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      sheetHostClass: "fd-sheet-host",
      dialogHostClass: "fd-dialog-host",
      contentHtml: `
        <section class="fd-book-hero fd-book-detail-hero">
          <img src="${cover(data, book.coverKey)}" alt="${esc(book.title)}封面">
          <div class="fd-book-identity">
            <h2>${esc(book.title)}</h2>
            <p class="fd-book-author">${esc(book.author)}</p>
            <dl class="fd-book-facts">
              <div>
                <dt>最新</dt>
                <dd>${esc(book.latest)}</dd>
              </div>
            </dl>
            <div class="fd-book-inline-source-row">
              <span>书源：${esc(sourceName)}</span>
              <button class="fd-book-inline-source-button" type="button" data-open-sheet>更换书源</button>
            </div>
          </div>
        </section>
        <section class="fd-book-summary-card">
          <h2>简介</h2>
          <p>${esc(intro)}</p>
        </section>
        <section class="fd-chapter-list fd-book-chapter-preview">
          <header>
            <h2>章节信息</h2>
            <button class="fd-inline-route" type="button" data-route="book-directory">${icon("directory", "fd-small-icon")}完整目录</button>
          </header>
          ${data.library.chapters.map((chapter) => `
            <article class="${chapterIsCurrent(chapter) ? "is-current" : ""}" role="button" tabindex="0" data-route="immersive-reading">
              <span>${esc(chapter.title)}</span>
              <span class="fd-chapter-marker-slots" aria-label="章节标识">
                <em class="is-download-slot ${chapterMarkers(chapter).includes("已缓存") ? "is-active" : ""}" title="${chapterMarkers(chapter).includes("已缓存") ? "已下载" : "未下载"}">${icon(chapterMarkers(chapter).includes("已缓存") ? "check" : "download", "fd-small-icon")}</em>
                <em class="is-bookmark-slot ${chapterMarkers(chapter).includes("书签") ? "is-active" : ""}" title="书签">${icon("bookmark", "fd-small-icon")}</em>
              </span>
            </article>
          `).join("")}
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button" data-route="immersive-reading">继续阅读</button>
          <button class="is-danger" type="button" data-open-dialog>移除书架</button>
        </div>`,
      sheetHtml: `
        <section class="fd-demo-sheet" aria-hidden="true" data-demo-sheet>
          <div class="fd-sheet-grabber"></div>
          <h2>更换书源</h2>
          <button type="button">优书网</button>
          <button type="button">书仓搜索</button>
          <button type="button">本地缓存</button>
          <button type="button" data-close-sheet>关闭</button>
        </section>`,
      dialogHtml: `
        <section class="fd-demo-dialog" aria-hidden="true" data-demo-dialog>
          <h2>确认删除？</h2>
          <p>只从书架移除，不删除本地文件和阅读记录。</p>
          <div>
            <button type="button" data-close-dialog>取消</button>
            <button type="button" data-close-dialog>删除</button>
          </div>
        </section>`
    }));
  }

  function bookshelfEmptyScreen(data) {
    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone"), {
      data,
      title: "书架",
      activeType: "bookshelf",
      actions: [],
      ariaLabel: "书架空状态",
      contentHtml: `
        <section class="fd-empty-state" data-slot="stateHost">
          ${icon("bookshelf", "fd-empty-icon")}
          <h2>书架还是空的</h2>
          <p>空状态只替换内容区，不替换 MainTabShell、顶部栏或底部四栏导航。</p>
          <div>
            <button type="button" data-route="book-search">搜索书籍</button>
            <button type="button" data-route="local-import">导入本地书</button>
            <button type="button" data-route="discover">去发现</button>
          </div>
        </section>`
    }));
  }

  function bookDirectoryScreen(data, appState) {
    const tocMode = appState?.readerTocMode === "bookmark" ? "bookmark" : "directory";
    const book = data.library.book;
    const chapters = data.library.chapters.concat([
      { title: "第 34 章 旧地图", markers: ["已缓存"] },
      { title: "第 35 章 夜行", markers: [] },
      { title: "第 36 章 灯塔之后", markers: ["书签"] }
    ]);
    const visibleChapters = tocMode === "bookmark" ? chapters.filter((chapter) => chapterHasMarker(chapter, "书签")) : chapters;
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title: "书籍目录",
      ariaLabel: "书籍目录",
      topBarClass: "fd-back-bar",
      contentHtml: `
        <section class="fd-chapter-list fd-directory-full-list">
          <header class="fd-directory-full-head">
            <span>
              <strong>${esc(book.title)}</strong>
              <small>${esc(book.author)} · 共 ${esc(chapters.length)} 章</small>
            </span>
          </header>
          <nav class="fd-directory-toc-switch-row" aria-label="目录书签切换">
            <button class="${tocMode === "directory" ? "is-active" : ""}" type="button" data-reader-toc-mode="directory">目录</button>
            <button class="${tocMode === "bookmark" ? "is-active" : ""}" type="button" data-reader-toc-mode="bookmark">书签</button>
          </nav>
          <div class="fd-directory-full-rows">
            ${visibleChapters.map((chapter) => `
            <article class="${chapterIsCurrent(chapter) ? "is-current" : ""}" role="button" tabindex="0" data-route="immersive-reading">
              <span>${esc(chapter.title)}</span>
              <span class="fd-chapter-marker-slots" aria-label="章节标识">
                <em class="is-download-slot ${chapterHasMarker(chapter, "已缓存") ? "is-active" : ""}" title="${chapterHasMarker(chapter, "已缓存") ? "已下载" : "未下载"}">${icon(chapterHasMarker(chapter, "已缓存") ? "check" : "download", "fd-small-icon")}</em>
                <em class="is-bookmark-slot ${chapterHasMarker(chapter, "书签") ? "is-active" : ""}" title="书签">${icon("bookmark", "fd-small-icon")}</em>
              </span>
            </article>
            `).join("")}
          </div>
        </section>`
    }));
  }

  function sortFilterScreen(data) {
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title: "排序与筛选",
      ariaLabel: "排序与筛选",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      contentHtml: `
        <section class="fd-filter-panel">
          <h2>排序</h2>
          <nav class="fd-chip-row" aria-label="排序方式">
            ${["最近更新", "阅读进度", "书名", "作者"].map((item, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button">${esc(item)}</button>`).join("")}
          </nav>
        </section>
        <section class="fd-filter-panel">
          <h2>筛选</h2>
          <nav class="fd-chip-row fd-chip-wrap" aria-label="筛选范围">
            ${["全部", "追更", "本地书", "未读", "已完结", "更新失败"].map((item, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button">${esc(item)}</button>`).join("")}
          </nav>
          <p>应用后回写书架的分组、排序和筛选上下文，列表末项仍需滚到主导航上方。</p>
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button" data-route-back>应用</button>
          <button type="button" data-route-back>重置</button>
        </div>`
    }));
  }

  function bookBatchManagementScreen(data) {
    const books = data.mainTabs.books.slice(0, 6).map((book, index) => Object.assign({}, book, {
      selected: index < 3,
      group: index % 3 === 0 ? "追更" : index % 3 === 1 ? "默认" : "本地书"
    }));
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title: "批量管理",
      ariaLabel: "书籍批量管理",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      contentHtml: `
        <section class="fd-batch-summary" aria-label="批量选择状态">
          <strong>已选 3 本</strong>
          <span>长按书籍或从更多菜单进入，选择后统一移动分组、删除或取消选择。</span>
          <button type="button">全选</button>
        </section>
        <section class="fd-management-list is-book-batch">
          <h2>书架书籍</h2>
          ${books.map((book) => `
            <article class="${book.selected ? "is-selected" : ""}">
              <button class="fd-book-select-toggle" type="button" aria-pressed="${book.selected ? "true" : "false"}">${book.selected ? icon("check", "fd-small-icon") : ""}</button>
              <img src="${cover(data, book.coverKey)}" alt="${esc(book.title)}封面">
              <span><strong>${esc(book.title)}</strong><small>${esc(book.author)} · ${esc(book.chapter)}</small></span>
              <em>${esc(book.group)}</em>
            </article>
          `).join("")}
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button" data-route="group-management">移动分组</button>
          <button class="is-danger" type="button">删除所选</button>
        </div>`
    }));
  }

  function groupManagementScreen(data) {
    const groups = [
      { name: "默认分组", meta: "8 本 · 当前分组", action: "管理" },
      { name: "追更", meta: "5 本 · 置顶显示", action: "管理" },
      { name: "本地书", meta: "2 本 · 导入书籍", action: "管理" },
      { name: "资料", meta: "3 本 · 可重命名", action: "管理" }
    ];
    const assignments = data.mainTabs.books.slice(0, 4).map((book, index) => ({
      title: book.title,
      meta: `${book.author} · 当前分组`,
      group: groups[index % groups.length].name
    }));
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title: "分组管理",
      ariaLabel: "分组管理",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      contentHtml: `
        <section class="fd-management-list is-group-flow">
          <h2>分组列表</h2>
          ${groups.map((group, index) => `
            <article>
              ${icon("drag", "fd-small-icon")}
              <span><strong>${esc(group.name)}</strong><small>${esc(group.meta)}</small></span>
              <button type="button">${esc(group.action)}</button>
              ${index > 0 ? `<button class="is-plain" type="button">${icon("trash", "fd-small-icon")}</button>` : ""}
            </article>
          `).join("")}
        </section>
        <section class="fd-management-list is-assignment-flow">
          <h2>书籍归属</h2>
          ${assignments.map((item) => `
            <article>
              ${icon("book-open", "fd-small-icon")}
              <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
              <em>${esc(item.group)}</em>
            </article>
          `).join("")}
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button">新建分组</button>
          <button type="button" data-route-back>完成</button>
        </div>`
    }));
  }

  function localImportScreen(data) {
    const imports = [
      { title: "雨夜.epub", meta: "作者已识别 · 加入默认分组", state: "可导入", tone: "good" },
      { title: "旧书扫描.txt", meta: "编码 UTF-8 · 章节识别中", state: "72%", tone: "warn" },
      { title: "缺失章节.mobi", meta: "格式不支持 · 可移除后重选", state: "失败", tone: "danger" }
    ];
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title: "本地书导入",
      ariaLabel: "本地书导入",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      contentHtml: `
        <section class="fd-import-card is-import-entry">
          ${icon("folder", "fd-medium-icon")}
          <span><strong>选择本地书文件</strong><small>从系统文件选择器返回后，在本页完成识别、分组和导入确认。</small></span>
          <button type="button">选择</button>
        </section>
        <section class="fd-management-list is-import-options">
          <h2>导入设置</h2>
          <article>${icon("folder", "fd-small-icon")}<span><strong>导入分组</strong><small>默认分组</small></span><button type="button">更改</button></article>
          <article>${icon("refresh", "fd-small-icon")}<span><strong>重复书籍</strong><small>保留原书，仅导入新文件</small></span><button type="button">更改</button></article>
        </section>
        <section class="fd-management-list is-import-results">
          <h2>待导入文件</h2>
          ${imports.map((item) => `
            <article class="is-${esc(item.tone)}">
              ${icon(item.tone === "danger" ? "warning" : "book-open", "fd-small-icon")}
              <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
              <em>${esc(item.state)}</em>
            </article>
          `).join("")}
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button">继续选择</button>
          <button type="button" data-route-back>完成导入</button>
        </div>`
    }));
  }

  function keyboardLayer() {
    return `
      <section class="fd-demo-keyboard" aria-hidden="true" data-keyboard-host>
        <div class="fd-keyboard-panel">
          <label>
            <span>搜索书籍</span>
            <input type="text" value="三体" data-keyboard-input aria-label="搜索书籍">
          </label>
          <button type="button" data-close-keyboard>完成</button>
          <div class="fd-keyboard-keys" aria-hidden="true">
          ${["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "A", "S", "D", "F", "G", "H", "J", "K", "L"].map((key) => `<i>${key}</i>`).join("")}
          </div>
        </div>
      </section>`;
  }

  function pct(value) {
    const text = String(value == null ? "0" : value);
    const numeric = Number(text.replace("%", ""));
    return `${Math.max(0, Math.min(100, Number.isFinite(numeric) ? numeric : 0))}%`;
  }

  function numericPercent(value, fallback) {
    const numeric = Number(String(value == null ? "" : value).replace("%", ""));
    if (!Number.isFinite(numeric)) {
      return fallback;
    }
    return Math.max(0, Math.min(100, numeric));
  }

  const readerModuleRoutes = {
    directory: "toc-bookmarks",
    tts: "tts",
    appearance: "reader-appearance",
    settings: "reader-settings"
  };

  const readerFullRoutes = {
    directory: "reader-full-directory",
    tts: "reader-full-tts",
    appearance: "reader-full-appearance",
    settings: "reader-full-settings"
  };

  const readerFullTypeByRoute = {
    "reader-full-directory": "directory",
    "reader-full-tts": "tts",
    "reader-full-appearance": "appearance",
    "reader-full-settings": "settings"
  };

  const readerPromotedRoutes = {
    directory: "book-directory"
  };

  const readerStateByRoute = {
    "immersive-reading": { mode: "immersive" },
    reader: { mode: "control" },
    "toc-bookmarks": { mode: "module", module: "directory" },
    tts: { mode: "module", module: "tts" },
    "reader-appearance": { mode: "module", module: "appearance" },
    "reader-settings": { mode: "module", module: "settings" },
    "content-search": { mode: "quick", quick: "search" },
    "auto-page": { mode: "quick", quick: "auto-page" },
    "content-replacement": { mode: "quick", quick: "replace" }
  };

  const readerQuickActionIconMap = {
    search: "reader-content-search",
    "auto-page": "reader-auto-page",
    replace: "reader-content-replace"
  };

  function readerRouteState(route) {
    return Object.assign({ route }, readerStateByRoute[route] || readerStateByRoute.reader);
  }

  function isReaderStateRoute(route) {
    return Boolean(readerStateByRoute[route] || readerFullTypeByRoute[route]);
  }

  function readerFullRouteForState(state) {
    if (state?.mode === "module" && readerFullRoutes[state.module]) {
      return readerFullRoutes[state.module];
    }
    return readerFullRoutes.settings;
  }

  function initialRouteStackFor(route) {
    if (["bookshelf", "discover", "rss", "settings"].includes(route)) {
      return [route];
    }
    if (routes[route]?.shell === "SettingsShell") {
      return ["settings", route];
    }
    return ["bookshelf", route];
  }

  function shouldLoadReaderTransition(previousRoute, targetRoute) {
    if (!isReaderStateRoute(previousRoute) || !isReaderStateRoute(targetRoute)) {
      return false;
    }
    if (previousRoute === targetRoute) {
      return false;
    }
    return targetRoute !== "reader" && targetRoute !== "immersive-reading";
  }

  function readerChapterTitle(data) {
    return data.reader.chapterTitle || "雨夜";
  }

  function readerChapterMeta(data) {
    return data.reader.chapterMeta || "第 32 章";
  }

  function readerChapters(data) {
    const chapters = data.library && Array.isArray(data.library.chapters) ? data.library.chapters : [];
    return chapters.length > 0
      ? chapters
      : [
          { title: "第 31 章 归途", markers: ["已缓存"] },
          { title: "第 32 章 雨夜", current: true, markers: ["书签"] },
          { title: "第 33 章 灯塔", markers: [] }
        ];
  }

  function initialReaderChapterIndex(data) {
    const chapters = readerChapters(data);
    const current = chapters.findIndex((chapter) => chapterIsCurrent(chapter));
    return current >= 0 ? current : 0;
  }

  function currentReaderChapter(data, appState) {
    const chapters = readerChapters(data);
    const maxIndex = Math.max(0, chapters.length - 1);
    const rawIndex = Number.isFinite(Number(appState?.readerChapterIndex))
      ? Number(appState.readerChapterIndex)
      : initialReaderChapterIndex(data);
    const index = Math.max(0, Math.min(maxIndex, rawIndex));
    return {
      index,
      count: chapters.length,
      chapter: chapters[index] || chapters[0] || { title: readerChapterMeta(data), current: true, markers: [] }
    };
  }

  function readerChapterProgressValue(data, appState) {
    const config = readerChapterProgressConfig(data);
    const raw = Number.isFinite(Number(appState?.readerChapterProgress))
      ? Number(appState.readerChapterProgress)
      : config.defaultValue;
    return Math.max(config.min, Math.min(config.max, Number.isFinite(raw) ? raw : config.defaultValue));
  }

  function readerChapterProgressConfig(data) {
    const progress = data.reader?.chapterProgress || {};
    const min = Number.isFinite(Number(progress.min)) ? Number(progress.min) : 0;
    const max = Number.isFinite(Number(progress.max)) ? Number(progress.max) : 100;
    const normalizedMin = Math.max(0, Math.min(100, min));
    const normalizedMax = Math.max(normalizedMin, Math.min(100, max));
    const rawValue = Number.parseFloat(String(progress.progress || data.reader?.bottomReadout?.progress || "38%").replace("%", ""));
    return {
      min: normalizedMin,
      max: normalizedMax,
      step: Number.isFinite(Number(progress.step)) ? Number(progress.step) : 1,
      defaultValue: Math.max(normalizedMin, Math.min(normalizedMax, Number.isFinite(rawValue) ? rawValue : normalizedMin))
    };
  }

  function readerChapterNumber(chapterTitle, fallback) {
    const match = String(chapterTitle || "").match(/第\s*(\d+)\s*章/);
    const parsed = match ? Number.parseInt(match[1], 10) : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function readerTotalChapterCount(data, fallback) {
    const match = String(data.reader?.bottomReadout?.chapter || "").match(/\/\s*(\d+)\s*章/);
    const parsed = match ? Number.parseInt(match[1], 10) : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function readerBookProgressLabel(data, appState) {
    const value = readerChapterProgressValue(data, appState);
    return `书籍进度 ${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}%`;
  }

  function normalizeReaderTypography(data) {
    const typography = (data.reader && data.reader.typography) || {};
    return {
      fontSize: Number.isFinite(Number(typography.fontSize)) ? Number(typography.fontSize) : 18,
      lineHeight: Number.isFinite(Number(typography.lineHeight)) ? Number(typography.lineHeight) : 1.96,
      paragraphGap: Number.isFinite(Number(typography.paragraphGap)) ? Number(typography.paragraphGap) : 16,
      letterSpacing: Number.isFinite(Number(typography.letterSpacing)) ? Number(typography.letterSpacing) : 0,
      fontFamily: typography.fontFamily || readerDefaultFontValue(data)
    };
  }

  function readerTypographyConfig(data) {
    const config = data.reader?.typographyConfig || {};
    const normalizeConfig = (item) => ({
      min: Number.isFinite(Number(item?.min)) ? Number(item.min) : 0,
      max: Number.isFinite(Number(item?.max)) ? Number(item.max) : 100,
      step: Number.isFinite(Number(item?.step)) ? Number(item.step) : 1,
      precision: Number.isFinite(Number(item?.precision)) ? Number(item.precision) : 0
    });
    return {
      fontSize: normalizeConfig(config.fontSize),
      lineHeight: normalizeConfig(config.lineHeight),
      paragraphGap: normalizeConfig(config.paragraphGap),
      letterSpacing: normalizeConfig(config.letterSpacing)
    };
  }

  function readerThemeOptions(data) {
    const options = data.reader?.themeOptions;
    return Array.isArray(options) && options.length > 0
      ? options
      : [{ value: "paper", label: "纸色", swatch: "#fff7ec", paperStart: "#fff9f0", paperEnd: "#f7ead9", ink: "#2b241d" }];
  }

  function readerFontOptions(data) {
    const options = data.reader?.fontOptions;
    return Array.isArray(options) && options.length > 0
      ? options
      : [{ label: "宋体", value: "serif", fontStack: "var(--fd-serif)" }];
  }

  function readerDefaultThemeValue(data) {
    const options = readerThemeOptions(data);
    return data.reader?.themeDefault || options[0].value;
  }

  function readerDefaultFontValue(data) {
    const options = readerFontOptions(data);
    return data.reader?.typography?.fontFamily || options[0].value;
  }

  function readerFontFamilyValue(data, fontFamily) {
    const options = readerFontOptions(data);
    const selected = options.find((item) => item.value === fontFamily) || options[0];
    return selected.fontStack || "var(--fd-serif)";
  }

  function readerTypographyStyle(data, typography) {
    const safe = typography || normalizeReaderTypography(data);
    return [
      `--reader-font-size:${esc(safe.fontSize)}px`,
      `--reader-line-height:${esc(safe.lineHeight)}`,
      `--reader-paragraph-gap:${esc(safe.paragraphGap)}px`,
      `--reader-letter-spacing:${esc(safe.letterSpacing)}px`,
      `--reader-font-family:${readerFontFamilyValue(data, safe.fontFamily)}`
    ].join(";");
  }

  function currentReaderTheme(data, appState) {
    const options = readerThemeOptions(data);
    const value = appState?.readerTheme || readerDefaultThemeValue(data);
    return options.find((item) => item.value === value) || options[0];
  }

  function readerQuickThemeOptions(data) {
    const options = readerThemeOptions(data);
    const dayThemes = options.filter((item) => item.scheme === "day").slice(0, 2);
    const nightThemes = dayThemes
      .map((item) => options.find((option) => option.value === item.pair))
      .filter(Boolean);
    const pairedThemes = dayThemes.concat(nightThemes);
    return pairedThemes.length === 4 ? pairedThemes : options.slice(0, 4);
  }

  function readerThemeStyle(data, appState) {
    const theme = currentReaderTheme(data, appState);
    return [
      `--reader-paper-start:${esc(theme.paperStart)}`,
      `--reader-paper-end:${esc(theme.paperEnd)}`,
      `--reader-ink:${esc(theme.ink)}`
    ].join(";");
  }

  function readerBrightnessConfig(data) {
    const brightness = data.reader?.brightness || {};
    const min = Number.isFinite(Number(brightness.min)) ? Number(brightness.min) : 0;
    const max = Number.isFinite(Number(brightness.max)) ? Number(brightness.max) : 100;
    const normalizedMin = Math.max(0, Math.min(100, min));
    const normalizedMax = Math.max(normalizedMin, Math.min(100, max));
    return {
      min: normalizedMin,
      max: normalizedMax,
      step: Number.isFinite(Number(brightness.step)) ? Number(brightness.step) : 1,
      defaultValue: Math.max(normalizedMin, Math.min(normalizedMax, numericPercent(brightness.value, normalizedMax)))
    };
  }

  function readerBrightnessValue(data, appState) {
    const config = readerBrightnessConfig(data);
    const current = Number(appState?.readerBrightness);
    return Math.round(Math.max(config.min, Math.min(config.max, Number.isFinite(current) ? current : config.defaultValue)));
  }

  function readerBrightnessStyle(data, appState) {
    const config = readerBrightnessConfig(data);
    const value = readerBrightnessValue(data, appState);
    const dim = Math.max(0, Math.min(0.32, (config.max - value) / 280));
    return `--reader-brightness:${esc(value)}%;--reader-brightness-dim:${esc(dim.toFixed(3))}`;
  }

  function readerTtsConfig(data) {
    const config = data.reader?.tts || {};
    const defaults = config.defaults || {};
    return {
      sentenceMin: Number.isFinite(Number(config.sentenceMin)) ? Number(config.sentenceMin) : Number(defaults.sentenceIndex) || 0,
      sentenceMax: Number.isFinite(Number(config.sentenceMax)) ? Number(config.sentenceMax) : Number(defaults.sentenceIndex) || 0,
      defaults,
      options: config.options || {}
    };
  }

  function readerControlSettingsConfig(data) {
    const config = data.reader?.controlSettings || {};
    return {
      defaults: config.defaults || {},
      options: config.options || {}
    };
  }

  function readerSettingDropdownHtml(key, label, settings, settingDefaults, options, appState) {
    const values = options[key] || [];
    const current = settings[key] || settingDefaults[key] || values[0] || "";
    if (!values.length || appState?.readerSettingsExpandedOption !== key) return "";
    return `
      <div class="fd-reader-setting-dropdown" data-reader-setting-dropdown="${esc(key)}" role="listbox" aria-label="${esc(label)}">
        ${values.map((value) => `
          <button class="${value === current ? "is-selected" : ""}" type="button" role="option" aria-selected="${value === current ? "true" : "false"}" data-reader-setting-option="${esc(key)}" data-reader-setting-value="${esc(value)}">
            <span>${esc(value)}</span>
            ${value === current ? icon("checkmark", "fd-small-icon") : ""}
          </button>
        `).join("")}
      </div>`;
  }

  function readerTtsDropdownHtml(key, label, tts, ttsDefaults, options, appState) {
    const values = options[key] || [];
    const current = tts[key] || ttsDefaults[key] || values[0] || "";
    if (!values.length || appState?.readerTtsExpandedOption !== key) return "";
    return `
      <div class="fd-reader-tts-dropdown" data-reader-tts-dropdown="${esc(key)}" role="listbox" aria-label="${esc(label)}">
        ${values.map((value) => `
          <button class="${value === current ? "is-selected" : ""}" type="button" role="option" aria-selected="${value === current ? "true" : "false"}" data-reader-tts-option="${esc(key)}" data-reader-tts-value="${esc(value)}">
            <span>${esc(value)}</span>
            ${value === current ? icon("checkmark", "fd-small-icon") : ""}
          </button>
        `).join("")}
      </div>`;
  }

  function typographyNumber(value, fractionDigits) {
    return Number(value).toFixed(fractionDigits).replace(/\.?0+$/, "");
  }

  function typographyPanelRows(data, typography) {
    return `
      <div class="fd-reader-step-row" data-typography-row="font-size">
        <strong>字号</strong>
        <span>
          <button type="button" data-reader-typography-action="font-size-decrease">-</button>
          <em data-reader-typography-value="font-size">${esc(typographyNumber(typography.fontSize, 0))}</em>
          <button type="button" data-reader-typography-action="font-size-increase">+</button>
        </span>
      </div>
      <div class="fd-reader-step-row" data-typography-row="line-height">
        <strong>行距</strong>
        <span>
          <button type="button" data-reader-typography-action="line-height-decrease">-</button>
          <em data-reader-typography-value="line-height">${esc(typographyNumber(typography.lineHeight, 2))}</em>
          <button type="button" data-reader-typography-action="line-height-increase">+</button>
        </span>
      </div>
      <div class="fd-reader-step-row" data-typography-row="paragraph-gap">
        <strong>段距</strong>
        <span>
          <button type="button" data-reader-typography-action="paragraph-gap-decrease">-</button>
          <em data-reader-typography-value="paragraph-gap">${esc(typographyNumber(typography.paragraphGap, 0))}</em>
          <button type="button" data-reader-typography-action="paragraph-gap-increase">+</button>
        </span>
      </div>
      <div class="fd-reader-step-row" data-typography-row="letter-spacing">
        <strong>字距</strong>
        <span>
          <button type="button" data-reader-typography-action="letter-spacing-decrease">-</button>
          <em data-reader-typography-value="letter-spacing">${esc(typographyNumber(typography.letterSpacing, 1))}</em>
          <button type="button" data-reader-typography-action="letter-spacing-increase">+</button>
        </span>
      </div>
      <div class="fd-reader-font-row" aria-label="字体">
        ${readerFontOptions(data).map((item) => `
          <button class="${typography.fontFamily === item.value ? "is-active" : ""}" type="button" data-reader-typography-set="fontFamily" data-reader-typography-value="${esc(item.value)}">${esc(item.label)}</button>
        `).join("")}
      </div>`;
  }

  function readerTextBlocks(data) {
    const directText = data.reader && Array.isArray(data.reader.readingText) ? data.reader.readingText : [];
    if (directText.length > 0) {
      return directText.map((item) => String(item || "")).filter(Boolean);
    }
    const legacyPages = data.reader && Array.isArray(data.reader.readingPages) ? data.reader.readingPages : [];
    return legacyPages
      .flatMap((page) => Array.isArray(page.paragraphs) ? page.paragraphs : [])
      .map((item) => String(item || ""))
      .filter(Boolean);
  }

  function fallbackReaderPages(data) {
    return [{
      progress: (data.reader && data.reader.bottomReadout && data.reader.bottomReadout.progress) || "38%",
      paragraphs: readerTextBlocks(data)
    }];
  }

  function readerPages(data, appState) {
    const runtimePages = appState && Array.isArray(appState.readerPages) ? appState.readerPages : [];
    return runtimePages.length > 0 ? runtimePages : fallbackReaderPages(data);
  }

  function currentReaderPage(data, appState) {
    const pages = readerPages(data, appState);
    const maxIndex = Math.max(0, pages.length - 1);
    const rawIndex = Number(appState?.readerPageIndex || 0);
    const index = Math.max(0, Math.min(maxIndex, Number.isFinite(rawIndex) ? rawIndex : 0));
    return {
      index,
      count: pages.length,
      page: pages[index] || pages[0] || { progress: "38%", paragraphs: [] }
    };
  }

  function readerPageReadout(data, appState) {
    const pageState = currentReaderPage(data, appState);
    const chapterProgress = `${readerChapterProgressValue(data, appState)}%`;
    const progress = appState && Number.isFinite(Number(appState.readerChapterProgress))
      ? chapterProgress
      : pageState.page.progress || chapterProgress;
    return {
      pageNumber: pageState.index + 1,
      pageCount: pageState.count,
      progress,
      pageLabel: `第 ${pageState.index + 1} / ${pageState.count} 页`,
      progressLabel: `${progress} · 第 ${pageState.index + 1} / ${pageState.count} 页`
    };
  }

  function sharedReaderSurface(data, dismissRoute, appState, options) {
    const typography = appState?.readerTypography || normalizeReaderTypography(data);
    const pageState = currentReaderPage(data, appState);
    const disableTurnAnimation = Boolean(options && options.disableTurnAnimation);
    const turnDirection = !disableTurnAnimation && appState?.readerTurnDirection ? ` fd-reader-page-turn-${esc(appState.readerTurnDirection)}` : "";
    const paragraphs = pageState.page.paragraphs.length > 0 ? pageState.page.paragraphs : readerTextBlocks(data);
    const chapterState = currentReaderChapter(data, appState);
    const chapterTitle = chapterState.chapter.title || `${readerChapterMeta(data)} ${readerChapterTitle(data)}`;
    const chapterTitleHtml = pageState.index === 0 ? `<h1>${esc(chapterTitle.replace(/^第\s*\d+\s*章\s*/, ""))}</h1>` : "";
    const paginationMode = appState?.readerPages?.length ? "runtime" : "fallback";
    return `
      <div class="fd-ir-background-layer" data-dev-region="ReadingBackground" aria-hidden="true" style="${readerThemeStyle(data, appState)}"></div>
      <article class="fd-ir-reading-layer${turnDirection}" aria-label="正文排版层" data-dev-region="ReadingTextLayer" data-reader-pagination="${esc(paginationMode)}" data-reader-surface-signature="${esc(chapterTitle)}" data-reader-page-index="${esc(pageState.index)}" data-reader-page-count="${esc(pageState.count)}" style="${readerTypographyStyle(data, typography)};${readerThemeStyle(data, appState)}">
        ${chapterTitleHtml}
        ${paragraphs.map((line) => `<p>${esc(line)}</p>`).join("")}
      </article>
      <div class="fd-reader-brightness-dim" data-reader-brightness-dim aria-hidden="true" style="${readerBrightnessStyle(data, appState)}"></div>
      ${dismissRoute ? `<button class="fd-reader-dismiss-zone" type="button" data-dev-region="ControlDismissZone" data-reader-dismiss="${esc(dismissRoute)}" aria-label="隐藏阅读控制层"></button>` : ""}`;
  }

  function readerInfoOverlay(data, appState) {
    const readout = data.reader.bottomReadout || {};
    const pageReadout = readerPageReadout(data, appState);
    const chapterState = currentReaderChapter(data, appState);
    const statusCapsule = readerImmersiveStatusCapsule(appState);
    return `
      <section class="fd-ir-info-layer" data-dev-region="ImmersiveInfoLayer" aria-label="阅读信息层">
        <span class="fd-ir-top-left">${esc(data.reader.title)} · ${esc(chapterState.chapter.title || readerChapterMeta(data))}</span>
        <span class="fd-ir-top-right">${esc(data.reader.status.time)}</span>
        <span class="fd-ir-bottom-left" data-dev-region="ImmersiveFooterProgress">${esc(pageReadout.progress || readout.progress || "38%")}</span>
        <span class="fd-ir-bottom-right" data-dev-region="ImmersiveFooterStatus">
          <span class="fd-ir-page-label" data-reader-page-readout>${esc(pageReadout.pageLabel)}</span>
          ${statusCapsule}
        </span>
      </section>`;
  }

  function readerTextSelectionLayer(appState) {
    if (!appState?.readerTextSelectionOpen) {
      return "";
    }
    const selectedText = appState.readerSelectedText || "雨，下了一整夜。";
    return `
      <section class="fd-reader-selection-layer" data-reader-selection-layer data-dev-region="TextSelectionLayer" aria-label="文本选择层">
        <button class="fd-reader-selection-backdrop" type="button" data-reader-selection-close aria-label="关闭文本选择"></button>
        <div class="fd-reader-selection-toolbar" role="toolbar" aria-label="文本选择操作">
          <button type="button" data-reader-selection-action="copy">复制</button>
          <button type="button" data-reader-selection-action="highlight">划线</button>
          <button type="button" data-reader-selection-action="note">笔记</button>
          <button type="button" data-reader-selection-action="search">搜索</button>
        </div>
        <div class="fd-reader-selection-range" aria-label="已选择文本：${esc(selectedText)}">
          <i class="fd-reader-selection-line is-first"></i>
          <i class="fd-reader-selection-line is-second"></i>
          <b class="fd-reader-selection-handle is-start" aria-hidden="true"></b>
          <b class="fd-reader-selection-handle is-end" aria-hidden="true"></b>
        </div>
      </section>`;
  }

  function readerImmersiveStatusCapsule(appState) {
    const ttsSession = Boolean(appState?.readerTtsSession || appState?.readerTts?.playing);
    const ttsPlaying = Boolean(appState?.readerTts?.playing);
    const autoSession = Boolean(appState?.readerAutoPageSession || appState?.readerSettings?.autoPage);
    const autoPlaying = Boolean(appState?.readerSettings?.autoPage);
    if (!ttsSession && !autoSession) {
      return "";
    }
    const activeType = ttsSession ? "tts" : "autoPage";
    const isTts = activeType === "tts";
    const label = isTts ? "朗读" : "自动翻页";
    const isPlaying = isTts ? ttsPlaying : autoPlaying;
    const autoCountdown = Math.max(1, Math.min(99, Number(appState?.readerAutoPageCountdown || 8)));
    const leading = isTts
      ? icon("tts", "fd-small-icon")
      : `<span class="fd-ir-countdown-dot" aria-label="自动翻页倒计时 ${esc(autoCountdown)} 秒">${esc(autoCountdown)}</span>`;
    const control = isTts
      ? `<button type="button" data-reader-tts-action="toggle" aria-label="${ttsPlaying ? "暂停朗读" : "继续朗读"}">${icon(ttsPlaying ? "pause" : "play", "fd-small-icon")}</button>`
      : `<button type="button" data-reader-setting-toggle="autoPage" aria-label="${autoPlaying ? "暂停自动翻页" : "继续自动翻页"}">${icon(autoPlaying ? "pause" : "play", "fd-small-icon")}</button>`;
    return `
      <span class="fd-ir-status-capsule" data-reader-immersive-status data-reader-immersive-status-type="${esc(activeType)}" data-reader-immersive-status-playing="${isPlaying ? "true" : "false"}">
        ${leading}
        <b>${esc(label)}</b>
        <span class="fd-ir-status-controls">${control}</span>
      </span>`;
  }

  function readerTapZones(data, appState) {
    const pageState = currentReaderPage(data, appState);
    return `
      <section class="fd-ir-tap-zone-layer" data-dev-region="ImmersiveTapZones" aria-label="透明点击热区层">
        <button class="fd-immersive-hotzone fd-hotzone-prev" type="button" aria-label="上一页" data-dev-region="PrevPageHotzone" data-reader-page-action="prev" aria-disabled="${pageState.index === 0 ? "true" : "false"}"></button>
        <button class="fd-immersive-hotzone fd-hotzone-center" type="button" aria-label="打开阅读控制层" data-dev-region="ControlLayerHotzone" data-route="reader"></button>
        <button class="fd-immersive-hotzone fd-hotzone-next" type="button" aria-label="下一页" data-dev-region="NextPageHotzone" data-reader-page-action="next" aria-disabled="${pageState.index >= pageState.count - 1 ? "true" : "false"}"></button>
      </section>`;
  }

  function readerMoreMenuHtml(appState) {
    if (!appState?.readerMoreOpen) return "";
    const items = [
      { title: "刷新本章", desc: "重新拉取当前章节正文" },
      { title: "刷新目录", desc: "更新章节目录和缓存状态" },
      { title: "打开来源页", desc: "查看当前书源详情", route: "source-detail" },
      { title: "复制本章链接", desc: "复制当前章节来源地址" },
      { title: "书籍缓存", desc: "管理当前书籍缓存", route: "reader-book-cache" },
      { title: "调试信息", desc: "打开阅读调试信息", route: "reader-debug-info" }
    ];
    return `
      <div class="fd-reader-more-layer" data-reader-more-layer>
        <button class="fd-reader-more-backdrop" type="button" data-reader-more-close aria-label="关闭阅读更多菜单"></button>
        <section class="fd-reader-more-menu" role="menu" aria-label="阅读更多菜单">
          ${items.map((item) => `<button type="button" role="menuitem" data-reader-more-action="${esc(item.title)}"${item.route ? ` data-route="${esc(item.route)}"` : ""}><strong>${esc(item.title)}</strong><small>${esc(item.desc)}</small></button>`).join("")}
        </section>
      </div>`;
  }

  function readerTopOverlay(data, appState) {
    return `
      <section class="fd-reader-top" data-dev-region="ReaderTopBar">
        <button type="button" aria-label="返回" data-reader-exit>${icon("back", "fd-icon")}</button>
        <span><strong>${esc(data.reader.title)}</strong><small>${esc(data.reader.sourceLine)}</small></span>
        <button type="button" data-route="source-switch">${icon("source-switch", "fd-small-icon")}换源</button>
        <button type="button" aria-label="更多" data-reader-more-toggle aria-expanded="${appState?.readerMoreOpen ? "true" : "false"}">${icon("more", "fd-small-icon")}</button>
      </section>
      ${readerMoreMenuHtml(appState)}`;
  }

  function readerQuickActionPanel(type, appState, data) {
    const autoPageEnabled = Boolean(appState?.readerSettings?.autoPage);
    const chapterState = data ? currentReaderChapter(data, appState) : { index: 0, count: 1, chapter: {} };
    const panels = {
      search: {
        title: "内容搜索",
        meta: "仅在当前书籍正文内定位结果",
        body: `
          <label class="fd-reader-panel-search">${icon("search", "fd-small-icon")}<span>雨夜</span></label>
          <div class="fd-reader-module-list">
            <button type="button" data-route="immersive-reading"><strong>第 32 章 雨夜</strong><small>雨夜的风格外冷 · 当前结果 1/2</small></button>
            <button type="button" data-route="immersive-reading"><strong>第 33 章 灯塔</strong><small>雨夜之后，远处灯塔亮起 · 结果 2/2</small></button>
          </div>`
      },
      "auto-page": {
        title: "自动翻页",
        meta: "启动后进入沉浸阅读，底部胶囊控制暂停继续",
        hideHeader: true,
        body: `
          <section class="fd-reader-auto-control" aria-label="自动翻页控制">
            <button class="fd-reader-auto-chapter" type="button" data-reader-chapter-action="prev" aria-label="上一章" aria-disabled="${chapterState.index === 0 ? "true" : "false"}">
              ${icon("chevron-left", "fd-small-icon")}<span>上一章</span>
            </button>
            <button class="fd-reader-auto-toggle ${autoPageEnabled ? "is-on" : ""}" type="button" data-reader-setting-toggle="autoPage" aria-pressed="${autoPageEnabled ? "true" : "false"}">
              <i>${icon(autoPageEnabled ? "pause" : "play", "fd-small-icon")}</i>
              <strong>自动翻页</strong>
              <small>${autoPageEnabled ? "运行中" : "未启动"}</small>
            </button>
            <button class="fd-reader-auto-chapter" type="button" data-reader-chapter-action="next" aria-label="下一章" aria-disabled="${chapterState.index >= chapterState.count - 1 ? "true" : "false"}">
              ${icon("chevron", "fd-small-icon")}<span>下一章</span>
            </button>
          </section>
          <div class="fd-reader-step-row fd-reader-auto-speed" aria-label="翻页速度"><strong>翻页速度</strong><span><button type="button" aria-label="减慢自动翻页">-</button><em>8 秒</em><button type="button" aria-label="加快自动翻页">+</button></span></div>
          <div class="fd-reader-segment-row fd-reader-auto-mode" aria-label="自动翻页方式"><button class="is-active" type="button">连续</button><button type="button">单页</button></div>`
      },
      replace: {
        title: "内容替换",
        meta: "临时规则只影响当前阅读正文渲染",
        body: `
          <section class="fd-replace-summary" aria-label="内容替换总览">
            <button class="is-on" type="button" aria-pressed="true"><strong>启用内容替换</strong><span>当前书 3 条 · 命中 5 处</span></button>
          </section>
          <div class="fd-replace-rule-list" aria-label="替换规则摘要">
            <button class="fd-replace-rule-row is-on" type="button" data-route="content-replacement">
              <strong><span>雨夜称呼</span><em>已启用</em></strong>
              <small>雨夜 -> 雨声</small>
              <i><b>当前章节</b><b>命中 3 处</b></i>
            </button>
            <button class="fd-replace-rule-row is-on" type="button" data-route="content-replacement">
              <strong><span>旧称统一</span><em>已启用</em></strong>
              <small>旧城 -> 纸上城市</small>
              <i><b>当前书</b><b>命中 2 处</b></i>
            </button>
            <button class="fd-replace-rule-row" type="button" data-route="content-replacement">
              <strong><span>标点清理</span><em>暂停</em></strong>
              <small>正则规则 -> 规范标点</small>
              <i><b>本次临时</b><b>未命中</b></i>
            </button>
          </div>
          <button class="fd-reader-inline-entry fd-replace-add-entry" type="button" data-route="content-replacement">新增规则<span>${chevron()}</span></button>
          <button class="fd-reader-primary-action" type="button" data-route="reader">保存并返回控制层</button>`
      }
    };
    const panel = panels[type];
    if (!panel) return "";
    return `
        <section class="fd-reader-module-panel fd-reader-quick-detail ${panel.hideHeader ? "fd-reader-quick-no-header" : ""}" data-dev-region="ReaderQuickPanel" aria-label="${esc(panel.title)}">
        ${panel.hideHeader ? "" : `<header>
          <span><strong>${esc(panel.title)}</strong><small>${esc(panel.meta)}</small></span>
          <button type="button" data-route="reader">关闭</button>
        </header>`}
        ${panel.body}
      </section>`;
  }

  function readerModulePanel(type, appState, data) {
    if (type === "directory") {
      const tocMode = appState?.readerTocMode === "bookmark" ? "bookmark" : "directory";
      const currentChapterState = currentReaderChapter(data, appState);
      const chapters = readerChapters(data);
      const visibleItems = (tocMode === "bookmark" ? chapters.filter((chapter) => chapterHasMarker(chapter, "书签")) : chapters).slice(0, 5);
      const listHtml = visibleItems.map((chapter) => {
        const chapterIndex = Math.max(0, chapters.indexOf(chapter));
        const cached = chapterHasMarker(chapter, "已缓存");
        const bookmarked = chapterHasMarker(chapter, "书签");
        return `
            <button class="fd-reader-toc-row${chapterIndex === currentChapterState.index ? " is-current" : ""}" type="button" data-reader-directory-index="${chapterIndex}">
              <strong>${esc(chapter.title)}</strong>
              <span class="fd-reader-toc-marker ${cached ? "is-active" : ""}" aria-label="${cached ? "已缓存" : "未缓存"}">${icon(cached ? "storage" : "download", "fd-small-icon")}</span>
              <span class="fd-reader-toc-marker ${bookmarked ? "is-active" : ""}" aria-label="${bookmarked ? "书签" : "未加书签"}">${icon("bookmark", "fd-small-icon")}</span>
            </button>`;
      }).join("");
      return `
        <section class="fd-reader-module-panel fd-reader-toc-panel" data-dev-region="ReaderModulePanel" aria-label="目录与书签">
          <div class="fd-reader-toc-list fd-reader-module-list">
            <nav class="fd-reader-toc-switch-row" aria-label="目录书签切换">
              <button class="${tocMode === "directory" ? "is-active" : ""}" type="button" data-reader-toc-mode="directory">目录</button>
              <button class="${tocMode === "bookmark" ? "is-active" : ""}" type="button" data-reader-toc-mode="bookmark">书签</button>
            </nav>
            ${listHtml}
            <button class="fd-reader-toc-row fd-reader-toc-expand-row" type="button" data-route="reader-full-directory">
              <strong>完整目录</strong>
              <span class="fd-reader-toc-marker is-active" aria-label="打开完整目录">${icon("chevron", "fd-small-icon")}</span>
            </button>
          </div>
        </section>`;
    }
    if (type === "tts") {
      const tts = appState.readerTts || {};
      const ttsConfig = readerTtsConfig(data);
      const ttsDefaults = ttsConfig.defaults;
      const ttsOptions = ttsConfig.options;
      return `
        <section class="fd-reader-module-panel fd-reader-tts-panel" data-dev-region="ReaderModulePanel" aria-label="朗读">
          <strong class="fd-reader-module-title">朗读</strong>
          <div class="fd-reader-tts-list fd-reader-module-list">
            <section class="fd-reader-tts-row fd-reader-tts-control-row" aria-label="播放控制">
              <i>${icon("tts", "fd-small-icon")}</i>
              <strong>播放控制</strong>
              <span class="fd-reader-tts-controls">
                <button type="button" data-reader-tts-action="prev" aria-label="上一句">${icon("chevron-left", "fd-small-icon")}</button>
                <button class="is-primary ${tts.playing ? "is-playing" : ""}" type="button" data-reader-tts-action="toggle" aria-label="${tts.playing ? "暂停朗读" : "开始朗读"}">${icon(tts.playing ? "pause" : "play", "fd-small-icon")}</button>
                <button type="button" data-reader-tts-action="next" aria-label="下一句">${icon("chevron", "fd-small-icon")}</button>
              </span>
            </section>
            <div class="fd-reader-tts-option-row">
              <button type="button" data-reader-tts-option-key="speed" aria-expanded="${appState?.readerTtsExpandedOption === "speed" ? "true" : "false"}"><i>${icon("motion", "fd-small-icon")}</i><strong>语速</strong><em>${esc(tts.speed || ttsDefaults.speed)}${chevron()}</em></button>
              ${readerTtsDropdownHtml("speed", "语速", tts, ttsDefaults, ttsOptions, appState)}
            </div>
            <div class="fd-reader-tts-option-row">
              <button type="button" data-reader-tts-option-key="voice" aria-expanded="${appState?.readerTtsExpandedOption === "voice" ? "true" : "false"}"><i>${icon("volume", "fd-small-icon")}</i><strong>音色</strong><em>${esc(tts.voice || ttsDefaults.voice)}${chevron()}</em></button>
              ${readerTtsDropdownHtml("voice", "音色", tts, ttsDefaults, ttsOptions, appState)}
            </div>
            <div class="fd-reader-tts-option-row">
              <button type="button" data-reader-tts-option-key="scope" aria-expanded="${appState?.readerTtsExpandedOption === "scope" ? "true" : "false"}"><i>${icon("current-location", "fd-small-icon")}</i><strong>范围</strong><em>${esc(tts.scope || ttsDefaults.scope)}${chevron()}</em></button>
              ${readerTtsDropdownHtml("scope", "范围", tts, ttsDefaults, ttsOptions, appState)}
            </div>
            <div class="fd-reader-tts-option-row">
              <button type="button" data-reader-tts-option-key="timer" aria-expanded="${appState?.readerTtsExpandedOption === "timer" ? "true" : "false"}"><i>${icon("clock", "fd-small-icon")}</i><strong>定时</strong><em>${esc(tts.timer || ttsDefaults.timer)}${chevron()}</em></button>
              ${readerTtsDropdownHtml("timer", "定时", tts, ttsDefaults, ttsOptions, appState)}
            </div>
          </div>
        </section>`;
    }
    if (type === "appearance") {
      const typography = appState?.readerTypography || normalizeReaderTypography(data);
      const activeTheme = currentReaderTheme(data, appState);
      const quickThemes = readerQuickThemeOptions(data);
      const quickFonts = readerFontOptions(data).slice(0, 3);
      return `
        <section class="fd-reader-module-panel fd-reader-appearance-panel" data-dev-region="ReaderModulePanel" aria-label="阅读外观">
          <strong class="fd-reader-module-title">界面</strong>
          <div class="fd-reader-appearance-list fd-reader-module-list">
            <section class="fd-reader-appearance-row fd-reader-appearance-theme-row" aria-label="阅读主题">
              <i>${icon("palette", "fd-small-icon")}</i>
              <strong>阅读主题</strong>
              <div class="fd-reader-theme-palette">
                ${quickThemes.map((item) => `
                  <button class="${activeTheme.value === item.value ? "is-active" : ""}" type="button" data-reader-theme="${esc(item.value)}" data-reader-theme-scheme="${esc(item.scheme || "")}" aria-label="${esc(item.label)}" aria-pressed="${activeTheme.value === item.value ? "true" : "false"}">
                    <span style="--swatch:${esc(item.swatch)}"></span>
                  </button>
                `).join("")}
              </div>
            </section>
            <section class="fd-reader-appearance-row" data-typography-row="font-size" aria-label="字号">
              <i>${icon("typo", "fd-small-icon")}</i>
              <strong>字号</strong>
              <span class="fd-reader-stepper">
                <button type="button" data-reader-typography-action="font-size-decrease">A-</button>
                <em data-reader-typography-value="font-size">${esc(typographyNumber(typography.fontSize, 0))}</em>
                <button type="button" data-reader-typography-action="font-size-increase">A+</button>
              </span>
            </section>
            <section class="fd-reader-appearance-row" data-typography-row="line-height" aria-label="行距">
              <i>${icon("list", "fd-small-icon")}</i>
              <strong>行距</strong>
              <span class="fd-reader-stepper">
                <button type="button" data-reader-typography-action="line-height-decrease">-</button>
                <em data-reader-typography-value="line-height">${esc(typographyNumber(typography.lineHeight, 2))}</em>
                <button type="button" data-reader-typography-action="line-height-increase">+</button>
              </span>
            </section>
            <section class="fd-reader-appearance-row" aria-label="字体">
              <i>${icon("text", "fd-small-icon")}</i>
              <strong>字体</strong>
              <div class="fd-reader-font-choice">
                ${quickFonts.map((item) => `
                  <button class="${typography.fontFamily === item.value ? "is-active" : ""}" type="button" data-reader-typography-set="fontFamily" data-reader-typography-value="${esc(item.value)}">${esc(item.label)}</button>
                `).join("")}
              </div>
            </section>
            <section class="fd-reader-appearance-row fd-reader-appearance-custom-row" aria-label="自定义">
              <i>${icon("settings", "fd-small-icon")}</i>
              <strong>自定义</strong>
              <div class="fd-reader-custom-links">
                <button type="button" data-route="reader-settings">背景色</button>
                <button type="button" data-route="reader-settings">页边距</button>
              </div>
            </section>
          </div>
        </section>`;
    }
    if (type === "settings") {
      const settings = appState.readerSettings || {};
      const settingConfig = readerControlSettingsConfig(data);
      const settingDefaults = settingConfig.defaults;
      const settingOptions = settingConfig.options;
      return `
        <section class="fd-reader-module-panel fd-reader-settings-panel" data-dev-region="ReaderModulePanel" aria-label="阅读设置">
          <div class="fd-reader-settings-list">
            <button type="button" data-reader-setting-toggle="autoPage"><i>${icon("refresh", "fd-small-icon")}</i><strong>自动翻页</strong><span class="fd-reader-switch ${settings.autoPage ? "is-on" : ""}" aria-hidden="true"></span></button>
            <div class="fd-reader-setting-row">
              <button type="button" data-reader-setting-option-key="tapMode" aria-expanded="${appState?.readerSettingsExpandedOption === "tapMode" ? "true" : "false"}"><i>${icon("gesture", "fd-small-icon")}</i><strong>点击翻页方式</strong><em>${esc(settings.tapMode || settingDefaults.tapMode)}${chevron()}</em></button>
              ${readerSettingDropdownHtml("tapMode", "点击翻页方式", settings, settingDefaults, settingOptions, appState)}
            </div>
            <button type="button" data-reader-setting-toggle="volumePage"><i>${icon("volume", "fd-small-icon")}</i><strong>音量键翻页</strong><span class="fd-reader-switch ${settings.volumePage ? "is-on" : ""}" aria-hidden="true"></span></button>
            <div class="fd-reader-setting-row">
              <button type="button" data-reader-setting-option-key="pageAnimation" aria-expanded="${appState?.readerSettingsExpandedOption === "pageAnimation" ? "true" : "false"}"><i>${icon("file", "fd-small-icon")}</i><strong>翻页动画</strong><em>${esc(settings.pageAnimation || settingDefaults.pageAnimation)}${chevron()}</em></button>
              ${readerSettingDropdownHtml("pageAnimation", "翻页动画", settings, settingDefaults, settingOptions, appState)}
            </div>
            <button type="button" data-reader-setting-toggle="landscapeLock"><i>${icon("permission", "fd-small-icon")}</i><strong>横屏锁定</strong><span class="fd-reader-switch ${settings.landscapeLock ? "is-on" : ""}" aria-hidden="true"></span></button>
            <button type="button" data-reader-setting-toggle="keepScreenOn"><i>${icon("sun", "fd-small-icon")}</i><strong>屏幕常亮</strong><span class="fd-reader-switch ${settings.keepScreenOn ? "is-on" : ""}" aria-hidden="true"></span></button>
            <button type="button" data-reader-setting-toggle="statusInfo"><i>${icon("progress", "fd-small-icon")}</i><strong>页脚进度信息</strong><span class="fd-reader-switch ${settings.statusInfo ? "is-on" : ""}" aria-hidden="true"></span></button>
            <button type="button" data-reader-setting-toggle="hapticFeedback"><i>${icon("gesture", "fd-small-icon")}</i><strong>触摸反馈</strong><span class="fd-reader-switch ${settings.hapticFeedback ? "is-on" : ""}" aria-hidden="true"></span></button>
            <button type="button" data-reader-setting-toggle="cacheNext"><i>${icon("download", "fd-small-icon")}</i><strong>自动缓存后续章节</strong><span class="fd-reader-switch ${settings.cacheNext ? "is-on" : ""}" aria-hidden="true"></span></button>
          </div>
          <button class="fd-reader-inline-entry" type="button" data-route="reader-settings">${icon("settings", "fd-small-icon")}更多阅读设置<span>${chevron()}</span></button>
        </section>`;
    }
    return "";
  }

  function readerModuleNavHtml(data, activeType) {
    const normalizedType = activeType || "";
    return data.reader.modules.map((item) => `
      <button class="fd-reader-module${item.type === normalizedType ? " is-active" : ""}" type="button" data-route="${esc(readerModuleRoutes[item.type] || "reader")}" data-module="${esc(item.type)}"${item.type === normalizedType ? ' aria-current="page"' : ""}>
        <span>${icon(item.icon || item.type, "fd-medium-icon")}</span>
        <small>${esc(item.label)}</small>
      </button>
    `).join("");
  }

  function readerChoiceButtons(values, current, dataAttrs) {
    return (values || []).map((value) => `
      <button class="${value === current ? "is-active" : ""}" type="button" ${dataAttrs(value)}>${esc(value)}</button>
    `).join("");
  }

  function readerFullDirectoryPage(data, appState) {
    const tocMode = appState?.readerTocMode === "bookmark" ? "bookmark" : "directory";
    const currentChapterState = currentReaderChapter(data, appState);
    const chapters = readerChapters(data);
    const visibleItems = tocMode === "bookmark" ? chapters.filter((chapter) => chapterHasMarker(chapter, "书签")) : chapters;
    return `
      <section class="fd-reader-full-section fd-reader-full-directory" aria-label="完整目录">
        <nav class="fd-reader-full-toc-switch-row" aria-label="目录书签切换">
          <button class="${tocMode === "directory" ? "is-active" : ""}" type="button" data-reader-toc-mode="directory">目录</button>
          <button class="${tocMode === "bookmark" ? "is-active" : ""}" type="button" data-reader-toc-mode="bookmark">书签</button>
        </nav>
        <div class="fd-reader-full-toc-list">
          ${visibleItems.map((chapter) => {
            const chapterIndex = Math.max(0, chapters.indexOf(chapter));
            const cached = chapterHasMarker(chapter, "已缓存");
            const bookmarked = chapterHasMarker(chapter, "书签");
            return `
              <button class="fd-reader-full-toc-row${chapterIndex === currentChapterState.index ? " is-current" : ""}" type="button" data-reader-directory-index="${chapterIndex}">
                <strong>${esc(chapter.title)}</strong>
                <span class="${cached ? "is-active" : ""}" aria-label="${cached ? "已缓存" : "未缓存"}">${icon(cached ? "checkmark" : "download", "fd-small-icon")}</span>
                <span class="${bookmarked ? "is-active" : ""}" aria-label="${bookmarked ? "书签" : "未加书签"}">${icon("bookmark", "fd-small-icon")}</span>
              </button>`;
          }).join("")}
        </div>
      </section>`;
  }

  function readerFullTtsPage(data, appState) {
    const tts = appState.readerTts || {};
    const ttsConfig = readerTtsConfig(data);
    const defaults = ttsConfig.defaults;
    const options = ttsConfig.options;
    const current = (key) => tts[key] || defaults[key] || (options[key] || [])[0] || "";
    return `
      <section class="fd-reader-full-section fd-reader-full-tts" aria-label="完整朗读控制">
        <section class="fd-reader-full-playback">
          <button type="button" data-reader-tts-action="prev" aria-label="上一句">${icon("chevron-left", "fd-small-icon")}</button>
          <button class="is-primary ${tts.playing ? "is-playing" : ""}" type="button" data-reader-tts-action="toggle" aria-label="${tts.playing ? "暂停朗读" : "开始朗读"}">${icon(tts.playing ? "pause" : "play", "fd-medium-icon")}</button>
          <button type="button" data-reader-tts-action="next" aria-label="下一句">${icon("chevron", "fd-small-icon")}</button>
        </section>
        ${["speed", "voice", "scope", "timer"].map((key) => `
          <section class="fd-reader-full-setting-block">
            <header><strong>${esc({ speed: "语速", voice: "音色", scope: "朗读范围", timer: "定时关闭" }[key])}</strong><em>${esc(current(key))}</em></header>
            <div class="fd-reader-full-choice-grid">
              ${readerChoiceButtons(options[key] || [], current(key), (value) => `data-reader-tts-option="${esc(key)}" data-reader-tts-value="${esc(value)}"`)}
            </div>
          </section>
        `).join("")}
      </section>`;
  }

  function readerFullAppearancePage(data, appState) {
    const typography = appState?.readerTypography || normalizeReaderTypography(data);
    const activeTheme = currentReaderTheme(data, appState);
    return `
      <section class="fd-reader-full-section fd-reader-full-appearance" aria-label="完整界面设置">
        <section class="fd-reader-full-setting-block">
          <header><strong>阅读主题</strong><em>${esc(activeTheme.label)}</em></header>
          <div class="fd-reader-full-theme-grid">
            ${readerThemeOptions(data).map((item, index) => `
              <button class="${activeTheme.value === item.value ? "is-active" : ""}" type="button" data-reader-theme="${esc(item.value)}" data-reader-theme-scheme="${esc(item.scheme || (index < 4 ? "day" : "night"))}" data-reader-theme-pair="${esc(item.pair || "")}" aria-label="${esc(index < 4 ? "白天主题" : "夜晚主题")}：${esc(item.label)}">
                <span style="--swatch:${esc(item.swatch)}"></span><small>${esc(item.label)}</small>
              </button>
            `).join("")}
          </div>
        </section>
        <section class="fd-reader-full-setting-block fd-reader-full-typography">
          <header><strong>文字排版</strong><em>字号 / 行距 / 段距 / 字距</em></header>
          ${typographyPanelRows(data, typography)}
        </section>
        <section class="fd-reader-full-setting-block">
          <header><strong>页面空间</strong><em>完整页预留自定义入口</em></header>
          <div class="fd-reader-full-choice-grid fd-reader-full-choice-grid-even">
            <button type="button">上边距</button>
            <button type="button">左右边距</button>
            <button type="button">背景纹理</button>
            <button type="button">段首缩进</button>
          </div>
        </section>
      </section>`;
  }

  function readerFullSettingsPage(data, appState) {
    const settings = appState.readerSettings || {};
    const settingConfig = readerControlSettingsConfig(data);
    const defaults = settingConfig.defaults;
    const options = settingConfig.options;
    const current = (key) => settings[key] || defaults[key] || (options[key] || [])[0] || "";
    const toggles = [
      ["autoPage", "自动翻页", "refresh"],
      ["volumePage", "音量键翻页", "volume"],
      ["landscapeLock", "横屏锁定", "permission"],
      ["keepScreenOn", "屏幕常亮", "sun"],
      ["statusInfo", "页脚进度信息", "progress"],
      ["hapticFeedback", "触摸反馈", "gesture"],
      ["cacheNext", "自动缓存后续章节", "download"]
    ];
    return `
      <section class="fd-reader-full-section fd-reader-full-settings" aria-label="完整阅读设置">
        ${["tapMode", "pageAnimation"].map((key) => `
          <section class="fd-reader-full-setting-block">
            <header><strong>${esc(key === "tapMode" ? "点击翻页方式" : "翻页动画")}</strong><em>${esc(current(key))}</em></header>
            <div class="fd-reader-full-choice-grid">
              ${readerChoiceButtons(options[key] || [], current(key), (value) => `data-reader-setting-option="${esc(key)}" data-reader-setting-value="${esc(value)}"`)}
            </div>
          </section>
        `).join("")}
        <section class="fd-reader-full-setting-block">
          <header><strong>阅读行为</strong><em>开关项</em></header>
          <div class="fd-reader-full-toggle-list">
            ${toggles.map(([key, label, iconName]) => `
              <button type="button" data-reader-setting-toggle="${esc(key)}">
                <i>${icon(iconName, "fd-small-icon")}</i>
                <strong>${esc(label)}</strong>
                <span class="fd-reader-switch ${settings[key] ? "is-on" : ""}" aria-hidden="true"></span>
              </button>
            `).join("")}
          </div>
        </section>
      </section>`;
  }

  function readerFullPageBody(type, data, appState) {
    if (type === "directory") return readerFullDirectoryPage(data, appState);
    if (type === "tts") return readerFullTtsPage(data, appState);
    if (type === "appearance") return readerFullAppearancePage(data, appState);
    return readerFullSettingsPage(data, appState);
  }

  function readerFullPagePanel(data, type, appState) {
    const module = (data.reader.modules || []).find((item) => item.type === type) || { label: "阅读设置", type: "settings", icon: "settings" };
    const quickRoute = readerModuleRoutes[type] || "reader-settings";
    const promotedRoute = readerPromotedRoutes[type] || "";
    return `
      <section class="fd-reader-full-page-panel fd-reader-full-page-${esc(type)}" data-dev-region="ReaderExpandedPanel" aria-label="${esc(module.label)}大半屏控制窗">
        ${promotedRoute
          ? `<button class="fd-reader-full-grabber" type="button" data-route="${esc(promotedRoute)}" aria-label="继续展开到全屏页面"></button>`
          : `<span class="fd-reader-full-grabber" aria-hidden="true"></span>`}
        <header class="fd-reader-full-head">
          <span>${icon(module.icon || module.type, "fd-small-icon")}<strong>${esc(module.label)}</strong></span>
          <button type="button" data-route="${esc(quickRoute)}" data-route-replace>收起</button>
        </header>
        <div class="fd-reader-full-content">
          ${readerFullPageBody(type, data, appState)}
        </div>
      </section>`;
  }

  function readerUtilityPanel(title, iconName, route, contentHtml) {
    return `
      <section class="fd-reader-full-page-panel fd-reader-utility-panel fd-reader-utility-${esc(route)}" data-dev-region="ReaderUtilityPage" aria-label="${esc(title)}">
        <button class="fd-reader-full-grabber" type="button" data-route="reader" data-route-replace aria-label="回到阅读控制层"></button>
        <header class="fd-reader-full-head">
          <span>${icon(iconName, "fd-small-icon")}<strong>${esc(title)}</strong></span>
          <button type="button" data-route="reader" data-route-replace>完成</button>
        </header>
        <div class="fd-reader-full-content">
          ${contentHtml}
        </div>
      </section>`;
  }

  function readerBookCachePanel(data, appState) {
    const chapters = readerChapters(data);
    const current = currentReaderChapter(data, appState);
    const cachedCount = chapters.filter((chapter) => chapterHasMarker(chapter, "已缓存")).length;
    const cacheRows = chapters.slice(Math.max(0, current.index - 2), Math.min(chapters.length, current.index + 6));
    return readerUtilityPanel("书籍缓存", "storage", "book-cache", `
      <section class="fd-reader-full-section fd-reader-cache-page" aria-label="书籍缓存管理">
        <section class="fd-reader-utility-summary">
          <article><strong>${esc(`${cachedCount}/${chapters.length}`)}</strong><small>已缓存章节</small></article>
          <article><strong>128 MB</strong><small>当前书籍缓存</small></article>
          <article><strong>${appState?.readerSettings?.cacheNext ? "已开启" : "未开启"}</strong><small>自动缓存后续章节</small></article>
        </section>
        <section class="fd-reader-utility-block">
          <header><strong>缓存动作</strong><small>只作用于当前书籍</small></header>
          <div class="fd-reader-utility-action-grid">
            <button type="button">${icon("download", "fd-small-icon")}<span><strong>缓存当前章节</strong><small>${esc(current.chapter.title || readerChapterMeta(data))}</small></span></button>
            <button type="button">${icon("refresh", "fd-small-icon")}<span><strong>缓存后续章节</strong><small>从当前章节继续 20 章</small></span></button>
            <button type="button">${icon("directory", "fd-small-icon")}<span><strong>更新缓存目录</strong><small>刷新章节列表和缓存标记</small></span></button>
            <button class="is-danger" type="button">${icon("trash", "fd-small-icon")}<span><strong>清理本书缓存</strong><small>保留阅读进度和书签</small></span></button>
          </div>
        </section>
        <section class="fd-reader-utility-block">
          <header><strong>章节缓存</strong><small>右侧固定显示缓存状态和操作</small></header>
          <div class="fd-reader-cache-list">
            ${cacheRows.map((chapter) => {
              const chapterIndex = chapters.indexOf(chapter);
              const cached = chapterHasMarker(chapter, "已缓存");
              const currentRow = chapterIndex === current.index;
              return `
                <article class="${currentRow ? "is-current" : ""}">
                  <span><strong>${esc(chapter.title)}</strong><small>${currentRow ? "当前章节" : cached ? "已下载到本地" : "尚未缓存"}</small></span>
                  <em class="${cached ? "is-cached" : ""}">${icon(cached ? "check" : "download", "fd-small-icon")}</em>
                  <button type="button">${cached ? "移除" : "缓存"}</button>
                </article>`;
            }).join("")}
          </div>
        </section>
      </section>`);
  }

  function readerDebugInfoPanel(data, appState) {
    const chapter = currentReaderChapter(data, appState);
    const page = currentReaderPage(data, appState);
    const typography = appState?.readerTypography || normalizeReaderTypography(data);
    const theme = currentReaderTheme(data, appState);
    const rows = [
      ["当前路由", "reader / immersive-reading"],
      ["当前章节", `${chapter.index + 1}/${chapter.count} · ${chapter.chapter.title || readerChapterMeta(data)}`],
      ["分页状态", `${page.index + 1}/${page.count} · ${page.mode === "content-flow" ? "流式测量分页" : "固定分页"}`],
      ["正文排版", `字号 ${typography.fontSize}px · 行距 ${typography.lineHeight} · 段距 ${typography.paragraphGap}px`],
      ["阅读主题", `${theme.label} · ${theme.scheme || "default"}`],
      ["书源", data.reader.sourceLine || "优书网 · 128ms"]
    ];
    const logs = [
      ["正文渲染", "page-measure", "完成", "按容器高度切分分页，无重复章节名"],
      ["章节缓存", "cache-status", "可用", "当前章节未缓存，前序章节已缓存"],
      ["换源窗口", "source-switch", "完成", "候选书源按延迟升序排列"],
      ["控制层", "overlay-state", "完成", "顶栏、快捷窗、亮度条保持同层结构"]
    ];
    return readerUtilityPanel("调试信息", "bug", "debug-info", `
      <section class="fd-reader-full-section fd-reader-debug-page" aria-label="阅读调试信息">
        <section class="fd-reader-utility-summary">
          <article><strong>${esc(page.index + 1)}/${esc(page.count)}</strong><small>当前页</small></article>
          <article><strong>${esc(chapter.index + 1)}/${esc(chapter.count)}</strong><small>当前章节</small></article>
          <article><strong>0</strong><small>当前错误</small></article>
        </section>
        <section class="fd-reader-utility-block">
          <header><strong>渲染状态</strong><small>用于核对页面结构和正文渲染链路</small></header>
          <div class="fd-reader-debug-grid">
            ${rows.map(([label, value]) => `<article><small>${esc(label)}</small><strong>${esc(value)}</strong></article>`).join("")}
          </div>
        </section>
        <section class="fd-reader-utility-block">
          <header><strong>调试日志</strong><small>展示当前阅读链路关键节点</small></header>
          <div class="fd-reader-debug-log">
            ${logs.map(([scope, code, state, message]) => `
              <article>
                <span><strong>${esc(scope)}</strong><small>${esc(code)} · ${esc(message)}</small></span>
                <em>${esc(state)}</em>
              </article>
            `).join("")}
          </div>
        </section>
        <section class="fd-reader-utility-block">
          <header><strong>调试动作</strong><small>不改变正文，只导出或刷新诊断信息</small></header>
          <div class="fd-reader-utility-action-grid">
            <button type="button">${icon("copy", "fd-small-icon")}<span><strong>复制调试信息</strong><small>复制当前路由、章节、分页和排版参数</small></span></button>
            <button type="button">${icon("log", "fd-small-icon")}<span><strong>导出阅读日志</strong><small>生成当前书籍的调试记录</small></span></button>
            <button type="button">${icon("refresh", "fd-small-icon")}<span><strong>重新测量分页</strong><small>刷新正文容器和分页结果</small></span></button>
            <button type="button">${icon("source-switch", "fd-small-icon")}<span><strong>检查书源状态</strong><small>查看当前书源请求与解析结果</small></span></button>
          </div>
        </section>
      </section>`);
  }

  function readerBrightnessRail(data, appState) {
    const brightness = data.reader.brightness || {};
    const brightnessConfig = readerBrightnessConfig(data);
    const isAuto = Boolean(appState?.readerBrightnessAuto);
    const value = readerBrightnessValue(data, appState);
    return `
      <aside class="fd-brightness-rail" aria-label="亮度控制" data-dev-region="BrightnessRail" style="--brightness:${esc(value)}%">
        ${icon("sun", "fd-small-icon")}
        <i data-reader-brightness-track role="slider" aria-label="调整亮度" aria-orientation="vertical" aria-valuemin="${esc(brightnessConfig.min)}" aria-valuemax="${esc(brightnessConfig.max)}" aria-valuenow="${esc(value)}" tabindex="0"><b></b></i>
        <button class="fd-brightness-auto-toggle${isAuto ? " is-active" : ""}" type="button" data-reader-brightness-auto aria-pressed="${isAuto ? "true" : "false"}" aria-label="${esc(brightness.autoText || "自动亮度")}">${esc(brightness.autoLabel || "A")}</button>
      </aside>`;
  }

  function readerControlMain(data, appState) {
    const chapter = data.reader.chapterProgress || {};
    const chapterProgressConfig = readerChapterProgressConfig(data);
    const chapterState = currentReaderChapter(data, appState);
    const chapterProgress = readerChapterProgressValue(data, appState);
    const chapterTitle = chapterState.chapter.title || chapter.title || "第 32 章 雨夜";
    const chapterNumber = readerChapterNumber(chapterTitle, chapterState.index + 1);
    const totalChapterCount = readerTotalChapterCount(data, chapterState.count);
    return `
      <div class="fd-reader-control-main" data-dev-region="BottomControlPanel">
        <nav class="fd-reader-actions" aria-label="快捷操作">
          ${data.reader.quickActions.map((item) => `
            <button type="button" data-route="${esc(item.type === "search" ? "content-search" : item.type === "auto-page" ? "auto-page" : "content-replacement")}" data-quick-action="${esc(item.type)}">${icon(readerQuickActionIconMap[item.type] || item.type, "fd-medium-icon")}<span>${esc(item.label)}</span></button>
          `).join("")}
        </nav>
        <section class="fd-reader-chapter-panel" aria-label="书籍进度">
          <div class="fd-reader-chapter-row fd-reader-chapter-control-row">
            <button class="fd-reader-chapter-step" type="button" data-reader-chapter-action="prev" aria-label="${esc(chapter.previousLabel || "上一章")}" aria-disabled="${chapterState.index === 0 ? "true" : "false"}">${icon("chevron-left", "fd-small-icon")}<span class="fd-sr-only">${esc(chapter.previousLabel || "上一章")}</span></button>
            <span class="fd-reader-chapter-main">
              <strong data-reader-current-chapter>${esc(chapterTitle)}</strong>
            </span>
            <button class="fd-reader-chapter-step" type="button" data-reader-chapter-action="next" aria-label="${esc(chapter.nextLabel || "下一章")}" aria-disabled="${chapterState.index >= chapterState.count - 1 ? "true" : "false"}">${icon("chevron", "fd-small-icon")}<span class="fd-sr-only">${esc(chapter.nextLabel || "下一章")}</span></button>
          </div>
          <div class="fd-reader-progress-row">
            <small class="fd-reader-book-progress">书籍进度 ${esc(chapterProgress)}% · 第 ${esc(chapterNumber)} / ${esc(totalChapterCount)} 章</small>
            <button class="fd-reader-progress" type="button" style="--progress:${esc(pct(`${chapterProgress}%`))}" data-reader-chapter-progress aria-label="调整书籍进度" aria-valuemin="${esc(chapterProgressConfig.min)}" aria-valuemax="${esc(chapterProgressConfig.max)}" aria-valuenow="${esc(chapterProgress)}">
              <i><b></b></i>
            </button>
            <span class="fd-reader-total-chapters">共 ${esc(totalChapterCount)} 章</span>
          </div>
        </section>
      </div>`;
  }

  function readerLoadingPanel(route) {
    const routeTitle = (routes[route] || routes.reader).title.replace(/（.+$/, "");
    return `
      <section class="fd-reader-loading-panel" data-reader-loading aria-live="polite" aria-label="ReaderShell 加载状态">
        <i aria-hidden="true"></i>
        <strong>正在加载${esc(routeTitle)}</strong>
        <small>保持同一正文底层，只替换控制面板内容</small>
      </section>`;
  }

  function readerBottomSheetHtml(data, state, route, isLoading, appState) {
    if (state.mode === "immersive") {
      return "";
    }
    const expandedRoute = readerFullRouteForState(state);
    let bodyHtml = "";
    if (isLoading) {
      bodyHtml = readerLoadingPanel(route);
    } else if (state.mode === "quick") {
      bodyHtml = readerQuickActionPanel(state.quick, appState, data);
    } else if (state.mode === "module") {
      bodyHtml = readerModulePanel(state.module, appState, data);
    } else {
      bodyHtml = readerControlMain(data, appState);
    }
    return `
      <button class="fd-reader-grabber" type="button" data-route="${esc(expandedRoute)}" data-route-replace aria-label="展开完整控制页"></button>
      ${bodyHtml}
      ${readerBrightnessRail(data, appState)}`;
  }

  function readerUtilityScreen(data, route, appState) {
    const isCache = route === "reader-book-cache";
    return shellKit().renderReaderShell({
      frameClass: `fd-reader-frame fd-reader-flow-frame fd-reader-mode-full fd-reader-utility-frame ${isCache ? "fd-reader-cache-frame" : "fd-reader-debug-frame"}`,
      readingSurfaceClass: "fd-reading-surface",
      overlayClass: "fd-reader-overlay fd-reader-full-overlay",
      bottomSheetHostClass: "fd-reader-full-host",
      moduleNavClass: "fd-reader-module-nav fd-reader-module-nav-empty",
      stateHostClass: "fd-reader-state-host",
      stateHostHtml: `<div class="fd-reader-global-brightness-dim" data-reader-brightness-dim aria-hidden="true" style="${readerBrightnessStyle(data, appState)}"></div>`,
      ariaLabel: (routes[route] || routes.reader).title,
      readingSurfaceHtml: sharedReaderSurface(data, "", appState),
      overlayHtml: readerTopOverlay(data, Object.assign({}, appState, { readerMoreOpen: false })),
      bottomSheetHtml: isCache ? readerBookCachePanel(data, appState) : readerDebugInfoPanel(data, appState),
      moduleNavHtml: ""
    });
  }

  function readerFullPageScreen(data, route, appState) {
    const type = readerFullTypeByRoute[route] || "settings";
    return shellKit().renderReaderShell({
      frameClass: `fd-reader-frame fd-reader-flow-frame fd-reader-mode-full fd-reader-mode-full-${esc(type)}`,
      readingSurfaceClass: "fd-reading-surface",
      overlayClass: "fd-reader-overlay fd-reader-full-overlay",
      bottomSheetHostClass: "fd-reader-full-host",
      moduleNavClass: "fd-reader-module-nav fd-reader-module-nav-empty",
      stateHostClass: "fd-reader-state-host",
      stateHostHtml: `<div class="fd-reader-global-brightness-dim" data-reader-brightness-dim aria-hidden="true" style="${readerBrightnessStyle(data, appState)}"></div>`,
      ariaLabel: (routes[route] || routes["reader-full-settings"]).title,
      readingSurfaceHtml: sharedReaderSurface(data, "", appState),
      overlayHtml: readerTopOverlay(data, appState),
      bottomSheetHtml: readerFullPagePanel(data, type, appState),
      moduleNavHtml: ""
    });
  }

  function readerStateScreen(data, route, options, appState) {
    const baseState = readerRouteState(route);
    const isLoading = Boolean(options && options.loading);
    const state = isLoading ? Object.assign({}, baseState, { mode: "loading" }) : baseState;
    const isImmersive = baseState.mode === "immersive" && !isLoading;
    const activeModule = baseState.mode === "module" ? baseState.module : "";
    const frameMode = isImmersive ? "immersive" : state.mode;

    return shellKit().renderReaderShell({
      frameClass: `fd-reader-frame fd-reader-flow-frame fd-reader-mode-${esc(frameMode)}${isImmersive ? " fd-immersive-frame" : ""}`,
      readingSurfaceClass: "fd-reading-surface",
      overlayClass: `fd-reader-overlay${isImmersive ? " fd-immersive-overlay" : ""}`,
      bottomSheetHostClass: isImmersive ? "fd-reader-sheet fd-reader-sheet-empty" : "fd-reader-sheet",
      moduleNavClass: isImmersive ? "fd-reader-module-nav fd-reader-module-nav-empty" : "fd-reader-module-nav",
      stateHostClass: "fd-reader-state-host",
      stateHostHtml: `<div class="fd-reader-global-brightness-dim" data-reader-brightness-dim aria-hidden="true" style="${readerBrightnessStyle(data, appState)}"></div>`,
      ariaLabel: (routes[route] || routes.reader).title,
      readingSurfaceHtml: sharedReaderSurface(data, isImmersive ? "" : "immersive-reading", appState),
      overlayHtml: isImmersive ? `${readerInfoOverlay(data, appState)}${readerTextSelectionLayer(appState)}${readerTapZones(data, appState)}` : readerTopOverlay(data, appState),
      bottomSheetHtml: readerBottomSheetHtml(data, state, route, isLoading, appState),
      moduleNavHtml: isImmersive ? "" : readerModuleNavHtml(data, activeModule)
    });
  }

  function readerProgressBase(data) {
    const raw = data.reader?.bottomReadout?.progress || "38%";
    const parsed = Number.parseFloat(String(raw).replace("%", ""));
    return Number.isFinite(parsed) ? parsed : 38;
  }

  function readerProgressForPage(data, index, count) {
    const base = readerProgressBase(data);
    const span = Math.max(2, Math.min(8, Math.ceil(count * 0.45)));
    const value = count <= 1 ? base : base + (index / Math.max(1, count - 1)) * span;
    const rounded = Math.round(value * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded}%`;
  }

  function readerSourceSignature(blocks) {
    return blocks.map((item) => item.length).join(".");
  }

  function readerSplitIndex(text, bestIndex) {
    if (bestIndex >= text.length) {
      return text.length;
    }
    const start = Math.max(1, bestIndex - 12);
    const punctuation = "，。！？；：、,.!?;:";
    for (let index = bestIndex; index >= start; index -= 1) {
      if (punctuation.includes(text.charAt(index - 1))) {
        return index;
      }
    }
    return Math.max(1, bestIndex);
  }

  function updateReaderPagination(screenHost, data, appState) {
    const layer = screenHost.querySelector(".fd-ir-reading-layer");
    if (!layer || !appState) {
      return false;
    }
    const rect = layer.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (width <= 0 || height <= 0) {
      return false;
    }

    const typography = appState.readerTypography || normalizeReaderTypography(data);
    const sourceBlocks = readerTextBlocks(data);
    const key = [
      width,
      height,
      typography.fontSize,
      typography.lineHeight,
      typography.paragraphGap,
      typography.letterSpacing,
      typography.fontFamily,
      readerSourceSignature(sourceBlocks)
    ].join("|");

    if (appState.readerPaginationKey === key && Array.isArray(appState.readerPages) && appState.readerPages.length > 0) {
      return false;
    }

    const measurer = document.createElement("article");
    measurer.className = "fd-ir-reading-layer fd-ir-measure-layer";
    measurer.setAttribute("aria-hidden", "true");
    measurer.style.cssText = [
      readerTypographyStyle(data, typography),
      "position:fixed",
      "inset:auto",
      "left:-10000px",
      "top:0",
      `width:${width}px`,
      `height:${height}px`,
      "overflow:hidden",
      "visibility:hidden",
      "pointer-events:none",
      "z-index:-1"
    ].join(";");
    document.body.appendChild(measurer);

    const writeMeasureContent = (paragraphs, includeTitle) => {
      const titleHtml = includeTitle ? `<h1>${esc(readerChapterTitle(data))}</h1>` : "";
      measurer.innerHTML = `${titleHtml}${paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}`;
      return measurer.scrollHeight <= height + 1;
    };

    const fitSplitIndex = (paragraphs, text, includeTitle) => {
      let low = 1;
      let high = text.length;
      let best = 0;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        const candidate = text.slice(0, middle).trimEnd();
        if (candidate && writeMeasureContent(paragraphs.concat(candidate), includeTitle)) {
          best = middle;
          low = middle + 1;
        } else {
          high = middle - 1;
        }
      }
      return best > 0 ? readerSplitIndex(text, best) : 0;
    };

    const pages = [];
    let blockIndex = 0;
    let offset = 0;
    const maxPages = 80;
    while (blockIndex < sourceBlocks.length && pages.length < maxPages) {
      const includeTitle = pages.length === 0;
      const pageParagraphs = [];
      let madeProgress = false;

      while (blockIndex < sourceBlocks.length) {
        const source = sourceBlocks[blockIndex] || "";
        const remaining = source.slice(offset);
        if (!remaining.trim()) {
          blockIndex += 1;
          offset = 0;
          continue;
        }

        const fullParagraphs = pageParagraphs.concat(remaining);
        if (writeMeasureContent(fullParagraphs, includeTitle)) {
          pageParagraphs.push(remaining);
          blockIndex += 1;
          offset = 0;
          madeProgress = true;
          continue;
        }

        const splitIndex = fitSplitIndex(pageParagraphs, remaining, includeTitle);
        if (splitIndex > 0) {
          pageParagraphs.push(remaining.slice(0, splitIndex).trimEnd());
          offset += splitIndex;
          madeProgress = true;
        }
        break;
      }

      if (!madeProgress && blockIndex < sourceBlocks.length) {
        const source = sourceBlocks[blockIndex] || "";
        const forced = source.slice(offset, Math.min(source.length, offset + 1));
        if (forced) {
          pageParagraphs.push(forced);
          offset += forced.length;
          madeProgress = true;
        }
      }

      if (pageParagraphs.length > 0) {
        pages.push({ progress: "", paragraphs: pageParagraphs });
      } else {
        break;
      }

      if (blockIndex < sourceBlocks.length && offset >= sourceBlocks[blockIndex].length) {
        blockIndex += 1;
        offset = 0;
      }
    }

    measurer.remove();
    if (pages.length === 0) {
      return false;
    }

    pages.forEach((page, index) => {
      page.progress = readerProgressForPage(data, index, pages.length);
    });
    appState.readerPages = pages;
    appState.readerPaginationKey = key;
    appState.readerPageIndex = Math.max(0, Math.min(Number(appState.readerPageIndex) || 0, pages.length - 1));
    return true;
  }

  function settingsPageFor(route, data) {
    const previewBooks = (data.mainTabs.books || []).slice(0, 3).map((book) => ({
      title: book.title,
      meta: book.chapter,
      update: book.progress,
      badge: "1",
      cover: cover(data, book.coverKey)
    }));
    const pages = {
      "settings-general": {
        title: "通用设置",
        sections: [
          {
            title: "基础偏好",
            rows: [
              { type: "segment", icon: "palette", title: "App主题", value: "跟随系统", options: ["跟随系统", "浅色", "深色"] },
              { type: "select", icon: "globe", title: "语言", value: "简体中文", options: ["简体中文", "繁體中文", "English"] },
              { type: "select", icon: "home", title: "启动时打开", value: "书架", options: ["书架", "发现", "RSS", "设置"] }
            ]
          },
          {
            title: "行为与反馈",
            rows: [
              { type: "switch", icon: "refresh", title: "自动检查更新", meta: "有新版本时自动检查并提示", enabled: true },
              { type: "switch", icon: "top", title: "点击当前底栏回顶部", meta: "再次点击当前底栏按钮时回到页面顶部", enabled: true },
              { type: "switch", icon: "motion", title: "减少动态效果", meta: "降低动画效果以提升流畅度", enabled: true },
              { type: "switch", icon: "bug", title: "崩溃日志", meta: "仅保存本地诊断日志，便于排查问题", enabled: true, status: "已开启", statusTone: "good" },
              { type: "select", icon: "play", title: "动画效果", meta: "设置界面内的动画播放效果强度", value: "标准", options: ["减少", "标准", "增强"] },
              { type: "danger", tone: "danger", icon: "trash", title: "缓存清理", meta: "当前缓存 1.28 GB", actionLabel: "清理", overlay: "dialog:cache-clear" }
            ]
          }
        ],
        actions: [{ tone: "danger", icon: "refresh", title: "恢复默认", meta: "恢复通用设置默认值", overlay: "dialog" }],
        confirm: { title: "恢复通用设置？", copy: "恢复后将重置 App 主题、语言、启动页面和行为偏好。", confirmLabel: "确认恢复" },
        confirms: {
          "cache-clear": { title: "清理缓存？", copy: "将清除封面、章节和临时文件缓存，不会删除书籍与阅读进度。", confirmLabel: "确认清理" }
        }
      },
      "bookshelf-search-settings": {
        title: "书架与搜索",
        sections: [
          {
            title: "书架",
            rows: [
              { type: "segment", icon: "grid", title: "默认展示", value: "封面", options: ["封面", "列表"] },
              { type: "stepper", icon: "columns", title: "封面列数", value: "3列", minLabel: "-", maxLabel: "+" },
              { type: "select", icon: "folder", title: "默认分组", value: "全部", options: ["全部", "长篇追读", "资料", "未分组"] },
              { type: "switch", icon: "badge", title: "显示更新标记", meta: "在书籍封面上显示更新标记", enabled: true }
            ],
            preview: { books: previewBooks }
          },
          {
            title: "排序与筛选",
            rows: [
              { type: "select", icon: "sort", title: "书架排序", value: "最近更新", options: ["最近更新", "最近阅读", "书名", "作者"] },
              { type: "select", icon: "list", title: "展示范围", value: "全部", options: ["全部", "追更", "本地书", "未读", "已完结", "更新失败"] },
              { type: "select", icon: "refresh", title: "更新状态", value: "不限", options: ["不限", "有更新", "更新失败"] }
            ]
          },
          {
            title: "搜索",
            rows: [
              { type: "select", icon: "search", title: "搜索范围", value: "全局", options: ["当前分组", "书架", "全局"] },
              { type: "select", icon: "sort", title: "结果排序", value: "相关度", options: ["相关度", "最近阅读", "最近更新"] },
              { type: "switch", icon: "people", title: "合并同名同作者", meta: "搜索结果合并相同书名和作者的作品", enabled: true },
              { type: "switch", icon: "clock", title: "搜索历史", meta: "记录搜索关键词以便快速访问", enabled: true },
              { type: "select", icon: "list", title: "搜索历史数量", meta: "设置保存的搜索历史条数上限", value: "20条", options: ["10条", "20条", "50条"] }
            ]
          }
        ],
        actions: [{ tone: "danger", icon: "trash", title: "清空搜索历史", meta: "清除本机保存的搜索记录", overlay: "dialog" }],
        confirm: { title: "清空搜索历史？", copy: "清空后无法恢复，已保存的搜索关键词会被移除。", confirmLabel: "确认清空" }
      },
      "privacy-permissions": {
        title: "隐私与权限",
        sections: [
          {
            title: "系统权限",
            rows: [
              { type: "link", icon: "folder", title: "文件访问", meta: "访问设备上的文件和媒体内容", status: "已授权", statusTone: "good", value: "已允许" },
              { type: "link", icon: "bell", title: "通知权限", meta: "接收系统通知和消息提醒", status: "未授权", statusTone: "warn", actionLabel: "去设置" },
              { type: "link", icon: "battery", title: "电池优化", meta: "后台运行与电池使用受系统管理", value: "受系统管理" }
            ]
          },
          {
            title: "隐私设置",
            rows: [
              { type: "switch", icon: "eyeOff", title: "隐私开关", meta: "不记录最近阅读与搜索历史", enabled: false },
              { type: "switch", icon: "clock", title: "保存搜索历史", meta: "记录搜索关键词以便快速访问", enabled: true },
              { type: "switch", icon: "bug", title: "发送崩溃日志", meta: "仅在你主动确认后发送", enabled: false }
            ]
          },
          {
            title: "数据与说明",
            rows: [
              { type: "link", icon: "info", title: "网络访问说明", meta: "说明网络访问用途和可用边界" },
              { type: "link", icon: "file", title: "本地数据说明", meta: "了解本地数据的存储与使用" },
              { type: "link", icon: "shield", title: "隐私说明", meta: "查看隐私政策与相关条款" }
            ]
          }
        ],
        actions: [{ tone: "danger", icon: "trash", title: "清除隐私数据", meta: "清除所有隐私相关数据与记录", overlay: "dialog" }],
        confirm: { title: "清除隐私数据？", copy: "清除后将移除搜索历史、阅读痕迹和本地隐私记录。", confirmLabel: "确认清除" }
      },
      "about-feedback": {
        title: "关于与反馈",
        metrics: [
          { icon: "book", label: "当前版本", value: "Reader 1.0.0" },
          { icon: "code", label: "项目类型", value: "个人开源" },
          { icon: "check", label: "更新状态", value: "已是最新" },
          { icon: "file", label: "许可证", value: "开源许可" }
        ],
        sections: [
          {
            title: "项目与版本",
            rows: [
              { type: "link", icon: "info", title: "项目说明", meta: "个人作品与本地阅读器 demo 说明", value: "本地项目" },
              { type: "link", icon: "refresh", title: "检查更新", meta: "检查本地或远程发布版本", value: "已是最新" },
              { type: "link", icon: "file", title: "更新日志", meta: "查看最近版本变化和修复记录" }
            ]
          },
          {
            title: "反馈与支持",
            rows: [
              { type: "link", icon: "bug", title: "问题反馈", meta: "提交复现步骤、截图和日志片段", overlay: "dialog:feedback" },
              { type: "link", icon: "message", title: "功能建议", meta: "记录阅读、书架、书源等改进想法", overlay: "dialog:suggestion" },
              { type: "link", icon: "info", title: "使用帮助", meta: "查看常见操作和本地 demo 说明" }
            ]
          },
          {
            title: "开源与贡献",
            rows: [
              { type: "link", icon: "code", title: "源码仓库", meta: "查看项目代码、Issue 和提交记录" },
              { type: "link", icon: "link", title: "开源许可", meta: "查看项目使用的开源许可证和第三方依赖" },
              { type: "link", icon: "mail", title: "参与贡献", meta: "提交问题、建议或 Pull Request" }
            ]
          }
        ],
        actions: [
          { icon: "log", title: "导出诊断日志", meta: "导出运行日志、设备信息和最近错误，不包含书籍正文", overlay: "dialog:diagnostic" }
        ],
        confirms: {
          feedback: { title: "打开问题反馈？", copy: "反馈内容应包含问题现象、复现步骤、页面路径和必要截图。", confirmLabel: "继续反馈" },
          suggestion: { title: "记录功能建议？", copy: "建议会按阅读、书架、书源、设置等模块归类，便于后续排期。", confirmLabel: "继续记录" },
          diagnostic: { title: "导出诊断日志？", copy: "导出的日志只包含运行状态、错误信息和设备环境，不包含书籍正文。", confirmLabel: "确认导出" }
        }
      },
      "sync-backup": {
        title: "同步与备份",
        sections: [
          {
            title: "WebDAV 配置",
            layout: "webdav-form",
            rows: [
              { type: "input", inputType: "url", icon: "link", title: "服务器地址", meta: "WebDAV 服务地址", value: "https://dav.example.com/reader/backup", placeholder: "https://example.com/dav" },
              { type: "input", inputType: "text", icon: "people", title: "账号", meta: "用于连接远程备份空间", value: "reader@example.com", placeholder: "请输入账号" },
              { type: "input", inputType: "password", icon: "shield", title: "密码", meta: "本地加密保存", value: "reader-demo-password", placeholder: "请输入密码" },
              { type: "input", inputType: "text", icon: "folder", title: "同步目录", meta: "远程备份数据所在目录", value: "/ReaderBackup/ReaderAndroid", placeholder: "/ReaderBackup" }
            ],
            actions: [
              { icon: "refresh", title: "测试 WebDAV", meta: "验证当前连接信息是否可用", overlay: "dialog:webdav-test" },
              { icon: "check", title: "保存配置", meta: "保存后远程恢复使用此配置", overlay: "dialog:webdav-save" }
            ]
          },
          {
            title: "恢复数据",
            rows: [
              { type: "link", icon: "cloud", title: "WebDAV · 2026-06-23 08:00", meta: "完整备份 · 12.8 MB · 书架、进度、设置", value: "选择", route: "restore-confirm", restoreRecord: "WebDAV · 2026-06-23 08:00 · 完整备份" },
              { type: "link", icon: "cloud", title: "WebDAV · 2026-06-21 22:30", meta: "书架与设置 · 8.6 MB · 远程备份", value: "选择", route: "restore-confirm", restoreRecord: "WebDAV · 2026-06-21 22:30 · 书架与设置" },
              { type: "link", icon: "folder", title: "本地 · 2026-06-23 10:30", meta: "完整备份 · 12.8 MB · 本机文件", value: "选择", route: "restore-confirm", restoreRecord: "本地 · 2026-06-23 10:30 · 完整备份" },
              { type: "link", icon: "folder", title: "本地 · 2026-06-20 09:40", meta: "阅读进度 · 2.4 MB · 本机文件", value: "选择", route: "restore-confirm", restoreRecord: "本地 · 2026-06-20 09:40 · 阅读进度" }
            ]
          },
          {
            title: "恢复范围",
            rows: [
              { type: "switch", icon: "bookshelf", title: "书架与分组", meta: "恢复书架书籍、分组和排序", enabled: true },
              { type: "switch", icon: "clock", title: "阅读进度", meta: "恢复章节位置和阅读进度", enabled: true },
              { type: "switch", icon: "settings", title: "阅读与 App 设置", meta: "恢复主题、排版和通用设置", enabled: true }
            ]
          }
        ],
        confirms: {
          "webdav-test": { title: "测试 WebDAV 连接？", copy: "将使用当前服务器地址和账号发起一次连接验证。", confirmLabel: "开始测试" },
          "webdav-save": { title: "保存 WebDAV 配置？", copy: "保存后，远程恢复会从该 WebDAV 目录读取备份数据。", confirmLabel: "保存" }
        }
      },
      "webdav-config": {
        title: "WebDAV 配置",
        sections: [
          {
            title: "连接信息",
            layout: "webdav-form",
            rows: [
              { type: "input", inputType: "url", icon: "link", title: "服务器地址", meta: "WebDAV 服务地址", value: "https://dav.example.com/reader/backup", placeholder: "https://example.com/dav" },
              { type: "input", inputType: "text", icon: "people", title: "账号", meta: "用于连接远程备份空间", value: "reader@example.com", placeholder: "请输入账号" },
              { type: "input", inputType: "password", icon: "shield", title: "密码", meta: "本地加密保存", value: "reader-demo-password", placeholder: "请输入密码" },
              { type: "input", inputType: "text", icon: "folder", title: "同步目录", meta: "远程备份数据所在目录", value: "/ReaderBackup/ReaderAndroid", placeholder: "/ReaderBackup" }
            ],
            actions: [
              { icon: "refresh", title: "测试 WebDAV", meta: "验证当前连接信息是否可用", overlay: "dialog:webdav-test" },
              { icon: "check", title: "保存配置", meta: "保存后远程恢复使用此配置", overlay: "dialog:webdav-save" }
            ]
          },
          {
            title: "恢复范围",
            rows: [
              { type: "switch", icon: "bookshelf", title: "书架与分组", meta: "恢复书架书籍、分组和排序", enabled: true },
              { type: "switch", icon: "clock", title: "阅读进度", meta: "恢复章节位置和阅读进度", enabled: true },
              { type: "switch", icon: "settings", title: "阅读与 App 设置", meta: "恢复主题、排版和通用设置", enabled: true }
            ]
          }
        ],
        confirms: {
          "webdav-test": { title: "测试 WebDAV 连接？", copy: "将使用当前服务器地址和账号发起一次连接验证。", confirmLabel: "开始测试" },
          "webdav-save": { title: "保存 WebDAV 配置？", copy: "保存后，远程恢复会从该 WebDAV 目录读取备份数据。", confirmLabel: "保存" }
        }
      },
      "source-management": {
        title: "书源管理",
        metrics: [
          { icon: "source", label: "个书源", value: "12" },
          { icon: "check", label: "个启用", value: "8" },
          { icon: "warning", label: "个异常", value: "4" },
          { icon: "clock", label: "刚刚检测", value: "10:30" }
        ],
        searchBox: { placeholder: "搜索框：搜索书源名称或域名" },
        filters: [
          { label: "全部", active: true },
          { label: "已启用" },
          { label: "异常" },
          { label: "未检测" },
          { label: "自定义" }
        ],
        groups: [
          { label: "全部分组", active: true },
          { label: "玄幻书源" },
          { label: "起点导入" },
          { label: "测试书源" }
        ],
        sections: [
          {
            title: "批量操作",
            rows: [
              { type: "link", icon: "refresh", title: "检测", meta: "检测全部启用书源的可用状态", actionLabel: "开始检测" },
              { type: "link", icon: "info", title: "详情", meta: "查看书源状态、分组和检测入口" },
              { type: "link", icon: "edit", title: "编辑", meta: "进入书源详情后可编辑规则配置", overlay: "edit" },
              { type: "link", icon: "log", title: "错误日志", meta: "查看最近一次检测失败原因", overlay: "log" },
              { type: "switch", icon: "source", title: "启用开关", meta: "控制选中书源是否参与搜索与换源", enabled: true, overlay: "dialog" }
            ]
          }
        ],
        sources: [
          { title: "起点中文网", meta: "qidian.com · 起点导入", status: "可用", tone: "good", enabled: true },
          { title: "笔趣阁", meta: "biquge.example · 玄幻书源", status: "异常", tone: "warn", enabled: true },
          { title: "本地导入源", meta: "本地文件导入 · 自定义", status: "未检测", tone: "muted", enabled: false },
          { title: "测试书源", meta: "test.example · 测试书源", status: "可用", tone: "good", enabled: true }
        ],
        fab: { icon: "add", label: "新增" },
        subPanels: [
          { type: "edit", title: "SourceEditForm · 新增书源", rows: [{ label: "书源名称", value: "测试书源" }, { label: "域名", value: "test.example" }, { label: "分组", value: "测试书源" }], action: "保存" },
          { type: "log", title: "LogPanel · 错误日志", rows: [{ label: "ERROR", value: "笔趣阁目录解析失败，返回字段缺失。" }, { label: "WARN", value: "本地导入源尚未检测，可手动点击检测。" }] }
        ],
        confirm: { title: "禁用书源？", copy: "禁用后该书源不会参与搜索、发现和阅读中换源。", confirmLabel: "确认禁用" }
      }
    };
    return pages[route] || pages["settings-general"];
  }

  function settingsBadge(label, tone) {
    if (!label) return "";
    return `<em class="fd-settings-badge is-${esc(tone || "muted")}">${esc(label)}</em>`;
  }

  function settingsSwitch(enabled) {
    return `<span class="fd-settings-switch${enabled ? " is-on" : ""}" aria-hidden="true"><i></i></span>`;
  }

  function settingsSegment(row) {
    return `
      <span class="fd-settings-segment" aria-label="${esc(row.title)}">
        ${(row.options || []).map((option) => `<button class="${option === row.value ? "is-active" : ""}" type="button">${esc(option)}</button>`).join("")}
      </span>`;
  }

  function settingsStepper(row) {
    return `
      <span class="fd-settings-stepper" aria-label="${esc(row.title)}">
        <button type="button">${esc(row.minLabel || "-")}</button>
        <strong>${esc(row.value)}</strong>
        <button type="button">${esc(row.maxLabel || "+")}</button>
      </span>`;
  }

  function settingsRowSide(row) {
    const status = settingsBadge(row.status, row.statusTone);
    const selector = "";
    const stepper = row.type === "stepper" ? settingsStepper(row) : "";
    const toggle = row.type === "switch" ? settingsSwitch(row.enabled) : "";
    const value = row.value && !selector && !stepper ? `<strong class="fd-settings-value">${esc(row.value)}</strong>` : "";
    const action = row.actionLabel ? `<button class="fd-settings-row-action" type="button">${esc(row.actionLabel)}</button>` : "";
    const chevron = row.options || ["link", "select", "danger"].includes(row.type) ? icon("chevron", "fd-small-icon") : "";
    return `${status}${selector}${stepper}${value}${action}${toggle}${chevron}`;
  }

  function settingsOptionKey(route, title) {
    return `${route}:${String(title || "").replace(/\s+/g, "-")}`;
  }

  function settingsOptionDropdownHtml(row, route, appState) {
    if (!row.options || !row.options.length) return "";
    const key = settingsOptionKey(route, row.title);
    if (appState?.settingsExpandedOption !== key) return "";
    const current = row.value;
    const options = row.options.includes(current) ? row.options : [current].concat(row.options);
    return `
      <div class="fd-settings-option-dropdown" data-settings-option-dropdown="${esc(key)}" role="listbox" aria-label="${esc(row.title)}可选项">
        ${options.map((option) => `<button class="${option === current ? "is-selected" : ""}" type="button" role="option" aria-selected="${option === current ? "true" : "false"}" data-settings-option-choice="${esc(key)}" data-settings-option-value="${esc(option)}"><span>${esc(option)}</span>${option === current ? icon("check", "fd-small-icon") : ""}</button>`).join("")}
      </div>`;
  }

  function settingsRowHtml(row, route, appState) {
    if (row.type === "input") {
      return settingsInputRowHtml(row);
    }
    const key = row.options ? settingsOptionKey(route, row.title) : "";
    const optionOpen = row.options && appState?.settingsExpandedOption === key;
    const overlayAttr = row.overlay ? ` data-settings-overlay="${esc(row.overlay)}"` : row.options ? ` data-settings-option-key="${esc(key)}"` : row.route ? ` data-route="${esc(row.route)}"` : "";
    const restoreRecordAttr = row.restoreRecord ? ` data-restore-record="${esc(row.restoreRecord)}"` : "";
    return `
      <article class="fd-setting-row${row.type ? ` is-${esc(row.type)}` : ""}${row.tone === "danger" ? " is-danger" : ""}${optionOpen ? " is-option-open" : ""}"${overlayAttr}${restoreRecordAttr} role="${overlayAttr ? "button" : "group"}" tabindex="${overlayAttr ? "0" : "-1"}">
        <span>${icon(row.icon || "settings", "fd-small-icon")}</span>
        <strong>${esc(row.title)}${row.meta ? `<small>${esc(row.meta)}</small>` : ""}</strong>
        <em>${settingsRowSide(row)}</em>
        ${settingsOptionDropdownHtml(row, route, appState)}
      </article>`;
  }

  function settingsInputRowHtml(row) {
    const inputType = ["text", "url", "password"].includes(row.inputType) ? row.inputType : "text";
    return `
      <label class="fd-setting-row is-input-field">
        <span>${icon(row.icon || "settings", "fd-small-icon")}</span>
        <strong>${esc(row.title)}${row.meta ? `<small>${esc(row.meta)}</small>` : ""}</strong>
        <input type="${esc(inputType)}" value="${esc(row.value || "")}" placeholder="${esc(row.placeholder || "")}" aria-label="${esc(row.title)}" autocomplete="off">
      </label>`;
  }

  function settingsBookPreview(preview) {
    if (!preview) return "";
    const books = preview.books || [];
    return `
      <section class="fd-settings-bookshelf-preview" aria-label="书架布局预览">
        <div>
          <h3>${esc(preview.coverTitle || "封面模式预览")}</h3>
          <div>${books.map((book) => `<span><img src="${esc(book.cover)}" alt="${esc(book.title)}封面"><i>${esc(book.badge || "")}</i><strong>${esc(book.title)}</strong></span>`).join("")}</div>
        </div>
        <div>
          <h3>${esc(preview.listTitle || "列表模式预览")}</h3>
          ${books.map((book) => `<article><img src="${esc(book.cover)}" alt="${esc(book.title)}封面"><span><strong>${esc(book.title)}</strong><small>${esc(book.meta)}</small></span><em>${esc(book.update)}</em></article>`).join("")}
        </div>
      </section>`;
  }

  function settingsSectionHtml(section, route, appState) {
    return `
      <section class="fd-setting-section${section.layout ? ` is-${esc(section.layout)}` : ""}" data-slot="settingSection">
        <h2>${esc(section.title)}</h2>
        ${section.rows.map((row) => settingsRowHtml(row, route, appState)).join("")}
        ${settingsSectionActionsHtml(section.actions)}
        ${settingsBookPreview(section.preview)}
      </section>`;
  }

  function settingsSectionActionsHtml(actions) {
    if (!actions || !actions.length) return "";
    return `
      <div class="fd-settings-section-actions" aria-label="配置操作">
        ${actions.map((item) => `
          <button type="button" data-settings-overlay="${esc(item.overlay || "dialog")}">
            ${icon(item.icon || "info", "fd-small-icon")}
            <span><strong>${esc(item.title)}</strong>${item.meta ? `<small>${esc(item.meta)}</small>` : ""}</span>
          </button>`).join("")}
      </div>`;
  }

  function settingsMetricsHtml(metrics) {
    if (!metrics || !metrics.length) return "";
    return `
      <section class="fd-settings-metric-grid" aria-label="设置概览指标">
        ${metrics.map((item) => `<article>${icon(item.icon, "fd-small-icon")}<span><strong>${esc(item.value)}</strong><small>${esc(item.label)}</small></span></article>`).join("")}
      </section>`;
  }

  function settingsStorageHtml(storage) {
    if (!storage) return "";
    return `
      <section class="fd-settings-storage-card" aria-label="缓存占用">
        <header><strong>${esc(storage.title)}</strong><span>${esc(storage.value)}</span></header>
        <i style="--used:${esc(pct(storage.percent || "0%"))}"><b></b></i>
        <p>${esc(storage.copy)}</p>
      </section>`;
  }

  function settingsSearchHtml(searchBox) {
    if (!searchBox) return "";
    return `<label class="fd-settings-search-box">${icon("search", "fd-small-icon")}<span>${esc(searchBox.placeholder)}</span></label>`;
  }

  function settingsChipsHtml(items, label) {
    if (!items || !items.length) return "";
    return `<nav class="fd-settings-chip-row" aria-label="${esc(label)}">${items.map((item) => `<button class="${item.active ? "is-active" : ""}" type="button">${esc(item.label)}</button>`).join("")}</nav>`;
  }

  function settingsActionRowsHtml(actions) {
    if (!actions || !actions.length) return "";
    return `
      <section class="fd-settings-action-list" aria-label="设置操作">
        ${actions.map((item) => `
          <button class="${item.tone === "danger" ? "is-danger" : ""}" type="button" data-settings-overlay="${esc(item.overlay || "dialog")}">
            ${icon(item.icon || "info", "fd-small-icon")}
            <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
            ${icon("chevron", "fd-small-icon")}
          </button>`).join("")}
      </section>`;
  }

  function settingsRecordsHtml(records) {
    if (!records || !records.length) return "";
    return `
      <section class="fd-settings-record-list" aria-label="备份记录">
        <h2>备份记录</h2>
        ${records.map((item) => `<article>${icon(item.icon || "file", "fd-small-icon")}<span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>${settingsBadge(item.status, item.tone)}</article>`).join("")}
      </section>`;
  }

  function settingsSourceRowsHtml(sources) {
    if (!sources || !sources.length) return "";
    return `
      <section class="fd-settings-source-list" aria-label="书源列表">
        <h2>书源列表</h2>
        ${sources.map((item) => `
          <article class="fd-settings-source-row">
            ${icon("source", "fd-small-icon")}
            <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
            ${settingsBadge(item.status, item.tone)}
            ${settingsSwitch(item.enabled)}
          </article>`).join("")}
      </section>`;
  }

  function settingsSubPanelsHtml(panels) {
    if (!panels || !panels.length) return "";
    return `
      <section class="fd-settings-subpanels" aria-label="书源子状态">
        ${panels.map((panel) => `
          <article class="fd-settings-subpanel is-${esc(panel.type)}">
            <h2>${esc(panel.title)}</h2>
            ${(panel.rows || []).map((row) => `<p><strong>${esc(row.label)}</strong><span>${esc(row.value)}</span></p>`).join("")}
            ${panel.action ? `<button type="button">${esc(panel.action)}</button>` : ""}
          </article>`).join("")}
      </section>`;
  }

  function settingsOptionSheetHtml(page) {
    const optionRows = (page.sections || []).flatMap((section) => section.rows || []).filter((row) => row.options && row.options.length);
    const row = optionRows[0];
    if (!row) return "";
    return `
      <section class="fd-demo-sheet fd-settings-option-sheet" aria-hidden="false">
        <div class="fd-sheet-grabber"></div>
        <h2>${esc(row.title)}</h2>
        ${(row.options || []).map((option) => `<button class="${option === row.value ? "is-selected" : ""}" type="button">${esc(option)}</button>`).join("")}
        <button type="button" data-close-settings-overlay>取消</button>
      </section>`;
  }

  function settingsDialogHtml(page, overlay) {
    const overlayKey = String(overlay || "").startsWith("dialog:") ? String(overlay).slice("dialog:".length) : "";
    const confirm = overlayKey && page.confirms ? page.confirms[overlayKey] || {} : page.confirm || {};
    if (!confirm.title) return "";
    return `
      <section class="fd-demo-dialog fd-settings-confirm-dialog" aria-hidden="false">
        <h2>${esc(confirm.title)}</h2>
        <p>${esc(confirm.copy)}</p>
        <div>
          <button type="button" data-close-settings-overlay>${esc(confirm.cancelLabel || "取消")}</button>
          <button type="button" data-close-settings-overlay>${esc(confirm.confirmLabel || "确认")}</button>
        </div>
      </section>`;
  }

  function settingsScreen(data, route, appState) {
    const page = settingsPageFor(route, data);
    const values = appState?.settingsValues || {};
    (page.sections || []).forEach((section) => {
      (section.rows || []).forEach((row) => {
        if (row.options && row.options.length) {
          const key = settingsOptionKey(route, row.title);
          if (values[key]) {
            row.value = values[key];
          }
        }
      });
    });
    const overlay = appState?.settingsOverlay || "";
    const frameState = overlay === "sheet" ? " has-sheet" : overlay.startsWith("dialog") ? " has-dialog" : "";
    const contentHtml = `
      ${settingsMetricsHtml(page.metrics)}
      ${settingsStorageHtml(page.storage)}
      ${settingsSearchHtml(page.searchBox)}
      ${settingsChipsHtml(page.filters, "书源状态筛选")}
      ${settingsChipsHtml(page.groups, "书源分组筛选")}
      ${(page.sections || []).map((section) => settingsSectionHtml(section, route, appState)).join("")}
      ${settingsActionRowsHtml(page.actions)}
      ${settingsRecordsHtml(page.records)}
      ${settingsSourceRowsHtml(page.sources)}
      ${settingsSubPanelsHtml(page.subPanels)}
      ${page.fab ? `<button class="fd-settings-fab" type="button">${icon(page.fab.icon || "add", "fd-small-icon")}<span>${esc(page.fab.label)}</span></button>` : ""}`;
    return shellKit().renderSettingsShell(Object.assign(phoneShellClasses(`fd-settings-phone${frameState}`), {
      data,
      title: page.title,
      ariaLabel: page.title,
      topBarClass: "fd-back-bar",
      contentClass: "fd-phone-content fd-settings-content",
      toastHostClass: "fd-toast-host",
      dialogHostClass: "fd-dialog-host",
      stateHostClass: "fd-settings-state-host",
      contentHtml,
      toastHtml: page.toast ? `<section class="fd-settings-toast">${esc(page.toast)}</section>` : "",
      dialogHtml: `${overlay === "sheet" ? settingsOptionSheetHtml(page) : ""}${overlay.startsWith("dialog") ? settingsDialogHtml(page, overlay) : ""}`
    }));
  }

  function restoreStepBadge(status, tone) {
    return settingsBadge(status, tone);
  }

  function restoreSummaryRows(rows) {
    return rows.map(([label, value]) => `
      <article>
        <span>${esc(label)}</span>
        <strong>${esc(value)}</strong>
      </article>`).join("");
  }

  function restoreStageList(stages) {
    return `
      <section class="fd-restore-stage-list" aria-label="恢复阶段">
        ${stages.map((stage) => `
          <article class="${stage.active ? "is-active" : ""}${stage.done ? " is-done" : ""}">
            ${icon(stage.done ? "check" : stage.active ? "refresh" : "clock", "fd-small-icon")}
            <span>
              <strong>${esc(stage.title)}</strong>
              <small>${esc(stage.meta)}</small>
            </span>
            ${restoreStepBadge(stage.status, stage.tone)}
            <i style="--restore-progress:${esc(stage.progress || "0%")}"><b></b></i>
          </article>`).join("")}
      </section>`;
  }

  function restoreConflictRows(items) {
    return `
      <section class="fd-restore-conflict-list" aria-label="恢复冲突列表">
        ${items.map((item) => `
          <article>
            <span>
              <strong>${esc(item.title)}</strong>
              <small>${esc(item.meta)}</small>
            </span>
            <div>
              <button type="button">${esc(item.local)}</button>
              <button class="is-selected" type="button">${esc(item.remote)}</button>
            </div>
          </article>`).join("")}
      </section>`;
  }

  function restoreFlowScreen(data, route, appState) {
    const restoreRecord = appState?.selectedRestoreRecord || "WebDAV · 2026-06-23 08:00 · 完整备份";
    const scopeRows = [
      ["备份来源", restoreRecord],
      ["恢复范围", "书架与分组、阅读进度、阅读与 App 设置"],
      ["预计影响", "128 本书 · 12 个分组 · 3 项设置"],
      ["可回退点", "恢复前自动生成本地快照"]
    ];
    const pages = {
      "restore-confirm": {
        title: "恢复确认",
        badge: restoreStepBadge("待确认", "warn"),
        content: `
          <section class="fd-restore-card">
            <h2>确认恢复数据</h2>
            <p>将使用选中的备份覆盖本机同类数据。恢复前会创建本地快照，取消不会改变当前数据。</p>
            <div class="fd-restore-summary-grid">${restoreSummaryRows(scopeRows)}</div>
          </section>
          <section class="fd-restore-warning">
            ${icon("warning", "fd-small-icon")}
            <span><strong>覆盖提醒</strong><small>冲突项会在恢复过程中单独确认，不会静默覆盖。</small></span>
          </section>
          <section class="fd-restore-actions">
            <button type="button" data-route="sync-backup">取消</button>
            <button class="is-primary" type="button" data-route="restore-progress">开始恢复</button>
          </section>`
      },
      "restore-progress": {
        title: "恢复进度",
        badge: restoreStepBadge("进行中", "warn"),
        content: `
          <section class="fd-restore-card">
            <h2>正在恢复</h2>
            <p>当前正在合并书架和阅读进度。离开页面不会中断恢复，完成后会进入结果状态。</p>
            <div class="fd-restore-progress-meter" style="--restore-progress:68%"><i><b></b></i><span>68%</span></div>
          </section>
          ${restoreStageList([
            { title: "下载备份", meta: "12.8 MB · WebDAV", status: "完成", tone: "good", progress: "100%", done: true },
            { title: "校验文件", meta: "manifest、hash、版本兼容", status: "完成", tone: "good", progress: "100%", done: true },
            { title: "合并数据", meta: "书架 128 本 · 进度 96 条", status: "进行中", tone: "warn", progress: "68%", active: true },
            { title: "写入设置", meta: "等待合并完成", status: "等待", tone: "muted", progress: "0%" }
          ])}
          <section class="fd-restore-actions">
            <button type="button" data-route="restore-conflict">处理冲突</button>
            <button class="is-primary" type="button" data-route="restore-result">查看结果</button>
          </section>`
      },
      "restore-conflict": {
        title: "恢复冲突",
        badge: restoreStepBadge("3 项冲突", "warn"),
        content: `
          <section class="fd-restore-card">
            <h2>选择冲突处理方式</h2>
            <p>以下项目本地和备份均有更新。请选择保留本地或使用备份，选择后恢复会继续。</p>
          </section>
          ${restoreConflictRows([
            { title: "分组：玄幻连载", meta: "本地 42 本 · 远程 46 本", local: "保留本地", remote: "使用备份" },
            { title: "阅读进度：长夜余火", meta: "本地第 32 章 · 远程第 35 章", local: "本地进度", remote: "远程进度" },
            { title: "阅读设置：浅色主题", meta: "本地字号 18 · 远程字号 17", local: "本机设置", remote: "备份设置" }
          ])}
          <section class="fd-restore-actions">
            <button type="button" data-route="restore-progress">返回进度</button>
            <button class="is-primary" type="button" data-route="restore-result">应用选择</button>
          </section>`
      },
      "restore-result": {
        title: "恢复结果",
        badge: restoreStepBadge("部分成功", "warn"),
        content: `
          <section class="fd-restore-card is-result">
            <h2>恢复完成</h2>
            <p>书架、分组和阅读进度已恢复。1 条书源配置因版本不兼容被跳过，可在日志中查看详情。</p>
            <div class="fd-restore-summary-grid">${restoreSummaryRows([
              ["恢复书籍", "128 本"],
              ["恢复分组", "12 个"],
              ["恢复进度", "96 条"],
              ["跳过项目", "1 条"]
            ])}</div>
          </section>
          <section class="fd-restore-stage-list" aria-label="恢复结果明细">
            <article class="is-done">${icon("check", "fd-small-icon")}<span><strong>书架与分组</strong><small>已恢复 128 本书和 12 个分组</small></span>${restoreStepBadge("成功", "good")}</article>
            <article class="is-done">${icon("check", "fd-small-icon")}<span><strong>阅读进度</strong><small>已恢复 96 条进度记录</small></span>${restoreStepBadge("成功", "good")}</article>
            <article>${icon("warning", "fd-small-icon")}<span><strong>书源配置</strong><small>1 条旧版规则字段不兼容</small></span>${restoreStepBadge("跳过", "warn")}</article>
          </section>
          <section class="fd-restore-actions">
            <button type="button">查看日志</button>
            <button class="is-primary" type="button" data-route="sync-backup">返回同步页</button>
          </section>`
      }
    };
    const page = pages[route] || pages["restore-confirm"];
    const contentHtml = `
      <section class="fd-restore-flow" aria-label="${esc(page.title)}">
        <article class="fd-source-detail-head fd-restore-head">
          <span><strong>${esc(page.title)}</strong><small>${esc(restoreRecord)}</small></span>
          ${page.badge}
        </article>
        ${page.content}
      </section>`;
    return shellKit().renderSettingsShell(Object.assign(phoneShellClasses("fd-settings-phone"), {
      data,
      title: page.title,
      ariaLabel: page.title,
      topBarClass: "fd-back-bar",
      contentClass: "fd-phone-content fd-settings-content fd-restore-content",
      toastHostClass: "fd-toast-host",
      dialogHostClass: "fd-dialog-host",
      stateHostClass: "fd-settings-state-host",
      contentHtml
    }));
  }

  const sourceItems = [
    { title: "起点中文网", domain: "qidian.com", group: "起点导入", status: "可用", tone: "good", enabled: true },
    { title: "笔趣阁", domain: "biquge.example", group: "玄幻书源", status: "异常", tone: "warn", enabled: true, selected: true },
    { title: "本地导入源", domain: "本地文件导入", group: "自定义", status: "未检测", tone: "muted", enabled: false },
    { title: "测试书源", domain: "test.example", group: "测试书源", status: "可用", tone: "good", enabled: true },
    { title: "轻小说文库", domain: "lightnovel.example", group: "测试书源", status: "可用", tone: "good", enabled: true },
    { title: "旧规则源", domain: "old.example", group: "自定义", status: "异常", tone: "warn", enabled: true, selected: true },
    { title: "飞卢小说网", domain: "faloo.com", group: "玄幻书源", status: "可用", tone: "good", enabled: true },
    { title: "晋江文学城", domain: "jjwx.example", group: "起点导入", status: "可用", tone: "good", enabled: true },
    { title: "纵横中文网", domain: "zongheng.com", group: "玄幻书源", status: "未检测", tone: "muted", enabled: false },
    { title: "豆瓣阅读", domain: "read.douban.com", group: "自定义", status: "可用", tone: "good", enabled: true },
    { title: "失效示例源", domain: "dead.example", group: "测试书源", status: "异常", tone: "warn", enabled: false, selected: true }
  ];

  function sourceShell(data, title, contentHtml, options) {
    const trailingHtml = options?.trailingHtml;
    return shellKit().renderSettingsShell(Object.assign(phoneShellClasses("fd-settings-phone fd-source-demo-phone"), {
      data,
      title,
      ariaLabel: title,
      topBarClass: "fd-back-bar",
      trailingHtml,
      contentClass: "fd-phone-content fd-settings-content fd-source-demo-content",
      bottomActionHostClass: "fd-bottom-action-host fd-source-control-host",
      toastHostClass: "fd-toast-host",
      sheetHostClass: "fd-sheet-host",
      dialogHostClass: "fd-dialog-host",
      stateHostClass: "fd-settings-state-host",
      contentHtml,
      bottomActionHtml: options?.bottomActionHtml || "",
      sheetHtml: options?.sheetHtml || "",
      dialogHtml: options?.dialogHtml || ""
    }));
  }

  function sourceBottomActions(actions, extraClass) {
    return `<div class="fd-source-bottom-bar ${esc(extraClass || "")}">${actions.map((action) => {
      const routeAttr = action.route ? ` data-route="${esc(action.route)}"` : "";
      const replaceAttr = action.replace ? " data-route-replace" : "";
      const classAttr = action.className ? ` class="${esc(action.className)}"` : "";
      return `<button${classAttr} type="button"${routeAttr}${replaceAttr}>${action.icon ? icon(action.icon, "fd-small-icon") : ""}${esc(action.label)}</button>`;
    }).join("")}</div>`;
  }

  function sourceHomeBottomActions() {
    return sourceBottomActions([
      { label: "批量管理", route: "source-batch" },
      { label: "新增书源", route: "source-import-options" }
    ], "is-fixed");
  }

  function sourceBadge(item) {
    return `<em class="fd-source-badge is-${esc(item.tone || "muted")}"><i></i>${esc(item.status || "")}</em>`;
  }

  function sourceSwitch(enabled, title) {
    return `<button class="fd-source-switch${enabled ? " is-on" : ""}" type="button" data-source-switch="${esc(title || "")}" aria-label="${esc(title || "书源")}${enabled ? "已启用，点击禁用" : "已禁用，点击启用"}" aria-pressed="${enabled ? "true" : "false"}"><i></i></button>`;
  }

  function sourceSearchAndFilters() {
    return `
      <label class="fd-source-search">${icon("search", "fd-small-icon")}<span>搜索书源名称或域名</span></label>
      <p class="fd-source-stat-line">12 个书源 · 8 个启用 · 4 个异常 · 10:30 检测</p>
      <nav class="fd-source-chip-row" aria-label="书源状态筛选">
        ${["全部", "已启用", "异常", "未检测", "自定义"].map((item, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button">${esc(item)}</button>`).join("")}
      </nav>
      <nav class="fd-source-chip-row is-group" aria-label="书源分组筛选">
        ${["全部分组", "玄幻书源", "起点导入", "测试书源"].map((item, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button" data-route="${index === 0 ? "source-groups" : "source-management"}">${esc(item)}</button>`).join("")}
      </nav>`;
  }

  function sourceRow(item, mode) {
    const isBatch = mode === "batch";
    const selected = Boolean(item.selected);
    return `
      <article class="fd-source-row${selected ? " is-selected" : ""}"${isBatch ? "" : ' role="button" tabindex="0" data-route="source-detail"'}>
        ${isBatch ? `<button class="fd-source-check${selected ? " is-checked" : ""}" type="button" aria-label="${esc(item.title)}${selected ? "已选择" : "未选择"}">${selected ? icon("check", "fd-small-icon") : ""}</button>` : ""}
        <span class="fd-source-row-main"><strong>${esc(item.title)}</strong><small>${esc(item.domain)} · ${esc(item.group)}</small></span>
        ${sourceBadge(item)}
        ${sourceSwitch(item.enabled, item.title)}
        ${isBatch ? "" : `<button class="fd-source-row-test" type="button" data-route="source-detect" aria-label="检测 ${esc(item.title)}">${icon("activity", "fd-small-icon")}</button>`}
      </article>`;
  }

  function sourceList(items, mode, appState) {
    return `<section class="fd-source-list" aria-label="书源列表">${items.map((item) => sourceRow(Object.assign({}, item, {
      enabled: Object.prototype.hasOwnProperty.call(appState?.sourceEnabled || {}, item.title) ? appState.sourceEnabled[item.title] : item.enabled
    }), mode)).join("")}</section>`;
  }

  function sourceHomeContent(menuOpen, appState) {
    return `
      <section class="fd-source-home">
        ${menuOpen ? `
          <nav class="fd-source-more-menu" aria-label="书源更多操作">
            <button type="button" data-route="source-import-preview">网络导入</button>
            <button type="button" data-route="source-import-preview">本地导入</button>
            <button type="button" data-route="source-rule-edit">新建书源</button>
            <button type="button" data-route="source-batch">批量管理</button>
            <button type="button" data-route="source-groups">分组管理</button>
            <button type="button" data-route="source-batch">校验所选</button>
            <button type="button" data-route="source-logs">错误日志</button>
          </nav>` : ""}
        ${sourceSearchAndFilters()}
        ${sourceList(sourceItems, "home", appState)}
      </section>`;
  }

  function sourceManagementScreen(data, appState) {
    return sourceShell(data, "书源管理", sourceHomeContent(Boolean(appState?.sourceMenuOpen), appState), {
      trailingHtml: `<button type="button" aria-label="更多" data-source-menu-toggle>${icon("more", "fd-small-icon")}</button>`,
      bottomActionHtml: sourceHomeBottomActions()
    });
  }

  function sourceImportOptionsScreen(data, appState) {
    return sourceShell(data, "书源管理", sourceHomeContent(false, appState), {
      bottomActionHtml: sourceHomeBottomActions(),
      sheetHtml: `
      <section class="fd-source-bottom-sheet" aria-label="添加书源">
        <div class="fd-sheet-grabber"></div>
        <h2>添加书源</h2>
        ${[
          ["cloud", "网络导入", "从 URL 拉取书源包", "source-import-preview"],
          ["folder", "本地导入", "选择本地 JSON 或 TXT 文件", "source-import-preview"],
          ["file", "剪贴板导入", "解析剪贴板中的书源内容", "source-import-preview"],
          ["edit", "手动新建", "进入空白书源编辑页", "source-rule-edit"]
        ].map(([itemIcon, title, meta, route]) => `<button type="button" data-route="${esc(route)}">${icon(itemIcon, "fd-small-icon")}<span><strong>${esc(title)}</strong><small>${esc(meta)}</small></span>${chevron("fd-small-icon")}</button>`).join("")}
        <button class="is-cancel" type="button" data-route="source-management" data-route-replace>取消</button>
      </section>`
    });
  }

  function sourceImportPreviewScreen(data) {
    const rows = [
      ["起点中文网", "qidian.com · 起点导入", "新增", "good"],
      ["晋江文学城", "jjwx.example · 起点导入", "重复", "muted"],
      ["轻小说文库", "lightnovel.example · 测试书源", "新增", "good"],
      ["旧规则源", "old.example · 自定义", "重复", "muted"],
      ["失效示例源", "dead.example · 测试书源", "异常", "warn"],
      ["豆瓣阅读", "read.douban.com · 自定义", "新增", "good"],
      ["开源书源示例", "opensource.example · 测试书源", "新增", "good"]
    ];
    const content = `
      <section class="fd-source-import">
        <article class="fd-source-import-origin"><span><strong>网络导入</strong><small>https://example.com/booksource.json</small></span><button type="button" data-route="source-import-options">更换</button></article>
        <p class="fd-source-stat-line">共 24 个书源 · 18 个新增 · 4 个重复 · 2 个异常</p>
        <h2 class="fd-source-section-title">冲突处理</h2>
        <nav class="fd-source-segment" aria-label="冲突处理"><button class="is-active" type="button">跳过重复</button><button type="button">覆盖旧源</button><button type="button">保留两份</button></nav>
        <article class="fd-source-form-row"><span><strong>导入到分组</strong><small>可在导入后批量调整分组</small></span><em>保持原分组</em>${chevron("fd-small-icon")}</article>
        <section class="fd-source-preview-list" aria-label="导入预览">
          ${rows.map(([title, meta, status, tone]) => `<article><span><strong>${esc(title)}</strong><small>${esc(meta)}</small></span>${sourceBadge({ status, tone })}</article>`).join("")}
        </section>
      </section>`;
    return sourceShell(data, "导入书源", content, {
      bottomActionHtml: sourceBottomActions([
        { label: "取消", route: "source-management" },
        { label: "确认导入", route: "source-management" }
      ])
    });
  }

  function sourceBatchScreen(data, appState) {
    return sourceShell(data, "已选 3 个", `
      <section class="fd-source-home fd-source-batch">
        <div class="fd-source-batch-top"><button type="button" data-route="source-management">取消</button><strong>已选 3 个</strong><button type="button">全选</button></div>
        ${sourceSearchAndFilters()}
        ${sourceList(sourceItems, "batch", appState)}
      </section>`, {
        bottomActionHtml: sourceBottomActions([
          { label: "启用", icon: "check" },
          { label: "禁用", icon: "close" },
          { label: "检测", icon: "activity" },
          { label: "分组", icon: "folder", route: "source-groups" },
          { label: "删除", icon: "trash", route: "source-delete-confirm", className: "is-danger" }
        ], "fd-source-batch-actions")
      });
  }

  function sourceGroupsScreen(data) {
    const groups = [["全部分组", "12 个书源"], ["玄幻书源", "4 个书源"], ["起点导入", "3 个书源"], ["测试书源", "3 个书源"], ["自定义", "2 个书源"], ["未分组", "1 个书源"]];
    return sourceShell(data, "分组管理", `
      <section class="fd-source-groups">
        <p class="fd-source-note">分组用于筛选和批量整理书源，删除分组不会删除书源。</p>
        <section class="fd-source-group-list">${groups.map(([title, meta], index) => `<article><span><strong>${esc(title)}</strong><small>${esc(meta)}</small></span><button type="button">${icon("edit", "fd-small-icon")}</button><button type="button">${icon("drag", "fd-small-icon")}</button>${index === 1 ? "<em>当前筛选</em>" : ""}</article>`).join("")}</section>
      </section>`, {
        trailingHtml: `<button type="button">新增</button>`,
        bottomActionHtml: sourceBottomActions([
          { label: "批量移动" },
          { label: "新增分组" }
        ])
      });
  }

  function sourceDetailScreen(data) {
    const modules = [["站点", "可访问", "good"], ["搜索", "正常", "good"], ["详情", "正常", "good"], ["目录", "正常", "good"], ["正文", "异常", "warn"], ["登录", "未启用", "muted"]];
    return sourceShell(data, "书源详情", `
      <section class="fd-source-detail">
        <article class="fd-source-detail-head"><span><strong>笔趣阁</strong><small>biquge.example · 玄幻书源</small></span>${sourceSwitch(true, "笔趣阁")}</article>
        <p class="fd-source-stat-line"><b>异常</b> · 最近检测 10:30 · 规则版本 3</p>
        <section class="fd-source-module-list">${modules.map(([title, status, tone]) => `<article><strong>${esc(title)}</strong>${sourceBadge({ status, tone })}</article>`).join("")}</section>
        <article class="fd-source-detect-card">
          <h2>最近检测结果</h2>
          <p>搜索、详情、目录均可解析；正文模块失败。</p>
          <small>失败规则：正文内容规则“#content@text”返回空内容。建议进入规则编辑后调测正文模块。</small>
        </article>
        <section class="fd-source-info-grid" aria-label="书源基础信息">
          <article><strong>请求方式</strong><span>GET · UTF-8</span></article>
          <article><strong>并发限制</strong><span>2 个请求</span></article>
          <article><strong>Cookie</strong><span>未启用</span></article>
          <article><strong>更新时间</strong><span>今天 10:12</span></article>
        </section>
        <section class="fd-source-action-grid">
          <button type="button">${icon("copy", "fd-small-icon")}复制书源</button>
          <button type="button">${icon("upload", "fd-small-icon")}导出书源</button>
        </section>
      </section>`, {
        bottomActionHtml: sourceBottomActions([
          { label: "检测此源", route: "source-detect" },
          { label: "编辑规则", route: "source-rule-edit" },
          { label: "删除", route: "source-delete-confirm", className: "is-danger" }
        ], "fd-source-detail-controls is-fixed")
      });
  }

  function sourceDetectScreen(data) {
    const steps = [
      ["站点访问", "200 OK · 126ms", "通过", "good"],
      ["搜索规则", "关键词“斗破苍穹”返回 12 条", "通过", "good"],
      ["详情规则", "书名、作者、封面、简介均解析成功", "通过", "good"],
      ["目录规则", "解析 812 章，章节 URL 有效", "通过", "good"],
      ["正文规则", "“#content@text”返回空内容", "失败", "warn"]
    ];
    const debugRouteForStep = (title) => ({
      "站点访问": "source-code-view",
      "搜索规则": "source-debug-search-result",
      "详情规则": "source-debug-detail-result",
      "目录规则": "source-debug-catalog-result",
      "正文规则": "source-debug"
    }[title] || "source-debug");
    return sourceShell(data, "书源检测", `
      <section class="fd-source-detect">
        <article class="fd-source-detail-head"><span><strong>笔趣阁</strong><small>检测对象 · biquge.example</small></span>${sourceBadge({ status: "异常", tone: "warn" })}</article>
        <section class="fd-source-detect-summary">
          <strong>5 项检测 · 4 项通过 · 1 项失败</strong>
          <span>总耗时 1260ms · 最近检测 10:30</span>
        </section>
        <section class="fd-source-detect-steps" aria-label="检测步骤">
          ${steps.map(([title, detail, status, tone]) => `
            <article>
              ${sourceBadge({ status, tone })}
              <span><strong>${esc(title)}</strong><small>${esc(detail)}</small></span>
              <button type="button" data-route="${debugRouteForStep(title)}">${title === "站点访问" ? "源码" : "调测"}</button>
            </article>`).join("")}
        </section>
        <article class="fd-source-detect-card">
          <h2>失败定位</h2>
          <p>正文请求成功，但正文选择器没有匹配到有效文本。</p>
          <small>下一步应进入正文模块调测，比较原始 HTML 与当前正文规则。</small>
        </article>
      </section>`, {
        bottomActionHtml: sourceBottomActions([
          { label: "重新检测" },
          { label: "编辑正文规则", route: "source-rule-edit" }
        ])
      });
  }

  function sourceRuleEditScreen(data) {
    const basicRows = [["书源名称", "笔趣阁"], ["书源地址", "https://biquge.example"], ["书源分组", "玄幻书源"], ["启用状态", "已启用"]];
    const requestRows = [["请求方式", "GET"], ["字符编码", "UTF-8"], ["请求头", "User-Agent / Referer"], ["Cookie", "未启用"]];
    const parseRows = [["正文页 URL", "{{chapterUrl}}"], ["章节标题", ".chapter-title@text"], ["正文内容", "#content@text"], ["下一页", ".next@href"]];
    const postRows = [["内容过滤", ".ad, script, style"], ["段落处理", "保留段落换行"], ["净化规则", "去除空行"], ["失败回退", "尝试正文备用规则"]];
    const ruleRowsHtml = (rows) => rows.map(([label, value]) => `
      <article>
        <span>${esc(label)}</span>
        <button type="button" data-route="source-debug"><strong>${esc(value)}</strong>${chevron("fd-small-icon")}</button>
      </article>`).join("");
    return sourceShell(data, "规则编辑", `
      <section class="fd-source-edit">
        <article class="fd-source-detail-head"><span><strong>笔趣阁</strong><small>正在编辑：正文规则</small></span>${sourceSwitch(true, "笔趣阁")}</article>
        <nav class="fd-source-module-tabs">${["基本", "搜索", "详情", "目录", "正文", "高级"].map((item) => `<button class="${item === "正文" ? "is-active" : ""}" type="button">${esc(item)}</button>`).join("")}</nav>
        <section class="fd-source-rule-overview" aria-label="规则编辑概览">
          <article><strong>当前模块</strong><span>正文</span></article>
          <article><strong>最近调测</strong><span>失败 · 0 字</span></article>
          <article><strong>规则版本</strong><span>v3</span></article>
        </section>
        <section class="fd-source-rule-section">
          <h2>基础配置</h2>
          <div class="fd-source-rule-form is-edit-form">${ruleRowsHtml(basicRows)}</div>
        </section>
        <section class="fd-source-rule-section">
          <h2>请求配置</h2>
          <div class="fd-source-rule-form is-edit-form">${ruleRowsHtml(requestRows)}</div>
        </section>
        <section class="fd-source-rule-section">
          <h2>解析规则</h2>
          <div class="fd-source-rule-form is-edit-form">${ruleRowsHtml(parseRows)}</div>
        </section>
        <section class="fd-source-rule-section">
          <h2>后处理</h2>
          <div class="fd-source-rule-form is-edit-form">${ruleRowsHtml(postRows)}</div>
        </section>
        <section class="fd-source-rule-help">
          <h2>当前规则说明</h2>
          <p>正文规则用于从章节页面中提取正文文本。这里编辑的是解析表达式，不是 UI 显示规则。</p>
          <small>规则修改后先调测当前模块，确认解析结果正常后再保存。</small>
        </section>
      </section>`, {
        trailingHtml: `<button type="button">保存</button>`,
        bottomActionHtml: sourceBottomActions([
          { label: "保存规则" },
          { label: "调测当前模块", route: "source-debug" }
        ])
      });
  }

  function sourceDebugModules(active) {
    const modules = [
      { key: "search", title: "搜索", meta: "关键词 -> 结果列表", status: "通过", tone: "good", route: "source-debug-search-result" },
      { key: "detail", title: "详情", meta: "详情 URL -> 书籍字段", status: "通过", tone: "good", route: "source-debug-detail-result" },
      { key: "catalog", title: "目录", meta: "目录 URL -> 章节列表", status: "通过", tone: "good", route: "source-debug-catalog-result" },
      { key: "content", title: "正文", meta: "章节 URL -> 正文文本", status: "失败", tone: "warn", route: "source-debug" }
    ];
    return `
      <nav class="fd-source-debug-module-tabs" aria-label="调测模块">
        ${modules.map((item) => `
          <button class="${item.key === active ? "is-active" : ""}" type="button" data-route="${esc(item.route)}">
            <strong>${esc(item.title)}</strong>
            <small>${esc(item.meta)}</small>
            ${sourceBadge({ status: item.status, tone: item.tone })}
          </button>`).join("")}
      </nav>`;
  }

  function sourceDebugCases(active) {
    const cases = [
      { key: "search", title: "搜索调测", inputLabel: "输入关键词", inputValue: "斗破苍穹", ruleLabel: "结果列表规则", ruleValue: ".book-list > li", result: "返回 12 条 · 书名/作者/详情 URL 有效", tone: "good" },
      { key: "detail", title: "详情调测", inputLabel: "详情 URL", inputValue: "/book/123/", ruleLabel: "字段规则", ruleValue: "h1@text / .author@text", result: "书名、作者、封面、简介解析成功", tone: "good" },
      { key: "catalog", title: "目录调测", inputLabel: "目录 URL", inputValue: "/book/123/catalog", ruleLabel: "章节列表规则", ruleValue: ".chapter-list a", result: "解析 812 章 · 首尾章节 URL 有效", tone: "good" },
      { key: "content", title: "正文调测", inputLabel: "章节 URL", inputValue: "/book/123/128.html", ruleLabel: "正文内容规则", ruleValue: "#content@text", result: "正文长度 0 字 · 匹配节点 0 个", tone: "warn" }
    ];
    return `
      <section class="fd-source-debug-case-list" aria-label="模块调测用例">
        ${cases.map((item) => `
          <article class="${item.key === active ? "is-active" : ""}">
            <header><strong>${esc(item.title)}</strong>${sourceBadge(item.tone === "warn" ? { status: "失败", tone: "warn" } : { status: "通过", tone: "good" })}</header>
            <div><span>${esc(item.inputLabel)}</span><b>${esc(item.inputValue)}</b></div>
            <div><span>${esc(item.ruleLabel)}</span><b>${esc(item.ruleValue)}</b></div>
            <small>${esc(item.result)}</small>
          </article>`).join("")}
      </section>`;
  }

  function sourceDebugSegment(active, resultRoute) {
    return `
      <nav class="fd-source-segment">
        <button class="${active === "result" ? "is-active" : ""}" type="button" data-route="${esc(resultRoute || "source-debug")}">解析结果</button>
        <button class="${active === "source" ? "is-active" : ""}" type="button" data-route="source-code-view">源码</button>
        <button class="${active === "log" ? "is-active" : ""}" type="button" data-route="source-debug-content-log">日志</button>
      </nav>`;
  }

  function sourceDebugScreen(data) {
    const parsed = [
      ["章节标题", "第 128 章 风雨夜"],
      ["正文长度", "0 字"],
      ["匹配节点", "0 个"],
      ["错误原因", "正文选择器未命中"]
    ];
    return sourceShell(data, "书源调测", `
      <section class="fd-source-debug">
        <article class="fd-source-detail-head fd-source-debug-context"><span><strong>正文模块调测</strong><small>笔趣阁 · 第 128 章 风雨夜</small></span>${sourceBadge({ status: "失败", tone: "warn" })}</article>
        ${sourceDebugModules("content")}
        ${sourceDebugCases("content")}
        <section class="fd-source-debug-inputs">
          <article><span>章节 URL</span><strong>/book/123/128.html</strong></article>
          <article><span>正文规则</span><strong>#content@text</strong></article>
        </section>
        <article class="fd-source-request">GET https://biquge.example/book/123/128.html · 200 OK · 412ms</article>
        ${sourceDebugSegment("result", "source-debug")}
        <section class="fd-source-debug-result" aria-label="解析结果">
          ${parsed.map(([label, value]) => `<article><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`).join("")}
        </section>
        <article class="fd-source-detect-card">
          <h2>修复建议</h2>
          <p>原始页面正文可能在“.chapter-content”容器内，当前“#content”无匹配。</p>
          <small>可尝试将正文内容规则改为“.chapter-content@text”后重新调测。</small>
        </article>
      </section>`, {
        bottomActionHtml: sourceBottomActions([
          { label: "重新调测" },
          { label: "回到编辑", route: "source-rule-edit" }
        ])
      });
  }

  function sourceDebugResultScreen(data, route) {
    const pages = {
      "source-debug-search-result": {
        active: "search",
        title: "搜索模块调测",
        meta: "笔趣阁 · 关键词 斗破苍穹",
        badge: { status: "通过", tone: "good" },
        request: "GET https://biquge.example/search?q=斗破苍穹 · 200 OK · 286ms",
        inputs: [["关键词", "斗破苍穹"], ["结果规则", ".book-list > li"]],
        parsed: [["命中数量", "12 条"], ["书名字段", ".title@text · 12/12"], ["作者字段", ".author@text · 12/12"], ["详情 URL", "12/12 有效"]],
        suggestion: ["搜索结果有效", "结果列表、书名、作者和详情 URL 均可用于下一步详情调测。"]
      },
      "source-debug-detail-result": {
        active: "detail",
        title: "详情模块调测",
        meta: "笔趣阁 · /book/123/",
        badge: { status: "通过", tone: "good" },
        request: "GET https://biquge.example/book/123/ · 200 OK · 318ms",
        inputs: [["详情 URL", "/book/123/"], ["字段规则", "h1@text / .author@text"]],
        parsed: [["书名", "斗破苍穹"], ["作者", "天蚕土豆"], ["封面", "cover.jpg · 200 OK"], ["简介", "186 字"]],
        suggestion: ["详情字段有效", "书名、作者、封面、简介均已解析，可继续目录模块调测。"]
      },
      "source-debug-catalog-result": {
        active: "catalog",
        title: "目录模块调测",
        meta: "笔趣阁 · /book/123/catalog",
        badge: { status: "通过", tone: "good" },
        request: "GET https://biquge.example/book/123/catalog · 200 OK · 366ms",
        inputs: [["目录 URL", "/book/123/catalog"], ["章节规则", ".chapter-list a"]],
        parsed: [["章节数量", "812 章"], ["首章", "第 1 章 陨落的天才"], ["末章", "第 812 章 大结局"], ["URL 有效", "812/812"]],
        suggestion: ["目录字段有效", "章节名和章节 URL 已匹配，下一步应调测正文内容规则。"]
      }
    };
    const page = pages[route] || pages["source-debug-search-result"];
    return sourceShell(data, "书源调测", `
      <section class="fd-source-debug">
        <article class="fd-source-detail-head fd-source-debug-context"><span><strong>${esc(page.title)}</strong><small>${esc(page.meta)}</small></span>${sourceBadge(page.badge)}</article>
        ${sourceDebugModules(page.active)}
        ${sourceDebugCases(page.active)}
        <section class="fd-source-debug-inputs">
          ${page.inputs.map(([label, value]) => `<article><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`).join("")}
        </section>
        <article class="fd-source-request">${esc(page.request)}</article>
        ${sourceDebugSegment("result", route)}
        <section class="fd-source-debug-result" aria-label="解析结果">
          ${page.parsed.map(([label, value]) => `<article><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`).join("")}
        </section>
        <article class="fd-source-detect-card">
          <h2>${esc(page.suggestion[0])}</h2>
          <p>${esc(page.suggestion[1])}</p>
        </article>
      </section>`, {
        bottomActionHtml: sourceBottomActions([
          { label: "重新调测" },
          { label: "回到编辑", route: "source-rule-edit" }
        ])
      });
  }

  function sourceDebugContentLogScreen(data) {
    const logs = [
      ["10:30:18.120", "请求章节 HTML", "GET /book/123/128.html · 200 OK · 412ms"],
      ["10:30:18.204", "执行正文规则", "#content@text · 匹配节点 0 个"],
      ["10:30:18.226", "执行净化规则", "未进入净化阶段，正文为空"],
      ["10:30:18.240", "返回错误", "正文内容为空，建议检查选择器或源码结构"]
    ];
    return sourceShell(data, "书源调测", `
      <section class="fd-source-debug fd-source-debug-log-page">
        <article class="fd-source-detail-head fd-source-debug-context"><span><strong>正文模块日志</strong><small>笔趣阁 · 第 128 章 风雨夜</small></span>${sourceBadge({ status: "失败", tone: "warn" })}</article>
        ${sourceDebugModules("content")}
        <section class="fd-source-debug-inputs">
          <article><span>章节 URL</span><strong>/book/123/128.html</strong></article>
          <article><span>正文规则</span><strong>#content@text</strong></article>
        </section>
        <article class="fd-source-request">GET https://biquge.example/book/123/128.html · 200 OK · 412ms</article>
        ${sourceDebugSegment("log", "source-debug")}
        <section class="fd-source-log-list fd-source-debug-step-log" aria-label="正文模块调测日志">
          ${logs.map(([time, title, message]) => `<article><span><strong>${esc(time)} · ${esc(title)}</strong><small>${esc(message)}</small></span>${sourceBadge(title === "返回错误" ? { status: "错误", tone: "warn" } : { status: "记录", tone: "muted" })}</article>`).join("")}
        </section>
        <article class="fd-source-detect-card">
          <h2>定位结果</h2>
          <p>请求成功但正文选择器无匹配，源码中正文位于“.chapter-content”容器。</p>
          <small>可复制日志后回到规则编辑，将正文规则改为“.chapter-content@text”。</small>
        </article>
      </section>`, {
        trailingHtml: `<button type="button">复制</button>`,
        bottomActionHtml: sourceBottomActions([
          { label: "复制日志" },
          { label: "回到解析", route: "source-debug" },
          { label: "回到编辑", route: "source-rule-edit" }
        ])
      });
  }

  function sourceEditDebugScreen(data) {
    return sourceRuleEditScreen(data);
  }

  function sourceLogsScreen(data) {
    const logs = [["笔趣阁", "ERROR", "10:30", "正文", "正文规则返回空内容"], ["旧规则源", "ERROR", "10:22", "搜索", "HTTP 403"], ["本地导入源", "WARN", "09:50", "目录", "尚未检测"], ["失效示例源", "ERROR", "昨天", "详情", "详情页 URL 为空"]];
    return sourceShell(data, "错误日志", `
      <section class="fd-source-logs">
        <nav class="fd-source-chip-row"><button class="is-active" type="button">全部</button><button type="button">异常</button><button type="button">警告</button><button type="button">今日</button></nav>
        <label class="fd-source-search">${icon("search", "fd-small-icon")}<span>搜索书源或错误内容</span></label>
        <p class="fd-source-stat-line">4 条异常 · 1 条警告</p>
        <section class="fd-source-log-list">${logs.map(([source, level, time, module, message]) => `<article role="button" tabindex="0" data-route="${module === "正文" ? "source-debug-content-log" : "source-debug"}"><span><strong>${esc(source)} · ${esc(level)}</strong><small>${esc(time)} · ${esc(module)} · ${esc(message)}</small></span>${chevron("fd-small-icon")}</article>`).join("")}</section>
      </section>`, {
        trailingHtml: `<button type="button" data-route="source-delete-confirm">清空</button>`,
        bottomActionHtml: sourceBottomActions([
          { label: "复制全部" },
          { label: "重新检测异常" }
        ])
      });
  }

  function sourceCodeViewScreen(data) {
    const code = ["<html>", "  <body>", "    <h1 class=\"chapter-title\">第 128 章 风雨夜</h1>", "    <main class=\"chapter-content\">", "      <p>雨声在檐下连成一片，旧街的灯光被水汽晕开。</p>", "      <p>他把地图折回怀里，终于确认了下一处坐标。</p>", "    </main>", "    <a class=\"next\" href=\"/book/123/129.html\">下一章</a>", "  </body>", "</html>"];
    return sourceShell(data, "书源调测", `
      <section class="fd-source-debug fd-source-code">
        <article class="fd-source-detail-head fd-source-debug-context"><span><strong>源码查看</strong><small>正文模块 · 当前请求返回</small></span>${sourceBadge({ status: "200 OK", tone: "good" })}</article>
        <section class="fd-source-debug-inputs">
          <article><span>章节 URL</span><strong>/book/123/128.html</strong></article>
          <article><span>正文规则</span><strong>#content@text</strong></article>
        </section>
        <article class="fd-source-request">GET https://biquge.example/book/123/128.html · 200 OK · 412ms</article>
        ${sourceDebugSegment("source", "source-debug")}
        <pre>${code.map((line, index) => `${String(index + 1).padStart(2, "0")}  ${esc(line)}`).join("\n")}</pre>
      </section>`, {
        trailingHtml: `<button type="button">复制</button>`,
        bottomActionHtml: sourceBottomActions([
          { label: "重新请求" },
          { label: "回到调测", route: "source-debug" }
        ])
      });
  }

  function sourceDeleteConfirmScreen(data, appState) {
    return sourceShell(data, "已选 3 个", `
      <section class="fd-source-home fd-source-batch fd-source-dialog-backdrop">
        <div class="fd-source-batch-top"><button type="button" data-route="source-batch">取消</button><strong>已选 3 个</strong><button type="button">全选</button></div>
        ${sourceSearchAndFilters()}
        ${sourceList(sourceItems, "batch", appState)}
      </section>`, {
        bottomActionHtml: sourceBottomActions([
          { label: "启用" },
          { label: "禁用" },
          { label: "检测" },
          { label: "分组", route: "source-groups" },
          { label: "删除", className: "is-danger" }
        ], "fd-source-batch-actions"),
        dialogHtml: `<section class="fd-demo-dialog fd-source-delete-dialog" aria-hidden="false"><h2>删除书源？</h2><p>将删除已选 3 个书源。不会删除书架书籍，但这些书源将不再参与搜索、发现和换源。</p><label><input type="checkbox"> 同时清除相关检测日志</label><div><button type="button" data-route="source-batch">取消</button><button type="button" data-route="source-management">删除</button></div></section>`
      });
  }

  function sourceSwitchFilterTabs(filters) {
    return (filters || ["全部", "更新快", "已缓存", "可用"]).map((filter, index) => `
      <button class="${index === 0 ? "is-active" : ""}" type="button">${esc(filter)}</button>
    `).join("");
  }

  function sourceLatencyRank(item, index) {
    const speed = String(item.speed || "");
    const match = speed.match(/(\d+(?:\.\d+)?)/);
    if (!match) {
      return Number.MAX_SAFE_INTEGER + index;
    }
    return Number.parseFloat(match[1]);
  }

  function adjustReaderDropdownPlacement(root) {
    if (!root || typeof root.querySelectorAll !== "function") return;
    const normalizedDropdownHeight = (dropdown, availableSpace) => {
      const computed = window.getComputedStyle(dropdown);
      const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
      const paddingBottom = Number.parseFloat(computed.paddingBottom) || 0;
      const buttons = Array.from(dropdown.querySelectorAll("button"));
      const firstButton = buttons[0];
      if (!firstButton) {
        return Math.max(40, Math.floor(availableSpace));
      }
      const buttonHeight = firstButton.getBoundingClientRect().height || 27;
      const buttonGap = buttons.length > 1 ? Number.parseFloat(window.getComputedStyle(buttons[1]).marginTop) || 0 : 0;
      const availableForRows = Math.max(buttonHeight, availableSpace - paddingTop - paddingBottom);
      const visibleRows = Math.max(1, Math.min(buttons.length, Math.floor((availableForRows + buttonGap) / (buttonHeight + buttonGap))));
      const height = paddingTop + paddingBottom + (visibleRows * buttonHeight) + (Math.max(0, visibleRows - 1) * buttonGap);
      return Math.floor(Math.min(dropdown.scrollHeight || height, height, availableSpace));
    };
    root.querySelectorAll(".fd-reader-setting-dropdown, .fd-reader-tts-dropdown").forEach((dropdown) => {
      dropdown.classList.remove("is-drop-up");
      dropdown.style.removeProperty("--reader-dropdown-max-height");
      const row = dropdown.closest(".fd-reader-setting-row, .fd-reader-tts-option-row");
      const panel = dropdown.closest(".fd-reader-module-panel") || root;
      if (!row || !panel) return;
      const rowRect = row.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const dropdownRect = dropdown.getBoundingClientRect();
      const spaceBelow = panelRect.bottom - rowRect.bottom;
      const spaceAbove = rowRect.top - panelRect.top;
      const isBottomOverflow = dropdownRect.bottom > panelRect.bottom - 6;
      if (!isBottomOverflow) return;
      if (spaceAbove > spaceBelow) {
        dropdown.classList.add("is-drop-up");
        dropdown.style.setProperty("--reader-dropdown-max-height", `${normalizedDropdownHeight(dropdown, spaceAbove - 6)}px`);
        return;
      }
      dropdown.style.setProperty("--reader-dropdown-max-height", `${normalizedDropdownHeight(dropdown, spaceBelow - 6)}px`);
    });
  }

  function sourceCandidateRow(item, index, selectedSource) {
    const isCurrent = item.state === "当前";
    const isSelected = selectedSource ? item.source === selectedSource : isCurrent;
    const canSwitch = !isCurrent && item.state !== "落后" && item.state !== "失效";
    const latestChapter = item.latestChapter || item.chapter || "最新章节";
    const latestChapterLabel = latestChapter.includes("最新章节") ? latestChapter : `最新章节 ${latestChapter}`;
    const speedLabel = /\d/.test(item.speed || "") ? item.speed : (item.speed || "未知");
    return `
      <article class="fd-source-candidate-row${isCurrent ? " is-current" : ""}${isSelected ? " is-selected" : ""}${canSwitch ? " is-switchable" : " is-muted"}" data-source-index="${index}" data-source-name="${esc(item.source)}" tabindex="0" role="button" aria-label="选择 ${esc(item.source)}">
        <span class="fd-source-row-main">
          <b>${esc(item.source)}</b>
          <em>${esc(speedLabel)}</em>
          <strong>${esc(latestChapterLabel)}</strong>
        </span>
      </article>`;
  }

  function flowScreen(data, appState) {
    const flow = data.flow || {};
    const candidates = (flow.candidates || [])
      .map((item, index) => Object.assign({ _sourceOrder: index }, item))
      .sort((left, right) => {
        const latencyDelta = sourceLatencyRank(left, left._sourceOrder) - sourceLatencyRank(right, right._sourceOrder);
        return latencyDelta || left._sourceOrder - right._sourceOrder;
      });
    const current = candidates.find((item) => item.state === "当前") || candidates[0] || {};
    const selectedSource = appState?.sourceSwitchSelectedSource || current.source || "";
    const selected = candidates.find((item) => item.source === selectedSource) || current;
    return shellKit().renderFlowShell({
      frameClass: "fd-flow-frame fd-source-phone-flow fd-source-reader-continuation",
      stepClass: "fd-flow-step fd-source-continuity-slot",
      comparisonClass: "fd-flow-comparison fd-source-window-slot",
      resultClass: "fd-flow-result fd-source-result-slot",
      stateHostClass: "fd-source-unused-slot",
      ariaLabel: "换源",
      stepHtml: `
        <section class="fd-source-reader-continuity fd-source-control-continuity" aria-label="阅读控制层背景">
          ${sharedReaderSurface(data, "", appState, { disableTurnAnimation: true })}
          <section class="fd-source-control-overlay" aria-label="换源期间可操作的阅读控制层">
            ${readerTopOverlay(data, appState)}
            <div class="fd-reader-sheet fd-source-control-sheet">
              ${readerBottomSheetHtml(data, readerRouteState("reader"), "reader", false, appState)}
            </div>
            <nav class="fd-reader-module-nav fd-source-control-nav">
              ${readerModuleNavHtml(data, "")}
            </nav>
          </section>
        </section>`,
      comparisonHtml: `
        <section class="fd-source-switch-window" data-source-switch-window aria-label="换源窗口">
          <div class="fd-source-window-info">
            <i>${icon("source-switch", "fd-small-icon")}</i>
            <strong>换源</strong>
            <span>按延迟排序</span>
            <button class="fd-source-window-close" type="button" data-route="reader" data-route-replace aria-label="关闭换源窗口">${icon("close", "fd-small-icon")}</button>
          </div>
          <div class="fd-source-candidate-list">
            ${candidates.map((item, index) => sourceCandidateRow(item, index, selectedSource)).join("")}
          </div>
        </section>`,
      resultHtml: `
        <section class="fd-source-switch-result" aria-label="换源确认">
          <span>${icon("check", "fd-small-icon")}</span>
          <strong>${esc(selected.source || "优书网")}</strong>
          <small>${esc(selected.state || "当前")} · ${esc(selected.latency || "")} · ${esc(selected.latest || "最新章节同步")}</small>
          <p>确认后保持当前阅读位置，仅替换正文来源与章节解析结果。</p>
          <button type="button" data-route="reader" data-route-replace>确认换源</button>
        </section>`,
      stateHostHtml: ""
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

  function renderRoute(route, data, options, appState) {
    switch (route) {
      case "bookshelf":
        return mainTabBookshelf(data, appState);
      case "discover":
        return mainTabDiscover(data, appState);
      case "rss":
        return mainTabRss(data, appState);
      case "settings":
        return mainTabSettings(data, appState);
      case "book-search":
        return bookSearchScreen(data, appState);
      case "book-detail":
        return libraryScreen(data);
      case "book-directory":
        return bookDirectoryScreen(data, appState);
      case "bookshelf-empty":
        return bookshelfEmptyScreen(data);
      case "book-batch-management":
        return bookBatchManagementScreen(data);
      case "sort-filter":
        return sortFilterScreen(data);
      case "group-management":
        return groupManagementScreen(data);
      case "local-import":
        return localImportScreen(data);
      case "immersive-reading":
      case "reader":
      case "toc-bookmarks":
      case "reader-appearance":
      case "tts":
      case "reader-settings":
      case "auto-page":
      case "content-search":
      case "content-replacement":
        return readerStateScreen(data, route, options, appState);
      case "reader-full-directory":
      case "reader-full-tts":
      case "reader-full-appearance":
      case "reader-full-settings":
        return readerFullPageScreen(data, route, appState);
      case "reader-book-cache":
      case "reader-debug-info":
        return readerUtilityScreen(data, route, appState);
      case "source-switch":
        return flowScreen(data, appState);
      case "source-management":
        return sourceManagementScreen(data, appState);
      case "source-import-options":
        return sourceImportOptionsScreen(data, appState);
      case "source-import-preview":
        return sourceImportPreviewScreen(data);
      case "source-batch":
        return sourceBatchScreen(data, appState);
      case "source-groups":
        return sourceGroupsScreen(data);
      case "source-detail":
        return sourceDetailScreen(data);
      case "source-detect":
        return sourceDetectScreen(data);
      case "source-rule-edit":
        return sourceRuleEditScreen(data);
      case "source-debug":
        return sourceDebugScreen(data);
      case "source-debug-search-result":
      case "source-debug-detail-result":
      case "source-debug-catalog-result":
        return sourceDebugResultScreen(data, route);
      case "source-debug-content-log":
        return sourceDebugContentLogScreen(data);
      case "source-edit-debug":
        return sourceEditDebugScreen(data);
      case "source-logs":
        return sourceLogsScreen(data);
      case "source-code-view":
        return sourceCodeViewScreen(data);
      case "source-delete-confirm":
        return sourceDeleteConfirmScreen(data, appState);
      case "settings-general":
      case "bookshelf-search-settings":
      case "privacy-permissions":
      case "about-feedback":
      case "sync-backup":
        return settingsScreen(data, route, appState);
      case "restore-confirm":
      case "restore-progress":
      case "restore-conflict":
      case "restore-result":
        return restoreFlowScreen(data, route, appState);
      case "webdav-config":
        return settingsScreen(data, "sync-backup", appState);
      default:
        return mainTabBookshelf(data, appState);
    }
  }

  function renderStack(stack) {
    return stack.map((route, index) => {
      const meta = routes[route] || routes.bookshelf;
      return `<li${index === stack.length - 1 ? ' aria-current="step"' : ""}>${esc(meta.title)}</li>`;
    }).join("");
  }

  function initialAppState(data) {
    return {
      bookshelfView: "cover",
      bookSearchPhase: "before",
      readerChapterIndex: initialReaderChapterIndex(data),
      readerChapterProgress: readerChapterProgressValue(data, {}),
      readerTypography: normalizeReaderTypography(data),
      readerPages: [],
      readerPaginationKey: "",
      readerPageIndex: 0,
      readerTurnDirection: "",
      readerMoreOpen: false,
      readerTocMode: "directory",
      readerTheme: readerDefaultThemeValue(data),
      readerBrightness: readerBrightnessConfig(data).defaultValue,
      readerBrightnessAuto: false,
      readerTts: Object.assign({}, readerTtsConfig(data).defaults),
      readerTtsSession: false,
      readerTtsExpandedOption: "",
      readerSettings: Object.assign({}, readerControlSettingsConfig(data).defaults),
      readerAutoPageSession: false,
      readerAutoPageCountdown: 8,
      readerTextSelectionOpen: false,
      readerSelectedText: "雨，下了一整夜。",
      readerSettingsExpandedOption: "",
      sourceSwitchSelectedSource: "",
      sourceMenuOpen: false,
      sourceEnabled: {},
      settingsOverlay: "",
      settingsExpandedOption: "",
      settingsValues: {},
      mainTabFeedback: ""
    };
  }

  function renderCaptureBoard(target, data) {
    const routeList = Object.keys(routes);
    target.innerHTML = `
      <main class="fd-capture-board" data-capture-mode="all" aria-label="Figma 多页面捕获板">
        <header class="fd-capture-board-header">
          <p>Reader Android</p>
          <h1>Frontend Demo Draft - All Routes</h1>
          <span>由当前 demo renderer 输出，每个画布对应一个应用路由。</span>
        </header>
        <section class="fd-capture-grid">
          ${routeList.map((route) => {
            const meta = routes[route] || routes.bookshelf;
            const routeState = initialAppState(data);
            return `
              <article class="fd-capture-card" data-capture-route="${esc(route)}">
                <div class="fd-capture-card-head">
                  <strong>${esc(meta.title)}</strong>
                  <span>${esc(meta.shell)} · ${esc(route)}</span>
                </div>
                <div class="fd-capture-screen">
                  ${renderRoute(route, data, {}, routeState)}
                </div>
              </article>
            `;
          }).join("")}
        </section>
      </main>`;
  }

  function render(target, data) {
    try {
      if (new URLSearchParams(window.location.search).get("captureMode") === "all") {
        renderCaptureBoard(target, data);
        return;
      }
    } catch (error) {
      // Fall back to the interactive demo when URLSearchParams is unavailable.
    }
    target.innerHTML = `
      <main class="fd-demo" data-shell="ComponentLibraryShell" data-current-route="bookshelf" data-demo-mode="regular" data-adaptive-runtime="viewport-class-v1" aria-label="前端 Demo 设计稿">
        <nav class="fd-demo-mode-switch" aria-label="显示模式">
          <button class="is-active" type="button" data-demo-mode-option="regular" aria-pressed="true">常规显示</button>
          <button type="button" data-demo-mode-option="developer" aria-pressed="false">开发者模式</button>
        </nav>
        <header class="fd-demo-header" data-slot="foundations">
          <div>
            <p>Reader Android</p>
            <h1>${esc(data.meta.title)}</h1>
            <span>${esc(data.meta.subtitle)}</span>
          </div>
          <dl>
            <div><dt>UI 图</dt><dd>${esc(data.meta.screenCount)}</dd></div>
            <div><dt>页面框架</dt><dd>${esc(data.meta.shellCount)}</dd></div>
            <div><dt>交互模式</dt><dd>应用路由</dd></div>
          </dl>
        </header>
        <section class="fd-app-demo-board" data-slot="basicControls">
          <section class="fd-active-stage" aria-label="当前应用页面">
            <div class="fd-screen-board-head">
              <div>
                <h2>可交互应用 Demo（Interactive App Demo）</h2>
                <p class="fd-route-status">当前路由：书架（Bookshelf）</p>
              </div>
              <button class="fd-demo-back" type="button" data-demo-back disabled>返回上一页</button>
            </div>
            <div class="fd-active-screen" data-screen-host></div>
          </section>
          <aside class="fd-route-panel" aria-label="路由状态">
            <h2>路由状态</h2>
            <dl>
              <div><dt>当前 Shell</dt><dd data-current-shell>MainTabShell</dd></div>
              <div><dt>当前页面</dt><dd data-current-page>书架（Bookshelf）</dd></div>
              <div><dt>返回栈</dt><dd data-stack-size>1</dd></div>
            </dl>
            <ol data-route-stack>${renderStack(["bookshelf"])}</ol>
            <p>此面板只显示当前状态；页面切换必须从手机画布里的按钮、列表项、底部导航或返回动作触发。</p>
            <div class="fd-dev-range-legend" aria-label="开发者模式渲染范围图例">
              <span><i></i>Shell slot 渲染范围</span>
              <span><i></i>Reader 内部模块范围</span>
            </div>
          </aside>
        </section>
      </main>`;
    attachInteractions(target, data);
  }

  function attachInteractions(target, data) {
    const root = target.querySelector(".fd-demo");
    const screenHost = target.querySelector("[data-screen-host]");
    const routeStatus = target.querySelector(".fd-route-status");
    const backButton = target.querySelector("[data-demo-back]");
    const routeStackHost = target.querySelector("[data-route-stack]");
    const currentShell = target.querySelector("[data-current-shell]");
    const currentPage = target.querySelector("[data-current-page]");
    const stackSize = target.querySelector("[data-stack-size]");
    const routeStack = ["bookshelf"];
    const appState = initialAppState(data);
    let pendingRouteTimer = null;
    applyViewportClass(root);
    if (target.__readerAdaptiveViewportCleanup) {
      target.__readerAdaptiveViewportCleanup();
    }
    const handleViewportChange = () => {
      applyViewportClass(root);
      adjustReaderDropdownPlacement(screenHost);
    };
    window.addEventListener("resize", handleViewportChange);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportChange);
    }
    target.__readerAdaptiveViewportCleanup = () => {
      window.removeEventListener("resize", handleViewportChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportChange);
      }
    };

    const setDemoMode = (mode) => {
      const normalizedMode = mode === "developer" ? "developer" : "regular";
      root.setAttribute("data-demo-mode", normalizedMode);
      target.querySelectorAll("[data-demo-mode-option]").forEach((button) => {
        const active = button.getAttribute("data-demo-mode-option") === normalizedMode;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
      try {
        window.localStorage.setItem("readerFrontendDemoMode", normalizedMode);
      } catch (error) {
        // Demo mode should remain usable even when storage is unavailable.
      }
    };

    target.querySelectorAll("[data-demo-mode-option]").forEach((button) => {
      button.addEventListener("click", () => setDemoMode(button.getAttribute("data-demo-mode-option")));
    });

    const updateRouteInfo = (route) => {
      const meta = routes[route] || routes.bookshelf;
      root.setAttribute("data-current-route", route);
      if (routeStatus) {
        routeStatus.textContent = `当前路由：${meta.title} · ${meta.shell}`;
      }
      if (currentShell) {
        currentShell.textContent = meta.shell;
      }
      if (currentPage) {
        currentPage.textContent = meta.title;
      }
      if (stackSize) {
        stackSize.textContent = String(routeStack.length);
      }
      if (routeStackHost) {
        routeStackHost.innerHTML = renderStack(routeStack);
      }
      if (backButton) {
        backButton.disabled = routeStack.length <= 1;
      }
    };

    const renderActiveRoute = (route, options) => {
      const renderedTurnDirection = appState.readerTurnDirection;
      screenHost.innerHTML = renderRoute(route, data, options, appState);
      updateRouteInfo(route);
      if (!options?.loading && updateReaderPagination(screenHost, data, appState)) {
        screenHost.innerHTML = renderRoute(route, data, options, appState);
        updateRouteInfo(route);
      }
      attachScreenInteractions(screenHost, goTo, goBack, goTab, replaceTopRoute, exitReader, appState, data, renderCurrentRoute);
      adjustReaderDropdownPlacement(screenHost);
      if (renderedTurnDirection) {
        const readingLayer = screenHost.querySelector(".fd-ir-reading-layer");
        const clearTurnClass = () => {
          if (readingLayer) {
            readingLayer.classList.remove("fd-reader-page-turn-next", "fd-reader-page-turn-prev");
          }
        };
        if (readingLayer) {
          readingLayer.addEventListener("animationend", clearTurnClass, { once: true });
          window.setTimeout(clearTurnClass, 260);
        }
      }
      appState.readerTurnDirection = "";
    };

    const renderCurrentRoute = () => {
      renderActiveRoute(routeStack[routeStack.length - 1]);
    };

    const goTo = (route, shouldPush) => {
      if (!routes[route]) {
        return;
      }
      if (pendingRouteTimer) {
        window.clearTimeout(pendingRouteTimer);
        pendingRouteTimer = null;
      }
      const previous = routeStack[routeStack.length - 1];
      if (shouldPush && previous !== route) {
        routeStack.push(route);
      }
      appState.settingsOverlay = "";
      appState.settingsExpandedOption = "";
      appState.mainTabFeedback = "";
      appState.readerMoreOpen = false;
      if (shouldLoadReaderTransition(previous, route)) {
        renderActiveRoute(route, { loading: true });
        pendingRouteTimer = window.setTimeout(() => {
          pendingRouteTimer = null;
          renderActiveRoute(route);
        }, 360);
        return;
      }
      renderActiveRoute(route);
    };

    const goTab = (route) => {
      if (!routes[route]) {
        return;
      }
      if (pendingRouteTimer) {
        window.clearTimeout(pendingRouteTimer);
        pendingRouteTimer = null;
      }
      appState.settingsOverlay = "";
      appState.settingsExpandedOption = "";
      appState.mainTabFeedback = "";
      appState.readerMoreOpen = false;
      routeStack.splice(0, routeStack.length, route);
      renderActiveRoute(route);
    };

    const replaceTopRoute = (route) => {
      if (!routes[route]) {
        return;
      }
      if (pendingRouteTimer) {
        window.clearTimeout(pendingRouteTimer);
        pendingRouteTimer = null;
      }
      if (routeStack.length === 0) {
        routeStack.push(route);
      } else {
        routeStack[routeStack.length - 1] = route;
      }
      appState.settingsOverlay = "";
      appState.settingsExpandedOption = "";
      appState.mainTabFeedback = "";
      appState.readerMoreOpen = false;
      renderActiveRoute(route);
    };

    const exitReader = () => {
      if (pendingRouteTimer) {
        window.clearTimeout(pendingRouteTimer);
        pendingRouteTimer = null;
      }
      while (routeStack.length > 1 && isReaderStateRoute(routeStack[routeStack.length - 1])) {
        routeStack.pop();
      }
      const targetRoute = routeStack[routeStack.length - 1];
      if (targetRoute && !isReaderStateRoute(targetRoute)) {
        renderActiveRoute(targetRoute);
        return;
      }
      routeStack.splice(0, routeStack.length, "bookshelf");
      renderActiveRoute("bookshelf");
    };

    function goBack() {
      if (routeStack.length <= 1) {
        return;
      }
      if (pendingRouteTimer) {
        window.clearTimeout(pendingRouteTimer);
        pendingRouteTimer = null;
      }
      routeStack.pop();
      appState.settingsOverlay = "";
      appState.settingsExpandedOption = "";
      appState.mainTabFeedback = "";
      appState.readerMoreOpen = false;
      goTo(routeStack[routeStack.length - 1], false);
    }

    if (backButton) {
      backButton.addEventListener("click", goBack);
    }

    let initialMode = "regular";
    try {
      initialMode = window.localStorage.getItem("readerFrontendDemoMode") || "regular";
    } catch (error) {
      initialMode = "regular";
    }
    const initialRoute = (() => {
      try {
        const route = new URLSearchParams(window.location.search).get("captureRoute") || "bookshelf";
        return routes[route] ? route : "bookshelf";
      } catch (error) {
        return "bookshelf";
      }
    })();
    setDemoMode(initialMode);
    routeStack.splice(0, routeStack.length, ...initialRouteStackFor(initialRoute));
    goTo(initialRoute, false);
  }

  function attachScreenInteractions(screenHost, goTo, goBack, goTab, replaceTopRoute, exitReader, appState, data, renderCurrentRoute) {
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const roundTo = (value, digits) => Number(value.toFixed(digits));
    const openReaderTextSelection = () => {
      appState.readerTextSelectionOpen = true;
      appState.readerSelectedText = "雨，下了一整夜。";
      renderCurrentRoute();
    };
    const closeReaderTextSelection = () => {
      if (!appState.readerTextSelectionOpen) {
        return;
      }
      appState.readerTextSelectionOpen = false;
      renderCurrentRoute();
    };
    const applyReaderPageAction = (action) => {
      const pageCount = readerPages(data, appState).length;
      const currentIndex = Number.isFinite(Number(appState.readerPageIndex)) ? Number(appState.readerPageIndex) : 0;
      const nextIndex = action === "next"
        ? clamp(currentIndex + 1, 0, pageCount - 1)
        : action === "prev"
          ? clamp(currentIndex - 1, 0, pageCount - 1)
          : currentIndex;
      if (nextIndex === currentIndex) {
        return;
      }
      appState.readerPageIndex = nextIndex;
      appState.readerTurnDirection = action === "next" ? "next" : "prev";
      renderCurrentRoute();
    };
    const applyReaderChapterAction = (action) => {
      const chapters = readerChapters(data);
      const currentIndex = Number.isFinite(Number(appState.readerChapterIndex))
        ? Number(appState.readerChapterIndex)
        : initialReaderChapterIndex(data);
      const nextIndex = action === "next"
        ? clamp(currentIndex + 1, 0, chapters.length - 1)
        : action === "prev"
          ? clamp(currentIndex - 1, 0, chapters.length - 1)
          : currentIndex;
      if (nextIndex === currentIndex) {
        return;
      }
      const progressDelta = nextIndex > currentIndex ? 1 : -1;
      appState.readerChapterIndex = nextIndex;
      const chapterProgressConfig = readerChapterProgressConfig(data);
      appState.readerChapterProgress = clamp(readerChapterProgressValue(data, appState) + progressDelta, chapterProgressConfig.min, chapterProgressConfig.max);
      appState.readerPageIndex = 0;
      appState.readerTurnDirection = action === "next" ? "next" : "prev";
      renderCurrentRoute();
    };
    const applyReaderChapterProgress = (target, clientX, shouldRender) => {
      const chapterProgressConfig = readerChapterProgressConfig(data);
      const rect = target.getBoundingClientRect();
      const raw = rect.width > 0 ? chapterProgressConfig.min + ((clientX - rect.left) / rect.width) * (chapterProgressConfig.max - chapterProgressConfig.min) : chapterProgressConfig.min;
      const value = Math.round(clamp(raw, chapterProgressConfig.min, chapterProgressConfig.max));
      appState.readerChapterProgress = value;
      const pageCount = readerPages(data, appState).length;
      appState.readerPageIndex = clamp(Math.round(((value - chapterProgressConfig.min) / Math.max(1, chapterProgressConfig.max - chapterProgressConfig.min)) * Math.max(0, pageCount - 1)), 0, Math.max(0, pageCount - 1));
      target.style.setProperty("--progress", `${value}%`);
      target.setAttribute("aria-valuenow", String(value));
      if (shouldRender) {
        renderCurrentRoute();
      }
    };
    const readerBrightnessDim = (value) => {
      const brightnessConfig = readerBrightnessConfig(data);
      return Math.max(0, Math.min(0.32, (brightnessConfig.max - value) / 280));
    };
    const syncReaderBrightnessDom = (value, isAuto) => {
      const brightnessConfig = readerBrightnessConfig(data);
      const parsedBrightness = Number(value);
      const brightnessValue = Math.round(clamp(Number.isFinite(parsedBrightness) ? parsedBrightness : brightnessConfig.defaultValue, brightnessConfig.min, brightnessConfig.max));
      appState.readerBrightness = brightnessValue;
      appState.readerBrightnessAuto = Boolean(isAuto);
      screenHost.querySelectorAll(".fd-brightness-rail").forEach((rail) => {
        rail.style.setProperty("--brightness", `${brightnessValue}%`);
        const track = rail.querySelector("[data-reader-brightness-track]");
        if (track) {
          track.setAttribute("aria-valuenow", String(brightnessValue));
        }
        const autoButton = rail.querySelector("[data-reader-brightness-auto]");
        if (autoButton) {
          autoButton.classList.toggle("is-active", Boolean(isAuto));
          autoButton.setAttribute("aria-pressed", isAuto ? "true" : "false");
        }
      });
      screenHost.querySelectorAll("[data-reader-brightness-dim]").forEach((layer) => {
        layer.style.setProperty("--reader-brightness", `${brightnessValue}%`);
        layer.style.setProperty("--reader-brightness-dim", readerBrightnessDim(brightnessValue).toFixed(3));
      });
    };
    const applyReaderBrightnessTrack = (track, clientY) => {
      const brightnessConfig = readerBrightnessConfig(data);
      const rect = track.getBoundingClientRect();
      const raw = rect.height > 0 ? brightnessConfig.min + ((rect.bottom - clientY) / rect.height) * (brightnessConfig.max - brightnessConfig.min) : brightnessConfig.min;
      syncReaderBrightnessDom(raw, false);
    };
    const applyTypographyAction = (action) => {
      const typographyConfig = readerTypographyConfig(data);
      const typography = appState.readerTypography;
      const updateTypographyParam = (key, direction) => {
        const config = typographyConfig[key];
        const nextValue = clamp(Number(typography[key]) + direction * Number(config.step), Number(config.min), Number(config.max));
        typography[key] = Number(config.precision) > 0 ? roundTo(nextValue, Number(config.precision)) : Math.round(nextValue);
      };
      if (action === "font-size-decrease") updateTypographyParam("fontSize", -1);
      if (action === "font-size-increase") updateTypographyParam("fontSize", 1);
      if (action === "line-height-decrease") updateTypographyParam("lineHeight", -1);
      if (action === "line-height-increase") updateTypographyParam("lineHeight", 1);
      if (action === "paragraph-gap-decrease") updateTypographyParam("paragraphGap", -1);
      if (action === "paragraph-gap-increase") updateTypographyParam("paragraphGap", 1);
      if (action === "letter-spacing-decrease") updateTypographyParam("letterSpacing", -1);
      if (action === "letter-spacing-increase") updateTypographyParam("letterSpacing", 1);
      if (action === "reset") appState.readerTypography = normalizeReaderTypography(data);
      renderCurrentRoute();
    };
    const cycleValue = (current, values) => {
      const index = values.indexOf(current);
      return values[(index + 1) % values.length] || values[0];
    };
    const applyReaderDirectoryIndex = (rawIndex) => {
      const chapters = readerChapters(data);
      const parsedIndex = Number(rawIndex);
      const index = clamp(Number.isFinite(parsedIndex) ? parsedIndex : 0, 0, Math.max(0, chapters.length - 1));
      const chapterProgressConfig = readerChapterProgressConfig(data);
      appState.readerChapterIndex = index;
      appState.readerChapterProgress = clamp(Math.round(chapterProgressConfig.min + ((index + 1) / Math.max(1, chapters.length)) * (chapterProgressConfig.max - chapterProgressConfig.min)), chapterProgressConfig.min, chapterProgressConfig.max);
      appState.readerPageIndex = 0;
      appState.readerTurnDirection = "";
      replaceTopRoute("immersive-reading");
    };
    const applyReaderTtsAction = (action) => {
      const ttsConfig = readerTtsConfig(data);
      const tts = appState.readerTts;
      appState.readerTtsExpandedOption = "";
      if (action === "toggle") {
        appState.readerTtsSession = true;
        tts.playing = !tts.playing;
        if (tts.playing) {
          appState.readerAutoPageSession = false;
          appState.readerSettings.autoPage = false;
          replaceTopRoute("immersive-reading");
          return;
        }
      }
      if (action === "prev") tts.sentenceIndex = clamp((tts.sentenceIndex || ttsConfig.defaults.sentenceIndex) - 1, ttsConfig.sentenceMin, ttsConfig.sentenceMax);
      if (action === "next") tts.sentenceIndex = clamp((tts.sentenceIndex || ttsConfig.defaults.sentenceIndex) + 1, ttsConfig.sentenceMin, ttsConfig.sentenceMax);
      renderCurrentRoute();
    };
    const toggleReaderTtsOption = (key) => {
      const options = readerTtsConfig(data).options;
      if (!options[key]) return;
      appState.readerTtsExpandedOption = appState.readerTtsExpandedOption === key ? "" : key;
      renderCurrentRoute();
    };
    const applyReaderTtsOption = (key, value) => {
      const options = readerTtsConfig(data).options;
      if (!options[key] || !options[key].includes(value)) return;
      appState.readerTts[key] = value;
      appState.readerTtsExpandedOption = "";
      renderCurrentRoute();
    };
    const applyReaderTtsCycle = (key) => {
      const options = readerTtsConfig(data).options;
      if (!options[key]) return;
      appState.readerTts[key] = cycleValue(appState.readerTts[key], options[key]);
      renderCurrentRoute();
    };
    const applyReaderTheme = (value) => {
      const options = readerThemeOptions(data);
      appState.readerTheme = options.some((item) => item.value === value) ? value : readerDefaultThemeValue(data);
      renderCurrentRoute();
    };
    const applyReaderSettingToggle = (key) => {
      if (!Object.prototype.hasOwnProperty.call(appState.readerSettings, key)) return;
      appState.readerSettingsExpandedOption = "";
      appState.readerSettings[key] = !appState.readerSettings[key];
      if (key === "autoPage") {
        appState.readerAutoPageSession = true;
        appState.readerAutoPageCountdown = 8;
        if (appState.readerSettings[key]) {
          appState.readerTtsSession = false;
          appState.readerTts.playing = false;
          replaceTopRoute("immersive-reading");
          return;
        }
      }
      renderCurrentRoute();
    };
    const toggleReaderSettingOption = (key) => {
      const options = readerControlSettingsConfig(data).options;
      if (!options[key]) return;
      appState.readerSettingsExpandedOption = appState.readerSettingsExpandedOption === key ? "" : key;
      renderCurrentRoute();
    };
    const applyReaderSettingOption = (key, value) => {
      const options = readerControlSettingsConfig(data).options;
      if (!options[key] || !options[key].includes(value)) return;
      appState.readerSettings[key] = value;
      appState.readerSettingsExpandedOption = "";
      renderCurrentRoute();
    };

    const closeBookFocus = (phone) => {
      if (!phone) {
        return;
      }
      phone.classList.remove("has-book-focus");
      phone.querySelectorAll(".is-cover-focused").forEach((item) => item.classList.remove("is-cover-focused"));
      const layer = phone.querySelector("[data-book-focus-layer]");
      if (layer) {
        layer.setAttribute("aria-hidden", "true");
      }
    };

    const openBookFocus = (button) => {
      const phone = button.closest(".fd-phone");
      const layer = phone?.querySelector("[data-book-focus-layer]");
      if (!phone || !layer) {
        return;
      }
      closeBookFocus(phone);
      phone.classList.add("has-book-focus");
      const focusTarget = button.closest("[data-book-card]") || button;
      focusTarget.classList.add("is-cover-focused");
      const title = button.getAttribute("data-book-title") || "长夜余火";
      const author = button.getAttribute("data-book-author") || "爱潜水的乌贼";
      const chapter = button.getAttribute("data-book-chapter") || "第 32 章 雨夜";
      const coverSrc = button.getAttribute("data-cover-src") || "";
      const titleHost = layer.querySelector("[data-focus-title]");
      const metaHost = layer.querySelector("[data-focus-meta]");
      const coverHost = layer.querySelector("[data-focus-cover]");
      if (titleHost) {
        titleHost.textContent = title;
      }
      if (metaHost) {
        metaHost.textContent = `${author} · ${chapter}`;
      }
      if (coverHost) {
        coverHost.style.setProperty("--focus-cover", `url("${coverSrc}")`);
      }
      layer.setAttribute("aria-hidden", "false");
      layer.querySelector(".fd-book-focus-menu button")?.focus({ preventScroll: true });
    };

    const applyBookshelfView = (mode) => {
      const view = mode === "list" ? "list" : "cover";
      appState.bookshelfView = view;
      const grid = screenHost.querySelector("[data-book-grid]");
      if (grid) {
        grid.setAttribute("data-bookshelf-view", view);
        grid.setAttribute("aria-label", view === "list" ? "书籍列表" : "书籍封面网格");
        grid.classList.toggle("is-list-view", view === "list");
        grid.classList.toggle("is-cover-view", view === "cover");
      }
      screenHost.querySelectorAll("[data-bookshelf-view-button]").forEach((button) => {
        const active = button.getAttribute("data-bookshelf-view-button") === view;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
    };

    screenHost.querySelectorAll("[data-bookshelf-view-button]").forEach((button) => {
      button.addEventListener("click", () => applyBookshelfView(button.getAttribute("data-bookshelf-view-button")));
    });

    const closeBookshelfMore = (phone) => {
      const layer = phone?.querySelector("[data-bookshelf-more-layer]");
      if (layer) {
        layer.setAttribute("aria-hidden", "true");
      }
    };

    const currentRoute = () => screenHost.closest(".fd-demo")?.getAttribute("data-current-route") || "";
    const setMainTabFeedback = (message) => {
      appState.mainTabFeedback = message;
      renderCurrentRoute();
    };
    const handleTopAction = (button) => {
      const action = button.getAttribute("data-top-action") || button.getAttribute("aria-label") || "";
      const route = currentRoute();
      if (action === "search") {
        if (route === "bookshelf" || route === "discover") {
          appState.bookSearchPhase = "before";
          goTo("book-search", true);
          return;
        }
        if (route === "rss") {
          setMainTabFeedback("RSS 搜索入口已保留，完整 RSS 搜索页后续设计。");
          return;
        }
        if (route === "settings") {
          setMainTabFeedback("设置内搜索入口已保留，后续进入设置搜索页。");
          return;
        }
      }
      if (action === "more") {
        if (route === "bookshelf" || route === "bookshelf-empty") {
          const phone = button.closest(".fd-phone");
          const layer = phone?.querySelector("[data-bookshelf-more-layer]");
          if (layer) {
            layer.setAttribute("aria-hidden", "false");
            layer.querySelector(".fd-bookshelf-more-menu button")?.focus({ preventScroll: true });
          }
          return;
        }
        const messages = {
          discover: "发现更多入口已保留，来源选择、分类管理和发现设置后续设计。",
          rss: "RSS 更多入口已保留，订阅管理、添加订阅源和条目菜单后续设计。",
          settings: "设置更多入口已保留，导入导出和恢复默认必须进入后续二级流程。"
        };
        setMainTabFeedback(messages[route] || "更多入口已保留，当前页面暂不展开完整次级流程。");
        return;
      }
      if (action === "refresh") {
        setMainTabFeedback("刷新应发生在当前内容区，不替换 MainTabShell 顶部结构。");
      }
    };

    screenHost.querySelectorAll(".fd-main-tab-phone .fd-top-actions [data-top-action]").forEach((button) => {
      button.addEventListener("click", () => handleTopAction(button));
    });

    screenHost.querySelectorAll("[data-close-bookshelf-more]").forEach((button) => {
      button.addEventListener("click", () => closeBookshelfMore(button.closest(".fd-phone")));
    });

    screenHost.querySelectorAll("[data-search-submit]").forEach((button) => {
      button.addEventListener("click", () => {
        appState.bookSearchPhase = "after";
        renderCurrentRoute();
      });
    });

    screenHost.querySelectorAll("[data-search-reset]").forEach((button) => {
      button.addEventListener("click", () => {
        appState.bookSearchPhase = "before";
        renderCurrentRoute();
      });
    });

    screenHost.querySelectorAll("[data-add-search-shelf]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const row = button.closest(".fd-search-result-row");
        const state = row?.querySelector(".fd-search-result-state");
        if (state) {
          state.textContent = "已在书架";
          state.classList.add("is-in-shelf");
        }
        button.textContent = "阅读";
        button.removeAttribute("data-add-search-shelf");
        button.setAttribute("data-route", "immersive-reading");
      });
    });

    const openSettingsOverlay = (trigger) => {
      const overlay = trigger.getAttribute("data-settings-overlay") || "";
      if (overlay === "edit" || overlay === "log") {
        const panel = screenHost.querySelector(`.fd-settings-subpanel.is-${overlay}`);
        if (panel) {
          panel.classList.add("is-focused");
          panel.scrollIntoView({ block: "center", behavior: "smooth" });
          window.setTimeout(() => panel.classList.remove("is-focused"), 720);
        }
        return;
      }
      if (overlay === "sheet" || overlay === "dialog" || overlay.startsWith("dialog:")) {
        appState.settingsOverlay = overlay;
        renderCurrentRoute();
      }
    };

    screenHost.querySelectorAll("[data-settings-overlay]").forEach((targetEl) => {
      targetEl.addEventListener("click", (event) => {
        event.preventDefault();
        openSettingsOverlay(targetEl);
      });
      targetEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openSettingsOverlay(targetEl);
        }
      });
    });

    screenHost.querySelectorAll("[data-close-settings-overlay]").forEach((button) => {
      button.addEventListener("click", () => {
        appState.settingsOverlay = "";
        renderCurrentRoute();
      });
    });

    screenHost.querySelectorAll("[data-settings-option-key]").forEach((targetEl) => {
      const toggleOption = () => {
        const key = targetEl.getAttribute("data-settings-option-key") || "";
        appState.settingsOverlay = "";
        appState.settingsExpandedOption = appState.settingsExpandedOption === key ? "" : key;
        renderCurrentRoute();
      };
      targetEl.addEventListener("click", (event) => {
        event.preventDefault();
        toggleOption();
      });
      targetEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleOption();
        }
      });
    });

    screenHost.querySelectorAll("[data-settings-option-choice]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const key = button.getAttribute("data-settings-option-choice") || "";
        const value = button.getAttribute("data-settings-option-value") || "";
        appState.settingsValues[key] = value;
        appState.settingsExpandedOption = "";
        appState.settingsOverlay = "";
        renderCurrentRoute();
      });
    });

    screenHost.querySelectorAll("[data-reader-more-toggle]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        appState.readerMoreOpen = !appState.readerMoreOpen;
        renderCurrentRoute();
      });
    });

    screenHost.querySelectorAll("[data-reader-more-close], [data-reader-more-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        appState.readerMoreOpen = false;
        renderCurrentRoute();
      });
    });

    screenHost.querySelectorAll("[data-reader-selection-close], [data-reader-selection-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeReaderTextSelection();
      });
    });

    screenHost.querySelectorAll(".fd-immersive-hotzone, .fd-ir-reading-layer").forEach((targetEl) => {
      let textSelectionTimer = null;
      let textSelectionTriggered = false;
      const clearTextSelectionTimer = () => {
        if (textSelectionTimer) {
          window.clearTimeout(textSelectionTimer);
          textSelectionTimer = null;
        }
      };
      targetEl.addEventListener("pointerdown", (event) => {
        if (event.button && event.button !== 0) {
          return;
        }
        textSelectionTriggered = false;
        clearTextSelectionTimer();
        textSelectionTimer = window.setTimeout(() => {
          textSelectionTriggered = true;
          openReaderTextSelection();
        }, 620);
      });
      ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
        targetEl.addEventListener(eventName, clearTextSelectionTimer);
      });
      targetEl.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        textSelectionTriggered = true;
        openReaderTextSelection();
      });
      targetEl.addEventListener("click", (event) => {
        clearTextSelectionTimer();
        if (textSelectionTriggered) {
          event.preventDefault();
          event.stopPropagation();
          textSelectionTriggered = false;
        }
      }, true);
    });

    screenHost.querySelectorAll("[data-source-name]").forEach((targetEl) => {
      const selectSource = () => {
        appState.sourceSwitchSelectedSource = targetEl.getAttribute("data-source-name") || "";
        renderCurrentRoute();
      };
      targetEl.addEventListener("click", (event) => {
        event.preventDefault();
        selectSource();
      });
      targetEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectSource();
        }
      });
    });

    screenHost.querySelectorAll("[data-source-menu-toggle]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        appState.sourceMenuOpen = !appState.sourceMenuOpen;
        renderCurrentRoute();
      });
    });

    screenHost.addEventListener("click", (event) => {
      const button = event.target.closest?.("[data-source-switch]");
      if (!button || !screenHost.contains(button)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const title = button.getAttribute("data-source-switch") || "";
      const current = button.getAttribute("aria-pressed") === "true";
      const next = !current;
      appState.sourceEnabled[title] = next;
      button.classList.toggle("is-on", next);
      button.setAttribute("aria-pressed", next ? "true" : "false");
      button.setAttribute("aria-label", `${title || "书源"}${next ? "已启用，点击禁用" : "已禁用，点击启用"}`);
    }, true);

    screenHost.querySelectorAll(".fd-source-row-test").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
      });
    });

    screenHost.querySelectorAll("[data-route]").forEach((targetEl) => {
      if (targetEl.hasAttribute("data-book-cover")) {
        return;
      }
      const navigate = () => {
        const route = targetEl.getAttribute("data-route");
        const shouldReplaceRoute = targetEl.hasAttribute("data-route-replace") || Boolean(targetEl.closest(".fd-source-control-continuity"));
        if (targetEl.classList.contains("fd-reader-module") && route === currentRoute()) {
          replaceTopRoute("reader");
          return;
        }
        if (route === "book-search") {
          appState.bookSearchPhase = "before";
        }
        if (targetEl.hasAttribute("data-restore-record")) {
          appState.selectedRestoreRecord = targetEl.getAttribute("data-restore-record") || "";
        }
        if (targetEl.closest("[data-reader-more-layer]")) {
          appState.readerMoreOpen = false;
        }
        closeBookshelfMore(targetEl.closest(".fd-phone"));
        if (shouldReplaceRoute) {
          replaceTopRoute(route);
          return;
        }
        goTo(route, true);
      };
      targetEl.addEventListener("click", navigate);
      targetEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate();
        }
      });
    });

    screenHost.querySelectorAll("[data-book-cover]").forEach((button) => {
      let longPressTimer = null;
      let longPressTriggered = false;
      const clearLongPress = () => {
        if (longPressTimer) {
          window.clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      };
      button.addEventListener("pointerdown", (event) => {
        if (event.button && event.button !== 0) {
          return;
        }
        longPressTriggered = false;
        clearLongPress();
        longPressTimer = window.setTimeout(() => {
          longPressTriggered = true;
          openBookFocus(button);
        }, 560);
      });
      button.addEventListener("pointerup", clearLongPress);
      button.addEventListener("pointercancel", clearLongPress);
      button.addEventListener("pointerleave", clearLongPress);
      button.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        longPressTriggered = true;
        openBookFocus(button);
      });
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        clearLongPress();
        if (longPressTriggered) {
          longPressTriggered = false;
          return;
        }
        closeBookFocus(button.closest(".fd-phone"));
        goTo(button.getAttribute("data-route") || "immersive-reading", true);
      });
      button.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          closeBookFocus(button.closest(".fd-phone"));
          goTo(button.getAttribute("data-route") || "immersive-reading", true);
        }
        if (event.key === " ") {
          event.preventDefault();
          openBookFocus(button);
        }
      });
    });

    screenHost.querySelectorAll("[data-close-book-focus]").forEach((button) => {
      button.addEventListener("click", () => closeBookFocus(button.closest(".fd-phone")));
    });

    screenHost.querySelectorAll("[data-book-focus-layer]").forEach((layer) => {
      layer.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeBookFocus(layer.closest(".fd-phone"));
        }
      });
    });

    screenHost.querySelectorAll("[data-route-back], .fd-back-bar button[aria-label='返回']").forEach((button) => {
      button.addEventListener("click", goBack);
    });

    screenHost.querySelectorAll("[data-reader-dismiss]").forEach((button) => {
      button.addEventListener("click", () => replaceTopRoute(button.getAttribute("data-reader-dismiss") || "immersive-reading"));
    });

    screenHost.querySelectorAll("[data-reader-exit]").forEach((button) => {
      button.addEventListener("click", exitReader);
    });

    screenHost.querySelectorAll("[data-reader-toc-mode]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        appState.readerTocMode = button.getAttribute("data-reader-toc-mode") === "bookmark" ? "bookmark" : "directory";
        renderCurrentRoute();
      });
    });

    screenHost.querySelectorAll("[data-reader-directory-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        applyReaderDirectoryIndex(button.getAttribute("data-reader-directory-index"));
      });
    });

    screenHost.querySelectorAll("[data-reader-tts-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        applyReaderTtsAction(button.getAttribute("data-reader-tts-action"));
      });
    });

    screenHost.querySelectorAll("[data-reader-tts-cycle]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        applyReaderTtsCycle(button.getAttribute("data-reader-tts-cycle"));
      });
    });

    screenHost.querySelectorAll("[data-reader-tts-option-key]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        toggleReaderTtsOption(button.getAttribute("data-reader-tts-option-key"));
      });
    });

    screenHost.querySelectorAll("[data-reader-tts-option]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        applyReaderTtsOption(button.getAttribute("data-reader-tts-option"), button.getAttribute("data-reader-tts-value") || "");
      });
    });

    screenHost.querySelectorAll("[data-reader-theme]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        applyReaderTheme(button.getAttribute("data-reader-theme"));
      });
    });

    screenHost.querySelectorAll("[data-reader-typography-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        applyTypographyAction(button.getAttribute("data-reader-typography-action"));
      });
    });

    screenHost.querySelectorAll("[data-reader-typography-set]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const key = button.getAttribute("data-reader-typography-set");
        if (key === "fontFamily") {
          appState.readerTypography.fontFamily = button.getAttribute("data-reader-typography-value") || readerDefaultFontValue(data);
          renderCurrentRoute();
        }
      });
    });

    screenHost.querySelectorAll("[data-reader-brightness-auto]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        appState.readerBrightnessAuto = !appState.readerBrightnessAuto;
        syncReaderBrightnessDom(appState.readerBrightness, appState.readerBrightnessAuto);
      });
    });

    screenHost.querySelectorAll("[data-reader-brightness-track]").forEach((track) => {
      track.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        track.setPointerCapture?.(event.pointerId);
        applyReaderBrightnessTrack(track, event.clientY);
        const move = (moveEvent) => applyReaderBrightnessTrack(track, moveEvent.clientY);
        const done = (doneEvent) => {
          track.releasePointerCapture?.(doneEvent.pointerId);
          track.removeEventListener("pointermove", move);
          track.removeEventListener("pointerup", done);
          track.removeEventListener("pointercancel", done);
        };
        track.addEventListener("pointermove", move);
        track.addEventListener("pointerup", done);
        track.addEventListener("pointercancel", done);
      });
      track.addEventListener("keydown", (event) => {
        const brightnessConfig = readerBrightnessConfig(data);
        const current = readerBrightnessValue(data, appState);
        if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
          event.preventDefault();
          syncReaderBrightnessDom(current - brightnessConfig.step, false);
        }
        if (event.key === "ArrowUp" || event.key === "ArrowRight") {
          event.preventDefault();
          syncReaderBrightnessDom(current + brightnessConfig.step, false);
        }
      });
    });

    screenHost.querySelectorAll("[data-reader-setting-toggle]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        applyReaderSettingToggle(button.getAttribute("data-reader-setting-toggle"));
      });
    });

    screenHost.querySelectorAll("[data-reader-setting-option-key]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        toggleReaderSettingOption(button.getAttribute("data-reader-setting-option-key"));
      });
    });

    screenHost.querySelectorAll("[data-reader-setting-option]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        applyReaderSettingOption(button.getAttribute("data-reader-setting-option"), button.getAttribute("data-reader-setting-value") || "");
      });
    });

    screenHost.querySelectorAll("[data-reader-page-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        applyReaderPageAction(button.getAttribute("data-reader-page-action"));
      });
    });

    screenHost.querySelectorAll("[data-reader-chapter-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.getAttribute("aria-disabled") === "true") {
          return;
        }
        applyReaderChapterAction(button.getAttribute("data-reader-chapter-action"));
      });
    });

    screenHost.querySelectorAll("[data-reader-chapter-progress]").forEach((progress) => {
      progress.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        progress.setPointerCapture?.(event.pointerId);
        applyReaderChapterProgress(progress, event.clientX, false);
        const move = (moveEvent) => applyReaderChapterProgress(progress, moveEvent.clientX, false);
        const done = (doneEvent) => {
          progress.releasePointerCapture?.(doneEvent.pointerId);
          progress.removeEventListener("pointermove", move);
          progress.removeEventListener("pointerup", done);
          progress.removeEventListener("pointercancel", done);
          renderCurrentRoute();
        };
        progress.addEventListener("pointermove", move);
        progress.addEventListener("pointerup", done);
        progress.addEventListener("pointercancel", done);
      });
      progress.addEventListener("keydown", (event) => {
        const chapterProgressConfig = readerChapterProgressConfig(data);
        const current = readerChapterProgressValue(data, appState);
        if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
          event.preventDefault();
          appState.readerChapterProgress = clamp(current - chapterProgressConfig.step, chapterProgressConfig.min, chapterProgressConfig.max);
          renderCurrentRoute();
        }
        if (event.key === "ArrowRight" || event.key === "ArrowUp") {
          event.preventDefault();
          appState.readerChapterProgress = clamp(current + chapterProgressConfig.step, chapterProgressConfig.min, chapterProgressConfig.max);
          renderCurrentRoute();
        }
      });
    });

    screenHost.querySelectorAll(".fd-main-tab-phone .fd-main-nav-item").forEach((button) => {
      button.addEventListener("click", () => {
        const type = button.getAttribute("data-nav-type");
        const route = type === "settings" ? "settings" : type;
        goTab(route);
      });
    });

    screenHost.querySelectorAll("[data-open-keyboard]").forEach((button) => {
      button.addEventListener("click", () => {
        const phone = button.closest(".fd-phone");
        phone.classList.add("has-keyboard");
        const keyboard = phone.querySelector("[data-keyboard-host]");
        const input = phone.querySelector("[data-keyboard-input]");
        if (keyboard) {
          keyboard.setAttribute("aria-hidden", "false");
        }
        if (input) {
          const focusInput = () => {
            input.focus({ preventScroll: true });
            input.setSelectionRange(input.value.length, input.value.length);
          };
          focusInput();
          window.setTimeout(focusInput, 30);
          window.setTimeout(focusInput, 120);
        }
      });
    });

    screenHost.querySelectorAll("[data-close-keyboard]").forEach((button) => {
      button.addEventListener("click", () => {
        const phone = button.closest(".fd-phone");
        phone.classList.remove("has-keyboard");
        const keyboard = phone.querySelector("[data-keyboard-host]");
        if (keyboard) {
          keyboard.setAttribute("aria-hidden", "true");
        }
      });
    });

    screenHost.querySelectorAll("[data-open-sheet]").forEach((button) => {
      button.addEventListener("click", () => {
        const phone = button.closest(".fd-phone");
        phone.classList.add("has-sheet");
        const sheet = phone.querySelector("[data-demo-sheet]");
        if (sheet) {
          sheet.setAttribute("aria-hidden", "false");
        }
      });
    });

    screenHost.querySelectorAll("[data-close-sheet]").forEach((button) => {
      button.addEventListener("click", () => {
        const phone = button.closest(".fd-phone");
        phone.classList.remove("has-sheet");
        const sheet = phone.querySelector("[data-demo-sheet]");
        if (sheet) {
          sheet.setAttribute("aria-hidden", "true");
        }
      });
    });

    screenHost.querySelectorAll("[data-open-dialog]").forEach((button) => {
      button.addEventListener("click", () => {
        const phone = button.closest(".fd-phone");
        phone.classList.add("has-dialog");
        const dialog = phone.querySelector("[data-demo-dialog]");
        if (dialog) {
          dialog.setAttribute("aria-hidden", "false");
        }
      });
    });

    screenHost.querySelectorAll("[data-close-dialog]").forEach((button) => {
      button.addEventListener("click", () => {
        const phone = button.closest(".fd-phone");
        phone.classList.remove("has-dialog");
        const dialog = phone.querySelector("[data-demo-dialog]");
        if (dialog) {
          dialog.setAttribute("aria-hidden", "true");
        }
      });
    });

    screenHost.querySelectorAll(".fd-flow-comparison article").forEach((card) => {
      const selectSource = () => {
        const flow = card.closest(".fd-flow-frame");
        const source = card.getAttribute("data-source-name") || card.querySelector("strong")?.textContent || "";
        flow.querySelectorAll(".fd-flow-comparison article").forEach((item) => {
          item.classList.toggle("is-selected", item === card);
        });
        const result = flow.querySelector(".fd-flow-result p");
        if (result) {
          result.textContent = `目标书源${source}章节一致，可保留 38% 阅读进度。`;
        }
      };
      card.addEventListener("click", selectSource);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectSource();
        }
      });
    });
  }

  window.ReaderFrontendDemoDraft = {
    render
  };
})(window);
