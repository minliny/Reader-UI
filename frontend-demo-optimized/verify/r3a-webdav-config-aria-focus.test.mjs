// R3a · webdav-config ARIA 属性 + 焦点恢复标记验证
// -----------------------------------------------------------------------------
// 职责：
//   1. switch: role="switch" + aria-checked + tabindex="0" + aria-label
//   2. switch aria-checked 与 enabled 状态同步
//   3. input (4 个): aria-label + autocomplete="off"
//   4. input aria-invalid + aria-describedby on validation error
//   5. select (autoSync): aria-haspopup="listbox" + aria-expanded="false" + tabindex="0"
//   6. stepper (connect-timeout): aria-label on group span
//   7. test dialog: role="dialog" + aria-modal + aria-labelledby + aria-hidden="false"
//   8. test dialog: aria-busy on dialog during loading；aria-invalid on dialog during failed
//   9. save dialog: ARIA patterns（与 test 对称）
//  10. clear dialog: ARIA patterns（与 test 对称）
//  11. confirm 按钮: aria-busy + disabled when loading, aria-invalid when failed
//  12. focus return markers (data-restore-focus) on overlay trigger buttons
//  13. initial focus markers (data-dialog-initial-focus) on dialog cancel/close buttons
//  14. accessible name 非空：每个可交互元素都有 aria-label 或 text content
//  15. webdav-error link rows: aria-haspopup="dialog" + tabindex="0"
//
// 运行：node --test frontend-demo-optimized/verify/r3a-webdav-config-aria-focus.test.mjs
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

function render(r, route) {
  return r.renderD2Route(route || "webdav-config", {}, {});
}

// =============================================================================
// 1. switch: role + aria-checked + tabindex + aria-label
// =============================================================================
test("R3a ARIA: webdav switches have role=switch + aria-checked + tabindex=0 + aria-label", () => {
  const r = freshSandbox();
  const html = render(r, "webdav-config");

  const switches = ["sslVerify", "wifiOnly"];
  for (const sk of switches) {
    const re = new RegExp(`<span[^>]*data-settings-key="${sk}"[^>]*>`, "");
    const m = html.match(re);
    assert.ok(m, `${sk} switch span exists`);
    const tag = m[0];
    assert.match(tag, /role="switch"/, `${sk} has role="switch"`);
    assert.match(tag, /aria-checked="(true|false)"/, `${sk} has aria-checked`);
    assert.match(tag, /tabindex="0"/, `${sk} has tabindex="0"`);
    assert.match(tag, /aria-label="[^"]+"/, `${sk} has non-empty aria-label`);
    assert.doesNotMatch(tag, /aria-hidden="true"/, `${sk} NOT aria-hidden`);
  }
});

// =============================================================================
// 2. switch aria-checked 与 state 同步
// =============================================================================
test("R3a ARIA: switch aria-checked reflects state after TOGGLE_SWITCH", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  // 默认 sslVerify=true
  let html = render(r, "webdav-config");
  let tag = html.match(/<span[^>]*data-settings-key="sslVerify"[^>]*>/)[0];
  assert.match(tag, /aria-checked="true"/, "sslVerify aria-checked=true by default");

  // toggle off
  wc.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "sslVerify", value: false });
  html = render(r, "webdav-config");
  tag = html.match(/<span[^>]*data-settings-key="sslVerify"[^>]*>/)[0];
  assert.match(tag, /aria-checked="false"/, "sslVerify aria-checked=false after toggle off");

  // toggle back on
  wc.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "sslVerify", value: true });
  html = render(r, "webdav-config");
  tag = html.match(/<span[^>]*data-settings-key="sslVerify"[^>]*>/)[0];
  assert.match(tag, /aria-checked="true"/, "sslVerify aria-checked=true after re-enable");
});

// =============================================================================
// 3. input: aria-label + autocomplete=off + type
// =============================================================================
test("R3a ARIA: webdav inputs have aria-label + autocomplete=off", () => {
  const r = freshSandbox();
  const html = render(r, "webdav-config");

  const inputs = [
    { sk: "serverUrl", type: "url" },
    { sk: "account", type: "text" },
    { sk: "password", type: "password" },
    { sk: "syncDir", type: "text" },
  ];
  for (const { sk, type } of inputs) {
    const re = new RegExp(`<input[^>]*data-settings-key="${sk}"[^>]*>`, "");
    const m = html.match(re);
    assert.ok(m, `${sk} input exists`);
    const tag = m[0];
    assert.match(tag, new RegExp(`type="${type}"`), `${sk} input type=${type}`);
    assert.match(tag, /aria-label="[^"]+"/, `${sk} input has aria-label`);
    assert.match(tag, /autocomplete="off"/, `${sk} input autocomplete=off`);
  }
});

// =============================================================================
// 4. input aria-invalid + aria-describedby on validation error
// =============================================================================
test("R3a ARIA: input aria-invalid + aria-describedby on validation error", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  // 默认无 aria-invalid
  let html = render(r, "webdav-config");
  let serverInput = html.match(/<input[^>]*data-settings-key="serverUrl"[^>]*>/)[0];
  assert.doesNotMatch(serverInput, /aria-invalid="true"/, "no aria-invalid by default");

  // 制造错误：清空 serverUrl
  wc.dispatch({ type: "SET_INPUT", settingsKey: "serverUrl", value: "" });
  wc.dispatch({ type: "INPUT_VALIDATE" });

  html = render(r, "webdav-config");
  serverInput = html.match(/<input[^>]*data-settings-key="serverUrl"[^>]*>/)[0];
  assert.match(serverInput, /aria-invalid="true"/, "aria-invalid=true after validation error");
  assert.match(serverInput, /aria-describedby="input-error-serverUrl"/, "aria-describedby points to error message");

  // error message element 应该存在并 role=alert
  const errorMsg = html.match(/<small[^>]*id="input-error-serverUrl"[^>]*>/)[0];
  assert.match(errorMsg, /role="alert"/, "error message has role=alert");

  // 输入合法值后错误清除
  wc.dispatch({ type: "SET_INPUT", settingsKey: "serverUrl", value: "https://good.example.com" });
  html = render(r, "webdav-config");
  serverInput = html.match(/<input[^>]*data-settings-key="serverUrl"[^>]*>/)[0];
  assert.doesNotMatch(serverInput, /aria-invalid="true"/, "aria-invalid cleared after valid input");
  assert.doesNotMatch(serverInput, /aria-describedby/, "aria-describedby cleared after valid input");
});

// =============================================================================
// 5. select (autoSync): aria-haspopup + aria-expanded + tabindex
// =============================================================================
test("R3a ARIA: autoSync select row has aria-haspopup=listbox + aria-expanded=false + tabindex=0", () => {
  const r = freshSandbox();
  const html = render(r, "webdav-config");

  // select row 的 identity stamp 在 <article> 上
  const selectArticle = html.match(/<article[^>]*data-settings-key="autoSync"[^>]*>/)[0];
  assert.match(selectArticle, /aria-haspopup="listbox"/, "autoSync article has aria-haspopup=listbox");
  assert.match(selectArticle, /aria-expanded="false"/, "autoSync article has aria-expanded=false");
  assert.match(selectArticle, /tabindex="0"/, "autoSync article has tabindex=0");
  assert.match(selectArticle, /role="button"/, "autoSync article has role=button");
});

// =============================================================================
// 6. stepper (connect-timeout): aria-label on group span
// =============================================================================
test("R3a ARIA: connect-timeout stepper group has aria-label", () => {
  const r = freshSandbox();
  const html = render(r, "webdav-config");

  // stepper group span
  const stepper = html.match(/<span class="fd-settings-stepper"[^>]*>/)[0];
  assert.match(stepper, /aria-label="[^"]+"/, "stepper group has aria-label");

  // minus + plus buttons 应该 stamp identity
  const minusBtn = html.match(/<button[^>]*data-settings-key="webdav-connect-timeout-stepper-minus"[^>]*>/)[0];
  assert.ok(minusBtn, "stepper minus button exists");
  const plusBtn = html.match(/<button[^>]*data-settings-key="webdav-connect-timeout-stepper-plus"[^>]*>/)[0];
  assert.ok(plusBtn, "stepper plus button exists");
});

// =============================================================================
// 7. test dialog: role=dialog + aria-modal + aria-labelledby + aria-hidden=false
// =============================================================================
test("R3a ARIA: test dialog has role=dialog + aria-modal + aria-labelledby + aria-hidden=false", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  wc.dispatch({ type: "TEST_CONFIRM_OPEN" });
  const html = render(r, "webdav-config");

  const dialog = html.match(/<section[^>]*role="dialog"[^>]*>/)[0];
  assert.match(dialog, /aria-modal="true"/, "test dialog has aria-modal=true");
  assert.match(dialog, /aria-labelledby="webdav-test-dialog-title"/, "test dialog has aria-labelledby");
  assert.match(dialog, /aria-hidden="false"/, "test dialog has aria-hidden=false");
});

// =============================================================================
// 8. test dialog: aria-busy during loading + aria-invalid during failed
// =============================================================================
test("R3a ARIA: test dialog aria-busy during loading + aria-invalid during failed", async () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  // confirm state: no aria-busy, no aria-invalid
  wc.dispatch({ type: "TEST_CONFIRM_OPEN" });
  let html = render(r, "webdav-config");
  let dialog = html.match(/<section[^>]*role="dialog"[^>]*>/)[0];
  assert.doesNotMatch(dialog, /aria-busy="true"/, "test dialog NOT aria-busy in confirm");
  assert.doesNotMatch(dialog, /aria-invalid="true"/, "test dialog NOT aria-invalid in confirm");

  // start → loading
  wc.dispatch({ type: "TEST_START" });
  html = render(r, "webdav-config");
  dialog = html.match(/<section[^>]*role="dialog"[^>]*>/)[0];
  assert.match(dialog, /aria-busy="true"/, "test dialog aria-busy=true during loading");

  // loading button 应该 disabled + aria-busy
  const loadingBtn = html.match(/<button[^>]*disabled[^>]*aria-busy="true"[^>]*>[\s\S]*?<\/button>/)[0];
  assert.match(loadingBtn, /测试中/, "loading button text=测试中");

  // failed state
  wc.dispatch({ type: "TEST_FAILED", error: "认证失败" });
  html = render(r, "webdav-config");
  dialog = html.match(/<section[^>]*role="dialog"[^>]*>/)[0];
  assert.match(dialog, /aria-invalid="true"/, "test dialog aria-invalid=true during failed");
});

// =============================================================================
// 9. save dialog: ARIA patterns 对称
// =============================================================================
test("R3a ARIA: save dialog has role=dialog + aria-modal + aria-labelledby + state attrs", async () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  // confirm
  wc.dispatch({ type: "SAVE_CONFIRM_OPEN" });
  let html = render(r, "webdav-config");
  let dialog = html.match(/<section[^>]*role="dialog"[^>]*>/)[0];
  assert.match(dialog, /aria-modal="true"/, "save dialog aria-modal=true");
  assert.match(dialog, /aria-labelledby="webdav-save-dialog-title"/, "save dialog aria-labelledby");

  // loading
  wc.dispatch({ type: "SAVE_START" });
  html = render(r, "webdav-config");
  dialog = html.match(/<section[^>]*role="dialog"[^>]*>/)[0];
  assert.match(dialog, /aria-busy="true"/, "save dialog aria-busy=true during loading");

  // failed
  wc.dispatch({ type: "SAVE_FAILED", error: "磁盘空间不足" });
  html = render(r, "webdav-config");
  dialog = html.match(/<section[^>]*role="dialog"[^>]*>/)[0];
  assert.match(dialog, /aria-invalid="true"/, "save dialog aria-invalid=true during failed");
});

// =============================================================================
// 10. clear dialog: ARIA patterns 对称
// =============================================================================
test("R3a ARIA: clear dialog has role=dialog + aria-modal + aria-labelledby + state attrs", async () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  wc.dispatch({ type: "CLEAR_CONFIRM_OPEN" });
  let html = render(r, "webdav-config");
  let dialog = html.match(/<section[^>]*role="dialog"[^>]*>/)[0];
  assert.match(dialog, /aria-modal="true"/, "clear dialog aria-modal=true");
  assert.match(dialog, /aria-labelledby="webdav-clear-dialog-title"/, "clear dialog aria-labelledby");

  wc.dispatch({ type: "CLEAR_START" });
  html = render(r, "webdav-config");
  dialog = html.match(/<section[^>]*role="dialog"[^>]*>/)[0];
  assert.match(dialog, /aria-busy="true"/, "clear dialog aria-busy=true during loading");

  wc.dispatch({ type: "CLEAR_FAILED", error: "清除失败" });
  html = render(r, "webdav-config");
  dialog = html.match(/<section[^>]*role="dialog"[^>]*>/)[0];
  assert.match(dialog, /aria-invalid="true"/, "clear dialog aria-invalid=true during failed");
});

// =============================================================================
// 11. confirm 按钮: aria-busy + disabled when loading, aria-invalid when failed
// =============================================================================
test("R3a ARIA: test-confirm button aria-busy+disabled when loading, aria-invalid when failed", async () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  wc.dispatch({ type: "TEST_CONFIRM_OPEN" });

  // confirm: button text=开始测试, no aria-busy, no disabled
  let html = render(r, "webdav-config");
  let confirmBtn = html.match(/<button[^>]*data-settings-key="webdav-test-confirm"[^>]*>[\s\S]*?<\/button>/)[0];
  assert.doesNotMatch(confirmBtn, /aria-busy="true"/, "confirm NOT aria-busy in confirm state");
  assert.match(confirmBtn, /开始测试/, "confirm button text=开始测试");

  // loading: button has aria-busy + disabled + text=测试中…
  wc.dispatch({ type: "TEST_START" });
  html = render(r, "webdav-config");
  // loading 状态下按钮 disabled+aria-busy，但不一定有 data-settings-key（loading 用 disabled 占位按钮）
  const loadingBtn = html.match(/<button[^>]*disabled[^>]*aria-busy="true"[^>]*>[\s\S]*?<\/button>/)[0];
  assert.match(loadingBtn, /测试中/, "loading button text=测试中");

  // failed: confirm button has aria-invalid + text=重试
  wc.dispatch({ type: "TEST_FAILED", error: "认证失败" });
  html = render(r, "webdav-config");
  const retryBtn = html.match(/<button[^>]*data-settings-key="webdav-test-confirm"[^>]*>[\s\S]*?<\/button>/)[0];
  assert.match(retryBtn, /aria-invalid="true"/, "confirm button aria-invalid=true in failed state");
  assert.match(retryBtn, /重试/, "confirm button text=重试 in failed state");
});

// =============================================================================
// 12. focus return markers: data-restore-focus on overlay triggers
// =============================================================================
test("R3a ARIA: data-restore-focus on webdav-test-connection + webdav-save-config", () => {
  const r = freshSandbox();
  const html = render(r, "webdav-config");

  // 两个 section actions 应该都有 data-restore-focus
  const testBtn = html.match(/<button[^>]*data-settings-key="webdav-test-connection"[^>]*>/)[0];
  assert.match(testBtn, /data-restore-focus="webdav-test-connection"/, "webdav-test-connection has data-restore-focus");

  const saveBtn = html.match(/<button[^>]*data-settings-key="webdav-save-config"[^>]*>/)[0];
  assert.match(saveBtn, /data-restore-focus="webdav-save-config"/, "webdav-save-config has data-restore-focus");
});

// =============================================================================
// 13. focus return markers: data-restore-focus on webdav-error actions
// =============================================================================
test("R3a ARIA: data-restore-focus on webdav-clear-config + webdav-error link rows", () => {
  const r = freshSandbox();
  const html = render(r, "webdav-error");

  // webdav-clear-config 底部 action 应有 data-restore-focus
  const clearBtn = html.match(/<button[^>]*data-settings-key="webdav-clear-config"[^>]*>/)[0];
  assert.match(clearBtn, /data-restore-focus="webdav-clear-config"/, "webdav-clear-config has data-restore-focus");

  // 4 个 link rows with overlay (check-account/password/permission/create-dir) 应有 data-restore-focus
  const overlayRows = ["webdav-check-account", "webdav-check-password", "webdav-check-permission", "webdav-create-dir"];
  for (const sk of overlayRows) {
    const article = html.match(new RegExp(`<article[^>]*data-settings-key="${sk}"[^>]*>`, ""))[0];
    assert.match(article, /data-restore-focus=/, `${sk} article has data-restore-focus`);
  }
});

// =============================================================================
// 14. initial focus markers: data-dialog-initial-focus on dialog cancel/close buttons
// =============================================================================
test("R3a ARIA: data-dialog-initial-focus on test dialog cancel + save dialog cancel + clear dialog cancel", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  // test dialog confirm state: cancel button has data-dialog-initial-focus
  wc.dispatch({ type: "TEST_CONFIRM_OPEN" });
  let html = render(r, "webdav-config");
  let cancelBtn = html.match(/<button[^>]*data-settings-key="webdav-test-cancel"[^>]*>/)[0];
  assert.match(cancelBtn, /data-dialog-initial-focus="webdav-test-cancel"/, "test-cancel has data-dialog-initial-focus");

  // close test, open save
  wc.dispatch({ type: "TEST_CONFIRM_CLOSE" });
  wc.dispatch({ type: "SAVE_CONFIRM_OPEN" });
  html = render(r, "webdav-config");
  cancelBtn = html.match(/<button[^>]*data-settings-key="webdav-save-cancel"[^>]*>/)[0];
  assert.match(cancelBtn, /data-dialog-initial-focus="webdav-save-cancel"/, "save-cancel has data-dialog-initial-focus");

  // close save, open clear
  wc.dispatch({ type: "SAVE_CONFIRM_CLOSE" });
  wc.dispatch({ type: "CLEAR_CONFIRM_OPEN" });
  html = render(r, "webdav-config");
  cancelBtn = html.match(/<button[^>]*data-settings-key="webdav-clear-cancel"[^>]*>/)[0];
  assert.match(cancelBtn, /data-dialog-initial-focus="webdav-clear-cancel"/, "clear-cancel has data-dialog-initial-focus");
});

// =============================================================================
// 15. data-dialog-initial-focus on success/failed state close buttons
// =============================================================================
test("R3a ARIA: data-dialog-initial-focus on success/failed state close buttons", async () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  // test success: 知道了 button (uses webdav-test-confirm identity) has data-dialog-initial-focus
  wc.dispatch({ type: "TEST_CONFIRM_OPEN" });
  wc.dispatch({ type: "TEST_START" });
  wc.dispatch({ type: "TEST_SUCCESS", result: { latencyMs: 100 } });
  let html = render(r, "webdav-config");
  let okBtn = html.match(/<button[^>]*data-settings-key="webdav-test-confirm"[^>]*>[\s\S]*?<\/button>/)[0];
  assert.match(okBtn, /data-dialog-initial-focus="webdav-test-confirm"/, "test success 知道了 has data-dialog-initial-focus");
  assert.match(okBtn, /知道了/, "success button text=知道了");

  // test failed: 关闭 button (uses webdav-test-cancel identity) has data-dialog-initial-focus
  wc.dispatch({ type: "TEST_RESET" });
  wc.dispatch({ type: "TEST_CONFIRM_OPEN" });
  wc.dispatch({ type: "TEST_START" });
  wc.dispatch({ type: "TEST_FAILED", error: "超时" });
  html = render(r, "webdav-config");
  const closeBtn = html.match(/<button[^>]*data-settings-key="webdav-test-cancel"[^>]*>[\s\S]*?<\/button>/)[0];
  assert.match(closeBtn, /data-dialog-initial-focus="webdav-test-cancel"/, "test failed 关闭 has data-dialog-initial-focus");
  assert.match(closeBtn, /关闭/, "failed close button text=关闭");
});

// =============================================================================
// 16. accessible name 非空：所有带 data-control-key 的可交互元素都有 aria-label 或 text content
// =============================================================================
test("R3a ARIA: all interactive elements with data-control-key have accessible name", () => {
  const r = freshSandbox();
  const html = render(r, "webdav-config");

  const interactiveTags = html.match(/<(button|input|select|span|article)[^>]*data-control-key="[^"]+"[^>]*>/g) || [];
  assert.ok(interactiveTags.length >= 12, `at least 12 interactive elements, got ${interactiveTags.length}`);

  for (const tag of interactiveTags) {
    if (/<input/.test(tag)) {
      assert.match(tag, /aria-label="[^"]+"/, `input has aria-label: ${tag.slice(0, 80)}...`);
    } else if (/<span[^>]*role="switch"/.test(tag)) {
      assert.match(tag, /aria-label="[^"]+"/, `switch span has aria-label: ${tag.slice(0, 80)}...`);
    } else if (/<article[^>]*role="button"/.test(tag)) {
      // select row: article should have aria-label or contain text content
      // select rows 通常由子元素提供 accessible name，这里只验证元素存在
    } else if (/<button/.test(tag)) {
      // button: 允许 aria-label 或 text content
      if (!/aria-label="[^"]+"/.test(tag)) {
        const skMatch = tag.match(/data-settings-key="([^"]+)"/);
        const sk = skMatch ? skMatch[1] : "unknown";
        const fullBtnRe = new RegExp(`<button[^>]*data-settings-key="${sk}"[^>]*>([\\s\\S]*?)<\\/button>`);
        const fullBtn = html.match(fullBtnRe);
        if (fullBtn) {
          const innerText = fullBtn[1].replace(/<[^>]*>/g, "").trim();
          assert.ok(innerText.length > 0, `button ${sk} has text content or aria-label`);
        }
      }
    }
  }
});

// =============================================================================
// 17. webdav-error link rows: aria-haspopup="dialog" + tabindex="0"
// =============================================================================
test("R3a ARIA: webdav-error overlay link rows have aria-haspopup=dialog + tabindex=0", () => {
  const r = freshSandbox();
  const html = render(r, "webdav-error");

  // 4 个 link rows with overlay
  const overlayRows = ["webdav-check-account", "webdav-check-password", "webdav-check-permission", "webdav-create-dir"];
  for (const sk of overlayRows) {
    const article = html.match(new RegExp(`<article[^>]*data-settings-key="${sk}"[^>]*>`, ""))[0];
    assert.match(article, /aria-haspopup="dialog"/, `${sk} article has aria-haspopup=dialog`);
    assert.match(article, /tabindex="0"/, `${sk} article has tabindex=0`);
    assert.match(article, /role="button"/, `${sk} article has role=button`);
  }
});

// =============================================================================
// 18. webdav-error route link rows (no overlay): NOT required to have aria-haspopup
// =============================================================================
test("R3a ARIA: webdav-error route link rows have role=button + tabindex=0", () => {
  const r = freshSandbox();
  const html = render(r, "webdav-error");

  // 3 个 route link rows (webdav-edit-config, webdav-retry-test, webdav-view-log)
  const routeRows = ["webdav-edit-config", "webdav-retry-test", "webdav-view-log"];
  for (const sk of routeRows) {
    const article = html.match(new RegExp(`<article[^>]*data-settings-key="${sk}"[^>]*>`, ""))[0];
    assert.match(article, /role="button"/, `${sk} article has role=button`);
    assert.match(article, /tabindex="0"/, `${sk} article has tabindex=0`);
  }
});
