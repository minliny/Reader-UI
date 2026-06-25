(function loadReaderFrontendDemoDraftRuntime(window, document) {
  const currentScript = document.currentScript;
  const currentSrc = currentScript && currentScript.src ? currentScript.src : "";
  const baseUrl = currentSrc.slice(0, currentSrc.lastIndexOf("/") + 1);
  const runtimeUrl = `${baseUrl || "./"}render-runtime.js?v=runtime-split-v1-20260625`;

  document.write(`<script src="${runtimeUrl}"><\/script>`);
})(window, document);
