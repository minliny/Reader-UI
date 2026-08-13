// Bookshelf VC3 — static Figma parity guard.
//
// Scope: the approved default Cover masters only. The live Figma source has
// Phone and Tablet Cover cards, but no Tablet List or additional business-flow
// state masters. This test therefore guards the canvas and shell geometry
// without extending the renderer's state surface.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const demoRoot = join(repoRoot, "frontend-demo-optimized");
const stylesSource = readFileSync(join(demoRoot, "styles/12-bookshelf-vc3.css"), "utf8");
const stylesIndex = readFileSync(join(demoRoot, "styles.css"), "utf8");

test("VC3 Bookshelf: the 760×960 correction is isolated to the canonical route", () => {
  assert.match(stylesIndex, /12-bookshelf-vc3\.css/);
  assert.match(
    stylesSource,
    /data-current-route="bookshelf"\]\[data-viewport-class="expanded-width"\][\s\S]*--fd-runtime-phone-width: min\(760px, 100vw\);[\s\S]*--fd-runtime-phone-height: min\(960px, 100vh\);/
  );
  assert.doesNotMatch(stylesSource, /\.fd-demo\[data-viewport-class="expanded-width"\](?!\[data-current-route="bookshelf"\])/);
});

test("VC3 Bookshelf: Tablet uses the attached main-tab shell dimensions", () => {
  assert.match(stylesSource, /--fd-tablet-main-nav-width: 82px;/);
  assert.match(stylesSource, /--fd-tablet-main-nav-gap: 18px;/);
  assert.match(stylesSource, /--fd-tablet-main-nav-item-height: 58px;/);
  assert.match(stylesSource, /margin-left: calc\(var\(--fd-tablet-main-nav-width\) \+ var\(--fd-tablet-main-nav-gap\)\);/);
  assert.match(stylesSource, /left: 16px;[\s\S]*top: 50%;[\s\S]*grid-auto-rows: var\(--fd-tablet-main-nav-item-height\);/);
});

test("VC3 Bookshelf: the correction adds no state-specific layout surface", () => {
  assert.doesNotMatch(stylesSource, /fd-bookshelf-(?:list|empty|offline|loading|error|search|menu)|is-list-view|data-bookshelf-/);
  assert.doesNotMatch(stylesSource, /data-route(?:=|\s*\*=)/);
});
