(function attachPrivacyPermissionsRenderer(window) {
  function renderPrivacyPermissions(target, data, options) {
    window.SettingsPageKit.renderPage(target, data, options || {});
  }

  function renderPrivacyPermissionsStateMatrix(target, data) {
    window.SettingsPageKit.renderStateMatrix(target, data);
  }

  window.PrivacyPermissionsInput = {
    renderPrivacyPermissions,
    renderPrivacyPermissionsStateMatrix
  };
})(window);
