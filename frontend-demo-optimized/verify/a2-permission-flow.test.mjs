// A2 (R2b) · Phase 5: 3 权限请求流程（文件 / 通知 / 电池）
// -----------------------------------------------------------------------------
// 状态机：prompt → requesting → granted/denied/error → (可重试)
// Mock window.ReaderPermissionBridge.request(name) → "granted" / "denied" / throw
// DOM 反映: status badge + button class/label/disabled/aria-busy/aria-invalid
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

// 从 HTML 提取权限 row 的 status badge 和 button
function parsePermissionRow(html, permissionName) {
  // permission row: <article ... data-settings-overlay="dialog:xxx-permission" ...>
  //   <span>icon</span><strong>title</strong><em class="...">status + button + chevron</em>
  // 用 data-settings-overlay 锚定 row
  const overlayMap = {
    "file-access": "dialog:file-access-permission",
    "notification": "dialog:notification-permission",
    "battery": "dialog:battery-permission",
  };
  const overlay = overlayMap[permissionName];
  const rowRe = new RegExp(`<article[^>]*data-settings-overlay="${overlay}"[^>]*>([\\s\\S]*?)</article>`, "");
  const rowM = html.match(rowRe);
  if (!rowM) return null;
  const rowContent = rowM[1];
  // status badge: <span class="fd-settings-badge is-{tone}" title="{status}">
  const statusRe = /<span class="fd-settings-badge is-([^"]+)" title="([^"]+)"/;
  const statusM = rowContent.match(statusRe);
  // button
  const btnRe = /<button class="(fd-settings-row-action[^"]*)" type="button"([^>]*)>([^<]+)<\/button>/;
  const btnM = rowContent.match(btnRe);
  return {
    status: statusM ? statusM[2] : null,
    statusTone: statusM ? statusM[1] : null,
    button: btnM ? {
      class: btnM[1],
      attrs: btnM[2],
      label: btnM[3],
      isBusy: btnM[1].indexOf("is-busy") >= 0,
      isSuccess: btnM[1].indexOf("is-success") >= 0,
      isDenied: btnM[1].indexOf("is-denied") >= 0,
      isFailed: btnM[1].indexOf("is-failed") >= 0,
      ariaBusy: btnM[2].indexOf('aria-busy="true"') >= 0,
      disabled: btnM[2].indexOf("disabled") >= 0,
      ariaInvalid: btnM[2].indexOf('aria-invalid="true"') >= 0,
    } : null,
  };
}

// =============================================================================
// 1. 初始状态: 3 个权限都是 prompt，button 显示 "去设置"，无 disabled
// =============================================================================
test("A2 Phase 5: 3 permissions initial state is prompt with default button", () => {
  const r = freshSandbox();
  const html = r.globalSettingsV2({}, "settings-general", {});

  for (const name of ["file-access", "notification", "battery"]) {
    const row = parsePermissionRow(html, name);
    assert.ok(row, `${name} row exists`);
    assert.equal(row.status, "未授权", `${name} initial status`);
    assert.ok(row.button, `${name} button exists`);
    assert.equal(row.button.label, "去设置", `${name} initial button label`);
    assert.equal(row.button.disabled, false, `${name} NOT disabled initially`);
  }
});

// =============================================================================
// 2. 完整成功路径: prompt → requesting → granted
// =============================================================================
test("A2 Phase 5: permission success path prompt → requesting → granted", async () => {
  const r = freshSandbox((name) => "granted");
  const sg = r.settingsGeneral;

  // 发起请求（异步）
  const promise = sg.requestPermission("file-access");

  // requesting 状态（同步检查）
  assert.equal(sg.getState().permissions["file-access"], "requesting");
  let html = r.globalSettingsV2({}, "settings-general", {});
  let row = parsePermissionRow(html, "file-access");
  assert.equal(row.status, "请求中…", "requesting status label");
  assert.equal(row.button.label, "请求中…", "requesting button label");
  assert.equal(row.button.isBusy, true, "requesting is-busy");
  assert.equal(row.button.ariaBusy, true, "requesting aria-busy");
  assert.equal(row.button.disabled, true, "requesting disabled");

  const result = await promise;
  assert.equal(result, "granted");
  assert.equal(sg.getState().permissions["file-access"], "granted");

  html = r.globalSettingsV2({}, "settings-general", {});
  row = parsePermissionRow(html, "file-access");
  assert.equal(row.status, "已授权", "granted status label");
  assert.equal(row.button.label, "已授权", "granted button label");
  assert.equal(row.button.isSuccess, true, "granted is-success");
  assert.equal(row.button.disabled, true, "granted disabled (已授权无需再点)");
});

// =============================================================================
// 3. 拒绝路径: prompt → requesting → denied
// =============================================================================
test("A2 Phase 5: permission denied path", async () => {
  const r = freshSandbox((name) => "denied");
  const sg = r.settingsGeneral;

  const result = await sg.requestPermission("notification");
  assert.equal(result, "denied");
  assert.equal(sg.getState().permissions["notification"], "denied");

  const html = r.globalSettingsV2({}, "settings-general", {});
  const row = parsePermissionRow(html, "notification");
  assert.equal(row.status, "已拒绝", "denied status label");
  assert.equal(row.button.label, "去设置", "denied button label (still allows retry via system settings)");
  assert.equal(row.button.isDenied, true, "denied is-denied");
  assert.equal(row.button.disabled, false, "denied NOT disabled (allows retry)");
});

// =============================================================================
// 4. 错误路径 + 重试: prompt → requesting → error → (重试) → granted
// =============================================================================
test("A2 Phase 5: permission error path then retry succeeds", async () => {
  // 第一次抛错，第二次 granted
  let callCount = 0;
  const r = freshSandbox((name) => {
    callCount++;
    if (callCount === 1) throw new Error("system error");
    return "granted";
  });
  const sg = r.settingsGeneral;

  // 第一次请求 → error
  const result1 = await sg.requestPermission("battery");
  assert.equal(result1, "error");
  assert.equal(sg.getState().permissions["battery"], "error");

  let html = r.globalSettingsV2({}, "settings-general", {});
  let row = parsePermissionRow(html, "battery");
  assert.equal(row.status, "请求失败", "error status label");
  assert.equal(row.button.label, "重试", "error button label");
  assert.equal(row.button.isFailed, true, "error is-failed");
  assert.equal(row.button.ariaInvalid, true, "error aria-invalid");
  assert.equal(row.button.disabled, false, "error NOT disabled (allows retry)");

  // 重试 → granted
  const result2 = await sg.requestPermission("battery");
  assert.equal(result2, "granted");
  assert.equal(sg.getState().permissions["battery"], "granted");

  html = r.globalSettingsV2({}, "settings-general", {});
  row = parsePermissionRow(html, "battery");
  assert.equal(row.status, "已授权", "after retry granted status");
});

// =============================================================================
// 5. demo 环境无 bridge: requestPermission 返回 "error"
// =============================================================================
test("A2 Phase 5: demo env without ReaderPermissionBridge returns error", async () => {
  const r = freshSandbox(null); // 无 bridge
  const sg = r.settingsGeneral;

  const result = await sg.requestPermission("file-access");
  assert.equal(result, "error");
  assert.equal(sg.getState().permissions["file-access"], "error");
});

// =============================================================================
// 6. 未知权限名: requestPermission reject
// =============================================================================
test("A2 Phase 5: unknown permission name rejects", async () => {
  const r = freshSandbox((name) => "granted");
  const sg = r.settingsGeneral;

  await assert.rejects(
    () => sg.requestPermission("unknown-permission"),
    /unknown permission name/,
  );
  // state 不变
  assert.equal(sg.getState().permissions["file-access"], "prompt");
});

// =============================================================================
// 7. 3 个权限独立: 一个权限的状态变化不影响其他两个
// =============================================================================
test("A2 Phase 5: 3 permissions are independent", async () => {
  const r = freshSandbox((name) => {
    if (name === "file-access") return "granted";
    if (name === "notification") return "denied";
    return "error";
  });
  const sg = r.settingsGeneral;

  await sg.requestPermission("file-access");
  await sg.requestPermission("notification");
  await sg.requestPermission("battery");

  assert.equal(sg.getState().permissions["file-access"], "granted");
  assert.equal(sg.getState().permissions["notification"], "denied");
  assert.equal(sg.getState().permissions["battery"], "error");
});

// =============================================================================
// 8. 权限状态瞬态: 不持久化到 localStorage
// =============================================================================
test("A2 Phase 5: permission status is transient (not persisted)", async () => {
  const r = freshSandbox((name) => "granted");
  const sg = r.settingsGeneral;

  await sg.requestPermission("file-access");
  assert.equal(sg.getState().permissions["file-access"], "granted");

  // localStorage 里不应有 permission 状态
  const stored = r.storage.get("settings-general-values");
  assert.equal(stored, undefined, "settings-general-values NOT written by permission actions");

  // 重启后回到 prompt
  const r2 = freshSandbox();
  assert.equal(r2.settingsGeneral.getState().permissions["file-access"], "prompt", "permission reset to prompt on reload");
});
