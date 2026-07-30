import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");

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
  for (const file of [
    "shared-shell-kit/kit.js",
    "appearance-spec.js",
    "control-identity-declarations.js",
    "renderers/d2-settings-sync-renderers.js",
  ]) {
    new vm.Script(readFileSync(join(demoRoot, file), "utf8"), { filename: file }).runInContext(context);
  }
  return window.ReaderD2SettingsSyncRenderers;
}

function render(renderer) {
  return renderer.renderD2Route("source-management", {}, {});
}

test("R3a source-management flow: source switch updates state, ARIA and storage", () => {
  const renderer = freshRenderer();
  renderer.sourceManagement.dispatch({ type: "TOGGLE_SOURCE", settingsKey: "source-biquge", value: false });
  assert.equal(renderer.sourceManagement.getState().sources.find((item) => item.settingsKey === "source-biquge").enabled, false);
  assert.equal(renderer.storage.get(renderer.sourceManagement.storageKey).sourceEnabled["source-biquge"], false);
  const tag = render(renderer).match(/<span[^>]*data-settings-key="source-biquge"[^>]*>/)?.[0] || "";
  assert.match(tag, /aria-checked="false"/);
});

test("R3a source-management flow: search filters the retained list", () => {
  const renderer = freshRenderer();
  renderer.sourceManagement.dispatch({ type: "SET_SEARCH", value: "起点" });
  const html = render(renderer);
  assert.match(html, /起点中文网/);
  assert.doesNotMatch(html, /笔趣阁|本地导入源/);
});

test("R3a source-management flow: status and group filters remain locally owned", () => {
  const statusRenderer = freshRenderer();
  statusRenderer.sourceManagement.dispatch({ type: "SET_STATUS_FILTER", value: "异常" });
  assert.match(render(statusRenderer), /笔趣阁/);
  assert.doesNotMatch(render(statusRenderer), /起点中文网/);

  const groupRenderer = freshRenderer();
  groupRenderer.sourceManagement.dispatch({ type: "SET_GROUP_FILTER", value: "测试书源" });
  assert.match(render(groupRenderer), /test\.example/);
  assert.doesNotMatch(render(groupRenderer), /qidian\.com/);
});

test("R3a source-management flow: every removed Pilot action is a reference-stable no-op", () => {
  const renderer = freshRenderer();
  const before = renderer.sourceManagement.getState();
  for (const type of [
    "TOGGLE_MENU", "CLOSE_MENU", "OPEN_ADD_SHEET", "CLOSE_ADD_SHEET",
    "ENTER_BATCH_MODE", "EXIT_BATCH_MODE", "TOGGLE_SELECT", "SELECT_ALL",
    "DESELECT_ALL", "DELETE_CONFIRM_OPEN", "DELETE_CONFIRM_CLOSE",
    "DELETE_CONFIRM_TOGGLE_LOG", "DELETE_START", "DELETE_SUCCESS",
    "DELETE_FAILED", "DELETE_RESET",
  ]) {
    renderer.sourceManagement.dispatch({ type, settingsKey: "source-qidian" });
    assert.equal(renderer.sourceManagement.getState(), before, type);
  }
});

test("R3a source-management flow: Phone and Tablet reach the same stable state", () => {
  const states = ["phone", "tablet"].map(() => {
    const renderer = freshRenderer();
    renderer.sourceManagement.dispatch({ type: "TOGGLE_SOURCE", settingsKey: "source-qidian", value: false });
    renderer.sourceManagement.dispatch({ type: "SET_STATUS_FILTER", value: "全部" });
    renderer.sourceManagement.dispatch({ type: "SET_GROUP_FILTER", value: "全部分组" });
    return JSON.parse(JSON.stringify(renderer.sourceManagement.getState()));
  });
  assert.deepEqual(states[0], states[1]);
});
