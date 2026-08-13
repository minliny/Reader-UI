#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildReleaseMetadata,
  writeReleaseArtifactStage,
} from "./release-automation-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const requiredFlags = new Set([
  "--artifact-name",
  "--artifact-output",
  "--source-ref",
  "--source-repository",
  "--source-sha",
  "--tag",
  "--workflow-run-id",
]);
const optionalFlags = new Set(["--github-output"]);
const supportedFlags = new Set([...requiredFlags, ...optionalFlags]);

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!supportedFlags.has(flag)) throw new Error(`unknown argument: ${flag ?? "<missing>"}`);
    if (typeof value !== "string" || value.length === 0 || value.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }
    if (values.has(flag)) throw new Error(`duplicate argument: ${flag}`);
    values.set(flag, value);
  }
  for (const required of requiredFlags) {
    if (!values.has(required)) throw new Error(`${required} is required`);
  }
  return values;
}

try {
  const argumentsMap = parseArguments(process.argv.slice(2));
  const artifactOutput = path.resolve(argumentsMap.get("--artifact-output"));
  if (artifactOutput === root || artifactOutput === path.parse(artifactOutput).root) {
    throw new Error("--artifact-output must be a dedicated empty staging directory");
  }
  const release = buildReleaseMetadata(root, {
    tag: argumentsMap.get("--tag"),
    sourceRepository: argumentsMap.get("--source-repository"),
    sourceRef: argumentsMap.get("--source-ref"),
    sourceSha: argumentsMap.get("--source-sha"),
    workflowRunId: argumentsMap.get("--workflow-run-id"),
    artifactName: argumentsMap.get("--artifact-name"),
  });
  const staged = writeReleaseArtifactStage(root, artifactOutput, release);

  const githubOutput = argumentsMap.get("--github-output");
  if (githubOutput) {
    fs.appendFileSync(
      githubOutput,
      [
        `artifact_name=${release.metadata.artifact.name}`,
        `inventory_sha256=${staged.inventorySha256}`,
        `manifest_sha256=${release.metadata.manifestSha256}`,
        `runtime_actions_sha256=${release.metadata.runtimeActionsSha256}`,
        `runtime_payload_contracts_schema_version=${release.metadata.runtimePayloadContractsSchemaVersion}`,
        `runtime_payload_contracts_sha256=${release.metadata.runtimePayloadContractsSha256}`,
        `version=${release.metadata.version}`,
        "",
      ].join("\n"),
    );
  }
  console.log(
    `[ui-release-prepare] PASS version=${release.metadata.version} tag=${release.metadata.tag} ` +
      `sourceFiles=${staged.inventory.sourceFileCount} manifestSha256=${release.metadata.manifestSha256}`,
  );
} catch (error) {
  console.error(`[ui-release-prepare] FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
