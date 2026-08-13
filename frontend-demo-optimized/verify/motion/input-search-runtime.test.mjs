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
  "input.focus",
  "input.blur",
  "input.clear",
  "input.focus-blur",
  "input.submit",
  "search.state.replace",
  "state.content.replace"
];

test("input, search, and content replacement families publish exact transactions", () => {
  for (const id of exactIds) {
    const fixture = byId.get(id);
    assert.ok(fixture, `${id} fixture missing`);
    for (const field of ["trigger", "from", "to", "interrupt", "finalState", "cleanup"]) {
      assert.ok(fixture[field]?.length || typeof fixture[field] === "string", `${id}.${field} missing`);
    }
    assert.match(controller, new RegExp(`"${id.replaceAll(".", "\\.")}": \\{`));
  }
  assert.equal(byId.get("input.focus").finalState, "focusedInputOwnsCaretAndOptionalKeyboard");
  assert.equal(byId.get("input.blur").finalState, "blurredInputPreservesValueAndReleasesKeyboardOwnership");
  assert.ok(byId.get("input.clear").cleanup.includes("search.staleResult.discard"));
  assert.equal(byId.get("input.submit").finalState, "latestSubmitResultOwnsStableInputAndResultHost");
  assert.equal(byId.get("search.state.replace").finalState, "latestSearchRequestOwnsStableResultHost");
  assert.ok(byId.get("state.content.replace").cleanup.includes("content.scrollAnchor.preserve"));
});

test("runtime owns focus, latest search request, stale discard, and stable content host", () => {
  assert.equal(runtime.includes('bind("[data-keyboard-input]", "input.focus/blur")'), false);
  assert.match(runtime, /bind\("\[data-keyboard-input\]", "input\.focus-blur"\)/);
  assert.match(runtime, /function attachInputSearchMotionState\(/);
  assert.match(runtime, /function attachContentReplaceMotionState\(/);
  assert.match(runtime, /function cancelBookSearchRequest\(/);
  assert.match(runtime, /data-motion-input-contract/);
  assert.match(runtime, /data-motion-search-request-version/);
  assert.match(runtime, /data-motion-search-discarded-request/);
  assert.match(runtime, /data-motion-content-phase/);
  assert.match(runtime, /superseded-by-latest-submit/);
  assert.match(runtime, /\["before", "loading", "after", "empty", "error"\]/);
  assert.match(runtime, /terminalState = \/\^\(error\|错误\|失败\)\$\/i/);
});

test("input and state replacement use tokenized and reduced-motion-safe CSS", () => {
  assert.match(motionCss, /--fd-motion-effective-input-focus/);
  assert.match(motionCss, /--fd-motion-effective-search-state/);
  assert.match(motionCss, /@keyframes fd-search-state-replace/);
  assert.match(motionCss, /@keyframes fd-content-state-replace/);
  assert.match(motionCss, /data-motion-reduced="true"[\s\S]*data-motion-search-id="search\.state\.replace"/);
});
