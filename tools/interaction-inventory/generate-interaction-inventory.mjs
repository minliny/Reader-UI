#!/usr/bin/env node
import {
  buildInteractionInventoryArtifacts,
  checkInteractionInventoryArtifactBytes,
  writeInteractionInventoryArtifacts,
} from "./interaction-inventory-lib.mjs";

const mode = process.argv[2];
if (!["--write", "--check"].includes(mode) || process.argv.length !== 3) {
  console.error("usage: node tools/interaction-inventory/generate-interaction-inventory.mjs --write|--check");
  process.exitCode = 2;
} else {
  const artifacts = buildInteractionInventoryArtifacts();
  if (mode === "--write") {
    const paths = writeInteractionInventoryArtifacts(artifacts);
    console.log(
      `[interaction-inventory] generated ${artifacts.coverage.routeCases} route/variant cases / ${artifacts.coverage.semanticControls} semantic Web controls / ${artifacts.coverage.suspectedNonSemanticControls} suspected non-semantic controls`,
    );
    for (const path of paths) console.log(`[interaction-inventory] wrote ${path}`);
  } else {
    checkInteractionInventoryArtifactBytes(artifacts);
    console.log(
      `[interaction-inventory] checked ${artifacts.coverage.routeCases} route/variant cases / ${artifacts.coverage.semanticControls} semantic Web controls / ${artifacts.coverage.suspectedNonSemanticControls} suspected non-semantic controls`,
    );
  }
}
