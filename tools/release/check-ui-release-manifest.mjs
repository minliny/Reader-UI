#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readCheckedReleaseManifest } from "./manifest-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

if (process.argv.length > 2) {
  console.error("[ui-release-manifest] check takes no arguments");
  process.exit(2);
}

try {
  const result = readCheckedReleaseManifest(root);
  if (!result.ok) {
    console.error(`[ui-release-manifest] FAIL\n${result.messages.map((message) => `- ${message}`).join("\n")}`);
    process.exit(1);
  }
  console.log(
    `[ui-release-manifest] PASS version=${result.expected.version} files=${result.expected.files.length} groups=${result.expected.groups.length}`,
  );
} catch (error) {
  console.error(`[ui-release-manifest] FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
