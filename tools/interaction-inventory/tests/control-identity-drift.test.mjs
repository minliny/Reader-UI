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
  NON_INTERACTIVE_CONTAINERS_PATH,
  CONTROL_ID_SCHEMA_VERSION,
  buildControlIdRegistry,
  buildScreenGraphBindingArtifacts,
  buildScreenGraphBindingIndex,
  buildControlIdForCandidate,
  buildNonInteractiveContainers,
  checkControlIdArtifactBytes,
  validateControlIdRegistry,
  deriveControlFamily,
  deriveControlRole,
  deriveSemanticSlug,
} from "../interaction-inventory-lib.mjs";
import {
  compileEntryValidator,
  validateEntries,
  validateEntry,
} from "../control-identity-schema-validator.mjs";

const INVENTORY_PATH = "docs/audits/ic0-2026-07-19/generated/interaction-control-inventory.json";
const inventory = JSON.parse(readFileSync(join(REPO_ROOT, INVENTORY_PATH), "utf8"));
const inventoryTotal = inventory.semanticControls.length + inventory.suspectedNonSemanticControls.length;

const persistedRegistry = JSON.parse(readFileSync(join(REPO_ROOT, CONTROL_ID_REGISTRY_PATH), "utf8"));
const persistedBinding = JSON.parse(readFileSync(join(REPO_ROOT, SCREENGRAPH_BINDING_PATH), "utf8"));
const persistedFigma = JSON.parse(readFileSync(join(REPO_ROOT, FIGMA_CROSSWALK_PENDING_PATH), "utf8"));
const persistedDom = JSON.parse(readFileSync(join(REPO_ROOT, DOM_IDENTITY_MAP_PATH), "utf8"));
const persistedNonInteractive = JSON.parse(readFileSync(join(REPO_ROOT, NON_INTERACTIVE_CONTAINERS_PATH), "utf8"));

// R1: ARIA container roles (group/section) are excluded from the canonical
// registry and recorded in nonInteractiveContainers.json. The IC0 inventory
// denominator decomposes as: semantic-controls (3752) + suspected (63, all
// group/section) = 3815. The canonical registry carries the 3752 interactive
// candidates; nonInteractiveContainers carries the 63 ARIA container records.
const expectedRegistryCount = inventory.semanticControls.length;
const expectedNonInteractiveCount = inventory.suspectedNonSemanticControls.length;

test("R1 denominator: registry + nonInteractiveContainers = IC0 inventory total", () => {
  assert.equal(persistedRegistry.entries.length, expectedRegistryCount);
  assert.equal(persistedNonInteractive.entries.length, expectedNonInteractiveCount);
  assert.equal(
    persistedRegistry.entries.length + persistedNonInteractive.entries.length,
    inventoryTotal,
  );
  assert.equal(persistedRegistry.totals.candidates, expectedRegistryCount);
  assert.equal(persistedRegistry.totals.nonInteractiveContainers, expectedNonInteractiveCount);
});

test("R1 registry covers every IC0 semantic control with zero missing", () => {
  assert.equal(persistedRegistry.entries.length, expectedRegistryCount);
  assert.equal(persistedRegistry.totals.semanticControls, inventory.semanticControls.length);
  assert.equal(persistedRegistry.totals.suspectedNonSemanticControls, 0);
});

test("R1 nonInteractiveContainers contains exactly the group/section candidates", () => {
  assert.equal(persistedNonInteractive.entries.length, expectedNonInteractiveCount);
  for (const entry of persistedNonInteractive.entries) {
    assert.ok(
      entry.role === "group" || entry.role === "section",
      `non-interactive entry has unexpected role: ${entry.role}`,
    );
    assert.equal(entry.exclusionReason, "aria-container-role");
  }
  const roleDist = persistedNonInteractive.totals.byRole;
  const roleSum = Object.values(roleDist).reduce((a, b) => a + b, 0);
  assert.equal(roleSum, expectedNonInteractiveCount);
});

test("R1 control identity produces zero duplicate controlIds", () => {
  const ids = persistedRegistry.entries.map((entry) => entry.controlId);
  const unique = new Set(ids);
  assert.equal(unique.size, ids.length, "duplicate controlIds detected");
  assert.equal(persistedRegistry.totals.uniqueControlIds, ids.length);
});

test("R1 control identity is reproducible from the same inventory input", () => {
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

test("R1 control identity artifacts are byte-stable against the persisted files", () => {
  assert.equal(checkControlIdArtifactBytes(), true);
});

test("R1 controlId format conforms to the canonical 5-to-7 atom logical pattern (no viewport)", () => {
  const atomPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  for (const entry of persistedRegistry.entries) {
    const atoms = entry.controlId.split(".");
    assert.ok(
      atoms.length >= 5 && atoms.length <= 7,
      `atom count out of range (expected 5-7, got ${atoms.length}): ${entry.controlId}`,
    );
    assert.ok(atomPattern.test(entry.domain), `bad domain atom: ${entry.domain}`);
    assert.ok(atomPattern.test(entry.family), `bad family atom: ${entry.family}`);
    assert.ok(atomPattern.test(entry.route), `bad route atom: ${entry.route}`);
    assert.ok(atomPattern.test(entry.state), `bad state atom: ${entry.state}`);
    assert.ok(atomPattern.test(entry.role), `bad role atom: ${entry.role}`);
    assert.ok(atomPattern.test(entry.discriminator), `bad discriminator atom: ${entry.discriminator}`);
    // R1: controlId prefix is domain.family.route.state.role (no viewport atom).
    const prefix = `${entry.domain}.${entry.family}.${entry.route}.${entry.state}.${entry.role}`;
    assert.ok(
      entry.controlId === prefix || entry.controlId.startsWith(`${prefix}.`),
      `controlId does not start with constructed prefix: ${entry.controlId}`,
    );
    // R1: viewport MUST NOT appear as an atom in controlId. The viewport value
    // is carried by the separate `viewport` field on the entry.
    const viewportAtoms = ["phone", "compact", "tablet", "fold"];
    const idAtoms = entry.controlId.split(".");
    for (const viewportAtom of viewportAtoms) {
      // The viewport atom is allowed to appear inside the discriminator slug
      // (e.g. "phone-mode-h-..."), but it MUST NOT be one of the positional
      // atoms 1-5 (domain/family/route/state/role).
      assert.notEqual(
        idAtoms[5],
        viewportAtom,
        `controlId has viewport atom at position 6 (should be discriminator or absent): ${entry.controlId}`,
      );
    }
  }
});

test("R1 controlId derivation is deterministic per candidate input", () => {
  const sample = inventory.semanticControls.slice(0, 50)
    .map((c) => ({ ...c, semanticStatus: "semantic-control" }));
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

test("R1 ScreenGraph binding covers all registry candidates with bound / unresolved / pending-figma-join buckets", () => {
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

test("R1 ScreenGraph binding is reproducible from the same inputs", () => {
  const rebuilt = buildScreenGraphBindingArtifacts();
  assert.equal(rebuilt.entries.length, persistedBinding.entries.length);
  assert.equal(rebuilt.totals.bound, persistedBinding.totals.bound);
  assert.equal(rebuilt.totals.unresolved, persistedBinding.totals.unresolved);
  assert.equal(rebuilt.totals.pendingFigmaJoin, persistedBinding.totals.pendingFigmaJoin);
  const persistedBound = persistedBinding.entries.filter((e) => e.bindingStatus === "bound").map((e) => e.controlId).sort();
  const rebuiltBound = rebuilt.entries.filter((e) => e.bindingStatus === "bound").map((e) => e.controlId).sort();
  assert.deepEqual(persistedBound, rebuiltBound);
});

test("R1 ScreenGraph component index covers every route/variant case", () => {
  const index = buildScreenGraphBindingIndex();
  assert.ok(index.components.length > 0);
  for (const comp of index.components) {
    assert.ok(comp.routeId);
    assert.ok(comp.variantId);
    assert.ok(comp.componentType);
    assert.ok(comp.componentInstanceId);
  }
});

test("R1 Figma crosswalk is fully pending; no forged Figma node bindings", () => {
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

test("R1 DOM identity map has one entry per candidate with stable selector hash", () => {
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

test("R1 DOM selector uniqueness within each (routeId, variantId) case", () => {
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

test("R1 ajv schema validation: all registry entries pass real JSON Schema validation", () => {
  // Real ajv validation (draft 2020-12) against contracts/control-identity.schema.json.
  // This replaces the previous "A2 schema shape" hand-rolled check that only
  // verified required-field presence and silently allowed extra fields.
  const result = validateEntries(persistedRegistry.entries);
  assert.equal(result.valid, true, `ajv validation failed: ${result.invalidCount} invalid entries`);
  assert.equal(result.invalidCount, 0);
  assert.equal(result.errors.length, 0);
  assert.equal(result.firstInvalidEntry, null);
});

test("R1 ajv negative: extra field is rejected by additionalProperties:false", () => {
  const base = persistedRegistry.entries[0];
  const entryWithExtra = {
    ...base,
    unexpectedField: "should-be-rejected",
  };
  const result = validateEntry(entryWithExtra);
  assert.equal(result.valid, false, "entry with extra field must be rejected");
  assert.ok(result.errors.length > 0, "ajv must report at least one error");
  const hasAdditionalPropertiesError = result.errors.some(
    (e) => e.keyword === "additionalProperties",
  );
  assert.ok(
    hasAdditionalPropertiesError,
    `expected an additionalProperties error, got: ${JSON.stringify(result.errors)}`,
  );
});

test("R1 ajv negative: role not in enum is rejected", () => {
  const base = persistedRegistry.entries[0];
  // group/section are ARIA container roles intentionally excluded from the
  // canonical registry. Injecting one into a registry entry must fail.
  const entryWithBadRole = {
    ...base,
    role: "group",
  };
  const result = validateEntry(entryWithBadRole);
  assert.equal(result.valid, false, "entry with role=group must be rejected");
  const hasEnumError = result.errors.some((e) => e.keyword === "enum");
  assert.ok(
    hasEnumError,
    `expected an enum error, got: ${JSON.stringify(result.errors)}`,
  );
});

test("R1 ajv negative: controlId pattern mismatch is rejected", () => {
  const base = persistedRegistry.entries[0];
  // Uppercase atoms violate the kebab-case-lower pattern.
  const entryWithBadControlId = {
    ...base,
    controlId: "Library.Button.Bookshelf.Default.Button.bad-pattern-h-12345678",
  };
  const result = validateEntry(entryWithBadControlId);
  assert.equal(result.valid, false, "entry with bad controlId pattern must be rejected");
  const hasPatternError = result.errors.some((e) => e.keyword === "pattern");
  assert.ok(
    hasPatternError,
    `expected a pattern error, got: ${JSON.stringify(result.errors)}`,
  );
});

test("R1 ajv negative: missing required field is rejected", () => {
  const base = persistedRegistry.entries[0];
  const { controlId, ...entryWithoutControlId } = base;
  const result = validateEntry(entryWithoutControlId);
  assert.equal(result.valid, false, "entry missing controlId must be rejected");
  const hasRequiredError = result.errors.some((e) => e.keyword === "required");
  assert.ok(
    hasRequiredError,
    `expected a required error, got: ${JSON.stringify(result.errors)}`,
  );
});

test("R1 no per-entry firstMaterializedAt or schemaVersion (R1 removes both)", () => {
  for (const entry of persistedRegistry.entries) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(entry, "firstMaterializedAt"),
      false,
      `entry ${entry.controlId} still carries firstMaterializedAt`,
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(entry, "schemaVersion"),
      false,
      `entry ${entry.controlId} still carries per-entry schemaVersion`,
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(entry, "nonInteractiveContainer"),
      true,
      `entry ${entry.controlId} missing nonInteractiveContainer marker`,
    );
    assert.equal(entry.nonInteractiveContainer, null);
  }
  // schemaVersion lives on the registry top-level object only.
  assert.equal(persistedRegistry.schemaVersion, CONTROL_ID_SCHEMA_VERSION);
});

test("R1 mapping status buckets sum to total candidate count", () => {
  const totals = persistedRegistry.totals;
  const sum = totals.autoMapped + totals.needsManualMapping + totals.ambiguousNeedsReview;
  assert.equal(sum, totals.candidates);
  // R1: after excluding 63 group/section, needsManualMapping should be 0
  // because all 63 needs-manual candidates were ARIA containers.
  assert.equal(totals.needsManualMapping, 0);
  for (const entry of persistedRegistry.entries) {
    if (entry.mappingStatus === "auto-mapped") {
      const hasUiEvent = entry.source.uiEvent !== null;
      const isBound = entry.screenGraphBinding.bindingStatus === "bound";
      assert.ok(hasUiEvent || isBound, `auto-mapped entry lacks both UiEvent and binding: ${entry.controlId}`);
    }
  }
});

test("R1 registry totals match the persisted binding totals", () => {
  assert.equal(persistedRegistry.totals.pendingFigmaJoin, persistedRegistry.entries.length);
  assert.equal(persistedBinding.totals.totalControls, persistedRegistry.entries.length);
});

test("R1 codegen artifacts are byte-stable and match the registry input", () => {
  execSync("node tools/interaction-inventory/codegen-control-ids.mjs --check", {
    cwd: REPO_ROOT,
    stdio: "pipe",
  });
});

test("R1 ajv validator compiles the schema with strict mode (no schema errors)", () => {
  // Smoke test: compiling the schema with strict mode must not throw.
  const validate = compileEntryValidator();
  assert.equal(typeof validate, "function");
  // The validate function carries the compiled schema; calling it on a
  // well-formed entry returns true.
  const ok = validate(persistedRegistry.entries[0]);
  assert.equal(ok, true);
  if (!ok) {
    console.error(JSON.stringify(validate.errors, null, 2));
  }
});

test("R1 nonInteractiveContainers is byte-stable and reproducible", () => {
  const rebuilt = buildNonInteractiveContainers();
  assert.equal(rebuilt.entries.length, persistedNonInteractive.entries.length);
  assert.deepEqual(rebuilt.totals, persistedNonInteractive.totals);
  for (let i = 0; i < rebuilt.entries.length; i += 1) {
    assert.equal(rebuilt.entries[i].candidateKey, persistedNonInteractive.entries[i].candidateKey);
    assert.equal(rebuilt.entries[i].role, persistedNonInteractive.entries[i].role);
    assert.equal(rebuilt.entries[i].exclusionReason, "aria-container-role");
  }
});
