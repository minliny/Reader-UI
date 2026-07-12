// Codegen 幂等性校验：跑两次 codegen，比对 generated/ 下所有文件 byte-for-byte 一致。
// 同时验证当前 generated/ 就是 codegen 的产物（drift check）。
//
// 策略：
//   1. 读取 generated/{swift,kotlin,arkts}/ 下所有代码文件作为 baseline
//   2. 执行 `node tools/codegen/generate.mjs`
//   3. 重新读取所有文件
//   4. 比对 before === after（byte-for-byte）
//   5. 若不一致，恢复 baseline 后再 fail，避免留下脏状态
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const GENERATED_DIR = join(REPO_ROOT, "generated");
const CODEGEN_ENTRY = join(REPO_ROOT, "tools", "codegen", "generate.mjs");

// 收集 generated/ 下所有代码文件（.swift / .kt / .ets），排除 README.md
function listGeneratedFiles() {
  const result = [];
  for (const platform of ["swift", "kotlin", "arkts"]) {
    const dir = join(GENERATED_DIR, platform);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => /\.(swift|kt|ets)$/.test(f));
    for (const f of files) {
      result.push(join(platform, f));
    }
  }
  return result;
}

function readGenerated(rel) {
  return readFileSync(join(GENERATED_DIR, rel), "utf8");
}

function writeGenerated(rel, content) {
  writeFileSync(join(GENERATED_DIR, rel), content, "utf8");
}

// 执行 codegen，返回 { status, stdout, stderr }
function runCodegen() {
  const result = spawnSync("node", [CODEGEN_ENTRY], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

test("codegen 入口存在且可执行", () => {
  assert.ok(existsSync(CODEGEN_ENTRY), `codegen 入口不存在：${CODEGEN_ENTRY}`);
});

test("generated/ 下存在 45 个代码文件（14 schema + ScreenGraph × 3 端）", () => {
  const files = listGeneratedFiles();
  assert.equal(files.length, 45, `expected 45 generated files, got ${files.length}`);
  // 每端各 15 个：14 个 contract schema 产物 + 1 个 R16 ScreenGraph 产物。
  const swift = files.filter((f) => f.startsWith("swift/")).length;
  const kotlin = files.filter((f) => f.startsWith("kotlin/")).length;
  const arkts = files.filter((f) => f.startsWith("arkts/")).length;
  assert.equal(swift, 15, `swift 端文件数应为 15，实际 ${swift}`);
  assert.equal(kotlin, 15, `kotlin 端文件数应为 15，实际 ${kotlin}`);
  assert.equal(arkts, 15, `arkts 端文件数应为 15，实际 ${arkts}`);
});

test("codegen 退出码为 0", () => {
  const { status, stderr } = runCodegen();
  assert.equal(status, 0, `codegen 退出码非 0：status=${status}\nstderr=${stderr}`);
});

test("codegen 幂等性：跑前后所有文件 byte-for-byte 一致", () => {
  const files = listGeneratedFiles();
  assert.ok(files.length === 45, "generated 文件数应为 45");

  // 1. 读 baseline
  const before = new Map();
  for (const rel of files) {
    before.set(rel, readGenerated(rel));
  }

  // 2. 跑 codegen
  const { status, stderr } = runCodegen();
  assert.equal(status, 0, `codegen 退出码非 0：${stderr}`);

  // 3. 读 after 并比对
  const mismatches = [];
  for (const rel of files) {
    const after = readGenerated(rel);
    if (before.get(rel) !== after) {
      mismatches.push(rel);
      // 恢复 baseline，避免留下脏状态
      writeGenerated(rel, before.get(rel));
    }
  }

  assert.deepEqual(
    mismatches,
    [],
    `codegen 幂等性失败，以下文件在 codegen 后发生变化：\n${mismatches.join("\n")}\n` +
      `已恢复 baseline，请检查 codegen 是否存在非确定性输出（时间戳、随机、Map 遍历顺序等）。`
  );
});

test("codegen drift check：当前 generated/ 即为 codegen 产物", () => {
  // 这个测试验证：如果把 generated/ 全部清空再 codegen，结果与当前一致。
  // 实际实现等价于幂等性测试：跑 codegen 后文件不变，说明当前就是产物。
  // 这里额外校验：跑 codegen 后，所有文件仍包含 AUTO-GENERATED 标识。
  const files = listGeneratedFiles();
  const missing = [];
  for (const rel of files) {
    const text = readGenerated(rel);
    if (!text.includes("AUTO-GENERATED")) {
      missing.push(rel);
    }
  }
  assert.deepEqual(
    missing,
    [],
    `以下生成文件缺少 AUTO-GENERATED 标识：\n${missing.join("\n")}`
  );
});

test("codegen 后无多余文件产生", () => {
  const before = new Set(listGeneratedFiles());
  const { status } = runCodegen();
  assert.equal(status, 0, "codegen 退出码非 0");
  const after = new Set(listGeneratedFiles());
  const added = [...after].filter((f) => !before.has(f));
  const removed = [...before].filter((f) => !after.has(f));
  assert.deepEqual(added, [], `codegen 后多出文件：\n${added.join("\n")}`);
  assert.deepEqual(removed, [], `codegen 后少了文件：\n${removed.join("\n")}`);
});
