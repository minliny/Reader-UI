import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "rss-runtime-contract.js"), "utf8");
function fresh() { const sandbox = { module: { exports: {} }, window: {}, globalThis: {}, Promise }; new vm.Script(source).runInNewContext(sandbox); return sandbox.module.exports; }

test("R2b owner starts ready with stable default feed", () => {
  const api = fresh(); const state = api.createOwner().getState();
  assert.equal(state.phase, "ready"); assert.equal(state.selectedFeedId, "github-releases"); assert.equal(state.requestEpoch, 0);
});

test("R2b feed selection only accepts canonical feed IDs", () => {
  const api = fresh(); const owner = api.createOwner();
  owner.dispatch({ type: "SELECT_FEED", feedId: "reader-discussions", focusReturnKey: "rss-feed-reader-discussions" });
  assert.equal(owner.getState().selectedFeedId, "reader-discussions");
  owner.dispatch({ type: "SELECT_FEED", feedId: "feed-2" });
  assert.equal(owner.getState().selectedFeedId, "reader-discussions");
});

test("R2b detail selection and cleanup retain focus return", () => {
  const api = fresh(); const owner = api.createOwner();
  owner.dispatch({ type: "SELECT_ARTICLE", articleId: "reader-ui-update", focusReturnKey: "rss-article-reader-ui-update" });
  assert.equal(owner.getState().phase, "detail"); assert.equal(owner.getState().selectedArticleId, "reader-ui-update");
  owner.dispatch({ type: "DETAIL_CLOSE" });
  assert.equal(owner.getState().phase, "ready"); assert.equal(owner.getState().focusReturnKey, "rss-article-reader-ui-update");
});

test("R2b empty and error states are owner state, not extra routes", () => {
  const api = fresh(); const owner = api.createOwner();
  owner.dispatch({ type: "SHOW_EMPTY" }); assert.equal(owner.getState().phase, "empty");
  owner.dispatch({ type: "SHOW_ERROR", error: "offline" }); assert.equal(owner.getState().phase, "error"); assert.equal(owner.getState().error, "offline");
});

test("R2b refresh succeeds through one guarded owner", async () => {
  const api = fresh(); const owner = api.createOwner();
  const result = await api.executeRefresh(owner, () => ({ unread: 7 }));
  assert.equal(result.status, "success"); assert.equal(owner.getState().phase, "ready"); assert.equal(owner.getState().request.status, "success");
});

test("R2b duplicate refresh is rejected", async () => {
  const api = fresh(); const owner = api.createOwner(); let release;
  const pending = api.executeRefresh(owner, () => new Promise((resolve) => { release = resolve; })); await Promise.resolve();
  assert.equal((await api.executeRefresh(owner, () => true)).status, "duplicate");
  release(true); assert.equal((await pending).status, "success");
});

test("R2b cancelled completion is stale", async () => {
  const api = fresh(); const owner = api.createOwner(); let release;
  const pending = api.executeRefresh(owner, () => new Promise((resolve) => { release = resolve; })); await Promise.resolve();
  assert.equal(api.cancelRefresh(owner).status, "cancelled"); release(true);
  assert.equal((await pending).status, "stale"); assert.equal(owner.getState().request.status, "cancelled");
});

test("R2b failed refresh preserves an accessible error payload", async () => {
  const api = fresh(); const owner = api.createOwner();
  assert.equal((await api.executeRefresh(owner, () => { throw new Error("network down"); })).status, "failed");
  assert.equal(owner.getState().phase, "error"); assert.equal(owner.getState().error, "network down");
});

test("R2b subscribers observe one canonical dispatch stream", () => {
  const api = fresh(); const owner = api.createOwner(); const actions = [];
  const stop = owner.subscribe((_next, _previous, action) => actions.push(action.type));
  owner.dispatch({ type: "SHOW_EMPTY" }); stop(); owner.dispatch({ type: "RESET" });
  assert.deepEqual(actions, ["SHOW_EMPTY"]);
});
