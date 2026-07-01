(function loadReaderFrontendDemoDraftRuntime(window, document) {
  const currentScript = document.currentScript;
  const currentSrc = currentScript && currentScript.src ? currentScript.src : "";
  const baseUrl = currentSrc.slice(0, currentSrc.lastIndexOf("/") + 1);
  const runtimeUrl = `${baseUrl || "./"}render-runtime.js?v=motion-common-components-v1-20260701`;

  document.write(`<script src="${runtimeUrl}"><\/script>`);
})(window, document);
