import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { assertValid } from "./mini-validator.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const CONTRACTS_DIR = join(REPO_ROOT, "contracts");

function json(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const routeSchema = json(join(CONTRACTS_DIR, "route.schema.json"));
const quarantineSchema = json(join(CONTRACTS_DIR, "route-reconstruction-quarantine.schema.json"));
const quarantine = json(join(CONTRACTS_DIR, "fixtures", "route-reconstruction-quarantine.fixtures.json"));
const registry = json(join(REPO_ROOT, "docs", "design", "FIGMA_VISUAL_ADMISSION_REGISTRY.json"));
const ledger = json(join(REPO_ROOT, "docs", "design", "PROMOTION_LEDGER.json"));

test("route reconstruction quarantine is a valid, exact source-side route extraction", () => {
  assertValid(quarantineSchema, quarantine, "route reconstruction quarantine fixture");
  assert.equal(quarantine.status, "active", "A3 isolation must remain active until a new source conversion releases it");

  const knownRouteIds = new Set(routeSchema.properties.id.enum);
  const routeIds = quarantine.entries.flatMap((entry) => entry.routeIds);
  // A2 strict physical removal retired the 13 legacy reader control/module
  // routes (MAJOR). Only reader.reading-surface's 3 canonical routes remain
  // here, as a released source-conversion record. The 6 sibling source
  // quarantines were retired because their routes no longer exist.
  assert.equal(routeIds.length, 3, "only the 3 canonical reading-surface routes remain after A2 removal");
  assert.equal(new Set(routeIds).size, routeIds.length, "a quarantined route must have exactly one owning record");
  for (const routeId of routeIds) assert.ok(knownRouteIds.has(routeId), `unknown quarantined RouteId: ${routeId}`);

  const expectedRecordIds = [
    "reader.reading-surface",
  ];
  assert.deepEqual(quarantine.entries.map((entry) => entry.recordId), expectedRecordIds);
  assert.ok(quarantine.entries.every((entry) => entry.status === "active" || entry.status === "released"),
    "each source extraction record must independently declare whether it is still active");
});

test("an active quarantine withdraws local and Harmony promotion eligibility for every owning record", () => {
  const records = new Map(registry.records.map((record) => [record.id, record]));
  const ledgerRecordIds = new Set(ledger.entries.map((entry) => entry.recordId));

  for (const entry of quarantine.entries) {
    const record = records.get(entry.recordId);
    assert.ok(record, `quarantine references missing registry record: ${entry.recordId}`);
    if (quarantine.status === "active" && entry.status === "active") {
      assert.equal(record.local?.status, "candidate-backport", `${entry.recordId} local status must be withdrawn while quarantined`);
      assert.equal(record.harmony?.status, "candidate-backport", `${entry.recordId} Harmony status must be withdrawn while quarantined`);
      assert.equal(ledgerRecordIds.has(entry.recordId), false, `${entry.recordId} cannot retain a promotion ledger entry while quarantined`);
    } else {
      assert.equal(record.local?.status, "implementation-ready", `${entry.recordId} must complete Reader-UI conversion before its quarantine can be released`);
      assert.ok(["candidate-backport", "implementation-ready"].includes(record.harmony?.status),
        `${entry.recordId} released source may await or complete the separate native promotion`);
    }
    assert.deepEqual(record.routeIds, entry.routeIds, `${entry.recordId} route set must match the source extraction exactly`);
  }
});
