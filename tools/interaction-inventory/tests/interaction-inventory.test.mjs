import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  accessibleNameForNode,
  buildInteractionInventoryArtifacts,
  buildRenderCases,
  checkInteractionInventoryArtifactBytes,
  INTERACTION_COVERAGE_PATH,
  INTERACTION_INVENTORY_PATH,
  normalizeCanonicalMotionIds,
  parseHtmlFragment,
  semanticRoleForNode,
} from "../interaction-inventory-lib.mjs";
import {
  buildScreenGraphArtifacts,
  loadScreenGraphInputs,
} from "../../screen-graph/screen-graph-lib.mjs";

const inputs = loadScreenGraphInputs();
const graph = buildScreenGraphArtifacts(inputs).graph;
const artifacts = buildInteractionInventoryArtifacts();
const canonicalEvents = new Set(inputs.uiEventSchema.properties.type.enum);
const canonicalMotionIds = new Set(
  JSON.parse(readFileSync(new URL("../../../contracts/motion.schema.json", import.meta.url), "utf8")).properties.id.enum,
);

test("IC0 enumerates every direct variant and every alias case", () => {
  const cases = buildRenderCases(graph);
  assert.equal(cases.length, 266);
  assert.equal(artifacts.coverage.routeCases, 266);
  assert.equal(artifacts.coverage.directVariantCases, 190);
  assert.equal(artifacts.coverage.aliasCases, 76);
  assert.equal(new Set(cases.map((item) => `${item.routeId}/${item.variant.variantId}`)).size, cases.length);
});

test("IC0 keeps the semantic denominator separate from suspected non-semantic controls", () => {
  // A1 (R2a): settings-general segment buttons now carry data-control-key, so
  // IC0 promotes 3 segment <button> elements from suspected-non-semantic
  // containers to semantic controls. The denominator grows from 3752 to 3755.
  assert.equal(artifacts.coverage.semanticControls, 3755);
  assert.equal(artifacts.inventory.semanticControls.length, 3755);
  assert.equal(
    artifacts.coverage.suspectedNonSemanticControls,
    artifacts.inventory.suspectedNonSemanticControls.length,
  );
  assert.ok(artifacts.coverage.suspectedNonSemanticControls > 0);
  assert.deepEqual(artifacts.coverage.semanticControlCoverage.byTag, {
    article: 389,
    button: 3279,
    i: 28,
    input: 47,
    select: 11,
    textarea: 1,
  });
});

test("IC0 records required fields without inventing a canonical control id", () => {
  const requiredKeys = [
    "routeId", "resolvedRouteId", "aliasFor", "runtimeFamily", "variantId", "pageState",
    "componentType", "componentInstanceId", "domTag", "role", "label", "selector",
    "dataAttributes", "uiEvent", "rawMotionHints", "canonicalMotionIds", "joinStatus", "gapCodes",
  ];
  const allCandidates = artifacts.inventory.semanticControls.concat(artifacts.inventory.suspectedNonSemanticControls);
  for (const control of allCandidates) {
    for (const key of requiredKeys) assert.ok(Object.hasOwn(control, key), `missing ${key}`);
    assert.equal(Object.hasOwn(control, "controlId"), false);
    assert.equal(control.componentType, null);
    assert.equal(control.componentInstanceId, null);
    assert.equal(control.joinStatus, "unjoined-no-stable-key");
    assert.match(control.candidateKey, /^candidate:[a-f0-9]{20}$/);
    assert.equal(control.candidateKeyStatus, "noncanonical-audit-candidate");
    if (control.uiEvent !== null) assert.equal(canonicalEvents.has(control.uiEvent), true, control.uiEvent);
  }
  assert.equal(new Set(allCandidates.map((control) => control.candidateKey)).size, allCandidates.length);
  assert.equal(artifacts.inventory.identityBoundary.canonicalControlIdAvailable, false);
  assert.equal(artifacts.coverage.semanticControlCoverage.canonicalControlIds, 0);
  assert.equal(artifacts.coverage.semanticControlCoverage.joinedControls, 0);
  assert.equal(artifacts.coverage.semanticControlCoverage.unjoinedControls, 3755);
});

test("IC0 accessible names resolve references and labels without treating ordinary input values as names", () => {
  const root = parseHtmlFragment(`
    <section>
      <span id="search-name">搜索书籍</span>
      <input id="search" type="search" value="private-query" aria-labelledby="search-name">
      <label>启用动态效果 <input id="motion" type="checkbox" value="on"></label>
      <label for="query">查询词</label><input id="query" type="text" value="private-value">
      <input id="orphan" type="text" value="must-not-be-a-name">
    </section>
  `);
  const section = root.children[0];
  const search = section.children[1];
  const wrapped = section.children[2].children[0];
  const query = section.children[4];
  const orphan = section.children[5];
  assert.equal(accessibleNameForNode(search, root), "搜索书籍");
  assert.equal(semanticRoleForNode(search), "searchbox");
  assert.equal(accessibleNameForNode(wrapped, root), "启用动态效果");
  assert.equal(accessibleNameForNode(query, root), "查询词");
  assert.equal(accessibleNameForNode(orphan, root), "");
});

test("IC0 preserves interleaved text order and does not reuse a wrapping label across multiple controls", () => {
  const root = parseHtmlFragment(`
    <section>
      <label>纹理强度（<button type="button">0.000</button>）</label>
      <label><span>纹理</span><button type="button">纯色</button><button type="button">纸纹</button></label>
    </section>
  `);
  const section = root.children[0];
  const strength = section.children[0].children[0];
  const solid = section.children[1].children[1];
  const paper = section.children[1].children[2];
  assert.equal(accessibleNameForNode(strength, root), "纹理强度（0.000）");
  assert.equal(accessibleNameForNode(solid, root), "纯色");
  assert.equal(accessibleNameForNode(paper, root), "纸纹");
});

test("IC0 normalizes runtime motion aliases and slash compounds to the canonical MotionId enum", () => {
  const rawGroups = [
    ["app.route.push", { uiEvent: "route.push" }, ["app.route.push.forward"]],
    ["app.route.pop", { uiEvent: "route.pop" }, ["app.route.pop.backward"]],
    ["card.press/select/route", {}, ["card.press", "card.route", "card.select"]],
    ["overlay.sheet.enter/exit", {}, ["overlay.sheet.enter-exit"]],
    ["overlay.dialog.enter/exit", {}, ["overlay.dialog.enter-exit"]],
    ["slider.drag.start/update/release", {}, ["slider.drag.release", "slider.drag.start", "slider.drag.update"]],
    ["stepper.press/value.change", {}, ["stepper.press", "stepper.value.change"]],
    ["reader.session.capsule.enter/update/exit", {}, [
      "reader.session.capsule.enter", "reader.session.capsule.exit", "reader.session.capsule.update",
    ]],
    ["reader.sourceSwitch.open/close", {}, ["reader.sourceSwitch.open-close"]],
  ];
  for (const [raw, context, expected] of rawGroups) {
    assert.deepEqual(normalizeCanonicalMotionIds([raw], canonicalMotionIds, context), expected, raw);
  }
  for (const control of artifacts.inventory.semanticControls.concat(artifacts.inventory.suspectedNonSemanticControls)) {
    for (const motionId of control.canonicalMotionIds) {
      assert.equal(canonicalMotionIds.has(motionId), true, motionId);
    }
  }
  const unresolvedFallbacks = artifacts.inventory.semanticControls.filter(
    (control) => control.rawMotionHints.includes("listRow.press"),
  );
  assert.ok(unresolvedFallbacks.length > 0);
  assert.equal(unresolvedFallbacks.every((control) => control.canonicalMotionIds.length === 0), true);
  assert.equal(
    unresolvedFallbacks.every((control) => control.gapCodes.includes("IC0_CANONICAL_MOTION_ID_UNRESOLVED")),
    true,
  );
  assert.equal(artifacts.coverage.motionNormalization.slashCompoundBindingOccurrences, 8);
  assert.equal(artifacts.coverage.motionNormalization.unresolvedBindingOccurrences, 0);
  assert.equal(
    artifacts.coverage.motionNormalization.bindings.every(
      (binding) => binding.canonicalMotionIds.every((motionId) => canonicalMotionIds.has(motionId)),
    ),
    true,
  );
});

test("IC0 route motion normalization follows route push, pop, and replace control context", () => {
  const controls = artifacts.inventory.semanticControls.concat(artifacts.inventory.suspectedNonSemanticControls);
  const routeReplaceAttributes = controls.filter(
    (control) => Object.hasOwn(control.dataAttributes, "data-route-replace"),
  );
  const routeReplaceEvents = controls.filter((control) => control.uiEvent === "route.replace");
  assert.equal(routeReplaceAttributes.length, 117);
  assert.equal(routeReplaceEvents.length, 133);
  assert.equal(
    routeReplaceEvents.every((control) => control.canonicalMotionIds.includes("app.route.replace")),
    true,
  );
  assert.equal(
    routeReplaceEvents.filter((control) => control.canonicalMotionIds.includes("app.route.push.forward")).length,
    0,
  );
  assert.equal(
    routeReplaceAttributes.filter((control) => control.canonicalMotionIds.includes("app.route.push.forward")).length,
    0,
  );

  for (const control of controls) {
    if (control.canonicalMotionIds.includes("app.route.replace")) {
      assert.equal(
        control.uiEvent === "route.replace" || Object.hasOwn(control.dataAttributes, "data-route-replace"),
        true,
        control.selector,
      );
    }
    if (control.canonicalMotionIds.includes("app.route.push.forward")) {
      assert.equal(
        control.uiEvent === "route.push"
          || (Object.hasOwn(control.dataAttributes, "data-route")
            && !Object.hasOwn(control.dataAttributes, "data-route-replace")),
        true,
        control.selector,
      );
    }
    if (control.canonicalMotionIds.includes("app.route.pop.backward")) {
      assert.equal(
        control.uiEvent === "route.pop"
          || ["data-route-back", "data-demo-back", "data-reader-exit"]
            .some((attribute) => Object.hasOwn(control.dataAttributes, attribute)),
        true,
        control.selector,
      );
    }
  }
});

test("IC0 suspected scan exposes Settings General switch, select, and segment rows", () => {
  const settingsCandidates = artifacts.inventory.suspectedNonSemanticControls.filter(
    (control) => control.routeId === "settings-general",
  );
  const reasons = settingsCandidates.flatMap((control) => control.suspectedReasons);
  assert.equal(reasons.filter((reason) => reason === "settings-control-class:is-switch").length, 4);
  assert.equal(reasons.filter((reason) => reason === "settings-control-class:is-select").length, 3);
  assert.equal(reasons.filter((reason) => reason === "settings-control-class:is-segment").length, 1);
  assert.equal(settingsCandidates.every((control) => control.semanticStatus === "suspected-nonsemantic-control"), true);
});

test("IC0 reports identical variant renders as review gaps without failing generation", () => {
  const summary = artifacts.coverage.explicitGapSummaries.identicalVariantRenders;
  assert.ok(summary.count > 0);
  assert.ok(summary.routeCount > 0);
  assert.ok(summary.cases >= summary.count * 2);
  assert.equal(summary.routes.length, summary.routeCount);
  assert.equal(summary.groups.every((group) => group.classification === "explicit-gap-review"), true);
  assert.equal(summary.groups.every((group) => group.count === group.cases.length && group.count >= 2), true);
});

test("IC0 audit artifacts live outside release generated inputs and match deterministic generation", () => {
  assert.match(INTERACTION_INVENTORY_PATH, /^docs\/audits\/ic0-2026-07-19\/generated\//);
  assert.match(INTERACTION_COVERAGE_PATH, /^docs\/audits\/ic0-2026-07-19\/generated\//);
  assert.equal(checkInteractionInventoryArtifactBytes(artifacts), true);
});
