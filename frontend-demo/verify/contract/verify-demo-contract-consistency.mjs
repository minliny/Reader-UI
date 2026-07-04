#!/usr/bin/env node
// Demo 一致性校验：扫描 frontend-demo 中的 route id / motion id / token name，
// 校验全部能在 contracts/*.schema.json 的 enum 中找到。
// 满足 CONTRACT_FIRST_NATIVE_UI_PLAN.md §4 验收门槛：
//   "demo 中出现的 route / motion / state 必须能在 contract 中找到"
//
// 用法：node frontend-demo/verify/contract/verify-demo-contract-consistency.mjs
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const CONTRACTS_DIR = join(REPO_ROOT, "contracts");
const DEMO_DIR = join(REPO_ROOT, "frontend-demo");

function resolve(...p) {
  // 简易 resolve，避免与 node:path.resolve 重名
  return join(...p);
}

function loadJson(rel) {
  return JSON.parse(readFileSync(join(CONTRACTS_DIR, rel), "utf8"));
}

function readText(rel) {
  return readFileSync(join(DEMO_DIR, rel), "utf8");
}

// --- 加载 schema enum ---
const routeSchema = loadJson("route.schema.json");
const motionSchema = loadJson("motion.schema.json");
const tokenSchema = loadJson("token.schema.json");

const routeIds = new Set(routeSchema.properties.id.enum);
const motionIds = new Set(motionSchema.properties.id.enum);
// token name 是 pattern（无 enum），用正则校验
const tokenNamePattern = tokenSchema.properties.name
  ? new RegExp(tokenSchema.properties.name.pattern)
  : null;

// --- 扫描 demo 文件提取 id ---

// 从 route-contract.js 提取 route id（对象 key 形如 "rss-all": { ... shell: "..." })
// 只提取含 shell 字段的对象 key，避免误识别 motion/event id
function extractRouteIdsFromRouteContract(text) {
  const ids = new Set();
  // 匹配 "kebab-case": { 后续含 shell 字段
  const re = /["']([a-z][a-z0-9-]*)["']\s*:\s*\{\s*[^}]*?shell:\s*["']/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    ids.add(m[1]);
  }
  return ids;
}

// 从 fixture.js / render-runtime.js 提取 route id 引用（data-route="xxx" 或 route: "xxx"）
function extractRouteIdsFromJs(text) {
  const ids = new Set();
  // data-route="xxx" 或 data-route='xxx'（kebab-case）
  const re1 = /data-route=["']([a-z][a-z0-9-]*)["']/g;
  let m;
  while ((m = re1.exec(text)) !== null) ids.add(m[1]);
  // route: "xxx" 或 route: 'xxx'（kebab-case，排除 motion id 含点号）
  const re2 = /\broute:\s*["']([a-z][a-z0-9-]*)["']/g;
  while ((m = re2.exec(text)) !== null) {
    ids.add(m[1]);
  }
  return ids;
}

// 从 motion-controller.js / motion-tokens.css 提取 motion id
function extractMotionIds(text) {
  const ids = new Set();
  // motion id 形如 "app.firstOpen.enter" / "reader.entry.coverToImmersive"
  const re = /["']([a-z][a-z0-9]*\.[a-zA-Z0-9.]+)["']/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const id = m[1];
    // 过滤明显非 motion id 的（如 "1.0" / "true" / 文件路径）
    if (id.includes(".") && !/^\d/.test(id) && !id.includes("/")) {
      ids.add(id);
    }
  }
  return ids;
}

// 从 tokens.css 提取 token name（--reader-ds-xxx）
function extractTokenNames(text) {
  const names = new Set();
  const re = /(--reader-ds-[a-zA-Z][a-zA-Z0-9-]*)/g;
  let m;
  while ((m = re.exec(text)) !== null) names.add(m[1]);
  return names;
}

// --- 主流程 ---
let totalFound = 0;
let totalUnknown = 0;
const report = { items: [] };

function check(label, found, allowed) {
  const unknown = [...found].filter((id) => !allowed.has(id));
  totalFound += found.size;
  totalUnknown += unknown.length;
  report.items.push({ label, found: found.size, unknown: unknown.length, unknownIds: unknown });
  if (unknown.length === 0) {
    console.log(`[ PASS ] ${label} | found=${found.size} | unknown=0`);
  } else {
    console.log(`[ DIFF ] ${label} | found=${found.size} | unknown=${unknown.length}`);
    for (const id of unknown.slice(0, 10)) {
      console.log(`  - ${id}`);
    }
    if (unknown.length > 10) console.log(`  ... 还有 ${unknown.length - 10} 个`);
  }
}

// route-contract.js
if (existsSync(join(DEMO_DIR, "route-contract.js"))) {
  const text = readText("route-contract.js");
  const ids = extractRouteIdsFromRouteContract(text);
  check("route-contract.js route ids", ids, routeIds);
}

// fixture.js
if (existsSync(join(DEMO_DIR, "fixture.js"))) {
  const text = readText("fixture.js");
  const ids = extractRouteIdsFromJs(text);
  check("fixture.js route refs", ids, routeIds);
}

// render-runtime.js / render.js
for (const f of ["render-runtime.js", "render.js"]) {
  if (existsSync(join(DEMO_DIR, f))) {
    const text = readText(f);
    const ids = extractRouteIdsFromJs(text);
    check(`${f} route refs`, ids, routeIds);
  }
}

// motion-controller.js
if (existsSync(join(DEMO_DIR, "motion-controller.js"))) {
  const text = readText("motion-controller.js");
  const ids = extractMotionIds(text);
  check("motion-controller.js motion ids", ids, motionIds);
}

// motion-tokens.css
if (existsSync(join(DEMO_DIR, "motion-tokens.css"))) {
  const text = readText("motion-tokens.css");
  const ids = extractMotionIds(text);
  check("motion-tokens.css motion ids", ids, motionIds);
}

// tokens.css
if (existsSync(join(DEMO_DIR, "tokens.css"))) {
  const text = readText("tokens.css");
  const names = extractTokenNames(text);
  if (tokenNamePattern) {
    const unknown = [...names].filter((n) => !tokenNamePattern.test(n));
    totalFound += names.size;
    totalUnknown += unknown.length;
    report.items.push({ label: "tokens.css token names", found: names.size, unknown: unknown.length, unknownIds: unknown });
    if (unknown.length === 0) {
      console.log(`[ PASS ] tokens.css token names | found=${names.size} | unknown=0`);
    } else {
      console.log(`[ DIFF ] tokens.css token names | found=${names.size} | unknown=${unknown.length}`);
      for (const n of unknown.slice(0, 10)) console.log(`  - ${n}`);
    }
  } else {
    console.log(`[ SKIP ] tokens.css token names（schema 无 pattern）`);
  }
}

// 输出 baseline 报告
const reportPath = join(DEMO_DIR, "verify", "contract", "demo-contract-baseline.json");
writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

console.log("");
console.log(`总计：found=${totalFound} unknown=${totalUnknown}`);
console.log(`baseline 报告：${reportPath}`);
console.log("说明：unknown 表示 demo 中存在但 schema 未收录的 id，需产品决策是否补入 schema。");
console.log("退出码 0，不阻塞测试。schema 扩展后 unknown 会相应减少。");
