/**
 * W5 内容替换规则工作流 renderer 函数模块
 * -----------------------------------------------------------------------------
 * 职责：为 5 个 schema-only 路由 + 2 个 scaffold 占位路由提供完整 renderer 实现，
 *       覆盖「规则列表 → 新增 → 编辑 → 删除确认 → 启用/禁用 → 排序 → 正则校验 →
 *       原文/替换后预览 → 单书/全局作用范围 → 导入/导出 → 应用到当前正文 → 错误与撤销」
 *       的完整 CRUD 动作流。
 *
 * 约束：不编辑 render-runtime.js，仅通过 window 暴露 renderer 函数与 INTEGRATION_MAP。
 *       规则数据模拟持久化到 localStorage，key = reader-w5-replace-rules。
 *
 * INTEGRATION_MAP:
 *   reader-replace-delete-confirm  → readerReplaceDeleteConfirmScreen
 *   reader-replace-apply-result    → readerReplaceApplyResultScreen
 *   reader-replace-import-export   → readerReplaceImportExportScreen
 *   reader-replace-preview         → readerReplacePreviewScreen
 *   reader-replace-page            → readerReplacePageScreen
 *   content-replacement            → contentReplacementScreen
 *   reader-replace-overlay-v2      → readerReplaceOverlayV2Screen
 * -----------------------------------------------------------------------------
 */
(function attachReaderW5ReplaceRulesRenderers(window) {
  "use strict";

  // ============ 基础工具：转义 / 图标 / shell kit ============

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
      throw new Error("ReaderShellKit is required before w5-replace-rules-renderers.js");
    }
    return window.ReaderShellKit;
  }

  // ============ localStorage 规则存储 ============

  var STORAGE_KEY = "reader-w5-replace-rules";

  // 预置规则（与 render-runtime.js 中 readerReplacementRules 保持一致）
  function presetRules() {
    return [
      { id: "rain-name", title: "雨容称呼", enabled: true, pattern: "雨容", replacement: "雨蓉", scope: ["chapter"], scopeMode: "global", bookId: "", custom: false, order: 0 },
      { id: "old-name", title: "旧称统一", enabled: true, pattern: "老张", replacement: "张老", scope: ["chapter"], scopeMode: "global", bookId: "", custom: false, order: 1 },
      { id: "punctuation", title: "标点清理", enabled: false, pattern: "[，。]{2,}", replacement: "。", scope: ["chapter"], scopeMode: "global", bookId: "", custom: false, order: 2 },
      { id: "ad-filter", title: "广告过滤", enabled: true, pattern: "本章未完.*?点击", replacement: "", scope: ["chapter"], scopeMode: "global", bookId: "", custom: false, order: 3 }
    ];
  }

  // 作用范围选项
  function scopeOptions() {
    return [
      { value: "chapter", label: "正文" },
      { value: "title", label: "标题" }
    ];
  }

  // 从 localStorage 读取规则列表（读取失败时回退到预置规则）
  function loadRules() {
    try {
      var raw = window.localStorage ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map(normalizeRule);
        }
      }
    } catch (e) {
      // 读取失败，忽略并回退
    }
    return presetRules().map(normalizeRule);
  }

  // 写入规则列表到 localStorage
  function saveRules(rules) {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rules || []));
      }
    } catch (e) {
      // 写入失败，忽略（demo 模式不阻塞渲染）
    }
  }

  // 规则字段归一化
  function normalizeRule(rule) {
    var base = {
      id: rule.id || generateRuleId(),
      title: rule.title || "未命名规则",
      pattern: rule.pattern || "",
      replacement: rule.replacement || "",
      enabled: rule.enabled !== false,
      scope: Array.isArray(rule.scope) && rule.scope.length > 0 ? rule.scope : ["chapter"],
      scopeMode: rule.scopeMode === "book" ? "book" : "global",
      bookId: rule.bookId || "",
      custom: rule.custom !== false,
      order: Number.isFinite(rule.order) ? rule.order : 0
    };
    return base;
  }

  // 生成规则 ID
  function generateRuleId() {
    return "rule-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }

  // ============ 正则校验 ============

  // 校验正则模式：返回 { valid: boolean, error: string, regex: RegExp|null }
  function validatePattern(pattern) {
    if (!pattern) {
      return { valid: false, error: "正则模式不能为空", regex: null };
    }
    try {
      var regex = new RegExp(pattern, "g");
      return { valid: true, error: "", regex: regex };
    } catch (e) {
      return { valid: false, error: "正则语法错误：" + (e.message || String(e)), regex: null };
    }
  }

  // ============ 文本预览：应用规则到段落 ============

  // 从 data 读取正文段落
  function readerParagraphs(data) {
    var direct = data && data.reader && Array.isArray(data.reader.readingText) ? data.reader.readingText : [];
    if (direct.length > 0) {
      return direct.map(function (s) { return String(s || ""); }).filter(Boolean);
    }
    var pages = data && data.reader && Array.isArray(data.reader.readingPages) ? data.reader.readingPages : [];
    return pages
      .flatMap(function (page) { return Array.isArray(page.paragraphs) ? page.paragraphs : []; })
      .map(function (s) { return String(s || ""); })
      .filter(Boolean);
  }

  // 对单条文本应用单条规则，返回替换后的文本与命中次数
  function applyRuleToText(text, rule) {
    if (!rule || !rule.enabled || !rule.pattern) {
      return { text: text, hits: 0 };
    }
    var v = validatePattern(rule.pattern);
    if (!v.valid || !v.regex) {
      return { text: text, hits: 0 };
    }
    var count = 0;
    // 重置 lastIndex（因为带了 g 标志）
    v.regex.lastIndex = 0;
    var replaced = text.replace(v.regex, function () {
      count += 1;
      return rule.replacement || "";
    });
    return { text: replaced, hits: count };
  }

  // 对段落集合应用一组规则，返回 { paragraphs, totalHits, perRule }
  function applyRulesToParagraphs(paragraphs, rules) {
    var perRule = {};
    var totalHits = 0;
    var result = paragraphs.map(function (line) {
      var current = line;
      rules.forEach(function (rule) {
        if (!rule.enabled || !rule.pattern) return;
        var r = applyRuleToText(current, rule);
        current = r.text;
        if (r.hits > 0) {
          perRule[rule.id] = (perRule[rule.id] || 0) + r.hits;
          totalHits += r.hits;
        }
      });
      return current;
    });
    return { paragraphs: result, totalHits: totalHits, perRule: perRule };
  }

  // ============ 通用：ReaderShell 包装（L3 管理页用） ============

  // 读取上下文：阅读器主题样式（简化版，保证独立可用）
  function readerFrameStyle(data, appState) {
    var theme = (data && data.reader && data.reader.themes) || [];
    var current = theme[0] || { bg: "#fff7ec", ink: "#2b241d" };
    var overrides = appState && appState.readerThemeOverride ? appState.readerThemeOverride : null;
    var bg = overrides && overrides.bg ? overrides.bg : current.bg;
    var ink = overrides && overrides.ink ? overrides.ink : current.ink;
    return `--fd-reader-bg:${esc(bg)};--fd-reader-ink:${esc(ink)};`;
  }

  // W5 不能拥有一份独立的 ReaderShell 正文/顶栏实现。运行时会暴露与
  // readerStateScreen 相同的数据片段；仅在脚本被独立加载时使用本文件兜底。
  function runtimeSharedFragment(name, data, appState, fallback) {
    var api = window.ReaderRuntimeSharedFragments;
    if (api && typeof api[name] === "function") {
      try {
        var value = api[name](data, appState);
        if (value != null) return String(value);
      } catch (e) {
        // 独立 renderer smoke 或旧 runtime：继续使用下方兼容实现。
      }
    }
    return typeof fallback === "function" ? fallback() : String(fallback || "");
  }

  // 简化阅读正文层（用于 L3 页面背景，保持阅读上下文）
  function readerSurfaceHtml(data, appState) {
    var paragraphs = readerParagraphs(data).slice(0, 6);
    var title = (data && data.reader && data.reader.chapterTitle) || "第 32 章 雨夜";
    return `
      <div class="fd-ir-background-layer" aria-hidden="true" style="${readerFrameStyle(data, appState)}"></div>
      <article class="fd-ir-reading-layer" aria-label="正文排版层" style="${readerFrameStyle(data, appState)}">
        <h1>${esc(title)}</h1>
        ${paragraphs.map(function (p) { return `<p>${esc(p)}</p>`; }).join("")}
      </article>`;
  }

  // 简化顶栏覆盖层
  function readerTopOverlayHtml(data, appState) {
    var title = (data && data.reader && data.reader.chapterTitle) || "第 32 章 雨夜";
    var meta = (data && data.reader && data.reader.chapterMeta) || "第 32 章";
    return `
      <header class="fd-reader-top-bar" aria-label="阅读顶栏">
        <button type="button" data-route="reader" data-route-replace aria-label="返回阅读控制层">${icon("back", "fd-small-icon")}</button>
        <span><strong>${esc(title)}</strong><small>${esc(meta)}</small></span>
        <button type="button" aria-label="更多操作">${icon("more", "fd-small-icon")}</button>
      </header>`;
  }

  function readerBrightnessStateHostHtml(data, appState) {
    var config = (data && data.reader && data.reader.brightness) || {};
    var rawValue = appState && Number.isFinite(Number(appState.readerBrightness))
      ? Number(appState.readerBrightness)
      : Number(String(config.value == null ? "72" : config.value).replace("%", ""));
    var value = Math.max(0, Math.min(100, Number.isFinite(rawValue) ? rawValue : 72));
    var dim = Math.max(0, Math.min(0.32, (100 - value) / 280));
    return `<div class="fd-reader-global-brightness-dim" data-reader-brightness-dim aria-hidden="true" style="--reader-brightness:${esc(value)}%;--reader-brightness-dim:${esc(dim.toFixed(3))}"></div>`;
  }

  function readerSharedFragments(data, appState) {
    return {
      frameStyle: runtimeSharedFragment("frameStyle", data, appState, function () {
        return readerFrameStyle(data, appState);
      }),
      surfaceHtml: runtimeSharedFragment("surfaceHtml", data, appState, function () {
        return readerSurfaceHtml(data, appState);
      }),
      topOverlayHtml: runtimeSharedFragment("topOverlayHtml", data, appState, function () {
        return readerTopOverlayHtml(data, appState);
      }),
      stateHostHtml: runtimeSharedFragment("stateHostHtml", data, appState, function () {
        return readerBrightnessStateHostHtml(data, appState);
      })
    };
  }

  function renderW5ReaderShell(data, appState, options) {
    var fragments = readerSharedFragments(data, appState);
    var opts = options || {};
    var pageModeClass = appState && appState.readerPageMode === "vertical"
      ? " fd-reader-page-mode-vertical"
      : " fd-reader-page-mode-horizontal";
    var frameClass = String(opts.frameClass || "");
    if (frameClass.indexOf("fd-reader-page-mode-") < 0) frameClass += pageModeClass;
    return shellKit().renderReaderShell(Object.assign({}, opts, {
      frameClass: frameClass,
      frameStyle: fragments.frameStyle,
      stateHostHtml: `${fragments.stateHostHtml}${opts.stateHostHtml || ""}`,
      readingSurfaceHtml: fragments.surfaceHtml,
      overlayHtml: fragments.topOverlayHtml
    }));
  }

  function readerBrightnessRailHtml(data, appState) {
    var shared = window.ReaderRuntimeSharedFragments;
    if (shared && typeof shared.brightnessRailHtml === "function") {
      try {
        var sharedHtml = shared.brightnessRailHtml(data, appState);
        if (typeof sharedHtml === "string" && sharedHtml.trim()) return sharedHtml;
      } catch (_error) {
        // Standalone renderer smoke tests use the equivalent fallback below.
      }
    }
    var config = (data && data.reader && data.reader.brightness) || {};
    var min = Number.isFinite(Number(config.min)) ? Number(config.min) : 0;
    var max = Number.isFinite(Number(config.max)) ? Number(config.max) : 100;
    var rawValue = appState && Number.isFinite(Number(appState.readerBrightness))
      ? Number(appState.readerBrightness)
      : Number(String(config.value == null ? "72" : config.value).replace("%", ""));
    var value = Math.round(Math.max(min, Math.min(max, Number.isFinite(rawValue) ? rawValue : 72)));
    var isAuto = Boolean(appState && appState.readerBrightnessAuto);
    return `
      <aside class="fd-brightness-rail" aria-label="亮度控制" data-dev-region="BrightnessRail" style="--brightness:${esc(value)}%">
        ${icon("sun", "fd-small-icon")}
        <i data-reader-brightness-track role="slider" aria-label="调整亮度" aria-orientation="vertical" aria-valuemin="${esc(min)}" aria-valuemax="${esc(max)}" aria-valuenow="${esc(value)}" tabindex="0"><b></b></i>
        <button class="fd-brightness-auto-toggle${isAuto ? " is-active" : ""}" type="button" data-reader-brightness-auto aria-pressed="${isAuto ? "true" : "false"}" aria-label="${esc(config.autoText || "自动亮度")}">${esc(config.autoLabel || "A")}</button>
      </aside>`;
  }

  function readerModuleNavHtml(data) {
    var routeByType = {
      directory: "toc-bookmarks",
      tts: "tts",
      appearance: "reader-appearance",
      settings: "reader-settings"
    };
    var modules = data && data.reader && Array.isArray(data.reader.modules) ? data.reader.modules : [];
    return modules.map(function (item) {
      return `
        <button class="fd-reader-module" type="button" data-route="${esc(routeByType[item.type] || "reader")}" data-module="${esc(item.type || "")}">
          <span>${icon(item.icon || item.type, "fd-medium-icon")}</span>
          <small>${esc(item.label || item.type || "")}</small>
        </button>`;
    }).join("");
  }

  // ============ 1. reader-replace-delete-confirm：删除确认对话框 ============

  function readerReplaceDeleteConfirmScreen(data, route, appState) {
    var rules = loadRules();
    var targetId = (appState && appState.replaceRuleDeleteTarget) || (appState && appState.replaceRuleEditingId) || "";
    var target = rules.filter(function (r) { return r.id === targetId; })[0] || rules[0] || null;
    var targetTitle = target ? target.title : "所选规则";
    var targetPattern = target ? target.pattern : "";

    var dialogHtml = `
      <div class="fd-w5-replace-dialog-host" data-slot="dialogHost" aria-label="删除确认对话框">
        <div class="fd-w5-replace-dialog" role="alertdialog" aria-modal="true" aria-labelledby="fd-w5-replace-delete-title">
          <header class="fd-w5-replace-dialog-head">
            <span>${icon("warning", "fd-small-icon")}<strong id="fd-w5-replace-delete-title">删除替换规则</strong></span>
          </header>
          <div class="fd-w5-replace-dialog-body">
            <p>确定要删除替换规则吗？此操作不可撤销。</p>
            <article class="fd-w5-replace-delete-target" aria-label="待删除规则">
              <strong>${esc(targetTitle)}</strong>
              <small>${esc(targetPattern || "(无正则模式)")} → ${esc(target ? target.replacement || "(空)" : "(空)")}</small>
              <em>${target && target.scopeMode === "book" ? "单书作用范围" : "全局作用范围"}</em>
            </article>
            ${!target ? `<p class="fd-w5-replace-dialog-error" role="alert">未找到目标规则，可能已被删除。</p>` : ""}
          </div>
          <footer class="fd-w5-replace-dialog-actions">
            <button class="is-cancel" type="button" data-w5-replace-delete-cancel data-route-back aria-label="取消删除">取消</button>
            <button class="is-danger" type="button" data-w5-replace-delete-confirm="${esc(targetId)}" ${!target ? "disabled" : ""} aria-label="确认删除规则">确认删除</button>
          </footer>
        </div>
      </div>`;

    return renderW5ReaderShell(data, appState, {
      frameClass: "fd-reader-frame fd-reader-flow-frame fd-reader-mode-full fd-w5-replace-confirm-frame",
      readingSurfaceClass: "fd-reading-surface",
      overlayClass: "fd-reader-overlay fd-reader-full-overlay",
      bottomSheetHostClass: "fd-reader-full-host",
      moduleNavClass: "fd-reader-module-nav fd-reader-module-nav-empty",
      stateHostClass: "fd-reader-state-host",
      ariaLabel: "删除替换规则确认",
      bottomSheetHtml: `
        <section class="fd-reader-full-page-panel fd-w5-replace-confirm-panel" data-dev-region="W5ReplaceDeleteConfirm" aria-label="删除替换规则确认">
          <button class="fd-reader-full-grabber" type="button" data-route="reader-replace-page" data-route-replace aria-label="返回替换规则管理页"></button>
          <header class="fd-reader-full-head">
            <span>${icon("trash", "fd-small-icon")}<strong>删除确认</strong></span>
            <button type="button" data-route="reader-replace-page" data-route-replace>取消</button>
          </header>
          <div class="fd-reader-full-content">
            ${dialogHtml}
          </div>
        </section>`,
      moduleNavHtml: ""
    });
  }

  // ============ 2. reader-replace-apply-result：应用结果页 ============

  function readerReplaceApplyResultScreen(data, route, appState) {
    var rules = loadRules();
    var paragraphs = readerParagraphs(data);
    // 仅应用启用的规则
    var enabledRules = rules.filter(function (r) { return r.enabled; });
    var applied = applyRulesToParagraphs(paragraphs, enabledRules);

    // 构建每条规则的成功/失败明细
    var detailRows = enabledRules.map(function (rule) {
      var hits = applied.perRule[rule.id] || 0;
      var v = validatePattern(rule.pattern);
      var failed = !v.valid;
      return {
        id: rule.id,
        title: rule.title,
        pattern: rule.pattern,
        hits: hits,
        failed: failed,
        error: failed ? v.error : ""
      };
    });

    var successCount = detailRows.filter(function (r) { return !r.failed; }).length;
    var failCount = detailRows.filter(function (r) { return r.failed; }).length;
    var totalHits = applied.totalHits;

    var undoAvailable = totalHits > 0;

    var detailHtml = detailRows.map(function (row) {
      return `
        <article class="fd-w5-apply-row ${row.failed ? "is-failed" : "is-success"}" data-w5-apply-rule="${esc(row.id)}">
          <span class="fd-w5-apply-row-icon">${icon(row.failed ? "warning" : "check", "fd-small-icon")}</span>
          <div class="fd-w5-apply-row-body">
            <strong>${esc(row.title)}</strong>
            <small>${esc(row.pattern || "(无模式)")} → ${esc(row.replacement || "(空)")}</small>
            ${row.failed ? `<em class="fd-w5-apply-row-error">${esc(row.error)}</em>` : `<em class="fd-w5-apply-row-hits">${row.hits} 处替换</em>`}
          </div>
          <span class="fd-w5-apply-row-status">${row.failed ? "失败" : row.hits > 0 ? "已替换" : "未命中"}</span>
        </article>`;
    }).join("");

    var summaryHtml = `
      <section class="fd-w5-apply-summary" aria-label="应用结果摘要">
        <article><strong>${esc(String(totalHits))}</strong><small>总替换处</small></article>
        <article><strong>${esc(String(successCount))}</strong><small>成功规则</small></article>
        <article><strong>${esc(String(failCount))}</strong><small>失败规则</small></article>
        <article><strong>${esc(String(enabledRules.length))}</strong><small>参与规则</small></article>
      </section>`;

    var actionsHtml = `
      <footer class="fd-w5-apply-actions" aria-label="应用结果操作">
        <button class="is-primary" type="button" data-w5-apply-undo ${undoAvailable ? "" : "disabled"} aria-label="撤销本次替换">
          ${icon("back", "fd-small-icon")}<span>撤销替换</span>
        </button>
        <button type="button" data-route="reader-replace-preview" data-route-replace aria-label="查看替换预览">查看预览</button>
        <button type="button" data-route="reader-replace-page" data-route-replace aria-label="返回规则管理">返回管理</button>
      </footer>`;

    return renderW5ReaderShell(data, appState, {
      frameClass: "fd-reader-frame fd-reader-flow-frame fd-reader-mode-full fd-w5-replace-result-frame",
      readingSurfaceClass: "fd-reading-surface",
      overlayClass: "fd-reader-overlay fd-reader-full-overlay",
      bottomSheetHostClass: "fd-reader-full-host",
      moduleNavClass: "fd-reader-module-nav fd-reader-module-nav-empty",
      stateHostClass: "fd-reader-state-host",
      ariaLabel: "替换规则应用结果",
      bottomSheetHtml: `
        <section class="fd-reader-full-page-panel fd-w5-replace-result-panel" data-dev-region="W5ReplaceApplyResult" aria-label="替换规则应用结果">
          <button class="fd-reader-full-grabber" type="button" data-route="reader-replace-page" data-route-replace aria-label="返回替换规则管理页"></button>
          <header class="fd-reader-full-head">
            <span>${icon("check", "fd-small-icon")}<strong>应用结果</strong></span>
            <button type="button" data-route="reader-replace-page" data-route-replace>完成</button>
          </header>
          <div class="fd-reader-full-content">
            ${summaryHtml}
            <section class="fd-w5-apply-detail" aria-label="规则替换明细">
              <header><strong>规则明细</strong><small>共 ${esc(String(enabledRules.length))} 条启用规则</small></header>
              ${detailHtml || `<p class="fd-w5-apply-empty">没有启用的规则，无替换发生。</p>`}
            </section>
            ${actionsHtml}
          </div>
        </section>`,
      moduleNavHtml: ""
    });
  }

  // ============ 3. reader-replace-import-export：导入导出页 ============

  function readerReplaceImportExportScreen(data, route, appState) {
    var rules = loadRules();
    var exportJson = JSON.stringify(rules, null, 2);
    var importError = (appState && appState.replaceImportError) || "";
    var importPreview = (appState && appState.replaceImportPreview) || null;

    // 导入预览渲染
    var importPreviewHtml = "";
    if (importPreview && Array.isArray(importPreview.rules) && importPreview.rules.length > 0) {
      importPreviewHtml = `
        <section class="fd-w5-import-preview" aria-label="导入预览">
          <header><strong>导入预览</strong><small>${esc(String(importPreview.rules.length))} 条规则</small></header>
          <div class="fd-w5-import-preview-list">
            ${importPreview.rules.slice(0, 5).map(function (rule) {
              return `
                <article>
                  <strong>${esc(rule.title || "未命名")}</strong>
                  <small>${esc(rule.pattern || "(无模式)")} → ${esc(rule.replacement || "(空)")}</small>
                  <em>${rule.scopeMode === "book" ? "单书" : "全局"}</em>
                </article>`;
            }).join("")}
            ${importPreview.rules.length > 5 ? `<p class="fd-w5-import-preview-more">…还有 ${esc(String(importPreview.rules.length - 5))} 条</p>` : ""}
          </div>
          <div class="fd-w5-import-preview-actions">
            <button class="is-primary" type="button" data-w5-import-confirm aria-label="确认导入预览中的规则">确认导入</button>
            <button type="button" data-w5-import-cancel aria-label="取消导入">取消</button>
          </div>
        </section>`;
    }

    return renderW5ReaderShell(data, appState, {
      frameClass: "fd-reader-frame fd-reader-flow-frame fd-reader-mode-full fd-w5-replace-io-frame",
      readingSurfaceClass: "fd-reading-surface",
      overlayClass: "fd-reader-overlay fd-reader-full-overlay",
      bottomSheetHostClass: "fd-reader-full-host",
      moduleNavClass: "fd-reader-module-nav fd-reader-module-nav-empty",
      stateHostClass: "fd-reader-state-host",
      ariaLabel: "替换规则导入导出",
      bottomSheetHtml: `
        <section class="fd-reader-full-page-panel fd-w5-replace-io-panel" data-dev-region="W5ReplaceImportExport" aria-label="替换规则导入导出">
          <button class="fd-reader-full-grabber" type="button" data-route="reader-replace-page" data-route-replace aria-label="返回替换规则管理页"></button>
          <header class="fd-reader-full-head">
            <span>${icon("download", "fd-small-icon")}<strong>导入 / 导出</strong></span>
            <button type="button" data-route="reader-replace-page" data-route-replace>完成</button>
          </header>
          <div class="fd-reader-full-content">
            <section class="fd-w5-io-block fd-w5-io-export" aria-label="导出规则">
              <header><strong>导出规则</strong><small>JSON 格式，共 ${esc(String(rules.length))} 条</small></header>
              <div class="fd-w5-io-export-actions">
                <button class="is-primary" type="button" data-w5-export-file aria-label="导出为 JSON 文件">
                  ${icon("download", "fd-small-icon")}<span>导出为文件</span>
                </button>
                <button type="button" data-w5-export-clipboard aria-label="复制到剪贴板">
                  ${icon("copy", "fd-small-icon")}<span>复制到剪贴板</span>
                </button>
              </div>
              <pre class="fd-w5-io-export-preview" aria-label="导出 JSON 预览" data-w5-export-json>${esc(exportJson)}</pre>
            </section>
            <section class="fd-w5-io-block fd-w5-io-import" aria-label="导入规则">
              <header><strong>导入规则</strong><small>支持 JSON 文件或剪贴板文本</small></header>
              <div class="fd-w5-io-import-actions">
                <label class="fd-w5-io-import-file">
                  <input type="file" accept="application/json,.json" data-w5-import-file aria-label="选择 JSON 文件导入" hidden />
                  <button type="button" data-w5-import-file-trigger aria-label="从文件导入">
                    ${icon("upload", "fd-small-icon")}<span>从文件导入</span>
                  </button>
                </label>
                <button type="button" data-w5-import-clipboard aria-label="从剪贴板导入">
                  ${icon("paste", "fd-small-icon")}<span>从剪贴板导入</span>
                </button>
              </div>
              <textarea class="fd-w5-io-import-textarea" data-w5-import-text placeholder='粘贴规则 JSON，例如：\n[{"title":"示例","pattern":"雨容","replacement":"雨蓉","scope":["chapter"]}]' aria-label="导入 JSON 文本输入框"></textarea>
              <button class="is-primary" type="button" data-w5-import-parse aria-label="解析并预览导入内容">解析预览</button>
              ${importError ? `<p class="fd-w5-io-import-error" role="alert">${esc(importError)}</p>` : ""}
            </section>
            ${importPreviewHtml}
          </div>
        </section>`,
      moduleNavHtml: ""
    });
  }

  // ============ 4. reader-replace-preview：替换预览页 ============

  function readerReplacePreviewScreen(data, route, appState) {
    var rules = loadRules();
    var paragraphs = readerParagraphs(data).slice(0, 8);
    var enabledRules = rules.filter(function (r) { return r.enabled; });
    var applied = applyRulesToParagraphs(paragraphs, enabledRules);

    // 选择对比模式：左右对比（默认）或上下对比
    var compareMode = (appState && appState.replacePreviewMode) === "stack" ? "stack" : "side";

    // 构建对比行：原文段落 vs 替换后段落
    var compareRows = paragraphs.map(function (original, idx) {
      var replaced = applied.paragraphs[idx] || original;
      var changed = original !== replaced;
      return { original: original, replaced: replaced, changed: changed, index: idx };
    });

    // 仅展示有变化的段落 + 前后少量上下文
    var focusIndex = (appState && Number.isFinite(Number(appState.replacePreviewFocusIndex)))
      ? Number(appState.replacePreviewFocusIndex) : -1;

    var sideBySideHtml = compareRows.map(function (row) {
      return `
        <article class="fd-w5-preview-row ${row.changed ? "is-changed" : ""} ${row.index === focusIndex ? "is-focus" : ""}" data-w5-preview-row="${esc(String(row.index))}">
          <div class="fd-w5-preview-original">
            <header><small>原文 · 段 ${esc(String(row.index + 1))}</small></header>
            <p>${esc(row.original)}</p>
          </div>
          <div class="fd-w5-preview-replaced">
            <header><small>替换后 · ${row.changed ? "有变化" : "无变化"}</small></header>
            <p>${esc(row.replaced)}</p>
          </div>
        </article>`;
    }).join("");

    var stackHtml = compareRows.map(function (row) {
      return `
        <article class="fd-w5-preview-stack-row ${row.changed ? "is-changed" : ""} ${row.index === focusIndex ? "is-focus" : ""}" data-w5-preview-row="${esc(String(row.index))}">
          <header><small>段 ${esc(String(row.index + 1))}${row.changed ? " · 有变化" : " · 无变化"}</small></header>
          <div class="fd-w5-preview-original"><p>${esc(row.original)}</p></div>
          <div class="fd-w5-preview-replaced"><p>${esc(row.replaced)}</p></div>
        </article>`;
    }).join("");

    var bodyHtml = compareMode === "side" ? sideBySideHtml : stackHtml;

    var toolbarHtml = `
      <div class="fd-w5-preview-toolbar" aria-label="预览工具栏">
        <div class="fd-w5-preview-mode-switch" role="tablist" aria-label="对比模式">
          <button class="${compareMode === "side" ? "is-active" : ""}" type="button" data-w5-preview-mode="side" role="tab" aria-selected="${compareMode === "side"}">左右对比</button>
          <button class="${compareMode === "stack" ? "is-active" : ""}" type="button" data-w5-preview-mode="stack" role="tab" aria-selected="${compareMode === "stack"}">上下对比</button>
        </div>
        <span class="fd-w5-preview-stats" aria-label="替换统计">
          共 ${esc(String(applied.totalHits))} 处替换 · ${esc(String(enabledRules.length))} 条启用规则
        </span>
      </div>`;

    return renderW5ReaderShell(data, appState, {
      frameClass: "fd-reader-frame fd-reader-flow-frame fd-reader-mode-full fd-w5-replace-preview-frame",
      readingSurfaceClass: "fd-reading-surface",
      overlayClass: "fd-reader-overlay fd-reader-full-overlay",
      bottomSheetHostClass: "fd-reader-full-host",
      moduleNavClass: "fd-reader-module-nav fd-reader-module-nav-empty",
      stateHostClass: "fd-reader-state-host",
      ariaLabel: "替换规则预览",
      bottomSheetHtml: `
        <section class="fd-reader-full-page-panel fd-w5-replace-preview-panel" data-dev-region="W5ReplacePreview" aria-label="替换规则预览">
          <button class="fd-reader-full-grabber" type="button" data-route="reader-replace-page" data-route-replace aria-label="返回替换规则管理页"></button>
          <header class="fd-reader-full-head">
            <span>${icon("search", "fd-small-icon")}<strong>替换预览</strong></span>
            <button type="button" data-route="reader-replace-page" data-route-replace>完成</button>
          </header>
          <div class="fd-reader-full-content">
            ${toolbarHtml}
            <section class="fd-w5-preview-list fd-w5-preview-${esc(compareMode)}" aria-label="原文与替换后对比">
              ${bodyHtml || `<p class="fd-w5-preview-empty">暂无可预览的正文内容。</p>`}
            </section>
            <footer class="fd-w5-preview-actions" aria-label="预览操作">
              <button type="button" data-route="reader-replace-page" data-route-replace>返回管理</button>
              <button class="is-primary" type="button" data-route="reader-replace-apply-result" data-route-replace aria-label="应用到当前正文">应用到正文</button>
            </footer>
          </div>
        </section>`,
      moduleNavHtml: ""
    });
  }

  // ============ 5. reader-replace-page：替换规则全屏管理页（L3 控制页） ============

  function readerReplacePageScreen(data, route, appState) {
    var rules = loadRules();

    // 表单状态（新增/编辑共用）
    var formOpen = Boolean(appState && appState.replaceRuleFormOpen);
    var draft = (appState && appState.replaceRuleDraft) || { title: "", pattern: "", replacement: "", scope: ["chapter"], bookIds: ["long-night"], testText: "他愣了一下，随即点头；雨容站在窗前。\n雨容望着窗外连绵的雨，迟迟没有开口。\n老张收起信纸，转身离开房间。" };
    var error = (appState && appState.replaceRuleError) || "";
    var editingId = (appState && appState.replaceRuleEditingId) || "";
    var formTitle = editingId ? "编辑规则" : "新增规则";

    // 正则实时校验结果
    var patternValidation = draft.pattern ? validatePattern(draft.pattern) : null;
    var validationHtml = "";
    if (patternValidation) {
      validationHtml = patternValidation.valid
        ? `<p class="fd-w5-form-valid" role="status">${icon("check", "fd-small-icon")}<span>正则语法正确</span></p>`
        : `<p class="fd-w5-form-invalid" role="alert">${icon("warning", "fd-small-icon")}<span>${esc(patternValidation.error)}</span></p>`;
    }

    // 测试文本与替换后效果均固定为三行内容
    var livePreviewHtml = "";
    var sampleText = draft.testText || "他愣了一下，随即点头；雨容站在窗前。\n雨容望着窗外连绵的雨，迟迟没有开口。\n老张收起信纸，转身离开房间。";
    if (draft.pattern && sampleText) {
      var v = validatePattern(draft.pattern);
      if (v.valid && v.regex) {
        v.regex.lastIndex = 0;
        var previewResult = sampleText.replace(v.regex, draft.replacement || "");
        livePreviewHtml = `
          <div class="fd-w5-form-live-preview" aria-label="规则测试预览">
            <label><span>测试文本</span><textarea rows="3" data-w5-form-field="testText">${esc(sampleText)}</textarea></label>
            <section><strong>替换后效果</strong><p class="fd-w5-form-live-replaced">${esc(previewResult)}</p></section>
          </div>`;
      }
    }

    // 作用范围选项
    var scopes = scopeOptions();

    // 规则列表行：名称、正则模式、替换文本、启用状态、作用范围
    var ruleRowsHtml = rules.map(function (rule, idx) {
      var scopeLabel = (rule.scope || []).map(function (s) {
        var opt = scopes.filter(function (o) { return o.value === s; })[0];
        return opt ? opt.label : s;
      }).join("、") || "正文";
      var scopeModeLabel = rule.bookIds && rule.bookIds.length ? `${rule.bookIds.length} 本书` : "全部书籍";
      return `
        <article class="fd-w5-rule-row ${rule.enabled ? "is-on" : ""}" data-w5-rule-item="${esc(rule.id)}" data-w5-rule-order="${esc(String(idx))}">
          <div class="fd-w5-rule-row-main">
            <button class="fd-w5-rule-toggle" type="button" data-w5-rule-toggle="${esc(rule.id)}" aria-pressed="${rule.enabled ? "true" : "false"}" aria-label="切换规则 ${esc(rule.title)} 启用状态">
              <span class="fd-w5-switch ${rule.enabled ? "is-on" : ""}" aria-hidden="true"><i></i></span>
            </button>
            <div class="fd-w5-rule-row-info">
              <strong>${esc(rule.title)}${rule.custom ? "<em>自定义</em>" : "<em>预置</em>"}</strong>
              <small class="fd-w5-rule-pattern">${esc(rule.pattern || "(无模式)")} → ${esc(rule.replacement || "(空)")}</small>
              <span class="fd-w5-rule-scope">
                <em class="fd-w5-scope-mode">${scopeModeLabel}</em>
                <span class="fd-w5-scope-targets">${esc(scopeLabel)}</span>
              </span>
            </div>
          </div>
          <div class="fd-w5-rule-row-actions">
            <button type="button" data-w5-rule-edit="${esc(rule.id)}" aria-label="编辑规则 ${esc(rule.title)}">${icon("edit", "fd-small-icon")}</button>
            <button type="button" data-w5-rule-delete="${esc(rule.id)}" aria-label="删除规则 ${esc(rule.title)}">${icon("trash", "fd-small-icon")}</button>
          </div>
        </article>`;
    }).join("");

    // 新增/编辑表单
    var formHtml = formOpen ? `
      <section class="fd-w5-rule-form" data-w5-rule-form aria-label="${esc(formTitle)}">
        <button class="fd-w5-form-backdrop" type="button" data-w5-rule-cancel aria-label="关闭编辑规则窗口"></button>
        <div class="fd-w5-rule-form-dialog">
        <header><strong>${esc(formTitle)}</strong><button type="button" data-w5-rule-cancel aria-label="关闭">${icon("close", "fd-small-icon")}</button></header>
        <label class="fd-w5-form-field">
          <span>名称</span>
          <input type="text" data-w5-form-field="title" value="${esc(draft.title)}" placeholder="规则名称" maxlength="12" />
        </label>
        <label class="fd-w5-form-field">
          <span>正则模式</span>
          <input type="text" data-w5-form-field="pattern" value="${esc(draft.pattern)}" placeholder="如：雨容 或 [，。]{2,}" />
        </label>
        ${validationHtml}
        <label class="fd-w5-form-field">
          <span>替换为</span>
          <input type="text" data-w5-form-field="replacement" value="${esc(draft.replacement)}" placeholder="如：雨蓉（可为空表示删除）" />
        </label>
        <fieldset class="fd-w5-form-field fd-w5-form-scope" aria-label="作用范围">
          <legend>作用范围</legend>
          <div class="fd-w5-scope-options">
            ${scopes.map(function (option) {
              var checked = (draft.scope || []).indexOf(option.value) >= 0;
              return `
                <label class="${checked ? "is-active" : ""}">
                  <input type="checkbox" data-w5-form-scope="${esc(option.value)}" ${checked ? "checked" : ""} />
                  <span>${esc(option.label)}</span>
                </label>`;
            }).join("")}
          </div>
        </fieldset>
        <fieldset class="fd-w5-form-field fd-w5-form-books" aria-label="作用书籍">
          <legend>作用书籍</legend>
          <div class="fd-w5-book-options">
            <label><input type="checkbox" data-w5-form-book="all"><span>全部书籍</span></label>
            <label class="is-current is-active"><input type="checkbox" data-w5-form-book="long-night" checked><span>长夜余火 <em>当前</em></span></label>
            <label><input type="checkbox" data-w5-form-book="mystery-lord"><span>诡秘之主</span></label>
            <label><input type="checkbox" data-w5-form-book="three-body"><span>三体</span></label>
            <label><input type="checkbox" data-w5-form-book="bright-moon"><span>明月纪事</span></label>
          </div>
        </fieldset>
        ${livePreviewHtml}
        ${error ? `<p class="fd-w5-form-error" role="alert">${esc(error)}</p>` : ""}
        <div class="fd-w5-form-actions">
          <button class="is-cancel" type="button" data-w5-rule-cancel>取消</button>
          <button class="is-primary" type="button" data-w5-rule-save ${patternValidation && !patternValidation.valid ? "disabled" : ""}>${editingId ? "保存修改" : "添加规则"}</button>
        </div>
        </div>
      </section>` : "";

    return renderW5ReaderShell(data, appState, {
      frameClass: "fd-reader-frame fd-reader-flow-frame fd-reader-mode-full fd-w5-replace-page-frame",
      readingSurfaceClass: "fd-reading-surface",
      overlayClass: "fd-reader-overlay fd-reader-full-overlay",
      bottomSheetHostClass: "fd-reader-full-host",
      moduleNavClass: "fd-reader-module-nav fd-reader-module-nav-empty",
      stateHostClass: "fd-reader-state-host",
      ariaLabel: "替换规则管理",
      bottomSheetHtml: `
        <section class="fd-reader-full-page-panel fd-w5-replace-page-panel" data-dev-region="W5ReplacePage" aria-label="替换规则全屏管理">
          <button class="fd-reader-full-grabber" type="button" data-route="content-replacement" data-route-replace aria-label="收起到替换覆盖层"></button>
          <header class="fd-reader-full-head">
            <span>${icon("reader-content-replace", "fd-small-icon")}<strong>替换规则管理</strong></span>
            <button type="button" data-route="reader" data-route-replace>完成</button>
          </header>
          <div class="fd-reader-full-content">
            <div class="fd-w5-page-toolbar" aria-label="规则管理工具栏">
              <button class="fd-w5-add-entry" type="button" data-w5-rule-add ${formOpen ? "disabled" : ""} aria-label="新增替换规则">
                ${icon("add", "fd-small-icon")}<span>新增规则</span>
              </button>
              <div class="fd-w5-page-toolbar-secondary">
                <button type="button" data-route="reader-replace-import-export" data-route-replace aria-label="导入导出规则">
                  ${icon("upload", "fd-small-icon")}<span>导入</span>
                </button>
                <button type="button" data-route="reader-replace-import-export" data-route-replace aria-label="导出规则">
                  ${icon("download", "fd-small-icon")}<span>导出</span>
                </button>
              </div>
            </div>
            <section class="fd-w5-rule-list" aria-label="替换规则列表">
              ${ruleRowsHtml || `<p class="fd-w5-rule-empty">暂无规则，点击「新增规则」创建第一条。</p>`}
            </section>
            ${formHtml}
          </div>
        </section>`,
      moduleNavHtml: ""
    });
  }

  // ============ 6. content-replacement：替换规则覆盖层（L2 面板） ============

  function contentReplacementScreen(data, route, appState) {
    var rules = loadRules();
    var formOpen = Boolean(appState && appState.replaceRuleFormOpen);
    var draft = (appState && appState.replaceRuleDraft) || { title: "", pattern: "", replacement: "", scope: ["chapter"], scopeMode: "global", bookId: "" };
    var error = (appState && appState.replaceRuleError) || "";
    var editingId = (appState && appState.replaceRuleEditingId) || "";
    var formTitle = editingId ? "编辑规则" : "新增规则";
    var scopes = scopeOptions();

    // L2 面板：紧凑列表 + 快速开关
    var ruleListHtml = rules.map(function (rule) {
      return `
        <article class="fd-w5-overlay-rule-row ${rule.enabled ? "is-on" : ""}" data-w5-rule-item="${esc(rule.id)}">
          <button class="fd-w5-overlay-rule-toggle" type="button" data-w5-rule-toggle="${esc(rule.id)}" aria-pressed="${rule.enabled ? "true" : "false"}" aria-label="切换规则 ${esc(rule.title)}">
            <strong><span>${esc(rule.title)}</span>${rule.custom ? "<em>自定义</em>" : "<em>预置</em>"}</strong>
            <small>${esc(rule.pattern || "")} → ${esc(rule.replacement || "(空)")}</small>
            <span class="fd-w5-switch ${rule.enabled ? "is-on" : ""}" aria-hidden="true"><i></i></span>
          </button>
          <div class="fd-w5-overlay-rule-actions">
            <button type="button" data-w5-rule-edit="${esc(rule.id)}" aria-label="编辑规则 ${esc(rule.title)}">${icon("edit", "fd-small-icon")}</button>
            <button type="button" data-w5-rule-delete="${esc(rule.id)}" aria-label="删除规则 ${esc(rule.title)}">${icon("trash", "fd-small-icon")}</button>
          </div>
        </article>`;
    }).join("");

    var formHtml = formOpen ? `
      <section class="fd-w5-overlay-form" data-w5-rule-form aria-label="${esc(formTitle)}">
        <header><strong>${esc(formTitle)}</strong></header>
        <label class="fd-w5-form-field">
          <span>名称</span>
          <input type="text" data-w5-form-field="title" value="${esc(draft.title)}" placeholder="规则名称" maxlength="12" />
        </label>
        <label class="fd-w5-form-field">
          <span>正则</span>
          <input type="text" data-w5-form-field="pattern" value="${esc(draft.pattern)}" placeholder="如：雨容" />
        </label>
        <label class="fd-w5-form-field">
          <span>替换为</span>
          <input type="text" data-w5-form-field="replacement" value="${esc(draft.replacement)}" placeholder="如：雨蓉" />
        </label>
        <fieldset class="fd-w5-form-field fd-w5-form-scope" aria-label="作用范围">
          <legend>作用范围</legend>
          <div class="fd-w5-scope-options">
            ${scopes.map(function (option) {
              var checked = (draft.scope || []).indexOf(option.value) >= 0;
              return `
                <label class="${checked ? "is-active" : ""}">
                  <input type="checkbox" data-w5-form-scope="${esc(option.value)}" ${checked ? "checked" : ""} />
                  <span>${esc(option.label)}</span>
                </label>`;
            }).join("")}
          </div>
        </fieldset>
        ${error ? `<p class="fd-w5-form-error" role="alert">${esc(error)}</p>` : ""}
        <div class="fd-w5-form-actions">
          <button class="is-cancel" type="button" data-w5-rule-cancel>取消</button>
          <button class="is-primary" type="button" data-w5-rule-save>${editingId ? "保存修改" : "添加规则"}</button>
        </div>
      </section>` : "";

    // L2 覆盖层：使用 ReaderShell，底部 sheet 承载紧凑面板
    return renderW5ReaderShell(data, appState, {
      frameClass: "fd-reader-frame fd-reader-flow-frame fd-reader-mode-control fd-w5-replace-overlay-frame",
      readingSurfaceClass: "fd-reading-surface",
      overlayClass: "fd-reader-overlay",
      bottomSheetHostClass: "fd-reader-sheet",
      moduleNavClass: "fd-reader-module-nav",
      accessoryHostClass: "fd-reader-accessory-host",
      accessoryHtml: readerBrightnessRailHtml(data, appState),
      stateHostClass: "fd-reader-state-host",
      ariaLabel: "内容替换覆盖层",
      bottomSheetHtml: `
        <section class="fd-reader-module-panel fd-reader-quick-detail fd-w5-overlay-panel" data-dev-region="W5ContentReplacement" aria-label="内容替换覆盖层">
          <header class="fd-w5-overlay-head">
            <span><strong>内容替换</strong><small>${esc(String(rules.length))} 条规则</small></span>
            <div class="fd-w5-overlay-head-actions">
              <button type="button" data-route="reader-replace-page" data-route-replace aria-label="展开全屏管理">${icon("expand", "fd-small-icon")}</button>
              <button type="button" data-route="reader" data-route-replace aria-label="关闭覆盖层">${icon("close", "fd-small-icon")}</button>
            </div>
          </header>
          <div class="fd-w5-overlay-body">
            <div class="fd-w5-overlay-toolbar">
              <button type="button" data-w5-rule-add ${formOpen ? "disabled" : ""} aria-label="新增替换规则">
                ${icon("add", "fd-small-icon")}<span>新增</span>
              </button>
              <button type="button" data-route="reader-replace-preview" data-route-replace aria-label="预览替换">
                ${icon("search", "fd-small-icon")}<span>预览</span>
              </button>
              <button type="button" data-route="reader-replace-apply-result" data-route-replace aria-label="应用到正文">
                ${icon("check", "fd-small-icon")}<span>应用</span>
              </button>
            </div>
            <div class="fd-w5-overlay-rule-list">
              ${ruleListHtml || `<p class="fd-w5-rule-empty">暂无规则</p>`}
            </div>
            ${formHtml}
          </div>
        </section>`,
      moduleNavHtml: readerModuleNavHtml(data)
    });
  }

  // ============ 7. reader-replace-overlay-v2：替换规则覆盖层 v2（L2 面板） ============

  function readerReplaceOverlayV2Screen(data, route, appState) {
    var rules = loadRules();
    var formOpen = Boolean(appState && appState.replaceRuleFormOpen);
    var draft = (appState && appState.replaceRuleDraft) || { title: "", pattern: "", replacement: "", scope: ["chapter"], scopeMode: "global", bookId: "" };
    var error = (appState && appState.replaceRuleError) || "";
    var editingId = (appState && appState.replaceRuleEditingId) || "";
    var formTitle = editingId ? "编辑规则" : "新增规则";
    var scopes = scopeOptions();

    // v2 增强：显示作用范围模式徽标 + 命中统计（简化：基于第一段正文）
    var sampleText = readerParagraphs(data)[0] || "";
    var ruleRowsHtml = rules.map(function (rule) {
      var v = validatePattern(rule.pattern);
      var hits = 0;
      if (v.valid && v.regex && sampleText) {
        v.regex.lastIndex = 0;
        hits = (sampleText.match(v.regex) || []).length;
      }
      var scopeModeLabel = rule.bookIds && rule.bookIds.length ? `${rule.bookIds.length} 本书` : "全部书籍";
      return `
        <article class="fd-w5-overlay-v2-rule-row ${rule.enabled ? "is-on" : ""}" data-w5-rule-item="${esc(rule.id)}">
          <button class="fd-w5-overlay-v2-rule-toggle" type="button" data-w5-rule-toggle="${esc(rule.id)}" aria-pressed="${rule.enabled ? "true" : "false"}" aria-label="切换规则 ${esc(rule.title)}">
            <span class="fd-w5-switch ${rule.enabled ? "is-on" : ""}" aria-hidden="true"><i></i></span>
            <strong>${esc(rule.title)}</strong>
          </button>
        </article>`;
    }).join("");

    return renderW5ReaderShell(data, appState, {
      frameClass: "fd-reader-frame fd-reader-flow-frame fd-reader-mode-control fd-w5-replace-overlay-v2-frame",
      readingSurfaceClass: "fd-reading-surface",
      overlayClass: "fd-reader-overlay",
      bottomSheetHostClass: "fd-reader-sheet",
      moduleNavClass: "fd-reader-module-nav",
      accessoryHostClass: "fd-reader-accessory-host",
      accessoryHtml: readerBrightnessRailHtml(data, appState),
      stateHostClass: "fd-reader-state-host",
      ariaLabel: "内容替换覆盖层 V2",
      bottomSheetHtml: `
        <button class="fd-reader-grabber" type="button" data-route="reader-replace-page" data-route-replace aria-label="上拉进入替换规则完整控制页"></button>
        <section class="fd-reader-module-panel fd-reader-quick-detail fd-w5-overlay-v2-panel" data-dev-region="W5ReplaceOverlayV2" aria-label="内容替换覆盖层 V2">
          <header class="fd-w5-overlay-v2-head">
            <span><strong>替换规则</strong></span>
            <div class="fd-w5-overlay-v2-head-actions">
              <button type="button" data-route="reader" data-route-replace aria-label="关闭覆盖层">${icon("close", "fd-small-icon")}</button>
            </div>
          </header>
          <div class="fd-w5-overlay-v2-body">
            <div class="fd-w5-overlay-v2-rule-list">
              ${ruleRowsHtml || `<p class="fd-w5-rule-empty">暂无规则</p>`}
            </div>
            <footer class="fd-w5-overlay-v2-footer">
              <button type="button" data-route="reader-replace-preview" data-route-replace>${icon("search", "fd-small-icon")}<span>预览效果</span></button>
              <button class="is-primary" type="button" data-route="reader-replace-page" data-route-replace>${icon("settings", "fd-small-icon")}<span>完整管理</span></button>
            </footer>
          </div>
        </section>`,
      moduleNavHtml: readerModuleNavHtml(data)
    });
  }

  // ============ 暴露 API ============

  var INTEGRATION_MAP = {
    "reader-replace-delete-confirm": "readerReplaceDeleteConfirmScreen",
    "reader-replace-apply-result": "readerReplaceApplyResultScreen",
    "reader-replace-import-export": "readerReplaceImportExportScreen",
    "reader-replace-preview": "readerReplacePreviewScreen",
    "reader-replace-page": "readerReplacePageScreen",
    "content-replacement": "readerReplaceOverlayV2Screen",
    "reader-replace-overlay-v2": "readerReplaceOverlayV2Screen"
  };

  window.ReaderW5ReplaceRulesRenderers = {
    // 集成映射：路由 → renderer 函数名
    INTEGRATION_MAP: INTEGRATION_MAP,
    // 7 个 renderer 函数
    readerReplaceDeleteConfirmScreen: readerReplaceDeleteConfirmScreen,
    readerReplaceApplyResultScreen: readerReplaceApplyResultScreen,
    readerReplaceImportExportScreen: readerReplaceImportExportScreen,
    readerReplacePreviewScreen: readerReplacePreviewScreen,
    readerReplacePageScreen: readerReplacePageScreen,
    contentReplacementScreen: contentReplacementScreen,
    readerReplaceOverlayV2Screen: readerReplaceOverlayV2Screen,
    // 规则存储 API（供事件处理层调用）
    store: {
      STORAGE_KEY: STORAGE_KEY,
      load: loadRules,
      save: saveRules,
      normalize: normalizeRule,
      generateId: generateRuleId,
      preset: presetRules,
      scopeOptions: scopeOptions
    },
    // 正则校验 API
    validatePattern: validatePattern,
    // 文本预览 API
    applyRulesToParagraphs: applyRulesToParagraphs,
    applyRuleToText: applyRuleToText,
    readerParagraphs: readerParagraphs
  };
})(window);
