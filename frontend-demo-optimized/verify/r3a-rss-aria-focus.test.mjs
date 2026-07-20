import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contractSource = readFileSync(join(root, "rss-runtime-contract.js"), "utf8");
function fresh() { const sandbox = { module: { exports: {} }, window: {}, globalThis: {}, Promise }; new vm.Script(contractSource).runInNewContext(sandbox); return sandbox.module.exports; }
class FakeNode {
  constructor(tagName = "BUTTON") { this.tagName = tagName; this.attrs = new Map(); }
  setAttribute(key, value) { this.attrs.set(key, String(value)); }
  getAttribute(key) { return this.attrs.has(key) ? this.attrs.get(key) : null; }
  hasAttribute(key) { return this.attrs.has(key); }
}
function stamp(api, settingsKey, route = "rss") {
  const spec = api.CONTROL_SPECS.find((item) => item.route === route && item.settingsKey === settingsKey);
  const node = new FakeNode(spec.selector.startsWith("article") ? "ARTICLE" : "BUTTON"); const rootNode = new FakeNode("MAIN");
  rootNode.querySelectorAll = (selector) => selector === spec.selector ? [node] : [];
  api.instrumentDom(rootNode, route); return node;
}

test("R3a feed entry exposes deterministic focus return", () => {
  const node = stamp(fresh(), "feed-open-github-releases");
  assert.match(node.getAttribute("data-restore-focus"), /feed-open-github-releases@rss\.default$/);
});

test("R3a article entry is keyboard focusable and labeled", () => {
  const node = stamp(fresh(), "article-open-reader-ui-update");
  assert.equal(node.getAttribute("role"), "button"); assert.equal(node.getAttribute("tabindex"), "0"); assert.ok(node.getAttribute("aria-label"));
});

test("R3a source edit returns focus to its launcher", () => {
  const node = stamp(fresh(), "source-edit", "rss-source-feed");
  assert.match(node.getAttribute("data-restore-focus"), /source-edit@rss-source-feed\.default$/);
});

test("R3a loading state has live, busy status semantics", () => {
  const api = fresh(); const html = api.stateHostHtml({ phase: "loading" });
  assert.match(html, /role="status"/); assert.match(html, /aria-live="polite"/); assert.match(html, /aria-busy="true"/);
});

test("R3a error state has assertive alert semantics", () => {
  const html = fresh().stateHostHtml({ phase: "error", error: "offline" });
  assert.match(html, /role="alert"/); assert.match(html, /aria-live="assertive"/); assert.match(html, /offline/);
});

test("R3a empty state remains an announced view state", () => {
  const html = fresh().stateHostHtml({ phase: "empty" });
  assert.match(html, /role="status"/); assert.match(html, /当前没有 RSS 内容/);
});

test("R3a detail state uses stable article ID", () => {
  const html = fresh().stateHostHtml({ phase: "detail", selectedArticleId: "reader-ui-update" });
  assert.match(html, /role="region"/); assert.match(html, /data-rss-detail-id="reader-ui-update"/);
});

test("R3a ambiguous and missing selectors fail closed", () => {
  const api = fresh(); const spec = api.CONTROL_SPECS.find((item) => item.route === "rss" && item.settingsKey === "refresh");
  const rootNode = new FakeNode("MAIN"); rootNode.querySelectorAll = (selector) => selector === spec.selector ? [new FakeNode(), new FakeNode()] : [];
  const report = api.instrumentDom(rootNode, "rss");
  assert.equal(report.stamped, 0); assert.equal(report.ambiguous, 1); assert.equal(report.missing, 21);
});

test("R3a invalid and idle cancel actions cannot mutate owner state", () => {
  const api = fresh(); const owner = api.createOwner(); const before = owner.getState();
  owner.dispatch({ type: "SELECT_ARTICLE", articleId: "article-0" });
  assert.equal(owner.getState(), before); assert.equal(api.cancelRefresh(owner).status, "idle");
});
