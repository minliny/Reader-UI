// B2 · Library & Search 域 — control identity adapter for Library shell
// 消费 A2 · Control Identity Foundation (commit c7c2730) 产出的 controlId registry。
// 仅覆盖 B2 域的 4 个页面族：bookshelf / book-detail / import-conflict-resolve / search-results。
//
// 本文件提供两件事：
//  1. LIBRARY_CONTROL_IDS — Library 域的稳定 control ID 查找表（按 route / role / 判别符）。
//  2. libraryShell() — shellKit().renderLibraryShell() 的薄包装，提供 data-control-id 注入辅助函数。
//
// 与 render-runtime.js 解耦：render-runtime.js 通过 window.ReaderLibraryShell.controlId() 查表，
// 不直接引用 A2 registry（registry 在 tools/interaction-inventory/generated/ 下，由 A2 维护）。

(function attachReaderLibraryShell(window) {
  const LIBRARY_CONTROL_IDS = Object.freeze({
    // ---- bookshelf (MainTabShell, but bookshelf chrome 控件由本域负责) ----
    "bookshelf.default.phone.button.top-action-search": "library.button.bookshelf.default.phone.button.top-action-search-h-1c0d0896",
    "bookshelf.default.phone.button.top-action-more": "library.button.bookshelf.default.phone.button.top-action-more-h-5fd7b61f",
    "bookshelf.default.phone.button.view-cover": "library.button.bookshelf.default.phone.button.h-9853c162",
    "bookshelf.default.phone.button.view-list": "library.button.bookshelf.default.phone.button.h-101bc6a1",
    "bookshelf.default.phone.button.filter-toggle": "library.button.bookshelf.default.phone.button.h-5e688a2b",
    "bookshelf.default.phone.button.search-toggle": "library.button.bookshelf.default.phone.button.h-170ddc6b",
    "bookshelf.default.phone.button.shelf-settings": "library.button.bookshelf.default.phone.button.route-bookshelf-search-settings-h-3170b979",
    "bookshelf.default.phone.button.quick-batch": "library.button.bookshelf.default.phone.button.route-book-batch-management-h-326fea32",
    "bookshelf.default.phone.button.quick-group": "library.button.bookshelf.default.phone.button.route-group-management-h-2e1ee42f",
    "bookshelf.default.phone.button.quick-sort-filter": "library.button.bookshelf.default.phone.button.route-local-import-h-6d77f0cb",
    "bookshelf.default.phone.button.shelf-settings-alt": "library.button.bookshelf.default.phone.button.route-bookshelf-search-settings-h-7489fcdc",
    "bookshelf.default.phone.button.more-close": "library.button.bookshelf.default.phone.button.h-ec1177a8",
    "bookshelf.default.phone.button.nav-bookshelf": "library.button.bookshelf.default.phone.button.nav-type-bookshelf-h-65129732",
    "bookshelf.default.phone.button.nav-discover": "library.button.bookshelf.default.phone.button.nav-type-discover-h-0b616465",
    "bookshelf.default.phone.button.nav-rss": "library.button.bookshelf.default.phone.button.nav-type-rss-h-26836052",
    "bookshelf.default.phone.button.nav-settings": "library.button.bookshelf.default.phone.button.nav-type-settings-h-7985f763",

    // ---- book-detail.default ----
    "book-detail.default.phone.button.back": "library.button.book-detail.default.phone.button.h-26b6dc06",
    "book-detail.default.phone.button.open-source-sheet": "library.button.book-detail.default.phone.button.open-sheet-h-89d3856b",
    "book-detail.default.phone.button.full-directory": "library.button.book-detail.default.phone.button.route-book-directory-h-61303ebc",
    "book-detail.default.phone.button.continue-reading": "library.button.book-detail.default.phone.button.route-immersive-reading-h-6e3349ba",
    "book-detail.default.phone.button.open-remove-dialog": "library.button.book-detail.default.phone.button.open-dialog-h-01b8801a",
    "book-detail.default.phone.button.link-youshu": "library.button.book-detail.default.phone.button.h-23bde952",
    "book-detail.default.phone.button.link-shucang": "library.button.book-detail.default.phone.button.h-fa2cbba6",
    "book-detail.default.phone.button.local-cache": "library.button.book-detail.default.phone.button.h-2070f028",
    "book-detail.default.phone.button.close-source-sheet": "library.button.book-detail.default.phone.button.close-sheet-h-68d3e051",
    "book-detail.default.phone.button.dialog-cancel": "library.button.book-detail.default.phone.button.close-dialog-h-20037587",
    "book-detail.default.phone.button.dialog-confirm-remove": "library.button.book-detail.default.phone.button.close-dialog-h-a5584917",

    // ---- book-detail.loading（视觉等同 default，仅 state atom 改变）----
    "book-detail.loading.phone.button.back": "library.button.book-detail.loading.phone.button.h-8e013e5e",
    "book-detail.loading.phone.button.open-source-sheet": "library.button.book-detail.loading.phone.button.open-sheet-h-dbced97d",
    "book-detail.loading.phone.button.full-directory": "library.button.book-detail.loading.phone.button.route-book-directory-h-43a5142f",
    "book-detail.loading.phone.button.continue-reading": "library.button.book-detail.loading.phone.button.route-immersive-reading-h-b8e9c1ea",
    "book-detail.loading.phone.button.open-remove-dialog": "library.button.book-detail.loading.phone.button.open-dialog-h-ee4a1410",
    "book-detail.loading.phone.button.link-youshu": "library.button.book-detail.loading.phone.button.h-a00a075e",
    "book-detail.loading.phone.button.link-shucang": "library.button.book-detail.loading.phone.button.h-2ba23a0d",
    "book-detail.loading.phone.button.local-cache": "library.button.book-detail.loading.phone.button.h-7f1a5c43",
    "book-detail.loading.phone.button.close-source-sheet": "library.button.book-detail.loading.phone.button.close-sheet-h-9c70cbb6",
    "book-detail.loading.phone.button.dialog-cancel": "library.button.book-detail.loading.phone.button.close-dialog-h-52739496",
    "book-detail.loading.phone.button.dialog-confirm-remove": "library.button.book-detail.loading.phone.button.close-dialog-h-bab81d89",

    // ---- search-results.default ----
    "search-results.default.phone.button.back": "library.button.search-results.default.phone.button.h-39928eb3",
    "search-results.default.phone.searchbox.input": "library.searchbox.search-results.default.phone.searchbox.open-keyboard-h-1a89a922",
    "search-results.default.phone.button.search-submit": "library.button.search-results.default.phone.button.search-submit-h-566dbcbf",
    "search-results.default.phone.button.add-shelf": "library.button.search-results.default.phone.button.h-4c594032",
    "search-results.default.phone.textbox.input": "library.textbox.search-results.default.phone.textbox.h-a6b91afe",
    "search-results.default.phone.button.close-keyboard": "library.button.search-results.default.phone.button.close-keyboard-h-5c83efee",
    "search-results.default.phone.button.search-reset": "library.button.search-results.default.phone.button.search-reset-h-a329a491",
    "search-results.default.phone.button.view-detail": "library.button.search-results.default.phone.button.route-book-detail-h-02559ee3",

    // ---- import-conflict-resolve.default ----
    "import-conflict-resolve.default.phone.button.back": "import.button.import-conflict-resolve.default.phone.button.h-f9ecca4e",
    "import-conflict-resolve.default.phone.button.keep-local": "import.button.import-conflict-resolve.default.phone.button.action-conflict-keep-local-h-216ce734",
    "import-conflict-resolve.default.phone.button.overwrite": "import.button.import-conflict-resolve.default.phone.button.action-conflict-overwrite-h-36ec8719",
    "import-conflict-resolve.default.phone.button.keep-both": "import.button.import-conflict-resolve.default.phone.button.action-conflict-keep-both-h-61694be3",
    "import-conflict-resolve.default.phone.button.rollback": "import.button.import-conflict-resolve.default.phone.button.action-import-rollback-h-1f9b141d"
  });

  /**
   * 查找 Library 域的 canonical controlId。
   * @param {string} routeId - 例 "bookshelf" / "book-detail" / "search-results" / "import-conflict-resolve"
   * @param {string} state - 例 "default" / "loading"
   * @param {string} viewport - "phone"（A2 inventory 当前仅 phone；compact/tablet 待 A1 扩展）
   * @param {string} role - 例 "button" / "searchbox" / "textbox"
   * @param {string} discriminator - 稳定判别符，如 "top-action-search" / "view-cover"
   * @returns {string|null} canonical controlId 字符串
   */
  function controlId(routeId, state, viewport, role, discriminator) {
    const key = `${routeId}.${state}.${viewport}.${role}.${discriminator}`;
    return LIBRARY_CONTROL_IDS[key] || null;
  }

  /**
   * 把 controlId 拼成 HTML 属性字符串：`data-control-id="<id>"`。
   * 当 controlId 为 null/空时返回空字符串，方便内联到模板字符串里。
   */
  function controlIdAttr(routeId, state, viewport, role, discriminator) {
    const id = controlId(routeId, state, viewport, role, discriminator);
    return id ? ` data-control-id="${id}"` : "";
  }

  /**
   * 把 canonical UiEvent 拼成 HTML 属性字符串：`data-ui-event="<event>"`。
   * 用于 B2 修复 ambiguous-needs-review 候选：把 IC0 没解析出来的 UiEvent 显式落回 DOM。
   */
  function uiEventAttr(uiEvent) {
    return uiEvent ? ` data-ui-event="${uiEvent}"` : "";
  }

  /**
   * 渲染 stable final state 标记：用于 cover-list 切换 / Sheet / Dialog 状态机。
   * 例：`data-final-state="cover"` / `data-sheet-state="closed"` / `data-dialog-state="closed"`
   */
  function stateAttr(name, value) {
    if (value === null || value === undefined || value === "") return "";
    return ` data-${name}="${value}"`;
  }

  window.ReaderLibraryShell = Object.freeze({
    LIBRARY_CONTROL_IDS,
    controlId,
    controlIdAttr,
    uiEventAttr,
    stateAttr
  });
})(window);
