import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyRevisionEvidenceToRegistry,
  buildCurrentFileUrl,
  buildCurrentNodesUrl,
  buildFigmaAuthHeaders,
  collectRegistryExactBindingNodeIds,
  parseExactNodeIdsCsv,
  readCurrentRevisionEvidence,
  validateRevisionEvidenceForRegistry,
} from './figma-current-revision-adapter-lib.mjs';

function fixtureRegistry() {
  return {
    authority: { fileKey: 'file-key' },
    records: [
      {
        id: 'page',
        classification: 'exact-figma-binding',
        deliveryStatus: 'current-read-unfrozen',
        figma: {
          fileKey: 'file-key',
          pageId: '1:1',
          canonicalMasterId: '1:2',
          nodeId: '1:2',
          viewportNodes: { phone: '1:3', tablet: '1:4' },
          variantNodes: ['1:5'],
          finalAssemblyNodes: { phone: '1:6', tablet: '1:7' },
          revision: null,
          revisionStatus: 'current-node-read-revision-unavailable',
        },
      },
      {
        id: 'absent',
        classification: 'figma-absent-fail-closed',
        deliveryStatus: 'enforced-fail-closed',
        figma: {
          fileKey: 'file-key',
          pageId: null,
          canonicalMasterId: null,
          nodeId: null,
          viewportNodes: { phone: null, tablet: null },
          revision: null,
          revisionStatus: 'figma-absent',
        },
      },
    ],
  };
}

function jsonResponse(payload) {
  return { ok: true, status: 200, json: async () => payload };
}

test('adapter reads a current version first and pins all node reads to it without persisting the token', async () => {
  const registry = fixtureRegistry();
  const requestedIds = collectRegistryExactBindingNodeIds(registry);
  const calls = [];
  const token = 'do-not-persist-this-token';
  const evidence = await readCurrentRevisionEvidence({
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      if (calls.length === 1 || calls.length === 3) {
        return jsonResponse({ version: 'rev-42', lastModified: '2026-07-24T00:00:00Z', name: 'Reader UI' });
      }
      const nodes = Object.fromEntries(requestedIds.map((id) => [id, { document: { id, name: `Node ${id}`, type: 'FRAME' } }]));
      return jsonResponse({ nodes });
    },
    fileKey: 'file-key',
    nodeIds: requestedIds,
    token,
    now: () => '2026-07-24T01:02:03.000Z',
  });

  assert.equal(calls.length, 3);
  assert.match(calls[0].url, /\/v1\/files\/file-key\?depth=1$/);
  assert.match(calls[1].url, /\/v1\/files\/file-key\/nodes\?/);
  assert.match(calls[1].url, /version=rev-42/);
  assert.equal(calls[2].url, calls[0].url);
  assert.equal(calls[0].options.headers['X-Figma-Token'], token);
  assert.equal(evidence.currentRevision, 'rev-42');
  assert.deepEqual(evidence.requestedNodeIds, requestedIds);
  assert.equal(evidence.resolvedNodes.length, requestedIds.length);
  assert.equal(JSON.stringify(evidence).includes(token), false);
  assert.equal(evidence.provenance.readOnly, true);
  assert.match(evidence.provenance.stableReadWindow, /R1 current revision/);
});

test('adapter accepts only documented PAT/plan/OAuth header modes and never accepts a missing token', () => {
  assert.deepEqual(buildFigmaAuthHeaders('pat-token'), { 'X-Figma-Token': 'pat-token' });
  assert.deepEqual(buildFigmaAuthHeaders('oauth-token', 'oauth'), { Authorization: 'Bearer oauth-token' });
  assert.throws(() => buildFigmaAuthHeaders(''), /FIGMA_READ_TOKEN is required/);
  assert.throws(() => buildFigmaAuthHeaders('x', 'unknown'), /FIGMA_READ_TOKEN_KIND/);
});

test('extra read-only node IDs require exact syntax and are deduplicated before an evidence read', () => {
  assert.deepEqual(parseExactNodeIdsCsv('2:3, 1:2, 2:3'), ['1:2', '2:3']);
  assert.throws(() => parseExactNodeIdsCsv(''), /--node-ids/);
  assert.throws(() => parseExactNodeIdsCsv('1:2,,3:4'), /--node-ids/);
  assert.throws(() => parseExactNodeIdsCsv('1:two'), /--node-ids/);
  assert.throws(() => parseExactNodeIdsCsv(undefined), /--node-ids/);

  const registryIds = collectRegistryExactBindingNodeIds(fixtureRegistry());
  const requestedIds = [...new Set([...registryIds, ...parseExactNodeIdsCsv('1:3, 9:9')])].sort();
  assert.deepEqual(requestedIds, [...registryIds, '9:9'].sort());
});

test('missing credentials fail before network access and HTTP failures never echo server bodies or tokens', async () => {
  let calls = 0;
  await assert.rejects(
    readCurrentRevisionEvidence({
      fetchImpl: async () => {
        calls += 1;
        return jsonResponse({ version: 'must-not-be-read' });
      },
      fileKey: 'file-key',
      nodeIds: ['1:1'],
      token: '',
    }),
    /FIGMA_READ_TOKEN is required/,
  );
  assert.equal(calls, 0);

  const canary = 'token-never-in-error';
  await assert.rejects(
    readCurrentRevisionEvidence({
      fetchImpl: async () => ({
        ok: false,
        status: 403,
        json: async () => ({ message: canary }),
      }),
      fileKey: 'file-key',
      nodeIds: ['1:1'],
      token: canary,
    }),
    (error) => {
      assert.match(error.message, /HTTP 403/);
      assert.doesNotMatch(error.message, new RegExp(canary));
      return true;
    },
  );
});

test('registry patch requires every exact node and preserves unresolved delivery status', () => {
  const registry = fixtureRegistry();
  const ids = collectRegistryExactBindingNodeIds(registry);
  const evidence = {
    kind: 'FIGMA_CURRENT_REVISION_EVIDENCE',
    schemaVersion: '1.0.0',
    fileKey: 'file-key',
    currentRevision: 'rev-42',
    lastModified: '2026-07-24T00:00:00Z',
    observedAt: '2026-07-24T01:02:03.000Z',
    provenance: { source: 'figma-rest', readOnly: true },
    resolvedNodes: ids.map((id) => ({ id, name: null, type: 'FRAME' })),
  };
  assert.equal(validateRevisionEvidenceForRegistry(registry, evidence), true);
  const result = applyRevisionEvidenceToRegistry(registry, evidence, 'docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json');
  const exact = result.registry.records[0];
  const absent = result.registry.records[1];
  assert.deepEqual(result.updatedRecordIds, ['page']);
  assert.equal(exact.figma.revision, 'rev-42');
  assert.equal(exact.figma.revisionStatus, 'official-rest-current-version-node-verified');
  assert.equal(exact.deliveryStatus, 'current-read-unfrozen');
  assert.equal(absent.figma.revision, null);
  assert.equal(registry.records[0].figma.revision, null, 'patch is immutable');

  const repeated = applyRevisionEvidenceToRegistry(
    result.registry,
    evidence,
    'docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json',
  );
  assert.deepEqual(repeated.updatedRecordIds, []);
  assert.deepEqual(repeated.unchangedRecordIds, ['page']);
});

test('registry patch refuses partial node evidence and refuses overwriting an existing different revision by default', () => {
  const registry = fixtureRegistry();
  const incompleteEvidence = {
    kind: 'FIGMA_CURRENT_REVISION_EVIDENCE',
    schemaVersion: '1.0.0',
    fileKey: 'file-key',
    currentRevision: 'rev-42',
    lastModified: '2026-07-24T00:00:00Z',
    observedAt: '2026-07-24T01:02:03.000Z',
    provenance: { source: 'figma-rest', readOnly: true },
    resolvedNodes: [{ id: '1:1' }],
  };
  assert.throws(() => applyRevisionEvidenceToRegistry(registry, incompleteEvidence, 'evidence.json'), /did not resolve/);

  const ids = collectRegistryExactBindingNodeIds(registry);
  const fullEvidence = { ...incompleteEvidence, resolvedNodes: ids.map((id) => ({ id })) };
  registry.records[0].figma.revision = 'older-revision';
  assert.throws(() => applyRevisionEvidenceToRegistry(registry, fullEvidence, 'evidence.json'), /refuses to overwrite/);
});

test('explicit current-revision rebase updates proof but never promotes delivery', () => {
  const registry = fixtureRegistry();
  const ids = collectRegistryExactBindingNodeIds(registry);
  registry.records[0].figma.revision = 'older-revision';
  const evidence = {
    kind: 'FIGMA_CURRENT_REVISION_EVIDENCE',
    schemaVersion: '1.0.0',
    fileKey: 'file-key',
    currentRevision: 'newer-revision',
    lastModified: '2026-07-25T00:00:00Z',
    observedAt: '2026-07-25T00:01:02.000Z',
    provenance: { source: 'figma-rest', readOnly: true },
    resolvedNodes: ids.map((id) => ({ id })),
  };
  const result = applyRevisionEvidenceToRegistry(registry, evidence, 'evidence.json', { allowRevisionRebase: true });
  assert.equal(result.registry.records[0].figma.revision, 'newer-revision');
  assert.equal(result.registry.records[0].deliveryStatus, 'current-read-unfrozen');
  assert.deepEqual(result.updatedRecordIds, ['page']);
});

test('adapter fails closed when the file advances during its stable node-read window', async () => {
  const registry = fixtureRegistry();
  const requestedIds = collectRegistryExactBindingNodeIds(registry);
  let call = 0;
  await assert.rejects(
    readCurrentRevisionEvidence({
      fetchImpl: async () => {
        call += 1;
        if (call === 1) return jsonResponse({ version: 'rev-42', lastModified: '2026-07-24T00:00:00Z' });
        if (call === 2) {
          return jsonResponse({ nodes: Object.fromEntries(requestedIds.map((id) => [id, { document: { id, name: id, type: 'FRAME' } }])) });
        }
        return jsonResponse({ version: 'rev-43', lastModified: '2026-07-24T00:01:00Z' });
      },
      fileKey: 'file-key',
      nodeIds: requestedIds,
      token: 'canary',
    }),
    /advanced during node validation/,
  );
});

test('URLs use current metadata then an explicitly version-pinned node read', () => {
  assert.equal(buildCurrentFileUrl('file-key').toString(), 'https://api.figma.com/v1/files/file-key?depth=1');
  const url = buildCurrentNodesUrl('file-key', ['1:2', '1:3'], 'rev-42');
  assert.equal(url.searchParams.get('ids'), '1:2,1:3');
  assert.equal(url.searchParams.get('version'), 'rev-42');
  assert.equal(url.searchParams.get('depth'), '1');
});
