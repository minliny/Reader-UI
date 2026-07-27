import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildFigmaDesignIrArtifact,
  parseFigmaDesignIrArgs,
  renderFigmaDesignIrArtifact,
  runFigmaDesignIrCli,
  validateFigmaDesignIrArtifact,
} from './figma-design-ir-artifact-lib.mjs';

function document(nodeId, name = `Node ${nodeId}`) {
  return {
    id: nodeId,
    type: 'FRAME',
    name,
    absoluteBoundingBox: { x: 0, y: 0, width: 390, height: 844 },
    children: [
      {
        id: `${Number(nodeId.split(':')[0]) + 100}:${nodeId.split(':')[1]}`,
        type: 'TEXT',
        name: 'Label',
        characters: name,
        absoluteBoundingBox: { x: 16, y: 20, width: 120, height: 24 },
        style: {
          fontFamily: 'Inter',
          fontWeight: 400,
          fontSize: 16,
        },
      },
    ],
  };
}

function makePlanSource() {
  const records = [
    {
      recordId: 'alpha.page',
      surfaceType: 'route-family',
      routeIds: ['alpha'],
      fileKey: 'fixture-file',
      revision: 'revision-7',
      canonicalMasterId: '1:1',
      nodeId: '1:1',
      viewportNodeIds: { phone: '2:2', tablet: '3:3' },
      variantNodeIds: {},
      deliveryStatus: 'fixture',
      harmonyTargets: [],
    },
    {
      recordId: 'beta.states',
      surfaceType: 'route-variant-family',
      routeIds: ['beta-ready'],
      fileKey: 'fixture-file',
      revision: 'revision-7',
      canonicalMasterId: '1:1',
      nodeId: '1:1',
      viewportNodeIds: { phone: null, tablet: null },
      variantNodeIds: {
        'beta-ready': { phone: '2:2', tablet: '4:4' },
      },
      deliveryStatus: 'fixture',
      harmonyTargets: [],
    },
  ];
  return `${JSON.stringify({
    kind: 'FIGMA_SOURCE_PLAN',
    schemaVersion: '1.0.0',
    registrySha256: 'a'.repeat(64),
    classification: 'exact-figma-binding',
    source: { fileKey: 'fixture-file', revision: 'revision-7' },
    recordCount: records.length,
    records,
    nodeIds: {
      roots: ['1:1'],
      viewports: ['2:2', '3:3'],
      variants: ['2:2', '4:4'],
      all: ['1:1', '2:2', '3:3', '4:4'],
    },
  }, null, 2)}\n`;
}

function makeSnapshotSource(planSource, { map = false } = {}) {
  const planSha = crypto.createHash('sha256').update(planSource).digest('hex');
  const nodeIds = ['1:1', '2:2', '3:3', '4:4'];
  const nodes = map
    ? Object.fromEntries([...nodeIds].reverse().map((nodeId) => [
      nodeId,
      { document: document(nodeId), nodeId, responseKind: 'document', error: null },
    ]))
    : [...nodeIds].reverse().map((nodeId) => ({
      nodeId,
      responseKind: 'document',
      document: document(nodeId),
      error: null,
    }));
  return `${JSON.stringify({
    kind: 'FIGMA_NODE_SNAPSHOT',
    schemaVersion: '1.0.0',
    sourcePlan: { sha256: planSha },
    source: { fileKey: 'fixture-file', revision: 'revision-7' },
    nodeCount: nodeIds.length,
    nodes,
  }, null, 2)}\n`;
}

test('deduplicates exact nodes while retaining sorted record and role claims', async () => {
  const planSource = makePlanSource();
  const artifact = buildFigmaDesignIrArtifact({
    sourcePlanSource: planSource,
    snapshotSource: makeSnapshotSource(planSource),
  });

  assert.equal(artifact.bindingCount, 4);
  assert.deepEqual(artifact.bindings.map((binding) => binding.rootId), [
    '1:1',
    '2:2',
    '3:3',
    '4:4',
  ]);
  assert.deepEqual(artifact.bindings[0].roles, ['canonical', 'root']);
  assert.deepEqual(artifact.bindings[0].recordIds, ['alpha.page', 'beta.states']);
  assert.deepEqual(artifact.bindings[1].roles, [
    'variant.beta-ready.phone',
    'viewport.phone',
  ]);
  assert.deepEqual(artifact.bindings[1].claims, [
    { recordId: 'alpha.page', roles: ['viewport.phone'] },
    { recordId: 'beta.states', roles: ['variant.beta-ready.phone'] },
  ]);
  assert.equal(artifact.bindings[1].subtreeHash, artifact.bindings[1].ir.subtreeHash);
  assert.match(artifact.artifactHash, /^[a-f0-9]{64}$/);
  assert.equal(validateFigmaDesignIrArtifact(artifact), true);
});

test('array and injectable nodes-map snapshots produce the same stable IR artifact', async () => {
  const planSource = makePlanSource();
  const arrayArtifact = buildFigmaDesignIrArtifact({
    sourcePlanSource: planSource,
    snapshotSource: makeSnapshotSource(planSource),
  });
  const mapArtifact = buildFigmaDesignIrArtifact({
    sourcePlanSource: planSource,
    snapshotSource: makeSnapshotSource(planSource, { map: true }),
  });
  assert.deepEqual(mapArtifact, arrayArtifact);
  assert.equal(
    renderFigmaDesignIrArtifact(mapArtifact),
    renderFigmaDesignIrArtifact(arrayArtifact),
  );
});

test('fails closed on plan SHA, source identity, missing node, and document ID drift', async () => {
  const planSource = makePlanSource();
  const base = JSON.parse(makeSnapshotSource(planSource));

  const planDrift = structuredClone(base);
  planDrift.sourcePlan.sha256 = 'b'.repeat(64);
  assert.throws(
    () => buildFigmaDesignIrArtifact({
      sourcePlanSource: planSource,
      snapshotSource: JSON.stringify(planDrift),
    }),
    /source-plan SHA drift/,
  );

  for (const [mutation, expected] of [
    [(snapshot) => { snapshot.source.fileKey = 'wrong-file'; }, /fileKey drift/],
    [(snapshot) => { snapshot.source.revision = 'wrong-revision'; }, /revision drift/],
    [(snapshot) => { snapshot.nodes.pop(); snapshot.nodeCount -= 1; }, /do not exactly match/],
    [(snapshot) => { snapshot.nodes[0].document.id = '9:9'; }, /document id drift/],
  ]) {
    const snapshot = structuredClone(base);
    mutation(snapshot);
    assert.throws(
      () => buildFigmaDesignIrArtifact({
        sourcePlanSource: planSource,
        snapshotSource: JSON.stringify(snapshot),
      }),
      expected,
    );
  }
});

test('fails closed when a snapshot per-node subtree digest no longer matches its document', () => {
  const planSource = makePlanSource();
  const snapshot = JSON.parse(makeSnapshotSource(planSource));
  snapshot.nodes[0].subtreeSha256 = 'b'.repeat(64);
  assert.throws(
    () => buildFigmaDesignIrArtifact({
      sourcePlanSource: planSource,
      snapshotSource: JSON.stringify(snapshot),
    }),
    /snapshot subtree SHA drift/,
  );
});

test('visible unsupported Figma fields are rejected by the canonical IR builder', async () => {
  const planSource = makePlanSource();
  const snapshot = JSON.parse(makeSnapshotSource(planSource));
  snapshot.nodes[0].document.unimplementedVisualProperty = 42;
  assert.throws(
    () => buildFigmaDesignIrArtifact({
      sourcePlanSource: planSource,
      snapshotSource: JSON.stringify(snapshot),
    }),
    /unsupported visible fields: unimplementedVisualProperty/,
  );
});

test('CLI defaults to byte-exact check and requires explicit write mode', async () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'figma-design-ir-'));
  try {
    const generatedDirectory = path.join(temporary, 'generated/figma');
    mkdirSync(generatedDirectory, { recursive: true });
    const planPath = path.join(generatedDirectory, 'FIGMA_SOURCE_PLAN.json');
    const snapshotPath = path.join(generatedDirectory, 'FIGMA_NODE_SNAPSHOT.json');
    const outputPath = path.join(generatedDirectory, 'FIGMA_DESIGN_IR.json');
    const planSource = makePlanSource();
    writeFileSync(planPath, planSource, 'utf8');
    writeFileSync(snapshotPath, makeSnapshotSource(planSource), 'utf8');

    const writes = [];
    const writeResult = runFigmaDesignIrCli({
      argv: ['--write'],
      repoRoot: temporary,
      stdout: { write: (value) => writes.push(value) },
    });
    assert.equal(writeResult.mode, 'write');
    assert.match(writes.join(''), /4 deduplicated exact-node IR bindings/);

    const checks = [];
    const checkResult = runFigmaDesignIrCli({
      argv: [],
      repoRoot: temporary,
      stdout: { write: (value) => checks.push(value) },
    });
    assert.equal(checkResult.mode, 'check');
    assert.match(checks.join(''), /Figma Design IR current/);

    writeFileSync(outputPath, `${readFileSync(outputPath, 'utf8')} `, 'utf8');
    assert.throws(
      () => runFigmaDesignIrCli({
        argv: ['--check'],
        repoRoot: temporary,
        stdout: { write() {} },
      }),
      /stale .*FIGMA_DESIGN_IR\.json; run with --write/,
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test('argument parser keeps check as the default and makes write explicit', () => {
  assert.deepEqual(parseFigmaDesignIrArgs([]), {
    mode: 'check',
    planPath: null,
    snapshotPath: null,
    outputPath: null,
    help: false,
  });
  assert.equal(parseFigmaDesignIrArgs(['--write']).mode, 'write');
  assert.throws(
    () => parseFigmaDesignIrArgs(['--check', '--write']),
    /mutually exclusive/,
  );
});
