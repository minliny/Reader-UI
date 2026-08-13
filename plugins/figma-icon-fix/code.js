// RUNTEST: rename current page + append a marker frame. Verifiable via file download.
(async function main() {
  try {
    const p = figma.currentPage;
    p.name = p.name + '~RAN~';
    const marker = figma.createFrame();
    marker.name = 'PLUGIN_RAN_MARKER';
    marker.resize(10, 10);
    marker.x = 0; marker.y = 0;
    p.appendChild(marker);
    figma.closePlugin('ran on page: ' + p.name);
  } catch (e) {
    figma.closePlugin('ERR ' + String(e && e.message || e));
  }
})();
