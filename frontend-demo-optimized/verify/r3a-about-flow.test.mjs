import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rendererSource = readFileSync(join(root, "renderers/d2-settings-sync-renderers.js"), "utf8");
const declarationSource = readFileSync(join(root, "control-identity-declarations.js"), "utf8");

test("withdrawn About family has no R2b state owner or async executor", () => {
  assert.doesNotMatch(rendererSource, /d2About|D2_ABOUT_|executeUpdateCheck|executeExternalAction/);
});

test("withdrawn About family has no renderer or integration-map owner", () => {
  assert.doesNotMatch(rendererSource, /aboutScreenV2|["']about(?:-feedback|-version)?["']\s*:\s*["']aboutScreenV2/);
});

test("withdrawn About family contributes no canonical control declarations", () => {
  assert.doesNotMatch(declarationSource, /source:\s*["']about-action["']|about\.control\./);
});
