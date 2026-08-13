#!/usr/bin/env node

import {
  buildReaderIconExportPlan,
  serializeReaderIconExportPlan,
  validateReaderIconExportPlan,
} from './figma-reader-icon-export-plan-lib.mjs';

function usage() {
  console.log(`Usage:
  node tools/design/figma-reader-icon-export-plan.mjs
  node tools/design/figma-reader-icon-export-plan.mjs --check

Default:
  Print the deterministic, revision-pinned Reader icon clean-SVG export plan.

Options:
  --check  Validate the plan without printing generated use_figma programs.
  --help   Show this help.

This command never calls Figma, downloads bytes, writes files, or changes
crosswalk/manifest evidence.`);
}

function main() {
  const argumentsList = process.argv.slice(2);
  const help = argumentsList.includes('--help') || argumentsList.includes('-h');
  if (help) {
    usage();
    return;
  }
  const unknown = argumentsList.filter((value) => value !== '--check');
  if (unknown.length > 0) throw new Error(`unknown argument: ${unknown[0]}`);

  const plan = buildReaderIconExportPlan();
  const summary = validateReaderIconExportPlan(plan);
  if (argumentsList.includes('--check')) {
    console.log(
      `FIGMA_READER_ICON_EXPORT_PLAN: PASS ` +
      `(${summary.semanticCount} semantics, ${summary.exportCount} exports, ` +
      `${summary.batchCount} batches, revision ${summary.revision})`,
    );
    return;
  }
  process.stdout.write(serializeReaderIconExportPlan(plan));
}

try {
  main();
} catch (error) {
  console.error(`FIGMA_READER_ICON_EXPORT_PLAN: ${error.message}`);
  process.exitCode = 1;
}
