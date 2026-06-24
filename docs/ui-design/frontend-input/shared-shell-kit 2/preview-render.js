(function attachReaderSharedShellKitPreview(window) {
  function render(target, data) {
    const kit = window.ReaderShellKit;
    const content = `
      <section class="rskp-card">
        <h2>ContentRegion</h2>
        <p>页面业务内容通过 slot 注入，shell 只保留稳定骨架。</p>
      </section>`;

    const mainTab = kit.renderMainTabShell({
      data,
      title: "书架",
      activeType: "bookshelf",
      actions: ["search", "more"],
      frameClass: "rskp-phone",
      statusBarClass: "rskp-status-bar",
      systemIconsClass: "rskp-system-icons",
      signalClass: "rskp-signal",
      wifiClass: "rskp-wifi",
      batteryClass: "rskp-battery",
      topBarClass: "rskp-top-bar",
      topActionsClass: "rskp-top-actions",
      iconButtonClass: "rskp-icon-button",
      iconClass: "rskp-icon",
      contentClass: "rskp-content",
      navClass: "rskp-main-nav",
      navItemClass: "rskp-nav-item",
      navIconClass: "rskp-nav-icon",
      contentHtml: content
    });

    const library = kit.renderLibraryShell({
      data,
      title: "书籍详情",
      frameClass: "rskp-phone",
      statusBarClass: "rskp-status-bar",
      systemIconsClass: "rskp-system-icons",
      signalClass: "rskp-signal",
      wifiClass: "rskp-wifi",
      batteryClass: "rskp-battery",
      topBarClass: "rskp-back-bar",
      iconClass: "rskp-icon",
      contentClass: "rskp-content",
      contentHtml: content
    });

    const reader = kit.renderReaderShell({
      frameClass: "rskp-reader",
      readingSurfaceClass: "rskp-reading-surface",
      overlayClass: "rskp-reader-overlay",
      bottomSheetHostClass: "rskp-reader-sheet",
      moduleNavClass: "rskp-reader-nav",
      readingSurfaceHtml: "<p>雨夜的风格外冷，玻璃窗被吹得轻轻发响。</p>",
      overlayHtml: '<section class="rskp-reader-top">阅读控制层</section>',
      bottomSheetHtml: "<strong>BottomSheetHost</strong>",
      moduleNavHtml: data.rows.slice(0, 4).map((item) => `<button type="button">${item}</button>`).join("")
    });

    const settings = kit.renderSettingsShell({
      data,
      title: "App 通用设置",
      frameClass: "rskp-phone",
      statusBarClass: "rskp-status-bar",
      systemIconsClass: "rskp-system-icons",
      signalClass: "rskp-signal",
      wifiClass: "rskp-wifi",
      batteryClass: "rskp-battery",
      topBarClass: "rskp-back-bar",
      iconClass: "rskp-icon",
      contentClass: "rskp-content",
      contentHtml: content
    });

    const flow = kit.renderFlowShell({
      frameClass: "rskp-flow",
      stepClass: "rskp-flow-card",
      comparisonClass: "rskp-flow-card",
      resultClass: "rskp-flow-card",
      stepHtml: "<h2>StepRegion</h2>",
      comparisonHtml: "<h2>ComparisonRegion</h2>",
      resultHtml: "<h2>ResultRegion</h2>"
    });

    target.innerHTML = `
      <main class="rskp-preview" data-shell="ComponentLibraryShell" aria-label="共享 Shell Kit 预览">
        <header class="rskp-header" data-slot="foundations">
          <h1>共享 Shell Kit（Shared Shell Kit）</h1>
          <p>统一输出五类页面框架、固定 data-shell 与 data-slot，供 30 页前端输入件迁移。</p>
        </header>
        <section class="rskp-grid" data-slot="appShell">
          <article><h2>MainTabShell</h2>${mainTab}</article>
          <article><h2>LibraryShell</h2>${library}</article>
          <article><h2>ReaderShell</h2>${reader}</article>
          <article><h2>SettingsShell</h2>${settings}</article>
          <article class="rskp-wide"><h2>FlowShell</h2>${flow}</article>
        </section>
        <section class="rskp-rules" data-slot="basicControls">
          <h2>Slot 准入（Slot Acceptance）</h2>
          <p>MainTabShell、LibraryShell、ReaderShell、SettingsShell、FlowShell 必须输出固定 data-slot。</p>
        </section>
        <section class="rskp-rules" data-slot="cardsRows">
          <h2>组件边界（Component Boundaries）</h2>
          <p>shell 只管骨架，业务卡片、列表、正文和设置行由页面 renderer 注入。</p>
        </section>
        <section class="rskp-rules" data-slot="sheetsPanels">
          <h2>弹层宿主（Overlay Hosts）</h2>
          <p>底表、弹窗、Toast 和状态区必须保留宿主节点，不能在状态切换时替换整屏。</p>
        </section>
        <section class="rskp-rules" data-slot="states">
          <h2>状态稳定（State Stability）</h2>
          <p>selected、pressed、loading、empty、error 只改内容或状态，不改变 shell 结构。</p>
        </section>
      </main>`;
  }

  window.ReaderSharedShellKitPreview = {
    render
  };
})(window);
