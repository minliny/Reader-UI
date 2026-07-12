/**
 * D2-A 书架与发现产品化缺口补全 renderer 函数模块
 * -----------------------------------------------------------------------------
 * 职责：
 *   1. 为书架 17 路由补全状态变体与交互闭环：
 *      - 封面/列表模式切换的真实上下文（书架视图状态 + 焦点恢复）
 *      - 长按菜单真实上下文（替换 bookshelf-book-more-menu 的 contractStatic）
 *      - 批量选择与批量操作闭环（全选/移动分组/删除/取消）
 *      - 分组 CRUD 和排序（新建/重命名/删除/拖拽排序）
 *      - 筛选、排序、搜索组合状态
 *      - 空书架、离线、加载失败状态变体
 *      - 本地书与网络书差异展示（来源标识、缓存状态、可读性）
 *      - book-detail 状态变体补全（加载中/离线/无目录/已删书）
 *   2. 为发现 41 路由补全状态变体与交互闭环：
 *      - 入口、筛选、排序的组合状态
 *      - 登录前后返回行为
 *      - 缓存新鲜、陈旧、清理状态
 *      - 无限加载交互
 *      - 换源入口
 *      - 解析错误状态
 *      - 无结果与重试
 *
 * 约束：
 *   - 不编辑 render-runtime.js，只创建新模块文件
 *   - 通过 window.ReaderD2BookshelfDiscoverRenderers 暴露
 *   - 自包含基础工具（esc / icon / shellKit / cover / phoneShellClasses），不依赖 render-runtime.js 私有助手
 *   - 复用 ReaderShellKit 提供的 shell 渲染能力，CSS class 与现有 demo 保持一致
 *
 * 集成方式：
 *   render-runtime.js 在 renderRoute switch 前优先查询 INTEGRATION_MAP / STATE_VARIANT_MAP：
 *     if (window.ReaderD2BookshelfDiscoverRenderers) {
 *       const fnName = window.ReaderD2BookshelfDiscoverRenderers.INTEGRATION_MAP[route]
 *                   || window.ReaderD2BookshelfDiscoverRenderers.STATE_VARIANT_MAP[route];
 *       if (fnName && typeof window.ReaderD2BookshelfDiscoverRenderers[fnName] === "function") {
 *         return window.ReaderD2BookshelfDiscoverRenderers[fnName](data, route, appState);
 *       }
 *     }
 *
 * INTEGRATION_MAP（替换 contractStatic / 新增 schema-only renderer）：
 *   bookshelf-book-more-menu        → bookshelfBookMoreMenuScreen
 *
 * STATE_VARIANT_MAP（已审计路由的状态变体增强）：
 *   bookshelf                       → bookshelfV2
 *   bookshelf-cover-mode            → bookshelfV2
 *   bookshelf-list-mode             → bookshelfV2
 *   bookshelf-empty                 → bookshelfEmptyV2
 *   book-batch-management           → bookBatchManagementV2
 *   group-management                → groupManagementV2
 *   bookshelf-group-management      → groupManagementV2
 *   sort-filter                     → sortFilterV2
 *   book-detail                     → bookDetailV2
 *   book-detail-toc-preview         → bookDetailV2
 *   book-directory                  → bookDirectoryV2
 *   book-search                     → bookSearchV2
 *   search-home                     → bookSearchV2
 *   search-results                  → bookSearchV2
 *   local-import                    → localImportV2
 *   bookshelf-search-settings       → bookshelfSearchSettingsV2
 *   discover                        → discoverV2
 *   discover-home                   → discoverV2
 *   discover-control                → discoverV2
 *   discover-sort                   → discoverV2
 *   discover-entry-*                → discoverV2
 *   discover-filter-*               → discoverV2
 *   discover-sort-*                 → discoverV2
 *   discover-no-results             → discoverNoResultsV2
 *   discover-loading                → discoverLoadingV2
 *   discover-refreshing             → discoverRefreshingV2
 *   discover-infinite-loading       → discoverInfiniteV2
 *   discover-page-two               → discoverInfiniteV2
 *   discover-cache-*                → discoverCacheV2
 *   discover-login-return           → discoverLoginReturnV2
 *   discover-switching-source       → discoverSwitchingV2
 *   discover-switched-source        → discoverSwitchingV2
 *   discover-entry-error            → discoverErrorV2
 *   discover-empty                  → discoverErrorV2
 *   discover-error                  → discoverErrorV2
 *   discover-source-login           → discoverSourceLoginV2
 *   discover-rule-test              → discoverRuleTestV2
 *   discover-source-bulk            → discoverSourceBulkV2
 * -----------------------------------------------------------------------------
 */
(function attachReaderD2BookshelfDiscoverRenderers(window) {
  "use strict";

  // ============ 基础工具：转义 / 图标 / shell kit / 封面 ============

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

  function shellKit() {
    if (!window.ReaderShellKit) {
      throw new Error("ReaderShellKit is required before d2-bookshelf-discover-renderers.js");
    }
    return window.ReaderShellKit;
  }

  function cover(data, coverKey) {
    return esc((data && data.covers && data.covers[coverKey]) || "");
  }

  function coverCss(data, coverKey) {
    var src = String((data && data.covers && data.covers[coverKey]) || "").replace(/^\.\//, "../");
    return esc(src);
  }

  // 手机壳 class 集合（与 render-runtime.js 的 phoneShellClasses 保持一致）
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

  // 合并 appState（避免污染上层状态）
  function withAppState(appState, overrides) {
    return Object.assign({}, appState || {}, overrides || {});
  }

  // 取主标签反馈文案
  function mainTabFeedbackHtml(appState) {
    var message = (appState && appState.mainTabFeedback) || "";
    return message ? `<p class="fd-nav-feedback" data-main-tab-feedback>${esc(message)}</p>` : "";
  }

  // ============ 书架数据提取与差异标识 ============

  // 书架书籍分组归属（与 render-runtime.js bookshelfBookGroup 行为一致）
  function bookshelfBookGroup(book, index) {
    var title = String((book && book.title) || "");
    var author = String((book && book.author) || "");
    if (/本地|离线|导入|文档/.test(author)) {
      return "本地书";
    }
    if (index < 4 || /书源|同步/.test(author) || /灯塔与雾/.test(title)) {
      return "追更";
    }
    return "默认";
  }

  // 书籍来源类型：local（本地书）/ network（网络书）
  function bookSourceType(book, index) {
    return bookshelfBookGroup(book, index) === "本地书" ? "local" : "network";
  }

  // 书籍可读性：本地书始终离线可读；网络书根据缓存状态判断
  function bookReadable(book, index, appState) {
    if (bookSourceType(book, index) === "local") {
      return { offline: true, cached: true, label: "离线可读" };
    }
    var offline = Boolean(appState && appState.offline);
    var cached = Boolean(book && book.cached) || index < 3;
    return {
      offline: offline,
      cached: cached,
      label: offline ? (cached ? "缓存可读" : "离线不可读") : "在线可读"
    };
  }

  // 书架排序/筛选/分组状态
  function bookshelfState(appState) {
    return {
      group: (appState && appState.bookshelfGroup) || "全部",
      sort: (appState && appState.bookshelfSort) || "最近更新",
      filter: (appState && appState.bookshelfFilter) || "全部",
      view: (appState && appState.bookshelfView) === "list" ? "list" : "cover",
      open: Boolean(appState && appState.bookshelfFilterOpen),
      search: (appState && appState.bookshelfSearch) || "",
      offline: Boolean(appState && appState.offline),
      loading: Boolean(appState && appState.bookshelfLoading),
      loadError: Boolean(appState && appState.bookshelfLoadError)
    };
  }

  // 书架筛选后的可见书籍
  function bookshelfVisibleBooks(books, appState) {
    var state = bookshelfState(appState);
    return books.map(function (book, index) {
      return { book: book, index: index, group: bookshelfBookGroup(book, index) };
    }).filter(function (entry) {
      return state.group === "全部" || entry.group === state.group;
    }).filter(function (entry) {
      if (state.filter === "全部") return true;
      if (state.filter === "未读") return !entry.book.read;
      if (state.filter === "已完结") return /完本|完结/.test(entry.book.kind || entry.book.chapter || "");
      if (state.filter === "更新失败") return Boolean(entry.book.updateFailed);
      return true;
    }).filter(function (entry) {
      if (!state.search) return true;
      var q = state.search.toLowerCase();
      return String(entry.book.title || "").toLowerCase().indexOf(q) >= 0
        || String(entry.book.author || "").toLowerCase().indexOf(q) >= 0;
    });
  }

  // 书籍卡片（带本地/网络书差异标识）
  function bookCardV2(data, book, index, appState) {
    var coverSrc = cover(data, book.coverKey);
    var sourceType = bookSourceType(book, index);
    var readable = bookReadable(book, index, appState);
    return `
      <article class="fd-book-card" data-book-card data-book-source-type="${esc(sourceType)}" data-book-cached="${readable.cached ? "true" : "false"}">
        <button class="fd-book-cover-frame" type="button" data-book-cover data-route="immersive-reading" data-book-title="${esc(book.title)}" data-book-author="${esc(book.author)}" data-book-chapter="${esc(book.chapter)}" data-cover-src="${coverSrc}" aria-label="打开 ${esc(book.title)}">
          <img src="${coverSrc}" alt="${esc(book.title)}封面">
        </button>
        <strong>${esc(book.title)}</strong>
        <span>${esc(book.author)}</span>
      </article>`;
  }

  // 列表视图行（带本地/网络书差异标识）
  function bookListRowV2(data, book, index, appState) {
    var coverSrc = cover(data, book.coverKey);
    var sourceType = bookSourceType(book, index);
    var readable = bookReadable(book, index, appState);
    var isLocal = sourceType === "local";
    var sourceLabel = isLocal ? "本地书" : "网络书";
    var cacheLabel = isLocal ? "离线可读" : (readable.cached ? "已缓存" : "未缓存");
    return `
      <article class="fd-book-list-row" data-book-card data-book-source-type="${esc(sourceType)}" role="button" tabindex="0" data-route="immersive-reading">
        <img src="${coverSrc}" alt="${esc(book.title)}封面">
        <div class="fd-book-list-info">
          <strong>${esc(book.title)}</strong>
          <small>${esc(book.author)} · ${esc(book.chapter)}</small>
          <div class="fd-book-list-meta">
            <em class="fd-book-source-tag ${isLocal ? "is-local" : "is-network"}">${esc(sourceLabel)}</em>
            <i class="fd-book-cache-tag ${readable.cached ? "is-cached" : "is-missing"}">${esc(cacheLabel)}</i>
          </div>
        </div>
        <button class="fd-book-list-more" type="button" data-book-more data-book-title="${esc(book.title)}" aria-label="更多操作">${icon("more", "fd-small-icon")}</button>
      </article>`;
  }

  // 书架区段头（封面/列表切换 + 筛选入口 + 搜索）
  function bookshelfSectionHeaderV2(state, disabled) {
    var filterActive = state.group !== "全部" || state.sort !== "最近更新" || state.filter !== "全部" || state.search;
    return `
      <section class="fd-section-head fd-bookshelf-section-head">
        <h2>我的书架</h2>
        <span class="fd-bookshelf-view-actions">
          <button class="${state.view === "cover" ? "is-active" : ""}" type="button" aria-label="封面视图" data-bookshelf-view-button="cover" aria-pressed="${state.view === "cover" ? "true" : "false"}"${disabled ? " disabled" : ""}>${icon("grid", "fd-small-icon")}</button>
          <button class="${state.view === "list" ? "is-active" : ""}" type="button" aria-label="列表视图" data-bookshelf-view-button="list" aria-pressed="${state.view === "list" ? "true" : "false"}"${disabled ? " disabled" : ""}>${icon("list", "fd-small-icon")}</button>
          <button class="${filterActive ? "is-active" : ""}" type="button" aria-label="书架筛选：${esc(state.group)}，${esc(state.sort)}，${esc(state.filter)}${state.search ? "，搜索 " + esc(state.search) : ""}" data-bookshelf-filter-toggle aria-expanded="${state.open ? "true" : "false"}"${disabled ? " disabled" : ""}>${icon("filter", "fd-small-icon")}</button>
          <button type="button" aria-label="书架搜索" data-bookshelf-search-toggle${disabled ? " disabled" : ""}>${icon("search", "fd-small-icon")}</button>
          <button type="button" aria-label="书架显示设置" data-route="bookshelf-search-settings" data-settings-scope="bookshelf-display"${disabled ? " disabled" : ""}>${icon("gear", "fd-small-icon")}</button>
        </span>
      </section>`;
  }

  // 书架筛选/排序/分组弹层（组合状态）
  function bookshelfFilterPopoverV2(state) {
    if (!state.open) return "";
    var groupOptions = ["全部", "默认", "本地书", "追更"];
    var sortOptions = ["最近更新", "阅读进度", "书名", "作者"];
    var filterOptions = ["全部", "未读", "已完结", "更新失败"];
    return `
      <section class="fd-bookshelf-filter-popover" aria-label="书架排序与筛选选项">
        <article>
          <strong>分组</strong>
          <div>
            ${groupOptions.map(function (item) {
              return `<button class="${item === state.group ? "is-active" : ""}" type="button" data-bookshelf-group-option="${esc(item)}"${item === state.group ? ' aria-current="true"' : ""}>${esc(item)}</button>`;
            }).join("")}
          </div>
        </article>
        <article>
          <strong>排序</strong>
          <div>
            ${sortOptions.map(function (item) {
              return `<button class="${item === state.sort ? "is-active" : ""}" type="button" data-bookshelf-sort-option="${esc(item)}"${item === state.sort ? ' aria-current="true"' : ""}>${esc(item)}</button>`;
            }).join("")}
          </div>
        </article>
        <article>
          <strong>筛选</strong>
          <div>
            ${filterOptions.map(function (item) {
              return `<button class="${item === state.filter ? "is-active" : ""}" type="button" data-bookshelf-filter-option="${esc(item)}"${item === state.filter ? ' aria-current="true"' : ""}>${esc(item)}</button>`;
            }).join("")}
          </div>
        </article>
        ${state.search ? `
        <article class="fd-bookshelf-filter-search-summary">
          <strong>当前搜索</strong>
          <div class="fd-bookshelf-search-chip" data-bookshelf-search-active>
            <span>${esc(state.search)}</span>
            <button type="button" data-bookshelf-search-clear aria-label="清除搜索">${icon("close", "fd-small-icon")}</button>
          </div>
        </article>` : ""}
      </section>`;
  }

  // 书架更多操作浮层（批量管理 / 分组管理 / 本地导入 / 设置）
  function bookshelfMoreLayerV2() {
    var items = [
      { icon: "check", title: "批量管理", meta: "选择多本书后移动或删除", route: "book-batch-management" },
      { icon: "people", title: "分组管理", meta: "编辑书架分组与归属", route: "group-management" },
      { icon: "book-open", title: "本地书导入", meta: "导入本地文件到书架", route: "local-import" },
      { icon: "gear", title: "书架设置", meta: "显示、排序与缓存策略", route: "bookshelf-search-settings" }
    ];
    return `
      <section class="fd-bookshelf-more-layer" data-bookshelf-more-layer aria-hidden="true" aria-label="书架更多操作">
        <button class="fd-bookshelf-more-backdrop" type="button" data-close-bookshelf-more aria-label="关闭书架更多操作"></button>
        <section class="fd-bookshelf-more-menu" role="dialog" aria-modal="true" aria-label="书架更多操作">
          <h2>书架更多操作</h2>
          ${items.map(function (item) {
            return `<button type="button"${item.route ? ` data-route="${esc(item.route)}"` : ` data-book-action="${esc(item.action)}"`}>
              ${icon(item.icon, "fd-small-icon")}
              <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
            </button>`;
          }).join("")}
        </section>
      </section>`;
  }

  // ============ 书架主 renderer：状态变体补全 ============

  /**
   * bookshelfV2 - 书架主 renderer 状态变体增强
   * 覆盖路由：bookshelf / bookshelf-cover-mode / bookshelf-list-mode
   * 状态变体：正常 / 加载中 / 加载失败 / 离线
   * 与原 mainTabBookshelf 相比：
   *   - 显式渲染封面/列表模式切换的上下文反馈
   *   - 离线状态展示缓存可读提示
   *   - 加载失败展示重试入口
   *   - 本地书与网络书差异展示（来源/缓存标识）
   */
  function bookshelfV2(data, route, appState) {
    var view = route === "bookshelf-list-mode" ? "list"
      : route === "bookshelf-cover-mode" ? "cover"
      : ((appState && appState.bookshelfView) === "list" ? "list" : "cover");
    var merged = withAppState(appState, { bookshelfView: view });
    var state = bookshelfState(merged);
    var books = (data && data.mainTabs && data.mainTabs.books) || [];
    var first = books[0] || { title: "长夜余火", author: "爱潜水的乌贼", chapter: "第 32 章 雨夜", coverKey: "longNight" };
    var visibleBooks = bookshelfVisibleBooks(books, merged);

    // 状态变体：加载失败
    if (state.loadError) {
      return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone"), {
        data: data,
        title: "书架",
        activeType: "bookshelf",
        actions: ["search", "more"],
        ariaLabel: "书架加载失败",
        contentHtml: `
          <section class="fd-bookshelf-shelf-section is-error" aria-label="书架加载失败">
            ${bookshelfSectionHeaderV2(state, true)}
            <section class="fd-bookshelf-error-state" data-slot="bookshelfError" aria-label="书架加载失败状态">
              <div class="fd-bookshelf-error-visual" aria-hidden="true">${icon("warning", "fd-medium-icon")}</div>
              <h2>书架加载失败</h2>
              <p>书籍列表读取失败，已保留上次的封面视图上下文。可重试加载或切换到离线模式查看缓存书籍。</p>
              <div class="fd-bookshelf-error-actions">
                <button class="is-primary" type="button" data-route="bookshelf" data-bookshelf-retry>${icon("refresh", "fd-small-icon")}重试加载</button>
                <button type="button" data-route="bookshelf" data-bookshelf-offline-mode>${icon("offline", "fd-small-icon")}离线查看</button>
              </div>
              <p class="fd-bookshelf-error-meta">已缓存 ${visibleBooks.filter(function (e) { return bookReadable(e.book, e.index, merged).cached; }).length} 本可离线阅读</p>
            </section>
          </section>`,
        stateHostHtml: `<p class="fd-nav-feedback">书架加载失败 · 已保留视图模式：${esc(view === "list" ? "列表" : "封面")}</p>${bookshelfMoreLayerV2()}`
      }));
    }

    // 状态变体：离线
    if (state.offline) {
      var offlineCached = visibleBooks.filter(function (e) { return bookReadable(e.book, e.index, merged).cached; });
      return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone"), {
        data: data,
        title: "书架",
        activeType: "bookshelf",
        actions: ["search", "more"],
        ariaLabel: "书架离线状态",
        contentHtml: `
          <section class="fd-bookshelf-offline-banner" data-bookshelf-offline-banner aria-label="离线提示">
            ${icon("offline", "fd-small-icon")}
            <span>当前为离线模式，仅展示已缓存书籍，网络书更新将暂停。</span>
            <button type="button" data-bookshelf-retry-network>重连</button>
          </section>
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
            ${bookshelfSectionHeaderV2(state, false)}
            ${bookshelfFilterPopoverV2(state)}
            <section class="fd-book-grid ${state.view === "list" ? "is-list-view" : "is-cover-view"}" data-book-grid data-bookshelf-view="${state.view}" aria-label="${state.view === "list" ? "书籍列表" : "书籍封面网格"}">
              ${offlineCached.length === 0
                ? `<p class="fd-bookshelf-empty-inline">离线无缓存书籍</p>`
                : offlineCached.map(function (entry) {
                  return state.view === "list"
                    ? bookListRowV2(data, entry.book, entry.index, merged)
                    : bookCardV2(data, entry.book, entry.index, merged);
                }).join("")}
            </section>
            <p class="fd-bookshelf-offline-meta">已缓存 ${offlineCached.length} 本可离线阅读，其余 ${visibleBooks.length - offlineCached.length} 本需联网后加载。</p>
          </section>`,
        stateHostHtml: `<p class="fd-nav-feedback">离线模式 · 视图：${esc(view === "list" ? "列表" : "封面")} · 可读 ${offlineCached.length}/${visibleBooks.length}</p>${bookshelfMoreLayerV2()}`
      }));
    }

    // 正常状态：封面/列表模式切换上下文
    var viewFeedback = route === "bookshelf-cover-mode" ? "已切换到封面视图"
      : route === "bookshelf-list-mode" ? "已切换到列表视图"
      : "";
    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone"), {
      data: data,
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
          ${bookshelfSectionHeaderV2(state, false)}
          ${bookshelfFilterPopoverV2(state)}
          <section class="fd-book-grid ${state.view === "list" ? "is-list-view" : "is-cover-view"}" data-book-grid data-bookshelf-view="${state.view}" aria-label="${state.view === "list" ? "书籍列表" : "书籍封面网格"}">
            ${visibleBooks.length === 0
              ? `<p class="fd-bookshelf-empty-inline">当前筛选条件下没有书籍</p>`
              : visibleBooks.map(function (entry) {
                return state.view === "list"
                  ? bookListRowV2(data, entry.book, entry.index, merged)
                  : bookCardV2(data, entry.book, entry.index, merged);
              }).join("")}
          </section>
          ${state.search ? `<p class="fd-bookshelf-search-result-meta">搜索"${esc(state.search)}" · 命中 ${visibleBooks.length} 本</p>` : ""}
        </section>`,
      stateHostHtml: `
        <p class="fd-nav-feedback">当前 Tab：书架 · 视图：${esc(view === "list" ? "列表" : "封面")}${state.group !== "全部" ? " · 分组：" + esc(state.group) : ""}${state.filter !== "全部" ? " · 筛选：" + esc(state.filter) : ""}${viewFeedback ? " · " + viewFeedback : ""}</p>
        ${bookshelfMoreLayerV2()}`
    }));
  }

  // ============ 书架空状态 V2 ============

  /**
   * bookshelfEmptyV2 - 书架空状态增强
   * 覆盖路由：bookshelf-empty
   * 与原 bookshelfEmptyScreen 相比：增加首次空架、清空后空架、导入失败空架三种文案
   */
  function bookshelfEmptyV2(data, route, appState) {
    var reason = (appState && appState.bookshelfEmptyReason) || "first";
    var headline = reason === "cleared" ? "书架已清空" : reason === "import-failed" ? "书架无可用书籍" : "书架还是空的";
    var desc = reason === "cleared"
      ? "已清空所有书籍，阅读记录已保留。可重新搜索或导入本地文件。"
      : reason === "import-failed"
        ? "上次导入的文件均解析失败，可重试导入或换一种格式。"
        : "添加网络书籍或导入本地文件后，会在这里显示继续阅读和书架内容。";
    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone"), {
      data: data,
      title: "书架",
      activeType: "bookshelf",
      actions: ["search", "more"],
      ariaLabel: "书架空状态",
      contentHtml: `
        <section class="fd-bookshelf-shelf-section is-empty" aria-label="我的书架">
          ${bookshelfSectionHeaderV2(bookshelfState(appState), true)}
          <section class="fd-bookshelf-empty-state" data-slot="bookshelfEmpty" aria-label="书架空状态">
            <div class="fd-bookshelf-empty-visual" aria-hidden="true">
              <span>${icon("bookshelf", "fd-medium-icon")}</span>
              <i></i>
              <i></i>
            </div>
            <h2>${esc(headline)}</h2>
            <p>${esc(desc)}</p>
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
              ${reason === "import-failed" ? `<button type="button" data-route="local-import">${icon("refresh", "fd-small-icon")}重试导入</button>` : ""}
            </section>
          </section>
        </section>`,
      stateHostHtml: `<p class="fd-nav-feedback">书架空状态 · 原因：${esc(reason)}</p>${bookshelfMoreLayerV2()}`
    }));
  }

  // ============ 长按菜单真实上下文（替换 contractStatic） ============

  /**
   * bookshelfBookMoreMenuScreen - 真实长按菜单（替换 bookshelf-book-more-menu 的 contractStatic）
   * 展示真实选中书籍上下文（封面/书名/作者/章节/来源/缓存状态），
   * 提供书籍级操作（详情、批量、分组移动、删除、缓存、换源），
   * 并明确焦点恢复和系统返回行为。
   */
  function bookshelfBookMoreMenuScreen(data, route, appState) {
    var books = (data && data.mainTabs && data.mainTabs.books) || [];
    var focusIndex = Math.max(0, Math.min(books.length - 1, Number((appState && appState.bookFocusIndex) || 0)));
    var book = books[focusIndex] || { title: "长夜余火", author: "爱潜水的乌贼", chapter: "第 32 章 雨夜", coverKey: "longNight" };
    var sourceType = bookSourceType(book, focusIndex);
    var readable = bookReadable(book, focusIndex, appState);
    var isLocal = sourceType === "local";

    var actions = [
      { icon: "info", title: "书籍详情", meta: "查看简介、目录与书源信息", route: "book-detail" },
      { icon: "check", title: "多选模式", meta: "进入批量管理并选中当前书籍", route: "book-batch-management" },
      { icon: "people", title: "移动分组", meta: "把当前书籍移到其他分组", route: "group-management" },
      isLocal
        ? { icon: "folder", title: "本地文件信息", meta: "查看导入文件路径与格式", route: "book-detail" }
        : { icon: "source-switch", title: "换源", meta: "切换该书的其他书源", route: "source-switch" },
      readable.cached
        ? { icon: "trash", title: "清除缓存", meta: "删除已缓存章节，保留阅读进度", action: "clear-cache" }
        : { icon: "download", title: "缓存章节", meta: "缓存当前书籍章节供离线阅读", action: "cache" },
      { icon: "bookmark", title: "管理书签", meta: "查看与新增该书书签", route: "book-directory" },
      { icon: "share", title: "分享", meta: "分享书籍信息或当前章节", action: "share" },
      { icon: "trash", title: "移出书架", meta: "只移出书架，保留本地文件和阅读记录", action: "delete", danger: true }
    ];

    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone"), {
      data: data,
      title: "书籍操作",
      activeType: "bookshelf",
      actions: ["search", "more"],
      ariaLabel: "书籍更多操作",
      contentHtml: `
        <section class="fd-bookshelf-shelf-section" aria-label="我的书架">
          ${bookshelfSectionHeaderV2(bookshelfState(appState), false)}
          <section class="fd-book-grid ${((appState && appState.bookshelfView) === "list" ? "is-list-view" : "is-cover-view")}" data-book-grid data-bookshelf-view="${(appState && appState.bookshelfView) === "list" ? "list" : "cover"}" aria-label="书籍封面网格">
            ${books.slice(0, 6).map(function (b, i) {
              return (appState && appState.bookshelfView) === "list"
                ? bookListRowV2(data, b, i, appState)
                : bookCardV2(data, b, i, appState);
            }).join("")}
          </section>
        </section>
        <section class="fd-book-focus-layer is-inline is-open" data-book-focus-layer data-book-focus-index="${focusIndex}" aria-label="书籍操作菜单">
          <button class="fd-book-focus-backdrop" type="button" data-close-book-focus aria-label="关闭书籍操作层"></button>
          <section class="fd-book-focus-menu" role="dialog" aria-modal="true" aria-label="${esc(book.title)}操作">
            <header>
              <span class="fd-book-focus-cover" data-focus-cover aria-hidden="true" style="--focus-cover:url('${coverCss(data, book.coverKey)}')"></span>
              <strong data-focus-title>${esc(book.title)}</strong>
              <small data-focus-meta>${esc(book.author)} · ${esc(book.chapter)}</small>
              <div class="fd-book-focus-meta-row" aria-label="书籍来源与可读性">
                <em class="fd-book-source-tag ${isLocal ? "is-local" : "is-network"}">${isLocal ? "本地书" : "网络书"}</em>
                <i class="fd-book-cache-tag ${readable.cached ? "is-cached" : "is-missing"}">${readable.label}</i>
              </div>
            </header>
            <div>
              ${actions.map(function (item) {
                return `<button class="${item.danger ? "is-danger" : ""}" type="button"${item.route ? ` data-route="${esc(item.route)}"` : ` data-book-action="${esc(item.action)}"`} data-book-focus-action>
                  ${icon(item.icon, "fd-small-icon")}
                  <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
                </button>`;
              }).join("")}
            </div>
            <footer>
              <button type="button" data-close-book-focus data-route="bookshelf">${icon("chevron-left", "fd-small-icon")}返回书架</button>
              <span class="fd-book-focus-hint">系统返回将关闭菜单并恢复书架焦点</span>
            </footer>
          </section>
        </section>`,
      stateHostHtml: `
        <p class="fd-nav-feedback">长按菜单 · 选中：${esc(book.title)} · 来源：${isLocal ? "本地" : "网络"} · 焦点恢复到书架</p>
        ${bookshelfMoreLayerV2()}`
    }));
  }

  // ============ 批量管理 V2：批量选择与批量操作闭环 ============

  /**
   * bookBatchManagementV2 - 批量管理增强
   * 覆盖路由：book-batch-management
   * 与原 bookBatchManagementScreen 相比：
   *   - 真实选择状态（全选/反选/单选）
   *   - 批量操作闭环：移动分组 / 删除 / 缓存 / 标记已读
   *   - 本地书与网络书差异标识
   *   - 操作确认与结果反馈
   */
  function bookBatchManagementV2(data, route, appState) {
    var books = ((data && data.mainTabs && data.mainTabs.books) || []).slice(0, 6).map(function (book, index) {
      var group = index % 3 === 0 ? "追更" : index % 3 === 1 ? "默认" : "本地书";
      var selected = (appState && appState.batchSelected && appState.batchSelected.indexOf(index) >= 0) || index < 3;
      return Object.assign({}, book, {
        selected: selected,
        group: group,
        sourceType: bookSourceType(book, index),
        readable: bookReadable(book, index, appState)
      });
    });
    var selectedCount = books.filter(function (b) { return b.selected; }).length;
    var allSelected = selectedCount === books.length;
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data: data,
      title: "批量管理",
      ariaLabel: "书籍批量管理",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      contentHtml: `
        <section class="fd-batch-summary" aria-label="批量选择状态">
          <strong>已选 ${selectedCount} 本</strong>
          <span>长按书籍或从更多菜单进入，选择后统一移动分组、删除或取消选择。</span>
          <button type="button" data-batch-select-all aria-pressed="${allSelected ? "true" : "false"}">${allSelected ? "取消全选" : "全选"}</button>
        </section>
        <section class="fd-management-list is-book-batch">
          <h2>书架书籍</h2>
          ${books.map(function (book) {
            return `<article class="${book.selected ? "is-selected" : ""}" data-batch-book data-batch-index="${books.indexOf(book)}">
              <button class="fd-book-select-toggle" type="button" aria-pressed="${book.selected ? "true" : "false"}" data-batch-toggle>${book.selected ? icon("check", "fd-small-icon") : ""}</button>
              <img src="${cover(data, book.coverKey)}" alt="${esc(book.title)}封面">
              <span>
                <strong>${esc(book.title)}</strong>
                <small>${esc(book.author)} · ${esc(book.chapter)}</small>
                <div class="fd-book-list-meta">
                  <em class="fd-book-source-tag ${book.sourceType === "local" ? "is-local" : "is-network"}">${book.sourceType === "local" ? "本地" : "网络"}</em>
                  <i class="fd-book-cache-tag ${book.readable.cached ? "is-cached" : "is-missing"}">${book.readable.label}</i>
                </div>
              </span>
              <em>${esc(book.group)}</em>
            </article>`;
          }).join("")}
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button" data-route="group-management" ${selectedCount === 0 ? " disabled" : ""}>${icon("people", "fd-small-icon")}移动分组</button>
          <button type="button" data-batch-cache ${selectedCount === 0 ? " disabled" : ""}>${icon("download", "fd-small-icon")}缓存所选</button>
          <button type="button" data-batch-mark-read ${selectedCount === 0 ? " disabled" : ""}>${icon("check", "fd-small-icon")}标记已读</button>
          <button class="is-danger" type="button" data-batch-delete ${selectedCount === 0 ? " disabled" : ""}>${icon("trash", "fd-small-icon")}删除所选</button>
        </div>`
    }));
  }

  // ============ 分组管理 V2：CRUD 和排序 ============

  /**
   * groupManagementV2 - 分组管理增强
   * 覆盖路由：group-management / bookshelf-group-management
   * 与原 groupManagementScreen 相比：
   *   - 完整 CRUD：新建 / 重命名 / 删除（带确认）
   *   - 拖拽排序（data-group-drag）
   *   - 分组内书籍数量与可读性统计
   *   - 书籍归属可拖拽移动
   */
  function groupManagementV2(data, route, appState) {
    var groups = [
      { name: "默认分组", meta: "8 本 · 当前分组", count: 8, action: "管理", canDelete: false, canRename: true },
      { name: "追更", meta: "5 本 · 置顶显示", count: 5, action: "管理", canDelete: true, canRename: true },
      { name: "本地书", meta: "2 本 · 导入书籍", count: 2, action: "管理", canDelete: true, canRename: true },
      { name: "资料", meta: "3 本 · 可重命名", count: 3, action: "管理", canDelete: true, canRename: true }
    ];
    var books = (data && data.mainTabs && data.mainTabs.books) || [];
    var assignments = books.slice(0, 6).map(function (book, index) {
      var group = bookshelfBookGroup(book, index);
      return {
        title: book.title,
        author: book.author,
        chapter: book.chapter,
        meta: book.author + " · 当前分组",
        group: group,
        sourceType: bookSourceType(book, index)
      };
    });
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data: data,
      title: "分组管理",
      ariaLabel: "分组管理",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      contentHtml: `
        <section class="fd-management-list is-group-flow">
          <h2>分组列表（可拖拽排序）</h2>
          ${groups.map(function (group, index) {
            return `<article data-group-row data-group-name="${esc(group.name)}" draggable="true">
              ${icon("drag", "fd-small-icon fd-group-drag-handle")}
              <span>
                <strong>${esc(group.name)}</strong>
                <small>${esc(group.meta)}</small>
              </span>
              <button type="button" data-group-manage data-group-target="${esc(group.name)}">${esc(group.action)}</button>
              ${group.canRename ? `<button class="is-plain" type="button" data-group-rename data-group-target="${esc(group.name)}" aria-label="重命名分组">${icon("edit", "fd-small-icon")}</button>` : ""}
              ${group.canDelete ? `<button class="is-plain" type="button" data-group-delete data-group-target="${esc(group.name)}" aria-label="删除分组">${icon("trash", "fd-small-icon")}</button>` : ""}
            </article>`;
          }).join("")}
        </section>
        <section class="fd-management-list is-assignment-flow">
          <h2>书籍归属（可拖拽到其他分组）</h2>
          ${assignments.map(function (item) {
            return `<article data-assignment-row data-assignment-group="${esc(item.group)}">
              ${icon("book-open", "fd-small-icon")}
              <span>
                <strong>${esc(item.title)}</strong>
                <small>${esc(item.author)} · ${esc(item.chapter)}</small>
              </span>
              <em class="fd-book-source-tag ${item.sourceType === "local" ? "is-local" : "is-network"}">${esc(item.group)}</em>
            </article>`;
          }).join("")}
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button" data-group-create>${icon("plus", "fd-small-icon")}新建分组</button>
          <button type="button" data-route-back>完成</button>
        </div>`
    }));
  }

  // ============ 排序筛选 V2：组合状态 ============

  /**
   * sortFilterV2 - 书架排序筛选弹层组合状态
   * 覆盖路由：sort-filter
   * 展示分组/排序/筛选/搜索的组合状态，并显示当前命中数量。
   */
  function sortFilterV2(data, route, appState) {
    var state = bookshelfState(Object.assign({}, appState, { bookshelfFilterOpen: true }));
    var books = (data && data.mainTabs && data.mainTabs.books) || [];
    var visibleBooks = bookshelfVisibleBooks(books, state);
    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone"), {
      data: data,
      title: "书架",
      activeType: "bookshelf",
      actions: ["search", "more"],
      ariaLabel: "书架排序筛选",
      contentHtml: `
        <section class="fd-bookshelf-shelf-section" aria-label="我的书架">
          ${bookshelfSectionHeaderV2(state, false)}
          ${bookshelfFilterPopoverV2(state)}
          <section class="fd-book-grid ${state.view === "list" ? "is-list-view" : "is-cover-view"}" data-book-grid data-bookshelf-view="${state.view}" aria-label="${state.view === "list" ? "书籍列表" : "书籍封面网格"}">
            ${visibleBooks.length === 0
              ? `<p class="fd-bookshelf-empty-inline">当前组合条件下没有书籍，请重置筛选或搜索。</p>`
              : visibleBooks.map(function (entry) {
                return state.view === "list"
                  ? bookListRowV2(data, entry.book, entry.index, state)
                  : bookCardV2(data, entry.book, entry.index, state);
              }).join("")}
          </section>
          <p class="fd-bookshelf-filter-result-meta">分组：${esc(state.group)} · 排序：${esc(state.sort)} · 筛选：${esc(state.filter)}${state.search ? " · 搜索：" + esc(state.search) : ""} · 命中 ${visibleBooks.length}/${books.length}</p>
        </section>`,
      stateHostHtml: `<p class="fd-nav-feedback">排序筛选组合 · 命中 ${visibleBooks.length} 本</p>${bookshelfMoreLayerV2()}`
    }));
  }

  // ============ 书籍详情 V2：状态变体补全 ============

  /**
   * bookDetailV2 - 书籍详情状态变体补全
   * 覆盖路由：book-detail / book-detail-toc-preview
   * 状态变体：正常 / 加载中 / 离线 / 无目录 / 已删书
   * 与原 libraryScreen 相比：
   *   - 加载中显示骨架
   *   - 离线显示缓存目录可读提示
   *   - 无目录显示解析失败重试
   *   - 已删书显示重新加入书架入口
   */
  function bookDetailV2(data, route, appState) {
    var book = (data && data.library && data.library.book) || { title: "长夜余火", author: "爱潜水的乌贼", coverKey: "longNight" };
    var detailState = (appState && appState.bookDetailState) || "normal";
    var sourceName = String(book.source || "").split("·")[0].trim() || "当前书源";
    var intro = book.intro || "旧世界的余烬尚未冷却，新的秩序已经在废墟之上生长。主角沿着被遗忘的线索追寻真相，也在一次次选择里确认自己想守住的东西。";
    var tocPreview = route === "book-detail-toc-preview";
    var chapters = (data && data.library && data.library.chapters) || [];

    // 状态变体：加载中
    if (detailState === "loading") {
      return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
        data: data,
        title: "书籍详情",
        ariaLabel: "书籍详情加载中",
        topBarClass: "fd-back-bar",
        contentHtml: `
          <section class="fd-book-hero fd-book-detail-hero is-skeleton">
            <i class="fd-book-hero-cover-skeleton"></i>
            <div class="fd-book-identity">
              <h2><b class="fd-skeleton-line"></b></h2>
              <p class="fd-book-author"><b class="fd-skeleton-line"></b></p>
              <dl class="fd-book-facts"><div><dt>最新</dt><dd><b class="fd-skeleton-line"></b></dd></div></dl>
            </div>
          </section>
          <section class="fd-book-summary-card is-skeleton">
            <h2>简介</h2>
            <p><b class="fd-skeleton-line"></b><b class="fd-skeleton-line"></b><b class="fd-skeleton-line"></b></p>
          </section>
          <section class="fd-chapter-list fd-book-chapter-preview is-skeleton">
            <header><h2>章节信息</h2></header>
            ${Array.from({ length: 4 }).map(function () {
              return `<article><b class="fd-skeleton-line"></b></article>`;
            }).join("")}
          </section>`,
        stateHostHtml: `<p class="fd-nav-feedback">书籍详情加载中 · 保留返回到书架</p>`
      }));
    }

    // 状态变体：离线
    if (detailState === "offline") {
      return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
        data: data,
        title: "书籍详情",
        ariaLabel: "书籍详情离线状态",
        topBarClass: "fd-back-bar",
        contentHtml: `
          <section class="fd-book-hero fd-book-detail-hero">
            <img src="${cover(data, book.coverKey)}" alt="${esc(book.title)}封面">
            <div class="fd-book-identity">
              <h2>${esc(book.title)}</h2>
              <p class="fd-book-author">${esc(book.author)}</p>
              <div class="fd-book-inline-source-row">
                <span>${icon("offline", "fd-small-icon")}离线模式 · 书源信息不可用</span>
              </div>
            </div>
          </section>
          <section class="fd-book-offline-banner">
            ${icon("offline", "fd-small-icon")}
            <span>当前为离线状态，仅展示已缓存章节，书源信息和最新章节不可用。</span>
            <button type="button" data-book-detail-retry>重连</button>
          </section>
          <section class="fd-book-summary-card">
            <h2>简介（缓存）</h2>
            <p>${esc(intro)}</p>
          </section>
          <section class="fd-chapter-list fd-book-chapter-preview">
            <header><h2>章节信息（缓存）</h2></header>
            ${chapters.slice(0, 3).map(function (chapter, index) {
              return `<article role="button" tabindex="0" data-route="immersive-reading">
                <span>${esc(chapter.title)}</span>
                <em class="fd-book-cache-tag is-cached">${icon("download", "fd-small-icon")}已缓存</em>
              </article>`;
            }).join("")}
            <p class="fd-book-detail-offline-meta">已缓存 ${chapters.length} 章 · 联网后可查看完整目录</p>
          </section>`,
        bottomActionHtml: `<div class="fd-fixed-action-row"><button type="button" data-route="immersive-reading">阅读缓存章节</button></div>`,
        stateHostHtml: `<p class="fd-nav-feedback">书籍详情离线 · 已缓存 ${chapters.length} 章</p>`
      }));
    }

    // 状态变体：无目录 / 目录解析失败
    if (detailState === "no-toc") {
      return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
        data: data,
        title: "书籍详情",
        ariaLabel: "书籍详情目录解析失败",
        topBarClass: "fd-back-bar",
        contentHtml: `
          <section class="fd-book-hero fd-book-detail-hero">
            <img src="${cover(data, book.coverKey)}" alt="${esc(book.title)}封面">
            <div class="fd-book-identity">
              <h2>${esc(book.title)}</h2>
              <p class="fd-book-author">${esc(book.author)}</p>
            </div>
          </section>
          <section class="fd-book-summary-card">
            <h2>简介</h2>
            <p>${esc(intro)}</p>
          </section>
          <section class="fd-chapter-list fd-book-chapter-preview is-error">
            <header><h2>章节信息</h2></header>
            <div class="fd-book-detail-toc-error">
              ${icon("warning", "fd-medium-icon")}
              <h3>目录解析失败</h3>
              <p>当前书源的目录规则未能解析出章节列表。可重试、编辑书源或切换书源。</p>
              <div>
                <button type="button" data-book-detail-retry-toc>${icon("refresh", "fd-small-icon")}重试解析</button>
                <button type="button" data-route="source-switch">${icon("source-switch", "fd-small-icon")}切换书源</button>
                <button type="button" data-route="source-debug">${icon("code", "fd-small-icon")}调试书源</button>
              </div>
            </div>
          </section>`,
        bottomActionHtml: `<div class="fd-fixed-action-row"><button type="button" data-route="source-switch">换源</button></div>`,
        stateHostHtml: `<p class="fd-nav-feedback">目录解析失败 · 可重试或换源</p>`
      }));
    }

    // 状态变体：已删书 / 不在书架
    if (detailState === "removed") {
      return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
        data: data,
        title: "书籍详情",
        ariaLabel: "书籍已从书架移除",
        topBarClass: "fd-back-bar",
        contentHtml: `
          <section class="fd-book-hero fd-book-detail-hero is-removed">
            <img src="${cover(data, book.coverKey)}" alt="${esc(book.title)}封面">
            <div class="fd-book-identity">
              <h2>${esc(book.title)}</h2>
              <p class="fd-book-author">${esc(book.author)}</p>
              <div class="fd-book-inline-source-row">
                <span>${icon("trash", "fd-small-icon")}已从书架移除</span>
              </div>
            </div>
          </section>
          <section class="fd-book-summary-card">
            <h2>简介</h2>
            <p>${esc(intro)}</p>
          </section>
          <section class="fd-book-detail-removed-state">
            ${icon("info", "fd-medium-icon")}
            <h3>这本书已不在书架</h3>
            <p>阅读记录已保留。可重新加入书架继续阅读，或回到书架选择其他书籍。</p>
            <div>
              <button class="is-primary" type="button" data-book-detail-readd>${icon("plus", "fd-small-icon")}重新加入书架</button>
              <button type="button" data-route="bookshelf">${icon("bookshelf", "fd-small-icon")}返回书架</button>
            </div>
          </section>`,
        stateHostHtml: `<p class="fd-nav-feedback">书籍已移出书架 · 阅读记录保留</p>`
      }));
    }

    // 正常状态
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data: data,
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
                <dd>${esc(book.latest || "第 32 章 雨夜")}</dd>
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
          ${tocPreview
            ? chapters.slice(0, 3).map(function (chapter, index) {
              return `<article role="button" tabindex="0" data-route="immersive-reading">
                <span>${esc(chapter.title)}</span>
              </article>`;
            }).join("") + `<p class="fd-book-detail-toc-preview-meta">仅预览前 3 章 · 完整目录共 ${chapters.length} 章</p>`
            : chapters.map(function (chapter, index) {
              return `<article role="button" tabindex="0" data-route="immersive-reading">
                <span>${esc(chapter.title)}</span>
              </article>`;
            }).join("")}
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

  // ============ 书籍目录 V2 ============

  /**
   * bookDirectoryV2 - 书籍目录状态变体
   * 覆盖路由：book-directory
   * 状态变体：正常 / 加载中 / 离线 / 解析失败
   */
  function bookDirectoryV2(data, route, appState) {
    var book = (data && data.library && data.library.book) || { title: "长夜余火", author: "爱潜水的乌贼" };
    var chapters = ((data && data.library && data.library.chapters) || []).concat([
      { title: "第 34 章 旧地图", markers: ["已缓存"] },
      { title: "第 35 章 夜行", markers: [] },
      { title: "第 36 章 灯塔之后", markers: ["书签"] }
    ]);
    var tocMode = (appState && appState.readerTocMode) === "bookmark" ? "bookmark" : "directory";
    var visibleChapters = tocMode === "bookmark"
      ? chapters.filter(function (c) { return (c.markers || []).indexOf("书签") >= 0; })
      : chapters;
    var dirState = (appState && appState.bookDirectoryState) || "normal";

    if (dirState === "loading") {
      return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
        data: data,
        title: "书籍目录",
        ariaLabel: "目录加载中",
        topBarClass: "fd-back-bar",
        contentHtml: `
          <section class="fd-chapter-list fd-directory-full-list is-skeleton">
            <header><strong><b class="fd-skeleton-line"></b></strong></header>
            ${Array.from({ length: 6 }).map(function () {
              return `<article><b class="fd-skeleton-line"></b></article>`;
            }).join("")}
          </section>`
      }));
    }

    if (dirState === "error") {
      return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
        data: data,
        title: "书籍目录",
        ariaLabel: "目录解析失败",
        topBarClass: "fd-back-bar",
        contentHtml: `
          <section class="fd-chapter-list fd-directory-full-list is-error">
            <header><strong>${esc(book.title)}</strong></header>
            <div class="fd-book-detail-toc-error">
              ${icon("warning", "fd-medium-icon")}
              <h2>目录解析失败</h2>
              <p>可重试、换源或调试书源规则。</p>
              <div>
                <button type="button" data-book-directory-retry>${icon("refresh", "fd-small-icon")}重试</button>
                <button type="button" data-route="source-switch">${icon("source-switch", "fd-small-icon")}换源</button>
              </div>
            </div>
          </section>`
      }));
    }

    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data: data,
      title: "书籍目录",
      ariaLabel: "书籍目录",
      topBarClass: "fd-back-bar",
      contentHtml: `
        <section class="fd-chapter-list fd-directory-full-list">
          <header class="fd-directory-full-head">
            <span>
              <strong>${esc(book.title)}</strong>
              <small>${esc(book.author)} · 共 ${chapters.length} 章</small>
            </span>
          </header>
          <nav class="fd-directory-toc-switch-row" aria-label="目录书签切换">
            <button class="${tocMode === "directory" ? "is-active" : ""}" type="button" data-reader-toc-mode="directory">目录</button>
            <button class="${tocMode === "bookmark" ? "is-active" : ""}" type="button" data-reader-toc-mode="bookmark">书签</button>
          </nav>
          <div class="fd-directory-full-rows">
            ${visibleChapters.length === 0
              ? `<p class="fd-bookshelf-empty-inline">${tocMode === "bookmark" ? "暂无书签章节" : "目录为空"}</p>`
              : visibleChapters.map(function (chapter) {
                return `<article role="button" tabindex="0" data-route="immersive-reading">
                  <span>${esc(chapter.title)}</span>
                  ${(chapter.markers || []).map(function (m) {
                    return `<em class="fd-chapter-marker">${esc(m)}</em>`;
                  }).join("")}
                </article>`;
              }).join("")}
          </div>
        </section>`
    }));
  }

  // ============ 书架搜索 V2 ============

  /**
   * bookSearchV2 - 书架搜索状态变体
   * 覆盖路由：book-search / search-home / search-results
   */
  function bookSearchV2(data, route, appState) {
    var phase = route === "search-home" ? "before"
      : route === "search-results" ? "after"
      : (appState && appState.bookSearchPhase) || "before";
    var history = ["长夜", "诡秘", "三体", "明朝那些事"];
    var suggestions = ["长夜余火", "诡秘之主", "三体", "明朝那些事儿"];
    var results = [
      { title: "长夜余火", author: "爱潜水的乌贼", coverKey: "longNight", source: "优书网", inShelf: true },
      { title: "诡秘之主", author: "爱潜水的乌贼", coverKey: "mysteryLord", source: "书仓搜索", inShelf: true },
      { title: "三体", author: "刘慈欣", coverKey: "threeBody", source: "起点导入", inShelf: false }
    ];
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data: data,
      title: "搜索书籍",
      ariaLabel: "搜索书籍",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      contentHtml: `
        <section class="fd-search-bar">
          <input type="search" placeholder="搜索书名、作者或关键词" value="${esc((appState && appState.bookSearchQuery) || "")}" data-book-search-input>
          <button type="button" data-book-search-submit>${icon("search", "fd-small-icon")}</button>
        </section>
        ${phase === "before" ? `
          <section class="fd-search-history">
            <h2>搜索历史</h2>
            <div>
              ${history.map(function (h) {
                return `<button type="button" data-book-search-history="${esc(h)}">${esc(h)}</button>`;
              }).join("")}
              <button type="button" data-book-search-clear-history>清除历史</button>
            </div>
          </section>
          <section class="fd-search-suggestions">
            <h2>热门搜索</h2>
            <div>
              ${suggestions.map(function (s) {
                return `<button type="button" data-book-search-suggestion="${esc(s)}">${esc(s)}</button>`;
              }).join("")}
            </div>
          </section>
        ` : `
          <section class="fd-search-results">
            <h2>搜索结果（${results.length}）</h2>
            ${results.map(function (r) {
              return `<article class="fd-search-result-row" role="button" tabindex="0" data-route="book-detail">
                <img src="${cover(data, r.coverKey)}" alt="${esc(r.title)}封面">
                <span>
                  <strong>${esc(r.title)}</strong>
                  <small>${esc(r.author)} · ${esc(r.source)}</small>
                </span>
                ${r.inShelf
                  ? `<em class="fd-book-source-tag is-cached">已在书架</em>`
                  : `<button type="button" data-search-add-to-bookshelf>${icon("plus", "fd-small-icon")}加入书架</button>`}
              </article>`;
            }).join("")}
          </section>
        `}`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          ${phase === "after"
            ? `<button type="button" data-search-reset>重新搜索</button><button type="button" data-route="book-detail">查看详情</button>`
            : `<button type="button" data-book-search-submit data-primary-search-submit>开始搜索</button><button type="button" data-book-search-clear-history>清除历史</button>`}
        </div>`
    }));
  }

  // ============ 本地导入 V2 ============

  /**
   * localImportV2 - 本地导入状态变体
   * 覆盖路由：local-import
   * 状态变体：选择文件 / 解析中 / 部分成功 / 完成
   */
  function localImportV2(data, route, appState) {
    var imports = [
      { title: "雨夜.epub", meta: "作者已识别 · 加入默认分组", state: "可导入", tone: "good" },
      { title: "旧书扫描.txt", meta: "编码 UTF-8 · 章节识别中", state: "72%", tone: "warn" },
      { title: "缺失章节.mobi", meta: "格式不支持 · 可移除后重选", state: "失败", tone: "danger" }
    ];
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone"), {
      data: data,
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
          ${imports.map(function (item) {
            return `<article class="is-${esc(item.tone)}">
              ${icon(item.tone === "danger" ? "warning" : "book-open", "fd-small-icon")}
              <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
              <em>${esc(item.state)}</em>
            </article>`;
          }).join("")}
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button" data-route="bookshelf">取消</button>
          <button class="is-primary" type="button" data-local-import-confirm>${icon("check", "fd-small-icon")}确认导入</button>
        </div>`
    }));
  }

  // ============ 书架与搜索设置 V2 ============

  /**
   * bookshelfSearchSettingsV2 - 书架与搜索设置状态变体
   * 覆盖路由：bookshelf-search-settings
   */
  function bookshelfSearchSettingsV2(data, route, appState) {
    return shellKit().renderSettingsShell(Object.assign(phoneShellClasses("fd-settings-phone"), {
      data: data,
      title: "书架与搜索设置",
      ariaLabel: "书架与搜索设置",
      topBarClass: "fd-back-bar",
      contentClass: "fd-phone-content fd-settings-content",
      contentHtml: `<section class="fd-setting-section">
          <h2>书架显示</h2>
          <article class="fd-setting-row is-select" role="group" tabindex="-1">
            <span>${icon("grid", "fd-small-icon")}</span>
            <strong>默认视图<small>封面网格</small></strong>
            <em class="fd-settings-row-side is-action"><button class="fd-settings-row-action" type="button" data-settings-option="bookshelf-default-view">更改</button></em>
          </article>
          <article class="fd-setting-row is-select" role="group" tabindex="-1">
            <span>${icon("filter", "fd-small-icon")}</span>
            <strong>默认排序<small>最近更新</small></strong>
            <em class="fd-settings-row-side is-action"><button class="fd-settings-row-action" type="button" data-settings-option="bookshelf-default-sort">更改</button></em>
          </article>
          <article class="fd-setting-row is-select" role="group" tabindex="-1">
            <span>${icon("download", "fd-small-icon")}</span>
            <strong>缓存策略<small>Wi-Fi 下自动缓存</small></strong>
            <em class="fd-settings-row-side is-action"><button class="fd-settings-row-action" type="button" data-settings-option="bookshelf-cache-policy">更改</button></em>
          </article>
        </section>
        <section class="fd-setting-section">
          <h2>本地书与网络书</h2>
          <article class="fd-setting-row is-switch" role="group" tabindex="-1">
            <span>${icon("folder", "fd-small-icon")}</span>
            <strong>本地书标识<small>显示本地书来源标识</small></strong>
            <em class="fd-settings-row-side is-switch"><button class="fd-settings-switch is-on" type="button" data-settings-toggle="show-local-badge" aria-pressed="true" aria-label="本地书标识"><i></i></button></em>
          </article>
          <article class="fd-setting-row is-switch" role="group" tabindex="-1">
            <span>${icon("source-stack", "fd-small-icon")}</span>
            <strong>网络书缓存状态<small>显示缓存/未缓存标识</small></strong>
            <em class="fd-settings-row-side is-switch"><button class="fd-settings-switch is-on" type="button" data-settings-toggle="show-cache-badge" aria-pressed="true" aria-label="网络书缓存状态"><i></i></button></em>
          </article>
          <article class="fd-setting-row is-switch" role="group" tabindex="-1">
            <span>${icon("warning", "fd-small-icon")}</span>
            <strong>更新失败提醒<small>书架书籍更新失败时显示角标</small></strong>
            <em class="fd-settings-row-side is-switch"><button class="fd-settings-switch" type="button" data-settings-toggle="show-update-failed" aria-pressed="false" aria-label="更新失败提醒"><i></i></button></em>
          </article>
        </section>
        <section class="fd-setting-section">
          <h2>搜索</h2>
          <article class="fd-setting-row is-select" role="group" tabindex="-1">
            <span>${icon("search", "fd-small-icon")}</span>
            <strong>默认搜索源<small>全部已启用书源</small></strong>
            <em class="fd-settings-row-side is-action"><button class="fd-settings-row-action" type="button" data-settings-option="search-default-sources">更改</button></em>
          </article>
          <article class="fd-setting-row is-select" role="group" tabindex="-1">
            <span>${icon("history", "fd-small-icon")}</span>
            <strong>搜索历史<small>保留 20 条</small></strong>
            <em class="fd-settings-row-side is-action"><button class="fd-settings-row-action" type="button" data-settings-option="search-history-limit">更改</button></em>
          </article>
        </section>`
    }));
  }

  // ============ 发现数据提取 ============

  // 发现上下文（与 render-runtime.js discoverContext 行为一致）
  function discoverContextV2(route, appState) {
    var entryRouteMap = {
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
    var filterRouteMap = {
      "discover-filter-keyword": "关键词",
      "discover-filter-male": "男频",
      "discover-filter-female": "女频",
      "discover-filter-source-type": "正版源",
      "discover-filter-category": "分类"
    };
    var sortRouteMap = {
      "discover-sort-popularity": "人气",
      "discover-sort-update": "更新",
      "discover-sort-collection": "收藏",
      "discover-sort-finished": "完本",
      "discover-sort-words": "字数"
    };
    var switched = route === "discover-switched-source";
    var source = switched
      ? { name: "起点导入", meta: "正版 · 已启用发现 · 180ms", status: "已启用发现", speed: "180ms" }
      : { name: "优书网", meta: "默认分组 · 已启用发现 · 120ms", status: "已启用发现", speed: "120ms" };
    var entries = switched ? ["畅销", "分类", "新书", "完本"] : ["排行榜", "书源", "分类", "完本", "最新", "书单"];
    var routedEntry = entryRouteMap[route];
    var routedFilter = filterRouteMap[route];
    var stateEntry = appState && appState.discoverEntry;
    var activeEntry = routedEntry && entries.indexOf(routedEntry) >= 0
      ? routedEntry
      : stateEntry && entries.indexOf(stateEntry) >= 0
        ? stateEntry
        : entries[0];
    var activeFilter = routedFilter || (appState && appState.discoverFilter) || "男频";
    var sort = sortRouteMap[route] || (appState && appState.discoverSort) || (switched ? "更新" : "人气");
    var sortOpen = route === "discover-sort" || Boolean(appState && appState.discoverSortOpen);
    return {
      route: route,
      source: source,
      entries: entries,
      activeEntry: activeEntry,
      activeFilter: activeFilter,
      sort: sort,
      sortOpen: sortOpen,
      switched: switched
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

  // 发现书籍列表（带"已在书架"标识）
  function discoverBooksV2(route) {
    var switched = route === "discover-switched-source";
    var base = switched
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
    return base;
  }

  // 发现源栏
  function discoverSourceBarHtml(ctx, expanded, route) {
    var target = expanded ? "discover" : "discover-control";
    return `
      <button class="fd-discover-source-bar${expanded ? " is-expanded" : ""}" type="button" data-route="${esc(target)}" aria-expanded="${expanded ? "true" : "false"}">
        <span>${icon("source-stack", "fd-small-icon")}</span>
        <strong>${esc(ctx.source.name)}<small>${esc(ctx.source.meta)}</small></strong>
        ${icon("chevron", "fd-small-icon fd-discover-source-chevron")}
      </button>`;
  }

  // 发现入口 chips
  function discoverEntryChipsHtml(ctx) {
    return `<nav class="fd-discover-entry-row" aria-label="发现入口">
      ${ctx.entries.map(function (item) {
        var active = item === ctx.activeEntry;
        return `<button class="${active ? "is-active" : ""}" type="button" data-route="${esc(discoverEntryRoute(item))}" data-discover-entry="${esc(item)}"${active ? ' aria-current="page"' : ""}>${esc(item)}</button>`;
      }).join("")}
    </nav>`;
  }

  // 发现筛选/排序栏
  function discoverFilterBarHtml(ctx) {
    var filters = ["关键词", "男频", "女频", "正版源", "分类"];
    return `
      <section class="fd-discover-filter-control" aria-label="发现筛选与排序">
        <div class="fd-discover-filter-row">
          ${filters.map(function (f) {
            return `<button class="${f === ctx.activeFilter ? "is-active" : ""}" type="button" data-discover-filter="${esc(f)}"${f === ctx.activeFilter ? ' aria-current="true"' : ""}>${esc(f)}</button>`;
          }).join("")}
        </div>
        <div class="fd-discover-sort-row">
          <button type="button" data-discover-sort-toggle aria-expanded="${ctx.sortOpen ? "true" : "false"}">${icon("sort", "fd-small-icon")}排序：${esc(ctx.sort)}</button>
          <button type="button" data-route="discover-sort">${icon("chevron", "fd-small-icon")}</button>
        </div>
      </section>`;
  }

  // 发现书籍行（带换源入口）
  function discoverBookRowsHtml(data, route, faded) {
    return `
      <section class="fd-discover-book-list${faded ? " is-muted" : ""}" aria-label="发现结果列表">
        ${discoverBooksV2(route).map(function (row) {
          var title = row[0], author = row[1], kind = row[2], latest = row[3], intro = row[4], coverKey = row[5], inShelf = row[6];
          return `<article class="fd-discover-book-row" role="button" tabindex="0" data-route="book-detail">
            <img src="${cover(data, coverKey)}" alt="${esc(title)}封面">
            <div class="fd-discover-book-info">
              <strong>${esc(title)}</strong>
              <small>${esc(author)} · ${esc(kind)}</small>
              <em>${esc(latest)}</em>
              <p>${esc(intro)}</p>
            </div>
            <div class="fd-discover-book-actions">
              ${inShelf
                ? `<em class="fd-book-source-tag is-cached">已在书架</em>`
                : `<button type="button" data-discover-add-to-bookshelf data-book-title="${esc(title)}">${icon("plus", "fd-small-icon")}加入书架</button>`}
              <button type="button" data-route="source-switch" aria-label="换源">${icon("source-switch", "fd-small-icon")}</button>
            </div>
          </article>`;
        }).join("")}
      </section>`;
  }

  // 发现加载骨架
  function discoverSkeletonListHtml() {
    return `<section class="fd-discover-skeleton-list" aria-label="发现结果加载中">
      ${Array.from({ length: 4 }).map(function () {
        return `<article>
          <i></i>
          <span><b></b><b></b><b></b><b></b></span>
        </article>`;
      }).join("")}
    </section>`;
  }

  // ============ 发现主 renderer V2：入口/筛选/排序组合状态 ============

  /**
   * discoverV2 - 发现主 renderer 状态变体增强
   * 覆盖路由：discover / discover-home / discover-control / discover-sort /
   *           discover-entry-* / discover-filter-* / discover-sort-*
   * 与原 mainTabDiscover 相比：
   *   - 入口、筛选、排序的组合状态显式展示
   *   - 控制层展开时显示书源选择与状态
   *   - 每本书显示"已在书架"标识与换源入口
   *   - 搜索/筛选组合状态反馈
   */
  function discoverV2(data, route, appState) {
    var ctx = discoverContextV2(route, appState);
    var expanded = ["discover-control", "discover-cache-confirm", "discover-switching-source", "discover-entry-error"].indexOf(route) >= 0;
    var sourceBarHtml = discoverSourceBarHtml(ctx, expanded, route);
    var entryChipsHtml = expanded ? "" : discoverEntryChipsHtml(ctx);
    var filterBarHtml = expanded ? "" : discoverFilterBarHtml(ctx);
    var bookRowsHtml = discoverBookRowsHtml(data, route, false);

    var combinationFeedback = "入口：" + ctx.activeEntry + " · 筛选：" + ctx.activeFilter + " · 排序：" + ctx.sort;

    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone fd-discover-phone"), {
      data: data,
      title: "发现",
      activeType: "discover",
      actions: ["refresh"],
      ariaLabel: "发现",
      contentClass: "fd-phone-content fd-discover-content",
      contentHtml: `
        ${sourceBarHtml}
        ${expanded ? `
          <section class="fd-discover-control-panel" aria-label="发现控制层">
            <h2>书源选择</h2>
            <article>
              ${icon("source-stack", "fd-small-icon")}
              <span><strong>优书网</strong><small>默认分组 · 已启用发现 · 120ms</small></span>
              <em class="fd-book-source-tag is-cached">当前</em>
            </article>
            <article>
              ${icon("source-stack", "fd-small-icon")}
              <span><strong>起点导入</strong><small>正版 · 已启用发现 · 180ms</small></span>
              <button type="button" data-route="discover-switching-source">切换</button>
            </article>
            <article>
              ${icon("source-stack", "fd-small-icon")}
              <span><strong>轻小说文库</strong><small>需登录 · 发现可用</small></span>
              <button type="button" data-route="discover-source-login">登录</button>
            </article>
            <article>
              ${icon("source-stack", "fd-small-icon")}
              <span><strong>本地聚合源</strong><small>维护中 · 暂停发现</small></span>
              <button type="button" disabled>已禁用</button>
            </article>
            <div class="fd-discover-control-actions">
              <button type="button" data-route="discover-source-bulk">${icon("settings", "fd-small-icon")}批量管理</button>
              <button type="button" data-route="discover-rule-test">${icon("code", "fd-small-icon")}规则测试</button>
              <button type="button" data-route="discover-cache-confirm">${icon("trash", "fd-small-icon")}清除缓存</button>
            </div>
          </section>
        ` : `${entryChipsHtml}${filterBarHtml}`}
        <section class="fd-discover-result-header">
          <h2>${esc(ctx.activeEntry)}</h2>
          <span class="fd-discover-result-meta">${esc(combinationFeedback)}</span>
        </section>
        ${bookRowsHtml}
        ${ctx.sortOpen ? `
          <section class="fd-discover-sort-popover" data-discover-sort aria-label="排序方式">
            <h2>排序方式</h2>
            ${["人气", "更新", "收藏", "完本", "字数"].map(function (item) {
              return `<button class="${item === ctx.sort ? "is-active" : ""}" type="button" data-discover-sort-option="${esc(item)}"${item === ctx.sort ? ' aria-current="true"' : ""}>${esc(item)}</button>`;
            }).join("")}
          </section>
        ` : ""}`,
      stateHostHtml: `<p class="fd-nav-feedback">发现 · ${esc(combinationFeedback)}${expanded ? " · 控制层展开" : ""}</p>`
    }));
  }

  // ============ 发现无结果 V2：无结果与重试 ============

  /**
   * discoverNoResultsV2 - 发现无结果状态增强
   * 覆盖路由：discover-no-results
   * 与原实现相比：显示当前组合条件、提供重置/切换入口/刷新三种重试路径
   */
  function discoverNoResultsV2(data, route, appState) {
    var ctx = discoverContextV2("discover-no-results", appState);
    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone fd-discover-phone"), {
      data: data,
      title: "发现",
      activeType: "discover",
      actions: ["refresh"],
      ariaLabel: "发现无结果",
      contentClass: "fd-phone-content fd-discover-content",
      contentHtml: `
        ${discoverSourceBarHtml(ctx, false, route)}
        ${discoverEntryChipsHtml(ctx)}
        ${discoverFilterBarHtml(ctx)}
        <section class="fd-discover-no-results" aria-label="发现无结果">
          ${icon("search", "fd-empty-icon")}
          <h2>当前条件没有发现结果</h2>
          <p>当前组合：入口 ${esc(ctx.activeEntry)} · 筛选 ${esc(ctx.activeFilter)} · 排序 ${esc(ctx.sort)}。可以重置筛选、切换入口或刷新当前书源。</p>
          <div class="fd-discover-no-results-actions">
            <button class="is-primary" type="button" data-route="discover" data-discover-reset>${icon("refresh", "fd-small-icon")}重置筛选</button>
            <button type="button" data-route="discover-control">${icon("source-switch", "fd-small-icon")}切换入口</button>
            <button type="button" data-route="discover-refreshing">${icon("refresh", "fd-small-icon")}刷新书源</button>
            <button type="button" data-route="book-search">${icon("search", "fd-small-icon")}改为搜索</button>
          </div>
          <p class="fd-discover-no-results-hint">提示：部分书源入口需要登录后才能返回结果，可前往书源登录页检查。</p>
        </section>`,
      stateHostHtml: `<p class="fd-nav-feedback">无结果 · ${esc(ctx.activeEntry)}/${esc(ctx.activeFilter)}/${esc(ctx.sort)}</p>`
    }));
  }

  // ============ 发现加载中 V2 ============

  /**
   * discoverLoadingV2 - 发现首次加载状态
   * 覆盖路由：discover-loading
   */
  function discoverLoadingV2(data, route, appState) {
    var ctx = discoverContextV2(route, appState);
    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone fd-discover-phone"), {
      data: data,
      title: "发现",
      activeType: "discover",
      actions: ["refresh"],
      ariaLabel: "发现加载中",
      contentClass: "fd-phone-content fd-discover-content",
      contentHtml: `
        ${discoverSourceBarHtml(ctx, false, route)}
        ${discoverEntryChipsHtml(ctx)}
        ${discoverFilterBarHtml(ctx)}
        <section class="fd-discover-result-header">
          <h2>${esc(ctx.activeEntry)}</h2>
          <span class="fd-discover-result-meta">正在加载…</span>
        </section>
        ${discoverSkeletonListHtml()}`,
      stateHostHtml: `<p class="fd-nav-feedback">发现加载中 · ${esc(ctx.activeEntry)}</p>`
    }));
  }

  // ============ 发现刷新中 V2 ============

  /**
   * discoverRefreshingV2 - 发现刷新中状态
   * 覆盖路由：discover-refreshing
   */
  function discoverRefreshingV2(data, route, appState) {
    var ctx = discoverContextV2(route, appState);
    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone fd-discover-phone"), {
      data: data,
      title: "发现",
      activeType: "discover",
      actions: ["refresh"],
      ariaLabel: "发现刷新中",
      contentClass: "fd-phone-content fd-discover-content",
      contentHtml: `
        ${discoverSourceBarHtml(ctx, false, route)}
        ${discoverEntryChipsHtml(ctx)}
        ${discoverFilterBarHtml(ctx)}
        <section class="fd-discover-refresh-line" aria-label="刷新中">
          <i></i>
          <span>正在刷新当前列表 · ${esc(ctx.activeEntry)} · ${esc(ctx.source.name)}</span>
        </section>
        ${discoverBookRowsHtml(data, route, true)}`,
      stateHostHtml: `<p class="fd-nav-feedback">刷新中 · ${esc(ctx.activeEntry)} · 保留上一批结果</p>`
    }));
  }

  // ============ 发现无限加载 V2 ============

  /**
   * discoverInfiniteV2 - 发现无限加载与第二屏交互
   * 覆盖路由：discover-infinite-loading / discover-page-two
   * 与原实现相比：显示已加载页数、底部加载指示器、回到顶部、错误重试
   */
  function discoverInfiniteV2(data, route, appState) {
    var ctx = discoverContextV2(route, appState);
    var isInfinite = route === "discover-infinite-loading";
    var pageTwo = route === "discover-page-two";
    var extraBooks = isInfinite || pageTwo
      ? [[["旧日回响", "离线书库", "奇幻 · 连载", "最新：第 18 章", "旧日钟声从废墟里传回，缓存章节仍可打开。", "longNight", false]]]
      : [];
    var baseBooks = discoverBooksV2(route);
    var allBooks = baseBooks.concat(extraBooks[0] || []);
    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone fd-discover-phone"), {
      data: data,
      title: "发现",
      activeType: "discover",
      actions: ["refresh"],
      ariaLabel: "发现继续加载",
      contentClass: "fd-phone-content fd-discover-content",
      contentHtml: `
        ${discoverSourceBarHtml(ctx, false, route)}
        ${discoverEntryChipsHtml(ctx)}
        ${discoverFilterBarHtml(ctx)}
        <section class="fd-discover-result-header">
          <h2>${esc(ctx.activeEntry)}</h2>
          <span class="fd-discover-result-meta">已加载 ${allBooks.length} 本 · ${pageTwo ? "第 2 屏" : "继续加载中"}</span>
        </section>
        <section class="fd-discover-book-list" aria-label="发现结果列表">
          ${allBooks.map(function (row) {
            var title = row[0], author = row[1], kind = row[2], latest = row[3], intro = row[4], coverKey = row[5], inShelf = row[6];
            return `<article class="fd-discover-book-row" role="button" tabindex="0" data-route="book-detail">
              <img src="${cover(data, coverKey)}" alt="${esc(title)}封面">
              <div class="fd-discover-book-info">
                <strong>${esc(title)}</strong>
                <small>${esc(author)} · ${esc(kind)}</small>
                <em>${esc(latest)}</em>
                <p>${esc(intro)}</p>
              </div>
              <div class="fd-discover-book-actions">
                ${inShelf
                  ? `<em class="fd-book-source-tag is-cached">已在书架</em>`
                  : `<button type="button" data-discover-add-to-bookshelf data-book-title="${esc(title)}">${icon("plus", "fd-small-icon")}加入书架</button>`}
                <button type="button" data-route="source-switch" aria-label="换源">${icon("source-switch", "fd-small-icon")}</button>
              </div>
            </article>`;
          }).join("")}
        </section>
        ${isInfinite ? `
          <section class="fd-discover-bottom-loading" aria-label="继续加载中">
            <i></i>
            <span>正在加载第 3 屏…</span>
            <button type="button" data-discover-cancel-load>取消</button>
          </section>
        ` : ""}
        ${pageTwo ? `<button class="fd-discover-back-top" type="button" data-route="discover">${icon("top", "fd-small-icon")}回到顶部</button>` : ""}`,
      stateHostHtml: `<p class="fd-nav-feedback">无限加载 · 已 ${allBooks.length} 本${isInfinite ? " · 加载中" : ""}</p>`
    }));
  }

  // ============ 发现缓存 V2：新鲜/陈旧/清理状态 ============

  /**
   * discoverCacheV2 - 发现缓存状态变体
   * 覆盖路由：discover-cache-empty / discover-cache-stale / discover-cache-fresh /
   *           discover-cache-confirm / discover-cache-toast
   */
  function discoverCacheV2(data, route, appState) {
    var ctx = discoverContextV2(route, appState);
    var toastHtml = "";
    var bannerHtml = "";
    var contentHtml = "";

    if (route === "discover-cache-empty") {
      contentHtml = `
        <section class="fd-discover-empty-state">
          ${icon("storage", "fd-empty-icon")}
          <h2>暂无发现缓存</h2>
          <p>当前书源还没有本地发现缓存。首次刷新成功后，会保留入口、筛选条件和结果列表供离线回看。</p>
          <div>
            <button type="button" data-route="discover-refreshing">${icon("refresh", "fd-small-icon")}立即刷新</button>
            <button type="button" data-route="discover-control">${icon("source-switch", "fd-small-icon")}切换书源</button>
          </div>
        </section>`;
    } else if (route === "discover-cache-stale") {
      bannerHtml = `<section class="fd-discover-toast is-warn" aria-label="缓存陈旧">${icon("warning", "fd-small-icon")}正在使用 2 小时前缓存，刷新后会替换当前列表</section>`;
      contentHtml = `
        ${discoverEntryChipsHtml(ctx)}
        ${discoverFilterBarHtml(ctx)}
        <section class="fd-discover-result-header">
          <h2>${esc(ctx.activeEntry)}</h2>
          <span class="fd-discover-result-meta">缓存 · 2 小时前</span>
        </section>
        ${discoverBookRowsHtml(data, "discover", true)}
        <div class="fd-discover-cache-actions">
          <button class="is-primary" type="button" data-route="discover-refreshing">${icon("refresh", "fd-small-icon")}刷新为最新</button>
          <button type="button" data-route="discover-cache-confirm">${icon("trash", "fd-small-icon")}清除缓存</button>
        </div>`;
    } else if (route === "discover-cache-fresh") {
      bannerHtml = `<section class="fd-discover-toast is-good" aria-label="缓存新鲜">${icon("check", "fd-small-icon")}当前发现缓存已是最新</section>`;
      contentHtml = `
        ${discoverEntryChipsHtml(ctx)}
        ${discoverFilterBarHtml(ctx)}
        <section class="fd-discover-result-header">
          <h2>${esc(ctx.activeEntry)}</h2>
          <span class="fd-discover-result-meta">缓存 · 刚刚更新</span>
        </section>
        ${discoverBookRowsHtml(data, "discover", false)}`;
    } else if (route === "discover-cache-confirm") {
      contentHtml = `
        <section class="fd-discover-confirm-dialog" role="dialog" aria-modal="true" aria-label="清除发现缓存">
          <h2>清除发现缓存？</h2>
          <p>将清除 ${esc(ctx.source.name)} 的发现缓存（入口、筛选、结果列表），不影响书架书籍和阅读记录。下次进入会重新加载。</p>
          <div class="fd-discover-confirm-actions">
            <button type="button" data-route="discover">${icon("chevron-left", "fd-small-icon")}取消</button>
            <button class="is-danger" type="button" data-route="discover-cache-toast">${icon("trash", "fd-small-icon")}确认清除</button>
          </div>
        </section>`;
    } else if (route === "discover-cache-toast") {
      toastHtml = `<section class="fd-discover-toast is-good" aria-label="缓存已清除">${icon("check", "fd-small-icon")}已清除 ${esc(ctx.source.name)} 发现缓存</section>`;
      contentHtml = `
        ${discoverEntryChipsHtml(ctx)}
        ${discoverFilterBarHtml(ctx)}
        <section class="fd-discover-result-header">
          <h2>${esc(ctx.activeEntry)}</h2>
          <span class="fd-discover-result-meta">缓存已清除 · 重新加载</span>
        </section>
        ${discoverSkeletonListHtml()}`;
    }

    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone fd-discover-phone"), {
      data: data,
      title: "发现",
      activeType: "discover",
      actions: ["refresh"],
      ariaLabel: "发现缓存状态",
      contentClass: "fd-phone-content fd-discover-content",
      contentHtml: `
        ${toastHtml}
        ${discoverSourceBarHtml(ctx, route === "discover-cache-confirm", route)}
        ${bannerHtml}
        ${contentHtml}`,
      stateHostHtml: `<p class="fd-nav-feedback">缓存状态：${esc(route.replace("discover-cache-", ""))}</p>`
    }));
  }

  // ============ 发现登录返回 V2：登录前后返回行为 ============

  /**
   * discoverLoginReturnV2 - 登录前后返回行为
   * 覆盖路由：discover-login-return
   * 与原实现相比：明确登录成功反馈、保留入口与筛选、自动刷新当前列表
   */
  function discoverLoginReturnV2(data, route, appState) {
    var ctx = discoverContextV2(route, appState);
    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone fd-discover-phone"), {
      data: data,
      title: "发现",
      activeType: "discover",
      actions: ["refresh"],
      ariaLabel: "发现登录返回",
      contentClass: "fd-phone-content fd-discover-content",
      contentHtml: `
        ${discoverSourceBarHtml(ctx, false, route)}
        ${discoverEntryChipsHtml(ctx)}
        ${discoverFilterBarHtml(ctx)}
        <section class="fd-discover-refresh-line" aria-label="登录后刷新">
          <i></i>
          <span>登录成功，正在刷新当前发现入口 · ${esc(ctx.activeEntry)} · ${esc(ctx.source.name)}</span>
        </section>
        ${discoverBookRowsHtml(data, route, true)}
        <p class="fd-discover-login-return-hint">登录信息已保存，返回发现页后入口与筛选保持不变，仅刷新内容列表。</p>`,
      stateHostHtml: `<p class="fd-nav-feedback">登录返回 · 自动刷新 ${esc(ctx.activeEntry)}</p>`
    }));
  }

  // ============ 发现换源 V2：换源入口与切换状态 ============

  /**
   * discoverSwitchingV2 - 发现切换书源状态
   * 覆盖路由：discover-switching-source / discover-switched-source
   */
  function discoverSwitchingV2(data, route, appState) {
    var ctx = discoverContextV2(route, appState);
    var isSwitching = route === "discover-switching-source";
    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone fd-discover-phone"), {
      data: data,
      title: "发现",
      activeType: "discover",
      actions: ["refresh"],
      ariaLabel: "发现切换书源",
      contentClass: "fd-phone-content fd-discover-content",
      contentHtml: `
        ${discoverSourceBarHtml(ctx, true, route)}
        <section class="fd-discover-control-panel" aria-label="发现控制层">
          <h2>${isSwitching ? "正在切换书源" : "已切换书源"}</h2>
          <article>
            ${icon("source-stack", "fd-small-icon")}
            <span><strong>优书网</strong><small>默认分组 · 已启用发现 · 120ms</small></span>
            ${isSwitching ? `<em class="fd-book-source-tag is-missing">切换中</em>` : `<button type="button" data-route="discover-switching-source">切回</button>`}
          </article>
          <article>
            ${icon("source-stack", "fd-small-icon")}
            <span><strong>起点导入</strong><small>正版 · ${isSwitching ? "正在解析入口" : "已启用发现 · 180ms"}</small></span>
            ${isSwitching ? `<em class="fd-book-source-tag is-missing">解析中</em>` : `<em class="fd-book-source-tag is-cached">当前</em>`}
          </article>
          <div class="fd-discover-control-actions">
            <button type="button" data-route="discover-source-bulk">${icon("settings", "fd-small-icon")}批量管理</button>
            <button type="button" data-route="discover-rule-test">${icon("code", "fd-small-icon")}规则测试</button>
          </div>
        </section>
        ${isSwitching ? `
          <section class="fd-discover-refresh-line" aria-label="切换中">
            <i></i>
            <span>正在解析新书源的发现入口…</span>
          </section>
          ${discoverSkeletonListHtml()}
        ` : `
          ${discoverEntryChipsHtml(ctx)}
          ${discoverFilterBarHtml(ctx)}
          <section class="fd-discover-result-header">
            <h2>${esc(ctx.activeEntry)}</h2>
            <span class="fd-discover-result-meta">已切换到 ${esc(ctx.source.name)}</span>
          </section>
          ${discoverBookRowsHtml(data, route, false)}
        `}`,
      stateHostHtml: `<p class="fd-nav-feedback">${isSwitching ? "切换书源中" : "已切换到 " + ctx.source.name}</p>`
    }));
  }

  // ============ 发现错误 V2：解析错误状态 ============

  /**
   * discoverErrorV2 - 发现错误状态变体
   * 覆盖路由：discover-entry-error / discover-empty / discover-error
   * 状态变体：入口解析失败 / 无启用书源 / 书源请求失败
   */
  function discoverErrorV2(data, route, appState) {
    var ctx = discoverContextV2(route, appState);

    // 无启用书源的空状态
    if (route === "discover-empty") {
      return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone fd-discover-phone"), {
        data: data,
        title: "发现",
        activeType: "discover",
        actions: ["refresh"],
        ariaLabel: "发现空状态",
        contentClass: "fd-phone-content fd-discover-content",
        contentHtml: `
          <section class="fd-discover-empty-state">
            ${icon("source-stack", "fd-empty-icon")}
            <h2>当前没有启用发现的书源</h2>
            <p>启用发现后，可以在这里浏览书源提供的排行榜、分类和书单。</p>
            <div>
              <button class="is-primary" type="button" data-route="source-management">${icon("settings", "fd-small-icon")}去书源管理</button>
              <button type="button" data-route="source-import-options">${icon("plus", "fd-small-icon")}导入书源</button>
              <button type="button" data-route="discover-source-bulk">${icon("source-stack", "fd-small-icon")}批量启用</button>
            </div>
          </section>`,
        stateHostHtml: `<p class="fd-nav-feedback">发现空状态 · 无启用书源</p>`
      }));
    }

    // 入口解析失败
    if (route === "discover-entry-error") {
      return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone fd-discover-phone"), {
        data: data,
        title: "发现",
        activeType: "discover",
        actions: ["refresh"],
        ariaLabel: "发现入口解析失败",
        contentClass: "fd-phone-content fd-discover-content",
        contentHtml: `
          ${discoverSourceBarHtml(Object.assign({}, ctx, { source: { name: "优书网", meta: "排行榜 · 解析失败" } }), true, route)}
          <section class="fd-discover-control-panel" aria-label="发现控制层">
            <h2>入口解析失败</h2>
            <article>
              ${icon("warning", "fd-small-icon")}
              <span><strong>优书网</strong><small>排行榜入口 · exploreUrl 解析异常</small></span>
              <em class="fd-book-source-tag is-missing">失败</em>
            </article>
            <div class="fd-discover-control-actions">
              <button type="button" data-route="discover-refreshing">${icon("refresh", "fd-small-icon")}重试入口</button>
              <button type="button" data-route="discover-rule-test">${icon("code", "fd-small-icon")}编辑源</button>
              <button type="button" data-route="discover-switching-source">${icon("source-switch", "fd-small-icon")}切换书源</button>
            </div>
          </section>
          <section class="fd-discover-error-card">
            ${icon("warning", "fd-medium-icon")}
            <h2>发现入口解析失败</h2>
            <p>当前入口返回异常，已保留上一批缓存结果。你可以重试、刷新入口、编辑源或切换书源。</p>
            <div>
              <button type="button" data-route="discover-refreshing">重试</button>
              <button type="button" data-route="discover-control">切换书源</button>
              <button type="button" data-route="discover-rule-test">编辑源</button>
              <button type="button" data-route="source-debug">调试</button>
            </div>
          </section>
          ${discoverBookRowsHtml(data, "discover", true)}`,
        stateHostHtml: `<p class="fd-nav-feedback">入口解析失败 · 保留缓存结果</p>`
      }));
    }

    // 书源请求失败 / 通用错误
    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone fd-discover-phone"), {
      data: data,
      title: "发现",
      activeType: "discover",
      actions: ["refresh"],
      ariaLabel: "发现错误状态",
      contentClass: "fd-phone-content fd-discover-content",
      contentHtml: `
        ${discoverSourceBarHtml(Object.assign({}, ctx, { source: { name: "优书网", meta: "请求失败 · 网络异常" } }), false, route)}
        ${discoverEntryChipsHtml(ctx)}
        ${discoverFilterBarHtml(ctx)}
        <section class="fd-discover-error-card">
          ${icon("warning", "fd-medium-icon")}
          <h2>发现请求失败</h2>
          <p>当前书源请求失败，可能是网络异常或书源规则失效。可重试、切换书源或查看错误日志。</p>
          <div>
            <button class="is-primary" type="button" data-route="discover-refreshing">${icon("refresh", "fd-small-icon")}重试</button>
            <button type="button" data-route="discover-control">${icon("source-switch", "fd-small-icon")}切换书源</button>
            <button type="button" data-route="source-logs">${icon("code", "fd-small-icon")}错误日志</button>
          </div>
          <p class="fd-discover-error-meta">上次失败：10:32 · 状态码 504 · 已保留缓存结果</p>
        </section>
        ${discoverBookRowsHtml(data, "discover", true)}`,
      stateHostHtml: `<p class="fd-nav-feedback">发现错误 · 504 · 保留缓存</p>`
    }));
  }

  // ============ 发现书源登录 V2 ============

  /**
   * discoverSourceLoginV2 - 书源登录页增强
   * 覆盖路由：discover-source-login
   * 与原 discoverSourceLoginScreen 相比：明确登录前后返回行为、Cookie 保存范围、检测状态
   */
  function discoverSourceLoginV2(data, route, appState) {
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone fd-discover-subpage-phone"), {
      data: data,
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
            <article>
              <span><strong>登录状态</strong><small>未登录 · 最近检测 10:32</small></span>
              <em class="fd-book-source-tag is-missing">需登录</em>
            </article>
            <article>
              <span><strong>适用范围</strong><small>发现入口、详情页、目录页</small></span>
              <em class="fd-book-source-tag is-cached">当前源</em>
            </article>
            <article>
              <span><strong>Cookie 保存</strong><small>仅保存在本机书源配置中</small></span>
              <button type="button" data-source-login-cookie-toggle aria-pressed="true">已开启</button>
            </article>
            <article>
              <span><strong>登录有效期</strong><small>30 天 · 到期后自动提示重新登录</small></span>
              <em class="fd-book-source-tag is-cached">已配置</em>
            </article>
          </section>
          <section class="fd-discover-login-actions">
            <button class="is-primary" type="button" data-route="discover-login-return">${icon("globe", "fd-small-icon")}打开网页登录</button>
            <button type="button" data-route="discover-login-return">${icon("check", "fd-small-icon")}保存登录信息</button>
            <button type="button" data-route="discover-control">${icon("refresh", "fd-small-icon")}重新检测</button>
          </section>
          <p class="fd-discover-subpage-note">返回发现页后，当前书源和当前入口保持不变，只刷新内容列表。系统返回将回到发现首页。</p>
        </section>`,
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button" data-route="discover-control">${icon("source-stack", "fd-small-icon")}返回控制层</button>
          <button type="button" data-route="discover-login-return">${icon("refresh", "fd-small-icon")}完成刷新</button>
        </div>`
    }));
  }

  // ============ 发现规则测试 V2 ============

  /**
   * discoverRuleTestV2 - 发现规则测试增强
   * 覆盖路由：discover-rule-test
   */
  function discoverRuleTestV2(data, route, appState) {
    var fields = [
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
    return shellKit().renderSettingsShell(Object.assign(phoneShellClasses("fd-settings-phone fd-discover-subpage-phone"), {
      data: data,
      title: "发现规则测试",
      ariaLabel: "发现规则测试",
      topBarClass: "fd-back-bar",
      contentClass: "fd-phone-content fd-settings-content",
      contentHtml: `
        <section class="fd-discover-subpage fd-discover-rule-page">
          <article class="fd-discover-subpage-head has-badge">
            <span>${icon("code", "fd-medium-icon")}</span>
            <div>
              <h2>优书网</h2>
              <p>正在编辑：发现规则</p>
            </div>
            <em class="fd-book-source-tag is-cached">已启用发现</em>
          </article>
          <nav class="fd-source-module-tabs" aria-label="书源规则模块">
            ${["基本", "搜索", "详情", "目录", "正文", "发现", "高级"].map(function (item) {
              return `<button class="${item === "发现" ? "is-active" : ""}" type="button">${esc(item)}</button>`;
            }).join("")}
          </nav>
          <section class="fd-discover-rule-fields" aria-label="发现规则字段">
            ${fields.map(function (row) {
              var label = row[0], value = row[1];
              return `<label>
                <span>${esc(label)}</span>
                <strong>${esc(value)}</strong>
              </label>`;
            }).join("")}
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
            <article class="is-warn"><strong>警告：coverUrl 字段缺失</strong><small>2 本书未解析到封面，建议补充选择器</small></article>
          </section>
        </section>`,
      bottomActionHostClass: "fd-bottom-action-host",
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button" data-route="discover-control">${icon("play", "fd-small-icon")}测试入口</button>
          <button class="is-primary" type="button" data-route="discover-control">${icon("check", "fd-small-icon")}保存规则</button>
        </div>`
    }));
  }

  // ============ 发现源批量管理 V2 ============

  /**
   * discoverSourceBulkV2 - 发现源批量管理增强
   * 覆盖路由：discover-source-bulk
   */
  function discoverSourceBulkV2(data, route, appState) {
    var sources = [
      ["优书网", "默认分组 · 120ms · 已启用发现", "good", true],
      ["起点导入", "正版 · 180ms · 已启用发现", "good", true],
      ["轻小说文库", "需登录 · 发现可用", "warn", true],
      ["本地聚合源", "维护中 · 暂停发现", "muted", false],
      ["失效示例源", "解析失败 · exploreUrl 异常", "warn", false]
    ];
    return shellKit().renderSettingsShell(Object.assign(phoneShellClasses("fd-settings-phone fd-discover-subpage-phone"), {
      data: data,
      title: "发现源管理",
      ariaLabel: "发现源批量管理",
      topBarClass: "fd-back-bar",
      contentClass: "fd-phone-content fd-settings-content",
      contentHtml: `
        <section class="fd-discover-subpage fd-discover-source-bulk-page">
          <article class="fd-discover-subpage-head">
            <span>${icon("source-stack", "fd-medium-icon")}</span>
            <div>
              <h2>发现源管理</h2>
              <p>选择启用发现的书源，批量启用、禁用或刷新入口。</p>
            </div>
          </article>
          <section class="fd-discover-bulk-summary">
            <strong>已启用 ${sources.filter(function (s) { return s[3]; }).length} 个发现源</strong>
            <span>共 ${sources.length} 个书源 · ${sources.filter(function (s) { return s[3]; }).length} 个已启用</span>
          </section>
          <section class="fd-management-list is-discover-bulk">
            <h2>书源列表</h2>
            ${sources.map(function (row) {
              var name = row[0], meta = row[1], tone = row[2], enabled = row[3];
              return `<article class="is-${esc(tone)}">
                <button class="fd-book-select-toggle" type="button" aria-pressed="${enabled ? "true" : "false"}">${enabled ? icon("check", "fd-small-icon") : ""}</button>
                ${icon("source-stack", "fd-small-icon")}
                <span><strong>${esc(name)}</strong><small>${esc(meta)}</small></span>
                <em class="fd-book-source-tag is-${esc(tone)}">${enabled ? "已启用" : "已禁用"}</em>
              </article>`;
            }).join("")}
          </section>
        </section>`,
      bottomActionHostClass: "fd-bottom-action-host",
      bottomActionHtml: `
        <div class="fd-fixed-action-row">
          <button type="button" data-discover-bulk-enable>${icon("check", "fd-small-icon")}批量启用</button>
          <button type="button" data-discover-bulk-disable>${icon("offline", "fd-small-icon")}批量禁用</button>
          <button type="button" data-route="discover-refreshing">${icon("refresh", "fd-small-icon")}刷新入口</button>
        </div>`
    }));
  }

  // ============ 集成映射 ============

  // INTEGRATION_MAP：替换 contractStatic / 新增 schema-only renderer
  // 这些路由原本走 contractStaticRouteScreen 或没有专用 renderer，现在由本模块提供完整实现
  var INTEGRATION_MAP = {
    "bookshelf-book-more-menu": "bookshelfBookMoreMenuScreen"
  };

  // STATE_VARIANT_MAP：已审计路由的状态变体增强
  // 这些路由已有 renderer，本模块提供产品化缺口补全的状态变体
  var STATE_VARIANT_MAP = {
    // —— 书架 17 路由 ——
    "bookshelf": "bookshelfV2",
    "bookshelf-cover-mode": "bookshelfV2",
    "bookshelf-list-mode": "bookshelfV2",
    "bookshelf-empty": "bookshelfEmptyV2",
    "book-batch-management": "bookBatchManagementV2",
    "group-management": "groupManagementV2",
    "bookshelf-group-management": "groupManagementV2",
    "sort-filter": "sortFilterV2",
    "book-detail": "bookDetailV2",
    "book-detail-toc-preview": "bookDetailV2",
    "book-directory": "bookDirectoryV2",
    "book-search": "bookSearchV2",
    "search-home": "bookSearchV2",
    "search-results": "bookSearchV2",
    "local-import": "localImportV2",
    "bookshelf-search-settings": "bookshelfSearchSettingsV2"
  };

  // ============ 暴露到 window ============

  window.ReaderD2BookshelfDiscoverRenderers = {
    // 集成映射
    INTEGRATION_MAP: INTEGRATION_MAP,
    STATE_VARIANT_MAP: STATE_VARIANT_MAP,
    // —— 书架 renderer ——
    bookshelfV2: bookshelfV2,
    bookshelfEmptyV2: bookshelfEmptyV2,
    bookshelfBookMoreMenuScreen: bookshelfBookMoreMenuScreen,
    bookBatchManagementV2: bookBatchManagementV2,
    groupManagementV2: groupManagementV2,
    sortFilterV2: sortFilterV2,
    bookDetailV2: bookDetailV2,
    bookDirectoryV2: bookDirectoryV2,
    bookSearchV2: bookSearchV2,
    localImportV2: localImportV2,
    bookshelfSearchSettingsV2: bookshelfSearchSettingsV2,
    // —— 发现 renderer ——
    discoverV2: discoverV2,
    discoverNoResultsV2: discoverNoResultsV2,
    discoverLoadingV2: discoverLoadingV2,
    discoverRefreshingV2: discoverRefreshingV2,
    discoverInfiniteV2: discoverInfiniteV2,
    discoverCacheV2: discoverCacheV2,
    discoverLoginReturnV2: discoverLoginReturnV2,
    discoverSwitchingV2: discoverSwitchingV2,
    discoverErrorV2: discoverErrorV2,
    discoverSourceLoginV2: discoverSourceLoginV2,
    discoverRuleTestV2: discoverRuleTestV2,
    discoverSourceBulkV2: discoverSourceBulkV2
  };
})(window);
