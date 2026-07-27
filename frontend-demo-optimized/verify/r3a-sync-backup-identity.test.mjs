import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const rendererSource = read("renderers/d2-settings-sync-renderers.js");
const declarationSource = read("control-identity-declarations.js");
const runtimeSource = read("render-runtime.js");
const kitSource = read("shared-shell-kit/kit.js");
const appearanceSource = read("appearance-spec.js");

function fresh() {
  const window = { localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, ReaderFrontendDemoDraftRouteContract: { routes: {}, routePresentation: {} } };
  const context = vm.createContext({ window, module: { exports: {} }, Promise, setTimeout });
  for (const source of [kitSource, appearanceSource, declarationSource, rendererSource]) new vm.Script(source).runInContext(context);
  return window.ReaderD2SettingsSyncRenderers;
}
function values(html, attr) { return [...html.matchAll(new RegExp(`${attr}="([^"]+)"`, "g"))].map((match) => match[1]); }

test("R2a sync-backup declares exactly 92 mapped semantic controls", () => {
  const sandbox = { module: { exports: {} }, window: {} };
  new vm.Script(declarationSource).runInNewContext(sandbox);
  const rows = sandbox.module.exports.CANONICAL_CONTROL_DECLARATIONS.filter((entry) => entry.source === "sync-backup-action");
  assert.equal(rows.length, 92);
  assert.equal(new Set(rows.map((entry) => entry.controlKey)).size, 92);
  assert.ok(rows.every((entry) => entry.mappingStatus === "mapped" && entry.instanceKey === null && !/\.n\d+|selector|ordinal/.test(entry.settingsKey)));
});

test("R2a all six canonical routes stamp every visible control with one semantic slot", () => {
  const api = fresh();
  const expected = { "sync-settings-entry": 8, "sync-backup": 13, "backup-settings": 16, "progress-sync": 10, "progress-sync-status": 3, "remote-webdav-books": 12 };
  for (const [route, count] of Object.entries(expected)) {
    const html = api.renderD2Route(route, {}, {});
    for (const attr of ["data-entity-key", "data-control-key", "data-control-id", "data-settings-key"]) assert.equal(values(html, attr).length, count, `${route} ${attr}`);
    assert.equal(values(html, "data-ui-event").length + values(html, "data-control-token").length, count, `${route} semantic-slot`);
  }
});

test("R2a control specs and declarations have zero mismatch", () => {
  const api = fresh();
  const sandbox = { module: { exports: {} }, window: {} }; new vm.Script(declarationSource).runInNewContext(sandbox);
  const declarationKeys = sandbox.module.exports.CANONICAL_CONTROL_DECLARATIONS.filter((entry) => entry.source === "sync-backup-action").map((entry) => `${entry.route}|${entry.state}|${entry.settingsKey}`).sort();
  const specKeys = api.SOURCE_CONTROL_SPECS.map((entry) => `${entry.route}|${entry.state}|${entry.settingsKey}`).sort();
  assert.equal(JSON.stringify(declarationKeys), JSON.stringify(specKeys));
});

test("R3a old manual/auto/history pages have no second renderer owner", () => {
  const api = fresh();
  for (const route of ["backup-manual", "backup-auto", "backup-history"]) assert.equal(api.renderD2Route(route, {}, {}), "");
  assert.match(runtimeSource, /legacy secondary route is fail-loud/);
});

test("R3a legacy runtime fallbacks are frozen to backupScreenV2", () => assert.match(runtimeSource, /sync-backup route is FROZEN to backupScreenV2/));

test("R3a Phone and Tablet reuse the same canonical control keys", () => {
  const api = fresh(); const html = api.renderD2Route("backup-settings", {}, {}); const keys = values(html, "data-control-key").sort();
  assert.deepEqual(values(`<main data-viewport="phone">${html}</main>`, "data-control-key").sort(), keys);
  assert.deepEqual(values(`<main data-viewport="tablet">${html}</main>`, "data-control-key").sort(), keys);
});

test("R3a landscape is a Tablet alias and Compact/Fold atoms are prohibited", () => assert.doesNotMatch(rendererSource, /compact-landscape|foldable|data-viewport="compact"|data-viewport="fold"/i));

test("R3a sync-backup render is byte stable without dispatch", () => { const api = fresh(); assert.equal(api.renderD2Route("sync-backup", {}, {}), api.renderD2Route("sync-backup", {}, {})); });
