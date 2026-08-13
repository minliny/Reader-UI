#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { handoffDirForVisualAdmissionRecord } from './visual-admission-handoff-map.mjs';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(MODULE_DIR, '..', '..');
const DEFAULT_HOST_ROOT = path.resolve(DEFAULT_REPO_ROOT, '..', 'Reader-for-HarmonyOS');
const RECEIPT_ROOT = path.join('docs', 'design', 'native-consumer-receipts');
const PRE_RECEIPT_NAME = 'A2_PRE_PROMOTION_CONSUMER_RECEIPT.json';
const POST_RECEIPT_NAME = 'B4_B5_POST_PROMOTION_CONSUMPTION_RECEIPT.json';
const SCREEN_GRAPH_CHECK = 'node scripts/sync_reader_ui_screen_graph.mjs --check';
const SCREEN_GRAPH_PASS_MARKER = '[screen-graph-consumer] PASS';

function sha256(content) {
  return `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
}

function sha256File(target) {
  return sha256(fs.readFileSync(target));
}

function sameStringSet(left, right) {
  if (left.size !== right.size) return false;
  for (const value of left) if (!right.has(value)) return false;
  return true;
}

function readJson(target) {
  return JSON.parse(fs.readFileSync(target, 'utf8'));
}

function git(repoRoot, args, options = {}) {
  return spawnSync('git', args, {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
}

function gitCommitExists(repoRoot, commit) {
  if (typeof commit !== 'string' || commit.length === 0 || commit.startsWith('PENDING_')) {
    return false;
  }
  return git(repoRoot, ['cat-file', '-e', `${commit}^{commit}`]).status === 0;
}

function gitCommitIsAncestor(repoRoot, commit) {
  return git(repoRoot, ['merge-base', '--is-ancestor', commit, 'HEAD']).status === 0;
}

function gitCommitTree(repoRoot, commit) {
  const result = git(repoRoot, ['show', '-s', '--format=%T', commit], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

function gitCommitSubject(repoRoot, commit) {
  const result = git(repoRoot, ['show', '-s', '--format=%s', commit], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

function gitChangedPaths(repoRoot, commit) {
  const result = git(
    repoRoot,
    ['diff-tree', '--root', '--no-commit-id', '--name-only', '-r', commit],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) return null;
  return result.stdout.split('\n').map((item) => item.trim()).filter(Boolean).sort();
}

function gitBlob(repoRoot, commit, relativePath) {
  const result = git(repoRoot, ['show', `${commit}:${relativePath}`]);
  return result.status === 0 ? result.stdout : null;
}

function trackedAndCleanErrors(repoRoot, target, label) {
  const relativePath = path.relative(repoRoot, target);
  const errors = [];
  if (git(repoRoot, ['ls-files', '--error-unmatch', '--', relativePath]).status !== 0) {
    errors.push(`${label} is not tracked in HEAD: ${relativePath}`);
    return errors;
  }
  if (
    git(repoRoot, ['diff', '--quiet', '--', relativePath]).status !== 0 ||
    git(repoRoot, ['diff', '--cached', '--quiet', '--', relativePath]).status !== 0
  ) {
    errors.push(`${label} is not clean relative to HEAD: ${relativePath}`);
  }
  return errors;
}

function receiptDirectory(handoffDir, implementationCommit) {
  return path.join(RECEIPT_ROOT, handoffDir, implementationCommit);
}

export function prePromotionReceiptPath(repoRoot, handoffDir, implementationCommit) {
  return path.join(
    repoRoot,
    receiptDirectory(handoffDir, implementationCommit),
    PRE_RECEIPT_NAME,
  );
}

export function postPromotionReceiptPath(repoRoot, handoffDir, implementationCommit) {
  return path.join(
    repoRoot,
    receiptDirectory(handoffDir, implementationCommit),
    POST_RECEIPT_NAME,
  );
}

function validateCommitReference({
  errors,
  repositoryRoot,
  label,
  commit,
  tree,
  subject,
  changedPaths,
}) {
  if (!gitCommitExists(repositoryRoot, commit)) {
    errors.push(`${label} commit does not exist: ${commit}`);
    return;
  }
  if (!gitCommitIsAncestor(repositoryRoot, commit)) {
    errors.push(`${label} commit is not an ancestor of current HEAD: ${commit}`);
  }
  const actualTree = gitCommitTree(repositoryRoot, commit);
  if (tree !== actualTree) {
    errors.push(`${label} tree mismatch: receipt=${tree}, git=${actualTree}`);
  }
  const actualSubject = gitCommitSubject(repositoryRoot, commit);
  if (subject !== actualSubject) {
    errors.push(`${label} subject mismatch: receipt='${subject}', git='${actualSubject}'`);
  }
  if (changedPaths) {
    const actualPaths = gitChangedPaths(repositoryRoot, commit);
    if (
      !actualPaths ||
      !sameStringSet(new Set(changedPaths), new Set(actualPaths)) ||
      changedPaths.length !== new Set(changedPaths).size
    ) {
      errors.push(`${label} changedPaths do not exactly match git diff-tree`);
    }
  }
}

function runKnownHostVerification(hostRepoRoot, verification, errors) {
  if (
    verification?.command !== SCREEN_GRAPH_CHECK ||
    verification?.expectedMarker !== SCREEN_GRAPH_PASS_MARKER
  ) {
    errors.push(
      `harmonyConsumer.verification must be the fixed '${SCREEN_GRAPH_CHECK}' check`,
    );
    return;
  }
  const script = path.join(hostRepoRoot, 'scripts', 'sync_reader_ui_screen_graph.mjs');
  if (!fs.existsSync(script)) {
    errors.push(`HarmonyOS Screen Graph check is missing: ${script}`);
    return;
  }
  const result = spawnSync(process.execPath, [script, '--check'], {
    cwd: hostRepoRoot,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
  const output = `${result.stdout?.toString() || ''}\n${result.stderr?.toString() || ''}`;
  if (result.status !== 0) {
    errors.push(`HarmonyOS Screen Graph check failed:\n${output.trim()}`);
  } else if (!output.includes(SCREEN_GRAPH_PASS_MARKER)) {
    errors.push(`HarmonyOS Screen Graph check did not emit '${SCREEN_GRAPH_PASS_MARKER}'`);
  }
}

export function verifyA2PrePromotionReceipt({
  repoRoot = DEFAULT_REPO_ROOT,
  hostRepoRoot = DEFAULT_HOST_ROOT,
  handoffDir,
  recordIds,
  localReadyPath,
  localReady,
  officialRevision,
  latestLedgerEntries = new Map(),
  mode = 'check',
  runHostVerification = true,
  receiptRelativePath,
}) {
  const errors = [];
  const implementationCommit = localReady?.localSource?.implementationCommit;
  const target = receiptRelativePath
    ? path.join(repoRoot, receiptRelativePath)
    : prePromotionReceiptPath(repoRoot, handoffDir, implementationCommit);
  const relativeTarget = path.relative(repoRoot, target);
  if (!fs.existsSync(target)) {
    return {
      errors: [`A2 pre-promotion consumer receipt is missing: ${relativeTarget}`],
      metadata: null,
    };
  }

  errors.push(...trackedAndCleanErrors(repoRoot, target, 'A2 pre-promotion consumer receipt'));

  let receipt;
  try {
    receipt = readJson(target);
  } catch (error) {
    return {
      errors: [
        `A2 pre-promotion consumer receipt is not valid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ],
      metadata: null,
    };
  }

  if (
    receipt.schemaVersion !== '1.0.0' ||
    receipt.kind !== 'A2_PRE_PROMOTION_CONSUMER_RECEIPT' ||
    receipt.status !== 'a2-consumer-closed'
  ) {
    errors.push('A2 pre-promotion consumer receipt has an invalid schema, kind, or status');
  }
  if (receipt.handoffDir !== handoffDir) {
    errors.push(`receipt handoffDir '${receipt.handoffDir}' does not match '${handoffDir}'`);
  }
  const receiptRecordIds = Array.isArray(receipt.recordIds) ? receipt.recordIds : [];
  if (
    !sameStringSet(new Set(receiptRecordIds), new Set(recordIds)) ||
    receiptRecordIds.length !== new Set(receiptRecordIds).size
  ) {
    errors.push('receipt recordIds do not exactly match the B3 admission record set');
  }
  if (receipt.figmaRevision !== officialRevision) {
    errors.push(
      `receipt Figma revision '${receipt.figmaRevision}' does not match official '${officialRevision}'`,
    );
  }

  const localReadyRelative = path.relative(repoRoot, localReadyPath);
  const packetHash = sha256File(localReadyPath);
  const sourceEvidence = receipt.sourceEvidence || {};
  if (sourceEvidence.b2ImplementationCommit !== implementationCommit) {
    errors.push('receipt B2 implementation commit does not match LOCAL_READY_FOR_FIGMA');
  }
  if (sourceEvidence.b3PacketPath !== localReadyRelative) {
    errors.push('receipt B3 packet path does not match LOCAL_READY_FOR_FIGMA');
  }
  if (sourceEvidence.b3PacketSha256 !== packetHash) {
    errors.push('receipt B3 packet SHA-256 does not match current immutable packet bytes');
  }
  if (sourceEvidence.sourceEvidenceHash !== localReady.sourceEvidenceHash) {
    errors.push('receipt sourceEvidenceHash does not match LOCAL_READY_FOR_FIGMA');
  }
  if (!gitCommitExists(repoRoot, sourceEvidence.b3EvidenceCommit)) {
    errors.push(`B3 evidence commit does not exist: ${sourceEvidence.b3EvidenceCommit}`);
  } else {
    if (!gitCommitIsAncestor(repoRoot, sourceEvidence.b3EvidenceCommit)) {
      errors.push(`B3 evidence commit is not an ancestor of current HEAD`);
    }
    const b3Blob = gitBlob(repoRoot, sourceEvidence.b3EvidenceCommit, localReadyRelative);
    if (!b3Blob || sha256(b3Blob) !== packetHash) {
      errors.push('B3 evidence commit does not contain the current immutable packet bytes');
    }
  }

  const deltaPath = path.join(repoRoot, sourceEvidence.a2DeltaPath || '');
  if (!sourceEvidence.a2DeltaPath || !fs.existsSync(deltaPath)) {
    errors.push(`A2 source delta is missing: ${sourceEvidence.a2DeltaPath}`);
  } else {
    if (sha256File(deltaPath) !== sourceEvidence.a2DeltaSha256) {
      errors.push('A2 source delta SHA-256 does not match the receipt');
    }
    errors.push(...trackedAndCleanErrors(repoRoot, deltaPath, 'A2 source delta'));
  }

  const harmonyConsumer = receipt.harmonyConsumer || {};
  if (harmonyConsumer.repository !== 'Reader-for-HarmonyOS') {
    errors.push(`harmonyConsumer.repository must be 'Reader-for-HarmonyOS'`);
  }
  validateCommitReference({
    errors,
    repositoryRoot: hostRepoRoot,
    label: 'HarmonyOS A2 cleanup',
    commit: harmonyConsumer.cleanupCommit,
    tree: harmonyConsumer.cleanupTree,
    subject: harmonyConsumer.cleanupCommitSubject,
    changedPaths: harmonyConsumer.changedPaths,
  });
  if (runHostVerification) {
    runKnownHostVerification(hostRepoRoot, harmonyConsumer.verification, errors);
  }

  const ordering = receipt.ordering || {};
  if (ordering.requiredBefore !== 'B4 promotion') {
    errors.push(`receipt ordering.requiredBefore must be 'B4 promotion'`);
  }
  if (ordering.mode !== 'pre-promotion' && ordering.mode !== 'historical-bootstrap') {
    errors.push(`receipt ordering.mode must be 'pre-promotion' or 'historical-bootstrap'`);
  }
  if (mode === 'promotion' && ordering.mode === 'historical-bootstrap') {
    errors.push('historical-bootstrap receipt cannot authorize a new or replayed promotion');
  }

  if (ordering.mode === 'historical-bootstrap') {
    const declaredPromotions = Array.isArray(ordering.activePromotionEntries)
      ? ordering.activePromotionEntries
      : [];
    const actualPromotions = recordIds.map((recordId) => {
      const entry = latestLedgerEntries.get(recordId);
      return entry
        ? { recordId, entryId: entry.entryId, entryHash: entry.entryHash, kind: entry.kind || 'promote' }
        : { recordId, entryId: null, entryHash: null, kind: null };
    });
    const declaredByRecord = new Map(
      declaredPromotions.map((entry) => [entry.recordId, entry]),
    );
    if (declaredPromotions.length !== recordIds.length) {
      errors.push('historical-bootstrap receipt must bind every active promotion entry');
    }
    for (const actual of actualPromotions) {
      const declared = declaredByRecord.get(actual.recordId);
      if (
        !declared ||
        actual.kind !== 'promote' ||
        declared.entryId !== actual.entryId ||
        declared.entryHash !== actual.entryHash
      ) {
        errors.push(
          `historical-bootstrap promotion binding mismatch for ${actual.recordId}`,
        );
      }
    }
  } else if (ordering.activePromotionEntries !== undefined) {
    errors.push('pre-promotion receipt must not predeclare a future promotion entry');
  }

  const receiptHash = sha256File(target);
  return {
    errors,
    metadata: {
      path: relativeTarget,
      sha256: receiptHash,
      status: receipt.status,
      mode: ordering.mode,
      cleanupCommit: harmonyConsumer.cleanupCommit,
    },
  };
}

function verifyPromotionSnapshot({
  repoRoot,
  recordIds,
  receiptPromotion,
  latestLedgerEntries,
  errors,
}) {
  const declaredEntries = Array.isArray(receiptPromotion?.ledgerEntries)
    ? receiptPromotion.ledgerEntries
    : [];
  const declaredByRecord = new Map(declaredEntries.map((entry) => [entry.recordId, entry]));
  if (declaredEntries.length !== recordIds.length) {
    errors.push('post-promotion receipt must bind one active ledger entry per record');
  }
  for (const recordId of recordIds) {
    const actual = latestLedgerEntries.get(recordId);
    const declared = declaredByRecord.get(recordId);
    if (
      !actual ||
      (actual.kind !== undefined && actual.kind !== 'promote') ||
      !declared ||
      declared.entryId !== actual.entryId ||
      declared.entryHash !== actual.entryHash
    ) {
      errors.push(`post-promotion ledger binding mismatch for ${recordId}`);
    }
  }
  if (!gitCommitExists(repoRoot, receiptPromotion?.readerUiPromotionCommit)) {
    errors.push(
      `Reader-UI promotion commit does not exist: ${receiptPromotion?.readerUiPromotionCommit}`,
    );
    return;
  }
  if (!gitCommitIsAncestor(repoRoot, receiptPromotion.readerUiPromotionCommit)) {
    errors.push('Reader-UI promotion commit is not an ancestor of current HEAD');
  }
  const ledgerBlob = gitBlob(
    repoRoot,
    receiptPromotion.readerUiPromotionCommit,
    path.join('docs', 'design', 'PROMOTION_LEDGER.json'),
  );
  if (!ledgerBlob) {
    errors.push('Reader-UI promotion commit does not contain PROMOTION_LEDGER.json');
    return;
  }
  const ledgerAtPromotion = JSON.parse(ledgerBlob.toString('utf8'));
  const hashesAtPromotion = new Set(ledgerAtPromotion.entries.map((entry) => entry.entryHash));
  for (const entry of declaredEntries) {
    if (!hashesAtPromotion.has(entry.entryHash)) {
      errors.push(
        `Reader-UI promotion commit does not contain ledger entry ${entry.entryId}`,
      );
    }
  }
}

export function verifyB4B5PostPromotionReceipt({
  repoRoot = DEFAULT_REPO_ROOT,
  hostRepoRoot = DEFAULT_HOST_ROOT,
  handoffDir,
  recordIds,
  localReady,
  officialRevision,
  latestLedgerEntries,
  preReceiptMetadata,
  receiptRelativePath,
}) {
  const errors = [];
  const implementationCommit = localReady?.localSource?.implementationCommit;
  const target = receiptRelativePath
    ? path.join(repoRoot, receiptRelativePath)
    : postPromotionReceiptPath(repoRoot, handoffDir, implementationCommit);
  const relativeTarget = path.relative(repoRoot, target);
  if (!fs.existsSync(target)) {
    return {
      errors: [`B4/B5 post-promotion consumption receipt is missing: ${relativeTarget}`],
      metadata: null,
    };
  }
  errors.push(
    ...trackedAndCleanErrors(repoRoot, target, 'B4/B5 post-promotion consumption receipt'),
  );
  let receipt;
  try {
    receipt = readJson(target);
  } catch (error) {
    return {
      errors: [
        `B4/B5 post-promotion consumption receipt is not valid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ],
      metadata: null,
    };
  }
  if (
    receipt.schemaVersion !== '1.0.0' ||
    receipt.kind !== 'B4_B5_POST_PROMOTION_CONSUMPTION_RECEIPT' ||
    receipt.status !== 'visual-admission-consumed'
  ) {
    errors.push('B4/B5 post-promotion receipt has an invalid schema, kind, or status');
  }
  if (receipt.handoffDir !== handoffDir) {
    errors.push('B4/B5 post-promotion receipt handoffDir mismatch');
  }
  if (
    !Array.isArray(receipt.recordIds) ||
    !sameStringSet(new Set(receipt.recordIds), new Set(recordIds)) ||
    receipt.recordIds.length !== new Set(receipt.recordIds).size
  ) {
    errors.push('B4/B5 post-promotion receipt recordIds mismatch');
  }
  if (receipt.figmaRevision !== officialRevision) {
    errors.push('B4/B5 post-promotion receipt Figma revision mismatch');
  }
  if (receipt.sourceEvidenceHash !== localReady.sourceEvidenceHash) {
    errors.push('B4/B5 post-promotion receipt sourceEvidenceHash mismatch');
  }
  if (receipt.implementationCommit !== implementationCommit) {
    errors.push('B4/B5 post-promotion receipt implementationCommit mismatch');
  }
  if (
    receipt.prePromotionReceipt?.path !== preReceiptMetadata?.path ||
    receipt.prePromotionReceipt?.sha256 !== preReceiptMetadata?.sha256
  ) {
    errors.push('B4/B5 post-promotion receipt does not bind the exact pre-promotion receipt');
  }

  verifyPromotionSnapshot({
    repoRoot,
    recordIds,
    receiptPromotion: receipt.promotion,
    latestLedgerEntries,
    errors,
  });

  const consumer = receipt.harmonyConsumer || {};
  validateCommitReference({
    errors,
    repositoryRoot: hostRepoRoot,
    label: 'HarmonyOS admission consumption',
    commit: consumer.admissionConsumptionCommit,
    tree: consumer.admissionConsumptionTree,
    subject: consumer.admissionConsumptionSubject,
  });
  if (consumer.runtimeConsumptionCommit) {
    validateCommitReference({
      errors,
      repositoryRoot: hostRepoRoot,
      label: 'HarmonyOS runtime consumption',
      commit: consumer.runtimeConsumptionCommit,
      tree: consumer.runtimeConsumptionTree,
      subject: consumer.runtimeConsumptionSubject,
    });
  }
  const consumerArtifactPath =
    'entry/src/main/ets/contract/reader_ui/VisualAdmission.ets';
  const artifactBlob = gitBlob(
    hostRepoRoot,
    consumer.admissionConsumptionCommit,
    consumerArtifactPath,
  );
  if (
    !artifactBlob ||
    sha256(artifactBlob) !== consumer.visualAdmissionSha256AtConsumption
  ) {
    errors.push(
      'HarmonyOS VisualAdmission.ets at the consumption commit does not match the receipt',
    );
  }
  const pending = new Set(receipt.explicitlyPending || []);
  for (const required of [
    'runtimeReleaseLock',
    'B6VirtualMachineCurrentReleaseEvidence',
    'B7DeviceMotionMachineReceiptReleaseIdentity',
  ]) {
    if (!pending.has(required)) {
      errors.push(`B4/B5 post-promotion receipt must explicitly keep ${required} pending`);
    }
  }

  return {
    errors,
    metadata: {
      path: relativeTarget,
      sha256: sha256File(target),
      status: receipt.status,
    },
  };
}

export function checkCurrentNativeConsumerReceipts({
  repoRoot = DEFAULT_REPO_ROOT,
  hostRepoRoot = DEFAULT_HOST_ROOT,
  runHostVerification = true,
} = {}) {
  const registry = readJson(
    path.join(repoRoot, 'docs', 'design', 'FIGMA_VISUAL_ADMISSION_REGISTRY.json'),
  );
  const ledger = readJson(
    path.join(repoRoot, 'docs', 'design', 'PROMOTION_LEDGER.json'),
  );
  const officialRevision = readJson(
    path.join(repoRoot, 'docs', 'design', 'F0_FIGMA_CURRENT_REVISION_EVIDENCE.json'),
  ).currentRevision;
  const dependencies = readJson(
    path.join(repoRoot, 'docs', 'design', 'FIGMA_VISUAL_ADMISSION_DEPENDENCIES.json'),
  );
  const latestLedgerEntries = new Map();
  for (const entry of ledger.entries) latestLedgerEntries.set(entry.recordId, entry);

  const activeRecords = registry.records.filter(
    (record) => record.harmony?.status === 'implementation-ready',
  );
  const errors = [];
  const groups = new Map();
  for (const record of activeRecords) {
    let handoffDir;
    try {
      handoffDir = handoffDirForVisualAdmissionRecord(record.id);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      continue;
    }
    const localReadyPath = path.join(
      repoRoot,
      'docs',
      'design',
      'handoffs',
      handoffDir,
      'LOCAL_READY_FOR_FIGMA.json',
    );
    const key = localReadyPath;
    if (!groups.has(key)) groups.set(key, { handoffDir, localReadyPath, records: [] });
    groups.get(key).records.push(record);
  }

  const verified = [];
  for (const group of groups.values()) {
    if (!fs.existsSync(group.localReadyPath)) {
      errors.push(`LOCAL_READY_FOR_FIGMA missing: ${group.localReadyPath}`);
      continue;
    }
    const localReady = readJson(group.localReadyPath);
    const recordIds = localReady.admission?.recordIds || group.records.map((record) => record.id);
    const closure = (dependencies.nativeA2ConsumerClosures || []).find((entry) =>
      Array.isArray(entry.recordIds) &&
      sameStringSet(new Set(entry.recordIds), new Set(recordIds)) &&
      entry.recordIds.length === recordIds.length
    );
    if (!closure) {
      errors.push(
        `${group.handoffDir}: no nativeA2ConsumerClosures entry matches the B3 record set`,
      );
      continue;
    }
    const pre = verifyA2PrePromotionReceipt({
      repoRoot,
      hostRepoRoot,
      handoffDir: group.handoffDir,
      recordIds,
      localReadyPath: group.localReadyPath,
      localReady,
      officialRevision,
      latestLedgerEntries,
      mode: 'check',
      runHostVerification,
      receiptRelativePath: closure.prePromotionReceipt,
    });
    errors.push(...pre.errors.map((error) => `${group.handoffDir}: ${error}`));
    if (!pre.metadata) continue;
    const post = verifyB4B5PostPromotionReceipt({
      repoRoot,
      hostRepoRoot,
      handoffDir: group.handoffDir,
      recordIds,
      localReady,
      officialRevision,
      latestLedgerEntries,
      preReceiptMetadata: pre.metadata,
      receiptRelativePath: closure.postPromotionReceipt,
    });
    errors.push(...post.errors.map((error) => `${group.handoffDir}: ${error}`));
    if (post.metadata) {
      verified.push({
        handoffDir: group.handoffDir,
        recordIds,
        pre: pre.metadata,
        post: post.metadata,
      });
    }
  }
  return { errors, verified };
}

const invokedAsScript =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  const result = checkCurrentNativeConsumerReceipts();
  if (result.errors.length > 0) {
    console.error(
      `✗ native-consumer-receipts: ${result.errors.length} inconsistency(es) found:`,
    );
    for (const error of result.errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  const recordCount = result.verified.reduce(
    (sum, item) => sum + item.recordIds.length,
    0,
  );
  console.log(
    `✓ native-consumer-receipts: ${result.verified.length} family receipt set(s), ` +
    `${recordCount} implementation-ready record(s) verified`,
  );
}
