#!/usr/bin/env node
// Read and optionally apply official Figma current-version provenance.
//
// Default: one read-only REST probe and JSON evidence to stdout.
// --apply: writes the evidence artifact and updates only null revisions in the
//           visual-admission registry. It never writes to Figma.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyRevisionEvidenceToRegistry,
  collectRegistryExactBindingNodeIds,
  parseExactNodeIdsCsv,
  readCurrentRevisionEvidence,
} from './figma-current-revision-adapter-lib.mjs';
import {
  finalizeReadingChainRevision,
} from './figma-current-revision-finalize-lib.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const defaultRegistryPath = path.join(repoRoot, 'docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json');
const defaultEvidencePath = path.join(repoRoot, 'docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json');
const apply = process.argv.includes('--apply');
const finalizeReadingChain = process.argv.includes('--finalize-reading-chain');
const help = process.argv.includes('--help') || process.argv.includes('-h');

const READING_CHAIN_LAYOUT_AUDIT_NODE_IDS = [
  '834:3', '834:2', '259:10', '334:3', '941:2', '2260:1417',
  '2260:1460', '2400:490', '2446:391', '943:4976', '2547:1597', '2019:56433',
];

function argumentValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

function usage() {
  console.log(`Usage:
  FIGMA_READ_TOKEN=... node tools/design/fetch-figma-current-revision.mjs
  FIGMA_READ_TOKEN=... node tools/design/fetch-figma-current-revision.mjs --apply
  FIGMA_READ_TOKEN=... node tools/design/fetch-figma-current-revision.mjs --finalize-reading-chain
  FIGMA_READ_TOKEN=... node tools/design/fetch-figma-current-revision.mjs --node-ids 123:456,789:101

Environment:
  FIGMA_READ_TOKEN       Required. Never pass a token as a CLI argument.
  FIGMA_READ_TOKEN_KIND  pat (default), plan, or oauth.

Options:
  --apply                  Persist evidence and patch only null exact-binding revisions.
  --finalize-reading-chain  One final batch close: read official current revision once,
                            rebase every exact binding plus the dependent reading-chain
                            crosswalk / Design Delta artifacts without promoting delivery.
  --node-ids <id,id,...>   Read additional exact Figma node IDs into stdout evidence only.
                            This read-only option cannot be combined with --apply or
                            --finalize-reading-chain and never changes the registry.
  --registry <path>        Registry path (default: docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json).
  --evidence <path>        Evidence path (default: docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json).
`);
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function atomicWriteJson(target, value) {
  const dir = path.dirname(target);
  fs.mkdirSync(dir, { recursive: true });
  const temp = path.join(dir, `.${path.basename(target)}.${process.pid}.tmp`);
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temp, target);
}

function repositoryRelative(target) {
  const relative = path.relative(repoRoot, path.resolve(target));
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('evidence path must remain inside the Reader-UI repository');
  }
  return relative.split(path.sep).join('/');
}

function readJson(target, label) {
  if (!fs.existsSync(target)) throw new Error(`${label} not found: ${repositoryRelative(target)}`);
  try {
    return JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch {
    throw new Error(`${label} is not valid JSON: ${repositoryRelative(target)}`);
  }
}

function finalizationPaths() {
  const handoffRoot = path.join(repoRoot, 'docs/design/handoffs');
  return {
    postWriteEvidence: path.join(handoffRoot, 'reading-chain/F0_POST_WRITE_REVISION_EVIDENCE.json'),
    reconciliation: path.join(handoffRoot, 'reading-chain/F0_CURRENT_BINDING_RECONCILIATION.json'),
    ledger: path.join(handoffRoot, 'reading-chain/FIGMA_DESIGN_DELTA_LEDGER.json'),
    bookDetailCrosswalk: path.join(handoffRoot, 'book-detail/FIGMA_F0_CROSSWALK.json'),
    bookDetailDesignDelta: path.join(handoffRoot, 'book-detail/FIGMA_DESIGN_DELTA.json'),
    layoutAudit: path.join(handoffRoot, 'reading-chain/F0_LAYOUT_BATCH_AUDIT.json'),
  };
}

async function main() {
  if (help) {
    usage();
    return;
  }
  const registryPath = path.resolve(argumentValue('--registry') || defaultRegistryPath);
  const evidencePath = path.resolve(argumentValue('--evidence') || defaultEvidencePath);
  const extraNodeIdsArgument = argumentValue('--node-ids');
  const extraNodeIds = extraNodeIdsArgument === null ? [] : parseExactNodeIdsCsv(extraNodeIdsArgument);
  if ((apply || finalizeReadingChain) && extraNodeIds.length > 0) {
    throw new Error('--node-ids is read-only and cannot be combined with --apply or --finalize-reading-chain');
  }
  const token = process.env.FIGMA_READ_TOKEN;
  const tokenKind = process.env.FIGMA_READ_TOKEN_KIND || 'pat';
  if (!token) {
    throw new Error('FIGMA_READ_TOKEN is not configured; no network request was made');
  }
  if (!fs.existsSync(registryPath)) throw new Error(`registry not found: ${repositoryRelative(registryPath)}`);

  const registrySource = fs.readFileSync(registryPath, 'utf8');
  const registry = JSON.parse(registrySource);
  const evidence = await readCurrentRevisionEvidence({
    fetchImpl: globalThis.fetch,
    fileKey: registry.authority?.fileKey,
    nodeIds: [...new Set([
      ...collectRegistryExactBindingNodeIds(registry),
      ...extraNodeIds,
      ...(finalizeReadingChain ? READING_CHAIN_LAYOUT_AUDIT_NODE_IDS : []),
    ])].sort(),
    token,
    tokenKind,
  });
  // The token is intentionally absent from evidence.  The only persisted
  // provenance is the official endpoint, current version, and node facts.
  evidence.registry = {
    artifact: repositoryRelative(registryPath),
    sha256BeforeApply: sha256(registrySource),
  };

  if (!apply && !finalizeReadingChain) {
    console.log(JSON.stringify(evidence, null, 2));
    return;
  }

  const evidenceArtifact = repositoryRelative(evidencePath);
  if (finalizeReadingChain) {
    const paths = finalizationPaths();
    const layoutAudit = fs.existsSync(paths.layoutAudit) ? readJson(paths.layoutAudit, 'layout-batch audit') : null;
    const finalized = finalizeReadingChainRevision({
      registry,
      canonicalEvidence: fs.existsSync(evidencePath) ? readJson(evidencePath, 'canonical revision evidence') : null,
      postWriteEvidence: readJson(paths.postWriteEvidence, 'post-write revision evidence'),
      reconciliation: readJson(paths.reconciliation, 'reading-chain reconciliation'),
      ledger: readJson(paths.ledger, 'Design Delta ledger'),
      bookDetailCrosswalk: readJson(paths.bookDetailCrosswalk, 'Book Detail crosswalk'),
      bookDetailDesignDelta: readJson(paths.bookDetailDesignDelta, 'Book Detail Design Delta'),
      layoutAudit,
      evidence,
    });
    // Prepare every document before any replacement. If an atomic replacement
    // fails, the next baseline check fails closed instead of promoting delivery.
    atomicWriteJson(evidencePath, evidence);
    atomicWriteJson(registryPath, finalized.registry);
    atomicWriteJson(paths.reconciliation, finalized.reconciliation);
    atomicWriteJson(paths.ledger, finalized.ledger);
    atomicWriteJson(paths.bookDetailCrosswalk, finalized.bookDetailCrosswalk);
    atomicWriteJson(paths.bookDetailDesignDelta, finalized.bookDetailDesignDelta);
    if (finalized.layoutAudit) atomicWriteJson(paths.layoutAudit, finalized.layoutAudit);
    console.log(JSON.stringify({
      applied: true,
      finalizedReadingChain: true,
      evidence: evidenceArtifact,
      registry: repositoryRelative(registryPath),
      currentRevision: evidence.currentRevision,
      updatedRecordIds: finalized.updatedRecordIds,
      unchangedRecordIds: finalized.unchangedRecordIds,
      previousCurrentRevisions: finalized.priorRevisions,
      note: 'Figma was read only once; crosswalk and Design Delta provenance were rebased without promoting delivery.',
    }, null, 2));
    return;
  }

  const result = applyRevisionEvidenceToRegistry(registry, evidence, evidenceArtifact);
  // Write proof first. If the second atomic replace ever fails, the registry
  // remains unchanged and strict verification still fails closed.
  atomicWriteJson(evidencePath, evidence);
  atomicWriteJson(registryPath, result.registry);
  console.log(JSON.stringify({
    applied: true,
    evidence: evidenceArtifact,
    registry: repositoryRelative(registryPath),
    currentRevision: evidence.currentRevision,
    updatedRecordIds: result.updatedRecordIds,
    unchangedRecordIds: result.unchangedRecordIds,
    note: 'Figma was read only; deliveryStatus was intentionally not promoted.',
  }, null, 2));
}

main().catch((error) => {
  console.error(`FIGMA_CURRENT_REVISION_ADAPTER: ${error.message}`);
  process.exitCode = 1;
});
