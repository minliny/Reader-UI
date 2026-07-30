import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  assertDispatchPayloadMatchesStage,
  assertVerifiedHostRelease,
  deterministicHostBumpBranch,
  updateHostConsumerLock,
  verifyGitHubArtifactRecord,
  verifyHostRelease,
} from "../../tools/release/host-consumer-release-lib.mjs";
import {
  buildReleaseMetadata,
  buildRepositoryDispatchDocument,
  RELEASE_HOST_TARGETS_PATH,
  writeReleaseArtifactStage,
} from "../../tools/release/release-automation-lib.mjs";
import {
  buildReleaseManifest,
  serializeReleaseManifest,
} from "../../tools/release/manifest-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

function metadata() {
  const sourceSha = "1".repeat(40);
  const manifestSha256 = "2".repeat(64);
  return {
    schemaVersion: 2,
    eventType: "reader-ui-updated",
    version: "2.5.1",
    tag: "v2.5.1",
    releaseId: `${sourceSha}:${manifestSha256}`,
    runtimeActionsSha256: "3".repeat(64),
    runtimePayloadContractsSchemaVersion: 4,
    runtimePayloadContractsSha256: "7".repeat(64),
    manifestSha256,
    targetConfigSha256: "4".repeat(64),
    source: {
      repository: "minliny/Reader-UI",
      ref: "refs/tags/v2.5.1",
      sha: sourceSha,
    },
    artifact: {
      name: "reader-ui-v2.5.1",
      workflowRunId: "123456",
      manifestPath: "UI_RELEASE_MANIFEST.json",
      inventoryPath: "UI_RELEASE_ARTIFACT_INVENTORY.json",
      sourcePrefix: "source",
    },
  };
}

function artifactEvidence() {
  return {
    id: "987654",
    digest: "5".repeat(64),
    inventorySha256: "6".repeat(64),
  };
}

function verifiedRelease(overrides = {}) {
  const releaseMetadata = metadata();
  const value = {
    schemaVersion: 2,
    host: "android",
    hostRepository: "minliny/Reader-for-Android",
    releaseId: releaseMetadata.releaseId,
    readerUiVersion: releaseMetadata.version,
    tag: releaseMetadata.tag,
    sourceSha: releaseMetadata.source.sha,
    manifestSha256: releaseMetadata.manifestSha256,
    targetConfigSha256: releaseMetadata.targetConfigSha256,
    proofBoundary: "JVM consumer gates and :app:assembleDebug are required before PR publication; physical-device proof is not included.",
    hostRequestSchemaVersion: "1.1.0",
    runtimeActionsSchemaVersion: 2,
    runtimeActionsSha256: releaseMetadata.runtimeActionsSha256,
    runtimePayloadContractsSchemaVersion:
      releaseMetadata.runtimePayloadContractsSchemaVersion,
    runtimePayloadContractsSha256:
      releaseMetadata.runtimePayloadContractsSha256,
    artifact: {
      id: artifactEvidence().id,
      name: releaseMetadata.artifact.name,
      digest: artifactEvidence().digest,
      inventorySha256: artifactEvidence().inventorySha256,
      workflowRunId: releaseMetadata.artifact.workflowRunId,
    },
    branch: deterministicHostBumpBranch(releaseMetadata.releaseId),
    ...overrides,
  };
  return assertVerifiedHostRelease(value);
}

function v1Lock() {
  return {
    schemaVersion: 1,
    host: "android",
    readerUiVersion: "2.4.0",
    hostRequestSchemaVersion: "1.0.0",
    runtimeActionsSchemaVersion: 1,
    runtimeActionsSha256: "0".repeat(64),
    rollout: {
      mode: "shadow",
      coveredEvents: ["book.open"],
      cohorts: [{ id: "book-open", mode: "pilot", effectPolicy: "exactly-once", events: ["book.open"] }],
    },
    knownDifferences: [{ id: "keep", description: "keep", owner: "android", exitCriteria: "keep" }],
    blockedProof: [{ gate: "device", reason: "keep", evidence: "keep" }],
  };
}

function runGit(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Reader UI Test",
      GIT_AUTHOR_EMAIL: "reader-ui-test@example.invalid",
      GIT_COMMITTER_NAME: "Reader UI Test",
      GIT_COMMITTER_EMAIL: "reader-ui-test@example.invalid",
    },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function createCommittedReleaseSource() {
  const manifest = buildReleaseManifest(root);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "reader-ui-host-release-"));
  for (const entry of manifest.files) {
    const source = path.join(root, ...entry.path.split("/"));
    const destination = path.join(temporaryRoot, ...entry.path.split("/"));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  const targetDestination = path.join(temporaryRoot, ...RELEASE_HOST_TARGETS_PATH.split("/"));
  fs.mkdirSync(path.dirname(targetDestination), { recursive: true });
  fs.copyFileSync(path.join(root, ...RELEASE_HOST_TARGETS_PATH.split("/")), targetDestination);
  fs.writeFileSync(path.join(temporaryRoot, "UI_RELEASE_MANIFEST.json"), serializeReleaseManifest(manifest));
  runGit(temporaryRoot, ["init", "--quiet"]);
  runGit(temporaryRoot, ["add", "."]);
  runGit(temporaryRoot, ["-c", "commit.gpgsign=false", "commit", "--quiet", "-m", "release source"]);
  return { manifest, sourceSha: runGit(temporaryRoot, ["rev-parse", "HEAD"]), temporaryRoot };
}

test("deterministic bump branch is stable per releaseId and rejects malformed identity", () => {
  const releaseId = metadata().releaseId;
  assert.equal(deterministicHostBumpBranch(releaseId), deterministicHostBumpBranch(releaseId));
  assert.notEqual(
    deterministicHostBumpBranch(releaseId),
    deterministicHostBumpBranch(`${"7".repeat(40)}:${"2".repeat(64)}`),
  );
  assert.throws(() => deterministicHostBumpBranch("latest"), /source SHA and manifest SHA-256/);
});

test("lock v3 updater binds typed payload contracts and preserves host-owned fields", () => {
  const current = v1Lock();
  const protectedSnapshot = JSON.stringify({
    host: current.host,
    rollout: current.rollout,
    knownDifferences: current.knownDifferences,
    blockedProof: current.blockedProof,
  });
  const first = updateHostConsumerLock(current, verifiedRelease());
  assert.equal(first.changed, true);
  assert.equal(first.lock.schemaVersion, 3);
  assert.equal(first.lock.readerUiVersion, "2.5.1");
  assert.equal(first.lock.runtimePayloadContractsSchemaVersion, 4);
  assert.equal(
    first.lock.runtimePayloadContractsSha256,
    metadata().runtimePayloadContractsSha256,
  );
  assert.equal(first.lock.releaseIdentity.releaseId, metadata().releaseId);
  assert.equal(
    JSON.stringify({
      host: first.lock.host,
      rollout: first.lock.rollout,
      knownDifferences: first.lock.knownDifferences,
      blockedProof: first.lock.blockedProof,
    }),
    protectedSnapshot,
  );
  const second = updateHostConsumerLock(first.lock, verifiedRelease());
  assert.equal(second.changed, false);
  assert.equal(second.contents, first.contents);
});

test("same releaseId with conflicting identity or hashes fails closed", () => {
  const first = updateHostConsumerLock(v1Lock(), verifiedRelease()).lock;
  const conflict = structuredClone(first);
  conflict.releaseIdentity.targetConfigSha256 = "9".repeat(64);
  assert.throws(() => updateHostConsumerLock(conflict, verifiedRelease()), /conflicting version, hash, or identity/);
  const payloadConflict = structuredClone(first);
  payloadConflict.runtimePayloadContractsSha256 = "8".repeat(64);
  assert.throws(
    () => updateHostConsumerLock(payloadConflict, verifiedRelease()),
    /conflicting version, hash, or identity/,
  );
  const unknown = { ...v1Lock(), unexpected: true };
  assert.throws(() => updateHostConsumerLock(unknown, verifiedRelease()), /keys must be exactly/);
});

test("draft PR publisher configures token-backed git auth and creates one deterministic branch", (context) => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "reader-ui-bump-pr-"));
  context.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }));
  const remote = path.join(temporaryRoot, "remote.git");
  const hostRoot = path.join(temporaryRoot, "host");
  fs.mkdirSync(hostRoot);
  runGit(temporaryRoot, ["init", "--quiet", "--bare", remote]);
  runGit(hostRoot, ["init", "--quiet", "--initial-branch=main"]);
  fs.writeFileSync(path.join(hostRoot, "READER_UI_CONSUMER.json"), `${JSON.stringify(v1Lock(), null, 2)}\n`);
  runGit(hostRoot, ["add", "READER_UI_CONSUMER.json"]);
  runGit(hostRoot, ["-c", "commit.gpgsign=false", "commit", "--quiet", "-m", "initial lock"]);
  runGit(hostRoot, ["remote", "add", "origin", remote]);
  runGit(hostRoot, ["push", "--quiet", "--set-upstream", "origin", "main"]);

  const verified = verifiedRelease();
  fs.writeFileSync(
    path.join(hostRoot, "READER_UI_CONSUMER.json"),
    updateHostConsumerLock(v1Lock(), verified).contents,
  );
  const verifiedPath = path.join(temporaryRoot, "verified.json");
  fs.writeFileSync(verifiedPath, `${JSON.stringify(verified, null, 2)}\n`);

  const fakeBin = path.join(temporaryRoot, "bin");
  fs.mkdirSync(fakeBin);
  const ghLog = path.join(temporaryRoot, "gh.log");
  const fakeGh = path.join(fakeBin, "gh");
  fs.writeFileSync(fakeGh, `#!/usr/bin/env node
const fs = require('fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_GH_LOG, JSON.stringify(args) + '\\n');
if (args[0] === 'auth' && args[1] === 'setup-git') process.exit(0);
if (args[0] === 'pr' && args[1] === 'create') { console.log('https://example.invalid/pr/1'); process.exit(0); }
if (args[0] === 'pr' && args[1] === 'list') {
  console.log(JSON.stringify([{ baseRefName: process.env.FAKE_BASE, headRefName: process.env.FAKE_BRANCH, isDraft: true, number: 1, state: 'OPEN', url: 'https://example.invalid/pr/1' }]));
  process.exit(0);
}
if (args[0] === 'pr' && args[1] === 'view') {
  console.log(JSON.stringify({ baseRefName: process.env.FAKE_BASE, headRefName: process.env.FAKE_BRANCH, isDraft: true, number: 1, state: 'OPEN', url: 'https://example.invalid/pr/1' }));
  process.exit(0);
}
process.exit(2);
`);
  fs.chmodSync(fakeGh, 0o755);

  const result = spawnSync(process.execPath, [
    path.join(root, "tools", "release", "publish-host-bump-pr.mjs"),
    "--host-root", hostRoot,
    "--lock", path.join(hostRoot, "READER_UI_CONSUMER.json"),
    "--verified-release", verifiedPath,
    "--host-repository", verified.hostRepository,
    "--base", "main",
    "--github-token-env", "HOST_GITHUB_TOKEN",
  ], {
    cwd: temporaryRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${fakeBin}${path.delimiter}${process.env.PATH}`,
      HOST_GITHUB_TOKEN: "host-token",
      FAKE_GH_LOG: ghLog,
      FAKE_BASE: "main",
      FAKE_BRANCH: verified.branch,
    },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS created/);
  const calls = fs.readFileSync(ghLog, "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line));
  assert.deepEqual(calls[0], ["auth", "setup-git"]);
  const create = calls.find((args) => args[0] === "pr" && args[1] === "create");
  assert.ok(create.includes("--draft"));
  assert.equal(runGit(hostRoot, ["rev-parse", "--abbrev-ref", "HEAD"]), verified.branch);
  assert.match(runGit(hostRoot, ["ls-remote", "--heads", "origin", `refs/heads/${verified.branch}`]), /refs\/heads\/automation\/reader-ui-/);

  runGit(hostRoot, ["switch", "--quiet", "main"]);
  fs.writeFileSync(
    path.join(hostRoot, "READER_UI_CONSUMER.json"),
    updateHostConsumerLock(v1Lock(), verified).contents,
  );
  const repeated = spawnSync(process.execPath, [
    path.join(root, "tools", "release", "publish-host-bump-pr.mjs"),
    "--host-root", hostRoot,
    "--lock", path.join(hostRoot, "READER_UI_CONSUMER.json"),
    "--verified-release", verifiedPath,
    "--host-repository", verified.hostRepository,
    "--base", "main",
    "--github-token-env", "HOST_GITHUB_TOKEN",
  ], {
    cwd: temporaryRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${fakeBin}${path.delimiter}${process.env.PATH}`,
      HOST_GITHUB_TOKEN: "host-token",
      FAKE_GH_LOG: ghLog,
      FAKE_BASE: "main",
      FAKE_BRANCH: verified.branch,
    },
  });
  assert.equal(repeated.status, 0, repeated.stderr || repeated.stdout);
  assert.match(repeated.stdout, /PASS existing-draft/);
  const repeatedCalls = fs.readFileSync(ghLog, "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line));
  assert.equal(repeatedCalls.filter((args) => args[0] === "pr" && args[1] === "create").length, 1);
  assert.equal(repeatedCalls.filter((args) => args[0] === "pr" && args[1] === "list").length, 1);
});

test("dispatch payload must exactly match staged metadata, artifact evidence, and inventory", () => {
  const releaseMetadata = metadata();
  const staged = {
    metadata: releaseMetadata,
    inventorySha256: artifactEvidence().inventorySha256,
  };
  const payload = buildRepositoryDispatchDocument(releaseMetadata, artifactEvidence()).client_payload;
  assert.deepEqual(assertDispatchPayloadMatchesStage(payload, staged), payload);
  assert.throws(
    () => assertDispatchPayloadMatchesStage({ ...payload, unexpected: true }, staged),
    /does not exactly match/,
  );
  assert.throws(
    () => assertDispatchPayloadMatchesStage({ ...payload, manifestSha256: "9".repeat(64) }, staged),
    /does not exactly match/,
  );
  assert.throws(
    () => assertDispatchPayloadMatchesStage(payload, { ...staged, inventorySha256: "8".repeat(64) }),
    /inventorySha256/,
  );
});

test("GitHub artifact API anchors id, name, digest, workflow run, and source SHA", async () => {
  const payload = buildRepositoryDispatchDocument(metadata(), artifactEvidence()).client_payload;
  let requested;
  const record = {
    id: Number(payload.artifact.id),
    name: payload.artifact.name,
    expired: false,
    digest: `sha256:${payload.artifact.digest}`,
    workflow_run: {
      id: Number(payload.artifact.workflowRunId),
      head_sha: payload.source.sha,
    },
  };
  const result = await verifyGitHubArtifactRecord({
    payload,
    token: "test-token",
    fetchImpl: async (url, options) => {
      requested = { url, options };
      return { status: 200, json: async () => structuredClone(record) };
    },
  });
  assert.deepEqual(result, record);
  assert.equal(
    requested.url,
    `https://api.github.com/repos/minliny/Reader-UI/actions/artifacts/${payload.artifact.id}`,
  );
  assert.equal(requested.options.headers.Authorization, "Bearer test-token");

  for (const [label, mutate] of [
    ["digest", (value) => { value.digest = `sha256:${"0".repeat(64)}`; }],
    ["workflow run id", (value) => { value.workflow_run.id += 1; }],
    ["workflow head SHA", (value) => { value.workflow_run.head_sha = "0".repeat(40); }],
    ["expiry", (value) => { value.expired = true; }],
  ]) {
    const changed = structuredClone(record);
    mutate(changed);
    await assert.rejects(
      verifyGitHubArtifactRecord({
        payload,
        token: "test-token",
        fetchImpl: async () => ({ status: 200, json: async () => changed }),
      }),
      new RegExp(label.replace("expiry", "expired"), "i"),
    );
  }
  await assert.rejects(
    verifyGitHubArtifactRecord({ payload, token: "", fetchImpl: async () => ({ status: 200 }) }),
    /READER_UI_REPO_TOKEN is required/,
  );
});

test("end-to-end host verification binds committed source, full stage, payload, target, and artifact API", async (context) => {
  const fixture = createCommittedReleaseSource();
  context.after(() => fs.rmSync(fixture.temporaryRoot, { recursive: true, force: true }));
  const release = buildReleaseMetadata(fixture.temporaryRoot, {
    tag: `v${fixture.manifest.version}`,
    sourceRepository: "minliny/Reader-UI",
    sourceRef: `refs/tags/v${fixture.manifest.version}`,
    sourceSha: fixture.sourceSha,
    workflowRunId: "123456",
    artifactName: `reader-ui-v${fixture.manifest.version}`,
  });
  const artifactRoot = path.join(fixture.temporaryRoot, "release-stage");
  const staged = writeReleaseArtifactStage(fixture.temporaryRoot, artifactRoot, release);
  const evidence = {
    id: "987654",
    digest: "7".repeat(64),
    inventorySha256: staged.inventorySha256,
  };
  const payload = buildRepositoryDispatchDocument(release.metadata, evidence).client_payload;
  const verified = await verifyHostRelease({
    artifactRoot,
    host: "harmonyos",
    hostRepository: "minliny/Reader-for-HarmonyOS",
    payload,
    sourceRoot: fixture.temporaryRoot,
    token: "test-token",
    fetchImpl: async () => ({
      status: 200,
      json: async () => ({
        id: Number(evidence.id),
        name: release.metadata.artifact.name,
        expired: false,
        digest: `sha256:${evidence.digest}`,
        workflow_run: {
          id: Number(release.metadata.artifact.workflowRunId),
          head_sha: fixture.sourceSha,
        },
      }),
    }),
  });
  assert.equal(verified.releaseId, release.metadata.releaseId);
  assert.equal(verified.sourceSha, fixture.sourceSha);
  assert.equal(verified.hostRepository, "minliny/Reader-for-HarmonyOS");
  assert.match(verified.proofBoundary, /Static consumer validation/);
  await assert.rejects(
    verifyHostRelease({
      artifactRoot,
      host: "android",
      hostRepository: "minliny/Reader-for-Android",
      payload,
      sourceRoot: fixture.temporaryRoot,
      token: "test-token",
      fetchImpl: async () => {
        throw new Error("deferred host must fail before artifact API verification");
      },
    }),
    /release host target android does not authorize/,
  );
});

test("host release CLIs fail closed when required invocation context is absent", () => {
  for (const script of [
    "verify-host-release.mjs",
    "update-host-consumer-lock.mjs",
    "publish-host-bump-pr.mjs",
  ]) {
    const result = spawnSync(process.execPath, [path.join(root, "tools", "release", script)], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, GH_TOKEN: "", READER_UI_REPO_TOKEN: "" },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /\[(?:reader-ui-host-verify|reader-ui-lock-update|reader-ui-bump-pr)] FAIL --/);
  }
});

const hostWorkflowPaths = [
  ["android", path.resolve(root, "..", "Reader-for-Android", ".github", "workflows", "reader-ui-consumer.yml")],
  ["harmonyos", path.resolve(root, "..", "Reader-for-HarmonyOS", ".github", "workflows", "reader-ui-consumer.yml")],
  ["ios", path.resolve(root, "..", "Reader-for-iOS", ".github", "workflows", "ios-shell-ci.yml")],
];
const missingHostWorkflows = hostWorkflowPaths.filter(([, workflowPath]) => !fs.existsSync(workflowPath));

test("host release workflows use exact SHA, cross-repository artifact evidence, and draft-only PR publication", {
  skip: missingHostWorkflows.length > 0
    ? `cross-repository integration fixture unavailable: ${missingHostWorkflows.map(([host]) => host).join(",")}`
    : false,
}, () => {
  const workflows = hostWorkflowPaths;
  for (const [host, workflowPath] of workflows) {
    const workflow = fs.readFileSync(workflowPath, "utf8");
    assert.match(workflow, /github\.event\.client_payload\.source\.sha/);
    assert.match(workflow, /secrets\.READER_UI_REPO_TOKEN/);
    assert.match(workflow, /github\.event\.client_payload\.artifact\.workflowRunId/);
    assert.match(workflow, /artifact-ids:\s*\$\{\{ github\.event\.client_payload\.artifact\.id \}\}/);
    assert.match(workflow, /repository:\s*minliny\/Reader-UI/);
    assert.match(workflow, /Host-owned bootstrap preflight/);
    assert.match(workflow, /source\.repository !== 'minliny\/Reader-UI'/);
    assert.match(workflow, /artifact\.name !== `reader-ui-\$\{payload\.tag\}`/);
    assert.match(workflow, /bootstrap trust boundary/);
    assert.match(workflow, /persist-credentials:\s*false/);
    assert.ok([...workflow.matchAll(/persist-credentials:\s*false/g)].length >= 2);
    assert.match(workflow, /Host-owned postcondition protects rollout and repository scope/);
    assert.match(workflow, /protected lock field changed/);
    assert.match(workflow, /runtimePayloadContractsSchemaVersion/);
    assert.match(workflow, /runtimePayloadContractsSha256/);
    assert.match(workflow, /runtime-payload-contracts\.json/);
    assert.match(workflow, /after\.schemaVersion !== 3/);
    assert.doesNotMatch(workflow, /lock v2 contract/);
    assert.match(workflow, /verify-host-release\.mjs/);
    assert.match(workflow, /update-host-consumer-lock\.mjs/);
    assert.match(workflow, /publish-host-bump-pr\.mjs/);
    assert.match(workflow, /github\.event_name == 'repository_dispatch'/);
    assert.doesNotMatch(workflow, /github\.event\.client_payload\.tag\s*\|\|/);
    assert.doesNotMatch(workflow, /repository:\s*\$\{\{ github\.event\.client_payload\.source\.repository \}\}/);
    assert.doesNotMatch(workflow, /gh\s+pr\s+merge|auto-merge/);
    assert.doesNotMatch(workflow, /uses:\s+actions\/[A-Za-z0-9-]+@v\d+/);
    assert.match(workflow, /permissions:[\s\S]*contents:\s*write[\s\S]*pull-requests:\s*write/);
    if (host === "android") {
      assert.match(workflow, /name: Assemble Android debug application[\s\S]*\.\/gradlew :app:assembleDebug --no-daemon/);
    }
    if (host === "harmonyos") assert.match(workflow, /static-only here; DevEco\/HAP compile and physical-device proof are still blocked/);
    if (host === "android" || host === "harmonyos") {
      const manualSection = workflow.slice(workflow.indexOf("  manual-verify:"));
      assert.match(manualSection, /if: github\.event_name == 'workflow_dispatch'/);
      assert.doesNotMatch(manualSection, /update-host-consumer-lock\.mjs|publish-host-bump-pr\.mjs/);
    } else {
      const readOnlySection = workflow.slice(workflow.indexOf("  ios-shell-ci:"), workflow.indexOf("  reader-ui-release-bump:"));
      assert.match(readOnlySection, /if: github\.event_name != 'repository_dispatch'/);
      assert.doesNotMatch(readOnlySection, /update-host-consumer-lock\.mjs|publish-host-bump-pr\.mjs/);
    }
  }
  const publisher = fs.readFileSync(path.join(root, "tools", "release", "publish-host-bump-pr.mjs"), "utf8");
  assert.match(publisher, /run\("gh", \["auth", "setup-git"\]/);
  assert.match(publisher, /\["push", "--set-upstream", "origin", verified\.branch\], \{ cwd: hostRoot, env: ghEnvironment \}/);
  assert.match(publisher, /`- Proof boundary: \$\{verified\.proofBoundary\}`/);
  assert.match(publisher, /"--draft"/);
  assert.doesNotMatch(publisher, /pr", "merge|--auto-merge/);
});
