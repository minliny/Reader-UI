// Shared authority-writer lock PRIMITIVE for repin / recover / promote / retract.
//
// All four tools mutate the same runtime-payload authority files (the spec at
// <repoRoot>/ui-spec/runtime-payload-contracts.json and the dependency mirror
// that re-derives from it) and must be truly serial: a concurrent repin and
// promote previously could not block each other because they held two different
// locks (repin used a beside-spec lock; promote used an os.tmpdir() lock keyed
// by the repo realpath). This module is the single shared lock primitive they are
// intended to contend on (all deriving the SAME path `${resolveRealPath(spec)}.repin.lock`).
//
// SCOPE: this commit ships ONLY the lock primitive + its unit tests. The four-tool
// call-site integration (checker --inspect-lock / --recover, repin, promote,
// retract) lives in separate, deferred commits - so in THIS commit's tree NO tool
// imports this module yet. This commit closes the lock-PRIMITIVE race (no
// programmatic stale-lock clearing); the cross-tool shared-writer P0 is NOT
// closed until the integration commits land and a clean archive passes full CI.
//
// Lock file location: `<specPath>.repin.lock` (each tool computes this from the
// same spec realpath; callers pass the resolved path in).
//
// Lock file format: "<pid>\n<nonce>\n"  where nonce = 16 random bytes as hex.
//
// Mutual exclusion is the O_EXCL (atomic create-if-not-exists) open: exactly one
// writer can create the lock file, and that IS the lock. This is the ONLY claim
// of atomicity this module makes.
//
// POSIX offers NO conditional-delete primitive (only O_EXCL create / rename /
// unlink / link - all unconditional). Therefore ANY programmatic unlink of a
// FOREIGN lock is a non-atomic CAS race: a second recover could read a dead
// holder, pause, let a first recover proceed, then unlink the first recover's
// freshly-created LIVE lock mid-recovery - re-entering the critical section with
// two writers (the exact P0 this module previously had, when reclaimStaleWriterLock
// unlinked a dead lock before its own O_EXCL). The only safe design is: NO
// programmatic stale-lock clearing exists ANYWHERE. This module never unlinks a
// lock it did not create via its own O_EXCL.
//
//   - acquireWriterLock: O_EXCL create wins. If the file exists, the holder's PID
//     is read; a LIVE holder is refused ("another writer transaction is active"),
//     and a DEAD or unparseable holder is REFUSED fail-closed pointing the
//     operator at the manual-quarantine protocol (see below). No unlink/recreate.
//
//   - recovery (operator-driven, OUT OF BAND): the operator stops ALL writers,
//     confirms global silence, then MANUALLY moves the stale lock file to
//     quarantine (an `mv` the operator performs - the program never does). Once
//     the lock path no longer exists, `check-runtime-payload-source.mjs --recover`
//     calls reclaimStaleWriterLock (no-op when no lock) then acquireWriterLock
//     (O_EXCL succeeds) and reconciles the journal. reclaimStaleWriterLock
//     REFUSES any existing lock (live/dead/unparseable) with diagnostics and
//     NEVER mutates - it is the gate that proves the operator already cleared
//     the lock, not a clearer.
//
//   - inspectWriterLock / `--inspect-lock`: read-only diagnostics (pid, nonce,
//     liveness, state + quarantine guidance). Never mutates.
//
// release() unlinks the lock file so the next writer can O_EXCL-create it. The
// unlink is nonce-guarded (only deletes a file whose nonce matches ours) as
// defense-in-depth. It is NON-atomic and is NOT an "ABA closure" claim: the
// release-side ABA is closed because NO foreign-unlink path exists (this module
// never unlinks a lock it did not create), so nothing can replace a live owner's
// lock while it is held (O_EXCL blocks concurrent writers; a SIGKILL'd holder
// skips `finally` and never runs release()). The nonce check only guards the
// non-reachable-in-normal-operation read-then-unlink gap.
//
// EPERM from kill(pid, 0) means the process exists but we lack permission to
// signal it: treated as ALIVE (never reclaimed), so a live process under a
// different uid cannot be mistaken for dead and have its lock stolen.

import crypto from "node:crypto";
import fs from "node:fs";

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

// kill(pid, 0) succeeds if pid exists (alive). EPERM means it exists but we may
// not signal it -> alive. ESRCH (or any other error) means no such process.
export function defaultIsPidAlive(pid) {
  if (!Number.isFinite(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error && error.code === "EPERM") return true;
    return false;
  }
}

function newNonce() {
  return crypto.randomBytes(16).toString("hex");
}

// Read the lock owner: { inode, pid, nonce } or null if absent. An unparseable
// lock returns { inode, pid: NaN, nonce: null } so the caller can treat it as a
// held (mid-stamp) lock rather than crashing.
function readOwner(fsOps, lockFile) {
  let stat;
  try {
    stat = fsOps.lstatSync(lockFile);
  } catch {
    return null;
  }
  let content = "";
  try {
    content = fsOps.readFileSync(lockFile, "utf8").toString("utf8");
  } catch {
    return { inode: stat.ino, pid: NaN, nonce: null };
  }
  const lines = content.split("\n");
  const pid = Number.parseInt(lines[0], 10);
  const nonce = lines.length > 1 && lines[1] ? lines[1] : null;
  return { inode: stat.ino, pid, nonce };
}

// Open with O_EXCL|O_CREAT (wx). Returns the fd on success, null on EEXIST.
function tryCreate(fsOps, lockFile) {
  try {
    return fsOps.openSync(lockFile, "wx");
  } catch (error) {
    if (error && error.code === "EEXIST") return null;
    throw error;
  }
}

// Stamp the PID+nonce through the SAME fd that won O_EXCL (writeSync + fsync +
// close), never by path after a close: a close-then-write-by-path leaves the lock
// empty for an instant, during which a second writer could open it fresh - a
// double-writer window. The fsync makes the PID durable before the fd closes.
function stampThroughFd(fsOps, fd, payload) {
  try {
    fsOps.writeSync(fd, payload);
    if (typeof fsOps.fsyncSync === "function") {
      fsOps.fsyncSync(fd);
    }
  } finally {
    try { fsOps.closeSync(fd); } catch { /* already closed */ }
  }
}

function safeUnlink(fsOps, file) {
  try {
    fsOps.unlinkSync(file);
  } catch (error) {
    if (error && error.code !== "ENOENT") throw error;
  }
}

// Build the release closure for a lock we own (nonce). The closure deletes the
// lock ONLY if it still carries our nonce. This is DEFENSE-IN-DEPTH, not an
// atomicity claim: the read-then-unlink is non-atomic. In normal operation the
// gap is not reachable - O_EXCL blocks any other writer from creating while our
// file exists, so no concurrent writer can replace the lock between our read and
// unlink while we are alive, and a SIGKILL'd holder skips `finally` and never
// runs release(). The release-side ABA is closed by the REMOVAL of auto-reclaim
// (the only path that could replace a live owner's lock), not by this nonce
// check. Idempotent.
function makeRelease(fsOps, lockFile, nonce) {
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    const owner = readOwner(fsOps, lockFile);
    if (owner && owner.nonce === nonce) {
      safeUnlink(fsOps, lockFile);
    }
    // Else: not ours (replaced or gone). Do not delete another writer's lock.
  };
  return release;
}

// Acquire the exclusive writer lock. Returns a release() function. Mutual
// exclusion is the atomic O_EXCL create. If the file exists, a LIVE holder is
// refused; a DEAD or unparseable holder is REFUSED fail-closed with "run
// --recover" - this module does NOT auto-reclaim (POSIX has no atomic
// conditional-delete, so any unlink/recreate cycle is a non-atomic CAS race).
// fsOps and isPidAlive are injectable for unit tests.
export function acquireWriterLock({ lockFile, fsOps = realFsOps, isPidAlive = defaultIsPidAlive } = {}) {
  if (!lockFile) throw new Error("acquireWriterLock requires a lockFile");
  const nonce = newNonce();
  const payload = `${process.pid}\n${nonce}\n`;
  const fd = tryCreate(fsOps, lockFile);
  if (fd !== null) {
    stampThroughFd(fsOps, fd, payload);
    return makeRelease(fsOps, lockFile, nonce);
  }
  // Lock exists - read the holder. Live = refuse; dead/unparseable = fail-closed
  // pointing the operator at the manual-quarantine protocol. NEVER auto-reclaim
  // and NEVER unlink a foreign lock (POSIX has no atomic conditional-delete).
  const owner = readOwner(fsOps, lockFile);
  const liveHolder = owner && Number.isFinite(owner.pid) && owner.pid > 0 && isPidAlive(owner.pid);
  if (liveHolder) {
    throw new Error(`another writer transaction is active (pid ${owner.pid}); not acquiring lock at ${lockFile}`);
  }
  const desc = owner && Number.isFinite(owner.pid) && owner.pid > 0
    ? `dead pid ${owner.pid}`
    : "an empty/unparseable holder";
  throw new Error(
    `STALE writer lock at ${lockFile} (${desc}); a foreign lock is never deleted automatically. ` +
    `Stop all writers, run \`check-runtime-payload-source.mjs --inspect-lock\` for details, ` +
    `then MANUALLY move the lock file to quarantine (mv). Once the lock path no longer exists, ` +
    `run \`check-runtime-payload-source.mjs --recover\` to acquire (O_EXCL) and reconcile the journal`,
  );
}

// Convenience: acquire, run fn (sync), release in finally. Returns fn's result.
export function withWriterLock({ lockFile, fsOps, isPidAlive }, fn) {
  const release = acquireWriterLock({ lockFile, fsOps, isPidAlive });
  try {
    return fn();
  } finally {
    release();
  }
}

// Classify a parsed owner into a read-only inspection record. Shared by
// inspectWriterLock and reclaimStaleWriterLock so the two never disagree on
// state. state is one of ABSENT | EMPTY | LIVE | DEAD. Pure: no fs mutation.
function classifyOwner(owner, isPidAlive) {
  if (!owner) {
    return { exists: false, pid: null, nonce: null, parseable: false, alive: false, state: "ABSENT" };
  }
  const parseable = Number.isFinite(owner.pid) && owner.pid > 0;
  const alive = parseable && isPidAlive(owner.pid);
  const state = !parseable ? "EMPTY" : alive ? "LIVE" : "DEAD";
  return { exists: true, pid: parseable ? owner.pid : null, nonce: owner.nonce, parseable, alive, state };
}

// Explicit --recover gate. This is the OUT-OF-BAND recovery contract: the
// operator has ALREADY stopped all writers and MANUALLY moved any stale lock to
// quarantine (an `mv` the operator performed, never the program). This function
// REFUSES any existing lock (live/dead/unparseable) with diagnostics and NEVER
// mutates - it is the gate that PROVES the operator already cleared the lock, not
// a clearer. With the lock path absent, the caller proceeds to acquireWriterLock
// (O_EXCL creates fresh) and reconciles the journal.
//
// POSIX has NO conditional-delete, so ANY programmatic unlink of a foreign lock
// is a non-atomic CAS race (a second recover could read a dead holder, pause,
// let the first recover proceed, then unlink the first recover's freshly-created
// LIVE lock - re-entering the critical section with two writers, the P0 this
// module previously had when this function did `readOwner -> judge dead ->
// safeUnlink` BEFORE acquireWriterLock's O_EXCL). To close that P0 for real, this
// module deletes NO foreign lock, ANYWHERE - not here, not in acquireWriterLock.
// Only release() deletes a lock, and only its own.
//
//   - no lock file            -> return (clean; caller O_EXCL-creates + recovers)
//   - LIVE holder             -> throw "another writer transaction is active"
//   - DEAD holder (parseable) -> throw STALE + manual-quarantine guidance
//   - empty / unparseable     -> throw STALE + manual-quarantine guidance
export function reclaimStaleWriterLock({ lockFile, fsOps = realFsOps, isPidAlive = defaultIsPidAlive } = {}) {
  if (!lockFile) throw new Error("reclaimStaleWriterLock requires a lockFile");
  const owner = readOwner(fsOps, lockFile);
  if (!owner) return; // no lock file - the operator already cleared it; proceed.
  const info = classifyOwner(owner, isPidAlive);
  if (info.alive) {
    throw new Error(
      `another writer transaction is active (pid ${owner.pid}); cannot run --recover while a writer is running`,
    );
  }
  const desc = info.state === "DEAD" ? `dead pid ${owner.pid}` : "an empty/unparseable holder";
  throw new Error(
    `STALE writer lock at ${lockFile} (${desc}); a foreign lock is never deleted automatically. ` +
    `Stop all writers, run \`check-runtime-payload-source.mjs --inspect-lock\` for details, ` +
    `then MANUALLY move the lock file to quarantine (mv). Once the lock path no longer exists, re-run --recover`,
  );
}

// Read-only inspection of the current lock owner (for the --inspect-lock CLI and
// tests). Returns { exists, pid, nonce, parseable, alive, state } and NEVER
// mutates the lock file - not an unlink, not a touch.
export function inspectWriterLock({ lockFile, fsOps = realFsOps, isPidAlive = defaultIsPidAlive } = {}) {
  if (!lockFile) throw new Error("inspectWriterLock requires a lockFile");
  const owner = readOwner(fsOps, lockFile);
  return classifyOwner(owner, isPidAlive);
}

// Read-only raw owner (inode/pid/nonce) for tests. Prefer inspectWriterLock for
// diagnostics.
export function readWriterLockOwner({ lockFile, fsOps = realFsOps } = {}) {
  return readOwner(fsOps, lockFile);
}
