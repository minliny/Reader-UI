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

  function iconCard(name, variant, iconRegistry) {
    const upstream = iconRegistry.mapping && iconRegistry.mapping[name] ? iconRegistry.mapping[name] : "unmapped";
    const normalizedVariant = variant === "filled" ? "filled" : "outline";
    return `
      <article class="asset-icon-card" data-icon-name="${esc(name)}" data-icon-variant="${normalizedVariant}">
        <span class="asset-icon-box">${iconRegistry.renderIcon ? iconRegistry.renderIcon(name, "asset-icon-svg", normalizedVariant) : ""}</span>
        <strong>${esc(name)}</strong>
        <small>${esc(upstream)} · ${normalizedVariant}</small>
      </article>`;
  }

  function iconGroup(group, iconRegistry) {
    const variant = group.variant === "filled" ? "filled" : "outline";
    return `
      <section class="asset-section">
        <header class="asset-section-head">
          <h2>${esc(group.title)}</h2>
          <span>${esc((group.items || []).length)} ${variant} icons</span>
        </header>
        <div class="asset-icon-grid">
          ${(group.items || []).map((name) => iconCard(name, variant, iconRegistry)).join("")}
        </div>
      </section>`;
  }

  function missingIcons(data) {
    const iconRegistry = window.ReaderAssetIcons || {};
    const tokens = new Set();
    for (const group of data.iconGroups || []) {
      const variant = group.variant === "filled" ? "filled" : "outline";
      for (const item of group.items || []) tokens.add(`${item}::${variant}`);
    }
    return Array.from(tokens).filter((token) => {
      const [name, variant] = token.split("::");
      return !iconRegistry.has || !iconRegistry.has(name, variant);
    });
  }

  function render(data) {
    const iconRegistry = window.ReaderAssetIcons || {};
    const missing = missingIcons(data);
    const completeIconGroup = {
      title: "完整语义表（All Semantic IDs）",
      variant: "outline",
      items: iconRegistry.names || []
    };
    const iconGroups = [...(data.iconGroups || []), completeIconGroup];
    const iconCount = (iconRegistry.names || []).length;
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
            ${statCard("图标语义（Icon Semantics）", `${iconCount} 个语义 ID`, `${meta.fixtureIconTokenCount} 个静态使用语义，映射 ${meta.iconSourceCount} 个 Tabler SVG`)}
            ${statCard("验证截图（Validation Screenshots）", `${meta.validationScreenshotCount} 张`, "作为验收证据登记")}
          </div>
        </header>

        <section class="asset-panel" data-slot="screenAssets">
          <header class="asset-panel-head">
            <h2>UI 设计图（UI Design Screens）</h2>
            <p>当前所有 ${esc(meta.screenCount)} 张源 UI 设计图已纳入素材库。</p>
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
            <p>Tabler Icons 3.44.0 是唯一通用图标源；关键入口同时登记 outline 与 filled，完整语义表以 outline 主件为准。</p>
          </header>
          ${iconGroups.map((group) => iconGroup(group, iconRegistry)).join("")}
        </section>

        <section class="asset-panel" data-slot="iconSourceContract">
          <header class="asset-panel-head">
            <h2>来源与覆盖（Source and Coverage）</h2>
            <p>源版本、许可证、语义映射和生成参数全部固定；页面不得再使用手绘、描摹或临时 inline SVG。</p>
          </header>
          <div class="asset-token-row">
            <span>@tabler/icons ${esc(iconRegistry.source && iconRegistry.source.version)}</span>
            <span>${esc(iconRegistry.source && iconRegistry.source.license)}</span>
            <span>${esc(meta.iconSemanticCount)} semantic IDs</span>
            <span>${esc(meta.iconSourceCount)} source SVGs</span>
            <span>${esc(meta.iconFilledSemanticCount)} filled semantics</span>
          </div>
          <div class="asset-status ${missing.length ? "is-error" : "is-ok"}">
            ${iconRegistry.renderIcon ? iconRegistry.renderIcon(missing.length ? "warning" : "check", "asset-status-icon") : ""}
            <strong>${missing.length ? "关键状态存在缺项" : "图标注册完整"}</strong>
            <span>${missing.length ? esc(missing.join(", ")) : "128 个语义 ID 已登记，关键入口的 outline / filled 状态均可用。"}</span>
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
