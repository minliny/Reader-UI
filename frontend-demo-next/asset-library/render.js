(function attachReaderAssetLibrary(window) {
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function statCard(label, value, note) {
    return `
      <article class="asset-stat-card">
        <strong>${esc(value)}</strong>
        <span>${esc(label)}</span>
        <small>${esc(note)}</small>
      </article>`;
  }

  function screenCard(item) {
    return `
      <article class="asset-screen-card">
        <img src="${esc(item.path)}" alt="${esc(item.name)}">
        <div>
          <strong>${esc(item.name)}</strong>
          <small>${esc(item.shell)}</small>
        </div>
      </article>`;
  }

  function screenGroup(group) {
    return `
      <section class="asset-section">
        <header class="asset-section-head">
          <h2>${esc(group.title)}</h2>
          <span>${esc((group.items || []).length)} screens</span>
        </header>
        <div class="asset-screen-grid">
          ${(group.items || []).map(screenCard).join("")}
        </div>
      </section>`;
  }

  function coverCard(item) {
    return `
      <article class="asset-cover-card">
        <img src="${esc(item.path)}" alt="${esc(item.name)}">
        <strong>${esc(item.name)}</strong>
      </article>`;
  }

  function iconCard(name, supplemented) {
    const iconRegistry = window.ReaderAssetIcons || {};
    return `
      <article class="asset-icon-card${supplemented ? " is-supplemented" : ""}" data-icon-name="${esc(name)}">
        <span class="asset-icon-box">${iconRegistry.renderIcon ? iconRegistry.renderIcon(name, "asset-icon-svg") : ""}</span>
        <strong>${esc(name)}</strong>
        <small>${supplemented ? "补齐图标（Supplemented）" : "已引用图标（Referenced）"}</small>
      </article>`;
  }

  function iconGroup(group, supplementedSet) {
    return `
      <section class="asset-section">
        <header class="asset-section-head">
          <h2>${esc(group.title)}</h2>
          <span>${esc((group.items || []).length)} icons</span>
        </header>
        <div class="asset-icon-grid">
          ${(group.items || []).map((name) => iconCard(name, supplementedSet.has(name))).join("")}
        </div>
      </section>`;
  }

  function missingIcons(data) {
    const iconRegistry = window.ReaderAssetIcons || {};
    const tokens = new Set();
    for (const group of data.iconGroups || []) {
      for (const item of group.items || []) tokens.add(item);
    }
    return Array.from(tokens).filter((name) => !iconRegistry.has || !iconRegistry.has(name));
  }

  function render(data) {
    const iconRegistry = window.ReaderAssetIcons || {};
    const supplementedSet = new Set(data.supplementedIcons || []);
    const missing = missingIcons(data);
    const iconCount = (data.iconGroups || []).reduce((count, group) => count + (group.items || []).length, 0);
    const meta = data.meta || {};

    return `
      <main class="asset-library" data-shell="AssetLibraryShell" aria-label="${esc(meta.title)}">
        <header class="asset-hero" data-slot="foundations">
          <p>素材库（Asset Library）</p>
          <h1>${esc(meta.title)}</h1>
          <span>${esc(meta.summary)}</span>
          <div class="asset-stat-grid">
            ${statCard("UI 设计图（UI Design Screens）", `${meta.screenCount} 个 UI 设计图`, "源图素材，按页面框架分组")}
            ${statCard("书籍封面素材（Book Cover Assets）", `${meta.bookCoverCount} 个封面`, "书架、详情和搜索可复用")}
            ${statCard("图标素材（Icon Assets）", `${iconCount} 个图标 token`, `${meta.fixtureIconTokenCount} 个来自 fixture，${(data.supplementedIcons || []).length} 个补齐图标`)}
            ${statCard("验证截图（Validation Screenshots）", `${meta.validationScreenshotCount} 张`, "作为验收证据登记")}
          </div>
        </header>

        <section class="asset-panel" data-slot="screenAssets">
          <header class="asset-panel-head">
            <h2>UI 设计图（UI Design Screens）</h2>
            <p>当前所有 29 张源 UI 设计图已纳入素材库。</p>
          </header>
          ${(data.screenGroups || []).map(screenGroup).join("")}
        </section>

        <section class="asset-panel" data-slot="bookCoverAssets">
          <header class="asset-panel-head">
            <h2>书籍封面素材（Book Cover Assets）</h2>
            <p>当前书架封面资源集中登记，供 BookCover、BookCard、BookRow 和搜索结果复用。</p>
          </header>
          <div class="asset-cover-grid">
            ${(data.bookCovers || []).map(coverCard).join("")}
          </div>
        </section>

        <section class="asset-panel" data-slot="iconAssets">
          <header class="asset-panel-head">
            <h2>图标素材（Icon Assets）</h2>
            <p>当前页面 fixture 引用的图标和 Shell 常用图标统一收口到 <code>icons.js</code>。</p>
          </header>
          ${(data.iconGroups || []).map((group) => iconGroup(group, supplementedSet)).join("")}
        </section>

        <section class="asset-panel" data-slot="missingSupplements">
          <header class="asset-panel-head">
            <h2>补齐图标（Supplemented Icons）</h2>
            <p>以下图标补齐为统一 token，后续页面不得再用临时 inline SVG 替代。</p>
          </header>
          <div class="asset-token-row">
            ${(data.supplementedIcons || []).map((name) => `<span>${esc(name)}</span>`).join("")}
          </div>
          <div class="asset-status ${missing.length ? "is-error" : "is-ok"}">
            ${iconRegistry.renderIcon ? iconRegistry.renderIcon(missing.length ? "warning" : "check", "asset-status-icon") : ""}
            <strong>${missing.length ? "存在未登记图标" : "图标注册完整"}</strong>
            <span>${missing.length ? esc(missing.join(", ")) : "所有图标 token 都能在 ReaderAssetIcons 中找到。"}</span>
          </div>
        </section>

        <section class="asset-panel" data-slot="usageRules">
          <header class="asset-panel-head">
            <h2>使用规则（Usage Rules）</h2>
            <p>素材库是后续 UI 设计图转换为前端设计稿的入口约束。</p>
          </header>
          <div class="asset-rule-list">
            ${(data.usageRules || []).map((rule) => `<article>${iconRegistry.renderIcon ? iconRegistry.renderIcon("check", "asset-rule-icon") : ""}<span>${esc(rule)}</span></article>`).join("")}
          </div>
        </section>
      </main>`;
  }

  window.ReaderAssetLibrary = {
    render,
    renderInto(target, data) {
      target.innerHTML = render(data);
    }
  };
})(window);
