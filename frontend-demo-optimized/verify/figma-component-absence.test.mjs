// Fail-closed checks for component-level Figma absences.
// These exercise the small pure Reader More renderer directly and ensure the
// Source Management final-list renderer cannot reintroduce user-removed Pilot
// component markup through stale state.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");
const runtimeSource = readFileSync(join(demoRoot, "render-runtime.js"), "utf8");
const d2Source = readFileSync(join(demoRoot, "renderers/d2-settings-sync-renderers.js"), "utf8");

function readerMoreFunctionSource() {
  const start = runtimeSource.indexOf("  function readerMoreMenuHtml()");
  const end = runtimeSource.indexOf("\n  function readerTopOverlay", start);
  assert.ok(start >= 0 && end > start, "Reader More pure renderer is present");
  return runtimeSource.slice(start, end);
}

test("Reader More is runtime fail-closed even with stale open state", () => {
  const source = readerMoreFunctionSource();
  const context = vm.createContext({});
  new vm.Script(`${source}\nthis.renderReaderMore = readerMoreMenuHtml;`).runInContext(context);

  assert.equal(context.renderReaderMore({ readerMoreOpen: false }), "");
  assert.equal(context.renderReaderMore({ readerMoreOpen: true }), "");
  assert.doesNotMatch(source, /fd-reader-more-(layer|menu|backdrop)/);
  assert.doesNotMatch(source, /刷新本章|刷新目录|打开来源页|书籍缓存|调试信息/);
});

test("Reader top-bar and interaction handler cannot present a synthetic More menu", () => {
  const topStart = runtimeSource.indexOf("  function readerTopOverlay");
  const topEnd = runtimeSource.indexOf("\n  function readerAutoPageControlHtml", topStart);
  const topOverlay = runtimeSource.slice(topStart, topEnd);
  assert.match(topOverlay, /aria-expanded="false"/);
  assert.match(topOverlay, /readerMoreMenuHtml\(\)/);

  const handlerStart = runtimeSource.indexOf('screenHost.querySelectorAll("[data-reader-more-toggle]")');
  const handlerEnd = runtimeSource.indexOf("\n    screenHost.querySelectorAll", handlerStart + 1);
  const handler = runtimeSource.slice(handlerStart, handlerEnd);
  assert.match(handler, /appState\.readerMoreOpen = false/);
  assert.doesNotMatch(handler, /readerMoreOpen = !appState\.readerMoreOpen/);
});

test("Source Management renderer contains no withdrawn Pilot component markup", () => {
  for (const pattern of [
    /fd-source-more-menu/,
    /fd-source-bottom-sheet/,
    /fd-source-delete-dialog/,
    /fd-source-batch-top/,
    /fd-source-batch-actions/,
    /d2SourceMoreMenu/,
    /d2SourceAddSheet/,
    /d2SourceDeleteDialog/,
    /d2SourceBatchTop/,
    /d2SourceBatchActions/
  ]) {
    assert.doesNotMatch(d2Source, pattern);
  }
  assert.match(d2Source, /D2_SOURCE_MANAGEMENT_RETIRED_VISUAL_ACTIONS/);
  assert.match(d2Source, /figma-visual-unavailable/);
});
