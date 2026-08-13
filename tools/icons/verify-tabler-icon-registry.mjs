#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const demoRoot = path.join(root, "frontend-demo-optimized");
const assetRoot = path.join(demoRoot, "asset-library");
const mapPath = path.join(assetRoot, "tabler-icon-map.json");
const registryPath = path.join(assetRoot, "icons.js");
const manifest = JSON.parse(fs.readFileSync(mapPath, "utf8"));
const failures = [];

function fail(message) {
  failures.push(message);
}

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "tabler"].includes(entry.name)) continue;
      files.push(...walk(absolute));
    } else if (entry.isFile() && [".js", ".html"].includes(path.extname(entry.name))) {
      if (absolute !== registryPath) files.push(absolute);
    }
  }
  return files;
}

const semantics = Object.keys(manifest.semantics);
const upstreamNames = [...new Set(Object.values(manifest.semantics))];
if (semantics.length !== 128) fail(`expected 128 semantic icons, found ${semantics.length}`);
if (upstreamNames.length !== 110) fail(`expected 110 upstream SVGs, found ${upstreamNames.length}`);
if (new Set(manifest.filledSemantics).size !== 11) fail("expected 11 filled semantic assets");

const vendorRoot = path.join(assetRoot, "icons", "tabler", manifest.source.version);
for (const upstream of upstreamNames) {
  if (!fs.existsSync(path.join(vendorRoot, "outline", `${upstream}.svg`))) {
    fail(`missing outline SVG: ${upstream}`);
  }
}
for (const semantic of manifest.filledSemantics) {
  const upstream = manifest.semantics[semantic];
  if (!fs.existsSync(path.join(vendorRoot, "filled", `${upstream}.svg`))) {
    fail(`missing filled SVG: ${semantic} -> ${upstream}`);
  }
}
for (const requiredFile of ["LICENSE.txt", "SOURCE.json"]) {
  if (!fs.existsSync(path.join(vendorRoot, requiredFile))) fail(`missing vendor metadata: ${requiredFile}`);
}

const errors = [];
const sandbox = {
  window: {},
  console: { error: (...items) => errors.push(items.join(" ")) },
};
vm.runInNewContext(fs.readFileSync(registryPath, "utf8"), sandbox, { filename: registryPath });
const registry = sandbox.window.ReaderAssetIcons;
if (!registry) fail("ReaderAssetIcons was not attached to window");
if (registry?.source?.version !== manifest.source.version) fail("registry source version does not match mapping");
if (registry?.names?.length !== semantics.length) fail("registry semantic count does not match mapping");
if (registry?.filledNames?.length !== manifest.filledSemantics.length) fail("registry filled count does not match mapping");

for (const semantic of semantics) {
  if (!registry?.has(semantic)) fail(`registry is missing outline semantic: ${semantic}`);
  const svg = registry?.renderIcon(semantic, "verify-icon");
  if (!svg || !svg.includes(`data-icon-name="${semantic}"`) || !svg.includes('class="verify-icon"')) {
    fail(`outline render failed: ${semantic}`);
  }
}
for (const semantic of manifest.filledSemantics) {
  if (!registry?.has(semantic, "filled")) fail(`registry is missing filled semantic: ${semantic}`);
  const svg = registry?.renderIcon(semantic, "verify-icon", "filled");
  if (!svg || !svg.includes('data-reader-icon-variant="filled"')) fail(`filled render failed: ${semantic}`);
}
if (registry?.renderIcon("__missing__", "verify-icon") !== "") fail("unknown icons must render an empty string");
if (errors.length !== 1 || !errors[0].includes("__missing__")) fail("unknown icon error reporting is not deterministic");

const used = new Set();
const patterns = [
  /\b(?:icon|renderIcon)\s*\(\s*["'`]([A-Za-z0-9_-]+)["'`]/g,
  /\b(?:icon|iconName)\s*:\s*["'`]([A-Za-z0-9_-]+)["'`]/g,
];
for (const filePath of walk(demoRoot)) {
  const source = fs.readFileSync(filePath, "utf8");
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    for (let match = pattern.exec(source); match; match = pattern.exec(source)) used.add(match[1]);
  }
}
const staticGaps = [...used].filter((name) => !manifest.semantics[name]).sort();
if (staticGaps.length) fail(`static icon semantics are not mapped: ${staticGaps.join(", ")}`);

const generator = path.join(here, "generate-tabler-icon-registry.mjs");
const generatedCheck = spawnSync(process.execPath, [generator, "--check"], {
  cwd: root,
  encoding: "utf8",
});
if (generatedCheck.status !== 0) fail(generatedCheck.stderr.trim() || generatedCheck.stdout.trim());

if (failures.length) {
  console.error(`[tabler-icons] FAIL\n${failures.map((message) => `- ${message}`).join("\n")}`);
  process.exit(1);
}

console.log(
  `[tabler-icons] PASS semantics=${semantics.length} upstream=${upstreamNames.length} ` +
  `filled=${manifest.filledSemantics.length} staticUsed=${used.size} staticGaps=0`,
);
