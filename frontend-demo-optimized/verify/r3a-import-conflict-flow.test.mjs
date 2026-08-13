import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const contract = createRequire(import.meta.url)(join(here, "..", "import-runtime-contract.js"));
const plain = (value) => JSON.parse(JSON.stringify(value));

test("R3a import flow: default owner binds stable batch and entity denominators", () => {
  const state = plain(contract.createOwner().getState());
  assert.equal(state.batchId, contract.BATCH_ID);
  assert.deepEqual(Object.keys(state.conflictChoices), [...contract.CONFLICT_IDS]);
  assert.deepEqual(state.selectedItemIds, []);
});

test("R3a import flow: item selection supports toggle, all, clear, and rejects unknown IDs", () => {
  const owner = contract.createOwner();
  owner.dispatch({ type: "ITEM_TOGGLE", itemId: "rain-night" });
  assert.deepEqual(plain(owner.getState().selectedItemIds), ["rain-night"]);
  const before = owner.getState();
  owner.dispatch({ type: "ITEM_TOGGLE", itemId: "ordinal-0" });
  assert.equal(owner.getState(), before);
  owner.dispatch({ type: "ITEM_SELECT_ALL" });
  assert.deepEqual(plain(owner.getState().selectedItemIds), [...contract.ITEM_IDS]);
  owner.dispatch({ type: "ITEM_CLEAR_ALL" });
  assert.deepEqual(plain(owner.getState().selectedItemIds), []);
});

test("R3a import flow: conflict choice supports per-conflict and choose-all semantics", () => {
  const owner = contract.createOwner();
  owner.dispatch({ type: "CONFLICT_CHOOSE", conflictId: "title", choice: "keep-local" });
  assert.equal(owner.getState().conflictChoices.title, "keep-local");
  const before = owner.getState();
  owner.dispatch({ type: "CONFLICT_CHOOSE", conflictId: "n0", choice: "overwrite" });
  assert.equal(owner.getState(), before);
  owner.dispatch({ type: "CONFLICT_CHOOSE_ALL", choice: "keep-both" });
  assert.deepEqual(Object.values(plain(owner.getState().conflictChoices)), ["keep-both", "keep-both", "keep-both"]);
});

for (const [name, execute] of [["resolve", contract.executeResolve], ["commit", contract.executeCommit], ["retry", contract.executeRetry]]) {
  test(`R3a import flow: ${name} reaches success through the canonical async owner`, async () => {
    const owner = contract.createOwner();
    const result = await execute(owner, ({ batchId, kind }) => ({ batchId, kind }));
    assert.equal(result.status, "success");
    assert.equal(owner.getState().phase, "result");
    assert.equal(owner.getState().pending.status, "success");
  });
}

test("R3a import flow: duplicate async activation is ignored", async () => {
  const owner = contract.createOwner();
  let finish;
  const first = contract.executeCommit(owner, () => new Promise((resolve) => { finish = resolve; }));
  const duplicate = await contract.executeCommit(owner, () => Promise.resolve());
  assert.equal(duplicate.status, "duplicate");
  finish("ok");
  assert.equal((await first).status, "success");
});

test("R3a import flow: close invalidates an in-flight completion and preserves focus return", async () => {
  const owner = contract.createOwner();
  let finish;
  const operation = contract.executeResolve(owner, () => new Promise((resolve) => { finish = resolve; }));
  assert.equal(contract.close(owner, "import-launcher").status, "cancelled");
  finish("late");
  assert.equal((await operation).status, "stale");
  assert.equal(owner.getState().closed, true);
  assert.equal(owner.getState().focusReturnKey, "import-launcher");
  assert.equal(contract.close(owner, "other").status, "closed");
});

test("R3a import flow: async failure is owned and retry can recover", async () => {
  const owner = contract.createOwner();
  const failed = await contract.executeCommit(owner, () => Promise.reject(new Error("disk full")));
  assert.equal(failed.status, "failed");
  assert.equal(owner.getState().error, "disk full");
  const retried = await contract.executeRetry(owner, () => Promise.resolve("ok"));
  assert.equal(retried.status, "success");
  assert.equal(owner.getState().error, null);
});

test("R3a import flow: subscribers observe real reducer transitions and can unsubscribe", () => {
  const owner = contract.createOwner();
  const actions = [];
  const unsubscribe = owner.subscribe((_next, _previous, action) => actions.push(action.type));
  owner.dispatch({ type: "ITEM_TOGGLE", itemId: "rain-night" });
  unsubscribe();
  owner.dispatch({ type: "ITEM_TOGGLE", itemId: "old-book-scan" });
  assert.deepEqual(actions, ["ITEM_TOGGLE"]);
});
