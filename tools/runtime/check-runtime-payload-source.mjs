#!/usr/bin/env node
// Runtime Core source authority checker.
//
// Default mode validates that the runtime-payload-contracts.json `sourceOfTruth`
// is self-consistent: the declared commit/tree exist in Reader-Core-Native, and
// each declared source sha256 matches the blob at `git show <commit>:<path>`. It
// does NOT read the worktree - worktree cleanliness is enforced separately by the
// promotion gate (promote-family.mjs `runtimeCoreAuthority`). This split lets the
// checker prove "the spec pins a real, internally-consistent Core commit" without
// coupling to whether the local checkout happens to be dirty.
//
// `--source-commit <40sha>` atomically repins the spec and the FIGMA visual
// admission dependency mirror to a new Core commit (commit, tree, all source
// hashes, and the mirror). It refuses to run on a dirty Core worktree so the
// repinned commit always matches the committed bytes. The repin is a real
// transaction: an exclusive lock, original-file snapshots, temp-file writes,
// ordered atomic renames with second-rename rollback, and a post-write
// re-verification that restores the snapshots on failure. Fault-injection tests
// exercise every rollback path.
//
// `--update` is removed: it only rewrote the four source hashes and left the
// commit/tree/mirror stale, producing a self-contradictory "old commit + new
// hash" record that the stricter promotion gate still rejects. Use --source-commit.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { acquireWriterLock, reclaimStaleWriterLock, inspectWriterLock, defaultIsPidAlive } from "../shared/shared-writer-lock.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
export const specFile = path.join(root, "ui-spec", "runtime-payload-contracts.json");
export const dependenciesFile = path.join(root, "docs", "design", "FIGMA_VISUAL_ADMISSION_DEPENDENCIES.json");
export const coreRoot = path.resolve(process.env.READER_CORE_NATIVE_DIR || path.join(root, "..", "Reader-Core-Native"));
const READING_SURFACE_RECORD_ID = "reader.reading-surface";

// Fixed git binary so a PATH-injected git cannot bypass the authority checks.
// Hardcoded (no env override): a test or attacker must not be able to redirect
// the authority checks at an arbitrary binary. Tests that need to exercise the
// transaction without the real Reader-Core-Native checkout inject a fake
// `gitOps` into repipeTransaction() instead.
export const GIT_BIN = "/usr/bin/git";
try {
  fs.accessSync(GIT_BIN, fs.constants.X_OK);
} catch (error) {
  console.error(`[runtime-payload-source] git binary not executable at ${GIT_BIN}: ${error.message}`);
  process.exitCode = 1;
}

// The exact ordered Core source set. Must stay in lockstep with
// promote-family.mjs RUNTIME_CORE_SOURCE_PATHS.
export const RUNTIME_CORE_SOURCE_PATHS = [
  "crates/reader-contract/src/reader_ui.rs",
  "crates/reader-contract/src/remote.rs",
  "crates/reader-sync/src/lib.rs",
  "crates/reader-storage/src/lib.rs",
];

// Real git operations. Tests inject a fake gitOps to exercise the transaction
// without touching the real Reader-Core-Native checkout.
//
// spawnSync inherits process.env by default, which means a `GIT_DIR` /
// `GIT_WORK_TREE` / `GIT_INDEX_FILE` / `GIT_OBJECT_DIRECTORY` /
// `GIT_ALTERNATE_OBJECT_DIRECTORIES` / `GIT_CONFIG_*` variable in the parent
// environment would redirect every authority check at an unrelated repo and
// silently flip the default check from pass to fail (or vice versa). We scrub
// those variables from the env passed to git so the fixed GIT_BIN + cwd
// (coreRoot) is the only thing that resolves the repository.
const SCRUBBED_GIT_ENV_KEYS = [
  "GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_CONFIG", "GIT_CONFIG_GLOBAL",
  "GIT_CONFIG_SYSTEM", "GIT_CONFIG_NOSYSTEM",
];
function scrubGitEnv() {
  const env = { ...process.env };
  for (const key of SCRUBBED_GIT_ENV_KEYS) delete env[key];
  return env;
}
export const realGitOps = {
  commitExists(sha) {
    return spawnSync(GIT_BIN, ["cat-file", "-e", `${sha}^{commit}`], { cwd: coreRoot, env: scrubGitEnv() }).status === 0;
  },
  treeOf(sha) {
    const result = spawnSync(GIT_BIN, ["rev-parse", `${sha}^{tree}`], { cwd: coreRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: scrubGitEnv() });
    if (result.status !== 0) {
      const stderr = (result.stderr || "").trim();
      throw new Error(`git rev-parse ${sha}^{tree} failed${stderr ? `: ${stderr}` : ""}`);
    }
    return result.stdout.trim();
  },
  blobBytes(sha, relPath) {
    const result = spawnSync(GIT_BIN, ["show", `${sha}:${relPath}`], { cwd: coreRoot, maxBuffer: 64 * 1024 * 1024, env: scrubGitEnv() });
    if (result.status !== 0) {
      const stderr = (result.stderr || Buffer.alloc(0)).toString().trim();
      throw new Error(`git show ${sha}:${relPath} failed${stderr ? `: ${stderr}` : ""}`);
    }
    return Buffer.from(result.stdout);
  },
  // Only the four authoritative Core source files matter for a repin: their
  // committed blob is what gets pinned, so we refuse only if those exact paths
  // have uncommitted tracked changes. Untracked IDE/tooling files do not affect
  // any commit blob and are ignored.
  authoritativeFilesDirty() {
    const result = spawnSync(GIT_BIN, ["status", "--porcelain", "--", ...RUNTIME_CORE_SOURCE_PATHS],
      { cwd: coreRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: scrubGitEnv() });
    if (result.status !== 0) {
      throw new Error(`git status --porcelain failed: ${(result.stderr || "").trim()}`);
    }
    return result.stdout.trim();
  },
};

// Real fs operations. Tests inject a fake fsOps to fault-inject renames/reads.
// `fsyncSync` + `realpathSync` make the repin durable across abrupt process
// death (the journal and temps survive a crash so recovery can reconcile).
// `writeSync` (write through an open fd) closes the lock-acquisition race:
// the holder PID is written through the SAME fd that won O_EXCL, then fsync'd,
// then closed, so the lock is never left empty-and-closed for a second writer
// to mistake for a stale lock and reclaim.
// `lstatSync` lets safeWriteFile reject a pre-staged symlink at a temp path so
// a write cannot be redirected through it to clobber an unrelated file.
export const realFsOps = {
  readFileSync(file) { return fs.readFileSync(file); },
  writeFileSync(file, data) { fs.writeFileSync(file, data); },
  writeSync(fd, data) { fs.writeSync(fd, data); },
  renameSync(from, to) { fs.renameSync(from, to); },
  unlinkSync(file) { fs.unlinkSync(file); },
  openSync(file, flag) { return fs.openSync(file, flag); },
  closeSync(fd) { fs.closeSync(fd); },
  fsyncSync(fd) { fs.fsyncSync(fd); },
  realpathSync(file) { return fs.realpathSync(file); },
  existsSync(file) { return fs.existsSync(file); },
  lstatSync(file) { return fs.lstatSync(file); },
};

function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function findRuntimeContractMirror(dependencies) {
  const authorities = dependencies?.sourceAuthorities;
  if (!Array.isArray(authorities)) return null;
  for (const entry of authorities) {
    if (entry?.recordId === READING_SURFACE_RECORD_ID) return entry;
  }
  return null;
}

function isCanonicalSourceSet(sources) {
  return Array.isArray(sources) &&
    JSON.stringify(sources.map((source) => source?.path)) === JSON.stringify(RUNTIME_CORE_SOURCE_PATHS);
}

// -- Durable write-ahead journal for the repin transaction -------------------
//
// The repin mutates two files (spec + dependency mirror). A crash between the
// two renames, or after the first rename but before the journal is removed,
// must NOT leave the pair half-updated. We mirror promote-family.mjs's proven
// write-ahead-journal approach: before any live mutation we durably record the
// intent + the original-file backups (bytes + sha256) + the expected post-image
// hashes. After abrupt process death, recoverRepinJournal() reads the journal
// and either completes a stalled rename (if the temp matches its declared hash)
// or restores both files from their backups, so the pair is never left
// half-updated and no temp/journal survives.

const REPIN_JOURNAL_KIND = "READER_CORE_REPIN_TRANSACTION_JOURNAL";
const REPIN_JOURNAL_SCHEMA_VERSION = "1.0.0";
const REPIN_PHASES = ["opened", "temps-written", "spec-renamed", "deps-renamed"];

function repinJournalPath(specPath) {
  return `${specPath}.repin.journal`;
}

function sha256Hex(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function serializeBackup(name, filePath, bytes) {
  const existed = bytes !== null;
  return {
    path: filePath,
    existed,
    contentBase64: existed ? bytes.toString("base64") : null,
    sha256: existed ? sha256Hex(bytes) : null,
  };
}

function deserializeBackup(serialized) {
  return {
    path: serialized.path,
    bytes: serialized.existed ? Buffer.from(serialized.contentBase64, "base64") : null,
  };
}

// Durable write: temp in the same directory -> fsync temp -> atomic rename ->
// fsync the directory. The same-filesystem temp guarantees rename is atomic; the
// fsyncs guarantee the bytes survive a crash. The directory fsync is skipped
// for the in-memory fake fsOps in unit tests (they do not model fsync).
function durableWriteJson(fsOps, target, data) {
  const temp = `${target}.dwtmp-${process.pid}`;
  safeWriteFile(fsOps, temp, `${JSON.stringify(data, null, 2)}\n`);
  if (typeof fsOps.fsyncSync === "function") {
    let fd;
    try {
      fd = fsOps.openSync(temp, "r");
      fsOps.fsyncSync(fd);
    } finally {
      if (fd !== undefined) try { fsOps.closeSync(fd); } catch { /* closed */ }
    }
  }
  fsOps.renameSync(temp, target);
  fsyncDir(fsOps, target);
}

function fsyncDir(fsOps, file) {
  if (typeof fsOps.fsyncSync !== "function") return;
  const dir = path.dirname(file);
  let fd;
  try {
    fd = fsOps.openSync(dir, "r");
    fsOps.fsyncSync(fd);
  } catch {
    // Some platforms cannot open a directory for fsync; the file fsync already
    // guarantees the bytes. This is best-effort directory durability.
  } finally {
    if (fd !== undefined) try { fsOps.closeSync(fd); } catch { /* closed */ }
  }
}

// Resolve a target path through symlinks so a spec/dependency path reached via a
// symlink repins the REAL file and the journal/lock/temps land next to the real
// file (same filesystem -> atomic rename). Falls back to the path as-is when the
// fs cannot realpath (in-memory fakes have no realpathSync) or the file is absent.
function resolveRealPath(fsOps, file) {
  if (typeof fsOps.realpathSync !== "function") return file;
  if (!fsOps.existsSync(file)) return file;
  try {
    return fsOps.realpathSync(file);
  } catch {
    return file;
  }
}

// Safe write: refuse to write through a pre-staged symlink at the target. A
// symlink at a temp/lock path could redirect the write (and the subsequent
// rename) at an unrelated file, so we lstat (not stat - we want the link itself,
// not its target) and reject any symlink. Only lstat when the path already exists,
// so a new temp is written normally; the in-memory fake fsOps has no lstatSync
// and falls back to a plain write (it never stages symlinks). Real symlink
// rejection is exercised by the dedicated real-fs test.
function safeWriteFile(fsOps, file, content) {
  if (typeof fsOps.lstatSync === "function" && fsOps.existsSync(file)) {
    const stat = fsOps.lstatSync(file);
    if (stat && typeof stat.isSymbolicLink === "function" && stat.isSymbolicLink()) {
      throw new Error(`refusing to write through pre-staged symlink at ${file}`);
    }
  }
  fsOps.writeFileSync(file, content);
}

// Durable restore of a live file from a backup: write a same-directory temp
// (rejecting a pre-staged symlink there too), fsync it, rename it atomically
// over the live target, then fsync the directory. This replaces a bare
// writeFileSync-over-live, which a crash mid-write could leave torn.
function durableWriteBytes(fsOps, target, bytes) {
  const temp = `${target}.restore.tmp-${process.pid}`;
  safeWriteFile(fsOps, temp, bytes);
  if (typeof fsOps.fsyncSync === "function") {
    let fd;
    try {
      fd = fsOps.openSync(temp, "r");
      fsOps.fsyncSync(fd);
    } finally {
      if (fd !== undefined) try { fsOps.closeSync(fd); } catch { /* closed */ }
    }
  }
  fsOps.renameSync(temp, target);
  fsyncDir(fsOps, target);
}

function readRepinJournal(fsOps, journalPath) {
  if (!fsOps.existsSync(journalPath)) return null;
  const document = JSON.parse(fsOps.readFileSync(journalPath).toString("utf8"));
  if (
    document?.kind !== REPIN_JOURNAL_KIND ||
    document.schemaVersion !== REPIN_JOURNAL_SCHEMA_VERSION ||
    typeof document.specPath !== "string" ||
    typeof document.depsPath !== "string" ||
    typeof document.specTmp !== "string" ||
    typeof document.depsTmp !== "string" ||
    !Array.isArray(document.phases) ||
    document.phases.length === 0 ||
    !document.backups ||
    typeof document.backups !== "object"
  ) {
    throw new Error(`repin journal at ${journalPath} has an invalid schema; manual recovery is required`);
  }
  return document;
}

function verifyBackupIntact(serialized, expectedPath) {
  if (
    typeof serialized.path !== "string" ||
    serialized.path !== expectedPath ||
    typeof serialized.existed !== "boolean" ||
    (serialized.existed && (
      typeof serialized.contentBase64 !== "string" ||
      typeof serialized.sha256 !== "string" ||
      sha256Hex(Buffer.from(serialized.contentBase64, "base64")) !== serialized.sha256
    ))
  ) {
    return false;
  }
  return true;
}

function fileHashOrNull(fsOps, file) {
  if (!fsOps.existsSync(file)) return null;
  return sha256Hex(fsOps.readFileSync(file));
}

// Mark a phase applied in the journal by appending a phase record with the
// current live file hashes as the applied post-image, then durably rewriting
// the journal. Called only after the phase's mutation has landed on disk.
function markRepinPhaseApplied(fsOps, journalPath, phase, liveHashes) {
  const document = JSON.parse(fsOps.readFileSync(journalPath).toString("utf8"));
  const pending = document.phases.at(-1);
  if (pending?.state !== "intent" || pending.phase !== phase) {
    throw new Error(`repin journal has no in-flight intent for phase '${phase}'`);
  }
  pending.state = "applied";
  pending.appliedPostHashes = liveHashes;
  durableWriteJson(fsOps, journalPath, document);
}

// Append an 'intent' phase (the mutation that is about to happen) with the
// expected post-image, then durably rewrite the journal. markRepinPhaseApplied
// flips it to 'applied' once the mutation has landed.
function beginRepinPhase(fsOps, journalPath, phase, expectedPostHashes) {
  const document = JSON.parse(fsOps.readFileSync(journalPath).toString("utf8"));
  const previous = document.phases.at(-1);
  if (previous?.state !== "applied") {
    throw new Error(`repin journal has no prior applied phase before '${phase}'`);
  }
  document.phases.push({ phase, state: "intent", expectedPostHashes, appliedPostHashes: null });
  durableWriteJson(fsOps, journalPath, document);
}

// Write a staging temp file and fsync it (no rename): the temp IS the staging
// file that a later rename promotes atomically. durableWriteJson is not used
// here because it would rename the temp into place immediately.
function writeAndFsync(fsOps, file, content) {
  safeWriteFile(fsOps, file, content);
  if (typeof fsOps.fsyncSync === "function") {
    let fd;
    try {
      fd = fsOps.openSync(file, "r");
      fsOps.fsyncSync(fd);
    } finally {
      if (fd !== undefined) try { fsOps.closeSync(fd); } catch { /* closed */ }
    }
  }
}

// Compare-and-swap guard: refuse to promote the temps if a live file drifted
// from the snapshot we recorded in the journal (a third party mutated it under
// us). Returns "" on match, or an error message on drift.
function casGuard(fsOps, specPath, depsPath, expectedSpecHash, expectedDepsHash) {
  const liveSpec = fileHashOrNull(fsOps, specPath);
  const liveDeps = fileHashOrNull(fsOps, depsPath);
  if (liveSpec !== expectedSpecHash) {
    return `spec drifted after snapshot (expected ${expectedSpecHash}, live ${liveSpec}); aborting before any rename`;
  }
  if (liveDeps !== expectedDepsHash) {
    return `dependency mirror drifted after snapshot (expected ${expectedDepsHash}, live ${liveDeps}); aborting before any rename`;
  }
  return "";
}

// The exclusive writer lock is acquired via the shared module
// (tools/shared/shared-writer-lock.mjs), so repin / recover / promote / retract
// all contend on ONE lock path (`<specPath>.repin.lock`) and ONE protocol:
// atomic O_EXCL mutual exclusion (the ONLY atomicity claim), a nonce-stamped PID
// through the O_EXCL fd (no empty-and-closed double-writer window), and NO
// programmatic stale-lock clearing ANYWHERE - POSIX has no atomic
// conditional-delete, so any online unlink of a foreign lock is a non-atomic CAS
// race (the P0 this previously had when reclaimStaleWriterLock unlinked a dead
// lock before its own O_EXCL). A dead/unparseable holder is fail-closed: the
// operator stops all writers, runs `--inspect-lock` for diagnostics, MANUALLY
// moves the lock to quarantine (mv), then runs `--recover` which O_EXCL-creates
// fresh and reconciles the journal. release() nonce-guards its unlink as
// defense-in-depth (NON-atomic; the release-side ABA is closed because NO
// foreign-unlink path exists, not by the nonce check). EPERM is treated as alive.
// `acquireWriterLock`, `reclaimStaleWriterLock`, `inspectWriterLock`, and
// `defaultIsPidAlive` are imported above.

// faultInject: a cooperative crash hook. When `ctx.faultAt` equals the current
// phase, the process is killed to simulate abrupt death. `crashMode: "exit"`
// (default) calls process.exit(86); `crashMode: "sigkill"` sends itself SIGKILL,
// which cannot be caught and does not run finally blocks - the hardest crash a
// repin can suffer. Real crash tests spawn a child with faultAt/crashMode set
// and then run recovery; the in-memory unit tests leave faultAt unset. The hook
// is a no-op outside a fault-injection run.
function faultInject(phase, ctx) {
  if (!ctx || ctx.faultAt !== phase) return;
  if (ctx.crashMode === "sigkill") {
    process.kill(process.pid, "SIGKILL");
  }
  process.exit(86);
}

// Startup/stall recovery. Reads any leftover journal and reconciles the spec +
// dependency pair to a consistent state (either the original preimage or the
// fully-applied new pin), removing the journal and any temps. Returns a string
// describing the recovery action, or "" when there was nothing to recover.
export function recoverRepinJournal(opts = {}) {
  const fsOps = opts.fsOps ?? realFsOps;
  const isPidAlive = opts.isPidAlive ?? defaultIsPidAlive;
  const specPath = resolveRealPath(fsOps, opts.specFile ?? specFile);
  const lockFile = opts.lockFile ?? `${specPath}.repin.lock`;
  // Explicit --recover path. acquireWriterLock does NOT auto-reclaim a stale
  // (dead-holder) lock, and reclaimStaleWriterLock NEVER unlinks a foreign lock -
  // POSIX has no atomic conditional-delete, so any online unlink is a non-atomic
  // CAS race (the P0 this previously had when reclaim unlinked a dead lock before
  // its own O_EXCL). Instead, recovery is OUT OF BAND: the operator stops all
  // writers, runs `--inspect-lock` for diagnostics, MANUALLY moves any stale lock
  // to quarantine (mv), then runs `--recover`. With the lock path absent,
  // reclaimStaleWriterLock is a no-op return (the gate that proves the operator
  // already cleared it), acquireWriterLock O_EXCL-creates a fresh lock, and
  // recoverRepinJournalWhileLocked reconciles the journal. If a lock STILL exists
  // (operator did not quarantine), reclaimStaleWriterLock throws (refuses) and
  // --recover exits 1 with diagnostics - never a double-writer. The lock is
  // released in finally.
  reclaimStaleWriterLock({ lockFile, fsOps, isPidAlive });
  const release = acquireWriterLock({ lockFile, fsOps, isPidAlive });
  try {
    return recoverRepinJournalWhileLocked(opts);
  } finally {
    release();
  }
}

// Internal recovery: reconcile the journal assuming the caller already holds the
// shared writer lock. repipeTransaction calls this from inside its own held lock,
// so it must not re-acquire (a self-held lock would be refused by acquireWriterLock).
export function recoverRepinJournalWhileLocked(opts = {}) {
  const gitOps = opts.gitOps ?? realGitOps;
  const fsOps = opts.fsOps ?? realFsOps;
  // Resolve symlinks the same way repipeTransaction does, so a journal written
  // beside the real file is found when recovery is given the symlink path.
  const specPath = resolveRealPath(fsOps, opts.specFile ?? specFile);
  const depsPath = resolveRealPath(fsOps, opts.dependenciesFile ?? dependenciesFile);
  const journalPath = repinJournalPath(specPath);

  const document = readRepinJournal(fsOps, journalPath);
  if (!document) return "";

  if (document.specPath !== specPath || document.depsPath !== depsPath) {
    throw new Error(
      `repin journal targets ${document.specPath}/${document.depsPath} but recovery was asked for ${specPath}/${depsPath}; manual recovery is required`,
    );
  }
  for (const name of ["spec", "deps"]) {
    const expected = name === "spec" ? specPath : depsPath;
    if (!verifyBackupIntact(document.backups[name], expected)) {
      throw new Error(`repin journal backup '${name}' is missing or corrupt; manual recovery is required`);
    }
  }
  // Validate the phase chain for journal integrity (every applied phase's
  // applied post-image must match its expected post-image; an intent phase may
  // only be the trailing entry). The loop does NOT select the reconciliation
  // action: the action is driven by LIVE file hashes below, because a crash
  // between a rename and its mark leaves the live file renamed while the journal
  // still records 'intent' - so the markers cannot be trusted for the decision.
  let lastAppliedIndex = -1;
  for (const [index, phase] of document.phases.entries()) {
    if (
      !phase || typeof phase.phase !== "string" ||
      phase.phase !== REPIN_PHASES[index] ||
      (phase.state !== "intent" && phase.state !== "applied")
    ) {
      throw new Error("repin journal phase chain is invalid; manual recovery is required");
    }
    if (phase.state === "applied") {
      if (!phase.expectedPostHashes || !phase.appliedPostHashes ||
        JSON.stringify(phase.appliedPostHashes) !== JSON.stringify(phase.expectedPostHashes)) {
        throw new Error("repin journal applied phase post-image mismatch; manual recovery is required");
      }
      lastAppliedIndex = index;
    } else if (index !== document.phases.length - 1 || index !== lastAppliedIndex + 1 || phase.appliedPostHashes !== null) {
      throw new Error("repin journal has an in-flight intent that is not the trailing phase; manual recovery is required");
    }
  }

  // Canonical temp paths are derived from the resolved spec/deps paths and are
  // NEVER read from the journal (document.specTmp/document.depsTmp): a forged
  // journal could otherwise name an arbitrary path for the rename/unlink and
  // redirect recovery at an unrelated file.
  const specTmp = `${specPath}.repin.tmp`;
  const depsTmp = `${depsPath}.repin.tmp`;

  const originalSpecHash = document.backups.spec.existed ? document.backups.spec.sha256 : null;
  const originalDepsHash = document.backups.deps.existed ? document.backups.deps.sha256 : null;
  // The "both files at the new pin" post-image is recorded by the temps-written
  // phase (applied before any rename). A crash before temps-written leaves only
  // the 'opened' phase, in which case newHashes is null and only the
  // "both original" / "neither" branches can fire.
  const tempsWrittenPhase = document.phases.find((p) => p.phase === "temps-written");
  const newHashes = tempsWrittenPhase ? tempsWrittenPhase.expectedPostHashes : null;

  const liveSpecHash = fileHashOrNull(fsOps, specPath);
  const liveDepsHash = fileHashOrNull(fsOps, depsPath);
  const depsTmpHash = fileHashOrNull(fsOps, depsTmp);

  const specBackup = deserializeBackup(document.backups.spec);
  const depsBackup = deserializeBackup(document.backups.deps);

  const cleanup = () => {
    safeUnlink(fsOps, specTmp);
    safeUnlink(fsOps, depsTmp);
    safeUnlink(fsOps, journalPath);
    // NOTE: the caller owns the lock release. recoverRepinJournalWhileLocked is
    // only ever invoked under a held shared writer lock (repipeTransaction holds
    // its own; the public recoverRepinJournal acquires before calling). Removing
    // the lock here would delete the caller's lock (or, after a reclaim, a lock
    // that now belongs to a different writer) - an ABA on the lock itself.
  };

  // Hash-driven reconciliation. Ground truth is the LIVE file content vs the
  // original backup hashes and the new post-image hashes - NOT the journal phase
  // markers. This is correct for every crash point, including the rename->mark
  // window (rename done, mark not done): the live hash already reflects the
  // rename, so the matching branch fires regardless of whether the mark landed.
  const specNew = newHashes && liveSpecHash === newHashes.spec;
  const depsNew = newHashes && liveDepsHash === newHashes.deps;
  const specOrig = originalSpecHash !== null && liveSpecHash === originalSpecHash;
  const depsOrig = originalDepsHash !== null && liveDepsHash === originalDepsHash;

  let action;
  if (newHashes && specNew && depsNew) {
    // Both live files are at the new pin (rename[s] landed; marks may or may not
    // have). Accept the completed repin - no live mutation needed.
    action = `accepted completed repin to ${document.targetCommit}`;
  } else if (newHashes && specNew && depsOrig) {
    // Spec renamed to the new pin, deps still original (the rename->mark window
    // for the spec rename, OR the spec-rename-done-pre-deps-rename crash).
    // Complete the deps rename only if its temp is intact and matches the declared
    // hash; otherwise roll the spec back to original so the pair is consistent.
    if (depsTmpHash === newHashes.deps) {
      fsOps.renameSync(depsTmp, depsPath);
      fsyncDir(fsOps, depsPath);
      action = `completed stalled repin to ${document.targetCommit}`;
    } else {
      restoreBackup(fsOps, specPath, specBackup);
      action = "rolled back half-updated repin (deps temp missing/mismatched)";
    }
  } else if (specOrig && depsOrig) {
    // No live file changed (temps-written or earlier crash, or already rolled
    // back): the original pair is intact. Drop the temps + journal.
    action = "discarded uncommitted repin (no live file changed)";
  } else if (newHashes && specOrig && depsNew) {
    // Inconsistent: deps renamed to new but spec still original. The spec-before-
    // deps rename order makes this unreachable in a real crash; if observed, the
    // pair is corrupt, so roll the deps back to original.
    restoreBackup(fsOps, depsPath, depsBackup);
    action = "rolled back inconsistent repin (deps renamed before spec)";
  } else {
    // Live files match neither the original nor the new post-image: unrecoverable
    // corruption. Fail closed by restoring both originals from the backups.
    restoreBackup(fsOps, specPath, specBackup);
    restoreBackup(fsOps, depsPath, depsBackup);
    action = "rolled back corrupted repin (live files match neither preimage)";
  }
  cleanup();
  if (action.includes("rolled back") || action.includes("completed stalled") ||
    action.includes("mismatched") || action.includes("corrupted") ||
    action.includes("inconsistent")) {
    console.error(`[runtime-payload-source] recovered incomplete repin: ${action}`);
  }
  return action;
}

// Restore a live file from its backup via a durable temp+fsync+rename (not a
// bare writeFileSync-over-live, which a crash mid-write could leave torn). A
// missing original (existed=false) is restored by removing the live file.
function restoreBackup(fsOps, target, backup) {
  if (backup.bytes === null) {
    safeUnlink(fsOps, target);
  } else {
    durableWriteBytes(fsOps, target, backup.bytes);
  }
}

// Shared self-consistency proof used by both the default check and the repin
// post-write re-verification. Validates repository/commit/tree shape, that the
// declared tree matches the commit's tree, that every declared source sha256
// matches the blob at `git show <commit>:<path>`, and that the dependency
// mirror agrees exactly. Returns { ok, errors }.
export function verifySpecSelfConsistency(spec, dependencies, gitOps) {
  const sot = spec?.sourceOfTruth;
  const commit = sot?.commit;
  const declaredTree = sot?.tree;
  const sources = sot?.sources;
  const errors = [];

  if (sot?.repository !== "Reader-Core-Native" ||
    !/^[a-f0-9]{40}$/.test(commit || "") ||
    !/^[a-f0-9]{40}$/.test(declaredTree || "") ||
    !isCanonicalSourceSet(sources)) {
    errors.push(
      "invalid sourceOfTruth: repository must be Reader-Core-Native, commit/tree must be 40-hex, " +
      "and sources must equal the canonical ordered Core set."
    );
    return { ok: false, errors };
  }

  if (!gitOps.commitExists(commit)) {
    errors.push(`declared commit ${commit} is not a valid Reader-Core-Native commit.`);
    return { ok: false, errors };
  }

  let actualTree;
  try {
    actualTree = gitOps.treeOf(commit);
  } catch (error) {
    errors.push(`could not resolve tree for ${commit}: ${error.message}`);
    return { ok: false, errors };
  }
  if (actualTree !== declaredTree) {
    errors.push(`declared tree ${declaredTree} does not match commit ${commit} tree ${actualTree}`);
  }

  for (const entry of sources) {
    let blob;
    try {
      blob = gitOps.blobBytes(commit, entry.path);
    } catch (error) {
      errors.push(`${entry.path}: could not read blob at ${commit}: ${error.message}`);
      continue;
    }
    const digest = sha256Bytes(blob);
    if (digest !== entry.sha256) {
      errors.push(`${entry.path}: declared ${entry.sha256}, ${commit} blob ${digest}`);
    }
  }

  const mirror = findRuntimeContractMirror(dependencies);
  const rc = mirror?.runtimeContract;
  if (!rc ||
    rc.externalSourceRepository !== "Reader-Core-Native" ||
    rc.externalSourceCommit !== commit ||
    rc.externalSourceTree !== declaredTree ||
    JSON.stringify(rc.externalSources) !== JSON.stringify(sources)) {
    errors.push(
      `dependency mirror runtimeContract for ${READING_SURFACE_RECORD_ID} ` +
      `does not match spec sourceOfTruth (commit/tree/sources).`
    );
  }

  return { ok: errors.length === 0, errors };
}

// Default mode: prove the spec pins a real, internally-consistent Core commit.
export function check() {
  const spec = loadJson(specFile);
  const dependencies = loadJson(dependenciesFile);
  const result = verifySpecSelfConsistency(spec, dependencies, realGitOps);
  if (!result.ok) {
    console.error(`[runtime-payload-source] drift:\n${result.errors.join("\n")}`);
    process.exitCode = 1;
    return;
  }
  const sources = spec?.sourceOfTruth?.sources;
  const commit = spec?.sourceOfTruth?.commit;
  console.log(`[runtime-payload-source] verified ${sources.length} declared commit blobs at ${commit}`);
}

function safeUnlink(fsOps, file) {
  try { fsOps.unlinkSync(file); } catch { /* already absent */ }
}

// --source-commit <sha>: atomically repin spec + dependency mirror.
// The transaction: lock -> dirty check -> compute new commit/tree/sources ->
// pre-write verify (in memory, writes nothing) -> snapshot originals -> write
// temp files -> ordered atomic renames (rollback rename #1 if #2 fails) ->
// post-write re-verify (restore snapshots on failure) -> release lock.
// --source-commit <sha>: atomically repin spec + dependency mirror.
//
// The transaction is durable and recoverable: a write-ahead journal records the
// intent, the original-file backups (bytes + sha256), and the expected post-image
// hashes BEFORE any live mutation. Temps are fsync'd, then promoted via ordered
// atomic renames, each phase marked applied in the journal. A crash at any point
// leaves the journal + temps on disk; the next run's recoverRepinJournal()
// reconciles the pair to a consistent state (original or new pin) and removes
// the leftovers. A compare-and-swap guard aborts if a third party mutated a live
// file between snapshot and rename. faultAt injects abrupt death for crash tests.
export function repipeTransaction(sha, opts = {}) {
  const gitOps = opts.gitOps ?? realGitOps;
  const fsOps = opts.fsOps ?? realFsOps;
  const faultAt = opts.faultAt ?? null;
  const crashMode = opts.crashMode === "sigkill" ? "sigkill" : "exit";
  const crashCtx = { faultAt, crashMode };
  const isPidAlive = opts.isPidAlive ?? defaultIsPidAlive;
  // Resolve symlinks so the journal/lock/temps sit beside the real file and
  // recovery (which resolves the same way) finds them.
  const specPath = resolveRealPath(fsOps, opts.specFile ?? specFile);
  const depsPath = resolveRealPath(fsOps, opts.dependenciesFile ?? dependenciesFile);
  const lockFile = `${specPath}.repin.lock`;
  const journalPath = repinJournalPath(specPath);
  const specTmp = `${specPath}.repin.tmp`;
  const depsTmp = `${depsPath}.repin.tmp`;

  if (!/^[a-f0-9]{40}$/.test(sha || "")) {
    throw new Error(`--source-commit requires a 40-hex SHA, got: ${sha}`);
  }

  faultInject("start", crashCtx);

  // 1. Acquire the shared writer lock (same path/protocol as promote/retract, so
  //    a concurrent promote is refused and vice versa). A stale lock from a dead
  //    holder (a SIGKILL'd repin) is reclaimed; a live holder causes refusal.
  const releaseLock = acquireWriterLock({ lockFile, fsOps, isPidAlive });

  try {
    // 2. Recover any incomplete prior transaction before mutating. A leftover
    //    journal means the prior repin died mid-flight; reconcile first.
    if (fsOps.existsSync(journalPath)) {
      recoverRepinJournalWhileLocked({ specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps });
    }

    // 3. Refuse on dirty authoritative files: the repinned commit must match committed bytes.
    const dirty = gitOps.authoritativeFilesDirty();
    if (dirty !== "") {
      throw new Error(
        `authoritative Core source files have uncommitted changes; commit or revert before repinning:\n${dirty}`
      );
    }

    // 4. Validate the target commit and compute its tree + source hashes.
    if (!gitOps.commitExists(sha)) {
      throw new Error(`${sha} is not a valid Reader-Core-Native commit.`);
    }
    const tree = gitOps.treeOf(sha);

    const spec = JSON.parse(fsOps.readFileSync(specPath).toString("utf8"));
    const sources = spec?.sourceOfTruth?.sources;
    if (!isCanonicalSourceSet(sources)) {
      throw new Error("spec source path set has drifted from the canonical Core set; refusing to repin.");
    }
    const newSources = sources.map((entry) => ({
      path: entry.path,
      sha256: sha256Bytes(gitOps.blobBytes(sha, entry.path)),
    }));

    const dependencies = JSON.parse(fsOps.readFileSync(depsPath).toString("utf8"));
    const mirror = findRuntimeContractMirror(dependencies);
    if (!mirror?.runtimeContract) {
      throw new Error(`dependency mirror has no runtimeContract for ${READING_SURFACE_RECORD_ID}; aborting before any write.`);
    }

    // Build the new in-memory spec + mirror.
    const newSpec = JSON.parse(JSON.stringify(spec));
    newSpec.sourceOfTruth.commit = sha;
    newSpec.sourceOfTruth.tree = tree;
    newSpec.sourceOfTruth.sources = newSources;
    const newDependencies = JSON.parse(JSON.stringify(dependencies));
    const newMirror = findRuntimeContractMirror(newDependencies);
    newMirror.runtimeContract.externalSourceCommit = sha;
    newMirror.runtimeContract.externalSourceTree = tree;
    newMirror.runtimeContract.externalSources = newSources;

    // 5. Pre-write verify: confirm the new spec is self-consistent BEFORE any write.
    const preVerify = verifySpecSelfConsistency(newSpec, newDependencies, gitOps);
    if (!preVerify.ok) {
      throw new Error(`pre-write verification failed; no files written:\n${preVerify.errors.join("\n")}`);
    }

    // 6. Snapshot originals (for the journal backups + rollback).
    const originalSpecBytes = fsOps.readFileSync(specPath);
    const originalDepsBytes = fsOps.readFileSync(depsPath);
    const originalSpecHash = sha256Hex(originalSpecBytes);
    const originalDepsHash = sha256Hex(originalDepsBytes);
    const expectedSpecHash = sha256Hex(Buffer.from(`${JSON.stringify(newSpec, null, 2)}\n`));
    const expectedDepsHash = sha256Hex(Buffer.from(`${JSON.stringify(newDependencies, null, 2)}\n`));

    // 7. Open the journal: record intent + backups + the full expected post-image
    //    chain, durably. The 'opened' phase is immediately applied (journal landed).
    const journal = {
      kind: REPIN_JOURNAL_KIND,
      schemaVersion: REPIN_JOURNAL_SCHEMA_VERSION,
      targetCommit: sha,
      targetTree: tree,
      specPath, depsPath, specTmp, depsTmp,
      backups: {
        spec: serializeBackup("spec", specPath, originalSpecBytes),
        deps: serializeBackup("deps", depsPath, originalDepsBytes),
      },
      phases: [{
        phase: "opened",
        state: "applied",
        expectedPostHashes: { spec: originalSpecHash, deps: originalDepsHash },
        appliedPostHashes: { spec: originalSpecHash, deps: originalDepsHash },
      }],
    };
    durableWriteJson(fsOps, journalPath, journal);
    faultInject("after-journal-open", crashCtx);

    // 8. Compare-and-swap: refuse if a live file drifted from the snapshot.
    const drift = casGuard(fsOps, specPath, depsPath, originalSpecHash, originalDepsHash);
    if (drift !== "") {
      throw new Error(drift);
    }

    // 9. Write + fsync the temps, then mark 'temps-written' applied.
    beginRepinPhase(fsOps, journalPath, "temps-written", { spec: expectedSpecHash, deps: expectedDepsHash });
    writeAndFsync(fsOps, specTmp, `${JSON.stringify(newSpec, null, 2)}\n`);
    writeAndFsync(fsOps, depsTmp, `${JSON.stringify(newDependencies, null, 2)}\n`);
    markRepinPhaseApplied(fsOps, journalPath, "temps-written", { spec: expectedSpecHash, deps: expectedDepsHash });
    faultInject("after-temps", crashCtx);

    // 10. Rename spec temp -> live, mark 'spec-renamed' applied.
    beginRepinPhase(fsOps, journalPath, "spec-renamed", { spec: expectedSpecHash, deps: originalDepsHash });
    faultInject("before-spec-rename", crashCtx);
    fsOps.renameSync(specTmp, specPath);
    fsyncDir(fsOps, specPath);
    // CRASH WINDOW: the spec rename has landed on disk but the journal still
    // records 'intent' for spec-renamed (the mark below has not run). A crash
    // here is the rename->mark split the marker-driven recovery mishandled; the
    // hash-driven recoverRepinJournal sees live spec == new pin and completes
    // (or rolls back) consistently. This hook fires BETWEEN rename+fsync and mark.
    faultInject("after-spec-rename-pre-mark", crashCtx);
    markRepinPhaseApplied(fsOps, journalPath, "spec-renamed", { spec: expectedSpecHash, deps: originalDepsHash });
    faultInject("after-spec-rename", crashCtx);

    // 11. Rename deps temp -> live, mark 'deps-renamed' applied (transaction complete).
    beginRepinPhase(fsOps, journalPath, "deps-renamed", { spec: expectedSpecHash, deps: expectedDepsHash });
    faultInject("before-deps-rename", crashCtx);
    fsOps.renameSync(depsTmp, depsPath);
    fsyncDir(fsOps, depsPath);
    // CRASH WINDOW: deps rename landed, deps-renamed mark has not. Same split
    // risk as the spec rename; hash-driven recovery handles it consistently.
    faultInject("after-deps-rename-pre-mark", crashCtx);
    markRepinPhaseApplied(fsOps, journalPath, "deps-renamed", { spec: expectedSpecHash, deps: expectedDepsHash });
    faultInject("after-deps-rename", crashCtx);

    // 12. Post-write re-verify: re-read the live files and prove they are consistent.
    const rereadSpec = JSON.parse(fsOps.readFileSync(specPath).toString("utf8"));
    const rereadDeps = JSON.parse(fsOps.readFileSync(depsPath).toString("utf8"));
    const postVerify = verifySpecSelfConsistency(rereadSpec, rereadDeps, gitOps);
    if (!postVerify.ok) {
      // Restore both originals from the journal backups; the transaction did not produce a valid pin.
      restoreBackup(fsOps, specPath, deserializeBackup(journal.backups.spec));
      restoreBackup(fsOps, depsPath, deserializeBackup(journal.backups.deps));
      throw new Error(`post-write verification failed; rolled back to original files:\n${postVerify.errors.join("\n")}`);
    }

    // 13. Transaction complete: remove the journal + release the lock.
    safeUnlink(fsOps, journalPath);
    console.log(
      `[runtime-payload-source] repinned to ${sha} (tree ${tree}); updated ${newSources.length} source hashes + dependency mirror.`
    );
  } finally {
    // Release the shared writer lock on every normal exit path (completion OR
    // throw): the nonce-keyed release only deletes a lock that is still ours, so
    // a lock reclaimed by another writer in the gap is left untouched. A SIGKILL
    // does NOT run finally, so a crashed repin leaves a stale (dead-PID) lock +
    // journal for the next run's recovery to reclaim and reconcile - that is the
    // only path on which the lock outlives this invocation.
    if (releaseLock) releaseLock();
  }
}

export function sourceCommit(sha) {
  repipeTransaction(sha, {});
}

// CLI recovery: reconcile any journal left by a crashed repin. Called explicitly
// via --recover, and internally by repipeTransaction before a new repin mutates.
export function recover() {
  return recoverRepinJournal({});
}

// Read-only: report a leftover repin journal WITHOUT reconciling it. The
// default check must not mutate authority files (it has no shared lock with a
// concurrent promotion), so an incomplete repin is left on disk for an explicit
// --recover / --source-commit to reconcile, and the check fails closed.
export function leftoverRepinJournalPath() {
  const specPath = resolveRealPath(realFsOps, specFile);
  const journalPath = repinJournalPath(specPath);
  return realFsOps.existsSync(journalPath) ? journalPath : "";
}

// CLI dispatch only when invoked as the main module (so tests can import safely).
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const sourceCommitIndex = args.indexOf("--source-commit");
  if (args.includes("--update")) {
    console.error(
      "[runtime-payload-source] --update is removed; it left commit/tree/mirror stale. " +
      "Use --source-commit <40sha> for an atomic repin."
    );
    process.exitCode = 1;
  } else if (args.includes("--inspect-lock")) {
    // Read-only diagnostics for the shared writer lock. NEVER mutates the lock
    // file. Prints state (ABSENT/EMPTY/LIVE/DEAD) + quarantine guidance so the
    // operator can decide whether to run --recover (only safe when ABSENT).
    try {
      const specPath = resolveRealPath(realFsOps, specFile);
      const lockFile = `${specPath}.repin.lock`;
      const info = inspectWriterLock({ lockFile });
      console.log(`[runtime-payload-source] lock at ${lockFile}`);
      console.log(`  state: ${info.state}`);
      console.log(`  exists: ${info.exists}`);
      if (info.exists) {
        console.log(`  pid: ${info.pid}`);
        console.log(`  nonce: ${info.nonce}`);
        console.log(`  parseable: ${info.parseable}`);
        console.log(`  alive: ${info.alive}`);
      }
      if (info.state === "ABSENT") {
        console.log("  -> no lock present; --recover may proceed (O_EXCL + journal reconcile)");
      } else if (info.state === "LIVE") {
        console.log(`  -> a writer (pid ${info.pid}) is active; do NOT quarantine. Wait for it to finish.`);
      } else {
        console.log("  -> STALE lock. Stop all writers, then MANUALLY move this lock file to quarantine (mv),");
        console.log("     then run `--recover` to acquire (O_EXCL) and reconcile the journal.");
      }
    } catch (error) {
      console.error(`[runtime-payload-source] ${error.message}`);
      process.exitCode = 1;
    }
  } else if (args.includes("--recover")) {
    try {
      const action = recover();
      console.log(action
        ? `[runtime-payload-source] ${action}`
        : "[runtime-payload-source] no incomplete repin to recover");
    } catch (error) {
      console.error(`[runtime-payload-source] ${error.message}`);
      process.exitCode = 1;
    }
  } else if (sourceCommitIndex !== -1) {
    // recoverRepinJournal runs first inside repipeTransaction; a leftover
    // journal from a prior crash is reconciled before the new repin mutates.
    try {
      sourceCommit(args[sourceCommitIndex + 1]);
    } catch (error) {
      console.error(`[runtime-payload-source] ${error.message}`);
      process.exitCode = 1;
    }
  } else {
    // Default check: READ-ONLY. Prove the spec pins a real, internally-
    // consistent Core commit. An incomplete repin (leftover journal) is reported
    // and fails closed WITHOUT writing - recovery is an explicit --recover /
    // --source-commit so the check never races a promotion or mutates authority.
    const leftover = leftoverRepinJournalPath();
    if (leftover) {
      console.error(
        `[runtime-payload-source] incomplete repin journal detected at ${leftover}; ` +
        `run '--recover' to reconcile before checking (default check is read-only).`
      );
      process.exitCode = 1;
    } else {
      check();
    }
  }
}
