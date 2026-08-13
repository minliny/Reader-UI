(function attachSyncBackupRenderer(window) {
  function renderSyncBackup(target, data, options) {
    window.SettingsPageKit.renderPage(target, data, options || {});
  }

  function renderSyncBackupStateMatrix(target, data) {
    window.SettingsPageKit.renderStateMatrix(target, data);
  }

  window.SyncBackupInput = {
    renderSyncBackup,
    renderSyncBackupStateMatrix
  };
})(window);
