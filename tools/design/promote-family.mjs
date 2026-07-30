#!/usr/bin/env node
// promote-family.mjs — the ONLY authorized way to transition
// harmony.status in FIGMA_VISUAL_ADMISSION_REGISTRY.json.
//
// On 2026-07-27 an audit found that 28 records had harmony.status set to
// 'implementation-ready' while their local.status was still 'candidate-backport'.
// That is the bypass path this script closes: hand-editing harmony.status
// directly, without source-side conversion being complete.
//
// This script contains two atomic, auditable transactions:
//
// Promotion verifies ALL prerequisites before mutating anything, then atomically:
//   1. sets harmony.status = 'implementation-ready' in the registry
//   2. regenerates Reader-UI generated/arkts/VisualAdmission.ets
//   3. syncs the regenerated artifact to Reader-for-HarmonyOS consumer copy
//   4. appends a tamper-evident entry to PROMOTION_LEDGER.json
//
// Retraction is the only authorized way to withdraw a prior promotion when a
// newly-discovered precondition (for example a failed route-isolation audit)
// means native consumption must stop. It atomically sets harmony.status back
// to 'candidate-backport', regenerates/syncs the two artifacts, and appends a
// hash-chained reversal entry. It never deletes or rewrites prior ledger
// history, and it does not alter local.status: source conversion evidence is
// retained but must be replaced with fresh evidence before a later promotion.
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
//   node tools/design/promote-family.mjs --group <anchorRecordId>
//   node tools/design/promote-family.mjs --retract <recordId> --reason <reason>
//   node tools/design/promote-family.mjs --retract-group <anchorRecordId> --reason <reason>
//   node tools/design/promote-family.mjs --check   # verify ledger consistency without mutating

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { acquireWriterLock } from '../shared/shared-writer-lock.mjs';
import { verifyA2PrePromotionReceipt } from './native-consumer-receipts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const registryPath = path.join(repoRoot, 'docs', 'design', 'FIGMA_VISUAL_ADMISSION_REGISTRY.json');
const ledgerPath = path.join(repoRoot, 'docs', 'design', 'PROMOTION_LEDGER.json');
const handoffsDir = path.join(repoRoot, 'docs', 'design', 'handoffs');
const generatorPath = path.join(repoRoot, 'tools', 'design', 'generate-visual-admission-contract.mjs');
const upstreamArtifactPath = path.join(repoRoot, 'generated', 'arkts', 'VisualAdmission.ets');
const revisionEvidencePath = path.join(repoRoot, 'docs', 'design', 'F0_FIGMA_CURRENT_REVISION_EVIDENCE.json');
const admissionDependenciesPath = path.join(
  repoRoot,
  'docs',
  'design',
  'FIGMA_VISUAL_ADMISSION_DEPENDENCIES.json',
);
const runtimePayloadSpecPath = path.join(repoRoot, 'ui-spec', 'runtime-payload-contracts.json');
const runtimePayloadSourceCheckerPath = path.join(
  repoRoot,
  'tools',
  'runtime',
  'check-runtime-payload-source.mjs',
);
const runtimeGeneratorPath = path.join(repoRoot, 'tools', 'runtime', 'generate-runtime.mjs');
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
  'reader.control-home': 'reader-runtime/control-home',
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

function sameStringSet(left, right) {
  if (left.size !== right.size) return false;
  for (const value of left) if (!right.has(value)) return false;
  return true;
}

function fail(message) {
  console.error(`✗ promote-family: ${message}`);
  process.exit(1);
}

function readJson(target) {
  return JSON.parse(fs.readFileSync(target, 'utf8'));
}

function resolveRealPath(target) {
  if (!fs.existsSync(target)) return target;
  try {
    return fs.realpathSync(target);
  } catch {
    return target;
  }
}

function transactionLockPath() {
  // check-runtime-payload-source.mjs derives the repin/recover lock from the
  // real runtime-payload spec path. Promotion and retraction must contend on
  // that exact path as well; otherwise a repin can change the dependency
  // authority while admission is being promoted.
  return `${resolveRealPath(runtimePayloadSpecPath)}.repin.lock`;
}

function acquireTransactionLock() {
  const lockFile = transactionLockPath();
  try {
    const release = acquireWriterLock({ lockFile });
    // Several historical failure paths call process.exit(). Node runs this
    // synchronous exit listener before terminating, so the lock is released
    // even when those paths bypass ordinary finally unwinding. release() is
    // idempotent and the normal finally below remains the primary path.
    process.once('exit', release);
    return release;
  } catch (error) {
    fail(
      `could not acquire shared authority-writer lock ${lockFile}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function verifyTrackedAndClean(target, label) {
  const relativePath = path.relative(repoRoot, target);
  const tracked = spawnSync('git', ['ls-files', '--error-unmatch', '--', relativePath], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (tracked.status !== 0) {
    return [`${label} is not tracked in HEAD: ${relativePath}`];
  }
  const unstaged = spawnSync('git', ['diff', '--quiet', '--', relativePath], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const staged = spawnSync('git', ['diff', '--cached', '--quiet', '--', relativePath], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const errors = [];
  if (unstaged.status !== 0 || staged.status !== 0) {
    errors.push(`${label} is not clean relative to HEAD: ${relativePath}`);
  }
  return errors;
}

function readAdmissionDependencies() {
  if (!fs.existsSync(admissionDependenciesPath)) {
    fail(
      `visual admission dependency document is missing at ` +
      path.relative(repoRoot, admissionDependenciesPath),
    );
  }
  const dependencies = readJson(admissionDependenciesPath);
  if (
    dependencies?.kind !== 'FIGMA_VISUAL_ADMISSION_DEPENDENCIES' ||
    dependencies?.schemaVersion !== '1.1.0' ||
    !Array.isArray(dependencies.sourceAuthorities) ||
    !Array.isArray(dependencies.nativeA2ConsumerClosures) ||
    !Array.isArray(dependencies.dependencies)
  ) {
    fail(`visual admission dependency document is malformed or not schemaVersion 1.1.0`);
  }
  return dependencies;
}

function runRuntimePrePromotionChecks(recordId, dependencies) {
  const runtimeAuthority = dependencies.sourceAuthorities.find(
    (entry) => entry?.recordId === recordId,
  )?.runtimeContract;
  if (!runtimeAuthority) return;

  const expectedChecks = [
    'node tools/runtime/check-runtime-payload-source.mjs',
    'node tools/runtime/generate-runtime.mjs --check',
  ];
  if (JSON.stringify(runtimeAuthority.prePromotionChecks) !== JSON.stringify(expectedChecks)) {
    fail(
      `record ${recordId}: runtime authority must declare the exact two B4 pre-promotion checks`,
    );
  }

  const cleanlinessErrors = [
    ...verifyTrackedAndClean(runtimePayloadSpecPath, 'runtime payload source authority'),
    ...verifyTrackedAndClean(admissionDependenciesPath, 'visual admission dependency document'),
  ];
  if (cleanlinessErrors.length > 0) {
    fail(
      `record ${recordId}: runtime authority is not committed and clean:\n` +
      cleanlinessErrors.map((error) => `    - ${error}`).join('\n'),
    );
  }

  const commands = [
    [runtimePayloadSourceCheckerPath],
    [runtimeGeneratorPath, '--check'],
  ];
  for (const command of commands) {
    const result = spawnSync(process.execPath, command, {
      cwd: repoRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
    if (result.status !== 0) {
      const output = result.stderr?.toString().trim() || result.stdout?.toString().trim();
      const displayCommand = command.map((item) =>
        path.isAbsolute(item) ? path.relative(repoRoot, item) : item
      );
      fail(
        `record ${recordId}: B4 pre-promotion check failed: ` +
        `${['node', ...displayCommand].join(' ')}${
          output ? `\n${output}` : ''
        }`,
      );
    }
  }
  console.log(`  ✓ runtime Core authority and generated runtime checks passed`);
}

function nativeA2ClosureForRecordIds(dependencies, recordIds) {
  const requested = new Set(recordIds);
  const matches = dependencies.nativeA2ConsumerClosures.filter((entry) => {
    if (!Array.isArray(entry?.recordIds) || entry.recordIds.length !== requested.size) {
      return false;
    }
    return sameStringSet(new Set(entry.recordIds), requested);
  });
  if (matches.length !== 1) {
    fail(
      `record set [${recordIds.join(', ')}]: expected exactly one ` +
      `nativeA2ConsumerClosures entry, found ${matches.length}`,
    );
  }
  const closure = matches[0];
  if (
    typeof closure.prePromotionReceipt !== 'string' ||
    closure.prePromotionReceipt.length === 0 ||
    typeof closure.postPromotionReceipt !== 'string' ||
    closure.postPromotionReceipt.length === 0
  ) {
    fail(`record set [${recordIds.join(', ')}]: native A2 closure paths are incomplete`);
  }
  return closure;
}

function dependencyErrorsForRecords(registry, recordIds, dependencies, prospectivePromotion) {
  const errors = [];
  const promotedSet = new Set(recordIds);
  const recordsById = new Map(registry.records.map((record) => [record.id, record]));
  for (const recordId of recordIds) {
    const dependency = dependencies.dependencies.find((entry) => entry?.recordId === recordId);
    if (!dependency) continue;
    if (!Array.isArray(dependency.requires)) {
      errors.push(`record ${recordId}: dependency entry has no requires array`);
      continue;
    }
    for (const requirement of dependency.requires) {
      const requiredRecord = recordsById.get(requirement.recordId);
      if (!requiredRecord) {
        errors.push(`record ${recordId}: required record ${requirement.recordId} does not exist`);
        continue;
      }
      const observedLocal = requiredRecord.local?.status;
      const observedHarmony =
        prospectivePromotion && promotedSet.has(requirement.recordId)
          ? 'implementation-ready'
          : requiredRecord.harmony?.status;
      if (observedLocal !== requirement.localStatus) {
        errors.push(
          `record ${recordId}: dependency ${requirement.recordId} local.status ` +
          `is '${observedLocal}', expected '${requirement.localStatus}'`,
        );
      }
      if (observedHarmony !== requirement.harmonyStatus) {
        errors.push(
          `record ${recordId}: dependency ${requirement.recordId} harmony.status ` +
          `is '${observedHarmony}', expected '${requirement.harmonyStatus}'`,
        );
      }
    }
  }
  return errors;
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
  } else {
    const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', implCommit, 'HEAD'], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (ancestor.status !== 0) {
      errors.push(
        `localSource.implementationCommit ${implCommit} is not an ancestor of current HEAD`,
      );
    }
  }
  if (localReady.admission?.exactLocalCommit !== implCommit) {
    errors.push(
      `admission.exactLocalCommit must equal localSource.implementationCommit (${implCommit})`,
    );
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

  errors.push(...verifyTrackedAndClean(localReadyPath, 'LOCAL_READY_FOR_FIGMA packet'));

  return errors;
}

function verifyFreshEvidenceAfterRetraction(recordId, localReady, latestLedgerEntry) {
  if (!latestLedgerEntry || ledgerEntryOperation(latestLedgerEntry) !== 'retract') return [];

  // A retraction is not a retry button. A later promotion must be bound to a
  // newly-produced B2/B3 packet, rather than reusing the evidence that was
  // explicitly withdrawn. Both fields are required so changing a prose-only
  // file or merely pointing to the same implementation commit cannot reopen
  // native consumption.
  const errors = [];
  const withdrawnHash = latestLedgerEntry.retractedPromotion?.sourceEvidenceHash;
  const withdrawnCommit = latestLedgerEntry.retractedPromotion?.implementationCommit;
  const currentHash = localReady.sourceEvidenceHash;
  const currentCommit = localReady.localSource?.implementationCommit;
  if (!withdrawnHash || !withdrawnCommit) {
    errors.push(`latest retraction for ${recordId} lacks withdrawn source evidence metadata — manual review is required before promotion`);
    return errors;
  }
  if (currentHash === withdrawnHash) {
    errors.push(`sourceEvidenceHash still equals the packet withdrawn by ${latestLedgerEntry.entryId}; complete and certify a new B2/B3 source conversion before re-promoting`);
  }
  if (currentCommit === withdrawnCommit) {
    errors.push(`implementationCommit still equals the commit withdrawn by ${latestLedgerEntry.entryId}; a new source conversion commit is required before re-promoting`);
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

function ledgerEntryOperation(entry) {
  // `kind` was introduced after the first promotion records existed. Treat a
  // missing kind as the legacy spelling of a promotion so old, valid ledgers
  // remain checkable without rewriting history.
  if (entry.kind === undefined || entry.kind === 'promote') return 'promote';
  if (entry.kind === 'retract') return 'retract';
  return 'invalid';
}

function latestLedgerEntriesByRecord(ledger) {
  const latest = new Map();
  for (const entry of ledger.entries) latest.set(entry.recordId, entry);
  return latest;
}

function verifyLedger(ledger) {
  const errors = [];
  let previousHash = 'genesis';
  const entriesByHash = new Map();
  const lastEntryByRecord = new Map();
  const transactionGroups = new Map();
  for (let index = 0; index < ledger.entries.length; index += 1) {
    const entry = ledger.entries[index];
    if (entry.previousEntryHash !== previousHash) {
      errors.push(`ledger entry ${index + 1} (${entry.recordId}): previousEntryHash mismatch (expected ${previousHash}, got ${entry.previousEntryHash}) — chain broken`);
    }
    const recomputed = computeEntryHash(entry);
    if (entry.entryHash !== recomputed) {
      errors.push(`ledger entry ${index + 1} (${entry.recordId}): entryHash mismatch — entry was tampered with after creation`);
    }
    const operation = ledgerEntryOperation(entry);
    if (operation === 'invalid') {
      errors.push(`ledger entry ${index + 1} (${entry.recordId}): invalid kind '${entry.kind}'`);
    } else if (operation === 'retract') {
      const reversed = entriesByHash.get(entry.reversalOf);
      if (!entry.reversalOf || !reversed) {
        errors.push(`ledger entry ${index + 1} (${entry.recordId}): retract must reference an earlier promotion with reversalOf`);
      } else if (reversed.recordId !== entry.recordId || ledgerEntryOperation(reversed) !== 'promote') {
        errors.push(`ledger entry ${index + 1} (${entry.recordId}): reversalOf must reference a promotion for the same record`);
      } else if (lastEntryByRecord.get(entry.recordId) !== reversed) {
        errors.push(`ledger entry ${index + 1} (${entry.recordId}): retract must reverse the record's current promotion, not an older entry`);
      }
      if (entry.newHarmonyStatus !== 'candidate-backport') {
        errors.push(`ledger entry ${index + 1} (${entry.recordId}): retract newHarmonyStatus must be 'candidate-backport'`);
      }
    } else if (entry.newHarmonyStatus !== 'implementation-ready') {
      errors.push(`ledger entry ${index + 1} (${entry.recordId}): promotion newHarmonyStatus must be 'implementation-ready'`);
    }
    if (entry.a2PrePromotionReceipt !== undefined) {
      const receipt = entry.a2PrePromotionReceipt;
      if (
        receipt === null ||
        typeof receipt !== 'object' ||
        typeof receipt.path !== 'string' ||
        typeof receipt.sha256 !== 'string' ||
        typeof receipt.cleanupCommit !== 'string' ||
        receipt.status !== 'a2-consumer-closed' ||
        receipt.mode !== 'pre-promotion'
      ) {
        errors.push(
          `ledger entry ${index + 1} (${entry.recordId}): invalid a2PrePromotionReceipt metadata`,
        );
      }
    }

    const hasTransactionId =
      typeof entry.transactionId === 'string' && entry.transactionId.length > 0;
    const hasTransactionRecordIds = Array.isArray(entry.transactionRecordIds);
    if (hasTransactionId !== hasTransactionRecordIds) {
      errors.push(`ledger entry ${index + 1} (${entry.recordId}): transactionId and transactionRecordIds must either both be present or both be absent`);
    } else if (hasTransactionId) {
      const declaredRecordIds = entry.transactionRecordIds;
      const declaredSet = new Set(declaredRecordIds);
      if (
        declaredRecordIds.length === 0 ||
        declaredSet.size !== declaredRecordIds.length ||
        declaredRecordIds.some((recordId) => typeof recordId !== 'string' || recordId.length === 0)
      ) {
        errors.push(`ledger entry ${index + 1} (${entry.recordId}): transactionRecordIds must be a non-empty unique string list`);
      }
      if (!declaredSet.has(entry.recordId)) {
        errors.push(`ledger entry ${index + 1} (${entry.recordId}): transactionRecordIds does not include its own recordId`);
      }

      const signature = [...declaredSet].sort().join('\u0000');
      const group = transactionGroups.get(entry.transactionId);
      if (!group) {
        transactionGroups.set(entry.transactionId, {
          operation,
          signature,
          timestamp: entry.timestamp,
          declaredRecordIds: [...declaredSet],
          entries: [entry],
        });
      } else {
        group.entries.push(entry);
        if (group.operation !== operation) {
          errors.push(`ledger transaction ${entry.transactionId}: mixes '${group.operation}' and '${operation}' entries`);
        }
        if (group.signature !== signature) {
          errors.push(`ledger transaction ${entry.transactionId}: members declare different transactionRecordIds sets`);
        }
        if (group.timestamp !== entry.timestamp) {
          errors.push(`ledger transaction ${entry.transactionId}: members have different timestamps`);
        }
      }
    }

    entriesByHash.set(entry.entryHash, entry);
    lastEntryByRecord.set(entry.recordId, entry);
    previousHash = entry.entryHash;
  }

  for (const [transactionId, group] of transactionGroups) {
    const actualRecordIds = group.entries.map((entry) => entry.recordId);
    const actualSet = new Set(actualRecordIds);
    const declaredSet = new Set(group.declaredRecordIds);
    if (
      actualSet.size !== actualRecordIds.length ||
      !sameStringSet(actualSet, declaredSet)
    ) {
      errors.push(
        `ledger transaction ${transactionId}: expected exactly one entry for each of ` +
        `[${group.declaredRecordIds.join(', ')}], got [${actualRecordIds.join(', ')}]`,
      );
    }
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
  const dependencies = readAdmissionDependencies();

  // 1. Ledger chain integrity
  errors.push(...verifyLedger(ledger));
  errors.push(...quarantine.errors);
  errors.push(
    ...verifyTrackedAndClean(
      admissionDependenciesPath,
      'visual admission dependency document',
    ),
  );

  // 2. The latest ledger entry, rather than any historical entry, is the
  // authoritative transition state for a record. A valid retract intentionally
  // leaves a historical promotion in the append-only chain.
  const latestEntriesByRecord = latestLedgerEntriesByRecord(ledger);
  for (const record of registry.records) {
    const latestEntry = latestEntriesByRecord.get(record.id);
    if (record.harmony?.status === 'implementation-ready') {
      if (!latestEntry || ledgerEntryOperation(latestEntry) !== 'promote') {
        errors.push(`record ${record.id}: harmony.status is 'implementation-ready' but no promotion ledger entry exists — hand-edited bypass`);
      }
      if (record.local?.status !== 'implementation-ready') {
        errors.push(`record ${record.id}: harmony.status is 'implementation-ready' but local.status is '${record.local?.status}' — source-side conversion not complete`);
      }
    } else if (latestEntry && ledgerEntryOperation(latestEntry) === 'promote') {
      errors.push(`record ${record.id}: latest ledger entry is a promotion but harmony.status is '${record.harmony?.status}' — promotion state was changed without an append-only retraction`);
    } else if (latestEntry && ledgerEntryOperation(latestEntry) === 'retract' && record.harmony?.status !== 'candidate-backport') {
      errors.push(`record ${record.id}: latest ledger entry is a retraction but harmony.status is '${record.harmony?.status}', not 'candidate-backport'`);
    }
  }

  // 3. Every ledger entry must correspond to a current record. Whether the
  // record is promoted or retracted is validated above against its *latest*
  // entry; historic promotions are deliberately retained for audit.
  const registryRecords = new Map(registry.records.map((record) => [record.id, record]));
  for (const entry of ledger.entries) {
    const record = registryRecords.get(entry.recordId);
    if (!record) {
      errors.push(`ledger entry ${entry.entryHash.slice(0, 16)}: record ${entry.recordId} no longer exists in registry`);
    }
  }

  // 3b. Current implementation-ready records must still satisfy their
  // declared admission dependencies. `dependencies[]` used to be documentary
  // only, so a record could be promoted even when a required composition
  // remained candidate-backport.
  const implementationReadyRecordIds = registry.records
    .filter((record) => record.harmony?.status === 'implementation-ready')
    .map((record) => record.id);
  errors.push(
    ...dependencyErrorsForRecords(
      registry,
      implementationReadyRecordIds,
      dependencies,
      false,
    ),
  );

  // 3c. A2 consumer cleanup is a cross-repository prerequisite, not a B3
  // field. Verify each active packet's immutable receipt without rewriting
  // the B3 packet or historical ledger. Historical bootstrap receipts are
  // accepted only when they bind the exact active ledger entry/entries.
  const receiptGroups = new Map();
  for (const record of registry.records) {
    if (record.harmony?.status !== 'implementation-ready') continue;
    const localReadyPath = localReadyForFigmaPath(record.id);
    if (!receiptGroups.has(localReadyPath)) {
      receiptGroups.set(localReadyPath, { localReadyPath, records: [] });
    }
    receiptGroups.get(localReadyPath).records.push(record);
  }
  const officialRevision = readOfficialCurrentRevision();
  for (const group of receiptGroups.values()) {
    if (!fs.existsSync(group.localReadyPath)) {
      errors.push(
        `implementation-ready receipt group is missing ${path.relative(repoRoot, group.localReadyPath)}`,
      );
      continue;
    }
    const localReady = readJson(group.localReadyPath);
    const recordIds = localReady.admission?.recordIds;
    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      errors.push(
        `${path.relative(repoRoot, group.localReadyPath)} has no admission.recordIds`,
      );
      continue;
    }
    const closureMatches = dependencies.nativeA2ConsumerClosures.filter((entry) =>
      Array.isArray(entry?.recordIds) &&
      entry.recordIds.length === recordIds.length &&
      sameStringSet(new Set(entry.recordIds), new Set(recordIds))
    );
    if (closureMatches.length !== 1) {
      errors.push(
        `record set [${recordIds.join(', ')}] must have exactly one native A2 consumer closure`,
      );
      continue;
    }
    const handoffDir = handoffDirForRecordId(recordIds[0]);
    const receipt = verifyA2PrePromotionReceipt({
      repoRoot,
      hostRepoRoot,
      handoffDir,
      recordIds,
      localReadyPath: group.localReadyPath,
      localReady,
      officialRevision,
      latestLedgerEntries: latestEntriesByRecord,
      mode: 'check',
      receiptRelativePath: closureMatches[0].prePromotionReceipt,
    });
    errors.push(
      ...receipt.errors.map((error) => `record set [${recordIds.join(', ')}]: ${error}`),
    );
    if (!receipt.metadata) continue;
    for (const recordId of recordIds) {
      const latestEntry = latestEntriesByRecord.get(recordId);
      if (!latestEntry || ledgerEntryOperation(latestEntry) !== 'promote') continue;
      if (latestEntry.a2PrePromotionReceipt === undefined) {
        if (receipt.metadata.mode !== 'historical-bootstrap') {
          errors.push(
            `record ${recordId}: active promotion lacks a2PrePromotionReceipt ledger metadata`,
          );
        }
        continue;
      }
      if (
        latestEntry.a2PrePromotionReceipt.path !== receipt.metadata.path ||
        latestEntry.a2PrePromotionReceipt.sha256 !== receipt.metadata.sha256 ||
        latestEntry.a2PrePromotionReceipt.cleanupCommit !==
          receipt.metadata.cleanupCommit
      ) {
        errors.push(
          `record ${recordId}: ledger A2 receipt metadata does not match current receipt`,
        );
      }
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
        const latestEntry = latestEntriesByRecord.get(entry.recordId);
        if (latestEntry && ledgerEntryOperation(latestEntry) === 'promote') {
          errors.push(`active route reconstruction quarantine record ${entry.recordId} has a current promotion ledger entry`);
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
// When PROMOTE_TEST_MODE=1 or RETRACT_TEST_MODE=1 is set, the caller can inject
// a fault after any write phase by setting the corresponding prefix, for
// example:
//   PROMOTE_FAULT_AFTER_REGISTRY_WRITE=1
//   RETRACT_FAULT_AFTER_REGISTRY_WRITE=1
//   PROMOTE_FAULT_AFTER_GENERATOR=1
//   PROMOTE_FAULT_AFTER_CONSUMER_SYNC=1
//   PROMOTE_FAULT_AFTER_LEDGER_WRITE=1
//   PROMOTE_FAULT_IN_FINAL_VERIFY=1
// The fault throws an injected error, which the promote() function's catch
// block catches and rolls back ALL four files. This lets the test suite verify
// that rollback actually restores the pre-transaction state at every phase,
// without depending on real disk/process failures.
//
// Outside PROMOTE_TEST_MODE these env vars are ignored, so a stray env var
// in a real environment cannot trip the fault.

function faultInject(phase, operation = 'PROMOTE') {
  if (process.env[`${operation}_TEST_MODE`] !== '1') return;
  const varName = `${operation}_FAULT_${phase}`;
  if (process.env[varName] !== '1') return;
  throw new Error(`injected fault: ${phase}`);
}

function validatePromotionContext(
  registry,
  recordId,
  quarantine,
  latestLedgerEntries,
  officialRevision,
) {
  const record = registry.records.find((item) => item.id === recordId);
  if (!record) fail(`record not found: ${recordId}`);
  if (record.classification !== 'exact-figma-binding') {
    fail(`record ${recordId} classification is '${record.classification}', not 'exact-figma-binding' — only exact bindings can be promoted`);
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

  // A previous retraction remains part of the append-only ledger. It is only
  // safe to promote again after the source evidence has been genuinely
  // recreated; otherwise this command would merely replay the withdrawn
  // promotion with the same packet.
  const latestEntry = latestLedgerEntries.get(recordId);
  const freshEvidenceErrors = verifyFreshEvidenceAfterRetraction(recordId, localReady, latestEntry);
  if (freshEvidenceErrors.length > 0) {
    fail(`record ${recordId}: retraction freshness verification failed:\n${freshEvidenceErrors.map((e) => `    - ${e}`).join('\n')}`);
  }

  // Prerequisite 3: Figma binding revision must match the OFFICIAL current
  // revision evidence, not just the first registry record's revision. The
  // 2026-07-27 audit found the old check compared against "the first exact
  // record's revision" which could itself be stale.
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

  return {
    recordId,
    record,
    localReadyPath,
    localReady,
    previousHarmonyStatus,
    handoffDir,
    officialRevision,
  };
}

function promotionGroupRecordIds(anchorRecordId) {
  const localReadyPath = localReadyForFigmaPath(anchorRecordId);
  if (!fs.existsSync(localReadyPath)) {
    fail(`record ${anchorRecordId}: LOCAL_READY_FOR_FIGMA.json not found at ${path.relative(repoRoot, localReadyPath)}`);
  }
  const localReady = readJson(localReadyPath);
  const recordIds = localReady.admission?.recordIds;
  if (!Array.isArray(recordIds) || recordIds.length === 0) {
    fail(`record ${anchorRecordId}: admission.recordIds is missing or empty — group promotion requires an explicit source packet`);
  }
  if (!recordIds.includes(anchorRecordId)) {
    fail(`record ${anchorRecordId}: group anchor is not named by its LOCAL_READY_FOR_FIGMA admission.recordIds`);
  }
  if (new Set(recordIds).size !== recordIds.length) {
    fail(`record ${anchorRecordId}: admission.recordIds contains duplicates`);
  }
  return recordIds;
}

function promoteRecords(recordIds) {
  if (!Array.isArray(recordIds) || recordIds.length === 0) {
    fail('promotion requires at least one recordId');
  }
  if (new Set(recordIds).size !== recordIds.length) {
    fail('promotion recordIds must be unique');
  }

  const registry = readJson(registryPath);
  const quarantine = activeQuarantineEntries();
  if (quarantine.errors.length > 0) {
    fail(quarantine.errors.join('; '));
  }
  const existingLedger = loadLedger();
  const existingLedgerErrors = verifyLedger(existingLedger);
  if (existingLedgerErrors.length > 0) {
    fail(`ledger is inconsistent before promotion:\n${existingLedgerErrors.map((e) => `    - ${e}`).join('\n')}`);
  }
  const latestLedgerEntries = latestLedgerEntriesByRecord(existingLedger);
  const officialRevision = readOfficialCurrentRevision();
  const dependencies = readAdmissionDependencies();

  console.log(`→ promote-family: ${recordIds.join(', ')}`);
  const contexts = recordIds.map((recordId) =>
    validatePromotionContext(
      registry,
      recordId,
      quarantine,
      latestLedgerEntries,
      officialRevision,
    ));

  const declaredRecordIds = contexts[0].localReady.admission?.recordIds || [];
  if (contexts.length === 1 && declaredRecordIds.length > 1) {
    fail(
      `record ${contexts[0].recordId}: its B3 packet declares a ${declaredRecordIds.length}-record ` +
      `atomic admission set; use --group ${contexts[0].recordId}`,
    );
  }
  if (contexts.length > 1) {
    const handoffPaths = new Set(contexts.map((context) => context.localReadyPath));
    const evidenceHashes = new Set(contexts.map((context) => context.localReady.sourceEvidenceHash));
    const implementationCommits = new Set(
      contexts.map((context) => context.localReady.localSource?.implementationCommit),
    );
    if (handoffPaths.size !== 1 || evidenceHashes.size !== 1 || implementationCommits.size !== 1) {
      fail('group promotion requires every record to share one exact handoff packet, evidence hash, and implementation commit');
    }
    if (!sameStringSet(new Set(declaredRecordIds), new Set(recordIds))) {
      fail('group promotion must include the complete admission.recordIds set from LOCAL_READY_FOR_FIGMA.json');
    }
  }

  const dependencyErrors = dependencyErrorsForRecords(
    registry,
    recordIds,
    dependencies,
    true,
  );
  if (dependencyErrors.length > 0) {
    fail(
      `record set dependency verification failed:\n` +
      dependencyErrors.map((error) => `    - ${error}`).join('\n'),
    );
  }

  const closure = nativeA2ClosureForRecordIds(dependencies, recordIds);
  const a2Receipt = verifyA2PrePromotionReceipt({
    repoRoot,
    hostRepoRoot,
    handoffDir: contexts[0].handoffDir,
    recordIds,
    localReadyPath: contexts[0].localReadyPath,
    localReady: contexts[0].localReady,
    officialRevision,
    latestLedgerEntries,
    mode: 'promotion',
    receiptRelativePath: closure.prePromotionReceipt,
  });
  if (a2Receipt.errors.length > 0 || !a2Receipt.metadata) {
    fail(
      `A2 pre-promotion consumer receipt verification failed:\n` +
      a2Receipt.errors.map((error) => `    - ${error}`).join('\n'),
    );
  }
  console.log(
    `  ✓ A2 consumer receipt verified (${a2Receipt.metadata.path}, ` +
    `${a2Receipt.metadata.cleanupCommit.slice(0, 12)})`,
  );

  // B4 dependency/Core authority is verified while holding the same writer
  // lock used by repin/recover. A successful check outside this critical
  // section is not sufficient because a concurrent repin could otherwise
  // change the spec/mirror pair before the admission transaction starts.
  for (const context of contexts) {
    runRuntimePrePromotionChecks(context.recordId, dependencies);
  }

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
  const fullEntries = [];
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
    for (const context of contexts) context.record.harmony.status = 'implementation-ready';
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
    const ledger = existingLedger;
    const timestamp = new Date().toISOString();
    const transactionId = `promotion-group-${sha256(JSON.stringify({
      timestamp,
      recordIds,
      registryHashBefore,
    })).replace(/^sha256:/, '').slice(0, 20)}`;
    for (const context of contexts) {
      const { record, recordId, handoffDir, localReadyPath, localReady, previousHarmonyStatus } = context;
      const entry = {
        entryId: `promote-${String(ledger.entries.length + 1).padStart(3, '0')}`,
        kind: 'promote',
        timestamp,
        transactionId,
        transactionRecordIds: recordIds,
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
          officialCurrentRevision: context.officialRevision,
          nodeId: record.figma.nodeId,
          canonicalMasterId: record.figma.canonicalMasterId,
        },
        harmonyConsumerTargets: record.harmony.targets,
        harmonyConsumerTargetsVerified: true,
        a2PrePromotionReceipt: a2Receipt.metadata,
        registryHashBefore,
        upstreamArtifactHashAfter: upstreamHashAfter,
        consumerArtifactHashAfter: consumerHashAfter,
        artifactsInSync: upstreamHashAfter === consumerHashAfter,
        promotedBy: 'promote-family.mjs',
      };
      fullEntries.push(appendLedgerEntry(ledger, entry));
    }
    writeViaTemp(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    faultInject('AFTER_LEDGER_WRITE');

    // ── Phase 8: final verification (read-back) ──────────────────────────
    faultInject('IN_FINAL_VERIFY');
    const finalRegistry = readJson(registryPath);
    for (const recordId of recordIds) {
      const finalRecord = finalRegistry.records.find((item) => item.id === recordId);
      if (!finalRecord || finalRecord.harmony?.status !== 'implementation-ready') {
        throw new Error(`registry read-back did not show ${recordId} as implementation-ready`);
      }
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
    console.error(`✗ promote-family: ${recordIds.join(', ')} transaction failed — rolling back all four files.`);
    console.error(`  error: ${err.message}`);
    restoreBackup(backup.registry);
    restoreBackup(backup.upstreamArtifact);
    restoreBackup(backup.consumerArtifact);
    restoreBackup(backup.ledger);
    process.exit(1);
  }

  for (const context of contexts) {
    console.log(`  ✓ ${context.recordId}: harmony.status ${context.previousHarmonyStatus} → implementation-ready`);
  }
  console.log(`  ✓ VisualAdmission.ets regenerated (${upstreamHashAfter.slice(0, 20)}...)`);
  console.log(`  ✓ consumer copy synced (${consumerHashAfter.slice(0, 20)}...)`);
  for (const fullEntry of fullEntries) {
    console.log(`  ✓ ledger entry ${fullEntry.entryId} appended (${fullEntry.entryHash.slice(0, 20)}...)`);
  }
  console.log(`✓ promote-family: ${recordIds.length} record(s) promoted to implementation-ready`);
}

function promote(recordId) {
  promoteRecords([recordId]);
}

// ─── Retract mode: atomic, append-only reversal ───────────────────────────

function retractionGroupRecordIds(anchorRecordId) {
  const ledger = loadLedger();
  const ledgerErrors = verifyLedger(ledger);
  if (ledgerErrors.length > 0) {
    fail(`ledger is inconsistent before group retraction:\n${ledgerErrors.map((error) => `    - ${error}`).join('\n')}`);
  }
  const activePromotion = latestLedgerEntriesByRecord(ledger).get(anchorRecordId);
  if (!activePromotion || ledgerEntryOperation(activePromotion) !== 'promote') {
    fail(`record ${anchorRecordId}: no current promotion ledger entry exists to retract`);
  }
  const recordIds = activePromotion.transactionRecordIds;
  if (!Array.isArray(recordIds) || recordIds.length === 0) {
    return [anchorRecordId];
  }
  if (!recordIds.includes(anchorRecordId) || new Set(recordIds).size !== recordIds.length) {
    fail(`record ${anchorRecordId}: active promotion has malformed transactionRecordIds`);
  }
  return recordIds;
}

function retractRecords(recordIds, reason) {
  const normalizedReason = typeof reason === 'string' ? reason.trim() : '';
  if (normalizedReason.length < 8) {
    fail('retract requires a non-empty --reason of at least 8 characters; the ledger must explain why native admission was withdrawn');
  }
  if (!Array.isArray(recordIds) || recordIds.length === 0 || new Set(recordIds).size !== recordIds.length) {
    fail('retraction recordIds must be a non-empty unique list');
  }

  const registry = readJson(registryPath);
  const ledgerBefore = loadLedger();
  const ledgerErrors = verifyLedger(ledgerBefore);
  if (ledgerErrors.length > 0) {
    fail(`ledger is inconsistent before retraction:\n${ledgerErrors.map((e) => `    - ${e}`).join('\n')}`);
  }
  const latestEntries = latestLedgerEntriesByRecord(ledgerBefore);
  const contexts = recordIds.map((recordId) => {
    const record = registry.records.find((item) => item.id === recordId);
    if (!record) fail(`record not found: ${recordId}`);
    if (record.classification !== 'exact-figma-binding') {
      fail(`record ${recordId} classification is '${record.classification}', not 'exact-figma-binding' — only exact bindings can be retracted`);
    }
    if (record.harmony?.status !== 'implementation-ready') {
      fail(`record ${recordId}: harmony.status is '${record.harmony?.status}', not 'implementation-ready' — only a current promotion can be retracted`);
    }
    const activePromotion = latestEntries.get(recordId);
    if (!activePromotion || ledgerEntryOperation(activePromotion) !== 'promote') {
      fail(`record ${recordId}: no current promotion ledger entry exists to retract — refusing to synthesize history`);
    }
    return { recordId, record, activePromotion };
  });

  if (contexts.length === 1) {
    const activeGroup = contexts[0].activePromotion.transactionRecordIds;
    if (Array.isArray(activeGroup) && activeGroup.length > 1) {
      fail(`record ${contexts[0].recordId}: promotion belongs to a ${activeGroup.length}-record transaction; use --retract-group to avoid a contradictory partial retraction`);
    }
  } else {
    const transactionIds = new Set(contexts.map((context) => context.activePromotion.transactionId));
    if (transactionIds.size !== 1 || transactionIds.has(undefined)) {
      fail('group retraction requires every record to belong to the same active promotion transaction');
    }
    for (const context of contexts) {
      if (!sameStringSet(
        new Set(context.activePromotion.transactionRecordIds || []),
        new Set(recordIds),
      )) {
        fail(`record ${context.recordId}: active promotion transaction set does not match the requested retraction group`);
      }
    }
  }

  console.log(`→ promote-family: retract ${recordIds.join(', ')}`);
  for (const context of contexts) {
    console.log(`  ✓ current promotion ${context.activePromotion.entryId} (${context.activePromotion.entryHash.slice(0, 20)}...) found`);
  }
  console.log(`  ✓ reason: ${normalizedReason}`);

  // The same four files as promotion are snapshotted. A safety retraction may
  // repair a pre-existing artifact mismatch by regenerating from the newly
  // withdrawn registry; only the final state is required to be byte-identical.
  const backup = {
    registry: backupFile(registryPath),
    upstreamArtifact: backupFile(upstreamArtifactPath),
    consumerArtifact: backupFile(consumerArtifactPath),
    ledger: backupFile(ledgerPath),
  };

  const fullEntries = [];
  let upstreamHashAfter;
  let consumerHashAfter;
  try {
    const registryContentBefore = fs.readFileSync(registryPath, 'utf8');
    const registryHashBefore = sha256(registryContentBefore);

    // Write registry first so the generator emits candidate-backport for the
    // withdrawn surface. local.status deliberately remains unchanged: it is
    // historical source-side evidence, not host admission.
    for (const context of contexts) context.record.harmony.status = 'candidate-backport';
    writeViaTemp(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
    faultInject('AFTER_REGISTRY_WRITE', 'RETRACT');

    const generated = spawnSync('node', [generatorPath], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (generated.status !== 0) {
      throw new Error(`generator failed during retraction. Output:\n${generated.stderr?.toString() || generated.stdout?.toString()}`);
    }
    if (!fs.existsSync(upstreamArtifactPath)) {
      throw new Error(`upstream artifact missing after retraction generation: ${upstreamArtifactPath}`);
    }
    faultInject('AFTER_GENERATOR', 'RETRACT');

    const upstreamContent = fs.readFileSync(upstreamArtifactPath);
    if (!fs.existsSync(path.dirname(consumerArtifactPath))) {
      throw new Error(`HarmonyOS consumer directory does not exist: ${path.dirname(consumerArtifactPath)} — is Reader-for-HarmonyOS checked out?`);
    }
    writeViaTemp(consumerArtifactPath, upstreamContent);
    upstreamHashAfter = sha256(fs.readFileSync(upstreamArtifactPath, 'utf8'));
    consumerHashAfter = sha256(fs.readFileSync(consumerArtifactPath, 'utf8'));
    if (upstreamHashAfter !== consumerHashAfter) {
      throw new Error(`upstream and consumer artifacts differ after retraction sync: upstream ${upstreamHashAfter.slice(0, 20)}... != consumer ${consumerHashAfter.slice(0, 20)}...`);
    }
    faultInject('AFTER_CONSUMER_SYNC', 'RETRACT');

    const ledger = ledgerBefore;
    const timestamp = new Date().toISOString();
    const transactionId = `retraction-group-${sha256(JSON.stringify({
      timestamp,
      recordIds,
      registryHashBefore,
    })).replace(/^sha256:/, '').slice(0, 20)}`;
    for (const context of contexts) {
      const { recordId, record, activePromotion } = context;
      const entry = {
        entryId: `retract-${String(ledger.entries.length + 1).padStart(3, '0')}`,
        kind: 'retract',
        timestamp,
        transactionId,
        transactionRecordIds: recordIds,
        recordId,
        pageFamily: activePromotion.pageFamily || handoffDirForRecordId(recordId),
        surfaceType: record.surfaceType || activePromotion.surfaceType || 'unknown',
        routeIds: record.routeIds || activePromotion.routeIds || [],
        previousHarmonyStatus: 'implementation-ready',
        newHarmonyStatus: 'candidate-backport',
        localStatus: record.local?.status || 'unset',
        reason: normalizedReason,
        reversalOf: activePromotion.entryHash,
        reversalOfEntryId: activePromotion.entryId,
        retractedPromotion: {
          entryHash: activePromotion.entryHash,
          entryId: activePromotion.entryId,
          sourceEvidenceHash: activePromotion.localReadyForFigma?.sourceEvidenceHash,
          implementationCommit: activePromotion.localReadyForFigma?.implementationCommit,
        },
        registryHashBefore,
        upstreamArtifactHashAfter: upstreamHashAfter,
        consumerArtifactHashAfter: consumerHashAfter,
        artifactsInSync: upstreamHashAfter === consumerHashAfter,
        retractedBy: 'promote-family.mjs',
      };
      fullEntries.push(appendLedgerEntry(ledger, entry));
    }
    writeViaTemp(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    faultInject('AFTER_LEDGER_WRITE', 'RETRACT');

    faultInject('IN_FINAL_VERIFY', 'RETRACT');
    const finalRegistry = readJson(registryPath);
    for (const recordId of recordIds) {
      const finalRecord = finalRegistry.records.find((item) => item.id === recordId);
      if (!finalRecord || finalRecord.harmony?.status !== 'candidate-backport') {
        throw new Error(`registry read-back did not show ${recordId} as candidate-backport after retraction`);
      }
    }
    const finalLedger = loadLedger();
    const finalEntries = latestLedgerEntriesByRecord(finalLedger);
    for (let index = 0; index < recordIds.length; index += 1) {
      const recordId = recordIds[index];
      const finalEntry = finalEntries.get(recordId);
      if (!finalEntry || finalEntry.entryHash !== fullEntries[index].entryHash ||
        ledgerEntryOperation(finalEntry) !== 'retract') {
        throw new Error(`ledger read-back did not retain the retraction entry for ${recordId}`);
      }
    }
    const finalUpstream = sha256(fs.readFileSync(upstreamArtifactPath, 'utf8'));
    const finalConsumer = sha256(fs.readFileSync(consumerArtifactPath, 'utf8'));
    if (finalUpstream !== upstreamHashAfter || finalConsumer !== consumerHashAfter) {
      throw new Error(`artifact hash drift detected after retraction: upstream ${finalUpstream.slice(0, 20)}... vs ${upstreamHashAfter.slice(0, 20)}..., consumer ${finalConsumer.slice(0, 20)}... vs ${consumerHashAfter.slice(0, 20)}...`);
    }
  } catch (err) {
    console.error(`✗ promote-family: retract ${recordIds.join(', ')} transaction failed — rolling back all four files.`);
    console.error(`  error: ${err.message}`);
    restoreBackup(backup.registry);
    restoreBackup(backup.upstreamArtifact);
    restoreBackup(backup.consumerArtifact);
    restoreBackup(backup.ledger);
    process.exit(1);
  }

  for (const context of contexts) {
    console.log(`  ✓ ${context.recordId}: harmony.status implementation-ready → candidate-backport`);
  }
  console.log(`  ✓ VisualAdmission.ets regenerated (${upstreamHashAfter.slice(0, 20)}...)`);
  console.log(`  ✓ consumer copy synced (${consumerHashAfter.slice(0, 20)}...)`);
  for (const fullEntry of fullEntries) {
    console.log(`  ✓ reversal ledger entry ${fullEntry.entryId} appended (${fullEntry.entryHash.slice(0, 20)}...)`);
  }
  console.log(`✓ promote-family: ${recordIds.length} record(s) retracted to candidate-backport`);
}

function retract(recordId, reason) {
  retractRecords([recordId], reason);
}

// ─── CLI ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const arg = args[0];
if (!arg) {
  console.error('Usage: node tools/design/promote-family.mjs <recordId>');
  console.error('       node tools/design/promote-family.mjs --group <anchorRecordId>');
  console.error('       node tools/design/promote-family.mjs --retract <recordId> --reason <reason>');
  console.error('       node tools/design/promote-family.mjs --retract-group <anchorRecordId> --reason <reason>');
  console.error('       node tools/design/promote-family.mjs --check');
  process.exit(1);
}
if (arg === '--check') {
  if (args.length !== 1) fail('--check does not accept additional arguments');
  const releaseLock = acquireTransactionLock();
  try {
    runCheck();
  } finally {
    releaseLock();
  }
} else if (arg === '--retract' || arg === '--retract-group') {
  const recordId = args[1];
  const reasonIndex = args.indexOf('--reason');
  const reason = reasonIndex >= 0 ? args.slice(reasonIndex + 1).join(' ') : '';
  if (!recordId || reasonIndex < 0) {
    fail(`Usage: node tools/design/promote-family.mjs ${arg} <recordId> --reason <reason>`);
  }
  if (reasonIndex !== 2) {
    fail('--reason must follow the recordId in retract mode');
  }
  const releaseLock = acquireTransactionLock();
  try {
    if (arg === '--retract-group') {
      retractRecords(retractionGroupRecordIds(recordId), reason);
    } else {
      retract(recordId, reason);
    }
  } finally {
    releaseLock();
  }
} else if (arg === '--group') {
  const anchorRecordId = args[1];
  if (!anchorRecordId || args.length !== 2) {
    fail('Usage: node tools/design/promote-family.mjs --group <anchorRecordId>');
  }
  const releaseLock = acquireTransactionLock();
  try {
    promoteRecords(promotionGroupRecordIds(anchorRecordId));
  } finally {
    releaseLock();
  }
} else {
  if (args.length !== 1) fail('promotion accepts exactly one recordId');
  const releaseLock = acquireTransactionLock();
  try {
    promote(arg);
  } finally {
    releaseLock();
  }
}
