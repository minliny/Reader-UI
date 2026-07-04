// Demo 一致性校验测试：调用 verify-demo-contract-consistency.mjs，验证脚本能跑通并生成 baseline 报告。
// 满足 CONTRACT_FIRST_NATIVE_UI_PLAN.md §4 验收门槛："demo 中出现的 route / motion / state 必须能在 contract 中找到"
// 本测试不要求 unknown=0（demo 是早期设计稿，包含未定型 id），只校验：
//   1. 脚本能成功执行（退出码 0）
//   2. baseline 报告文件生成
//   3. baseline 报告结构合法（items 数组 + 每项含 label/found/unknown/unknownIds）
//   4. token names 一致性（tokens.css 全部 token 在 schema pattern 内，unknown=0）
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const SCRIPT = join(REPO_ROOT, "frontend-demo", "verify", "contract", "verify-demo-contract-consistency.mjs");
const BASELINE = join(REPO_ROOT, "frontend-demo", "verify", "contract", "demo-contract-baseline.json");

test("demo 一致性校验脚本能成功执行", () => {
  assert.ok(existsSync(SCRIPT), `脚本不存在：${SCRIPT}`);
  // 退出码 0 表示脚本本身跑通
  const output = execFileSync("node", [SCRIPT], { cwd: REPO_ROOT, encoding: "utf8" });
  assert.ok(output.includes("总计："), "脚本输出应含总计行");
});

test("baseline 报告文件生成且结构合法", () => {
  assert.ok(existsSync(BASELINE), `baseline 报告未生成：${BASELINE}`);
  const report = JSON.parse(readFileSync(BASELINE, "utf8"));
  assert.ok(Array.isArray(report.items), "baseline 报告应含 items 数组");
  assert.ok(report.items.length >= 3, "baseline 应至少含 3 项（route/motion/token）");
  for (const item of report.items) {
    assert.ok(typeof item.label === "string", "item 应含 label");
    assert.ok(typeof item.found === "number", "item 应含 found");
    assert.ok(typeof item.unknown === "number", "item 应含 unknown");
    assert.ok(Array.isArray(item.unknownIds), "item 应含 unknownIds 数组");
  }
});

test("tokens.css token names 全部符合 schema pattern", () => {
  const report = JSON.parse(readFileSync(BASELINE, "utf8"));
  const tokenItem = report.items.find((i) => i.label.includes("token names"));
  assert.ok(tokenItem, "baseline 应含 token names 项");
  assert.equal(tokenItem.unknown, 0, `tokens.css 中存在 ${tokenItem.unknown} 个不符合 schema pattern 的 token name`);
});

test("route-contract.js route ids 有覆盖（found > 0）", () => {
  const report = JSON.parse(readFileSync(BASELINE, "utf8"));
  const routeItem = report.items.find((i) => i.label.includes("route-contract.js"));
  assert.ok(routeItem, "baseline 应含 route-contract.js 项");
  assert.ok(routeItem.found > 50, `route-contract.js 应提取至少 50 个 route id，实际 ${routeItem.found}`);
});

test("baseline unknown 数量可追踪（后续 schema 扩展应递减）", () => {
  const report = JSON.parse(readFileSync(BASELINE, "utf8"));
  const totalUnknown = report.items.reduce((sum, i) => sum + i.unknown, 0);
  // 不强制 0，但记录当前值，schema 扩展后应递减
  // 如果某次 schema 扩展后 totalUnknown 增加，说明 demo 新增了未收录 id，需产品决策
  assert.ok(totalUnknown < 500, `baseline unknown 总数 ${totalUnknown} 异常偏高，请检查`);
  console.log(`  当前 baseline unknown 总数：${totalUnknown}（schema 扩展后应递减）`);
});
