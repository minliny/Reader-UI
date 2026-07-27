import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const verifier = path.join(repoRoot, 'tools/design/verify-figma-visual-admission-registry.mjs');

function run(...args) {
  return spawnSync(process.execPath, [verifier, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

test('standard demo verification exposes an explicitly classified but delivery-blocked Figma admission state', () => {
  const report = run('--report');
  assert.equal(report.status, 0, report.stderr);
  assert.match(report.stdout, /report: structural-valid; delivery-blocked/);
  assert.match(report.stdout, /revisionBlocked=0/);
  assert.doesNotMatch(report.stderr, /route-inventory\/unclassified=/);
  assert.doesNotMatch(report.stderr, /current-revision-unavailable/);
  assert.match(report.stderr, /current-read-unfrozen|drift-open/);

  const baseline = run('--baseline');
  assert.notEqual(baseline.status, 0);
  assert.match(baseline.stdout, /baseline: structural-valid; delivery-blocked/);
  assert.match(baseline.stderr, /FIGMA_VISUAL_ADMISSION_GATE BLOCKED:/);
});
