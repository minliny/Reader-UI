import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { installFigmaRouteAdmissionVm } from "./helpers/figma-route-admission-vm.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const runtimeSource = read("render-runtime.js");

const fixture = {
  covers: { remote: "remote.png", local: "local.png" },
  mainTabs: {
    books: [
      { bookId: "shared-id", sourceId: "source-youshu", title: "远程同名书", author: "远程作者", chapter: "远程章节", coverKey: "remote" },
      { bookId: "shared-id", sourceId: "local", title: "本地同名书", author: "本地作者", chapter: "本地章节", coverKey: "local" },
      { bookId: "author-looks-local", sourceId: "source-youshu", title: "远程身份书", author: "本地文档", chapter: "第一章", coverKey: "remote" },
      { bookId: "explicit-local", sourceId: "local", title: "显式本地书", author: "远程作者", chapter: "第一章", coverKey: "local" }
    ]
  },
  library: {
    book: {
      bookId: "shared-id", sourceId: "source-youshu", title: "远程同名书", author: "远程作者",
      source: "优书网 · 刚刚更新", latest: "远程章节", coverKey: "remote"
    },
    chapters: [
      { title: "第 30 章 旧日", markers: ["已缓存"] },
      { title: "第 31 章 归途", markers: ["书签"] },
      { title: "第 32 章 雨夜", markers: [] },
      { title: "第 33 章 灯塔", markers: [] }
    ]
  }
};

function fresh() {
  const window = { localStorage: { getItem() { return null; }, setItem() {} } };
  const ctx = vm.createContext({ window, module: { exports: {} }, Promise, setTimeout, JSON, Map });
  installFigmaRouteAdmissionVm(ctx, root);
  for (const file of ["shared-shell-kit/kit.js", "control-identity-declarations.js", "renderers/d2-bookshelf-discover-renderers.js"]) {
    new vm.Script(read(file), { filename: file }).runInContext(ctx);
  }
  return window.ReaderD2BookshelfDiscoverRenderers;
}

test("local classification uses only explicit sourceId, never author/title text", () => {
  const html = fresh().bookshelfV2(fixture, "bookshelf", {});
  assert.match(html, /data-book-id="author-looks-local" data-book-source-id="source-youshu"[^>]+data-book-source-type="network"/);
  assert.match(html, /data-book-id="explicit-local" data-book-source-id="local"[^>]+data-book-source-type="local"/);
});

test("Book Detail resolves the exact (sourceId, bookId) pair rather than the fixed remote fixture", () => {
  const api = fresh();
  const local = api.bookDetailV2(fixture, "book-detail", { selectedBookContext: { sourceId: "local", bookId: "shared-id" } });
  assert.match(local, /本地同名书/);
  assert.doesNotMatch(local, /更换书源|data-book-detail-source|data-route="source-switch"/);

  const remote = api.bookDetailV2(fixture, "book-detail", { selectedBookContext: { sourceId: "source-youshu", bookId: "shared-id" } });
  assert.match(remote, /远程同名书/);
  assert.match(remote, /更换书源/);
  assert.match(remote, /data-book-detail-source="优书网"/);
});

test("local Book Detail and directory error states do not expose stale source switching", () => {
  const api = fresh();
  api.bookDetail.dispatch({ type: "VIEW_STATE_SET", value: "no-toc" });
  const localContext = { selectedBookContext: { sourceId: "local", bookId: "shared-id" } };
  const detail = api.bookDetailV2(fixture, "book-detail", localContext);
  const directory = api.bookDirectoryV2(fixture, "book-directory", localContext);
  assert.doesNotMatch(detail, /data-route="source-switch"|切换书源|调试书源|>换源</);
  assert.doesNotMatch(directory, /data-route="source-switch"|>换源</);
});

test("long-press action handoff and route transitions preserve the pair and fail closed for local source switching", () => {
  assert.match(runtimeSource, /const bookSourceId = button\.getAttribute\("data-book-source-id"\) \|\| "";/);
  assert.match(runtimeSource, /action\.setAttribute\("data-book-source-id", bookSourceId\);/);
  assert.match(runtimeSource, /selectedBookContext: null/);
  assert.match(runtimeSource, /setSelectedBookContext\(appState, targetEl\);/);
  assert.match(runtimeSource, /if \(isSourceSwitchRoute\(route\) && isLocalSelectedBook\(appState\)\) \{\s*return;\s*\}/);
  assert.match(runtimeSource, /LOCAL_BOOK_SOURCE_SWITCH_FORBIDDEN/);
});

test("LOCAL_IMPORT_COMPLETE never manufactures a bookshelf entity from a file result", () => {
  const api = fresh();
  api.bookshelf.dispatch({ type: "LOCAL_IMPORT_OPEN", focusReturnKey: "test" });
  api.bookshelf.dispatch({ type: "LOCAL_IMPORT_START", batchId: 1, files: [{ name: "not-core.epub" }] });
  api.bookshelf.dispatch({ type: "LOCAL_IMPORT_COMPLETE", batchId: 1, files: [{ name: "not-core.epub", bookId: "fabricated-id" }] });
  const shelf = api.bookshelfV2(fixture, "bookshelf", {});
  assert.doesNotMatch(shelf, /data-book-item[^>]+data-book-id="fabricated-id"/);
});
