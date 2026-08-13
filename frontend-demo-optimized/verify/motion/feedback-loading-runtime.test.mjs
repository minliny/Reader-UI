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

test("inline loading is an exact latest-request-owned transaction", () => {
  const fixture = byId.get("state.loading.inline");
  assert.deepEqual(fixture.to, ["inlineState.loading"]);
  assert.ok(fixture.interrupt.includes("loading.request.superseded"));
  assert.ok(fixture.cleanup.includes("inlineLoading.staleResult.discard"));
  assert.equal(fixture.finalState, "latestRequestOwnsInlineStateAndTerminalResultStopsIndicator");

  assert.match(runtime, /function attachInlineLoadingMotionState\(/);
  assert.match(runtime, /function ensureInlineLoadingIndicator\(/);
  assert.match(runtime, /if \(options\?\.loading\)\s*\{\s*ensureInlineLoadingIndicator\(screenHost\)/);
  assert.match(runtime, /id:\s*"state\.loading\.inline"[\s\S]*requestId:\s*request\.requestId/);
  assert.match(runtime, /motionController\?\.interrupt\?\.\("loading\.request\.cancel"\)/);
  assert.match(runtime, /motionController\?\.interrupt\?\.\("loading\.result\.ready"\)/);
  assert.match(runtime, /data-motion-loading-owner/);
  assert.match(runtime, /data-motion-loading-terminal/);
  assert.match(controller, /"state\.loading\.inline":\s*800/);
  assert.match(motionCss, /--fd-motion-effective-loading-spin/);
  assert.match(motionCss, /fd-reader-loading-runtime/);
});

test("toast runtime has one owner, canonical enter-update-exit ids, and no slash alias", () => {
  assert.equal(runtime.includes("feedback.toast.enter/update/exit"), false);
  assert.match(runtime, /function showToastMotion\(/);
  assert.match(runtime, /function dismissToastMotion\(/);
  assert.match(runtime, /function resetToastMotionState\(/);
  assert.match(runtime, /motionToastOwner/);
  assert.match(runtime, /motionToastSequence/);
  assert.match(runtime, /data-motion-toast-phase/);
  assert.match(runtime, /setAttribute\("role",\s*"status"\)/);
  assert.match(runtime, /setAttribute\("aria-live",\s*"polite"\)/);
  for (const id of ["feedback.toast.enter", "feedback.toast.update", "feedback.toast.exit"]) {
    assert.match(runtime, new RegExp(id.replaceAll(".", "\\.")));
    assert.match(controller, new RegExp(`"${id.replaceAll(".", "\\.")}": 180`));
  }
  assert.match(motionCss, /@keyframes fd-feedback-toast-enter/);
  assert.match(motionCss, /@keyframes fd-feedback-toast-update/);
  assert.match(motionCss, /@keyframes fd-feedback-toast-exit/);
});

test("toast exact contracts preserve latest-message and host-release cleanup", () => {
  const enter = byId.get("feedback.toast.enter");
  const update = byId.get("feedback.toast.update");
  const exit = byId.get("feedback.toast.exit");
  assert.deepEqual(enter.to, ["toast.visible", "toastHost.singleOwner"]);
  assert.equal(enter.finalState, "latestToastVisibleWithSingleHostOwner");
  assert.ok(enter.cleanup.includes("toast.autoDismiss.latestTimer.replace"));
  assert.deepEqual(update.to, ["toast.visible", "toastHost.singleOwner", "toast.message.latest"]);
  assert.equal(update.finalState, "latestToastVisibleWithSingleHostOwner");
  assert.ok(update.cleanup.includes("toast.liveRegion.latestMessage.commit"));
  assert.deepEqual(exit.to, ["toast.hidden", "toastHost.empty"]);
  assert.equal(exit.finalState, "toastHiddenAndHostReleased");
  assert.ok(exit.cleanup.includes("toastHost.owner.release"));
});
