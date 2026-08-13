(function attachAboutFeedbackRenderer(window) {
  function renderAboutFeedback(target, data, options) {
    window.SettingsPageKit.renderPage(target, data, options || {});
  }

  function renderAboutFeedbackStateMatrix(target, data) {
    window.SettingsPageKit.renderStateMatrix(target, data);
  }

  window.AboutFeedbackInput = {
    renderAboutFeedback,
    renderAboutFeedbackStateMatrix
  };
})(window);
