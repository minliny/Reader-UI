(function loadReaderFrontendDemoDraftRuntime(window, document) {
  const currentScript = document.currentScript;
  const currentSrc = currentScript && currentScript.src ? currentScript.src : "";
  const baseUrl = currentSrc.slice(0, currentSrc.lastIndexOf("/") + 1);
  const runtimeUrl = `${baseUrl || "./"}render-runtime.js?v=phase01-shell-route-profile-v1-reader-pagination-reflow-v1-reader2-static-vc2-v1-reader2-replace-toggle-v1-reader-control-family-mr1-timing-v2-reader-panel-motion-v1-bookshelf-bookitem-v2-overlay-focus-v9-feedback-loading-v1-dropdown-exact-v1-input-search-exact-v2-primitive-exact-v4-20260716`;

  document.write(`<script src="${runtimeUrl}"><\/script>`);
})(window, document);
