import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "renderers/d2-bookshelf-discover-renderers.js"), "utf8");
function fresh() {
  const window = { localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} } };
  new vm.Script(source).runInNewContext({ window, Promise, setTimeout });
  const owner = window.ReaderD2BookshelfDiscoverRenderers.bookSearch; owner.initState(); return owner;
}

test("R2b owner begins with stable query and result IDs", () => {
  const state = fresh().getState(); assert.equal(state.queryId, "book-catalog-primary");
  assert.deepEqual([...state.resultIds], ["long-night", "mystery-lord", "three-body"]);
});

test("R2b query updates are owned and clear old errors", () => {
  const owner = fresh(); owner.dispatch({ type: "SEARCH_FAILED", requestId: "missing", error: "ignored" }); owner.dispatch({ type: "SET_QUERY", value: "长夜" });
  assert.equal(owner.getState().query, "长夜"); assert.equal(owner.getState().error, null);
});

test("R2b result selection accepts only stable book IDs", () => {
  const owner = fresh(); owner.dispatch({ type: "SELECT_RESULT", resultId: "three-body", focusReturnKey: "result-three-body" });
  assert.equal(owner.getState().selectedResultId, "three-body"); assert.equal(owner.getState().focusReturnKey, "result-three-body");
  owner.dispatch({ type: "SELECT_RESULT", resultId: "result-2" }); assert.equal(owner.getState().selectedResultId, "three-body");
});

test("R2b async search completes success", async () => {
  const owner = fresh(); const result = await owner.executeSearch(() => ["long-night", "three-body"]);
  assert.equal(result.status, "success"); assert.equal(owner.getState().phase, "after"); assert.deepEqual([...owner.getState().resultIds], ["long-night", "three-body"]);
});

test("R2b empty search result becomes empty state", async () => {
  const owner = fresh(); const result = await owner.executeSearch(() => []);
  assert.equal(result.status, "empty"); assert.equal(owner.getState().phase, "empty"); assert.deepEqual([...owner.getState().resultIds], []);
});

test("R2b retry uses the same canonical owner", async () => {
  const owner = fresh(); owner.dispatch({ type: "SET_QUERY", value: "三体" }); const result = await owner.executeRetry(() => ["three-body"]);
  assert.equal(result.status, "success"); assert.equal(owner.getState().pending.kind, "retry");
});

test("R2b duplicate async request is rejected", async () => {
  const owner = fresh(); let release; const pending = owner.executeSearch(() => new Promise((resolve) => { release = resolve; })); await Promise.resolve();
  assert.equal((await owner.executeRetry(() => [])).status, "duplicate"); release(["long-night"]); assert.equal((await pending).status, "success");
});

test("R2b close invalidates an in-flight completion as stale", async () => {
  const owner = fresh(); let release; const pending = owner.executeSearch(() => new Promise((resolve) => { release = resolve; })); await Promise.resolve();
  assert.equal(owner.close("search-trigger").status, "cancelled"); release(["long-night"]);
  assert.equal((await pending).status, "stale"); assert.equal(owner.getState().pending.status, "cancelled"); assert.equal(owner.getState().focusReturnKey, "search-trigger");
});

test("R2b repeated close is guarded", () => {
  const owner = fresh(); assert.equal(owner.close().status, "cancelled"); assert.equal(owner.close().status, "closed");
});

test("R2b failed search retains deterministic error", async () => {
  const owner = fresh(); const result = await owner.executeSearch(() => { throw new Error("network down"); });
  assert.equal(result.status, "failed"); assert.equal(owner.getState().phase, "error"); assert.equal(owner.getState().error, "network down");
});

test("R2b subscribers observe one owner stream", () => {
  const owner = fresh(); const actions = []; const stop = owner.subscribe((_next, _prev, action) => actions.push(action.type));
  owner.dispatch({ type: "SET_QUERY", value: "诡秘" }); stop(); owner.dispatch({ type: "SET_QUERY", value: "三体" });
  assert.deepEqual(actions, ["SET_QUERY"]);
});
