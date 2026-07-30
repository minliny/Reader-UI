import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyRevisionEvidenceToRegistry } from './figma-current-revision-adapter-lib.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const verifier = path.join(repoRoot, 'tools/design/verify-figma-visual-admission-registry.mjs');
const registryPath = path.join(repoRoot, 'docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json');
const currentRevisionEvidencePath = path.join(repoRoot, 'docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json');

function run(...args) {
  return spawnSync(process.execPath, [verifier, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

test('report validates registry structure while explicitly reporting delivery blocked', () => {
  const result = run('--report');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /report: structural-valid; delivery-blocked/);
  assert.match(result.stdout, /unclassifiedRoutes=\d+/);
  assert.match(result.stderr, /FIGMA_VISUAL_ADMISSION_GATE BLOCKED:/);
});

test('baseline fails truthfully while current revision and route admission remain open', () => {
  const result = run('--baseline');
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /baseline: structural-valid; delivery-blocked/);
  assert.match(result.stdout, /unclassifiedRoutes=\d+/);
  assert.match(result.stderr, /FIGMA_VISUAL_ADMISSION_GATE BLOCKED:/);
});

test('strict delivery remains blocked until the registry has current revision and enforcement evidence', () => {
  const result = run('--strict');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /FIGMA_VISUAL_ADMISSION_GATE BLOCKED:/);
});

test('report mode cannot be combined with a fail-closed delivery mode', () => {
  const result = run('--report', '--strict');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /modes are mutually exclusive/);
});

test('Reader quick/module/full bindings name their canonical masters and final Phone/Tablet assemblies', () => {
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
  const currentRevisionEvidence = JSON.parse(readFileSync(currentRevisionEvidencePath, 'utf8'));
  // A2 strict physical removal split the responsive-page-master records in two:
  // BOUND records still carry their native routeIds; PENDING records had their
  // 5 legacy module routes (toc-bookmarks/tts/reader-appearance/reader-settings/
  // content-search) physically retired (MAJOR) and now wait for their own Figma-
  // backed native conversion. Both groups keep the exact same canonical Figma
  // master + Phone/Tablet viewport + final assembly binding.
  const bound = {
    'auto-page': ['942:53', '942:50', '942:52', '943:9001', '943:9301'],
    'content-replacement': ['942:57', '942:54', '942:56', '943:9455', '943:9741'],
    'reader-full-directory': ['942:77', '942:74', '942:76', '943:11617', '943:11949'],
    'reader-full-tts': ['942:81', '942:78', '942:80', '943:12119', '943:13483'],
    'reader-full-appearance': ['942:85', '942:82', '942:84', '943:14169', '943:14553'],
    'reader-full-settings': ['942:89', '942:86', '942:88', '943:14749', '943:15055'],
  };
  const pending = {
    'reader.module.directory': ['942:61', '942:58', '942:60', '943:9888', '943:10196'],
    'reader.module.tts': ['942:65', '942:62', '942:64', '943:10354', '943:10642'],
    'reader.module.appearance': ['942:69', '942:66', '942:68', '943:10790', '943:11068'],
    'reader.module.settings': ['942:73', '942:70', '942:72', '943:11211', '943:11477'],
    'reader.quick.content-search': ['942:49', '942:46', '942:48', '943:8625', '943:8873'],
  };
  const records = registry.records.filter((record) => record.surfaceType === 'responsive-page-master');
  assert.equal(records.length, 11);
  function assertFigmaBinding(record, [master, phone, tablet, phoneAssembly, tabletAssembly]) {
    assert.equal(record.classification, 'exact-figma-binding');
    assert.equal(record.figma.pageId, '834:3');
    assert.equal(record.figma.canonicalMasterId, master);
    assert.equal(record.figma.nodeId, master);
    assert.equal(record.figma.viewportNodes.phone, phone);
    assert.equal(record.figma.viewportNodes.tablet, tablet);
    assert.equal(record.figma.finalAssemblyNodes.phone, phoneAssembly);
    assert.equal(record.figma.finalAssemblyNodes.tablet, tabletAssembly);
    assert.equal(record.figma.revision, currentRevisionEvidence.currentRevision);
    assert.equal(record.figma.revisionStatus, 'official-rest-current-version-node-verified');
    assert.equal(record.figma.revisionEvidence.artifact, 'docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json');
  }
  for (const [routeId, nodes] of Object.entries(bound)) {
    const record = records.find((candidate) => candidate.routeIds.includes(routeId));
    assert.ok(record, `${routeId} must have a dedicated responsive master binding`);
    assertFigmaBinding(record, nodes);
  }
  for (const [recordId, nodes] of Object.entries(pending)) {
    const record = records.find((candidate) => candidate.id === recordId);
    assert.ok(record, `${recordId} must remain registered pending its native conversion`);
    assert.deepEqual(record.routeIds, [], `${recordId} must not keep retired routeIds`);
    assert.equal(record.reconstruction?.status, 'pending-source-conversion',
      `${recordId} must record why its routeIds are empty`);
    assert.equal(record.harmony?.status, 'candidate-backport',
      `${recordId} must remain fail-closed while pending`);
    assertFigmaBinding(record, nodes);
  }
  const unresolved = registry.records.find((record) => record.id === 'reader.quick-and-full-unbound-options');
  assert.deepEqual(unresolved.routeIds, [
    'reader-full-font', 'reader-full-theme', 'reader-full-theme-edit', 'reader-full-layout', 'reader-full-page-turn',
  ]);
  assert.equal(unresolved.classification, 'figma-unbound-fail-closed');
  assert.equal(unresolved.figma.nodeId, null);
});

test('strict verifier accepts only REST-backed non-null revisions and does not infer visual delivery from the adapter', () => {
  const temp = mkdtempSync(path.join(repoRoot, '.figma-revision-gate-'));
  try {
    const tempRegistry = path.join(temp, 'registry.json');
    const tempRouteSchema = path.join(temp, 'route.schema.json');
    const evidencePath = path.join(temp, 'evidence.json');
    const registry = {
      kind: 'FIGMA_VISUAL_ADMISSION_REGISTRY',
      authority: { fileKey: 'fixture-file' },
      routeInventory: { expectedRouteCount: 1 },
      records: [{
        id: 'fixture.page',
        surfaceType: 'route-family',
        routeIds: ['fixture-route'],
        classification: 'exact-figma-binding',
        deliveryStatus: 'admitted-current-revision-frozen',
        figma: {
          fileKey: 'fixture-file',
          pageId: '1:1',
          canonicalMasterId: '1:2',
          nodeId: '1:2',
          viewportNodes: { phone: '1:3', tablet: '1:4' },
          revision: null,
          revisionStatus: 'current-node-read-revision-unavailable',
        },
        local: { status: 'approved', targets: [] },
        harmony: { status: 'approved', targets: [] },
        evidence: ['fixture'],
      }],
    };
    const routeSchema = { properties: { id: { enum: ['fixture-route'] } } };
    writeFileSync(tempRouteSchema, JSON.stringify(routeSchema), 'utf8');

    const unproved = JSON.parse(JSON.stringify(registry));
    unproved.records[0].figma.revision = 'rev-42';
    writeFileSync(tempRegistry, JSON.stringify(unproved), 'utf8');
    const missingEvidence = run('--strict', '--registry', tempRegistry, '--route-schema', tempRouteSchema);
    assert.notEqual(missingEvidence.status, 0);
    assert.match(missingEvidence.stderr, /non-null revision lacks revisionEvidence artifact/);

    const evidence = {
      kind: 'FIGMA_CURRENT_REVISION_EVIDENCE',
      schemaVersion: '1.0.0',
      fileKey: 'fixture-file',
      currentRevision: 'rev-42',
      lastModified: '2026-07-24T00:00:00Z',
      observedAt: '2026-07-24T00:01:00Z',
      provenance: { source: 'figma-rest', readOnly: true },
      resolvedNodes: ['1:1', '1:2', '1:3', '1:4'].map((id) => ({ id, name: id, type: 'FRAME' })),
    };
    const artifact = path.relative(repoRoot, evidencePath).split(path.sep).join('/');
    const applied = applyRevisionEvidenceToRegistry(registry, evidence, artifact);
    writeFileSync(evidencePath, JSON.stringify(evidence), 'utf8');
    writeFileSync(tempRegistry, JSON.stringify(applied.registry), 'utf8');
    const proven = run('--strict', '--registry', tempRegistry, '--route-schema', tempRouteSchema);
    assert.equal(proven.status, 0, proven.stderr);
    assert.match(proven.stdout, /strict: structural-valid; delivery-admitted/);
    assert.match(proven.stdout, /revisionBlocked=0/);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
