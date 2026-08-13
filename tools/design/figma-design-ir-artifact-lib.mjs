import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildFigmaDesignIr,
  canonicalFigmaDesignIrJson,
} from './figma-design-ir-lib.mjs';

export const FIGMA_DESIGN_IR_ARTIFACT_KIND = 'FIGMA_DESIGN_IR_ARTIFACT';
export const FIGMA_DESIGN_IR_ARTIFACT_SCHEMA_VERSION = '1.0.0';

const FIGMA_SOURCE_PLAN_KIND = 'FIGMA_SOURCE_PLAN';
const FIGMA_SOURCE_PLAN_SCHEMA_VERSION = '1.0.0';
const FIGMA_NODE_SNAPSHOT_KIND = 'FIGMA_NODE_SNAPSHOT';
const FIGMA_NODE_SNAPSHOT_SCHEMA_VERSION = '1.0.0';
const EXACT_FIGMA_BINDING = 'exact-figma-binding';
const NODE_ID_PATTERN = /^\d+:\d+$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireNonEmptyString(value, label) {
  assert(
    typeof value === 'string' && value.trim().length > 0,
    `${label} must be a non-empty string`,
  );
  return value.trim();
}

function requireNodeId(value, label) {
  const nodeId = requireNonEmptyString(value, label);
  assert(NODE_ID_PATTERN.test(nodeId), `${label} must be an exact Figma node ID`);
  return nodeId;
}

function parseJson(source, label) {
  assert(typeof source === 'string' && source.length > 0, `${label} bytes are required`);
  try {
    return JSON.parse(source);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

function sha256Bytes(source) {
  return crypto.createHash('sha256').update(source).digest('hex');
}

function sha256Canonical(value) {
  return crypto
    .createHash('sha256')
    .update(canonicalFigmaDesignIrJson(value))
    .digest('hex');
}

function sortedUnique(values, label) {
  const sorted = [...new Set(values)].sort(compareStrings);
  assert(sorted.length === values.length, `${label} contains duplicate entries`);
  return sorted;
}

function collectExactNodeIds(value, result) {
  if (typeof value === 'string') {
    if (NODE_ID_PATTERN.test(value)) result.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectExactNodeIds(item, result);
    return;
  }
  if (isPlainObject(value)) {
    for (const item of Object.values(value)) collectExactNodeIds(item, result);
  }
}

function parseSourcePlan(source) {
  const plan = parseJson(source, 'Figma source plan');
  assert(plan?.kind === FIGMA_SOURCE_PLAN_KIND, 'unexpected Figma source plan kind');
  assert(
    plan.schemaVersion === FIGMA_SOURCE_PLAN_SCHEMA_VERSION,
    'unexpected Figma source plan schema version',
  );
  assert(plan.classification === EXACT_FIGMA_BINDING, 'source plan is not exact-binding only');

  const fileKey = requireNonEmptyString(plan.source?.fileKey, 'source plan fileKey');
  const revision = requireNonEmptyString(plan.source?.revision, 'source plan revision');
  assert(
    typeof plan.registrySha256 === 'string' && SHA256_PATTERN.test(plan.registrySha256),
    'source plan registrySha256 must be a SHA-256 digest',
  );
  assert(Array.isArray(plan.records) && plan.records.length > 0, 'source plan has no records');
  assert(
    Number.isInteger(plan.recordCount) && plan.recordCount === plan.records.length,
    'source plan recordCount does not match records',
  );

  const recordIds = new Set();
  const projectedNodeIds = new Set();
  for (const record of plan.records) {
    const recordId = requireNonEmptyString(record?.recordId, 'source plan recordId');
    assert(!recordIds.has(recordId), `duplicate source plan recordId: ${recordId}`);
    recordIds.add(recordId);
    assert(record.fileKey === fileKey, `${recordId}: source plan cross-file drift`);
    assert(record.revision === revision, `${recordId}: source plan cross-revision drift`);
    requireNodeId(record.canonicalMasterId, `${recordId}.canonicalMasterId`);
    requireNodeId(record.nodeId, `${recordId}.nodeId`);
    collectExactNodeIds(
      {
        canonicalMasterId: record.canonicalMasterId,
        nodeId: record.nodeId,
        viewportNodeIds: record.viewportNodeIds,
        variantNodeIds: record.variantNodeIds,
      },
      projectedNodeIds,
    );
  }

  assert(Array.isArray(plan.nodeIds?.all) && plan.nodeIds.all.length > 0, 'source plan nodeIds.all is empty');
  const nodeIds = plan.nodeIds.all.map((nodeId, index) =>
    requireNodeId(nodeId, `source plan nodeIds.all[${index}]`));
  const sortedNodeIds = sortedUnique(nodeIds, 'source plan nodeIds.all');
  assert(
    JSON.stringify(nodeIds) === JSON.stringify(sortedNodeIds),
    'source plan nodeIds.all must be deterministically sorted',
  );
  assert(
    JSON.stringify(sortedNodeIds) === JSON.stringify([...projectedNodeIds].sort(compareStrings)),
    'source plan nodeIds.all does not exactly match record identities',
  );

  return {
    plan,
    fileKey,
    revision,
    nodeIds: sortedNodeIds,
    planSha256: sha256Bytes(source),
  };
}

function addClaim(claimsByNodeId, nodeIdValue, recordId, role) {
  if (nodeIdValue === null || nodeIdValue === undefined) return;
  const nodeId = requireNodeId(nodeIdValue, `${recordId}.${role}`);
  let recordClaims = claimsByNodeId.get(nodeId);
  if (!recordClaims) {
    recordClaims = new Map();
    claimsByNodeId.set(nodeId, recordClaims);
  }
  let roles = recordClaims.get(recordId);
  if (!roles) {
    roles = new Set();
    recordClaims.set(recordId, roles);
  }
  roles.add(role);
}

function collectBindingClaims(plan, expectedNodeIds) {
  const claimsByNodeId = new Map();
  for (const record of plan.records) {
    const recordId = record.recordId;
    addClaim(claimsByNodeId, record.canonicalMasterId, recordId, 'canonical');
    addClaim(claimsByNodeId, record.nodeId, recordId, 'root');

    for (const viewport of ['phone', 'tablet']) {
      addClaim(
        claimsByNodeId,
        record.viewportNodeIds?.[viewport],
        recordId,
        `viewport.${viewport}`,
      );
    }

    for (const variantId of Object.keys(record.variantNodeIds || {}).sort(compareStrings)) {
      const variant = record.variantNodeIds[variantId];
      if (typeof variant === 'string') {
        addClaim(claimsByNodeId, variant, recordId, `variant.${variantId}`);
        continue;
      }
      assert(
        variant === null || isPlainObject(variant),
        `${recordId}.variantNodeIds.${variantId} must be a node ID or viewport map`,
      );
      for (const viewport of ['phone', 'tablet']) {
        addClaim(
          claimsByNodeId,
          variant?.[viewport],
          recordId,
          `variant.${variantId}.${viewport}`,
        );
      }
    }
  }

  assert(
    JSON.stringify([...claimsByNodeId.keys()].sort(compareStrings)) === JSON.stringify(expectedNodeIds),
    'binding claims do not exactly cover source plan nodeIds.all',
  );
  return claimsByNodeId;
}

function snapshotDocument(nodeId, value, label) {
  assert(isPlainObject(value), `${label} must be an object`);
  if (value.responseKind !== undefined) {
    assert(value.responseKind === 'document', `${nodeId}: snapshot responseKind is not document`);
  }
  if (value.nodeId !== undefined) {
    assert(value.nodeId === nodeId, `${nodeId}: snapshot wrapper nodeId drift`);
  }
  if (value.error !== undefined) {
    assert(value.error === null, `${nodeId}: snapshot contains a node error`);
  }

  const document = isPlainObject(value.document)
    ? value.document
    : value.id === nodeId && typeof value.type === 'string'
      ? value
      : null;
  assert(document !== null, `${nodeId}: snapshot node has no document`);
  assert(document.id === nodeId, `${nodeId}: snapshot document id drift`);
  if (value.subtreeSha256 !== undefined) {
    assert(
      typeof value.subtreeSha256 === 'string' &&
        SHA256_PATTERN.test(value.subtreeSha256) &&
        value.subtreeSha256 === sha256Canonical(document),
      `${nodeId}: snapshot subtree SHA drift`,
    );
  }
  return document;
}

function snapshotNodeMap(snapshot) {
  const result = new Map();
  const add = (nodeIdValue, value, label) => {
    const nodeId = requireNodeId(nodeIdValue, `${label}.nodeId`);
    assert(!result.has(nodeId), `duplicate snapshot node: ${nodeId}`);
    result.set(nodeId, snapshotDocument(nodeId, value, label));
  };

  if (Array.isArray(snapshot.nodes)) {
    for (let index = 0; index < snapshot.nodes.length; index += 1) {
      const value = snapshot.nodes[index];
      assert(isPlainObject(value), `snapshot.nodes[${index}] must be an object`);
      const nodeId = value.nodeId ?? value.document?.id ?? value.id;
      add(nodeId, value, `snapshot.nodes[${index}]`);
    }
    return result;
  }

  assert(isPlainObject(snapshot.nodes), 'snapshot.nodes must be an array or node map');
  for (const nodeId of Object.keys(snapshot.nodes).sort(compareStrings)) {
    add(nodeId, snapshot.nodes[nodeId], `snapshot.nodes.${nodeId}`);
  }
  return result;
}

function parseSnapshot(source, parsedPlan) {
  const snapshot = parseJson(source, 'Figma node snapshot');
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

  if (snapshot.nodeIds !== undefined) {
    assert(Array.isArray(snapshot.nodeIds), 'snapshot.nodeIds must be an array');
    assert(
      JSON.stringify(snapshot.nodeIds) === JSON.stringify(parsedPlan.nodeIds),
      'Figma node snapshot requested-node drift',
    );
  }

  const nodeMap = snapshotNodeMap(snapshot);
  const resolvedNodeIds = [...nodeMap.keys()].sort(compareStrings);
  assert(
    JSON.stringify(resolvedNodeIds) === JSON.stringify(parsedPlan.nodeIds),
    'Figma node snapshot documents do not exactly match source plan nodes',
  );
  if (snapshot.nodeCount !== undefined) {
    assert(
      Number.isInteger(snapshot.nodeCount) && snapshot.nodeCount === nodeMap.size,
      'Figma node snapshot nodeCount drift',
    );
  }

  const semanticSnapshotHash = sha256Canonical({
    fileKey: parsedPlan.fileKey,
    revision: parsedPlan.revision,
    nodes: Object.fromEntries(
      resolvedNodeIds.map((nodeId) => [nodeId, nodeMap.get(nodeId)]),
    ),
  });
  return { snapshot, nodeMap, semanticSnapshotHash };
}

function projectedClaims(recordClaims) {
  const claims = [...recordClaims.entries()]
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([recordId, roles]) => ({
      recordId,
      roles: [...roles].sort(compareStrings),
    }));
  return {
    claims,
    recordIds: claims.map((claim) => claim.recordId),
    roles: [...new Set(claims.flatMap((claim) => claim.roles))].sort(compareStrings),
  };
}

export function buildFigmaDesignIrArtifact({
  sourcePlanSource,
  snapshotSource,
  sourcePlanArtifact = 'generated/figma/FIGMA_SOURCE_PLAN.json',
  snapshotArtifact = 'generated/figma/FIGMA_NODE_SNAPSHOT.json',
}) {
  const parsedPlan = parseSourcePlan(sourcePlanSource);
  const parsedSnapshot = parseSnapshot(snapshotSource, parsedPlan);
  const claimsByNodeId = collectBindingClaims(parsedPlan.plan, parsedPlan.nodeIds);

  const bindings = parsedPlan.nodeIds.map((rootId) => {
    const ir = buildFigmaDesignIr({
      document: parsedSnapshot.nodeMap.get(rootId),
      fileKey: parsedPlan.fileKey,
      revision: parsedPlan.revision,
      rootId,
    });
    const claims = projectedClaims(claimsByNodeId.get(rootId));
    return {
      rootId,
      subtreeHash: ir.subtreeHash,
      roles: claims.roles,
      recordIds: claims.recordIds,
      claims: claims.claims,
      ir,
    };
  });

  const content = {
    kind: FIGMA_DESIGN_IR_ARTIFACT_KIND,
    schemaVersion: FIGMA_DESIGN_IR_ARTIFACT_SCHEMA_VERSION,
    sourcePlan: {
      artifact: sourcePlanArtifact,
      sha256: parsedPlan.planSha256,
      registrySha256: parsedPlan.plan.registrySha256,
    },
    sourceSnapshot: {
      artifact: snapshotArtifact,
      semanticSha256: parsedSnapshot.semanticSnapshotHash,
    },
    source: {
      fileKey: parsedPlan.fileKey,
      revision: parsedPlan.revision,
    },
    bindingCount: bindings.length,
    bindings,
  };
  return {
    ...content,
    artifactHash: sha256Canonical(content),
  };
}

export function validateFigmaDesignIrArtifact(artifact) {
  assert(
    artifact?.kind === FIGMA_DESIGN_IR_ARTIFACT_KIND,
    'unexpected Figma Design IR artifact kind',
  );
  assert(
    artifact.schemaVersion === FIGMA_DESIGN_IR_ARTIFACT_SCHEMA_VERSION,
    'unexpected Figma Design IR artifact schema version',
  );
  assert(Array.isArray(artifact.bindings), 'Figma Design IR bindings must be an array');
  assert(
    artifact.bindingCount === artifact.bindings.length,
    'Figma Design IR bindingCount drift',
  );
  assert(
    SHA256_PATTERN.test(artifact.sourcePlan?.sha256 || '') &&
      SHA256_PATTERN.test(artifact.sourcePlan?.registrySha256 || '') &&
      SHA256_PATTERN.test(artifact.sourceSnapshot?.semanticSha256 || ''),
    'Figma Design IR provenance hashes must be SHA-256 digests',
  );
  const rootIds = artifact.bindings.map((binding) => binding.rootId);
  assert(
    JSON.stringify(rootIds) === JSON.stringify(sortedUnique(rootIds, 'Figma Design IR rootIds')),
    'Figma Design IR bindings must be sorted by rootId',
  );
  for (const binding of artifact.bindings) {
    requireNodeId(binding.rootId, 'Figma Design IR binding rootId');
    assert(binding.ir?.rootId === binding.rootId, `${binding.rootId}: embedded IR root drift`);
    assert(
      binding.ir?.fileKey === artifact.source?.fileKey &&
        binding.ir?.revision === artifact.source?.revision,
      `${binding.rootId}: embedded IR source drift`,
    );
    assert(
      binding.subtreeHash === binding.ir?.subtreeHash &&
        SHA256_PATTERN.test(binding.subtreeHash || ''),
      `${binding.rootId}: embedded IR subtree hash drift`,
    );
    assert(
      JSON.stringify(binding.roles) === JSON.stringify(sortedUnique(binding.roles, `${binding.rootId}.roles`)),
      `${binding.rootId}: roles must be sorted`,
    );
    assert(
      JSON.stringify(binding.recordIds) ===
        JSON.stringify(sortedUnique(binding.recordIds, `${binding.rootId}.recordIds`)),
      `${binding.rootId}: recordIds must be sorted`,
    );
    assert(Array.isArray(binding.claims), `${binding.rootId}: claims must be an array`);
    const claimedRecordIds = [];
    const claimedRoles = new Set();
    for (const claim of binding.claims) {
      const recordId = requireNonEmptyString(claim?.recordId, `${binding.rootId}.claim.recordId`);
      claimedRecordIds.push(recordId);
      assert(Array.isArray(claim.roles), `${binding.rootId}.${recordId}.roles must be an array`);
      assert(
        JSON.stringify(claim.roles) ===
          JSON.stringify(sortedUnique(claim.roles, `${binding.rootId}.${recordId}.roles`)),
        `${binding.rootId}.${recordId}: claim roles must be sorted`,
      );
      for (const role of claim.roles) claimedRoles.add(role);
    }
    assert(
      JSON.stringify(claimedRecordIds) === JSON.stringify(binding.recordIds),
      `${binding.rootId}: claim recordIds drift`,
    );
    assert(
      JSON.stringify([...claimedRoles].sort(compareStrings)) === JSON.stringify(binding.roles),
      `${binding.rootId}: aggregate roles drift`,
    );
  }
  const { artifactHash, ...content } = artifact;
  assert(
    artifactHash === sha256Canonical(content),
    'Figma Design IR artifact hash drift',
  );
  return true;
}

export function renderFigmaDesignIrArtifact(artifact) {
  validateFigmaDesignIrArtifact(artifact);
  return `${JSON.stringify(artifact, null, 2)}\n`;
}

export function parseFigmaDesignIrArgs(argv) {
  assert(Array.isArray(argv), 'argv must be an array');
  let mode = 'check';
  let explicitMode = null;
  let planPath = null;
  let snapshotPath = null;
  let outputPath = null;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--check' || argument === '--write') {
      assert(explicitMode === null, '--check and --write are mutually exclusive');
      explicitMode = argument;
      mode = argument.slice(2);
    } else if (
      argument === '--plan' ||
      argument === '--snapshot' ||
      argument === '--output'
    ) {
      const value = argv[index + 1];
      assert(
        typeof value === 'string' && value.length > 0 && !value.startsWith('--'),
        `${argument} requires a path`,
      );
      if (argument === '--plan') planPath = value;
      else if (argument === '--snapshot') snapshotPath = value;
      else outputPath = value;
      index += 1;
    } else if (argument === '--help' || argument === '-h') {
      help = true;
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }
  return { mode, planPath, snapshotPath, outputPath, help };
}

export function figmaDesignIrUsage() {
  return `Usage:
  node tools/design/generate-figma-design-ir.mjs [--check]
  node tools/design/generate-figma-design-ir.mjs --write

Options:
  --check             Compare with generated/figma/FIGMA_DESIGN_IR.json (default).
  --write             Atomically write generated/figma/FIGMA_DESIGN_IR.json.
  --plan <path>       Override generated/figma/FIGMA_SOURCE_PLAN.json.
  --snapshot <path>   Override generated/figma/FIGMA_NODE_SNAPSHOT.json.
  --output <path>     Override generated/figma/FIGMA_DESIGN_IR.json.
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

function repositoryRelative(repoRoot, target, label) {
  const relative = path.relative(repoRoot, path.resolve(target));
  assert(
    relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative),
    `${label} must remain inside the Reader-UI repository`,
  );
  return relative.split(path.sep).join('/');
}

export function runFigmaDesignIrCli({
  argv,
  repoRoot,
  stdout = process.stdout,
}) {
  const options = parseFigmaDesignIrArgs(argv);
  if (options.help) {
    stdout.write(figmaDesignIrUsage());
    return { mode: 'help', changed: false };
  }

  const planPath = path.resolve(
    options.planPath || path.join(repoRoot, 'generated/figma/FIGMA_SOURCE_PLAN.json'),
  );
  const snapshotPath = path.resolve(
    options.snapshotPath || path.join(repoRoot, 'generated/figma/FIGMA_NODE_SNAPSHOT.json'),
  );
  const outputPath = path.resolve(
    options.outputPath || path.join(repoRoot, 'generated/figma/FIGMA_DESIGN_IR.json'),
  );
  const planArtifact = repositoryRelative(repoRoot, planPath, 'source plan');
  const snapshotArtifact = repositoryRelative(repoRoot, snapshotPath, 'node snapshot');
  const outputArtifact = repositoryRelative(repoRoot, outputPath, 'Design IR output');
  assert(fs.existsSync(planPath), `source plan not found: ${planArtifact}`);
  assert(fs.existsSync(snapshotPath), `node snapshot not found: ${snapshotArtifact}`);

  const artifact = buildFigmaDesignIrArtifact({
    sourcePlanSource: fs.readFileSync(planPath, 'utf8'),
    snapshotSource: fs.readFileSync(snapshotPath, 'utf8'),
    sourcePlanArtifact: planArtifact,
    snapshotArtifact,
  });
  const rendered = renderFigmaDesignIrArtifact(artifact);

  if (options.mode === 'write') {
    atomicWrite(outputPath, rendered);
    stdout.write(
      `wrote ${outputArtifact}: ${artifact.bindingCount} deduplicated exact-node IR bindings at revision ${artifact.source.revision}\n`,
    );
    return { mode: 'write', changed: true, artifact };
  }

  assert(fs.existsSync(outputPath), `missing ${outputArtifact}; run with --write`);
  assert(
    fs.readFileSync(outputPath, 'utf8') === rendered,
    `stale ${outputArtifact}; run with --write`,
  );
  stdout.write(
    `Figma Design IR current: ${artifact.bindingCount} deduplicated exact-node bindings at revision ${artifact.source.revision}\n`,
  );
  return { mode: 'check', changed: false, artifact };
}
