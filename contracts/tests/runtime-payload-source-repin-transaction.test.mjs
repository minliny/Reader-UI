// Repin transaction journal/recovery/env-isolation/CAS/crash tests.
//
// check-runtime-payload-source.mjs --source-commit is a durable, recoverable
// transaction: a write-ahead journal records intent + original-file backups +
// expected post-image hashes BEFORE any live mutation; temps are fsync'd and
// promoted via ordered atomic renames, each phase marked applied; a crash at any
// point leaves the journal + temps on disk for the next run's recoverRepinJournal()
// to reconcile the pair to a consistent state (original or new pin). A CAS guard
// aborts if a live file drifted between snapshot and rename. The git binary is
// hardcoded (no env override).
//
// These tests do not touch the real Reader-Core-Native checkout or the real
// ui-spec/docs files: they drive repipeTransaction against an in-memory fsOps +
// fake gitOps, and against a real temp directory + fake gitOps for the crash
// tests. The spec stays pinned at OLD_SHA throughout (no real repin to 5a).
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  repipeTransaction,
  recoverRepinJournal,
  GIT_BIN,
  RUNTIME_CORE_SOURCE_PATHS,
} from "../../tools/runtime/check-runtime-payload-source.mjs";

const NEW_SHA = "5a892ad9e05ec41e9cdf846da966d44f5624436d";
const OLD_SHA = "7a0718a4fb083a2cadfba061536ab82edb49d614";
const NEW_TREE = "1d8158e4ad04fe92059395302b6d1b40c1f8622e";
const OLD_TREE = "8dd15df38c0d5931b2681e0d7792193574f5522c";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_FILE = path.resolve(HERE, "../../tools/runtime/check-runtime-payload-source.mjs");

function sha(b) {
  return crypto.createHash("sha256").update(b).digest("hex");
}

// Build a fixture spec + dependency mirror pinned to OLD_SHA, plus the bytes
// the fake gitOps returns for OLD_SHA / NEW_SHA blobs. Deterministic so a child
// process can reconstruct the identical fake gitOps for recovery.
function makeFixture() {
  const oldBytes = {};
  const newBytes = {};
  const oldSources = [];
  const newSources = [];
  for (const p of RUNTIME_CORE_SOURCE_PATHS) {
    oldBytes[p] = Buffer.from(`old:${p}`);
    newBytes[p] = Buffer.from(`new:${p}`);
    oldSources.push({ path: p, sha256: sha(oldBytes[p]) });
    newSources.push({ path: p, sha256: sha(newBytes[p]) });
  }
  const spec = {
    sourceOfTruth: {
      repository: "Reader-Core-Native",
      commit: OLD_SHA,
      tree: OLD_TREE,
      sources: oldSources,
    },
  };
  const dependencies = {
    sourceAuthorities: [
      {
        recordId: "reader.reading-surface",
        runtimeContract: {
          externalSourceRepository: "Reader-Core-Native",
          externalSourceCommit: OLD_SHA,
          externalSourceTree: OLD_TREE,
          externalSources: oldSources,
        },
      },
    ],
  };
  return { spec, dependencies, oldBytes, newBytes, oldSources, newSources };
}

// Deterministic fake gitOps so the child crash-driver and the parent recovery
// derive identical blob bytes / hashes.
function stableGitOps(fixture) {
  return {
    commitExists: (s) => s === OLD_SHA || s === NEW_SHA,
    treeOf: (s) => (s === NEW_SHA ? NEW_TREE : OLD_TREE),
    blobBytes: (s, p) => (s === NEW_SHA ? fixture.newBytes[p] : fixture.oldBytes[p]),
    authoritativeFilesDirty: () => "",
  };
}

// In-memory fsOp backed by a Map. fsync is a noop (the real durability paths are
// exercised by the real-temp-dir crash tests below). `writeSync` + fd->path
// tracking mirrors the real fd-based lock write (the PID is written through the
// O_EXCL fd, not by path after a close, so the lock is never empty-and-closed).
// `lstatSync` returns a non-symlink stat so safeWriteFile's symlink rejection is
// exercised on the happy path (real symlink rejection is tested separately).
function makeMemFs(specPath, depsPath, fixture) {
  const files = new Map();
  files.set(specPath, Buffer.from(`${JSON.stringify(fixture.spec, null, 2)}\n`));
  files.set(depsPath, Buffer.from(`${JSON.stringify(fixture.dependencies, null, 2)}\n`));
  let nextFd = 100;
  const fdToPath = new Map();
  return {
    files,
    existsSync(file) { return files.has(file); },
    readFileSync(file) { const b = files.get(file); if (!b) throw new Error(`ENOENT: ${file}`); return b; },
    writeFileSync(file, data) { files.set(file, Buffer.isBuffer(data) ? data : Buffer.from(data)); },
    writeSync(fd, data) { const p = fdToPath.get(fd); if (p === undefined) return; files.set(p, Buffer.isBuffer(data) ? data : Buffer.from(data)); },
    renameSync(from, to) { if (!files.has(from)) throw new Error(`ENOENT: ${from}`); files.set(to, files.get(from)); files.delete(from); },
    unlinkSync(file) { files.delete(file); },
    openSync(file, flag) {
      if (flag === "wx") {
        if (files.has(file)) { const err = new Error(`EEXIST: ${file}`); err.code = "EEXIST"; throw err; }
        // Mirror real fs: O_CREAT|O_EXCL creates an empty file, so a concurrent
        // opener observes the lock existing immediately (no empty-and-closed gap).
        files.set(file, Buffer.alloc(0));
      }
      // Opening for read/fsync must NOT clobber the stored content.
      const fd = nextFd++;
      fdToPath.set(fd, file);
      return fd;
    },
    closeSync(fd) { fdToPath.delete(fd); },
    fsyncSync() { /* noop */ },
    lstatSync(file) {
      if (!files.has(file)) { const err = new Error(`ENOENT: ${file}`); err.code = "ENOENT"; throw err; }
      return { isSymbolicLink: () => false, isFile: () => true, isDirectory: () => false };
    },
  };
}

function specOf(fsOps, specPath) {
  return JSON.parse(fsOps.readFileSync(specPath).toString("utf8"));
}
function depsOf(fsOps, depsPath) {
  return JSON.parse(fsOps.readFileSync(depsPath).toString("utf8"));
}

// Self-contained temp Core Git repo + a sandbox copy of the checker so the CLI's
// module-derived `root`/`specFile`/`dependenciesFile` resolve inside the temp tree
// and `coreRoot` resolves to the temp repo via READER_CORE_NATIVE_DIR. This lets
// the default-check CLI tests run end-to-end with REAL git against a temp commit,
// with NO dependency on the real Reader-Core-Native sibling checkout being present
// on the dev machine (the audit flagged the prior CLI tests for relying on it).
// Mirrors the module's SCRUBBED_GIT_ENV_KEYS so a stray GIT_DIR cannot redirect the
// helper's own git calls either.
const SCRUBBED_GIT_ENV_KEYS = [
  "GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_OBJECT_DATABASE",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_CONFIG", "GIT_CONFIG_GLOBAL",
  "GIT_CONFIG_SYSTEM", "GIT_CONFIG_NOSYSTEM",
];
function scrubGitEnvForTests() {
  const env = { ...process.env };
  for (const key of SCRUBBED_GIT_ENV_KEYS) delete env[key];
  return env;
}
function makeSelfContainedCoreFixture() {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "repin-cli-sandbox-"));
  const coreRepo = fs.mkdtempSync(path.join(os.tmpdir(), "repin-cli-core-"));
  fs.mkdirSync(path.join(sandbox, "tools", "runtime"), { recursive: true });
  fs.mkdirSync(path.join(sandbox, "tools", "shared"), { recursive: true });
  fs.mkdirSync(path.join(sandbox, "ui-spec"), { recursive: true });
  fs.mkdirSync(path.join(sandbox, "docs", "design"), { recursive: true });
  fs.copyFileSync(SOURCE_FILE, path.join(sandbox, "tools", "runtime", "check-runtime-payload-source.mjs"));
  fs.copyFileSync(
    path.join(HERE, "..", "..", "tools", "shared", "shared-writer-lock.mjs"),
    path.join(sandbox, "tools", "shared", "shared-writer-lock.mjs"),
  );

  const git = (args) => spawnSync(GIT_BIN, args, { cwd: coreRepo, encoding: "utf8", env: scrubGitEnvForTests() });
  const init = git(["init", "--quiet"]);
  if (init.status !== 0) throw new Error(`self-contained fixture: git init failed: ${init.stderr}`);
  const sources = [];
  for (const p of RUNTIME_CORE_SOURCE_PATHS) {
    const abs = path.join(coreRepo, p);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    const bytes = Buffer.from(`self-contained:${p}`);
    fs.writeFileSync(abs, bytes);
    sources.push({ path: p, sha256: sha(bytes) });
  }
  const cfg = ["-c", "user.email=self@contained", "-c", "user.name=self", "-c", "commit.gpgsign=false"];
  const add = git([...cfg, "add", ...RUNTIME_CORE_SOURCE_PATHS]);
  if (add.status !== 0) throw new Error(`self-contained fixture: git add failed: ${add.stderr}`);
  const commit = git([...cfg, "commit", "-m", "self-contained core"]);
  if (commit.status !== 0) throw new Error(`self-contained fixture: git commit failed: ${commit.stderr}`);
  const head = git(["rev-parse", "HEAD"]);
  if (head.status !== 0) throw new Error(`self-contained fixture: rev-parse HEAD failed: ${head.stderr}`);
  const commitSha = head.stdout.trim();
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  if (tree.status !== 0) throw new Error(`self-contained fixture: rev-parse tree failed: ${tree.stderr}`);
  const treeSha = tree.stdout.trim();

  const spec = { sourceOfTruth: { repository: "Reader-Core-Native", commit: commitSha, tree: treeSha, sources } };
  const dependencies = {
    sourceAuthorities: [{
      recordId: "reader.reading-surface",
      runtimeContract: {
        externalSourceRepository: "Reader-Core-Native",
        externalSourceCommit: commitSha,
        externalSourceTree: treeSha,
        externalSources: sources,
      },
    }],
  };
  const sandboxSpec = path.join(sandbox, "ui-spec", "runtime-payload-contracts.json");
  const sandboxDeps = path.join(sandbox, "docs", "design", "FIGMA_VISUAL_ADMISSION_DEPENDENCIES.json");
  fs.writeFileSync(sandboxSpec, `${JSON.stringify(spec, null, 2)}\n`);
  fs.writeFileSync(sandboxDeps, `${JSON.stringify(dependencies, null, 2)}\n`);
  // A MODULE-API driver: imports the sandboxed checker and calls check() directly.
  // This is a MODULE-LEVEL supplement only - the real CLI evidence comes from the
  // tests below that spawn `node check-runtime-payload-source.mjs` (sandboxChecker)
  // directly. The checker's isMain dispatch uses realpathSync on BOTH process.argv[1]
  // and import.meta.url, so a sandbox under the macOS /var -> /private/var symlink
  // still matches and check() runs - the driver is no longer needed to paper over
  // an isMain trap. It is retained only as a module-API exercise (check() resolves
  // specFile/coreRoot from the checker module's own location, the sandbox).
  const sandboxDriver = path.join(sandbox, "cli-driver.mjs");
  fs.writeFileSync(
    sandboxDriver,
    `import { check } from "./tools/runtime/check-runtime-payload-source.mjs";\ncheck();\n`,
  );

  return {
    sandbox, coreRepo,
    sandboxChecker: path.join(sandbox, "tools", "runtime", "check-runtime-payload-source.mjs"),
    sandboxDriver, sandboxSpec, sandboxDeps, commit: commitSha, tree: treeSha, sources,
    cleanup() { fs.rmSync(sandbox, { recursive: true, force: true }); fs.rmSync(coreRepo, { recursive: true, force: true }); },
  };
}

// --- In-memory transaction tests -------------------------------------------

test("happyPathRepinsBothAtomically: normal repin updates spec + mirror and cleans journal/temps/lock", () => {
  const specPath = "/mem/spec.json";
  const depsPath = "/mem/deps.json";
  const fixture = makeFixture();
  const gitOps = stableGitOps(fixture);
  const fsOps = makeMemFs(specPath, depsPath, fixture);

  repipeTransaction(NEW_SHA, { specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps });

  const spec = specOf(fsOps, specPath);
  const deps = depsOf(fsOps, depsPath);
  assert.equal(spec.sourceOfTruth.commit, NEW_SHA);
  assert.equal(spec.sourceOfTruth.tree, NEW_TREE);
  assert.deepEqual(spec.sourceOfTruth.sources, fixture.newSources);
  const mirror = deps.sourceAuthorities.find((e) => e.recordId === "reader.reading-surface");
  assert.equal(mirror.runtimeContract.externalSourceCommit, NEW_SHA);
  assert.equal(mirror.runtimeContract.externalSourceTree, NEW_TREE);
  assert.deepEqual(mirror.runtimeContract.externalSources, fixture.newSources);
  assert.ok(!fsOps.files.has(`${specPath}.repin.tmp`), "no spec temp left");
  assert.ok(!fsOps.files.has(`${depsPath}.repin.tmp`), "no deps temp left");
  assert.ok(!fsOps.files.has(`${specPath}.repin.lock`), "no lock left");
  assert.ok(!fsOps.files.has(`${specPath}.repin.journal`), "no journal left");
});

test("preWriteVerifyFailureWritesNothing: unstable blob hashes fail pre-write verify before any write", () => {
  const specPath = "/mem/spec.json";
  const depsPath = "/mem/deps.json";
  const fixture = makeFixture();
  const fsOps = makeMemFs(specPath, depsPath, fixture);
  const originalSpec = fsOps.readFileSync(specPath).toString("utf8");
  const originalDeps = fsOps.readFileSync(depsPath).toString("utf8");

  // Every blobBytes call returns unique bytes, so newSources (step 4) differ from
  // the hashes re-derived in pre-write verify (step 5) -> pre-verify fails before
  // the journal is opened -> nothing is written.
  let blobCalls = 0;
  const gitOps = {
    commitExists: (s) => s === OLD_SHA || s === NEW_SHA,
    treeOf: (s) => (s === NEW_SHA ? NEW_TREE : OLD_TREE),
    blobBytes: (s, p) => { blobCalls += 1; return Buffer.from(`${s}:${p}:${blobCalls}`); },
    authoritativeFilesDirty: () => "",
  };

  assert.throws(() => repipeTransaction(NEW_SHA, { specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps }),
    /pre-write verification failed/);

  assert.equal(fsOps.readFileSync(specPath).toString("utf8"), originalSpec);
  assert.equal(fsOps.readFileSync(depsPath).toString("utf8"), originalDeps);
  assert.ok(!fsOps.files.has(`${specPath}.repin.tmp`), "no temp spec written on pre-verify failure");
  assert.ok(!fsOps.files.has(`${depsPath}.repin.tmp`), "no temp deps written on pre-verify failure");
  assert.ok(!fsOps.files.has(`${specPath}.repin.lock`), "lock released on pre-verify failure");
  assert.ok(!fsOps.files.has(`${specPath}.repin.journal`), "no journal opened on pre-verify failure");
});

test("concurrentLockRefusedByLiveHolder: a live holder's lock aborts repin without mutating files", () => {
  const specPath = "/mem/spec.json";
  const depsPath = "/mem/deps.json";
  const fixture = makeFixture();
  const gitOps = stableGitOps(fixture);
  const fsOps = makeMemFs(specPath, depsPath, fixture);
  const originalSpec = fsOps.readFileSync(specPath).toString("utf8");
  const originalDeps = fsOps.readFileSync(depsPath).toString("utf8");
  const LIVE_PID = 99999;
  fsOps.files.set(`${specPath}.repin.lock`, Buffer.from(`${LIVE_PID}\n`));

  assert.throws(() => repipeTransaction(NEW_SHA, {
    specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps,
    isPidAlive: (pid) => pid === LIVE_PID,
  }), /another writer transaction is active/);

  assert.equal(fsOps.readFileSync(specPath).toString("utf8"), originalSpec);
  assert.equal(fsOps.readFileSync(depsPath).toString("utf8"), originalDeps);
  // The live holder's lock is left intact (we did not create it).
  assert.ok(fsOps.files.has(`${specPath}.repin.lock`));
});

test("staleLockIsRefusedFailClosed: a dead holder's lock is NOT reclaimed; repin fail-closes with 'run --recover'", () => {
  const specPath = "/mem/spec.json";
  const depsPath = "/mem/deps.json";
  const fixture = makeFixture();
  const gitOps = stableGitOps(fixture);
  const fsOps = makeMemFs(specPath, depsPath, fixture);
  const originalSpec = fsOps.readFileSync(specPath).toString("utf8");
  const originalDeps = fsOps.readFileSync(depsPath).toString("utf8");
  fsOps.files.set(`${specPath}.repin.lock`, Buffer.from(`99999\n`));

  // acquireWriterLock no longer auto-reclaims a dead-holder lock (POSIX has no
  // atomic conditional-delete). repipeTransaction must fail-closed and mutate
  // nothing; the operator must run --recover first.
  assert.throws(() => repipeTransaction(NEW_SHA, {
    specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps,
    isPidAlive: () => false, // the recorded holder is dead
  }), /STALE writer lock.*run.*--recover/);

  assert.equal(fsOps.readFileSync(specPath).toString("utf8"), originalSpec);
  assert.equal(fsOps.readFileSync(depsPath).toString("utf8"), originalDeps);
  // The dead-holder lock is left intact (not clobbered/reclaimed).
  assert.ok(fsOps.files.has(`${specPath}.repin.lock`), "the stale lock must not be clobbered");
});

test("casGuardAbortsBeforeRenameThenRecoveryRequiresManual: real external drift between snapshot and rename aborts, recovery fails closed", () => {
  const specPath = "/mem/spec.json";
  const depsPath = "/mem/deps.json";
  const fixture = makeFixture();
  const gitOps = stableGitOps(fixture);
  const fsOps = makeMemFs(specPath, depsPath, fixture);
  const drifted = Buffer.from("external mutation drifted the spec");

  // specPath reads: #1 step-4 parse, #2 step-6 snapshot, #3 casGuard. On the 3rd
  // read perform a REAL on-disk mutation (overwrite the stored bytes), so the live
  // file itself - not just this read - carries the drifted hash. The prior test only
  // faked the 3rd read's return value WITHOUT mutating `files`, so recovery (which
  // reads the live file directly) still saw the original hash and "discarded" - a
  // false pass that never exercised the unknown-hash path. Now recovery must also
  // observe the drifted (UNKNOWN) hash and fail closed.
  let specReads = 0;
  const realRead = fsOps.readFileSync.bind(fsOps);
  fsOps.readFileSync = (file) => {
    if (file === specPath) {
      specReads += 1;
      if (specReads === 3) fsOps.files.set(specPath, drifted); // real external mutation
    }
    return realRead(file);
  };

  assert.throws(() => repipeTransaction(NEW_SHA, { specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps }),
    /drifted after snapshot/);

  // The journal was opened (no temps, no rename); the live spec now carries the
  // drifted bytes (a real foreign write) matching neither the original nor the new pin.
  assert.ok(fsOps.files.has(`${specPath}.repin.journal`), "journal left for recovery");
  assert.ok(!fsOps.files.has(`${specPath}.repin.tmp`), "no spec temp written");
  assert.equal(fsOps.readFileSync(specPath), drifted, "live spec holds the drifted bytes");

  // Recovery: the live spec hash is UNKNOWN (neither original nor new) -> manual
  // resolution. Recovery must NOT restore the backup (that would overwrite the
  // foreign bytes) and must NOT clean up the journal/temps (preserved for inspection);
  // the throw skips cleanup() and the caller releases the writer lock in its finally.
  assert.throws(
    () => recoverRepinJournal({ specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps }),
    /manual resolution required.*unknown hash.*spec=UNKNOWN/,
  );
  assert.equal(fsOps.readFileSync(specPath), drifted, "drifted bytes preserved (never auto-restored)");
  assert.ok(fsOps.files.has(`${specPath}.repin.journal`), "journal preserved for manual inspection");
});

test("safeUnlinkPropagatesPermissionErrorsButIgnoresAbsentFiles: cleanup re-throws EACCES/EIO and swallows only ENOENT", () => {
  const specPath = "/mem/spec.json";
  const depsPath = "/mem/deps.json";
  const fixture = makeFixture();
  const gitOps = stableGitOps(fixture);
  const fsOps = makeMemFs(specPath, depsPath, fixture);
  const journalPath = `${specPath}.repin.journal`;

  // Leave a journal at 'opened' (both live files original) via a CAS drift abort,
  // then restore the live spec to original so recovery takes the discard branch and
  // reaches cleanup() -> safeUnlink(journal). This isolates safeUnlink behavior
  // (the prior implementation swallowed ALL errors, masking EACCES/EIO and letting
  // the command report repin success while a journal remained on disk).
  let specReads = 0;
  const realRead = fsOps.readFileSync.bind(fsOps);
  fsOps.readFileSync = (file) => {
    if (file === specPath) { specReads += 1; if (specReads === 3) fsOps.files.set(specPath, Buffer.from("drifted")); }
    return realRead(file);
  };
  assert.throws(() => repipeTransaction(NEW_SHA, { specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps }), /drifted after snapshot/);
  fsOps.readFileSync = realRead;
  fsOps.files.set(specPath, Buffer.from(`${JSON.stringify(fixture.spec, null, 2)}\n`)); // restore original
  assert.ok(fsOps.files.has(journalPath), "journal left by the abort");

  const realUnlink = fsOps.unlinkSync.bind(fsOps);

  // (a) EACCES on the journal unlink is PROPAGATED, never silently swallowed: a
  // failed cleanup must not let the command report success while a journal remains.
  fsOps.unlinkSync = (file) => {
    if (file === journalPath) { const e = new Error("EACCES"); e.code = "EACCES"; throw e; }
    realUnlink(file);
  };
  assert.throws(
    () => recoverRepinJournal({ specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps }),
    (err) => err.code === "EACCES",
  );
  assert.ok(fsOps.files.has(journalPath), "journal preserved when cleanup cannot remove it");

  // (b) EIO on the journal unlink is PROPAGATED: an I/O error is not "file absent"
  // and must surface so a failed cleanup is never silently swallowed (the prior
  // implementation caught every error, letting a disk fault masquerade as success).
  fsOps.unlinkSync = (file) => {
    if (file === journalPath) { const e = new Error("EIO"); e.code = "EIO"; throw e; }
    realUnlink(file);
  };
  assert.throws(
    () => recoverRepinJournal({ specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps }),
    (err) => err.code === "EIO",
  );
  assert.ok(fsOps.files.has(journalPath), "journal preserved when cleanup hits EIO");

  // (c) ENOENT on the journal unlink is SWALLOWED: the file is treated as already
  // absent (a normal race where another cleaner removed it first) and recovery
  // completes successfully.
  fsOps.unlinkSync = (file) => {
    if (file === journalPath) { const e = new Error("ENOENT"); e.code = "ENOENT"; throw e; }
    realUnlink(file);
  };
  const action = recoverRepinJournal({ specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps });
  assert.match(action, /discarded uncommitted repin/);
});

test("secondRenameFailureLeavesJournalThenRecoveryCompletes: deps rename failure -> recovery completes the stalled repin", () => {
  const specPath = "/mem/spec.json";
  const depsPath = "/mem/deps.json";
  const fixture = makeFixture();
  const gitOps = stableGitOps(fixture);
  const fsOps = makeMemFs(specPath, depsPath, fixture);
  const depsTmp = `${depsPath}.repin.tmp`;

  // Fail ONLY the deps file rename (from the deps temp). Journal renames use a
  // different temp name (.dwtmp-<pid>), so this targets the real file rename.
  const realRename = fsOps.renameSync.bind(fsOps);
  fsOps.renameSync = (from, to) => {
    if (from === depsTmp) throw new Error("injected deps rename failure");
    realRename(from, to);
  };

  assert.throws(() => repipeTransaction(NEW_SHA, { specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps }),
    /injected deps rename failure/);

  // Half-updated: spec at new pin, deps still original, journal + deps temp left.
  assert.equal(specOf(fsOps, specPath).sourceOfTruth.commit, NEW_SHA);
  assert.equal(depsOf(fsOps, depsPath).sourceAuthorities[0].runtimeContract.externalSourceCommit, OLD_SHA);
  assert.ok(fsOps.files.has(`${specPath}.repin.journal`), "journal left for recovery");
  assert.ok(fsOps.files.has(depsTmp), "deps temp left for recovery");

  // Restore the real rename so recovery can complete the stalled deps rename.
  fsOps.renameSync = realRename;

  // Recovery: spec-renamed applied + deps temp intact -> complete the stalled rename.
  const action = recoverRepinJournal({ specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps });
  assert.match(action, /completed stalled repin/);
  assert.equal(specOf(fsOps, specPath).sourceOfTruth.commit, NEW_SHA);
  assert.equal(depsOf(fsOps, depsPath).sourceAuthorities[0].runtimeContract.externalSourceCommit, NEW_SHA);
  assert.ok(!fsOps.files.has(`${specPath}.repin.journal`), "journal removed after recovery");
  assert.ok(!fsOps.files.has(depsTmp), "deps temp removed after recovery");
});

test("postWriteVerifyFailureRollsBackToOriginal: post-verify abort rolls back eagerly and recovery confirms original", () => {
  const specPath = "/mem/spec.json";
  const depsPath = "/mem/deps.json";
  const fixture = makeFixture();
  const fsOps = makeMemFs(specPath, depsPath, fixture);
  const originalSpec = fsOps.readFileSync(specPath).toString("utf8");
  const originalDeps = fsOps.readFileSync(depsPath).toString("utf8");

  // blobBytes stable for newSources(1-4) + pre-verify(5-8); post-verify(9-12)
  // returns corrupt bytes so the re-derived hashes mismatch -> post-verify fails
  // -> repipeTransaction eagerly restores both originals, then throws.
  let blobCalls = 0;
  const gitOps = {
    commitExists: (s) => s === OLD_SHA || s === NEW_SHA,
    treeOf: (s) => (s === NEW_SHA ? NEW_TREE : OLD_TREE),
    blobBytes: (s, p) => {
      blobCalls += 1;
      if (blobCalls > 8) return Buffer.from(`corrupt:${p}`);
      return s === NEW_SHA ? fixture.newBytes[p] : fixture.oldBytes[p];
    },
    authoritativeFilesDirty: () => "",
  };

  assert.throws(() => repipeTransaction(NEW_SHA, { specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps }),
    /post-write verification failed/);

  // repipeTransaction already restored both files to the originals on the failed
  // verify, but left the journal (deps-renamed applied) for recovery to confirm.
  assert.ok(fsOps.files.has(`${specPath}.repin.journal`), "journal left for recovery");

  // Recovery is hash-driven: live files are original (the eager rollback already
  // restored them), so recovery sees spec==orig && deps==orig and DISCARDS the
  // journal (no live mutation needed) - it does not re-roll-back originals that
  // are already original. The pair is consistent and the journal is removed.
  const action = recoverRepinJournal({ specFile: specPath, dependenciesFile: depsPath, gitOps: stableGitOps(fixture), fsOps });
  assert.match(action, /discarded uncommitted repin/);
  assert.equal(fsOps.readFileSync(specPath).toString("utf8"), originalSpec);
  assert.equal(fsOps.readFileSync(depsPath).toString("utf8"), originalDeps);
  assert.ok(!fsOps.files.has(`${specPath}.repin.journal`), "journal removed after recovery");
});

test("recoveryRequiresManualResolutionOnUnknownLiveSpec: a corrupted live spec (neither original nor new) fails closed, never auto-restored", () => {
  const specPath = "/mem/spec.json";
  const depsPath = "/mem/deps.json";
  const fixture = makeFixture();
  const gitOps = stableGitOps(fixture);
  const fsOps = makeMemFs(specPath, depsPath, fixture);
  const depsTmp = `${depsPath}.repin.tmp`;
  const corrupted = Buffer.from("corrupted live spec content");

  // Leave the journal at spec-renamed (spec at new pin, deps original, deps temp
  // intact) by failing the deps file rename only.
  const realRename = fsOps.renameSync.bind(fsOps);
  fsOps.renameSync = (from, to) => {
    if (from === depsTmp) throw new Error("injected deps rename failure");
    realRename(from, to);
  };
  assert.throws(() => repipeTransaction(NEW_SHA, { specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps }),
    /injected deps rename failure/);

  // Simulate the live spec file being corrupted (e.g. disk/page corruption) so it
  // matches neither the new pin nor the original -> UNKNOWN live hash. The journal
  // still records the spec-renamed phase marker, but phase markers are DIAGNOSTIC
  // ONLY: an unknown live hash is never auto-restored (restoring the backup would
  // overwrite the foreign bytes). Recovery must fail closed for manual resolution.
  fsOps.files.set(specPath, corrupted);

  assert.throws(
    () => recoverRepinJournal({ specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps }),
    /manual resolution required.*spec=UNKNOWN/,
  );
  // The corrupted bytes are preserved (never auto-restored over).
  assert.equal(fsOps.readFileSync(specPath), corrupted, "corrupted spec preserved (never auto-restored)");
  // Journal + deps temp preserved for manual inspection (cleanup is skipped by the throw).
  assert.ok(fsOps.files.has(`${specPath}.repin.journal`), "journal preserved for manual resolution");
  assert.ok(fsOps.files.has(depsTmp), "deps temp preserved for manual resolution");
});

test("recoveryRequiresManualResolutionOnUnknownLiveDeps: a corrupted live deps (spec still at new) fails closed, never auto-restored", () => {
  const specPath = "/mem/spec.json";
  const depsPath = "/mem/deps.json";
  const fixture = makeFixture();
  const gitOps = stableGitOps(fixture);
  const fsOps = makeMemFs(specPath, depsPath, fixture);
  const depsTmp = `${depsPath}.repin.tmp`;
  const corrupted = Buffer.from("corrupted live deps content");

  // Leave journal at spec-renamed (spec at new pin, deps original, deps temp intact).
  const realRename = fsOps.renameSync.bind(fsOps);
  fsOps.renameSync = (from, to) => {
    if (from === depsTmp) throw new Error("injected deps rename failure");
    realRename(from, to);
  };
  assert.throws(() => repipeTransaction(NEW_SHA, { specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps }),
    /injected deps rename failure/);
  fsOps.renameSync = realRename;

  // Corrupt the live DEPS only (spec stays at the known new pin). spec=known(new),
  // deps=UNKNOWN -> the else branch fires: recovery must NOT roll the deps back
  // (that would overwrite the foreign bytes) and must fail closed. This is the
  // symmetric case to the unknown-spec test: ANY unknown live hash - even with the
  // other file at a known hash - is manual resolution.
  fsOps.files.set(depsPath, corrupted);

  assert.throws(
    () => recoverRepinJournal({ specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps }),
    /manual resolution required.*deps=UNKNOWN/,
  );
  assert.equal(fsOps.readFileSync(depsPath), corrupted, "corrupted deps preserved (never auto-restored)");
  assert.ok(fsOps.files.has(`${specPath}.repin.journal`), "journal preserved for manual resolution");
  assert.ok(fsOps.files.has(depsTmp), "deps temp preserved for manual resolution");
});

test("recoveryRefusesWhenLiveHolderOwnsJournal: a live non-self lock owner blocks recovery", () => {
  const specPath = "/mem/spec.json";
  const depsPath = "/mem/deps.json";
  const fixture = makeFixture();
  const gitOps = stableGitOps(fixture);
  const fsOps = makeMemFs(specPath, depsPath, fixture);

  // Leave a journal + self-held lock by failing the deps rename.
  let renameCalls = 0;
  const realRename = fsOps.renameSync.bind(fsOps);
  fsOps.renameSync = (from, to) => {
    renameCalls += 1;
    if (renameCalls === 2) throw new Error("injected deps rename failure");
    realRename(from, to);
  };
  assert.throws(() => repipeTransaction(NEW_SHA, { specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps }),
    /injected deps rename failure/);

  // Reassign the lock to a DIFFERENT live process so recovery must refuse.
  const LIVE_PID = 88888;
  fsOps.files.set(`${specPath}.repin.lock`, Buffer.from(`${LIVE_PID}\n`));

  assert.throws(() => recoverRepinJournal({
    specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps,
    isPidAlive: (pid) => pid === LIVE_PID,
  }), /another writer transaction is active/);
  // The journal is untouched: recovery refused, not reconciled.
  assert.ok(fsOps.files.has(`${specPath}.repin.journal`), "journal left intact when a live holder owns it");
});

test("rollbackFailureLeavesJournalIntact: a failed restore on a known-hash rollback propagates the error and preserves the journal", () => {
  const specPath = "/mem/spec.json";
  const depsPath = "/mem/deps.json";
  const fixture = makeFixture();
  const gitOps = stableGitOps(fixture);
  const fsOps = makeMemFs(specPath, depsPath, fixture);
  const depsTmp = `${depsPath}.repin.tmp`;

  // Leave journal at spec-renamed (spec at new pin, deps original, deps temp intact).
  const realRename = fsOps.renameSync.bind(fsOps);
  fsOps.renameSync = (from, to) => {
    if (from === depsTmp) throw new Error("injected deps rename failure");
    realRename(from, to);
  };
  assert.throws(() => repipeTransaction(NEW_SHA, { specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps }),
    /injected deps rename failure/);
  fsOps.renameSync = realRename;

  // Force the KNOWN-HASH "rollback spec" sub-branch: spec=new (known), deps=original
  // (known), but the deps temp is missing -> recovery cannot complete the stalled
  // deps rename and instead rolls the spec back to original via restoreBackup(). A
  // known-hash rollback is authorized to auto-restore; this test isolates that the
  // restore's durability + journal preservation still hold when the restore itself
  // fails (the unknown-hash path is covered by the manual-resolution tests above).
  fsOps.files.delete(depsTmp);

  // Make the rollback restore itself fail. restoreBackup writes via a durable
  // temp+rename (`.restore.tmp-<pid>`), so the failure must target that temp write,
  // not the live path. Recovery must propagate the error WITHOUT removing the
  // journal, so a later run can retry.
  const realWrite = fsOps.writeFileSync.bind(fsOps);
  fsOps.writeFileSync = (file, data) => {
    if (String(file).includes(".restore.tmp")) throw new Error("injected restore write failure");
    realWrite(file, data);
  };

  assert.throws(() => recoverRepinJournal({ specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps }),
    /injected restore write failure/);
  assert.ok(fsOps.files.has(`${specPath}.repin.journal`), "journal preserved when rollback fails");
});

// --- Environment isolation ------------------------------------------------

test("gitBinaryIsHardcodedAndIgnoresEnvOverride: READER_CORE_GIT_BIN does not redirect the authority git", () => {
  // GIT_BIN is a hardcoded literal; the module never reads READER_CORE_GIT_BIN.
  assert.equal(GIT_BIN, "/usr/bin/git");
  const source = fs.readFileSync(SOURCE_FILE, "utf8");
  assert.ok(!source.includes("READER_CORE_GIT_BIN"), "no env override of the git binary remains in source");

  // Runtime proof: a child with the env set still imports the hardcoded binary.
  const probe = spawnSync(process.execPath, ["--input-type=module", "-e", `
    process.env.READER_CORE_GIT_BIN = "/tmp/malicious-git-${NEW_SHA.slice(0, 8)}";
    const m = await import(${JSON.stringify(SOURCE_FILE)});
    console.log(m.GIT_BIN);
  `], { encoding: "utf8" });
  assert.equal(probe.status, 0, `probe exited ${probe.status}: ${probe.stderr}`);
  assert.equal(probe.stdout.trim(), "/usr/bin/git");
});

// --- Internal step-2 recovery (the --source-commit path) ------------------

test("staleLockPlusJournal: repin fail-closes on the dead lock; --recover refuses until the operator quarantines, then completes the stalled journal", () => {
  const specPath = "/mem/spec.json";
  const depsPath = "/mem/deps.json";
  const fixture = makeFixture();
  const gitOps = stableGitOps(fixture);
  const fsOps = makeMemFs(specPath, depsPath, fixture);
  const depsTmp = `${depsPath}.repin.tmp`;

  // First repin: fail the deps rename -> leaves a journal (spec-renamed) + deps
  // temp. Simulate a SIGKILL crash (no finally) by leaving a dead-holder lock.
  const realRename = fsOps.renameSync.bind(fsOps);
  fsOps.renameSync = (from, to) => {
    if (from === depsTmp) throw new Error("injected deps rename failure");
    realRename(from, to);
  };
  assert.throws(() => repipeTransaction(NEW_SHA, { specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps }),
    /injected deps rename failure/);
  fsOps.renameSync = realRename;
  // The crash left a dead-holder lock (no finally ran to release it).
  fsOps.files.set(`${specPath}.repin.lock`, Buffer.from(`99999\n`));

  // (a) A second repin must NOT auto-reclaim the dead lock - it fail-closes and
  // touches nothing, preserving the journal + stalled state for --recover.
  const specBeforeRecover = fsOps.readFileSync(specPath).toString("utf8");
  assert.throws(() => repipeTransaction(NEW_SHA, {
    specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps,
    isPidAlive: () => false, // the recorded holder is dead
  }), /STALE writer lock.*run.*--recover/);
  assert.equal(fsOps.readFileSync(specPath).toString("utf8"), specBeforeRecover,
    "repin must not mutate the spec on fail-closed");

  // (b) --recover REFUSES a foreign lock (the program never unlinks one). It
  // throws and leaves the journal + lock + stalled state byte-identical - the
  // operator must MANUALLY quarantine the lock first.
  const lockBefore = fsOps.files.get(`${specPath}.repin.lock`);
  const journalBefore = fsOps.files.get(`${specPath}.repin.journal`);
  assert.throws(() => recoverRepinJournal({
    specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps,
    isPidAlive: () => false,
  }), /STALE writer lock.*re-run --recover/);
  assert.equal(fsOps.files.get(`${specPath}.repin.lock`), lockBefore,
    "--recover must not delete or mutate the foreign lock");
  assert.equal(fsOps.files.get(`${specPath}.repin.journal`), journalBefore,
    "--recover must not touch the journal while the lock is present");
  assert.equal(fsOps.readFileSync(specPath).toString("utf8"), specBeforeRecover,
    "--recover must not mutate the spec while the lock is present");

  // (c) The operator MANUALLY quarantines the lock (an mv the program never
  // performs). With the lock path gone, --recover O_EXCL-creates fresh and
  // completes the stalled journal (deps rename -> both NEW).
  fsOps.files.delete(`${specPath}.repin.lock`);
  const action = recoverRepinJournal({
    specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps,
    isPidAlive: () => false,
  });
  assert.ok(action, "recover should report a recovery action after quarantine");
  assert.equal(specOf(fsOps, specPath).sourceOfTruth.commit, NEW_SHA);
  assert.equal(depsOf(fsOps, depsPath).sourceAuthorities[0].runtimeContract.externalSourceCommit, NEW_SHA);
  assert.ok(!fsOps.files.has(`${specPath}.repin.journal`), "journal cleared after recover");
  assert.ok(!fsOps.files.has(depsTmp), "deps temp cleared");
  assert.ok(!fsOps.files.has(`${specPath}.repin.lock`), "lock released after recover");
});

// --- Real crash tests (child process + real temp dir + real fsync) ---------

// A child crash-driver: reconstructs the deterministic fake gitOps and runs
// repipeTransaction with a faultAt/crashMode, then exits (the fault kills it).
// Written to a temp file so the absolute import path can be baked in.
function writeCrashDriver(driverPath) {
  const driver = `import { repipeTransaction, RUNTIME_CORE_SOURCE_PATHS } from ${JSON.stringify(SOURCE_FILE)};
import crypto from "node:crypto";
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const NEW_SHA = ${JSON.stringify(NEW_SHA)};
const OLD_SHA = ${JSON.stringify(OLD_SHA)};
const NEW_TREE = ${JSON.stringify(NEW_TREE)};
const OLD_TREE = ${JSON.stringify(OLD_TREE)};
const specPath = process.argv[2];
const depsPath = process.argv[3];
const faultAt = process.argv[4] || null;
const crashMode = process.argv[5] || "exit";
const oldBytes = {}, newBytes = {};
for (const p of RUNTIME_CORE_SOURCE_PATHS) {
  oldBytes[p] = Buffer.from("old:" + p);
  newBytes[p] = Buffer.from("new:" + p);
}
const gitOps = {
  commitExists: (s) => s === OLD_SHA || s === NEW_SHA,
  treeOf: (s) => (s === NEW_SHA ? NEW_TREE : OLD_TREE),
  blobBytes: (s, p) => (s === NEW_SHA ? newBytes[p] : oldBytes[p]),
  authoritativeFilesDirty: () => "",
};
try {
  repipeTransaction(NEW_SHA, { specFile: specPath, dependenciesFile: depsPath, gitOps, faultAt, crashMode });
  console.log("COMPLETE");
} catch (e) {
  console.error("ERROR:", e.message);
  process.exit(2);
}
`;
  fs.writeFileSync(driverPath, driver);
}

// Each crash case: spawn the driver, let it die at faultAt, then run recovery and
// assert the pair reconciles to the expected consistent state (original or new).
function runCrashCase(t, { faultAt, crashMode, expectNew }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "repin-crash-"));
  const specPath = path.join(dir, "runtime-payload-contracts.json");
  const depsPath = path.join(dir, "FIGMA_VISUAL_ADMISSION_DEPENDENCIES.json");
  const driverPath = path.join(dir, "crash-driver.mjs");
  const fixture = makeFixture();
  fs.writeFileSync(specPath, `${JSON.stringify(fixture.spec, null, 2)}\n`);
  fs.writeFileSync(depsPath, `${JSON.stringify(fixture.dependencies, null, 2)}\n`);
  writeCrashDriver(driverPath);
  try {
    const crash = spawnSync(process.execPath, [driverPath, specPath, depsPath, faultAt, crashMode], { encoding: "utf8" });
    if (crashMode === "sigkill") {
      assert.equal(crash.signal, "SIGKILL", `child did not die by SIGKILL (status=${crash.status}, stderr=${crash.stderr})`);
    } else {
      assert.equal(crash.status, 86, `child did not exit 86 at ${faultAt} (status=${crash.status}, stderr=${crash.stderr})`);
    }

    // Recovery runs in the parent (real fsOps). The crashed child left a STALE
    // dead-holder lock (exit/SIGKILL skipped finally -> release() never ran). The
    // program NEVER unlinks a foreign lock, so the first --recover REFUSES
    // (fail-closed) and leaves the lock + journal untouched. The operator
    // MANUALLY quarantines the lock (mv), then --recover O_EXCL-creates fresh
    // and reconciles the journal.
    const lockPath = `${specPath}.repin.lock`;
    assert.throws(
      () => recoverRepinJournal({ specFile: specPath, dependenciesFile: depsPath, gitOps: stableGitOps(fixture) }),
      /STALE writer lock.*re-run --recover/,
      `recovery must refuse the stale lock for ${faultAt}/${crashMode}`,
    );
    assert.ok(fs.existsSync(lockPath), `the stale lock must remain after refusal for ${faultAt}/${crashMode}`);
    // Operator quarantines the stale lock out of band (the program never does).
    fs.rmSync(lockPath, { force: true });
    const action = recoverRepinJournal({ specFile: specPath, dependenciesFile: depsPath, gitOps: stableGitOps(fixture) });
    t.diagnostic(`faultAt=${faultAt} crashMode=${crashMode} recovery=${action}`);

    const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
    const deps = JSON.parse(fs.readFileSync(depsPath, "utf8"));
    const expectedCommit = expectNew ? NEW_SHA : OLD_SHA;
    assert.equal(spec.sourceOfTruth.commit, expectedCommit, `spec commit after recovery for ${faultAt}/${crashMode}`);
    assert.equal(deps.sourceAuthorities[0].runtimeContract.externalSourceCommit, expectedCommit,
      `deps commit after recovery for ${faultAt}/${crashMode}`);

    // Recovery must leave no journal/temps/lock behind (the crashed lock is stale).
    assert.ok(!fs.existsSync(`${specPath}.repin.journal`), `journal left for ${faultAt}/${crashMode}`);
    assert.ok(!fs.existsSync(`${specPath}.repin.tmp`), `spec temp left for ${faultAt}/${crashMode}`);
    assert.ok(!fs.existsSync(`${depsPath}.repin.tmp`), `deps temp left for ${faultAt}/${crashMode}`);
    assert.ok(!fs.existsSync(`${specPath}.repin.lock`), `stale lock left for ${faultAt}/${crashMode}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("crash after journal open: recovery discards the uncommitted repin (both original)", (t) => {
  runCrashCase(t, { faultAt: "after-journal-open", crashMode: "exit", expectNew: false });
});

test("crash after temps written: recovery discards the uncommitted repin (both original)", (t) => {
  runCrashCase(t, { faultAt: "after-temps", crashMode: "exit", expectNew: false });
});

test("crash before spec rename: recovery discards the uncommitted repin (both original)", (t) => {
  runCrashCase(t, { faultAt: "before-spec-rename", crashMode: "exit", expectNew: false });
});

test("crash after spec rename: recovery completes the stalled repin (both new)", (t) => {
  runCrashCase(t, { faultAt: "after-spec-rename", crashMode: "exit", expectNew: true });
});

test("crash before deps rename: recovery completes the stalled repin (both new)", (t) => {
  runCrashCase(t, { faultAt: "before-deps-rename", crashMode: "exit", expectNew: true });
});

test("crash after deps rename: recovery accepts the completed repin (both new)", (t) => {
  runCrashCase(t, { faultAt: "after-deps-rename", crashMode: "exit", expectNew: true });
});

test("SIGKILL after spec rename: recovery completes the stalled repin (both new)", (t) => {
  runCrashCase(t, { faultAt: "after-spec-rename", crashMode: "sigkill", expectNew: true });
});

// --- P0: the rename->mark crash window (the split the audit identified) -------
//
// The faultInject hooks BETWEEN rename+fsync and markRepinPhaseApplied exercise
// the exact window the marker-driven recovery mishandled: the rename has landed
// on disk (live hash reflects it) but the journal still records 'intent'. A real
// SIGKILL here must NOT split the pair - hash-driven recovery sees the live hash
// and completes/accepts consistently. These are the tests the prior 20 missed.

test("crash after spec rename PRE-MARK (exit): recovery completes the stalled repin (both new)", (t) => {
  runCrashCase(t, { faultAt: "after-spec-rename-pre-mark", crashMode: "exit", expectNew: true });
});

test("crash after spec rename PRE-MARK (SIGKILL): recovery completes the stalled repin, no split", (t) => {
  runCrashCase(t, { faultAt: "after-spec-rename-pre-mark", crashMode: "sigkill", expectNew: true });
});

test("crash after deps rename PRE-MARK (exit): recovery accepts the completed repin (both new)", (t) => {
  runCrashCase(t, { faultAt: "after-deps-rename-pre-mark", crashMode: "exit", expectNew: true });
});

test("crash after deps rename PRE-MARK (SIGKILL): recovery accepts the completed repin, no split", (t) => {
  runCrashCase(t, { faultAt: "after-deps-rename-pre-mark", crashMode: "sigkill", expectNew: true });
});

// --- P1-a: unified transaction lock (fd-based write, no empty-and-closed gap) -

test("failedRepipReleasesLockButLeavesJournal: a thrown repin releases its lock and leaves the journal for recovery", () => {
  const specPath = "/mem/spec.json";
  const depsPath = "/mem/deps.json";
  const fixture = makeFixture();
  const gitOps = stableGitOps(fixture);
  const fsOps = makeMemFs(specPath, depsPath, fixture);
  const depsTmp = `${depsPath}.repin.tmp`;
  const lockFile = `${specPath}.repin.lock`;
  const journalFile = `${specPath}.repin.journal`;

  // Fail the deps rename so the repin throws AFTER the journal is opened.
  const realRename = fsOps.renameSync.bind(fsOps);
  fsOps.renameSync = (from, to) => {
    if (from === depsTmp) throw new Error("injected deps rename failure");
    realRename(from, to);
  };
  assert.throws(() => repipeTransaction(NEW_SHA, { specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps }),
    /injected deps rename failure/);

  // The shared lock's release is nonce-keyed and runs in finally on EVERY normal
  // exit (completion OR throw): a normal failure does NOT leave a stale lock. Only
  // a SIGKILL (which skips finally) leaves a stale dead-PID lock for recovery to
  // reclaim - that path is covered by the crash tests below.
  assert.ok(!fsOps.files.has(lockFile), "lock released on throw (no stale lock from a normal failure)");
  // The journal is LEFT for the next recovery to reconcile (recovery acquires its
  // own fresh lock, then reconciles).
  assert.ok(fsOps.files.has(journalFile), "journal left for recovery");
});

test("emptyLockIsRefusedNotReclaimed: an empty lock is treated as held, not stale", () => {
  const specPath = "/mem/spec.json";
  const depsPath = "/mem/deps.json";
  const fixture = makeFixture();
  const gitOps = stableGitOps(fixture);
  const fsOps = makeMemFs(specPath, depsPath, fixture);
  const originalSpec = fsOps.readFileSync(specPath).toString("utf8");

  // An empty lock could be mid-write by another live process; it is refused
  // fail-closed (run --recover), never auto-reclaimed. No lock is ever
  // auto-reclaimed - a dead PID is also fail-closed.
  fsOps.files.set(`${specPath}.repin.lock`, Buffer.alloc(0));

  assert.throws(() => repipeTransaction(NEW_SHA, { specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps }),
    /empty\/unparseable holder.*--recover/);
  assert.equal(fsOps.readFileSync(specPath).toString("utf8"), originalSpec, "no mutation when lock is ambiguous");
});

test("unparseableLockIsRefusedNotReclaimed: a non-numeric lock is treated as held", () => {
  const specPath = "/mem/spec.json";
  const depsPath = "/mem/deps.json";
  const fixture = makeFixture();
  const gitOps = stableGitOps(fixture);
  const fsOps = makeMemFs(specPath, depsPath, fixture);
  const originalSpec = fsOps.readFileSync(specPath).toString("utf8");

  fsOps.files.set(`${specPath}.repin.lock`, Buffer.from("not-a-pid\n"));

  assert.throws(() => repipeTransaction(NEW_SHA, { specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps }),
    /empty\/unparseable holder.*--recover/);
  assert.equal(fsOps.readFileSync(specPath).toString("utf8"), originalSpec, "no mutation when lock is unparseable");
});

// --- P1-c: pre-staged symlink temp is rejected (real fs) ---------------------

test("preStagedSymlinkTempIsRejected: a symlink at the spec temp path aborts the repin without mutating the live spec", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "repin-symlinktemp-"));
  const specPath = path.join(dir, "runtime-payload-contracts.json");
  const depsPath = path.join(dir, "FIGMA_VISUAL_ADMISSION_DEPENDENCIES.json");
  const specTmp = `${specPath}.repin.tmp`;
  // A victim file the symlink would redirect the write at if not rejected.
  const victim = path.join(dir, "victim.txt");
  const fixture = makeFixture();
  fs.writeFileSync(specPath, `${JSON.stringify(fixture.spec, null, 2)}\n`);
  fs.writeFileSync(depsPath, `${JSON.stringify(fixture.dependencies, null, 2)}\n`);
  fs.writeFileSync(victim, "victim-original");
  // Pre-stage a symlink at the spec temp path -> safeWriteFile must reject it.
  fs.symlinkSync(victim, specTmp);
  try {
    assert.throws(() => repipeTransaction(NEW_SHA, {
      specFile: specPath, dependenciesFile: depsPath, gitOps: stableGitOps(fixture),
    }), /refusing to write through pre-staged symlink/);

    // The live spec is unchanged (the repin aborted before any live mutation past
    // the journal), and the victim file was NOT overwritten through the symlink.
    assert.equal(JSON.parse(fs.readFileSync(specPath, "utf8")).sourceOfTruth.commit, OLD_SHA, "live spec unchanged");
    assert.equal(fs.readFileSync(victim, "utf8"), "victim-original", "victim not overwritten via symlink");

    // Recovery reconciles the leftover journal (opened -> discard) and removes
    // the staged symlink temp via the canonical cleanup path.
    const action = recoverRepinJournal({ specFile: specPath, dependenciesFile: depsPath, gitOps: stableGitOps(fixture) });
    assert.match(action, /discarded uncommitted repin/);
    assert.equal(JSON.parse(fs.readFileSync(specPath, "utf8")).sourceOfTruth.commit, OLD_SHA, "live spec still unchanged after recovery");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// --- P1-d: recovery ignores the journal's stored temp paths (anti-forgery) ---

test("forgedJournalTempPathsAreIgnored: recovery uses canonical temp paths, never the journal's stored paths", () => {
  const specPath = "/mem/spec.json";
  const depsPath = "/mem/deps.json";
  const fixture = makeFixture();
  const gitOps = stableGitOps(fixture);
  const fsOps = makeMemFs(specPath, depsPath, fixture);
  const depsTmp = `${depsPath}.repin.tmp`;

  // Real half-repin: fail the deps rename -> journal at spec-renamed, real deps
  // temp intact at the CANONICAL path, spec at new pin.
  const realRename = fsOps.renameSync.bind(fsOps);
  fsOps.renameSync = (from, to) => {
    if (from === depsTmp) throw new Error("injected deps rename failure");
    realRename(from, to);
  };
  assert.throws(() => repipeTransaction(NEW_SHA, { specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps }),
    /injected deps rename failure/);
  fsOps.renameSync = realRename;

  // Forge the journal: rewrite document.depsTmp to point at an unrelated "victim"
  // path. A recovery that trusted the journal's stored path would rename/unlink
  // the victim; the hash-driven recovery derives depsTmp from depsPath and ignores
  // the forged value.
  const victim = "/mem/victim-deps-tmp";
  fsOps.files.set(victim, Buffer.from("victim-content"));
  const journalPath = `${specPath}.repin.journal`;
  const journal = JSON.parse(fsOps.readFileSync(journalPath).toString("utf8"));
  journal.depsTmp = victim;
  journal.specTmp = "/mem/victim-spec-tmp";
  fsOps.writeFileSync(journalPath, Buffer.from(`${JSON.stringify(journal, null, 2)}\n`));

  // Recovery completes via the CANONICAL deps temp (real, intact), not the victim.
  const action = recoverRepinJournal({ specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps });
  assert.match(action, /completed stalled repin/);
  assert.equal(specOf(fsOps, specPath).sourceOfTruth.commit, NEW_SHA);
  assert.equal(depsOf(fsOps, depsPath).sourceAuthorities[0].runtimeContract.externalSourceCommit, NEW_SHA);
  // The victim file is untouched: recovery never used the forged journal path.
  assert.equal(fsOps.readFileSync(victim).toString("utf8"), "victim-content", "forged journal temp path was not touched");
  assert.ok(fsOps.files.has(victim), "victim still present - recovery cleanup used the canonical temp path, not the forged one");
});

// --- P1-f: restoreBackup uses a durable temp+rename (not a bare over-write) --

test("restoreBackupUsesDurableTempRename: a known-hash rollback restores the live file via a durable temp+rename, not a bare over-write", () => {
  const specPath = "/mem/spec.json";
  const depsPath = "/mem/deps.json";
  const fixture = makeFixture();
  const gitOps = stableGitOps(fixture);
  const fsOps = makeMemFs(specPath, depsPath, fixture);
  const depsTmp = `${depsPath}.repin.tmp`;
  const originalSpec = fsOps.readFileSync(specPath).toString("utf8");

  // Leave journal at spec-renamed (spec at new pin, deps original, deps temp intact).
  const realRename = fsOps.renameSync.bind(fsOps);
  fsOps.renameSync = (from, to) => {
    if (from === depsTmp) throw new Error("injected deps rename failure");
    realRename(from, to);
  };
  assert.throws(() => repipeTransaction(NEW_SHA, { specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps }),
    /injected deps rename failure/);
  fsOps.renameSync = realRename;

  // Force the KNOWN-HASH "rollback spec" sub-branch (spec=new, deps=original, deps
  // temp missing): delete the deps temp so recovery rolls the spec back to the
  // original via restoreBackup(). A known-hash rollback is authorized to
  // auto-restore; this test proves the restore is durable (temp+fsync+rename), not a
  // bare writeFileSync-over-live that a crash mid-write could leave torn.
  fsOps.files.delete(depsTmp);

  // Spy on renames: a durable restore writes a `.restore.tmp-<pid>` then renames it
  // over the live spec. A bare writeFileSync-over-live would not rename at all.
  const restoreRenames = [];
  const spyRename = fsOps.renameSync.bind(fsOps);
  fsOps.renameSync = (from, to) => {
    if (String(from).includes(".restore.tmp")) restoreRenames.push({ from, to });
    spyRename(from, to);
  };

  const action = recoverRepinJournal({ specFile: specPath, dependenciesFile: depsPath, gitOps, fsOps });
  assert.match(action, /rolled back half-updated repin.*deps temp missing/);
  assert.ok(restoreRenames.some((r) => r.to === specPath), "spec restored via a durable temp+rename");
  assert.equal(fsOps.readFileSync(specPath).toString("utf8"), originalSpec, "spec restored to original");
});

// --- P1-e: GIT_DIR is scrubbed so it cannot redirect the authority git --------

test("gitEnvIsScrubbedSoGitDirCannotRedirectAuthorityChecks: a child with GIT_DIR set still resolves the temp Core commit (self-contained fixture)", () => {
  // The default check must not honor an inherited GIT_DIR/GIT_WORK_TREE/etc: those
  // would redirect every authority git call at an unrelated repo and flip the check
  // from pass to fail (or vice versa). realGitOps scrubs them; prove it by running
  // the default check against the self-contained temp Core repo with GIT_DIR pointed
  // at a nonexistent repo - it must still exit 0 (the temp commit is resolved via
  // coreRoot=READER_CORE_NATIVE_DIR, not the injected GIT_DIR). This uses a REAL temp
  // git repo (no dependency on the Reader-Core-Native sibling checkout being present).
  const fix = makeSelfContainedCoreFixture();
  try {
    // REAL CLI entry: invoke the sandboxed checker as `node check-runtime-payload-source.mjs`.
    // isMain dispatch uses realpathSync on BOTH argv[1] and import.meta.url, so a sandbox
    // under the macOS /var -> /private/var symlink still reaches check() (no driver shim).
    const probe = spawnSync(process.execPath, [fix.sandboxChecker], {
      encoding: "utf8",
      env: {
        ...scrubGitEnvForTests(),
        READER_CORE_NATIVE_DIR: fix.coreRepo,
        GIT_DIR: "/nonexistent-repin-git-dir",
        GIT_WORK_TREE: "/nonexistent-repin-work-tree",
      },
    });
    assert.equal(probe.status, 0,
      `default check should pass with GIT_DIR scrubbed; got status=${probe.status}, stderr=${probe.stderr}, stdout=${probe.stdout}`);
    assert.match(probe.stdout, /verified 4 declared commit blobs/);

    // Source guard: the scrub list covers the redirect-bearing vars.
    const source = fs.readFileSync(SOURCE_FILE, "utf8");
    assert.ok(source.includes("SCRUBBED_GIT_ENV_KEYS"), "git env scrub list present");
    assert.ok(source.includes("GIT_DIR") && source.includes("GIT_WORK_TREE") && source.includes("GIT_OBJECT_DIRECTORY"),
      "GIT_DIR/GIT_WORK_TREE/GIT_OBJECT_DATABASE are scrubbed");
  } finally {
    fix.cleanup();
  }
});

// --- P1-b: the default check is read-only (creates no authority artifacts) ---

test("defaultCheckIsReadOnly: a default check run writes no journal/lock/temp artifacts (self-contained fixture)", () => {
  // The default check must NOT auto-recover (which would write authority files
  // without holding the promotion lock). It is read-only: it only reads the spec
  // + deps + git. Prove it by running it against the self-contained fixture and
  // asserting no repin artifacts appear at the spec path before or after.
  const fix = makeSelfContainedCoreFixture();
  try {
    assert.ok(!fs.existsSync(`${fix.sandboxSpec}.repin.journal`), "no journal before check");
    // REAL CLI entry: invoke the sandboxed checker as `node check-runtime-payload-source.mjs`.
    const probe = spawnSync(process.execPath, [fix.sandboxChecker], {
      encoding: "utf8",
      env: { ...scrubGitEnvForTests(), READER_CORE_NATIVE_DIR: fix.coreRepo },
    });
    assert.equal(probe.status, 0, `default check should exit 0; stderr=${probe.stderr}, stdout=${probe.stdout}`);
    assert.match(probe.stdout, /verified 4 declared commit blobs/);
    // No artifacts created by the read-only check.
    assert.ok(!fs.existsSync(`${fix.sandboxSpec}.repin.journal`), "default check created no journal");
    assert.ok(!fs.existsSync(`${fix.sandboxSpec}.repin.lock`), "default check created no lock");
    assert.ok(!fs.existsSync(`${fix.sandboxSpec}.repin.tmp`), "default check created no spec temp");
  } finally {
    fix.cleanup();
  }
});

// --- Module-API supplement (NOT CLI evidence) ----------------------------

test("checkModuleApiResolvesSandboxSpecAndCore: importing check() and calling it verifies the temp Core (module-level supplement, not a CLI invocation)", () => {
  // MODULE-API supplement ONLY. The CLI evidence is the two tests above, which spawn
  // `node check-runtime-payload-source.mjs` (sandboxChecker) directly and exercise the
  // real isMain dispatch. This test runs the same check() via the module API (the
  // cli-driver.mjs shim) so the import path + check() contract stay covered, without
  // impersonating a CLI invocation. It must not be cited as CLI evidence.
  const fix = makeSelfContainedCoreFixture();
  try {
    const probe = spawnSync(process.execPath, [fix.sandboxDriver], {
      encoding: "utf8",
      env: { ...scrubGitEnvForTests(), READER_CORE_NATIVE_DIR: fix.coreRepo },
    });
    assert.equal(probe.status, 0, `module-API check should exit 0; stderr=${probe.stderr}, stdout=${probe.stdout}`);
    assert.match(probe.stdout, /verified 4 declared commit blobs/);
  } finally {
    fix.cleanup();
  }
});

// --- Symlink safety (real fs) ---------------------------------------------

test("symlinkedSpecPathRepinsRealTarget: repinning via a symlink updates the real file and preserves the symlink", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "repin-symlink-"));
  const realSpec = path.join(dir, "runtime-payload-contracts.json");
  const realDeps = path.join(dir, "FIGMA_VISUAL_ADMISSION_DEPENDENCIES.json");
  const linkSpec = path.join(dir, "spec-link.json");
  const linkDeps = path.join(dir, "deps-link.json");
  const fixture = makeFixture();
  fs.writeFileSync(realSpec, `${JSON.stringify(fixture.spec, null, 2)}\n`);
  fs.writeFileSync(realDeps, `${JSON.stringify(fixture.dependencies, null, 2)}\n`);
  fs.symlinkSync(realSpec, linkSpec);
  fs.symlinkSync(realDeps, linkDeps);
  try {
    // Repin via the symlink paths: realpath must resolve to the real files so the
    // journal/lock/temps sit beside the real file and the real file is updated.
    repipeTransaction(NEW_SHA, {
      specFile: linkSpec, dependenciesFile: linkDeps, gitOps: stableGitOps(fixture),
    });

    const spec = JSON.parse(fs.readFileSync(realSpec, "utf8"));
    const deps = JSON.parse(fs.readFileSync(realDeps, "utf8"));
    assert.equal(spec.sourceOfTruth.commit, NEW_SHA, "real spec target updated");
    assert.equal(deps.sourceAuthorities[0].runtimeContract.externalSourceCommit, NEW_SHA, "real deps target updated");
    // The symlinks are preserved (rename targeted the resolved real path, not the link).
    assert.ok(fs.lstatSync(linkSpec).isSymbolicLink(), "spec symlink preserved");
    assert.ok(fs.lstatSync(linkDeps).isSymbolicLink(), "deps symlink preserved");
    // No journal/temps/lock left beside the real file.
    assert.ok(!fs.existsSync(`${realSpec}.repin.journal`));
    assert.ok(!fs.existsSync(`${realSpec}.repin.lock`));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
