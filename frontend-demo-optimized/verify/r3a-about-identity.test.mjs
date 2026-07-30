import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), ".."); const read = (file) => readFileSync(join(root, file), "utf8");
const rendererSource = read("renderers/d2-settings-sync-renderers.js");
const declarationSource = read("control-identity-declarations.js");
const runtimeSource = read("render-runtime.js");

test("withdrawn About page family has no D2 renderer, state owner, route binding, or declarations", () => {
  assert.doesNotMatch(rendererSource, /aboutScreenV2|D2_ABOUT_|d2About|["']about(?:-feedback|-version)?["']\s*:\s*["']aboutScreenV2/);
  assert.doesNotMatch(declarationSource, /source:\s*["']about-action["']|about\.control\./);
});

test("withdrawn About page family has no settings-home entry or generic page body", () => {
  assert.doesNotMatch(runtimeSource, /title:\s*["']关于与反馈["']|route:\s*["']about-feedback["']/);
});

test("withdrawn About routes fail closed instead of falling back to an invented page", () => {
  assert.match(runtimeSource, /route \+ ["'] was explicitly withdrawn and has no production renderer["']/);
  assert.match(runtimeSource, /feedback route was explicitly withdrawn with the About page family/);
});
