import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function sha256File(relativePath) {
  return `sha256:${crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(ROOT, relativePath)))
    .digest("hex")}`;
}

function sameSet(left, right) {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

const dependencies = readJson("docs/design/FIGMA_VISUAL_ADMISSION_DEPENDENCIES.json");
const ledger = readJson("docs/design/PROMOTION_LEDGER.json");
const registry = readJson("docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json");
const revision = readJson("docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json")
  .currentRevision;
const latestLedgerByRecord = new Map();
for (const entry of ledger.entries) latestLedgerByRecord.set(entry.recordId, entry);

test("native A2 closure index exactly covers every current implementation-ready B3 record set", () => {
  assert.equal(dependencies.schemaVersion, "1.1.0");
  assert.ok(Array.isArray(dependencies.nativeA2ConsumerClosures));

  const readyRecords = registry.records.filter(
    (record) => record.harmony?.status === "implementation-ready",
  );
  assert.equal(readyRecords.length, 7);

  const indexedRecords = dependencies.nativeA2ConsumerClosures.flatMap(
    (closure) => closure.recordIds,
  );
  assert.equal(new Set(indexedRecords).size, indexedRecords.length);
  assert.ok(
    sameSet(
      new Set(indexedRecords),
      new Set(readyRecords.map((record) => record.id)),
    ),
  );
});

for (const closure of dependencies.nativeA2ConsumerClosures) {
  test(`native consumer receipts preserve immutable lineage for ${closure.recordIds[0]}`, () => {
    assert.ok(!closure.prePromotionReceipt.includes("/handoffs/"));
    assert.ok(!closure.postPromotionReceipt.includes("/handoffs/"));

    const pre = readJson(closure.prePromotionReceipt);
    const post = readJson(closure.postPromotionReceipt);
    const b3 = readJson(pre.sourceEvidence.b3PacketPath);

    assert.equal(pre.kind, "A2_PRE_PROMOTION_CONSUMER_RECEIPT");
    assert.equal(pre.status, "a2-consumer-closed");
    assert.equal(pre.ordering.mode, "historical-bootstrap");
    assert.equal(pre.figmaRevision, revision);
    assert.ok(sameSet(new Set(pre.recordIds), new Set(closure.recordIds)));
    assert.equal(
      pre.sourceEvidence.b2ImplementationCommit,
      b3.localSource.implementationCommit,
    );
    assert.equal(
      pre.sourceEvidence.sourceEvidenceHash,
      b3.sourceEvidenceHash,
    );
    assert.equal(
      pre.sourceEvidence.b3PacketSha256,
      sha256File(pre.sourceEvidence.b3PacketPath),
    );
    assert.equal(
      pre.sourceEvidence.a2DeltaSha256,
      sha256File(pre.sourceEvidence.a2DeltaPath),
    );

    const activeEntries = new Map(
      pre.ordering.activePromotionEntries.map((entry) => [entry.recordId, entry]),
    );
    for (const recordId of closure.recordIds) {
      const latest = latestLedgerByRecord.get(recordId);
      const declared = activeEntries.get(recordId);
      assert.ok(latest);
      assert.equal(latest.kind ?? "promote", "promote");
      assert.equal(declared.entryId, latest.entryId);
      assert.equal(declared.entryHash, latest.entryHash);
    }

    assert.equal(post.kind, "B4_B5_POST_PROMOTION_CONSUMPTION_RECEIPT");
    assert.equal(post.status, "visual-admission-consumed");
    assert.equal(post.scope.fullB5ReleaseLockClaimed, false);
    assert.equal(post.prePromotionReceipt.path, closure.prePromotionReceipt);
    assert.equal(
      post.prePromotionReceipt.sha256,
      sha256File(closure.prePromotionReceipt),
    );
    assert.ok(sameSet(new Set(post.recordIds), new Set(closure.recordIds)));
    assert.deepEqual(new Set(post.explicitlyPending), new Set([
      "runtimeReleaseLock",
      "B6VirtualMachineCurrentReleaseEvidence",
      "B7DeviceMotionMachineReceiptReleaseIdentity",
    ]));
  });
}

test("reader A2 pending wording remains an immutable B3-time snapshot", () => {
  const delta = readJson(
    "docs/design/handoffs/reader-runtime/reading-surface/A2_CONTRACT_RETIREMENT_DELTA.json",
  );
  const b3 = readJson(
    "docs/design/handoffs/reader-runtime/reading-surface/LOCAL_READY_FOR_FIGMA.json",
  );
  assert.equal(
    delta.currentClosure.harmonyConsumer.status,
    "pending-independent-clean-commit",
  );
  assert.equal(
    b3.verification.harmonyA2Consumer.status,
    "pending-independent-clean-commit",
  );
  assert.equal(b3.verification.harmonyA2Consumer.notClaimedByB3, true);
});
