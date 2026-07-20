// =============================================================================
// R2.0 · Canonical Identity Stability Tests
// -----------------------------------------------------------------------------
// 测试 R2.0 control identity declarations 的稳定性不变式：
//   1. selector 变化时 entityKey 不变
//   2. 语言/文案变化时 entityKey 不变
//   3. viewport 变化时 controlKey 不变
//   4. renderer 声明与 registry 对账（entityKey/controlKey 一致）
//   5. renderer 声明中 UiEvent 必须在 ui-event.schema.json enum
//   6. renderer 声明中无 entityKey/controlKey 碰撞
//   7. 46 个设置行子控件全部声明
//
// 运行：node --test tools/interaction-inventory/tests/canonical-identity-stability.test.mjs
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildEntityKey,
  buildControlKey,
} from "../interaction-inventory-lib.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// 测试文件位于 tools/interaction-inventory/tests/，需上溯 3 级到 repo root
const REPO_ROOT = join(__dirname, "..", "..", "..");

const DECLARATIONS_PATH = join(REPO_ROOT, "frontend-demo-optimized", "control-identity-declarations.js");
const REGISTRY_PATH = join(REPO_ROOT, "tools", "interaction-inventory", "generated", "control-id-registry.json");
const NON_INTERACTIVE_PATH = join(REPO_ROOT, "tools", "interaction-inventory", "generated", "nonInteractiveContainers.json");
const UI_EVENT_SCHEMA_PATH = join(REPO_ROOT, "contracts", "ui-event.schema.json");

// Load declarations module
const declarationsModule = await import(`file://${DECLARATIONS_PATH}`);
const declarations = declarationsModule.CANONICAL_CONTROL_DECLARATIONS;
const meta = declarationsModule.R2_DECLARATIONS_META;

const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
const nonInteractive = JSON.parse(readFileSync(NON_INTERACTIVE_PATH, "utf8"));
const uiEventSchema = JSON.parse(readFileSync(UI_EVENT_SCHEMA_PATH, "utf8"));
const uiEventEnum = uiEventSchema.properties.type.enum;

// ---- Test 1: selector 变化时 entityKey 不变 ----
test("R2.0 stability: entityKey does NOT depend on selector", () => {
  // 构造两个相同逻辑控件、不同 selector 的候选
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
test("R2.0 stability: entityKey does NOT depend on label / language", () => {
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
test("R2.0 stability: controlKey does NOT depend on viewport", () => {
  const entityKey = "settings.switch.switch.auto-check-update";
  const route = "settings-general";
  const state = "default";
  // buildControlKey 不接受 viewport 参数；同一 (entityKey, route, state) 在任何 viewport 下应产出同一 controlKey
  const ck1 = buildControlKey(entityKey, route, state);
  const ck2 = buildControlKey(entityKey, route, state);
  assert.equal(ck1, ck2, "controlKey must not change across viewport instances");
  assert.ok(ck1.includes("@"), "controlKey must contain @ separator");
  assert.ok(ck1.endsWith(`${route}.${state}`), "controlKey must end with route.state");
});

// ---- Test 4: renderer 声明与 registry 对账（entityKey/controlKey 一致） ----
test("R2.0 reconciliation: registry-backed declarations match registry entityKey/controlKey", () => {
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

// ---- Test 5: renderer 声明中 UiEvent 必须在 ui-event.schema.json enum ----
test("R2.0 schema: all declared UiEvent must be in ui-event.schema.json enum", () => {
  for (const d of declarations) {
    if (d.uiEvent !== null && d.uiEvent !== undefined) {
      assert.ok(
        uiEventEnum.includes(d.uiEvent),
        `UiEvent not in schema enum: ${d.uiEvent} (entityKey=${d.entityKey}, source=${d.source})`
      );
    }
  }
});

// ---- Test 6: renderer 声明中无 entityKey/controlKey 碰撞 ----
test("R2.0 collision: no entityKey (different labels) or controlKey collisions", () => {
  // controlKey 必须全局唯一（每个 (entityKey, route, state) 只出现一次）
  const ckCounts = new Map();
  for (const d of declarations) {
    ckCounts.set(d.controlKey, (ckCounts.get(d.controlKey) || 0) + 1);
  }
  const ckCollisions = [...ckCounts.entries()].filter(([k, v]) => v > 1);
  assert.equal(ckCollisions.length, 0, `controlKey collisions: ${JSON.stringify(ckCollisions)}`);

  // R2.0 subcontrol entityKey 若同一 entityKey 关联多个不同 label，则视为真实碰撞。
  // registry-backed entityKey 允许跨 route/state 共享且 label 可不同（R1.1 设计：
  // 同逻辑控件跨上下文，label 由上下文决定，不算碰撞）。
  // 此规则与对账工具 reconcile-canonical-declarations.mjs Check 4 对齐。
  const r2Subcontrols = declarations.filter(d => d.source === "r2.0-subcontrol");
  const r2EkLabels = new Map();
  for (const d of r2Subcontrols) {
    if (!r2EkLabels.has(d.entityKey)) r2EkLabels.set(d.entityKey, new Set());
    if (d.label) r2EkLabels.get(d.entityKey).add(d.label);
  }
  const r2EkCollisions = [...r2EkLabels.entries()].filter(([k, labels]) => labels.size > 1);
  assert.equal(r2EkCollisions.length, 0, `R2.0 subcontrol entityKey collisions (different labels): ${JSON.stringify(r2EkCollisions.map(([ek, labels]) => ({ entityKey: ek, labels: [...labels] })))}`);
});

// ---- Test 7: 46 个设置行子控件全部声明 ----
test("R2.0 completeness: 46 settings row subcontrols all declared", () => {
  const expectedSubcontrols = nonInteractive.entries.filter(e => e.containsUnenumeratedSubcontrols);
  assert.equal(expectedSubcontrols.length, 46, "R1.1 must mark exactly 46 subcontrols");

  const expectedByType = { switch: 0, select: 0, stepper: 0, segment: 0 };
  for (const e of expectedSubcontrols) expectedByType[e.expectedSubcontrolType]++;
  assert.equal(expectedByType.switch, 28, "expected 28 switch subcontrols");
  assert.equal(expectedByType.select, 15, "expected 15 select subcontrols");
  assert.equal(expectedByType.stepper, 2, "expected 2 stepper subcontrols");
  assert.equal(expectedByType.segment, 1, "expected 1 segment subcontrol");

  const declaredSubcontrols = declarations.filter(d => d.source === "r2.0-subcontrol");
  assert.equal(declaredSubcontrols.length, 46, "must declare exactly 46 R2.0 subcontrols");

  const declaredByType = { switch: 0, select: 0, stepper: 0, segment: 0 };
  for (const d of declaredSubcontrols) declaredByType[d.expectedSubcontrolType]++;
  assert.equal(declaredByType.switch, 28, "must declare 28 switch subcontrols");
  assert.equal(declaredByType.select, 15, "must declare 15 select subcontrols");
  assert.equal(declaredByType.stepper, 2, "must declare 2 stepper subcontrols");
  assert.equal(declaredByType.segment, 1, "must declare 1 segment subcontrol");
});

// ---- Test 8: declarations 覆盖 12 页面族 ----
test("R2.0 coverage: declarations cover 12 page families", () => {
  const expectedFamilies = [
    "settings-general",
    "source-management",
    "webdav-config",
    "sync-backup",
    "bookshelf",
    "book-detail",
    "import-conflict-resolve",
    "search-results",
    "discover",
    "rss",
    "source-switch",
    "about-restore-preview"
  ];
  const declaredFamilies = new Set(declarations.map(d => d.pageFamily));
  for (const fam of expectedFamilies) {
    assert.ok(declaredFamilies.has(fam), `missing page family: ${fam}`);
  }
});

// ---- Test 9: R2.0 subcontrols 的 entityKey/controlKey 模式合法 ----
test("R2.0 pattern: subcontrol entityKey/controlKey follow R1.1 patterns", () => {
  const entityKeyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$/;
  const controlKeyPattern = /^[^@]+@[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const subcontrols = declarations.filter(d => d.source === "r2.0-subcontrol");
  for (const d of subcontrols) {
    assert.match(d.entityKey, entityKeyPattern, `entityKey pattern mismatch: ${d.entityKey}`);
    assert.match(d.controlKey, controlKeyPattern, `controlKey pattern mismatch: ${d.controlKey}`);
  }
});

// ---- Test 10: D2 Settings dispatch 接收 options（R2.0 修复验证） ----
test("R2.0 fix: renderD2Route accepts options parameter", () => {
  const rendererSrc = readFileSync(join(REPO_ROOT, "frontend-demo-optimized", "renderers", "d2-settings-sync-renderers.js"), "utf8");
  assert.match(rendererSrc, /function renderD2Route\s*\(\s*route\s*,\s*data\s*,\s*appState\s*,\s*options\s*\)/, "renderD2Route must accept options as 4th parameter");
  assert.match(rendererSrc, /return fn\(data,\s*route,\s*appState,\s*options\)/, "renderD2Route must pass options to underlying fn");

  const runtimeSrc = readFileSync(join(REPO_ROOT, "frontend-demo-optimized", "render-runtime.js"), "utf8");
  assert.match(runtimeSrc, /renderD2Route\(route,\s*data,\s*appState,\s*options\)/, "render-runtime.js must pass options to renderD2Route");
});

// ---- Test 11: 不写 data-control-id 到渲染输出 HTML ----
test("R2.0 boundary: declarations do not write data-control-id to HTML", () => {
  // declarations 文件本身不应包含 data-control-id 写入逻辑
  const declSrc = readFileSync(DECLARATIONS_PATH, "utf8");
  assert.ok(
    !declSrc.includes("data-control-id=") && !declSrc.includes("data-entity-key=") && !declSrc.includes("data-control-key="),
    "declarations file must not write DOM attributes (R2b scope)"
  );
});

// ---- Test 12: 不重构 D2 行为（switch 仍是 span，无 role=switch） ----
test("R2.0 boundary: d2Switch still renders span (no behavior refactor)", () => {
  const rendererSrc = readFileSync(join(REPO_ROOT, "frontend-demo-optimized", "renderers", "d2-settings-sync-renderers.js"), "utf8");
  // d2Switch 仍渲染 span，不补 role="switch"
  assert.match(rendererSrc, /function d2Switch[\s\S]*?return `<span class="fd-settings-switch[^"]*"/, "d2Switch must still render as span (no role=switch refactor)");
});
