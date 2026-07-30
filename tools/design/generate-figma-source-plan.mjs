#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runFigmaSourcePlanCli } from './figma-source-plan-lib.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

try {
  runFigmaSourcePlanCli({
    argv: process.argv.slice(2),
    repoRoot,
  });
} catch (error) {
  console.error(`FIGMA_SOURCE_PLAN: ${error.message}`);
  process.exitCode = 1;
}
