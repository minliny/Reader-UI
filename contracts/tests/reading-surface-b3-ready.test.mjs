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

// The 13 legacy reader control/module routes retired by A2 strict physical
// removal (MAJOR). They span the 6 sibling records whose Figma-backed native
// conversion has not landed; their routeIds are cleared (not tombstoned) so the
// registry validator cannot admit a phantom route.
const RETIRED_ROUTES = [
  "control-layer-base-v2", "reader-directory-overlay-v2", "reader-appearance-overlay-v2",
  "reader-tts-overlay-v2", "reader-settings-overlay-v2", "reader-auto-scroll-overlay-v2",
  "reader-search-overlay-v2", "reader-replace-overlay-v2",
  "toc-bookmarks", "tts", "reader-appearance", "reader-settings", "content-search",
];

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

test("B3 releases fresh reader.reading-surface source evidence while preserving the withdrawn B4 history", () => {
  const registry = readJson("docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json");
  const routeSchema = readJson("contracts/route.schema.json");
  const quarantine = readJson("contracts/fixtures/route-reconstruction-quarantine.fixtures.json");
  const handoff = readJson("docs/design/handoffs/reader-runtime/reading-surface/LOCAL_READY_FOR_FIGMA.json");
  const officialRevision = readJson("docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json");
  const ledger = readJson("docs/design/PROMOTION_LEDGER.json");
  const generatedQuarantine = fs.readFileSync(path.join(repoRoot, "generated", "arkts", "RouteReconstructionQuarantine.ets"), "utf8");

  // A2 strict physical removal: the 13 legacy routes are gone from the schema enum.
  const enumRoutes = new Set(routeSchema.properties.id.enum);
  for (const routeId of RETIRED_ROUTES) {
    assert.ok(!enumRoutes.has(routeId), `${routeId} must be physically retired from route.schema.json`);
  }
  assert.equal(enumRoutes.size, routeSchema.properties.id.enum.length, "route enum must be de-duplicated");
  assert.equal(registry.routeInventory.expectedRouteCount, enumRoutes.size,
    "routeInventory.expectedRouteCount must match the post-removal schema enum");

  // The 6 sibling records that owned the 13 routes keep their identity + Figma
  // binding + harmony targets, but their routeIds are cleared pending their own
  // source conversion. They must not be deleted (breaks registry binding) and
  // must not keep retired routeIds (validator line 158 rejects unknown routes).
  const siblingRecordIds = ["reader.control-home", "reader.module.directory", "reader.module.tts",
    "reader.module.appearance", "reader.module.settings", "reader.quick.content-search"];
  for (const id of siblingRecordIds) {
    const sibling = registry.records.find((r) => r.id === id);
    assert.ok(sibling, `${id} record must remain registered pending its own conversion`);
    assert.deepEqual(sibling.routeIds, [], `${id} must not keep retired routeIds`);
    assert.equal(sibling.reconstruction?.status, "pending-source-conversion",
      `${id} must record why its routeIds are empty`);
    assert.equal(sibling.harmony?.status, "candidate-backport",
      `${id} must remain fail-closed, not silently promotable`);
  }

  // B3: reader.reading-surface source release is intact and Figma-bound, but B4
  // has been retracted - harmony is candidate-backport, not implementation-ready.
  const record = registry.records.find((item) => item.id === "reader.reading-surface");
  assert.ok(record, "reader.reading-surface must remain registered");
  assert.deepEqual(record.routeIds, ["immersive-reading", "reader", "reader_content"],
    "the 3 canonical reading routes are the legitimate surface, never retired");
  assert.equal(record.local?.status, "implementation-ready");
  assert.equal(record.harmony?.status, "candidate-backport",
    "B4 must not consume or activate HarmonyOS; the premature promotion is retracted");

  const surfaceEntry = quarantine.entries.find((entry) => entry.recordId === "reader.reading-surface");
  assert.ok(surfaceEntry, "reader.reading-surface source extraction entry is required");
  assert.equal(surfaceEntry.status, "released");
  assert.deepEqual(surfaceEntry.routeIds, record.routeIds);
  assert.equal(quarantine.entries.filter((entry) => entry.status === "released").length, 1,
    "B3 may release only the completed reading surface record");
  assert.equal(quarantine.entries.filter((entry) => entry.status === "active").length, 0,
    "the 6 sibling source quarantines are retired because their 13 routes are physically removed");

  // The generated native quarantine reflects the removal: reading-surface stays
  // released, the active ROUTE_IDS list is empty.
  assert.match(generatedQuarantine, /RELEASED_RECORD_IDS: string\[\] = \["reader\.reading-surface"\]/);
  assert.match(generatedQuarantine, /ROUTE_IDS: string\[\] = \[\]/);
  for (const routeId of RETIRED_ROUTES) {
    assert.ok(!generatedQuarantine.includes(`"${routeId}"`),
      `${routeId} must not survive in the generated native quarantine`);
  }

  // B3 evidence packet is internally consistent and Figma-revision-bound...
  assert.equal(handoff.status, "LOCAL_READY_FOR_FIGMA_R3a_COMPLETE");
  assert.equal(handoff.admission?.localReadyForFigma, true);
  assert.deepEqual(handoff.admission?.recordIds, ["reader.reading-surface"]);
  assert.equal(handoff.localSource?.implementationCommit, handoff.admission?.exactLocalCommit);
  assert.equal(handoff.sourceEvidenceHash, handoffHash(), "B3 must bind the exact B2 handoff directory");
  assert.equal(handoff.figma?.registeredRevision, officialRevision.currentRevision);
  assert.equal(record.figma?.revision, officialRevision.currentRevision);

  // The historical promotion and retraction are immutable. The current B3
  // packet must be fresh relative to the exact evidence that retract-002
  // withdrew; rewriting promote-001/retract-002 to match a later packet would
  // falsify the append-only ledger and make promote-family's freshness gate
  // reject the new packet.
  const rsEntries = ledger.entries.filter((e) => e.recordId === "reader.reading-surface");
  assert.ok(rsEntries.length >= 2, "promote-001 and retract-002 must both be preserved");
  const promote = rsEntries.find((e) => e.entryId === "promote-001");
  const retract = rsEntries.find((e) => e.entryId === "retract-002");
  assert.ok(promote && retract, "the premature promotion and its atomic reversal must both exist");
  assert.equal(promote.newHarmonyStatus, "implementation-ready");
  assert.equal(retract.newHarmonyStatus, "candidate-backport");
  assert.equal(retract.reversalOf, promote.entryHash, "retract must chain to the promotion it reverses");
  assert.equal(promote.localReadyForFigma.sourceEvidenceHash,
    "sha256:a32a6bd5b9343489ab6f050cdac0749db6ecaa2741e894fac26f11b8e01eb852",
    "promote-001 must retain the exact historical source hash");
  assert.equal(promote.localReadyForFigma.implementationCommit,
    "a37b5fc9a758be09f30555730ddacc41c463a55a",
    "promote-001 must retain the exact historical implementation commit");
  assert.equal(retract.retractedPromotion.sourceEvidenceHash, promote.localReadyForFigma.sourceEvidenceHash,
    "retract-002 must preserve the source hash it actually withdrew");
  assert.equal(retract.retractedPromotion.implementationCommit, promote.localReadyForFigma.implementationCommit,
    "retract-002 must preserve the implementation commit it actually withdrew");
  assert.notEqual(handoff.sourceEvidenceHash, retract.retractedPromotion.sourceEvidenceHash,
    "the new B3 source hash must differ from the withdrawn packet");
  assert.notEqual(handoff.localSource.implementationCommit, retract.retractedPromotion.implementationCommit,
    "the new B3 implementation commit must differ from the withdrawn commit");
  assert.equal(rsEntries[rsEntries.length - 1].entryId, retract.entryId,
    "the retract must be the latest ledger entry for the reading surface");

  // The new implementation commit is a real ancestor and contains the exact
  // source files named by the B3 packet.
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

test("B3 contracts keep the released reading surface separate from retired controls and generic states", () => {
  const viewStates = readJson("contracts/fixtures/view-state.fixtures.json");
  const surfaceRoutes = new Set(["immersive-reading", "reader", "reader_content"]);
  const entries = viewStates.filter((entry) => surfaceRoutes.has(entry.routeId));

  assert.equal(entries.length, 5, "the three admitted routes retain their declared default/loading/offline states");
  for (const entry of entries) {
    assert.deepEqual(entry.components.map((component) => component.type), ["ReaderBase"],
      `${entry.routeId}/${entry.pageState} must not revive a sibling reader control or generic state`);
    assert.equal(entry.components[0].props.surfaceContract, "canonical-reading-surface");
    assert.equal(entry.components[0].props.theme, "paper");
  }

  // No retired route may retain a view-state entry (9 were removed).
  const retiredRoutes = new Set(RETIRED_ROUTES);
  assert.equal(viewStates.filter((e) => retiredRoutes.has(e.routeId)).length, 0,
    "retired routes must not keep view-state entries");
});
