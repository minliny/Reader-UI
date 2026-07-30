import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");

function source(relativePath) {
  return readFileSync(join(demoRoot, relativePath), "utf8");
}

const sources = Object.freeze({
  policy: source("figma-route-admission-policy.js"),
  publicAdmission: source("public-route-renderer-admission.js"),
  kit: source("shared-shell-kit/kit.js"),
  appearance: source("appearance-spec.js"),
  declarations: source("control-identity-declarations.js"),
  d2Settings: source("renderers/d2-settings-sync-renderers.js"),
  d2Bookshelf: source("renderers/d2-bookshelf-discover-renderers.js"),
  w3: source("renderers/w3-source-switch-renderers.js"),
  w4: source("renderers/w4-theme-font-typography-renderers.js"),
  w5: source("renderers/w5-replace-rules-renderers.js"),
  d3: source("renderers/d3-control-layers-renderers.js"),
  d4: source("renderers/d4-visual-polish-renderers.js"),
  d5: source("renderers/d5-motion-closure-renderers.js"),
  d6: source("renderers/d6-capability-closure-renderers.js")
});

function createWindow() {
  return {
    localStorage: {
      values: {},
      getItem(key) { return this.values[key] || null; },
      setItem(key, value) { this.values[key] = String(value); },
      removeItem(key) { delete this.values[key]; }
    },
    ReaderFrontendDemoDraftRouteContract: { routes: {}, routePresentation: {} }
  };
}

function run(context, name) {
  new vm.Script(sources[name], { filename: `${name}.js` }).runInContext(context);
}

function freshModules({ withPolicy = true } = {}) {
  const window = createWindow();
  const context = vm.createContext({ window, Promise, setTimeout, Map, Set, JSON, Math, Number, Array, String });
  if (withPolicy) run(context, "policy");
  run(context, "publicAdmission");
  run(context, "kit");
  run(context, "appearance");
  run(context, "declarations");
  for (const name of ["d2Settings", "d2Bookshelf", "w3", "w4", "w5", "d3", "d4", "d5", "d6"]) run(context, name);
  return window;
}

test("public route renderers fail before producing local HTML for unclassified and retired routes", () => {
  const window = freshModules();
  assert.equal(window.ReaderD2BookshelfDiscoverRenderers.bookshelfSearchSettingsV2, undefined);
  assert.equal(window.ReaderD2BookshelfDiscoverRenderers.bookBatchManagementV2, undefined);
  const blockedCalls = [
    ["D2 settings dispatcher", () => window.ReaderD2SettingsSyncRenderers.renderD2Route("sync-settings-entry", {}, {}), /UNCLASSIFIED_ROUTE_NO_FIGMA_VISUAL/],
    ["W3 direct state renderer", () => window.ReaderW3SourceSwitchRenderers.sourceSwitchV2({}, "source-switch-results", {}), /RETIRED_FIGMA_VISUAL/],
    ["W4 dispatcher", () => window.ReaderW4ThemeFontTypographyRenderers.renderW4Route("reader-font-import-confirm", {}, {}, {}), /UNCLASSIFIED_ROUTE_NO_FIGMA_VISUAL/],
    ["W4 direct screen map", () => window.ReaderW4ThemeFontTypographyRenderers.screenMap["reader-font-import-confirm"]({}, {}), /UNCLASSIFIED_ROUTE_NO_FIGMA_VISUAL/],
    ["W5 direct renderer", () => window.ReaderW5ReplaceRulesRenderers.readerReplacePageScreen({}, "reader-replace-page", {}), /UNCLASSIFIED_ROUTE_NO_FIGMA_VISUAL/],
    ["D3 dispatcher", () => window.ReaderD3ControlLayersRenderers.renderD3Route("reader-module-switch", {}, {}), /UNCLASSIFIED_ROUTE_NO_FIGMA_VISUAL/],
    ["D4 conceptual dispatcher", () => window.ReaderD4VisualPolishRenderers.renderD4Route("settings-theme", {}, {}), /UNCLASSIFIED_ROUTE_NO_FIGMA_VISUAL/],
    ["D6 capability renderer", () => window.ReaderD6CapabilityClosureRenderers.renderCapabilityRoute("pdf-reader", {}, {}), /D6_CONTRACT_ONLY_NO_FIGMA_VISUAL/]
  ];

  for (const [label, call, expected] of blockedCalls) {
    assert.throws(call, expected, label);
  }
});

test("missing Figma admission policy fails closed across every active public renderer family", () => {
  const window = freshModules({ withPolicy: false });
  const policyDependentCalls = [
    () => window.ReaderD2SettingsSyncRenderers.renderD2Route("source-management", {}, {}),
    () => window.ReaderD2BookshelfDiscoverRenderers.bookshelfV2({}, "bookshelf", {}),
    () => window.ReaderW3SourceSwitchRenderers.sourceSwitchV2({}, "source-switch", {}),
    () => window.ReaderW4ThemeFontTypographyRenderers.renderW4Route("reader-font-import-confirm", {}, {}, {}),
    () => window.ReaderW5ReplaceRulesRenderers.readerReplaceOverlayV2Screen({}, "reader-replace-overlay-v2", {}),
    () => window.ReaderD3ControlLayersRenderers.renderD3Route("control-layer-base-v2", {}, {}),
    () => window.ReaderD4VisualPolishRenderers.renderD4Route("settings-theme", {}, {}),
    () => window.ReaderD6CapabilityClosureRenderers.renderCapabilityRoute("pdf-reader", {}, {})
  ];
  for (const call of policyDependentCalls) {
    assert.throws(call, /ReaderFigmaRouteAdmissionPolicy is required/);
  }
  // A chained dispatcher must pass an unowned RouteId through as its
  // documented empty sentinel; it may not create a fallback page.
  assert.equal(window.ReaderD5MotionClosureRenderers.renderD5Route("not-a-route", {}, {}), null);
});

test("every exported route-renderer module declares an auditable guarded surface", () => {
  const window = freshModules();
  const modules = [
    window.ReaderD2SettingsSyncRenderers,
    window.ReaderD2BookshelfDiscoverRenderers,
    window.ReaderW3SourceSwitchRenderers,
    window.ReaderW4ThemeFontTypographyRenderers,
    window.ReaderW5ReplaceRulesRenderers,
    window.ReaderD3ControlLayersRenderers,
    window.ReaderD4VisualPolishRenderers,
    window.ReaderD5MotionClosureRenderers,
    window.ReaderD6CapabilityClosureRenderers
  ];
  for (const api of modules) {
    assert.ok(api.PUBLIC_ROUTE_RENDERER_BINDINGS, "module must declare public route-renderer bindings");
    for (const [rendererName, routes] of Object.entries(api.PUBLIC_ROUTE_RENDERER_BINDINGS)) {
      assert.ok(Array.isArray(routes), rendererName);
    }
  }

  // Fixed-route screen APIs intentionally ignore a caller-supplied spare
  // RouteId; their own canonical RouteId is checked instead. Chained
  // dispatchers return their documented no-owner sentinel for an unrelated
  // RouteId, so the next dispatcher can own it; they must never return HTML.
  const chainedDispatchers = [
    [() => window.ReaderD2SettingsSyncRenderers.renderD2Route("not-a-route", {}, {})],
    [() => window.ReaderW4ThemeFontTypographyRenderers.renderW4Route("not-a-route", {}, {}, {})],
    [() => window.ReaderD3ControlLayersRenderers.renderD3Route("not-a-route", {}, {})],
    [() => window.ReaderD4VisualPolishRenderers.renderD4Route("not-a-route", {}, {})],
    [() => window.ReaderD5MotionClosureRenderers.renderD5Route("not-a-route", {}, {})],
    [() => window.ReaderD6CapabilityClosureRenderers.renderD6Route("not-a-route", {}, {})]
  ];
  for (const [call] of chainedDispatchers) {
    const result = call();
    assert.ok(result == null || result === '', 'unowned dispatcher must not render a local visual fallback');
  }
  for (const call of [
    () => window.ReaderD2BookshelfDiscoverRenderers.bookshelfV2({}, "not-a-route", {}),
    () => window.ReaderW3SourceSwitchRenderers.sourceSwitchV2({}, "not-a-route", {}),
    () => window.ReaderW5ReplaceRulesRenderers.readerReplacePageScreen({}, "not-a-route", {})
  ]) {
    assert.throws(call, /PUBLIC_RENDERER_ROUTE_UNBOUND/);
  }
});

test("chained dispatchers pass unrelated Figma-bound routes through before the owning family renders", () => {
  const window = freshModules();
  assert.equal(window.ReaderW4ThemeFontTypographyRenderers.renderW4Route("book-detail", {}, {}, {}), "");
  assert.equal(window.ReaderD2SettingsSyncRenderers.renderD2Route("book-detail", {}, {}), "");
  assert.equal(window.ReaderD3ControlLayersRenderers.renderD3Route("book-detail", {}, {}), null);
  assert.equal(window.ReaderD4VisualPolishRenderers.renderD4Route("book-detail", {}, {}), null);
  assert.equal(window.ReaderD5MotionClosureRenderers.renderD5Route("book-detail", {}, {}), null);
  assert.equal(window.ReaderD6CapabilityClosureRenderers.renderD6Route("book-detail", {}, {}), null);
});
