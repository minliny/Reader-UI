// Codegen 输出一致性测试：校验 generated/{swift,kotlin,arkts} 与 schema enum 一致。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const CONTRACTS_DIR = join(REPO_ROOT, "contracts");
const GENERATED_DIR = join(REPO_ROOT, "generated");

function loadJson(rel) {
  return JSON.parse(readFileSync(join(CONTRACTS_DIR, rel), "utf8"));
}

function readText(rel) {
  return readFileSync(join(GENERATED_DIR, rel), "utf8");
}

function ensureExists(rel) {
  if (!existsSync(join(GENERATED_DIR, rel))) {
    throw new Error(`缺少生成文件：generated/${rel}`);
  }
}

const routeSchema = loadJson("route.schema.json");
const eventSchema = loadJson("ui-event.schema.json");
const stateSchema = loadJson("ui-state.schema.json");
const viewSchema = loadJson("view-state.schema.json");
const motionSchema = loadJson("motion.schema.json");
const tokenSchema = loadJson("token.schema.json");
// Phase 2 schemas
const coreCmdSchema = loadJson("core-command.schema.json");
const coreEvtSchema = loadJson("core-event.schema.json");
const hostReqSchema = loadJson("host-request.schema.json");
const progressSchema = loadJson("progress-location.schema.json");
const contentSchema = loadJson("content.schema.json");
const syncConflictSchema = loadJson("sync-conflict.schema.json");
// Phase 1 收尾 schema
const stateRuleSchema = loadJson("state-rule.schema.json");

test("generated/swift 16 个文件全部存在", () => {
  for (const f of [
    "Route.swift", "UiEvent.swift", "UiState.swift", "ViewState.swift", "Motion.swift", "Token.swift",
    "CoreCommand.swift", "CoreEvent.swift", "HostRequest.swift",
    "ProgressLocation.swift", "Content.swift", "SyncConflict.swift",
    "StateRule.swift", "MotionPolicy.swift", "Appearance.swift", "ScreenGraph.swift"
  ]) {
    ensureExists(join("swift", f));
  }
});

test("generated/kotlin 16 个文件全部存在", () => {
  for (const f of [
    "Route.kt", "UiEvent.kt", "UiState.kt", "ViewState.kt", "Motion.kt", "Token.kt",
    "CoreCommand.kt", "CoreEvent.kt", "HostRequest.kt",
    "ProgressLocation.kt", "Content.kt", "SyncConflict.kt",
    "StateRule.kt", "MotionPolicy.kt", "Appearance.kt", "ScreenGraph.kt"
  ]) {
    ensureExists(join("kotlin", f));
  }
});

test("generated/arkts 16 个文件全部存在", () => {
  for (const f of [
    "Route.ets", "UiEvent.ets", "UiState.ets", "ViewState.ets", "Motion.ets", "Token.ets",
    "CoreCommand.ets", "CoreEvent.ets", "HostRequest.ets",
    "ProgressLocation.ets", "Content.ets", "SyncConflict.ets",
    "StateRule.ets", "MotionPolicy.ets", "Appearance.ets", "ScreenGraph.ets"
  ]) {
    ensureExists(join("arkts", f));
  }
});

test("Swift Route.swift 包含全部 route id", () => {
  const text = readText("swift/Route.swift");
  for (const id of routeSchema.properties.id.enum) {
    assert.ok(text.includes(`"${id}"`), `Swift Route.swift 缺少 route id：${id}`);
  }
});

test("Kotlin Route.kt 包含全部 route id", () => {
  const text = readText("kotlin/Route.kt");
  for (const id of routeSchema.properties.id.enum) {
    assert.ok(text.includes(`"${id}"`), `Kotlin Route.kt 缺少 route id：${id}`);
  }
});

test("ArkTS Route.ets 包含全部 route id", () => {
  const text = readText("arkts/Route.ets");
  for (const id of routeSchema.properties.id.enum) {
    assert.ok(text.includes(`"${id}"`), `ArkTS Route.ets 缺少 route id：${id}`);
  }
});

test("Swift UiEvent.swift 包含全部 event type", () => {
  const text = readText("swift/UiEvent.swift");
  for (const t of eventSchema.properties.type.enum) {
    assert.ok(text.includes(`"${t}"`), `Swift UiEvent.swift 缺少 event type：${t}`);
  }
});

test("Kotlin UiEvent.kt 包含全部 event type", () => {
  const text = readText("kotlin/UiEvent.kt");
  for (const t of eventSchema.properties.type.enum) {
    assert.ok(text.includes(`"${t}"`), `Kotlin UiEvent.kt 缺少 event type：${t}`);
  }
});

test("ArkTS UiEvent.ets 包含全部 event type", () => {
  const text = readText("arkts/UiEvent.ets");
  for (const t of eventSchema.properties.type.enum) {
    assert.ok(text.includes(`"${t}"`), `ArkTS UiEvent.ets 缺少 event type：${t}`);
  }
});

test("Swift Motion.swift 包含全部 motion id", () => {
  const text = readText("swift/Motion.swift");
  for (const id of motionSchema.properties.id.enum) {
    assert.ok(text.includes(`"${id}"`), `Swift Motion.swift 缺少 motion id：${id}`);
  }
});

test("Swift/Kotlin MotionId 生成标识符无标点归一化冲突", () => {
  const expected = motionSchema.properties.id.enum.length;
  const swiftBlock = readText("swift/Motion.swift").split("public enum MotionEasing")[0];
  const swiftCases = [...swiftBlock.matchAll(/^\s*case\s+([A-Za-z0-9_]+)\s*=/gm)].map((match) => match[1]);
  assert.equal(swiftCases.length, expected);
  assert.equal(new Set(swiftCases).size, expected, "Swift MotionId case 名发生归一化冲突");

  const kotlinBlock = readText("kotlin/Motion.kt").split("enum class MotionEasing")[0];
  const kotlinCases = [...kotlinBlock.matchAll(/^\s{4}([A-Za-z0-9_]+),?$/gm)].map((match) => match[1]);
  assert.equal(kotlinCases.length, expected);
  assert.equal(new Set(kotlinCases).size, expected, "Kotlin MotionId case 名发生归一化冲突");
});

test("Kotlin Motion.kt 包含全部 motion id", () => {
  const text = readText("kotlin/Motion.kt");
  for (const id of motionSchema.properties.id.enum) {
    assert.ok(text.includes(`"${id}"`), `Kotlin Motion.kt 缺少 motion id：${id}`);
  }
});

test("ArkTS Motion.ets 包含全部 motion id", () => {
  const text = readText("arkts/Motion.ets");
  for (const id of motionSchema.properties.id.enum) {
    assert.ok(text.includes(`"${id}"`), `ArkTS Motion.ets 缺少 motion id：${id}`);
  }
});

test("Swift Route.swift 包含 MainTab 4 个值", () => {
  const text = readText("swift/Route.swift");
  for (const t of ["bookshelf", "discover", "rss", "settings"]) {
    assert.ok(text.includes(`case ${t}`), `Swift Route.swift 缺少 MainTab：${t}`);
  }
});

test("Swift ViewState.swift 包含全部 ComponentType", () => {
  const text = readText("swift/ViewState.swift");
  for (const t of viewSchema.$defs.Component.properties.type.enum) {
    assert.ok(text.includes(`"${t}"`), `Swift ViewState.swift 缺少 ComponentType：${t}`);
  }
});

test("三端 ViewState 生成显式 target binding", () => {
  const expectations = {
    "swift/ViewState.swift": ["ViewStateExplicitBinding", "public let target: String", "public var bindings: [ViewStateExplicitBinding]?"],
    "kotlin/ViewState.kt": ["ViewStateExplicitBinding", "val target: String", "val bindings: List<ViewStateExplicitBinding>?"],
    "arkts/ViewState.ets": ["ViewStateExplicitBinding", "target: string", "bindings?: ViewStateExplicitBinding[]"],
  };
  for (const [relativePath, fragments] of Object.entries(expectations)) {
    const text = readText(relativePath);
    for (const fragment of fragments) assert.ok(text.includes(fragment), `${relativePath} 缺少 ${fragment}`);
  }
});

test("Swift Token.swift 包含全部 TokenCategory", () => {
  const text = readText("swift/Token.swift");
  for (const c of tokenSchema.properties.category.enum) {
    assert.ok(text.includes(`"${c}"`), `Swift Token.swift 缺少 TokenCategory：${c}`);
  }
});

// --- Phase 2 enum 一致性 ---

function checkEnumAllPlatforms(schemaPath, fileBase, label) {
  const schema = loadJson(`${schemaPath}.schema.json`);
  const enums = schemaPath === "progress-location"
    ? schema.properties.locator.properties.type.enum
    : schemaPath === "content"
    ? schema.$defs.Block.properties.type.enum
    : schemaPath === "sync-conflict"
    ? [
        ...schema.properties.type.enum,
        ...schema.properties.resolution.enum.filter((v) => v !== null),
      ]
    : schemaPath === "host-request"
    ? [...schema.properties.type.enum, ...schema.properties.initiator.enum]
    : schema.properties.type.enum;
  for (const platform of ["swift", "kotlin", "arkts"]) {
    const ext = platform === "swift" ? "swift" : platform === "kotlin" ? "kt" : "ets";
    const text = readText(`${platform}/${fileBase}.${ext}`);
    for (const v of enums) {
      assert.ok(text.includes(`"${v}"`), `${platform}/${fileBase}.${ext} 缺少 ${label}：${v}`);
    }
  }
}

test("三端 CoreCommand 包含全部 CoreCommandType", () => {
  checkEnumAllPlatforms("core-command", "CoreCommand", "CoreCommandType");
});

test("三端 CoreEvent 包含全部 CoreEventType", () => {
  checkEnumAllPlatforms("core-event", "CoreEvent", "CoreEventType");
});

test("三端 HostRequest 包含全部 HostRequestType 与 HostInitiator", () => {
  checkEnumAllPlatforms("host-request", "HostRequest", "HostRequest 枚举值");
});

test("三端 ProgressLocation 包含全部 LocatorType 与 ProgressSource", () => {
  checkEnumAllPlatforms("progress-location", "ProgressLocation", "ProgressLocation 枚举值");
});

test("三端 Content 包含全部 BlockType", () => {
  checkEnumAllPlatforms("content", "Content", "BlockType");
});

test("三端 SyncConflict 包含全部 SyncConflictType 与 Resolution", () => {
  checkEnumAllPlatforms("sync-conflict", "SyncConflict", "SyncConflict 枚举值");
});

// --- Phase 1 收尾: StateRule ---

test("三端 StateRule 包含全部 StateRuleKind / Severity / Slice", () => {
  const kinds = stateRuleSchema.properties.kind.enum;
  const severities = stateRuleSchema.properties.severity.enum;
  const slices = stateRuleSchema.properties.target.properties.slices.items.enum;
  for (const platform of ["swift", "kotlin", "arkts"]) {
    const ext = platform === "swift" ? "swift" : platform === "kotlin" ? "kt" : "ets";
    const text = readText(`${platform}/StateRule.${ext}`);
    for (const k of kinds) {
      assert.ok(text.includes(`"${k}"`), `${platform}/StateRule.${ext} 缺少 kind：${k}`);
    }
    for (const s of severities) {
      assert.ok(text.includes(`"${s}"`), `${platform}/StateRule.${ext} 缺少 severity：${s}`);
    }
    for (const sl of slices) {
      assert.ok(text.includes(`"${sl}"`), `${platform}/StateRule.${ext} 缺少 slice：${sl}`);
    }
  }
});

test("三端 StateRule 包含 routeIds 字段", () => {
  for (const platform of ["swift", "kotlin", "arkts"]) {
    const ext = platform === "swift" ? "swift" : platform === "kotlin" ? "kt" : "ets";
    const text = readText(`${platform}/StateRule.${ext}`);
    assert.ok(text.includes("routeIds"), `${platform}/StateRule.${ext} 缺少 routeIds 字段`);
  }
});

test("生成文件全部带 AUTO-GENERATED 标识", () => {
  const files = [
    "swift/Route.swift", "swift/UiEvent.swift", "swift/UiState.swift",
    "swift/ViewState.swift", "swift/Motion.swift", "swift/Token.swift",
    "swift/CoreCommand.swift", "swift/CoreEvent.swift", "swift/HostRequest.swift",
    "swift/ProgressLocation.swift", "swift/Content.swift", "swift/SyncConflict.swift",
    "swift/StateRule.swift",
    "kotlin/Route.kt", "kotlin/UiEvent.kt", "kotlin/UiState.kt",
    "kotlin/ViewState.kt", "kotlin/Motion.kt", "kotlin/Token.kt",
    "kotlin/CoreCommand.kt", "kotlin/CoreEvent.kt", "kotlin/HostRequest.kt",
    "kotlin/ProgressLocation.kt", "kotlin/Content.kt", "kotlin/SyncConflict.kt",
    "kotlin/StateRule.kt",
    "arkts/Route.ets", "arkts/UiEvent.ets", "arkts/UiState.ets",
    "arkts/ViewState.ets", "arkts/Motion.ets", "arkts/Token.ets",
    "arkts/CoreCommand.ets", "arkts/CoreEvent.ets", "arkts/HostRequest.ets",
    "arkts/ProgressLocation.ets", "arkts/Content.ets", "arkts/SyncConflict.ets",
    "arkts/StateRule.ets"
  ];
  for (const f of files) {
    const text = readText(f);
    assert.ok(text.includes("AUTO-GENERATED"), `generated/${f} 缺少 AUTO-GENERATED 标识`);
  }
});
