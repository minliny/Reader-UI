import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertValid, registerSchemas, validate } from "./mini-validator.mjs";

const contracts = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (relativePath) => JSON.parse(readFileSync(join(contracts, relativePath), "utf8"));

const requestSchema = load("host-request.schema.json");
const resultSchema = load("host-result.schema.json");
const requestFixtures = load("fixtures/host-request.fixtures.json");
const resultFixtures = load("fixtures/host-result.fixtures.json");

registerSchemas({
  "host-request.schema.json": requestSchema,
  "host-result.schema.json": resultSchema,
});

const requestTypes = requestSchema.properties.type.enum;

function discriminatedTypes(schema) {
  return schema.allOf.map(({ $ref }) => {
    const definition = schema.$defs[$ref.split("/").at(-1)];
    return definition.if.properties.type.const;
  });
}

function countByType(fixtures) {
  const counts = new Map();
  for (const fixture of fixtures) counts.set(fixture.type, (counts.get(fixture.type) ?? 0) + 1);
  return counts;
}

function mutateFirstScalar(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return false;
    return mutateFirstScalar(value[0]);
  }
  if (value === null || typeof value !== "object") return false;
  for (const key of Object.keys(value)) {
    const child = value[key];
    if (typeof child === "string") {
      value[key] = 123;
      return true;
    }
    if (typeof child === "number") {
      value[key] = "not-a-number";
      return true;
    }
    if (typeof child === "boolean") {
      value[key] = "not-a-boolean";
      return true;
    }
    if (mutateFirstScalar(child)) return true;
  }
  return false;
}

test("HostRequest 1.2.0 has exactly 58 unique discriminated payload branches", () => {
  assert.equal(requestTypes.length, 58);
  assert.equal(new Set(requestTypes).size, 58);
  assert.deepEqual(discriminatedTypes(requestSchema), requestTypes);
});

test("HostResult covers the exact HostRequest type set in the same order", () => {
  assert.deepEqual(discriminatedTypes(resultSchema), requestTypes);
  assert.equal(resultSchema.properties.type.$ref, "host-request.schema.json#/properties/type");
});

test("request and result fixtures are each a 58/58 exact set", () => {
  for (const [label, fixtures] of [["request", requestFixtures], ["result", resultFixtures]]) {
    const counts = countByType(fixtures);
    assert.equal(fixtures.length, 58, `${label} fixture count`);
    assert.deepEqual([...counts.keys()], requestTypes, `${label} fixture order/set`);
    for (const type of requestTypes) assert.equal(counts.get(type), 1, `${label} ${type}`);
  }
});

test("all 58 HostRequest fixtures validate and reject unknown payload fields", () => {
  for (const fixture of requestFixtures) {
    assertValid(requestSchema, fixture, `HostRequest ${fixture.type}`);
    const extra = structuredClone(fixture);
    extra.payload.__unknown = true;
    assert.ok(validate(requestSchema, extra).length > 0, `${fixture.type} must close payload`);
  }
});

test("all non-empty HostRequest fixtures reject scalar type drift", () => {
  for (const fixture of requestFixtures) {
    const invalid = structuredClone(fixture);
    if (!mutateFirstScalar(invalid.payload)) continue;
    assert.ok(validate(requestSchema, invalid).length > 0, `${fixture.type} must reject type drift`);
  }
});

test("all 58 HostResult fixtures validate and reject unknown result fields", () => {
  for (const fixture of resultFixtures) {
    assertValid(resultSchema, fixture, `HostResult ${fixture.type}`);
    const extra = structuredClone(fixture);
    extra.result.__unknown = true;
    assert.ok(validate(resultSchema, extra).length > 0, `${fixture.type} must close result`);
  }
});

test("appearance HostResult invariants are fail-closed", () => {
  const invalidResults = [
    { type: "persistence.get", result: { found: false, value: "stale", revision: "1" } },
    { type: "persistence.put", result: { stored: true, revision: 1 } },
    { type: "font.registerFile", result: { registered: true, path: "/font.ttf", familyName: "Reader" } },
    { type: "font.unregisterFile", result: { logicalUnregistered: true, physicallyUnregistered: false, restartRequired: false } },
  ];
  for (const fixture of invalidResults) {
    assert.ok(validate(resultSchema, fixture).length > 0, `${fixture.type} invariant`);
  }
});

test("platform aliases do not leak into the canonical request wire", () => {
  const aliases = [
    { type: "credential.get", payload: { identifier: "webdav" } },
    { type: "permission.check", payload: { kind: "storage" } },
    { type: "storage.path", payload: { kind: "cache" } },
    { type: "device.vibrate", payload: { durationMillis: 50 } },
    { type: "webview.evaluate", payload: { document: { kind: "url", url: "https://example.com" }, javaScript: "document.title" } },
  ];
  for (const fixture of aliases) {
    assert.ok(validate(requestSchema, fixture).length > 0, `${fixture.type} alias must fail`);
  }
});
