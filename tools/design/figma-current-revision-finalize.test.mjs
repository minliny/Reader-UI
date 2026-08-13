import assert from 'node:assert/strict';
import test from 'node:test';
import { finalizeReadingChainRevision } from './figma-current-revision-finalize-lib.mjs';

const oldRevision = '2379835362600686774';
const newRevision = '2379999999999999999';

function evidence() {
  return {
    kind: 'FIGMA_CURRENT_REVISION_EVIDENCE',
    schemaVersion: '1.0.0',
    fileKey: 'file-key',
    currentRevision: newRevision,
    lastModified: '2026-07-25T00:00:00Z',
    observedAt: '2026-07-25T00:01:02.000Z',
    provenance: { source: 'figma-rest', readOnly: true },
    resolvedNodes: ['1:1', '1:2', '1:3'].map((id) => ({ id })),
  };
}

function registry() {
  return {
    authority: { fileKey: 'file-key' },
    records: [{
      id: 'surface',
      classification: 'exact-figma-binding',
      deliveryStatus: 'current-read-unfrozen',
      figma: {
        fileKey: 'file-key', pageId: '1:1', canonicalMasterId: '1:2', nodeId: '1:2',
        viewportNodes: { phone: '1:3' }, revision: oldRevision,
        revisionStatus: 'official-rest-current-version-node-verified',
        revisionEvidence: { artifact: 'docs/design/handoffs/reading-chain/F0_POST_WRITE_REVISION_EVIDENCE.json', currentRevision: oldRevision },
      },
    }],
  };
}

function reconciliation() {
  return {
    kind: 'FIGMA_READING_CHAIN_CURRENT_BINDING_RECONCILIATION',
    status: 'CURRENT_REVISION_RECONCILED_DELIVERY_BLOCKED',
    authority: { fileKey: 'file-key', currentRevision: oldRevision, revisionEvidence: 'docs/design/handoffs/reading-chain/F0_POST_WRITE_REVISION_EVIDENCE.json' },
    postWriteBookDetailSourceTypeScope: {
      revision: oldRevision,
      revisionEvidence: 'docs/design/handoffs/reading-chain/F0_POST_WRITE_REVISION_EVIDENCE.json',
      pageVariants: { phone: { revision: oldRevision, revisionEvidence: 'docs/design/handoffs/reading-chain/F0_POST_WRITE_REVISION_EVIDENCE.json' } },
    },
    reconciledHistoricalChildBindings: [{ id: 'book-detail-hero', revision: oldRevision, revisionEvidence: 'docs/design/handoffs/reading-chain/F0_POST_WRITE_REVISION_EVIDENCE.json' }],
  };
}

function ledger() {
  return {
    kind: 'FIGMA_FIRST_DESIGN_DELTA_LEDGER',
    status: 'CURRENT_REVISION_PARTIALLY_RECONCILED_DELIVERY_BLOCKED',
    currentRevision: oldRevision,
    currentRevisionStatus: 'OFFICIAL_REST_CURRENT_REVISION_READ_ONLY',
    currentRevisionEvidence: 'docs/design/handoffs/reading-chain/F0_POST_WRITE_REVISION_EVIDENCE.json',
    reconciledCurrentReadEntries: [{ pendingEntryId: 'entry', revision: oldRevision, revisionEvidence: 'docs/design/handoffs/reading-chain/F0_POST_WRITE_REVISION_EVIDENCE.json' }],
  };
}

function bookDetailArtifact() {
  return {
    currentRevision: oldRevision,
    currentRevisionStatus: 'OFFICIAL_REST_CURRENT_VERSION_NODE_VERIFIED',
    currentRevisionEvidence: 'docs/design/handoffs/reading-chain/F0_POST_WRITE_REVISION_EVIDENCE.json',
    postWriteLocalBookSourceF0: {
      revision: oldRevision,
      revisionEvidence: 'docs/design/handoffs/reading-chain/F0_POST_WRITE_REVISION_EVIDENCE.json',
      variants: [{ revision: oldRevision, revisionEvidence: 'docs/design/handoffs/reading-chain/F0_POST_WRITE_REVISION_EVIDENCE.json' }],
    },
    currentWriterTransaction: { revision: null, revisionStatus: 'NOT_READABLE_IN_WRITER_RUNTIME' },
  };
}

test('one official read rebases all current reading-chain provenance without delivery promotion', () => {
  const result = finalizeReadingChainRevision({
    registry: registry(),
    canonicalEvidence: { currentRevision: oldRevision },
    postWriteEvidence: { currentRevision: oldRevision },
    reconciliation: reconciliation(),
    ledger: ledger(),
    bookDetailCrosswalk: bookDetailArtifact(),
    bookDetailDesignDelta: bookDetailArtifact(),
    layoutAudit: { kind: 'FIGMA_LAYOUT_BATCH_AUDIT', status: 'WRITER_AUDITED_REVISION_PENDING', officialRevision: null },
    evidence: evidence(),
  });

  assert.equal(result.registry.records[0].figma.revision, newRevision);
  assert.equal(result.registry.records[0].deliveryStatus, 'current-read-unfrozen');
  assert.equal(result.reconciliation.authority.currentRevision, newRevision);
  assert.equal(result.reconciliation.authority.revisionEvidence, 'docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json');
  assert.equal(result.reconciliation.postWriteBookDetailSourceTypeScope.pageVariants.phone.revision, newRevision);
  assert.equal(result.reconciliation.reconciledHistoricalChildBindings[0].revision, newRevision);
  assert.equal(result.ledger.currentRevision, newRevision);
  assert.equal(result.ledger.reconciledCurrentReadEntries[0].revisionEvidence, 'docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json');
  assert.equal(result.bookDetailCrosswalk.postWriteLocalBookSourceF0.variants[0].revision, newRevision);
  assert.equal(result.bookDetailCrosswalk.currentWriterTransaction.revision, null);
  assert.equal(result.layoutAudit.officialRevision, newRevision);
  assert.deepEqual(result.updatedRecordIds, ['surface']);
});
