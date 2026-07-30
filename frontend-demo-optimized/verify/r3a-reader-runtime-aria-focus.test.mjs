import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const contractSource = read("reader-runtime-contract.js");
const runtimeSource = read("render-runtime.js");

function fresh() {
  const sandbox = { module: { exports: {} }, window: {}, globalThis: {}, Promise };
  new vm.Script(contractSource).runInNewContext(sandbox);
  return sandbox.module.exports;
}

class FakeNode {
  constructor(attrs = {}) { this.attrs = new Map(Object.entries(attrs)); }
  setAttribute(key, value) { this.attrs.set(key, String(value)); }
  removeAttribute(key) { this.attrs.delete(key); }
  getAttribute(key) { return this.attrs.has(key) ? this.attrs.get(key) : null; }
  hasAttribute(key) { return this.attrs.has(key); }
}

test("R3a open controls expose deterministic focus-return markers", () => {
  const api = fresh();
  const spec = api.CONTROL_SPECS.find((item) => item.route === "reader" && item.settingsKey === "quick-search");
  const node = new FakeNode();
  const rootNode = new FakeNode();
  rootNode.querySelectorAll = (selector) => selector === spec.selector ? [node] : [];
  api.instrumentDom(rootNode, "reader");
  assert.match(node.getAttribute("data-restore-focus"), /quick-search@reader\.default$/);
});

test("R3a role=button controls receive keyboard focusability", () => {
  const api = fresh();
  const spec = api.CONTROL_SPECS.find((item) => item.route === "reader-full-directory" && item.settingsKey === "chapter-32-rain-night");
  const node = new FakeNode({ role: "button" });
  const rootNode = new FakeNode();
  rootNode.querySelectorAll = (selector) => selector === spec.selector ? [node] : [];
  api.instrumentDom(rootNode, "reader-full-directory");
  assert.equal(node.getAttribute("tabindex"), "0");
  assert.ok(node.getAttribute("aria-label"));
});

test("R3a immersive hotzones retain native button and aria semantics", () => {
  assert.match(runtimeSource, /fd-immersive-hotzone fd-hotzone-prev[\s\S]*type="button"[\s\S]*aria-label="上一页"/);
  assert.match(runtimeSource, /aria-label="打开阅读控制层"[\s\S]*data-reader-control-show/);
  assert.match(runtimeSource, /fd-immersive-hotzone fd-hotzone-next[\s\S]*aria-label="下一页"/);
});

test("R3a chapter download exposes busy and disabled state", () => {
  assert.match(runtimeSource, /data-reader-chapter-download-state=/);
  assert.match(runtimeSource, /aria-busy="\$\{isLoading \? "true" : "false"\}"/);
  assert.match(runtimeSource, /aria-disabled="\$\{isCached \|\| isLoading \? "true" : "false"\}"/);
});

test("R3a directory rows retain keyboard activation", () => {
  assert.match(runtimeSource, /querySelectorAll\("\[data-reader-directory-index\]"\)/);
  assert.match(runtimeSource, /event\.key !== "Enter" && event\.key !== " "/);
  assert.match(runtimeSource, /applyReaderDirectoryIndex/);
});

test("R3a TTS and auto-page stop controls share a real session cleanup", () => {
  assert.match(runtimeSource, /querySelectorAll\("\[data-reader-session-stop\]"\)/);
  assert.match(runtimeSource, /stopReaderSession\(button\.getAttribute\("data-reader-session-stop"\)\)/);
  assert.match(runtimeSource, /readerRuntimeOwner\?\.dispatch\?\.\(\{ type: "SESSION_STOP" \}\)/);
});

test("R3a owner is attached before route rendering and survives rerender", () => {
  const ownerIndex = runtimeSource.indexOf("const readerRuntimeOwner");
  const renderIndex = runtimeSource.indexOf("const renderActiveRoute");
  assert.ok(ownerIndex > 0 && renderIndex > ownerIndex);
  assert.equal((runtimeSource.match(/ReaderRuntimeContract\?\.instrumentDom/g) || []).length, 2);
});

test("R3a static visual and Motion sources are not imported by the runtime contract", () => {
  assert.doesNotMatch(contractSource, /Motion Reference|1023:17636|Figma|figma/i);
  assert.doesNotMatch(contractSource, /bookshelf\.view\.switch|sharedLayoutMorph/);
});
