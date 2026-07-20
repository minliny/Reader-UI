#!/usr/bin/env node
// =============================================================================
// R2.0.1 · Canonical Renderer Declarations Generator
// -----------------------------------------------------------------------------
// 职责：从 R1.2 registry + R2.0.1 renderer-dispatch-map + R1.2 nonInteractiveContainers
//       重新生成 frontend-demo-optimized/control-identity-declarations.js。
//
// 输入：
//   1. tools/interaction-inventory/generated/control-id-registry.json  (R1.2 冻结)
//   2. tools/interaction-inventory/generated/renderer-dispatch-map.json (R2.0.1 产物)
//   3. tools/interaction-inventory/generated/nonInteractiveContainers.json (R1.2 冻结)
//   4. contracts/ui-event.schema.json (用于校验 uiEvent enum)
//
// 输出：
//   frontend-demo-optimized/control-identity-declarations.js
//
// 模式：
//   默认：重写 declarations 文件
//   --check：仅比对，不写入；若内容不一致返回非 0 退出码
//
// 生成规则：
//   - 12 页面族 exact gate：严格按 dispatch map 的 12 pageFamilies
//   - route-local occurrence 1:1：对 dispatch map 中每个 route，registry 在该 route
//     上的所有 occurrence 都生成 declaration
//   - renderer owner 来自 dispatch map，不是手写
//   - 46 个 subcontrol 行展开为 50 个 declaration：
//       switch (1) → 1 declaration
//       select (1) → 1 declaration
//       stepper (2 buttons: minus + plus) → 2 declarations
//       segment (3 buttons) → 3 declarations
//   - 每个 declaration 必须有 uiEvent 或 uiEventExemption
//   - 新增 subcontrol declaration controlId=null，必须有 controlIdExemption
// =============================================================================
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");

const REGISTRY_PATH = join(REPO_ROOT, "tools", "interaction-inventory", "generated", "control-id-registry.json");
const DISPATCH_MAP_PATH = join(REPO_ROOT, "tools", "interaction-inventory", "generated", "renderer-dispatch-map.json");
const NON_INTERACTIVE_PATH = join(REPO_ROOT, "tools", "interaction-inventory", "generated", "nonInteractiveContainers.json");
const UI_EVENT_SCHEMA_PATH = join(REPO_ROOT, "contracts", "ui-event.schema.json");
const OUTPUT_PATH = join(REPO_ROOT, "frontend-demo-optimized", "control-identity-declarations.js");

const CHECK_MODE = process.argv.includes("--check");

// ---- Load inputs ----
const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
const dispatchMap = JSON.parse(readFileSync(DISPATCH_MAP_PATH, "utf8"));
const nonInteractive = JSON.parse(readFileSync(NON_INTERACTIVE_PATH, "utf8"));
const uiEventSchema = JSON.parse(readFileSync(UI_EVENT_SCHEMA_PATH, "utf8"));
const uiEventEnum = new Set(uiEventSchema.properties.type.enum);

// ---- Route → domain mapping (for subcontrol declarations) ----
// 12 page families 中的 about-restore-preview 跨 system/sync 两个 domain，所以按 route 单独映射
const ROUTE_DOMAIN = {
  "bookshelf": "library",
  "bookshelf-empty": "library",
  "bookshelf-cover-mode": "library",
  "bookshelf-list-mode": "library",
  "bookshelf-book-more-menu": "library",
  "bookshelf-search-settings": "library",
  "book-detail": "library",
  "book-detail-toc-preview": "library",
  "book-directory": "library",
  "search-results": "library",
  "search-loading": "library",
  "search-empty": "library",
  "search-error": "library",
  "import-conflict-resolve": "import",
  "import-duplicate": "import",
  "import-empty-file": "import",
  "import-format-unsupported": "import",
  "import-parsing": "import",
  "import-partial-success": "import",
  "import-permission-denied": "import",
  "import-result-detail": "import",
  "discover": "discover",
  "discover-home": "discover",
  "discover-control": "discover",
  "discover-sort": "discover",
  "discover-entry-bestseller": "discover",
  "discover-entry-booklist": "discover",
  "discover-entry-category": "discover",
  "discover-entry-finished": "discover",
  "discover-entry-latest": "discover",
  "discover-entry-new": "discover",
  "discover-entry-ranking": "discover",
  "discover-entry-source": "discover",
  "rss": "rss",
  "rss-all": "rss",
  "rss-source-feed": "rss",
  "rss-source-category-novel": "rss",
  "rss-source-category-tech": "rss",
  "rss-source-category-booklist": "rss",
  "rss-refreshing": "rss",
  "rss-source-category-releases": "rss",
  "rss-source-category-issues": "rss",
  "rss-source-category-discussions": "rss",
  "source-switch": "source-switch",
  "source-switch-results": "source-switch",
  "global-settings": "settings",
  "settings-general": "settings",
  "source-management": "source",
  "source-debug": "source",
  "source-settings-entry": "source",
  "webdav-config": "sync",
  "sync-backup": "sync",
  "sync-settings-entry": "sync",
  "backup-settings": "sync",
  "progress-sync": "sync",
  "progress-sync-status": "sync",
  "remote-webdav-books": "sync",
  "about": "system",
  "about-feedback": "system",
  "about-version": "system",
  "restore-confirm": "sync",
  "restore-scopes": "sync",
  "restore-preview": "sync",
  "restore-progress": "sync",
  "restore-running": "sync",
  "restore-conflict": "sync",
  "restore-result": "sync"
};

// ---- UiEvent exemption mapping (for null uiEvent registry entries) ----
function exemptionForMappingStatus(mappingStatus) {
  switch (mappingStatus) {
    case "pending-explicit-semantics":
      return "pending-explicit-semantics";
    case "pending-instance-disambiguation":
      return "pending-instance-disambiguation";
    case "ambiguous-needs-review":
      return "pending-instance-disambiguation";
    case "auto-mapped":
      return "pending-explicit-semantics";
    default:
      return "pending-explicit-semantics";
  }
}

// ---- Hash helper for deterministic slugs ----
function hash8(input) {
  return createHash("sha256").update(input, "utf8").digest("hex").slice(0, 8);
}

// ---- Build declarations from registry ----
const targetRoutes = Object.keys(dispatchMap.routes);
const targetRouteSet = new Set(targetRoutes);

const registryEntries = registry.entries
  .filter(e => targetRouteSet.has(e.route))
  .sort((a, b) => {
    if (a.route !== b.route) return a.route < b.route ? -1 : 1;
    if (a.controlKey !== b.controlKey) return a.controlKey < b.controlKey ? -1 : 1;
    return 0;
  });

const registryDeclarations = [];
for (const e of registryEntries) {
  const routeInfo = dispatchMap.routes[e.route];
  if (!routeInfo) continue;
  const uiEvent = e.source.uiEvent || null;
  const decl = {
    entityKey: e.entityKey,
    controlKey: e.controlKey,
    controlId: e.controlId,
    uiEvent: uiEvent,
    route: e.route,
    state: e.state,
    domain: e.domain,
    family: e.family,
    role: e.role,
    renderer: routeInfo.renderer,
    rendererFile: routeInfo.rendererFile,
    pageFamily: routeInfo.pageFamily,
    source: "registry",
    label: e.source.label || null
  };
  if (uiEvent === null) {
    decl.uiEventExemption = exemptionForMappingStatus(e.mappingStatus);
  }
  registryDeclarations.push(decl);
}

// ---- Build subcontrol declarations from nonInteractiveContainers ----
const subcontrolRows = nonInteractive.entries
  .filter(e => e.containsUnenumeratedSubcontrols && targetRouteSet.has(e.routeId))
  .sort((a, b) => {
    if (a.routeId !== b.routeId) return a.routeId < b.routeId ? -1 : 1;
    if (a.candidateKey !== b.candidateKey) return a.candidateKey < b.candidateKey ? -1 : 1;
    return 0;
  });

const subcontrolDeclarations = [];
for (const row of subcontrolRows) {
  const routeInfo = dispatchMap.routes[row.routeId];
  if (!routeInfo) continue;
  const domain = ROUTE_DOMAIN[row.routeId] || routeInfo.pageFamily;
  const slug = "h-" + hash8(row.candidateKey + ":" + row.selectorSha256);
  const route = row.routeId;
  const state = row.state || "default";
  const candidateKey = row.candidateKey;

  if (row.expectedSubcontrolType === "switch") {
    const entityKey = `${domain}.switch.switch.${slug}`;
    const controlKey = `${entityKey}@${route}.${state}`;
    subcontrolDeclarations.push({
      entityKey, controlKey, controlId: null, uiEvent: "toggle.switch",
      route, state, domain, family: "switch", role: "switch",
      renderer: routeInfo.renderer, rendererFile: routeInfo.rendererFile,
      pageFamily: routeInfo.pageFamily, source: "r2.0-subcontrol",
      expectedSubcontrolType: "switch", expectedSubcontrolIndex: 0,
      label: row.label || null, candidateKey,
      controlIdExemption: "pending-registry-enumeration"
    });
  } else if (row.expectedSubcontrolType === "select") {
    const entityKey = `${domain}.combobox.combobox.${slug}`;
    const controlKey = `${entityKey}@${route}.${state}`;
    subcontrolDeclarations.push({
      entityKey, controlKey, controlId: null, uiEvent: "dropdown.option.select",
      route, state, domain, family: "combobox", role: "combobox",
      renderer: routeInfo.renderer, rendererFile: routeInfo.rendererFile,
      pageFamily: routeInfo.pageFamily, source: "r2.0-subcontrol",
      expectedSubcontrolType: "select", expectedSubcontrolIndex: 0,
      label: row.label || null, candidateKey,
      controlIdExemption: "pending-registry-enumeration"
    });
  } else if (row.expectedSubcontrolType === "stepper") {
    const buttons = [
      { suffix: "stepper-minus", labelSuffix: "-", uiEvent: "stepper.valueChange" },
      { suffix: "stepper-plus", labelSuffix: "+", uiEvent: "stepper.valueChange" }
    ];
    for (let i = 0; i < buttons.length; i++) {
      const b = buttons[i];
      const entityKey = `${domain}.button.button.${b.suffix}.${slug}`;
      const controlKey = `${entityKey}@${route}.${state}`;
      subcontrolDeclarations.push({
        entityKey, controlKey, controlId: null, uiEvent: b.uiEvent,
        route, state, domain, family: "button", role: "button",
        renderer: routeInfo.renderer, rendererFile: routeInfo.rendererFile,
        pageFamily: routeInfo.pageFamily, source: "r2.0-subcontrol",
        expectedSubcontrolType: "stepper", expectedSubcontrolIndex: i,
        label: (row.label || null) ? `${row.label} [${b.labelSuffix}]` : null,
        candidateKey, controlIdExemption: "pending-registry-enumeration"
      });
    }
  } else if (row.expectedSubcontrolType === "segment") {
    for (let i = 0; i < 3; i++) {
      const entityKey = `${domain}.button.button.segment-option-${i + 1}.${slug}`;
      const controlKey = `${entityKey}@${route}.${state}`;
      subcontrolDeclarations.push({
        entityKey, controlKey, controlId: null, uiEvent: "segment.item.switch",
        route, state, domain, family: "button", role: "button",
        renderer: routeInfo.renderer, rendererFile: routeInfo.rendererFile,
        pageFamily: routeInfo.pageFamily, source: "r2.0-subcontrol",
        expectedSubcontrolType: "segment", expectedSubcontrolIndex: i,
        label: (row.label || null) ? `${row.label} [option-${i + 1}]` : null,
        candidateKey, controlIdExemption: "pending-registry-enumeration"
      });
    }
  } else {
    console.error(`WARNING: unknown expectedSubcontrolType "${row.expectedSubcontrolType}" on route ${row.routeId}`);
  }
}

// ---- Combine and sort declarations ----
const PAGE_FAMILY_ORDER = [
  "bookshelf", "book-detail", "search-results", "import-conflict-resolve",
  "discover", "rss", "source-switch", "settings-general",
  "source-management", "webdav-config", "sync-backup", "about-restore-preview"
];

function sourceRank(s) { return s === "registry" ? 0 : 1; }

const allDeclarations = registryDeclarations.concat(subcontrolDeclarations);
allDeclarations.sort((a, b) => {
  const fa = PAGE_FAMILY_ORDER.indexOf(a.pageFamily);
  const fb = PAGE_FAMILY_ORDER.indexOf(b.pageFamily);
  if (fa !== fb) return fa - fb;
  if (a.route !== b.route) return a.route < b.route ? -1 : 1;
  if (a.source !== b.source) return sourceRank(a.source) - sourceRank(b.source);
  if (a.controlKey !== b.controlKey) return a.controlKey < b.controlKey ? -1 : 1;
  return 0;
});

// ---- Validate ----
const invalidUiEvents = [];
for (const d of allDeclarations) {
  if (d.uiEvent !== null && !uiEventEnum.has(d.uiEvent)) {
    invalidUiEvents.push({ entityKey: d.entityKey, uiEvent: d.uiEvent });
  }
}
if (invalidUiEvents.length > 0) {
  console.error("FAIL: invalid UiEvent values:");
  for (const v of invalidUiEvents.slice(0, 10)) console.error("  ", v);
  process.exit(1);
}

const missingUiEventExemption = [];
for (const d of allDeclarations) {
  if (d.uiEvent === null && !d.uiEventExemption) {
    missingUiEventExemption.push({ entityKey: d.entityKey, controlKey: d.controlKey });
  }
}
if (missingUiEventExemption.length > 0) {
  console.error("FAIL: declarations with null uiEvent but no uiEventExemption:");
  for (const v of missingUiEventExemption.slice(0, 10)) console.error("  ", v);
  process.exit(1);
}

const missingControlIdExemption = [];
for (const d of allDeclarations) {
  if (d.controlId === null && !d.controlIdExemption) {
    missingControlIdExemption.push({ entityKey: d.entityKey, controlKey: d.controlKey });
  }
}
if (missingControlIdExemption.length > 0) {
  console.error("FAIL: declarations with null controlId but no controlIdExemption:");
  for (const v of missingControlIdExemption.slice(0, 10)) console.error("  ", v);
  process.exit(1);
}

// ---- Compute meta ----
const subByType = { switch: 0, select: 0, stepper: 0, segment: 0 };
for (const d of subcontrolDeclarations) {
  subByType[d.expectedSubcontrolType] = (subByType[d.expectedSubcontrolType] || 0) + 1;
}

const meta = {
  generatedAt: "2026-07-20T00:00:00.000Z",
  baselineCommit: "5ce233f",
  baselineTag: "R1.2",
  generator: "tools/interaction-inventory/generate-canonical-declarations.mjs",
  pageFamilies: PAGE_FAMILY_ORDER.slice(),
  totals: {
    registryBacked: registryDeclarations.length,
    r2Subcontrols: subcontrolDeclarations.length,
    subcontrolsByType: subByType,
    total: allDeclarations.length
  },
  exemptionSummary: {
    registryUiEventNull: registryDeclarations.filter(d => d.uiEvent === null).length,
    subcontrolControlIdNull: subcontrolDeclarations.filter(d => d.controlId === null).length
  }
};

// ---- Serialize ----
function serializeDeclarations(decls, metaObj) {
  const lines = [];
  lines.push("/**");
  lines.push(" * R2.0.1 · Canonical Renderer Control Identity Declarations (GENERATED)");
  lines.push(" * -----------------------------------------------------------------------------");
  lines.push(" * 职责：为 frontend-demo-optimized/ 的 canonical renderer 声明每个渲染控件对应");
  lines.push(" *       的 entityKey / controlKey / UiEvent 映射，作为 R2a/R2b 接入 DOM 属性");
  lines.push(" *       （data-entity-key / data-control-key / data-control-id）的前置对账源。");
  lines.push(" *");
  lines.push(" * 范围（12 页面族 exact gate）：");
  lines.push(" *   bookshelf / book-detail / search-results / import-conflict-resolve /");
  lines.push(" *   discover / rss / source-switch / settings-general / source-management /");
  lines.push(" *   webdav-config / sync-backup / about-restore-preview");
  lines.push(" *");
  lines.push(" * 数据来源：");
  lines.push(" *   1. registry-backed 声明：从 R1.2 control-id-registry.json 投影 12 页面族下");
  lines.push(" *      每个 route 的所有 occurrence（route-local 1:1 对账，非全局集合）。");
  lines.push(" *   2. r2.0-subcontrol 声明：R1.2 nonInteractiveContainers.json 标记的 46 个");
  lines.push(" *      containsUnenumeratedSubcontrols 设置行子控件，按 expectedSubcontrolCount");
  lines.push(" *      展开：switch→1, select→1, stepper→2 (minus+plus), segment→3。");
  lines.push(" *");
  lines.push(" * 生成器：tools/interaction-inventory/generate-canonical-declarations.mjs");
  lines.push(" * 生成基线：commit 5ce233f（R1.2），2026-07-20");
  lines.push(" *");
  lines.push(" * 不做的事（R2.0.1 边界）：");
  lines.push(" *   - 不写 data-control-id / data-entity-key / data-control-key 到渲染输出 HTML（R2b）");
  lines.push(" *   - 不重构 renderer 行为（switch 还是 span；segment/stepper 缺事件不补）");
  lines.push(" *   - 不修改 R1.2 冻结的 schema/types/src-control-identity/registry");
  lines.push(" *");
  lines.push(" * 重算：node tools/interaction-inventory/generate-canonical-declarations.mjs");
  lines.push(" * 校验：node tools/interaction-inventory/generate-canonical-declarations.mjs --check");
  lines.push(" * -----------------------------------------------------------------------------");
  lines.push(" */");
  lines.push("");
  lines.push("// ESM-friendly: 同时提供 CommonJS module.exports 和浏览器全局挂载");
  lines.push("");
  lines.push("var CANONICAL_CONTROL_DECLARATIONS = [");
  for (let i = 0; i < decls.length; i++) {
    const d = decls[i];
    const entries = Object.entries(d);
    const isLast = i === decls.length - 1;
    lines.push("    {");
    for (let j = 0; j < entries.length; j++) {
      const [k, v] = entries[j];
      const valueJson = JSON.stringify(v);
      const comma = j < entries.length - 1 ? "," : "";
      lines.push(`      ${JSON.stringify(k)}: ${valueJson}${comma}`);
    }
    lines.push(`    }${isLast ? "" : ","}`);
  }
  lines.push("  ];");
  lines.push("");
  const metaJson = JSON.stringify(metaObj, null, 2);
  const metaIndented = metaJson.split("\n").map((line, idx) => idx === 0 ? line : "  " + line).join("\n");
  lines.push("var R2_DECLARATIONS_META = " + metaIndented + ";");
  lines.push("");
  lines.push("// ESM-friendly: 同时提供 CommonJS module.exports 和浏览器全局挂载");
  lines.push("if (typeof module !== \"undefined\" && module.exports) {");
  lines.push("  module.exports = {");
  lines.push("    CANONICAL_CONTROL_DECLARATIONS,");
  lines.push("    R2_DECLARATIONS_META,");
  lines.push("  };");
  lines.push("}");
  lines.push("if (typeof window !== \"undefined\") {");
  lines.push("  window.CANONICAL_CONTROL_DECLARATIONS = CANONICAL_CONTROL_DECLARATIONS;");
  lines.push("  window.R2_DECLARATIONS_META = R2_DECLARATIONS_META;");
  lines.push("}");
  lines.push("");
  return lines.join("\n");
}

const output = serializeDeclarations(allDeclarations, meta);

// ---- Write or check ----
if (CHECK_MODE) {
  let existing = "";
  try {
    existing = readFileSync(OUTPUT_PATH, "utf8");
  } catch (e) {
    // file doesn't exist
  }
  if (existing === output) {
    console.log(`OK: declarations up-to-date (${allDeclarations.length} entries)`);
    process.exit(0);
  } else {
    console.error(`DRIFT: declarations file is out of date`);
    console.error(`  expected: ${allDeclarations.length} entries, ${output.length} bytes`);
    console.error(`  actual:   ${existing.length} bytes`);
    console.error(`  run without --check to regenerate`);
    process.exit(1);
  }
} else {
  writeFileSync(OUTPUT_PATH, output, "utf8");
  console.log(`Wrote ${OUTPUT_PATH.replace(REPO_ROOT + "/", "")}`);
  console.log(`  total: ${allDeclarations.length} declarations`);
  console.log(`    registry-backed: ${registryDeclarations.length}`);
  console.log(`    r2.0-subcontrol: ${subcontrolDeclarations.length} (switch ${subByType.switch} / select ${subByType.select} / stepper ${subByType.stepper} / segment ${subByType.segment})`);
  console.log(`  page families: ${PAGE_FAMILY_ORDER.length}`);
}
