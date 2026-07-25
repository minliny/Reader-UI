#!/usr/bin/env node
// Figma-first reading-chain gate.
//
// The original 2026-07-23 F0 crosswalk is deliberately retained as a
// historical null-revision snapshot.  It is not current visual authority.
// Current structural admission is instead derived from the single visual
// registry, the official read-only REST revision evidence, and the small
// reading-chain reconciliation that lists only fully resolved exact bindings.
//
// --baseline proves that provenance is structurally sound.  It never implies
// visual delivery and therefore exits zero even while delivery remains blocked.
// --strict is fail-closed on every current reading-chain delivery blocker.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectExactBindingNodeIds,
  validateRevisionEvidenceForRegistry,
} from './figma-current-revision-adapter-lib.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const workspaceRoot = path.resolve(repoRoot, '..');

function argumentValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

const baselineOnly = process.argv.includes('--baseline');
const strict = process.argv.includes('--strict') || !baselineOnly;
const selectedModes = ['--baseline', '--strict'].filter((flag) => process.argv.includes(flag));
const registryPath = path.resolve(argumentValue('--registry') || path.join(repoRoot, 'docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json'));
const evidencePath = path.resolve(argumentValue('--evidence') || path.join(repoRoot, 'docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json'));
const reconciliationPath = path.resolve(argumentValue('--reconciliation') || path.join(repoRoot, 'docs/design/handoffs/reading-chain/F0_CURRENT_BINDING_RECONCILIATION.json'));
const ledgerPath = path.resolve(argumentValue('--ledger') || path.join(repoRoot, 'docs/design/handoffs/reading-chain/FIGMA_DESIGN_DELTA_LEDGER.json'));
const legacyCrosswalkPath = path.join(repoRoot, 'docs/design/handoffs/reading-chain/F0_FIGMA_FIRST_CROSSWALK.json');
const legacyComponentInventoryPath = path.join(repoRoot, 'docs/design/handoffs/reading-chain/F0_ARKUI_FIGMA_COMPONENT_BINDINGS.json');
const historicalCatalogPath = path.join(repoRoot, 'docs/design/handoffs/reading-chain/F0_HISTORICAL_NODE_CATALOG.json');
const localAssetManifestPath = path.join(repoRoot, 'docs/design/handoffs/reading-chain/F0_LOCAL_ASSET_MANIFEST.json');
const registryVerifierPath = path.join(repoRoot, 'tools/design/verify-figma-visual-admission-registry.mjs');

function readJson(target, errors, label) {
  if (!fs.existsSync(target)) {
    errors.push(`missing ${label}: ${path.relative(repoRoot, target)}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch {
    errors.push(`invalid JSON for ${label}: ${path.relative(repoRoot, target)}`);
    return null;
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sameNodeSet(left, right) {
  return left.length === right.length && left.every((nodeId, index) => nodeId === right[index]);
}

function nodeIdsFrom(value) {
  const result = new Set();
  const visit = (candidate) => {
    if (typeof candidate === 'string' && /^\d+:\d+$/.test(candidate)) {
      result.add(candidate);
    } else if (Array.isArray(candidate)) {
      candidate.forEach(visit);
    } else if (isObject(candidate)) {
      Object.values(candidate).forEach(visit);
    }
  };
  visit(value);
  return [...result].sort();
}

function addRegisteredTarget(targets, registered) {
  for (const target of targets || []) {
    const file = String(target || '').split('#')[0].trim();
    if (file) registered.add(file);
  }
}

function runRegistryStructuralVerifier(errors) {
  const result = spawnSync(process.execPath, [registryVerifierPath, '--report'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || 'unknown registry verifier failure').trim().split('\n')[0];
    errors.push(`visual-admission registry is not structurally valid: ${detail}`);
  }
}

function validateLegacyInventoryAndAssetSources({ registry, inventory, historicalCatalog, assetManifest, errors }) {
  if (inventory?.kind !== 'ARKUI_FIGMA_COMPONENT_BINDING_MATRIX') {
    errors.push('unexpected historical ArkUI component inventory kind');
  }
  if (historicalCatalog?.kind !== 'FIGMA_READING_CHAIN_HISTORICAL_NODE_CATALOG') {
    errors.push('unexpected historical node catalog kind');
  }
  if (historicalCatalog?.summary?.currentPromotedBindings !== 0) {
    errors.push('historical node catalog may not promote bindings to current evidence');
  }
  if (assetManifest?.kind !== 'READING_CHAIN_LOCAL_ASSET_MANIFEST') {
    errors.push('unexpected local asset manifest kind');
  }
  if (assetManifest?.fileKey !== registry?.authority?.fileKey) {
    errors.push('local asset manifest Figma file key differs from current registry authority');
  }

  const registeredVisualFiles = new Set();
  for (const record of registry?.records || []) {
    addRegisteredTarget(record.local?.targets, registeredVisualFiles);
    addRegisteredTarget(record.harmony?.targets, registeredVisualFiles);
  }
  for (const component of inventory?.components || []) {
    if (component.arkui?.file) registeredVisualFiles.add(component.arkui.file);
    addRegisteredTarget(component.readerUi, registeredVisualFiles);
  }

  const visualSourceScans = [
    { file: 'Reader-for-HarmonyOS/entry/src/main/ets/ui/components/BookshelfComponents.ets', pattern: /DemoAliasTokens|\.shadow\(|bookshelf_icon_/ },
    { file: 'Reader-for-HarmonyOS/entry/src/main/ets/ui/components/BookDetailComponents.ets', pattern: /DemoAliasTokens|ui_icon_list_primary|\.borderRadius\(/ },
    { file: 'Reader-for-HarmonyOS/entry/src/main/ets/ui/components/ReaderComponents.ets', pattern: /DemoAliasTokens|reader_control_top_|\.shadow\(/ },
    { file: 'Reader-for-HarmonyOS/entry/src/main/ets/ui/components/ReaderOverlayComponents.ets', pattern: /DemoAliasTokens|ReaderControlFigmaTokens|reader_control_|\.shadow\(/ },
    { file: 'Reader-for-HarmonyOS/entry/src/main/ets/ui/components/ReaderControlIcon.ets', pattern: /reader_control_/ },
    { file: 'frontend-demo-optimized/renderers/d2-bookshelf-discover-renderers.js', pattern: /bookshelfV2|bookDetailV2/ },
    { file: 'frontend-demo-optimized/renderers/d3-control-layers-renderers.js', pattern: /readerControlShowV2|readerControlHideV2/ },
    { file: 'frontend-demo-optimized/styles/12-bookshelf-vc3.css', pattern: /./ },
    { file: 'frontend-demo-optimized/styles/02a-reader-control.css', pattern: /./ },
    { file: 'frontend-demo-optimized/styles/03c-reader-viewport.css', pattern: /./ },
  ];
  for (const scan of visualSourceScans) {
    const sourceRoot = scan.file.startsWith('Reader-for-HarmonyOS/') ? workspaceRoot : repoRoot;
    const sourcePath = path.join(sourceRoot, scan.file);
    if (!fs.existsSync(sourcePath)) {
      errors.push(`visual source scan target missing: ${scan.file}`);
    } else if (scan.pattern.test(fs.readFileSync(sourcePath, 'utf8')) && !registeredVisualFiles.has(scan.file)) {
      errors.push(`unregistered local visual source: ${scan.file}`);
    }
  }

  const manifestAssets = new Set((assetManifest?.assets || []).map((asset) => asset.resource));
  const assetReferenceSources = [
    'Reader-for-HarmonyOS/entry/src/main/ets/ui/components/BookshelfComponents.ets',
    'Reader-for-HarmonyOS/entry/src/main/ets/ui/components/BookDetailComponents.ets',
    'Reader-for-HarmonyOS/entry/src/main/ets/ui/components/ReaderComponents.ets',
    'Reader-for-HarmonyOS/entry/src/main/ets/ui/components/ReaderOverlayComponents.ets',
    'Reader-for-HarmonyOS/entry/src/main/ets/ui/components/ReaderControlIcon.ets',
  ];
  for (const file of assetReferenceSources) {
    const sourcePath = path.join(workspaceRoot, file);
    if (!fs.existsSync(sourcePath)) continue;
    const source = fs.readFileSync(sourcePath, 'utf8');
    for (const match of source.matchAll(/app\.media\.((?:reader_control_|bookshelf_icon_)[A-Za-z0-9_]+|ui_icon_list_primary)/g)) {
      if (!manifestAssets.has(match[1])) {
        errors.push(`local SVG used by reading chain is absent from manifest: ${match[1]}`);
      }
    }
  }
}

if (selectedModes.length > 1) {
  console.error(`FIGMA_FIRST_GATE: modes are mutually exclusive (${selectedModes.join(', ')})`);
  process.exitCode = 1;
} else {
  const errors = [];
  const blockers = [];
  const registry = readJson(registryPath, errors, 'visual-admission registry');
  const evidence = readJson(evidencePath, errors, 'official current-revision evidence');
  const reconciliation = readJson(reconciliationPath, errors, 'current reading-chain reconciliation');
  const ledger = readJson(ledgerPath, errors, 'Design Delta ledger');
  const legacyCrosswalk = readJson(legacyCrosswalkPath, errors, 'historical F0 crosswalk');
  const legacyComponentInventory = readJson(legacyComponentInventoryPath, errors, 'historical ArkUI component inventory');
  const historicalCatalog = readJson(historicalCatalogPath, errors, 'historical node catalog');
  const localAssetManifest = readJson(localAssetManifestPath, errors, 'local asset manifest');

  if (registry && evidence) {
    try {
      validateRevisionEvidenceForRegistry(registry, evidence);
    } catch (error) {
      errors.push(`official revision evidence is not valid for the registry: ${error.message}`);
    }
    runRegistryStructuralVerifier(errors);
  }

  if (legacyCrosswalk?.kind !== 'FIGMA_FIRST_READING_CHAIN_CROSSWALK') {
    errors.push('unexpected historical F0 crosswalk kind');
  } else if (legacyCrosswalk.authority?.currentRevision !== null) {
    errors.push('historical F0 crosswalk must not be repurposed as a current-revision source');
  }

  if (registry && reconciliation) {
    if (reconciliation.kind !== 'FIGMA_READING_CHAIN_CURRENT_BINDING_RECONCILIATION') {
      errors.push('unexpected current reading-chain reconciliation kind');
    }
    if (reconciliation.status !== 'CURRENT_REVISION_RECONCILED_DELIVERY_BLOCKED') {
      errors.push('current reconciliation must remain delivery-blocked');
    }
    if (reconciliation.authority?.fileKey !== registry.authority?.fileKey) {
      errors.push('current reconciliation Figma file key differs from registry authority');
    }
    if (reconciliation.authority?.currentRevision !== evidence?.currentRevision) {
      errors.push('current reconciliation revision differs from official evidence');
    }
    if (reconciliation.authority?.registry !== 'docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json' || reconciliation.authority?.revisionEvidence !== 'docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json') {
      errors.push('current reconciliation must cite the canonical registry and revision evidence artifacts');
    }
    if (reconciliation.legacyArtifacts?.['F0_FIGMA_FIRST_CROSSWALK.json']?.currentAuthority !== false) {
      errors.push('historical F0 crosswalk must be explicitly excluded from current authority');
    }
    const records = new Map((registry.records || []).map((record) => [record.id, record]));
    const resolvedNodes = new Set((evidence?.resolvedNodes || []).map((node) => node?.id));
    const seenBindings = new Set();
    if (!Array.isArray(reconciliation.currentBindings) || reconciliation.currentBindings.length === 0) {
      errors.push('current reconciliation has no exact bindings');
    }
    for (const binding of reconciliation.currentBindings || []) {
      const id = binding?.registryRecordId;
      const record = records.get(id);
      if (!id || seenBindings.has(id)) {
        errors.push(`current reconciliation has an unnamed or duplicate binding: ${id || '<unnamed>'}`);
        continue;
      }
      seenBindings.add(id);
      if (!record || record.classification !== 'exact-figma-binding') {
        errors.push(`${id}: current reconciliation must reference an exact registry binding`);
        continue;
      }
      if (record.figma?.revision !== evidence?.currentRevision) {
        errors.push(`${id}: registry binding revision is not the official current revision`);
      }
      const expectedNodes = collectExactBindingNodeIds(record).sort();
      const requiredNodes = nodeIdsFrom(binding.requiredNodes);
      if (!sameNodeSet(expectedNodes, requiredNodes)) {
        errors.push(`${id}: reconciled node set does not exactly match the registry page/master/node/viewport/variant/final assembly set`);
      }
      for (const nodeId of requiredNodes) {
        if (!resolvedNodes.has(nodeId)) errors.push(`${id}: official revision evidence does not resolve ${nodeId}`);
      }
      if (binding.deliveryStatus !== record.deliveryStatus) {
        errors.push(`${id}: reconciliation delivery status differs from registry`);
      }
      if (!String(record.deliveryStatus || '').startsWith('admitted-current-revision')) {
        blockers.push(`${id}=${record.deliveryStatus}`);
      }
    }
    if (!seenBindings.has('bookshelf.multi-select')) {
      errors.push('current reconciliation is missing the exact bookshelf.multi-select binding');
    }
    const historicalBindingsByNode = new Map(
      (legacyCrosswalk?.families || [])
        .flatMap((family) => family.bindings || [])
        .filter((binding) => binding.figmaNode)
        .map((binding) => [binding.figmaNode, binding]),
    );
    for (const example of reconciliation.unreconciledHistoricalChildBindings?.examples || []) {
      const nodeId = String(example).match(/\/(\s*)(\d+:\d+)$/)?.[2];
      if (nodeId && resolvedNodes.has(nodeId)) {
        errors.push(`historical child ${nodeId} is labeled unreconciled despite current evidence; reconcile it explicitly instead`);
      }
      const historicalBinding = historicalBindingsByNode.get(nodeId);
      if (!historicalBinding || historicalBinding.figma?.revision !== null) {
        errors.push(`historical child ${nodeId || '<unnamed>'} must remain a null-revision F0 binding until explicitly reconciled`);
      }
    }
  }

  if (ledger && registry && evidence) {
    if (ledger.kind !== 'FIGMA_FIRST_DESIGN_DELTA_LEDGER') {
      errors.push('unexpected Design Delta ledger kind');
    }
    if (ledger.status !== 'CURRENT_REVISION_PARTIALLY_RECONCILED_DELIVERY_BLOCKED') {
      errors.push('Design Delta ledger must remain partially reconciled and delivery-blocked');
    }
    if (ledger.fileKey !== registry.authority?.fileKey || ledger.currentRevision !== evidence.currentRevision) {
      errors.push('Design Delta ledger file key or current revision differs from official evidence');
    }
    if (ledger.currentRevisionEvidence !== 'docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json') {
      errors.push('Design Delta ledger must cite the official current-revision evidence artifact');
    }
    const pending = new Map((ledger.pendingCurrentReadEntries || []).map((entry) => [entry.id, entry]));
    const records = new Map((registry.records || []).map((record) => [record.id, record]));
    const resolvedNodes = new Set((evidence.resolvedNodes || []).map((node) => node?.id));
    if (!Array.isArray(ledger.reconciledCurrentReadEntries) || ledger.reconciledCurrentReadEntries.length === 0) {
      errors.push('Design Delta ledger has no current-revision reconciliations');
    }
    for (const entry of ledger.reconciledCurrentReadEntries || []) {
      const pendingEntry = pending.get(entry.pendingEntryId);
      const record = records.get(entry.registryRecordId);
      if (!pendingEntry || !record || record.classification !== 'exact-figma-binding') {
        errors.push(`Design Delta reconciliation ${entry.pendingEntryId || '<unnamed>'} lacks a pending entry or exact registry binding`);
        continue;
      }
      const declaredNodes = nodeIdsFrom({
        pageId: pendingEntry.pageId,
        canonicalMasterId: pendingEntry.canonicalMasterId,
        nodeId: pendingEntry.nodeId,
        variantNodes: pendingEntry.variantNodes,
        relatedNodeIds: pendingEntry.relatedNodeIds,
        contextNodes: pendingEntry.contextNodes,
      });
      const verifiedNodes = nodeIdsFrom(entry.verifiedNodeIds);
      if (!sameNodeSet(declaredNodes, verifiedNodes)) {
        errors.push(`Design Delta reconciliation ${entry.pendingEntryId}: verified nodes do not exactly match declared current nodes`);
      }
      for (const nodeId of verifiedNodes) {
        if (!resolvedNodes.has(nodeId)) errors.push(`Design Delta reconciliation ${entry.pendingEntryId}: official evidence does not resolve ${nodeId}`);
      }
      for (const nodeId of nodeIdsFrom(entry.unverifiedReferencedChildNodes)) {
        if (resolvedNodes.has(nodeId)) errors.push(`Design Delta reconciliation ${entry.pendingEntryId}: child ${nodeId} is evidence-resolved and must not remain silently unreconciled`);
      }
      if (entry.revision !== evidence.currentRevision || entry.revisionEvidence !== 'docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json') {
        errors.push(`Design Delta reconciliation ${entry.pendingEntryId}: revision provenance differs from official evidence`);
      }
      if (entry.frozen !== false || entry.deliveryStatus !== record.deliveryStatus) {
        errors.push(`Design Delta reconciliation ${entry.pendingEntryId}: may not freeze or promote delivery`);
      }
    }
  }

  validateLegacyInventoryAndAssetSources({
    registry,
    inventory: legacyComponentInventory,
    historicalCatalog,
    assetManifest: localAssetManifest,
    errors,
  });

  if (errors.length > 0) {
    for (const error of errors) console.error(`FIGMA_FIRST_GATE ERROR: ${error}`);
    process.exitCode = 1;
  }

  const mode = baselineOnly ? 'baseline' : 'strict';
  const structuralOutcome = errors.length === 0 ? 'manifest-valid' : 'manifest-invalid';
  const deliveryOutcome = blockers.length === 0 ? 'delivery-admitted' : 'delivery-blocked';
  const bindingCount = reconciliation?.currentBindings?.length || 0;
  const reconciledDeltaCount = ledger?.reconciledCurrentReadEntries?.length || 0;
  console.log(`FIGMA_FIRST_GATE ${mode}: ${structuralOutcome}; ${deliveryOutcome}`);
  console.log(`FIGMA_FIRST_GATE: currentBindings=${bindingCount} reconciledUnfrozenDeltas=${reconciledDeltaCount} deliveryBlockers=${blockers.length}`);

  if (strict && blockers.length > 0) {
    for (const blocker of blockers) console.error(`FIGMA_FIRST_GATE BLOCKED: ${blocker}`);
    process.exitCode = 1;
  }
}
