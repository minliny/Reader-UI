#!/usr/bin/env node
// 独立校验脚本：不依赖 node:test，跑 fixtures 全量校验并输出报告。
// 自动扫描 contracts/*.schema.json 和对应 fixtures。
// 用法：node contracts/tests/validate.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { validate, registerSchemas } from "./mini-validator.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACTS_DIR = join(__dirname, "..");

function loadJson(rel) {
  return JSON.parse(readFileSync(join(CONTRACTS_DIR, rel), "utf8"));
}

// 自动扫描所有 *.schema.json
const schemaFiles = readdirSync(CONTRACTS_DIR)
  .filter((f) => f.endsWith(".schema.json"))
  .map((f) => f.replace(/\.schema\.json$/, ""));

const schemas = {};
for (const name of schemaFiles) {
  schemas[name] = loadJson(`${name}.schema.json`);
}

// 注册全部 schema（以文件名与 $id 为键），供 mini-validator 解析跨文件 $ref
// （如 motion-policy.schema.json -> motion.schema.json#/$defs/MotionId）。
const registryByName = {};
for (const name of schemaFiles) {
  registryByName[`${name}.schema.json`] = schemas[name];
}
registerSchemas(registryByName);

// 自动加载对应 fixtures（若存在）
const fixtures = {};
for (const name of schemaFiles) {
  const fp = join(CONTRACTS_DIR, "fixtures", `${name}.fixtures.json`);
  fixtures[name] = existsSync(fp) ? loadJson(`fixtures/${name}.fixtures.json`) : [];
}

let totalFixtures = 0;
let totalErrors = 0;

for (const [name, schema] of Object.entries(schemas)) {
  const items = fixtures[name] || [];
  let fileErrors = 0;
  for (const item of items) {
    const errors = validate(schema, item);
    if (errors.length > 0) {
      fileErrors += errors.length;
      console.error(`[FAIL] ${name} fixture: ${JSON.stringify(item).slice(0, 80)}`);
      for (const e of errors) {
        console.error(`  - ${e.path}: ${e.message}`);
      }
    }
  }
  totalFixtures += items.length;
  totalErrors += fileErrors;
  console.log(`[ ${fileErrors === 0 ? "PASS" : "FAIL"} ] ${name}.schema.json | fixtures=${items.length} | errors=${fileErrors}`);
}

console.log("");
console.log(`总计：fixtures=${totalFixtures} errors=${totalErrors}`);

if (totalErrors > 0) {
  process.exit(1);
}
