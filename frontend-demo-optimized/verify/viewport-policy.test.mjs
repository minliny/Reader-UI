import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");
const repoRoot = join(demoRoot, "..");

const runtimeSource = readFileSync(join(demoRoot, "render-runtime.js"), "utf8");
const motionHarnessSource = readFileSync(join(demoRoot, "motion-scenario-harness.js"), "utf8");
const handoff = JSON.parse(readFileSync(
  join(repoRoot, "docs/design/handoffs/settings-general/LOCAL_READY_FOR_FIGMA.json"),
  "utf8",
));
const crosswalk = JSON.parse(readFileSync(
  join(repoRoot, "docs/design/handoffs/settings-general/FIGMA_F0_CROSSWALK.json"),
  "utf8",
));

test("landscape runtime resolves to Tablet and cannot emit a Compact viewport", () => {
  assert.match(runtimeSource, /const viewportClass = orientation === "landscape"\s*\? "tablet-expanded"/);
  assert.match(runtimeSource, /const viewportAtom = snapshot\.orientation === "landscape"\s*\? "tablet"/);
  assert.doesNotMatch(runtimeSource, /compact-landscape/);
});

test("Figma handoff and crosswalk expose only Phone and Tablet structures", () => {
  assert.deepEqual(handoff.viewportVerification.viewports, ["phone", "tablet"]);
  assert.deepEqual(handoff.r2aInstrumentation.viewportAttrStamping.viewportAtoms, ["phone", "tablet"]);
  assert.deepEqual(
    crosswalk.canonicalGraph.pageMasterSet.variants.map((variant) => variant.viewport),
    ["phone", "tablet"],
  );
  assert.equal(crosswalk.canonicalGraph.pageMasterSet.independentLandscapeMaster, null);
  assert.deepEqual(
    crosswalk.canonicalGraph.downstreamPrototypeInstances.map((instance) => instance.viewport),
    ["phone", "tablet"],
  );
});

test("motion scenario coverage follows the same two-viewport policy", () => {
  assert.doesNotMatch(motionHarnessSource, /\["phone",\s*"compact",\s*"tablet"\]/);
  assert.equal((motionHarnessSource.match(/\["phone",\s*"tablet"\]/g) || []).length, 10);
});
