/**
 * W3 换源工作流 renderer 函数模块
 * -----------------------------------------------------------------------------
 * 为 Reader-UI Demo 的 W3 换源工作流提供 6 个 schema-only 路由的专用 renderer，
 * 以及 2 个已审计路由（source-switch / source-switch-results）的状态变体增强。
 *
 * 设计要点：
 *   1. 所有换源状态页统一使用 FlowShell，保证横向流程中仍可见阅读上下文。
 *   2. stepHtml 中渲染"阅读续读层"，让用户在换源期间仍能看到当前章节内容，
 *      底部阅读控制层在 CSS 层级上保持可操作（fd-w3-reader-control-overlay）。
 *   3. 三套几何在 CSS class 上区分：
 *        - 手机：fd-w3-geom-phone（sheet 自底向上滑入）
 *        - 横屏：fd-w3-geom-landscape（左右分栏，阅读层 + 换源面板）
 *        - 平板：fd-w3-geom-tablet-dock（换源面板作为 dock 浮于阅读层之上）
 *   4. source-switch-loading 不污染返回栈：返回按钮使用 data-route-replace。
 *   5. source-switch-rollback 为确认对话框形态，明确"回滚到 [原书源名]"。
 *   6. source-switch-preview 对比新旧源的目录差异或最新章节。
 *
 * 依赖：window.ReaderShellKit（renderFlowShell / icon / esc）
 * 可选依赖：window.ReaderRuntimeSharedFragments.originReaderScreen，用于原样复用
 * 来源阅读页；接口缺失或渲染失败时保留自包含的简化续读层作为兼容 fallback。
 *
 * 集成方式（INTEGRATION_MAP 见文件末尾）：
 *   在 render-runtime.js 的 renderRoute switch 中加入：
 *     case "source-switch-empty":   return w3Renderers.sourceSwitchEmptyScreen(data, appState);
 *     case "source-switch-error":   return w3Renderers.sourceSwitchErrorScreen(data, appState);
 *     ...
 *   本模块只创建 renderer 函数，不修改 render-runtime.js。
 */
(function attachW3SourceSwitchRenderers(window) {
  "use strict";

  // —— 基础工具（与 render-runtime.js 保持同名同行为，便于将来合并） ——

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function shellKit() {
    if (!window.ReaderShellKit) {
      throw new Error("ReaderShellKit is required before w3-source-switch-renderers.js");
    }
    return window.ReaderShellKit;
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

  // —— 换源工作流数据提取 ——

  // 从 fixture 的 data.flow.candidates 中找出当前书源
  function currentSource(data) {
    const candidates = (data && data.flow && data.flow.candidates) || [];
    return candidates.find((item) => item && item.state === "当前") || candidates[0] || null;
  }

  // 取候选源中除当前源外第一个可用源（用于 loading / preview 的目标源）
  function targetSource(data) {
    const candidates = (data && data.flow && data.flow.candidates) || [];
    const current = currentSource(data);
    return (
      candidates.find((item) => item && item.state !== "当前" && item.state !== "失效" && item.state !== "落后") ||
      candidates.find((item) => item && item !== current) ||
      null
    );
  }

  // 当前阅读上下文（书名 + 章节 + 简短正文预览）
  function readerContext(data) {
    const reader = (data && data.reader) || {};
    const flow = (data && data.flow) || {};
    const current = currentSource(data) || {};
    return {
      title: reader.title || flow.title || "长夜余火",
      chapter: flow.chapter || reader.chapterTitle || "第 32 章 雨夜",
      sourceName: current.source || reader.sourceLine || "优书网",
      sourceMeta: current.match || current.speed || "120 ms",
      previewText: (reader.readingText && reader.readingText[0]) || "雨声在窗外连成一片，像无数细小的针，密密地刺在玻璃上。"
    };
  }

  // —— 几何 class 工具：手机 sheet / 横屏分栏 / 平板 dock ——

  function geometryClasses() {
    // 同一帧上同时挂三套几何 class，由 06-responsive.css 的 viewport 选择器分别激活
    return "fd-w3-geom-phone fd-w3-geom-landscape fd-w3-geom-tablet-dock";
  }

  // —— 阅读续读层（换源期间保持阅读上下文） ——

  // 顶部阅读信息条（书名 / 章节 / 当前源）
  function readerTopStripHtml(ctx) {
    return `
      <header class="fd-w3-reader-top" data-dev-region="W3ReaderTopStrip" aria-label="阅读上下文信息">
        <span class="fd-w3-reader-top-title">${esc(ctx.title)}</span>
        <span class="fd-w3-reader-top-chapter">${esc(ctx.chapter)}</span>
        <span class="fd-w3-reader-top-source">${icon("source-switch", "fd-small-icon")}<em>${esc(ctx.sourceName)}</em></span>
      </header>`;
  }

  // 底部阅读控制层占位（CSS 层级上保持可操作，不污染返回栈）
  function readerBottomControlOverlayHtml(data, appState) {
    // 这里只渲染阅读控制层的宿主结构，具体按钮由 render-runtime.js 的 readerBottomSheetHtml
    // 在集成时注入；独立运行时显示简化版控制条以保证可操作性。
    const ctx = readerContext(data);
    return `
      <section class="fd-w3-reader-control-overlay" data-w3-reader-control-overlay aria-label="换源期间可操作的阅读控制层">
        <nav class="fd-w3-reader-control-nav" aria-label="阅读模块导航">
          <button type="button" data-route="reader-directory-overlay-v2" aria-label="目录">${icon("directory", "fd-small-icon")}</button>
          <button type="button" data-route="reader-appearance-overlay-v2" aria-label="外观">${icon("appearance", "fd-small-icon")}</button>
          <button type="button" data-route="reader-settings-overlay-v2" aria-label="设置">${icon("settings", "fd-small-icon")}</button>
          <button type="button" data-route="reader-tts-overlay-v2" aria-label="朗读">${icon("tts", "fd-small-icon")}</button>
        </nav>
        <div class="fd-w3-reader-control-sheet" aria-label="翻页控制">
          <button type="button" data-reader-prev aria-label="上一页">${icon("chevron-left", "fd-small-icon")}</button>
          <span class="fd-w3-reader-progress">${esc(ctx.chapter)}</span>
          <button type="button" data-reader-next aria-label="下一页">${icon("chevron-right", "fd-small-icon")}</button>
        </div>
      </section>`;
  }

  // 阅读续读层（FlowShell 的 stepHtml 插槽）
  function readerContinuityStepHtml(data, appState, options) {
    const ctx = readerContext(data);
    const dismissAttr = options && options.dismissRoute ? ` data-reader-dismiss="${esc(options.dismissRoute)}"` : "";
    return `
      <section class="fd-w3-reader-continuity" aria-label="换源期间阅读续读层">
        <article class="fd-w3-reader-surface" data-w3-reader-surface aria-label="阅读正文背景"${dismissAttr}>
          <h1>${esc(ctx.chapter.replace(/^第\s*\d+\s*章\s*/, ""))}</h1>
          <p>${esc(ctx.previewText)}</p>
          <p class="fd-w3-reader-surface-fade">${esc(ctx.previewText)}</p>
        </article>
        ${readerTopStripHtml(ctx)}
        ${readerBottomControlOverlayHtml(data, appState)}
      </section>`;
  }

  // 优先复用进入换源前的完整 ReaderShell，确保正文、顶栏、控制层、亮度栏与
  // 底部导航都保持原样。旧 runtime 尚未提供共享接口时才使用上面的简化续读层。
  function originReaderStepHtml(data, appState) {
    const sharedFragments = window.ReaderRuntimeSharedFragments;
    if (sharedFragments && typeof sharedFragments.originReaderScreen === "function") {
      try {
        const originHtml = sharedFragments.originReaderScreen(data, appState);
        if (typeof originHtml === "string" && originHtml.trim()) {
          return originHtml;
        }
      } catch (_error) {
        // 兼容旧版或尚未完成初始化的 runtime；下方 fallback 保证状态页仍可渲染。
      }
    }
    return readerContinuityStepHtml(data, appState);
  }

  function hasSourceSwitchOrigin(appState) {
    return Boolean(
      appState &&
      typeof appState.sourceSwitchOriginRoute === "string" &&
      appState.sourceSwitchOriginRoute.trim()
    );
  }

  function sourceSwitchOriginRoute(appState) {
    return hasSourceSwitchOrigin(appState)
      ? appState.sourceSwitchOriginRoute.trim()
      : "reader";
  }

  // 结束换源流程时精确回到来源 Reader 路由；直达状态页时回退基础 reader。
  function originRouteAction(appState, config) {
    return Object.assign({}, config, {
      route: sourceSwitchOriginRoute(appState),
      replace: true
    });
  }

  // 返回上一个换源步骤不会再次触发 data-route="source-switch"，因此也不会覆盖
  // sourceSwitchOriginRoute。直达状态页没有来源历史时安全回退基础 reader。
  function previousSourceStepAction(appState, config) {
    if (hasSourceSwitchOrigin(appState)) {
      return Object.assign({}, config, { back: true });
    }
    return originRouteAction(appState, config);
  }

  // —— 换源状态卡片（comparisonHtml 插槽通用骨架） ——

  function sourceSwitchStateCard(config) {
    const toneClass = config.tone ? ` fd-w3-state-card--${esc(config.tone)}` : "";
    return `
      <section class="fd-w3-state-card${toneClass}" data-w3-state-card data-w3-state="${esc(config.state || "")}" aria-label="${esc(config.ariaLabel || config.title || "换源状态")}">
        <header class="fd-w3-state-card-head">
          <span class="fd-w3-state-card-icon" aria-hidden="true">${icon(config.icon || "info", "fd-medium-icon")}</span>
          <strong>${esc(config.title || "换源")}</strong>
          ${config.tag ? `<small class="fd-w3-state-card-tag">${esc(config.tag)}</small>` : ""}
        </header>
        ${config.detail ? `<p class="fd-w3-state-card-detail">${esc(config.detail)}</p>` : ""}
        ${config.bodyHtml || ""}
        ${config.meta && config.meta.length ? `
          <dl class="fd-w3-state-card-meta">
            ${config.meta.map(([label, value]) => `<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`).join("")}
          </dl>` : ""}
      </section>`;
  }

  // 操作按钮行（resultHtml 插槽）
  function sourceSwitchActionsHtml(actions) {
    return `
      <section class="fd-w3-state-actions" data-w3-state-actions aria-label="换源状态操作">
        ${actions.map((action) => {
          const replaceAttr = action.replace ? " data-route-replace" : "";
          const backAttr = action.back ? " data-route-back" : "";
          const routeAttr = !action.back && action.route ? ` data-route="${esc(action.route)}"` : "";
          const dataAttr = action.dataAttr ? ` ${action.dataAttr}` : "";
          const toneClass = action.tone ? ` fd-w3-state-action--${esc(action.tone)}` : "";
          return `<button type="button" class="fd-w3-state-action${toneClass}"${backAttr}${routeAttr}${replaceAttr}${dataAttr}>${esc(action.label)}</button>`;
        }).join("")}
      </section>`;
  }

  // —— FlowShell 包装：所有换源状态页统一走 FlowShell ——

  function sourceSwitchFlowShell(data, appState, slots) {
    const kit = shellKit();
    return kit.renderFlowShell({
      frameClass: `fd-flow-frame fd-source-phone-flow fd-source-reader-continuation fd-w3-source-switch ${geometryClasses()} ${slots.frameClassSuffix || ""}`,
      stepClass: `fd-flow-step fd-source-continuity-slot fd-w3-step ${slots.stepClassSuffix || ""}`,
      comparisonClass: `fd-flow-comparison fd-source-window-slot fd-w3-comparison ${slots.comparisonClassSuffix || ""}`,
      resultClass: `fd-flow-result fd-source-result-slot fd-w3-result ${slots.resultClassSuffix || ""}`,
      stateHostClass: "fd-source-unused-slot fd-w3-state-host",
      ariaLabel: slots.ariaLabel || "换源",
      stepHtml: slots.stepHtml || originReaderStepHtml(data, appState),
      comparisonHtml: `${slots.comparisonHtml || ""}${slots.resultHtml || ""}`,
      resultHtml: "",
      stateHostHtml: ""
    });
  }

  // —— 6 个 schema-only 路由的专用 renderer ——

  // 1. source-switch-empty：无可用源
  function sourceSwitchEmptyScreen(data, appState) {
    const ctx = readerContext(data);
    const candidates = (data && data.flow && data.flow.candidates) || [];
    const otherAvailable = candidates.filter((item) => item && item.state !== "当前" && item.state !== "失效").length;
    return sourceSwitchFlowShell(data, appState, {
      ariaLabel: "无可用源",
      comparisonHtml: sourceSwitchStateCard({
        state: "empty",
        tone: "empty",
        icon: "info",
        title: "无可用源",
        tag: "0 / " + candidates.length,
        detail: "当前书籍没有可切换的其它书源，可前往书源管理添加或启用新的书源。",
        bodyHtml: `
          <ul class="fd-w3-state-card-list">
            <li><strong>当前书源</strong><span>${esc(ctx.sourceName)}</span></li>
            <li><strong>其它可用源</strong><span>${esc(otherAvailable)} 个</span></li>
            <li><strong>当前章节</strong><span>${esc(ctx.chapter)}</span></li>
          </ul>`,
        meta: [
          ["书籍", ctx.title],
          ["章节", ctx.chapter]
        ]
      }),
      resultHtml: sourceSwitchActionsHtml([
        { label: "去书源管理", route: "source-management", tone: "primary" },
        originRouteAction(appState, { label: "返回阅读" })
      ])
    });
  }

  // 2. source-switch-error：换源错误
  function sourceSwitchErrorScreen(data, appState) {
    const ctx = readerContext(data);
    const target = targetSource(data) || {};
    const errorMsg = (appState && appState.sourceSwitchError) || "目标书源解析失败：正文选择器未匹配到内容（HTTP 502）。";
    return sourceSwitchFlowShell(data, appState, {
      ariaLabel: "换源失败",
      comparisonHtml: sourceSwitchStateCard({
        state: "error",
        tone: "error",
        icon: "warning",
        title: "换源失败",
        tag: "解析错误",
        detail: errorMsg,
        bodyHtml: `
          <ul class="fd-w3-state-card-list">
            <li><strong>原书源</strong><span>${esc(ctx.sourceName)}</span></li>
            <li><strong>目标书源</strong><span>${esc(target.source || "—")}</span></li>
            <li><strong>失败阶段</strong><span>正文解析</span></li>
          </ul>`,
        meta: [
          ["书籍", ctx.title],
          ["章节", ctx.chapter]
        ]
      }),
      resultHtml: sourceSwitchActionsHtml([
        previousSourceStepAction(appState, { label: "重试换源", tone: "primary", dataAttr: 'data-w3-action="retry"' }),
        originRouteAction(appState, { label: "保留原源" })
      ])
    });
  }

  // 3. source-switch-timeout：换源超时
  function sourceSwitchTimeoutScreen(data, appState) {
    const ctx = readerContext(data);
    const target = targetSource(data) || {};
    const elapsed = (appState && appState.sourceSwitchElapsed) || "12.8s";
    return sourceSwitchFlowShell(data, appState, {
      ariaLabel: "换源超时",
      comparisonHtml: sourceSwitchStateCard({
        state: "timeout",
        tone: "warn",
        icon: "offline",
        title: "换源超时",
        tag: elapsed,
        detail: "目标书源在限定时间内未返回目录数据，可重试或取消以保留原书源继续阅读。",
        bodyHtml: `
          <ul class="fd-w3-state-card-list">
            <li><strong>原书源</strong><span>${esc(ctx.sourceName)}</span></li>
            <li><strong>目标书源</strong><span>${esc(target.source || "—")}</span></li>
            <li><strong>已耗时</strong><span>${esc(elapsed)}</span></li>
          </ul>`,
        meta: [
          ["书籍", ctx.title],
          ["章节", ctx.chapter]
        ]
      }),
      resultHtml: sourceSwitchActionsHtml([
        previousSourceStepAction(appState, { label: "重试换源", tone: "primary", dataAttr: 'data-w3-action="retry"' }),
        originRouteAction(appState, { label: "取消" })
      ])
    });
  }

  // 4. source-switch-loading：换源加载中（不污染返回栈，返回按钮使用 replace）
  function sourceSwitchLoadingScreen(data, appState) {
    const ctx = readerContext(data);
    const target = targetSource(data) || {};
    const targetName = (appState && appState.sourceSwitchSelectedSource) || target.source || "笔趣阁镜像";
    const progress = (appState && appState.sourceSwitchProgress) || "正在请求目录";
    return sourceSwitchFlowShell(data, appState, {
      ariaLabel: "换源加载中",
      comparisonHtml: sourceSwitchStateCard({
        state: "loading",
        tone: "loading",
        icon: "refresh",
        title: "正在切换书源",
        tag: "加载中",
        detail: `正在从「${targetName}」拉取目录与最新章节，期间可继续阅读当前内容。`,
        bodyHtml: `
          <div class="fd-w3-state-card-progress" data-w3-loading-progress aria-label="换源进度">
            <span class="fd-w3-state-card-progress-bar" data-w3-progress-bar></span>
            <span class="fd-w3-state-card-progress-label">${esc(progress)}</span>
          </div>
          <ul class="fd-w3-state-card-list">
            <li><strong>原书源</strong><span>${esc(ctx.sourceName)}</span></li>
            <li><strong>目标书源</strong><span>${esc(targetName)}</span></li>
          </ul>`
      }),
      resultHtml: sourceSwitchActionsHtml([
        // 取消直接回到来源 Reader 路由，不在返回栈上留下 loading 中间态。
        originRouteAction(appState, { label: "取消", dataAttr: 'data-w3-action="cancel"' })
      ])
    });
  }

  // 5. source-switch-rollback：回滚确认对话框
  function sourceSwitchRollbackScreen(data, appState) {
    const ctx = readerContext(data);
    const rollbackSource = (appState && appState.sourceSwitchRollbackSource) || ctx.sourceName;
    const failedSource = (appState && appState.sourceSwitchFailedSource) || (targetSource(data) || {}).source || "笔趣阁镜像";
    return sourceSwitchFlowShell(data, appState, {
      ariaLabel: "回滚书源确认",
      comparisonClassSuffix: "fd-w3-comparison--dialog",
      comparisonHtml: sourceSwitchStateCard({
        state: "rollback",
        tone: "rollback",
        icon: "refresh",
        title: "回滚书源？",
        tag: "确认",
        detail: `新源「${failedSource}」正文异常，是否回滚到原书源「${rollbackSource}」？回滚后保留当前阅读位置，仅替换正文来源。`,
        bodyHtml: `
          <ul class="fd-w3-state-card-list">
            <li><strong>回滚到</strong><span>${esc(rollbackSource)}</span></li>
            <li><strong>放弃源</strong><span>${esc(failedSource)}</span></li>
            <li><strong>阅读位置</strong><span>${esc(ctx.chapter)} · 保留</span></li>
          </ul>`,
        meta: [
          ["书籍", ctx.title]
        ]
      }),
      resultHtml: sourceSwitchActionsHtml([
        originRouteAction(appState, { label: "确认回滚", tone: "primary", dataAttr: 'data-w3-action="rollback-confirm"' }),
        previousSourceStepAction(appState, { label: "取消" })
      ])
    });
  }

  // 6. source-switch-preview：换源预览页（对比新旧源目录差异 / 最新章节）
  function sourceSwitchPreviewScreen(data, appState) {
    const ctx = readerContext(data);
    const current = currentSource(data) || {};
    const target = targetSource(data) || {};
    const targetName = (appState && appState.sourceSwitchSelectedSource) || target.source || "笔趣阁镜像";
    const targetLatest = target.latestChapter || target.chapter || ctx.chapter;
    const currentLatest = current.latestChapter || current.chapter || ctx.chapter;
    // 目录差异（简化版：以候选源 checks 字段构造目录同步条目）
    const candidates = (data && data.flow && data.flow.candidates) || [];
    const targetCandidate = candidates.find((item) => item && item.source === targetName) || target;
    const checks = (targetCandidate && targetCandidate.checks) || ["目录", "章节", "正文"];
    const checkDone = (targetCandidate && targetCandidate.checkDone) || checks.length;
    return sourceSwitchFlowShell(data, appState, {
      ariaLabel: "换源预览",
      comparisonHtml: `
        <section class="fd-w3-preview" data-w3-preview aria-label="新旧源对比预览">
          <header class="fd-w3-preview-head">
            <strong>换源预览</strong>
            <span>对比目录与最新章节</span>
          </header>
          <div class="fd-w3-preview-grid">
            <article class="fd-w3-preview-col fd-w3-preview-col--old">
              <header><span class="fd-w3-preview-tag">原源</span><strong>${esc(ctx.sourceName)}</strong></header>
              <dl>
                <dt>最新章节</dt><dd>${esc(currentLatest)}</dd>
                <dt>延迟</dt><dd>${esc(current.speed || "—")}</dd>
                <dt>匹配</dt><dd>${esc(current.match || "—")}</dd>
              </dl>
            </article>
            <article class="fd-w3-preview-col fd-w3-preview-col--new">
              <header><span class="fd-w3-preview-tag fd-w3-preview-tag--new">新源</span><strong>${esc(targetName)}</strong></header>
              <dl>
                <dt>最新章节</dt><dd>${esc(targetLatest)}</dd>
                <dt>延迟</dt><dd>${esc(targetCandidate.speed || target.speed || "—")}</dd>
                <dt>匹配</dt><dd>${esc(targetCandidate.match || target.match || "—")}</dd>
              </dl>
            </article>
          </div>
          <section class="fd-w3-preview-checks" aria-label="目录校验项">
            <header><strong>目录校验</strong><small>${checkDone} / ${checks.length} 项通过</small></header>
            <ul>
              ${checks.map((name, idx) => `
                <li class="${idx < checkDone ? "is-done" : ""}">
                  <span>${icon(idx < checkDone ? "check" : "info", "fd-small-icon")}</span>
                  <strong>${esc(name)}</strong>
                  <em>${idx < checkDone ? "已通过" : "待校验"}</em>
                </li>`).join("")}
            </ul>
          </section>
        </section>`,
      resultHtml: sourceSwitchActionsHtml([
        originRouteAction(appState, { label: "确认换源", tone: "primary", dataAttr: 'data-w3-action="switch-confirm"' }),
        previousSourceStepAction(appState, { label: "返回候选列表" })
      ])
    });
  }

  // —— 2 个已审计路由的状态变体增强 ——

  /**
   * source-switch / source-switch-results 的状态变体增强。
   * 在原 flowScreen 渲染结果上叠加状态修饰 class 与状态宿主标记，
   * 不重写原 renderer，仅作为状态变体增强（loading / error / rollback-ready 等）。
   *
   * @param {string} html 原 flowScreen 返回的 HTML
   * @param {object} appState
   * @param {object} variant { state: "loading"|"error"|"timeout"|"rollback"|"empty"|"preview" }
   */
  function sourceSwitchStateVariant(html, appState, variant) {
    if (!html || !variant || !variant.state) {
      return html;
    }
    const state = variant.state;
    // 在 fd-flow-frame 上注入状态 class 与 data 属性，供 CSS / 行为脚本识别状态变体
    const stateClass = `fd-w3-variant fd-w3-variant--${esc(state)}`;
    const stateAttr = `data-w3-variant="${esc(state)}"`;
    if (/fd-flow-frame/.test(html)) {
      return html
        .replace(/fd-flow-frame/, `fd-flow-frame ${stateClass}`)
        .replace(/<main class="[^"]*fd-flow-frame[^"]*"/, (match) => match.replace(/<main /, `<main ${stateAttr} `));
    }
    return html;
  }

  // —— 集成映射 ——
  // INTEGRATION_MAP:
  // source-switch-empty   → sourceSwitchEmptyScreen
  // source-switch-error   → sourceSwitchErrorScreen
  // source-switch-timeout → sourceSwitchTimeoutScreen
  // source-switch-loading → sourceSwitchLoadingScreen
  // source-switch-rollback → sourceSwitchRollbackScreen
  // source-switch-preview → sourceSwitchPreviewScreen
  const INTEGRATION_MAP = {
    "source-switch-empty": "sourceSwitchEmptyScreen",
    "source-switch-error": "sourceSwitchErrorScreen",
    "source-switch-timeout": "sourceSwitchTimeoutScreen",
    "source-switch-loading": "sourceSwitchLoadingScreen",
    "source-switch-rollback": "sourceSwitchRollbackScreen",
    "source-switch-preview": "sourceSwitchPreviewScreen"
  };

  // 已审计路由的状态变体增强映射
  const STATE_VARIANT_MAP = {
    "source-switch": "sourceSwitchStateVariant",
    "source-switch-results": "sourceSwitchStateVariant"
  };

  window.ReaderW3SourceSwitchRenderers = {
    // 6 个 schema-only 路由 renderer
    sourceSwitchEmptyScreen,
    sourceSwitchErrorScreen,
    sourceSwitchTimeoutScreen,
    sourceSwitchLoadingScreen,
    sourceSwitchRollbackScreen,
    sourceSwitchPreviewScreen,
    // 2 个已审计路由的状态变体增强
    sourceSwitchStateVariant,
    // 集成映射
    INTEGRATION_MAP,
    STATE_VARIANT_MAP
  };
})(window);
