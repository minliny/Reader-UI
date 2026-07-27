// R3a · webdav-config 操作流 + 异步保护 + 校验 + 持久化验证
// -----------------------------------------------------------------------------
// 职责：
//   1. 测试连接流程：confirm → start → success / failed
//   2. 保存配置流程：confirm → start → success / failed
//   3. 清除配置流程：confirm → start → success (values 回默认) / failed
//   4. 重复点击保护：TEST_START / SAVE_START / CLEAR_START 仅在 confirm 状态接受
//   5. stale async 保护：TEST_SUCCESS/FAILED 等仅在 loading 状态接受
//   6. 互斥：同一时间只允许一个 dialog 打开
//   7. loading 期间不允许关闭 dialog
//   8. 输入校验：serverUrl / account / password 必填 + URL 前缀校验
//   9. SET_INPUT 清除对应字段的 inputError
//  10. STEP_TIMEOUT 范围限制 [5, 60]
//  11. SELECT_AUTO_SYNC 只接受合法选项
//  12. 持久化：values 变更写入 localStorage；transient 状态不持久化
//  13. 异步执行器：executeTest / executeSave / executeClear
//
// 运行：node --test frontend-demo-optimized/verify/r3a-webdav-config-flow.test.mjs
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
    localStorage: {
      _store: {},
      getItem(k) { return this._store[k] || null; },
      setItem(k, v) { this._store[k] = v; },
      removeItem(k) { delete this._store[k]; },
    },
    ReaderFrontendDemoDraftRouteContract: {
      routes: {
        "webdav-config": { title: "WebDAV 配置" },
        "webdav-test": { title: "WebDAV 测试连接" },
        "webdav-error": { title: "WebDAV 错误处理" },
      },
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

// =============================================================================
// 1. 测试连接流程：confirm → start → success
// =============================================================================
test("R3a flow: test connection confirm → start → success", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  // 默认 idle
  assert.equal(wc.getState().test.status, "idle");
  assert.equal(wc.getState().test.open, false);

  // open confirm
  wc.dispatch({ type: "TEST_CONFIRM_OPEN" });
  assert.equal(wc.getState().test.open, true);
  assert.equal(wc.getState().test.status, "confirm");

  // start → loading
  wc.dispatch({ type: "TEST_START" });
  assert.equal(wc.getState().test.status, "loading");

  // success
  wc.dispatch({ type: "TEST_SUCCESS", result: { latencyMs: 286, permission: "读写", dirExists: true } });
  assert.equal(wc.getState().test.status, "success");
  assert.equal(wc.getState().test.result.latencyMs, 286);
  assert.equal(wc.getState().test.error, null);
});

// =============================================================================
// 2. 测试连接流程：confirm → start → failed
// =============================================================================
test("R3a flow: test connection confirm → start → failed", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  wc.dispatch({ type: "TEST_CONFIRM_OPEN" });
  wc.dispatch({ type: "TEST_START" });
  wc.dispatch({ type: "TEST_FAILED", error: "认证失败" });

  assert.equal(wc.getState().test.status, "failed");
  assert.equal(wc.getState().test.error, "认证失败");
});

// =============================================================================
// 3. 保存配置流程：confirm → start → success
// =============================================================================
test("R3a flow: save config confirm → start → success", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  wc.dispatch({ type: "SAVE_CONFIRM_OPEN" });
  assert.equal(wc.getState().save.status, "confirm");

  wc.dispatch({ type: "SAVE_START" });
  assert.equal(wc.getState().save.status, "loading");

  wc.dispatch({ type: "SAVE_SUCCESS" });
  assert.equal(wc.getState().save.status, "success");
});

// =============================================================================
// 4. 保存配置流程：confirm → start → failed
// =============================================================================
test("R3a flow: save config confirm → start → failed", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  wc.dispatch({ type: "SAVE_CONFIRM_OPEN" });
  wc.dispatch({ type: "SAVE_START" });
  wc.dispatch({ type: "SAVE_FAILED", error: "磁盘空间不足" });

  assert.equal(wc.getState().save.status, "failed");
  assert.equal(wc.getState().save.error, "磁盘空间不足");
});

// =============================================================================
// 5. 清除配置流程：confirm → start → success (values 回默认)
// =============================================================================
test("R3a flow: clear config confirm → start → success resets values to defaults", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  // 先修改 values
  wc.dispatch({ type: "SET_INPUT", settingsKey: "serverUrl", value: "https://custom.example.com/dav" });
  assert.equal(wc.getState().values.serverUrl, "https://custom.example.com/dav");

  // 清除
  wc.dispatch({ type: "CLEAR_CONFIRM_OPEN" });
  wc.dispatch({ type: "CLEAR_START" });
  wc.dispatch({ type: "CLEAR_SUCCESS" });

  assert.equal(wc.getState().clear.status, "success");
  // values 回到默认
  assert.equal(wc.getState().values.serverUrl, "https://dav.example.com/reader/backup");
  assert.equal(wc.getState().values.account, "reader@example.com");
  assert.equal(wc.getState().inputErrors.serverUrl, undefined);
});

// =============================================================================
// 6. 清除配置流程：confirm → start → failed
// =============================================================================
test("R3a flow: clear config confirm → start → failed", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  wc.dispatch({ type: "CLEAR_CONFIRM_OPEN" });
  wc.dispatch({ type: "CLEAR_START" });
  wc.dispatch({ type: "CLEAR_FAILED", error: "清除失败" });

  assert.equal(wc.getState().clear.status, "failed");
  assert.equal(wc.getState().clear.error, "清除失败");
});

// =============================================================================
// 7. 重复点击保护：TEST_START 仅在 confirm 状态接受
// =============================================================================
test("R3a flow: TEST_START duplicate-click guard (only from confirm)", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  // idle → TEST_START 应该被忽略
  wc.dispatch({ type: "TEST_START" });
  assert.equal(wc.getState().test.status, "idle");

  // confirm → TEST_START → loading
  wc.dispatch({ type: "TEST_CONFIRM_OPEN" });
  wc.dispatch({ type: "TEST_START" });
  assert.equal(wc.getState().test.status, "loading");

  // loading → TEST_START 再次应该被忽略（重复点击）
  const stateBefore = wc.getState();
  wc.dispatch({ type: "TEST_START" });
  assert.equal(wc.getState().test.status, "loading");
  assert.equal(wc.getState(), stateBefore, "state reference unchanged (no-op)");
});

// =============================================================================
// 8. stale async 保护：TEST_SUCCESS 仅在 loading 状态接受
// =============================================================================
test("R3a flow: TEST_SUCCESS stale async guard (only from loading)", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  // idle → TEST_SUCCESS 应该被忽略
  wc.dispatch({ type: "TEST_SUCCESS", result: { latencyMs: 100 } });
  assert.equal(wc.getState().test.status, "idle");
  assert.equal(wc.getState().test.result, null);

  // confirm → TEST_SUCCESS 应该被忽略
  wc.dispatch({ type: "TEST_CONFIRM_OPEN" });
  wc.dispatch({ type: "TEST_SUCCESS", result: { latencyMs: 100 } });
  assert.equal(wc.getState().test.status, "confirm");

  // loading → TEST_SUCCESS → success
  wc.dispatch({ type: "TEST_START" });
  wc.dispatch({ type: "TEST_SUCCESS", result: { latencyMs: 100 } });
  assert.equal(wc.getState().test.status, "success");

  // success → TEST_SUCCESS 再次应该被忽略（stale response）
  wc.dispatch({ type: "TEST_SUCCESS", result: { latencyMs: 999 } });
  assert.equal(wc.getState().test.result.latencyMs, 100, "result not overwritten by stale response");
});

// =============================================================================
// 9. SAVE_START 重复点击保护
// =============================================================================
test("R3a flow: SAVE_START duplicate-click guard", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  // idle → SAVE_START 被忽略
  wc.dispatch({ type: "SAVE_START" });
  assert.equal(wc.getState().save.status, "idle");

  wc.dispatch({ type: "SAVE_CONFIRM_OPEN" });
  wc.dispatch({ type: "SAVE_START" });
  assert.equal(wc.getState().save.status, "loading");

  // loading → SAVE_START 再次被忽略
  wc.dispatch({ type: "SAVE_START" });
  assert.equal(wc.getState().save.status, "loading");
});

// =============================================================================
// 10. CLEAR_START 重复点击保护
// =============================================================================
test("R3a flow: CLEAR_START duplicate-click guard", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  wc.dispatch({ type: "CLEAR_CONFIRM_OPEN" });
  wc.dispatch({ type: "CLEAR_START" });
  assert.equal(wc.getState().clear.status, "loading");

  // loading → CLEAR_START 再次被忽略
  wc.dispatch({ type: "CLEAR_START" });
  assert.equal(wc.getState().clear.status, "loading");
});

// =============================================================================
// 11. 互斥：同一时间只允许一个 dialog 打开
// =============================================================================
test("R3a flow: mutual exclusion — only one dialog open at a time", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  // 打开 test dialog
  wc.dispatch({ type: "TEST_CONFIRM_OPEN" });
  assert.equal(wc.getState().test.open, true);

  // 尝试打开 save dialog → 应该被拒绝
  wc.dispatch({ type: "SAVE_CONFIRM_OPEN" });
  assert.equal(wc.getState().save.open, false, "save dialog rejected while test open");

  // 尝试打开 clear dialog → 应该被拒绝
  wc.dispatch({ type: "CLEAR_CONFIRM_OPEN" });
  assert.equal(wc.getState().clear.open, false, "clear dialog rejected while test open");

  // 关闭 test dialog
  wc.dispatch({ type: "TEST_CONFIRM_CLOSE" });
  assert.equal(wc.getState().test.open, false);

  // 现在 save dialog 可以打开
  wc.dispatch({ type: "SAVE_CONFIRM_OPEN" });
  assert.equal(wc.getState().save.open, true);
});

// =============================================================================
// 12. loading 期间不允许关闭 dialog
// =============================================================================
test("R3a flow: cannot close dialog during loading", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  wc.dispatch({ type: "TEST_CONFIRM_OPEN" });
  wc.dispatch({ type: "TEST_START" });
  assert.equal(wc.getState().test.status, "loading");

  // 尝试关闭 → 应该被拒绝
  wc.dispatch({ type: "TEST_CONFIRM_CLOSE" });
  assert.equal(wc.getState().test.open, true, "dialog stays open during loading");
  assert.equal(wc.getState().test.status, "loading");
});

// =============================================================================
// 13. 输入校验：serverUrl / account / password 必填 + URL 前缀
// =============================================================================
test("R3a flow: input validation — required fields + URL prefix", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  // 空值校验
  wc.dispatch({ type: "SET_INPUT", settingsKey: "serverUrl", value: "" });
  wc.dispatch({ type: "SET_INPUT", settingsKey: "account", value: "" });
  wc.dispatch({ type: "SET_INPUT", settingsKey: "password", value: "" });
  wc.dispatch({ type: "INPUT_VALIDATE" });

  const errors = wc.getState().inputErrors;
  assert.ok(errors.serverUrl, "serverUrl error present");
  assert.ok(errors.account, "account error present");
  assert.ok(errors.password, "password error present");
  assert.equal(errors.syncDir, undefined, "syncDir has no error (optional)");

  // URL 前缀校验
  wc.dispatch({ type: "SET_INPUT", settingsKey: "serverUrl", value: "ftp://bad.example.com" });
  wc.dispatch({ type: "INPUT_VALIDATE" });
  assert.ok(wc.getState().inputErrors.serverUrl, "serverUrl error for non-http prefix");

  // 合法值清除错误
  wc.dispatch({ type: "SET_INPUT", settingsKey: "serverUrl", value: "https://good.example.com" });
  wc.dispatch({ type: "SET_INPUT", settingsKey: "account", value: "user@example.com" });
  wc.dispatch({ type: "SET_INPUT", settingsKey: "password", value: "secret" });
  wc.dispatch({ type: "INPUT_VALIDATE" });
  assert.equal(Object.keys(wc.getState().inputErrors).length, 0, "no errors with valid inputs");
});

// =============================================================================
// 14. SET_INPUT 清除对应字段的 inputError
// =============================================================================
test("R3a flow: SET_INPUT clears inputError for that field", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  // 制造错误
  wc.dispatch({ type: "SET_INPUT", settingsKey: "serverUrl", value: "" });
  wc.dispatch({ type: "INPUT_VALIDATE" });
  assert.ok(wc.getState().inputErrors.serverUrl);

  // 重新输入值 → 错误应该被清除
  wc.dispatch({ type: "SET_INPUT", settingsKey: "serverUrl", value: "https://example.com" });
  assert.equal(wc.getState().inputErrors.serverUrl, undefined, "serverUrl error cleared on new input");
});

// =============================================================================
// 15. STEP_TIMEOUT 范围限制 [5, 60]
// =============================================================================
test("R3a flow: STEP_TIMEOUT clamps to [5, 60]", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  // 默认 15
  assert.equal(wc.getState().values.connectTimeout, 15);

  // +1 → 16
  wc.dispatch({ type: "STEP_TIMEOUT", delta: 1 });
  assert.equal(wc.getState().values.connectTimeout, 16);

  // -100 → clamped to 5
  wc.dispatch({ type: "STEP_TIMEOUT", delta: -100 });
  assert.equal(wc.getState().values.connectTimeout, 5);

  // +100 → clamped to 60
  wc.dispatch({ type: "STEP_TIMEOUT", delta: 100 });
  assert.equal(wc.getState().values.connectTimeout, 60);
});

// =============================================================================
// 16. SELECT_AUTO_SYNC 只接受合法选项
// =============================================================================
test("R3a flow: SELECT_AUTO_SYNC only accepts valid options", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  // 非法值 → 被忽略
  wc.dispatch({ type: "SELECT_AUTO_SYNC", value: "每分钟" });
  assert.equal(wc.getState().values.autoSync, "每小时", "invalid option rejected");

  // 合法值
  wc.dispatch({ type: "SELECT_AUTO_SYNC", value: "每天" });
  assert.equal(wc.getState().values.autoSync, "每天");

  wc.dispatch({ type: "SELECT_AUTO_SYNC", value: "关闭" });
  assert.equal(wc.getState().values.autoSync, "关闭");
});

// =============================================================================
// 17. 持久化：values 变更写入 localStorage
// =============================================================================
test("R3a flow: values persisted to localStorage on change", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;
  const STORAGE_KEY = wc.storageKey;

  // 初始 localStorage 应该没有 webdav values
  assert.equal(r.storage.get(STORAGE_KEY, null), null, "no persisted values initially");

  // 修改 value → 应该持久化
  wc.dispatch({ type: "SET_INPUT", settingsKey: "serverUrl", value: "https://persisted.example.com" });
  const stored1 = r.storage.get(STORAGE_KEY, null);
  assert.ok(stored1 && typeof stored1 === "object", "values persisted as object");
  assert.equal(stored1.serverUrl, "https://persisted.example.com", "serverUrl persisted");

  // Toggle switch → should persist
  wc.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "sslVerify", value: false });
  const stored2 = r.storage.get(STORAGE_KEY, null);
  assert.equal(stored2.sslVerify, false, "sslVerify=false persisted");

  // Stepper → should persist
  wc.dispatch({ type: "STEP_TIMEOUT", delta: 1 });
  const stored3 = r.storage.get(STORAGE_KEY, null);
  assert.equal(stored3.connectTimeout, 16, "connectTimeout=16 persisted");

  // Transient state (dialog open/close, status) should NOT persist
  wc.dispatch({ type: "TEST_CONFIRM_OPEN" });
  wc.dispatch({ type: "TEST_CONFIRM_CLOSE" });
  const stored4 = r.storage.get(STORAGE_KEY, null);
  assert.ok(!stored4.test, "transient test dialog state NOT persisted");
  assert.ok(!stored4.save, "transient save dialog state NOT persisted");
  assert.ok(!stored4.clear, "transient clear dialog state NOT persisted");
});

// =============================================================================
// 18. 异步执行器：executeTest 成功
// =============================================================================
test("R3a flow: executeTest resolves success", async () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  wc.dispatch({ type: "TEST_CONFIRM_OPEN" });
  const result = await wc.executeTest({ simulateResult: "success", delay: 10 });

  assert.equal(result, "success");
  assert.equal(wc.getState().test.status, "success");
  assert.ok(wc.getState().test.result);
  assert.ok(wc.getState().test.result.latencyMs > 0);
});

// =============================================================================
// 19. 异步执行器：executeTest 失败
// =============================================================================
test("R3a flow: executeTest resolves failed", async () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  wc.dispatch({ type: "TEST_CONFIRM_OPEN" });
  const result = await wc.executeTest({ simulateResult: "failed", delay: 10, error: "超时" });

  assert.equal(result, "failed");
  assert.equal(wc.getState().test.status, "failed");
  assert.equal(wc.getState().test.error, "超时");
});

// =============================================================================
// 20. 异步执行器：executeSave 成功
// =============================================================================
test("R3a flow: executeSave resolves success", async () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  wc.dispatch({ type: "SAVE_CONFIRM_OPEN" });
  const result = await wc.executeSave({ simulateResult: "success", delay: 10 });

  assert.equal(result, "success");
  assert.equal(wc.getState().save.status, "success");
});

// =============================================================================
// 21. 异步执行器：executeClear 成功 + values 重置
// =============================================================================
test("R3a flow: executeClear resolves success and resets values", async () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  // 先修改
  wc.dispatch({ type: "SET_INPUT", settingsKey: "account", value: "modified@example.com" });
  assert.equal(wc.getState().values.account, "modified@example.com");

  wc.dispatch({ type: "CLEAR_CONFIRM_OPEN" });
  const result = await wc.executeClear({ simulateResult: "success", delay: 10 });

  assert.equal(result, "success");
  assert.equal(wc.getState().clear.status, "success");
  // values 重置
  assert.equal(wc.getState().values.account, "reader@example.com");
});

// =============================================================================
// 22. TOGGLE_SWITCH 更新 switch 值
// =============================================================================
test("R3a flow: TOGGLE_SWITCH updates switch value", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  assert.equal(wc.getState().values.sslVerify, true);

  wc.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "sslVerify", value: false });
  assert.equal(wc.getState().values.sslVerify, false);

  wc.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "wifiOnly", value: false });
  assert.equal(wc.getState().values.wifiOnly, false);
});
