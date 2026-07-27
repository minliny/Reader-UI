import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assertValid, validate } from "./mini-validator.mjs";
import { validateReaderUITypedPayload } from "../../packages/reference/reader-ui-runtime.mjs";
import {
  buildScreenGraph,
  buildScreenGraphArtifacts,
  buildScreenGraphCoverage,
  buildScreenGraphSchema,
  canonicalJson,
  checkScreenGraphArtifactBytes,
  formatJson,
  loadScreenGraphInputs,
  REPO_ROOT,
  R16B_WORKFLOW_ROUTE_EXPECTATIONS,
  SCREEN_GRAPH_NATIVE_OUTPUT_PATHS,
  SCREEN_GRAPH_COVERAGE_PATH,
  SCREEN_GRAPH_PATH,
  SCREEN_GRAPH_SCHEMA_PATH,
  validateNativeRegistryGeneration,
  validateScreenGraphSemantics,
} from "../../tools/screen-graph/screen-graph-lib.mjs";

function loadJson(relativePath) {
  return JSON.parse(readFileSync(join(REPO_ROOT, relativePath), "utf8"));
}

const inputs = loadScreenGraphInputs();
const schema = loadJson(SCREEN_GRAPH_SCHEMA_PATH);
const graph = loadJson(SCREEN_GRAPH_PATH);
const coverage = loadJson(SCREEN_GRAPH_COVERAGE_PATH);
const componentRenderSemanticsSchema = loadJson("ui-spec/component-render-semantics.schema.json");
const componentRenderSemantics = loadJson("ui-spec/component-render-semantics.json");

function firstDirectVariant(target = graph) {
  return target.routes.find((route) => route.status === "direct").variants[0];
}

function componentInstanceCount(target = graph) {
  let count = 0;
  const walk = (components) => {
    for (const component of components) {
      count += 1;
      walk(component.children);
    }
  };
  for (const route of target.routes) for (const variant of route.variants) walk(variant.components);
  return count;
}

test("R16A screen graph schema is strict JSON Schema 2020-12", () => {
  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.$defs.RouteNode.additionalProperties, false);
  assert.equal(schema.$defs.ScreenVariant.additionalProperties, false);
  assert.equal(schema.$defs.ComponentNode.additionalProperties, false);
  assert.equal(schema.$defs.ComponentCatalogEntry.additionalProperties, false);
  assert.equal(schema.$defs.ActionBinding.additionalProperties, false);
  assert.equal(schema.$defs.RouteNode.properties.routeId.enum.length, 247);
  assert.equal(schema.$defs.ComponentNode.properties.type.enum.length, 177);
  assert.equal(schema.$defs.ActionBinding.properties.event.enum.length, 300);
});

test("R16A canonical screen graph passes schema and semantic source parity", () => {
  assertValid(schema, graph, "screen graph");
  assert.equal(validateScreenGraphSemantics(graph, inputs), true);
});

test("R16A component render semantics are strict and cover only canonical component types", () => {
  assertValid(componentRenderSemanticsSchema, componentRenderSemantics, "component render semantics");
  const canonicalTypes = new Set(inputs.viewStateSchema.$defs.Component.properties.type.enum);
  assert.equal(Object.keys(componentRenderSemantics.overrides).every((type) => canonicalTypes.has(type)), true);
  assert.deepEqual(coverage.hostCompositeComponentTypes, [
    "TapZones",
    "ReaderBase",
    "ReaderTopArea",
    "ReaderBottomBar",
  ]);
  const readerBase = graph.componentCatalog.find((entry) => entry.type === "ReaderBase");
  assert.deepEqual(readerBase.stateAuthorities, ["core", "reader-ui-runtime", "host-store", "host-layout"]);
  assert.equal(readerBase.compositionMode, "host-composite");
});

test("R16A host slot components OverlayHost and StateHost carry no Figma node binding", () => {
  // OverlayHost and StateHost are native composition slots, not visual surfaces.
  // They must never be a canonical ComponentType, never enter the componentCatalog,
  // never be a host-composite override, and never own a Figma node record in the
  // visual admission registry. They may surface only as native harmony.targets
  // slots of other records (slots/OverlayHost.ets#... / slots/StateHost.ets#...).
  const slotTypes = ["OverlayHost", "StateHost"];
  const componentTypeEnum = inputs.viewStateSchema.$defs.Component.properties.type.enum;
  const catalogTypes = new Set(graph.componentCatalog.map((entry) => entry.type));
  for (const slotType of slotTypes) {
    assert.equal(componentTypeEnum.includes(slotType), false, `${slotType} must not be a canonical ComponentType`);
    assert.equal(catalogTypes.has(slotType), false, `${slotType} must not be in the componentCatalog`);
    assert.equal(componentRenderSemantics.overrides[slotType], undefined, `${slotType} must not be a host-composite override`);
  }

  const registry = loadJson("docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json");
  const records = registry.records;
  for (const slotType of slotTypes) {
    const ownRecord = records.find((record) => record.id === slotType || record.surfaceType === slotType);
    assert.equal(ownRecord, undefined, `${slotType} must not own a visual admission record with a Figma node`);
  }
  for (const record of records) {
    const targets = (record.harmony && record.harmony.targets) || [];
    for (const target of targets) {
      if (/OverlayHost|StateHost/.test(target)) {
        assert.match(
          target,
          /\/ui\/slots\/(OverlayHost|StateHost)\.ets#/,
          `${record.id} harmony target must be a native slot, not a Figma node: ${target}`,
        );
      }
    }
  }
});

test("R16A graph covers every canonical route once in canonical order", () => {
  const canonical = inputs.routeSchema.properties.id.enum;
  assert.deepEqual(graph.routes.map((route) => route.routeId), canonical);
  assert.equal(new Set(graph.routes.map((route) => route.routeId)).size, canonical.length);
  assert.equal(graph.routes.length, 247);
});

test("R16A preserves direct trees, aliases, and explicit gaps as separate truth", () => {
  assert.deepEqual(
    Object.fromEntries(
      ["direct", "alias", "explicit-gap"].map((status) => [
        status,
        graph.routes.filter((route) => route.status === status).length,
      ]),
    ),
    { direct: 177, alias: 70, "explicit-gap": 0 },
  );
  assert.equal(graph.routes.filter((route) => route.status === "direct").every((route) => route.variants.length > 0), true);
  assert.equal(graph.routes.filter((route) => route.status === "alias").every((route) => route.variants.length === 0 && route.aliasFor), true);
  assert.equal(graph.routes.filter((route) => route.status === "explicit-gap").every((route) => route.variants.length === 0 && route.gaps.length > 0), true);
});

test("R16A component tree uses canonical ComponentType and never pseudo-covers gaps", () => {
  const allowed = new Set(inputs.viewStateSchema.$defs.Component.properties.type.enum);
  const forbidden = new Set(["Unknown", "Fallback", "Placeholder"]);
  let count = 0;
  const walk = (components) => {
    for (const component of components) {
      count += 1;
      assert.equal(allowed.has(component.type), true, component.type);
      assert.equal(forbidden.has(component.type), false, component.type);
      walk(component.children);
    }
  };
  for (const route of graph.routes) for (const variant of route.variants) walk(variant.components);
  assert.equal(count, componentInstanceCount());
  assert.deepEqual(
    graph.componentCatalog.map((entry) => entry.type),
    inputs.viewStateSchema.$defs.Component.properties.type.enum,
  );
  assert.equal(graph.componentCatalog.filter((entry) => entry.status === "referenced").length, 134);
  assert.equal(graph.componentCatalog.filter((entry) => entry.status === "explicit-gap").length, 43);
  assert.equal(
    graph.componentCatalog
      .filter((entry) => entry.status === "explicit-gap")
      .every((entry) => entry.instanceCount === 0 && entry.routeIds.length === 0 && entry.gap?.kind === "no-view-state-instance"),
    true,
  );
});

test("R16A variants and component ids are unique within their route/variant", () => {
  for (const route of graph.routes) {
    assert.equal(new Set(route.variants.map((variant) => variant.variantId)).size, route.variants.length, route.routeId);
    for (const variant of route.variants) {
      const ids = [];
      const walk = (components) => {
        for (const component of components) {
          ids.push(component.id);
          walk(component.children);
        }
      };
      walk(variant.components);
      assert.equal(new Set(ids).size, ids.length, `${route.routeId}/${variant.variantId}`);
    }
  }
});

test("R16D executable bindings, state evidence, and unresolved labels stay separate", () => {
  assert.equal(coverage.typedActionBindings, 97);
  assert.equal(coverage.explicitTargetBindings, 61);
  assert.equal(coverage.stateEventEvidence, 19);
  assert.equal(coverage.totalCanonicalEventEvidence, 116);
  assert.equal(coverage.explicitActionGaps, 6);
  assert.deepEqual(coverage.actionGapsByReason, { "label-without-ui-event": 6 });
  for (const route of graph.routes) {
    for (const variant of route.variants) {
      const walk = (components) => {
        for (const component of components) {
          for (const binding of component.bindings) {
            assert.ok(
              schema.$defs.ActionBinding.properties.trigger.enum.includes(binding.trigger),
              `unsupported binding trigger ${binding.trigger}`,
            );
            if (binding.evidenceProperty === "explicitBinding") assert.notEqual(binding.target, "self");
            else assert.equal(binding.target, "self");
          }
          for (const evidence of component.stateEventEvidence) {
            assert.equal(evidence.classification, "state-evidence");
            assert.equal(component.props[evidence.evidenceProperty], evidence.event);
          }
          walk(component.children);
        }
      };
      walk(variant.components);
      for (const gap of variant.actionGaps) {
        assert.equal(gap.property, "action");
        assert.equal(typeof gap.value, "string");
      }
    }
  }
});

test("R16E component fixture evidence exposes data-backed, partial, and type-only renderer gaps", () => {
  assert.deepEqual(coverage.componentFixtureEvidenceSummary, {
    "data-backed": 74,
    "type-only": 50,
    partial: 10,
    "explicit-gap": 43,
  });
  assert.equal(coverage.componentFixtureEvidence.length, 177);
  assert.equal(
    coverage.componentFixtureEvidence.filter((entry) => entry.catalogStatus === "referenced").length,
    134,
  );
  const typeOnly = coverage.componentFixtureEvidence.find((entry) => entry.type === "DiscoverSourceBar");
  assert.equal(typeOnly.evidenceClass, "type-only");
  assert.equal(typeOnly.typeOnlyInstanceCount, typeOnly.instanceCount);
  const readerTopArea = coverage.componentFixtureEvidence.find((entry) => entry.type === "ReaderTopArea");
  assert.equal(readerTopArea.evidenceClass, "partial");
  assert.ok(readerTopArea.typeOnlyInstanceCount > 0 && readerTopArea.typeOnlyInstanceCount < readerTopArea.instanceCount);
  const partial = coverage.componentFixtureEvidence.find((entry) => entry.type === "ReplacePanel");
  assert.equal(partial.evidenceClass, "partial");
  assert.ok(partial.typeOnlyInstanceCount > 0 && partial.typeOnlyInstanceCount < partial.instanceCount);
  const dataBacked = coverage.componentFixtureEvidence.find((entry) => entry.type === "BookCard");
  assert.equal(dataBacked.evidenceClass, "data-backed");
  assert.deepEqual(dataBacked.propKeys, ["author", "bookId", "coverKey", "semanticRole", "title", "viewMode"]);
});

test("R16C executable action bindings satisfy the R14 typed payload contract", () => {
  let executableBindings = 0;
  const walk = (components) => {
    for (const component of components) {
      for (const binding of component.bindings) {
        const contract = validateReaderUITypedPayload(binding.event, binding.payload);
        if (contract != null) executableBindings += 1;
      }
      walk(component.children);
    }
  };
  for (const route of graph.routes) for (const variant of route.variants) walk(variant.components);
  assert.equal(executableBindings, 41);
});

test("R16D TapZones expose canonical geometry, boundary gating, and semantic targets", () => {
  const expected = {
    "reader-content-loading": [],
    "reader-content-offline": ["previous:reader.page.prev", "control:reader.control.toggle", "next:reader.page.next"],
    "reader-content-error": ["previous:reader.page.prev", "control:reader.control.toggle", "next:reader.page.next"],
    "reader-page-boundary-first": ["control:reader.control.toggle", "next:reader.page.next"],
    "reader-page-boundary-last": ["previous:reader.page.prev", "control:reader.control.toggle"],
  };
  for (const [routeId, expectedBindings] of Object.entries(expected)) {
    const route = graph.routes.find((entry) => entry.routeId === routeId);
    const queue = [...route.variants[0].components];
    let tapZones;
    while (queue.length > 0) {
      const component = queue.shift();
      if (component.type === "TapZones") {
        tapZones = component;
        break;
      }
      queue.push(...component.children);
    }
    assert.ok(tapZones, routeId);
    assert.deepEqual(
      [tapZones.props.previousRatio, tapZones.props.controlRatio, tapZones.props.nextRatio],
      [0.26, 0.48, 0.26],
    );
    assert.deepEqual(
      tapZones.bindings.map((binding) => `${binding.target}:${binding.event}`),
      expectedBindings,
    );
    assert.deepEqual(tapZones.stateAuthorities, ["reader-ui-runtime", "host-layout"]);
    assert.equal(tapZones.compositionMode, "host-composite");
  }
});

function routeNode(routeId) {
  return graph.routes.find((route) => route.routeId === routeId);
}

function boundEvents(route) {
  const events = new Set();
  const walk = (components) => {
    for (const component of components) {
      for (const binding of component.bindings) events.add(binding.event);
      for (const evidence of component.stateEventEvidence) events.add(evidence.event);
      walk(component.children);
    }
  };
  for (const variant of route.variants) walk(variant.components);
  return events;
}

function assertWorkflowGraph(workflow, routeIds, shell) {
  assert.deepEqual(
    Object.entries(R16B_WORKFLOW_ROUTE_EXPECTATIONS)
      .filter(([, expected]) => expected.workflow === workflow)
      .map(([routeId]) => routeId),
    routeIds,
  );
  for (const routeId of routeIds) {
    const expected = R16B_WORKFLOW_ROUTE_EXPECTATIONS[routeId];
    const route = routeNode(routeId);
    assert.equal(route.status, "direct", routeId);
    assert.equal(route.shell, shell, routeId);
    assert.equal(route.variants.length, 1, routeId);
    assert.equal(route.variants[0].pageState, expected.pageState, routeId);
    assert.equal(route.variants[0].facets[expected.facetKey], expected.facetValue, routeId);
    const events = boundEvents(route);
    for (const event of expected.events) assert.equal(events.has(event), true, `${routeId}/${event}`);
  }
}

test("R16B W1 import graph matches importState phases and canonical actions", () => {
  assertWorkflowGraph("W1", [
    "import-permission-denied", "import-format-unsupported", "import-empty-file", "import-parsing",
    "import-duplicate", "import-conflict-resolve", "import-partial-success", "import-result-detail",
  ], "LibraryShell");
});

test("R16B W2 reader graph matches TOC/content/boundary/restore state", () => {
  assertWorkflowGraph("W2", [
    "reader-toc-loading", "reader-toc-offline", "reader-toc-error",
    "reader-content-loading", "reader-content-offline", "reader-content-error",
    "reader-page-boundary-first", "reader-page-boundary-last",
    "reader-progress-restore", "reader-background-restore",
  ], "ReaderShell");
});

test("R16B W3 source-switch graph matches sourceSwitchState and FlowShell", () => {
  assertWorkflowGraph("W3", [
    "source-switch-empty", "source-switch-error", "source-switch-timeout",
    "source-switch-loading", "source-switch-rollback", "source-switch-preview",
  ], "FlowShell");
});

test("R16B W4 appearance graph matches font/theme/typography management state", () => {
  assertWorkflowGraph("W4", [
    "reader-font-import-confirm", "reader-font-delete-confirm", "reader-font-fallback",
    "reader-theme-new", "reader-theme-delete-confirm", "reader-typography-reset-confirm",
  ], "ReaderShell");
});

test("R16B W5 replacement graph matches replaceRulesState and canonical actions", () => {
  assertWorkflowGraph("W5", [
    "reader-replace-delete-confirm", "reader-replace-apply-result",
    "reader-replace-import-export", "reader-replace-preview", "reader-replace-page",
  ], "ReaderShell");
});

function mutateViewFixture(routeId, mutate) {
  const changed = structuredClone(inputs);
  const fixture = changed.viewStateFixtures.find((item) => item.routeId === routeId);
  assert.ok(fixture, routeId);
  mutate(fixture);
  return changed;
}

test("R16B W1 fails closed when import route and importState phase diverge", () => {
  const changed = mutateViewFixture("import-parsing", (fixture) => { fixture.importPhase = "preview"; });
  assert.throws(() => buildScreenGraph(changed), /R16B W1 importPhase mismatch: import-parsing/);
});

test("R16B W2 fails closed when boundary context contradicts readerContentState", () => {
  const changed = mutateViewFixture("reader-page-boundary-first", (fixture) => { fixture.context.pageBoundary = "last"; });
  assert.throws(() => buildScreenGraph(changed), /R16B W2 context\.pageBoundary mismatch: reader-page-boundary-first/);
});

test("R16B W3 fails closed when source-switch phase diverges", () => {
  const changed = mutateViewFixture("source-switch-loading", (fixture) => { fixture.sourceSwitchPhase = "error"; });
  assert.throws(() => buildScreenGraph(changed), /R16B W3 sourceSwitchPhase mismatch: source-switch-loading/);
});

test("R16B W4 fails closed when appearance confirmation action is not canonical", () => {
  const changed = mutateViewFixture("reader-theme-delete-confirm", (fixture) => {
    fixture.components[2].children[0].children[0].props.uiEvent = "reader.theme.new";
  });
  assert.throws(() => buildScreenGraph(changed), /R16B W4 UiEvent reader\.theme\.delete missing/);
});

test("R16B W5 fails closed when replacement preview loses apply action", () => {
  const changed = mutateViewFixture("reader-replace-preview", (fixture) => {
    fixture.components[2].children[2].props.uiEvent = "reader.replace.preview";
  });
  assert.throws(() => buildScreenGraph(changed), /R16B W5 UiEvent reader\.replace\.apply missing/);
});

test("R16A coverage report preserves native-renderer and Authoritative boundary", () => {
  assert.equal(coverage.canonicalRoutes, 247);
  assert.equal(coverage.resolvableRoutes, 247);
  assert.equal(coverage.explicitGapRoutes, 0);
  assert.equal(coverage.viewStateFixtures, 183);
  assert.equal(coverage.variants, 183);
  assert.equal(coverage.componentInstances, componentInstanceCount());
  assert.equal(coverage.canonicalComponentTypes, 177);
  assert.equal(coverage.componentCatalogTypes, 177);
  assert.equal(coverage.usedComponentTypes, 134);
  assert.equal(coverage.referencedComponentTypes, 134);
  assert.equal(coverage.explicitGapComponentTypes, 43);
  assert.deepEqual(coverage.proofBoundary.graphGreenDoesNotMean, [
    "iOS native renderer complete",
    "Android native renderer complete",
    "HarmonyOS native renderer complete",
    "Authoritative rollout enabled",
    "type-only or partial component fixtures contain enough semantic data for a native renderer",
  ]);
});

test("R16A generation is deterministic and checked byte-for-byte", () => {
  const first = buildScreenGraphArtifacts(inputs);
  const second = buildScreenGraphArtifacts(inputs);
  assert.equal(formatJson(first.schema), formatJson(second.schema));
  assert.equal(formatJson(first.graph), formatJson(second.graph));
  assert.equal(formatJson(first.coverage), formatJson(second.coverage));
  assert.equal(formatJson(schema), formatJson(buildScreenGraphSchema(inputs)));
  assert.equal(formatJson(graph), formatJson(buildScreenGraph(inputs)));
  assert.equal(formatJson(coverage), formatJson(buildScreenGraphCoverage(graph, inputs)));
  assert.equal(checkScreenGraphArtifactBytes(first), true);
});

function embeddedChunkJSON(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, startMarker);
  const contentStart = start + startMarker.length;
  const end = source.indexOf(endMarker, contentStart);
  assert.notEqual(end, -1, endMarker);
  return source
    .slice(contentStart, end)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.endsWith(","))
    .map((line) => JSON.parse(line.slice(0, -1)))
    .join("");
}

test("R16C native registries embed the complete canonical graph losslessly", () => {
  const artifacts = buildScreenGraphArtifacts(inputs);
  const expected = canonicalJson(graph);
  const sources = artifacts.nativeRegistry.outputs;
  const swift = sources[SCREEN_GRAPH_NATIVE_OUTPUT_PATHS.swift];
  const kotlin = sources[SCREEN_GRAPH_NATIVE_OUTPUT_PATHS.kotlin];
  const arkts = sources[SCREEN_GRAPH_NATIVE_OUTPUT_PATHS.arkts];
  const embedded = [
    embeddedChunkJSON(swift, "private static let chunks: [String] = [\n", "\n    ]\n\n    public static let json"),
    embeddedChunkJSON(kotlin, "listOf(\n", "\n        ).joinToString"),
    embeddedChunkJSON(arkts, "static readonly json: string = [\n", "\n  ].join('')"),
  ];

  for (const value of embedded) {
    assert.equal(value, expected);
    const decoded = JSON.parse(value);
    assert.deepEqual(decoded, graph);
    assert.equal(decoded.routes.length, 247);
    assert.equal(decoded.routes.reduce((count, route) => count + route.variants.length, 0), 183);
  }
  const expectedHash = createHash("sha256").update(expected).digest("hex");
  assert.equal(swift.includes(`sha256 = "${expectedHash}"`), true);
  assert.equal(kotlin.includes(`sha256: String = "${expectedHash}"`), true);
  assert.equal(arkts.includes(`sha256: string = "${expectedHash}"`), true);
});

test("R16C native APIs type RouteId, ComponentType, PageState, and UiEvent bindings", () => {
  const sources = buildScreenGraphArtifacts(inputs).nativeRegistry.outputs;
  const swift = sources[SCREEN_GRAPH_NATIVE_OUTPUT_PATHS.swift];
  const kotlin = sources[SCREEN_GRAPH_NATIVE_OUTPUT_PATHS.kotlin];
  const arkts = sources[SCREEN_GRAPH_NATIVE_OUTPUT_PATHS.arkts];

  assert.match(swift, /public let routeId: RouteId/);
  assert.match(swift, /public let pageState: PageState/);
  assert.match(swift, /public let type: ComponentType/);
  assert.match(swift, /public let event: UiEventType/);
  assert.match(swift, /public let target: String/);
  assert.match(swift, /public let stateAuthorities: \[String\]/);
  assert.match(swift, /public let compositionMode: String/);
  assert.match(swift, /public let stateEventEvidence: \[ScreenGraphStateEventEvidence\]/);
  assert.match(swift, /public static func loadCanonical\(\) throws -> ScreenGraphRegistry/);
  assert.match(swift, /document\.schemaVersion == "1\.2\.0"/);
  assert.doesNotMatch(swift, /document\.schemaVersion == "1\.1\.0"/);
  assert.match(swift, /public func resolve\(_ routeId: RouteId\) throws -> ScreenGraphRouteNode/);

  assert.match(kotlin, /val routeId: RouteId/);
  assert.match(kotlin, /val pageState: PageState/);
  assert.match(kotlin, /val type: ComponentType/);
  assert.match(kotlin, /val event: UiEventType/);
  assert.match(kotlin, /val target: String/);
  assert.match(kotlin, /val stateAuthorities: List<String>/);
  assert.match(kotlin, /val compositionMode: String/);
  assert.match(kotlin, /val stateEventEvidence: List<ScreenGraphStateEventEvidence>/);
  assert.match(kotlin, /fun loadCanonical\(\): ScreenGraphRegistry/);
  assert.match(kotlin, /document\.schemaVersion == "1\.2\.0"/);
  assert.doesNotMatch(kotlin, /document\.schemaVersion == "1\.1\.0"/);
  assert.match(kotlin, /fun resolve\(routeId: RouteId\): ScreenGraphRouteNode/);

  assert.match(arkts, /routeId: RouteId/);
  assert.match(arkts, /pageState: PageState/);
  assert.match(arkts, /type: ComponentType/);
  assert.match(arkts, /event: UiEventType/);
  assert.match(arkts, /target: string/);
  assert.match(arkts, /stateAuthorities: string\[\]/);
  assert.match(arkts, /compositionMode: 'contract-tree' \| 'host-composite'/);
  assert.match(arkts, /stateEventEvidence: ScreenGraphStateEventEvidence\[\]/);
  assert.match(arkts, /static loadCanonical\(\): ScreenGraphRegistry/);
  assert.match(arkts, /this\.document\.schemaVersion !== '1\.2\.0'/);
  assert.doesNotMatch(arkts, /this\.document\.schemaVersion !== '1\.1\.0'/);
  assert.match(arkts, /resolve\(routeId: RouteId\): ScreenGraphRouteNode/);
});

test("R16C native generation fails closed on canonical set and recursive binding drift", () => {
  const unknownComponent = structuredClone(graph);
  firstDirectVariant(unknownComponent).components[0].type = "NotCanonical";
  assert.throws(
    () => validateNativeRegistryGeneration(unknownComponent, inputs),
    /unknown ComponentType/,
  );

  const unknownEvent = structuredClone(graph);
  let binding;
  for (const route of unknownEvent.routes) {
    for (const variant of route.variants) {
      const queue = [...variant.components];
      while (queue.length > 0) {
        const component = queue.shift();
        if (component.bindings.length > 0) {
          binding = component.bindings[0];
          break;
        }
        queue.push(...component.children);
      }
      if (binding) break;
    }
    if (binding) break;
  }
  assert.ok(binding);
  binding.event = "not.a.canonical.event";
  assert.throws(
    () => validateNativeRegistryGeneration(unknownEvent, inputs),
    /unknown UiEvent binding/,
  );

  const missingRoute = structuredClone(graph);
  missingRoute.routes.pop();
  assert.throws(
    () => validateNativeRegistryGeneration(missingRoute, inputs),
    /requires 247 routes/,
  );

  const catalogDrift = structuredClone(graph);
  catalogDrift.componentCatalog.pop();
  assert.throws(
    () => validateNativeRegistryGeneration(catalogDrift, inputs),
    /ComponentType catalog must exactly match/,
  );
});

test("R16A fails closed on missing or duplicate route", () => {
  const missing = structuredClone(graph);
  missing.routes.pop();
  assert.throws(
    () => validateScreenGraphSemantics(missing, inputs, { requireSourceParity: false }),
    /canonical RouteId order/,
  );

  const duplicate = structuredClone(graph);
  duplicate.routes[1].routeId = duplicate.routes[0].routeId;
  assert.throws(
    () => validateScreenGraphSemantics(duplicate, inputs, { requireSourceParity: false }),
    /canonical RouteId order|duplicate routes/,
  );
});

test("R16A fails closed on missing, duplicate, or dishonest component catalog entry", () => {
  const missing = structuredClone(graph);
  missing.componentCatalog.pop();
  assert.throws(
    () => validateScreenGraphSemantics(missing, inputs, { requireSourceParity: false }),
    /component catalog must match/,
  );

  const duplicate = structuredClone(graph);
  duplicate.componentCatalog[1].type = duplicate.componentCatalog[0].type;
  assert.throws(
    () => validateScreenGraphSemantics(duplicate, inputs, { requireSourceParity: false }),
    /component catalog must match|duplicate ComponentType/,
  );

  const dishonest = structuredClone(graph);
  const unused = dishonest.componentCatalog.find((entry) => entry.status === "explicit-gap");
  unused.status = "referenced";
  unused.gap = null;
  assert.throws(
    () => validateScreenGraphSemantics(dishonest, inputs, { requireSourceParity: false }),
    /must be explicit-gap/,
  );
});

test("R16A fails closed on orphan or cyclic alias", () => {
  const aliasIndex = graph.routes.findIndex((route) => route.status === "alias");
  const cyclic = structuredClone(graph);
  cyclic.routes[aliasIndex].aliasFor = cyclic.routes[aliasIndex].routeId;
  assert.throws(
    () => validateScreenGraphSemantics(cyclic, inputs, { requireSourceParity: false }),
    /alias cycle/,
  );

  const orphan = structuredClone(graph);
  orphan.routes[aliasIndex].aliasFor = "not-a-route";
  assert.throws(
    () => validateScreenGraphSemantics(orphan, inputs, { requireSourceParity: false }),
    /orphan alias/,
  );
});

test("R16A fails closed on duplicate variant or component id", () => {
  const duplicateVariant = structuredClone(graph);
  const route = duplicateVariant.routes.find((item) => item.status === "direct");
  route.variants.push(structuredClone(route.variants[0]));
  assert.throws(
    () => validateScreenGraphSemantics(duplicateVariant, inputs, { requireSourceParity: false }),
    /duplicate variant/,
  );

  const duplicateComponent = structuredClone(graph);
  const variant = firstDirectVariant(duplicateComponent);
  variant.components.push(structuredClone(variant.components[0]));
  assert.throws(
    () => validateScreenGraphSemantics(duplicateComponent, inputs, { requireSourceParity: false }),
    /duplicate component id/,
  );
});

test("R16A fails closed on illegal component, prop drift, and UiEvent binding", () => {
  const badComponent = structuredClone(graph);
  firstDirectVariant(badComponent).components[0].type = "Unknown";
  assert.ok(validate(schema, badComponent).length > 0);
  assert.throws(
    () => validateScreenGraphSemantics(badComponent, inputs, { requireSourceParity: false }),
    /unknown ComponentType|forbidden pseudo component/,
  );

  const badProp = structuredClone(graph);
  firstDirectVariant(badProp).components[0].props.unpublishedProp = true;
  assert.throws(
    () => validateScreenGraphSemantics(badProp, inputs),
    /differs from deterministic canonical generation/,
  );

  const badAction = structuredClone(graph);
  firstDirectVariant(badAction).components[0].bindings.push({
    event: "not.a.canonical.event",
    payload: {},
    evidenceProperty: "uiEvent",
    trigger: "tap",
  });
  assert.ok(validate(schema, badAction).length > 0);
  assert.throws(
    () => validateScreenGraphSemantics(badAction, inputs, { requireSourceParity: false }),
    /unknown UiEvent binding/,
  );
});

test("R16A fails closed when an explicit action gap is hidden", () => {
  const mutated = structuredClone(graph);
  const variant = mutated.routes
    .flatMap((route) => route.variants)
    .find((item) => item.actionGaps.length > 0);
  variant.actionGaps.pop();
  assert.throws(
    () => validateScreenGraphSemantics(mutated, inputs, { requireSourceParity: false }),
    /action gap drift/,
  );
});

test("R16A schema rejects unknown graph fields", () => {
  const mutated = structuredClone(graph);
  mutated.routes[0].nativeRendererComplete = true;
  const errors = validate(schema, mutated);
  assert.ok(errors.length > 0);
  assert.match(canonicalJson(errors), /additionalProperties/);
});
