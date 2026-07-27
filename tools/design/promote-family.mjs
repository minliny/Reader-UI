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
const routeReconstructionQuarantinePath = path.join(
  repoRoot,
  'contracts',
  'fixtures',
  'route-reconstruction-quarantine.fixtures.json',
);

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
  // Reader is delivered surface-by-surface. The reading canvas cannot share
  // the historical reader-runtime packet with control overlays: doing so
  // would let evidence for this completed surface promote a sibling record.
  'reader.reading-surface': 'reader-runtime/reading-surface',
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
  const dir = RECORD_ID_TO_HANDOFF[recordId] || RECORD_ID_TO_HANDOFF[family];
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

// An active source-side quarantine is an explicit route extraction, not a
// renderer fallback. A record inside it cannot be promoted until its old
// native route mapping has been replaced by a new Figma-backed conversion.
// Keep this check in the promotion transaction itself so neither a hand-edited
// local.status nor a stale handoff packet can leap over the extraction.
function readRouteReconstructionQuarantine() {
  if (!fs.existsSync(routeReconstructionQuarantinePath)) {
    return { entries: [], status: 'missing', errors: [
      `route reconstruction quarantine is missing: ${path.relative(repoRoot, routeReconstructionQuarantinePath)}`,
    ] };
  }
  try {
    const document = readJson(routeReconstructionQuarantinePath);
    if (document === null || Array.isArray(document) || typeof document !== 'object') {
      return { entries: [], status: 'invalid', errors: ['route reconstruction quarantine must be an object'] };
    }
    if (document.schemaVersion !== 1 || (document.status !== 'active' && document.status !== 'released') || !Array.isArray(document.entries)) {
      return { entries: [], status: 'invalid', errors: ['route reconstruction quarantine has an invalid schemaVersion, status, or entries field'] };
    }
    const entries = [];
    for (const [index, entry] of document.entries.entries()) {
      if (entry === null || Array.isArray(entry) || typeof entry !== 'object' ||
        typeof entry.recordId !== 'string' || entry.recordId.length === 0 ||
        !Array.isArray(entry.routeIds) || entry.routeIds.length === 0 || entry.blocksPromotion !== true ||
        (entry.status !== 'active' && entry.status !== 'released')) {
        return { entries: [], status: 'invalid', errors: [`route reconstruction quarantine entry ${index + 1} is invalid`] };
      }
      entries.push({ recordId: entry.recordId, routeIds: entry.routeIds, status: entry.status });
    }
    if (document.status === 'released' && entries.some((entry) => entry.status === 'active')) {
      return { entries: [], status: 'invalid', errors: ['a globally released route reconstruction quarantine cannot retain an active entry'] };
    }
    return { entries, status: document.status, errors: [] };
  } catch (error) {
    return { entries: [], status: 'invalid', errors: [
      `route reconstruction quarantine could not be read: ${error instanceof Error ? error.message : String(error)}`,
    ] };
  }
}

function activeQuarantineEntries() {
  const quarantine = readRouteReconstructionQuarantine();
  if (quarantine.errors.length > 0 || quarantine.status !== 'active') return quarantine;
  return quarantine;
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

// ─── Source-side evidence verification (anti-bypass layer 1, 2026-07-27 audit
// finding 3: local.status was a hand-fillable boolean field) ────────────────
// The 2026-07-27 second audit found that an agent could hand-edit local.status
// and LOCAL_READY_FOR_FIGMA.json's admission.localReadyForFigma to true without
// actually completing source-side conversion. These functions verify that the
// evidence in LOCAL_READY_FOR_FIGMA.json is internally consistent and bound to
// real artifacts, rather than just trusting the boolean field.

function computeHandoffDirHash(handoffDirPath) {
  // Recursively hash all files in the handoff directory (excluding
  // LOCAL_READY_FOR_FIGMA.json itself, since it contains the declared hash).
  // This binds the promotion to the exact handoff content — if any file in
  // the handoff directory changes after promotion, the hash will not match
  // and the next --check will fail.
  if (!fs.existsSync(handoffDirPath)) {
    return null;
  }
  const entries = [];
  function walk(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    items.sort((a, b) => a.name.localeCompare(b.name));
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        walk(fullPath);
      } else if (item.isFile() && item.name !== 'LOCAL_READY_FOR_FIGMA.json') {
        const relPath = path.relative(handoffDirPath, fullPath);
        const content = fs.readFileSync(fullPath);
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        entries.push(`${relPath}:${hash}`);
      }
    }
  }
  walk(handoffDirPath);
  return `sha256:${crypto.createHash('sha256').update(entries.join('\n')).digest('hex')}`;
}

function verifyGitCommitExists(commitSha) {
  if (!commitSha || typeof commitSha !== 'string') {
    return { ok: false, reason: 'commit SHA is missing or not a string' };
  }
  // PENDING_EVIDENCE_COMMIT_SELF_REFERENTIAL is a placeholder used during
  // handoff creation; it must be replaced with a real commit before promotion.
  if (commitSha.startsWith('PENDING_')) {
    return { ok: false, reason: `commit SHA is a placeholder: ${commitSha}` };
  }
  const result = spawnSync('git', ['cat-file', '-t', commitSha], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    return { ok: false, reason: `git commit not found: ${commitSha}` };
  }
  const type = result.stdout.toString().trim();
  if (type !== 'commit') {
    return { ok: false, reason: `${commitSha} is a ${type}, not a commit` };
  }
  return { ok: true };
}

function verifyLocalReadyEvidence(record, localReady, localReadyPath) {
  const recordId = record.id;
  const errors = [];

  // Check 1: verification field — all test suites must have passed === tests
  const verification = localReady.verification;
  if (!verification || typeof verification !== 'object') {
    errors.push('verification field is missing or not an object');
  } else {
    for (const [suiteName, suite] of Object.entries(verification)) {
      if (suiteName === 'identityDenominator' || suiteName === 'identityDistribution' || suiteName === 'liveDomSmoke' || suiteName === 'byteStableChecks') {
        // These are metadata fields, not test suites with passed/tests counts.
        continue;
      }
      if (typeof suite !== 'object' || suite === null) continue;
      if (typeof suite.tests === 'number' && typeof suite.passed === 'number') {
        if (suite.passed !== suite.tests) {
          errors.push(`verification.${suiteName}: passed=${suite.passed} but tests=${suite.tests} — source-side tests are not all passing`);
        }
        if (suite.failed !== undefined && suite.failed !== 0) {
          errors.push(`verification.${suiteName}: failed=${suite.failed} — source-side tests have failures`);
        }
      }
    }
  }

  // A readiness packet is evidence for the named record only. Family-wide
  // handoff reuse was a bypass: a completed reading surface could otherwise
  // be used to promote an unfinished Reader overlay sharing the same prefix.
  const declaredRecordIds = localReady.admission?.recordIds;
  if (!Array.isArray(declaredRecordIds) || !declaredRecordIds.includes(recordId)) {
    errors.push(`admission.recordIds must include '${recordId}' — a handoff packet cannot authorize a sibling record by family prefix alone`);
  }

  // Check 2: localSource.implementationCommit must be a real git commit
  const implCommit = localReady.localSource?.implementationCommit;
  const commitCheck = verifyGitCommitExists(implCommit);
  if (!commitCheck.ok) {
    errors.push(`localSource.implementationCommit: ${commitCheck.reason}`);
  }

  // Check 3: sourceEvidenceHash must match the actual handoff directory hash
  // This is the key anti-bypass: if an agent hand-edits LOCAL_READY_FOR_FIGMA.json
  // to claim readiness, they would also need to compute the correct hash of the
  // entire handoff directory. While this is computationally possible, it makes
  // the bypass visible in the diff and binds the promotion to exact content.
  const handoffDir = path.dirname(localReadyPath);
  const declaredHash = localReady.sourceEvidenceHash;
  const actualHash = computeHandoffDirHash(handoffDir);
  if (!declaredHash) {
    errors.push('sourceEvidenceHash is missing — LOCAL_READY_FOR_FIGMA.json must declare the SHA-256 of the handoff directory (excluding itself)');
  } else if (actualHash && declaredHash !== actualHash) {
    errors.push(`sourceEvidenceHash mismatch: declared '${declaredHash}' but actual handoff dir hash is '${actualHash}' — handoff directory has been modified after the hash was declared, or the hash was fabricated`);
  }

  return errors;
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
  const quarantine = activeQuarantineEntries();

  // 1. Ledger chain integrity
  errors.push(...verifyLedger(ledger));
  errors.push(...quarantine.errors);

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

  // 3a. Each active source quarantine entry withdraws both promotion
  // dimensions. A released entry is deliberately narrower: it records that
  // this record's Reader-UI conversion has completed, but it still requires
  // this atomic transaction before HarmonyOS becomes implementation-ready.
  if (quarantine.status === 'active') {
    for (const entry of quarantine.entries) {
      const record = registryRecords.get(entry.recordId);
      if (!record) {
        errors.push(`route reconstruction quarantine references missing record ${entry.recordId}`);
        continue;
      }
      if (entry.status === 'active') {
        if (record.local?.status !== 'candidate-backport' || record.harmony?.status !== 'candidate-backport') {
          errors.push(`active route reconstruction quarantine record ${entry.recordId} must be candidate-backport on both local and harmony status (got local=${record.local?.status}, harmony=${record.harmony?.status})`);
        }
        if (promotedRecordIds.has(entry.recordId)) {
          errors.push(`active route reconstruction quarantine record ${entry.recordId} has a promotion ledger entry`);
        }
      } else if (record.local?.status !== 'implementation-ready') {
        errors.push(`released route reconstruction quarantine record ${entry.recordId} must have local.status implementation-ready before it can await promotion (got ${record.local?.status})`);
      }
      const recordRouteIds = Array.isArray(record.routeIds) ? record.routeIds : [];
      if (JSON.stringify(recordRouteIds) !== JSON.stringify(entry.routeIds)) {
        errors.push(`route reconstruction quarantine route set for ${entry.recordId} no longer matches the registry record`);
      }
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
  // Always return an object so restoreBackup can distinguish "file did not
  // exist before" (must delete on rollback) from "file existed" (must restore
  // content on rollback). Returning null for non-existent files made
  // rollback leave newly-created files behind, breaking transaction atomicity.
  if (!fs.existsSync(target)) {
    return { path: target, existed: false, content: null };
  }
  return {
    path: target,
    existed: true,
    content: fs.readFileSync(target),
  };
}

function restoreBackup(backup) {
  if (!backup) return;
  if (!backup.existed) {
    // File did not exist before the transaction. If it was created during
    // the transaction, delete it to restore the pre-transaction state.
    if (fs.existsSync(backup.path)) {
      fs.unlinkSync(backup.path);
    }
    return;
  }
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

// ─── Fault injection (test-only) ──────────────────────────────────────────
// When PROMOTE_TEST_MODE=1 is set, the caller can inject a fault after any
// write phase by setting one of:
//   PROMOTE_FAULT_AFTER_REGISTRY_WRITE=1
//   PROMOTE_FAULT_AFTER_GENERATOR=1
//   PROMOTE_FAULT_AFTER_CONSUMER_SYNC=1
//   PROMOTE_FAULT_AFTER_LEDGER_WRITE=1
//   PROMOTE_FAULT_IN_FINAL_VERIFY=1
// The fault throws an injected error, which the promote() function's catch
// block catches and rolls back ALL four files. This lets the test suite
// verify that rollback actually restores the pre-transaction state at every
// phase, without depending on real disk/process failures.
//
// Outside PROMOTE_TEST_MODE these env vars are ignored, so a stray env var
// in a real environment cannot trip the fault.

function faultInject(phase) {
  if (process.env.PROMOTE_TEST_MODE !== '1') return;
  const varName = `PROMOTE_FAULT_${phase}`;
  if (process.env[varName] !== '1') return;
  throw new Error(`injected fault: ${phase}`);
}

function promote(recordId) {
  const registry = readJson(registryPath);
  const record = registry.records.find((item) => item.id === recordId);
  if (!record) fail(`record not found: ${recordId}`);
  if (record.classification !== 'exact-figma-binding') {
    fail(`record ${recordId} classification is '${record.classification}', not 'exact-figma-binding' — only exact bindings can be promoted`);
  }

  console.log(`→ promote-family: ${recordId}`);

  const quarantine = activeQuarantineEntries();
  if (quarantine.errors.length > 0) {
    fail(quarantine.errors.join('; '));
  }
  if (quarantine.status === 'active' && quarantine.entries.some((entry) => entry.recordId === recordId && entry.status === 'active')) {
    fail(`record ${recordId} is actively route-quarantined at the Reader-UI source. Complete a new Figma-backed reconstruction and release the source extraction before promotion.`);
  }

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

  // Prerequisite 2a (2026-07-27 audit finding 3): local.status is not a
  // hand-fillable boolean — verify the evidence in LOCAL_READY_FOR_FIGMA.json
  // is internally consistent and bound to real artifacts.
  const evidenceErrors = verifyLocalReadyEvidence(record, localReady, localReadyPath);
  if (evidenceErrors.length > 0) {
    fail(`record ${recordId}: LOCAL_READY_FOR_FIGMA.json evidence verification failed:\n${evidenceErrors.map((e) => `    - ${e}`).join('\n')}`);
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

  // The transaction body (Phases 2-8) is wrapped in try/catch so ANY error
  // — expected (generator failure, hash mismatch), injected (PROMOTE_FAULT_*),
  // or unexpected (disk error, ENOSPC) — triggers a full four-file rollback.
  // This is the in-process atomicity guarantee: either all four files end up
  // in the post-transaction state, or all four are restored to the
  // pre-transaction state. Cross-process crash recovery is documented as a
  // known limitation (see FIGMA_TO_NATIVE_AGENT_EXECUTION_PROTOCOL.md §9.6);
  // Layer 3 (CI from a clean checkout) is the backstop for that scenario.
  let fullEntry;
  let upstreamHashAfter;
  let consumerHashAfter;
  try {
    // ── Phase 2: compute pre-mutation registry hash ──────────────────────
    const registryContentBefore = fs.readFileSync(registryPath, 'utf8');
    const registryHashBefore = sha256(registryContentBefore);

    // ── Phase 3: mutate registry in memory, write FIRST so generator reads
    //    the new state. The 2026-07-27 audit found the old order (generator
    //    first, registry write last) produced a stale artifact because the
    //    generator read the OLD registry from disk. ──────────────────────
    record.harmony.status = 'implementation-ready';
    const registryContentAfter = JSON.stringify(registry, null, 2) + '\n';

    console.log(`  → writing new registry (atomic via temp + rename)`);
    writeViaTemp(registryPath, registryContentAfter);
    faultInject('AFTER_REGISTRY_WRITE');

    // ── Phase 4: regenerate upstream VisualAdmission.ets ─────────────────
    // The generator reads the registry from disk (which is now the NEW state).
    console.log(`  → regenerating upstream VisualAdmission.ets`);
    const generated = spawnSync('node', [generatorPath], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (generated.status !== 0) {
      throw new Error(`generator failed during promotion. Output:\n${generated.stderr?.toString() || generated.stdout?.toString()}`);
    }
    if (!fs.existsSync(upstreamArtifactPath)) {
      throw new Error(`upstream artifact missing after generation: ${upstreamArtifactPath}`);
    }
    faultInject('AFTER_GENERATOR');

    // ── Phase 5: sync upstream artifact to HarmonyOS consumer copy ───────
    // The 2026-07-27 audit found these two files had diverged because the old
    // promotion flow never synced the consumer copy. gen_contracts.mjs in
    // Reader-for-HarmonyOS does this sync, but promotion must not depend on a
    // separate manual step — it must be part of the atomic transaction.
    const upstreamContent = fs.readFileSync(upstreamArtifactPath);
    console.log(`  → syncing consumer copy: ${path.relative(repoRoot, consumerArtifactPath)}`);
    if (!fs.existsSync(path.dirname(consumerArtifactPath))) {
      throw new Error(`HarmonyOS consumer directory does not exist: ${path.dirname(consumerArtifactPath)} — is Reader-for-HarmonyOS checked out?`);
    }
    writeViaTemp(consumerArtifactPath, upstreamContent);

    // ── Phase 6: verify upstream == consumer (byte-identical) ────────────
    upstreamHashAfter = sha256(fs.readFileSync(upstreamArtifactPath, 'utf8'));
    consumerHashAfter = sha256(fs.readFileSync(consumerArtifactPath, 'utf8'));
    if (upstreamHashAfter !== consumerHashAfter) {
      throw new Error(`upstream and consumer artifacts differ after sync: upstream ${upstreamHashAfter.slice(0, 20)}... != consumer ${consumerHashAfter.slice(0, 20)}...`);
    }
    console.log(`  ✓ upstream == consumer (${upstreamHashAfter.slice(0, 20)}...)`);
    faultInject('AFTER_CONSUMER_SYNC');

    // ── Phase 7: append ledger entry ─────────────────────────────────────
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
        sourceEvidenceHash: localReady.sourceEvidenceHash,
        implementationCommit: localReady.localSource?.implementationCommit,
        verificationSuites: Object.entries(localReady.verification || {})
          .filter(([_, v]) => v && typeof v.tests === 'number')
          .map(([k, v]) => ({ suite: k, tests: v.tests, passed: v.passed, failed: v.failed || 0 })),
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
    fullEntry = appendLedgerEntry(ledger, entry);
    writeViaTemp(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    faultInject('AFTER_LEDGER_WRITE');

    // ── Phase 8: final verification (read-back) ──────────────────────────
    faultInject('IN_FINAL_VERIFY');
    const finalRegistry = readJson(registryPath);
    const finalRecord = finalRegistry.records.find((item) => item.id === recordId);
    if (!finalRecord || finalRecord.harmony?.status !== 'implementation-ready') {
      throw new Error(`registry read-back did not show ${recordId} as implementation-ready`);
    }
    const finalUpstream = sha256(fs.readFileSync(upstreamArtifactPath, 'utf8'));
    const finalConsumer = sha256(fs.readFileSync(consumerArtifactPath, 'utf8'));
    if (finalUpstream !== upstreamHashAfter || finalConsumer !== consumerHashAfter) {
      throw new Error(`artifact hash drift detected after commit: upstream ${finalUpstream.slice(0, 20)}... vs ${upstreamHashAfter.slice(0, 20)}..., consumer ${finalConsumer.slice(0, 20)}... vs ${consumerHashAfter.slice(0, 20)}...`);
    }
  } catch (err) {
    // Catch-all: any error in the transaction body triggers full four-file
    // rollback. This covers expected errors (generator failure, hash mismatch),
    // injected faults (PROMOTE_FAULT_*), and unexpected errors (disk I/O).
    console.error(`✗ promote-family: ${recordId} transaction failed — rolling back all four files.`);
    console.error(`  error: ${err.message}`);
    restoreBackup(backup.registry);
    restoreBackup(backup.upstreamArtifact);
    restoreBackup(backup.consumerArtifact);
    restoreBackup(backup.ledger);
    process.exit(1);
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
