import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { assertValid } from "./mini-validator.mjs";
import {
  ReaderUIRuntime,
  ReaderUIRuntimeError,
  cloneReaderUIJSONResult,
  initialReaderUIState,
  READER_FOREGROUND_TIMER_ARM,
  READER_FOREGROUND_TIMER_CANCEL
} from "../../packages/reference/reader-ui-runtime.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const spec = JSON.parse(fs.readFileSync(path.join(root, "ui-spec", "runtime-actions.json"), "utf8"));
const specSchema = JSON.parse(fs.readFileSync(path.join(root, "ui-spec", "runtime-actions.schema.json"), "utf8"));
const uiEventSchema = JSON.parse(fs.readFileSync(path.join(root, "contracts", "ui-event.schema.json"), "utf8"));
const coreCommandSchema = JSON.parse(fs.readFileSync(path.join(root, "contracts", "core-command.schema.json"), "utf8"));
const hostRequestSchema = JSON.parse(fs.readFileSync(path.join(root, "contracts", "host-request.schema.json"), "utf8"));
const hostRequestFixtures = JSON.parse(fs.readFileSync(path.join(root, "contracts", "fixtures", "host-request.fixtures.json"), "utf8"));
const consumerLockSchema = JSON.parse(fs.readFileSync(path.join(root, "ui-spec", "host-consumer-lock.schema.json"), "utf8"));
const consumers = JSON.parse(fs.readFileSync(path.join(root, "ui-spec", "host-consumers.json"), "utf8"));
const versionManifest = JSON.parse(fs.readFileSync(path.join(root, "contracts", "VERSION.json"), "utf8"));
const ownershipSchema = JSON.parse(fs.readFileSync(path.join(root, "ui-spec", "runtime-ownership.schema.json"), "utf8"));
const ownership = JSON.parse(fs.readFileSync(path.join(root, "ui-spec", "runtime-ownership.json"), "utf8"));
const coverage = JSON.parse(fs.readFileSync(path.join(root, "generated", "runtime-coverage.json"), "utf8"));

function activeReaderRuntime(overrides = {}) {
  return new ReaderUIRuntime(spec, {
    ...initialReaderUIState(),
    routeId: "immersive-reading",
    routeStack: ["bookshelf"],
    ...overrides
  });
}

function measuredPageLayout(overrides = {}) {
  return {
    anchor: "chapter-4:offset-120",
    targetPageIndex: 5,
    chapterIndex: 4,
    chapterOffset: 120,
    chapterProgress: 0.42,
    viewportWidth: 390,
    viewportHeight: 844,
    fontScale: 1,
    ...overrides
  };
}

test("runtime action spec passes its schema and has unique events", () => {
  assertValid(specSchema, spec, "ui-spec/runtime-actions.json");
  const events = spec.actions.map((item) => item.event);
  assert.equal(new Set(events).size, events.length);
});

test("host consumer manifest is complete and lock schema accepts the canonical shape", () => {
  assert.deepEqual(consumers.hosts.map((item) => item.host).sort(), ["android", "harmonyos", "ios"]);
  assert.equal(consumers.schemaVersion, 2);
  assert.equal(consumers.rolloutPolicy.hostRequestSchemaVersion, versionManifest.schema["host-request"]);
  assert.equal(consumers.rolloutPolicy.defaultMode, "shadow");
  assert.deepEqual(consumers.rolloutPolicy.coveredEvents, [
    "book.open",
    "reader.directory.open",
    "reader.directory.close",
    "reader.page.next",
    "reader.page.prev",
    "reader.tts.start",
    "reader.tts.stop",
    "reader.autoPage.start",
    "reader.autoPage.stop",
    "import.start",
    "import.apply",
    "import.cancel",
    "source.switch.open",
    "source.switch.cancel",
    "source.switch.confirm",
    "source.switch.rollback",
    "reader.sourceSwitch.open",
    "reader.sourceSwitch.close",
    "reader.replace.apply",
    "reader.replace.create",
    "reader.replace.validate",
    "rss.refresh",
    "rss.subscription.add",
    "rss.subscription.delete",
    "rss.subscription.edit",
    "rss.entry.open",
    "rss.favorite.add",
    "rss.favorite.remove",
    "sync.run",
    "webdav.config.test",
    "sync.start",
    "sync.progress",
    "sync.complete",
    "sync.conflict",
    "sync.resolve"
  ]);
  assert.deepEqual(consumers.rolloutPolicy.pilotEvents, [
    "reader.directory.open",
    "reader.directory.close"
  ]);
  assert.deepEqual(consumers.rolloutPolicy.effectfulEvents, [
    "book.open",
    "reader.page.next",
    "reader.page.prev",
    "reader.tts.start",
    "reader.tts.stop",
    "reader.autoPage.start",
    "reader.autoPage.stop",
    "import.start",
    "import.apply",
    "import.cancel",
    "source.switch.confirm",
    "source.switch.rollback",
    "reader.replace.apply",
    "reader.replace.create",
    "reader.replace.validate",
    "rss.refresh",
    "rss.subscription.add",
    "rss.subscription.delete",
    "rss.subscription.edit",
    "rss.entry.open",
    "rss.favorite.add",
    "rss.favorite.remove",
    "sync.run",
    "webdav.config.test",
    "sync.start",
    "sync.progress",
    "sync.complete",
    "sync.conflict",
    "sync.resolve"
  ]);
  assert.equal(consumers.rolloutPolicy.pilotEffectPolicy, "none");
  assert.deepEqual(consumers.rolloutPolicy.effectfulPilotEvents, [
    "book.open",
    "reader.tts.start",
    "reader.tts.stop",
    "reader.autoPage.start",
    "reader.autoPage.stop"
  ]);
  assertValid(consumerLockSchema, {
    schemaVersion: 2,
    host: "ios",
    readerUiVersion: "2.5.1",
    hostRequestSchemaVersion: "1.1.0",
    runtimeActionsSchemaVersion: spec.schemaVersion,
    runtimeActionsSha256: "0".repeat(64),
    releaseIdentity: {
      releaseId: `${"1".repeat(40)}:${"2".repeat(64)}`,
      sourceSha: "1".repeat(40),
      manifestSha256: "2".repeat(64),
      targetConfigSha256: "3".repeat(64)
    },
    rollout: {
      mode: "shadow",
      coveredEvents: ["book.open", "reader.directory.open"],
      cohorts: [{ id: "directory-shadow", mode: "shadow", events: ["reader.directory.open"] }]
    },
    knownDifferences: [],
    blockedProof: []
  }, "host consumer lock example");
});

test("runtime action events are all canonical UiEvent values", () => {
  const allowed = new Set(uiEventSchema.properties.type.enum);
  const unknown = spec.actions.map((item) => item.event).filter((event) => !allowed.has(event));
  assert.deepEqual(unknown, []);
});

test("runtime effects only reference canonical CoreCommand and HostRequest types", () => {
  const coreCommands = new Set(coreCommandSchema.properties.type.enum);
  const hostRequests = new Set(hostRequestSchema.properties.type.enum);
  const unknownCore = spec.actions.flatMap((item) => item.coreSequence || []).filter((type) => !coreCommands.has(type));
  const unknownHost = spec.actions.map((item) => item.hostRequest).filter(Boolean).filter((type) => !hostRequests.has(type));
  assert.deepEqual(unknownCore, []);
  assert.deepEqual(unknownHost, []);
});

test("foreground timer effects are canonical typed HostRequests, never background jobs", () => {
  const allowed = new Set(hostRequestSchema.properties.type.enum);
  assert.ok(allowed.has(READER_FOREGROUND_TIMER_ARM));
  assert.ok(allowed.has(READER_FOREGROUND_TIMER_CANCEL));
  const timerFixtures = hostRequestFixtures.filter((item) => item.type.startsWith("timer.foreground."));
  assert.deepEqual(timerFixtures.map((item) => item.type), [
    READER_FOREGROUND_TIMER_ARM,
    READER_FOREGROUND_TIMER_CANCEL
  ]);
  for (const fixture of timerFixtures) {
    assert.equal(typeof fixture.payload.timerId, "string");
    assert.equal(typeof fixture.payload.correlationId, "string");
    assert.equal(typeof fixture.payload.delayMs, "number");
    assert.equal(typeof fixture.payload.generation, "number");
    assert.equal(fixture.payload.oneShot, true);
    assert.equal(fixture.payload.foregroundOnly, true);
  }
});

test("book.open descriptor declares serial transaction admission semantics", () => {
  const action = spec.actions.find((item) => item.event === "book.open");
  assert.ok(action);
  assert.equal(action.action, "bookOpenSequence");
  assert.deepEqual(action.requiredPayload, ["bookId", "sourceId", "sourceKind"]);
  assert.deepEqual(action.guards || [], []);
  assert.deepEqual(action.coreSequence, ["source.detail", "chapter.list", "content.load", "reader.location.resolve"]);
});

test("cache retry, cache status, cache clear and replace undo use deterministic Core DTO effects", () => {
  for (const [event, requiredPayload, coreSequence] of [
    ["reader.bookCache.open", ["sourceId", "bookId"], ["cache.book.status"]],
    ["settings.cache.clear", ["scope"], ["cache.clear"]],
    ["download.task.retry", ["sourceId", "bookId", "chapterRange"], ["cache.book.prefetch"]],
    ["reader.replace.undo", ["undoToken"], ["replace.undo"]]
  ]) {
    const action = spec.actions.find((item) => item.event === event);
    assert.ok(action, event);
    assert.equal(action.action, "emitEffects", event);
    assert.deepEqual(action.requiredPayload, requiredPayload, event);
    assert.deepEqual(action.coreSequence, coreSequence, event);
  }
});

test("runtime codegen is deterministic for reference and all three hosts", () => {
  const outputs = [
    "packages/swift/ReaderUIRuntime/Sources/ReaderUIRuntime/GeneratedRuntimeActions.swift",
    "packages/kotlin/reader-ui-runtime/src/main/kotlin/io/reader/ui/runtime/GeneratedRuntimeActions.kt",
    "packages/arkts/reader-ui-runtime/src/main/ets/GeneratedRuntimeActions.ets",
    "packages/reference/generated-runtime-payload-contracts.mjs",
    "packages/swift/ReaderUIRuntime/Sources/ReaderUIRuntime/GeneratedRuntimeTypedPayloadContracts.swift",
    "packages/kotlin/reader-ui-runtime/src/main/kotlin/io/reader/ui/runtime/GeneratedRuntimeTypedPayloadContracts.kt",
    "packages/arkts/reader-ui-runtime/src/main/ets/GeneratedRuntimeTypedPayloadContracts.ets",
    "packages/swift/ReaderUIRuntime/Tests/ReaderUIRuntimeTests/GeneratedRuntimeTypedPayloadFixtures.swift",
    "packages/swift/ReaderUIRuntime/Tests/ReaderUIRuntimeTests/GeneratedRuntimeTypedResultFixtures.swift",
    "packages/kotlin/reader-ui-runtime/src/test/kotlin/io/reader/ui/runtime/GeneratedRuntimeTypedPayloadFixtures.kt",
    "packages/kotlin/reader-ui-runtime/src/test/kotlin/io/reader/ui/runtime/GeneratedRuntimeTypedResultFixtures.kt",
    "packages/arkts/reader-ui-runtime/src/test/GeneratedRuntimeTypedPayloadFixtures.ets",
    "packages/arkts/reader-ui-runtime/src/test/GeneratedRuntimeTypedResultFixtures.ets"
  ];
  const before = new Map(outputs.map((file) => [file, fs.readFileSync(path.join(root, file), "utf8")]));
  const result = spawnSync("node", [path.join(root, "tools", "runtime", "generate-runtime.mjs"), "--check"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);
  for (const file of outputs) {
    assert.equal(fs.readFileSync(path.join(root, file), "utf8"), before.get(file), `${file} drifted`);
  }
});

test("runtime ownership report accounts for every canonical UiEvent", () => {
  assertValid(ownershipSchema, ownership, "ui-spec/runtime-ownership.json");
  const canonicalEvents = uiEventSchema.properties.type.enum;
  assert.equal(ownership.canonicalUiEventCount, canonicalEvents.length);
  assert.equal(coverage.summary.canonicalEvents, canonicalEvents.length);
  assert.equal(coverage.summary.implemented, spec.actions.length);
  assert.equal(coverage.summary.platform, 7);
  assert.equal(coverage.events.length, canonicalEvents.length);
  assert.deepEqual(
    coverage.events.map((entry) => entry.event).sort(),
    [...canonicalEvents].sort()
  );
  assert.ok(coverage.events.every((entry) => ["runtime", "platformEphemeral", "split"].includes(entry.owner)));
  assert.ok(coverage.events.every((entry) => ["implemented", "planned", "platform"].includes(entry.coverage)));
  for (const entry of coverage.events.filter((entry) => entry.coverage === "implemented")) {
    assert.equal(entry.owner, "runtime");
    assert.ok(entry.action);
  }
  const result = spawnSync("node", [path.join(root, "tools", "runtime", "generate-runtime-coverage.mjs"), "--check"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);
});

test("contract and native runtime package versions are locked", () => {
  const expected = JSON.parse(fs.readFileSync(path.join(root, "contracts", "VERSION.json"), "utf8")).version;
  const contractGradle = fs.readFileSync(path.join(root, "reader-ui-contract", "build.gradle.kts"), "utf8");
  const runtimeGradle = fs.readFileSync(path.join(root, "packages", "kotlin", "reader-ui-runtime", "build.gradle.kts"), "utf8");
  const arkPackage = JSON.parse(fs.readFileSync(path.join(root, "packages", "arkts", "reader-ui-runtime", "oh-package.json5"), "utf8"));
  assert.match(contractGradle, new RegExp(`version\\s*=\\s*"${expected.replaceAll(".", "\\.")}"`));
  assert.match(runtimeGradle, new RegExp(`version\\s*=\\s*"${expected.replaceAll(".", "\\.")}"`));
  assert.equal(arkPackage.name, "reader_ui_runtime");
  assert.equal(arkPackage.version, expected);
});

test("runtime payloads preserve recursive JSON types and reject non-JSON values", () => {
  const runtime = new ReaderUIRuntime(spec);
  const payload = {
    kind: "bookSource",
    input: {
      sourceId: "source-1",
      rules: { search: [{ selector: ".book", enabled: true, weight: 2.5, optional: null }] },
      bookSource: { bookSourceName: "Source One", bookSourceUrl: "https://source.test", chapters: [1, 2, { title: "three", cached: false }] }
    }
  };
  const transition = runtime.dispatch("import.start", payload, "json-roundtrip");
  assert.deepEqual(transition.effects[0].jsonPayload, payload);
  assert.deepEqual(JSON.parse(JSON.stringify(transition.effects[0].jsonPayload)), payload);
  assert.deepEqual(transition.effects[0].payload, { kind: "bookSource" });
  assert.equal(transition.effects[0].legacyPayloadIsComplete, false);

  payload.input.sourceId = "mutated-after-dispatch";
  payload.input.bookSource.chapters.push(4);
  assert.equal(transition.effects[0].jsonPayload.input.sourceId, "source-1");
  assert.equal(transition.effects[0].jsonPayload.input.bookSource.chapters.length, 3);

  for (const invalid of [
    { value: undefined },
    { value: Number.NaN },
    { value: Number.POSITIVE_INFINITY },
    { value: new Date(0) }
  ]) {
    assert.throws(
      () => runtime.dispatch("import.start", invalid, "json-invalid"),
      (error) => error instanceof ReaderUIRuntimeError && error.code === "INVALID_JSON_PAYLOAD"
    );
  }
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(
    () => runtime.dispatch("import.start", cyclic, "json-cycle"),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "INVALID_JSON_PAYLOAD"
  );
});

test("runtime results preserve recursive JSON types and reject invalid result values", () => {
  const result = {
    canonicalLocation: "chapter-4:p3",
    pageIndex: 3,
    metadata: {
      cached: true,
      ratio: 0.42,
      optional: null,
      segments: ["a", 2, false]
    }
  };
  const cloned = cloneReaderUIJSONResult(result);
  assert.deepEqual(cloned, result);
  result.metadata.segments.push("mutated");
  assert.deepEqual(cloned.metadata.segments, ["a", 2, false]);

  assert.throws(
    () => cloneReaderUIJSONResult({ metadata: { createdAt: new Date(0) } }),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "INVALID_JSON_RESULT"
  );

  const runtime = activeReaderRuntime();
  runtime.dispatch("reader.page.next", {}, "json-result");
  runtime.providePageLayout("json-result", measuredPageLayout({ targetPageIndex: 3 }));
  const accepted = runtime.acceptPageLocationResult("json-result", {
    canonicalLocation: "chapter-4:p3",
    pageIndex: 3
  });
  assert.equal(accepted.accepted, true);
  assert.deepEqual(accepted.effects.map((effect) => effect.type), ["reader.progress.update"]);
  assert.equal(runtime.state.readerPageIndex, 0);
  runtime.acceptPageProgressJSONResult("json-result", { stored: true });
  assert.equal(runtime.state.readerPageIndex, 3);
});

test("book.open is a serial result-dependent Core transaction", () => {
  const runtime = new ReaderUIRuntime(spec);
  const result = runtime.dispatch(
    "book.open",
    { bookId: "book-1", sourceId: "source-1", sourceKind: "remote", chapterIndex: 1 },
    "open-1"
  );
  assert.equal(result.state.routeId, "immersive-reading");
  assert.equal(result.state.loading, true);
  assert.deepEqual(result.effects.map((effect) => effect.type), ["source.detail"]);

  const detail = runtime.acceptBookOpenResult("source.detail", "open-1");
  assert.equal(detail.accepted, true);
  assert.deepEqual(detail.effects.map((effect) => effect.type), ["chapter.list"]);

  const toc = runtime.acceptBookOpenResult("chapter.list", "open-1", { chapterCount: 3 });
  assert.equal(toc.accepted, true);
  assert.deepEqual(toc.effects.map((effect) => effect.type), ["content.load"]);
  assert.equal(toc.effects[0].jsonPayload.chapterIndex, 1);

  const content = runtime.acceptBookOpenResult("content.load", "open-1");
  assert.equal(content.accepted, true);
  assert.deepEqual(content.effects, []);
  assert.equal(runtime.state.bookOpenTransaction.awaitingLayout, true);

  const beforeInvalid = runtime.state;
  assert.throws(
    () => runtime.provideBookOpenLayout("open-1", {
      chapterOffset: 0,
      chapterProgress: 0,
      viewportWidth: 0,
      viewportHeight: 844,
      fontScale: 1
    }),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "INVALID_LAYOUT"
  );
  assert.deepEqual(runtime.state, beforeInvalid);

  const layout = runtime.provideBookOpenLayout("open-1", {
    chapterOffset: 12,
    chapterProgress: 0.4,
    viewportWidth: 390,
    viewportHeight: 844,
    fontScale: 1
  });
  assert.equal(layout.accepted, true);
  assert.deepEqual(layout.effects.map((effect) => effect.type), ["reader.location.resolve"]);
  assert.equal(layout.effects[0].jsonPayload.viewportWidth, 390);

  const complete = runtime.acceptBookOpenResult("reader.location.resolve", "open-1", {
    canonicalLocation: "chapter:2:offset:120",
    pageIndex: 2
  });
  assert.equal(complete.accepted, true);
  assert.equal(runtime.state.loading, false);
  assert.equal(runtime.state.readerCanonicalLocation, "chapter:2:offset:120");
  assert.equal(runtime.state.readerPageIndex, 2);
  assert.equal(runtime.state.bookOpenTransaction, null);
});

test("book.open supersedes, cancels and ignores stale results", () => {
  const runtime = new ReaderUIRuntime(spec);
  runtime.dispatch("book.open", { bookId: "a", sourceId: "s", sourceKind: "remote" }, "open-a");
  const replacement = runtime.dispatch("book.open", { bookId: "b", sourceId: "s", sourceKind: "remote" }, "open-b");
  assert.deepEqual(replacement.cancelledCorrelationIds, ["open-a"]);
  assert.deepEqual(replacement.effects.map((effect) => effect.type), ["source.detail"]);
  assert.equal(runtime.acceptBookOpenResult("source.detail", "open-a").accepted, false);

  const cancelled = runtime.cancelBookOpen("open-b");
  assert.equal(cancelled.accepted, true);
  assert.equal(runtime.state.routeId, "bookshelf");
  assert.equal(runtime.state.loading, false);
  assert.equal(runtime.acceptBookOpenResult("source.detail", "open-b").accepted, false);
});

test("local book.open skips detail and never loads an empty TOC", () => {
  const runtime = new ReaderUIRuntime(spec);
  const start = runtime.dispatch(
    "book.open",
    { bookId: "local-1", sourceId: "local", sourceKind: "local" },
    "local-open"
  );
  assert.deepEqual(start.effects.map((effect) => effect.type), ["chapter.list"]);
  const empty = runtime.acceptBookOpenResult("chapter.list", "local-open", { chapterCount: 0 });
  assert.equal(empty.accepted, true);
  assert.deepEqual(empty.effects, []);
  assert.equal(runtime.state.error, "BOOK_OPEN_EMPTY_TOC");
});

test("page transaction commits only a matching canonical location result", () => {
  const runtime = activeReaderRuntime({ readerPageIndex: 4, readerCanonicalLocation: "old-location" });
  const start = runtime.dispatch("reader.page.next", {}, "page-1");
  assert.deepEqual(start.effects, []);
  assert.equal(start.state.readerPageIndex, 4);
  assert.equal(start.state.readerCanonicalLocation, "old-location");

  const beforeInvalid = runtime.state;
  assert.throws(
    () => runtime.providePageLayout("page-1", measuredPageLayout({ viewportWidth: 0 })),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "INVALID_PAGE_LAYOUT"
  );
  assert.deepEqual(runtime.state, beforeInvalid);

  const resolving = runtime.providePageLayout("page-1", measuredPageLayout());
  assert.deepEqual(resolving.effects.map((effect) => effect.type), ["reader.location.resolve"]);
  assert.equal(runtime.state.readerPageIndex, 4);
  assert.equal(runtime.acceptPageLocationResult("other", { canonicalLocation: "late", pageIndex: 5 }).accepted, false);

  const failed = runtime.acceptPageLocationResult("page-1", { error: "LOCATION_FAILED" });
  assert.equal(failed.accepted, true);
  assert.equal(runtime.state.readerPageIndex, 4);
  assert.equal(runtime.state.readerCanonicalLocation, "old-location");
  assert.equal(runtime.acceptPageLocationResult("page-1", { canonicalLocation: "late", pageIndex: 5 }).accepted, false);

  runtime.dispatch("reader.page.next", {}, "page-invalid");
  runtime.providePageLayout("page-invalid", measuredPageLayout());
  assert.throws(
    () => runtime.acceptPageLocationResult("page-invalid", { canonicalLocation: "   ", pageIndex: 5 }),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "INVALID_TYPED_RESULT"
  );
  assert.equal(runtime.state.error, null);
  assert.equal(runtime.state.readerPageIndex, 4);
  assert.equal(runtime.state.readerCanonicalLocation, "old-location");

  runtime.dispatch("reader.page.prev", {}, "page-2");
  runtime.providePageLayout("page-2", measuredPageLayout({ targetPageIndex: 3 }));
  const persisting = runtime.acceptPageLocationResult("page-2", {
    canonicalLocation: "canonical-ch4-p3",
    pageIndex: 3
  });
  assert.equal(persisting.accepted, true);
  assert.deepEqual(persisting.effects.map((effect) => effect.type), ["reader.progress.update"]);
  assert.deepEqual(persisting.effects[0].jsonPayload, {});
  assert.equal(runtime.state.pageTransaction.stage, "persisting-progress");
  assert.equal(runtime.state.readerPageIndex, 4);
  assert.throws(
    () => runtime.dispatch("reader.page.next", {}, "page-blocked"),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "PAGE_PROGRESS_COMMIT_PENDING"
  );
  assert.throws(
    () => runtime.dispatch("reader.autoPage.start", { intervalMs: "4000" }, "auto-blocked"),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "PAGE_PROGRESS_COMMIT_PENDING"
  );
  assert.throws(
    () => runtime.cancelPageStep("page-2"),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "PAGE_PROGRESS_COMMIT_PENDING"
  );
  const committed = runtime.acceptPageProgressResult("page-2", { stored: true });
  assert.equal(committed.accepted, true);
  assert.equal(runtime.state.readerPageIndex, 3);
  assert.equal(runtime.state.readerCanonicalLocation, "canonical-ch4-p3");
  assert.equal(runtime.acceptPageLocationResult("page-2", { canonicalLocation: "duplicate", pageIndex: 9 }).accepted, false);

  runtime.dispatch("reader.page.next", {}, "page-progress-error");
  runtime.providePageLayout("page-progress-error", measuredPageLayout({ targetPageIndex: 4 }));
  runtime.acceptPageLocationResult("page-progress-error", {
    canonicalLocation: "canonical-ch4-p4",
    pageIndex: 4
  });
  const progressFailed = runtime.acceptPageProgressResult("page-progress-error", {
    error: "PROGRESS_STORE_FAILED"
  });
  assert.equal(progressFailed.accepted, true);
  assert.equal(runtime.state.readerPageIndex, 3);
  assert.equal(runtime.state.readerCanonicalLocation, "canonical-ch4-p3");
  assert.equal(runtime.state.error, "PROGRESS_STORE_FAILED");
});

test("page intents supersede exactly once and explicit location shares the same transaction", () => {
  const runtime = activeReaderRuntime();
  runtime.dispatch("reader.page.next", {}, "page-a");
  const replacement = runtime.dispatch("reader.page.prev", {}, "page-b");
  assert.deepEqual(replacement.cancelledCorrelationIds, ["page-a"]);
  assert.equal(runtime.providePageLayout("page-a", measuredPageLayout()).accepted, false);

  const explicit = runtime.beginPageStep("explicit", "page-explicit", { reason: "chapter-jump" });
  assert.deepEqual(explicit.cancelledCorrelationIds, ["page-b"]);
  const resolving = runtime.providePageLayout("page-explicit", measuredPageLayout({ targetPageIndex: 0 }));
  assert.equal(resolving.effects[0].jsonPayload.direction, "explicit");
  assert.equal(resolving.effects[0].jsonPayload.reason, "chapter-jump");
});

test("progress commit boundary blocks reader exit and book replacement without cross-route contamination", () => {
  const runtime = activeReaderRuntime({ readerPageIndex: 2, readerCanonicalLocation: "book-a-page-2" });
  runtime.dispatch("reader.page.next", {}, "page-boundary");
  runtime.providePageLayout("page-boundary", measuredPageLayout({ targetPageIndex: 3 }));
  runtime.acceptPageLocationResult("page-boundary", {
    canonicalLocation: "book-a-page-3",
    pageIndex: 3
  });
  const pending = runtime.state;

  assert.throws(
    () => runtime.dispatch("reader.exit"),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "PAGE_PROGRESS_COMMIT_PENDING"
  );
  assert.throws(
    () => runtime.dispatch(
      "book.open",
      { bookId: "book-b", sourceId: "source-b", sourceKind: "remote" },
      "open-book-b"
    ),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "PAGE_PROGRESS_COMMIT_PENDING"
  );
  assert.throws(
    () => runtime.dispatch("route.replace", { routeId: "bookshelf" }),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "PAGE_PROGRESS_COMMIT_PENDING"
  );
  assert.throws(
    () => runtime.dispatch("route.pop"),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "PAGE_PROGRESS_COMMIT_PENDING"
  );
  assert.throws(
    () => runtime.dispatch("mainTab.select", { tab: "settings" }),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "PAGE_PROGRESS_COMMIT_PENDING"
  );
  assert.deepEqual(runtime.state, pending);

  runtime.acceptPageProgressResult("page-boundary", { stored: true });
  const opened = runtime.dispatch(
    "book.open",
    { bookId: "book-b", sourceId: "source-b", sourceKind: "remote" },
    "open-book-b"
  );
  assert.equal(opened.state.bookOpenTransaction.correlationId, "open-book-b");
  assert.throws(
    () => runtime.dispatch("reader.page.next", {}, "book-open-page"),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "BOOK_OPEN_TRANSACTION_PENDING"
  );
  assert.equal(runtime.acceptPageProgressResult("page-boundary", { stored: true }).accepted, false);
  assert.equal(runtime.state.readerPageIndex, 3);
  assert.equal(runtime.state.readerCanonicalLocation, "book-a-page-3");
});

test("TTS advances plan then queue then system speech one effect at a time", () => {
  const runtime = activeReaderRuntime();
  const start = runtime.dispatch("reader.tts.start", { voice: "system-default" }, "tts-1");
  assert.deepEqual(start.effects.map((effect) => effect.type), ["tts.queue.plan"]);
  assert.equal(runtime.state.activeSession, null);
  assert.equal(runtime.acceptTTSCoreResult("tts.queue.start", "tts-1").accepted, false);

  const plan = runtime.acceptTTSCoreResult("tts.queue.plan", "tts-1");
  assert.deepEqual(plan.effects.map((effect) => effect.type), ["tts.queue.start"]);
  assert.equal(runtime.acceptTTSCoreResult("tts.queue.plan", "tts-1").accepted, false);

  const queue = runtime.acceptTTSCoreResult("tts.queue.start", "tts-1");
  assert.deepEqual(queue.effects.map((effect) => effect.type), ["tts.system.start"]);
  assert.equal(runtime.acceptTTSSystemStart("other").accepted, false);
  assert.equal(runtime.acceptTTSSystemStart("tts-1").accepted, true);
  assert.equal(runtime.state.activeSession, "tts");

  const stop = runtime.dispatch("reader.tts.stop", {}, "tts-1");
  assert.deepEqual(stop.effects.map((effect) => effect.type), ["tts.system.stop", "tts.queue.stop"]);
  assert.deepEqual(stop.cancelledCorrelationIds, ["tts-1"]);
  assert.equal(runtime.state.activeSession, null);
  assert.equal(runtime.acceptTTSSystemStart("tts-1").accepted, false);
  assert.throws(
    () => runtime.dispatch("reader.tts.start", { text: "lossy body" }, "tts-invalid"),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "INVALID_TYPED_PAYLOAD"
  );
});

test("TTS system-start failure tears down system before Core queue and drops late callbacks", () => {
  const runtime = activeReaderRuntime();
  runtime.dispatch("reader.tts.start", {}, "tts-error");
  runtime.acceptTTSCoreResult("tts.queue.plan", "tts-error");
  runtime.acceptTTSCoreResult("tts.queue.start", "tts-error");
  const failure = runtime.acceptTTSSystemStart("tts-error", { error: "SPEECH_FAILED" });
  assert.deepEqual(failure.effects.map((effect) => effect.type), ["tts.system.stop", "tts.queue.stop"]);
  assert.equal(runtime.state.ttsTransaction, null);
  assert.equal(runtime.state.activeSession, null);
  assert.equal(runtime.acceptTTSSystemStart("tts-error").accepted, false);
});

test("auto-page uses non-overlapping foreground one-shot timers and rearms only after commit", () => {
  const runtime = activeReaderRuntime({ readerPageIndex: 1, readerCanonicalLocation: "page-1" });
  const start = runtime.dispatch("reader.autoPage.start", { intervalMs: "5000" }, "auto-1");
  assert.deepEqual(start.effects.map((effect) => effect.type), [READER_FOREGROUND_TIMER_ARM]);
  assert.ok(new Set(hostRequestSchema.properties.type.enum).has(start.effects[0].type));
  assert.equal(start.effects[0].jsonPayload.timerId, "auto-1");
  assert.equal(start.effects[0].jsonPayload.correlationId, "auto-1");
  assert.equal(start.effects[0].jsonPayload.delayMs, 5000);
  assert.equal(start.effects[0].jsonPayload.oneShot, true);
  assert.equal(start.effects[0].jsonPayload.foregroundOnly, true);
  assert.equal(start.effects[0].payload.delayMs, "5000");
  assert.equal(start.effects[0].payload.oneShot, "true");
  const generation = runtime.state.autoPageTransaction.generation;
  assert.equal(runtime.acceptAutoPageTimerFired("auto-1", generation + 1).accepted, false);

  const fired = runtime.acceptAutoPageTimerFired("auto-1", generation);
  const pageCorrelation = fired.state.pageTransaction.correlationId;
  assert.deepEqual(fired.effects, []);
  assert.equal(runtime.state.autoPageTransaction.timerArmed, false);
  assert.equal(runtime.acceptAutoPageTimerFired("auto-1", generation).accepted, false);

  runtime.providePageLayout(pageCorrelation, measuredPageLayout({ targetPageIndex: 2 }));
  const persisting = runtime.acceptPageLocationResult(pageCorrelation, {
    canonicalLocation: "page-2",
    pageIndex: 2
  });
  assert.deepEqual(persisting.effects.map((effect) => effect.type), ["reader.progress.update"]);
  assert.equal(runtime.state.readerPageIndex, 1);
  const committed = runtime.acceptPageProgressResult(pageCorrelation, { stored: true });
  assert.deepEqual(committed.effects.map((effect) => effect.type), [READER_FOREGROUND_TIMER_ARM]);
  assert.equal(runtime.state.readerPageIndex, 2);
  assert.equal(runtime.acceptPageLocationResult(pageCorrelation, { canonicalLocation: "late", pageIndex: 9 }).accepted, false);

  const secondFire = runtime.acceptAutoPageTimerFired("auto-1", generation);
  const secondPage = secondFire.state.pageTransaction.correlationId;
  const background = runtime.suspendAutoPageForBackground("auto-1");
  assert.deepEqual(background.effects.map((effect) => effect.type), [READER_FOREGROUND_TIMER_CANCEL]);
  assert.deepEqual(background.cancelledCorrelationIds, ["auto-1", secondPage]);
  assert.ok(runtime.state.playbackGeneration > generation);
  assert.equal(runtime.acceptAutoPageTimerFired("auto-1", generation).accepted, false);
});

test("manual page stops an armed auto-page timer; auto-page rejects a pending manual page atomically", () => {
  const runtime = activeReaderRuntime();
  runtime.dispatch("reader.autoPage.start", { intervalMs: "4000" }, "auto-manual");
  const generation = runtime.state.playbackGeneration;
  const manual = runtime.dispatch("reader.page.next", {}, "manual-1");
  assert.deepEqual(manual.effects.map((effect) => effect.type), [READER_FOREGROUND_TIMER_CANCEL]);
  assert.deepEqual(manual.cancelledCorrelationIds, ["auto-manual"]);
  assert.equal(runtime.state.activeSession, null);
  assert.ok(runtime.state.playbackGeneration > generation);
  assert.equal(runtime.state.pageTransaction.correlationId, "manual-1");

  const beforeRejectedStart = runtime.state;
  assert.throws(
    () => runtime.dispatch("reader.autoPage.start", { intervalMs: "4000" }, "auto-rejected"),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "PAGE_TRANSACTION_PENDING"
  );
  assert.deepEqual(runtime.state, beforeRejectedStart);
});

test("TTS and auto-page replace each other with ordered teardown", () => {
  const runtime = activeReaderRuntime();
  runtime.dispatch("reader.tts.start", {}, "tts-playing");
  runtime.acceptTTSCoreResult("tts.queue.plan", "tts-playing");
  runtime.acceptTTSCoreResult("tts.queue.start", "tts-playing");
  runtime.acceptTTSSystemStart("tts-playing");

  const auto = runtime.dispatch("reader.autoPage.start", { intervalMs: "3000" }, "auto-after-tts");
  assert.deepEqual(
    auto.effects.map((effect) => effect.type),
    ["tts.system.stop", "tts.queue.stop", READER_FOREGROUND_TIMER_ARM]
  );
  assert.deepEqual(auto.cancelledCorrelationIds, ["tts-playing"]);

  const tts = runtime.dispatch("reader.tts.start", {}, "tts-after-auto");
  assert.deepEqual(tts.effects.map((effect) => effect.type), [READER_FOREGROUND_TIMER_CANCEL, "tts.queue.plan"]);
  assert.deepEqual(tts.cancelledCorrelationIds, ["auto-after-tts"]);
});

test("book.open preflight is atomic and valid navigation tears down playback before opening", () => {
  const runtime = activeReaderRuntime();
  runtime.dispatch("reader.tts.start", {}, "tts-nav");
  runtime.acceptTTSCoreResult("tts.queue.plan", "tts-nav");
  runtime.acceptTTSCoreResult("tts.queue.start", "tts-nav");
  runtime.acceptTTSSystemStart("tts-nav");
  const beforeInvalid = runtime.state;
  assert.throws(
    () => runtime.dispatch("book.open", { bookId: "b", sourceId: "s", sourceKind: "invalid" }, "open-bad"),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "INVALID_TYPED_PAYLOAD"
  );
  assert.deepEqual(runtime.state, beforeInvalid);

  const open = runtime.dispatch(
    "book.open",
    { bookId: "b", sourceId: "s", sourceKind: "remote" },
    "open-good"
  );
  assert.deepEqual(open.effects.map((effect) => effect.type), ["tts.system.stop", "tts.queue.stop", "source.detail"]);
  assert.deepEqual(open.cancelledCorrelationIds, ["tts-nav"]);
});

test("reader.exit invalidates auto-page generation before popping the route", () => {
  const runtime = activeReaderRuntime();
  runtime.dispatch("reader.autoPage.start", { intervalMs: "3000" }, "auto-exit");
  const generation = runtime.state.autoPageTransaction.generation;
  const exit = runtime.dispatch("reader.exit");
  assert.deepEqual(exit.effects.map((effect) => effect.type), [READER_FOREGROUND_TIMER_CANCEL]);
  assert.deepEqual(exit.cancelledCorrelationIds, ["auto-exit"]);
  assert.equal(exit.state.routeId, "bookshelf");
  assert.ok(exit.state.playbackGeneration > generation);
  assert.equal(runtime.acceptAutoPageTimerFired("auto-exit", generation).accepted, false);
});

test("tab switch is blocked while an overlay is open", () => {
  const runtime = new ReaderUIRuntime(spec);
  runtime.dispatch("overlay.sheet.open");
  assert.throws(
    () => runtime.dispatch("mainTab.select", { tab: "settings" }),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "OVERLAY_GUARD"
  );
  runtime.dispatch("overlay.sheet.close");
  runtime.dispatch("mainTab.select", { tab: "settings" });
  assert.equal(runtime.state.routeId, "settings");
});

test("directory close only clears the semantic directory overlay it opened", () => {
  const runtime = new ReaderUIRuntime(spec);
  runtime.dispatch("reader.directory.open");
  runtime.dispatch("reader.directory.close");
  assert.equal(runtime.state.overlay, null);

  runtime.dispatch("reader.directory.open");
  runtime.dispatch("overlay.sheet.open");
  runtime.dispatch("reader.directory.close");
  assert.equal(runtime.state.overlay, "sheet");
});

test("reader control and module actions atomically own one compatible overlay without route churn", () => {
  const runtime = activeReaderRuntime();
  const routeBefore = runtime.state.routeId;

  const opened = runtime.dispatch("reader.control.toggle", { overlay: "reader-control" });
  assert.equal(opened.state.overlay, "reader-control");
  assert.equal(opened.state.routeId, routeBefore);
  assert.deepEqual(opened.effects, []);

  runtime.dispatch("reader.module.switch", { module: "directory" });
  assert.equal(runtime.state.overlay, "directory");
  const repeated = structuredClone(runtime.state);
  runtime.dispatch("reader.module.switch", { module: "directory" });
  assert.deepEqual(runtime.state, repeated);

  runtime.dispatch("reader.module.switch", { module: "appearance" });
  assert.equal(runtime.state.overlay, "appearance");
  runtime.dispatch("reader.control.toggle", { overlay: "reader-control" });
  assert.equal(runtime.state.overlay, null);
  assert.equal(runtime.state.routeId, routeBefore);
});

test("reader control actions fail closed outside the reader overlay family", () => {
  const outsideReader = new ReaderUIRuntime(spec);
  assert.throws(
    () => outsideReader.dispatch("reader.control.toggle", { overlay: "reader-control" }),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "READER_ROUTE_GUARD"
  );

  const runtime = activeReaderRuntime();
  assert.throws(
    () => runtime.dispatch("reader.module.switch", { module: "tts" }),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "READER_CONTROL_OVERLAY_GUARD"
  );
  runtime.dispatch("overlay.dialog.open");
  assert.throws(
    () => runtime.dispatch("reader.control.toggle", { overlay: "reader-control" }),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "READER_CONTROL_OVERLAY_GUARD"
  );
  assert.throws(
    () => runtime.dispatch("reader.module.switch", { module: "search" }),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "INVALID_TYPED_PAYLOAD"
  );
});

test("reduced motion remains independent from pending page transactions", () => {
  const runtime = activeReaderRuntime();
  runtime.dispatch("reducedMotion.enable");
  runtime.dispatch("reader.page.next", {}, "page-motion");
  assert.equal(runtime.state.reducedMotion, true);
  assert.equal(runtime.state.readerPageIndex, 0);
});

test("runtime fails closed for unsupported events", () => {
  const runtime = new ReaderUIRuntime(spec);
  assert.throws(
    () => runtime.dispatch("unknown.event"),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "UNSUPPORTED_EVENT"
  );
});

test("W4 appearance transactions are Host-owned, CAS-versioned, and rehydrate after restart", () => {
  const runtime = new ReaderUIRuntime(spec);
  const theme = {
    id: "theme-paper",
    name: "Paper",
    colorScheme: "light",
    background: "#FFF8EE",
    foreground: "#2B241D",
    accent: "#8B5E34"
  };
  const start = runtime.dispatch("reader.theme.new", { theme }, "appearance-theme");
  assert.deepEqual(start.effects.map((effect) => [effect.kind, effect.type]), [["host", "persistence.get"]]);
  assert.deepEqual(start.effects[0].jsonPayload, { namespace: "reader-ui", key: "appearance.v1" });
  assert.equal(start.effects.some((effect) => effect.kind === "core"), false);

  assert.equal(runtime.acceptAppearanceHostResult("persistence.get", "stale", { found: false }).accepted, false);
  const loaded = runtime.acceptAppearanceHostResult("persistence.get", "appearance-theme", { found: false });
  assert.deepEqual(loaded.effects.map((effect) => effect.type), ["persistence.put"]);
  assert.equal(loaded.effects[0].jsonPayload.expectedRevision, "0");
  const persisted = JSON.parse(loaded.effects[0].jsonPayload.value);
  assert.equal(persisted.schemaVersion, 1);
  assert.equal(persisted.revision, 1);
  assert.equal(persisted.activeThemeId, "theme-paper");
  assert.deepEqual(persisted.themes, [theme]);

  const saved = runtime.acceptAppearanceHostResult("persistence.put", "appearance-theme", {
    stored: true,
    revision: "1"
  });
  assert.equal(saved.accepted, true);
  assert.equal(runtime.state.appearanceTransaction, null);
  assert.equal(runtime.state.appearancePreference.revision, 1);
  assert.equal(runtime.acceptAppearanceHostResult("persistence.put", "appearance-theme", {
    stored: true,
    revision: "1"
  }).accepted, false);

  const restart = runtime.dispatch("reader.config.restart.simulate", {}, "appearance-restart");
  assert.deepEqual(restart.effects.map((effect) => effect.type), ["persistence.get"]);
  runtime.acceptAppearanceHostResult("persistence.get", "appearance-restart", {
    found: true,
    value: JSON.stringify(persisted),
    revision: "1"
  });
  assert.deepEqual(runtime.state.appearancePreference, persisted);
});

test("W4 malformed loads and semantic conflicts terminate atomically and allow the next transaction", () => {
  const runtime = new ReaderUIRuntime(spec);
  runtime.dispatch("reader.config.restart.simulate", {}, "bad-load");
  const malformed = runtime.acceptAppearanceHostResult("persistence.get", "bad-load", {
    found: true,
    value: "{bad-json",
    revision: "1"
  });
  assert.equal(malformed.accepted, true);
  assert.equal(runtime.state.error, "INVALID_APPEARANCE_PREFERENCE");
  assert.equal(runtime.state.appearanceTransaction, null);

  const next = runtime.dispatch("reader.theme.new", {
    theme: {
      id: "theme-a", name: "A", colorScheme: "light",
      background: "#fff", foreground: "#111", accent: "#777"
    }
  }, "after-bad-load");
  assert.deepEqual(next.effects.map((effect) => effect.type), ["persistence.get"]);
  const duplicatePreference = {
    ...initialReaderUIState().appearancePreference,
    revision: 2,
    activeThemeId: "theme-a",
    themes: [
      { id: "theme-a", name: "A", colorScheme: "light", background: "#fff", foreground: "#111", accent: "#777" },
      { id: "theme-a", name: "B", colorScheme: "dark", background: "#000", foreground: "#eee", accent: "#999" }
    ]
  };
  const duplicate = runtime.acceptAppearanceHostResult("persistence.get", "after-bad-load", {
    found: true,
    value: JSON.stringify(duplicatePreference),
    revision: "2"
  });
  assert.equal(duplicate.accepted, true);
  assert.equal(runtime.state.error, "INVALID_APPEARANCE_PREFERENCE");
  assert.equal(runtime.state.appearanceTransaction, null);
  assert.doesNotThrow(() => runtime.dispatch("reader.config.restart.simulate", {}, "after-duplicate"));
});

test("W4 font registration trusts Host identity and compensates every post-register persistence failure", () => {
  const runtime = new ReaderUIRuntime(spec);
  const start = runtime.dispatch("reader.font.import", {
    fontId: "font-serif",
    path: "/picked/user-label.ttf",
    familyName: "Untrusted UI Label"
  }, "font-register");
  assert.deepEqual(start.effects.map((effect) => effect.type), ["font.registerFile"]);
  const registered = runtime.acceptAppearanceHostResult("font.registerFile", "font-register", {
    registered: true,
    path: "/sandbox/reader-serif.ttf",
    familyName: "Actual Reader Serif",
    fontNames: ["ReaderSerif-Regular"]
  });
  assert.deepEqual(registered.effects.map((effect) => effect.type), ["persistence.get"]);
  const failedLoad = runtime.failAppearanceHostResult("persistence.get", "font-register", "PERSISTENCE_READ_FAILED");
  assert.deepEqual(failedLoad.effects.map((effect) => effect.type), ["font.unregisterFile"]);
  assert.deepEqual(failedLoad.effects[0].jsonPayload, {
    path: "/sandbox/reader-serif.ttf",
    familyName: "Actual Reader Serif"
  });
  assert.equal(runtime.state.appearanceTransaction.stage, "rolling-back-font");
  const rollback = runtime.acceptAppearanceHostResult("font.unregisterFile", "font-register", {
    logicalUnregistered: true,
    physicallyUnregistered: false,
    restartRequired: true
  });
  assert.equal(rollback.accepted, true);
  assert.equal(runtime.state.appearanceTransaction, null);
  assert.equal(runtime.state.fontUnregisterRestartRequired, true);
  assert.doesNotThrow(() => runtime.dispatch("reader.config.restart.simulate", {}, "after-font-rollback"));

  const runtime2 = new ReaderUIRuntime(spec);
  runtime2.dispatch("reader.font.import", {
    fontId: "font-2", path: "/font-2.otf", familyName: "UI"
  }, "font-save-fail");
  runtime2.acceptAppearanceHostResult("font.registerFile", "font-save-fail", {
    registered: true, path: "/sandbox/font-2.otf", familyName: "Actual 2", fontNames: ["Actual2"]
  });
  runtime2.acceptAppearanceHostResult("persistence.get", "font-save-fail", { found: false });
  const compensation = runtime2.failAppearanceHostResult("persistence.put", "font-save-fail", "CAS_CONFLICT");
  assert.deepEqual(compensation.effects.map((effect) => effect.type), ["font.unregisterFile"]);
  const rollbackFailure = runtime2.failAppearanceHostResult(
    "font.unregisterFile", "font-save-fail", "FONT_ROLLBACK_FAILED"
  );
  assert.equal(rollbackFailure.accepted, true);
  assert.equal(runtime2.state.appearanceTransaction, null);
  assert.equal(runtime2.state.fontUnregisterRestartRequired, true);
  assert.equal(runtime2.state.appearanceReconcileRequired, true);

  const runtime3 = new ReaderUIRuntime(spec);
  runtime3.dispatch("reader.font.import", {
    fontId: "font-provisional",
    path: "/picked/provisional.ttf",
    familyName: "Requested Provisional Family"
  }, "font-malformed-result");
  const malformedRegistration = runtime3.acceptAppearanceHostResult(
    "font.registerFile",
    "font-malformed-result",
    { registered: true }
  );
  assert.deepEqual(malformedRegistration.effects.map((effect) => effect.type), ["font.unregisterFile"]);
  assert.deepEqual(malformedRegistration.effects[0].jsonPayload, {
    path: "/picked/provisional.ttf",
    familyName: "Requested Provisional Family"
  });
  assert.equal(runtime3.state.appearanceTransaction.stage, "rolling-back-font");
  runtime3.failAppearanceHostResult(
    "font.unregisterFile",
    "font-malformed-result",
    "PROVISIONAL_FONT_ROLLBACK_FAILED"
  );
  assert.equal(runtime3.state.appearanceTransaction, null);
  assert.equal(runtime3.state.fontUnregisterRestartRequired, true);
});

test("W4 font delete resolves the persisted path and preserves logical delete when physical unload fails", () => {
  const runtime = new ReaderUIRuntime(spec);
  const persisted = {
    ...initialReaderUIState().appearancePreference,
    revision: 4,
    typography: {
      ...initialReaderUIState().appearancePreference.typography,
      fontFamily: "Actual Family"
    },
    fonts: [{
      id: "font-real",
      path: "/sandbox/actual.ttf",
      familyName: "Actual Family",
      fontNames: ["Actual-Regular"],
      enabled: true
    }]
  };
  runtime.dispatch("reader.font.delete", { fontId: "font-real" }, "font-delete");
  const saving = runtime.acceptAppearanceHostResult("persistence.get", "font-delete", {
    found: true,
    value: JSON.stringify(persisted),
    revision: "4"
  });
  const nextValue = JSON.parse(saving.effects[0].jsonPayload.value);
  assert.deepEqual(nextValue.fonts, []);
  assert.equal(nextValue.typography.fontFamily, null);
  const unregistering = runtime.acceptAppearanceHostResult("persistence.put", "font-delete", {
    stored: true,
    revision: "5"
  });
  assert.deepEqual(unregistering.effects[0].jsonPayload, {
    path: "/sandbox/actual.ttf",
    familyName: "Actual Family"
  });
  const failure = runtime.failAppearanceHostResult(
    "font.unregisterFile", "font-delete", "PHYSICAL_UNREGISTER_FAILED"
  );
  assert.equal(failure.accepted, true);
  assert.deepEqual(runtime.state.appearancePreference.fonts, []);
  assert.equal(runtime.state.fontUnregisterRestartRequired, true);
  assert.equal(runtime.state.appearanceTransaction, null);
  assert.doesNotThrow(() => runtime.dispatch("reader.config.restart.simulate", {}, "after-delete-failure"));
});
