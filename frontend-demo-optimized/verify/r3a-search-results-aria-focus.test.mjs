import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), ".."); const read = (file) => readFileSync(join(root, file), "utf8");
const sources = ["asset-library/icons.js", "shared-shell-kit/kit.js", "appearance-spec.js", "fixture.js", "renderers/d2-bookshelf-discover-renderers.js"].map(read);
const runtimeSource = read("render-runtime.js");
function fresh() { const window = { localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} } }; const context = vm.createContext({ window, Promise, setTimeout }); sources.forEach((source) => new vm.Script(source).runInContext(context)); return { api: window.ReaderD2BookshelfDiscoverRenderers, data: window.READER_FRONTEND_DEMO_DRAFT_FIXTURE }; }

test("R3a result rows are keyboard reachable and explicitly labelled", () => {
  const { api, data } = fresh(); const html = api.bookSearchV2(data, "search-results", {});
  assert.equal((html.match(/class="fd-search-result-row" role="button" tabindex="0"/g) || []).length, 3);
  for (const id of ["long-night", "mystery-lord", "three-body"]) assert.match(html, new RegExp(`data-search-result-id="${id}"[^>]*aria-label="打开`));
});

test("R3a search input and keyboard input have accessible names", () => {
  const { api, data } = fresh(); const html = api.bookSearchV2(data, "search-results", {});
  assert.match(html, /data-book-search-input[^>]*aria-label="搜索书名、作者或关键词"/);
  assert.match(html, /data-keyboard-input[^>]*aria-label="搜索书籍"/);
});

test("R3a submit has accessible name and exact focus return", () => {
  const { api, data } = fresh(); const html = api.bookSearchV2(data, "search-results", {});
  assert.match(html, /data-book-search-submit[^>]*aria-label="提交搜索"[^>]*data-restore-focus=/);
});

test("R3a result and route launchers retain exact focus-return keys", () => {
  const { api, data } = fresh();
  for (const route of ["search-results", "search-empty", "search-error"]) assert.match(api.bookSearchV2(data, route, {}), /data-restore-focus="search-results\.control\.button\.[^"]+@search-/);
});

test("R3a loading is a polite busy live region and cancel remains enabled", () => {
  const { api, data } = fresh(); const html = api.bookSearchV2(data, "search-loading", {});
  assert.match(html, /role="status" aria-live="polite" aria-busy="true"/);
  assert.match(html, /data-search-close[^>]*>取消<\/button>/); assert.doesNotMatch(html, /data-search-close[^>]*disabled/);
});

test("R3a empty state is announced and has two real next actions", () => {
  const { api, data } = fresh(); const html = api.bookSearchV2(data, "search-empty", {});
  assert.match(html, /data-search-state="empty" role="status" aria-live="polite"/);
  assert.match(html, /data-search-retry/); assert.match(html, /data-route="discover"/);
});

test("R3a error state is assertive and preserves retry/source recovery", () => {
  const { api, data } = fresh(); const html = api.bookSearchV2(data, "search-error", {});
  assert.match(html, /data-search-state="error" role="alert" aria-live="assertive"/);
  assert.match(html, /data-search-retry/); assert.match(html, /data-route="source-management"/);
});

test("R3a back buttons carry mapped identity", () => {
  const { api, data } = fresh();
  for (const route of ["search-results", "search-loading", "search-empty", "search-error"]) assert.match(api.bookSearchV2(data, route, {}), new RegExp(`data-control-key="search-results\\.control\\.button\\.back@${route}\\.`));
});

test("R3a runtime wires close retry and stable result selection to owner", () => {
  assert.match(runtimeSource, /querySelectorAll\("\[data-search-close\]"\)/);
  assert.match(runtimeSource, /bookSearchOwner\?\.executeRetry/);
  assert.match(runtimeSource, /querySelectorAll\("\[data-search-result-id\]\[data-route='book-detail'\]"\)/);
});

test("R3a every primary control has an accessible label source", () => {
  const { api, data } = fresh();
  for (const route of ["search-results", "search-loading", "search-empty", "search-error"]) {
    const html = api.bookSearchV2(data, route, {});
    for (const tag of html.match(/<(?:button|input|article)[^>]*data-control-key="[^"]+"[^>]*>/g) || []) assert.match(tag, /aria-label=|>[^<]+$/);
  }
});
