#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const specFile = path.join(root, "ui-spec", "runtime-payload-contracts.json");
const coreRoot = path.resolve(process.env.READER_CORE_NATIVE_DIR || path.join(root, "..", "Reader-Core-Native"));
const update = process.argv.includes("--update");
const spec = JSON.parse(fs.readFileSync(specFile, "utf8"));
const drift = [];

for (const entry of spec.sourceOfTruth.sources) {
  const file = path.join(coreRoot, entry.path);
  if (!fs.existsSync(file)) {
    drift.push(`${entry.path}: source file is missing under ${coreRoot}`);
    continue;
  }
  const digest = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  if (digest === entry.sha256) continue;
  if (update) {
    entry.sha256 = digest;
  } else {
    drift.push(`${entry.path}: expected ${entry.sha256}, actual ${digest}`);
  }
}

if (update) {
  fs.writeFileSync(specFile, `${JSON.stringify(spec, null, 2)}\n`);
  console.log(`[runtime-payload-source] updated ${spec.sourceOfTruth.sources.length} source hashes`);
} else if (drift.length > 0) {
  console.error(`[runtime-payload-source] drift:\n${drift.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`[runtime-payload-source] verified ${spec.sourceOfTruth.sources.length} source hashes`);
}
