// R1 · Control Identity — JSON Schema validator helper
//
// Loads contracts/control-identity.schema.json and provides ajv-based
// validation for canonical registry entries. Used by drift tests to enforce
// additionalProperties:false, required, enum, and pattern constraints.
//
// This module is the single source of truth for "what makes a registry entry
// schema-valid". The drift test imports `compileEntryValidator` and asserts
// that every persisted entry passes, plus 4 negative cases (extra field /
// role-not-in-enum / controlId-pattern-mismatch / missing-required) all fail.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { REPO_ROOT } from "./interaction-inventory-lib.mjs";

const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020").default;
const addFormats = require("ajv-formats").default;

const SCHEMA_PATH = "contracts/control-identity.schema.json";

const THIS_DIR = fileURLToPath(new URL(".", import.meta.url));

let cachedSchema = null;
let cachedCompile = null;

export function loadControlIdentitySchema() {
  if (cachedSchema) return cachedSchema;
  const raw = readFileSync(join(REPO_ROOT, SCHEMA_PATH), "utf8");
  cachedSchema = JSON.parse(raw);
  return cachedSchema;
}

/**
 * Compile the entry schema with ajv (draft 2020-12). Returns a validate()
 * function that accepts a candidate entry and returns true/false, attaching
 * `errors` to the function instance on failure.
 */
export function compileEntryValidator() {
  if (cachedCompile) return cachedCompile;
  const schema = loadControlIdentitySchema();
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    strictSchema: true,
    allowUnionTypes: true,
  });
  addFormats(ajv);
  cachedCompile = ajv.compile(schema);
  return cachedCompile;
}

/**
 * Validate a single registry entry against the canonical schema. Returns
 * `{ valid, errors }` where `errors` is an array of ajv error objects
 * (empty when valid).
 */
export function validateEntry(entry) {
  const validate = compileEntryValidator();
  const ok = validate(entry);
  return {
    valid: ok === true,
    errors: ok ? [] : (validate.errors || []).slice(),
  };
}

/**
 * Validate an array of entries. Returns `{ valid, invalidCount, errors,
 * firstInvalidEntry }` so callers can assert "0 invalid" and surface a
 * sample on failure.
 */
export function validateEntries(entries) {
  const validate = compileEntryValidator();
  let invalidCount = 0;
  const collectedErrors = [];
  let firstInvalidEntry = null;
  for (const entry of entries) {
    const ok = validate(entry);
    if (!ok) {
      invalidCount += 1;
      if (!firstInvalidEntry) {
        firstInvalidEntry = entry;
        collectedErrors.push(...(validate.errors || []).slice());
      }
      // Stop early after collecting 1 sample to keep the loop cheap; callers
      // only need to know invalidCount and a representative failure.
      if (invalidCount >= 1) break;
    }
  }
  return {
    valid: invalidCount === 0,
    invalidCount,
    errors: collectedErrors,
    firstInvalidEntry,
  };
}
