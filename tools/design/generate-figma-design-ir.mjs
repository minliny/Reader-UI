#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runFigmaDesignIrCli } from './figma-design-ir-artifact-lib.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

try {
  runFigmaDesignIrCli({
    argv: process.argv.slice(2),
    repoRoot,
  });
} catch (error) {
  console.error(`FIGMA_DESIGN_IR: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
