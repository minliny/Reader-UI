/**
 * D3 控制层全部层级（L0-L3）renderer 函数模块
 * ------------------------------------------------------------------------
 * 职责：为 Reader-UI Demo 的「阅读控制层」提供四级（L0-L3）完整层级架构。
 *   - L0 沉浸层：正文 + 页脚进度 + 热区 + 运行胶囊
 *   - L1 基础控制层：顶栏 + 快捷动作 + 章节进度 + 亮度 + 7 模块导航
 *   - L2 模块/快捷面板：底部滑出面板，7 个模块精简版
 *   - L3 完整控制页：全屏页面，完整目录/TTS/外观/设置/搜索/自动翻页/替换
 *
 * 关键交互规则：
 *   1. L1-L3 切换不重建正文（共享 ReadingSurface，CSS 切换）
 *   2. 模块重复点击关闭（回到 L1）
 *   3. 系统返回逐层收起（L3→L2→L1→L0）
 *   4. 互斥规则：keyboard/sheet/dialog/module panel 同时只允许一个活跃
 *   5. 运行胶囊与控制层不冲突（sessionCapsule 独立于 L1-L3）
 *   6. TTS 和自动翻页互斥
 *   7. 三尺寸等级布局（手机竖屏/横屏/平板）
 *
 * 集成方式：模块化加载模式
 *   - index.html 通过 <script> 加载
 *   - 挂载到 window.ReaderD3ControlLayersRenderers
 *   - render-runtime.js 通过 dispatch hook 在 switch 之前分发
 *
 * 集成映射（INTEGRATION_MAP）：
 *   概念路由（motion policy 层级，不实际触发）：
 *     reader-control-show  → readerControlShowV2
 *     reader-control-hide  → readerControlHideV2
 *     reader-module-switch → readerModuleSwitchV2
 *   L1 基础控制层：
 *     control-layer-base-v2 → readerControlShowV2
 *   L2 模块面板（overlay 路由）：
 *     reader-directory-overlay-v2    → readerDirectoryOverlayV2Enhanced
 *     reader-appearance-overlay-v2   → readerAppearanceOverlayV2Enhanced
 *     reader-tts-overlay-v2          → readerTtsOverlayV2Enhanced
 *     reader-settings-overlay-v2     → readerSettingsOverlayV2Enhanced
 *     reader-auto-scroll-overlay-v2  → readerAutoScrollOverlayV2Enhanced
 *     reader-search-overlay-v2       → readerSearchOverlayV2Enhanced
 *     reader-replace-overlay-v2      → readerReplaceOverlayV2Enhanced
 *   L3 完整控制页：
 *     reader-full-directory → readerFullDirectoryV3
 *     reader-full-tts       → readerFullTtsV3
 *     reader-full-settings  → readerFullSettingsV3
 * ------------------------------------------------------------------------
 */
(function attachReaderD3ControlLayersRenderers(window) {
  "use strict";

  // ===========================================================================
  // 基础依赖：shell kit / 转义 / 图标
  // ===========================================================================

  function shellKit() {
    if (!window.ReaderShellKit) {
      throw new Error("ReaderShellKit is required before d3-control-layers-renderers.js");
    }
    return window.ReaderShellKit;
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function icon(name, className) {
    if (window.ReaderShellKit && typeof window.ReaderShellKit.icon === "function") {
      return window.ReaderShellKit.icon(name, className || "fd-icon");
    }
    if (window.ReaderAssetIcons && typeof window.ReaderAssetIcons.renderIcon === "function") {
      return window.ReaderAssetIcons.renderIcon(name, className || "fd-icon");
    }
    return `<span class="${esc(className || "fd-icon")}" data-icon-missing="${esc(name)}" aria-hidden="true"></span>`;
  }

  function chevron() {
    return icon("chevron", "fd-inline-chevron");
  }

  // 路由标题
  function routeTitle(route) {
    var contract = window.ReaderFrontendDemoDraftRouteContract || {};
    var routes = contract.routes || {};
    return String((routes[route] && routes[route].title) || route).replace(/（.*$/, "").trim();
  }

  // 百分比归一化
  function pct(value) {
    var numeric = Number(String(value == null ? "0" : value).replace("%", ""));
    if (!Number.isFinite(numeric)) numeric = 0;
    return Math.max(0, Math.min(100, numeric)) + "%";
  }

  // ===========================================================================
  // D3 控制层状态管理
  // ===========================================================================

  var d3ControlLayerState = {
    currentLayer: 0,        // 0=L0, 1=L1, 2=L2, 3=L3
    activeModule: null,     // 当前活跃模块：directory/tts/appearance/settings/search/autoPage/replace
    ttsActive: false,       // TTS 是否运行
    autoPageActive: false,  // 自动翻页是否运行
    overlayActive: null,    // 当前 overlay：keyboard/sheet/dialog
    layoutMode: "phone",    // phone/landscape/tablet
    brightnessValue: 80     // 亮度值
  };

  // 7 个模块定义（比原有 4 个扩展了 search/autoPage/replace）
  var D3_MODULES = [
    { type: "directory", label: "目录", icon: "reader-module-directory", route: "reader-directory-overlay-v2", fullRoute: "reader-full-directory" },
    { type: "tts", label: "朗读", icon: "reader-module-tts", route: "reader-tts-overlay-v2", fullRoute: "reader-full-tts" },
    { type: "appearance", label: "外观", icon: "reader-module-appearance", route: "reader-appearance-overlay-v2", fullRoute: "reader-full-appearance" },
    { type: "settings", label: "设置", icon: "reader-module-settings", route: "reader-settings-overlay-v2", fullRoute: "reader-full-settings" },
    { type: "search", label: "搜索", icon: "reader-content-search", route: "reader-search-overlay-v2", fullRoute: null },
    { type: "autoPage", label: "自动翻页", icon: "reader-auto-page", route: "reader-auto-scroll-overlay-v2", fullRoute: null },
    { type: "replace", label: "替换", icon: "reader-content-replace", route: "reader-replace-overlay-v2", fullRoute: null }
  ];

  // ===========================================================================
  // 样式辅助
  // ===========================================================================

  function d3ThemeStyle(data, appState) {
    var theme = (data && data.reader && data.reader.theme) || {};
    var bg = theme.background || "#f5f0e8";
    var fg = theme.foreground || "#3a3226";
    if (appState && appState.readerThemeValue) {
      var presets = {
        day: { bg: "#f5f0e8", fg: "#3a3226" },
        night: { bg: "#1a1a2e", fg: "#c8c0b4" },
        paper: { bg: "#ede4d3", fg: "#4a3f2f" },
        warm: { bg: "#f0e6d2", fg: "#5a4a32" },
        green: { bg: "#e0ede4", fg: "#2a4a3a" },
        blue: { bg: "#e0e8f0", fg: "#2a3a5a" }
      };
      var preset = presets[appState.readerThemeValue] || presets.day;
      bg = preset.bg;
      fg = preset.fg;
    }
    return `--reader-bg:${esc(bg)};--reader-fg:${esc(fg)}`;
  }

  function d3BrightnessStyle(data, appState) {
    var brightness = (data && data.reader && data.reader.brightness) || {};
    var config = brightness.config || { min: 20, max: 100, defaultValue: 80 };
    var value = Number.isFinite(Number(appState && appState.readerBrightness))
      ? Number(appState.readerBrightness)
      : (brightness.defaultValue || config.defaultValue || d3ControlLayerState.brightnessValue);
    return `--brightness:${esc(value)}%`;
  }

  function d3TypographyStyle(data) {
    var typography = (data && data.reader && data.reader.typography) || {};
    return `--reader-font-size:${esc(typography.fontSize || 18)}px;--reader-line-height:${esc(typography.lineHeight || 1.8)};--reader-letter-spacing:${esc(typography.letterSpacing || 0)}px`;
  }

  // ===========================================================================
  // 轻量阅读正文表面（L1-L3 共享，不重建正文）
  // ===========================================================================

  function d3ReaderSurface(data, appState) {
    var paragraphs = (data && data.reader && Array.isArray(data.reader.readingText))
      ? data.reader.readingText.slice(0, 4)
      : ["雨，下了一整夜。", "窗外的梧桐叶被打得沙沙作响，像是谁在黑暗里低声絮语。"];
    var chapterMeta = (data && data.reader && data.reader.chapterMeta) || "第 32 章";
    var chapterTitle = (data && data.reader && data.reader.chapterTitle) || "雨夜";
    var fullTitle = chapterMeta + " " + chapterTitle;
    return `
      <div class="fd-ir-background-layer" data-dev-region="ReadingBackground" aria-hidden="true" style="${d3ThemeStyle(data, appState)}"></div>
      <article class="fd-ir-reading-layer" aria-label="正文排版层" data-dev-region="ReadingTextLayer" data-reader-surface-signature="${esc(fullTitle)}" data-d3-shared-surface style="${d3ThemeStyle(data, appState)};${d3TypographyStyle(data)}">
        <h1>${esc(chapterTitle)}</h1>
        ${paragraphs.map(function(p) { return `<p>${esc(p)}</p>`; }).join("")}
      </article>
      <div class="fd-reader-brightness-dim" data-reader-brightness-dim aria-hidden="true" style="${d3BrightnessStyle(data, appState)}"></div>`;
  }

  // ===========================================================================
  // 顶部栏（L1/L2/L3 共享）
  // ===========================================================================

  function d3ReaderTopOverlay(data, appState, options) {
    var opts = options || {};
    var title = (data && data.reader && data.reader.title) || "长夜余火";
    var sourceLine = (data && data.reader && data.reader.sourceLine) || "第 32 章 雨夜 · 优书网";
    var showMore = opts.showMore !== false;
    return `
      <section class="fd-reader-top" data-dev-region="ReaderTopBar">
        <button type="button" aria-label="返回" data-reader-exit>${icon("back", "fd-icon")}</button>
        <span><strong>${esc(title)}</strong><small>${esc(sourceLine)}</small></span>
        ${showMore ? `<button type="button" data-route="source-switch">${icon("source-switch", "fd-small-icon")}换源</button>` : ""}
        <button type="button" aria-label="更多" data-reader-more-toggle>${icon("more", "fd-small-icon")}</button>
      </section>`;
  }

  // ===========================================================================
  // 运行胶囊（L0 顶部 + L1-L3 控制层不冲突）
  // ===========================================================================

  function d3SessionCapsule(appState) {
    var ttsSession = Boolean(appState && (appState.readerTtsSession || (appState.readerTts && appState.readerTts.playing)));
    var ttsPlaying = Boolean(appState && appState.readerTts && appState.readerTts.playing);
    var autoSession = Boolean(appState && (appState.readerAutoPageSession || (appState.readerSettings && appState.readerSettings.autoPage)));
    var autoPlaying = Boolean(appState && appState.readerSettings && appState.readerSettings.autoPage);

    // 同步到 D3 状态
    d3ControlLayerState.ttsActive = ttsSession;
    d3ControlLayerState.autoPageActive = autoSession;

    if (!ttsSession && !autoSession) return "";

    var isTts = ttsSession;
    var label = isTts ? "朗读" : "自动翻页";
    var isPlaying = isTts ? ttsPlaying : autoPlaying;
    var countdown = Math.max(1, Math.min(99, Number(appState && appState.readerAutoPageCountdown) || 8));

    var leading = isTts
      ? `<span class="fd-ir-voice-icon" aria-hidden="true">${icon("tts", "fd-small-icon")}</span>`
      : `<span class="fd-ir-countdown-dot" aria-label="自动翻页倒计时 ${esc(countdown)} 秒">${esc(countdown)}</span>`;

    var control = isTts
      ? `<button type="button" data-reader-tts-action="toggle" aria-label="${ttsPlaying ? "暂停朗读" : "继续朗读"}">${icon(ttsPlaying ? "pause" : "play", "fd-small-icon")}</button>`
      : `<button type="button" data-reader-setting-toggle="autoPage" aria-label="${autoPlaying ? "暂停自动翻页" : "继续自动翻页"}">${icon(autoPlaying ? "pause" : "play", "fd-small-icon")}</button>`;

    return `
      <span class="fd-ir-status-capsule" data-reader-immersive-status data-reader-immersive-status-type="${esc(isTts ? "tts" : "autoPage")}" data-reader-immersive-status-playing="${isPlaying ? "true" : "false"}">
        ${leading}
        <b>${esc(label)}</b>
        <span class="fd-ir-status-controls">${control}</span>
      </span>`;
  }

  // ===========================================================================
  // 沉浸信息层（L0 页脚进度）
  // ===========================================================================

  function d3ImmersiveInfoOverlay(data, appState) {
    var readout = (data && data.reader && data.reader.bottomReadout) || {};
    var bookTitle = (data && data.reader && data.reader.title) || "长夜余火";
    var statusTime = (data && data.reader && data.reader.status && data.reader.status.time) || "23:14";
    var progress = readout.progress || "38%";
    var pageLabel = "1/12";
    var capsule = d3SessionCapsule(appState);
    var hideStatusBar = Boolean(appState && appState.readerSettings && appState.readerSettings.hideStatusBar);
    var topInfoHtml = hideStatusBar
      ? `<span class="fd-ir-top-left" data-reader-top-corner="title">${esc(bookTitle)}</span>
        <span class="fd-ir-top-right" data-reader-top-corner="time">${esc(statusTime)}</span>`
      : `<header class="fd-reader-system-status" data-reader-system-status aria-label="系统状态栏">
          <span>${esc(statusTime)}</span>
          <span aria-hidden="true">${icon("signal", "fd-reader-status-icon")}${icon("wifi", "fd-reader-status-icon")}${icon("battery", "fd-reader-status-icon")}</span>
        </header>`;
    return `
      <section class="fd-ir-info-layer" data-dev-region="ImmersiveInfoLayer" aria-label="阅读信息层">
        ${topInfoHtml}
        <span class="fd-ir-bottom-left" data-dev-region="ImmersiveFooterProgress">${esc(progress)}</span>
        <span class="fd-ir-bottom-right${capsule ? " has-session-capsule" : ""}" data-dev-region="ImmersiveFooterStatus" data-reader-footer-status="${capsule ? "session" : "page"}">
          <span class="fd-ir-page-label" data-reader-page-readout>${esc(pageLabel)}</span>
          ${capsule}
        </span>
      </section>`;
  }

  // ===========================================================================
  // 热区（L0 点击切换控制层）
  // ===========================================================================

  function d3TapZones(data, appState) {
    return `
      <section class="fd-ir-tap-zone-layer" data-dev-region="ImmersiveTapZones" aria-label="透明点击热区层">
        <button class="fd-immersive-hotzone fd-hotzone-prev" type="button" aria-label="上一页" data-reader-page-action="prev"></button>
        <button class="fd-immersive-hotzone fd-hotzone-center" type="button" aria-label="打开阅读控制层" data-dev-region="ControlLayerHotzone" data-route="reader" data-d3-layer-up="1"></button>
        <button class="fd-immersive-hotzone fd-hotzone-next" type="button" aria-label="下一页" data-reader-page-action="next"></button>
      </section>`;
  }

  // ===========================================================================
  // 7 模块导航（L1/L2 底部 tab，扩展为 7 个）
  // ===========================================================================

  function d3ModuleNavHtml(activeType) {
    return D3_MODULES.map(function(item) {
      var isActive = item.type === activeType;
      return `<button class="fd-reader-module${isActive ? " is-active" : ""}" type="button" data-route="${esc(item.route)}" data-module="${esc(item.type)}" data-d3-module-tab="${esc(item.type)}"${isActive ? ' aria-current="page"' : ""}>
        <span>${icon(item.icon, "fd-medium-icon")}</span>
        <small>${esc(item.label)}</small>
      </button>`;
    }).join("");
  }

  // ===========================================================================
  // 快捷动作（L1 顶部快捷操作）
  // ===========================================================================

  function d3QuickActionsHtml(data) {
    var actions = [
      { type: "prev", label: "上一章", icon: "chevron-left", action: "prev" },
      { type: "next", label: "下一章", icon: "chevron", action: "next" },
      { type: "directory", label: "目录", icon: "reader-module-directory", route: "reader-directory-overlay-v2" }
    ];
    return actions.map(function(item) {
      var attr = item.route ? ` data-route="${esc(item.route)}"` : ` data-reader-chapter-action="${esc(item.action)}"`;
      return `<button type="button"${attr}>${icon(item.icon, "fd-medium-icon")}<span>${esc(item.label)}</span></button>`;
    }).join("");
  }

  // ===========================================================================
  // 章节进度条（L1）
  // ===========================================================================

  function d3ChapterProgressHtml(data, appState) {
    var chapter = (data && data.reader && data.reader.chapterProgress) || {};
    var chapterMeta = (data && data.reader && data.reader.chapterMeta) || "第 32 章";
    var chapterTitle = (data && data.reader && data.reader.chapterTitle) || "雨夜";
    var chapterTitleFull = chapter.title || (chapterMeta + " " + chapterTitle);
    var progress = "38%";
    var totalChapters = "812";
    return `
      <section class="fd-reader-chapter-panel" aria-label="书籍进度">
        <div class="fd-reader-chapter-row fd-reader-chapter-control-row">
          <button class="fd-reader-chapter-step" type="button" data-reader-chapter-action="prev" aria-label="上一章">${icon("chevron-left", "fd-small-icon")}</button>
          <span class="fd-reader-chapter-main">
            <strong data-reader-current-chapter>${esc(chapterTitleFull)}</strong>
          </span>
          <button class="fd-reader-chapter-step" type="button" data-reader-chapter-action="next" aria-label="下一章">${icon("chevron", "fd-small-icon")}</button>
        </div>
        <div class="fd-reader-progress-row">
          <small class="fd-reader-book-progress" aria-label="书籍进度 ${esc(progress)}">${esc(progress)}</small>
          <button class="fd-reader-progress" type="button" style="--progress:${esc(pct(progress))}" data-reader-chapter-progress aria-label="调整书籍进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${esc(progress.replace("%", ""))}">
            <i><b></b></i>
          </button>
          <span class="fd-reader-total-chapters" aria-label="总章节 ${esc(totalChapters)} 章">共 ${esc(totalChapters)} 章</span>
        </div>
      </section>`;
  }

  // ===========================================================================
  // 亮度滑块（L1）
  // ===========================================================================

  function d3BrightnessRail(data, appState) {
    var shared = window.ReaderRuntimeSharedFragments;
    if (shared && typeof shared.brightnessRailHtml === "function") {
      try {
        var sharedHtml = shared.brightnessRailHtml(data, appState);
        if (typeof sharedHtml === "string" && sharedHtml.trim()) return sharedHtml;
      } catch (_error) {
        // Standalone renderer smoke tests use the equivalent fallback below.
      }
    }
    var brightness = (data && data.reader && data.reader.brightness) || {};
    var min = Number.isFinite(Number(brightness.min)) ? Number(brightness.min) : 0;
    var max = Number.isFinite(Number(brightness.max)) ? Number(brightness.max) : 100;
    var rawValue = Number.isFinite(Number(appState && appState.readerBrightness))
      ? Number(appState.readerBrightness)
      : Number(String(brightness.value == null ? d3ControlLayerState.brightnessValue : brightness.value).replace("%", ""));
    var value = Math.round(Math.max(min, Math.min(max, Number.isFinite(rawValue) ? rawValue : 80)));
    var isAuto = Boolean(appState && appState.readerBrightnessAuto);
    return `
      <aside class="fd-brightness-rail" aria-label="亮度控制" data-dev-region="BrightnessRail" style="--brightness:${esc(value)}%">
        ${icon("sun", "fd-small-icon")}
        <i data-reader-brightness-track role="slider" aria-label="调整亮度" aria-orientation="vertical" aria-valuemin="${esc(min)}" aria-valuemax="${esc(max)}" aria-valuenow="${esc(value)}" tabindex="0"><b></b></i>
        <button class="fd-brightness-auto-toggle${isAuto ? " is-active" : ""}" type="button" data-reader-brightness-auto aria-pressed="${isAuto ? "true" : "false"}" aria-label="${esc(brightness.autoText || "自动亮度")}">${esc(brightness.autoLabel || "A")}</button>
      </aside>`;
  }

  // ===========================================================================
  // L0 沉浸层渲染
  // ===========================================================================

  function renderL0Immersive(data, appState) {
    d3ControlLayerState.currentLayer = 0;
    d3ControlLayerState.activeModule = null;
    var pageModeClass = appState && appState.readerPageMode === "vertical" ? " fd-reader-page-mode-vertical" : " fd-reader-page-mode-horizontal";
    return shellKit().renderReaderShell({
      frameClass: `fd-reader-frame fd-reader-flow-frame fd-reader-mode-immersive fd-immersive-frame fd-d3-layer fd-d3-layer-l0${pageModeClass}`,
      frameStyle: d3ThemeStyle(data, appState),
      readingSurfaceClass: "fd-reading-surface",
      overlayClass: "fd-reader-overlay fd-immersive-overlay",
      bottomSheetHostClass: "fd-reader-sheet fd-reader-sheet-empty",
      moduleNavClass: "fd-reader-module-nav fd-reader-module-nav-empty",
      stateHostClass: "fd-reader-state-host",
      stateHostHtml: `<div class="fd-reader-global-brightness-dim" data-reader-brightness-dim aria-hidden="true" style="${d3BrightnessStyle(data, appState)}"></div>`,
      ariaLabel: "沉浸阅读",
      readingSurfaceHtml: d3ReaderSurface(data, appState),
      overlayHtml: d3ImmersiveInfoOverlay(data, appState) + d3TapZones(data, appState),
      bottomSheetHtml: "",
      moduleNavHtml: ""
    });
  }

  // ===========================================================================
  // L1 基础控制层渲染
  // ===========================================================================

  function renderL1BasicControl(data, appState) {
    d3ControlLayerState.currentLayer = 1;
    d3ControlLayerState.activeModule = null;
    var pageModeClass = appState && appState.readerPageMode === "vertical" ? " fd-reader-page-mode-vertical" : " fd-reader-page-mode-horizontal";
    var controlMain = `
      <div class="fd-reader-control-main" data-dev-region="BottomControlPanel">
        <nav class="fd-reader-actions" aria-label="快捷操作">
          ${d3QuickActionsHtml(data)}
        </nav>
        ${d3ChapterProgressHtml(data, appState)}
      </div>`;
    var bottomSheet = `
      <button class="fd-reader-grabber" type="button" data-d3-layer-up="3" aria-label="展开完整控制页"></button>
      ${controlMain}`;
    return shellKit().renderReaderShell({
      frameClass: `fd-reader-frame fd-reader-flow-frame fd-reader-mode-control fd-d3-layer fd-d3-layer-l1${pageModeClass}`,
      frameStyle: d3ThemeStyle(data, appState),
      readingSurfaceClass: "fd-reading-surface",
      overlayClass: "fd-reader-overlay",
      bottomSheetHostClass: "fd-reader-sheet",
      moduleNavClass: "fd-reader-module-nav",
      accessoryHostClass: "fd-reader-accessory-host",
      accessoryHtml: d3BrightnessRail(data, appState),
      stateHostClass: "fd-reader-state-host",
      stateHostHtml: `<div class="fd-reader-global-brightness-dim" data-reader-brightness-dim aria-hidden="true" style="${d3BrightnessStyle(data, appState)}"></div>`,
      ariaLabel: "阅读控制层",
      readingSurfaceHtml: d3ReaderSurface(data, appState),
      overlayHtml: d3ReaderTopOverlay(data, appState),
      bottomSheetHtml: bottomSheet,
      moduleNavHtml: d3ModuleNavHtml(null)
    });
  }

  // ===========================================================================
  // L2 模块/快捷面板渲染
  // ===========================================================================

  function renderL2ModulePanel(data, appState, moduleType) {
    d3ControlLayerState.currentLayer = 2;
    d3ControlLayerState.activeModule = moduleType;
    ensureMutualExclusion(moduleType);
    var pageModeClass = appState && appState.readerPageMode === "vertical" ? " fd-reader-page-mode-vertical" : " fd-reader-page-mode-horizontal";
    var panelHtml = d3ModulePanelContent(moduleType, data, appState);
    var fullRoute = d3FullRouteForModule(moduleType);
    var quickExpandable = moduleType === "search" || moduleType === "autoPage";
    var grabber = quickExpandable
      ? `<button class="fd-reader-grabber" type="button" data-reader-quick-expand="${esc(moduleType === "autoPage" ? "auto-page" : moduleType)}" data-d3-layer-up="3" aria-label="展开完整控制页"></button>`
      : fullRoute
      ? `<button class="fd-reader-grabber" type="button" data-route="${esc(fullRoute)}" data-route-replace data-d3-layer-up="3" aria-label="展开完整控制页"></button>`
      : "";
    var bottomSheet = grabber + panelHtml;
    return shellKit().renderReaderShell({
      frameClass: `fd-reader-frame fd-reader-flow-frame fd-reader-mode-module fd-d3-layer fd-d3-layer-l2 fd-d3-module-${esc(moduleType)}${pageModeClass}`,
      frameStyle: d3ThemeStyle(data, appState),
      readingSurfaceClass: "fd-reading-surface",
      overlayClass: "fd-reader-overlay",
      bottomSheetHostClass: "fd-reader-sheet",
      moduleNavClass: "fd-reader-module-nav",
      accessoryHostClass: "fd-reader-accessory-host",
      accessoryHtml: d3BrightnessRail(data, appState),
      stateHostClass: "fd-reader-state-host",
      stateHostHtml: `<div class="fd-reader-global-brightness-dim" data-reader-brightness-dim aria-hidden="true" style="${d3BrightnessStyle(data, appState)}"></div>`,
      ariaLabel: d3ModuleLabel(moduleType) + "面板",
      readingSurfaceHtml: d3ReaderSurface(data, appState),
      overlayHtml: d3ReaderTopOverlay(data, appState),
      bottomSheetHtml: bottomSheet,
      moduleNavHtml: d3ModuleNavHtml(moduleType)
    });
  }

  // L2 面板内容（7 个模块精简版）
  function d3ModulePanelContent(moduleType, data, appState) {
    switch (moduleType) {
      case "directory":
        return d3DirectoryPanel(data, appState);
      case "tts":
        return d3TtsPanel(data, appState);
      case "appearance":
        return d3AppearancePanel(data, appState);
      case "settings":
        return d3SettingsPanel(data, appState);
      case "search":
        return d3SearchPanel(data, appState);
      case "autoPage":
        return d3AutoPagePanel(data, appState);
      case "replace":
        return d3ReplacePanel(data, appState);
      default:
        return d3SettingsPanel(data, appState);
    }
  }

  // 目录面板（L2 精简版）
  function d3DirectoryPanel(data, appState) {
    var chapters = d3Chapters(data).slice(0, 6);
    var listHtml = chapters.map(function(chapter, index) {
      return `<article class="fd-reader-toc-row fd-reader-full-toc-row${index === 0 ? " is-current" : ""}" role="button" tabindex="0" data-reader-directory-index="${esc(index)}">
        <strong>${esc(chapter.title)}</strong>
      </article>`;
    }).join("");
    return `
      <section class="fd-reader-module-panel fd-reader-toc-panel" data-dev-region="ReaderModulePanel" aria-label="目录与书签">
        <header class="fd-reader-module-header">
          <strong class="fd-reader-module-title">目录</strong>
          <button type="button" data-d3-toc-mode="bookmark">书签</button>
        </header>
        <div class="fd-reader-toc-list fd-reader-full-toc-list">
          ${listHtml}
        </div>
      </section>`;
  }

  // 朗读面板（L2 精简版）
  function d3TtsPanel(data, appState) {
    var tts = (appState && appState.readerTts) || {};
    var ttsSession = Boolean(appState && (appState.readerTtsSession || (tts && tts.playing)));
    return `
      <section class="fd-reader-module-panel fd-reader-tts-panel" data-dev-region="ReaderModulePanel" aria-label="朗读">
        <header class="fd-reader-tts-toolbar" aria-label="朗读操作">
          <strong class="fd-reader-module-title">朗读</strong>
          <button class="fd-reader-tts-stop ${ttsSession ? "" : "is-disabled"}" type="button"${ttsSession ? ` data-reader-session-stop="tts"` : ` aria-disabled="true"`}>停止朗读</button>
        </header>
        <div class="fd-reader-tts-list fd-reader-module-list">
          <section class="fd-reader-tts-row fd-reader-tts-control-row" aria-label="播放控制">
            <span class="fd-reader-tts-controls">
              <button type="button" data-reader-tts-action="prev" aria-label="上一句">${icon("chevron-left", "fd-small-icon")}</button>
              <button class="is-primary ${tts.playing ? "is-playing" : ""}" type="button" data-reader-tts-action="toggle" aria-label="${tts.playing ? "暂停朗读" : "开始朗读"}">${icon(tts.playing ? "pause" : "play", "fd-small-icon")}</button>
              <button type="button" data-reader-tts-action="next" aria-label="下一句">${icon("chevron", "fd-small-icon")}</button>
            </span>
          </section>
          ${d3TtsOptionRow("speed", "语速", tts.speed || "1.0x", "motion")}
          ${d3TtsOptionRow("voice", "音色", tts.voice || "标准女声", "volume")}
          ${d3TtsOptionRow("timer", "定时", tts.timer || "关闭", "clock")}
        </div>
      </section>`;
  }

  function d3TtsOptionRow(key, label, value, iconName) {
    return `
      <div class="fd-reader-tts-option-row">
        <button type="button" data-reader-tts-option-key="${esc(key)}">
          <i>${icon(iconName, "fd-small-icon")}</i>
          <strong>${esc(label)}</strong>
          <em>${esc(value)}${chevron()}</em>
        </button>
      </div>`;
  }

  // 外观面板（L2 精简版）
  function d3AppearancePanel(data, appState) {
    var themes = [
      { value: "day", label: "日间", swatch: "#f5f0e8", scheme: "day" },
      { value: "night", label: "夜间", swatch: "#1a1a2e", scheme: "night" },
      { value: "paper", label: "纸纹", swatch: "#ede4d3", scheme: "day" },
      { value: "warm", label: "暖白", swatch: "#f0e6d2", scheme: "day" }
    ];
    var activeTheme = (appState && appState.readerThemeValue) || "day";
    return `
      <section class="fd-reader-module-panel fd-reader-appearance-panel" data-dev-region="ReaderModulePanel" aria-label="阅读外观">
        <header class="fd-reader-module-header">
          <strong class="fd-reader-module-title">外观</strong>
        </header>
        <div class="fd-reader-appearance-list fd-reader-module-list">
          <section class="fd-reader-full-setting-block fd-reader-appearance-quick-theme">
            <header><strong>阅读主题</strong></header>
            <div class="fd-reader-full-theme-grid">
              ${themes.map(function(item) {
                return `<button class="${activeTheme === item.value ? "is-active" : ""}" type="button" data-reader-theme="${esc(item.value)}" data-reader-theme-scheme="${esc(item.scheme)}" aria-label="${esc(item.label)}主题">
                  <span style="--swatch:${esc(item.swatch)}"></span>
                  <small>${esc(item.label)}</small>
                </button>`;
              }).join("")}
            </div>
          </section>
          <section class="fd-reader-full-setting-block fd-reader-appearance-quick-typography">
            <div class="fd-reader-appearance-quick-selects">
              <label>
                <strong>字号</strong>
                <select data-reader-typography-select="fontSize" aria-label="字号">
                  ${[14, 16, 18, 20, 22, 24].map(function(value) { return `<option value="${value}"${Number((appState && appState.readerTypography && appState.readerTypography.fontSize) || 18) === value ? " selected" : ""}>${value}</option>`; }).join("")}
                </select>
              </label>
              <label>
                <strong>行距</strong>
                <select data-reader-typography-select="lineHeight" aria-label="行距">
                  ${[1.4, 1.6, 1.8, 2].map(function(value) { return `<option value="${value}"${Number((appState && appState.readerTypography && appState.readerTypography.lineHeight) || 1.6) === value ? " selected" : ""}>${value}</option>`; }).join("")}
                </select>
              </label>
            </div>
          </section>
        </div>
      </section>`;
  }

  // 设置面板（L2 精简版）
  function d3SettingsPanel(data, appState) {
    var settings = (appState && appState.readerSettings) || {};
    var toggles = [
      { key: "autoPage", label: "自动翻页", icon: "refresh" },
      { key: "volumePage", label: "音量键翻页", icon: "volume" },
      { key: "keepScreenOn", label: "屏幕常亮", icon: "sun" },
      { key: "landscapeLock", label: "横屏锁定", icon: "permission" }
    ];
    return `
      <section class="fd-reader-module-panel fd-reader-settings-panel" data-dev-region="ReaderModulePanel" aria-label="阅读设置">
        <header class="fd-reader-module-header">
          <strong class="fd-reader-module-title">设置</strong>
        </header>
        <div class="fd-reader-settings-list fd-reader-module-list">
          ${toggles.map(function(item) {
            var enabled = Boolean(settings[item.key]);
            return `<button class="fd-reader-setting-row" type="button" data-reader-setting-toggle="${esc(item.key)}">
              <i>${icon(item.icon, "fd-small-icon")}</i>
              <strong>${esc(item.label)}</strong>
              <span class="fd-settings-switch${enabled ? " is-on" : ""}" aria-hidden="true"><i></i></span>
            </button>`;
          }).join("")}
        </div>
      </section>`;
  }

  // 搜索面板（L2 精简版）
  function d3SearchPanel(data, appState) {
    return `
      <section class="fd-reader-module-panel fd-reader-search-panel" data-dev-region="ReaderModulePanel" aria-label="内容搜索">
        <header class="fd-reader-quick-toolbar" aria-label="内容搜索操作">
          <button class="fd-reader-quick-back" type="button" data-route="reader" data-d3-layer-up="1" aria-label="返回阅读控制首页">
            ${icon("back", "fd-small-icon")}<span>返回</span>
          </button>
          <span class="fd-reader-quick-toolbar-actions">
            <button class="fd-reader-quick-action" type="button" data-reader-quick-expand="search" aria-label="打开完整搜索控制页">完整搜索</button>
            <button class="fd-reader-quick-action is-primary" type="button" data-reader-search-submit aria-label="搜索">搜索</button>
          </span>
        </header>
        <label class="fd-reader-panel-search fd-reader-search-field">${icon("search", "fd-small-icon")}<input type="search" value="雨夜" aria-label="搜索正文内容" data-reader-search-input /></label>
        <div class="fd-reader-search-result-list fd-reader-module-list" aria-label="内容搜索结果">
          <button type="button" data-route="immersive-reading"><strong>第 32 章 雨夜</strong><p>雨夜的风格外冷，远处的屋檐被雾气压得很低。她停在旧巷入口，听见石阶尽头传来很轻的脚步声。</p></button>
          <button type="button" data-route="immersive-reading"><strong>第 33 章 灯塔</strong><p>雨夜之后，远处灯塔重新亮起。潮湿的风掠过海面，微弱的光束一遍遍扫过废弃码头。</p></button>
          <button type="button" data-route="immersive-reading"><strong>第 47 章 回声</strong><p>关于那个雨夜的回忆并没有消失，只是藏进了无人提起的角落，偶尔在安静时泛起清晰的回声。</p></button>
        </div>
      </section>`;
  }

  // 自动翻页面板（L2 精简版）
  function d3AutoPagePanel(data, appState) {
    var autoPageActive = d3ControlLayerState.autoPageActive;
    var countdown = Math.max(1, Math.min(99, Number(appState && appState.readerAutoPageCountdown) || 8));
    return `
      <section class="fd-reader-module-panel fd-reader-auto-page-panel" data-dev-region="ReaderModulePanel" aria-label="自动翻页">
        <header class="fd-reader-quick-toolbar" aria-label="自动翻页操作">
          <button class="fd-reader-quick-back" type="button" data-route="reader" data-d3-layer-up="1" aria-label="返回阅读控制首页">
            ${icon("back", "fd-small-icon")}<span>返回</span>
          </button>
          <button class="fd-reader-auto-stop ${autoPageActive ? "" : "is-disabled"}" type="button"${autoPageActive ? ` data-reader-session-stop="autoPage"` : ` aria-disabled="true"`}>停止</button>
        </header>
        <div class="fd-reader-auto-page-list fd-reader-module-list">
          <section class="fd-reader-auto-control-row">
            <button class="is-primary ${autoPageActive ? "is-playing" : ""}" type="button" data-reader-setting-toggle="autoPage" aria-label="${autoPageActive ? "暂停自动翻页" : "开始自动翻页"}">${icon(autoPageActive ? "pause" : "play", "fd-medium-icon")}</button>
            <strong>${autoPageActive ? "自动翻页中" : "已暂停"}</strong>
            <em>倒计时 ${esc(countdown)} 秒</em>
          </section>
          <div class="fd-reader-auto-speed-row">
            <small>翻页速度</small>
            <div class="fd-reader-auto-speed-buttons">
              <button type="button" data-reader-auto-speed="slow">慢</button>
              <button class="is-active" type="button" data-reader-auto-speed="normal">正常</button>
              <button type="button" data-reader-auto-speed="fast">快</button>
            </div>
          </div>
        </div>
      </section>`;
  }

  // 替换面板（L2 精简版）
  function d3ReplacePanel(data, appState) {
    var rules = [
      { id: "rain-name", title: "雨容称呼", enabled: true, pattern: "雨容", replacement: "雨蓉" },
      { id: "old-name", title: "旧称统一", enabled: true, pattern: "老张", replacement: "张老" },
      { id: "ad-filter", title: "广告过滤", enabled: true, pattern: "本章未完.*?点击", replacement: "" }
    ];
    return `
      <section class="fd-reader-module-panel fd-reader-replace-panel" data-dev-region="ReaderModulePanel" aria-label="内容替换">
        <header class="fd-reader-quick-toolbar" aria-label="内容替换操作">
          <button class="fd-reader-quick-back" type="button" data-route="reader" data-d3-layer-up="1" aria-label="返回阅读控制首页">
            ${icon("back", "fd-small-icon")}<span>返回</span>
          </button>
          <button class="fd-reader-quick-action" type="button" data-route="reader-replace-page">管理</button>
        </header>
        <div class="fd-reader-replace-list fd-reader-module-list">
          ${rules.map(function(rule) {
            return `<article class="fd-reader-replace-rule${rule.enabled ? " is-enabled" : ""}">
              <strong>${esc(rule.title)}</strong>
              <small>${esc(rule.pattern)} → ${esc(rule.replacement || "（删除）")}</small>
              <span class="fd-settings-switch${rule.enabled ? " is-on" : ""}" aria-hidden="true"><i></i></span>
            </article>`;
          }).join("")}
        </div>
      </section>`;
  }

  // ===========================================================================
  // L3 完整控制页渲染
  // ===========================================================================

  function renderL3FullControl(data, appState, pageType) {
    d3ControlLayerState.currentLayer = 3;
    d3ControlLayerState.activeModule = pageType;
    var pageModeClass = appState && appState.readerPageMode === "vertical" ? " fd-reader-page-mode-vertical" : " fd-reader-page-mode-horizontal";
    var panelHtml = d3FullPageContent(pageType, data, appState);
    var moduleRoute = d3ModuleRouteForType(pageType);
    return shellKit().renderReaderShell({
      frameClass: `fd-reader-frame fd-reader-flow-frame fd-reader-mode-full fd-reader-mode-full-${esc(pageType)} fd-d3-layer fd-d3-layer-l3${pageModeClass}`,
      frameStyle: d3ThemeStyle(data, appState),
      readingSurfaceClass: "fd-reading-surface",
      overlayClass: "fd-reader-overlay fd-reader-full-overlay",
      bottomSheetHostClass: "fd-reader-full-host",
      moduleNavClass: "fd-reader-module-nav fd-reader-module-nav-empty",
      stateHostClass: "fd-reader-state-host",
      stateHostHtml: `<div class="fd-reader-global-brightness-dim" data-reader-brightness-dim aria-hidden="true" style="${d3BrightnessStyle(data, appState)}"></div>`,
      ariaLabel: d3ModuleLabel(pageType) + "完整设置",
      readingSurfaceHtml: d3ReaderSurface(data, appState),
      overlayHtml: d3ReaderTopOverlay(data, appState),
      bottomSheetHtml: panelHtml,
      moduleNavHtml: ""
    });
  }

  // L3 完整页面内容
  function d3FullPageContent(pageType, data, appState) {
    var title = d3ModuleLabel(pageType);
    var iconName = d3ModuleIcon(pageType);
    var contentHtml = "";
    switch (pageType) {
      case "directory":
        contentHtml = d3FullDirectoryPage(data, appState);
        break;
      case "tts":
        contentHtml = d3FullTtsPage(data, appState);
        break;
      case "settings":
        contentHtml = d3FullSettingsPage(data, appState);
        break;
      default:
        contentHtml = d3FullSettingsPage(data, appState);
    }
    var collapseRoute = d3ModuleRouteForType(pageType);
    return `
      <section class="fd-reader-full-page-panel fd-reader-full-page-${esc(pageType)} fd-d3-full-panel" data-dev-region="ReaderExpandedPanel" aria-label="${esc(title)}大半屏控制窗">
        <button class="fd-reader-full-grabber" type="button" data-route="${esc(collapseRoute)}" data-route-replace data-d3-layer-down="2" aria-label="收起到阅读控制层"></button>
        <header class="fd-reader-full-head">
          <span>${icon(iconName, "fd-small-icon")}<strong>${esc(title)}</strong></span>
          <button type="button" data-route="${esc(collapseRoute)}" data-route-replace data-d3-layer-down="2">收起</button>
        </header>
        <div class="fd-reader-full-content">
          ${contentHtml}
        </div>
      </section>`;
  }

  // L3 完整目录页
  function d3FullDirectoryPage(data, appState) {
    var chapters = d3Chapters(data);
    var listHtml = chapters.map(function(chapter, index) {
      return `<article class="fd-reader-full-toc-row${index === 0 ? " is-current" : ""}" role="button" tabindex="0" data-reader-directory-index="${esc(index)}">
        <strong>${esc(chapter.title)}</strong>
      </article>`;
    }).join("");
    return `
      <section class="fd-reader-full-section fd-reader-full-directory" aria-label="完整目录">
        <div class="fd-reader-full-toc-switch-row">
          <button class="is-active" type="button" data-d3-toc-mode="chapter">章节</button>
          <button type="button" data-d3-toc-mode="bookmark">书签</button>
        </div>
        <div class="fd-reader-full-toc-list">
          ${listHtml}
        </div>
      </section>`;
  }

  // L3 完整 TTS 页
  function d3FullTtsPage(data, appState) {
    var tts = (appState && appState.readerTts) || {};
    var options = {
      speed: ["0.8x", "1.0x", "1.2x", "1.5x", "2.0x"],
      voice: ["标准女声", "标准男声", "温柔女声", "沉稳男声"],
      scope: ["本章", "全书", "书签"],
      timer: ["关闭", "5分钟", "10分钟", "15分钟", "30分钟"]
    };
    var defaults = { speed: "1.0x", voice: "标准女声", scope: "本章", timer: "关闭" };
    var current = function(key) { return tts[key] || defaults[key]; };
    return `
      <section class="fd-reader-full-section fd-reader-full-tts" aria-label="完整朗读控制">
        <section class="fd-reader-full-playback">
          <button type="button" data-reader-tts-action="prev" aria-label="上一句">${icon("chevron-left", "fd-small-icon")}</button>
          <button class="is-primary ${tts.playing ? "is-playing" : ""}" type="button" data-reader-tts-action="toggle" aria-label="${tts.playing ? "暂停朗读" : "开始朗读"}">${icon(tts.playing ? "pause" : "play", "fd-medium-icon")}</button>
          <button type="button" data-reader-tts-action="next" aria-label="下一句">${icon("chevron", "fd-small-icon")}</button>
        </section>
        ${["speed", "voice", "scope", "timer"].map(function(key) {
          var label = { speed: "语速", voice: "音色", scope: "朗读范围", timer: "定时关闭" }[key];
          return `
            <section class="fd-reader-full-setting-block">
              <header><strong>${esc(label)}</strong><em>${esc(current(key))}</em></header>
              <div class="fd-reader-full-choice-grid">
                ${options[key].map(function(value) {
                  return `<button class="${value === current(key) ? "is-active" : ""}" type="button" data-reader-tts-option="${esc(key)}" data-reader-tts-value="${esc(value)}">${esc(value)}</button>`;
                }).join("")}
              </div>
            </section>`;
        }).join("")}
      </section>`;
  }

  // L3 完整设置页
  function d3FullSettingsPage(data, appState) {
    var settings = (appState && appState.readerSettings) || {};
    var toggles = [
      { key: "autoPage", label: "自动翻页", icon: "refresh" },
      { key: "volumePage", label: "音量键翻页", icon: "volume" },
      { key: "landscapeLock", label: "横屏锁定", icon: "permission" },
      { key: "keepScreenOn", label: "屏幕常亮", icon: "sun" },
      { key: "hideStatusBar", label: "隐藏状态栏", icon: "viewport" },
      { key: "statusInfo", label: "页脚进度信息", icon: "progress" },
      { key: "tapToTurn", label: "点击翻页", icon: "reader-content-search" }
    ];
    var pageTurnModes = ["平滑", "仿真", "滑动", "无动画"];
    var currentMode = settings.pageTurnMode || "平滑";
    return `
      <section class="fd-reader-full-section fd-reader-full-settings" aria-label="完整阅读设置">
        <section class="fd-reader-full-setting-block">
          <header><strong>翻页方式</strong></header>
          <div class="fd-reader-full-choice-grid">
            ${pageTurnModes.map(function(mode) {
              return `<button class="${mode === currentMode ? "is-active" : ""}" type="button" data-reader-setting-option="pageTurnMode" data-reader-setting-value="${esc(mode)}">${esc(mode)}</button>`;
            }).join("")}
          </div>
        </section>
        <section class="fd-reader-full-setting-block">
          <header><strong>阅读开关</strong></header>
          <div class="fd-reader-full-toggle-list">
            ${toggles.map(function(item) {
              var enabled = Boolean(settings[item.key]);
              return `<button class="fd-reader-setting-row" type="button" data-reader-setting-toggle="${esc(item.key)}">
                <i>${icon(item.icon, "fd-small-icon")}</i>
                <strong>${esc(item.label)}</strong>
                <span class="fd-settings-switch${enabled ? " is-on" : ""}" aria-hidden="true"><i></i></span>
              </button>`;
            }).join("")}
          </div>
        </section>
      </section>`;
  }

  // ===========================================================================
  // 互斥控制
  // ===========================================================================

  // 互斥规则：keyboard/sheet/dialog/module panel 同时只允许一个活跃
  function ensureMutualExclusion(newModule) {
    // 如果当前有 overlay 活跃（keyboard/sheet/dialog），先关闭
    if (d3ControlLayerState.overlayActive && d3ControlLayerState.overlayActive !== newModule) {
      d3ControlLayerState.overlayActive = null;
    }
    // 如果当前有其他模块活跃，先关闭
    if (d3ControlLayerState.activeModule && d3ControlLayerState.activeModule !== newModule) {
      d3ControlLayerState.activeModule = null;
    }
    d3ControlLayerState.overlayActive = "sheet";
  }

  // 模块切换（重复点击关闭）
  function toggleModule(moduleType) {
    if (d3ControlLayerState.activeModule === moduleType) {
      // 已激活，再次点击则关闭，回到 L1
      d3ControlLayerState.activeModule = null;
      d3ControlLayerState.currentLayer = 1;
      return { layer: 1, module: null };
    }
    // 打开新模块
    ensureMutualExclusion(moduleType);
    d3ControlLayerState.activeModule = moduleType;
    d3ControlLayerState.currentLayer = 2;
    return { layer: 2, module: moduleType };
  }

  // TTS 和自动翻页互斥
  function setTTSActive(active) {
    if (active && d3ControlLayerState.autoPageActive) {
      setAutoPageActive(false); // 启动 TTS 时停止 auto-page
    }
    d3ControlLayerState.ttsActive = active;
  }

  function setAutoPageActive(active) {
    if (active && d3ControlLayerState.ttsActive) {
      setTTSActive(false); // 启动 auto-page 时停止 TTS
    }
    d3ControlLayerState.autoPageActive = active;
  }

  // 系统返回逐层收起（L3→L2→L1→L0）
  function handleSystemBack() {
    var current = d3ControlLayerState.currentLayer;
    if (current === 3) {
      d3ControlLayerState.currentLayer = 2;
      return { layer: 2 };
    }
    if (current === 2) {
      d3ControlLayerState.currentLayer = 1;
      d3ControlLayerState.activeModule = null;
      return { layer: 1 };
    }
    if (current === 1) {
      d3ControlLayerState.currentLayer = 0;
      return { layer: 0 };
    }
    // L0 — 退出阅读器
    return { layer: -1 };
  }

  // ===========================================================================
  // 辅助函数
  // ===========================================================================

  function d3Chapters(data) {
    var toc = (data && data.reader && data.reader.toc) || [];
    if (Array.isArray(toc) && toc.length > 0) return toc;
    return [
      { title: "第 31 章 暮色" },
      { title: "第 32 章 雨夜" },
      { title: "第 33 章 灯塔" },
      { title: "第 34 章 晨光" },
      { title: "第 35 章 远行" },
      { title: "第 36 章 归途" },
      { title: "第 37 章 星河" },
      { title: "第 38 章 余火" }
    ];
  }

  function d3ModuleLabel(type) {
    var found = D3_MODULES.filter(function(m) { return m.type === type; })[0];
    return found ? found.label : "设置";
  }

  function d3ModuleIcon(type) {
    var found = D3_MODULES.filter(function(m) { return m.type === type; })[0];
    return found ? found.icon : "settings";
  }

  function d3FullRouteForModule(type) {
    var found = D3_MODULES.filter(function(m) { return m.type === type; })[0];
    return found ? found.fullRoute : null;
  }

  function d3ModuleRouteForType(type) {
    var found = D3_MODULES.filter(function(m) { return m.type === type; })[0];
    return found ? found.route : "reader";
  }

  // ===========================================================================
  // 集成映射：route → renderer 函数名
  // ===========================================================================

  var INTEGRATION_MAP = {
    // 概念路由（motion policy 层级，不实际触发，但保留映射）
    "reader-control-show": "readerControlShowV2",
    "reader-control-hide": "readerControlHideV2",
    "reader-module-switch": "readerModuleSwitchV2",

    // L1 基础控制层
    "control-layer-base-v2": "readerControlShowV2",

    // 真实 L2/L3 路由统一由 render-runtime 的共享 ReaderShell 渲染。
    // D3 仅保留概念层动效映射，避免完整页与快捷栏切换时重建整壳。
  };

  // ===========================================================================
  // L1 渲染函数
  // ===========================================================================

  function readerControlShowV2(data, appState) {
    return renderL1BasicControl(data, appState);
  }

  function readerControlHideV2(data, appState) {
    // 隐藏控制层，回到 L0 沉浸层
    return renderL0Immersive(data, appState);
  }

  function readerModuleSwitchV2(data, appState) {
    // 模块切换（根据 appState.readerD3Module 决定）
    var moduleType = (appState && appState.readerD3Module) || "directory";
    var result = toggleModule(moduleType);
    if (result.layer === 1) {
      return renderL1BasicControl(data, appState);
    }
    return renderL2ModulePanel(data, appState, result.module);
  }

  // ===========================================================================
  // L2 渲染函数（7 个 overlay 增强）
  // ===========================================================================

  function readerDirectoryOverlayV2Enhanced(data, appState) {
    return renderL2ModulePanel(data, appState, "directory");
  }

  function readerAppearanceOverlayV2Enhanced(data, appState) {
    return renderL2ModulePanel(data, appState, "appearance");
  }

  function readerTtsOverlayV2Enhanced(data, appState) {
    return renderL2ModulePanel(data, appState, "tts");
  }

  function readerSettingsOverlayV2Enhanced(data, appState) {
    return renderL2ModulePanel(data, appState, "settings");
  }

  function readerAutoScrollOverlayV2Enhanced(data, appState) {
    return renderL2ModulePanel(data, appState, "autoPage");
  }

  function readerSearchOverlayV2Enhanced(data, appState) {
    return renderL2ModulePanel(data, appState, "search");
  }

  function readerReplaceOverlayV2Enhanced(data, appState) {
    return renderL2ModulePanel(data, appState, "replace");
  }

  // ===========================================================================
  // L3 渲染函数
  // ===========================================================================

  function readerFullDirectoryV3(data, appState) {
    return renderL3FullControl(data, appState, "directory");
  }

  function readerFullTtsV3(data, appState) {
    return renderL3FullControl(data, appState, "tts");
  }

  function readerFullSettingsV3(data, appState) {
    return renderL3FullControl(data, appState, "settings");
  }

  // ===========================================================================
  // 路由分发主入口（render-runtime.js dispatch hook 调用）
  // 返回 null/空字符串表示该路由不属于 D3 模块
  // ===========================================================================

  function renderD3Route(route, data, appState) {
    var fnName = INTEGRATION_MAP[route];
    if (!fnName) return null;
    var fn = d3Exports[fnName];
    if (typeof fn !== "function") return null;
    return fn(data, appState);
  }

  // ===========================================================================
  // 暴露 API
  // ===========================================================================

  var d3Exports = {
    // 路由分发主入口
    renderD3Route: renderD3Route,
    // 集成映射
    INTEGRATION_MAP: INTEGRATION_MAP,
    // D3 控制层状态
    state: d3ControlLayerState,
    // L0-L3 层级渲染函数
    renderL0Immersive: renderL0Immersive,
    renderL1BasicControl: renderL1BasicControl,
    renderL2ModulePanel: renderL2ModulePanel,
    renderL3FullControl: renderL3FullControl,
    // L1 渲染函数
    readerControlShowV2: readerControlShowV2,
    readerControlHideV2: readerControlHideV2,
    readerModuleSwitchV2: readerModuleSwitchV2,
    // L2 渲染函数（7 个 overlay 增强）
    readerDirectoryOverlayV2Enhanced: readerDirectoryOverlayV2Enhanced,
    readerAppearanceOverlayV2Enhanced: readerAppearanceOverlayV2Enhanced,
    readerTtsOverlayV2Enhanced: readerTtsOverlayV2Enhanced,
    readerSettingsOverlayV2Enhanced: readerSettingsOverlayV2Enhanced,
    readerAutoScrollOverlayV2Enhanced: readerAutoScrollOverlayV2Enhanced,
    readerSearchOverlayV2Enhanced: readerSearchOverlayV2Enhanced,
    readerReplaceOverlayV2Enhanced: readerReplaceOverlayV2Enhanced,
    // L3 渲染函数
    readerFullDirectoryV3: readerFullDirectoryV3,
    readerFullTtsV3: readerFullTtsV3,
    readerFullSettingsV3: readerFullSettingsV3,
    // 互斥控制
    ensureMutualExclusion: ensureMutualExclusion,
    toggleModule: toggleModule,
    setTTSActive: setTTSActive,
    setAutoPageActive: setAutoPageActive,
    handleSystemBack: handleSystemBack,
    // 辅助
    esc: esc,
    icon: icon
  };

  window.ReaderD3ControlLayersRenderers = d3Exports;
})(window);
