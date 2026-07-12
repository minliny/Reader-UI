#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildDeviceConformancePlan,
  buildDeviceConformanceReport,
  DEVICE_CONFORMANCE_PLAN_PATH,
  DEVICE_CONFORMANCE_REPORT_PATH,
  serializeDeviceConformancePlan,
} from "./device-conformance-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const check = process.argv.includes("--check");
const unknown = process.argv.slice(2).filter((argument) => argument !== "--check");
if (unknown.length > 0) {
  console.error(`unknown arguments: ${unknown.join(" ")}`);
  process.exit(2);
}

const plan = buildDeviceConformancePlan(root);
const outputs = new Map([
  [DEVICE_CONFORMANCE_PLAN_PATH, serializeDeviceConformancePlan(plan)],
  [DEVICE_CONFORMANCE_REPORT_PATH, buildDeviceConformanceReport(plan)],
]);
const drift = [];

for (const [relativePath, expected] of outputs) {
  const absolutePath = path.join(root, relativePath);
  if (check) {
    if (!fs.existsSync(absolutePath)) drift.push(`${relativePath} is missing`);
    else if (fs.readFileSync(absolutePath, "utf8") !== expected) drift.push(`${relativePath} drifted`);
    continue;
  }
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, expected);
  console.log(`generated ${relativePath}`);
}

if (drift.length > 0) {
  for (const message of drift) console.error(message);
  process.exit(1);
}
if (check) console.log("device conformance kit is deterministic and current");
