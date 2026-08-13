import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  assertArtifactEvidence,
  assertMetadataMatchesRepository,
  buildRepositoryDispatchDocument,
  sha256,
  verifyReleaseArtifactStage,
} from "./release-automation-lib.mjs";

export const HOST_CONSUMER_LOCK_SCHEMA_VERSION = 2;
export const VERIFIED_HOST_RELEASE_SCHEMA_VERSION = 1;
export const HOST_CONSUMER_LOCK_PATH = "READER_UI_CONSUMER.json";

const HOSTS = new Set(["android", "harmonyos", "ios"]);
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const SOURCE_SHA_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const SEMVER_PATTERN = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:(?:0|[1-9]\d*)|(?:\d*[A-Za-z-][0-9A-Za-z-]*))(?:\.(?:(?:0|[1-9]\d*)|(?:\d*[A-Za-z-][0-9A-Za-z-]*)))*)?$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9](?:[A-Za-z0-9_.-]{0,99})$/;
const PROOF_BOUNDARIES = Object.freeze({
  android: "JVM consumer gates and :app:assembleDebug are required before PR publication; physical-device proof is not included.",
  harmonyos: "Static consumer validation only; DevEco/HAP compile and physical-device proof remain blocked on a dedicated runner/device.",
  ios: "iOS shell compile and smoke tests are required before PR publication; physical-device proof is not included.",
});

function plainObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function exactKeys(value, expectedKeys, label) {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} keys must be exactly: ${expected.join(", ")}`);
  }
}

function canonicalString(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value || /[\r\n\0]/.test(value)) {
    throw new Error(`${label} must be a non-empty canonical string`);
  }
  return value;
}

function digest(value, label) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 digest`);
  }
  return value;
}

function sourceSha(value, label) {
  if (typeof value !== "string" || !SOURCE_SHA_PATTERN.test(value)) {
    throw new Error(`${label} must be a lowercase 40- or 64-character Git object id`);
  }
  return value;
}

function repository(value, label) {
  const checked = canonicalString(value, label);
  if (!REPOSITORY_PATTERN.test(checked) || checked.endsWith(".") || checked.includes("..")) {
    throw new Error(`${label} must use canonical owner/repository form`);
  }
  return checked;
}

function hostName(value, label = "host") {
  if (typeof value !== "string" || !HOSTS.has(value)) throw new Error(`${label} must be android, harmonyos, or ios`);
  return value;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function sameJson(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function readJsonFile(file, label) {
  let value;
  try {
    value = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${label} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  return value;
}

export function deterministicHostBumpBranch(releaseId) {
  const checked = canonicalString(releaseId, "releaseId");
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64}):[0-9a-f]{64}$/.test(checked)) {
    throw new Error("releaseId must bind a source SHA and manifest SHA-256");
  }
  return `automation/reader-ui-${crypto.createHash("sha256").update(checked).digest("hex").slice(0, 20)}`;
}

export function assertReleaseIdentity(value, label = "releaseIdentity") {
  const identity = plainObject(value, label);
  exactKeys(identity, ["manifestSha256", "releaseId", "sourceSha", "targetConfigSha256"], label);
  sourceSha(identity.sourceSha, `${label}.sourceSha`);
  digest(identity.manifestSha256, `${label}.manifestSha256`);
  digest(identity.targetConfigSha256, `${label}.targetConfigSha256`);
  if (identity.releaseId !== `${identity.sourceSha}:${identity.manifestSha256}`) {
    throw new Error(`${label}.releaseId must equal sourceSha:manifestSha256`);
  }
  return identity;
}

export function assertVerifiedHostRelease(value) {
  const verified = plainObject(value, "verified host release");
  exactKeys(
    verified,
    [
      "artifact",
      "branch",
      "host",
      "hostRepository",
      "hostRequestSchemaVersion",
      "manifestSha256",
      "proofBoundary",
      "readerUiVersion",
      "releaseId",
      "runtimeActionsSchemaVersion",
      "runtimeActionsSha256",
      "schemaVersion",
      "sourceSha",
      "tag",
      "targetConfigSha256",
    ],
    "verified host release",
  );
  if (verified.schemaVersion !== VERIFIED_HOST_RELEASE_SCHEMA_VERSION) {
    throw new Error(`verified host release schemaVersion must be ${VERIFIED_HOST_RELEASE_SCHEMA_VERSION}`);
  }
  hostName(verified.host, "verified host release host");
  repository(verified.hostRepository, "verified host release hostRepository");
  if (typeof verified.readerUiVersion !== "string" || !SEMVER_PATTERN.test(verified.readerUiVersion)) {
    throw new Error("verified host release readerUiVersion must be strict semantic versioning without build metadata");
  }
  if (verified.tag !== `v${verified.readerUiVersion}`) {
    throw new Error("verified host release tag must match readerUiVersion");
  }
  if (verified.proofBoundary !== PROOF_BOUNDARIES[verified.host]) {
    throw new Error("verified host release proofBoundary does not match the host gate boundary");
  }
  const identity = assertReleaseIdentity({
    releaseId: verified.releaseId,
    sourceSha: verified.sourceSha,
    manifestSha256: verified.manifestSha256,
    targetConfigSha256: verified.targetConfigSha256,
  }, "verified host release identity");
  digest(verified.runtimeActionsSha256, "verified host release runtimeActionsSha256");
  if (!Number.isSafeInteger(verified.runtimeActionsSchemaVersion) || verified.runtimeActionsSchemaVersion < 1) {
    throw new Error("verified host release runtimeActionsSchemaVersion must be a positive safe integer");
  }
  if (typeof verified.hostRequestSchemaVersion !== "string" || !SEMVER_PATTERN.test(verified.hostRequestSchemaVersion)) {
    throw new Error("verified host release hostRequestSchemaVersion must be strict semantic versioning");
  }
  if (verified.branch !== deterministicHostBumpBranch(identity.releaseId)) {
    throw new Error("verified host release branch is not deterministic for releaseId");
  }
  const artifact = plainObject(verified.artifact, "verified host release artifact");
  exactKeys(artifact, ["digest", "id", "inventorySha256", "name", "workflowRunId"], "verified host release artifact");
  assertArtifactEvidence({ id: artifact.id, digest: artifact.digest, inventorySha256: artifact.inventorySha256 });
  canonicalString(artifact.name, "verified host release artifact.name");
  if (typeof artifact.workflowRunId !== "string" || !/^[1-9]\d*$/.test(artifact.workflowRunId)) {
    throw new Error("verified host release artifact.workflowRunId must be a decimal GitHub Actions run id");
  }
  return verified;
}

export function serializeVerifiedHostRelease(value) {
  return `${JSON.stringify(assertVerifiedHostRelease(value), null, 2)}\n`;
}

export function assertDispatchPayloadMatchesStage(payloadValue, staged) {
  const payload = plainObject(payloadValue, "repository dispatch client_payload");
  const artifact = plainObject(payload.artifact, "repository dispatch client_payload.artifact");
  const evidence = assertArtifactEvidence({
    id: artifact.id,
    digest: artifact.digest,
    inventorySha256: artifact.inventorySha256,
  });
  const expected = buildRepositoryDispatchDocument(staged.metadata, evidence).client_payload;
  if (!sameJson(payload, expected)) {
    throw new Error("repository dispatch client_payload does not exactly match verified release metadata and artifact evidence");
  }
  if (payload.artifact.inventorySha256 !== staged.inventorySha256) {
    throw new Error("repository dispatch inventorySha256 does not match downloaded release artifact");
  }
  return payload;
}

export async function verifyGitHubArtifactRecord({ payload, token, fetchImpl = globalThis.fetch }) {
  const checkedPayload = plainObject(payload, "repository dispatch client_payload");
  const source = plainObject(checkedPayload.source, "repository dispatch client_payload.source");
  const artifactEvidence = plainObject(checkedPayload.artifact, "repository dispatch client_payload.artifact");
  repository(source.repository, "repository dispatch client_payload.source.repository");
  sourceSha(source.sha, "repository dispatch client_payload.source.sha");
  if (typeof token !== "string" || token.trim().length === 0) {
    throw new Error("READER_UI_REPO_TOKEN is required to verify the cross-repository artifact");
  }
  if (typeof fetchImpl !== "function") throw new Error("artifact verification requires a fetch implementation");
  const response = await fetchImpl(
    `https://api.github.com/repos/${source.repository}/actions/artifacts/${artifactEvidence.id}`,
    {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "reader-ui-host-consumer",
        "X-GitHub-Api-Version": "2026-03-10",
      },
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (response?.status !== 200) {
    const responseBody = typeof response?.text === "function" ? await response.text() : "";
    const safeBody = responseBody.replace(/[\r\n]+/g, " ").slice(0, 500);
    throw new Error(`Reader UI artifact API returned HTTP ${response?.status ?? "<missing>"}${safeBody ? `: ${safeBody}` : ""}`);
  }
  let record;
  try {
    record = await response.json();
  } catch (error) {
    throw new Error(`Reader UI artifact API returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  plainObject(record, "Reader UI artifact API record");
  if (String(record.id) !== artifactEvidence.id) throw new Error("Reader UI artifact API id does not match dispatch payload");
  if (record.name !== artifactEvidence.name) throw new Error("Reader UI artifact API name does not match dispatch payload");
  if (record.expired !== false) throw new Error("Reader UI artifact is expired or has no authoritative expiry state");
  if (record.digest !== `sha256:${artifactEvidence.digest}`) {
    throw new Error("Reader UI artifact API digest does not match dispatch payload");
  }
  const workflowRun = plainObject(record.workflow_run, "Reader UI artifact API workflow_run");
  if (String(workflowRun.id) !== artifactEvidence.workflowRunId) {
    throw new Error("Reader UI artifact API workflow run id does not match dispatch payload");
  }
  if (workflowRun.head_sha !== source.sha) {
    throw new Error("Reader UI artifact API workflow head SHA does not match dispatch source SHA");
  }
  return record;
}

export async function verifyHostRelease({
  artifactRoot,
  fetchImpl = globalThis.fetch,
  host,
  hostRepository,
  payload,
  sourceRoot,
  token,
}) {
  const checkedHost = hostName(host);
  const checkedHostRepository = repository(hostRepository, "hostRepository");
  const staged = verifyReleaseArtifactStage(path.resolve(artifactRoot));
  const checkedPayload = assertDispatchPayloadMatchesStage(payload, staged);

  const resolvedSourceSha = execFileSync("git", ["-C", path.resolve(sourceRoot), "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  if (resolvedSourceSha !== checkedPayload.source.sha) {
    throw new Error(`checked-out Reader UI source SHA ${resolvedSourceSha} does not match dispatch ${checkedPayload.source.sha}`);
  }
  assertMetadataMatchesRepository(path.resolve(sourceRoot), staged.metadata, staged.manifestBytes);

  const target = staged.hostTargets.find((item) => item.host === checkedHost);
  if (!target || target.repository !== checkedHostRepository) {
    throw new Error(`release host target ${checkedHost} does not authorize repository ${checkedHostRepository}`);
  }
  await verifyGitHubArtifactRecord({ payload: checkedPayload, token, fetchImpl });

  const versionDocument = readJsonFile(path.join(sourceRoot, "contracts", "VERSION.json"), "Reader UI contracts/VERSION.json");
  const runtimeActionsBytes = fs.readFileSync(path.join(sourceRoot, "ui-spec", "runtime-actions.json"));
  const runtimeActions = JSON.parse(runtimeActionsBytes.toString("utf8"));
  if (versionDocument.version !== staged.metadata.version) throw new Error("Reader UI VERSION.json version does not match release metadata");
  if (sha256(runtimeActionsBytes) !== staged.metadata.runtimeActionsSha256) {
    throw new Error("Reader UI runtime-actions.json does not match release metadata");
  }
  if (!Number.isSafeInteger(runtimeActions.schemaVersion) || runtimeActions.schemaVersion < 1) {
    throw new Error("Reader UI runtime-actions.json schemaVersion is invalid");
  }
  const hostRequestSchemaVersion = versionDocument.schema?.["host-request"];
  if (typeof hostRequestSchemaVersion !== "string" || !SEMVER_PATTERN.test(hostRequestSchemaVersion)) {
    throw new Error("Reader UI HostRequest schema version is invalid");
  }

  const verified = {
    schemaVersion: VERIFIED_HOST_RELEASE_SCHEMA_VERSION,
    host: checkedHost,
    hostRepository: checkedHostRepository,
    releaseId: staged.metadata.releaseId,
    readerUiVersion: staged.metadata.version,
    tag: staged.metadata.tag,
    sourceSha: staged.metadata.source.sha,
    manifestSha256: staged.metadata.manifestSha256,
    targetConfigSha256: staged.metadata.targetConfigSha256,
    proofBoundary: PROOF_BOUNDARIES[checkedHost],
    hostRequestSchemaVersion,
    runtimeActionsSchemaVersion: runtimeActions.schemaVersion,
    runtimeActionsSha256: staged.metadata.runtimeActionsSha256,
    artifact: {
      id: checkedPayload.artifact.id,
      name: checkedPayload.artifact.name,
      digest: checkedPayload.artifact.digest,
      inventorySha256: checkedPayload.artifact.inventorySha256,
      workflowRunId: checkedPayload.artifact.workflowRunId,
    },
    branch: deterministicHostBumpBranch(staged.metadata.releaseId),
  };
  return assertVerifiedHostRelease(verified);
}

function assertCurrentHostLock(value) {
  const lock = plainObject(value, "host consumer lock");
  const schemaKeys = [
    "blockedProof",
    "host",
    "hostRequestSchemaVersion",
    "knownDifferences",
    "readerUiVersion",
    "rollout",
    "runtimeActionsSchemaVersion",
    "runtimeActionsSha256",
    "schemaVersion",
  ];
  if (lock.schemaVersion === HOST_CONSUMER_LOCK_SCHEMA_VERSION) schemaKeys.push("releaseIdentity");
  else if (lock.schemaVersion !== 1) throw new Error("host consumer lock schemaVersion must be 1 or 2");
  exactKeys(lock, schemaKeys, "host consumer lock");
  hostName(lock.host, "host consumer lock host");
  plainObject(lock.rollout, "host consumer lock rollout");
  if (!Array.isArray(lock.knownDifferences)) throw new Error("host consumer lock knownDifferences must be an array");
  if (!Array.isArray(lock.blockedProof)) throw new Error("host consumer lock blockedProof must be an array");
  if (lock.schemaVersion === HOST_CONSUMER_LOCK_SCHEMA_VERSION) assertReleaseIdentity(lock.releaseIdentity);
  return lock;
}

export function updateHostConsumerLock(lockValue, verifiedValue) {
  const current = assertCurrentHostLock(lockValue);
  const verified = assertVerifiedHostRelease(verifiedValue);
  if (current.host !== verified.host) {
    throw new Error(`host consumer lock ${current.host} cannot consume verified ${verified.host} release`);
  }
  if (current.schemaVersion === HOST_CONSUMER_LOCK_SCHEMA_VERSION && current.releaseIdentity.releaseId === verified.releaseId) {
    const sameReleaseFields =
      current.readerUiVersion === verified.readerUiVersion &&
      current.hostRequestSchemaVersion === verified.hostRequestSchemaVersion &&
      current.runtimeActionsSchemaVersion === verified.runtimeActionsSchemaVersion &&
      current.runtimeActionsSha256 === verified.runtimeActionsSha256 &&
      sameJson(current.releaseIdentity, {
        releaseId: verified.releaseId,
        sourceSha: verified.sourceSha,
        manifestSha256: verified.manifestSha256,
        targetConfigSha256: verified.targetConfigSha256,
      });
    if (!sameReleaseFields) throw new Error("host consumer lock already records releaseId with conflicting version, hash, or identity fields");
  }

  const updated = {
    schemaVersion: HOST_CONSUMER_LOCK_SCHEMA_VERSION,
    host: current.host,
    readerUiVersion: verified.readerUiVersion,
    hostRequestSchemaVersion: verified.hostRequestSchemaVersion,
    runtimeActionsSchemaVersion: verified.runtimeActionsSchemaVersion,
    runtimeActionsSha256: verified.runtimeActionsSha256,
    releaseIdentity: {
      releaseId: verified.releaseId,
      sourceSha: verified.sourceSha,
      manifestSha256: verified.manifestSha256,
      targetConfigSha256: verified.targetConfigSha256,
    },
    rollout: structuredClone(current.rollout),
    knownDifferences: structuredClone(current.knownDifferences),
    blockedProof: structuredClone(current.blockedProof),
  };
  for (const protectedField of ["host", "rollout", "knownDifferences", "blockedProof"]) {
    if (!sameJson(updated[protectedField], current[protectedField])) {
      throw new Error(`host consumer lock updater changed protected field ${protectedField}`);
    }
  }
  const contents = `${JSON.stringify(updated, null, 2)}\n`;
  return {
    changed: contents !== `${JSON.stringify(current, null, 2)}\n`,
    contents,
    lock: updated,
  };
}

export function writeHostConsumerLock(lockPath, verifiedValue) {
  const absolutePath = path.resolve(lockPath);
  if (!fs.existsSync(absolutePath) || fs.lstatSync(absolutePath).isSymbolicLink() || !fs.statSync(absolutePath).isFile()) {
    throw new Error(`${HOST_CONSUMER_LOCK_PATH} must be an existing regular file`);
  }
  const currentBytes = fs.readFileSync(absolutePath, "utf8");
  const result = updateHostConsumerLock(JSON.parse(currentBytes), verifiedValue);
  if (!result.changed && currentBytes !== result.contents) {
    throw new Error("host consumer lock is not canonical two-space JSON with LF");
  }
  if (result.changed) {
    const temporaryPath = `${absolutePath}.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
    try {
      fs.writeFileSync(temporaryPath, result.contents, { flag: "wx", mode: fs.statSync(absolutePath).mode & 0o777 });
      fs.renameSync(temporaryPath, absolutePath);
    } finally {
      if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath);
    }
  }
  return result;
}
