import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertValid, registerSchemas, validate } from "./mini-validator.mjs";
import {
  assertPlanIntegrity,
  canonicalJsonBytes,
  DEVICE_CONFORMANCE_EVIDENCE_SCHEMA_PATH,
  DEVICE_CONFORMANCE_PLAN_PATH,
  evaluateDeviceConformanceEvidence,
  HOSTS,
  planSha256,
  sha256,
} from "../../tools/device-conformance/device-conformance-lib.mjs";

const contracts = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(contracts, "..");
const load = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const planSchema = load("contracts/device-conformance-plan.schema.json");
const evidenceSchema = load("contracts/device-conformance-evidence.schema.json");
const requestSchema = load("contracts/host-request.schema.json");
const resultSchema = load("contracts/host-result.schema.json");
const requestFixtures = load("contracts/fixtures/host-request.fixtures.json");
const resultFixtures = load("contracts/fixtures/host-result.fixtures.json");
const plan = load(DEVICE_CONFORMANCE_PLAN_PATH);

registerSchemas({
  "host-request.schema.json": requestSchema,
  "host-result.schema.json": resultSchema,
  "device-conformance-plan.schema.json": planSchema,
  "device-conformance-evidence.schema.json": evidenceSchema,
});

function hashFile(relativePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex");
}

function targetKind(tier) {
  return {
    unit: "unit-runner",
    simulator: "simulator",
    physical: "physical-device",
    manual: "manual-observation",
  }[tier];
}

function buildSyntheticPassingEvidence() {
  const sourceSha = "a".repeat(40);
  const manifestBytes = fs.readFileSync(path.join(root, "UI_RELEASE_MANIFEST.json"));
  const manifestSha = sha256(manifestBytes);
  const artifacts = new Map();
  const records = [];

  for (const hostPlan of plan.hosts) {
    for (const item of hostPlan.cases) {
      const artifactPath = `detached-proof/${hostPlan.host}/${String(item.sequence).padStart(3, "0")}-${item.type}.log`;
      const artifactBytes = Buffer.from(`synthetic gate test only\n${hostPlan.host}\n${item.type}\n`, "utf8");
      artifacts.set(artifactPath, artifactBytes);
      const record = {
        host: hostPlan.host,
        sourceSha,
        manifestSha,
        deviceId: `${hostPlan.host}-target-001`,
        type: item.type,
        proofTier: item.minimumProofTier,
        targetKind: targetKind(item.minimumProofTier),
        executedAt: "2026-07-11T00:00:00.000Z",
        outcome: "passed",
        requestFixtureSha256: item.requestFixture.fixtureSha256,
        expectedResultFixtureSha256: item.expectedResultFixture.fixtureSha256,
        observedResult: JSON.parse(canonicalJsonBytes(resultFixtures[item.sequence - 1]).toString("utf8")),
        artifact: {
          path: artifactPath,
          byteLength: artifactBytes.length,
          sha256: sha256(artifactBytes),
        },
      };
      if (item.minimumProofTier === "manual") {
        record.operator = "r18-test-operator";
        record.observation = "Synthetic validator test; not committed device evidence.";
      }
      records.push(record);
    }
  }

  return {
    evidence: {
      $schema: DEVICE_CONFORMANCE_EVIDENCE_SCHEMA_PATH,
      schemaVersion: 1,
      planPath: DEVICE_CONFORMANCE_PLAN_PATH,
      planSha256: planSha256(plan),
      releaseId: `${sourceSha}:${manifestSha}`,
      records,
    },
    sourceSha,
    manifestBytes,
    artifacts,
  };
}

function evaluateFixture(fixture) {
  return evaluateDeviceConformanceEvidence({
    plan,
    evidence: fixture.evidence,
    expectedSourceSha: fixture.sourceSha,
    manifestBytes: fixture.manifestBytes,
    readArtifact: (artifactPath) => fixture.artifacts.get(artifactPath),
  });
}

test("R18 plan/evidence schemas compile and the committed plan is strict-valid", () => {
  assertValid(planSchema, plan, "R18 plan");
  const invalid = structuredClone(plan);
  invalid.hosts[0].cases[0].deviceVerified = true;
  assert.ok(validate(planSchema, invalid).length > 0, "a plan must never self-claim device verification");
  invalid.hosts[0].cases[0].deviceVerified = false;
  invalid.hosts[0].cases[0].summary = { passed: true };
  assert.ok(validate(planSchema, invalid).length > 0, "plan case must reject summary fields");
});

test("generator is byte-deterministic and committed outputs are current", () => {
  const run = spawnSync(process.execPath, ["tools/device-conformance/generate-device-conformance-kit.mjs", "--check"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
  assert.match(run.stdout, /deterministic and current/);
  assert.equal(assertPlanIntegrity(plan, root), true);
});

test("all three hosts bind the exact ordered 58/58 request and result fixtures", () => {
  const types = requestSchema.properties.type.enum;
  assert.equal(types.length, 58);
  assert.equal(new Set(types).size, 58);
  assert.deepEqual(plan.hosts.map(({ host }) => host), HOSTS);
  assert.equal(plan.verificationPolicy.exactRecordCount, 174);
  assert.equal(plan.verificationPolicy.deviceVerifiedDefault, false);
  assert.equal(plan.verificationPolicy.fixtureValidationIsExecutionEvidence, false);
  assert.equal(plan.verificationPolicy.syntheticSummaryAccepted, false);

  for (const hostPlan of plan.hosts) {
    assert.deepEqual(hostPlan.cases.map(({ type }) => type), types, `${hostPlan.host} type order`);
    assert.equal(new Set(hostPlan.cases.map(({ type }) => type)).size, 58, `${hostPlan.host} unique types`);
    for (let index = 0; index < types.length; index += 1) {
      const item = hostPlan.cases[index];
      assert.equal(item.sequence, index + 1);
      assert.equal(item.deviceVerified, false);
      assert.equal(item.requestFixture.index, index);
      assert.equal(item.expectedResultFixture.index, index);
      assert.equal(item.requestFixture.requestId, requestFixtures[index].requestId);
      assert.equal(item.expectedResultFixture.requestId, resultFixtures[index].requestId);
      assert.equal(item.requestFixture.correlationId, requestFixtures[index].correlationId);
      assert.equal(item.expectedResultFixture.correlationId, resultFixtures[index].correlationId);
      assert.equal(item.requestFixture.fixtureSha256, sha256(canonicalJsonBytes(requestFixtures[index])));
      assert.equal(item.expectedResultFixture.fixtureSha256, sha256(canonicalJsonBytes(resultFixtures[index])));
      assert.ok(["unit", "simulator", "physical", "manual"].includes(item.minimumProofTier));
      assert.equal(typeof item.destructive, "boolean");
      assert.equal(typeof item.externalSideEffect, "boolean");
    }
  }
});

test("plan source digests bind current contract inputs without embedding fake release identity", () => {
  assert.equal(plan.releaseIdentityAuthority.manifestPath, "UI_RELEASE_MANIFEST.json");
  assert.equal(plan.releaseIdentityAuthority.embeddedReleaseIdentity, false);
  assert.equal("sourceSha" in plan.releaseIdentityAuthority, false);
  assert.equal("manifestSha" in plan.releaseIdentityAuthority, false);
  assert.equal("releaseId" in plan.releaseIdentityAuthority, false);
  assert.equal("tag" in plan.releaseIdentityAuthority, false);
  assert.equal(plan.sources.length, 6);
  for (const source of plan.sources) {
    const bytes = fs.readFileSync(path.join(root, source.path));
    assert.equal(source.byteLength, bytes.length, source.path);
    assert.equal(source.sha256, hashFile(source.path), source.path);
  }
});

test("report preserves tier counts and the unresolved physical boundary", () => {
  const cases = plan.hosts[0].cases;
  const counts = Object.fromEntries(["unit", "simulator", "physical", "manual"].map((tier) => [
    tier,
    cases.filter((item) => item.minimumProofTier === tier).length,
  ]));
  assert.deepEqual(counts, { unit: 4, simulator: 15, physical: 21, manual: 18 });
  assert.equal(cases.filter((item) => item.destructive).length, 10);
  assert.equal(cases.filter((item) => item.externalSideEffect).length, 48);
  const report = fs.readFileSync(path.join(root, "device-conformance/README.md"), "utf8");
  assert.match(report, /初始 deviceVerified：0\/174/);
  assert.match(report, /每端 39 项、三端 117 项/);
  assert.match(report, /未调用设备、模拟器或网络/);
  assert.match(report, /不产生设备通过证明/);
});

test("strict evidence schema rejects summary-only, missing identity and extra fields", () => {
  const fixture = buildSyntheticPassingEvidence();
  assertValid(evidenceSchema, fixture.evidence, "synthetic evidence schema fixture");

  const summaryOnly = {
    $schema: DEVICE_CONFORMANCE_EVIDENCE_SCHEMA_PATH,
    schemaVersion: 1,
    planPath: DEVICE_CONFORMANCE_PLAN_PATH,
    planSha256: fixture.evidence.planSha256,
    releaseId: fixture.evidence.releaseId,
    summary: { passed: 174 },
  };
  assert.ok(validate(evidenceSchema, summaryOnly).length > 0);

  const missingIdentity = structuredClone(fixture.evidence);
  delete missingIdentity.records[0].deviceId;
  assert.ok(validate(evidenceSchema, missingIdentity).length > 0);

  const extra = structuredClone(fixture.evidence);
  extra.records[0].deviceVerified = true;
  assert.ok(validate(evidenceSchema, extra).length > 0);
});

test("complete per-item proof can verify only with trusted identity and real artifact bytes", () => {
  const fixture = buildSyntheticPassingEvidence();
  const result = evaluateFixture(fixture);
  assert.deepEqual(result, { deviceVerified: true, verifiedCount: 174, totalCount: 174, errors: [] });

  const missingTrustedContext = evaluateDeviceConformanceEvidence({
    plan,
    evidence: fixture.evidence,
    expectedSourceSha: undefined,
    manifestBytes: fixture.manifestBytes,
    readArtifact: (artifactPath) => fixture.artifacts.get(artifactPath),
  });
  assert.equal(missingTrustedContext.deviceVerified, false);
  assert.match(missingTrustedContext.errors[0], /trusted expectedSourceSha/);
});

test("missing, duplicate, reordered and summary evidence all fail closed", () => {
  const missing = buildSyntheticPassingEvidence();
  missing.evidence.records.pop();
  assert.equal(evaluateFixture(missing).deviceVerified, false);

  const duplicate = buildSyntheticPassingEvidence();
  duplicate.evidence.records[173] = structuredClone(duplicate.evidence.records[0]);
  assert.equal(evaluateFixture(duplicate).deviceVerified, false);

  const reordered = buildSyntheticPassingEvidence();
  [reordered.evidence.records[0], reordered.evidence.records[1]] = [reordered.evidence.records[1], reordered.evidence.records[0]];
  assert.equal(evaluateFixture(reordered).deviceVerified, false);

  const summary = buildSyntheticPassingEvidence();
  summary.evidence = {
    $schema: DEVICE_CONFORMANCE_EVIDENCE_SCHEMA_PATH,
    schemaVersion: 1,
    planPath: DEVICE_CONFORMANCE_PLAN_PATH,
    planSha256: summary.evidence.planSha256,
    releaseId: summary.evidence.releaseId,
    records: [],
    summary: { passed: true },
  };
  assert.equal(evaluateFixture(summary).deviceVerified, false);
});

test("self-reported identity, placeholder device, low tier, failed outcome and forged artifact fail closed", () => {
  const wrongSource = buildSyntheticPassingEvidence();
  wrongSource.evidence.records[0].sourceSha = "b".repeat(40);
  assert.equal(evaluateFixture(wrongSource).deviceVerified, false);

  const wrongManifest = buildSyntheticPassingEvidence();
  wrongManifest.evidence.records[0].manifestSha = "b".repeat(64);
  assert.equal(evaluateFixture(wrongManifest).deviceVerified, false);

  const placeholder = buildSyntheticPassingEvidence();
  placeholder.evidence.records[0].deviceId = "unknown";
  assert.equal(evaluateFixture(placeholder).deviceVerified, false);

  const lowTier = buildSyntheticPassingEvidence();
  const manualIndex = lowTier.evidence.records.findIndex((record) => record.proofTier === "manual");
  lowTier.evidence.records[manualIndex].proofTier = "unit";
  lowTier.evidence.records[manualIndex].targetKind = "unit-runner";
  delete lowTier.evidence.records[manualIndex].operator;
  delete lowTier.evidence.records[manualIndex].observation;
  assert.equal(evaluateFixture(lowTier).deviceVerified, false);

  const failed = buildSyntheticPassingEvidence();
  failed.evidence.records[0].outcome = "failed";
  delete failed.evidence.records[0].observedResult;
  failed.evidence.records[0].failure = { code: "DEVICE_FAILURE", message: "proof failed" };
  assert.equal(evaluateFixture(failed).deviceVerified, false);

  const forgedArtifact = buildSyntheticPassingEvidence();
  forgedArtifact.evidence.records[0].artifact.sha256 = "c".repeat(64);
  assert.equal(evaluateFixture(forgedArtifact).deviceVerified, false);
});
