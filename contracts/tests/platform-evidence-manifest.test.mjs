import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { assertValid, validate } from "./mini-validator.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const contractsDir = path.resolve(here, "..");
const loadJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(contractsDir, relativePath), "utf8"));
const clone = (value) => structuredClone(value);

const schema = loadJson("platform-evidence-manifest.schema.json");
const fixture = loadJson("fixtures/platform-evidence-manifest.fixtures.json");
const routeSchema = loadJson("route.schema.json");
const routeIds = new Set(routeSchema.properties.id.enum);
const formalSliceIds = Array.from({ length: 13 }, (_, index) => `slice-${index}`);

function executionManifest() {
  const manifest = clone(fixture);
  manifest.manifestKind = "execution";
  manifest.releaseIdentity = {
    contractVersion: "3.0.0",
    sourceSha: "1".repeat(40),
    manifestSha: "2".repeat(64),
    readerCoreArtifactSha: "3".repeat(64),
    consumerLockSha: "4".repeat(64),
  };
  return manifest;
}

function closeSlice(entry) {
  entry.status = "passed";
  for (const gate of Object.keys(entry.gates)) entry.gates[gate] = "passed";
  entry.tests = [{
    name: "slice-9 canonical verification",
    command: "run platform slice-9 verification",
    result: "passed",
    reportPath: "evidence/slice-9/tests/report.json",
    reportSha256: "5".repeat(64),
  }];
  entry.evidence = [{
    kind: "video",
    path: "evidence/slice-9/slice-9-ios-import-reader.mov",
    byteLength: 4096,
    sha256: "6".repeat(64),
    targetKind: "physical-device",
    deviceId: "iphone-15-pro-fixture",
    os: "iOS fixture",
    capturedAt: "2026-07-19T00:00:00Z",
    result: "passed",
  }];
  entry.blockers = [];
}

test("platform evidence manifest template registers the exact Slice 0-12 set", () => {
  assertValid(schema, fixture, "platform evidence manifest fixture");
  assert.deepEqual(Object.keys(fixture.slices), formalSliceIds);
  assert.equal(fixture.manifestKind, "template");
  assert.equal(fixture.releaseIdentity, null);
  for (const platform of ["ios", "android", "harmonyos"]) {
    const platformTemplate = clone(fixture);
    platformTemplate.platform = platform;
    assertValid(schema, platformTemplate, `${platform} platform evidence template`);
  }
});

test("Slice 9-12 formal registrations carry capability scope and canonical routes", () => {
  const expected = {
    "slice-9": ["B02", "C02", "C03", "C11", "E06", "F02"],
    "slice-10": ["C04", "C05", "C06", "C07", "C08", "C09", "C10", "D02", "D03"],
    "slice-11": ["E00", "E01", "E02", "E03", "E04", "E05", "E06"],
    "slice-12": ["A02", "A03", "A04", "A05", "F03", "F04", "F05", "F06", "F07"],
  };
  for (const [sliceId, capabilityRefs] of Object.entries(expected)) {
    const entry = fixture.slices[sliceId];
    assert.deepEqual(entry.coverage.capabilityRefs, capabilityRefs);
    assert.equal(entry.status, "planned");
    assert.equal(entry.tests.length, 0);
    assert.equal(entry.evidence.length, 0);
    for (const routeId of entry.coverage.routeIds) {
      assert.ok(routeIds.has(routeId), `${sliceId} references unknown RouteId ${routeId}`);
    }
  }
});

test("template registration cannot claim passed evidence", () => {
  const invalid = clone(fixture);
  closeSlice(invalid.slices["slice-9"]);
  assert.ok(validate(schema, invalid).length > 0, "template must reject passed slice state");
});

test("execution passed state fails closed without tests, evidence, release identity and closed gates", () => {
  const missingRelease = clone(fixture);
  missingRelease.manifestKind = "execution";
  assert.ok(validate(schema, missingRelease).length > 0, "execution manifest must require release identity");

  const incomplete = executionManifest();
  incomplete.slices["slice-9"].status = "passed";
  assert.ok(validate(schema, incomplete).length > 0, "passed slice must reject pending gates and empty proof");

  const complete = executionManifest();
  closeSlice(complete.slices["slice-9"]);
  assertValid(schema, complete, "closed execution slice");
});

test("manifest rejects unknown or missing slice registrations", () => {
  const unknown = clone(fixture);
  unknown.slices["slice-13"] = clone(unknown.slices["slice-12"]);
  assert.ok(validate(schema, unknown).length > 0, "slice-13 must be rejected");

  const missing = clone(fixture);
  delete missing.slices["slice-10"];
  assert.ok(validate(schema, missing).length > 0, "formal slices cannot be omitted");
});

test("manifest dependency graph is acyclic and only points backward", () => {
  for (const [sliceId, entry] of Object.entries(fixture.slices)) {
    const current = Number(sliceId.split("-")[1]);
    for (const dependency of entry.dependencies) {
      const dependencyNumber = Number(dependency.split("-")[1]);
      assert.ok(dependencyNumber < current, `${sliceId} has non-backward dependency ${dependency}`);
    }
  }
});
