import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const verifier = path.join(repoRoot, 'tools/design/verify-figma-first-reading-chain.mjs');
const reconciliationPath = path.join(repoRoot, 'docs/design/handoffs/reading-chain/F0_CURRENT_BINDING_RECONCILIATION.json');
const ledgerPath = path.join(repoRoot, 'docs/design/handoffs/reading-chain/FIGMA_DESIGN_DELTA_LEDGER.json');
const evidencePath = path.join(repoRoot, 'docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json');

function run(...args) {
  return spawnSync(process.execPath, [verifier, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

test('baseline reconciles only fully evidence-resolved exact reading-chain bindings', () => {
  const result = run('--baseline');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /baseline: manifest-valid; delivery-blocked/);
  assert.match(result.stdout, /currentBindings=21 reconciledUnfrozenDeltas=6/);

  const reconciliation = JSON.parse(readFileSync(reconciliationPath, 'utf8'));
  const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
  const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
  const resolved = new Set(evidence.resolvedNodes.map((node) => node.id));

  assert.ok(reconciliation.currentBindings.some((binding) => binding.registryRecordId === 'bookshelf.multi-select'));
  assert.ok(ledger.reconciledCurrentReadEntries.every((entry) => entry.frozen === false));
  assert.equal(resolved.has('493:191'), false, 'unread Phone List child must remain fail-closed');
  assert.match(reconciliation.unreconciledHistoricalChildBindings.examples.join('\n'), /493:191/);
  assert.doesNotMatch(reconciliation.unreconciledHistoricalChildBindings.examples.join('\n'), /2260:1460/);
  assert.equal(
    reconciliation.reconciledHistoricalChildBindings.find((binding) => binding.id === 'book-detail-hero')?.revision,
    evidence.currentRevision,
  );
});

test('strict mode remains delivery-blocked after structural reconciliation', () => {
  const result = run('--strict');
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /strict: manifest-valid; delivery-blocked/);
  assert.match(result.stderr, /bookshelf\.multi-select=current-read-unfrozen/);
  assert.match(result.stderr, /book-detail\.chapter-row=current-read-unfrozen/);
});

test('a parent-only node set cannot silently replace exact child-node evidence', () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'reader-figma-current-reconciliation-'));
  try {
    const malformed = JSON.parse(readFileSync(reconciliationPath, 'utf8'));
    const bookshelf = malformed.currentBindings.find((binding) => binding.registryRecordId === 'bookshelf.page');
    bookshelf.requiredNodes = ['941:6'];
    const temporaryReconciliation = path.join(temporary, 'reconciliation.json');
    writeFileSync(temporaryReconciliation, JSON.stringify(malformed), 'utf8');
    const result = run('--baseline', '--reconciliation', temporaryReconciliation);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /bookshelf\.page: reconciled node set does not exactly match/);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
