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

  function attrHtml(attrs) {
    return Object.entries(attrs || {})
      .filter(([, value]) => value !== false && value != null)
      .map(([key, value]) => value === true ? ` ${key}` : ` ${key}="${esc(value)}"`)
      .join("");
  }

  function filterDisclosure(config) {
    const open = Boolean(config.open);
    const summary = config.summary || "全部";
    const toggleAttr = config.toggleAttr || "data-filter-toggle";
    const groups = (config.groups || []).map((group) => `
        <article>
          <strong>${esc(group.title)}</strong>
          <div>
            ${(group.options || []).map((option) => `
              <button class="${option.active ? "is-active" : ""}" type="button"${option.route ? ` data-route="${esc(option.route)}"` : ""}${attrHtml(option.attrs)}>
                ${option.icon ? icon(option.icon, "fd-small-icon") : ""}
                <span>${esc(option.label)}</span>
              </button>`).join("")}
          </div>
        </article>`).join("");
    return `
      <section class="fd-filter-control ${config.className || ""}${config.applyRoute ? " has-apply" : ""}${open ? " is-open" : ""}" aria-label="${esc(config.ariaLabel || config.label || "筛选")}">
        <button class="fd-filter-trigger" type="button" ${toggleAttr} aria-expanded="${open ? "true" : "false"}">
          ${icon("filter", "fd-small-icon")}
          <span>${esc(config.label || "筛选")}</span>
          <em>${esc(summary)}</em>
          ${icon("chevron", "fd-small-icon fd-filter-chevron")}
        </button>
        ${config.applyRoute ? `<button class="fd-filter-apply" type="button" data-route="${esc(config.applyRoute)}" data-filter-close>${icon("check", "fd-small-icon")}${esc(config.applyLabel || "应用")}</button>` : ""}
        ${open ? `<section class="fd-filter-menu">${groups}</section>` : ""}
      </section>`;
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

  function bookSupportsChapterDownload(book) {
    if (!book) {
      return true;
    }
    if (book.local === true || book.isLocal === true || book.kind === "local" || book.type === "local") {
      return false;
    }
    const bookSource = [book.source, book.author, book.meta].filter(Boolean).join(" ");
    return !/(本地|导入|离线|文件)/.test(bookSource);
  }

  function chapterDownloadKey(chapter, index) {
    return `${Number.isFinite(Number(index)) ? Number(index) : 0}:${chapter?.title || "chapter"}`;
  }

  function chapterDownloadState(chapter, appState, options) {
    if (!bookSupportsChapterDownload(options?.book)) {
      return "local";
    }
    const key = chapterDownloadKey(chapter, options?.chapterIndex);
    const runtimeState = appState?.readerChapterDownloads?.[key] || "";
    if (runtimeState === "loading" || runtimeState === "complete" || runtimeState === "cached") {
      return runtimeState;
    }
    return chapterHasMarker(chapter, "已缓存") ? "cached" : "idle";
  }

  function chapterDownloadSlot(chapter, appState, options) {
    const state = chapterDownloadState(chapter, appState, options);
    if (state === "local") {
      return "";
    }
    const key = chapterDownloadKey(chapter, options?.chapterIndex);
    const completed = state === "complete" || Boolean(appState?.readerChapterDownloadCompleted?.[key]);
    const isLoading = state === "loading";
    const isCached = state === "cached" || state === "complete";
    const classes = [
      "is-download-slot",
      "fd-chapter-download-button",
      isCached ? "is-active" : "",
      isLoading ? "is-loading" : "",
      completed ? "is-complete" : ""
    ].filter(Boolean).join(" ");
    const label = isLoading
      ? `正在下载 ${chapter?.title || "章节"}`
      : isCached
        ? `${chapter?.title || "章节"} 已下载`
        : `下载 ${chapter?.title || "章节"}`;
    return `
        <button class="${classes}" type="button" data-reader-chapter-download="${esc(key)}" data-reader-chapter-download-state="${esc(state)}" aria-label="${esc(label)}" aria-busy="${isLoading ? "true" : "false"}" aria-disabled="${isCached || isLoading ? "true" : "false"}" title="${esc(isLoading ? "下载中" : isCached ? "已下载" : "未下载，点击下载")}">
          ${isLoading ? `<i class="fd-chapter-download-spinner" aria-hidden="true"></i>` : icon(isCached ? "check" : "download", "fd-small-icon")}
        </button>`;
  }

  function chapterMarkerSlots(chapter, appState, options) {
    const supportsDownload = bookSupportsChapterDownload(options?.book);
    const bookmarked = chapterHasMarker(chapter, "书签");
    return `
      <span class="fd-chapter-marker-slots${supportsDownload ? "" : " is-local-book"}" aria-label="章节标识">
        ${chapterDownloadSlot(chapter, appState, options)}
        <em class="is-bookmark-slot ${bookmarked ? "is-active" : ""}" title="${bookmarked ? "书签" : "无书签"}">${icon("bookmark", "fd-small-icon")}</em>
      </span>`;
  }

  function cover(data, coverKey) {
    return esc((data.covers || {})[coverKey] || "");
  }

  function stylesheetRelativeAsset(src) {
    return String(src || "").replace(/^\.\//, "../");
  }

  function coverCss(data, coverKey) {
    return esc(stylesheetRelativeAsset((data.covers || {})[coverKey] || ""));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
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
      throw new Error("ReaderShellKit is required before frontend-demo/render-runtime.js");
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
            <span class="fd-book-focus-cover" data-focus-cover aria-hidden="true" style="--focus-cover:url('${coverCss(data, first.coverKey)}')"></span>
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
      { icon: "book-open", title: "本地书导入", meta: "导入本地文件到书架", route: "local-import" }
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

  function bookshelfSortFilterState(appState) {
    return {
      group: appState?.bookshelfGroup || "全部",
      sort: appState?.bookshelfSort || "最近更新",
      filter: appState?.bookshelfFilter || "全部",
      open: Boolean(appState?.bookshelfFilterOpen)
    };
  }

  function bookshelfFilterPopover(appState, disabled) {
    const state = bookshelfSortFilterState(appState);
    if (disabled || !state.open) {
      return "";
    }
    const groupOptions = ["全部", "默认", "本地书", "追更"];
    const sortOptions = ["最近更新", "阅读进度", "书名", "作者"];
    const filterOptions = ["全部", "未读", "已完结", "更新失败"];
    return `
          <section class="fd-bookshelf-filter-popover" aria-label="书架排序与筛选选项">
            <article>
              <strong>分组</strong>
              <div>
                ${groupOptions.map((item) => `<button class="${item === state.group ? "is-active" : ""}" type="button" data-bookshelf-group-option="${esc(item)}"${item === state.group ? ' aria-current="true"' : ""}>${esc(item)}</button>`).join("")}
              </div>
            </article>
            <article>
              <strong>排序</strong>
              <div>
                ${sortOptions.map((item) => `<button class="${item === state.sort ? "is-active" : ""}" type="button" data-bookshelf-sort-option="${esc(item)}"${item === state.sort ? ' aria-current="true"' : ""}>${esc(item)}</button>`).join("")}
              </div>
            </article>
            <article>
              <strong>筛选</strong>
              <div>
                ${filterOptions.map((item) => `<button class="${item === state.filter ? "is-active" : ""}" type="button" data-bookshelf-filter-option="${esc(item)}"${item === state.filter ? ' aria-current="true"' : ""}>${esc(item)}</button>`).join("")}
              </div>
            </article>
          </section>`;
  }

  function bookshelfBookGroup(book, index) {
    const title = String(book?.title || "");
    const author = String(book?.author || "");
    if (/本地|离线|导入|文档/.test(author)) {
      return "本地书";
    }
    if (index < 4 || /书源|同步/.test(author) || /灯塔与雾/.test(title)) {
      return "追更";
    }
    return "默认";
  }

  function bookshelfBookMatchesGroup(book, index, group) {
    return group === "全部" || bookshelfBookGroup(book, index) === group;
  }

  function bookshelfBookMatchesFilter(book, index, filter) {
    const progress = Number.parseInt(String(book.progress || "0").replace("%", ""), 10) || 0;
    const title = String(book.title || "");
    const author = String(book.author || "");
    if (filter === "未读") {
      return progress < 20;
    }
    if (filter === "已完结") {
      return /三体|人间词话/.test(title);
    }
    if (filter === "更新失败") {
      return /长标题测试|书源同步/.test(title) || /书源同步/.test(author);
    }
    return true;
  }

  function bookshelfSortedBooks(books, appState) {
    const state = bookshelfSortFilterState(appState);
    const normalized = (books || [])
      .map((book, index) => ({ book, index }))
      .filter(({ book, index }) => bookshelfBookMatchesGroup(book, index, state.group))
      .filter(({ book, index }) => bookshelfBookMatchesFilter(book, index, state.filter));
    if (state.sort === "阅读进度") {
      normalized.sort((left, right) => {
        const leftProgress = Number.parseInt(String(left.book.progress || "0").replace("%", ""), 10) || 0;
        const rightProgress = Number.parseInt(String(right.book.progress || "0").replace("%", ""), 10) || 0;
        return rightProgress - leftProgress || left.index - right.index;
      });
    } else if (state.sort === "书名") {
      normalized.sort((left, right) => String(left.book.title || "").localeCompare(String(right.book.title || ""), "zh-Hans") || left.index - right.index);
    } else if (state.sort === "作者") {
      normalized.sort((left, right) => String(left.book.author || "").localeCompare(String(right.book.author || ""), "zh-Hans") || left.index - right.index);
    }
    return normalized.map(({ book }) => book);
  }

  function bookshelfSectionHeader(bookshelfView, disabled, appState) {
    const state = bookshelfSortFilterState(appState);
    const filterActive = state.open || state.group !== "全部" || state.sort !== "最近更新" || state.filter !== "全部";
    return `
          <section class="fd-section-head fd-bookshelf-section-head">
            <div>
              <h2>我的书架</h2>
            </div>
            <span class="fd-bookshelf-view-actions">
              <button class="${bookshelfView === "cover" ? "is-active" : ""}" type="button" aria-label="封面视图" data-bookshelf-view-button="cover" aria-pressed="${bookshelfView === "cover" ? "true" : "false"}"${disabled ? " disabled" : ""}>${icon("grid", "fd-small-icon")}</button>
              <button class="${bookshelfView === "list" ? "is-active" : ""}" type="button" aria-label="列表视图" data-bookshelf-view-button="list" aria-pressed="${bookshelfView === "list" ? "true" : "false"}"${disabled ? " disabled" : ""}>${icon("list", "fd-small-icon")}</button>
              <button class="${filterActive ? "is-active" : ""}" type="button" aria-label="书架筛选：${esc(state.group)}，${esc(state.sort)}，${esc(state.filter)}" data-bookshelf-filter-toggle aria-expanded="${state.open ? "true" : "false"}"${disabled ? " disabled" : ""}>${icon("filter", "fd-small-icon")}</button>
              <button type="button" aria-label="书架显示设置" data-route="bookshelf-search-settings" data-settings-scope="bookshelf-display">${icon("gear", "fd-small-icon")}</button>
            </span>
          </section>`;
  }

  function mainTabBookshelf(data, appState) {
    const first = data.mainTabs.books[0];
    const bookshelfView = appState?.bookshelfView === "list" ? "list" : "cover";
    const visibleBooks = bookshelfSortedBooks(data.mainTabs.books, appState);
    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone"), {
      data,
      title: "书架",
      activeType: "bookshelf",
      actions: ["search", "more"],
      ariaLabel: "书架",
      contentHtml: `
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
        <section class="fd-bookshelf-shelf-section" aria-label="我的书架">
          ${bookshelfSectionHeader(bookshelfView, false, appState)}
          ${bookshelfFilterPopover(appState, false)}
          <section class="fd-book-grid ${bookshelfView === "list" ? "is-list-view" : "is-cover-view"}" data-book-grid data-bookshelf-view="${bookshelfView}" aria-label="${bookshelfView === "list" ? "书籍列表" : "书籍封面网格"}">
            ${visibleBooks.map((book) => bookCard(data, book)).join("")}
          </section>
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

  function discoverContext(route, appState) {
    const entryRouteMap = {
      "discover-entry-ranking": "排行榜",
      "discover-entry-bestseller": "畅销",
      "discover-entry-category": "分类",
      "discover-entry-finished": "完本",
      "discover-entry-latest": "最新",
      "discover-entry-new": "新书",
      "discover-entry-booklist": "书单"
    };
    const filterRouteMap = {
      "discover-filter-keyword": "关键词",
      "discover-filter-male": "男频",
      "discover-filter-female": "女频"
    };
    const sortRouteMap = {
      "discover-sort-popularity": "人气",
      "discover-sort-update": "更新",
      "discover-sort-collection": "收藏",
      "discover-sort-finished": "完本",
      "discover-sort-words": "字数"
    };
    const switched = route === "discover-switched-source";
    const source = switched
      ? { name: "起点导入", meta: "正版 · 已启用发现 · 180ms", status: "已启用发现", speed: "180ms" }
      : { name: "优书网", meta: "默认分组 · 已启用发现 · 120ms", status: "已启用发现", speed: "120ms" };
    const entries = switched ? ["畅销", "分类", "新书", "完本"] : ["排行榜", "分类", "完本", "最新", "书单"];
    const routedEntry = entryRouteMap[route];
    const routedFilter = filterRouteMap[route];
    const stateEntry = appState?.discoverEntry;
    const activeEntry = routedEntry && entries.includes(routedEntry)
      ? routedEntry
      : stateEntry && entries.includes(stateEntry)
        ? stateEntry
        : entries[0];
    const activeFilter = routedFilter || appState?.discoverFilter || "男频";
    const sort = sortRouteMap[route] || appState?.discoverSort || (switched ? "更新" : "人气");
    const sortOpen = route === "discover-sort" || Boolean(appState?.discoverSortOpen);
    const totalByRoute = {
      "discover-entry-category": 32,
      "discover-entry-finished": 21,
      "discover-entry-latest": 27,
      "discover-entry-booklist": 14,
      "discover-filter-keyword": 9,
      "discover-filter-female": 16,
      "discover-sort-update": 25,
      "discover-sort-collection": 19,
      "discover-sort-finished": 21,
      "discover-sort-words": 23
    };
    const totalBySort = {
      "更新": 25,
      "收藏": 19,
      "完本": 21,
      "字数": 23
    };
    return {
      route,
      source,
      entries,
      activeEntry,
      activeFilter,
      total: switched ? 24 : route === "discover-page-two" ? 38 : totalByRoute[route] || totalBySort[sort] || 18,
      sort,
      sortOpen
    };
  }

  function discoverEntryRoute(item) {
    return {
      "排行榜": "discover-entry-ranking",
      "畅销": "discover-entry-bestseller",
      "分类": "discover-entry-category",
      "完本": "discover-entry-finished",
      "最新": "discover-entry-latest",
      "新书": "discover-entry-new",
      "书单": "discover-entry-booklist"
    }[item] || "discover";
  }

  function discoverFilterRoute(item) {
    return {
      "关键词": "discover-filter-keyword",
      "男频": "discover-filter-male",
      "女频": "discover-filter-female"
    }[item] || "discover";
  }

  function discoverSortRoute(item) {
    return {
      "人气": "discover-sort-popularity",
      "更新": "discover-sort-update",
      "收藏": "discover-sort-collection",
      "完本": "discover-sort-finished",
      "字数": "discover-sort-words"
    }[item] || "discover";
  }

  function discoverBooks(data, route) {
    const switched = route === "discover-switched-source";
    const base = switched
      ? [
          ["诡秘之主", "爱潜水的乌贼", "奇幻 · 完本", "最新：番外已整理", "克莱恩在迷雾中醒来，新的线索沿着塔罗会延伸。", "mysteryLord", true],
          ["纸上城市", "默认分组", "都市 · 连载", "最新：第 18 章", "城市被写在纸页上，所有路口都藏着旧书源的暗号。", "renjian", false],
          ["灯塔与雾", "书源同步", "悬疑 · 连载", "最新：第 51 章", "雾气吞没海岸线，灯塔的记录仍在夜里闪烁。", "brightMoon", false],
          ["群星之间", "本地导入", "科幻 · 连载", "最新：第 12 章", "星舰穿过静默航道，旧文明的坐标重新亮起。", "threeBody", true]
        ]
      : [
          ["长夜余火", "爱潜水的乌贼", "科幻 · 连载", "最新：第 32 章 雨夜", "雨声在窗外连成一片，旧世界的线索在夜里慢慢浮出。", "longNight", true],
          ["诡秘之主", "爱潜水的乌贼", "奇幻 · 完本", "最新：番外已整理", "蒸汽、塔罗与旧日秘密交织，适合继续追读。", "mysteryLord", true],
          ["三体", "刘慈欣", "科幻 · 完本", "最新：三部曲合集", "文明在宇宙暗处相互凝视，微小选择带来巨大回声。", "threeBody", false],
          ["明朝那些事儿", "当年明月", "历史 · 完本", "最新：全集校对", "用更轻松的方式重新翻开明朝人物与权力线索。", "brightMoon", false],
          ["纸上城市", "默认分组", "都市 · 连载", "最新：第 12 章", "纸页边缘折起，城市的名字开始变化。", "renjian", false]
        ];
    const extra = route === "discover-page-two" || route === "discover-infinite-loading"
      ? [["旧日回响", "离线书库", "奇幻 · 连载", "最新：第 18 章", "旧日钟声从废墟里传回，缓存章节仍可打开。", "longNight", false]]
      : [];
    return base.concat(extra);
  }

  function discoverSourceBar(ctx, expanded, route) {
    const target = expanded ? "discover" : "discover-control";
    return `
      <button class="fd-discover-source-bar${expanded ? " is-expanded" : ""}" type="button" data-route="${esc(target)}" aria-expanded="${expanded ? "true" : "false"}">
        <span>${icon("source-stack", "fd-small-icon")}</span>
        <strong>${esc(ctx.source.name)}<small>${esc(ctx.source.meta)}</small></strong>
        ${icon("chevron", "fd-small-icon fd-discover-source-chevron")}
      </button>`;
  }

  function discoverEntryChips(ctx) {
    return `<nav class="fd-discover-entry-row" aria-label="发现入口">
      ${ctx.entries.map((item) => {
        const active = item === ctx.activeEntry;
        return `<button class="${active ? "is-active" : ""}" type="button" data-route="${esc(discoverEntryRoute(item))}" data-discover-entry="${esc(item)}"${active ? ' aria-current="page"' : ""}>${esc(item)}</button>`;
      }).join("")}
    </nav>`;
  }

  function discoverFilterBar(ctx, appState) {
    const filters = ["关键词", "男频", "女频"];
    const sorts = ["人气", "更新", "收藏", "完本", "字数"];
    return filterDisclosure({
      className: "fd-discover-filter-control",
      label: "筛选",
      ariaLabel: "发现筛选与排序",
      summary: `${ctx.activeFilter} · ${ctx.sort}`,
      toggleAttr: "data-discover-filter-toggle",
      open: Boolean(appState?.discoverFilterOpen) || ctx.sortOpen,
      applyRoute: "discover-refreshing",
      groups: [
        {
          title: "范围",
          options: filters.map((item) => ({
            label: item,
            icon: item === "关键词" ? "search" : "",
            active: ctx.activeFilter === item,
            route: discoverFilterRoute(item),
            attrs: { "data-discover-filter": item }
          }))
        },
        {
          title: "排序",
          options: sorts.map((item) => ({
            label: item,
            active: ctx.sort === item,
            attrs: { "data-discover-sort-option": item }
          }))
        }
      ]
    });
  }

  function discoverResultHeader(ctx) {
    return `
      <header class="fd-discover-list-head">
        <h2>${esc(ctx.activeEntry)}</h2>
      </header>`;
  }

  function discoverBookRows(data, route, faded) {
    return `
      <section class="fd-discover-book-list${faded ? " is-muted" : ""}" aria-label="发现结果列表">
        ${discoverBooks(data, route).map(([title, author, kind, latest, intro, coverKey, inShelf]) => `
          <article class="fd-discover-book-row" role="button" tabindex="0" data-route="book-detail">
            <img src="${cover(data, coverKey)}" alt="${esc(title)}封面">
            <span class="fd-discover-shelf-dot${inShelf ? " is-in-shelf" : ""}" title="${inShelf ? "已在书架" : "未在书架"}"></span>
            <div>
              <h3>${esc(title)}</h3>
              <small>${esc(author)} · ${esc(kind)}</small>
              <em>${esc(latest)}</em>
              <p>${esc(intro)}</p>
            </div>
          </article>`).join("")}
      </section>`;
  }

  function discoverSkeletonList() {
    return `<section class="fd-discover-skeleton-list" aria-label="发现结果加载中">
      ${Array.from({ length: 4 }).map(() => `
        <article>
          <i></i>
          <span><b></b><b></b><b></b><b></b></span>
        </article>`).join("")}
    </section>`;
  }

  function discoverControlPanel(ctx, mode) {
    const sourceItems = [
      ["优书网", "默认 · 120ms", "good"],
      ["起点导入", mode === "switching" ? "正在解析入口" : "正版 · 180ms", mode === "switching" ? "loading" : "good"],
      ["轻小说文库", "需登录", "warn"],
      ["本地聚合源", "维护中", "muted"]
    ];
    const entryError = mode === "entry-error";
    return `
      <section class="fd-discover-control-panel${mode ? ` is-${esc(mode)}` : ""}" aria-label="发现控制层">
        <section>
          <h2>当前书源</h2>
          <div class="fd-discover-source-options">
            ${sourceItems.map(([name, meta, tone]) => `
              <button class="${name === ctx.source.name ? "is-active" : ""} is-${esc(tone)}" type="button" data-route="${name === "起点导入" ? "discover-switching-source" : "discover-control"}">
                <strong>${esc(name)}</strong><small>${esc(meta)}</small>
              </button>`).join("")}
          </div>
        </section>
        <section>
          <h2>发现入口</h2>
          ${entryError ? `
            <article class="fd-discover-inline-error">
              ${icon("warning", "fd-small-icon")}
              <span><strong>入口解析失败</strong><small>当前书源的 exploreUrl 返回异常。</small></span>
              <button type="button" data-route="discover-control">重试</button>
              <button type="button" data-route="discover-rule-test">编辑源</button>
            </article>` : `
            <div class="fd-discover-control-chips">
              ${ctx.entries.map((item) => {
                const active = item === ctx.activeEntry;
                return `<button class="${active ? "is-active" : ""}" type="button" data-route="${esc(discoverEntryRoute(item))}" data-discover-entry="${esc(item)}"${active ? ' aria-current="page"' : ""}>${esc(item)}</button>`;
              }).join("")}
            </div>`}
        </section>
        <section>
          <h2>筛选与排序</h2>
          <div class="fd-discover-control-filters">
            <label>${icon("search", "fd-small-icon")}<span>关键词</span></label>
            <button class="${ctx.activeFilter === "男频" ? "is-active" : ""}" type="button" data-route="${esc(discoverFilterRoute("男频"))}" data-discover-filter="男频">男频</button>
            <button class="${ctx.activeFilter === "女频" ? "is-active" : ""}" type="button" data-route="${esc(discoverFilterRoute("女频"))}" data-discover-filter="女频">女频</button>
            <button type="button" data-route="discover-sort" data-discover-sort-toggle aria-expanded="${ctx.sortOpen ? "true" : "false"}">排序：${esc(ctx.sort)}${icon("chevron", "fd-small-icon")}</button>
            <button type="button" data-route="discover" data-discover-reset>重置</button>
            <button class="fd-discover-apply-button is-primary" type="button" data-route="discover">${icon("check", "fd-small-icon")}应用</button>
          </div>
        </section>
        <section>
          <h2>源操作</h2>
          <div class="fd-discover-action-grid">
            <button type="button" data-route="discover-switching-source">${icon("refresh", "fd-small-icon")}刷新入口</button>
            <button type="button" data-route="discover-cache-confirm">${icon("trash", "fd-small-icon")}清缓存</button>
            <button type="button" data-route="discover-source-login">${icon("shield", "fd-small-icon")}登录</button>
            <button type="button" data-route="discover-rule-test">${icon("edit", "fd-small-icon")}编辑源</button>
            <button type="button" data-route="discover-source-bulk">${icon("source", "fd-small-icon")}管理发现源</button>
          </div>
        </section>
      </section>`;
  }

  function discoverSortDropdown(ctx) {
    return `
      <section class="fd-discover-sort-popover" data-discover-sort aria-label="排序方式">
        <h2>排序方式</h2>
        ${["人气", "更新", "收藏", "完本", "字数"].map((item) => `<button class="${item === ctx.sort ? "is-active" : ""}" type="button" data-discover-sort-option="${esc(item)}"${item === ctx.sort ? ' aria-current="true"' : ""}>${esc(item)}</button>`).join("")}
      </section>`;
  }

  function discoverBackTop() {
    return `<button class="fd-discover-back-top" type="button" data-route="discover">${icon("top", "fd-small-icon")}回到顶部</button>`;
  }

  function discoverDialogHtml() {
    return `
      <section class="fd-discover-dialog-backdrop" aria-hidden="true"></section>
      <section class="fd-discover-confirm-dialog" role="dialog" aria-modal="true" aria-label="清除发现缓存">
        <h2>清除发现缓存？</h2>
        <p>将清除优书网的发现入口缓存，不影响书架和阅读进度。</p>
        <div>
          <button type="button" data-route="discover-control">取消</button>
          <button type="button" data-route="discover-cache-toast">确认清除</button>
        </div>
      </section>`;
  }

  function discoverMainContent(data, route, appState) {
    const ctx = discoverContext(route, appState);
    const expanded = ["discover-control", "discover-cache-confirm", "discover-switching-source", "discover-entry-error"].includes(route);
    const loading = route === "discover-loading";
    const refreshing = route === "discover-refreshing" || route === "discover-login-return";
    const infinite = route === "discover-infinite-loading";
    const pageTwo = route === "discover-page-two";
    const noResults = route === "discover-no-results";
    const muted = route === "discover-switching-source" || route === "discover-entry-error";
    if (route === "discover-empty") {
      return `
        <section class="fd-discover-empty-state">
          ${icon("source-stack", "fd-empty-icon")}
          <h2>当前没有启用发现的书源</h2>
          <p>启用发现后，可以在这里浏览书源提供的排行榜、分类和书单。</p>
          <div><button type="button" data-route="source-management">去书源管理</button><button type="button" data-route="source-import-options">导入书源</button></div>
        </section>`;
    }
    if (route === "discover-error") {
      return `
        ${discoverSourceBar(Object.assign({}, ctx, { source: { name: "优书网", meta: "排行榜 · 解析失败" } }), false, route)}
        <section class="fd-discover-error-card">
          ${icon("warning", "fd-medium-icon")}
          <h2>发现入口解析失败</h2>
          <p>当前入口返回异常，已保留上一批缓存结果。你可以重试、刷新入口、编辑源或切换书源。</p>
          <div><button type="button" data-route="discover-refreshing">重试</button><button type="button" data-route="discover-control">切换书源</button><button type="button" data-route="discover-rule-test">编辑源</button></div>
        </section>
        ${discoverBookRows(data, "discover", true)}`;
    }
    return `
      ${route === "discover-cache-toast" ? `<section class="fd-discover-toast">已清除优书网发现缓存</section>` : ""}
      ${discoverSourceBar(ctx, expanded, route)}
      ${expanded ? discoverControlPanel(ctx, route === "discover-switching-source" ? "switching" : route === "discover-entry-error" ? "entry-error" : "") : ""}
      ${expanded ? "" : `${discoverEntryChips(ctx)}${discoverFilterBar(ctx, appState)}`}
      ${refreshing ? `<section class="fd-discover-refresh-line"><i></i><span>${route === "discover-login-return" ? "登录成功，正在刷新当前发现入口" : "正在刷新当前列表"}</span></section>` : ""}
      ${noResults ? `
        <section class="fd-discover-no-results">
          ${icon("search", "fd-empty-icon")}
          <h2>当前条件没有发现结果</h2>
          <p>可以重置筛选、切换入口，或刷新当前书源。</p>
          <div><button type="button" data-route="discover" data-discover-reset>重置筛选</button><button type="button" data-route="discover-control">切换入口</button><button type="button" data-route="discover-refreshing">刷新</button></div>
        </section>` : `
        ${discoverResultHeader(ctx)}
        ${loading ? discoverSkeletonList() : discoverBookRows(data, route, muted)}
        ${infinite ? `<section class="fd-discover-bottom-loading"><i></i></section>` : ""}
        ${pageTwo ? discoverBackTop() : ""}`}
      ${route === "discover-cache-confirm" ? discoverDialogHtml() : ""}`;
  }

  function mainTabDiscover(data, appState, route) {
    const currentRoute = route || "discover";
    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone fd-discover-phone"), {
      data,
      title: "发现",
      activeType: "discover",
      actions: ["refresh"],
      ariaLabel: "发现",
      contentClass: "fd-phone-content fd-discover-content",
      contentHtml: discoverMainContent(data, currentRoute, appState),
      stateHostHtml: mainTabFeedbackHtml(appState)
    }));
  }

  function discoverSourceLoginScreen(data) {
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone fd-discover-subpage-phone"), {
      data,
      title: "书源登录",
      ariaLabel: "书源登录",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      contentHtml: `
        <section class="fd-discover-subpage fd-discover-login-page">
          <article class="fd-discover-subpage-head">
            <span>${icon("shield", "fd-medium-icon")}</span>
            <div>
              <h2>轻小说文库</h2>
              <p>该书源的发现入口需要登录态，登录后返回当前入口并刷新列表。</p>
            </div>
          </article>
          <section class="fd-discover-login-card">
            <article><span><strong>登录状态</strong><small>未登录 · 最近检测 10:32</small></span>${sourceBadge({ status: "需登录", tone: "warn" })}</article>
            <article><span><strong>适用范围</strong><small>发现入口、详情页、目录页</small></span>${sourceBadge({ status: "当前源", tone: "good" })}</article>
            <article><span><strong>Cookie 保存</strong><small>仅保存在本机书源配置中</small></span>${sourceSwitch(true, "Cookie 保存")}</article>
          </section>
          <section class="fd-discover-login-actions">
            <button class="is-primary" type="button" data-route="discover-login-return">${icon("globe", "fd-small-icon")}打开网页登录</button>
            <button type="button" data-route="discover-login-return">${icon("check", "fd-small-icon")}保存登录信息</button>
            <button type="button" data-route="discover-control">${icon("refresh", "fd-small-icon")}重新检测</button>
          </section>
          <p class="fd-discover-subpage-note">返回发现页后，当前书源和当前入口保持不变，只刷新内容列表。</p>
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button" data-route="discover-control">${icon("source-stack", "fd-small-icon")}返回控制层</button>
          <button type="button" data-route="discover-login-return">${icon("refresh", "fd-small-icon")}完成刷新</button>
        </div>`
    }));
  }

  function discoverRuleTestScreen(data) {
    const fields = [
      ["exploreUrl", "@js: 首页入口 + 分类入口"],
      ["bookList", ".result-list li"],
      ["name", ".book-title@text"],
      ["author", ".author@text"],
      ["kind", ".tag@text"],
      ["intro", ".intro@text"],
      ["lastChapter", ".last@text"],
      ["coverUrl", "img@src"],
      ["bookUrl", "a@href"]
    ];
    return sourceShell(data, "发现规则测试", `
      <section class="fd-discover-subpage fd-discover-rule-page">
        <article class="fd-discover-subpage-head has-badge">
          <span>${icon("code", "fd-medium-icon")}</span>
          <div>
            <h2>优书网</h2>
            <p>正在编辑：发现规则</p>
          </div>
          ${sourceBadge({ status: "已启用发现", tone: "good" })}
        </article>
        <nav class="fd-source-module-tabs" aria-label="书源规则模块">
          ${["基本", "搜索", "详情", "目录", "正文", "发现", "高级"].map((item) => `<button class="${item === "发现" ? "is-active" : ""}" type="button">${esc(item)}</button>`).join("")}
        </nav>
        <section class="fd-discover-rule-fields" aria-label="发现规则字段">
          ${fields.map(([label, value]) => `
            <label>
              <span>${esc(label)}</span>
              <strong>${esc(value)}</strong>
            </label>`).join("")}
        </section>
        <section class="fd-discover-rule-test-box">
          <h2>测试输入</h2>
          <label><span>入口 URL</span><strong>https://example.com/rank/allvisit_1.html</strong></label>
          <label><span>HTML 片段</span><strong>&lt;li class="book"&gt;长夜余火&lt;/li&gt;</strong></label>
          <button type="button">${icon("play", "fd-small-icon")}测试入口</button>
        </section>
        <section class="fd-discover-rule-result">
          <h2>测试结果</h2>
          <article><strong>生成 5 个入口</strong><small>排行榜、分类、完本、最新、书单</small></article>
          <article><strong>解析到 18 本书</strong><small>首条：长夜余火 · 爱潜水的乌贼</small></article>
        </section>
      </section>`, {
        phoneClass: "fd-discover-subpage-phone",
        trailingHtml: `<button type="button" data-route="discover-control">完成</button>`,
        bottomActionHtml: sourceBottomActions([
          { label: "测试入口", icon: "play" },
          { label: "保存", icon: "check", route: "discover-control" }
        ], "is-fixed")
      });
  }

  function discoverSourceBulkScreen(data) {
    const sources = [
      ["优书网", "默认分组 · 120ms · 已启用发现", "good", true],
      ["起点导入", "正版 · 180ms · 已启用发现", "good", true],
      ["轻小说文库", "需登录 · 发现可用", "warn", true],
      ["本地聚合源", "维护中 · 暂停发现", "muted", false],
      ["失效示例源", "解析失败 · exploreUrl 异常", "warn", false]
    ];
    return sourceShell(data, "发现源管理", `
      <section class="fd-discover-subpage fd-discover-source-bulk-page">
        <article class="fd-discover-subpage-head">
          <span>${icon("source-stack", "fd-medium-icon")}</span>
          <div>
            <h2>发现源管理</h2>
            <p>选择启用发现的书源，批量启用、禁用或刷新入口。</p>
          </div>
        </article>
        <div class="fd-source-batch-top">
          <button type="button" data-route="discover-control">取消</button>
          <strong>已选 3 个</strong>
          <button type="button" data-source-select-all aria-pressed="false">全选</button>
        </div>
        <label class="fd-source-search">${icon("search", "fd-small-icon")}<span>搜索书源名称或分组</span></label>
        <nav class="fd-source-chip-row" aria-label="发现源筛选">
          ${["已启用发现", "有发现未启用", "需登录", "异常"].map((item, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button">${esc(item)}</button>`).join("")}
        </nav>
        <section class="fd-discover-source-bulk-list" aria-label="发现源列表">
          ${sources.map(([name, meta, tone, checked]) => `
            <article class="${checked ? "is-selected" : ""}">
              <button class="fd-source-check${checked ? " is-checked" : ""}" type="button" data-source-select="${esc(name)}" aria-label="${esc(name)}${checked ? "已选择" : "未选择"}" aria-pressed="${checked ? "true" : "false"}">${checked ? icon("check", "fd-small-icon") : ""}</button>
              <span><strong>${esc(name)}</strong><small>${esc(meta)}</small></span>
              ${sourceBadge({ status: tone === "warn" ? "需处理" : tone === "good" ? "可用" : "暂停", tone })}
            </article>`).join("")}
        </section>
      </section>`, {
        phoneClass: "fd-discover-subpage-phone",
        trailingHtml: `<button type="button" data-route="discover-control">完成</button>`,
        bottomActionHtml: sourceBottomActions([
          { label: "启用", icon: "check", action: "enable-discover-sources" },
          { label: "禁用", icon: "clear", action: "disable-discover-sources" },
          { label: "刷新", icon: "refresh", action: "refresh-discover-sources" }
        ], "is-fixed")
      });
  }

  function rssSourcesData() {
    return [
      { name: "GitHub Releases", group: "开源项目", unread: 6, latest: "10:18", status: "正常", tone: "good", enabled: true, categories: 3, articleStyle: "列表", rule: "默认 RSS", login: false, singleUrl: false },
      { name: "阅读器版本讨论", group: "社区", unread: 12, latest: "09:42", status: "有更新", tone: "good", enabled: true, categories: 4, articleStyle: "图文", rule: "自定义列表", login: false, singleUrl: false },
      { name: "书源维护公告", group: "维护", unread: 2, latest: "昨天", status: "需登录", tone: "warn", enabled: true, categories: 2, articleStyle: "紧凑", rule: "正文规则", login: true, singleUrl: false },
      { name: "本地系统通知", group: "系统", unread: 0, latest: "周二", status: "暂停", tone: "muted", enabled: false, categories: 1, articleStyle: "列表", rule: "单 URL", login: false, singleUrl: true }
    ];
  }

  function rssArticlesData() {
    return [
      { title: "Reader UI 前端输入件更新说明", source: "GitHub Releases", time: "10:18", group: "开源项目", desc: "新增发现页状态路由、阅读控制层响应式约束，并补充 RSS 页面结构规划。", unread: true, starred: true },
      { title: "订阅源规则解析失败排查", source: "书源维护公告", time: "09:52", group: "维护", desc: "部分订阅源返回 HTML 而不是 XML，已建议检查 Cookie、登录态和正文提取规则。", unread: true, starred: false },
      { title: "Legado 订阅源配置经验整理", source: "阅读器版本讨论", time: "昨天", group: "社区", desc: "社区整理了单 URL 源、分类入口、文章样式和 WebView 正文处理的常见配置方式。", unread: true, starred: false },
      { title: "本地导入完成解析", source: "本地系统通知", time: "周二", group: "系统", desc: "本地 OPML 导入完成，4 个订阅源已启用，1 个订阅源需要补全图标。", unread: false, starred: false },
      { title: "阅读器路线图讨论摘要", source: "阅读器版本讨论", time: "周一", group: "社区", desc: "围绕 RSS 收藏、源分组、正文阅读和同步备份的交互关系做了讨论。", unread: false, starred: true }
    ];
  }

  function rssRuleSubsData() {
    return [
      { name: "社区 RSS 源订阅", type: "RSS 源", url: "https://example.com/rss-source.json", update: "自动更新" },
      { name: "默认书源订阅", type: "书源", url: "https://example.com/book-source.json", update: "手动" },
      { name: "替换规则同步", type: "替换规则", url: "https://example.com/replace-rule.json", update: "自动更新" }
    ];
  }

  function rssImportEntriesData() {
    return [
      { name: "社区 RSS 源合集", meta: "新增 · 12 个源", checked: true, tone: "good" },
      { name: "GitHub Releases", meta: "已有 · 保留本地名称", checked: false, tone: "muted" },
      { name: "书源维护公告", meta: "更新 · 规则版本更高", checked: true, tone: "warn" }
    ];
  }

  function rssRecordsData() {
    return [
      ["Reader UI 前端输入件更新说明", "今天 10:26 · GitHub Releases"],
      ["订阅源规则解析失败排查", "今天 09:58 · 书源维护公告"],
      ["Legado 订阅源配置经验整理", "昨天 22:10 · 阅读器版本讨论"]
    ];
  }

  function rssCategoryTabs() {
    return [
      { label: "全部", route: "rss-source-feed", title: "GitHub Releases", meta: "默认 RSS 解析 · 18 条" },
      { label: "Releases", route: "rss-source-category-releases", title: "Releases", meta: "版本发布 · 8 条" },
      { label: "Issues", route: "rss-source-category-issues", title: "Issues", meta: "问题讨论 · 6 条" },
      { label: "Discussions", route: "rss-source-category-discussions", title: "Discussions", meta: "社区讨论 · 4 条" }
    ];
  }

  function rssCategoryForRoute(route) {
    return rssCategoryTabs().find((item) => item.route === route) || rssCategoryTabs()[0];
  }

  function rssModeTitle(route) {
    if (route === "rss-all") return "全部条目";
    if (route === "rss-starred") return "收藏";
    if (route === "rss-source-feed" || route.startsWith("rss-source-category-")) return rssCategoryForRoute(route).title;
    return "未读";
  }

  function rssSubpageTitle(route) {
    if (route === "rss-refreshing") return "刷新订阅";
    return rssModeTitle(route);
  }

  function rssFilteredArticles(route) {
    const articles = rssArticlesData();
    if (route === "rss-all") return articles;
    if (route === "rss-starred") return articles.filter((item) => item.starred);
    if (route === "rss-source-feed" || route.startsWith("rss-source-category-")) return articles.filter((item) => item.source === "GitHub Releases");
    return articles.filter((item) => item.unread);
  }

  function rssBadge(label, tone) {
    if (!label) return "";
    return `<em class="fd-rss-badge is-${esc(tone || "muted")}" title="${esc(label)}" aria-label="${esc(label)}"><i aria-hidden="true"></i></em>`;
  }

  function rssModeNav(currentRoute) {
    return `
        <nav class="fd-rss-mode-row" aria-label="RSS 状态入口">
          ${[
            ["源列表", "rss"],
            ["全部", "rss-all"],
            ["收藏", "rss-starred"],
            ["规则订阅", "rss-rule-subscription"]
          ].map(([label, target]) => `<button class="${currentRoute === target ? "is-active" : ""}" type="button" data-route="${esc(target)}">${esc(label)}</button>`).join("")}
        </nav>`;
  }

  function rssSummaryCard(sources, unreadCount) {
    return `
        <article class="fd-rss-summary-card">
          <span>${icon("rss", "fd-medium-icon")}</span>
          <div>
            <strong>订阅中心</strong>
            <small>${esc(sources.filter((item) => item.enabled).length)} 个启用源 · ${esc(unreadCount)} 条未读 · 最近刷新 10:18</small>
          </div>
          <button type="button" data-route="rss-refreshing">${icon("refresh", "fd-small-icon")}刷新</button>
        </article>`;
  }

  function rssTopBar(sources) {
    const enabledCount = (sources || []).filter((item) => item.enabled).length;
    return `
      <section class="rsk-app-top-bar fd-top-bar fd-rss-top-bar" data-slot="appTopBar" aria-label="RSS 顶部栏">
        <h1>RSS</h1>
        <div class="fd-rss-top-actions">
          <button class="fd-rss-refresh-pill" type="button" data-route="rss-refreshing" aria-label="刷新当前订阅">
            <i></i>
            <span class="fd-rss-refresh-text">
              <span class="fd-rss-refresh-enabled">${esc(enabledCount)} 个启用源</span>
              <span class="fd-rss-refresh-update">· 10:18 更新</span>
            </span>
            ${icon("refresh", "fd-small-icon")}
          </button>
          <button class="fd-rss-manage-pill" type="button" data-route="rss-subscription-management" aria-label="进入订阅管理">
            ${icon("list", "fd-small-icon")}
            <span>管理</span>
          </button>
        </div>
      </section>`;
  }

  function rssSearchEntry() {
    return `
        <button class="fd-search-entry fd-rss-search" type="button" data-route="rss-search">
          ${icon("search", "fd-small-icon")}<span>搜索订阅源、文章标题或分组</span>
        </button>`;
  }

  function rssArticleRows(articles) {
    return articles.map((item) => `
              <article class="fd-rss-article-row${item.unread ? " is-unread" : ""}" role="button" tabindex="0" data-route="rss-detail">
                <i></i>
                <span>
                  <strong>${esc(item.title)}</strong>
                  <small>${esc(item.source)} · ${esc(item.time)} · ${esc(item.group)}</small>
                  <p>${esc(item.desc)}</p>
                </span>
                ${item.starred ? icon("bookmark", "fd-small-icon") : icon("chevron", "fd-small-icon")}
              </article>
            `).join("");
  }

  function rssArticleSection(title, articles, actionRoute, actionLabel, actionIcon) {
    return `
        <section class="fd-rss-article-section">
          <header>
            <h2>${esc(title)}</h2>
            <button type="button" data-route="${esc(actionRoute || "rss-subscription-management")}">${icon(actionIcon || "source-stack", "fd-small-icon")}${esc(actionLabel || "管理源")}</button>
          </header>
          <section class="fd-rss-article-list" aria-label="${esc(title)}">
            ${rssArticleRows(articles)}
          </section>
        </section>`;
  }

  function rssSourceRows(sources) {
    return sources.map((source, index) => `
          <article class="${source.enabled ? "" : "is-disabled"}" data-route="rss-source-feed" role="button" tabindex="0">
            <span>${icon(source.enabled ? "rss" : "offline", "fd-small-icon")}</span>
            <div>
              <strong>${esc(source.name)}</strong>
              <small>${esc(source.group)} · ${esc(source.categories)} 个入口 · ${esc(source.articleStyle)} · ${esc(source.rule)}</small>
            </div>
            <b>${source.unread ? esc(source.unread) : "0"}</b>
            ${rssBadge(source.status, source.tone)}
          </article>
        `).join("");
  }

  function rssSourceOverview(sources, appState) {
    const filters = ["全部", "开源项目", "社区", "需登录", "暂停"];
    const activeFilter = appState?.rssGroupFilter || "全部";
    return `
        <section class="fd-rss-source-overview">
          <header>
            <h2>订阅源</h2>
            <span>
              <button type="button" data-route="rss-source-import">${icon("upload", "fd-small-icon")}导入</button>
              <button type="button" data-route="rss-source-edit">${icon("add", "fd-small-icon")}新建</button>
            </span>
          </header>
          ${filterDisclosure({
            className: "fd-rss-filter-control",
            label: "筛选",
            ariaLabel: "RSS 订阅源筛选",
            summary: activeFilter,
            toggleAttr: "data-rss-group-filter-toggle",
            open: Boolean(appState?.rssGroupFilterOpen),
            groups: [{
              title: "分组与状态",
              options: filters.map((item) => ({
                label: item,
                active: activeFilter === item,
                attrs: { "data-rss-group-filter": item }
              }))
            }]
          })}
          <section class="fd-rss-source-overview-list" aria-label="订阅源列表">
            ${rssSourceRows(sources)}
          </section>
        </section>`;
  }

  function rssSourceStrip(sources, currentRoute) {
    return `
        <section class="fd-rss-source-strip" aria-label="订阅源快捷入口">
          ${sources.map((source, index) => `
            <button class="${(currentRoute === "rss" || currentRoute === "rss-source-feed") && index === 0 ? "is-active" : ""}" type="button" data-route="rss-source-feed">
              <span>${icon(source.enabled ? "rss" : "offline", "fd-small-icon")}</span>
              <strong>${esc(source.name)}</strong>
              <small>${esc(source.group)} · ${source.unread ? `${esc(source.unread)} 未读` : "无未读"}</small>
            </button>
          `).join("")}
        </section>`;
  }

  function rssHomeContent(sources, unreadCount, refreshing, appState) {
    return `
        ${rssSearchEntry()}
        ${rssModeNav("rss")}
        ${refreshing ? `<section class="fd-rss-refresh-line"><i></i><span>正在刷新启用订阅源和分类入口</span></section>` : ""}
        ${rssSourceOverview(sources, appState)}
        ${rssArticleSection("最近未读", rssFilteredArticles("rss").slice(0, 3), "rss-all", "查看全部", "list")}`;
  }

  function rssArticleHubContent(currentRoute, sources, unreadCount, refreshing) {
    const articles = rssFilteredArticles(currentRoute);
    return `
        ${rssSearchEntry()}
        ${rssModeNav(currentRoute)}
        ${rssSourceStrip(sources, currentRoute)}
        ${refreshing ? `<section class="fd-rss-refresh-line"><i></i><span>正在刷新启用订阅源</span></section>` : ""}
        ${rssArticleSection(rssModeTitle(currentRoute), articles, "rss-subscription-management", "管理源", "source-stack")}`;
  }

  function rssSourceFeedContent(sources, currentRoute, appState) {
    const source = sources[0];
    const category = rssCategoryForRoute(currentRoute || "rss-source-feed");
    const articles = rssFilteredArticles(currentRoute || "rss-source-feed");
    return `
        <article class="fd-rss-source-hero">
          <span>${icon("rss", "fd-medium-icon")}</span>
          <div>
            <strong>${esc(source.name)}</strong>
            <small>${esc(source.group)} · ${esc(category.meta)} · ${esc(source.rule)} · ${esc(source.latest)}</small>
          </div>
          ${rssBadge(source.status, source.tone)}
        </article>
        <section class="fd-rss-source-toolbar">
          <button type="button" data-route="rss-refreshing">${icon("refresh", "fd-small-icon")}刷新</button>
          <button type="button" data-route="rss-source-edit">${icon("edit", "fd-small-icon")}编辑源</button>
          <button type="button" data-route="rss-read-record">${icon("clock", "fd-small-icon")}记录</button>
          <button type="button" data-route="rss-source-debug">${icon("bug", "fd-small-icon")}调试</button>
        </section>
        ${filterDisclosure({
          className: "fd-rss-filter-control fd-rss-category-filter-control",
          label: "分类",
          ariaLabel: "RSS 分类入口",
          summary: category.label,
          toggleAttr: "data-rss-category-filter-toggle",
          open: Boolean(appState?.rssCategoryFilterOpen),
          groups: [{
            title: "分类入口",
            options: rssCategoryTabs().map((item) => ({
              label: item.label,
              active: item.route === category.route,
              route: item.route,
              attrs: { "data-rss-category-filter": item.label }
            }))
          }]
        })}
        ${rssArticleSection(category.title, articles, "rss-source-actions", "源操作", "more")}
        <section class="fd-rss-bottom-loading"><i></i><span>继续下滑加载下一页</span></section>`;
  }

  function mainTabRss(data, appState, route) {
    const currentRoute = route || "rss";
    const sources = rssSourcesData();
    const unreadCount = rssArticlesData().filter((item) => item.unread).length;
    const refreshing = currentRoute === "rss-refreshing";
    const contentHtml = currentRoute === "rss" || currentRoute === "rss-refreshing"
      ? rssHomeContent(sources, unreadCount, refreshing, appState)
      : currentRoute === "rss-source-feed" || currentRoute.startsWith("rss-source-category-")
        ? rssSourceFeedContent(sources, currentRoute, appState)
        : rssArticleHubContent(currentRoute, sources, unreadCount, refreshing);

    if (currentRoute !== "rss") {
      return rssLibraryScreen(data, rssSubpageTitle(currentRoute), contentHtml, "", appState);
    }

    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone fd-rss-phone"), {
      data,
      title: "RSS",
      activeType: "rss",
      actions: [],
      topBarHtml: rssTopBar(sources),
      ariaLabel: "RSS",
      contentHtml,
      stateHostHtml: mainTabFeedbackHtml(appState)
    }));
  }

  function rssShellScreen(data, title, contentHtml, appState) {
    return rssLibraryScreen(data, title, contentHtml, "", appState);
  }

  function rssLibraryScreen(data, title, contentHtml, bottomActionHtml, appState, trailingHtml) {
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone fd-rss-reader-phone"), {
      data,
      title,
      ariaLabel: title,
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      trailingHtml,
      contentHtml,
      bottomActionHtml,
      stateHostHtml: mainTabFeedbackHtml(appState)
    }));
  }

  function rssDetailScreen(data, appState) {
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone fd-rss-reader-phone"), {
      data,
      title: "RSS 阅读",
      ariaLabel: "RSS 阅读",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      trailingHtml: `
        <span class="fd-rss-reader-top-actions">
          <button type="button" data-route="rss-starred" aria-label="收藏">${icon("bookmark", "fd-small-icon")}</button>
          <button type="button" data-route="rss-original" aria-label="打开原文">${icon("link", "fd-small-icon")}</button>
        </span>`,
      contentHtml: `
        <article class="fd-rss-reader-page">
          <header class="fd-rss-reader-source">
            <span>${icon("rss", "fd-small-icon")}</span>
            <div>
              <strong>GitHub Releases</strong>
              <small>今天 10:18 · 开源项目 · 已解析正文</small>
            </div>
            <button type="button" data-route="rss-source-feed">查看源</button>
          </header>
          <section class="fd-rss-reader-title">
            <h1>Reader UI 前端输入件更新说明</h1>
            <p>本条目汇总最近的阅读体验修复、发现页状态补充和 RSS 页面结构调整。</p>
          </section>
          <nav class="fd-rss-reader-inline-actions" aria-label="RSS 阅读操作">
            <button type="button" data-route="rss">${icon("check", "fd-small-icon")}已读</button>
            <button type="button" data-route="rss-starred">${icon("bookmark", "fd-small-icon")}收藏</button>
            <button type="button" data-route="rss-subscription-management">${icon("source-stack", "fd-small-icon")}源设置</button>
          </nav>
          <section class="fd-rss-reader-body">
            <p>RSS 页面现在以订阅源为一级对象，同时保留常规阅读器里的未读、全部、收藏和刷新工作流。主页负责快速浏览条目，阅读页则专注正文、原文和源相关操作。</p>
            <p>如果订阅源提供正文规则，文章应直接进入当前阅读页；如果源只提供链接，则在阅读页保留原文入口，并用 WebView 或外部浏览器作为兜底。</p>
            <p>后续实现里，已读状态应在进入阅读页时自动写入，收藏和源设置需要回到订阅源维度同步，不应该散落在主 Tab 的临时按钮里。</p>
          </section>
          <footer class="fd-rss-original-card">
            <span>${icon("link", "fd-small-icon")}</span>
            <div>
              <strong>原文链接</strong>
              <small>github.com/minliny/Reader-UI/releases/latest</small>
            </div>
            <button type="button" data-route="rss-original">打开</button>
          </footer>
        </article>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
          <button type="button" data-route="rss">返回列表</button>
          <button type="button" data-route="rss-original">打开原文</button>
        </div>`,
      stateHostHtml: mainTabFeedbackHtml(appState)
    }));
  }

  function rssOriginalScreen(data, appState) {
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone fd-rss-reader-phone"), {
      data,
      title: "原文页面",
      ariaLabel: "RSS 原文页面",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      trailingHtml: `<button type="button" data-route="rss-detail">阅读正文</button>`,
      contentHtml: `
        <section class="fd-rss-original-preview">
          <header>
            <span>${icon("link", "fd-small-icon")}</span>
            <div>
              <strong>github.com/minliny/Reader-UI/releases/latest</strong>
              <small>来自 GitHub Releases · 已保留 RSS 阅读上下文</small>
            </div>
          </header>
          <article class="fd-rss-web-preview">
            <h2>Reader UI 前端输入件更新说明</h2>
            <p>这里展示原文网页入口的预览状态。实际 APP 中应打开内置 WebView，并保留返回 RSS 阅读页、复制链接、分享和用浏览器打开。</p>
            <div><i></i><i></i><i></i></div>
          </article>
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
          <button type="button" data-route="rss-detail">返回正文</button>
          <button type="button" data-route="rss-original-browser">浏览器打开</button>
        </div>`,
      stateHostHtml: mainTabFeedbackHtml(appState)
    }));
  }

  function rssSourceActionsScreen(data, appState) {
    const source = rssSourcesData()[0];
    return rssLibraryScreen(data, "源操作", `
      <section class="fd-rss-action-source-card">
        <span>${icon("rss", "fd-medium-icon")}</span>
        <div>
          <strong>${esc(source.name)}</strong>
          <small>${esc(source.group)} · ${esc(source.categories)} 个入口 · ${esc(source.rule)}</small>
        </div>
        ${rssBadge(source.status, source.tone)}
      </section>
      <section class="fd-rss-action-grid">
        ${[
          ["刷新入口", "refresh", "rss-refreshing"],
          ["编辑源", "edit", "rss-source-edit"],
          ["规则调试", "bug", "rss-source-debug"],
          ["阅读记录", "clock", "rss-read-record"],
          ["源变量", "code", "rss-source-vars"],
          ["登录", "shield", "rss-source-login"],
          ["置顶", "top", "rss-source-pin"],
          ["禁用", "offline", "rss-source-disable"]
        ].map(([label, itemIcon, target]) => `<button type="button" data-route="${esc(target)}">${icon(itemIcon, "fd-small-icon")}<span>${esc(label)}</span></button>`).join("")}
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-source-feed">返回源</button>
        <button type="button" data-route="rss-subscription-management">管理全部</button>
      </div>`, appState);
  }

  function rssSourceEditScreen(data, appState) {
    const fields = [
      ["基础", "源名称", "GitHub Releases"],
      ["基础", "源地址", "https://github.com/minliny/Reader-UI/releases.atom"],
      ["基础", "分组", "开源项目"],
      ["基础", "分类 URL", "Releases::/releases.atom && Issues::/issues.atom"],
      ["请求", "请求头", "User-Agent: Reader UI"],
      ["请求", "并发率", "2/1000"],
      ["列表", "文章列表", "默认 RSS 解析"],
      ["列表", "下一页", "PAGE"],
      ["列表", "标题 / 时间 / 链接", "title / pubDate / link"],
      ["WebView", "正文规则", "content:encoded || article"],
      ["WebView", "注入 JS / CSS", "图片宽度、夜间样式、跳转拦截"],
      ["WebView", "白名单 / 黑名单", "过滤广告资源"]
    ];
    return rssLibraryScreen(data, "RSS 源编辑", `
      <section class="fd-rss-edit-tabs" aria-label="源编辑分组">
        ${["基础", "请求", "列表", "WebView"].map((item, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button">${esc(item)}</button>`).join("")}
      </section>
      <section class="fd-rss-edit-list" aria-label="RSS 源编辑字段">
        ${fields.map(([group, label, value]) => `
          <article>
            <small>${esc(group)}</small>
            <strong>${esc(label)}</strong>
            <p>${esc(value)}</p>
          </article>`).join("")}
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-source-debug">调试规则</button>
        <button type="button" data-route="rss-subscription-management">保存</button>
      </div>`, appState, `<button type="button" data-route="rss-source-debug">调试</button>`);
  }

  function rssSourceDebugScreen(data, appState) {
    return rssLibraryScreen(data, "规则调试", `
      <section class="fd-rss-debug-panel">
        <header>
          <span>${icon("bug", "fd-small-icon")}</span>
          <div><strong>GitHub Releases</strong><small>列表解析 · 正文解析 · WebView 拦截</small></div>
        </header>
        <article><strong>1. 获取分类入口</strong><p>Releases / Issues / Discussions 已解析，缓存命中 3 项。</p></article>
        <article><strong>2. 获取文章列表</strong><p>默认 RSS 解析命中 18 条，下一页规则 PAGE 可用。</p></article>
        <article><strong>3. 正文规则测试</strong><p>content:encoded 命中正文，图片资源通过白名单。</p></article>
        <article class="is-warn"><strong>4. 跳转拦截</strong><p>外链将保留在原文 WebView，legado/yuedu 协议进入导入流程。</p></article>
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-source-edit">编辑规则</button>
        <button type="button" data-route="rss-source-actions">完成</button>
      </div>`, appState);
  }

  function rssConfirmScreen(data, config, appState) {
    return rssLibraryScreen(data, config.title, `
      <section class="fd-rss-confirm-card">
        <span>${icon(config.icon || "warning", "fd-medium-icon")}</span>
        <h2>${esc(config.heading)}</h2>
        <p>${esc(config.copy)}</p>
        ${config.detail ? `<small>${esc(config.detail)}</small>` : ""}
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="${esc(config.cancelRoute || "rss-source-actions")}">${esc(config.cancelLabel || "取消")}</button>
        <button type="button" data-route="${esc(config.confirmRoute || "rss-subscription-management")}">${esc(config.confirmLabel || "确认")}</button>
      </div>`, appState);
  }

  function rssSourceVarsScreen(data, appState) {
    const variables = [
      ["请求变量", "{{page}}", "当前分页，从 1 开始递增，用于列表和下一页规则。"],
      ["请求变量", "{{sourceUrl}}", "当前订阅源地址，调试和跳转拦截时可引用。"],
      ["登录变量", "{{cookie}}", "网页登录后写入，刷新订阅源和打开原文时共用。"],
      ["登录变量", "{{token}}", "从登录页脚本提取，过期后进入登录子页面刷新。"],
      ["设备变量", "{{userAgent}}", "Reader UI WebView UA，必要时覆盖为移动端 UA。"]
    ];
    return rssLibraryScreen(data, "源变量", `
      <section class="fd-rss-debug-panel">
        <header>
          <span>${icon("code", "fd-small-icon")}</span>
          <div><strong>GitHub Releases</strong><small>变量作用于请求头、分类 URL、正文规则和 WebView 注入脚本</small></div>
        </header>
      </section>
      <section class="fd-rss-edit-list" aria-label="RSS 源变量">
        ${variables.map(([group, name, desc]) => `
          <article>
            <small>${esc(group)}</small>
            <strong>${esc(name)}</strong>
            <p>${esc(desc)}</p>
          </article>`).join("")}
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-source-debug">测试变量</button>
        <button type="button" data-route="rss-source-actions">完成</button>
      </div>`, appState, `<button type="button" data-route="rss-source-edit">编辑</button>`);
  }

  function rssSourceLoginScreen(data, appState) {
    return rssLibraryScreen(data, "源登录", `
      <section class="fd-rss-debug-panel">
        <header>
          <span>${icon("shield", "fd-small-icon")}</span>
          <div><strong>书源维护公告</strong><small>网页登录 · Cookie 保存 · 登录态检测</small></div>
        </header>
        <article><strong>登录地址</strong><p>https://example.com/login?from=rss</p></article>
        <article><strong>Cookie 状态</strong><p>reader_session=•••••• · 2 天后过期 · 已关联当前订阅源</p></article>
        <article><strong>检测方式</strong><p>刷新前请求个人中心，401/403 时提示重新登录。</p></article>
      </section>
      <section class="fd-rss-action-grid fd-rss-action-grid-compact">
        ${[
          ["网页登录", "globe", "rss-source-login-web"],
          ["提取 Cookie", "copy", "rss-source-login-cookie"],
          ["测试登录态", "refresh", "rss-source-debug"],
          ["清除登录", "trash", "rss-source-login-clear"]
        ].map(([label, itemIcon, target]) => `<button type="button" data-route="${esc(target)}">${icon(itemIcon, "fd-small-icon")}<span>${esc(label)}</span></button>`).join("")}
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-source-actions">返回操作</button>
        <button type="button" data-route="rss-source-actions">完成</button>
      </div>`, appState);
  }

  function rssSourceLoginWebScreen(data, appState) {
    return rssLibraryScreen(data, "网页登录", `
      <section class="fd-rss-original-preview">
        <header>
          <span>${icon("shield", "fd-small-icon")}</span>
          <div>
            <strong>example.com/login</strong>
            <small>来自书源维护公告 · 登录完成后回写 Cookie</small>
          </div>
        </header>
        <article class="fd-rss-web-preview">
          <h2>登录页面预览</h2>
          <p>实际应用中这里打开内置 WebView。登录成功后提取 Cookie、Token 和登录检测结果，返回源登录页。</p>
          <div><i></i><i></i><i></i></div>
        </article>
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-source-login">返回登录</button>
        <button type="button" data-route="rss-source-login-cookie">登录完成</button>
      </div>`, appState);
  }

  function rssSourceLoginCookieScreen(data, appState) {
    return rssLibraryScreen(data, "Cookie 提取", `
      <section class="fd-rss-debug-panel">
        <header>
          <span>${icon("copy", "fd-small-icon")}</span>
          <div><strong>已提取登录凭据</strong><small>只作用于当前 RSS 源，不覆盖其他订阅源</small></div>
        </header>
        <article><strong>Cookie</strong><p>reader_session=••••••; expires=2026-06-28; path=/</p></article>
        <article><strong>Token</strong><p>从 localStorage.reader_token 提取，刷新源时自动附加。</p></article>
        <article><strong>检测结果</strong><p>个人中心返回 200，下一次刷新不会进入登录错误状态。</p></article>
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-source-login">返回</button>
        <button type="button" data-route="rss-source-actions">保存凭据</button>
      </div>`, appState);
  }

  function rssSourceGroupEditScreen(data, appState) {
    const fields = [
      ["分组名称", "开源项目"],
      ["默认展开", "开启"],
      ["排序规则", "未读优先，其次最近更新"],
      ["适用订阅源", "GitHub Releases、社区 RSS 源合集"]
    ];
    return rssLibraryScreen(data, "编辑 RSS 分组", `
      <section class="fd-rss-edit-list" aria-label="RSS 分组编辑字段">
        ${fields.map(([label, value]) => `
          <article>
            <small>分组配置</small>
            <strong>${esc(label)}</strong>
            <p>${esc(value)}</p>
          </article>`).join("")}
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-source-groups">取消</button>
        <button type="button" data-route="rss-source-groups">保存</button>
      </div>`, appState);
  }

  function rssSourceGroupsScreen(data, appState) {
    const groups = [
      ["开源项目", "2 个订阅源 · 默认展开", true],
      ["社区", "1 个订阅源 · 有 12 条未读", true],
      ["维护", "1 个订阅源 · 需要登录", true],
      ["系统", "1 个订阅源 · 已暂停", false]
    ];
    return rssLibraryScreen(data, "RSS 分组", `
      <section class="fd-rss-record-list fd-rss-management-list" aria-label="RSS 分组列表">
        ${groups.map(([name, meta, enabled]) => `
          <article>
            <span>${icon("folder", "fd-small-icon")}</span>
            <strong>${esc(name)}<small>${esc(meta)}</small></strong>
            ${enabled ? settingsSwitch(true) : settingsSwitch(false)}
          </article>`).join("")}
      </section>
      <section class="fd-rss-rule-sub-actions">
        <button type="button" data-route="rss-source-group-edit">${icon("add", "fd-small-icon")}新增分组</button>
        <button type="button" data-route="rss-source-group-edit">${icon("edit", "fd-small-icon")}重命名</button>
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-subscription-management">取消</button>
        <button type="button" data-route="rss-subscription-management">保存</button>
      </div>`, appState);
  }

  function rssSourceBatchScreen(data, appState) {
    const sources = rssSourcesData();
    return rssLibraryScreen(data, "批量管理", `
      <section class="fd-rss-manage-batch-row fd-rss-batch-summary">
        <strong>已选 2 个订阅源</strong>
        <button type="button">反选</button>
        <button type="button">全选</button>
      </section>
      <section class="fd-rss-source-list fd-rss-batch-list" aria-label="批量选择订阅源">
        ${sources.map((source, index) => `
          <article class="${source.enabled ? "" : "is-disabled"}" role="button" tabindex="0">
            <span>${icon(index < 2 ? "check" : "rss", "fd-small-icon")}</span>
            <strong>${esc(source.name)}<small>${esc(source.group)} · ${esc(source.status)} · ${source.unread ? `${esc(source.unread)} 条未读` : "无未读"}</small></strong>
            ${rssBadge(source.enabled ? "启用" : "暂停", source.enabled ? "good" : "muted")}
          </article>
        `).join("")}
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-source-export">导出</button>
        <button type="button" data-route="rss-source-batch-disable">禁用</button>
      </div>`, appState, `<button type="button" data-route="rss-subscription-management">完成</button>`);
  }

  function rssSourceExportScreen(data, appState) {
    return rssLibraryScreen(data, "导出订阅源", `
      <section class="fd-rss-import-panel">
        <label>${icon("download", "fd-small-icon")}<span>reader-rss-sources-20260626.json</span></label>
        <nav aria-label="导出范围">
          ${["已选源", "启用源", "包含登录配置", "包含分组"].map((item, index) => `<button class="${index !== 2 ? "is-active" : ""}" type="button">${esc(item)}</button>`).join("")}
        </nav>
      </section>
      <section class="fd-rss-import-list" aria-label="导出预览">
        ${["GitHub Releases", "阅读器版本讨论"].map((name) => `
          <article class="is-selected">
            <span>${icon("check", "fd-small-icon")}</span>
            <strong>${esc(name)}<small>JSON · 保留分组、启用状态和解析规则</small></strong>
            <button type="button" data-route="rss-source-export-detail">预览</button>
          </article>`).join("")}
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-source-batch">返回</button>
        <button type="button" data-route="rss-source-export-result">导出</button>
      </div>`, appState);
  }

  function rssSourceExportDetailScreen(data, appState) {
    return rssLibraryScreen(data, "导出预览", `
      <section class="fd-rss-debug-panel">
        <header>
          <span>${icon("download", "fd-small-icon")}</span>
          <div><strong>GitHub Releases</strong><small>导出项预览 · 不包含 Cookie</small></div>
        </header>
        <article><strong>基础字段</strong><p>名称、源地址、分组、启用状态、分类入口。</p></article>
        <article><strong>解析规则</strong><p>列表、下一页、正文、WebView 注入脚本和资源过滤规则。</p></article>
        <article><strong>安全字段</strong><p>登录 Cookie、Token 和本地账号信息不参与导出。</p></article>
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-source-export">返回</button>
        <button type="button" data-route="rss-source-export-result">导出此源</button>
      </div>`, appState);
  }

  function rssSourceImportScreen(data, appState) {
    const imports = rssImportEntriesData();
    return rssLibraryScreen(data, "导入订阅源", `
      <section class="fd-rss-import-panel">
        <label>${icon("link", "fd-small-icon")}<span>https://example.com/rss-source.json</span></label>
        <nav aria-label="导入选项">
          ${["保留名称", "保留分组", "保留启用状态", "加入分组"].map((item, index) => `<button class="${index < 3 ? "is-active" : ""}" type="button">${esc(item)}</button>`).join("")}
        </nav>
      </section>
      <section class="fd-rss-import-list" aria-label="导入预览">
        ${imports.map((item) => `
          <article class="${item.checked ? "is-selected" : ""}" role="button" tabindex="0" data-route="rss-source-import-detail">
            <span>${item.checked ? icon("check", "fd-small-icon") : icon("rss", "fd-small-icon")}</span>
            <strong>${esc(item.name)}<small>${esc(item.meta)}</small></strong>
            <button type="button" data-route="rss-source-import-detail">${item.checked ? "详情" : "查看"}</button>
          </article>`).join("")}
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-subscription-management">取消</button>
        <button type="button" data-route="rss-source-import-result">导入 2 个</button>
      </div>`, appState);
  }

  function rssSourceImportDetailScreen(data, appState) {
    return rssLibraryScreen(data, "导入详情", `
      <section class="fd-rss-debug-panel">
        <header>
          <span>${icon("upload", "fd-small-icon")}</span>
          <div><strong>书源维护公告</strong><small>更新 · 规则版本更高 · 需登录</small></div>
        </header>
        <article><strong>变更摘要</strong><p>正文规则从 content:encoded 改为 article.content，新增登录检测 URL。</p></article>
        <article><strong>冲突处理</strong><p>保留本地名称和分组，覆盖规则、请求头和分类入口。</p></article>
        <article class="is-warn"><strong>登录态</strong><p>不导入 Cookie。更新后需要在源登录页重新授权。</p></article>
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-source-import">返回</button>
        <button type="button" data-route="rss-source-import">加入导入</button>
      </div>`, appState);
  }

  function rssFavoriteGroupEditScreen(data, appState) {
    return rssLibraryScreen(data, "编辑收藏分组", `
      <section class="fd-rss-edit-list" aria-label="收藏分组编辑字段">
        ${[
          ["分组名称", "默认分组"],
          ["首页显示", "开启"],
          ["排序方式", "最近收藏优先"],
          ["包含条目", "Reader UI 前端输入件更新说明、阅读器路线图讨论摘要"]
        ].map(([label, value]) => `
          <article>
            <small>收藏分组</small>
            <strong>${esc(label)}</strong>
            <p>${esc(value)}</p>
          </article>`).join("")}
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-favorite-groups">取消</button>
        <button type="button" data-route="rss-favorite-groups">保存</button>
      </div>`, appState);
  }

  function rssFavoritesScreen(data, appState) {
    const favorites = rssArticlesData().filter((item) => item.starred);
    const groups = ["默认分组", "开源项目", "社区"];
    const activeGroup = appState?.rssFavoriteFilter || "默认分组";
    return rssShellScreen(data, "RSS 收藏", `
      ${rssModeNav("rss-starred")}
      ${filterDisclosure({
        className: "fd-rss-filter-control fd-rss-favorite-filter-control",
        label: "分组",
        ariaLabel: "RSS 收藏分组",
        summary: activeGroup,
        toggleAttr: "data-rss-favorite-filter-toggle",
        open: Boolean(appState?.rssFavoriteFilterOpen),
        groups: [{
          title: "收藏分组",
          options: groups.map((item) => ({
            label: item,
            active: activeGroup === item,
            attrs: { "data-rss-favorite-filter": item }
          }))
        }]
      })}
      ${rssArticleSection(activeGroup, favorites, "rss-favorite-groups", "管理分组", "edit")}
      <section class="fd-rss-favorite-actions">
        <button type="button" data-route="rss-favorite-groups">${icon("edit", "fd-small-icon")}编辑分组</button>
        <button type="button" data-route="rss-favorite-clear">${icon("trash", "fd-small-icon")}清空当前分组</button>
      </section>`, appState);
  }

  function rssFavoriteGroupsScreen(data, appState) {
    const groups = [
      ["默认分组", "2 条收藏 · 首页显示", true],
      ["开源项目", "1 条收藏 · 自动归类", true],
      ["社区", "1 条收藏 · 手动归类", false]
    ];
    return rssLibraryScreen(data, "收藏分组", `
      <section class="fd-rss-record-list fd-rss-management-list" aria-label="收藏分组列表">
        ${groups.map(([name, meta, pinned]) => `
          <article>
            <span>${icon("bookmark", "fd-small-icon")}</span>
            <strong>${esc(name)}<small>${esc(meta)}</small></strong>
            ${pinned ? rssBadge("显示", "good") : rssBadge("隐藏", "muted")}
          </article>`).join("")}
      </section>
      <section class="fd-rss-rule-sub-actions">
        <button type="button" data-route="rss-favorite-group-edit">${icon("add", "fd-small-icon")}新增分组</button>
        <button type="button" data-route="rss-favorite-group-edit">${icon("edit", "fd-small-icon")}排序</button>
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-starred">取消</button>
        <button type="button" data-route="rss-starred">保存</button>
      </div>`, appState);
  }

  function rssReadRecordScreen(data, appState) {
    const records = rssRecordsData();
    return rssLibraryScreen(data, "阅读记录", `
      <section class="fd-rss-record-list">
        ${records.map(([title, meta]) => `
          <article role="button" tabindex="0" data-route="rss-detail">
            <span>${icon("clock", "fd-small-icon")}</span>
            <strong>${esc(title)}<small>${esc(meta)}</small></strong>
            ${icon("chevron", "fd-small-icon")}
          </article>`).join("")}
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss">返回列表</button>
        <button type="button" data-route="rss-record-clear">清空记录</button>
      </div>`, appState);
  }

  function rssRuleSubscriptionScreen(data, appState) {
    return rssShellScreen(data, "规则订阅", `
      ${rssModeNav("rss-rule-subscription")}
      <section class="fd-rss-rule-sub-list" aria-label="规则订阅列表">
        ${rssRuleSubsData().map((item) => `
          <article role="button" tabindex="0" data-route="rss-rule-subscription-detail">
            <span>${icon(item.type === "RSS 源" ? "rss" : item.type === "书源" ? "source-stack" : "replace", "fd-small-icon")}</span>
            <strong>${esc(item.name)}<small>${esc(item.type)} · ${esc(item.url)}</small></strong>
            <em>${esc(item.update)}</em>
          </article>`).join("")}
      </section>
      <section class="fd-rss-rule-sub-actions">
        <button type="button" data-route="rss-rule-subscription-detail">${icon("upload", "fd-small-icon")}打开订阅</button>
        <button type="button" data-route="rss-rule-subscription-edit">${icon("add", "fd-small-icon")}新增</button>
      </section>`, appState);
  }

  function rssRuleSubscriptionDetailScreen(data, appState) {
    return rssLibraryScreen(data, "订阅详情", `
      <section class="fd-rss-debug-panel">
        <header>
          <span>${icon("sync", "fd-small-icon")}</span>
          <div><strong>社区 RSS 源订阅</strong><small>RSS 源 · 自动更新 · 上次同步 10:18</small></div>
        </header>
        <article><strong>订阅地址</strong><p>https://example.com/rss-source.json</p></article>
        <article><strong>更新策略</strong><p>Wi-Fi 下自动更新；保留本地启用状态、分组和登录态。</p></article>
        <article><strong>最近变更</strong><p>新增 2 个源，更新 1 个正文规则，跳过 1 个本地冲突。</p></article>
      </section>
      <section class="fd-rss-import-list" aria-label="订阅变更">
        ${rssImportEntriesData().map((item) => `
          <article class="${item.checked ? "is-selected" : ""}">
            <span>${icon(item.checked ? "check" : "rss", "fd-small-icon")}</span>
            <strong>${esc(item.name)}<small>${esc(item.meta)}</small></strong>
            ${rssBadge(item.tone === "warn" ? "更新" : item.tone === "good" ? "新增" : "跳过", item.tone)}
          </article>`).join("")}
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-rule-subscription-edit">编辑</button>
        <button type="button" data-route="rss-rule-subscription-apply">应用更新</button>
      </div>`, appState);
  }

  function rssRuleSubscriptionEditScreen(data, appState) {
    const fields = [
      ["基础", "订阅名称", "社区 RSS 源订阅"],
      ["基础", "订阅类型", "RSS 源"],
      ["基础", "订阅地址", "https://example.com/rss-source.json"],
      ["同步", "自动更新", "Wi-Fi 下自动"],
      ["同步", "冲突策略", "保留本地名称、分组、启用状态"],
      ["安全", "登录配置", "不覆盖 Cookie 和账号信息"]
    ];
    return rssLibraryScreen(data, "编辑规则订阅", `
      <section class="fd-rss-edit-list" aria-label="规则订阅编辑字段">
        ${fields.map(([group, label, value]) => `
          <article>
            <small>${esc(group)}</small>
            <strong>${esc(label)}</strong>
            <p>${esc(value)}</p>
          </article>`).join("")}
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-rule-subscription-test">测试订阅</button>
        <button type="button" data-route="rss-rule-subscription">保存</button>
      </div>`, appState);
  }

  function rssRuleSubscriptionTestScreen(data, appState) {
    return rssLibraryScreen(data, "测试规则订阅", `
      <section class="fd-rss-debug-panel">
        <header>
          <span>${icon("bug", "fd-small-icon")}</span>
          <div><strong>社区 RSS 源订阅</strong><small>请求订阅地址 · 校验结构 · 生成导入预览</small></div>
        </header>
        <article><strong>1. 请求订阅地址</strong><p>https://example.com/rss-source.json 返回 200，内容类型 application/json。</p></article>
        <article><strong>2. 解析订阅内容</strong><p>12 个 RSS 源、2 个更新项、1 个本地冲突。</p></article>
        <article><strong>3. 冲突策略</strong><p>保留本地名称、分组、启用状态，不覆盖登录凭据。</p></article>
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-rule-subscription-edit">返回编辑</button>
        <button type="button" data-route="rss-rule-subscription-detail">查看结果</button>
      </div>`, appState);
  }

  function rssSearchScreen(data, appState) {
    const articles = rssArticlesData();
    return rssShellScreen(data, "RSS 搜索", `
      <section class="fd-rss-search-panel">
        <label>${icon("search", "fd-small-icon")}<span>搜索订阅源、文章标题或分组</span></label>
        <nav aria-label="RSS 搜索范围">
          ${["全部", "订阅源", "文章", "分组"].map((item, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button">${esc(item)}</button>`).join("")}
        </nav>
      </section>
      <section class="fd-rss-article-section">
        <header>
          <h2>搜索结果</h2>
          <button type="button" data-route="rss-subscription-management">${icon("source-stack", "fd-small-icon")}管理源</button>
        </header>
        <section class="fd-rss-article-list" aria-label="RSS 搜索结果">
          ${articles.slice(0, 3).map((item) => `
            <article class="fd-rss-article-row${item.unread ? " is-unread" : ""}" role="button" tabindex="0" data-route="rss-detail">
              <i></i>
              <span>
                <strong>${esc(item.title)}</strong>
                <small>${esc(item.source)} · ${esc(item.time)} · ${esc(item.group)}</small>
                <p>${esc(item.desc)}</p>
              </span>
              ${icon("chevron", "fd-small-icon")}
            </article>
          `).join("")}
        </section>
      </section>`, appState);
  }

  function rssSubscriptionManagementScreen(data, appState) {
    const subscriptions = rssSourcesData();
    const filters = ["全部", "已启用", "需登录", "无分组", "暂停"];
    const activeFilter = appState?.rssManageFilter || "全部";
    return rssLibraryScreen(data, "RSS 订阅管理", `
      <section class="fd-rss-manage-actions">
        <button type="button" data-route="rss-source-edit">${icon("add", "fd-small-icon")}新建</button>
        <button type="button" data-route="rss-source-import">${icon("upload", "fd-small-icon")}导入</button>
        <button type="button" data-route="rss-rule-subscription">${icon("sync", "fd-small-icon")}规则订阅</button>
        <button type="button" data-route="rss-source-groups">${icon("folder", "fd-small-icon")}分组</button>
      </section>
      ${filterDisclosure({
        className: "fd-rss-filter-control fd-rss-manage-filter-control",
        label: "筛选",
        ariaLabel: "RSS 订阅管理筛选",
        summary: activeFilter,
        toggleAttr: "data-rss-manage-filter-toggle",
        open: Boolean(appState?.rssManageFilterOpen),
        groups: [{
          title: "订阅源状态",
          options: filters.map((item) => ({
            label: item,
            active: activeFilter === item,
            attrs: { "data-rss-manage-filter": item }
          }))
        }]
      })}
      <section class="fd-rss-source-list" aria-label="RSS 订阅源列表">
        ${subscriptions.map((source) => `
          <article class="${source.enabled ? "" : "is-disabled"}" role="button" tabindex="0" data-route="rss-source-feed">
            <span>${icon(source.enabled ? "rss" : "offline", "fd-small-icon")}</span>
            <strong>${esc(source.name)}<small>${esc(source.group)} · ${source.unread ? `${esc(source.unread)} 条未读` : "无未读"} · ${esc(source.latest)} · ${esc(source.articleStyle)}</small></strong>
            ${rssBadge(source.status, source.tone)}
            <button type="button" data-route="rss-source-actions" aria-label="${esc(source.name)}更多操作">${icon("more", "fd-small-icon")}</button>
          </article>
        `).join("")}
      </section>
      <section class="fd-rss-manage-batch-row">
        <strong>已选 2 个</strong>
        <button type="button" data-route="rss-source-batch">批量</button>
        <button type="button" data-route="rss-source-batch-disable">禁用</button>
        <button type="button" data-route="rss-source-export">导出</button>
      </section>
      <section class="fd-rss-source-settings">
        <h2>刷新与提醒</h2>
        <article><span>${icon("refresh", "fd-small-icon")}</span><strong>自动刷新<small>Wi-Fi 下每 30 分钟刷新一次</small></strong>${settingsSwitch(true)}</article>
        <article><span>${icon("bell", "fd-small-icon")}</span><strong>未读提醒<small>只提醒重点订阅源</small></strong>${settingsSwitch(true)}</article>
      </section>`, "", appState);
  }

  function rssStateScreen(data, route, appState) {
    const isError = route === "rss-error";
    return rssShellScreen(data, isError ? "RSS 错误" : "RSS 空状态", `
      <section class="fd-search-state fd-rss-state-card ${isError ? "is-error" : "is-empty"}">
        <span>${icon(isError ? "warning" : "rss", "fd-medium-icon")}</span>
        <h2>${isError ? "订阅刷新失败" : "暂无未读订阅"}</h2>
        <p>${isError ? "2 个订阅源刷新失败，已保留最近缓存条目。可以稍后重试、查看错误源，或进入订阅源管理修复登录态和规则。" : "当前订阅源没有新的未读条目。你可以查看全部、管理订阅源或手动刷新。日常空状态仍保留 RSS 主导航上下文。"}</p>
        ${isError ? `<section class="fd-rss-error-list"><article><strong>书源维护公告</strong><small>登录态失效 · 需要重新登录</small></article><article><strong>本地系统通知</strong><small>源已暂停 · 不参与自动刷新</small></article></section>` : ""}
        <div class="fd-action-row">
          <button type="button" data-route="${isError ? "rss-refreshing" : "rss-all"}">${isError ? "重试刷新" : "查看全部"}</button>
          <button type="button" data-route="rss-subscription-management">订阅管理</button>
        </div>
      </section>`, appState);
  }

  function mainTabSettings(data, appState) {
    const rows = [
      { icon: "gear", title: "通用设置", route: "settings-general" },
      { icon: "bookshelf", title: "书架与搜索设置", route: "bookshelf-search-settings" },
      { icon: "source-stack", title: "书源管理", route: "source-management" },
      { icon: "sync", title: "同步与备份", route: "sync-backup" },
      { icon: "info", title: "关于与反馈", route: "about-feedback" }
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
              <strong>${esc(row.title)}${row.meta ? `<small>${esc(row.meta)}</small>` : ""}</strong>
              <em class="fd-settings-row-side is-icon">${icon("chevron", "fd-small-icon")}</em>
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
          ${data.library.chapters.map((chapter, index) => `
            <article class="${chapterIsCurrent(chapter) ? "is-current" : ""}" role="button" tabindex="0" data-route="immersive-reading">
              <span>${esc(chapter.title)}</span>
              ${chapterMarkerSlots(chapter, appState, { book: data.library.book, chapterIndex: index })}
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
      actions: ["search", "more"],
      ariaLabel: "书架空状态",
      contentHtml: `
        <section class="fd-bookshelf-shelf-section is-empty" aria-label="我的书架">
          ${bookshelfSectionHeader("cover", true, null)}
          <section class="fd-bookshelf-empty-state" data-slot="bookshelfEmpty" aria-label="书架空状态">
            <div class="fd-bookshelf-empty-visual" aria-hidden="true">
              <span>${icon("bookshelf", "fd-medium-icon")}</span>
              <i></i>
              <i></i>
            </div>
            <h2>书架还是空的</h2>
            <p>添加网络书籍或导入本地文件后，会在这里显示继续阅读和书架内容。</p>
            <div class="fd-bookshelf-empty-actions">
              <button class="is-primary" type="button" data-route="book-search">
                ${icon("search", "fd-small-icon")}
                <span><strong>搜索书籍</strong><small>按书名、作者或关键词查找</small></span>
              </button>
              <button type="button" data-route="local-import">
                ${icon("folder", "fd-small-icon")}
                <span><strong>导入本地书</strong><small>添加本机文件到书架</small></span>
              </button>
            </div>
            <section class="fd-bookshelf-empty-hints" aria-label="可选入口">
              <button type="button" data-route="discover">${icon("sparkle", "fd-small-icon")}去发现</button>
              <button type="button" data-route="bookshelf-search-settings">${icon("gear", "fd-small-icon")}书架设置</button>
            </section>
          </section>
        </section>`,
      stateHostHtml: `
        <p class="fd-nav-feedback">当前 Tab：书架</p>
        ${bookshelfMoreLayer()}`
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
            ${visibleChapters.map((chapter) => {
              const chapterIndex = Math.max(0, chapters.indexOf(chapter));
              return `
            <article class="${chapterIsCurrent(chapter) ? "is-current" : ""}" role="button" tabindex="0" data-route="immersive-reading">
              <span>${esc(chapter.title)}</span>
              ${chapterMarkerSlots(chapter, appState, { book, chapterIndex })}
            </article>
            `;
            }).join("")}
          </div>
        </section>`
    }));
  }

  function sortFilterScreen(data, appState) {
    const filterState = Object.assign({}, appState, {
      bookshelfFilterOpen: appState?.bookshelfFilterOpen !== false
    });
    return mainTabBookshelf(data, filterState);
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
          <span><strong>选择本地书文件</strong><small>选择后识别分组并确认导入</small></span>
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

  function readerReplacementRules(appState) {
    const rules = [
      { id: "rain-name", title: "雨容称呼", enabled: true },
      { id: "old-name", title: "旧称统一", enabled: true },
      { id: "punctuation", title: "标点清理", enabled: false },
      { id: "ad-filter", title: "广告过滤", enabled: true }
    ];
    const overrides = appState?.readerReplacementRules || {};
    return rules.map((rule) => Object.assign({}, rule, {
      enabled: Object.prototype.hasOwnProperty.call(overrides, rule.id) ? Boolean(overrides[rule.id]) : rule.enabled
    }));
  }

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
    const parentRoutes = {
      "source-delete-confirm": "source-batch"
    };
    if (parentRoutes[route]) {
      return initialRouteStackFor(parentRoutes[route]).concat(route);
    }
    if (["bookshelf", "discover", "rss", "settings"].includes(route)) {
      return [route];
    }
    if (route.startsWith("rss-")) {
      return ["rss", route];
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

  function normalizeReaderPageSpace(data) {
    const pageSpace = (data.reader && data.reader.pageSpace) || {};
    return {
      topMargin: Number.isFinite(Number(pageSpace.topMargin)) ? Number(pageSpace.topMargin) : 72,
      sideMargin: Number.isFinite(Number(pageSpace.sideMargin)) ? Number(pageSpace.sideMargin) : 32,
      paragraphIndent: Number.isFinite(Number(pageSpace.paragraphIndent)) ? Number(pageSpace.paragraphIndent) : 2,
      texture: pageSpace.texture || "plain"
    };
  }

  function readerPageSpaceConfig(data) {
    const config = data.reader?.pageSpaceConfig || {};
    const normalizeConfig = (item, fallback) => ({
      min: Number.isFinite(Number(item?.min)) ? Number(item.min) : fallback.min,
      max: Number.isFinite(Number(item?.max)) ? Number(item.max) : fallback.max,
      step: Number.isFinite(Number(item?.step)) ? Number(item.step) : fallback.step,
      precision: Number.isFinite(Number(item?.precision)) ? Number(item.precision) : fallback.precision
    });
    return {
      topMargin: normalizeConfig(config.topMargin, { min: 48, max: 96, step: 4, precision: 0 }),
      sideMargin: normalizeConfig(config.sideMargin, { min: 20, max: 48, step: 4, precision: 0 }),
      paragraphIndent: normalizeConfig(config.paragraphIndent, { min: 0, max: 3, step: 0.5, precision: 1 }),
      textureOptions: Array.isArray(config.textureOptions) && config.textureOptions.length > 0
        ? config.textureOptions
        : [
          { value: "paper", label: "纸张" },
          { value: "plain", label: "纯色" },
          { value: "soft", label: "柔和" }
        ]
    };
  }

  function readerPageSpaceStyle(data, pageSpace) {
    const safe = pageSpace || normalizeReaderPageSpace(data);
    return [
      `--reader-top-margin:${esc(safe.topMargin)}px`,
      `--reader-side-margin:${esc(safe.sideMargin)}px`,
      `--reader-paragraph-indent:${esc(safe.paragraphIndent)}em`,
      `--reader-page-texture-opacity:${safe.texture === "paper" ? "0.04" : safe.texture === "soft" ? "0.02" : "0"}`
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
    const isNight = theme.scheme === "night";
    const themeTexture = theme.texture || "plain";
    const textureOpacity = Number.isFinite(Number(theme.textureOpacity))
      ? Math.max(0, Math.min(0.08, Number(theme.textureOpacity)))
      : themeTexture === "paper"
        ? isNight ? 0.026 : 0.034
        : 0;
    const textureRgb = theme.textureRgb || (isNight ? "222 202 174" : "138 116 84");
    const control = isNight
      ? {
        surface: "rgba(38, 35, 31, 0.96)",
        surfaceSolid: "rgba(34, 31, 28, 0.98)",
        panel: "rgba(46, 42, 37, 0.82)",
        panelSoft: "rgba(66, 59, 51, 0.66)",
        elevated: "rgba(52, 47, 42, 0.92)",
        field: "rgba(58, 52, 46, 0.78)",
        line: "rgba(226, 209, 185, 0.16)",
        lineStrong: "rgba(226, 209, 185, 0.28)",
        ink: "#eadfce",
        muted: "#baad9c",
        icon: "#d4c5b2",
        primary: "#7a684f",
        primaryText: "#fffaf4",
        action: "#d2bd96",
        activeBg: "rgba(210, 189, 150, 0.18)",
        activeStrong: "rgba(210, 189, 150, 0.28)",
        activeSoft: "rgba(210, 189, 150, 0.12)",
        disabledBg: "rgba(226, 209, 185, 0.12)",
        handle: "rgba(215, 203, 188, 0.42)",
        shadow: "0 14px 30px rgba(0, 0, 0, 0.28)",
        innerShadow: "inset 0 1px 0 rgba(255, 250, 244, 0.07), 0 8px 22px rgba(0, 0, 0, 0.18)",
        selectionToolbar: "rgba(28, 25, 22, 0.96)",
        selectionToolbarLine: "rgba(235, 222, 204, 0.16)",
        selectionToolbarText: "#fff7ec",
        selectionFill: "rgba(235, 222, 204, 0.14)",
        selectionLine: "rgba(235, 222, 204, 0.38)",
        selectionHandle: "#d7c7b2",
        selectionHandleBorder: "rgba(28, 25, 22, 0.92)",
        ttsCursor: "rgba(234, 223, 206, 0.46)",
        ttsCursorSoft: "rgba(234, 223, 206, 0.08)",
        annotationLine: "color-mix(in srgb, currentColor 58%, transparent)"
      }
      : {
        surface: "rgba(255, 250, 244, 0.98)",
        surfaceSolid: "rgba(255, 252, 248, 0.98)",
        panel: "rgba(255, 252, 248, 0.62)",
        panelSoft: "rgba(238, 230, 219, 0.64)",
        elevated: "rgba(255, 252, 248, 0.74)",
        field: "rgba(255, 248, 239, 0.78)",
        line: "rgba(155, 132, 102, 0.18)",
        lineStrong: "rgba(180, 166, 151, 0.34)",
        ink: "#332c25",
        muted: "#5b5046",
        icon: "#4d463f",
        primary: "#2f6373",
        primaryText: "#fffaf4",
        action: "#2f6373",
        activeBg: "rgba(47, 99, 115, 0.1)",
        activeStrong: "rgba(47, 99, 115, 0.16)",
        activeSoft: "rgba(47, 99, 115, 0.08)",
        disabledBg: "rgba(238, 230, 219, 0.56)",
        handle: "#b9ad9f",
        shadow: "var(--fd-shadow)",
        innerShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.68), 0 5px 18px rgba(92, 71, 50, 0.05)",
        selectionToolbar: "rgba(48, 42, 35, 0.95)",
        selectionToolbarLine: "rgba(75, 63, 50, 0.24)",
        selectionToolbarText: "#fffaf4",
        selectionFill: "rgba(57, 49, 40, 0.12)",
        selectionLine: "rgba(57, 49, 40, 0.26)",
        selectionHandle: "#5b5046",
        selectionHandleBorder: "#fffaf4",
        ttsCursor: "rgba(43, 36, 29, 0.42)",
        ttsCursorSoft: "rgba(43, 36, 29, 0.045)",
        annotationLine: "color-mix(in srgb, currentColor 48%, transparent)"
      };
    return [
      `--reader-theme-scheme:${esc(theme.scheme || "day")}`,
      `--reader-paper-start:${esc(theme.paperStart)}`,
      `--reader-paper-end:${esc(theme.paperEnd)}`,
      `--reader-ink:${esc(theme.ink)}`,
      `--reader-theme-texture:${esc(themeTexture)}`,
      `--reader-theme-texture-opacity:${esc(textureOpacity.toFixed(3))}`,
      `--reader-texture-color-rgb:${esc(textureRgb)}`,
      `--reader-control-surface:${esc(control.surface)}`,
      `--reader-control-surface-solid:${esc(control.surfaceSolid)}`,
      `--reader-control-panel:${esc(control.panel)}`,
      `--reader-control-panel-soft:${esc(control.panelSoft)}`,
      `--reader-control-elevated:${esc(control.elevated)}`,
      `--reader-control-field:${esc(control.field)}`,
      `--reader-control-line:${esc(control.line)}`,
      `--reader-control-line-strong:${esc(control.lineStrong)}`,
      `--reader-control-ink:${esc(control.ink)}`,
      `--reader-control-muted:${esc(control.muted)}`,
      `--reader-control-icon:${esc(control.icon)}`,
      `--reader-control-primary:${esc(control.primary)}`,
      `--reader-control-primary-text:${esc(control.primaryText)}`,
      `--reader-control-action:${esc(control.action)}`,
      `--reader-control-active-bg:${esc(control.activeBg)}`,
      `--reader-control-active-strong:${esc(control.activeStrong)}`,
      `--reader-control-active-soft:${esc(control.activeSoft)}`,
      `--reader-control-disabled-bg:${esc(control.disabledBg)}`,
      `--reader-control-handle:${esc(control.handle)}`,
      `--reader-control-shadow:${esc(control.shadow)}`,
      `--reader-control-inner-shadow:${esc(control.innerShadow)}`,
      `--reader-selection-toolbar:${esc(control.selectionToolbar)}`,
      `--reader-selection-toolbar-line:${esc(control.selectionToolbarLine)}`,
      `--reader-selection-toolbar-text:${esc(control.selectionToolbarText)}`,
      `--reader-selection-fill:${esc(control.selectionFill)}`,
      `--reader-selection-line:${esc(control.selectionLine)}`,
      `--reader-selection-handle:${esc(control.selectionHandle)}`,
      `--reader-selection-handle-border:${esc(control.selectionHandleBorder)}`,
      `--reader-tts-cursor:${esc(control.ttsCursor)}`,
      `--reader-tts-cursor-soft:${esc(control.ttsCursorSoft)}`,
      `--reader-annotation-line:${esc(control.annotationLine)}`,
      `--fd-ink:var(--reader-control-ink)`,
      `--fd-muted:var(--reader-control-muted)`,
      `--fd-primary:var(--reader-control-primary)`,
      `--fd-primary-dark:var(--reader-control-primary)`
    ].join(";");
  }

  function syncAppThemeRoot(root, data, appState) {
    if (!root) return;
    const theme = currentReaderTheme(data, appState);
    const scheme = theme.scheme === "night" ? "night" : "day";
    root.setAttribute("data-app-theme", theme.value || "");
    root.setAttribute("data-app-theme-scheme", scheme);
    document.documentElement.setAttribute("data-reader-app-theme", theme.value || "");
    document.documentElement.setAttribute("data-reader-app-theme-scheme", scheme);
    if (document.body) {
      document.body.setAttribute("data-reader-app-theme", theme.value || "");
      document.body.setAttribute("data-reader-app-theme-scheme", scheme);
    }
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
    const rawDefaults = config.defaults || {};
    const segmentCount = readerTtsSegments(data).length;
    const defaults = Object.assign({}, rawDefaults);
    const defaultIndex = Number(defaults.sentenceIndex);
    const fallbackMin = Number.isFinite(defaultIndex) && defaultIndex > 0 ? defaultIndex : 1;
    const sentenceMin = Number.isFinite(Number(config.sentenceMin)) ? Number(config.sentenceMin) : fallbackMin;
    const configuredMax = Number.isFinite(Number(config.sentenceMax)) ? Number(config.sentenceMax) : fallbackMin;
    const sentenceMax = Math.max(sentenceMin, configuredMax, segmentCount || sentenceMin);
    defaults.sentenceIndex = clamp(Number.isFinite(defaultIndex) ? defaultIndex : sentenceMin, sentenceMin, sentenceMax);
    return {
      sentenceMin,
      sentenceMax,
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

  function readerTocMode(appState) {
    return appState?.readerTocMode === "bookmark" ? "bookmark" : "directory";
  }

  function readerTocSwitchHtml(tocMode, className) {
    return `
      <nav class="${esc(className)}" aria-label="目录书签切换">
        <button class="${tocMode === "directory" ? "is-active" : ""}" type="button" data-reader-toc-mode="directory">目录</button>
        <button class="${tocMode === "bookmark" ? "is-active" : ""}" type="button" data-reader-toc-mode="bookmark">书签</button>
      </nav>`;
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

  function quickTypographyPanelRows(data, typography) {
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
      <div class="fd-reader-font-row" aria-label="字体">
        ${readerFontOptions(data).slice(0, 3).map((item) => `
          <button class="${typography.fontFamily === item.value ? "is-active" : ""}" type="button" data-reader-typography-set="fontFamily" data-reader-typography-value="${esc(item.value)}">${esc(item.label)}</button>
        `).join("")}
      </div>`;
  }

  function readerPageSpaceRows(data, pageSpace) {
    return `
      <div class="fd-reader-step-row" data-page-space-row="top-margin">
        <strong>上边距</strong>
        <span>
          <button type="button" data-reader-page-space-action="top-margin-decrease">-</button>
          <em data-reader-page-space-value="top-margin">${esc(typographyNumber(pageSpace.topMargin, 0))}</em>
          <button type="button" data-reader-page-space-action="top-margin-increase">+</button>
        </span>
      </div>
      <div class="fd-reader-step-row" data-page-space-row="side-margin">
        <strong>左右边距</strong>
        <span>
          <button type="button" data-reader-page-space-action="side-margin-decrease">-</button>
          <em data-reader-page-space-value="side-margin">${esc(typographyNumber(pageSpace.sideMargin, 0))}</em>
          <button type="button" data-reader-page-space-action="side-margin-increase">+</button>
        </span>
      </div>
      <div class="fd-reader-step-row" data-page-space-row="paragraph-indent">
        <strong>段首缩进</strong>
        <span>
          <button type="button" data-reader-page-space-action="paragraph-indent-decrease">-</button>
          <em data-reader-page-space-value="paragraph-indent">${esc(typographyNumber(pageSpace.paragraphIndent, 1))}</em>
          <button type="button" data-reader-page-space-action="paragraph-indent-increase">+</button>
        </span>
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

  function readerTtsSegmentTexts(text) {
    const normalized = String(text || "").trim();
    if (!normalized) return [];
    const pieces = normalized.match(/[^。！？!?；;]+[。！？!?；;]?/g) || [normalized];
    return pieces.map((item) => item.trim()).filter(Boolean);
  }

  function readerTtsSegments(data) {
    const segments = [];
    readerTextBlocks(data).forEach((paragraph, paragraphIndex) => {
      readerTtsSegmentTexts(paragraph).forEach((text) => {
        segments.push({
          index: segments.length + 1,
          paragraphIndex,
          text
        });
      });
    });
    return segments;
  }

  const readerAnnotationPresets = [
    { text: "无数细小的针", style: "single" },
    { text: "迟到许久的答案", style: "dashed" },
    { text: "短暂而摇晃的光", style: "wavy" },
    { text: "某个雨夜", style: "single" }
  ];

  function readerAnnotationHtml(text) {
    const source = String(text || "");
    if (!source) {
      return "";
    }
    const matches = readerAnnotationPresets
      .map((item) => {
        const start = source.indexOf(item.text);
        return start >= 0 ? {
          start,
          end: start + item.text.length,
          text: item.text,
          style: item.style || "single"
        } : null;
      })
      .filter(Boolean)
      .sort((left, right) => left.start - right.start || left.end - right.end);
    const visible = [];
    let lastEnd = -1;
    matches.forEach((match) => {
      if (match.start < lastEnd) return;
      visible.push(match);
      lastEnd = match.end;
    });
    if (!visible.length) {
      return esc(source);
    }
    let html = "";
    let cursor = 0;
    visible.forEach((match) => {
      html += esc(source.slice(cursor, match.start));
      html += `<span class="fd-reader-annotation is-${esc(match.style)}" title="已标注">${esc(match.text)}</span>`;
      cursor = match.end;
    });
    html += esc(source.slice(cursor));
    return html;
  }

  function readerTtsSentenceIndex(data, appState) {
    const config = readerTtsConfig(data);
    const raw = Number(appState?.readerTts?.sentenceIndex || config.defaults.sentenceIndex || config.sentenceMin);
    return clamp(Number.isFinite(raw) ? raw : config.sentenceMin, config.sentenceMin, config.sentenceMax);
  }

  function readerTtsIsActive(appState) {
    return Boolean(appState?.readerTtsSession || appState?.readerTts?.playing);
  }

  function readerTtsParagraphHtml(line, segments, activeIndex) {
    const source = String(line || "");
    if (!source || !segments.length) {
      return `<p>${readerAnnotationHtml(source)}</p>`;
    }
    const matches = segments
      .map((segment) => {
        const start = source.indexOf(segment.text);
        return start >= 0 ? {
          start,
          end: start + segment.text.length,
          index: segment.index,
          text: segment.text
        } : null;
      })
      .filter(Boolean)
      .sort((left, right) => left.start - right.start || left.index - right.index);
    const visible = [];
    let lastEnd = -1;
    matches.forEach((match) => {
      if (match.start < lastEnd) return;
      visible.push(match);
      lastEnd = match.end;
    });
    if (!visible.length) {
      return `<p>${readerAnnotationHtml(source)}</p>`;
    }
    let html = "";
    let cursor = 0;
    visible.forEach((match) => {
      const isCurrent = match.index === activeIndex;
      html += readerAnnotationHtml(source.slice(cursor, match.start));
      html += `<span class="fd-reader-tts-segment${isCurrent ? " is-tts-current" : ""}" data-reader-tts-segment="${esc(match.index)}"${isCurrent ? ` data-reader-tts-current="true"` : ""}>${readerAnnotationHtml(match.text)}</span>`;
      cursor = match.end;
    });
    html += readerAnnotationHtml(source.slice(cursor));
    return `<p>${html}</p>`;
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
    const pageSpace = appState?.readerPageSpace || normalizeReaderPageSpace(data);
    const pageState = currentReaderPage(data, appState);
    const disableTurnAnimation = Boolean(options && options.disableTurnAnimation);
    const turnDirection = !disableTurnAnimation && appState?.readerTurnDirection ? ` fd-reader-page-turn-${esc(appState.readerTurnDirection)}` : "";
    const paragraphs = pageState.page.paragraphs.length > 0 ? pageState.page.paragraphs : readerTextBlocks(data);
    const chapterState = currentReaderChapter(data, appState);
    const chapterTitle = chapterState.chapter.title || `${readerChapterMeta(data)} ${readerChapterTitle(data)}`;
    const chapterTitleHtml = pageState.index === 0 ? `<h1>${esc(chapterTitle.replace(/^第\s*\d+\s*章\s*/, ""))}</h1>` : "";
    const paginationMode = appState?.readerPages?.length ? "runtime" : "fallback";
    const ttsActive = readerTtsIsActive(appState);
    const ttsPlaying = Boolean(appState?.readerTts?.playing);
    const ttsIndex = ttsActive ? readerTtsSentenceIndex(data, appState) : 0;
    const ttsSegments = ttsActive ? readerTtsSegments(data) : [];
    const paragraphHtml = paragraphs.map((line) => ttsActive ? readerTtsParagraphHtml(line, ttsSegments, ttsIndex) : `<p>${readerAnnotationHtml(line)}</p>`).join("");
    return `
      <div class="fd-ir-background-layer" data-dev-region="ReadingBackground" aria-hidden="true" style="${readerThemeStyle(data, appState)};${readerPageSpaceStyle(data, pageSpace)}"></div>
      <article class="fd-ir-reading-layer${turnDirection}" aria-label="正文排版层" data-dev-region="ReadingTextLayer" data-reader-pagination="${esc(paginationMode)}" data-reader-surface-signature="${esc(chapterTitle)}" data-reader-page-index="${esc(pageState.index)}" data-reader-page-count="${esc(pageState.count)}" data-reader-tts-active="${ttsActive ? "true" : "false"}" data-reader-tts-playing="${ttsPlaying ? "true" : "false"}" data-reader-tts-index="${esc(ttsIndex)}" style="${readerTypographyStyle(data, typography)};${readerThemeStyle(data, appState)};${readerPageSpaceStyle(data, pageSpace)}">
        ${chapterTitleHtml}
        ${paragraphHtml}
      </article>
      <div class="fd-reader-brightness-dim" data-reader-brightness-dim aria-hidden="true" style="${readerBrightnessStyle(data, appState)}"></div>
      ${dismissRoute ? `<button class="fd-reader-dismiss-zone" type="button" data-dev-region="ControlDismissZone" data-reader-dismiss="${esc(dismissRoute)}" aria-label="隐藏阅读控制层"></button>` : ""}`;
  }

  function readerInfoOverlay(data, appState) {
    const readout = data.reader.bottomReadout || {};
    const pageReadout = readerPageReadout(data, appState);
    const chapterState = currentReaderChapter(data, appState);
    const statusCapsule = readerImmersiveStatusCapsule(appState);
    const footerStatusState = statusCapsule ? "session" : "page";
    return `
      <section class="fd-ir-info-layer" data-dev-region="ImmersiveInfoLayer" aria-label="阅读信息层">
        <span class="fd-ir-top-left">${esc(data.reader.title)} · ${esc(chapterState.chapter.title || readerChapterMeta(data))}</span>
        <span class="fd-ir-top-right">${esc(data.reader.status.time)}</span>
        <span class="fd-ir-bottom-left" data-dev-region="ImmersiveFooterProgress">${esc(pageReadout.progress || readout.progress || "38%")}</span>
        <span class="fd-ir-bottom-right${statusCapsule ? " has-session-capsule" : ""}" data-dev-region="ImmersiveFooterStatus" data-reader-footer-status="${esc(footerStatusState)}">
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

  function readerImmersiveStatusCapsule(appState, options = {}) {
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
    const controlLayerAttrs = options.controlLayer
      ? ` data-reader-control-space data-reader-control-space-type="${esc(activeType)}" data-reader-control-space-playing="${isPlaying ? "true" : "false"}"`
      : "";
    const leading = isTts
      ? `<span class="fd-ir-voice-icon" data-reader-capsule-voice${options.controlLayer ? " data-reader-control-space-voice" : ""} aria-hidden="true">${icon("tts", "fd-small-icon")}</span>`
      : `<span class="fd-ir-countdown-dot" data-reader-capsule-countdown="${esc(autoCountdown)}"${options.controlLayer ? ` data-reader-control-space-countdown="${esc(autoCountdown)}"` : ""} aria-label="自动翻页倒计时 ${esc(autoCountdown)} 秒">${esc(autoCountdown)}</span>`;
    const control = isTts
      ? `<button type="button" data-reader-capsule-control${options.controlLayer ? " data-reader-control-space-control" : ""} data-reader-tts-action="toggle" aria-label="${ttsPlaying ? "暂停朗读" : "继续朗读"}">${icon(ttsPlaying ? "pause" : "play", "fd-small-icon")}</button>`
      : `<button type="button" data-reader-capsule-control${options.controlLayer ? " data-reader-control-space-control" : ""} data-reader-setting-toggle="autoPage" aria-label="${autoPlaying ? "暂停自动翻页" : "继续自动翻页"}">${icon(autoPlaying ? "pause" : "play", "fd-small-icon")}</button>`;
    return `
      <span class="fd-ir-status-capsule${options.controlLayer ? " fd-reader-control-session-capsule" : ""}" data-reader-immersive-status data-reader-immersive-status-type="${esc(activeType)}" data-reader-immersive-status-playing="${isPlaying ? "true" : "false"}"${controlLayerAttrs}>
        ${leading}
        <b data-reader-capsule-label${options.controlLayer ? " data-reader-control-space-label" : ""}>${esc(label)}</b>
        <span class="fd-ir-status-controls">${control}</span>
      </span>`;
  }

  function readerSessionCapsuleSnapshot(appState) {
    const ttsSession = Boolean(appState?.readerTtsSession || appState?.readerTts?.playing);
    const ttsPlaying = Boolean(appState?.readerTts?.playing);
    const autoSession = Boolean(appState?.readerAutoPageSession || appState?.readerSettings?.autoPage);
    const autoPlaying = Boolean(appState?.readerSettings?.autoPage);
    if (!ttsSession && !autoSession) return null;
    const type = ttsSession ? "tts" : "autoPage";
    const countdown = Math.max(1, Math.min(99, Number(appState?.readerAutoPageCountdown || 8)));
    return {
      type,
      playing: type === "tts" ? ttsPlaying : autoPlaying,
      countdown: type === "autoPage" ? countdown : 0
    };
  }

  function readerSessionCapsuleSnapshotKey(snapshot) {
    if (!snapshot) return "inactive";
    return `${snapshot.type}:${snapshot.playing ? "playing" : "paused"}:${snapshot.countdown}`;
  }

  function readerSessionCapsuleMotionMeta(previous, next) {
    if (!next) {
      return { id: "reader.session.capsule.exit", state: "exiting", action: "capsule-exit" };
    }
    if (!previous) {
      return { id: "reader.session.capsule.enter", state: "entering", action: "capsule-enter" };
    }
    if (previous.type !== next.type) {
      return { id: "reader.session.capsule.switch", state: "switching", action: "capsule-switch" };
    }
    if (previous.playing !== next.playing) {
      return { id: "reader.session.capsule.control.press/toggle", state: "control-toggle", action: "capsule-control-toggle" };
    }
    if (next.type === "autoPage" && previous.countdown !== next.countdown) {
      return { id: "reader.session.capsule.countdownTick", state: "countdown-tick", action: "capsule-countdown-tick" };
    }
    if (next.type === "tts" && next.playing) {
      return { id: "reader.session.capsule.voiceIcon.active", state: "voice-active", action: "capsule-voice-active" };
    }
    return { id: "reader.session.capsule.update", state: "updated", action: "capsule-update" };
  }

  function readerSessionControlSpaceMotionMeta(previous, next) {
    if (!next) {
      return { id: "reader.session.controlSpace.exit", state: "exiting", action: "control-space-exit" };
    }
    if (!previous) {
      return { id: "reader.session.controlSpace.enter", state: "entering", action: "control-space-enter" };
    }
    return { id: "reader.session.controlSpace.update", state: "updated", action: "control-space-update" };
  }

  function attachReaderSessionCapsuleMotionState(screenHost, appState, motionController) {
    const root = screenHost?.closest?.(".fd-demo") || null;
    const footer = screenHost?.querySelector?.("[data-reader-footer-status]") || null;
    const capsule = screenHost?.querySelector?.("[data-reader-immersive-status]") || null;
    const previous = appState.readerSessionCapsuleSnapshot || null;
    const next = readerSessionCapsuleSnapshot(appState);
    const meta = readerSessionCapsuleMotionMeta(previous, next);

    root?.setAttribute("data-motion-session-capsule-state", next ? meta.state : "hidden");
    root?.setAttribute("data-motion-session-capsule-id", meta.id);
    root?.setAttribute("data-motion-session-capsule-active", next ? "true" : "false");
    if (!capsule || !next) {
      if (!next) {
        appState.readerSessionCapsuleSnapshot = null;
      }
      return;
    }

    const snapshotChanged = readerSessionCapsuleSnapshotKey(previous) !== readerSessionCapsuleSnapshotKey(next);
    capsule.setAttribute("data-motion-session-capsule", "true");
    capsule.setAttribute("data-motion-session-capsule-state", meta.state);
    capsule.setAttribute("data-motion-session-capsule-id", meta.id);
    capsule.setAttribute("data-motion-id", meta.id);
    capsule.setAttribute("data-motion-phase", meta.state);
    capsule.setAttribute("data-motion-session-capsule-type", next.type);
    capsule.setAttribute("data-motion-session-capsule-playing", next.playing ? "true" : "false");
    capsule.setAttribute("data-motion-session-capsule-countdown", String(next.countdown));
    capsule.setAttribute("data-motion-session-capsule-key", readerSessionCapsuleSnapshotKey(next));
    if (footer) {
      footer.setAttribute("data-motion-session-capsule-anchor", "footer-status");
      footer.setAttribute("data-motion-session-capsule-id", meta.id);
    }

    const countdown = capsule.querySelector("[data-reader-capsule-countdown]");
    if (countdown) {
      countdown.setAttribute("data-motion-session-capsule-role", "countdown");
      countdown.setAttribute("data-motion-session-capsule-state", meta.id === "reader.session.capsule.countdownTick" ? "ticking" : "settled");
      countdown.setAttribute("data-motion-session-capsule-id", meta.id === "reader.session.capsule.countdownTick" ? meta.id : "reader.session.capsule.update");
      countdown.setAttribute("data-motion-id", countdown.getAttribute("data-motion-session-capsule-id"));
      countdown.setAttribute("data-motion-state", countdown.getAttribute("data-motion-session-capsule-state"));
    }

    const voice = capsule.querySelector("[data-reader-capsule-voice]");
    if (voice) {
      voice.setAttribute("data-motion-session-capsule-role", "voice");
      voice.setAttribute("data-motion-session-capsule-state", next.playing ? "active" : "paused");
      voice.setAttribute("data-motion-session-capsule-id", next.playing ? "reader.session.capsule.voiceIcon.active" : "reader.session.capsule.update");
      voice.setAttribute("data-motion-id", voice.getAttribute("data-motion-session-capsule-id"));
      voice.setAttribute("data-motion-state", voice.getAttribute("data-motion-session-capsule-state"));
    }

    const control = capsule.querySelector("[data-reader-capsule-control]");
    if (control) {
      control.setAttribute("data-motion-session-capsule-role", "control");
      control.setAttribute("data-motion-session-capsule-state", next.playing ? "playing" : "paused");
      control.setAttribute("data-motion-session-capsule-id", "reader.session.capsule.control.press/toggle");
      control.setAttribute("data-motion-id", "reader.session.capsule.control.press/toggle");
      control.setAttribute("data-motion-state", control.getAttribute("data-motion-session-capsule-state"));
      control.setAttribute("data-motion-press-id", "reader.session.capsule.control.press/toggle");
    }

    const label = capsule.querySelector("[data-reader-capsule-label]");
    if (label) {
      label.setAttribute("data-motion-session-capsule-role", "label");
      label.setAttribute("data-motion-session-capsule-state", meta.state);
      label.setAttribute("data-motion-session-capsule-id", meta.id === "reader.session.capsule.switch" ? meta.id : "reader.session.capsule.update");
      label.setAttribute("data-motion-id", label.getAttribute("data-motion-session-capsule-id"));
      label.setAttribute("data-motion-state", label.getAttribute("data-motion-session-capsule-state"));
    }

    if (motionController && snapshotChanged) {
      motionController.start({
        id: meta.id,
        action: meta.action,
        from: previous ? readerSessionCapsuleSnapshotKey(previous) : "inactive",
        to: readerSessionCapsuleSnapshotKey(next)
      });
    }
    appState.readerSessionCapsuleSnapshot = next;
  }

  function attachReaderControlSpaceMotionState(screenHost, appState, motionController) {
    const root = screenHost?.closest?.(".fd-demo") || null;
    const space = screenHost?.querySelector?.("[data-reader-control-space]") || null;
    const previous = appState.readerControlSpaceSnapshot || null;
    const next = readerSessionCapsuleSnapshot(appState);
    const active = Boolean(space && next);
    const meta = active
      ? readerSessionControlSpaceMotionMeta(previous, next)
      : { id: "reader.session.controlSpace.exit", state: previous ? "exiting" : "hidden", action: "control-space-exit" };

    root?.setAttribute("data-motion-control-space-state", active ? meta.state : "hidden");
    root?.setAttribute("data-motion-control-space-id", meta.id);
    root?.setAttribute("data-motion-control-space-active", active ? "true" : "false");

    if (!active) {
      if (previous && motionController) {
        motionController.start({
          id: "reader.session.controlSpace.exit",
          action: "control-space-exit",
          from: readerSessionCapsuleSnapshotKey(previous),
          to: next ? readerSessionCapsuleSnapshotKey(next) : "inactive"
        });
      }
      appState.readerControlSpaceSnapshot = null;
      return;
    }

    const snapshotChanged = readerSessionCapsuleSnapshotKey(previous) !== readerSessionCapsuleSnapshotKey(next);
    space.setAttribute("data-motion-control-space", "true");
    space.setAttribute("data-motion-control-space-state", meta.state);
    space.setAttribute("data-motion-control-space-id", meta.id);
    space.setAttribute("data-motion-id", meta.id);
    space.setAttribute("data-motion-phase", meta.state);
    space.setAttribute("data-motion-control-space-type", next.type);
    space.setAttribute("data-motion-control-space-playing", next.playing ? "true" : "false");
    space.setAttribute("data-motion-control-space-countdown", String(next.countdown));
    space.setAttribute("data-motion-control-space-key", readerSessionCapsuleSnapshotKey(next));

    const countdown = space.querySelector("[data-reader-control-space-countdown]");
    if (countdown) {
      const ticking = next.type === "autoPage" && previous?.countdown !== next.countdown;
      countdown.setAttribute("data-motion-control-space-role", "countdown");
      countdown.setAttribute("data-motion-control-space-state", ticking ? "ticking" : "settled");
      countdown.setAttribute("data-motion-control-space-id", "reader.session.controlSpace.update");
      countdown.setAttribute("data-motion-id", "reader.session.controlSpace.update");
      countdown.setAttribute("data-motion-state", countdown.getAttribute("data-motion-control-space-state"));
    }

    const voice = space.querySelector("[data-reader-control-space-voice]");
    if (voice) {
      voice.setAttribute("data-motion-control-space-role", "voice");
      voice.setAttribute("data-motion-control-space-state", next.playing ? "active" : "paused");
      voice.setAttribute("data-motion-control-space-id", "reader.session.controlSpace.update");
      voice.setAttribute("data-motion-id", "reader.session.controlSpace.update");
      voice.setAttribute("data-motion-state", voice.getAttribute("data-motion-control-space-state"));
    }

    const control = space.querySelector("[data-reader-control-space-control]");
    if (control) {
      control.setAttribute("data-motion-control-space-role", "control");
      control.setAttribute("data-motion-control-space-state", next.playing ? "playing" : "paused");
      control.setAttribute("data-motion-control-space-id", "reader.session.controlSpace.update");
      control.setAttribute("data-motion-id", "reader.session.controlSpace.update");
      control.setAttribute("data-motion-state", control.getAttribute("data-motion-control-space-state"));
      control.setAttribute("data-motion-press-id", "reader.session.capsule.control.press/toggle");
    }

    const label = space.querySelector("[data-reader-control-space-label]");
    if (label) {
      label.setAttribute("data-motion-control-space-role", "label");
      label.setAttribute("data-motion-control-space-state", meta.state);
      label.setAttribute("data-motion-control-space-id", "reader.session.controlSpace.update");
      label.setAttribute("data-motion-id", "reader.session.controlSpace.update");
      label.setAttribute("data-motion-state", meta.state);
    }

    if (motionController && snapshotChanged) {
      motionController.start({
        id: meta.id,
        action: meta.action,
        from: previous ? readerSessionCapsuleSnapshotKey(previous) : "inactive",
        to: readerSessionCapsuleSnapshotKey(next)
      });
    }
    appState.readerControlSpaceSnapshot = next;
  }

  function clearFirstOpenMotionTimer(appState) {
    if (appState?.firstOpenMotionTimer) {
      window.clearTimeout(appState.firstOpenMotionTimer);
      appState.firstOpenMotionTimer = null;
    }
  }

  function applyFirstOpenMotionAttributes(root, screenHost, motion) {
    if (!root || !screenHost || !motion) return;
    root.setAttribute("data-motion-first-open", "true");
    root.setAttribute("data-motion-first-open-state", motion.state);
    root.setAttribute("data-motion-first-open-id", "app.firstOpen.enter");
    root.setAttribute("data-motion-first-open-route", motion.route || "");
    root.setAttribute("data-motion-first-open-cold-start", "true");
    root.setAttribute("data-motion-first-open-played", motion.settled ? "true" : "false");
    if (motion.state === "entering") {
      screenHost.setAttribute("data-motion-first-open-target", "screen-host");
      screenHost.setAttribute("data-motion-first-open-state", motion.state);
      screenHost.setAttribute("data-motion-first-open-route", motion.route || "");
      screenHost.setAttribute("data-motion-id", "app.firstOpen.enter");
      screenHost.setAttribute("data-motion-phase", motion.state);
    } else {
      const firstOpenOwnedHost = screenHost.getAttribute("data-motion-id") === "app.firstOpen.enter" ||
        screenHost.getAttribute("data-motion-first-open-state") === "entering";
      screenHost.removeAttribute("data-motion-first-open-target");
      screenHost.removeAttribute("data-motion-first-open-state");
      screenHost.removeAttribute("data-motion-first-open-route");
      if (firstOpenOwnedHost) {
        screenHost.removeAttribute("data-motion-id");
        screenHost.removeAttribute("data-motion-phase");
      }
    }
  }

  function settleFirstOpenMotion(root, screenHost, appState) {
    const motion = appState?.firstOpenMotion;
    if (!motion || motion.settled) return;
    motion.state = "settled";
    motion.settled = true;
    appState.hasPlayedFirstOpen = true;
    clearFirstOpenMotionTimer(appState);
    applyFirstOpenMotionAttributes(root, screenHost, motion);
  }

  function attachFirstOpenMotionState(root, screenHost, appState) {
    const motion = appState?.firstOpenMotion;
    if (!root || !screenHost || !motion) return;
    const reduced = root.getAttribute("data-motion-reduced") === "true";
    if (motion.settled || reduced) {
      motion.state = "settled";
      motion.settled = true;
      appState.hasPlayedFirstOpen = true;
      clearFirstOpenMotionTimer(appState);
      applyFirstOpenMotionAttributes(root, screenHost, motion);
      return;
    }
    motion.state = motion.state || "entering";
    applyFirstOpenMotionAttributes(root, screenHost, motion);
    clearFirstOpenMotionTimer(appState);
    appState.firstOpenMotionTimer = window.setTimeout(() => {
      settleFirstOpenMotion(root, screenHost, appState);
    }, 280);
  }

  function clearViewportOrientationMotionTimer(appState) {
    if (appState?.viewportOrientationMotionTimer) {
      window.clearTimeout(appState.viewportOrientationMotionTimer);
      appState.viewportOrientationMotionTimer = null;
    }
  }

  function viewportSnapshotLabel(snapshot) {
    if (!snapshot) return "";
    return `${snapshot.viewportClass || "unknown"}:${snapshot.orientation || "unknown"}`;
  }

  function viewportSnapshotSize(snapshot) {
    if (!snapshot) return "";
    return `${Math.round(snapshot.width || 0)}x${Math.round(snapshot.height || 0)}`;
  }

  function viewportOrientationMotionId(state) {
    if (state === "preparing") return "viewport.orientation.prepare";
    if (state === "settling" || state === "settled") return "viewport.orientation.settle";
    return "viewport.orientation.reshape";
  }

  function activeMotionFocusSummary(screenHost) {
    const active = document.activeElement;
    if (!active || !screenHost || !screenHost.contains(active)) return "outside";
    const direct = active.getAttribute("data-motion-id") ||
      active.getAttribute("data-route") ||
      active.getAttribute("data-reader-setting-toggle") ||
      active.getAttribute("data-reader-tts-action") ||
      active.getAttribute("data-reader-page-action") ||
      active.getAttribute("aria-label");
    return String(direct || active.tagName || "inside").slice(0, 64);
  }

  function activeMotionOverlaySummary(screenHost, appState) {
    if (!screenHost) return "none";
    const dialog = screenHost.querySelector("[data-demo-dialog][aria-hidden=\"false\"]");
    if (dialog) return "dialog";
    const sheet = screenHost.querySelector("[data-demo-sheet][aria-hidden=\"false\"]");
    if (sheet) return "sheet";
    const dropdown = screenHost.querySelector("[data-motion-dropdown-role=\"menu\"][data-motion-dropdown-state=\"expanded\"]");
    if (dropdown) return `dropdown:${dropdown.getAttribute("data-motion-dropdown-placement") || "down"}`;
    if (appState?.readerMoreOpen) return "reader-more";
    if (appState?.settingsOverlay) return `settings:${appState.settingsOverlay}`;
    if (appState?.settingsExpandedOption) return `settings-option:${appState.settingsExpandedOption}`;
    if (appState?.discoverFilterOpen || appState?.discoverSortOpen) return "discover-dropdown";
    if (appState?.sourceMenuOpen || appState?.sourceFilterOpen) return "source-dropdown";
    return "none";
  }

  function overlayMotionRole(element) {
    if (!element) return "unknown";
    if (element.matches("[data-keyboard-host]")) return "keyboard";
    if (element.matches("[data-demo-sheet]")) return "sheet";
    if (element.matches("[data-demo-dialog]")) return "dialog";
    return "unknown";
  }

  function overlayMotionId(role, state) {
    const action = state === "visible" || state === "entering" ? "enter" : "exit";
    if (role === "keyboard") return `overlay.keyboard.${action}`;
    if (role === "sheet") return `overlay.sheet.${action}`;
    if (role === "dialog") return `overlay.dialog.${action}`;
    return `overlay.${action}`;
  }

  function overlayMotionFocusLabel(element) {
    if (!element) return "none";
    return String(
      element.getAttribute("data-motion-id") ||
      element.getAttribute("data-route") ||
      element.getAttribute("data-settings-overlay") ||
      element.getAttribute("aria-label") ||
      element.textContent ||
      element.tagName ||
      "unknown"
    ).trim().replace(/\s+/g, " ").slice(0, 72) || "unknown";
  }

  function overlayMotionVisible(element) {
    if (!element) return false;
    if (element.getAttribute("aria-hidden") === "false") return true;
    if (element.matches("[data-keyboard-host]")) return Boolean(element.closest(".fd-phone.has-keyboard"));
    if (element.matches("[data-demo-sheet]")) return Boolean(element.closest(".fd-phone.has-sheet, .fd-settings-phone.has-sheet, .fd-library-phone.has-sheet, .fd-sheet-page"));
    if (element.matches("[data-demo-dialog]")) return Boolean(element.closest(".fd-phone.has-dialog, .fd-settings-phone.has-dialog, .fd-library-phone.has-dialog"));
    return false;
  }

  function syncOverlayMotionElement(element, appState) {
    if (!element) return;
    const role = overlayMotionRole(element);
    const visible = overlayMotionVisible(element);
    const state = visible ? "visible" : "hidden";
    const phase = visible ? "entered" : "exited";
    element.setAttribute("data-motion-overlay", "true");
    element.setAttribute("data-motion-overlay-role", role);
    element.setAttribute("data-motion-overlay-state", state);
    element.setAttribute("data-motion-overlay-phase", phase);
    element.setAttribute("data-motion-overlay-id", overlayMotionId(role, state));
    element.setAttribute("data-motion-overlay-focus", element.contains(document.activeElement) ? "inside" : "outside");
    element.setAttribute("data-motion-overlay-focus-return", appState?.motionOverlayFocusReturn || "none");
    element.setAttribute("data-motion-id", overlayMotionId(role, state));
  }

  function attachOverlayMotionState(screenHost, appState) {
    if (!screenHost || typeof screenHost.querySelectorAll !== "function") return;
    const root = screenHost.closest(".fd-demo");
    let activeRole = "none";
    let activeCount = 0;
    screenHost.querySelectorAll("[data-keyboard-host], [data-demo-sheet], [data-demo-dialog]").forEach((element) => {
      syncOverlayMotionElement(element, appState);
      if (element.getAttribute("data-motion-overlay-state") === "visible") {
        activeRole = element.getAttribute("data-motion-overlay-role") || activeRole;
        activeCount += 1;
      }
    });

    const bindAction = (selector, action, role) => {
      screenHost.querySelectorAll(selector).forEach((element) => {
        element.setAttribute("data-motion-overlay-action", action);
        element.setAttribute("data-motion-overlay-target", role);
        element.setAttribute("data-motion-overlay-focus-return", appState?.motionOverlayFocusReturn || "none");
      });
    };
    bindAction("[data-open-keyboard]", "open", "keyboard");
    bindAction("[data-close-keyboard]", "close", "keyboard");
    bindAction("[data-open-sheet]", "open", "sheet");
    bindAction("[data-close-sheet]", "close", "sheet");
    bindAction("[data-open-dialog]", "open", "dialog");
    bindAction("[data-close-dialog]", "close", "dialog");
    bindAction("[data-settings-overlay]", "open", "settings");
    bindAction("[data-close-settings-overlay]", "close", "settings");

    if (root) {
      root.setAttribute("data-motion-overlay-active", activeCount > 0 ? "true" : "false");
      root.setAttribute("data-motion-overlay-active-role", activeRole);
      root.setAttribute("data-motion-overlay-focus-return", appState?.motionOverlayFocusReturn || "none");
    }
  }

  function startOverlayMotion(screenHost, appState, motionController, role, action, trigger) {
    if (!appState) return;
    if (action === "open") {
      appState.motionOverlayFocusReturn = overlayMotionFocusLabel(trigger || document.activeElement);
      appState.motionOverlayReturnTarget = trigger || document.activeElement || null;
    }
    appState.motionOverlaySequence = (appState.motionOverlaySequence || 0) + 1;
    appState.motionOverlayRole = role;
    appState.motionOverlayAction = action;
    const id = overlayMotionId(role, action === "open" ? "visible" : "hidden");
    motionController?.start?.({
      id,
      sourceState: action === "open" ? "hidden" : "visible",
      targetState: action === "open" ? "visible" : "hidden",
      reason: `overlay-${action}`,
      route: screenHost?.closest?.(".fd-demo")?.getAttribute("data-current-route") || "",
      target: trigger || null
    });
  }

  function restoreOverlayMotionFocus(appState) {
    const target = appState?.motionOverlayReturnTarget;
    if (!target || !target.isConnected || typeof target.focus !== "function") return;
    window.setTimeout(() => {
      if (target.isConnected) target.focus({ preventScroll: true });
    }, 0);
  }

  function viewportOrientationRoleTargets(screenHost) {
    if (!screenHost || typeof screenHost.querySelectorAll !== "function") return [];
    const targets = [];
    const add = (selector, role) => {
      screenHost.querySelectorAll(selector).forEach((element) => {
        targets.push({ element, role });
      });
    };
    add(".fd-active-screen", "active-screen");
    add(".fd-ir-reading-layer", "reader-content");
    add(".fd-reader-sheet:not(.fd-reader-sheet-empty)", "reader-control-sheet");
    add(".fd-reader-module-nav:not(.fd-reader-module-nav-empty)", "reader-control-nav");
    add("[data-reader-immersive-status]", "session-capsule");
    add("[data-reader-control-space]", "control-space");
    add("[data-demo-dialog][aria-hidden=\"false\"]", "overlay-dialog");
    add("[data-demo-sheet][aria-hidden=\"false\"]", "overlay-sheet");
    add("[data-motion-dropdown-role=\"menu\"][data-motion-dropdown-state=\"expanded\"]", "dropdown-menu");
    return targets;
  }

  function clearViewportOrientationRoleTargets(screenHost) {
    if (!screenHost || typeof screenHost.querySelectorAll !== "function") return;
    screenHost.querySelectorAll("[data-motion-orientation-role]").forEach((element) => {
      [
        "data-motion-orientation-role",
        "data-motion-orientation-state",
        "data-motion-orientation-id",
        "data-motion-orientation-from",
        "data-motion-orientation-to",
        "data-motion-orientation-sequence"
      ].forEach((attribute) => element.removeAttribute(attribute));
    });
  }

  function applyViewportOrientationMotionAttributes(root, screenHost, appState, motion) {
    if (!root || !screenHost || !motion) return;
    const id = viewportOrientationMotionId(motion.state);
    const reduced = root.getAttribute("data-motion-reduced") === "true";
    const route = root.getAttribute("data-current-route") || motion.route || "";
    const readerActive = Boolean(screenHost.querySelector(".fd-ir-reading-layer, .fd-reader-frame"));
    const session = readerSessionCapsuleSnapshotKey(readerSessionCapsuleSnapshot(appState));
    const overlay = activeMotionOverlaySummary(screenHost, appState);
    const focus = activeMotionFocusSummary(screenHost);
    const dockSync = readerControlDockMovable(screenHost) ? "movable" : "static";
    const from = viewportSnapshotLabel(motion.from);
    const to = viewportSnapshotLabel(motion.to);

    motion.id = id;
    motion.route = route;
    motion.readerActive = readerActive;
    motion.session = session;
    motion.overlay = overlay;
    motion.focus = focus;
    motion.dockSync = dockSync;

    root.setAttribute("data-motion-orientation", "true");
    root.setAttribute("data-motion-orientation-state", motion.state);
    root.setAttribute("data-motion-orientation-id", id);
    root.setAttribute("data-motion-orientation-from", from);
    root.setAttribute("data-motion-orientation-to", to);
    root.setAttribute("data-motion-orientation-from-size", viewportSnapshotSize(motion.from));
    root.setAttribute("data-motion-orientation-to-size", viewportSnapshotSize(motion.to));
    root.setAttribute("data-motion-orientation-route", route);
    root.setAttribute("data-motion-orientation-reader", readerActive ? "true" : "false");
    root.setAttribute("data-motion-orientation-session", session);
    root.setAttribute("data-motion-orientation-overlay", overlay);
    root.setAttribute("data-motion-orientation-focus", focus);
    root.setAttribute("data-motion-orientation-dock", dockSync);
    root.setAttribute("data-motion-orientation-sequence", String(motion.sequence || 0));
    root.setAttribute("data-motion-orientation-reduced", reduced ? "true" : "false");
    root.setAttribute("data-motion-orientation-reanchored", motion.state === "preparing" ? "false" : "true");

    screenHost.setAttribute("data-motion-orientation-target", "screen-host");
    screenHost.setAttribute("data-motion-orientation-state", motion.state);
    screenHost.setAttribute("data-motion-orientation-id", id);
    screenHost.setAttribute("data-motion-orientation-from", from);
    screenHost.setAttribute("data-motion-orientation-to", to);
    screenHost.setAttribute("data-motion-orientation-sequence", String(motion.sequence || 0));

    clearViewportOrientationRoleTargets(screenHost);
    viewportOrientationRoleTargets(screenHost).forEach(({ element, role }) => {
      element.setAttribute("data-motion-orientation-role", role);
      element.setAttribute("data-motion-orientation-state", motion.state);
      element.setAttribute("data-motion-orientation-id", id);
      element.setAttribute("data-motion-orientation-from", from);
      element.setAttribute("data-motion-orientation-to", to);
      element.setAttribute("data-motion-orientation-sequence", String(motion.sequence || 0));
    });
  }

  function startViewportOrientationMotion(root, screenHost, appState, motionController, previousSnapshot, nextSnapshot) {
    if (!root || !screenHost || !previousSnapshot || !nextSnapshot) return;
    clearViewportOrientationMotionTimer(appState);
    const reduced = root.getAttribute("data-motion-reduced") === "true";
    const sequence = (appState.viewportOrientationMotionSequence || 0) + 1;
    appState.viewportOrientationMotionSequence = sequence;
    const motion = {
      state: "preparing",
      from: previousSnapshot,
      to: nextSnapshot,
      sequence,
      settled: false
    };
    appState.viewportOrientationMotion = motion;

    const runState = (state) => {
      if (appState.viewportOrientationMotion !== motion || motion.sequence !== appState.viewportOrientationMotionSequence) {
        return false;
      }
      motion.state = state;
      motion.settled = state === "settled";
      applyViewportOrientationMotionAttributes(root, screenHost, appState, motion);
      if (state !== "settled" && motionController) {
        const id = viewportOrientationMotionId(state);
        motionController.start({
          id,
          action: state === "preparing" ? "orientation-prepare" : state === "settling" ? "orientation-settle" : "orientation-reshape",
          from: viewportSnapshotLabel(previousSnapshot),
          to: viewportSnapshotLabel(nextSnapshot),
          duration: reduced ? 0 : id === "viewport.orientation.prepare" ? 80 : 240
        });
      }
      return true;
    };

    runState("preparing");
    if (reduced) {
      runState("reshaping");
      runState("settling");
      runState("settled");
      return;
    }

    appState.viewportOrientationMotionTimer = window.setTimeout(() => {
      if (!runState("reshaping")) return;
      adjustReaderDropdownPlacement(screenHost);
      attachReaderControlDockMotionState(screenHost, appState, motionController);
      appState.viewportOrientationMotionTimer = window.setTimeout(() => {
        if (!runState("settling")) return;
        appState.viewportOrientationMotionTimer = window.setTimeout(() => {
          runState("settled");
        }, 240);
      }, 240);
    }, 80);
  }

  function clearReaderSessionCapsuleTimer(appState) {
    if (appState?.readerSessionCapsuleTimer) {
      window.clearTimeout(appState.readerSessionCapsuleTimer);
      appState.readerSessionCapsuleTimer = null;
    }
  }

  function scheduleReaderSessionCapsuleTick(screenHost, appState, data, renderCurrentRoute) {
    clearReaderSessionCapsuleTimer(appState);
    const capsule = screenHost?.querySelector?.("[data-reader-immersive-status]") || null;
    const controlSpace = screenHost?.querySelector?.("[data-reader-control-space]") || null;
    const snapshot = readerSessionCapsuleSnapshot(appState);
    if (!(capsule || controlSpace) || !snapshot || snapshot.type !== "autoPage" || !snapshot.playing) {
      return;
    }
    appState.readerSessionCapsuleTimer = window.setTimeout(() => {
      appState.readerSessionCapsuleTimer = null;
      const currentCountdown = Math.max(1, Math.min(99, Number(appState.readerAutoPageCountdown || 8)));
      if (currentCountdown > 1) {
        appState.readerAutoPageCountdown = currentCountdown - 1;
      } else {
        const pages = readerPages(data, appState);
        const pageCount = pages.length;
        const currentIndex = Number.isFinite(Number(appState.readerPageIndex)) ? Number(appState.readerPageIndex) : 0;
        appState.readerPageIndex = clamp(currentIndex + 1, 0, Math.max(0, pageCount - 1));
        appState.readerTurnDirection = "next";
        appState.readerAutoPageCountdown = 8;
      }
      renderCurrentRoute();
    }, 1000);
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
    const autoPageSession = Boolean(appState?.readerAutoPageSession || appState?.readerSettings?.autoPage);
    const chapterState = data ? currentReaderChapter(data, appState) : { index: 0, count: 1, chapter: {} };
    const panels = {
      search: {
        title: "内容搜索",
        meta: "仅在当前书籍正文内定位结果",
        hideHeader: true,
        className: "fd-reader-search-quick-panel fd-reader-action-quick-panel",
        body: `
          <div class="fd-reader-search-panel fd-reader-quick-action-panel">
            <header class="fd-reader-quick-toolbar" aria-label="内容搜索操作">
              <button class="fd-reader-quick-back" type="button" data-route="reader" aria-label="返回阅读控制首页">
                ${icon("back", "fd-small-icon")}<span>返回</span>
              </button>
              <button class="fd-reader-quick-action" type="button" data-reader-search-submit aria-label="搜索当前输入内容">搜索</button>
            </header>
            <label class="fd-reader-panel-search fd-reader-search-field">${icon("search", "fd-small-icon")}<span>雨夜</span></label>
            <div class="fd-reader-search-result-list fd-reader-module-list" aria-label="内容搜索结果">
              <button type="button" data-route="immersive-reading"><strong>第 32 章 雨夜</strong><small>雨夜的风格外冷 · 当前结果 1/2</small></button>
              <button type="button" data-route="immersive-reading"><strong>第 33 章 灯塔</strong><small>雨夜之后，远处灯塔亮起 · 结果 2/2</small></button>
            </div>
          </div>`
      },
      "auto-page": {
        title: "自动翻页",
        meta: "启动后进入沉浸阅读，底部胶囊控制暂停继续",
        hideHeader: true,
        className: "fd-reader-auto-page-quick-panel",
        body: `
          <div class="fd-reader-auto-panel">
            <header class="fd-reader-auto-toolbar" aria-label="自动翻页操作">
              <button class="fd-reader-auto-back" type="button" data-route="reader" aria-label="返回阅读控制首页">
                ${icon("back", "fd-small-icon")}<span>返回</span>
              </button>
              <button class="fd-reader-auto-stop ${autoPageSession ? "" : "is-disabled"}" type="button"${autoPageSession ? ` data-reader-session-stop="autoPage"` : ` aria-disabled="true"`}>
                停止自动翻页
              </button>
            </header>
            <section class="fd-reader-auto-control" aria-label="自动翻页控制">
              <button class="fd-reader-auto-chapter" type="button" data-reader-chapter-action="prev" aria-label="上一章" aria-disabled="${chapterState.index === 0 ? "true" : "false"}">
                <span class="fd-reader-auto-chevrons is-prev" aria-hidden="true">${icon("chevron-left", "fd-small-icon")}${icon("chevron-left", "fd-small-icon")}</span><span>上一章</span>
              </button>
              <button class="fd-reader-auto-toggle ${autoPageEnabled ? "is-on" : ""}" type="button" data-reader-setting-toggle="autoPage" aria-pressed="${autoPageEnabled ? "true" : "false"}">
                <i>${icon(autoPageEnabled ? "pause" : "play", "fd-small-icon")}</i>
                <strong>自动翻页</strong>
              </button>
              <button class="fd-reader-auto-chapter" type="button" data-reader-chapter-action="next" aria-label="下一章" aria-disabled="${chapterState.index >= chapterState.count - 1 ? "true" : "false"}">
                <span class="fd-reader-auto-chevrons is-next" aria-hidden="true">${icon("chevron", "fd-small-icon")}${icon("chevron", "fd-small-icon")}</span><span>下一章</span>
              </button>
            </section>
            <div class="fd-reader-step-row fd-reader-auto-speed" aria-label="翻页速度"><strong>翻页速度</strong><span><button type="button" aria-label="减慢自动翻页">-</button><em>8 秒</em><button type="button" aria-label="加快自动翻页">+</button></span></div>
            <div class="fd-reader-segment-row fd-reader-auto-mode" aria-label="自动翻页方式"><button class="is-active" type="button">连续</button><button type="button">单页</button></div>
          </div>`
      },
      replace: {
        title: "内容替换",
        hideHeader: true,
        className: "fd-replace-quick-panel fd-reader-action-quick-panel",
        body: `
          <div class="fd-reader-replace-panel fd-reader-quick-action-panel">
            <header class="fd-reader-quick-toolbar" aria-label="内容替换操作">
              <button class="fd-reader-quick-back" type="button" data-route="reader" aria-label="返回阅读控制首页">
                ${icon("back", "fd-small-icon")}<span>返回</span>
              </button>
            </header>
            <div class="fd-replace-rule-list fd-replace-toggle-list" aria-label="内容替换规则开关">
              ${readerReplacementRules(appState).map((rule) => `
                <button class="fd-replace-rule-row fd-replace-toggle-row ${rule.enabled ? "is-on" : ""}" type="button" data-reader-replace-rule="${esc(rule.id)}" aria-pressed="${rule.enabled ? "true" : "false"}">
                  <strong>${esc(rule.title)}</strong>
                  <span class="fd-replace-switch ${rule.enabled ? "is-on" : ""}" aria-hidden="true"><i></i></span>
                </button>
              `).join("")}
            </div>
          </div>
        `
      }
    };
    const panel = panels[type];
    if (!panel) return "";
    return `
        <section class="fd-reader-module-panel fd-reader-quick-detail ${panel.hideHeader ? "fd-reader-quick-no-header" : ""} ${panel.className || ""}" data-dev-region="ReaderQuickPanel" aria-label="${esc(panel.title)}">
        ${panel.headerHtml || (panel.hideHeader ? "" : `<header>
          <span><strong>${esc(panel.title)}</strong><small>${esc(panel.meta)}</small></span>
          <button type="button" data-route="reader">关闭</button>
        </header>`)}
        ${panel.body}
      </section>`;
  }

  function readerModulePanel(type, appState, data) {
    if (type === "directory") {
      const tocMode = readerTocMode(appState);
      const currentChapterState = currentReaderChapter(data, appState);
      const chapters = readerChapters(data);
      const visibleItems = (tocMode === "bookmark" ? chapters.filter((chapter) => chapterHasMarker(chapter, "书签")) : chapters).slice(0, 6);
      const listHtml = visibleItems.map((chapter) => {
        const chapterIndex = Math.max(0, chapters.indexOf(chapter));
        return `
            <article class="fd-reader-toc-row fd-reader-full-toc-row${chapterIndex === currentChapterState.index ? " is-current" : ""}" role="button" tabindex="0" data-reader-directory-index="${chapterIndex}">
              <strong>${esc(chapter.title)}</strong>
              ${chapterMarkerSlots(chapter, appState, { book: data.library.book, chapterIndex })}
            </article>`;
      }).join("");
      return `
        <section class="fd-reader-module-panel fd-reader-toc-panel" data-dev-region="ReaderModulePanel" aria-label="目录与书签">
          <div class="fd-reader-toc-list fd-reader-full-toc-list">
            ${readerTocSwitchHtml(tocMode, "fd-reader-toc-switch-row fd-reader-full-toc-switch-row")}
            ${listHtml}
          </div>
        </section>`;
    }
    if (type === "tts") {
      const tts = appState.readerTts || {};
      const ttsConfig = readerTtsConfig(data);
      const ttsDefaults = ttsConfig.defaults;
      const ttsOptions = ttsConfig.options;
      const ttsSession = Boolean(appState?.readerTtsSession || tts.playing);
      return `
        <section class="fd-reader-module-panel fd-reader-tts-panel" data-dev-region="ReaderModulePanel" aria-label="朗读">
          <header class="fd-reader-tts-toolbar" aria-label="朗读操作">
            <strong class="fd-reader-module-title">朗读</strong>
            <button class="fd-reader-tts-stop ${ttsSession ? "" : "is-disabled"}" type="button"${ttsSession ? ` data-reader-session-stop="tts"` : ` aria-disabled="true"`}>
              停止朗读
            </button>
          </header>
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
      return `
        <section class="fd-reader-module-panel fd-reader-appearance-panel" data-dev-region="ReaderModulePanel" aria-label="阅读外观">
          <div class="fd-reader-appearance-list fd-reader-module-list">
            <section class="fd-reader-full-setting-block fd-reader-appearance-quick-theme">
              <header><strong>阅读主题</strong></header>
              <div class="fd-reader-full-theme-grid">
                ${quickThemes.map((item, index) => `
                  <button class="${activeTheme.value === item.value ? "is-active" : ""}" type="button" data-reader-theme="${esc(item.value)}" data-reader-theme-scheme="${esc(item.scheme || (index < 2 ? "day" : "night"))}" data-reader-theme-texture="${esc(item.texture || "plain")}" aria-label="${esc(item.scheme === "night" ? "夜晚" : "白天")}${item.texture === "paper" ? "纹理" : "纯色"}主题：${esc(item.label)}">
                    <span style="--swatch:${esc(item.swatch)};--swatch-texture-rgb:${esc(item.textureRgb || (item.scheme === "night" ? "222 202 174" : "138 116 84"))}"></span>
                  </button>
                `).join("")}
              </div>
            </section>
            <section class="fd-reader-full-setting-block fd-reader-full-typography fd-reader-appearance-quick-typography">
              <header><strong>文字排版</strong></header>
              ${quickTypographyPanelRows(data, typography)}
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
    const tocMode = readerTocMode(appState);
    const currentChapterState = currentReaderChapter(data, appState);
    const chapters = readerChapters(data);
    const visibleItems = tocMode === "bookmark" ? chapters.filter((chapter) => chapterHasMarker(chapter, "书签")) : chapters;
    return `
      <section class="fd-reader-full-section fd-reader-full-directory" aria-label="完整目录">
        ${readerTocSwitchHtml(tocMode, "fd-reader-full-toc-switch-row")}
        <div class="fd-reader-full-toc-list">
          ${visibleItems.map((chapter) => {
            const chapterIndex = Math.max(0, chapters.indexOf(chapter));
            return `
              <article class="fd-reader-full-toc-row${chapterIndex === currentChapterState.index ? " is-current" : ""}" role="button" tabindex="0" data-reader-directory-index="${chapterIndex}">
                <strong>${esc(chapter.title)}</strong>
                ${chapterMarkerSlots(chapter, appState, { book: data.library.book, chapterIndex })}
              </article>`;
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
    const pageSpace = appState?.readerPageSpace || normalizeReaderPageSpace(data);
    const activeTheme = currentReaderTheme(data, appState);
    return `
      <section class="fd-reader-full-section fd-reader-full-appearance" aria-label="完整界面设置">
        <section class="fd-reader-full-setting-block">
          <header><strong>阅读主题</strong></header>
          <div class="fd-reader-full-theme-grid">
            ${readerThemeOptions(data).map((item, index) => `
              <button class="${activeTheme.value === item.value ? "is-active" : ""}" type="button" data-reader-theme="${esc(item.value)}" data-reader-theme-scheme="${esc(item.scheme || (index < 4 ? "day" : "night"))}" data-reader-theme-texture="${esc(item.texture || "plain")}" data-reader-theme-pair="${esc(item.pair || "")}" aria-label="${esc((item.scheme || (index < 4 ? "day" : "night")) === "night" ? "夜晚" : "白天")}${item.texture === "paper" ? "纹理" : "纯色"}主题：${esc(item.label)}">
                <span style="--swatch:${esc(item.swatch)};--swatch-texture-rgb:${esc(item.textureRgb || ((item.scheme || (index < 4 ? "day" : "night")) === "night" ? "222 202 174" : "138 116 84"))}"></span>
              </button>
            `).join("")}
          </div>
        </section>
        <section class="fd-reader-full-setting-block fd-reader-full-typography">
          <header><strong>文字排版</strong></header>
          ${typographyPanelRows(data, typography)}
        </section>
        <section class="fd-reader-full-setting-block fd-reader-full-page-space">
          <header><strong>页面空间</strong><em>边距 / 缩进</em></header>
          ${readerPageSpaceRows(data, pageSpace)}
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
        <button class="fd-reader-full-grabber" type="button" data-route="${esc(quickRoute)}" data-route-replace${promotedRoute ? ` data-reader-handle-expand-route="${esc(promotedRoute)}"` : ""} aria-label="${promotedRoute ? "下拉收起，上拉继续展开" : "收起到阅读控制层"}"></button>
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

  function readerSessionControlSpaceHtml(appState) {
    const snapshot = readerSessionCapsuleSnapshot(appState);
    if (!snapshot) return "";
    return `
        <section class="fd-reader-control-session-host" data-reader-control-session-host aria-label="运行会话胶囊">
          ${readerImmersiveStatusCapsule(appState, { controlLayer: true })}
        </section>`;
  }

  function readerControlMain(data, appState) {
    const chapter = data.reader.chapterProgress || {};
    const chapterProgressConfig = readerChapterProgressConfig(data);
    const chapterState = currentReaderChapter(data, appState);
    const chapterProgress = readerChapterProgressValue(data, appState);
    const chapterTitle = chapterState.chapter.title || chapter.title || "第 32 章 雨夜";
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
            <small class="fd-reader-book-progress" title="书籍进度 ${esc(chapterProgress)}%" aria-label="书籍进度 ${esc(chapterProgress)}%">${esc(chapterProgress)}%</small>
            <button class="fd-reader-progress" type="button" style="--progress:${esc(pct(`${chapterProgress}%`))}" data-reader-chapter-progress aria-label="调整书籍进度" aria-valuemin="${esc(chapterProgressConfig.min)}" aria-valuemax="${esc(chapterProgressConfig.max)}" aria-valuenow="${esc(chapterProgress)}">
              <i><b></b></i>
            </button>
            <span class="fd-reader-total-chapters" title="总章节 ${esc(totalChapterCount)} 章" aria-label="总章节 ${esc(totalChapterCount)} 章">共 ${esc(totalChapterCount)} 章</span>
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
      frameStyle: readerThemeStyle(data, appState),
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
      frameStyle: readerThemeStyle(data, appState),
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
      frameStyle: readerThemeStyle(data, appState),
      readingSurfaceClass: "fd-reading-surface",
      overlayClass: `fd-reader-overlay${isImmersive ? " fd-immersive-overlay" : ""}`,
      bottomSheetHostClass: isImmersive ? "fd-reader-sheet fd-reader-sheet-empty" : "fd-reader-sheet",
      moduleNavClass: isImmersive ? "fd-reader-module-nav fd-reader-module-nav-empty" : "fd-reader-module-nav",
      stateHostClass: "fd-reader-state-host",
      stateHostHtml: `<div class="fd-reader-global-brightness-dim" data-reader-brightness-dim aria-hidden="true" style="${readerBrightnessStyle(data, appState)}"></div>`,
      ariaLabel: (routes[route] || routes.reader).title,
      readingSurfaceHtml: sharedReaderSurface(data, isImmersive ? "" : "immersive-reading", appState),
      overlayHtml: isImmersive ? `${readerInfoOverlay(data, appState)}${readerTextSelectionLayer(appState)}${readerTapZones(data, appState)}` : `${readerTopOverlay(data, appState)}${readerSessionControlSpaceHtml(appState)}`,
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
              { type: "switch", icon: "refresh", title: "自动检查更新", enabled: true },
              { type: "switch", icon: "top", title: "点击当前底栏回顶部", enabled: true },
              { type: "switch", icon: "motion", title: "减少动态效果", enabled: true },
              { type: "switch", icon: "bug", title: "崩溃日志", enabled: true, status: "已开启", statusTone: "good" },
              { type: "select", icon: "play", title: "动画效果", value: "标准", options: ["减少", "标准", "增强"] },
              { type: "cache-cleanup", icon: "trash", title: "缓存清理", actionLabel: "清理缓存", overlay: "dialog:cache-clear" }
            ]
          },
          {
            title: "系统权限",
            rows: [
              { type: "link", icon: "folder", title: "文件访问", status: "已授权", statusTone: "good", actionLabel: "去设置", overlay: "dialog:file-access-permission" },
              { type: "link", icon: "bell", title: "通知权限", status: "未授权", statusTone: "warn", actionLabel: "去设置", overlay: "dialog:notification-permission" },
              { type: "link", icon: "battery", title: "电池优化", status: "受系统管理", statusTone: "info", actionLabel: "去设置", overlay: "dialog:battery-permission" }
            ]
          }
        ],
        actions: [{ tone: "danger", icon: "refresh", title: "恢复默认", overlay: "dialog" }],
        confirm: { title: "恢复通用设置？", copy: "恢复后将重置 App 主题、语言、启动页面和行为偏好。", confirmLabel: "确认恢复" },
        confirms: {
          "cache-clear": { title: "清理缓存？", copy: "将清除封面、章节和临时文件缓存，不会删除书籍与阅读进度。", confirmLabel: "确认清理", resultToast: "已清理 1.28 GB 缓存" },
          "file-access-permission": { title: "打开文件访问设置？", copy: "将跳转到系统设置中的文件访问权限，用于管理本地文件和媒体访问。", confirmLabel: "去设置" },
          "notification-permission": { title: "打开通知权限设置？", copy: "将跳转到系统设置中的通知权限，用于开启或关闭阅读提醒。", confirmLabel: "去设置" },
          "battery-permission": { title: "打开电池优化设置？", copy: "将跳转到系统设置中的电池优化页面，用于管理后台运行策略。", confirmLabel: "去设置" }
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
              { type: "switch", icon: "badge", title: "显示更新标记", enabled: true }
            ]
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
              { type: "switch", icon: "people", title: "合并同名同作者", enabled: true },
              { type: "switch", icon: "clock", title: "搜索历史", enabled: true },
              { type: "select", icon: "list", title: "搜索历史数量", value: "20条", options: ["10条", "20条", "50条"] }
            ]
          }
        ],
        actions: [{ tone: "danger", icon: "trash", title: "清空搜索历史", overlay: "dialog" }],
        confirm: { title: "清空搜索历史？", copy: "清空后无法恢复，已保存的搜索关键词会被移除。", confirmLabel: "确认清空" }
      },
      "about-feedback": {
        title: "关于与反馈",
        sections: [
          {
            title: "项目信息",
            rows: [
              { type: "link", icon: "refresh", title: "检查更新", value: "已是最新" },
              { type: "link", icon: "code", title: "源码仓库" },
              { type: "link", icon: "link", title: "开源许可" },
              { type: "link", icon: "mail", title: "参与贡献" }
            ]
          }
        ]
      },
      "sync-backup": {
        title: "同步与备份",
        sections: [
          {
            title: "WebDAV 配置",
            layout: "webdav-form",
            rows: [
              { type: "input", inputType: "url", icon: "link", title: "服务器地址", value: "https://dav.example.com/reader/backup", placeholder: "https://example.com/dav" },
              { type: "input", inputType: "text", icon: "people", title: "账号", value: "reader@example.com", placeholder: "请输入账号" },
              { type: "input", inputType: "password", icon: "shield", title: "密码", value: "reader-demo-password", placeholder: "请输入密码" },
              { type: "input", inputType: "text", icon: "folder", title: "同步目录", value: "/ReaderBackup/ReaderAndroid", placeholder: "/ReaderBackup" }
            ],
            actions: [
              { icon: "refresh", title: "测试网络连通性", overlay: "dialog:webdav-test" },
              { icon: "check", title: "保存配置", overlay: "dialog:webdav-save" }
            ]
          },
          {
            title: "恢复数据",
            layout: "backup-list",
            backups: [
              { group: "最近备份", icon: "cloud", source: "WebDAV", title: "自动备份", time: "2026-06-23 08:00", type: "完整备份", size: "12.8 MB", device: "Mac mini · 自动同步", includes: "书架、进度、设置、书源", badge: "最新", tone: "good", scopes: ["bookshelf", "progress", "settings", "sources"], restoreRecord: "WebDAV · 2026-06-23 08:00 · 完整备份" },
              { group: "最近备份", icon: "folder", source: "本地", title: "手动备份", time: "2026-06-23 10:30", type: "完整备份", size: "12.8 MB", device: "本机文件", includes: "书架、进度、设置、书源", badge: "本机", tone: "info", scopes: ["bookshelf", "progress", "settings", "sources"], restoreRecord: "本地 · 2026-06-23 10:30 · 完整备份" },
              { group: "历史备份", icon: "cloud", source: "WebDAV", title: "夜间备份", time: "2026-06-21 22:30", type: "书架与设置", size: "8.6 MB", device: "远程备份", includes: "书架、分组、设置", badge: "局部", tone: "warn", scopes: ["bookshelf", "settings"], restoreRecord: "WebDAV · 2026-06-21 22:30 · 书架与设置" },
              { group: "历史备份", icon: "cloud", source: "WebDAV", title: "周备份", time: "2026-06-16 02:00", type: "完整备份", size: "12.1 MB", device: "远程备份", includes: "书架、进度、设置、书源", badge: "历史", tone: "muted", scopes: ["bookshelf", "progress", "settings", "sources"], restoreRecord: "WebDAV · 2026-06-16 02:00 · 完整备份" },
              { group: "历史备份", icon: "folder", source: "本地", title: "阅读进度快照", time: "2026-06-20 09:40", type: "阅读进度", size: "2.4 MB", device: "本机文件", includes: "阅读进度", badge: "进度", tone: "muted", scopes: ["progress"], restoreRecord: "本地 · 2026-06-20 09:40 · 阅读进度" },
              { group: "历史备份", icon: "cloud", source: "WebDAV", title: "迁移前备份", time: "2026-06-12 18:10", type: "书源配置", size: "1.6 MB", device: "远程备份", includes: "书源、分组", badge: "配置", tone: "muted", scopes: ["sources"], restoreRecord: "WebDAV · 2026-06-12 18:10 · 书源配置" }
            ]
          }
        ],
        confirms: {
          "webdav-test": { title: "测试网络连通性？", copy: "将使用当前服务器地址和账号发起一次连接验证。", confirmLabel: "开始测试" },
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
              { type: "input", inputType: "url", icon: "link", title: "服务器地址", value: "https://dav.example.com/reader/backup", placeholder: "https://example.com/dav" },
              { type: "input", inputType: "text", icon: "people", title: "账号", value: "reader@example.com", placeholder: "请输入账号" },
              { type: "input", inputType: "password", icon: "shield", title: "密码", value: "reader-demo-password", placeholder: "请输入密码" },
              { type: "input", inputType: "text", icon: "folder", title: "同步目录", value: "/ReaderBackup/ReaderAndroid", placeholder: "/ReaderBackup" }
            ],
            actions: [
              { icon: "refresh", title: "测试网络连通性", overlay: "dialog:webdav-test" },
              { icon: "check", title: "保存配置", overlay: "dialog:webdav-save" }
            ]
          }
        ],
        confirms: {
          "webdav-test": { title: "测试网络连通性？", copy: "将使用当前服务器地址和账号发起一次连接验证。", confirmLabel: "开始测试" },
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
              { type: "action", icon: "refresh", title: "检测", actionLabel: "开始检测" },
              { type: "action", icon: "info", title: "详情", actionLabel: "查看", route: "source-detail" },
              { type: "action", icon: "edit", title: "编辑", actionLabel: "编辑", overlay: "edit" },
              { type: "action", icon: "log", title: "错误日志", actionLabel: "查看", overlay: "log" },
              { type: "switch", icon: "source", title: "启用开关", enabled: true, overlay: "dialog" }
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
    return `<span class="fd-settings-badge is-${esc(tone || "muted")}" title="${esc(label)}" aria-label="${esc(label)}"><i aria-hidden="true"></i></span>`;
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
    const actionOverlay = row.type === "cache-cleanup" && row.overlay ? ` data-settings-overlay="${esc(row.overlay)}"` : "";
    const action = row.actionLabel ? `<button class="fd-settings-row-action" type="button"${actionOverlay}>${esc(row.actionLabel)}</button>` : "";
    const chevron = row.options || ["link", "select", "danger"].includes(row.type) ? `<span class="fd-settings-trailing-icon">${icon("chevron", "fd-small-icon")}</span>` : "";
    return `${status}${selector}${stepper}${value}${action}${toggle}${chevron}`;
  }

  function settingsRowSideKind(row) {
    if (row.type === "switch") return "switch";
    if (row.type === "stepper") return "stepper";
    if (row.status && row.actionLabel) return "rich";
    if (row.type === "cache-cleanup" || row.actionLabel) return "action";
    if (row.status) return "status";
    if (row.value || row.options) return "value";
    if (row.route || row.overlay || row.type === "link" || row.type === "select" || row.type === "danger") return "icon";
    return "compact";
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
    const overlayAttr = row.overlay && row.type !== "cache-cleanup" ? ` data-settings-overlay="${esc(row.overlay)}"` : row.options ? ` data-settings-option-key="${esc(key)}"` : row.route ? ` data-route="${esc(row.route)}"` : "";
    const restoreRecordAttr = row.restoreRecord ? ` data-restore-record="${esc(row.restoreRecord)}"` : "";
    return `
      <article class="fd-setting-row${row.type ? ` is-${esc(row.type)}` : ""}${row.tone === "danger" ? " is-danger" : ""}${optionOpen ? " is-option-open" : ""}"${overlayAttr}${restoreRecordAttr} role="${overlayAttr ? "button" : "group"}" tabindex="${overlayAttr ? "0" : "-1"}">
        <span>${icon(row.icon || "settings", "fd-small-icon")}</span>
        <strong>${esc(row.title)}${row.meta ? `<small>${esc(row.meta)}</small>` : ""}</strong>
        <em class="fd-settings-row-side is-${settingsRowSideKind(row)}">${settingsRowSide(row)}</em>
        ${settingsOptionDropdownHtml(row, route, appState)}
      </article>`;
  }

  function settingsBackupListHtml(section) {
    const backups = section.backups || [];
    let currentGroup = "";
    return `
      <div class="fd-settings-backup-list" aria-label="${esc(section.title)}备份列表">
        ${section.summary ? `<p>${esc(section.summary)}</p>` : ""}
        ${backups.map((backup) => {
          const groupLabel = backup.group && backup.group !== currentGroup ? backup.group : "";
          if (groupLabel) currentGroup = backup.group;
          const scopes = (backup.scopes || []).join(",");
          const backupContent = backup.content || backup.includes || backup.type || "";
          return `
            ${groupLabel ? `<h3>${esc(groupLabel)}</h3>` : ""}
            <article class="fd-settings-backup-card" role="button" tabindex="0" data-route="restore-confirm" data-restore-record="${esc(backup.restoreRecord || `${backup.source} · ${backup.time} · ${backup.type}`)}" data-restore-scopes="${esc(scopes)}">
              <span>${icon(backup.icon || "cloud", "fd-small-icon")}</span>
              <strong>
                ${esc(backup.source || "")}
                <small>${esc(backup.time || "")}</small>
                <small>${esc(backupContent)}</small>
              </strong>
              <em>${chevron("fd-small-icon")}</em>
            </article>`;
        }).join("")}
      </div>`;
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

  function settingsSectionHtml(section, route, appState) {
    const sectionBody = section.layout === "backup-list"
      ? settingsBackupListHtml(section)
      : (section.rows || []).map((row) => settingsRowHtml(row, route, appState)).join("");
    return `
      <section class="fd-setting-section${section.layout ? ` is-${esc(section.layout)}` : ""}" data-slot="settingSection">
        <h2>${esc(section.title)}</h2>
        ${sectionBody}
        ${settingsSectionActionsHtml(section.actions)}
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
            ${icon("source-stack", "fd-small-icon")}
            <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
            <em class="fd-settings-source-state">${settingsBadge(item.status, item.tone)}</em>
            <span class="fd-settings-source-toggle-state">${settingsSwitch(item.enabled)}</span>
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
      <section class="fd-demo-sheet fd-settings-option-sheet" aria-hidden="false" data-demo-sheet data-settings-overlay-panel="sheet">
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
    const confirmResult = confirm.resultToast ? ` data-settings-confirm-result="${esc(confirm.resultToast)}"` : "";
    return `
      <section class="fd-demo-dialog fd-settings-confirm-dialog" aria-hidden="false" data-demo-dialog data-settings-overlay-panel="dialog">
        <h2>${esc(confirm.title)}</h2>
        <p>${esc(confirm.copy)}</p>
        <div>
          <button type="button" data-close-settings-overlay>${esc(confirm.cancelLabel || "取消")}</button>
          <button type="button" data-close-settings-overlay${confirmResult}>${esc(confirm.confirmLabel || "确认")}</button>
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
    const toastMessage = appState?.settingsToast || page.toast || "";
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
      toastHtml: toastMessage ? `<section class="fd-settings-toast">${esc(toastMessage)}</section>` : "",
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

  const restoreScopeCatalog = [
    { key: "bookshelf", icon: "bookshelf", title: "书架与分组", meta: "恢复书架书籍、分组和排序", impact: "128 本书 · 12 个分组" },
    { key: "progress", icon: "clock", title: "阅读进度", meta: "恢复章节位置和阅读进度", impact: "96 条阅读进度" },
    { key: "settings", icon: "settings", title: "阅读与 App 设置", meta: "恢复主题、排版和通用设置", impact: "主题、排版、通用设置" },
    { key: "sources", icon: "source", title: "书源配置", meta: "恢复书源、分组和启用状态", impact: "12 个书源 · 4 个分组" }
  ];

  function restoreDefaultScopeKeys() {
    return restoreScopeCatalog.map((item) => item.key);
  }

  function restoreAvailableScopeKeys(appState) {
    const keys = Array.isArray(appState?.restoreAvailableScopes) && appState.restoreAvailableScopes.length
      ? appState.restoreAvailableScopes
      : restoreDefaultScopeKeys();
    return keys.filter((key) => restoreScopeCatalog.some((item) => item.key === key));
  }

  function restoreSelectedScopeKeys(appState) {
    const available = restoreAvailableScopeKeys(appState);
    const selected = Array.isArray(appState?.restoreSelectedScopes) && appState.restoreSelectedScopes.length
      ? appState.restoreSelectedScopes
      : available;
    return selected.filter((key) => available.includes(key));
  }

  function restoreScopeLabel(keys) {
    const selected = keys.length ? keys : restoreDefaultScopeKeys();
    return restoreScopeCatalog
      .filter((item) => selected.includes(item.key))
      .map((item) => item.title)
      .join("、");
  }

  function restoreScopeImpact(keys) {
    const selected = keys.length ? keys : restoreDefaultScopeKeys();
    const impacts = restoreScopeCatalog
      .filter((item) => selected.includes(item.key))
      .map((item) => item.impact);
    return impacts.length > 2 ? `${impacts.slice(0, 2).join(" · ")} 等 ${impacts.length} 项` : impacts.join(" · ");
  }

  function restoreScopeChoiceList(appState) {
    const available = restoreAvailableScopeKeys(appState);
    const selected = restoreSelectedScopeKeys(appState);
    return `
      <section class="fd-restore-card fd-restore-scope-card">
        <h2>选择恢复范围</h2>
        <p>只显示当前备份包含的数据类型。至少保留一项，开始恢复前可在这里调整。</p>
        <div class="fd-restore-scope-list" aria-label="恢复范围">
          ${restoreScopeCatalog.filter((item) => available.includes(item.key)).map((item) => {
            const isSelected = selected.includes(item.key);
            return `
              <button class="${isSelected ? "is-selected" : ""}" type="button" data-restore-scope="${esc(item.key)}" aria-pressed="${isSelected ? "true" : "false"}">
                ${icon(item.icon, "fd-small-icon")}
                <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
                ${settingsSwitch(isSelected)}
              </button>`;
          }).join("")}
        </div>
      </section>`;
  }

  function restoreFlowScreen(data, route, appState) {
    const restoreRecord = appState?.selectedRestoreRecord || "WebDAV · 2026-06-23 08:00 · 完整备份";
    const selectedScopes = restoreSelectedScopeKeys(appState);
    const scopeRows = [
      ["备份来源", restoreRecord],
      ["恢复范围", restoreScopeLabel(selectedScopes)],
      ["预计影响", restoreScopeImpact(selectedScopes)],
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
          ${restoreScopeChoiceList(appState)}
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
    const extraPhoneClass = options?.phoneClass ? ` ${options.phoneClass}` : "";
    const overlayPhoneClass = `${options?.sheetHtml ? " has-sheet" : ""}${options?.dialogHtml ? " has-dialog" : ""}`;
    return shellKit().renderSettingsShell(Object.assign(phoneShellClasses(`fd-settings-phone fd-source-demo-phone${extraPhoneClass}${overlayPhoneClass}`), {
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
      const actionAttr = action.action ? ` data-source-action="${esc(action.action)}"` : "";
      const ariaAttr = action.ariaLabel ? ` aria-label="${esc(action.ariaLabel)}"` : "";
      const classAttr = action.className ? ` class="${esc(action.className)}"` : "";
      return `<button${classAttr} type="button"${routeAttr}${replaceAttr}${actionAttr}${ariaAttr}>${action.icon ? icon(action.icon, "fd-small-icon") : ""}${esc(action.label)}</button>`;
    }).join("")}</div>`;
  }

  function sourceHomeBottomActions() {
    return sourceBottomActions([
      { label: "批量管理", route: "source-batch" },
      { label: "新增书源", route: "source-import-options" }
    ], "is-fixed");
  }

  function sourceBadge(item) {
    const status = item.status || "";
    if (!status) return "";
    return `<em class="fd-source-badge is-${esc(item.tone || "muted")}" title="${esc(status)}" aria-label="${esc(status)}"><i aria-hidden="true"></i></em>`;
  }

  function sourceSwitch(enabled, title) {
    return `<button class="fd-source-switch${enabled ? " is-on" : ""}" type="button" data-source-switch="${esc(title || "")}" aria-label="${esc(title || "书源")}${enabled ? "已启用，点击禁用" : "已禁用，点击启用"}" aria-pressed="${enabled ? "true" : "false"}"><i></i></button>`;
  }

  function sourceSearchAndFilters(appState) {
    const statusFilters = ["全部", "已启用", "异常", "未检测", "自定义"];
    const groupFilters = ["全部分组", "玄幻书源", "起点导入", "测试书源"];
    const activeStatus = appState?.sourceStatusFilter || "全部";
    const activeGroup = appState?.sourceGroupFilter || "全部分组";
    return `
      <label class="fd-source-search">${icon("search", "fd-small-icon")}<span>搜索书源名称或域名</span></label>
      <p class="fd-source-stat-line">12 个书源 · 8 个启用 · 4 个异常 · 10:30 检测</p>
      ${filterDisclosure({
        className: "fd-source-filter-control",
        label: "筛选",
        ariaLabel: "书源筛选",
        summary: `${activeStatus} · ${activeGroup}`,
        toggleAttr: "data-source-filter-toggle",
        open: Boolean(appState?.sourceFilterOpen),
        groups: [
          {
            title: "状态",
            options: statusFilters.map((item) => ({
              label: item,
              active: activeStatus === item,
              attrs: { "data-source-status-filter": item }
            }))
          },
          {
            title: "分组",
            options: groupFilters.map((item, index) => ({
              label: item,
              active: activeGroup === item,
              attrs: { "data-source-group-filter": item }
            }))
          }
        ]
      })}`;
  }

  function sourceRow(item, mode) {
    const isBatch = mode === "batch";
    const selected = Boolean(item.selected);
    return `
      <article class="fd-source-row${selected ? " is-selected" : ""}"${isBatch ? "" : ' role="button" tabindex="0" data-route="source-detail"'}>
        ${isBatch ? `<button class="fd-source-check${selected ? " is-checked" : ""}" type="button" data-source-select="${esc(item.title)}" aria-label="${esc(item.title)}${selected ? "已选择" : "未选择"}" aria-pressed="${selected ? "true" : "false"}">${selected ? icon("check", "fd-small-icon") : ""}</button>` : ""}
        <span class="fd-source-row-main"><strong>${esc(item.title)}</strong><small>${esc(item.domain)} · ${esc(item.group)}</small></span>
        <em class="fd-source-row-state">${sourceBadge(item)}</em>
        ${isBatch ? "" : `<button class="fd-source-row-test" type="button" data-route="source-detect" aria-label="检测 ${esc(item.title)}">检测</button>`}
        <span class="fd-source-row-toggle">${sourceSwitch(item.enabled, item.title)}</span>
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
        ${sourceSearchAndFilters(appState)}
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
      <section class="fd-demo-sheet fd-source-bottom-sheet" aria-label="添加书源" aria-hidden="false" data-demo-sheet>
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
        <div class="fd-source-batch-top"><button type="button" data-route="source-management">取消</button><strong>已选 3 个</strong><button type="button" data-source-select-all aria-pressed="false">全选</button></div>
        ${sourceSearchAndFilters(appState)}
        ${sourceList(sourceItems, "batch", appState)}
      </section>`, {
        bottomActionHtml: sourceBottomActions([
          { label: "启用", icon: "check", action: "enable-selected" },
          { label: "禁用", icon: "close", action: "disable-selected" },
          { label: "检测", icon: "activity", action: "detect-selected" },
          { label: "分组", icon: "folder", route: "source-groups", action: "group-selected" },
          { label: "删除", icon: "trash", route: "source-delete-confirm", className: "is-danger", action: "delete-selected", ariaLabel: "删除已选 3 个书源" }
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
      <section class="fd-source-home fd-source-batch fd-source-dialog-underlay" aria-hidden="true" inert>
        <div class="fd-source-batch-top"><button type="button" data-route="source-batch">取消</button><strong>已选 3 个</strong><button type="button" data-source-select-all aria-pressed="false">全选</button></div>
        ${sourceSearchAndFilters(appState)}
        ${sourceList(sourceItems, "batch", appState)}
      </section>`, {
        dialogHtml: `<section class="fd-demo-dialog fd-source-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="source-delete-title" aria-describedby="source-delete-desc" aria-hidden="false" data-demo-dialog data-source-delete-dialog><h2 id="source-delete-title">删除书源？</h2><p id="source-delete-desc">将删除已选 3 个书源。不会删除书架书籍，但这些书源将不再参与搜索、发现和换源。</p><label class="fd-source-delete-option"><input type="checkbox" data-source-delete-log-cleanup> <span>同时清除相关检测日志</span></label><div class="fd-source-delete-actions"><button type="button" data-route-back data-dialog-initial-focus>取消</button><button class="is-danger" type="button" data-route="source-management" data-route-replace data-source-delete-confirm>删除</button></div></section>`
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

  function motionReducedOverride() {
    try {
      const params = new URLSearchParams(window.location.search);
      const value = params.get("motionReduced") || params.get("reducedMotion");
      if (!value) return null;
      if (["1", "true", "reduce", "reduced"].includes(value)) return true;
      if (["0", "false", "no-preference", "off"].includes(value)) return false;
    } catch (error) {
      return null;
    }
    return null;
  }

  function applyMotionPreference(root, mediaQuery) {
    if (!root) return;
    const override = motionReducedOverride();
    const reduced = override == null ? Boolean(mediaQuery && mediaQuery.matches) : override;
    root.setAttribute("data-motion-reduced", reduced ? "true" : "false");
    root.setAttribute("data-motion-reduced-source", override == null ? "system" : "query");
  }

  function applyMotionSelectorBindings(root) {
    if (!root || typeof root.querySelectorAll !== "function") return;
    const bind = (selector, motionId) => {
      root.querySelectorAll(selector).forEach((element) => {
        if (element.closest("[inert]")) return;
        element.setAttribute("data-motion-id", motionId);
      });
    };

    bind("[data-route]", "app.route.push");
    bind("[data-route-back], [data-demo-back], .fd-back-bar button[aria-label='返回']", "app.route.pop");
    bind("[data-route='immersive-reading']:not([data-book-cover])", "reader.entry.actionToImmersive");
    bind("[data-nav-type]", "tab.item.switch");
    bind("[data-nav-type].is-active", "tab.item.select");
    bind("[data-bookshelf-view-button], [data-book-grid], [data-bookshelf-view]", "bookshelf.view.switch");
    bind("[data-bookshelf-filter-toggle]", "dropdown.trigger.press");
    bind("[data-bookshelf-group-option], [data-bookshelf-sort-option], [data-bookshelf-filter-option]", "dropdown.option.select");
    bind("[data-book-card]", "card.press/select/route");
    bind("[data-book-cover]", "reader.entry.coverToImmersive");
    bind("[data-close-book-focus], [data-book-focus-layer], [data-focus-cover], [data-focus-title], [data-focus-meta]", "card.select");
    bind("[data-bookshelf-more-layer]", "dropdown.menu.expand/collapse");
    bind("[data-close-bookshelf-more]", "dropdown.menu.collapse");
    bind("[data-open-keyboard]", "input.focus");
    bind("[data-close-keyboard]", "input.blur");
    bind("[data-keyboard-host]", "overlay.keyboard.enter/exit");
    bind("[data-keyboard-input]", "input.focus/blur");
    bind("[data-open-sheet]", "overlay.sheet.enter");
    bind("[data-close-sheet]", "overlay.sheet.exit");
    bind("[data-demo-sheet]", "overlay.sheet.enter/exit");
    bind("[data-open-dialog]", "overlay.dialog.enter");
    bind("[data-close-dialog]", "overlay.dialog.exit");
    bind("[data-demo-dialog]", "overlay.dialog.enter/exit");
    bind("[data-discover-entry]", "chip.item.select");
    bind("[data-source-select], .fd-source-check", "selection.item.toggle");
    bind("[data-source-select-all]", "selection.group.toggle");
    bind(".fd-source-batch-actions button, [data-source-action]", "selection.toolbar.action");
    bind("[data-source-delete-log-cleanup]", "selection.option.toggle");
    bind("[data-source-delete-confirm]", "destructive.confirm.commit");
    bind("[data-discover-filter], [data-rss-group-filter], [data-rss-manage-filter], [data-rss-category-filter], [data-rss-favorite-filter], [data-source-status-filter], [data-source-group-filter]", "filter.item.toggle");
    bind("[data-discover-reset], [data-filter-close]", "filter.apply.commit");
    bind("[data-filter-toggle], [data-bookshelf-filter-toggle], [data-discover-filter-toggle], [data-discover-sort-toggle], [data-rss-group-filter-toggle], [data-rss-manage-filter-toggle], [data-rss-category-filter-toggle], [data-rss-favorite-filter-toggle], [data-source-filter-toggle], [data-source-menu-toggle], [data-reader-more-toggle], [data-settings-option-key], [data-reader-setting-option-key], [data-reader-tts-option-key]", "dropdown.trigger.press");
    bind("[data-bookshelf-group-option], [data-bookshelf-sort-option], [data-bookshelf-filter-option], [data-discover-sort-option], [data-settings-option-choice], [data-settings-option-value], [data-reader-setting-option], [data-reader-tts-option], [data-reader-more-action], .fd-source-more-menu button, .fd-bookshelf-more-menu button, .fd-book-focus-menu button", "dropdown.option.select");
    bind(".fd-filter-menu, .fd-bookshelf-filter-popover, [data-discover-sort], .fd-discover-sort-popover, [data-settings-option-dropdown], [data-reader-setting-dropdown], [data-reader-tts-dropdown], [data-reader-more-layer], [data-bookshelf-more-layer], .fd-source-more-menu, .fd-bookshelf-more-menu, .fd-book-focus-menu", "dropdown.menu.expand/collapse");
    bind("[data-settings-overlay]", "overlay.dialog.enter/exit");
    bind("[data-close-settings-overlay]", "overlay.dialog.exit");
    bind("[data-settings-confirm-result], [data-main-tab-feedback]", "feedback.toast.enter/update/exit");
    bind("[data-search-submit], [data-primary-search-submit]", "input.submit");
    bind("[data-search-reset]", "input.clear");
    bind("[data-search-state]", "search.state.replace");
    bind("[data-add-search-shelf], [data-top-action], [data-book-action]", "button.activate");
    bind("[data-reader-setting-toggle], [data-source-switch], [data-restore-scope], [data-reader-brightness-auto], [data-reader-replace-rule]", "toggle.switch");
    bind("[data-reader-chapter-download]", "state.loading.inline");
    bind("[data-reader-session-stop]", "reader.session.capsule.exit");
    bind("[data-reader-brightness-track], [data-reader-chapter-progress]", "slider.drag.start/update/release");
    bind("[data-reader-typography-action], [data-reader-page-space-action]", "stepper.press/value.change");
    bind("[data-reader-typography-set], [data-reader-page-space-set], [data-reader-theme], [data-reader-theme-pair], [data-reader-theme-scheme], [data-reader-toc-mode]", "segment.item.switch");
    bind("[data-module]", "reader.module.switch");
    bind("[data-module].is-active", "tab.item.select");
    bind("[data-reader-typography-value], [data-reader-page-space-value], [data-reader-setting-value]:not([data-reader-setting-option]), [data-reader-tts-value]:not([data-reader-tts-option]), [data-reader-page-count], [data-reader-page-index], [data-reader-page-readout], [data-reader-pagination], [data-reader-current-chapter]", "state.content.replace");
    bind("[data-reader-page-action]", "reader.page.turn.next/prev");
    bind("[data-reader-chapter-action], [data-reader-directory-index]", "reader.chapter.jump");
    bind("[data-reader-dismiss]", "reader.control.hide");
    bind(".fd-reader-grabber, .fd-reader-full-grabber", "reader.control.handle.press");
    bind("[data-reader-handle-expand-route]", "reader.control.handle.release");
    bind("[data-reader-exit]", "app.route.pop");
    bind("[data-reader-loading]", "state.loading.inline");
    bind("[data-motion-async], [data-motion-async-state], [data-motion-async-request]", "motion.interrupt.completeThenReplace");
    bind("[data-reader-tts-action]", "reader.session.capsule.control.press/toggle");
    bind("[data-reader-tts-cycle]", "reader.session.capsule.update");
    bind("[data-reader-immersive-status], [data-reader-immersive-status-playing], [data-reader-immersive-status-type]", "reader.session.capsule.enter/update/exit");
    bind("[data-reader-capsule-control]", "reader.session.capsule.control.press/toggle");
    bind("[data-reader-capsule-countdown]", "reader.session.capsule.countdownTick");
    bind("[data-reader-capsule-voice]", "reader.session.capsule.voiceIcon.active");
    bind("[data-reader-capsule-label]", "reader.session.capsule.update");
    bind("[data-reader-control-space], [data-reader-control-space-type], [data-reader-control-space-playing]", "reader.session.controlSpace.enter/update/exit");
    bind("[data-reader-control-space-countdown], [data-reader-control-space-voice], [data-reader-control-space-control], [data-reader-control-space-label]", "reader.session.controlSpace.update");
    bind("[data-reader-more-action]", "dropdown.option.select");
    bind("[data-reader-more-close]", "dropdown.menu.collapse");
    bind("[data-reader-selection-layer]", "selection.range.show");
    bind("[data-reader-selection-action]", "selection.toolbar.action");
    bind("[data-reader-selection-close]", "selection.toolbar.exit");
    bind("[data-quick-action]", "reader.quick.promote");
    bind("[data-source-name]", "listRow.select");
    bind("[data-source-switch-window]", "reader.sourceSwitch.open/close");
    bind("[data-restore-record]", "card.route");
    bind("[data-restore-scopes], [data-settings-scope], [data-source-index]", "state.content.replace");
    bind("[data-width-class], [data-height-class], [data-orientation], [data-viewport-class], [data-viewport-width], [data-viewport-height]", "viewport.orientation.reshape");
    bind("[data-demo-mode-option], [data-demo-mode]", "segment.item.switch");
    bind("[data-capture-mode], [data-capture-route]", "tooling.mode.switch");

    root.querySelectorAll("[role='button']").forEach((element) => {
      if (!element.hasAttribute("data-motion-id")) {
        element.setAttribute("data-motion-id", "listRow.press");
      }
    });
  }

  function commonMotionFamily(motionId) {
    const id = String(motionId || "");
    if (id.startsWith("button.") || id === "destructive.confirm.commit" || id === "tooling.mode.switch") return "button";
    if (id.startsWith("toggle.") || id === "selection.option.toggle" || id === "selection.item.toggle" || id === "selection.group.toggle") return "toggle";
    if (id.startsWith("chip.") || id.startsWith("filter.") || id.startsWith("segment.") || id === "bookshelf.view.switch") return "choice";
    if (id.startsWith("slider.") || id.startsWith("stepper.") || id.includes("progress")) return "numeric";
    if (id.startsWith("input.") || id.startsWith("search.")) return "input";
    if (id.startsWith("feedback.") || id.startsWith("state.") || id.includes(".replace") || id.includes(".loading")) return "state";
    if (id.startsWith("selection.")) return "selection";
    if (id.startsWith("listRow.") || id.startsWith("card.")) return "surface";
    return "";
  }

  function commonMotionRole(element, motionId, family) {
    if (!element) return "item";
    if (element.matches?.("button")) return "button";
    if (element.matches?.("[role='button']")) return "row-button";
    if (element.matches?.("input, textarea, [contenteditable='true']")) return "field";
    if (element.hasAttribute("data-reader-brightness-track") || element.hasAttribute("data-reader-chapter-progress")) return "slider";
    if (motionId.startsWith("stepper.")) return "stepper";
    if (motionId.startsWith("feedback.")) return "feedback";
    if (family === "surface" && motionId.startsWith("card.")) return "card";
    if (family === "surface") return "row";
    return family || "item";
  }

  function commonMotionState(element, motionId, family) {
    if (!element) return "idle";
    if (element.disabled || element.getAttribute("aria-disabled") === "true") return "disabled";
    if (element.classList.contains("is-motion-pressed") || element.getAttribute("data-motion-pressed") === "true") return "pressed";
    if (element.getAttribute("aria-busy") === "true" || element.classList.contains("is-loading")) return "loading";
    if (element.getAttribute("aria-expanded") === "true" || element.classList.contains("is-open")) return "expanded";
    if (element.getAttribute("aria-pressed") === "true" || element.classList.contains("is-on")) return "on";
    if (element.getAttribute("aria-selected") === "true" || element.getAttribute("aria-current") === "true" || element.classList.contains("is-selected")) return "selected";
    if (element.classList.contains("is-active")) return family === "toggle" ? "on" : "active";
    if (family === "feedback" || family === "state") return element.textContent?.trim() ? "visible" : "idle";
    return "idle";
  }

  function commonMotionPhase(state) {
    if (state === "pressed") return "press";
    if (state === "loading") return "pending";
    if (state === "expanded" || state === "visible") return "entered";
    if (state === "on" || state === "active" || state === "selected") return "settled";
    return "idle";
  }

  function commonMotionValue(element) {
    if (!element) return "";
    if (element.hasAttribute("aria-valuenow")) return element.getAttribute("aria-valuenow") || "";
    if (element.hasAttribute("aria-pressed")) return element.getAttribute("aria-pressed") || "";
    if (element.hasAttribute("aria-selected")) return element.getAttribute("aria-selected") || "";
    if (element.hasAttribute("data-reader-setting-value")) return element.getAttribute("data-reader-setting-value") || "";
    if (element.hasAttribute("data-reader-tts-value")) return element.getAttribute("data-reader-tts-value") || "";
    return "";
  }

  function syncCommonMotionComponentState(element) {
    if (!element || !element.hasAttribute("data-motion-id")) return;
    const motionId = element.getAttribute("data-motion-id") || "";
    const family = commonMotionFamily(motionId);
    if (!family) return;
    const state = commonMotionState(element, motionId, family);
    element.setAttribute("data-motion-component", "true");
    element.setAttribute("data-motion-component-family", family);
    element.setAttribute("data-motion-component-role", commonMotionRole(element, motionId, family));
    element.setAttribute("data-motion-component-state", state);
    element.setAttribute("data-motion-component-phase", commonMotionPhase(state));
    element.setAttribute("data-motion-component-id", motionId);
    const value = commonMotionValue(element);
    if (value) {
      element.setAttribute("data-motion-component-value", value);
    } else {
      element.removeAttribute("data-motion-component-value");
    }
  }

  function attachCommonMotionComponentState(root) {
    if (!root || typeof root.querySelectorAll !== "function") return;
    root.querySelectorAll("[data-motion-id]").forEach(syncCommonMotionComponentState);
  }

  function attachMotionPressState(root, motionController) {
    if (!root || typeof root.querySelectorAll !== "function") return;
    const pressables = root.querySelectorAll("button, [role='button'], [data-route], [data-route-back], [data-motion-id]");
    pressables.forEach((element) => {
      if (element.__readerMotionPressBound) return;
      element.__readerMotionPressBound = true;
      const isDisabled = () => element.disabled || element.getAttribute("aria-disabled") === "true";
      const syncTabPressState = (pressed) => {
        const tabItem = element.getAttribute("data-motion-tab-item");
        if (!tabItem) return;
        const group = element.closest("[data-motion-tab-group]");
        if (pressed) {
          element.setAttribute("data-motion-tab-state", "pressed");
          element.classList.add("is-tab-motion-pressed");
          if (group) {
            group.setAttribute("data-motion-tab-phase", "press");
            group.setAttribute("data-motion-tab-pressed", tabItem);
          }
          return;
        }
        element.classList.remove("is-tab-motion-pressed");
        element.setAttribute("data-motion-tab-state", element.classList.contains("is-active") ? "active" : "inactive");
        if (group && group.getAttribute("data-motion-tab-pressed") === tabItem) {
          group.removeAttribute("data-motion-tab-pressed");
          if (group.getAttribute("data-motion-tab-phase") === "press") {
            group.setAttribute("data-motion-tab-phase", "settled");
          }
        }
      };
      const syncSegmentPressState = (pressed) => {
        const segmentItem = element.getAttribute("data-motion-segment-item");
        if (!segmentItem) return;
        const group = element.closest("[data-motion-segment-group]");
        if (pressed) {
          element.setAttribute("data-motion-segment-state", "pressed");
          if (group) {
            group.setAttribute("data-motion-segment-phase", "press");
            group.setAttribute("data-motion-segment-pressed", segmentItem);
          }
          return;
        }
        element.setAttribute("data-motion-segment-state", element.classList.contains("is-active") ? "active" : "inactive");
        if (group && group.getAttribute("data-motion-segment-pressed") === segmentItem) {
          group.removeAttribute("data-motion-segment-pressed");
          if (group.getAttribute("data-motion-segment-phase") === "press") {
            group.setAttribute("data-motion-segment-phase", "settled");
          }
        }
      };
      const syncDropdownPressState = (pressed) => {
        const role = element.getAttribute("data-motion-dropdown-role");
        if (role !== "trigger" && role !== "option") return;
        const group = element.closest("[data-motion-dropdown-group]") || element;
        if (pressed) {
          element.setAttribute("data-motion-dropdown-state", "pressed");
          group.setAttribute("data-motion-dropdown-phase", "press");
          group.setAttribute("data-motion-dropdown-pressed", element.getAttribute("data-motion-dropdown-item") || element.getAttribute("data-motion-dropdown-group") || "");
          return;
        }
        if (role === "trigger") {
          element.setAttribute("data-motion-dropdown-state", dropdownTriggerOpen(element) ? "open" : "closed");
        } else {
          const selected = element.classList.contains("is-active") || element.classList.contains("is-selected") || element.getAttribute("aria-selected") === "true" || element.getAttribute("aria-current") === "true";
          element.setAttribute("data-motion-dropdown-state", selected ? "selected" : "idle");
        }
        if (group.getAttribute("data-motion-dropdown-phase") === "press") {
          group.setAttribute("data-motion-dropdown-phase", "settled");
        }
        group.removeAttribute("data-motion-dropdown-pressed");
      };
      const syncReaderEntryPressState = (pressed) => {
        const role = element.getAttribute("data-motion-entry-role");
        if (role !== "cover" && role !== "action") return;
        element.setAttribute("data-motion-entry-state", pressed ? "pressed" : "idle");
      };
      const setPressed = (pressed) => {
        if (isDisabled()) return;
        element.classList.toggle("is-motion-pressed", pressed);
        if (pressed) {
          element.setAttribute("data-motion-pressed", "true");
        } else {
          element.removeAttribute("data-motion-pressed");
        }
        syncTabPressState(pressed);
        syncSegmentPressState(pressed);
        syncDropdownPressState(pressed);
        syncReaderEntryPressState(pressed);
        syncCommonMotionComponentState(element);
      };
      element.addEventListener("pointerdown", (event) => {
        if (event.button && event.button !== 0) return;
        if (motionController) {
          const motionId = element.getAttribute("data-motion-press-id") || element.getAttribute("data-motion-id") || "button.press";
          motionController.start({
            id: motionId.includes("press") ? motionId : `${motionId}.press`,
            action: "press",
            target: element
          });
        }
        setPressed(true);
      });
      ["pointerup", "pointercancel", "pointerleave", "blur"].forEach((eventName) => {
        element.addEventListener(eventName, () => setPressed(false));
      });
      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          setPressed(true);
        }
      });
      element.addEventListener("keyup", () => setPressed(false));
    });
  }

  function clearMotionInterruptTimer(appState) {
    if (appState?.motionInterruptTimer) {
      window.clearTimeout(appState.motionInterruptTimer);
      appState.motionInterruptTimer = null;
    }
  }

  function motionInterruptId(kind) {
    if (kind === "completeThenReplace") return "motion.interrupt.completeThenReplace";
    if (kind === "redirect") return "motion.interrupt.redirect";
    return "motion.interrupt.cancel";
  }

  function clearTransientMotionState(root) {
    if (!root || typeof root.querySelectorAll !== "function") {
      return {
        pressed: 0,
        tabPressed: 0,
        segmentPressed: 0,
        dropdownPressed: 0,
        handleDragging: 0,
        dockDragging: 0
      };
    }
    const cleared = {
      pressed: 0,
      tabPressed: 0,
      segmentPressed: 0,
      dropdownPressed: 0,
      handleDragging: 0,
      dockDragging: 0
    };
    root.querySelectorAll(".is-motion-pressed, [data-motion-pressed]").forEach((element) => {
      element.classList.remove("is-motion-pressed");
      element.removeAttribute("data-motion-pressed");
      cleared.pressed += 1;
    });
    root.querySelectorAll(".is-tab-motion-pressed, [data-motion-tab-pressed]").forEach((element) => {
      element.classList.remove("is-tab-motion-pressed");
      element.removeAttribute("data-motion-tab-pressed");
      if (element.getAttribute("data-motion-tab-phase") === "press") {
        element.setAttribute("data-motion-tab-phase", "settled");
      }
      if (element.getAttribute("data-motion-tab-state") === "pressed") {
        element.setAttribute("data-motion-tab-state", element.classList.contains("is-active") ? "active" : "inactive");
      }
      cleared.tabPressed += 1;
    });
    root.querySelectorAll("[data-motion-segment-pressed], [data-motion-segment-state=\"pressed\"]").forEach((element) => {
      element.removeAttribute("data-motion-segment-pressed");
      if (element.getAttribute("data-motion-segment-phase") === "press") {
        element.setAttribute("data-motion-segment-phase", "settled");
      }
      if (element.getAttribute("data-motion-segment-state") === "pressed") {
        element.setAttribute("data-motion-segment-state", element.classList.contains("is-active") ? "active" : "inactive");
      }
      cleared.segmentPressed += 1;
    });
    root.querySelectorAll("[data-motion-dropdown-pressed], [data-motion-dropdown-state=\"pressed\"]").forEach((element) => {
      element.removeAttribute("data-motion-dropdown-pressed");
      if (element.getAttribute("data-motion-dropdown-phase") === "press") {
        element.setAttribute("data-motion-dropdown-phase", "settled");
      }
      if (element.getAttribute("data-motion-dropdown-state") === "pressed") {
        if (element.getAttribute("data-motion-dropdown-role") === "trigger") {
          element.setAttribute("data-motion-dropdown-state", dropdownTriggerOpen(element) ? "open" : "closed");
        } else {
          element.setAttribute("data-motion-dropdown-state", element.classList.contains("is-active") ? "selected" : "idle");
        }
      }
      cleared.dropdownPressed += 1;
    });
    root.querySelectorAll("[data-motion-control-handle-state=\"dragging\"], [data-motion-control-handle-state=\"pressed\"]").forEach((element) => {
      element.setAttribute("data-motion-control-handle-state", "idle");
      element.style.setProperty("--reader-control-handle-y", "0px");
      cleared.handleDragging += 1;
    });
    root.querySelectorAll("[data-motion-control-dock-state=\"armed\"], [data-motion-control-dock-state=\"dragging\"]").forEach((element) => {
      element.setAttribute("data-motion-control-dock-state", "rebound");
      cleared.dockDragging += 1;
    });
    return cleared;
  }

  function applyMotionInterruptState(root, screenHost, appState, motion, cleared) {
    if (!root || !motion) return;
    const sequence = String(motion.sequence || 0);
    const clearCount = Object.values(cleared || {}).reduce((sum, value) => sum + Number(value || 0), 0);
    root.setAttribute("data-motion-interrupt", "true");
    root.setAttribute("data-motion-interrupt-state", motion.state);
    root.setAttribute("data-motion-interrupt-id", motion.id);
    root.setAttribute("data-motion-interrupt-reason", motion.reason || "");
    root.setAttribute("data-motion-interrupt-from", motion.from || "");
    root.setAttribute("data-motion-interrupt-to", motion.to || "");
    root.setAttribute("data-motion-interrupt-sequence", sequence);
    root.setAttribute("data-motion-interrupt-cleared", String(clearCount));
    root.setAttribute("data-motion-interrupt-reduced", root.getAttribute("data-motion-reduced") === "true" ? "true" : "false");
    if (screenHost) {
      screenHost.setAttribute("data-motion-interrupt-target", "screen-host");
      screenHost.setAttribute("data-motion-interrupt-state", motion.state);
      screenHost.setAttribute("data-motion-interrupt-id", motion.id);
      screenHost.setAttribute("data-motion-interrupt-sequence", sequence);
    }
  }

  function startMotionInterrupt(root, screenHost, appState, motionController, reason, options) {
    if (!root || !appState) return null;
    const kind = options?.kind || "cancel";
    const id = motionInterruptId(kind);
    const previousSnapshot = motionController?.getSnapshot?.()?.active || null;
    const sequence = (appState.motionInterruptSequence || 0) + 1;
    const motion = {
      id,
      reason: reason || "interrupt",
      state: "interrupting",
      sequence,
      from: options?.from || previousSnapshot?.id || "",
      to: options?.to || "",
      settled: false
    };
    appState.motionInterruptSequence = sequence;
    appState.motionInterruptMotion = motion;
    clearMotionInterruptTimer(appState);
    const cleared = clearTransientMotionState(root);
    if (previousSnapshot) {
      motionController?.interrupt?.(reason || "interrupt");
    }
    applyMotionInterruptState(root, screenHost, appState, motion, cleared);
    const settle = () => {
      if (appState.motionInterruptMotion !== motion) return;
      motion.state = "settled";
      motion.settled = true;
      applyMotionInterruptState(root, screenHost, appState, motion, cleared);
    };
    if (root.getAttribute("data-motion-reduced") === "true") {
      settle();
    } else {
      appState.motionInterruptTimer = window.setTimeout(settle, 80);
    }
    return motion;
  }

  function attachTabMotionState(root, appState) {
    if (!root || typeof root.querySelectorAll !== "function") return;
    const reduced = root.closest(".fd-demo")?.getAttribute("data-motion-reduced") === "true";
    const settleDelay = reduced ? 0 : 180;
    const groups = [
      {
        group: "main",
        host: root.querySelector(".fd-main-tab-phone .fd-main-nav"),
        selector: ".fd-main-nav-item",
        motion: appState?.mainTabMotion,
        motionKey: "mainTabMotion",
        itemKey: (button) => button.getAttribute("data-nav-type") || ""
      },
      {
        group: "reader-module",
        host: root.querySelector(".fd-reader-module-nav:not(.fd-reader-module-nav-empty)"),
        selector: ".fd-reader-module",
        motion: appState?.readerModuleMotion,
        motionKey: "readerModuleMotion",
        itemKey: (button) => button.getAttribute("data-module") || ""
      }
    ];

    groups.forEach((config) => {
      const nav = config.host;
      if (!nav) return;
      const buttons = Array.from(nav.querySelectorAll(config.selector));
      if (!buttons.length) return;
      const activeButton = buttons.find((button) => button.classList.contains("is-active") || button.getAttribute("aria-current") === "page") || null;
      const activeKey = activeButton ? config.itemKey(activeButton) : "";
      nav.setAttribute("data-motion-tab-group", config.group);
      nav.setAttribute("data-motion-tab-active", activeKey);
      buttons.forEach((button) => {
        const key = config.itemKey(button);
        const active = button === activeButton;
        button.setAttribute("data-motion-tab-group", config.group);
        button.setAttribute("data-motion-tab-item", key);
        button.setAttribute("data-motion-tab-state", active ? "active" : "inactive");
        button.setAttribute("data-motion-press-id", "tab.item.press");
        button.classList.remove("is-tab-motion-from", "is-tab-motion-to", "is-tab-motion-pressed");
      });

      const motion = config.motion && !config.motion.settled ? config.motion : null;
      if (!motion || !motion.to) {
        nav.setAttribute("data-motion-tab-phase", "settled");
        nav.removeAttribute("data-motion-tab-from");
        nav.removeAttribute("data-motion-tab-to");
        return;
      }

      nav.setAttribute("data-motion-tab-phase", motion.from === motion.to ? "select" : "switch");
      nav.setAttribute("data-motion-tab-from", motion.from || "");
      nav.setAttribute("data-motion-tab-to", motion.to || "");
      buttons.forEach((button) => {
        const key = config.itemKey(button);
        if (key === motion.from && motion.from !== motion.to) {
          button.setAttribute("data-motion-tab-state", "exiting");
          button.classList.add("is-tab-motion-from");
        }
        if (key === motion.to) {
          button.setAttribute("data-motion-tab-state", "entering");
          button.classList.add("is-tab-motion-to");
        }
      });

      window.setTimeout(() => {
        if (appState && appState[config.motionKey] === motion) {
          appState[config.motionKey] = null;
        }
        if (!nav.isConnected) return;
        nav.setAttribute("data-motion-tab-phase", "settled");
        nav.removeAttribute("data-motion-tab-from");
        nav.removeAttribute("data-motion-tab-to");
        buttons.forEach((button) => {
          button.classList.remove("is-tab-motion-from", "is-tab-motion-to", "is-tab-motion-pressed");
          button.setAttribute("data-motion-tab-state", button.classList.contains("is-active") ? "active" : "inactive");
        });
      }, settleDelay);
    });
  }

  const segmentMotionSelector = [
    "[data-reader-toc-mode]",
    "[data-reader-typography-set]",
    "[data-reader-page-space-set]",
    "[data-reader-theme]",
    "[data-demo-mode-option]"
  ].join(",");

  function segmentMotionKey(button) {
    if (!button) return "";
    if (button.hasAttribute("data-demo-mode-option")) return button.getAttribute("data-demo-mode-option") || "";
    if (button.hasAttribute("data-reader-toc-mode")) return button.getAttribute("data-reader-toc-mode") || "";
    if (button.hasAttribute("data-reader-theme")) return button.getAttribute("data-reader-theme") || "";
    if (button.hasAttribute("data-reader-typography-set")) {
      return [
        button.getAttribute("data-reader-typography-set") || "",
        button.getAttribute("data-reader-typography-value") || ""
      ].filter(Boolean).join(":");
    }
    if (button.hasAttribute("data-reader-page-space-set")) {
      return [
        button.getAttribute("data-reader-page-space-set") || "",
        button.getAttribute("data-reader-page-space-value") || ""
      ].filter(Boolean).join(":");
    }
    return button.textContent.trim();
  }

  function segmentMotionGroupKey(button) {
    if (!button) return "";
    if (button.hasAttribute("data-demo-mode-option")) return "demo-mode";
    if (button.hasAttribute("data-reader-toc-mode")) return "reader-toc-mode";
    if (button.hasAttribute("data-reader-theme")) return "reader-theme";
    if (button.hasAttribute("data-reader-typography-set")) return `reader-typography-${button.getAttribute("data-reader-typography-set") || "value"}`;
    if (button.hasAttribute("data-reader-page-space-set")) return `reader-page-space-${button.getAttribute("data-reader-page-space-set") || "value"}`;
    return "segment";
  }

  function segmentMotionHost(button) {
    return button?.closest(".fd-reader-segment-row, .fd-directory-toc-switch-row, .fd-reader-full-toc-switch-row, .fd-reader-font-row, .fd-reader-full-theme-grid, .fd-reader-theme-grid, .fd-reader-full-choice-grid, .fd-reader-appearance-quick-theme, .fd-reader-full-setting-block, .fd-demo-mode-switch") || button?.parentElement || null;
  }

  function segmentMotionActiveButton(host, groupKey) {
    if (!host) return null;
    return Array.from(host.querySelectorAll(segmentMotionSelector))
      .find((button) => segmentMotionGroupKey(button) === groupKey && (button.classList.contains("is-active") || button.getAttribute("aria-pressed") === "true")) || null;
  }

  function segmentMotionButtonsForHost(host, groupKey) {
    if (!host) return [];
    return Array.from(host.querySelectorAll(segmentMotionSelector))
      .filter((button) => segmentMotionGroupKey(button) === groupKey);
  }

  function syncSegmentMotionGroup(group, appState, settleDelay) {
    if (!group?.host) return;
    const active = segmentMotionActiveButton(group.host, group.key);
    const activeKey = segmentMotionKey(active) || "";
    group.host.setAttribute("data-motion-segment-group", group.key);
    group.host.setAttribute("data-motion-segment-active", activeKey);
    group.buttons.forEach((button) => {
      const key = segmentMotionKey(button);
      const isActive = button === active;
      button.setAttribute("data-motion-segment-group", group.key);
      button.setAttribute("data-motion-segment-item", key);
      button.setAttribute("data-motion-segment-state", isActive ? "active" : "inactive");
      button.setAttribute("data-motion-press-id", "tab.item.press");
      button.classList.remove("is-segment-motion-from", "is-segment-motion-to");
    });

    const motion = appState?.segmentMotion && appState.segmentMotion.group === group.key && !appState.segmentMotion.settled
      ? appState.segmentMotion
      : null;
    if (!motion || !motion.to) {
      group.host.setAttribute("data-motion-segment-phase", "settled");
      group.host.removeAttribute("data-motion-segment-from");
      group.host.removeAttribute("data-motion-segment-to");
      return;
    }

    group.host.setAttribute("data-motion-segment-phase", motion.from === motion.to ? "select" : "switch");
    group.host.setAttribute("data-motion-segment-from", motion.from || "");
    group.host.setAttribute("data-motion-segment-to", motion.to || "");
    group.buttons.forEach((button) => {
      const key = segmentMotionKey(button);
      if (key === motion.from && motion.from !== motion.to) {
        button.setAttribute("data-motion-segment-state", "exiting");
        button.classList.add("is-segment-motion-from");
      }
      if (key === motion.to) {
        button.setAttribute("data-motion-segment-state", "entering");
        button.classList.add("is-segment-motion-to");
      }
    });

    window.setTimeout(() => {
      if (appState && appState.segmentMotion === motion) {
        appState.segmentMotion = null;
      }
      if (!group.host.isConnected) return;
      group.host.setAttribute("data-motion-segment-phase", "settled");
      group.host.removeAttribute("data-motion-segment-from");
      group.host.removeAttribute("data-motion-segment-to");
      group.buttons.forEach((button) => {
        button.classList.remove("is-segment-motion-from", "is-segment-motion-to");
        button.setAttribute("data-motion-segment-state", button.classList.contains("is-active") ? "active" : "inactive");
      });
    }, settleDelay);
  }

  function attachSegmentMotionState(root, appState, motionController) {
    if (!root || typeof root.querySelectorAll !== "function") return;
    const reduced = root.closest(".fd-demo")?.getAttribute("data-motion-reduced") === "true";
    const settleDelay = reduced ? 0 : 180;
    const buttons = Array.from(root.querySelectorAll(segmentMotionSelector));
    const groups = new Map();

    buttons.forEach((button) => {
      const groupKey = segmentMotionGroupKey(button);
      const host = segmentMotionHost(button);
      if (!host) return;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, { key: groupKey, host, buttons: [] });
      }
      groups.get(groupKey).buttons.push(button);

      if (!button.__readerSegmentMotionBound) {
        button.__readerSegmentMotionBound = true;
        button.addEventListener("click", () => {
          const key = segmentMotionKey(button);
          const currentHost = segmentMotionHost(button);
          const active = segmentMotionActiveButton(currentHost, groupKey);
          const from = segmentMotionKey(active) || "";
          appState.segmentMotion = {
            group: groupKey,
            from,
            to: key,
            settled: false
          };
          if (motionController) {
            motionController.start({
              id: "segment.item.switch",
              action: from === key ? "select" : "switch",
              from,
              to: key,
              target: button
            });
          }
          syncSegmentMotionGroup({
            key: groupKey,
            host: currentHost,
            buttons: segmentMotionButtonsForHost(currentHost, groupKey)
          }, appState, settleDelay);
        });
      }
    });

    groups.forEach((group) => {
      syncSegmentMotionGroup(group, appState, settleDelay);
    });
  }

  const dropdownTriggerSelector = [
    "[data-filter-toggle]",
    "[data-bookshelf-filter-toggle]",
    "[data-discover-filter-toggle]",
    "[data-discover-sort-toggle]",
    "[data-rss-group-filter-toggle]",
    "[data-rss-manage-filter-toggle]",
    "[data-rss-category-filter-toggle]",
    "[data-rss-favorite-filter-toggle]",
    "[data-source-filter-toggle]",
    "[data-source-menu-toggle]",
    "[data-reader-more-toggle]",
    "[data-settings-option-key]",
    "[data-reader-setting-option-key]",
    "[data-reader-tts-option-key]"
  ].join(",");

  const dropdownMenuSelector = [
    ".fd-filter-menu",
    ".fd-bookshelf-filter-popover",
    "[data-discover-sort]",
    ".fd-discover-sort-popover",
    "[data-settings-option-dropdown]",
    "[data-reader-setting-dropdown]",
    "[data-reader-tts-dropdown]",
    "[data-reader-more-layer]",
    "[data-bookshelf-more-layer]",
    ".fd-source-more-menu",
    ".fd-bookshelf-more-menu",
    ".fd-book-focus-menu"
  ].join(",");

  const dropdownOptionSelector = [
    "[data-bookshelf-group-option]",
    "[data-bookshelf-sort-option]",
    "[data-bookshelf-filter-option]",
    "[data-discover-sort-option]",
    "[data-settings-option-choice]",
    "[data-settings-option-value]",
    "[data-reader-setting-option]",
    "[data-reader-tts-option]",
    "[data-reader-more-action]",
    "[data-rss-group-filter]",
    "[data-rss-manage-filter]",
    "[data-rss-category-filter]",
    "[data-rss-favorite-filter]",
    "[data-source-status-filter]",
    "[data-source-group-filter]",
    ".fd-source-more-menu button",
    ".fd-bookshelf-more-menu button",
    ".fd-book-focus-menu button"
  ].join(",");

  function dropdownGroupKey(element) {
    if (!element) return "";
    const containingMenu = element.closest?.(dropdownMenuSelector);
    if (containingMenu && containingMenu !== element) {
      return dropdownGroupKey(containingMenu);
    }
    const attrKeys = [
      ["data-reader-setting-option-key", "reader-setting"],
      ["data-reader-setting-dropdown", "reader-setting"],
      ["data-reader-setting-option", "reader-setting"],
      ["data-reader-tts-option-key", "reader-tts"],
      ["data-reader-tts-dropdown", "reader-tts"],
      ["data-reader-tts-option", "reader-tts"],
      ["data-settings-option-key", "settings-option"],
      ["data-settings-option-dropdown", "settings-option"],
      ["data-settings-option-choice", "settings-option"],
      ["data-bookshelf-filter-toggle", "bookshelf-filter"],
      ["data-bookshelf-group-option", "bookshelf-filter"],
      ["data-bookshelf-sort-option", "bookshelf-filter"],
      ["data-bookshelf-filter-option", "bookshelf-filter"],
      ["data-discover-filter-toggle", "discover-filter"],
      ["data-discover-sort-toggle", "discover-sort"],
      ["data-discover-sort", "discover-sort"],
      ["data-discover-sort-option", "discover-sort"],
      ["data-rss-group-filter-toggle", "rss-group-filter"],
      ["data-rss-group-filter", "rss-group-filter"],
      ["data-rss-manage-filter-toggle", "rss-manage-filter"],
      ["data-rss-manage-filter", "rss-manage-filter"],
      ["data-rss-category-filter-toggle", "rss-category-filter"],
      ["data-rss-category-filter", "rss-category-filter"],
      ["data-rss-favorite-filter-toggle", "rss-favorite-filter"],
      ["data-rss-favorite-filter", "rss-favorite-filter"],
      ["data-source-filter-toggle", "source-filter"],
      ["data-source-status-filter", "source-filter"],
      ["data-source-group-filter", "source-filter"],
      ["data-source-menu-toggle", "source-menu"],
      ["data-reader-more-toggle", "reader-more"],
      ["data-reader-more-layer", "reader-more"],
      ["data-reader-more-action", "reader-more"],
      ["data-bookshelf-more-layer", "bookshelf-more"]
    ];
    for (const [attr, prefix] of attrKeys) {
      if (element.hasAttribute(attr)) {
        const value = element.getAttribute(attr);
        return value ? `${prefix}:${value}` : prefix;
      }
    }
    const filterControl = element.closest?.(".fd-filter-control");
    const filterTrigger = filterControl?.querySelector(dropdownTriggerSelector);
    if (filterTrigger) {
      return dropdownGroupKey(filterTrigger);
    }
    if (element.classList?.contains("fd-discover-sort-popover")) return "discover-sort";
    if (element.classList?.contains("fd-source-more-menu")) return "source-menu";
    if (element.classList?.contains("fd-bookshelf-more-menu")) return "bookshelf-more";
    if (element.classList?.contains("fd-book-focus-menu")) return "book-focus-menu";
    return element.getAttribute("aria-label") || element.className || "dropdown";
  }

  function dropdownItemKey(element) {
    if (!element) return "";
    const attrs = [
      "data-settings-option-value",
      "data-reader-setting-value",
      "data-reader-tts-value",
      "data-discover-sort-option",
      "data-bookshelf-group-option",
      "data-bookshelf-sort-option",
      "data-bookshelf-filter-option",
      "data-rss-group-filter",
      "data-rss-manage-filter",
      "data-rss-category-filter",
      "data-rss-favorite-filter",
      "data-source-status-filter",
      "data-source-group-filter",
      "data-reader-more-action",
      "data-route",
      "data-book-action"
    ];
    for (const attr of attrs) {
      if (element.hasAttribute(attr)) return element.getAttribute(attr) || "";
    }
    return element.textContent.trim().replace(/\s+/g, " ").slice(0, 40);
  }

  function dropdownTriggerOpen(trigger) {
    if (!trigger) return false;
    if (trigger.getAttribute("aria-expanded") === "true") return true;
    if (trigger.classList.contains("is-option-open")) return true;
    const group = dropdownGroupKey(trigger);
    return Array.from(trigger.ownerDocument?.querySelectorAll(dropdownMenuSelector) || [])
      .some((menu) => (menu.getAttribute("data-motion-dropdown-group") || dropdownGroupKey(menu)) === group);
  }

  function syncDropdownTrigger(trigger) {
    const group = dropdownGroupKey(trigger);
    const open = dropdownTriggerOpen(trigger);
    trigger.setAttribute("data-motion-dropdown-role", "trigger");
    trigger.setAttribute("data-motion-dropdown-group", group);
    trigger.setAttribute("data-motion-dropdown-state", open ? "open" : "closed");
    trigger.setAttribute("data-motion-dropdown-phase", open ? "expanded" : "settled");
    trigger.setAttribute("data-motion-press-id", "dropdown.trigger.press");
  }

  function syncDropdownOption(option) {
    const group = dropdownGroupKey(option);
    const selected = option.classList.contains("is-active") || option.classList.contains("is-selected") || option.getAttribute("aria-selected") === "true" || option.getAttribute("aria-current") === "true";
    option.setAttribute("data-motion-dropdown-role", "option");
    option.setAttribute("data-motion-dropdown-group", group);
    option.setAttribute("data-motion-dropdown-item", dropdownItemKey(option));
    option.setAttribute("data-motion-dropdown-state", selected ? "selected" : "idle");
    option.setAttribute("data-motion-press-id", "dropdown.option.press");
  }

  function settleDropdownMenu(menu, state) {
    if (!menu.isConnected) return;
    menu.setAttribute("data-motion-dropdown-state", state);
    menu.setAttribute("data-motion-dropdown-phase", "settled");
  }

  function activeDropdownGroups(root) {
    if (!root || typeof root.querySelectorAll !== "function") return [];
    return Array.from(root.querySelectorAll(dropdownMenuSelector))
      .map((menu) => menu.getAttribute("data-motion-dropdown-group") || dropdownGroupKey(menu))
      .filter(Boolean);
  }

  function clearDropdownSwitchMotion(root, appState, motion) {
    if (appState?.dropdownSwitchMotion && appState.dropdownSwitchMotion !== motion) return;
    if (appState) {
      appState.dropdownSwitchMotion = null;
      appState.dropdownSwitchTimer = null;
    }
    root?.removeAttribute("data-motion-dropdown-switch");
    root?.removeAttribute("data-motion-dropdown-switch-id");
    root?.removeAttribute("data-motion-dropdown-switch-state");
    root?.removeAttribute("data-motion-dropdown-switch-from");
    root?.removeAttribute("data-motion-dropdown-switch-to");
    root?.removeAttribute("data-motion-dropdown-switch-sequence");
    root?.querySelectorAll?.("[data-motion-dropdown-switch-role]").forEach((element) => {
      element.removeAttribute("data-motion-dropdown-switch-role");
    });
  }

  function applyDropdownSwitchMotion(root, appState) {
    const motion = appState?.dropdownSwitchMotion;
    if (!root || !motion) return;
    root.setAttribute("data-motion-dropdown-switch", "true");
    root.setAttribute("data-motion-dropdown-switch-id", motion.id);
    root.setAttribute("data-motion-dropdown-switch-state", motion.state);
    root.setAttribute("data-motion-dropdown-switch-from", motion.from);
    root.setAttribute("data-motion-dropdown-switch-to", motion.to);
    root.setAttribute("data-motion-dropdown-switch-sequence", String(motion.sequence));
    root.querySelectorAll("[data-motion-dropdown-role]").forEach((element) => {
      const group = element.getAttribute("data-motion-dropdown-group") || dropdownGroupKey(element);
      if (group === motion.to) {
        element.setAttribute("data-motion-dropdown-switch-role", "to");
      } else if (group === motion.from) {
        element.setAttribute("data-motion-dropdown-switch-role", "from");
      } else {
        element.removeAttribute("data-motion-dropdown-switch-role");
      }
    });
  }

  function startDropdownSwitchMotion(root, appState, motionController, trigger) {
    if (!root || !appState || !trigger) return null;
    const to = dropdownGroupKey(trigger);
    const from = activeDropdownGroups(root).find((group) => group && group !== to);
    if (!from || !to) return null;
    const sequence = (appState.dropdownSwitchSequence || 0) + 1;
    const motion = {
      id: "motion.interrupt.redirect",
      state: "redirecting",
      from,
      to,
      sequence
    };
    appState.dropdownSwitchSequence = sequence;
    appState.dropdownSwitchMotion = motion;
    if (appState.dropdownSwitchTimer) {
      window.clearTimeout(appState.dropdownSwitchTimer);
      appState.dropdownSwitchTimer = null;
    }
    startMotionInterrupt(root.closest(".fd-demo") || root, root, appState, motionController, "dropdown-a-to-b", {
      kind: "redirect",
      from,
      to
    });
    applyDropdownSwitchMotion(root, appState);
    appState.dropdownSwitchTimer = window.setTimeout(() => {
      motion.state = "settled";
      applyDropdownSwitchMotion(root, appState);
      appState.dropdownSwitchTimer = null;
    }, root.closest(".fd-demo")?.getAttribute("data-motion-reduced") === "true" ? 0 : 160);
    return motion;
  }

  function syncDropdownMenu(menu, reduced) {
    const group = dropdownGroupKey(menu);
    const placement = menu.classList.contains("is-drop-up") ? "up" : "down";
    menu.setAttribute("data-motion-dropdown-role", "menu");
    menu.setAttribute("data-motion-dropdown-group", group);
    menu.setAttribute("data-motion-dropdown-placement", placement);
    menu.setAttribute("data-motion-dropdown-phase", "expand");
    if (menu.__readerDropdownMotionEntered || reduced) {
      settleDropdownMenu(menu, "expanded");
      return;
    }
    menu.__readerDropdownMotionEntered = true;
    menu.setAttribute("data-motion-dropdown-state", "entering");
    window.requestAnimationFrame(() => settleDropdownMenu(menu, "expanded"));
  }

  function attachDropdownMotionState(root, appState, motionController) {
    if (!root || typeof root.querySelectorAll !== "function") return;
    const reduced = root.closest(".fd-demo")?.getAttribute("data-motion-reduced") === "true";

    root.querySelectorAll(dropdownTriggerSelector).forEach((trigger) => {
      syncDropdownTrigger(trigger);
      if (!trigger.__readerDropdownMotionBound) {
        trigger.__readerDropdownMotionBound = true;
        trigger.addEventListener("click", () => {
          const group = dropdownGroupKey(trigger);
          const wasOpen = dropdownTriggerOpen(trigger);
          let switchMotion = null;
          if (!wasOpen) {
            switchMotion = startDropdownSwitchMotion(root, appState, motionController, trigger);
          }
          if (!switchMotion) {
            clearDropdownSwitchMotion(root, appState, appState.dropdownSwitchMotion);
          }
          const id = wasOpen ? "dropdown.menu.collapse" : "dropdown.menu.expand";
          appState.dropdownMotion = {
            group,
            phase: wasOpen ? "collapse" : "expand",
            from: wasOpen ? "open" : "closed",
            to: wasOpen ? "closed" : "open"
          };
          if (motionController) {
            motionController.start({
              id,
              action: wasOpen ? "collapse" : "expand",
              from: wasOpen ? "open" : "closed",
              to: wasOpen ? "closed" : "open",
              target: trigger
            });
          }
        });
      }
    });

    root.querySelectorAll(dropdownMenuSelector).forEach((menu) => {
      syncDropdownMenu(menu, reduced);
    });

    root.querySelectorAll(dropdownOptionSelector).forEach((option) => {
      syncDropdownOption(option);
      if (!option.__readerDropdownOptionMotionBound) {
        option.__readerDropdownOptionMotionBound = true;
        option.addEventListener("click", () => {
          const group = dropdownGroupKey(option);
          const item = dropdownItemKey(option);
          appState.dropdownMotion = {
            group,
            item,
            phase: "select",
            from: "open",
            to: "valueCommitted"
          };
          option.setAttribute("data-motion-dropdown-state", "selecting");
          if (motionController) {
            motionController.start({
              id: "dropdown.option.select",
              action: "select",
              from: group,
              to: item,
              target: option
            });
          }
        });
      }
    });
    applyDropdownSwitchMotion(root, appState);
  }

  function readerEntryKey(element) {
    if (!element) return "";
    return [
      element.getAttribute("data-book-title") || "",
      element.getAttribute("data-book-author") || "",
      element.getAttribute("data-book-chapter") || "",
      element.getAttribute("data-cover-src") || ""
    ].filter(Boolean).join("|") || element.textContent.trim().replace(/\s+/g, " ").slice(0, 48);
  }

  function readerEntryMotionFromElement(element, screenHost, fromRoute, targetRoute, kind) {
    const rect = element.getBoundingClientRect();
    const hostRect = screenHost.getBoundingClientRect();
    return {
      id: kind === "cover" ? "reader.entry.coverToImmersive" : "reader.entry.actionToImmersive",
      kind,
      key: readerEntryKey(element),
      from: fromRoute || "",
      to: targetRoute || "immersive-reading",
      title: element.getAttribute("data-book-title") || "",
      author: element.getAttribute("data-book-author") || "",
      chapter: element.getAttribute("data-book-chapter") || "",
      coverSrc: element.getAttribute("data-cover-src") || element.querySelector?.("img")?.getAttribute("src") || "",
      x: Math.round(rect.left - hostRect.left),
      y: Math.round(rect.top - hostRect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      settled: false
    };
  }

  function setReaderEntrySourceState(element, role) {
    const isCover = role === "cover";
    element.setAttribute("data-motion-entry-role", role);
    element.setAttribute("data-motion-entry-key", readerEntryKey(element));
    element.setAttribute("data-motion-entry-state", "idle");
    element.setAttribute("data-motion-press-id", isCover ? "reader.entry.coverToImmersive" : "reader.entry.actionToImmersive");
  }

  function createReaderEntrySnapshot(screenHost, motion) {
    if (!motion?.coverSrc || !motion.width || !motion.height) return null;
    const snapshot = document.createElement("div");
    snapshot.className = "fd-reader-entry-snapshot";
    snapshot.setAttribute("data-motion-entry-role", "snapshot");
    snapshot.setAttribute("data-motion-entry-state", "entering");
    snapshot.setAttribute("data-motion-entry-key", motion.key || "");
    snapshot.setAttribute("aria-hidden", "true");
    snapshot.style.setProperty("--reader-entry-x", `${motion.x}px`);
    snapshot.style.setProperty("--reader-entry-y", `${motion.y}px`);
    snapshot.style.setProperty("--reader-entry-width", `${motion.width}px`);
    snapshot.style.setProperty("--reader-entry-height", `${motion.height}px`);
    const image = document.createElement("img");
    image.src = motion.coverSrc;
    image.alt = "";
    snapshot.appendChild(image);
    screenHost.appendChild(snapshot);
    return snapshot;
  }

  function settleReaderEntryMotion(root, appState, target, snapshot, motion) {
    if (snapshot?.isConnected) {
      snapshot.remove();
    }
    if (target?.isConnected) {
      target.setAttribute("data-motion-entry-state", "settled");
    }
    if (root) {
      root.setAttribute("data-motion-entry-phase", "settled");
      root.setAttribute("data-motion-entry-last-id", motion.id || "");
      root.setAttribute("data-motion-entry-last-kind", motion.kind || "");
      root.setAttribute("data-motion-entry-last-from", motion.from || "");
      root.setAttribute("data-motion-entry-last-to", motion.to || "");
      root.removeAttribute("data-motion-entry-key");
      root.removeAttribute("data-motion-entry-title");
    }
    if (appState && appState.readerEntryMotion === motion) {
      appState.readerEntryMotion = null;
    }
  }

  function attachReaderEntryMotionState(screenHost, appState) {
    if (!screenHost || typeof screenHost.querySelectorAll !== "function") return;
    const root = screenHost.closest(".fd-demo");
    const reduced = root?.getAttribute("data-motion-reduced") === "true";

    screenHost.querySelectorAll("[data-book-cover]").forEach((coverButton) => {
      setReaderEntrySourceState(coverButton, "cover");
    });
    screenHost.querySelectorAll("[data-route='immersive-reading']:not([data-book-cover])").forEach((entryAction) => {
      setReaderEntrySourceState(entryAction, "action");
    });

    const motion = appState?.readerEntryMotion;
    const target = screenHost.querySelector(".fd-immersive-frame, .fd-reader-frame");
    if (!root || !motion || motion.settled || motion.to !== "immersive-reading" || !target) {
      return;
    }

    root.setAttribute("data-motion-entry-phase", reduced ? "settled" : "entering");
    root.setAttribute("data-motion-entry-key", motion.key || "");
    root.setAttribute("data-motion-entry-title", motion.title || "");
    target.setAttribute("data-motion-entry-role", "target");
    target.setAttribute("data-motion-entry-source", motion.kind || "");
    target.setAttribute("data-motion-entry-state", reduced ? "settled" : "entering");

    if (reduced) {
      settleReaderEntryMotion(root, appState, target, null, motion);
      return;
    }

    const snapshot = motion.kind === "cover" ? createReaderEntrySnapshot(screenHost, motion) : null;
    window.requestAnimationFrame(() => {
      if (!target.isConnected) return;
      target.setAttribute("data-motion-entry-state", "active");
      if (snapshot?.isConnected) {
        snapshot.setAttribute("data-motion-entry-state", "exiting");
      }
    });
    window.setTimeout(() => {
      motion.settled = true;
      settleReaderEntryMotion(root, appState, target, snapshot, motion);
    }, 260);
  }

  function readerControlHandlePanel(button) {
    return button?.closest?.(".fd-reader-sheet, .fd-reader-full-page-panel") || null;
  }

  function readerControlHandleTargetRoute(button, deltaY) {
    const expandRoute = button?.getAttribute?.("data-reader-handle-expand-route") || "";
    if (expandRoute && Number(deltaY) < 0) {
      return expandRoute;
    }
    return button?.getAttribute?.("data-route") || "";
  }

  function readerControlHandleAction(button, deltaY) {
    const expandRoute = button?.getAttribute?.("data-reader-handle-expand-route") || "";
    if (expandRoute && Number(deltaY) < 0) {
      return "expand";
    }
    const route = readerControlHandleTargetRoute(button, deltaY);
    if (!route) return "static";
    if (route === "reader" || route === "immersive-reading" || readerStateByRoute[route]) {
      return "collapse";
    }
    return "expand";
  }

  function readerControlHandleMotionId(state) {
    if (state === "dragging") return "reader.control.handle.drag";
    if (state === "releasing" || state === "settled") return "reader.control.handle.release";
    return "reader.control.handle.press";
  }

  function readerControlHandlePreviewOffset(deltaY, action, reduced) {
    if (reduced || action === "static") return 0;
    const limit = 18;
    if (action === "expand") {
      return Math.round(clamp(deltaY, -limit, 0));
    }
    return Math.round(clamp(deltaY, 0, limit));
  }

  function readerControlHandleShouldCommit(deltaY, action) {
    const threshold = 34;
    if (action === "expand") return deltaY <= -threshold;
    if (action === "collapse") return deltaY >= threshold;
    return false;
  }

  function setReaderControlHandleState(button, state, options) {
    if (!button) return;
    const panel = readerControlHandlePanel(button);
    const deltaY = Number(options?.deltaY || 0);
    const action = readerControlHandleAction(button, deltaY);
    const route = readerControlHandleTargetRoute(button, deltaY);
    const expandRoute = button.getAttribute("data-reader-handle-expand-route") || "";
    const offsetY = Number(options?.offsetY || 0);
    const motionId = readerControlHandleMotionId(state);

    button.setAttribute("data-motion-control-handle", "true");
    button.setAttribute("data-motion-control-handle-action", action);
    button.setAttribute("data-motion-control-handle-route", route);
    if (expandRoute) {
      button.setAttribute("data-motion-control-handle-expand-route", expandRoute);
    }
    button.setAttribute("data-motion-control-handle-state", state);
    button.setAttribute("data-motion-control-handle-id", motionId);
    if (route) {
      button.setAttribute("data-motion-press-id", "reader.control.handle.press");
    }

    if (panel) {
      panel.setAttribute("data-motion-control-handle-panel", panel.classList.contains("fd-reader-full-page-panel") ? "full" : "sheet");
      panel.setAttribute("data-motion-control-handle-action", action);
      panel.setAttribute("data-motion-control-handle-route", route);
      if (expandRoute) {
        panel.setAttribute("data-motion-control-handle-expand-route", expandRoute);
      }
      panel.setAttribute("data-motion-control-handle-state", state);
      panel.setAttribute("data-motion-control-handle-id", motionId);
      panel.style.setProperty("--reader-control-handle-y", `${Math.round(offsetY)}px`);
    }
  }

  function attachReaderControlHandleMotionState(screenHost) {
    if (!screenHost || typeof screenHost.querySelectorAll !== "function") return;
    screenHost.querySelectorAll(".fd-reader-grabber, .fd-reader-full-grabber").forEach((button) => {
      setReaderControlHandleState(button, button.getAttribute("data-motion-control-handle-state") || "idle", { offsetY: 0 });
    });
  }

  const movableDockViewportClasses = new Set(["expanded-width", "tablet-expanded", "compact-landscape"]);

  function readerControlDockViewportClass(screenHost) {
    return screenHost?.closest?.(".fd-demo")?.getAttribute("data-viewport-class") || "";
  }

  function readerControlDockOffsetKey(screenHost) {
    return readerControlDockViewportClass(screenHost) || "default";
  }

  function zeroDockOffset() {
    return { x: 0, y: 0 };
  }

  function normalizeDockOffset(offset) {
    const x = Number(offset?.x);
    const y = Number(offset?.y);
    return {
      x: Number.isFinite(x) ? Math.round(x) : 0,
      y: Number.isFinite(y) ? Math.round(y) : 0
    };
  }

  function readerControlDockElements(screenHost) {
    const frame = screenHost?.querySelector?.(".fd-reader-frame") || null;
    const sheet = screenHost?.querySelector?.(".fd-reader-sheet:not(.fd-reader-sheet-empty)") || null;
    const nav = screenHost?.querySelector?.(".fd-reader-module-nav:not(.fd-reader-module-nav-empty)") || null;
    return { frame, sheet, nav };
  }

  function readerControlDockMovable(screenHost) {
    const viewportClass = readerControlDockViewportClass(screenHost);
    const { frame, sheet, nav } = readerControlDockElements(screenHost);
    return Boolean(frame && sheet && nav && movableDockViewportClasses.has(viewportClass));
  }

  function readerControlDockGroupRect(elements) {
    const rects = [elements.sheet, elements.nav]
      .filter(Boolean)
      .map((element) => element.getBoundingClientRect());
    if (!rects.length) return null;
    const left = Math.min(...rects.map((rect) => rect.left));
    const top = Math.min(...rects.map((rect) => rect.top));
    const right = Math.max(...rects.map((rect) => rect.right));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top
    };
  }

  function readerControlDockBounds(screenHost, offset) {
    const elements = readerControlDockElements(screenHost);
    if (!elements.frame || !elements.sheet || !elements.nav) return null;
    const frameRect = elements.frame.getBoundingClientRect();
    const groupRect = readerControlDockGroupRect(elements);
    if (!groupRect) return null;
    const current = normalizeDockOffset(offset);
    const margin = 16;
    const baseLeft = groupRect.left - current.x;
    const baseTop = groupRect.top - current.y;
    const minX = Math.round(frameRect.left + margin - baseLeft);
    const maxX = Math.round(frameRect.right - margin - (baseLeft + groupRect.width));
    const minY = Math.round(frameRect.top + margin - baseTop);
    const maxY = Math.round(frameRect.bottom - margin - (baseTop + groupRect.height));
    return {
      minX: Math.min(minX, maxX),
      maxX: Math.max(minX, maxX),
      minY: Math.min(minY, maxY),
      maxY: Math.max(minY, maxY),
      margin,
      frameWidth: Math.round(frameRect.width),
      frameHeight: Math.round(frameRect.height),
      dockWidth: Math.round(groupRect.width),
      dockHeight: Math.round(groupRect.height)
    };
  }

  function clampDockOffset(offset, bounds) {
    const current = normalizeDockOffset(offset);
    if (!bounds) return current;
    return {
      x: Math.round(clamp(current.x, bounds.minX, bounds.maxX)),
      y: Math.round(clamp(current.y, bounds.minY, bounds.maxY))
    };
  }

  function dockBoundsString(bounds) {
    if (!bounds) return "";
    return `x:${bounds.minX}..${bounds.maxX};y:${bounds.minY}..${bounds.maxY};margin:${bounds.margin}`;
  }

  function setReaderControlDockState(screenHost, appState, state, options) {
    const root = screenHost?.closest?.(".fd-demo") || null;
    const elements = readerControlDockElements(screenHost);
    const viewportClass = readerControlDockViewportClass(screenHost);
    const key = readerControlDockOffsetKey(screenHost);
    if (!elements.frame || !elements.sheet || !elements.nav || !movableDockViewportClasses.has(viewportClass)) {
      return null;
    }

    const offsets = appState.readerDockOffsets || {};
    appState.readerDockOffsets = offsets;
    const requested = normalizeDockOffset(options?.offset || offsets[key] || zeroDockOffset());
    const bounds = readerControlDockBounds(screenHost, requested);
    const offset = clampDockOffset(requested, bounds);
    if (options?.commit) {
      offsets[key] = offset;
    }

    const motionId = options?.motionId || (
      state === "armed" ? "reader.control.dock.longPress" :
        state === "dragging" ? "reader.control.dock.drag" :
          state === "rebound" ? "reader.control.dock.rebound" :
            "reader.control.dock.release"
    );

    elements.frame.style.setProperty("--reader-control-dock-x", `${offset.x}px`);
    elements.frame.style.setProperty("--reader-control-dock-y", `${offset.y}px`);
    elements.frame.setAttribute("data-motion-control-dock", "true");
    elements.frame.setAttribute("data-motion-control-dock-state", state);
    elements.frame.setAttribute("data-motion-control-dock-id", motionId);
    elements.frame.setAttribute("data-motion-control-dock-viewport", viewportClass);
    elements.frame.setAttribute("data-motion-control-dock-x", String(offset.x));
    elements.frame.setAttribute("data-motion-control-dock-y", String(offset.y));
    elements.frame.setAttribute("data-motion-control-dock-bounds", dockBoundsString(bounds));
    elements.frame.setAttribute("data-motion-control-dock-clamped", requested.x === offset.x && requested.y === offset.y ? "false" : "true");

    [elements.sheet, elements.nav].forEach((element) => {
      element.setAttribute("data-motion-control-dock-role", element === elements.sheet ? "sheet" : "nav");
      element.setAttribute("data-motion-control-dock-state", state);
      element.setAttribute("data-motion-control-dock-id", motionId);
      element.setAttribute("data-motion-control-dock-viewport", viewportClass);
    });
    root?.setAttribute("data-motion-control-dock-last-id", motionId);
    return { offset, bounds, requested, key, clamped: requested.x !== offset.x || requested.y !== offset.y };
  }

  function clearReaderControlDockState(screenHost) {
    const elements = readerControlDockElements(screenHost);
    const root = screenHost?.closest?.(".fd-demo") || null;
    if (elements.frame) {
      elements.frame.style.removeProperty("--reader-control-dock-x");
      elements.frame.style.removeProperty("--reader-control-dock-y");
      [
        "data-motion-control-dock",
        "data-motion-control-dock-state",
        "data-motion-control-dock-id",
        "data-motion-control-dock-viewport",
        "data-motion-control-dock-x",
        "data-motion-control-dock-y",
        "data-motion-control-dock-bounds",
        "data-motion-control-dock-clamped"
      ].forEach((attribute) => elements.frame.removeAttribute(attribute));
    }
    [elements.sheet, elements.nav].forEach((element) => {
      if (!element) return;
      [
        "data-motion-control-dock-role",
        "data-motion-control-dock-state",
        "data-motion-control-dock-id",
        "data-motion-control-dock-viewport"
      ].forEach((attribute) => element.removeAttribute(attribute));
    });
    root?.removeAttribute("data-motion-control-dock-last-id");
  }

  function applyReaderControlDockClamp(screenHost, appState, motionController) {
    if (!readerControlDockMovable(screenHost)) {
      clearReaderControlDockState(screenHost);
      return null;
    }
    const key = readerControlDockOffsetKey(screenHost);
    const current = normalizeDockOffset(appState.readerDockOffsets?.[key] || zeroDockOffset());
    const result = setReaderControlDockState(screenHost, appState, "settled", {
      offset: current,
      commit: true,
      motionId: "reader.control.dock.release"
    });
    if (result?.clamped) {
      setReaderControlDockState(screenHost, appState, "rebound", {
        offset: result.offset,
        commit: true,
        motionId: "reader.control.dock.rebound"
      });
      motionController?.start({
        id: "reader.control.dock.rebound",
        action: "dock-rebound",
        from: `${current.x},${current.y}`,
        to: `${result.offset.x},${result.offset.y}`
      });
    }
    return result;
  }

  function attachReaderControlDockMotionState(screenHost, appState, motionController) {
    const root = screenHost?.closest?.(".fd-demo") || null;
    root?.setAttribute("data-motion-control-dock-sync", readerControlDockMovable(screenHost) ? "movable" : "static");
    const result = applyReaderControlDockClamp(screenHost, appState, motionController);
    root?.setAttribute("data-motion-control-dock-result", result ? `${result.offset.x},${result.offset.y}` : "none");
  }

  function sourceCandidateRow(item, index, selectedSource) {
    const isCurrent = item.state === "当前";
    const isSelected = selectedSource ? item.source === selectedSource : isCurrent;
    const canSwitch = !isCurrent && item.state !== "落后" && item.state !== "失效";
    const latestChapterLabel = item.latestChapter || item.chapter || item.latest || "章节同步";
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
          <small>${esc(selected.state || "当前")} · ${esc(selected.latency || "")} · ${esc(selected.latest || "章节同步")}</small>
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
      case "discover-control":
      case "discover-sort":
      case "discover-entry-ranking":
      case "discover-entry-bestseller":
      case "discover-entry-category":
      case "discover-entry-finished":
      case "discover-entry-latest":
      case "discover-entry-new":
      case "discover-entry-booklist":
      case "discover-filter-keyword":
      case "discover-filter-male":
      case "discover-filter-female":
      case "discover-sort-popularity":
      case "discover-sort-update":
      case "discover-sort-collection":
      case "discover-sort-finished":
      case "discover-sort-words":
      case "discover-no-results":
      case "discover-loading":
      case "discover-refreshing":
      case "discover-infinite-loading":
      case "discover-page-two":
      case "discover-cache-confirm":
      case "discover-cache-toast":
      case "discover-login-return":
      case "discover-switching-source":
      case "discover-switched-source":
      case "discover-entry-error":
      case "discover-empty":
      case "discover-error":
        return mainTabDiscover(data, appState, route);
      case "discover-source-login":
        return discoverSourceLoginScreen(data);
      case "discover-rule-test":
        return discoverRuleTestScreen(data);
      case "discover-source-bulk":
        return discoverSourceBulkScreen(data);
      case "rss":
      case "rss-all":
      case "rss-source-feed":
      case "rss-source-category-releases":
      case "rss-source-category-issues":
      case "rss-source-category-discussions":
      case "rss-refreshing":
        return mainTabRss(data, appState, route);
      case "rss-starred":
        return rssFavoritesScreen(data, appState);
      case "rss-detail":
        return rssDetailScreen(data, appState);
      case "rss-original":
        return rssOriginalScreen(data, appState);
      case "rss-original-browser":
        return rssConfirmScreen(data, {
          title: "系统浏览器",
          icon: "globe",
          heading: "已准备打开原文链接",
          copy: "实际应用中这里会调用系统浏览器打开 github.com/minliny/Reader-UI/releases/latest，同时保留当前 RSS 阅读上下文。",
          cancelLabel: "返回原文页",
          cancelRoute: "rss-original",
          confirmRoute: "rss-detail",
          confirmLabel: "回到正文"
        }, appState);
      case "rss-search":
        return rssSearchScreen(data, appState);
      case "rss-subscription-management":
        return rssSubscriptionManagementScreen(data, appState);
      case "rss-source-actions":
        return rssSourceActionsScreen(data, appState);
      case "rss-source-edit":
        return rssSourceEditScreen(data, appState);
      case "rss-source-debug":
        return rssSourceDebugScreen(data, appState);
      case "rss-source-vars":
        return rssSourceVarsScreen(data, appState);
      case "rss-source-login":
        return rssSourceLoginScreen(data, appState);
      case "rss-source-login-web":
        return rssSourceLoginWebScreen(data, appState);
      case "rss-source-login-cookie":
        return rssSourceLoginCookieScreen(data, appState);
      case "rss-source-login-clear":
        return rssConfirmScreen(data, {
          title: "清除登录",
          icon: "trash",
          heading: "清除当前源登录信息？",
          copy: "清除后该 RSS 源下次刷新会重新进入登录流程，不影响其他订阅源和已缓存文章。",
          cancelRoute: "rss-source-login",
          confirmRoute: "rss-source-actions",
          confirmLabel: "确认清除"
        }, appState);
      case "rss-source-groups":
        return rssSourceGroupsScreen(data, appState);
      case "rss-source-group-edit":
        return rssSourceGroupEditScreen(data, appState);
      case "rss-source-batch":
        return rssSourceBatchScreen(data, appState);
      case "rss-source-export":
        return rssSourceExportScreen(data, appState);
      case "rss-source-export-detail":
        return rssSourceExportDetailScreen(data, appState);
      case "rss-source-export-result":
        return rssConfirmScreen(data, {
          title: "导出完成",
          icon: "check",
          heading: "已生成导出文件",
          copy: "reader-rss-sources-20260626.json 已生成，包含已选订阅源、分组、启用状态和规则配置。",
          detail: "登录 Cookie 和账号凭据没有写入导出文件。",
          cancelLabel: "返回导出",
          cancelRoute: "rss-source-export",
          confirmRoute: "rss-subscription-management",
          confirmLabel: "完成"
        }, appState);
      case "rss-source-pin":
        return rssConfirmScreen(data, {
          title: "置顶订阅源",
          icon: "top",
          heading: "置顶 GitHub Releases？",
          copy: "置顶后该订阅源会显示在源列表和快捷入口最前面，不影响刷新规则和分组。",
          detail: "适合高频阅读的发布源、公告源或需要优先查看的订阅源。",
          confirmRoute: "rss-source-feed",
          confirmLabel: "确认置顶"
        }, appState);
      case "rss-source-disable":
        return rssConfirmScreen(data, {
          title: "禁用订阅源",
          icon: "offline",
          heading: "禁用已选订阅源？",
          copy: "禁用后不会参与自动刷新、未读提醒和 RSS 首页统计，已缓存条目和阅读记录会保留。",
          detail: "可以在订阅管理页重新启用。",
          confirmRoute: "rss-subscription-management",
          confirmLabel: "确认禁用"
        }, appState);
      case "rss-source-batch-disable":
        return rssConfirmScreen(data, {
          title: "批量禁用",
          icon: "offline",
          heading: "禁用已选 2 个订阅源？",
          copy: "禁用后这些订阅源不会参与自动刷新、未读提醒和首页统计，已缓存条目和阅读记录会保留。",
          cancelRoute: "rss-source-batch",
          confirmRoute: "rss-subscription-management",
          confirmLabel: "确认禁用"
        }, appState);
      case "rss-source-import":
        return rssSourceImportScreen(data, appState);
      case "rss-source-import-detail":
        return rssSourceImportDetailScreen(data, appState);
      case "rss-source-import-result":
        return rssConfirmScreen(data, {
          title: "导入完成",
          icon: "check",
          heading: "已导入 2 个订阅源",
          copy: "新增源已加入 RSS 订阅管理，冲突源保留本地名称、分组和启用状态。",
          detail: "需要登录的源不会自动导入 Cookie。",
          cancelLabel: "继续导入",
          cancelRoute: "rss-source-import",
          confirmRoute: "rss-subscription-management",
          confirmLabel: "完成"
        }, appState);
      case "rss-read-record":
        return rssReadRecordScreen(data, appState);
      case "rss-record-clear":
        return rssConfirmScreen(data, {
          title: "清空阅读记录",
          icon: "trash",
          heading: "清空 RSS 阅读记录？",
          copy: "只会清除 RSS 阅读历史，不会删除收藏、订阅源、未读状态或正文缓存。",
          cancelRoute: "rss-read-record",
          confirmRoute: "rss-read-record",
          confirmLabel: "确认清空"
        }, appState);
      case "rss-rule-subscription":
        return rssRuleSubscriptionScreen(data, appState);
      case "rss-rule-subscription-detail":
        return rssRuleSubscriptionDetailScreen(data, appState);
      case "rss-rule-subscription-edit":
        return rssRuleSubscriptionEditScreen(data, appState);
      case "rss-rule-subscription-test":
        return rssRuleSubscriptionTestScreen(data, appState);
      case "rss-rule-subscription-apply":
        return rssConfirmScreen(data, {
          title: "应用订阅更新",
          icon: "sync",
          heading: "应用社区 RSS 源订阅更新？",
          copy: "将新增 2 个源、更新 1 个规则，并跳过 1 个本地冲突。登录凭据不会被覆盖。",
          cancelRoute: "rss-rule-subscription-detail",
          confirmRoute: "rss-source-import",
          confirmLabel: "进入导入预览"
        }, appState);
      case "rss-favorite-groups":
        return rssFavoriteGroupsScreen(data, appState);
      case "rss-favorite-group-edit":
        return rssFavoriteGroupEditScreen(data, appState);
      case "rss-favorite-clear":
        return rssConfirmScreen(data, {
          title: "清空收藏分组",
          icon: "trash",
          heading: "清空默认分组收藏？",
          copy: "仅移除当前收藏分组里的条目，文章本身和订阅源不会删除。",
          cancelRoute: "rss-starred",
          confirmRoute: "rss-starred",
          confirmLabel: "确认清空"
        }, appState);
      case "rss-empty":
      case "rss-error":
        return rssStateScreen(data, route, appState);
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
        return sortFilterScreen(data, appState);
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
      readerPageSpace: normalizeReaderPageSpace(data),
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
      readerSessionCapsuleSnapshot: null,
      readerControlSpaceSnapshot: null,
      readerSessionCapsuleTimer: null,
      readerSettings: Object.assign({}, readerControlSettingsConfig(data).defaults),
      readerReplacementRules: {},
      readerAutoPageSession: false,
      readerAutoPageCountdown: 8,
      firstOpenMotion: null,
      firstOpenMotionTimer: null,
      hasPlayedFirstOpen: false,
      viewportOrientationMotion: null,
      viewportOrientationMotionTimer: null,
      viewportOrientationMotionSequence: 0,
      motionInterruptMotion: null,
      motionInterruptTimer: null,
      motionInterruptSequence: 0,
      readerDockOffsets: {},
      readerTextSelectionOpen: false,
      readerSelectedText: "雨，下了一整夜。",
      readerChapterDownloads: {},
      readerChapterDownloadCompleted: {},
      readerChapterDownloadTimers: {},
      readerSettingsExpandedOption: "",
      discoverEntry: "",
      discoverFilter: "男频",
      discoverSort: "",
      discoverFilterOpen: false,
      discoverSortOpen: false,
      rssGroupFilter: "全部",
      rssGroupFilterOpen: false,
      rssManageFilter: "全部",
      rssManageFilterOpen: false,
      rssCategoryFilterOpen: false,
      rssFavoriteFilter: "默认分组",
      rssFavoriteFilterOpen: false,
      sourceSwitchSelectedSource: "",
      sourceMenuOpen: false,
      sourceStatusFilter: "全部",
      sourceGroupFilter: "全部分组",
      sourceFilterOpen: false,
      sourceEnabled: {},
      restoreAvailableScopes: restoreDefaultScopeKeys(),
      restoreSelectedScopes: restoreDefaultScopeKeys(),
      settingsOverlay: "",
      settingsExpandedOption: "",
      settingsToast: "",
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
          <h1>Frontend Demo - All Routes</h1>
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
    let pendingRouteRequest = null;
    let hasRenderedInitialRoute = false;
    const motionAsyncDelay = (() => {
      const value = Number(new URLSearchParams(window.location.search).get("motionAsyncDelay"));
      if (!Number.isFinite(value) || value <= 0) return 360;
      return Math.min(3000, Math.max(80, Math.round(value)));
    })();
    const motionController = window.ReaderMotionController
      ? window.ReaderMotionController.create({ root })
      : null;
    let viewportSnapshot = applyViewportClass(root);
    if (target.__readerAdaptiveViewportCleanup) {
      target.__readerAdaptiveViewportCleanup();
    }
    const motionMediaQuery = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    const handleViewportChange = () => {
      const previousSnapshot = viewportSnapshot;
      const nextSnapshot = applyViewportClass(root);
      if (
        motionController &&
        previousSnapshot &&
        nextSnapshot &&
        (previousSnapshot.orientation !== nextSnapshot.orientation || previousSnapshot.viewportClass !== nextSnapshot.viewportClass)
      ) {
        startMotionInterrupt(root, screenHost, appState, motionController, "viewport-change", {
          kind: "cancel",
          from: previousSnapshot.viewportClass,
          to: nextSnapshot.viewportClass
        });
        startViewportOrientationMotion(root, screenHost, appState, motionController, previousSnapshot, nextSnapshot);
      }
      viewportSnapshot = nextSnapshot;
      adjustReaderDropdownPlacement(screenHost);
      attachReaderControlDockMotionState(screenHost, appState, motionController);
    };
    const syncMotionPreference = () => {
      applyMotionPreference(root, motionMediaQuery);
      if (motionController) {
        motionController.setReducedMotion(root.getAttribute("data-motion-reduced") === "true");
      }
    };
    const handleMotionPreferenceChange = syncMotionPreference;
    window.addEventListener("resize", handleViewportChange);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportChange);
    }
    if (motionMediaQuery) {
      if (typeof motionMediaQuery.addEventListener === "function") {
        motionMediaQuery.addEventListener("change", handleMotionPreferenceChange);
      } else if (typeof motionMediaQuery.addListener === "function") {
        motionMediaQuery.addListener(handleMotionPreferenceChange);
      }
    }
    syncMotionPreference();
    target.__readerAdaptiveViewportCleanup = () => {
      clearReaderSessionCapsuleTimer(appState);
      clearFirstOpenMotionTimer(appState);
      clearViewportOrientationMotionTimer(appState);
      clearMotionInterruptTimer(appState);
      cancelPendingRouteRequest("destroy");
      if (motionController) {
        motionController.destroy();
      }
      window.removeEventListener("resize", handleViewportChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportChange);
      }
      if (motionMediaQuery) {
        if (typeof motionMediaQuery.removeEventListener === "function") {
          motionMediaQuery.removeEventListener("change", handleMotionPreferenceChange);
        } else if (typeof motionMediaQuery.removeListener === "function") {
          motionMediaQuery.removeListener(handleMotionPreferenceChange);
        }
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
      applyMotionSelectorBindings(root);
      attachCommonMotionComponentState(root);
      attachSegmentMotionState(root, appState, motionController);
      attachMotionPressState(root, motionController);
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

    function routeStackSignature() {
      return routeStack.join(">");
    }

    function applyAsyncResultMotionState(request) {
      if (!root || !request) return;
      const currentRoute = routeStack[routeStack.length - 1] || "";
      const visibleState = request.state === "completed" && currentRoute && currentRoute !== request.to
        ? "superseded"
        : request.state;
      const visibleReason = visibleState === "superseded" ? "route-left-after-complete" : request.reason || "";
      const attrs = {
        "data-motion-async": "true",
        "data-motion-async-id": request.id,
        "data-motion-async-state": visibleState,
        "data-motion-async-request": String(request.requestId),
        "data-motion-async-from": request.from,
        "data-motion-async-to": request.to,
        "data-motion-async-reason": visibleReason,
        "data-motion-async-stack": request.stack,
        "data-motion-async-current-route": currentRoute,
        "data-motion-async-sequence": String(request.sequence)
      };
      Object.entries(attrs).forEach(([key, value]) => root.setAttribute(key, value));
      if (screenHost) {
        screenHost.setAttribute("data-motion-async-target", "screen-host");
        screenHost.setAttribute("data-motion-async-id", request.id);
        screenHost.setAttribute("data-motion-async-state", visibleState);
        screenHost.setAttribute("data-motion-async-request", String(request.requestId));
        screenHost.setAttribute("data-motion-async-to", request.to);
      }
    }

    function cancelPendingRouteRequest(reason) {
      if (!pendingRouteRequest) return null;
      const request = pendingRouteRequest;
      if (request.timer) {
        window.clearTimeout(request.timer);
        request.timer = null;
      }
      request.state = "cancelled";
      request.reason = reason || "cancelled";
      request.active = false;
      pendingRouteRequest = null;
      appState.asyncRouteRequest = null;
      appState.asyncResultMotion = request;
      applyAsyncResultMotionState(request);
      return request;
    }

    function startPendingRouteRequest(from, to) {
      const sequence = (appState.asyncResultSequence || 0) + 1;
      const request = {
        id: "motion.interrupt.completeThenReplace",
        requestId: `route:${sequence}`,
        sequence,
        state: "pending",
        reason: "reader-route-loading",
        from: from || "",
        to: to || "",
        stack: routeStackSignature(),
        active: true,
        timer: null
      };
      appState.asyncResultSequence = sequence;
      appState.asyncRouteRequest = request;
      appState.asyncResultMotion = request;
      pendingRouteRequest = request;
      applyAsyncResultMotionState(request);
      return request;
    }

    function completePendingRouteRequest(request) {
      const stillCurrent = pendingRouteRequest === request &&
        request?.active &&
        routeStack[routeStack.length - 1] === request.to &&
        routeStackSignature() === request.stack;
      if (!stillCurrent) {
        request.state = "discarded";
        request.reason = "stale-async-result";
        request.active = false;
        appState.asyncResultMotion = request;
        applyAsyncResultMotionState(request);
        return false;
      }
      request.state = "completed";
      request.reason = "loading-complete";
      request.active = false;
      request.timer = null;
      pendingRouteRequest = null;
      appState.asyncRouteRequest = null;
      appState.asyncResultMotion = request;
      applyAsyncResultMotionState(request);
      return true;
    }

    const renderActiveRoute = (route, options) => {
      const renderedTurnDirection = appState.readerTurnDirection;
      syncAppThemeRoot(root, data, appState);
      screenHost.innerHTML = renderRoute(route, data, options, appState);
      updateRouteInfo(route);
      if (!options?.loading && updateReaderPagination(screenHost, data, appState)) {
        syncAppThemeRoot(root, data, appState);
        screenHost.innerHTML = renderRoute(route, data, options, appState);
        updateRouteInfo(route);
      }
      applyMotionSelectorBindings(screenHost);
      attachCommonMotionComponentState(screenHost);
      attachOverlayMotionState(screenHost, appState);
      attachTabMotionState(screenHost, appState);
      attachSegmentMotionState(screenHost, appState, motionController);
      adjustReaderDropdownPlacement(screenHost);
      attachDropdownMotionState(screenHost, appState, motionController);
      attachReaderEntryMotionState(screenHost, appState);
      attachReaderControlHandleMotionState(screenHost);
      attachReaderControlDockMotionState(screenHost, appState, motionController);
      attachReaderSessionCapsuleMotionState(screenHost, appState, motionController);
      attachReaderControlSpaceMotionState(screenHost, appState, motionController);
      attachFirstOpenMotionState(root, screenHost, appState);
      if (appState.motionInterruptMotion) {
        applyMotionInterruptState(root, screenHost, appState, appState.motionInterruptMotion, {});
      }
      if (appState.asyncResultMotion) {
        applyAsyncResultMotionState(appState.asyncResultMotion);
      }
      if (appState.viewportOrientationMotion) {
        applyViewportOrientationMotionAttributes(root, screenHost, appState, appState.viewportOrientationMotion);
      }
      window.requestAnimationFrame(() => {
        if (screenHost.isConnected) {
          attachReaderControlDockMotionState(screenHost, appState, motionController);
          if (appState.motionInterruptMotion) {
            applyMotionInterruptState(root, screenHost, appState, appState.motionInterruptMotion, {});
          }
          if (appState.asyncResultMotion) {
            applyAsyncResultMotionState(appState.asyncResultMotion);
          }
          if (appState.viewportOrientationMotion) {
            applyViewportOrientationMotionAttributes(root, screenHost, appState, appState.viewportOrientationMotion);
          }
          attachOverlayMotionState(screenHost, appState);
          attachCommonMotionComponentState(screenHost);
        }
      });
      attachMotionPressState(screenHost, motionController);
      attachScreenInteractions(screenHost, goTo, goBack, goTab, replaceTopRoute, exitReader, appState, data, renderCurrentRoute, motionController);
      scheduleReaderSessionCapsuleTick(screenHost, appState, data, renderCurrentRoute);
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

    const goTo = (route, shouldPush, motionInput) => {
      if (!routes[route]) {
        return;
      }
      cancelPendingRouteRequest("route-change");
      const previous = routeStack[routeStack.length - 1];
      if (hasRenderedInitialRoute) {
        const isPopMotion = motionInput?.id === "app.route.pop.backward" || motionInput?.action === "pop";
        startMotionInterrupt(root, screenHost, appState, motionController, isPopMotion ? "back" : shouldPush ? "route-push" : "route-replace", {
          kind: isPopMotion ? "cancel" : shouldPush ? "redirect" : "completeThenReplace",
          from: previous,
          to: route
        });
      }
      if (shouldPush && previous !== route) {
        routeStack.push(route);
      }
      if (motionController) {
        const routeAction = hasRenderedInitialRoute ? (shouldPush ? "push" : "replace") : "firstOpen";
        if (routeAction === "firstOpen" && !appState.hasPlayedFirstOpen) {
          appState.firstOpenMotion = {
            id: "app.firstOpen.enter",
            route,
            state: "entering",
            settled: false
          };
        }
        motionController.start(motionInput || {
          id: routeAction === "firstOpen"
            ? "app.firstOpen.enter"
            : routeAction === "push"
              ? "app.route.push.forward"
              : "app.route.replace",
          action: routeAction,
          from: previous,
          to: route
        });
      }
      appState.settingsOverlay = "";
      appState.settingsExpandedOption = "";
      appState.settingsToast = "";
      appState.mainTabFeedback = "";
      appState.readerMoreOpen = false;
      appState.discoverSortOpen = false;
      if (shouldLoadReaderTransition(previous, route)) {
        const request = startPendingRouteRequest(previous, route);
        renderActiveRoute(route, { loading: true });
        hasRenderedInitialRoute = true;
        request.timer = window.setTimeout(() => {
          if (!completePendingRouteRequest(request)) return;
          startMotionInterrupt(root, screenHost, appState, motionController, "loading-complete", {
            kind: "completeThenReplace",
            from: "loading",
            to: route
          });
          renderActiveRoute(route);
        }, motionAsyncDelay);
        return;
      }
      renderActiveRoute(route);
      hasRenderedInitialRoute = true;
    };

    const goTab = (route) => {
      if (!routes[route]) {
        return;
      }
      cancelPendingRouteRequest("tab-switch");
      appState.settingsOverlay = "";
      appState.settingsExpandedOption = "";
      appState.settingsToast = "";
      appState.mainTabFeedback = "";
      appState.readerMoreOpen = false;
      appState.discoverSortOpen = false;
      const previous = routeStack[routeStack.length - 1];
      startMotionInterrupt(root, screenHost, appState, motionController, "tab-switch", {
        kind: "redirect",
        from: previous,
        to: route
      });
      appState.mainTabMotion = {
        action: previous === route ? "select" : "switch",
        from: previous,
        to: route,
        settled: false
      };
      if (motionController) {
        motionController.start({
          id: previous === route ? "tab.item.press" : "tab.item.switch",
          action: previous === route ? "press" : "switch",
          from: previous,
          to: route
        });
      }
      routeStack.splice(0, routeStack.length, route);
      renderActiveRoute(route);
      hasRenderedInitialRoute = true;
    };

    const replaceTopRoute = (route, motionInput) => {
      if (!routes[route]) {
        return;
      }
      cancelPendingRouteRequest("route-replace");
      const previous = routeStack[routeStack.length - 1] || "";
      startMotionInterrupt(root, screenHost, appState, motionController, "route-replace", {
        kind: "completeThenReplace",
        from: previous,
        to: route
      });
      if (routeStack.length === 0) {
        routeStack.push(route);
      } else {
        routeStack[routeStack.length - 1] = route;
      }
      if (motionController) {
        motionController.start(motionInput || {
          id: "app.route.replace",
          action: "replace",
          from: previous,
          to: route
        });
      }
      appState.settingsOverlay = "";
      appState.settingsExpandedOption = "";
      appState.settingsToast = "";
      appState.mainTabFeedback = "";
      appState.readerMoreOpen = false;
      appState.discoverSortOpen = false;
      renderActiveRoute(route);
      hasRenderedInitialRoute = true;
    };

    const exitReader = () => {
      cancelPendingRouteRequest("reader-exit");
      const fromRoute = routeStack[routeStack.length - 1] || "reader";
      startMotionInterrupt(root, screenHost, appState, motionController, "reader-exit", {
        kind: "cancel",
        from: fromRoute,
        to: "bookshelf"
      });
      while (routeStack.length > 1 && isReaderStateRoute(routeStack[routeStack.length - 1])) {
        routeStack.pop();
      }
      const targetRoute = routeStack[routeStack.length - 1];
      if (targetRoute && !isReaderStateRoute(targetRoute)) {
        if (motionController) {
          motionController.start({
            id: "app.route.pop.backward",
            action: "reader-exit",
            from: fromRoute,
            to: targetRoute
          });
        }
        renderActiveRoute(targetRoute);
        return;
      }
      routeStack.splice(0, routeStack.length, "bookshelf");
      if (motionController) {
        motionController.start({
          id: "app.route.pop.backward",
          action: "reader-exit",
          from: fromRoute,
          to: "bookshelf"
        });
      }
      renderActiveRoute("bookshelf");
    };

    function goBack() {
      if (routeStack.length <= 1) {
        return;
      }
      cancelPendingRouteRequest("back");
      const fromRoute = routeStack[routeStack.length - 1];
      routeStack.pop();
      const toRoute = routeStack[routeStack.length - 1];
      appState.settingsOverlay = "";
      appState.settingsExpandedOption = "";
      appState.settingsToast = "";
      appState.mainTabFeedback = "";
      appState.readerMoreOpen = false;
      goTo(toRoute, false, {
        id: "app.route.pop.backward",
        action: "pop",
        from: fromRoute,
        to: toRoute
      });
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

  function attachScreenInteractions(screenHost, goTo, goBack, goTab, replaceTopRoute, exitReader, appState, data, renderCurrentRoute, motionController) {
    const roundTo = (value, digits) => Number(value.toFixed(digits));
    const dialogFocusableSelector = [
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "a[href]",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",");
    const visibleDialogFocusables = (dialog) => Array.from(dialog.querySelectorAll(dialogFocusableSelector)).filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    });
    const focusInitialDialogControl = (dialog) => {
      if (!dialog) {
        return;
      }
      const target = dialog?.querySelector("[data-dialog-initial-focus]") || visibleDialogFocusables(dialog)[0];
      if (target && typeof target.focus === "function") {
        window.setTimeout(() => target.focus({ preventScroll: true }), 0);
      }
    };
    const closeDemoDialog = (dialog) => {
      const routeBack = dialog?.querySelector("[data-route-back]");
      if (routeBack) {
        routeBack.click();
        return;
      }
      const closeButton = dialog?.querySelector("[data-close-dialog]");
      if (closeButton) {
        closeButton.click();
      }
    };
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
    const applyReaderChapterDownload = (key) => {
      if (!key) {
        return;
      }
      appState.readerChapterDownloads = appState.readerChapterDownloads || {};
      appState.readerChapterDownloadCompleted = appState.readerChapterDownloadCompleted || {};
      appState.readerChapterDownloadTimers = appState.readerChapterDownloadTimers || {};
      const currentState = appState.readerChapterDownloads[key] || "";
      if (currentState === "loading" || currentState === "complete" || currentState === "cached") {
        return;
      }
      window.clearTimeout(appState.readerChapterDownloadTimers[key]);
      window.clearTimeout(appState.readerChapterDownloadTimers[`${key}:complete`]);
      delete appState.readerChapterDownloadCompleted[key];
      appState.readerChapterDownloads[key] = "loading";
      renderCurrentRoute();
      appState.readerChapterDownloadTimers[key] = window.setTimeout(() => {
        appState.readerChapterDownloads[key] = "complete";
        appState.readerChapterDownloadCompleted[key] = true;
        renderCurrentRoute();
        appState.readerChapterDownloadTimers[`${key}:complete`] = window.setTimeout(() => {
          appState.readerChapterDownloads[key] = "cached";
          delete appState.readerChapterDownloadCompleted[key];
          renderCurrentRoute();
        }, 720);
      }, 880);
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
    const applyReaderReplacementRuleToggle = (ruleId) => {
      const target = readerReplacementRules(appState).find((rule) => rule.id === ruleId);
      if (!target) return;
      appState.readerReplacementRules = Object.assign({}, appState.readerReplacementRules, {
        [ruleId]: !target.enabled
      });
      renderCurrentRoute();
    };
    const applyReaderPageSpaceAction = (action) => {
      const pageSpaceConfig = readerPageSpaceConfig(data);
      const pageSpace = appState.readerPageSpace || normalizeReaderPageSpace(data);
      appState.readerPageSpace = pageSpace;
      const updatePageSpaceParam = (key, direction) => {
        const config = pageSpaceConfig[key];
        const nextValue = clamp(Number(pageSpace[key]) + direction * Number(config.step), Number(config.min), Number(config.max));
        pageSpace[key] = Number(config.precision) > 0 ? roundTo(nextValue, Number(config.precision)) : Math.round(nextValue);
      };
      if (action === "top-margin-decrease") updatePageSpaceParam("topMargin", -1);
      if (action === "top-margin-increase") updatePageSpaceParam("topMargin", 1);
      if (action === "side-margin-decrease") updatePageSpaceParam("sideMargin", -1);
      if (action === "side-margin-increase") updatePageSpaceParam("sideMargin", 1);
      if (action === "paragraph-indent-decrease") updatePageSpaceParam("paragraphIndent", -1);
      if (action === "paragraph-indent-increase") updatePageSpaceParam("paragraphIndent", 1);
      if (action === "reset") appState.readerPageSpace = normalizeReaderPageSpace(data);
      appState.readerPageIndex = 0;
      appState.readerPaginationKey = "";
      appState.readerPages = [];
      renderCurrentRoute();
    };
    const applyReaderPageSpaceSet = (key, value) => {
      const pageSpaceConfig = readerPageSpaceConfig(data);
      const pageSpace = appState.readerPageSpace || normalizeReaderPageSpace(data);
      appState.readerPageSpace = pageSpace;
      if (key === "texture" && pageSpaceConfig.textureOptions.some((item) => item.value === value)) {
        pageSpace.texture = value;
      }
      appState.readerPaginationKey = "";
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
        tts.sentenceIndex = readerTtsSentenceIndex(data, appState);
        if (tts.playing) {
          appState.readerAutoPageSession = false;
          appState.readerSettings.autoPage = false;
          replaceTopRoute("immersive-reading", {
            id: "reader.session.tts.start",
            action: "session-start",
            from: currentRoute(),
            to: "immersive-reading"
          });
          return;
        }
      }
      if (action === "prev") tts.sentenceIndex = clamp((tts.sentenceIndex || ttsConfig.defaults.sentenceIndex) - 1, ttsConfig.sentenceMin, ttsConfig.sentenceMax);
      if (action === "next") tts.sentenceIndex = clamp((tts.sentenceIndex || ttsConfig.defaults.sentenceIndex) + 1, ttsConfig.sentenceMin, ttsConfig.sentenceMax);
      renderCurrentRoute();
    };
    const stopReaderSession = (type) => {
      appState.readerSettingsExpandedOption = "";
      appState.readerTtsExpandedOption = "";
      if (type === "autoPage") {
        appState.readerAutoPageSession = false;
        appState.readerAutoPageCountdown = 8;
        appState.readerSettings.autoPage = false;
      }
      if (type === "tts") {
        appState.readerTtsSession = false;
        appState.readerTts.playing = false;
      }
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
          replaceTopRoute("immersive-reading", {
            id: "reader.session.autoPage.start",
            action: "session-start",
            from: currentRoute(),
            to: "immersive-reading"
          });
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
        coverHost.style.setProperty("--focus-cover", `url("${stylesheetRelativeAsset(coverSrc)}")`);
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

    screenHost.querySelectorAll("[data-bookshelf-filter-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        appState.bookshelfFilterOpen = button.getAttribute("aria-expanded") !== "true";
        closeFilterDisclosures("bookshelfFilterOpen");
        renderCurrentRoute();
      });
    });

    screenHost.querySelectorAll("[data-bookshelf-group-option]").forEach((button) => {
      button.addEventListener("click", () => {
        appState.bookshelfGroup = button.getAttribute("data-bookshelf-group-option") || "全部";
        appState.bookshelfFilterOpen = true;
        renderCurrentRoute();
      });
    });

    screenHost.querySelectorAll("[data-bookshelf-sort-option]").forEach((button) => {
      button.addEventListener("click", () => {
        appState.bookshelfSort = button.getAttribute("data-bookshelf-sort-option") || "最近更新";
        appState.bookshelfFilterOpen = true;
        renderCurrentRoute();
      });
    });

    screenHost.querySelectorAll("[data-bookshelf-filter-option]").forEach((button) => {
      button.addEventListener("click", () => {
        appState.bookshelfFilter = button.getAttribute("data-bookshelf-filter-option") || "全部";
        appState.bookshelfFilterOpen = true;
        renderCurrentRoute();
      });
    });

    const closeBookshelfMore = (phone) => {
      const layer = phone?.querySelector("[data-bookshelf-more-layer]");
      if (layer) {
        layer.setAttribute("aria-hidden", "true");
      }
    };

    const currentRoute = () => screenHost.closest(".fd-demo")?.getAttribute("data-current-route") || "";
    const filterOpenKeys = ["bookshelfFilterOpen", "discoverFilterOpen", "rssGroupFilterOpen", "rssManageFilterOpen", "rssCategoryFilterOpen", "rssFavoriteFilterOpen", "sourceFilterOpen"];
    const closeFilterDisclosures = (exceptKey) => {
      filterOpenKeys.forEach((key) => {
        if (key !== exceptKey) {
          appState[key] = false;
        }
      });
    };
    const setMainTabFeedback = (message) => {
      appState.mainTabFeedback = message;
      renderCurrentRoute();
    };
    const handleTopAction = (button) => {
      const action = button.getAttribute("data-top-action") || button.getAttribute("aria-label") || "";
      const route = currentRoute();
      if (action === "search") {
        if (route === "bookshelf" || route === "bookshelf-empty" || route === "sort-filter" || route === "discover") {
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
        if (route === "bookshelf" || route === "bookshelf-empty" || route === "sort-filter") {
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
      if (action === "source-stack") {
        if (route === "rss" || route.startsWith("rss-")) {
          goTo("rss-subscription-management", true);
          return;
        }
      }
      if (action === "refresh") {
        if (route === "discover" || route.startsWith("discover-")) {
          goTo("discover-refreshing", true);
          return;
        }
        if (route === "rss" || route.startsWith("rss-")) {
          goTo("rss-refreshing", true);
          return;
        }
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
        startOverlayMotion(screenHost, appState, motionController, overlay === "sheet" ? "sheet" : "dialog", "open", trigger);
        appState.settingsOverlay = overlay;
        appState.settingsToast = "";
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
        const resultToast = button.getAttribute("data-settings-confirm-result") || "";
        const overlay = appState.settingsOverlay || "";
        startOverlayMotion(screenHost, appState, motionController, overlay === "sheet" ? "sheet" : "dialog", "close", button);
        appState.settingsOverlay = "";
        appState.settingsToast = resultToast;
        renderCurrentRoute();
        restoreOverlayMotionFocus(appState);
      });
    });

    screenHost.querySelectorAll("[data-settings-option-key]").forEach((targetEl) => {
      const toggleOption = () => {
        const key = targetEl.getAttribute("data-settings-option-key") || "";
        appState.settingsOverlay = "";
        appState.settingsExpandedOption = appState.settingsExpandedOption === key ? "" : key;
        appState.settingsToast = "";
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
        appState.settingsToast = "";
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
        closeFilterDisclosures();
        appState.sourceMenuOpen = !appState.sourceMenuOpen;
        renderCurrentRoute();
      });
    });

    [
      ["[data-discover-filter-toggle]", "discoverFilterOpen"],
      ["[data-rss-group-filter-toggle]", "rssGroupFilterOpen"],
      ["[data-rss-manage-filter-toggle]", "rssManageFilterOpen"],
      ["[data-rss-category-filter-toggle]", "rssCategoryFilterOpen"],
      ["[data-rss-favorite-filter-toggle]", "rssFavoriteFilterOpen"],
      ["[data-source-filter-toggle]", "sourceFilterOpen"]
    ].forEach(([selector, key]) => {
      screenHost.querySelectorAll(selector).forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const next = !appState[key];
          closeFilterDisclosures(key);
          appState[key] = next;
          renderCurrentRoute();
        });
      });
    });

    screenHost.querySelectorAll("[data-rss-group-filter]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        appState.rssGroupFilter = button.getAttribute("data-rss-group-filter") || "全部";
        appState.rssGroupFilterOpen = false;
        renderCurrentRoute();
      });
    });

    screenHost.querySelectorAll("[data-rss-manage-filter]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        appState.rssManageFilter = button.getAttribute("data-rss-manage-filter") || "全部";
        appState.rssManageFilterOpen = false;
        renderCurrentRoute();
      });
    });

    screenHost.querySelectorAll("[data-rss-category-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        appState.rssCategoryFilterOpen = false;
      });
    });

    screenHost.querySelectorAll("[data-rss-favorite-filter]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        appState.rssFavoriteFilter = button.getAttribute("data-rss-favorite-filter") || "默认分组";
        appState.rssFavoriteFilterOpen = false;
        renderCurrentRoute();
      });
    });

    screenHost.querySelectorAll("[data-source-status-filter]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        appState.sourceStatusFilter = button.getAttribute("data-source-status-filter") || "全部";
        appState.sourceFilterOpen = false;
        renderCurrentRoute();
      });
    });

    screenHost.querySelectorAll("[data-source-group-filter]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        appState.sourceGroupFilter = button.getAttribute("data-source-group-filter") || "全部分组";
        appState.sourceFilterOpen = false;
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

    screenHost.querySelectorAll("[data-discover-sort-toggle]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeFilterDisclosures("discoverFilterOpen");
        appState.discoverFilterOpen = true;
        appState.discoverSortOpen = !appState.discoverSortOpen;
        renderCurrentRoute();
      });
    });

    screenHost.querySelectorAll("[data-discover-sort-option]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        appState.discoverSort = button.getAttribute("data-discover-sort-option") || "";
        appState.discoverFilterOpen = false;
        appState.discoverSortOpen = false;
        renderCurrentRoute();
      });
    });

    screenHost.querySelectorAll("[data-restore-scope]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const key = button.getAttribute("data-restore-scope") || "";
        const available = restoreAvailableScopeKeys(appState);
        if (!available.includes(key)) return;
        const selected = restoreSelectedScopeKeys(appState);
        const next = selected.includes(key)
          ? selected.filter((item) => item !== key)
          : selected.concat(key);
        appState.restoreSelectedScopes = next.length ? next : selected;
        renderCurrentRoute();
      });
    });

    screenHost.querySelectorAll("[data-route]").forEach((targetEl) => {
      if (targetEl.hasAttribute("data-book-cover")) {
        return;
      }
      if (targetEl.closest("[inert]")) {
        return;
      }
      const navigate = (event) => {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        const route = targetEl.getAttribute("data-route");
        const shouldReplaceRoute = targetEl.hasAttribute("data-route-replace") || Boolean(targetEl.closest(".fd-source-control-continuity"));
        const readerModuleButton = targetEl.classList.contains("fd-reader-module") ? targetEl : null;
        const readerModuleMotionInput = (() => {
          if (!readerModuleButton) return null;
          const fromState = readerRouteState(currentRoute());
          const fromModule = fromState.module || fromState.mode || "reader";
          const toModule = readerModuleButton.getAttribute("data-module") || "reader";
          appState.readerModuleMotion = {
            action: fromModule === toModule ? "select" : "switch",
            from: fromModule,
            to: toModule,
            settled: false
          };
          return {
            id: "reader.module.switch",
            action: fromModule === toModule ? "select" : "switch",
            from: fromModule,
            to: toModule,
            target: readerModuleButton
          };
        })();
        const readerEntryMotionInput = (() => {
          if (route !== "immersive-reading" || currentRoute() === "immersive-reading") return null;
          appState.readerEntryMotion = readerEntryMotionFromElement(targetEl, screenHost, currentRoute(), route, "action");
          return {
            id: "reader.entry.actionToImmersive",
            action: "action-route",
            from: currentRoute(),
            to: route,
            target: targetEl
          };
        })();
        const routeMotionInput = readerModuleMotionInput || readerEntryMotionInput;
        if (targetEl.classList.contains("fd-reader-module") && route === currentRoute()) {
          appState.readerModuleMotion = {
            action: "switch",
            from: targetEl.getAttribute("data-module") || "module",
            to: "control",
            settled: false
          };
          replaceTopRoute("reader", Object.assign({}, readerModuleMotionInput, {
            action: "switch",
            from: targetEl.getAttribute("data-module") || "module",
            to: "control"
          }));
          return;
        }
        if (route === "book-search") {
          appState.bookSearchPhase = "before";
        }
        if (targetEl.hasAttribute("data-discover-reset")) {
          appState.discoverEntry = "";
          appState.discoverFilter = "男频";
          appState.discoverSort = "";
          appState.discoverFilterOpen = false;
          appState.discoverSortOpen = false;
        } else {
          if (targetEl.hasAttribute("data-discover-entry")) {
            appState.discoverEntry = targetEl.getAttribute("data-discover-entry") || "";
          }
          if (targetEl.hasAttribute("data-discover-filter")) {
            appState.discoverFilter = targetEl.getAttribute("data-discover-filter") || "男频";
            appState.discoverFilterOpen = false;
            appState.discoverSortOpen = false;
          }
          if (targetEl.hasAttribute("data-discover-sort")) {
            appState.discoverSort = targetEl.getAttribute("data-discover-sort") || "";
            appState.discoverFilterOpen = false;
            appState.discoverSortOpen = false;
          }
        }
        if (targetEl.hasAttribute("data-filter-close")) {
          closeFilterDisclosures();
          appState.discoverSortOpen = false;
        }
        if (targetEl.hasAttribute("data-restore-record")) {
          appState.selectedRestoreRecord = targetEl.getAttribute("data-restore-record") || "";
          const scopeKeys = (targetEl.getAttribute("data-restore-scopes") || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
          appState.restoreAvailableScopes = scopeKeys.length ? scopeKeys : restoreDefaultScopeKeys();
          appState.restoreSelectedScopes = appState.restoreAvailableScopes.slice();
        }
        if (targetEl.closest("[data-reader-more-layer]")) {
          appState.readerMoreOpen = false;
        }
        closeBookshelfMore(targetEl.closest(".fd-phone"));
        if (shouldReplaceRoute) {
          replaceTopRoute(route, routeMotionInput || undefined);
          return;
        }
        goTo(route, true, routeMotionInput || undefined);
      };
      targetEl.addEventListener("click", navigate);
      targetEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate(event);
        }
      });
    });

    screenHost.querySelectorAll(".fd-reader-grabber[data-route], .fd-reader-full-grabber[data-route]").forEach((button) => {
      let startX = 0;
      let startY = 0;
      let dragStarted = false;
      let dragMotionStarted = false;
      let dockDragActive = false;
      let dockDragMotionStarted = false;
      let dockLongPressTimer = null;
      let dockDragStartOffset = zeroDockOffset();
      let lastDeltaX = 0;
      let suppressNextClick = false;
      let activePointerId = null;
      let lastDeltaY = 0;
      const root = screenHost.closest(".fd-demo");
      const reduced = () => root?.getAttribute("data-motion-reduced") === "true";
      const routeForButton = (deltaY) => readerControlHandleTargetRoute(button, deltaY);
      const handleMotionInput = (motionId, action, deltaY) => ({
        id: motionId,
        action,
        from: currentRoute(),
        to: routeForButton(deltaY),
        target: button
      });
      const dockCanDrag = () => button.classList.contains("fd-reader-grabber") && readerControlDockMovable(screenHost);
      const clearDockLongPress = () => {
        if (dockLongPressTimer) {
          window.clearTimeout(dockLongPressTimer);
          dockLongPressTimer = null;
        }
      };
      const dockMotionInput = (motionId, action, offset) => ({
        id: motionId,
        action,
        from: currentRoute(),
        to: currentRoute(),
        target: button,
        dockOffset: `${offset.x},${offset.y}`,
        viewportClass: readerControlDockViewportClass(screenHost)
      });
      const startDockDrag = () => {
        if (activePointerId == null || !dockCanDrag()) return;
        const key = readerControlDockOffsetKey(screenHost);
        dockDragStartOffset = normalizeDockOffset(appState.readerDockOffsets?.[key] || zeroDockOffset());
        startMotionInterrupt(root, screenHost, appState, motionController, "drag-start", {
          kind: "cancel",
          from: currentRoute(),
          to: currentRoute()
        });
        dockDragActive = true;
        dragStarted = true;
        suppressNextClick = true;
        setReaderControlDockState(screenHost, appState, "armed", {
          offset: dockDragStartOffset,
          motionId: "reader.control.dock.longPress"
        });
        if (motionController) {
          motionController.start(dockMotionInput("reader.control.dock.longPress", "dock-long-press", dockDragStartOffset));
        }
      };
      const updateDockDrag = (deltaX, deltaY) => {
        if (!dockDragActive) return;
        const nextOffset = {
          x: dockDragStartOffset.x + deltaX,
          y: dockDragStartOffset.y + deltaY
        };
        const result = setReaderControlDockState(screenHost, appState, "dragging", {
          offset: nextOffset,
          motionId: "reader.control.dock.drag"
        });
        if (!dockDragMotionStarted && motionController) {
          motionController.start(dockMotionInput("reader.control.dock.drag", "dock-drag", result?.offset || normalizeDockOffset(nextOffset)));
          dockDragMotionStarted = true;
        }
      };
      const finishDockDrag = (deltaX, deltaY, cancelled) => {
        const nextOffset = cancelled
          ? dockDragStartOffset
          : {
            x: dockDragStartOffset.x + deltaX,
            y: dockDragStartOffset.y + deltaY
          };
        const result = setReaderControlDockState(screenHost, appState, cancelled ? "rebound" : "settled", {
          offset: nextOffset,
          commit: true,
          motionId: cancelled ? "reader.control.dock.rebound" : "reader.control.dock.release"
        });
        if (motionController) {
          const motionId = cancelled ? "reader.control.dock.rebound" : "reader.control.dock.release";
          motionController.start(dockMotionInput(motionId, cancelled ? "dock-cancel" : "dock-release", result?.offset || normalizeDockOffset(nextOffset)));
        }
        dockDragActive = false;
        dockDragMotionStarted = false;
      };
      const commitHandleRoute = (source, deltaY) => {
        const route = routeForButton(deltaY);
        if (!route) return;
        const action = readerControlHandleAction(button, deltaY);
        setReaderControlHandleState(button, "releasing", { offsetY: 0, deltaY });
        const motionInput = handleMotionInput("reader.control.handle.release", `handle-${action}-${source}`, deltaY);
        if (button.hasAttribute("data-route-replace") && route === (button.getAttribute("data-route") || "")) {
          replaceTopRoute(route, motionInput);
          return;
        }
        goTo(route, true, motionInput);
      };
      const snapBack = () => {
        setReaderControlHandleState(button, "releasing", { offsetY: 0 });
        if (motionController) {
          motionController.start(handleMotionInput("reader.control.handle.release", "handle-snap", 0));
        }
        const settle = () => {
          if (button.isConnected) {
            setReaderControlHandleState(button, "idle", { offsetY: 0 });
          }
        };
        if (reduced()) {
          settle();
        } else {
          window.setTimeout(settle, 140);
        }
      };
      const cleanupGlobalHandleRelease = () => {
        clearDockLongPress();
        window.removeEventListener("pointerup", onWindowPointerUp, true);
        window.removeEventListener("pointercancel", onWindowPointerCancel, true);
        window.removeEventListener("mouseup", onWindowMouseUp, true);
      };
      const finishHandleGesture = (deltaX, deltaY, source) => {
        if (activePointerId == null) return;
        const pointerId = activePointerId;
        activePointerId = null;
        cleanupGlobalHandleRelease();
        button.releasePointerCapture?.(pointerId);
        if (dockDragActive) {
          suppressNextClick = true;
          finishDockDrag(deltaX, deltaY, false);
          return;
        }
        if (dragStarted) {
          suppressNextClick = true;
          if (readerControlHandleShouldCommit(deltaY, readerControlHandleAction(button, deltaY))) {
            commitHandleRoute(source, deltaY);
          } else {
            snapBack();
          }
          return;
        }
        setReaderControlHandleState(button, "idle", { offsetY: 0 });
      };
      function onWindowPointerUp(event) {
        if (activePointerId !== event.pointerId) return;
        finishHandleGesture(event.clientX - startX, event.clientY - startY, "drag");
      }
      function onWindowPointerCancel(event) {
        if (activePointerId !== event.pointerId) return;
        activePointerId = null;
        cleanupGlobalHandleRelease();
        suppressNextClick = true;
        startMotionInterrupt(root, screenHost, appState, motionController, "pointer-cancel", {
          kind: "cancel",
          from: currentRoute(),
          to: currentRoute()
        });
        if (dockDragActive) {
          finishDockDrag(lastDeltaX, lastDeltaY, true);
        } else {
          snapBack();
        }
      }
      function onWindowMouseUp(event) {
        if (activePointerId == null) return;
        finishHandleGesture(
          Number.isFinite(event.clientX) ? event.clientX - startX : lastDeltaX,
          Number.isFinite(event.clientY) ? event.clientY - startY : lastDeltaY,
          "drag"
        );
      }

      button.addEventListener("pointerdown", (event) => {
        if (event.button && event.button !== 0) return;
        activePointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        lastDeltaX = 0;
        lastDeltaY = 0;
        dragStarted = false;
        dragMotionStarted = false;
        dockDragActive = false;
        dockDragMotionStarted = false;
        suppressNextClick = false;
        button.setPointerCapture?.(event.pointerId);
        window.addEventListener("pointerup", onWindowPointerUp, true);
        window.addEventListener("pointercancel", onWindowPointerCancel, true);
        window.addEventListener("mouseup", onWindowMouseUp, true);
        setReaderControlHandleState(button, "pressed", { offsetY: 0 });
        if (motionController) {
          motionController.start(handleMotionInput("reader.control.handle.press", "handle-press", 0));
        }
        if (dockCanDrag()) {
          clearDockLongPress();
          dockLongPressTimer = window.setTimeout(startDockDrag, 320);
        }
      });

      button.addEventListener("pointermove", (event) => {
        if (activePointerId !== event.pointerId) return;
        const deltaX = event.clientX - startX;
        const deltaY = event.clientY - startY;
        lastDeltaX = deltaX;
        lastDeltaY = deltaY;
        if (dockDragActive) {
          event.preventDefault();
          updateDockDrag(deltaX, deltaY);
          return;
        }
        if (!dragStarted && Math.abs(deltaY) < 4) return;
        clearDockLongPress();
        dragStarted = true;
        suppressNextClick = true;
        event.preventDefault();
        if (!dragMotionStarted && motionController) {
          motionController.start(handleMotionInput("reader.control.handle.drag", "handle-drag", deltaY));
          dragMotionStarted = true;
        }
        setReaderControlHandleState(button, "dragging", {
          offsetY: readerControlHandlePreviewOffset(deltaY, readerControlHandleAction(button, deltaY), reduced()),
          deltaY
        });
      });

      button.addEventListener("pointerup", (event) => {
        if (activePointerId !== event.pointerId) return;
        finishHandleGesture(event.clientX - startX, event.clientY - startY, "drag");
      });

      button.addEventListener("pointercancel", (event) => {
        onWindowPointerCancel(event);
      });

      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        if (suppressNextClick) {
          suppressNextClick = false;
          return;
        }
        commitHandleRoute("click", 0);
      }, true);
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
        const targetRoute = button.getAttribute("data-route") || "immersive-reading";
        appState.readerEntryMotion = readerEntryMotionFromElement(button, screenHost, currentRoute(), targetRoute, "cover");
        goTo(button.getAttribute("data-route") || "immersive-reading", true, {
          id: "reader.entry.coverToImmersive",
          action: "cover-route",
          from: currentRoute(),
          to: targetRoute,
          target: button
        });
      });
      button.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          closeBookFocus(button.closest(".fd-phone"));
          const targetRoute = button.getAttribute("data-route") || "immersive-reading";
          appState.readerEntryMotion = readerEntryMotionFromElement(button, screenHost, currentRoute(), targetRoute, "cover");
          goTo(targetRoute, true, {
            id: "reader.entry.coverToImmersive",
            action: "cover-route",
            from: currentRoute(),
            to: targetRoute,
            target: button
          });
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

    screenHost.querySelectorAll("[data-reader-chapter-download]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (button.getAttribute("aria-disabled") === "true") {
          return;
        }
        applyReaderChapterDownload(button.getAttribute("data-reader-chapter-download") || "");
      });
    });

    screenHost.querySelectorAll("[data-reader-directory-index]").forEach((button) => {
      const activateDirectoryRow = (event) => {
        event.preventDefault();
        applyReaderDirectoryIndex(button.getAttribute("data-reader-directory-index"));
      };
      button.addEventListener("click", activateDirectoryRow);
      button.addEventListener("keydown", (event) => {
        if (event.target !== button || (event.key !== "Enter" && event.key !== " ")) {
          return;
        }
        activateDirectoryRow(event);
      });
    });

    screenHost.querySelectorAll("[data-reader-tts-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        applyReaderTtsAction(button.getAttribute("data-reader-tts-action"));
      });
    });

    screenHost.querySelectorAll("[data-reader-session-stop]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.getAttribute("aria-disabled") === "true") return;
        stopReaderSession(button.getAttribute("data-reader-session-stop"));
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

    screenHost.querySelectorAll("[data-reader-replace-rule]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        applyReaderReplacementRuleToggle(button.getAttribute("data-reader-replace-rule") || "");
      });
    });

    screenHost.querySelectorAll("[data-reader-page-space-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        applyReaderPageSpaceAction(button.getAttribute("data-reader-page-space-action"));
      });
    });

    screenHost.querySelectorAll("[data-reader-page-space-set]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        applyReaderPageSpaceSet(button.getAttribute("data-reader-page-space-set"), button.getAttribute("data-reader-page-space-value") || "");
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
        startOverlayMotion(screenHost, appState, motionController, "keyboard", "open", button);
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
        attachOverlayMotionState(screenHost, appState);
      });
    });

    screenHost.querySelectorAll("[data-close-keyboard]").forEach((button) => {
      button.addEventListener("click", () => {
        const phone = button.closest(".fd-phone");
        startOverlayMotion(screenHost, appState, motionController, "keyboard", "close", button);
        phone.classList.remove("has-keyboard");
        const keyboard = phone.querySelector("[data-keyboard-host]");
        if (keyboard) {
          keyboard.setAttribute("aria-hidden", "true");
        }
        restoreOverlayMotionFocus(appState);
        attachOverlayMotionState(screenHost, appState);
      });
    });

    screenHost.querySelectorAll("[data-open-sheet]").forEach((button) => {
      button.addEventListener("click", () => {
        const phone = button.closest(".fd-phone");
        startOverlayMotion(screenHost, appState, motionController, "sheet", "open", button);
        phone.classList.add("has-sheet");
        const sheet = phone.querySelector("[data-demo-sheet]");
        if (sheet) {
          sheet.setAttribute("aria-hidden", "false");
        }
        attachOverlayMotionState(screenHost, appState);
      });
    });

    screenHost.querySelectorAll("[data-close-sheet]").forEach((button) => {
      button.addEventListener("click", () => {
        const phone = button.closest(".fd-phone");
        startOverlayMotion(screenHost, appState, motionController, "sheet", "close", button);
        phone.classList.remove("has-sheet");
        const sheet = phone.querySelector("[data-demo-sheet]");
        if (sheet) {
          sheet.setAttribute("aria-hidden", "true");
        }
        restoreOverlayMotionFocus(appState);
        attachOverlayMotionState(screenHost, appState);
      });
    });

    screenHost.querySelectorAll("[data-open-dialog]").forEach((button) => {
      button.addEventListener("click", () => {
        const phone = button.closest(".fd-phone");
        startOverlayMotion(screenHost, appState, motionController, "dialog", "open", button);
        phone.classList.add("has-dialog");
        const dialog = phone.querySelector("[data-demo-dialog]");
        if (dialog) {
          dialog.setAttribute("aria-hidden", "false");
          focusInitialDialogControl(dialog);
        }
        attachOverlayMotionState(screenHost, appState);
        window.setTimeout(() => attachOverlayMotionState(screenHost, appState), 40);
      });
    });

    screenHost.querySelectorAll("[data-close-dialog]").forEach((button) => {
      button.addEventListener("click", () => {
        const phone = button.closest(".fd-phone");
        startOverlayMotion(screenHost, appState, motionController, "dialog", "close", button);
        phone.classList.remove("has-dialog");
        const dialog = phone.querySelector("[data-demo-dialog]");
        if (dialog) {
          dialog.setAttribute("aria-hidden", "true");
        }
        restoreOverlayMotionFocus(appState);
        attachOverlayMotionState(screenHost, appState);
      });
    });

    screenHost.querySelectorAll("[data-demo-dialog]").forEach((dialog) => {
      if (dialog.__readerDialogKeyboardBound) {
        return;
      }
      dialog.__readerDialogKeyboardBound = true;
      dialog.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          closeDemoDialog(dialog);
          return;
        }
        if (event.key !== "Tab") {
          return;
        }
        const focusables = visibleDialogFocusables(dialog);
        if (!focusables.length) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        const activeIndex = focusables.indexOf(document.activeElement);
        const baseIndex = activeIndex >= 0 ? activeIndex : event.shiftKey ? 0 : focusables.length - 1;
        const nextIndex = event.shiftKey
          ? (baseIndex - 1 + focusables.length) % focusables.length
          : (baseIndex + 1) % focusables.length;
        focusables[nextIndex].focus({ preventScroll: true });
      });
      if (dialog.getAttribute("aria-hidden") !== "true") {
        focusInitialDialogControl(dialog);
        window.setTimeout(() => attachOverlayMotionState(screenHost, appState), 40);
      }
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
