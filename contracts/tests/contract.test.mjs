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

const routeSchema = loadJson("route.schema.json");
const eventSchema = loadJson("ui-event.schema.json");
const stateSchema = loadJson("ui-state.schema.json");
const viewSchema = loadJson("view-state.schema.json");
const motionSchema = loadJson("motion.schema.json");
const tokenSchema = loadJson("token.schema.json");

const routeFixtures = loadJson("fixtures/route.fixtures.json");
const eventFixtures = loadJson("fixtures/ui-event.fixtures.json");
const stateFixtures = loadJson("fixtures/ui-state.fixtures.json");
const viewFixtures = loadJson("fixtures/view-state.fixtures.json");
const motionFixtures = loadJson("fixtures/motion.fixtures.json");
const tokenFixtures = loadJson("fixtures/token.fixtures.json");

// --- Schema 自检 ---
test("route.schema.json 结构合法", () => {
  assert.equal(routeSchema.title, "Route");
  assert.equal(routeSchema.additionalProperties, false);
  assert.ok(routeSchema.properties.id.enum.length > 100, "route id enum 应覆盖 demo 全量 route");
  assert.ok(routeSchema.properties.shell.enum.length === 5);
});

test("ui-event.schema.json 结构合法", () => {
  assert.equal(eventSchema.title, "UiEvent");
  assert.equal(eventSchema.additionalProperties, false);
  assert.ok(eventSchema.properties.type.enum.length > 100);
});

test("ui-state.schema.json 结构合法", () => {
  assert.equal(stateSchema.title, "UiState");
  assert.equal(stateSchema.additionalProperties, false);
  assert.deepEqual(stateSchema.required, ["route", "tab", "readerMode", "overlay", "activeSession", "focusTarget", "loading", "error", "reducedMotion"]);
  assert.ok(stateSchema.properties.tab.enum.includes("bookshelf"));
  assert.ok(stateSchema.properties.tab.enum.includes("discover"));
  assert.ok(stateSchema.properties.tab.enum.includes("rss"));
  assert.ok(stateSchema.properties.tab.enum.includes("settings"));
});

test("view-state.schema.json 结构合法", () => {
  assert.equal(viewSchema.title, "ViewState");
  assert.ok(viewSchema.$defs.Component.properties.type.enum.length > 30);
});

test("motion.schema.json 结构合法", () => {
  assert.equal(motionSchema.title, "Motion");
  assert.ok(motionSchema.properties.id.enum.length > 60);
  assert.ok(motionSchema.properties.easing.enum.includes("ease"));
  assert.ok(motionSchema.properties.easing.enum.includes("ease-in-out"));
});

test("token.schema.json 结构合法", () => {
  assert.equal(tokenSchema.title, "Token");
  assert.ok(tokenSchema.properties.name.pattern.startsWith("^--reader-ds-"));
  assert.ok(tokenSchema.properties.category.enum.includes("color"));
  assert.ok(tokenSchema.properties.category.enum.includes("motion-duration"));
});

// --- Fixtures 校验 ---
test("route.fixtures.json 全部通过 schema", () => {
  for (const item of routeFixtures) {
    assertValid(routeSchema, item, `route fixture ${item.id}`);
  }
});

test("ui-event.fixtures.json 全部通过 schema", () => {
  for (const item of eventFixtures) {
    assertValid(eventSchema, item, `ui-event fixture ${item.type}`);
  }
});

test("ui-state.fixtures.json 全部通过 schema", () => {
  for (const item of stateFixtures) {
    assertValid(stateSchema, item, `ui-state fixture route=${item.route?.id}`);
  }
});

test("view-state.fixtures.json 全部通过 schema", () => {
  for (const item of viewFixtures) {
    assertValid(viewSchema, item, `view-state fixture ${item.routeId}`);
  }
});

test("motion.fixtures.json 全部通过 schema", () => {
  for (const item of motionFixtures) {
    assertValid(motionSchema, item, `motion fixture ${item.id}`);
  }
});

test("token.fixtures.json 全部通过 schema", () => {
  for (const item of tokenFixtures) {
    assertValid(tokenSchema, item, `token fixture ${item.name}`);
  }
});

// --- 跨文件一致性 ---
test("ui-state.route.id 出现在 route schema enum 中", () => {
  const allowed = new Set(routeSchema.properties.id.enum);
  for (const item of stateFixtures) {
    assert.ok(allowed.has(item.route.id), `ui-state fixture route.id=${item.route.id} 不在 route schema 中`);
  }
});

test("ui-state.tab 限制为 4 个主 Tab", () => {
  for (const item of stateFixtures) {
    assert.ok(["bookshelf", "discover", "rss", "settings"].includes(item.tab));
  }
});

test("ui-state.overlay 取值在 overlay enum 中", () => {
  const allowed = new Set([...stateSchema.properties.overlay.enum]);
  for (const item of stateFixtures) {
    if (item.overlay != null) {
      assert.ok(allowed.has(item.overlay), `overlay=${item.overlay} 不在 enum 中`);
    }
  }
});

test("view-state.routeId 出现在 route schema enum 中", () => {
  const allowed = new Set(routeSchema.properties.id.enum);
  for (const item of viewFixtures) {
    assert.ok(allowed.has(item.routeId), `view-state routeId=${item.routeId} 不在 route schema 中`);
  }
});

test("view-state.pageState 出现在 PageState enum 中", () => {
  const allowed = new Set(stateSchema.properties.pageState.enum);
  for (const item of viewFixtures) {
    assert.ok(allowed.has(item.pageState), `view-state pageState=${item.pageState} 不在 PageState enum 中`);
  }
});

test("view-state 组件 type 在 ComponentType enum 中", () => {
  const allowed = new Set(viewSchema.$defs.Component.properties.type.enum);
  function walk(component) {
    assert.ok(allowed.has(component.type), `组件 type=${component.type} 不在 enum 中`);
    if (component.children) for (const c of component.children) walk(c);
  }
  for (const item of viewFixtures) {
    for (const c of item.components) walk(c);
  }
});

test("motion.fixtures 中 id 全部在 motion schema enum 中", () => {
  const allowed = new Set(motionSchema.properties.id.enum);
  for (const item of motionFixtures) {
    assert.ok(allowed.has(item.id), `motion id=${item.id} 不在 schema enum 中`);
  }
});

test("motion durationMs 非负整数", () => {
  for (const item of motionFixtures) {
    assert.ok(Number.isInteger(item.durationMs) && item.durationMs >= 0);
  }
});

test("token.fixtures 中 name 全部匹配 --reader-ds- 前缀", () => {
  for (const item of tokenFixtures) {
    assert.ok(item.name.startsWith("--reader-ds-"), `token name=${item.name} 不匹配前缀`);
  }
});

test("token.fixtures 中 category 在 enum 中", () => {
  const allowed = new Set(tokenSchema.properties.category.enum);
  for (const item of tokenFixtures) {
    assert.ok(allowed.has(item.category), `token category=${item.category} 不在 enum 中`);
  }
});

test("ui-event type 在 schema enum 中", () => {
  const allowed = new Set(eventSchema.properties.type.enum);
  for (const item of eventFixtures) {
    assert.ok(allowed.has(item.type), `ui-event type=${item.type} 不在 enum 中`);
  }
});

// --- 唯一性 ---
test("route id 在 schema 中唯一", () => {
  const ids = routeSchema.properties.id.enum;
  const set = new Set(ids);
  assert.equal(set.size, ids.length, "route id 重复");
});

test("motion id 在 schema 中唯一", () => {
  const ids = motionSchema.properties.id.enum;
  const set = new Set(ids);
  assert.equal(set.size, ids.length, "motion id 重复");
});

test("ui-event type 在 schema 中唯一", () => {
  const types = eventSchema.properties.type.enum;
  const set = new Set(types);
  assert.equal(set.size, types.length, "ui-event type 重复");
});

test("token name 在 fixtures 中唯一", () => {
  const names = tokenFixtures.map((t) => t.name);
  const set = new Set(names);
  assert.equal(set.size, names.length, "token name 重复");
});
