import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sources = ["shared-shell-kit/kit.js", "appearance-spec.js", "control-identity-declarations.js", "renderers/d2-settings-sync-renderers.js"].map((file) => readFileSync(join(root, file), "utf8"));
function fresh() { const window = { localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, ReaderFrontendDemoDraftRouteContract: { routes: {}, routePresentation: {} } }; const context = vm.createContext({ window, module: { exports: {} }, Promise, setTimeout }); sources.forEach((source) => new vm.Script(source).runInContext(context)); const api = window.ReaderD2SettingsSyncRenderers; api.syncBackup.initState(); return api; }

test("R2b state owner covers connection, sync, manual backup, history, and remote list", () => {
  const state = fresh().syncBackup.getState();
  for (const key of ["connection", "sync", "manualBackup", "history", "remoteList"]) assert.ok(state[key]);
});

test("R2b value reducer supports inputs, toggles, selects, and bounded stepper", () => {
  const api = fresh(); api.syncBackup.dispatch({ type: "SET_VALUE", settingsKey: "frequency", value: "每周" }); api.syncBackup.dispatch({ type: "TOGGLE_VALUE", settingsKey: "wifiOnly", value: false });
  for (let index = 0; index < 50; index += 1) api.syncBackup.dispatch({ type: "STEP_RETAIN", delta: 1 });
  assert.equal(api.syncBackup.getState().values.frequency, "每周"); assert.equal(api.syncBackup.getState().values.wifiOnly, false); assert.equal(api.syncBackup.getState().values.retainCount, 30);
});

test("R2b manual backup confirm and cancel remain in canonical owner", () => { const api = fresh(); api.syncBackup.dispatch({ type: "MANUAL_BACKUP_OPEN" }); assert.equal(api.syncBackup.getState().manualBackup.status, "confirm"); assert.match(api.renderD2Route("backup-settings", {}, {}), /role="dialog"/); api.syncBackup.dispatch({ type: "MANUAL_BACKUP_CANCEL" }); assert.equal(api.syncBackup.getState().manualBackup.status, "cancelled"); });

test("R2b history changes view state without orphan route", () => { const api = fresh(); api.syncBackup.dispatch({ type: "HISTORY_OPEN" }); assert.equal(api.syncBackup.getState().history.status, "history"); api.syncBackup.dispatch({ type: "HISTORY_CLOSE" }); assert.equal(api.syncBackup.getState().history.status, "summary"); });

test("R2b each async lane completes through the same guarded owner", async () => {
  const api = fresh();
  for (const name of ["executeConnectionTest", "executeSync", "executeManualBackup", "executeHistoryCleanup", "executeRemoteRefresh"]) {
    const result = await api.syncBackup[name](() => true); assert.equal(result.status, "success", name);
  }
});

test("R2b duplicate click is rejected while a request is pending", async () => {
  const api = fresh(); let release; const pending = api.syncBackup.executeSync(() => new Promise((resolve) => { release = resolve; })); await Promise.resolve();
  const duplicate = await api.syncBackup.executeManualBackup(() => true); assert.equal(duplicate.status, "duplicate"); release(true); assert.equal((await pending).status, "success");
});

test("R2b cancellation invalidates an in-flight completion as stale", async () => {
  const api = fresh(); let release; const pending = api.syncBackup.executeRemoteRefresh(() => new Promise((resolve) => { release = resolve; })); await Promise.resolve();
  assert.equal(api.syncBackup.cancel().status, "cancelled"); release(true); assert.equal((await pending).status, "stale"); assert.equal(api.syncBackup.getState().remoteList.status, "cancelled");
});

test("R2b failed async operation retains an accessible error", async () => { const api = fresh(); const result = await api.syncBackup.executeConnectionTest(() => { throw new Error("network down"); }); assert.equal(result.status, "failed"); assert.equal(api.syncBackup.getState().connection.error, "network down"); });

test("R2b subscribe observes a single canonical dispatch stream", () => { const api = fresh(); const actions = []; const stop = api.syncBackup.subscribe((_next, _prev, action) => actions.push(action.type)); api.syncBackup.dispatch({ type: "TOGGLE_VALUE", settingsKey: "autoEnabled" }); stop(); api.syncBackup.dispatch({ type: "TOGGLE_VALUE", settingsKey: "autoEnabled" }); assert.deepEqual(actions, ["TOGGLE_VALUE"]); });
