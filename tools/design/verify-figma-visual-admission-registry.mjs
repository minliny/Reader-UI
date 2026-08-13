#!/usr/bin/env node
// Single-source visual admission gate. It intentionally separates a known
// Figma node from an approved current visual delivery: a null current revision
// can make the registry structurally valid, but it never admits visual delivery.
//
// Modes:
//   --report   structural report only; delivery blockers are printed but do not
//              change the exit code. This is safe for recurring integrity CI.
//   --baseline / --strict
//              fail closed on every delivery blocker. These modes must remain
//              red until all routes are classified and delivery evidence closes.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
function argumentValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

const registryPath = path.resolve(argumentValue('--registry') || path.join(repoRoot, 'docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json'));
const routeSchemaPath = path.resolve(argumentValue('--route-schema') || path.join(repoRoot, 'contracts/route.schema.json'));
const reportOnly = process.argv.includes('--report');
const baselineOnly = process.argv.includes('--baseline');
const selectedModes = ['--report', '--baseline', '--strict'].filter((flag) => process.argv.includes(flag));
const allowedClassifications = new Set([
  'exact-figma-binding',
  'figma-absent-fail-closed',
  'figma-unbound-fail-closed',
  'retired',
]);

function fail(errors, message) {
  errors.push(message);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const nodeIdPattern = /^\d+:\d+$/;

function collectNodeIds(value, result) {
  if (typeof value === 'string' && nodeIdPattern.test(value)) {
    result.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectNodeIds(item, result);
    return;
  }
  if (isObject(value)) {
    for (const item of Object.values(value)) collectNodeIds(item, result);
  }
}

function revisionEvidenceFor(record, figma, evidenceCache, errors) {
  const metadata = figma.revisionEvidence;
  if (!isObject(metadata) || typeof metadata.artifact !== 'string' || !metadata.artifact) {
    fail(errors, `${record.id}: non-null revision lacks revisionEvidence artifact`);
    return null;
  }
  const evidencePath = path.resolve(repoRoot, metadata.artifact);
  if (!evidencePath.startsWith(`${repoRoot}${path.sep}`)) {
    fail(errors, `${record.id}: revisionEvidence artifact is outside the repository`);
    return null;
  }
  if (!evidenceCache.has(evidencePath)) {
    if (!fs.existsSync(evidencePath)) {
      fail(errors, `${record.id}: revisionEvidence artifact is missing`);
      evidenceCache.set(evidencePath, null);
    } else {
      try {
        evidenceCache.set(evidencePath, JSON.parse(fs.readFileSync(evidencePath, 'utf8')));
      } catch {
        fail(errors, `${record.id}: revisionEvidence artifact is invalid JSON`);
        evidenceCache.set(evidencePath, null);
      }
    }
  }
  const evidence = evidenceCache.get(evidencePath);
  if (!evidence) return null;
  if (
    evidence.kind !== 'FIGMA_CURRENT_REVISION_EVIDENCE' ||
    evidence.schemaVersion !== '1.0.0' ||
    evidence.fileKey !== figma.fileKey ||
    evidence.currentRevision !== figma.revision ||
    typeof evidence.lastModified !== 'string' ||
    typeof evidence.observedAt !== 'string' ||
    evidence.provenance?.source !== 'figma-rest' ||
    evidence.provenance?.readOnly !== true
  ) {
    fail(errors, `${record.id}: revisionEvidence artifact does not prove this official current revision`);
    return null;
  }
  const resolvedNodeIds = new Set((evidence.resolvedNodes || []).map((node) => node?.id));
  const expectedNodeIds = new Set();
  for (const field of ['pageId', 'canonicalMasterId', 'nodeId', 'viewportNodes', 'variantNodes', 'finalAssemblyNodes']) {
    collectNodeIds(figma[field], expectedNodeIds);
  }
  for (const nodeId of expectedNodeIds) {
    if (!resolvedNodeIds.has(nodeId)) {
      fail(errors, `${record.id}: revisionEvidence did not resolve ${nodeId}`);
    }
  }
  return evidence;
}

if (selectedModes.length > 1) {
  console.error(`FIGMA_VISUAL_ADMISSION_GATE: modes are mutually exclusive (${selectedModes.join(', ')})`);
  process.exitCode = 1;
} else if (!fs.existsSync(registryPath) || !fs.existsSync(routeSchemaPath)) {
  const missing = !fs.existsSync(registryPath) ? registryPath : routeSchemaPath;
  console.error(`FIGMA_VISUAL_ADMISSION_GATE: missing ${path.relative(repoRoot, missing)}`);
  process.exitCode = 1;
} else {
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const routeSchema = JSON.parse(fs.readFileSync(routeSchemaPath, 'utf8'));
  const errors = [];
  const blockers = [];
  const revisionEvidenceCache = new Map();
  const routeIds = new Set(routeSchema?.properties?.id?.enum || []);
  const coveredRouteIds = new Set();
  const seenIds = new Set();
  const summary = {
    exact: 0,
    figmaAbsent: 0,
    figmaUnbound: 0,
    retired: 0,
    currentRevisionBlocked: 0,
    enforcementBlocked: 0,
  };

  if (registry.kind !== 'FIGMA_VISUAL_ADMISSION_REGISTRY') {
    fail(errors, 'unexpected registry kind');
  }
  if (!registry.authority?.fileKey) fail(errors, 'missing authority fileKey');
  if (!Array.isArray(registry.records) || registry.records.length === 0) {
    fail(errors, 'records must be a non-empty array');
  }
  if (registry.routeInventory?.expectedRouteCount !== routeIds.size) {
    fail(errors, `route inventory count differs from route.schema.json (${registry.routeInventory?.expectedRouteCount} != ${routeIds.size})`);
  }

  for (const record of registry.records || []) {
    const label = record.id || '<unnamed>';
    if (!record.id || seenIds.has(record.id)) fail(errors, `${label}: id is missing or duplicated`);
    seenIds.add(record.id);
    if (!allowedClassifications.has(record.classification)) {
      fail(errors, `${label}: invalid classification ${record.classification}`);
      continue;
    }
    if (!Array.isArray(record.routeIds)) fail(errors, `${label}: routeIds must be an array`);
    for (const routeId of record.routeIds || []) {
      if (!routeIds.has(routeId)) fail(errors, `${label}: unknown route ${routeId}`);
      else coveredRouteIds.add(routeId);
    }
    if (!record.deliveryStatus) fail(errors, `${label}: missing deliveryStatus`);
    if (!isObject(record.local) || !Array.isArray(record.local.targets) || !record.local.status) {
      fail(errors, `${label}: local mapping must name status and targets`);
    }
    if (!isObject(record.harmony) || !Array.isArray(record.harmony.targets) || !record.harmony.status) {
      fail(errors, `${label}: Harmony mapping must name status and targets`);
    }
    if (!Array.isArray(record.evidence) || record.evidence.length === 0) {
      fail(errors, `${label}: evidence must be explicit`);
    }

    const figma = record.figma;
    if (!isObject(figma) || figma.fileKey !== registry.authority?.fileKey || !Object.hasOwn(figma || {}, 'revision') || !figma.revisionStatus || !isObject(figma.viewportNodes)) {
      fail(errors, `${label}: incomplete Figma file/page/master/node/viewport/revision record`);
      continue;
    }

    if (record.classification === 'exact-figma-binding') {
      summary.exact += 1;
      if (!figma.pageId || !figma.canonicalMasterId || !figma.nodeId) {
        fail(errors, `${label}: exact binding lacks page/master/node`);
      }
      if (record.surfaceType === 'responsive-page-master') {
        if (!figma.viewportNodes.phone || !figma.viewportNodes.tablet) {
          fail(errors, `${label}: responsive page master lacks Phone/Tablet variant nodes`);
        }
        if (!isObject(figma.finalAssemblyNodes) || !figma.finalAssemblyNodes.phone || !figma.finalAssemblyNodes.tablet) {
          fail(errors, `${label}: responsive page master lacks final Phone/Tablet assembly evidence`);
        }
      }
      if (typeof figma.revision !== 'string' || figma.revision.trim().length === 0) {
        summary.currentRevisionBlocked += 1;
        blockers.push(`${label}=current-revision-unavailable`);
      } else {
        revisionEvidenceFor(record, figma, revisionEvidenceCache, errors);
      }
      if (!String(record.deliveryStatus).startsWith('admitted-current-revision')) {
        blockers.push(`${label}=${record.deliveryStatus}`);
      }
    } else if (record.classification === 'figma-absent-fail-closed' || record.classification === 'figma-unbound-fail-closed') {
      if (record.classification === 'figma-absent-fail-closed') summary.figmaAbsent += 1;
      else summary.figmaUnbound += 1;
      if (figma.nodeId !== null) {
        fail(errors, `${label}: ${record.classification} record must use nodeId=null`);
      }
      if (record.local.status !== 'enforced-fail-closed' || record.harmony.status !== 'enforced-fail-closed') {
        summary.enforcementBlocked += 1;
        blockers.push(`${label}=${record.classification}-enforcement-open`);
      }
    } else {
      summary.retired += 1;
      if (figma.nodeId !== null) fail(errors, `${label}: retired record must use nodeId=null`);
      if (record.local.status !== 'enforced-retired' || record.harmony.status !== 'enforced-retired') {
        summary.enforcementBlocked += 1;
        blockers.push(`${label}=retirement-enforcement-open`);
      }
    }
  }

  const unclassifiedRoutes = [...routeIds].filter((routeId) => !coveredRouteIds.has(routeId));
  if (unclassifiedRoutes.length > 0) {
    blockers.push(`route-inventory/unclassified=${unclassifiedRoutes.length}`);
  }
  if (errors.length > 0) {
    for (const error of errors) console.error(`FIGMA_VISUAL_ADMISSION_GATE ERROR: ${error}`);
    process.exitCode = 1;
  }

  const mode = reportOnly ? 'report' : baselineOnly ? 'baseline' : 'strict';
  const structuralOutcome = errors.length > 0 ? 'structural-invalid' : 'structural-valid';
  const deliveryOutcome = blockers.length > 0 ? 'delivery-blocked' : 'delivery-admitted';
  console.log(`FIGMA_VISUAL_ADMISSION_GATE ${mode}: ${structuralOutcome}; ${deliveryOutcome}`);
  console.log(
    `FIGMA_VISUAL_ADMISSION_GATE: records=${registry.records?.length || 0} exact=${summary.exact} figmaAbsent=${summary.figmaAbsent} figmaUnbound=${summary.figmaUnbound} retired=${summary.retired} coveredRoutes=${coveredRouteIds.size}/${routeIds.size} unclassifiedRoutes=${unclassifiedRoutes.length} revisionBlocked=${summary.currentRevisionBlocked} enforcementBlocked=${summary.enforcementBlocked}`
  );

  // The report mode proves that the registry itself is parseable and complete
  // enough to describe its known records. It deliberately does not certify
  // visual delivery. Baseline and strict both remain fail-closed: a structurally
  // valid JSON file is not useful delivery evidence if an unbound route, unknown
  // current revision, or unenforced withdrawal can still reach a visible renderer.
  if (blockers.length > 0) {
    for (const blocker of blockers) console.error(`FIGMA_VISUAL_ADMISSION_GATE BLOCKED: ${blocker}`);
    if (!reportOnly) process.exitCode = 1;
  }
}
