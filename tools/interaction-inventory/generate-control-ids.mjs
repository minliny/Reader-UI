#!/usr/bin/env node
// A2 · Control Identity Foundation — registry generator
//
// Reads docs/audits/ic0-2026-07-19/generated/interaction-control-inventory.json
// (3,815 candidates) and emits canonical controlIds + ScreenGraph bindings +
// pending Figma crosswalk + DOM identity map.
//
// Usage:
//   node tools/interaction-inventory/generate-control-ids.mjs --write
//   node tools/interaction-inventory/generate-control-ids.mjs --check

import {
  buildControlIdRegistry,
  buildDomIdentityMap,
  buildFigmaCrosswalkPending,
  buildScreenGraphBindingArtifacts,
  checkControlIdArtifactBytes,
  writeControlIdArtifacts,
} from "./interaction-inventory-lib.mjs";

const mode = process.argv[2];
if (!["--write", "--check"].includes(mode) || process.argv.length !== 3) {
  console.error("usage: node tools/interaction-inventory/generate-control-ids.mjs --write|--check");
  process.exitCode = 2;
} else if (mode === "--write") {
  const paths = writeControlIdArtifacts();
  const registry = buildControlIdRegistry();
  const binding = buildScreenGraphBindingArtifacts();
  const figma = buildFigmaCrosswalkPending();
  const dom = buildDomIdentityMap();
  console.log(
    `[control-identity] generated ${registry.totals.candidates} entries / ${registry.totals.uniqueControlIds} unique controlIds / ${registry.totals.autoMapped} auto-mapped / ${registry.totals.needsManualMapping} needs-manual / ${registry.totals.ambiguousNeedsReview} ambiguous / ${binding.totals.bound} bound / ${binding.totals.unresolved} unresolved / ${binding.totals.pendingFigmaJoin} pending-figma-join / ${figma.totalPending} figma-pending / ${dom.totals.entries} dom-entries`,
  );
  for (const path of paths) console.log(`[control-identity] wrote ${path}`);
} else {
  checkControlIdArtifactBytes();
  const registry = buildControlIdRegistry();
  console.log(
    `[control-identity] checked ${registry.totals.candidates} entries / ${registry.totals.uniqueControlIds} unique controlIds; artifacts byte-stable`,
  );
}
