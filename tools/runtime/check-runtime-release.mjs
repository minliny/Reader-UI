#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const version = JSON.parse(fs.readFileSync(path.join(root, "contracts", "VERSION.json"), "utf8")).version;
const failures = [];

function requireVersion(file, pattern) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  if (!pattern.test(source)) failures.push(`${file} is not locked to ${version}`);
}

const escaped = version.replaceAll(".", "\\.");
requireVersion("reader-ui-contract/build.gradle.kts", new RegExp(`version\\s*=\\s*"${escaped}"`));
requireVersion("packages/kotlin/reader-ui-runtime/build.gradle.kts", new RegExp(`version\\s*=\\s*"${escaped}"`));

const arkPackage = JSON.parse(
  fs.readFileSync(path.join(root, "packages", "arkts", "reader-ui-runtime", "oh-package.json5"), "utf8")
);
if (arkPackage.name !== "reader_ui_runtime") failures.push(`ArkTS package name is ${arkPackage.name}, expected reader_ui_runtime`);
if (arkPackage.version !== version) failures.push(`ArkTS package is ${arkPackage.version}, expected ${version}`);

const drift = spawnSync("node", [path.join(here, "generate-runtime.mjs"), "--check"], {
  cwd: root,
  encoding: "utf8"
});
if (drift.status !== 0) failures.push((drift.stderr || drift.stdout).trim());

const coverage = spawnSync("node", [path.join(here, "generate-runtime-coverage.mjs"), "--check"], {
  cwd: root,
  encoding: "utf8"
});
if (coverage.status !== 0) failures.push((coverage.stderr || coverage.stdout).trim());

if (failures.length > 0) {
  console.error(`[runtime-release] FAIL\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`[runtime-release] PASS version=${version}`);
