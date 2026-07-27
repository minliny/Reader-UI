import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const contractSource = read("rss-runtime-contract.js");
const declarationSource = read("control-identity-declarations.js");
const runtimeSource = read("render-runtime.js");
const iconSource = read("asset-library/icons.js");
const indexSource = read("index.html");

function fresh() {
  const sandbox = { module: { exports: {} }, window: {}, globalThis: {}, Promise };
  new vm.Script(contractSource).runInNewContext(sandbox);
  return sandbox.module.exports;
}

class FakeNode {
  constructor(tagName = "BUTTON") { this.tagName = tagName; this.attrs = new Map(); }
  setAttribute(key, value) { this.attrs.set(key, String(value)); }
  getAttribute(key) { return this.attrs.has(key) ? this.attrs.get(key) : null; }
  hasAttribute(key) { return this.attrs.has(key); }
}

test("R2a RSS covers all 13 Figma-present routes and 123 semantic control specs", () => {
  const api = fresh();
  assert.equal(api.PRIMARY_ROUTES.length, 13);
  assert.equal(api.CONTROL_SPECS.length, 123);
  assert.deepEqual(Object.fromEntries(api.PRIMARY_ROUTES.map((route) => [route, api.CONTROL_SPECS.filter((spec) => spec.route === route).length])), {
    rss: 22, "rss-all": 16, "rss-source-feed": 8, "rss-source-category-novel": 7,
    "rss-source-category-tech": 8, "rss-source-category-booklist": 7, "rss-refreshing": 17,
    "rss-source-category-releases": 8, "rss-source-category-issues": 7, "rss-source-category-discussions": 7,
    "rss-empty": 3, "rss-error": 3, "rss-detail": 10
  });
});

test("R2a declarations contain 123 unique mapped RSS action identities", () => {
  const sandbox = { module: { exports: {} }, window: {} };
  new vm.Script(declarationSource).runInNewContext(sandbox);
  const rows = sandbox.module.exports.CANONICAL_CONTROL_DECLARATIONS.filter((entry) => entry.source === "rss-action");
  assert.equal(rows.length, 123);
  assert.equal(new Set(rows.map((entry) => entry.controlKey)).size, 123);
  assert.ok(rows.every((entry) => entry.mappingStatus === "mapped" && entry.actionKey === entry.settingsKey && entry.instanceKey === null));
});

test("R2a specs and declarations have zero route/key mismatch", () => {
  const api = fresh();
  const sandbox = { module: { exports: {} }, window: {} };
  new vm.Script(declarationSource).runInNewContext(sandbox);
  const actual = sandbox.module.exports.CANONICAL_CONTROL_DECLARATIONS.filter((entry) => entry.source === "rss-action").map((entry) => `${entry.route}|${entry.settingsKey}`).sort();
  const expected = api.CONTROL_SPECS.map((entry) => `${entry.route}|${entry.settingsKey}`).sort();
  assert.equal(JSON.stringify(actual), JSON.stringify(expected));
});

test("R2a every primary route stamps all matching controls with five attributes", () => {
  const api = fresh();
  for (const route of api.PRIMARY_ROUTES) {
    const routeSpecs = api.CONTROL_SPECS.filter((spec) => spec.route === route);
    const nodes = new Map(routeSpecs.map((spec) => [spec.selector, new FakeNode(spec.selector.startsWith("article") ? "ARTICLE" : "BUTTON")]));
    const rootNode = new FakeNode("MAIN");
    rootNode.querySelectorAll = (selector) => nodes.has(selector) ? [nodes.get(selector)] : [];
    const report = api.instrumentDom(rootNode, route);
    assert.equal(report.route, route);
    assert.equal(report.stamped, routeSpecs.length);
    assert.equal(report.missing, 0);
    assert.equal(report.ambiguous, 0);
    for (const node of nodes.values()) for (const attr of ["data-entity-key", "data-control-key", "data-control-id", "data-ui-event", "data-settings-key"]) assert.ok(node.getAttribute(attr), `${route} ${attr}`);
  }
});

test("R2a feed and article identities use stable business IDs", () => {
  const api = fresh();
  assert.deepEqual([...api.FEED_IDS], ["github-releases", "reader-discussions", "source-maintenance", "local-system"]);
  assert.deepEqual([...api.ARTICLE_IDS], ["reader-ui-update", "source-rule-debug", "legado-rss-config", "local-import-complete", "reader-roadmap"]);
  assert.ok(api.CONTROL_SPECS.every((spec) => !/\.n\d+|ordinal|selector/i.test(spec.settingsKey)));
});

test("R3a mainTabRss remains the sole canonical owner", () => {
  assert.match(runtimeSource, /function mainTabRss\(data, appState, route\)/);
  assert.match(runtimeSource, /case "rss":[\s\S]*return mainTabRss\(data, appState, route\)/);
  assert.doesNotMatch(indexSource, /d2-rss-renderers\.js/);
});

test("R3a Figma-present empty, error and detail routes keep their canonical renderers", () => {
  assert.match(runtimeSource, /case "rss-detail":\s*return rssDetailScreen\(data, appState\)/);
  assert.match(runtimeSource, /case "rss-empty":\s*case "rss-error":\s*return rssStateScreen\(data, route, appState\)/);
});

test("R3a runtime invokes RSS instrumentation after each canonical render", () => {
  assert.equal((runtimeSource.match(/ReaderRssRuntimeContract\?\.instrumentDom/g) || []).length, 2);
  assert.match(indexSource, /rss-runtime-contract\.js/);
});

test("R3a Phone and Tablet are the only viewport atoms", () => {
  const source = `${contractSource}\n${runtimeSource.slice(runtimeSource.indexOf("function mainTabRss"), runtimeSource.indexOf("function rssShellScreen"))}`;
  assert.match(contractSource, /orientation === "landscape" \|\| width >= 600 \? "tablet" : "phone"/);
  assert.doesNotMatch(source, /compact-landscape|foldable|data-viewport="compact"|data-viewport="fold"/i);
});

test("R3a RSS visible actions keep their canonical semantic icon keys", () => {
  assert.match(runtimeSource, /rssArticleSection\(category\.title, articles, "rss-source-actions", "源操作", "settings"\)/);
  assert.doesNotMatch(runtimeSource, /rssArticleSection\(category\.title, articles, "rss-source-actions", "源操作", "more"\)/);
  assert.match(runtimeSource, /icon\("refresh", "fd-small-icon"\).*刷新/);
  assert.match(runtimeSource, /icon\("edit", "fd-small-icon"\).*编辑源/);
  assert.match(runtimeSource, /icon\("clock", "fd-small-icon"\).*记录/);
  assert.match(runtimeSource, /icon\("bug", "fd-small-icon"\).*调试/);
  assert.match(runtimeSource, /icon\("filter", "fd-small-icon"\)/);
  assert.match(runtimeSource, /"管理源", "source-stack"/);
  for (const [key, tablerName] of [
    ["settings", "settings"], ["refresh", "refresh"], ["edit", "edit"],
    ["clock", "clock"], ["bug", "bug"], ["filter", "filter"],
    ["source-stack", "stack-2"], ["rss", "file-rss"],
    ["offline", "cloud-off"], ["bookmark", "bookmark"],
    ["chevron", "chevron-right"], ["back", "arrow-left"]
  ]) {
    assert.match(iconSource, new RegExp(`"${key}": "${tablerName}"`), `${key} must map to Tabler ${tablerName}`);
  }
});
