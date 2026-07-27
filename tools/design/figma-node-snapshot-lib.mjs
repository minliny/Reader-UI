import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildCurrentFileUrl,
  buildFigmaAuthHeaders,
  FIGMA_REST_ORIGIN,
  splitIntoBatches,
} from './figma-current-revision-adapter-lib.mjs';

export const FIGMA_NODE_SNAPSHOT_KIND = 'FIGMA_NODE_SNAPSHOT';
export const FIGMA_NODE_SNAPSHOT_SCHEMA_VERSION = '1.0.0';

const FIGMA_SOURCE_PLAN_KIND = 'FIGMA_SOURCE_PLAN';
const FIGMA_SOURCE_PLAN_SCHEMA_VERSION = '1.0.0';
const EXACT_FIGMA_BINDING = 'exact-figma-binding';
const NODE_ID_PATTERN = /^\d+:\d+$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requireNonEmptyString(value, label) {
  assert(typeof value === 'string' && value.trim().length > 0, `${label} must be a non-empty string`);
  return value;
}

function requireNodeId(value, label) {
  const nodeId = requireNonEmptyString(value, label);
  assert(NODE_ID_PATTERN.test(nodeId), `${label} must be an exact Figma node ID`);
  return nodeId;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonicalJsonValue(value, label = 'JSON value') {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    assert(Number.isFinite(value), `${label} contains a non-finite number`);
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => canonicalJsonValue(item, `${label}[${index}]`));
  }
  assert(value && typeof value === 'object', `${label} contains a non-JSON value`);
  return Object.fromEntries(
    Object.keys(value)
      .sort(compareStrings)
      .map((key) => [key, canonicalJsonValue(value[key], `${label}.${key}`)]),
  );
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalJsonValue(value));
}

export function figmaSourcePlanSha256(source) {
  assert(typeof source === 'string', 'source plan bytes must be a string');
  return sha256(source);
}

function collectNodeIds(value, result) {
  if (typeof value === 'string' && NODE_ID_PATTERN.test(value)) {
    result.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectNodeIds(item, result);
    return;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectNodeIds(item, result);
  }
}

function parseJson(source, label) {
  assert(typeof source === 'string' && source.length > 0, `${label} bytes are required`);
  try {
    return JSON.parse(source);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/**
 * Validate the generated source plan as an immutable, exact-node input.
 *
 * `nodeIds.all` is not trusted on its own: it must be sorted, unique, and
 * exactly equal to the identities projected by every exact binding record.
 */
export function parseFigmaSourcePlan(source) {
  const plan = parseJson(source, 'Figma source plan');
  assert(plan?.kind === FIGMA_SOURCE_PLAN_KIND, 'unexpected Figma source plan kind');
  assert(
    plan.schemaVersion === FIGMA_SOURCE_PLAN_SCHEMA_VERSION,
    'unexpected Figma source plan schema version',
  );
  assert(plan.classification === EXACT_FIGMA_BINDING, 'source plan is not exact-binding only');
  const fileKey = requireNonEmptyString(plan.source?.fileKey, 'source plan fileKey');
  const revision = requireNonEmptyString(plan.source?.revision, 'source plan revision');
  assert(Array.isArray(plan.records) && plan.records.length > 0, 'source plan has no exact binding records');
  assert(
    Number.isInteger(plan.recordCount) && plan.recordCount === plan.records.length,
    'source plan recordCount does not match records',
  );

  const projectedNodeIds = new Set();
  for (const record of plan.records) {
    assert(record?.fileKey === fileKey, `${record?.recordId || '<unnamed>'}: source plan cross-file drift`);
    assert(record?.revision === revision, `${record?.recordId || '<unnamed>'}: source plan cross-revision drift`);
    requireNodeId(record.canonicalMasterId, `${record?.recordId || '<unnamed>'}.canonicalMasterId`);
    requireNodeId(record.nodeId, `${record?.recordId || '<unnamed>'}.nodeId`);
    for (const field of [
      record.canonicalMasterId,
      record.nodeId,
      record.viewportNodeIds,
      record.variantNodeIds,
    ]) {
      collectNodeIds(field, projectedNodeIds);
    }
  }

  assert(Array.isArray(plan.nodeIds?.all) && plan.nodeIds.all.length > 0, 'source plan nodeIds.all is empty');
  const requestedNodeIds = plan.nodeIds.all.map((nodeId, index) =>
    requireNodeId(nodeId, `source plan nodeIds.all[${index}]`));
  const sortedUniqueNodeIds = [...new Set(requestedNodeIds)].sort(compareStrings);
  assert(
    requestedNodeIds.length === sortedUniqueNodeIds.length,
    'source plan nodeIds.all contains duplicate node IDs',
  );
  assert(
    JSON.stringify(requestedNodeIds) === JSON.stringify(sortedUniqueNodeIds),
    'source plan nodeIds.all must be deterministically sorted',
  );
  assert(
    JSON.stringify(sortedUniqueNodeIds) === JSON.stringify([...projectedNodeIds].sort(compareStrings)),
    'source plan nodeIds.all does not exactly match its binding records',
  );

  return {
    plan,
    fileKey,
    revision,
    requestedNodeIds,
    planSha256: figmaSourcePlanSha256(source),
  };
}

/**
 * Full-subtree node reads intentionally omit `depth`. Supplying `depth=1`
 * would reproduce the old evidence-only summary and silently truncate the
 * visible component graph.
 */
export function buildVersionPinnedNodesUrl(fileKey, nodeIds, revision) {
  requireNonEmptyString(fileKey, 'fileKey');
  requireNonEmptyString(revision, 'revision');
  assert(Array.isArray(nodeIds) && nodeIds.length > 0, 'nodeIds are required');
  const exactNodeIds = nodeIds.map((nodeId, index) => requireNodeId(nodeId, `nodeIds[${index}]`));
  assert(new Set(exactNodeIds).size === exactNodeIds.length, 'nodeIds must be unique within a batch');
  const url = new URL(`/v1/files/${encodeURIComponent(fileKey)}/nodes`, FIGMA_REST_ORIGIN);
  url.searchParams.set('ids', exactNodeIds.join(','));
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

async function safeFetchJson(fetchImpl, url, options, operation) {
  try {
    return await readJson(await fetchImpl(url, options), operation);
  } catch (error) {
    if (error instanceof Error &&
        (error.message.startsWith(`${operation} failed with HTTP `) ||
         error.message === `${operation} returned invalid JSON`)) {
      throw error;
    }
    // Never forward a transport implementation's message: it could serialize
    // request headers and expose FIGMA_READ_TOKEN.
    throw new Error(`${operation} network request failed`);
  }
}

function metadataRevision(metadata, operation) {
  const revision = typeof metadata?.version === 'string' ? metadata.version.trim() : '';
  assert(revision.length > 0, `${operation} has no version`);
  return revision;
}

function projectNodeResponse(nodeId, rawNode) {
  if (rawNode === null || rawNode === undefined) {
    return {
      nodeId,
      responseKind: 'null',
      document: null,
      error: null,
      subtreeSha256: null,
    };
  }
  if (!rawNode || typeof rawNode !== 'object' || Array.isArray(rawNode)) {
    return {
      nodeId,
      responseKind: 'error',
      document: null,
      error: canonicalJsonValue({ message: 'malformed per-node response' }),
      subtreeSha256: null,
    };
  }

  const document = rawNode.document && typeof rawNode.document === 'object' && !Array.isArray(rawNode.document)
    ? canonicalJsonValue(rawNode.document, `Figma node ${nodeId} document`)
    : null;
  const hasError = rawNode.error !== null && rawNode.error !== undefined;
  if (hasError) {
    return {
      nodeId,
      responseKind: 'error',
      document,
      error: canonicalJsonValue(rawNode.error, `Figma node ${nodeId} error`),
      subtreeSha256: document === null ? null : sha256(canonicalJson(document)),
    };
  }
  if (document === null) {
    return {
      nodeId,
      responseKind: 'null',
      document: null,
      error: null,
      subtreeSha256: null,
    };
  }
  return {
    nodeId,
    responseKind: 'document',
    document,
    error: null,
    subtreeSha256: sha256(canonicalJson(document)),
  };
}

export function projectFigmaNodeResponse(nodeId, rawNode) {
  return projectNodeResponse(requireNodeId(nodeId, 'nodeId'), rawNode);
}

function validateResolvedNodeResponses(nodeResponses) {
  const failures = [];
  for (const node of nodeResponses) {
    if (node.responseKind !== 'document') {
      failures.push(`${node.nodeId}:${node.responseKind}`);
      continue;
    }
    if (node.document?.id !== node.nodeId) {
      failures.push(`${node.nodeId}:document-id-mismatch`);
      continue;
    }
    if (!SHA256_PATTERN.test(node.subtreeSha256 || '')) {
      failures.push(`${node.nodeId}:missing-subtree-sha`);
    }
  }
  assert(
    failures.length === 0,
    `Figma full-subtree read failed closed for ${failures.join(', ')}`,
  );
}

/**
 * Execute one stable R1 -> version-pinned full-subtree reads -> R2 window.
 *
 * This function has no filesystem writes. `fetchImpl` is injected so the
 * complete network contract can be tested without contacting Figma.
 */
export async function readVersionPinnedFigmaNodeSnapshot({
  fetchImpl,
  sourcePlanSource,
  token,
  tokenKind = 'pat',
  batchSize = 40,
  sourcePlanArtifact = 'generated/figma/FIGMA_SOURCE_PLAN.json',
}) {
  assert(typeof fetchImpl === 'function', 'fetch implementation is required');
  assert(Number.isInteger(batchSize) && batchSize > 0, 'batchSize must be a positive integer');
  const {
    fileKey,
    revision: planRevision,
    requestedNodeIds,
    planSha256,
  } = parseFigmaSourcePlan(sourcePlanSource);
  const headers = buildFigmaAuthHeaders(token, tokenKind);
  const metadataUrl = buildCurrentFileUrl(fileKey);

  const firstMetadata = await safeFetchJson(
    fetchImpl,
    metadataUrl,
    { method: 'GET', headers },
    'Figma R1 current file metadata read',
  );
  const firstRevision = metadataRevision(firstMetadata, 'Figma R1 current file metadata');
  assert(
    firstRevision === planRevision,
    `Figma R1 revision ${firstRevision} does not match source plan revision ${planRevision}`,
  );
  const lastModified = requireNonEmptyString(
    firstMetadata.lastModified,
    'Figma R1 current file lastModified',
  );

  const nodeResponses = [];
  const requestBatches = [];
  for (const batch of splitIntoBatches(requestedNodeIds, batchSize)) {
    const nodesUrl = buildVersionPinnedNodesUrl(fileKey, batch, planRevision);
    assert(!nodesUrl.searchParams.has('depth'), 'full-subtree node URL must not contain depth');
    const payload = await safeFetchJson(
      fetchImpl,
      nodesUrl,
      { method: 'GET', headers },
      'Figma version-pinned full-subtree node read',
    );
    assert(payload?.nodes && typeof payload.nodes === 'object' && !Array.isArray(payload.nodes),
      'Figma version-pinned full-subtree node read has no nodes map');
    for (const nodeId of batch) nodeResponses.push(projectNodeResponse(nodeId, payload.nodes[nodeId]));
    requestBatches.push({ nodeIds: [...batch], count: batch.length });
  }

  // Read R2 even when one requested node is null/error. That preserves the
  // stable-window diagnosis, while validation below still prevents a snapshot
  // from being accepted or written.
  const secondMetadata = await safeFetchJson(
    fetchImpl,
    metadataUrl,
    { method: 'GET', headers },
    'Figma R2 current file metadata read',
  );
  const secondRevision = metadataRevision(secondMetadata, 'Figma R2 current file metadata');
  assert(
    secondRevision === planRevision,
    `Figma revision advanced during full-subtree read (${planRevision} -> ${secondRevision})`,
  );
  validateResolvedNodeResponses(nodeResponses);

  return {
    kind: FIGMA_NODE_SNAPSHOT_KIND,
    schemaVersion: FIGMA_NODE_SNAPSHOT_SCHEMA_VERSION,
    sourcePlan: {
      artifact: sourcePlanArtifact,
      sha256: planSha256,
    },
    source: {
      fileKey,
      revision: planRevision,
      fileName: typeof firstMetadata.name === 'string' ? firstMetadata.name : null,
      lastModified,
    },
    provenance: {
      source: 'figma-rest',
      readOnly: true,
      tokenPersisted: false,
      stableReadWindow: 'R1 current revision equals plan -> version-pinned full-subtree node reads -> R2 same revision',
      metadataEndpoint: 'GET /v1/files/:key?depth=1 (version omitted = current)',
      nodeEndpoint: 'GET /v1/files/:key/nodes?ids=...&version=:revision (depth omitted = full subtree)',
    },
    nodeCount: requestedNodeIds.length,
    nodeIds: [...requestedNodeIds],
    requestBatches,
    nodes: nodeResponses,
  };
}

export function validateFigmaNodeSnapshot(snapshot, sourcePlanSource) {
  const parsedPlan = parseFigmaSourcePlan(sourcePlanSource);
  assert(snapshot?.kind === FIGMA_NODE_SNAPSHOT_KIND, 'unexpected Figma node snapshot kind');
  assert(
    snapshot.schemaVersion === FIGMA_NODE_SNAPSHOT_SCHEMA_VERSION,
    'unexpected Figma node snapshot schema version',
  );
  assert(
    snapshot.sourcePlan?.sha256 === parsedPlan.planSha256,
    'Figma node snapshot source-plan SHA drift',
  );
  assert(snapshot.source?.fileKey === parsedPlan.fileKey, 'Figma node snapshot fileKey drift');
  assert(snapshot.source?.revision === parsedPlan.revision, 'Figma node snapshot revision drift');
  assert(
    JSON.stringify(snapshot.nodeIds) === JSON.stringify(parsedPlan.requestedNodeIds),
    'Figma node snapshot requested-node drift',
  );
  assert(snapshot.nodeCount === parsedPlan.requestedNodeIds.length, 'Figma node snapshot nodeCount drift');
  assert(Array.isArray(snapshot.nodes) && snapshot.nodes.length === snapshot.nodeCount,
    'Figma node snapshot node payload count drift');
  validateResolvedNodeResponses(snapshot.nodes);
  for (let index = 0; index < snapshot.nodes.length; index += 1) {
    const node = snapshot.nodes[index];
    assert(node.nodeId === snapshot.nodeIds[index], `Figma node snapshot order drift at ${node.nodeId}`);
    assert(
      node.subtreeSha256 === sha256(canonicalJson(node.document)),
      `${node.nodeId}: Figma node snapshot subtree SHA drift`,
    );
  }
  return true;
}

export function renderFigmaNodeSnapshot(snapshot) {
  assert(snapshot?.kind === FIGMA_NODE_SNAPSHOT_KIND, 'unexpected Figma node snapshot kind');
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

export function parseFigmaNodeSnapshotArgs(argv) {
  assert(Array.isArray(argv), 'argv must be an array');
  let mode = 'check';
  let explicitMode = null;
  let planPath = null;
  let outputPath = null;
  let batchSize = 40;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--check' || argument === '--write') {
      assert(explicitMode === null, '--check and --write are mutually exclusive');
      explicitMode = argument;
      mode = argument.slice(2);
    } else if (argument === '--plan' || argument === '--output' || argument === '--batch-size') {
      const value = argv[index + 1];
      assert(
        typeof value === 'string' && value.length > 0 && !value.startsWith('--'),
        `${argument} requires a value`,
      );
      if (argument === '--plan') planPath = value;
      else if (argument === '--output') outputPath = value;
      else {
        batchSize = Number(value);
        assert(Number.isInteger(batchSize) && batchSize > 0, '--batch-size must be a positive integer');
      }
      index += 1;
    } else if (argument === '--help' || argument === '-h') {
      help = true;
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }
  return { mode, planPath, outputPath, batchSize, help };
}

export function figmaNodeSnapshotUsage() {
  return `Usage:
  FIGMA_READ_TOKEN=... node tools/design/fetch-figma-node-snapshot.mjs [--check]
  FIGMA_READ_TOKEN=... node tools/design/fetch-figma-node-snapshot.mjs --write

Environment:
  FIGMA_READ_TOKEN       Required. Read only from the environment and never persisted or printed.
  FIGMA_READ_TOKEN_KIND  pat (default), plan, or oauth.

Options:
  --check               Read a stable version-pinned snapshot and compare it with the generated file (default).
  --write               Atomically write generated/figma/FIGMA_NODE_SNAPSHOT.json.
  --plan <path>         Override generated/figma/FIGMA_SOURCE_PLAN.json.
  --output <path>       Override generated/figma/FIGMA_NODE_SNAPSHOT.json.
  --batch-size <count>  Exact node IDs per REST request (default: 40).
`;
}

function atomicWrite(target, source) {
  const directory = path.dirname(target);
  fs.mkdirSync(directory, { recursive: true });
  const temporary = path.join(directory, `.${path.basename(target)}.${process.pid}.tmp`);
  try {
    fs.writeFileSync(temporary, source, 'utf8');
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function repositoryRelative(repoRoot, target) {
  const relative = path.relative(repoRoot, path.resolve(target));
  assert(relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative),
    'snapshot inputs and outputs must remain inside the Reader-UI repository');
  return relative.split(path.sep).join('/');
}

export async function runFigmaNodeSnapshotCli({
  argv,
  repoRoot,
  env = process.env,
  fetchImpl = globalThis.fetch,
  stdout = process.stdout,
}) {
  const options = parseFigmaNodeSnapshotArgs(argv);
  if (options.help) {
    stdout.write(figmaNodeSnapshotUsage());
    return { mode: 'help', changed: false };
  }

  const planPath = path.resolve(
    options.planPath || path.join(repoRoot, 'generated/figma/FIGMA_SOURCE_PLAN.json'),
  );
  const outputPath = path.resolve(
    options.outputPath || path.join(repoRoot, 'generated/figma/FIGMA_NODE_SNAPSHOT.json'),
  );
  const planArtifact = repositoryRelative(repoRoot, planPath);
  repositoryRelative(repoRoot, outputPath);
  assert(fs.existsSync(planPath), `source plan not found: ${planArtifact}`);
  const token = env.FIGMA_READ_TOKEN;
  assert(typeof token === 'string' && token.length > 0,
    'FIGMA_READ_TOKEN is not configured; no network request was made');

  const sourcePlanBefore = fs.readFileSync(planPath, 'utf8');
  const sourcePlanShaBefore = figmaSourcePlanSha256(sourcePlanBefore);
  const snapshot = await readVersionPinnedFigmaNodeSnapshot({
    fetchImpl,
    sourcePlanSource: sourcePlanBefore,
    token,
    tokenKind: env.FIGMA_READ_TOKEN_KIND || 'pat',
    batchSize: options.batchSize,
    sourcePlanArtifact: planArtifact,
  });
  const sourcePlanAfter = fs.readFileSync(planPath, 'utf8');
  assert(
    figmaSourcePlanSha256(sourcePlanAfter) === sourcePlanShaBefore && sourcePlanAfter === sourcePlanBefore,
    'Figma source plan changed during the stable node-read window; no snapshot may be accepted',
  );
  validateFigmaNodeSnapshot(snapshot, sourcePlanAfter);
  const rendered = renderFigmaNodeSnapshot(snapshot);

  if (options.mode === 'write') {
    atomicWrite(outputPath, rendered);
    stdout.write(
      `wrote ${repositoryRelative(repoRoot, outputPath)}: ${snapshot.nodeCount} full-subtree nodes at revision ${snapshot.source.revision}\n`,
    );
    return { mode: 'write', changed: true, snapshot };
  }

  assert(
    fs.existsSync(outputPath),
    `missing ${repositoryRelative(repoRoot, outputPath)}; run with --write`,
  );
  assert(
    fs.readFileSync(outputPath, 'utf8') === rendered,
    `stale ${repositoryRelative(repoRoot, outputPath)}; run with --write`,
  );
  stdout.write(
    `Figma node snapshot current: ${snapshot.nodeCount} full-subtree nodes at revision ${snapshot.source.revision}\n`,
  );
  return { mode: 'check', changed: false, snapshot };
}

export function redactFigmaReadToken(message, token) {
  const text = String(message);
  if (typeof token !== 'string' || token.length === 0) return text;
  return text.split(token).join('[REDACTED]');
}
