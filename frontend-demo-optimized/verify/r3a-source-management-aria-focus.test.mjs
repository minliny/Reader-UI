import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");

function render() {
  const window = {
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    ReaderFrontendDemoDraftRouteContract: {
      routes: { "source-management": { title: "书源管理" } },
      routePresentation: {},
    },
  };
  const context = vm.createContext({ window, module: { exports: {} }, Promise, setTimeout });
  for (const file of [
    "shared-shell-kit/kit.js",
    "appearance-spec.js",
    "control-identity-declarations.js",
    "renderers/d2-settings-sync-renderers.js",
  ]) {
    new vm.Script(readFileSync(join(demoRoot, file), "utf8"), { filename: file }).runInContext(context);
  }
  return window.ReaderD2SettingsSyncRenderers.renderD2Route("source-management", {}, {});
}

test("R3a source-management ARIA: switches expose state and keyboard semantics", () => {
  const html = render();
  for (const key of ["source-qidian", "source-biquge", "source-local-import", "source-test"]) {
    const tag = html.match(new RegExp(`<span[^>]*data-settings-key="${key}"[^>]*>`))?.[0];
    assert.ok(tag, key);
    assert.match(tag, /role="switch"/);
    assert.match(tag, /aria-checked="(?:true|false)"/);
    assert.match(tag, /tabindex="0"/);
    assert.match(tag, /aria-label="[^"]+"/);
  }
});

test("R3a source-management ARIA: search, group and status controls are named", () => {
  const html = render();
  assert.match(html, /<input[^>]*type="search"[^>]*aria-label="[^"]+"[^>]*autocomplete="off"/);
  assert.match(html, /<select[^>]*data-settings-key="source-group-filter"[^>]*aria-label="[^"]+"/);
  const segments = html.match(/<button[^>]*data-settings-key="source-status-filter-segment-option-\d"[^>]*>/g) || [];
  assert.equal(segments.length, 5);
  assert.ok(segments.every((tag) => /aria-pressed="(?:true|false)"/.test(tag)));
});

test("R3a source-management ARIA: retained row actions have names", () => {
  const html = render();
  const actions = html.match(/<button[^>]*data-settings-key="source-row-(?:more|detect)-[^"]+"[^>]*>/g) || [];
  assert.equal(actions.length, 8);
  assert.ok(actions.every((tag) => /aria-label="[^"]+"/.test(tag)));
});

test("R3a source-management ARIA: unavailable Pilot destinations are explicit and have no overlay", () => {
  const html = render();
  assert.match(html, /fd-source-bottom-bar[^>]*data-component-state="figma-visual-unavailable"/);
  assert.equal((html.match(/data-component-state="figma-visual-unavailable"/g) || []).length, 5);
  assert.doesNotMatch(html, /role="dialog"|aria-modal="true"|data-demo-sheet/);
});
