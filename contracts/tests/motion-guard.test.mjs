import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./mini-validator.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACTS_DIR = join(__dirname, "..");

function loadJson(rel) {
  return JSON.parse(readFileSync(join(CONTRACTS_DIR, rel), "utf8"));
}

function readText(rel) {
  return readFileSync(join(CONTRACTS_DIR, rel), "utf8");
}

function tokenRefToFixtureName(ref) {
  const parts = String(ref).split(".");
  if (parts.length < 3 || parts[1] !== "motion") return null;
  const semanticParts = parts.slice(3);
  if (parts[0] === "reader" && parts[2] === "duration" && ["instant", "micro", "fast", "base"].includes(semanticParts[0])) {
    semanticParts[0] = `reader${semanticParts[0][0].toUpperCase()}${semanticParts[0].slice(1)}`;
  }
  return `--fd-ds-motion-${parts[2]}-${semanticParts.join("-")}`;
}

const motionSchema = loadJson("motion.schema.json");
const uiEventSchema = loadJson("ui-event.schema.json");
const motionFixtures = loadJson("fixtures/motion.fixtures.json");
const tokenFixtures = loadJson("fixtures/token.fixtures.json");
const motionSpec = readText("MOTION_SPEC.md");

const motionSchemaIds = motionSchema.properties.id.enum;
const p0MotionIds = [...motionSpec.matchAll(/\| `([^`]+)` \| P0 \|/g)].map((m) => m[1]);
const motionFixtureById = new Map(motionFixtures.map((item) => [item.id, item]));
const tokenNames = new Set(tokenFixtures.map((item) => item.name));
const tokenValueByName = new Map(tokenFixtures.map((item) => [item.name, item.value]));
const exactMotionIds = [
  "app.firstOpen.enter",
  "app.route.push.forward",
  "app.route.pop.backward",
  "app.route.replace",
  "bookshelf.view.switch",
  "button.activate",
  "toggle.switch",
  "chip.item.select",
  "destructive.confirm.commit",
  "filter.apply.commit",
  "filter.item.toggle",
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
  "selection.group.toggle",
  "selection.item.toggle",
  "selection.option.toggle",
  "selection.range.show",
  "selection.toolbar.action",
  "selection.toolbar.exit",
  "tooling.mode.switch",
];

const nonProductionExactExemptions = new Set([
  "reader.sourceSwitch.open-close",
  "overlay.dialog.enter-exit",
  "overlay.sheet.enter-exit",
  "reader.session.controlSpace.enter",
  "reader.session.controlSpace.update",
  "reader.session.controlSpace.exit",
]);

test("MOTION_SPEC defines the expected P0 MotionId set", () => {
  assert.equal(p0MotionIds.length, 47, "P0 MotionId count should stay explicit and reviewed");
  const allowed = new Set(motionSchema.properties.id.enum);
  for (const id of p0MotionIds) {
    assert.ok(allowed.has(id), `P0 MotionId missing from motion schema: ${id}`);
  }
});

test("audited motion families have canonical structured transition fields", () => {
  const required = ["trigger", "from", "to", "interrupt", "finalState", "cleanup"];
  for (const id of exactMotionIds) {
    const item = motionFixtureById.get(id);
    assert.ok(item, `canonical exact motion fixture missing: ${id}`);
    for (const field of required) {
      const value = item[field];
      assert.ok(value !== undefined, `canonical exact motion missing ${field}: ${id}`);
      if (Array.isArray(value)) assert.ok(value.length > 0, `canonical exact motion ${field} must not be empty: ${id}`);
      if (typeof value === "string") assert.ok(value.length > 0, `canonical exact motion ${field} must not be empty: ${id}`);
    }
  }
});

test("all active MotionIds are exact; only deprecated or contract-reserved ids remain exempt", () => {
  const exact = new Set(exactMotionIds);
  const pending = motionSchemaIds.filter((id) => !exact.has(id));
  assert.equal(exact.size, 89, "canonical exact MotionId count must stay explicit");
  assert.deepEqual(new Set(pending), nonProductionExactExemptions);
  for (const id of ["reader.sourceSwitch.open-close", "overlay.dialog.enter-exit", "overlay.sheet.enter-exit"]) {
    assert.equal(motionFixtureById.get(id)?.deprecated, true, `${id} must stay deprecated`);
  }
  for (const id of [
    "reader.session.controlSpace.enter",
    "reader.session.controlSpace.update",
    "reader.session.controlSpace.exit",
  ]) {
    assert.equal(motionFixtureById.get(id)?.deprecated, undefined, `${id} is reserved, not deprecated`);
  }
});

test("motion schema conditionally rejects incomplete audited specs without forcing the remaining family fixtures", () => {
  const exact = structuredClone(motionFixtureById.get("app.route.push.forward"));
  delete exact.cleanup;
  assert.ok(validate(motionSchema, exact).some((error) => error.keyword === "required"), "audited fixture without cleanup must fail schema validation");

  const pending = structuredClone(motionFixtureById.get("reader.session.controlSpace.enter"));
  delete pending.cleanup;
  assert.equal(validate(motionSchema, pending).length, 0, "pending fixture must remain valid until its exact semantics are audited");
});

test("audited motion semantics and duration tokens are internally consistent", () => {
  const expected = {
    "app.firstOpen.enter": ["routeTransition", "appShell", "enter", "app.motion.duration.firstOpen", 280],
    "app.route.push.forward": ["routeTransition", "appShell", "push", "app.motion.duration.tabSwitch", 160],
    "app.route.pop.backward": ["routeTransition", "appShell", "pop", "app.motion.duration.tabSwitch", 160],
    "app.route.replace": ["routeTransition", "appShell", "replace", "app.motion.duration.stateReplace", 160],
    "bookshelf.view.switch": ["stateReplace", "mainTabShell", "replace", "app.motion.duration.layoutSwitch", 320],
    "tab.item.press": ["componentFeedback", "mainTabShell", "update", "app.motion.duration.tabPress", 80],
    "tab.item.select": ["tabTransition", "mainTabShell", "update", "app.motion.duration.tabSelect", 120],
    "tab.item.switch": ["tabTransition", "mainTabShell", "tabSwitch", "app.motion.duration.tabSwitch", 160],
    "tab.switch": ["tabTransition", "mainTabShell", "tabSwitch", "app.motion.duration.tabSwitch", 160],
    "segment.item.switch": ["tabTransition", "mainTabShell", "tabSwitch", "app.motion.duration.tabSelect", 120],
    "reader.entry.coverToImmersive": ["readerEntry", "readerShell", "push", "reader.motion.duration.readerEntry", 240],
    "reader.entry.actionToImmersive": ["readerEntry", "readerShell", "push", "reader.motion.duration.readerEntry", 240],
    "reader.page.turn.next-prev": ["readerPageTurn", "readerSurface", "update", "reader.motion.duration.pageTurn", 220],
    "reader.chapter.jump": ["readerPageTurn", "readerSurface", "replace", "reader.motion.duration.base", 160],
    "reader.control.handle.press": ["directManipulation", "readerSurface", "dragStart", "reader.motion.duration.instant", 0],
    "reader.control.handle.drag": ["directManipulation", "readerSurface", "dragUpdate", "reader.motion.duration.instant", 0],
    "reader.control.handle.release": ["directManipulation", "readerSurface", "dragRelease", "reader.motion.duration.handleSnap", 120],
    "reader.control.dock.longPress": ["directManipulation", "readerSurface", "dragStart", "reader.motion.duration.handleLongPress", 320],
    "reader.control.dock.drag": ["directManipulation", "readerSurface", "dragUpdate", "reader.motion.duration.instant", 0],
    "reader.control.dock.release": ["directManipulation", "readerSurface", "dragRelease", "reader.motion.duration.handleSnap", 120],
    "reader.control.dock.rebound": ["directManipulation", "readerSurface", "settle", "reader.motion.duration.handleSnap", 120],
    "reader.control.show": ["overlayTransition", "readerShell", "enter", "reader.motion.duration.controlEnter", 420],
    "reader.control.hide": ["overlayTransition", "readerShell", "exit", "reader.motion.duration.controlExit", 360],
    "reader.quick.promote": ["overlayTransition", "readerShell", "enter", "reader.motion.duration.quickPromote", 320],
    "reader.module.switch": ["tabTransition", "readerShell", "tabSwitch", "reader.motion.duration.moduleSwitch", 360],
    "reader.panel.expand": ["overlayTransition", "readerShell", "enter", "reader.motion.duration.controlEnter", 420],
    "reader.panel.collapse": ["overlayTransition", "readerShell", "exit", "reader.motion.duration.controlExit", 360],
    "reader.session.tts.start": ["sessionCapsule", "sessionCapsule", "enter", "reader.motion.duration.sessionReturn", 200],
    "reader.session.autoPage.start": ["sessionCapsule", "sessionCapsule", "enter", "reader.motion.duration.sessionReturn", 200],
    "reader.session.capsule.enter": ["sessionCapsule", "sessionCapsule", "enter", "reader.motion.duration.capsuleEnter", 160],
    "reader.session.capsule.update": ["sessionCapsule", "sessionCapsule", "update", "reader.motion.duration.capsuleControl", 120],
    "reader.session.capsule.control.press-toggle": ["sessionCapsule", "sessionCapsule", "update", "reader.motion.duration.capsuleControl", 120],
    "reader.session.capsule.countdownTick": ["sessionCapsule", "sessionCapsule", "update", "reader.motion.duration.capsuleTick", 120],
    "reader.session.capsule.voiceIcon.active": ["sessionCapsule", "sessionCapsule", "update", "reader.motion.duration.voicePulse", 960],
    "reader.session.capsule.switch": ["sessionCapsule", "sessionCapsule", "replace", "reader.motion.duration.capsuleEnter", 160],
    "reader.session.capsule.exit": ["sessionCapsule", "sessionCapsule", "exit", "reader.motion.duration.capsuleEnter", 160],
    "viewport.orientation.prepare": ["orientationReshape", "appShell", "reshape", "reader.motion.duration.orientationFreeze", 80],
    "viewport.orientation.reshape": ["orientationReshape", "appShell", "reshape", "reader.motion.duration.viewportReshape", 240],
    "viewport.orientation.settle": ["orientationReshape", "appShell", "settle", "reader.motion.duration.orientationSettle", 240],
    "motion.interrupt.cancel": ["componentFeedback", "appShell", "update", "reader.motion.duration.interruptSettle", 80],
    "motion.interrupt.redirect": ["componentFeedback", "appShell", "update", "reader.motion.duration.interruptSettle", 80],
    "motion.interrupt.completeThenReplace": ["componentFeedback", "appShell", "update", "reader.motion.duration.interruptSettle", 80],
    "source.switch.route.push": ["routeTransition", "flowShell", "push", "reader.motion.duration.route", 280],
    "source.switch.route.pop": ["routeTransition", "flowShell", "pop", "reader.motion.duration.routePop", 240],
    "source.switch.route.replace": ["routeTransition", "flowShell", "replace", "reader.motion.duration.routeReplace", 200],
    "overlay.sheet.enter": ["overlayTransition", "overlayHost", "enter", "reader.motion.duration.overlay", 240],
    "overlay.sheet.exit": ["overlayTransition", "overlayHost", "exit", "reader.motion.duration.overlay", 240],
    "overlay.dialog.enter": ["overlayTransition", "overlayHost", "enter", "reader.motion.duration.overlay", 240],
    "overlay.dialog.exit": ["overlayTransition", "overlayHost", "exit", "reader.motion.duration.overlay", 240],
    "overlay.keyboard.enter-exit": ["overlayTransition", "overlayHost", "enter", "reader.motion.duration.overlay", 240],
    "state.loading.inline": ["stateReplace", "inlineState", "update", "reader.motion.duration.loadingSpin", 800],
    "feedback.toast.enter": ["overlayTransition", "overlayHost", "enter", "app.motion.duration.feedbackToast", 180],
    "feedback.toast.exit": ["overlayTransition", "overlayHost", "exit", "app.motion.duration.feedbackToast", 180],
    "input.focus": ["componentFeedback", "listItem", "update", "app.motion.duration.inputFocus", 120],
    "input.blur": ["componentFeedback", "listItem", "update", "app.motion.duration.inputFocus", 120],
    "input.clear": ["componentFeedback", "listItem", "update", "app.motion.duration.inputFocus", 120],
    "input.focus-blur": ["componentFeedback", "listItem", "update", "app.motion.duration.inputFocus", 120],
    "input.submit": ["stateReplace", "inlineState", "replace", "app.motion.duration.searchState", 160],
    "search.state.replace": ["stateReplace", "inlineState", "replace", "app.motion.duration.searchState", 160],
    "state.content.replace": ["stateReplace", "inlineState", "replace", "app.motion.duration.stateReplace", 160],
  };

  for (const [id, [kind, container, operation, tokenRef, durationMs]] of Object.entries(expected)) {
    const item = motionFixtureById.get(id);
    assert.equal(item.implementationKind, kind, `${id} implementationKind drift`);
    assert.equal(item.containerRole, container, `${id} containerRole drift`);
    assert.equal(item.operation, operation, `${id} operation drift`);
    assert.equal(item.tokens.durationToken, tokenRef, `${id} duration token drift`);
    assert.equal(item.durationMs, durationMs, `${id} duration drift`);

    const fixtureName = tokenRefToFixtureName(tokenRef);
    const rawValue = tokenValueByName.get(fixtureName);
    assert.equal(Number.parseInt(rawValue, 10), durationMs, `${id} durationMs must equal ${fixtureName}`);
  }

  assert.deepEqual(motionFixtureById.get("reader.quick.promote").from, ["control.home"]);
  assert.deepEqual(motionFixtureById.get("reader.quick.promote").to, ["control.quick.target"]);
  assert.deepEqual(motionFixtureById.get("reader.panel.expand").from, ["control.quick.module"]);
  assert.deepEqual(motionFixtureById.get("reader.panel.expand").to, ["control.full.module"]);
  assert.deepEqual(motionFixtureById.get("reader.panel.collapse").from, ["control.full.module"]);
  assert.deepEqual(motionFixtureById.get("reader.panel.collapse").to, ["control.quick.module"]);
  assert.deepEqual(motionFixtureById.get("app.route.push.forward").from, ["route.current"]);
  assert.deepEqual(motionFixtureById.get("app.route.push.forward").to, ["route.targetOnStack"]);
  assert.deepEqual(motionFixtureById.get("app.route.pop.backward").to, ["route.previousOnStack"]);
  assert.deepEqual(motionFixtureById.get("app.route.replace").to, ["route.replacedTarget"]);
  assert.deepEqual(motionFixtureById.get("tab.switch").from, ["activeTab.previous"]);
  assert.deepEqual(motionFixtureById.get("tab.switch").to, ["activeTab.next"]);
  assert.deepEqual(motionFixtureById.get("segment.item.switch").to, ["segment.next"]);
  assert.deepEqual(motionFixtureById.get("reader.entry.coverToImmersive").from, ["sourceRoute", "coverPressed", "coverSnapshotMeasured"]);
  assert.deepEqual(motionFixtureById.get("reader.entry.actionToImmersive").from, ["sourceRoute", "actionPressed"]);
  assert.deepEqual(motionFixtureById.get("reader.entry.coverToImmersive").to, ["immersiveReading"]);
  assert.deepEqual(motionFixtureById.get("reader.entry.actionToImmersive").to, ["immersiveReading"]);
  assert.deepEqual(motionFixtureById.get("reader.page.turn.next-prev").to, ["page.nextOrPrevious"]);
  assert.deepEqual(motionFixtureById.get("reader.chapter.jump").to, ["chapter.target"]);
  assert.deepEqual(motionFixtureById.get("reader.control.handle.press").to, ["handlePressed"]);
  assert.deepEqual(motionFixtureById.get("reader.control.handle.drag").to, ["handleDragging", "dragOffsetPreview"]);
  assert.deepEqual(motionFixtureById.get("reader.control.handle.release").to, ["snapBack", "expandCommitted", "collapseCommitted"]);
  assert.deepEqual(motionFixtureById.get("reader.control.dock.longPress").to, ["dockDragArmed"]);
  assert.deepEqual(motionFixtureById.get("reader.control.dock.drag").to, ["dockOffset.previewClamped"]);
  assert.deepEqual(motionFixtureById.get("reader.control.dock.release").to, ["dockOffset.committed"]);
  assert.deepEqual(motionFixtureById.get("reader.control.dock.rebound").to, ["dockOffset.clamped"]);
  assert.deepEqual(motionFixtureById.get("reader.session.tts.start").to, ["immersiveReading", "session.tts", "capsuleVisible"]);
  assert.deepEqual(motionFixtureById.get("reader.session.autoPage.start").to, ["immersiveReading", "session.autoPage", "capsuleVisible"]);
  assert.deepEqual(motionFixtureById.get("reader.session.capsule.enter").to, ["capsuleVisible"]);
  assert.deepEqual(motionFixtureById.get("reader.session.capsule.update").to, ["capsuleVisible", "session.nextState"]);
  assert.deepEqual(motionFixtureById.get("reader.session.capsule.control.press-toggle").to, ["capsuleVisible", "playing.next"]);
  assert.deepEqual(motionFixtureById.get("reader.session.capsule.countdownTick").to, ["countdown.next"]);
  assert.deepEqual(motionFixtureById.get("reader.session.capsule.voiceIcon.active").to, ["ttsPlayingVisualActive"]);
  assert.deepEqual(motionFixtureById.get("reader.session.capsule.switch").to, ["capsuleVisible", "session.nextType"]);
  assert.deepEqual(motionFixtureById.get("reader.session.capsule.exit").to, ["capsuleHidden"]);
  assert.equal(motionFixtureById.get("reader.session.tts.start").finalState, "ttsOwnsSessionAndCapsule");
  assert.equal(motionFixtureById.get("reader.session.autoPage.start").finalState, "autoPageOwnsSessionAndCapsule");
  assert.equal(motionFixtureById.get("reader.session.capsule.switch").finalState, "singleCapsuleWithNextSessionType");
  assert.equal(motionFixtureById.get("reader.session.capsule.exit").finalState, "capsuleHiddenAndHitTargetReleased");
  assert.deepEqual(motionFixtureById.get("viewport.orientation.prepare").to, ["viewportFrozen"]);
  assert.deepEqual(motionFixtureById.get("viewport.orientation.reshape").to, ["viewportReshaped"]);
  assert.deepEqual(motionFixtureById.get("viewport.orientation.settle").to, ["viewportStable"]);
  assert.equal(motionFixtureById.get("viewport.orientation.prepare").finalState, "routeReaderSessionOverlayFocusFrozen");
  assert.equal(motionFixtureById.get("viewport.orientation.reshape").finalState, "readerOverlayCapsuleDockReanchored");
  assert.equal(motionFixtureById.get("viewport.orientation.settle").finalState, "focusPointerSessionMicroMotionRestored");
  assert.deepEqual(motionFixtureById.get("motion.interrupt.cancel").to, ["latestCommittedState"]);
  assert.deepEqual(motionFixtureById.get("motion.interrupt.redirect").to, ["motionRunningTowardNewTarget"]);
  assert.deepEqual(motionFixtureById.get("motion.interrupt.completeThenReplace").to, ["replacementState"]);
  assert.equal(motionFixtureById.get("motion.interrupt.cancel").finalState, "transientMotionCleared");
  assert.equal(motionFixtureById.get("motion.interrupt.redirect").finalState, "newTargetOwnsMotion");
  assert.equal(motionFixtureById.get("motion.interrupt.completeThenReplace").finalState, "replacementVisibleOnlyIfStillCurrent");
  assert.deepEqual(motionFixtureById.get("state.loading.inline").to, ["inlineState.loading"]);
  assert.equal(motionFixtureById.get("state.loading.inline").finalState, "latestRequestOwnsInlineStateAndTerminalResultStopsIndicator");
  assert.deepEqual(motionFixtureById.get("feedback.toast.enter").to, ["toast.visible", "toastHost.singleOwner"]);
  assert.equal(motionFixtureById.get("feedback.toast.enter").finalState, "latestToastVisibleWithSingleHostOwner");
  assert.deepEqual(motionFixtureById.get("feedback.toast.exit").to, ["toast.hidden", "toastHost.empty"]);
  assert.equal(motionFixtureById.get("feedback.toast.exit").finalState, "toastHiddenAndHostReleased");
  assert.deepEqual(motionFixtureById.get("source.switch.route.push").to, ["sourceSwitchRoute.onStack"]);
  assert.deepEqual(motionFixtureById.get("source.switch.route.pop").to, ["flowRoute.previousOnStack"]);
  assert.deepEqual(motionFixtureById.get("source.switch.route.replace").to, ["flowRoute.replacementTarget"]);
  assert.equal(motionFixtureById.get("source.switch.route.push").finalState, "sourceSwitchRouteVisibleAndReaderOriginPreserved");
  assert.deepEqual(motionFixtureById.get("overlay.sheet.enter").to, ["sheetVisible", "backgroundInert"]);
  assert.deepEqual(motionFixtureById.get("overlay.sheet.exit").to, ["sheetHidden", "backgroundInteractive"]);
  assert.deepEqual(motionFixtureById.get("overlay.dialog.enter").to, ["dialogVisible", "backgroundInert", "focusTrapped"]);
  assert.deepEqual(motionFixtureById.get("overlay.dialog.exit").to, ["dialogHidden", "backgroundInteractive", "focusReturned"]);
  assert.equal(motionFixtureById.get("overlay.keyboard.enter-exit").finalState, "keyboardVisibilityInsetAndFocusMatchLatestIntent");
  assert.ok(motionFixtureById.get("app.route.pop.backward").trigger.includes("reader.exit"));
  assert.equal(motionFixtureById.get("bookshelf.view.switch").easing, "ease-out");
  assert.equal(motionFixtureById.get("bookshelf.view.switch").tokens.easingToken, "app.motion.easing.enter");
  assert.equal(motionFixtureById.get("bookshelf.view.switch").visualPattern, "sharedLayoutMorph");
  assert.deepEqual(motionFixtureById.get("bookshelf.view.switch").from, ["bookshelf.view.cover", "bookshelf.view.list"]);
  assert.deepEqual(motionFixtureById.get("bookshelf.view.switch").to, ["bookshelf.view.target"]);
  assert.deepEqual(motionFixtureById.get("bookshelf.view.switch").interrupt, [
    "bookshelf.view.switch",
    "bookshelf.sortFilter.apply",
    "bookshelf.group.select",
    "route.replace",
    "viewport.orientation.prepare",
  ]);
  const uiEvents = new Set(uiEventSchema.properties.type.enum);
  for (const id of [
    "app.firstOpen.enter",
    "app.route.push.forward",
    "app.route.pop.backward",
    "app.route.replace",
    "tab.item.select",
    "tab.switch",
    "segment.item.switch",
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
    "feedback.toast.exit",
    "input.focus",
    "input.blur",
    "input.clear",
    "input.focus-blur",
    "input.submit",
    "search.state.replace",
    "state.content.replace",
  ]) {
    for (const event of motionFixtureById.get(id).trigger) {
      assert.ok(uiEvents.has(event), `${id} references non-canonical UiEvent trigger: ${event}`);
    }
  }
  for (const event of [
    ...motionFixtureById.get("bookshelf.view.switch").trigger,
    ...motionFixtureById.get("bookshelf.view.switch").interrupt,
  ]) assert.ok(uiEvents.has(event), `bookshelf.view.switch references non-canonical UiEvent: ${event}`);
});

test("every P0 MotionId has a concrete fixture", () => {
  for (const id of p0MotionIds) {
    assert.ok(motionFixtureById.has(id), `P0 MotionId missing from motion fixtures: ${id}`);
  }
});

test("every schema MotionId has one concrete MotionSpec fixture", () => {
  assert.equal(motionFixtures.length, motionSchemaIds.length, "MotionSpec fixture count must match schema MotionId count");
  const seen = new Set();
  for (const item of motionFixtures) {
    assert.ok(motionSchemaIds.includes(item.id), `motion fixture id missing from schema: ${item.id}`);
    assert.ok(!seen.has(item.id), `duplicate motion fixture id: ${item.id}`);
    seen.add(item.id);
  }
  for (const id of motionSchemaIds) {
    assert.ok(motionFixtureById.has(id), `schema MotionId missing from motion fixtures: ${id}`);
  }
});

test("every P0 motion fixture has token refs and guardRules", () => {
  for (const id of p0MotionIds) {
    const item = motionFixtureById.get(id);
    assert.ok(item.tokens?.durationToken, `P0 motion missing durationToken: ${id}`);
    assert.ok(item.tokens?.easingToken, `P0 motion missing easingToken: ${id}`);
    assert.ok(Array.isArray(item.guardRules) && item.guardRules.length > 0, `P0 motion missing guardRules: ${id}`);

    const durationName = tokenRefToFixtureName(item.tokens.durationToken);
    const easingName = tokenRefToFixtureName(item.tokens.easingToken);
    assert.ok(durationName && tokenNames.has(durationName), `durationToken has no token fixture: ${id} -> ${item.tokens.durationToken}`);
    assert.ok(easingName && tokenNames.has(easingName), `easingToken has no token fixture: ${id} -> ${item.tokens.easingToken}`);
  }
});

test("every MotionSpec fixture has token refs and guardRules", () => {
  for (const item of motionFixtures) {
    assert.ok(item.tokens?.durationToken, `motion missing durationToken: ${item.id}`);
    assert.ok(item.tokens?.easingToken, `motion missing easingToken: ${item.id}`);
    assert.ok(Array.isArray(item.guardRules) && item.guardRules.length > 0, `motion missing guardRules: ${item.id}`);

    const durationName = tokenRefToFixtureName(item.tokens.durationToken);
    const easingName = tokenRefToFixtureName(item.tokens.easingToken);
    assert.ok(durationName && tokenNames.has(durationName), `durationToken has no token fixture: ${item.id} -> ${item.tokens.durationToken}`);
    assert.ok(easingName && tokenNames.has(easingName), `easingToken has no token fixture: ${item.id} -> ${item.tokens.easingToken}`);
  }
});

test("P0 guardRules include reduced-motion or direct-manipulation fallback", () => {
  for (const id of p0MotionIds) {
    const guardRules = motionFixtureById.get(id).guardRules.join(" ");
    const hasReduced = guardRules.includes("reducedMotion:forceZeroDuration");
    const hasDirectManipulation = guardRules.includes("dragMustFollowFinger:noEasing") || guardRules.includes("releaseToSnap:afterReleaseOnly");
    const isInterrupt = id.startsWith("motion.interrupt.");
    assert.ok(
      hasReduced || hasDirectManipulation || isInterrupt,
      `P0 motion needs reduced-motion or direct manipulation guard: ${id}`
    );
  }
});

test("every MotionSpec guardRules include reduced-motion, direct-manipulation, or interrupt semantics", () => {
  for (const item of motionFixtures) {
    const guardRules = item.guardRules.join(" ");
    const hasReduced = guardRules.includes("reducedMotion:forceZeroDuration");
    const hasDirectManipulation = guardRules.includes("dragMustFollowFinger:noEasing") || guardRules.includes("releaseToSnap:afterReleaseOnly");
    const hasInterruptSemantics = item.id.startsWith("motion.interrupt.") || guardRules.includes("interrupt:");
    assert.ok(
      hasReduced || hasDirectManipulation || hasInterruptSemantics,
      `motion needs reduced-motion, direct manipulation, or interrupt guard: ${item.id}`
    );
  }
});

// --- Phase 1 Motion Runtime: 新增 6 个结构化字段守卫 ---

test("every MotionSpec fixture has 6 new structured fields (Phase 1 Motion Runtime)", () => {
  const required = ["implementationKind", "containerRole", "operation", "visualPattern", "interruptPolicy", "reducedMotionPolicy"];
  for (const item of motionFixtures) {
    for (const field of required) {
      assert.ok(item[field] !== undefined, `motion fixture 缺少字段 ${field}: ${item.id}`);
    }
  }
});

test("interruptPolicy 与 guardRules 中 interrupt:* 一致", () => {
  for (const item of motionFixtures) {
    const guardRules = Array.isArray(item.guardRules) ? item.guardRules : [];
    const interruptRule = guardRules.find((r) => String(r).startsWith("interrupt:"));
    if (interruptRule) {
      // guardRule 可能是单值（interrupt:cancel）或多值（interrupt:cancel|redirect）
      const allowedValues = interruptRule.split(":")[1].split("|");
      assert.ok(
        allowedValues.includes(item.interruptPolicy),
        `motion ${item.id} interruptPolicy=${item.interruptPolicy} 不在 guardRule ${interruptRule} 允许值 [${allowedValues.join(", ")}] 内`
      );
    } else if (item.id.startsWith("motion.interrupt.")) {
      // motion.interrupt.* 自身的 policy 直接从 id 派生
      const expected = item.id.split(".").pop();
      assert.equal(item.interruptPolicy, expected, `motion ${item.id} interruptPolicy 应为 ${expected}`);
    }
  }
});

test("reducedMotionPolicy 与 guardRules 一致", () => {
  for (const item of motionFixtures) {
    const guardRules = Array.isArray(item.guardRules) ? item.guardRules : [];
    const hasForceZero = guardRules.includes("reducedMotion:forceZeroDuration");
    const hasDragMustFollow = guardRules.some((r) => String(r).startsWith("dragMustFollowFinger:"));
    const hasReleaseToSnap = guardRules.some((r) => String(r).startsWith("releaseToSnap:"));
    if (hasDragMustFollow || hasReleaseToSnap) {
      assert.equal(item.reducedMotionPolicy, "keepDirectManipulation", `motion ${item.id} 含手势跟随规则，reducedMotionPolicy 应为 keepDirectManipulation`);
    } else if (hasForceZero) {
      assert.equal(item.reducedMotionPolicy, "zeroDuration", `motion ${item.id} 含 forceZeroDuration，reducedMotionPolicy 应为 zeroDuration`);
    }
  }
});

test("implementationKind 值在 schema enum 内", () => {
  const allowed = new Set(motionSchema.properties.implementationKind.enum);
  for (const item of motionFixtures) {
    assert.ok(allowed.has(item.implementationKind), `motion ${item.id} implementationKind 不在 enum: ${item.implementationKind}`);
  }
});

test("containerRole 值在 schema enum 内（若存在）", () => {
  const allowed = new Set(motionSchema.properties.containerRole.enum);
  for (const item of motionFixtures) {
    if (item.containerRole !== undefined && item.containerRole !== null) {
      assert.ok(allowed.has(item.containerRole), `motion ${item.id} containerRole 不在 enum: ${item.containerRole}`);
    }
  }
});

test("operation 值在 schema enum 内（若存在）", () => {
  const allowed = new Set(motionSchema.properties.operation.enum);
  for (const item of motionFixtures) {
    if (item.operation !== undefined && item.operation !== null) {
      assert.ok(allowed.has(item.operation), `motion ${item.id} operation 不在 enum: ${item.operation}`);
    }
  }
});

test("visualPattern 值在 schema enum 内（若存在）", () => {
  const allowed = new Set(motionSchema.properties.visualPattern.enum);
  for (const item of motionFixtures) {
    if (item.visualPattern !== undefined && item.visualPattern !== null) {
      assert.ok(allowed.has(item.visualPattern), `motion ${item.id} visualPattern 不在 enum: ${item.visualPattern}`);
    }
  }
});

test("directManipulation 类 implementationKind 对应 reducedMotionPolicy=keepDirectManipulation", () => {
  for (const item of motionFixtures) {
    if (item.implementationKind === "directManipulation") {
      assert.equal(item.reducedMotionPolicy, "keepDirectManipulation", `motion ${item.id} 是 directManipulation，reducedMotionPolicy 应为 keepDirectManipulation`);
    }
  }
});
