import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

test("visual admission dependency graph binds Source Switch to both reader prerequisites", () => {
  const dependencies = readJson("docs/design/FIGMA_VISUAL_ADMISSION_DEPENDENCIES.json");
  const registry = readJson("docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json");

  assert.equal(dependencies.schemaVersion, "1.1.0");
  assert.equal(dependencies.kind, "FIGMA_VISUAL_ADMISSION_DEPENDENCIES");
  assert.deepEqual(
    dependencies.nativeA2ConsumerClosures.map((closure) => closure.recordIds),
    [
      ["reader.reading-surface"],
      [
        "bookshelf.page",
        "bookshelf.book-card",
        "bookshelf.action-sheet",
        "bookshelf.multi-select",
        "bookshelf.local-import-dialog",
        "bookshelf.list-mode",
      ],
      ["reader.control-home"],
    ],
  );
  for (const closure of dependencies.nativeA2ConsumerClosures) {
    assert.match(
      closure.prePromotionReceipt,
      /^docs\/design\/native-consumer-receipts\/.+\/A2_PRE_PROMOTION_CONSUMER_RECEIPT\.json$/,
    );
    assert.match(
      closure.postPromotionReceipt,
      /^docs\/design\/native-consumer-receipts\/.+\/B4_B5_POST_PROMOTION_CONSUMPTION_RECEIPT\.json$/,
    );
  }
  assert.equal(dependencies.dependencies.length, 1);

  const sourceSwitch = dependencies.dependencies[0];
  assert.equal(sourceSwitch.recordId, "source-switch.window");
  assert.deepEqual(
    sourceSwitch.requires,
    [
      {
        recordId: "reader.reading-surface",
        localStatus: "implementation-ready",
        harmonyStatus: "implementation-ready",
      },
      {
        recordId: "reader.control-home",
        localStatus: "implementation-ready",
        harmonyStatus: "implementation-ready",
      },
    ],
  );

  const registryIds = new Set(registry.records.map((record) => record.id));
  assert.ok(registryIds.has(sourceSwitch.recordId));
  for (const requirement of sourceSwitch.requires) {
    assert.ok(registryIds.has(requirement.recordId), `${requirement.recordId} must remain a real registry record`);
  }
});

test("reading-surface admission pins runtime generator provenance and the non-shrinkable Core source set", () => {
  const dependencies = readJson("docs/design/FIGMA_VISUAL_ADMISSION_DEPENDENCIES.json");
  const runtime = dependencies.sourceAuthorities.find(
    (entry) => entry.recordId === "reader.reading-surface",
  )?.runtimeContract;
  assert.ok(runtime);
  assert.deepEqual(runtime.inputs, [
    "tools/runtime/generate-runtime.mjs",
    "tools/runtime/check-runtime-payload-source.mjs",
    "ui-spec/runtime-actions.json",
    "ui-spec/runtime-payload-contracts.json",
    "contracts/fixtures/runtime-payload-contract.fixtures.json",
    "contracts/fixtures/runtime-result-contract.fixtures.json",
  ]);
  assert.equal(runtime.generatedOutputs.length, 13);
  const runtimePayloads = readJson("ui-spec/runtime-payload-contracts.json");
  assert.equal(runtime.externalSourceRepository, "Reader-Core-Native");
  assert.equal(runtime.externalSourceCommit, runtimePayloads.sourceOfTruth.commit);
  assert.equal(runtime.externalSourceTree, runtimePayloads.sourceOfTruth.tree);
  assert.match(runtime.externalSourceCommit, /^[0-9a-f]{40}$/);
  assert.match(runtime.externalSourceTree, /^[0-9a-f]{40}$/);
  assert.deepEqual(
    runtime.externalSources.map((source) => source.path),
    [
      "crates/reader-contract/src/reader_ui.rs",
      "crates/reader-contract/src/remote.rs",
      "crates/reader-sync/src/lib.rs",
      "crates/reader-storage/src/lib.rs",
    ],
  );
  assert.deepEqual(runtime.prePromotionChecks, [
    "node tools/runtime/check-runtime-payload-source.mjs",
    "node tools/runtime/generate-runtime.mjs --check",
  ]);
});
