(function attachReaderControlRenderer(window) {
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

  function clone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function icon(name) {
    const semantic = name === "swap" ? "source" : name;
    if (window.ReaderShellKit && window.ReaderShellKit.icon) {
      return window.ReaderShellKit.icon(semantic, "rc-inline-icon");
    }
    if (window.ReaderAssetIcons && window.ReaderAssetIcons.renderIcon) {
      return window.ReaderAssetIcons.renderIcon(semantic, "rc-inline-icon");
    }
    return "";
  }

  function shellKit() {
    if (!window.ReaderShellKit) {
      throw new Error("ReaderShellKit is required before 阅读控制层/frontend-input/render.js");
    }
    return window.ReaderShellKit;
  }

  function statusRow(data) {
    const status = data.status || {};
    return `
      <header class="rc-status-row" aria-label="阅读状态">
        <span>${esc(status.left)}</span>
        <span>${esc(status.time)}</span>
      </header>`;
  }

  function topControl(data) {
    const control = data.topControl || {};
    return `
      <section class="rc-top-control-bar" aria-label="顶部控制栏">
        <button class="rc-top-icon" type="button" aria-label="返回">${icon("back")}</button>
        <div class="rc-book-info">
          <h1 class="rc-book-title">${esc(control.bookTitle)}</h1>
          <p class="rc-source-line">${esc(control.sourceLine)}</p>
        </div>
        <button class="rc-swap-button" type="button" aria-label="${esc(control.sourceActionLabel)}">
          ${icon("swap")}
          <span>${esc(control.sourceActionLabel)}</span>
        </button>
        <button class="rc-more-dots" type="button" aria-label="更多">
          <span></span><span></span><span></span>
        </button>
      </section>`;
  }

  function readingText(lines) {
    return `
      <article class="rc-reading-text" aria-label="阅读正文">
        ${(lines || []).map((line) => `<p>${esc(line)}</p>`).join("")}
      </article>`;
  }

  function quickActions(actions) {
    return `
      <section class="rc-panel rc-quick-action-panel" aria-label="快捷操作">
        ${(actions || []).map((action) => `
          <button class="rc-quick-action" type="button" data-action="${esc(action.type)}">
            <span class="rc-quick-icon">${icon(action.type)}</span>
            <span>${esc(action.label)}</span>
          </button>`).join("")}
      </section>`;
  }

  function chapterPanel(chapter) {
    chapter = chapter || {};
    return `
      <section class="rc-panel rc-chapter-panel" aria-label="章节进度">
        <div class="rc-chapter-row">
          <div class="rc-chapter-title">${esc(chapter.title)}</div>
          <div class="rc-chapter-pills">
            <button class="rc-chapter-pill" type="button">${esc(chapter.previousLabel)}</button>
            <button class="rc-chapter-pill" type="button">${esc(chapter.nextLabel)}</button>
          </div>
        </div>
        <div class="rc-chapter-progress" style="--value: ${pct(chapter.progress)}" aria-hidden="true">
          <span class="rc-chapter-track"></span>
          <span class="rc-chapter-fill"></span>
          <span class="rc-chapter-thumb"></span>
        </div>
        <div class="rc-chapter-percent">${esc(chapter.progressLabel)}</div>
      </section>`;
  }

  function moduleNavItems(items, activeModule) {
    return (items || []).map((item) => {
      const isActive = item.type === activeModule;
      return `
          <button class="rc-module-item${isActive ? " is-active" : ""}" type="button" data-module="${esc(item.type)}"${isActive ? ' aria-current="page"' : ""}>
            <span class="rc-module-icon">${icon(item.type)}</span>
            <span>${esc(item.label)}</span>
          </button>`;
    }).join("");
  }

  function detailPanel(activeModule) {
    if (!activeModule) {
      return "";
    }

    const content = {
      directory: {
        title: "目录与书签",
        items: ["第 31 章 归途", "第 32 章 雨夜 当前", "书签 2 条"]
      },
      tts: {
        title: "朗读控制",
        items: ["语速 1.1x", "声音 标准女声", "定时 30 分钟"]
      },
      appearance: {
        title: "阅读外观",
        items: ["字号 33", "行距 2.66", "纸张 暖白"]
      },
      settings: {
        title: "阅读设置",
        items: ["点击翻页 开", "屏幕常亮 开", "音量键翻页 关"]
      }
    }[activeModule];

    if (!content) {
      return "";
    }

    return `
      <section class="rc-panel rc-state-detail-panel" aria-label="${esc(content.title)}">
        <h2 class="rc-state-detail-title">${esc(content.title)}</h2>
        <div class="rc-state-detail-grid">
          ${content.items.map((item) => `<div class="rc-state-detail-item">${esc(item)}</div>`).join("")}
        </div>
      </section>`;
  }

  function brightnessPanel(brightness) {
    brightness = brightness || {};
    return `
      <aside class="rc-brightness-panel" aria-label="亮度控制">
        <div class="rc-brightness-title">${esc(brightness.title)}</div>
        <div class="rc-sun-icon" aria-hidden="true">${icon("sun")}</div>
        <div class="rc-brightness-rail" style="--value: ${pct(brightness.value)}" aria-hidden="true">
          <span class="rc-brightness-fill"></span>
          <span class="rc-brightness-thumb"></span>
        </div>
        <div class="rc-auto-letter">${esc(brightness.autoLabel)}</div>
        <div class="rc-system-label">${esc(brightness.modeLabel)}</div>
      </aside>`;
  }

  function controlSheet(data, options) {
    const activeModule = options && options.activeModule;
    return `
      <div class="rc-grabber" aria-hidden="true"></div>
      <div class="rc-control-main${activeModule ? " has-detail" : ""}">
        ${quickActions(data.quickActions)}
        ${chapterPanel(data.chapterProgress)}
        ${detailPanel(activeModule)}
      </div>
      ${brightnessPanel(data.brightness)}`;
  }

  function bottomReadout(data) {
    const readout = data.bottomReadout || {};
    return `
      <footer class="rc-bottom-readout" aria-label="阅读页底部信息">
        <span>${esc(readout.progress)}</span>
        <span>${esc(readout.chapter)}</span>
      </footer>
      <div class="rc-bottom-line" aria-hidden="true"></div>`;
  }

  function readerControlHtml(data, options) {
    const activeModule = options && options.activeModule;
    return shellKit().renderReaderShell({
      frameClass: "rc-page-frame",
      readingSurfaceClass: "rc-reading-surface-host",
      overlayClass: "rc-reader-overlay-host",
      bottomSheetHostClass: "rc-control-sheet",
      moduleNavClass: "rc-panel rc-module-nav",
      stateHostClass: "rc-reader-state-host",
      ariaLabel: "阅读控制层组件预览",
      readingSurfaceHtml: `
        <div class="rc-reading-haze" aria-hidden="true"></div>
        <div class="rc-ambient-top" aria-hidden="true"></div>
        ${statusRow(data)}
        ${readingText(data.readingText)}
        ${bottomReadout(data)}`,
      overlayHtml: topControl(data),
      bottomSheetHtml: controlSheet(data, options || {}),
      moduleNavHtml: moduleNavItems(data.moduleNav, activeModule)
    });
  }

  function renderReaderControl(target, data, options) {
    target.innerHTML = readerControlHtml(data, options || {});
  }

  function stateData(data, activeModule) {
    const next = clone(data);
    if (activeModule === "tts") {
      next.brightness = Object.assign({}, next.brightness, { value: 42, modeLabel: "手动" });
    }
    if (activeModule === "appearance") {
      next.readingText = next.readingText.slice(0, 5);
    }
    return next;
  }

  function renderReaderControlStateMatrix(target, data) {
    const states = [
      { key: "", title: "默认控制层", desc: "顶部栏、章节进度、快捷操作、亮度和底部读数。" },
      { key: "directory", title: "目录展开态", desc: "底部目录模块激活，展示章节与书签入口。" },
      { key: "tts", title: "朗读展开态", desc: "朗读模块激活，展示语速、声音和定时。" },
      { key: "appearance", title: "外观展开态", desc: "界面模块激活，展示字号、行距和纸张。" },
      { key: "settings", title: "设置展开态", desc: "设置模块激活，展示常用阅读开关。" }
    ];

    target.innerHTML = `
      <section class="rc-state-workbench">
        <header class="rc-state-header">
          <h1>阅读控制层状态矩阵</h1>
          <p>用于前端实现时核对底部模块、进度、亮度和展开面板。</p>
        </header>
        <div class="rc-state-grid">
          ${states.map((state) => `
            <article class="rc-state-card">
              <div class="rc-state-meta">
                <h2>${esc(state.title)}</h2>
                <p>${esc(state.desc)}</p>
              </div>
              <div class="rc-state-viewport">
                <div class="rc-state-scale">
                  ${readerControlHtml(stateData(data, state.key), { activeModule: state.key })}
                </div>
              </div>
            </article>`).join("")}
        </div>
      </section>`;
  }

  window.ReaderControlInput = {
    renderReaderControl,
    renderReaderControlStateMatrix
  };
})(window);
