import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const contract = createRequire(import.meta.url)(join(here, "..", "discover-runtime-contract.js"));
const plain = (value) => JSON.parse(JSON.stringify(value));

test("R3a Discover flow: owner starts with stable business IDs", () => {
  const state = plain(contract.createOwner().getState());
  assert.equal(state.selectedEntryId, "ranking");
  assert.equal(state.selectedSourceId, "youshu");
  assert.equal(state.selectedFilterId, "male");
  assert.equal(state.selectedSortId, "popularity");
});

test("R3a Discover flow: entry and book selection accept only stable IDs", () => {
  const owner = contract.createOwner();
  owner.dispatch({ type: "ENTRY_SELECT", entryId: "booklist", focusReturnKey: "entry-booklist" });
  owner.dispatch({ type: "BOOK_SELECT", bookId: "three-body", focusReturnKey: "book-three-body" });
  assert.equal(owner.getState().selectedEntryId, "booklist");
  assert.equal(owner.getState().selectedBookId, "three-body");
  const before = owner.getState();
  owner.dispatch({ type: "BOOK_SELECT", bookId: "n0" });
  assert.equal(owner.getState(), before);
});

test("R3a Discover flow: source filter and sort selection validate canonical IDs", () => {
  const owner = contract.createOwner();
  owner.dispatch({ type: "SOURCE_SELECT", sourceId: "qidian-import" });
  owner.dispatch({ type: "FILTER_SELECT", filterId: "category" });
  owner.dispatch({ type: "SORT_SELECT", sortId: "update" });
  assert.equal(owner.getState().selectedSourceId, "qidian-import");
  assert.equal(owner.getState().selectedFilterId, "category");
  assert.equal(owner.getState().selectedSortId, "update");
  const before = owner.getState();
  owner.dispatch({ type: "SOURCE_SELECT", sourceId: "source-0" });
  assert.equal(owner.getState(), before);
});

for (const [name, execute] of [["refresh", contract.executeRefresh], ["load-more", contract.executeLoadMore], ["retry", contract.executeRetry]]) {
  test(`R3a Discover flow: ${name} completes through the canonical async owner`, async () => {
    const owner = contract.createOwner();
    const page = owner.getState().page;
    const result = await execute(owner, ({ kind }) => kind);
    assert.equal(result.status, "success");
    assert.equal(owner.getState().phase, "ready");
    assert.equal(owner.getState().request.status, "success");
    assert.equal(owner.getState().page, name === "load-more" ? page + 1 : page);
  });
}

test("R3a Discover flow: duplicate activation is ignored", async () => {
  const owner = contract.createOwner();
  let finish;
  const first = contract.executeRefresh(owner, () => new Promise((resolve) => { finish = resolve; }));
  assert.equal((await contract.executeLoadMore(owner, () => Promise.resolve())).status, "duplicate");
  finish("ok");
  assert.equal((await first).status, "success");
});

test("R3a Discover flow: close invalidates stale completion and retains exact focus", async () => {
  const owner = contract.createOwner();
  let finish;
  const operation = contract.executeRefresh(owner, () => new Promise((resolve) => { finish = resolve; }));
  assert.equal(contract.close(owner, "discover-launcher").status, "cancelled");
  finish("late");
  assert.equal((await operation).status, "stale");
  assert.equal(owner.getState().focusReturnKey, "discover-launcher");
  assert.equal(contract.close(owner, "other").status, "closed");
});

test("R3a Discover flow: failure is retained and retry recovers", async () => {
  const owner = contract.createOwner();
  assert.equal((await contract.executeRefresh(owner, () => Promise.reject(new Error("offline")))).status, "failed");
  assert.equal(owner.getState().error, "offline");
  assert.equal((await contract.executeRetry(owner, () => Promise.resolve())).status, "success");
  assert.equal(owner.getState().error, null);
});

test("R3a Discover flow: subscribers observe accepted reducer transitions only", () => {
  const owner = contract.createOwner();
  const actions = [];
  const unsubscribe = owner.subscribe((_next, _previous, action) => actions.push(action.type));
  owner.dispatch({ type: "ENTRY_SELECT", entryId: "category" });
  owner.dispatch({ type: "ENTRY_SELECT", entryId: "ordinal-2" });
  unsubscribe();
  owner.dispatch({ type: "SORT_SELECT", sortId: "words" });
  assert.deepEqual(actions, ["ENTRY_SELECT"]);
});
