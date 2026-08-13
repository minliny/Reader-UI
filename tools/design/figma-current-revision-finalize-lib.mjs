/**
 * One-batch, current-revision reconciliation for the Figma-first reading chain.
 *
 * This module intentionally does not talk to Figma or read credentials.  It
 * transforms already verified official REST evidence into a coherent local
 * provenance set.  The caller is responsible for one stable Figma read, then
 * writing all returned documents atomically per file.
 */

import {
  applyRevisionEvidenceToRegistry,
  validateRevisionEvidenceForRegistry,
} from './figma-current-revision-adapter-lib.mjs';

export const CANONICAL_EVIDENCE_ARTIFACT = 'docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function revisionEvidence(evidence) {
  return {
    artifact: CANONICAL_EVIDENCE_ARTIFACT,
    kind: evidence.kind,
    currentRevision: evidence.currentRevision,
    observedAt: evidence.observedAt,
    source: evidence.provenance.source,
  };
}

function isPriorRevision(value, priorRevisions) {
  return typeof value === 'string' && priorRevisions.has(value);
}

function replaceScopeRevision(value, priorRevisions, evidence) {
  if (Array.isArray(value)) return value.map((entry) => replaceScopeRevision(entry, priorRevisions, evidence));
  if (!value || typeof value !== 'object') return value;

  const next = {};
  for (const [key, child] of Object.entries(value)) next[key] = replaceScopeRevision(child, priorRevisions, evidence);

  const revisionChanged = isPriorRevision(value.revision, priorRevisions);
  const currentRevisionChanged = isPriorRevision(value.currentRevision, priorRevisions);
  if (revisionChanged) next.revision = evidence.currentRevision;
  if (currentRevisionChanged) next.currentRevision = evidence.currentRevision;
  if (revisionChanged || currentRevisionChanged) {
    if (Object.hasOwn(value, 'revisionEvidence')) next.revisionEvidence = revisionEvidence(evidence);
    if (Object.hasOwn(value, 'currentRevisionEvidence')) next.currentRevisionEvidence = CANONICAL_EVIDENCE_ARTIFACT;
    if (Object.hasOwn(value, 'revisionStatus')) next.revisionStatus = 'official-rest-current-version-node-verified';
    if (Object.hasOwn(value, 'currentRevisionStatus')) next.currentRevisionStatus = 'OFFICIAL_REST_CURRENT_VERSION_NODE_VERIFIED';
  }
  return next;
}

function priorRevisionSet({ registry, canonicalEvidence, postWriteEvidence }) {
  const revisions = new Set();
  for (const record of registry.records || []) {
    if (record.classification === 'exact-figma-binding' && typeof record.figma?.revision === 'string') {
      revisions.add(record.figma.revision);
    }
  }
  for (const evidence of [canonicalEvidence, postWriteEvidence]) {
    if (typeof evidence?.currentRevision === 'string') revisions.add(evidence.currentRevision);
  }
  assert(revisions.size > 0, 'no prior official current revision is available for a safe rebase');
  return revisions;
}

export function rebaseReadingChainReconciliation(document, priorRevisions, evidence) {
  assert(document?.kind === 'FIGMA_READING_CHAIN_CURRENT_BINDING_RECONCILIATION', 'unexpected reading-chain reconciliation kind');
  const next = clone(document);
  assert(isPriorRevision(next.authority?.currentRevision, priorRevisions), 'reconciliation authority has no known prior current revision');
  next.status = 'CURRENT_REVISION_RECONCILED_DELIVERY_BLOCKED';
  next.authority.currentRevision = evidence.currentRevision;
  next.authority.revisionEvidence = CANONICAL_EVIDENCE_ARTIFACT;
  if (next.postWriteBookDetailSourceTypeScope) {
    next.postWriteBookDetailSourceTypeScope = replaceScopeRevision(
      next.postWriteBookDetailSourceTypeScope,
      priorRevisions,
      evidence,
    );
  }
  if (next.reconciledHistoricalChildBindings) {
    next.reconciledHistoricalChildBindings = replaceScopeRevision(
      next.reconciledHistoricalChildBindings,
      priorRevisions,
      evidence,
    );
  }
  return next;
}

export function rebaseDesignDeltaLedger(document, priorRevisions, evidence) {
  assert(document?.kind === 'FIGMA_FIRST_DESIGN_DELTA_LEDGER', 'unexpected Design Delta ledger kind');
  const next = clone(document);
  assert(isPriorRevision(next.currentRevision, priorRevisions), 'Design Delta ledger has no known prior current revision');
  next.status = 'CURRENT_REVISION_PARTIALLY_RECONCILED_DELIVERY_BLOCKED';
  next.currentRevision = evidence.currentRevision;
  next.currentRevisionStatus = 'OFFICIAL_REST_CURRENT_REVISION_READ_ONLY';
  next.currentRevisionEvidence = CANONICAL_EVIDENCE_ARTIFACT;
  for (const entry of next.reconciledCurrentReadEntries || []) {
    assert(isPriorRevision(entry.revision, priorRevisions), `Design Delta reconciliation ${entry.pendingEntryId || '<unnamed>'} has no known prior revision`);
    entry.revision = evidence.currentRevision;
    entry.revisionEvidence = CANONICAL_EVIDENCE_ARTIFACT;
  }
  return next;
}

export function rebaseBookDetailArtifact(document, priorRevisions, evidence) {
  const next = clone(document);
  assert(isPriorRevision(next.currentRevision, priorRevisions), 'Book Detail artifact has no known prior current revision');
  next.currentRevision = evidence.currentRevision;
  next.currentRevisionStatus = 'OFFICIAL_REST_CURRENT_VERSION_NODE_VERIFIED';
  next.currentRevisionEvidence = CANONICAL_EVIDENCE_ARTIFACT;
  for (const [key, value] of Object.entries(next)) {
    if (key.startsWith('postWrite') && value && typeof value === 'object') {
      next[key] = replaceScopeRevision(value, priorRevisions, evidence);
    }
  }
  return next;
}

export function finalizeLayoutAudit(document, evidence) {
  if (!document) return null;
  assert(document.kind === 'FIGMA_LAYOUT_BATCH_AUDIT', 'unexpected layout-batch audit kind');
  const next = clone(document);
  next.status = 'OFFICIAL_REVISION_RECONCILED_NO_HARMFUL_TOP_LEVEL_SIBLING_OVERLAP';
  next.officialRevision = evidence.currentRevision;
  next.revisionEvidence = revisionEvidence(evidence);
  return next;
}

/**
 * Rebase all current (not historical) reading-chain provenance after one
 * official Figma current-revision read. No delivery status is promoted.
 */
export function finalizeReadingChainRevision({
  registry,
  canonicalEvidence,
  postWriteEvidence,
  reconciliation,
  ledger,
  bookDetailCrosswalk,
  bookDetailDesignDelta,
  layoutAudit = null,
  evidence,
}) {
  validateRevisionEvidenceForRegistry(registry, evidence);
  const priorRevisions = priorRevisionSet({ registry, canonicalEvidence, postWriteEvidence });
  const registryResult = applyRevisionEvidenceToRegistry(
    registry,
    evidence,
    CANONICAL_EVIDENCE_ARTIFACT,
    { allowRevisionRebase: true },
  );
  return {
    registry: registryResult.registry,
    reconciliation: rebaseReadingChainReconciliation(reconciliation, priorRevisions, evidence),
    ledger: rebaseDesignDeltaLedger(ledger, priorRevisions, evidence),
    bookDetailCrosswalk: rebaseBookDetailArtifact(bookDetailCrosswalk, priorRevisions, evidence),
    bookDetailDesignDelta: rebaseBookDetailArtifact(bookDetailDesignDelta, priorRevisions, evidence),
    layoutAudit: finalizeLayoutAudit(layoutAudit, evidence),
    updatedRecordIds: registryResult.updatedRecordIds,
    unchangedRecordIds: registryResult.unchangedRecordIds,
    priorRevisions: [...priorRevisions].sort(),
  };
}
