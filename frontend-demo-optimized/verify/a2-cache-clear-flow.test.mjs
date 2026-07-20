// A2 (R2b) · Phase 4: 清缓存流程 5 状态 + 重复点击 guard + DOM 反映
// -----------------------------------------------------------------------------
// 状态机：idle → confirm → loading → success/failed → reset
// 重复点击 guard: loading 状态下 CACHE_CLEAR_START 是 no-op
// DOM 反映: button 的 class / label / aria-busy / disabled / aria-invalid / title
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

function freshSandbox() {
  const window = {
    localStorage: { _store: {}, getItem(k) { return this._store[k] || null; }, setItem(k, v) { this._store[k] = v; }, removeItem(k) { delete this._store[k]; } },
    ReaderFrontendDemoDraftRouteContract: { routes: { "settings-general": { title: "通用设置" } }, routePresentation: {} },
  };
  const ctx = vm.createContext({ window, module: { exports: {} } });
  new vm.Script(kitSource).runInContext(ctx);
  new vm.Script(appearanceSpecSource).runInContext(ctx);
  new vm.Script(declarationsSource).runInContext(ctx);
  new vm.Script(d2SettingsSource).runInContext(ctx);
  return ctx.window.ReaderD2SettingsSyncRenderers;
}

// 从 HTML 提取 cache-cleanup button 的状态信息
function parseCacheClearButton(html) {
  const re = /<button class="(fd-settings-row-action[^"]*)" type="button"([^>]*)>([^<]+)<\/button>/;
  const m = html.match(re);
  if (!m) return null;
  return {
    class: m[1],
    attrs: m[2],
    label: m[3],
    isBusy: m[1].indexOf("is-busy") >= 0,
    isSuccess: m[1].indexOf("is-success") >= 0,
    isFailed: m[1].indexOf("is-failed") >= 0,
    isConfirm: m[1].indexOf("is-confirm") >= 0,
    ariaBusy: m[2].indexOf('aria-busy="true"') >= 0,
    disabled: m[2].indexOf("disabled") >= 0,
    ariaInvalid: m[2].indexOf('aria-invalid="true"') >= 0,
    title: (m[2].match(/title="([^"]*)"/) || [])[1] || null,
  };
}

// =============================================================================
// 1. 初始状态: idle → button 显示 "清理缓存"，无 aria-busy / disabled
// =============================================================================
test("A2 Phase 4: cache-cleanup initial state is idle with default button", () => {
  const r = freshSandbox();
  const html = r.globalSettingsV2({}, "settings-general", {});
  const btn = parseCacheClearButton(html);
  assert.ok(btn, "cache-cleanup button exists");
  assert.equal(btn.label, "清理缓存", "idle label");
  assert.equal(btn.isBusy, false, "idle NOT is-busy");
  assert.equal(btn.ariaBusy, false, "idle NOT aria-busy");
  assert.equal(btn.disabled, false, "idle NOT disabled");
  assert.equal(btn.isFailed, false, "idle NOT is-failed");
  assert.equal(btn.isSuccess, false, "idle NOT is-success");
});

// =============================================================================
// 2. 完整成功路径: idle → confirm → loading → success → reset
// =============================================================================
test("A2 Phase 4: cache-cleanup success path idle → confirm → loading → success → reset", () => {
  const r = freshSandbox();
  const sg = r.settingsGeneral;

  // confirm
  sg.dispatch({ type: "CACHE_CLEAR_CONFIRM" });
  assert.equal(sg.getState().cacheClear.status, "confirm");
  let html = r.globalSettingsV2({}, "settings-general", {});
  let btn = parseCacheClearButton(html);
  assert.equal(btn.isConfirm, true, "confirm state shows is-confirm class");

  // loading
  sg.dispatch({ type: "CACHE_CLEAR_START" });
  assert.equal(sg.getState().cacheClear.status, "loading");
  html = r.globalSettingsV2({}, "settings-general", {});
  btn = parseCacheClearButton(html);
  assert.equal(btn.label, "清理中…", "loading label");
  assert.equal(btn.isBusy, true, "loading is-busy");
  assert.equal(btn.ariaBusy, true, "loading aria-busy=true");
  assert.equal(btn.disabled, true, "loading disabled");

  // success
  sg.dispatch({ type: "CACHE_CLEAR_SUCCESS" });
  assert.equal(sg.getState().cacheClear.status, "success");
  assert.ok(sg.getState().cacheClear.lastClearedAt > 0, "lastClearedAt set");
  html = r.globalSettingsV2({}, "settings-general", {});
  btn = parseCacheClearButton(html);
  assert.equal(btn.label, "已清理", "success label");
  assert.equal(btn.isSuccess, true, "success is-success");

  // reset
  sg.dispatch({ type: "CACHE_CLEAR_RESET" });
  assert.equal(sg.getState().cacheClear.status, "idle");
  html = r.globalSettingsV2({}, "settings-general", {});
  btn = parseCacheClearButton(html);
  assert.equal(btn.label, "清理缓存", "after reset back to idle label");
});

// =============================================================================
// 3. 失败路径: idle → confirm → loading → failed → (reset to idle)
// =============================================================================
test("A2 Phase 4: cache-cleanup failed path with error message", () => {
  const r = freshSandbox();
  const sg = r.settingsGeneral;

  sg.dispatch({ type: "CACHE_CLEAR_CONFIRM" });
  sg.dispatch({ type: "CACHE_CLEAR_START" });
  sg.dispatch({ type: "CACHE_CLEAR_FAILED", error: "磁盘空间不足" });

  assert.equal(sg.getState().cacheClear.status, "failed");
  assert.equal(sg.getState().cacheClear.lastError, "磁盘空间不足");

  const html = r.globalSettingsV2({}, "settings-general", {});
  const btn = parseCacheClearButton(html);
  assert.equal(btn.label, "重试", "failed label");
  assert.equal(btn.isFailed, true, "failed is-failed");
  assert.equal(btn.ariaInvalid, true, "failed aria-invalid=true");
  assert.equal(btn.title, "磁盘空间不足", "failed title carries error message");
  assert.equal(btn.disabled, false, "failed NOT disabled (allows retry)");
});

// =============================================================================
// 4. 重复点击 guard: loading 状态下再 dispatch CACHE_CLEAR_START 是 no-op
// =============================================================================
test("A2 Phase 4: cache-cleanup duplicate click guard — CACHE_CLEAR_START during loading is no-op", () => {
  const r = freshSandbox();
  const sg = r.settingsGeneral;

  sg.dispatch({ type: "CACHE_CLEAR_CONFIRM" });
  sg.dispatch({ type: "CACHE_CLEAR_START" });
  const stateBeforeDuplicate = sg.getState().cacheClear.status;
  assert.equal(stateBeforeDuplicate, "loading");

  // 重复点击
  sg.dispatch({ type: "CACHE_CLEAR_START" });
  assert.equal(sg.getState().cacheClear.status, "loading", "still loading after duplicate START");

  // listener 不应被重复点击触发（reducer 返回相同 state）
  let listenerCalls = 0;
  const unsub = sg.subscribe(() => { listenerCalls++; });
  sg.dispatch({ type: "CACHE_CLEAR_START" });
  assert.equal(listenerCalls, 0, "listener NOT called for no-op duplicate START");
  unsub();

  // success 仍然可达
  sg.dispatch({ type: "CACHE_CLEAR_SUCCESS" });
  assert.equal(sg.getState().cacheClear.status, "success", "success reachable after duplicate guard");
});

// =============================================================================
// 5. 状态不可跳: idle 直接 START 应该进入 loading（但语义上应该先 confirm）
//    但 reducer 不强制 confirm → loading 顺序，只 guard 重复 loading
// =============================================================================
test("A2 Phase 4: cache-cleanup state machine allows direct START from idle (no strict ordering guard)", () => {
  const r = freshSandbox();
  const sg = r.settingsGeneral;

  // 从 idle 直接 START
  sg.dispatch({ type: "CACHE_CLEAR_START" });
  assert.equal(sg.getState().cacheClear.status, "loading", "direct START from idle enters loading");

  // 重复 START 仍是 no-op
  sg.dispatch({ type: "CACHE_CLEAR_START" });
  assert.equal(sg.getState().cacheClear.status, "loading", "duplicate START during loading is no-op");
});

// =============================================================================
// 6. 持久化: cacheClear.status 是瞬态，不持久化到 localStorage
// =============================================================================
test("A2 Phase 4: cache-cleanup status is transient (not persisted to localStorage)", () => {
  const r = freshSandbox();
  const sg = r.settingsGeneral;

  sg.dispatch({ type: "CACHE_CLEAR_CONFIRM" });
  sg.dispatch({ type: "CACHE_CLEAR_START" });
  sg.dispatch({ type: "CACHE_CLEAR_SUCCESS" });

  // localStorage 里不应有 cacheClear 状态
  const stored = r.storage.get("settings-general-values");
  assert.equal(stored, undefined, "settings-general-values NOT written by cacheClear actions");

  // 重启 sandbox 后 cacheClear 回到 idle
  const r2 = freshSandbox();
  assert.equal(r2.settingsGeneral.getState().cacheClear.status, "idle", "cacheClear reset to idle on reload");
});
