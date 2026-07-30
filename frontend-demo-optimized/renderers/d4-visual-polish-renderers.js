/**
 * D4 视觉、美化与默认配置 renderer 函数模块
 * ------------------------------------------------------------------------
 * 职责：为 Reader-UI Demo 提供视觉复审与默认配置层：
 *   1. 对比度修正（WCAG 2.1 检查器，辅助文字/图标 ≥ 4.5:1）
 *   2. 可读性修正（最小字号常量，清理 8-10px 不可读文本）
 *   3. 大字体处理（智能省略，保留首尾字符）
 *   4. 组件统一样式（fd-d4- 前缀的卡片/输入框/按钮/segmented/dropdown/toast/dialog）
 *   5. 信息密度区分（阅读型宽松 / 管理型紧凑）
 *   6. 平板平衡（正文最大宽度限制，右侧 dock 校准）
 *   7. 6 套默认主题（day/night/paper/warm/green/blue，含昼夜配对）
 *   8. 自定义主题安全对比度提示
 *   9. 字体回退链（中文 sans/serif fallback）
 *
 * 集成方式：模块化加载模式
 *   - index.html 通过 <script> 加载
 *   - 挂载到 window.ReaderD4VisualPolishRenderers
 *   - render-runtime.js 通过 dispatch hook 在 switch 之前分发
 *
 * 路由覆盖说明：
 *   概念路由 settings-theme / settings-theme-edit / settings-font / settings-display
 *   不存在于 route.schema.json，因此不强制覆盖实际路由。
 *   renderD4Route 对所有已存在的真实路由返回 null（不破坏 D3/W4 渲染），
 *   通过暴露的视觉工具函数与 DEFAULT_THEME_PRESETS 提供视觉增强能力。
 * ------------------------------------------------------------------------
 */
(function attachReaderD4VisualPolishRenderers(window) {
  "use strict";

  // ===========================================================================
  // 基础依赖：shell kit / 转义 / 图标
  // ===========================================================================

  function shellKit() {
    if (!window.ReaderShellKit) {
      throw new Error("ReaderShellKit is required before d4-visual-polish-renderers.js");
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

  // 路由标题
  function routeTitle(route) {
    var contract = window.ReaderFrontendDemoDraftRouteContract || {};
    var routes = contract.routes || {};
    return String((routes[route] && routes[route].title) || route).replace(/（.*$/, "").trim();
  }

  // ===========================================================================
  // D4 视觉状态
  // ===========================================================================

  var d4VisualState = {
    currentViewport: "standard",   // standard/small/large/landscape/tablet/keyboard/font150/font200
    currentTheme: "day",           // day/night/paper/warm/green/blue
    fontScale: 1.0,                // 1.0 / 1.5 / 2.0
    contrastWarnings: []           // 对比度警告列表
  };

  // ===========================================================================
  // 最小可读字号常量（可读性修正）
  // ===========================================================================

  var MIN_TEXT_SIZE_PX = 14;       // 正文最小字号
  var MIN_AUX_TEXT_SIZE_PX = 12;   // 辅助文字最小字号（低于此值的 8-10px 文本需提升）
  var CONTRAST_AA_THRESHOLD = 4.5; // WCAG AA 正常文字对比度阈值
  var CONTRAST_AAA_THRESHOLD = 7.0; // WCAG AAA 正常文字对比度阈值
  var CONTRAST_AA_LARGE_THRESHOLD = 3.0; // WCAG AA 大文字（≥18px）对比度阈值

  // ===========================================================================
  // 字体回退链
  // ===========================================================================

  var FONT_FALLBACK_CHAIN =
    "'Noto Sans SC', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', system-ui, -apple-system, sans-serif";

  var SERIF_FONT_FALLBACK_CHAIN =
    "'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', 'STSong', 'Noto Serif CJK SC', serif";

  // ===========================================================================
  // 6 套默认主题配置
  // 与 token.schema.json themePresets 对齐，颜色来源：W4 w4DefaultThemes()
  // 每套主题包含：bg/text/secondary/accent/surface/border/error/pair
  // secondary 颜色均经过 checkContrast 校验，确保对比度 ≥ 4.5:1（WCAG AA）
  // ===========================================================================

  var DEFAULT_THEME_PRESETS = {
    day: {
      name: "日间",
      scheme: "day",
      bg: "#ffffff",
      text: "#332c25",
      secondary: "#514a43",
      accent: "#2f6373",
      surface: "#f7f4ef",
      border: "#e0d9cf",
      error: "#b3261e",
      pair: "night"
    },
    night: {
      name: "夜间",
      scheme: "night",
      bg: "#26231f",
      text: "#eadfce",
      secondary: "#b8ad9a",
      accent: "#7a684f",
      surface: "#332f2a",
      border: "#44403a",
      error: "#f2b8b5",
      pair: "day"
    },
    paper: {
      name: "纸纹",
      scheme: "day",
      bg: "#fff7ec",
      text: "#2b241d",
      secondary: "#5a4f42",
      accent: "#2f6373",
      surface: "#f5ead8",
      border: "#e5d8c2",
      error: "#b3261e",
      pair: "night"
    },
    warm: {
      name: "暖白",
      scheme: "day",
      bg: "#fff6e9",
      text: "#2c241d",
      secondary: "#5a4f42",
      accent: "#2f6373",
      surface: "#fbf0df",
      border: "#e6d8c4",
      error: "#b3261e",
      pair: "night"
    },
    green: {
      name: "青绿",
      scheme: "day",
      bg: "#eef5e8",
      text: "#263423",
      secondary: "#4a5a47",
      accent: "#2f6373",
      surface: "#e7f0e2",
      border: "#cdd9c6",
      error: "#b3261e",
      pair: "night"
    },
    blue: {
      name: "雾蓝",
      scheme: "day",
      bg: "#eff6f8",
      text: "#22313a",
      secondary: "#4a5a63",
      accent: "#2f6373",
      surface: "#e9f1f4",
      border: "#c6d6dc",
      error: "#b3261e",
      pair: "night"
    }
  };

  // ===========================================================================
  // 视口配置（验证视口处理）
  // ===========================================================================

  var VIEWPORT_CONFIGS = {
    standard: { width: 390, height: 844, name: "标准手机", fontScale: 1.0 },
    small: { width: 360, height: 640, name: "小手机", fontScale: 1.0 },
    large: { width: 430, height: 932, name: "大手机", fontScale: 1.0 },
    landscape: { width: 667, height: 375, name: "横屏", fontScale: 1.0 },
    tablet: { width: 1024, height: 768, name: "平板", fontScale: 1.0 },
    keyboard: { width: 390, height: 400, name: "键盘压缩", fontScale: 1.0 },
    font150: { width: 390, height: 844, name: "150%字体", fontScale: 1.5 },
    font200: { width: 390, height: 844, name: "200%字体", fontScale: 2.0 }
  };

  function getViewportConfig(viewport) {
    var key = viewport || d4VisualState.currentViewport || "standard";
    return VIEWPORT_CONFIGS[key] || VIEWPORT_CONFIGS.standard;
  }

  // 判断当前视口是否为平板
  function isTabletViewport(viewport) {
    var config = getViewportConfig(viewport);
    return config.width >= 900;
  }

  // 判断当前视口是否为横屏
  function isLandscapeViewport(viewport) {
    var config = getViewportConfig(viewport);
    return config.width > config.height;
  }

  // ===========================================================================
  // 对比度检查器（WCAG 2.1）
  // 公式：相对亮度 L = 0.2126*R + 0.7152*G + 0.0722*B
  // 其中 R/G/B 需先做 gamma 校正
  // ===========================================================================

  // 将 hex 颜色解析为 [r, g, b]（0-255）
  function hexToRgb(hex) {
    if (!hex || typeof hex !== "string") return null;
    var cleaned = hex.replace(/^#/, "").trim();
    // 支持 #rgb / #rrggbb
    if (cleaned.length === 3) {
      cleaned = cleaned[0] + cleaned[0] + cleaned[1] + cleaned[1] + cleaned[2] + cleaned[2];
    }
    if (cleaned.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
    var r = parseInt(cleaned.substring(0, 2), 16);
    var g = parseInt(cleaned.substring(2, 4), 16);
    var b = parseInt(cleaned.substring(4, 6), 16);
    return [r, g, b];
  }

  // gamma 校正单个通道
  function gammaCorrect(channelValue) {
    var c = channelValue / 255;
    if (c <= 0.03928) {
      return c / 12.92;
    }
    return Math.pow((c + 0.055) / 1.055, 2.4);
  }

  // 计算相对亮度
  function relativeLuminance(hex) {
    var rgb = hexToRgb(hex);
    if (!rgb) return 0;
    return 0.2126 * gammaCorrect(rgb[0]) +
           0.7152 * gammaCorrect(rgb[1]) +
           0.0722 * gammaCorrect(rgb[2]);
  }

  // 对比度检查：返回 { ratio, passes, level }
  function checkContrast(foreground, background) {
    var fgL = relativeLuminance(foreground);
    var bgL = relativeLuminance(background);
    var lighter = Math.max(fgL, bgL);
    var darker = Math.min(fgL, bgL);
    var ratio = (lighter + 0.05) / (darker + 0.05);
    var rounded = Math.round(ratio * 100) / 100;

    var level;
    var passes;
    if (rounded >= CONTRAST_AAA_THRESHOLD) {
      level = "AAA";
      passes = true;
    } else if (rounded >= CONTRAST_AA_THRESHOLD) {
      level = "AA";
      passes = true;
    } else if (rounded >= CONTRAST_AA_LARGE_THRESHOLD) {
      level = "AA-Large";
      passes = false; // 仅大文字可通过，正常文字不通过
    } else {
      level = "fail";
      passes = false;
    }

    return {
      ratio: rounded,
      passes: passes,
      level: level,
      threshold: CONTRAST_AA_THRESHOLD,
      foreground: foreground,
      background: background
    };
  }

  // ===========================================================================
  // 智能省略（大字体处理）
  // 保留首尾字符 + 省略号，关键模块名不全部省略
  // ===========================================================================

  function smartEllipsis(text, maxLength) {
    var str = String(text == null ? "" : text);
    var limit = Number(maxLength);
    if (!Number.isFinite(limit) || limit < 4) limit = 8;
    if (str.length <= limit) return str;
    // 保留首尾字符 + 省略号
    var headLen = Math.max(1, Math.ceil((limit - 1) / 2));
    var tailLen = Math.max(1, Math.floor((limit - 1) / 2));
    return str.substring(0, headLen) + "…" + str.substring(str.length - tailLen);
  }

  // 关键模块名省略（保留更多首部字符，避免全部省略）
  function smartModuleEllipsis(name, maxLength) {
    var str = String(name == null ? "" : name);
    var limit = Number(maxLength);
    if (!Number.isFinite(limit) || limit < 6) limit = 12;
    if (str.length <= limit) return str;
    // 关键模块名：保留前 60% + 省略号 + 末尾 1 字符
    var headLen = Math.max(2, Math.ceil(limit * 0.6));
    var tailLen = 1;
    if (headLen + 1 + tailLen > limit) headLen = limit - 1 - tailLen;
    return str.substring(0, headLen) + "…" + str.substring(str.length - tailLen);
  }

  // ===========================================================================
  // 组件统一样式（fd-d4- 前缀）
  // 返回内联 <style> 块，供需要 D4 视觉增强的路由注入
  // ===========================================================================

  var D4_COMPONENT_STYLE_ID = "fd-d4-component-styles";

  function d4ComponentStylesBlock() {
    return `
<style id="${D4_COMPONENT_STYLE_ID}">
/* D4 统一组件样式 —— fd-d4- 前缀 */
.fd-d4-card{background:var(--reader-surface,#f7f4ef);border:1px solid var(--reader-border,#e0d9cf);border-radius:12px;padding:14px 16px;margin:8px 0;}
.fd-d4-input{display:block;width:100%;min-height:40px;padding:8px 12px;font-size:${MIN_TEXT_SIZE_PX}px;line-height:1.5;color:var(--reader-ink,#332c25);background:var(--reader-bg,#fff);border:1px solid var(--reader-border,#e0d9cf);border-radius:8px;font-family:${FONT_FALLBACK_CHAIN};}
.fd-d4-input:focus{outline:2px solid var(--reader-accent,#2f6373);outline-offset:1px;}
.fd-d4-button{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:8px 16px;font-size:${MIN_TEXT_SIZE_PX}px;font-weight:500;color:var(--reader-bg,#fff);background:var(--reader-accent,#2f6373);border:none;border-radius:8px;cursor:pointer;font-family:${FONT_FALLBACK_CHAIN};}
.fd-d4-button.is-secondary{color:var(--reader-accent,#2f6373);background:transparent;border:1px solid var(--reader-accent,#2f6373);}
.fd-d4-button.is-danger{color:#fff;background:var(--reader-error,#b3261e);}
.fd-d4-button:disabled{opacity:0.45;cursor:not-allowed;}
.fd-d4-segmented{display:inline-flex;background:var(--reader-surface,#f0ede8);border-radius:8px;padding:2px;gap:2px;}
.fd-d4-segmented-item{padding:6px 14px;font-size:${MIN_AUX_TEXT_SIZE_PX}px;border:none;background:transparent;border-radius:6px;cursor:pointer;color:var(--reader-secondary,#514a43);}
.fd-d4-segmented-item.is-active{background:var(--reader-bg,#fff);color:var(--reader-ink,#332c25);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,0.08);}
.fd-d4-dropdown{position:relative;display:inline-block;}
.fd-d4-dropdown-trigger{display:flex;align-items:center;gap:6px;min-height:40px;padding:8px 12px;font-size:${MIN_TEXT_SIZE_PX}px;background:var(--reader-bg,#fff);border:1px solid var(--reader-border,#e0d9cf);border-radius:8px;cursor:pointer;color:var(--reader-ink,#332c25);}
.fd-d4-dropdown-menu{position:absolute;top:calc(100% + 4px);left:0;min-width:160px;background:var(--reader-bg,#fff);border:1px solid var(--reader-border,#e0d9cf);border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.12);padding:4px 0;z-index:100;}
.fd-d4-dropdown-item{display:block;width:100%;padding:8px 14px;font-size:${MIN_TEXT_SIZE_PX}px;background:transparent;border:none;text-align:left;cursor:pointer;color:var(--reader-ink,#332c25);}
.fd-d4-dropdown-item:hover{background:var(--reader-surface,#f7f4ef);}
.fd-d4-toast{position:fixed;left:50%;bottom:80px;transform:translateX(-50%);padding:10px 18px;font-size:${MIN_TEXT_SIZE_PX}px;background:rgba(40,36,32,0.92);color:#fff;border-radius:20px;z-index:200;max-width:80vw;}
.fd-d4-dialog-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:300;}
.fd-d4-dialog{background:var(--reader-bg,#fff);border-radius:14px;padding:20px;max-width:320px;width:86%;box-shadow:0 8px 32px rgba(0,0,0,0.18);}
.fd-d4-dialog-title{font-size:16px;font-weight:600;color:var(--reader-ink,#332c25);margin:0 0 8px;}
.fd-d4-dialog-body{font-size:${MIN_TEXT_SIZE_PX}px;line-height:1.6;color:var(--reader-secondary,#514a43);margin:0 0 16px;}
.fd-d4-dialog-actions{display:flex;justify-content:flex-end;gap:8px;}
/* 信息密度：阅读型（宽松） */
.fd-d4-density-reading{padding:16px;line-height:1.8;font-size:${MIN_TEXT_SIZE_PX}px;}
.fd-d4-density-reading p{margin:0 0 12px;line-height:1.8;}
/* 信息密度：管理型（紧凑） */
.fd-d4-density-manage{padding:8px 12px;line-height:1.4;font-size:${MIN_TEXT_SIZE_PX}px;}
.fd-d4-density-manage p{margin:0 0 6px;line-height:1.4;}
/* 平板平衡 */
@media (min-width:900px){.fd-d4-tablet-content{max-width:680px;margin:0 auto;}.fd-d4-tablet-dock{flex:0 0 320px;}}
/* 对比度警告 */
.fd-d4-contrast-warning{display:flex;align-items:center;gap:8px;padding:8px 12px;background:#fff3e0;border:1px solid #ffb74d;border-radius:8px;font-size:${MIN_AUX_TEXT_SIZE_PX}px;color:#5d4037;}
.fd-d4-contrast-warning-icon{flex:0 0 auto;}
/* 最小字号守护：低于 12px 的文本提升 */
.fd-d4-readable{font-size:${MIN_TEXT_SIZE_PX}px !important;}
.fd-d4-readable-aux{font-size:${MIN_AUX_TEXT_SIZE_PX}px !important;}
</style>`.trim();
  }

  // ===========================================================================
  // 对比度警告渲染
  // ===========================================================================

  function renderContrastWarning(foreground, background, context) {
    var result = checkContrast(foreground, background);
    if (result.passes) return "";
    var ctx = context || "文字";
    return `<div class="fd-d4-contrast-warning" role="alert">
      <span class="fd-d4-contrast-warning-icon">${icon("alert", "fd-icon")}</span>
      <span>${esc(ctx)}对比度 ${result.ratio}:1 低于 WCAG AA 标准（${CONTRAST_AA_THRESHOLD}:1），请调整颜色以保证可读性。</span>
    </div>`;
  }

  // ===========================================================================
  // 主题预设渲染辅助
  // ===========================================================================

  // 获取主题预设
  function getThemePreset(themeKey) {
    return DEFAULT_THEME_PRESETS[themeKey] || DEFAULT_THEME_PRESETS.day;
  }

  // 获取全部主题预设（数组形式）
  function allThemePresets() {
    return Object.keys(DEFAULT_THEME_PRESETS).map(function (key) {
      var preset = DEFAULT_THEME_PRESETS[key];
      return Object.assign({ value: key }, preset);
    });
  }

  // 生成主题的 CSS 变量串（供内联 style 使用）
  function themePresetStyle(themeKey) {
    var p = getThemePreset(themeKey);
    return [
      "--reader-bg:" + esc(p.bg),
      "--reader-ink:" + esc(p.text),
      "--reader-secondary:" + esc(p.secondary),
      "--reader-accent:" + esc(p.accent),
      "--reader-surface:" + esc(p.surface),
      "--reader-border:" + esc(p.border),
      "--reader-error:" + esc(p.error)
    ].join(";");
  }

  // ===========================================================================
  // 概念路由渲染函数
  // 这些路由不存在于 route.schema.json，仅在直接调用时提供视觉增强版本
  // renderD4Route 对真实路由返回 null，不破坏 D3/W4 渲染
  // ===========================================================================

  // settings-theme：主题列表，展示 6 套默认主题
  function settingsThemeScreen(data, appState) {
    var presets = allThemePresets();
    var cards = presets.map(function (item) {
      var contrast = checkContrast(item.text, item.bg);
      var contrastBadge = contrast.passes
        ? `<span class="fd-d4-contrast-badge is-pass">对比度 ${contrast.ratio}:1</span>`
        : `<span class="fd-d4-contrast-badge is-fail">对比度 ${contrast.ratio}:1</span>`;
      return `
        <div class="fd-d4-card fd-d4-theme-card" style="${themePresetStyle(item.value)}">
          <div class="fd-d4-theme-swatch" style="background:${esc(item.bg)};color:${esc(item.text)}">
            <span>永</span>
          </div>
          <div class="fd-d4-theme-meta">
            <strong>${esc(item.name)}</strong>
            <small>${esc(item.scheme === "night" ? "夜间" : "白天")} · 配对：${esc(DEFAULT_THEME_PRESETS[item.pair] ? DEFAULT_THEME_PRESETS[item.pair].name : item.pair)}</small>
            ${contrastBadge}
          </div>
        </div>`;
    }).join("");

    return `
      <section class="fd-d4-density-manage" style="${themePresetStyle("day")}">
        <style scoped>
          .fd-d4-theme-card{display:flex;gap:12px;align-items:center;}
          .fd-d4-theme-swatch{width:48px;height:48px;border-radius:8px;display:grid;place-items:center;font-size:18px;font-weight:600;flex:0 0 auto;}
          .fd-d4-theme-meta{flex:1;min-width:0;}
          .fd-d4-theme-meta strong{display:block;font-size:${MIN_TEXT_SIZE_PX}px;margin-bottom:2px;}
          .fd-d4-theme-meta small{display:block;font-size:${MIN_AUX_TEXT_SIZE_PX}px;opacity:0.8;}
          .fd-d4-contrast-badge{display:inline-block;margin-top:4px;padding:2px 6px;font-size:${MIN_AUX_TEXT_SIZE_PX}px;border-radius:4px;}
          .fd-d4-contrast-badge.is-pass{background:#e8f5e9;color:#1b5e20;}
          .fd-d4-contrast-badge.is-fail{background:#fbe9e7;color:#b71c1c;}
        </style>
        ${d4ComponentStylesBlock()}
        <header style="margin-bottom:12px;">
          <h2 style="font-size:18px;margin:0 0 4px;">默认主题</h2>
          <p style="font-size:${MIN_AUX_TEXT_SIZE_PX}px;color:var(--reader-secondary,#514a43);margin:0;">6 套内置主题，均通过 WCAG AA 对比度校验</p>
        </header>
        <div class="fd-d4-theme-list">${cards}</div>
      </section>`;
  }

  // settings-theme-edit：主题编辑，对比度检查
  function settingsThemeEditScreen(data, appState) {
    var draft = (appState && appState.d4ThemeDraft) || { name: "", bg: "#ffffff", text: "#332c25", accent: "#2f6373" };
    var textContrast = checkContrast(draft.text, draft.bg);
    var accentContrast = checkContrast(draft.accent, draft.bg);
    var warnings = [];
    if (!textContrast.passes) {
      warnings.push(renderContrastWarning(draft.text, draft.bg, "正文文字"));
    }
    if (accentContrast.ratio < CONTRAST_AA_LARGE_THRESHOLD) {
      warnings.push(renderContrastWarning(draft.accent, draft.bg, "强调色"));
    }

    return `
      <section class="fd-d4-density-manage" style="${themePresetStyle("day")}">
        ${d4ComponentStylesBlock()}
        <header style="margin-bottom:12px;">
          <h2 style="font-size:18px;margin:0 0 4px;">编辑主题</h2>
          <p style="font-size:${MIN_AUX_TEXT_SIZE_PX}px;color:var(--reader-secondary,#514a43);margin:0;">实时对比度检查，确保 WCAG AA 合规</p>
        </header>
        <div style="margin-bottom:12px;">
          <label style="display:block;margin-bottom:6px;font-size:${MIN_TEXT_SIZE_PX}px;">主题名称</label>
          <input class="fd-d4-input" type="text" value="${esc(draft.name)}" placeholder="输入主题名称" />
        </div>
        <div style="margin-bottom:12px;">
          <label style="display:block;margin-bottom:6px;font-size:${MIN_TEXT_SIZE_PX}px;">背景色</label>
          <input class="fd-d4-input" type="color" value="${esc(draft.bg)}" />
        </div>
        <div style="margin-bottom:12px;">
          <label style="display:block;margin-bottom:6px;font-size:${MIN_TEXT_SIZE_PX}px;">文字色</label>
          <input class="fd-d4-input" type="color" value="${esc(draft.text)}" />
          <small style="display:block;margin-top:4px;font-size:${MIN_AUX_TEXT_SIZE_PX}px;color:${textContrast.passes ? "#1b5e20" : "#b71c1c"};">
            对比度 ${textContrast.ratio}:1 ${textContrast.passes ? "✓ 通过 " + textContrast.level : "✗ 未通过 AA（需 ≥ 4.5:1）"}
          </small>
        </div>
        <div style="margin-bottom:12px;">
          <label style="display:block;margin-bottom:6px;font-size:${MIN_TEXT_SIZE_PX}px;">强调色</label>
          <input class="fd-d4-input" type="color" value="${esc(draft.accent)}" />
          <small style="display:block;margin-top:4px;font-size:${MIN_AUX_TEXT_SIZE_PX}px;color:${accentContrast.ratio >= CONTRAST_AA_LARGE_THRESHOLD ? "#1b5e20" : "#b71c1c"};">
            对比度 ${accentContrast.ratio}:1 ${accentContrast.ratio >= CONTRAST_AA_LARGE_THRESHOLD ? "✓ 通过" : "✗ 未通过（需 ≥ 3:1）"}
          </small>
        </div>
        ${warnings.length > 0 ? `<div style="margin:12px 0;">${warnings.join("")}</div>` : ""}
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="fd-d4-button" type="button">保存主题</button>
          <button class="fd-d4-button is-secondary" type="button">取消</button>
        </div>
      </section>`;
  }

  // settings-font：字体管理，字体回退展示
  function settingsFontScreen(data, appState) {
    return `
      <section class="fd-d4-density-manage" style="${themePresetStyle("day")}">
        ${d4ComponentStylesBlock()}
        <header style="margin-bottom:12px;">
          <h2 style="font-size:18px;margin:0 0 4px;">字体管理</h2>
          <p style="font-size:${MIN_AUX_TEXT_SIZE_PX}px;color:var(--reader-secondary,#514a43);margin:0;">字体缺失时自动回退至下一可用字体</p>
        </header>
        <div class="fd-d4-card" style="margin-bottom:8px;">
          <strong style="display:block;font-size:${MIN_TEXT_SIZE_PX}px;margin-bottom:6px;">无衬线回退链</strong>
          <code style="display:block;font-size:${MIN_AUX_TEXT_SIZE_PX}px;white-space:pre-wrap;word-break:break-all;color:var(--reader-secondary,#514a43);">${esc(FONT_FALLBACK_CHAIN)}</code>
        </div>
        <div class="fd-d4-card" style="margin-bottom:8px;">
          <strong style="display:block;font-size:${MIN_TEXT_SIZE_PX}px;margin-bottom:6px;">衬线回退链</strong>
          <code style="display:block;font-size:${MIN_AUX_TEXT_SIZE_PX}px;white-space:pre-wrap;word-break:break-all;color:var(--reader-secondary,#514a43);">${esc(SERIF_FONT_FALLBACK_CHAIN)}</code>
        </div>
        <div class="fd-d4-card" style="font-family:${FONT_FALLBACK_CHAIN};">
          <strong style="display:block;font-size:${MIN_TEXT_SIZE_PX}px;margin-bottom:6px;">预览（无衬线）</strong>
          <p style="margin:0;font-size:${MIN_TEXT_SIZE_PX}px;line-height:1.8;">永和九年，岁在癸丑，暮春之初，会于会稽山阴之兰亭。</p>
        </div>
        <div class="fd-d4-card" style="font-family:${SERIF_FONT_FALLBACK_CHAIN};">
          <strong style="display:block;font-size:${MIN_TEXT_SIZE_PX}px;margin-bottom:6px;">预览（衬线）</strong>
          <p style="margin:0;font-size:${MIN_TEXT_SIZE_PX}px;line-height:1.8;">永和九年，岁在癸丑，暮春之初，会于会稽山阴之兰亭。</p>
        </div>
      </section>`;
  }

  // settings-display：显示设置，视口适配
  function settingsDisplayScreen(data, appState) {
    var viewportKeys = Object.keys(VIEWPORT_CONFIGS);
    var viewportItems = viewportKeys.map(function (key) {
      var config = VIEWPORT_CONFIGS[key];
      var isActive = d4VisualState.currentViewport === key;
      return `
        <button class="fd-d4-segmented-item ${isActive ? "is-active" : ""}" type="button" data-d4-viewport="${esc(key)}">
          ${esc(config.name)}<br><small style="font-size:10px;opacity:0.7;">${config.width}×${config.height}${config.fontScale !== 1.0 ? " · " + (config.fontScale * 100) + "%" : ""}</small>
        </button>`;
    }).join("");

    var currentConfig = getViewportConfig();
    var isTablet = isTabletViewport();
    var isLandscape = isLandscapeViewport();

    return `
      <section class="fd-d4-density-manage" style="${themePresetStyle("day")}">
        ${d4ComponentStylesBlock()}
        <header style="margin-bottom:12px;">
          <h2 style="font-size:18px;margin:0 0 4px;">显示设置</h2>
          <p style="font-size:${MIN_AUX_TEXT_SIZE_PX}px;color:var(--reader-secondary,#514a43);margin:0;">视口适配与显示校准</p>
        </header>
        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:8px;font-size:${MIN_TEXT_SIZE_PX}px;">验证视口</label>
          <div class="fd-d4-segmented" style="display:flex;flex-wrap:wrap;gap:4px;">
            ${viewportItems}
          </div>
        </div>
        <div class="fd-d4-card">
          <strong style="display:block;font-size:${MIN_TEXT_SIZE_PX}px;margin-bottom:8px;">当前视口信息</strong>
          <dl style="margin:0;font-size:${MIN_AUX_TEXT_SIZE_PX}px;line-height:1.8;">
            <dt style="display:inline-block;width:80px;color:var(--reader-secondary,#514a43);">名称</dt><dd style="display:inline;margin:0;">${esc(currentConfig.name)}</dd><br>
            <dt style="display:inline-block;width:80px;color:var(--reader-secondary,#514a43);">尺寸</dt><dd style="display:inline;margin:0;">${currentConfig.width}×${currentConfig.height}</dd><br>
            <dt style="display:inline-block;width:80px;color:var(--reader-secondary,#514a43);">字体缩放</dt><dd style="display:inline;margin:0;">${currentConfig.fontScale * 100}%</dd><br>
            <dt style="display:inline-block;width:80px;color:var(--reader-secondary,#514a43);">平板模式</dt><dd style="display:inline;margin:0;">${isTablet ? "是（正文最大宽度 680px）" : "否"}</dd><br>
            <dt style="display:inline-block;width:80px;color:var(--reader-secondary,#514a43);">横屏</dt><dd style="display:inline;margin:0;">${isLandscape ? "是" : "否"}</dd>
          </dl>
        </div>
        ${isTablet ? `<div class="fd-d4-tablet-content" style="margin-top:12px;"><p style="font-size:${MIN_AUX_TEXT_SIZE_PX}px;color:var(--reader-secondary,#514a43);">平板模式下正文区域已限制最大宽度，右侧 dock 视觉重量已校准。</p></div>` : ""}
      </section>`;
  }

  // ===========================================================================
  // 集成映射
  // 概念路由（不存在于 route.schema.json，仅当直接调用时生效）
  // ===========================================================================

  var INTEGRATION_MAP = {
    "settings-theme": "settingsThemeScreen",
    "settings-theme-edit": "settingsThemeEditScreen",
    "settings-font": "settingsFontScreen",
    "settings-display": "settingsDisplayScreen"
  };

  // ===========================================================================
  // 路由分发主入口（render-runtime.js dispatch hook 调用）
  // 返回 null 表示该路由不属于 D4 模块，交由后续 switch 处理
  // 注意：概念路由 settings-* 不存在于 route.schema.json，
  //       因此对真实路由一律返回 null，不破坏 D3/W4 渲染。
  // ===========================================================================

  function renderD4Route(route, data, appState) {
    // 概念路由仅在被显式传入时提供视觉增强版本
    // 真实路由（reader-full-theme 等）已由 W4/D3 处理，此处返回 null
    var fnName = INTEGRATION_MAP[route];
    if (!fnName) return null;
    var fn = d4Exports[fnName];
    if (typeof fn !== "function") return null;
    return fn(data, appState);
  }

  // ===========================================================================
  // 暴露 API
  // ===========================================================================

  var d4Exports = {
    // 路由分发主入口
    renderD4Route: renderD4Route,
    // 集成映射
    INTEGRATION_MAP: INTEGRATION_MAP,
    // D4 视觉状态
    state: d4VisualState,
    // 6 套默认主题预设
    DEFAULT_THEME_PRESETS: DEFAULT_THEME_PRESETS,
    // 视口配置
    VIEWPORT_CONFIGS: VIEWPORT_CONFIGS,
    // 字体回退链
    FONT_FALLBACK_CHAIN: FONT_FALLBACK_CHAIN,
    SERIF_FONT_FALLBACK_CHAIN: SERIF_FONT_FALLBACK_CHAIN,
    // 最小字号常量
    MIN_TEXT_SIZE_PX: MIN_TEXT_SIZE_PX,
    MIN_AUX_TEXT_SIZE_PX: MIN_AUX_TEXT_SIZE_PX,
    // 对比度阈值
    CONTRAST_AA_THRESHOLD: CONTRAST_AA_THRESHOLD,
    CONTRAST_AAA_THRESHOLD: CONTRAST_AAA_THRESHOLD,
    // 对比度检查器
    checkContrast: checkContrast,
    relativeLuminance: relativeLuminance,
    hexToRgb: hexToRgb,
    // 视口辅助
    getViewportConfig: getViewportConfig,
    isTabletViewport: isTabletViewport,
    isLandscapeViewport: isLandscapeViewport,
    // 智能省略
    smartEllipsis: smartEllipsis,
    smartModuleEllipsis: smartModuleEllipsis,
    // 组件样式
    d4ComponentStylesBlock: d4ComponentStylesBlock,
    // 对比度警告渲染
    renderContrastWarning: renderContrastWarning,
    // 主题预设辅助
    getThemePreset: getThemePreset,
    allThemePresets: allThemePresets,
    themePresetStyle: themePresetStyle,
    // 概念路由渲染函数
    settingsThemeScreen: settingsThemeScreen,
    settingsThemeEditScreen: settingsThemeEditScreen,
    settingsFontScreen: settingsFontScreen,
    settingsDisplayScreen: settingsDisplayScreen,
    // 辅助
    esc: esc,
    icon: icon
  };

  var d4PublicRouteSpecifications = {
    renderD4Route: { allowedRoutes: Object.keys(INTEGRATION_MAP), routeIndex: 0, passthroughUnowned: true },
    settingsThemeScreen: { allowedRoutes: ["settings-theme"], routeIndex: -1, fixedRoute: "settings-theme" },
    settingsThemeEditScreen: { allowedRoutes: ["settings-theme-edit"], routeIndex: -1, fixedRoute: "settings-theme-edit" },
    settingsFontScreen: { allowedRoutes: ["settings-font"], routeIndex: -1, fixedRoute: "settings-font" },
    settingsDisplayScreen: { allowedRoutes: ["settings-display"], routeIndex: -1, fixedRoute: "settings-display" }
  };
  d4Exports.PUBLIC_ROUTE_RENDERER_BINDINGS = Object.freeze(Object.keys(d4PublicRouteSpecifications).reduce(function (result, name) {
    result[name] = Object.freeze(d4PublicRouteSpecifications[name].allowedRoutes.slice());
    return result;
  }, {}));
  if (window.ReaderPublicRouteRendererAdmission && typeof window.ReaderPublicRouteRendererAdmission.guardModule === "function") {
    d4Exports = window.ReaderPublicRouteRendererAdmission.guardModule(d4Exports, d4PublicRouteSpecifications);
  }
  window.ReaderD4VisualPolishRenderers = d4Exports;
})(window);
