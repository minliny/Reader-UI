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
