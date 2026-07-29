import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function fresh() {
  const window = {
    localStorage: {
      _s: {},
      getItem(key) { return this._s[key] || null; },
      setItem(key, value) { this._s[key] = value; }
    },
    ReaderShellKit: {
      icon: () => "",
      renderMainTabShell: (config) => `${config.contentHtml || ""}${config.stateHostHtml || ""}`,
      renderSettingsShell: (config) => config.contentHtml || "",
      renderLibraryShell: (config) => `${config.contentHtml || ""}${config.stateHostHtml || ""}`
    }
  };
  const context = vm.createContext({ window, module: { exports: {} }, Promise, setTimeout, JSON, Number, Array, String, Math });
  for (const file of ["control-identity-declarations.js", "renderers/d2-bookshelf-discover-renderers.js"]) {
    new vm.Script(readFileSync(join(root, file), "utf8")).runInContext(context);
  }
  return window.ReaderD2BookshelfDiscoverRenderers.bookshelf;
}

test("R2b view reducer accepts cover/list and rejects invalid values", () => {
  const bookshelf = fresh();
  bookshelf.dispatch({ type: "VIEW_SET", view: "list" });
  assert.equal(bookshelf.getState().view, "list");
  const state = bookshelf.getState();
  bookshelf.dispatch({ type: "VIEW_SET", view: "tiles" });
  assert.equal(bookshelf.getState(), state);
});

test("R2b no longer accepts the cancelled grouping action", () => {
  const bookshelf = fresh();
  const state = bookshelf.getState();
  bookshelf.dispatch({ type: "GROUP_SELECT", value: "追更" });
  assert.equal(bookshelf.getState(), state);
  assert.equal("group" in bookshelf.getState(), false);
});

test("R2b sort and filter reducers validate business options", () => {
  const bookshelf = fresh();
  bookshelf.dispatch({ type: "SORT_SELECT", value: "作者" });
  bookshelf.dispatch({ type: "FILTER_SELECT", value: "未读" });
  assert.equal(bookshelf.getState().sort, "作者");
  assert.equal(bookshelf.getState().filter, "未读");
  const state = bookshelf.getState();
  bookshelf.dispatch({ type: "FILTER_SELECT", value: "不存在" });
  assert.equal(bookshelf.getState(), state);
});

test("R2b search set and clear preserve focus return", () => {
  const bookshelf = fresh();
  bookshelf.dispatch({ type: "SEARCH_SET", value: "三体" });
  bookshelf.dispatch({ type: "SEARCH_CLEAR" });
  assert.equal(bookshelf.getState().search, "");
  assert.equal(bookshelf.getState().focusReturnKey, "search-toggle");
});

test("R2b filter and more disclosures are mutually exclusive", () => {
  const bookshelf = fresh();
  bookshelf.dispatch({ type: "FILTER_TOGGLE" });
  assert.equal(bookshelf.getState().filterOpen, true);
  bookshelf.dispatch({ type: "MORE_OPEN" });
  assert.equal(bookshelf.getState().filterOpen, false);
  assert.equal(bookshelf.getState().moreOpen, true);
  bookshelf.dispatch({ type: "MORE_CLOSE" });
  assert.equal(bookshelf.getState().moreOpen, false);
});

test("R2b exact book action target opens and closes in place", () => {
  const bookshelf = fresh();
  bookshelf.dispatch({ type: "BOOK_ACTION_OPEN", bookKey: "source-a::book-1" });
  assert.equal(bookshelf.getState().bookActionBookKey, "source-a::book-1");
  assert.equal(bookshelf.getState().focusReturnKey, "book-more-source-a::book-1");
  bookshelf.dispatch({ type: "BOOK_ACTION_CLOSE" });
  assert.equal(bookshelf.getState().bookActionBookKey, null);
});

test("R2b multi-select starts with only the long-pressed book", () => {
  const bookshelf = fresh();
  bookshelf.dispatch({ type: "BOOK_ACTION_OPEN", bookKey: "source-a::book-2" });
  bookshelf.dispatch({ type: "MULTI_SELECT_OPEN", bookKey: "source-a::book-2" });
  assert.equal(bookshelf.getState().bookActionBookKey, null);
  assert.equal(bookshelf.getState().multiSelectOpen, true);
  assert.deepEqual(Array.from(bookshelf.getState().multiSelectSelectedBookKeys), ["source-a::book-2"]);
});

test("R2b multi-select toggles and select-all never create group state", () => {
  const bookshelf = fresh();
  bookshelf.dispatch({ type: "MULTI_SELECT_OPEN", bookKey: "source-a::book-1" });
  bookshelf.dispatch({ type: "MULTI_SELECT_TOGGLE", bookKey: "source-a::book-2" });
  assert.deepEqual(Array.from(bookshelf.getState().multiSelectSelectedBookKeys), ["source-a::book-1", "source-a::book-2"]);
  bookshelf.dispatch({ type: "MULTI_SELECT_SET_ALL", bookKeys: ["source-a::book-1", "source-a::book-2", "source-a::book-2"] });
  assert.deepEqual(Array.from(bookshelf.getState().multiSelectSelectedBookKeys), ["source-a::book-1", "source-a::book-2"]);
  assert.equal("group" in bookshelf.getState(), false);
});

test("R2b removal requires confirmation and rejects duplicate execution", async () => {
  const bookshelf = fresh();
  bookshelf.dispatch({ type: "MULTI_SELECT_OPEN", bookKey: "source-a::book-1" });
  bookshelf.dispatch({ type: "MULTI_SELECT_REMOVE_OPEN" });
  const first = bookshelf.executeBatchRemove({ delay: 5 });
  const duplicate = await bookshelf.executeBatchRemove({ delay: 0 });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.reason, "empty-or-loading");
  assert.equal((await first).ok, true);
  assert.deepEqual(Array.from(bookshelf.getState().removedBookKeys), ["source-a::book-1"]);
});

test("R2b stale or mismatched removal result cannot mutate the shelf", () => {
  const bookshelf = fresh();
  bookshelf.dispatch({ type: "BOOK_ACTION_REMOVE_OPEN", bookKey: "source-a::book-1" });
  bookshelf.dispatch({ type: "REMOVE_START", target: "single", requestId: 8 });
  const state = bookshelf.getState();
  bookshelf.dispatch({ type: "REMOVE_SUCCESS", requestId: 7 });
  assert.equal(bookshelf.getState(), state);
});

test("R2b load start has duplicate-click guard", () => {
  const bookshelf = fresh();
  bookshelf.dispatch({ type: "LOAD_RETRY_START" });
  const state = bookshelf.getState();
  bookshelf.dispatch({ type: "LOAD_RETRY_START" });
  assert.equal(bookshelf.getState(), state);
});

test("R2b load success has stale async guard", () => {
  const bookshelf = fresh();
  const state = bookshelf.getState();
  bookshelf.dispatch({ type: "LOAD_RETRY_SUCCESS" });
  assert.equal(bookshelf.getState(), state);
  bookshelf.dispatch({ type: "LOAD_RETRY_START" });
  bookshelf.dispatch({ type: "LOAD_RETRY_SUCCESS" });
  assert.equal(bookshelf.getState().loadStatus, "success");
});

test("R2b load failure records an error", () => {
  const bookshelf = fresh();
  bookshelf.dispatch({ type: "LOAD_RETRY_START" });
  bookshelf.dispatch({ type: "LOAD_RETRY_FAILED", error: "读取失败" });
  assert.equal(bookshelf.getState().error, "读取失败");
});

test("R2b network retry preserves real offline state", () => {
  const bookshelf = fresh();
  bookshelf.dispatch({ type: "OFFLINE_SET", value: true });
  bookshelf.dispatch({ type: "NETWORK_RETRY_START" });
  bookshelf.dispatch({ type: "NETWORK_RETRY_FAILED", error: "无网络" });
  assert.equal(bookshelf.getState().offline, true);
  bookshelf.dispatch({ type: "NETWORK_RETRY_START" });
  bookshelf.dispatch({ type: "NETWORK_RETRY_SUCCESS" });
  assert.equal(bookshelf.getState().offline, false);
});

test("R2b async helpers resolve through the single state owner", async () => {
  const bookshelf = fresh();
  assert.equal((await bookshelf.executeLoadRetry({ delay: 0 })).ok, true);
  bookshelf.dispatch({ type: "OFFLINE_SET", value: true });
  assert.equal((await bookshelf.executeNetworkRetry({ delay: 0, simulateResult: "failed" })).ok, false);
  assert.equal(bookshelf.getState().networkStatus, "failed");
});

test("R2b subscribers observe accepted actions only", () => {
  const bookshelf = fresh();
  let count = 0;
  const unsubscribe = bookshelf.subscribe(() => { count += 1; });
  bookshelf.dispatch({ type: "VIEW_SET", view: "list" });
  bookshelf.dispatch({ type: "VIEW_SET", view: "list" });
  unsubscribe();
  bookshelf.dispatch({ type: "VIEW_SET", view: "cover" });
  assert.equal(count, 1);
});

test("R2b persisted state excludes transient action and removal domains", () => {
  const bookshelf = fresh();
  bookshelf.dispatch({ type: "VIEW_SET", view: "list" });
  const persisted = JSON.stringify(bookshelf.getState());
  assert.match(persisted, /"view":"list"/);
  assert.equal(bookshelf.defaults().loadStatus, "idle");
  assert.equal(bookshelf.defaults().bookActionBookKey, null);
  assert.deepEqual(Array.from(bookshelf.defaults().removedBookKeys), []);
});
