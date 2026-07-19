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
  assert.equal(digest, "be48bbf47954980884738599ff29f21af070ba88a5efc865a20b40f08a47cfc4");
});

test("reference, Swift, Kotlin and ArkTS expose the same playback transaction surface", () => {
  for (const [name, relative] of implementations) {
    const source = fs.readFileSync(path.join(root, relative), "utf8");
    for (const semantic of requiredSemantics) {
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
