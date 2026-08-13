(function attachSourceManagementRenderer(window) {
  function renderSourceManagement(target, data, options) {
    window.SettingsPageKit.renderPage(target, data, options || {});
  }

  function renderSourceManagementStateMatrix(target, data) {
    window.SettingsPageKit.renderStateMatrix(target, data);
  }

  window.SourceManagementInput = {
    renderSourceManagement,
    renderSourceManagementStateMatrix
  };
})(window);
