import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const rendererSource = read("renderers/d2-bookshelf-discover-renderers.js");
const declarationSource = read("control-identity-declarations.js");
const runtimeSource = read("render-runtime.js");
const sources = ["asset-library/icons.js", "shared-shell-kit/kit.js", "appearance-spec.js", "fixture.js", "control-identity-declarations.js", "renderers/d2-bookshelf-discover-renderers.js"].map(read);

function fresh() {
  const window = { localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, ReaderFrontendDemoDraftRouteContract: { routes: {}, routePresentation: {} } };
  const context = vm.createContext({ window, module: { exports: {} }, Promise, setTimeout });
  sources.forEach((source) => new vm.Script(source).runInContext(context));
  return { api: window.ReaderD2BookshelfDiscoverRenderers, data: window.READER_FRONTEND_DEMO_DRAFT_FIXTURE };
}
function values(html, attr) { return [...html.matchAll(new RegExp(`${attr}="([^"]+)"`, "g"))].map((match) => match[1]); }

test("R2a search family declares exactly 53 mapped business controls after history simplification", () => {
  const sandbox = { module: { exports: {} }, window: {} }; new vm.Script(declarationSource).runInNewContext(sandbox);
  const rows = sandbox.module.exports.CANONICAL_CONTROL_DECLARATIONS.filter((entry) => entry.source === "search-results-action");
  assert.equal(rows.length, 53); assert.equal(new Set(rows.map((row) => row.controlKey)).size, 53);
  assert.ok(rows.every((row) => row.mappingStatus === "mapped" && row.actionKey === row.settingsKey && row.instanceKey === null));
});

test("R2a four primary routes stamp stable identity plus one semantic slot", () => {
  const { api, data } = fresh(); const expected = { "search-results": 11, "search-loading": 2, "search-empty": 3, "search-error": 3 };
  for (const [route, count] of Object.entries(expected)) {
    const html = api.bookSearchV2(data, route, {});
    for (const attr of ["data-entity-key", "data-control-key", "data-control-id", "data-settings-key"]) assert.equal(values(html, attr).length, count, `${route} ${attr}`);
    assert.equal(values(html, "data-ui-event").length + values(html, "data-control-token").length, count, `${route} semantic-slot`);
    assert.equal(new Set(values(html, "data-control-key")).size, count);
  }
});

test("R2a specs and declarations have zero route/state/key mismatch", () => {
  const { api } = fresh(); const sandbox = { module: { exports: {} }, window: {} }; new vm.Script(declarationSource).runInNewContext(sandbox);
  const actual = sandbox.module.exports.CANONICAL_CONTROL_DECLARATIONS.filter((entry) => entry.source === "search-results-action").map((entry) => `${entry.route}|${entry.state}|${entry.settingsKey}`).sort();
  const expected = api.SEARCH_CONTROL_SPECS.map((entry) => `${entry.route}|${entry.state}|${entry.settingsKey}`).sort();
  assert.equal(JSON.stringify(actual), JSON.stringify(expected));
});

test("R2a result rows use three stable book IDs", () => {
  const { api, data } = fresh(); const html = api.bookSearchV2(data, "search-results", {});
  assert.deepEqual(values(html, "data-search-result-id"), ["long-night", "mystery-lord", "three-body", "three-body"]);
  assert.ok(api.SEARCH_CONTROL_SPECS.every((spec) => !/\.n\d+|ordinal|selector/i.test(spec.settingsKey)));
});

test("R2a query inputs use a stable query ID", () => {
  const { api, data } = fresh(); const html = api.bookSearchV2(data, "search-results", {});
  assert.deepEqual(values(html, "data-search-query-id"), ["book-catalog-primary", "book-catalog-primary"]);
});

test("R3a all six Search routes resolve through bookSearchV2", () => {
  const { api } = fresh();
  for (const route of ["book-search", "search-home", "search-results", "search-loading", "search-empty", "search-error"]) assert.equal(api.STATE_VARIANT_MAP[route], "bookSearchV2");
});

test("R3a render-runtime fallbacks fail loudly for all six Search routes", () => {
  assert.match(runtimeSource, /book-search[\s\S]*search-home[\s\S]*search-results[\s\S]*FROZEN to bookSearchV2/);
  assert.match(runtimeSource, /search-error[\s\S]*FROZEN to bookSearchV2/);
});

test("R3a initial Search routes stamp stable controls without Compact or Fold variants", () => {
  const { api, data } = fresh();
  for (const route of ["search-home", "book-search"]) {
    const html = api.bookSearchV2(data, route, {});
    assert.equal(values(html, "data-control-key").length, 17);
    assert.equal(new Set(values(html, "data-control-key")).size, 17);
  }
  assert.doesNotMatch(rendererSource, /compact-landscape|foldable|data-viewport="compact"|data-viewport="fold"/i);
});

test("R3a search history exposes at most five records with no expand or collapse control", () => {
  const { api, data } = fresh();
  const rendered = api.bookSearchV2(data, "book-search", {});
  const cleared = api.bookSearchV2(data, "book-search", { bookSearchHistory: [] });
  assert.equal((rendered.match(/data-search-history-select/g) || []).length, 5);
  assert.doesNotMatch(rendered, /data-search-history-toggle|条更多|>收起<\/button>/);
  assert.equal((cleared.match(/data-search-history-select/g) || []).length, 0);
  assert.doesNotMatch(cleared, /data-search-history-toggle|条更多|>收起<\/button>/);
  assert.doesNotMatch(rendered, /data-search-history-select[^>]*data-search-submit/);
});

test("R3a Phone and Tablet reuse identical primary control keys", () => {
  const { api, data } = fresh(); const keys = values(api.bookSearchV2(data, "search-results", {}), "data-control-key").sort();
  assert.deepEqual(values(`<main data-viewport="phone">${api.bookSearchV2(data, "search-results", {})}</main>`, "data-control-key").sort(), keys);
  assert.deepEqual(values(`<main data-viewport="tablet">${api.bookSearchV2(data, "search-results", {})}</main>`, "data-control-key").sort(), keys);
});

test("R3a search-results owns no Compact Fold or independent Landscape atom", () => assert.doesNotMatch(rendererSource, /compact-landscape|foldable|data-viewport="compact"|data-viewport="fold"/i));
