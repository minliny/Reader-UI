import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
  return `--reader-ds-motion-${parts[2]}-${semanticParts.join("-")}`;
}

const motionSchema = loadJson("motion.schema.json");
const motionFixtures = loadJson("fixtures/motion.fixtures.json");
const tokenFixtures = loadJson("fixtures/token.fixtures.json");
const motionSpec = readText("MOTION_SPEC.md");

const motionSchemaIds = motionSchema.properties.id.enum;
const p0MotionIds = [...motionSpec.matchAll(/\| `([^`]+)` \| P0 \|/g)].map((m) => m[1]);
const motionFixtureById = new Map(motionFixtures.map((item) => [item.id, item]));
const tokenNames = new Set(tokenFixtures.map((item) => item.name));

test("MOTION_SPEC defines the expected P0 MotionId set", () => {
  assert.equal(p0MotionIds.length, 40, "P0 MotionId count should stay explicit and reviewed");
  const allowed = new Set(motionSchema.properties.id.enum);
  for (const id of p0MotionIds) {
    assert.ok(allowed.has(id), `P0 MotionId missing from motion schema: ${id}`);
  }
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
