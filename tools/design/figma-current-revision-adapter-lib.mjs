/**
 * Read-only Figma current-revision adapter primitives.
 *
 * The Figma Plugin API can read the live document graph but does not expose an
 * official file revision.  This module deliberately uses the REST API only
 * for that missing provenance fact.  It never receives a token through CLI
 * arguments, never emits one, and has no Figma write endpoint.
 */

export const CURRENT_REVISION_EVIDENCE_KIND = 'FIGMA_CURRENT_REVISION_EVIDENCE';
export const CURRENT_REVISION_EVIDENCE_SCHEMA = '1.0.0';
export const FIGMA_REST_ORIGIN = 'https://api.figma.com';

const EXACT_BINDING = 'exact-figma-binding';
const NODE_ID_PATTERN = /^\d+:\d+$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function asNodeId(value) {
  return typeof value === 'string' && NODE_ID_PATTERN.test(value) ? value : null;
}

/**
 * Parse operator-supplied, comma-separated exact node IDs for a read-only
 * evidence run. This deliberately shares the same strict syntax as registry
 * bindings so a typo cannot silently broaden the evidence read.
 */
export function parseExactNodeIdsCsv(value) {
  assert(typeof value === 'string', '--node-ids requires a comma-separated list of exact Figma node IDs');
  const nodeIds = new Set();
  for (const rawValue of value.split(',')) {
    const candidate = rawValue.trim();
    const nodeId = asNodeId(candidate);
    assert(nodeId, `invalid Figma node ID in --node-ids: ${candidate || '<empty>'}`);
    nodeIds.add(nodeId);
  }
  assert(nodeIds.size > 0, '--node-ids requires at least one exact Figma node ID');
  return [...nodeIds].sort();
}

function collectNodeIdValues(value, result) {
  const nodeId = asNodeId(value);
  if (nodeId) {
    result.add(nodeId);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectNodeIdValues(item, result);
    return;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectNodeIdValues(item, result);
  }
}

export function collectExactBindingNodeIds(record) {
  assert(record?.classification === EXACT_BINDING, 'record is not an exact Figma binding');
  const figma = record.figma;
  assert(figma && typeof figma === 'object', `${record.id || '<unnamed>'}: missing figma binding`);

  const nodeIds = new Set();
  for (const field of ['pageId', 'canonicalMasterId', 'nodeId']) {
    const nodeId = asNodeId(figma[field]);
    assert(nodeId, `${record.id || '<unnamed>'}: invalid ${field}`);
    nodeIds.add(nodeId);
  }
  for (const field of ['viewportNodes', 'variantNodes', 'finalAssemblyNodes']) {
    if (Object.hasOwn(figma, field)) collectNodeIdValues(figma[field], nodeIds);
  }
  return [...nodeIds].sort();
}

export function collectRegistryExactBindingNodeIds(registry) {
  assert(registry?.authority?.fileKey, 'registry is missing authority.fileKey');
  const nodeIds = new Set();
  for (const record of registry.records || []) {
    if (record.classification !== EXACT_BINDING) continue;
    assert(
      record.figma?.fileKey === registry.authority.fileKey,
      `${record.id || '<unnamed>'}: exact binding belongs to a different Figma file`,
    );
    for (const nodeId of collectExactBindingNodeIds(record)) nodeIds.add(nodeId);
  }
  assert(nodeIds.size > 0, 'registry has no exact Figma binding node IDs');
  return [...nodeIds].sort();
}

export function splitIntoBatches(values, maxPerBatch = 40) {
  assert(Number.isInteger(maxPerBatch) && maxPerBatch > 0, 'maxPerBatch must be a positive integer');
  const batches = [];
  for (let index = 0; index < values.length; index += maxPerBatch) {
    batches.push(values.slice(index, index + maxPerBatch));
  }
  return batches;
}

export function buildFigmaAuthHeaders(token, tokenKind = 'pat') {
  assert(typeof token === 'string' && token.trim().length > 0, 'FIGMA_READ_TOKEN is required');
  if (tokenKind === 'pat' || tokenKind === 'plan') {
    return { 'X-Figma-Token': token };
  }
  if (tokenKind === 'oauth') {
    return { Authorization: `Bearer ${token}` };
  }
  throw new Error('FIGMA_READ_TOKEN_KIND must be pat, plan, or oauth');
}

export function buildCurrentFileUrl(fileKey) {
  assert(typeof fileKey === 'string' && fileKey.length > 0, 'fileKey is required');
  const url = new URL(`/v1/files/${encodeURIComponent(fileKey)}`, FIGMA_REST_ORIGIN);
  // Keep this request cheap: we need current-version metadata, not the entire
  // file JSON.  The version is intentionally omitted so Figma selects current.
  url.searchParams.set('depth', '1');
  return url;
}

export function buildCurrentNodesUrl(fileKey, nodeIds, revision) {
  assert(Array.isArray(nodeIds) && nodeIds.length > 0, 'nodeIds are required');
  assert(typeof revision === 'string' && revision.length > 0, 'revision is required');
  const url = new URL(`/v1/files/${encodeURIComponent(fileKey)}/nodes`, FIGMA_REST_ORIGIN);
  url.searchParams.set('ids', nodeIds.join(','));
  url.searchParams.set('depth', '1');
  // Pin every node validation to the version returned by the first read.  A
  // later live edit cannot silently become evidence for this crosswalk.
  url.searchParams.set('version', revision);
  return url;
}

async function readJson(response, operation) {
  if (!response?.ok) {
    const status = Number.isInteger(response?.status) ? response.status : 'unknown';
    throw new Error(`${operation} failed with HTTP ${status}`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error(`${operation} returned invalid JSON`);
  }
}

function resolveNodeSummary(requestedId, nodePayload) {
  const document = nodePayload?.document;
  assert(document && typeof document === 'object', `current Figma revision does not contain requested node ${requestedId}`);
  const id = asNodeId(document.id);
  assert(id === requestedId, `Figma node response mismatch for ${requestedId}`);
  return {
    id,
    type: typeof document.type === 'string' ? document.type : null,
  };
}

/**
 * Read current file metadata once, then validate every registered exact node
 * against that immutable version.  `fetchImpl` is injected for deterministic
 * unit tests; production passes globalThis.fetch.
 */
export async function readCurrentRevisionEvidence({
  fetchImpl,
  fileKey,
  nodeIds,
  token,
  tokenKind = 'pat',
  now = () => new Date().toISOString(),
  // 135 current registered nodes fit comfortably in one URL-sized batch. This
  // keeps the normal proof to three Tier-1 requests (R1, nodes, R2), which is
  // important for Figma Viewer/Collab plans with small monthly quotas.
  batchSize = 200,
}) {
  assert(typeof fetchImpl === 'function', 'fetch implementation is required');
  const headers = buildFigmaAuthHeaders(token, tokenKind);
  const metadataUrl = buildCurrentFileUrl(fileKey);
  const metadata = await readJson(
    await fetchImpl(metadataUrl, { method: 'GET', headers }),
    'Figma current file metadata read',
  );
  const revision = typeof metadata.version === 'string' ? metadata.version.trim() : '';
  assert(revision.length > 0, 'Figma current file metadata has no version');
  const lastModified = typeof metadata.lastModified === 'string' ? metadata.lastModified : null;
  assert(lastModified, 'Figma current file metadata has no lastModified');

  const requestedNodeIds = [...new Set(nodeIds || [])].sort();
  assert(requestedNodeIds.length > 0, 'at least one exact Figma node is required');
  for (const nodeId of requestedNodeIds) assert(asNodeId(nodeId), `invalid Figma node ID: ${nodeId}`);

  const resolvedNodes = [];
  const batchSummaries = [];
  for (const batch of splitIntoBatches(requestedNodeIds, batchSize)) {
    const nodesUrl = buildCurrentNodesUrl(fileKey, batch, revision);
    const nodesPayload = await readJson(
      await fetchImpl(nodesUrl, { method: 'GET', headers }),
      'Figma version-pinned node read',
    );
    const nodes = nodesPayload?.nodes;
    assert(nodes && typeof nodes === 'object', 'Figma version-pinned node read has no nodes map');
    for (const nodeId of batch) resolvedNodes.push(resolveNodeSummary(nodeId, nodes[nodeId]));
    batchSummaries.push({ count: batch.length, nodeIds: [...batch] });
  }

  // Confirm that the file did not advance while its version-pinned nodes were
  // being read.  This turns the evidence into a stable R1 -> nodes -> R2
  // window rather than attaching a new revision to an older Plugin API read.
  const finalMetadata = await readJson(
    await fetchImpl(metadataUrl, { method: 'GET', headers }),
    'Figma final current file metadata read',
  );
  const finalRevision = typeof finalMetadata.version === 'string' ? finalMetadata.version.trim() : '';
  assert(finalRevision.length > 0, 'Figma final current file metadata has no version');
  assert(
    finalRevision === revision,
    `Figma file advanced during node validation (${revision} -> ${finalRevision}); no evidence may be applied`,
  );

  return {
    kind: CURRENT_REVISION_EVIDENCE_KIND,
    schemaVersion: CURRENT_REVISION_EVIDENCE_SCHEMA,
    fileKey,
    currentRevision: revision,
    lastModified,
    fileName: typeof metadata.name === 'string' ? metadata.name : null,
    observedAt: now(),
    provenance: {
      source: 'figma-rest',
      readOnly: true,
      metadataEndpoint: 'GET /v1/files/:key?depth=1 (version omitted = current)',
      nodeEndpoint: 'GET /v1/files/:key/nodes?ids=...&depth=1&version=:currentRevision',
      stableReadWindow: 'R1 current revision -> version-pinned node reads -> R2 same current revision',
      tokenPersisted: false,
    },
    requestedNodeIds,
    resolvedNodes,
    nodeReadBatches: batchSummaries,
  };
}

export function validateRevisionEvidenceForRegistry(registry, evidence) {
  assert(registry?.authority?.fileKey, 'registry is missing authority.fileKey');
  assert(evidence?.kind === CURRENT_REVISION_EVIDENCE_KIND, 'unexpected revision evidence kind');
  assert(evidence?.schemaVersion === CURRENT_REVISION_EVIDENCE_SCHEMA, 'unexpected revision evidence schema');
  assert(evidence.fileKey === registry.authority.fileKey, 'revision evidence belongs to a different Figma file');
  assert(typeof evidence.currentRevision === 'string' && evidence.currentRevision.length > 0, 'revision evidence has no current revision');
  assert(typeof evidence.lastModified === 'string' && evidence.lastModified.length > 0, 'revision evidence has no lastModified');
  assert(typeof evidence.observedAt === 'string' && evidence.observedAt.length > 0, 'revision evidence has no observedAt');
  assert(evidence.provenance?.source === 'figma-rest' && evidence.provenance?.readOnly === true, 'revision evidence is not an official read-only REST read');
  const resolvedIds = new Set((evidence.resolvedNodes || []).map((node) => node?.id));
  for (const record of registry.records || []) {
    if (record.classification !== EXACT_BINDING) continue;
    for (const nodeId of collectExactBindingNodeIds(record)) {
      assert(resolvedIds.has(nodeId), `${record.id}: revision evidence did not resolve ${nodeId}`);
    }
  }
  return true;
}

/**
 * Update null current-revision fields (or attach missing proof to an equal
 * revision) in exact bindings. By default an adapter must never overwrite a
 * different non-null version: that would falsely claim an older Design Delta
 * was reviewed against a newer Figma file. A caller may opt into a rebase only
 * after it has performed one stable, official current-revision read covering
 * every exact binding and will atomically reconcile every dependent artifact.
 */
export function applyRevisionEvidenceToRegistry(
  registry,
  evidence,
  evidenceArtifact,
  { allowRevisionRebase = false } = {},
) {
  validateRevisionEvidenceForRegistry(registry, evidence);
  assert(typeof evidenceArtifact === 'string' && evidenceArtifact.length > 0, 'evidence artifact path is required');
  const next = JSON.parse(JSON.stringify(registry));
  const updatedRecordIds = [];
  const unchangedRecordIds = [];
  for (const record of next.records || []) {
    if (record.classification !== EXACT_BINDING) continue;
    const currentRevision = record.figma?.revision;
    if (currentRevision !== null && currentRevision !== evidence.currentRevision && !allowRevisionRebase) {
      throw new Error(`${record.id}: refuses to overwrite non-null revision ${currentRevision}`);
    }
    if (currentRevision === null || currentRevision === evidence.currentRevision || allowRevisionRebase) {
      const needsRevisionValue = currentRevision !== evidence.currentRevision;
      const hasCurrentEvidence = record.figma.revisionEvidence?.artifact === evidenceArtifact &&
        record.figma.revisionEvidence?.currentRevision === evidence.currentRevision &&
        record.figma.revisionEvidence?.source === evidence.provenance.source;
      if (needsRevisionValue) record.figma.revision = evidence.currentRevision;
      if (!hasCurrentEvidence) {
        record.figma.revisionEvidence = {
          artifact: evidenceArtifact,
          kind: evidence.kind,
          currentRevision: evidence.currentRevision,
          observedAt: evidence.observedAt,
          source: evidence.provenance.source,
        };
      }
      record.figma.revisionStatus = 'official-rest-current-version-node-verified';
      if (needsRevisionValue || !hasCurrentEvidence) updatedRecordIds.push(record.id);
      else unchangedRecordIds.push(record.id);
    }
  }
  return { registry: next, updatedRecordIds, unchangedRecordIds };
}
