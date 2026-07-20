import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const declarationsSource = read("control-identity-declarations.js");
const rendererSource = read("renderers/d2-bookshelf-discover-renderers.js");
const kitSource = read("shared-shell-kit/kit.js");
const runtimeSource = read("render-runtime.js");
const fixture = {
  covers: { longNight: "./covers/long-night.png" },
  library: {
    book: { title: "长夜余火", author: "爱潜水的乌贼", latest: "第 32 章 雨夜", source: "优书网 · 20 分钟前更新", coverKey: "longNight" },
    chapters: [
      { title: "第 30 章 旧日", markers: ["已缓存"] },
      { title: "第 31 章 归途", markers: ["已缓存", "书签"] },
      { title: "第 32 章 雨夜", markers: ["书签"] },
      { title: "第 33 章 灯塔", markers: [] }
    ]
  }
};

function fresh() {
  const window = { localStorage: { getItem() { return null; }, setItem() {} } };
  const ctx = vm.createContext({ window, module: { exports: {} }, Promise, setTimeout, JSON, Map });
  new vm.Script(kitSource).runInContext(ctx);
  new vm.Script(declarationsSource).runInContext(ctx);
  new vm.Script(rendererSource).runInContext(ctx);
  return window.ReaderD2BookshelfDiscoverRenderers;
}

const values = (html, attr) => [...html.matchAll(new RegExp(`${attr}="([^"]+)"`, "g"))].map((match) => match[1]);

test("R2a book-detail declares 56 mapped business controls", () => {
  const sandbox = { module: { exports: {} }, window: {} };
  new vm.Script(declarationsSource).runInNewContext(sandbox);
  const rows = sandbox.module.exports.CANONICAL_CONTROL_DECLARATIONS.filter((entry) => entry.source === "book-detail-action");
  assert.equal(rows.length, 56);
  assert.ok(rows.every((entry) => entry.mappingStatus === "mapped" && entry.instanceKey === null));
  assert.deepEqual([...new Set(rows.map((entry) => entry.route))].sort(), ["book-detail", "book-detail-toc-preview", "book-directory"]);
});

test("R2a normal detail stamps five identity attributes on 15 controls", () => {
  const html = fresh().bookDetailV2(fixture, "book-detail", {});
  const keys = values(html, "data-control-key");
  assert.equal(keys.length, 15);
  assert.equal(new Set(keys).size, 15);
  for (const attr of ["data-entity-key", "data-control-id", "data-ui-event", "data-settings-key"]) assert.equal(values(html, attr).length, 15);
});

test("R2a TOC preview and full directory stamp their route-local inventories", () => {
  const api = fresh();
  assert.equal(values(api.bookDetailV2(fixture, "book-detail-toc-preview", {}), "data-control-key").length, 14);
  assert.equal(values(api.bookDirectoryV2(fixture, "book-directory", {}), "data-control-key").length, 10);
});

test("R2a chapter identities use stable chapter keys, never ordinal selectors", () => {
  const html = fresh().bookDirectoryV2(fixture, "book-directory", {});
  for (const key of ["chapter-30-old-day", "chapter-31-return", "chapter-32-rain-night", "chapter-33-lighthouse", "chapter-34-old-map", "chapter-35-night-walk", "chapter-36-after-lighthouse"]) {
    assert.ok(values(html, "data-settings-key").includes(key));
  }
  assert.doesNotMatch(values(html, "data-control-key").join("\n"), /\.n\d+$/m);
});

test("R3a Phone and Tablet wrappers preserve identical detail control sets", () => {
  const phone = values(`<div data-viewport="phone">${fresh().bookDetailV2(fixture, "book-detail", {})}</div>`, "data-control-key").sort();
  const tablet = values(`<div data-viewport="tablet">${fresh().bookDetailV2(fixture, "book-detail", {})}</div>`, "data-control-key").sort();
  assert.deepEqual(phone, tablet);
});

test("R3a renderer contains no Compact, Fold, or independent Landscape atoms", () => {
  const html = fresh().bookDetailV2(fixture, "book-detail", {});
  assert.doesNotMatch(html, /compact|fold|landscape/i);
});

test("R3a detail and directory rendering are idempotent without dispatch", () => {
  const api = fresh();
  assert.equal(api.bookDetailV2(fixture, "book-detail", {}), api.bookDetailV2(fixture, "book-detail", {}));
  assert.equal(api.bookDirectoryV2(fixture, "book-directory", {}), api.bookDirectoryV2(fixture, "book-directory", {}));
});

test("R3a unknown identity fails closed", () => assert.equal(fresh().bookDetail.identityAttrs("book-detail", "unknown"), ""));

test("R3a all three legacy runtime fallbacks are fail-loud frozen", () => {
  assert.match(runtimeSource, /book-detail[\s\S]*FROZEN to bookDetailV2/);
  assert.match(runtimeSource, /book-directory route is FROZEN to bookDirectoryV2/);
});

test("R3a production runtime wires detail owner actions and async helpers", () => {
  assert.match(runtimeSource, /ReaderD2BookshelfDiscoverRenderers\?\.bookDetail/);
  for (const token of ["SOURCE_SHEET_OPEN", "SOURCE_SELECT", "DELETE_DIALOG_OPEN", "executeDelete", "executeNetworkRetry", "executeTocRetry", "READD"]) {
    assert.ok(runtimeSource.includes(token), token);
  }
});

test("R3a local canonical targets remain book-directory and immersive-reading", () => {
  const html = fresh().bookDetailV2(fixture, "book-detail", {});
  assert.match(html, /data-route="book-directory"/);
  assert.match(html, /data-route="immersive-reading"/);
  assert.doesNotMatch(html, /Reader Full Directory|Reader Control Home/);
});
