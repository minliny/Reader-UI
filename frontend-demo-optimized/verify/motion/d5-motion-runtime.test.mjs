import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const rendererSource = readFileSync(
  join(repoRoot, "frontend-demo-optimized", "renderers", "d5-motion-closure-renderers.js"),
  "utf8"
);
const motionSchema = JSON.parse(readFileSync(join(repoRoot, "contracts", "motion.schema.json"), "utf8"));
const motionFixtures = JSON.parse(readFileSync(join(repoRoot, "contracts", "fixtures", "motion.fixtures.json"), "utf8"));
const fixtureById = new Map(motionFixtures.map((fixture) => [fixture.id, fixture]));
const pilotIds = [
  "bookshelf.view.switch",
  "reader.control.show",
  "reader.control.hide",
  "reader.quick.promote",
  "reader.module.switch",
  "reader.panel.expand",
  "reader.panel.collapse"
];

function loadRuntime() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(rendererSource, context);
  return context.window.ReaderD5MotionClosureRenderers;
}

test("D5 runtime registry covers exactly the 95 canonical MotionIds", () => {
  const runtime = loadRuntime();
  assert.deepEqual(
    JSON.parse(JSON.stringify(runtime.getAllMotionIds())).sort(),
    [...motionSchema.properties.id.enum].sort()
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(runtime.verifyClosureChecklist())),
    { passed: true, missing: [] }
  );
});

test("D5 MR0 pilot metadata is byte-serializable parity with MotionSpec fixtures", () => {
  const runtime = loadRuntime();
  for (const id of pilotIds) {
    const runtimeSpec = JSON.parse(JSON.stringify(runtime.getMotionMeta(id)));
    assert.deepEqual(runtimeSpec, fixtureById.get(id), `${id} runtime metadata drifted from canonical fixture`);
  }
});
