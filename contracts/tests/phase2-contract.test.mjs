// Phase 2 Core 协议收敛测试：CoreCommand / CoreEvent / HostRequest / ProgressLocation / Content / SyncConflict。
// 覆盖 schema 自检、fixtures 校验、跨文件一致性、与规划文档 §5/§7 对齐。
// 来源：CONTRACT_FIRST_NATIVE_UI_PLAN.md §5 Core 13 个操作 + §7 Host 13 项能力清单。
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

const coreCmdSchema = loadJson("core-command.schema.json");
const coreEvtSchema = loadJson("core-event.schema.json");
const hostReqSchema = loadJson("host-request.schema.json");
const progressSchema = loadJson("progress-location.schema.json");
const contentSchema = loadJson("content.schema.json");
const syncConflictSchema = loadJson("sync-conflict.schema.json");

const coreCmdFixtures = loadJson("fixtures/core-command.fixtures.json");
const coreEvtFixtures = loadJson("fixtures/core-event.fixtures.json");
const hostReqFixtures = loadJson("fixtures/host-request.fixtures.json");
const progressFixtures = loadJson("fixtures/progress-location.fixtures.json");
const contentFixtures = loadJson("fixtures/content.fixtures.json");
const syncConflictFixtures = loadJson("fixtures/sync-conflict.fixtures.json");

// --- Schema 自检 ---
test("core-command.schema.json 结构合法", () => {
  assert.equal(coreCmdSchema.title, "CoreCommand");
  assert.equal(coreCmdSchema.additionalProperties, false);
  assert.ok(coreCmdSchema.properties.type.enum.length >= 13, "CoreCommand 应覆盖规划 §5 Core 13 个操作");
  assert.deepEqual(coreCmdSchema.required, ["type", "payload"]);
});

test("core-event.schema.json 结构合法", () => {
  assert.equal(coreEvtSchema.title, "CoreEvent");
  assert.equal(coreEvtSchema.additionalProperties, false);
  assert.ok(coreEvtSchema.properties.type.enum.length >= 13, "CoreEvent 应覆盖 §5 Core 操作的过去式事件");
  assert.deepEqual(coreEvtSchema.required, ["type", "payload"]);
});

test("host-request.schema.json 结构合法", () => {
  assert.equal(hostReqSchema.title, "HostRequest");
  assert.equal(hostReqSchema.additionalProperties, false);
  assert.ok(hostReqSchema.properties.type.enum.length >= 13, "HostRequest 应覆盖规划 §7 Host 13 项能力");
  assert.deepEqual(hostReqSchema.required, ["type", "payload"]);
  assert.ok(hostReqSchema.properties.initiator.enum.includes("core"));
  assert.ok(hostReqSchema.properties.initiator.enum.includes("reducer"));
});

test("progress-location.schema.json 结构合法", () => {
  assert.equal(progressSchema.title, "ProgressLocation");
  assert.equal(progressSchema.additionalProperties, false);
  assert.deepEqual(progressSchema.required, ["bookId", "chapterIndex", "locator"]);
  const locatorTypes = progressSchema.properties.locator.properties.type.enum;
  assert.ok(locatorTypes.includes("char-offset"));
  assert.ok(locatorTypes.includes("paragraph-index"));
  assert.ok(locatorTypes.includes("selector"));
  assert.ok(locatorTypes.includes("range"));
});

test("content.schema.json 结构合法", () => {
  assert.equal(contentSchema.title, "Content");
  assert.equal(contentSchema.additionalProperties, false);
  assert.deepEqual(contentSchema.required, ["bookId", "chapterId", "blocks"]);
  const blockTypes = contentSchema.$defs.Block.properties.type.enum;
  assert.ok(blockTypes.includes("paragraph"));
  assert.ok(blockTypes.includes("heading"));
  assert.ok(blockTypes.includes("image"));
  assert.ok(blockTypes.includes("blockquote"));
  assert.ok(blockTypes.includes("code"));
  assert.ok(blockTypes.includes("list"));
  assert.ok(blockTypes.includes("divider"));
  assert.ok(blockTypes.includes("blank"));
});

test("sync-conflict.schema.json 结构合法", () => {
  assert.equal(syncConflictSchema.title, "SyncConflict");
  assert.equal(syncConflictSchema.additionalProperties, false);
  assert.deepEqual(syncConflictSchema.required, ["conflictId", "bookId", "type", "local", "remote"]);
  const types = syncConflictSchema.properties.type.enum;
  for (const expected of ["progress", "bookshelf", "bookmark", "annotation", "source-config"]) {
    assert.ok(types.includes(expected), `SyncConflict 缺少 type=${expected}`);
  }
  const resolutions = syncConflictSchema.properties.resolution.enum.filter((v) => v !== null);
  for (const expected of ["keep-local", "keep-remote", "merge", "keep-both", "skip"]) {
    assert.ok(resolutions.includes(expected), `SyncConflict 缺少 resolution=${expected}`);
  }
});

// --- Fixtures 校验 ---
test("core-command.fixtures.json 全部通过 schema", () => {
  for (const item of coreCmdFixtures) {
    assertValid(coreCmdSchema, item, `core-command fixture ${item.type}`);
  }
});

test("core-event.fixtures.json 全部通过 schema", () => {
  for (const item of coreEvtFixtures) {
    assertValid(coreEvtSchema, item, `core-event fixture ${item.type}`);
  }
});

test("host-request.fixtures.json 全部通过 schema", () => {
  for (const item of hostReqFixtures) {
    assertValid(hostReqSchema, item, `host-request fixture ${item.type}`);
  }
});

test("progress-location.fixtures.json 全部通过 schema", () => {
  for (const item of progressFixtures) {
    assertValid(progressSchema, item, `progress-location fixture bookId=${item.bookId}`);
  }
});

test("content.fixtures.json 全部通过 schema", () => {
  for (const item of contentFixtures) {
    assertValid(contentSchema, item, `content fixture bookId=${item.bookId}`);
  }
});

test("sync-conflict.fixtures.json 全部通过 schema", () => {
  for (const item of syncConflictFixtures) {
    assertValid(syncConflictSchema, item, `sync-conflict fixture conflictId=${item.conflictId}`);
  }
});

// --- 跨文件一致性 ---

// 规划 §5 Core 13 个操作必须全部出现在 CoreCommandType 中
test("CoreCommand 覆盖规划 §5 全部 13 个 Core 操作", () => {
  const required = [
    "book.open",
    "book.parse",
    "chapter.list",
    "content.load",
    "reader.location.resolve",
    "reader.progress.update",
    "source.search",
    "source.detail",
    "rss.list",
    "rss.item.read",
    "tts.queue.plan",
    "sync.snapshot",
    "sync.conflict.resolve",
  ];
  const allowed = new Set(coreCmdSchema.properties.type.enum);
  for (const op of required) {
    assert.ok(allowed.has(op), `CoreCommand 缺少规划 §5 操作：${op}`);
  }
});

// 规划 §7 Host 13 项能力必须全部出现在 HostRequestType 中
test("HostRequest 覆盖规划 §7 全部 13 项 Host 能力", () => {
  const required = [
    "http.execute",
    "webview.open",
    "webview.evaluate",
    "cookie.get",
    "cookie.set",
    "file.read",
    "file.write",
    "storage.path",
    "credential.get",
    "credential.set",
    "tts.system.start",
    "tts.system.stop",
    "permission.request",
    "background.schedule",
    "notification.show",
    "share.invoke",
  ];
  const allowed = new Set(hostReqSchema.properties.type.enum);
  for (const cap of required) {
    assert.ok(allowed.has(cap), `HostRequest 缺少规划 §7 能力：${cap}`);
  }
});

// CoreCommand type 在 schema enum 中
test("core-command fixture type 全部在 schema enum 中", () => {
  const allowed = new Set(coreCmdSchema.properties.type.enum);
  for (const item of coreCmdFixtures) {
    assert.ok(allowed.has(item.type), `core-command type=${item.type} 不在 enum 中`);
  }
});

// CoreEvent type 在 schema enum 中
test("core-event fixture type 全部在 schema enum 中", () => {
  const allowed = new Set(coreEvtSchema.properties.type.enum);
  for (const item of coreEvtFixtures) {
    assert.ok(allowed.has(item.type), `core-event type=${item.type} 不在 enum 中`);
  }
});

// HostRequest type 在 schema enum 中
test("host-request fixture type 全部在 schema enum 中", () => {
  const allowed = new Set(hostReqSchema.properties.type.enum);
  for (const item of hostReqFixtures) {
    assert.ok(allowed.has(item.type), `host-request type=${item.type} 不在 enum 中`);
  }
});

// HostRequest initiator 在 schema enum 中
test("host-request fixture initiator 全部在 schema enum 中", () => {
  const allowed = new Set(hostReqSchema.properties.initiator.enum);
  for (const item of hostReqFixtures) {
    if (item.initiator != null) {
      assert.ok(allowed.has(item.initiator), `host-request initiator=${item.initiator} 不在 enum 中`);
    }
  }
});

// progress-location locator.type 在 schema enum 中
test("progress-location fixture locator.type 全部在 schema enum 中", () => {
  const allowed = new Set(progressSchema.properties.locator.properties.type.enum);
  for (const item of progressFixtures) {
    assert.ok(allowed.has(item.locator.type), `locator.type=${item.locator.type} 不在 enum 中`);
  }
});

// progress-location source 在 schema enum 中
test("progress-location fixture source 全部在 schema enum 中", () => {
  const allowed = new Set(progressSchema.properties.source.enum);
  for (const item of progressFixtures) {
    if (item.source != null) {
      assert.ok(allowed.has(item.source), `progress source=${item.source} 不在 enum 中`);
    }
  }
});

// content blocks.type 在 schema enum 中
test("content fixture blocks.type 全部在 schema enum 中", () => {
  const allowed = new Set(contentSchema.$defs.Block.properties.type.enum);
  for (const item of contentFixtures) {
    for (const block of item.blocks) {
      assert.ok(allowed.has(block.type), `content block type=${block.type} 不在 enum 中`);
    }
  }
});

// sync-conflict type / resolution 在 schema enum 中
test("sync-conflict fixture type 与 resolution 全部在 schema enum 中", () => {
  const typeAllowed = new Set(syncConflictSchema.properties.type.enum);
  const resAllowed = new Set(syncConflictSchema.properties.resolution.enum.filter((v) => v !== null));
  for (const item of syncConflictFixtures) {
    assert.ok(typeAllowed.has(item.type), `sync-conflict type=${item.type} 不在 enum 中`);
    if (item.resolution != null) {
      assert.ok(resAllowed.has(item.resolution), `sync-conflict resolution=${item.resolution} 不在 enum 中`);
    }
  }
});

// correlationId 关联：当 core-event fixture 带 correlationId 时，应为非空字符串
test("core-event fixture correlationId 为非空字符串（若存在）", () => {
  for (const item of coreEvtFixtures) {
    if (item.correlationId != null) {
      assert.equal(typeof item.correlationId, "string");
      assert.ok(item.correlationId.length > 0, "correlationId 不能为空字符串");
    }
  }
});

// CoreCommand 与 CoreEvent 命名约定：CoreEvent 使用过去式，CoreCommand 使用动词原形
test("CoreEvent type 命名采用过去式（含 .ed/.failed/.ready 等后缀或 completed/updated）", () => {
  const pastSuffixes = [".opened", ".parsed", ".failed", ".listed", ".loaded", ".resolved", ".updated", ".ready", ".completed", ".applied", ".detected", ".saved", ".deleted", ".refreshed", ".planned", ".started", ".paused", ".resumed", ".stopped", ".progress", ".pushed", ".pulled", ".added", ".removed", ".prefetched", ".cleared", ".created", ".operation.failed"];
  for (const t of coreEvtSchema.properties.type.enum) {
    const ok = pastSuffixes.some((s) => t.endsWith(s));
    assert.ok(ok, `CoreEvent type=${t} 不符合过去式命名约定`);
  }
});

// CoreCommand 命名约定：使用动词原形（book.open / source.search 等）
test("CoreCommand type 命名采用动词原形（不使用过去式）", () => {
  const pastSuffixes = [".opened", ".parsed", ".completed", ".loaded", ".listed", ".updated", ".resolved", ".detected", ".saved", ".deleted", ".refreshed", ".planned", ".started", ".paused", ".resumed", ".stopped", ".pushed", ".pulled", ".added", ".removed", ".prefetched", ".cleared", ".failed", ".ready"];
  for (const t of coreCmdSchema.properties.type.enum) {
    const isPast = pastSuffixes.some((s) => t.endsWith(s));
    assert.ok(!isPast, `CoreCommand type=${t} 不应使用过去式（应为动词原形）`);
  }
});

// locator.type=char-offset 时 charOffset 应存在；paragraph-index 时 paragraphIndex 应存在
test("progress-location fixture locator.type 与字段一致（char-offset/paragraph-index）", () => {
  for (const item of progressFixtures) {
    const loc = item.locator;
    if (loc.type === "char-offset") {
      assert.ok(loc.charOffset != null, "char-offset locator 应含 charOffset");
    } else if (loc.type === "paragraph-index") {
      assert.ok(loc.paragraphIndex != null, "paragraph-index locator 应含 paragraphIndex");
    } else if (loc.type === "selector") {
      assert.ok(loc.selector != null, "selector locator 应含 selector");
    }
  }
});

// content blocks 一致性：list block 应含 items；heading block 应含 level
test("content fixture list block 含 items，heading block 含 level", () => {
  for (const item of contentFixtures) {
    for (const block of item.blocks) {
      if (block.type === "list") {
        assert.ok(Array.isArray(block.items), "list block 应含 items 数组");
      }
      if (block.type === "heading") {
        assert.ok(typeof block.level === "number", "heading block 应含 level 数字");
      }
      if (block.type === "image") {
        assert.ok(typeof block.url === "string", "image block 应含 url");
      }
      if (block.type === "code") {
        assert.ok(typeof block.text === "string", "code block 应含 text");
      }
    }
  }
});

// sync-conflict fixture 至少覆盖 progress 类型（与 progress-location schema 关联）
test("sync-conflict fixture 至少有一个 progress 类型（与 progress-location 关联）", () => {
  const hasProgress = syncConflictFixtures.some((item) => item.type === "progress");
  assert.ok(hasProgress, "sync-conflict fixtures 应覆盖 progress 类型以关联 progress-location");
});

// --- 唯一性 ---
test("CoreCommand type 在 schema 中唯一", () => {
  const types = coreCmdSchema.properties.type.enum;
  assert.equal(new Set(types).size, types.length, "CoreCommand type 重复");
});

test("CoreEvent type 在 schema 中唯一", () => {
  const types = coreEvtSchema.properties.type.enum;
  assert.equal(new Set(types).size, types.length, "CoreEvent type 重复");
});

test("HostRequest type 在 schema 中唯一", () => {
  const types = hostReqSchema.properties.type.enum;
  assert.equal(new Set(types).size, types.length, "HostRequest type 重复");
});

test("SyncConflict type 在 schema 中唯一", () => {
  const types = syncConflictSchema.properties.type.enum;
  assert.equal(new Set(types).size, types.length, "SyncConflict type 重复");
});
