import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

const implementations = new Map([
  ["reference", "packages/reference/reader-ui-runtime.mjs"],
  ["swift", "packages/swift/ReaderUIRuntime/Sources/ReaderUIRuntime/ReaderUIRuntime.swift"],
  ["kotlin", "packages/kotlin/reader-ui-runtime/src/main/kotlin/io/reader/ui/runtime/ReaderUIRuntime.kt"],
  ["arkts", "packages/arkts/reader-ui-runtime/src/main/ets/ReaderUIRuntime.ets"]
]);

const typedContractImplementations = new Map([
  ["reference", "packages/reference/generated-runtime-payload-contracts.mjs"],
  ["swift", "packages/swift/ReaderUIRuntime/Sources/ReaderUIRuntime/GeneratedRuntimeTypedPayloadContracts.swift"],
  ["kotlin", "packages/kotlin/reader-ui-runtime/src/main/kotlin/io/reader/ui/runtime/GeneratedRuntimeTypedPayloadContracts.kt"],
  ["arkts", "packages/arkts/reader-ui-runtime/src/main/ets/GeneratedRuntimeTypedPayloadContracts.ets"],
]);

const jsonBoundarySources = new Map([
  ["reference", ["packages/reference/reader-ui-runtime.mjs"]],
  ["swift", [
    "packages/swift/ReaderUIRuntime/Sources/ReaderUIRuntime/ReaderUIJSONValue.swift",
    "packages/swift/ReaderUIRuntime/Sources/ReaderUIRuntime/ReaderUIRuntime.swift"
  ]],
  ["kotlin", ["packages/kotlin/reader-ui-runtime/src/main/kotlin/io/reader/ui/runtime/ReaderUIRuntime.kt"]],
  ["arkts", ["packages/arkts/reader-ui-runtime/src/main/ets/ReaderUIRuntime.ets"]]
]);

const requiredSemantics = [
  "pageTransaction",
  "ttsTransaction",
  "autoPageTransaction",
  "beginPageStep",
  "providePageLayout",
  "acceptPageLocationResult",
  "acceptPageProgressResult",
  "acceptPageProgressJSONResult",
  "cancelPageStep",
  "acceptTTSCoreResult",
  "acceptTTSSystemStart",
  "stopTTS",
  "acceptAutoPageTimerFired",
  "stopAutoPage",
  "suspendAutoPageForBackground",
  "awaiting-layout",
  "resolving-location",
  "persisting-progress",
  "awaiting-plan",
  "awaiting-queue-start",
  "awaiting-speech-start",
  "PAGE_TRANSACTION_PENDING",
  "PAGE_LOCATION_INVALID_RESULT",
  "PAGE_PROGRESS_INVALID_RESULT",
  "PAGE_PROGRESS_COMMIT_PENDING",
  "BOOK_OPEN_TRANSACTION_PENDING",
  "locationRevision",
  "reader.location.resolve.v1.reflow",
  "offsetAnchor",
  "chapterOffset",
  "chapterProgress",
  "layoutIndependent",
  "reader.progress.update",
  "timer.foreground.arm",
  "timer.foreground.cancel",
  "timerId",
  "delayMs",
  "generation",
  "oneShot",
  "foregroundOnly"
];

test("playback implementation locks the current action table byte-for-byte", () => {
  const bytes = fs.readFileSync(path.join(root, "ui-spec", "runtime-actions.json"));
  const digest = crypto.createHash("sha256").update(bytes).digest("hex");
  assert.equal(digest, "94151094c1025bd68a57f3201ee5abcd56fe4ff0877f23e8f163b32d81fe9f7a");
});

test("reference, Swift, Kotlin and ArkTS expose the same playback transaction surface", () => {
  const platformTypes = {
    reference: ["readerUIJSONResultCanonicalLocation", "readerUIJSONResultReflow"],
    swift: ["ReaderUICanonicalLocation", "ReaderUILocationReflow"],
    kotlin: ["ReaderUICanonicalLocation", "ReaderUILocationReflow"],
    arkts: ["ReaderUICanonicalLocation", "ReaderUILocationReflow"],
  };
  for (const [name, relative] of implementations) {
    const source = fs.readFileSync(path.join(root, relative), "utf8");
    const semanticSource = `${source}\n${fs.readFileSync(
      path.join(root, typedContractImplementations.get(name)),
      "utf8",
    )}`;
    for (const semantic of requiredSemantics) {
      assert.ok(semanticSource.includes(semantic), `${name} runtime is missing ${semantic}`);
    }
    for (const semantic of platformTypes[name]) {
      assert.ok(source.includes(semantic), `${name} runtime is missing ${semantic}`);
    }
    assert.ok(!source.includes("reader.foregroundTimer."), `${name} retained an untyped timer directive`);
    assert.ok(!source.includes("background.schedule"), `${name} maps auto-page to a background task`);
  }
});

test("all generated HostRequest types include the foreground timer pair", () => {
  const generated = [
    "generated/swift/HostRequest.swift",
    "generated/kotlin/HostRequest.kt",
    "generated/arkts/HostRequest.ets"
  ];
  for (const relative of generated) {
    const source = fs.readFileSync(path.join(root, relative), "utf8");
    assert.ok(source.includes("timer.foreground.arm"), `${relative} misses timer.foreground.arm`);
    assert.ok(source.includes("timer.foreground.cancel"), `${relative} misses timer.foreground.cancel`);
  }
});

test("all runtimes expose recursive JSON payload and result boundaries without scalar stringification", () => {
  const required = {
    reference: ["cloneReaderUIJSONValue", "cloneReaderUIJSONPayload", "cloneReaderUIJSONResult", "jsonPayload", "legacyPayloadIsComplete"],
    swift: ["ReaderUIJSONValue", "ReaderUIJSONPayload", "ReaderUIJSONResult", "jsonPayload", "acceptPageLocationJSONResult", "acceptPageProgressJSONResult"],
    kotlin: ["JsonElement", "ReaderUIJSONPayload", "ReaderUIJSONResult", "jsonPayload", "acceptPageLocationJSONResult", "acceptPageProgressJSONResult"],
    arkts: ["ReaderUIJSONValue", "ReaderUIJSONPayload", "ReaderUIJSONResult", "jsonPayload", "acceptPageLocationJSONResult", "acceptPageProgressJSONResult"]
  };
  for (const [name, relatives] of jsonBoundarySources) {
    const source = relatives.map((relative) => fs.readFileSync(path.join(root, relative), "utf8")).join("\n");
    for (const semantic of required[name]) {
      assert.ok(source.includes(semantic), `${name} JSON boundary is missing ${semantic}`);
    }
  }

  const reference = fs.readFileSync(path.join(root, implementations.get("reference")), "utf8");
  const swift = fs.readFileSync(path.join(root, implementations.get("swift")), "utf8");
  const kotlin = fs.readFileSync(path.join(root, implementations.get("kotlin")), "utf8");
  const arkts = fs.readFileSync(path.join(root, implementations.get("arkts")), "utf8");
  assert.ok(!reference.includes("delayMs: String(transaction.intervalMs)"));
  assert.ok(!swift.includes('"delayMs": String(transaction.intervalMs)'));
  assert.ok(!kotlin.includes('"delayMs" to transaction.intervalMs.toString()'));
  assert.ok(!arkts.includes("'delayMs': transaction.intervalMs.toString()"));
});

test("all runtimes keep Core location results layout-independent and derive pageIndex only from measured layout", () => {
  const sources = Object.fromEntries(
    [...implementations].map(([name, relative]) => [name, fs.readFileSync(path.join(root, relative), "utf8")]),
  );
  const requiredRequestFragments = {
    reference: [
      "anchor: {",
      "chapterOffset: layout.chapterOffset",
      "chapterProgress: layout.chapterProgress",
      "layout: {",
      "pageIndex: layout.targetPageIndex",
    ],
    swift: [
      "\"anchor\": .object([",
      "\"chapterOffset\": .number(Double(layout.chapterOffset))",
      "\"chapterProgress\": .number(layout.chapterProgress)",
      "\"layout\": .object([",
      "\"pageIndex\": .number(Double(layout.targetPageIndex))",
    ],
    kotlin: [
      "put(\"anchor\", JsonObject(mapOf(",
      "\"chapterOffset\" to JsonPrimitive(layout.chapterOffset)",
      "\"chapterProgress\" to JsonPrimitive(layout.chapterProgress)",
      "put(\"layout\", JsonObject(mapOf(",
      "\"pageIndex\" to JsonPrimitive(layout.targetPageIndex)",
    ],
    arkts: [
      "'anchor': {",
      "'chapterOffset': layout.chapterOffset",
      "'chapterProgress': layout.chapterProgress",
      "'layout': {",
      "'pageIndex': layout.targetPageIndex",
    ],
  };
  for (const [name, source] of Object.entries(sources)) {
    for (const fragment of requiredRequestFragments[name]) {
      assert.ok(source.includes(fragment), `${name} resolve request is missing ${fragment}`);
    }
  }

  for (const [name, source] of Object.entries(sources)) {
    assert.ok(
      !/canonicalLocation\s*[:=]\s*["']/.test(source),
      `${name} runtime retained an opaque canonicalLocation string`,
    );
    assert.ok(
      !/result(?:Value)?(?:\?|\.)?(?:\[['"]pageIndex['"]\]|\.pageIndex)/.test(source),
      `${name} runtime consumes forbidden Core result pageIndex`,
    );
  }
});
