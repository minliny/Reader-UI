import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..", "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function loadRuntime() {
  let timerSequence = 0;
  let now = 0;
  const window = {
    setTimeout() { return ++timerSequence; },
    clearTimeout() {},
    performance: { now() { now += 1; return now; } },
    matchMedia() { return { matches: false }; }
  };
  const context = vm.createContext({ window });
  vm.runInContext(read("frontend-demo-optimized/motion-contract-registry.js"), context);
  vm.runInContext(read("frontend-demo-optimized/motion-controller.js"), context);
  vm.runInContext(read("frontend-demo-optimized/motion-scenario-harness.js"), context);
  return window;
}

test("unified harness registers the exact ten Motion Reference families", () => {
  const window = loadRuntime();
  const families = window.ReaderMotionScenarioHarness.families;
  assert.equal(families.length, 10);
  assert.equal(new Set(families.map((family) => family.id)).size, 10);
  assert.deepEqual(
    JSON.parse(JSON.stringify(families.filter((family) => !family.production).map((family) => family.id))),
    ["capsule-anchor-reserved"],
  );
  for (const family of families) {
    assert.ok(window.ReaderMotionContractRegistry.specFor(family.primaryId), family.primaryId);
    assert.ok(window.ReaderMotionContractRegistry.specFor(family.oppositeId), family.oppositeId);
    assert.deepEqual(JSON.parse(JSON.stringify(family.viewports)), ["phone", "compact", "tablet"]);
  }
});

test("ten families execute normal, repeat, opposite, interrupt, and reduced traces deterministically", () => {
  const window = loadRuntime();
  const controller = window.ReaderMotionController.create({});
  const harness = window.ReaderMotionScenarioHarness.create({ controller });
  const traces = harness.runSuite();

  assert.equal(traces.length, 50);
  assert.ok(traces.every((trace) => trace.passed));
  assert.equal(traces.filter((trace) => trace.status === "reserved").length, 5);
  assert.equal(traces.filter((trace) => trace.status === "executed").length, 45);
  assert.ok(traces.filter((trace) => trace.status === "executed").every((trace) => trace.events.length >= 2));
  assert.ok(traces.filter((trace) => trace.mode === "reduced" && trace.status === "executed").every((trace) => trace.reducedMotion));
  assert.equal(controller.getSnapshot().active, null);
});

test("all four canonical interrupt policies have deterministic terminal traces", () => {
  const window = loadRuntime();
  const controller = window.ReaderMotionController.create({});
  const harness = window.ReaderMotionScenarioHarness.create({ controller });
  const traces = harness.runInterruptPolicySuite();

  assert.deepEqual(
    JSON.parse(JSON.stringify(traces.map((trace) => trace.policy))),
    ["completeThenReplace", "redirect", "cancel", "updateInSameHost"],
  );
  assert.ok(traces.every((trace) => trace.passed));
  assert.ok(traces.every((trace) => trace.events.some((event) => event.type === "start")));
});

test("reduced motion zeros decorative motion but preserves direct manipulation timing", () => {
  const window = loadRuntime();
  const controller = window.ReaderMotionController.create({});

  const decorative = controller.start({ id: "overlay.sheet.enter", reducedMotion: true });
  assert.equal(decorative.duration, 0);
  assert.equal(decorative.reason, "reduced-motion");

  const direct = controller.start({ id: "slider.drag.release", reducedMotion: true });
  assert.equal(direct.canonicalSpec.reducedMotionPolicy, "keepDirectManipulation");
  assert.equal(direct.duration, 120);
  assert.equal(direct.reducedMotion, true);
  controller.settle(direct, "test-complete");
});

test("request-first dispatch resolves through canonical policy and unknown requests fail closed", () => {
  const window = loadRuntime();
  const controller = window.ReaderMotionController.create({});

  const resolved = controller.start({ request: { operation: "push", containerRole: "appShell" } });
  assert.equal(resolved.id, "app.route.push.forward");
  assert.equal(resolved.resolution.policyId, "route-push-default");
  controller.settle(resolved, "test-complete");

  const unknown = controller.start({ request: { operation: "update" } });
  assert.equal(unknown.id, "motion.unknown");
  assert.equal(unknown.contract, null);
  assert.equal(unknown.canonicalSpec, null);
  assert.equal(unknown.resolution.diagnostic, "motion.policy.no-match");
  controller.settle(unknown, "test-complete");
});
