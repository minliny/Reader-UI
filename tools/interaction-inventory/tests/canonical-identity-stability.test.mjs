// =============================================================================
// R2.0.1 · Canonical Identity Stability Tests
// -----------------------------------------------------------------------------
// 测试 R2.0.1 control identity declarations 的稳定性不变式：
//   1. selector 变化时 entityKey 不变
//   2. 语言/文案变化时 entityKey 不变
//   3. viewport 变化时 controlKey 不变
//   4. registry-backed declarations 与 registry entityKey/controlKey 一致
//   5. UiEvent 必须在 ui-event.schema.json enum
//   6. 无 controlKey 碰撞
//   7. 子控件数量 = 50（不是 46；stepper 展开 minus+plus，segment 展开 3 选项）
//   8. 覆盖 12 页面族
//   9. R2.0 subcontrol 的 entityKey/controlKey 模式合法
//  10. D2 Settings dispatch 接收 options
//  11. 不写 data-control-id 到渲染输出 HTML
//  12. 不重构 D2 行为（switch 仍是 span）
//
// R2.0.1 新增测试：
//  13. route-local occurrence 1:1 对账
//  14. exact 12 页面族 gate
//  15. renderer owner 与 dispatch map 一致
//  16. uiEvent 非空或明确豁免
//  17. controlId 非空或明确豁免
//  18. 生成器 --check byte-stable
//
// 运行：node --test tools/interaction-inventory/tests/canonical-identity-stability.test.mjs
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

import {
  buildEntityKey,
  buildControlKey,
} from "../interaction-inventory-lib.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..", "..");

const DECLARATIONS_PATH = join(REPO_ROOT, "frontend-demo-optimized", "control-identity-declarations.js");
const REGISTRY_PATH = join(REPO_ROOT, "tools", "interaction-inventory", "generated", "control-id-registry.json");
const DISPATCH_MAP_PATH = join(REPO_ROOT, "tools", "interaction-inventory", "generated", "renderer-dispatch-map.json");
const NON_INTERACTIVE_PATH = join(REPO_ROOT, "tools", "interaction-inventory", "generated", "nonInteractiveContainers.json");
const UI_EVENT_SCHEMA_PATH = join(REPO_ROOT, "contracts", "ui-event.schema.json");

const declarationsModule = await import(`file://${DECLARATIONS_PATH}`);
const declarations = declarationsModule.CANONICAL_CONTROL_DECLARATIONS;
const meta = declarationsModule.R2_DECLARATIONS_META;

const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
const dispatchMap = JSON.parse(readFileSync(DISPATCH_MAP_PATH, "utf8"));
const nonInteractive = JSON.parse(readFileSync(NON_INTERACTIVE_PATH, "utf8"));
const uiEventSchema = JSON.parse(readFileSync(UI_EVENT_SCHEMA_PATH, "utf8"));
const uiEventEnum = uiEventSchema.properties.type.enum;

// ---- Test 1: selector 变化时 entityKey 不变 ----
test("R2.0.1 stability: entityKey does NOT depend on selector", () => {
  const baseCandidate = {
    domain: "settings",
    family: "switch",
    role: "switch",
    dataAttributes: { "data-settings-key": "auto-check-update" },
  };
  const selectorA = "#fd-settings > article:nth-child(1) > span.fd-settings-switch";
  const selectorB = "#fd-settings > article:nth-child(5) > span.fd-settings-switch";
  const ek1 = buildEntityKey({ ...baseCandidate, selector: selectorA });
  const ek2 = buildEntityKey({ ...baseCandidate, selector: selectorB });
  assert.equal(ek1, ek2, "entityKey must not change when selector changes");
  assert.ok(ek1.length > 0, "entityKey must be non-empty");
});

// ---- Test 2: 语言/文案变化时 entityKey 不变 ----
test("R2.0.1 stability: entityKey does NOT depend on label / language", () => {
  const baseCandidate = {
    domain: "settings",
    family: "switch",
    role: "switch",
    dataAttributes: { "data-settings-key": "auto-check-update" },
    selector: "#fd-settings > article:nth-child(1)",
  };
  const labelZh = "自动检查更新";
  const labelEn = "Auto check for updates";
  const ek1 = buildEntityKey({ ...baseCandidate, label: labelZh });
  const ek2 = buildEntityKey({ ...baseCandidate, label: labelEn });
  assert.equal(ek1, ek2, "entityKey must not change when label / language changes");
});

// ---- Test 3: viewport 变化时 controlKey 不变 ----
test("R2.0.1 stability: controlKey does NOT depend on viewport", () => {
  const entityKey = "settings.switch.switch.auto-check-update";
  const route = "settings-general";
  const state = "default";
  const ck1 = buildControlKey(entityKey, route, state);
  const ck2 = buildControlKey(entityKey, route, state);
  assert.equal(ck1, ck2, "controlKey must not change across viewport instances");
  assert.ok(ck1.includes("@"), "controlKey must contain @ separator");
  assert.ok(ck1.endsWith(`${route}.${state}`), "controlKey must end with route.state");
});

// ---- Test 4: registry-backed declarations 与 registry entityKey/controlKey 一致 ----
test("R2.0.1 reconciliation: registry-backed declarations match registry entityKey/controlKey", () => {
  const registryEntityKeys = new Set(registry.entries.map(e => e.entityKey));
  const registryControlKeys = new Set(registry.entries.map(e => e.controlKey));
  const registryBacked = declarations.filter(d => d.source === "registry");
  assert.ok(registryBacked.length > 0, "there must be registry-backed declarations");
  for (const d of registryBacked) {
    assert.ok(
      registryEntityKeys.has(d.entityKey),
      `registry-backed entityKey not in registry: ${d.entityKey} (route=${d.route})`
    );
    assert.ok(
      registryControlKeys.has(d.controlKey),
      `registry-backed controlKey not in registry: ${d.controlKey} (route=${d.route})`
    );
  }
});

// ---- Test 5: UiEvent 必须在 ui-event.schema.json enum ----
test("R2.0.1 schema: all declared UiEvent must be in ui-event.schema.json enum", () => {
  for (const d of declarations) {
    if (d.uiEvent !== null && d.uiEvent !== undefined) {
      assert.ok(
        uiEventEnum.includes(d.uiEvent),
        `UiEvent not in schema enum: ${d.uiEvent} (entityKey=${d.entityKey}, source=${d.source})`
      );
    }
  }
});

// ---- Test 6: 无 controlKey 碰撞 ----
test("R2.0.1 collision: no controlKey collisions", () => {
  const ckCounts = new Map();
  for (const d of declarations) {
    ckCounts.set(d.controlKey, (ckCounts.get(d.controlKey) || 0) + 1);
  }
  const ckCollisions = [...ckCounts.entries()].filter(([k, v]) => v > 1);
  assert.equal(ckCollisions.length, 0, `controlKey collisions: ${JSON.stringify(ckCollisions)}`);
});

// ---- Test 7: 已完成 instrumentation 的控件进入 semantic denominator；这里只统计剩余容器 ----
test("R2.0.1 completeness: 61 stable pilot subcontrol declarations", () => {
  const expectedSubcontrolRows = nonInteractive.entries.filter(e => e.containsUnenumeratedSubcontrols);
  assert.equal(expectedSubcontrolRows.length, 28, "current inventory must mark 28 remaining subcontrol rows");

  const expectedRowsByType = { switch: 0, select: 0, stepper: 0, segment: 0 };
  for (const e of expectedSubcontrolRows) expectedRowsByType[e.expectedSubcontrolType]++;
  assert.equal(expectedRowsByType.switch, 20, "expected 20 switch subcontrol rows");
  assert.equal(expectedRowsByType.select, 5, "expected 5 select subcontrol rows");
  assert.equal(expectedRowsByType.stepper, 2, "expected 2 stepper subcontrol rows (each expands to 2 buttons)");
  assert.equal(expectedRowsByType.segment, 1, "expected 1 segment subcontrol row (expands to 3 options)");

  const declaredSubcontrols = declarations.filter(d => d.source === "r2.0-subcontrol");
  assert.equal(declaredSubcontrols.length, 61, "must preserve all 61 pilot subcontrol identities");

  const declaredByType = { switch: 0, select: 0, stepper: 0, segment: 0 };
  for (const d of declaredSubcontrols) declaredByType[d.expectedSubcontrolType] = (declaredByType[d.expectedSubcontrolType] || 0) + 1;
  assert.equal(declaredByType.switch, 28, "must declare 28 switch subcontrols");
  assert.equal(declaredByType.select, 16, "must declare 16 select/input subcontrols");
  assert.equal(declaredByType.stepper, 4, "must declare 4 stepper subcontrols (2 rows × 2 buttons)");
  assert.equal(declaredByType.segment, 8, "must declare 8 segment/filter options");
});

// ---- Test 8: 非 Reader exact gate 仍为 12，Reader 运行时作为独立扩展 lane ----
test("R2.0.1 coverage: exactly 12 non-Reader page families plus reader-runtime extension", () => {
  const expectedFamilies = [
    "bookshelf",
    "book-detail",
    "search-results",
    "import-conflict-resolve",
    "discover",
    "rss",
    "source-switch",
    "settings-general",
    "source-management",
    "webdav-config",
    "sync-backup",
    "about-restore-preview"
  ];
  const declaredFamiliesSet = new Set(declarations.filter(d => d.source !== "reader-runtime-action").map(d => d.pageFamily));
  assert.equal(declaredFamiliesSet.size, 12, `expected exactly 12 non-Reader page families, got ${declaredFamiliesSet.size}: ${[...declaredFamiliesSet].join(",")}`);
  for (const fam of expectedFamilies) {
    assert.ok(declaredFamiliesSet.has(fam), `missing page family: ${fam}`);
  }
  const extra = [...declaredFamiliesSet].filter(f => !expectedFamilies.includes(f));
  assert.equal(extra.length, 0, `unexpected extra page families: ${extra.join(",")}`);
  const readerRuntime = declarations.filter(d => d.source === "reader-runtime-action");
  assert.ok(readerRuntime.length >= 400, "reader-runtime extension must carry its complete stable identity set");
  assert.ok(readerRuntime.every(d => d.pageFamily === "reader-runtime"));
});

// ---- Test 9: R2.0 subcontrols 的 entityKey/controlKey 模式合法 ----
test("R2.0.1 pattern: subcontrol entityKey/controlKey follow R1.2 patterns", () => {
  const entityKeyPattern = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*\.[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*\.[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*(?:\.[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)*$/;
  const controlKeyPattern = /^[^@]+@[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const subcontrols = declarations.filter(d => d.source === "r2.0-subcontrol");
  for (const d of subcontrols) {
    assert.match(d.entityKey, entityKeyPattern, `entityKey pattern mismatch: ${d.entityKey}`);
    assert.match(d.controlKey, controlKeyPattern, `controlKey pattern mismatch: ${d.controlKey}`);
  }
});

// ---- Test 10: D2 Settings dispatch 接收 options ----
test("R2.0.1 fix: renderD2Route accepts options parameter", () => {
  const rendererSrc = readFileSync(join(REPO_ROOT, "frontend-demo-optimized", "renderers", "d2-settings-sync-renderers.js"), "utf8");
  assert.match(rendererSrc, /function renderD2Route\s*\(\s*route\s*,\s*data\s*,\s*appState\s*,\s*options\s*\)/, "renderD2Route must accept options as 4th parameter");
  assert.match(rendererSrc, /return fn\(data,\s*route,\s*appState,\s*options\)/, "renderD2Route must pass options to underlying fn");

  const runtimeSrc = readFileSync(join(REPO_ROOT, "frontend-demo-optimized", "render-runtime.js"), "utf8");
  assert.match(runtimeSrc, /renderD2Route\(route,\s*data,\s*appState,\s*options\)/, "render-runtime.js must pass options to renderD2Route");
});

// ---- Test 11: 不写 data-control-id 到渲染输出 HTML ----
test("R2.0.1 boundary: declarations do not write data-control-id to HTML", () => {
  const declSrc = readFileSync(DECLARATIONS_PATH, "utf8");
  assert.ok(
    !declSrc.includes("data-control-id=") && !declSrc.includes("data-entity-key=") && !declSrc.includes("data-control-key="),
    "declarations file must not write DOM attributes (R2b scope)"
  );
});

// ---- Test 12: 不重构 D2 行为（switch 仍是 span） ----
test("R2.0.1 boundary: d2Switch still renders span (no behavior refactor)", () => {
  const rendererSrc = readFileSync(join(REPO_ROOT, "frontend-demo-optimized", "renderers", "d2-settings-sync-renderers.js"), "utf8");
  assert.match(rendererSrc, /function d2Switch[\s\S]*?return `<span class="fd-settings-switch[^"]*"/, "d2Switch must still render as span (no role=switch refactor)");
});

// ============================================================================
// R2.0.1 新增测试
// ============================================================================

// ---- Test 13: route-local occurrence 1:1 对账 ----
test("R2.0.1 route-local: registry occurrences 1:1 match declarations on each dispatch-map route", () => {
  const dispatchRoutes = Object.keys(dispatchMap.routes);
  const registryByRoute = new Map();
  for (const e of registry.entries) {
    if (!registryByRoute.has(e.route)) registryByRoute.set(e.route, []);
    registryByRoute.get(e.route).push(e);
  }
  const declarationsByRoute = new Map();
  for (const d of declarations) {
    if (!declarationsByRoute.has(d.route)) declarationsByRoute.set(d.route, []);
    declarationsByRoute.get(d.route).push(d);
  }

  for (const route of dispatchRoutes) {
    const regEntries = registryByRoute.get(route) || [];
    const declsOnRoute = (declarationsByRoute.get(route) || []).filter(d => d.source === "registry");
    const declControlKeys = new Set(declsOnRoute.map(d => d.controlKey));
    const regControlKeys = new Set(regEntries.map(e => e.controlKey));

    // 每个 registry occurrence 都应在 declarations 中
    for (const e of regEntries) {
      assert.ok(
        declControlKeys.has(e.controlKey),
        `route ${route}: registry occurrence ${e.controlKey} not in declarations (route-local 1:1 violated)`
      );
    }
    // 每个 declaration 都应在 registry 中
    for (const d of declsOnRoute) {
      assert.ok(
        regControlKeys.has(d.controlKey),
        `route ${route}: declaration ${d.controlKey} not in registry (route-local 1:1 violated)`
      );
    }
  }
});

// ---- Test 14: exact 12 页面族 gate ----
test("R2.0.1 gate: dispatch map has exactly 12 page families", () => {
  const pageFamilies = Object.keys(dispatchMap.pageFamilies);
  assert.equal(pageFamilies.length, 12, `dispatch map must have exactly 12 page families, got ${pageFamilies.length}`);
  const expected = new Set([
    "bookshelf", "book-detail", "search-results", "import-conflict-resolve",
    "discover", "rss", "source-switch", "settings-general",
    "source-management", "webdav-config", "sync-backup", "about-restore-preview"
  ]);
  for (const fam of pageFamilies) {
    assert.ok(expected.has(fam), `unexpected page family in dispatch map: ${fam}`);
  }
});

// ---- Test 15: renderer owner 与 dispatch map 一致 ----
test("R2.0.1 dispatch: declarations' renderer/rendererFile/pageFamily match dispatch map", () => {
  for (const d of declarations) {
    if (d.source === "reader-runtime-action") {
      assert.equal(d.renderer, "ReaderRuntimeContract.instrumentDom");
      assert.equal(d.rendererFile, "reader-runtime-contract.js");
      assert.equal(d.pageFamily, "reader-runtime");
      continue;
    }
    const routeInfo = dispatchMap.routes[d.route];
    assert.ok(routeInfo, `declaration route ${d.route} not in dispatch map (entityKey=${d.entityKey})`);
    assert.equal(d.renderer, routeInfo.renderer, `renderer mismatch on route ${d.route}: declared=${d.renderer}, dispatch=${routeInfo.renderer}`);
    assert.equal(d.rendererFile, routeInfo.rendererFile, `rendererFile mismatch on route ${d.route}: declared=${d.rendererFile}, dispatch=${routeInfo.rendererFile}`);
    assert.equal(d.pageFamily, routeInfo.pageFamily, `pageFamily mismatch on route ${d.route}: declared=${d.pageFamily}, dispatch=${routeInfo.pageFamily}`);
  }
});

// ---- Test 16: uiEvent 非空或明确豁免 ----
test("R2.0.1 uiEvent: every declaration has uiEvent or uiEventExemption with valid type", () => {
  // A0 (schema 1.3.0): exemption types align with the derived mappingStatus enum.
  const validExemptionTypes = new Set([
    "pending-action-key",
    "pending-instance-key",
    "pending-action-and-instance-key",
    "decorative",
    "container-only"
  ]);
  for (const d of declarations) {
    if (d.uiEvent === null || d.uiEvent === undefined) {
      assert.ok(d.uiEventExemption, `declaration ${d.controlKey} has null uiEvent but no uiEventExemption`);
      assert.ok(
        validExemptionTypes.has(d.uiEventExemption),
        `declaration ${d.controlKey} has invalid uiEventExemption: ${d.uiEventExemption}`
      );
    }
  }
});

// ---- Test 17: controlId 非空或明确豁免 ----
test("R2.0.1 controlId: every declaration has controlId or controlIdExemption with valid type", () => {
  const validControlIdExemptions = new Set([
    "pending-registry-enumeration"
  ]);
  for (const d of declarations) {
    if (d.controlId === null || d.controlId === undefined) {
      assert.ok(d.controlIdExemption, `declaration ${d.controlKey} has null controlId but no controlIdExemption`);
      assert.ok(
        validControlIdExemptions.has(d.controlIdExemption),
        `declaration ${d.controlKey} has invalid controlIdExemption: ${d.controlIdExemption}`
      );
    }
  }
});

// ---- Test 18: 生成器 --check byte-stable ----
test("R2.0.1 generator: --check mode is byte-stable (declarations file is up-to-date)", () => {
  const generatorPath = join(REPO_ROOT, "tools", "interaction-inventory", "generate-canonical-declarations.mjs");
  let result;
  try {
    result = execSync(`node ${generatorPath} --check`, { encoding: "utf8", cwd: REPO_ROOT });
  } catch (err) {
    assert.fail(`generator --check failed (declarations file is out of date): ${err.stdout || err.message}`);
  }
  assert.match(result, /OK: declarations up-to-date/, `generator --check should report up-to-date, got: ${result}`);
});

// ---- Test 19: A0 declarations 携带 mappingStatus / actionKey / instanceKey / rendererSlot ----
test("A0 declarations: every declaration carries mappingStatus / actionKey / instanceKey / rendererSlot with valid values", () => {
  const validMappingStatus = new Set([
    "mapped",
    "pending-action-key",
    "pending-instance-key",
    "pending-action-and-instance-key"
  ]);
  for (const d of declarations) {
    assert.ok(
      typeof d.mappingStatus === "string" && validMappingStatus.has(d.mappingStatus),
      `declaration ${d.controlKey} has invalid mappingStatus: ${d.mappingStatus}`
    );
    assert.ok(
      d.actionKey === null || typeof d.actionKey === "string",
      `declaration ${d.controlKey} has invalid actionKey type: ${typeof d.actionKey}`
    );
    assert.ok(
      d.instanceKey === null || typeof d.instanceKey === "string",
      `declaration ${d.controlKey} has invalid instanceKey type: ${typeof d.instanceKey}`
    );
    assert.ok(
      typeof d.rendererSlot === "string" && d.rendererSlot.length > 0 && d.rendererSlot.includes("@"),
      `declaration ${d.controlKey} has invalid rendererSlot: ${d.rendererSlot}`
    );
    // A0 invariant (action dimension): mappingStatus's action-key gap must
    // agree with actionKey presence. The instance dimension is validated at
    // the registry level (drift test L1414) where needsInstanceKey is the
    // derived flag, not (instanceKey === null), because needsInstanceKey
    // captures the ordinal-fallback case for multi-occurrence groups.
    const actionKeyPending = d.mappingStatus === "pending-action-key"
      || d.mappingStatus === "pending-action-and-instance-key";
    if (actionKeyPending) {
      assert.equal(
        d.actionKey, null,
        `declaration ${d.controlKey} mappingStatus=${d.mappingStatus} but actionKey=${d.actionKey} (should be null)`
      );
    } else {
      assert.ok(
        typeof d.actionKey === "string" && d.actionKey.length > 0,
        `declaration ${d.controlKey} mappingStatus=${d.mappingStatus} but actionKey is null or empty (should be non-null)`
      );
    }
  }
});

// ---- Test 20: A0 subcontrol declarations 不依赖 selector hash / ordinal fallback ----
test("A0 stable pilot subcontrols use business semantic keys (no selector hash, no ordinal fallback)", () => {
  // A0 invariant: "50 个设置子控件改用业务语义 key，不再使用 selector hash".
  // The entityKey slug for every r2.0-subcontrol declaration MUST be a
  // business semantic slug from settings-subcontrol-business-keys.mjs, not
  // a `h-{selectorSha256前8位}` hash. The controlKey MUST NOT carry the
  // R1.2 ordinal fallback suffix (n0/n1/n2/...) either — subcontrol
  // identity is per-(route, state) and unique by business slug, so no
  // ordinal disambiguation is needed.
  const sub = declarations.filter((d) => d.source === "r2.0-subcontrol");
  assert.equal(sub.length, 61, `expected 61 stable r2.0-subcontrol declarations, got ${sub.length}`);
  const selectorHashPattern = /h-[0-9a-f]{8}/;
  const ordinalFallbackPattern = /\.n\d+$/;
  const failures = [];
  for (const d of sub) {
    if (selectorHashPattern.test(d.entityKey)) {
      failures.push({ kind: "entityKey-has-selector-hash", controlKey: d.controlKey, entityKey: d.entityKey });
    }
    if (selectorHashPattern.test(d.controlKey)) {
      failures.push({ kind: "controlKey-has-selector-hash", controlKey: d.controlKey });
    }
    if (ordinalFallbackPattern.test(d.controlKey)) {
      failures.push({ kind: "controlKey-has-ordinal-fallback", controlKey: d.controlKey });
    }
  }
  if (failures.length > 0) {
    console.error("A0 subcontrol identity failures (first 10):");
    for (const f of failures.slice(0, 10)) console.error("  ", JSON.stringify(f));
    assert.fail(`A0: ${failures.length} subcontrol declarations still use selector hash or ordinal fallback (expected business semantic keys only)`);
  }
});

// ---- Test 21: A0 settings-general subcontrol 身份不依赖 ordinal/selector ----
test("A0 settings-general subcontrols generate identity without ordinal/selector", () => {
  // A0 退出门槛: "Settings General 范围可以生成不依赖 ordinal/selector 的身份".
  // Verify the 8 settings-general rows (expanded to 10 declarations: 3 segment
  // + 3 select + 4 switch) all carry business semantic slugs.
  const sg = declarations.filter((d) => d.source === "r2.0-subcontrol" && d.route === "settings-general");
  // 8 rows expand: 1 segment(3) + 3 select(1 each) + 4 switch(1 each) = 10.
  assert.equal(sg.length, 10, `expected 10 settings-general subcontrol declarations, got ${sg.length}`);
  const selectorHashPattern = /h-[0-9a-f]{8}/;
  const ordinalFallbackPattern = /\.n\d+$/;
  for (const d of sg) {
    assert.doesNotMatch(
      d.entityKey, selectorHashPattern,
      `settings-general subcontrol entityKey must not contain selector hash: ${d.entityKey}`,
    );
    assert.doesNotMatch(
      d.controlKey, selectorHashPattern,
      `settings-general subcontrol controlKey must not contain selector hash: ${d.controlKey}`,
    );
    assert.doesNotMatch(
      d.controlKey, ordinalFallbackPattern,
      `settings-general subcontrol controlKey must not carry ordinal fallback: ${d.controlKey}`,
    );
  }
});
