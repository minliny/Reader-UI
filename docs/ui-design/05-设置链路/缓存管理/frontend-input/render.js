(function attachCacheManagementRenderer(window) {
  function renderCacheManagement(target, data, options) {
    window.SettingsPageKit.renderPage(target, data, options || {});
  }

  function renderCacheManagementStateMatrix(target, data) {
    window.SettingsPageKit.renderStateMatrix(target, data);
  }

  window.CacheManagementInput = {
    renderCacheManagement,
    renderCacheManagementStateMatrix
  };
})(window);
