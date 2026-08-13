import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
function fresh() {
  const window = { localStorage: { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = v; } }, ReaderShellKit: { icon: () => "", renderMainTabShell: (c) => c.contentHtml || "", renderSettingsShell: (c) => c.contentHtml || "", renderLibraryShell: (c) => c.contentHtml || "" } };
  const ctx = vm.createContext({ window, module: { exports: {} }, Promise, setTimeout, JSON });
  new vm.Script(readFileSync(join(root, "control-identity-declarations.js"), "utf8")).runInContext(ctx);
  new vm.Script(readFileSync(join(root, "renderers/d2-bookshelf-discover-renderers.js"), "utf8")).runInContext(ctx);
  return window.ReaderD2BookshelfDiscoverRenderers.bookshelf;
}

test("R2b view reducer accepts cover/list and rejects invalid values", () => { const b=fresh(); b.dispatch({type:"VIEW_SET",view:"list"}); assert.equal(b.getState().view,"list"); const s=b.getState(); b.dispatch({type:"VIEW_SET",view:"tiles"}); assert.equal(b.getState(),s); });
test("R2b group reducer validates business options", () => { const b=fresh(); b.dispatch({type:"GROUP_SELECT",value:"追更"}); assert.equal(b.getState().group,"追更"); const s=b.getState(); b.dispatch({type:"GROUP_SELECT",value:"未知"}); assert.equal(b.getState(),s); });
test("R2b sort reducer validates business options", () => { const b=fresh(); b.dispatch({type:"SORT_SELECT",value:"作者"}); assert.equal(b.getState().sort,"作者"); });
test("R2b filter reducer validates business options", () => { const b=fresh(); b.dispatch({type:"FILTER_SELECT",value:"未读"}); assert.equal(b.getState().filter,"未读"); });
test("R2b search set and clear preserve focus return", () => { const b=fresh(); b.dispatch({type:"SEARCH_SET",value:"三体"}); assert.equal(b.getState().search,"三体"); b.dispatch({type:"SEARCH_CLEAR"}); assert.equal(b.getState().search,""); assert.equal(b.getState().focusReturnKey,"search-toggle"); });
test("R2b filter and more disclosures are mutually exclusive", () => { const b=fresh(); b.dispatch({type:"FILTER_TOGGLE"}); assert.equal(b.getState().filterOpen,true); b.dispatch({type:"MORE_OPEN"}); assert.equal(b.getState().filterOpen,false); assert.equal(b.getState().moreOpen,true); b.dispatch({type:"MORE_CLOSE"}); assert.equal(b.getState().moreOpen,false); });
test("R2b load start has duplicate-click guard", () => { const b=fresh(); b.dispatch({type:"LOAD_RETRY_START"}); const s=b.getState(); b.dispatch({type:"LOAD_RETRY_START"}); assert.equal(b.getState(),s); });
test("R2b load success has stale async guard", () => { const b=fresh(); const s=b.getState(); b.dispatch({type:"LOAD_RETRY_SUCCESS"}); assert.equal(b.getState(),s); b.dispatch({type:"LOAD_RETRY_START"}); b.dispatch({type:"LOAD_RETRY_SUCCESS"}); assert.equal(b.getState().loadStatus,"success"); });
test("R2b load failure records an error", () => { const b=fresh(); b.dispatch({type:"LOAD_RETRY_START"}); b.dispatch({type:"LOAD_RETRY_FAILED",error:"读取失败"}); assert.equal(b.getState().error,"读取失败"); });
test("R2b network success exits offline mode", () => { const b=fresh(); b.dispatch({type:"OFFLINE_SET",value:true}); b.dispatch({type:"NETWORK_RETRY_START"}); b.dispatch({type:"NETWORK_RETRY_SUCCESS"}); assert.equal(b.getState().offline,false); });
test("R2b network failure keeps offline mode", () => { const b=fresh(); b.dispatch({type:"OFFLINE_SET",value:true}); b.dispatch({type:"NETWORK_RETRY_START"}); b.dispatch({type:"NETWORK_RETRY_FAILED",error:"无网络"}); assert.equal(b.getState().offline,true); assert.equal(b.getState().error,"无网络"); });
test("R2b async load helper resolves success", async () => { const b=fresh(); assert.equal((await b.executeLoadRetry({delay:0})).ok,true); assert.equal(b.getState().loadStatus,"success"); });
test("R2b async network helper resolves failure", async () => { const b=fresh(); assert.equal((await b.executeNetworkRetry({delay:0,simulateResult:"failed"})).ok,false); assert.equal(b.getState().networkStatus,"failed"); });
test("R2b subscribers observe accepted actions only", () => { const b=fresh(); let n=0; const off=b.subscribe(()=>n++); b.dispatch({type:"VIEW_SET",view:"list"}); b.dispatch({type:"VIEW_SET",view:"list"}); off(); b.dispatch({type:"VIEW_SET",view:"cover"}); assert.equal(n,1); });
test("R2b persisted state excludes transient loading domains", () => { const b=fresh(); b.dispatch({type:"VIEW_SET",view:"list"}); const value=JSON.stringify(b.getState()); assert.match(value,/"view":"list"/); assert.equal(b.defaults().loadStatus,"idle"); });
