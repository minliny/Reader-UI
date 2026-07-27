// promote-family.test.mjs — transaction recovery tests for promote-family.mjs
//
// The 2026-07-27 second audit found that promotion is "single-file atomic +
// in-process rollback", not a true four-file atomic transaction. If the process
// is killed or disk errors occur between writes, there is no persistent
// transaction log to restore a consistent snapshot.
//
// These tests verify:
// 1. Success path: after a complete promotion, all four files are consistent
//    (registry, upstream artifact, consumer copy, ledger).
// 2. Fault injection: each write stage can fail, and the rollback restores the
//    pre-transaction state for ALL four files.
// 3. Ledger chain integrity: entries are hash-chained and tamper-evident.
// 4. Idempotent refuse: promoting an already-promoted record fails without
//    mutating anything.
//
// These tests do NOT verify:
// - Cross-process crash recovery (would require killing the process mid-write)
// - Disk-full or filesystem-level corruption
// Those scenarios are documented as known limitations in
// FIGMA_TO_NATIVE_AGENT_EXECUTION_PROTOCOL.md §9.6 and acknowledged as
// best-effort in-process rollback, with Layer 3 (CI) as the backstop.

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PROMOTE_SCRIPT = path.join(REPO_ROOT, 'tools', 'design', 'promote-family.mjs');
const GENERATOR_SCRIPT = path.join(REPO_ROOT, 'tools', 'design', 'generate-visual-admission-contract.mjs');

// ─── Test harness: create a sandboxed copy of the registry/handoff/ledger ──

function sha256(content) {
  return `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
}

function makeSandbox() {
  const tmpDir = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'promote-test-'));
  const readerUiRoot = path.join(tmpDir, 'Reader-UI');
  const hostRoot = path.join(tmpDir, 'Reader-for-HarmonyOS');

  // Copy the essential Reader-UI files
  fs.mkdirSync(path.join(readerUiRoot, 'docs', 'design', 'handoffs', 'reader-runtime', 'reading-surface'), { recursive: true });
  fs.mkdirSync(path.join(readerUiRoot, 'generated', 'arkts'), { recursive: true });
  fs.mkdirSync(path.join(readerUiRoot, 'tools', 'design'), { recursive: true });
  fs.mkdirSync(path.join(readerUiRoot, 'contracts', 'fixtures'), { recursive: true });

  // Place a design-delta file in the handoff directory so that
  // computeHandoffDirHash has at least one file to hash (excluding
  // LOCAL_READY_FOR_FIGMA.json). Without this, the hash would be null and
  // sourceEvidenceHash verification would be skipped.
  fs.writeFileSync(
    path.join(readerUiRoot, 'docs', 'design', 'handoffs', 'reader-runtime', 'reading-surface', 'design-delta.md'),
    '# Reader Runtime Design Delta\n\nTest design delta for sandbox.\n',
  );

  // Copy promote-family.mjs and generator
  fs.copyFileSync(PROMOTE_SCRIPT, path.join(readerUiRoot, 'tools', 'design', 'promote-family.mjs'));
  fs.copyFileSync(GENERATOR_SCRIPT, path.join(readerUiRoot, 'tools', 'design', 'generate-visual-admission-contract.mjs'));

  // The real repository has an active A3 route extraction. Transaction tests
  // exercise promotion mechanics independently, so their isolated fixture is
  // explicitly released. A dedicated test below covers the active rejection.
  const quarantine = JSON.parse(fs.readFileSync(
    path.join(REPO_ROOT, 'contracts', 'fixtures', 'route-reconstruction-quarantine.fixtures.json'),
    'utf8',
  ));
  quarantine.status = 'released';
  quarantine.entries = quarantine.entries.map((entry) => ({ ...entry, status: 'released' }));
  fs.writeFileSync(
    path.join(readerUiRoot, 'contracts', 'fixtures', 'route-reconstruction-quarantine.fixtures.json'),
    JSON.stringify(quarantine, null, 2) + '\n',
  );

  // Copy token ledger (generator dependency)
  fs.copyFileSync(
    path.join(REPO_ROOT, 'docs', 'design', 'FIGMA_VISUAL_TOKEN_LEDGER.json'),
    path.join(readerUiRoot, 'docs', 'design', 'FIGMA_VISUAL_TOKEN_LEDGER.json'),
  );

  // Copy revision evidence
  fs.copyFileSync(
    path.join(REPO_ROOT, 'docs', 'design', 'F0_FIGMA_CURRENT_REVISION_EVIDENCE.json'),
    path.join(readerUiRoot, 'docs', 'design', 'F0_FIGMA_CURRENT_REVISION_EVIDENCE.json'),
  );

  // Copy HarmonyOS consumer directory
  fs.mkdirSync(path.join(hostRoot, 'entry/src/main/ets/contract/reader_ui'), { recursive: true });

  return { tmpDir, readerUiRoot, hostRoot };
}

function cleanupSandbox(sandbox) {
  fs.rmSync(sandbox.tmpDir, { recursive: true, force: true });
}

function writeRegistry(readerUiRoot, records) {
  const registryPath = path.join(readerUiRoot, 'docs', 'design', 'FIGMA_VISUAL_ADMISSION_REGISTRY.json');
  const registry = {
    kind: 'FIGMA_VISUAL_ADMISSION_REGISTRY',
    version: '1.0.0',
    records,
  };
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n');
  return registryPath;
}

function writeLedger(readerUiRoot, entries = []) {
  const ledgerPath = path.join(readerUiRoot, 'docs', 'design', 'PROMOTION_LEDGER.json');
  const ledger = {
    kind: 'PROMOTION_LEDGER',
    version: '1.0.0',
    entries,
  };
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n');
  return ledgerPath;
}

function writeLocalReady(readerUiRoot, recordId, family, ready = true, options = {}) {
  const handoffFamily = recordId === 'reader.reading-surface'
    ? path.join(family, 'reading-surface')
    : family;
  const localReadyPath = path.join(readerUiRoot, 'docs', 'design', 'handoffs', handoffFamily, 'LOCAL_READY_FOR_FIGMA.json');
  const handoffDir = path.dirname(localReadyPath);

  // Compute sourceEvidenceHash from the handoff directory (excluding LOCAL_READY_FOR_FIGMA.json)
  // This matches the logic in promote-family.mjs computeHandoffDirHash()
  const entries = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    items.sort((a, b) => a.name.localeCompare(b.name));
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        walk(fullPath);
      } else if (item.isFile() && item.name !== 'LOCAL_READY_FOR_FIGMA.json') {
        const relPath = path.relative(handoffDir, fullPath);
        const content = fs.readFileSync(fullPath);
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        entries.push(`${relPath}:${hash}`);
      }
    }
  }
  walk(handoffDir);
  const sourceEvidenceHash = entries.length > 0
    ? `sha256:${crypto.createHash('sha256').update(entries.join('\n')).digest('hex')}`
    : null;

  // Use a real git commit from the Reader-UI repo for the implementationCommit.
  // The test sandbox copies promote-family.mjs from the real repo, so this commit
  // exists in the real repo. But verifyLocalReadyEvidence runs git cat-file in
  // the sandbox's readerUiRoot, which is NOT a git repo. We need to handle this
  // by either (a) initializing a git repo in the sandbox, or (b) using a commit
  // SHA that we know exists. For test simplicity, we initialize a git repo in
  // the sandbox and create a commit.
  const implCommit = options.implementationCommit || 'test-commit-placeholder';

  fs.writeFileSync(localReadyPath, JSON.stringify({
    kind: 'LOCAL_READY_FOR_FIGMA',
    stage: 'implementation-ready',
    status: 'implementation-ready',
    admission: { localReadyForFigma: ready, recordIds: [recordId] },
    localSource: {
      implementationCommit: implCommit,
    },
    verification: options.verification || {
      focusedR3a: { tests: 28, passed: 28, failed: 0 },
      frontendRegression: { tests: 340, passed: 340, failed: 0 },
    },
    sourceEvidenceHash,
  }, null, 2) + '\n');
  return localReadyPath;
}

function initSandboxGit(readerUiRoot) {
  // Initialize a git repo in the sandbox and create a commit so that
  // verifyLocalReadyEvidence's git cat-file check can find the implementationCommit.
  const result = spawnSync('git', ['init'], { cwd: readerUiRoot, stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) return null;
  spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: readerUiRoot, stdio: 'ignore' });
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: readerUiRoot, stdio: 'ignore' });
  spawnSync('git', ['add', '.'], { cwd: readerUiRoot, stdio: 'ignore' });
  const commitResult = spawnSync('git', ['commit', '-m', 'test commit'], { cwd: readerUiRoot, stdio: ['ignore', 'pipe', 'pipe'] });
  if (commitResult.status !== 0) return null;
  const revParse = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: readerUiRoot, encoding: 'utf8' });
  return revParse.stdout.trim();
}

function makeRecord(id, options = {}) {
  const {
    localStatus = 'candidate-backport',
    harmonyStatus = 'candidate-backport',
    figmaRevision = '2379851596474967636',
    family = 'reader-runtime',
    targets = ['Reader-for-HarmonyOS/entry/src/main/ets/ui/router/RouteRenderer.ets#RouteRenderer'],
  } = options;
  return {
    id,
    classification: 'exact-figma-binding',
    surfaceType: 'phone',
    routeIds: [id],
    figma: {
      fileKey: 'klhs2jMM4MncaJFqZMfqEK',
      revision: figmaRevision,
      nodeId: `node-${id}`,
      canonicalMasterId: `master-${id}`,
    },
    local: { status: localStatus },
    harmony: { status: harmonyStatus, targets },
    _family: family,
  };
}

function snapshotFiles(readerUiRoot, hostRoot) {
  const registryPath = path.join(readerUiRoot, 'docs', 'design', 'FIGMA_VISUAL_ADMISSION_REGISTRY.json');
  const ledgerPath = path.join(readerUiRoot, 'docs', 'design', 'PROMOTION_LEDGER.json');
  const upstreamArtifactPath = path.join(readerUiRoot, 'generated', 'arkts', 'VisualAdmission.ets');
  const consumerArtifactPath = path.join(hostRoot, 'entry/src/main/ets/contract/reader_ui/VisualAdmission.ets');
  return {
    registry: fs.existsSync(registryPath) ? fs.readFileSync(registryPath) : null,
    ledger: fs.existsSync(ledgerPath) ? fs.readFileSync(ledgerPath) : null,
    upstreamArtifact: fs.existsSync(upstreamArtifactPath) ? fs.readFileSync(upstreamArtifactPath) : null,
    consumerArtifact: fs.existsSync(consumerArtifactPath) ? fs.readFileSync(consumerArtifactPath) : null,
  };
}

function runPromote(readerUiRoot, hostRoot, recordId, options = {}) {
  // promote-family.mjs resolves hostRepoRoot as path.resolve(repoRoot, '..', 'Reader-for-HarmonyOS')
  // We need to set up the directory structure so that resolves correctly.
  // readerUiRoot is /tmp/xxx/Reader-UI, so hostRoot must be /tmp/xxx/Reader-for-HarmonyOS
  const env = {
    ...process.env,
    PROMOTE_TEST_MODE: '1',
  };
  // Fault injection: pass through PROMOTE_FAULT_* env vars when set.
  if (options.fault) {
    env[`PROMOTE_FAULT_${options.fault}`] = '1';
  }
  return spawnSync('node', [path.join(readerUiRoot, 'tools', 'design', 'promote-family.mjs'), recordId], {
    cwd: readerUiRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function runRetract(readerUiRoot, hostRoot, recordId, options = {}) {
  const env = {
    ...process.env,
    RETRACT_TEST_MODE: '1',
  };
  if (options.fault) {
    env[`RETRACT_FAULT_${options.fault}`] = '1';
  }
  const reason = options.reason || 'A2 route-isolation audit is not yet closed';
  return spawnSync('node', [
    path.join(readerUiRoot, 'tools', 'design', 'promote-family.mjs'),
    '--retract',
    recordId,
    '--reason',
    reason,
  ], {
    cwd: readerUiRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

// Install a stub generator in the sandbox that produces a minimal but valid
// VisualAdmission.ets based on the registry. This lets the success-path and
// fault-injection tests run a real promotion end-to-end without depending on
// the real generator's many dependencies (token ledger, live source snapshot,
// etc.). The stub output is sufficient for promote-family.mjs's byte-identical
// sync check and the ledger hash recording.
function installStubGenerator(readerUiRoot) {
  const generatorPath = path.join(readerUiRoot, 'tools', 'design', 'generate-visual-admission-contract.mjs');
  const stubSource = `#!/usr/bin/env node
// STUB generator for promote-family.test.mjs — NOT the real generator.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const registry = JSON.parse(fs.readFileSync(path.join(repoRoot, 'docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json'), 'utf8'));
const outDir = path.join(repoRoot, 'generated', 'arkts');
fs.mkdirSync(outDir, { recursive: true });
const lines = [
  '// Generated VisualAdmission.ets (STUB for testing)',
  '// SOURCE_FILE_KEY: \\'klhs2jMM4MncaJFqZMfqEK\\'',
  'export struct VisualAdmission {',
];
for (const record of registry.records) {
  if (record.classification !== 'exact-figma-binding') continue;
  const admission = record.harmony?.status === 'implementation-ready' ? 'implementation-ready' : 'candidate-backport';
  const implementationReady = admission === 'implementation-ready';
  for (const routeId of (record.routeIds || [])) {
    lines.push('  // ' + JSON.stringify({ routeId, admission, sourceBound: true, implementationReady, recordIds: [record.id] }));
  }
}
lines.push('  // admissionForRoute(routeId) === \\'implementation-ready\\'');
lines.push('  // admissionForRouteViewport(routeId, viewport) === \\'implementation-ready\\'');
lines.push('  // admissionForOverlay(overlayKind) === \\'implementation-ready\\'');
lines.push('  // admissionForState(routeId, stateId) === \\'implementation-ready\\'');
lines.push('}');
fs.writeFileSync(path.join(outDir, 'VisualAdmission.ets'), lines.join('\\n') + '\\n');
`;
  fs.writeFileSync(generatorPath, stubSource);
}

// Set up the HarmonyOS consumer target file with the expected symbol, so the
// prerequisite check (target file exists + symbol findable) passes.
function installHarmonyTarget(hostRoot, symbol = 'RouteRenderer') {
  const targetDir = path.join(hostRoot, 'entry/src/main/ets/ui/router');
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(
    path.join(targetDir, 'RouteRenderer.ets'),
    `export struct ${symbol} {}\n`,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────

test('promote-family --check passes on empty ledger with no implementation-ready records', () => {
  const sandbox = makeSandbox();
  try {
    writeRegistry(sandbox.readerUiRoot, []);
    writeLedger(sandbox.readerUiRoot, []);
    // No generator run yet — no artifact. --check should still pass for ledger
    // consistency (0 entries, 0 implementation-ready records).
    const result = spawnSync('node', [
      path.join(sandbox.readerUiRoot, 'tools', 'design', 'promote-family.mjs'),
      '--check',
    ], {
      cwd: sandbox.readerUiRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    // --check may fail on artifact divergence if artifacts don't exist.
    // We only verify ledger consistency here.
    const stdout = result.stdout?.toString() || '';
    const stderr = result.stderr?.toString() || '';
    // It should either pass, or fail only on artifact divergence (not ledger)
    if (result.status !== 0) {
      assert.ok(
        stderr.includes('diverged') || stderr.includes('not found'),
        `--check failed for unexpected reason: ${stderr}`,
      );
    } else {
      assert.ok(stdout.includes('ledger is consistent'), `Unexpected --check output: ${stdout}`);
    }
  } finally {
    cleanupSandbox(sandbox);
  }
});

test('promote refuses when local.status is candidate-backport (anti-bypass)', () => {
  const sandbox = makeSandbox();
  try {
    const record = makeRecord('reader.reading-surface', { localStatus: 'candidate-backport' });
    writeRegistry(sandbox.readerUiRoot, [record]);
    writeLedger(sandbox.readerUiRoot, []);
    writeLocalReady(sandbox.readerUiRoot, 'reader.reading-surface', 'reader-runtime', true);

    const before = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);
    const result = runPromote(sandbox.readerUiRoot, sandbox.hostRoot, 'reader.reading-surface');
    const after = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);

    assert.notEqual(result.status, 0, 'promote should have failed');
    const stderr = result.stderr?.toString() || '';
    assert.ok(
      stderr.includes('local.status') && stderr.includes('candidate-backport'),
      `Expected local.status rejection, got: ${stderr}`,
    );

    // No files should have changed
    assert.deepEqual(before.registry, after.registry, 'registry should not have changed');
    assert.deepEqual(before.ledger, after.ledger, 'ledger should not have changed');
  } finally {
    cleanupSandbox(sandbox);
  }
});

test('promote refuses an actively route-quarantined record before any transaction write', () => {
  const sandbox = makeSandbox();
  try {
    const commitSha = initSandboxGit(sandbox.readerUiRoot);
    assert.ok(commitSha, 'failed to init sandbox git repo');
    const record = makeRecord('reader.reading-surface', { localStatus: 'implementation-ready' });
    writeRegistry(sandbox.readerUiRoot, [record]);
    writeLedger(sandbox.readerUiRoot, []);
    writeLocalReady(sandbox.readerUiRoot, 'reader.reading-surface', 'reader-runtime', true, {
      implementationCommit: commitSha,
    });
    const quarantinePath = path.join(sandbox.readerUiRoot, 'contracts', 'fixtures', 'route-reconstruction-quarantine.fixtures.json');
    const quarantine = JSON.parse(fs.readFileSync(quarantinePath, 'utf8'));
    quarantine.status = 'active';
    quarantine.entries = [{
      recordId: 'reader.reading-surface',
      routeIds: ['reader.reading-surface'],
      reason: 'test quarantine',
      blocksPromotion: true,
      status: 'active',
    }];
    fs.writeFileSync(quarantinePath, JSON.stringify(quarantine, null, 2) + '\n');

    const before = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);
    const result = runPromote(sandbox.readerUiRoot, sandbox.hostRoot, 'reader.reading-surface');
    const after = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);

    assert.notEqual(result.status, 0, 'promote should have failed');
    assert.match(result.stderr?.toString() || '', /actively route-quarantined/);
    assert.deepEqual(before, after, 'an active source quarantine must not mutate any transaction file');
  } finally {
    cleanupSandbox(sandbox);
  }
});

test('promote refuses when LOCAL_READY_FOR_FIGMA.json is missing', () => {
  const sandbox = makeSandbox();
  try {
    const record = makeRecord('reader.reading-surface', { localStatus: 'implementation-ready' });
    writeRegistry(sandbox.readerUiRoot, [record]);
    writeLedger(sandbox.readerUiRoot, []);
    // Do NOT write LOCAL_READY_FOR_FIGMA.json

    const before = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);
    const result = runPromote(sandbox.readerUiRoot, sandbox.hostRoot, 'reader.reading-surface');
    const after = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);

    assert.notEqual(result.status, 0, 'promote should have failed');
    const stderr = result.stderr?.toString() || '';
    assert.ok(
      stderr.includes('LOCAL_READY_FOR_FIGMA.json') && stderr.includes('not found'),
      `Expected LOCAL_READY_FOR_FIGMA missing rejection, got: ${stderr}`,
    );

    assert.deepEqual(before.registry, after.registry, 'registry should not have changed');
  } finally {
    cleanupSandbox(sandbox);
  }
});

test('promote refuses when sourceEvidenceHash is missing (anti-bypass)', () => {
  const sandbox = makeSandbox();
  try {
    const commitSha = initSandboxGit(sandbox.readerUiRoot);
    assert.ok(commitSha, 'failed to init sandbox git repo');

    const record = makeRecord('reader.reading-surface', { localStatus: 'implementation-ready' });
    writeRegistry(sandbox.readerUiRoot, [record]);
    writeLedger(sandbox.readerUiRoot, []);

    // Write LOCAL_READY_FOR_FIGMA.json WITHOUT sourceEvidenceHash
    const localReadyPath = path.join(sandbox.readerUiRoot, 'docs', 'design', 'handoffs', 'reader-runtime', 'reading-surface', 'LOCAL_READY_FOR_FIGMA.json');
    fs.writeFileSync(localReadyPath, JSON.stringify({
      kind: 'LOCAL_READY_FOR_FIGMA',
      stage: 'implementation-ready',
      status: 'implementation-ready',
      admission: { localReadyForFigma: true, recordIds: ['reader.reading-surface'] },
      localSource: { implementationCommit: commitSha },
      verification: { focusedR3a: { tests: 28, passed: 28, failed: 0 } },
      // sourceEvidenceHash intentionally missing
    }, null, 2) + '\n');

    const before = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);
    const result = runPromote(sandbox.readerUiRoot, sandbox.hostRoot, 'reader.reading-surface');
    const after = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);

    assert.notEqual(result.status, 0, 'promote should have failed');
    const stderr = result.stderr?.toString() || '';
    assert.ok(
      stderr.includes('sourceEvidenceHash is missing'),
      `Expected sourceEvidenceHash missing rejection, got: ${stderr}`,
    );

    assert.deepEqual(before.registry, after.registry, 'registry should not have changed');
  } finally {
    cleanupSandbox(sandbox);
  }
});

test('promote refuses when sourceEvidenceHash does not match handoff dir (anti-bypass)', () => {
  const sandbox = makeSandbox();
  try {
    const commitSha = initSandboxGit(sandbox.readerUiRoot);
    assert.ok(commitSha, 'failed to init sandbox git repo');

    const record = makeRecord('reader.reading-surface', { localStatus: 'implementation-ready' });
    writeRegistry(sandbox.readerUiRoot, [record]);
    writeLedger(sandbox.readerUiRoot, []);

    // Write LOCAL_READY_FOR_FIGMA.json with a WRONG sourceEvidenceHash
    const localReadyPath = path.join(sandbox.readerUiRoot, 'docs', 'design', 'handoffs', 'reader-runtime', 'reading-surface', 'LOCAL_READY_FOR_FIGMA.json');
    fs.writeFileSync(localReadyPath, JSON.stringify({
      kind: 'LOCAL_READY_FOR_FIGMA',
      stage: 'implementation-ready',
      status: 'implementation-ready',
      admission: { localReadyForFigma: true, recordIds: ['reader.reading-surface'] },
      localSource: { implementationCommit: commitSha },
      verification: { focusedR3a: { tests: 28, passed: 28, failed: 0 } },
      sourceEvidenceHash: 'sha256:fabricated-hash-that-does-not-match',
    }, null, 2) + '\n');

    const before = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);
    const result = runPromote(sandbox.readerUiRoot, sandbox.hostRoot, 'reader.reading-surface');
    const after = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);

    assert.notEqual(result.status, 0, 'promote should have failed');
    const stderr = result.stderr?.toString() || '';
    assert.ok(
      stderr.includes('sourceEvidenceHash mismatch'),
      `Expected sourceEvidenceHash mismatch rejection, got: ${stderr}`,
    );

    assert.deepEqual(before.registry, after.registry, 'registry should not have changed');
  } finally {
    cleanupSandbox(sandbox);
  }
});

test('promote refuses a reader handoff that names a sibling record (anti-bypass)', () => {
  const sandbox = makeSandbox();
  try {
    const commitSha = initSandboxGit(sandbox.readerUiRoot);
    assert.ok(commitSha, 'failed to init sandbox git repo');

    const record = makeRecord('reader.reading-surface', { localStatus: 'implementation-ready' });
    writeRegistry(sandbox.readerUiRoot, [record]);
    writeLedger(sandbox.readerUiRoot, []);
    const localReadyPath = writeLocalReady(
      sandbox.readerUiRoot,
      'reader.reading-surface',
      'reader-runtime',
      true,
      { implementationCommit: commitSha },
    );
    const localReady = JSON.parse(fs.readFileSync(localReadyPath, 'utf8'));
    localReady.admission.recordIds = ['reader.control-home'];
    fs.writeFileSync(localReadyPath, JSON.stringify(localReady, null, 2) + '\n');

    const before = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);
    const result = runPromote(sandbox.readerUiRoot, sandbox.hostRoot, 'reader.reading-surface');
    const after = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);

    assert.notEqual(result.status, 0, 'promote should have failed');
    assert.match(result.stderr?.toString() || '', /admission\.recordIds.*reader\.reading-surface/);
    assert.deepEqual(before.registry, after.registry, 'registry should not change when a sibling record is named');
  } finally {
    cleanupSandbox(sandbox);
  }
});

test('promote refuses when verification shows test failures (anti-bypass)', () => {
  const sandbox = makeSandbox();
  try {
    const commitSha = initSandboxGit(sandbox.readerUiRoot);
    assert.ok(commitSha, 'failed to init sandbox git repo');

    const record = makeRecord('reader.reading-surface', { localStatus: 'implementation-ready' });
    writeRegistry(sandbox.readerUiRoot, [record]);
    writeLedger(sandbox.readerUiRoot, []);

    // Write LOCAL_READY_FOR_FIGMA.json with verification showing failures
    writeLocalReady(sandbox.readerUiRoot, 'reader.reading-surface', 'reader-runtime', true, {
      implementationCommit: commitSha,
      verification: {
        focusedR3a: { tests: 28, passed: 27, failed: 1 },  // 1 failure
        frontendRegression: { tests: 340, passed: 340, failed: 0 },
      },
    });

    const before = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);
    const result = runPromote(sandbox.readerUiRoot, sandbox.hostRoot, 'reader.reading-surface');
    const after = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);

    assert.notEqual(result.status, 0, 'promote should have failed');
    const stderr = result.stderr?.toString() || '';
    assert.ok(
      stderr.includes('verification.focusedR3a') && stderr.includes('passed=27') && stderr.includes('tests=28'),
      `Expected verification failure rejection, got: ${stderr}`,
    );

    assert.deepEqual(before.registry, after.registry, 'registry should not have changed');
  } finally {
    cleanupSandbox(sandbox);
  }
});

test('promote refuses when implementationCommit is a placeholder (anti-bypass)', () => {
  const sandbox = makeSandbox();
  try {
    initSandboxGit(sandbox.readerUiRoot);

    const record = makeRecord('reader.reading-surface', { localStatus: 'implementation-ready' });
    writeRegistry(sandbox.readerUiRoot, [record]);
    writeLedger(sandbox.readerUiRoot, []);

    // Write LOCAL_READY_FOR_FIGMA.json with a PENDING_ placeholder commit
    writeLocalReady(sandbox.readerUiRoot, 'reader.reading-surface', 'reader-runtime', true, {
      implementationCommit: 'PENDING_EVIDENCE_COMMIT_SELF_REFERENTIAL',
    });

    const before = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);
    const result = runPromote(sandbox.readerUiRoot, sandbox.hostRoot, 'reader.reading-surface');
    const after = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);

    assert.notEqual(result.status, 0, 'promote should have failed');
    const stderr = result.stderr?.toString() || '';
    assert.ok(
      stderr.includes('implementationCommit') && stderr.includes('placeholder'),
      `Expected placeholder commit rejection, got: ${stderr}`,
    );

    assert.deepEqual(before.registry, after.registry, 'registry should not have changed');
  } finally {
    cleanupSandbox(sandbox);
  }
});

test('promote refuses when figma.revision does not match official evidence', () => {
  const sandbox = makeSandbox();
  try {
    const commitSha = initSandboxGit(sandbox.readerUiRoot);
    assert.ok(commitSha, 'failed to init sandbox git repo');

    const record = makeRecord('reader.reading-surface', {
      localStatus: 'implementation-ready',
      figmaRevision: 'stale-revision-123',
    });
    writeRegistry(sandbox.readerUiRoot, [record]);
    writeLedger(sandbox.readerUiRoot, []);
    writeLocalReady(sandbox.readerUiRoot, 'reader.reading-surface', 'reader-runtime', true, {
      implementationCommit: commitSha,
    });

    const before = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);
    const result = runPromote(sandbox.readerUiRoot, sandbox.hostRoot, 'reader.reading-surface');
    const after = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);

    assert.notEqual(result.status, 0, 'promote should have failed');
    const stderr = result.stderr?.toString() || '';
    assert.ok(
      stderr.includes('figma.revision') && stderr.includes('stale'),
      `Expected revision mismatch rejection, got: ${stderr}`,
    );

    assert.deepEqual(before.registry, after.registry, 'registry should not have changed');
  } finally {
    cleanupSandbox(sandbox);
  }
});

test('promote refuses when harmony target symbol does not exist in file', () => {
  const sandbox = makeSandbox();
  try {
    const commitSha = initSandboxGit(sandbox.readerUiRoot);
    assert.ok(commitSha, 'failed to init sandbox git repo');

    // Create a target file that exists but does NOT contain the #symbol
    const targetDir = path.join(sandbox.tmpDir, 'Reader-for-HarmonyOS', 'entry/src/main/ets/ui/router');
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'RouteRenderer.ets'), '// empty file, no RouteRenderer symbol\n');

    const record = makeRecord('reader.reading-surface', {
      localStatus: 'implementation-ready',
      targets: ['Reader-for-HarmonyOS/entry/src/main/ets/ui/router/RouteRenderer.ets#NonExistentSymbol'],
    });
    writeRegistry(sandbox.readerUiRoot, [record]);
    writeLedger(sandbox.readerUiRoot, []);
    writeLocalReady(sandbox.readerUiRoot, 'reader.reading-surface', 'reader-runtime', true, {
      implementationCommit: commitSha,
    });

    const before = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);
    const result = runPromote(sandbox.readerUiRoot, sandbox.hostRoot, 'reader.reading-surface');
    const after = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);

    assert.notEqual(result.status, 0, 'promote should have failed');
    const stderr = result.stderr?.toString() || '';
    assert.ok(
      stderr.includes('harmony consumer target') && stderr.includes('not found'),
      `Expected target symbol missing rejection, got: ${stderr}`,
    );

    assert.deepEqual(before.registry, after.registry, 'registry should not have changed');
  } finally {
    cleanupSandbox(sandbox);
  }
});

test('promote refuses idempotently when already implementation-ready', () => {
  const sandbox = makeSandbox();
  try {
    const commitSha = initSandboxGit(sandbox.readerUiRoot);
    assert.ok(commitSha, 'failed to init sandbox git repo');

    // Create the target file with the expected symbol so we get past the
    // target check and reach the idempotent refuse check.
    const targetDir = path.join(sandbox.tmpDir, 'Reader-for-HarmonyOS', 'entry/src/main/ets/ui/router');
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(
      path.join(targetDir, 'RouteRenderer.ets'),
      'export struct RouteRenderer {}\n',
    );

    const record = makeRecord('reader.reading-surface', {
      localStatus: 'implementation-ready',
      harmonyStatus: 'implementation-ready',
    });
    writeRegistry(sandbox.readerUiRoot, [record]);
    writeLedger(sandbox.readerUiRoot, []);
    writeLocalReady(sandbox.readerUiRoot, 'reader.reading-surface', 'reader-runtime', true, {
      implementationCommit: commitSha,
    });

    const before = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);
    const result = runPromote(sandbox.readerUiRoot, sandbox.hostRoot, 'reader.reading-surface');
    const after = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);

    assert.notEqual(result.status, 0, 'promote should have failed (idempotent refuse)');
    const stderr = result.stderr?.toString() || '';
    assert.ok(
      stderr.includes('already') && stderr.includes('implementation-ready'),
      `Expected idempotent refuse, got: ${stderr}`,
    );

    assert.deepEqual(before.registry, after.registry, 'registry should not have changed');
  } finally {
    cleanupSandbox(sandbox);
  }
});

test('ledger chain integrity: tampering with an entry is detected by --check', () => {
  const sandbox = makeSandbox();
  try {
    // Create a ledger with one tampered entry
    const tamperedEntry = {
      entryId: 'promote-001',
      timestamp: '2026-07-27T00:00:00.000Z',
      recordId: 'reader.reading-surface',
      previousHarmonyStatus: 'candidate-backport',
      newHarmonyStatus: 'implementation-ready',
      localStatus: 'implementation-ready',
      registryHashBefore: 'sha256:fake',
      upstreamArtifactHashAfter: 'sha256:fake',
      consumerArtifactHashAfter: 'sha256:fake',
      artifactsInSync: true,
      promotedBy: 'promote-family.mjs',
      previousEntryHash: 'genesis',
      entryHash: 'sha256:wrong-hash-on-purpose',
    };
    writeLedger(sandbox.readerUiRoot, [tamperedEntry]);
    writeRegistry(sandbox.readerUiRoot, [
      makeRecord('reader.reading-surface', {
        localStatus: 'implementation-ready',
        harmonyStatus: 'implementation-ready',
      }),
    ]);

    const result = spawnSync('node', [
      path.join(sandbox.readerUiRoot, 'tools', 'design', 'promote-family.mjs'),
      '--check',
    ], {
      cwd: sandbox.readerUiRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    assert.notEqual(result.status, 0, '--check should detect tampering');
    const stderr = result.stderr?.toString() || '';
    assert.ok(
      stderr.includes('entryHash mismatch') || stderr.includes('tampered'),
      `Expected tamper detection, got: ${stderr}`,
    );
  } finally {
    cleanupSandbox(sandbox);
  }
});

test('ledger chain integrity: broken chain is detected by --check', () => {
  const sandbox = makeSandbox();
  try {
    const entry1 = {
      entryId: 'promote-001',
      timestamp: '2026-07-27T00:00:00.000Z',
      recordId: 'reader.reading-surface',
      previousHarmonyStatus: 'candidate-backport',
      newHarmonyStatus: 'implementation-ready',
      localStatus: 'implementation-ready',
      registryHashBefore: 'sha256:fake1',
      upstreamArtifactHashAfter: 'sha256:fake1',
      consumerArtifactHashAfter: 'sha256:fake1',
      artifactsInSync: true,
      promotedBy: 'promote-family.mjs',
      previousEntryHash: 'genesis',
      entryHash: 'sha256:fake1',
    };
    const entry2 = {
      entryId: 'promote-002',
      timestamp: '2026-07-27T00:01:00.000Z',
      recordId: 'bookshelf.page',
      previousHarmonyStatus: 'candidate-backport',
      newHarmonyStatus: 'implementation-ready',
      localStatus: 'implementation-ready',
      registryHashBefore: 'sha256:fake2',
      upstreamArtifactHashAfter: 'sha256:fake2',
      consumerArtifactHashAfter: 'sha256:fake2',
      artifactsInSync: true,
      promotedBy: 'promote-family.mjs',
      previousEntryHash: 'sha256:WRONG-should-be-entry1-hash',
      entryHash: 'sha256:fake2',
    };
    writeLedger(sandbox.readerUiRoot, [entry1, entry2]);
    writeRegistry(sandbox.readerUiRoot, [
      makeRecord('reader.reading-surface', { localStatus: 'implementation-ready', harmonyStatus: 'implementation-ready' }),
      makeRecord('bookshelf.page', { localStatus: 'implementation-ready', harmonyStatus: 'implementation-ready' }),
    ]);

    const result = spawnSync('node', [
      path.join(sandbox.readerUiRoot, 'tools', 'design', 'promote-family.mjs'),
      '--check',
    ], {
      cwd: sandbox.readerUiRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    assert.notEqual(result.status, 0, '--check should detect broken chain');
    const stderr = result.stderr?.toString() || '';
    assert.ok(
      stderr.includes('previousEntryHash mismatch') || stderr.includes('chain broken'),
      `Expected broken chain detection, got: ${stderr}`,
    );
  } finally {
    cleanupSandbox(sandbox);
  }
});

test('explicit RECORD_ID_TO_HANDOFF mapping covers all expected families', () => {
  // Read the promote-family.mjs source and verify the mapping is complete
  const source = fs.readFileSync(PROMOTE_SCRIPT, 'utf8');
  const expectedFamilies = [
    'bookshelf',
    'book-detail',
    'source-switch',
    'reader',
    'settings',
    'source-management',
    'webdav',
    'sync-backup',
    'search',
    'discover',
    'rss',
    'about',
    'import-conflict-resolve',
    'restore-preview',
  ];
  for (const family of expectedFamilies) {
    assert.ok(
      source.includes(`'${family}':`),
      `RECORD_ID_TO_HANDOFF missing family '${family}'`,
    );
  }
});

test('promote-family.mjs writes registry BEFORE calling generator (write order fix)', () => {
  // Read the promote-family.mjs source and verify the write order
  const source = fs.readFileSync(PROMOTE_SCRIPT, 'utf8');
  const writeRegistryPos = source.indexOf('writeViaTemp(registryPath, registryContentAfter)');
  const generatorCallPos = source.indexOf("spawnSync('node', [generatorPath]");
  assert.ok(writeRegistryPos > 0, 'registry write not found');
  assert.ok(generatorCallPos > 0, 'generator call not found');
  assert.ok(
    writeRegistryPos < generatorCallPos,
    'registry must be written BEFORE calling the generator (2026-07-27 write-order fix)',
  );
});

test('promote-family.mjs syncs consumer copy and verifies byte-identical after sync', () => {
  const source = fs.readFileSync(PROMOTE_SCRIPT, 'utf8');
  const syncPos = source.indexOf('writeViaTemp(consumerArtifactPath, upstreamContent)');
  const verifyPos = source.indexOf('upstreamHashAfter !== consumerHashAfter');
  assert.ok(syncPos > 0, 'consumer sync not found');
  assert.ok(verifyPos > 0, 'consumer verification not found');
  assert.ok(
    syncPos < verifyPos,
    'consumer copy must be synced BEFORE verifying byte-identical',
  );
});

test('promote-family.mjs has backup/restore for all four files', () => {
  const source = fs.readFileSync(PROMOTE_SCRIPT, 'utf8');
  // Verify backup
  assert.ok(source.includes('backup.registry'), 'missing registry backup');
  assert.ok(source.includes('backup.upstreamArtifact'), 'missing upstream artifact backup');
  assert.ok(source.includes('backup.consumerArtifact'), 'missing consumer artifact backup');
  assert.ok(source.includes('backup.ledger'), 'missing ledger backup');
  // Verify restore
  assert.ok(source.includes('restoreBackup(backup.registry)'), 'missing registry restore');
  assert.ok(source.includes('restoreBackup(backup.upstreamArtifact)'), 'missing upstream artifact restore');
  assert.ok(source.includes('restoreBackup(backup.consumerArtifact)'), 'missing consumer artifact restore');
  assert.ok(source.includes('restoreBackup(backup.ledger)'), 'missing ledger restore');
});

// ─── Success path + fault injection tests (problem 2: transaction atomicity) ─
// These tests verify that:
// 1. A complete promotion leaves all four files in a consistent post-transaction state.
// 2. A fault injected at any write phase rolls back ALL four files to the
//    pre-transaction state — not just the files written so far.
// 3. The rollback is byte-exact (snapshot comparison, not just existence checks).
//
// This directly addresses the 2026-07-27 second audit finding that promotion
// was "single-file atomic + in-process rollback", not a true four-file atomic
// transaction. The fault injection is env-var-driven (PROMOTE_FAULT_*) and
// only active under PROMOTE_TEST_MODE=1, so it cannot affect real runs.

function setupPromotableSandbox() {
  const sandbox = makeSandbox();
  const commitSha = initSandboxGit(sandbox.readerUiRoot);
  assert.ok(commitSha, 'failed to init sandbox git repo');

  // Install the stub generator so we don't depend on the real generator's
  // many dependencies (token ledger, live source snapshot, etc.).
  installStubGenerator(sandbox.readerUiRoot);

  // Install the harmony consumer target file with the expected symbol.
  installHarmonyTarget(sandbox.hostRoot, 'RouteRenderer');

  // Create a record that passes ALL prerequisites:
  // - local.status = implementation-ready
  // - harmony.status = candidate-backport (so promotion is not idempotent-refused)
  // - figma.revision matches the official evidence (copied in makeSandbox)
  // - harmony.targets points to the file we just installed
  const record = makeRecord('reader.reading-surface', {
    localStatus: 'implementation-ready',
    harmonyStatus: 'candidate-backport',
  });
  writeRegistry(sandbox.readerUiRoot, [record]);
  writeLedger(sandbox.readerUiRoot, []);

  // Write LOCAL_READY_FOR_FIGMA.json with valid evidence:
  // - implementationCommit is a real git commit (from initSandboxGit)
  // - verification shows all tests passing
  // - sourceEvidenceHash is computed from the actual handoff directory
  //   (writeLocalReady does this automatically)
  writeLocalReady(sandbox.readerUiRoot, 'reader.reading-surface', 'reader-runtime', true, {
    implementationCommit: commitSha,
  });

  return sandbox;
}

test('success path: complete promotion leaves all four files consistent', () => {
  const sandbox = setupPromotableSandbox();
  try {
    const before = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);

    const result = runPromote(sandbox.readerUiRoot, sandbox.hostRoot, 'reader.reading-surface');
    const stderr = result.stderr?.toString() || '';
    const stdout = result.stdout?.toString() || '';
    assert.equal(result.status, 0, `promote should have succeeded. stderr: ${stderr}\nstdout: ${stdout}`);

    const after = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);

    // 1. Registry: harmony.status must be 'implementation-ready'
    const registryAfter = JSON.parse(after.registry.toString());
    const record = registryAfter.records.find((r) => r.id === 'reader.reading-surface');
    assert.equal(record.harmony.status, 'implementation-ready',
      'registry: harmony.status should be implementation-ready after promotion');
    assert.notDeepEqual(before.registry, after.registry,
      'registry should have changed');

    // 2. Upstream artifact: must exist and be non-empty
    assert.ok(after.upstreamArtifact && after.upstreamArtifact.length > 0,
      'upstream VisualAdmission.ets should exist and be non-empty');

    // 3. Consumer artifact: must be byte-identical to upstream
    assert.deepEqual(after.upstreamArtifact, after.consumerArtifact,
      'consumer copy should be byte-identical to upstream artifact');

    // 4. Ledger: must have exactly 1 entry for this record
    const ledgerAfter = JSON.parse(after.ledger.toString());
    assert.equal(ledgerAfter.entries.length, 1,
      `ledger should have 1 entry, got ${ledgerAfter.entries.length}`);
    assert.equal(ledgerAfter.entries[0].recordId, 'reader.reading-surface');
    assert.equal(ledgerAfter.entries[0].newHarmonyStatus, 'implementation-ready');
    assert.equal(ledgerAfter.entries[0].previousHarmonyStatus, 'candidate-backport');
    assert.equal(ledgerAfter.entries[0].artifactsInSync, true,
      'ledger entry should record artifactsInSync=true');
    assert.ok(ledgerAfter.entries[0].entryHash,
      'ledger entry must have an entryHash');
    assert.equal(ledgerAfter.entries[0].previousEntryHash, 'genesis',
      'first ledger entry must chain from genesis');

    // 5. --check must pass after a successful promotion
    const checkResult = spawnSync('node', [
      path.join(sandbox.readerUiRoot, 'tools', 'design', 'promote-family.mjs'),
      '--check',
    ], {
      cwd: sandbox.readerUiRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    assert.equal(checkResult.status, 0,
      `--check should pass after successful promotion. stderr: ${checkResult.stderr?.toString()}`);
  } finally {
    cleanupSandbox(sandbox);
  }
});

// Helper: run a fault-injection test. The fault is injected at the given
// phase; the test verifies that all four files are restored to their exact
// pre-transaction state (byte-exact rollback).
function runFaultInjectionTest(phase) {
  const sandbox = setupPromotableSandbox();
  try {
    const before = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);

    const result = runPromote(sandbox.readerUiRoot, sandbox.hostRoot, 'reader.reading-surface', {
      fault: phase,
    });
    const stderr = result.stderr?.toString() || '';

    // 1. Promote must have failed (non-zero exit)
    assert.notEqual(result.status, 0,
      `promote should have failed when ${phase} fault is injected`);
    assert.ok(
      stderr.includes('injected fault') || stderr.includes('rolling back'),
      `Expected rollback message in stderr, got: ${stderr}`,
    );

    const after = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);

    // 2. ALL four files must be byte-identical to pre-transaction state.
    //    This is the key assertion: rollback restores the FULL snapshot,
    //    not just the files written before the fault.
    assert.deepEqual(after.registry, before.registry,
      `${phase}: registry not restored to pre-transaction state`);
    assert.deepEqual(after.upstreamArtifact, before.upstreamArtifact,
      `${phase}: upstream artifact not restored to pre-transaction state`);
    assert.deepEqual(after.consumerArtifact, before.consumerArtifact,
      `${phase}: consumer artifact not restored to pre-transaction state`);
    assert.deepEqual(after.ledger, before.ledger,
      `${phase}: ledger not restored to pre-transaction state`);

    // 3. --check must still pass (no partial state left behind)
    const checkResult = spawnSync('node', [
      path.join(sandbox.readerUiRoot, 'tools', 'design', 'promote-family.mjs'),
      '--check',
    ], {
      cwd: sandbox.readerUiRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    assert.equal(checkResult.status, 0,
      `${phase}: --check should pass after rollback (no partial state). stderr: ${checkResult.stderr?.toString()}`);
  } finally {
    cleanupSandbox(sandbox);
  }
}

test('fault injection AFTER_REGISTRY_WRITE: all four files rolled back', () => {
  runFaultInjectionTest('AFTER_REGISTRY_WRITE');
});

test('fault injection AFTER_GENERATOR: all four files rolled back', () => {
  runFaultInjectionTest('AFTER_GENERATOR');
});

test('fault injection AFTER_CONSUMER_SYNC: all four files rolled back', () => {
  runFaultInjectionTest('AFTER_CONSUMER_SYNC');
});

test('fault injection AFTER_LEDGER_WRITE: all four files rolled back', () => {
  runFaultInjectionTest('AFTER_LEDGER_WRITE');
});

test('fault injection IN_FINAL_VERIFY: all four files rolled back', () => {
  runFaultInjectionTest('IN_FINAL_VERIFY');
});

// ─── Retraction tests ─────────────────────────────────────────────────────
// A retraction is an audited safety stop, not a mutable edit of an old ledger
// row. These tests keep the original promotion in history and prove that the
// same four-file transaction/rollback guarantees apply in the reverse direction.

function setupPromotedSandbox() {
  const sandbox = setupPromotableSandbox();
  const promoteResult = runPromote(sandbox.readerUiRoot, sandbox.hostRoot, 'reader.reading-surface');
  assert.equal(
    promoteResult.status,
    0,
    `sandbox precondition promotion failed: ${promoteResult.stderr?.toString()}\n${promoteResult.stdout?.toString()}`,
  );
  return sandbox;
}

test('success path: retraction appends a reversal and restores candidate-backport admission', () => {
  const sandbox = setupPromotedSandbox();
  try {
    const before = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);
    const result = runRetract(sandbox.readerUiRoot, sandbox.hostRoot, 'reader.reading-surface');
    assert.equal(
      result.status,
      0,
      `retract should have succeeded. stderr: ${result.stderr?.toString()}\nstdout: ${result.stdout?.toString()}`,
    );

    const after = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);
    const registryAfter = JSON.parse(after.registry.toString());
    const record = registryAfter.records.find((item) => item.id === 'reader.reading-surface');
    assert.equal(record.harmony.status, 'candidate-backport');
    assert.equal(record.local.status, 'implementation-ready', 'retraction must retain source-side evidence status');
    assert.notDeepEqual(before.registry, after.registry, 'registry should change during retraction');

    assert.deepEqual(after.upstreamArtifact, after.consumerArtifact,
      'retraction consumer copy should remain byte-identical to upstream');

    const ledgerAfter = JSON.parse(after.ledger.toString());
    assert.equal(ledgerAfter.entries.length, 2);
    const [promotion, retraction] = ledgerAfter.entries;
    assert.equal(retraction.kind, 'retract');
    assert.equal(retraction.recordId, 'reader.reading-surface');
    assert.equal(retraction.previousHarmonyStatus, 'implementation-ready');
    assert.equal(retraction.newHarmonyStatus, 'candidate-backport');
    assert.equal(retraction.reversalOf, promotion.entryHash);
    assert.equal(retraction.reversedPromotion, undefined, 'ledger must use the documented retractedPromotion field');
    assert.equal(retraction.retractedPromotion.entryHash, promotion.entryHash);
    assert.equal(retraction.previousEntryHash, promotion.entryHash);
    assert.ok(retraction.entryHash);

    const checkResult = spawnSync('node', [
      path.join(sandbox.readerUiRoot, 'tools', 'design', 'promote-family.mjs'),
      '--check',
    ], { cwd: sandbox.readerUiRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    assert.equal(checkResult.status, 0,
      `--check should accept a valid retraction. stderr: ${checkResult.stderr?.toString()}`);
  } finally {
    cleanupSandbox(sandbox);
  }
});

test('retraction refuses without a current promotion and mutates nothing', () => {
  const sandbox = setupPromotableSandbox();
  try {
    const before = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);
    const result = runRetract(sandbox.readerUiRoot, sandbox.hostRoot, 'reader.reading-surface');
    const after = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr?.toString() || '', /not 'implementation-ready'|only a current promotion/);
    assert.deepEqual(after, before, 'failed retraction must not mutate any transaction file');
  } finally {
    cleanupSandbox(sandbox);
  }
});

test('retraction prevents replaying the withdrawn source evidence', () => {
  const sandbox = setupPromotedSandbox();
  try {
    const retractResult = runRetract(sandbox.readerUiRoot, sandbox.hostRoot, 'reader.reading-surface');
    assert.equal(retractResult.status, 0, retractResult.stderr?.toString());
    const beforeReplay = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);
    const replay = runPromote(sandbox.readerUiRoot, sandbox.hostRoot, 'reader.reading-surface');
    const afterReplay = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);
    assert.notEqual(replay.status, 0, 'promotion must not replay withdrawn evidence');
    assert.match(replay.stderr?.toString() || '', /retraction freshness verification failed/);
    assert.deepEqual(afterReplay, beforeReplay, 'blocked replay must not mutate any transaction file');
  } finally {
    cleanupSandbox(sandbox);
  }
});

test('a fresh B2/B3 evidence packet can promote after a retraction', () => {
  const sandbox = setupPromotedSandbox();
  try {
    const retractResult = runRetract(sandbox.readerUiRoot, sandbox.hostRoot, 'reader.reading-surface');
    assert.equal(retractResult.status, 0, retractResult.stderr?.toString());

    const deltaPath = path.join(
      sandbox.readerUiRoot,
      'docs', 'design', 'handoffs', 'reader-runtime', 'reading-surface', 'design-delta.md',
    );
    fs.appendFileSync(deltaPath, '\nA2 source extraction closed in a new conversion.\n');
    const addResult = spawnSync('git', ['add', '.'], { cwd: sandbox.readerUiRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    assert.equal(addResult.status, 0, addResult.stderr?.toString());
    const commitResult = spawnSync('git', ['commit', '-m', 'fresh B2 B3 conversion'], {
      cwd: sandbox.readerUiRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    assert.equal(commitResult.status, 0, commitResult.stderr?.toString());
    const freshCommit = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: sandbox.readerUiRoot, encoding: 'utf8' }).stdout.trim();
    writeLocalReady(sandbox.readerUiRoot, 'reader.reading-surface', 'reader-runtime', true, {
      implementationCommit: freshCommit,
    });

    const rePromote = runPromote(sandbox.readerUiRoot, sandbox.hostRoot, 'reader.reading-surface');
    assert.equal(rePromote.status, 0,
      `fresh evidence should allow a new promotion. stderr: ${rePromote.stderr?.toString()}\nstdout: ${rePromote.stdout?.toString()}`);
    const ledgerAfter = JSON.parse(fs.readFileSync(
      path.join(sandbox.readerUiRoot, 'docs', 'design', 'PROMOTION_LEDGER.json'),
      'utf8',
    ));
    assert.equal(ledgerAfter.entries.length, 3);
    assert.equal(ledgerAfter.entries[2].kind, 'promote');
  } finally {
    cleanupSandbox(sandbox);
  }
});

function runRetractFaultInjectionTest(phase) {
  const sandbox = setupPromotedSandbox();
  try {
    const before = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);
    const result = runRetract(sandbox.readerUiRoot, sandbox.hostRoot, 'reader.reading-surface', { fault: phase });
    assert.notEqual(result.status, 0, `retract should fail when ${phase} is injected`);
    assert.match(result.stderr?.toString() || '', /injected fault|rolling back/);
    const after = snapshotFiles(sandbox.readerUiRoot, sandbox.hostRoot);
    assert.deepEqual(after, before, `${phase}: all four files must roll back to the promoted snapshot`);

    const checkResult = spawnSync('node', [
      path.join(sandbox.readerUiRoot, 'tools', 'design', 'promote-family.mjs'),
      '--check',
    ], { cwd: sandbox.readerUiRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    assert.equal(checkResult.status, 0,
      `${phase}: --check should pass after retract rollback. stderr: ${checkResult.stderr?.toString()}`);
  } finally {
    cleanupSandbox(sandbox);
  }
}

test('retract fault injection AFTER_REGISTRY_WRITE: all four files roll back', () => {
  runRetractFaultInjectionTest('AFTER_REGISTRY_WRITE');
});

test('retract fault injection AFTER_GENERATOR: all four files roll back', () => {
  runRetractFaultInjectionTest('AFTER_GENERATOR');
});

test('retract fault injection AFTER_CONSUMER_SYNC: all four files roll back', () => {
  runRetractFaultInjectionTest('AFTER_CONSUMER_SYNC');
});

test('retract fault injection AFTER_LEDGER_WRITE: all four files roll back', () => {
  runRetractFaultInjectionTest('AFTER_LEDGER_WRITE');
});

test('retract fault injection IN_FINAL_VERIFY: all four files roll back', () => {
  runRetractFaultInjectionTest('IN_FINAL_VERIFY');
});
