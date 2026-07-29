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
const cssSource = read("styles/09-import-workflow.css");
const fixture = {
  covers: {},
  mainTabs: {
    books: [
      {
        sourceId: "source-youshu",
        bookId: "long-night",
        title: "长夜余火",
        author: "爱潜水的乌贼",
        chapter: "第一章",
        coverKey: "longNight"
      }
    ]
  }
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

test("R2a local import exposes only the confirmed three-state controls", () => {
  const sandbox = { module: { exports: {} }, window: {} };
  new vm.Script(declarationSource).runInNewContext(sandbox);
  const keys = sandbox.module.exports.CANONICAL_CONTROL_DECLARATIONS
    .filter((entry) => entry.source === "bookshelf-action")
    .map((entry) => entry.settingsKey);
  for (const key of [
    "empty-local-import",
    "retry-local-import",
    "import-backdrop",
    "import-choose-files",
    "import-cancel",
    "import-finish"
  ]) {
    assert.ok(keys.includes(key), `missing ${key}`);
  }
  assert.equal(keys.includes("import-retry-failed"), false);
});

test("selection state is the confirmed Bookshelf dialog with a system multi-file input", () => {
  const api = fresh();
  api.bookshelf.dispatch({ type: "LOCAL_IMPORT_OPEN", focusReturnKey: "top-more" });
  const html = api.bookshelfV2(fixture, "bookshelf", {});
  assert.match(html, /class="fd-local-import-dialog is-selection" role="dialog" aria-modal="true"/);
  assert.match(html, /<h2 id="fd-local-import-title">导入本地书籍<\/h2>/);
  assert.match(html, /从系统文件中选择/);
  assert.match(html, /支持多选 TXT、EPUB 文件/);
  assert.match(html, /data-local-import-file-input multiple accept="\.txt,\.epub,text\/plain,application\/epub\+zip"/);
  assert.doesNotMatch(html, /PDF|MOBI|最多 50|导入设置|分组/);
});

test("Bookshelf entry controls open the dialog instead of routing to a standalone import page", () => {
  const api = fresh();
  const bookshelf = api.bookshelfV2(fixture, "bookshelf", {});
  const empty = api.bookshelfEmptyV2(fixture, "bookshelf-empty", {});
  assert.match(bookshelf, /data-settings-key="more-local-import"[^>]*data-local-import-open/);
  assert.match(empty, /data-settings-key="empty-local-import"[^>]*data-local-import-open/);
  assert.doesNotMatch(bookshelf + empty, /data-route="local-import"/);
});

test("importing state contains one spinner and no progress, filenames, result or cancel action", () => {
  const api = fresh();
  api.bookshelf.dispatch({ type: "LOCAL_IMPORT_OPEN" });
  api.bookshelf.dispatch({
    type: "LOCAL_IMPORT_START",
    batchId: 7,
    files: [
      { id: "book-a", name: "三体.epub", extension: "epub", status: "processing", settleStatus: "success" },
      { id: "book-b", name: "活着.txt", extension: "txt", status: "processing", settleStatus: "success" }
    ]
  });
  const html = api.bookshelfV2(fixture, "bookshelf", {});
  assert.match(html, /class="fd-local-import-dialog is-importing" role="dialog" aria-modal="true" aria-label="正在导入"/);
  assert.equal((html.match(/fd-local-import-spinner-halo/g) || []).length, 1);
  assert.match(html, /<strong>正在导入<\/strong>[\s\S]*<small>请稍候<\/small>/);
  assert.doesNotMatch(html, /progress|%|三体\.epub|活着\.txt|data-local-import-cancel|导入结果/);
});

test("selection transitions continuously to a per-book success/failure result", async () => {
  const api = fresh();
  api.bookshelf.dispatch({ type: "LOCAL_IMPORT_OPEN" });
  const files = [
    { name: "长夜余火.epub" },
    { name: "诡秘之主.epub" },
    { name: "三体.txt" },
    { name: "活着.epub" },
    { name: "围城.txt" },
    { name: "平凡的世界.epub" },
    { name: "百年孤独.txt" },
    { name: "错误样本.doc" },
    { name: "损坏样本.mobi" }
  ];
  const outcome = await api.bookshelf.executeLocalImport(files, { delay: 0 });
  assert.equal(outcome.ok, true);
  assert.equal(api.bookshelf.getState().localImportPhase, "result");
  const html = api.bookshelfV2(fixture, "bookshelf", {});
  assert.match(html, /class="fd-local-import-dialog is-result"/);
  assert.match(html, /<h2 id="fd-local-import-title">导入结果<\/h2>/);
  assert.match(html, /7 本已导入 · 2 本失败/);
  assert.equal((html.match(/fd-local-import-result-row /g) || []).length, 9);
  assert.match(html, /长夜余火\.epub[\s\S]*成功/);
  assert.match(html, /错误样本\.doc[\s\S]*失败/);
  assert.doesNotMatch(html, /格式不支持|失败原因|重试|data-local-import-retry|正在处理|progress/);
});

test("result completion closes the same dialog and restores the invoking control", async () => {
  const api = fresh();
  api.bookshelf.dispatch({ type: "LOCAL_IMPORT_OPEN", focusReturnKey: "empty-local-import" });
  await api.bookshelf.executeLocalImport([{ name: "三体.epub" }], { delay: 0 });
  api.bookshelf.dispatch({ type: "LOCAL_IMPORT_FINISH" });
  const state = api.bookshelf.getState();
  assert.equal(state.localImportOpen, false);
  assert.equal(state.localImportFiles.length, 0);
  assert.equal(state.focusReturnKey, "empty-local-import");
});

test("the file chooser does not impose an invented fifty-book presentation cap", async () => {
  const api = fresh();
  api.bookshelf.dispatch({ type: "LOCAL_IMPORT_OPEN" });
  const files = Array.from({ length: 64 }, (_, index) => ({ name: `书${index + 1}.epub` }));
  await api.bookshelf.executeLocalImport(files, { delay: 0 });
  assert.equal(api.bookshelf.getState().localImportFiles.length, 64);
});

test("VC3 local import geometry and scrolling match the three current Figma states", () => {
  assert.match(cssSource, /\.fd-local-import-backdrop[\s\S]*background: rgba\(31, 27, 23, 0\.4\);/);
  assert.doesNotMatch(cssSource, /\.fd-local-import-backdrop[\s\S]*backdrop-filter:/);
  assert.match(cssSource, /\.fd-local-import-dialog\.is-selection[\s\S]*height: 399\.75px;/);
  assert.match(cssSource, /\.fd-local-import-dialog\.is-importing[\s\S]*height: 228px;/);
  assert.match(cssSource, /\.fd-local-import-dialog\.is-result[\s\S]*height: min\(636px, calc\(100% - 40px\)\);/);
  assert.match(cssSource, /\.fd-local-import-result-list[\s\S]*height: 410px;[\s\S]*overflow: auto;/);
  assert.match(cssSource, /\.fd-local-import-result-row \{[\s\S]*min-height: 61px;/);
  assert.match(cssSource, /\.fd-local-import-spinner-halo > i[\s\S]*animation: fd-local-import-spin 0\.9s linear infinite;/);
  assert.doesNotMatch(cssSource, /fd-local-import-progress|fd-local-import-row-progress/);
});

test("R3a browser wiring opens a real multi-file chooser and handles change", () => {
  assert.match(runtimeSource, /\[data-local-import-file-input\]/);
  assert.match(runtimeSource, /Array\.from\(input\.files \|\| \[\]\)/);
  assert.match(runtimeSource, /executeLocalImport/);
});

test("retired full-page local import cannot be called through the public renderer", () => {
  const api = fresh();
  assert.equal("localImportV2" in api, false);
  assert.doesNotMatch(rendererSource, /function localImportV2|fd-import-card|导入设置|确认导入/);
  assert.match(runtimeSource, /local-import route is retired: open the canonical in-place local import dialog/);
});
