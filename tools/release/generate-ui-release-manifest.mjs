#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildReleaseManifest,
  checkReleaseManifest,
  RELEASE_MANIFEST_PATH,
  serializeReleaseManifest,
} from "./manifest-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const manifestPath = path.join(root, RELEASE_MANIFEST_PATH);
const argumentsSet = new Set(process.argv.slice(2));
const supported = new Set(["--check", "--stdout"]);

for (const argument of argumentsSet) {
  if (!supported.has(argument)) {
    console.error(`[ui-release-manifest] unknown argument: ${argument}`);
    process.exit(2);
  }
}
if (argumentsSet.has("--check") && argumentsSet.has("--stdout")) {
  console.error("[ui-release-manifest] --check and --stdout are mutually exclusive");
  process.exit(2);
}

try {
  if (argumentsSet.has("--check")) {
    const rawManifest = fs.readFileSync(manifestPath, "utf8");
    const result = checkReleaseManifest(root, rawManifest);
    if (!result.ok) {
      console.error(`[ui-release-manifest] DRIFT\n${result.messages.map((message) => `- ${message}`).join("\n")}`);
      process.exit(1);
    }
    console.log(`[ui-release-manifest] PASS version=${result.expected.version} files=${result.expected.files.length}`);
  } else {
    const manifest = buildReleaseManifest(root);
    const output = serializeReleaseManifest(manifest);
    if (argumentsSet.has("--stdout")) {
      process.stdout.write(output);
    } else {
      fs.writeFileSync(manifestPath, output);
      console.log(`[ui-release-manifest] WROTE ${RELEASE_MANIFEST_PATH} version=${manifest.version} files=${manifest.files.length}`);
    }
  }
} catch (error) {
  console.error(`[ui-release-manifest] FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
