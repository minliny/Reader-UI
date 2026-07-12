import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  assertArtifactEvidence,
  assertMetadataMatchesRepository,
  assertReleaseExecutionContext,
  assertReleaseMetadata,
  buildReleaseMetadata,
  buildReleaseDispatchPlan,
  buildRepositoryDispatchDocument,
  dispatchRepositoryUpdates,
  parseConfiguredTargetRepositories,
  parseTargetRepositories,
  RELEASE_ARTIFACT_HOST_TARGETS_PATH,
  RELEASE_ARTIFACT_INVENTORY_PATH,
  RELEASE_ARTIFACT_MANIFEST_PATH,
  RELEASE_ARTIFACT_SOURCE_PREFIX,
  RELEASE_EVENT_TYPE,
  RELEASE_DISPATCH_PLAN_SCHEMA_VERSION,
  RELEASE_HOST_TARGETS_PATH,
  RELEASE_METADATA_PATH,
  RELEASE_METADATA_SCHEMA_VERSION,
  serializeReleaseMetadata,
  sha256,
  verifyReleaseArtifact,
  verifyReleaseArtifactStage,
  writeReleaseArtifactStage,
} from "../../tools/release/release-automation-lib.mjs";
import {
  buildReleaseManifest,
  serializeReleaseManifest,
} from "../../tools/release/manifest-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/ui-runtime.yml"), "utf8");
const artifactManifestBytes = Buffer.from('{"version":"2.5.0"}\n', "utf8");
const sourceSha = "b".repeat(40);
const manifestSha256 = sha256(artifactManifestBytes);

function fixtureMetadata() {
  return {
    schemaVersion: RELEASE_METADATA_SCHEMA_VERSION,
    eventType: RELEASE_EVENT_TYPE,
    version: "2.5.0",
    tag: "v2.5.0",
    releaseId: `${sourceSha}:${manifestSha256}`,
    runtimeActionsSha256: "a".repeat(64),
    manifestSha256,
    targetConfigSha256: "e".repeat(64),
    source: {
      repository: "reader-org/Reader-UI",
      ref: "refs/tags/v2.5.0",
      sha: sourceSha,
    },
    artifact: {
      name: "reader-ui-v2.5.0",
      workflowRunId: "123456789",
      manifestPath: RELEASE_ARTIFACT_MANIFEST_PATH,
      inventoryPath: RELEASE_ARTIFACT_INVENTORY_PATH,
      sourcePrefix: RELEASE_ARTIFACT_SOURCE_PREFIX,
    },
  };
}

const artifactEvidence = Object.freeze({
  id: "987654321",
  digest: "c".repeat(64),
  inventorySha256: "f".repeat(64),
});

function createCurrentGeneratedManifestRoot() {
  const manifest = buildReleaseManifest(root);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "reader-ui-release-automation-"));
  for (const entry of manifest.files) {
    const source = path.join(root, ...entry.path.split("/"));
    const destination = path.join(temporaryRoot, ...entry.path.split("/"));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  const hostTargetsDestination = path.join(temporaryRoot, ...RELEASE_HOST_TARGETS_PATH.split("/"));
  fs.mkdirSync(path.dirname(hostTargetsDestination), { recursive: true });
  fs.copyFileSync(path.join(root, ...RELEASE_HOST_TARGETS_PATH.split("/")), hostTargetsDestination);
  fs.writeFileSync(path.join(temporaryRoot, "UI_RELEASE_MANIFEST.json"), serializeReleaseManifest(manifest));
  return { temporaryRoot, manifest };
}

function copyReleaseTools(destinationRoot) {
  fs.cpSync(path.join(root, "tools", "release"), path.join(destinationRoot, "tools", "release"), {
    recursive: true,
  });
}

test("target configuration must exactly match the tracked iOS, Android, and HarmonyOS authority set", () => {
  const exact = "minliny/Reader-for-iOS,minliny/Reader-for-Android,minliny/Reader-for-HarmonyOS";
  assert.deepEqual(parseConfiguredTargetRepositories(root, exact), [
    "minliny/Reader-for-Android",
    "minliny/Reader-for-HarmonyOS",
    "minliny/Reader-for-iOS",
  ]);
  assert.throws(() => parseConfiguredTargetRepositories(root, ""), /is required/);
  assert.throws(
    () => parseConfiguredTargetRepositories(root, "minliny/Reader-for-iOS,minliny/Reader-for-Android"),
    /missing=minliny\/Reader-for-HarmonyOS/,
  );
  assert.throws(
    () => parseConfiguredTargetRepositories(root, `${exact},minliny/Reader-for-Windows`),
    /extra=minliny\/Reader-for-Windows/,
  );
  assert.throws(
    () => parseConfiguredTargetRepositories(root, exact.replace("Reader-for-iOS", "reader-for-ios")),
    /missing=minliny\/Reader-for-iOS/,
  );
  assert.throws(
    () => parseConfiguredTargetRepositories(root, exact.replace("Reader-for-iOS", "Reader-for-Windows")),
    /missing=minliny\/Reader-for-iOS/,
  );
});

test("generic target parser is canonical, bounded, and duplicate-free", () => {
  assert.deepEqual(
    parseTargetRepositories("reader-org/Reader-for-iOS, reader-org/Reader-for-Android\nreader-org/Reader-for-HarmonyOS"),
    ["reader-org/Reader-for-iOS", "reader-org/Reader-for-Android", "reader-org/Reader-for-HarmonyOS"],
  );
  assert.throws(() => parseTargetRepositories("reader-org"), /owner\/repository/);
  assert.throws(() => parseTargetRepositories("reader-org/repo,READER-ORG/REPO"), /duplicate/);
  assert.throws(
    () => parseTargetRepositories(Array.from({ length: 21 }, (_, index) => `reader-org/repo-${index}`).join(",")),
    /exceeds 20/,
  );
});

test("release metadata strictly binds version, tag, source, runtime, manifest, and target config", () => {
  const metadata = fixtureMetadata();
  assert.equal(assertReleaseMetadata(metadata), metadata);
  assert.equal(serializeReleaseMetadata(metadata), `${JSON.stringify(metadata, null, 2)}\n`);
  assert.equal(verifyReleaseArtifact(metadata, artifactManifestBytes).version, "2.5.0");

  const wrongRef = structuredClone(metadata);
  wrongRef.source.ref = "refs/heads/main";
  assert.throws(() => assertReleaseMetadata(wrongRef), /source\.ref/);
  const wrongReleaseId = structuredClone(metadata);
  wrongReleaseId.releaseId = "unbound";
  assert.throws(() => assertReleaseMetadata(wrongReleaseId), /releaseId/);
  const wrongManifest = structuredClone(metadata);
  wrongManifest.manifestSha256 = "0".repeat(64);
  assert.throws(() => verifyReleaseArtifact(wrongManifest, artifactManifestBytes), /(releaseId|SHA-256)/);
  const invalidVersions = ["01.2.3", "1.2.3-..", "1.2.3-01", "1.2.3-alpha..1"];
  for (const version of invalidVersions) {
    const invalid = structuredClone(metadata);
    invalid.version = version;
    invalid.tag = `v${version}`;
    assert.throws(() => assertReleaseMetadata(invalid), /strict semantic versioning/);
  }
});

test("dispatch execution context must match the checked-out tag run exactly", () => {
  const metadata = fixtureMetadata();
  const context = {
    sourceRepository: metadata.source.repository,
    sourceRef: metadata.source.ref,
    sourceSha: metadata.source.sha,
    workflowRunId: metadata.artifact.workflowRunId,
    artifactName: metadata.artifact.name,
  };
  assert.equal(assertReleaseExecutionContext(metadata, context), metadata);
  assert.throws(
    () => assertReleaseExecutionContext(metadata, { ...context, sourceSha: "0".repeat(40) }),
    /source SHA/,
  );
  assert.throws(
    () => assertReleaseExecutionContext(metadata, { ...context, artifactName: "" }),
    /artifact name is required/,
  );
});

test("release preparation materializes an exact manifest-backed artifact stage without extras", (context) => {
  const { temporaryRoot, manifest } = createCurrentGeneratedManifestRoot();
  context.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }));
  const trackedRootManifestBefore = fs.readFileSync(path.join(root, "UI_RELEASE_MANIFEST.json"));
  const version = manifest.version;
  const release = buildReleaseMetadata(temporaryRoot, {
    tag: `v${version}`,
    sourceRepository: "reader-org/Reader-UI",
    sourceRef: `refs/tags/v${version}`,
    sourceSha: "d".repeat(40),
    workflowRunId: "123456789",
    artifactName: `reader-ui-v${version}`,
  });
  const stageRoot = path.join(temporaryRoot, "release-stage");
  const staged = writeReleaseArtifactStage(temporaryRoot, stageRoot, release);
  assert.equal(staged.metadata.version, version);
  assert.equal(staged.inventory.sourceFileCount, manifest.files.length);
  assert.equal(staged.inventory.files.length, manifest.files.length + 3);
  assert.equal(staged.inventorySha256, sha256(fs.readFileSync(path.join(stageRoot, RELEASE_ARTIFACT_INVENTORY_PATH))));
  assert.equal(assertMetadataMatchesRepository(temporaryRoot, staged.metadata, staged.manifestBytes), staged.metadata);
  assert.deepEqual(fs.readFileSync(path.join(root, "UI_RELEASE_MANIFEST.json")), trackedRootManifestBefore);

  const inventoryPath = path.join(stageRoot, RELEASE_ARTIFACT_INVENTORY_PATH);
  const originalInventory = fs.readFileSync(inventoryPath);
  const extraPath = path.join(stageRoot, "unexpected.txt");
  fs.writeFileSync(extraPath, "not declared\n");
  const inventoryWithExtra = JSON.parse(originalInventory);
  const extraBytes = fs.readFileSync(extraPath);
  inventoryWithExtra.files.push({ path: "unexpected.txt", byteLength: extraBytes.length, sha256: sha256(extraBytes) });
  inventoryWithExtra.files.sort((left, right) => Buffer.compare(Buffer.from(left.path), Buffer.from(right.path)));
  fs.writeFileSync(inventoryPath, `${JSON.stringify(inventoryWithExtra, null, 2)}\n`);
  assert.throws(() => verifyReleaseArtifactStage(stageRoot), /payload boundary mismatch.*extra=unexpected\.txt/);
  fs.rmSync(extraPath);
  fs.writeFileSync(inventoryPath, originalInventory);

  const symlinkPath = path.join(stageRoot, "unsafe-link");
  fs.symlinkSync(path.join(stageRoot, RELEASE_ARTIFACT_MANIFEST_PATH), symlinkPath);
  assert.throws(() => verifyReleaseArtifactStage(stageRoot), /contains symlink/);
  fs.rmSync(symlinkPath);

  const firstSource = path.join(stageRoot, RELEASE_ARTIFACT_SOURCE_PREFIX, ...manifest.files[0].path.split("/"));
  const original = fs.readFileSync(firstSource);
  fs.appendFileSync(firstSource, "coordinated tamper");
  const tamperedBytes = fs.readFileSync(firstSource);
  const inventoryWithTamperedSource = JSON.parse(originalInventory);
  const tamperedEntry = inventoryWithTamperedSource.files.find(
    (entry) => entry.path === `${RELEASE_ARTIFACT_SOURCE_PREFIX}/${manifest.files[0].path}`,
  );
  tamperedEntry.byteLength = tamperedBytes.length;
  tamperedEntry.sha256 = sha256(tamperedBytes);
  fs.writeFileSync(inventoryPath, `${JSON.stringify(inventoryWithTamperedSource, null, 2)}\n`);
  assert.throws(() => verifyReleaseArtifactStage(stageRoot), /source digest does not match UI_RELEASE_MANIFEST/);
  fs.writeFileSync(firstSource, original);
  fs.writeFileSync(inventoryPath, originalInventory);

  fs.rmSync(firstSource);
  assert.throws(() => verifyReleaseArtifactStage(stageRoot), /missing=source\//);
  fs.mkdirSync(path.dirname(firstSource), { recursive: true });
  fs.writeFileSync(firstSource, original);
  fs.appendFileSync(firstSource, "tamper");
  assert.throws(() => verifyReleaseArtifactStage(stageRoot), /digest mismatch/);
});

test("repository_dispatch carries immutable source, artifact inventory, manifest, and target authority", () => {
  const metadata = fixtureMetadata();
  const document = buildRepositoryDispatchDocument(metadata, artifactEvidence);
  assert.equal(document.event_type, "reader-ui-updated");
  assert.deepEqual(Object.keys(document.client_payload).sort(), [
    "artifact",
    "manifestSha256",
    "releaseId",
    "runtimeActionsSha256",
    "source",
    "tag",
    "targetConfigSha256",
    "version",
  ]);
  assert.equal(document.client_payload.releaseId, metadata.releaseId);
  assert.equal(document.client_payload.runtimeActionsSha256, metadata.runtimeActionsSha256);
  assert.equal(document.client_payload.manifestSha256, metadata.manifestSha256);
  assert.equal(document.client_payload.targetConfigSha256, metadata.targetConfigSha256);
  assert.deepEqual(document.client_payload.source, metadata.source);
  assert.deepEqual(document.client_payload.artifact, {
    id: artifactEvidence.id,
    name: metadata.artifact.name,
    digest: artifactEvidence.digest,
    inventorySha256: artifactEvidence.inventorySha256,
    workflowRunId: metadata.artifact.workflowRunId,
    manifestPath: metadata.artifact.manifestPath,
    inventoryPath: metadata.artifact.inventoryPath,
    sourcePrefix: metadata.artifact.sourcePrefix,
  });
  assert.ok(Object.keys(document.client_payload).length <= 10);
  assert.ok(Buffer.byteLength(JSON.stringify(document), "utf8") < 64 * 1024);
});

test("dry-run plan is deterministic, machine-readable, and identical to live dispatch", () => {
  const metadata = fixtureMetadata();
  const targets = [
    "reader-org/Reader-for-Android",
    "reader-org/Reader-for-HarmonyOS",
    "reader-org/Reader-for-iOS",
  ];
  const first = buildReleaseDispatchPlan(metadata, artifactEvidence, targets);
  const second = buildReleaseDispatchPlan(metadata, artifactEvidence, targets.join(","));
  assert.deepEqual(second, first);
  assert.equal(first.schemaVersion, RELEASE_DISPATCH_PLAN_SCHEMA_VERSION);
  assert.equal(first.mode, "dry-run");
  assert.equal(first.releaseId, metadata.releaseId);
  assert.deepEqual(first.source, metadata.source);
  assert.deepEqual(first.artifact, {
    id: artifactEvidence.id,
    name: metadata.artifact.name,
    digest: artifactEvidence.digest,
    inventorySha256: artifactEvidence.inventorySha256,
    workflowRunId: metadata.artifact.workflowRunId,
  });
  assert.deepEqual(first.targets, targets.map((repository) => ({
    repository,
    method: "POST",
    url: `https://api.github.com/repos/${repository}/dispatches`,
  })));
  assert.deepEqual(first.request, buildRepositoryDispatchDocument(metadata, artifactEvidence));
  assert.deepEqual(JSON.parse(`${JSON.stringify(first, null, 2)}\n`), first);
});

test("dispatch CLI emits the verified dry-run plan without a token or network call", (context) => {
  const { temporaryRoot, manifest } = createCurrentGeneratedManifestRoot();
  context.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }));
  copyReleaseTools(temporaryRoot);
  const sourceSha = "9".repeat(40);
  const workflowRunId = "123456789";
  const tag = `v${manifest.version}`;
  const artifactName = `reader-ui-${tag}`;
  const release = buildReleaseMetadata(temporaryRoot, {
    tag,
    sourceRepository: "minliny/Reader-UI",
    sourceRef: `refs/tags/${tag}`,
    sourceSha,
    workflowRunId,
    artifactName,
  });
  const stageRoot = path.join(temporaryRoot, "release-stage");
  const staged = writeReleaseArtifactStage(temporaryRoot, stageRoot, release);
  const evidence = {
    id: "987654321",
    digest: "7".repeat(64),
    inventorySha256: staged.inventorySha256,
  };
  const result = spawnSync(process.execPath, [
    path.join(temporaryRoot, "tools", "release", "dispatch-ui-release.mjs"),
    "--dry-run",
    "--artifact-root", stageRoot,
    "--artifact-id", evidence.id,
    "--artifact-digest", evidence.digest,
    "--inventory-sha256", evidence.inventorySha256,
  ], {
    cwd: temporaryRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      GITHUB_REPOSITORY: "minliny/Reader-UI",
      GITHUB_REF: `refs/tags/${tag}`,
      GITHUB_SHA: sourceSha,
      GITHUB_RUN_ID: workflowRunId,
      READER_UI_ARTIFACT_NAME: artifactName,
      READER_HOST_SYNC_REPOSITORIES:
        "minliny/Reader-for-Android,minliny/Reader-for-HarmonyOS,minliny/Reader-for-iOS",
      READER_HOST_SYNC_TOKEN: "",
    },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stderr, /\[ui-release-dispatch] DRY-RUN/);
  const plan = JSON.parse(result.stdout);
  assert.deepEqual(
    plan,
    buildReleaseDispatchPlan(release.metadata, evidence, [
      "minliny/Reader-for-Android",
      "minliny/Reader-for-HarmonyOS",
      "minliny/Reader-for-iOS",
    ]),
  );
});

test("dispatch fails closed on missing credentials but attempts every target before aggregating API failures", async () => {
  const metadata = fixtureMetadata();
  const targets = [
    "reader-org/Reader-for-Android",
    "reader-org/Reader-for-HarmonyOS",
    "reader-org/Reader-for-iOS",
  ];
  let fetchCalls = 0;
  await assert.rejects(
    dispatchRepositoryUpdates({
      targets,
      token: "",
      metadata,
      artifactEvidence,
      fetchImpl: async () => {
        fetchCalls += 1;
        return { status: 204, text: async () => "" };
      },
    }),
    /READER_HOST_SYNC_TOKEN is required/,
  );
  assert.equal(fetchCalls, 0);

  await assert.rejects(
    dispatchRepositoryUpdates({
      targets,
      token: "test-token-not-a-real-secret",
      metadata,
      artifactEvidence,
      fetchImpl: async (url) => {
        fetchCalls += 1;
        return url.endsWith("Reader-for-iOS/dispatches")
          ? { status: 403, text: async () => "permission denied" }
          : { status: 204, text: async () => "" };
      },
    }),
    /Reader-for-iOS \(HTTP 403: permission denied\)/,
  );
  assert.equal(fetchCalls, 3);
});

test("dispatch sends the same immutable payload to all three configured targets", async () => {
  const metadata = fixtureMetadata();
  const targets = [
    "reader-org/Reader-for-Android",
    "reader-org/Reader-for-HarmonyOS",
    "reader-org/Reader-for-iOS",
  ];
  const requests = [];
  const result = await dispatchRepositoryUpdates({
    targets,
    token: "test-token-not-a-real-secret",
    metadata,
    artifactEvidence,
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return { status: 204, text: async () => "" };
    },
  });
  assert.deepEqual(result.repositories, targets);
  assert.deepEqual(result.plan, buildReleaseDispatchPlan(metadata, artifactEvidence, targets));
  assert.equal(requests.length, 3);
  for (const request of requests) {
    assert.equal(request.options.method, "POST");
    assert.equal(request.options.headers.Authorization, "Bearer test-token-not-a-real-secret");
    assert.equal(request.options.headers["X-GitHub-Api-Version"], "2026-03-10");
    assert.ok(request.options.signal instanceof AbortSignal);
    assert.deepEqual(JSON.parse(request.options.body), result.document);
  }
});

test("artifact evidence is strict and cannot silently disappear", () => {
  assert.deepEqual(assertArtifactEvidence(artifactEvidence), artifactEvidence);
  assert.throws(
    () => assertArtifactEvidence({ id: "", digest: "c".repeat(64), inventorySha256: "f".repeat(64) }),
    /artifact id/,
  );
  assert.throws(
    () => assertArtifactEvidence({ id: "123", digest: "not-a-digest", inventorySha256: "f".repeat(64) }),
    /SHA-256/,
  );
});

test("tag workflow installs clean dependencies, uploads only the exact stage, and never skip-succeeds", () => {
  const npmCiIndex = workflow.indexOf("npm ci --prefix contracts/tests");
  const npmTestIndex = workflow.indexOf("npm test --prefix contracts/tests");
  assert.ok(npmCiIndex >= 0 && npmCiIndex < npmTestIndex, "npm ci must run before npm test on a clean runner");
  assert.match(workflow, /runs-on: macos-15/);
  assert.match(workflow, /node-version: '24'/);
  assert.match(workflow, /node tools\/release\/generate-ui-release-manifest\.mjs --check/);
  assert.match(workflow, /node tools\/release\/check-ui-release-manifest\.mjs/);
  assert.match(workflow, /node tools\/release\/prepare-ui-release\.mjs/);
  assert.match(workflow, /--artifact-output release-stage/);
  assert.match(workflow, /path: release-stage\//);
  assert.match(workflow, /include-hidden-files: true/);
  assert.doesNotMatch(workflow, /^\s+packages\/(?:swift|kotlin|arkts)\s*$/m);
  assert.match(workflow, /id: release-artifact/);
  assert.match(workflow, /outputs\.artifact-id/);
  assert.match(workflow, /outputs\.artifact-digest/);
  assert.match(workflow, /actions\/download-artifact@[0-9a-f]{40} # v4/);
  assert.match(workflow, /artifact-ids: \$\{\{ needs\.validate\.outputs\.artifact_id }}/);
  assert.match(workflow, /inventory_sha256: \$\{\{ steps\.release-metadata\.outputs\.inventory_sha256 }}/);
  assert.match(workflow, /--artifact-root release-download/);
  assert.match(workflow, /--inventory-sha256 "\$READER_UI_INVENTORY_SHA256"/);
  assert.match(workflow, /vars\.READER_HOST_SYNC_REPOSITORIES/);
  assert.match(workflow, /secrets\.READER_HOST_SYNC_TOKEN/);
  assert.match(workflow, /environment: reader-ui-release/);
  assert.match(workflow, /node tools\/release\/dispatch-ui-release\.mjs/);
  assert.doesNotMatch(workflow, /host dispatch is skipped|exit 0|continue-on-error:\s*true/);
  assert.doesNotMatch(workflow, /uses:\s+actions\/[A-Za-z0-9-]+@v\d+/);
  assert.doesNotMatch(workflow, /minliny\/Reader-for-/);
  assert.doesNotMatch(workflow, /ghp_[A-Za-z0-9]+|github_pat_[A-Za-z0-9_]+/);
  assert.ok(fs.existsSync(path.join(root, ...RELEASE_HOST_TARGETS_PATH.split("/"))));
  assert.equal(RELEASE_ARTIFACT_HOST_TARGETS_PATH, "release-host-targets.json");
  assert.equal(RELEASE_METADATA_PATH, "UI_RELEASE_METADATA.json");
});

test("release automation CLIs reject incomplete invocations locally", () => {
  for (const script of ["prepare-ui-release.mjs", "dispatch-ui-release.mjs"]) {
    const result = spawnSync(process.execPath, [path.join(root, "tools/release", script)], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, READER_HOST_SYNC_TOKEN: "", READER_HOST_SYNC_REPOSITORIES: "" },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /\[ui-release-(?:prepare|dispatch)] FAIL --/);
  }
});
