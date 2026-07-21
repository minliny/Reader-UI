import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const declarationSource = read("control-identity-declarations.js");
const rendererSource = read("renderers/d2-bookshelf-discover-renderers.js");
const runtimeSource = read("render-runtime.js");
const fixture = {
  covers: {},
  mainTabs: { books: [{ bookId: "long-night", title: "长夜余火", author: "爱潜水的乌贼", chapter: "第一章", coverKey: "longNight" }] }
};

function fresh() {
  const window = {
    localStorage: { getItem() { return null; }, setItem() {} },
    ReaderShellKit: {
      icon: (name) => `<i data-icon="${name}"></i>`,
      renderMainTabShell: (config) => `${config.contentHtml || ""}${config.stateHostHtml || ""}`,
      renderSettingsShell: (config) => config.contentHtml || "",
      renderLibraryShell: (config) => `${config.contentHtml || ""}${config.stateHostHtml || ""}`
    }
  };
  const context = vm.createContext({ window, module: { exports: {} }, Promise, setTimeout, JSON, Number, Array, String, Math });
  new vm.Script(declarationSource).runInContext(context);
  new vm.Script(rendererSource).runInContext(context);
  return window.ReaderD2BookshelfDiscoverRenderers;
}

test("R2a local import adds seven mapped business identities", () => {
  const sandbox = { module: { exports: {} }, window: {} };
  new vm.Script(declarationSource).runInNewContext(sandbox);
  const keys = sandbox.module.exports.CANONICAL_CONTROL_DECLARATIONS
    .filter((entry) => entry.source === "bookshelf-action")
    .map((entry) => entry.settingsKey);
  for (const key of ["empty-local-import", "retry-local-import", "import-backdrop", "import-choose-files", "import-cancel", "import-finish", "import-retry-failed"]) {
    assert.ok(keys.includes(key), `missing ${key}`);
  }
});

test("Figma Make picker is a dialog on Bookshelf with a multiple file input", () => {
  const api = fresh();
  api.bookshelf.dispatch({ type: "LOCAL_IMPORT_OPEN", focusReturnKey: "top-more" });
  const html = api.bookshelfV2(fixture, "bookshelf", {});
  assert.match(html, /class="fd-local-import-dialog is-picker" role="dialog" aria-modal="true"/);
  assert.match(html, /<h2 id="fd-local-import-title">导入本地书籍<\/h2>/);
  assert.match(html, /data-local-import-file-input multiple accept="\.epub,\.pdf,\.txt,\.mobi/);
  assert.match(html, /支持批量选择，单次最多 50 本/);
});

test("Bookshelf entry controls open the dialog instead of routing to a standalone import page", () => {
  const api = fresh();
  const bookshelf = api.bookshelfV2(fixture, "bookshelf", {});
  const empty = api.bookshelfEmptyV2(fixture, "bookshelf-empty", {});
  assert.match(bookshelf, /data-settings-key="more-local-import" data-local-import-open/);
  assert.match(empty, /data-settings-key="empty-local-import" data-local-import-open/);
  assert.doesNotMatch(bookshelf + empty, /data-route="local-import"/);
});

test("R2b selection transitions continuously into a result list", async () => {
  const api = fresh();
  api.bookshelf.dispatch({ type: "LOCAL_IMPORT_OPEN" });
  const outcome = await api.bookshelf.executeLocalImport([
    { name: "活着.epub", size: 1258291 },
    { name: "百年孤独.pdf", size: 8493465 },
    { name: "平凡的世界.doc", size: 3565158 }
  ], { delay: 0 });
  assert.equal(outcome.ok, true);
  const state = api.bookshelf.getState();
  assert.equal(state.localImportPhase, "result");
  assert.deepEqual(Array.from(state.localImportFiles, (file) => file.status), ["success", "success", "failed"]);
  const html = api.bookshelfV2(fixture, "bookshelf", {});
  assert.match(html, /<h2 id="fd-local-import-title">导入结果<\/h2>/);
  assert.match(html, /2 本成功，1 本失败/);
  assert.match(html, /活着\.epub/);
  assert.match(html, /格式不支持/);
});

test("R2b processing rows remain in the same dialog and block premature finish", () => {
  const api = fresh();
  api.bookshelf.dispatch({ type: "LOCAL_IMPORT_OPEN" });
  api.bookshelf.dispatch({ type: "LOCAL_IMPORT_START", batchId: 7, files: [{ id: "a", name: "三体.epub", extension: "epub", size: 12, status: "processing", settleStatus: "success" }] });
  const before = api.bookshelf.getState();
  api.bookshelf.dispatch({ type: "LOCAL_IMPORT_FINISH" });
  assert.equal(api.bookshelf.getState(), before);
  const html = api.bookshelfV2(fixture, "bookshelf", {});
  assert.match(html, /1 本正在处理/);
  assert.match(html, /data-local-import-finish disabled aria-disabled="true"/);
});

test("R2b import caps a single selection at fifty files", async () => {
  const api = fresh();
  api.bookshelf.dispatch({ type: "LOCAL_IMPORT_OPEN" });
  await api.bookshelf.executeLocalImport(Array.from({ length: 54 }, (_, index) => ({ name: `书${index}.epub` })), { delay: 0 });
  assert.equal(api.bookshelf.getState().localImportFiles.length, 50);
});

test("R2b cancel invalidates pending async updates and restores the recorded origin", async () => {
  const api = fresh();
  api.bookshelf.dispatch({ type: "LOCAL_IMPORT_OPEN", focusReturnKey: "empty-local-import" });
  const pending = api.bookshelf.executeLocalImport([{ name: "长篇.epub" }], { delay: 5 });
  api.bookshelf.dispatch({ type: "LOCAL_IMPORT_CANCEL" });
  await pending;
  const state = api.bookshelf.getState();
  assert.equal(state.localImportOpen, false);
  assert.equal(state.localImportFiles.length, 0);
  assert.equal(state.focusReturnKey, "empty-local-import");
});

test("R3a result list is scrollable and uses the project icon registry", () => {
  const css = read("styles/09-import-workflow.css");
  assert.match(css, /\.fd-local-import-result-list[\s\S]*max-height: 260px;[\s\S]*overflow: auto;/);
  assert.doesNotMatch(rendererSource, /<svg/);
  assert.match(rendererSource, /icon\("log", "fd-small-icon"\)/);
});

test("R3a browser wiring opens a real multi-file chooser and handles change", () => {
  assert.match(runtimeSource, /\[data-local-import-file-input\]/);
  assert.match(runtimeSource, /Array\.from\(input\.files \|\| \[\]\)/);
  assert.match(runtimeSource, /executeLocalImport/);
});

test("Legacy local-import route renders the Bookshelf dialog rather than the old settings page", () => {
  const html = fresh().localImportV2(fixture, "local-import", {});
  assert.match(html, /fd-local-import-dialog is-picker/);
  assert.doesNotMatch(html, /fd-import-card|导入设置|确认导入/);
});
