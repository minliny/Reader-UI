import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const handoffDir = path.join(repoRoot, "docs", "design", "handoffs", "reader-runtime", "reading-surface");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function handoffHash() {
  const entries = [];
  function walk(directory) {
    for (const item of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const fullPath = path.join(directory, item.name);
      if (item.isDirectory()) {
        walk(fullPath);
      } else if (item.isFile() && item.name !== "LOCAL_READY_FOR_FIGMA.json") {
        const relative = path.relative(handoffDir, fullPath);
        const hash = crypto.createHash("sha256").update(fs.readFileSync(fullPath)).digest("hex");
        entries.push(`${relative}:${hash}`);
      }
    }
  }
  walk(handoffDir);
  return `sha256:${crypto.createHash("sha256").update(entries.join("\n")).digest("hex")}`;
}

test("B3 releases only reader.reading-surface at the Reader-UI source and leaves HarmonyOS fail-closed", () => {
  const registry = readJson("docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json");
  const quarantine = readJson("contracts/fixtures/route-reconstruction-quarantine.fixtures.json");
  const handoff = readJson("docs/design/handoffs/reader-runtime/reading-surface/LOCAL_READY_FOR_FIGMA.json");
  const officialRevision = readJson("docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json");
  const ledger = readJson("docs/design/PROMOTION_LEDGER.json");
  const generatedQuarantine = fs.readFileSync(path.join(repoRoot, "generated", "arkts", "RouteReconstructionQuarantine.ets"), "utf8");

  const record = registry.records.find((item) => item.id === "reader.reading-surface");
  assert.ok(record, "reader.reading-surface must remain registered");
  assert.equal(record.local?.status, "implementation-ready");
  assert.equal(record.harmony?.status, "candidate-backport", "B3 must not consume or activate HarmonyOS");

  const surfaceEntry = quarantine.entries.find((entry) => entry.recordId === "reader.reading-surface");
  assert.ok(surfaceEntry, "reader.reading-surface source extraction entry is required");
  assert.equal(surfaceEntry.status, "released");
  assert.deepEqual(surfaceEntry.routeIds, record.routeIds);
  assert.equal(quarantine.entries.filter((entry) => entry.status === "released").length, 1,
    "B3 may release only the completed reading surface record");
  assert.equal(quarantine.entries.filter((entry) => entry.status === "active").length, 6,
    "all sibling Reader records must remain source-quarantined");
  assert.match(generatedQuarantine, /RELEASED_RECORD_IDS: string\[\] = \["reader\.reading-surface"\]/);
  for (const routeId of record.routeIds) {
    assert.doesNotMatch(generatedQuarantine, new RegExp(`^  static readonly ROUTE_IDS: string\\[\\] = \\[[^\\]]*"${routeId}"`, "m"),
      `${routeId} must not remain in the active source quarantine list`);
  }

  assert.equal(handoff.status, "LOCAL_READY_FOR_FIGMA_R3a_COMPLETE");
  assert.equal(handoff.admission?.localReadyForFigma, true);
  assert.deepEqual(handoff.admission?.recordIds, ["reader.reading-surface"]);
  assert.equal(handoff.localSource?.implementationCommit, handoff.admission?.exactLocalCommit);
  assert.equal(handoff.sourceEvidenceHash, handoffHash(), "B3 must bind the exact B2 handoff directory");
  assert.equal(handoff.figma?.registeredRevision, officialRevision.currentRevision);
  assert.equal(record.figma?.revision, officialRevision.currentRevision);
  assert.equal(ledger.entries.some((entry) => entry.recordId === "reader.reading-surface"), false,
    "B3 must not write a promotion ledger entry before B4");

  const implementationCommit = handoff.localSource.implementationCommit;
  assert.equal(spawnSync("git", ["cat-file", "-e", `${implementationCommit}^{commit}`], { cwd: repoRoot }).status, 0,
    "B3 must name a real implementation commit, never a placeholder");
  assert.equal(spawnSync("git", ["merge-base", "--is-ancestor", implementationCommit, "HEAD"], { cwd: repoRoot }).status, 0,
    "the implementation commit must be part of the current main lineage");
  for (const sourceFile of [
    "frontend-demo-optimized/render-runtime.js",
    "docs/design/handoffs/reader-runtime/reading-surface/B2_READER_UI_SOURCE_CONVERSION.json"
  ]) {
    assert.equal(spawnSync("git", ["cat-file", "-e", `${implementationCommit}:${sourceFile}`], { cwd: repoRoot }).status, 0,
      `implementation commit must contain ${sourceFile}`);
  }
});
