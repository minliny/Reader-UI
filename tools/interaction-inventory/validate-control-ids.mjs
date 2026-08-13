#!/usr/bin/env node
// A2 · Control Identity Foundation — registry validator
//
// Verifies the persisted control-id-registry.json:
//   1. Zero missing controlIds (all 3,815 IC0 candidates covered)
//   2. Zero duplicate controlIds
//   3. Reproducible (rebuild from inventory yields identical controlIds)
//   4. No forged Figma joins (all entries remain pending-figma-join)
//   5. Schema shape sanity (required fields present)
//
// Usage:
//   node tools/interaction-inventory/validate-control-ids.mjs
//   node tools/interaction-inventory/validate-control-ids.mjs --report

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  REPO_ROOT,
  CONTROL_ID_REGISTRY_PATH,
  validateControlIdRegistry,
} from "./interaction-inventory-lib.mjs";

const mode = process.argv[2] || "--check";
if (!["--check", "--report"].includes(mode) || process.argv.length > 3) {
  console.error("usage: node tools/interaction-inventory/validate-control-ids.mjs [--report]");
  process.exitCode = 2;
} else {
  const registryPath = join(REPO_ROOT, CONTROL_ID_REGISTRY_PATH);
  const registry = JSON.parse(readFileSync(registryPath, "utf8"));
  const report = validateControlIdRegistry(registry);
  if (mode === "--report") {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`[control-identity] schemaVersion=${report.schemaVersion}`);
    console.log(`[control-identity] totals=${JSON.stringify(report.totals)}`);
    if (report.errors.length > 0) {
      console.log(`[control-identity] errors=${report.errors.length}`);
      for (const error of report.errors) console.log(`  ERROR: ${error}`);
      process.exitCode = 1;
    } else {
      console.log(`[control-identity] valid=true (zero duplicates, zero missing, reproducible, no forged figma joins)`);
    }
    if (report.warnings.length > 0) {
      for (const warning of report.warnings) console.log(`  WARN: ${warning}`);
    }
  }
}
