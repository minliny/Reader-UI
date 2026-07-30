import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  assertSafeRelativePath,
  resolveSafeRegularFile,
  sortPaths,
} from "./manifest-files.mjs";
import {
  readCheckedReleaseManifest,
  RELEASE_MANIFEST_PATH,
  serializeReleaseManifest,
} from "./manifest-lib.mjs";

export const RELEASE_EVENT_TYPE = "reader-ui-updated";
export const RELEASE_METADATA_SCHEMA_VERSION = 2;
export const RELEASE_ARTIFACT_INVENTORY_SCHEMA_VERSION = 1;
export const RELEASE_DISPATCH_PLAN_SCHEMA_VERSION = 1;
export const RELEASE_METADATA_PATH = "UI_RELEASE_METADATA.json";
export const RELEASE_ARTIFACT_MANIFEST_PATH = "UI_RELEASE_MANIFEST.json";
export const RELEASE_ARTIFACT_INVENTORY_PATH = "UI_RELEASE_ARTIFACT_INVENTORY.json";
export const RELEASE_ARTIFACT_SOURCE_PREFIX = "source";
export const RELEASE_HOST_TARGETS_PATH = "tools/release/release-host-targets.json";
export const RELEASE_ARTIFACT_HOST_TARGETS_PATH = "release-host-targets.json";

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const SOURCE_SHA_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const NUMERIC_IDENTIFIER = "(?:0|[1-9]\\d*)";
const NON_NUMERIC_IDENTIFIER = "(?:\\d*[A-Za-z-][0-9A-Za-z-]*)";
const PRERELEASE_IDENTIFIER = `(?:${NUMERIC_IDENTIFIER}|${NON_NUMERIC_IDENTIFIER})`;
const SEMVER_PATTERN = new RegExp(
  `^${NUMERIC_IDENTIFIER}\\.${NUMERIC_IDENTIFIER}\\.${NUMERIC_IDENTIFIER}` +
    `(?:-${PRERELEASE_IDENTIFIER}(?:\\.${PRERELEASE_IDENTIFIER})*)?$`,
);
const REPOSITORY_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9](?:[A-Za-z0-9_.-]{0,99})$/;
const MAX_TARGET_REPOSITORIES = 20;
const REQUIRED_HOST_REPOSITORIES = Object.freeze({
  android: "Reader-for-Android",
  harmonyos: "Reader-for-HarmonyOS",
  ios: "Reader-for-iOS",
});

export function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function assertPlainObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function assertExactKeys(value, keys, label) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} keys must be exactly: ${expected.join(", ")}`);
  }
}

function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value || /[\r\n\0]/.test(value)) {
    throw new Error(`${label} must be a non-empty canonical string`);
  }
  return value;
}

function assertRepository(value, label) {
  const repository = assertString(value, label);
  if (!REPOSITORY_PATTERN.test(repository) || repository.endsWith(".") || repository.includes("..")) {
    throw new Error(`${label} must use the canonical owner/repository form`);
  }
  return repository;
}

function assertSha256(value, label) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 digest`);
  }
  return value;
}

function readJsonBytes(bytes, label) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`${label} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function safePath(root, relativePath) {
  assertSafeRelativePath(relativePath);
  return path.join(root, ...relativePath.split("/"));
}

export function parseTargetRepositories(rawValue) {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    throw new Error("READER_HOST_SYNC_REPOSITORIES is required and must not be empty");
  }
  const repositories = rawValue.trim().split(/[\s,]+/).filter(Boolean);
  if (repositories.length === 0) {
    throw new Error("READER_HOST_SYNC_REPOSITORIES must contain at least one target repository");
  }
  if (repositories.length > MAX_TARGET_REPOSITORIES) {
    throw new Error(`READER_HOST_SYNC_REPOSITORIES exceeds ${MAX_TARGET_REPOSITORIES} targets`);
  }
  repositories.forEach((repository, index) => assertRepository(repository, `target repository ${index + 1}`));
  if (new Set(repositories.map((repository) => repository.toLowerCase())).size !== repositories.length) {
    throw new Error("READER_HOST_SYNC_REPOSITORIES contains duplicate targets");
  }
  return repositories;
}

function parseReleaseHostTargets(rawBytes, label) {
  const config = assertPlainObject(readJsonBytes(rawBytes, label), label);
  assertExactKeys(config, ["schemaVersion", "targets"], label);
  if (config.schemaVersion !== 2) throw new Error(`${label} schemaVersion must be 2`);
  if (!Array.isArray(config.targets)) throw new Error(`${label} targets must be an array`);
  const expectedHosts = Object.keys(REQUIRED_HOST_REPOSITORIES).sort();
  const hosts = [];
  const allRepositories = [];
  const activeRepositories = [];
  for (const [index, value] of config.targets.entries()) {
    const target = assertPlainObject(value, `${label} target ${index + 1}`);
    assertExactKeys(
      target,
      ["host", "reason", "releaseStatus", "repository"],
      `${label} target ${index + 1}`,
    );
    const host = assertString(target.host, `${label} target ${index + 1}.host`);
    const repository = assertRepository(target.repository, `${label} target ${index + 1}.repository`);
    const releaseStatus = assertString(
      target.releaseStatus,
      `${label} target ${index + 1}.releaseStatus`,
    );
    assertString(target.reason, `${label} target ${index + 1}.reason`);
    if (releaseStatus !== "active" && releaseStatus !== "deferred") {
      throw new Error(`${label} target ${index + 1}.releaseStatus must be active or deferred`);
    }
    const requiredName = REQUIRED_HOST_REPOSITORIES[host];
    if (!requiredName) throw new Error(`${label} contains unsupported host ${host}`);
    if (repository.split("/")[1] !== requiredName) {
      throw new Error(`${label} host ${host} must target repository ${requiredName}`);
    }
    hosts.push(host);
    allRepositories.push(repository);
    if (releaseStatus === "active") activeRepositories.push(repository);
  }
  if (hosts.length !== expectedHosts.length || hosts.some((host, index) => host !== expectedHosts[index])) {
    throw new Error(`${label} hosts must be exactly ${expectedHosts.join(", ")} in canonical order`);
  }
  if (
    new Set(allRepositories.map((repository) => repository.toLowerCase())).size !==
    allRepositories.length
  ) {
    throw new Error(`${label} contains duplicate repositories`);
  }
  if (activeRepositories.length === 0) {
    throw new Error(`${label} must contain at least one active release target`);
  }
  return { config, repositories: activeRepositories, allRepositories };
}

export function readReleaseHostTargets(root) {
  const rawBytes = fs.readFileSync(resolveSafeRegularFile(root, RELEASE_HOST_TARGETS_PATH));
  return { rawBytes, ...parseReleaseHostTargets(rawBytes, RELEASE_HOST_TARGETS_PATH) };
}

export function parseConfiguredTargetRepositories(root, rawValue) {
  const configured = parseTargetRepositories(rawValue);
  const authoritative = readReleaseHostTargets(root).repositories;
  const expected = sortPaths(authoritative);
  const actual = sortPaths(configured);
  if (actual.length !== expected.length || actual.some((repository, index) => repository !== expected[index])) {
    const missing = expected.filter((repository) => !actual.includes(repository));
    const extra = actual.filter((repository) => !expected.includes(repository));
    throw new Error(
      `READER_HOST_SYNC_REPOSITORIES must exactly match ${RELEASE_HOST_TARGETS_PATH}` +
        `${missing.length ? `; missing=${missing.join(",")}` : ""}` +
        `${extra.length ? `; extra=${extra.join(",")}` : ""}`,
    );
  }
  return authoritative;
}

export function assertReleaseMetadata(value) {
  const metadata = assertPlainObject(value, "release metadata");
  assertExactKeys(
    metadata,
    [
      "artifact",
      "eventType",
      "manifestSha256",
      "releaseId",
      "runtimeActionsSha256",
      "runtimePayloadContractsSchemaVersion",
      "runtimePayloadContractsSha256",
      "schemaVersion",
      "source",
      "tag",
      "targetConfigSha256",
      "version",
    ],
    "release metadata",
  );
  if (metadata.schemaVersion !== RELEASE_METADATA_SCHEMA_VERSION) {
    throw new Error(`release metadata schemaVersion must be ${RELEASE_METADATA_SCHEMA_VERSION}`);
  }
  if (metadata.eventType !== RELEASE_EVENT_TYPE) {
    throw new Error(`release metadata eventType must be ${RELEASE_EVENT_TYPE}`);
  }
  if (typeof metadata.version !== "string" || !SEMVER_PATTERN.test(metadata.version)) {
    throw new Error("release metadata version must be strict semantic versioning without build metadata");
  }
  if (metadata.tag !== `v${metadata.version}`) {
    throw new Error(`release metadata tag must be v${metadata.version}`);
  }
  assertSha256(metadata.runtimeActionsSha256, "release metadata runtimeActionsSha256");
  if (
    !Number.isSafeInteger(metadata.runtimePayloadContractsSchemaVersion) ||
    metadata.runtimePayloadContractsSchemaVersion < 1
  ) {
    throw new Error(
      "release metadata runtimePayloadContractsSchemaVersion must be a positive safe integer",
    );
  }
  assertSha256(
    metadata.runtimePayloadContractsSha256,
    "release metadata runtimePayloadContractsSha256",
  );
  assertSha256(metadata.manifestSha256, "release metadata manifestSha256");
  assertSha256(metadata.targetConfigSha256, "release metadata targetConfigSha256");

  const source = assertPlainObject(metadata.source, "release metadata source");
  assertExactKeys(source, ["ref", "repository", "sha"], "release metadata source");
  assertRepository(source.repository, "release metadata source.repository");
  if (source.ref !== `refs/tags/${metadata.tag}`) {
    throw new Error(`release metadata source.ref must be refs/tags/${metadata.tag}`);
  }
  if (typeof source.sha !== "string" || !SOURCE_SHA_PATTERN.test(source.sha)) {
    throw new Error("release metadata source.sha must be a lowercase 40- or 64-character Git object id");
  }
  if (metadata.releaseId !== `${source.sha}:${metadata.manifestSha256}`) {
    throw new Error("release metadata releaseId must bind source.sha and manifestSha256");
  }

  const artifact = assertPlainObject(metadata.artifact, "release metadata artifact");
  assertExactKeys(
    artifact,
    ["inventoryPath", "manifestPath", "name", "sourcePrefix", "workflowRunId"],
    "release metadata artifact",
  );
  if (artifact.name !== `reader-ui-${metadata.tag}`) {
    throw new Error(`release metadata artifact.name must be reader-ui-${metadata.tag}`);
  }
  if (artifact.manifestPath !== RELEASE_ARTIFACT_MANIFEST_PATH) {
    throw new Error(`release metadata artifact.manifestPath must be ${RELEASE_ARTIFACT_MANIFEST_PATH}`);
  }
  if (artifact.inventoryPath !== RELEASE_ARTIFACT_INVENTORY_PATH) {
    throw new Error(`release metadata artifact.inventoryPath must be ${RELEASE_ARTIFACT_INVENTORY_PATH}`);
  }
  if (artifact.sourcePrefix !== RELEASE_ARTIFACT_SOURCE_PREFIX) {
    throw new Error(`release metadata artifact.sourcePrefix must be ${RELEASE_ARTIFACT_SOURCE_PREFIX}`);
  }
  if (typeof artifact.workflowRunId !== "string" || !/^[1-9]\d*$/.test(artifact.workflowRunId)) {
    throw new Error("release metadata artifact.workflowRunId must be a decimal GitHub Actions run id");
  }
  return metadata;
}

export function serializeReleaseMetadata(metadata) {
  assertReleaseMetadata(metadata);
  return `${JSON.stringify(metadata, null, 2)}\n`;
}

export function assertReleaseExecutionContext(metadataValue, context) {
  const metadata = assertReleaseMetadata(metadataValue);
  const expected = assertPlainObject(context, "release execution context");
  const checks = [
    ["source repository", expected.sourceRepository, metadata.source.repository],
    ["source ref", expected.sourceRef, metadata.source.ref],
    ["source SHA", expected.sourceSha, metadata.source.sha],
    ["workflow run id", expected.workflowRunId, metadata.artifact.workflowRunId],
    ["artifact name", expected.artifactName, metadata.artifact.name],
  ];
  for (const [label, actual, wanted] of checks) {
    if (typeof actual !== "string" || actual.length === 0) {
      throw new Error(`release execution context ${label} is required`);
    }
    if (actual !== wanted) throw new Error(`release execution context ${label} ${actual} != ${wanted}`);
  }
  return metadata;
}

function checkedManifest(root) {
  const result = readCheckedReleaseManifest(root);
  if (!result.ok) throw new Error(`release manifest validation failed: ${result.messages.join("; ")}`);
  return result;
}

export function buildReleaseMetadata(root, context) {
  const result = checkedManifest(root);
  const manifestBytes = Buffer.from(serializeReleaseManifest(result.expected), "utf8");
  const trackedBytes = fs.readFileSync(path.join(root, RELEASE_MANIFEST_PATH));
  if (!trackedBytes.equals(manifestBytes)) {
    throw new Error(`${RELEASE_MANIFEST_PATH} must exactly match the generated release manifest`);
  }

  const runtimeActionsPath = "ui-spec/runtime-actions.json";
  const runtimeActionsBytes = fs.readFileSync(path.join(root, runtimeActionsPath));
  const runtimeActionsSha256 = sha256(runtimeActionsBytes);
  const runtimeManifestEntry = result.actual.files.find((entry) => entry.path === runtimeActionsPath);
  if (!runtimeManifestEntry || runtimeManifestEntry.sha256 !== runtimeActionsSha256) {
    throw new Error(`${runtimeActionsPath} is not locked by ${RELEASE_MANIFEST_PATH}`);
  }
  const runtimePayloadContractsPath = "ui-spec/runtime-payload-contracts.json";
  const runtimePayloadContractsBytes = fs.readFileSync(
    path.join(root, runtimePayloadContractsPath),
  );
  const runtimePayloadContractsSha256 = sha256(runtimePayloadContractsBytes);
  const runtimePayloadContracts = readJsonBytes(
    runtimePayloadContractsBytes,
    runtimePayloadContractsPath,
  );
  if (
    !Number.isSafeInteger(runtimePayloadContracts.schemaVersion) ||
    runtimePayloadContracts.schemaVersion < 1
  ) {
    throw new Error(`${runtimePayloadContractsPath} schemaVersion is invalid`);
  }
  const runtimePayloadManifestEntry = result.actual.files.find(
    (entry) => entry.path === runtimePayloadContractsPath,
  );
  if (
    !runtimePayloadManifestEntry ||
    runtimePayloadManifestEntry.sha256 !== runtimePayloadContractsSha256
  ) {
    throw new Error(
      `${runtimePayloadContractsPath} is not locked by ${RELEASE_MANIFEST_PATH}`,
    );
  }
  const targetConfig = readReleaseHostTargets(root);
  const manifestSha256 = sha256(manifestBytes);
  const metadata = {
    schemaVersion: RELEASE_METADATA_SCHEMA_VERSION,
    eventType: RELEASE_EVENT_TYPE,
    version: result.actual.version,
    tag: context.tag,
    releaseId: `${context.sourceSha}:${manifestSha256}`,
    runtimeActionsSha256,
    runtimePayloadContractsSchemaVersion: runtimePayloadContracts.schemaVersion,
    runtimePayloadContractsSha256,
    manifestSha256,
    targetConfigSha256: sha256(targetConfig.rawBytes),
    source: {
      repository: context.sourceRepository,
      ref: context.sourceRef,
      sha: context.sourceSha,
    },
    artifact: {
      name: context.artifactName,
      workflowRunId: context.workflowRunId,
      manifestPath: RELEASE_ARTIFACT_MANIFEST_PATH,
      inventoryPath: RELEASE_ARTIFACT_INVENTORY_PATH,
      sourcePrefix: RELEASE_ARTIFACT_SOURCE_PREFIX,
    },
  };
  assertReleaseMetadata(metadata);
  return { metadata, manifest: result.actual, manifestBytes, targetConfigBytes: targetConfig.rawBytes };
}

export function verifyReleaseArtifact(metadataValue, artifactManifestBytes) {
  const metadata = assertReleaseMetadata(metadataValue);
  const bytes = Buffer.isBuffer(artifactManifestBytes) ? artifactManifestBytes : Buffer.from(artifactManifestBytes);
  if (sha256(bytes) !== metadata.manifestSha256) {
    throw new Error("downloaded release artifact manifest SHA-256 does not match release metadata");
  }
  const manifest = readJsonBytes(bytes, "downloaded release artifact manifest");
  if (manifest.version !== metadata.version) {
    throw new Error(`downloaded release artifact manifest version ${manifest.version ?? "<missing>"} != ${metadata.version}`);
  }
  return manifest;
}

function inventoryEntry(relativePath, bytes) {
  return { path: assertSafeRelativePath(relativePath), byteLength: bytes.length, sha256: sha256(bytes) };
}

function assertArtifactInventory(value) {
  const inventory = assertPlainObject(value, "release artifact inventory");
  assertExactKeys(
    inventory,
    ["files", "hashAlgorithm", "manifestSha256", "schemaVersion", "sourceFileCount", "targetConfigSha256"],
    "release artifact inventory",
  );
  if (inventory.schemaVersion !== RELEASE_ARTIFACT_INVENTORY_SCHEMA_VERSION) {
    throw new Error(`release artifact inventory schemaVersion must be ${RELEASE_ARTIFACT_INVENTORY_SCHEMA_VERSION}`);
  }
  if (inventory.hashAlgorithm !== "sha256") throw new Error("release artifact inventory hashAlgorithm must be sha256");
  assertSha256(inventory.manifestSha256, "release artifact inventory manifestSha256");
  assertSha256(inventory.targetConfigSha256, "release artifact inventory targetConfigSha256");
  if (!Number.isSafeInteger(inventory.sourceFileCount) || inventory.sourceFileCount < 1) {
    throw new Error("release artifact inventory sourceFileCount must be a positive safe integer");
  }
  if (!Array.isArray(inventory.files)) throw new Error("release artifact inventory files must be an array");
  const paths = inventory.files.map((value, index) => {
    const entry = assertPlainObject(value, `release artifact inventory file ${index + 1}`);
    assertExactKeys(entry, ["byteLength", "path", "sha256"], `release artifact inventory file ${index + 1}`);
    const relativePath = assertSafeRelativePath(entry.path);
    if (!Number.isSafeInteger(entry.byteLength) || entry.byteLength < 0) {
      throw new Error(`release artifact inventory file ${relativePath} has invalid byteLength`);
    }
    assertSha256(entry.sha256, `release artifact inventory file ${relativePath} sha256`);
    return relativePath;
  });
  if (paths.includes(RELEASE_ARTIFACT_INVENTORY_PATH)) {
    throw new Error("release artifact inventory must not recursively list itself");
  }
  const sorted = sortPaths(paths);
  if (new Set(paths).size !== paths.length || paths.some((value, index) => value !== sorted[index])) {
    throw new Error("release artifact inventory files must be sorted and unique");
  }
  return inventory;
}

function serializeArtifactInventory(inventory) {
  assertArtifactInventory(inventory);
  return `${JSON.stringify(inventory, null, 2)}\n`;
}

function prepareEmptyStage(stageRoot) {
  const absolute = path.resolve(stageRoot);
  if (fs.existsSync(absolute)) {
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("release artifact stage must be a real directory");
    if (fs.readdirSync(absolute).length !== 0) throw new Error("release artifact stage must be empty");
  } else {
    fs.mkdirSync(absolute, { recursive: true });
  }
  return absolute;
}

function writeStageFile(stageRoot, relativePath, bytes) {
  const destination = safePath(stageRoot, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes, { flag: "wx", mode: 0o600 });
}

export function writeReleaseArtifactStage(sourceRoot, stageRoot, release) {
  const metadata = assertReleaseMetadata(release.metadata);
  const manifest = verifyReleaseArtifact(metadata, release.manifestBytes);
  const targetConfig = parseReleaseHostTargets(release.targetConfigBytes, RELEASE_ARTIFACT_HOST_TARGETS_PATH);
  if (sha256(release.targetConfigBytes) !== metadata.targetConfigSha256) {
    throw new Error("release host target config SHA-256 does not match release metadata");
  }
  const absoluteStage = prepareEmptyStage(stageRoot);
  const payloads = new Map([
    [RELEASE_METADATA_PATH, Buffer.from(serializeReleaseMetadata(metadata), "utf8")],
    [RELEASE_ARTIFACT_MANIFEST_PATH, Buffer.from(release.manifestBytes)],
    [RELEASE_ARTIFACT_HOST_TARGETS_PATH, Buffer.from(release.targetConfigBytes)],
  ]);
  for (const entry of manifest.files) {
    const sourcePath = resolveSafeRegularFile(sourceRoot, entry.path);
    const bytes = fs.readFileSync(sourcePath);
    if (bytes.length !== entry.byteLength || sha256(bytes) !== entry.sha256) {
      throw new Error(`release source changed while staging: ${entry.path}`);
    }
    payloads.set(`${RELEASE_ARTIFACT_SOURCE_PREFIX}/${entry.path}`, bytes);
  }
  for (const relativePath of sortPaths(payloads.keys())) writeStageFile(absoluteStage, relativePath, payloads.get(relativePath));
  const inventory = {
    schemaVersion: RELEASE_ARTIFACT_INVENTORY_SCHEMA_VERSION,
    hashAlgorithm: "sha256",
    manifestSha256: metadata.manifestSha256,
    targetConfigSha256: metadata.targetConfigSha256,
    sourceFileCount: manifest.files.length,
    files: sortPaths(payloads.keys()).map((relativePath) => inventoryEntry(relativePath, payloads.get(relativePath))),
  };
  writeStageFile(absoluteStage, RELEASE_ARTIFACT_INVENTORY_PATH, serializeArtifactInventory(inventory));
  const verified = verifyReleaseArtifactStage(absoluteStage);
  if (verified.targetRepositories.join("\n") !== targetConfig.repositories.join("\n")) {
    throw new Error("staged release host targets changed during materialization");
  }
  return verified;
}

function listStageFiles(stageRoot) {
  const absoluteRoot = fs.realpathSync(stageRoot);
  const files = [];
  function visit(absoluteParent, relativeParent) {
    const entries = fs.readdirSync(absoluteParent, { withFileTypes: true })
      .sort((left, right) => Buffer.compare(Buffer.from(left.name), Buffer.from(right.name)));
    for (const entry of entries) {
      const relativePath = relativeParent ? `${relativeParent}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) throw new Error(`release artifact stage contains symlink: ${relativePath}`);
      if (entry.isDirectory()) visit(path.join(absoluteParent, entry.name), relativePath);
      else if (entry.isFile()) files.push(assertSafeRelativePath(relativePath));
      else throw new Error(`release artifact stage contains non-file entry: ${relativePath}`);
    }
  }
  visit(absoluteRoot, "");
  return sortPaths(files);
}

export function verifyReleaseArtifactStage(stageRoot) {
  const absoluteStage = path.resolve(stageRoot);
  if (!fs.existsSync(absoluteStage) || fs.lstatSync(absoluteStage).isSymbolicLink() || !fs.statSync(absoluteStage).isDirectory()) {
    throw new Error("downloaded release artifact stage must be a real directory");
  }
  const actualFiles = listStageFiles(absoluteStage);
  if (!actualFiles.includes(RELEASE_ARTIFACT_INVENTORY_PATH)) {
    throw new Error(`release artifact stage is missing ${RELEASE_ARTIFACT_INVENTORY_PATH}`);
  }
  const rawInventory = fs.readFileSync(safePath(absoluteStage, RELEASE_ARTIFACT_INVENTORY_PATH));
  const inventory = assertArtifactInventory(readJsonBytes(rawInventory, RELEASE_ARTIFACT_INVENTORY_PATH));
  if (rawInventory.toString("utf8") !== serializeArtifactInventory(inventory)) {
    throw new Error("release artifact inventory is not canonical two-space JSON with LF");
  }
  const expectedFiles = sortPaths([RELEASE_ARTIFACT_INVENTORY_PATH, ...inventory.files.map((entry) => entry.path)]);
  if (actualFiles.length !== expectedFiles.length || actualFiles.some((value, index) => value !== expectedFiles[index])) {
    const missing = expectedFiles.filter((value) => !actualFiles.includes(value));
    const extra = actualFiles.filter((value) => !expectedFiles.includes(value));
    throw new Error(
      "release artifact stage file inventory mismatch" +
        `${missing.length ? `; missing=${missing.join(",")}` : ""}` +
        `${extra.length ? `; extra=${extra.join(",")}` : ""}`,
    );
  }
  for (const entry of inventory.files) {
    const bytes = fs.readFileSync(safePath(absoluteStage, entry.path));
    if (bytes.length !== entry.byteLength || sha256(bytes) !== entry.sha256) {
      throw new Error(`release artifact stage digest mismatch: ${entry.path}`);
    }
  }

  const rawMetadata = fs.readFileSync(safePath(absoluteStage, RELEASE_METADATA_PATH), "utf8");
  const metadata = assertReleaseMetadata(JSON.parse(rawMetadata));
  if (rawMetadata !== serializeReleaseMetadata(metadata)) {
    throw new Error("release artifact metadata is not canonical two-space JSON with LF");
  }
  const manifestBytes = fs.readFileSync(safePath(absoluteStage, RELEASE_ARTIFACT_MANIFEST_PATH));
  const manifest = verifyReleaseArtifact(metadata, manifestBytes);
  const targetConfigBytes = fs.readFileSync(safePath(absoluteStage, RELEASE_ARTIFACT_HOST_TARGETS_PATH));
  const targetConfig = parseReleaseHostTargets(targetConfigBytes, RELEASE_ARTIFACT_HOST_TARGETS_PATH);
  if (sha256(targetConfigBytes) !== metadata.targetConfigSha256) {
    throw new Error("release artifact host target config SHA-256 does not match metadata");
  }
  if (inventory.manifestSha256 !== metadata.manifestSha256 || inventory.targetConfigSha256 !== metadata.targetConfigSha256) {
    throw new Error("release artifact inventory hashes do not match metadata");
  }
  const expectedSources = sortPaths(manifest.files.map((entry) => `${RELEASE_ARTIFACT_SOURCE_PREFIX}/${entry.path}`));
  const expectedPayloads = sortPaths([
    RELEASE_METADATA_PATH,
    RELEASE_ARTIFACT_MANIFEST_PATH,
    RELEASE_ARTIFACT_HOST_TARGETS_PATH,
    ...expectedSources,
  ]);
  const inventoryPaths = inventory.files.map((entry) => entry.path);
  if (
    inventoryPaths.length !== expectedPayloads.length ||
    inventoryPaths.some((value, index) => value !== expectedPayloads[index])
  ) {
    const missing = expectedPayloads.filter((value) => !inventoryPaths.includes(value));
    const extra = inventoryPaths.filter((value) => !expectedPayloads.includes(value));
    throw new Error(
      "release artifact inventory payload boundary mismatch" +
        `${missing.length ? `; missing=${missing.join(",")}` : ""}` +
        `${extra.length ? `; extra=${extra.join(",")}` : ""}`,
    );
  }
  const inventoryByPath = new Map(inventory.files.map((entry) => [entry.path, entry]));
  for (const manifestEntry of manifest.files) {
    const sourcePath = `${RELEASE_ARTIFACT_SOURCE_PREFIX}/${manifestEntry.path}`;
    const stagedEntry = inventoryByPath.get(sourcePath);
    if (
      !stagedEntry ||
      stagedEntry.byteLength !== manifestEntry.byteLength ||
      stagedEntry.sha256 !== manifestEntry.sha256
    ) {
      throw new Error(`release artifact source digest does not match UI_RELEASE_MANIFEST.json: ${manifestEntry.path}`);
    }
  }
  if (inventory.sourceFileCount !== expectedSources.length) {
    throw new Error("release artifact source inventory does not exactly match UI_RELEASE_MANIFEST.json");
  }
  return {
    metadata,
    manifest,
    manifestBytes,
    inventory,
    inventorySha256: sha256(rawInventory),
    targetConfigBytes,
    hostTargets: targetConfig.config.targets.map((target) => ({ ...target })),
    targetRepositories: targetConfig.repositories,
  };
}

export function assertMetadataMatchesRepository(root, metadataValue, artifactManifestBytes) {
  const metadata = assertReleaseMetadata(metadataValue);
  verifyReleaseArtifact(metadata, artifactManifestBytes);
  const expected = buildReleaseMetadata(root, {
    tag: metadata.tag,
    sourceRepository: metadata.source.repository,
    sourceRef: metadata.source.ref,
    sourceSha: metadata.source.sha,
    workflowRunId: metadata.artifact.workflowRunId,
    artifactName: metadata.artifact.name,
  });
  if (serializeReleaseMetadata(metadata) !== serializeReleaseMetadata(expected.metadata)) {
    throw new Error("release artifact metadata does not match the checked-out source repository");
  }
  if (!Buffer.from(artifactManifestBytes).equals(expected.manifestBytes)) {
    throw new Error("release artifact manifest does not match the checked-out source repository");
  }
  return metadata;
}

export function assertArtifactEvidence(value) {
  const evidence = assertPlainObject(value, "artifact evidence");
  assertExactKeys(evidence, ["digest", "id", "inventorySha256"], "artifact evidence");
  if (typeof evidence.id !== "string" || !/^[1-9]\d*$/.test(evidence.id)) {
    throw new Error("artifact evidence id must be a decimal GitHub artifact id");
  }
  assertSha256(evidence.digest, "artifact evidence digest");
  assertSha256(evidence.inventorySha256, "artifact evidence inventorySha256");
  return evidence;
}

export function buildRepositoryDispatchDocument(metadataValue, artifactEvidenceValue) {
  const metadata = assertReleaseMetadata(metadataValue);
  const artifactEvidence = assertArtifactEvidence(artifactEvidenceValue);
  const document = {
    event_type: metadata.eventType,
    client_payload: {
      version: metadata.version,
      tag: metadata.tag,
      releaseId: metadata.releaseId,
      runtimeActionsSha256: metadata.runtimeActionsSha256,
      runtimePayloadContractsSchemaVersion:
        metadata.runtimePayloadContractsSchemaVersion,
      runtimePayloadContractsSha256: metadata.runtimePayloadContractsSha256,
      manifestSha256: metadata.manifestSha256,
      targetConfigSha256: metadata.targetConfigSha256,
      source: { ...metadata.source },
      artifact: {
        id: artifactEvidence.id,
        name: metadata.artifact.name,
        digest: artifactEvidence.digest,
        inventorySha256: artifactEvidence.inventorySha256,
        workflowRunId: metadata.artifact.workflowRunId,
        manifestPath: metadata.artifact.manifestPath,
        inventoryPath: metadata.artifact.inventoryPath,
        sourcePrefix: metadata.artifact.sourcePrefix,
      },
    },
  };
  if (Object.keys(document.client_payload).length > 10) {
    throw new Error("repository_dispatch client_payload exceeds GitHub's 10 top-level property limit");
  }
  if (Buffer.byteLength(JSON.stringify(document), "utf8") >= 64 * 1024) {
    throw new Error("repository_dispatch request exceeds GitHub's 64KB payload limit");
  }
  return document;
}

export function buildReleaseDispatchPlan(metadataValue, artifactEvidenceValue, targets) {
  const document = buildRepositoryDispatchDocument(metadataValue, artifactEvidenceValue);
  const repositories = Array.isArray(targets)
    ? parseTargetRepositories(targets.join(","))
    : parseTargetRepositories(targets);
  return {
    schemaVersion: RELEASE_DISPATCH_PLAN_SCHEMA_VERSION,
    mode: "dry-run",
    releaseId: document.client_payload.releaseId,
    source: { ...document.client_payload.source },
    artifact: {
      id: document.client_payload.artifact.id,
      name: document.client_payload.artifact.name,
      digest: document.client_payload.artifact.digest,
      inventorySha256: document.client_payload.artifact.inventorySha256,
      workflowRunId: document.client_payload.artifact.workflowRunId,
    },
    targets: repositories.map((repository) => ({
      repository,
      method: "POST",
      url: `https://api.github.com/repos/${repository}/dispatches`,
    })),
    request: document,
  };
}

export async function dispatchRepositoryUpdates({
  targets,
  token,
  metadata,
  artifactEvidence,
  fetchImpl = globalThis.fetch,
}) {
  const plan = buildReleaseDispatchPlan(metadata, artifactEvidence, targets);
  const repositories = plan.targets.map((target) => target.repository);
  if (typeof token !== "string" || token.trim().length === 0) {
    throw new Error("READER_HOST_SYNC_TOKEN is required for repository dispatch");
  }
  if (typeof fetchImpl !== "function") throw new Error("repository dispatch requires a fetch implementation");

  const outcomes = await Promise.all(plan.targets.map(async (target) => {
    const { repository, url } = target;
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "reader-ui-release-dispatch",
          "X-GitHub-Api-Version": "2026-03-10",
        },
        body: JSON.stringify(plan.request),
        signal: AbortSignal.timeout(30_000),
      });
      if (response?.status !== 204) {
        const responseBody = typeof response?.text === "function" ? await response.text() : "";
        const safeBody = responseBody.replace(/[\r\n]+/g, " ").slice(0, 500);
        throw new Error(`HTTP ${response?.status ?? "<missing>"}${safeBody ? `: ${safeBody}` : ""}`);
      }
      return { repository, ok: true };
    } catch (error) {
      return { repository, ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }));
  const failures = outcomes.filter((outcome) => !outcome.ok);
  if (failures.length > 0) {
    const error = new Error(
      `repository dispatch failed for ${failures.map((failure) => `${failure.repository} (${failure.error})`).join(", ")}`,
    );
    error.outcomes = outcomes;
    throw error;
  }
  return { repositories, document: plan.request, plan, outcomes };
}
