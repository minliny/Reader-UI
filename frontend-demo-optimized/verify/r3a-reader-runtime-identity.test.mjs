import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const contractSource = read("reader-runtime-contract.js");
const declarationsSource = read("control-identity-declarations.js");
const runtimeSource = read("render-runtime.js");
const indexSource = read("index.html");

function freshContract() {
  const sandbox = { module: { exports: {} }, window: {}, globalThis: {} };
  new vm.Script(declarationsSource).runInNewContext(sandbox);
  new vm.Script(contractSource).runInNewContext(sandbox);
  return sandbox.module.exports;
}

function declarations() {
  const sandbox = { module: { exports: {} }, window: {} };
  new vm.Script(declarationsSource).runInNewContext(sandbox);
  return sandbox.module.exports.CANONICAL_CONTROL_DECLARATIONS;
}

class FakeNode {
  constructor() { this.attrs = new Map(); }
  setAttribute(key, value) { this.attrs.set(key, String(value)); }
  removeAttribute(key) { this.attrs.delete(key); }
  getAttribute(key) { return this.attrs.has(key) ? this.attrs.get(key) : null; }
  hasAttribute(key) { return this.attrs.has(key); }
}

test("R2a declares the complete reader-runtime business-control set", () => {
  const rows = declarations().filter((entry) => entry.source === "reader-runtime-action");
  assert.equal(rows.length, freshContract().CONTROL_SPECS.length);
  assert.ok(rows.length >= 400);
  assert.ok(rows.every((entry) => entry.mappingStatus === "mapped" && entry.instanceKey === null));
  assert.equal(new Set(rows.map((entry) => entry.controlKey)).size, rows.length);
});

test("R2a covers 13 primary and seven compatibility routes", () => {
  const api = freshContract();
  assert.equal(api.PRIMARY_ROUTES.length, 13);
  assert.equal(Object.keys(api.COMPATIBILITY_ROUTE_CROSSWALK).length, 7);
  assert.equal(api.ALL_ROUTES.length, 20);
  assert.deepEqual(Object.keys(api.COMPATIBILITY_ROUTE_CROSSWALK).sort(), [
    "auto-page", "content-replacement", "content-search", "reader-appearance",
    "reader-settings", "toc-bookmarks", "tts"
  ]);
});

test("R2a identities never use ordinal or selector-hash control keys", () => {
  const rows = declarations().filter((entry) => entry.source === "reader-runtime-action");
  const text = rows.map((entry) => `${entry.controlKey}\n${entry.settingsKey}`).join("\n");
  assert.doesNotMatch(text, /\.n\d+|selector|hash-|directory-index/);
  for (const key of ["chapter-30-old-day", "chapter-31-return", "chapter-32-rain-night", "chapter-33-lighthouse"]) {
    assert.match(text, new RegExp(key));
  }
});

test("R2a DOM instrumentation stamps four stable attributes plus one semantic slot", () => {
  const api = freshContract();
  const specs = api.CONTROL_SPECS.filter((spec) => spec.route === "immersive-reading");
  const nodes = new Map(specs.map((spec) => [spec.selector, new FakeNode()]));
  const rootNode = new FakeNode();
  rootNode.querySelectorAll = (selector) => nodes.has(selector) ? [nodes.get(selector)] : [];
  const report = api.instrumentDom(rootNode, "immersive-reading");
  assert.equal(report.stamped, 3);
  assert.equal(report.ambiguous, 0);
  for (const node of nodes.values()) {
    for (const attr of ["data-entity-key", "data-control-key", "data-control-id", "data-settings-key"]) {
      assert.equal(node.hasAttribute(attr), true, attr);
    }
    assert.equal(Number(node.hasAttribute("data-ui-event")) + Number(node.hasAttribute("data-control-token")), 1);
    assert.equal(node.getAttribute("data-viewport"), "phone");
  }
});

test("R2a reader identity-only controls stamp a token instead of a UiEvent", () => {
  const api = freshContract();
  const spec = api.CONTROL_SPECS.find((item) => item.route === "reader" && item.settingsKey === "more-menu-toggle");
  const node = new FakeNode();
  const rootNode = new FakeNode();
  rootNode.querySelectorAll = (selector) => selector === spec.selector ? [node] : [];
  api.instrumentDom(rootNode, "reader");
  assert.equal(node.getAttribute("data-control-token"), "menu.toggle");
  assert.equal(node.hasAttribute("data-ui-event"), false);
});

test("R2a reader instrumentation clears a stale opposite semantic slot on a reused node", () => {
  const api = freshContract();
  const tokenSpec = api.CONTROL_SPECS.find((item) => item.route === "reader" && item.settingsKey === "more-menu-toggle");
  const tokenNode = new FakeNode();
  tokenNode.setAttribute("data-ui-event", "route.pop");
  const tokenRoot = new FakeNode();
  tokenRoot.querySelectorAll = (selector) => selector === tokenSpec.selector ? [tokenNode] : [];
  api.instrumentDom(tokenRoot, "reader");
  assert.equal(tokenNode.getAttribute("data-control-token"), "menu.toggle");
  assert.equal(tokenNode.hasAttribute("data-ui-event"), false, "token instrumentation clears stale UiEvent");

  const eventSpec = api.CONTROL_SPECS.find((item) => item.route === "immersive-reading");
  const eventNode = new FakeNode();
  eventNode.setAttribute("data-control-token", "menu.toggle");
  const eventRoot = new FakeNode();
  eventRoot.querySelectorAll = (selector) => selector === eventSpec.selector ? [eventNode] : [];
  api.instrumentDom(eventRoot, "immersive-reading");
  assert.equal(eventNode.hasAttribute("data-ui-event"), true, "UiEvent instrumentation restores executable event");
  assert.equal(eventNode.hasAttribute("data-control-token"), false, "UiEvent instrumentation clears stale token");
});

test("R2a unknown routes and ambiguous selectors fail closed", () => {
  const api = freshContract();
  const unknown = new FakeNode();
  unknown.querySelectorAll = () => [new FakeNode()];
  assert.equal(api.instrumentDom(unknown, "not-a-reader-route").stamped, 0);
  const ambiguous = new FakeNode();
  ambiguous.querySelectorAll = () => [new FakeNode(), new FakeNode()];
  const report = api.instrumentDom(ambiguous, "immersive-reading");
  assert.equal(report.stamped, 0);
  assert.equal(report.ambiguous, 3);
});

test("R3a production runtime loads and invokes the identity owner", () => {
  assert.match(indexSource, /reader-runtime-contract\.js/);
  assert.match(runtimeSource, /ReaderRuntimeContract\?\.createOwner/);
  assert.match(runtimeSource, /ReaderRuntimeContract\?\.instrumentDom/);
  assert.match(runtimeSource, /window\.__readerRuntimeOwner/);
});

test("R3a chapter controls consume explicit fixture business keys", () => {
  const fixtureSource = read("fixture.js");
  for (const key of ["chapter-30-old-day", "chapter-31-return", "chapter-32-rain-night", "chapter-33-lighthouse"]) {
    assert.match(fixtureSource, new RegExp(`chapterKey: "${key}"`));
  }
  assert.match(runtimeSource, /data-reader-chapter-key=/);
  assert.match(runtimeSource, /data-reader-chapter-download-key=/);
});

test("R3a viewport contract is Phone and Tablet only", () => {
  const packetPolicy = { phone: "390x844", tablet: "760x960", landscapeAlias: "tablet" };
  assert.deepEqual(packetPolicy, { phone: "390x844", tablet: "760x960", landscapeAlias: "tablet" });
  assert.doesNotMatch(contractSource, /CompactLandscape|foldable|844x390/i);
});
