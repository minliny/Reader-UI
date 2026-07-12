import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");

function readDemoFile(relativePath) {
  return readFileSync(join(demoRoot, relativePath), "utf8");
}

function sourceSection(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `missing source marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `missing source marker after ${startMarker}: ${endMarker}`);
  return source.slice(start, end);
}

function evaluateScript(source, filename, windowOverrides = {}) {
  const window = {
    ReaderFrontendDemoDraftRouteContract: { routes: {}, deepRouteClosure: {} },
    ...windowOverrides,
  };
  const context = vm.createContext({ window });
  new vm.Script(source, { filename }).runInContext(context);
  return context.window;
}

const runtimeSource = readDemoFile("render-runtime.js");
const d3Source = readDemoFile("renderers/d3-control-layers-renderers.js");
const fullPageStyles = readDemoFile("styles/03d-reader-fullpage.css");
const quickSearchStyles = readDemoFile("styles/02c-reader-auto-search.css");
const w3Source = readDemoFile("renderers/w3-source-switch-renderers.js");
const w4Source = readDemoFile("renderers/w4-theme-font-typography-renderers.js");
const w5Source = readDemoFile("renderers/w5-replace-rules-renderers.js");
const readerControlCss = readDemoFile("styles/02a-reader-control.css");
const readerBrightnessCss = readDemoFile("styles/04-settings-source.css");
const readerViewportCss = readDemoFile("styles/03c-reader-viewport.css");
const shellKitSource = readDemoFile("shared-shell-kit/kit.js");

test("session capsule is rendered and scheduled only by the immersive reader", () => {
  const readerStateScreen = sourceSection(
    runtimeSource,
    "  function readerStateScreen(",
    "  function readerProgressBase(",
  );
  const readerInfoOverlay = sourceSection(
    runtimeSource,
    "  function readerInfoOverlay(",
    "  function readerTextSelectionLayer(",
  );
  const capsuleTick = sourceSection(
    runtimeSource,
    "  function scheduleReaderSessionCapsuleTick(",
    "  const readerScrollSelectors",
  );

  assert.match(readerInfoOverlay, /readerImmersiveStatusCapsule\(appState\)/);
  assert.match(
    readerStateScreen,
    /overlayHtml:\s*isImmersive\s*\?[\s\S]*readerInfoOverlay\(data,\s*appState\)[\s\S]*:\s*readerTopOverlay\(data,\s*appState\)/,
  );
  assert.doesNotMatch(
    readerStateScreen,
    /readerSessionControlSpaceHtml/,
    "non-immersive reader states must not inject the running-session capsule",
  );
  assert.match(capsuleTick, /querySelector\?\.\(\s*["']\.fd-immersive-frame["']\s*\)/);
  assert.match(capsuleTick, /if\s*\(\s*!immersiveFrame\s*\|\|\s*!capsule/);
});

test("reader loading keeps the base mode and ReaderShell owns one brightness accessory", () => {
  const readerStateScreen = sourceSection(
    runtimeSource,
    "  function readerStateScreen(",
    "  function readerProgressBase(",
  );
  const bottomSheet = sourceSection(
    runtimeSource,
    "  function readerBottomSheetHtml(",
    "  function readerQuickFullPagePanel(",
  );

  assert.match(readerStateScreen, /const state\s*=\s*baseState\s*;/);
  assert.doesNotMatch(readerStateScreen, /mode\s*:\s*["']loading["']/);
  assert.match(readerStateScreen, /fd-reader-mode-\$\{esc\(frameMode\)\}[\s\S]*is-reader-loading/);
  assert.match(bottomSheet, /if\s*\(isLoading\)\s*\{[\s\S]*readerLoadingPanel\(route\)/);
  assert.match(bottomSheet, /else if\s*\(state\.mode\s*===\s*["']quick["']\)/);
  assert.doesNotMatch(bottomSheet, /readerBrightnessRail\s*\(/, "panels must not create shell accessories");
  assert.match(readerStateScreen, /accessoryHtml:\s*isImmersive\s*\?\s*["']["']\s*:\s*readerBrightnessRail\(data,\s*appState\)/);
  assert.match(shellKitSource, /data-slot="readerAccessoryHost"/);
});

test("search and auto-page expand and collapse on the same quick route", () => {
  const bottomSheet = sourceSection(
    runtimeSource,
    "  function readerBottomSheetHtml(",
    "  function readerQuickFullPagePanel(",
  );
  const readerStateScreen = sourceSection(
    runtimeSource,
    "  function readerStateScreen(",
    "  function readerProgressBase(",
  );
  const interactions = sourceSection(
    runtimeSource,
    "  function attachScreenInteractions(",
    "  window.ReaderRuntimeSharedFragments",
  );

  assert.match(
    bottomSheet,
    /quickExpandable\s*=\s*state\.mode\s*===\s*["']quick["'][\s\S]*state\.quick\s*===\s*["']search["'][\s\S]*state\.quick\s*===\s*["']auto-page["']/,
  );
  assert.match(bottomSheet, /data-reader-quick-expand="\$\{esc\(state\.quick\)\}"/);
  assert.match(readerStateScreen, /appState\?\.readerQuickExpanded\s*===\s*baseState\.quick/);
  assert.match(readerStateScreen, /return readerQuickFullPageScreen\(data,\s*route,\s*baseState\.quick,\s*appState\)/);
  assert.match(interactions, /querySelectorAll\(\s*["']\[data-reader-quick-expand\]["']\s*\)/);
  assert.match(interactions, /appState\.readerQuickExpanded\s*=\s*button\.getAttribute\(\s*["']data-reader-quick-expand["']\s*\)[\s\S]*renderCurrentRoute\(\)/);
  assert.match(interactions, /querySelectorAll\(\s*["']\[data-reader-quick-collapse\]["']\s*\)/);
  assert.match(interactions, /appState\.readerQuickExpanded\s*=\s*["']["'][\s\S]*renderCurrentRoute\(\)/);
});

test("full search reuses the directory workspace without directory tabs and highlights body matches", () => {
  const fullSearch = sourceSection(
    runtimeSource,
    "  function readerFullSearchPage(",
    "  function readerFullTtsPage(",
  );
  const quickFullPanel = sourceSection(
    runtimeSource,
    "  function readerQuickFullPagePanel(",
    "  function readerQuickFullPageScreen(",
  );

  assert.match(fullSearch, /fd-reader-full-section fd-reader-full-directory fd-reader-full-search/);
  assert.match(fullSearch, /fd-reader-full-directory-body is-search/);
  assert.match(fullSearch, /fd-reader-directory-search is-search/);
  assert.match(fullSearch, /fd-reader-full-toc-list fd-reader-full-search-result-list/);
  assert.doesNotMatch(fullSearch, /fd-reader-full-directory-tabs/);
  assert.doesNotMatch(fullSearch, /data-reader-toc-mode/);
  assert.doesNotMatch(fullSearch, /fd-reader-full-search-summary/);
  assert.doesNotMatch(fullSearch, /results\.length/);
  assert.doesNotMatch(fullSearch, /is-current/);
  assert.match(fullSearch, /readerSearchKeywordHtml\(item\.excerpt, keyword\)/);
  assert.match(runtimeSource, /readerSearchDemoResults\(data, appState\)\.map/);
  assert.match(runtimeSource, /readerSearchKeywordHtml\(item\.excerpt, ["']雨夜["']\)/);
  assert.match(quickFullPanel, /type === ["']search["'][\s\S]*readerFullSearchPage\(data, appState\)/);
  assert.match(fullPageStyles, /\.fd-reader-search-keyword\s*\{[\s\S]*background:\s*transparent;[\s\S]*color:\s*var\(--fd-danger/);
  assert.match(quickSearchStyles, /\.fd-reader-search-result-list button\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\);[\s\S]*grid-template-rows:\s*auto minmax\(0, 1fr\);[\s\S]*\.fd-reader-search-result-list small\s*\{[\s\S]*border-left:/);
});

test("quick search merges the compact field between back and search controls", () => {
  const quickSearch = sourceSection(
    runtimeSource,
    "      search: {",
    '      "auto-page": {',
  );

  assert.doesNotMatch(quickSearch, /完整搜索/);
  assert.doesNotMatch(quickSearch, /data-reader-quick-expand="search"/);
  assert.match(quickSearch, /fd-reader-quick-back[\s\S]*fd-reader-search-field[\s\S]*data-reader-search-submit/);
  assert.match(quickSearchStyles, /\.fd-reader-search-panel\s*\{\s*grid-template-rows:\s*var\(--reader-quick-action-header-height\) minmax\(0, 1fr\);/);
  assert.match(quickSearchStyles, /\.fd-reader-search-result-list\s*\{[\s\S]*grid-auto-rows:\s*54px;/);
  assert.match(quickSearchStyles, /\.fd-reader-search-result-list button\s*\{[\s\S]*height:\s*54px;[\s\S]*min-height:\s*54px;/);
});

test("full auto-page reuses quick transport and TTS timer-speed primitives", () => {
  const autoControl = sourceSection(
    runtimeSource,
    "  function readerAutoPageControlHtml(",
    "  function readerQuickActionPanel(",
  );
  const fullAuto = sourceSection(
    runtimeSource,
    "  function readerFullAutoPage(",
    "  function readerFullTtsPage(",
  );
  const quickAuto = sourceSection(
    runtimeSource,
    '      "auto-page": {',
    "      replace: {",
  );
  const quickFullPanel = sourceSection(
    runtimeSource,
    "  function readerQuickFullPagePanel(",
    "  function readerQuickFullPageScreen(",
  );

  assert.match(autoControl, /fd-reader-auto-control/);
  assert.match(autoControl, /data-reader-chapter-action="prev"/);
  assert.match(autoControl, /data-reader-setting-toggle="autoPage"/);
  assert.match(autoControl, /fd-reader-auto-stop-mini/);
  assert.match(autoControl, /data-reader-session-stop="autoPage"/);
  assert.match(autoControl, /<strong>停止<\/strong>/);
  assert.match(autoControl, /data-reader-chapter-action="next"/);
  assert.match(quickAuto, /readerAutoPageControlHtml\(data, appState, \{ showStop: true \}\)/);
  assert.doesNotMatch(quickAuto, /class="fd-reader-auto-stop/);
  assert.doesNotMatch(quickAuto, /fd-reader-auto-mode|>连续<|>单页</);
  assert.match(fullAuto, /fd-reader-full-tts fd-reader-full-auto/);
  assert.match(fullAuto, /fd-reader-tts-clock/);
  assert.match(fullAuto, /data-reader-auto-timer-wheel/);
  assert.match(fullAuto, /fd-reader-auto-timer-summary[\s\S]*<strong>自动停止<\/strong>/);
  assert.doesNotMatch(fullAuto, /自动翻页后停止/);
  assert.match(fullAuto, /<strong>详细配置<\/strong>/);
  assert.match(fullAuto, /data-reader-auto-toggle="followHighlight"/);
  assert.match(fullAuto, /<strong>翻页速度<\/strong>/);
  assert.match(fullAuto, /fd-reader-tts-speed-slider/);
  assert.match(fullAuto, /data-reader-auto-speed-range/);
  assert.ok(
    fullAuto.indexOf("<strong>翻页速度</strong>") < fullAuto.indexOf('data-reader-auto-toggle="followHighlight"'),
    "full auto-page detail must place speed before follow highlight",
  );
  assert.match(fullAuto, /readerAutoPageControlHtml\(data, appState, \{ showStop: true \}\)/);
  assert.match(quickFullPanel, /readerFullAutoPage\(data, appState\)/);
  assert.match(fullPageStyles, /\.fd-reader-full-auto[\s\S]*\.fd-reader-auto-control\.has-stop[\s\S]*\.fd-reader-auto-stop-mini[\s\S]*\.fd-reader-auto-detail-speed/);
  assert.match(fullPageStyles, /\.fd-reader-full-auto \.fd-reader-auto-control\s*\{[\s\S]*width:\s*100%;[\s\S]*min-height:\s*62px;/);
  assert.match(fullPageStyles, /\.fd-reader-auto-control\.has-stop\s*\{[\s\S]*grid-template-columns:\s*repeat\(12, minmax\(0, 1fr\)\);/);
  assert.match(fullPageStyles, /\.fd-reader-auto-control\.has-stop > :is\([\s\S]*\.fd-reader-auto-chapter,[\s\S]*\.fd-reader-auto-toggle,[\s\S]*\.fd-reader-auto-stop-mini[\s\S]*\)\s*\{\s*grid-row:\s*1;/);
  assert.match(fullPageStyles, /\.fd-reader-auto-control\.has-stop > \.fd-reader-auto-chapter:first-child\s*\{\s*grid-column:\s*1 \/ span 3;/);
  assert.match(fullPageStyles, /\.fd-reader-auto-control\.has-stop > \.fd-reader-auto-toggle\s*\{\s*grid-column:\s*5 \/ span 4;/);
  assert.match(fullPageStyles, /\.fd-reader-auto-control\.has-stop > \.fd-reader-auto-stop-mini\s*\{[\s\S]*grid-column:\s*8 \/ span 2;/);
  assert.match(fullPageStyles, /\.fd-reader-auto-control\.has-stop > \.fd-reader-auto-chapter:last-child\s*\{\s*grid-column:\s*10 \/ span 3;/);
  assert.match(fullPageStyles, /\.fd-reader-auto-control\.has-stop > :is\([\s\S]*\.fd-reader-auto-chapter,[\s\S]*\.fd-reader-auto-stop-mini[\s\S]*\)\s*\{[\s\S]*grid-template-rows:\s*32px 12px;/);
  assert.match(fullPageStyles, /\.fd-reader-auto-control\.has-stop \.fd-reader-auto-stop-mini > i\s*\{[\s\S]*width:\s*24px;[\s\S]*height:\s*24px;/);
  assert.match(fullPageStyles, /\.fd-reader-auto-control\.has-stop \.fd-reader-auto-stop-mini \.fd-small-icon\s*\{[\s\S]*width:\s*17px;[\s\S]*height:\s*17px;/);
  assert.match(fullPageStyles, /\.fd-reader-auto-control\.has-stop \.fd-reader-auto-stop-mini > i\s*\{[\s\S]*align-self:\s*end;/);
  assert.match(quickSearchStyles, /\.fd-reader-auto-panel\s*\{[\s\S]*grid-template-rows:[\s\S]*var\(--reader-auto-header-height\)[\s\S]*minmax\(var\(--reader-auto-primary-min-height\), 1fr\)[\s\S]*var\(--reader-auto-secondary-height\);/);
  assert.match(quickSearchStyles, /\.fd-reader-auto-page-quick-panel\s*\{[\s\S]*--reader-auto-primary-min-height:\s*96px;/);
  assert.match(readerControlCss, /--reader-full-page-max-width:\s*720px/);
  assert.match(fullPageStyles, /\.fd-reader-full-page-panel\s*\{[\s\S]*left:\s*auto;[\s\S]*width:\s*min\(calc\(100% - 24px\), var\(--reader-full-page-max-width, 720px\)\);/);
  assert.match(readerViewportCss, /viewport-class="tablet-expanded"\] \.fd-reader-auto-page-quick-panel \.fd-reader-auto-control/);
  assert.match(readerViewportCss, /\.fd-reader-auto-page-quick-panel \.fd-reader-auto-control/);
  assert.doesNotMatch(readerViewportCss, /viewport-class="(?:compact|standard|large)-(?:portrait|landscape)"\] \.fd-reader-auto-control/);
});

test("reader control-family navigation replaces history and v2 aliases collapse semantically", () => {
  const interactions = sourceSection(
    runtimeSource,
    "  function attachScreenInteractions(",
    "  window.ReaderRuntimeSharedFragments",
  );

  assert.match(interactions, /originReaderState\s*=\s*readerStateByRoute\[currentRoute\(\)\]/);
  assert.match(interactions, /targetReaderState\s*=\s*readerStateByRoute\[route\]/);
  assert.match(
    interactions,
    /sameReaderOverlayFamily\s*=\s*Boolean\([\s\S]*originReaderState\.mode\s*!==\s*["']immersive["'][\s\S]*targetReaderState\.mode\s*!==\s*["']immersive["']/,
  );
  assert.match(interactions, /shouldReplaceRoute[\s\S]*\|\|\s*sameReaderOverlayFamily/);
  assert.match(interactions, /if\s*\(shouldReplaceRoute\)\s*\{\s*replaceTopRoute\(route,/);
  assert.match(
    interactions,
    /originReaderState\?\.mode\s*===\s*["']module["'][\s\S]*originReaderState\.module\s*===\s*\(targetEl\.getAttribute\(\s*["']data-module["']\s*\)/,
  );
  assert.match(interactions, /replaceTopRoute\(\s*["']reader["']/);
});

test("runtime publishes the six shared ReaderShell fragment APIs", () => {
  const window = evaluateScript(runtimeSource, "render-runtime.js");
  const api = window.ReaderRuntimeSharedFragments;
  assert.ok(api, "ReaderRuntimeSharedFragments must be published");

  const expected = [
    "frameStyle",
    "surfaceHtml",
    "topOverlayHtml",
    "stateHostHtml",
    "brightnessRailHtml",
    "originReaderScreen",
  ];
  assert.deepEqual(Object.keys(api).sort(), expected.slice().sort());
  for (const name of expected) {
    assert.equal(typeof api[name], "function", `${name} must be a function`);
  }
});

test("brightness rail uses one independent anchor and is omitted from quick full pages", () => {
  const quickFullPageScreen = sourceSection(
    runtimeSource,
    "  function readerQuickFullPageScreen(",
    "  function readerUtilityScreen(",
  );
  const standardRailCss = sourceSection(
    readerBrightnessCss,
    ".fd-brightness-rail {",
    ".fd-brightness-rail i {",
  );

  assert.doesNotMatch(
    quickFullPageScreen,
    /readerBrightnessRail\s*\(/,
    "the expanded quick page must not append an unanchored brightness rail to fd-reader-full-host",
  );
  assert.doesNotMatch(
    quickFullPageScreen,
    /brightnessRailHtml\s*\(/,
    "the expanded quick page must not append the shared rail either",
  );

  for (const property of ["top", "right", "bottom", "width"]) {
    assert.match(
      standardRailCss,
      new RegExp(`${property}:\\s*var\\(--reader-brightness(?:-rail)?-${property}(?:\\s*,[^)]*)?\\)`),
      `standard brightness ${property} must use its own brightness anchor variable`,
    );
  }
  assert.doesNotMatch(
    standardRailCss,
    /--reader-quick-/,
    "brightness geometry must not inherit panel-layout variables",
  );
  assert.match(
    readerControlCss,
    /--reader-brightness(?:-rail)?-top\s*:/,
    "the reader sheet must publish the canonical brightness anchor",
  );
  assert.doesNotMatch(
    readerViewportCss,
    /\[data-current-route=[^\]]+\][^{,]*\.fd-brightness-rail/,
    "viewport CSS must not move brightness by individual route",
  );
});

test("D3 and W5 fallbacks use standard brightness markup", () => {
  const d3BrightnessRail = sourceSection(
    d3Source,
    "  function d3BrightnessRail(",
    "  // ===========================================================================\n  // L0 沉浸层渲染",
  );
  const w5BrightnessRail = sourceSection(
    w5Source,
    "  function readerBrightnessRailHtml(",
    "  function readerModuleNavHtml(",
  );

  for (const [owner, source] of [["D3", d3BrightnessRail], ["W5", w5BrightnessRail]]) {
    assert.match(source, /brightnessRailHtml/, `${owner} must prefer the shared brightness API`);
    assert.match(source, /<aside class="fd-brightness-rail"/, `${owner} fallback must use the standard rail class`);
    assert.match(source, /data-reader-brightness-track/, `${owner} fallback must use the standard track binding`);
    assert.doesNotMatch(source, /fd-reader-brightness-rail/);
    assert.doesNotMatch(source, /data-reader-brightness-slider/);
  }
});

test("reader rerenders capture and restore reading and panel scroll positions", () => {
  const capture = sourceSection(
    runtimeSource,
    "  function captureReaderScrollSnapshot(",
    "  function restoreReaderScrollSnapshot(",
  );
  const restore = sourceSection(
    runtimeSource,
    "  function restoreReaderScrollSnapshot(",
    "  function readerTapZones(",
  );
  const renderActiveRoute = sourceSection(
    runtimeSource,
    "    const renderActiveRoute = (route, options) => {",
    "    const renderCurrentRoute = () => {",
  );

  assert.match(capture, /scrollTop/);
  assert.match(capture, /scrollLeft/);
  assert.match(capture, /data-reader-surface-signature/);
  assert.match(restore, /node\.scrollLeft\s*=\s*item\.left/);
  assert.match(restore, /node\.scrollTop\s*=\s*item\.top/);

  const captureIndex = renderActiveRoute.indexOf("captureReaderScrollSnapshot(screenHost)");
  const renderIndex = renderActiveRoute.indexOf("screenHost.innerHTML = renderRoute");
  const restoreIndex = renderActiveRoute.indexOf("restoreReaderScrollSnapshot(screenHost");
  assert.ok(captureIndex >= 0 && renderIndex > captureIndex && restoreIndex > renderIndex);
  assert.match(renderActiveRoute, /requestAnimationFrame\([\s\S]*restoreReaderScrollSnapshot\(screenHost/);
});

test("D3, W3, W4, and W5 consume runtime-owned reader continuity fragments", () => {
  const sentinel = (name) => `SENTINEL:${name}`;
  const sharedCalls = [];
  const sharedFragments = {
    frameStyle() {
      sharedCalls.push("frameStyle");
      return sentinel("frameStyle");
    },
    surfaceHtml() {
      sharedCalls.push("surfaceHtml");
      return sentinel("surfaceHtml");
    },
    topOverlayHtml() {
      sharedCalls.push("topOverlayHtml");
      return sentinel("topOverlayHtml");
    },
    stateHostHtml() {
      sharedCalls.push("stateHostHtml");
      return sentinel("stateHostHtml");
    },
    brightnessRailHtml() {
      sharedCalls.push("brightnessRailHtml");
      return sentinel("brightnessRailHtml");
    },
    originReaderScreen() {
      sharedCalls.push("originReaderScreen");
      return `<main data-origin-reader-sentinel>${sentinel("originReaderScreen")}</main>`;
    },
  };
  const storage = {
    getItem() { return null; },
    setItem() {},
    removeItem() {},
  };
  const shellKit = {
    esc(value) { return String(value == null ? "" : value); },
    icon(name) { return `[icon:${name}]`; },
    renderReaderShell(options) { return JSON.stringify(options); },
    renderFlowShell(options) {
      return `${options.stepHtml || ""}${options.comparisonHtml || ""}${options.resultHtml || ""}`;
    },
  };

  const d3Window = evaluateScript(d3Source, "d3-control-layers-renderers.js", {
    ReaderShellKit: shellKit,
    ReaderRuntimeSharedFragments: sharedFragments,
  });
  const d3Html = d3Window.ReaderD3ControlLayersRenderers.readerControlShowV2(
    { reader: {} },
    { readerBrightness: 70 },
  );
  assert.ok(sharedCalls.includes("brightnessRailHtml"), "D3 must consume the shared brightness rail");
  assert.match(d3Html, new RegExp(sentinel("brightnessRailHtml")));

  sharedCalls.length = 0;
  const w3Window = evaluateScript(w3Source, "w3-source-switch-renderers.js", {
    ReaderShellKit: shellKit,
    ReaderRuntimeSharedFragments: sharedFragments,
  });
  const w3Html = w3Window.ReaderW3SourceSwitchRenderers.sourceSwitchEmptyScreen(
    { reader: {}, flow: { candidates: [] } },
    { sourceSwitchOriginRoute: "reader-full-tts" },
  );
  assert.match(w3Html, /data-origin-reader-sentinel/);

  sharedCalls.length = 0;
  const w4Window = evaluateScript(w4Source, "w4-theme-font-typography-renderers.js", {
    ReaderShellKit: shellKit,
    ReaderRuntimeSharedFragments: sharedFragments,
    localStorage: storage,
  });
  const w4Html = w4Window.ReaderW4ThemeFontTypographyRenderers.screenMap["reader-full-appearance"](
    { reader: {} },
    { readerTheme: "day" },
  );
  for (const name of ["frameStyle", "surfaceHtml", "topOverlayHtml", "stateHostHtml"]) {
    assert.ok(sharedCalls.includes(name), `W4 must consume ${name}`);
    assert.match(w4Html, new RegExp(sentinel(name)));
  }

  sharedCalls.length = 0;
  const w5Window = evaluateScript(w5Source, "w5-replace-rules-renderers.js", {
    ReaderShellKit: shellKit,
    ReaderRuntimeSharedFragments: sharedFragments,
    localStorage: storage,
  });
  const w5Html = w5Window.ReaderW5ReplaceRulesRenderers.readerReplacePageScreen(
    { reader: {} },
    { readerBrightness: 70 },
  );
  for (const name of ["frameStyle", "surfaceHtml", "topOverlayHtml", "stateHostHtml"]) {
    assert.ok(sharedCalls.includes(name), `W5 must consume ${name}`);
    assert.match(w5Html, new RegExp(sentinel(name)));
  }

  sharedCalls.length = 0;
  const w5OverlayHtml = w5Window.ReaderW5ReplaceRulesRenderers.readerReplaceOverlayV2Screen(
    { reader: {} },
    "reader-replace-overlay-v2",
    { readerBrightness: 70 },
  );
  assert.ok(sharedCalls.includes("brightnessRailHtml"), "W5 overlay must consume the shared brightness rail");
  assert.match(w5OverlayHtml, new RegExp(sentinel("brightnessRailHtml")));
});
