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

  function chapterIsBookmarked(chapter, appState, chapterIndex) {
    const index = Number(chapterIndex);
    if (Array.isArray(appState?.readerBookmarkIndices) && Number.isFinite(index)) {
      return appState.readerBookmarkIndices.includes(index);
    }
    return chapterHasMarker(chapter, "书签");
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
    const bookmarked = chapterIsBookmarked(chapter, appState, options?.chapterIndex);
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

  function bookSourceType(book) {
    const author = String(book?.author || "");
    const title = String(book?.title || "");
    if (/本地|离线|导入|文档/.test(author) || /本地|离线/.test(title)) {
      return { type: "local", label: "本地", badge: "本地", badgeClass: "is-local", offline: true };
    }
    if (/书源同步/.test(author)) {
      return { type: "synced", label: "网络", badge: "网络", badgeClass: "is-network", offline: false };
    }
    return { type: "network", label: "网络", badge: "网络", badgeClass: "is-network", offline: false };
  }

  function bookCard(data, book, options) {
    const opts = options || {};
    const view = opts.view === "list" ? "list" : "cover";
    const coverSrc = cover(data, book.coverKey);
    const sourceType = bookSourceType(book);
    const groupTag = opts.group || bookshelfBookGroup(book, opts.index || 0);
    const sourceBadge = sourceType.badge
      ? `<span class="fd-book-source-badge ${sourceType.badgeClass}" aria-label="来源：${esc(sourceType.label)}">${esc(sourceType.badge)}</span>`
      : "";
    const offlineMark = sourceType.offline
      ? `<span class="fd-book-offline-mark" aria-label="离线可读">${icon("check", "fd-small-icon")}</span>`
      : "";
    const coverImg = `<img src="${coverSrc}" alt="${esc(book.title)}封面" loading="lazy" data-cover-fallback>`;
    const focusAttrs = book.sourceType === "local" || sourceType.type === "local"
      ? ` data-book-source-type="local"`
      : ` data-book-source-type="${sourceType.type}"`;
    if (view === "list") {
      return `
      <article class="fd-book-card is-list-item" data-book-card${focusAttrs} data-book-group="${esc(groupTag)}" data-book-index="${esc(String(opts.index || 0))}">
        <button class="fd-book-cover-frame" type="button" data-book-cover data-route="immersive-reading" data-book-title="${esc(book.title)}" data-book-author="${esc(book.author)}" data-book-chapter="${esc(book.chapter)}" data-cover-src="${coverSrc}" aria-label="打开 ${esc(book.title)}" data-control-id-family="library.button.bookshelf.default.phone.button.route-immersive-reading" data-control-id="library.button.bookshelf.default.phone.button.route-immersive-reading.row-${esc(String(opts.index || 0))}" data-ui-event="route.push">
          ${coverImg}
          ${sourceBadge}
        </button>
        <div class="fd-book-list-info">
          <strong>${esc(book.title)}</strong>
          <small>${esc(book.author)}</small>
          <small class="fd-book-list-chapter">${esc(book.chapter)}</small>
          <div class="fd-book-list-meta">
            <em class="fd-book-group-tag">${esc(groupTag)}</em>
            ${book.progress ? `<span class="fd-book-progress">${esc(book.progress)}</span>` : ""}
            ${offlineMark}
          </div>
        </div>
      </article>`;
    }
    return `
      <article class="fd-book-card" data-book-card${focusAttrs} data-book-group="${esc(groupTag)}" data-book-index="${esc(String(opts.index || 0))}">
        <button class="fd-book-cover-frame" type="button" data-book-cover data-route="immersive-reading" data-book-title="${esc(book.title)}" data-book-author="${esc(book.author)}" data-book-chapter="${esc(book.chapter)}" data-cover-src="${coverSrc}" aria-label="打开 ${esc(book.title)}" data-control-id-family="library.button.bookshelf.default.phone.button.route-immersive-reading" data-control-id="library.button.bookshelf.default.phone.button.route-immersive-reading.row-${esc(String(opts.index || 0))}" data-ui-event="route.push">
          ${coverImg}
          ${sourceBadge}
        </button>
        <strong>${esc(book.title)}</strong>
        <span>${esc(book.author)}</span>
      </article>`;
  }

  function bookFocusLayer(data, appState) {
    const books = (data.mainTabs && data.mainTabs.books) || [];
    const focusIndex = Math.max(0, Math.min(books.length - 1, Number.parseInt(appState?.bookFocusIndex, 10) || 0));
    const open = Boolean(appState?.bookFocusOpen);
    const book = books[focusIndex] || books[0] || {};
    const sourceType = bookSourceType(book);
    const groupTag = bookshelfBookGroup(book, focusIndex);
    const cacheState = sourceType.offline ? "已缓存可离线阅读" : "未缓存";
    return `
      <section class="fd-book-focus-layer${open ? " is-open" : ""}" data-book-focus-layer aria-hidden="${open ? "false" : "true"}" data-book-focus-index="${esc(String(focusIndex))}" data-back-intercept="${open ? "true" : "false"}" aria-label="书籍封面操作层">
        <button class="fd-book-focus-backdrop" type="button" data-close-book-focus data-book-focus-restore aria-label="关闭书籍操作层并恢复焦点"></button>
        <section class="fd-book-focus-menu" role="dialog" aria-modal="true" aria-label="${esc(book.title || "书籍")}操作">
          <header>
            <span class="fd-book-focus-cover" data-focus-cover aria-hidden="true" style="--focus-cover:url('${coverCss(data, book.coverKey)}')"></span>
            <strong data-focus-title>${esc(book.title || "长夜余火")}</strong>
            <small data-focus-meta>${esc(book.author || "爱潜水的乌贼")} · ${esc(book.chapter || "第 32 章 雨夜")}</small>
            <small class="fd-book-focus-context" data-focus-context>
              <em class="fd-book-group-tag">${esc(groupTag)}</em>
              <span class="fd-book-source-badge ${sourceType.badgeClass}">${esc(sourceType.badge)}</span>
              <span data-focus-cache>${esc(cacheState)}</span>
            </small>
          </header>
          <div>
            <button type="button" data-route="immersive-reading" data-book-focus-action="read">${icon("book-open", "fd-small-icon")}<span>继续阅读</span></button>
            <button type="button" data-route="book-batch-management" data-book-focus-action="batch">${icon("check", "fd-small-icon")}<span>多选</span></button>
            <button type="button" data-book-action="move-group" data-route="group-management" data-book-focus-action="move">${icon("people", "fd-small-icon")}<span>移动分组</span></button>
            <button type="button" data-book-action="cache" data-book-focus-action="cache">${icon("download", "fd-small-icon")}<span>${sourceType.offline ? "管理缓存" : "缓存本书"}</span></button>
            <button type="button" data-route="book-detail" data-book-focus-action="detail">${icon("info", "fd-small-icon")}<span>书籍详情</span></button>
            <button class="is-danger" type="button" data-book-action="delete" data-book-focus-action="delete">${icon("trash", "fd-small-icon")}<span>移出书架</span></button>
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
    const moreItemControlId = {
      "book-batch-management": "library.button.bookshelf.default.phone.button.route-book-batch-management-h-326fea32",
      "group-management": "library.button.bookshelf.default.phone.button.route-group-management-h-2e1ee42f",
      "local-import": "library.button.bookshelf.default.phone.button.route-local-import-h-6d77f0cb"
    };
    const moreItemsHtml = items.map((item) => {
      const cid = item.route ? moreItemControlId[item.route] : null;
      return `
            <button type="button"${item.route ? ` data-route="${esc(item.route)}"` : ` data-book-action="${esc(item.action)}"`}${cid ? ` data-control-id="${cid}"` : ""} data-ui-event="route.push" data-focus-restore-source="bookshelf-more-trigger">
              ${icon(item.icon, "fd-small-icon")}
              <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
            </button>`;
    }).join("");
    return `
      <section class="fd-bookshelf-more-layer" data-bookshelf-more-layer aria-hidden="true" aria-label="书架更多操作" data-sheet-state="closed" data-sheet-role="bookshelf-more" data-sheet-open-trigger="library.button.bookshelf.default.phone.button.top-action-more-h-5fd7b61f">
        <button class="fd-bookshelf-more-backdrop" type="button" data-close-bookshelf-more aria-label="关闭书架更多操作" data-control-id="library.button.bookshelf.default.phone.button.h-ec1177a8" data-ui-event="dropdown.menu.collapse" data-focus-restore-source="bookshelf-more-trigger"></button>
        <section class="fd-bookshelf-more-menu" role="dialog" aria-modal="true" aria-label="书架更多操作" aria-live="polite">
          <h2>书架更多操作</h2>
          ${moreItemsHtml}
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

  function bookIsFinished(book) {
    const chapter = String(book?.chapter || "");
    const title = String(book?.title || "");
    if (/完结|完本|全集|合集|番外|尾声|完结篇/.test(chapter)) {
      return true;
    }
    if (/三体|人间词话|明朝那些事儿/.test(title)) {
      return true;
    }
    return false;
  }

  function bookUpdateFailed(book) {
    const author = String(book?.author || "");
    const title = String(book?.title || "");
    const chapter = String(book?.chapter || "");
    return /书源同步/.test(author) || /长标题测试/.test(title) || /失败|异常|无法/.test(chapter);
  }

  function bookshelfBookMatchesFilter(book, index, filter) {
    const progress = Number.parseInt(String(book.progress || "0").replace("%", ""), 10) || 0;
    if (filter === "未读") {
      return progress < 20;
    }
    if (filter === "已完结") {
      return bookIsFinished(book);
    }
    if (filter === "更新失败") {
      return bookUpdateFailed(book);
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
              <button class="${bookshelfView === "cover" ? "is-active" : ""}" type="button" aria-label="封面视图" data-bookshelf-view-button="cover" aria-pressed="${bookshelfView === "cover" ? "true" : "false"}"${disabled ? " disabled" : ""} data-control-id="library.button.bookshelf.default.phone.button.h-9853c162" data-ui-event="bookshelf.view.switch" data-final-state="${bookshelfView}" data-view-target="cover">${icon("grid", "fd-small-icon")}</button>
              <button class="${bookshelfView === "list" ? "is-active" : ""}" type="button" aria-label="列表视图" data-bookshelf-view-button="list" aria-pressed="${bookshelfView === "list" ? "true" : "false"}"${disabled ? " disabled" : ""} data-control-id="library.button.bookshelf.default.phone.button.h-101bc6a1" data-ui-event="bookshelf.view.switch" data-final-state="${bookshelfView}" data-view-target="list">${icon("list", "fd-small-icon")}</button>
              <button class="${filterActive ? "is-active" : ""}" type="button" aria-label="书架筛选：${esc(state.group)}，${esc(state.sort)}，${esc(state.filter)}" data-bookshelf-filter-toggle aria-expanded="${state.open ? "true" : "false"}"${disabled ? " disabled" : ""} data-control-id="library.button.bookshelf.default.phone.button.h-5e688a2b" data-ui-event="dropdown.trigger.press" data-final-state="${state.open ? "open" : "closed"}">${icon("filter", "fd-small-icon")}</button>
              <button type="button" aria-label="书架显示设置" data-route="bookshelf-search-settings" data-settings-scope="bookshelf-display" data-control-id="library.button.bookshelf.default.phone.button.route-bookshelf-search-settings-h-3170b979" data-ui-event="route.push">${icon("gear", "fd-small-icon")}</button>
            </span>
          </section>`;
  }

  function mainTabBookshelf(data, appState) {
    const books = (data.mainTabs && data.mainTabs.books) || [];
    const bookshelfView = appState?.bookshelfView === "list" ? "list" : "cover";
    const columns = Math.max(2, Math.min(6, Number.parseInt(appState?.bookshelfColumns, 10) || 3));
    const visibleBooks = bookshelfSortedBooks(books, appState);
    const recentIndex = appState?.recentBookIndex != null
      ? Math.max(0, Math.min(books.length - 1, Number.parseInt(appState.recentBookIndex, 10) || 0))
      : books.reduce((best, book, i) => {
          const p = Number.parseInt(String(book.progress || "0").replace("%", ""), 10) || 0;
          return p > best.p ? { p, i } : best;
        }, { p: -1, i: 0 }).i;
    const recent = books[recentIndex] || books[0] || {};
    const shelfState = appState?.bookshelfState;
    const stateBannerHtml = shelfState === "offline"
      ? `<div class="fd-bookshelf-state-banner is-offline" role="status">${icon("offline", "fd-small-icon")}<span>离线模式：仅展示已缓存书籍，可继续阅读缓存内容。</span><button type="button" data-bookshelf-retry>重连</button></div>`
      : shelfState === "error"
        ? `<div class="fd-bookshelf-state-banner is-error" role="alert">${icon("warning", "fd-small-icon")}<span>书架加载失败，已展示本地缓存。</span><button type="button" data-bookshelf-retry>重试</button></div>`
        : "";
    const hasVisible = visibleBooks.length > 0;
    const bookshelfTopBarHtml = `
      <section class="rsk-app-top-bar" data-slot="appTopBar" aria-label="书架顶栏">
        <h1>书架</h1>
        <div class="rsk-top-actions">
          <button class="rsk-icon-button" type="button" data-top-action="search" aria-label="搜索" title="搜索" data-control-id="library.button.bookshelf.default.phone.button.top-action-search-h-1c0d0896" data-ui-event="route.push" data-route="book-search" data-focus-restore-source="bookshelf-search-trigger">${icon("search", "rsk-icon")}</button>
          <button class="rsk-icon-button" type="button" data-top-action="more" aria-label="更多" title="更多" data-control-id="library.button.bookshelf.default.phone.button.top-action-more-h-5fd7b61f" data-ui-event="dropdown.menu.expand" data-bookshelf-more-trigger>${icon("more", "rsk-icon")}</button>
        </div>
      </section>`;
    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone"), {
      data,
      title: "书架",
      activeType: "bookshelf",
      actions: ["search", "more"],
      ariaLabel: "书架",
      topBarHtml: bookshelfTopBarHtml,
      contentHtml: `
        ${stateBannerHtml}
        <section class="fd-continue-card" data-recent-index="${esc(String(recentIndex))}" data-loading-state="ready">
          <button class="fd-continue-cover-button" type="button" data-book-cover data-route="immersive-reading" data-book-title="${esc(recent.title)}" data-book-author="${esc(recent.author)}" data-book-chapter="${esc(recent.chapter)}" data-cover-src="${cover(data, recent.coverKey)}" aria-label="继续阅读 ${esc(recent.title)}" data-control-id="library.button.bookshelf.default.phone.button.route-immersive-reading-h-470de687" data-ui-event="route.push">
            <img src="${cover(data, recent.coverKey)}" alt="${esc(recent.title)}封面" data-cover-fallback>
          </button>
          <div>
            <h2>继续阅读</h2>
            <strong>${esc(recent.title)}</strong>
            <span class="fd-continue-author">${esc(recent.author)}</span>
            ${recent.progress ? `<span class="fd-continue-progress">已读 ${esc(recent.progress)} · ${esc(recent.chapter)}</span>` : `<span class="fd-continue-progress">${esc(recent.chapter)}</span>`}
          </div>
          <button class="fd-continue-action-button" type="button" data-route="immersive-reading" data-control-id="library.button.bookshelf.default.phone.button.route-immersive-reading-h-470de687" data-ui-event="route.push">阅读</button>
        </section>
        <section class="fd-bookshelf-shelf-section" aria-label="我的书架" data-bookshelf-persist="bookshelfView" data-bookshelf-view-current="${bookshelfView}" data-final-state="${bookshelfView}" data-loading-state="ready">
          ${bookshelfSectionHeader(bookshelfView, false, appState)}
          <div class="fd-bookshelf-quick-actions" aria-label="书架快捷操作">
            <button type="button" data-route="book-batch-management" data-control-id="library.button.bookshelf.default.phone.button.route-book-batch-management-h-326fea32" data-ui-event="route.push">${icon("check", "fd-small-icon")}<span>批量管理</span></button>
            <button type="button" data-route="group-management" data-control-id="library.button.bookshelf.default.phone.button.route-group-management-h-2e1ee42f" data-ui-event="route.push">${icon("people", "fd-small-icon")}<span>分组管理</span></button>
            <button type="button" data-route="sort-filter" data-control-id="library.button.bookshelf.default.phone.button.h-170ddc6b" data-ui-event="dropdown.trigger.press">${icon("filter", "fd-small-icon")}<span>排序筛选</span></button>
          </div>
          ${bookshelfFilterPopover(appState, false)}
          ${hasVisible ? `<section class="fd-book-grid ${bookshelfView === "list" ? "is-list-view" : "is-cover-view"}" data-book-grid data-bookshelf-view="${bookshelfView}" data-bookshelf-columns="${esc(String(columns))}" style="--fd-book-grid-columns:${esc(String(columns))}" aria-label="${bookshelfView === "list" ? "书籍列表" : "书籍封面网格"}">
            ${visibleBooks.map((book, index) => bookCard(data, book, { view: bookshelfView, index })).join("")}
          </section>` : `<section class="fd-bookshelf-empty-inline" data-slot="bookshelfEmptyInline"><p>当前筛选下没有书籍。</p><button type="button" data-bookshelf-filter-reset>重置筛选</button></section>`}
        </section>`,
      stateHostHtml: `
        <p class="fd-nav-feedback">当前 Tab：书架</p>
        ${bookFocusLayer(data, appState)}
        ${bookshelfMoreLayer()}`
    }));
  }

  function mainTabFeedbackHtml(appState) {
    const message = appState?.mainTabFeedback || "";
    return message ? `<p class="fd-nav-feedback" data-main-tab-feedback>${esc(message)}</p>` : "";
  }

  function discoverContext(route, appState) {
    const entryRouteMap = {
      "discover-home": "排行榜",
      "discover-entry-ranking": "排行榜",
      "discover-entry-bestseller": "畅销",
      "discover-entry-category": "分类",
      "discover-entry-source": "书源",
      "discover-entry-finished": "完本",
      "discover-entry-latest": "最新",
      "discover-entry-new": "新书",
      "discover-entry-booklist": "书单"
    };
    const filterRouteMap = {
      "discover-filter-keyword": "关键词",
      "discover-filter-male": "男频",
      "discover-filter-female": "女频",
      "discover-filter-source-type": "正版源",
      "discover-filter-category": "分类"
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
    const entries = switched ? ["畅销", "分类", "新书", "完本"] : ["排行榜", "书源", "分类", "完本", "最新", "书单"];
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
      "discover-entry-source": 12,
      "discover-entry-finished": 21,
      "discover-entry-latest": 27,
      "discover-entry-booklist": 14,
      "discover-filter-keyword": 9,
      "discover-filter-source-type": 12,
      "discover-filter-category": 32,
      "discover-filter-female": 16,
      "discover-cache-empty": 0,
      "discover-cache-stale": 18,
      "discover-cache-fresh": 18,
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
      "书源": "discover-entry-source",
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
      "女频": "discover-filter-female",
      "正版源": "discover-filter-source-type",
      "分类": "discover-filter-category"
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
    // B3: source bar 接入 canonical controlId（default state）。
    // 状态变体（error/empty/cache-stale 等）暂复用 default state ID；
    // 缺口登记在 B3 报告中，待 A2 registry 补齐状态变体条目。
    const controlId = expanded
      ? "discover.button.discover-control.default.phone.button.route-discover-h-0f433f80"
      : "discover.button.discover.default.phone.button.route-discover-control-h-c0f15790";
    return `
      <button class="fd-discover-source-bar${expanded ? " is-expanded" : ""}" type="button" data-control-id="${esc(controlId)}" data-ui-event="route.push" data-route="${esc(target)}" aria-expanded="${expanded ? "true" : "false"}">
        <span>${icon("source-stack", "fd-small-icon")}</span>
        <strong>${esc(ctx.source.name)}<small>${esc(ctx.source.meta)}</small></strong>
        ${icon("chevron", "fd-small-icon fd-discover-source-chevron")}
      </button>`;
  }

  function discoverEntryChips(ctx) {
    // B3: 入口 chips 接入 canonical controlId（按语义 slug 映射）。
    const entryControlIds = {
      "排行榜": "discover.button.discover.default.phone.button.route-discover-entry-ranking-h-adeeb905",
      "书源": "discover.button.discover.default.phone.button.route-discover-entry-source-h-3eb72183",
      "分类": "discover.button.discover.default.phone.button.route-discover-entry-category-h-b685e4b5",
      "完本": "discover.button.discover.default.phone.button.route-discover-entry-finished-h-dabbea86",
      "最新": "discover.button.discover.default.phone.button.route-discover-entry-latest-h-b188100a",
      "书单": "discover.button.discover.default.phone.button.route-discover-entry-booklist-h-76acab55",
      "畅销": "discover.button.discover.default.phone.button.route-discover-entry-ranking-h-adeeb905",
      "新书": "discover.button.discover.default.phone.button.route-discover-entry-latest-h-b188100a"
    };
    return `<nav class="fd-discover-entry-row" aria-label="发现入口">
      ${ctx.entries.map((item) => {
        const active = item === ctx.activeEntry;
        const cid = entryControlIds[item] || "";
        return `<button class="${active ? "is-active" : ""}" type="button"${cid ? ` data-control-id="${esc(cid)}" data-ui-event="tab.item.select"` : ""} data-route="${esc(discoverEntryRoute(item))}" data-discover-entry="${esc(item)}"${active ? ' aria-current="page"' : ""}>${esc(item)}</button>`;
      }).join("")}
    </nav>`;
  }

  function discoverFilterBar(ctx, appState) {
    const filters = ["关键词", "男频", "女频", "正版源", "分类"];
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

  function discoverStateSummary(ctx, route) {
    return `<section class="fd-discover-state-summary" data-discover-state aria-label="发现组合状态">
      <small>当前组合</small>
      <span data-discover-state-entry>${esc(ctx.activeEntry)}</span>
      <span data-discover-state-filter>${esc(ctx.activeFilter)}</span>
      <span data-discover-state-sort>${esc(ctx.sort)}</span>
      <button type="button" data-discover-state-persist aria-pressed="false" data-discover-state-route="${esc(route)}">记住组合</button>
    </section>`;
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
        ${mode === "switching" ? `<section class="fd-discover-switch-progress" data-discover-switch-progress data-discover-switch-fallback-route="discover-error" aria-live="polite">
          <h2>切换进度</h2>
          <ol class="fd-discover-switch-steps">
            <li class="is-done">请求书源</li>
            <li class="is-active" data-discover-switch-step="parsing">解析入口</li>
            <li data-discover-switch-step="render">渲染列表</li>
          </ol>
          <small data-discover-switch-timeout>超时 8s 后自动回退原书源</small>
          <div><button type="button" data-route="discover-switched-source" data-discover-switch-confirm>完成切换</button><button type="button" data-route="discover-control" data-discover-switch-cancel>取消回退</button></div>
        </section>` : ""}
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
            <article class="fd-discover-inline-error" data-discover-entry-error>
              ${icon("warning", "fd-small-icon")}
              <span><strong>入口解析失败</strong><small>HTTP 503 · exploreUrl 规则第 12 行解析异常 · 入口：${esc(ctx.activeEntry)}</small></span>
              <div class="fd-discover-inline-error-actions">
                <button type="button" data-route="discover-refreshing" data-discover-entry-retry>重试此入口</button>
                <button type="button" data-route="discover-control" data-discover-entry-skip>跳过继续</button>
                <button type="button" data-route="discover-rule-test">编辑源</button>
              </div>
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
            <button class="${ctx.activeFilter === "男频" ? "is-active" : ""}" type="button" data-control-id="discover.button.discover-control.default.phone.button.route-discover-filter-male-h-265b809d" data-ui-event="filter.apply" data-route="${esc(discoverFilterRoute("男频"))}" data-discover-filter="男频">男频</button>
            <button class="${ctx.activeFilter === "女频" ? "is-active" : ""}" type="button" data-control-id="discover.button.discover-control.default.phone.button.route-discover-filter-female-h-43275f40" data-ui-event="filter.apply" data-route="${esc(discoverFilterRoute("女频"))}" data-discover-filter="女频">女频</button>
            <button type="button" data-control-id="discover.button.discover-control.default.phone.button.route-discover-sort-h-6adc507d" data-ui-event="sort.cycle" data-route="discover-sort" data-discover-sort-toggle aria-expanded="${ctx.sortOpen ? "true" : "false"}">排序：${esc(ctx.sort)}${icon("chevron", "fd-small-icon")}</button>
            <button type="button" data-route="discover" data-discover-reset>重置</button>
            <button class="fd-discover-apply-button is-primary" type="button" data-route="discover">${icon("check", "fd-small-icon")}应用</button>
          </div>
        </section>
        <section>
          <h2>源操作</h2>
          <div class="fd-discover-action-grid">
            <button type="button" data-control-id="discover.button.discover-control.default.phone.button.route-discover-switching-source-h-2b88df49" data-ui-event="route.push" data-route="discover-switching-source">${icon("refresh", "fd-small-icon")}刷新入口</button>
            <button type="button" data-control-id="discover.button.discover-control.default.phone.button.route-discover-cache-confirm-h-6c19d3ba" data-ui-event="route.push" data-route="discover-cache-confirm">${icon("trash", "fd-small-icon")}清缓存</button>
            <button type="button" data-control-id="discover.button.discover-control.default.phone.button.route-discover-source-login-h-9f28109f" data-ui-event="route.push" data-route="discover-source-login">${icon("shield", "fd-small-icon")}登录</button>
            <button type="button" data-control-id="discover.button.discover-control.default.phone.button.route-discover-rule-test-h-5706bebc" data-ui-event="route.push" data-route="discover-rule-test">${icon("edit", "fd-small-icon")}编辑源</button>
            <button type="button" data-control-id="discover.button.discover-control.default.phone.button.route-discover-source-bulk-h-fc79eb67" data-ui-event="route.push" data-route="discover-source-bulk">${icon("source", "fd-small-icon")}管理发现源</button>
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
    return `<section class="fd-discover-page-foot" data-discover-page-foot>
      <small class="fd-discover-page-count" data-discover-page-count>第 2 页 / 共 4 页</small>
      <button class="fd-discover-back-top" type="button" data-route="discover" data-discover-back-top data-discover-smooth-scroll>${icon("top", "fd-small-icon")}回到顶部</button>
    </section>`;
  }

  function discoverDialogHtml() {
    return `
      <section class="fd-discover-dialog-backdrop" aria-hidden="true"></section>
      <section class="fd-discover-confirm-dialog" role="dialog" aria-modal="true" aria-label="清除发现缓存">
        <h2>清除发现缓存？</h2>
        <p>将清除优书网的发现入口缓存，不影响书架和阅读进度。</p>
        <label class="fd-discover-cache-scope"><input type="radio" name="fd-discover-cache-scope" value="current" checked data-discover-cache-scope="current"><span>仅当前源（优书网）</span></label>
        <label class="fd-discover-cache-scope"><input type="radio" name="fd-discover-cache-scope" value="all" data-discover-cache-scope="all"><span>全部发现源</span></label>
        <label class="fd-discover-cache-autorefresh"><input type="checkbox" checked data-discover-cache-autorefresh><span>清除后自动刷新列表</span></label>
        <div>
          <button type="button" data-control-id="discover.button.discover-control.default.phone.button.route-discover-h-0f433f80" data-ui-event="route.push" data-route="discover-control">取消</button>
          <button type="button" data-control-id="discover.button.discover-control.default.phone.button.route-discover-cache-confirm-h-6c19d3ba" data-ui-event="route.push" data-route="discover-cache-toast" data-discover-cache-confirm>确认清除</button>
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
        <section class="fd-discover-empty-state" data-discover-empty>
          ${icon("source-stack", "fd-empty-icon")}
          <h2>当前没有启用发现的书源</h2>
          <p>启用发现后，可以在这里浏览书源提供的排行榜、分类和书单。</p>
          <label class="fd-discover-enable-toggle">${sourceSwitch(false, "启用发现功能")}<span>启用发现功能</span></label>
          <article class="fd-discover-recommend-sources" aria-label="推荐支持发现的书源">
            <small>推荐支持发现的书源</small>
            <div>${["优书网", "起点导入", "轻小说文库"].map((n) => `<button type="button" data-route="discover-source-bulk" data-discover-recommend-source="${esc(n)}">${esc(n)}</button>`).join("")}</div>
          </article>
          <div><button type="button" data-route="source-management">去书源管理</button><button type="button" data-route="source-import-options">导入书源</button></div>
          <small data-discover-empty-note>B3 稳定终态：empty · data-empty="true" · reduced-motion-aware</small>
        </section>`;
    }
    if (route === "discover-error") {
      return `
        ${discoverSourceBar(Object.assign({}, ctx, { source: { name: "优书网", meta: "排行榜 · 解析失败" } }), false, route)}
        <section class="fd-discover-error-card" data-discover-error>
          ${icon("warning", "fd-medium-icon")}
          <h2>发现入口解析失败</h2>
          <p>当前入口返回异常，已保留上一批缓存结果（下方列表标注为缓存）。你可以重试、刷新入口、编辑源或切换书源。</p>
          <details class="fd-discover-error-detail"><summary>错误详情</summary><dl><dt>HTTP 状态</dt><dd>503 Service Unavailable</dd><dt>规则错误</dt><dd>bookList 选择器 .result-list li 未匹配到节点</dd><dt>堆栈</dt><dd>parseExploreEntries @ rule-engine.js:128</dd></dl></details>
          <article class="fd-discover-partial-success" aria-label="部分入口成功"><small>部分入口成功</small><span>排行榜 ✕ · 畅销 ✓ · 分类 ✓ · 完本 ✓</span></article>
          <div><button type="button" data-route="discover-refreshing">重试</button><button type="button" data-route="discover-control">切换书源</button><button type="button" data-route="discover-rule-test">编辑源</button><button type="button" data-route="discover-cache-confirm">清除缓存</button></div>
        </section>
        ${discoverBookRows(data, "discover", true)}`;
    }
    if (route === "discover-cache-empty") {
      return `
        ${discoverSourceBar(ctx, false, route)}
        <section class="fd-discover-empty-state" data-discover-cache-empty>
          ${icon("storage", "fd-empty-icon")}
          <h2>暂无发现缓存</h2>
          <p>当前书源还没有本地发现缓存。首次刷新成功后，会保留入口、筛选条件和结果列表供离线回看。</p>
          <p class="fd-discover-cache-mechanism"><small>缓存机制：首次刷新后才有缓存。无缓存时不可离线浏览，发现页需联网加载。</small></p>
          <div><button type="button" data-route="discover-refreshing">立即刷新</button><button type="button" data-route="discover-control">切换书源</button></div>
        </section>`;
    }
    return `
      ${route === "discover-cache-toast" ? `<section class="fd-discover-toast fd-discover-cache-banner is-fresh" data-discover-cache-toast><span>${icon("check", "fd-small-icon")}已清除优书网发现缓存</span><button type="button" data-route="discover-refreshing" data-discover-cache-autorefresh>${icon("refresh", "fd-small-icon")}立即刷新列表</button></section>` : ""}
      ${route === "discover-cache-stale" ? `<section class="fd-discover-toast fd-discover-cache-banner is-stale" data-discover-cache-stale><span>${icon("storage", "fd-small-icon")}使用 2 小时前缓存 · 更新于 08:32</span><button class="is-primary" type="button" data-route="discover-refreshing" data-discover-cache-force-refresh>${icon("refresh", "fd-small-icon")}强制刷新</button></section>` : ""}
      ${route === "discover-cache-fresh" ? `<section class="fd-discover-toast fd-discover-cache-banner is-fresh" data-discover-cache-fresh><span>${icon("check", "fd-small-icon")}缓存已是最新 · 更新于 10:18</span><button type="button" data-route="discover-refreshing" data-discover-cache-force-refresh>${icon("refresh", "fd-small-icon")}强制刷新</button></section>` : ""}
      ${route === "discover-switched-source" ? `<section class="fd-discover-toast fd-discover-switch-toast" data-discover-switched><span>${icon("check", "fd-small-icon")}已切换到 ${esc(ctx.source.name)}</span><small>延迟 ${esc(ctx.source.speed)} · 健康 ✓ · 共 ${esc(ctx.total)} 项（较原源 +6）</small></section>` : ""}
      ${discoverSourceBar(ctx, expanded, route)}
      ${expanded ? discoverControlPanel(ctx, route === "discover-switching-source" ? "switching" : route === "discover-entry-error" ? "entry-error" : "") : ""}
      ${expanded ? "" : discoverStateSummary(ctx, route)}
      ${expanded ? "" : `${discoverEntryChips(ctx)}${discoverFilterBar(ctx, appState)}`}
      ${refreshing ? `<section class="fd-discover-refresh-line" data-discover-refresh data-discover-pull-refresh data-discover-refresh-fallback-route="discover-error" aria-live="polite"><i></i><span>${route === "discover-login-return" ? "登录成功，正在刷新当前发现入口" : "正在刷新当前列表"}</span><small>${route === "discover-login-return" ? `保持 ${esc(ctx.activeEntry)} · ${esc(ctx.activeFilter)} · ${esc(ctx.sort)}` : "请求入口 2/5"}</small></section>` : ""}
      ${noResults ? `
        <section class="fd-discover-no-results">
          ${icon("search", "fd-empty-icon")}
          <h2>当前条件没有发现结果</h2>
          <p>入口 ${esc(ctx.activeEntry)} · 筛选 ${esc(ctx.activeFilter)} · 排序 ${esc(ctx.sort)} 暂无匹配，可调整条件或查看建议。</p>
          <div><button type="button" data-route="discover" data-discover-reset>重置筛选</button><button type="button" data-route="discover-control">调整筛选</button><button type="button" data-route="discover-refreshing">刷新</button></div>
          <aside class="fd-discover-no-results-suggest" aria-label="搜索建议">
            <small>相似关键词</small>
            <div class="fd-discover-suggest-chips">${["长夜", "余火", "诡秘"].map((k) => `<button type="button" data-route="discover-filter-keyword" data-discover-suggest-keyword="${esc(k)}">${esc(k)}</button>`).join("")}</div>
            <small>热门书籍</small>
            <div class="fd-discover-suggest-chips">${["长夜余火", "诡秘之主", "三体"].map((t) => `<button type="button" data-route="book-detail" data-discover-suggest-book="${esc(t)}">${esc(t)}</button>`).join("")}</div>
          </aside>
        </section>` : `
        ${discoverResultHeader(ctx)}
        ${loading ? `<section class="fd-discover-loading-progress" data-discover-loading data-discover-loading-timeout-route="discover-refreshing" aria-live="polite"><small data-discover-loading-progress>请求入口 2/5 · 已解析 3 个</small></section>${discoverSkeletonList()}` : discoverBookRows(data, route, muted)}
        ${infinite ? `<section class="fd-discover-bottom-loading" data-discover-infinite-scroll data-discover-infinite-loaded="6" data-discover-infinite-total="${esc(ctx.total)}" data-discover-infinite-retry-route="discover-refreshing" data-discover-infinite-end-text="没有更多了" aria-live="polite"><i></i><small>触底自动加载 · 已加载 6/${esc(ctx.total)} 项</small></section>` : ""}
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
            <article><span><strong>登录状态</strong><small>未登录 · 最近检测 10:32 · 检测方式 Cookie 探针</small></span>${sourceBadge({ status: "需登录", tone: "warn" })}</article>
            <article><span><strong>适用范围</strong><small>发现入口、详情页、目录页</small></span>${sourceBadge({ status: "当前源", tone: "good" })}</article>
            <article><span><strong>Cookie 保存</strong><small>仅保存在本机书源配置中</small></span>${sourceSwitch(true, "Cookie 保存")}</article>
            <article><span><strong>Cookie 有效期</strong><small>约 7 天 · 过期后需重新登录</small></span>${sourceBadge({ status: "待监测", tone: "warn" })}</article>
          </section>
          <section class="fd-discover-login-actions">
            <button class="is-primary" type="button" data-action="discover-webview-login" data-route="discover-login-return">${icon("globe", "fd-small-icon")}打开网页登录</button>
            <button type="button" data-action="discover-save-login" data-route="discover-login-return">${icon("check", "fd-small-icon")}保存登录信息</button>
            <button type="button" data-action="discover-recheck-login" data-route="discover-control">${icon("refresh", "fd-small-icon")}重新检测</button>
            <button type="button" data-action="discover-clear-login" data-route="discover-source-login">${icon("trash", "fd-small-icon")}清除登录信息</button>
          </section>
          <section class="fd-discover-login-fail-hint" data-discover-login-fail>
            <small>登录失败处理：Cookie 写入失败或网页登录取消时，保持未登录状态并提示，不会清空既有书源配置。Cookie 临近过期时，发现页会在源栏标注"需重新登录"。</small>
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
        <article class="fd-discover-rule-version" data-discover-rule-version>
          <span><strong>规则版本</strong><small>v3 · 上次测试 10:28 · 作者 admin</small></span>
          <div class="fd-discover-rule-version-actions">
            <button type="button" data-action="discover-rule-rollback" data-discover-rule-rollback="v2">回滚到 v2</button>
            <button type="button" data-action="discover-rule-history" data-discover-rule-history>历史版本</button>
          </div>
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
          <button type="button" data-action="discover-rule-test-run" data-discover-rule-test-run>${icon("play", "fd-small-icon")}测试入口</button>
        </section>
        <section class="fd-discover-rule-result" data-discover-rule-result>
          <h2>测试结果 <button type="button" data-action="discover-rule-edit-jump" data-discover-rule-edit-jump>${icon("edit", "fd-small-icon")}跳转编辑</button></h2>
          <article><strong>生成 5 个入口</strong><small>排行榜、分类、完本、最新、书单</small></article>
          <article><strong>解析到 18 本书</strong><small>首条：长夜余火 · 爱潜水的乌贼</small></article>
          <article class="fd-discover-rule-diff" data-discover-rule-diff>
            <h3>预期对比</h3>
            <table><thead><tr><th>字段</th><th>预期</th><th>实际</th><th>结果</th></tr></thead><tbody>
              <tr><td>入口数</td><td>5</td><td>5</td><td class="is-pass">通过</td></tr>
              <tr><td>书籍数</td><td>18</td><td>18</td><td class="is-pass">通过</td></tr>
              <tr><td>首条书名</td><td>长夜余火</td><td>长夜余火</td><td class="is-pass">通过</td></tr>
              <tr><td>封面 URL</td><td>https://...</td><td>空</td><td class="is-fail">失败</td></tr>
            </tbody></table>
          </article>
        </section>
      </section>`, {
        phoneClass: "fd-discover-subpage-phone",
        trailingHtml: `<button type="button" data-route="discover-control">完成</button>`,
        bottomActionHtml: sourceBottomActions([
          { label: "测试入口", icon: "play", action: "discover-rule-test-run" },
          { label: "保存", icon: "check", route: "discover-control", action: "discover-rule-save" }
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
        <label class="fd-source-search">${icon("search", "fd-small-icon")}<input type="search" placeholder="搜索书源名称或分组" data-discover-source-search aria-label="搜索书源名称或分组"></label>
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
        <section class="fd-discover-bulk-progress" data-discover-bulk-progress aria-live="polite">
          <small data-discover-bulk-status>准备就绪 · 已选 3 个</small>
          <div class="fd-discover-bulk-progress-bar"><i data-discover-bulk-bar style="width:0%"></i></div>
        </section>
        <section class="fd-discover-bulk-result" data-discover-bulk-result hidden>
          <article><strong>启用成功 2 个</strong><small>优书网、起点导入</small></article>
          <article class="is-partial"><strong>部分失败 1 个</strong><small>轻小说文库 · 需登录，已跳过</small><button type="button" data-route="discover-source-login" data-discover-bulk-retry>去登录</button></article>
        </section>
      </section>`, {
        phoneClass: "fd-discover-subpage-phone",
        trailingHtml: `<button type="button" data-route="discover-control">完成</button>`,
        bottomActionHtml: `<div class="fd-source-bottom-bar is-fixed"><button type="button" data-source-action="enable-discover-sources" data-action="enable-discover-sources" data-discover-bulk-action="enable">${icon("check", "fd-small-icon")}启用</button><button type="button" data-source-action="disable-discover-sources" data-action="disable-discover-sources" data-discover-bulk-action="disable">${icon("clear", "fd-small-icon")}禁用</button><button type="button" data-source-action="refresh-discover-sources" data-action="refresh-discover-sources" data-discover-bulk-action="refresh">${icon("refresh", "fd-small-icon")}刷新</button></div>`
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
      { label: "Discussions", route: "rss-source-category-discussions", title: "Discussions", meta: "社区讨论 · 4 条" },
      { label: "Novel", route: "rss-source-category-novel", title: "Novel", meta: "小说订阅 · 6 条" },
      { label: "Tech", route: "rss-source-category-tech", title: "Tech", meta: "技术文章 · 5 条" },
      { label: "Booklist", route: "rss-source-category-booklist", title: "Booklist", meta: "书单更新 · 3 条" }
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
    // B3: RSS 模式导航接入 canonical controlId。
    const modeControlIds = {
      "rss": "rss.button.rss.default.phone.button.route-rss-h-c7ddc5db",
      "rss-all": "rss.button.rss.default.phone.button.route-rss-all-h-6abc4394",
      "rss-starred": "rss.button.rss.default.phone.button.route-rss-starred-h-c5cee3a5",
      "rss-rule-subscription": "rss.button.rss.default.phone.button.route-rss-rule-subscription-h-f1322f55"
    };
    return `
        <nav class="fd-rss-mode-row" aria-label="RSS 状态入口">
          ${[
            ["源列表", "rss"],
            ["全部", "rss-all"],
            ["收藏", "rss-starred"],
            ["规则订阅", "rss-rule-subscription"]
          ].map(([label, target]) => `<button class="${currentRoute === target ? "is-active" : ""}" type="button" data-control-id="${esc(modeControlIds[target] || "")}" data-ui-event="tab.item.select" data-route="${esc(target)}">${esc(label)}</button>`).join("")}
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
          <button class="fd-rss-refresh-pill" type="button" data-control-id="rss.button.rss.default.phone.button.route-rss-refreshing-h-e098b611" data-ui-event="refresh.invoke" data-route="rss-refreshing" aria-label="刷新当前订阅">
            <i></i>
            <span class="fd-rss-refresh-text">
              <span class="fd-rss-refresh-enabled">${esc(enabledCount)} 个启用源</span>
              <span class="fd-rss-refresh-update">· 10:18 更新</span>
            </span>
            ${icon("refresh", "fd-small-icon")}
          </button>
          <button class="fd-rss-manage-pill" type="button" data-control-id="rss.button.rss.default.phone.button.route-rss-subscription-management-h-2296df25" data-ui-event="route.push" data-route="rss-subscription-management" aria-label="进入订阅管理">
            ${icon("list", "fd-small-icon")}
            <span>管理</span>
          </button>
        </div>
      </section>`;
  }

  function rssSearchEntry() {
    return `
        <button class="fd-search-entry fd-rss-search" type="button" data-control-id="rss.button.rss.default.phone.button.route-rss-search-h-6ed3337c" data-ui-event="route.push" data-route="rss-search">
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
              <button type="button" data-control-id="rss.button.rss.default.phone.button.route-rss-source-import-h-6e5b86e4" data-ui-event="route.push" data-route="rss-source-import">${icon("upload", "fd-small-icon")}导入</button>
              <button type="button" data-control-id="rss.button.rss.default.phone.button.route-rss-source-edit-h-bd66e5ad" data-ui-event="route.push" data-route="rss-source-edit">${icon("add", "fd-small-icon")}新建</button>
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
    const enabledSources = sources.filter((item) => item.enabled);
    const health = sources.reduce((acc, item) => {
      acc[item.tone] = (acc[item.tone] || 0) + 1;
      return acc;
    }, {});
    const autoRefresh = appState?.rssAutoRefresh !== false;
    const sort = appState?.rssHomeSort || "未读优先";
    return `
        ${rssSearchEntry()}
        ${rssModeNav("rss")}
        <section class="fd-rss-home-status" aria-label="RSS 刷新状态">
          ${refreshing ? `<i class="fd-rss-spin"></i><span>正在刷新 · 已完成 ${Math.min(enabledSources.length, 2)}/${esc(enabledSources.length)} 个源</span>` : `<span>${icon("clock", "fd-small-icon")}最近刷新 10:18 · ${autoRefresh ? "Wi-Fi 自动刷新" : "手动刷新"}</span><span>${esc(enabledSources.length)} 启用 · ${esc(unreadCount)} 未读</span>`}
          <button type="button" data-control-id="rss.button.rss.default.phone.button.route-rss-refreshing-h-e098b611" data-ui-event="refresh.invoke" data-route="rss-refreshing" aria-label="刷新订阅">${icon("refresh", "fd-small-icon")}</button>
        </section>
        <section class="fd-rss-health-row" aria-label="订阅源健康度">
          ${rssBadge("正常", "good")}<small>${esc(health.good || 0)} 正常</small>
          ${health.warn ? `${rssBadge("需登录", "warn")}<small>${esc(health.warn)} 需登录</small>` : ""}
          ${health.muted ? `${rssBadge("暂停", "muted")}<small>${esc(health.muted)} 暂停</small>` : ""}
          <button type="button" data-control-id="rss.button.rss.default.phone.button.route-rss-subscription-management-h-2296df25" data-ui-event="route.push" data-route="rss-subscription-management" class="fd-rss-health-manage">管理源</button>
        </section>
        ${rssSourceOverview(sources, appState)}
        <section class="fd-rss-article-section">
          <header>
            <h2>最近未读</h2>
            <span class="fd-rss-article-header-actions">
              ${filterDisclosure({
                className: "fd-rss-home-sort",
                label: "排序",
                ariaLabel: "RSS 主页未读排序",
                summary: sort,
                toggleAttr: "data-rss-home-sort-toggle",
                open: Boolean(appState?.rssHomeSortOpen),
                groups: [{
                  title: "未读排序",
                  options: ["未读优先", "最近更新", "按分组", "按源"].map((item) => ({
                    label: item,
                    active: sort === item,
                    attrs: { "data-rss-home-sort": item }
                  }))
                }]
              })}
              <button type="button" data-rss-mark-all-read data-route="rss-all">${icon("check", "fd-small-icon")}全部已读</button>
              <button type="button" data-route="rss-all">${icon("list", "fd-small-icon")}查看全部</button>
            </span>
          </header>
          <section class="fd-rss-article-list" aria-label="最近未读" data-rss-article-list data-rss-mark-read>
            ${rssArticleRows(rssFilteredArticles("rss").slice(0, 3))}
          </section>
        </section>`;
  }

  function rssArticleHubContent(currentRoute, sources, unreadCount, refreshing) {
    const articles = rssFilteredArticles(currentRoute);
    const readFilter = "全部";
    const grouped = articles.reduce((acc, item) => {
      const key = item.source;
      (acc[key] = acc[key] || []).push(item);
      return acc;
    }, {});
    return `
        ${rssSearchEntry()}
        ${rssModeNav(currentRoute)}
        ${rssSourceStrip(sources, currentRoute)}
        ${refreshing ? `<section class="fd-rss-refresh-line"><i></i><span>正在刷新启用订阅源 · 完成后未读计数自动更新</span></section>` : ""}
        ${currentRoute === "rss-all" ? `
        <section class="fd-rss-hub-toolbar" aria-label="全部条目工具栏">
          <nav aria-label="已读筛选">
            ${["全部", "未读", "已读"].map((item) => `<button class="${readFilter === item ? "is-active" : ""}" type="button" data-rss-all-filter="${esc(item)}">${esc(item)}</button>`).join("")}
          </nav>
          <button type="button" data-rss-mark-all-read data-route="rss-all">${icon("check", "fd-small-icon")}全部标记已读</button>
        </section>` : ""}
        ${currentRoute === "rss-all" ? Object.keys(grouped).map((sourceName) => `
        <section class="fd-rss-article-section fd-rss-grouped-section" data-rss-source-group="${esc(sourceName)}">
          <header>
            <h2>${esc(sourceName)}</h2>
            <span><small>${esc(grouped[sourceName].length)} 条 · ${esc(grouped[sourceName].filter((item) => item.unread).length)} 未读</small>
            <button type="button" data-rss-group-toggle aria-expanded="true">${icon("chevron", "fd-small-icon")}</button></span>
          </header>
          <section class="fd-rss-article-list" aria-label="${esc(sourceName)}条目" data-rss-mark-read>
            ${rssArticleRows(grouped[sourceName])}
          </section>
        </section>`).join("") : rssArticleSection(rssModeTitle(currentRoute), articles, "rss-subscription-management", "管理源", "source-stack")}`;
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
          <button type="button" data-control-id="rss.button.rss-source-feed.default.phone.button.route-rss-refreshing-h-232451d1" data-ui-event="refresh.invoke" data-route="rss-refreshing">${icon("refresh", "fd-small-icon")}刷新</button>
          <button type="button" data-control-id="rss.button.rss-source-feed.default.phone.button.route-rss-source-edit-h-1bdb8b03" data-ui-event="route.push" data-route="rss-source-edit">${icon("edit", "fd-small-icon")}编辑源</button>
          <button type="button" data-control-id="rss.button.rss-source-feed.default.phone.button.route-rss-read-record-h-904ebca5" data-ui-event="route.push" data-route="rss-read-record">${icon("clock", "fd-small-icon")}记录</button>
          <button type="button" data-control-id="rss.button.rss-source-feed.default.phone.button.route-rss-source-debug-h-208fcbe1" data-ui-event="route.push" data-route="rss-source-debug">${icon("bug", "fd-small-icon")}调试</button>
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
    const nightMode = appState?.rssNightMode;
    const fontSize = appState?.rssFontSize || "标准";
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone fd-rss-reader-phone"), {
      data,
      title: "RSS 阅读",
      ariaLabel: "RSS 阅读",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      trailingHtml: `
        <span class="fd-rss-reader-top-actions">
          <button type="button" data-rss-font-decrease aria-label="减小字号">A-</button>
          <button type="button" data-rss-font-increase aria-label="增大字号">A+</button>
          <button type="button" data-rss-night-toggle aria-label="切换夜间模式" aria-pressed="${nightMode ? "true" : "false"}">${icon(nightMode ? "sun" : "moon", "fd-small-icon")}</button>
          <button type="button" data-route="rss-starred" aria-label="收藏">${icon("bookmark", "fd-small-icon")}</button>
          <button type="button" data-route="rss-original" aria-label="打开原文">${icon("link", "fd-small-icon")}</button>
        </span>`,
      contentHtml: `
        <article class="fd-rss-reader-page${nightMode ? " is-night" : ""}" data-rss-reader data-rss-auto-read data-rss-font-size="${esc(fontSize)}">
          <header class="fd-rss-reader-source">
            <span>${icon("rss", "fd-small-icon")}</span>
            <div>
              <strong>GitHub Releases</strong>
              <small>今天 10:18 · 开源项目 · 已解析正文 · 2 分钟阅读</small>
            </div>
            <button type="button" data-route="rss-source-feed">查看源</button>
          </header>
          <section class="fd-rss-reader-title">
            <h1>Reader UI 前端输入件更新说明</h1>
            <p>本条目汇总最近的阅读体验修复、发现页状态补充和 RSS 页面结构调整。</p>
          </section>
          <nav class="fd-rss-reader-inline-actions" aria-label="RSS 阅读操作">
            <button type="button" data-rss-toggle-read data-route="rss">${icon("check", "fd-small-icon")}标记已读</button>
            <button type="button" data-route="rss-starred">${icon("bookmark", "fd-small-icon")}收藏</button>
            <button type="button" data-route="rss-subscription-management">${icon("source-stack", "fd-small-icon")}源设置</button>
            <button type="button" data-rss-prev aria-label="上一条">${icon("chevron-left", "fd-small-icon")}上一条</button>
            <button type="button" data-rss-next aria-label="下一条">下一条${icon("chevron-right", "fd-small-icon")}</button>
          </nav>
          <section class="fd-rss-reader-body" data-rss-body>
            <p>RSS 页面现在以订阅源为一级对象，同时保留常规阅读器里的未读、全部、收藏和刷新工作流。主页负责快速浏览条目，阅读页则专注正文、原文和源相关操作。</p>
            <figure class="fd-rss-reader-image" data-rss-image-preview>
              <img src="asset-library/covers/three-body.png" alt="Reader UI 更新示意图" loading="lazy" />
              <figcaption>图 1 · 主页与阅读页的未读、收藏联动关系（点击预览大图）</figcaption>
            </figure>
            <p>如果订阅源提供正文规则，文章应直接进入当前阅读页；如果源只提供链接，则在阅读页保留原文入口，并用 WebView 或外部浏览器作为兜底。</p>
            <p>正文中的<a href="#" data-rss-internal-link>内部链接</a>在应用内打开，<a href="#" data-rss-external-link rel="noopener">外部链接</a>跳转原文 WebView，避免离开阅读上下文。</p>
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
          <nav class="fd-rss-reader-prevnext" aria-label="条目导航">
            <button type="button" data-rss-prev>${icon("chevron-left", "fd-small-icon")}订阅源规则解析失败排查</button>
            <button type="button" data-rss-next>本地导入完成解析${icon("chevron-right", "fd-small-icon")}</button>
          </nav>
        </article>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
          <button type="button" data-rss-prev>上一条</button>
          <button type="button" data-route="rss">返回列表</button>
          <button type="button" data-rss-next>下一条</button>
          <button type="button" data-route="rss-original">打开原文</button>
        </div>`,
      stateHostHtml: mainTabFeedbackHtml(appState)
    }));
  }

  function rssOriginalScreen(data, appState) {
    const nightMode = appState?.rssNightMode;
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone fd-rss-reader-phone"), {
      data,
      title: "原文页面",
      ariaLabel: "RSS 原文页面",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      trailingHtml: `
        <span class="fd-rss-reader-top-actions">
          <button type="button" data-rss-webview-reload aria-label="重新加载">${icon("refresh", "fd-small-icon")}</button>
          <button type="button" data-rss-night-toggle aria-label="夜间模式" aria-pressed="${nightMode ? "true" : "false"}">${icon(nightMode ? "sun" : "moon", "fd-small-icon")}</button>
          <button type="button" data-route="rss-detail">阅读正文</button>
        </span>`,
      contentHtml: `
        <section class="fd-rss-original-preview" data-rss-webview>
          <header>
            <span>${icon("link", "fd-small-icon")}</span>
            <div>
              <strong>github.com/minliny/Reader-UI/releases/latest</strong>
              <small>来自 GitHub Releases · 已保留 RSS 阅读上下文</small>
            </div>
          </header>
          <div class="fd-rss-webview-progress" data-rss-webview-progress aria-label="WebView 加载进度" role="progressbar" aria-valuenow="72" aria-valuemin="0" aria-valuemax="100">
            <i style="width:72%"></i><span>加载中 72% · 已注入夜间样式和广告过滤规则</span>
          </div>
          <article class="fd-rss-web-preview${nightMode ? " is-night" : ""}" data-rss-webview-frame data-rss-inject-night data-rss-adblock>
            <h2>Reader UI 前端输入件更新说明</h2>
            <p>内置 WebView 已加载原文页面。已保留返回 RSS 阅读页、复制链接、分享和用浏览器打开操作。WebView 内的跳转通过白名单拦截，广告资源已过滤。</p>
            <div><i></i><i></i><i></i></div>
          </article>
          <section class="fd-rss-webview-error" data-rss-webview-error hidden>
            <span>${icon("warning", "fd-medium-icon")}</span>
            <h3>原文加载失败</h3>
            <p>HTTP 503 · 服务暂时不可用。可重试加载、复制链接稍后查看，或返回 RSS 阅读页阅读已解析正文。</p>
            <button type="button" data-rss-webview-reload>${icon("refresh", "fd-small-icon")}重试加载</button>
          </section>
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
          <button type="button" data-route="rss-detail">返回正文</button>
          <button type="button" data-rss-copy-link>复制链接</button>
          <button type="button" data-rss-share>分享</button>
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
      <section class="fd-rss-action-status" aria-label="源实时状态">
        <article><small>未读</small><strong>${esc(source.unread)} 条</strong></article>
        <article><small>最近更新</small><strong>${esc(source.latest)}</strong></article>
        <article><small>登录态</small><strong>${source.login ? "需登录" : "无需登录"}</strong></article>
        <article><small>启用</small><strong>${source.enabled ? "已启用" : "已暂停"}</strong></article>
      </section>
      <section class="fd-rss-action-grid">
        ${[
          ["刷新入口", "refresh", "rss-refreshing", "data-rss-action-refresh"],
          ["编辑源", "edit", "rss-source-edit", "data-rss-action-edit"],
          ["规则调试", "bug", "rss-source-debug", "data-rss-action-debug"],
          ["阅读记录", "clock", "rss-read-record", "data-rss-action-record"],
          ["源变量", "code", "rss-source-vars", "data-rss-action-vars"],
          ["登录", "shield", "rss-source-login", "data-rss-action-login"],
          ["置顶", "top", "rss-source-pin", "data-rss-action-pin"],
          ["禁用", "offline", "rss-source-disable", "data-rss-action-disable"]
        ].map(([label, itemIcon, target, actionAttr]) => `<button type="button" data-route="${esc(target)}" ${actionAttr}>${icon(itemIcon, "fd-small-icon")}<span>${esc(label)}</span></button>`).join("")}
      </section>
      <section class="fd-rss-action-quick" aria-label="快捷操作">
        <button type="button" data-rss-copy-source-url>${icon("copy", "fd-small-icon")}复制源地址</button>
        <button type="button" data-rss-share-source>${icon("share", "fd-small-icon")}分享源配置</button>
        <button type="button" data-route="rss-source-delete-confirm">${icon("trash", "fd-small-icon")}删除源</button>
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-source-feed">返回源</button>
        <button type="button" data-route="rss-subscription-management">管理全部</button>
      </div>`, appState);
  }

  function rssSourceEditScreen(data, appState) {
    const isCreate = appState?.rssSourceEditMode === "create";
    const fields = [
      ["基础", "源名称", "GitHub Releases", "text", "data-rss-edit-name", ""],
      ["基础", "源地址", "https://github.com/minliny/Reader-UI/releases.atom", "url", "data-rss-edit-url", "URL 需以 http:// 或 https:// 开头"],
      ["基础", "分组", "开源项目", "text", "data-rss-edit-group", ""],
      ["请求", "请求头", "User-Agent: Reader UI", "text", "data-rss-edit-header", ""],
      ["请求", "并发率", "2/1000", "text", "data-rss-edit-concurrency", "格式：并发数/间隔毫秒"],
      ["列表", "文章列表", "默认 RSS 解析", "text", "data-rss-edit-list", ""],
      ["列表", "下一页", "PAGE", "text", "data-rss-edit-nextpage", ""],
      ["WebView", "正文规则", "content:encoded || article", "text", "data-rss-edit-content", "支持 content:encoded || article 语法"],
      ["WebView", "注入 JS / CSS", "图片宽度、夜间样式、跳转拦截", "text", "data-rss-edit-inject", ""],
      ["WebView", "白名单 / 黑名单", "过滤广告资源", "text", "data-rss-edit-filter", ""]
    ];
    const categoryUrls = [
      ["Releases", "/releases.atom", "8 条"],
      ["Issues", "/issues.atom", "6 条"],
      ["Discussions", "/discussions.atom", "4 条"]
    ];
    return rssLibraryScreen(data, isCreate ? "新建 RSS 源" : "RSS 源编辑", `
      ${isCreate ? `
      <section class="fd-rss-edit-create-bar" aria-label="新建源快捷">
        <button type="button" data-rss-paste-url>${icon("copy", "fd-small-icon")}从剪贴板粘贴 URL</button>
        <nav aria-label="源模板">
          ${["默认 RSS", "自定义列表", "单 URL"].map((item, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button" data-rss-template="${esc(item)}">${esc(item)}</button>`).join("")}
        </nav>
      </section>` : ""}
      <section class="fd-rss-edit-tabs" aria-label="源编辑分组" data-rss-edit-tabs>
        ${["基础", "请求", "列表", "WebView"].map((item, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button" data-rss-edit-tab="${esc(item)}">${esc(item)}</button>`).join("")}
      </section>
      <section class="fd-rss-edit-list" aria-label="RSS 源编辑字段" data-rss-edit-fields>
        ${fields.map(([group, label, value, inputType, inputAttr, hint]) => `
          <article>
            <small>${esc(group)}</small>
            <strong>${esc(label)}</strong>
            <input type="${esc(inputType)}" value="${esc(value)}" ${inputAttr} aria-label="${esc(label)}" data-rss-edit-field />
            ${hint ? `<em class="fd-rss-edit-hint" data-rss-edit-validate>${esc(hint)}</em>` : ""}
          </article>`).join("")}
      </section>
      <section class="fd-rss-edit-category" aria-label="分类 URL 可视化编辑">
        <header><h2>分类 URL</h2><button type="button" data-rss-category-add>${icon("add", "fd-small-icon")}新增分类</button></header>
        ${categoryUrls.map(([name, url, count]) => `
          <article class="fd-rss-category-row" data-rss-category-row>
            <input type="text" value="${esc(name)}" aria-label="分类名称" data-rss-category-name />
            <input type="text" value="${esc(url)}" aria-label="分类 URL" data-rss-category-url />
            <small>${esc(count)}</small>
            <button type="button" data-rss-category-remove aria-label="删除分类">${icon("trash", "fd-small-icon")}</button>
          </article>`).join("")}
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-source-actions">取消</button>
        <button type="button" data-route="rss-source-debug" data-rss-edit-preview>预览调试</button>
        <button type="button" data-route="rss-subscription-management" data-rss-edit-save>保存</button>
      </div>`, appState, `<button type="button" data-route="rss-source-debug">调试</button>`);
  }

  function rssSourceDebugScreen(data, appState) {
    return rssLibraryScreen(data, "规则调试", `
      <section class="fd-rss-debug-panel">
        <header>
          <span>${icon("bug", "fd-small-icon")}</span>
          <div><strong>GitHub Releases</strong><small>列表解析 · 正文解析 · WebView 拦截</small></div>
          <span class="fd-rss-debug-run">
            <button type="button" data-rss-debug-run>${icon("play", "fd-small-icon")}运行调试</button>
            <button type="button" data-rss-debug-rerun>${icon("refresh", "fd-small-icon")}重跑</button>
          </span>
        </header>
        <article><strong>1. 获取分类入口</strong><p>Releases / Issues / Discussions 已解析，缓存命中 3 项。</p><small class="fd-rss-debug-stat">耗时 120ms · 200 OK</small></article>
        <article><strong>2. 获取文章列表</strong><p>默认 RSS 解析命中 18 条，下一页规则 PAGE 可用。</p><small class="fd-rss-debug-stat">耗时 340ms · 18 条</small></article>
        <article><strong>3. 正文规则测试</strong><p>content:encoded 命中正文，图片资源通过白名单。</p><small class="fd-rss-debug-stat">命中 16/18 · 2 条降级原文</small></article>
        <article class="is-warn"><strong>4. 跳转拦截</strong><p>外链将保留在原文 WebView，legado/yuedu 协议进入导入流程。</p><small class="fd-rss-debug-stat">拦截 2 条</small></article>
      </section>
      <section class="fd-rss-debug-raw" aria-label="原始数据与源码对比" data-rss-debug-raw>
        <header><h2>原始数据 / 源码对比</h2><button type="button" data-rss-debug-copy-raw>${icon("copy", "fd-small-icon")}复制</button></header>
        <article class="fd-rss-debug-raw-row">
          <div><small>解析结果</small><pre>{"title":"Reader UI...","link":"...","pubDate":"..."}</pre></div>
          <div><small>源码片段</small><pre>&lt;entry&gt;&lt;title&gt;Reader UI...&lt;/title&gt;&lt;/entry&gt;</pre></div>
        </article>
      </section>
      <section class="fd-rss-debug-log" aria-label="调试日志" data-rss-debug-log>
        <header><h2>调试日志</h2><button type="button" data-rss-debug-copy-log>${icon("copy", "fd-small-icon")}复制日志</button></header>
        <ol>
          <li><time>10:18:02</time> · INFO · 请求分类入口 releases.atom</li>
          <li><time>10:18:02</time> · INFO · 命中缓存，跳过网络请求</li>
          <li><time>10:18:03</time> · INFO · 列表解析完成，命中 18 条</li>
          <li><time>10:18:03</time> · WARN · 2 条条目无正文规则命中，降级原文</li>
          <li><time>10:18:03</time> · INFO · 跳转拦截规则已加载</li>
        </ol>
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-source-edit">编辑规则</button>
        <button type="button" data-route="rss-source-actions">完成</button>
      </div>`, appState);
  }

  function rssConfirmScreen(data, config, appState) {
    const variant = config.variant || "default";

    const selectedBatchSources = config.batchSources || ["GitHub Releases", "阅读器版本讨论"];
    const applyPreview = config.applyPreview || { added: 2, updated: 1, skipped: 1 };
    const favoriteGroups = config.favoriteGroups || ["默认分组", "技术文章", "版本发布", "社区讨论"];
    const favoriteCurrent = appState?.rssFavoriteGroup || config.favoriteGroup || "默认分组";

    let variantHtml = "";
    if (variant === "browser") {
      variantHtml = `
        <section class="fd-rss-confirm-variant fd-rss-confirm-browser" data-rss-confirm-variant="browser">
          <article class="fd-rss-confirm-link-row">
            <small>原文链接</small>
            <code>https://github.com/minliny/Reader-UI/releases/latest</code>
            <button type="button" data-rss-copy-link>${icon("copy", "fd-small-icon")}复制链接</button>
          </article>
          <div class="fd-action-row fd-rss-confirm-browser-actions">
            <button type="button" data-rss-share-link>${icon("share", "fd-small-icon")}分享链接</button>
            <button type="button" data-rss-open-browser>系统浏览器打开</button>
          </div>
        </section>`;
    } else if (variant === "delete") {
      variantHtml = `
        <section class="fd-rss-confirm-variant fd-rss-confirm-delete" data-rss-confirm-variant="delete">
          <label class="fd-rss-confirm-check"><input type="checkbox" checked data-rss-keep-cache /><span>保留已缓存文章</span></label>
          <label class="fd-rss-confirm-check"><input type="checkbox" data-rss-keep-record /><span>保留阅读记录</span></label>
          <small class="fd-rss-confirm-hint">取消勾选后会连同订阅源一起清理，且不可恢复。</small>
        </section>`;
    } else if (variant === "export-result") {
      variantHtml = `
        <section class="fd-rss-confirm-variant fd-rss-confirm-export" data-rss-confirm-variant="export-result">
          <ul class="fd-rss-confirm-stats">
            <li><strong>2</strong><small>订阅源</small></li>
            <li><strong>4</strong><small>分组</small></li>
            <li><strong>1.2 KB</strong><small>文件大小</small></li>
            <li><strong>JSON</strong><small>格式</small></li>
          </ul>
          <div class="fd-action-row fd-rss-confirm-export-actions">
            <button type="button" data-rss-export-share>${icon("share", "fd-small-icon")}分享保存</button>
            <button type="button" data-route="rss-source-export-detail">查看详情</button>
          </div>
        </section>`;
    } else if (variant === "pin") {
      variantHtml = `
        <section class="fd-rss-confirm-variant fd-rss-confirm-pin" data-rss-confirm-variant="pin">
          <small>置顶后位置预览</small>
          <ol class="fd-rss-confirm-pin-preview">
            <li class="is-pinned">${icon("top", "fd-small-icon")}<strong>GitHub Releases</strong><em>置顶</em></li>
            <li>${icon("rss", "fd-small-icon")}<span>阅读器版本讨论</span></li>
            <li>${icon("rss", "fd-small-icon")}<span>书源维护公告</span></li>
          </ol>
          <button type="button" class="fd-rss-confirm-unpin" data-route="rss-source-actions" data-rss-unpin>${icon("top", "fd-small-icon")}取消置顶</button>
        </section>`;
    } else if (variant === "disable") {
      variantHtml = `
        <section class="fd-rss-confirm-variant fd-rss-confirm-disable" data-rss-confirm-variant="disable">
          <article class="fd-rss-confirm-note">
            <strong>${icon("storage", "fd-small-icon")}缓存说明</strong>
            <small>已缓存的 6 条未读条目和阅读记录会保留，可在离线模式下继续阅读。</small>
          </article>
          <article class="fd-rss-confirm-note">
            <strong>${icon("refresh", "fd-small-icon")}重新启用</strong>
            <small>进入 订阅管理 → 选中源 → 启用 即可恢复自动刷新和未读提醒。</small>
          </article>
        </section>`;
    } else if (variant === "batch-disable") {
      variantHtml = `
        <section class="fd-rss-confirm-variant fd-rss-confirm-batch-disable" data-rss-confirm-variant="batch-disable">
          <small>已选 ${esc(String(selectedBatchSources.length))} 个订阅源</small>
          <ul class="fd-rss-confirm-source-list">
            ${selectedBatchSources.map((name) => `<li>${icon("rss", "fd-small-icon")}<span>${esc(name)}</span></li>`).join("")}
          </ul>
          <label class="fd-rss-confirm-check"><input type="checkbox" checked data-rss-keep-cache /><span>保留已缓存条目</span></label>
        </section>`;
    } else if (variant === "record-clear") {
      variantHtml = `
        <section class="fd-rss-confirm-variant fd-rss-confirm-record-clear" data-rss-confirm-variant="record-clear">
          <small>清除范围</small>
          <fieldset class="fd-rss-confirm-radio-group">
            <label><input type="radio" name="rss-record-scope" value="all" checked data-rss-record-scope="all" /><span>全部阅读记录</span></label>
            <label><input type="radio" name="rss-record-scope" value="7d" data-rss-record-scope="7d" /><span>最近 7 天</span></label>
            <label><input type="radio" name="rss-record-scope" value="source" data-rss-record-scope="source" /><span>仅当前源记录</span></label>
          </fieldset>
          <article class="fd-rss-confirm-warn">
            ${icon("warning", "fd-small-icon")}
            <small>清除后不可恢复，且不会影响订阅源、收藏和正文缓存。</small>
          </article>
        </section>`;
    } else if (variant === "apply") {
      variantHtml = `
        <section class="fd-rss-confirm-variant fd-rss-confirm-apply" data-rss-confirm-variant="apply">
          <ul class="fd-rss-confirm-change-preview">
            <li><strong>+${esc(String(applyPreview.added))}</strong><span>新增订阅源</span></li>
            <li><strong>↑${esc(String(applyPreview.updated))}</strong><span>规则版本更新</span></li>
            <li><strong>↷${esc(String(applyPreview.skipped))}</strong><span>本地冲突跳过</span></li>
          </ul>
          <section class="fd-rss-batch-progress" aria-label="应用进度" data-rss-apply-progress hidden>
            <small data-rss-apply-progress-text>应用中 1/3</small>
            <div class="fd-rss-batch-bar"><i style="width:33%"></i></div>
          </section>
          <article class="fd-rss-confirm-rollback">
            <strong>${icon("refresh", "fd-small-icon")}回滚说明</strong>
            <small>应用前会自动备份当前订阅配置，可在 设置 → 同步与备份 中恢复。</small>
          </article>
        </section>`;
    } else if (variant === "favorite-add") {
      variantHtml = `
        <section class="fd-rss-confirm-variant fd-rss-confirm-favorite-add" data-rss-confirm-variant="favorite-add">
          <small>选择收藏分组</small>
          <nav class="fd-rss-confirm-group-chips" aria-label="收藏分组" data-rss-favorite-group>
            ${favoriteGroups.map((name) => `<button class="${name === favoriteCurrent ? "is-active" : ""}" type="button" data-rss-favorite-group-value="${esc(name)}">${esc(name)}</button>`).join("")}
          </nav>
          <label class="fd-rss-confirm-check"><input type="checkbox" data-rss-favorite-pin /><span>同时置顶该条目</span></label>
        </section>`;
    }

    return rssLibraryScreen(data, config.title, `
      <section class="fd-rss-confirm-card fd-rss-confirm-card--${esc(variant)}" data-rss-confirm="${esc(variant)}">
        <span>${icon(config.icon || "warning", "fd-medium-icon")}</span>
        <h2>${esc(config.heading)}</h2>
        <p>${esc(config.copy)}</p>
        ${config.detail ? `<small class="fd-rss-confirm-detail">${esc(config.detail)}</small>` : ""}
        ${variantHtml}
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="${esc(config.cancelRoute || "rss-source-actions")}">${esc(config.cancelLabel || "取消")}</button>
        <button type="button" data-route="${esc(config.confirmRoute || "rss-subscription-management")}"${variant !== "default" ? ` data-rss-confirm-submit="${esc(variant)}"` : ""}>${esc(config.confirmLabel || "确认")}</button>
      </div>`, appState);
  }

  function rssSourceVarsScreen(data, appState) {
    const variables = [
      ["请求变量", "{{page}}", "1", "当前分页，从 1 开始递增，用于列表和下一页规则。", "list rule: //item[{{page}}]"],
      ["请求变量", "{{sourceUrl}}", "https://github.com/.../releases.atom", "当前订阅源地址，调试和跳转拦截时可引用。", "redirect: {{sourceUrl}}/login"],
      ["登录变量", "{{cookie}}", "reader_session=••••••", "网页登录后写入，刷新订阅源和打开原文时共用。", "header: Cookie: {{cookie}}"],
      ["登录变量", "{{token}}", "••••••", "从登录页脚本提取，过期后进入登录子页面刷新。", "header: Authorization: Bearer {{token}}"],
      ["设备变量", "{{userAgent}}", "Reader UI WebView UA", "Reader UI WebView UA，必要时覆盖为移动端 UA。", "header: User-Agent: {{userAgent}}"]
    ];
    return rssLibraryScreen(data, "源变量", `
      <section class="fd-rss-debug-panel">
        <header>
          <span>${icon("code", "fd-small-icon")}</span>
          <div><strong>GitHub Releases</strong><small>变量作用于请求头、分类 URL、正文规则和 WebView 注入脚本</small></div>
        </header>
      </section>
      <section class="fd-rss-edit-list" aria-label="RSS 源变量" data-rss-vars-list>
        ${variables.map(([group, name, value, desc, ref]) => `
          <article>
            <small>${esc(group)}</small>
            <strong>${esc(name)}</strong>
            <input type="text" value="${esc(value)}" aria-label="${esc(name)} 值" data-rss-var-value data-rss-var-name="${esc(name)}" />
            <p>${esc(desc)}</p>
            <em class="fd-rss-var-ref">规则引用预览：<code>${esc(ref)}</code></em>
          </article>`).join("")}
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-source-debug" data-rss-var-test>测试变量</button>
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
        <article class="is-warn" data-rss-login-expiry><strong>过期提醒</strong><p>Cookie 将于 2026-06-28 过期，建议提前重新登录。上次检测 10:18 返回 200。</p></article>
      </section>
      <section class="fd-rss-login-autodetect" aria-label="自动检测登录态">
        <article><span>${icon("refresh", "fd-small-icon")}</span><strong>刷新前自动检测<small>401/403 时进入登录页</small></strong>${settingsSwitch(true)}</article>
        <article><span>${icon("bell", "fd-small-icon")}</span><strong>过期提前提醒<small>过期前 1 天通知</small></strong>${settingsSwitch(true)}</article>
      </section>
      <section class="fd-rss-action-grid fd-rss-action-grid-compact">
        ${[
          ["网页登录", "globe", "rss-source-login-web", "data-rss-login-web"],
          ["提取 Cookie", "copy", "rss-source-login-cookie", "data-rss-login-extract"],
          ["测试登录态", "refresh", "rss-source-debug", "data-rss-login-test"],
          ["清除登录", "trash", "rss-source-login-clear", "data-rss-login-clear"]
        ].map(([label, itemIcon, target, actionAttr]) => `<button type="button" data-route="${esc(target)}" ${actionAttr}>${icon(itemIcon, "fd-small-icon")}<span>${esc(label)}</span></button>`).join("")}
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-source-actions">返回操作</button>
        <button type="button" data-route="rss-source-actions">完成</button>
      </div>`, appState);
  }

  function rssSourceLoginWebScreen(data, appState) {
    return rssLibraryScreen(data, "网页登录", `
      <section class="fd-rss-original-preview" data-rss-login-webview>
        <header>
          <span>${icon("shield", "fd-small-icon")}</span>
          <div>
            <strong>example.com/login</strong>
            <small>来自书源维护公告 · 登录完成后回写 Cookie</small>
          </div>
        </header>
        <div class="fd-rss-webview-progress" data-rss-login-progress role="progressbar" aria-valuenow="85" aria-valuemin="0" aria-valuemax="100">
          <i style="width:85%"></i><span>登录页加载 85% · 已注入表单自动填充脚本</span>
        </div>
        <article class="fd-rss-web-preview" data-rss-login-frame data-rss-inject-autofill>
          <h2>登录页面</h2>
          <p>内置 WebView 已加载登录页。已注入 JS 自动填充账号、隐藏弹窗。登录成功后自动提取 Cookie、Token 并回写到订阅源配置。</p>
          <div><i></i><i></i><i></i></div>
        </article>
        <section class="fd-rss-webview-error" data-rss-login-error hidden>
          <span>${icon("warning", "fd-medium-icon")}</span>
          <h3>登录失败</h3>
          <p>账号或密码错误 · 可重试或返回手动填写。</p>
          <button type="button" data-rss-login-retry>${icon("refresh", "fd-small-icon")}重试</button>
        </section>
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-source-login">返回登录</button>
        <button type="button" data-rss-login-extract-route data-route="rss-source-login-cookie">登录完成，提取 Cookie</button>
      </div>`, appState);
  }

  function rssSourceLoginCookieScreen(data, appState) {
    return rssLibraryScreen(data, "Cookie 提取", `
      <section class="fd-rss-debug-panel">
        <header>
          <span>${icon("copy", "fd-small-icon")}</span>
          <div><strong>已提取登录凭据</strong><small>只作用于当前 RSS 源，不覆盖其他订阅源</small></div>
        </header>
      </section>
      <section class="fd-rss-cookie-extract" aria-label="Cookie 提取过程" data-rss-cookie-flow>
        <ol>
          <li><i></i>WebView 登录完成，捕获响应头 Set-Cookie</li>
          <li><i></i>提取 localStorage.reader_token</li>
          <li><i></i>请求个人中心验证凭据可用性</li>
          <li><i></i>写入当前订阅源配置（加密存储）</li>
        </ol>
      </section>
      <section class="fd-rss-edit-list" aria-label="凭据编辑">
        <article>
          <small>凭据</small>
          <strong>Cookie</strong>
          <input type="text" value="reader_session=••••••; expires=2026-06-28; path=/" aria-label="Cookie" data-rss-cookie-edit />
          <p>有效期至 2026-06-28 · 过期后将自动提醒重新登录</p>
        </article>
        <article>
          <small>凭据</small>
          <strong>Token</strong>
          <input type="text" value="••••••" aria-label="Token" data-rss-token-edit />
          <p>从 localStorage.reader_token 提取，刷新源时自动附加。</p>
        </article>
        <article>
          <small>检测结果</small>
          <strong>个人中心</strong>
          <p>返回 200 · 下一次刷新不会进入登录错误状态。</p>
        </article>
      </section>
      <section class="fd-rss-action-quick">
        <button type="button" data-rss-cookie-import>${icon("upload", "fd-small-icon")}手动导入 Cookie</button>
        <button type="button" data-rss-cookie-copy>${icon("copy", "fd-small-icon")}复制凭据</button>
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-source-login">返回</button>
        <button type="button" data-route="rss-source-actions">保存凭据</button>
      </div>`, appState);
  }

  function rssSourceGroupEditScreen(data, appState) {
    const allSources = rssSourcesData();
    const applicable = ["GitHub Releases", "阅读器版本讨论"];
    return rssLibraryScreen(data, "编辑 RSS 分组", `
      <section class="fd-rss-edit-list" aria-label="RSS 分组编辑字段" data-rss-group-edit>
        <article>
          <small>分组配置</small>
          <strong>分组名称</strong>
          <input type="text" value="开源项目" aria-label="分组名称" data-rss-group-name />
          <em class="fd-rss-edit-hint" data-rss-group-validate>名称不能与已有分组重复</em>
        </article>
        <article>
          <small>分组配置</small>
          <strong>默认展开</strong>
          ${settingsSwitch(true)}
        </article>
        <article>
          <small>分组配置</small>
          <strong>排序规则</strong>
          <select aria-label="排序规则" data-rss-group-sort>
            <option selected>未读优先，其次最近更新</option>
            <option>最近更新</option>
            <option>按名称</option>
            <option>手动排序</option>
          </select>
        </article>
      </section>
      <section class="fd-rss-group-applicable" aria-label="适用订阅源多选">
        <header><h2>适用订阅源</h2><small>至少选择一个源</small></header>
        ${allSources.map((source) => `
          <article class="${applicable.includes(source.name) ? "is-selected" : ""}" data-rss-group-source data-rss-group-source-name="${esc(source.name)}" role="button" tabindex="0">
            <span>${icon(applicable.includes(source.name) ? "check" : "rss", "fd-small-icon")}</span>
            <strong>${esc(source.name)}<small>${esc(source.group)} · ${source.unread ? `${esc(source.unread)} 未读` : "无未读"}</small></strong>
          </article>`).join("")}
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-source-groups">取消</button>
        <button type="button" data-route="rss-source-groups" data-rss-group-save>保存</button>
      </div>`, appState);
  }

  function rssSourceGroupsScreen(data, appState) {
    const sources = rssSourcesData();
    const groups = [
      { name: "开源项目", expanded: true, enabled: true },
      { name: "社区", expanded: true, enabled: true },
      { name: "维护", expanded: true, enabled: true },
      { name: "系统", expanded: false, enabled: false }
    ];
    return rssLibraryScreen(data, "RSS 分组", `
      <section class="fd-rss-record-list fd-rss-management-list" aria-label="RSS 分组列表" data-rss-groups-list>
        ${groups.map((group, index) => {
          const count = sources.filter((item) => item.group === group.name).length;
          const unread = sources.filter((item) => item.group === group.name).reduce((sum, item) => sum + (item.unread || 0), 0);
          return `
          <article data-rss-group-row data-rss-group-name="${esc(group.name)}" draggable="true">
            <span>${icon("drag", "fd-small-icon")}</span>
            <span>${icon("folder", "fd-small-icon")}</span>
            <strong>${esc(group.name)}<small>${esc(count)} 个订阅源 · ${unread ? `${esc(unread)} 条未读` : "无未读"}${group.expanded ? " · 默认展开" : " · 默认折叠"}</small></strong>
            <span class="fd-rss-group-actions">
              <button type="button" data-rss-group-rename data-rss-group-target="${esc(group.name)}" aria-label="重命名分组">${icon("edit", "fd-small-icon")}</button>
              <button type="button" data-rss-group-delete data-route="rss-source-delete-confirm" data-rss-group-target="${esc(group.name)}" aria-label="删除分组">${icon("trash", "fd-small-icon")}</button>
            </span>
            ${settingsSwitch(group.enabled)}
          </article>`;
        }).join("")}
      </section>
      <section class="fd-rss-rule-sub-actions">
        <button type="button" data-route="rss-source-group-edit">${icon("add", "fd-small-icon")}新增分组</button>
        <button type="button" data-rss-group-sort-toggle>${icon("sort", "fd-small-icon")}拖拽排序</button>
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-subscription-management">取消</button>
        <button type="button" data-route="rss-subscription-management">保存</button>
      </div>`, appState);
  }

  function rssSourceBatchScreen(data, appState) {
    const sources = rssSourcesData();
    const preselected = [0, 1];
    return rssLibraryScreen(data, "批量管理", `
      <section class="fd-rss-manage-batch-row fd-rss-batch-summary" data-rss-batch-summary>
        <strong data-rss-batch-count>已选 ${esc(preselected.length)} 个订阅源</strong>
        <button type="button" data-rss-batch-invert>反选</button>
        <button type="button" data-rss-batch-select-all>全选</button>
      </section>
      <section class="fd-rss-source-list fd-rss-batch-list" aria-label="批量选择订阅源" data-rss-batch-list>
        ${sources.map((source, index) => `
          <article class="${preselected.includes(index) ? "is-selected" : ""}${source.enabled ? "" : " is-disabled"}" role="button" tabindex="0" data-rss-batch-select data-rss-batch-source="${esc(source.name)}" aria-pressed="${preselected.includes(index) ? "true" : "false"}">
            <span>${icon(preselected.includes(index) ? "check" : "rss", "fd-small-icon")}</span>
            <strong>${esc(source.name)}<small>${esc(source.group)} · ${esc(source.status)} · ${source.unread ? `${esc(source.unread)} 条未读` : "无未读"}</small></strong>
            ${rssBadge(source.enabled ? "启用" : "暂停", source.enabled ? "good" : "muted")}
          </article>
        `).join("")}
      </section>
      <section class="fd-rss-batch-progress" aria-label="批量操作进度" data-rss-batch-progress hidden>
        <header><h2>批量操作</h2><small data-rss-batch-progress-text>处理中 1/2</small></header>
        <div class="fd-rss-batch-bar"><i style="width:50%"></i></div>
        <small class="fd-rss-batch-result" data-rss-batch-result>成功 1 · 失败 0 · 跳过 0</small>
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-source-export" data-rss-batch-export>导出</button>
        <button type="button" data-route="rss-source-batch-disable" data-rss-batch-disable>禁用</button>
        <button type="button" data-rss-batch-move data-route="rss-source-groups">移动分组</button>
        <button type="button" data-route="rss-source-delete-confirm" data-rss-batch-delete>删除</button>
      </div>`, appState, `<button type="button" data-route="rss-subscription-management">完成</button>`);
  }

  function rssSourceExportScreen(data, appState) {
    const format = appState?.rssExportFormat || "JSON";
    const ranges = [
      { label: "已选源", active: true },
      { label: "启用源", active: true },
      { label: "包含登录配置", active: false },
      { label: "包含分组", active: true }
    ];
    return rssLibraryScreen(data, "导出订阅源", `
      <section class="fd-rss-import-panel">
        <label>${icon("download", "fd-small-icon")}<input type="text" value="reader-rss-sources-20260626.${esc(format.toLowerCase())}" aria-label="导出文件名" data-rss-export-name /></label>
        <nav aria-label="导出文件格式" data-rss-export-format>
          ${["JSON", "OPML"].map((item) => `<button class="${format === item ? "is-active" : ""}" type="button" data-rss-export-format-value="${esc(item)}">${esc(item)}</button>`).join("")}
        </nav>
        <nav aria-label="导出范围" data-rss-export-range>
          ${ranges.map((item) => `<button class="${item.active ? "is-active" : ""}" type="button" data-rss-export-range-value="${esc(item.label)}" aria-pressed="${item.active ? "true" : "false"}">${esc(item.label)}</button>`).join("")}
        </nav>
      </section>
      <section class="fd-rss-import-list" aria-label="导出预览">
        ${["GitHub Releases", "阅读器版本讨论"].map((name) => `
          <article class="is-selected">
            <span>${icon("check", "fd-small-icon")}</span>
            <strong>${esc(name)}<small>${esc(format)} · 保留分组、启用状态和解析规则</small></strong>
            <button type="button" data-route="rss-source-export-detail">预览</button>
          </article>`).join("")}
      </section>
      <section class="fd-rss-batch-progress" aria-label="导出进度" data-rss-export-progress hidden>
        <header><h2>导出中</h2><small data-rss-export-progress-text>写入 2/2 个源</small></header>
        <div class="fd-rss-batch-bar"><i style="width:100%"></i></div>
        <small class="fd-rss-batch-result" data-rss-export-result>成功 2 · 失败 0</small>
      </section>
      <section class="fd-rss-webview-error" data-rss-export-error hidden>
        <span>${icon("warning", "fd-medium-icon")}</span>
        <h3>导出失败</h3>
        <p>存储权限不可用 · 可重试或更换导出目录。</p>
        <button type="button" data-rss-export-retry>${icon("refresh", "fd-small-icon")}重试</button>
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-source-batch">返回</button>
        <button type="button" data-route="rss-source-export-result" data-rss-export-run>导出</button>
      </div>`, appState);
  }

  function rssSourceExportDetailScreen(data, appState) {
    const fieldGroups = [
      ["基础字段", ["名称", "源地址", "分组", "启用状态", "分类入口"], true],
      ["解析规则", ["文章列表", "下一页", "正文规则", "WebView 注入", "资源过滤"], true],
      ["安全字段", ["Cookie", "Token", "本地账号"], false]
    ];
    return rssLibraryScreen(data, "导出预览", `
      <section class="fd-rss-debug-panel">
        <header>
          <span>${icon("download", "fd-small-icon")}</span>
          <div><strong>GitHub Releases</strong><small>导出项预览 · 不包含 Cookie</small></div>
        </header>
      </section>
      <section class="fd-rss-export-fields" aria-label="导出字段列表" data-rss-export-fields>
        ${fieldGroups.map(([group, fields, included]) => `
          <article class="${included ? "is-included" : "is-excluded"}">
            <strong>${esc(group)}${included ? "" : "（不导出）"}</strong>
            <ul>${fields.map((field) => `<li><label><input type="checkbox" ${included ? "checked" : "disabled"} data-rss-export-field="${esc(group)}::${esc(field)}" />${esc(field)}</label></li>`).join("")}</ul>
          </article>`).join("")}
      </section>
      <section class="fd-rss-export-compare" aria-label="预览与实际文件对比" data-rss-export-compare>
        <header><h2>内容对比</h2></header>
        <article class="fd-rss-debug-raw-row">
          <div><small>导出预览</small><pre>{"name":"GitHub Releases","group":"开源项目",...}</pre></div>
          <div><small>实际文件</small><pre>{"name":"GitHub Releases","group":"开源项目",...}</pre></div>
        </article>
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
    const items = rssArticlesData().filter((item) => item.starred);
    return rssLibraryScreen(data, "编辑收藏分组", `
      <section class="fd-rss-edit-list" aria-label="收藏分组编辑字段" data-rss-favgroup-edit>
        <article>
          <small>收藏分组</small>
          <strong>分组名称</strong>
          <input type="text" value="默认分组" aria-label="分组名称" data-rss-favgroup-name />
          <em class="fd-rss-edit-hint" data-rss-favgroup-validate>名称不能与已有分组重复</em>
        </article>
        <article>
          <small>收藏分组</small>
          <strong>首页显示</strong>
          ${settingsSwitch(true)}
        </article>
        <article>
          <small>收藏分组</small>
          <strong>排序方式</strong>
          <select aria-label="排序方式" data-rss-favgroup-sort>
            <option selected>最近收藏优先</option>
            <option>最早收藏优先</option>
            <option>按源</option>
            <option>按标题</option>
          </select>
        </article>
      </section>
      <section class="fd-rss-group-applicable" aria-label="包含条目" data-rss-favgroup-items>
        <header><h2>包含条目</h2><button type="button" data-rss-favgroup-add>${icon("add", "fd-small-icon")}添加条目</button></header>
        ${items.map((item) => `
          <article class="is-selected" data-rss-favgroup-item data-rss-favgroup-item-name="${esc(item.title)}">
            <span>${icon("bookmark", "fd-small-icon")}</span>
            <strong>${esc(item.title)}<small>${esc(item.source)} · ${esc(item.time)}</small></strong>
            <button type="button" data-rss-favgroup-remove aria-label="移除条目">${icon("close", "fd-small-icon")}</button>
          </article>`).join("")}
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-favorite-groups">取消</button>
        <button type="button" data-route="rss-favorite-groups" data-rss-favgroup-save>保存</button>
      </div>`, appState);
  }

  function rssFavoritesScreen(data, appState) {
    const favorites = rssArticlesData().filter((item) => item.starred);
    const groups = ["默认分组", "开源项目", "社区"];
    const activeGroup = appState?.rssFavoriteFilter || "默认分组";
    const sort = appState?.rssFavoriteSort || "最近收藏";
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
      ${filterDisclosure({
        className: "fd-rss-favorite-sort",
        label: "排序",
        ariaLabel: "收藏排序",
        summary: sort,
        toggleAttr: "data-rss-favorite-sort-toggle",
        open: Boolean(appState?.rssFavoriteSortOpen),
        groups: [{
          title: "排序方式",
          options: ["最近收藏", "最早收藏", "按源", "按标题"].map((item) => ({
            label: item,
            active: sort === item,
            attrs: { "data-rss-favorite-sort": item }
          }))
        }]
      })}
      <section class="fd-rss-article-section">
        <header>
          <h2>${esc(activeGroup)} · ${esc(favorites.length)} 条</h2>
          <button type="button" data-route="rss-favorite-groups">${icon("edit", "fd-small-icon")}管理分组</button>
        </header>
        <section class="fd-rss-article-list" aria-label="收藏列表" data-rss-mark-read>
          ${favorites.map((item) => `
            <article class="fd-rss-article-row is-starred${item.unread ? " is-unread" : ""}" role="button" tabindex="0" data-route="rss-detail">
              <i></i>
              <span>
                <strong>${esc(item.title)}</strong>
                <small>${esc(item.source)} · ${esc(item.time)} · ${esc(item.group)}${item.unread ? " · 未读" : " · 已读"}</small>
                <p>${esc(item.desc)}</p>
              </span>
              <span class="fd-rss-fav-row-actions">
                ${rssBadge(item.unread ? "未读" : "已读", item.unread ? "warn" : "muted")}
                <button type="button" data-route="rss-favorite-remove" data-rss-unstar aria-label="取消收藏">${icon("bookmark", "fd-small-icon")}</button>
              </span>
            </article>
          `).join("")}
        </section>
      </section>
      <section class="fd-rss-favorite-actions">
        <button type="button" data-route="rss-favorite-groups">${icon("edit", "fd-small-icon")}编辑分组</button>
        <button type="button" data-route="rss-favorite-clear">${icon("trash", "fd-small-icon")}清空当前分组</button>
      </section>`, appState);
  }

  function rssFavoriteGroupsScreen(data, appState) {
    const articles = rssArticlesData();
    const groups = [
      { name: "默认分组", pinned: true, count: 2 },
      { name: "开源项目", pinned: true, count: 1 },
      { name: "社区", pinned: false, count: 1 }
    ];
    return rssLibraryScreen(data, "收藏分组", `
      <section class="fd-rss-record-list fd-rss-management-list" aria-label="收藏分组列表" data-rss-favgroups-list>
        ${groups.map((group) => `
          <article data-rss-favgroup-row data-rss-favgroup-name="${esc(group.name)}" draggable="true">
            <span>${icon("drag", "fd-small-icon")}</span>
            <span>${icon("bookmark", "fd-small-icon")}</span>
            <strong>${esc(group.name)}<small>${esc(group.count)} 条收藏 · ${esc(articles.filter((item) => item.starred && item.group === group.name).length)} 未读${group.pinned ? " · 首页显示" : " · 隐藏"}</small></strong>
            <span class="fd-rss-group-actions">
              <button type="button" data-rss-favgroup-rename data-rss-favgroup-target="${esc(group.name)}" aria-label="重命名">${icon("edit", "fd-small-icon")}</button>
              <button type="button" data-rss-favgroup-delete data-route="rss-favorite-clear" data-rss-favgroup-target="${esc(group.name)}" aria-label="删除">${icon("trash", "fd-small-icon")}</button>
            </span>
            ${group.pinned ? rssBadge("显示", "good") : rssBadge("隐藏", "muted")}
          </article>`).join("")}
      </section>
      <section class="fd-rss-rule-sub-actions">
        <button type="button" data-route="rss-favorite-group-edit">${icon("add", "fd-small-icon")}新增分组</button>
        <button type="button" data-rss-favgroup-sort-toggle>${icon("sort", "fd-small-icon")}拖拽排序</button>
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-starred">取消</button>
        <button type="button" data-route="rss-starred">保存</button>
      </div>`, appState);
  }

  function rssReadRecordScreen(data, appState) {
    const records = [
      { title: "Reader UI 前端输入件更新说明", source: "GitHub Releases", group: "开源项目", time: "今天 10:26", duration: "3 分 12 秒", when: "今天" },
      { title: "订阅源规则解析失败排查", source: "书源维护公告", group: "维护", time: "今天 09:58", duration: "1 分 40 秒", when: "今天" },
      { title: "Legado 订阅源配置经验整理", source: "阅读器版本讨论", group: "社区", time: "昨天 22:10", duration: "5 分 02 秒", when: "昨天" },
      { title: "本地导入完成解析", source: "本地系统通知", group: "系统", time: "周二 18:30", duration: "42 秒", when: "本周" },
      { title: "阅读器路线图讨论摘要", source: "阅读器版本讨论", group: "社区", time: "周一 20:15", duration: "2 分 18 秒", when: "本周" }
    ];
    const sourceFilter = appState?.rssRecordSourceFilter || "全部源";
    const whenFilter = appState?.rssRecordWhenFilter || "全部";
    const totalDuration = records.reduce((sum, item) => sum + parseInt(item.duration, 10) || 0, 0);
    const sources = ["全部源", "GitHub Releases", "书源维护公告", "阅读器版本讨论", "本地系统通知"];
    return rssLibraryScreen(data, "阅读记录", `
      <section class="fd-rss-record-stats" aria-label="阅读统计">
        <article><small>本周阅读</small><strong>${esc(records.length)} 条</strong></article>
        <article><small>总时长</small><strong>12 分 54 秒</strong></article>
        <article><small>日均</small><strong>2 分 34 秒</strong></article>
        <article><small>最长阅读</small><strong>Legado 订阅源配置经验整理</strong></article>
      </section>
      <section class="fd-rss-record-toolbar" aria-label="阅读记录工具栏">
        <label>${icon("search", "fd-small-icon")}<input type="search" placeholder="搜索阅读记录" data-rss-record-search aria-label="搜索阅读记录" /></label>
        ${filterDisclosure({
          className: "fd-rss-record-source-filter",
          label: "源",
          ariaLabel: "按源筛选",
          summary: sourceFilter,
          toggleAttr: "data-rss-record-source-toggle",
          open: Boolean(appState?.rssRecordSourceOpen),
          groups: [{
            title: "订阅源",
            options: sources.map((item) => ({
              label: item,
              active: sourceFilter === item,
              attrs: { "data-rss-record-source": item }
            }))
          }]
        })}
        ${filterDisclosure({
          className: "fd-rss-record-when-filter",
          label: "时间",
          ariaLabel: "按时间筛选",
          summary: whenFilter,
          toggleAttr: "data-rss-record-when-toggle",
          open: Boolean(appState?.rssRecordWhenOpen),
          groups: [{
            title: "时间范围",
            options: ["全部", "今天", "昨天", "本周", "本月"].map((item) => ({
              label: item,
              active: whenFilter === item,
              attrs: { "data-rss-record-when": item }
            }))
          }]
        })}
      </section>
      <section class="fd-rss-record-list" aria-label="阅读记录列表" data-rss-record-list data-rss-mark-read>
        ${records.map((record) => `
          <article role="button" tabindex="0" data-route="rss-detail">
            <span>${icon("clock", "fd-small-icon")}</span>
            <strong>${esc(record.title)}<small>${esc(record.source)} · ${esc(record.time)} · ${esc(record.group)} · 时长 ${esc(record.duration)}</small></strong>
            ${icon("chevron", "fd-small-icon")}
          </article>`).join("")}
      </section>
      <section class="fd-rss-bottom-loading" data-rss-record-more><i></i><span>第 1 页 / 共 1 页 · 已全部加载</span></section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss">返回列表</button>
        <button type="button" data-route="rss-record-clear">清空记录</button>
      </div>`, appState);
  }

  function rssRuleSubscriptionScreen(data, appState) {
    const subs = rssRuleSubsData().map((item, index) => Object.assign({}, item, {
      enabled: index !== 1,
      lastSync: index === 0 ? "10:18" : index === 1 ? "未同步" : "昨天 22:00",
      changes: index === 0 ? "2 新增 · 1 更新" : index === 1 ? "—" : "无变更"
    }));
    return rssShellScreen(data, "规则订阅", `
      ${rssModeNav("rss-rule-subscription")}
      <section class="fd-rss-rule-sub-list" aria-label="规则订阅列表" data-rss-rulesub-list>
        ${subs.map((item) => `
          <article role="button" tabindex="0" data-route="rss-rule-subscription-detail" data-rss-rulesub-row>
            <span>${icon(item.type === "RSS 源" ? "rss" : item.type === "书源" ? "source-stack" : "replace", "fd-small-icon")}</span>
            <strong>${esc(item.name)}<small>${esc(item.type)} · ${esc(item.url)} · 同步 ${esc(item.lastSync)} · ${esc(item.changes)}</small></strong>
            <span class="fd-rss-rulesub-row-actions">
              ${rssBadge(item.enabled ? "启用" : "暂停", item.enabled ? "good" : "muted")}
              ${settingsSwitch(item.enabled)}
              <button type="button" data-rss-rulesub-delete data-rss-rulesub-target="${esc(item.name)}" aria-label="删除订阅">${icon("trash", "fd-small-icon")}</button>
            </span>
          </article>`).join("")}
      </section>
      <section class="fd-rss-rule-sub-actions">
        <button type="button" data-route="rss-rule-subscription-detail">${icon("upload", "fd-small-icon")}打开订阅</button>
        <button type="button" data-route="rss-rule-subscription-edit" data-rss-rulesub-create>${icon("add", "fd-small-icon")}新增</button>
      </section>`, appState);
  }

  function rssRuleSubscriptionDetailScreen(data, appState) {
    const changes = [
      { name: "社区 RSS 源合集", action: "新增", detail: "新增 12 个 RSS 源，含分类入口和正文规则", tone: "good" },
      { name: "GitHub Releases", action: "更新", detail: "正文规则从 content:encoded 改为 article.content，新增登录检测 URL", tone: "warn" },
      { name: "书源维护公告", action: "跳过", detail: "本地已修改启用状态，按冲突策略保留本地", tone: "muted" }
    ];
    const history = [
      { time: "今天 10:18", result: "成功", detail: "新增 2 · 更新 1 · 跳过 1" },
      { time: "昨天 22:00", result: "成功", detail: "无变更" },
      { time: "周一 09:12", result: "部分失败", detail: "网络超时，2 个源未同步" }
    ];
    return rssLibraryScreen(data, "订阅详情", `
      <section class="fd-rss-debug-panel">
        <header>
          <span>${icon("sync", "fd-small-icon")}</span>
          <div><strong>社区 RSS 源订阅</strong><small>RSS 源 · 自动更新 · 上次同步 10:18 · 2 新增 · 1 更新</small></div>
        </header>
        <article><strong>订阅地址</strong><p>https://example.com/rss-source.json</p></article>
        <article><strong>更新策略</strong><p>Wi-Fi 下自动更新；保留本地启用状态、分组和登录态。</p></article>
      </section>
      <section class="fd-rss-import-list" aria-label="订阅变更" data-rss-rulesub-changes>
        ${changes.map((item) => `
          <article class="${item.tone === "good" ? "is-selected" : ""}" data-rss-rulesub-change data-rss-change-detail="${esc(item.detail)}">
            <span>${icon(item.tone === "good" ? "check" : item.tone === "warn" ? "edit" : "rss", "fd-small-icon")}</span>
            <strong>${esc(item.name)}<small>${esc(item.detail)}</small></strong>
            ${rssBadge(item.action, item.tone)}
            <button type="button" data-rss-change-expand aria-label="展开变更详情">${icon("chevron", "fd-small-icon")}</button>
          </article>`).join("")}
      </section>
      <section class="fd-rss-rulesub-history" aria-label="同步历史" data-rss-rulesub-history>
        <header><h2>同步历史</h2></header>
        <ol>
          ${history.map((item) => `<li><time>${esc(item.time)}</time> · <strong>${esc(item.result)}</strong> · ${esc(item.detail)}</li>`).join("")}
        </ol>
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-rule-subscription-edit">编辑</button>
        <button type="button" data-route="rss-rule-subscription-apply" data-rss-rulesub-apply>应用更新</button>
        <button type="button" data-rss-rulesub-rollback data-route="rss-rule-subscription-apply">回滚</button>
      </div>`, appState);
  }

  function rssRuleSubscriptionEditScreen(data, appState) {
    const isCreate = appState?.rssRuleSubEditMode === "create";
    const conflictStrategies = [
      "保留本地名称、分组、启用状态",
      "使用订阅覆盖本地",
      "手动逐项确认",
      "仅更新规则，保留登录态"
    ];
    return rssLibraryScreen(data, isCreate ? "新建规则订阅" : "编辑规则订阅", `
      ${isCreate ? `
      <section class="fd-rss-edit-create-bar" aria-label="新建订阅快捷">
        <button type="button" data-rss-rulesub-paste>${icon("copy", "fd-small-icon")}从剪贴板粘贴 URL</button>
        <nav aria-label="订阅类型">
          ${["RSS 源", "书源", "替换规则"].map((item, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button" data-rss-rulesub-type="${esc(item)}">${esc(item)}</button>`).join("")}
        </nav>
      </section>` : ""}
      <section class="fd-rss-edit-list" aria-label="规则订阅编辑字段" data-rss-rulesub-edit>
        <article>
          <small>基础</small>
          <strong>订阅名称</strong>
          <input type="text" value="社区 RSS 源订阅" aria-label="订阅名称" data-rss-rulesub-name />
        </article>
        <article>
          <small>基础</small>
          <strong>订阅类型</strong>
          <select aria-label="订阅类型" data-rss-rulesub-type-select>
            <option selected>RSS 源</option>
            <option>书源</option>
            <option>替换规则</option>
          </select>
        </article>
        <article>
          <small>基础</small>
          <strong>订阅地址</strong>
          <input type="url" value="https://example.com/rss-source.json" aria-label="订阅地址" data-rss-rulesub-url />
          <em class="fd-rss-edit-hint" data-rss-rulesub-validate>需为合法 URL · 可点测试连通性</em>
        </article>
        <article>
          <small>同步</small>
          <strong>自动更新</strong>
          <select aria-label="自动更新" data-rss-rulesub-autosync>
            <option selected>Wi-Fi 下自动</option>
            <option>任何网络自动</option>
            <option>手动</option>
          </select>
        </article>
        <article>
          <small>同步</small>
          <strong>冲突策略</strong>
          <div class="fd-rss-conflict-strategy" data-rss-rulesub-conflict>
            ${conflictStrategies.map((item, index) => `<label><input type="radio" name="conflict" ${index === 0 ? "checked" : ""} data-rss-rulesub-conflict-value="${esc(item)}" />${esc(item)}</label>`).join("")}
          </div>
        </article>
        <article>
          <small>安全</small>
          <strong>登录配置</strong>
          <p>不覆盖 Cookie 和账号信息</p>
        </article>
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-rule-subscription-test" data-rss-rulesub-test>测试订阅</button>
        <button type="button" data-route="rss-rule-subscription" data-rss-rulesub-save>保存</button>
      </div>`, appState);
  }

  function rssRuleSubscriptionTestScreen(data, appState) {
    return rssLibraryScreen(data, "测试规则订阅", `
      <section class="fd-rss-debug-panel">
        <header>
          <span>${icon("bug", "fd-small-icon")}</span>
          <div><strong>社区 RSS 源订阅</strong><small>请求订阅地址 · 校验结构 · 生成导入预览</small></div>
          <span class="fd-rss-debug-run">
            <button type="button" data-rss-rulesub-test-run>${icon("play", "fd-small-icon")}运行测试</button>
          </span>
        </header>
        <article><strong>1. 请求订阅地址</strong><p>https://example.com/rss-source.json 返回 200，内容类型 application/json。</p><small class="fd-rss-debug-stat">耗时 220ms · 200 OK</small></article>
        <article><strong>2. 解析订阅内容</strong><p>12 个 RSS 源、2 个更新项、1 个本地冲突。</p><small class="fd-rss-debug-stat">结构校验通过</small></article>
        <article><strong>3. 冲突策略</strong><p>保留本地名称、分组、启用状态，不覆盖登录凭据。</p><small class="fd-rss-debug-stat">1 个冲突将跳过</small></article>
      </section>
      <section class="fd-rss-debug-raw" aria-label="测试原始数据" data-rss-rulesub-raw>
        <header><h2>原始数据</h2><button type="button" data-rss-rulesub-copy-raw>${icon("copy", "fd-small-icon")}复制</button></header>
        <pre>{"version":1,"sources":[{"name":"社区 RSS 源合集","url":"...","rule":"..."}]}</pre>
      </section>
      <section class="fd-rss-webview-error" data-rss-rulesub-test-error hidden>
        <span>${icon("warning", "fd-medium-icon")}</span>
        <h3>测试失败</h3>
        <p>HTTP 404 · 订阅地址不存在 · 请检查 URL 或网络后重试。</p>
        <button type="button" data-rss-rulesub-test-retry>${icon("refresh", "fd-small-icon")}重试</button>
      </section>`, `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        <button type="button" data-route="rss-rule-subscription-edit">返回编辑</button>
        <button type="button" data-route="rss-rule-subscription-detail">查看结果</button>
      </div>`, appState);
  }

  function rssSearchScreen(data, appState) {
    const articles = rssArticlesData();
    const scope = appState?.rssSearchScope || "全部";
    const sort = appState?.rssSearchSort || "相关度";
    const keyword = appState?.rssSearchKeyword || "";
    const history = ["RSS 源", "GitHub Releases", "正文规则", "订阅源分组"];
    const suggestions = ["订阅源导入", "正文解析", "Cookie 登录", "规则订阅"];
    const highlight = (text) => keyword ? String(text).replace(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"), "<mark>$1</mark>") : esc(text);
    return rssShellScreen(data, "RSS 搜索", `
      <section class="fd-rss-search-panel">
        <label>${icon("search", "fd-small-icon")}<input type="search" placeholder="搜索订阅源、文章标题或分组" value="${esc(keyword)}" data-rss-search-input data-rss-search-submit aria-label="RSS 搜索输入" /></label>
        <button type="button" data-rss-search-clear aria-label="清空搜索">${icon("close", "fd-small-icon")}</button>
        <nav aria-label="RSS 搜索范围">
          ${["全部", "订阅源", "文章", "分组"].map((item) => `<button class="${scope === item ? "is-active" : ""}" type="button" data-rss-search-scope="${esc(item)}">${esc(item)}</button>`).join("")}
        </nav>
      </section>
      ${keyword ? `` : `
      <section class="fd-rss-search-history" aria-label="搜索历史">
        <header><h2>搜索历史</h2><button type="button" data-rss-search-history-clear>${icon("trash", "fd-small-icon")}清空历史</button></header>
        <div>${history.map((item) => `<button type="button" data-rss-search-history="${esc(item)}">${esc(item)}</button>`).join("")}</div>
      </section>
      <section class="fd-rss-search-suggest" aria-label="搜索建议">
        <h2>搜索建议</h2>
        <div>${suggestions.map((item) => `<button type="button" data-rss-search-suggest="${esc(item)}">${esc(item)}</button>`).join("")}</div>
      </section>`}
      <section class="fd-rss-article-section">
        <header>
          <h2>搜索结果${keyword ? ` · “${esc(keyword)}”` : ""}</h2>
          <span class="fd-rss-article-header-actions">
            ${filterDisclosure({
              className: "fd-rss-search-sort",
              label: "排序",
              ariaLabel: "搜索结果排序",
              summary: sort,
              toggleAttr: "data-rss-search-sort-toggle",
              open: Boolean(appState?.rssSearchSortOpen),
              groups: [{
                title: "结果排序",
                options: ["相关度", "按时间", "按源"].map((item) => ({
                  label: item,
                  active: sort === item,
                  attrs: { "data-rss-search-sort": item }
                }))
              }]
            })}
            <button type="button" data-route="rss-subscription-management">${icon("source-stack", "fd-small-icon")}管理源</button>
          </span>
        </header>
        <section class="fd-rss-article-list" aria-label="RSS 搜索结果" data-rss-mark-read>
          ${articles.slice(0, 3).map((item) => `
            <article class="fd-rss-article-row${item.unread ? " is-unread" : ""}" role="button" tabindex="0" data-route="rss-detail">
              <i></i>
              <span>
                <strong>${highlight(item.title)}</strong>
                <small>${highlight(item.source)} · ${esc(item.time)} · ${highlight(item.group)}</small>
                <p>${highlight(item.desc)}</p>
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
    const sort = appState?.rssManageSort || "按未读";
    const autoRefresh = appState?.rssAutoRefresh !== false;
    const unreadNotify = appState?.rssUnreadNotify !== false;
    return rssLibraryScreen(data, "RSS 订阅管理", `
      <section class="fd-rss-manage-actions">
        <button type="button" data-route="rss-source-edit" data-rss-manage-create>${icon("add", "fd-small-icon")}新建</button>
        <button type="button" data-route="rss-source-import">${icon("upload", "fd-small-icon")}导入</button>
        <button type="button" data-route="rss-rule-subscription">${icon("sync", "fd-small-icon")}规则订阅</button>
        <button type="button" data-route="rss-source-groups">${icon("folder", "fd-small-icon")}分组</button>
      </section>
      <section class="fd-rss-manage-search" aria-label="订阅源搜索">
        <label>${icon("search", "fd-small-icon")}<input type="search" placeholder="搜索订阅源名称或地址" data-rss-manage-search aria-label="搜索订阅源" /></label>
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
      ${filterDisclosure({
        className: "fd-rss-manage-sort",
        label: "排序",
        ariaLabel: "订阅源排序",
        summary: sort,
        toggleAttr: "data-rss-manage-sort-toggle",
        open: Boolean(appState?.rssManageSortOpen),
        groups: [{
          title: "排序方式",
          options: ["按未读", "按名称", "按最近更新", "按分组"].map((item) => ({
            label: item,
            active: sort === item,
            attrs: { "data-rss-manage-sort": item }
          }))
        }]
      })}
      <section class="fd-rss-source-list" aria-label="RSS 订阅源列表" data-rss-manage-list data-rss-mark-read>
        ${subscriptions.map((source) => `
          <article class="${source.enabled ? "" : "is-disabled"}" role="button" tabindex="0" data-route="rss-source-feed" data-rss-manage-source="${esc(source.name)}">
            <span>${icon(source.enabled ? "rss" : "offline", "fd-small-icon")}</span>
            <strong>${esc(source.name)}<small>${esc(source.group)} · ${source.unread ? `${esc(source.unread)} 条未读` : "无未读"} · ${esc(source.latest)} · ${esc(source.articleStyle)}</small></strong>
            ${rssBadge(source.status, source.tone)}
            <button type="button" data-route="rss-source-actions" data-rss-manage-actions aria-label="${esc(source.name)}更多操作">${icon("more", "fd-small-icon")}</button>
          </article>
        `).join("")}
      </section>
      <section class="fd-rss-manage-batch-row" data-rss-manage-batch>
        <strong data-rss-manage-selected>已选 2 个</strong>
        <button type="button" data-route="rss-source-batch" data-rss-manage-batch-action="batch">批量</button>
        <button type="button" data-route="rss-source-batch-disable" data-rss-manage-batch-action="disable">禁用</button>
        <button type="button" data-route="rss-source-export" data-rss-manage-batch-action="export">导出</button>
      </section>
      <section class="fd-rss-source-settings">
        <h2>刷新与提醒</h2>
        <article><span>${icon("refresh", "fd-small-icon")}</span><strong>自动刷新<small>Wi-Fi 下每 30 分钟刷新一次 · ${autoRefresh ? "已开启" : "已关闭"}</small></strong>${settingsSwitch(autoRefresh)}</article>
        <article><span>${icon("bell", "fd-small-icon")}</span><strong>未读提醒<small>只提醒重点订阅源 · ${unreadNotify ? "已开启" : "已关闭"}</small></strong>${settingsSwitch(unreadNotify)}</article>
      </section>`, "", appState);
  }

  function rssStateScreen(data, route, appState) {
    const isError = route === "rss-error";
    const isOffline = !isError && appState?.rssStateMode === "offline";
    const stateKey = isError ? "error" : (isOffline ? "offline" : "empty");
    const title = isError ? "RSS 错误" : (isOffline ? "RSS 离线" : "RSS 空状态");
    const stateClass = isError ? "is-error" : (isOffline ? "is-offline" : "is-empty");
    const stateIcon = isError ? "warning" : (isOffline ? "offline" : "rss");
    const heading = isError ? "订阅刷新失败" : (isOffline ? "当前处于离线状态" : "暂无未读订阅");

    const failedSources = [
      { name: "书源维护公告", reason: "登录态失效 · 需要重新登录", retryRoute: "rss-source-login", detailRoute: "rss-source-actions" },
      { name: "本地系统通知", reason: "源已暂停 · 不参与自动刷新", retryRoute: "rss-source-actions", detailRoute: "rss-source-actions" }
    ];

    const recommendSources = [
      { name: "GitHub Releases", desc: "开源项目版本发布", route: "rss-source-feed" },
      { name: "阅读器版本讨论", desc: "社区订阅与版本讨论", route: "rss-source-category-discussions" },
      { name: "导入 OPML", desc: "从其他阅读器导入订阅", route: "rss-source-import" }
    ];

    let bodyHtml = "";
    if (isError) {
      bodyHtml = `
        <p>2 个订阅源刷新失败，已保留最近缓存条目。可单独重试失败源、查看错误详情，或进入订阅管理修复登录态和规则。</p>
        <section class="fd-rss-error-list" aria-label="失败订阅源列表">
          ${failedSources.map((src) => `<article><span><strong>${esc(src.name)}</strong><small>${esc(src.reason)}</small></span><button type="button" data-route="${esc(src.retryRoute)}" data-rss-retry-source="${esc(src.name)}">重试</button></article>`).join("")}
        </section>`;
    } else if (isOffline) {
      bodyHtml = `
        <p>网络不可用，已切换到离线模式。可继续阅读已缓存条目，联网后将自动恢复刷新。下面是常用的订阅源入口。</p>
        <section class="fd-rss-recommend-list" aria-label="推荐订阅源">
          ${recommendSources.map((src) => `<article role="button" tabindex="0" data-route="${esc(src.route)}"><span>${icon("rss", "fd-small-icon")}</span><strong>${esc(src.name)}<small>${esc(src.desc)}</small></strong>${icon("chevron", "fd-small-icon")}</article>`).join("")}
        </section>`;
    } else {
      bodyHtml = `
        <p>当前订阅源没有新的未读条目。可查看全部、管理订阅源或手动刷新。日常空状态仍保留 RSS 主导航上下文。</p>
        <section class="fd-rss-recommend-list" aria-label="推荐订阅源">
          ${recommendSources.map((src) => `<article role="button" tabindex="0" data-route="${esc(src.route)}"><span>${icon("rss", "fd-small-icon")}</span><strong>${esc(src.name)}<small>${esc(src.desc)}</small></strong>${icon("chevron", "fd-small-icon")}</article>`).join("")}
        </section>`;
    }

    const topRetryHtml = (isError || isOffline)
      ? `<button type="button" class="fd-rss-state-retry" data-route="rss-refreshing" data-rss-retry-all>${icon("refresh", "fd-small-icon")}${isError ? "重试刷新" : "重新检测网络"}</button>`
      : "";

    const primaryLabel = isError ? "查看缓存" : (isOffline ? "查看已缓存" : "查看全部");
    const primaryRoute = (isError || isOffline) ? "rss-all" : "rss-all";

    return rssShellScreen(data, title, `
      <section class="fd-search-state fd-rss-state-card ${stateClass}" data-rss-state="${stateKey}">
        ${topRetryHtml}
        <span>${icon(stateIcon, "fd-medium-icon")}</span>
        <h2>${esc(heading)}</h2>
        ${bodyHtml}
        <div class="fd-action-row">
          <button type="button" data-route="${primaryRoute}">${esc(primaryLabel)}</button>
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
    const searchState = appState?.bookSearchState || (phase === "after" ? "after" : "before");
    const keyword = appState?.bookSearchKeyword || (searchState === "before" ? "" : "三体");
    const scope = appState?.bookSearchScope || "全部";
    const sort = appState?.bookSearchSort || "相关度";
    const scopeOptions = ["全部", "书名", "作者", "书源"];
    const sortOptions = ["相关度", "最近阅读", "最近更新"];
    const searchResults = [
      { title: "三体", author: "刘慈欣", source: "优书网", sourceType: "network", latest: "最新：第 35 章 尾声", coverKey: "threeBody", inShelf: true, multiSource: 3 },
      { title: "三体：黑暗森林", author: "刘慈欣", source: "书仓", sourceType: "network", latest: "匹配：黑暗森林 · 已完结", coverKey: "threeBody", inShelf: false, multiSource: 2 },
      { title: "三体：死神永生", author: "刘慈欣", source: "本地", sourceType: "local", latest: "最新：广播纪元", coverKey: "threeBody", inShelf: false, multiSource: 1 },
      { title: "三体全集", author: "刘慈欣", source: "快读", sourceType: "network", latest: "匹配：合集版本 · 需确认目录", coverKey: "threeBody", inShelf: true, multiSource: 4 },
      { title: "三体前传：球状闪电", author: "刘慈欣", source: "开源书仓", sourceType: "network", latest: "匹配：球状闪电 · 已完结", coverKey: "threeBody", inShelf: false, multiSource: 2 },
      { title: "三体纪事", author: "读者整理", source: "本地书", sourceType: "local", latest: "匹配：资料合集 · 本地导入", coverKey: "threeBody", inShelf: true, multiSource: 1 }
    ];
    const history = appState?.bookSearchHistory || [["长夜余火", "书名 · 网络"], ["三体", "书名 · 全部"], ["爱潜水的乌贼", "作者 · 网络"], ["本地导入", "关键词 · 本地"]];
    const suggestions = ["三体三部曲", "三体黑暗森林", "刘慈欣 球状闪电", "科幻 完本"];
    const hotSearch = ["诡秘之主", "明朝那些事儿", "人间词话", "长夜余火"];
    const failedSources = appState?.bookSearchFailedSources || [{ name: "笔趣阁", reason: "HTTP 503 · 服务不可用" }, { name: "起点中文", reason: "规则解析失败 · 选择器未命中" }];
    const requestedSources = appState?.bookSearchRequestedSources || 3;
    const totalSources = appState?.bookSearchTotalSources || 8;

    // B2 · search-results control identity (A2 registry, frozen in library-shell.js)
    const SR = window.ReaderLibraryShell;
    const srCid = {
      back: SR.controlId("search-results", "default", "phone", "button", "back"),
      searchBox: SR.controlId("search-results", "default", "phone", "searchbox", "input"),
      searchSubmit: SR.controlId("search-results", "default", "phone", "button", "search-submit"),
      addShelf: SR.controlId("search-results", "default", "phone", "button", "add-shelf"),
      textBox: SR.controlId("search-results", "default", "phone", "textbox", "input"),
      closeKeyboard: SR.controlId("search-results", "default", "phone", "button", "close-keyboard"),
      searchReset: SR.controlId("search-results", "default", "phone", "button", "search-reset"),
      viewDetail: SR.controlId("search-results", "default", "phone", "button", "view-detail")
    };
    const srStateAttr = SR.stateAttr;
    // search request token (stale result detection)
    const searchReqToken = appState?.bookSearchReqToken || "sr-001";
    const latestReqToken = appState?.bookSearchLatestReqToken || searchReqToken;
    const isStale = searchReqToken !== latestReqToken;

    const scopeChipsHtml = `<nav class="fd-chip-row fd-search-scope-row" aria-label="搜索范围" data-search-scope-row data-control-id-family="library.button.search-results.default.phone.button.search-scope">
      ${scopeOptions.map((item) => `<button class="${item === scope ? "is-active" : ""}" type="button" data-search-scope="${esc(item)}"${item === scope ? ' aria-current="true"' : ""} data-final-state="${item === scope ? "active" : "idle"}" data-focus-restore-source="search-scope">${esc(item)}</button>`).join("")}
    </nav>`;

    const searchBoxHtml = `<button class="fd-search-entry fd-keyboard-target" type="button" data-open-keyboard data-search-keyword="${esc(keyword)}"${srCid.searchBox ? ` data-control-id="${srCid.searchBox}"` : ""} data-ui-event="open.keyboard" aria-label="搜索框 · ${esc(keyword || "请输入关键词")}" data-search-phase="${esc(searchState)}" data-focus-restore-source="search-input">
      ${icon("search", "fd-small-icon")}<span>${keyword ? esc(keyword) : "搜索书名、作者、关键词"}</span>
    </button>`;

    let stateHtml = "";
    if (searchState === "loading") {
      stateHtml = `
        <section class="fd-search-state fd-search-loading" data-search-state="loading" data-loading-state="loading" aria-live="polite"${isStale ? ' data-stale-result="true"' : ''}>
          <div class="fd-search-progress">
            <strong>正在搜索"${esc(keyword)}"</strong>
            <span>已请求 ${esc(String(requestedSources))} / ${esc(String(totalSources))} 个书源</span>
          </div>
          <div class="fd-search-progress-bar" role="progressbar" aria-valuenow="${esc(String(requestedSources))}" aria-valuemax="${esc(String(totalSources))}" aria-label="搜索进度"><i style="width:${esc(String(Math.round(requestedSources / totalSources * 100)))}%"></i></div>
          <div class="fd-search-skeleton-list" aria-label="搜索结果加载中">
            ${Array.from({ length: 4 }).map(() => `<article class="fd-search-skeleton-row"><i class="fd-skeleton-cover"></i><span><i class="fd-skeleton-line"></i><i class="fd-skeleton-line is-short"></i></span></article>`).join("")}
          </div>
        </section>`;
    } else if (searchState === "empty") {
      stateHtml = `
        <section class="fd-search-state fd-search-empty" data-search-state="empty" data-empty-state="empty" data-stale-result="${isStale ? "true" : "false"}">
          <div class="fd-search-empty-visual">${icon("search", "fd-medium-icon")}</div>
          <h2>没有找到"${esc(keyword)}"相关书籍</h2>
          <p>可调整搜索范围、切换书源或尝试以下建议。</p>
          <section class="fd-search-suggest" aria-label="搜索建议" data-control-id-family="library.button.search-results.default.phone.button.search-suggest">
            <strong>搜索建议</strong>
            <div class="fd-chip-row">${suggestions.map((item) => `<button type="button" data-search-suggest="${esc(item)}" data-final-state="idle" data-focus-restore-source="search-suggest">${esc(item)}</button>`).join("")}</div>
          </section>
          <section class="fd-search-suggest" aria-label="热门搜索" data-control-id-family="library.button.search-results.default.phone.button.search-hot">
            <strong>热门搜索</strong>
            <div class="fd-chip-row">${hotSearch.map((item) => `<button type="button" data-search-suggest="${esc(item)}" data-final-state="idle" data-focus-restore-source="search-hot">${esc(item)}</button>`).join("")}</div>
          </section>
        </section>`;
    } else if (searchState === "error") {
      stateHtml = `
        <section class="fd-search-state fd-search-error" data-search-state="error" data-error-state="partial" data-stale-result="${isStale ? "true" : "false"}" role="alert">
          <div class="fd-search-error-visual">${icon("warning", "fd-medium-icon")}</div>
          <h2>部分书源搜索失败</h2>
          <p>已返回 ${esc(String(searchResults.length))} 条来自其他书源的结果，以下书源失败可单独重试。</p>
          <section class="fd-search-error-list" aria-label="失败书源列表" data-control-id-family="library.button.search-results.default.phone.button.search-retry-source">
            ${failedSources.map((src) => `<article><span><strong>${esc(src.name)}</strong><small>${esc(src.reason)}</small></span><button type="button" data-search-retry-source="${esc(src.name)}" data-repeat-tap-guard="search-retry" data-final-state="idle" data-focus-restore-source="search-retry">重试</button></article>`).join("")}
          </section>
          <section class="fd-search-results fd-search-partial" aria-label="部分搜索结果">
            ${searchResults.slice(0, 3).map((book) => `<article class="fd-search-result-row"><img src="${cover(data, book.coverKey)}" alt="${esc(book.title)}封面"><span class="fd-search-result-main"><strong>${esc(book.title)}</strong><small><b>${esc(book.author)}</b><em>${esc(book.source)}</em></small></span></article>`).join("")}
          </section>
        </section>`;
    } else if (searchState === "after") {
      const sortRowHtml = `<header class="fd-search-section-head fd-search-result-head">
        <h2>搜索结果 <small>${esc(String(searchResults.length))} 个 · 已标注书架状态</small></h2>
        <div class="fd-search-sort-row" aria-label="结果排序" data-control-id-family="library.button.search-results.default.phone.button.search-sort">
          ${sortOptions.map((item) => `<button class="${item === sort ? "is-active" : ""}" type="button" data-search-sort="${esc(item)}"${item === sort ? ' aria-current="true"' : ""} data-final-state="${item === sort ? "active" : "idle"}" data-focus-restore-source="search-sort">${esc(item)}</button>`).join("")}
        </div>
      </header>`;
      stateHtml = `
        <section class="fd-search-results" data-search-state="after">
          ${sortRowHtml}
          <div class="fd-search-result-list" aria-label="搜索结果列表" data-control-id-family="library.button.search-results.default.phone.button.search-result-row" data-stale-result="${isStale ? "true" : "false"}">
            ${searchResults.map((book, index) => {
              const addState = book.inShelf ? "added" : (appState?.bookSearchAddState && appState.bookSearchAddState[index] || "idle");
              const addButton = book.inShelf || addState === "added"
                ? `<button type="button" class="is-added" data-route="immersive-reading" data-add-state="added"${srCid.addShelf ? ` data-control-id="${srCid.addShelf}"` : ""} data-ui-event="route.push" data-final-state="added" data-book-index="${esc(String(index))}" aria-label="已在书架 · 阅读本书">已在书架 · 阅读</button>`
                : addState === "loading"
                  ? `<button type="button" disabled data-add-state="loading"${srCid.addShelf ? ` data-control-id="${srCid.addShelf}"` : ""} data-ui-event="add.shelf" data-repeat-tap-guard="add-shelf-loading" data-final-state="loading" data-book-index="${esc(String(index))}" aria-label="正在加入书架">加入中…</button>`
                  : addState === "failed"
                    ? `<button type="button" class="is-failed" data-add-search-shelf data-add-state="failed"${srCid.addShelf ? ` data-control-id="${srCid.addShelf}"` : ""} data-ui-event="add.shelf" data-repeat-tap-guard="add-shelf" data-final-state="failed" data-book-index="${esc(String(index))}" aria-label="加入书架失败 · 点击重试">失败 · 重试</button>`
                    : `<button type="button" data-add-search-shelf data-add-state="idle"${srCid.addShelf ? ` data-control-id="${srCid.addShelf}"` : ""} data-ui-event="add.shelf" data-repeat-tap-guard="add-shelf" data-final-state="idle" data-book-index="${esc(String(index))}" aria-label="加入书架">加入书架</button>`;
              return `
              <article class="fd-search-result-row" role="button" tabindex="0" data-route="book-detail" data-book-source-type="${book.sourceType}"${srCid.viewDetail ? ` data-control-id="${srCid.viewDetail}"` : ""} data-ui-event="route.push" data-book-index="${esc(String(index))}" data-focus-restore-source="search-result">
                <img src="${cover(data, book.coverKey)}" alt="${esc(book.title)}封面" loading="lazy" data-cover-fallback>
                <span class="fd-search-result-main">
                  <strong>${esc(book.title)}</strong>
                  <small><b>${esc(book.author)}</b><em>${esc(book.source)}</em>${book.multiSource > 1 ? `<i class="fd-search-multi-source" aria-label="多书源匹配">${esc(String(book.multiSource))} 源</i>` : ""}</small>
                  <small>${esc(book.latest)}</small>
                </span>
                <span class="fd-search-result-state ${book.inShelf ? "is-in-shelf" : ""}">${book.inShelf ? "已在书架" : "未加入"}</span>
                ${addButton}
              </article>`;
            }).join("")}
          </div>
          <p class="fd-search-pagination-hint">显示前 ${esc(String(searchResults.length))} 条 · 滚动加载更多</p>
        </section>`;
    } else {
      stateHtml = `
        <section class="fd-search-state fd-search-state-before" data-search-state="before">
          <header class="fd-search-section-head">
            <h2>搜索历史</h2>
            <button type="button" data-search-clear-history data-open-confirm data-ui-event="dialog.open" data-final-state="idle" aria-label="清空搜索历史" data-focus-restore-source="search-clear-history">清空</button>
          </header>
          <div class="fd-search-history-list" aria-label="搜索历史" data-search-history data-control-id-family="library.button.search-results.default.phone.button.search-history">
            ${history.map(([kw, meta]) => `
              <button class="fd-search-history-row" type="button" data-search-submit data-search-keyword="${esc(kw)}" data-final-state="filled" data-focus-restore-source="search-history">
                ${icon("clock", "fd-small-icon")}
                <span><strong>${esc(kw)}</strong><small>${esc(meta)}</small></span>
                <em>填入</em>
              </button>`).join("")}
          </div>
          <section class="fd-search-suggest" aria-label="搜索建议" data-control-id-family="library.button.search-results.default.phone.button.search-suggest">
            <strong>搜索建议</strong>
            <div class="fd-chip-row">${suggestions.map((item) => `<button type="button" data-search-suggest="${esc(item)}" data-final-state="idle" data-focus-restore-source="search-suggest">${esc(item)}</button>`).join("")}</div>
          </section>
          <section class="fd-search-suggest" aria-label="热门搜索" data-control-id-family="library.button.search-results.default.phone.button.search-hot">
            <strong>热门搜索</strong>
            <div class="fd-chip-row">${hotSearch.map((item) => `<button type="button" data-search-suggest="${esc(item)}" data-final-state="idle" data-focus-restore-source="search-hot">${esc(item)}</button>`).join("")}</div>
          </section>
          <section class="fd-search-recent" aria-label="最近阅读快捷入口">
            <strong>最近阅读</strong>
            <button type="button" data-route="immersive-reading" data-control-id="library.button.search-results.default.phone.button.route-immersive-reading" data-ui-event="route.push" data-final-state="idle" data-focus-restore-source="search-recent">${icon("book-open", "fd-small-icon")}<span>继续阅读上次书籍</span></button>
          </section>
        </section>`;
    }

    const bottomActions = searchState === "loading"
      ? `<button type="button" data-search-cancel data-route="search-home"${srCid.closeKeyboard ? ` data-control-id="${srCid.closeKeyboard}"` : ""} data-ui-event="route.push" data-repeat-tap-guard="search-cancel" data-final-state="idle" aria-label="取消搜索并返回首页">取消搜索</button>`
      : searchState === "empty"
        ? `<button type="button" data-search-reset data-route="search-home"${srCid.searchReset ? ` data-control-id="${srCid.searchReset}"` : ""} data-ui-event="search.reset" data-repeat-tap-guard="search-reset" data-final-state="idle" aria-label="重新搜索">重新搜索</button><button type="button" data-route="discover" data-ui-event="route.push" data-final-state="idle" aria-label="前往发现页">去发现</button>`
        : searchState === "error"
          ? `<button type="button" data-search-retry data-route="search-loading"${srCid.searchReset ? ` data-control-id="${srCid.searchReset}"` : ""} data-ui-event="search.retry" data-repeat-tap-guard="search-retry-all" data-final-state="idle" aria-label="重试所有失败书源">全部重试</button><button type="button" data-route="source-management" data-ui-event="route.push" data-final-state="idle" aria-label="打开书源管理">书源管理</button>`
          : searchState === "after"
            ? `<button type="button" data-search-reset data-route="search-home"${srCid.searchReset ? ` data-control-id="${srCid.searchReset}"` : ""} data-ui-event="search.reset" data-repeat-tap-guard="search-reset" data-final-state="idle" aria-label="重新搜索">重新搜索</button><button type="button" data-route="book-detail"${srCid.viewDetail ? ` data-control-id="${srCid.viewDetail}"` : ""} data-ui-event="route.push" data-repeat-tap-guard="view-detail" data-final-state="idle" aria-label="查看所选书籍详情">查看详情</button>`
            : `<button type="button" data-search-submit data-primary-search-submit${srCid.searchSubmit ? ` data-control-id="${srCid.searchSubmit}"` : ""} data-ui-event="search.submit" data-repeat-tap-guard="search-submit" data-final-state="idle" aria-label="开始搜索">开始搜索</button><button type="button" data-search-clear-history data-ui-event="dialog.open" data-repeat-tap-guard="clear-history" data-final-state="idle" aria-label="清除搜索历史">清除历史</button>`;

    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title: "书籍搜索",
      ariaLabel: "书籍搜索",
      topBarClass: "fd-back-bar",
      topBarHtml: `<section class="rsk-back-top-bar fd-back-bar" data-slot="backTopBar" aria-label="返回顶栏"><button type="button" aria-label="返回书架"${srCid.back ? ` data-control-id="${srCid.back}"` : ""} data-ui-event="route.back" data-focus-restore-source="search-back">${icon("back", "rsk-icon")}</button><h1>书籍搜索</h1><span></span></section>`,
      bottomActionHostClass: "fd-bottom-action-host",
      dialogHostClass: "fd-dialog-host",
      contentHtml: `
        ${searchBoxHtml}
        ${searchState === "before" ? `<nav class="fd-chip-row fd-search-scope-hidden" aria-label="搜索范围" hidden></nav>` : scopeChipsHtml}
        ${stateHtml}
        <div data-keyboard-layer-slot data-control-id-family="library.button.search-results.default.phone.button.close-keyboard"${srCid.closeKeyboard ? ` data-close-keyboard-cid="${srCid.closeKeyboard}"` : ""} data-keyboard-state="closed">${keyboardLayer()}</div>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          ${bottomActions}
        </div>`,
      dialogHtml: `
        <section class="fd-demo-dialog" aria-hidden="true" data-demo-dialog data-search-clear-dialog data-dialog-state="closed" data-dialog-role="search-clear" data-dialog-open-trigger="search-clear-history">
          <h2>清空搜索历史？</h2>
          <p>将清除全部 ${esc(String(history.length))} 条搜索历史，不影响书架数据。</p>
          <div>
            <button type="button" data-close-dialog data-dialog-action="cancel" data-ui-event="dialog.close" data-final-state="cancelled" data-focus-restore-source="search-clear-history">取消</button>
            <button class="is-danger" type="button" data-close-dialog data-search-confirm-clear data-dialog-action="confirm" data-ui-event="search.clear-history" data-repeat-tap-guard="confirm-clear" data-final-state="cleared" aria-label="确认清空搜索历史">清空</button>
          </div>
        </section>`
    }));
  }

  function libraryScreen(data, appState) {
    const shelfBooks = (data.mainTabs && data.mainTabs.books) || [];
    const detailIndex = appState?.bookDetailBookIndex != null ? Number(appState.bookDetailBookIndex) : null;
    const baseBook = (detailIndex != null && shelfBooks[detailIndex]) ? shelfBooks[detailIndex] : data.library.book;
    const sourceType = bookSourceType(baseBook);
    const isLocal = sourceType.type === "local";
    const isTocPreview = appState?.bookDetailMode === "toc-preview";
    const tocState = appState?.tocState || "ready";
    // B2 · book-detail page state atom: loading state visually equals default (visual parity),
    // but the canonical controlIds differ (state atom = "loading" vs "default").
    const bookDetailState = tocState === "loading" ? "loading" : "default";
    const bookDetailControlIds = bookDetailState === "loading" ? {
      back: "library.button.book-detail.loading.phone.button.h-8e013e5e",
      openSourceSheet: "library.button.book-detail.loading.phone.button.open-sheet-h-dbced97d",
      fullDirectory: "library.button.book-detail.loading.phone.button.route-book-directory-h-43a5142f",
      continueReading: "library.button.book-detail.loading.phone.button.route-immersive-reading-h-b8e9c1ea",
      openRemoveDialog: "library.button.book-detail.loading.phone.button.open-dialog-h-ee4a1410",
      linkYoushu: "library.button.book-detail.loading.phone.button.h-a00a075e",
      linkShucang: "library.button.book-detail.loading.phone.button.h-2ba23a0d",
      localCache: "library.button.book-detail.loading.phone.button.h-7f1a5c43",
      closeSourceSheet: "library.button.book-detail.loading.phone.button.close-sheet-h-9c70cbb6",
      dialogCancel: "library.button.book-detail.loading.phone.button.close-dialog-h-52739496",
      dialogConfirmRemove: "library.button.book-detail.loading.phone.button.close-dialog-h-bab81d89"
    } : {
      back: "library.button.book-detail.default.phone.button.h-26b6dc06",
      openSourceSheet: "library.button.book-detail.default.phone.button.open-sheet-h-89d3856b",
      fullDirectory: "library.button.book-detail.default.phone.button.route-book-directory-h-61303ebc",
      continueReading: "library.button.book-detail.default.phone.button.route-immersive-reading-h-6e3349ba",
      openRemoveDialog: "library.button.book-detail.default.phone.button.open-dialog-h-01b8801a",
      linkYoushu: "library.button.book-detail.default.phone.button.h-23bde952",
      linkShucang: "library.button.book-detail.default.phone.button.h-fa2cbba6",
      localCache: "library.button.book-detail.default.phone.button.h-2070f028",
      closeSourceSheet: "library.button.book-detail.default.phone.button.close-sheet-h-68d3e051",
      dialogCancel: "library.button.book-detail.default.phone.button.close-dialog-h-20037587",
      dialogConfirmRemove: "library.button.book-detail.default.phone.button.close-dialog-h-a5584917"
    };
    const cid = bookDetailControlIds;
    const backTopBarHtml = `
      <section class="rsk-back-top-bar fd-back-bar" data-slot="backTopBar" aria-label="书籍详情返回栏">
        <button type="button" aria-label="返回" data-control-id="${cid.back}" data-ui-event="route.back" data-focus-restore-source="bookshelf-entry">${icon("back", "rsk-icon")}</button>
        <h1>书籍详情</h1>
        <span></span>
      </section>`;
    const inShelf = appState?.bookInShelf !== false;
    const book = Object.assign({}, baseBook, {
      latest: baseBook.latest || baseBook.chapter || "—",
      source: baseBook.source || (isLocal ? "本地文件" : "优书网 · 20 分钟前更新"),
      meta: baseBook.meta || (isLocal ? "本地 · EPUB · 2.4 MB" : "科幻 · 连载 · 83.6 万字")
    });
    const sourceName = String(book.source || "").split("·")[0].trim() || "当前书源";
    const intro = book.intro || "旧世界的余烬尚未冷却，新的秩序已经在废墟之上生长。主角沿着被遗忘的线索追寻真相，也在一次次选择里确认自己想守住的东西。";
    const cachedChapters = data.library.chapters.filter((c) => chapterHasMarker(c, "已缓存")).length;
    const cacheMeta = isLocal ? "本地文件 · 离线可读" : `已缓存 ${cachedChapters}/${data.library.chapters.length} 章 · 约 12 MB`;
    const sourceList = isLocal ? [] : [
      { name: "优书网", meta: "当前 · 20 分钟前更新 · 180ms", current: true },
      { name: "书仓搜索", meta: "120ms · 已缓存", current: false },
      { name: "快读", meta: "210ms", current: false },
      { name: "开源书仓", meta: "95ms · 延迟最低", current: false }
    ];
    const tocSectionHtml = (() => {
      if (tocState === "loading") {
        return `<section class="fd-chapter-list fd-book-chapter-preview is-toc-loading" aria-live="polite" data-toc-state="loading" data-loading-state="loading">
          <header><h2>章节信息</h2><button class="fd-inline-route" type="button" data-route="book-directory" data-control-id="${cid.fullDirectory}" data-ui-event="route.push" data-loading-state="idle">${icon("directory", "fd-small-icon")}完整目录</button></header>
          <div class="fd-toc-skeleton-list" aria-label="章节列表加载中">${Array.from({ length: 5 }).map(() => `<article class="fd-toc-skeleton-row"><i class="fd-skeleton-line"></i></article>`).join("")}</div>
        </section>`;
      }
      if (tocState === "error") {
        return `<section class="fd-chapter-list fd-book-chapter-preview is-toc-error" role="alert" data-toc-state="error" data-error-state="error" data-stale-result="true">
          <header><h2>章节信息</h2></header>
          <div class="fd-toc-state-card is-error">${icon("warning", "fd-medium-icon")}<h3>目录加载失败</h3><p>书源请求失败，可重试或更换书源。</p><div class="fd-action-row"><button type="button" data-toc-retry data-loading-state="idle" data-repeat-tap-guard="true" data-ui-event="toc.retry">重试</button>${isLocal ? "" : `<button type="button" data-open-sheet data-control-id="${cid.openSourceSheet}" data-ui-event="sheet.open" data-loading-state="idle">更换书源</button>`}</div></div>
        </section>`;
      }
      if (tocState === "offline") {
        return `<section class="fd-chapter-list fd-book-chapter-preview is-toc-offline" role="status" data-toc-state="offline" data-empty-state="partial">
          <header><h2>章节信息</h2></header>
          <div class="fd-toc-state-card is-offline">${icon("offline", "fd-medium-icon")}<h3>离线模式</h3><p>仅展示已缓存章节，网络恢复后可加载完整目录。</p></div>
          ${data.library.chapters.filter((c) => chapterHasMarker(c, "已缓存")).map((chapter, index) => `<article class="${chapterIsCurrent(chapter) ? "is-current" : ""}" role="button" tabindex="0" data-route="immersive-reading" data-control-id-family="library.listrow-action.book-detail.default.phone.button.route-immersive-reading" data-control-id="library.listrow-action.book-detail.default.phone.button.route-immersive-reading.offline-${esc(String(index))}" data-ui-event="route.push"><span>${esc(chapter.title)}</span>${chapterMarkerSlots(chapter, appState, { book, chapterIndex: index })}</article>`).join("")}
        </section>`;
      }
      const previewCount = isTocPreview ? 6 : data.library.chapters.length;
      const chapters = data.library.chapters.slice(0, previewCount);
      return `<section class="fd-chapter-list fd-book-chapter-preview${isTocPreview ? " is-toc-preview" : ""}" data-toc-state="ready" data-loading-state="ready" data-empty-state="${chapters.length === 0 ? "empty" : "non-empty"}">
        <header>
          <h2>${isTocPreview ? "目录预览" : "章节信息"}</h2>
          <button class="fd-inline-route" type="button" data-route="book-directory" data-control-id="${cid.fullDirectory}" data-ui-event="route.push" data-loading-state="idle">${icon("directory", "fd-small-icon")}完整目录</button>
        </header>
        ${chapters.map((chapter, index) => `
          <article class="${chapterIsCurrent(chapter) ? "is-current" : ""}" role="button" tabindex="0" data-route="immersive-reading" data-chapter-index="${esc(String(index))}" data-control-id-family="library.listrow-action.book-detail.default.phone.button.route-immersive-reading" data-control-id="library.listrow-action.book-detail.default.phone.button.route-immersive-reading.row-${esc(String(index))}" data-ui-event="route.push">
            <span>${esc(chapter.title)}</span>
            ${chapterMarkerSlots(chapter, appState, { book, chapterIndex: index })}
          </article>
        `).join("")}
        ${isTocPreview ? `<button class="fd-toc-preview-more" type="button" data-route="book-directory" data-control-id="${cid.fullDirectory}" data-ui-event="route.push" data-loading-state="idle">查看全部 ${esc(String(data.library.chapters.length))} 章${icon("chevron", "fd-small-icon")}</button>` : ""}
      </section>`;
    })();
    const heroSourceRow = isLocal
      ? `<div class="fd-book-inline-source-row"><span>${icon("folder", "fd-small-icon")}本地文件 · 离线可读</span><span class="fd-book-cache-meta">${esc(book.meta)}</span></div>`
      : `<div class="fd-book-inline-source-row"><span>书源：${esc(sourceName)}</span><button class="fd-book-inline-source-button" type="button" data-open-sheet data-control-id="${cid.openSourceSheet}" data-ui-event="sheet.open" data-sheet-state="closed" data-sheet-target="source-sheet" data-stale-result="false" data-focus-restore-source="source-sheet-trigger">更换书源</button></div>
         <div class="fd-book-cache-row"><span class="fd-book-source-badge ${sourceType.badgeClass}">${esc(sourceType.badge)}</span><span class="fd-book-cache-meta">${esc(cacheMeta)}</span>${cachedChapters > 0 ? `<button type="button" class="fd-book-cache-manage" data-book-cache-manage data-control-id="${cid.localCache}" data-ui-event="route.push" data-loading-state="idle">管理缓存</button>` : ""}</div>`;
    const bottomActions = inShelf
      ? `<button type="button" data-route="immersive-reading" data-control-id="${cid.continueReading}" data-ui-event="route.push" data-loading-state="idle">继续阅读</button>${isLocal ? "" : `<button type="button" data-book-action="cache" data-loading-state="idle" data-repeat-tap-guard="true">缓存本书</button>`}<button class="is-danger" type="button" data-open-dialog data-control-id="${cid.openRemoveDialog}" data-ui-event="dialog.open" data-dialog-state="closed" data-dialog-target="remove-dialog" data-focus-restore-source="remove-dialog-trigger">移除书架</button>`
      : `<button class="is-primary" type="button" data-book-add-shelf data-add-state="idle" data-loading-state="idle" data-repeat-tap-guard="true">加入书架</button><button type="button" data-route="immersive-reading" data-control-id="${cid.continueReading}" data-ui-event="route.push" data-loading-state="idle">试读</button>`;
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title: "书籍详情",
      ariaLabel: "书籍详情",
      topBarClass: "fd-back-bar",
      topBarHtml: backTopBarHtml,
      bottomActionHostClass: "fd-bottom-action-host",
      sheetHostClass: "fd-sheet-host",
      dialogHostClass: "fd-dialog-host",
      contentHtml: `
        <section class="fd-book-hero fd-book-detail-hero" data-book-detail data-book-source-type="${sourceType.type}" data-loading-state="${tocState === "loading" ? "loading" : "ready"}" data-page-state="${bookDetailState}">
          <img src="${cover(data, book.coverKey)}" alt="${esc(book.title)}封面" data-cover-fallback>
          <div class="fd-book-identity">
            <h2>${esc(book.title)}</h2>
            <p class="fd-book-author">${esc(book.author)}</p>
            <dl class="fd-book-facts">
              <div><dt>最新</dt><dd>${esc(book.latest)}</dd></div>
              <div><dt>${isLocal ? "文件" : "字数"}</dt><dd>${esc(book.meta)}</dd></div>
            </dl>
            ${heroSourceRow}
          </div>
        </section>
        <nav class="fd-book-external-links" aria-label="外部搜索链接" data-link-group="book-external">
          <button type="button" data-book-external-link="youshu" data-control-id="${cid.linkYoushu}" data-ui-event="route.push" data-loading-state="idle" aria-label="在优书网搜索 ${esc(book.title)}">优书网</button>
          <button type="button" data-book-external-link="shucang" data-control-id="${cid.linkShucang}" data-ui-event="route.push" data-loading-state="idle" aria-label="在书仓搜索 ${esc(book.title)}">书仓搜索</button>
          ${isLocal ? `<button type="button" data-book-external-link="local-cache" data-control-id="${cid.localCache}" data-ui-event="route.push" data-loading-state="idle" aria-label="管理本地缓存">本地缓存</button>` : ""}
        </nav>
        <section class="fd-book-summary-card">
          <h2>简介</h2>
          <p>${esc(intro)}</p>
        </section>
        ${tocSectionHtml}`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          ${bottomActions}
        </div>`,
      sheetHtml: `
        <section class="fd-demo-sheet" aria-hidden="true" data-demo-sheet data-source-sheet>
          <div class="fd-sheet-grabber"></div>
          <h2>更换书源</h2>
          ${sourceList.map((src) => `<button type="button" data-source-option="${esc(src.name)}"${src.current ? ' aria-current="true"' : ""} class="${src.current ? "is-current" : ""}"><span><strong>${esc(src.name)}</strong><small>${esc(src.meta)}</small></span>${src.current ? '<em>当前</em>' : ""}</button>`).join("")}
          <button type="button" data-close-sheet>关闭</button>
        </section>`,
      dialogHtml: `
        <section class="fd-demo-dialog" aria-hidden="true" data-demo-dialog data-remove-dialog data-dialog-state="closed" data-dialog-role="remove" data-dialog-open-trigger="open-remove-dialog">
          <h2>移出书架？</h2>
          <p>只从书架移除，不删除本地文件和阅读记录。</p>
          <label class="fd-book-remove-cache"><input type="checkbox" data-remove-cache>同时删除已缓存章节（${esc(String(cachedChapters))} 章 · 约 12 MB）</label>
          <div>
            <button type="button" data-close-dialog data-control-id="${cid.dialogCancel}" data-ui-event="dialog.cancel" data-dialog-action="cancel" data-focus-restore-source="remove-dialog-trigger">取消</button>
            <button class="is-danger" type="button" data-close-dialog data-book-confirm-remove data-control-id="${cid.dialogConfirmRemove}" data-ui-event="dialog.confirm" data-dialog-action="confirm-remove" data-loading-state="idle" data-repeat-tap-guard="true" data-final-state="confirm-remove">移除</button>
          </div>
        </section>`
    }));
  }

  function bookshelfEmptyScreen(data, appState) {
    const variant = appState?.bookshelfEmptyVariant;
    const stateVisual = (iconName, tone) => `<div class="fd-bookshelf-empty-visual is-${tone}" aria-hidden="true"><span>${icon(iconName, "fd-medium-icon")}</span><i></i><i></i></div>`;
    let visual = `<div class="fd-bookshelf-empty-visual" aria-hidden="true"><span>${icon("bookshelf", "fd-medium-icon")}</span><i></i><i></i></div>`;
    let heading = "书架还是空的";
    let summary = "添加网络书籍或导入本地文件后，会在这里显示继续阅读和书架内容。";
    let bodyHtml = "";
    if (variant === "offline") {
      visual = stateVisual("offline", "offline");
      heading = "离线模式";
      summary = "网络不可用，书架暂无缓存书籍可读。网络恢复后可重新加载书架。";
      bodyHtml = `
        <div class="fd-bookshelf-empty-actions">
          <button class="is-primary" type="button" data-bookshelf-retry>${icon("refresh", "fd-small-icon")}<span><strong>重新加载</strong><small>检测网络并刷新书架</small></span></button>
          <button type="button" data-route="local-import">${icon("folder", "fd-small-icon")}<span><strong>导入本地书</strong><small>本地文件离线可读</small></span></button>
        </div>`;
    } else if (variant === "error") {
      visual = stateVisual("warning", "error");
      heading = "书架加载失败";
      summary = "书架数据加载失败，请检查网络或书源后重试。已缓存的书籍仍可阅读。";
      bodyHtml = `
        <div class="fd-bookshelf-empty-actions">
          <button class="is-primary" type="button" data-bookshelf-retry>${icon("refresh", "fd-small-icon")}<span><strong>重试</strong><small>重新加载书架数据</small></span></button>
          <button type="button" data-route="bookshelf-search-settings">${icon("gear", "fd-small-icon")}<span><strong>书架设置</strong><small>检查书源与同步配置</small></span></button>
        </div>`;
    } else {
      bodyHtml = `
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
        ${variant === "first-use" ? `<section class="fd-bookshelf-onboarding" aria-label="首次使用引导">
          <article>${icon("sparkle", "fd-small-icon")}<span><strong>添加书源</strong><small>在书源管理导入书源后即可搜索发现书籍</small></span><button type="button" data-route="source-management">去添加</button></article>
          <article>${icon("folder", "fd-small-icon")}<span><strong>导入本地书</strong><small>支持 EPUB / TXT / MOBI 等格式</small></span><button type="button" data-route="local-import">选择文件</button></article>
          <article>${icon("people", "fd-small-icon")}<span><strong>建立分组</strong><small>按追更、本地书、资料等分组管理书籍</small></span><button type="button" data-route="group-management">新建分组</button></article>
        </section>` : ""}
        <section class="fd-bookshelf-empty-hints" aria-label="可选入口">
          <button type="button" data-route="discover">${icon("sparkle", "fd-small-icon")}去发现</button>
          <button type="button" data-route="bookshelf-search-settings">${icon("gear", "fd-small-icon")}书架设置</button>
        </section>`;
    }
    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone"), {
      data,
      title: "书架",
      activeType: "bookshelf",
      actions: ["search", "more"],
      ariaLabel: "书架空状态",
      contentHtml: `
        <section class="fd-bookshelf-shelf-section is-empty" aria-label="我的书架">
          ${bookshelfSectionHeader("cover", true, appState)}
          <section class="fd-bookshelf-empty-state is-${esc(variant || "empty")}" data-slot="bookshelfEmpty" data-empty-variant="${esc(variant || "empty")}" aria-label="书架空状态">
            ${visual}
            <h2>${esc(heading)}</h2>
            <p>${esc(summary)}</p>
            ${bodyHtml}
          </section>
        </section>`,
      stateHostHtml: `
        <p class="fd-nav-feedback">当前 Tab：书架</p>
        ${bookshelfMoreLayer()}`
    }));
  }

  function bookDirectoryScreen(data, appState) {
    const tocMode = appState?.readerTocMode === "bookmark" ? "bookmark" : "directory";
    const tocState = appState?.tocState || "ready";
    const book = data.library.book;
    const chapters = data.library.chapters.concat([
      { title: "第 34 章 旧地图", markers: ["已缓存"] },
      { title: "第 35 章 夜行", markers: [] },
      { title: "第 36 章 灯塔之后", markers: ["书签"] }
    ]);
    const visibleChapters = tocMode === "bookmark" ? chapters.filter((chapter) => chapterHasMarker(chapter, "书签")) : chapters;
    const currentIndex = chapters.findIndex((chapter) => chapterIsCurrent(chapter));
    const currentChapter = currentIndex >= 0 ? chapters[currentIndex] : null;
    let rowsHtml = "";
    if (tocState === "loading") {
      rowsHtml = `<div class="fd-toc-skeleton-list" aria-label="目录加载中" aria-live="polite">${Array.from({ length: 8 }).map(() => `<article class="fd-toc-skeleton-row"><i class="fd-skeleton-line"></i></article>`).join("")}</div>`;
    } else if (tocState === "error") {
      rowsHtml = `<div class="fd-toc-state-card is-error" role="alert">${icon("warning", "fd-medium-icon")}<h3>目录加载失败</h3><p>书源请求失败，可重试或返回书籍详情。</p><div class="fd-action-row"><button type="button" data-toc-retry>重试</button><button type="button" data-route="book-detail">返回详情</button></div></div>`;
    } else {
      rowsHtml = `<div class="fd-directory-full-rows">
        ${currentChapter ? `<div class="fd-directory-current-marker" aria-label="当前阅读位置"><small>当前阅读</small><strong>${esc(currentChapter.title)}</strong></div>` : ""}
        ${visibleChapters.map((chapter) => {
          const chapterIndex = Math.max(0, chapters.indexOf(chapter));
          return `
        <article class="${chapterIsCurrent(chapter) ? "is-current" : ""}" role="button" tabindex="0" data-route="immersive-reading" data-chapter-index="${esc(String(chapterIndex))}">
          <span>${esc(chapter.title)}</span>
          ${chapterMarkerSlots(chapter, appState, { book, chapterIndex })}
        </article>
        `;
        }).join("")}
      </div>`;
    }
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title: "书籍目录",
      ariaLabel: "书籍目录",
      topBarClass: "fd-back-bar",
      contentHtml: `
        <section class="fd-chapter-list fd-directory-full-list" data-toc-state="${esc(tocState)}">
          <header class="fd-directory-full-head">
            <span>
              <strong>${esc(book.title)}</strong>
              <small>${esc(book.author)} · 共 ${esc(chapters.length)} 章${currentChapter ? ` · 已读至 ${esc(String(currentIndex + 1))}` : ""}</small>
            </span>
          </header>
          <nav class="fd-directory-toc-switch-row" aria-label="目录书签切换">
            <button class="${tocMode === "directory" ? "is-active" : ""}" type="button" data-reader-toc-mode="directory">目录</button>
            <button class="${tocMode === "bookmark" ? "is-active" : ""}" type="button" data-reader-toc-mode="bookmark">书签</button>
          </nav>
          ${rowsHtml}
        </section>`
    }));
  }

  function sortFilterScreen(data, appState) {
    const books = (data.mainTabs && data.mainTabs.books) || [];
    const state = bookshelfSortFilterState(appState);
    const groupOptions = ["全部"].concat(Array.from(new Set(books.map((book, index) => bookshelfBookGroup(book, index)))));
    const sortOptions = ["最近更新", "阅读进度", "书名", "作者"];
    const filterOptions = ["全部", "未读", "已完结", "更新失败"];
    const previewBooks = bookshelfSortedBooks(books, appState);
    const previewCount = previewBooks.length;
    const isDefault = state.group === "全部" && state.sort === "最近更新" && state.filter === "全部";
    const optionRow = (attr, item, current) => `<button class="${item === current ? "is-active" : ""}" type="button" ${attr}="${esc(item)}"${item === current ? ' aria-current="true"' : ""}>${esc(item)}</button>`;
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title: "排序筛选",
      ariaLabel: "书架排序与筛选",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      contentHtml: `
        <section class="fd-sort-filter-panel" data-bookshelf-filter-persist data-bookshelf-filter-state='${esc(JSON.stringify({ group: state.group, sort: state.sort, filter: state.filter }))}' aria-label="书架排序与筛选">
          <article class="fd-sort-filter-group">
            <strong>分组</strong>
            <div class="fd-sort-filter-options">${groupOptions.map((item) => optionRow("data-bookshelf-group-option", item, state.group)).join("")}</div>
          </article>
          <article class="fd-sort-filter-group">
            <strong>排序</strong>
            <div class="fd-sort-filter-options">${sortOptions.map((item) => optionRow("data-bookshelf-sort-option", item, state.sort)).join("")}</div>
          </article>
          <article class="fd-sort-filter-group">
            <strong>筛选</strong>
            <div class="fd-sort-filter-options">${filterOptions.map((item) => optionRow("data-bookshelf-filter-option", item, state.filter)).join("")}</div>
          </article>
          <section class="fd-sort-filter-preview" aria-live="polite" data-filter-preview>
            <strong>预览结果 ${esc(String(previewCount))} 本</strong>
            <span>${isDefault ? "当前为默认条件" : "已应用筛选条件，保存后生效"}</span>
            <div class="fd-sort-filter-preview-books">${previewBooks.slice(0, 4).map((book) => `<em>${esc(book.title)}</em>`).join("")}${previewCount > 4 ? `<em>等 ${esc(String(previewCount))} 本</em>` : ""}</div>
          </section>
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button" data-bookshelf-filter-reset${isDefault ? " disabled" : ""}>恢复默认</button>
          <button type="button" data-bookshelf-filter-save data-route="bookshelf" class="is-primary">保存并应用</button>
        </div>`
    }));
  }

  function bookBatchManagementScreen(data, appState) {
    const allBooks = (data.mainTabs && data.mainTabs.books) || [];
    const selectedSet = new Set((appState?.bookBatchSelected || []).map((i) => Number(i)));
    const rows = allBooks.map((book, index) => {
      const group = bookshelfBookGroup(book, index);
      const sourceType = bookSourceType(book);
      return { book, index, group, sourceType, selected: selectedSet.has(index) };
    });
    const selectedCount = rows.filter((item) => item.selected).length;
    const allSelected = selectedCount === rows.length && rows.length > 0;
    const noneSelected = selectedCount === 0;
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title: "批量管理",
      ariaLabel: "书籍批量管理",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      dialogHostClass: "fd-dialog-host",
      contentHtml: `
        <section class="fd-batch-summary" aria-label="批量选择状态">
          <strong data-batch-selected-count>已选 ${esc(String(selectedCount))} 本</strong>
          <span>共 ${esc(String(rows.length))} 本，长按书籍或点击勾选进行批量操作。</span>
          <button type="button" data-book-select-all aria-pressed="${allSelected ? "true" : "false"}">${allSelected ? "取消全选" : "全选"}</button>
        </section>
        <section class="fd-management-list is-book-batch">
          <h2>书架书籍</h2>
          ${rows.map((item) => `
            <article class="${item.selected ? "is-selected" : ""}" data-book-batch-row data-book-index="${esc(String(item.index))}" data-book-source-type="${item.sourceType.type}">
              <button class="fd-book-select-toggle" type="button" data-book-select-toggle="${esc(String(item.index))}" aria-pressed="${item.selected ? "true" : "false"}">${item.selected ? icon("check", "fd-small-icon") : ""}</button>
              <img src="${cover(data, item.book.coverKey)}" alt="${esc(item.book.title)}封面" loading="lazy" data-cover-fallback>
              <span><strong>${esc(item.book.title)}</strong><small>${esc(item.book.author)} · ${esc(item.book.chapter)}</small></span>
              <em class="fd-book-group-tag">${esc(item.group)}</em>
              <span class="fd-book-source-badge ${item.sourceType.badgeClass}" aria-label="来源：${esc(item.sourceType.label)}">${esc(item.sourceType.badge)}</span>
            </article>
          `).join("")}
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button" data-book-batch-action="move" data-route="group-management"${noneSelected ? " disabled" : ""}>移动分组</button>
          <button type="button" data-book-batch-action="cache"${noneSelected ? " disabled" : ""}>批量缓存</button>
          <button type="button" data-book-batch-action="update"${noneSelected ? " disabled" : ""}>批量更新</button>
          <button type="button" data-book-batch-action="export"${noneSelected ? " disabled" : ""}>导出所选</button>
          <button class="is-danger" type="button" data-book-batch-action="delete" data-open-dialog${noneSelected ? " disabled" : ""}>删除所选</button>
        </div>`,
      dialogHtml: `
        <section class="fd-demo-dialog" aria-hidden="true" data-demo-dialog data-batch-delete-dialog>
          <h2>删除所选 ${esc(String(selectedCount))} 本书？</h2>
          <p>将从书架移除选中书籍，可同时删除本地缓存。</p>
          <label class="fd-batch-delete-cache"><input type="checkbox" data-batch-delete-cache checked>同时删除已缓存章节</label>
          <div>
            <button type="button" data-close-dialog>取消</button>
            <button class="is-danger" type="button" data-close-dialog data-book-batch-confirm-delete>删除</button>
          </div>
        </section>`
    }));
  }

  function groupManagementScreen(data, appState) {
    const books = (data.mainTabs && data.mainTabs.books) || [];
    const isBookshelfMode = appState?.groupManagementMode === "bookshelf";
    const groupCounts = {};
    books.forEach((book, index) => {
      const g = bookshelfBookGroup(book, index);
      groupCounts[g] = (groupCounts[g] || 0) + 1;
    });
    const baseGroups = isBookshelfMode ? ["默认", "追更", "本地书"] : ["默认", "追更", "本地书", "资料"];
    const groupNames = Array.from(new Set(baseGroups.concat(Object.keys(groupCounts))));
    const groups = groupNames.map((name, index) => ({
      name,
      count: groupCounts[name] || 0,
      meta: `${groupCounts[name] || 0} 本${index === 0 ? " · 当前分组" : name === "追更" ? " · 置顶显示" : ""}`,
      pinned: name === "追更",
      canDelete: name !== "默认"
    }));
    const assignments = books.map((book, index) => ({
      book,
      index,
      group: bookshelfBookGroup(book, index),
      sourceType: bookSourceType(book)
    }));
    const allGroupOptions = ["默认", "追更", "本地书", "资料"];
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title: isBookshelfMode ? "书架分组管理" : "分组管理",
      ariaLabel: isBookshelfMode ? "书架分组管理" : "分组管理",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      dialogHostClass: "fd-dialog-host",
      contentHtml: `
        <section class="fd-management-list is-group-flow" data-group-list data-group-dnd>
          <h2>分组列表 <small data-group-count>${esc(String(groups.length))} 个分组</small></h2>
          ${groups.map((group, index) => `
            <article data-group-row data-group-name="${esc(group.name)}" data-group-index="${esc(String(index))}" draggable="true">
              ${icon("drag", "fd-small-icon fd-group-drag-handle")}
              <span><strong>${esc(group.name)}</strong><small>${esc(group.meta)}</small></span>
              <button type="button" data-group-action="rename" data-group-rename="${esc(group.name)}" aria-label="重命名 ${esc(group.name)}">${icon("edit", "fd-small-icon")}<span>重命名</span></button>
              ${group.canDelete ? `<button class="is-plain" type="button" data-group-action="delete" data-group-delete="${esc(group.name)}" data-open-dialog aria-label="删除 ${esc(group.name)}">${icon("trash", "fd-small-icon")}</button>` : `<em class="fd-group-default-mark">默认</em>`}
            </article>
          `).join("")}
        </section>
        <section class="fd-management-list is-assignment-flow">
          <h2>书籍归属 <small>${esc(String(assignments.length))} 本</small></h2>
          ${assignments.map((item) => `
            <article data-book-assignment data-book-index="${esc(String(item.index))}" data-book-source-type="${item.sourceType.type}">
              ${icon("book-open", "fd-small-icon")}
              <span><strong>${esc(item.book.title)}</strong><small>${esc(item.book.author)} · ${esc(item.book.chapter)}</small></span>
              <div class="fd-group-assign-select" aria-label="选择 ${esc(item.book.title)} 的分组">
                <select data-book-assign-group data-book-index="${esc(String(item.index))}">
                  ${allGroupOptions.map((opt) => `<option value="${esc(opt)}"${opt === item.group ? " selected" : ""}>${esc(opt)}</option>`).join("")}
                </select>
                <span class="fd-book-source-badge ${item.sourceType.badgeClass}">${esc(item.sourceType.badge)}</span>
              </div>
            </article>
          `).join("")}
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button" data-group-action="create" data-open-dialog>新建分组</button>
          ${isBookshelfMode ? `<button type="button" data-group-action="sort" data-group-sort>排序分组</button>` : ""}
          <button type="button" data-route-back data-group-exit-confirm>完成</button>
        </div>`,
      dialogHtml: `
        <section class="fd-demo-dialog" aria-hidden="true" data-demo-dialog data-group-create-dialog>
          <h2>新建分组</h2>
          <label class="fd-group-input"><span>分组名称</span><input type="text" data-group-name-input placeholder="如：科幻、历史" maxlength="12"></label>
          <p class="fd-group-dialog-hint">新建分组后可在书籍归属中选择该分组。</p>
          <div>
            <button type="button" data-close-dialog>取消</button>
            <button type="button" data-close-dialog data-group-confirm-create>创建</button>
          </div>
        </section>
        <section class="fd-demo-dialog" aria-hidden="true" data-demo-dialog data-group-delete-dialog>
          <h2>删除分组？</h2>
          <p>删除后，该分组下的书籍将迁移至默认分组。</p>
          <p class="fd-group-dialog-hint"><strong data-group-delete-name></strong> · 当前 <strong data-group-delete-count></strong> 本书将迁移</p>
          <div>
            <button type="button" data-close-dialog>取消</button>
            <button class="is-danger" type="button" data-close-dialog data-group-confirm-delete>删除并迁移</button>
          </div>
        </section>
        <section class="fd-demo-dialog" aria-hidden="true" data-demo-dialog data-group-rename-dialog>
          <h2>重命名分组</h2>
          <label class="fd-group-input"><span>新名称</span><input type="text" data-group-rename-input maxlength="12"></label>
          <div>
            <button type="button" data-close-dialog>取消</button>
            <button type="button" data-close-dialog data-group-confirm-rename>保存</button>
          </div>
        </section>`
    }));
  }

  function localImportScreen(data) {
    const defaultImports = [
      { title: "雨夜.epub", meta: "作者已识别 · 加入默认分组", state: "可导入", tone: "good", selected: true },
      { title: "旧书扫描.txt", meta: "编码 UTF-8 · 章节识别中", state: "72%", tone: "warn", selected: true },
      { title: "缺失章节.mobi", meta: "格式不支持 · 可移除后重选", state: "失败", tone: "danger", selected: false }
    ];
    const imports = (data && Array.isArray(data.imports) && data.imports.length ? data.imports : defaultImports);
    const selectedCount = imports.filter((item) => item.selected !== false).length;
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
          <article>${icon("shield", "fd-small-icon")}<span><strong>权限演示</strong><small>模拟存储权限被拒</small></span><button type="button" data-route="import-permission-denied">演示</button></article>
        </section>
        <section class="fd-management-list is-import-results">
          <h2>待导入文件 <small class="fd-import-count">已选 ${esc(String(selectedCount))}/${esc(String(imports.length))}</small><button type="button" class="fd-import-select-all" data-import-select-all aria-pressed="${selectedCount === imports.length ? "true" : "false"}">全选</button></h2>
          ${imports.map((item, index) => `
            <article class="is-${esc(item.tone)}">
              <label class="fd-import-checkbox">
                <input type="checkbox" data-import-toggle="${esc(String(index))}" ${item.selected !== false ? "checked" : ""} aria-label="选择 ${esc(item.title)}">
                <span class="fd-import-checkbox-mark" aria-hidden="true">${icon("check", "fd-import-checkbox-icon")}</span>
              </label>
              ${icon(item.tone === "danger" ? "warning" : "book-open", "fd-small-icon")}
              <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
              <em>${esc(item.state)}</em>
            </article>
          `).join("")}
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button">继续选择</button>
          <button type="button" data-route="import-parsing">完成导入</button>
        </div>`
    }));
  }

  function importPermissionDeniedScreen(data) {
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title: "导入权限拒绝",
      ariaLabel: "导入权限拒绝",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      contentHtml: `
        <section class="fd-import-card is-import-permission">
          ${icon("shield", "fd-medium-icon")}
          <span><strong>存储权限被拒绝</strong><small>需要在系统设置中开启存储访问权限才能继续导入本地书籍</small></span>
        </section>
        <section class="fd-management-list is-import-permission-detail">
          <h2>所需权限</h2>
          <article>${icon("folder", "fd-small-icon")}<span><strong>读取外部存储</strong><small>用于扫描本地的 EPUB / TXT 文件</small></span><em>未授予</em></article>
          <article>${icon("file", "fd-small-icon")}<span><strong>访问媒体文件</strong><small>用于读取通过系统选择器挑中的文档</small></span><em>未授予</em></article>
        </section>
        <section class="fd-management-list is-import-permission-hint">
          <h2>如何开启</h2>
          <article>${icon("info", "fd-small-icon")}<span><strong>系统设置 → 应用 → Reader → 权限</strong><small>开启存储与媒体权限后返回此页面继续</small></span></article>
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button" data-route-back>退出导入</button>
          <button type="button" data-route="local-import">去设置开启</button>
        </div>`
    }));
  }

  function importFormatUnsupportedScreen(data) {
    const file = (data && data.file) || { name: "选定文件.pdf", meta: "PDF · 1.2 MB" };
    const unsupported = (data && Array.isArray(data.unsupported)) || [
      { ext: ".pdf", meta: "暂不支持，可转为 EPUB 后重选" },
      { ext: ".docx", meta: "暂不支持，可复制为 TXT 后重选" }
    ];
    const supported = [
      { ext: ".epub", meta: "完整章节结构与元数据" },
      { ext: ".txt", meta: "自动识别编码与章节" }
    ];
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title: "格式不支持",
      ariaLabel: "导入格式不支持",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      contentHtml: `
        <section class="fd-import-card is-import-format-unsupported">
          ${icon("warning", "fd-medium-icon")}
          <span><strong>${esc(file.name)}</strong><small>${esc(file.meta)}</small></span>
          <em class="is-danger">格式不支持</em>
        </section>
        <section class="fd-management-list is-import-format-supported">
          <h2>支持格式</h2>
          ${supported.map((item) => `
            <article class="is-good">${icon("check", "fd-small-icon")}<span><strong>${esc(item.ext)}</strong><small>${esc(item.meta)}</small></span><em>可导入</em></article>
          `).join("")}
        </section>
        <section class="fd-management-list is-import-format-unsupported-list">
          <h2>已忽略文件</h2>
          ${unsupported.map ? unsupported.map((item) => `
            <article class="is-danger">${icon("warning", "fd-small-icon")}<span><strong>${esc(item.ext)}</strong><small>${esc(item.meta)}</small></span><em>跳过</em></article>
          `).join("") : ""}
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button" data-route-back>取消</button>
          <button type="button" data-route="local-import">重新选择</button>
        </div>`
    }));
  }

  function importEmptyFileScreen(data) {
    const file = (data && data.file) || { name: "空文档.txt", meta: "0 字节 · 编码 UTF-8" };
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title: "文件为空",
      ariaLabel: "导入空文件",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      contentHtml: `
        <section class="fd-import-card is-import-empty">
          ${icon("file", "fd-medium-icon")}
          <span><strong>${esc(file.name)}</strong><small>${esc(file.meta)}</small></span>
          <em class="is-danger">内容为空</em>
        </section>
        <section class="fd-management-list is-import-empty-hint">
          <h2>可能原因</h2>
          <article>${icon("info", "fd-small-icon")}<span><strong>文件损坏</strong><small>下载或拷贝过程中数据丢失</small></span></article>
          <article>${icon("info", "fd-small-icon")}<span><strong>选错文件</strong><small>选择了一个空占位文档</small></span></article>
          <article>${icon("info", "fd-small-icon")}<span><strong>权限受限</strong><small>系统未授权读取该文件</small></span></article>
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button" data-route-back>取消</button>
          <button type="button" data-route="local-import">重新选择</button>
        </div>`
    }));
  }

  function importParsingScreen(data) {
    const fileName = (data && data.fileName) || "雨夜.epub";
    const progress = (data && typeof data.progress === "number") ? data.progress : 62;
    const stages = [
      { title: "读取文件", meta: "已读取 1.8 MB", status: "完成", tone: "good", done: true },
      { title: "解析元数据", meta: "标题 / 作者 / 封面", status: "完成", tone: "good", done: true },
      { title: "识别章节", meta: "正在拆分章节目录", status: "进行中", tone: "warn", active: true },
      { title: "匹配分组", meta: "等待章节完成", status: "等待中", tone: "muted" }
    ];
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title: "导入解析中",
      ariaLabel: "导入解析中",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      contentHtml: `
        <section class="fd-import-card is-import-parsing">
          <div class="fd-import-parsing-skeleton" aria-hidden="true">
            <span class="fd-import-parsing-bar"></span>
            <span class="fd-import-parsing-bar"></span>
            <span class="fd-import-parsing-bar is-short"></span>
          </div>
          <span><strong>正在解析 ${esc(fileName)}</strong><small>识别章节结构、封面与作者信息</small></span>
          <em>${esc(String(progress))}%</em>
        </section>
        <section class="fd-import-parsing-progress" aria-label="解析进度">
          <div class="fd-import-parsing-track"><div class="fd-import-parsing-fill" style="width:${esc(String(progress))}%"></div></div>
        </section>
        <section class="fd-management-list is-import-parsing-stages">
          <h2>解析步骤</h2>
          ${stages.map((item) => `
            <article class="is-${esc(item.tone)}">
              ${icon(item.done ? "check" : (item.active ? "refresh" : "folder"), "fd-small-icon")}
              <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
              <em>${esc(item.status)}</em>
            </article>
          `).join("")}
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button" data-route="local-import">取消导入</button>
          <button type="button" data-route="import-duplicate" disabled>下一步</button>
        </div>`
    }));
  }

  function importDuplicateScreen(data) {
    const defaultDuplicates = [
      { title: "雨夜.epub", meta: "与书架中《雨夜》相同 · 同作者", existing: "雨夜 · 阅读到第 12 章", decision: "keep", tone: "warn" },
      { title: "城南旧事.txt", meta: "书架已有同名书籍 · 不同来源", existing: "城南旧事 · 未读", decision: "overwrite", tone: "warn" }
    ];
    const duplicates = (data && Array.isArray(data.duplicates) && data.duplicates.length) ? data.duplicates : defaultDuplicates;
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title: "重复项处理",
      ariaLabel: "导入重复项处理",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      contentHtml: `
        <section class="fd-import-card is-import-duplicate-summary">
          ${icon("refresh", "fd-medium-icon")}
          <span><strong>${esc(String(duplicates.length))} 本重复</strong><small>逐项选择保留原书 / 覆盖 / 跳过</small></span>
        </section>
        <section class="fd-management-list is-import-duplicate-list">
          <h2>重复列表</h2>
          ${duplicates.map((item, index) => `
            <article class="fd-import-conflict-item is-${esc(item.tone)}">
              <div class="fd-import-conflict-head">
                ${icon("book-open", "fd-small-icon")}
                <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
                <em>库内：${esc(item.existing)}</em>
              </div>
              <nav class="fd-import-conflict-actions" aria-label="重复项决策 ${esc(String(index + 1))}">
                <button class="${item.decision === "keep" ? "is-active" : ""}" type="button" data-import-decision="keep" data-import-index="${esc(String(index))}">保留原书</button>
                <button class="${item.decision === "overwrite" ? "is-active" : ""}" type="button" data-import-decision="overwrite" data-import-index="${esc(String(index))}">覆盖</button>
                <button class="${item.decision === "skip" ? "is-active" : ""}" type="button" data-import-decision="skip" data-import-index="${esc(String(index))}">跳过</button>
              </nav>
            </article>
          `).join("")}
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button" data-route-back>上一步</button>
          <button type="button" data-route="import-conflict-resolve">下一步</button>
        </div>`
    }));
  }

  function importConflictResolveScreen(data) {
    const defaultConflicts = [
      { title: "雨夜.epub", local: "本地 · 1.8 MB · 12 章", library: "库内 · 1.8 MB · 12 章", decision: "overwrite", tone: "warn" },
      { title: "城南旧事.txt", local: "本地 · 980 KB · 8 章", library: "库内 · 950 KB · 7 章", decision: "keep-both", tone: "warn" }
    ];
    const conflicts = (data && Array.isArray(data.conflicts) && data.conflicts.length) ? data.conflicts : defaultConflicts;
    // B2 · import-conflict-resolve control identity (A2 registry, frozen in library-shell.js)
    const ICR = window.ReaderLibraryShell;
    const icrCid = {
      back: ICR.controlId("import-conflict-resolve", "default", "phone", "button", "back"),
      keepLocal: ICR.controlId("import-conflict-resolve", "default", "phone", "button", "keep-local"),
      overwrite: ICR.controlId("import-conflict-resolve", "default", "phone", "button", "overwrite"),
      keepBoth: ICR.controlId("import-conflict-resolve", "default", "phone", "button", "keep-both"),
      rollback: ICR.controlId("import-conflict-resolve", "default", "phone", "button", "rollback")
    };
    // Rollback state machine: idle / pending / completed / failed
    const rollbackState = data?.rollbackState || "idle";
    // Apply state: idle / applying / applied / failed
    const applyState = data?.applyState || "idle";
    // Conflict selection state: undecided / decided / applying
    const conflictSelectionState = data?.conflictSelectionState || "undecided";
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title: "冲突处理",
      ariaLabel: "导入冲突处理",
      topBarClass: "fd-back-bar",
      topBarHtml: `<section class="rsk-back-top-bar fd-back-bar" data-slot="backTopBar" aria-label="返回顶栏"><button type="button" aria-label="返回"${icrCid.back ? ` data-control-id="${icrCid.back}"` : ""} data-ui-event="route.back" data-focus-restore-source="import-conflict-back" data-rollback-trigger="true">${icon("back", "rsk-icon")}</button><h1>冲突处理</h1><span></span></section>`,
      bottomActionHostClass: "fd-bottom-action-host",
      contentHtml: `
        <section class="fd-import-card is-import-conflict-summary" data-conflict-summary data-conflict-count="${esc(String(conflicts.length))}" data-apply-state="${esc(applyState)}" data-rollback-state="${esc(rollbackState)}">
          ${icon("refresh", "fd-medium-icon")}
          <span><strong>${esc(String(conflicts.length))} 处冲突</strong><small>选择覆盖 / 跳过 / 保留两份</small></span>
        </section>
        <section class="fd-management-list is-import-conflict-list" data-conflict-state="${esc(conflictSelectionState)}" data-loading-state="${applyState === "applying" ? "loading" : "idle"}" data-conflict-count="${esc(String(conflicts.length))}" data-rollback-state="${esc(rollbackState)}" data-control-id-family="import.button.import-conflict-resolve.default.phone.button.conflict-row">
          <h2>冲突列表</h2>
          ${conflicts.map((item, index) => `
            <article class="fd-import-conflict-item is-${esc(item.tone)}" data-conflict-index="${esc(String(index))}" data-decision="${esc(item.decision)}" data-final-state="${item.decision ? "decided" : "undecided"}">
              <div class="fd-import-conflict-head">
                ${icon("book-open", "fd-small-icon")}
                <span><strong>${esc(item.title)}</strong></span>
                <em>需决策</em>
              </div>
              <div class="fd-import-conflict-meta">
                <small><strong>本地</strong>${esc(item.local)}</small>
                <small><strong>库内</strong>${esc(item.library)}</small>
              </div>
              <nav class="fd-import-conflict-actions" aria-label="冲突决策 ${esc(String(index + 1))}">
                <button class="${item.decision === "overwrite" ? "is-active" : ""}" type="button" data-import-decision="overwrite" data-import-index="${esc(String(index))}"${icrCid.overwrite ? ` data-control-id="${icrCid.overwrite}"` : ""} data-ui-event="import.conflict.decision" data-repeat-tap-guard="conflict-overwrite" data-final-state="${item.decision === "overwrite" ? "active" : "idle"}" data-focus-restore-source="conflict-overwrite" aria-label="覆盖本地书籍">覆盖</button>
                <button class="${item.decision === "skip" ? "is-active" : ""}" type="button" data-import-decision="skip" data-import-index="${esc(String(index))}"${icrCid.keepLocal ? ` data-control-id="${icrCid.keepLocal}"` : ""} data-ui-event="import.conflict.decision" data-repeat-tap-guard="conflict-skip" data-final-state="${item.decision === "skip" ? "active" : "idle"}" data-focus-restore-source="conflict-skip" aria-label="跳过·保留本地版本">跳过</button>
                <button class="${item.decision === "keep-both" ? "is-active" : ""}" type="button" data-import-decision="keep-both" data-import-index="${esc(String(index))}"${icrCid.keepBoth ? ` data-control-id="${icrCid.keepBoth}"` : ""} data-ui-event="import.conflict.decision" data-repeat-tap-guard="conflict-keep-both" data-final-state="${item.decision === "keep-both" ? "active" : "idle"}" data-focus-restore-source="conflict-keep-both" aria-label="保留本地与库内两份">保留两份</button>
              </nav>
            </article>
          `).join("")}
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row" data-rollback-state="${esc(rollbackState)}" data-apply-state="${esc(applyState)}">
          <button type="button" data-route-back${icrCid.rollback ? ` data-control-id="${icrCid.rollback}"` : ""} data-ui-event="import.rollback" data-repeat-tap-guard="rollback" data-final-state="${rollbackState === "completed" ? "completed" : rollbackState === "failed" ? "failed" : "idle"}" data-rollback-action="true"${rollbackState === "pending" ? " disabled" : ""} aria-label="回滚到上一步">上一步</button>
          <button type="button" data-route="import-parsing" data-ui-event="import.apply" data-repeat-tap-guard="apply" data-final-state="${applyState === "applied" ? "applied" : applyState === "failed" ? "failed" : "idle"}" data-apply-action="true"${applyState === "applying" ? " disabled" : ""} aria-label="应用决策并导入">应用并导入</button>
        </div>`
    }));
  }

  function importPartialSuccessScreen(data) {
    const successCount = (data && typeof data.successCount === "number") ? data.successCount : 3;
    const failedCount = (data && typeof data.failedCount === "number") ? data.failedCount : 1;
    const skippedCount = (data && typeof data.skippedCount === "number") ? data.skippedCount : 0;
    const defaultFailed = [
      { title: "缺失章节.mobi", meta: "格式不支持 · 已自动跳过", reason: "格式不支持", tone: "danger" }
    ];
    const failed = (data && Array.isArray(data.failed)) ? data.failed : defaultFailed;
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title: "部分导入成功",
      ariaLabel: "导入部分成功",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      contentHtml: `
        <section class="fd-import-result-summary is-partial">
          ${icon("check", "fd-medium-icon")}
          <span><strong>${esc(String(successCount))} 成功 · ${esc(String(failedCount))} 失败${skippedCount ? " · " + String(skippedCount) + " 跳过" : ""}</strong><small>部分书籍已完成导入，可重试失败项或查看详情</small></span>
        </section>
        <section class="fd-management-list is-import-partial-success">
          <h2>失败项</h2>
          ${failed.map((item, index) => `
            <article class="is-${esc(item.tone)}">
              ${icon("warning", "fd-small-icon")}
              <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
              <button type="button" data-route="import-parsing" data-import-retry="${esc(String(index))}">重试</button>
            </article>
          `).join("")}
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button" data-route="import-result-detail">查看详情</button>
          <button type="button" data-route="bookshelf">返回书架</button>
        </div>`
    }));
  }

  function importResultDetailScreen(data) {
    const defaultSuccess = [
      { title: "雨夜.epub", meta: "加入默认分组 · 12 章", tone: "good" },
      { title: "旧书扫描.txt", meta: "加入默认分组 · 8 章", tone: "good" },
      { title: "南风知意.epub", meta: "加入默认分组 · 24 章", tone: "good" }
    ];
    const defaultFailed = [
      { title: "缺失章节.mobi", meta: "格式不支持 · 已跳过", tone: "danger" }
    ];
    const defaultSkipped = [
      { title: "城南旧事.txt", meta: "保留原书 · 跳过导入", tone: "muted" }
    ];
    const success = (data && Array.isArray(data.success)) ? data.success : defaultSuccess;
    const failed = (data && Array.isArray(data.failed)) ? data.failed : defaultFailed;
    const skipped = (data && Array.isArray(data.skipped)) ? data.skipped : defaultSkipped;
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title: "导入结果",
      ariaLabel: "导入结果详情",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      contentHtml: `
        <section class="fd-import-result-summary is-detail">
          ${icon("check", "fd-medium-icon")}
          <span><strong>${esc(String(success.length))} 成功 · ${esc(String(failed.length))} 失败 · ${esc(String(skipped.length))} 跳过</strong><small>共 ${esc(String(success.length + failed.length + skipped.length))} 项</small></span>
        </section>
        <section class="fd-management-list is-import-result-success">
          <h2>成功 (${esc(String(success.length))})</h2>
          ${success.map((item) => `
            <article class="is-${esc(item.tone)}">${icon("check", "fd-small-icon")}<span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span><em>完成</em></article>
          `).join("")}
        </section>
        <section class="fd-management-list is-import-result-failed">
          <h2>失败 (${esc(String(failed.length))})</h2>
          ${failed.map((item) => `
            <article class="is-${esc(item.tone)}">${icon("warning", "fd-small-icon")}<span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span><em>失败</em></article>
          `).join("")}
        </section>
        <section class="fd-management-list is-import-result-skipped">
          <h2>跳过 (${esc(String(skipped.length))})</h2>
          ${skipped.map((item) => `
            <article class="is-${esc(item.tone)}">${icon("refresh", "fd-small-icon")}<span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span><em>跳过</em></article>
          `).join("")}
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button" data-route="local-import">再次导入</button>
          <button type="button" data-route="bookshelf">返回书架并刷新</button>
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
    "reader-full-settings": "settings",
    "reader-full-font": "appearance",
    "reader-full-theme": "appearance",
    "reader-full-theme-edit": "appearance",
    "reader-full-layout": "appearance",
    "reader-full-page-turn": "settings",
    "reader-font-import-confirm": "appearance",
    "reader-font-delete-confirm": "appearance",
    "reader-font-fallback": "appearance",
    "reader-theme-new": "appearance",
    "reader-theme-delete-confirm": "appearance",
    "reader-typography-reset-confirm": "appearance",
    "reader-replace-page": "settings"
  };

  const readerWorkspaceRoutes = new Set([
    "reader-full-directory",
    "reader-full-font",
    "reader-full-theme",
    "reader-full-theme-edit",
    "reader-full-layout",
    "reader-full-page-turn",
    "reader-font-import-confirm",
    "reader-font-delete-confirm",
    "reader-font-fallback",
    "reader-theme-new",
    "reader-theme-delete-confirm",
    "reader-typography-reset-confirm",
    "reader-replace-page"
  ]);

  const readerWorkspaceParentRoute = {
    "reader-full-directory": "toc-bookmarks",
    "reader-full-font": "reader-full-appearance",
    "reader-full-theme": "reader-full-appearance",
    "reader-full-theme-edit": "reader-full-theme",
    "reader-full-layout": "reader-full-appearance",
    "reader-full-page-turn": "reader-full-settings",
    "reader-font-import-confirm": "reader-full-font",
    "reader-font-delete-confirm": "reader-full-font",
    "reader-font-fallback": "reader-full-font",
    "reader-theme-new": "reader-full-theme",
    "reader-theme-delete-confirm": "reader-full-theme",
    "reader-typography-reset-confirm": "reader-full-layout",
    "reader-replace-page": "content-replacement"
  };

  const readerPromotedRoutes = {
    appearance: "reader-full-theme",
    settings: "reader-full-page-turn"
  };

  const readerStateByRoute = {
    "immersive-reading": { mode: "immersive" },
    reader_content: { mode: "immersive" },
    reader: { mode: "control" },
    "toc-bookmarks": { mode: "module", module: "directory" },
    "reader-directory-overlay-v2": { mode: "module", module: "directory" },
    tts: { mode: "module", module: "tts" },
    "reader-tts-overlay-v2": { mode: "module", module: "tts" },
    "reader-appearance": { mode: "module", module: "appearance" },
    "reader-appearance-overlay-v2": { mode: "module", module: "appearance" },
    "reader-night-state-v2": { mode: "module", module: "appearance" },
    "reader-settings": { mode: "module", module: "settings" },
    "reader-settings-overlay-v2": { mode: "module", module: "settings" },
    "content-search": { mode: "quick", quick: "search" },
    "reader-search-overlay-v2": { mode: "quick", quick: "search" },
    "auto-page": { mode: "quick", quick: "auto-page" },
    "reader-auto-scroll-overlay-v2": { mode: "quick", quick: "auto-page" },
    "content-replacement": { mode: "quick", quick: "replace" },
    "reader-replace-overlay-v2": { mode: "quick", quick: "replace" },
    "control-layer-base-v2": { mode: "control" }
  };

  const readerQuickActionIconMap = {
    search: "reader-content-search",
    "auto-page": "reader-auto-page",
    replace: "reader-content-replace"
  };

  function readerReplacementRules(appState) {
    const rules = [
      { id: "rain-name", title: "雨容称呼", enabled: true, pattern: "雨容", replacement: "雨蓉", scope: ["chapter"], custom: false },
      { id: "old-name", title: "旧称统一", enabled: true, pattern: "老张", replacement: "张老", scope: ["chapter"], custom: false },
      { id: "punctuation", title: "标点清理", enabled: false, pattern: "[，。]{2,}", replacement: "。", scope: ["chapter"], custom: false },
      { id: "ad-filter", title: "广告过滤", enabled: true, pattern: "本章未完.*?点击", replacement: "", scope: ["chapter"], custom: false }
    ];
    const overrides = appState?.readerReplacementRules || {};
    const preset = rules.map((rule) => Object.assign({}, rule, {
      enabled: Object.prototype.hasOwnProperty.call(overrides, rule.id) ? Boolean(overrides[rule.id]) : rule.enabled
    }));
    const custom = (Array.isArray(appState?.replaceRules) ? appState.replaceRules : []).map((rule) => Object.assign({
      pattern: "",
      replacement: "",
      scope: ["chapter"],
      enabled: true,
      custom: true
    }, rule));
    return preset.concat(custom);
  }

  function readerReplaceScopeOptions() {
    return [
      { value: "chapter", label: "正文" },
      { value: "title", label: "标题" },
      { value: "toc", label: "目录" },
      { value: "bookmark", label: "书签" }
    ];
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

  function readerControlStageForRoute(route) {
    return readerWorkspaceRoutes.has(route) ? "workspace" : "expanded";
  }

  function readerControlCollapseRoute(type, route, appState) {
    if (readerWorkspaceRoutes.has(route)) {
      return readerWorkspaceParentRoute[route] || readerFullRoutes[type] || "reader";
    }
    const origin = appState?.readerControlStageOrigin || "";
    const originState = readerStateByRoute[origin];
    if (originState && originState.mode !== "immersive") {
      return origin;
    }
    return readerModuleRoutes[type] || "reader";
  }

  function readerControlBackRoute(route, appState) {
    if (readerFullTypeByRoute[route]) {
      return readerControlCollapseRoute(readerFullTypeByRoute[route], route, appState);
    }
    const state = readerStateByRoute[route];
    if (!state) return "";
    if (state.mode === "module" || state.mode === "quick") return "reader";
    if (state.mode === "control") return "immersive-reading";
    return "";
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
    // Dock/quick modules are local states in the same ReaderShell. Replacing
    // them must not flash a full loading card. Truly asynchronous work owns a
    // local loading/result state inside its module instead.
    return false;
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

  // D4 默认主题预设：6 套内置主题，每套包含背景色、文字色、控制层色、强调色、链接色。
  // 当 data.reader.themeOptions 缺失时作为 fallback 使用；存在时以 fixture 配置为准。
  const defaultReaderThemePresets = [
    { value: "day", label: "日间", scheme: "day", pair: "night", texture: "plain", swatch: "#ffffff", paperStart: "#ffffff", paperEnd: "#ffffff", ink: "#1f1b17", controlLayer: "#fbf2eb", accent: "#f48b13", link: "#2d4a3e" },
    { value: "night", label: "夜间", scheme: "night", pair: "day", texture: "plain", swatch: "#1c1a18", paperStart: "#24211e", paperEnd: "#1c1a18", ink: "#eadfce", controlLayer: "#2c2824", accent: "#d69b5f", link: "#d2bd96" },
    { value: "paper", label: "纸纹", scheme: "day", pair: "paper-night", texture: "paper", textureOpacity: 0.034, textureRgb: "138 116 84", swatch: "#f5ead8", paperStart: "#fbf4e9", paperEnd: "#efe2d0", ink: "#2b241d", controlLayer: "#f5ece6", accent: "#c08020", link: "#5a3a1e" },
    { value: "warm", label: "暖白", scheme: "day", pair: "warm-night", texture: "plain", swatch: "#fbf0df", paperStart: "#fff6e9", paperEnd: "#fff6e9", ink: "#2c241d", controlLayer: "#f7ead9", accent: "#c08020", link: "#8a5a2a" },
    { value: "green", label: "青绿", scheme: "day", pair: "green-night", texture: "plain", swatch: "#e7f0e2", paperStart: "#eef5e8", paperEnd: "#eef5e8", ink: "#263423", controlLayer: "#dde9d6", accent: "#367a4d", link: "#2d6a3e" },
    { value: "blue", label: "雾蓝", scheme: "day", pair: "blue-night", texture: "plain", swatch: "#e9f1f4", paperStart: "#eff6f8", paperEnd: "#eff6f8", ink: "#22313a", controlLayer: "#dfe9ee", accent: "#3a7a9a", link: "#2f6fd0" }
  ];

  function readerThemeOptions(data) {
    const options = data.reader?.themeOptions;
    return Array.isArray(options) && options.length > 0
      ? options
      : defaultReaderThemePresets;
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

  function readerFontFamilyValue(data, fontFamily, appState) {
    const options = readerFontOptions(data).concat(appState?.readerImportedFonts || []);
    const selected = options.find((item) => item.value === fontFamily) || options[0];
    return selected.fontStack || "var(--fd-serif)";
  }

  function readerTypographyStyle(data, typography, appState) {
    const safe = typography || normalizeReaderTypography(data);
    return [
      `--reader-font-size:${esc(safe.fontSize)}px`,
      `--reader-line-height:${esc(safe.lineHeight)}`,
      `--reader-paragraph-gap:${esc(safe.paragraphGap)}px`,
      `--reader-letter-spacing:${esc(safe.letterSpacing)}px`,
      `--reader-font-family:${readerFontFamilyValue(data, safe.fontFamily, appState)}`
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
    const options = readerThemeOptions(data).concat(appState?.readerCustomThemes || []);
    const mode = appState?.readerColorSchemeMode || "system";
    const systemNight = mode === "system" && Boolean(window.matchMedia?.("(prefers-color-scheme: dark)")?.matches);
    const slotValue = mode === "night" || systemNight
      ? appState?.readerDefaultNightTheme
      : mode === "day" || mode === "system"
        ? appState?.readerDefaultDayTheme
        : "";
    const value = slotValue || appState?.readerTheme || readerDefaultThemeValue(data);
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
    const backgroundImage = String(theme.backgroundImage || "");
    const safeBackgroundImage = /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(backgroundImage)
      ? `url(${backgroundImage})`
      : "none";
    return [
      `--reader-theme-scheme:${esc(theme.scheme || "day")}`,
      `--reader-paper-start:${esc(theme.paperStart)}`,
      `--reader-paper-end:${esc(theme.paperEnd)}`,
      `--reader-ink:${esc(theme.ink)}`,
      `--reader-theme-texture:${esc(themeTexture)}`,
      `--reader-theme-texture-opacity:${esc(textureOpacity.toFixed(3))}`,
      `--reader-texture-color-rgb:${esc(textureRgb)}`,
      `--reader-custom-background-image:${safeBackgroundImage}`,
      `--reader-custom-background-position:${esc(theme.backgroundPosition || "center")}`,
      `--reader-custom-background-size:${esc(theme.backgroundSize || "cover")}`,
      `--reader-custom-background-overlay-color:${isNight ? "20 18 16" : "255 250 244"}`,
      `--reader-custom-background-overlay:${esc(Number.isFinite(Number(theme.backgroundOverlay)) ? Number(theme.backgroundOverlay) : 0)}`,
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
      `--fd-primary-dark:var(--reader-control-primary)`,
      /* 夜读氛围 signature moment：极光/星点/暗角 */
      `--reader-night-aurora-rgb:${isNight ? "126 104 168" : "0 0 0"}`,
      `--reader-night-aurora-opacity:${isNight ? "1" : "0"}`,
      `--reader-night-star-rgb:${isNight ? "255 250 240" : "0 0 0"}`,
      `--reader-night-star-opacity:${isNight ? "1" : "0"}`,
      `--reader-night-vignette-opacity:${isNight ? "0.26" : "0"}`
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

  // 翻页模式 / 翻页动画：中文标签 ↔ CSS 值映射
  const readerPageModeCssByLabel = {
    "横向翻页": "horizontal",
    "竖向翻页": "vertical"
  };
  const readerPageAnimationCssByLabel = {
    "平滑": "smooth",
    "仿真": "curl",
    "无动画": "none"
  };
  function readerPageModeCssValue(label) {
    return readerPageModeCssByLabel[label] || "horizontal";
  }
  function readerPageAnimationCssValue(label) {
    return readerPageAnimationCssByLabel[label] || "smooth";
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
    // 竖向翻页模式：无页码概念，进度标签显示章节进度
    const isVertical = appState?.readerPageMode === "vertical";
    return {
      pageNumber: pageState.index + 1,
      pageCount: pageState.count,
      progress,
      pageLabel: isVertical ? "" : `第 ${pageState.index + 1} / ${pageState.count} 页`,
      progressLabel: isVertical ? `${progress} · 连续阅读` : `${progress} · 第 ${pageState.index + 1} / ${pageState.count} 页`
    };
  }

  function sharedReaderSurface(data, dismissRoute, appState, options) {
    const typography = appState?.readerTypography || normalizeReaderTypography(data);
    const pageSpace = appState?.readerPageSpace || normalizeReaderPageSpace(data);
    const pageState = currentReaderPage(data, appState);
    const disableTurnAnimation = Boolean(options && options.disableTurnAnimation);
    const pageMode = appState?.readerPageMode === "vertical" ? "vertical" : "horizontal";
    const pageAnimation = appState?.readerPageAnimation || "smooth";
    const isVerticalMode = pageMode === "vertical";
    const turnDirection = !disableTurnAnimation && !isVerticalMode && appState?.readerTurnDirection ? ` fd-reader-page-turn-${esc(appState.readerTurnDirection)}` : "";
    const paragraphs = isVerticalMode
      ? readerTextBlocks(data)
      : (pageState.page.paragraphs.length > 0 ? pageState.page.paragraphs : readerTextBlocks(data));
    const chapterState = currentReaderChapter(data, appState);
    const chapterTitle = chapterState.chapter.title || `${readerChapterMeta(data)} ${readerChapterTitle(data)}`;
    const chapterTitleHtml = pageState.index === 0 ? `<h1>${esc(chapterTitle.replace(/^第\s*\d+\s*章\s*/, ""))}</h1>` : "";
    const paginationMode = appState?.readerPages?.length ? "runtime" : "fallback";
    const ttsActive = readerTtsIsActive(appState);
    const ttsPlaying = Boolean(appState?.readerTts?.playing);
    const ttsIndex = ttsActive ? readerTtsSentenceIndex(data, appState) : 0;
    const ttsSegments = ttsActive ? readerTtsSegments(data) : [];
    const paragraphHtml = paragraphs.map((line) => ttsActive ? readerTtsParagraphHtml(line, ttsSegments, ttsIndex) : `<p>${readerAnnotationHtml(line)}</p>`).join("");
    const verticalTapAttr = isVerticalMode ? ' data-reader-vertical-tap="reader"' : "";
    const backgroundStyle = `${readerThemeStyle(data, appState)};${readerPageSpaceStyle(data, pageSpace)}`;
    const readingStyle = `${readerTypographyStyle(data, typography, appState)};${readerThemeStyle(data, appState)};${readerPageSpaceStyle(data, pageSpace)}`;
    return `
      <div class="fd-ir-background-layer" data-dev-region="ReadingBackground" aria-hidden="true" style="${esc(backgroundStyle)}"></div>
      <article class="fd-ir-reading-layer${turnDirection}" aria-label="正文排版层" data-control-layer="L0" data-dev-region="ReadingTextLayer" data-reader-pagination="${esc(paginationMode)}" data-reader-surface-signature="${esc(chapterTitle)}" data-reader-page-index="${esc(pageState.index)}" data-reader-page-count="${esc(pageState.count)}" data-reader-tts-active="${ttsActive ? "true" : "false"}" data-reader-tts-playing="${ttsPlaying ? "true" : "false"}" data-reader-tts-index="${esc(ttsIndex)}" data-page-mode="${esc(pageMode)}" data-page-animation="${esc(pageAnimation)}"${verticalTapAttr} style="${esc(readingStyle)}">
        ${chapterTitleHtml}
        ${paragraphHtml}
      </article>
      <div class="fd-reader-brightness-dim" data-reader-brightness-dim aria-hidden="true" style="${readerBrightnessStyle(data, appState)}"></div>
      ${dismissRoute ? `<button class="fd-reader-dismiss-zone" type="button" data-dev-region="ControlDismissZone" data-reader-dismiss="${esc(dismissRoute)}" aria-label="隐藏阅读控制层"></button>` : ""}`;
  }

  function readerViewportEnvironment(appState) {
    const params = new URLSearchParams(window.location.search);
    const requested = appState?.readerSettings?.hideStatusBar ? "hidden" : "visible";
    const statusResult = params.get("readerStatusBarResult") === "failed" ? "failed" : "applied";
    const effective = statusResult === "failed" ? "visible" : requested;
    const rawPreset = params.get("readerOcclusion") || "none";
    const preset = ["dynamic-island", "punch-left", "notch"].includes(rawPreset) ? rawPreset : "none";
    const occlusionRects = {
      "dynamic-island": [{ x: 139, y: 11, width: 112, height: 30, kind: "cutout" }],
      "punch-left": [{ x: 22, y: 12, width: 24, height: 24, kind: "cutout" }],
      notch: [{ x: 119, y: 0, width: 152, height: 34, kind: "cutout" }],
      none: []
    }[preset];
    const safeTop = preset === "dynamic-island" || preset === "notch" ? 58 : preset === "punch-left" ? 42 : effective === "visible" ? 34 : 26;
    const safeInline = preset === "punch-left" ? 34 : 24;
    return {
      requested,
      effective,
      transaction: statusResult,
      preset,
      occlusionRects,
      safeInsets: { top: safeTop, right: safeInline, bottom: 22, left: safeInline }
    };
  }

  function readerChromeLayout(environment) {
    const safe = environment.safeInsets;
    return {
      topLeft: "safe-top-leading",
      topRight: environment.effective === "hidden" ? "safe-top-trailing" : "system-owned",
      page: "safe-bottom-trailing",
      progress: "safe-bottom-leading",
      session: "safe-bottom-center-independent",
      style: `--reader-info-top:${safe.top}px;--reader-info-inline:${Math.max(safe.left, safe.right)}px;--reader-info-bottom:${safe.bottom}px`
    };
  }

  function readerInfoOverlay(data, appState) {
    const readout = data.reader.bottomReadout || {};
    const pageReadout = readerPageReadout(data, appState);
    const chapterState = currentReaderChapter(data, appState);
    const statusCapsule = readerImmersiveStatusCapsule(appState);
    const statusInfo = appState?.readerSettings?.statusInfo !== false;
    const environment = readerViewportEnvironment(appState);
    const chrome = readerChromeLayout(environment);
    const hideStatusBar = environment.effective === "hidden";
    const preset = environment.preset;
    const occlusionLabel = preset === "dynamic-island" ? "灵动岛" : preset === "punch-left" ? "左侧打孔" : preset === "notch" ? "中央刘海" : "";
    return `
      <section class="fd-ir-info-layer" data-control-layer="L0" data-dev-region="ImmersiveInfoLayer" data-reader-status-bar-mode="${hideStatusBar ? "immersive-hidden" : "system-visible"}" data-reader-status-requested="${esc(environment.requested)}" data-reader-status-effective="${esc(environment.effective)}" data-reader-status-transaction="${esc(environment.transaction)}" data-reader-occlusion-preset="${esc(preset)}" data-reader-occlusion-rects="${esc(JSON.stringify(environment.occlusionRects))}" style="${esc(chrome.style)}" aria-label="阅读信息层">
        ${statusInfo ? `<span class="fd-ir-top-left" data-reader-chrome-anchor="${esc(chrome.topLeft)}">${esc(data.reader.title)} · ${esc(chapterState.chapter.title || readerChapterMeta(data))}</span>` : ""}
        ${statusInfo && hideStatusBar ? `<span class="fd-ir-top-right" data-reader-chrome-anchor="${esc(chrome.topRight)}">${esc(data.reader.status.time)}</span>` : ""}
        ${statusInfo ? `<span class="fd-ir-bottom-left" data-dev-region="ImmersiveFooterProgress" data-reader-chrome-anchor="${esc(chrome.progress)}">${esc(pageReadout.progress || readout.progress || "38%")}</span>` : ""}
        ${statusInfo ? `<span class="fd-ir-bottom-right" data-dev-region="ImmersiveFooterStatus" data-reader-footer-status="page" data-reader-chrome-anchor="${esc(chrome.page)}"><span class="fd-ir-page-label" data-reader-page-readout>${esc(pageReadout.pageLabel)}</span></span>` : ""}
        ${statusCapsule ? `<span class="fd-ir-session-anchor" data-reader-session-anchor="immersive" data-reader-chrome-anchor="${esc(chrome.session)}">${statusCapsule}</span>` : ""}
        ${occlusionLabel ? `<span class="fd-reader-occlusion-simulator" aria-label="模拟物理遮挡：${esc(occlusionLabel)}"><b>${esc(occlusionLabel)}</b></span>` : ""}
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
      <span class="fd-ir-status-capsule${options.controlLayer ? " fd-reader-control-session-capsule" : ""}" data-reader-running-capsule data-reader-immersive-status data-reader-immersive-status-type="${esc(activeType)}" data-reader-immersive-status-playing="${isPlaying ? "true" : "false"}"${controlLayerAttrs}>
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
    const isVertical = appState?.readerPageMode === "vertical";
    return `
      <section class="fd-ir-tap-zone-layer" data-control-layer="L0" data-dev-region="ImmersiveTapZones" aria-label="透明点击热区层">
        <button class="fd-immersive-hotzone fd-hotzone-prev" type="button" aria-label="上一页" data-dev-region="PrevPageHotzone" data-reader-page-action="prev" aria-disabled="${isVertical || pageState.index === 0 ? "true" : "false"}"></button>
        <button class="fd-immersive-hotzone fd-hotzone-center" type="button" aria-label="打开阅读控制层" data-dev-region="ControlLayerHotzone" data-route="reader"></button>
        <button class="fd-immersive-hotzone fd-hotzone-next" type="button" aria-label="下一页" data-dev-region="NextPageHotzone" data-reader-page-action="next" aria-disabled="${isVertical || pageState.index >= pageState.count - 1 ? "true" : "false"}"></button>
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
      <section class="fd-reader-top" data-control-layer="L1" data-dev-region="ReaderTopBar">
        <button type="button" aria-label="返回" data-reader-exit>${icon("back", "fd-icon")}</button>
        <span><strong>${esc(data.reader.title)}</strong><small>${esc(data.reader.sourceLine)}</small></span>
        <button type="button" data-route="source-switch">${icon("source-switch", "fd-small-icon")}换源</button>
        <button type="button" aria-label="更多" data-reader-more-toggle aria-expanded="${appState?.readerMoreOpen ? "true" : "false"}">${icon("more", "fd-small-icon")}</button>
      </section>
      ${readerMoreMenuHtml(appState)}`;
  }

  // ===== W5 内容替换规则 CRUD 主渲染器 =====

  function readerReplaceScopeOptionsExtended() {
    return [
      { value: "chapter", label: "正文" },
      { value: "title", label: "标题" },
      { value: "toc", label: "目录" },
      { value: "bookmark", label: "书签" },
      { value: "single-book", label: "单书" },
      { value: "global", label: "全局" }
    ];
  }

  function readerReplacePatternValidationHtml(pattern) {
    const value = String(pattern || "").trim();
    if (!value) {
      return `<p class="fd-reader-replace-pattern-validate is-empty" data-reader-replace-validate-pattern>请填写正则表达式</p>`;
    }
    try {
      new RegExp(value);
      return `<p class="fd-reader-replace-pattern-validate is-valid" data-reader-replace-validate-pattern>正则有效</p>`;
    } catch (error) {
      return `<p class="fd-reader-replace-pattern-validate is-invalid" data-reader-replace-validate-pattern role="alert">正则无效：${esc(error.message)}</p>`;
    }
  }

  function readerReplacePreviewText(appState) {
    const original = "雨容站在窗前，看着雨容远去的背影，老张说：本章未完，点击查看。";
    let text = original;
    const rules = readerReplacementRules(appState).filter((rule) => rule.enabled);
    for (const rule of rules) {
      try {
        const regex = new RegExp(rule.pattern || "", "g");
        text = text.replace(regex, rule.replacement || "");
      } catch (e) {
        // 跳过无效正则
      }
    }
    return { original, replaced: text };
  }

  function readerReplacePage(data, route, appState) {
    const allRules = readerReplacementRules(appState);
    const formOpen = Boolean(appState?.replaceRuleFormOpen);
    const draft = appState?.replaceRuleDraft || { title: "", pattern: "", replacement: "", scope: ["chapter"] };
    const error = appState?.replaceRuleError || "";
    const editingId = appState?.replaceRuleEditingId || "";
    const scopeOptions = readerReplaceScopeOptionsExtended();
    const formTitle = editingId ? "编辑规则" : "新增规则";
    const preview = readerReplacePreviewText(appState);
    const pageModeClass = appState?.readerPageMode === "vertical" ? " fd-reader-page-mode-vertical" : " fd-reader-page-mode-horizontal";
    const sheetHtml = `
      <section class="fd-reader-replace-page fd-reader-replace-rule-list" data-control-layer="L3" data-dev-region="ReaderReplacePage" aria-label="内容替换规则管理">
        <header class="fd-reader-replace-toolbar" aria-label="内容替换操作">
          <button class="fd-reader-quick-back" type="button" data-route="reader" aria-label="返回阅读控制首页">
            ${icon("back", "fd-small-icon")}<span>返回</span>
          </button>
          <strong>内容替换</strong>
          <div class="fd-reader-replace-toolbar-actions">
            <button class="fd-reader-replace-toolbar-action" type="button" data-route="reader-replace-import-export" aria-label="导入导出规则">
              ${icon("sync", "fd-small-icon")}<span>导入/导出</span>
            </button>
            <button class="fd-reader-replace-toolbar-action is-primary" type="button" data-reader-replace-apply aria-label="应用到当前正文">
              ${icon("play", "fd-small-icon")}<span>应用到正文</span>
            </button>
          </div>
        </header>

        <p class="fd-reader-replace-priority-hint" aria-label="排序优先级说明">
          <i>${icon("info", "fd-small-icon")}</i>
          <span>多规则按列表顺序从上到下依次应用。预设规则不可删除，仅可启停。</span>
        </p>

        <div class="fd-reader-replace-rule-list-items" aria-label="替换规则列表">
          ${allRules.map((rule, index) => `
            <article class="fd-reader-replace-rule-item ${rule.enabled ? "is-on" : ""} ${rule.custom ? "" : "is-preset"}" data-reader-replace-rule-item="${esc(rule.id)}">
              <span class="fd-reader-replace-rule-handle" aria-hidden="true">${index + 1}</span>
              <button class="fd-replace-rule-toggle" type="button" data-reader-replace-rule="${esc(rule.id)}" aria-pressed="${rule.enabled ? "true" : "false"}" aria-label="切换规则 ${esc(rule.title)}">
                <strong><span>${esc(rule.title)}</span>${rule.custom ? "<em>自定义</em>" : "<em class=\"is-preset\">预设</em>"}</strong>
                <small>${esc(rule.pattern || "")} → ${esc(rule.replacement || "(空)")}</small>
                <span class="fd-replace-switch ${rule.enabled ? "is-on" : ""}" aria-hidden="true"><i></i></span>
              </button>
              <div class="fd-reader-replace-rule-actions">
                <button type="button" data-reader-replace-rule-up="${esc(rule.id)}" aria-label="上移规则" ${index === 0 ? "aria-disabled=\"true\" disabled" : ""}>${icon("chevron-left", "fd-small-icon")}</button>
                <button type="button" data-reader-replace-rule-down="${esc(rule.id)}" aria-label="下移规则" ${index === allRules.length - 1 ? "aria-disabled=\"true\" disabled" : ""}>${icon("chevron", "fd-small-icon")}</button>
                <button type="button" data-reader-replace-rule-edit="${esc(rule.id)}" aria-label="编辑规则 ${esc(rule.title)}">${icon("edit", "fd-small-icon")}</button>
                ${rule.custom
                  ? `<button type="button" data-reader-replace-rule-delete-target="${esc(rule.id)}" aria-label="删除规则 ${esc(rule.title)}">${icon("trash", "fd-small-icon")}</button>`
                  : `<button type="button" class="is-disabled" aria-disabled="true" title="预设规则不可删除" aria-label="预设规则不可删除">${icon("trash", "fd-small-icon")}</button>`}
              </div>
            </article>
          `).join("")}
        </div>

        ${formOpen ? `
          <section class="fd-reader-replace-form fd-replace-rule-form" data-reader-replace-rule-form aria-label="${esc(formTitle)}">
            <header><strong>${esc(formTitle)}</strong></header>
            <label class="fd-replace-form-field">
              <span>名称</span>
              <input type="text" data-reader-replace-form-field="title" value="${esc(draft.title)}" placeholder="规则名称" maxlength="12" />
            </label>
            <label class="fd-replace-form-field">
              <span>正则</span>
              <input type="text" data-reader-replace-form-field="pattern" value="${esc(draft.pattern)}" placeholder="如：雨容" data-reader-replace-validate-pattern-input />
            </label>
            ${readerReplacePatternValidationHtml(draft.pattern)}
            <label class="fd-replace-form-field">
              <span>替换为</span>
              <input type="text" data-reader-replace-form-field="replacement" value="${esc(draft.replacement)}" placeholder="如：雨蓉" />
            </label>
            <fieldset class="fd-replace-form-field fd-replace-form-scope" aria-label="作用范围">
              <legend>作用范围</legend>
              <div class="fd-replace-scope-options fd-reader-replace-scope-toggle">
                ${scopeOptions.map((option) => `
                  <label class="${(draft.scope || []).includes(option.value) ? "is-active" : ""}">
                    <input type="checkbox" data-reader-replace-scope="${esc(option.value)}" ${(draft.scope || []).includes(option.value) ? "checked" : ""} />
                    <span>${esc(option.label)}</span>
                  </label>
                `).join("")}
              </div>
            </fieldset>
            ${error ? `<p class="fd-replace-form-error" role="alert">${esc(error)}</p>` : ""}
            <div class="fd-replace-form-actions">
              <button class="is-cancel" type="button" data-reader-replace-rule-cancel>取消</button>
              <button class="is-primary" type="button" data-reader-replace-rule-save>${editingId ? "保存修改" : "添加规则"}</button>
            </div>
          </section>
        ` : ""}

        <section class="fd-reader-replace-preview" aria-label="原文与替换后预览">
          <header><strong>预览对比</strong><button type="button" data-route="reader-replace-preview" aria-label="查看完整预览">详细预览 →</button></header>
          <div class="fd-reader-replace-preview-grid">
            <div class="fd-reader-replace-preview-col">
              <small>原文</small>
              <p>${esc(preview.original)}</p>
            </div>
            <div class="fd-reader-replace-preview-col is-replaced">
              <small>替换后</small>
              <p>${esc(preview.replaced)}</p>
            </div>
          </div>
        </section>

        <footer class="fd-reader-replace-footer" aria-label="底部操作">
          <button class="fd-replace-add-entry" type="button" data-reader-replace-rule-add aria-label="新增替换规则" ${formOpen ? "aria-disabled=\"true\"" : ""}>
            ${icon("add", "fd-small-icon")}<span>新增规则</span>
          </button>
        </footer>

        <section class="fd-reader-persist-section" aria-label="W5 持久化">
          <header><strong>持久化（复用 W4）</strong></header>
          <div class="fd-reader-persist-actions">
            <button class="fd-reader-persist-restart" type="button" data-w4-save>${icon("save", "fd-small-icon")}<span>保存到 localStorage</span></button>
            <button class="fd-reader-persist-restart" type="button" data-w4-restart>${icon("refresh", "fd-small-icon")}<span>模拟重启（恢复）</span></button>
            <button class="fd-reader-persist-restart" type="button" data-w4-clear>${icon("trash", "fd-small-icon")}<span>清除持久化</span></button>
          </div>
          ${appState?.settingsToast ? `<p class="fd-reader-persist-toast" role="status">${esc(appState.settingsToast)}</p>` : ""}
        </section>
      </section>`;
    return shellKit().renderReaderShell({
      frameClass: `fd-reader-frame fd-reader-flow-frame fd-reader-mode-full fd-reader-stage-workspace fd-reader-replace-page-frame${pageModeClass}${appState?.readerSettings?.hideStatusBar ? " fd-reader-status-hidden" : " fd-reader-status-visible"}`,
      frameStyle: readerThemeStyle(data, appState),
      readingSurfaceClass: "fd-reading-surface",
      overlayClass: "fd-reader-overlay fd-reader-full-overlay",
      bottomSheetHostClass: "fd-reader-full-host",
      moduleNavClass: "fd-reader-module-nav fd-reader-module-nav-empty",
      stateHostClass: "fd-reader-state-host",
      stateHostHtml: `<div class="fd-reader-global-brightness-dim" data-reader-brightness-dim aria-hidden="true" style="${readerBrightnessStyle(data, appState)}"></div>`,
      ariaLabel: (routes[route] || routes.reader).title,
      readingSurfaceHtml: sharedReaderSurface(data, "", appState),
      overlayHtml: `${readerTopOverlay(data, appState)}${readerSessionControlSpaceHtml(appState)}`,
      bottomSheetHtml: sheetHtml,
      moduleNavHtml: ""
    });
  }

  function readerReplaceDeleteConfirmScreen(data, route, appState) {
    const targetId = appState?.replaceRuleDeleteTarget || "";
    const target = readerReplacementRules(appState).find((rule) => rule.id === targetId);
    const ruleTitle = target ? target.title : "未知规则";
    const rulePattern = target ? target.pattern : "";
    const ruleReplacement = target ? target.replacement : "";
    return readerStateVariantShell(data, route, appState, {
      frameModifier: "fd-reader-variant-replace-delete-confirm",
      sheetHtml: `
        <section class="fd-reader-state-panel fd-reader-replace-delete-confirm" data-reader-state="replace-delete-confirm" aria-live="assertive" aria-label="删除替换规则确认">
          <header><strong>确认删除替换规则</strong><small>删除后不可恢复，请谨慎操作</small></header>
          <div class="fd-reader-font-delete-warning">
            <p class="fd-reader-font-delete-warning-text">将删除规则：<strong>${esc(ruleTitle)}</strong></p>
            <p class="fd-reader-replace-rule-meta">${esc(rulePattern || "(空)")} → ${esc(ruleReplacement || "(空)")}</p>
          </div>
          <div class="fd-reader-state-banner-actions">
            <button class="fd-reader-state-retry is-danger" type="button" data-reader-replace-rule-delete-confirm="${esc(targetId)}">确认删除</button>
            <button class="fd-reader-state-secondary" type="button" data-route="content-replacement">取消</button>
          </div>
        </section>`
    });
  }

  function readerReplaceApplyResultScreen(data, route, appState) {
    const result = appState?.replaceRuleApplyResult || "success";
    const count = appState?.replaceRuleApplyCount || 0;
    const undoable = Boolean(appState?.replaceRuleApplyUndoable);
    let headerText = "已应用到当前正文";
    let smallText = `共应用 ${count} 条启用的规则`;
    let tone = "is-success";
    if (result === "failure") {
      headerText = "应用失败";
      smallText = appState?.replaceRuleApplyError || "部分规则正则无效，已跳过";
      tone = "is-error";
    } else if (result === "undone") {
      headerText = "已撤销应用";
      smallText = "正文已恢复到原始状态";
      tone = "is-info";
    }
    return readerStateVariantShell(data, route, appState, {
      frameModifier: "fd-reader-variant-replace-apply-result",
      sheetHtml: `
        <section class="fd-reader-state-panel fd-reader-replace-apply-result ${tone}" data-reader-state="replace-apply-result" aria-live="polite" aria-label="替换规则应用结果">
          <header><strong>${esc(headerText)}</strong><small>${esc(smallText)}</small></header>
          <div class="fd-reader-replace-apply-result-body">
            ${result === "success" ? `<p>当前章节正文已按规则列表顺序替换。如需还原可点击撤销。</p>` : ""}
            ${result === "failure" ? `<p>请检查规则中的正则表达式是否合法后重试。</p>` : ""}
            ${result === "undone" ? `<p>正文已恢复为原始内容。</p>` : ""}
          </div>
          <div class="fd-reader-state-banner-actions">
            ${result === "success" && undoable ? `<button class="fd-reader-state-retry fd-reader-replace-undo" type="button" data-reader-replace-apply-undo>撤销应用</button>` : ""}
            <button class="fd-reader-state-secondary" type="button" data-route="content-replacement">返回规则管理</button>
            <button class="fd-reader-state-secondary" type="button" data-route="immersive-reading">继续阅读</button>
          </div>
        </section>`
    });
  }

  function readerReplaceImportExportScreen(data, route, appState) {
    const allRules = readerReplacementRules(appState);
    const exportJson = JSON.stringify({
      version: "w5-replace-rules",
      exportedAt: new Date().toISOString(),
      rules: allRules.map((rule) => ({
        id: rule.id,
        title: rule.title,
        pattern: rule.pattern,
        replacement: rule.replacement,
        scope: rule.scope,
        enabled: rule.enabled,
        custom: rule.custom
      }))
    }, null, 2);
    const importStatus = appState?.replaceRuleImportStatus || "";
    const importPreview = appState?.replaceRuleImportPreview || null;
    return readerStateVariantShell(data, route, appState, {
      frameModifier: "fd-reader-variant-replace-import-export",
      sheetHtml: `
        <section class="fd-reader-state-panel fd-reader-replace-import-export" data-reader-state="replace-import-export" aria-label="替换规则导入导出">
          <header><strong>导入 / 导出替换规则</strong><small>支持 JSON 格式的规则集导入导出</small></header>
          <div class="fd-reader-replace-import-export-body">
            <div class="fd-reader-replace-export-block">
              <header><strong>导出</strong><small>当前共 ${allRules.length} 条规则</small></header>
              <pre class="fd-reader-replace-export-json" aria-label="导出 JSON 预览" readonly>${esc(exportJson)}</pre>
              <div class="fd-reader-replace-export-actions">
                <button class="fd-reader-state-retry" type="button" data-reader-replace-export>复制 JSON 到剪贴板</button>
              </div>
            </div>
            <div class="fd-reader-replace-import-block">
              <header><strong>导入</strong><small>粘贴 JSON 后点击预览</small></header>
              <textarea class="fd-reader-replace-import-textarea" data-reader-replace-import-input placeholder='{"version":"w5-replace-rules","rules":[]}' aria-label="导入 JSON 输入框"></textarea>
              ${importStatus ? `<p class="fd-reader-replace-import-status ${importStatus.startsWith("导入成功") ? "is-success" : "is-error"}" role="status">${esc(importStatus)}</p>` : ""}
              ${importPreview ? `
                <div class="fd-reader-replace-import-preview" aria-label="导入预览">
                  <header><strong>预览：将导入 ${importPreview.rules.length} 条规则</strong></header>
                  <ul>
                    ${importPreview.rules.slice(0, 5).map((rule) => `<li><strong>${esc(rule.title || "(未命名)")}</strong><small>${esc(rule.pattern || "")} → ${esc(rule.replacement || "(空)")}</small></li>`).join("")}
                    ${importPreview.rules.length > 5 ? `<li>...还有 ${importPreview.rules.length - 5} 条</li>` : ""}
                  </ul>
                  <div class="fd-reader-replace-import-actions">
                    <button class="fd-reader-state-retry is-primary" type="button" data-reader-replace-import-confirm>确认导入</button>
                    <button class="fd-reader-state-secondary" type="button" data-reader-replace-import-cancel>取消</button>
                  </div>
                </div>
              ` : ""}
              <div class="fd-reader-replace-import-actions">
                <button class="fd-reader-state-secondary" type="button" data-reader-replace-import-preview-btn>预览导入</button>
              </div>
            </div>
          </div>
          <div class="fd-reader-state-banner-actions">
            <button class="fd-reader-state-secondary" type="button" data-route="content-replacement">返回规则管理</button>
          </div>
        </section>`
    });
  }

  function readerReplacePreviewScreen(data, route, appState) {
    const preview = readerReplacePreviewText(appState);
    const enabledRules = readerReplacementRules(appState).filter((rule) => rule.enabled);
    return readerStateVariantShell(data, route, appState, {
      frameModifier: "fd-reader-variant-replace-preview",
      sheetHtml: `
        <section class="fd-reader-state-panel fd-reader-replace-preview-detail" data-reader-state="replace-preview" aria-label="原文与替换后对比预览">
          <header><strong>原文 vs 替换后</strong><small>当前已启用 ${enabledRules.length} 条规则</small></header>
          <div class="fd-reader-replace-preview-detail-grid">
            <div class="fd-reader-replace-preview-detail-col">
              <header><strong>原文</strong></header>
              <p>${esc(preview.original)}</p>
            </div>
            <div class="fd-reader-replace-preview-detail-col is-replaced">
              <header><strong>替换后</strong></header>
              <p>${esc(preview.replaced)}</p>
            </div>
          </div>
          <div class="fd-reader-replace-applied-rules" aria-label="已应用规则列表">
            <header><strong>按顺序应用的规则</strong></header>
            <ol>
              ${enabledRules.length ? enabledRules.map((rule) => `<li><strong>${esc(rule.title)}</strong><small>${esc(rule.pattern || "")} → ${esc(rule.replacement || "(空)")}</small></li>`).join("") : `<li>没有启用的规则</li>`}
            </ol>
          </div>
          <div class="fd-reader-state-banner-actions">
            <button class="fd-reader-state-secondary" type="button" data-route="content-replacement">返回规则管理</button>
          </div>
        </section>`
    });
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
        body: (() => {
          const scope = appState?.readerSearchScope || "chapter";
          const scopeOptions = [
            { value: "chapter", label: "当前章" },
            { value: "book", label: "全书" },
            { value: "chapters", label: "指定章节" }
          ];
          const loading = Boolean(appState?.readerSearchLoading);
          const noResults = Boolean(appState?.readerSearchNoResults);
          const history = appState?.readerSearchHistory || ["雨夜", "灯塔", "雨容"];
          let resultsHtml = "";
          if (loading) {
            resultsHtml = `<div class="fd-reader-search-loading fd-reader-loading-skeleton-list" aria-live="polite" aria-label="搜索加载中">${readerStateSkeletonBars("content")}</div>`;
          } else if (noResults) {
            resultsHtml = `<div class="fd-reader-search-empty" aria-live="polite" aria-label="无搜索结果"><strong>没有找到相关结果</strong><small>尝试更换关键词或扩大搜索范围</small></div>`;
          } else {
            resultsHtml = `
              <div class="fd-reader-search-result-list fd-reader-module-list" aria-label="内容搜索结果">
                <button type="button" data-route="immersive-reading"><strong>第 32 章 雨夜</strong><small>雨夜的风格外冷 · 当前结果 1/2</small></button>
                <button type="button" data-route="immersive-reading"><strong>第 33 章 灯塔</strong><small>雨夜之后，远处灯塔亮起 · 结果 2/2</small></button>
              </div>`;
          }
          return `
          <div class="fd-reader-search-panel fd-reader-quick-action-panel" data-control-layer="L2">
            <header class="fd-reader-quick-toolbar" aria-label="内容搜索操作">
              <button class="fd-reader-quick-back" type="button" data-route="reader" aria-label="返回阅读控制首页">
                ${icon("back", "fd-small-icon")}<span>返回</span>
              </button>
              <button class="fd-reader-quick-action" type="button" data-reader-search-submit aria-label="搜索当前输入内容">搜索</button>
            </header>
            <label class="fd-reader-panel-search fd-reader-search-field">${icon("search", "fd-small-icon")}<span>雨夜</span></label>
            <div class="fd-reader-segment-row fd-reader-search-scope" aria-label="搜索范围" data-reader-search-scope>
              ${scopeOptions.map((option) => `<button class="${scope === option.value ? "is-active" : ""}" type="button" data-reader-search-scope-option="${esc(option.value)}">${esc(option.label)}</button>`).join("")}
            </div>
            ${loading || noResults ? "" : `<div class="fd-reader-search-history" aria-label="搜索历史" data-reader-search-history>${history.map((term) => `<button type="button" data-reader-search-history-term="${esc(term)}">${esc(term)}</button>`).join("")}</div>`}
            ${resultsHtml}
          </div>`;
        })()
      },
      "auto-page": {
        title: "自动翻页",
        meta: "启动后进入沉浸阅读，底部胶囊控制暂停继续",
        hideHeader: true,
        className: "fd-reader-auto-page-quick-panel",
        body: `
          <div class="fd-reader-auto-panel" data-control-layer="L2">
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
        body: (() => {
          const allRules = readerReplacementRules(appState);
          const formOpen = Boolean(appState?.replaceRuleFormOpen);
          const draft = appState?.replaceRuleDraft || { title: "", pattern: "", replacement: "", scope: ["chapter"] };
          const error = appState?.replaceRuleError || "";
          const editingId = appState?.replaceRuleEditingId || "";
          const scopeOptions = readerReplaceScopeOptions();
          const formTitle = editingId ? "编辑规则" : "新增规则";
          return `
          <div class="fd-reader-replace-panel fd-reader-quick-action-panel" data-control-layer="L2">
            <header class="fd-reader-quick-toolbar" aria-label="内容替换操作">
              <button class="fd-reader-quick-back" type="button" data-route="reader" aria-label="返回阅读控制首页">
                ${icon("back", "fd-small-icon")}<span>返回</span>
              </button>
              <span class="fd-reader-quick-toolbar-actions">
                <button class="fd-reader-quick-action" type="button" data-route="reader-replace-page" aria-label="进入完整替换规则管理">完整管理</button>
                <button class="fd-reader-quick-action fd-replace-add-entry" type="button" data-reader-replace-rule-add aria-label="新增替换规则" ${formOpen ? "aria-disabled=\"true\"" : ""}>
                  ${icon("add", "fd-small-icon")}<span>新增规则</span>
                </button>
              </span>
            </header>
            <div class="fd-replace-rule-list fd-replace-toggle-list" aria-label="内容替换规则开关">
              ${allRules.map((rule) => `
                <article class="fd-replace-rule-row fd-replace-toggle-row ${rule.enabled ? "is-on" : ""}" data-reader-replace-rule-item="${esc(rule.id)}">
                  <button class="fd-replace-rule-toggle" type="button" data-reader-replace-rule="${esc(rule.id)}" aria-pressed="${rule.enabled ? "true" : "false"}" aria-label="切换规则 ${esc(rule.title)}">
                    <strong><span>${esc(rule.title)}</span>${rule.custom ? "<em>自定义</em>" : ""}</strong>
                    <small>${esc(rule.pattern || "")} → ${esc(rule.replacement || "(空)")}</small>
                    <span class="fd-replace-switch ${rule.enabled ? "is-on" : ""}" aria-hidden="true"><i></i></span>
                  </button>
                  <div class="fd-replace-rule-actions">
                    <button type="button" data-reader-replace-rule-edit="${esc(rule.id)}" aria-label="编辑规则 ${esc(rule.title)}">${icon("edit", "fd-small-icon")}</button>
                    ${rule.custom ? `<button type="button" data-reader-replace-rule-delete="${esc(rule.id)}" aria-label="删除规则 ${esc(rule.title)}">${icon("trash", "fd-small-icon")}</button>` : ""}
                  </div>
                </article>
              `).join("")}
            </div>
            ${formOpen ? `
              <section class="fd-replace-rule-form" data-reader-replace-rule-form aria-label="${esc(formTitle)}">
                <header><strong>${esc(formTitle)}</strong></header>
                <label class="fd-replace-form-field">
                  <span>名称</span>
                  <input type="text" data-reader-replace-form-field="title" value="${esc(draft.title)}" placeholder="规则名称" maxlength="12" />
                </label>
                <label class="fd-replace-form-field">
                  <span>正则</span>
                  <input type="text" data-reader-replace-form-field="pattern" value="${esc(draft.pattern)}" placeholder="如：雨容" />
                </label>
                <label class="fd-replace-form-field">
                  <span>替换为</span>
                  <input type="text" data-reader-replace-form-field="replacement" value="${esc(draft.replacement)}" placeholder="如：雨蓉" />
                </label>
                <fieldset class="fd-replace-form-field fd-replace-form-scope" aria-label="作用范围">
                  <legend>作用范围</legend>
                  <div class="fd-replace-scope-options">
                    ${scopeOptions.map((option) => `
                      <label class="${(draft.scope || []).includes(option.value) ? "is-active" : ""}">
                        <input type="checkbox" data-reader-replace-scope="${esc(option.value)}" ${(draft.scope || []).includes(option.value) ? "checked" : ""} />
                        <span>${esc(option.label)}</span>
                      </label>
                    `).join("")}
                  </div>
                </fieldset>
                ${error ? `<p class="fd-replace-form-error" role="alert">${esc(error)}</p>` : ""}
                <div class="fd-replace-form-actions">
                  <button class="is-cancel" type="button" data-reader-replace-rule-cancel>取消</button>
                  <button class="is-primary" type="button" data-reader-replace-rule-save>${editingId ? "保存修改" : "添加规则"}</button>
                </div>
              </section>
            ` : ""}
          </div>
        `;
        })()
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
      const bookmarkedItems = chapters.filter((chapter, index) => chapterIsBookmarked(chapter, appState, index));
      const compactCount = 4;
      const nearbyStart = clamp(currentChapterState.index - 1, 0, Math.max(0, chapters.length - compactCount));
      const visibleItems = tocMode === "bookmark"
        ? bookmarkedItems.slice(0, compactCount)
        : chapters.slice(nearbyStart, nearbyStart + compactCount);
      const listHtml = visibleItems.map((chapter) => {
        const chapterIndex = Math.max(0, chapters.indexOf(chapter));
        const hasBookmark = chapterIsBookmarked(chapter, appState, chapterIndex);
        const isCurrent = chapterIndex === currentChapterState.index;
        const rowMeta = isCurrent ? "当前" : chapterHasMarker(chapter, "已缓存") ? "已缓存" : hasBookmark ? "书签" : "";
        return `
            <article class="fd-reader-toc-compact-row${isCurrent ? " is-current" : ""}">
              <button class="fd-reader-toc-row-main" type="button" data-reader-directory-index="${chapterIndex}"${isCurrent ? ' aria-current="true"' : ""}>
                <small class="fd-reader-toc-index">${esc(chapterIndex + 1)}</small>
                <strong>${esc(chapter.title)}</strong>
                <em>${esc(rowMeta)}</em>
              </button>
              <button class="fd-reader-toc-bookmark${hasBookmark ? " is-active" : ""}" type="button" data-reader-bookmark-toggle="${chapterIndex}" aria-pressed="${hasBookmark ? "true" : "false"}" aria-label="${hasBookmark ? "移除书签" : "添加书签"}">${icon("bookmark", "fd-small-icon")}</button>
            </article>`;
      }).join("");
      return `
        <section class="fd-reader-module-panel fd-reader-toc-panel" data-control-layer="L2" data-dev-region="ReaderModulePanel" aria-label="目录与书签">
          <header class="fd-reader-module-head fd-reader-toc-head">
            <span><strong>目录与书签</strong><small>${esc(currentChapterState.chapter.title)} · ${esc(currentChapterState.index + 1)}/${esc(chapters.length)}</small></span>
            <nav class="fd-reader-module-head-actions" aria-label="目录快捷操作">
              <button type="button" data-reader-directory-index="${esc(currentChapterState.index)}">定位</button>
              <button type="button" data-route="reader-full-directory" data-route-replace>全部</button>
            </nav>
          </header>
          ${readerTocSwitchHtml(tocMode, "fd-reader-toc-tabs")}
          <div class="fd-reader-toc-compact-list" data-reader-toc-scroll aria-label="${tocMode === "bookmark" ? "书签章节" : "当前章节附近目录"}">
            ${listHtml || `
              <div class="fd-reader-toc-empty" role="status">
                ${icon("bookmark", "fd-medium-icon")}
                <span><strong>还没有书签</strong><small>可先收藏当前章节，之后从这里快速返回。</small></span>
                <button type="button" data-reader-bookmark-toggle="${esc(currentChapterState.index)}">收藏当前章</button>
              </div>`}
          </div>
        </section>`;
    }
    if (type === "tts") {
      const tts = appState.readerTts || {};
      const ttsConfig = readerTtsConfig(data);
      const ttsDefaults = ttsConfig.defaults;
      const ttsOptions = ttsConfig.options;
      const ttsSession = Boolean(appState?.readerTtsSession || tts.playing);
      const sentenceIndex = clamp(Number(tts.sentenceIndex || ttsDefaults.sentenceIndex || 1), ttsConfig.sentenceMin, ttsConfig.sentenceMax);
      const currentSentence = readerTtsSegments(data)[sentenceIndex - 1]?.text || "雨声在窗外连成一片，像无数细小的针落在玻璃上。";
      return `
        <section class="fd-reader-module-panel fd-reader-tts-panel" data-control-layer="L2" data-dev-region="ReaderModulePanel" aria-label="朗读">
          <header class="fd-reader-module-head fd-reader-tts-toolbar" aria-label="朗读操作">
            <span><strong class="fd-reader-module-title">朗读</strong><small>${ttsSession ? "正在朗读" : "准备就绪"} · ${esc(tts.voice || ttsDefaults.voice)}</small></span>
            <nav class="fd-reader-module-head-actions">
              <button type="button" data-route="reader-full-tts" data-route-replace>完整设置</button>
              ${ttsSession ? `<button class="fd-reader-tts-stop is-danger" type="button" data-reader-session-stop="tts">停止</button>` : ""}
            </nav>
          </header>
          <div class="fd-reader-tts-list fd-reader-module-list fd-reader-tts-layout">
            <section class="fd-reader-tts-now" aria-label="当前朗读内容">
              <span class="fd-reader-tts-current-copy">
                <small>当前句 · ${esc(sentenceIndex)}/${esc(ttsConfig.sentenceMax)}</small>
                <strong>${esc(currentSentence)}</strong>
              </span>
              <span class="fd-reader-tts-controls">
                <button type="button" data-reader-tts-action="prev" aria-label="上一句">${icon("chevron-left", "fd-small-icon")}</button>
                <button class="is-primary ${tts.playing ? "is-playing" : ""}" type="button" data-reader-tts-action="toggle" aria-label="${tts.playing ? "暂停朗读" : "开始朗读"}">${icon(tts.playing ? "pause" : "play", "fd-small-icon")}</button>
                <button type="button" data-reader-tts-action="next" aria-label="下一句">${icon("chevron", "fd-small-icon")}</button>
              </span>
              <i class="fd-reader-tts-progress" style="--progress:${esc(Math.round((sentenceIndex / ttsConfig.sentenceMax) * 100))}%"><b></b></i>
            </section>
            <div class="fd-reader-tts-option-row fd-reader-tts-speed-card">
              <button type="button" data-reader-tts-cycle="speed"><i>${icon("motion", "fd-small-icon")}</i><strong>语速</strong><em>${esc(tts.speed || ttsDefaults.speed)}${chevron()}</em></button>
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
        <section class="fd-reader-module-panel fd-reader-appearance-panel" data-control-layer="L2" data-dev-region="ReaderModulePanel" aria-label="阅读外观">
          <header class="fd-reader-module-head">
            <span><strong>界面</strong><small>${esc(activeTheme.label)} · ${esc(typography.fontSize)}px</small></span>
            <nav class="fd-reader-module-head-actions"><button type="button" data-route="reader-full-appearance" data-route-replace>完整设置</button></nav>
          </header>
          <div class="fd-reader-appearance-list fd-reader-module-list">
            <section class="fd-reader-full-setting-block fd-reader-appearance-quick-theme">
              <header><strong>阅读主题</strong></header>
              <div class="fd-reader-full-theme-grid">
                ${quickThemes.map((item, index) => `
                  <button class="${activeTheme.value === item.value ? "is-active" : ""}" type="button" data-reader-theme="${esc(item.value)}" data-reader-theme-scheme="${esc(item.scheme || (index < 2 ? "day" : "night"))}" data-reader-theme-texture="${esc(item.texture || "plain")}" aria-label="${esc(item.scheme === "night" ? "夜晚" : "白天")}${item.texture === "paper" ? "纹理" : "纯色"}主题：${esc(item.label)}">
                    <span style="--swatch:${esc(item.swatch)};--swatch-texture-rgb:${esc(item.textureRgb || (item.scheme === "night" ? "222 202 174" : "138 116 84"))}"></span>
                    <b>${esc(item.label)}</b>
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
        <section class="fd-reader-module-panel fd-reader-settings-panel" data-control-layer="L2" data-dev-region="ReaderModulePanel" aria-label="阅读设置">
          <header class="fd-reader-module-head">
            <span><strong>阅读设置</strong><small>${esc(settings.tapMode || settingDefaults.tapMode)} · ${esc(settings.pageAnimation || settingDefaults.pageAnimation)}</small></span>
            <nav class="fd-reader-module-head-actions"><button type="button" data-route="reader-full-settings" data-route-replace>完整设置</button></nav>
          </header>
          <div class="fd-reader-settings-list">
            <div class="fd-reader-setting-row">
              <button type="button" data-reader-setting-option-key="tapMode" aria-expanded="${appState?.readerSettingsExpandedOption === "tapMode" ? "true" : "false"}"><i>${icon("gesture", "fd-small-icon")}</i><strong>点击翻页方式</strong><em>${esc(settings.tapMode || settingDefaults.tapMode)}${chevron()}</em></button>
              ${readerSettingDropdownHtml("tapMode", "点击翻页方式", settings, settingDefaults, settingOptions, appState)}
            </div>
            <div class="fd-reader-setting-row">
              <button type="button" data-reader-setting-option-key="pageAnimation" aria-expanded="${appState?.readerSettingsExpandedOption === "pageAnimation" ? "true" : "false"}"><i>${icon("file", "fd-small-icon")}</i><strong>翻页动画</strong><em>${esc(settings.pageAnimation || settingDefaults.pageAnimation)}${chevron()}</em></button>
              ${readerSettingDropdownHtml("pageAnimation", "翻页动画", settings, settingDefaults, settingOptions, appState)}
            </div>
            <button type="button" data-reader-setting-toggle="keepScreenOn"><i>${icon("sun", "fd-small-icon")}</i><strong>屏幕常亮</strong><span class="fd-reader-switch ${settings.keepScreenOn ? "is-on" : ""}" aria-hidden="true"></span></button>
            <button type="button" data-reader-setting-toggle="hideStatusBar"><i>${icon("eyeOff", "fd-small-icon")}</i><strong>隐藏状态栏</strong><span class="fd-reader-switch ${settings.hideStatusBar ? "is-on" : ""}" aria-hidden="true"></span></button>
          </div>
        </section>`;
    }
    return "";
  }

  function readerModuleNavHtml(data, activeType) {
    const normalizedType = activeType || "";
    return data.reader.modules.map((item) => `
      <button class="fd-reader-module${item.type === normalizedType ? " is-active" : ""}" type="button" data-control-layer="L1" data-route="${esc(readerModuleRoutes[item.type] || "reader")}" data-module="${esc(item.type)}"${item.type === normalizedType ? ' aria-current="page"' : ""}>
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
    const query = String(appState?.readerTocQuery || "").trim().toLowerCase();
    const sortedItems = chapters
      .map((chapter, chapterIndex) => ({ chapter, chapterIndex }))
      .filter(({ chapter, chapterIndex }) => tocMode !== "bookmark" || chapterIsBookmarked(chapter, appState, chapterIndex))
      .filter(({ chapter }) => !query || String(chapter.title || "").toLowerCase().includes(query));
    if (appState?.readerTocSort === "desc") sortedItems.reverse();
    return `
      <section class="fd-reader-full-section fd-reader-full-directory" aria-label="完整目录">
        <header class="fd-reader-full-directory-summary">
          <span><small>正在阅读</small><strong>${esc(currentChapterState.chapter.title)}</strong></span>
          <em>${esc(currentChapterState.index + 1)} / ${esc(chapters.length)}</em>
        </header>
        <div class="fd-reader-full-directory-tools">
          <label>${icon("search", "fd-small-icon")}<input type="search" value="${esc(appState?.readerTocQuery || "")}" placeholder="搜索章节标题" data-reader-toc-search-input aria-label="搜索章节标题"></label>
          <button type="button" data-reader-toc-sort="${appState?.readerTocSort === "desc" ? "desc" : "asc"}">${icon("sort", "fd-small-icon")}<span>${appState?.readerTocSort === "desc" ? "倒序" : "正序"}</span></button>
        </div>
        ${readerTocSwitchHtml(tocMode, "fd-reader-full-toc-switch-row")}
        <div class="fd-reader-full-toc-list" data-reader-toc-scroll>
          ${sortedItems.map(({ chapter, chapterIndex }) => {
            const hasBookmark = chapterIsBookmarked(chapter, appState, chapterIndex);
            return `
              <article class="fd-reader-full-toc-row${chapterIndex === currentChapterState.index ? " is-current" : ""}" data-reader-toc-title="${esc(String(chapter.title || "").toLowerCase())}">
                <button class="fd-reader-full-toc-main" type="button" data-reader-directory-index="${chapterIndex}"${chapterIndex === currentChapterState.index ? ' aria-current="true"' : ""}>
                  <small>${esc(chapterIndex + 1)}</small><strong>${esc(chapter.title)}</strong><em>${chapterIndex === currentChapterState.index ? "当前" : chapterHasMarker(chapter, "已缓存") ? "已缓存" : ""}</em>
                </button>
                ${chapterDownloadSlot(chapter, appState, { book: data.library.book, chapterIndex })}
                <button class="fd-reader-toc-bookmark${hasBookmark ? " is-active" : ""}" type="button" data-reader-bookmark-toggle="${chapterIndex}" aria-pressed="${hasBookmark ? "true" : "false"}" aria-label="${hasBookmark ? "移除书签" : "添加书签"}">${icon("bookmark", "fd-small-icon")}</button>
              </article>`;
          }).join("") || `<div class="fd-reader-full-toc-empty" role="status"><strong>${tocMode === "bookmark" ? "还没有符合条件的书签" : "没有匹配的章节"}</strong><small>清除搜索或切换目录后重试。</small></div>`}
          <div class="fd-reader-full-toc-empty" data-reader-toc-live-empty role="status" hidden><strong>没有匹配的章节</strong><small>换个关键词后重试。</small></div>
        </div>
        <footer class="fd-reader-full-directory-footer">
          <button type="button" data-reader-directory-index="${esc(currentChapterState.index)}">定位当前章</button>
          <button class="is-primary" type="button" data-route="immersive-reading">继续阅读</button>
        </footer>
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

  function readerWorkspaceEntry(route, iconName, title, detail) {
    return `
      <button type="button" data-route="${esc(route)}" data-reader-workspace-entry="${esc(route)}">
        <i>${icon(iconName, "fd-small-icon")}</i>
        <span><strong>${esc(title)}</strong><small>${esc(detail)}</small></span>
        ${chevron()}
      </button>`;
  }

  function readerAppearanceWorkspaceEntries() {
    return `
      <nav class="fd-reader-workspace-entry-grid" aria-label="界面完整工作区入口">
        ${readerWorkspaceEntry("reader-full-theme", "palette", "主题与背景", "默认日夜主题、自定义背景")}
        ${readerWorkspaceEntry("reader-full-font", "text", "字体库", "本地导入、字体族与回退")}
        ${readerWorkspaceEntry("reader-full-layout", "columns", "精细排版", "页面边距、缩进与纹理")}
      </nav>`;
  }

  function readerExpandedControlOverview(data, appState) {
    const pageReadout = readerPageReadout(data, appState);
    const chapter = currentReaderChapter(data, appState);
    return `
      <section class="fd-reader-expanded-control" aria-label="阅读总控半屏层">
        <section class="fd-reader-control-overview" aria-label="当前阅读状态">
          <article><small>章节</small><strong>${esc(chapter.chapter.title || readerChapterMeta(data))}</strong></article>
          <article><small>页码</small><strong>${esc(pageReadout.pageLabel || pageReadout.progressLabel)}</strong></article>
        </section>
        <nav class="fd-reader-workspace-entry-grid fd-reader-control-overview-grid" aria-label="阅读控制分类">
          ${readerWorkspaceEntry("reader-full-directory", "directory", "目录与书签", "章节跳转、书签定位")}
          ${readerWorkspaceEntry("reader-full-tts", "tts", "朗读", "播放、音色、语速与定时")}
          ${readerWorkspaceEntry("reader-full-appearance", "appearance", "界面", "主题、字体与版式")}
          ${readerWorkspaceEntry("reader-full-settings", "settings", "阅读设置", "翻页与阅读行为")}
        </nav>
      </section>`;
  }

  function readerFullAppearancePage(data, appState) {
    const typography = appState?.readerTypography || normalizeReaderTypography(data);
    const pageSpace = appState?.readerPageSpace || normalizeReaderPageSpace(data);
    const pageSpaceConfig = readerPageSpaceConfig(data);
    const textureOptions = pageSpaceConfig.textureOptions || [];
    const activeTheme = currentReaderTheme(data, appState);
    return `
      <section class="fd-reader-full-section fd-reader-full-appearance" aria-label="完整界面设置">
        ${readerAppearanceWorkspaceEntries()}
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
        <section class="fd-reader-full-setting-block">
          <header><strong>页面纹理</strong><em>${esc(pageSpace.texture)}</em></header>
          <div class="fd-reader-full-choice-grid">
            ${readerChoiceButtons(textureOptions.map((item) => item.value), pageSpace.texture, (value) => `data-reader-page-space-set="texture" data-reader-page-space-value="${esc(value)}"`)}
          </div>
        </section>
        <section class="fd-reader-full-setting-block fd-reader-persist-section">
          <header><strong>恢复默认与持久化</strong><em>localStorage 模拟</em></header>
          <div class="fd-reader-persist-actions">
            <button class="fd-reader-persist-restart" type="button" data-w4-theme-restore-default>恢复默认主题</button>
            <button class="fd-reader-persist-restart" type="button" data-route="reader-typography-reset-confirm">恢复默认排版</button>
            <button class="fd-reader-persist-restart" type="button" data-w4-save>${icon("save", "fd-small-icon")}<span>保存到 localStorage</span></button>
            <button class="fd-reader-persist-restart" type="button" data-w4-restart>${icon("refresh", "fd-small-icon")}<span>模拟重启（恢复）</span></button>
            <button class="fd-reader-persist-restart" type="button" data-w4-clear>${icon("trash", "fd-small-icon")}<span>清除持久化</span></button>
          </div>
          ${appState?.settingsToast ? `<p class="fd-reader-import-status" aria-live="polite">${esc(appState.settingsToast)}</p>` : ""}
        </section>
      </section>`;
  }

  // ===== W4 状态变体渲染器 =====
  function readerFontImportConfirmScreen(data, appState) {
    const file = appState?.w4PendingFontFile;
    const fileName = file ? file.name : "未选择文件";
    const fileSize = file ? `${(file.size / 1024).toFixed(1)}KB` : "未知";
    const fileExt = fileName.match(/\.([a-z]+)$/i)?.[1]?.toUpperCase() || "未知";
    const previewName = fileName.replace(/\.(ttf|otf|ttc)$/i, "");
    return `
      <section class="fd-reader-full-section fd-reader-font-import-confirm" aria-label="字体导入确认">
        <section class="fd-reader-full-setting-block">
          <header><strong>字体导入确认</strong><em>校验通过 · 请预览后启用</em></header>
          <div class="fd-reader-font-confirm-meta">
            <article><small>字体名称</small><strong>${esc(previewName)}</strong></article>
            <article><small>格式</small><strong>${esc(fileExt)}</strong></article>
            <article><small>文件大小</small><strong>${esc(fileSize)}</strong></article>
          </div>
        </section>
        <section class="fd-reader-full-setting-block fd-reader-font-preview-block">
          <header><strong>字体预览</strong><em>启用后写入会话</em></header>
          <div class="fd-reader-font-preview-sample">
            <p>雨，下了一整夜。她站在窗前，看着远处的灯火在雨幕中渐渐模糊。</p>
            <p>The quick brown fox jumps over the lazy dog. 0123456789</p>
          </div>
        </section>
        <section class="fd-reader-full-setting-block">
          <div class="fd-reader-persist-actions">
            <button class="fd-reader-persist-restart is-cancel" type="button" data-route="reader-full-font">取消</button>
            <button class="fd-reader-persist-restart is-primary" type="button" data-w4-font-import-enable>启用字体</button>
          </div>
        </section>
      </section>`;
  }

  function readerFontDeleteConfirmScreen(data, appState) {
    const target = appState?.w4FontDeleteTarget || "";
    const fonts = appState?.readerImportedFonts || [];
    const targetFont = fonts.find((item) => item.value === target);
    const isInUse = appState?.readerTypography?.fontFamily === target;
    const systemFonts = readerFontOptions(data);
    return `
      <section class="fd-reader-full-section fd-reader-font-delete-confirm" aria-label="字体删除确认">
        <section class="fd-reader-full-setting-block fd-reader-font-delete-warning">
          <header><strong>删除字体确认</strong><em>${esc(targetFont ? targetFont.label : "未知字体")}</em></header>
          ${isInUse ? `
            <p class="fd-reader-font-delete-warning-text" role="alert">
              <strong>当前正在使用此字体</strong>，删除后将自动回退至所选回退字体。
            </p>
          ` : `
            <p class="fd-reader-font-delete-warning-text">此字体未被使用，可直接删除。</p>
          `}
        </section>
        ${isInUse ? `
          <section class="fd-reader-full-setting-block">
            <header><strong>选择回退字体</strong><em>删除后切换至此字体</em></header>
            <div class="fd-reader-full-choice-grid fd-reader-full-font-grid">
              ${systemFonts.map((item, index) => `
                <button class="${index === 0 ? "is-active" : ""}" type="button" data-w4-font-fallback-select="${esc(item.value)}">${esc(item.label)}</button>
              `).join("")}
            </div>
          </section>
        ` : ""}
        <section class="fd-reader-full-setting-block">
          <div class="fd-reader-persist-actions">
            <button class="fd-reader-persist-restart is-cancel" type="button" data-route="reader-full-font">取消</button>
            <button class="fd-reader-persist-restart is-danger" type="button" data-w4-font-delete-confirm="${esc(target)}" data-w4-font-fallback="serif">确认删除</button>
          </div>
        </section>
      </section>`;
  }

  function readerFontFallbackScreen(data, appState) {
    const typography = appState?.readerTypography || normalizeReaderTypography(data);
    const systemFonts = readerFontOptions(data);
    return `
      <section class="fd-reader-full-section fd-reader-font-fallback" aria-label="字体失效回退">
        <section class="fd-reader-full-setting-block fd-reader-font-delete-warning">
          <header><strong>字体失效回退</strong><em>演示场景</em></header>
          <p class="fd-reader-font-delete-warning-text" role="alert">
            自定义字体加载失败（如文件损坏或路径失效），已自动回退至系统默认字体。
          </p>
          <p class="fd-reader-import-status">当前字体族：${esc(typography.fontFamily)}</p>
        </section>
        <section class="fd-reader-full-setting-block fd-reader-font-preview-block">
          <header><strong>回退后预览</strong><em>系统字体渲染</em></header>
          <div class="fd-reader-font-preview-sample">
            <p>雨，下了一整夜。她站在窗前，看着远处的灯火在雨幕中渐渐模糊。</p>
            <p>The quick brown fox jumps over the lazy dog. 0123456789</p>
          </div>
        </section>
        <section class="fd-reader-full-setting-block">
          <header><strong>选择回退字体</strong><em>点击切换</em></header>
          <div class="fd-reader-full-choice-grid fd-reader-full-font-grid">
            ${systemFonts.map((item) => `
              <button class="${typography.fontFamily === item.value ? "is-active" : ""}" type="button" data-w4-font-fallback-trigger="${esc(item.value)}" style="${item.fontStack ? `font-family:${esc(item.fontStack)}` : ""}">${esc(item.label)}</button>
            `).join("")}
          </div>
        </section>
        <section class="fd-reader-full-setting-block">
          <div class="fd-reader-persist-actions">
            <button class="fd-reader-persist-restart is-primary" type="button" data-route="reader-full-font">返回字体管理</button>
          </div>
        </section>
      </section>`;
  }

  function readerThemeNewScreen(data, appState) {
    const customThemes = Array.isArray(appState?.readerCustomThemes) ? appState.readerCustomThemes : [];
    const presetThemes = readerThemeOptions(data);
    return `
      <section class="fd-reader-full-section fd-reader-theme-new" aria-label="新建主题">
        <section class="fd-reader-full-setting-block">
          <header><strong>新建主题</strong><em>选择创建方式</em></header>
          <div class="fd-reader-full-choice-grid">
            <button type="button" data-w4-theme-create-blank>从空白创建</button>
            <button type="button" data-route="reader-full-theme-edit">从编辑器创建</button>
          </div>
        </section>
        <section class="fd-reader-full-setting-block">
          <header><strong>从预设复制</strong><em>基于现有预设创建</em></header>
          <div class="fd-reader-full-theme-grid fd-reader-custom-theme-grid">
            ${presetThemes.map((item) => `
              <article class="fd-reader-theme-card-shell">
                <button class="fd-reader-theme-card" type="button" aria-label="复制预设：${esc(item.label)}">
                  <span style="--swatch:${esc(item.swatch || item.bg || "#fff7ec")}"></span>
                  <b>${esc(item.label)}</b>
                </button>
                <nav class="fd-reader-theme-crud-actions">
                  <button type="button" data-w4-theme-copy="${esc(item.value)}">复制</button>
                </nav>
              </article>
            `).join("")}
          </div>
        </section>
        ${customThemes.length > 0 ? `
          <section class="fd-reader-full-setting-block">
            <header><strong>从已有自定义主题复制</strong><em>${esc(customThemes.length)} 个可选</em></header>
            <div class="fd-reader-full-theme-grid fd-reader-custom-theme-grid">
              ${customThemes.map((item) => `
                <article class="fd-reader-theme-card-shell">
                  <button class="fd-reader-theme-card" type="button" aria-label="复制：${esc(item.label)}">
                    <span style="--swatch:${esc(item.swatch || item.bg || "#fff7ec")}"></span>
                    <b>${esc(item.label)}</b>
                  </button>
                  <nav class="fd-reader-theme-crud-actions">
                    <button type="button" data-w4-theme-copy="${esc(item.value)}">复制</button>
                  </nav>
                </article>
              `).join("")}
            </div>
          </section>
        ` : ""}
        <section class="fd-reader-full-setting-block">
          <div class="fd-reader-persist-actions">
            <button class="fd-reader-persist-restart is-cancel" type="button" data-route="reader-full-theme">返回</button>
          </div>
        </section>
      </section>`;
  }

  function readerThemeDeleteConfirmScreen(data, appState) {
    const target = appState?.w4ThemeDeleteTarget || "";
    const customThemes = Array.isArray(appState?.readerCustomThemes) ? appState.readerCustomThemes : [];
    const targetTheme = customThemes.find((item) => item.value === target);
    const isInUse = appState?.readerTheme === target;
    return `
      <section class="fd-reader-full-section fd-reader-theme-delete-confirm" aria-label="主题删除确认">
        <section class="fd-reader-full-setting-block fd-reader-font-delete-warning">
          <header><strong>删除主题确认</strong><em>${esc(targetTheme ? targetTheme.label : "未知主题")}</em></header>
          ${isInUse ? `
            <p class="fd-reader-font-delete-warning-text" role="alert">
              <strong>当前正在使用此主题</strong>，删除后将自动回退至默认主题。
            </p>
          ` : `
            <p class="fd-reader-font-delete-warning-text">此主题未被使用，可直接删除。</p>
          `}
        </section>
        <section class="fd-reader-full-setting-block">
          <div class="fd-reader-persist-actions">
            <button class="fd-reader-persist-restart is-cancel" type="button" data-route="reader-full-theme">取消</button>
            <button class="fd-reader-persist-restart is-danger" type="button" data-w4-theme-delete-confirm>确认删除</button>
          </div>
        </section>
      </section>`;
  }

  function readerTypographyResetConfirmScreen(data, appState) {
    const typography = appState?.readerTypography || normalizeReaderTypography(data);
    const pageSpace = appState?.readerPageSpace || normalizeReaderPageSpace(data);
    const defaultTypography = normalizeReaderTypography(data);
    const defaultPageSpace = normalizeReaderPageSpace(data);
    return `
      <section class="fd-reader-full-section fd-reader-typography-reset-confirm" aria-label="排版恢复默认确认">
        <section class="fd-reader-full-setting-block fd-reader-font-delete-warning">
          <header><strong>恢复默认排版</strong><em>确认操作</em></header>
          <p class="fd-reader-font-delete-warning-text">恢复默认后，当前字号/行距/段距/字距/边距/缩进/对齐等配置将被重置。</p>
        </section>
        <section class="fd-reader-full-setting-block">
          <header><strong>当前 vs 默认</strong><em>对比</em></header>
          <div class="fd-reader-typography-compare">
            <article><small>字号</small><strong>${esc(typography.fontSize)}px → ${esc(defaultTypography.fontSize)}px</strong></article>
            <article><small>行距</small><strong>${esc(typography.lineHeight)} → ${esc(defaultTypography.lineHeight)}</strong></article>
            <article><small>段距</small><strong>${esc(typography.paragraphGap)}px → ${esc(defaultTypography.paragraphGap)}px</strong></article>
            <article><small>字距</small><strong>${esc(typography.letterSpacing)}px → ${esc(defaultTypography.letterSpacing)}px</strong></article>
            <article><small>上边距</small><strong>${esc(pageSpace.topMargin)}px → ${esc(defaultPageSpace.topMargin)}px</strong></article>
            <article><small>左右边距</small><strong>${esc(pageSpace.sideMargin)}px → ${esc(defaultPageSpace.sideMargin)}px</strong></article>
            <article><small>首行缩进</small><strong>${esc(pageSpace.paragraphIndent)}em → ${esc(defaultPageSpace.paragraphIndent)}em</strong></article>
          </div>
        </section>
        <section class="fd-reader-full-setting-block">
          <div class="fd-reader-persist-actions">
            <button class="fd-reader-persist-restart is-cancel" type="button" data-route="reader-full-layout">取消</button>
            <button class="fd-reader-persist-restart is-danger" type="button" data-w4-typography-reset-confirm>确认恢复默认</button>
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
      ["volumePage", "音量键翻页", "volume"],
      ["landscapeLock", "横屏锁定", "permission"],
      ["keepScreenOn", "屏幕常亮", "sun"],
      ["statusInfo", "页脚进度信息", "progress"],
      ["hapticFeedback", "触摸反馈", "gesture"],
      ["cacheNext", "自动缓存后续章节", "download"],
      ["hideStatusBar", "隐藏状态栏", "eyeOff"]
    ];
    return `
      <section class="fd-reader-full-section fd-reader-full-settings" aria-label="完整阅读设置">
        ${readerExpandedControlOverview(data, appState)}
        <nav class="fd-reader-workspace-entry-grid" aria-label="翻页完整工作区入口">
          ${readerWorkspaceEntry("reader-full-page-turn", "gesture", "翻页完整设置", "模式、动画、点击区域与反馈")}
        </nav>
        ${["pageMode", "tapMode", "pageAnimation"].map((key) => `
          <section class="fd-reader-full-setting-block">
            <header><strong>${esc(key === "pageMode" ? "翻页模式" : key === "tapMode" ? "点击翻页方式" : "翻页动画")}</strong><em>${esc(current(key))}</em></header>
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

  function readerFullThemeEditPage(data, appState) {
    const draft = appState?.readerThemeEditDraft || { name: "", bg: "#fff7ec", ink: "#2b241d", scheme: "day", backgroundImage: "", backgroundOverlay: 0.18, controlBar: "#eee6d4", controlInk: "#3a3024", textureOpacity: 0.04 };
    const customThemes = Array.isArray(appState?.readerCustomThemes) ? appState.readerCustomThemes : [];
    const error = appState?.readerThemeEditError || "";
    const nameExists = customThemes.some((item) => item.label === draft.name);
    const previewStyle = `background:${esc(draft.bg)};color:${esc(draft.ink)}`;
    return `
      <section class="fd-reader-full-section fd-reader-full-theme-edit" aria-label="自定义主题编辑">
        <section class="fd-reader-full-setting-block fd-reader-full-theme-edit-form">
          <header><strong>自定义主题</strong><em>保存后写入 state 并返回</em></header>
          <div class="fd-reader-theme-edit-fields">
            <label class="fd-reader-theme-edit-field">
              <span>主题名称</span>
              <input type="text" data-reader-theme-edit-field="name" value="${esc(draft.name)}" placeholder="如：暖光纸" maxlength="12" />
              ${nameExists && draft.name ? `<em class="fd-reader-theme-edit-warn" role="alert">名称已存在</em>` : ""}
            </label>
            <label class="fd-reader-theme-edit-field">
              <span>背景色</span>
              <input type="color" data-reader-theme-edit-field="bg" value="${esc(draft.bg)}" />
              <em data-reader-theme-edit-value="bg">${esc(draft.bg)}</em>
            </label>
            <label class="fd-reader-theme-edit-field">
              <span>文字色</span>
              <input type="color" data-reader-theme-edit-field="ink" value="${esc(draft.ink)}" />
              <em data-reader-theme-edit-value="ink">${esc(draft.ink)}</em>
            </label>
            <label class="fd-reader-theme-edit-field fd-reader-theme-edit-control-color">
              <span>控制层顶栏色</span>
              <input type="color" data-reader-theme-edit-field="controlBar" value="${esc(draft.controlBar || "#eee6d4")}" />
              <em data-reader-theme-edit-value="controlBar">${esc(draft.controlBar || "#eee6d4")}</em>
            </label>
            <label class="fd-reader-theme-edit-field fd-reader-theme-edit-control-color">
              <span>控制层按钮色</span>
              <input type="color" data-reader-theme-edit-field="controlInk" value="${esc(draft.controlInk || "#3a3024")}" />
              <em data-reader-theme-edit-value="controlInk">${esc(draft.controlInk || "#3a3024")}</em>
            </label>
            <label class="fd-reader-theme-edit-field fd-reader-theme-background-file">
              <span>背景图片</span>
              <input type="file" data-reader-theme-background-import accept="image/png,image/jpeg,image/webp" />
              <em>${draft.backgroundImage ? "已载入图片" : "可选 PNG / JPEG / WebP"}</em>
            </label>
            <label class="fd-reader-theme-edit-field">
              <span>文字遮罩</span>
              <input type="range" min="0" max="0.72" step="0.04" data-reader-theme-edit-field="backgroundOverlay" value="${esc(draft.backgroundOverlay ?? 0.18)}" />
              <em data-reader-theme-edit-value="backgroundOverlay">${esc(draft.backgroundOverlay ?? 0.18)}</em>
            </label>
            <label class="fd-reader-theme-edit-field">
              <span>纹理透明度</span>
              <input type="range" min="0" max="0.2" step="0.01" data-reader-theme-edit-field="textureOpacity" value="${esc(draft.textureOpacity ?? 0.04)}" />
              <em data-reader-theme-edit-value="textureOpacity">${esc(draft.textureOpacity ?? 0.04)}</em>
            </label>
            <div class="fd-reader-theme-edit-field fd-reader-theme-edit-scheme" role="radiogroup" aria-label="日夜间模式">
              <span>模式</span>
              <div class="fd-reader-full-choice-grid">
                <button class="${draft.scheme === "day" ? "is-active" : ""}" type="button" data-reader-theme-edit-scheme="day">白天</button>
                <button class="${draft.scheme === "night" ? "is-active" : ""}" type="button" data-reader-theme-edit-scheme="night">夜间</button>
              </div>
            </div>
            <label class="fd-reader-theme-edit-field fd-reader-theme-edit-pair">
              <span>日夜间配对</span>
              <div class="fd-reader-full-choice-grid">
                <button class="${(draft.pair || "none") === "none" ? "is-active" : ""}" type="button" data-reader-theme-edit-field="pair" data-reader-theme-edit-pair-value="none">不配对</button>
                <button class="${draft.pair === "day" ? "is-active" : ""}" type="button" data-reader-theme-edit-field="pair" data-reader-theme-edit-pair-value="day">作为日间</button>
                <button class="${draft.pair === "night" ? "is-active" : ""}" type="button" data-reader-theme-edit-field="pair" data-reader-theme-edit-pair-value="night">作为夜间</button>
              </div>
            </label>
          </div>
          ${error ? `<p class="fd-reader-theme-edit-error" role="alert">${esc(error)}</p>` : ""}
        </section>
        <section class="fd-reader-full-setting-block fd-reader-theme-live-preview">
          <header><strong>实时正文预览</strong><em>${esc(draft.name || "未命名")}</em></header>
          <article class="fd-reader-theme-preview-card" style="${previewStyle}">
            <p>雨，下了一整夜。她站在窗前，看着远处的灯火在雨幕中渐渐模糊。</p>
            <p>这是当前编辑主题的实时预览，颜色调整会立即反映在此区域。</p>
          </article>
        </section>
        ${customThemes.length > 0 ? `
          <section class="fd-reader-full-setting-block fd-reader-full-theme-edit-list">
            <header><strong>已保存自定义主题</strong><em>${esc(customThemes.length)} 个</em></header>
            <div class="fd-reader-full-theme-grid fd-reader-custom-theme-grid">
              ${customThemes.map((item) => `
                <article class="fd-reader-theme-card-shell${appState.readerTheme === item.value ? " is-active" : ""}">
                  <button class="fd-reader-theme-card" type="button" data-reader-theme="${esc(item.value)}" data-reader-theme-scheme="${esc(item.scheme || "day")}" aria-label="应用自定义主题：${esc(item.label)}">
                    <span style="--swatch:${esc(item.swatch || item.bg)}"></span>
                    <b>${esc(item.label)}</b>
                  </button>
                  <nav class="fd-reader-theme-crud-actions">
                    <button type="button" data-w4-theme-copy="${esc(item.value)}">复制</button>
                    <button type="button" data-w4-theme-delete="${esc(item.value)}">删除</button>
                  </nav>
                </article>
              `).join("")}
            </div>
          </section>
        ` : ""}
        <section class="fd-reader-full-setting-block fd-reader-full-theme-edit-actions">
          <div class="fd-reader-theme-edit-actions">
            <button class="is-cancel" type="button" data-route-back>取消</button>
            <button type="button" data-reader-theme-edit-save data-reader-theme-edit-default>保存并设为默认</button>
            <button class="is-primary" type="button" data-reader-theme-edit-save>保存主题</button>
          </div>
        </section>
      </section>`;
  }

  function readerFullFontPage(data, appState) {
    const typography = appState?.readerTypography || normalizeReaderTypography(data);
    const systemFonts = readerFontOptions(data);
    const importedFonts = (appState?.readerImportedFonts || []).filter((item) => !item.disabled);
    const allImportedFonts = appState?.readerImportedFonts || [];
    const fontOptions = systemFonts.concat(importedFonts);
    const activeFont = systemFonts.concat(allImportedFonts).find((item) => item.value === typography.fontFamily) || systemFonts[0];
    return `
      <section class="fd-reader-full-section fd-reader-full-font" aria-label="字体完整设置">
        <section class="fd-reader-full-setting-block fd-reader-font-import-block">
          <header><strong>字体库</strong><em>支持 TTF / OTF / TTC</em></header>
          <label class="fd-reader-import-button">
            ${icon("download", "fd-small-icon")}<span>导入本地字体</span>
            <input type="file" data-reader-font-import accept=".ttf,.otf,.ttc,font/ttf,font/otf" />
          </label>
          <button class="fd-reader-persist-restart" type="button" data-reader-font-validate>${icon("check", "fd-small-icon")}<span>校验并预览</span></button>
          <p class="fd-reader-import-status" aria-live="polite">${esc(appState?.readerFontImportStatus || "字体校验通过后将进入预览确认页，再启用写入会话。")}</p>
        </section>
        <section class="fd-reader-full-setting-block fd-reader-font-manage-section">
          <header><strong>系统字体</strong><em>${esc(systemFonts.length)} 个内置</em></header>
          <div class="fd-reader-full-choice-grid fd-reader-full-font-grid">
            ${systemFonts.map((item) => `
              <button class="${typography.fontFamily === item.value ? "is-active" : ""}" type="button" data-reader-typography-set="fontFamily" data-reader-typography-value="${esc(item.value)}" style="${item.fontStack ? `font-family:${esc(item.fontStack)}` : ""}">${esc(item.label)}</button>
            `).join("")}
          </div>
        </section>
        ${allImportedFonts.length > 0 ? `
          <section class="fd-reader-full-setting-block fd-reader-font-manage-section">
            <header><strong>导入字体管理</strong><em>${esc(allImportedFonts.length)} 个已导入</em></header>
            <div class="fd-reader-font-manage-list">
              ${allImportedFonts.map((item) => `
                <article class="fd-reader-font-manage-item${item.disabled ? " is-disabled" : ""}" data-reader-font-manage="${esc(item.value)}">
                  <div class="fd-reader-font-manage-info">
                    <strong style="${item.fontStack ? `font-family:${esc(item.fontStack)}` : ""}">${esc(item.label)}</strong>
                    <small>${esc(item.fileName || "")} · ${item.size ? `${(item.size / 1024).toFixed(1)}KB` : "未知大小"}${item.disabled ? " · 已禁用" : ""}</small>
                  </div>
                  <div class="fd-reader-font-manage-actions">
                    <button type="button" data-reader-font-toggle="${esc(item.value)}" aria-pressed="${item.disabled ? "false" : "true"}">${item.disabled ? "启用" : "禁用"}</button>
                    <button type="button" data-reader-font-rename="${esc(item.value)}">重命名</button>
                    <button type="button" data-reader-font-delete="${esc(item.value)}">删除</button>
                  </div>
                </article>
              `).join("")}
            </div>
          </section>
        ` : ""}
        <section class="fd-reader-full-setting-block fd-reader-font-preview-block">
          <header><strong>字体预览</strong><em>当前：${esc(activeFont ? activeFont.label : typography.fontFamily)}</em></header>
          <div class="fd-reader-font-preview-sample" style="${activeFont && activeFont.fontStack ? `font-family:${esc(activeFont.fontStack)}` : ""}">
            <p>雨，下了一整夜。</p>
            <p>她站在窗前，看着远处的灯火在雨幕中渐渐模糊，仿佛整个世界都被一层薄薄的水雾笼罩。</p>
            <p>The quick brown fox jumps over the lazy dog. 0123456789</p>
          </div>
        </section>
        <section class="fd-reader-full-setting-block">
          <header><strong>字体族</strong><em>${esc(typography.fontFamily)}</em></header>
          <div class="fd-reader-full-choice-grid fd-reader-full-font-grid">
            ${fontOptions.map((item) => `
              <button class="${typography.fontFamily === item.value ? "is-active" : ""}" type="button" data-reader-typography-set="fontFamily" data-reader-typography-value="${esc(item.value)}" style="${item.fontStack ? `font-family:${esc(item.fontStack)}` : ""}">${esc(item.label)}</button>
            `).join("")}
          </div>
        </section>
        <section class="fd-reader-full-setting-block fd-reader-full-typography">
          <header><strong>文字排版</strong><em>字号 / 行距 / 段距 / 字距</em></header>
          ${typographyPanelRows(data, typography)}
        </section>
        <section class="fd-reader-full-setting-block fd-reader-persist-section">
          <header><strong>持久化与重启恢复</strong><em>localStorage 模拟</em></header>
          <div class="fd-reader-persist-actions">
            <button class="fd-reader-persist-restart" type="button" data-w4-save>${icon("save", "fd-small-icon")}<span>保存到 localStorage</span></button>
            <button class="fd-reader-persist-restart" type="button" data-w4-restart>${icon("refresh", "fd-small-icon")}<span>模拟重启（恢复）</span></button>
            <button class="fd-reader-persist-restart" type="button" data-w4-clear>${icon("trash", "fd-small-icon")}<span>清除持久化</span></button>
            <button class="fd-reader-persist-restart" type="button" data-route="reader-font-fallback">字体失效回退演示</button>
          </div>
          ${appState?.settingsToast ? `<p class="fd-reader-import-status" aria-live="polite">${esc(appState.settingsToast)}</p>` : ""}
        </section>
      </section>`;
  }

  function readerManagedThemeCard(item, activeTheme, index = 0) {
    const scheme = item.scheme || (index < 4 ? "day" : "night");
    const active = activeTheme.value === item.value;
    return `
      <article class="fd-reader-theme-card-shell${active ? " is-active" : ""}">
        <button class="fd-reader-theme-card" type="button" data-reader-theme="${esc(item.value)}" data-reader-theme-scheme="${esc(scheme)}" data-reader-theme-texture="${esc(item.texture || "plain")}" data-reader-theme-pair="${esc(item.pair || "")}" aria-pressed="${active ? "true" : "false"}" aria-label="应用主题：${esc(item.label)}">
          <span style="--swatch:${esc(item.swatch || item.bg || "#fff7ec")}"></span>
          <b>${esc(item.label)}</b>
        </button>
        <nav aria-label="${esc(item.label)}默认主题设置">
          <button type="button" data-reader-theme-default="day" data-reader-theme-value="${esc(item.value)}" aria-label="将${esc(item.label)}设为默认日间主题">日间</button>
          <button type="button" data-reader-theme-default="night" data-reader-theme-value="${esc(item.value)}" aria-label="将${esc(item.label)}设为默认夜间主题">夜间</button>
        </nav>
      </article>`;
  }

  function readerFullThemePage(data, appState) {
    const activeTheme = currentReaderTheme(data, appState);
    const customThemes = Array.isArray(appState?.readerCustomThemes) ? appState.readerCustomThemes : [];
    const livePreviewTheme = activeTheme;
    return `
      <section class="fd-reader-full-section fd-reader-full-theme" aria-label="主题完整设置">
        <section class="fd-reader-full-setting-block fd-reader-theme-crud-actions">
          <header><strong>主题管理</strong><em>新建 / 复制 / 删除</em></header>
          <div class="fd-reader-full-choice-grid">
            <button type="button" data-route="reader-theme-new">新建主题</button>
            <button type="button" data-route="reader-full-theme-edit">编辑当前主题</button>
            <button type="button" data-w4-theme-restore-default>恢复默认主题</button>
          </div>
        </section>
        <section class="fd-reader-full-setting-block">
          <header><strong>颜色模式</strong><em>${esc(appState.readerColorSchemeMode === "system" ? "跟随系统" : appState.readerColorSchemeMode === "night" ? "夜间" : "日间")}</em></header>
          <div class="fd-reader-full-choice-grid" role="radiogroup" aria-label="阅读颜色模式">
            ${[
              ["system", "跟随系统"],
              ["day", "日间"],
              ["night", "夜间"]
            ].map(([value, label]) => `<button class="${appState.readerColorSchemeMode === value ? "is-active" : ""}" type="button" data-reader-theme-mode="${value}" aria-pressed="${appState.readerColorSchemeMode === value ? "true" : "false"}">${label}</button>`).join("")}
          </div>
        </section>
        <section class="fd-reader-full-setting-block fd-reader-theme-defaults">
          <header><strong>默认日 / 夜主题</strong><em>跟随系统时自动切换</em></header>
          <div class="fd-reader-theme-default-grid">
            ${["day", "night"].map((scheme) => {
              const selectedValue = scheme === "day" ? appState.readerDefaultDayTheme : appState.readerDefaultNightTheme;
              const selected = readerThemeOptions(data).concat(customThemes).find((item) => item.value === selectedValue) || activeTheme;
              return `<article><small>${scheme === "day" ? "默认日间" : "默认夜间"}</small><span style="--swatch:${esc(selected.swatch || selected.bg || "#fff7ec")}"></span><strong>${esc(selected.label || "未设置")}</strong></article>`;
            }).join("")}
          </div>
        </section>
        <section class="fd-reader-full-setting-block">
          <header><strong>预设主题</strong><em>${esc(activeTheme.label)}</em></header>
          <div class="fd-reader-full-theme-grid">
            ${readerThemeOptions(data).map((item, index) => readerManagedThemeCard(item, activeTheme, index)).join("")}
          </div>
        </section>
        ${customThemes.length > 0 ? `
          <section class="fd-reader-full-setting-block">
            <header><strong>自定义主题</strong><em>${esc(customThemes.length)} 个</em></header>
            <div class="fd-reader-full-theme-grid fd-reader-custom-theme-grid">
              ${customThemes.map((item, index) => `
                <article class="fd-reader-theme-card-shell${activeTheme.value === item.value ? " is-active" : ""}">
                  <button class="fd-reader-theme-card" type="button" data-reader-theme="${esc(item.value)}" data-reader-theme-scheme="${esc(item.scheme || "day")}" aria-pressed="${activeTheme.value === item.value ? "true" : "false"}" aria-label="应用自定义主题：${esc(item.label)}">
                    <span style="--swatch:${esc(item.swatch || item.bg || "#fff7ec")}"></span>
                    <b>${esc(item.label)}</b>
                  </button>
                  <nav class="fd-reader-theme-crud-actions" aria-label="${esc(item.label)}自定义主题操作">
                    <button type="button" data-reader-theme-default="day" data-reader-theme-value="${esc(item.value)}" aria-label="设为默认日间">日间</button>
                    <button type="button" data-reader-theme-default="night" data-reader-theme-value="${esc(item.value)}" aria-label="设为默认夜间">夜间</button>
                    <button type="button" data-w4-theme-copy="${esc(item.value)}" aria-label="复制主题">复制</button>
                    <button type="button" data-w4-theme-delete="${esc(item.value)}" aria-label="删除主题">删除</button>
                  </nav>
                </article>
              `).join("")}
            </div>
          </section>
        ` : ""}
        <section class="fd-reader-full-setting-block fd-reader-theme-live-preview">
          <header><strong>实时正文预览</strong><em>当前主题：${esc(activeTheme.label)}</em></header>
          <article class="fd-reader-theme-preview-card" style="background:${esc(livePreviewTheme.bg || livePreviewTheme.swatch || "#fff7ec")};color:${esc(livePreviewTheme.ink || "#2b241d")}">
            <p>雨，下了一整夜。她站在窗前，看着远处的灯火在雨幕中渐渐模糊。</p>
            <p>这是当前主题下的正文样式预览，可对比不同主题的阅读体验。</p>
          </article>
        </section>
        <section class="fd-reader-full-setting-block fd-reader-full-theme-edit-entry">
          <header><strong>自定义主题与背景</strong><em>纯色 / 图片 / 纹理</em></header>
          <div class="fd-reader-full-choice-grid">
            <button type="button" data-route="reader-full-theme-edit">编辑自定义主题</button>
          </div>
        </section>
        <section class="fd-reader-full-setting-block fd-reader-persist-section">
          <header><strong>持久化与重启恢复</strong><em>localStorage 模拟</em></header>
          <div class="fd-reader-persist-actions">
            <button class="fd-reader-persist-restart" type="button" data-w4-save>${icon("save", "fd-small-icon")}<span>保存到 localStorage</span></button>
            <button class="fd-reader-persist-restart" type="button" data-w4-restart>${icon("refresh", "fd-small-icon")}<span>模拟重启（恢复）</span></button>
            <button class="fd-reader-persist-restart" type="button" data-w4-clear>${icon("trash", "fd-small-icon")}<span>清除持久化</span></button>
          </div>
          ${appState?.settingsToast ? `<p class="fd-reader-import-status" aria-live="polite">${esc(appState.settingsToast)}</p>` : ""}
        </section>
      </section>`;
  }

  function readerFullLayoutPage(data, appState) {
    const typography = appState?.readerTypography || normalizeReaderTypography(data);
    const pageSpace = appState?.readerPageSpace || normalizeReaderPageSpace(data);
    const pageSpaceConfig = readerPageSpaceConfig(data);
    const textureOptions = pageSpaceConfig.textureOptions || [];
    const fontOptions = readerFontOptions(data).concat((appState?.readerImportedFonts || []).filter((item) => !item.disabled));
    const alignOptions = [
      { value: "left", label: "左对齐" },
      { value: "justify", label: "两端对齐" },
      { value: "center", label: "居中" }
    ];
    const pageTurnModes = [
      { value: "cover", label: "覆盖" },
      { value: "slide", label: "滑动" },
      { value: "none", label: "无动画" }
    ];
    const currentAlign = typography.textAlign || "left";
    const currentPageMode = appState.readerSettings?.pageMode || "cover";
    return `
      <section class="fd-reader-full-section fd-reader-full-layout" aria-label="版式完整设置">
        <section class="fd-reader-full-setting-block fd-reader-full-typography fd-reader-typography-control">
          <header><strong>文字排版</strong><em>字号 / 行距 / 段距 / 字距</em></header>
          ${typographyPanelRows(data, typography)}
        </section>
        <section class="fd-reader-full-setting-block fd-reader-full-page-space fd-reader-typography-control">
          <header><strong>页面空间</strong><em>上下 / 左右边距</em></header>
          ${readerPageSpaceRows(data, pageSpace)}
        </section>
        <section class="fd-reader-full-setting-block fd-reader-typography-control">
          <header><strong>首行缩进</strong><em>${esc(pageSpace.paragraphIndent)}em</em></header>
          <div class="fd-reader-full-choice-grid">
            ${readerChoiceButtons([0, 0.5, 1, 1.5, 2, 2.5, 3].map(String), String(pageSpace.paragraphIndent), (value) => `data-reader-page-space-set="paragraphIndent" data-reader-page-space-value="${esc(value)}"`)}
          </div>
        </section>
        <section class="fd-reader-full-setting-block fd-reader-typography-control">
          <header><strong>对齐方式</strong><em>${esc(alignOptions.find((item) => item.value === currentAlign)?.label || "左对齐")}</em></header>
          <div class="fd-reader-full-choice-grid">
            ${alignOptions.map((item) => `<button class="${currentAlign === item.value ? "is-active" : ""}" type="button" data-w4-typography-align="${esc(item.value)}">${esc(item.label)}</button>`).join("")}
          </div>
        </section>
        <section class="fd-reader-full-setting-block fd-reader-typography-control">
          <header><strong>字体</strong><em>${esc(typography.fontFamily)}</em></header>
          <div class="fd-reader-full-choice-grid fd-reader-full-font-grid">
            ${fontOptions.map((item) => `
              <button class="${typography.fontFamily === item.value ? "is-active" : ""}" type="button" data-reader-typography-set="fontFamily" data-reader-typography-value="${esc(item.value)}" style="${item.fontStack ? `font-family:${esc(item.fontStack)}` : ""}">${esc(item.label)}</button>
            `).join("")}
          </div>
          <div class="fd-reader-full-choice-grid">
            <button type="button" data-route="reader-full-font">前往字体管理</button>
          </div>
        </section>
        <section class="fd-reader-full-setting-block">
          <header><strong>页面纹理</strong><em>${esc(pageSpace.texture)}</em></header>
          <div class="fd-reader-full-choice-grid">
            ${readerChoiceButtons(textureOptions.map((item) => item.value), pageSpace.texture, (value) => `data-reader-page-space-set="texture" data-reader-page-space-value="${esc(value)}"`)}
          </div>
        </section>
        <section class="fd-reader-full-setting-block fd-reader-typography-control">
          <header><strong>翻页方式</strong><em>${esc(pageTurnModes.find((item) => item.value === currentPageMode)?.label || "覆盖")}</em></header>
          <div class="fd-reader-full-choice-grid">
            ${pageTurnModes.map((item) => `<button class="${currentPageMode === item.value ? "is-active" : ""}" type="button" data-w4-page-turn-mode="${esc(item.value)}">${esc(item.label)}</button>`).join("")}
          </div>
        </section>
        <section class="fd-reader-full-setting-block fd-reader-persist-section">
          <header><strong>恢复默认与持久化</strong><em>localStorage 模拟</em></header>
          <div class="fd-reader-persist-actions">
            <button class="fd-reader-persist-restart" type="button" data-route="reader-typography-reset-confirm">恢复默认排版</button>
            <button class="fd-reader-persist-restart" type="button" data-w4-save>${icon("save", "fd-small-icon")}<span>保存到 localStorage</span></button>
            <button class="fd-reader-persist-restart" type="button" data-w4-restart>${icon("refresh", "fd-small-icon")}<span>模拟重启（恢复）</span></button>
            <button class="fd-reader-persist-restart" type="button" data-w4-clear>${icon("trash", "fd-small-icon")}<span>清除持久化</span></button>
          </div>
          ${appState?.settingsToast ? `<p class="fd-reader-import-status" aria-live="polite">${esc(appState.settingsToast)}</p>` : ""}
        </section>
      </section>`;
  }

  function readerFullPageTurnPage(data, appState) {
    const settings = appState.readerSettings || {};
    const settingConfig = readerControlSettingsConfig(data);
    const defaults = settingConfig.defaults;
    const options = settingConfig.options;
    const current = (key) => settings[key] || defaults[key] || (options[key] || [])[0] || "";
    const toggles = [
      ["volumePage", "音量键翻页", "volume"],
      ["landscapeLock", "横屏锁定", "permission"],
      ["keepScreenOn", "屏幕常亮", "sun"],
      ["hapticFeedback", "触摸反馈", "gesture"]
    ];
    return `
      <section class="fd-reader-full-section fd-reader-full-page-turn" aria-label="翻页完整设置">
        ${["pageMode", "tapMode", "pageAnimation"].map((key) => `
          <section class="fd-reader-full-setting-block">
            <header><strong>${esc(key === "pageMode" ? "翻页模式" : key === "tapMode" ? "点击翻页方式" : "翻页动画")}</strong><em>${esc(current(key))}</em></header>
            <div class="fd-reader-full-choice-grid">
              ${readerChoiceButtons(options[key] || [], current(key), (value) => `data-reader-setting-option="${esc(key)}" data-reader-setting-value="${esc(value)}"`)}
            </div>
          </section>
        `).join("")}
        <section class="fd-reader-full-setting-block">
          <header><strong>翻页行为</strong><em>开关项</em></header>
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

  function readerFullPageBody(type, data, appState, route) {
    if (type === "directory") return readerFullDirectoryPage(data, appState);
    if (type === "tts") return readerFullTtsPage(data, appState);
    if (type === "appearance") {
      if (route === "reader-full-theme-edit") return readerFullThemeEditPage(data, appState);
      if (route === "reader-full-font") return readerFullFontPage(data, appState);
      if (route === "reader-full-theme") return readerFullThemePage(data, appState);
      if (route === "reader-full-layout") return readerFullLayoutPage(data, appState);
      if (route === "reader-font-import-confirm") return readerFontImportConfirmScreen(data, appState);
      if (route === "reader-font-delete-confirm") return readerFontDeleteConfirmScreen(data, appState);
      if (route === "reader-font-fallback") return readerFontFallbackScreen(data, appState);
      if (route === "reader-theme-new") return readerThemeNewScreen(data, appState);
      if (route === "reader-theme-delete-confirm") return readerThemeDeleteConfirmScreen(data, appState);
      if (route === "reader-typography-reset-confirm") return readerTypographyResetConfirmScreen(data, appState);
      return readerFullAppearancePage(data, appState);
    }
    if (route === "reader-full-page-turn") return readerFullPageTurnPage(data, appState);
    return readerFullSettingsPage(data, appState);
  }

  function readerFullPagePanel(data, type, appState, route) {
    const module = (data.reader.modules || []).find((item) => item.type === type) || { label: "阅读设置", type: "settings", icon: "settings" };
    const stage = readerControlStageForRoute(route);
    const collapseRoute = readerControlCollapseRoute(type, route, appState);
    const promotedRoute = stage === "expanded" ? readerPromotedRoutes[type] || "" : "";
    const headTitle = {
      "reader-full-directory": "目录与书签",
      "reader-full-tts": "朗读",
      "reader-full-appearance": "界面",
      "reader-full-settings": "阅读总控",
      "reader-full-font": "字体库",
      "reader-full-theme": "主题与背景",
      "reader-full-theme-edit": "自定义主题",
      "reader-full-layout": "精细排版",
      "reader-full-page-turn": "翻页设置"
    }[route] || module.label;
    const collapseLabel = stage === "workspace" ? "返回半屏" : "收起";
    const workspaceSession = stage === "workspace" ? readerImmersiveStatusCapsule(appState, { controlLayer: true }) : "";
    return `
      <section class="fd-reader-full-page-panel fd-reader-control-stage-${esc(stage)} fd-reader-full-page-${esc(type)}${route ? ` fd-reader-full-page-route-${esc(route)}` : ""}" data-control-layer="L3" data-dev-region="ReaderExpandedPanel" data-reader-control-stage="${esc(stage)}" aria-label="${esc(headTitle)}${stage === "workspace" ? "完整控制页" : "大半屏控制窗"}">
        <button class="fd-reader-full-grabber" type="button" data-route="${esc(collapseRoute)}" data-route-replace data-reader-stage-origin="${esc(route)}"${promotedRoute ? ` data-reader-handle-expand-route="${esc(promotedRoute)}"` : ""} aria-label="${promotedRoute ? "下拉收起，上拉进入完整工作区" : collapseLabel}"></button>
        <header class="fd-reader-full-head${workspaceSession ? " has-session" : ""}">
          <span>${icon(module.icon || module.type, "fd-small-icon")}<strong>${esc(headTitle)}</strong></span>
          ${workspaceSession ? `<div class="fd-reader-workspace-session-slot" data-reader-workspace-session-slot>${workspaceSession}</div>` : ""}
          <em class="fd-reader-stage-label">${stage === "workspace" ? "完整页" : "半屏"}</em>
          <button type="button" data-route="${esc(collapseRoute)}" data-route-replace>${esc(collapseLabel)}</button>
        </header>
        <div class="fd-reader-full-content">
          ${readerFullPageBody(type, data, appState, route)}
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
    const cachePercent = chapters.length ? Math.round((cachedCount / chapters.length) * 100) : 0;
    const cacheSize = 128;
    const cacheLimit = 200;
    const nearLimit = cacheSize >= cacheLimit * 0.9;
    const cacheRows = chapters.slice(Math.max(0, current.index - 2), Math.min(chapters.length, current.index + 6));
    return readerUtilityPanel("书籍缓存", "storage", "book-cache", `
      <section class="fd-reader-full-section fd-reader-cache-page" aria-label="书籍缓存管理">
        <section class="fd-reader-utility-summary">
          <article><strong>${esc(`${cachedCount}/${chapters.length}`)}</strong><small>已缓存章节</small></article>
          <article><strong>${esc(cachePercent)}%</strong><small>缓存进度</small></article>
          <article><strong>${esc(cacheSize)} MB${nearLimit ? " · 接近上限" : ""}</strong><small>当前书籍缓存${nearLimit ? `（上限 ${esc(cacheLimit)} MB）` : ""}</small></article>
          <article><strong>${appState?.readerSettings?.cacheNext ? "已开启" : "未开启"}</strong><small>自动缓存后续章节</small></article>
        </section>
        ${nearLimit ? `<p class="fd-reader-cache-warning" role="alert">缓存已接近上限（${esc(cacheLimit)} MB），建议清理后再继续缓存。</p>` : ""}
        <section class="fd-reader-utility-block">
          <header><strong>缓存动作</strong><small>只作用于当前书籍</small></header>
          <div class="fd-reader-utility-action-grid">
            <button type="button">${icon("download", "fd-small-icon")}<span><strong>缓存当前章节</strong><small>${esc(current.chapter.title || readerChapterMeta(data))}</small></span></button>
            <button type="button">${icon("refresh", "fd-small-icon")}<span><strong>缓存后续章节</strong><small>从当前章节继续 20 章</small></span></button>
            <button type="button">${icon("directory", "fd-small-icon")}<span><strong>更新缓存目录</strong><small>刷新章节列表和缓存标记</small></span></button>
            <button class="is-danger" type="button" data-reader-cache-cleanup-confirm>${icon("trash", "fd-small-icon")}<span><strong>清理本书缓存</strong><small>需二次确认 · 保留阅读进度和书签</small></span></button>
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
    const requestDetails = [
      ["书源请求", "GET /chapter/32 · 128ms · 200 OK"],
      ["正文解析", "UTF-8 · 12.4 KB · 纯文本"],
      ["分页测量", "容器 414×640 · 切分 5 页"],
      ["缓存写入", "已写入第 32 章 · 12.4 KB"]
    ];
    return readerUtilityPanel("调试信息", "bug", "debug-info", `
      <section class="fd-reader-full-section fd-reader-debug-page" aria-label="阅读调试信息">
        <section class="fd-reader-utility-summary">
          <article><strong>${esc(page.index + 1)}/${esc(page.count)}</strong><small>当前页</small></article>
          <article><strong>${esc(chapter.index + 1)}/${esc(chapter.count)}</strong><small>当前章节</small></article>
          <article><strong>0</strong><small>当前错误</small></article>
          <article class="fd-reader-debug-refresh" data-reader-debug-refresh aria-live="polite"><strong>实时</strong><small>每 5 秒刷新</small></article>
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
        <section class="fd-reader-utility-block fd-reader-debug-request" data-reader-debug-request>
          <header>
            <button class="fd-reader-debug-request-toggle" type="button" data-reader-debug-request-toggle aria-expanded="${appState?.readerDebugRequestOpen ? "true" : "false"}" aria-controls="fd-reader-debug-request-detail">
              <strong>请求详情</strong><small>展开查看书源请求与解析细节</small>${chevron()}
            </button>
          </header>
          <div class="fd-reader-debug-request-detail" id="fd-reader-debug-request-detail" data-reader-debug-request-detail${appState?.readerDebugRequestOpen ? "" : " hidden"}>
            ${requestDetails.map(([label, value]) => `<article><small>${esc(label)}</small><strong>${esc(value)}</strong></article>`).join("")}
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
      <aside class="fd-brightness-rail" data-control-layer="L1" aria-label="亮度控制" data-dev-region="BrightnessRail" style="--brightness:${esc(value)}%">
        ${icon("sun", "fd-small-icon")}
        <i data-reader-brightness-track role="slider" aria-label="调整亮度" aria-orientation="vertical" aria-valuemin="${esc(brightnessConfig.min)}" aria-valuemax="${esc(brightnessConfig.max)}" aria-valuenow="${esc(value)}" tabindex="0"><b></b></i>
        <button class="fd-brightness-auto-toggle${isAuto ? " is-active" : ""}" type="button" data-reader-brightness-auto aria-pressed="${isAuto ? "true" : "false"}" aria-label="${esc(brightness.autoText || "自动亮度")}">${esc(brightness.autoLabel || "A")}</button>
      </aside>`;
  }

  function readerSessionControlSpaceHtml(appState) {
    const snapshot = readerSessionCapsuleSnapshot(appState);
    if (!snapshot) return "";
    return `
        <section class="fd-reader-control-session-host" data-control-layer="L0" data-reader-control-session-host aria-label="运行会话胶囊">
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
      <div class="fd-reader-control-main" data-control-layer="L1" data-dev-region="BottomControlPanel">
        <nav class="fd-reader-actions" aria-label="快捷操作">
          ${data.reader.quickActions.map((item) => `
            <button type="button" data-route="${esc(item.type === "search" ? "content-search" : item.type === "auto-page" ? "auto-page" : "content-replacement")}" data-quick-action="${esc(item.type)}">${icon(readerQuickActionIconMap[item.type] || item.type, "fd-medium-icon")}<span>${esc(item.label)}</span></button>
          `).join("")}
        </nav>
        <section class="fd-reader-chapter-panel fd-reader-chapter-transition" aria-label="书籍进度">
          <div class="fd-reader-chapter-row fd-reader-chapter-control-row">
            <button class="fd-reader-chapter-step${chapterState.index === 0 ? " is-disabled" : ""}" type="button" data-reader-chapter-action="prev" aria-label="${esc(chapter.previousLabel || "上一章")}" aria-disabled="${chapterState.index === 0 ? "true" : "false"}">${icon("chevron-left", "fd-small-icon")}<span class="fd-sr-only">${esc(chapter.previousLabel || "上一章")}</span></button>
            <span class="fd-reader-chapter-main">
              <strong data-reader-current-chapter>${esc(chapterTitle)}</strong>
            </span>
            <button class="fd-reader-chapter-step${chapterState.index >= chapterState.count - 1 ? " is-disabled" : ""}" type="button" data-reader-chapter-action="next" aria-label="${esc(chapter.nextLabel || "下一章")}" aria-disabled="${chapterState.index >= chapterState.count - 1 ? "true" : "false"}">${icon("chevron", "fd-small-icon")}<span class="fd-sr-only">${esc(chapter.nextLabel || "下一章")}</span></button>
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
      <button class="fd-reader-grabber" type="button" data-route="${esc(expandedRoute)}" data-route-replace data-reader-stage-origin="${esc(state.route || route)}" aria-label="展开到大半屏控制层"></button>
      ${bodyHtml}
      ${state.mode === "control" ? readerBrightnessRail(data, appState) : ""}`;
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
    const stage = readerControlStageForRoute(route);
    const pageModeClass = appState?.readerPageMode === "vertical" ? " fd-reader-page-mode-vertical" : " fd-reader-page-mode-horizontal";
    return shellKit().renderReaderShell({
      frameClass: `fd-reader-frame fd-reader-flow-frame fd-reader-mode-full fd-reader-mode-full-${esc(type)} fd-reader-stage-${esc(stage)}${pageModeClass}${appState?.readerSettings?.hideStatusBar ? " fd-reader-status-hidden" : " fd-reader-status-visible"}`,
      frameStyle: readerThemeStyle(data, appState),
      readingSurfaceClass: "fd-reading-surface",
      overlayClass: "fd-reader-overlay fd-reader-full-overlay",
      bottomSheetHostClass: "fd-reader-full-host",
      moduleNavClass: "fd-reader-module-nav fd-reader-module-nav-empty",
      stateHostClass: "fd-reader-state-host",
      stateHostHtml: `<div class="fd-reader-global-brightness-dim" data-reader-brightness-dim aria-hidden="true" style="${readerBrightnessStyle(data, appState)}"></div>`,
      ariaLabel: (routes[route] || routes["reader-full-settings"]).title,
      readingSurfaceHtml: sharedReaderSurface(data, "", appState),
      overlayHtml: `${readerTopOverlay(data, appState)}${stage === "workspace" ? "" : readerSessionControlSpaceHtml(appState)}`,
      bottomSheetHtml: readerFullPagePanel(data, type, appState, route),
      moduleNavHtml: ""
    });
  }

  function readerStateVariantShell(data, route, appState, options) {
    const pageModeClass = appState?.readerPageMode === "vertical" ? " fd-reader-page-mode-vertical" : " fd-reader-page-mode-horizontal";
    return shellKit().renderReaderShell({
      frameClass: `fd-reader-frame fd-reader-flow-frame fd-reader-mode-state ${options.frameModifier || ""}${pageModeClass}${appState?.readerSettings?.hideStatusBar ? " fd-reader-status-hidden" : " fd-reader-status-visible"}`,
      frameStyle: readerThemeStyle(data, appState),
      readingSurfaceClass: "fd-reading-surface",
      overlayClass: "fd-reader-overlay fd-reader-state-overlay",
      bottomSheetHostClass: "fd-reader-sheet fd-reader-state-sheet",
      moduleNavClass: "fd-reader-module-nav fd-reader-module-nav-empty",
      stateHostClass: "fd-reader-state-host",
      stateHostHtml: `<div class="fd-reader-global-brightness-dim" data-reader-brightness-dim aria-hidden="true" style="${readerBrightnessStyle(data, appState)}"></div>`,
      ariaLabel: (routes[route] || routes.reader).title,
      readingSurfaceHtml: options.surfaceHtml || sharedReaderSurface(data, "", appState),
      overlayHtml: options.overlayHtml || readerTopOverlay(data, appState),
      bottomSheetHtml: options.sheetHtml,
      moduleNavHtml: ""
    });
  }

  function readerStateSkeletonBars(variant) {
    const rows = variant === "toc" ? 6 : 5;
    return Array.from({ length: rows }, (_, i) => `<i class="fd-reader-loading-skeleton-bar${i === rows - 1 ? " is-short" : ""}"></i>`).join("");
  }

  function readerStateRetryBanner(kind, title, message, retryRoute) {
    const tone = kind === "offline" ? "is-offline" : kind === "error" ? "is-error" : "is-info";
    return `
      <section class="fd-reader-state-panel fd-reader-state-banner ${tone}" data-reader-state-banner="${esc(kind)}" aria-live="assertive" aria-label="${esc(title)}">
        <header><strong>${esc(title)}</strong></header>
        <p>${esc(message)}</p>
        <div class="fd-reader-state-banner-actions">
          <button class="fd-reader-state-retry" type="button" data-route="${esc(retryRoute)}" data-reader-state-retry="${esc(kind)}">重试</button>
          <button class="fd-reader-state-secondary" type="button" data-route="reader">返回控制层</button>
        </div>
      </section>`;
  }

  function readerTocLoadingScreen(data, route, appState) {
    return readerStateVariantShell(data, route, appState, {
      frameModifier: "fd-reader-variant-toc-loading",
      sheetHtml: `
        <section class="fd-reader-state-panel fd-reader-loading-skeleton" data-reader-state="toc-loading" aria-live="polite" aria-label="目录加载中">
          <header><strong>正在加载目录</strong><small>从书源拉取章节列表</small></header>
          <div class="fd-reader-loading-skeleton-list">${readerStateSkeletonBars("toc")}</div>
        </section>`
    });
  }

  function readerTocOfflineScreen(data, route, appState) {
    return readerStateVariantShell(data, route, appState, {
      frameModifier: "fd-reader-variant-toc-offline",
      sheetHtml: readerStateRetryBanner("offline", "目录加载失败", "当前网络不可用，请检查连接后重试。", "toc-bookmarks")
    });
  }

  function readerTocErrorScreen(data, route, appState) {
    return readerStateVariantShell(data, route, appState, {
      frameModifier: "fd-reader-variant-toc-error",
      sheetHtml: readerStateRetryBanner("error", "目录解析错误", "书源返回的章节列表无法解析，可重试或更换书源。", "toc-bookmarks")
    });
  }

  function readerContentLoadingScreen(data, route, appState) {
    return readerStateVariantShell(data, route, appState, {
      frameModifier: "fd-reader-variant-content-loading",
      surfaceHtml: `<section class="fd-reader-content-skeleton" aria-hidden="true">${readerStateSkeletonBars("content")}</section>`,
      sheetHtml: `
        <section class="fd-reader-state-panel fd-reader-loading-skeleton" data-reader-state="content-loading" aria-live="polite" aria-label="正文加载中">
          <header><strong>正在加载正文</strong><small>保持当前章节上下文</small></header>
          <div class="fd-reader-loading-skeleton-list">${readerStateSkeletonBars("content")}</div>
        </section>`
    });
  }

  function readerContentOfflineScreen(data, route, appState) {
    return readerStateVariantShell(data, route, appState, {
      frameModifier: "fd-reader-variant-content-offline",
      sheetHtml: readerStateRetryBanner("offline", "正文加载失败", "当前网络不可用，无法拉取本章正文。", "immersive-reading")
    });
  }

  function readerContentErrorScreen(data, route, appState) {
    return readerStateVariantShell(data, route, appState, {
      frameModifier: "fd-reader-variant-content-error",
      sheetHtml: readerStateRetryBanner("error", "正文解析错误", "本章正文解析失败，可能是编码或来源异常。", "immersive-reading")
    });
  }

  function readerPageBoundaryFirstScreen(data, route, appState) {
    return readerStateVariantShell(data, route, appState, {
      frameModifier: "fd-reader-variant-boundary-first",
      sheetHtml: `
        <section class="fd-reader-state-panel fd-reader-boundary-toast" data-reader-state="page-boundary-first" aria-live="polite" aria-label="章节边界提示">
          <strong>已是第一章</strong>
          <small>没有更早的章节了</small>
          <div class="fd-reader-state-banner-actions">
            <button class="fd-reader-state-retry" type="button" data-route="reader">返回控制层</button>
            <button class="fd-reader-state-secondary" type="button" data-route="immersive-reading">继续阅读</button>
          </div>
        </section>`
    });
  }

  function readerPageBoundaryLastScreen(data, route, appState) {
    return readerStateVariantShell(data, route, appState, {
      frameModifier: "fd-reader-variant-boundary-last",
      sheetHtml: `
        <section class="fd-reader-state-panel fd-reader-boundary-toast" data-reader-state="page-boundary-last" aria-live="polite" aria-label="章节边界提示">
          <strong>已是最后一章</strong>
          <small>没有更多章节了</small>
          <div class="fd-reader-state-banner-actions">
            <button class="fd-reader-state-retry" type="button" data-route="reader">返回控制层</button>
            <button class="fd-reader-state-secondary" type="button" data-route="immersive-reading">回到首页</button>
          </div>
        </section>`
    });
  }

  function readerProgressRestoreScreen(data, route, appState) {
    const chapterState = currentReaderChapter(data, appState);
    const chapterTitle = chapterState.chapter.title || readerChapterMeta(data);
    return readerStateVariantShell(data, route, appState, {
      frameModifier: "fd-reader-variant-progress-restore",
      sheetHtml: `
        <section class="fd-reader-state-panel fd-reader-restore-panel" data-reader-state="progress-restore" aria-live="polite" aria-label="阅读进度恢复">
          <header><strong>正在恢复阅读进度</strong><small>上次阅读到 ${esc(chapterTitle)} · 第 ${esc(chapterState.index + 1)}/${esc(chapterState.count)} 章</small></header>
          <div class="fd-reader-state-banner-actions">
            <button class="fd-reader-state-retry" type="button" data-route="immersive-reading" data-reader-restore-action="continue">继续阅读</button>
            <button class="fd-reader-state-secondary" type="button" data-route="reader">从控制层开始</button>
          </div>
        </section>`
    });
  }

  function readerBackgroundRestoreScreen(data, route, appState) {
    return readerStateVariantShell(data, route, appState, {
      frameModifier: "fd-reader-variant-background-restore",
      sheetHtml: `
        <section class="fd-reader-state-panel fd-reader-restore-panel" data-reader-state="background-restore" aria-live="polite" aria-label="后台恢复">
          <header><strong>从后台返回</strong><small>正在重载当前章节正文与进度</small></header>
          <div class="fd-reader-state-banner-actions">
            <button class="fd-reader-state-retry" type="button" data-route="immersive-reading" data-reader-restore-action="reload">立即重载</button>
            <button class="fd-reader-state-secondary" type="button" data-route="reader">返回控制层</button>
          </div>
        </section>`
    });
  }

  function readerImmersiveActionLayer(data, appState) {
    const entrySource = appState?.readerEntrySource || "bookshelf";
    const bookmarked = Boolean(appState?.readerBookmarked);
    return `
      <section class="fd-reader-immersive-actions" data-reader-entry-source="${esc(entrySource)}" aria-label="沉浸阅读快捷操作">
        <button class="fd-reader-bookmark-toggle${bookmarked ? " is-active" : ""}" type="button" data-reader-toggle-bookmark aria-pressed="${bookmarked ? "true" : "false"}" aria-label="${bookmarked ? "移除书签" : "添加书签"}">${icon("bookmark", "fd-small-icon")}</button>
        <button class="fd-reader-text-select-trigger" type="button" data-reader-text-select aria-label="选中文本工具栏">${icon("edit", "fd-small-icon")}</button>
      </section>`;
  }

  function readerStateScreen(data, route, options, appState) {
    const baseState = readerRouteState(route);
    const isLoading = Boolean(options && options.loading);
    const state = isLoading ? Object.assign({}, baseState, { mode: "loading" }) : baseState;
    const isImmersive = baseState.mode === "immersive" && !isLoading;
    const activeModule = baseState.mode === "module" ? baseState.module : "";
    const frameMode = isImmersive ? "immersive" : state.mode;
    const pageModeClass = appState?.readerPageMode === "vertical" ? " fd-reader-page-mode-vertical" : " fd-reader-page-mode-horizontal";
    return shellKit().renderReaderShell({
      frameClass: `fd-reader-frame fd-reader-flow-frame fd-reader-mode-${esc(frameMode)}${isImmersive ? " fd-immersive-frame" : ""}${pageModeClass}${appState?.readerSettings?.hideStatusBar ? " fd-reader-status-hidden" : " fd-reader-status-visible"}`,
      frameStyle: readerThemeStyle(data, appState),
      readingSurfaceClass: "fd-reading-surface",
      overlayClass: `fd-reader-overlay${isImmersive ? " fd-immersive-overlay" : ""}`,
      bottomSheetHostClass: isImmersive ? "fd-reader-sheet fd-reader-sheet-empty" : "fd-reader-sheet",
      moduleNavClass: isImmersive ? "fd-reader-module-nav fd-reader-module-nav-empty" : "fd-reader-module-nav",
      stateHostClass: "fd-reader-state-host",
      stateHostHtml: `<div class="fd-reader-global-brightness-dim" data-reader-brightness-dim aria-hidden="true" style="${readerBrightnessStyle(data, appState)}"></div>`,
      ariaLabel: (routes[route] || routes.reader).title,
      readingSurfaceHtml: sharedReaderSurface(data, isImmersive ? "" : "immersive-reading", appState),
      overlayHtml: isImmersive ? `${readerInfoOverlay(data, appState)}${readerImmersiveActionLayer(data, appState)}${readerTextSelectionLayer(appState)}${readerTapZones(data, appState)}` : `${readerTopOverlay(data, appState)}${readerSessionControlSpaceHtml(appState)}`,
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
    // 竖向翻页模式：连续滚动渲染，不需要分页测量
    if (appState.readerPageMode === "vertical") {
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
      readerTypographyStyle(data, typography, appState),
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
              { type: "segment", icon: "palette", title: "App主题", value: "跟随系统", options: ["跟随系统", "浅色", "深色"], meta: "切换后立即生效" },
              { type: "select", icon: "globe", title: "语言", value: "简体中文", options: ["简体中文", "繁體中文", "English"], meta: "重启后完全生效" },
              { type: "select", icon: "home", title: "启动时打开", value: "书架", options: ["书架", "发现", "RSS", "设置"] }
            ]
          },
          {
            title: "行为与反馈",
            rows: [
              { type: "switch", icon: "refresh", title: "自动检查更新", enabled: true },
              { type: "switch", icon: "top", title: "点击当前底栏回顶部", enabled: true },
              { type: "switch", icon: "motion", title: "减少动态效果", enabled: true, meta: "关闭动画立即生效" },
              { type: "switch", icon: "bug", title: "崩溃日志", enabled: true, status: "已开启", statusTone: "good" },
              { type: "select", icon: "play", title: "动画效果", value: "标准", options: ["减少", "标准", "增强"] },
              { type: "cache-cleanup", icon: "trash", title: "缓存清理", actionLabel: "清理缓存", overlay: "dialog:cache-clear", status: "1.28 GB", statusTone: "warn" }
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
        confirm: { title: "恢复通用设置？", copy: "恢复后将重置 App 主题、语言、启动页面和行为偏好。此操作可撤销，恢复前会自动保存当前设置快照。", confirmLabel: "确认恢复" },
        confirms: {
          "cache-clear": { title: "清理缓存？", copy: "将清除封面、章节和临时文件缓存，不会删除书籍与阅读进度。清理过程中会显示进度，完成后展示释放空间统计。", confirmLabel: "确认清理", resultToast: "已清理 1.28 GB 缓存 · 封面 0.6GB · 章节 0.5GB · 临时 0.18GB" },
          "file-access-permission": { title: "打开文件访问设置？", copy: "将跳转到系统设置中的文件访问权限（MANAGE_EXTERNAL_STORAGE），用于管理本地文件和媒体访问。授权后返回应用会自动检测权限状态。", confirmLabel: "去设置" },
          "notification-permission": { title: "打开通知权限设置？", copy: "将跳转到系统设置中的通知权限，用于开启或关闭阅读提醒、更新通知和下载完成通知。", confirmLabel: "去设置" },
          "battery-permission": { title: "打开电池优化设置？", copy: "将跳转到系统设置中的电池优化页面，建议设为不受限以保证后台下载和自动刷新正常工作。", confirmLabel: "去设置" }
        }
      },
      "global-settings": {
        title: "全局设置",
        sections: [
          {
            title: "全局外观",
            rows: [
              { type: "segment", icon: "palette", title: "全局主题", value: "跟随系统", options: ["跟随系统", "浅色", "深色"], meta: "影响书架、发现、RSS 和阅读器" },
              { type: "select", icon: "font", title: "全局字体", value: "系统默认", options: ["系统默认", "思源宋体", "霞鹜文楷", "方正书宋"] },
              { type: "stepper", icon: "text", title: "全局字号", value: "16pt", minLabel: "-", maxLabel: "+" },
              { type: "switch", icon: "contrast", title: "全局夜间模式跟随系统", enabled: true }
            ]
          },
          {
            title: "全局网络",
            rows: [
              { type: "switch", icon: "shield", title: "全局网络代理", enabled: false, meta: "开启后所有请求走配置代理" },
              { type: "input", inputType: "url", icon: "link", title: "代理地址", value: "http://127.0.0.1:7890", placeholder: "http://host:port" },
              { type: "switch", icon: "wifi", title: "仅 Wi-Fi 下加载封面", enabled: true },
              { type: "switch", icon: "download", title: "仅 Wi-Fi 下下载章节", enabled: true },
              { type: "select", icon: "globe", title: "并发请求数", value: "8", options: ["4", "8", "16", "32"] }
            ]
          },
          {
            title: "全局存储",
            rows: [
              { type: "link", icon: "folder", title: "数据存储位置", value: "内部存储", status: "1.2 GB", statusTone: "info" },
              { type: "stepper", icon: "cache", title: "章节缓存上限", value: "500MB", minLabel: "-", maxLabel: "+" },
              { type: "switch", icon: "trash", title: "退出时自动清理临时文件", enabled: true }
            ]
          }
        ],
        actions: [{ tone: "danger", icon: "refresh", title: "恢复全局默认", overlay: "dialog" }],
        confirm: { title: "恢复全局设置？", copy: "恢复后将重置全局主题、字体、网络代理和存储策略。阅读器内的独立排版设置不受影响。", confirmLabel: "确认恢复" }
      },
      "reading-settings-entry": {
        title: "阅读设置",
        sections: [
          {
            title: "当前阅读外观",
            layout: "reading-overview",
            rows: [
              { type: "link", icon: "palette", title: "当前主题", value: "纸张浅色", actionLabel: "更换", route: "reader-settings" },
              { type: "link", icon: "font", title: "字号", value: "18pt", actionLabel: "调整", route: "reader-settings" },
              { type: "link", icon: "line-height", title: "行距", value: "1.6", actionLabel: "调整", route: "reader-settings" },
              { type: "link", icon: "page-flip", title: "翻页方式", value: "覆盖动画", actionLabel: "更换", route: "reader-settings" },
              { type: "link", icon: "margin", title: "页边距", value: "标准", actionLabel: "调整", route: "reader-settings" }
            ]
          },
          {
            title: "排版与字体",
            rows: [
              { type: "link", icon: "text", title: "阅读排版", route: "reader-settings", meta: "段距、缩进、对齐" },
              { type: "link", icon: "font", title: "字体管理", route: "reader-settings", meta: "导入、回退、自定义" },
              { type: "link", icon: "palette", title: "主题管理", route: "reader-settings", meta: "预设、自定义、导入" }
            ]
          },
          {
            title: "阅读行为",
            rows: [
              { type: "switch", icon: "brightness", title: "屏幕亮度自动调节", enabled: false },
              { type: "switch", icon: "shield", title: "保持屏幕亮屏", enabled: true },
              { type: "switch", icon: "fullscreen", title: "全屏阅读", enabled: true },
              { type: "switch", icon: "volume", title: "音量键翻页", enabled: false },
              { type: "select", icon: "clock", title: "自动翻页速度", value: "8秒", options: ["5秒", "8秒", "12秒", "20秒"] }
            ]
          }
        ],
        actions: [{ icon: "refresh", title: "恢复阅读默认", overlay: "dialog" }],
        confirm: { title: "恢复阅读设置？", copy: "恢复后将重置主题、字号、行距、翻页方式和阅读行为偏好。已导入的自定义字体和主题不会被删除。", confirmLabel: "确认恢复" }
      },
      "bookshelf-search-settings": {
        title: "书架与搜索",
        sections: [
          {
            title: "书架",
            rows: [
              { type: "segment", icon: "grid", title: "默认展示", value: "封面", options: ["封面", "列表"], meta: "切换后书架立即刷新" },
              { type: "stepper", icon: "columns", title: "封面列数", value: "3列", minLabel: "-", maxLabel: "+", meta: "影响封面模式列数自适应" },
              { type: "select", icon: "folder", title: "默认分组", value: "全部", options: ["全部", "长篇追读", "资料", "未分组"] },
              { type: "switch", icon: "badge", title: "显示更新标记", enabled: true, meta: "有更新的书籍显示红点" },
              { type: "switch", icon: "clock", title: "显示最近阅读时间", enabled: true }
            ]
          },
          {
            title: "排序与筛选",
            rows: [
              { type: "select", icon: "sort", title: "书架排序", value: "最近更新", options: ["最近更新", "最近阅读", "书名", "作者"] },
              { type: "select", icon: "list", title: "展示范围", value: "全部", options: ["全部", "追更", "本地书", "未读", "已完结", "更新失败"] },
              { type: "select", icon: "refresh", title: "更新状态", value: "不限", options: ["不限", "有更新", "更新失败"] },
              { type: "switch", icon: "download", title: "区分本地书与网络书", enabled: true, meta: "显示来源图标和缓存标记" }
            ]
          },
          {
            title: "搜索",
            rows: [
              { type: "select", icon: "search", title: "搜索范围", value: "全局", options: ["当前分组", "书架", "全局"] },
              { type: "select", icon: "sort", title: "结果排序", value: "相关度", options: ["相关度", "最近阅读", "最近更新"] },
              { type: "switch", icon: "people", title: "合并同名同作者", enabled: true },
              { type: "switch", icon: "clock", title: "搜索历史", enabled: true },
              { type: "select", icon: "list", title: "搜索历史数量", value: "20条", options: ["10条", "20条", "50条"] },
              { type: "link", icon: "trash", title: "管理搜索历史", value: "20 条", actionLabel: "清空", overlay: "dialog:history-clear" }
            ]
          }
        ],
        actions: [{ tone: "danger", icon: "trash", title: "清空搜索历史", overlay: "dialog" }],
        confirm: { title: "清空搜索历史？", copy: "清空后无法恢复，已保存的搜索关键词会被移除。书架书籍和阅读进度不受影响。", confirmLabel: "确认清空" },
        confirms: {
          "history-clear": { title: "清空搜索历史？", copy: "将移除全部 20 条搜索关键词记录，不影响书架数据。此操作不可撤销。", confirmLabel: "确认清空", resultToast: "已清空 20 条搜索历史" }
        }
      },
      "about-feedback": {
        title: "关于与反馈",
        sections: [
          {
            title: "应用信息",
            rows: [
              { type: "link", icon: "info", title: "应用名称", value: "Reader" },
              { type: "link", icon: "tag", title: "版本号", value: "1.4.2", meta: "构建 20260711" },
              { type: "link", icon: "build", title: "构建信息", value: "release · arm64 · 2026-07-11" },
              { type: "link", icon: "refresh", title: "检查更新", value: "已是最新", status: "最新", statusTone: "good", actionLabel: "检查", overlay: "dialog:check-update" }
            ]
          },
          {
            title: "更新日志",
            rows: [
              { type: "link", icon: "log", title: "v1.4.2 更新日志", route: "about-version", meta: "修复阅读器翻页卡顿 · 优化书源调测" },
              { type: "link", icon: "log", title: "v1.4.1 更新日志", route: "about-version", meta: "新增 RSS 收藏分组 · 修复 WebDAV 同步" },
              { type: "link", icon: "log", title: "v1.4.0 更新日志", route: "about-version", meta: "新增发现页书源健康度 · 主题管理重构" }
            ]
          },
          {
            title: "项目与开源",
            rows: [
              { type: "link", icon: "code", title: "源码仓库", value: "github.com/minliny/Reader" },
              { type: "link", icon: "link", title: "开源许可", route: "about-version", meta: "查看完整第三方许可列表" },
              { type: "link", icon: "people", title: "参与贡献", meta: "Issue · PR · 翻译 · 书源规则" },
              { type: "link", icon: "bug", title: "已知问题", route: "about-version", meta: "查看当前版本的已知问题列表" }
            ]
          },
          {
            title: "反馈",
            rows: [
              { type: "link", icon: "mail", title: "提交反馈", actionLabel: "填写", overlay: "dialog:feedback", meta: "功能建议、Bug 报告、使用问题" },
              { type: "link", icon: "history", title: "反馈历史", value: "3 条", meta: "查看已提交的反馈和处理状态" },
              { type: "switch", icon: "bug", title: "附上崩溃日志", enabled: true, meta: "帮助定位问题的匿名诊断信息" },
              { type: "switch", icon: "shield", title: "附上设备信息", enabled: true }
            ]
          }
        ],
        confirms: {
          "check-update": { title: "检查更新？", copy: "将连接更新服务器查询最新版本。当前已是最新版本 v1.4.2。", confirmLabel: "检查", resultToast: "已是最新版本 v1.4.2" },
          "feedback": { title: "提交反馈", copy: "将打开反馈表单，可填写功能建议或 Bug 报告。提交后会附带应用版本和设备信息（可关闭）。", confirmLabel: "填写反馈" }
        }
      },
      "about": {
        title: "关于",
        sections: [
          {
            title: "应用信息",
            rows: [
              { type: "link", icon: "info", title: "应用名称", value: "Reader" },
              { type: "link", icon: "tag", title: "版本号", value: "1.4.2", meta: "构建 20260711" },
              { type: "link", icon: "build", title: "构建信息", value: "release · arm64 · 2026-07-11" },
              { type: "link", icon: "code", title: "源码仓库", value: "github.com/minliny/Reader" },
              { type: "link", icon: "shield", title: "隐私政策", meta: "查看数据收集和使用说明" },
              { type: "link", icon: "link", title: "开源许可", route: "about-version", meta: "Apache 2.0 · 第三方依赖许可" }
            ]
          },
          {
            title: "版本信息",
            rows: [
              { type: "link", icon: "refresh", title: "检查更新", value: "已是最新", status: "最新", statusTone: "good", actionLabel: "检查", overlay: "dialog:check-update" },
              { type: "link", icon: "log", title: "更新日志", route: "about-version" },
              { type: "link", icon: "bug", title: "已知问题", route: "about-version" }
            ]
          }
        ],
        confirms: {
          "check-update": { title: "检查更新？", copy: "将连接更新服务器查询最新版本。当前已是最新版本 v1.4.2。", confirmLabel: "检查", resultToast: "已是最新版本 v1.4.2" }
        }
      },
      "about-version": {
        title: "版本信息",
        sections: [
          {
            title: "当前版本",
            rows: [
              { type: "link", icon: "tag", title: "版本号", value: "1.4.2" },
              { type: "link", icon: "build", title: "构建编号", value: "20260711" },
              { type: "link", icon: "calendar", title: "发布日期", value: "2026-07-11" },
              { type: "link", icon: "refresh", title: "检查更新", value: "已是最新", status: "最新", statusTone: "good", actionLabel: "检查", overlay: "dialog:check-update" }
            ]
          },
          {
            title: "更新日志",
            layout: "changelog",
            rows: [
              { type: "link", icon: "log", title: "v1.4.2", meta: "修复阅读器翻页卡顿；优化书源调测性能；修复 RSS 收藏分组排序" },
              { type: "link", icon: "log", title: "v1.4.1", meta: "新增 RSS 收藏分组；修复 WebDAV 同步在大文件时的超时；优化封面加载" },
              { type: "link", icon: "log", title: "v1.4.0", meta: "新增发现页书源健康度；主题管理重构；新增自动翻页覆盖层" },
              { type: "link", icon: "log", title: "v1.3.8", meta: "新增 RSS 规则订阅；书源批量管理；阅读进度同步冲突处理" }
            ]
          },
          {
            title: "已知问题",
            rows: [
              { type: "link", icon: "bug", title: "WebDAV 大文件上传偶发超时", meta: "预计下版本修复" },
              { type: "link", icon: "bug", title: "部分书源正文规则需手动调测", meta: "已收录到书源规则库" }
            ]
          },
          {
            title: "开源许可",
            rows: [
              { type: "link", icon: "link", title: "Apache License 2.0", meta: "Reader 主体" },
              { type: "link", icon: "link", title: "第三方依赖许可", meta: "共 42 个开源依赖" }
            ]
          }
        ],
        confirms: {
          "check-update": { title: "检查更新？", copy: "将连接更新服务器查询最新版本。当前已是最新版本 v1.4.2。", confirmLabel: "检查", resultToast: "已是最新版本 v1.4.2" }
        }
      },
      "sync-backup": {
        title: "同步与备份",
        metrics: [
          { icon: "sync", label: "同步状态", value: "已同步" },
          { icon: "clock", label: "最近同步", value: "08:00" },
          { icon: "warning", label: "冲突", value: "0" },
          { icon: "cloud", label: "远程备份", value: "6" }
        ],
        sections: [
          {
            title: "同步状态",
            rows: [
              { type: "link", icon: "sync", title: "最近同步", value: "2026-06-23 08:00", status: "成功", statusTone: "good", route: "progress-sync-status" },
              { type: "link", icon: "refresh", title: "立即同步", actionLabel: "同步", overlay: "dialog:sync-now" },
              { type: "link", icon: "warning", title: "同步冲突", value: "0 项", route: "progress-sync-status", meta: "无未解决冲突" },
              { type: "link", icon: "history", title: "同步历史", value: "5 次", route: "progress-sync" }
            ]
          },
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
              { icon: "check", title: "保存配置", overlay: "dialog:webdav-save" },
              { icon: "folder", title: "浏览远程目录", route: "remote-webdav-books" },
              { icon: "cloud", title: "WebDAV 详情配置", route: "webdav-config" }
            ]
          },
          {
            title: "备份管理",
            rows: [
              { type: "link", icon: "backup", title: "手动备份", actionLabel: "备份", overlay: "dialog:manual-backup", meta: "立即生成本地+远程备份" },
              { type: "link", icon: "settings", title: "自动备份设置", route: "backup-settings", meta: "频率 · 范围 · 保留策略" },
              { type: "link", icon: "sync", title: "进度同步设置", route: "progress-sync", meta: "实时状态 · 冲突处理 · 同步历史" },
              { type: "link", icon: "folder", title: "本地备份管理", value: "2 份", route: "backup-settings", meta: "本机文件备份" },
              { type: "link", icon: "cloud", title: "远程备份管理", value: "4 份", route: "backup-settings", meta: "WebDAV 远程备份" }
            ]
          },
          {
            title: "恢复数据",
            layout: "backup-list",
            summary: "点击备份记录进入恢复流程。备份列表从 WebDAV 和本地备份目录实时读取。",
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
        actions: [
          { icon: "trash", title: "清理旧备份", overlay: "dialog:backup-cleanup", meta: "删除超过保留期的历史备份" },
          { tone: "danger", icon: "trash", title: "删除备份", overlay: "dialog:backup-delete" }
        ],
        confirms: {
          "webdav-test": { title: "测试网络连通性？", copy: "将使用当前服务器地址和账号发起一次连接验证。测试会显示请求耗时和目录可访问性。", confirmLabel: "开始测试", resultToast: "连接成功 · 延迟 86ms · 目录可访问" },
          "webdav-save": { title: "保存 WebDAV 配置？", copy: "保存后，远程恢复会从该 WebDAV 目录读取备份数据。密码会加密存储，不会明文保存。", confirmLabel: "保存", resultToast: "WebDAV 配置已保存" },
          "sync-now": { title: "立即同步？", copy: "将书架、阅读进度和设置同步到 WebDAV。上次同步于 08:00，无未解决冲突。", confirmLabel: "开始同步", resultToast: "同步完成 · 书架 128 本 · 进度 96 条" },
          "manual-backup": { title: "手动备份？", copy: "将生成本地备份并上传到 WebDAV。预计耗时 15-30 秒，过程中可继续使用应用。", confirmLabel: "开始备份", resultToast: "备份完成 · 12.8 MB · 已上传 WebDAV" },
          "backup-cleanup": { title: "清理旧备份？", copy: "将删除超过 30 天保留期的历史备份（共 2 份），保留最近备份和手动备份。", confirmLabel: "确认清理", resultToast: "已清理 2 份旧备份 · 释放 24.2 MB" },
          "backup-delete": { title: "删除备份？", copy: "将删除选中的备份记录。删除后不可恢复，但不会影响当前书架和阅读数据。", confirmLabel: "确认删除" }
        }
      },
      "webdav-config": {
        title: "WebDAV 配置",
        metrics: [
          { icon: "link", label: "连接状态", value: "已连接" },
          { icon: "clock", label: "延迟", value: "86ms" },
          { icon: "folder", label: "目录", value: "可访问" },
          { icon: "cloud", label: "已配置", value: "1 个" }
        ],
        sections: [
          {
            title: "连接信息",
            layout: "webdav-form",
            rows: [
              { type: "input", inputType: "url", icon: "link", title: "服务器地址", value: "https://dav.example.com/reader/backup", placeholder: "https://example.com/dav" },
              { type: "input", inputType: "text", icon: "people", title: "账号", value: "reader@example.com", placeholder: "请输入账号" },
              { type: "input", inputType: "password", icon: "shield", title: "密码", value: "reader-demo-password", placeholder: "请输入密码", meta: "密码加密存储，不会明文保存" },
              { type: "input", inputType: "text", icon: "folder", title: "同步目录", value: "/ReaderBackup/ReaderAndroid", placeholder: "/ReaderBackup" }
            ],
            actions: [
              { icon: "refresh", title: "测试网络连通性", overlay: "dialog:webdav-test" },
              { icon: "check", title: "保存配置", overlay: "dialog:webdav-save" },
              { icon: "folder", title: "浏览目录", route: "remote-webdav-books" }
            ]
          },
          {
            title: "高级选项",
            rows: [
              { type: "switch", icon: "shield", title: "证书校验", enabled: true, meta: "关闭后允许自签名证书" },
              { type: "select", icon: "clock", title: "连接超时", value: "15秒", options: ["10秒", "15秒", "30秒", "60秒"] },
              { type: "select", icon: "download", title: "上传分块大小", value: "5MB", options: ["1MB", "5MB", "10MB", "20MB"] },
              { type: "switch", icon: "refresh", title: "断点续传", enabled: true }
            ]
          },
          {
            title: "多服务器管理",
            rows: [
              { type: "link", icon: "cloud", title: "主服务器", value: "dav.example.com", status: "当前", statusTone: "good" },
              { type: "link", icon: "cloud", title: "备用服务器", value: "未配置", meta: "点击添加备用 WebDAV" },
              { type: "link", icon: "import", title: "导入配置", meta: "从其他设备导入 WebDAV 配置" },
              { type: "link", icon: "export", title: "导出配置", meta: "导出为二维码或文件（不含密码）" }
            ]
          },
          {
            title: "安全提示",
            rows: [
              { type: "link", icon: "shield", title: "密码安全", meta: "使用 AES 加密存储，仅在同步时解密" },
              { type: "link", icon: "info", title: "数据传输", meta: "强制 HTTPS，不使用不安全的 HTTP" },
              { type: "link", icon: "lock", title: "目录权限", meta: "建议使用专用目录，避免与其他应用共享" }
            ]
          }
        ],
        confirms: {
          "webdav-test": { title: "测试网络连通性？", copy: "将使用当前服务器地址和账号发起一次连接验证，检查目录可访问性和读写权限。", confirmLabel: "开始测试", resultToast: "连接成功 · 延迟 86ms · 目录可读写" },
          "webdav-save": { title: "保存 WebDAV 配置？", copy: "保存后，远程恢复会从该 WebDAV 目录读取备份数据。密码会加密存储。", confirmLabel: "保存", resultToast: "WebDAV 配置已保存" }
        }
      },
      "sync-settings-entry": {
        title: "同步设置",
        metrics: [
          { icon: "sync", label: "同步状态", value: "已同步" },
          { icon: "clock", label: "最近同步", value: "08:00" },
          { icon: "warning", label: "冲突", value: "0" },
          { icon: "refresh", label: "自动同步", value: "开启" }
        ],
        sections: [
          {
            title: "同步概览",
            rows: [
              { type: "link", icon: "sync", title: "当前同步状态", value: "已同步", status: "成功", statusTone: "good", route: "progress-sync-status" },
              { type: "link", icon: "clock", title: "最近同步时间", value: "2026-06-23 08:00", route: "progress-sync-status" },
              { type: "link", icon: "warning", title: "未解决冲突", value: "0 项", route: "progress-sync-status", meta: "无冲突" },
              { type: "link", icon: "history", title: "同步历史", value: "5 次", route: "progress-sync" }
            ]
          },
          {
            title: "同步设置",
            rows: [
              { type: "switch", icon: "refresh", title: "自动同步", enabled: true, meta: "后台自动同步书架和进度" },
              { type: "select", icon: "clock", title: "自动同步频率", value: "每小时", options: ["实时", "每15分钟", "每小时", "每天"] },
              { type: "switch", icon: "wifi", title: "仅 Wi-Fi 下同步", enabled: true },
              { type: "switch", icon: "battery", title: "低电量暂停同步", enabled: true },
              { type: "link", icon: "sync", title: "进度同步详情", route: "progress-sync" }
            ]
          },
          {
            title: "手动操作",
            rows: [
              { type: "link", icon: "refresh", title: "立即同步", actionLabel: "同步", overlay: "dialog:sync-now" },
              { type: "link", icon: "cloud", title: "WebDAV 配置", route: "webdav-config" },
              { type: "link", icon: "backup", title: "备份管理", route: "backup-settings" }
            ]
          }
        ],
        confirms: {
          "sync-now": { title: "立即同步？", copy: "将书架、阅读进度和设置同步到 WebDAV。上次同步于 08:00，无未解决冲突。", confirmLabel: "开始同步", resultToast: "同步完成 · 书架 128 本 · 进度 96 条" }
        }
      },
      "backup-settings": {
        title: "备份设置",
        sections: [
          {
            title: "自动备份",
            rows: [
              { type: "switch", icon: "refresh", title: "启用自动备份", enabled: true, meta: "按频率自动生成备份" },
              { type: "select", icon: "clock", title: "备份频率", value: "每天", options: ["每6小时", "每12小时", "每天", "每周"] },
              { type: "select", icon: "calendar", title: "备份时间", value: "02:00", options: ["00:00", "02:00", "04:00", "06:00"] },
              { type: "switch", icon: "wifi", title: "仅 Wi-Fi 下备份", enabled: true }
            ]
          },
          {
            title: "备份范围",
            rows: [
              { type: "switch", icon: "bookshelf", title: "书架与分组", enabled: true, meta: "128 本书 · 12 个分组" },
              { type: "switch", icon: "clock", title: "阅读进度", enabled: true, meta: "96 条进度记录" },
              { type: "switch", icon: "settings", title: "阅读与 App 设置", enabled: true },
              { type: "switch", icon: "source-stack", title: "书源配置", enabled: true, meta: "12 个书源 · 4 个分组" },
              { type: "switch", icon: "bookmark", title: "RSS 订阅与收藏", enabled: false, meta: "未纳入备份" }
            ]
          },
          {
            title: "保留策略",
            rows: [
              { type: "select", icon: "trash", title: "保留时长", value: "30天", options: ["7天", "14天", "30天", "90天", "永久"] },
              { type: "stepper", icon: "folder", title: "最大份数", value: "20份", minLabel: "-", maxLabel: "+" },
              { type: "switch", icon: "trash", title: "自动清理超期备份", enabled: true, meta: "超过保留期自动删除" },
              { type: "link", icon: "trash", title: "立即清理旧备份", actionLabel: "清理", overlay: "dialog:cleanup", meta: "将清理 2 份超期备份" }
            ]
          },
          {
            title: "本地备份",
            rows: [
              { type: "link", icon: "folder", title: "本地备份位置", value: "/storage/ReaderBackup" },
              { type: "link", icon: "file", title: "本地备份数量", value: "2 份", meta: "12.8 MB · 2.4 MB" },
              { type: "link", icon: "backup", title: "生成本地备份", actionLabel: "备份", overlay: "dialog:local-backup" }
            ]
          },
          {
            title: "远程备份",
            rows: [
              { type: "link", icon: "cloud", title: "远程备份位置", value: "WebDAV · /ReaderBackup" },
              { type: "link", icon: "file", title: "远程备份数量", value: "4 份", meta: "12.8+8.6+12.1+1.6 MB" },
              { type: "link", icon: "backup", title: "生成远程备份", actionLabel: "上传", overlay: "dialog:remote-backup" },
              { type: "link", icon: "download", title: "下载远程备份到本地", meta: "将远程备份下载到本机" }
            ]
          }
        ],
        confirms: {
          "cleanup": { title: "清理旧备份？", copy: "将删除超过 30 天保留期的 2 份历史备份，释放约 24.2 MB。最近备份和手动备份不会被清理。", confirmLabel: "确认清理", resultToast: "已清理 2 份旧备份 · 释放 24.2 MB" },
          "local-backup": { title: "生成本地备份？", copy: "将立即生成本地备份文件，包含书架、进度、设置和书源。", confirmLabel: "开始备份", resultToast: "本地备份完成 · 12.8 MB" },
          "remote-backup": { title: "上传到 WebDAV？", copy: "将本地最新备份上传到 WebDAV 远程目录。", confirmLabel: "开始上传", resultToast: "已上传到 WebDAV · 12.8 MB" }
        }
      },
      "progress-sync": {
        title: "进度同步",
        sections: [
          {
            title: "实时状态",
            rows: [
              { type: "link", icon: "sync", title: "当前状态", value: "已同步", status: "成功", statusTone: "good", route: "progress-sync-status" },
              { type: "link", icon: "clock", title: "最近同步", value: "2026-06-23 08:00", route: "progress-sync-status" },
              { type: "link", icon: "warning", title: "冲突数量", value: "0 项", route: "progress-sync-status" },
              { type: "link", icon: "refresh", title: "立即同步", actionLabel: "同步", overlay: "dialog:sync-now" }
            ]
          },
          {
            title: "同步冲突",
            rows: [
              { type: "link", icon: "warning", title: "未解决冲突", value: "0 项", status: "无", statusTone: "good", route: "progress-sync-status" },
              { type: "link", icon: "history", title: "历史冲突", value: "3 项", meta: "均已解决" },
              { type: "select", icon: "shield", title: "冲突策略", value: "询问", options: ["询问", "优先本地", "优先远程", "保留两者"] }
            ]
          },
          {
            title: "同步历史",
            layout: "sync-history",
            rows: [
              { type: "link", icon: "sync", title: "2026-06-23 08:00", value: "成功", status: "成功", statusTone: "good", meta: "书架 128 · 进度 96" },
              { type: "link", icon: "sync", title: "2026-06-22 08:00", value: "成功", status: "成功", statusTone: "good", meta: "书架 126 · 进度 94" },
              { type: "link", icon: "sync", title: "2026-06-21 22:30", value: "部分成功", status: "1 冲突", statusTone: "warn", meta: "已解决 1 项冲突" },
              { type: "link", icon: "sync", title: "2026-06-21 08:00", value: "成功", status: "成功", statusTone: "good", meta: "书架 124 · 进度 92" },
              { type: "link", icon: "sync", title: "2026-06-20 08:00", value: "失败", status: "网络错误", statusTone: "warn", meta: "WebDAV 连接超时" }
            ]
          }
        ],
        confirms: {
          "sync-now": { title: "立即同步？", copy: "将书架和阅读进度同步到 WebDAV。上次同步于 08:00，无未解决冲突。", confirmLabel: "开始同步", resultToast: "同步完成 · 书架 128 本 · 进度 96 条" }
        }
      },
      "progress-sync-status": {
        title: "同步状态",
        sections: [
          {
            title: "当前状态",
            rows: [
              { type: "link", icon: "sync", title: "同步状态", value: "已同步", status: "成功", statusTone: "good" },
              { type: "link", icon: "clock", title: "最近同步", value: "2026-06-23 08:00" },
              { type: "link", icon: "refresh", title: "下次自动同步", value: "09:00", meta: "1 小时后" },
              { type: "link", icon: "warning", title: "未解决冲突", value: "0 项", status: "无", statusTone: "good" }
            ]
          },
          {
            title: "同步详情",
            rows: [
              { type: "link", icon: "bookshelf", title: "书架数据", value: "128 本", status: "已同步", statusTone: "good" },
              { type: "link", icon: "clock", title: "阅读进度", value: "96 条", status: "已同步", statusTone: "good" },
              { type: "link", icon: "settings", title: "App 设置", value: "已同步", status: "已同步", statusTone: "good" },
              { type: "link", icon: "source-stack", title: "书源配置", value: "12 个", status: "已同步", statusTone: "good" }
            ]
          },
          {
            title: "冲突处理",
            rows: [
              { type: "link", icon: "warning", title: "当前冲突", value: "0 项", status: "无", statusTone: "good", meta: "无未解决冲突" },
              { type: "select", icon: "shield", title: "冲突解决策略", value: "询问", options: ["询问", "优先本地", "优先远程", "保留两者"] },
              { type: "link", icon: "history", title: "冲突历史", value: "3 项", meta: "均已手动解决" }
            ]
          },
          {
            title: "操作",
            rows: [
              { type: "link", icon: "refresh", title: "立即同步", actionLabel: "同步", overlay: "dialog:sync-now" },
              { type: "link", icon: "refresh", title: "强制重新同步", actionLabel: "强制", overlay: "dialog:force-sync", meta: "忽略本地缓存，全量同步" },
              { type: "link", icon: "history", title: "查看同步历史", route: "progress-sync" }
            ]
          }
        ],
        confirms: {
          "sync-now": { title: "立即同步？", copy: "将书架和阅读进度同步到 WebDAV。", confirmLabel: "开始同步", resultToast: "同步完成 · 无冲突" },
          "force-sync": { title: "强制重新同步？", copy: "将忽略本地缓存，全量同步所有数据到 WebDAV。耗时较长，建议在 Wi-Fi 下进行。", confirmLabel: "强制同步", resultToast: "强制同步完成 · 全量上传" }
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

  function remoteWebdavBooksScreen(data, appState) {
    const pathSegments = ["/", "books/", "books/玄幻/"];
    const books = [
      { title: "斗破苍穹.epub", size: "3.2 MB", modified: "今天 10:12", status: "downloaded", progress: 100, tone: "good" },
      { title: "凡人修仙传.epub", size: "5.8 MB", modified: "昨天 18:30", status: "downloading", progress: 64, tone: "info" },
      { title: "遮天.epub", size: "4.1 MB", modified: "3 天前", status: "failed", progress: 32, tone: "warn", error: "网络中断，已暂停" },
      { title: "完美世界.epub", size: "6.2 MB", modified: "上周", status: "pending", progress: 0, tone: "muted" },
      { title: "圣墟.epub", size: "4.8 MB", modified: "上周", status: "downloaded", progress: 100, tone: "good" },
      { title: "一念永恒.txt", size: "2.1 MB", modified: "2 周前", status: "downloaded", progress: 100, tone: "good" }
    ];
    const statusLabels = { downloaded: "已下载", downloading: "下载中", failed: "下载失败", pending: "待下载" };
    const currentPath = pathSegments[pathSegments.length - 1];
    return shellKit().renderSettingsShell(Object.assign(phoneShellClasses("fd-settings-phone fd-webdav-books-phone"), {
      data,
      title: "远程 WebDAV 书籍",
      ariaLabel: "远程 WebDAV 书籍",
      topBarClass: "fd-back-bar",
      contentClass: "fd-phone-content fd-settings-content fd-webdav-books-content",
      toastHostClass: "fd-toast-host",
      dialogHostClass: "fd-dialog-host",
      stateHostClass: "fd-settings-state-host",
      bottomActionHostClass: "fd-bottom-action-host",
      contentHtml: `
        <section class="fd-webdav-books" data-webdav-books>
          <article class="fd-webdav-books-head">
            <span><strong>WebDAV 服务器</strong><small>https://dav.example.com/books/</small></span>
            ${sourceBadge({ status: "已连接", tone: "good" })}
          </article>
          <nav class="fd-webdav-books-path" aria-label="目录导航" data-webdav-path>
            ${pathSegments.map((seg, index) => `<button type="button" data-webdav-path-segment="${esc(String(index))}" aria-label="返回 ${esc(seg)}">${esc(seg === "/" ? "根目录" : seg)}</button>`).join('<i aria-hidden="true">/</i>')}
          </nav>
          <section class="fd-webdav-books-toolbar" aria-label="WebDAV 工具栏">
            <button type="button" data-webdav-refresh aria-label="刷新远程目录">${icon("refresh", "fd-small-icon")}刷新</button>
            <button type="button" data-webdav-up aria-label="返回上级目录">${icon("up", "fd-small-icon")}上级</button>
            <label class="fd-webdav-books-search">${icon("search", "fd-small-icon")}<input type="search" placeholder="搜索远程书籍" data-webdav-search></label>
          </section>
          <p class="fd-webdav-books-stat">当前目录：${esc(currentPath)} · ${esc(String(books.length))} 个文件 · 已下载 ${esc(String(books.filter((b) => b.status === "downloaded").length))} 个</p>
          <section class="fd-webdav-books-list" aria-label="远程书籍列表">
            ${books.map((book) => `
              <article class="fd-webdav-book is-${esc(book.status)}" data-webdav-book="${esc(book.title)}">
                <span class="fd-webdav-book-icon">${icon(book.title.endsWith(".txt") ? "file" : "book", "fd-small-icon")}</span>
                <div class="fd-webdav-book-main">
                  <strong>${esc(book.title)}</strong>
                  <small>${esc(book.size)} · ${esc(book.modified)} · ${esc(statusLabels[book.status] || book.status)}</small>
                  ${book.status === "downloading" ? `<div class="fd-webdav-book-progress" aria-label="下载进度"><i style="--webdav-progress:${esc(String(book.progress))}%"></i><span>${esc(String(book.progress))}%</span></div>` : ""}
                  ${book.status === "failed" ? `<em class="fd-webdav-book-error">${esc(book.error || "下载失败")}</em>` : ""}
                </div>
                <div class="fd-webdav-book-actions">
                  ${book.status === "downloaded" ? `<button type="button" data-webdav-preview aria-label="预览 ${esc(book.title)}">预览</button><button type="button" class="is-primary" data-webdav-import aria-label="导入 ${esc(book.title)} 到书架">导入</button>` : ""}
                  ${book.status === "downloading" ? `<button type="button" data-webdav-pause aria-label="暂停下载">暂停</button>` : ""}
                  ${book.status === "failed" ? `<button type="button" data-webdav-retry aria-label="重试下载">重试</button>` : ""}
                  ${book.status === "pending" ? `<button type="button" class="is-primary" data-webdav-download aria-label="下载 ${esc(book.title)}">下载</button>` : ""}
                </div>
              </article>`).join("")}
          </section>
          <section class="fd-webdav-books-actions" aria-label="批量操作">
            <button type="button" data-webdav-download-all>全部下载</button>
            <button type="button" data-webdav-import-all>全部导入</button>
            <button type="button" data-route="webdav-config">WebDAV 配置</button>
          </section>
        </section>`,
      bottomActionHtml: `<div class="fd-source-bottom-bar is-fixed"><button type="button" data-route="sync-backup">同步与备份</button><button type="button" data-route="webdav-config">WebDAV 配置</button><button type="button" class="is-primary" data-webdav-download-all>全部下载</button></div>`
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
      ["可回退点", "恢复前自动生成本地快照"],
      ["完整性校验", "manifest 校验通过 · hash 匹配"]
    ];
    const conflictItems = [
      { title: "分组：玄幻连载", meta: "本地 42 本 · 远程 46 本", local: "保留本地", remote: "使用备份", detail: "本地新增 3 本 · 远程新增 7 本 · 2 本不同步" },
      { title: "阅读进度：长夜余火", meta: "本地第 32 章 · 远程第 35 章", local: "本地进度", remote: "远程进度", detail: "远程比本地多读 3 章" },
      { title: "阅读设置：浅色主题", meta: "本地字号 18 · 远程字号 17", local: "本机设置", remote: "备份设置", detail: "字号、行距、主题存在差异" }
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
          <section class="fd-restore-card">
            <h2>备份完整性校验</h2>
            <p>已校验备份文件的 manifest 和 hash，版本兼容。数据类型：书架、进度、设置、书源。</p>
            <div class="fd-restore-summary-grid">${restoreSummaryRows([
              ["文件大小", "12.8 MB"],
              ["manifest", "通过"],
              ["hash 校验", "通过"],
              ["版本兼容", "v3 → 当前"]
            ])}</div>
          </section>
          ${restoreScopeChoiceList(appState)}
          <section class="fd-restore-warning">
            ${icon("warning", "fd-small-icon")}
            <span><strong>覆盖提醒</strong><small>冲突项会在恢复过程中单独确认，不会静默覆盖。恢复前会自动生成本地快照，可随时回退。</small></span>
          </section>
          <section class="fd-restore-actions">
            <button type="button" data-route="restore-preview">预览变更</button>
            <button type="button" data-route="sync-backup">取消</button>
            <button class="is-primary" type="button" data-route="restore-progress">开始恢复</button>
          </section>`
      },
      "restore-scopes": {
        title: "恢复范围",
        badge: restoreStepBadge("选择范围", "muted"),
        content: `
          <section class="fd-restore-card">
            <h2>选择恢复范围</h2>
            <p>仅显示当前备份包含的数据类型。至少保留一项，可单独勾选需要恢复的范围。</p>
            <div class="fd-restore-summary-grid">${restoreSummaryRows([
              ["备份包含", "书架、进度、设置、书源"],
              ["可选范围", "4 项"],
              ["已选范围", restoreScopeLabel(selectedScopes)],
              ["预计影响", restoreScopeImpact(selectedScopes)]
            ])}</div>
          </section>
          ${restoreScopeChoiceList(appState)}
          <section class="fd-restore-warning">
            ${icon("info", "fd-small-icon")}
            <span><strong>范围说明</strong><small>取消勾选的范围不会被覆盖，保持本地数据不变。至少需要保留一项才能开始恢复。</small></span>
          </section>
          <section class="fd-restore-actions">
            <button type="button" data-route="restore-confirm">返回确认</button>
            <button class="is-primary" type="button" data-route="restore-confirm">应用范围</button>
          </section>`
      },
      "restore-preview": {
        title: "恢复预览",
        badge: restoreStepBadge("预览变更", "muted"),
        content: `
          <section class="fd-restore-card">
            <h2>恢复预览</h2>
            <p>以下是将要发生的变更。新增项目会写入本地，更新项目会覆盖本地，冲突项目会在恢复过程中单独处理。</p>
            <div class="fd-restore-summary-grid">${restoreSummaryRows([
              ["新增书籍", "6 本"],
              ["更新书籍", "122 本"],
              ["冲突项目", "3 项"],
              ["跳过项目", "1 条"]
            ])}</div>
          </section>
          <section class="fd-restore-card">
            <h2>新增书籍（6 本）</h2>
            <div class="fd-restore-preview-list">
              <article><span><strong>长夜余火</strong><small>作者：烽火戏诸侯 · 玄幻连载</small></span>${restoreStepBadge("新增", "good")}</article>
              <article><span><strong>星门</strong><small>作者：庄毕凡 · 科幻</small></span>${restoreStepBadge("新增", "good")}</article>
              <article><span><strong>大医凌然</strong><small>作者：志鸟村 · 都市</small></span>${restoreStepBadge("新增", "good")}</article>
              <article><span><strong>第一序列</strong><small>作者：会说话的肘子 · 科幻</small></span>${restoreStepBadge("新增", "good")}</article>
              <article><span><strong>诡秘之主</strong><small>作者：爱潜水的乌贼 · 奇幻</small></span>${restoreStepBadge("新增", "good")}</article>
              <article><span><strong>黎明之剑</strong><small>作者：远瞳 · 奇幻</small></span>${restoreStepBadge("新增", "good")}</article>
            </div>
          </section>
          <section class="fd-restore-card">
            <h2>更新书籍（122 本，前 3 条）</h2>
            <div class="fd-restore-preview-list">
              <article><span><strong>斗破苍穹</strong><small>本地最新 810 章 · 远程 812 章</small></span>${restoreStepBadge("更新", "info")}</article>
              <article><span><strong>凡人修仙传</strong><small>本地进度第 245 章 · 远程第 248 章</small></span>${restoreStepBadge("更新", "info")}</article>
              <article><span><strong>遮天</strong><small>本地分组：玄幻 · 远程分组：追更</small></span>${restoreStepBadge("更新", "info")}</article>
            </div>
          </section>
          <section class="fd-restore-card">
            <h2>冲突项目（3 项）</h2>
            <div class="fd-restore-preview-list">
              ${conflictItems.map((item) => `<article><span><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></span>${restoreStepBadge("冲突", "warn")}</article>`).join("")}
            </div>
          </section>
          <section class="fd-restore-actions">
            <button type="button" data-route="restore-confirm">返回确认</button>
            <button class="is-primary" type="button" data-route="restore-progress">开始恢复</button>
          </section>`
      },
      "restore-progress": {
        title: "恢复进度",
        badge: restoreStepBadge("进行中", "warn"),
        content: `
          <section class="fd-restore-card">
            <h2>正在恢复</h2>
            <p>当前正在合并书架和阅读进度。离开页面不会中断恢复，完成后会进入结果状态。可在通知栏查看进度提醒。</p>
            <div class="fd-restore-progress-meter" style="--restore-progress:68%"><i><b></b></i><span>68%</span></div>
            <small>预计剩余 12 秒 · 已运行 26 秒</small>
          </section>
          ${restoreStageList([
            { title: "下载备份", meta: "12.8 MB · WebDAV · 86ms", status: "完成", tone: "good", progress: "100%", done: true },
            { title: "校验文件", meta: "manifest、hash、版本兼容 · 通过", status: "完成", tone: "good", progress: "100%", done: true },
            { title: "合并数据", meta: "书架 128 本 · 进度 96 条 · 68%", status: "进行中", tone: "warn", progress: "68%", active: true },
            { title: "写入设置", meta: "等待合并完成", status: "等待", tone: "muted", progress: "0%" }
          ])}
          <section class="fd-restore-card">
            <h2>实时日志</h2>
            <div class="fd-restore-log-stream">
              <article><small>10:30:18</small> 下载备份完成 · 12.8 MB</article>
              <article><small>10:30:19</small> manifest 校验通过</article>
              <article><small>10:30:20</small> hash 校验通过</article>
              <article><small>10:30:21</small> 开始合并书架数据 · 128 本</article>
              <article><small>10:30:25</small> 已合并 86/128 本 · 检测到 3 项冲突</article>
            </div>
          </section>
          <section class="fd-restore-actions">
            <button type="button" data-route="restore-conflict">处理冲突</button>
            <button type="button">中断恢复</button>
            <button class="is-primary" type="button" data-route="restore-result">查看结果</button>
          </section>`
      },
      "restore-running": {
        title: "恢复运行中",
        badge: restoreStepBadge("运行中", "warn"),
        content: `
          <section class="fd-restore-card">
            <h2>恢复进行中</h2>
            <p>恢复正在后台运行。可继续使用应用，完成后会通过通知提醒并自动跳转结果页。</p>
            <div class="fd-restore-progress-meter" style="--restore-progress:68%"><i><b></b></i><span>68%</span></div>
            <small>预计剩余 12 秒 · 已运行 26 秒 · 后台执行中</small>
          </section>
          ${restoreStageList([
            { title: "下载备份", meta: "12.8 MB · WebDAV", status: "完成", tone: "good", progress: "100%", done: true },
            { title: "校验文件", meta: "manifest、hash 通过", status: "完成", tone: "good", progress: "100%", done: true },
            { title: "合并数据", meta: "书架 128 本 · 进度 96 条", status: "进行中", tone: "warn", progress: "68%", active: true },
            { title: "写入设置", meta: "等待合并完成", status: "等待", tone: "muted", progress: "0%" }
          ])}
          <section class="fd-restore-card">
            <h2>实时日志输出</h2>
            <div class="fd-restore-log-stream">
              <article><small>10:30:18.120</small> 下载备份完成 · 12.8 MB · 86ms</article>
              <article><small>10:30:19.045</small> manifest 校验通过 · 4 个数据类型</article>
              <article><small>10:30:20.218</small> hash 校验通过 · SHA-256 匹配</article>
              <article><small>10:30:21.502</small> 开始合并书架数据 · 128 本</article>
              <article><small>10:30:25.831</small> 已合并 86/128 本 · 检测到 3 项冲突</article>
              <article><small>10:30:28.104</small> 正在合并阅读进度 · 96 条</article>
            </div>
          </section>
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
            <p>以下项目本地和备份均有更新。请选择保留本地或使用备份，选择后恢复会继续。冲突解决进度：0/3。</p>
          </section>
          ${restoreConflictRows(conflictItems)}
          <section class="fd-restore-card">
            <h2>快捷操作</h2>
            <div class="fd-restore-quick-actions">
              <button type="button">全部保留本地</button>
              <button type="button">全部使用备份</button>
              <button type="button">逐项确认</button>
            </div>
          </section>
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
            <p>书架、分组和阅读进度已恢复。1 条书源配置因版本不兼容被跳过，可在日志中查看详情。恢复后已自动进行数据一致性校验。</p>
            <div class="fd-restore-summary-grid">${restoreSummaryRows([
              ["恢复书籍", "128 本"],
              ["恢复分组", "12 个"],
              ["恢复进度", "96 条"],
              ["跳过项目", "1 条"],
              ["冲突解决", "3/3"],
              ["一致性校验", "通过"]
            ])}</div>
          </section>
          <section class="fd-restore-stage-list" aria-label="恢复结果明细">
            <article class="is-done">${icon("check", "fd-small-icon")}<span><strong>书架与分组</strong><small>已恢复 128 本书和 12 个分组 · 新增 6 本 · 更新 122 本</small></span>${restoreStepBadge("成功", "good")}</article>
            <article class="is-done">${icon("check", "fd-small-icon")}<span><strong>阅读进度</strong><small>已恢复 96 条进度记录 · 3 项冲突已解决</small></span>${restoreStepBadge("成功", "good")}</article>
            <article>${icon("warning", "fd-small-icon")}<span><strong>书源配置</strong><small>1 条旧版规则字段不兼容 · 字段 bookSourceRule 版本 v2 → v3</small></span>${restoreStepBadge("跳过", "warn")}</article>
          </section>
          <section class="fd-restore-card">
            <h2>跳过项目详情</h2>
            <div class="fd-restore-preview-list">
              <article><span><strong>旧规则源</strong><small>字段 bookSourceRule 版本 v2 不兼容当前 v3</small></span>${restoreStepBadge("跳过", "warn")}</article>
            </div>
            <small>跳过的项目可在错误日志中查看详情，或手动更新书源规则后重新恢复。</small>
          </section>
          <section class="fd-restore-actions">
            <button type="button">查看日志</button>
            <button type="button">导出日志</button>
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
    const sortOptions = ["按名称", "按分组", "按状态", "按延迟"];
    const activeSort = appState?.sourceSort || "按名称";
    const batchDetecting = appState?.sourceBatchDetecting;
    const sortHtml = `
      <nav class="fd-source-sort-row" aria-label="书源排序">
        <span>排序：</span>
        ${sortOptions.map((item) => `<button class="${item === activeSort ? "is-active" : ""}" type="button" data-source-sort="${esc(item)}">${esc(item)}</button>`).join("")}
      </nav>`;
    const detectProgressHtml = batchDetecting ? `
      <section class="fd-source-detect-progress" aria-label="批量检测进度">
        ${icon("activity", "fd-small-icon")}
        <span><strong>批量检测中</strong><small>已检测 8/12 · 异常 2 个</small></span>
        <i style="--detect-progress:67%"><b></b></i>
        <span>67%</span>
      </section>` : "";
    const homeContent = sourceHomeContent(Boolean(appState?.sourceMenuOpen), appState);
    const contentWithSort = homeContent.replace("</section>", `${sortHtml}</section>`);
    return sourceShell(data, "书源管理", detectProgressHtml + contentWithSort, {
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
    const selectedItems = sourceItems.filter((item) => item.selected);
    const selectedCount = appState?.sourceSelectedCount || selectedItems.length || 3;
    const batchProgress = appState?.sourceBatchProgress;
    const progressHtml = batchProgress ? `
      <section class="fd-source-batch-progress" aria-label="批量操作进度">
        ${icon("refresh", "fd-small-icon")}
        <span><strong>${esc(batchProgress.action || "批量操作中")}</strong><small>${esc(batchProgress.detail || `已处理 ${batchProgress.done || 0}/${selectedCount}`)}</small></span>
        <i style="--batch-progress:${esc(batchProgress.percent || "0%")}"><b></b></i>
        <span>${esc(batchProgress.percent || "0%")}</span>
      </section>` : "";
    return sourceShell(data, `已选 ${selectedCount} 个`, `
      ${progressHtml}
      <section class="fd-source-home fd-source-batch">
        <div class="fd-source-batch-top"><button type="button" data-route="source-management">取消</button><strong data-source-selected-count>已选 ${selectedCount} 个</strong><button type="button" data-source-select-all aria-pressed="false">全选</button></div>
        ${sourceSearchAndFilters(appState)}
        ${sourceList(sourceItems, "batch", appState)}
      </section>`, {
        bottomActionHtml: sourceBottomActions([
          { label: "启用", icon: "check", action: "enable-selected", ariaLabel: `启用已选 ${selectedCount} 个书源` },
          { label: "禁用", icon: "close", action: "disable-selected", ariaLabel: `禁用已选 ${selectedCount} 个书源` },
          { label: "检测", icon: "activity", action: "detect-selected", ariaLabel: `检测已选 ${selectedCount} 个书源` },
          { label: "分组", icon: "folder", route: "source-groups", action: "group-selected" },
          { label: "删除", icon: "trash", route: "source-delete-confirm", className: "is-danger", action: "delete-selected", ariaLabel: `删除已选 ${selectedCount} 个书源` }
        ], "fd-source-batch-actions")
      });
  }

  function sourceGroupsScreen(data) {
    const groups = [["全部分组", "12 个书源", true], ["玄幻书源", "4 个书源", false], ["起点导入", "3 个书源", false], ["测试书源", "3 个书源", false], ["自定义", "2 个书源", false], ["未分组", "1 个书源", false]];
    return sourceShell(data, "分组管理", `
      <section class="fd-source-groups">
        <p class="fd-source-note">分组用于筛选和批量整理书源，删除分组不会删除书源。长按拖拽可调整排序，点击编辑可重命名。</p>
        <section class="fd-source-group-list" aria-label="书源分组列表">${groups.map(([title, meta, isDefault], index) => `
          <article${index === 1 ? ' class="is-current"' : ""}>
            <button type="button" aria-label="拖拽排序" data-source-group-drag="${esc(title)}">${icon("drag", "fd-small-icon")}</button>
            <span><strong>${esc(title)}</strong><small>${esc(meta)}</small>${isDefault ? "<em>默认</em>" : ""}${index === 1 ? "<em>当前筛选</em>" : ""}</span>
            <button type="button" aria-label="重命名 ${esc(title)}" data-source-group-rename="${esc(title)}">${icon("edit", "fd-small-icon")}</button>
            <button type="button" aria-label="删除 ${esc(title)}" data-source-group-delete="${esc(title)}">${icon("trash", "fd-small-icon")}</button>
          </article>`).join("")}</section>
        <section class="fd-source-group-help">
          <h2>分组操作说明</h2>
          <p>新增分组：点击右下角"新增分组"按钮，输入分组名称后保存。</p>
          <p>重命名：点击编辑图标，在对话框中输入新名称。默认分组不可重命名。</p>
          <p>删除：点击删除图标，会提示该分组下的书源将移动到"未分组"。</p>
          <p>批量移动：在书源管理批量模式下选择书源后，可批量移动到指定分组。</p>
        </section>
      </section>`, {
        trailingHtml: `<button type="button" data-source-group-add>新增</button>`,
        bottomActionHtml: sourceBottomActions([
          { label: "批量移动", action: "batch-move", ariaLabel: "批量移动书源到分组" },
          { label: "新增分组", action: "add-group", ariaLabel: "新增书源分组" }
        ])
      });
  }

  function sourceDetailScreen(data) {
    const modules = [["站点", "可访问", "good"], ["搜索", "正常", "good"], ["详情", "正常", "good"], ["目录", "正常", "good"], ["正文", "异常", "warn"], ["登录", "未启用", "muted"]];
    const ruleVersions = [
      { version: "v3", time: "今天 10:12", note: "正文规则修复（.chapter-content@text）", current: true, tone: "good" },
      { version: "v2", time: "3 天前", note: "目录规则调整（章节 URL 校验）", current: false, tone: "muted" },
      { version: "v1", time: "上周", note: "初始导入", current: false, tone: "muted" }
    ];
    const usageStats = [
      ["搜索调用", "128 次", "本周"],
      ["详情解析", "96 次", "本周"],
      ["目录解析", "84 次", "本周"],
      ["正文下载", "612 章", "本周"],
      ["平均延迟", "312ms", "近 7 天"],
      ["成功率", "94.2%", "近 7 天"]
    ];
    return sourceShell(data, "书源详情", `
      <section class="fd-source-detail">
        <article class="fd-source-detail-head"><span><strong>笔趣阁</strong><small>biquge.example · 玄幻书源</small></span>${sourceSwitch(true, "笔趣阁")}</article>
        <p class="fd-source-stat-line"><b>异常</b> · 最近检测 10:30 · 规则版本 3</p>
        <section class="fd-source-module-list">${modules.map(([title, status, tone]) => `<article><strong>${esc(title)}</strong>${sourceBadge({ status, tone })}<button type="button" class="fd-source-module-detect" data-route="source-detect" aria-label="检测 ${esc(title)} 模块">${icon("refresh", "fd-small-icon")}检测</button></article>`).join("")}</section>
        <article class="fd-source-detect-card">
          <h2>最近检测结果</h2>
          <p>搜索、详情、目录均可解析；正文模块失败。</p>
          <small>失败规则：正文内容规则“#content@text”返回空内容。建议进入规则编辑后调测正文模块。</small>
          <div class="fd-source-detail-card-actions"><button type="button" data-route="source-detect">重新检测</button><button type="button" data-route="source-debug">调测正文</button></div>
        </article>
        <section class="fd-source-info-grid" aria-label="书源基础信息">
          <article><strong>请求方式</strong><span>GET · UTF-8</span></article>
          <article><strong>并发限制</strong><span>2 个请求</span></article>
          <article><strong>Cookie</strong><span>未启用</span></article>
          <article><strong>更新时间</strong><span>今天 10:12</span></article>
        </section>
        <section class="fd-source-rule-version" aria-label="规则版本管理">
          <header><h2>规则版本</h2><button type="button" data-route="source-rule-edit">编辑当前版本</button></header>
          <ul>${ruleVersions.map((item) => `<li class="${item.current ? "is-current" : ""}"><span><strong>${esc(item.version)}${item.current ? "（当前）" : ""}</strong><small>${esc(item.time)} · ${esc(item.note)}</small></span>${sourceBadge({ status: item.current ? "当前" : "历史", tone: item.tone })}${item.current ? "" : `<button type="button" data-source-rule-restore="${esc(item.version)}" aria-label="恢复到 ${esc(item.version)}">恢复</button>`}</li>`).join("")}</ul>
          <small>支持规则版本对比与回滚，回滚前会自动保存当前规则快照。</small>
        </section>
        <section class="fd-source-usage-stats" aria-label="使用统计">
          <h2>使用统计</h2>
          <div class="fd-source-usage-grid">${usageStats.map(([label, value, period]) => `<article><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(period)}</span></article>`).join("")}</div>
        </section>
        <section class="fd-source-action-grid">
          <button type="button" data-source-action="copy" aria-label="复制书源 JSON">${icon("copy", "fd-small-icon")}复制书源</button>
          <button type="button" data-source-action="export" aria-label="导出书源到剪贴板或文件">${icon("upload", "fd-small-icon")}导出书源</button>
          <button type="button" data-source-action="share" aria-label="分享书源链接或二维码">${icon("share", "fd-small-icon")}分享书源</button>
          <button type="button" data-source-action="compare" data-route="source-rule-edit" aria-label="与其他书源规则对比">${icon("diff", "fd-small-icon")}规则对比</button>
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
    const stepDurations = { "站点访问": 126, "搜索规则": 286, "详情规则": 318, "目录规则": 366, "正文规则": 164 };
    const debugRouteForStep = (title) => ({
      "站点访问": "source-code-view",
      "搜索规则": "source-debug-search-result",
      "详情规则": "source-debug-detail-result",
      "目录规则": "source-debug-catalog-result",
      "正文规则": "source-debug"
    }[title] || "source-debug");
    const detectHistory = [
      { time: "今天 10:30", result: "4 通过 / 1 失败", duration: "1260ms", tone: "warn", current: true },
      { time: "昨天 18:42", result: "5 通过 / 0 失败", duration: "1180ms", tone: "good", current: false },
      { time: "前天 09:15", result: "3 通过 / 2 失败", duration: "1620ms", tone: "warn", current: false },
      { time: "3 天前", result: "5 通过 / 0 失败", duration: "1090ms", tone: "good", current: false }
    ];
    return sourceShell(data, "书源检测", `
      <section class="fd-source-detect">
        <article class="fd-source-detail-head"><span><strong>笔趣阁</strong><small>检测对象 · biquge.example</small></span>${sourceBadge({ status: "异常", tone: "warn" })}</article>
        <section class="fd-source-detect-progress" aria-label="检测进度" data-source-detect-progress>
          <div class="fd-source-detect-progress-bar"><i style="--detect-progress:80%"></i></div>
          <small>正在检测… 4/5 步骤完成 · 当前：正文规则</small>
        </section>
        <section class="fd-source-detect-summary">
          <strong>5 项检测 · 4 项通过 · 1 项失败</strong>
          <span>总耗时 1260ms · 最近检测 10:30</span>
        </section>
        <section class="fd-source-detect-steps" aria-label="检测步骤">
          ${steps.map(([title, detail, status, tone]) => `
            <article>
              ${sourceBadge({ status, tone })}
              <span><strong>${esc(title)}</strong><small>${esc(detail)}</small><em class="fd-source-detect-duration">${esc(String(stepDurations[title] || 0))}ms</em></span>
              <div class="fd-source-detect-step-actions">
                <button type="button" data-source-detect-step="${esc(title)}" aria-label="单步检测 ${esc(title)}">单步</button>
                <button type="button" data-source-detect-skip="${esc(title)}" aria-label="跳过 ${esc(title)} 检测">跳过</button>
                <button type="button" data-route="${debugRouteForStep(title)}">${title === "站点访问" ? "源码" : "调测"}</button>
              </div>
            </article>`).join("")}
        </section>
        <article class="fd-source-detect-card">
          <h2>失败定位</h2>
          <p>正文请求成功，但正文选择器没有匹配到有效文本。</p>
          <small>下一步应进入正文模块调测，比较原始 HTML 与当前正文规则。</small>
        </article>
        <section class="fd-source-detect-history" aria-label="检测历史">
          <header><h2>检测历史</h2><button type="button" data-source-detect-history-clear aria-label="清空检测历史">清空</button></header>
          <ul>${detectHistory.map((item) => `<li class="${item.current ? "is-current" : ""}"><span><strong>${esc(item.time)}${item.current ? "（本次）" : ""}</strong><small>${esc(item.result)} · 耗时 ${esc(item.duration)}</small></span>${sourceBadge({ status: item.result, tone: item.tone })}</li>`).join("")}</ul>
          <small>检测耗时趋势：近 4 次平均 1287ms · 当前比上次慢 80ms。</small>
        </section>
      </section>`, {
        bottomActionHtml: sourceBottomActions([
          { label: "重新检测", action: "detect-rerun" },
          { label: "单步检测", action: "detect-step" },
          { label: "编辑正文规则", route: "source-rule-edit" }
        ])
      });
  }

  function sourceRuleEditScreen(data) {
    const basicRows = [["书源名称", "笔趣阁", "text"], ["书源地址", "https://biquge.example", "url"], ["书源分组", "玄幻书源", "select"], ["启用状态", "已启用", "switch"]];
    const requestRows = [["请求方式", "GET", "select"], ["字符编码", "UTF-8", "select"], ["请求头", "User-Agent / Referer", "text"], ["Cookie", "未启用", "text"]];
    const parseRows = [["正文页 URL", "{{chapterUrl}}", "text"], ["章节标题", ".chapter-title@text", "selector"], ["正文内容", "#content@text", "selector"], ["下一页", ".next@href", "selector"]];
    const postRows = [["内容过滤", ".ad, script, style", "selector"], ["段落处理", "保留段落换行", "text"], ["净化规则", "去除空行", "text"], ["失败回退", "尝试正文备用规则", "text"]];
    const validationHints = {
      url: { valid: true, message: "URL 格式有效（https://biquge.example）" },
      selector: { valid: false, message: "“#content@text”未在最近一次源码中匹配到节点，建议改为“.chapter-content@text”" }
    };
    const ruleRowsHtml = (rows) => rows.map(([label, value, fieldType]) => {
      const hint = fieldType === "selector" ? validationHints.selector : fieldType === "url" ? validationHints.url : null;
      const hintHtml = hint ? `<em class="fd-source-rule-validate ${hint.valid ? "is-valid" : "is-invalid"}" data-rule-validate="${esc(fieldType)}">${esc(hint.message)}</em>` : "";
      return `
      <article class="fd-source-rule-field" data-rule-field="${esc(fieldType)}">
        <span>${esc(label)}</span>
        <button type="button" data-route="source-debug" aria-label="编辑 ${esc(label)}"><strong>${esc(value)}</strong>${chevron("fd-small-icon")}</button>
        ${hintHtml}
      </article>`;
    }).join("");
    return sourceShell(data, "规则编辑", `
      <section class="fd-source-edit">
        <article class="fd-source-detail-head"><span><strong>笔趣阁</strong><small>正在编辑：正文规则</small></span>${sourceSwitch(true, "笔趣阁")}</article>
        <p class="fd-source-rule-unsaved" data-rule-unsaved role="status">有未保存的规则修改，切换模块前请先保存或放弃。</p>
        <nav class="fd-source-module-tabs" data-rule-module-tabs>${["基本", "搜索", "详情", "目录", "正文", "高级"].map((item) => `<button class="${item === "正文" ? "is-active" : ""}" type="button" data-rule-module-tab="${esc(item)}" data-rule-unsaved-confirm="${item === "正文" ? "" : "切换模块"}">${esc(item)}</button>`).join("")}</nav>
        <section class="fd-source-rule-overview" aria-label="规则编辑概览">
          <article><strong>当前模块</strong><span>正文</span></article>
          <article><strong>最近调测</strong><span>失败 · 0 字</span></article>
          <article><strong>规则版本</strong><span>v3</span></article>
          <article><strong>未保存</strong><span data-rule-dirty>2 项修改</span></article>
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
        <section class="fd-source-rule-syntax-hint" aria-label="语法高亮提示">
          <h2>语法说明</h2>
          <ul>
            <li><code>@text</code> 提取文本，<code>@href</code> 提取链接，<code>@html</code> 提取原始 HTML</li>
            <li><code>.class</code> 与 <code>#id</code> 遵循 CSS 选择器，<code>@css:.x</code> 显式声明</li>
            <li><code>{{变量}}</code> 引用上下文变量，如 <code>{{bookUrl}}</code>、<code>{{chapterUrl}}</code></li>
            <li>正则使用 <code>&lt;js&gt;</code> 包裹或 <code>##替换规则##</code> 语法</li>
          </ul>
        </section>
        <section class="fd-source-rule-help">
          <h2>当前规则说明</h2>
          <p>正文规则用于从章节页面中提取正文文本。这里编辑的是解析表达式，不是 UI 显示规则。</p>
          <small>规则修改后先调测当前模块，确认解析结果正常后再保存。</small>
        </section>
      </section>`, {
        trailingHtml: `<button type="button" data-rule-validate-all aria-label="校验全部规则">校验</button><button type="button" data-rule-save>保存</button>`,
        bottomActionHtml: sourceBottomActions([
          { label: "保存规则", action: "rule-save" },
          { label: "校验规则", action: "rule-validate" },
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
    const debugHistory = [
      { time: "今天 10:30", input: "/book/123/128.html", rule: "#content@text", result: "0 字 · 失败", tone: "warn", current: true },
      { time: "昨天 18:42", input: "/book/123/128.html", rule: "#content@text", result: "0 字 · 失败", tone: "warn", current: false },
      { time: "3 天前", input: "/book/123/100.html", rule: ".chapter-content@text", result: "2148 字 · 成功", tone: "good", current: false }
    ];
    return sourceShell(data, "书源调测", `
      <section class="fd-source-debug">
        <article class="fd-source-detail-head fd-source-debug-context"><span><strong>正文模块调测</strong><small>笔趣阁 · 第 128 章 风雨夜</small></span>${sourceBadge({ status: "失败", tone: "warn" })}</article>
        ${sourceDebugModules("content")}
        ${sourceDebugCases("content")}
        <section class="fd-source-debug-inputs" data-debug-inputs>
          <article><span>章节 URL</span><strong contenteditable="true" data-debug-input="url">/book/123/128.html</strong></article>
          <article><span>正文规则</span><strong contenteditable="true" data-debug-input="rule">#content@text</strong></article>
        </section>
        <article class="fd-source-request">GET https://biquge.example/book/123/128.html · 200 OK · 412ms</article>
        ${sourceDebugSegment("result", "source-debug")}
        <section class="fd-source-debug-result" aria-label="解析结果">
          ${parsed.map(([label, value]) => `<article><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`).join("")}
        </section>
        <section class="fd-source-debug-html-compare" aria-label="原始 HTML 对比">
          <h2>原始 HTML 对比</h2>
          <div class="fd-source-debug-compare-grid">
            <article class="fd-source-debug-compare-col is-current"><small>当前规则 #content 匹配</small><p>未匹配到任何节点</p></article>
            <article class="fd-source-debug-compare-col is-suggest"><small>建议规则 .chapter-content 匹配</small><p>&lt;main class="chapter-content"&gt;雨声在檐下连成一片…&lt;/main&gt;</p></article>
          </div>
          <button type="button" data-route="source-code-view" data-debug-view-source>查看完整源码</button>
        </section>
        <article class="fd-source-detect-card">
          <h2>修复建议</h2>
          <p>原始页面正文可能在“.chapter-content”容器内，当前“#content”无匹配。</p>
          <small>可尝试将正文内容规则改为“.chapter-content@text”后重新调测。</small>
        </article>
        <section class="fd-source-debug-history" aria-label="调测历史">
          <header><h2>调测历史</h2><button type="button" data-debug-history-clear aria-label="清空调测历史">清空</button></header>
          <ul>${debugHistory.map((item) => `<li class="${item.current ? "is-current" : ""}"><span><strong>${esc(item.time)}${item.current ? "（本次）" : ""}</strong><small>输入：${esc(item.input)} · 规则：${esc(item.rule)}</small><em>${esc(item.result)}</em></span>${sourceBadge({ status: item.result, tone: item.tone })}</li>`).join("")}</ul>
        </section>
      </section>`, {
        trailingHtml: `<button type="button" data-debug-rerun aria-label="重新执行调测">重新调测</button>`,
        bottomActionHtml: sourceBottomActions([
          { label: "重新调测", action: "debug-rerun" },
          { label: "应用建议规则", action: "debug-apply-suggest" },
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
        items: [
          { title: "斗破苍穹", author: "天蚕土豆", url: "/book/123/", matched: true },
          { title: "斗破苍穹之药老传奇", author: "天蚕土豆", url: "/book/456/", matched: true },
          { title: "斗战狂潮", author: "骷髅精灵", url: "/book/789/", matched: true }
        ],
        rawHtml: "&lt;li&gt;&lt;a class=\"title\"&gt;斗破苍穹&lt;/a&gt;&lt;span class=\"author\"&gt;天蚕土豆&lt;/span&gt;&lt;/li&gt;",
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
        items: [
          { title: "书名", author: "h1@text → 斗破苍穹", url: "", matched: true },
          { title: "作者", author: ".author@text → 天蚕土豆", url: "", matched: true },
          { title: "封面", author: ".cover img@src → cover.jpg", url: "", matched: true },
          { title: "简介", author: ".intro@text → 186 字", url: "", matched: true }
        ],
        rawHtml: "&lt;h1&gt;斗破苍穹&lt;/h1&gt;&lt;p class=\"author\"&gt;天蚕土豆&lt;/p&gt;&lt;img class=\"cover\" src=\"cover.jpg\"&gt;",
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
        items: [
          { title: "第 1 章 陨落的天才", author: "/book/123/1.html", url: "/book/123/1.html", matched: true },
          { title: "第 2 章 灵魂交融", author: "/book/123/2.html", url: "/book/123/2.html", matched: true },
          { title: "第 812 章 大结局", author: "/book/123/812.html", url: "/book/123/812.html", matched: true }
        ],
        rawHtml: "&lt;ul class=\"chapter-list\"&gt;&lt;li&gt;&lt;a href=\"/book/123/1.html\"&gt;第 1 章 陨落的天才&lt;/a&gt;&lt;/li&gt;…&lt;/ul&gt;",
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
        <section class="fd-source-debug-result-list" aria-label="结果详细列表">
          <header><h2>结果详情</h2><nav class="fd-source-debug-result-filter"><button class="is-active" type="button" data-result-filter="all">全部</button><button type="button" data-result-filter="matched">已匹配</button><button type="button" data-result-filter="unmatched">未匹配</button></nav></header>
          <ul>${(page.items || []).map((item) => `<li><span><strong>${esc(item.title)}</strong><small>${esc(item.author)}${item.url ? ` · ${esc(item.url)}` : ""}</small></span>${sourceBadge({ status: item.matched ? "命中" : "未命中", tone: item.matched ? "good" : "warn" })}</li>`).join("")}</ul>
        </section>
        <section class="fd-source-debug-raw" aria-label="原始数据展示">
          <header><h2>原始数据</h2><button type="button" data-route="source-code-view">查看完整源码</button></header>
          <pre>${esc(page.rawHtml || "")}</pre>
        </section>
        <article class="fd-source-detect-card">
          <h2>${esc(page.suggestion[0])}</h2>
          <p>${esc(page.suggestion[1])}</p>
        </article>
      </section>`, {
        trailingHtml: `<button type="button" data-debug-result-export aria-label="导出调测结果">导出</button><button type="button" data-debug-result-share aria-label="分享调测结果">分享</button>`,
        bottomActionHtml: sourceBottomActions([
          { label: "重新调测", action: "debug-rerun" },
          { label: "导出结果", action: "debug-export" },
          { label: "回到编辑", route: "source-rule-edit" }
        ])
      });
  }

  function sourceDebugContentLogScreen(data) {
    const logs = [
      ["10:30:18.120", "请求章节 HTML", "GET /book/123/128.html · 200 OK · 412ms", "info"],
      ["10:30:18.204", "执行正文规则", "#content@text · 匹配节点 0 个", "warn"],
      ["10:30:18.226", "执行净化规则", "未进入净化阶段，正文为空", "info"],
      ["10:30:18.240", "返回错误", "正文内容为空，建议检查选择器或源码结构", "error"]
    ];
    const levelLabels = { info: "信息", warn: "警告", error: "错误" };
    const levelTone = { info: "muted", warn: "warn", error: "warn" };
    const sourceLineMap = { "执行正文规则": 5, "执行净化规则": 8, "返回错误": 12 };
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
        <section class="fd-source-log-toolbar" aria-label="日志工具栏">
          <nav class="fd-source-log-level-filter" data-log-level-filter>
            <button class="is-active" type="button" data-log-level="all">全部</button>
            <button type="button" data-log-level="info">信息</button>
            <button type="button" data-log-level="warn">警告</button>
            <button type="button" data-log-level="error">错误</button>
          </nav>
          <label class="fd-source-log-search">${icon("search", "fd-small-icon")}<input type="search" placeholder="搜索日志内容" data-log-search></label>
        </section>
        <section class="fd-source-log-list fd-source-debug-step-log" aria-label="正文模块调测日志">
          ${logs.map(([time, title, message, level]) => {
            const lineNo = sourceLineMap[title];
            const sourceLink = lineNo ? `<button type="button" class="fd-source-log-source-link" data-route="source-code-view" data-source-line="${esc(String(lineNo))}" aria-label="定位到源码第 ${esc(String(lineNo))} 行">源码:${esc(String(lineNo))}</button>` : "";
            return `<article data-log-level="${esc(level)}"><span><strong>${esc(time)} · ${esc(title)}</strong><small>${esc(message)}</small></span>${sourceLink}${sourceBadge({ status: levelLabels[level] || "记录", tone: levelTone[level] || "muted" })}</article>`;
          }).join("")}
        </section>
        <article class="fd-source-detect-card">
          <h2>定位结果</h2>
          <p>请求成功但正文选择器无匹配，源码中正文位于“.chapter-content”容器。</p>
          <small>可复制日志后回到规则编辑，将正文规则改为“.chapter-content@text”。</small>
        </article>
      </section>`, {
        trailingHtml: `<button type="button" data-log-export aria-label="导出日志">导出</button><button type="button" data-log-share aria-label="分享日志">分享</button><button type="button" data-log-copy>复制</button>`,
        bottomActionHtml: sourceBottomActions([
          { label: "复制日志", action: "log-copy" },
          { label: "导出日志", action: "log-export" },
          { label: "回到解析", route: "source-debug" },
          { label: "回到编辑", route: "source-rule-edit" }
        ])
      });
  }

  function sourceEditDebugScreen(data) {
    return sourceRuleEditScreen(data);
  }

  function sourceLogsScreen(data) {
    const logs = [["笔趣阁", "ERROR", "10:30", "正文", "正文规则返回空内容", "正文选择器 #content 未匹配，建议改为 .chapter-content"], ["旧规则源", "ERROR", "10:22", "搜索", "HTTP 403", "搜索请求被站点拒绝，可能需要登录或更换 UA"], ["本地导入源", "WARN", "09:50", "目录", "尚未检测", "本地导入源未执行过检测，建议手动检测一次"], ["失效示例源", "ERROR", "昨天", "详情", "详情页 URL 为空", "详情规则未提取到 URL，可能站点结构已变更"]];
    const levelFilters = ["全部", "异常", "警告", "今日"];
    const cleanupStrategies = [
      { label: "保留 7 天", value: "7d", active: true },
      { label: "保留 30 天", value: "30d", active: false },
      { label: "保留 100 条", value: "100", active: false },
      { label: "手动清理", value: "manual", active: false }
    ];
    return sourceShell(data, "错误日志", `
      <section class="fd-source-logs">
        <nav class="fd-source-chip-row" data-log-level-filter>${levelFilters.map((item, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button" data-log-level="${esc(item)}">${esc(item)}</button>`).join("")}</nav>
        <label class="fd-source-search">${icon("search", "fd-small-icon")}<input type="search" placeholder="搜索书源或错误内容" data-log-search></label>
        <p class="fd-source-stat-line">4 条异常 · 1 条警告 · 自动清理：保留 7 天</p>
        <section class="fd-source-log-list" data-log-list>${logs.map(([source, level, time, module, message, detail]) => `<article role="button" tabindex="0" data-log-level="${esc(level)}" data-route="${module === "正文" ? "source-debug-content-log" : "source-debug"}"><span><strong>${esc(source)} · ${esc(level)}</strong><small>${esc(time)} · ${esc(module)} · ${esc(message)}</small></span><details class="fd-source-log-detail"><summary>详情</summary><p>${esc(detail)}</p></details>${chevron("fd-small-icon")}</article>`).join("")}</section>
        <section class="fd-source-log-cleanup" aria-label="自动清理策略">
          <h2>自动清理策略</h2>
          <div class="fd-source-log-cleanup-options">${cleanupStrategies.map((item) => `<label class="${item.active ? "is-active" : ""}"><input type="radio" name="log-cleanup" value="${esc(item.value)}"${item.active ? " checked" : ""}> <span>${esc(item.label)}</span></label>`).join("")}</div>
          <small>超期日志会在应用启动时自动清理，不会占用过多空间。</small>
        </section>
      </section>`, {
        trailingHtml: `<button type="button" data-route="source-delete-confirm">清空</button>`,
        bottomActionHtml: sourceBottomActions([
          { label: "复制全部", action: "log-copy-all" },
          { label: "导出日志", action: "log-export" },
          { label: "重新检测异常", action: "log-redetect" }
        ])
      });
  }

  function sourceCodeViewScreen(data) {
    const code = ["<html>", "  <body>", "    <h1 class=\"chapter-title\">第 128 章 风雨夜</h1>", "    <main class=\"chapter-content\">", "      <p>雨声在檐下连成一片，旧街的灯光被水汽晕开。</p>", "      <p>他把地图折回怀里，终于确认了下一处坐标。</p>", "    </main>", "    <a class=\"next\" href=\"/book/123/129.html\">下一章</a>", "  </body>", "</html>"];
    const selectorMatches = [
      { selector: "#content", line: -1, note: "未匹配到任何节点", tone: "warn" },
      { selector: ".chapter-content", line: 4, note: "匹配到 1 个节点（含正文）", tone: "good" },
      { selector: ".chapter-title", line: 3, note: "匹配到 1 个节点（章节标题）", tone: "good" },
      { selector: ".next", line: 8, note: "匹配到 1 个节点（下一页链接）", tone: "good" }
    ];
    const highlightLine = (line, index) => `${String(index + 1).padStart(2, "0")}  ${esc(line)}`;
    return sourceShell(data, "书源调测", `
      <section class="fd-source-debug fd-source-code">
        <article class="fd-source-detail-head fd-source-debug-context"><span><strong>源码查看</strong><small>正文模块 · 当前请求返回</small></span>${sourceBadge({ status: "200 OK", tone: "good" })}</article>
        <section class="fd-source-debug-inputs">
          <article><span>章节 URL</span><strong>/book/123/128.html</strong></article>
          <article><span>正文规则</span><strong>#content@text</strong></article>
        </section>
        <article class="fd-source-request">GET https://biquge.example/book/123/128.html · 200 OK · 412ms</article>
        ${sourceDebugSegment("source", "source-debug")}
        <section class="fd-source-code-toolbar" aria-label="源码工具栏">
          <label class="fd-source-code-search">${icon("search", "fd-small-icon")}<input type="search" placeholder="搜索源码内容" data-code-search></label>
          <nav class="fd-source-code-highlight-toggle" data-code-highlight>
            <button class="is-active" type="button" data-highlight="selector" aria-pressed="true">选择器高亮</button>
            <button type="button" data-highlight="syntax" aria-pressed="false">语法高亮</button>
          </nav>
        </section>
        <section class="fd-source-code-selector-matches" aria-label="选择器匹配高亮">
          <h2>选择器匹配</h2>
          <ul>${selectorMatches.map((item) => `<li class="is-${esc(item.tone)}"><code>${esc(item.selector)}</code><small>${item.line > 0 ? `第 ${esc(String(item.line))} 行 · ` : ""}${esc(item.note)}</small></li>`).join("")}</ul>
        </section>
        <pre class="fd-source-code-block" data-code-block>${code.map((line, index) => {
          const match = selectorMatches.find((item) => item.line === index + 1);
          const mark = match ? ` data-code-match="${esc(match.selector)}"` : "";
          return `<span class="fd-source-code-line"${mark}>${highlightLine(line, index)}</span>`;
        }).join("\n")}</pre>
      </section>`, {
        trailingHtml: `<button type="button" data-code-copy aria-label="复制源码">复制</button><button type="button" data-code-export aria-label="导出源码">导出</button>`,
        bottomActionHtml: sourceBottomActions([
          { label: "重新请求", action: "code-rerequest" },
          { label: "复制源码", action: "code-copy" },
          { label: "回到调测", route: "source-debug" }
        ])
      });
  }

  function sourceDeleteConfirmScreen(data, appState) {
    const selectedSources = (sourceItems || []).filter((item) => item.selected);
    const impactStats = [
      ["书架相关书籍", "12 本", "这些书籍将失去该书源来源，需手动换源"],
      ["搜索匹配", "12 次/周", "删除后不再参与搜索结果聚合"],
      ["发现推荐", "8 次/周", "删除后不再出现在发现页推荐"],
      ["换源候选", "5 本", "阅读中的 5 本书的换源列表会减少 1 个候选"]
    ];
    return sourceShell(data, "已选 3 个", `
      <section class="fd-source-home fd-source-batch fd-source-dialog-underlay" aria-hidden="true" inert>
        <div class="fd-source-batch-top"><button type="button" data-route="source-batch">取消</button><strong>已选 ${esc(String(selectedSources.length))} 个</strong><button type="button" data-source-select-all aria-pressed="false">全选</button></div>
        ${sourceSearchAndFilters(appState)}
        ${sourceList(sourceItems, "batch", appState)}
      </section>`, {
        dialogHtml: `<section class="fd-demo-dialog fd-source-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="source-delete-title" aria-describedby="source-delete-desc" aria-hidden="false" data-demo-dialog data-source-delete-dialog><h2 id="source-delete-title">删除书源？</h2><p id="source-delete-desc">将删除已选 ${esc(String(selectedSources.length))} 个书源。不会删除书架书籍，但这些书源将不再参与搜索、发现和换源。</p><section class="fd-source-delete-selected" aria-label="已选源列表"><h3>已选书源</h3><ul>${selectedSources.map((item) => `<li><strong>${esc(item.title)}</strong><small>${esc(item.domain)} · ${esc(item.group)}</small></li>`).join("")}</ul></section><section class="fd-source-delete-impact" aria-label="删除影响说明"><h3>删除影响</h3><ul>${impactStats.map(([label, value, note]) => `<li><span><strong>${esc(label)}</strong><em>${esc(value)}</em></span><small>${esc(note)}</small></li>`).join("")}</ul></section><label class="fd-source-delete-option"><input type="checkbox" data-source-delete-log-cleanup> <span>同时清除相关检测日志（${esc(String(selectedSources.length))} 个源 · 约 24 条）</span></label><div class="fd-source-delete-actions"><button type="button" data-route-back data-dialog-initial-focus>取消</button><button class="is-danger" type="button" data-route="source-management" data-route-replace data-source-delete-confirm>删除 ${esc(String(selectedSources.length))} 个书源</button></div></section>`
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
    bind("[data-reader-setting-toggle], [data-source-switch], [data-restore-scope], [data-reader-brightness-auto], [data-reader-replace-rule], [data-reader-bookmark-toggle]", "toggle.switch");
    bind("[data-reader-replace-rule-add], [data-reader-replace-rule-save], [data-reader-replace-rule-cancel], [data-reader-theme-edit-save]", "button.activate");
    bind("[data-reader-replace-rule-edit]", "dropdown.option.select");
    bind("[data-reader-replace-rule-delete]", "destructive.confirm.commit");
    bind("[data-reader-replace-scope]", "selection.item.toggle");
    bind("[data-reader-replace-form-field], [data-reader-theme-edit-field]", "input.focus/blur");
    bind("[data-reader-theme-edit-scheme]", "segment.item.switch");
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
    bind("[data-reader-toc-search-input]", "input.focus/blur");
    bind("[data-reader-toc-sort]", "button.activate");
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
    const frame = button?.closest?.(".fd-reader-frame") || null;
    const controlContainer = button?.closest?.(".fd-reader-control-container") || null;
    if (frame && controlContainer && !frame.classList.contains("fd-reader-mode-full")) {
      return controlContainer;
    }
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

  const movableDockViewportClasses = new Set(["compact-landscape"]);

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
    // W3: data-source-switch-select 标记候选行支持连续选中切换，不直接跳转，而是更新预览区。
    const selectAttr = canSwitch ? ` data-source-switch-select="${esc(item.source)}"` : "";
    // B4: 接入 A2 control identity（候选行 controlId 来自 registry，index>10 回退到合成 ID）
    // 并补 candidate-state 终态：selected / unselected / current / disabled。
    const candidateId = window.ReaderSourceSwitchControlIds.candidateRowControlId(index);
    const candidateAttrs = window.ReaderSourceSwitchControlIds.controlIdAttrs(candidateId);
    const candidateState = isCurrent ? "current" : (isSelected ? "selected" : (canSwitch ? "unselected" : "disabled"));
    return `
      <article class="fd-source-candidate-row${isCurrent ? " is-current" : ""}${isSelected ? " is-selected" : ""}${canSwitch ? " is-switchable" : " is-muted"}" data-source-index="${index}" data-source-name="${esc(item.source)}"${selectAttr}${candidateAttrs} ${window.ReaderSourceSwitchControlIds.DATA_SOURCE_SWITCH_CANDIDATE_STATE}="${candidateState}" tabindex="0" role="button" aria-label="选择 ${esc(item.source)}" aria-pressed="${isSelected ? "true" : "false"}" aria-disabled="${canSwitch ? "false" : "true"}">
        <span class="fd-source-row-main">
          <b>${esc(item.source)}</b>
          <em>${esc(speedLabel)}</em>
          <strong>${esc(latestChapterLabel)}</strong>
        </span>
      </article>`;
  }

  // ===== W3 换源流程状态变体渲染器 =====
  // 复用 flowScreen 的 renderFlowShell 结构，通过 comparisonHtml/resultHtml 承载状态变体内容。
  // stepHtml 始终保持阅读控制层可见，确保换源期间 reader 控制层 pass-through。

  function sourceSwitchFlowSessionAttr(appState) {
    const session = (appState && appState.sourceSwitchSession) || "fd-source-switch-session-default";
    // B4: 默认 reduced-motion=false；interaction 层在 bind 时根据 matchMedia 更新为 true。
    return `data-source-switch-session="${esc(session)}" data-source-switch-reduced-motion="false"`;
  }

  function sourceSwitchReaderStep(data, appState, options) {
    const passThrough = options && options.passThrough ? " data-source-switch-control-pass-through=\"true\"" : "";
    return `
        <section class="fd-source-reader-continuity fd-source-control-continuity" aria-label="阅读控制层背景"${passThrough}>
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
        </section>`;
  }

  function sourceSwitchEmptyScreen(data, appState) {
    const flow = data.flow || {};
    const sessionAttr = sourceSwitchFlowSessionAttr(appState);
    return shellKit().renderFlowShell({
      frameClass: "fd-flow-frame fd-source-phone-flow fd-source-switch-geometry fd-source-switch-sheet",
      stepClass: "fd-flow-step fd-source-continuity-slot",
      comparisonClass: "fd-flow-comparison fd-source-window-slot",
      resultClass: "fd-flow-result fd-source-result-slot",
      stateHostClass: "fd-source-unused-slot",
      ariaLabel: "换源空结果",
      stepHtml: sourceSwitchReaderStep(data, appState, { passThrough: true }),
      comparisonHtml: `
        <section class="fd-source-switch-window fd-source-switch-state" ${sessionAttr} data-geometry="sheet" aria-label="换源空结果">
          <div class="fd-source-window-info">
            <i>${icon("source-switch", "fd-small-icon")}</i>
            <strong>换源</strong>
            <span>暂无可用书源</span>
            <button class="fd-source-window-close" type="button" data-route="reader" data-route-replace aria-label="关闭换源窗口"${window.ReaderSourceSwitchControlIds.controlIdAttrs(window.ReaderSourceSwitchControlIds.EMPTY_CLOSE)}>${icon("close", "fd-small-icon")}</button>
          </div>
          <div class="fd-source-switch-empty" aria-label="换源空结果提示">
            <span class="fd-source-switch-state-icon">${icon("info", "fd-medium-icon")}</span>
            <strong>暂无可用书源</strong>
            <p>当前书籍暂未匹配到其他可用书源，可重试或返回阅读。</p>
          </div>
        </section>`,
      resultHtml: `
        <section class="fd-source-switch-result fd-source-switch-state-actions" aria-label="换源空结果操作" ${window.ReaderSourceSwitchControlIds.DATA_SOURCE_SWITCH_STALE}="false">
          <button type="button" data-route="source-switch" data-source-switch-select-action="retry"${window.ReaderSourceSwitchControlIds.controlIdAttrs(window.ReaderSourceSwitchControlIds.EMPTY_RETRY)} aria-disabled="false">重新加载</button>
          <button type="button" data-route="reader" data-route-replace${window.ReaderSourceSwitchControlIds.controlIdAttrs(window.ReaderSourceSwitchControlIds.EMPTY_RETURN_READER)}>返回阅读</button>
        </section>`,
      stateHostHtml: ""
    });
  }

  function sourceSwitchErrorScreen(data, appState) {
    const flow = data.flow || {};
    const errorMessage = (flow && flow.errorMessage) || "候选书源加载失败，请检查网络或书源状态后重试。";
    const sessionAttr = sourceSwitchFlowSessionAttr(appState);
    return shellKit().renderFlowShell({
      frameClass: "fd-flow-frame fd-source-phone-flow fd-source-switch-geometry fd-source-switch-sheet",
      stepClass: "fd-flow-step fd-source-continuity-slot",
      comparisonClass: "fd-flow-comparison fd-source-window-slot",
      resultClass: "fd-flow-result fd-source-result-slot",
      stateHostClass: "fd-source-unused-slot",
      ariaLabel: "换源加载失败",
      stepHtml: sourceSwitchReaderStep(data, appState, { passThrough: true }),
      comparisonHtml: `
        <section class="fd-source-switch-window fd-source-switch-state" ${sessionAttr} data-geometry="sheet" aria-label="换源加载失败">
          <div class="fd-source-window-info">
            <i>${icon("source-switch", "fd-small-icon")}</i>
            <strong>换源</strong>
            <span>加载失败</span>
            <button class="fd-source-window-close" type="button" data-route="reader" data-route-replace aria-label="关闭换源窗口"${window.ReaderSourceSwitchControlIds.controlIdAttrs(window.ReaderSourceSwitchControlIds.ERROR_CLOSE)}>${icon("close", "fd-small-icon")}</button>
          </div>
          <div class="fd-source-switch-error" aria-label="换源加载失败提示">
            <span class="fd-source-switch-state-icon">${icon("warn", "fd-medium-icon")}</span>
            <strong>候选书源加载失败</strong>
            <p>${esc(errorMessage)}</p>
          </div>
        </section>`,
      resultHtml: `
        <section class="fd-source-switch-result fd-source-switch-state-actions" aria-label="换源加载失败操作" ${window.ReaderSourceSwitchControlIds.DATA_SOURCE_SWITCH_STALE}="false">
          <button type="button" data-route="source-switch" data-source-switch-select-action="retry"${window.ReaderSourceSwitchControlIds.controlIdAttrs(window.ReaderSourceSwitchControlIds.ERROR_RETRY)} aria-disabled="false">重试加载</button>
          <button type="button" data-route="reader" data-route-replace${window.ReaderSourceSwitchControlIds.controlIdAttrs(window.ReaderSourceSwitchControlIds.ERROR_RETURN_READER)}>返回阅读</button>
        </section>`,
      stateHostHtml: ""
    });
  }

  function sourceSwitchTimeoutScreen(data, appState) {
    const flow = data.flow || {};
    const sessionAttr = sourceSwitchFlowSessionAttr(appState);
    return shellKit().renderFlowShell({
      frameClass: "fd-flow-frame fd-source-phone-flow fd-source-switch-geometry fd-source-switch-sheet",
      stepClass: "fd-flow-step fd-source-continuity-slot",
      comparisonClass: "fd-flow-comparison fd-source-window-slot",
      resultClass: "fd-flow-result fd-source-result-slot",
      stateHostClass: "fd-source-unused-slot",
      ariaLabel: "换源超时",
      stepHtml: sourceSwitchReaderStep(data, appState, { passThrough: true }),
      comparisonHtml: `
        <section class="fd-source-switch-window fd-source-switch-state" ${sessionAttr} data-geometry="sheet" aria-label="换源超时">
          <div class="fd-source-window-info">
            <i>${icon("source-switch", "fd-small-icon")}</i>
            <strong>换源</strong>
            <span>请求超时</span>
            <button class="fd-source-window-close" type="button" data-route="reader" data-route-replace aria-label="关闭换源窗口"${window.ReaderSourceSwitchControlIds.controlIdAttrs(window.ReaderSourceSwitchControlIds.TIMEOUT_CLOSE)}>${icon("close", "fd-small-icon")}</button>
          </div>
          <div class="fd-source-switch-timeout" aria-label="换源超时提示">
            <span class="fd-source-switch-state-icon">${icon("clock", "fd-medium-icon")}</span>
            <strong>请求超时</strong>
            <p>候选书源加载超时，可能是网络延迟或书源响应过慢，请重试。</p>
          </div>
        </section>`,
      resultHtml: `
        <section class="fd-source-switch-result fd-source-switch-state-actions" aria-label="换源超时操作" ${window.ReaderSourceSwitchControlIds.DATA_SOURCE_SWITCH_STALE}="false">
          <button type="button" data-route="source-switch" data-source-switch-select-action="retry"${window.ReaderSourceSwitchControlIds.controlIdAttrs(window.ReaderSourceSwitchControlIds.TIMEOUT_RETRY)} aria-disabled="false">重试加载</button>
          <button type="button" data-route="reader" data-route-replace${window.ReaderSourceSwitchControlIds.controlIdAttrs(window.ReaderSourceSwitchControlIds.TIMEOUT_RETURN_READER)}>返回阅读</button>
        </section>`,
      stateHostHtml: ""
    });
  }

  function sourceSwitchLoadingScreen(data, appState) {
    const flow = data.flow || {};
    const targetSource = (flow && flow.switchTarget) || (appState && appState.sourceSwitchSelectedSource) || "";
    const sessionAttr = sourceSwitchFlowSessionAttr(appState);
    return shellKit().renderFlowShell({
      frameClass: "fd-flow-frame fd-source-phone-flow fd-source-switch-geometry fd-source-switch-sheet",
      stepClass: "fd-flow-step fd-source-continuity-slot",
      comparisonClass: "fd-flow-comparison fd-source-window-slot",
      resultClass: "fd-flow-result fd-source-result-slot",
      stateHostClass: "fd-source-unused-slot",
      ariaLabel: "换源切换中",
      stepHtml: sourceSwitchReaderStep(data, appState, { passThrough: true }),
      comparisonHtml: `
        <section class="fd-source-switch-window fd-source-switch-state" ${sessionAttr} data-geometry="sheet" aria-label="换源切换中">
          <div class="fd-source-window-info">
            <i>${icon("source-switch", "fd-small-icon")}</i>
            <strong>换源</strong>
            <span>切换中</span>
            <button class="fd-source-window-close" type="button" data-route="source-switch-rollback" data-route-replace aria-label="取消切换"${window.ReaderSourceSwitchControlIds.controlIdAttrs(window.ReaderSourceSwitchControlIds.LOADING_CLOSE)}>${icon("close", "fd-small-icon")}</button>
          </div>
          <div class="fd-source-switch-loading" aria-label="换源切换中提示">
            <div class="fd-source-switch-loading-bar" role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100" aria-label="切换进度">
              <span style="width: 60%"></span>
            </div>
            <strong>正在切换书源${targetSource ? ` · ${esc(targetSource)}` : ""}...</strong>
            <p>正在重新拉取目录与正文，请勿关闭窗口。</p>
          </div>
        </section>`,
      resultHtml: `
        <section class="fd-source-switch-result fd-source-switch-state-actions" aria-label="换源切换中操作" ${window.ReaderSourceSwitchControlIds.DATA_SOURCE_SWITCH_BUSY}="true">
          <button type="button" data-route="source-switch-rollback" data-route-replace${window.ReaderSourceSwitchControlIds.controlIdAttrs(window.ReaderSourceSwitchControlIds.LOADING_CANCEL)} aria-disabled="false">取消切换</button>
        </section>`,
      stateHostHtml: ""
    });
  }

  function sourceSwitchRollbackScreen(data, appState) {
    const flow = data.flow || {};
    const rollbackSource = (flow && flow.rollbackSource) || (flow && flow.currentSource) || "优书网";
    const rollbackError = (flow && flow.rollbackError) || "目标书源切换失败，已自动回滚到原书源。";
    const sessionAttr = sourceSwitchFlowSessionAttr(appState);
    return shellKit().renderFlowShell({
      frameClass: "fd-flow-frame fd-source-phone-flow fd-source-switch-geometry fd-source-switch-sheet",
      stepClass: "fd-flow-step fd-source-continuity-slot",
      comparisonClass: "fd-flow-comparison fd-source-window-slot",
      resultClass: "fd-flow-result fd-source-result-slot",
      stateHostClass: "fd-source-unused-slot",
      ariaLabel: "换源失败回滚",
      stepHtml: sourceSwitchReaderStep(data, appState, { passThrough: true }),
      comparisonHtml: `
        <section class="fd-source-switch-window fd-source-switch-state" ${sessionAttr} data-geometry="sheet" aria-label="换源失败回滚">
          <div class="fd-source-window-info">
            <i>${icon("source-switch", "fd-small-icon")}</i>
            <strong>换源</strong>
            <span>已回滚</span>
            <button class="fd-source-window-close" type="button" data-route="reader" data-route-replace aria-label="关闭换源窗口"${window.ReaderSourceSwitchControlIds.controlIdAttrs(window.ReaderSourceSwitchControlIds.ROLLBACK_CLOSE)}>${icon("close", "fd-small-icon")}</button>
          </div>
          <div class="fd-source-switch-rollback" aria-label="换源失败回滚提示">
            <span class="fd-source-switch-state-icon">${icon("warn", "fd-medium-icon")}</span>
            <strong>切换失败，已回滚到原书源</strong>
            <p>${esc(rollbackError)}</p>
            <div class="fd-source-switch-rollback-banner" role="status" aria-label="回滚横幅">
              <small>原书源</small>
              <strong>${esc(rollbackSource)}</strong>
              <span>阅读进度与位置已保留</span>
            </div>
          </div>
        </section>`,
      resultHtml: `
        <section class="fd-source-switch-result fd-source-switch-state-actions" aria-label="换源回滚操作" ${window.ReaderSourceSwitchControlIds.DATA_SOURCE_SWITCH_STALE}="false">
          <button type="button" data-route="source-switch" data-source-switch-select-action="retry"${window.ReaderSourceSwitchControlIds.controlIdAttrs(window.ReaderSourceSwitchControlIds.ROLLBACK_RETRY)} aria-disabled="false">重新选择书源</button>
          <button type="button" data-route="reader" data-route-replace${window.ReaderSourceSwitchControlIds.controlIdAttrs(window.ReaderSourceSwitchControlIds.ROLLBACK_RETURN_READER)}>返回阅读</button>
        </section>`,
      stateHostHtml: ""
    });
  }

  function sourceSwitchPreviewScreen(data, appState) {
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
    const previewToc = (flow.previewToc && flow.previewToc.length) ? flow.previewToc : [
      "第 30 章 月落",
      "第 31 章 旧友",
      "第 32 章 雨夜",
      "第 33 章 长街",
      "第 34 章 灯下"
    ];
    const latestChapter = selected.latestChapter || selected.chapter || selected.latest || previewToc[previewToc.length - 1] || "章节同步";
    const sessionAttr = sourceSwitchFlowSessionAttr(appState);
    return shellKit().renderFlowShell({
      frameClass: "fd-flow-frame fd-source-phone-flow fd-source-switch-geometry fd-source-switch-sheet",
      stepClass: "fd-flow-step fd-source-continuity-slot",
      comparisonClass: "fd-flow-comparison fd-source-window-slot",
      resultClass: "fd-flow-result fd-source-result-slot",
      stateHostClass: "fd-source-unused-slot",
      ariaLabel: "换源预览",
      stepHtml: sourceSwitchReaderStep(data, appState, { passThrough: true }),
      comparisonHtml: `
        <section class="fd-source-switch-window fd-source-switch-state" ${sessionAttr} data-geometry="sheet" aria-label="换源预览">
          <div class="fd-source-window-info">
            <i>${icon("source-switch", "fd-small-icon")}</i>
            <strong>换源</strong>
            <span>预览 ${esc(selected.source || "候选书源")}</span>
            <button class="fd-source-window-close" type="button" data-route="source-switch" data-route-replace aria-label="返回换源列表"${window.ReaderSourceSwitchControlIds.controlIdAttrs(window.ReaderSourceSwitchControlIds.PREVIEW_CLOSE)}>${icon("close", "fd-small-icon")}</button>
          </div>
          <div class="fd-source-switch-preview" aria-label="换源预览信息">
            <header class="fd-source-switch-preview-header">
              <strong>${esc(selected.source || "优书网")}</strong>
              <small>${esc(selected.state || "可切换")} · ${esc(selected.speed || selected.latency || "未知")} · ${esc(selected.match || "")}</small>
            </header>
            <h3 class="fd-source-switch-preview-title">最新章节</h3>
            <article class="fd-source-switch-preview-latest" aria-label="最新章节">
              <span>${icon("check", "fd-small-icon")}</span>
              <strong>${esc(latestChapter)}</strong>
              <small>同步至该章节</small>
            </article>
            <h3 class="fd-source-switch-preview-title">目录预览</h3>
            <ul class="fd-source-switch-preview-toc" aria-label="目录预览">
              ${previewToc.map((title) => `<li>${esc(title)}</li>`).join("")}
            </ul>
          </div>
        </section>`,
      resultHtml: `
        <section class="fd-source-switch-result fd-source-switch-state-actions" aria-label="换源预览操作">
          <button type="button" data-route="source-switch-loading" data-route-replace${window.ReaderSourceSwitchControlIds.controlIdAttrs(window.ReaderSourceSwitchControlIds.PREVIEW_CONFIRM)} aria-disabled="false">确认换源</button>
          <button type="button" data-route="source-switch" data-route-replace${window.ReaderSourceSwitchControlIds.controlIdAttrs(window.ReaderSourceSwitchControlIds.PREVIEW_RETURN_LIST)}>返回列表</button>
        </section>`,
      stateHostHtml: ""
    });
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
    const selectedSpeedLabel = selected.speed || selected.latency || "未知";
    const selectedLatestLabel = selected.latestChapter || selected.chapter || selected.latest || "章节同步";
    const sessionAttr = sourceSwitchFlowSessionAttr(appState);
    const isResultsVariant = !!(appState && appState.sourceSwitchSelectedSource);
    return shellKit().renderFlowShell({
      // W3: 三套几何通过 fd-source-switch-geometry + fd-source-switch-sheet/split/dock 切换，
      // 配合 data-geometry 属性，CSS 媒体查询在横屏/平板下切换为 split / dock。
      frameClass: "fd-flow-frame fd-source-phone-flow fd-source-reader-continuation fd-source-switch-geometry fd-source-switch-sheet",
      stepClass: "fd-flow-step fd-source-continuity-slot",
      comparisonClass: "fd-flow-comparison fd-source-window-slot",
      resultClass: "fd-flow-result fd-source-result-slot",
      stateHostClass: "fd-source-unused-slot",
      ariaLabel: "换源",
      // W3: reader 控制层 pass-through —— 换源期间不遮挡顶栏/底部控制层/模块导航。
      stepHtml: sourceSwitchReaderStep(data, appState, { passThrough: true }),
      comparisonHtml: `
        <section class="fd-source-switch-window" data-source-switch-window ${sessionAttr} data-geometry="sheet" aria-label="换源窗口">
          <div class="fd-source-window-info">
            <i>${icon("source-switch", "fd-small-icon")}</i>
            <strong>换源</strong>
            <span>按延迟排序</span>
            <button class="fd-source-window-close" type="button" data-route="reader" data-route-replace aria-label="关闭换源窗口"${window.ReaderSourceSwitchControlIds.controlIdAttrs(window.ReaderSourceSwitchControlIds.CLOSE_WINDOW_CONTROL_ID)}>${icon("close", "fd-small-icon")}</button>
          </div>
          <div class="fd-source-candidate-list" data-source-switch-candidate-list aria-label="候选书源列表">
            ${candidates.map((item, index) => sourceCandidateRow(item, index, selectedSource)).join("")}
          </div>
        </section>`,
      resultHtml: `
        <section class="fd-source-switch-result" data-source-switch-preview-region aria-label="换源确认">
          <span>${icon("check", "fd-small-icon")}</span>
          <strong>${esc(selected.source || "优书网")}</strong>
          <small>${esc(selected.state || "当前")} · ${esc(selectedSpeedLabel)} · ${esc(selectedLatestLabel)}</small>
          <p>确认后保持当前阅读位置，仅替换正文来源与章节解析结果。</p>
          <div class="fd-source-switch-result-actions">
            <button type="button" data-route="source-switch-preview" data-route-replace${window.ReaderSourceSwitchControlIds.controlIdAttrs(window.ReaderSourceSwitchControlIds.DEFAULT_PREVIEW)}>预览目录</button>
            <button type="button" data-route="source-switch-loading" data-route-replace${window.ReaderSourceSwitchControlIds.controlIdAttrs(window.ReaderSourceSwitchControlIds.DEFAULT_CONFIRM)} aria-disabled="false">确认换源</button>
          </div>
          ${isResultsVariant ? `
            <div class="fd-source-switch-result-toast" role="status" aria-label="换源结果提示"><span>${icon("check", "fd-small-icon")}</span><small>已切换到 ${esc(selected.source || "优书网")}</small></div>
            <div class="fd-source-switch-reload-progress" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" aria-label="章节与正文重载进度">
              <span style="width: 100%"></span>
              <small>章节与正文已重载完成</small>
            </div>
            <div class="fd-source-switch-result-actions">
              <button type="button" data-route="source-switch-error" data-route-replace${window.ReaderSourceSwitchControlIds.controlIdAttrs(window.ReaderSourceSwitchControlIds.DEFAULT_VIEW_FAILED)}>查看失败重试</button>
              <button type="button" data-route="source-switch-rollback" data-route-replace${window.ReaderSourceSwitchControlIds.controlIdAttrs(window.ReaderSourceSwitchControlIds.DEFAULT_VIEW_ROLLBACK)}>查看回滚确认</button>
            </div>
          ` : ""}
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

  function routeTitle(route) {
    return String((routes[route] && routes[route].title) || route).replace(/（.*$/, "").trim();
  }

  function withAppState(appState, overrides) {
    return Object.assign({}, appState || {}, overrides || {});
  }

  function mainTabForRoute(route) {
    if (route === "settings" || route.startsWith("settings") || route.startsWith("global") || route.startsWith("about") || route.startsWith("sync") || route.startsWith("backup") || route.startsWith("progress") || route.startsWith("remote")) {
      return "settings";
    }
    if (route === "rss" || route.startsWith("rss")) {
      return "rss";
    }
    if (route === "discover" || route.startsWith("discover")) {
      return "discover";
    }
    return "bookshelf";
  }

  function contractStaticContent(route, options) {
    const title = options?.title || routeTitle(route);
    const shell = options?.shell || routes[route]?.shell || "LibraryShell";
    const summary = options?.summary || "该 RouteId 已纳入 canonical demo 静态渲染闭环，用于平台实现前的结构、状态和合同对齐。";
    const rows = options?.rows || [
      ["RouteId", route],
      ["Shell", shell],
      ["Source", "frontend-demo/route-contract.js"],
      ["Boundary", "静态 demo/contract，不替代平台设备证据"]
    ];
    return `
      <section class="fd-search-state fd-contract-static-state" data-contract-static-route="${esc(route)}" aria-label="${esc(title)}">
        <span>${icon(options?.icon || "info", "fd-medium-icon")}</span>
        <h2>${esc(title)}</h2>
        <p>${esc(summary)}</p>
        <section class="fd-reader-debug-grid" aria-label="${esc(title)}合同信息">
          ${rows.map(([label, value]) => `<article><small>${esc(label)}</small><strong>${esc(value)}</strong></article>`).join("")}
        </section>
        ${options?.actions ? `<div class="fd-action-row">${options.actions.map((action) => `<button type="button"${action.route ? ` data-route="${esc(action.route)}"` : ""}>${esc(action.label)}</button>`).join("")}</div>` : ""}
      </section>`;
  }

  function contractStaticRouteScreen(data, route, appState, options) {
    const meta = routes[route] || {};
    const shell = options?.shell || meta.shell || "LibraryShell";
    const title = options?.title || routeTitle(route);
    const contentHtml = contractStaticContent(route, Object.assign({ title, shell }, options));
    if (shell === "MainTabShell") {
      return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone"), {
        data,
        title,
        activeType: options?.activeType || mainTabForRoute(route),
        actions: [],
        ariaLabel: title,
        contentHtml,
        stateHostHtml: mainTabFeedbackHtml(appState)
      }));
    }
    if (shell === "ReaderShell") {
      return shellKit().renderReaderShell({
        frameClass: "fd-reader-frame fd-reader-flow-frame fd-reader-mode-full fd-reader-utility-frame",
        frameStyle: readerThemeStyle(data, appState),
        readingSurfaceClass: "fd-reading-surface",
        overlayClass: "fd-reader-overlay fd-reader-full-overlay",
        bottomSheetHostClass: "fd-reader-full-host",
        moduleNavClass: "fd-reader-module-nav fd-reader-module-nav-empty",
        stateHostClass: "fd-reader-state-host",
        stateHostHtml: `<div class="fd-reader-global-brightness-dim" data-reader-brightness-dim aria-hidden="true" style="${readerBrightnessStyle(data, appState)}"></div>`,
        ariaLabel: title,
        readingSurfaceHtml: sharedReaderSurface(data, "", appState),
        overlayHtml: readerTopOverlay(data, Object.assign({}, appState, { readerMoreOpen: false })),
        bottomSheetHtml: readerUtilityPanel(title, options?.icon || "info", route, contentHtml),
        moduleNavHtml: ""
      });
    }
    if (shell === "SettingsShell") {
      return shellKit().renderSettingsShell(Object.assign(phoneShellClasses("fd-settings-phone"), {
        data,
        title,
        ariaLabel: title,
        topBarClass: "fd-back-bar",
        contentClass: "fd-phone-content fd-settings-content",
        toastHostClass: "fd-toast-host",
        dialogHostClass: "fd-dialog-host",
        stateHostClass: "fd-settings-state-host",
        contentHtml
      }));
    }
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data,
      title,
      ariaLabel: title,
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      contentHtml
    }));
  }

  function searchStateScreen(data, route) {
    const states = {
      "search-loading": {
        icon: "refresh",
        title: "正在搜索",
        summary: "搜索请求已发起，保留返回和输入焦点；结果回来后替换为 search-results。",
        actions: [{ label: "取消", route: "search-home" }]
      },
      "search-empty": {
        icon: "search",
        title: "没有搜索结果",
        summary: "当前关键词没有匹配书籍，可调整范围、切换书源或回到发现入口。",
        actions: [{ label: "重新搜索", route: "search-home" }, { label: "去发现", route: "discover" }]
      },
      "search-error": {
        icon: "warning",
        title: "搜索失败",
        summary: "书源请求失败或规则返回异常，平台实现需要保留重试、切换源和错误详情入口。",
        actions: [{ label: "重试", route: "search-loading" }, { label: "书源管理", route: "source-management" }]
      }
    };
    const state = states[route] || states["search-empty"];
    return contractStaticRouteScreen(data, route, null, Object.assign({ shell: "LibraryShell" }, state));
  }

  function globalStateScreen(data, route, appState) {
    const states = {
      "global-loading": ["refresh", "全局加载中", "应用级加载态，保留当前导航宿主并展示可取消或可等待的进度反馈。"],
      "global-empty": ["info", "全局空状态", "用于缺少可展示内容的跨模块兜底状态，平台实现需提供下一步入口。"],
      "global-error": ["warning", "全局错误状态", "用于 route 或数据层失败后的兜底错误页，必须可重试或返回来源页。"],
      "offline-state": ["offline", "离线状态", "网络不可用时展示缓存可读能力和重试入口。"],
      "permission-required": ["permission", "权限需要", "本地导入、文件访问或系统能力缺失时展示权限说明和系统设置入口。"],
      "state-error": ["warning", "状态错误", "state/error/{message} 的静态合同页，平台实现需注入真实错误消息。"],
      "state-offline": ["offline", "状态离线", "state/offline 的静态合同页，平台实现需保留来源 route 和离线缓存动作。"],
      "sync-error": ["warning", "同步错误", "同步与备份失败时展示重试、重新配置和查看日志入口。"]
    };
    const [iconName, title, summary] = states[route] || states["global-error"];
    return contractStaticRouteScreen(data, route, appState, {
      shell: "SettingsShell",
      icon: iconName,
      title,
      summary,
      actions: [{ label: "返回设置", route: "settings" }, { label: "重试", route: route === "sync-error" ? "sync-backup" : "global-loading" }]
    });
  }

  function sourceDebugRunningScreen(data) {
    return sourceShell(data, "书源调测运行中", `
      <section class="fd-source-debug">
        <article class="fd-source-detail-head fd-source-debug-context"><span><strong>正在调测正文模块</strong><small>笔趣阁 · 第 128 章 风雨夜</small></span>${sourceBadge({ status: "运行中", tone: "warn" })}</article>
        ${sourceDebugModules("content")}
        <section class="fd-source-detect-summary">
          <strong>4/5 项完成</strong>
          <span>正在请求正文页面并执行内容选择器</span>
        </section>
        ${restoreStageList([
          { title: "站点访问", meta: "200 OK · 126ms", status: "完成", tone: "good", progress: "100%", done: true },
          { title: "搜索规则", meta: "关键词返回 12 条", status: "完成", tone: "good", progress: "100%", done: true },
          { title: "详情规则", meta: "字段解析成功", status: "完成", tone: "good", progress: "100%", done: true },
          { title: "目录规则", meta: "812 章 · URL 有效", status: "完成", tone: "good", progress: "100%", done: true },
          { title: "正文规则", meta: "正在匹配 #content@text", status: "运行中", tone: "warn", progress: "62%", active: true }
        ])}
      </section>`, {
        bottomActionHtml: sourceBottomActions([
          { label: "取消", route: "source-debug" },
          { label: "查看日志", route: "source-debug-content-log" }
        ])
      });
  }

  function renderRoute(route, data, options, appState) {
    switch (route) {
      case "bookshelf":
        return mainTabBookshelf(data, appState);
      case "bookshelf-cover-mode":
      case "app-shell":
      case "main-tabs":
        return mainTabBookshelf(data, withAppState(appState, { bookshelfView: "cover" }));
      case "bookshelf-list-mode":
        return mainTabBookshelf(data, withAppState(appState, { bookshelfView: "list" }));
      case "bookshelf-book-more-menu":
        return mainTabBookshelf(data, withAppState(appState, { bookFocusOpen: true }));
      case "discover":
      case "discover-home":
      case "discover-control":
      case "discover-sort":
      case "discover-entry-ranking":
      case "discover-entry-bestseller":
      case "discover-entry-category":
      case "discover-entry-source":
      case "discover-entry-finished":
      case "discover-entry-latest":
      case "discover-entry-new":
      case "discover-entry-booklist":
      case "discover-filter-keyword":
      case "discover-filter-male":
      case "discover-filter-female":
      case "discover-filter-source-type":
      case "discover-filter-category":
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
      case "discover-cache-empty":
      case "discover-cache-stale":
      case "discover-cache-fresh":
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
      case "rss-source-category-novel":
      case "rss-source-category-tech":
      case "rss-source-category-booklist":
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
          variant: "browser",
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
      case "rss-source-add":
        return rssSourceEditScreen(data, appState);
      case "rss-source-delete-confirm":
        return rssConfirmScreen(data, {
          title: "删除订阅源",
          variant: "delete",
          icon: "trash",
          heading: "删除 GitHub Releases？",
          copy: "删除后该订阅源不会再刷新，已缓存文章和阅读记录可按平台策略保留或一并清理。",
          cancelRoute: "rss-source-actions",
          confirmRoute: "rss-subscription-management",
          confirmLabel: "确认删除"
        }, appState);
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
          variant: "export-result",
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
          variant: "pin",
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
          variant: "disable",
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
          variant: "batch-disable",
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
          variant: "record-clear",
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
      case "rss-rule-subscription-create":
        return rssRuleSubscriptionEditScreen(data, appState);
      case "rss-rule-subscription-test":
        return rssRuleSubscriptionTestScreen(data, appState);
      case "rss-rule-subscription-apply":
        return rssConfirmScreen(data, {
          title: "应用订阅更新",
          variant: "apply",
          icon: "sync",
          heading: "应用社区 RSS 源订阅更新？",
          copy: "将新增 2 个源、更新 1 个规则，并跳过 1 个本地冲突。登录凭据不会被覆盖。",
          cancelRoute: "rss-rule-subscription-detail",
          confirmRoute: "rss-source-import",
          confirmLabel: "进入导入预览"
        }, appState);
      case "rss-favorite-groups":
        return rssFavoriteGroupsScreen(data, appState);
      case "rss-favorite-add":
        return rssConfirmScreen(data, {
          title: "添加收藏",
          variant: "favorite-add",
          icon: "bookmark",
          heading: "收藏当前 RSS 条目？",
          copy: "收藏后该条目会出现在 RSS 收藏列表，并保留原订阅源、阅读状态和分组信息。",
          cancelRoute: "rss-detail",
          confirmRoute: "rss-starred",
          confirmLabel: "确认收藏"
        }, appState);
      case "rss-favorite-remove":
        return rssConfirmScreen(data, {
          title: "移除收藏",
          icon: "trash",
          heading: "从收藏中移除？",
          copy: "只移除收藏关系，不删除原文、订阅源或阅读记录。",
          cancelRoute: "rss-starred",
          confirmRoute: "rss-starred",
          confirmLabel: "确认移除"
        }, appState);
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
      case "search-home":
        return bookSearchScreen(data, withAppState(appState, { bookSearchPhase: "before" }));
      case "search-results":
        return bookSearchScreen(data, withAppState(appState, { bookSearchPhase: "after" }));
      case "search-loading":
        return bookSearchScreen(data, withAppState(appState, { bookSearchPhase: "after", bookSearchState: "loading" }));
      case "search-empty":
        return bookSearchScreen(data, withAppState(appState, { bookSearchPhase: "after", bookSearchState: "empty" }));
      case "search-error":
        return bookSearchScreen(data, withAppState(appState, { bookSearchPhase: "after", bookSearchState: "error" }));
      case "book-detail":
      case "book-detail-toc-preview":
        return libraryScreen(data, appState);
      case "book-directory":
        return bookDirectoryScreen(data, appState);
      case "bookshelf-empty":
        return bookshelfEmptyScreen(data, appState);
      case "book-batch-management":
        return bookBatchManagementScreen(data, appState);
      case "sort-filter":
        return sortFilterScreen(data, appState);
      case "group-management":
      case "bookshelf-group-management":
        return groupManagementScreen(data, appState);
      case "local-import":
        return localImportScreen(data);
      case "import-permission-denied":
        return importPermissionDeniedScreen(data);
      case "import-format-unsupported":
        return importFormatUnsupportedScreen(data);
      case "import-empty-file":
        return importEmptyFileScreen(data);
      case "import-parsing":
        return importParsingScreen(data);
      case "import-duplicate":
        return importDuplicateScreen(data);
      case "import-conflict-resolve":
        return importConflictResolveScreen(data);
      case "import-partial-success":
        return importPartialSuccessScreen(data);
      case "import-result-detail":
        return importResultDetailScreen(data);
      case "immersive-reading":
      case "reader_content":
      case "reader":
      case "control-layer-base-v2":
      case "toc-bookmarks":
      case "reader-directory-overlay-v2":
      case "reader-appearance":
      case "reader-appearance-overlay-v2":
      case "reader-night-state-v2":
      case "tts":
      case "reader-tts-overlay-v2":
      case "reader-settings":
      case "reader-settings-overlay-v2":
      case "auto-page":
      case "reader-auto-scroll-overlay-v2":
      case "content-search":
      case "reader-search-overlay-v2":
      case "content-replacement":
      case "reader-replace-overlay-v2":
        return readerStateScreen(data, route, options, appState);
      case "reader-replace-page":
        return readerReplacePage(data, route, appState);
      case "reader-replace-delete-confirm":
        return readerReplaceDeleteConfirmScreen(data, route, appState);
      case "reader-replace-apply-result":
        return readerReplaceApplyResultScreen(data, route, appState);
      case "reader-replace-import-export":
        return readerReplaceImportExportScreen(data, route, appState);
      case "reader-replace-preview":
        return readerReplacePreviewScreen(data, route, appState);
      case "reader-toc-loading":
        return readerTocLoadingScreen(data, route, appState);
      case "reader-toc-offline":
        return readerTocOfflineScreen(data, route, appState);
      case "reader-toc-error":
        return readerTocErrorScreen(data, route, appState);
      case "reader-content-loading":
        return readerContentLoadingScreen(data, route, appState);
      case "reader-content-offline":
        return readerContentOfflineScreen(data, route, appState);
      case "reader-content-error":
        return readerContentErrorScreen(data, route, appState);
      case "reader-page-boundary-first":
        return readerPageBoundaryFirstScreen(data, route, appState);
      case "reader-page-boundary-last":
        return readerPageBoundaryLastScreen(data, route, appState);
      case "reader-progress-restore":
        return readerProgressRestoreScreen(data, route, appState);
      case "reader-background-restore":
        return readerBackgroundRestoreScreen(data, route, appState);
      case "reader-full-directory":
      case "reader-full-tts":
      case "reader-full-appearance":
      case "reader-full-settings":
      case "reader-full-font":
      case "reader-full-theme":
      case "reader-full-theme-edit":
      case "reader-full-layout":
      case "reader-full-page-turn":
      case "reader-font-import-confirm":
      case "reader-font-delete-confirm":
      case "reader-font-fallback":
      case "reader-theme-new":
      case "reader-theme-delete-confirm":
      case "reader-typography-reset-confirm":
        return readerFullPageScreen(data, route, appState);
      case "reader-book-cache":
      case "reader-debug-info":
        return readerUtilityScreen(data, route, appState);
      case "source-switch":
        return flowScreen(data, appState);
      case "source-switch-results":
        return flowScreen(data, withAppState(appState, { sourceSwitchSelectedSource: "起点导入" }));
      case "source-switch-empty":
        return sourceSwitchEmptyScreen(data, appState);
      case "source-switch-error":
        return sourceSwitchErrorScreen(data, appState);
      case "source-switch-timeout":
        return sourceSwitchTimeoutScreen(data, appState);
      case "source-switch-loading":
        return sourceSwitchLoadingScreen(data, appState);
      case "source-switch-rollback":
        return sourceSwitchRollbackScreen(data, appState);
      case "source-switch-preview":
        return sourceSwitchPreviewScreen(data, appState);
      case "source-management":
      case "source-settings-entry":
        return sourceManagementScreen(data, appState);
      case "source-import-options":
      case "source-add":
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
      case "source-test-result":
        return sourceDetectScreen(data);
      case "source-rule-edit":
      case "source-edit":
        return sourceRuleEditScreen(data);
      case "source-debug":
        return sourceDebugScreen(data);
      case "source-debug-running":
        return sourceDebugRunningScreen(data);
      case "source-debug-result":
        return sourceDebugResultScreen(data, "source-debug-search-result");
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
      case "global-settings":
      case "bookshelf-search-settings":
      case "sync-backup":
        return settingsScreen(data, route, appState);
      case "about-feedback":
        return settingsScreen(data, "about-feedback", appState);
      case "about":
      case "about-version":
        return settingsScreen(data, route, appState);
      case "sync-settings-entry":
      case "backup-settings":
      case "progress-sync":
      case "progress-sync-status":
        return settingsScreen(data, route, appState);
      case "remote-webdav-books":
        return remoteWebdavBooksScreen(data, appState);
      case "reading-settings-entry":
        return settingsScreen(data, route, appState);
      case "global-loading":
      case "global-empty":
      case "global-error":
      case "offline-state":
      case "permission-required":
      case "state-error":
      case "state-offline":
      case "sync-error":
        return globalStateScreen(data, route, appState);
      case "restore-confirm":
      case "restore-scopes":
      case "restore-preview":
      case "restore-progress":
      case "restore-running":
      case "restore-conflict":
      case "restore-result":
        return restoreFlowScreen(data, route === "restore-scopes" || route === "restore-preview" ? "restore-confirm" : route === "restore-running" ? "restore-progress" : route, appState);
      case "webdav-config":
        return settingsScreen(data, route, appState);
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
    const settingDefaults = readerControlSettingsConfig(data).defaults;
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
      readerPageMode: readerPageModeCssValue(settingDefaults.pageMode),
      readerPageAnimation: readerPageAnimationCssValue(settingDefaults.pageAnimation),
      readerMoreOpen: false,
      readerTocMode: "directory",
      readerTocQuery: "",
      readerTocSort: "asc",
      readerBookmarkIndices: readerChapters(data)
        .map((chapter, index) => chapterHasMarker(chapter, "书签") ? index : -1)
        .filter((index) => index >= 0),
      readerTheme: readerDefaultThemeValue(data),
      readerColorSchemeMode: "system",
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
      replaceRules: [],
      replaceRuleFormOpen: false,
      replaceRuleEditingId: "",
      replaceRuleDraft: { title: "", pattern: "", replacement: "", scope: ["chapter"] },
      replaceRuleError: "",
      replaceRuleDeleteTarget: "",
      replaceRuleApplyResult: "",
      replaceRuleApplyCount: 0,
      replaceRuleApplyError: "",
      replaceRuleApplyUndoable: false,
      replaceRuleImportStatus: "",
      replaceRuleImportPreview: null,
      readerCustomThemes: [],
      readerDefaultDayTheme: "paper",
      readerDefaultNightTheme: "paper-night",
      readerImportedFonts: [],
      readerFontImportStatus: "",
      readerThemeEditDraft: { name: "", bg: "#fff7ec", ink: "#2b241d", scheme: "day", backgroundImage: "", backgroundOverlay: 0.18 },
      readerThemeEditError: "",
      readerControlStageOrigin: "reader",
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
      readerTextSelectionTimer: null,
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
    // ===== W4 持久化层 =====
    const W4_STORAGE_KEY = "reader-w4-config";
    function w4LoadPersistedConfig() {
      try {
        const raw = localStorage.getItem(W4_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    }
    function w4SavePersistedConfig() {
      try {
        const config = {
          readerTypography: appState.readerTypography,
          readerPageSpace: appState.readerPageSpace,
          readerImportedFonts: appState.readerImportedFonts,
          readerCustomThemes: appState.readerCustomThemes,
          readerDefaultDayTheme: appState.readerDefaultDayTheme,
          readerDefaultNightTheme: appState.readerDefaultNightTheme,
          readerTheme: appState.readerTheme,
          readerColorSchemeMode: appState.readerColorSchemeMode,
          readerReplacementRules: appState.readerReplacementRules,
          replaceRules: appState.replaceRules
        };
        localStorage.setItem(W4_STORAGE_KEY, JSON.stringify(config));
        appState.settingsToast = "W4 配置已写入 localStorage（含 W5 替换规则）";
      } catch (e) {
        appState.settingsToast = "W4 配置写入失败";
      }
    }
    function w4SimulateRestart() {
      const persisted = w4LoadPersistedConfig();
      if (!persisted) {
        appState.settingsToast = "W4 暂无持久化配置，已使用默认值";
        return;
      }
      if (persisted.readerTypography) appState.readerTypography = persisted.readerTypography;
      if (persisted.readerPageSpace) appState.readerPageSpace = persisted.readerPageSpace;
      if (Array.isArray(persisted.readerImportedFonts)) appState.readerImportedFonts = persisted.readerImportedFonts;
      if (Array.isArray(persisted.readerCustomThemes)) appState.readerCustomThemes = persisted.readerCustomThemes;
      if (persisted.readerDefaultDayTheme) appState.readerDefaultDayTheme = persisted.readerDefaultDayTheme;
      if (persisted.readerDefaultNightTheme) appState.readerDefaultNightTheme = persisted.readerDefaultNightTheme;
      if (persisted.readerTheme) appState.readerTheme = persisted.readerTheme;
      if (persisted.readerColorSchemeMode) appState.readerColorSchemeMode = persisted.readerColorSchemeMode;
      if (persisted.readerReplacementRules && typeof persisted.readerReplacementRules === "object") {
        appState.readerReplacementRules = persisted.readerReplacementRules;
      }
      if (Array.isArray(persisted.replaceRules)) {
        appState.replaceRules = persisted.replaceRules;
      }
      appState.settingsToast = "W4 已从 localStorage 恢复配置（含 W5 替换规则，模拟重启）";
    }
    function w4ClearPersistedConfig() {
      try {
        localStorage.removeItem(W4_STORAGE_KEY);
        appState.settingsToast = "W4 持久化配置已清除";
      } catch (e) {
        appState.settingsToast = "W4 清除失败";
      }
    }
    // 初始化时加载持久化配置
    w4SimulateRestart();
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
    const colorSchemeMediaQuery = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
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
    const handleReaderColorSchemeChange = () => {
      if (appState.readerColorSchemeMode === "system" && hasRenderedInitialRoute) {
        renderActiveRoute(routeStack[routeStack.length - 1] || "bookshelf");
      }
    };
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
    if (colorSchemeMediaQuery) {
      if (typeof colorSchemeMediaQuery.addEventListener === "function") {
        colorSchemeMediaQuery.addEventListener("change", handleReaderColorSchemeChange);
      } else if (typeof colorSchemeMediaQuery.addListener === "function") {
        colorSchemeMediaQuery.addListener(handleReaderColorSchemeChange);
      }
    }
    syncMotionPreference();
    target.__readerAdaptiveViewportCleanup = () => {
      clearReaderSessionCapsuleTimer(appState);
      clearFirstOpenMotionTimer(appState);
      clearViewportOrientationMotionTimer(appState);
      clearMotionInterruptTimer(appState);
      if (appState.dropdownSwitchTimer) {
        window.clearTimeout(appState.dropdownSwitchTimer);
        appState.dropdownSwitchTimer = null;
      }
      if (appState.readerTextSelectionTimer) {
        window.clearTimeout(appState.readerTextSelectionTimer);
        appState.readerTextSelectionTimer = null;
      }
      if (appState.readerChapterDownloadTimers) {
        Object.values(appState.readerChapterDownloadTimers).forEach((timer) => {
          if (timer) window.clearTimeout(timer);
        });
        appState.readerChapterDownloadTimers = {};
      }
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
      if (colorSchemeMediaQuery) {
        if (typeof colorSchemeMediaQuery.removeEventListener === "function") {
          colorSchemeMediaQuery.removeEventListener("change", handleReaderColorSchemeChange);
        } else if (typeof colorSchemeMediaQuery.removeListener === "function") {
          colorSchemeMediaQuery.removeListener(handleReaderColorSchemeChange);
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
      const readerTarget = readerControlBackRoute(fromRoute, appState);
      if (readerTarget && routes[readerTarget]) {
        replaceTopRoute(readerTarget, {
          id: "app.route.pop.backward",
          action: "reader-stage-back",
          from: fromRoute,
          to: readerTarget
        });
        return;
      }
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
      const chapterRouteSignature = routeStack.join("|");
      appState.readerChapterDownloadTimers[key] = window.setTimeout(() => {
        if (routeStack.join("|") !== chapterRouteSignature) return;
        appState.readerChapterDownloads[key] = "complete";
        appState.readerChapterDownloadCompleted[key] = true;
        renderCurrentRoute();
        appState.readerChapterDownloadTimers[`${key}:complete`] = window.setTimeout(() => {
          if (routeStack.join("|") !== chapterRouteSignature) return;
          appState.readerChapterDownloads[key] = "cached";
          delete appState.readerChapterDownloadCompleted[key];
          renderCurrentRoute();
        }, 720);
      }, 880);
    };
    const applyReaderPageAction = (action) => {
      // 竖向翻页模式：不响应翻页动作（连续滚动模式）
      if (appState.readerPageMode === "vertical") {
        return;
      }
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
      if (target.custom) {
        const idx = (appState.replaceRules || []).findIndex((rule) => rule.id === ruleId);
        if (idx >= 0) {
          appState.replaceRules = appState.replaceRules.slice();
          appState.replaceRules[idx] = Object.assign({}, appState.replaceRules[idx], { enabled: !target.enabled });
        }
      } else {
        appState.readerReplacementRules = Object.assign({}, appState.readerReplacementRules, {
          [ruleId]: !target.enabled
        });
      }
      renderCurrentRoute();
    };
    const resetReplaceRuleDraft = () => {
      appState.replaceRuleDraft = { title: "", pattern: "", replacement: "", scope: ["chapter"] };
      appState.replaceRuleEditingId = "";
      appState.replaceRuleError = "";
    };
    const applyReaderReplaceRuleAdd = () => {
      resetReplaceRuleDraft();
      appState.replaceRuleFormOpen = true;
      renderCurrentRoute();
    };
    const applyReaderReplaceRuleEdit = (ruleId) => {
      const target = readerReplacementRules(appState).find((rule) => rule.id === ruleId);
      if (!target) return;
      appState.replaceRuleDraft = {
        title: target.title,
        pattern: target.pattern || "",
        replacement: target.replacement || "",
        scope: Array.isArray(target.scope) ? target.scope.slice() : ["chapter"]
      };
      appState.replaceRuleEditingId = ruleId;
      appState.replaceRuleError = "";
      appState.replaceRuleFormOpen = true;
      renderCurrentRoute();
    };
    const applyReaderReplaceRuleDelete = (ruleId) => {
      appState.replaceRules = (appState.replaceRules || []).filter((rule) => rule.id !== ruleId);
      if (appState.replaceRuleEditingId === ruleId) {
        resetReplaceRuleDraft();
        appState.replaceRuleFormOpen = false;
      }
      renderCurrentRoute();
    };
    const applyReaderReplaceRuleCancel = () => {
      resetReplaceRuleDraft();
      appState.replaceRuleFormOpen = false;
      renderCurrentRoute();
    };
    const applyReaderReplaceFormField = (field, value) => {
      appState.replaceRuleDraft = Object.assign({}, appState.replaceRuleDraft, { [field]: value });
      appState.replaceRuleError = "";
      renderCurrentRoute();
    };
    const applyReaderReplaceScopeToggle = (scope) => {
      const draft = appState.replaceRuleDraft || { title: "", pattern: "", replacement: "", scope: ["chapter"] };
      const current = Array.isArray(draft.scope) ? draft.scope.slice() : [];
      const idx = current.indexOf(scope);
      if (idx >= 0) {
        current.splice(idx, 1);
      } else {
        current.push(scope);
      }
      if (current.length === 0) current.push("chapter");
      appState.replaceRuleDraft = Object.assign({}, draft, { scope: current });
      renderCurrentRoute();
    };
    const applyReaderReplaceRuleSave = () => {
      const draft = appState.replaceRuleDraft || {};
      const title = String(draft.title || "").trim();
      const pattern = String(draft.pattern || "").trim();
      const replacement = String(draft.replacement || "");
      const scope = Array.isArray(draft.scope) && draft.scope.length ? draft.scope.slice() : ["chapter"];
      if (!title) {
        appState.replaceRuleError = "请填写规则名称";
        renderCurrentRoute();
        return;
      }
      if (!pattern) {
        appState.replaceRuleError = "请填写正则表达式";
        renderCurrentRoute();
        return;
      }
      try {
        new RegExp(pattern);
      } catch (error) {
        appState.replaceRuleError = `正则无效：${error.message}`;
        renderCurrentRoute();
        return;
      }
      const editingId = appState.replaceRuleEditingId;
      if (editingId) {
        const idx = (appState.replaceRules || []).findIndex((rule) => rule.id === editingId);
        if (idx >= 0) {
          appState.replaceRules = appState.replaceRules.slice();
          appState.replaceRules[idx] = Object.assign({}, appState.replaceRules[idx], { title, pattern, replacement, scope });
        }
      } else {
        const newId = `custom-${Date.now()}`;
        appState.replaceRules = (appState.replaceRules || []).concat([{ id: newId, title, pattern, replacement, scope, enabled: true, custom: true }]);
      }
      resetReplaceRuleDraft();
      appState.replaceRuleFormOpen = false;
      renderCurrentRoute();
    };
    // ===== W5 新增 apply 函数 =====
    const applyReaderReplaceRuleMove = (ruleId, direction) => {
      const rules = Array.isArray(appState.replaceRules) ? appState.replaceRules.slice() : [];
      const idx = rules.findIndex((rule) => rule.id === ruleId);
      if (idx < 0) return;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= rules.length) return;
      const tmp = rules[idx];
      rules[idx] = rules[targetIdx];
      rules[targetIdx] = tmp;
      appState.replaceRules = rules;
      renderCurrentRoute();
    };
    const applyReaderReplaceRuleDeleteTarget = (ruleId) => {
      appState.replaceRuleDeleteTarget = ruleId;
      replaceTopRoute("reader-replace-delete-confirm");
    };
    const applyReaderReplaceRuleDeleteConfirm = (ruleId) => {
      appState.replaceRules = (appState.replaceRules || []).filter((rule) => rule.id !== ruleId);
      if (appState.replaceRuleEditingId === ruleId) {
        resetReplaceRuleDraft();
        appState.replaceRuleFormOpen = false;
      }
      appState.replaceRuleDeleteTarget = "";
      replaceTopRoute("content-replacement");
    };
    const applyReaderReplaceApply = () => {
      const enabledRules = readerReplacementRules(appState).filter((rule) => rule.enabled);
      let validCount = 0;
      let hasInvalid = false;
      for (const rule of enabledRules) {
        try {
          new RegExp(rule.pattern || "");
          validCount += 1;
        } catch (e) {
          hasInvalid = true;
        }
      }
      if (hasInvalid && validCount === 0) {
        appState.replaceRuleApplyResult = "failure";
        appState.replaceRuleApplyError = "所有启用规则的正则均无效";
        appState.replaceRuleApplyCount = 0;
        appState.replaceRuleApplyUndoable = false;
      } else {
        appState.replaceRuleApplyResult = "success";
        appState.replaceRuleApplyCount = validCount;
        appState.replaceRuleApplyError = hasInvalid ? "部分规则正则无效，已跳过" : "";
        appState.replaceRuleApplyUndoable = true;
      }
      replaceTopRoute("reader-replace-apply-result");
    };
    const applyReaderReplaceApplyUndo = () => {
      appState.replaceRuleApplyResult = "undone";
      appState.replaceRuleApplyUndoable = false;
      renderCurrentRoute();
    };
    const applyReaderReplaceExport = () => {
      const allRules = readerReplacementRules(appState);
      const exportJson = JSON.stringify({
        version: "w5-replace-rules",
        exportedAt: new Date().toISOString(),
        rules: allRules.map((rule) => ({
          id: rule.id, title: rule.title, pattern: rule.pattern,
          replacement: rule.replacement, scope: rule.scope,
          enabled: rule.enabled, custom: rule.custom
        }))
      }, null, 2);
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(exportJson);
          appState.replaceRuleImportStatus = "已复制到剪贴板";
        } else {
          appState.replaceRuleImportStatus = "剪贴板不可用，请手动复制上方 JSON";
        }
      } catch (e) {
        appState.replaceRuleImportStatus = "复制失败";
      }
      renderCurrentRoute();
    };
    const applyReaderReplaceImportPreview = () => {
      const textarea = screenHost.querySelector("[data-reader-replace-import-input]");
      const raw = textarea ? textarea.value : "";
      if (!raw.trim()) {
        appState.replaceRuleImportStatus = "请先粘贴 JSON";
        appState.replaceRuleImportPreview = null;
        renderCurrentRoute();
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.rules)) {
          throw new Error("JSON 缺少 rules 数组");
        }
        appState.replaceRuleImportPreview = { rules: parsed.rules };
        appState.replaceRuleImportStatus = `预览成功，共 ${parsed.rules.length} 条规则`;
      } catch (e) {
        appState.replaceRuleImportPreview = null;
        appState.replaceRuleImportStatus = `JSON 解析失败：${e.message}`;
      }
      renderCurrentRoute();
    };
    const applyReaderReplaceImportConfirm = () => {
      const preview = appState.replaceRuleImportPreview;
      if (!preview || !Array.isArray(preview.rules)) {
        appState.replaceRuleImportStatus = "请先预览导入";
        renderCurrentRoute();
        return;
      }
      const imported = preview.rules.map((rule) => ({
        id: rule.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: String(rule.title || "导入规则"),
        pattern: String(rule.pattern || ""),
        replacement: String(rule.replacement || ""),
        scope: Array.isArray(rule.scope) ? rule.scope : ["chapter"],
        enabled: rule.enabled !== false,
        custom: true
      }));
      appState.replaceRules = (appState.replaceRules || []).concat(imported);
      appState.replaceRuleImportPreview = null;
      appState.replaceRuleImportStatus = `导入成功，新增 ${imported.length} 条规则`;
      renderCurrentRoute();
    };
    const applyReaderReplaceImportCancel = () => {
      appState.replaceRuleImportPreview = null;
      appState.replaceRuleImportStatus = "";
      renderCurrentRoute();
    };
    const applyReaderThemeEditField = (field, value) => {
      appState.readerThemeEditDraft = Object.assign({}, appState.readerThemeEditDraft, { [field]: value });
      appState.readerThemeEditError = "";
      renderCurrentRoute();
    };
    const applyReaderThemeEditScheme = (scheme) => {
      appState.readerThemeEditDraft = Object.assign({}, appState.readerThemeEditDraft, { scheme: scheme === "night" ? "night" : "day" });
      renderCurrentRoute();
    };
    const applyReaderCustomThemeSave = (setDefault) => {
      const draft = appState.readerThemeEditDraft || {};
      const name = String(draft.name || "").trim();
      if (!name) {
        appState.readerThemeEditError = "请填写主题名称";
        renderCurrentRoute();
        return;
      }
      const value = `custom-${Date.now()}`;
      const newTheme = {
        value,
        label: name,
        swatch: draft.bg || "#fff7ec",
        bg: draft.bg || "#fff7ec",
        paperStart: draft.bg || "#fff7ec",
        paperEnd: draft.bg || "#fff7ec",
        ink: draft.ink || "#2b241d",
        scheme: draft.scheme === "night" ? "night" : "day",
        texture: "plain",
        custom: true,
        backgroundImage: draft.backgroundImage || "",
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundOverlay: Number(draft.backgroundOverlay || 0),
        controlBar: draft.controlBar || "#eee6d4",
        controlInk: draft.controlInk || "#3a3024",
        textureOpacity: Number(draft.textureOpacity || 0.04),
        pair: draft.pair || "none"
      };
      appState.readerCustomThemes = (appState.readerCustomThemes || []).concat([newTheme]);
      appState.readerTheme = value;
      if (setDefault) {
        if (newTheme.scheme === "night") appState.readerDefaultNightTheme = value;
        else appState.readerDefaultDayTheme = value;
        appState.settingsToast = "已保存并设为默认主题";
      }
      appState.readerThemeEditDraft = { name: "", bg: "#fff7ec", ink: "#2b241d", scheme: "day", backgroundImage: "", backgroundOverlay: 0.18, controlBar: "#eee6d4", controlInk: "#3a3024", textureOpacity: 0.04, pair: "none" };
      appState.readerThemeEditError = "";
      goBack();
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
      if (key === "paragraphIndent") {
        const num = Number(value);
        if (Number.isFinite(num)) {
          pageSpace.paragraphIndent = num;
        }
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
      const options = readerThemeOptions(data).concat(appState.readerCustomThemes || []);
      const selected = options.find((item) => item.value === value) || options.find((item) => item.value === readerDefaultThemeValue(data)) || options[0];
      appState.readerTheme = selected.value;
      appState.readerColorSchemeMode = selected.scheme === "night" ? "night" : "day";
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
      if (key === "hideStatusBar") {
        document.documentElement.classList.toggle("fd-reader-hide-status-bar", Boolean(appState.readerSettings.hideStatusBar));
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
      // 翻页模式 / 翻页动画：同步 CSS 值到 appState，供 data-page-mode / data-page-animation 使用
      if (key === "pageMode") {
        appState.readerPageMode = readerPageModeCssValue(value);
        // 切换模式时重置分页，避免竖向全段落渲染残留干扰横向分页
        appState.readerPages = [];
        appState.readerPaginationKey = "";
        appState.readerPageIndex = 0;
      } else if (key === "pageAnimation") {
        appState.readerPageAnimation = readerPageAnimationCssValue(value);
      }
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
      let textSelectionTriggered = false;
      const clearTextSelectionTimer = () => {
        if (appState.readerTextSelectionTimer) {
          window.clearTimeout(appState.readerTextSelectionTimer);
          appState.readerTextSelectionTimer = null;
        }
      };
      targetEl.addEventListener("pointerdown", (event) => {
        if (event.button && event.button !== 0) {
          return;
        }
        textSelectionTriggered = false;
        clearTextSelectionTimer();
        appState.readerTextSelectionTimer = window.setTimeout(() => {
          appState.readerTextSelectionTimer = null;
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
      const isDisabled = targetEl.getAttribute("aria-disabled") === "true";
      const selectSource = () => {
        if (isDisabled) {
          return;
        }
        // B4: repeat tap 屏蔽 — 当 source-switch 处于 busy（loading 状态）时，
        // 候选行选择被屏蔽，避免在切换中触发新的 select。
        const busyHost = screenHost.querySelector("[data-source-switch-busy=\"true\"]");
        if (busyHost) {
          return;
        }
        appState.sourceSwitchSelectedSource = targetEl.getAttribute("data-source-name") || "";
        // B4: 标记前一次结果为 stale（用户已发起新的选择）
        screenHost.querySelectorAll("[data-source-switch-stale]").forEach((el) => {
          el.setAttribute("data-source-switch-stale", "true");
        });
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
        const readerModuleButton = targetEl.classList.contains("fd-reader-module") ? targetEl : null;
        const currentReaderState = readerRouteState(currentRoute());
        const shouldReplaceRoute = targetEl.hasAttribute("data-route-replace") ||
          Boolean(targetEl.closest(".fd-source-control-continuity")) ||
          Boolean(readerModuleButton && currentReaderState.mode === "module");
        if (readerFullTypeByRoute[route]) {
          appState.readerControlStageOrigin = currentRoute();
        }
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
        if (readerFullTypeByRoute[route]) {
          appState.readerControlStageOrigin = button.getAttribute("data-reader-stage-origin") || currentRoute();
        }
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

    screenHost.querySelectorAll("[data-reader-toc-search-input]").forEach((input) => {
      input.addEventListener("input", () => {
        const query = String(input.value || "").trim().toLowerCase();
        appState.readerTocQuery = input.value || "";
        const list = input.closest(".fd-reader-full-directory")?.querySelector("[data-reader-toc-scroll]");
        if (!list) return;
        let visibleCount = 0;
        list.querySelectorAll("[data-reader-toc-title]").forEach((row) => {
          const visible = !query || String(row.getAttribute("data-reader-toc-title") || "").includes(query);
          row.hidden = !visible;
          if (visible) visibleCount += 1;
        });
        const empty = list.querySelector("[data-reader-toc-live-empty]");
        if (empty) empty.hidden = visibleCount > 0;
      });
    });

    screenHost.querySelectorAll("[data-reader-toc-sort]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        appState.readerTocSort = appState.readerTocSort === "desc" ? "asc" : "desc";
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

    screenHost.querySelectorAll("[data-reader-bookmark-toggle]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const index = Number(button.getAttribute("data-reader-bookmark-toggle"));
        if (!Number.isFinite(index) || index < 0) return;
        const bookmarks = new Set(Array.isArray(appState.readerBookmarkIndices) ? appState.readerBookmarkIndices : []);
        if (bookmarks.has(index)) bookmarks.delete(index);
        else bookmarks.add(index);
        appState.readerBookmarkIndices = Array.from(bookmarks).sort((a, b) => a - b);
        renderCurrentRoute();
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

    screenHost.querySelectorAll("[data-reader-theme-mode]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const mode = button.getAttribute("data-reader-theme-mode");
        if (!["system", "day", "night"].includes(mode)) return;
        appState.readerColorSchemeMode = mode;
        if (mode === "day") appState.readerTheme = appState.readerDefaultDayTheme;
        if (mode === "night") appState.readerTheme = appState.readerDefaultNightTheme;
        renderCurrentRoute();
      });
    });

    screenHost.querySelectorAll("[data-reader-theme-default]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const scheme = button.getAttribute("data-reader-theme-default");
        const value = button.getAttribute("data-reader-theme-value") || readerDefaultThemeValue(data);
        if (scheme === "night") appState.readerDefaultNightTheme = value;
        else appState.readerDefaultDayTheme = value;
        renderCurrentRoute();
      });
    });

    screenHost.querySelectorAll("[data-reader-font-import]").forEach((input) => {
      input.addEventListener("change", async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        if (!/\.(ttf|otf|ttc)$/i.test(file.name)) {
          appState.readerFontImportStatus = "不支持的字体格式";
          renderCurrentRoute();
          return;
        }
        const value = `imported-font-${Date.now()}`;
        const family = `ReaderImported${Date.now()}`;
        try {
          const source = await file.arrayBuffer();
          if (typeof FontFace === "function") {
            const face = new FontFace(family, source);
            await face.load();
            document.fonts.add(face);
          }
          appState.readerImportedFonts = (appState.readerImportedFonts || []).concat([{
            value,
            label: file.name.replace(/\.(ttf|otf|ttc)$/i, ""),
            fontStack: `'${family}', var(--fd-serif)`,
            custom: true,
            fileName: file.name,
            size: file.size
          }]);
          appState.readerTypography.fontFamily = value;
          appState.readerFontImportStatus = `已导入 ${file.name}`;
        } catch (error) {
          appState.readerFontImportStatus = `字体导入失败：${error && error.message ? error.message : "文件无法解析"}`;
        }
        renderCurrentRoute();
      });
    });

    screenHost.querySelectorAll("[data-reader-theme-background-import]").forEach((input) => {
      input.addEventListener("change", () => {
        const file = input.files && input.files[0];
        if (!file) return;
        if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
          appState.readerThemeEditError = "仅支持 PNG、JPEG 或 WebP 背景";
          renderCurrentRoute();
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          appState.readerThemeEditDraft = Object.assign({}, appState.readerThemeEditDraft, { backgroundImage: String(reader.result || "") });
          appState.readerThemeEditError = "";
          renderCurrentRoute();
        };
        reader.onerror = () => {
          appState.readerThemeEditError = "背景图片读取失败";
          renderCurrentRoute();
        };
        reader.readAsDataURL(file);
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

    screenHost.querySelectorAll("[data-reader-replace-rule-add]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.getAttribute("aria-disabled") === "true") return;
        applyReaderReplaceRuleAdd();
      });
    });

    screenHost.querySelectorAll("[data-reader-replace-rule-edit]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        applyReaderReplaceRuleEdit(button.getAttribute("data-reader-replace-rule-edit") || "");
      });
    });

    screenHost.querySelectorAll("[data-reader-replace-rule-delete]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        applyReaderReplaceRuleDelete(button.getAttribute("data-reader-replace-rule-delete") || "");
      });
    });

    screenHost.querySelectorAll("[data-reader-replace-rule-save]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        applyReaderReplaceRuleSave();
      });
    });

    screenHost.querySelectorAll("[data-reader-replace-rule-cancel]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        applyReaderReplaceRuleCancel();
      });
    });

    screenHost.querySelectorAll("[data-reader-replace-form-field]").forEach((input) => {
      input.addEventListener("input", (event) => {
        applyReaderReplaceFormField(input.getAttribute("data-reader-replace-form-field") || "", input.value);
      });
    });

    screenHost.querySelectorAll("[data-reader-replace-scope]").forEach((checkbox) => {
      checkbox.addEventListener("change", (event) => {
        applyReaderReplaceScopeToggle(checkbox.getAttribute("data-reader-replace-scope") || "");
      });
    });

    // ===== W5 新增按钮绑定 =====
    screenHost.querySelectorAll("[data-reader-replace-rule-up]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (button.hasAttribute("disabled")) return;
        applyReaderReplaceRuleMove(button.getAttribute("data-reader-replace-rule-up") || "", "up");
      });
    });
    screenHost.querySelectorAll("[data-reader-replace-rule-down]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (button.hasAttribute("disabled")) return;
        applyReaderReplaceRuleMove(button.getAttribute("data-reader-replace-rule-down") || "", "down");
      });
    });
    screenHost.querySelectorAll("[data-reader-replace-rule-delete-target]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        applyReaderReplaceRuleDeleteTarget(button.getAttribute("data-reader-replace-rule-delete-target") || "");
      });
    });
    screenHost.querySelectorAll("[data-reader-replace-rule-delete-confirm]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        applyReaderReplaceRuleDeleteConfirm(button.getAttribute("data-reader-replace-rule-delete-confirm") || "");
      });
    });
    screenHost.querySelectorAll("[data-reader-replace-apply]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        applyReaderReplaceApply();
      });
    });
    screenHost.querySelectorAll("[data-reader-replace-apply-undo]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        applyReaderReplaceApplyUndo();
      });
    });
    screenHost.querySelectorAll("[data-reader-replace-export]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        applyReaderReplaceExport();
      });
    });
    screenHost.querySelectorAll("[data-reader-replace-import-preview-btn]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        applyReaderReplaceImportPreview();
      });
    });
    screenHost.querySelectorAll("[data-reader-replace-import-confirm]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        applyReaderReplaceImportConfirm();
      });
    });
    screenHost.querySelectorAll("[data-reader-replace-import-cancel]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        applyReaderReplaceImportCancel();
      });
    });

    screenHost.querySelectorAll("[data-reader-theme-edit-save]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const setDefault = button.hasAttribute("data-reader-theme-edit-default");
        applyReaderCustomThemeSave(setDefault);
      });
    });

    screenHost.querySelectorAll("[data-reader-theme-edit-field]").forEach((input) => {
      const field = input.getAttribute("data-reader-theme-edit-field") || "";
      const updateValue = () => {
        const valueEl = screenHost.querySelector(`[data-reader-theme-edit-value="${field}"]`);
        if (valueEl) valueEl.textContent = input.value;
      };
      input.addEventListener("input", (event) => {
        updateValue();
        applyReaderThemeEditField(field, input.value);
      });
      input.addEventListener("change", (event) => {
        updateValue();
        applyReaderThemeEditField(field, input.value);
      });
    });

    screenHost.querySelectorAll("[data-reader-theme-edit-scheme]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        applyReaderThemeEditScheme(button.getAttribute("data-reader-theme-edit-scheme") || "day");
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

    // ===== W4 持久化按钮绑定 =====
    screenHost.querySelectorAll("[data-w4-save]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        w4SavePersistedConfig();
        renderCurrentRoute();
      });
    });
    screenHost.querySelectorAll("[data-w4-restart]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        w4SimulateRestart();
        appState.readerPageIndex = 0;
        appState.readerPaginationKey = "";
        appState.readerPages = [];
        renderCurrentRoute();
      });
    });
    screenHost.querySelectorAll("[data-w4-clear]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        w4ClearPersistedConfig();
        renderCurrentRoute();
      });
    });
    // W4 字体管理按钮
    screenHost.querySelectorAll("[data-reader-font-rename]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const value = button.getAttribute("data-reader-font-rename");
        const fonts = appState.readerImportedFonts || [];
        const target = fonts.find((item) => item.value === value);
        if (!target) return;
        const next = window.prompt("重命名字体", target.label);
        if (next && next.trim()) {
          target.label = next.trim();
          renderCurrentRoute();
        }
      });
    });
    screenHost.querySelectorAll("[data-reader-font-delete]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const value = button.getAttribute("data-reader-font-delete");
        replaceTopRoute("reader-font-delete-confirm", { "data-reader-font-target": value });
      });
    });
    screenHost.querySelectorAll("[data-reader-font-toggle]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const value = button.getAttribute("data-reader-font-toggle");
        const fonts = appState.readerImportedFonts || [];
        const target = fonts.find((item) => item.value === value);
        if (!target) return;
        target.disabled = !target.disabled;
        renderCurrentRoute();
      });
    });
    screenHost.querySelectorAll("[data-reader-font-validate]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const fileInput = screenHost.querySelector("[data-reader-font-import]");
        const file = fileInput && fileInput.files && fileInput.files[0];
        if (!file) {
          appState.readerFontImportStatus = "请先选择字体文件";
          renderCurrentRoute();
          return;
        }
        const validExt = /\.(ttf|otf|ttc)$/i.test(file.name);
        const validType = /^font\/(ttf|otf|ttc|sfnt)$/i.test(file.type) || !file.type;
        const sizeOk = file.size > 0 && file.size < 30 * 1024 * 1024;
        if (!validExt || !validType) {
          appState.readerFontImportStatus = "校验失败：仅支持 TTF/OTF/TTC 格式";
          renderCurrentRoute();
          return;
        }
        if (!sizeOk) {
          appState.readerFontImportStatus = "校验失败：文件大小需在 30MB 以内";
          renderCurrentRoute();
          return;
        }
        appState.readerFontImportStatus = `校验通过：${file.name} · ${(file.size / 1024).toFixed(1)}KB`;
        appState.w4PendingFontFile = file;
        replaceTopRoute("reader-font-import-confirm");
      });
    });
    // W4 字体导入确认页操作
    screenHost.querySelectorAll("[data-w4-font-import-enable]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const file = appState.w4PendingFontFile;
        if (!file) { replaceTopRoute("reader-full-font"); return; }
        const value = `imported-font-${Date.now()}`;
        const family = `ReaderImported${Date.now()}`;
        try {
          const source = await file.arrayBuffer();
          if (typeof FontFace === "function") {
            const face = new FontFace(family, source);
            await face.load();
            document.fonts.add(face);
          }
          appState.readerImportedFonts = (appState.readerImportedFonts || []).concat([{
            value,
            label: file.name.replace(/\.(ttf|otf|ttc)$/i, ""),
            fontStack: `'${family}', var(--fd-serif)`,
            custom: true,
            fileName: file.name,
            size: file.size,
            disabled: false
          }]);
          appState.readerTypography.fontFamily = value;
          appState.readerFontImportStatus = `已启用 ${file.name}`;
          appState.w4PendingFontFile = null;
          replaceTopRoute("reader-full-font");
        } catch (error) {
          appState.readerFontImportStatus = `字体启用失败：${error && error.message ? error.message : "文件无法解析"}`;
          appState.w4PendingFontFile = null;
          replaceTopRoute("reader-full-font");
        }
      });
    });
    // W4 字体删除确认
    screenHost.querySelectorAll("[data-w4-font-delete-confirm]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const value = button.getAttribute("data-w4-font-delete-confirm") || appState.w4FontDeleteTarget;
        const fallback = button.getAttribute("data-w4-font-fallback") || "serif";
        appState.readerImportedFonts = (appState.readerImportedFonts || []).filter((item) => item.value !== value);
        if (appState.readerTypography && appState.readerTypography.fontFamily === value) {
          appState.readerTypography.fontFamily = fallback;
        }
        appState.readerFontImportStatus = `已删除字体，回退至 ${fallback}`;
        appState.w4FontDeleteTarget = "";
        replaceTopRoute("reader-full-font");
      });
    });
    // W4 主题新建/复制/删除
    screenHost.querySelectorAll("[data-w4-theme-create-blank]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        appState.readerThemeEditDraft = { name: "", bg: "#fff7ec", ink: "#2b241d", scheme: "day", backgroundImage: "", backgroundOverlay: 0.18, controlBar: "#eee6d4", controlInk: "#3a3024", textureOpacity: 0.04 };
        appState.readerThemeEditError = "";
        replaceTopRoute("reader-full-theme-edit");
      });
    });
    screenHost.querySelectorAll("[data-w4-theme-copy]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const value = button.getAttribute("data-w4-theme-copy");
        const source = (appState.readerCustomThemes || []).find((item) => item.value === value);
        if (source) {
          appState.readerThemeEditDraft = {
            name: source.label + " 副本",
            bg: source.bg,
            ink: source.ink,
            scheme: source.scheme || "day",
            backgroundImage: source.backgroundImage || "",
            backgroundOverlay: source.backgroundOverlay || 0.18,
            controlBar: source.controlBar || "#eee6d4",
            controlInk: source.controlInk || "#3a3024",
            textureOpacity: source.textureOpacity || 0.04
          };
        } else {
          appState.readerThemeEditDraft = { name: "", bg: "#fff7ec", ink: "#2b241d", scheme: "day", backgroundImage: "", backgroundOverlay: 0.18, controlBar: "#eee6d4", controlInk: "#3a3024", textureOpacity: 0.04 };
        }
        appState.readerThemeEditError = "";
        replaceTopRoute("reader-full-theme-edit");
      });
    });
    screenHost.querySelectorAll("[data-w4-theme-delete]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const value = button.getAttribute("data-w4-theme-delete");
        appState.w4ThemeDeleteTarget = value;
        replaceTopRoute("reader-theme-delete-confirm");
      });
    });
    screenHost.querySelectorAll("[data-w4-theme-delete-confirm]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const value = appState.w4ThemeDeleteTarget;
        appState.readerCustomThemes = (appState.readerCustomThemes || []).filter((item) => item.value !== value);
        if (appState.readerTheme === value) {
          appState.readerTheme = readerDefaultThemeValue(data);
        }
        if (appState.readerDefaultDayTheme === value) appState.readerDefaultDayTheme = "paper";
        if (appState.readerDefaultNightTheme === value) appState.readerDefaultNightTheme = "paper-night";
        appState.w4ThemeDeleteTarget = "";
        replaceTopRoute("reader-full-theme");
      });
    });
    screenHost.querySelectorAll("[data-w4-theme-restore-default]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        appState.readerCustomThemes = [];
        appState.readerTheme = readerDefaultThemeValue(data);
        appState.readerDefaultDayTheme = "paper";
        appState.readerDefaultNightTheme = "paper-night";
        appState.settingsToast = "已恢复默认主题";
        renderCurrentRoute();
      });
    });
    // W4 排版恢复默认确认
    screenHost.querySelectorAll("[data-w4-typography-reset-confirm]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        appState.readerTypography = normalizeReaderTypography(data);
        appState.readerPageSpace = normalizeReaderPageSpace(data);
        appState.readerPageIndex = 0;
        appState.readerPaginationKey = "";
        appState.readerPages = [];
        appState.settingsToast = "排版已恢复默认";
        replaceTopRoute("reader-full-layout");
      });
    });
    // W4 排版对齐/翻页方式
    screenHost.querySelectorAll("[data-w4-typography-align]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const value = button.getAttribute("data-w4-typography-align");
        appState.readerTypography = Object.assign({}, appState.readerTypography, { textAlign: value });
        renderCurrentRoute();
      });
    });
    screenHost.querySelectorAll("[data-w4-page-turn-mode]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const value = button.getAttribute("data-w4-page-turn-mode");
        appState.readerSettings = Object.assign({}, appState.readerSettings, { pageMode: value });
        appState.readerPageMode = readerPageModeCssValue(value);
        renderCurrentRoute();
      });
    });
    // W4 字体回退演示
    screenHost.querySelectorAll("[data-w4-font-fallback-trigger]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const fallback = button.getAttribute("data-w4-font-fallback-trigger") || "serif";
        appState.readerTypography = Object.assign({}, appState.readerTypography, { fontFamily: fallback });
        appState.readerFontImportStatus = `字体加载失败，已回退至 ${fallback}`;
        renderCurrentRoute();
      });
    });
    // W4 字体删除确认页回退字体选择
    screenHost.querySelectorAll("[data-w4-font-fallback-select]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const value = button.getAttribute("data-w4-font-fallback-select");
        screenHost.querySelectorAll("[data-w4-font-fallback-select]").forEach((btn) => btn.classList.remove("is-active"));
        button.classList.add("is-active");
        const confirmBtn = screenHost.querySelector("[data-w4-font-delete-confirm]");
        if (confirmBtn) confirmBtn.setAttribute("data-w4-font-fallback", value);
      });
    });
    // W4 主题编辑日夜间配对选择
    screenHost.querySelectorAll("[data-reader-theme-edit-pair-value]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const value = button.getAttribute("data-reader-theme-edit-pair-value");
        appState.readerThemeEditDraft = Object.assign({}, appState.readerThemeEditDraft, { pair: value });
        renderCurrentRoute();
      });
    });

    screenHost.querySelectorAll("[data-reader-page-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.getAttribute("aria-disabled") === "true") {
          return;
        }
        applyReaderPageAction(button.getAttribute("data-reader-page-action"));
      });
    });

    // 竖向翻页模式：点击 reading-layer 唤起控制层（用 touchstart/touchend 判断是否为轻点，避免误触发）
    screenHost.querySelectorAll("[data-reader-vertical-tap]").forEach((layer) => {
      let touchStartY = 0;
      let touchStartTime = 0;
      layer.addEventListener("touchstart", (event) => {
        if (event.touches.length === 1) {
          touchStartY = event.touches[0].clientY;
          touchStartTime = Date.now();
        }
      }, { passive: true });
      layer.addEventListener("touchend", (event) => {
        if (event.changedTouches.length !== 1) return;
        const deltaY = Math.abs(event.changedTouches[0].clientY - touchStartY);
        const deltaT = Date.now() - touchStartTime;
        // 轻点（位移<10px 且时长<300ms）才唤起控制层，滑动滚动不触发
        if (deltaY < 10 && deltaT < 300) {
          const route = layer.getAttribute("data-reader-vertical-tap");
          if (route && routes[route]) {
            event.preventDefault();
            replaceTopRoute(route, {
              id: "reader.vertical.tap",
              action: "tap",
              from: currentRoute(),
              to: route
            });
          }
        }
      }, { passive: false });
      // 桌面端 click 事件
      layer.addEventListener("click", (event) => {
        // 如果是触摸设备，touchend 已处理，这里只处理非触摸场景
        if (event.detail === 0) return;
        const route = layer.getAttribute("data-reader-vertical-tap");
        if (route && routes[route]) {
          event.preventDefault();
          replaceTopRoute(route, {
            id: "reader.vertical.click",
            action: "click",
            from: currentRoute(),
            to: route
          });
        }
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
