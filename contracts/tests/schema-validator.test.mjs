import test from "node:test";
import assert from "node:assert/strict";
import { assertValid, validate } from "./mini-validator.mjs";

const schemaHeader = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
};

test("validator enforces oneOf branches and closed payloads", () => {
  const schema = {
    ...schemaHeader,
    oneOf: [
      {
        type: "object",
        required: ["kind", "count"],
        properties: {
          kind: { const: "count" },
          count: { type: "integer", minimum: 1 },
        },
        additionalProperties: false,
      },
      {
        type: "object",
        required: ["kind", "name"],
        properties: {
          kind: { const: "name" },
          name: { type: "string", minLength: 2 },
        },
        additionalProperties: false,
      },
    ],
  };

  assert.equal(validate(schema, { kind: "count", count: 2 }).length, 0);
  assert.ok(validate(schema, { kind: "count", name: "wrong branch" }).length > 0);
  assert.ok(validate(schema, { kind: "name", name: "x" }).length > 0);
  assert.ok(validate(schema, { kind: "name", name: "ok", extra: true }).length > 0);
});

test("validator enforces allOf, not and conditional branches", () => {
  const schema = {
    ...schemaHeader,
    type: "object",
    required: ["kind", "value"],
    properties: {
      kind: { enum: ["number", "text"] },
      value: {},
    },
    allOf: [
      {
        if: {
          properties: { kind: { const: "number" } },
          required: ["kind"],
        },
        then: { properties: { value: { type: "integer", minimum: 0 } } },
        else: { properties: { value: { type: "string", minLength: 1 } } },
      },
      { not: { properties: { value: { const: "forbidden" } }, required: ["value"] } },
    ],
    additionalProperties: false,
  };

  assert.equal(validate(schema, { kind: "number", value: 0 }).length, 0);
  assert.equal(validate(schema, { kind: "text", value: "allowed" }).length, 0);
  assert.ok(validate(schema, { kind: "number", value: "0" }).length > 0);
  assert.ok(validate(schema, { kind: "text", value: "forbidden" }).length > 0);
});

test("validator enforces registered formats", () => {
  const schema = {
    ...schemaHeader,
    type: "object",
    required: ["timestamp"],
    properties: { timestamp: { type: "string", format: "date-time" } },
    additionalProperties: false,
  };

  assert.equal(validate(schema, { timestamp: "2026-07-11T03:00:00Z" }).length, 0);
  assert.ok(validate(schema, { timestamp: "not-a-date" }).length > 0);
});

test("fixture _comment metadata remains outside the validated payload", () => {
  const schema = {
    ...schemaHeader,
    type: "object",
    required: ["value"],
    properties: { value: { type: "integer" } },
    additionalProperties: false,
  };

  assert.doesNotThrow(() => assertValid(schema, { _comment: "fixture note", value: 1 }, "fixture"));
  assert.throws(
    () => assertValid(schema, { value: "1" }, "fixture"),
    /校验失败/,
  );
});
