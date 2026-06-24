(function attachGroupManagementRenderer(window) {
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function clone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function icon(name) {
    const assetName = name === "drag" ? "list" : name === "warning" ? "warning" : name === "retry" ? "refresh" : name === "empty" ? "list" : name;
    if (window.ReaderAssetIcons && window.ReaderAssetIcons.renderIcon && window.ReaderAssetIcons.has(assetName)) {
      return window.ReaderAssetIcons.renderIcon(assetName, "gm-icon");
    }

    const icons = {
      back: '<svg class="gm-icon" viewBox="0 0 48 48"><path d="M29 10 15 24l14 14"></path><path d="M16 24h27"></path></svg>',
      drag: '<svg class="gm-icon" viewBox="0 0 48 48"><path d="M14 16h20"></path><path d="M14 24h20"></path><path d="M14 32h20"></path></svg>',
      more: '<svg class="gm-icon" viewBox="0 0 48 48"><circle cx="24" cy="10" r="3" fill="currentColor" stroke="none"></circle><circle cx="24" cy="24" r="3" fill="currentColor" stroke="none"></circle><circle cx="24" cy="38" r="3" fill="currentColor" stroke="none"></circle></svg>',
      warning: '<svg class="gm-icon" viewBox="0 0 48 48"><path d="M24 7 43 40H5L24 7Z"></path><path d="M24 18v11"></path><path d="M24 35h.01"></path></svg>',
      retry: '<svg class="gm-icon" viewBox="0 0 48 48"><path d="M37 17a15 15 0 1 0 1 15"></path><path d="M37 8v9h-9"></path></svg>',
      empty: '<svg class="gm-icon" viewBox="0 0 48 48"><path d="M12 15h24"></path><path d="M12 24h24"></path><path d="M12 33h16"></path></svg>'
    };
    return icons[name] || icons.more;
  }

  function statusBar(data) {
    return `<header class="gm-status-bar" aria-label="系统状态栏"><span>${esc((data.status || {}).time || "9:41")}</span><span class="gm-battery" aria-hidden="true"></span></header>`;
  }

  function topBar(data) {
    const top = data.topBar || {};
    return `
      <section class="gm-top-bar">
        <button class="gm-back-button" type="button" aria-label="${esc(top.backLabel || "返回")}">${icon("back")}</button>
        <h1>${esc(top.title || "分组管理")}</h1>
        <button class="gm-add-entry" type="button">${esc(top.addLabel || "新建")}</button>
      </section>`;
  }

  function groupRow(group) {
    const reorder = group.canReorder ? icon("drag") : "";
    const more = group.canRename || group.canDelete ? `<button type="button" aria-label="${esc(group.title)}更多">${icon("more")}</button>` : `<span class="gm-row-lock">${esc(group.count)} 本</span>`;
    return `
      <article class="gm-group-row ${group.system ? "is-system" : ""}" data-group-id="${esc(group.id)}">
        <span class="gm-reorder-handle" aria-hidden="true">${reorder}</span>
        <span class="gm-group-main">
          <strong>${esc(group.title)}</strong>
          <small>${esc(group.meta)}</small>
        </span>
        ${more}
      </article>`;
  }

  function groupsForState(data, state) {
    if (state === "empty") {
      return (data.groups || []).filter((group) => group.id === "all" || group.id === "ungrouped");
    }
    return data.groups || [];
  }

  function groupList(data, state) {
    return `
      <section class="gm-content" aria-label="分组列表">
        ${groupsForState(data, state).map(groupRow).join("")}
      </section>`;
  }

  function emptyBlock(data) {
    const feedback = (data.feedback || {}).empty || {};
    return `
      <section class="gm-empty-block" aria-label="${esc(feedback.title)}">
        <span>${icon("empty")}</span>
        <h2>${esc(feedback.title)}</h2>
        <p>${esc(feedback.copy)}</p>
        <button type="button">${esc(feedback.primaryAction || "新建分组")}</button>
      </section>`;
  }

  function inlineFeedback(data, state) {
    if (state === "loading") {
      const feedback = (data.feedback || {}).loading || {};
      return `
        <section class="gm-inline-feedback is-loading" aria-label="${esc(feedback.title)}">
          <span class="gm-spinner" aria-hidden="true"></span>
          <span><strong>${esc(feedback.title)}</strong><small>${esc(feedback.copy)}</small></span>
        </section>`;
    }
    if (state === "error") {
      const feedback = (data.feedback || {}).error || {};
      return `
        <section class="gm-inline-feedback is-error" aria-label="${esc(feedback.title)}">
          ${icon("retry")}
          <span><strong>${esc(feedback.title)}</strong><small>${esc(feedback.copy)}</small></span>
          <button type="button">${esc(feedback.primaryAction || "重试")}</button>
        </section>`;
    }
    return "";
  }

  function renameDialog(data, state) {
    if (state !== "new" && state !== "rename" && state !== "loading" && state !== "error") {
      return "";
    }
    const dialog = data.dialog || {};
    const saving = state === "loading";
    const isRename = state === "rename" || state === "error";
    return `
      <div class="gm-modal-layer" aria-label="${isRename ? "重命名弹窗" : "新建分组弹窗"}">
        <section class="gm-dialog" role="dialog" aria-modal="true" aria-label="${esc(isRename ? dialog.renameTitle : dialog.newTitle)}">
          <h2>${esc(isRename ? dialog.renameTitle : dialog.newTitle)}</h2>
          <label class="gm-text-field">
            <span class="gm-sr-only">${esc(dialog.inputPlaceholder || "输入分组名称")}</span>
            <input value="${esc(isRename ? dialog.renameValue : "")}" placeholder="${esc(dialog.inputPlaceholder || "输入分组名称")}" ${saving ? "disabled" : ""}>
          </label>
          <p>${esc(dialog.helper)}</p>
          ${inlineFeedback(data, state)}
          <div class="gm-dialog-actions">
            <button type="button" ${saving ? "disabled" : ""}>${esc(dialog.cancelLabel || "取消")}</button>
            <button class="is-primary" type="button" ${saving ? "disabled" : ""}>${saving ? esc(dialog.savingLabel || "保存中") : esc(dialog.saveLabel || "保存")}</button>
          </div>
        </section>
      </div>`;
  }

  function deleteDialog(data, state) {
    if (state !== "delete") {
      return "";
    }
    const confirm = data.deleteConfirm || {};
    return `
      <div class="gm-modal-layer" aria-label="删除分组确认层">
        <section class="gm-confirm-dialog" role="dialog" aria-modal="true" aria-label="${esc(confirm.title)}">
          <span class="gm-warning-icon" aria-hidden="true">${icon("warning")}</span>
          <h2>${esc(confirm.title)}</h2>
          <p>${esc(confirm.copy)}</p>
          <div class="gm-dialog-actions">
            <button type="button">${esc(confirm.cancelLabel || "取消")}</button>
            <button class="is-danger" type="button">${esc(confirm.confirmLabel || "删除分组")}</button>
          </div>
        </section>
      </div>`;
  }

  function groupManagementHtml(data, options) {
    const state = options && options.state ? options.state : "default";
    const hasDialog = state === "new" || state === "rename" || state === "loading" || state === "error" || state === "delete";
    return window.LibraryPageKit.renderPage({
      data,
      pageClass: "gm-page-frame",
      ariaLabel: "分组管理组件预览",
      statusHtml: statusBar(data),
      topBarHtml: topBar(data),
      contentHtml: `
        ${groupList(data, state)}
        ${state === "empty" ? emptyBlock(data) : ""}`,
      stateHostHtml: state === "loading" || state === "error" ? "" : inlineFeedback(data, state),
      dialogHtml: `
        ${hasDialog ? '<div class="gm-dim" aria-hidden="true"></div>' : ""}
        ${renameDialog(data, state)}
        ${deleteDialog(data, state)}`
    });
  }

  function renderGroupManagement(target, data, options) {
    target.innerHTML = groupManagementHtml(data, options || {});
  }

  function stateData(data, state) {
    const next = clone(data);
    if (state === "error") {
      next.dialog.renameValue = "长篇追读";
    }
    return next;
  }

  function renderGroupManagementStateMatrix(target, data) {
    const states = [
      { key: "default", title: "分组默认态", desc: "展示系统分组、自定义分组、拖拽手柄和更多操作。" },
      { key: "new", title: "新建分组态", desc: "新建分组弹窗，空名称不能保存。" },
      { key: "rename", title: "重命名态", desc: "重命名保留书籍归属，只修改分组名称。" },
      { key: "delete", title: "删除确认态", desc: "删除分组需要确认，并说明书籍移入未分组。" },
      { key: "empty", title: "无自定义分组态", desc: "只保留系统分组，给出新建分组入口。" },
      { key: "loading", title: "保存中态", desc: "提交中禁用重复操作，保留当前弹窗内容。" },
      { key: "error", title: "保存失败态", desc: "保存失败保留原顺序和已输入名称，可重试。" }
    ];

    target.innerHTML = window.LibraryPageKit.renderStateMatrix({
      data,
      states,
      title: "分组管理状态矩阵",
      desc: "用于核对分组列表、新建、重命名、删除确认、空状态、提交中和失败状态。",
      stateClass: "gm-state-workbench",
      stateHeaderClass: "gm-state-header",
      stateGridClass: "gm-state-grid",
      stateCardClass: "gm-state-card",
      stateMetaClass: "gm-state-meta",
      stateViewportClass: "gm-state-viewport",
      stateScaleClass: "gm-state-scale",
      getStateData: stateData,
      renderFrame: groupManagementHtml
    });
  }

  window.GroupManagementInput = {
    renderGroupManagement,
    renderGroupManagementStateMatrix
  };
})(window);
