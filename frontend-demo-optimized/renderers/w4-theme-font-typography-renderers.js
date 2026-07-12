/**
 * W4 主题、字体与排版工作流 renderer 函数模块
 * ------------------------------------------------------------------------
 * 覆盖路由（13 个）：
 *   schema-only 确认对话框/状态（6 个）
 *     reader-font-import-confirm / reader-font-delete-confirm / reader-font-fallback
 *     reader-theme-new / reader-theme-delete-confirm / reader-typography-reset-confirm
 *   scaffold 完整路由（5 个，L3 控制页）
 *     reader-full-appearance / reader-full-font / reader-full-theme
 *     reader-full-theme-edit / reader-full-layout
 *   共享 renderer 独立化（2 个，L2 面板）
 *     reader-appearance / reader-appearance-overlay-v2
 *
 * 关键约束：
 *   - 不编辑 render-runtime.js，仅在本模块内提供 renderer
 *   - L3 控制页统一使用 ReaderShell，保持阅读上下文，不重建正文
 *   - 字体/主题/排版配置通过 localStorage 模拟持久化（key 前缀 reader-w4-）
 *   - 确认对话框采用 overlay 模式，不离开当前页
 *   - 6 个默认主题（日间/夜间/纸纹/暖白/青绿/雾蓝）在主题列表中可见
 *
 * 集成映射（INTEGRATION_MAP）：
 *   reader-font-import-confirm      → readerFontImportConfirmScreen
 *   reader-font-delete-confirm      → readerFontDeleteConfirmScreen
 *   reader-font-fallback            → readerFontFallbackScreen
 *   reader-theme-new                → readerThemeNewScreen
 *   reader-theme-delete-confirm     → readerThemeDeleteConfirmScreen
 *   reader-typography-reset-confirm → readerTypographyResetConfirmScreen
 *   reader-full-appearance          → readerFullAppearanceScreen
 *   reader-full-font                → readerFullFontScreen
 *   reader-full-theme               → readerFullThemeScreen
 *   reader-full-theme-edit          → readerFullThemeEditScreen
 *   reader-full-layout              → readerFullLayoutScreen
 *   reader-appearance               → readerAppearanceScreen
 *   reader-appearance-overlay-v2    → readerAppearanceOverlayV2Screen
 */
(function attachReaderW4ThemeFontTypographyRenderers(window) {
  "use strict";

  // ===== 依赖 =====
  // 通过 window.ReaderShellKit 获取 shell 渲染能力与基础工具
  function shellKit() {
    if (!window.ReaderShellKit) {
      throw new Error("ReaderShellKit is required before w4-theme-font-typography-renderers.js");
    }
    return window.ReaderShellKit;
  }

  function esc(value) {
    return shellKit().esc(value);
  }

  function icon(name, className) {
    return shellKit().icon(name, className || "fd-icon");
  }

  function chevron() {
    return icon("chevron", "fd-inline-chevron");
  }

  // 路由元数据（用于标题）
  const routeContract = window.ReaderFrontendDemoDraftRouteContract || {};
  const routes = routeContract.routes || {};

  function routeTitle(route) {
    return String((routes[route] && routes[route].title) || route).replace(/（.*$/, "").trim();
  }

  // ===== 持久化（localStorage 模拟）=====
  // 所有 key 统一加 reader-w4- 前缀，避免与其它模块冲突
  const STORAGE_PREFIX = "reader-w4-";

  function w4Get(key, fallback) {
    try {
      const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function w4Set(key, value) {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      // localStorage 不可用时静默降级（无痕模式等）
    }
  }

  function w4Remove(key) {
    try {
      window.localStorage.removeItem(STORAGE_PREFIX + key);
    } catch (e) {
      // 静默降级
    }
  }

  // ===== 8 个默认主题 =====
  function w4DefaultThemes() {
    return [
      { value: "day", label: "日间", scheme: "day", texture: "plain", textureOpacity: 0, textureRgb: "138 116 84", swatch: "#ffffff", bg: "#ffffff", ink: "#332c25", control: "#2f6373", pair: "night", system: true },
      { value: "warm", label: "暖白", scheme: "day", texture: "plain", textureOpacity: 0, textureRgb: "138 116 84", swatch: "#fbf0df", bg: "#fff6e9", ink: "#2c241d", control: "#2f6373", pair: "warm-night", system: true },
      { value: "night", label: "夜间", scheme: "night", texture: "plain", textureOpacity: 0, textureRgb: "222 202 174", swatch: "#26231f", bg: "#26231f", ink: "#eadfce", control: "#7a684f", pair: "day", system: true },
      { value: "warm-night", label: "暖夜", scheme: "night", texture: "plain", textureOpacity: 0, textureRgb: "222 202 174", swatch: "#302922", bg: "#302922", ink: "#eadfce", control: "#8a7656", pair: "warm", system: true },
      { value: "paper", label: "纸纹", scheme: "day", texture: "paper", textureOpacity: 0.034, textureRgb: "138 116 84", swatch: "#f5ead8", bg: "#fff7ec", ink: "#2b241d", control: "#2f6373", pair: "paper-night", system: true },
      { value: "green", label: "青叶纹", scheme: "day", texture: "paper", textureOpacity: 0.03, textureRgb: "92 126 86", swatch: "#e7f0e2", bg: "#eef5e8", ink: "#263423", control: "#2f6373", pair: "green-night", system: true },
      { value: "paper-night", label: "夜纹", scheme: "night", texture: "paper", textureOpacity: 0.026, textureRgb: "222 202 174", swatch: "#34302b", bg: "#34302b", ink: "#eadfce", control: "#8a7656", pair: "paper", system: true },
      { value: "green-night", label: "林夜纹", scheme: "night", texture: "paper", textureOpacity: 0.024, textureRgb: "154 184 142", swatch: "#263129", bg: "#263129", ink: "#dbe7d7", control: "#79906f", pair: "green", system: true }
    ];
  }

  // 获取全部主题（默认 + 自定义）
  function w4AllThemes() {
    const defaults = w4DefaultThemes();
    const custom = w4Get("custom-themes", []);
    return defaults.concat(custom);
  }

  // 当前生效主题
  function w4CurrentTheme(data, appState) {
    const themes = w4AllThemes();
    const value = appState?.readerTheme || w4Get("active-theme", data?.reader?.themeDefault || "paper");
    return themes.find((t) => t.value === value) || themes[0];
  }

  // ===== 主题样式生成（CSS 变量串）=====
  function w4ThemeStyle(data, appState) {
    const theme = w4CurrentTheme(data, appState);
    const isNight = theme.scheme === "night";
    const textureOpacity = Number.isFinite(Number(theme.textureOpacity)) ? Number(theme.textureOpacity) : 0;
    const textureRgb = theme.textureRgb || (isNight ? "222 202 174" : "138 116 84");
    return [
      `--reader-bg:${esc(theme.bg)}`,
      `--reader-ink:${esc(theme.ink)}`,
      `--reader-control:${esc(theme.control || "#2f6373")}`,
      `--reader-surface:${isNight ? "rgba(38, 35, 31, 0.96)" : "rgba(255, 250, 244, 0.98)"}`,
      `--reader-panel:${isNight ? "rgba(46, 42, 37, 0.82)" : "rgba(255, 252, 248, 0.62)"}`,
      `--reader-line:${isNight ? "rgba(226, 209, 185, 0.16)" : "rgba(155, 132, 102, 0.18)"}`,
      `--reader-muted:${isNight ? "#baad9c" : "#5b5046"}`,
      `--reader-primary:${isNight ? "#7a684f" : "#2f6373"}`,
      `--reader-texture-opacity:${textureOpacity}`,
      `--reader-texture-rgb:${textureRgb}`
    ].join(";");
  }

  // ===== 排版数据 =====
  function w4NormalizeTypography(data) {
    const t = (data?.reader && data.reader.typography) || {};
    const stored = w4Get("typography", null);
    if (stored) return stored;
    return {
      fontSize: Number.isFinite(Number(t.fontSize)) ? Number(t.fontSize) : 18,
      lineHeight: Number.isFinite(Number(t.lineHeight)) ? Number(t.lineHeight) : 1.96,
      paragraphGap: Number.isFinite(Number(t.paragraphGap)) ? Number(t.paragraphGap) : 16,
      letterSpacing: Number.isFinite(Number(t.letterSpacing)) ? Number(t.letterSpacing) : 0,
      fontFamily: t.fontFamily || "serif",
      alignment: "left",
      firstLineIndent: true,
      pageMode: "horizontal",
      pageAnimation: "smooth",
      topMargin: 72,
      sideMargin: 32,
      bottomMargin: 72,
      texture: "plain"
    };
  }

  function w4TypographyConfig(data) {
    const c = data?.reader?.typographyConfig || {};
    const norm = (item, fb) => ({
      min: Number.isFinite(Number(item?.min)) ? Number(item.min) : fb.min,
      max: Number.isFinite(Number(item?.max)) ? Number(item.max) : fb.max,
      step: Number.isFinite(Number(item?.step)) ? Number(item.step) : fb.step,
      precision: Number.isFinite(Number(item?.precision)) ? Number(item.precision) : fb.precision
    });
    return {
      fontSize: norm(c.fontSize, { min: 14, max: 26, step: 1, precision: 0 }),
      lineHeight: norm(c.lineHeight, { min: 1.4, max: 2.4, step: 0.08, precision: 2 }),
      paragraphGap: norm(c.paragraphGap, { min: 4, max: 32, step: 2, precision: 0 }),
      letterSpacing: norm(c.letterSpacing, { min: 0, max: 2, step: 0.2, precision: 1 }),
      topMargin: norm(null, { min: 48, max: 96, step: 4, precision: 0 }),
      sideMargin: norm(null, { min: 20, max: 48, step: 4, precision: 0 }),
      bottomMargin: norm(null, { min: 48, max: 96, step: 4, precision: 0 })
    };
  }

  function w4TypographyStyle(data, typography) {
    const safe = typography || w4NormalizeTypography(data);
    const fontStack = w4ActiveFont(data).fontStack || "var(--fd-serif)";
    return [
      `--reader-font-size:${esc(safe.fontSize)}px`,
      `--reader-line-height:${esc(safe.lineHeight)}`,
      `--reader-paragraph-gap:${esc(safe.paragraphGap)}px`,
      `--reader-letter-spacing:${esc(safe.letterSpacing)}px`,
      `--reader-font-family:${esc(fontStack)}`
    ].join(";");
  }

  // ===== 字体数据 =====
  function w4SystemFonts(data) {
    const options = data?.reader?.fontOptions;
    return Array.isArray(options) && options.length > 0
      ? options
      : [
        { label: "系统", value: "system", fontStack: "system-ui, -apple-system, sans-serif" },
        { label: "宋体", value: "serif", fontStack: "var(--fd-serif)" },
        { label: "黑体", value: "sans", fontStack: "var(--fd-sans)" },
        { label: "楷体", value: "kai", fontStack: '"Kaiti SC", "KaiTi", serif' },
        { label: "仿宋", value: "fangsong", fontStack: '"FangSong", "STFangsong", serif' }
      ];
  }

  // 导入字体初始演示数据（首次加载时填充，让列表非空）
  function w4DefaultImportedFonts() {
    return [
      { id: "imp-source-serif", label: "思源宋体", value: "source-han-serif", fontStack: '"Noto Serif SC", serif', system: false, fileSize: "8.2 MB", format: "ttf", enabled: true, inUse: false },
      { id: "imp-lxgw-wenkai", label: "霞鹜文楷", value: "lxgw-wenkai", fontStack: '"LXGW WenKai", serif', system: false, fileSize: "5.6 MB", format: "otf", enabled: false, inUse: false }
    ];
  }

  function w4ImportedFonts() {
    return w4Get("imported-fonts", w4DefaultImportedFonts());
  }

  function w4AllFonts(data) {
    const fonts = w4SystemFonts(data).map((f) => Object.assign({}, f, { system: true })).concat(w4ImportedFonts());
    const order = w4Get("font-order", []);
    if (!Array.isArray(order) || order.length === 0) return fonts;
    return fonts.slice().sort((a, b) => {
      const ai = order.indexOf(a.value);
      const bi = order.indexOf(b.value);
      return (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi);
    });
  }

  function w4ActiveFont(data) {
    const typography = w4NormalizeTypography(data);
    const fonts = w4AllFonts(data);
    return fonts.find((f) => f.value === typography.fontFamily) || fonts[0];
  }

  // ===== 亮度样式 =====
  function w4BrightnessStyle(data, appState) {
    const brightness = data?.reader?.brightness || {};
    const config = brightness.config || { min: 20, max: 100, defaultValue: 80 };
    const value = Number.isFinite(Number(appState?.readerBrightness))
      ? Number(appState.readerBrightness)
      : (brightness.defaultValue || config.defaultValue || 80);
    return `--brightness:${esc(value)}%`;
  }

  // ===== 运行时共享阅读片段 =====
  // W4 只负责完整控制页/弹窗自身。正文、顶栏、主题、分页和全局状态层必须
  // 复用主运行时的同一份渲染结果，避免进入 W4 路由时产生几何或内容漂移。
  function w4RuntimeSharedFragments() {
    return window.ReaderRuntimeSharedFragments || null;
  }

  function w4SharedFragment(method, data, appState, fallback) {
    const shared = w4RuntimeSharedFragments();
    if (shared && typeof shared[method] === "function") {
      const value = shared[method](data, appState);
      if (typeof value === "string") return value;
    }
    return fallback();
  }

  function w4SharedFrameStyle(data, appState) {
    return w4SharedFragment("frameStyle", data, appState, () => w4ThemeStyle(data, appState));
  }

  function w4SharedSurfaceHtml(data, appState) {
    return w4SharedFragment("surfaceHtml", data, appState, () => w4ReaderSurface(data, appState));
  }

  function w4SharedTopOverlayHtml(data, appState) {
    return w4SharedFragment("topOverlayHtml", data, appState, () => w4ReaderTopOverlay(data, appState));
  }

  function w4SharedStateHostHtml(data, appState) {
    return w4SharedFragment(
      "stateHostHtml",
      data,
      appState,
      () => `<div class="fd-reader-global-brightness-dim" data-reader-brightness-dim aria-hidden="true" style="${w4BrightnessStyle(data, appState)}"></div>`
    );
  }

  function w4SharedBrightnessRailHtml(data, appState) {
    return w4SharedFragment("brightnessRailHtml", data, appState, () => "");
  }

  function w4PageModeClass(appState) {
    return appState?.readerPageMode === "vertical"
      ? " fd-reader-page-mode-vertical"
      : " fd-reader-page-mode-horizontal";
  }

  // ===== 阅读正文表面（L3 控制页保持上下文）=====
  // 轻量版正文层：只渲染前几段，保持上下文但不重建完整分页
  function w4ReaderSurface(data, appState) {
    const typography = w4NormalizeTypography(data);
    const paragraphs = (data?.reader?.readingText || ["雨，下了一整夜。"]).slice(0, 3);
    const chapterTitle = data?.reader?.chapterMeta
      ? `${data.reader.chapterMeta} ${data.reader.chapterTitle || ""}`.trim()
      : "第 32 章 雨夜";
    return `
      <div class="fd-ir-background-layer" aria-hidden="true" style="${w4ThemeStyle(data, appState)}"></div>
      <article class="fd-ir-reading-layer" aria-label="正文排版层" style="${w4ThemeStyle(data, appState)};${w4TypographyStyle(data, typography)};--reader-top-margin:${esc(typography.topMargin)}px;--reader-side-margin:${esc(typography.sideMargin)}px">
        <h1>${esc(chapterTitle)}</h1>
        ${paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}
      </article>
      <div class="fd-reader-brightness-dim" data-reader-brightness-dim aria-hidden="true" style="${w4BrightnessStyle(data, appState)}"></div>`;
  }

  // ===== 顶部栏 =====
  function w4ReaderTopOverlay(data, appState) {
    return `
      <section class="fd-reader-top" data-dev-region="ReaderTopBar">
        <button type="button" aria-label="返回" data-reader-exit>${icon("back", "fd-icon")}</button>
        <span><strong>${esc(data?.reader?.title || "长夜余火")}</strong><small>${esc(data?.reader?.sourceLine || "第 32 章 雨夜 · 优书网")}</small></span>
        <button type="button" aria-label="更多">${icon("more", "fd-small-icon")}</button>
      </section>`;
  }

  // ===== 通用 L3 控制页 panel（大半屏控制窗）=====
  function w4FullPagePanel(data, appState, route, title, iconName, contentHtml) {
    return `
      <section class="fd-reader-full-page-panel fd-reader-full-page-appearance fd-reader-full-page-route-${esc(route)}" data-dev-region="ReaderExpandedPanel" aria-label="${esc(title)}大半屏控制窗">
        <button class="fd-reader-full-grabber" type="button" data-route="reader-appearance" data-route-replace aria-label="收起到阅读控制层"></button>
        <header class="fd-reader-full-head">
          <span>${icon(iconName || "appearance", "fd-small-icon")}<strong>${esc(title)}</strong></span>
          <button type="button" data-route="reader-appearance" data-route-replace>收起</button>
        </header>
        <div class="fd-reader-full-content">
          ${contentHtml}
        </div>
      </section>`;
  }

  const W4_FULL_PAGE_ROUTES = new Set([
    "reader-full-appearance",
    "reader-full-font",
    "reader-full-theme",
    "reader-full-theme-edit",
    "reader-full-layout"
  ]);

  function w4HasRecordedOverlayOrigin(appState) {
    return W4_FULL_PAGE_ROUTES.has(appState?.w4OverlayOriginRoute || "");
  }

  function w4OverlayOriginRoute(appState, fallbackRoute) {
    return w4HasRecordedOverlayOrigin(appState)
      ? appState.w4OverlayOriginRoute
      : fallbackRoute;
  }

  // 正常交互从来源页 push 进入弹窗，关闭时只 pop 一次；直接 capture 弹窗
  // 没有历史来源，此时才 replace 到明确的 fallback，避免制造重复返回栈。
  function w4OverlayNavigationAttrs(appState, fallbackRoute) {
    return w4HasRecordedOverlayOrigin(appState)
      ? "data-route-back"
      : `data-route="${esc(fallbackRoute)}" data-route-replace`;
  }

  function w4FullPageDescriptor(route, data, appState) {
    switch (route) {
      case "reader-full-font":
        return { title: routeTitle(route), iconName: "font", bodyHtml: readerFullFontBody(data, appState) };
      case "reader-full-theme":
        return { title: routeTitle(route), iconName: "palette", bodyHtml: readerFullThemeBody(data, appState) };
      case "reader-full-theme-edit":
        return { title: routeTitle(route), iconName: "palette", bodyHtml: readerFullThemeEditBody(data, appState) };
      case "reader-full-layout":
        return { title: routeTitle(route), iconName: "typography", bodyHtml: readerFullLayoutBody(data, appState) };
      case "reader-full-appearance":
      default:
        return { title: "界面", iconName: "appearance", bodyHtml: readerFullAppearanceBody(data, appState) };
    }
  }

  function w4RenderOverlayOnOriginPage(data, appState, fallbackRoute, overlayHtml) {
    const originRoute = w4OverlayOriginRoute(appState, fallbackRoute);
    const parent = w4FullPageDescriptor(originRoute, data, appState);
    return w4RenderReaderShellWithPanel(
      data,
      appState,
      originRoute,
      parent.title,
      parent.iconName,
      parent.bodyHtml,
      overlayHtml
    );
  }

  // ===== 确认对话框 overlay（不离开当前页）=====
  function w4ConfirmDialog(options) {
    const title = options.title || "确认";
    const summary = options.summary || "";
    const detailsHtml = options.detailsHtml || "";
    const confirmLabel = options.confirmLabel || "确认";
    const cancelLabel = options.cancelLabel || "取消";
    const fallbackRoute = options.fallbackRoute || "reader-full-appearance";
    const navigationAttrs = w4OverlayNavigationAttrs(options.appState, fallbackRoute);
    const tone = options.tone === "danger" ? " is-danger" : "";
    const confirmTone = options.tone === "danger" ? " is-danger" : " is-primary";
    return `
      <div class="fd-reader-confirm-overlay fd-w4-confirm-overlay" data-w4-confirm-overlay>
        <button class="fd-reader-confirm-backdrop" type="button" ${navigationAttrs} aria-label="取消"></button>
        <section class="fd-reader-confirm-dialog${tone}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
          <h2>${esc(title)}</h2>
          ${summary ? `<p>${esc(summary)}</p>` : ""}
          ${detailsHtml}
          <div class="fd-reader-confirm-actions">
            <button class="is-cancel" type="button" ${navigationAttrs}>${esc(cancelLabel)}</button>
            <button class="${confirmTone.trim()}" type="button" ${navigationAttrs} data-w4-confirm="${esc(options.confirmAction || "")}">${esc(confirmLabel)}</button>
          </div>
        </section>
      </div>`;
  }

  // ====================================================================
  // 1. reader-font-import-confirm：字体导入确认
  // 显示字体文件信息 + 校验结果 + 确认导入
  // ====================================================================
  function readerFontImportConfirmScreen(data, appState) {
    const title = routeTitle("reader-font-import-confirm");
    // 模拟待导入字体信息
    const pendingFont = w4Get("pending-font-import", {
      label: "方正书宋",
      value: "fangzheng-shusong",
      fileSize: "12.4 MB",
      format: "ttf",
      checksum: "a3f9c2e1",
      valid: true,
      validationNote: "字形完整 · 字符覆盖 21,884 字 · 符合导入规范"
    });
    const detailRows = [
      ["文件名", `${pendingFont.label}.${pendingFont.format || "ttf"}`],
      ["大小", pendingFont.fileSize || "—"],
      ["格式", (pendingFont.format || "ttf").toUpperCase()],
      ["校验码", pendingFont.checksum || "—"],
      ["校验结果", pendingFont.valid ? "通过" : "未通过"],
      ["备注", pendingFont.validationNote || "—"]
    ];
    const detailsHtml = `
      <dl class="fd-w4-confirm-detail">
        ${detailRows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}
      </dl>`;
    const contentHtml = w4ConfirmDialog({
      title: title || "导入字体",
      summary: "将导入以下字体文件到本地字体库，导入后可在字体管理中启用。",
      detailsHtml,
      confirmLabel: "确认导入",
      cancelLabel: "取消",
      appState,
      fallbackRoute: "reader-full-font",
      confirmAction: "font-import"
    });
    return w4RenderOverlayOnOriginPage(data, appState, "reader-full-font", contentHtml);
  }

  // ====================================================================
  // 2. reader-font-delete-confirm：字体删除确认
  // 显示"正在使用该字体"警告 + 确认删除
  // ====================================================================
  function readerFontDeleteConfirmScreen(data, appState) {
    const title = routeTitle("reader-font-delete-confirm");
    const fonts = w4AllFonts(data);
    const activeFont = w4ActiveFont(data);
    // 待删除字体（默认取第一个导入字体，可被 appState 覆盖）
    const targetId = appState?.w4PendingFontId || fonts.find((f) => !f.system)?.id || "";
    const target = fonts.find((f) => f.id === targetId) || fonts.find((f) => !f.system) || fonts[0];
    const inUse = activeFont.value === target.value;
    const detailsHtml = `
      <dl class="fd-w4-confirm-detail">
        <div><dt>字体名称</dt><dd>${esc(target.label)}</dd></div>
        <div><dt>来源</dt><dd>${target.system ? "系统" : "导入"}</dd></div>
        ${target.fileSize ? `<div><dt>大小</dt><dd>${esc(target.fileSize)}</dd></div>` : ""}
      </dl>
      ${inUse ? `<p class="fd-w4-confirm-warning">${icon("warning", "fd-small-icon")}该字体正在被正文使用，删除后将自动回退到默认字体。</p>` : ""}`;
    const contentHtml = w4ConfirmDialog({
      title: title || "删除字体",
      summary: `确认删除字体「${target.label}」？删除后不可恢复。`,
      detailsHtml,
      confirmLabel: "确认删除",
      cancelLabel: "取消",
      appState,
      fallbackRoute: "reader-full-font",
      tone: "danger",
      confirmAction: "font-delete"
    });
    return w4RenderOverlayOnOriginPage(data, appState, "reader-full-font", contentHtml);
  }

  // ====================================================================
  // 3. reader-font-fallback：字体失效回退提示
  // 显示"字体不可用，已回退到默认字体"
  // ====================================================================
  function readerFontFallbackScreen(data, appState) {
    const title = routeTitle("reader-font-fallback");
    const activeFont = w4ActiveFont(data);
    const fallbackFont = w4SystemFonts(data)[0] || { label: "系统" };
    const closeAttrs = w4OverlayNavigationAttrs(appState, "reader");
    const bannerHtml = `
      <div class="fd-reader-confirm-overlay fd-w4-fallback-overlay" data-w4-font-fallback>
        <button class="fd-reader-confirm-backdrop" type="button" ${closeAttrs} aria-label="关闭提示"></button>
        <section class="fd-reader-confirm-dialog fd-w4-fallback-dialog" role="alertdialog" aria-modal="true" aria-label="${esc(title)}">
          <h2>${icon("warning", "fd-medium-icon")}字体不可用</h2>
          <p>字体「${esc(activeFont.label)}」无法加载或已失效，已自动回退到默认字体「${esc(fallbackFont.label)}」。</p>
          <dl class="fd-w4-confirm-detail">
            <div><dt>失效字体</dt><dd>${esc(activeFont.label)}（${esc(activeFont.value)}）</dd></div>
            <div><dt>回退字体</dt><dd>${esc(fallbackFont.label)}（${esc(fallbackFont.value)}）</dd></div>
          </dl>
          <div class="fd-reader-confirm-actions">
            <button class="is-primary" type="button" data-route="reader-full-font" data-route-replace>管理字体</button>
            <button class="is-cancel" type="button" ${closeAttrs}>继续阅读</button>
          </div>
        </section>
      </div>`;
    if (w4HasRecordedOverlayOrigin(appState)) {
      return w4RenderOverlayOnOriginPage(data, appState, "reader-full-font", bannerHtml);
    }
    return w4RenderReaderShellWithPanel(data, appState, "reader-font-fallback", "阅读控制层", "reader", w4ReaderControlMain(data, appState), bannerHtml);
  }

  // ====================================================================
  // 4. reader-theme-new：新建主题表单
  // 名称 + 背景色 + 文字色 + 控制层颜色
  // ====================================================================
  function readerThemeNewScreen(data, appState) {
    const title = routeTitle("reader-theme-new");
    const draft = appState?.w4ThemeDraft || w4Get("theme-new-draft", {
      name: "",
      bg: "#fff7ec",
      ink: "#2b241d",
      control: "#2f6373",
      scheme: "day",
      texture: "plain",
      textureOpacity: 0
    });
    const closeAttrs = w4OverlayNavigationAttrs(appState, "reader-full-theme");
    const formHtml = `
      <div class="fd-reader-confirm-overlay fd-w4-theme-form-overlay" data-w4-theme-new>
        <button class="fd-reader-confirm-backdrop" type="button" ${closeAttrs} aria-label="取消新建"></button>
        <section class="fd-reader-confirm-dialog fd-w4-theme-form-dialog" role="dialog" aria-modal="true" aria-label="${esc(title)}">
          <h2>${esc(title)}</h2>
          <p>填写主题信息，保存后写入自定义主题列表。</p>
          <div class="fd-w4-theme-form">
            <label class="fd-w4-field">
              <span>主题名称</span>
              <input type="text" data-w4-theme-field="name" value="${esc(draft.name)}" placeholder="如：暖光纸" maxlength="12" />
            </label>
            <label class="fd-w4-field">
              <span>背景色</span>
              <input type="color" data-w4-theme-field="bg" value="${esc(draft.bg)}" />
              <em>${esc(draft.bg)}</em>
            </label>
            <label class="fd-w4-field">
              <span>文字色</span>
              <input type="color" data-w4-theme-field="ink" value="${esc(draft.ink)}" />
              <em>${esc(draft.ink)}</em>
            </label>
            <label class="fd-w4-field">
              <span>控制层颜色</span>
              <input type="color" data-w4-theme-field="control" value="${esc(draft.control)}" />
              <em>${esc(draft.control)}</em>
            </label>
            <div class="fd-w4-field" role="radiogroup" aria-label="日夜间模式">
              <span>模式</span>
              <div class="fd-reader-full-choice-grid">
                <button class="${draft.scheme === "day" ? "is-active" : ""}" type="button" data-w4-theme-scheme="day">白天</button>
                <button class="${draft.scheme === "night" ? "is-active" : ""}" type="button" data-w4-theme-scheme="night">夜间</button>
              </div>
            </div>
            <label class="fd-w4-field">
              <span>纹理</span>
              <div class="fd-reader-full-choice-grid">
                <button class="${draft.texture === "plain" ? "is-active" : ""}" type="button" data-w4-theme-texture="plain">纯色</button>
                <button class="${draft.texture === "paper" ? "is-active" : ""}" type="button" data-w4-theme-texture="paper">纸纹</button>
              </div>
            </label>
            <label class="fd-w4-field">
              <span>纹理强度（${esc(draft.textureOpacity.toFixed(3))}）</span>
              <input type="range" min="0" max="0.08" step="0.002" value="${esc(draft.textureOpacity)}" data-w4-theme-field="textureOpacity" />
            </label>
          </div>
          <div class="fd-reader-confirm-actions">
            <button class="is-cancel" type="button" ${closeAttrs}>取消</button>
            <button class="is-primary" type="button" ${closeAttrs} data-w4-theme-save="new">保存主题</button>
          </div>
        </section>
      </div>`;
    return w4RenderOverlayOnOriginPage(data, appState, "reader-full-theme", formHtml);
  }

  // ====================================================================
  // 5. reader-theme-delete-confirm：主题删除确认
  // 显示"确认删除主题 [名称]"
  // ====================================================================
  function readerThemeDeleteConfirmScreen(data, appState) {
    const title = routeTitle("reader-theme-delete-confirm");
    const themes = w4AllThemes();
    const activeTheme = w4CurrentTheme(data, appState);
    // 待删除主题（默认取第一个自定义主题，可被 appState 覆盖）
    const targetValue = appState?.w4PendingThemeValue || themes.find((t) => !t.system)?.value || "";
    const target = themes.find((t) => t.value === targetValue) || themes.find((t) => !t.system) || themes[0];
    const inUse = activeTheme.value === target.value;
    const detailsHtml = `
      <dl class="fd-w4-confirm-detail">
        <div><dt>主题名称</dt><dd>${esc(target.label)}</dd></div>
        <div><dt>类型</dt><dd>${target.system ? "系统预设（不可删除）" : "自定义"}</dd></div>
      </dl>
      ${inUse ? `<p class="fd-w4-confirm-warning">${icon("warning", "fd-small-icon")}该主题正在使用，删除后将回退到默认主题。</p>` : ""}`;
    const contentHtml = w4ConfirmDialog({
      title: title || "删除主题",
      summary: `确认删除主题「${target.label}」？删除后不可恢复。`,
      detailsHtml,
      confirmLabel: "确认删除",
      cancelLabel: "取消",
      appState,
      fallbackRoute: "reader-full-theme",
      tone: "danger",
      confirmAction: "theme-delete"
    });
    return w4RenderOverlayOnOriginPage(data, appState, "reader-full-theme", contentHtml);
  }

  // ====================================================================
  // 6. reader-typography-reset-confirm：排版重置确认
  // 显示"确认恢复默认排版设置"
  // ====================================================================
  function readerTypographyResetConfirmScreen(data, appState) {
    const title = routeTitle("reader-typography-reset-confirm");
    const typography = w4NormalizeTypography(data);
    const config = w4TypographyConfig(data);
    const defaultTypography = {
      fontSize: data?.reader?.typography?.fontSize || 18,
      lineHeight: data?.reader?.typography?.lineHeight || 1.96,
      paragraphGap: data?.reader?.typography?.paragraphGap || 16,
      letterSpacing: data?.reader?.typography?.letterSpacing || 0,
      fontFamily: data?.reader?.typography?.fontFamily || "serif",
      alignment: "left",
      firstLineIndent: true,
      topMargin: 72,
      sideMargin: 32,
      bottomMargin: 72,
      texture: "plain"
    };
    const detailsHtml = `
      <dl class="fd-w4-confirm-detail">
        <div><dt>字号</dt><dd>${esc(typography.fontSize)}px → ${esc(defaultTypography.fontSize)}px</dd></div>
        <div><dt>行距</dt><dd>${esc(typography.lineHeight)} → ${esc(defaultTypography.lineHeight)}</dd></div>
        <div><dt>段距</dt><dd>${esc(typography.paragraphGap)}px → ${esc(defaultTypography.paragraphGap)}px</dd></div>
        <div><dt>字距</dt><dd>${esc(typography.letterSpacing)}px → ${esc(defaultTypography.letterSpacing)}px</dd></div>
        <div><dt>边距</dt><dd>${esc(typography.topMargin)}/${esc(typography.sideMargin)} → ${esc(defaultTypography.topMargin)}/${esc(defaultTypography.sideMargin)}</dd></div>
      </dl>`;
    const contentHtml = w4ConfirmDialog({
      title: title || "恢复默认排版",
      summary: "将恢复所有排版设置到默认值，自定义配置将被覆盖。",
      detailsHtml,
      confirmLabel: "恢复默认",
      cancelLabel: "取消",
      appState,
      fallbackRoute: "reader-full-layout",
      tone: "danger",
      confirmAction: "typography-reset"
    });
    return w4RenderOverlayOnOriginPage(data, appState, "reader-full-layout", contentHtml);
  }

  // ====================================================================
  // 7. reader-full-appearance：完整外观页（L3 控制页）
  // 主题选择 + 字体选择 + 排版入口
  // ====================================================================
  function readerFullAppearanceScreen(data, appState) {
    const title = "界面";
    const body = readerFullAppearanceBody(data, appState);
    return w4RenderReaderShellWithPanel(data, appState, "reader-full-appearance", title, "appearance", body, "");
  }

  function readerFullAppearanceBody(data, appState) {
    const typography = w4NormalizeTypography(data);
    const activeTheme = w4CurrentTheme(data, appState);
    const themes = w4AllThemes().slice(0, 8);
    const fonts = w4AllFonts(data);
    const defaultDayTheme = w4Get("default-day-theme", "paper");
    const defaultNightTheme = w4Get("default-night-theme", "paper-night");
    const selectOptions = (values, current) => values.map((item) => {
      const value = typeof item === "string" ? item : item.value;
      const label = typeof item === "string" ? item : item.label;
      return `<option value="${esc(value)}"${String(current) === String(value) ? " selected" : ""}>${esc(label)}</option>`;
    }).join("");
    return `
      <section class="fd-reader-full-section fd-reader-full-appearance" aria-label="完整界面设置">
        <section class="fd-reader-full-setting-block fd-reader-appearance-theme-library">
          <header><strong>主题库</strong><em>日间：${esc((themes.find((item) => item.value === defaultDayTheme) || {}).label || "纸纹")} · 夜间：${esc((themes.find((item) => item.value === defaultNightTheme) || {}).label || "夜纹")}</em></header>
          <div class="fd-reader-full-theme-grid">
            ${themes.map((item) => `
              <button class="${activeTheme.value === item.value ? "is-active" : ""}" type="button" data-reader-theme="${esc(item.value)}" data-reader-theme-scheme="${esc(item.scheme)}" data-reader-theme-texture="${esc(item.texture || "plain")}" aria-label="主题：${esc(item.label)}">
                <span style="--swatch:${esc(item.swatch)}"></span>
                <small>${esc(item.label)}</small>
              </button>
            `).join("")}
          </div>
          <div class="fd-reader-theme-default-actions">
            <button class="fd-control-button" type="button" data-ui-primitive="button" data-ui-size="sm" data-ui-variant="secondary" data-w4-theme-default-scheme="day">设为日间主题</button>
            <button class="fd-control-button" type="button" data-ui-primitive="button" data-ui-size="sm" data-ui-variant="secondary" data-w4-theme-default-scheme="night">设为夜间主题</button>
          </div>
        </section>
        <section class="fd-reader-full-setting-block fd-reader-full-typography fd-reader-appearance-typography-library">
          <header><strong>排版库</strong><em>即时应用</em></header>
          <div class="fd-reader-appearance-select-grid">
            <label><strong>缩进</strong><select class="fd-control-select" data-ui-primitive="select" data-ui-size="md" data-w4-appearance-select="firstLineIndent">${selectOptions([{ value: "true", label: "开启" }, { value: "false", label: "关闭" }], typography.firstLineIndent !== false ? "true" : "false")}</select></label>
            <label><strong>简繁</strong><select class="fd-control-select" data-ui-primitive="select" data-ui-size="md" data-w4-appearance-select="script">${selectOptions(["简体", "繁體"], typography.script || "简体")}</select></label>
            <label><strong>翻页动画</strong><select class="fd-control-select" data-ui-primitive="select" data-ui-size="md" data-w4-appearance-select="pageAnimation">${selectOptions([{ value: "smooth", label: "平滑" }, { value: "simulation", label: "仿真" }, { value: "slide", label: "滑动" }, { value: "none", label: "无" }], typography.pageAnimation || "smooth")}</select></label>
            <label><strong>文字两端对齐</strong><select class="fd-control-select" data-ui-primitive="select" data-ui-size="md" data-w4-appearance-select="alignment">${selectOptions([{ value: "justify", label: "开启" }, { value: "left", label: "关闭" }], typography.alignment || "left")}</select></label>
          </div>
          <div class="fd-reader-appearance-step-list">${w4TypographyRows(data, typography)}</div>
        </section>
        <section class="fd-reader-full-setting-block fd-reader-appearance-font-library">
          <header><strong>字体库</strong><em>可拖动调整位置</em></header>
          <div class="fd-reader-appearance-font-grid">
            ${fonts.map((item) => `
              <button class="${typography.fontFamily === item.value ? "is-active" : ""}" type="button" draggable="true" data-w4-font-cell data-w4-font-value="${esc(item.value)}" data-reader-typography-set="fontFamily" data-reader-typography-value="${esc(item.value)}" style="font-family:${esc(item.fontStack)}">${esc(item.label)}</button>
            `).join("")}
            <button class="fd-reader-font-import-cell" type="button" data-route="reader-font-import-confirm">导入</button>
          </div>
        </section>
      </section>`;
  }

  // ====================================================================
  // 8. reader-full-font：完整字体管理页（L3 控制页）
  // 系统字体 / 导入字体列表 + 启用 / 重命名 / 删除
  // ====================================================================
  function readerFullFontScreen(data, appState) {
    const title = routeTitle("reader-full-font");
    const body = readerFullFontBody(data, appState);
    return w4RenderReaderShellWithPanel(data, appState, "reader-full-font", title, "font", body, "");
  }

  function readerFullFontBody(data, appState) {
    const typography = w4NormalizeTypography(data);
    const systemFonts = w4SystemFonts(data).map((f) => Object.assign({}, f, { system: true }));
    const importedFonts = w4ImportedFonts();
    const activeValue = typography.fontFamily;
    return `
      <section class="fd-reader-full-section fd-reader-full-font" aria-label="字体完整设置">
        <section class="fd-reader-full-setting-block">
          <header><strong>系统字体</strong><em>${esc(systemFonts.length)} 款</em></header>
          <div class="fd-reader-font-list fd-w4-font-list">
            ${systemFonts.map((item) => w4FontRow(item, activeValue, true)).join("")}
          </div>
        </section>
        <section class="fd-reader-full-setting-block">
          <header><strong>导入字体</strong><em>${esc(importedFonts.length)} 款</em></header>
          <div class="fd-reader-font-list fd-w4-font-list">
            ${importedFonts.length > 0
              ? importedFonts.map((item) => w4FontRow(item, activeValue, false)).join("")
              : `<p class="fd-w4-empty">暂无导入字体，点击下方按钮导入字体文件。</p>`
            }
          </div>
          <div class="fd-reader-full-choice-grid fd-w4-font-import-entry">
            <button class="is-primary" type="button" data-route="reader-font-import-confirm">${icon("download", "fd-small-icon")}导入字体</button>
          </div>
        </section>
        <section class="fd-reader-full-setting-block fd-reader-full-typography">
          <header><strong>当前字体预览</strong></header>
          <p class="fd-w4-font-preview" style="font-family:${esc(w4ActiveFont(data).fontStack)}">
            雨夜的风格外冷，远处灯塔亮起。
          </p>
        </section>
      </section>`;
  }

  // 字体行（系统/导入）
  function w4FontRow(item, activeValue, isSystem) {
    const isActive = item.value === activeValue;
    const enabledAttr = item.enabled === false ? ' aria-disabled="true"' : '';
    return `
      <article class="fd-reader-font-row fd-w4-font-row${isActive ? " is-active" : ""}${item.enabled === false ? " is-disabled" : ""}" data-w4-font-id="${esc(item.id || item.value)}">
        <div class="fd-w4-font-info">
          <strong>${esc(item.label)}</strong>
          <small>${isSystem ? "系统" : `${esc(item.format || "ttf").toUpperCase()} · ${esc(item.fileSize || "—")}${item.enabled === false ? " · 已禁用" : ""}`}</small>
        </div>
        <span class="fd-w4-font-preview-text" style="font-family:${esc(item.fontStack)}">永和九年</span>
        <div class="fd-w4-font-actions">
          <button class="${isActive ? "is-active" : ""}" type="button" data-w4-font-action="enable" data-w4-font-value="${esc(item.value)}"${enabledAttr}>${isActive ? "已启用" : "启用"}</button>
          ${!isSystem ? `<button type="button" data-w4-font-action="rename" data-w4-font-id="${esc(item.id)}">重命名</button>` : ""}
          ${!isSystem ? `<button class="is-danger" type="button" data-route="reader-font-delete-confirm" data-w4-font-action="delete" data-w4-font-id="${esc(item.id)}">删除</button>` : ""}
        </div>
      </article>`;
  }

  // ====================================================================
  // 9. reader-full-theme：完整主题列表页（L3 控制页）
  // 主题列表 + 新建 / 复制 / 编辑 / 删除 / 设为默认
  // ====================================================================
  function readerFullThemeScreen(data, appState) {
    const title = routeTitle("reader-full-theme");
    const body = readerFullThemeBody(data, appState);
    return w4RenderReaderShellWithPanel(data, appState, "reader-full-theme", title, "palette", body, "");
  }

  function readerFullThemeBody(data, appState) {
    const activeTheme = w4CurrentTheme(data, appState);
    const themes = w4AllThemes();
    const defaultThemes = themes.filter((t) => t.system);
    const customThemes = themes.filter((t) => !t.system);
    const defaultThemeValue = w4Get("default-theme", activeTheme.value);
    return `
      <section class="fd-reader-full-section fd-reader-full-theme" aria-label="主题完整设置">
        <section class="fd-reader-full-setting-block">
          <header><strong>默认主题</strong><em>${esc(activeTheme.label)}</em></header>
          <div class="fd-reader-full-theme-grid">
            ${defaultThemes.map((item) => w4ThemeCard(item, activeTheme, defaultThemeValue, true)).join("")}
          </div>
        </section>
        ${customThemes.length > 0 ? `
          <section class="fd-reader-full-setting-block">
            <header><strong>自定义主题</strong><em>${esc(customThemes.length)} 个</em></header>
            <div class="fd-reader-full-theme-grid fd-reader-custom-theme-grid">
              ${customThemes.map((item) => w4ThemeCard(item, activeTheme, defaultThemeValue, false)).join("")}
            </div>
          </section>
        ` : ""}
        <section class="fd-reader-full-setting-block fd-reader-full-theme-actions">
          <header><strong>主题操作</strong></header>
          <div class="fd-reader-full-choice-grid">
            <button type="button" data-route="reader-theme-new">${icon("add", "fd-small-icon")}新建主题</button>
            <button type="button" data-route="reader-full-theme-edit">${icon("edit", "fd-small-icon")}编辑主题</button>
          </div>
        </section>
      </section>`;
  }

  // 主题卡片
  function w4ThemeCard(item, activeTheme, defaultThemeValue, isSystem) {
    const isActive = activeTheme.value === item.value;
    const isDefault = defaultThemeValue === item.value;
    return `
      <article class="fd-w4-theme-card${isActive ? " is-active" : ""}" data-w4-theme-value="${esc(item.value)}">
        <button class="fd-w4-theme-swatch" type="button" data-reader-theme="${esc(item.value)}" data-reader-theme-scheme="${esc(item.scheme)}" aria-label="应用主题：${esc(item.label)}" style="--swatch:${esc(item.swatch)};--reader-bg:${esc(item.bg)};--reader-ink:${esc(item.ink)}">
          <span class="fd-w4-theme-swatch-text" style="color:${esc(item.ink)};background:${esc(item.bg)}">永</span>
        </button>
        <div class="fd-w4-theme-meta">
          <strong>${esc(item.label)}${isDefault ? " · 默认" : ""}</strong>
          <small>${isSystem ? "系统" : "自定义"} · ${esc(item.scheme === "night" ? "夜间" : "白天")}</small>
        </div>
        <div class="fd-w4-theme-actions">
          <button class="${isDefault ? "is-active" : ""}" type="button" data-w4-theme-action="default" data-w4-theme-value="${esc(item.value)}">设为默认</button>
          ${!isSystem ? `<button type="button" data-route="reader-full-theme-edit" data-w4-theme-action="edit" data-w4-theme-value="${esc(item.value)}">编辑</button>` : ""}
          ${!isSystem ? `<button class="is-danger" type="button" data-route="reader-theme-delete-confirm" data-w4-theme-action="delete" data-w4-theme-value="${esc(item.value)}">删除</button>` : ""}
          ${isSystem ? `<button type="button" data-route="reader-full-theme-edit" data-w4-theme-action="copy" data-w4-theme-value="${esc(item.value)}">复制</button>` : ""}
        </div>
      </article>`;
  }

  // ====================================================================
  // 10. reader-full-theme-edit：主题编辑表单（L3 控制页）
  // 背景色 / 文字色 / 控制层颜色 / 纹理 / 透明度 / 日间夜间配对 + 实时正文预览
  // ====================================================================
  function readerFullThemeEditScreen(data, appState) {
    const title = routeTitle("reader-full-theme-edit");
    const body = readerFullThemeEditBody(data, appState);
    return w4RenderReaderShellWithPanel(data, appState, "reader-full-theme-edit", title, "palette", body, "");
  }

  function readerFullThemeEditBody(data, appState) {
    const themes = w4AllThemes();
    // 编辑中的主题：优先取 appState，其次取 localStorage
    const editingValue = appState?.w4EditingThemeValue || w4Get("editing-theme", "");
    const source = editingValue ? (themes.find((t) => t.value === editingValue) || themes[0]) : null;
    const draft = appState?.w4ThemeEditDraft || w4Get("theme-edit-draft", {
      name: source?.label || "",
      bg: source?.bg || "#fff7ec",
      ink: source?.ink || "#2b241d",
      control: source?.control || "#2f6373",
      scheme: source?.scheme || "day",
      texture: source?.texture || "plain",
      textureOpacity: source?.textureOpacity || 0,
      pair: source?.pair || ""
    });
    const customThemes = themes.filter((t) => !t.system);
    const paragraphs = (data?.reader?.readingText || ["雨，下了一整夜。"]).slice(0, 2);
    return `
      <section class="fd-reader-full-section fd-reader-full-theme-edit" aria-label="自定义主题编辑">
        <section class="fd-reader-full-setting-block fd-reader-full-theme-edit-form">
          <header><strong>主题编辑</strong><em>实时预览</em></header>
          <div class="fd-reader-theme-edit-fields fd-w4-theme-edit-fields">
            <label class="fd-reader-theme-edit-field fd-w4-field">
              <span>主题名称</span>
              <input type="text" data-w4-theme-edit-field="name" value="${esc(draft.name)}" placeholder="如：暖光纸" maxlength="12" />
            </label>
            <label class="fd-reader-theme-edit-field fd-w4-field">
              <span>背景色</span>
              <input type="color" data-w4-theme-edit-field="bg" value="${esc(draft.bg)}" />
              <em data-w4-theme-edit-value="bg">${esc(draft.bg)}</em>
            </label>
            <label class="fd-reader-theme-edit-field fd-w4-field">
              <span>文字色</span>
              <input type="color" data-w4-theme-edit-field="ink" value="${esc(draft.ink)}" />
              <em data-w4-theme-edit-value="ink">${esc(draft.ink)}</em>
            </label>
            <label class="fd-reader-theme-edit-field fd-w4-field">
              <span>控制层颜色</span>
              <input type="color" data-w4-theme-edit-field="control" value="${esc(draft.control)}" />
              <em data-w4-theme-edit-value="control">${esc(draft.control)}</em>
            </label>
            <div class="fd-reader-theme-edit-field fd-w4-field" role="radiogroup" aria-label="日夜间模式">
              <span>模式</span>
              <div class="fd-reader-full-choice-grid">
                <button class="${draft.scheme === "day" ? "is-active" : ""}" type="button" data-w4-theme-edit-scheme="day">白天</button>
                <button class="${draft.scheme === "night" ? "is-active" : ""}" type="button" data-w4-theme-edit-scheme="night">夜间</button>
              </div>
            </div>
            <label class="fd-reader-theme-edit-field fd-w4-field">
              <span>纹理</span>
              <div class="fd-reader-full-choice-grid">
                <button class="${draft.texture === "plain" ? "is-active" : ""}" type="button" data-w4-theme-edit-texture="plain">纯色</button>
                <button class="${draft.texture === "paper" ? "is-active" : ""}" type="button" data-w4-theme-edit-texture="paper">纸纹</button>
              </div>
            </label>
            <label class="fd-reader-theme-edit-field fd-w4-field">
              <span>纹理强度（<em data-w4-theme-edit-value="textureOpacity">${esc(Number(draft.textureOpacity).toFixed(3))}</em>）</span>
              <input type="range" min="0" max="0.08" step="0.002" value="${esc(draft.textureOpacity)}" data-w4-theme-edit-field="textureOpacity" />
            </label>
            <div class="fd-reader-theme-edit-field fd-w4-field">
              <span>日间 / 夜间配对</span>
              <div class="fd-reader-full-choice-grid">
                <button class="${!draft.pair ? "is-active" : ""}" type="button" data-w4-theme-edit-pair="">无配对</button>
                ${themes.filter((t) => t.scheme !== draft.scheme).slice(0, 4).map((t) => `
                  <button class="${draft.pair === t.value ? "is-active" : ""}" type="button" data-w4-theme-edit-pair="${esc(t.value)}">${esc(t.label)}</button>
                `).join("")}
              </div>
            </div>
          </div>
        </section>
        <section class="fd-reader-full-setting-block fd-w4-theme-preview-block">
          <header><strong>实时正文预览</strong></header>
          <article class="fd-w4-theme-preview" style="background:${esc(draft.bg)};color:${esc(draft.ink)};--reader-texture-opacity:${esc(draft.textureOpacity)};--reader-texture-rgb:${esc(draft.scheme === "night" ? "222 202 174" : "138 116 84")}">
            <h3 style="color:${esc(draft.ink)}">第 32 章 雨夜</h3>
            ${paragraphs.map((p) => `<p style="color:${esc(draft.ink)}">${esc(p)}</p>`).join("")}
            <footer style="border-top-color:${esc(draft.control)}"><span style="background:${esc(draft.control)};color:#fffaf4">控制层示例</span></footer>
          </article>
        </section>
        ${customThemes.length > 0 ? `
          <section class="fd-reader-full-setting-block fd-reader-full-theme-edit-list">
            <header><strong>已保存自定义主题</strong><em>${esc(customThemes.length)} 个</em></header>
            <div class="fd-reader-full-theme-grid fd-reader-custom-theme-grid">
              ${customThemes.map((item) => `
                <button class="${w4CurrentTheme(data, appState).value === item.value ? "is-active" : ""}" type="button" data-reader-theme="${esc(item.value)}" data-reader-theme-scheme="${esc(item.scheme || "day")}" aria-label="应用自定义主题：${esc(item.label)}" style="--swatch:${esc(item.swatch || item.bg)}">
                  <span style="--swatch:${esc(item.swatch || item.bg)}"></span>
                </button>
              `).join("")}
            </div>
          </section>
        ` : ""}
        <section class="fd-reader-full-setting-block fd-reader-full-theme-edit-actions">
          <div class="fd-reader-theme-edit-actions">
            <button class="is-cancel" type="button" data-route="reader-full-theme">取消</button>
            <button class="is-primary" type="button" data-reader-theme-edit-save data-route="reader-full-theme">保存主题</button>
          </div>
        </section>
      </section>`;
  }

  // ====================================================================
  // 11. reader-full-layout：完整排版配置页（L3 控制页）
  // 字号 / 行距 / 段距 / 字距 / 上下边距 / 左右边距 / 首行缩进 / 对齐方式
  // 字体 / 页面纹理 / 翻页方式 / 恢复默认
  // ====================================================================
  function readerFullLayoutScreen(data, appState) {
    const title = routeTitle("reader-full-layout");
    const body = readerFullLayoutBody(data, appState);
    return w4RenderReaderShellWithPanel(data, appState, "reader-full-layout", title, "typography", body, "");
  }

  function readerFullLayoutBody(data, appState) {
    const typography = w4NormalizeTypography(data);
    const config = w4TypographyConfig(data);
    const fonts = w4AllFonts(data);
    const textureOptions = [
      { value: "plain", label: "纯色" },
      { value: "paper", label: "纸张" },
      { value: "soft", label: "柔和" }
    ];
    const alignmentOptions = [
      { value: "left", label: "左对齐" },
      { value: "center", label: "居中" },
      { value: "justify", label: "两端对齐" }
    ];
    const pageModeOptions = [
      { value: "horizontal", label: "横向翻页" },
      { value: "vertical", label: "纵向滚动" }
    ];
    const pageAnimationOptions = [
      { value: "smooth", label: "平滑" },
      { value: "slide", label: "滑动" },
      { value: "none", label: "无动画" }
    ];
    return `
      <section class="fd-reader-full-section fd-reader-full-layout" aria-label="版式完整设置">
        <section class="fd-reader-full-setting-block fd-reader-full-typography">
          <header><strong>文字排版</strong><em>字号 / 行距 / 段距 / 字距</em></header>
          ${w4TypographyRows(data, typography)}
        </section>
        <section class="fd-reader-full-setting-block fd-reader-full-page-space">
          <header><strong>页面空间</strong><em>边距 / 缩进</em></header>
          ${w4PageSpaceRows(data, typography)}
        </section>
        <section class="fd-reader-full-setting-block">
          <header><strong>首行缩进</strong><em>${typography.firstLineIndent ? "已开启" : "已关闭"}</em></header>
          <div class="fd-reader-full-choice-grid">
            <button class="${typography.firstLineIndent ? "is-active" : ""}" type="button" data-w4-layout-toggle="firstLineIndent" data-w4-value="true">开启</button>
            <button class="${!typography.firstLineIndent ? "is-active" : ""}" type="button" data-w4-layout-toggle="firstLineIndent" data-w4-value="false">关闭</button>
          </div>
        </section>
        <section class="fd-reader-full-setting-block">
          <header><strong>对齐方式</strong><em>${esc(alignmentOptions.find((a) => a.value === typography.alignment)?.label || "左对齐")}</em></header>
          <div class="fd-reader-full-choice-grid">
            ${alignmentOptions.map((a) => `
              <button class="${typography.alignment === a.value ? "is-active" : ""}" type="button" data-w4-layout-set="alignment" data-w4-value="${esc(a.value)}">${esc(a.label)}</button>
            `).join("")}
          </div>
        </section>
        <section class="fd-reader-full-setting-block">
          <header><strong>字体</strong><em>${esc(w4ActiveFont(data).label)}</em></header>
          <div class="fd-reader-full-choice-grid fd-reader-full-font-grid">
            ${fonts.map((item) => `
              <button class="${typography.fontFamily === item.value ? "is-active" : ""}" type="button" data-reader-typography-set="fontFamily" data-reader-typography-value="${esc(item.value)}">${esc(item.label)}</button>
            `).join("")}
          </div>
        </section>
        <section class="fd-reader-full-setting-block">
          <header><strong>页面纹理</strong><em>${esc(textureOptions.find((t) => t.value === typography.texture)?.label || "纯色")}</em></header>
          <div class="fd-reader-full-choice-grid">
            ${textureOptions.map((t) => `
              <button class="${typography.texture === t.value ? "is-active" : ""}" type="button" data-w4-layout-set="texture" data-w4-value="${esc(t.value)}">${esc(t.label)}</button>
            `).join("")}
          </div>
        </section>
        <section class="fd-reader-full-setting-block">
          <header><strong>翻页方式</strong><em>${esc(pageModeOptions.find((p) => p.value === typography.pageMode)?.label || "横向翻页")}</em></header>
          <div class="fd-reader-full-choice-grid">
            ${pageModeOptions.map((p) => `
              <button class="${typography.pageMode === p.value ? "is-active" : ""}" type="button" data-w4-layout-set="pageMode" data-w4-value="${esc(p.value)}">${esc(p.label)}</button>
            `).join("")}
          </div>
        </section>
        <section class="fd-reader-full-setting-block">
          <header><strong>翻页动画</strong><em>${esc(pageAnimationOptions.find((p) => p.value === typography.pageAnimation)?.label || "平滑")}</em></header>
          <div class="fd-reader-full-choice-grid">
            ${pageAnimationOptions.map((p) => `
              <button class="${typography.pageAnimation === p.value ? "is-active" : ""}" type="button" data-w4-layout-set="pageAnimation" data-w4-value="${esc(p.value)}">${esc(p.label)}</button>
            `).join("")}
          </div>
        </section>
        <section class="fd-reader-full-setting-block fd-reader-full-layout-reset">
          <header><strong>恢复默认</strong><em>重置所有排版配置</em></header>
          <div class="fd-reader-full-choice-grid">
            <button class="is-danger" type="button" data-route="reader-typography-reset-confirm">${icon("refresh", "fd-small-icon")}恢复默认排版</button>
          </div>
        </section>
      </section>`;
  }

  // 排版步进行（字号/行距/段距/字距）
  function w4TypographyRows(data, typography) {
    const config = w4TypographyConfig(data);
    return `
      <div class="fd-reader-step-row" data-typography-row="font-size">
        <strong>字号</strong>
        <span>
          <button type="button" data-reader-typography-action="font-size-decrease">-</button>
          <em data-reader-typography-value="font-size">${esc(typography.fontSize)}</em>
          <button type="button" data-reader-typography-action="font-size-increase">+</button>
        </span>
      </div>
      <div class="fd-reader-step-row" data-typography-row="line-height">
        <strong>行距</strong>
        <span>
          <button type="button" data-reader-typography-action="line-height-decrease">-</button>
          <em data-reader-typography-value="line-height">${esc(typography.lineHeight)}</em>
          <button type="button" data-reader-typography-action="line-height-increase">+</button>
        </span>
      </div>
      <div class="fd-reader-step-row" data-typography-row="paragraph-gap">
        <strong>段距</strong>
        <span>
          <button type="button" data-reader-typography-action="paragraph-gap-decrease">-</button>
          <em data-reader-typography-value="paragraph-gap">${esc(typography.paragraphGap)}</em>
          <button type="button" data-reader-typography-action="paragraph-gap-increase">+</button>
        </span>
      </div>
      <div class="fd-reader-step-row" data-typography-row="letter-spacing">
        <strong>字距</strong>
        <span>
          <button type="button" data-reader-typography-action="letter-spacing-decrease">-</button>
          <em data-reader-typography-value="letter-spacing">${esc(typography.letterSpacing)}</em>
          <button type="button" data-reader-typography-action="letter-spacing-increase">+</button>
        </span>
      </div>`;
  }

  // 页面空间行（上下/左右边距）
  function w4PageSpaceRows(data, typography) {
    return `
      <div class="fd-reader-step-row" data-page-space-row="top-margin">
        <strong>上边距</strong>
        <span>
          <button type="button" data-reader-page-space-action="top-margin-decrease">-</button>
          <em data-reader-page-space-value="top-margin">${esc(typography.topMargin)}</em>
          <button type="button" data-reader-page-space-action="top-margin-increase">+</button>
        </span>
      </div>
      <div class="fd-reader-step-row" data-page-space-row="bottom-margin">
        <strong>下边距</strong>
        <span>
          <button type="button" data-reader-page-space-action="bottom-margin-decrease">-</button>
          <em data-reader-page-space-value="bottom-margin">${esc(typography.bottomMargin)}</em>
          <button type="button" data-reader-page-space-action="bottom-margin-increase">+</button>
        </span>
      </div>
      <div class="fd-reader-step-row" data-page-space-row="side-margin">
        <strong>左右边距</strong>
        <span>
          <button type="button" data-reader-page-space-action="side-margin-decrease">-</button>
          <em data-reader-page-space-value="side-margin">${esc(typography.sideMargin)}</em>
          <button type="button" data-reader-page-space-action="side-margin-increase">+</button>
        </span>
      </div>`;
  }

  // ====================================================================
  // 12. reader-appearance：外观覆盖层（L2 面板，独立化）
  // ====================================================================
  function readerAppearanceScreen(data, appState) {
    const title = routeTitle("reader-appearance");
    const panelHtml = w4AppearanceModulePanel(data, appState, "reader-appearance");
    return w4RenderReaderShellWithSheet(data, appState, "reader-appearance", title, panelHtml, true);
  }

  // ====================================================================
  // 13. reader-appearance-overlay-v2：外观覆盖层 v2（L2 面板，独立化）
  // ====================================================================
  function readerAppearanceOverlayV2Screen(data, appState) {
    const title = routeTitle("reader-appearance-overlay-v2");
    // v2 版本带"展开"入口，引导到 L3 控制页
    const panelHtml = w4AppearanceModulePanel(data, appState, "reader-appearance-overlay-v2", true);
    return w4RenderReaderShellWithSheet(data, appState, "reader-appearance-overlay-v2", title, panelHtml, true);
  }

  // 外观模块面板（L2，快捷主题 + 排版）
  function w4AppearanceModulePanel(data, appState, route, isV2) {
    const typography = w4NormalizeTypography(data);
    const activeTheme = w4CurrentTheme(data, appState);
    const themes = w4AllThemes();
    // 快捷主题：取前 4 个默认主题
    const quickThemes = themes.slice(0, 4);
    return `
      <section class="fd-reader-module-panel fd-reader-appearance-panel${isV2 ? " fd-reader-appearance-panel-v2" : ""}" data-dev-region="ReaderModulePanel" aria-label="阅读外观">
        <div class="fd-reader-appearance-list fd-reader-module-list">
          <section class="fd-reader-full-setting-block fd-reader-appearance-quick-theme">
            <header><strong>阅读主题</strong>${isV2 ? `<button type="button" data-route="reader-full-appearance" data-route-replace>展开</button>` : ""}</header>
            <div class="fd-reader-full-theme-grid">
              ${quickThemes.map((item) => `
                <button class="${activeTheme.value === item.value ? "is-active" : ""}" type="button" data-reader-theme="${esc(item.value)}" data-reader-theme-scheme="${esc(item.scheme)}" data-reader-theme-texture="${esc(item.texture || "plain")}" aria-label="主题：${esc(item.label)}">
                  <span style="--swatch:${esc(item.swatch)}"></span>
                  <small>${esc(item.label)}</small>
                </button>
              `).join("")}
            </div>
          </section>
          <section class="fd-reader-full-setting-block fd-reader-appearance-quick-typography">
            <div class="fd-reader-appearance-quick-selects">
              <label>
                <strong>字号</strong>
                <select class="fd-control-select" data-ui-primitive="select" data-ui-size="sm" data-reader-typography-select="fontSize" aria-label="字号">
                  ${[14, 16, 18, 20, 22, 24].map((value) => `<option value="${value}"${Number(typography.fontSize) === value ? " selected" : ""}>${value}</option>`).join("")}
                </select>
              </label>
              <label>
                <strong>行距</strong>
                <select class="fd-control-select" data-ui-primitive="select" data-ui-size="sm" data-reader-typography-select="lineHeight" aria-label="行距">
                  ${[1.4, 1.6, 1.8, 1.96, 2].map((value) => `<option value="${value}"${Number(typography.lineHeight) === value ? " selected" : ""}>${value}</option>`).join("")}
                </select>
              </label>
            </div>
          </section>
        </div>
      </section>`;
  }

  // ===== ReaderShell 渲染辅助 =====

  // L3 控制页：ReaderShell + 完整 panel（可选 overlay）
  function w4RenderReaderShellWithPanel(data, appState, route, title, iconName, panelHtml, overlayHtml) {
    return shellKit().renderReaderShell({
      frameClass: `fd-reader-frame fd-reader-flow-frame fd-reader-mode-full fd-reader-mode-full-appearance${w4PageModeClass(appState)} fd-w4-route-${esc(route)}`,
      frameStyle: w4SharedFrameStyle(data, appState),
      readingSurfaceClass: "fd-reading-surface",
      overlayClass: "fd-reader-overlay fd-reader-full-overlay",
      bottomSheetHostClass: "fd-reader-full-host",
      moduleNavClass: "fd-reader-module-nav fd-reader-module-nav-empty",
      stateHostClass: "fd-reader-state-host",
      stateHostHtml: w4SharedStateHostHtml(data, appState),
      ariaLabel: title,
      readingSurfaceHtml: w4SharedSurfaceHtml(data, appState),
      overlayHtml: w4SharedTopOverlayHtml(data, appState),
      bottomSheetHtml: w4FullPagePanel(data, appState, route, title, iconName, panelHtml) + (overlayHtml || ""),
      moduleNavHtml: ""
    });
  }

  // L2 面板：ReaderShell + 底部 sheet（保持正文上下文）
  function w4RenderReaderShellWithSheet(data, appState, route, title, sheetHtml, withModuleNav) {
    return shellKit().renderReaderShell({
      frameClass: `fd-reader-frame fd-reader-flow-frame fd-reader-mode-module${w4PageModeClass(appState)} fd-w4-route-${esc(route)}`,
      frameStyle: w4SharedFrameStyle(data, appState),
      readingSurfaceClass: "fd-reading-surface",
      overlayClass: "fd-reader-overlay",
      bottomSheetHostClass: "fd-reader-sheet",
      moduleNavClass: withModuleNav ? "fd-reader-module-nav" : "fd-reader-module-nav fd-reader-module-nav-empty",
      accessoryHostClass: "fd-reader-accessory-host",
      accessoryHtml: w4SharedBrightnessRailHtml(data, appState),
      stateHostClass: "fd-reader-state-host",
      stateHostHtml: w4SharedStateHostHtml(data, appState),
      ariaLabel: title,
      readingSurfaceHtml: w4SharedSurfaceHtml(data, appState),
      overlayHtml: w4SharedTopOverlayHtml(data, appState),
      bottomSheetHtml: sheetHtml,
      moduleNavHtml: withModuleNav ? w4ReaderModuleNav(data, "appearance") : ""
    });
  }

  // 阅读控制层主体（用于 fallback 父页面）
  function w4ReaderControlMain(data, appState) {
    const chapter = data?.reader?.chapterProgress || {};
    const chapterState = { index: 0, count: 3, chapter: { title: data?.reader?.chapterTitle || "雨夜" } };
    return `
      <div class="fd-reader-control-main" data-dev-region="BottomControlPanel">
        <nav class="fd-reader-actions" aria-label="快捷操作">
          <button type="button" data-route="content-search">${icon("reader-content-search", "fd-medium-icon")}<span>搜索</span></button>
          <button type="button" data-route="auto-page">${icon("reader-auto-page", "fd-medium-icon")}<span>自动翻页</span></button>
          <button type="button" data-route="content-replacement">${icon("reader-content-replace", "fd-medium-icon")}<span>替换</span></button>
        </nav>
        <section class="fd-reader-chapter-panel" aria-label="书籍进度">
          <div class="fd-reader-chapter-row fd-reader-chapter-control-row">
            <button class="fd-reader-chapter-step" type="button" data-reader-chapter-action="prev" aria-label="上一章">${icon("chevron-left", "fd-small-icon")}</button>
            <span class="fd-reader-chapter-main">
              <strong>${esc(chapterState.chapter.title || "第 32 章 雨夜")}</strong>
            </span>
            <button class="fd-reader-chapter-step" type="button" data-reader-chapter-action="next" aria-label="下一章">${icon("chevron", "fd-small-icon")}</button>
          </div>
          <div class="fd-reader-progress-row">
            <small class="fd-reader-book-progress">38%</small>
            <button class="fd-reader-progress" type="button" style="--progress:38%" aria-label="调整书籍进度"><i><b></b></i></button>
            <span class="fd-reader-total-chapters">共 812 章</span>
          </div>
        </section>
      </div>`;
  }

  // 阅读模块导航
  function w4ReaderModuleNav(data, activeType) {
    const modules = [
      { type: "directory", label: "目录", icon: "reader-module-directory", route: "toc-bookmarks" },
      { type: "tts", label: "朗读", icon: "reader-module-tts", route: "tts" },
      { type: "appearance", label: "外观", icon: "reader-module-appearance", route: "reader-appearance" },
      { type: "settings", label: "设置", icon: "reader-module-settings", route: "reader-settings" }
    ];
    return modules.map((item) => `
      <button class="fd-reader-module${item.type === activeType ? " is-active" : ""}" type="button" data-route="${esc(item.route)}" data-module="${esc(item.type)}"${item.type === activeType ? ' aria-current="page"' : ""}>
        <span>${icon(item.icon, "fd-medium-icon")}</span>
        <small>${esc(item.label)}</small>
      </button>
    `).join("");
  }

  // ===== 路由分发 =====
  // 主入口：根据 route 调度到对应 screen 函数
  function renderW4Route(route, data, options, appState) {
    switch (route) {
      case "reader-font-import-confirm":
        return readerFontImportConfirmScreen(data, appState);
      case "reader-font-delete-confirm":
        return readerFontDeleteConfirmScreen(data, appState);
      case "reader-font-fallback":
        return readerFontFallbackScreen(data, appState);
      case "reader-theme-new":
        return readerThemeNewScreen(data, appState);
      case "reader-theme-delete-confirm":
        return readerThemeDeleteConfirmScreen(data, appState);
      case "reader-typography-reset-confirm":
        return readerTypographyResetConfirmScreen(data, appState);
      case "reader-full-appearance":
        return readerFullAppearanceScreen(data, appState);
      case "reader-full-font":
        return readerFullFontScreen(data, appState);
      case "reader-full-theme":
        return readerFullThemeScreen(data, appState);
      case "reader-full-theme-edit":
        return readerFullThemeEditScreen(data, appState);
      case "reader-full-layout":
        return readerFullLayoutScreen(data, appState);
      default:
        return "";
    }
  }

  // ===== 导出 =====
  window.ReaderW4ThemeFontTypographyRenderers = {
    // 路由分发主入口
    renderW4Route,
    // 集成映射：route → screen 函数
    screenMap: {
      "reader-font-import-confirm": readerFontImportConfirmScreen,
      "reader-font-delete-confirm": readerFontDeleteConfirmScreen,
      "reader-font-fallback": readerFontFallbackScreen,
      "reader-theme-new": readerThemeNewScreen,
      "reader-theme-delete-confirm": readerThemeDeleteConfirmScreen,
      "reader-typography-reset-confirm": readerTypographyResetConfirmScreen,
      "reader-full-appearance": readerFullAppearanceScreen,
      "reader-full-font": readerFullFontScreen,
      "reader-full-theme": readerFullThemeScreen,
      "reader-full-theme-edit": readerFullThemeEditScreen,
      "reader-full-layout": readerFullLayoutScreen
    },
    // 数据/持久化辅助（供外部事件层调用）
    storage: {
      get: w4Get,
      set: w4Set,
      remove: w4Remove,
      prefix: STORAGE_PREFIX
    },
    // 数据访问辅助
    data: {
      defaultThemes: w4DefaultThemes,
      allThemes: w4AllThemes,
      currentTheme: w4CurrentTheme,
      systemFonts: w4SystemFonts,
      importedFonts: w4ImportedFonts,
      allFonts: w4AllFonts,
      activeFont: w4ActiveFont,
      normalizeTypography: w4NormalizeTypography,
      typographyConfig: w4TypographyConfig,
      themeStyle: w4ThemeStyle,
      typographyStyle: w4TypographyStyle
    },
    // 集成映射（文本形式，供文档/校验）
    INTEGRATION_MAP: {
      "reader-font-import-confirm": "readerFontImportConfirmScreen",
      "reader-font-delete-confirm": "readerFontDeleteConfirmScreen",
      "reader-font-fallback": "readerFontFallbackScreen",
      "reader-theme-new": "readerThemeNewScreen",
      "reader-theme-delete-confirm": "readerThemeDeleteConfirmScreen",
      "reader-typography-reset-confirm": "readerTypographyResetConfirmScreen",
      "reader-full-appearance": "readerFullAppearanceScreen",
      "reader-full-font": "readerFullFontScreen",
      "reader-full-theme": "readerFullThemeScreen",
      "reader-full-theme-edit": "readerFullThemeEditScreen",
      "reader-full-layout": "readerFullLayoutScreen"
    }
  };
})(window);
