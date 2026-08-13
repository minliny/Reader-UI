// Phase 2 Motion Policy 测试：校验 motion-policy.fixtures.json 完整性、motionId 引用合法性、operation 覆盖。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validate, registerSchema } from "./mini-validator.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACTS_DIR = join(__dirname, "..");

function loadJson(rel) {
  return JSON.parse(readFileSync(join(CONTRACTS_DIR, rel), "utf8"));
}

const motionSchema = loadJson("motion.schema.json");
const motionPolicySchema = loadJson("motion-policy.schema.json");
const policyFixtures = loadJson("fixtures/motion-policy.fixtures.json");
const routeSchema = loadJson("route.schema.json");

// motion-policy.schema.json 的 motionId 通过跨文件 $ref 引用 motion.schema.json#/$defs/MotionId，
// 需注册目标 schema 供 mini-validator 解析。
registerSchema("motion.schema.json", motionSchema);
registerSchema("motion-policy.schema.json", motionPolicySchema);

const motionIds = new Set(motionSchema.properties.id.enum);
const routeIds = new Set(routeSchema.properties.id.enum);
const routeShells = new Set(routeSchema.properties.shell.enum);
const operations = motionSchema.properties.operation.enum;
const containerRoles = motionSchema.properties.containerRole.enum;

// 仅保留有 id 的 policy 条目（_comment 字段不影响 policy 有效性）
const policies = policyFixtures.filter((p) => p.id);

test("motion-policy schema 存在且加载成功", () => {
  assert.ok(motionPolicySchema, "motion-policy.schema.json 应存在");
  assert.equal(motionPolicySchema.title, "MotionPolicy");
});

test("所有 motion-policy fixture 通过 schema 校验", () => {
  for (const p of policies) {
    const errors = validate(motionPolicySchema, p);
    assert.equal(errors.length, 0, `policy ${p.id} 校验失败：\n  - ${errors.map((e) => `${e.path}: ${e.message}`).join("\n  - ")}`);
  }
});

test("policy id 唯一", () => {
  const seen = new Set();
  for (const p of policies) {
    assert.ok(!seen.has(p.id), `重复 policy id：${p.id}`);
    seen.add(p.id);
  }
});

test("所有 policy motionId 都存在于 motion.schema.json", () => {
  for (const p of policies) {
    assert.ok(motionIds.has(p.motionId), `policy ${p.id} 引用了不存在的 motionId：${p.motionId}`);
  }
});

test("所有 policy priority >= 0", () => {
  for (const p of policies) {
    assert.ok(p.priority >= 0, `policy ${p.id} priority 应 >= 0，实际 ${p.priority}`);
    assert.ok(Number.isInteger(p.priority), `policy ${p.id} priority 应为整数`);
  }
});

test("policy match 字段值合法（operation/containerRole/shell 在 enum 内）", () => {
  for (const p of policies) {
    const m = p.match || {};
    if (m.operation !== undefined) {
      assert.ok(operations.includes(m.operation), `policy ${p.id} match.operation 不在 enum：${m.operation}`);
    }
    if (m.containerRole !== undefined) {
      assert.ok(containerRoles.includes(m.containerRole), `policy ${p.id} match.containerRole 不在 enum：${m.containerRole}`);
    }
    if (m.fromShell !== undefined) {
      assert.ok(routeShells.has(m.fromShell), `policy ${p.id} match.fromShell 不在 route shell enum：${m.fromShell}`);
    }
    if (m.toShell !== undefined) {
      assert.ok(routeShells.has(m.toShell), `policy ${p.id} match.toShell 不在 route shell enum：${m.toShell}`);
    }
  }
});

test("motion-policy 覆盖全部 12 个 operation", () => {
  const covered = new Set();
  for (const p of policies) {
    if (p.match?.operation) covered.add(p.match.operation);
  }
  for (const op of operations) {
    assert.ok(covered.has(op), `operation 未被任何 policy 覆盖：${op}`);
  }
});

test("不存在把未知请求伪装为 MotionId 的空 match fallback", () => {
  const fallbacks = policies.filter((p) => Object.keys(p.match || {}).length === 0);
  assert.deepEqual(fallbacks, [], "未知请求必须由 resolver 返回 no-match diagnostic，不能映射到 motion.interrupt.redirect");
  assert.equal(policies.some((p) => p.id === "fallback-no-motion"), false);

  const invalid = { ...policies[0], id: "invalid-empty-match", match: {} };
  assert.ok(validate(motionPolicySchema, invalid).some((error) => error.keyword === "minProperties"), "schema must reject future empty-match fallbacks");
});

test("MR0 Reader control pilot family has one explicit policy per MotionId", () => {
  const expected = new Map([
    ["reader.control.show", "reader-control-show"],
    ["reader.control.hide", "reader-control-hide"],
    ["reader.quick.promote", "reader-quick-promote"],
    ["reader.module.switch", "reader-module-switch"],
    ["reader.panel.expand", "reader-panel-expand"],
    ["reader.panel.collapse", "reader-panel-collapse"],
  ]);
  for (const [motionId, policyId] of expected) {
    const matches = policies.filter((p) => p.motionId === motionId);
    assert.equal(matches.length, 1, `${motionId} must have exactly one explicit policy`);
    assert.equal(matches[0].id, policyId);
    assert.equal(matches[0].match.containerRole, "readerShell");
    assert.ok(matches[0].match.sourceRole, `${policyId} must declare sourceRole`);
    assert.ok(matches[0].match.targetRole, `${policyId} must declare targetRole`);
  }
});

test("bookshelf shared-layout pilot resolves as an in-place MainTabShell replace", () => {
  const matches = policies.filter((p) => p.motionId === "bookshelf.view.switch");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, "bookshelf-view-switch");
  assert.deepEqual(matches[0].match, {
    operation: "replace",
    containerRole: "mainTabShell",
    sourceRole: "viewMode",
  });
});

test("用户原始规格中的 5 个示例 policy 都存在", () => {
  const expectedIds = [
    "route-push-default",
    "route-pop-default",
    "main-tab-switch",
    "bookshelf-cover-to-reader",
    "reader-overlay-sheet-enter"
  ];
  const policyIds = new Set(policies.map((p) => p.id));
  for (const id of expectedIds) {
    assert.ok(policyIds.has(id), `缺少用户规格要求的 policy：${id}`);
  }
});

test("用户规格示例 policy 的 motionId 正确", () => {
  const byId = new Map(policies.map((p) => [p.id, p]));
  assert.equal(byId.get("route-push-default").motionId, "app.route.push.forward");
  assert.equal(byId.get("route-pop-default").motionId, "app.route.pop.backward");
  assert.equal(byId.get("main-tab-switch").motionId, "tab.switch");
  assert.equal(byId.get("bookshelf-cover-to-reader").motionId, "reader.entry.coverToImmersive");
  assert.equal(byId.get("reader-overlay-sheet-enter").motionId, "overlay.sheet.enter");
});

test("用户规格示例 policy 的 match 结构正确", () => {
  const byId = new Map(policies.map((p) => [p.id, p]));
  // bookshelf-cover-to-reader: match {fromShell=MainTabShell, toShell=ReaderShell, operation=push, sourceRole=bookCover}
  const bcr = byId.get("bookshelf-cover-to-reader");
  assert.equal(bcr.match.fromShell, "MainTabShell");
  assert.equal(bcr.match.toShell, "ReaderShell");
  assert.equal(bcr.match.operation, "push");
  assert.equal(bcr.match.sourceRole, "bookCover");
  // reader-overlay-sheet-enter: match {containerRole=readerShell, operation=enter, targetRole=sheet}
  const rose = byId.get("reader-overlay-sheet-enter");
  assert.equal(rose.match.containerRole, "readerShell");
  assert.equal(rose.match.operation, "enter");
  assert.equal(rose.match.targetRole, "sheet");
});

test("policy 数量 >= 20（覆盖常见 operation + containerRole 组合）", () => {
  assert.ok(policies.length >= 20, `policy 数量应 >= 20，实际 ${policies.length}`);
});

test("高优先级 policy (>=300) 至少 5 条（覆盖 reader entry / overlay / surface 特定场景）", () => {
  const high = policies.filter((p) => p.priority >= 300);
  assert.ok(high.length >= 5, `priority>=300 的 policy 应至少 5 条，实际 ${high.length}`);
});
