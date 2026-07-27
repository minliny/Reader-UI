import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { DEVICE_CONFORMANCE_POLICY } from "./device-conformance-policy.mjs";

export const DEVICE_CONFORMANCE_PLAN_PATH = "device-conformance/DEVICE_CONFORMANCE_PLAN.json";
export const DEVICE_CONFORMANCE_REPORT_PATH = "device-conformance/README.md";
export const DEVICE_CONFORMANCE_PLAN_SCHEMA_PATH = "contracts/device-conformance-plan.schema.json";
export const DEVICE_CONFORMANCE_EVIDENCE_SCHEMA_PATH = "contracts/device-conformance-evidence.schema.json";
export const HOSTS = Object.freeze(["ios", "android", "harmonyos"]);
export const PROOF_TIERS = Object.freeze(["unit", "simulator", "physical", "manual"]);

const SOURCE_PATHS = Object.freeze([
  "contracts/host-request.schema.json",
  "contracts/host-result.schema.json",
  "contracts/fixtures/host-request.fixtures.json",
  "contracts/fixtures/host-result.fixtures.json",
]);
const VERSION_PATH = "contracts/VERSION.json";
const POLICY_PATH = "tools/device-conformance/device-conformance-policy.mjs";
const SHA256 = /^[0-9a-f]{64}$/;
const SOURCE_SHA = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const PLACEHOLDER_DEVICE_ID = /^(?:unknown|none|null|mock|fake|test|device|simulator|emulator)$/i;

export function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value === null || typeof value !== "object") return value;
  const result = {};
  for (const key of Object.keys(value).filter((key) => key !== "_comment").sort(compareUtf8)) {
    result[key] = canonicalValue(value[key]);
  }
  return result;
}

export function canonicalJsonBytes(value) {
  return Buffer.from(JSON.stringify(canonicalValue(value)), "utf8");
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function rawSource(root, relativePath) {
  const bytes = fs.readFileSync(path.join(root, relativePath));
  return { path: relativePath, byteLength: bytes.length, sha256: sha256(bytes) };
}

function discriminatedTypes(schema) {
  return schema.allOf.map(({ $ref }) => {
    const definition = schema.$defs[$ref.split("/").at(-1)];
    return definition.if.properties.type.const;
  });
}

function assertExactOrder(actual, expected, label) {
  if (!Array.isArray(actual) || actual.length !== expected.length) {
    throw new Error(`${label} count ${actual?.length ?? "<missing>"}, expected ${expected.length}`);
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index] !== expected[index]) {
      throw new Error(`${label} order drift at ${index}: ${actual[index] ?? "<missing>"}, expected ${expected[index]}`);
    }
  }
}

function fixtureBinding(relativePath, index, fixture) {
  return {
    path: relativePath,
    index,
    fixtureSha256: sha256(canonicalJsonBytes(fixture)),
    requestId: fixture.requestId,
    correlationId: fixture.correlationId,
  };
}

export function buildDeviceConformancePlan(root) {
  const requestSchema = readJson(root, SOURCE_PATHS[0]);
  const resultSchema = readJson(root, SOURCE_PATHS[1]);
  const requestFixtures = readJson(root, SOURCE_PATHS[2]);
  const resultFixtures = readJson(root, SOURCE_PATHS[3]);
  const versions = readJson(root, VERSION_PATH);
  const types = requestSchema.properties.type.enum;

  if (versions?.schema?.["host-request"] !== "1.2.0") {
    throw new Error("R18 requires HostRequest 1.2.0");
  }
  if (versions?.schema?.["host-result"] !== "1.0.0") {
    throw new Error("R18 requires HostResult 1.0.0");
  }
  if (types.length !== 58 || new Set(types).size !== 58) {
    throw new Error(`HostRequest type ABI must be exactly 58 unique values, got ${types.length}`);
  }
  assertExactOrder(discriminatedTypes(requestSchema), types, "HostRequest discriminators");
  assertExactOrder(discriminatedTypes(resultSchema), types, "HostResult discriminators");
  assertExactOrder(requestFixtures.map((fixture) => fixture.type), types, "HostRequest fixtures");
  assertExactOrder(resultFixtures.map((fixture) => fixture.type), types, "HostResult fixtures");
  assertExactOrder(Object.keys(DEVICE_CONFORMANCE_POLICY), types, "R18 proof policy");

  const cases = types.map((type, index) => {
    const requestFixture = requestFixtures[index];
    const resultFixture = resultFixtures[index];
    if (requestFixture.requestId !== resultFixture.requestId || requestFixture.correlationId !== resultFixture.correlationId) {
      throw new Error(`${type} request/result fixture identity drift`);
    }
    return {
      sequence: index + 1,
      type,
      ...DEVICE_CONFORMANCE_POLICY[type],
      requestFixture: fixtureBinding(SOURCE_PATHS[2], index, requestFixture),
      expectedResultFixture: fixtureBinding(SOURCE_PATHS[3], index, resultFixture),
      deviceVerified: false,
    };
  });

  return {
    $schema: DEVICE_CONFORMANCE_PLAN_SCHEMA_PATH,
    schemaVersion: 1,
    kitVersion: "1.0.0",
    generatedBy: "tools/device-conformance/generate-device-conformance-kit.mjs",
    contracts: {
      hostRequest: "1.2.0",
      hostResult: "1.0.0",
      typeCount: 58,
      fixtureHashEncoding: "sorted-key-json-utf8",
    },
    releaseIdentityAuthority: {
      manifestPath: "UI_RELEASE_MANIFEST.json",
      sourceShaAuthority: "R13 staged release metadata or verified host consumer lock",
      manifestShaAuthority: "sha256 of the exact raw UI_RELEASE_MANIFEST.json bytes used by the run",
      releaseIdRule: "sourceSha:manifestSha",
      embeddedReleaseIdentity: false,
    },
    verificationPolicy: {
      deviceVerifiedDefault: false,
      exactRecordCount: HOSTS.length * types.length,
      requiredPerRecordIdentity: ["host", "sourceSha", "manifestSha", "deviceId", "type"],
      fixtureValidationIsExecutionEvidence: false,
      trustedContextRequired: true,
      proofArtifactDigestRequired: true,
      syntheticSummaryAccepted: false,
    },
    sources: [
      ...SOURCE_PATHS.map((relativePath) => rawSource(root, relativePath)),
      rawSource(root, VERSION_PATH),
      rawSource(root, POLICY_PATH),
    ],
    hosts: HOSTS.map((host) => ({ host, cases: structuredClone(cases) })),
  };
}

export function serializeDeviceConformancePlan(plan) {
  return `${JSON.stringify(plan, null, 2)}\n`;
}

export function planSha256(plan) {
  return sha256(Buffer.from(serializeDeviceConformancePlan(plan), "utf8"));
}

function countValues(cases, field) {
  const counts = new Map();
  for (const item of cases) counts.set(item[field], (counts.get(item[field]) ?? 0) + 1);
  return [...counts.entries()].sort(([left], [right]) => compareUtf8(left, right));
}

export function buildDeviceConformanceReport(plan) {
  const canonicalCases = plan.hosts[0].cases;
  const tierCounts = countValues(canonicalCases, "minimumProofTier");
  const categoryCounts = countValues(canonicalCases, "capability");
  const physicalBoundary = canonicalCases.filter((item) => ["physical", "manual"].includes(item.minimumProofTier));
  const destructive = canonicalCases.filter((item) => item.destructive);
  const external = canonicalCases.filter((item) => item.externalSideEffect);
  const tierTable = tierCounts.map(([tier, count]) => `| ${tier} | ${count} | ${count * HOSTS.length} |`).join("\n");
  const categoryTable = categoryCounts.map(([category, count]) => `| ${category} | ${count} | ${count * HOSTS.length} |`).join("\n");

  return `# R18 Device Conformance Kit\n\n` +
    `本目录是 HostRequest 1.2.0 / HostResult 1.0.0 的确定性执行计划，不是设备执行结果。` +
    `fixture schema/shape 校验只能证明 wire contract，不能把 \`deviceVerified\` 改为 \`true\`。\n\n` +
    `## 固定计数\n\n` +
    `- Host：${plan.hosts.length}（${plan.hosts.map(({ host }) => host).join(" / ")}）\n` +
    `- 每端 type：${canonicalCases.length}，三端计划项：${plan.verificationPolicy.exactRecordCount}\n` +
    `- 初始 deviceVerified：0/${plan.verificationPolicy.exactRecordCount}\n` +
    `- destructive：每端 ${destructive.length}，三端 ${destructive.length * HOSTS.length}\n` +
    `- externalSideEffect：每端 ${external.length}，三端 ${external.length * HOSTS.length}\n\n` +
    `| 最低 proof tier | 每端 | 三端 |\n| --- | ---: | ---: |\n${tierTable}\n\n` +
    `| capability | 每端 | 三端 |\n| --- | ---: | ---: |\n${categoryTable}\n\n` +
    `## 证据门槛\n\n` +
    `只有严格 evidence schema、58-type exact order、三端 ${plan.verificationPolicy.exactRecordCount} 条逐项记录、` +
    `可信 R13 sourceSha/manifestSha、非占位 deviceId、达到最低 proof tier、canonical observed result，` +
    `以及可重算 SHA-256 的实际 artifact 全部通过时，验证器才返回 \`deviceVerified=true\`。` +
    `缺项、重复、乱序、summary-only、失败结果、自报发布身份或不存在的 artifact 均 fail closed。\n\n` +
    `R13 追溯不在计划中嵌入伪 tag/伪 release identity：运行时必须从 staged release metadata 或已验证 consumer lock 取得 sourceSha，` +
    `并对实际 \`${plan.releaseIdentityAuthority.manifestPath}\` 原始字节重算 manifestSha。\n\n` +
    `## 物理阻塞边界\n\n` +
    `本地生成阶段未调用设备、模拟器或网络，因此物理/人工最低门槛仍为每端 ${physicalBoundary.length} 项、三端 ` +
    `${physicalBoundary.length * HOSTS.length} 项；本文件不声明任何设备当前可用，也不产生设备通过证明。` +
    `这些项目只能由对应 host 在可归属的真实目标上执行并保存 artifact 后关闭。\n\n` +
    `最低为 unit/simulator 的项目同样默认未验证；代码单测或 fixture 校验不会自动生成 evidence。\n`;
}

export function assertPlanIntegrity(plan, root) {
  const expected = buildDeviceConformancePlan(root);
  if (serializeDeviceConformancePlan(plan) !== serializeDeviceConformancePlan(expected)) {
    throw new Error("device conformance plan drifted from canonical sources");
  }
  return true;
}

function exactKeys(value, keys, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const actual = Object.keys(value).sort(compareUtf8);
  const expected = [...keys].sort(compareUtf8);
  assertExactOrder(actual, expected, `${label} keys`);
}

function tierRank(tier) {
  return PROOF_TIERS.indexOf(tier);
}

function targetKindFor(tier) {
  return {
    unit: "unit-runner",
    simulator: "simulator",
    physical: "physical-device",
    manual: "manual-observation",
  }[tier];
}

// This gate intentionally requires trusted values and artifact bytes from the
// caller. An evidence document cannot make itself trusted by repeating hashes.
export function evaluateDeviceConformanceEvidence({
  plan,
  evidence,
  expectedSourceSha,
  manifestBytes,
  readArtifact,
}) {
  try {
    if (!SOURCE_SHA.test(expectedSourceSha ?? "")) throw new Error("trusted expectedSourceSha is required");
    if (!Buffer.isBuffer(manifestBytes)) throw new Error("trusted UI release manifest bytes are required");
    if (typeof readArtifact !== "function") throw new Error("artifact reader is required");
    exactKeys(evidence, ["$schema", "schemaVersion", "planPath", "planSha256", "releaseId", "records"], "evidence");
    if (evidence.$schema !== DEVICE_CONFORMANCE_EVIDENCE_SCHEMA_PATH || evidence.schemaVersion !== 1) {
      throw new Error("evidence schema identity mismatch");
    }
    if (evidence.planPath !== DEVICE_CONFORMANCE_PLAN_PATH || evidence.planSha256 !== planSha256(plan)) {
      throw new Error("evidence plan identity mismatch");
    }

    const expectedManifestSha = sha256(manifestBytes);
    const expectedReleaseId = `${expectedSourceSha}:${expectedManifestSha}`;
    if (evidence.releaseId !== expectedReleaseId) throw new Error("evidence releaseId does not match trusted context");

    const expectedCases = plan.hosts.flatMap(({ host, cases }) => cases.map((item) => ({ host, item })));
    if (!Array.isArray(evidence.records) || evidence.records.length !== expectedCases.length) {
      throw new Error(`evidence record count ${evidence.records?.length ?? "<missing>"}, expected ${expectedCases.length}`);
    }
    const seen = new Set();

    for (let index = 0; index < expectedCases.length; index += 1) {
      const { host, item } = expectedCases[index];
      const record = evidence.records[index];
      const commonKeys = [
        "host", "sourceSha", "manifestSha", "deviceId", "type", "proofTier", "targetKind", "executedAt",
        "outcome", "requestFixtureSha256", "expectedResultFixtureSha256", "artifact",
      ];
      const outcomeKeys = record?.outcome === "passed" ? ["observedResult"] : ["failure"];
      const manualKeys = record?.proofTier === "manual" ? ["operator", "observation"] : [];
      exactKeys(record, [...commonKeys, ...outcomeKeys, ...manualKeys], `record[${index}]`);

      const key = `${record.host}\0${record.type}`;
      if (seen.has(key)) throw new Error(`duplicate evidence record ${record.host}/${record.type}`);
      seen.add(key);
      if (record.host !== host || record.type !== item.type) throw new Error(`record[${index}] host/type order mismatch`);
      if (record.sourceSha !== expectedSourceSha || record.manifestSha !== expectedManifestSha) {
        throw new Error(`record[${index}] release identity mismatch`);
      }
      if (typeof record.deviceId !== "string" || record.deviceId.length < 4 || PLACEHOLDER_DEVICE_ID.test(record.deviceId)) {
        throw new Error(`record[${index}] deviceId is missing or a placeholder`);
      }
      if (tierRank(record.proofTier) < tierRank(item.minimumProofTier)) throw new Error(`record[${index}] proof tier is too low`);
      if (record.targetKind !== targetKindFor(record.proofTier)) throw new Error(`record[${index}] target kind mismatch`);
      if (!Number.isFinite(Date.parse(record.executedAt))) throw new Error(`record[${index}] executedAt is invalid`);
      if (record.requestFixtureSha256 !== item.requestFixture.fixtureSha256 ||
          record.expectedResultFixtureSha256 !== item.expectedResultFixture.fixtureSha256) {
        throw new Error(`record[${index}] fixture identity mismatch`);
      }
      if (record.outcome !== "passed") throw new Error(`record[${index}] did not pass`);
      if (sha256(canonicalJsonBytes(record.observedResult)) !== item.expectedResultFixture.fixtureSha256) {
        throw new Error(`record[${index}] observed result is not the canonical expected result`);
      }
      if (record.proofTier === "manual" && (!record.operator?.trim() || !record.observation?.trim())) {
        throw new Error(`record[${index}] manual proof lacks operator/observation`);
      }
      exactKeys(record.artifact, ["path", "byteLength", "sha256"], `record[${index}].artifact`);
      if (!/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/-]+$/.test(record.artifact.path)) {
        throw new Error(`record[${index}] artifact path is unsafe`);
      }
      if (!Number.isInteger(record.artifact.byteLength) || record.artifact.byteLength <= 0 || !SHA256.test(record.artifact.sha256)) {
        throw new Error(`record[${index}] artifact metadata is invalid`);
      }
      const artifactBytes = readArtifact(record.artifact.path);
      if (!Buffer.isBuffer(artifactBytes) || artifactBytes.length !== record.artifact.byteLength || sha256(artifactBytes) !== record.artifact.sha256) {
        throw new Error(`record[${index}] artifact bytes do not match digest`);
      }
    }

    return { deviceVerified: true, verifiedCount: expectedCases.length, totalCount: expectedCases.length, errors: [] };
  } catch (error) {
    return {
      deviceVerified: false,
      verifiedCount: 0,
      totalCount: plan?.verificationPolicy?.exactRecordCount ?? 0,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
