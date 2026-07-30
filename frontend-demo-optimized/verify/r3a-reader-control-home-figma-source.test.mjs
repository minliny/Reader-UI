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

test("B1 control-home binding resolves the exact live Phone and Tablet nodes", () => {
  const registry = json("docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json");
  const record = registry.records.find((entry) => entry.id === "reader.control-home");
  const receipt = json("docs/design/handoffs/reader-runtime/control-home/B1_FIGMA_LIVE_READ.json");
  const crosswalk = json("docs/design/handoffs/reader-runtime/control-home/FIGMA_F0_CROSSWALK.json");
  const official = json("docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json");

  assert.equal(record.figma.fileKey, "klhs2jMM4MncaJFqZMfqEK");
  assert.equal(record.figma.canonicalMasterId, "1023:18737");
  assert.deepEqual(record.figma.viewportNodes, { phone: "1023:18737", tablet: "1023:18745" });
  assert.deepEqual(receipt.resolvedNodes.map((entry) => entry.nodeId), ["1023:18737", "1023:18745"]);
  assert.deepEqual(crosswalk.binding.viewportNodes, record.figma.viewportNodes);
  assert.equal(record.figma.revision, official.currentRevision);
  assert.equal(receipt.revision.numericRevisionExposedByConnector, false);
  assert.equal(receipt.revision.noFabricatedRevision, true);
});

test("registry keeps only the promoted semantic control-home overlay source", () => {
  const registry = json("docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json");
  const record = registry.records.find((entry) => entry.id === "reader.control-home");
  assert.deepEqual(record.routeIds, []);
  assert.deepEqual(record.overlayKinds, ["reader-control"]);
  assert.equal(record.local.status, "implementation-ready");
  assert.equal(record.harmony.status, "implementation-ready");
  assert.deepEqual(record.local.targets, [
    "frontend-demo-optimized/render-runtime.js#readerControlHomeOverlay",
  ]);
  assert.equal(record.reconstruction.status, "source-conversion-complete");
});

test("B2 control-home reducer toggles the overlay without changing route identity", () => {
  const api = freshContract();
  const owner = api.createOwner({ route: "reader" });
  const routeBefore = owner.getState().route;
  const shown = owner.dispatch({ type: "CONTROL_TOGGLE", overlay: api.CONTROL_HOME_OVERLAY });
  assert.equal(shown.overlay, "reader-control");
  assert.equal(shown.route, routeBefore);
  const hidden = owner.dispatch({ type: "CONTROL_TOGGLE", overlay: api.CONTROL_HOME_OVERLAY });
  assert.equal(hidden.overlay, null);
  assert.equal(hidden.route, routeBefore);
});

test("B2 production trigger uses semantic overlay dispatch and never navigates to reader", () => {
  assert.match(runtimeSource, /data-reader-control-show data-reader-control-toggle="\$\{READER_CONTROL_HOME_FIGMA_BINDING\.overlayKind\}"/);
  assert.doesNotMatch(runtimeSource, /data-reader-control-show data-route="reader"/);
  assert.match(runtimeSource, /readerRuntimeOwner\.dispatch\?\.\(\{ type: "CONTROL_TOGGLE", overlay \}\)/);
  assert.match(runtimeSource, /appState\.readerControlOverlay = nextState\?\.overlay \|\| ""/);
  assert.match(runtimeSource, /from: currentRoute\(\),\s*to: currentRoute\(\)/);
});

test("B2 production renderer composes the frozen control-home parts over the canonical reading surface", () => {
  assert.match(runtimeSource, /function readerControlHomeOverlay\(data, appState, route, isLoading\)/);
  assert.match(runtimeSource, /accessoryHtml: readerBrightnessRail\(data, appState\)/);
  assert.match(runtimeSource, /overlayHtml: readerTopOverlay\(data, appState\)/);
  assert.match(runtimeSource, /bottomSheetHtml: readerBottomSheetHtml/);
  assert.match(runtimeSource, /moduleNavHtml: readerModuleNavHtml\(data, ""\)/);
  assert.match(runtimeSource, /data-reader-figma-overlay="control-home"/);
  assert.match(runtimeSource, /canonicalMasterId: "1023:18737"/);
  assert.match(runtimeSource, /tabletNodeId: "1023:18745"/);
});

test("B2 keeps retired and Figma-absent visual substitutes fail closed", () => {
  const routeSchema = json("contracts/route.schema.json");
  assert.equal(routeSchema.properties.id.enum.includes("control-layer-base-v2"), false);
  assert.match(runtimeSource, /function readerMoreMenuHtml\(\) \{\s*return "";\s*\}/);
  assert.doesNotMatch(runtimeSource, /function readerMoreMenuHtml\(\)[\s\S]{0,120}<button/);
});
