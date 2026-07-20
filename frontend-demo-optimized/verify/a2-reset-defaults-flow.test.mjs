// A2 (R2b) · Phase 6: 恢复默认流程（确认 / 取消 / 提交 / 结果反馈）
// -----------------------------------------------------------------------------
// 状态机：idle → confirm → (cancel → cancelled) | (submit → submitting → success)
// RESET_DEFAULTS_SUCCESS 会重置 values 到 defaults 并持久化
// DOM 反映: action button class/label/disabled/aria-busy
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
  const ctx = vm.createContext({ window, module: { exports: {} }, Promise, setTimeout });
  new vm.Script(kitSource).runInContext(ctx);
  new vm.Script(appearanceSpecSource).runInContext(ctx);
  new vm.Script(declarationsSource).runInContext(ctx);
  new vm.Script(d2SettingsSource).runInContext(ctx);
  return ctx.window.ReaderD2SettingsSyncRenderers;
}

// 从 HTML 提取"恢复默认" action button
function parseResetDefaultsButton(html) {
  // action list section: <button class="..." type="button" ...><span icon></span><span><strong>LABEL</strong>...
  // button 内部有 icon span，需要跨标签匹配到第一个 <strong>
  const re = /<section class="fd-settings-action-list"[^>]*>[\s\S]*?<button class="([^"]*)" type="button"([^>]*)>[\s\S]*?<strong>([^<]+)<\/strong>/;
  const m = html.match(re);
  if (!m) return null;
  return {
    class: m[1],
    attrs: m[2],
    label: m[3],
    isDanger: m[1].indexOf("is-danger") >= 0,
    isBusy: m[1].indexOf("is-busy") >= 0,
    isSuccess: m[1].indexOf("is-success") >= 0,
    isConfirm: m[1].indexOf("is-confirm") >= 0,
    isCancelled: m[1].indexOf("is-cancelled") >= 0,
    ariaBusy: m[2].indexOf('aria-busy="true"') >= 0,
    disabled: m[2].indexOf("disabled") >= 0,
  };
}

// =============================================================================
// 1. 初始状态: action button 显示 "恢复默认"，is-danger，无 disabled
// =============================================================================
test("A2 Phase 6: reset-defaults initial state shows 恢复默认 button", () => {
  const r = freshSandbox();
  const html = r.globalSettingsV2({}, "settings-general", {});
  const btn = parseResetDefaultsButton(html);
  assert.ok(btn, "reset-defaults button exists");
  assert.equal(btn.label, "恢复默认", "idle label");
  assert.equal(btn.isDanger, true, "idle is-danger");
  assert.equal(btn.disabled, false, "idle NOT disabled");
});

// =============================================================================
// 2. 完整成功路径: idle → confirm → submitting → success → reset
//    success 时 values 重置到 defaults + 持久化
// =============================================================================
test("A2 Phase 6: reset-defaults success path resets values and persists", async () => {
  const r = freshSandbox();
  const sg = r.settingsGeneral;

  // 先修改一些值，验证 success 会重置
  sg.dispatch({ type: "SELECT_OPTION", settingsKey: "app-theme", value: "dark" });
  sg.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "auto-check-update", value: false });
  assert.equal(sg.getState().values["app-theme"], "dark", "pre-modified app-theme");
  assert.equal(sg.getState().values["auto-check-update"], false, "pre-modified auto-check-update");

  // confirm
  sg.dispatch({ type: "RESET_DEFAULTS_CONFIRM" });
  assert.equal(sg.getState().resetDefaults.status, "confirm");
  let html = r.globalSettingsV2({}, "settings-general", {});
  let btn = parseResetDefaultsButton(html);
  assert.equal(btn.isConfirm, true, "confirm state is-confirm");

  // submit (async)
  const promise = sg.executeResetDefaults({ delay: 0 });
  assert.equal(sg.getState().resetDefaults.status, "submitting");
  html = r.globalSettingsV2({}, "settings-general", {});
  btn = parseResetDefaultsButton(html);
  assert.equal(btn.label, "恢复中…", "submitting label");
  assert.equal(btn.isBusy, true, "submitting is-busy");
  assert.equal(btn.ariaBusy, true, "submitting aria-busy");
  assert.equal(btn.disabled, true, "submitting disabled");

  const result = await promise;
  assert.equal(result, "success");
  assert.equal(sg.getState().resetDefaults.status, "success");

  // values 已重置到 defaults
  assert.equal(sg.getState().values["app-theme"], "follow-system", "after reset app-theme back to default");
  assert.equal(sg.getState().values["auto-check-update"], true, "after reset auto-check-update back to default");

  // 持久化
  const stored = r.storage.get("settings-general-values");
  assert.equal(stored["app-theme"], "follow-system", "persisted app-theme=default");
  assert.equal(stored["auto-check-update"], true, "persisted auto-check-update=default");

  // DOM 反映 success
  html = r.globalSettingsV2({}, "settings-general", {});
  btn = parseResetDefaultsButton(html);
  assert.equal(btn.label, "已恢复", "success label");
  assert.equal(btn.isSuccess, true, "success is-success");
  assert.equal(btn.disabled, true, "success disabled");

  // reset 回到 idle
  sg.dispatch({ type: "RESET_DEFAULTS_RESET" });
  assert.equal(sg.getState().resetDefaults.status, "idle");
  html = r.globalSettingsV2({}, "settings-general", {});
  btn = parseResetDefaultsButton(html);
  assert.equal(btn.label, "恢复默认", "after reset back to idle label");
});

// =============================================================================
// 3. 取消路径: idle → confirm → cancel → cancelled → (reset to idle)
//    cancel 后 values 不变
// =============================================================================
test("A2 Phase 6: reset-defaults cancel path preserves values", () => {
  const r = freshSandbox();
  const sg = r.settingsGeneral;

  // 先修改一些值
  sg.dispatch({ type: "SELECT_OPTION", settingsKey: "language", value: "en" });
  sg.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "reduce-motion", value: true });
  const beforeValues = Object.assign({}, sg.getState().values);

  // confirm → cancel
  sg.dispatch({ type: "RESET_DEFAULTS_CONFIRM" });
  assert.equal(sg.getState().resetDefaults.status, "confirm");
  sg.dispatch({ type: "RESET_DEFAULTS_CANCEL" });
  assert.equal(sg.getState().resetDefaults.status, "cancelled");

  // values 不变（用 JSON.stringify 比较，避免 key 顺序问题）
  assert.equal(JSON.stringify(sg.getState().values), JSON.stringify(beforeValues), "values unchanged after cancel");

  // DOM 反映 cancelled
  let html = r.globalSettingsV2({}, "settings-general", {});
  let btn = parseResetDefaultsButton(html);
  assert.equal(btn.isCancelled, true, "cancelled is-cancelled");

  // reset 回到 idle
  sg.dispatch({ type: "RESET_DEFAULTS_RESET" });
  assert.equal(sg.getState().resetDefaults.status, "idle");
  html = r.globalSettingsV2({}, "settings-general", {});
  btn = parseResetDefaultsButton(html);
  assert.equal(btn.label, "恢复默认", "after reset back to idle label");
});

// =============================================================================
// 4. 重复点击 guard: submitting 状态下再 dispatch SUBMIT 是 no-op
// =============================================================================
test("A2 Phase 6: reset-defaults duplicate click guard during submitting", async () => {
  const r = freshSandbox();
  const sg = r.settingsGeneral;

  sg.dispatch({ type: "RESET_DEFAULTS_CONFIRM" });
  const promise = sg.executeResetDefaults({ delay: 50 });

  // 重复点击
  sg.dispatch({ type: "RESET_DEFAULTS_SUBMIT" });
  assert.equal(sg.getState().resetDefaults.status, "submitting", "still submitting after duplicate SUBMIT");

  let listenerCalls = 0;
  const unsub = sg.subscribe(() => { listenerCalls++; });
  sg.dispatch({ type: "RESET_DEFAULTS_SUBMIT" });
  assert.equal(listenerCalls, 0, "listener NOT called for no-op duplicate SUBMIT");
  unsub();

  await promise;
  assert.equal(sg.getState().resetDefaults.status, "success", "success reachable after duplicate guard");
});

// =============================================================================
// 5. 状态瞬态: resetDefaults.status 不持久化（但 success 时写入的 defaults values 持久化）
// =============================================================================
test("A2 Phase 6: resetDefaults status is transient but success writes default values", async () => {
  const r = freshSandbox();
  const sg = r.settingsGeneral;

  // 修改 values
  sg.dispatch({ type: "SELECT_OPTION", settingsKey: "app-theme", value: "dark" });
  sg.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "crash-log", value: false });

  // 执行恢复默认
  sg.dispatch({ type: "RESET_DEFAULTS_CONFIRM" });
  await sg.executeResetDefaults({ delay: 0 });
  assert.equal(sg.getState().resetDefaults.status, "success");

  // 重启 sandbox
  const stored = r.storage.get("settings-general-values");
  const r2 = freshSandbox();
  // values 是 defaults（持久化的）
  assert.equal(r2.settingsGeneral.getState().values["app-theme"], "follow-system", "restored values=default");
  assert.equal(r2.settingsGeneral.getState().values["crash-log"], true, "restored crash-log=default");
  // 但 resetDefaults.status 回到 idle
  assert.equal(r2.settingsGeneral.getState().resetDefaults.status, "idle", "resetDefaults status reset to idle on reload");
});

// =============================================================================
// 6. 完整 round-trip: 修改 values → 恢复默认 → 验证所有 8 个 subcontrol 回到 defaults
// =============================================================================
test("A2 Phase 6: reset-defaults restores all 8 subcontrol values to defaults", async () => {
  const r = freshSandbox();
  const sg = r.settingsGeneral;
  const defaults = sg.defaults;

  // 修改所有 8 个值
  sg.dispatch({ type: "SELECT_OPTION", settingsKey: "app-theme", value: "dark" });
  sg.dispatch({ type: "SELECT_OPTION", settingsKey: "language", value: "en" });
  sg.dispatch({ type: "SELECT_OPTION", settingsKey: "startup-screen", value: "rss" });
  sg.dispatch({ type: "SELECT_OPTION", settingsKey: "animation-effect", value: "enhance" });
  sg.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "auto-check-update", value: false });
  sg.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "tap-bottom-scroll-top", value: false });
  sg.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "reduce-motion", value: true });
  sg.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "crash-log", value: false });

  // 执行恢复默认
  sg.dispatch({ type: "RESET_DEFAULTS_CONFIRM" });
  await sg.executeResetDefaults({ delay: 0 });

  // 验证所有 8 个值回到 defaults
  const values = sg.getState().values;
  for (const key of Object.keys(defaults)) {
    assert.equal(values[key], defaults[key], `${key} restored to default`);
  }
});
