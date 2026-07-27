#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  redactFigmaReadToken,
  runFigmaNodeSnapshotCli,
} from './figma-node-snapshot-lib.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

try {
  await runFigmaNodeSnapshotCli({
    argv: process.argv.slice(2),
    repoRoot,
  });
} catch (error) {
  const safeMessage = redactFigmaReadToken(
    error instanceof Error ? error.message : error,
    process.env.FIGMA_READ_TOKEN,
  );
  console.error(`FIGMA_NODE_SNAPSHOT: ${safeMessage}`);
  process.exitCode = 1;
}
