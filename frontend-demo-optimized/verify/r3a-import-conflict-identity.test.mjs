import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createVmRenderer } from "../../tools/interaction-inventory/interaction-inventory-lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");
const require = createRequire(import.meta.url);
const contract = require(join(demoRoot, "import-runtime-contract.js"));
const declarations = require(join(demoRoot, "control-identity-declarations.js")).CANONICAL_CONTROL_DECLARATIONS;
const expectedCounts = new Map([
  ["import-conflict-resolve", 5], ["import-duplicate", 5], ["import-empty-file", 3],
  ["import-format-unsupported", 4], ["import-parsing", 3], ["import-partial-success", 4],
  ["import-permission-denied", 4], ["import-result-detail", 4],
]);

function values(html, attribute) {
  return [...html.matchAll(new RegExp(`${attribute}="([^"]+)"`, "g"))].map((match) => match[1]);
}

test("R3a import identity: exact denominator is 8 primary routes and 32 controls", () => {
  assert.deepEqual([...contract.PRIMARY_ROUTES], [...expectedCounts.keys()]);
  assert.equal(contract.CONTROL_SPECS.length, 32);
  for (const [route, count] of expectedCounts) {
    assert.equal(contract.CONTROL_SPECS.filter((spec) => spec.route === route).length, count, route);
  }
});

test("R3a import identity: canonical declarations are mapped 1:1 without ordinal keys", () => {
  const actual = declarations.filter((entry) => entry.source === "import-conflict-action");
  assert.equal(actual.length, 32);
  assert.equal(new Set(actual.map((entry) => entry.controlKey)).size, 32);
  assert.ok(actual.every((entry) => entry.mappingStatus === "mapped"));
  assert.ok(actual.every((entry) => !/\.n\d+(?:\.|@|$)/.test(entry.controlKey)));
  for (const spec of contract.CONTROL_SPECS) {
    const match = actual.find((entry) => entry.route === spec.route && entry.settingsKey === spec.settingsKey);
    assert.ok(match, `${spec.route}/${spec.settingsKey}`);
    assert.equal(match.uiEvent || match.controlIdentityToken, spec.uiEvent);
    assert.equal(match.state, spec.state);
  }
});

test("R3a import identity: real VM renderer stamps identity plus exactly one semantic slot", () => {
  const renderer = createVmRenderer();
  let total = 0;
  for (const [route, count] of expectedCounts) {
    const html = renderer.renderRoute(route);
    const controls = values(html, "data-control-key");
    assert.equal(controls.length, count, route);
    for (const attribute of ["data-entity-key", "data-control-key", "data-control-id", "data-settings-key"]) {
      assert.equal(values(html, attribute).length, count, `${route}/${attribute}`);
    }
    assert.equal(values(html, "data-ui-event").length + values(html, "data-control-token").length, count, `${route}/semantic-slot`);
    total += controls.length;
  }
  assert.equal(total, 32);
});

test("R3a import identity: stable batch, item, and conflict IDs are present in production HTML", () => {
  const renderer = createVmRenderer();
  for (const route of expectedCounts.keys()) {
    assert.match(renderer.renderRoute(route), new RegExp(`data-import-batch-id="${contract.BATCH_ID}"`));
  }
  assert.deepEqual(values(renderer.renderRoute("import-duplicate"), "data-import-item-id"), ["rain-night", "old-book-scan"]);
  assert.deepEqual(values(renderer.renderRoute("import-conflict-resolve"), "data-import-conflict-id"), ["title", "author", "group"]);
  assert.deepEqual(values(renderer.renderRoute("import-partial-success"), "data-import-item-id"), [...contract.ITEM_IDS]);
  assert.deepEqual(values(renderer.renderRoute("import-result-detail"), "data-import-item-id"), [...contract.ITEM_IDS]);
});

test("R3a import identity: instrumentation fails closed when DOM count drifts", () => {
  const html = '<button type="button">only one</button>';
  assert.equal(contract.instrumentHtml(html, "import-conflict-resolve"), html);
  assert.equal(contract.instrumentHtml(html, "not-primary"), html);
});

test("R3a import identity: inline runtime remains sole owner and W1 mirror stays unloaded", () => {
  const index = readFileSync(join(demoRoot, "index.html"), "utf8");
  const runtime = readFileSync(join(demoRoot, "render-runtime.js"), "utf8");
  const inventoryLib = readFileSync(join(demoRoot, "../tools/interaction-inventory/interaction-inventory-lib.mjs"), "utf8");
  assert.doesNotMatch(index, /w1-import-renderers\.js/);
  assert.doesNotMatch(inventoryLib, /w1-import-renderers\.js/);
  for (const renderer of ["importConflictResolveScreen", "importDuplicateScreen", "importEmptyFileScreen", "importFormatUnsupportedScreen", "importParsingScreen", "importPartialSuccessScreen", "importPermissionDeniedScreen", "importResultDetailScreen"]) {
    assert.match(runtime, new RegExp(`function ${renderer}\\(`));
  }
});

test("R3a import identity: viewport contract is Phone + Tablet only", () => {
  const source = readFileSync(join(demoRoot, "import-runtime-contract.js"), "utf8");
  assert.doesNotMatch(source, /compact-landscape|fold-/);
  for (const route of contract.PRIMARY_ROUTES) {
    const phone = createVmRenderer().renderRoute(route);
    const tablet = createVmRenderer().renderRoute(route);
    assert.deepEqual(values(phone, "data-control-key"), values(tablet, "data-control-key"));
  }
});
