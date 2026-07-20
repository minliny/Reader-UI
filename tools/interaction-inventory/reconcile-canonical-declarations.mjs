#!/usr/bin/env node
// =============================================================================
// R2.0.1 · Canonical Renderer Declarations ↔ Registry Reconciliation Tool
// -----------------------------------------------------------------------------
// 职责：对账 frontend-demo-optimized/control-identity-declarations.js 中的声明
//       与 tools/interaction-inventory/generated/control-id-registry.json 中的
//       R1.2 registry + renderer-dispatch-map.json，输出差异报告。
//
// R2.0.1 新增对账维度：
//   1. route-local occurrence 1:1 对账（不再是全局 entityKey 集合）
//   2. exact 12 页面族 gate
//   3. renderer owner 与 dispatch map 一致
//   4. uiEvent 非空或明确豁免
//   5. controlId 非空或明确豁免
//   6. 子控件数量 = 50（不是 46；stepper 展开 minus+plus，segment 展开 3 个选项）
//
// 输出：tools/interaction-inventory/generated/canonical-reconciliation.json
//
// 退出码：0 = 对账通过；1 = 对账失败
// =============================================================================
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");

const DECLARATIONS_PATH = join(REPO_ROOT, "frontend-demo-optimized", "control-identity-declarations.js");
const REGISTRY_PATH = join(REPO_ROOT, "tools", "interaction-inventory", "generated", "control-id-registry.json");
const DISPATCH_MAP_PATH = join(REPO_ROOT, "tools", "interaction-inventory", "generated", "renderer-dispatch-map.json");
const NON_INTERACTIVE_PATH = join(REPO_ROOT, "tools", "interaction-inventory", "generated", "nonInteractiveContainers.json");
const UI_EVENT_SCHEMA_PATH = join(REPO_ROOT, "contracts", "ui-event.schema.json");
const OUTPUT_PATH = join(REPO_ROOT, "tools", "interaction-inventory", "generated", "canonical-reconciliation.json");

// ---- Load inputs ----
const declarationsModule = await import(`file://${DECLARATIONS_PATH}`);
const declarations = declarationsModule.CANONICAL_CONTROL_DECLARATIONS;
const meta = declarationsModule.R2_DECLARATIONS_META;

const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
const dispatchMap = JSON.parse(readFileSync(DISPATCH_MAP_PATH, "utf8"));
const nonInteractive = JSON.parse(readFileSync(NON_INTERACTIVE_PATH, "utf8"));
const uiEventSchema = JSON.parse(readFileSync(UI_EVENT_SCHEMA_PATH, "utf8"));
const uiEventEnum = uiEventSchema.properties.type.enum;

// ---- Build registry indexes ----
const registryEntityKeys = new Set();
const registryControlKeys = new Set();
const registryByRoute = new Map(); // route → Array<entry>

for (const e of registry.entries) {
  registryEntityKeys.add(e.entityKey);
  registryControlKeys.add(e.controlKey);
  if (!registryByRoute.has(e.route)) registryByRoute.set(e.route, []);
  registryByRoute.get(e.route).push(e);
}

// ---- Dispatch map indexes ----
const dispatchRoutes = Object.keys(dispatchMap.routes);
const dispatchRouteSet = new Set(dispatchRoutes);
const dispatchPageFamilies = Object.keys(dispatchMap.pageFamilies);

// ---- Declarations indexes ----
const declarationsByRoute = new Map(); // route → Array<declaration>
for (const d of declarations) {
  if (!declarationsByRoute.has(d.route)) declarationsByRoute.set(d.route, []);
  declarationsByRoute.get(d.route).push(d);
}

// ---- Reconciliation checks ----
const report = {
  generatedAt: "2026-07-20T00:00:00.000Z",
  baselineCommit: "5ce233f",
  baselineTag: "R1.2",
  inputs: {
    declarationsPath: DECLARATIONS_PATH.replace(REPO_ROOT + "/", ""),
    registryPath: REGISTRY_PATH.replace(REPO_ROOT + "/", ""),
    dispatchMapPath: DISPATCH_MAP_PATH.replace(REPO_ROOT + "/", ""),
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
    dispatchRoutes: dispatchRoutes.length,
    dispatchPageFamilies: dispatchPageFamilies.length,
    declarationRoutes: declarationsByRoute.size,
    declarationPageFamilies: new Set(declarations.map(d => d.pageFamily)).size
  },
  checks: {}
};

// ===== Check 1: exact 12 page families gate =====
const expectedFamilies = [
  "bookshelf", "book-detail", "search-results", "import-conflict-resolve",
  "discover", "rss", "source-switch", "settings-general",
  "source-management", "webdav-config", "sync-backup", "about-restore-preview"
];
const declarationFamilies = new Set(declarations.map(d => d.pageFamily));
const missingFamilies = expectedFamilies.filter(f => !declarationFamilies.has(f));
const extraFamilies = [...declarationFamilies].filter(f => !expectedFamilies.includes(f));
report.checks.exact12PageFamilies = {
  status: missingFamilies.length === 0 && extraFamilies.length === 0 && declarationFamilies.size === 12 ? "pass" : "fail",
  expected: "exactly 12 page families (no more, no less)",
  expectedCount: 12,
  actualCount: declarationFamilies.size,
  missing: missingFamilies,
  extra: extraFamilies
};

// ===== Check 2: route-local occurrence 1:1 reconciliation =====
// 对 dispatch map 中每个 route：
//   - registry 在该 route 上的所有 occurrence 都应在 declarations 中（按 controlKey）
//   - declarations 中所有 registry-backed entry 都应在 registry 中（按 controlKey）
// 不再检查全局 entityKey 集合
const routeLocalMissingInDeclarations = []; // registry occurrence 不在 declarations
const routeLocalMissingInRegistry = [];      // declarations entry 不在 registry

for (const route of dispatchRoutes) {
  const regEntries = registryByRoute.get(route) || [];
  const declsOnRoute = (declarationsByRoute.get(route) || []).filter(d => d.source === "registry");
  const declControlKeys = new Set(declsOnRoute.map(d => d.controlKey));
  const regControlKeys = new Set(regEntries.map(e => e.controlKey));

  for (const e of regEntries) {
    if (!declControlKeys.has(e.controlKey)) {
      routeLocalMissingInDeclarations.push({ route, controlKey: e.controlKey, entityKey: e.entityKey });
    }
  }
  for (const d of declsOnRoute) {
    if (!regControlKeys.has(d.controlKey)) {
      routeLocalMissingInRegistry.push({ route, controlKey: d.controlKey, entityKey: d.entityKey });
    }
  }
}

report.checks.routeLocalOccurrenceReconciliation = {
  status: routeLocalMissingInDeclarations.length === 0 && routeLocalMissingInRegistry.length === 0 ? "pass" : "fail",
  expected: "for each dispatch-map route, registry occurrences 1:1 match declarations (route-local, not global set)",
  missingInDeclarations: routeLocalMissingInDeclarations,
  missingInRegistry: routeLocalMissingInRegistry,
  missingInDeclarationsCount: routeLocalMissingInDeclarations.length,
  missingInRegistryCount: routeLocalMissingInRegistry.length
};

// ===== Check 3: registry-backed declarations' entityKey/controlKey are in registry =====
const registryBacked = declarations.filter(d => d.source === "registry");
const entityKeyNotInRegistry = [];
const controlKeyNotInRegistry = [];
for (const d of registryBacked) {
  if (!registryEntityKeys.has(d.entityKey)) {
    entityKeyNotInRegistry.push({ entityKey: d.entityKey, controlKey: d.controlKey, route: d.route });
  }
  if (!registryControlKeys.has(d.controlKey)) {
    controlKeyNotInRegistry.push({ controlKey: d.controlKey, route: d.route });
  }
}
report.checks.registryBackedKeysInRegistry = {
  status: entityKeyNotInRegistry.length === 0 && controlKeyNotInRegistry.length === 0 ? "pass" : "fail",
  expected: "all registry-backed declarations' entityKey AND controlKey should be in registry",
  entityKeyNotInRegistry,
  controlKeyNotInRegistry
};

// ===== Check 4: renderer owner matches dispatch map =====
const rendererMismatches = [];
for (const d of declarations) {
  const routeInfo = dispatchMap.routes[d.route];
  if (!routeInfo) {
    rendererMismatches.push({ route: d.route, entityKey: d.entityKey, reason: "route not in dispatch map" });
    continue;
  }
  if (d.renderer !== routeInfo.renderer) {
    rendererMismatches.push({
      route: d.route, entityKey: d.entityKey,
      declaredRenderer: d.renderer, dispatchRenderer: routeInfo.renderer,
      reason: "renderer mismatch"
    });
  }
  if (d.rendererFile !== routeInfo.rendererFile) {
    rendererMismatches.push({
      route: d.route, entityKey: d.entityKey,
      declaredRendererFile: d.rendererFile, dispatchRendererFile: routeInfo.rendererFile,
      reason: "rendererFile mismatch"
    });
  }
  if (d.pageFamily !== routeInfo.pageFamily) {
    rendererMismatches.push({
      route: d.route, entityKey: d.entityKey,
      declaredPageFamily: d.pageFamily, dispatchPageFamily: routeInfo.pageFamily,
      reason: "pageFamily mismatch"
    });
  }
}
report.checks.rendererOwnerMatchesDispatch = {
  status: rendererMismatches.length === 0 ? "pass" : "fail",
  expected: "every declaration's renderer/rendererFile/pageFamily must match dispatch map",
  mismatches: rendererMismatches
};

// ===== Check 5: uiEvent non-null or has exemption =====
const uiEventMissing = [];
const invalidExemptionTypes = [];
const validExemptionTypes = new Set([
  "pending-explicit-semantics",
  "pending-instance-disambiguation",
  "decorative",
  "container-only"
]);
for (const d of declarations) {
  if (d.uiEvent === null || d.uiEvent === undefined) {
    if (!d.uiEventExemption) {
      uiEventMissing.push({ entityKey: d.entityKey, controlKey: d.controlKey, route: d.route });
    } else if (!validExemptionTypes.has(d.uiEventExemption)) {
      invalidExemptionTypes.push({ entityKey: d.entityKey, uiEventExemption: d.uiEventExemption });
    }
  }
}
report.checks.uiEventNonNullOrExemption = {
  status: uiEventMissing.length === 0 && invalidExemptionTypes.length === 0 ? "pass" : "fail",
  expected: "every declaration has uiEvent or uiEventExemption (one of: pending-explicit-semantics, pending-instance-disambiguation, decorative, container-only)",
  missingExemption: uiEventMissing,
  invalidExemptionType: invalidExemptionTypes
};

// ===== Check 6: controlId non-null or has exemption =====
const controlIdMissing = [];
const invalidControlIdExemptions = [];
const validControlIdExemptions = new Set([
  "pending-registry-enumeration"
]);
for (const d of declarations) {
  if (d.controlId === null || d.controlId === undefined) {
    if (!d.controlIdExemption) {
      controlIdMissing.push({ entityKey: d.entityKey, controlKey: d.controlKey, route: d.route });
    } else if (!validControlIdExemptions.has(d.controlIdExemption)) {
      invalidControlIdExemptions.push({ entityKey: d.entityKey, controlIdExemption: d.controlIdExemption });
    }
  }
}
report.checks.controlIdNonNullOrExemption = {
  status: controlIdMissing.length === 0 && invalidControlIdExemptions.length === 0 ? "pass" : "fail",
  expected: "every declaration has controlId or controlIdExemption (one of: pending-registry-enumeration)",
  missingExemption: controlIdMissing,
  invalidExemptionType: invalidControlIdExemptions
};

// ===== Check 7: subcontrol count = 50 (28 switch + 15 select + 4 stepper + 3 segment) =====
const declaredSubcontrols = declarations.filter(d => d.source === "r2.0-subcontrol");
const declaredByType = { switch: 0, select: 0, stepper: 0, segment: 0 };
for (const d of declaredSubcontrols) declaredByType[d.expectedSubcontrolType] = (declaredByType[d.expectedSubcontrolType] || 0) + 1;
const expectedByType = { switch: 28, select: 15, stepper: 4, segment: 3 };
const expectedSubtotal = 50;
const subcontrolCountOk =
  declaredByType.switch === expectedByType.switch &&
  declaredByType.select === expectedByType.select &&
  declaredByType.stepper === expectedByType.stepper &&
  declaredByType.segment === expectedByType.segment &&
  declaredSubcontrols.length === expectedSubtotal;
report.checks.subcontrolCount50 = {
  status: subcontrolCountOk ? "pass" : "fail",
  expected: "50 subcontrol declarations (switch 28 / select 15 / stepper 4 [2 rows × 2 buttons] / segment 3 [1 row × 3 options])",
  expectedCount: expectedSubtotal,
  declaredCount: declaredSubcontrols.length,
  expectedByType,
  declaredByType
};

// ===== Check 8: collision detection (controlKey globally unique) =====
const ckCounts = new Map();
for (const d of declarations) {
  ckCounts.set(d.controlKey, (ckCounts.get(d.controlKey) || 0) + 1);
}
const ckCollisions = [];
for (const [ck, count] of ckCounts) {
  if (count > 1) ckCollisions.push({ controlKey: ck, count });
}
report.checks.collisionDetection = {
  status: ckCollisions.length === 0 ? "pass" : "fail",
  expected: "controlKey must be globally unique across all declarations",
  controlKeyCollisions: ckCollisions
};

// ===== Check 9: UiEvent values in schema enum =====
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

// ===== Check 10: declarations cover all dispatch-map routes =====
const routesMissingFromDeclarations = [];
for (const route of dispatchRoutes) {
  if (!declarationsByRoute.has(route) || declarationsByRoute.get(route).length === 0) {
    routesMissingFromDeclarations.push(route);
  }
}
report.checks.allDispatchRoutesCovered = {
  status: routesMissingFromDeclarations.length === 0 ? "pass" : "fail",
  expected: "every route in dispatch map must have at least one declaration",
  missingRoutes: routesMissingFromDeclarations
};

// ===== Check 11: R2.0 subcontrols NOT in registry (expected - they're new) =====
const r2SubcontrolsAlreadyInRegistry = [];
for (const d of declaredSubcontrols) {
  if (registryEntityKeys.has(d.entityKey)) {
    r2SubcontrolsAlreadyInRegistry.push({ entityKey: d.entityKey, status: "already-in-registry" });
  }
}
report.checks.r2SubcontrolsAreNew = {
  status: r2SubcontrolsAlreadyInRegistry.length === 0 ? "pass" : "info",
  expected: "R2.0 subcontrols should NOT be in R1.2 registry (they're new declarations for R2a to absorb)",
  alreadyInRegistry: r2SubcontrolsAlreadyInRegistry,
  newCount: declaredSubcontrols.length - r2SubcontrolsAlreadyInRegistry.length
};

// ---- Overall status ----
const criticalChecks = [
  "exact12PageFamilies",
  "routeLocalOccurrenceReconciliation",
  "registryBackedKeysInRegistry",
  "rendererOwnerMatchesDispatch",
  "uiEventNonNullOrExemption",
  "controlIdNonNullOrExemption",
  "subcontrolCount50",
  "collisionDetection",
  "uiEventInSchemaEnum",
  "allDispatchRoutesCovered"
];
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
console.log(`Page families: ${report.totals.declarationPageFamilies} (expected 12)`);
console.log(`Routes: ${report.totals.declarationRoutes} declarations / ${report.totals.dispatchRoutes} dispatch`);

if (!allCriticalPass) {
  console.error("FAIL: critical checks did not pass");
  for (const name of criticalChecks) {
    if (report.checks[name].status !== "pass") {
      console.error(`  ${name}: ${report.checks[name].status}`);
    }
  }
  process.exit(1);
}
