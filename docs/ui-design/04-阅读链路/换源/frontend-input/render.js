(function attachSourceSwitchRenderer(window) {
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function icon(name) {
    const aliases = {
      switch: "source",
      sound: "tts",
      retry: "refresh"
    };
    const semantic = aliases[name] || name;
    if (window.ReaderShellKit && window.ReaderShellKit.icon) {
      return window.ReaderShellKit.icon(semantic, "sw-icon");
    }
    if (window.ReaderAssetIcons && window.ReaderAssetIcons.renderIcon) {
      return window.ReaderAssetIcons.renderIcon(semantic, "sw-icon");
    }
    return "";
  }

  function shellKit() {
    if (!window.ReaderShellKit) {
      throw new Error("ReaderShellKit is required before 换源/frontend-input/render.js");
    }
    return window.ReaderShellKit;
  }

  function statusRow(data) {
    const status = data.status || {};
    return `<header class="sw-status-row"><span>${esc(status.left)}</span><span>${esc(status.time)}</span></header>`;
  }

  function toolbar(data, source) {
    const reader = data.reader || {};
    return `
      <section class="sw-toolbar">
        <button type="button" aria-label="返回阅读页">${icon("back")}</button>
        <span><strong>${esc(reader.title)}</strong><small>${esc(source || reader.currentSource)} · ${esc(reader.chapter)}</small></span>
        <button class="sw-source-button" type="button">${icon("switch")}<small>换源</small></button>
        <button type="button" aria-label="更多">${icon("more")}</button>
      </section>`;
  }

  function readingText(data) {
    return `<article class="sw-reading-text">${((data.reader || {}).lines || []).map((line) => `<p>${esc(line)}</p>`).join("")}</article>`;
  }

  function progressFooter(data) {
    const reader = data.reader || {};
    return `<footer class="sw-progress-footer"><span>${esc(reader.progress)}</span><i></i><span>${esc(reader.chapterProgress)}</span></footer>`;
  }

  function quickControls(data) {
    const controls = data.controls || {};
    const quick = [
      { label: controls.quickActions && controls.quickActions[0], icon: "search" },
      { label: controls.quickActions && controls.quickActions[1], icon: "play" },
      { label: controls.quickActions && controls.quickActions[2], icon: "switch" }
    ];
    const modules = [
      { label: controls.modules && controls.modules[0], icon: "list" },
      { label: controls.modules && controls.modules[1], icon: "sound" },
      { label: controls.modules && controls.modules[2], icon: "text" },
      { label: controls.modules && controls.modules[3], icon: "settings" }
    ];
    return `
      <section class="sw-control-panel">
        <div class="sw-quick-actions">
          ${quick.map((item) => `<button type="button">${icon(item.icon)}<span>${esc(item.label)}</span></button>`).join("")}
        </div>
        <section class="sw-chapter-progress">
          <header><strong>${esc((data.reader || {}).chapter)} 雨夜</strong><button type="button">${esc(controls.previousChapter)}</button></header>
          <i><b></b></i>
          <span>本章 38%</span>
        </section>
        <div class="sw-module-actions">
          ${modules.map((item) => `<button type="button">${icon(item.icon)}<span>${esc(item.label)}</span></button>`).join("")}
        </div>
        <aside class="sw-brightness">
          <strong>${esc(controls.brightness)}</strong>
          <span>${icon("settings")}</span>
          <i><b></b></i>
          <em>A</em>
          <small>${esc(controls.system)}</small>
        </aside>
      </section>`;
  }

  function detectBadge(source) {
    if (source.current) return `<em class="sw-current-badge">当前</em>`;
    if (source.checking) return `<em class="sw-detect-badge is-checking">检测中</em>`;
    return `<em class="sw-detect-badge">${esc(source.status)}</em>`;
  }

  function sourceRow(source, checkingData) {
    const checking = source.checking;
    const disabled = source.current || source.status === "失效";
    return `
      <article class="sw-source-row ${source.current ? "is-current" : ""} ${checking ? "is-checking" : ""}">
        <span>
          <strong>${esc(source.name)} ${detectBadge(source)}</strong>
          <small>${esc(source.chapter)}</small>
        </span>
        ${checking ? `
          <div class="sw-checking-steps">
            <strong>${esc((checkingData || {}).title)}</strong>
            ${((checkingData || {}).steps || []).map((step) => `<small>${esc(step.label)} ${step.done ? "●" : "◌"}</small>`).join("")}
          </div>` : `<small>${esc(source.updated)}</small><small>${esc(source.latency)} · ${esc(source.status)}</small>`}
        <button type="button" ${disabled ? "disabled" : ""}>${source.current ? "当前来源" : source.status === "失效" ? "不可用" : "切换来源"}</button>
      </article>`;
  }

  function sourceSheet(data, mode) {
    const sheet = data.sheet || {};
    const checkingData = data.checking || {};
    const sources = mode === "checking"
      ? (data.sources || [])
      : (data.sources || []).map((source) => ({ ...source, checking: false }));
    return `
      <section class="sw-source-sheet">
        <button class="sw-sheet-close" type="button" aria-label="关闭">${icon("close")}</button>
        <header>
          <h1>${esc(sheet.title)}</h1>
          <p>${esc((data.reader || {}).title)} · ${esc((data.reader || {}).chapter)}</p>
        </header>
        <nav>
          ${(sheet.filters || []).map((filter, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button">${esc(filter)}</button>`).join("")}
        </nav>
        <div class="sw-source-list">${sources.map((source) => sourceRow(source, checkingData)).join("")}</div>
        <footer>${mode === "checking" ? `<button type="button">${esc(sheet.cancelDetect)}</button>` : `<span>${icon("check")}${esc(sheet.detectHint)}</span>`}</footer>
      </section>`;
  }

  function successToast(data) {
    const success = data.success || {};
    return `
      <section class="sw-success-toast">
        ${icon("check")}
        <strong>${esc(success.title)}</strong>
        <button type="button" aria-label="${esc(success.closeLabel)}">${icon("close")}</button>
      </section>`;
  }

  function feedbackPanel(data, key) {
    const feedback = (data.feedback || {})[key] || {};
    const iconName = key === "offline" ? "offline" : key === "permission" || key === "error" ? "warning" : "switch";
    return `
      <section class="sw-source-sheet is-feedback">
        <header>
          <h1>${esc((data.sheet || {}).title)}</h1>
          <p>${esc((data.reader || {}).title)} · ${esc((data.reader || {}).chapter)}</p>
        </header>
        <div class="sw-feedback-panel is-${esc(key)}">
          <span>${icon(iconName)}</span>
          <h2>${esc(feedback.title)}</h2>
          <p>${esc(feedback.copy)}</p>
          ${key === "loading" ? `<div class="sw-loading-lines"><i></i><i></i><i></i></div>` : `<button type="button">${esc(feedback.primaryAction)}</button>`}
        </div>
      </section>`;
  }

  function flowStateHost(data, key) {
    const labels = {
      flow: "4 步横向换源流程",
      sheet: "默认候选源",
      loading: "来源加载中",
      empty: "无可用来源",
      error: "检测失败",
      offline: "网络不可用",
      permission: "等待网络权限"
    };
    const reader = data.reader || {};
    const sheet = data.sheet || {};
    const sourceCount = (data.sources || []).length;
    const filterCount = (sheet.filters || []).length;
    return `
      <aside class="sw-flow-status-strip is-${esc(key)}" aria-label="FlowShell 状态容器">
        <strong>FlowShell StateHost</strong>
        <span><em>${esc(labels[key] || "换源状态")}</em></span>
        <span>${esc(sourceCount)} 个来源 · ${esc(filterCount)} 个筛选</span>
        <span>${esc(reader.currentSource)} → ${esc(reader.switchedSource || reader.currentSource)}</span>
        <span>阅读位置已保留</span>
      </aside>`;
  }

  function phone(data, mode) {
    const source = mode === "success" ? (data.reader || {}).switchedSource : (data.reader || {}).currentSource;
    return `
      <div class="sw-phone ${mode === "sheet" || mode === "checking" ? "has-sheet" : ""}">
        ${statusRow(data)}
        ${toolbar(data, source)}
        ${mode === "success" ? successToast(data) : ""}
        ${readingText(data)}
        ${mode === "control" || mode === "success" ? quickControls(data) : ""}
        ${mode === "sheet" ? sourceSheet(data, "sheet") : ""}
        ${mode === "checking" ? sourceSheet(data, "checking") : ""}
        ${mode === "loading" || mode === "empty" || mode === "error" || mode === "offline" || mode === "permission" ? feedbackPanel(data, mode) : ""}
        ${progressFooter(data)}
      </div>`;
  }

  function flowStep(data, mode, caption) {
    return `
      <section class="sw-flow-step">
        ${phone(data, mode)}
        <strong>${esc(caption)}</strong>
      </section>`;
  }

  function flowArrow() {
    return `<span class="sw-flow-arrow">→</span>`;
  }

  function sourceSwitchFlow(data) {
    return shellKit().renderFlowShell({
      frameClass: "sw-flow-frame",
      stepClass: "sw-flow-step-region",
      comparisonClass: "sw-flow-comparison-region",
      resultClass: "sw-flow-result-region",
      stateHostClass: "sw-flow-state-host",
      ariaLabel: "换源流程预览",
      stepHtml: `
        ${flowStep(data, "control", "1. 基线阅读控制层")}
        ${flowArrow()}
        ${flowStep(data, "sheet", "2. 打开换源底表")}`,
      comparisonHtml: `
        ${flowArrow()}
        ${flowStep(data, "checking", "3. 内联检测中")}`,
      resultHtml: `
        ${flowArrow()}
        ${flowStep(data, "success", "4. 切换成功，回到阅读页")}`,
      stateHostHtml: flowStateHost(data, "flow")
    });
  }

  function renderSourceSwitch(target, data) {
    target.innerHTML = sourceSwitchFlow(data);
  }

  function renderSourceSwitchStateMatrix(target, data) {
    const states = [
      { key: "sheet", title: "换源默认态", desc: "来源列表、当前来源、延迟和切换按钮可见。" },
      { key: "loading", title: "来源加载态", desc: "保留底表标题，只替换结果区为加载态。" },
      { key: "empty", title: "无可用来源态", desc: "说明没有可切换来源并提供重试检测。" },
      { key: "error", title: "检测失败态", desc: "检测失败时保留阅读上下文和重试入口。" },
      { key: "offline", title: "网络不可用态", desc: "本地缓存可读，但阻断联网检测和切换。" },
      { key: "permission", title: "网络权限态", desc: "说明检测用途并提供授权入口。" }
    ];
    target.innerHTML = `
      <section class="sw-state-workbench">
        <header class="sw-state-header">
          <h1>换源状态矩阵</h1>
          <p>用于核对来源列表、检测、空结果、失败、离线和权限状态。</p>
        </header>
        <div class="sw-state-grid">
          ${states.map((state) => `
            <article class="sw-state-card">
              <div class="sw-state-meta">
                <h2>${esc(state.title)}</h2>
                <p>${esc(state.desc)}</p>
              </div>
              <div class="sw-state-viewport">
                <div class="sw-state-scale">
                  ${shellKit().renderFlowShell({
                    frameClass: "sw-state-flow-frame",
                    stepClass: "sw-state-flow-step-region",
                    comparisonClass: "sw-state-flow-comparison-region",
                    resultClass: "sw-state-flow-result-region",
                    stateHostClass: "sw-state-flow-state-host",
                    ariaLabel: state.title,
                    stepHtml: "",
                    comparisonHtml: phone(data, state.key),
                    resultHtml: "",
                    stateHostHtml: flowStateHost(data, state.key)
                  })}
                </div>
              </div>
            </article>`).join("")}
        </div>
      </section>`;
  }

  window.SourceSwitchInput = {
    renderSourceSwitch,
    renderSourceSwitchStateMatrix
  };
})(window);
