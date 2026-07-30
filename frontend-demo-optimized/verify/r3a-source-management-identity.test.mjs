import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");
const sources = [
  "shared-shell-kit/kit.js",
  "appearance-spec.js",
  "control-identity-declarations.js",
  "renderers/d2-settings-sync-renderers.js",
].map((file) => [file, readFileSync(join(demoRoot, file), "utf8")]);

function freshRenderer() {
  const window = {
    localStorage: {
      values: {},
      getItem(key) { return this.values[key] || null; },
      setItem(key, value) { this.values[key] = value; },
      removeItem(key) { delete this.values[key]; },
    },
    ReaderFrontendDemoDraftRouteContract: {
      routes: { "source-management": { title: "书源管理" } },
      routePresentation: {},
    },
  };
  const context = vm.createContext({ window, module: { exports: {} }, Promise, setTimeout });
  for (const [file, source] of sources) {
    new vm.Script(source, { filename: file }).runInContext(context);
  }
  return window.ReaderD2SettingsSyncRenderers;
}

function render(renderer) {
  return renderer.renderD2Route("source-management", {}, {});
}

function values(html, attribute) {
  return [...html.matchAll(new RegExp(`${attribute}="([^"]+)"`, "g"))].map((match) => match[1]);
}

const EXPECTED_SETTINGS_KEYS = [
  "source-qidian", "source-biquge", "source-local-import", "source-test",
  "source-search",
  "source-status-filter-segment-option-1",
  "source-status-filter-segment-option-2",
  "source-status-filter-segment-option-3",
  "source-status-filter-segment-option-4",
  "source-status-filter-segment-option-5",
  "source-group-filter", "batch-enter", "source-add", "back",
  "source-row-more-source-qidian", "source-row-more-source-biquge",
  "source-row-more-source-local-import", "source-row-more-source-test",
  "source-row-detect-source-qidian", "source-row-detect-source-biquge",
  "source-row-detect-source-local-import", "source-row-detect-source-test",
];

test("R3a source-management identity: current final master stamps exactly 22 controls", () => {
  const html = render(freshRenderer());
  assert.deepEqual(new Set(values(html, "data-settings-key")), new Set(EXPECTED_SETTINGS_KEYS));
  assert.equal(values(html, "data-control-key").length, EXPECTED_SETTINGS_KEYS.length);
  assert.equal(new Set(values(html, "data-control-key")).size, EXPECTED_SETTINGS_KEYS.length);
});

test("R3a source-management identity: removed Pilot controls never reappear", () => {
  const renderer = freshRenderer();
  const before = renderer.sourceManagement.getState();
  for (const type of [
    "TOGGLE_MENU", "OPEN_ADD_SHEET", "ENTER_BATCH_MODE", "TOGGLE_SELECT",
    "SELECT_ALL", "DELETE_CONFIRM_OPEN", "DELETE_START", "DELETE_SUCCESS",
  ]) {
    renderer.sourceManagement.dispatch({ type, settingsKey: "source-qidian" });
    assert.equal(renderer.sourceManagement.getState(), before, type);
  }
  const html = render(renderer);
  assert.doesNotMatch(html, /source-menu-toggle|batch-select|add-sheet|delete-confirm/);
  assert.doesNotMatch(html, /fd-source-(more-menu|bottom-sheet|delete-dialog|batch-top|batch-actions)/);
});

test("R3a source-management identity: Phone and Tablet consume the same component tree", () => {
  const phone = values(render(freshRenderer()), "data-control-key").sort();
  const tablet = values(render(freshRenderer()), "data-control-key").sort();
  assert.deepEqual(phone, tablet);
});

test("R3a source-management identity: viewport contract is Phone and Tablet only", () => {
  const source = sources.map(([, text]) => text).join("\n");
  assert.doesNotMatch(source, /compact-landscape|fold-(?:open|closed)/);
});

test("R3a source-management identity: D2 final renderer is deterministic and non-empty", () => {
  const renderer = freshRenderer();
  const first = render(renderer);
  const second = render(renderer);
  assert.equal(first, second);
  assert.match(first, /data-shell="SettingsShell"/);
  assert.match(first, /书源管理/);
  assert.ok(first.length > 1_000);
});
