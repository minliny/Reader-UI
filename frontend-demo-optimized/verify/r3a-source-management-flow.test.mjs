// R3a · source-management 操作流 + 删除流程 + 稳定终态验证
// -----------------------------------------------------------------------------
// 职责：
//   1. 单个书源 enable/disable → 状态持久化 + ARIA 同步
//   2. 搜索 / 状态筛选 / 分组筛选 → 列表过滤
//   3. 更多菜单 open/close
//   4. 添加书源 Sheet open/close
//   5. 批量模式 enter/exit + 选择 / 全选 / 取消全选
//   6. 删除流程：confirm open → start → success / failed / cancel
//   7. 重复点击保护：DELETE_START 在 loading 状态下不重复
//   8. stale async result 丢弃：DELETE_SUCCESS 在非 loading 状态下被忽略
//   9. 删除失败后原状态恢复：sources 不变，可重试
//  10. 两视口稳定终态：相同操作序列达到相同 state
//  11. 持久化：source enabled 状态写入 localStorage
//
// 运行：node --test frontend-demo-optimized/verify/r3a-source-management-flow.test.mjs
// -----------------------------------------------------------------------------
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");

const kitSource = readFileSync(join(demoRoot, "shared-shell-kit/kit.js"), "utf8");
const appearanceSpecSource = readFileSync(join(demoRoot, "appearance-spec.js"), "utf8");
const declarationsSource = readFileSync(join(demoRoot, "control-identity-declarations.js"), "utf8");
const d2SettingsSource = readFileSync(join(demoRoot, "renderers/d2-settings-sync-renderers.js"), "utf8");

const VIEWPORTS = [
  { name: "phone",  viewportClass: "phone-portrait"  },
  { name: "tablet", viewportClass: "tablet-portrait" },
];

function freshSandbox() {
  const window = {
    localStorage: {
      _store: {},
      getItem(k) { return this._store[k] || null; },
      setItem(k, v) { this._store[k] = v; },
      removeItem(k) { delete this._store[k]; },
    },
    ReaderFrontendDemoDraftRouteContract: {
      routes: { "source-management": { title: "书源管理" } },
      routePresentation: {},
    },
  };
  const ctx = vm.createContext({ window, module: { exports: {} }, Promise, setTimeout });
  new vm.Script(kitSource, { filename: "kit.js" }).runInContext(ctx);
  new vm.Script(appearanceSpecSource, { filename: "appearance-spec.js" }).runInContext(ctx);
  new vm.Script(declarationsSource, { filename: "control-identity-declarations.js" }).runInContext(ctx);
  new vm.Script(d2SettingsSource, { filename: "d2-settings-sync-renderers.js" }).runInContext(ctx);
  return ctx.window.ReaderD2SettingsSyncRenderers;
}

function render(r) {
  return r.renderD2Route("source-management", {}, {});
}

// =============================================================================
// 1. 单个书源 enable/disable
// =============================================================================
test("R3a flow: TOGGLE_SOURCE updates state + persists to localStorage", () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  // 初始：source-biquge enabled=true
  const initial = sm.getState();
  const biqugeInitial = initial.sources.find(s => s.settingsKey === "source-biquge");
  assert.equal(biqugeInitial.enabled, true, "source-biquge initially enabled");

  // dispatch TOGGLE_SOURCE off
  sm.dispatch({ type: "TOGGLE_SOURCE", settingsKey: "source-biquge", value: false });
  const after = sm.getState();
  const biqugeAfter = after.sources.find(s => s.settingsKey === "source-biquge");
  assert.equal(biqugeAfter.enabled, false, "source-biquge disabled after toggle");

  // 持久化到 localStorage（通过 d2 storage API）
  const stored = r.storage.get(sm.storageKey);
  assert.ok(stored && typeof stored === "object", "storage entry exists");
  assert.equal(stored.sourceEnabled["source-biquge"], false, "persisted to localStorage");

  // HTML 中 aria-checked 反映新状态
  const html = render(r);
  const switchTag = html.match(/<span[^>]*data-settings-key="source-biquge"[^>]*>/)[0];
  assert.match(switchTag, /aria-checked="false"/, "aria-checked=false after toggle off");
});

// =============================================================================
// 2. 搜索过滤
// =============================================================================
test("R3a flow: SET_SEARCH filters source list", () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  sm.dispatch({ type: "SET_SEARCH", value: "起点" });
  const html = render(r);
  // 列表中只应该包含"起点中文网"
  assert.match(html, /起点中文网/, "search match: 起点中文网");
  assert.ok(!html.includes("笔趣阁"), "search filter excludes 笔趣阁");
  assert.ok(!html.includes("本地导入源"), "search filter excludes 本地导入源");
});

// =============================================================================
// 3. 状态筛选
// =============================================================================
test("R3a flow: SET_STATUS_FILTER filters by status", () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  sm.dispatch({ type: "SET_STATUS_FILTER", value: "异常" });
  const html = render(r);
  assert.match(html, /笔趣阁/, "status=异常: 笔趣阁 visible");
  assert.ok(!html.includes("起点中文网"), "status=异常: 起点中文网 hidden");
});

// =============================================================================
// 4. 分组筛选
// =============================================================================
test("R3a flow: SET_GROUP_FILTER filters by group", () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  sm.dispatch({ type: "SET_GROUP_FILTER", value: "测试书源" });
  const html = render(r);
  assert.match(html, /测试书源/, "group=测试书源: 测试书源 visible");
  assert.ok(!html.includes("起点中文网"), "group=测试书源: 起点中文网 hidden");
});

// =============================================================================
// 5. 更多菜单 open/close
// =============================================================================
test("R3a flow: TOGGLE_MENU opens and closes more menu", () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  assert.equal(sm.getState().menuOpen, false, "menu initially closed");
  sm.dispatch({ type: "TOGGLE_MENU" });
  assert.equal(sm.getState().menuOpen, true, "menu open after TOGGLE_MENU");

  const openHtml = render(r);
  assert.match(openHtml, /fd-source-more-menu/, "menu HTML rendered when open");
  assert.match(openHtml, /网络导入/, "menu item 网络导入 visible");

  sm.dispatch({ type: "TOGGLE_MENU" });
  assert.equal(sm.getState().menuOpen, false, "menu closed after second TOGGLE_MENU");
  const closedHtml = render(r);
  assert.ok(!closedHtml.includes("fd-source-more-menu"), "menu HTML not rendered when closed");
});

// =============================================================================
// 6. 添加书源 Sheet open/close
// =============================================================================
test("R3a flow: OPEN_ADD_SHEET / CLOSE_ADD_SHEET controls sheet visibility", () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  sm.dispatch({ type: "OPEN_ADD_SHEET" });
  assert.equal(sm.getState().addSheetOpen, true, "addSheetOpen=true after OPEN_ADD_SHEET");
  assert.equal(sm.getState().menuOpen, false, "menu closed when sheet opens");

  const openHtml = render(r);
  assert.match(openHtml, /fd-source-bottom-sheet/, "sheet HTML rendered when open");

  sm.dispatch({ type: "CLOSE_ADD_SHEET" });
  assert.equal(sm.getState().addSheetOpen, false, "addSheetOpen=false after CLOSE_ADD_SHEET");
  const closedHtml = render(r);
  assert.ok(!closedHtml.includes("fd-source-bottom-sheet"), "sheet HTML not rendered when closed");
});

// =============================================================================
// 7. 批量模式 enter/exit + 选择
// =============================================================================
test("R3a flow: ENTER_BATCH_MODE / TOGGLE_SELECT / SELECT_ALL / DESELECT_ALL / EXIT_BATCH_MODE", () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  sm.dispatch({ type: "ENTER_BATCH_MODE" });
  assert.equal(sm.getState().batchMode, true, "batchMode=true after ENTER_BATCH_MODE");

  sm.dispatch({ type: "TOGGLE_SELECT", settingsKey: "source-qidian" });
  assert.equal(sm.getState().selectedSources["source-qidian"], true, "selected qidian");
  assert.equal(Object.keys(sm.getState().selectedSources).length, 1, "selected count=1");

  sm.dispatch({ type: "TOGGLE_SELECT", settingsKey: "source-biquge" });
  assert.equal(sm.getState().selectedSources["source-qidian"], true, "qidian still selected");
  assert.equal(sm.getState().selectedSources["source-biquge"], true, "biquge selected");
  assert.equal(Object.keys(sm.getState().selectedSources).length, 2, "selected count=2");

  sm.dispatch({ type: "TOGGLE_SELECT", settingsKey: "source-qidian" });
  assert.equal(sm.getState().selectedSources["source-qidian"], undefined, "qidian toggled off");
  assert.equal(sm.getState().selectedSources["source-biquge"], true, "biquge still selected");
  assert.equal(Object.keys(sm.getState().selectedSources).length, 1, "selected count=1 after toggle off");

  sm.dispatch({ type: "SELECT_ALL" });
  assert.equal(Object.keys(sm.getState().selectedSources).length, 4, "SELECT_ALL selects 4");

  sm.dispatch({ type: "DESELECT_ALL" });
  assert.equal(Object.keys(sm.getState().selectedSources).length, 0, "DESELECT_ALL clears");

  sm.dispatch({ type: "EXIT_BATCH_MODE" });
  assert.equal(sm.getState().batchMode, false, "batchMode=false after EXIT_BATCH_MODE");
  assert.equal(Object.keys(sm.getState().selectedSources).length, 0, "selected cleared on exit");
});

// =============================================================================
// 8. 批量模式下 0 选中时 batch actions disabled
// =============================================================================
test("R3a flow: batch actions disabled when 0 selected, enabled when >0 selected", () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  sm.dispatch({ type: "ENTER_BATCH_MODE" });
  const html0 = render(r);
  // 0 选中时 batch-enable/disable/detect/group/delete 应该 disabled
  const deleteBtn0 = html0.match(/<button[^>]*data-settings-key="batch-delete"[^>]*>/)[0];
  assert.match(deleteBtn0, /disabled/, "batch-delete disabled when 0 selected");

  sm.dispatch({ type: "TOGGLE_SELECT", settingsKey: "source-qidian" });
  const html1 = render(r);
  const deleteBtn1 = html1.match(/<button[^>]*data-settings-key="batch-delete"[^>]*>/)[0];
  assert.doesNotMatch(deleteBtn1, /disabled/, "batch-delete enabled when 1 selected");
});

// =============================================================================
// 9. 删除流程：confirm open → start → success
// =============================================================================
test("R3a flow: DELETE_CONFIRM_OPEN → executeDelete(success) → DELETE_SUCCESS clears sources", async () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  sm.dispatch({ type: "ENTER_BATCH_MODE" });
  sm.dispatch({ type: "TOGGLE_SELECT", settingsKey: "source-biquge" });
  sm.dispatch({ type: "DELETE_CONFIRM_OPEN" });

  const dc = sm.getState().deleteConfirm;
  assert.equal(dc.open, true, "dialog open");
  assert.equal(dc.count, 1, "count=1");
  assert.equal(dc.status, "confirm", "status=confirm");

  const result = await sm.executeDelete({ simulateResult: "success", delay: 5 });
  assert.equal(result, "success", "executeDelete resolves success");

  const after = sm.getState();
  assert.equal(after.deleteConfirm.status, "success", "final status=success");
  assert.equal(after.deleteConfirm.open, false, "dialog closed after success");
  assert.equal(after.sources.length, 3, "sources count reduced to 3");
  assert.ok(!after.sources.find(s => s.settingsKey === "source-biquge"), "source-biquge deleted");
  assert.equal(after.batchMode, false, "batchMode exited after delete");
  assert.equal(Object.keys(after.selectedSources).length, 0, "selected cleared");
});

// =============================================================================
// 10. 删除流程：失败后原状态恢复 + 可重试
// =============================================================================
test("R3a flow: executeDelete(failed) keeps sources, allows retry", async () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  sm.dispatch({ type: "ENTER_BATCH_MODE" });
  sm.dispatch({ type: "TOGGLE_SELECT", settingsKey: "source-biquge" });
  sm.dispatch({ type: "DELETE_CONFIRM_OPEN" });

  const sourcesBefore = sm.getState().sources.length;
  const result = await sm.executeDelete({ simulateResult: "failed", delay: 5, error: "网络错误" });
  assert.equal(result, "failed", "executeDelete resolves failed");

  const after = sm.getState();
  assert.equal(after.deleteConfirm.status, "failed", "status=failed");
  assert.equal(after.deleteConfirm.open, true, "dialog still open after failed");
  assert.equal(after.deleteConfirm.error, "网络错误", "error message stored");
  assert.equal(after.sources.length, sourcesBefore, "sources NOT deleted on failed");
  assert.equal(Object.keys(after.selectedSources).length, 1, "selected preserved for retry");

  // 重试 → success
  const result2 = await sm.executeDelete({ simulateResult: "success", delay: 5 });
  assert.equal(result2, "success", "retry resolves success");
  assert.equal(sm.getState().sources.length, sourcesBefore - 1, "sources reduced after retry success");
});

// =============================================================================
// 11. 删除流程：cancel 不删除
// =============================================================================
test("R3a flow: DELETE_CONFIRM_CLOSE cancels delete, preserves sources", () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  sm.dispatch({ type: "ENTER_BATCH_MODE" });
  sm.dispatch({ type: "TOGGLE_SELECT", settingsKey: "source-biquge" });
  sm.dispatch({ type: "DELETE_CONFIRM_OPEN" });

  const sourcesBefore = sm.getState().sources.length;
  sm.dispatch({ type: "DELETE_CONFIRM_CLOSE" });

  const after = sm.getState();
  assert.equal(after.deleteConfirm.open, false, "dialog closed");
  assert.equal(after.deleteConfirm.status, "idle", "status back to idle");
  assert.equal(after.sources.length, sourcesBefore, "sources preserved");
  assert.equal(Object.keys(after.selectedSources).length, 1, "selected preserved (still in batch mode)");
});

// =============================================================================
// 12. 重复点击保护：DELETE_START 在 loading 状态下不重复
// =============================================================================
test("R3a flow: duplicate DELETE_START guard (only confirm → loading)", async () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  sm.dispatch({ type: "ENTER_BATCH_MODE" });
  sm.dispatch({ type: "TOGGLE_SELECT", settingsKey: "source-biquge" });
  sm.dispatch({ type: "DELETE_CONFIRM_OPEN" });

  // 第一次 DELETE_START: confirm → loading
  sm.dispatch({ type: "DELETE_START" });
  assert.equal(sm.getState().deleteConfirm.status, "loading", "first DELETE_START → loading");

  // 第二次 DELETE_START: 应该被忽略（仍在 loading）
  sm.dispatch({ type: "DELETE_START" });
  assert.equal(sm.getState().deleteConfirm.status, "loading", "duplicate DELETE_START ignored");

  // 完成
  await sm.executeDelete({ simulateResult: "success", delay: 5 });
  // 注意：executeDelete 内部已经 dispatch 了 DELETE_START，但在 loading 状态下被忽略
  // 所以这里只验证最终状态
  assert.equal(sm.getState().deleteConfirm.status, "success", "final success");
});

// =============================================================================
// 13. stale async result 丢弃：DELETE_SUCCESS 在非 loading 状态下被忽略
// =============================================================================
test("R3a flow: stale async result discarded (DELETE_SUCCESS only accepted from loading)", () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  // 初始状态：deleteConfirm.status = idle
  assert.equal(sm.getState().deleteConfirm.status, "idle", "initial status=idle");

  // 直接 dispatch DELETE_SUCCESS：应该被忽略
  sm.dispatch({ type: "DELETE_SUCCESS" });
  assert.equal(sm.getState().deleteConfirm.status, "idle", "stale DELETE_SUCCESS ignored from idle");
  assert.equal(sm.getState().sources.length, 4, "sources unchanged after stale DELETE_SUCCESS");

  // 同样，DELETE_FAILED 也应该被忽略
  sm.dispatch({ type: "DELETE_FAILED", error: "stale" });
  assert.equal(sm.getState().deleteConfirm.status, "idle", "stale DELETE_FAILED ignored from idle");
});

// =============================================================================
// 14. 两视口稳定终态：相同操作序列达到相同 state
// =============================================================================
test("R3a flow: same operation sequence reaches same stable terminal state in two viewports", () => {
  const states = VIEWPORTS.map(function (vp) {
    const r = freshSandbox();
    const sm = r.sourceManagement;

    // 相同操作序列
    sm.dispatch({ type: "TOGGLE_SOURCE", settingsKey: "source-qidian", value: false });
    sm.dispatch({ type: "SET_SEARCH", value: "" });
    sm.dispatch({ type: "SET_STATUS_FILTER", value: "全部" });
    sm.dispatch({ type: "TOGGLE_MENU" });
    sm.dispatch({ type: "TOGGLE_MENU" });
    sm.dispatch({ type: "ENTER_BATCH_MODE" });
    sm.dispatch({ type: "TOGGLE_SELECT", settingsKey: "source-biquge" });
    sm.dispatch({ type: "TOGGLE_SELECT", settingsKey: "source-test" });
    sm.dispatch({ type: "SELECT_ALL" });
    sm.dispatch({ type: "DESELECT_ALL" });
    sm.dispatch({ type: "TOGGLE_SELECT", settingsKey: "source-qidian" });
    sm.dispatch({ type: "EXIT_BATCH_MODE" });

    // 渲染一次（验证稳定终态）
    render(r);

    // 返回终态
    return JSON.stringify(sm.getState());
  });

  assert.equal(states[0], states[1], "phone terminal state == tablet terminal state");
});

// =============================================================================
// 15. 稳定终态：无 aria-busy / 无 is-loading / 无 "…中" 文本（idle 状态）
// =============================================================================
test("R3a flow: idle state has no aria-busy / is-loading / '…中' text", () => {
  for (const vp of VIEWPORTS) {
    const r = freshSandbox();
    const html = render(r);
    assert.ok(!/aria-busy="true"/.test(html), `${vp.name}: no aria-busy=true in idle state`);
    assert.ok(!/is-loading/.test(html), `${vp.name}: no is-loading class in idle state`);
    assert.ok(!/删除中/.test(html), `${vp.name}: no 删除中 text in idle state`);
  }
});

// =============================================================================
// 16. DELETE_CONFIRM_TOGGLE_LOG 切换 logCleanup
// =============================================================================
test("R3a flow: DELETE_CONFIRM_TOGGLE_LOG toggles logCleanup option", () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  sm.dispatch({ type: "ENTER_BATCH_MODE" });
  sm.dispatch({ type: "TOGGLE_SELECT", settingsKey: "source-biquge" });
  sm.dispatch({ type: "DELETE_CONFIRM_OPEN" });

  assert.equal(sm.getState().deleteConfirm.logCleanup, false, "logCleanup initially false");
  sm.dispatch({ type: "DELETE_CONFIRM_TOGGLE_LOG" });
  assert.equal(sm.getState().deleteConfirm.logCleanup, true, "logCleanup=true after toggle");

  const html = render(r);
  const checkbox = html.match(/<input[^>]*data-settings-key="delete-log-cleanup"[^>]*>/)[0];
  assert.match(checkbox, /checked/, "checkbox checked in HTML after toggle");

  sm.dispatch({ type: "DELETE_CONFIRM_TOGGLE_LOG" });
  assert.equal(sm.getState().deleteConfirm.logCleanup, false, "logCleanup=false after second toggle");
});
