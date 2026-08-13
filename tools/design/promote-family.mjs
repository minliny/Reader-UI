#!/usr/bin/env node
// promote-family.mjs — the ONLY authorized way to set harmony.status to
// 'implementation-ready' in FIGMA_VISUAL_ADMISSION_REGISTRY.json.
//
// On 2026-07-27 an audit found that 28 records had harmony.status set to
// 'implementation-ready' while their local.status was still 'candidate-backport'.
// That is the bypass path this script closes: hand-editing harmony.status
// directly, without source-side conversion being complete.
//
// This script is an atomic promotion transaction. It verifies ALL prerequisites
// before mutating anything, then atomically:
//   1. sets harmony.status = 'implementation-ready' in the registry
//   2. regenerates Reader-UI generated/arkts/VisualAdmission.ets
//   3. syncs the regenerated artifact to Reader-for-HarmonyOS consumer copy
//   4. appends a tamper-evident entry to PROMOTION_LEDGER.json
//
// The four-file write (registry + upstream artifact + consumer copy + ledger)
// is orchestrated as a transaction with backups and rollback. If any step
// fails, all prior writes in this transaction are reverted.
//
// Prerequisites (ALL must hold, or the script refuses to run):
//   - local.status === 'implementation-ready' (source-side self-promotion)
//   - LOCAL_READY_FOR_FIGMA.json exists and admission.localReadyForFigma === true
//   - Figma binding revision matches the OFFICIAL current-revision evidence
//     (docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json), not just the
//     first registry record's revision
//   - HarmonyOS consumer target files exist on disk AND the #symbol suffix
//     (if present) must be findable in the target file
//   - harmony.status is not already 'implementation-ready' (idempotent)
//
// Usage:
//   node tools/design/promote-family.mjs <recordId>
//   node tools/design/promote-family.mjs --check   # verify ledger consistency without promoting

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const registryPath = path.join(repoRoot, 'docs', 'design', 'FIGMA_VISUAL_ADMISSION_REGISTRY.json');
const ledgerPath = path.join(repoRoot, 'docs', 'design', 'PROMOTION_LEDGER.json');
const handoffsDir = path.join(repoRoot, 'docs', 'design', 'handoffs');
const generatorPath = path.join(repoRoot, 'tools', 'design', 'generate-visual-admission-contract.mjs');
const upstreamArtifactPath = path.join(repoRoot, 'generated', 'arkts', 'VisualAdmission.ets');
const revisionEvidencePath = path.join(repoRoot, 'docs', 'design', 'F0_FIGMA_CURRENT_REVISION_EVIDENCE.json');

// Host consumer copy of the generated artifact. This must be byte-identical to
// upstreamArtifactPath after every promotion. The 2026-07-27 audit found these
// two files had diverged (different SHA-256) because the previous promotion
// flow never synced the consumer copy.
const hostRepoRoot = path.resolve(repoRoot, '..', 'Reader-for-HarmonyOS');
const consumerArtifactPath = path.join(
  hostRepoRoot,
  'entry/src/main/ets/contract/reader_ui/VisualAdmission.ets',
);

// ─── Explicit recordId → handoff directory mapping ────────────────────────
// The 2026-07-27 audit found that deriving the handoff directory from the
// recordId prefix was wrong: `reader.*` maps to `handoffs/reader-runtime`
// (not `reader`), `search.*` maps to `search-results`, `webdav.*` maps to
// `webdav-config`, `settings.*` maps to `settings-general`. String-prefix
// guessing made it impossible to promote any record in those families.
const RECORD_ID_TO_HANDOFF = {
  'bookshelf': 'bookshelf',
  'book-detail': 'book-detail',
  'source-switch': 'source-switch',
  'reader': 'reader-runtime',
  'settings': 'settings-general',
  'source-management': 'source-management',
  'webdav': 'webdav-config',
  'sync-backup': 'sync-backup',
  'search': 'search-results',
  'discover': 'discover',
  'rss': 'rss',
  'about': 'about',
  'import-conflict-resolve': 'import-conflict-resolve',
  'restore-preview': 'restore-preview',
};

function handoffDirForRecordId(recordId) {
  const dot = recordId.indexOf('.');
  const family = dot > 0 ? recordId.slice(0, dot) : recordId;
  const dir = RECORD_ID_TO_HANDOFF[family];
  if (!dir) {
    fail(`record ${recordId}: no explicit handoff mapping for family '${family}'. Add it to RECORD_ID_TO_HANDOFF in promote-family.mjs.`);
  }
  return dir;
}

function localReadyForFigmaPath(recordId) {
  return path.join(handoffsDir, handoffDirForRecordId(recordId), 'LOCAL_READY_FOR_FIGMA.json');
}

function sha256(content) {
  return `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
}

function fail(message) {
  console.error(`✗ promote-family: ${message}`);
  process.exit(1);
}

function readJson(target) {
  return JSON.parse(fs.readFileSync(target, 'utf8'));
}

function writeJson(target, value) {
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

function targetFileExists(target) {
  // targets look like "Reader-for-HarmonyOS/entry/.../BookshelfComponents.ets#BookshelfShelfSection"
  // or "frontend-demo-optimized/render-runtime.js#bookshelf"
  const [relativePath, symbol] = target.split('#');
  const resolved = path.join(repoRoot, '..', relativePath);
  if (!fs.existsSync(resolved)) return false;
  // If a #symbol suffix is present, the symbol must be findable in the file.
  // This prevents "file exists but the component/function was renamed or deleted"
  // from passing the prerequisite check.
  if (symbol) {
    const content = fs.readFileSync(resolved, 'utf8');
    // Match the symbol as an identifier (export, function, class, struct,
    // const, let, var, or @Component decorator preceding it). We use a
    // permissive identifier match rather than a strict AST parse because the
    // target files are .ets (ArkTS) and .js — both close enough to JS-ish
    // syntax that a word-boundary search is reliable for promotion gating.
    const pattern = new RegExp(`\\b${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (!pattern.test(content)) return false;
  }
  return true;
}

// ─── Ledger: tamper-evident append-only log ───────────────────────────────
// NOTE: the ledger is a best-effort tamper-evident log, NOT a cryptographic
// signature. An agent with write access to the working tree can recompute the
// hash chain. The real defense is Layer 3 (CI from a clean checkout) — see
// FIGMA_TO_NATIVE_AGENT_EXECUTION_PROTOCOL.md §9.8. The ledger's value is that
// it makes casual hand-edits detectable by `promote-family.mjs --check` and
// the HarmonyOS Gate I, and it records the promotion context (registry hash,
// artifact hash, figma revision, targets) for forensic review.

function loadLedger() {
  if (!fs.existsSync(ledgerPath)) {
    return { kind: 'PROMOTION_LEDGER', version: '1.0.0', entries: [] };
  }
  return readJson(ledgerPath);
}

function computeEntryHash(entry) {
  const { entryHash, ...rest } = entry;
  return sha256(JSON.stringify(rest, null, 2));
}

function appendLedgerEntry(ledger, entry) {
  const previousEntryHash = ledger.entries.length > 0
    ? ledger.entries[ledger.entries.length - 1].entryHash
    : 'genesis';
  const fullEntry = { ...entry, previousEntryHash };
  fullEntry.entryHash = computeEntryHash(fullEntry);
  ledger.entries.push(fullEntry);
  return fullEntry;
}

function verifyLedger(ledger) {
  const errors = [];
  let previousHash = 'genesis';
  for (let index = 0; index < ledger.entries.length; index += 1) {
    const entry = ledger.entries[index];
    if (entry.previousEntryHash !== previousHash) {
      errors.push(`ledger entry ${index + 1} (${entry.recordId}): previousEntryHash mismatch (expected ${previousHash}, got ${entry.previousEntryHash}) — chain broken`);
    }
    const recomputed = computeEntryHash(entry);
    if (entry.entryHash !== recomputed) {
      errors.push(`ledger entry ${index + 1} (${entry.recordId}): entryHash mismatch — entry was tampered with after creation`);
    }
    previousHash = entry.entryHash;
  }
  return errors;
}

// ─── Official Figma revision evidence ─────────────────────────────────────

function readOfficialCurrentRevision() {
  if (!fs.existsSync(revisionEvidencePath)) {
    fail(`official Figma revision evidence not found at ${path.relative(repoRoot, revisionEvidencePath)} — cannot verify binding currency without it`);
  }
  const evidence = readJson(revisionEvidencePath);
  if (!evidence.currentRevision) {
    fail(`F0_FIGMA_CURRENT_REVISION_EVIDENCE.json has no currentRevision field — evidence is malformed`);
  }
  return evidence.currentRevision;
}

// ─── Check mode: verify ledger consistency without promoting ──────────────

function runCheck() {
  const registry = readJson(registryPath);
  const ledger = loadLedger();
  const errors = [];

  // 1. Ledger chain integrity
  errors.push(...verifyLedger(ledger));

  // 2. Every implementation-ready record must have a ledger entry
  const promotedRecordIds = new Set(ledger.entries.map((entry) => entry.recordId));
  for (const record of registry.records) {
    if (record.harmony?.status === 'implementation-ready') {
      if (!promotedRecordIds.has(record.id)) {
        errors.push(`record ${record.id}: harmony.status is 'implementation-ready' but no promotion ledger entry exists — hand-edited bypass`);
      }
      if (record.local?.status !== 'implementation-ready') {
        errors.push(`record ${record.id}: harmony.status is 'implementation-ready' but local.status is '${record.local?.status}' — source-side conversion not complete`);
      }
    }
  }

  // 3. Every ledger entry should still correspond to an implementation-ready record
  const registryRecords = new Map(registry.records.map((record) => [record.id, record]));
  for (const entry of ledger.entries) {
    const record = registryRecords.get(entry.recordId);
    if (!record) {
      errors.push(`ledger entry ${entry.entryHash.slice(0, 16)}: record ${entry.recordId} no longer exists in registry`);
    } else if (record.harmony?.status !== 'implementation-ready') {
      errors.push(`ledger entry ${entry.entryHash.slice(0, 16)}: record ${entry.recordId} harmony.status is '${record.harmony?.status}' — promoted then demoted without ledger entry`);
    }
  }

  // 4. Upstream and consumer artifacts must be byte-identical
  if (fs.existsSync(upstreamArtifactPath) && fs.existsSync(consumerArtifactPath)) {
    const upstreamHash = sha256(fs.readFileSync(upstreamArtifactPath, 'utf8'));
    const consumerHash = sha256(fs.readFileSync(consumerArtifactPath, 'utf8'));
    if (upstreamHash !== consumerHash) {
      errors.push(`upstream VisualAdmission.ets (${upstreamHash.slice(0, 20)}...) and HarmonyOS consumer copy (${consumerHash.slice(0, 20)}...) have diverged — run promote-family.mjs to resync, or run gen_contracts.mjs in Reader-for-HarmonyOS`);
    }
  }

  if (errors.length > 0) {
    console.error(`✗ promote-family --check: ${errors.length} inconsistency(es) found:`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  console.log(`✓ promote-family --check: ledger is consistent (${ledger.entries.length} entries, all chain-verified).`);
}

// ─── Promote mode: atomic transaction with backup/rollback ────────────────

function backupFile(target) {
  if (!fs.existsSync(target)) return null;
  return {
    path: target,
    content: fs.readFileSync(target),
  };
}

function restoreBackup(backup) {
  if (!backup) return;
  fs.writeFileSync(backup.path, backup.content);
}

function writeViaTemp(target, content) {
  // Write to a temp file in the same directory, then rename. This is atomic
  // on POSIX filesystems (rename is atomic). The temp file is created in the
  // same directory to guarantee the rename is on the same filesystem.
  const tempPath = `${target}.promote-tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tempPath, content);
  fs.renameSync(tempPath, target);
}

function promote(recordId) {
  const registry = readJson(registryPath);
  const record = registry.records.find((item) => item.id === recordId);
  if (!record) fail(`record not found: ${recordId}`);
  if (record.classification !== 'exact-figma-binding') {
    fail(`record ${recordId} classification is '${record.classification}', not 'exact-figma-binding' — only exact bindings can be promoted`);
  }

  console.log(`→ promote-family: ${recordId}`);

  // Prerequisite 1: local.status must already be implementation-ready
  if (record.local?.status !== 'implementation-ready') {
    fail(`record ${recordId}: local.status is '${record.local?.status}', not 'implementation-ready' — source-side conversion must self-promote first. Setting harmony.status by hand is the exact bypass this script prevents.`);
  }

  // Prerequisite 2: LOCAL_READY_FOR_FIGMA.json must exist and be ready
  const localReadyPath = localReadyForFigmaPath(recordId);
  if (!fs.existsSync(localReadyPath)) {
    fail(`record ${recordId}: LOCAL_READY_FOR_FIGMA.json not found at ${path.relative(repoRoot, localReadyPath)} — family '${handoffDirForRecordId(recordId)}' has no source-side readiness evidence`);
  }
  const localReady = readJson(localReadyPath);
  if (!localReady.admission?.localReadyForFigma) {
    fail(`record ${recordId}: ${path.relative(repoRoot, localReadyPath)} admission.localReadyForFigma is not true — source-side has not declared readiness`);
  }

  // Prerequisite 3: Figma binding revision must match the OFFICIAL current
  // revision evidence, not just the first registry record's revision. The
  // 2026-07-27 audit found the old check compared against "the first exact
  // record's revision" which could itself be stale.
  const officialRevision = readOfficialCurrentRevision();
  if (record.figma?.revision !== officialRevision) {
    fail(`record ${recordId}: figma.revision is '${record.figma?.revision}', official current revision (from F0_FIGMA_CURRENT_REVISION_EVIDENCE.json) is '${officialRevision}' — binding is stale`);
  }
  if (!record.figma?.nodeId || !record.figma?.canonicalMasterId) {
    fail(`record ${recordId}: figma binding is incomplete (missing nodeId or canonicalMasterId)`);
  }

  // Prerequisite 4: HarmonyOS consumer target files must exist AND the
  // #symbol suffix (if present) must be findable. The 2026-07-27 audit found
  // the old check only verified file existence, not symbol presence.
  if (!Array.isArray(record.harmony?.targets) || record.harmony.targets.length === 0) {
    fail(`record ${recordId}: harmony.targets is empty — no consumer to promote`);
  }
  const missingTargets = record.harmony.targets.filter((target) => !targetFileExists(target));
  if (missingTargets.length > 0) {
    fail(`record ${recordId}: harmony consumer target files/symbols not found:\n${missingTargets.map((target) => `    - ${target}`).join('\n')}`);
  }

  // Prerequisite 5: idempotent — refuse if already implementation-ready
  if (record.harmony?.status === 'implementation-ready') {
    fail(`record ${recordId}: harmony.status is already 'implementation-ready' — no promotion needed (idempotent refuse)`);
  }

  const previousHarmonyStatus = record.harmony?.status || 'unset';
  const handoffDir = handoffDirForRecordId(recordId);
  console.log(`  ✓ local.status = implementation-ready`);
  console.log(`  ✓ LOCAL_READY_FOR_FIGMA.json ready (stage: ${localReady.stage}, handoff: ${handoffDir})`);
  console.log(`  ✓ figma revision matches official evidence (${record.figma.revision})`);
  console.log(`  ✓ ${record.harmony.targets.length} harmony consumer target(s) verified (file + symbol)`);
  console.log(`  ✓ previous harmony.status = ${previousHarmonyStatus}`);

  // ── Phase 1: snapshot backups for rollback ─────────────────────────────
  const backup = {
    registry: backupFile(registryPath),
    upstreamArtifact: backupFile(upstreamArtifactPath),
    consumerArtifact: backupFile(consumerArtifactPath),
    ledger: backupFile(ledgerPath),
  };

  // ── Phase 2: compute pre-mutation registry hash ────────────────────────
  const registryContentBefore = fs.readFileSync(registryPath, 'utf8');
  const registryHashBefore = sha256(registryContentBefore);

  // ── Phase 3: mutate registry in memory, write FIRST so generator reads
  //    the new state. The 2026-07-27 audit found the old order (generator
  //    first, registry write last) produced a stale artifact because the
  //    generator read the OLD registry from disk. ────────────────────────
  record.harmony.status = 'implementation-ready';
  const registryContentAfter = JSON.stringify(registry, null, 2) + '\n';

  console.log(`  → writing new registry (atomic via temp + rename)`);
  writeViaTemp(registryPath, registryContentAfter);

  // ── Phase 4: regenerate upstream VisualAdmission.ets ───────────────────
  // The generator reads the registry from disk (which is now the NEW state).
  console.log(`  → regenerating upstream VisualAdmission.ets`);
  const generated = spawnSync('node', [generatorPath], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (generated.status !== 0) {
    console.error(`✗ record ${recordId}: generator failed during promotion — rolling back registry.`);
    restoreBackup(backup.registry);
    fail(`generator output:\n${generated.stderr?.toString() || generated.stdout?.toString()}`);
  }

  // ── Phase 5: sync upstream artifact to HarmonyOS consumer copy ─────────
  // The 2026-07-27 audit found these two files had diverged because the old
  // promotion flow never synced the consumer copy. gen_contracts.mjs in
  // Reader-for-HarmonyOS does this sync, but promotion must not depend on a
  // separate manual step — it must be part of the atomic transaction.
  if (!fs.existsSync(upstreamArtifactPath)) {
    console.error(`✗ record ${recordId}: upstream artifact not found after generation — rolling back.`);
    restoreBackup(backup.registry);
    restoreBackup(backup.upstreamArtifact);
    fail(`upstream artifact missing: ${upstreamArtifactPath}`);
  }
  const upstreamContent = fs.readFileSync(upstreamArtifactPath);
  console.log(`  → syncing consumer copy: ${path.relative(repoRoot, consumerArtifactPath)}`);
  if (!fs.existsSync(path.dirname(consumerArtifactPath))) {
    console.error(`✗ record ${recordId}: HarmonyOS consumer directory missing — rolling back.`);
    restoreBackup(backup.registry);
    restoreBackup(backup.upstreamArtifact);
    fail(`consumer directory does not exist: ${path.dirname(consumerArtifactPath)} — is Reader-for-HarmonyOS checked out?`);
  }
  writeViaTemp(consumerArtifactPath, upstreamContent);

  // ── Phase 6: verify upstream == consumer (byte-identical) ──────────────
  const upstreamHashAfter = sha256(fs.readFileSync(upstreamArtifactPath, 'utf8'));
  const consumerHashAfter = sha256(fs.readFileSync(consumerArtifactPath, 'utf8'));
  if (upstreamHashAfter !== consumerHashAfter) {
    console.error(`✗ record ${recordId}: upstream and consumer artifacts differ after sync — rolling back.`);
    restoreBackup(backup.registry);
    restoreBackup(backup.upstreamArtifact);
    restoreBackup(backup.consumerArtifact);
    fail(`upstream ${upstreamHashAfter.slice(0, 20)}... != consumer ${consumerHashAfter.slice(0, 20)}...`);
  }
  console.log(`  ✓ upstream == consumer (${upstreamHashAfter.slice(0, 20)}...)`);

  // ── Phase 7: append ledger entry ───────────────────────────────────────
  const ledger = loadLedger();
  const entry = {
    entryId: `promote-${String(ledger.entries.length + 1).padStart(3, '0')}`,
    timestamp: new Date().toISOString(),
    recordId,
    pageFamily: handoffDir,
    surfaceType: record.surfaceType || 'unknown',
    routeIds: record.routeIds || [],
    previousHarmonyStatus,
    newHarmonyStatus: 'implementation-ready',
    localStatus: record.local.status,
    localReadyForFigma: {
      path: path.relative(repoRoot, localReadyPath),
      stage: localReady.stage,
      status: localReady.status,
      localReadyForFigma: true,
    },
    figma: {
      fileKey: record.figma.fileKey,
      revision: record.figma.revision,
      officialCurrentRevision: officialRevision,
      nodeId: record.figma.nodeId,
      canonicalMasterId: record.figma.canonicalMasterId,
    },
    harmonyConsumerTargets: record.harmony.targets,
    harmonyConsumerTargetsVerified: true,
    registryHashBefore,
    upstreamArtifactHashAfter: upstreamHashAfter,
    consumerArtifactHashAfter: consumerHashAfter,
    artifactsInSync: upstreamHashAfter === consumerHashAfter,
    promotedBy: 'promote-family.mjs',
  };
  const fullEntry = appendLedgerEntry(ledger, entry);
  writeViaTemp(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);

  // ── Phase 8: final verification (read-back) ────────────────────────────
  const finalRegistry = readJson(registryPath);
  const finalRecord = finalRegistry.records.find((item) => item.id === recordId);
  if (!finalRecord || finalRecord.harmony?.status !== 'implementation-ready') {
    console.error(`✗ record ${recordId}: final registry read-back failed — rolling back.`);
    restoreBackup(backup.registry);
    restoreBackup(backup.upstreamArtifact);
    restoreBackup(backup.consumerArtifact);
    restoreBackup(backup.ledger);
    fail(`registry read-back did not show ${recordId} as implementation-ready`);
  }
  const finalUpstream = sha256(fs.readFileSync(upstreamArtifactPath, 'utf8'));
  const finalConsumer = sha256(fs.readFileSync(consumerArtifactPath, 'utf8'));
  if (finalUpstream !== upstreamHashAfter || finalConsumer !== consumerHashAfter) {
    console.error(`✗ record ${recordId}: artifact hash changed after commit — rolling back.`);
    restoreBackup(backup.registry);
    restoreBackup(backup.upstreamArtifact);
    restoreBackup(backup.consumerArtifact);
    restoreBackup(backup.ledger);
    fail(`hash drift detected: upstream ${finalUpstream.slice(0, 20)}... vs ${upstreamHashAfter.slice(0, 20)}..., consumer ${finalConsumer.slice(0, 20)}... vs ${consumerHashAfter.slice(0, 20)}...`);
  }

  console.log(`  ✓ registry updated (harmony.status: ${previousHarmonyStatus} → implementation-ready)`);
  console.log(`  ✓ VisualAdmission.ets regenerated (${upstreamHashAfter.slice(0, 20)}...)`);
  console.log(`  ✓ consumer copy synced (${consumerHashAfter.slice(0, 20)}...)`);
  console.log(`  ✓ ledger entry ${fullEntry.entryId} appended (${fullEntry.entryHash.slice(0, 20)}...)`);
  console.log(`✓ promote-family: ${recordId} promoted to implementation-ready`);
}

// ─── CLI ──────────────────────────────────────────────────────────────────

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node tools/design/promote-family.mjs <recordId>');
  console.error('       node tools/design/promote-family.mjs --check');
  process.exit(1);
}
if (arg === '--check') {
  runCheck();
} else {
  promote(arg);
}
