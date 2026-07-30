import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");
const repoRoot = join(demoRoot, "..");
const readDemo = (path) => readFileSync(join(demoRoot, path), "utf8");

const routeSource = readDemo("route-contract.js");
const runtimeSource = readDemo("render-runtime.js");
const shellSource = readDemo("shared-shell-kit/kit.js");
const foundationCss = readDemo("styles/00-foundation.css");
const responsiveCss = readDemo("styles/06-responsive.css");
const readme = readFileSync(join(repoRoot, "README.md"), "utf8");
const viewStateFixtures = JSON.parse(readFileSync(join(repoRoot, "contracts/fixtures/view-state.fixtures.json"), "utf8"));
const routeSchema = JSON.parse(readFileSync(join(repoRoot, "contracts/route.schema.json"), "utf8"));
const screenGraphCoverage = JSON.parse(readFileSync(join(repoRoot, "generated/screen-graph-coverage.json"), "utf8"));

const context = vm.createContext({ window: {} });
new vm.Script(routeSource, { filename: "route-contract.js" }).runInContext(context);
const contract = context.window.ReaderFrontendDemoDraftRouteContract;

test("optimized demo remains the explicit canonical runnable source", () => {
  assert.match(readme, /frontend-demo-optimized\/.*canonical runnable demo/);
  assert.doesNotMatch(readme, /frontend-demo-next\/.*canonical runnable demo/);
});

test("every route has one family, default surface and layout profile", () => {
  const routeIds = Object.keys(contract.routes);
  const presentationIds = Object.keys(contract.routePresentation);
  assert.equal(routeIds.length, routeSchema.properties.id.enum.length);
  assert.deepEqual([...routeIds].sort(), [...routeSchema.properties.id.enum].sort());
  assert.deepEqual(presentationIds, routeIds);
  for (const routeId of routeIds) {
    const item = contract.routePresentation[routeId];
    assert.ok(item.family, `${routeId} family`);
    assert.ok(["page", "overlay", "state"].includes(item.defaultSurface), `${routeId} default surface`);
    assert.equal(item.surface, undefined, `${routeId} must not publish a RouteId-only active surface`);
    assert.ok(["main-tab", "library-stack", "reader-control", "settings-stack", "flow-continuity", "wide-workspace"].includes(item.layout), `${routeId} layout`);
  }
  assert.equal(contract.routePresentation["source-switch-loading"].layout, "flow-continuity");
  assert.equal(contract.routePresentation["source-switch-loading"].defaultSurface, "state");
  assert.equal(contract.routePresentation["reader-theme-delete-confirm"].defaultSurface, "overlay");
  assert.equal(contract.routePresentation["source-code-view"].layout, "wide-workspace");
  assert.equal(contract.routePresentation["settings-general"].layout, "settings-stack");
});

test("all ViewState fixtures resolve surface from page and overlay state", () => {
  const statePageStates = new Set([
    "empty", "error", "format-unsupported", "loading", "offline", "partial-success",
    "permission", "permission-denied", "refreshing", "rollback", "running",
    "shelf-empty", "source-unavailable", "timeout"
  ]);
  const hasOverlayComponent = (components) => (components || []).some((component) => (
    ["Dialog", "NightToast", "Toast"].includes(component.type)
      || hasOverlayComponent(component.children)
  ));

  assert.equal(viewStateFixtures.length, screenGraphCoverage.viewStateFixtures);
  for (const fixture of viewStateFixtures) {
    const resolved = contract.resolveRoutePresentation(fixture.routeId, fixture);
    const expected = hasOverlayComponent(fixture.components)
      ? "overlay"
      : statePageStates.has(fixture.pageState)
        ? "state"
        : contract.routePresentation[fixture.routeId].defaultSurface;
    assert.equal(resolved.surface, expected, `${fixture.routeId}/${fixture.pageState}`);
    assert.equal(resolved.pageState, fixture.pageState, `${fixture.routeId} pageState`);
  }

  assert.equal(contract.resolveRoutePresentation("reader", { pageState: "default" }).surface, "page");
  assert.equal(contract.resolveRoutePresentation("reader", { pageState: "loading" }).surface, "state");
  assert.equal(contract.resolveRoutePresentation("reader", { pageState: "offline" }).surface, "state");
  assert.equal(contract.resolveRoutePresentation("import-duplicate", viewStateFixtures.find((item) => item.routeId === "import-duplicate")).surface, "overlay");
  assert.equal(contract.resolveRoutePresentation("source-switch-rollback", viewStateFixtures.find((item) => item.routeId === "source-switch-rollback")).surface, "overlay");
});

test("runtime exposes route presentation to CSS without route-specific geometry", () => {
  assert.match(runtimeSource, /data-route-family/);
  assert.match(runtimeSource, /data-route-surface/);
  assert.match(runtimeSource, /data-route-layout/);
  assert.match(runtimeSource, /data-view-page-state/);
  assert.match(runtimeSource, /data-view-overlay-state/);
  assert.match(runtimeSource, /resolveRoutePresentation\(route, viewState\)/);
  assert.doesNotMatch(foundationCss, /data-current-route=/);
  assert.doesNotMatch(responsiveCss, /data-current-route=/);
  assert.match(foundationCss, /data-route-layout="wide-workspace"/);
  assert.match(responsiveCss, /data-route-layout="flow-continuity"/);
});

test("ReaderShell owns one explicit accessory slot outside panel content", () => {
  assert.match(shellSource, /data-slot="readerAccessoryHost"/);
  assert.ok(
    shellSource.indexOf('data-slot="bottomSheetHost"') < shellSource.indexOf('data-slot="readerAccessoryHost"'),
  );
  const bottomSheetStart = runtimeSource.indexOf("  function readerBottomSheetHtml(");
  const bottomSheetEnd = runtimeSource.indexOf("  function readerControlHomeOverlay(", bottomSheetStart);
  const bottomSheetSource = runtimeSource.slice(bottomSheetStart, bottomSheetEnd);
  assert.doesNotMatch(bottomSheetSource, /readerBrightnessRail\s*\(/);
  assert.match(runtimeSource, /accessoryHtml:\s*controlHome\?\.accessoryHtml\s*\|\|\s*\(isImmersive\s*\?\s*["']["']\s*:\s*readerBrightnessRail/);
});

test("the product has one immersive session capsule and no duplicate control-space DOM", () => {
  assert.match(runtimeSource, /readerImmersiveStatusCapsule\(appState\)/);
  assert.doesNotMatch(runtimeSource, /data-reader-control-space/);
  assert.doesNotMatch(runtimeSource, /readerControlSpaceSnapshot/);
});
