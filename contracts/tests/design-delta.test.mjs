import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertValid, registerSchemas, validate } from "./mini-validator.mjs";

const contractsDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(contractsDir, "..");

function load(relativePath) {
  return JSON.parse(readFileSync(join(contractsDir, relativePath), "utf8"));
}

const schema = load("design-delta.schema.json");
const fixtures = load("fixtures/design-delta.fixtures.json");
const appearance = load("fixtures/appearance.fixtures.json");
const tokenFixtures = load("fixtures/token.fixtures.json");
const routeSchema = load("route.schema.json");
const viewStateSchema = load("view-state.schema.json");
const motionSchema = load("motion.schema.json");
const uiEventSchema = load("ui-event.schema.json");
const tokenSchema = load("token.schema.json");

registerSchemas({
  "design-delta.schema.json": schema,
  "route.schema.json": routeSchema,
  "view-state.schema.json": viewStateSchema,
  "motion.schema.json": motionSchema,
  "ui-event.schema.json": uiEventSchema,
  "token.schema.json": tokenSchema,
});

const knownReferences = {
  tokens: new Set(tokenFixtures.map((item) => item.name)),
  componentTypes: new Set(viewStateSchema.$defs.Component.properties.type.enum),
  routes: new Set(routeSchema.properties.id.enum),
  motionIds: new Set(motionSchema.properties.id.enum),
  uiEvents: new Set(uiEventSchema.properties.type.enum),
};

function unknownReferenceErrors(delta) {
  const errors = [];
  for (const [field, knownValues] of Object.entries(knownReferences)) {
    for (const value of delta.affected[field]) {
      if (!knownValues.has(value)) errors.push(`${field}:${value}`);
    }
  }
  return errors;
}

test("frozen Design Delta fixtures are strict-valid executable contracts", () => {
  assert.equal(schema.title, "ReaderDesignDelta");
  assert.ok(fixtures.length > 0);
  for (const fixture of fixtures) {
    assertValid(schema, fixture, fixture.designDeltaId);
    assert.deepEqual(unknownReferenceErrors(fixture), [], `${fixture.designDeltaId} has unknown contract references`);
    assert.equal(fixture.status, "frozen");
    assert.equal(fixture.release.artifactRequired, true);
    assert.equal(fixture.release.consumerLockRequired, true);
    for (const relativePath of fixture.affected.files) {
      assert.ok(existsSync(join(repoRoot, relativePath)), `${fixture.designDeltaId} missing affected file ${relativePath}`);
    }
    const affectedRoutes = new Set(fixture.affected.routes);
    for (const state of fixture.affected.states) {
      assert.ok(affectedRoutes.has(state.routeId), `${state.routeId}/${state.state} must also be listed as an affected route`);
    }
    for (const [host, impact] of Object.entries(fixture.hostImpact)) {
      if (impact.level !== "none") {
        assert.ok(impact.adapters.length > 0, `${fixture.designDeltaId} ${host} must name affected adapters`);
      }
    }
  }
});

test("AppearanceContent delta pins the exact Figma and executable AppearanceSpec revisions", () => {
  const fixture = fixtures.find((item) => item.designRevision.path === appearance.source.path);
  assert.ok(fixture, "Reader 2/Full/AppearanceContent Design Delta missing");
  assert.equal(fixture.designRevision.figmaFileKey, appearance.source.figmaFileKey);
  assert.equal(fixture.designRevision.nodeId, appearance.source.nodeId);
  assert.equal(fixture.designRevision.revision, appearance.source.revision);
  assert.deepEqual(fixture.validation.viewports, [
    "phone-portrait",
    "phone-landscape",
    "tablet-portrait",
    "tablet-landscape",
  ]);
  assert.deepEqual(fixture.hostImpact.web.evidence, ["contract", "build", "screenshot"]);
});

test("Design Delta rejects working Figma state, unknown contract references and unsafe file paths", () => {
  const base = fixtures[0];
  const working = structuredClone(base);
  working.status = "working";
  assert.ok(validate(schema, working).length > 0);

  const unknownReferences = [
    ["tokens", "--fd-ds-not-a-token"],
    ["componentTypes", "NotAReaderComponent"],
    ["routes", "not-a-reader-route"],
    ["motionIds", "not.a.reader.motion"],
    ["uiEvents", "not.a.reader.event"],
  ];
  for (const [field, unknownValue] of unknownReferences) {
    const invalid = structuredClone(base);
    invalid.affected[field] = [unknownValue];
    assert.ok(unknownReferenceErrors(invalid).length > 0, `${field} must reject ${unknownValue}`);
  }

  const unsafePath = structuredClone(base);
  unsafePath.affected.files = ["../Reader-for-iOS/Package.swift"];
  assert.ok(validate(schema, unsafePath).length > 0);
});

test("D3 and D4 changes are milestone-only and capability work cannot be empty", () => {
  const d3 = structuredClone(fixtures[0]);
  d3.changeLevel = "D3";
  d3.release.featureFlag = false;
  d3.release.rollout = "batch";
  assert.ok(validate(schema, d3).length > 0);

  const d4 = structuredClone(fixtures[0]);
  d4.changeLevel = "D4";
  d4.release.featureFlag = true;
  d4.release.rollout = "milestone";
  d4.affected.capabilities = [];
  assert.ok(validate(schema, d4).length > 0);

  d4.affected.capabilities = ["host.font.import"];
  assertValid(schema, d4, "D4 capability delta");
});

test("wire id changes require a major release and an explicit migration", () => {
  const invalid = structuredClone(fixtures[0]);
  invalid.compatibility.stableWireIds = false;
  invalid.compatibility.releaseKind = "patch";
  invalid.compatibility.migration = "none";
  assert.ok(validate(schema, invalid).length > 0);

  invalid.compatibility.releaseKind = "major";
  invalid.compatibility.migration = "required";
  assertValid(schema, invalid, "breaking wire id delta");
});
