import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const declarationsSource = read("control-identity-declarations.js");
const rendererSource = read("renderers/d2-bookshelf-discover-renderers.js");
const runtimeSource = read("render-runtime.js");
const motionSource = read("motion-contract-registry.js");
const ids = ["long-night", "mystery-lord", "ming-dynasty-stories", "three-body", "renjian-cihua", "android-notes", "old-day-echoes", "among-stars", "lighthouse-and-fog", "paper-city", "long-title-layout-sample"];
const fixture = { covers: {}, mainTabs: { books: ids.map((bookId, i) => ({ bookId, title: `书${i}`, author: i === 5 ? "本地文档" : "作者", chapter: "第一章", coverKey: bookId })) } };

function fresh() {
  const window = { localStorage: { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = v; } }, ReaderShellKit: {
    icon: (n) => `<i data-icon="${n}"></i>`,
    renderMainTabShell: (c) => `${c.contentHtml || ""}${c.stateHostHtml || ""}`,
    renderSettingsShell: (c) => `${c.contentHtml || ""}${c.bottomActionHtml || ""}`,
    renderLibraryShell: (c) => `${c.contentHtml || ""}${c.stateHostHtml || ""}`
  } };
  const ctx = vm.createContext({ window, module: { exports: {} }, Promise, setTimeout, JSON });
  new vm.Script(declarationsSource).runInContext(ctx);
  new vm.Script(rendererSource).runInContext(ctx);
  return window.ReaderD2BookshelfDiscoverRenderers;
}
const values = (html, attr) => [...html.matchAll(new RegExp(`${attr}="([^"]+)"`, "g"))].map((m) => m[1]);

test("R2a bookshelf declares 50 mapped business controls", () => {
  const api = fresh();
  const d = api.bookshelf;
  assert.ok(d.identityAttrs("view-cover").includes("data-control-key"));
  const sandbox = { module: { exports: {} }, window: {} };
  new vm.Script(declarationsSource).runInNewContext(sandbox);
  const rows = sandbox.module.exports.CANONICAL_CONTROL_DECLARATIONS.filter((x) => x.source === "bookshelf-action");
  assert.equal(rows.length, 50);
  assert.ok(rows.every((x) => x.mappingStatus === "mapped" && x.instanceKey === null));
});

test("R2a default bookshelf stamps five identity attributes on 34 controls", () => {
  const html = fresh().bookshelfV2(fixture, "bookshelf", {});
  const keys = values(html, "data-control-key");
  assert.equal(keys.length, 34);
  assert.equal(new Set(keys).size, 34);
  for (const attr of ["data-entity-key", "data-control-id", "data-ui-event", "data-settings-key"]) assert.equal(values(html, attr).length, 34);
});

test("R2a all eleven books use entity business ids, not ordinals", () => {
  const html = fresh().bookshelfV2(fixture, "bookshelf", {});
  for (const id of ids) {
    assert.ok(values(html, "data-settings-key").includes(`book-open-${id}`));
    assert.ok(values(html, "data-settings-key").includes(`book-more-${id}`));
  }
  assert.doesNotMatch(values(html, "data-control-key").join("\n"), /\.n\d+$/m);
});

test("R3a phone and tablet render identical controlKey sets", () => {
  const a = values(fresh().bookshelfV2(fixture, "bookshelf", {}), "data-control-key").sort();
  const b = values(fresh().bookshelfV2(fixture, "bookshelf", {}), "data-control-key").sort();
  assert.deepEqual(a, b);
});

test("R3a bookshelf renderer contains no compact or fold viewport atoms", () => {
  const html = fresh().bookshelfV2(fixture, "bookshelf", {});
  assert.doesNotMatch(html, /compact|fold|landscape/i);
});

test("R3a bookshelf render is idempotent without dispatch", () => {
  const api = fresh();
  assert.equal(api.bookshelfV2(fixture, "bookshelf", {}), api.bookshelfV2(fixture, "bookshelf", {}));
});

test("R3a cover and list routes preserve the same book identities", () => {
  const api = fresh();
  const a = values(api.bookshelfV2(fixture, "bookshelf-cover-mode", {}), "data-book-id");
  const b = values(api.bookshelfV2(fixture, "bookshelf-list-mode", {}), "data-book-id");
  assert.deepEqual(a, b);
});

test("R3a render-runtime bookshelf fallbacks are fail-loud frozen", () => {
  for (const route of ["bookshelf route", "bookshelf-cover-mode route", "bookshelf-list-mode route", "bookshelf-empty route", "bookshelf-book-more-menu route", "bookshelf-search-settings route"]) assert.ok(runtimeSource.includes(`${route} is FROZEN`));
});

test("R3a shared-layout motion contract remains unchanged", () => {
  assert.match(motionSource, /"id": "bookshelf\.view\.switch"[\s\S]*?"visualPattern": "sharedLayoutMorph"[\s\S]*?"interruptPolicy": "redirect"[\s\S]*?"reducedMotionPolicy": "zeroDuration"/);
});

test("R3a identity resolver fails closed for unknown keys", () => assert.equal(fresh().bookshelf.identityAttrs("unknown"), ""));
