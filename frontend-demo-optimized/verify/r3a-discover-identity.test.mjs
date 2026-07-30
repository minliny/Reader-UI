import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { createVmRenderer } from "../../tools/interaction-inventory/interaction-inventory-lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");
const require = createRequire(import.meta.url);
const contract = require(join(demoRoot, "discover-runtime-contract.js"));
const declarations = require(join(demoRoot, "control-identity-declarations.js")).CANONICAL_CONTROL_DECLARATIONS;
const expectedCounts = new Map(contract.PRIMARY_ROUTES.map((route) => [route, route === "discover-control" ? 31 : route === "discover-sort" ? 29 : 19]));
const values = (html, attr) => [...html.matchAll(new RegExp(`${attr}="([^"]+)"`, "g"))].map((match) => match[1]);

function routeContractDiscoverRoutes() {
  const window = {};
  vm.runInNewContext(readFileSync(join(demoRoot, "route-contract.js"), "utf8"), { window });
  return Object.keys(window.ReaderFrontendDemoDraftRouteContract.routes).filter((route) => route.startsWith("discover"));
}

test("R3a Discover identity: 12 primary + 29 exclusions exactly cover the 41-route contract", () => {
  const all = routeContractDiscoverRoutes();
  const union = [...contract.PRIMARY_ROUTES, ...contract.SECONDARY_ROUTES];
  assert.equal(contract.PRIMARY_ROUTES.length, 12);
  assert.equal(contract.SECONDARY_ROUTES.length, 29);
  assert.equal(all.length, 41);
  assert.equal(new Set(union).size, 41);
  assert.deepEqual([...new Set(all.filter((route) => !union.includes(route)))], []);
  assert.deepEqual([...new Set(union.filter((route) => !all.includes(route)))], []);
});

test("R3a Discover identity: canonical generator whitelist denominator is exactly 250", () => {
  assert.equal(contract.CONTROL_SPECS.length, 250);
  assert.equal([...expectedCounts.values()].reduce((sum, count) => sum + count, 0), 250);
  for (const [route, count] of expectedCounts) {
    assert.equal(contract.CONTROL_SPECS.filter((spec) => spec.route === route).length, count, route);
  }
});

test("R3a Discover identity: 250 declarations are mapped unique and non-ordinal", () => {
  const actual = declarations.filter((entry) => entry.source === "discover-action");
  assert.equal(actual.length, 250);
  assert.equal(new Set(actual.map((entry) => entry.controlKey)).size, 250);
  assert.ok(actual.every((entry) => entry.mappingStatus === "mapped"));
  assert.ok(actual.every((entry) => entry.renderer === "mainTabDiscover" && entry.rendererFile === "render-runtime.js"));
  assert.ok(actual.every((entry) => !/\.n\d+(?:\.|@|$)/.test(entry.controlKey)));
});

test("R3a Discover identity: real VM stamps five identity attrs on all 250 controls", () => {
  const renderer = createVmRenderer();
  let total = 0;
  for (const [route, count] of expectedCounts) {
    const html = renderer.renderRoute(route);
    for (const attr of ["data-entity-key", "data-control-key", "data-control-id", "data-ui-event", "data-settings-key"]) {
      assert.equal(values(html, attr).filter((value) => value.startsWith("discover.") || attr !== "data-entity-key").length >= count, true, `${route}/${attr}`);
    }
    assert.equal(values(html, "data-control-key").filter((key) => key.startsWith("discover.control.")).length, count, route);
    total += count;
  }
  assert.equal(total, 250);
});

test("R3a Discover identity: stable section, source, book, and card IDs are rendered", () => {
  const renderer = createVmRenderer();
  const home = renderer.renderRoute("discover");
  assert.deepEqual(new Set(values(home, "data-discover-section-id")), new Set(contract.SECTION_IDS));
  assert.deepEqual(new Set(values(home, "data-book-id")), new Set(contract.BOOK_IDS));
  assert.deepEqual(new Set(values(home, "data-discover-card-id")), new Set(contract.BOOK_IDS.map((id) => `book-${id}`)));
  const control = renderer.renderRoute("discover-control");
  assert.deepEqual(new Set(values(control, "data-discover-source-id")), new Set(contract.SOURCE_IDS));
});

test("R3a Discover identity: secondary routes remain explicit exclusions and are not falsely stamped", () => {
  const renderer = createVmRenderer();
  for (const route of contract.SECONDARY_ROUTES) {
    assert.throws(
      () => renderer.renderRoute(route),
      /UNCLASSIFIED_ROUTE_NO_FIGMA_VISUAL/,
      route,
    );
  }
});

test("R3a Discover identity: mainTabDiscover remains sole canonical owner and D2 override is disabled", () => {
  const runtime = readFileSync(join(demoRoot, "render-runtime.js"), "utf8");
  const d2 = readFileSync(join(demoRoot, "renderers/d2-bookshelf-discover-renderers.js"), "utf8");
  const stateMap = d2.match(/var STATE_VARIANT_MAP = \{([\s\S]*?)\n  \};/)?.[1] || "";
  const integrationMap = d2.match(/var INTEGRATION_MAP = \{([\s\S]*?)\n  \};/)?.[1] || "";
  assert.match(runtime, /function mainTabDiscover\(/);
  assert.match(runtime, /return mainTabDiscover\(data, appState, route\)/);
  assert.doesNotMatch(stateMap, /"discover/);
  assert.doesNotMatch(integrationMap, /"discover/);
});

test("R3a Discover identity: instrumentation fails closed and viewport contract excludes Compact and Fold", () => {
  const one = '<button type="button">one</button>';
  assert.equal(contract.instrumentHtml(one, "discover"), one);
  const source = readFileSync(join(demoRoot, "discover-runtime-contract.js"), "utf8");
  assert.doesNotMatch(source, /compact-landscape|fold-/);
});
