import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");
const declarations = createRequire(import.meta.url)(join(demoRoot, "control-identity-declarations.js")).CANONICAL_CONTROL_DECLARATIONS;

test("retired standalone import declarations are absent from the canonical identity artifact", () => {
  assert.equal(declarations.filter((entry) => entry.source === "import-conflict-action").length, 0);
  assert.equal(declarations.filter((entry) => entry.pageFamily === "import-conflict-resolve").length, 0);
});

test("retired standalone import code and contract are absent from production loading", () => {
  const index = readFileSync(join(demoRoot, "index.html"), "utf8");
  const runtime = readFileSync(join(demoRoot, "render-runtime.js"), "utf8");
  const inventory = readFileSync(join(demoRoot, "../tools/interaction-inventory/interaction-inventory-lib.mjs"), "utf8");
  assert.doesNotMatch(index, /import-runtime-contract|w1-import-renderers/);
  assert.doesNotMatch(inventory, /import-runtime-contract|w1-import-renderers/);
  assert.doesNotMatch(runtime, /w1ImportPhaseBreadcrumb|w1ImportStateCard|ReaderImportRuntimeContract/);
});

test("canonical local import identity remains in the Bookshelf component family", () => {
  const bookshelfEntries = declarations.filter((entry) => entry.pageFamily === "bookshelf");
  assert.ok(bookshelfEntries.some((entry) => /local-import/.test(`${entry.settingsKey || ""} ${entry.controlKey || ""}`)));
  assert.ok(bookshelfEntries.every((entry) => entry.source !== "import-conflict-action"));
});
