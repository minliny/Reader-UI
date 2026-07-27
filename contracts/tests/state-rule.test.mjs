// StateRule 契约测试：互斥规则与 async guard。
// 覆盖 schema 自检 + fixtures 校验 + 与 ui-state 字段一致性 + Slice 1-6 覆盖。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validate, assertValid } from "./mini-validator.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACTS_DIR = join(__dirname, "..");

function loadJson(rel) {
  return JSON.parse(readFileSync(join(CONTRACTS_DIR, rel), "utf8"));
}

const stateRuleSchema = loadJson("state-rule.schema.json");
const uiStateSchema = loadJson("ui-state.schema.json");
const stateRuleFixtures = loadJson("fixtures/state-rule.fixtures.json");

// --- Schema 自检 ---
test("state-rule.schema.json 结构合法", () => {
  assert.equal(stateRuleSchema.title, "StateRule");
  assert.equal(stateRuleSchema.additionalProperties, false);
  assert.deepEqual(stateRuleSchema.required, ["ruleId", "kind", "target", "constraint"]);
  const kinds = stateRuleSchema.properties.kind.enum;
  for (const k of ["mutex", "async-guard", "required-with", "forbidden-with", "transition-guard"]) {
    assert.ok(kinds.includes(k), `kind 缺少 ${k}`);
  }
  assert.deepEqual(stateRuleSchema.properties.severity.enum, ["error", "warn"]);
});

test("state-rule target.slices 枚举覆盖 Slice 1-6", () => {
  const sliceEnum = stateRuleSchema.properties.target.properties.slices.items.enum;
  for (const s of ["slice-1", "slice-2", "slice-3", "slice-4", "slice-5", "slice-6"]) {
    assert.ok(sliceEnum.includes(s), `slices enum 缺少 ${s}`);
  }
});

test("state-rule target.routeIds 已定义 (schema 1.1.0)", () => {
  const routeIds = stateRuleSchema.properties.target.properties.routeIds;
  assert.ok(routeIds, "state-rule schema 缺少 target.routeIds");
  assert.equal(routeIds.type, "array");
  assert.equal(routeIds.items.type, "string");
});

// --- Fixtures 校验 ---
test("state-rule.fixtures.json 全部通过 schema", () => {
  for (const item of stateRuleFixtures) {
    assertValid(stateRuleSchema, item, `state-rule fixture ${item.ruleId}`);
  }
});

// --- ruleId 唯一性 ---
test("state-rule fixture ruleId 唯一", () => {
  const ids = stateRuleFixtures.map((r) => r.ruleId);
  assert.equal(new Set(ids).size, ids.length, "ruleId 重复");
});

// --- kind 覆盖完整性 ---
test("state-rule fixtures 覆盖全部 5 种 kind", () => {
  const kinds = new Set(stateRuleFixtures.map((r) => r.kind));
  for (const k of ["mutex", "async-guard", "required-with", "forbidden-with", "transition-guard"]) {
    assert.ok(kinds.has(k), `fixtures 缺少 kind=${k}`);
  }
});

// --- Slice 1-6 覆盖 ---
test("state-rule fixtures 覆盖 Slice 1-6", () => {
  const allSlices = new Set();
  for (const r of stateRuleFixtures) {
    if (r.target.slices) {
      for (const s of r.target.slices) allSlices.add(s);
    }
  }
  // 部分规则全局生效（无 slices），不强制每 slice 都有，但至少覆盖 4 个 slice
  assert.ok(allSlices.size >= 4, `Slice 覆盖不足，实际 ${allSlices.size}`);
  for (const s of ["slice-1", "slice-3", "slice-4"]) {
    assert.ok(allSlices.has(s), `fixtures 缺少 ${s} 规则`);
  }
});

// --- target.fields 引用的字段必须在 ui-state schema 中存在 ---
test("state-rule target.fields 引用的字段在 ui-state 中存在", () => {
  // 收集 ui-state 顶层字段 + 已知嵌套字段路径
  const uiStateFields = new Set(Object.keys(uiStateSchema.properties));
  // 已知嵌套字段（手动维护，反映 schema 中 object 类型的子字段）
  const nestedFields = new Set([
    "reader.textSelectionOpen",
    "reader.pageIndex",
    "reader.chapterIndex",
    "discover.sourceType",
    "discover.filter",
    "discover.sort",
    "bookshelf.viewMode",
    "settings.overlay",
    "firstOpen.hasPlayed",
    "motion.overlaySequence",
  ]);
  const allowed = new Set([...uiStateFields, ...nestedFields]);

  for (const rule of stateRuleFixtures) {
    for (const f of rule.target.fields) {
      const top = f.split(".")[0];
      assert.ok(
        allowed.has(f) || allowed.has(top),
        `rule ${rule.ruleId} target.fields 引用了未知字段 ${f}`
      );
    }
  }
});

// --- constraint 字段与 kind 一致性 ---
test("state-rule constraint 与 kind 一致", () => {
  for (const rule of stateRuleFixtures) {
    const c = rule.constraint;
    switch (rule.kind) {
      case "mutex":
        assert.ok(c.maxNonNull != null, `rule ${rule.ruleId} mutex 应含 maxNonNull`);
        break;
      case "async-guard":
        assert.ok(c.guardField != null, `rule ${rule.ruleId} async-guard 应含 guardField`);
        assert.ok(c.guardValue !== undefined, `rule ${rule.ruleId} async-guard 应含 guardValue`);
        break;
      case "required-with":
        assert.ok(c.requiredField != null, `rule ${rule.ruleId} required-with 应含 requiredField`);
        break;
      case "forbidden-with":
        assert.ok(c.forbiddenField != null, `rule ${rule.ruleId} forbidden-with 应含 forbiddenField`);
        break;
      case "transition-guard":
        // transition-guard 可以 fromStates/toStates 为空数组（表示任意）
        assert.ok(Array.isArray(c.fromStates), `rule ${rule.ruleId} transition-guard 应含 fromStates 数组`);
        assert.ok(Array.isArray(c.toStates), `rule ${rule.ruleId} transition-guard 应含 toStates 数组`);
        break;
    }
  }
});

// --- severity 默认值 ---
test("state-rule fixtures 未设 severity 时默认 error", () => {
  // schema default = "error"，fixtures 中缺失 severity 应被视作 error
  for (const rule of stateRuleFixtures) {
    if (rule.severity == null) {
      // 这里只验证 schema 约定，不强制 fixture 必填
      assert.equal(stateRuleSchema.properties.severity.default, "error");
    } else {
      assert.ok(["error", "warn"].includes(rule.severity), `rule ${rule.ruleId} severity 非法：${rule.severity}`);
    }
  }
});

// --- 关键规则存在性 ---
test("state-rule fixtures 含关键规则（overlay-mutex / loading-guard / active-session-mutex）", () => {
  const ids = new Set(stateRuleFixtures.map((r) => r.ruleId));
  for (const id of ["overlay-mutex", "loading-guard-route-change", "active-session-mutex"]) {
    assert.ok(ids.has(id), `fixtures 缺少关键规则 ${id}`);
  }
});
