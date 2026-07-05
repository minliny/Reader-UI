import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACTS_DIR = join(__dirname, "..");

function loadJson(rel) {
  return JSON.parse(readFileSync(join(CONTRACTS_DIR, rel), "utf8"));
}

function readText(rel) {
  return readFileSync(join(CONTRACTS_DIR, rel), "utf8");
}

function section(markdown, start, end) {
  const startIndex = markdown.indexOf(start);
  assert.notEqual(startIndex, -1, `missing section: ${start}`);
  const endIndex = end ? markdown.indexOf(end, startIndex + start.length) : -1;
  return endIndex === -1 ? markdown.slice(startIndex) : markdown.slice(startIndex, endIndex);
}

function tableRows(markdown) {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .filter((line) => !line.includes("---"))
    .filter((line) => !/^\|\s*(UiEvent|HostRequest|业务域)/.test(line))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
}

function codeSpans(text) {
  return [...String(text).matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}

const uiEventSchema = loadJson("ui-event.schema.json");
const coreCommandSchema = loadJson("core-command.schema.json");
const hostRequestSchema = loadJson("host-request.schema.json");
const boundary = readText("CORE_HOST_BOUNDARY.md");

test("Core/Host boundary business domains name Core ownership explicitly", () => {
  const domainSection = section(boundary, "## 1. 业务域归属", "## 2.");
  for (const domain of [
    "书架",
    "搜索历史",
    "RSS 订阅",
    "正文",
    "阅读进度",
    "TTS 队列",
    "同步冲突",
  ]) {
    assert.ok(domainSection.includes(domain), `CORE_HOST_BOUNDARY missing domain: ${domain}`);
  }
  assert.ok(domainSection.includes("平台持久化禁令"), "CORE_HOST_BOUNDARY must include platform persistence ban");
});

test("UiEvent -> CoreCommand mapping references existing schema ids", () => {
  const mappingSection = section(boundary, "## 2. UiEvent → CoreCommand 映射", "## 3.");
  const uiEvents = new Set(uiEventSchema.properties.type.enum);
  const coreCommands = new Set(coreCommandSchema.properties.type.enum);
  const hostRequests = new Set(hostRequestSchema.properties.type.enum);

  for (const cells of tableRows(mappingSection)) {
    const eventCell = cells[0] || "";
    const effectCell = cells[2] || "";
    for (const eventId of codeSpans(eventCell)) {
      if (!eventId.includes(".")) continue;
      assert.ok(uiEvents.has(eventId), `CORE_HOST_BOUNDARY references unknown UiEvent: ${eventId}`);
    }
    for (const ref of codeSpans(effectCell)) {
      if (!ref.includes(".")) continue;
      assert.ok(
        coreCommands.has(ref) || hostRequests.has(ref),
        `CORE_HOST_BOUNDARY references unknown CoreCommand/HostRequest: ${ref}`
      );
    }
  }
});

test("HostRequest table references existing schema ids and valid initiators", () => {
  const hostSection = section(boundary, "## 3. HostRequest 能力清单", "## 4.");
  const hostRequests = new Set(hostRequestSchema.properties.type.enum);
  const initiators = new Set(hostRequestSchema.properties.initiator.enum);

  for (const cells of tableRows(hostSection)) {
    const [typeCell, initiatorCell] = cells;
    for (const type of codeSpans(typeCell || "")) {
      assert.ok(hostRequests.has(type), `CORE_HOST_BOUNDARY references unknown HostRequest: ${type}`);
    }
    const initiator = String(initiatorCell || "").replace(/`/g, "").trim();
    if (initiator) {
      assert.ok(initiators.has(initiator), `CORE_HOST_BOUNDARY uses invalid HostRequest initiator: ${initiator}`);
    }
  }
});

test("Reducer and Core HostRequest initiator constraints are documented", () => {
  const forbidden = section(boundary, "### 3.2 HostRequest 不允许的场景", "### 3.3");
  for (const rule of [
    "Reducer 不能发起 `http.execute`",
    "Reducer 不能发起 `cookie.get / set / clear`",
    "Reducer 不能发起 `credential.get / set / delete`",
    "Reducer 不能发起 `tts.system.*`",
    "Core 不能发起 `webview.open / close / evaluate`",
  ]) {
    assert.ok(forbidden.includes(rule), `CORE_HOST_BOUNDARY missing forbidden HostRequest rule: ${rule}`);
  }
});
