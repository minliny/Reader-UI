import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { installFigmaRouteAdmissionVm } from "./helpers/figma-route-admission-vm.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const fixture = {
  covers: {},
  mainTabs: { books: [
    { sourceId: "source-youshu", bookId: "long-night", title: "长夜余火", author: "爱潜水的乌贼", chapter: "第一章", coverKey: "longNight" },
    { sourceId: "source-youshu", bookId: "mystery-lord", title: "诡秘之主", author: "爱潜水的乌贼", chapter: "第二章", coverKey: "mysteryLord" },
    { sourceId: "source-youshu", bookId: "three-body", title: "三体", author: "刘慈欣", chapter: "第三章", coverKey: "threeBody" }
  ] }
};

function fresh() {
  const window = {
    localStorage: { getItem() { return null; }, setItem() {} },
    ReaderShellKit: {
      icon: (name) => `<i data-icon="${name}"></i>`,
      renderMainTabShell: (config) => `${config.topBarHtml || ""}${config.contentHtml || ""}${config.stateHostHtml || ""}`
    }
  };
  const context = vm.createContext({ window, module: { exports: {} }, Promise, setTimeout, JSON, Number, Array, String, Math });
  installFigmaRouteAdmissionVm(context, root);
  new vm.Script(read("control-identity-declarations.js")).runInContext(context);
  new vm.Script(read("renderers/d2-bookshelf-discover-renderers.js")).runInContext(context);
  return window.ReaderD2BookshelfDiscoverRenderers;
}

test("Figma multi-select starts from the exact long-pressed book and exposes only removal", () => {
  const api = fresh();
  api.bookshelf.dispatch({ type: "MULTI_SELECT_OPEN", bookKey: "source-youshu::mystery-lord" });
  const html = api.bookshelfMultiSelectV2(fixture, "book-batch-management", {});
  assert.match(html, /已选择 1 本/);
  assert.match(html, /data-multi-select-book-key="source-youshu::mystery-lord"[^>]+aria-pressed="true"/);
  assert.match(html, /移除书架/);
  assert.doesNotMatch(html, /移动分组|分组管理|缓存所选|标记已读/);
});

test("long-press action opens the Figma-bound in-place state without a retired route", () => {
  const runtime = read("render-runtime.js");
  assert.match(runtime, /dispatch\(\{ type: "BOOK_ACTION_OPEN", bookKey \}\)/);
  assert.match(runtime, /dispatch\?\.\(\{ type: "MULTI_SELECT_OPEN", bookKey \}\)/);
  assert.doesNotMatch(runtime, /goTo\("(?:book-batch-management|bookshelf-multiselect)", true\)/);
  assert.match(runtime, /book-batch-management is retired: use the in-place Figma Bookshelf\/MultiSelect state/);
});

test("Figma multi-select supports select all then one atomic removal", async () => {
  const api = fresh();
  api.bookshelf.dispatch({ type: "MULTI_SELECT_OPEN", bookKey: "source-youshu::long-night" });
  api.bookshelf.dispatch({ type: "MULTI_SELECT_SET_ALL", bookKeys: ["source-youshu::long-night", "source-youshu::mystery-lord", "source-youshu::three-body"] });
  assert.equal(api.bookshelf.getState().multiSelectSelectedBookKeys.length, 3);
  api.bookshelf.dispatch({ type: "MULTI_SELECT_REMOVE_OPEN" });
  const first = api.bookshelf.executeBatchRemove({ delay: 5 });
  const duplicate = await api.bookshelf.executeBatchRemove({ delay: 0 });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.reason, "empty-or-loading");
  const result = await first;
  assert.equal(result.ok, true);
  assert.deepEqual(Array.from(api.bookshelf.getState().removedBookKeys).sort(), ["source-youshu::long-night", "source-youshu::mystery-lord", "source-youshu::three-body"]);
  assert.equal(api.bookshelf.getState().multiSelectSelectedBookKeys.length, 0);
});

test("Single removal shares confirmation/loading/failure guards without reviving a group route", async () => {
  const api = fresh();
  api.bookshelf.dispatch({ type: "BOOK_ACTION_REMOVE_OPEN", bookKey: "source-youshu::long-night" });
  const start = api.bookshelf.executeSingleRemove({ delay: 5 });
  const duplicate = await api.bookshelf.executeSingleRemove({ delay: 0 });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.reason, "empty-or-loading");
  assert.equal((await start).ok, true);
  assert.ok(Array.from(api.bookshelf.getState().removedBookKeys).includes("source-youshu::long-night"));
  const shelf = api.bookshelfV2(fixture, "bookshelf", {});
  assert.doesNotMatch(shelf, /data-book-id="long-night"/);
  assert.match(shelf, /fd-continue-card[\s\S]*data-book-id="mystery-lord"/);
  assert.doesNotMatch(shelf, /group-management|book-batch-management/);
});

test("Continue reading disappears once no shelf book remains", async () => {
  const api = fresh();
  api.bookshelf.dispatch({ type: "MULTI_SELECT_OPEN", bookKey: "source-youshu::long-night" });
  api.bookshelf.dispatch({ type: "MULTI_SELECT_SET_ALL", bookKeys: ["source-youshu::long-night", "source-youshu::mystery-lord", "source-youshu::three-body"] });
  api.bookshelf.dispatch({ type: "MULTI_SELECT_REMOVE_OPEN" });
  assert.equal((await api.bookshelf.executeBatchRemove({ delay: 1 })).ok, true);
  const shelf = api.bookshelfV2(fixture, "bookshelf", {});
  assert.doesNotMatch(shelf, /fd-continue-card/);
});

test("Multi-select controls are mapped business identities", () => {
  const source = read("control-identity-declarations.js");
  for (const key of ["book-action-multi-select", "book-action-info", "book-action-remove", "multi-select-exit", "multi-select-all", "multi-select-remove", "multi-select-source-youshu--long-night"]) {
    assert.match(source, new RegExp(`"settingsKey": "${key}"`));
  }
});
