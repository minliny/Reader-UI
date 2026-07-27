// P0 链路验收矩阵测试 — 断言 Contract 仓库 5 条 P0 链路 A-F 全部 ✅
// 该测试作为 CI gate：Contract 侧必须全绿，否则阻断合并
// 调用 frontend-demo-optimized/verify/verify-p0-chain-matrix.mjs 中的核心逻辑

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { verifyP0ChainMatrix } from "../../frontend-demo-optimized/verify/verify-p0-chain-matrix.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 5 条 P0 链路（与脚本定义保持一致）
const P0_CHAINS = ["bookshelf", "reader", "source-switch", "book-detail", "settings"];

// A-F 六列
const COLUMNS = ["A", "B", "C", "D", "E", "F"];

test("P0 链路矩阵可执行且返回结构合法", () => {
  const { matrix } = verifyP0ChainMatrix();
  assert.ok(matrix, "矩阵对象不应为空");
  for (const chain of P0_CHAINS) {
    assert.ok(matrix[chain], `矩阵缺少链路：${chain}`);
    assert.ok(matrix[chain].Contract, `矩阵缺少 Contract 仓库条目：${chain}`);
  }
});

test("Contract 仓库 5 条 P0 链路 A-F 全部 ✅", () => {
  const { matrix } = verifyP0ChainMatrix();
  const failures = [];
  for (const chain of P0_CHAINS) {
    const contractResult = matrix[chain].Contract;
    for (const col of COLUMNS) {
      if (!contractResult[col]) {
        failures.push(`${chain}.${col}`);
      }
    }
  }
  assert.deepEqual(
    failures,
    [],
    `Contract 侧存在失败项（应全绿）：\n${failures.map((f) => `  - ${f}`).join("\n")}\n` +
      `请检查 contracts/fixtures/ 下的 fixtures 是否覆盖完整。`
  );
});

test("每条 P0 链路在 Contract 仓库中至少有一条 view-state 记录", () => {
  const viewState = JSON.parse(
    readFileSync(join(__dirname, "..", "fixtures", "view-state.fixtures.json"), "utf8")
  );
  for (const chain of P0_CHAINS) {
    const entries = viewState.filter((v) => v.routeId === chain);
    assert.ok(entries.length > 0, `链路 ${chain} 在 view-state.fixtures.json 中无记录`);
  }
});
