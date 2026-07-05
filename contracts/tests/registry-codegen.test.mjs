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
    "--reader-ds-color-paper",
    "--reader-ds-space-screen-padding",
    "--reader-ds-motion-duration-pageTurn",
    "--reader-ds-motion-easing-enter",
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
