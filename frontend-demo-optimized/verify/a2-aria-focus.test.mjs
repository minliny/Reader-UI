// A2 (R2b) · Phase 7: ARIA + 焦点补齐验证
// -----------------------------------------------------------------------------
// 验证 settings-general 路由下所有可交互元素的 ARIA 属性：
//   - switch: role="switch" + aria-checked + tabindex="0" + aria-label
//   - segment: role="group" + active button aria-pressed="true"
//   - select: aria-haspopup="listbox" + aria-expanded="false" + role="button" + tabindex="0"
//   - link (permission): aria-haspopup="dialog" + role="button" + tabindex="0"
//   - cache-cleanup button: loading 时 aria-busy + disabled
//   - permission button: requesting 时 aria-busy + disabled; granted 时 disabled
//   - reset-defaults button: submitting 时 aria-busy + disabled
//   - focus restore: 带 overlay 的 row 有 data-restore-focus 属性
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

function freshSandbox(bridgeImpl) {
  const window = {
    localStorage: { _store: {}, getItem(k) { return this._store[k] || null; }, setItem(k, v) { this._store[k] = v; }, removeItem(k) { delete this._store[k]; } },
    ReaderFrontendDemoDraftRouteContract: { routes: { "settings-general": { title: "通用设置" } }, routePresentation: {} },
  };
  if (bridgeImpl) {
    window.ReaderPermissionBridge = { request: bridgeImpl };
  }
  const ctx = vm.createContext({ window, module: { exports: {} }, Promise, setTimeout });
  new vm.Script(kitSource).runInContext(ctx);
  new vm.Script(appearanceSpecSource).runInContext(ctx);
  new vm.Script(declarationsSource).runInContext(ctx);
  new vm.Script(d2SettingsSource).runInContext(ctx);
  return ctx.window.ReaderD2SettingsSyncRenderers;
}

function render(r) {
  return r.globalSettingsV2({}, "settings-general", {});
}

// =============================================================================
// 1. switch: role="switch" + aria-checked + tabindex="0" + aria-label
// =============================================================================
test("A2 Phase 7: switch span has role=switch + aria-checked + tabindex=0 + aria-label", () => {
  const r = freshSandbox();
  const sg = r.settingsGeneral;
  const html = render(r);

  // 4 个 switch
  const switches = ["auto-check-update", "tap-bottom-scroll-top", "reduce-motion", "crash-log"];
  for (const sk of switches) {
    const re = new RegExp(`<span class="fd-settings-switch[^"]*"[^>]*data-settings-key="${sk}"[^>]*>`, "");
    const m = html.match(re);
    assert.ok(m, `${sk} switch span exists`);
    const tag = m[0];
    assert.match(tag, /role="switch"/, `${sk} has role="switch"`);
    assert.match(tag, /aria-checked="(true|false)"/, `${sk} has aria-checked`);
    assert.match(tag, /tabindex="0"/, `${sk} has tabindex="0"`);
    assert.match(tag, /aria-label="/, `${sk} has aria-label`);
    // 不应有 aria-hidden
    assert.doesNotMatch(tag, /aria-hidden="true"/, `${sk} NOT aria-hidden`);
  }

  // 验证 aria-checked 与 enabled 状态一致
  sg.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "auto-check-update", value: false });
  const html2 = render(r);
  const m2 = html2.match(/<span class="fd-settings-switch[^"]*"[^>]*data-settings-key="auto-check-update"[^>]*>/);
  assert.match(m2[0], /aria-checked="false"/, "after toggle off, aria-checked=false");
});

// =============================================================================
// 2. segment: role="group" + active button aria-pressed="true"
// =============================================================================
test("A2 Phase 7: segment has role=group + active button aria-pressed=true", () => {
  const r = freshSandbox();
  const sg = r.settingsGeneral;
  let html = render(r);

  // segment container
  const containerRe = /<span class="fd-settings-segment" role="group" aria-label="App主题">/;
  assert.match(html, containerRe, "segment container has role=group + aria-label");

  // 3 个 button，初始 follow-system → option 0 是 active
  for (let i = 1; i <= 3; i++) {
    const sk = `app-theme-segment-option-${i}`;
    const re = new RegExp(`<button class="[^"]*" type="button"[^>]*data-settings-key="${sk}"[^>]*aria-pressed="(true|false)"`, "");
    const m = html.match(re);
    assert.ok(m, `${sk} button has aria-pressed`);
  }

  // 初始 option 1 (跟随系统) 是 aria-pressed=true
  const opt1Re = /<button class="is-active" type="button"[^>]*data-settings-key="app-theme-segment-option-1"[^>]*aria-pressed="true"/;
  assert.match(html, opt1Re, "initial active option 1 has aria-pressed=true");

  // 切换到 option 2 (浅色)
  sg.dispatch({ type: "SELECT_OPTION", settingsKey: "app-theme", value: "light" });
  html = render(r);
  const opt2Re = /<button class="is-active" type="button"[^>]*data-settings-key="app-theme-segment-option-2"[^>]*aria-pressed="true"/;
  assert.match(html, opt2Re, "after select light, option 2 has aria-pressed=true");
  // option 1 应该是 aria-pressed=false
  const opt1AfterRe = /<button class="" type="button"[^>]*data-settings-key="app-theme-segment-option-1"[^>]*aria-pressed="false"/;
  assert.match(html, opt1AfterRe, "after select light, option 1 has aria-pressed=false");
});

// =============================================================================
// 3. select row: aria-haspopup="listbox" + aria-expanded="false" + role="button" + tabindex="0"
// =============================================================================
test("A2 Phase 7: select row has aria-haspopup=listbox + aria-expanded=false + role=button + tabindex=0", () => {
  const r = freshSandbox();
  const html = render(r);

  const selects = ["language", "startup-screen", "animation-effect"];
  for (const sk of selects) {
    const re = new RegExp(`<article[^>]*data-settings-key="${sk}"[^>]*>`, "");
    const m = html.match(re);
    assert.ok(m, `${sk} select article exists`);
    const tag = m[0];
    assert.match(tag, /aria-haspopup="listbox"/, `${sk} has aria-haspopup="listbox"`);
    assert.match(tag, /aria-expanded="false"/, `${sk} has aria-expanded="false"`);
    assert.match(tag, /role="button"/, `${sk} has role="button"`);
    assert.match(tag, /tabindex="0"/, `${sk} has tabindex="0"`);
  }
});

// =============================================================================
// 4. permission link row: aria-haspopup="dialog" + role="button" + tabindex="0"
// =============================================================================
test("A2 Phase 7: permission link row has aria-haspopup=dialog + role=button + tabindex=0", () => {
  const r = freshSandbox();
  const html = render(r);

  const overlays = [
    "dialog:file-access-permission",
    "dialog:notification-permission",
    "dialog:battery-permission",
  ];
  for (const overlay of overlays) {
    const re = new RegExp(`<article[^>]*data-settings-overlay="${overlay.replace(/:/g, "\\:")}"[^>]*>`, "");
    const m = html.match(re);
    assert.ok(m, `${overlay} article exists`);
    const tag = m[0];
    assert.match(tag, /aria-haspopup="dialog"/, `${overlay} has aria-haspopup="dialog"`);
    assert.match(tag, /role="button"/, `${overlay} has role="button"`);
    assert.match(tag, /tabindex="0"/, `${overlay} has tabindex="0"`);
  }
});

// =============================================================================
// 5. cache-cleanup button: loading 时 aria-busy + disabled
// =============================================================================
test("A2 Phase 7: cache-cleanup button has aria-busy + disabled during loading", () => {
  const r = freshSandbox();
  const sg = r.settingsGeneral;

  sg.dispatch({ type: "CACHE_CLEAR_CONFIRM" });
  sg.dispatch({ type: "CACHE_CLEAR_START" });

  const html = render(r);
  // 找到 cache-cleanup button
  const btnRe = /<button class="fd-settings-row-action is-busy" type="button"[^>]*aria-busy="true"[^>]*disabled[^>]*>清理中…<\/button>/;
  assert.match(html, btnRe, "cache-cleanup button during loading has aria-busy + disabled");

  // failed 状态: aria-invalid
  sg.dispatch({ type: "CACHE_CLEAR_FAILED", error: "磁盘满" });
  const html2 = render(r);
  const failedRe = /<button class="fd-settings-row-action is-failed" type="button"[^>]*aria-invalid="true"[^>]*title="磁盘满"[^>]*>重试<\/button>/;
  assert.match(html2, failedRe, "cache-cleanup button during failed has aria-invalid + title");
});

// =============================================================================
// 6. permission button: requesting 时 aria-busy + disabled; granted 时 disabled
// =============================================================================
test("A2 Phase 7: permission button has correct aria-busy/disabled per state", async () => {
  const r = freshSandbox(() => new Promise((resolve) => setTimeout(() => resolve("granted"), 10)));
  const sg = r.settingsGeneral;

  // 发起请求（异步，不 await）
  const promise = sg.requestPermission("file-access");

  // requesting 状态
  let html = render(r);
  let btnRe = /<button class="fd-settings-row-action is-busy" type="button"[^>]*aria-busy="true"[^>]*disabled[^>]*>请求中…<\/button>/;
  assert.match(html, btnRe, "permission button during requesting has aria-busy + disabled");

  await promise;

  // granted 状态
  html = render(r);
  btnRe = /<button class="fd-settings-row-action is-success" type="button"[^>]*disabled[^>]*>已授权<\/button>/;
  assert.match(html, btnRe, "permission button after granted has disabled");
});

// =============================================================================
// 7. reset-defaults button: submitting 时 aria-busy + disabled
// =============================================================================
test("A2 Phase 7: reset-defaults button has aria-busy + disabled during submitting", async () => {
  const r = freshSandbox();
  const sg = r.settingsGeneral;

  sg.dispatch({ type: "RESET_DEFAULTS_CONFIRM" });
  const promise = sg.executeResetDefaults({ delay: 30 });

  const html = render(r);
  const btnRe = /<button class="is-danger is-busy" type="button"[^>]*aria-busy="true"[^>]*disabled[^>]*>[\s\S]*?<strong>恢复中…<\/strong>/;
  assert.match(html, btnRe, "reset-defaults button during submitting has aria-busy + disabled");

  await promise;
});

// =============================================================================
// 8. focus restore: 带 overlay 的 row 有 data-restore-focus 属性
// =============================================================================
test("A2 Phase 7: rows with overlay have data-restore-focus attribute", () => {
  const r = freshSandbox();
  const html = render(r);

  // 3 个 permission row + cache-cleanup row 都有 overlay（cache-cleanup 的 overlay 在 button 上，不在 article 上）
  // permission row 的 overlay 在 article 上
  const fileAccessRe = /<article[^>]*data-settings-overlay="dialog:file-access-permission"[^>]*data-restore-focus="file-access"[^>]*>/;
  assert.match(html, fileAccessRe, "file-access row has data-restore-focus");

  const notificationRe = /<article[^>]*data-settings-overlay="dialog:notification-permission"[^>]*data-restore-focus="notification"[^>]*>/;
  assert.match(html, notificationRe, "notification row has data-restore-focus");

  const batteryRe = /<article[^>]*data-settings-overlay="dialog:battery-permission"[^>]*data-restore-focus="battery"[^>]*>/;
  assert.match(html, batteryRe, "battery row has data-restore-focus");
});

// =============================================================================
// 9. switch 没有 aria-hidden（旧实现有 aria-hidden="true"，违反 ARIA）
// =============================================================================
test("A2 Phase 7: switch span does NOT have aria-hidden (removed from A1)", () => {
  const r = freshSandbox();
  const html = render(r);

  // 所有 fd-settings-switch span 不应有 aria-hidden
  const switchMatches = html.match(/<span class="fd-settings-switch[^"]*"[^>]*>/g) || [];
  for (const tag of switchMatches) {
    assert.doesNotMatch(tag, /aria-hidden="true"/, "switch span should NOT have aria-hidden");
  }
});
