import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildVisualAdmissionArtifact } from './generate-visual-admission-contract.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const registryPath = path.join(repoRoot, 'docs', 'design', 'FIGMA_VISUAL_ADMISSION_REGISTRY.json');
const tokenLedgerPath = path.join(repoRoot, 'docs', 'design', 'FIGMA_VISUAL_TOKEN_LEDGER.json');
const registrySource = fs.readFileSync(registryPath, 'utf8');
const tokenLedgerSource = fs.readFileSync(tokenLedgerPath, 'utf8');
const registry = JSON.parse(registrySource);
const baseline = buildVisualAdmissionArtifact(registrySource, tokenLedgerSource);

function cloneRegistry() {
  return structuredClone(registry);
}

test('B3 Reader-UI-only evidence changes do not stale the native admission artifact', () => {
  const changed = cloneRegistry();
  const record = changed.records.find((item) => item.id === 'bookshelf.page');
  record.local.status = record.local.status === 'implementation-ready'
    ? 'candidate-backport'
    : 'implementation-ready';
  record.local.targets = [...record.local.targets, 'frontend-demo-optimized/example.js#LocalOnly'];
  record.evidence = [...record.evidence, 'docs/design/handoffs/bookshelf/LOCAL_READY_FOR_FIGMA.json'];

  assert.equal(
    buildVisualAdmissionArtifact(JSON.stringify(changed, null, 4), tokenLedgerSource),
    baseline,
  );
});

test('Figma binding changes remain visible in the native admission artifact digest', () => {
  const changed = cloneRegistry();
  const record = changed.records.find((item) => item.id === 'bookshelf.page');
  record.figma.nodeId = 'changed-node-id';

  assert.notEqual(
    buildVisualAdmissionArtifact(JSON.stringify(changed), tokenLedgerSource),
    baseline,
  );
});

test('Harmony admission changes remain visible in the generated entries and digest', () => {
  const changed = cloneRegistry();
  const record = changed.records.find((item) => item.id === 'settings.general');
  record.harmony.status = record.harmony.status === 'implementation-ready'
    ? 'candidate-backport'
    : 'implementation-ready';

  assert.notEqual(
    buildVisualAdmissionArtifact(JSON.stringify(changed), tokenLedgerSource),
    baseline,
  );
});

test('record-level gates preserve component families without native allowlists', () => {
  assert.match(
    baseline,
    /recordId: 'reader\.control-home', admission: 'implementation-ready', sourceBound: true, implementationReady: true/,
  );
  for (const recordId of [
    'reader.module.directory',
    'reader.module.tts',
    'reader.module.appearance',
    'reader.module.settings',
  ]) {
    assert.match(
      baseline,
      new RegExp(
        `recordId: '${recordId.replaceAll('.', '\\.')}', admission: 'candidate-backport', ` +
        'sourceBound: true, implementationReady: false',
      ),
    );
  }
  assert.match(
    baseline,
    /static isRecordAdmitted\(recordId: string\): boolean/,
  );
});

test('registry whitespace and object-key formatting do not change the artifact', () => {
  assert.equal(
    buildVisualAdmissionArtifact(JSON.stringify(registry), tokenLedgerSource),
    baseline,
  );
});
