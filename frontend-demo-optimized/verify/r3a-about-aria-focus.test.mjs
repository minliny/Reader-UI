import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rendererSource = readFileSync(join(root, "renderers/d2-settings-sync-renderers.js"), "utf8");
const runtimeSource = readFileSync(join(root, "render-runtime.js"), "utf8");

test("withdrawn About family exposes no focusable or external-action surface", () => {
  assert.doesNotMatch(rendererSource, /data-external-action|about-feedback-dialog-title|feedback-submit-entry|version-check-update/);
});

test("withdrawn About family is absent from settings navigation", () => {
  assert.doesNotMatch(runtimeSource, /title:\s*["']关于与反馈["']|route:\s*["']about-feedback["']/);
});

test("withdrawn About routes remain named fail-closed cases", () => {
  assert.match(runtimeSource, /case ["']about-feedback["']:/);
  assert.match(runtimeSource, /was explicitly withdrawn and has no production renderer/);
});
