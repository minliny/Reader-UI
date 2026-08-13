import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { swiftUiEventCase } from "../../tools/codegen/swift-identifiers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const eventSchema = JSON.parse(readFileSync(join(REPO_ROOT, "contracts", "ui-event.schema.json"), "utf8"));

test("Swift identifier normalizer handles arbitrary hyphenated strings", () => {
  assert.equal(swiftUiEventCase("example-control.activate"), "example_control_activate");
  assert.equal(swiftUiEventCase("sample-sheet.open"), "sample_sheet_open");
});

test("every canonical UiEvent maps to a valid Swift identifier", () => {
  for (const eventType of eventSchema.properties.type.enum) {
    const identifier = swiftUiEventCase(eventType);
    assert.match(identifier, /^[A-Za-z_][A-Za-z0-9_]*$/, `${eventType} -> ${identifier}`);
    assert.equal(identifier.includes("-"), false, `${eventType} leaves a hyphen in ${identifier}`);
  }
});
