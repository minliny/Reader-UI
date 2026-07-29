import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const deltaPath = path.join(
  repoRoot,
  "docs",
  "design",
  "handoffs",
  "reader-runtime",
  "reading-surface",
  "A2_CONTRACT_RETIREMENT_DELTA.json",
);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function assertCountDelta(change, label) {
  assert.equal(change.after - change.before, change.delta, `${label} delta must be arithmetic truth`);
}

test("A2 retirement delta is the sole non-visual authorization for the 285 to 272 downstream baseline", () => {
  const delta = JSON.parse(fs.readFileSync(deltaPath, "utf8"));

  assert.equal(delta.schemaVersion, "1.0.0");
  assert.equal(delta.kind, "A2_CONTRACT_RETIREMENT_DELTA");
  assert.equal(delta.deltaId, "reader.reading-surface.a2-contract-retirement.1b81644");
  assert.equal(delta.status, "approved-source-retirement");
  assert.equal(delta.validationStatus, "harmony-screen-graph-and-static-pass-execution-gate-blocked");
  assert.equal(delta.recordId, "reader.reading-surface");
  assert.equal(delta.implementationCommit, "1b81644b322c3305723d5291af2ada6b235778aa");
  assert.equal(delta.classification.visualChange, false);
  assert.equal(delta.classification.figmaDesignDelta, false);
  assert.equal(delta.authority.authorizationMode, "exact-values-only");
  assert.equal(delta.authority.downstreamRepository, "Reader-for-HarmonyOS");
  assert.equal(delta.authority.downstreamConsumer, "scripts/sync_reader_ui_screen_graph.mjs");
  assert.match(delta.authority.rule, /only the exact after-values/);
  assert.ok(delta.authority.doesNotAuthorize.includes("harmony.status promotion"));
  assert.ok(delta.authority.doesNotAuthorize.includes("Figma mutation"));

  const floor = delta.coverage.qualityBaseline.faithfulInstanceFloor;
  assert.deepEqual(floor, { before: 285, after: 272, delta: -13 });
  assert.equal(delta.coverageBefore.faithfulInstanceFloor, floor.before);
  assert.equal(delta.coverageAfter.faithfulInstanceFloor, floor.after);
  const partialCeiling = delta.coverage.qualityBaseline.partialInstanceCeiling;
  assert.deepEqual(partialCeiling, { before: 52, after: 45, delta: -7 });
  assert.equal(delta.coverageBefore.partialInstanceCeiling, partialCeiling.before);
  assert.equal(delta.coverageAfter.partialInstanceCeiling, partialCeiling.after);
  assert.deepEqual(delta.coverage.qualityBaseline.partialInstanceComposition, {
    before: {
      ReaderBase: 49,
      SearchInputBox: 2,
      BookshelfEmptyPage: 1,
      total: 52,
    },
    after: {
      ReaderBase: 42,
      SearchInputBox: 2,
      BookshelfEmptyPage: 1,
      total: 45,
    },
    rule: "The partial ceiling is the exact sum of ReaderBase, SearchInputBox, and BookshelfEmptyPage instances. It may decrease only through an approved source delta and must not admit a partial-instance rebound.",
  });
  assertCountDelta(partialCeiling, "partialInstanceCeiling");
  assert.equal(
    delta.retirement.routeCount,
    floor.before - floor.after,
    "the baseline reduction must be exactly the 13 physically retired routes",
  );

  const visualDeltas = readJson("contracts/fixtures/design-delta.fixtures.json");
  assert.equal(
    visualDeltas.some((entry) => entry.designDeltaId === delta.deltaId),
    false,
    "a non-visual contract retirement must not masquerade as a Figma Design Delta",
  );

  const commitCheck = spawnSync("git", ["cat-file", "-e", `${delta.implementationCommit}^{commit}`], {
    cwd: repoRoot,
  });
  assert.equal(commitCheck.status, 0, "A2 delta must bind a real implementation commit");
  const ancestryCheck = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", delta.implementationCommit, "HEAD"],
    { cwd: repoRoot },
  );
  assert.equal(ancestryCheck.status, 0, "A2 implementation commit must be in the current candidate lineage");
});

test("A2 retirement delta exactly matches the current Reader-UI route, component, host, and state denominators", () => {
  const delta = JSON.parse(fs.readFileSync(deltaPath, "utf8"));
  const routeSchema = readJson("contracts/route.schema.json");
  const viewStates = readJson("contracts/fixtures/view-state.fixtures.json");
  const coverage = readJson("generated/screen-graph-coverage.json");
  const reachability = readJson(
    "docs/audits/reader-reading-surface-historical-reachability-2026-07-27.json",
  );

  const retiredRoutes = delta.retirement.retiredRouteIds;
  assert.deepEqual(delta.retiredRouteIds, retiredRoutes);
  assert.equal(retiredRoutes.length, 13);
  assert.equal(new Set(retiredRoutes).size, 13);
  assert.equal(delta.retirement.routeCount, 13);
  for (const routeId of retiredRoutes) {
    assert.equal(routeSchema.properties.id.enum.includes(routeId), false, `${routeId} must be absent from route schema`);
    assert.equal(viewStates.some((entry) => entry.routeId === routeId), false, `${routeId} must have no view-state fixture`);
  }
  for (const routeId of delta.retirement.canonicalReadingRoutesRetained) {
    assert.equal(routeSchema.properties.id.enum.includes(routeId), true, `${routeId} canonical route must remain`);
  }

  assert.deepEqual(delta.reachability, {
    historicalImplementationCount: 23,
    unreachableFromReaderBase: 23,
    globallyUnreachable: 21,
    retainedSharedConsumers: [
      {
        symbol: "ReaderControlSheet",
        consumer: "SourceSwitchFlowPage",
        routes: [
          "source-switch",
          "source-switch-results",
          "source-switch-empty",
          "source-switch-error",
          "source-switch-timeout",
          "source-switch-loading",
          "source-switch-rollback",
          "source-switch-preview",
        ],
        policy: "Retire only the obsolete ViewStateRenderer ReaderControlSheet branch; do not delete the shared Source Switch implementation.",
      },
      {
        symbol: "ReaderAutoScrollPanel",
        consumer: "auto-page",
        routes: ["auto-page"],
        policy: "Retain the canonical auto-page component and dispatch; retirement applies only to reader-auto-scroll-overlay-v2.",
      },
    ],
  });
  assert.deepEqual(reachability.counts, {
    total: 23,
    unreachableFromReaderBase: 23,
    fullyUnreachable: 21,
    unreachableFromReaderBaseButRetained: 2,
    reachableFromReaderBase: 0,
  });
  const retainedReachability = reachability.historicalImplementations
    .filter((entry) => entry.fullyUnreachable === false)
    .map((entry) => [entry.symbol, entry.reachableViaConsumer]);
  assert.deepEqual(retainedReachability, [
    ["ReaderControlSheet", "SourceSwitchFlowPage"],
    ["ReaderAutoScrollPanel", "ViewStateRenderer"],
  ]);

  assert.equal(routeSchema.properties.id.enum.length, delta.retirement.routeSchema.after);
  assert.equal(viewStates.length, delta.retirement.viewStateFixtures.after);
  assert.equal(coverage.variants, delta.retirement.variants.after);
  for (const [label, change] of Object.entries({
    routeSchema: delta.retirement.routeSchema,
    viewStateFixtures: delta.retirement.viewStateFixtures,
    variants: delta.retirement.variants,
  })) {
    assertCountDelta(change, label);
  }

  const evidenceByType = new Map(coverage.componentFixtureEvidence.map((entry) => [entry.type, entry]));
  const partialComposition = delta.coverage.qualityBaseline.partialInstanceComposition.after;
  const currentPartialInstances = ["ReaderBase", "SearchInputBox", "BookshelfEmptyPage"]
    .reduce((total, type) => total + evidenceByType.get(type).instanceCount, 0);
  assert.equal(currentPartialInstances, partialComposition.total);
  assert.equal(currentPartialInstances, delta.coverage.qualityBaseline.partialInstanceCeiling.after);
  for (const type of ["ReaderBase", "SearchInputBox", "BookshelfEmptyPage"]) {
    assert.equal(evidenceByType.get(type).instanceCount, partialComposition[type]);
  }
  for (const split of delta.componentSplit) {
    const retired = evidenceByType.get(split.retiredReadingSurfaceType);
    const retained = evidenceByType.get(split.retainedSharedPrimitive);
    assert.ok(retired, `${split.retiredReadingSurfaceType} must remain an explicit retirement identity`);
    assert.ok(retained, `${split.retainedSharedPrimitive} shared primitive must exist`);
    assert.equal(retired.catalogStatus, split.retiredTypeStatus);
    assert.equal(retired.instanceCount, split.retiredTypeFixtureCount);
    assert.equal(retained.catalogStatus, "referenced");
    assert.equal(retained.instanceCount, split.retainedPrimitiveInstanceCount);
  }

  const screenGraphChanges = delta.coverage.screenGraph;
  assert.equal(coverage.componentInstances, screenGraphChanges.componentInstances.after);
  assert.equal(coverage.canonicalComponentTypes, screenGraphChanges.canonicalComponentTypes.after);
  assert.equal(coverage.referencedComponentTypes, screenGraphChanges.referencedComponentTypes.after);
  assert.equal(coverage.explicitGapComponentTypes, screenGraphChanges.explicitGapComponentTypes.after);
  assert.deepEqual(coverage.componentFixtureEvidenceSummary, {
    "data-backed": screenGraphChanges.fixtureEvidenceClasses.dataBacked.after,
    "explicit-gap": screenGraphChanges.fixtureEvidenceClasses.explicitGap.after,
    "type-only": screenGraphChanges.fixtureEvidenceClasses.typeOnly.after,
    partial: screenGraphChanges.fixtureEvidenceClasses.partial.after,
  });

  for (const [type, change] of Object.entries(delta.coverage.hostCompositeInstanceCounts)) {
    assert.equal(evidenceByType.get(type)?.instanceCount, change.after, `${type} host denominator must match`);
    assert.equal(delta.coverageBefore[type], change.before, `${type} top-level before value must match`);
    assert.equal(delta.coverageAfter[type], change.after, `${type} top-level after value must match`);
    assertCountDelta(change, `hostCompositeInstanceCounts.${type}`);
  }

  for (const [type, denominator] of Object.entries(delta.coverage.stateComponentDenominators)) {
    const evidence = evidenceByType.get(type);
    assert.equal(evidence?.instanceCount, denominator.instanceCount.after, `${type} instance denominator must match`);
    assert.equal(evidence?.stateEventEvidence, denominator.stateEventEvidence.after, `${type} state evidence must match`);
    if (type === "Loading" || type === "Offline") {
      assert.equal(delta.coverageBefore[type], denominator.instanceCount.before, `${type} top-level before value must match`);
      assert.equal(delta.coverageAfter[type], denominator.instanceCount.after, `${type} top-level after value must match`);
    }
    assertCountDelta(denominator.instanceCount, `stateComponentDenominators.${type}.instanceCount`);
    assertCountDelta(denominator.stateEventEvidence, `stateComponentDenominators.${type}.stateEventEvidence`);
  }

  const readerBase = evidenceByType.get("ReaderBase");
  assert.equal(readerBase.instanceCount, delta.coverage.readerBaseOwnership.instanceCount.after);
  assert.ok(readerBase.propKeys.includes("surfaceContract"));
  assert.deepEqual(delta.coverage.readerBaseOwnership.propKeysAdded, ["surfaceContract"]);
  assert.equal(
    delta.coverageBefore.readerBaseEmptySignature,
    delta.coverage.readerBaseOwnership.emptyPropsSignatureCount.before,
  );
  assert.equal(
    delta.coverageAfter.readerBaseEmptySignature,
    delta.coverage.readerBaseOwnership.emptyPropsSignatureCount.after,
  );
  assert.equal(delta.coverageBefore.readerBasePropKeys.includes("surfaceContract"), false);
  assert.equal(delta.coverageAfter.readerBasePropKeys.includes("surfaceContract"), true);

  for (const change of [
    screenGraphChanges.componentInstances,
    screenGraphChanges.canonicalComponentTypes,
    screenGraphChanges.referencedComponentTypes,
    screenGraphChanges.explicitGapComponentTypes,
    ...Object.values(screenGraphChanges.fixtureEvidenceClasses),
    delta.coverage.readerBaseOwnership.instanceCount,
    delta.coverage.readerBaseOwnership.emptyPropsSignatureCount,
  ]) {
    assertCountDelta(change, "coverage change");
  }
});

test("A2 reachability regression: the live route content-replacement is never bound to the retired demo renderer readerReplaceOverlayV2Screen", () => {
  // Regression guard for the entry-#23 misclassification corrected on 2026-07-28.
  // The w5 INTEGRATION_MAP once bound the SURVIVING route `content-replacement`
  // to `readerReplaceOverlayV2Screen`, which falsified that demo renderer's
  // `fullyUnreachable: true` claim in the historical-reachability evidence.
  // The live route must dispatch to the L2 replace-rules overlay
  // `contentReplacementScreen`, and `readerReplaceOverlayV2Screen` may be bound
  // only to routes that are absent from the canonical RouteId enum (retired).
  const routeSchema = readJson("contracts/route.schema.json");
  const liveRouteIds = routeSchema.properties.id.enum;

  const w5Source = fs.readFileSync(
    path.join(repoRoot, "frontend-demo-optimized/renderers/w5-replace-rules-renderers.js"),
    "utf8",
  );
  const sandbox = {
    window: { ReaderW5ReplaceRulesRenderers: {} },
    document: {},
    Math, JSON, Date, parseInt, parseFloat, isNaN, isFinite,
    String, Number, Boolean, Array, Object,
  };
  vm.createContext(sandbox);
  vm.runInContext(w5Source, sandbox, { filename: "w5-replace-rules-renderers.js" });
  const integrationMap = sandbox.window.ReaderW5ReplaceRulesRenderers.INTEGRATION_MAP;
  assert.ok(integrationMap, "w5 must export INTEGRATION_MAP");

  // The surviving route content-replacement must NOT dispatch to the retired demo renderer.
  assert.notEqual(
    integrationMap["content-replacement"],
    "readerReplaceOverlayV2Screen",
    "the live route content-replacement must not be bound to the retired demo renderer readerReplaceOverlayV2Screen",
  );
  // It must dispatch to the L2 replace-rules overlay declared by the w5 file header.
  assert.equal(
    integrationMap["content-replacement"],
    "contentReplacementScreen",
    "content-replacement must dispatch to contentReplacementScreen",
  );
  // content-replacement is a surviving canonical route.
  assert.equal(
    liveRouteIds.includes("content-replacement"),
    true,
    "content-replacement must remain in the canonical RouteId enum",
  );

  // Every route that still binds readerReplaceOverlayV2Screen must be retired
  // (absent from the canonical enum); otherwise the demo renderer is reachable
  // from a surviving route and its fullyUnreachable claim is false.
  const routesBoundToRetiredRenderer = Object.entries(integrationMap)
    .filter(([, renderer]) => renderer === "readerReplaceOverlayV2Screen")
    .map(([routeId]) => routeId);
  assert.ok(
    routesBoundToRetiredRenderer.length > 0,
    "readerReplaceOverlayV2Screen must remain bound to its retired route for the historical demo surface",
  );
  for (const routeId of routesBoundToRetiredRenderer) {
    assert.equal(
      liveRouteIds.includes(routeId),
      false,
      `readerReplaceOverlayV2Screen is bound to ${routeId}, which must be absent from the canonical RouteId enum (retired)`,
    );
  }
});

test("A2 retirement delta records exact HarmonyOS pass/fail-closed results without claiming release-lock or promotion", () => {
  const delta = JSON.parse(fs.readFileSync(deltaPath, "utf8"));
  assert.equal(delta.status, "approved-source-retirement");
  assert.equal(delta.validationStatus, "harmony-screen-graph-and-static-pass-execution-gate-blocked");
  assert.equal(delta.evidence.harmonyValidation.status, "blocked-fail-closed");

  const accepted = delta.evidence.harmonyValidation.acceptedResults;
  assert.deepEqual(accepted.map((result) => result.command), [
    "npm run gen:contracts",
    "node scripts/sync_reader_ui_screen_graph.mjs --check",
    "node scripts/enforce-implementation-ready-gate.mjs",
    "node scripts/test_contracts.mjs",
  ]);
  const screenGraph = accepted[1];
  assert.deepEqual(screenGraph.screenGraph, { routes: 247, variants: 183, components: 580 });
  assert.deepEqual(screenGraph.coverage, {
    faithful: 67,
    generic: 55,
    partial: 3,
    insufficient: 0,
    unbound: 4,
  });
  assert.deepEqual(screenGraph.instances, {
    faithful: 272,
    generic: 216,
    partial: 45,
    insufficient: 0,
    unbound: 14,
  });
  assert.equal(screenGraph.retiredRuntimeInstances, 33);
  assert.deepEqual(accepted[2], {
    command: "node scripts/enforce-implementation-ready-gate.mjs",
    status: "blocked-fail-closed",
    reasonCode: "READER_UI_DEPENDENCY_DOCUMENT_UNCOMMITTED_OR_DIRTY",
  });
  assert.equal(accepted[3].tests, 55);
  assert.equal(accepted[3].passed, 55);
  assert.equal(accepted[3].failed, 0);
  assert.deepEqual(delta.evidence.harmonyValidation.machineReceipt, {
    status: "missing",
    promotionAuthority: false,
  });

  const releaseGate = delta.evidence.harmonyValidation.remainingNonA2Gate;
  assert.equal(releaseGate.status, "blocked");
  assert.equal(releaseGate.consumerReleaseSourceSha, "33d5352ee589ccf988852a111309414afc1d7d49");
  assert.equal(releaseGate.currentReaderUiHead, "85eda9b4ca1a254d769ba9c62aa4ccdd20c47d02");
  assert.equal(releaseGate.notClaimedPassed, true);
  assert.ok(delta.authority.doesNotAuthorize.includes("harmony.status promotion"));
});
