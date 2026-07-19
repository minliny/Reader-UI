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
const fixtures = JSON.parse(fs.readFileSync(path.join(repoRoot, "contracts", "fixtures", "motion.fixtures.json"), "utf8"));
const byId = new Map(fixtures.map((fixture) => [fixture.id, fixture]));

const dropdownIds = [
  "dropdown.trigger.press",
  "dropdown.menu.expand",
  "dropdown.menu.collapse",
  "dropdown.menu.reposition",
  "dropdown.option.press",
  "dropdown.option.select"
];

test("dropdown family has canonical exact transactions and cleanup", () => {
  for (const id of dropdownIds) {
    const fixture = byId.get(id);
    assert.ok(fixture, `${id} fixture missing`);
    for (const field of ["trigger", "from", "to", "interrupt", "finalState", "cleanup"]) {
      assert.ok(fixture[field]?.length || typeof fixture[field] === "string", `${id}.${field} missing`);
    }
    assert.match(controller, new RegExp(`"${id.replaceAll(".", "\\.")}": \\{`));
  }
  assert.equal(byId.get("dropdown.menu.expand").finalState, "openAtLegalAnchor");
  assert.ok(byId.get("dropdown.menu.expand").cleanup.includes("focus.dropdownFirstOption.commit"));
  assert.equal(byId.get("dropdown.menu.collapse").finalState, "closedAndFocusReturnedToTrigger");
  assert.ok(byId.get("dropdown.menu.collapse").cleanup.includes("focus.dropdownTrigger.restore"));
  assert.equal(byId.get("dropdown.menu.reposition").trigger[0], "viewport.orientation.reshape");
  assert.equal(byId.get("dropdown.option.select").finalState, "valueAndSemanticsCommitted");
});

test("dropdown runtime exposes takeover, reposition, focus and keyboard ownership", () => {
  assert.match(runtime, /function startDropdownSwitchMotion\(/);
  assert.match(runtime, /function startDropdownRepositionMotion\(/);
  assert.match(runtime, /id: "dropdown\.menu\.reposition"/);
  assert.match(runtime, /data-motion-dropdown-reposition-from/);
  assert.match(runtime, /data-motion-dropdown-reposition-to/);
  assert.match(runtime, /function applyDropdownFocusRequest\(/);
  assert.match(runtime, /focus\.dropdownFirstOption|kind: wasOpen \? "trigger" : "menu"/);
  assert.match(runtime, /function bindDropdownMenuKeyboard\(/);
  assert.match(runtime, /event\.key === "Escape"/);
  assert.match(runtime, /"ArrowDown", "ArrowUp", "Home", "End", "Tab"/);
  assert.match(runtime, /setAttribute\("aria-haspopup", "menu"\)/);
  assert.match(runtime, /setAttribute\("aria-expanded", open \? "true" : "false"\)/);
  assert.match(runtime, /attachDropdownMotionState\(screenHost, appState, motionController\)/);
});

