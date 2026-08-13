import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "reader-runtime-contract.js"), "utf8");

function fresh() {
  const sandbox = { module: { exports: {} }, window: {}, globalThis: {}, Promise };
  new vm.Script(source).runInNewContext(sandbox);
  return sandbox.module.exports;
}

test("R2b route commits derive canonical modes without changing route owners", () => {
  const api = fresh();
  let state = api.reducer(undefined, { type: "ROUTE_COMMIT", route: "reader" });
  assert.equal(state.mode, "control");
  state = api.reducer(state, { type: "ROUTE_COMMIT", route: "reader-appearance-overlay-v2" });
  assert.equal(state.module, "appearance");
  state = api.reducer(state, { type: "ROUTE_COMMIT", route: "reader-full-settings" });
  assert.equal(state.panel, "full");
});

test("R2b compatibility routes keep their local UiEvent surface", () => {
  const api = fresh();
  const state = api.reducer(undefined, { type: "ROUTE_COMMIT", route: "toc-bookmarks" });
  assert.equal(state.route, "toc-bookmarks");
  assert.equal(state.module, "directory");
  assert.equal(api.COMPATIBILITY_ROUTE_CROSSWALK["toc-bookmarks"], "reader-directory-overlay-v2");
});

test("R2b page turns clamp at zero and reject unknown directions", () => {
  const api = fresh();
  const initial = api.reducer(undefined, { type: "RESET" });
  assert.equal(api.reducer(initial, { type: "PAGE_TURN", direction: "prev" }).pageIndex, 0);
  const next = api.reducer(initial, { type: "PAGE_TURN", direction: "next" });
  assert.equal(next.pageIndex, 1);
  assert.equal(api.reducer(next, { type: "PAGE_TURN", direction: "sideways" }), next);
});

test("R2b chapter jump accepts stable chapter keys only", () => {
  const api = fresh();
  const initial = api.reducer(undefined, { type: "RESET" });
  const jumped = api.reducer(initial, { type: "CHAPTER_JUMP", chapterKey: "chapter-31-return" });
  assert.equal(jumped.chapterKey, "chapter-31-return");
  assert.equal(api.reducer(jumped, { type: "CHAPTER_JUMP", chapterKey: "2" }), jumped);
});

test("R2b TTS and auto-page share one session owner", () => {
  const api = fresh();
  let state = api.reducer(undefined, { type: "TTS_START" });
  assert.equal(state.session, "tts");
  state = api.reducer(state, { type: "AUTO_PAGE_START" });
  assert.equal(state.session, "auto-page");
  state = api.reducer(state, { type: "SESSION_STOP" });
  assert.equal(state.session, null);
});

test("R2b request owner ignores duplicate starts", () => {
  const api = fresh();
  const started = api.reducer(undefined, { type: "REQUEST_START", kind: "content", requestId: "content:1" });
  assert.equal(started.contentRequest.status, "loading");
  assert.equal(api.reducer(started, { type: "REQUEST_START", kind: "content", requestId: "content:2" }), started);
});

test("R2b request owner discards stale completions", () => {
  const api = fresh();
  const started = api.reducer(undefined, { type: "REQUEST_START", kind: "toc", requestId: "toc:1" });
  assert.equal(api.reducer(started, { type: "REQUEST_SUCCESS", kind: "toc", requestId: "toc:stale" }), started);
  const completed = api.reducer(started, { type: "REQUEST_SUCCESS", kind: "toc", requestId: "toc:1" });
  assert.equal(completed.tocRequest.status, "success");
});

test("R2b failed request retains a deterministic error", () => {
  const api = fresh();
  const started = api.reducer(undefined, { type: "REQUEST_START", kind: "content", requestId: "content:1" });
  const failed = api.reducer(started, { type: "REQUEST_FAILED", kind: "content", requestId: "content:1", error: "offline" });
  assert.equal(failed.contentRequest.status, "failed");
  assert.equal(failed.error, "offline");
});

test("R2b interrupt cancels pending work and active sessions", () => {
  const api = fresh();
  let state = api.reducer(undefined, { type: "REQUEST_START", kind: "content", requestId: "content:1" });
  state = api.reducer(state, { type: "TTS_START" });
  state = api.reducer(state, { type: "INTERRUPT", reason: "route-change" });
  assert.equal(state.contentRequest.status, "cancelled");
  assert.equal(state.session, null);
  assert.equal(state.interruptSequence, 1);
});

test("R2b owner publishes committed actions only", () => {
  const api = fresh();
  const owner = api.createOwner();
  const seen = [];
  const unsubscribe = owner.subscribe((state, action) => seen.push([state.route, action.type]));
  owner.dispatch({ type: "ROUTE_COMMIT", route: "reader" });
  owner.dispatch({ type: "ROUTE_COMMIT", route: "unknown" });
  unsubscribe();
  owner.dispatch({ type: "ROUTE_COMMIT", route: "immersive-reading" });
  assert.deepEqual(seen, [["reader", "ROUTE_COMMIT"]]);
});

test("R2b async content retry has duplicate and stale guards", async () => {
  const api = fresh();
  const owner = api.createOwner();
  let release;
  const pending = api.executeContentRetry(owner, () => new Promise((resolve) => { release = resolve; }));
  assert.equal((await api.executeContentRetry(owner, async () => {})).status, "duplicate");
  owner.dispatch({ type: "INTERRUPT", reason: "cancel" });
  release("late");
  assert.equal((await pending).status, "stale");
});

test("R2b async TOC retry commits success and failure", async () => {
  const api = fresh();
  const successOwner = api.createOwner();
  assert.equal((await api.executeTocRetry(successOwner, async () => "ok")).status, "success");
  const failedOwner = api.createOwner();
  assert.equal((await api.executeTocRetry(failedOwner, async () => { throw new Error("offline"); })).status, "failed");
  assert.equal(failedOwner.getState().error, "offline");
});
