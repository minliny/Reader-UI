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
  buildVersionPinnedNodesUrl,
  canonicalJson,
  figmaSourcePlanSha256,
  parseFigmaNodeSnapshotArgs,
  parseFigmaSourcePlan,
  projectFigmaNodeResponse,
  readVersionPinnedFigmaNodeSnapshot,
  redactFigmaReadToken,
  renderFigmaNodeSnapshot,
  runFigmaNodeSnapshotCli,
  validateFigmaNodeSnapshot,
} from './figma-node-snapshot-lib.mjs';

function makeSourcePlan(nodeIds = ['1:1', '2:2', '3:3'], revision = 'revision-1') {
  const sortedNodeIds = [...nodeIds].sort();
  const records = sortedNodeIds.map((nodeId, index) => ({
    recordId: `record.${index}`,
    surfaceType: 'component',
    routeIds: [],
    fileKey: 'fixture-file',
    revision,
    canonicalMasterId: nodeId,
    nodeId,
    viewportNodeIds: { phone: nodeId, tablet: nodeId },
    variantNodeIds: {},
    deliveryStatus: 'fixture',
    harmonyTargets: [],
  }));
  return `${JSON.stringify({
    kind: 'FIGMA_SOURCE_PLAN',
    schemaVersion: '1.0.0',
    registrySha256: 'a'.repeat(64),
    classification: 'exact-figma-binding',
    source: {
      fileKey: 'fixture-file',
      revision,
    },
    recordCount: records.length,
    records,
    nodeIds: {
      roots: sortedNodeIds,
      viewports: sortedNodeIds,
      variants: [],
      all: sortedNodeIds,
    },
  }, null, 2)}\n`;
}

function jsonResponse(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() {
      return payload;
    },
  };
}

function makeDocument(nodeId) {
  return {
    type: 'FRAME',
    children: [
      {
        type: 'TEXT',
        characters: `Nested ${nodeId}`,
        id: `${nodeId}-child`,
      },
    ],
    id: nodeId,
    name: `Node ${nodeId}`,
  };
}

function makeStableFetch({
  revision = 'revision-1',
  finalRevision = revision,
  rawNodeFor = (nodeId) => ({ document: makeDocument(nodeId) }),
  onRequest = () => {},
} = {}) {
  const requests = [];
  let metadataReads = 0;
  const fetchImpl = async (urlValue, options) => {
    const url = new URL(urlValue);
    requests.push({ url, options });
    onRequest({ url, options, requestIndex: requests.length - 1 });
    if (!url.pathname.endsWith('/nodes')) {
      metadataReads += 1;
      return jsonResponse({
        version: metadataReads === 1 ? revision : finalRevision,
        lastModified: '2026-07-25T12:00:00Z',
        name: 'Fixture Design',
      });
    }
    const ids = url.searchParams.get('ids').split(',');
    return jsonResponse({
      nodes: Object.fromEntries(ids.map((nodeId) => [nodeId, rawNodeFor(nodeId)])),
    });
  };
  return { fetchImpl, requests };
}

test('full-subtree URL pins version and deliberately omits depth', () => {
  const url = buildVersionPinnedNodesUrl('fixture-file', ['1:1', '2:2'], 'revision-1');
  assert.equal(url.pathname, '/v1/files/fixture-file/nodes');
  assert.equal(url.searchParams.get('ids'), '1:1,2:2');
  assert.equal(url.searchParams.get('version'), 'revision-1');
  assert.equal(url.searchParams.has('depth'), false);
});

test('source plan parser fails closed on duplicate, unsorted, and record-drifted node identities', () => {
  const duplicate = JSON.parse(makeSourcePlan());
  duplicate.nodeIds.all = ['1:1', '1:1', '2:2', '3:3'];
  assert.throws(() => parseFigmaSourcePlan(JSON.stringify(duplicate)), /duplicate node IDs/);

  const unsorted = JSON.parse(makeSourcePlan());
  unsorted.nodeIds.all = ['2:2', '1:1', '3:3'];
  assert.throws(() => parseFigmaSourcePlan(JSON.stringify(unsorted)), /deterministically sorted/);

  const missing = JSON.parse(makeSourcePlan());
  missing.nodeIds.all = ['1:1', '2:2'];
  assert.throws(() => parseFigmaSourcePlan(JSON.stringify(missing)), /does not exactly match/);
});

test('stable read captures every complete document, subtree SHA, plan SHA, and batch', async () => {
  const sourcePlanSource = makeSourcePlan();
  const token = 'secret-token-that-must-not-be-persisted';
  const { fetchImpl, requests } = makeStableFetch();
  const snapshot = await readVersionPinnedFigmaNodeSnapshot({
    fetchImpl,
    sourcePlanSource,
    token,
    batchSize: 2,
  });

  assert.equal(requests.length, 4);
  assert.equal(requests[0].url.searchParams.get('depth'), '1');
  for (const request of requests.filter((item) => item.url.pathname.endsWith('/nodes'))) {
    assert.equal(request.url.searchParams.has('depth'), false);
    assert.equal(request.url.searchParams.get('version'), 'revision-1');
    assert.equal(request.options.headers['X-Figma-Token'], token);
  }
  assert.deepEqual(snapshot.requestBatches.map((batch) => batch.count), [2, 1]);
  assert.equal(snapshot.nodeCount, 3);
  assert.equal(snapshot.sourcePlan.sha256, figmaSourcePlanSha256(sourcePlanSource));
  assert.equal(snapshot.source.revision, 'revision-1');
  assert.equal(snapshot.nodes[0].responseKind, 'document');
  assert.equal(snapshot.nodes[0].document.children[0].characters, 'Nested 1:1');
  assert.equal(
    snapshot.nodes[0].subtreeSha256,
    crypto.createHash('sha256').update(canonicalJson(snapshot.nodes[0].document)).digest('hex'),
  );
  const rendered = renderFigmaNodeSnapshot(snapshot);
  assert.equal(rendered.includes(token), false);
  assert.equal(snapshot.provenance.tokenPersisted, false);
  assert.equal(validateFigmaNodeSnapshot(snapshot, sourcePlanSource), true);
});

test('per-node projection preserves document, error, and null response shapes', () => {
  const document = projectFigmaNodeResponse('1:1', { document: makeDocument('1:1') });
  assert.equal(document.responseKind, 'document');
  assert.ok(document.document);
  assert.equal(document.error, null);
  assert.match(document.subtreeSha256, /^[a-f0-9]{64}$/);

  const error = projectFigmaNodeResponse('1:1', {
    document: null,
    error: { code: 404, message: 'not found' },
  });
  assert.equal(error.responseKind, 'error');
  assert.equal(error.document, null);
  assert.deepEqual(error.error, { code: 404, message: 'not found' });
  assert.equal(error.subtreeSha256, null);

  const nullResponse = projectFigmaNodeResponse('1:1', null);
  assert.deepEqual(nullResponse, {
    nodeId: '1:1',
    responseKind: 'null',
    document: null,
    error: null,
    subtreeSha256: null,
  });
});

test('R1 must equal the source-plan revision before any node request is made', async () => {
  const { fetchImpl, requests } = makeStableFetch({ revision: 'other-revision' });
  await assert.rejects(
    readVersionPinnedFigmaNodeSnapshot({
      fetchImpl,
      sourcePlanSource: makeSourcePlan(),
      token: 'secret',
    }),
    /R1 revision other-revision does not match source plan revision revision-1/,
  );
  assert.equal(requests.length, 1);
});

test('R2 revision drift rejects an otherwise complete node read', async () => {
  const { fetchImpl } = makeStableFetch({ finalRevision: 'revision-2' });
  await assert.rejects(
    readVersionPinnedFigmaNodeSnapshot({
      fetchImpl,
      sourcePlanSource: makeSourcePlan(),
      token: 'secret',
    }),
    /revision advanced during full-subtree read/,
  );
});

test('null, error, missing, and document-ID mismatch each fail closed', async (t) => {
  const cases = [
    ['null', () => null, /1:1:null/],
    ['error', () => ({ error: 'permission denied', document: null }), /1:1:error/],
    ['missing document', () => ({}), /1:1:null/],
    ['mismatched document', () => ({ document: makeDocument('9:9') }), /document-id-mismatch/],
  ];
  for (const [name, rawNodeFor, pattern] of cases) {
    await t.test(name, async () => {
      const { fetchImpl } = makeStableFetch({ rawNodeFor });
      await assert.rejects(
        readVersionPinnedFigmaNodeSnapshot({
          fetchImpl,
          sourcePlanSource: makeSourcePlan(['1:1']),
          token: 'secret',
        }),
        pattern,
      );
    });
  }
});

test('HTTP, malformed JSON, and thrown transport errors expose no token-bearing implementation message', async (t) => {
  const token = 'super-secret';
  const sourcePlanSource = makeSourcePlan(['1:1']);
  const cases = [
    ['HTTP', async () => jsonResponse({}, { ok: false, status: 403 }), /HTTP 403/],
    ['JSON', async () => ({ ok: true, status: 200, async json() { throw new Error(token); } }), /invalid JSON/],
    ['transport', async () => { throw new Error(`headers X-Figma-Token=${token}`); }, /network request failed/],
  ];
  for (const [name, fetchImpl, pattern] of cases) {
    await t.test(name, async () => {
      let message = '';
      await assert.rejects(
        readVersionPinnedFigmaNodeSnapshot({
          fetchImpl,
          sourcePlanSource,
          token,
        }),
        (error) => {
          message = error.message;
          return pattern.test(message);
        },
      );
      assert.equal(message.includes(token), false);
    });
  }
});

test('CLI defaults to check, requires environment token, and never accepts a token argument', async () => {
  assert.deepEqual(parseFigmaNodeSnapshotArgs([]), {
    mode: 'check',
    planPath: null,
    outputPath: null,
    batchSize: 40,
    help: false,
  });
  assert.equal(parseFigmaNodeSnapshotArgs(['--write']).mode, 'write');
  assert.throws(
    () => parseFigmaNodeSnapshotArgs(['--check', '--write']),
    /mutually exclusive/,
  );
  assert.throws(
    () => parseFigmaNodeSnapshotArgs(['--token', 'secret']),
    /unknown argument: --token/,
  );

  const temporary = mkdtempSync(path.join(tmpdir(), 'figma-node-snapshot-no-token-'));
  try {
    const generated = path.join(temporary, 'generated/figma');
    mkdirSync(generated, { recursive: true });
    writeFileSync(path.join(generated, 'FIGMA_SOURCE_PLAN.json'), makeSourcePlan(['1:1']), 'utf8');
    let networkRequests = 0;
    await assert.rejects(
      runFigmaNodeSnapshotCli({
        argv: [],
        repoRoot: temporary,
        env: {},
        fetchImpl: async () => {
          networkRequests += 1;
          return jsonResponse({});
        },
      }),
      /FIGMA_READ_TOKEN is not configured; no network request was made/,
    );
    assert.equal(networkRequests, 0);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test('CLI check compares deterministic bytes without writing and rejects stale output', async () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'figma-node-snapshot-check-'));
  try {
    const generated = path.join(temporary, 'generated/figma');
    const planPath = path.join(generated, 'FIGMA_SOURCE_PLAN.json');
    const snapshotPath = path.join(generated, 'FIGMA_NODE_SNAPSHOT.json');
    mkdirSync(generated, { recursive: true });
    const sourcePlanSource = makeSourcePlan();
    writeFileSync(planPath, sourcePlanSource, 'utf8');

    const first = makeStableFetch();
    const expected = await readVersionPinnedFigmaNodeSnapshot({
      fetchImpl: first.fetchImpl,
      sourcePlanSource,
      token: 'secret',
      sourcePlanArtifact: 'generated/figma/FIGMA_SOURCE_PLAN.json',
    });
    writeFileSync(snapshotPath, renderFigmaNodeSnapshot(expected), 'utf8');
    const bytesBefore = readFileSync(snapshotPath, 'utf8');

    let output = '';
    const second = makeStableFetch();
    const result = await runFigmaNodeSnapshotCli({
      argv: [],
      repoRoot: temporary,
      env: { FIGMA_READ_TOKEN: 'secret' },
      fetchImpl: second.fetchImpl,
      stdout: { write(value) { output += value; } },
    });
    assert.equal(result.mode, 'check');
    assert.equal(result.changed, false);
    assert.match(output, /Figma node snapshot current: 3 full-subtree nodes/);
    assert.equal(readFileSync(snapshotPath, 'utf8'), bytesBefore);

    writeFileSync(snapshotPath, `${bytesBefore} `, 'utf8');
    const stale = makeStableFetch();
    await assert.rejects(
      runFigmaNodeSnapshotCli({
        argv: ['--check'],
        repoRoot: temporary,
        env: { FIGMA_READ_TOKEN: 'secret' },
        fetchImpl: stale.fetchImpl,
      }),
      /stale generated\/figma\/FIGMA_NODE_SNAPSHOT\.json; run with --write/,
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test('CLI rejects source-plan byte drift during its network window', async () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'figma-node-snapshot-plan-drift-'));
  try {
    const generated = path.join(temporary, 'generated/figma');
    const planPath = path.join(generated, 'FIGMA_SOURCE_PLAN.json');
    mkdirSync(generated, { recursive: true });
    const sourcePlanSource = makeSourcePlan(['1:1']);
    writeFileSync(planPath, sourcePlanSource, 'utf8');
    let changed = false;
    const { fetchImpl } = makeStableFetch({
      onRequest({ url }) {
        if (!changed && url.pathname.endsWith('/nodes')) {
          changed = true;
          writeFileSync(planPath, `${sourcePlanSource} `, 'utf8');
        }
      },
    });
    await assert.rejects(
      runFigmaNodeSnapshotCli({
        argv: [],
        repoRoot: temporary,
        env: { FIGMA_READ_TOKEN: 'secret' },
        fetchImpl,
      }),
      /source plan changed during the stable node-read window/,
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test('redaction removes an environment token from the outer CLI error path', () => {
  assert.equal(
    redactFigmaReadToken('request leaked abc123 in text', 'abc123'),
    'request leaked [REDACTED] in text',
  );
});
