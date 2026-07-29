import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ids = ["long-night", "mystery-lord"];
const fixture = {
  covers: {},
  mainTabs: {
    books: ids.map((bookId, index) => ({
      sourceId: "source-youshu",
      bookId,
      title: `书${index + 1}`,
      author: "作者",
      chapter: "第一章",
      coverKey: bookId
    }))
  }
};

function fresh() {
  const window = {
    localStorage: { getItem() { return null; }, setItem() {} },
    ReaderShellKit: {
      icon: () => "",
      statusBar: () => '<div class="fd-status-bar"></div>',
      renderMainTabShell: (config) => `${config.contentHtml || ""}${config.stateHostHtml || ""}`,
      renderSettingsShell: (config) => config.contentHtml || "",
      renderLibraryShell: (config) => `${config.contentHtml || ""}${config.stateHostHtml || ""}`
    }
  };
  const context = vm.createContext({ window, module: { exports: {} }, Promise, setTimeout, JSON, Number, Array, String, Math });
  for (const file of ["control-identity-declarations.js", "renderers/d2-bookshelf-discover-renderers.js"]) {
    new vm.Script(readFileSync(join(root, file), "utf8")).runInContext(context);
  }
  return window.ReaderD2BookshelfDiscoverRenderers;
}

test("R3a grid and cards expose list/listitem semantics and stable positions", () => {
  const html = fresh().bookshelfV2(fixture, "bookshelf", {});
  assert.match(html, /role="list"/);
  assert.equal((html.match(/role="listitem"/g) || []).length, 2);
  assert.match(html, /aria-posinset="1" aria-setsize="2"/);
  assert.match(html, /aria-posinset="2" aria-setsize="2"/);
});

test("R3a view controls are mutually exclusive and hidden list actions leave the tab order", () => {
  const html = fresh().bookshelfV2(fixture, "bookshelf", {});
  assert.match(html, /data-bookshelf-view-button="cover" aria-pressed="true"/);
  assert.match(html, /data-bookshelf-view-button="list" aria-pressed="false"/);
  assert.equal((html.match(/data-book-more[^>]+aria-hidden="true" tabindex="-1"/g) || []).length, 2);
});

test("R3a filter discloses only sort and filter, never cancelled grouping", () => {
  const api = fresh();
  api.bookshelf.dispatch({ type: "FILTER_TOGGLE" });
  const html = api.bookshelfV2(fixture, "bookshelf", {});
  assert.match(html, /data-bookshelf-filter-toggle aria-expanded="true"/);
  assert.match(html, /data-bookshelf-sort-option="最近更新" aria-pressed="true"/);
  assert.match(html, /data-bookshelf-filter-option="全部" aria-pressed="true"/);
  assert.doesNotMatch(html, /data-bookshelf-group-option|分组管理|移动至分组/);
});

test("R3a bookshelf more menu exposes only local import with deterministic focus", () => {
  const html = fresh().bookshelfV2(fixture, "bookshelf", {});
  assert.match(html, /class="fd-bookshelf-more-menu" role="dialog" aria-modal="true"/);
  assert.match(html, /data-dialog-initial-focus="more-local-import"/);
  assert.match(html, /data-local-import-open/);
  assert.doesNotMatch(html, /more-batch|more-group|more-settings/);
});

test("R3a action sheet keeps exact target and exactly three Figma actions", () => {
  const api = fresh();
  api.bookshelf.dispatch({ type: "BOOK_ACTION_OPEN", bookKey: "source-youshu::mystery-lord" });
  const html = api.bookActionSheetV2(fixture);
  assert.match(html, /role="dialog" aria-modal="true" aria-label="书2操作"/);
  assert.match(html, /data-book-action="multi-select" data-book-id="mystery-lord" data-book-source-id="source-youshu" data-book-key="source-youshu::mystery-lord" data-sheet-initial-focus/);
  assert.equal((html.match(/data-book-action=/g) || []).length, 3);
  assert.doesNotMatch(html, /分组|缓存|分享|更换书源/);
});

test("R3a multi-select is a single in-place selection state with one batch action", () => {
  const api = fresh();
  api.bookshelf.dispatch({ type: "MULTI_SELECT_OPEN", bookKey: "source-youshu::mystery-lord" });
  const html = api.bookshelfMultiSelectV2(fixture);
  assert.match(html, /aria-label="书架多选"/);
  assert.match(html, /data-multi-select-book-key="source-youshu::mystery-lord"[^>]+aria-pressed="true"/);
  assert.match(html, /data-multi-select-book-key="source-youshu::long-night"[^>]+aria-pressed="false"/);
  assert.equal((html.match(/data-multi-select-remove/g) || []).length, 1);
  assert.doesNotMatch(html, /data-route="book-batch-management"|移动至分组|分组管理/);
});

test("R3a removal dialog exposes confirmation and loading semantics", () => {
  const api = fresh();
  api.bookshelf.dispatch({ type: "BOOK_ACTION_REMOVE_OPEN", bookKey: "source-youshu::long-night" });
  let html = api.bookshelfV2(fixture, "bookshelf", {});
  assert.match(html, /data-bookshelf-remove-dialog/);
  assert.match(html, /data-bookshelf-remove-cancel data-dialog-initial-focus/);
  assert.match(html, /data-bookshelf-remove-confirm aria-busy="false"/);
  api.bookshelf.dispatch({ type: "REMOVE_START", target: "single", requestId: 11 });
  html = api.bookshelfV2(fixture, "bookshelf", {});
  assert.match(html, /data-bookshelf-remove-confirm aria-busy="true" disabled/);
});

test("R3a search clear declares focus return", () => {
  const api = fresh();
  api.bookshelf.dispatch({ type: "SEARCH_SET", value: "书" });
  api.bookshelf.dispatch({ type: "FILTER_TOGGLE" });
  const html = api.bookshelfV2(fixture, "bookshelf", {});
  assert.match(html, /data-bookshelf-search-clear data-restore-focus="search-toggle"/);
});

test("R3a every emitted control key is unique in default and multi-select states", () => {
  const api = fresh();
  const defaultHtml = api.bookshelfV2(fixture, "bookshelf", {});
  api.bookshelf.dispatch({ type: "MULTI_SELECT_OPEN", bookKey: "source-youshu::long-night" });
  const multiHtml = api.bookshelfMultiSelectV2(fixture);
  for (const html of [defaultHtml, multiHtml]) {
    const keys = [...html.matchAll(/data-control-key="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(keys).size, keys.length);
  }
});
