import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

import {
  REPO_ROOT,
  CONTROL_ID_REGISTRY_PATH,
  SCREENGRAPH_BINDING_PATH,
  FIGMA_CROSSWALK_PENDING_PATH,
  DOM_IDENTITY_MAP_PATH,
  CONTROL_ID_SCHEMA_VERSION,
  buildControlIdRegistry,
  buildScreenGraphBindingArtifacts,
  buildScreenGraphBindingIndex,
  buildControlIdForCandidate,
  checkControlIdArtifactBytes,
  validateControlIdRegistry,
  deriveControlFamily,
  deriveControlRole,
  deriveSemanticSlug,
} from "../interaction-inventory-lib.mjs";

const INVENTORY_PATH = "docs/audits/ic0-2026-07-19/generated/interaction-control-inventory.json";
const inventory = JSON.parse(readFileSync(join(REPO_ROOT, INVENTORY_PATH), "utf8"));
const expectedCandidateCount = inventory.semanticControls.length + inventory.suspectedNonSemanticControls.length;

const persistedRegistry = JSON.parse(readFileSync(join(REPO_ROOT, CONTROL_ID_REGISTRY_PATH), "utf8"));
const persistedBinding = JSON.parse(readFileSync(join(REPO_ROOT, SCREENGRAPH_BINDING_PATH), "utf8"));
const persistedFigma = JSON.parse(readFileSync(join(REPO_ROOT, FIGMA_CROSSWALK_PENDING_PATH), "utf8"));
const persistedDom = JSON.parse(readFileSync(join(REPO_ROOT, DOM_IDENTITY_MAP_PATH), "utf8"));

test("A2 control identity covers every IC0 candidate with zero missing", () => {
  assert.equal(persistedRegistry.entries.length, expectedCandidateCount);
  assert.equal(persistedRegistry.totals.candidates, expectedCandidateCount);
  assert.equal(persistedRegistry.totals.semanticControls, inventory.semanticControls.length);
  assert.equal(persistedRegistry.totals.suspectedNonSemanticControls, inventory.suspectedNonSemanticControls.length);
});

test("A2 control identity produces zero duplicate controlIds", () => {
  const ids = persistedRegistry.entries.map((entry) => entry.controlId);
  const unique = new Set(ids);
  assert.equal(unique.size, ids.length, "duplicate controlIds detected");
  assert.equal(persistedRegistry.totals.uniqueControlIds, ids.length);
});

test("A2 control identity is reproducible from the same inventory input", () => {
  const rebuilt = buildControlIdRegistry();
  assert.equal(rebuilt.entries.length, persistedRegistry.entries.length);
  for (let index = 0; index < persistedRegistry.entries.length; index += 1) {
    assert.equal(
      rebuilt.entries[index].controlId,
      persistedRegistry.entries[index].controlId,
      `controlId drift at index ${index}`,
    );
  }
  const report = validateControlIdRegistry(persistedRegistry);
  assert.equal(report.valid, true);
  assert.equal(report.errors.length, 0);
});

test("A2 control identity artifacts are byte-stable against the persisted files", () => {
  assert.equal(checkControlIdArtifactBytes(), true);
});

test("A2 controlId format conforms to the canonical 6-to-8 atom pattern", () => {
  const atomPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  for (const entry of persistedRegistry.entries) {
    const atoms = entry.controlId.split(".");
    assert.ok(atoms.length >= 6 && atoms.length <= 8, `atom count out of range: ${entry.controlId}`);
    assert.ok(atomPattern.test(entry.domain), `bad domain atom: ${entry.domain}`);
    assert.ok(atomPattern.test(entry.family), `bad family atom: ${entry.family}`);
    assert.ok(atomPattern.test(entry.route), `bad route atom: ${entry.route}`);
    assert.ok(atomPattern.test(entry.state), `bad state atom: ${entry.state}`);
    assert.ok(atomPattern.test(entry.viewport), `bad viewport atom: ${entry.viewport}`);
    assert.ok(atomPattern.test(entry.role), `bad role atom: ${entry.role}`);
    assert.ok(atomPattern.test(entry.discriminator), `bad discriminator atom: ${entry.discriminator}`);
    const prefix = `${entry.domain}.${entry.family}.${entry.route}.${entry.state}.${entry.viewport}.${entry.role}`;
    assert.ok(
      entry.controlId === prefix || entry.controlId.startsWith(`${prefix}.`),
      `controlId does not start with constructed prefix: ${entry.controlId}`,
    );
  }
});

test("A2 controlId derivation is deterministic per candidate input", () => {
  const sample = inventory.semanticControls.slice(0, 50)
    .map((c) => ({ ...c, semanticStatus: "semantic-control" }))
    .concat(inventory.suspectedNonSemanticControls.slice(0, 10).map((c) => ({ ...c, semanticStatus: "suspected-nonsemantic-control" })));
  for (const candidate of sample) {
    const derived = buildControlIdForCandidate(candidate, "phone");
    assert.equal(typeof derived.controlId, "string");
    assert.ok(derived.controlId.length > 0);
    assert.equal(derived.domain, candidate.runtimeFamily);
    assert.equal(derived.viewport, "phone");
    assert.equal(derived.role, deriveControlRole(candidate));
    assert.equal(derived.family, deriveControlFamily(candidate));
    assert.equal(derived.slug, deriveSemanticSlug(candidate));
    assert.match(derived.hash, /^[a-f0-9]{8}$/);
    const persisted = persistedRegistry.entries.find((entry) => entry.source.candidateKey === candidate.candidateKey);
    assert.ok(persisted, `missing persisted entry for candidate ${candidate.candidateKey}`);
    assert.equal(persisted.controlId, derived.controlId);
  }
});

test("A2 ScreenGraph binding covers all candidates with bound / unresolved / pending-figma-join buckets", () => {
  assert.equal(persistedBinding.entries.length, persistedRegistry.entries.length);
  const buckets = new Set(persistedBinding.entries.map((e) => e.bindingStatus));
  assert.deepEqual(
    [...buckets].sort(),
    ["bound", "pending-figma-join", "unresolved"].sort(),
  );
  assert.equal(
    persistedBinding.totals.bound + persistedBinding.totals.unresolved + persistedBinding.totals.pendingFigmaJoin,
    persistedBinding.totals.totalControls,
  );
  for (const entry of persistedBinding.entries) {
    if (entry.bindingStatus === "bound") {
      assert.ok(entry.componentInstanceId, `bound entry missing componentInstanceId: ${entry.controlId}`);
      assert.ok(entry.componentType, `bound entry missing componentType: ${entry.controlId}`);
    } else {
      assert.equal(entry.componentInstanceId, null);
      assert.equal(entry.componentType, null);
    }
  }
});

test("A2 ScreenGraph binding is reproducible from the same inputs", () => {
  const rebuilt = buildScreenGraphBindingArtifacts();
  assert.equal(rebuilt.entries.length, persistedBinding.entries.length);
  assert.equal(rebuilt.totals.bound, persistedBinding.totals.bound);
  assert.equal(rebuilt.totals.unresolved, persistedBinding.totals.unresolved);
  assert.equal(rebuilt.totals.pendingFigmaJoin, persistedBinding.totals.pendingFigmaJoin);
  const persistedBound = persistedBinding.entries.filter((e) => e.bindingStatus === "bound").map((e) => e.controlId).sort();
  const rebuiltBound = rebuilt.entries.filter((e) => e.bindingStatus === "bound").map((e) => e.controlId).sort();
  assert.deepEqual(persistedBound, rebuiltBound);
});

test("A2 ScreenGraph component index covers every route/variant case", () => {
  const index = buildScreenGraphBindingIndex();
  assert.ok(index.components.length > 0);
  for (const comp of index.components) {
    assert.ok(comp.routeId);
    assert.ok(comp.variantId);
    assert.ok(comp.componentType);
    assert.ok(comp.componentInstanceId);
  }
});

test("A2 Figma crosswalk is fully pending; no forged Figma node bindings", () => {
  assert.equal(persistedFigma.totalPending, persistedRegistry.entries.length);
  assert.equal(persistedFigma.entries.length, persistedRegistry.entries.length);
  for (const entry of persistedFigma.entries) {
    assert.equal(entry.figmaNodeCandidate, null);
    assert.equal(entry.figmaJoinStatus, "pending-figma-join");
    assert.equal(entry.status, "pending-figma-join");
  }
  for (const entry of persistedRegistry.entries) {
    assert.equal(entry.figmaNodeCandidate, null);
    assert.equal(entry.figmaJoinStatus, "pending-figma-join");
  }
});

test("A2 DOM identity map has one entry per candidate with stable selector hash", () => {
  assert.equal(persistedDom.entries.length, persistedRegistry.entries.length);
  const registryByControlId = new Map(persistedRegistry.entries.map((e) => [e.controlId, e]));
  for (const entry of persistedDom.entries) {
    const registryEntry = registryByControlId.get(entry.controlId);
    assert.ok(registryEntry, `dom entry missing from registry: ${entry.controlId}`);
    assert.equal(entry.selectorSha256, registryEntry.source.selectorSha256);
    assert.equal(entry.dataControlId, entry.controlId);
  }
  const selectorHashes = persistedDom.entries.map((e) => e.selectorSha256);
  assert.ok(new Set(selectorHashes).size > 0);
});

test("A2 DOM selector uniqueness within each (routeId, variantId) case", () => {
  const byCase = new Map();
  for (const c of inventory.semanticControls.concat(inventory.suspectedNonSemanticControls)) {
    const key = `${c.routeId}/${c.variantId}`;
    if (!byCase.has(key)) byCase.set(key, []);
    byCase.get(key).push(c.selector);
  }
  for (const [caseKey, selectors] of byCase) {
    const unique = new Set(selectors);
    assert.equal(unique.size, selectors.length, `duplicate selector within case ${caseKey}`);
  }
});

test("A2 schema shape: every registry entry has all required fields", () => {
  const required = [
    "controlId", "domain", "family", "route", "state", "viewport", "role",
    "discriminator", "source", "mappingStatus", "screenGraphBinding",
    "figmaNodeCandidate", "figmaJoinStatus", "firstMaterializedAt", "schemaVersion",
  ];
  for (const entry of persistedRegistry.entries) {
    for (const field of required) {
      assert.ok(Object.hasOwn(entry, field), `entry ${entry.controlId} missing ${field}`);
    }
    assert.equal(entry.schemaVersion, CONTROL_ID_SCHEMA_VERSION);
    assert.ok(Object.hasOwn(entry.source, "candidateKey"));
    assert.ok(Object.hasOwn(entry.source, "selectorSha256"));
    assert.ok(Object.hasOwn(entry.source, "semanticStatus"));
    assert.ok(Object.hasOwn(entry.screenGraphBinding, "componentInstanceId"));
    assert.ok(Object.hasOwn(entry.screenGraphBinding, "componentType"));
    assert.ok(Object.hasOwn(entry.screenGraphBinding, "bindingStatus"));
  }
});

test("A2 mapping status buckets sum to total candidate count", () => {
  const totals = persistedRegistry.totals;
  const sum = totals.autoMapped + totals.needsManualMapping + totals.ambiguousNeedsReview;
  assert.equal(sum, totals.candidates);
  for (const entry of persistedRegistry.entries) {
    if (entry.source.semanticStatus === "suspected-nonsemantic-control") {
      assert.equal(entry.mappingStatus, "needs-manual-mapping");
    }
  }
  for (const entry of persistedRegistry.entries) {
    if (entry.mappingStatus === "auto-mapped") {
      const hasUiEvent = entry.source.uiEvent !== null;
      const isBound = entry.screenGraphBinding.bindingStatus === "bound";
      assert.ok(hasUiEvent || isBound, `auto-mapped entry lacks both UiEvent and binding: ${entry.controlId}`);
    }
  }
});

test("A2 registry totals match the persisted binding totals", () => {
  assert.equal(persistedRegistry.totals.pendingFigmaJoin, persistedRegistry.entries.length);
  assert.equal(persistedBinding.totals.totalControls, persistedRegistry.entries.length);
});

test("A2 codegen artifacts are byte-stable and match the registry input", () => {
  execSync("node tools/interaction-inventory/codegen-control-ids.mjs --check", {
    cwd: REPO_ROOT,
    stdio: "pipe",
  });
});
