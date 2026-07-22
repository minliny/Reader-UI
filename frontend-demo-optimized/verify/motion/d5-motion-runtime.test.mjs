import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const rendererSource = readFileSync(
  join(repoRoot, "frontend-demo-optimized", "renderers", "d5-motion-closure-renderers.js"),
  "utf8"
);
const registrySource = readFileSync(
  join(repoRoot, "frontend-demo-optimized", "motion-contract-registry.js"),
  "utf8"
);
const motionSchema = JSON.parse(readFileSync(join(repoRoot, "contracts", "motion.schema.json"), "utf8"));
const contractVersion = JSON.parse(readFileSync(join(repoRoot, "contracts", "VERSION.json"), "utf8")).version;
const motionFixtures = JSON.parse(readFileSync(join(repoRoot, "contracts", "fixtures", "motion.fixtures.json"), "utf8"));
const fixtureById = new Map(motionFixtures.map((fixture) => [fixture.id, fixture]));

function loadRuntime() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(registrySource, context);
  vm.runInContext(rendererSource, context);
  return context.window.ReaderD5MotionClosureRenderers;
}

test("generated browser MotionSpec/Policy registry is current", () => {
  const result = spawnSync(
    process.execPath,
    ["tools/motion/generate-demo-motion-registry.mjs", "--check"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS specs=95 policies=53/);
});

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

test("D5 runtime consumes exact canonical metadata for all MotionSpec fixtures", () => {
  const runtime = loadRuntime();
  for (const id of motionSchema.properties.id.enum) {
    const runtimeSpec = JSON.parse(JSON.stringify(runtime.getMotionMeta(id)));
    assert.deepEqual(runtimeSpec, fixtureById.get(id), `${id} runtime metadata drifted from canonical fixture`);
  }
});

test("browser resolver preserves canonical priority, route-shell lookup, and no-match diagnostics", () => {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(registrySource, context);
  const registry = context.window.ReaderMotionContractRegistry;

  assert.equal(registry.version, contractVersion);
  assert.equal(registry.specs.length, 95);
  assert.equal(registry.policies.length, 53);
  assert.deepEqual(
    JSON.parse(JSON.stringify(registry.resolveMotionWithDiagnostic({
      fromRoute: "bookshelf",
      toRoute: "reader",
      operation: "push",
      sourceRole: "bookCover",
      targetRole: "readerSurface",
    }))),
    { motionId: "reader.entry.coverToImmersive", policyId: "bookshelf-cover-to-reader" },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(registry.resolveMotionWithDiagnostic({ operation: "update" }))),
    { diagnostic: "motion.policy.no-match" },
  );
});
