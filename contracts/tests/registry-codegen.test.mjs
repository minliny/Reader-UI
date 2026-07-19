import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const CONTRACTS_DIR = join(REPO_ROOT, "contracts");
const GENERATED_DIR = join(REPO_ROOT, "generated");

function loadJson(rel) {
  return JSON.parse(readFileSync(join(CONTRACTS_DIR, rel), "utf8"));
}

function readGenerated(rel) {
  return readFileSync(join(GENERATED_DIR, rel), "utf8");
}

function assertGeneratedExists(rel) {
  assert.ok(existsSync(join(GENERATED_DIR, rel)), `missing generated/${rel}`);
}

function stringLiteral(value) {
  return JSON.stringify(String(value));
}

const motionFixtures = loadJson("fixtures/motion.fixtures.json");
const tokenFixtures = loadJson("fixtures/token.fixtures.json");

test("MotionSpec registry is emitted for all three platforms", () => {
  for (const rel of ["swift/Motion.swift", "kotlin/Motion.kt", "arkts/Motion.ets"]) {
    assertGeneratedExists(rel);
  }

  assert.ok(readGenerated("swift/Motion.swift").includes("public enum MotionSpecRegistry"));
  assert.ok(readGenerated("kotlin/Motion.kt").includes("object MotionSpecRegistry"));
  assert.ok(readGenerated("arkts/Motion.ets").includes("motionSpecRegistry"));
});

test("MotionSpec registry includes fixture ids, token refs, guardRules, and reduced-motion data", () => {
  const required = [
    "app.firstOpen.enter",
    "reader.page.turn.next-prev",
    "reader.control.dock.drag",
    "motion.interrupt.completeThenReplace",
  ];

  for (const rel of ["swift/Motion.swift", "kotlin/Motion.kt", "arkts/Motion.ets"]) {
    const text = readGenerated(rel);
    for (const id of required) {
      assert.ok(text.includes(`"${id}"`), `${rel} missing motion fixture id ${id}`);
    }
    assert.ok(text.includes("reader.motion.duration.pageTurn"), `${rel} missing duration token ref`);
    assert.ok(text.includes("app.motion.easing.enter"), `${rel} missing easing token ref`);
    assert.ok(text.includes("guardRules"), `${rel} missing guardRules`);
    assert.ok(text.includes("reducedMotion"), `${rel} missing reducedMotion`);
    assert.ok(text.includes("forceZeroDuration"), `${rel} missing reduced-motion forceZeroDuration`);
  }
});

test("MotionSpec registry emits every current motion fixture exactly as a consumable spec source", () => {
  for (const rel of ["swift/Motion.swift", "kotlin/Motion.kt", "arkts/Motion.ets"]) {
    const text = readGenerated(rel);
    for (const fixture of motionFixtures) {
      assert.ok(text.includes(`"${fixture.id}"`), `${rel} missing motion fixture ${fixture.id}`);
      assert.ok(text.includes(String(fixture.durationMs)), `${rel} missing duration ${fixture.durationMs} for ${fixture.id}`);
      assert.ok(text.includes(`"${fixture.easing}"`), `${rel} missing easing ${fixture.easing} for ${fixture.id}`);
      assert.ok(text.includes(fixture.tokens.durationToken), `${rel} missing duration token for ${fixture.id}`);
      assert.ok(text.includes(fixture.tokens.easingToken), `${rel} missing easing token for ${fixture.id}`);
    }
  }
});

test("canonical exact state machines are emitted for all three platforms", () => {
  const exactIds = [
    "app.firstOpen.enter",
    "app.route.push.forward",
    "app.route.pop.backward",
    "app.route.replace",
    "bookshelf.view.switch",
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
    "listRow.select",
    "tab.item.press",
    "tab.item.select",
    "tab.item.switch",
    "tab.switch",
    "segment.item.switch",
    "dropdown.trigger.press",
    "dropdown.menu.expand",
    "dropdown.menu.collapse",
    "dropdown.menu.reposition",
    "dropdown.option.press",
    "dropdown.option.select",
    "reader.entry.coverToImmersive",
    "reader.entry.actionToImmersive",
    "reader.page.turn.next-prev",
    "reader.chapter.jump",
    "reader.control.handle.press",
    "reader.control.handle.drag",
    "reader.control.handle.release",
    "reader.control.dock.longPress",
    "reader.control.dock.drag",
    "reader.control.dock.release",
    "reader.control.dock.rebound",
    "reader.control.show",
    "reader.control.hide",
    "reader.quick.promote",
    "reader.module.switch",
    "reader.panel.expand",
    "reader.panel.collapse",
    "reader.session.tts.start",
    "reader.session.autoPage.start",
    "reader.session.capsule.enter",
    "reader.session.capsule.update",
    "reader.session.capsule.control.press-toggle",
    "reader.session.capsule.countdownTick",
    "reader.session.capsule.voiceIcon.active",
    "reader.session.capsule.switch",
    "reader.session.capsule.exit",
    "viewport.orientation.prepare",
    "viewport.orientation.reshape",
    "viewport.orientation.settle",
    "motion.interrupt.cancel",
    "motion.interrupt.redirect",
    "motion.interrupt.completeThenReplace",
    "source.switch.route.push",
    "source.switch.route.pop",
    "source.switch.route.replace",
    "overlay.sheet.enter",
    "overlay.sheet.exit",
    "overlay.dialog.enter",
    "overlay.dialog.exit",
    "overlay.keyboard.enter-exit",
    "state.loading.inline",
    "feedback.toast.enter",
    "feedback.toast.update",
    "feedback.toast.exit",
    "input.focus",
    "input.blur",
    "input.clear",
    "input.focus-blur",
    "input.submit",
    "search.state.replace",
    "state.content.replace",
  ];
  for (const rel of ["swift/Motion.swift", "kotlin/Motion.kt", "arkts/Motion.ets"]) {
    const text = readGenerated(rel);
    for (const id of exactIds) assert.ok(text.includes(`"${id}"`), `${rel} missing exact MotionId ${id}`);
    for (const field of ["trigger", "from", "to", "interrupt", "finalState", "cleanup"]) {
      assert.ok(text.includes(field), `${rel} missing structured field ${field}`);
    }
    for (const state of ["route.targetOnStack", "activeTab.next", "segment.next", "bookshelf.view.target", "button.commandCommitted", "toggle.nextValue", "chip.targetSelected", "slider.draggingValueUpdated", "slider.valueCommitted", "stepper.nextLegalValue", "card.targetSelected", "card.destinationRoute", "listRow.targetSelected", "immersiveReading", "page.nextOrPrevious", "chapter.target", "handlePressed", "dragOffsetPreview", "dockDragArmed", "dockOffset.previewClamped", "dockOffset.committed", "dockOffset.clamped", "immersive.hidden", "control.home", "control.quick.target", "control.full.module", "session.tts", "session.autoPage", "capsuleVisible", "session.nextState", "playing.next", "countdown.next", "ttsPlayingVisualActive", "session.nextType", "capsuleHidden", "viewportFrozen", "viewportReshaped", "viewportStable", "latestCommittedState", "motionRunningTowardNewTarget", "replacementState", "sourceSwitchRoute.onStack", "flowRoute.previousOnStack", "flowRoute.replacementTarget", "sheetVisible", "sheetHidden", "dialogVisible", "dialogHidden", "keyboardVisible", "keyboardHidden", "inlineState.loading", "toast.visible", "toastHost.singleOwner", "toast.hidden", "toastHost.empty", "input.focused", "value.empty", "submit.pending", "search.latestState", "content.latest"]) {
      assert.ok(text.includes(`"${state}"`), `${rel} missing exact state ${state}`);
    }
  }
});

test("MotionPolicy generated resolvers expose explicit no-match diagnostics and no fallback impersonation", () => {
  for (const rel of ["swift/MotionPolicy.swift", "kotlin/MotionPolicy.kt", "arkts/MotionPolicy.ets"]) {
    const text = readGenerated(rel);
    assert.ok(text.includes("motion.policy.no-match"), `${rel} missing no-match diagnostic`);
    assert.ok(text.includes("MotionResolution"), `${rel} missing MotionResolution`);
    assert.equal(text.includes("fallback-no-motion"), false, `${rel} must not emit fallback-no-motion`);
    for (const policyId of ["reader-control-show", "reader-control-hide", "reader-quick-promote", "reader-module-switch", "reader-panel-expand", "reader-panel-collapse"]) {
      assert.ok(text.includes(`"${policyId}"`), `${rel} missing explicit policy ${policyId}`);
    }
  }
});

test("TokenRegistry is emitted for all three platforms", () => {
  for (const rel of ["swift/Token.swift", "kotlin/Token.kt", "arkts/Token.ets"]) {
    assertGeneratedExists(rel);
  }

  assert.ok(readGenerated("swift/Token.swift").includes("public enum TokenRegistry"));
  assert.ok(readGenerated("kotlin/Token.kt").includes("object TokenRegistry"));
  assert.ok(readGenerated("arkts/Token.ets").includes("tokenRegistry"));
});

test("TokenRegistry includes fixture names, categories, and raw values", () => {
  const required = [
    "--fd-ds-color-paper",
    "--fd-ds-space-screen-padding",
    "--fd-ds-motion-duration-pageTurn",
    "--fd-ds-motion-easing-enter",
  ];

  for (const rel of ["swift/Token.swift", "kotlin/Token.kt", "arkts/Token.ets"]) {
    const text = readGenerated(rel);
    for (const name of required) {
      assert.ok(text.includes(`"${name}"`), `${rel} missing token fixture ${name}`);
    }
    assert.ok(text.includes("#fff8f4"), `${rel} missing color token value`);
    assert.ok(text.includes("220ms"), `${rel} missing motion duration value`);
    assert.ok(text.includes("motion-duration"), `${rel} missing token category value`);
  }
});

test("TokenRegistry emits every current token fixture", () => {
  for (const rel of ["swift/Token.swift", "kotlin/Token.kt", "arkts/Token.ets"]) {
    const text = readGenerated(rel);
    for (const fixture of tokenFixtures) {
      assert.ok(text.includes(`"${fixture.name}"`), `${rel} missing token fixture ${fixture.name}`);
      assert.ok(text.includes(stringLiteral(fixture.value)), `${rel} missing token value for ${fixture.name}`);
    }
  }
});
