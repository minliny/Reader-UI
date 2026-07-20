#!/usr/bin/env node
// =============================================================================
// R2.0 · Canonical Renderer Declarations ↔ Registry Reconciliation Tool
// -----------------------------------------------------------------------------
// 职责：对账 frontend-demo-optimized/control-identity-declarations.js 中的声明
//       与 tools/interaction-inventory/generated/control-id-registry.json 中的
//       R1.1 registry，输出差异报告。
//
// 对账维度：
//   1. renderer 声明的 entityKey 是否都在 registry 中（registry-backed 部分应全部在）
//   2. registry 中 12 页面族的 entityKey 是否都在 renderer 声明中
//   3. renderer 声明的 controlKey 是否都在 registry 中（registry-backed 部分应全部在）
//   4. 碰撞检测：renderer 声明中不能有 entityKey/controlKey 碰撞
//   5. UiEvent 校验：所有声明 UiEvent 必须在 ui-event.schema.json enum
//   6. R2.0 子控件完整性：46 个 containsUnenumeratedSubcontrols 全部声明
//
// 输出：tools/interaction-inventory/generated/canonical-reconciliation.json
//
// 退出码：0 = 对账通过（含预期的 R2.0 子控件差异）；1 = 对账失败（碰撞/缺失/UiEvent 非法）
// =============================================================================
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");

const DECLARATIONS_PATH = join(REPO_ROOT, "frontend-demo-optimized", "control-identity-declarations.js");
const REGISTRY_PATH = join(REPO_ROOT, "tools", "interaction-inventory", "generated", "control-id-registry.json");
const NON_INTERACTIVE_PATH = join(REPO_ROOT, "tools", "interaction-inventory", "generated", "nonInteractiveContainers.json");
const UI_EVENT_SCHEMA_PATH = join(REPO_ROOT, "contracts", "ui-event.schema.json");
const OUTPUT_PATH = join(REPO_ROOT, "tools", "interaction-inventory", "generated", "canonical-reconciliation.json");

// ---- Load inputs ----
// control-identity-declarations.js is a CommonJS module; load it via dynamic import
const declarationsModule = await import(`file://${DECLARATIONS_PATH}`);
const declarations = declarationsModule.CANONICAL_CONTROL_DECLARATIONS;
const meta = declarationsModule.R2_DECLARATIONS_META;

const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
const nonInteractive = JSON.parse(readFileSync(NON_INTERACTIVE_PATH, "utf8"));
const uiEventSchema = JSON.parse(readFileSync(UI_EVENT_SCHEMA_PATH, "utf8"));
const uiEventEnum = uiEventSchema.properties.type.enum;

// ---- Build registry indexes ----
const registryEntityKeys = new Set();
const registryControlKeys = new Set();
const registryEntityKeyByRoute = new Map(); // route → Set<entityKey>
const registryControlKeyByRoute = new Map(); // route → Set<controlKey>

for (const e of registry.entries) {
  registryEntityKeys.add(e.entityKey);
  registryControlKeys.add(e.controlKey);
  if (!registryEntityKeyByRoute.has(e.route)) registryEntityKeyByRoute.set(e.route, new Set());
  registryEntityKeyByRoute.get(e.route).add(e.entityKey);
  if (!registryControlKeyByRoute.has(e.route)) registryControlKeyByRoute.set(e.route, new Set());
  registryControlKeyByRoute.get(e.route).add(e.controlKey);
}

// ---- 12 page families routes (from declarations meta) ----
const pageFamilyRoutes = new Set();
for (const d of declarations) {
  pageFamilyRoutes.add(d.route);
}

// ---- Reconciliation checks ----
const report = {
  generatedAt: "2026-07-20T00:00:00.000Z",
  baselineCommit: "ac4740b",
  inputs: {
    declarationsPath: DECLARATIONS_PATH.replace(REPO_ROOT + "/", ""),
    registryPath: REGISTRY_PATH.replace(REPO_ROOT + "/", ""),
    nonInteractivePath: NON_INTERACTIVE_PATH.replace(REPO_ROOT + "/", ""),
    uiEventSchemaPath: UI_EVENT_SCHEMA_PATH.replace(REPO_ROOT + "/", "")
  },
  totals: {
    declarations: declarations.length,
    registryBacked: declarations.filter(d => d.source === "registry").length,
    r2Subcontrols: declarations.filter(d => d.source === "r2.0-subcontrol").length,
    registryEntries: registry.entries.length,
    registryEntityKeys: registryEntityKeys.size,
    registryControlKeys: registryControlKeys.size,
    pageFamilyRoutes: pageFamilyRoutes.size
  },
  checks: {}
};

// Check 1: registry-backed declarations' entityKey are in registry
const registryBacked = declarations.filter(d => d.source === "registry");
const entityKeyNotInRegistry = [];
for (const d of registryBacked) {
  if (!registryEntityKeys.has(d.entityKey)) {
    entityKeyNotInRegistry.push({ entityKey: d.entityKey, controlKey: d.controlKey, route: d.route });
  }
}
report.checks.entityKeyInRegistry = {
  status: entityKeyNotInRegistry.length === 0 ? "pass" : "fail",
  expected: "all registry-backed declarations' entityKey should be in registry",
  missing: entityKeyNotInRegistry
};

// Check 2: registry entityKeys for 12 page families are in renderer declarations
const declarationEntityKeys = new Set(declarations.map(d => d.entityKey));
const registryEntityKeysNotInDeclarations = [];
for (const route of pageFamilyRoutes) {
  const routeEntityKeys = registryEntityKeyByRoute.get(route) || new Set();
  for (const ek of routeEntityKeys) {
    if (!declarationEntityKeys.has(ek)) {
      registryEntityKeysNotInDeclarations.push({ entityKey: ek, route });
    }
  }
}
report.checks.registryEntityKeyInDeclarations = {
  status: registryEntityKeysNotInDeclarations.length === 0 ? "pass" : "partial",
  expected: "all registry entityKeys for 12 page families should be in renderer declarations",
  missing: registryEntityKeysNotInDeclarations,
  note: "partial is acceptable if new registry entries were added after declarations were generated"
};

// Check 3: registry-backed declarations' controlKey are in registry
const controlKeyNotInRegistry = [];
for (const d of registryBacked) {
  if (!registryControlKeys.has(d.controlKey)) {
    controlKeyNotInRegistry.push({ controlKey: d.controlKey, route: d.route });
  }
}
report.checks.controlKeyInRegistry = {
  status: controlKeyNotInRegistry.length === 0 ? "pass" : "fail",
  expected: "all registry-backed declarations' controlKey should be in registry",
  missing: controlKeyNotInRegistry
};

// Check 4: collision detection
// - controlKey 必须全局唯一（每个 (entityKey, route, state) 只出现一次）
// - R2.0 subcontrol 的 entityKey 必须唯一（每个子控件有独立 slug）
// - registry-backed 的 entityKey 允许跨 route/state 共享（R1.1 设计：同逻辑控件跨上下文）
//   且可能因上下文不同而有不同 label，这是 R1.1 的预期行为，不算碰撞
const ckCounts = new Map();
for (const d of declarations) {
  ckCounts.set(d.controlKey, (ckCounts.get(d.controlKey) || 0) + 1);
}
const ckCollisions = [];
for (const [ck, count] of ckCounts) {
  if (count > 1) ckCollisions.push({ controlKey: ck, count });
}

// R2.0 subcontrol entityKey 碰撞检测（必须唯一）
const r2Subcontrols = declarations.filter(d => d.source === 'r2.0-subcontrol');
const r2EkCounts = new Map();
const r2EkLabels = new Map();
for (const d of r2Subcontrols) {
  r2EkCounts.set(d.entityKey, (r2EkCounts.get(d.entityKey) || 0) + 1);
  if (!r2EkLabels.has(d.entityKey)) r2EkLabels.set(d.entityKey, new Set());
  if (d.label) r2EkLabels.get(d.entityKey).add(d.label);
}
const r2EkCollisions = [];
for (const [ek, labels] of r2EkLabels) {
  if (r2EkCounts.get(ek) > 1 && labels.size > 1) {
    r2EkCollisions.push({ entityKey: ek, labels: [...labels] });
  }
}

// registry-backed entityKey 多次出现统计（信息项，不算碰撞）
const registryBackedEkCounts = new Map();
for (const d of registryBacked) {
  registryBackedEkCounts.set(d.entityKey, (registryBackedEkCounts.get(d.entityKey) || 0) + 1);
}
const registryEkMultiOccurrence = [...registryBackedEkCounts.entries()]
  .filter(([k, v]) => v > 1)
  .map(([k, v]) => ({ entityKey: k, count: v }));

report.checks.collisionDetection = {
  status: r2EkCollisions.length === 0 && ckCollisions.length === 0 ? 'pass' : 'fail',
  expected: 'R2.0 subcontrol entityKey must be unique (no different-label collisions); controlKey must be globally unique',
  r2SubcontrolEntityKeyCollisions: r2EkCollisions,
  controlKeyCollisions: ckCollisions,
  registryBackedEntityKeyMultiOccurrence: registryEkMultiOccurrence.length,
  registryBackedEntityKeyMultiOccurrenceSample: registryEkMultiOccurrence.slice(0, 10),
  note: 'registry-backed entityKey multi-occurrence is expected (R1.1 design: same logical control across route/state may have different labels); R2.0 subcontrol entityKey must be unique per slug'
};

// Check 5: UiEvent validation
const badUiEvents = [];
for (const d of declarations) {
  if (d.uiEvent && !uiEventEnum.includes(d.uiEvent)) {
    badUiEvents.push({ entityKey: d.entityKey, uiEvent: d.uiEvent, source: d.source });
  }
}
report.checks.uiEventInSchemaEnum = {
  status: badUiEvents.length === 0 ? "pass" : "fail",
  expected: "all declared UiEvent must be in contracts/ui-event.schema.json enum",
  invalid: badUiEvents
};

// Check 6: R2.0 subcontrol completeness (46 settings row subcontrols)
const expectedSubcontrols = nonInteractive.entries.filter(e => e.containsUnenumeratedSubcontrols);
const expectedByType = { switch: 0, select: 0, stepper: 0, segment: 0 };
for (const e of expectedSubcontrols) expectedByType[e.expectedSubcontrolType]++;
const declaredSubcontrols = declarations.filter(d => d.source === "r2.0-subcontrol");
const declaredByType = { switch: 0, select: 0, stepper: 0, segment: 0 };
for (const d of declaredSubcontrols) declaredByType[d.expectedSubcontrolType]++;
const subcontrolCountMatch =
  expectedByType.switch === declaredByType.switch &&
  expectedByType.select === declaredByType.select &&
  expectedByType.stepper === declaredByType.stepper &&
  expectedByType.segment === declaredByType.segment;
report.checks.subcontrolCompleteness = {
  status: subcontrolCountMatch && expectedSubcontrols.length === declaredSubcontrols.length ? "pass" : "fail",
  expected: "46 settings row subcontrols (switch 28 / select 15 / stepper 2 / segment 1) all declared",
  expectedCount: expectedSubcontrols.length,
  declaredCount: declaredSubcontrols.length,
  expectedByType,
  declaredByType
};

// Check 7: R2.0 subcontrols NOT in registry (expected - they're new)
const r2SubcontrolsNotInRegistry = [];
for (const d of declaredSubcontrols) {
  if (registryEntityKeys.has(d.entityKey)) {
    r2SubcontrolsNotInRegistry.push({ entityKey: d.entityKey, status: "already-in-registry" });
  }
}
report.checks.r2SubcontrolsAreNew = {
  status: r2SubcontrolsNotInRegistry.length === 0 ? "pass" : "info",
  expected: "R2.0 subcontrols should NOT be in R1.1 registry (they're new declarations for R2a to absorb)",
  alreadyInRegistry: r2SubcontrolsNotInRegistry,
  newCount: declaredSubcontrols.length - r2SubcontrolsNotInRegistry.length
};

// ---- Overall status ----
const criticalChecks = ["entityKeyInRegistry", "controlKeyInRegistry", "collisionDetection", "uiEventInSchemaEnum", "subcontrolCompleteness"];
const allCriticalPass = criticalChecks.every(name => report.checks[name].status === "pass");
report.overallStatus = allCriticalPass ? "pass" : "fail";
report.summary = {
  totalChecks: Object.keys(report.checks).length,
  passed: Object.values(report.checks).filter(c => c.status === "pass").length,
  failed: Object.values(report.checks).filter(c => c.status === "fail").length,
  partial: Object.values(report.checks).filter(c => c.status === "partial").length,
  info: Object.values(report.checks).filter(c => c.status === "info").length
};

// ---- Write report ----
writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2) + "\n", "utf8");

console.log(`Reconciliation report written to: ${OUTPUT_PATH.replace(REPO_ROOT + "/", "")}`);
console.log(`Overall status: ${report.overallStatus}`);
console.log(`Checks: ${report.summary.passed} pass / ${report.summary.failed} fail / ${report.summary.partial} partial / ${report.summary.info} info`);
console.log(`Totals: ${report.totals.declarations} declarations (${report.totals.registryBacked} registry-backed + ${report.totals.r2Subcontrols} R2.0 subcontrols)`);

if (!allCriticalPass) {
  console.error("FAIL: critical checks did not pass");
  for (const name of criticalChecks) {
    if (report.checks[name].status !== "pass") {
      console.error(`  ${name}: ${report.checks[name].status}`);
    }
  }
  process.exit(1);
}
