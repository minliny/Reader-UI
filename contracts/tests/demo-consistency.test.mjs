// Demo 一致性校验测试：调用 verify-demo-contract-consistency.mjs，验证脚本能跑通并生成 baseline 报告。
// 满足 CONTRACT_FIRST_NATIVE_UI_PLAN.md §4 验收门槛："demo 中出现的 route / motion / state 必须能在 contract 中找到"
// 本测试不要求 motion unknown=0（demo 是早期设计稿，包含未定型 id），只校验：
//   1. 脚本能成功执行（退出码 0）
//   2. baseline 报告文件生成
//   3. baseline 报告结构合法（items 数组 + 每项含 label/found/unknown/unapproved）
//   4. token names 一致性（tokens.css 全部 token 在 schema pattern 内，unknown=0）
//   5. route/token unknown 必须为 0；motion unknown 必须列入显式 exception policy
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const SCRIPT = join(REPO_ROOT, "frontend-demo-optimized", "verify", "contract", "verify-demo-contract-consistency.mjs");
const BASELINE = join(REPO_ROOT, "frontend-demo-optimized", "verify", "contract", "demo-contract-baseline.json");
const EXCEPTIONS = join(REPO_ROOT, "frontend-demo-optimized", "verify", "contract", "demo-contract-exceptions.json");

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
    assert.ok(typeof item.approvedUnknown === "number", "item 应含 approvedUnknown");
    assert.ok(typeof item.unapproved === "number", "item 应含 unapproved");
    assert.ok(Array.isArray(item.unknownIds), "item 应含 unknownIds 数组");
    assert.ok(Array.isArray(item.approvedUnknownIds), "item 应含 approvedUnknownIds 数组");
    assert.ok(Array.isArray(item.unapprovedIds), "item 应含 unapprovedIds 数组");
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

test("route/token unknown 为 0，motion unknown 只能来自显式例外", () => {
  const report = JSON.parse(readFileSync(BASELINE, "utf8"));
  const routeItems = report.items.filter((i) => i.policy === "route");
  const tokenItems = report.items.filter((i) => i.policy === "token");
  const motionItems = report.items.filter((i) => i.policy === "motion");
  assert.ok(routeItems.length > 0, "baseline 应含 route policy 项");
  assert.ok(tokenItems.length > 0, "baseline 应含 token policy 项");
  assert.ok(motionItems.length > 0, "baseline 应含 motion policy 项");
  assert.equal(routeItems.reduce((sum, i) => sum + i.unknown, 0), 0, "route unknown 必须为 0");
  assert.equal(tokenItems.reduce((sum, i) => sum + i.unknown, 0), 0, "token unknown 必须为 0");
  assert.equal(report.items.reduce((sum, i) => sum + i.unapproved, 0), 0, "所有 unknown 必须为 0 或显式批准");
  assert.ok(
    motionItems.every((i) => i.unknown === i.approvedUnknown && i.unapproved === 0),
    "motion unknown 必须全部列入 explicit exception policy"
  );
});

test("motion exception policy 结构合法", () => {
  assert.ok(existsSync(EXCEPTIONS), `exception policy 不存在：${EXCEPTIONS}`);
  const policy = JSON.parse(readFileSync(EXCEPTIONS, "utf8"));
  assert.equal(policy.policy.routeUnknown, "fail");
  assert.equal(policy.policy.tokenUnknown, "fail");
  assert.equal(policy.policy.motionUnknown, "allow-only-listed");
  assert.ok(Array.isArray(policy.motion), "policy.motion 必须是数组");
  assert.ok(policy.motion.length > 0, "policy.motion 不能为空");
  const allowedTypes = new Set(["alias", "deprecated", "exception"]);
  for (const entry of policy.motion) {
    assert.ok(typeof entry.id === "string" && entry.id.length > 0, "motion policy entry 必须有 id");
    assert.ok(allowedTypes.has(entry.type), `motion policy entry type 非法：${entry.id}`);
    assert.ok(typeof entry.reason === "string" && entry.reason.length > 0, `motion policy entry 必须有 reason：${entry.id}`);
    if (entry.type === "alias") {
      assert.ok(typeof entry.canonicalId === "string" && entry.canonicalId.length > 0, `alias 必须有 canonicalId：${entry.id}`);
    }
  }
});

test("R16B 五个 workflow 的 35 个 direct ViewState route 都有 optimized demo dispatcher", () => {
  const runtime = readFileSync(join(REPO_ROOT, "frontend-demo-optimized", "render-runtime.js"), "utf8");
  const rendererSources = Object.fromEntries(
    ["w3-source-switch-renderers.js", "w4-theme-font-typography-renderers.js", "w5-replace-rules-renderers.js"]
      .map((name) => [name, readFileSync(join(REPO_ROOT, "frontend-demo-optimized", "renderers", name), "utf8")]),
  );
  const directCases = [
    "import-permission-denied", "import-format-unsupported", "import-empty-file", "import-parsing",
    "import-duplicate", "import-conflict-resolve", "import-partial-success", "import-result-detail",
    "reader-toc-loading", "reader-toc-offline", "reader-toc-error",
    "reader-content-loading", "reader-content-offline", "reader-content-error",
    "reader-page-boundary-first", "reader-page-boundary-last",
    "reader-progress-restore", "reader-background-restore",
  ];
  for (const routeId of directCases) {
    assert.ok(runtime.includes(`case "${routeId}":`), `render-runtime.js 缺少 ${routeId} dispatcher`);
  }

  const modularRoutes = {
    "w3-source-switch-renderers.js": [
      "source-switch-empty", "source-switch-error", "source-switch-timeout",
      "source-switch-loading", "source-switch-rollback", "source-switch-preview",
    ],
    "w4-theme-font-typography-renderers.js": [
      "reader-font-import-confirm", "reader-font-delete-confirm", "reader-font-fallback",
      "reader-theme-new", "reader-theme-delete-confirm", "reader-typography-reset-confirm",
    ],
    "w5-replace-rules-renderers.js": [
      "reader-replace-delete-confirm", "reader-replace-apply-result",
      "reader-replace-import-export", "reader-replace-preview", "reader-replace-page",
    ],
  };
  for (const [name, routeIds] of Object.entries(modularRoutes)) {
    for (const routeId of routeIds) {
      assert.ok(rendererSources[name].includes(`"${routeId}":`), `${name} 缺少 ${routeId} integration map`);
    }
  }
  assert.match(runtime, /ReaderW3SourceSwitchRenderers\.INTEGRATION_MAP/);
  assert.match(runtime, /ReaderW4ThemeFontTypographyRenderers\.renderW4Route/);
  assert.match(runtime, /ReaderW5ReplaceRulesRenderers\.INTEGRATION_MAP/);
});
