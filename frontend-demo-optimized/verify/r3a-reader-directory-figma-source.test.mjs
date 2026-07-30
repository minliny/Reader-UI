import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (relativePath) => readFileSync(join(repoRoot, relativePath), "utf8");
const json = (relativePath) => JSON.parse(read(relativePath));
const contractSource = read("frontend-demo-optimized/reader-runtime-contract.js");
const runtimeSource = read("frontend-demo-optimized/render-runtime.js");

function freshContract() {
  const sandbox = { module: { exports: {} }, window: {}, globalThis: {} };
  new vm.Script(contractSource).runInNewContext(sandbox);
  return sandbox.module.exports;
}

test("B1 Directory binding resolves the live master, variants, and final instances", () => {
  const registry = json("docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json");
  const record = registry.records.find((entry) => entry.id === "reader.module.directory");
  const receipt = json("docs/design/handoffs/reader-runtime/directory/B1_FIGMA_LIVE_READ.json");
  const crosswalk = json("docs/design/handoffs/reader-runtime/directory/FIGMA_F0_CROSSWALK.json");
  const official = json("docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json");

  assert.equal(record.figma.fileKey, "klhs2jMM4MncaJFqZMfqEK");
  assert.equal(record.figma.canonicalMasterId, "942:61");
  assert.deepEqual(record.figma.viewportNodes, { phone: "942:58", tablet: "942:60" });
  assert.deepEqual(record.figma.finalAssemblyNodes, { phone: "943:9888", tablet: "943:10196" });
  assert.deepEqual(receipt.resolvedNodes.map((entry) => entry.nodeId), ["942:58", "942:60"]);
  assert.deepEqual(receipt.finalAssemblyInstances.map((entry) => entry.mainComponentId), ["942:58", "942:60"]);
  assert.deepEqual(crosswalk.binding.finalAssemblyNodes, record.figma.finalAssemblyNodes);
  assert.equal(record.figma.revision, official.currentRevision);
  assert.equal(receipt.revision.numericRevisionExposedByConnector, false);
  assert.equal(receipt.revision.noFabricatedRevision, true);
});

test("B2 registry admits only the route-independent Directory overlay source", () => {
  const registry = json("docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json");
  const record = registry.records.find((entry) => entry.id === "reader.module.directory");
  assert.deepEqual(record.routeIds, []);
  assert.deepEqual(record.overlayKinds, ["directory"]);
  assert.equal(record.local.status, "implementation-ready");
  assert.equal(record.harmony.status, "candidate-backport");
  assert.deepEqual(record.local.targets, [
    "frontend-demo-optimized/render-runtime.js#readerDirectoryOverlay",
  ]);
  assert.equal(record.reconstruction.status, "source-conversion-complete");
});

test("B2 Directory reducer switches and dismisses the overlay without changing route identity", () => {
  const api = freshContract();
  const owner = api.createOwner({ route: "reader" });
  const routeBefore = owner.getState().route;
  const shown = owner.dispatch({ type: "MODULE_SWITCH", module: api.DIRECTORY_OVERLAY });
  assert.equal(shown.overlay, "directory");
  assert.equal(shown.module, "directory");
  assert.equal(shown.panel, "quick");
  assert.equal(shown.route, routeBefore);
  assert.equal(owner.dispatch({ type: "MODULE_SWITCH", module: api.DIRECTORY_OVERLAY }), shown,
    "selecting the active Directory module must be an idempotent no-op");
  const hidden = owner.dispatch({ type: "CONTROL_TOGGLE", overlay: api.CONTROL_HOME_OVERLAY });
  assert.equal(hidden.overlay, null);
  assert.equal(hidden.route, routeBefore);
  assert.equal(hidden.mode, "immersive");
});

test("B2 production Directory trigger dispatches a semantic module switch instead of route navigation", () => {
  const triggerStart = runtimeSource.indexOf('screenHost.querySelectorAll("[data-reader-module-switch]")');
  const triggerEnd = runtimeSource.indexOf('screenHost.querySelectorAll("[data-reader-control-toggle]")', triggerStart);
  const triggerSource = runtimeSource.slice(triggerStart, triggerEnd);
  assert.ok(triggerStart >= 0 && triggerEnd > triggerStart);
  assert.match(runtimeSource, /data-reader-module-switch="\$\{READER_DIRECTORY_FIGMA_BINDING\.overlayKind\}"/);
  assert.match(triggerSource, /readerRuntimeOwner\.dispatch\?\.\(\{ type: "MODULE_SWITCH", module \}\)/);
  assert.match(runtimeSource, /item\.type === READER_DIRECTORY_FIGMA_BINDING\.overlayKind[\s\S]{0,180}data-reader-module-switch/);
  assert.match(runtimeSource, /:\s*`data-route="\$\{esc\(readerModuleRoutes\[item\.type\] \|\| "reader"\)\}"/);
  assert.match(runtimeSource, /const showing = !readerRuntimeOwner\.getState\?\.\(\)\.overlay;/);
  assert.doesNotMatch(triggerSource, /readerModuleMotion/,
    "Directory source conversion must not invent a pre-F3 motion contract");
});

test("B2 production renderer composes the frozen Phone and Tablet Directory master", () => {
  const receipt = json("docs/design/handoffs/reader-runtime/directory/B1_FIGMA_LIVE_READ.json");
  assert.match(runtimeSource, /function readerDirectoryOverlay\(data, appState, route, isLoading\)/);
  assert.match(runtimeSource, /accessoryHtml: readerBrightnessRail\(data, appState\)/);
  assert.match(runtimeSource, /overlayHtml: readerTopOverlay\(data, appState\)/);
  assert.match(runtimeSource, /bottomSheetHtml: readerBottomSheetHtml/);
  assert.match(runtimeSource, /moduleNavHtml: readerModuleNavHtml\(data, READER_DIRECTORY_FIGMA_BINDING\.overlayKind\)/);
  assert.match(runtimeSource, /canonicalMasterId: "942:61"/);
  assert.match(runtimeSource, /phoneNodeId: "942:58"/);
  assert.match(runtimeSource, /tabletNodeId: "942:60"/);
  assert.deepEqual(receipt.observations.viewportVariants, ["Phone", "Tablet"]);
  assert.equal(receipt.observations.compactVariantPresent, false);
  assert.equal(receipt.observations.foldVariantPresent, false);
});

test("B2 keeps retired quick-directory routes absent and Full Directory independent", () => {
  const routeSchema = json("contracts/route.schema.json");
  const registry = json("docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json");
  const routeIds = routeSchema.properties.id.enum;
  assert.equal(routeIds.includes("toc-bookmarks"), false);
  assert.equal(routeIds.includes("reader-directory-overlay-v2"), false);
  assert.equal(routeIds.includes("reader-full-directory"), true);

  const fullDirectory = registry.records.find((entry) => entry.id === "reader.full.directory");
  assert.ok(fullDirectory);
  assert.deepEqual(fullDirectory.routeIds, ["reader-full-directory"]);
  assert.equal(fullDirectory.local.status, "candidate-backport");
  assert.equal(fullDirectory.harmony.status, "candidate-backport");
});
