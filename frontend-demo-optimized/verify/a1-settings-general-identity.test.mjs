// A1 (R2a) · settings-general 试点 DOM identity Phone/Tablet 验证
// -----------------------------------------------------------------------------
// 职责：验证 settings-general 路由下 renderer 原生输出的 5 个 data-* 属性
//       (data-entity-key / data-control-key / data-control-id / data-ui-event /
//        data-settings-key) 在 Phone / Tablet 两视口下：
//         1. controlKey 集合一致（renderer 输出与视口无关）
//         2. DOM 无重复 controlKey（每个 controlKey 出现次数与 declarations 一致）
//         3. DOM 无 orphan（DOM 上每个 controlKey 都在 declarations 中）
//         4. DOM 无 extra（DOM subcontrol 数 = declarations subcontrol 数）
//         5. UiEvent 覆盖（每个 subcontrol 都有 data-ui-event）
//         6. data-viewport 由 render-runtime.js 的 applyViewportClass 在
//            viewport 切换时 stamp（renderer 不输出 data-viewport）
//
// Figma 视口定义：Phone / Tablet；Landscape 直接归入 Tablet。
//
// 运行：node --test frontend-demo-optimized/verify/a1-settings-general-identity.test.mjs
// -----------------------------------------------------------------------------
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");
const repoRoot = join(demoRoot, "..");

const d2SettingsSource = readFileSync(join(demoRoot, "renderers/d2-settings-sync-renderers.js"), "utf8");
const appearanceSpecSource = readFileSync(join(demoRoot, "appearance-spec.js"), "utf8");
const kitSource = readFileSync(join(demoRoot, "shared-shell-kit/kit.js"), "utf8");
const runtimeSource = readFileSync(join(demoRoot, "render-runtime.js"), "utf8");
const declarationsSource = readFileSync(join(demoRoot, "control-identity-declarations.js"), "utf8");

// ---- vm 沙箱：加载 declarations + appearance-spec + shell-kit + d2 renderer ----
function evaluateSettingsGeneralRenderer() {
  const window = {
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    ReaderFrontendDemoDraftRouteContract: {
      routes: { "settings-general": { title: "通用设置" } },
      routePresentation: {},
    },
  };
  const ctx = vm.createContext({ window, module: { exports: {} } });
  new vm.Script(kitSource, { filename: "kit.js" }).runInContext(ctx);
  new vm.Script(appearanceSpecSource, { filename: "appearance-spec.js" }).runInContext(ctx);
  new vm.Script(declarationsSource, { filename: "control-identity-declarations.js" }).runInContext(ctx);
  new vm.Script(d2SettingsSource, { filename: "d2-settings-sync-renderers.js" }).runInContext(ctx);
  return {
    renderers: ctx.window.ReaderD2SettingsSyncRenderers,
    declarations: ctx.window.CANONICAL_CONTROL_DECLARATIONS,
  };
}

// ---- 从 HTML 字符串中提取所有 controlKey ----
function extractControlKeys(html) {
  const set = [];
  const re = /data-control-key="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    set.push(m[1]);
  }
  return set;
}

function extractAttrMap(html) {
  // 按 DOM 元素分组（粗略：以 < 开头作为元素边界）
  // 这里用更精确的方法：每个 data-settings-key 出现的元素也带其他 4 个属性
  const results = [];
  const re = /data-entity-key="([^"]*)"\s+data-control-key="([^"]*)"\s+data-control-id="([^"]*)"\s+data-ui-event="([^"]*)"\s+data-settings-key="([^"]*)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    results.push({
      entityKey: m[1],
      controlKey: m[2],
      controlId: m[3],
      uiEvent: m[4],
      settingsKey: m[5],
    });
  }
  return results;
}

// ---- 加载 ----
const { renderers, declarations } = evaluateSettingsGeneralRenderer();
const sgSubcontrolDecls = declarations.filter(
  (d) => d.route === "settings-general" && d.source === "r2.0-subcontrol"
);
// A3: DOM 现在同时包含 r2.0-subcontrol（10 个值型 subcontrol）和 a3-action
//     （9 个 action button / listrow-action / back）。A1 只验证 r2.0-subcontrol 范围，
//     a3-action 由 a3-settings-general-action-identity.test.mjs 验证。
const sgSubcontrolControlKeySet = new Set(sgSubcontrolDecls.map((d) => d.controlKey));

// ---- 两视口渲染：renderer 输出与视口无关，两次渲染应得到完全相同的 HTML ----
const PHONE_HTML = renderers.globalSettingsV2({}, "settings-general", {});
const TABLET_HTML = renderers.globalSettingsV2({}, "settings-general", {});

const PHONE_KEYS = extractControlKeys(PHONE_HTML);
const TABLET_KEYS = extractControlKeys(TABLET_HTML);

// A3: 过滤出 r2.0-subcontrol scope 的 controlKey（10 个），a3-action 由 A3 test 验证
const PHONE_SUBCONTROL_KEYS = PHONE_KEYS.filter((k) => sgSubcontrolControlKeySet.has(k));
const TABLET_SUBCONTROL_KEYS = TABLET_KEYS.filter((k) => sgSubcontrolControlKeySet.has(k));

// =============================================================================
// 1. 两视口 controlKey 一致性
// =============================================================================
test("A1 settings-general: Phone/Tablet controlKey set is identical (renderer output is viewport-agnostic)", () => {
  assert.equal(PHONE_SUBCONTROL_KEYS.length, sgSubcontrolDecls.length, "phone subcontrol controlKey count matches decl count");
  assert.equal(TABLET_SUBCONTROL_KEYS.length, sgSubcontrolDecls.length, "tablet subcontrol controlKey count matches decl count");

  const phoneSet = new Set(PHONE_SUBCONTROL_KEYS);
  const tabletSet = new Set(TABLET_SUBCONTROL_KEYS);

  assert.equal(phoneSet.size, PHONE_SUBCONTROL_KEYS.length, "phone subcontrol controlKeys are unique");
  assert.equal(tabletSet.size, TABLET_SUBCONTROL_KEYS.length, "tablet subcontrol controlKeys are unique");

  // 两视口 controlKey 集合完全一致
  for (const key of phoneSet) {
    assert.ok(tabletSet.has(key), `tablet missing controlKey: ${key}`);
  }
});

// =============================================================================
// 2. DOM 无 orphan: DOM 上每个 r2.0-subcontrol controlKey 都在 declarations 中
// =============================================================================
test("A1 settings-general: DOM has zero orphan controlKeys (every DOM subcontrol controlKey exists in declarations)", () => {
  const declControlKeys = new Set(sgSubcontrolDecls.map((d) => d.controlKey));
  for (const key of PHONE_SUBCONTROL_KEYS) {
    assert.ok(declControlKeys.has(key), `orphan controlKey in DOM (not in declarations): ${key}`);
  }
});

// =============================================================================
// 3. DOM 无 extra: DOM r2.0-subcontrol 数 = declarations subcontrol 数
// =============================================================================
test("A1 settings-general: DOM subcontrol count matches declarations (no extra, no missing)", () => {
  assert.equal(PHONE_SUBCONTROL_KEYS.length, sgSubcontrolDecls.length,
    `DOM has ${PHONE_SUBCONTROL_KEYS.length} r2.0-subcontrols but declarations has ${sgSubcontrolDecls.length}`);
});

// =============================================================================
// 4. DOM 无重复: 每个 controlKey 在 DOM 中只出现一次（包含 r2.0-subcontrol + a3-action）
// =============================================================================
test("A1 settings-general: DOM has zero duplicate controlKeys", () => {
  const seen = new Set();
  for (const key of PHONE_KEYS) {
    assert.ok(!seen.has(key), `duplicate controlKey in DOM: ${key}`);
    seen.add(key);
  }
});

// =============================================================================
// 5. 5 个 data-* 属性覆盖率：每个 r2.0-subcontrol 都携带完整 5 个属性
// =============================================================================
test("A1 settings-general: every subcontrol DOM element carries all 5 data-* identity attributes", () => {
  const attrMaps = extractAttrMap(PHONE_HTML).filter((m) => sgSubcontrolControlKeySet.has(m.controlKey));
  assert.equal(attrMaps.length, sgSubcontrolDecls.length,
    `only ${attrMaps.length} r2.0-subcontrol elements carry all 5 attributes (expected ${sgSubcontrolDecls.length})`);

  const declByControlKey = new Map(sgSubcontrolDecls.map((d) => [d.controlKey, d]));
  for (const item of attrMaps) {
    const decl = declByControlKey.get(item.controlKey);
    assert.ok(decl, `DOM element with controlKey=${item.controlKey} not found in declarations`);
    assert.equal(item.entityKey, decl.entityKey, `entityKey mismatch for ${item.controlKey}`);
    assert.equal(item.controlId, decl.controlId, `controlId mismatch for ${item.controlKey}`);
    assert.equal(item.uiEvent, decl.uiEvent, `uiEvent mismatch for ${item.controlKey}`);
    assert.equal(item.settingsKey, decl.settingsKey, `settingsKey mismatch for ${item.controlKey}`);
  }
});

// =============================================================================
// 6. UiEvent 覆盖: 每个 r2.0-subcontrol 都有非空 data-ui-event
// =============================================================================
test("A1 settings-general: every subcontrol has a non-empty data-ui-event", () => {
  const attrMaps = extractAttrMap(PHONE_HTML).filter((m) => sgSubcontrolControlKeySet.has(m.controlKey));
  for (const item of attrMaps) {
    assert.ok(item.uiEvent && item.uiEvent.length > 0,
      `empty data-ui-event for controlKey=${item.controlKey}`);
  }
});

// =============================================================================
// 7. mappingStatus 全部为 mapped: declarations 中 settings-general subcontrol 全部 mapped
//    (fail-closed guard 允许 data-control-key 写入)
// =============================================================================
test("A1 settings-general: every subcontrol declaration has mappingStatus=mapped", () => {
  for (const decl of sgSubcontrolDecls) {
    assert.equal(decl.mappingStatus, "mapped",
      `subcontrol ${decl.controlKey} mappingStatus=${decl.mappingStatus} (expected "mapped")`);
    assert.equal(decl.needsActionKey, false,
      `subcontrol ${decl.controlKey} needsActionKey should be false`);
    assert.equal(decl.needsInstanceKey, false,
      `subcontrol ${decl.controlKey} needsInstanceKey should be false`);
    assert.ok(decl.controlId && decl.controlId.length > 0,
      `subcontrol ${decl.controlKey} has empty controlId`);
    assert.ok(decl.actionKey && decl.actionKey.length > 0,
      `subcontrol ${decl.controlKey} has empty actionKey`);
  }
});

// =============================================================================
// 8. data-viewport stamping: render-runtime.js applyViewportClass 在 viewport 切换时
//    stamp data-viewport 到所有 [data-control-key] 元素
// =============================================================================
test("A1 settings-general: render-runtime.js applyViewportClass stamps data-viewport onto [data-control-key] elements", () => {
  // 源码检查：applyViewportClass 必须包含 data-viewport stamping 逻辑
  assert.match(runtimeSource, /function applyViewportClass\(root\)/,
    "applyViewportClass function must exist in render-runtime.js");
  assert.match(runtimeSource, /querySelectorAll\("\[data-control-key\]"\)/,
    "applyViewportClass must query all [data-control-key] elements");
  assert.match(runtimeSource, /setAttribute\("data-viewport", viewportAtom\)/,
    "applyViewportClass must stamp data-viewport with viewportAtom");
  // DOM identity atom 仅允许 phone 与 tablet；横屏必须直接归入 tablet。
  assert.match(runtimeSource, /"phone"/, "viewportAtom must include phone");
  assert.doesNotMatch(runtimeSource, /\? "fold"/, "viewportAtom must not emit fold");
  assert.match(runtimeSource, /"tablet"/, "viewportAtom must include tablet");
  assert.match(runtimeSource, /snapshot\.orientation === "landscape"[\s\S]*?\? "tablet"/, "landscape viewportAtom must resolve to tablet");
});

// =============================================================================
// 9. subcontrol 类型分布: switch / select / segment 数量与 R1.2 nonInteractive 一致
//    settings-general: 4 switch + 3 select + 3 segment = 10 subcontrol declarations
// =============================================================================
test("A1 settings-general: subcontrol type distribution matches R1.2 nonInteractive (4 switch + 3 select + 3 segment)", () => {
  const byType = { switch: 0, select: 0, segment: 0, stepper: 0 };
  for (const decl of sgSubcontrolDecls) {
    const t = decl.expectedSubcontrolType;
    if (byType[t] !== undefined) byType[t]++;
  }
  assert.equal(byType.switch, 4, "switch count");
  assert.equal(byType.select, 3, "select count");
  assert.equal(byType.segment, 3, "segment count");
  assert.equal(byType.stepper, 0, "stepper count (settings-general has no stepper)");
  assert.equal(sgSubcontrolDecls.length, 10, "total subcontrol declaration count");
});
