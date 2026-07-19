import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const demoRoot = path.resolve(here, "..", "..");
const repoRoot = path.resolve(demoRoot, "..");
const runtime = fs.readFileSync(path.join(demoRoot, "render-runtime.js"), "utf8");
const controller = fs.readFileSync(path.join(demoRoot, "motion-controller.js"), "utf8");
const motionCss = fs.readFileSync(path.join(demoRoot, "motion-tokens.css"), "utf8");
const fixtures = JSON.parse(fs.readFileSync(path.join(repoRoot, "contracts", "fixtures", "motion.fixtures.json"), "utf8"));
const byId = new Map(fixtures.map((fixture) => [fixture.id, fixture]));

const exactIds = [
  "button.activate",
  "toggle.switch",
  "chip.item.select",
  "slider.drag.start",
  "slider.drag.update",
  "slider.drag.release",
  "stepper.press",
  "stepper.value.change",
  "card.press",
  "card.select",
  "card.route",
  "listRow.select"
];

test("primitive families publish canonical exact transactions", () => {
  for (const id of exactIds) {
    const fixture = byId.get(id);
    assert.ok(fixture, `${id} fixture missing`);
    for (const field of ["trigger", "from", "to", "interrupt", "finalState", "cleanup"]) {
      assert.ok(fixture[field]?.length || typeof fixture[field] === "string", `${id}.${field} missing`);
    }
    assert.match(controller, new RegExp(`"${id.replaceAll(".", "\\.")}": \\{`));
  }
  assert.equal(byId.get("slider.drag.start").durationMs, 0);
  assert.equal(byId.get("slider.drag.update").easing, "none");
  assert.ok(byId.get("slider.drag.release").cleanup.includes("slider.pointerOwnership.release"));
  assert.ok(byId.get("card.route").guardRules.includes("asyncGuard:latestIntentWins"));
  assert.equal(byId.get("stepper.value.change").finalState, "stepperLegalValueAndReadoutCommitted");
});

test("runtime owns latest primitive transaction, direct slider manipulation, and keyboard parity", () => {
  assert.match(runtime, /function attachPrimitiveExactMotionState\(/);
  assert.match(runtime, /primitiveExactMotionIds/);
  assert.match(runtime, /data-motion-primitive-sequence/);
  assert.match(runtime, /data-motion-primitive-interrupt/);
  assert.match(runtime, /data-motion-slider-owner/);
  assert.match(runtime, /data-motion-stepper-value/);
  assert.match(runtime, /keyboardAdjustBegin/);
  assert.match(runtime, /keyboardAdjustCommit/);
  assert.match(runtime, /__readerPrimitiveSliderPointer/);
  assert.match(runtime, /"card\.press\/select\/route"/);
  assert.match(runtime, /"slider\.drag\.start\/update\/release"/);
  assert.match(runtime, /\[data-restore-scopes\]:not\(\[data-restore-record\]\)/);
  assert.match(runtime, /\[data-source-index\]:not\(\[data-source-name\]\)/);
  assert.match(runtime, /nestedIds\.some\(\(id\) => ids\.includes\(id\)\)/);
});

test("primitive CSS is tokenized and keeps direct manipulation immediate", () => {
  assert.match(motionCss, /data-motion-slider-state="dragging"/);
  assert.match(motionCss, /transition-duration: 0ms !important/);
  assert.match(motionCss, /data-motion-stepper-id="stepper\.value\.change"/);
  assert.match(motionCss, /--fd-motion-effective-numeric/);
  assert.match(motionCss, /data-motion-primitive-id[\s\S]*animation: none !important/);
});
