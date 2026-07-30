import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");
const runtime = readFileSync(join(demoRoot, "render-runtime.js"), "utf8");
const bookshelf = readFileSync(join(demoRoot, "renderers/d2-bookshelf-discover-renderers.js"), "utf8");

test("local import flow is owned only by the in-place Bookshelf three-state dialog", () => {
  assert.match(bookshelf, /function localImportPopupV2\(/);
  assert.match(bookshelf, /localImportPhase === "selection"/);
  assert.match(bookshelf, /localImportPhase === "importing"/);
  assert.match(bookshelf, /"is-result"/);
  assert.doesNotMatch(runtime, /function import(?:PermissionDenied|FormatUnsupported|EmptyFile|Parsing|Duplicate|ConflictResolve|PartialSuccess|ResultDetail)Screen\(/);
});

test("old standalone import workflow cannot re-enter through a generic runtime owner", () => {
  assert.doesNotMatch(runtime, /ReaderImportRuntimeContract|w1ImportPhaseBreadcrumb|w1ImportStateCard/);
  assert.match(runtime, /local-import route is retired: open the canonical in-place local import dialog/);
});
