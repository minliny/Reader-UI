// A2 (R2b + R3a) · Phase 8: Phone/Tablet 两视口实际操作 + 稳定终态验证
// -----------------------------------------------------------------------------
// 验证 settings-general 路由在三个视口下的实际操作和稳定终态：
//   - 三个视口的渲染输出（控件身份 + ARIA + 状态 owner 派生）完全一致
//   - 每种操作流（switch / select / segment / cache clear / permission / reset defaults）
//     在完成后都达到稳定终态：无 aria-busy、无 is-busy/is-loading class、无"…中"文本
//   - 幂等渲染：不 dispatch 时多次 render() 输出完全一致
//   - 两视口在完成所有操作后，state owner 终态一致（values 已持久化、transient 已清空）
//
// 两视口的实现方式：renderer 本身是 viewport-agnostic（不根据 viewport 分支），
// 视口差异完全由外层 .fd-demo[data-viewport-class] CSS 控制。因此本测试通过在
// 两个独立 sandbox 中分别模拟 phone/tablet 两个 demo-mode 包装来验证。
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
  { name: "phone",   viewportClass: "phone-portrait",     sizeHint: "390x844"  },
  { name: "tablet",  viewportClass: "tablet-portrait",    sizeHint: "760x960"  },
];

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

// 模拟两视口包装：在外层包一层 div 带 data-viewport-class
// 由于 renderer 本身不感知 viewport，这层包装不影响内层 HTML，
// 但能验证两视口下渲染输出的一致性。
function renderInViewport(r, viewportClass) {
  const inner = r.globalSettingsV2({}, "settings-general", {});
  return `<div class="fd-demo" data-demo-mode="regular" data-viewport-class="${viewportClass}">${inner}</div>`;
}

function render(r) {
  return r.globalSettingsV2({}, "settings-general", {});
}

// =============================================================================
// 1. 两视口渲染输出完全一致（控件身份 + ARIA + 状态派生）
// =============================================================================
test("A2 Phase 8: two-viewport render output is identical (control identity + ARIA + state)", () => {
  const outputs = VIEWPORTS.map(function (vp) {
    const r = freshSandbox();
    return renderInViewport(r, vp.viewportClass);
  });

  // 三个视口的 inner HTML 完全一致（只有外层 wrapper 不同）
  // 提取 inner 部分（去掉外层 wrapper）比较
  const innerHtmls = outputs.map(function (html) {
    const m = html.match(/^<div class="fd-demo"[^>]*>([\s\S]*)<\/div>$/);
    return m ? m[1] : html;
  });
  assert.equal(innerHtmls[0], innerHtmls[1], "phone == tablet inner HTML");

  // 10 个 subcontrol 的 control-key 都在两视口中存在
  const expectedControlKeys = [
    "settings.button.button.segment-option-1.app-theme@settings-general.default",
    "settings.button.button.segment-option-2.app-theme@settings-general.default",
    "settings.button.button.segment-option-3.app-theme@settings-general.default",
    "settings.combobox.combobox.language@settings-general.default",
    "settings.combobox.combobox.startup-screen@settings-general.default",
    "settings.combobox.combobox.animation-effect@settings-general.default",
    "settings.switch.switch.auto-check-update@settings-general.default",
    "settings.switch.switch.tap-bottom-scroll-top@settings-general.default",
    "settings.switch.switch.reduce-motion@settings-general.default",
    "settings.switch.switch.crash-log@settings-general.default",
  ];
  for (const ck of expectedControlKeys) {
    for (let i = 0; i < VIEWPORTS.length; i++) {
      const escaped = ck.replace(/\./g, "\\.");
      assert.ok(
        innerHtmls[i].includes(`data-control-key="${ck}"`),
        `${VIEWPORTS[i].name}: control-key ${ck} present`,
      );
    }
  }
});

// =============================================================================
// 2. switch 操作流稳定终态：toggle 后无 busy，多次 render 幂等
// =============================================================================
test("A2 Phase 8: switch toggle reaches stable terminal state across two viewports", () => {
  for (const vp of VIEWPORTS) {
    const r = freshSandbox();
    const sg = r.settingsGeneral;

    // 初始 render
    const initial = renderInViewport(r, vp.viewportClass);

    // toggle 一个 switch
    sg.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "auto-check-update", value: false });

    // 操作后 render
    const after = renderInViewport(r, vp.viewportClass);

    // 稳定终态：无 aria-busy、无 is-busy class
    assert.doesNotMatch(after, /aria-busy="true"/, `${vp.name}: no aria-busy after switch toggle`);
    assert.doesNotMatch(after, /is-busy"/, `${vp.name}: no is-busy class after switch toggle`);

    // 幂等：再 render 一次完全一致
    const again = renderInViewport(r, vp.viewportClass);
    assert.equal(after, again, `${vp.name}: idempotent render after switch toggle`);

    // 状态已持久化
    const stored = r.storage.get("settings-general-values");
    assert.equal(stored["auto-check-update"], false, `${vp.name}: switch value persisted`);
  }
});

// =============================================================================
// 3. select 操作流稳定终态
// =============================================================================
test("A2 Phase 8: select option reaches stable terminal state across two viewports", () => {
  for (const vp of VIEWPORTS) {
    const r = freshSandbox();
    const sg = r.settingsGeneral;

    sg.dispatch({ type: "SELECT_OPTION", settingsKey: "language", value: "en" });
    const after = renderInViewport(r, vp.viewportClass);

    assert.doesNotMatch(after, /aria-busy="true"/, `${vp.name}: no aria-busy after select`);
    assert.doesNotMatch(after, /is-busy"/, `${vp.name}: no is-busy class after select`);

    // 幂等
    const again = renderInViewport(r, vp.viewportClass);
    assert.equal(after, again, `${vp.name}: idempotent render after select`);

    // 持久化
    const stored = r.storage.get("settings-general-values");
    assert.equal(stored["language"], "en", `${vp.name}: select value persisted`);

    // 显示 label 已切换
    assert.match(after, />English</, `${vp.name}: language label updated to English`);
  }
});

// =============================================================================
// 4. segment 操作流稳定终态
// =============================================================================
test("A2 Phase 8: segment option reaches stable terminal state across two viewports", () => {
  for (const vp of VIEWPORTS) {
    const r = freshSandbox();
    const sg = r.settingsGeneral;

    sg.dispatch({ type: "SELECT_OPTION", settingsKey: "app-theme", value: "dark" });
    const after = renderInViewport(r, vp.viewportClass);

    assert.doesNotMatch(after, /aria-busy="true"/, `${vp.name}: no aria-busy after segment`);
    assert.doesNotMatch(after, /is-busy"/, `${vp.name}: no is-busy class after segment`);

    // option 3 (深色) is-active
    const opt3Re = /<button class="is-active" type="button"[^>]*data-settings-key="app-theme-segment-option-3"[^>]*aria-pressed="true"/;
    assert.match(after, opt3Re, `${vp.name}: segment option 3 (深色) active`);

    // 幂等
    const again = renderInViewport(r, vp.viewportClass);
    assert.equal(after, again, `${vp.name}: idempotent render after segment`);
  }
});

// =============================================================================
// 5. cache clear 流程稳定终态：confirm → start → success，终态无 loading
// =============================================================================
test("A2 Phase 8: cache clear success reaches stable terminal state across two viewports", async () => {
  for (const vp of VIEWPORTS) {
    const r = freshSandbox();
    const sg = r.settingsGeneral;

    sg.dispatch({ type: "CACHE_CLEAR_CONFIRM" });
    const promise = sg.executeCacheClear({ delay: 5 });
    await promise;

    const after = renderInViewport(r, vp.viewportClass);

    // 稳定终态：无 aria-busy、无"清理中…"、无 is-busy class
    assert.doesNotMatch(after, /aria-busy="true"/, `${vp.name}: no aria-busy after cache clear`);
    assert.doesNotMatch(after, /is-busy"/, `${vp.name}: no is-busy class after cache clear`);
    assert.doesNotMatch(after, /清理中…/, `${vp.name}: no "清理中…" text after cache clear`);

    // 显示 "已清理"
    assert.match(after, />已清理</, `${vp.name}: shows "已清理" after cache clear success`);

    // transient 状态未持久化（cacheClear 不写入 localStorage）
    const stored = r.storage.get("settings-general-values");
    assert.ok(stored === undefined || stored.cacheClear === undefined, `${vp.name}: cacheClear transient NOT persisted`);

    // 幂等
    const again = renderInViewport(r, vp.viewportClass);
    assert.equal(after, again, `${vp.name}: idempotent render after cache clear`);
  }
});

// =============================================================================
// 6. cache clear failed 稳定终态：显示重试按钮，aria-invalid，无 busy
// =============================================================================
test("A2 Phase 8: cache clear failed reaches stable terminal state across two viewports", async () => {
  for (const vp of VIEWPORTS) {
    const r = freshSandbox();
    const sg = r.settingsGeneral;

    sg.dispatch({ type: "CACHE_CLEAR_CONFIRM" });
    const promise = sg.executeCacheClear({ delay: 5, simulateResult: "failed" });
    await promise;

    const after = renderInViewport(r, vp.viewportClass);

    assert.doesNotMatch(after, /aria-busy="true"/, `${vp.name}: no aria-busy after cache clear failed`);
    assert.doesNotMatch(after, /清理中…/, `${vp.name}: no "清理中…" text after failed`);
    assert.match(after, /aria-invalid="true"/, `${vp.name}: has aria-invalid after failed`);
    assert.match(after, />重试</, `${vp.name}: shows "重试" button after failed`);

    // 幂等
    const again = renderInViewport(r, vp.viewportClass);
    assert.equal(after, again, `${vp.name}: idempotent render after cache clear failed`);
  }
});

// =============================================================================
// 7. permission 流程稳定终态：granted 后 disabled，无 busy
// =============================================================================
test("A2 Phase 8: permission granted reaches stable terminal state across two viewports", async () => {
  for (const vp of VIEWPORTS) {
    const r = freshSandbox(() => Promise.resolve("granted"));
    const sg = r.settingsGeneral;

    const promise = sg.requestPermission("file-access");
    await promise;

    const after = renderInViewport(r, vp.viewportClass);

    assert.doesNotMatch(after, /aria-busy="true"/, `${vp.name}: no aria-busy after permission granted`);
    assert.doesNotMatch(after, /请求中…/, `${vp.name}: no "请求中…" text after granted`);
    assert.match(after, />已授权</, `${vp.name}: shows "已授权" after granted`);

    // granted 按钮应 disabled
    const grantedBtnRe = /<button class="fd-settings-row-action is-success" type="button"[^>]*disabled[^>]*>已授权<\/button>/;
    assert.match(after, grantedBtnRe, `${vp.name}: granted button disabled`);

    // transient 未持久化（permissions 不写入 localStorage）
    const stored = r.storage.get("settings-general-values");
    assert.ok(stored === undefined || stored.permissions === undefined, `${vp.name}: permissions transient NOT persisted`);

    // 幂等
    const again = renderInViewport(r, vp.viewportClass);
    assert.equal(after, again, `${vp.name}: idempotent render after permission granted`);
  }
});

// =============================================================================
// 8. permission denied 稳定终态：显示"去设置"，无 busy
// =============================================================================
test("A2 Phase 8: permission denied reaches stable terminal state across two viewports", async () => {
  for (const vp of VIEWPORTS) {
    const r = freshSandbox(() => Promise.resolve("denied"));
    const sg = r.settingsGeneral;

    const promise = sg.requestPermission("notification");
    await promise;

    const after = renderInViewport(r, vp.viewportClass);

    assert.doesNotMatch(after, /aria-busy="true"/, `${vp.name}: no aria-busy after denied`);
    assert.doesNotMatch(after, /请求中…/, `${vp.name}: no "请求中…" text after denied`);
    assert.match(after, />去设置</, `${vp.name}: shows "去设置" after denied`);

    // 幂等
    const again = renderInViewport(r, vp.viewportClass);
    assert.equal(after, again, `${vp.name}: idempotent render after denied`);
  }
});

// =============================================================================
// 9. reset defaults 流程稳定终态：values 全部回到默认，显示"已恢复"
// =============================================================================
test("A2 Phase 8: reset defaults reaches stable terminal state across two viewports", async () => {
  for (const vp of VIEWPORTS) {
    const r = freshSandbox();
    const sg = r.settingsGeneral;

    // 先修改一些值
    sg.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "auto-check-update", value: false });
    sg.dispatch({ type: "SELECT_OPTION", settingsKey: "language", value: "en" });

    // 确认修改已生效
    const before = sg.getState().values;
    assert.equal(before["auto-check-update"], false, `${vp.name}: pre-reset value modified`);
    assert.equal(before["language"], "en", `${vp.name}: pre-reset language modified`);

    // 执行 reset
    sg.dispatch({ type: "RESET_DEFAULTS_CONFIRM" });
    const promise = sg.executeResetDefaults({ delay: 5 });
    await promise;

    const after = renderInViewport(r, vp.viewportClass);

    // 稳定终态：无 aria-busy、无"恢复中…"
    assert.doesNotMatch(after, /aria-busy="true"/, `${vp.name}: no aria-busy after reset`);
    assert.doesNotMatch(after, /恢复中…/, `${vp.name}: no "恢复中…" text after reset`);
    assert.match(after, />已恢复</, `${vp.name}: shows "已恢复" after reset`);

    // values 全部回默认
    const values = sg.getState().values;
    assert.equal(values["auto-check-update"], true, `${vp.name}: auto-check-update restored to default`);
    assert.equal(values["language"], "zh-CN", `${vp.name}: language restored to default`);

    // 默认值已持久化
    const stored = r.storage.get("settings-general-values");
    assert.equal(stored["auto-check-update"], true, `${vp.name}: defaults persisted`);

    // 幂等
    const again = renderInViewport(r, vp.viewportClass);
    assert.equal(after, again, `${vp.name}: idempotent render after reset`);
  }
});

// =============================================================================
// 10. reset defaults cancel 保持当前值，无 busy
// =============================================================================
test("A2 Phase 8: reset defaults cancel preserves values across two viewports", () => {
  for (const vp of VIEWPORTS) {
    const r = freshSandbox();
    const sg = r.settingsGeneral;

    // 修改值
    sg.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "auto-check-update", value: false });

    // 进入 confirm 状态后取消
    sg.dispatch({ type: "RESET_DEFAULTS_CONFIRM" });
    sg.dispatch({ type: "RESET_DEFAULTS_CANCEL" });

    const after = renderInViewport(r, vp.viewportClass);

    assert.doesNotMatch(after, /aria-busy="true"/, `${vp.name}: no aria-busy after cancel`);
    assert.doesNotMatch(after, /恢复中…/, `${vp.name}: no "恢复中…" text after cancel`);

    // values 保持不变
    const values = sg.getState().values;
    assert.equal(values["auto-check-update"], false, `${vp.name}: values preserved after cancel`);

    // 幂等
    const again = renderInViewport(r, vp.viewportClass);
    assert.equal(after, again, `${vp.name}: idempotent render after cancel`);
  }
});

// =============================================================================
// 11. 完整用户旅程：toggle + select + cache clear + permission + reset，最终稳定
// =============================================================================
test("A2 Phase 8: full user journey reaches stable terminal state across two viewports", async () => {
  for (const vp of VIEWPORTS) {
    const r = freshSandbox(() => Promise.resolve("granted"));
    const sg = r.settingsGeneral;

    // 1. toggle 2 个 switch
    sg.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "auto-check-update", value: false });
    sg.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "reduce-motion", value: true });

    // 2. select 2 个 option
    sg.dispatch({ type: "SELECT_OPTION", settingsKey: "language", value: "en" });
    sg.dispatch({ type: "SELECT_OPTION", settingsKey: "startup-screen", value: "reader" });

    // 3. segment option
    sg.dispatch({ type: "SELECT_OPTION", settingsKey: "app-theme", value: "dark" });

    // 4. cache clear
    sg.dispatch({ type: "CACHE_CLEAR_CONFIRM" });
    await sg.executeCacheClear({ delay: 5 });

    // 5. permission
    await sg.requestPermission("battery");

    // 6. reset defaults (覆盖前面所有修改)
    sg.dispatch({ type: "RESET_DEFAULTS_CONFIRM" });
    await sg.executeResetDefaults({ delay: 5 });

    // 最终 render
    const final = renderInViewport(r, vp.viewportClass);

    // 稳定终态检查
    assert.doesNotMatch(final, /aria-busy="true"/, `${vp.name}: no aria-busy in final state`);
    assert.doesNotMatch(final, /is-busy"/, `${vp.name}: no is-busy class in final state`);
    assert.doesNotMatch(final, /清理中…|请求中…|恢复中…/, `${vp.name}: no loading text in final state`);

    // values 全部回默认（reset 已执行）
    const values = sg.getState().values;
    assert.equal(values["auto-check-update"], true, `${vp.name}: final auto-check-update=default`);
    assert.equal(values["reduce-motion"], false, `${vp.name}: final reduce-motion=default`);
    assert.equal(values["language"], "zh-CN", `${vp.name}: final language=default`);
    assert.equal(values["startup-screen"], "bookshelf", `${vp.name}: final startup-screen=default`);
    assert.equal(values["app-theme"], "follow-system", `${vp.name}: final app-theme=default`);

    // cacheClear transient 处于 success 终态（不会自动回到 idle，需要显式 RESET）
    assert.equal(sg.getState().cacheClear.status, "success", `${vp.name}: final cacheClear=success`);
    assert.equal(sg.getState().cacheClear.lastError, null, `${vp.name}: final cacheClear.lastError=null`);

    // permissions 已 granted
    assert.equal(sg.getState().permissions["battery"], "granted", `${vp.name}: final battery=granted`);

    // resetDefaults 状态已 success
    assert.equal(sg.getState().resetDefaults.status, "success", `${vp.name}: final resetDefaults=success`);

    // 幂等
    const again = renderInViewport(r, vp.viewportClass);
    assert.equal(final, again, `${vp.name}: idempotent render in final state`);
  }
});

// =============================================================================
// 12. 两视口最终终态一致：相同操作序列 → 相同 state owner 终态
// =============================================================================
test("A2 Phase 8: two viewports reach identical terminal state under same operation sequence", async () => {
  const finalStates = [];
  for (const vp of VIEWPORTS) {
    const r = freshSandbox(() => Promise.resolve("granted"));
    const sg = r.settingsGeneral;

    sg.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "reduce-motion", value: true });
    sg.dispatch({ type: "SELECT_OPTION", settingsKey: "language", value: "zh-TW" });
    sg.dispatch({ type: "CACHE_CLEAR_CONFIRM" });
    await sg.executeCacheClear({ delay: 5 });
    await sg.requestPermission("file-access");

    finalStates.push({
      values: JSON.parse(JSON.stringify(sg.getState().values)),
      cacheClear: {
        status: sg.getState().cacheClear.status,
        lastError: sg.getState().cacheClear.lastError,
        // 忽略 lastClearedAt 时间戳（两视口执行时间不同）
      },
      permissions: JSON.parse(JSON.stringify(sg.getState().permissions)),
      resetDefaults: JSON.parse(JSON.stringify(sg.getState().resetDefaults)),
    });
  }

  // 两个视口的终态完全一致
  assert.deepEqual(finalStates[0].values, finalStates[1].values, "phone == tablet final values");
  assert.deepEqual(finalStates[0].cacheClear, finalStates[1].cacheClear, "phone == tablet final cacheClear");
  assert.deepEqual(finalStates[0].permissions, finalStates[1].permissions, "phone == tablet final permissions");
});
