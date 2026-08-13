import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  acquireWriterLock,
  reclaimStaleWriterLock,
  inspectWriterLock,
  defaultIsPidAlive,
  readWriterLockOwner,
} from "../../tools/shared/shared-writer-lock.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHARED_MODULE = path.resolve(HERE, "..", "..", "tools", "shared", "shared-writer-lock.mjs");

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "swl-"));
}

function rm(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// A dead-holder lock file (parseable PID, but isPidAlive says dead) - the form a
// crashed repin leaves behind.
function writeDeadLock(lock, pid = "999999", nonce = "deadnonce") {
  fs.writeFileSync(lock, `${pid}\n${nonce}\n`);
}

// In-memory fsOps with an unlink call-log, for deterministic interleaving tests.
// Proves INVARIANTS (e.g. "reclaim never calls unlinkSync on the lock path")
// without relying on real concurrency timing. Models exactly the fs surface the
// lock module touches: lstat/readFile/open(wx)/write/fsync/close/unlink/exists.
function makeMemFs(initial = {}) {
  const files = new Map(); // path -> string
  const unlinkCalls = []; // { path, existed }
  let fdSeq = 100;
  const openFds = new Map(); // fd -> { path }
  for (const [p, c] of Object.entries(initial)) files.set(p, c);
  const fsOps = {
    readFileSync(file) {
      if (!files.has(file)) { const e = new Error("ENOENT"); e.code = "ENOENT"; throw e; }
      return files.get(file);
    },
    writeFileSync(file, data) { files.set(file, String(data)); },
    writeSync(fd, data) {
      const entry = openFds.get(fd);
      if (entry) files.set(entry.path, String(data));
      return String(data).length;
    },
    renameSync(from, to) {
      if (!files.has(from)) { const e = new Error("ENOENT"); e.code = "ENOENT"; throw e; }
      files.set(to, files.get(from)); files.delete(from);
    },
    unlinkSync(file) {
      unlinkCalls.push({ path: file, existed: files.has(file) });
      if (!files.has(file)) { const e = new Error("ENOENT"); e.code = "ENOENT"; throw e; }
      files.delete(file);
    },
    openSync(file, flag) {
      if (flag === "wx") {
        if (files.has(file)) { const e = new Error("EEXIST"); e.code = "EEXIST"; throw e; }
        const fd = ++fdSeq; openFds.set(fd, { path: file }); files.set(file, ""); return fd;
      }
      const fd = ++fdSeq; openFds.set(fd, { path: file }); return fd;
    },
    closeSync(fd) { openFds.delete(fd); },
    fsyncSync() { /* no-op */ },
    realpathSync(file) { return file; },
    existsSync(file) { return files.has(file); },
    lstatSync(file) {
      if (!files.has(file)) { const e = new Error("ENOENT"); e.code = "ENOENT"; throw e; }
      return { ino: 1, size: files.get(file).length, mtimeMs: 0 };
    },
  };
  return { fsOps, files, unlinkCalls };
}

// 1 + 2. Mutual exclusion across tools: repin/recover and promote/retract all
// call acquireWriterLock on the SAME path, so a holder blocks every other tool.
test("mutual exclusion: a held lock refuses a second writer (repin vs promote)", () => {
  const dir = tmpDir();
  const lock = path.join(dir, "runtime-payload-contracts.json.repin.lock");
  const release = acquireWriterLock({ lockFile: lock });
  assert.throws(
    () => acquireWriterLock({ lockFile: lock }),
    /another writer transaction is active \(pid \d+\); not acquiring lock/,
  );
  release();
  // After release the lock is gone and a new writer can acquire.
  const r2 = acquireWriterLock({ lockFile: lock });
  assert.ok(fs.existsSync(lock));
  r2();
  assert.equal(fs.existsSync(lock), false);
  rm(dir);
});

// 3. Real subprocess race (P0 step 3): two concurrent writers spawned as real
// child processes contend on the SAME lock. O_EXCL must let exactly one acquire;
// the other must be refused. Both children write a "ready" marker BEFORE
// attempting acquire (proving the module loaded), so a module-load failure
// cannot false-pass as "lock held". This replaces the old sequential in-process
// "two stale reclaimers" test, which proved nothing about real concurrency.
test("subprocessRace1: two concurrent writers - O_EXCL lets only one acquire; the other is refused", async () => {
  const dir = tmpDir();
  const lock = path.join(dir, "spec.repin.lock");
  const helper = path.join(dir, "race-helper.mjs");
  // Helper: write ready-marker (module loaded), try acquire, write result-marker.
  // On success hold briefly so the sibling's attempt is a real concurrent refusal.
  const helperSrc = [
    "import fs from 'node:fs';",
    `import { acquireWriterLock } from ${JSON.stringify(`file://${SHARED_MODULE}`)};`,
    "const [lockFile, readyMarker, resultMarker] = process.argv.slice(2);",
    "fs.writeFileSync(readyMarker, String(process.pid));",
    "try {",
    "  const release = acquireWriterLock({ lockFile });",
    "  fs.writeFileSync(resultMarker, `acquired ${process.pid}\\n`);",
    "  setTimeout(() => { release(); process.exit(0); }, 200);",
    "} catch (e) {",
    "  fs.writeFileSync(resultMarker, `refused ${process.pid}\\n${e.message}`);",
    "  process.exit(0);",
    "}",
  ].join("\n");
  fs.writeFileSync(helper, helperSrc);
  let c1;
  let c2;
  try {
    const ready = [path.join(dir, "r1"), path.join(dir, "r2")];
    const res = [path.join(dir, "res1"), path.join(dir, "res2")];
    c1 = spawn(process.execPath, [helper, lock, ready[0], res[0]], { stdio: ["ignore", "ignore", "pipe"] });
    // Register exit listeners NOW: the refused child exits fast, before a later
    // `once("exit")` could be attached, which would leave a never-resolving promise.
    const c1Exit = new Promise((r) => c1.once("exit", r));
    c2 = spawn(process.execPath, [helper, lock, ready[1], res[1]], { stdio: ["ignore", "ignore", "pipe"] });
    const c2Exit = new Promise((r) => c2.once("exit", r));
    // Wait for BOTH ready markers - proves both children loaded the module.
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline && (!fs.existsSync(ready[0]) || !fs.existsSync(ready[1]))) {
      await new Promise((r) => setTimeout(r, 10));
    }
    assert.ok(fs.existsSync(ready[0]) && fs.existsSync(ready[1]), "both children must load the module (no false-pass)");
    // Wait for BOTH results.
    while (Date.now() < deadline && (!fs.existsSync(res[0]) || !fs.existsSync(res[1]))) {
      await new Promise((r) => setTimeout(r, 10));
    }
    const out1 = fs.existsSync(res[0]) ? fs.readFileSync(res[0], "utf8") : "(no result)";
    const out2 = fs.existsSync(res[1]) ? fs.readFileSync(res[1], "utf8") : "(no result)";
    const acquired = [out1, out2].filter((o) => o.startsWith("acquired"));
    const refused = [out1, out2].filter((o) => o.startsWith("refused"));
    assert.equal(acquired.length, 1, `exactly one writer must acquire; got: ${JSON.stringify([out1, out2])}`);
    assert.equal(refused.length, 1, `exactly one writer must be refused; got: ${JSON.stringify([out1, out2])}`);
    assert.match(refused[0], /another writer transaction is active/, `refused child must report lock held: ${refused[0]}`);
    await c1Exit;
    await c2Exit;
  } finally {
    try { c1.kill("SIGKILL"); } catch { /* exited */ }
    try { c2.kill("SIGKILL"); } catch { /* exited */ }
    rm(dir);
  }
});

// 4. An empty/unparseable lock (as if a writer crashed between O_EXCL create and
// the PID stamp) is treated as HELD, not stale, so a second writer does NOT
// proceed through the stamp window - no double-writer.
test("empty lock (crashed mid-stamp) is held, not reclaimed: no double-writer window", () => {
  const dir = tmpDir();
  const lock = path.join(dir, "spec.repin.lock");
  fs.writeFileSync(lock, "");
  assert.throws(
    () => acquireWriterLock({ lockFile: lock, isPidAlive: () => false }),
    /empty\/unparseable holder/,
  );
  assert.ok(fs.existsSync(lock), "empty lock must not be clobbered");
  rm(dir);
});

// 5. Release nonce-guard (defense-in-depth, NON-atomic): release deletes a lock
// whose nonce matches ours, and leaves a lock whose nonce differs alone. This is
// best-effort defense-in-depth, NOT an atomicity claim - the release-side ABA is
// closed by removing auto-reclaim (no path replaces a live owner's lock), not by
// this nonce check. The test verifies the guard's intended behavior directly.
test("release nonce-guard deletes only a matching-nonce lock (defense-in-depth, non-atomic)", () => {
  const dir = tmpDir();
  const lock = path.join(dir, "spec.repin.lock");
  // Acquire (stamps our pid+nonce), then release unlinks our own lock.
  const release = acquireWriterLock({ lockFile: lock });
  const owner = readWriterLockOwner({ lockFile: lock });
  assert.ok(owner.nonce, "our lock carries a nonce");
  release();
  assert.equal(fs.existsSync(lock), false, "release deletes our own lock");
  // Acquire again, then overwrite the file with a FOREIGN nonce (simulate the
  // file having been replaced). release must NOT delete a non-matching nonce.
  const release2 = acquireWriterLock({ lockFile: lock });
  fs.writeFileSync(lock, `${process.pid}\nforeignnonce\n`);
  release2();
  assert.ok(fs.existsSync(lock), "release must NOT delete a lock whose nonce differs");
  assert.equal(readWriterLockOwner({ lockFile: lock }).nonce, "foreignnonce", "foreign lock left intact");
  rm(dir);
});

// 6. A real child process must actually enter the lock logic (acquire + write the
// marker AFTER acquiring). The test fails - not passes - if the child crashes at
// module load, so a module-load failure cannot be masked as "lock held".
test("real child acquires the lock (module loads + enters lock logic); parent is refused", async () => {
  const dir = tmpDir();
  const lock = path.join(dir, "spec.repin.lock");
  const marker = path.join(dir, "child-acquired.txt");
  const helper = path.join(dir, "hold-lock.mjs");
  // Helper: import the real shared module, acquire, write marker, hold for SIGTERM.
  const helperSrc = [
    "import fs from 'node:fs';",
    `import { acquireWriterLock } from ${JSON.stringify(`file://${SHARED_MODULE}`)};`,
    "const [lockFile, marker] = process.argv.slice(2);",
    "const release = acquireWriterLock({ lockFile });",
    "fs.writeFileSync(marker, String(process.pid));",
    "process.on('SIGTERM', () => { release(); process.exit(0); });",
    "setInterval(() => {}, 60000);",
  ].join("\n");
  fs.writeFileSync(helper, helperSrc);

  const child = spawn(process.execPath, [helper, lock, marker], { stdio: ["ignore", "ignore", "pipe"] });
  try {
    // Wait for the marker: proves the child loaded the module AND acquired.
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline && !fs.existsSync(marker)) {
      await new Promise((r) => setTimeout(r, 25));
    }
    assert.ok(fs.existsSync(marker), "child must have acquired the lock and written the marker");
    // Parent (a different process) must be refused while the child holds it.
    assert.throws(
      () => acquireWriterLock({ lockFile: lock }),
      /another writer transaction is active/,
    );
  } finally {
    child.kill("SIGTERM");
    await new Promise((r) => child.once("exit", r));
  }
  // After the child releases and exits, the parent can acquire.
  const release = acquireWriterLock({ lockFile: lock });
  release();
  rm(dir);
});

// EPERM from kill(pid,0) means the process exists but we may not signal it: it
// must be treated as ALIVE so its lock is never stolen by a stale reclaim.
test("EPERM is treated as alive: a live foreign process is never reclaimed", () => {
  const dir = tmpDir();
  const lock = path.join(dir, "spec.repin.lock");
  fs.writeFileSync(lock, "4242\nforeigntoken\n");
  // isPidAlive returns true (the EPERM branch) -> lock held, not reclaimed.
  assert.throws(
    () => acquireWriterLock({ lockFile: lock, isPidAlive: () => true }),
    /pid 4242/,
  );
  assert.equal(readWriterLockOwner({ lockFile: lock }).nonce, "foreigntoken");
  rm(dir);
});

test("defaultIsPidAlive: self is alive; an exited child is dead; EPERM is alive", async () => {
  assert.equal(defaultIsPidAlive(process.pid), true);
  const child = spawn(process.execPath, ["-e", "process.exit(0)"], { stdio: "ignore" });
  const childPid = child.pid;
  await new Promise((r) => child.once("exit", r));
  // The child has exited; defaultIsPidAlive must report it dead (ESRCH).
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline && defaultIsPidAlive(childPid)) {
    await new Promise((r) => setTimeout(r, 25));
  }
  assert.equal(defaultIsPidAlive(childPid), false, "an exited process must be reported dead");
});

// 8. Stale lock is NOT auto-reclaimed: a dead-holder lock is fail-closed.
// acquireWriterLock refuses with the manual-quarantine protocol and leaves the
// file BYTES UNCHANGED (not rewritten, not deleted). This is the honest fallback:
// POSIX has no atomic conditional-delete, so reclaim is operator-driven (manual
// quarantine + --recover), NEVER automatic, and the program never unlinks a
// foreign lock.
test("stale dead-holder lock is NOT auto-reclaimed: acquireWriterLock fail-closes with the manual-quarantine protocol and leaves bytes unchanged", () => {
  const dir = tmpDir();
  const lock = path.join(dir, "spec.repin.lock");
  writeDeadLock(lock); // parseable dead PID 999999
  const before = fs.readFileSync(lock); // raw bytes
  assert.throws(
    () => acquireWriterLock({ lockFile: lock, isPidAlive: () => false }),
    /STALE writer lock.*a foreign lock is never deleted automatically.*quarantine/,
    "a dead-holder lock must not be auto-reclaimed; acquireWriterLock must fail-closed with quarantine guidance",
  );
  // The lock file is untouched (no unlink/recreate cycle): bytes identical.
  assert.ok(fs.existsSync(lock), "the stale lock must not be clobbered or deleted");
  assert.deepEqual(fs.readFileSync(lock), before, "the stale lock bytes must be unchanged");
  assert.equal(readWriterLockOwner({ lockFile: lock }).pid, 999999);
  rm(dir);
});

// Idempotent release: calling release twice does not throw and does not delete a
// lock that was already released (and possibly re-acquired by someone else).
test("release is idempotent and never deletes a lock it no longer owns", () => {
  const dir = tmpDir();
  const lock = path.join(dir, "spec.repin.lock");
  const release = acquireWriterLock({ lockFile: lock });
  release();
  assert.equal(fs.existsSync(lock), false);
  // second release is a no-op (no throw, no file to touch)
  assert.doesNotThrow(() => release());
  rm(dir);
});

// 10. Real subprocess crash race (P0 step 3): a child holds the lock, the parent
// SIGKILLs it (the hardest crash - no finally, no release). The lock is now STALE
// (dead holder). There is NO kernel auto-release (this is the zero-dependency
// fallback, not flock): acquireWriterLock must FAIL-CLOSE with the quarantine
// protocol, AND reclaimStaleWriterLock must ALSO refuse (NOT unlink) - the
// program NEVER deletes a foreign lock. The operator then MANUALLY quarantines
// the lock (mv), after which acquire succeeds. This verifies the crash-recovery
// contract end-to-end and proves no programmatic stale-lock clearing exists.
test("subprocessRace2: SIGKILL leaves a stale dead lock; next writer + --recover both fail-closed; manual quarantine then acquire", async () => {
  const dir = tmpDir();
  const lock = path.join(dir, "spec.repin.lock");
  const marker = path.join(dir, "child-acquired.txt");
  const helper = path.join(dir, "hold-forever.mjs");
  const helperSrc = [
    "import fs from 'node:fs';",
    `import { acquireWriterLock } from ${JSON.stringify(`file://${SHARED_MODULE}`)};`,
    "const [lockFile, marker] = process.argv.slice(2);",
    "const release = acquireWriterLock({ lockFile });",
    "fs.writeFileSync(marker, String(process.pid));",
    "setInterval(() => {}, 60000);",
  ].join("\n");
  fs.writeFileSync(helper, helperSrc);
  let child;
  try {
    child = spawn(process.execPath, [helper, lock, marker], { stdio: ["ignore", "ignore", "pipe"] });
    // Wait for the marker: proves the child loaded the module AND acquired.
    const readyDeadline = Date.now() + 4000;
    while (Date.now() < readyDeadline && !fs.existsSync(marker)) {
      await new Promise((r) => setTimeout(r, 25));
    }
    assert.ok(fs.existsSync(marker), "child must have acquired the lock and written the marker");
    const childPid = Number.parseInt(fs.readFileSync(marker, "utf8").trim(), 10);
    // Parent (a different process) is refused while the child holds it (live).
    assert.throws(() => acquireWriterLock({ lockFile: lock }), /another writer transaction is active/);
    // SIGKILL the child - no finally, no release. The hardest crash a writer suffers.
    child.kill("SIGKILL");
    await new Promise((r) => child.once("exit", r));
    // Wait for the OS to reap the dead PID so defaultIsPidAlive reports dead.
    const reapDeadline = Date.now() + 3000;
    while (Date.now() < reapDeadline && defaultIsPidAlive(childPid)) {
      await new Promise((r) => setTimeout(r, 25));
    }
    assert.equal(defaultIsPidAlive(childPid), false, "the SIGKILL'd child must be reported dead");
    // The lock is now STALE (dead holder). Capture bytes, then prove the program
    // NEVER clears it: both acquireWriterLock and reclaimStaleWriterLock fail-closed
    // and leave the file byte-identical. NO auto-reclaim, NO programmatic unlink.
    const before = fs.readFileSync(lock);
    assert.throws(
      () => acquireWriterLock({ lockFile: lock }),
      /STALE writer lock.*quarantine/,
      "a stale dead-holder lock must fail-closed, not auto-reclaim",
    );
    assert.throws(
      () => reclaimStaleWriterLock({ lockFile: lock }),
      /STALE writer lock.*re-run --recover/,
      "--recover must refuse a dead-holder lock, not unlink it",
    );
    assert.deepEqual(fs.readFileSync(lock), before, "the stale lock bytes must be unchanged after both refusals");
    assert.ok(fs.existsSync(lock), "the stale lock file must remain (no kernel auto-release, no programmatic unlink)");
    // --inspect-lock (read-only) reports DEAD without mutating.
    const info = inspectWriterLock({ lockFile: lock });
    assert.equal(info.state, "DEAD");
    assert.equal(info.exists, true);
    assert.deepEqual(fs.readFileSync(lock), before, "--inspect-lock must not mutate the lock");
    // The operator MANUALLY quarantines the lock (an mv the operator performs;
    // the program never does). Once the path is gone, acquire O_EXCL succeeds.
    fs.rmSync(lock, { force: true }); // simulate operator `mv lock quarantine/`
    assert.equal(fs.existsSync(lock), false, "operator has quarantined the lock");
    const release = acquireWriterLock({ lockFile: lock });
    release();
    assert.equal(fs.existsSync(lock), false, "lock gone after quarantine + acquire + release");
  } finally {
    try { child.kill("SIGKILL"); } catch { /* exited */ }
    rm(dir);
  }
});

// 11. inspectWriterLock (new read-only export) classifies a lock into one of
// ABSENT | EMPTY | LIVE | DEAD without ever mutating it. This is the backing for
// the --inspect-lock CLI and for reclaim's diagnostics.
test("inspectWriterLock reports ABSENT/EMPTY/LIVE/DEAD without mutating", () => {
  const dir = tmpDir();
  const lock = path.join(dir, "spec.repin.lock");
  // ABSENT
  assert.equal(inspectWriterLock({ lockFile: lock }).state, "ABSENT");
  // EMPTY (crashed mid-stamp)
  fs.writeFileSync(lock, "");
  let info = inspectWriterLock({ lockFile: lock, isPidAlive: () => false });
  assert.equal(info.state, "EMPTY");
  assert.equal(info.parseable, false);
  // DEAD (parseable pid, not alive)
  writeDeadLock(lock, "777", "dn");
  info = inspectWriterLock({ lockFile: lock, isPidAlive: () => false });
  assert.equal(info.state, "DEAD");
  assert.equal(info.pid, 777);
  assert.equal(info.nonce, "dn");
  // LIVE (parseable pid, alive)
  writeDeadLock(lock, "888", "ln");
  info = inspectWriterLock({ lockFile: lock, isPidAlive: (pid) => pid === 888 });
  assert.equal(info.state, "LIVE");
  assert.equal(info.alive, true);
  assert.equal(info.pid, 888);
  // No mutation across all of the above: bytes still the LIVE content.
  assert.equal(fs.readFileSync(lock, "utf8"), "888\nln\n");
  rm(dir);
});

// 12. THE KEY INVARIANT: reclaimStaleWriterLock NEVER calls unlinkSync on a
// foreign lock - not for a dead holder, not for a live holder, not for an
// empty/unparseable holder. Only release() (our own lock) ever unlinks. This is
// the direct, deterministic proof that "programmatic stale-lock clearing does not
// exist": the fsOps unlink call-log is empty across every reclaim refusal.
test("reclaimNeverUnlinksForeignLock: reclaim refuses every existing lock and never calls unlinkSync", () => {
  const lock = path.join("mem", "spec.repin.lock");
  const scenarios = [
    { name: "dead", content: "999999\ndeadnonce\n", alive: () => false, wantErr: /STALE writer lock.*re-run --recover/ },
    { name: "live", content: "888888\nlivenonce\n", alive: (pid) => pid === 888888, wantErr: /another writer transaction is active.*cannot run --recover/ },
    { name: "empty", content: "", alive: () => false, wantErr: /STALE writer lock.*re-run --recover/ },
    { name: "garbage", content: "not a lock", alive: () => false, wantErr: /STALE writer lock.*re-run --recover/ },
  ];
  for (const s of scenarios) {
    const { fsOps, files, unlinkCalls } = makeMemFs({ [lock]: s.content });
    const before = files.get(lock);
    assert.throws(
      () => reclaimStaleWriterLock({ lockFile: lock, fsOps, isPidAlive: s.alive }),
      s.wantErr,
      `${s.name}: reclaim must refuse`,
    );
    assert.equal(unlinkCalls.length, 0, `${s.name}: reclaim must NEVER call unlinkSync`);
    assert.equal(files.get(lock), before, `${s.name}: the lock bytes must be unchanged`);
  }
  // And the ONLY way unlink is reachable: release() of a lock we ourselves own.
  const own = makeMemFs({});
  const release = acquireWriterLock({ lockFile: lock, fsOps: own.fsOps, isPidAlive: () => false });
  assert.equal(own.unlinkCalls.length, 0, "acquire does not unlink");
  release();
  assert.equal(own.unlinkCalls.length, 1, "release unlinks our own lock (the only unlink path)");
  assert.equal(own.unlinkCalls[0].path, lock);
  assert.equal(own.files.has(lock), false);
});

// 13. The two-recover race that was the P0: R2 reads a dead lock S and "pauses";
// R1 quarantines S and a new writer O_EXCL-creates a LIVE lock L1; R2 resumes and
// runs reclaim. In the OLD design R2 unlinked L1 (a live lock) based on its stale
// read of S - re-entering the critical section with two writers. In the corrected
// design reclaim re-reads fresh at entry and REFUSES a live holder, and never
// unlinks, so L1 survives. This deterministically proves the race is closed.
test("twoRecoverersReadStaleLockNeitherDeletesLiveLock: a live writer's lock is never stolen by a recover", () => {
  const lock = path.join("mem", "spec.repin.lock");
  const { fsOps, files, unlinkCalls } = makeMemFs({ [lock]: "999999\ndeadnonce\n" }); // S: dead
  const aliveFor = (pid) => pid === process.pid; // S's 999999 is dead; our own L1 is live
  // R1: reclaim sees dead S -> refuses STALE (operator must quarantine). No unlink.
  assert.throws(
    () => reclaimStaleWriterLock({ lockFile: lock, fsOps, isPidAlive: aliveFor }),
    /STALE writer lock.*re-run --recover/,
  );
  assert.equal(unlinkCalls.length, 0, "R1 did not unlink");
  // Operator quarantines S out of band (the program never does).
  files.delete(lock);
  // A new writer O_EXCL-creates a LIVE lock L1 (pid = process.pid).
  const release = acquireWriterLock({ lockFile: lock, fsOps, isPidAlive: aliveFor });
  const l1 = files.get(lock);
  assert.match(l1, new RegExp(`^${process.pid}\\n[0-9a-f]+\\n$`), "L1 is a live lock stamped by the new writer");
  // R2 "resumes" - it had read S (dead) earlier, but reclaim re-reads FRESH now
  // and sees L1 (live). It must refuse and must NOT unlink L1.
  assert.throws(
    () => reclaimStaleWriterLock({ lockFile: lock, fsOps, isPidAlive: aliveFor }),
    /another writer transaction is active.*cannot run --recover/,
    "R2 must re-read fresh and refuse the live lock, not act on its stale read of S",
  );
  assert.equal(unlinkCalls.length, 0, "R2 did NOT unlink the live lock L1");
  assert.equal(files.get(lock), l1, "L1 survives intact - the live writer's lock was never stolen");
  release();
  assert.equal(unlinkCalls.length, 1, "only the live writer's own release unlinks");
});

// 14. reclaim's refusal leaves NO fs side effects: after it throws, the path is
// exactly as before, so a subsequent acquire on a cleared path is unaffected.
test("recoverRefusalDoesNotInterfereWithAcquire: a refused reclaim leaves no partial state", () => {
  const lock = path.join("mem", "spec.repin.lock");
  const { fsOps, files, unlinkCalls } = makeMemFs({ [lock]: "999999\ndeadnonce\n" });
  assert.throws(() => reclaimStaleWriterLock({ lockFile: lock, fsOps, isPidAlive: () => false }));
  // No mutation from the refusal.
  assert.equal(files.get(lock), "999999\ndeadnonce\n");
  assert.equal(unlinkCalls.length, 0);
  // Operator quarantines; acquire then proceeds normally.
  files.delete(lock);
  const release = acquireWriterLock({ lockFile: lock, fsOps, isPidAlive: () => false });
  assert.ok(files.has(lock));
  release();
  assert.equal(files.has(lock), false);
});

// 15. When there is NO lock, reclaim is a no-op return (lets the caller proceed),
// and that does not conflict with a concurrent new writer's O_EXCL create.
test("pendingRecoverVsNewWriter: no lock -> reclaim lets through; a new writer's O_EXCL is unaffected", () => {
  const lock = path.join("mem", "spec.repin.lock");
  const { fsOps, files, unlinkCalls } = makeMemFs({});
  // No lock file: reclaim returns without throwing and without mutating.
  assert.doesNotThrow(() => reclaimStaleWriterLock({ lockFile: lock, fsOps, isPidAlive: () => false }));
  assert.equal(unlinkCalls.length, 0);
  assert.equal(files.has(lock), false);
  // A new writer acquires normally right after.
  const release = acquireWriterLock({ lockFile: lock, fsOps, isPidAlive: () => false });
  assert.ok(files.has(lock), "new writer created the lock via O_EXCL");
  release();
  assert.equal(files.has(lock), false);
});

// 16. Release nonce-guard under a (hypothetical) replacement: if the lock's nonce
// was replaced with a FOREIGN nonce before release reads it, release must NOT
// delete (defense-in-depth). And in the happy path (our nonce still present),
// release DOES unlink our own lock. Proves the guard gates on the observed nonce.
// This is defense-in-depth, NON-atomic: the real ABA closure is structural (no
// foreign-unlink path exists while we hold the lock), not this nonce check.
test("releaseAfterNonceCheckWithReplacement: release deletes only an own-nonce lock; a foreign-nonce lock is preserved", () => {
  const lock = path.join("mem", "spec.repin.lock");
  // Happy path: acquire our own lock, release reads our nonce -> unlinks.
  const mem = makeMemFs({});
  const release = acquireWriterLock({ lockFile: lock, fsOps: mem.fsOps, isPidAlive: () => false });
  const ourNonce = mem.files.get(lock).split("\n")[1];
  assert.ok(ourNonce);
  release();
  assert.equal(mem.files.has(lock), false, "release deleted our own (matching-nonce) lock");
  assert.equal(mem.unlinkCalls.length, 1);
  // Replacement path: acquire, then overwrite the file with a FOREIGN nonce
  // BEFORE release reads. release must observe the foreign nonce and NOT unlink.
  const mem2 = makeMemFs({});
  const release2 = acquireWriterLock({ lockFile: lock, fsOps: mem2.fsOps, isPidAlive: () => false });
  mem2.files.set(lock, `${process.pid}\nforeignnonce\n`); // hypothetical replacement
  release2();
  assert.equal(mem2.files.has(lock), true, "release must NOT delete a foreign-nonce lock");
  assert.equal(mem2.unlinkCalls.length, 0, "release did not call unlinkSync on a foreign-nonce lock");
  assert.match(mem2.files.get(lock), /foreignnonce/, "the foreign lock is preserved");
});

// 17. Real subprocess SIGKILL -> stale dead lock -> reclaim refuses AND does not
// delete (bytes unchanged); --inspect-lock reports DEAD read-only. The
// subprocess twin of #12: proves "no programmatic stale-lock clearing" against a
// REAL crashed process, not just injected fsOps.
test("sigkillThenRecoverRefusesAndDoesNotDelete: a real SIGKILL'd lock is refused and left byte-identical", async () => {
  const dir = tmpDir();
  const lock = path.join(dir, "spec.repin.lock");
  const marker = path.join(dir, "child-acquired.txt");
  const helper = path.join(dir, "hold-forever.mjs");
  const helperSrc = [
    "import fs from 'node:fs';",
    `import { acquireWriterLock } from ${JSON.stringify(`file://${SHARED_MODULE}`)};`,
    "const [lockFile, marker] = process.argv.slice(2);",
    "const release = acquireWriterLock({ lockFile });",
    "fs.writeFileSync(marker, String(process.pid));",
    "setInterval(() => {}, 60000);",
  ].join("\n");
  fs.writeFileSync(helper, helperSrc);
  let child;
  try {
    child = spawn(process.execPath, [helper, lock, marker], { stdio: ["ignore", "ignore", "pipe"] });
    const readyDeadline = Date.now() + 4000;
    while (Date.now() < readyDeadline && !fs.existsSync(marker)) {
      await new Promise((r) => setTimeout(r, 25));
    }
    assert.ok(fs.existsSync(marker), "child must have acquired the lock");
    const childPid = Number.parseInt(fs.readFileSync(marker, "utf8").trim(), 10);
    child.kill("SIGKILL");
    await new Promise((r) => child.once("exit", r));
    const reapDeadline = Date.now() + 3000;
    while (Date.now() < reapDeadline && defaultIsPidAlive(childPid)) {
      await new Promise((r) => setTimeout(r, 25));
    }
    assert.equal(defaultIsPidAlive(childPid), false, "child reaped");
    const before = fs.readFileSync(lock);
    // --recover refuses and does NOT unlink: bytes unchanged.
    assert.throws(
      () => reclaimStaleWriterLock({ lockFile: lock }),
      /STALE writer lock.*re-run --recover/,
      "--recover must refuse a dead-holder lock, not clear it",
    );
    assert.deepEqual(fs.readFileSync(lock), before, "reclaim must leave the lock byte-identical");
    assert.ok(fs.existsSync(lock), "the stale lock file remains (no programmatic unlink)");
    // --inspect-lock read-only: reports DEAD, no mutation.
    const info = inspectWriterLock({ lockFile: lock });
    assert.equal(info.state, "DEAD");
    assert.deepEqual(fs.readFileSync(lock), before, "inspect must not mutate the lock");
  } finally {
    try { child.kill("SIGKILL"); } catch { /* exited */ }
    rm(dir);
  }
});
