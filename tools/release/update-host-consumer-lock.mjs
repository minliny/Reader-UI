#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  assertVerifiedHostRelease,
  writeHostConsumerLock,
} from "./host-consumer-release-lib.mjs";

const requiredFlags = new Set(["--lock", "--verified-release"]);
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

try {
  const values = parseArguments(process.argv.slice(2));
  const verified = assertVerifiedHostRelease(JSON.parse(fs.readFileSync(path.resolve(values.get("--verified-release")), "utf8")));
  const result = writeHostConsumerLock(path.resolve(values.get("--lock")), verified);
  const githubOutput = values.get("--github-output");
  if (githubOutput) {
    fs.appendFileSync(
      githubOutput,
      [
        `branch=${verified.branch}`,
        `changed=${result.changed ? "true" : "false"}`,
        `release_id=${verified.releaseId}`,
        `version=${verified.readerUiVersion}`,
        "",
      ].join("\n"),
    );
  }
  console.log(
    `[reader-ui-lock-update] PASS host=${verified.host} releaseId=${verified.releaseId} ` +
      `changed=${result.changed ? "true" : "false"}`,
  );
} catch (error) {
  console.error(`[reader-ui-lock-update] FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
