import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const w3Source = read("renderers/w3-source-switch-renderers.js");
const declarationSource = read("control-identity-declarations.js");
const runtimeSource = read("render-runtime.js");
const fixtureSource = read("fixture.js");
const dispatchMap = JSON.parse(readFileSync(join(root, "..", "tools/interaction-inventory/generated/renderer-dispatch-map.json"), "utf8"));
const sourceIds = ["source-youshu", "source-biquge-mirror", "source-light-novel", "source-cloud-library", "source-aggregate-1", "source-aggregate-2", "source-backup-a", "source-backup-b", "source-chapter-sync", "source-local-cache", "source-old-backup"];
const fixture = { reader: { title: "长夜余火" }, flow: { chapter: "第 32 章 雨夜", candidates: sourceIds.map((sourceId, index) => ({ sourceId, source: sourceId, speed: `${120 + index * 10} ms`, chapter: "第 32 章 雨夜", state: index === 0 ? "当前" : index === 10 ? "落后" : "可切换" })) } };

function fresh() {
  const window = { setTimeout, ReaderShellKit: { icon: (name) => `[${name}]`, renderFlowShell: (options) => `<main class="${options.frameClass}"><section class="${options.stepClass}">${options.stepHtml}</section><section class="${options.comparisonClass}">${options.comparisonHtml}</section></main>` } };
  const ctx = vm.createContext({ window, globalThis: window, module: { exports: {} }, setTimeout, Promise, Map, Set });
  new vm.Script(w3Source).runInContext(ctx);
  return window.ReaderW3SourceSwitchRenderers;
}
function values(html, attr) { return [...html.matchAll(new RegExp(`${attr}="([^"]+)"`, "g"))].map((match) => match[1]); }

test("R2a source-switch declares exactly 35 mapped source-owned controls", () => {
  const sandbox = { module: { exports: {} }, window: {} };
  new vm.Script(declarationSource).runInNewContext(sandbox);
  const rows = sandbox.module.exports.CANONICAL_CONTROL_DECLARATIONS.filter((entry) => entry.source === "source-switch-action");
  assert.equal(rows.length, 35);
  assert.ok(rows.every((entry) => entry.mappingStatus === "mapped" && entry.instanceKey === null));
  assert.equal(new Set(rows.map((entry) => entry.controlKey)).size, 35);
});

test("R2a source-switch and results each stamp 12 controls with five attributes", () => {
  const api = fresh();
  for (const route of ["source-switch", "source-switch-results"]) {
    api.sourceSwitch.reset();
    const html = api.sourceSwitchV2(fixture, route, {});
    for (const attr of ["data-entity-key", "data-control-key", "data-control-id", "data-ui-event", "data-settings-key"]) assert.equal(values(html, attr).length, 12, `${route} ${attr}`);
    assert.doesNotMatch(html, /data-source-switch-action="confirm"|检查并确认|>继续<|fd-source-switch-result/);
  }
});

test("R2a six state routes stamp 2/2/2/1/2/2 controls", () => {
  const api = fresh();
  const expected = { "source-switch-empty": 2, "source-switch-error": 2, "source-switch-timeout": 2, "source-switch-loading": 1, "source-switch-rollback": 2, "source-switch-preview": 2 };
  for (const [route, count] of Object.entries(expected)) assert.equal(values(api.sourceSwitchV2(fixture, route, {}), "data-control-key").length, count, route);
});

test("R2a fixture exposes 11 stable sourceId business keys", () => {
  for (const sourceId of sourceIds) assert.match(fixtureSource, new RegExp(`sourceId: "${sourceId}"`));
  assert.doesNotMatch(values(fresh().sourceSwitchV2(fixture, "source-switch", {}), "data-control-key").join("\n"), /\.n\d+|selector|data-source-index/);
});

test("R2a unknown identities fail closed", () => assert.equal(fresh().identityAttrs("source-switch", "unknown"), ""));

test("R3a canonical dispatch map sends all eight routes to sourceSwitchV2", () => {
  const routes = dispatchMap.pageFamilies["source-switch"].routes;
  assert.equal(routes.length, 8);
  for (const route of routes) assert.equal(dispatchMap.routes[route].renderer, "sourceSwitchV2");
});

test("R3a render-runtime freezes all legacy source-switch fallbacks", () => {
  assert.match(runtimeSource, /source-switch-preview[\s\S]*FROZEN to sourceSwitchV2/);
  assert.match(runtimeSource, /flowScreen source-switch fallback is frozen/);
});

test("R3a Phone and Tablet share identical source-owned control keys", () => {
  const api = fresh();
  const phone = values(`<div data-viewport="phone">${api.sourceSwitchV2(fixture, "source-switch", {})}</div>`, "data-control-key").sort();
  const tablet = values(`<div data-viewport="tablet">${api.sourceSwitchV2(fixture, "source-switch", {})}</div>`, "data-control-key").sort();
  assert.deepEqual(phone, tablet);
});

test("R3a source-switch owns no Compact, Fold, or independent Landscape atom", () => assert.doesNotMatch(w3Source, /compact-landscape|foldable|fd-w3-geom-landscape/i));

test("R3a runtime reuses ReaderRuntimeContract for nested continuity controls", () => {
  assert.match(runtimeSource, /ReaderW3SourceSwitchRenderers\?\.instrumentDom/);
  assert.match(w3Source, /ReaderRuntimeContract\.instrumentDom\(host \|\| root, visualRoute\)/);
});
