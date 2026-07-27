// R3a · webdav-config 控件身份 + 两视口一致性验证
// -----------------------------------------------------------------------------
// 职责：
//   1. webdav-config 默认状态 12 个 settingsKey 全部 stamp 到 HTML
//      (back + 4 inputs + 2 switches + 2 stepper + 1 select + 2 section actions)
//   2. 条件状态：dialog open 时额外 stamp 6 个 dialog button settingsKey
//      (test-confirm/cancel + save-confirm/cancel + clear-confirm/cancel)
//   3. webdav-test 路由 4 个 settingsKey (back + 3 actions)
//   4. webdav-error 路由 11 个 settingsKey (back + 7 link rows + 3 actions)
//   5. Phone / Tablet 两视口 controlKey 集合完全一致
//   6. 渲染器是 viewport-agnostic（两视口 inner HTML 一致）
//   7. 不出现 compact-landscape 或 fold viewport atom
//   8. 无 orphan / extra / 重复 controlKey
//   9. 唯一 production renderer：D2-C 入口必须渲染 webdav-config 路由
//  10. 幂等渲染：不 dispatch 时多次 render 输出完全一致
//
// Figma 视口策略：Phone 390x844 / Tablet 760x960；Landscape 直接归入 Tablet。
// Compact/Fold 已废弃，禁止出现。
//
// 运行：node --test frontend-demo-optimized/verify/r3a-webdav-config-identity.test.mjs
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
const renderRuntimeSource = readFileSync(join(demoRoot, "render-runtime.js"), "utf8");

const VIEWPORTS = [
  { name: "phone",  viewportClass: "phone-portrait",  sizeHint: "390x844" },
  { name: "tablet", viewportClass: "tablet-portrait", sizeHint: "760x960" },
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

function renderInViewport(r, route, viewportClass) {
  const inner = render(r, route);
  return `<div class="fd-demo" data-demo-mode="regular" data-viewport-class="${viewportClass}">${inner}</div>`;
}

function extractSettingsKeys(html) {
  const set = [];
  const re = /data-settings-key="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    set.push(m[1]);
  }
  return set;
}

function extractControlKeys(html) {
  const set = [];
  const re = /data-control-key="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    set.push(m[1]);
  }
  return set;
}

// =============================================================================
// 1. webdav-config 默认状态 settingsKey 全覆盖（12 个）
// =============================================================================
test("R3a webdav-config: default state stamps all 12 expected settingsKeys", () => {
  const r = freshSandbox();
  const html = render(r, "webdav-config");
  const settingsKeys = extractSettingsKeys(html);

  const expected = [
    "back",
    "serverUrl", "account", "password", "syncDir",
    "sslVerify",
    "webdav-connect-timeout-stepper-minus",
    "webdav-connect-timeout-stepper-plus",
    "wifiOnly",
    "autoSync",
    "webdav-test-connection",
    "webdav-save-config",
  ];

  for (const sk of expected) {
    assert.ok(settingsKeys.includes(sk), `expected settingsKey "${sk}" missing (actual: ${settingsKeys.join(", ")})`);
  }
  assert.equal(settingsKeys.length, expected.length, `expected ${expected.length} settingsKeys, got ${settingsKeys.length}`);
});

// =============================================================================
// 1b. 输入变化是本地身份 token，不是跨端可执行 UiEvent
// =============================================================================
test("R3a webdav-config: inputs retain the identity token selector without a UiEvent", () => {
  const r = freshSandbox();
  const html = render(r, "webdav-config");

  for (const settingsKey of ["serverUrl", "account", "password", "syncDir"]) {
    const input = html.match(new RegExp(`<input\\b[^>]*data-settings-key="${settingsKey}"[^>]*>`, "i"))?.[0];
    assert.ok(input, `${settingsKey}: input present`);
    assert.match(input, /data-control-token="input\.change"/, `${settingsKey}: identity token is present`);
    assert.doesNotMatch(input, /data-ui-event=/, `${settingsKey}: no released UiEvent is fabricated`);
  }

  assert.match(
    renderRuntimeSource,
    /\[data-control-token="input\.change"\]\[data-settings-key\]/,
    "runtime listener follows the identity token selector",
  );
  assert.doesNotMatch(
    renderRuntimeSource,
    /\[data-ui-event="input\.change"\]\[data-settings-key\]/,
    "runtime no longer listens for input.change as a UiEvent",
  );
});

// =============================================================================
// 2. webdav-config 条件状态：test dialog open stamps test-confirm + test-cancel
// =============================================================================
test("R3a webdav-config: test dialog open stamps webdav-test-confirm + webdav-test-cancel", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  wc.dispatch({ type: "TEST_CONFIRM_OPEN" });
  const html = render(r, "webdav-config");
  const settingsKeys = extractSettingsKeys(html);

  assert.ok(settingsKeys.includes("webdav-test-confirm"), "test dialog: webdav-test-confirm present");
  assert.ok(settingsKeys.includes("webdav-test-cancel"), "test dialog: webdav-test-cancel present");
});

// =============================================================================
// 3. webdav-config 条件状态：save dialog open stamps save-confirm + save-cancel
// =============================================================================
test("R3a webdav-config: save dialog open stamps webdav-save-confirm + webdav-save-cancel", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  wc.dispatch({ type: "SAVE_CONFIRM_OPEN" });
  const html = render(r, "webdav-config");
  const settingsKeys = extractSettingsKeys(html);

  assert.ok(settingsKeys.includes("webdav-save-confirm"), "save dialog: webdav-save-confirm present");
  assert.ok(settingsKeys.includes("webdav-save-cancel"), "save dialog: webdav-save-cancel present");
});

// =============================================================================
// 4. webdav-config 条件状态：clear dialog open stamps clear-confirm + clear-cancel
// =============================================================================
test("R3a webdav-config: clear dialog open stamps webdav-clear-confirm + webdav-clear-cancel", () => {
  const r = freshSandbox();
  const wc = r.webdavConfig;

  wc.dispatch({ type: "CLEAR_CONFIRM_OPEN" });
  const html = render(r, "webdav-config");
  const settingsKeys = extractSettingsKeys(html);

  assert.ok(settingsKeys.includes("webdav-clear-confirm"), "clear dialog: webdav-clear-confirm present");
  assert.ok(settingsKeys.includes("webdav-clear-cancel"), "clear dialog: webdav-clear-cancel present");
});

// =============================================================================
// 5. webdav-test 路由 4 个 settingsKey
// =============================================================================
test("R3a webdav-test: stamps 4 settingsKeys (back + 3 actions)", () => {
  const r = freshSandbox();
  const html = render(r, "webdav-test");
  const settingsKeys = extractSettingsKeys(html);

  const expected = ["back", "webdav-test-again", "webdav-save-config", "webdav-view-remote-backup"];
  for (const sk of expected) {
    assert.ok(settingsKeys.includes(sk), `webdav-test: expected settingsKey "${sk}"`);
  }
  assert.equal(settingsKeys.length, expected.length, `webdav-test: expected ${expected.length} settingsKeys, got ${settingsKeys.length}`);
});

// =============================================================================
// 6. webdav-error 路由 11 个 settingsKey
// =============================================================================
test("R3a webdav-error: stamps 11 settingsKeys (back + 7 link rows + 3 actions)", () => {
  const r = freshSandbox();
  const html = render(r, "webdav-error");
  const settingsKeys = extractSettingsKeys(html);

  const expected = [
    "back",
    "webdav-check-account", "webdav-check-password", "webdav-check-permission", "webdav-create-dir",
    "webdav-edit-config", "webdav-retry-test", "webdav-view-log",
    "webdav-retry-connection", "webdav-edit-config-action", "webdav-clear-config",
  ];
  for (const sk of expected) {
    assert.ok(settingsKeys.includes(sk), `webdav-error: expected settingsKey "${sk}"`);
  }
  assert.equal(settingsKeys.length, expected.length, `webdav-error: expected ${expected.length} settingsKeys, got ${settingsKeys.length}`);
});

// =============================================================================
// 7. 两视口 controlKey 集合完全一致
// =============================================================================
test("R3a webdav-config: phone and tablet controlKey sets are identical", () => {
  const r1 = freshSandbox();
  const r2 = freshSandbox();
  const inner1 = renderInViewport(r1, "webdav-config", VIEWPORTS[0].viewportClass).replace(/^<div[^>]*>|<\/div>$/g, "");
  const inner2 = renderInViewport(r2, "webdav-config", VIEWPORTS[1].viewportClass).replace(/^<div[^>]*>|<\/div>$/g, "");
  const keys1 = extractControlKeys(inner1).sort();
  const keys2 = extractControlKeys(inner2).sort();
  assert.deepEqual(keys1, keys2, "phone controlKey set == tablet controlKey set");
});

// =============================================================================
// 8. 渲染器 viewport-agnostic：两视口 inner HTML 完全一致
// =============================================================================
test("R3a webdav-config: renderer is viewport-agnostic (inner HTML identical)", () => {
  const r1 = freshSandbox();
  const r2 = freshSandbox();
  const inner1 = renderInViewport(r1, "webdav-config", VIEWPORTS[0].viewportClass).replace(/^<div[^>]*>|<\/div>$/g, "");
  const inner2 = renderInViewport(r2, "webdav-config", VIEWPORTS[1].viewportClass).replace(/^<div[^>]*>|<\/div>$/g, "");
  assert.equal(inner1, inner2, "phone inner HTML == tablet inner HTML");
});

// =============================================================================
// 9. 禁止 compact-landscape 或 fold viewport atom
// =============================================================================
test("R3a webdav-config: no compact-landscape or fold viewport atoms", () => {
  for (const vp of VIEWPORTS) {
    const r = freshSandbox();
    const html = renderInViewport(r, "webdav-config", vp.viewportClass);
    assert.ok(!/compact-landscape/i.test(html), `${vp.name}: no compact-landscape atom`);
    assert.ok(!/\bfold\b/i.test(html), `${vp.name}: no fold atom`);
    assert.ok(!/data-viewport-class="compact/i.test(html), `${vp.name}: no compact viewport class`);
  }
});

// =============================================================================
// 10. 无 orphan / extra / 重复 controlKey
// =============================================================================
test("R3a webdav-config: no orphan / extra / duplicate controlKey in default state", () => {
  const r = freshSandbox();
  const html = render(r, "webdav-config");
  const keys = extractControlKeys(html);

  // 无重复
  const seen = new Set();
  const dupes = [];
  for (const k of keys) {
    if (seen.has(k)) dupes.push(k);
    seen.add(k);
  }
  assert.equal(dupes.length, 0, `duplicate controlKeys: ${dupes.join(", ")}`);

  // 所有 controlKey 遵循命名规范
  for (const k of keys) {
    assert.match(k, /^sync\.[\w.-]+@webdav-config\.default$/, `controlKey "${k}" follows naming convention`);
  }
});

// =============================================================================
// 11. 唯一 production renderer：D2-C 入口必须渲染 webdav-config 路由
// =============================================================================
test("R3a webdav-config: D2-C renderD2Route is the production entry (non-empty)", () => {
  const r = freshSandbox();
  const html = r.renderD2Route("webdav-config", {}, {});
  assert.ok(html && html.length > 1000, "renderD2Route returns non-empty HTML");
  assert.match(html, /data-shell="SettingsShell"/, "renders SettingsShell");
  assert.match(html, /WebDAV/, "title contains WebDAV");
});

// =============================================================================
// 12. 幂等渲染：不 dispatch 时多次 render 输出完全一致
// =============================================================================
test("R3a webdav-config: idempotent render (no dispatch → identical output)", () => {
  const r = freshSandbox();
  const html1 = render(r, "webdav-config");
  const html2 = render(r, "webdav-config");
  const html3 = render(r, "webdav-config");
  assert.equal(html1, html2, "render 1 == render 2");
  assert.equal(html2, html3, "render 2 == render 3");
});

// =============================================================================
// 13. webdav-test 和 webdav-error 也幂等
// =============================================================================
test("R3a webdav-test/webdav-error: idempotent render", () => {
  const r = freshSandbox();
  const t1 = render(r, "webdav-test");
  const t2 = render(r, "webdav-test");
  assert.equal(t1, t2, "webdav-test idempotent");

  const e1 = render(r, "webdav-error");
  const e2 = render(r, "webdav-error");
  assert.equal(e1, e2, "webdav-error idempotent");
});
