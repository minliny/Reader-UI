import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const FIGMA_SOURCE_PLAN_KIND = 'FIGMA_SOURCE_PLAN';
export const FIGMA_SOURCE_PLAN_SCHEMA_VERSION = '1.0.0';
export const EXACT_FIGMA_BINDING = 'exact-figma-binding';
export const EXPECTED_EXACT_BINDING_COUNT = 30;

const NODE_ID_PATTERN = /^\d+:\d+$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requireNonEmptyString(value, label) {
  assert(value !== null, `${label} must not be null`);
  assert(typeof value === 'string' && value.trim().length > 0, `${label} must be a non-empty string`);
  return value;
}

function requireNodeId(value, label) {
  const nodeId = requireNonEmptyString(value, label);
  assert(NODE_ID_PATTERN.test(nodeId), `${label} must be an exact Figma node ID`);
  return nodeId;
}

function requireUniqueStringArray(value, label) {
  assert(value !== null, `${label} must not be null`);
  assert(Array.isArray(value), `${label} must be an array`);
  const result = [];
  const seen = new Set();
  for (const candidate of value) {
    const item = requireNonEmptyString(candidate, `${label} entry`);
    assert(!seen.has(item), `${label} contains a duplicate entry: ${item}`);
    seen.add(item);
    result.push(item);
  }
  return result.sort(compareStrings);
}

function parseRegistry(registrySource) {
  assert(typeof registrySource === 'string' && registrySource.length > 0, 'registry source is required');
  try {
    return JSON.parse(registrySource);
  } catch {
    throw new Error('registry source is not valid JSON');
  }
}

export function registrySha256(registrySource) {
  assert(typeof registrySource === 'string', 'registry source must be a string');
  return crypto.createHash('sha256').update(registrySource).digest('hex');
}

export function exactFigmaBindingRecords(registry) {
  assert(registry && typeof registry === 'object' && !Array.isArray(registry), 'registry must be an object');
  assert(Array.isArray(registry.records), 'registry.records must be an array');
  return registry.records.filter((record) => record?.classification === EXACT_FIGMA_BINDING);
}

function requireViewportNodeIds(figma, recordId, allowNull) {
  assert(
    figma.viewportNodes && typeof figma.viewportNodes === 'object' && !Array.isArray(figma.viewportNodes),
    `${recordId}.viewportNodes must be an object`,
  );
  const phoneValue = figma.viewportNodes.phone;
  const tabletValue = figma.viewportNodes.tablet;
  if (allowNull && phoneValue === null && tabletValue === null) {
    return { phone: null, tablet: null };
  }
  assert(
    !allowNull || (phoneValue !== null && tabletValue !== null),
    `${recordId}.viewportNodes must provide both Phone and Tablet or neither`,
  );
  return {
    phone: requireNodeId(phoneValue, `${recordId}.viewportNodes.phone`),
    tablet: requireNodeId(tabletValue, `${recordId}.viewportNodes.tablet`),
  };
}

function requireVariantNodeIds(figma, recordId, routeIds, surfaceType) {
  if (surfaceType !== 'route-variant-family' && surfaceType !== 'overlay-state-family') return {};
  assert(routeIds.length > 0, `${recordId}: ${surfaceType} requires at least one routeId`);
  assert(
    figma.variantNodes && typeof figma.variantNodes === 'object' && !Array.isArray(figma.variantNodes),
    `${recordId}.variantNodes must be an object`,
  );
  const variantKeys = Object.keys(figma.variantNodes).sort(compareStrings);
  assert(
    JSON.stringify(variantKeys) === JSON.stringify(routeIds),
    `${recordId}.variantNodes keys must exactly match routeIds`,
  );

  return Object.fromEntries(routeIds.map((routeId) => {
    const value = figma.variantNodes[routeId];
    if (surfaceType === 'overlay-state-family') {
      return [routeId, requireNodeId(value, `${recordId}.variantNodes.${routeId}`)];
    }
    assert(
      value && typeof value === 'object' && !Array.isArray(value),
      `${recordId}.variantNodes.${routeId} must provide Phone and Tablet`,
    );
    return [routeId, {
      phone: requireNodeId(value.phone, `${recordId}.variantNodes.${routeId}.phone`),
      tablet: requireNodeId(value.tablet, `${recordId}.variantNodes.${routeId}.tablet`),
    }];
  }));
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

/**
 * Build the immutable input plan consumed by Figma-led HarmonyOS work.
 *
 * The source bytes, rather than a reserialized registry object, are hashed so
 * whitespace or ordering changes remain visible. Only exact bindings enter the
 * plan. Missing viewport identity is never inferred from a root node.
 */
export function buildFigmaSourcePlan({
  registrySource,
  expectedExactBindingCount = EXPECTED_EXACT_BINDING_COUNT,
}) {
  const registry = parseRegistry(registrySource);
  assert(registry.kind === 'FIGMA_VISUAL_ADMISSION_REGISTRY', 'unexpected registry kind');
  const authorityFileKey = requireNonEmptyString(registry.authority?.fileKey, 'registry authority.fileKey');
  const exactRecords = exactFigmaBindingRecords(registry);
  assert(
    exactRecords.length === expectedExactBindingCount,
    `expected ${expectedExactBindingCount} exact Figma bindings, found ${exactRecords.length}`,
  );

  const recordIds = new Set();
  const rootNodeIds = new Set();
  const viewportNodeIds = new Set();
  const variantNodeIds = new Set();
  let sourceFileKey;
  let sourceRevision;

  const records = exactRecords.map((record) => {
    const recordId = requireNonEmptyString(record?.id, 'exact binding recordId');
    assert(!recordIds.has(recordId), `duplicate exact binding recordId: ${recordId}`);
    recordIds.add(recordId);
    const surfaceType = requireNonEmptyString(record.surfaceType, `${recordId}.surfaceType`);

    const figma = record?.figma;
    assert(figma && typeof figma === 'object' && !Array.isArray(figma), `${recordId}: figma binding is required`);
    const fileKey = requireNonEmptyString(figma.fileKey, `${recordId}.fileKey`);
    assert(fileKey === authorityFileKey, `${recordId}: Figma file differs from registry authority`);
    if (sourceFileKey === undefined) sourceFileKey = fileKey;
    assert(fileKey === sourceFileKey, `${recordId}: cross-file exact binding conflict`);

    const revision = requireNonEmptyString(figma.revision, `${recordId}.revision`);
    if (sourceRevision === undefined) sourceRevision = revision;
    assert(revision === sourceRevision, `${recordId}: cross-revision exact binding conflict`);

    const canonicalMasterId = requireNodeId(figma.canonicalMasterId, `${recordId}.canonicalMasterId`);
    const nodeId = requireNodeId(figma.nodeId, `${recordId}.nodeId`);
    const routeIds = requireUniqueStringArray(record.routeIds, `${recordId}.routeIds`);
    const usesRouteVariants = surfaceType === 'route-variant-family';
    const usesOverlayStates = surfaceType === 'overlay-state-family';
    const viewportNodeIdsForRecord = requireViewportNodeIds(
      figma,
      recordId,
      usesRouteVariants || usesOverlayStates,
    );
    const variantNodeIdsForRecord = requireVariantNodeIds(figma, recordId, routeIds, surfaceType);
    const deliveryStatus = requireNonEmptyString(record.deliveryStatus, `${recordId}.deliveryStatus`);
    assert(
      record.harmony && typeof record.harmony === 'object' && !Array.isArray(record.harmony),
      `${recordId}.harmony must be an object`,
    );
    const harmonyTargets = requireUniqueStringArray(record.harmony.targets, `${recordId}.harmony.targets`);

    rootNodeIds.add(canonicalMasterId);
    rootNodeIds.add(nodeId);
    collectNodeIds(viewportNodeIdsForRecord, viewportNodeIds);
    collectNodeIds(variantNodeIdsForRecord, variantNodeIds);

    return {
      recordId,
      surfaceType,
      routeIds,
      fileKey,
      revision,
      canonicalMasterId,
      nodeId,
      viewportNodeIds: viewportNodeIdsForRecord,
      variantNodeIds: variantNodeIdsForRecord,
      deliveryStatus,
      harmonyTargets,
    };
  }).sort((left, right) => compareStrings(left.recordId, right.recordId));

  const roots = [...rootNodeIds].sort(compareStrings);
  const viewports = [...viewportNodeIds].sort(compareStrings);
  const variants = [...variantNodeIds].sort(compareStrings);
  const all = [...new Set([...roots, ...viewports, ...variants])].sort(compareStrings);

  return {
    kind: FIGMA_SOURCE_PLAN_KIND,
    schemaVersion: FIGMA_SOURCE_PLAN_SCHEMA_VERSION,
    registrySha256: registrySha256(registrySource),
    classification: EXACT_FIGMA_BINDING,
    source: {
      fileKey: sourceFileKey,
      revision: sourceRevision,
    },
    recordCount: records.length,
    records,
    nodeIds: {
      roots,
      viewports,
      variants,
      all,
    },
  };
}

export function renderFigmaSourcePlan(plan) {
  assert(plan?.kind === FIGMA_SOURCE_PLAN_KIND, 'unexpected source plan kind');
  return `${JSON.stringify(plan, null, 2)}\n`;
}

export function parseFigmaSourcePlanArgs(argv) {
  assert(Array.isArray(argv), 'argv must be an array');
  let mode = 'check';
  let explicitMode = null;
  let registryPath = null;
  let outputPath = null;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--check' || argument === '--write') {
      assert(explicitMode === null, '--check and --write are mutually exclusive');
      explicitMode = argument;
      mode = argument.slice(2);
    } else if (argument === '--registry' || argument === '--output') {
      const value = argv[index + 1];
      assert(typeof value === 'string' && value.length > 0 && !value.startsWith('--'), `${argument} requires a path`);
      if (argument === '--registry') registryPath = value;
      else outputPath = value;
      index += 1;
    } else if (argument === '--help' || argument === '-h') {
      help = true;
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }

  return { mode, registryPath, outputPath, help };
}

export function figmaSourcePlanUsage() {
  return `Usage:
  node tools/design/generate-figma-source-plan.mjs [--check]
  node tools/design/generate-figma-source-plan.mjs --write

Options:
  --check            Compare with generated/figma/FIGMA_SOURCE_PLAN.json (default).
  --write            Atomically write generated/figma/FIGMA_SOURCE_PLAN.json.
  --registry <path>  Override the visual-admission registry path.
  --output <path>    Override the generated source-plan path.
`;
}

function atomicWrite(target, rendered) {
  const directory = path.dirname(target);
  fs.mkdirSync(directory, { recursive: true });
  const temporary = path.join(directory, `.${path.basename(target)}.${process.pid}.tmp`);
  try {
    fs.writeFileSync(temporary, rendered, 'utf8');
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

export function runFigmaSourcePlanCli({
  argv,
  repoRoot,
  stdout = process.stdout,
}) {
  const options = parseFigmaSourcePlanArgs(argv);
  if (options.help) {
    stdout.write(figmaSourcePlanUsage());
    return { mode: 'help', changed: false };
  }

  const registryPath = path.resolve(
    options.registryPath || path.join(repoRoot, 'docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json'),
  );
  const outputPath = path.resolve(
    options.outputPath || path.join(repoRoot, 'generated/figma/FIGMA_SOURCE_PLAN.json'),
  );
  assert(fs.existsSync(registryPath), `registry not found: ${registryPath}`);

  const registrySource = fs.readFileSync(registryPath, 'utf8');
  const plan = buildFigmaSourcePlan({ registrySource });
  const rendered = renderFigmaSourcePlan(plan);

  if (options.mode === 'write') {
    atomicWrite(outputPath, rendered);
    stdout.write(`wrote ${outputPath}: ${plan.recordCount} exact bindings, ${plan.nodeIds.all.length} nodes\n`);
    return { mode: 'write', changed: true, plan };
  }

  assert(fs.existsSync(outputPath), `missing ${outputPath}; run with --write`);
  assert(fs.readFileSync(outputPath, 'utf8') === rendered, `stale ${outputPath}; run with --write`);
  stdout.write(`Figma source plan current: ${plan.recordCount} exact bindings, ${plan.nodeIds.all.length} nodes\n`);
  return { mode: 'check', changed: false, plan };
}
