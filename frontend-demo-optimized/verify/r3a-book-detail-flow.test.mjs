import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
function fresh() {
  const window = { localStorage: { getItem() { return null; }, setItem() {} } };
  const ctx = vm.createContext({ window, module: { exports: {} }, Promise, setTimeout, JSON, Map });
  for (const file of ["shared-shell-kit/kit.js", "control-identity-declarations.js", "renderers/d2-bookshelf-discover-renderers.js"]) {
    new vm.Script(readFileSync(join(root, file), "utf8")).runInContext(ctx);
  }
  return window.ReaderD2BookshelfDiscoverRenderers.bookDetail;
}

test("R2b view reducer accepts five states and rejects unknown state", () => { const b=fresh(); b.dispatch({type:"VIEW_STATE_SET",value:"offline"}); assert.equal(b.getState().viewState,"offline"); const s=b.getState(); b.dispatch({type:"VIEW_STATE_SET",value:"missing"}); assert.equal(b.getState(),s); });
test("R2b TOC mode accepts directory/bookmark only", () => { const b=fresh(); b.dispatch({type:"TOC_MODE_SET",value:"bookmark"}); assert.equal(b.getState().tocMode,"bookmark"); const s=b.getState(); b.dispatch({type:"TOC_MODE_SET",value:"all"}); assert.equal(b.getState(),s); });
test("R2b source sheet and delete dialog are mutually exclusive", () => { const b=fresh(); b.dispatch({type:"SOURCE_SHEET_OPEN"}); assert.equal(b.getState().sheetOpen,true); b.dispatch({type:"DELETE_DIALOG_OPEN"}); assert.equal(b.getState().sheetOpen,false); assert.equal(b.getState().dialogOpen,true); });
test("R2b source selection validates business values and returns focus", () => { const b=fresh(); b.dispatch({type:"SOURCE_SHEET_OPEN"}); b.dispatch({type:"SOURCE_SELECT",value:"书仓搜索"}); assert.equal(b.getState().selectedSource,"书仓搜索"); assert.equal(b.getState().sheetOpen,false); assert.equal(b.getState().focusReturnKey,"source-sheet-open"); });
test("R2b invalid source selection is rejected", () => { const b=fresh(); const s=b.getState(); b.dispatch({type:"SOURCE_SELECT",value:"未知"}); assert.equal(b.getState(),s); });
test("R2b delete start rejects closed dialog and duplicate click", () => { const b=fresh(); const s=b.getState(); b.dispatch({type:"DELETE_START"}); assert.equal(b.getState(),s); b.dispatch({type:"DELETE_DIALOG_OPEN"}); b.dispatch({type:"DELETE_START"}); const loading=b.getState(); b.dispatch({type:"DELETE_START"}); assert.equal(b.getState(),loading); });
test("R2b stale delete completion is ignored", () => { const b=fresh(); const s=b.getState(); b.dispatch({type:"DELETE_SUCCESS"}); assert.equal(b.getState(),s); });
test("R2b delete success moves to removed state", () => { const b=fresh(); b.dispatch({type:"DELETE_DIALOG_OPEN"}); b.dispatch({type:"DELETE_START"}); b.dispatch({type:"DELETE_SUCCESS"}); assert.equal(b.getState().viewState,"removed"); assert.equal(b.getState().dialogOpen,false); });
test("R2b delete failure preserves dialog and exposes retry state", () => { const b=fresh(); b.dispatch({type:"DELETE_DIALOG_OPEN"}); b.dispatch({type:"DELETE_START"}); b.dispatch({type:"DELETE_FAILED",error:"写入失败"}); assert.equal(b.getState().deleteStatus,"failed"); assert.equal(b.getState().dialogOpen,true); assert.equal(b.getState().error,"写入失败"); });
test("R2b async delete helper resolves success", async () => { const b=fresh(); b.dispatch({type:"DELETE_DIALOG_OPEN"}); assert.equal((await b.executeDelete({delay:0})).ok,true); assert.equal(b.getState().viewState,"removed"); });
test("R2b async delete helper reports duplicate request", async () => { const b=fresh(); b.dispatch({type:"DELETE_DIALOG_OPEN"}); b.dispatch({type:"DELETE_START"}); assert.equal((await b.executeDelete({delay:0})).duplicate,true); });
test("R2b network retry success restores normal detail", async () => { const b=fresh(); b.dispatch({type:"VIEW_STATE_SET",value:"offline"}); assert.equal((await b.executeNetworkRetry({delay:0})).ok,true); assert.equal(b.getState().viewState,"normal"); });
test("R2b network retry failure remains offline", async () => { const b=fresh(); assert.equal((await b.executeNetworkRetry({delay:0,simulateResult:"failed"})).ok,false); assert.equal(b.getState().viewState,"offline"); });
test("R2b TOC retry failure remains no-toc", async () => { const b=fresh(); assert.equal((await b.executeTocRetry({delay:0,simulateResult:"failed"})).ok,false); assert.equal(b.getState().viewState,"no-toc"); });
test("R2b re-add returns removed book to normal", () => { const b=fresh(); b.dispatch({type:"VIEW_STATE_SET",value:"removed"}); b.dispatch({type:"READD"}); assert.equal(b.getState().viewState,"normal"); });
test("R2b app-state injection preserves existing route truth", () => { const b=fresh(); b.injectAppState({bookDetailState:"offline",readerTocMode:"bookmark"}); assert.equal(b.getState().viewState,"offline"); assert.equal(b.getState().tocMode,"bookmark"); });
test("R2b subscribers observe accepted actions only", () => { const b=fresh(); let n=0; const off=b.subscribe(()=>n++); b.dispatch({type:"TOC_MODE_SET",value:"bookmark"}); b.dispatch({type:"TOC_MODE_SET",value:"bookmark"}); off(); b.dispatch({type:"TOC_MODE_SET",value:"directory"}); assert.equal(n,1); });
