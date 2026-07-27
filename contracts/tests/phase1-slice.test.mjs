// Phase 1 优先链路集成测试：验证 6 个优先 slice 在 fixtures 中的覆盖完整。
// 优先链路（CONTRACT_FIRST_NATIVE_UI_PLAN.md §9 Phase 1）：
//   AppShell、main tabs、bookshelf→reader、reader overlay、session、focus
// 映射到 fixtures 的 _comment 标注 Slice 1-4：
//   Slice 1: AppShell + main tabs
//   Slice 2: Bookshelf -> open book -> reader surface
//   Slice 3: Reader overlay / control dock / reader mode
//   Slice 4: Progress / session / focus / TTS
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACTS_DIR = join(__dirname, "..");
const FIXTURES_DIR = join(CONTRACTS_DIR, "fixtures");

function loadJson(name) {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, `${name}.fixtures.json`), "utf8"));
}

function sliceOfComment(item) {
  if (!item._comment) return null;
  const m = String(item._comment).match(/Slice\s+(\d)/i);
  return m ? `Slice ${m[1]}` : null;
}

// 为 fixtures 列表逐项打 slice 标签：若某项无 _comment，继承前一项的 slice。
function annotateSlice(items) {
  let current = null;
  return items.map((item) => {
    const s = sliceOfComment(item);
    if (s) current = s;
    return { ...item, _slice: current };
  });
}

function countSlice(items) {
  const counts = {};
  for (const item of annotateSlice(items)) {
    if (item._slice) counts[item._slice] = (counts[item._slice] || 0) + 1;
  }
  return counts;
}

function sliceItems(items, slice) {
  return annotateSlice(items).filter((item) => item._slice === slice);
}

const uiStateFixtures = annotateSlice(loadJson("ui-state"));
const uiEventFixtures = annotateSlice(loadJson("ui-event"));
const viewStateFixtures = annotateSlice(loadJson("view-state"));
const routeFixtures = loadJson("route");

// sliceOf 读取 annotateSlice 注入的 _slice 字段
function sliceOf(item) {
  return item._slice || null;
}

// --- Slice 覆盖完整性 ---

test("ui-state fixtures 覆盖 Slice 1-6", () => {
  const counts = countSlice(uiStateFixtures);
  for (const s of ["Slice 1", "Slice 2", "Slice 3", "Slice 4", "Slice 5", "Slice 6"]) {
    assert.ok((counts[s] || 0) > 0, `ui-state fixtures 缺少 ${s}`);
  }
});

test("ui-event fixtures 覆盖 Slice 1-6", () => {
  const counts = countSlice(uiEventFixtures);
  for (const s of ["Slice 1", "Slice 2", "Slice 3", "Slice 4", "Slice 5", "Slice 6"]) {
    assert.ok((counts[s] || 0) > 0, `ui-event fixtures 缺少 ${s}`);
  }
});

test("view-state fixtures 覆盖 Slice 1-6", () => {
  const counts = countSlice(viewStateFixtures);
  for (const s of ["Slice 1", "Slice 2", "Slice 3", "Slice 4", "Slice 5", "Slice 6"]) {
    assert.ok((counts[s] || 0) > 0, `view-state fixtures 缺少 ${s}`);
  }
});

// --- 优先链路 1: AppShell ---

test("优先链路 AppShell: route.fixtures 含 app-shell / main-tabs / global-loading / global-error", () => {
  const ids = new Set(routeFixtures.map((r) => r.id));
  for (const id of ["app-shell", "main-tabs", "global-loading", "global-error", "global-empty"]) {
    assert.ok(ids.has(id), `route fixtures 缺少 AppShell 路由：${id}`);
  }
});

test("优先链路 AppShell: ui-state fixtures 至少有一个 Slice 1 AppShell 状态", () => {
  const appShellStates = uiStateFixtures.filter(
    (s) => sliceOf(s) === "Slice 1" && s.route && s.route.id === "app-shell"
  );
  assert.ok(appShellStates.length > 0, "ui-state 缺少 AppShell 启动状态");
});

test("优先链路 AppShell: view-state fixtures 至少有一个 Slice 1 AppShell 视图", () => {
  const appShellViews = viewStateFixtures.filter(
    (v) => sliceOf(v) === "Slice 1" && (v.routeId === "app-shell" || v.routeId === "main-tabs")
  );
  assert.ok(appShellViews.length > 0, "view-state 缺少 AppShell 视图");
});

// --- 优先链路 2: main tabs ---

test("优先链路 main tabs: route.fixtures 含 4 个主 Tab 路由", () => {
  const ids = new Set(routeFixtures.map((r) => r.id));
  for (const id of ["bookshelf", "discover", "rss", "settings"]) {
    assert.ok(ids.has(id), `route fixtures 缺少主 Tab 路由：${id}`);
  }
});

test("优先链路 main tabs: ui-state fixtures 覆盖 4 个主 Tab", () => {
  const tabStates = uiStateFixtures.filter((s) => sliceOf(s) === "Slice 1").map((s) => s.tab);
  for (const tab of ["bookshelf", "discover", "rss", "settings"]) {
    assert.ok(tabStates.includes(tab), `ui-state Slice 1 缺少 tab=${tab}`);
  }
});

test("优先链路 main tabs: view-state fixtures 覆盖 4 个主 Tab 首页", () => {
  const viewRoutes = viewStateFixtures
    .filter((v) => sliceOf(v) === "Slice 1")
    .map((v) => v.routeId);
  for (const id of ["bookshelf", "discover", "rss", "settings"]) {
    assert.ok(viewRoutes.includes(id), `view-state Slice 1 缺少 routeId=${id}`);
  }
});

// --- 优先链路 3: bookshelf → reader ---

test("优先链路 bookshelf→reader: route.fixtures 含 bookshelf → book-detail → reader 路径", () => {
  const ids = new Set(routeFixtures.map((r) => r.id));
  for (const id of ["bookshelf", "book-detail", "book-search", "reader", "immersive-reading"]) {
    assert.ok(ids.has(id), `route fixtures 缺少 bookshelf→reader 链路路由：${id}`);
  }
});

test("优先链路 bookshelf→reader: ui-state Slice 2 含 book-detail 和 reader 状态", () => {
  const slice2 = uiStateFixtures.filter((s) => sliceOf(s) === "Slice 2");
  const routeIds = slice2.map((s) => s.route && s.route.id).filter(Boolean);
  assert.ok(routeIds.includes("book-detail"), "ui-state Slice 2 缺少 book-detail 状态");
  assert.ok(routeIds.includes("reader") || routeIds.includes("immersive-reading"),
    "ui-state Slice 2 缺少 reader 状态");
});

test("优先链路 bookshelf→reader: view-state Slice 2 含 book-detail 和 reader 视图", () => {
  const slice2 = viewStateFixtures.filter((v) => sliceOf(v) === "Slice 2");
  const routeIds = slice2.map((v) => v.routeId);
  assert.ok(routeIds.includes("book-detail"), "view-state Slice 2 缺少 book-detail 视图");
  assert.ok(routeIds.includes("reader") || routeIds.includes("immersive-reading"),
    "view-state Slice 2 缺少 reader 视图");
});

test("优先链路 bookshelf→reader: ui-event Slice 2 含 openBook / pageNext 类事件", () => {
  const slice2Events = uiEventFixtures
    .filter((e) => sliceOf(e) === "Slice 2")
    .map((e) => e.type);
  const hasOpen = slice2Events.some((t) => /book|open|reader|page/i.test(t));
  assert.ok(hasOpen, "ui-event Slice 2 缺少 openBook / reader / page 类事件");
});

// --- 优先链路 4: reader overlay ---

test("优先链路 reader overlay: route.fixtures 含 reader overlay 路由", () => {
  const ids = new Set(routeFixtures.map((r) => r.id));
  const overlayRoutes = [
    "reader-appearance-overlay-v2",
    "reader-tts-overlay-v2",
    "reader-settings-overlay-v2",
    "reader-search-overlay-v2",
    "reader-replace-overlay-v2",
    "reader-directory-overlay-v2",
    "reader-auto-scroll-overlay-v2",
    "reader-night-state-v2",
  ];
  let hit = 0;
  for (const id of overlayRoutes) if (ids.has(id)) hit++;
  assert.ok(hit >= 4, `route fixtures 至少覆盖 4 个 reader overlay 路由，实际 ${hit}`);
});

test("优先链路 reader overlay: ui-state Slice 3 含 overlay 非空状态", () => {
  const slice3 = uiStateFixtures.filter((s) => sliceOf(s) === "Slice 3" && s.overlay);
  assert.ok(slice3.length >= 4, `ui-state Slice 3 至少 4 个 overlay 状态，实际 ${slice3.length}`);
});

test("优先链路 reader overlay: ui-event Slice 3 含 overlay 开关事件", () => {
  const slice3Events = uiEventFixtures
    .filter((e) => sliceOf(e) === "Slice 3")
    .map((e) => e.type);
  // Slice 3 overlay 事件约定：含 overlay 字样，或 .open/.close/.toggle 后缀
  const overlayEvents = slice3Events.filter(
    (t) => /overlay/i.test(t) || /\.(open|close|toggle)$/.test(t)
  );
  assert.ok(overlayEvents.length >= 4, `ui-event Slice 3 至少 4 个 overlay 开关事件，实际 ${overlayEvents.length}`);
});

test("优先链路 reader overlay: view-state Slice 3 含 overlay 组件", () => {
  const slice3 = viewStateFixtures.filter((v) => sliceOf(v) === "Slice 3");
  assert.ok(slice3.length >= 4, `view-state Slice 3 至少 4 个 overlay 视图，实际 ${slice3.length}`);
});

// --- 优先链路 5: session ---

test("优先链路 session: ui-state fixtures 含 activeSession 非空状态", () => {
  const sessionStates = uiStateFixtures.filter((s) => s.activeSession);
  assert.ok(sessionStates.length > 0, "ui-state 缺少 activeSession 非空状态");
  const sessions = new Set(sessionStates.map((s) => s.activeSession));
  for (const ses of ["reading", "tts", "auto-page"]) {
    assert.ok(sessions.has(ses), `ui-state 缺少 activeSession=${ses}`);
  }
});

test("优先链路 session: ui-event Slice 4 含 TTS / auto-page / control-space session 事件", () => {
  const slice4Events = uiEventFixtures
    .filter((e) => sliceOf(e) === "Slice 4")
    .map((e) => e.type);
  const hasTts = slice4Events.some((t) => /tts/i.test(t));
  const hasAutoPage = slice4Events.some((t) => /auto.?page/i.test(t));
  assert.ok(hasTts, "ui-event Slice 4 缺少 TTS 事件");
  assert.ok(hasAutoPage, "ui-event Slice 4 缺少 auto-page 事件");
});

// --- 优先链路 6: focus ---

test("优先链路 focus: ui-state fixtures 含 focusTarget 非空状态", () => {
  const focusStates = uiStateFixtures.filter((s) => s.focusTarget);
  assert.ok(focusStates.length > 0, "ui-state 缺少 focusTarget 非空状态");
});

test("优先链路 focus: ui-event Slice 4 含 focus / textSelection 类事件", () => {
  const slice4Events = uiEventFixtures
    .filter((e) => sliceOf(e) === "Slice 4")
    .map((e) => e.type);
  // Slice 4 focus 实现：focus 字样或 textSelection / controlSpaceEnter 等 focus 转移事件
  const focusEvents = slice4Events.filter(
    (t) => /focus|textSelection|controlSpace|slider\.drag/i.test(t)
  );
  assert.ok(focusEvents.length > 0, "ui-event Slice 4 缺少 focus / textSelection 类事件");
});

// --- Slice 之间状态过渡连续性 ---

test("Slice 1 → Slice 2 过渡: bookshelf 出现在 Slice 1 和 Slice 2", () => {
  const slice1Routes = viewStateFixtures
    .filter((v) => sliceOf(v) === "Slice 1")
    .map((v) => v.routeId);
  const slice2Routes = viewStateFixtures
    .filter((v) => sliceOf(v) === "Slice 2")
    .map((v) => v.routeId);
  assert.ok(slice1Routes.includes("bookshelf"), "Slice 1 缺少 bookshelf 视图作为 Slice 2 入口");
  assert.ok(slice2Routes.includes("book-detail") || slice2Routes.includes("book-search"),
    "Slice 2 缺少 book-detail / book-search 作为 bookshelf 下钻");
});

test("Slice 2 → Slice 3 过渡: reader 在 Slice 2 出现，Slice 3 在 reader 之上叠加 overlay", () => {
  const slice2HasReader = viewStateFixtures
    .filter((v) => sliceOf(v) === "Slice 2")
    .some((v) => v.routeId === "reader" || v.routeId === "immersive-reading");
  assert.ok(slice2HasReader, "Slice 2 缺少 reader 视图作为 Slice 3 overlay 宿主");

  const slice3Overlays = uiStateFixtures
    .filter((s) => sliceOf(s) === "Slice 3" && s.overlay)
    .map((s) => s.overlay);
  assert.ok(slice3Overlays.length > 0, "Slice 3 缺少 overlay 状态");
});

test("Slice 3 → Slice 4 过渡: Slice 4 含 session/focus 状态（在 reader 内继续）", () => {
  const slice4States = uiStateFixtures.filter((s) => sliceOf(s) === "Slice 4");
  assert.ok(slice4States.length > 0, "Slice 4 缺少 ui-state");
  const hasSessionOrFocus = slice4States.some(
    (s) => s.activeSession != null || s.focusTarget != null
  );
  assert.ok(hasSessionOrFocus, "Slice 4 缺少 activeSession / focusTarget 状态");
});

// --- 链路完整性：route fixtures 覆盖 6 个优先链路的关键节点 ---

test("route fixtures 覆盖 6 个优先链路关键节点", () => {
  const ids = new Set(routeFixtures.map((r) => r.id));
  const required = [
    "app-shell", "main-tabs",          // AppShell
    "bookshelf", "discover", "rss", "settings", // main tabs
    "book-detail", "reader",           // bookshelf → reader
    "reader-appearance-overlay-v2",    // reader overlay（至少一个 overlay 路由）
    "tts",                             // session（TTS）
    "reader-settings",                 // focus 相关
  ];
  for (const id of required) {
    assert.ok(ids.has(id), `route fixtures 缺少优先链路节点：${id}`);
  }
});

// --- 优先链路 5: RSS / source / search ---

test("优先链路 RSS: route.fixtures 含 RSS 链路关键节点", () => {
  const ids = new Set(routeFixtures.map((r) => r.id));
  for (const id of ["rss", "rss-all", "rss-detail", "rss-original", "rss-refreshing"]) {
    assert.ok(ids.has(id), `route fixtures 缺少 RSS 链路节点：${id}`);
  }
});

test("优先链路 RSS: ui-state Slice 5 含 rss-detail / rss-original 状态", () => {
  const slice5 = uiStateFixtures.filter((s) => sliceOf(s) === "Slice 5");
  const routeIds = slice5.map((s) => s.route && s.route.id).filter(Boolean);
  assert.ok(routeIds.includes("rss-detail"), "ui-state Slice 5 缺少 rss-detail 状态");
  assert.ok(routeIds.includes("rss-original"), "ui-state Slice 5 缺少 rss-original 状态");
});

test("优先链路 RSS: ui-event Slice 5 含 rss.refresh / rss.entry.open", () => {
  const slice5Events = uiEventFixtures
    .filter((e) => sliceOf(e) === "Slice 5")
    .map((e) => e.type);
  assert.ok(slice5Events.includes("rss.refresh"), "ui-event Slice 5 缺少 rss.refresh");
  assert.ok(slice5Events.includes("rss.entry.open"), "ui-event Slice 5 缺少 rss.entry.open");
});

test("优先链路 source 搜索: route.fixtures 含搜索链路", () => {
  const ids = new Set(routeFixtures.map((r) => r.id));
  for (const id of ["search-home", "search-results", "search-loading", "search-empty"]) {
    assert.ok(ids.has(id), `route fixtures 缺少搜索链路节点：${id}`);
  }
});

test("优先链路 source 搜索: ui-state Slice 5 含 search-home / search-results / search-loading", () => {
  const slice5 = uiStateFixtures.filter((s) => sliceOf(s) === "Slice 5");
  const routeIds = slice5.map((s) => s.route && s.route.id).filter(Boolean);
  assert.ok(routeIds.includes("search-home"), "ui-state Slice 5 缺少 search-home");
  assert.ok(routeIds.includes("search-results"), "ui-state Slice 5 缺少 search-results");
  assert.ok(routeIds.includes("search-loading"), "ui-state Slice 5 缺少 search-loading");
});

test("优先链路 source 搜索: ui-event Slice 5 含 search.submit / search.clear", () => {
  const slice5Events = uiEventFixtures
    .filter((e) => sliceOf(e) === "Slice 5")
    .map((e) => e.type);
  assert.ok(slice5Events.includes("search.submit"), "ui-event Slice 5 缺少 search.submit");
  assert.ok(slice5Events.includes("search.clear"), "ui-event Slice 5 缺少 search.clear");
});

test("优先链路 source 换源: ui-event Slice 5 含 source.switch.open / select / confirm / cancel", () => {
  const slice5Events = uiEventFixtures
    .filter((e) => sliceOf(e) === "Slice 5")
    .map((e) => e.type);
  for (const t of ["source.switch.open", "source.switch.select", "source.switch.confirm", "source.switch.cancel"]) {
    assert.ok(slice5Events.includes(t), `ui-event Slice 5 缺少 ${t}`);
  }
});

test("优先链路 source 换源: view-state Slice 5 含 source-switch-results 视图", () => {
  const slice5 = viewStateFixtures.filter((v) => sliceOf(v) === "Slice 5");
  const routeIds = slice5.map((v) => v.routeId);
  assert.ok(routeIds.includes("source-switch-results"), "view-state Slice 5 缺少 source-switch-results");
});

// --- 优先链路 6: Sync / conflict / offline ---

test("优先链路 sync: route.fixtures 含 sync 链路关键节点", () => {
  const ids = new Set(routeFixtures.map((r) => r.id));
  for (const id of ["sync-backup", "webdav-config", "restore-scopes", "restore-running", "restore-result", "sync-error"]) {
    assert.ok(ids.has(id), `route fixtures 缺少 sync 链路节点：${id}`);
  }
});

test("优先链路 sync: ui-state Slice 6 含 sync-backup / restore-running / sync-error", () => {
  const slice6 = uiStateFixtures.filter((s) => sliceOf(s) === "Slice 6");
  const routeIds = slice6.map((s) => s.route && s.route.id).filter(Boolean);
  assert.ok(routeIds.includes("sync-backup"), "ui-state Slice 6 缺少 sync-backup");
  assert.ok(routeIds.includes("restore-running"), "ui-state Slice 6 缺少 restore-running");
  assert.ok(routeIds.includes("sync-error"), "ui-state Slice 6 缺少 sync-error");
});

test("优先链路 sync: ui-event Slice 6 含 sync.run / sync.resolveConflict / webdav.config.save", () => {
  const slice6Events = uiEventFixtures
    .filter((e) => sliceOf(e) === "Slice 6")
    .map((e) => e.type);
  assert.ok(slice6Events.includes("sync.run"), "ui-event Slice 6 缺少 sync.run");
  assert.ok(slice6Events.includes("sync.resolveConflict"), "ui-event Slice 6 缺少 sync.resolveConflict");
  assert.ok(slice6Events.includes("webdav.config.save"), "ui-event Slice 6 缺少 webdav.config.save");
});

test("优先链路 sync: ui-event Slice 6 含 restore.run / restore.cancel / restore.scopes.select", () => {
  const slice6Events = uiEventFixtures
    .filter((e) => sliceOf(e) === "Slice 6")
    .map((e) => e.type);
  for (const t of ["restore.run", "restore.cancel", "restore.scopes.select"]) {
    assert.ok(slice6Events.includes(t), `ui-event Slice 6 缺少 ${t}`);
  }
});

test("优先链路 sync: view-state Slice 6 含 sync-backup / restore-result / sync-error 视图", () => {
  const slice6 = viewStateFixtures.filter((v) => sliceOf(v) === "Slice 6");
  const routeIds = slice6.map((v) => v.routeId);
  assert.ok(routeIds.includes("sync-backup"), "view-state Slice 6 缺少 sync-backup");
  assert.ok(routeIds.includes("restore-result"), "view-state Slice 6 缺少 restore-result");
  assert.ok(routeIds.includes("sync-error"), "view-state Slice 6 缺少 sync-error");
});

test("优先链路 sync: ui-state Slice 6 sync-error 含错误码 SYNC_CONFLICT", () => {
  const syncErrorStates = uiStateFixtures.filter(
    (s) => sliceOf(s) === "Slice 6" && s.route && s.route.id === "sync-error"
  );
  assert.ok(syncErrorStates.length > 0, "ui-state Slice 6 缺少 sync-error 状态");
  assert.ok(syncErrorStates[0].error && syncErrorStates[0].error.code === "SYNC_CONFLICT",
    "sync-error 状态缺少 error.code=SYNC_CONFLICT");
});

// --- Slice 5 → Slice 6 过渡 ---

test("Slice 5 → Slice 6 过渡: Slice 5 source 搜索与 Slice 6 sync 互不冲突", () => {
  const slice5Routes = viewStateFixtures
    .filter((v) => sliceOf(v) === "Slice 5")
    .map((v) => v.routeId);
  const slice6Routes = viewStateFixtures
    .filter((v) => sliceOf(v) === "Slice 6")
    .map((v) => v.routeId);
  assert.ok(slice5Routes.includes("search-results"), "Slice 5 缺少 search-results");
  assert.ok(slice6Routes.includes("sync-backup"), "Slice 6 缺少 sync-backup");
  // source 搜索与 sync 是独立链路，不应在同一 slice 内同时出现
  assert.ok(!slice5Routes.includes("sync-backup"), "Slice 5 不应包含 sync-backup");
  assert.ok(!slice6Routes.includes("search-results"), "Slice 6 不应包含 search-results");
});
