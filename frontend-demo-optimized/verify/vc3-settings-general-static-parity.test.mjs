// Settings General VC3 — canonical Figma static parity guard.
//
// Scope: approved page-root geometry and controls only. The Figma master does
// not define a Select menu or any confirmation/permission dialog, so this test
// deliberately verifies that the D2 renderer does not invent either surface.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";

const repoRoot = process.cwd();
const demoRoot = join(repoRoot, "frontend-demo-optimized");
const rendererSource = readFileSync(join(demoRoot, "renderers/d2-settings-sync-renderers.js"), "utf8");
const runtimeSource = readFileSync(join(demoRoot, "render-runtime.js"), "utf8");
const stylesSource = readFileSync(join(demoRoot, "styles/10-settings-general-vc3.css"), "utf8");
const stylesIndex = readFileSync(join(demoRoot, "styles.css"), "utf8");
const indexHtml = readFileSync(join(demoRoot, "index.html"), "utf8");
const kitSource = readFileSync(join(demoRoot, "shared-shell-kit/kit.js"), "utf8");
const appearanceSource = readFileSync(join(demoRoot, "appearance-spec.js"), "utf8");
const declarationsSource = readFileSync(join(demoRoot, "control-identity-declarations.js"), "utf8");

function freshRenderers() {
  const storage = {};
  const window = {
    ReaderFrontendDemoDraftShellKit: undefined,
    ReaderAppearanceSpec: undefined,
    ReaderControlIdentityDeclarations: undefined,
    localStorage: {
      getItem(key) { return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null; },
      setItem(key, value) { storage[key] = String(value); },
      removeItem(key) { delete storage[key]; }
    }
  };
  const ctx = vm.createContext({ window, module: { exports: {} }, Promise, setTimeout });
  new vm.Script(kitSource).runInContext(ctx);
  new vm.Script(appearanceSource).runInContext(ctx);
  new vm.Script(declarationsSource).runInContext(ctx);
  new vm.Script(rendererSource).runInContext(ctx);
  return ctx.window.ReaderD2SettingsSyncRenderers;
}

test("VC3 Settings General: only the canonical route receives the scoped 390×844/760×960 frame class", () => {
  const renderers = freshRenderers();
  const settingsHtml = renderers.globalSettingsV2({}, "settings-general", {});
  const otherSettingsHtml = renderers.globalSettingsV2({}, "settings-network", {});

  assert.match(settingsHtml, /fd-settings-phone fd-d2-settings-phone fd-settings-general-phone/);
  assert.doesNotMatch(otherSettingsHtml, /fd-settings-general-phone/);
  assert.equal((settingsHtml.match(/fd-settings-segment-hit/g) || []).length, 3);
});

test("VC3 Settings General: renderer retains direct controls but does not synthesize unapproved transient surfaces", () => {
  const html = freshRenderers().globalSettingsV2({}, "settings-general", {});

  assert.match(html, /data-ui-event="toggle\.switch"/);
  assert.match(html, /data-ui-event="segment\.item\.switch"/);
  assert.doesNotMatch(html, /fd-settings-option-dropdown/);
  assert.doesNotMatch(html, /fd-demo-dialog/);
  assert.doesNotMatch(html, /fd-demo-sheet/);
});

test("VC3 Settings General: canonical visual geometry is isolated and shadow-free", () => {
  assert.match(stylesIndex, /10-settings-general-vc3\.css/);
  assert.match(stylesSource, /\.fd-settings-general-phone \{[\s\S]*height: var\(--fd-runtime-phone-height\);[\s\S]*box-shadow: none;/);
  assert.match(stylesSource, /data-viewport-class="expanded-width"\][\s\S]*--fd-runtime-phone-width: min\(760px, 100vw\);[\s\S]*--fd-runtime-phone-height: min\(960px, 100vh\);/);
  assert.match(stylesSource, /\.fd-settings-general-phone \.fd-phone-content \{[\s\S]*padding: 8px 19px 12px;/);
  assert.match(stylesSource, /width: 168px;[\s\S]*height: 36px;/);
  assert.match(stylesSource, /width: 54px;[\s\S]*height: 44px;/);
  assert.match(stylesSource, /width: 104px;[\s\S]*max-width: 104px;/);
  assert.match(stylesSource, /width: 44px;[\s\S]*height: 44px;/);
  assert.match(stylesSource, /width: 55px;[\s\S]*min-height: 44px;/);
  assert.match(indexHtml, /family=Inter:wght@400;700;800;900/);
});

test("VC3 Settings General: runtime bridges direct Figma controls to the D2 owner and blocks legacy overlays", () => {
  assert.match(runtimeSource, /const settingsGeneralOwner = window\.ReaderD2SettingsSyncRenderers\?\.settingsGeneral;/);
  assert.match(runtimeSource, /\[data-ui-event="toggle\.switch"\]\[data-settings-key\]/);
  assert.match(runtimeSource, /type: "TOGGLE_SWITCH"/);
  assert.match(runtimeSource, /\[data-ui-event="segment\.item\.switch"\]\[data-settings-key\]/);
  assert.match(runtimeSource, /type: "SELECT_OPTION"/);
  assert.match(runtimeSource, /if \(isSettingsGeneralRoute\(\)\) \{[\s\S]*canonical Figma page/);
});
