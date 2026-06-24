(function attachGeneralSettingsRenderer(window) {
  function mapRow(row) {
    const next = {
      ...row,
      rowClass: "gs-setting-row"
    };
    if (row.permission) {
      next.status = row.permission;
      next.statusTone = row.permission === "待授权" ? "warn" : "good";
      next.actionLabel = "去设置";
    }
    return next;
  }

  function toSettingsShell(data) {
    return {
      pageClass: "gs-page-frame",
      stateClass: "gs-state-workbench",
      topBar: data.topBar,
      sections: (data.groups || []).map((group) => ({
        title: group.title,
        rows: (group.rows || []).map(mapRow)
      })),
      actions: [
        {
          tone: "danger",
          icon: "refresh",
          title: (data.restore || {}).title,
          meta: "恢复 App 主题、语言、启动页面和行为偏好"
        }
      ],
      confirm: {
        title: (data.restore || {}).confirmTitle,
        copy: (data.restore || {}).copy,
        cancelLabel: (data.restore || {}).cancelLabel,
        confirmLabel: (data.restore || {}).confirmLabel
      },
      optionSheet: {
        rowTitle: "语言",
        cancelLabel: "取消"
      },
      dialogStates: ["error"],
      toast: data.toast,
      states: [
        { key: "default", toast: "success", title: "通用设置默认态", desc: "设置值、开关、恢复入口和保存成功 toast 可见。" },
        { key: "option_sheet", title: "选择项底表态", desc: "点击语言 SelectRow 后打开可选项底表。" },
        { key: "loading", title: "设置加载态", desc: "读取设置值时保留页面结构和骨架占位。" },
        { key: "error", toast: "error", title: "恢复失败态", desc: "恢复默认进入确认弹窗，失败时显示可恢复 toast。" },
        { key: "permission", toast: "permission", title: "权限说明态", desc: "崩溃日志需要授权时显示状态和去设置语义。" }
      ],
      stateSummary: "用于核对默认、选择项底表、加载、错误和权限状态。"
    };
  }

  function renderGeneralSettings(target, data, options) {
    window.SettingsPageKit.renderPage(target, toSettingsShell(data), options || {});
  }

  function renderGeneralSettingsStateMatrix(target, data) {
    window.SettingsPageKit.renderStateMatrix(target, toSettingsShell(data));
  }

  window.GeneralSettingsInput = {
    renderGeneralSettings,
    renderGeneralSettingsStateMatrix
  };
})(window);
