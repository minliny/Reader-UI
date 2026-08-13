#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  serializeVerifiedHostRelease,
  verifyHostRelease,
} from "./host-consumer-release-lib.mjs";

const requiredFlags = new Set([
  "--artifact-root",
  "--github-token-env",
  "--host",
  "--host-repository",
  "--output",
  "--payload-env",
  "--source-root",
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
  for (const flag of requiredFlags) {
    if (!values.has(flag)) throw new Error(`${flag} is required`);
  }
  return values;
}

function readRequiredEnvironment(name, label) {
  if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) throw new Error(`${label} must name a canonical environment variable`);
  const value = process.env[name];
  if (typeof value !== "string" || value.length === 0) throw new Error(`${name} is required`);
  return value;
}

try {
  const values = parseArguments(process.argv.slice(2));
  const payloadText = readRequiredEnvironment(values.get("--payload-env"), "--payload-env");
  let payload;
  try {
    payload = JSON.parse(payloadText);
  } catch (error) {
    throw new Error(`repository dispatch client_payload is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  const verified = await verifyHostRelease({
    artifactRoot: path.resolve(values.get("--artifact-root")),
    host: values.get("--host"),
    hostRepository: values.get("--host-repository"),
    payload,
    sourceRoot: path.resolve(values.get("--source-root")),
    token: readRequiredEnvironment(values.get("--github-token-env"), "--github-token-env"),
  });
  const output = path.resolve(values.get("--output"));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, serializeVerifiedHostRelease(verified), { flag: "wx", mode: 0o600 });
  const githubOutput = values.get("--github-output");
  if (githubOutput) {
    fs.appendFileSync(
      githubOutput,
      [
        `branch=${verified.branch}`,
        `release_id=${verified.releaseId}`,
        `source_sha=${verified.sourceSha}`,
        `version=${verified.readerUiVersion}`,
        "",
      ].join("\n"),
    );
  }
  console.log(
    `[reader-ui-host-verify] PASS host=${verified.host} releaseId=${verified.releaseId} ` +
      `artifactId=${verified.artifact.id}`,
  );
} catch (error) {
  console.error(`[reader-ui-host-verify] FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
