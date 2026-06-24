(function attachBookshelfSearchSettingsRenderer(window) {
  function mapRow(row) {
    return {
      ...row,
      rowClass: "bks-setting-row"
    };
  }

  function toSettingsShell(data) {
    const danger = ((data.search || {}).danger) || {};
    return {
      pageClass: "bks-page-frame",
      stateClass: "bks-state-workbench",
      topBar: data.topBar,
      sections: [
        {
          title: (data.bookshelf || {}).title,
          rows: (((data.bookshelf || {}).rows) || []).map(mapRow),
          preview: (data.bookshelf || {}).preview
        },
        {
          title: (data.search || {}).title,
          rows: (((data.search || {}).rows) || []).map(mapRow)
        }
      ],
      actions: [
        {
          tone: "danger",
          icon: "trash",
          title: danger.title,
          meta: danger.copy
        }
      ],
      confirm: {
        title: danger.confirmTitle,
        copy: danger.copy,
        cancelLabel: danger.cancelLabel,
        confirmLabel: danger.confirmLabel
      },
      optionSheet: {
        rowTitle: "搜索范围",
        cancelLabel: "取消"
      },
      dialogStates: ["confirm"],
      toast: data.toast,
      states: [
        { key: "default", toast: "success", title: "书架搜索默认态", desc: "书架偏好、预览、搜索偏好和危险操作可见。" },
        { key: "option_sheet", title: "搜索范围底表态", desc: "搜索范围 SelectRow 打开可选项底表。" },
        { key: "confirm", title: "清空历史确认态", desc: "清空搜索历史必须二次确认并说明影响范围。" },
        { key: "loading", title: "设置加载态", desc: "读取设置时保留骨架行，不清空页面结构。" },
        { key: "error", toast: "error", title: "保存失败态", desc: "失败时保留当前设置并显示轻量反馈。" },
        { key: "permission", toast: "permission", title: "搜索历史权限态", desc: "本地存储权限缺失时只影响搜索历史保存。" }
      ],
      stateSummary: "用于核对默认、底表、确认、加载、错误和权限状态。"
    };
  }

  function renderBookshelfSearchSettings(target, data, options) {
    window.SettingsPageKit.renderPage(target, toSettingsShell(data), options || {});
  }

  function renderBookshelfSearchSettingsStateMatrix(target, data) {
    window.SettingsPageKit.renderStateMatrix(target, toSettingsShell(data));
  }

  window.BookshelfSearchSettingsInput = {
    renderBookshelfSearchSettings,
    renderBookshelfSearchSettingsStateMatrix
  };
})(window);
