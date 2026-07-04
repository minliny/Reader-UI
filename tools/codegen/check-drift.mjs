// Generated drift check：运行 codegen 后必须无 diff。
// 用法：node tools/codegen/check-drift.mjs
// 退出码：0 = 无 drift，1 = 检测到 drift 或 codegen 失败
//
// 检查逻辑：
//   1. 计算 generated/ 目录所有文件的 sha256 hash（before）
//   2. 运行 tools/codegen/generate.mjs
//   3. 重新计算 hash（after）
//   4. 对比 before / after，如果有任何文件 added / removed / changed，则 drift
//
// 这保证 generated/ 目录与 schema + fixtures 始终一致，
// 任何 schema/fixtures 改动必须同步重新生成 generated，否则 CI 失败。

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const GENERATED_DIR = join(REPO_ROOT, "generated");
const CODEGEN_DIR = join(REPO_ROOT, "tools", "codegen");

function hashDir(dir) {
  if (!existsSync(dir)) return {};
  const files = [];
  function walk(d) {
    for (const name of readdirSync(d)) {
      if (name === ".DS_Store") continue;
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else files.push(p);
    }
  }
  walk(dir);
  const hashes = {};
  for (const f of files.sort()) {
    const rel = f.replace(GENERATED_DIR + "/", "");
    hashes[rel] = createHash("sha256").update(readFileSync(f)).digest("hex");
  }
  return hashes;
}

const before = hashDir(GENERATED_DIR);

const result = spawnSync("node", ["generate.mjs"], {
  cwd: CODEGEN_DIR,
  stdio: "inherit",
});

if (result.status !== 0) {
  console.error("drift check 失败：codegen 执行出错");
  process.exit(1);
}

const after = hashDir(GENERATED_DIR);

const beforeKeys = Object.keys(before);
const afterKeys = Object.keys(after);
const diffs = [];

for (const k of beforeKeys) {
  if (!after[k]) diffs.push(`removed: generated/${k}`);
  else if (before[k] !== after[k]) diffs.push(`changed: generated/${k}`);
}
for (const k of afterKeys) {
  if (!before[k]) diffs.push(`added: generated/${k}`);
}

if (diffs.length > 0) {
  console.error("generated drift detected：");
  for (const d of diffs) console.error(`  ${d}`);
  console.error("");
  console.error("请运行 node tools/codegen/generate.mjs 重新生成，并提交 generated/ 目录。");
  process.exit(1);
}

console.log(`drift check 通过：generated/ 目录与 schema + fixtures 一致（${afterKeys.length} 个文件）`);
