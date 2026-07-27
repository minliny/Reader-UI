import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");
const registry = JSON.parse(readFileSync(
  join(demoRoot, "../docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json"),
  "utf8",
));
const policySource = readFileSync(join(demoRoot, "figma-route-admission-policy.js"), "utf8");
const publicRendererAdmissionSource = readFileSync(join(demoRoot, "public-route-renderer-admission.js"), "utf8");
const kitSource = readFileSync(join(demoRoot, "shared-shell-kit/kit.js"), "utf8");
const appearanceSource = readFileSync(join(demoRoot, "appearance-spec.js"), "utf8");
const declarationsSource = readFileSync(join(demoRoot, "control-identity-declarations.js"), "utf8");
const d2Source = readFileSync(join(demoRoot, "renderers/d2-settings-sync-renderers.js"), "utf8");
const runtimeSource = readFileSync(join(demoRoot, "render-runtime.js"), "utf8");
const indexSource = readFileSync(join(demoRoot, "index.html"), "utf8");
const bootstrapSource = readFileSync(join(demoRoot, "render.js"), "utf8");

// This test intentionally owns only the nine open retirement records named
// in the current writer scope.  The registry also retains an already-enforced
// historical Source Management compatibility record whose wider route union
// must not be reclassified or changed by this transaction.
const RETIREMENT_ENFORCEMENT_SCOPE_IDS = new Set([
  "bookshelf.book-more-menu-legacy-route",
  "source-management.historical-pilot",
  "restore-preview.withdrawn",
  "search.history-expanded",
  "source-switch.legacy-state-matrix",
  "about.withdrawn",
  "local-import.legacy-error-and-conflict-pages",
  "bookshelf.group-management.withdrawn",
  "compact-and-fold.viewport-policy",
]);
const retirementRecords = registry.records.filter(
  (record) => RETIREMENT_ENFORCEMENT_SCOPE_IDS.has(record.id),
);
assert.equal(retirementRecords.length, RETIREMENT_ENFORCEMENT_SCOPE_IDS.size,
  "the current transaction must not silently expand or shrink its retired scope");
const registryRetiredRouteIds = [...new Set(retirementRecords.flatMap((record) => record.routeIds || []))]
  .sort();
const registryRetiredComponentStateIds = retirementRecords
  .filter((record) => record.surfaceType === "component-family" || record.surfaceType === "component-state")
  .map((record) => record.id)
  .sort();
const registryRetiredViewportPolicyIds = retirementRecords
  .filter((record) => record.surfaceType === "viewport-policy")
  .map((record) => record.id)
  .sort();

function freshPolicy() {
  const context = vm.createContext({ window: {} });
  context.window.window = context.window;
  new vm.Script(policySource, { filename: "figma-route-admission-policy.js" }).runInContext(context);
  return context.window.ReaderFigmaRouteAdmissionPolicy;
}

function freshD2WithPolicy() {
  const window = {
    localStorage: {
      _store: {},
      getItem(key) { return this._store[key] || null; },
      setItem(key, value) { this._store[key] = value; },
      removeItem(key) { delete this._store[key]; }
    },
    ReaderFrontendDemoDraftRouteContract: {
      routes: {
        "source-management": { title: "书源管理" },
        "source-debug": { title: "书源调测" }
      },
      routePresentation: {}
    }
  };
  const context = vm.createContext({ window, Promise, setTimeout });
  new vm.Script(policySource, { filename: "figma-route-admission-policy.js" }).runInContext(context);
  new vm.Script(publicRendererAdmissionSource, { filename: "public-route-renderer-admission.js" }).runInContext(context);
  new vm.Script(kitSource, { filename: "kit.js" }).runInContext(context);
  new vm.Script(appearanceSource, { filename: "appearance-spec.js" }).runInContext(context);
  new vm.Script(declarationsSource, { filename: "control-identity-declarations.js" }).runInContext(context);
  new vm.Script(d2Source, { filename: "d2-settings-sync-renderers.js" }).runInContext(context);
  return context.window.ReaderD2SettingsSyncRenderers;
}

test("route-admission policy blocks every known local stand-in category", () => {
  const policy = freshPolicy();
  assert.equal(policy.D6_CAPABILITY_CONTRACT_ROUTES.length, 24);
  assert.equal(policy.GENERIC_CONTRACT_STATIC_ROUTES.length, 8);
  assert.equal(policy.SOURCE_MANAGEMENT_UNBOUND_ROUTES.length, 23);

  for (const route of policy.D6_CAPABILITY_CONTRACT_ROUTES) {
    assert.equal(policy.blockedReason(route).code, "D6_CONTRACT_ONLY_NO_FIGMA_VISUAL", route);
    assert.throws(() => policy.assertRouteRenderable(route), /D6_CONTRACT_ONLY_NO_FIGMA_VISUAL/, route);
  }
  for (const route of policy.GENERIC_CONTRACT_STATIC_ROUTES) {
    assert.equal(policy.blockedReason(route).code, "GENERIC_CONTRACT_STATIC_NO_FIGMA_VISUAL", route);
    assert.throws(() => policy.assertRouteRenderable(route), /GENERIC_CONTRACT_STATIC_NO_FIGMA_VISUAL/, route);
  }
  for (const route of policy.SOURCE_MANAGEMENT_UNBOUND_ROUTES) {
    assert.equal(policy.blockedReason(route).code, "SOURCE_MANAGEMENT_SUBPAGE_UNBOUND", route);
    assert.throws(() => policy.assertRouteRenderable(route), /SOURCE_MANAGEMENT_SUBPAGE_UNBOUND/, route);
  }
});

test("only registry exact bindings are admitted; every unclassified route fails closed", () => {
  const policy = freshPolicy();
  const registryExactRouteIds = registry.records
    .filter((record) => record.classification === "exact-figma-binding")
    .flatMap((record) => record.routeIds || []);
  const uniqueRegistryExactRouteIds = [...new Set(registryExactRouteIds)]
    .sort();
  assert.deepEqual(
    [...policy.EXACT_FIGMA_ADMITTED_ROUTE_IDS].sort(),
    uniqueRegistryExactRouteIds,
    "runtime allowlist must exactly mirror Figma admission registry",
  );

  assert.equal(policy.blockedReason("source-management"), null);
  assert.equal(policy.assertRouteRenderable("source-management"), true);
  assert.equal(policy.assertRouteRenderable("bookshelf"), true);
  for (const route of ["rss-detail", "reader-debug-info", "app-shell", "not-a-route"]) {
    assert.equal(policy.blockedReason(route).code, "UNCLASSIFIED_ROUTE_NO_FIGMA_VISUAL", route);
    assert.throws(() => policy.assertRouteRenderable(route), /UNCLASSIFIED_ROUTE_NO_FIGMA_VISUAL/, route);
  }
});

test("every registry-declared retirement has a named local denial before generic default-deny", () => {
  const policy = freshPolicy();
  assert.deepEqual(
    [...policy.RETIRED_FIGMA_ROUTE_IDS].sort(),
    registryRetiredRouteIds,
    "retired RouteId policy must exactly mirror the registry withdrawal union",
  );
  assert.deepEqual(
    [...policy.RETIRED_FIGMA_COMPONENT_STATE_IDS].sort(),
    registryRetiredComponentStateIds,
    "non-route retired visual states must remain named without inventing routes",
  );
  assert.deepEqual(
    [...policy.RETIRED_FIGMA_VIEWPORT_POLICY_IDS].sort(),
    registryRetiredViewportPolicyIds,
    "retired viewport policy must remain explicit",
  );

  for (const route of registryRetiredRouteIds) {
    assert.equal(policy.blockedReason(route).code, "RETIRED_FIGMA_VISUAL", route);
    assert.throws(() => policy.assertRouteRenderable(route), /RETIRED_FIGMA_VISUAL/, route);
    assert.equal(policy.EXACT_FIGMA_ADMITTED_ROUTE_IDS.includes(route), false, route);
  }
  for (const stateId of registryRetiredComponentStateIds) {
    assert.equal(policy.isRetiredVisualState(stateId), true, stateId);
  }
  for (const policyId of registryRetiredViewportPolicyIds) {
    assert.equal(policy.isRetiredViewportPolicy(policyId), true, policyId);
  }
});

test("generic contractStatic card is permanently unavailable as a production fallback", () => {
  const policy = freshPolicy();
  assert.throws(
    () => policy.assertContractStaticSurfaceNotAllowed("search-loading"),
    /GENERIC_CONTRACT_STATIC_RENDERER/,
  );
  assert.match(runtimeSource, /assertContractStaticSurfaceNotAllowed\(route\)/);
  assert.doesNotMatch(
    runtimeSource,
    /default:\s*\n\s*return mainTabBookshelf\(data, appState\);/,
  );
});

test("D2 Source Management secondary routes cannot bypass the runtime route guard", () => {
  const d2 = freshD2WithPolicy();
  const primaryHtml = d2.renderD2Route("source-management", {}, {});
  assert.match(primaryHtml, /书源管理/);
  for (const route of ["source-settings-entry", "source-debug", "source-import-export"]) {
    assert.throws(
      () => d2.renderD2Route(route, {}, {}),
      /SOURCE_MANAGEMENT_SUBPAGE_UNBOUND/,
      route,
    );
  }
});

test("retired Source Management pilot state is stripped before the final Figma list renders", () => {
  const d2 = freshD2WithPolicy();
  const before = d2.sourceManagement.defaultState();
  for (const action of [
    "TOGGLE_MENU",
    "OPEN_ADD_SHEET",
    "ENTER_BATCH_MODE",
    "DELETE_CONFIRM_OPEN",
  ]) {
    assert.equal(
      d2.sourceManagement.reducer(before, { type: action }),
      before,
      `${action} must not revive source-management.historical-pilot`,
    );
  }
  const html = d2.renderD2Route("source-management", {}, {});
  assert.doesNotMatch(html, /fd-source-more-menu|fd-source-delete-dialog|fd-source-batch/);
});

test("interactive runtime and capture board gate routes before any local renderer can run", () => {
  const renderRouteIndex = runtimeSource.indexOf("function renderRoute(route, data, options, appState)");
  const routeAdmissionIndex = runtimeSource.indexOf("assertFigmaRouteAdmission(route);", renderRouteIndex);
  const firstModuleDispatch = runtimeSource.indexOf("ReaderW4ThemeFontTypographyRenderers", renderRouteIndex);
  assert.ok(routeAdmissionIndex > renderRouteIndex, "renderRoute has admission check");
  assert.ok(routeAdmissionIndex < firstModuleDispatch, "admission precedes module dispatch");
  assert.match(runtimeSource, /const frozenReason = admissionPolicy\.blockedReason\?\.\(route\)/);
  assert.match(runtimeSource, /UNADMITTED_OR_NO_RENDERER/);
  assert.match(runtimeSource, /No local visual fallback is rendered/);

  const policyScriptIndex = indexSource.indexOf("figma-route-admission-policy.js");
  const publicRendererAdmissionIndex = indexSource.indexOf("public-route-renderer-admission.js");
  const d6ScriptIndex = indexSource.indexOf("d6-capability-closure-renderers.js");
  const bootstrapIndex = indexSource.indexOf("./render.js");
  assert.ok(policyScriptIndex >= 0 && policyScriptIndex < publicRendererAdmissionIndex);
  assert.ok(publicRendererAdmissionIndex < d6ScriptIndex);
  assert.ok(d6ScriptIndex < bootstrapIndex);
  assert.match(indexSource, /figma-route-admission-policy\.js\?v=figma-route-admission-default-deny-v2-20260724/);
  assert.match(indexSource, /public-route-renderer-admission\.js\?v=public-renderer-admission-v1-20260724/);
  assert.match(indexSource, /d6-capability-closure-renderers\.js\?v=figma-route-admission-default-deny-v2-20260724/);
  assert.match(indexSource, /render\.js\?v=figma-route-admission-default-deny-v2-20260724/);
  assert.match(bootstrapSource, /figma-route-admission-default-deny-v2-20260724/);
});
