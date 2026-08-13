#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertArtifactEvidence,
  assertMetadataMatchesRepository,
  assertReleaseExecutionContext,
  buildReleaseDispatchPlan,
  dispatchRepositoryUpdates,
  parseConfiguredTargetRepositories,
  verifyReleaseArtifactStage,
} from "./release-automation-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const valueFlags = new Set(["--artifact-digest", "--artifact-id", "--artifact-root", "--inventory-sha256"]);

function parseArguments(argv) {
  const values = new Map();
  let dryRun = false;
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--dry-run") {
      if (dryRun) throw new Error("duplicate argument: --dry-run");
      dryRun = true;
      continue;
    }
    if (!valueFlags.has(flag)) throw new Error(`unknown argument: ${flag ?? "<missing>"}`);
    const value = argv[index + 1];
    if (typeof value !== "string" || value.length === 0 || value.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }
    if (values.has(flag)) throw new Error(`duplicate argument: ${flag}`);
    values.set(flag, value);
    index += 1;
  }
  for (const required of valueFlags) {
    if (!values.has(required)) throw new Error(`${required} is required`);
  }
  return { values, dryRun };
}

try {
  const { values, dryRun } = parseArguments(process.argv.slice(2));
  const staged = verifyReleaseArtifactStage(path.resolve(values.get("--artifact-root")));
  if (values.get("--inventory-sha256") !== staged.inventorySha256) {
    throw new Error("downloaded release artifact inventory SHA-256 does not match the validate job output");
  }
  const metadata = staged.metadata;
  assertReleaseExecutionContext(metadata, {
    sourceRepository: process.env.GITHUB_REPOSITORY,
    sourceRef: process.env.GITHUB_REF,
    sourceSha: process.env.GITHUB_SHA,
    workflowRunId: process.env.GITHUB_RUN_ID,
    artifactName: process.env.READER_UI_ARTIFACT_NAME,
  });
  assertMetadataMatchesRepository(root, metadata, staged.manifestBytes);
  const artifactEvidence = assertArtifactEvidence({
    id: values.get("--artifact-id"),
    digest: values.get("--artifact-digest"),
    inventorySha256: values.get("--inventory-sha256"),
  });
  const targets = parseConfiguredTargetRepositories(root, process.env.READER_HOST_SYNC_REPOSITORIES);

  if (dryRun) {
    const plan = buildReleaseDispatchPlan(metadata, artifactEvidence, targets);
    console.error(`[ui-release-dispatch] DRY-RUN releaseId=${metadata.releaseId} targets=${targets.length}`);
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  } else {
    const result = await dispatchRepositoryUpdates({
      targets,
      token: process.env.READER_HOST_SYNC_TOKEN,
      metadata,
      artifactEvidence,
    });
    console.log(
      `[ui-release-dispatch] PASS targets=${result.repositories.join(",")} ` +
        `releaseId=${metadata.releaseId} manifestSha256=${metadata.manifestSha256}`,
    );
  }
} catch (error) {
  console.error(`[ui-release-dispatch] FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
