import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import {
  buildNativeRegistryArtifacts,
  SCREEN_GRAPH_NATIVE_OUTPUT_PATHS,
  validateNativeRegistryGeneration,
} from "./native-registry-codegen.mjs";

export { SCREEN_GRAPH_NATIVE_OUTPUT_PATHS, validateNativeRegistryGeneration };

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(THIS_DIR, "..", "..");

export const SCREEN_GRAPH_SCHEMA_PATH = "ui-spec/screen-graph.schema.json";
export const SCREEN_GRAPH_PATH = "ui-spec/screen-graph.json";
export const SCREEN_GRAPH_COVERAGE_PATH = "generated/screen-graph-coverage.json";

const SOURCE_PATHS = Object.freeze({
  routeSchema: "contracts/route.schema.json",
  routeFixtures: "contracts/fixtures/route.fixtures.json",
  viewStateSchema: "contracts/view-state.schema.json",
  viewStateFixtures: "contracts/fixtures/view-state.fixtures.json",
  uiEventSchema: "contracts/ui-event.schema.json",
  componentRenderSemanticsSchema: "ui-spec/component-render-semantics.schema.json",
  componentRenderSemantics: "ui-spec/component-render-semantics.json",
  routeContract: "frontend-demo-optimized/route-contract.js",
});

const FACET_KEYS = Object.freeze([
  "controlLayerLevel",
  "importPhase",
  "readerTocPhase",
  "readerContentPhase",
  "sourceSwitchPhase",
  "fontManagePhase",
  "themeManagePhase",
  "typographyManagePhase",
  "replaceRulePhase",
]);

function workflowExpectations(workflow, shell, facetKey, entries) {
  return Object.fromEntries(entries.map(([routeId, pageState, facetValue, componentTypes, events, context = {}]) => [
    routeId,
    { workflow, shell, pageState, facetKey, facetValue, componentTypes, events, context },
  ]));
}

export const R16B_WORKFLOW_ROUTE_EXPECTATIONS = Object.freeze({
  ...workflowExpectations("W1", "LibraryShell", "importPhase", [
    ["import-permission-denied", "permission", "selecting", ["Permission", "Button"], ["import.permission.denied", "source.import.open"]],
    ["import-format-unsupported", "error", "input", ["ErrorState", "Button"], ["import.format.unsupported", "source.import.open"]],
    ["import-empty-file", "empty", "input", ["Empty", "Button"], ["import.file.empty", "source.import.open"]],
    ["import-parsing", "loading", "parsing", ["Loading", "Button"], []],
    ["import-duplicate", "default", "conflict", ["Dialog", "Button"], ["import.duplicate.found", "import.conflict.resolve"]],
    ["import-conflict-resolve", "default", "conflict", ["Dialog", "Button"], ["import.conflict.resolve"]],
    ["import-partial-success", "default", "result", ["Content", "Button"], ["import.partial.success", "import.retry.failed"]],
    ["import-result-detail", "default", "result", ["Content", "Button"], ["source.import.open"]],
  ]),
  ...workflowExpectations("W2", "ReaderShell", "readerTocPhase", [
    ["reader-toc-loading", "loading", "loading", ["ReaderDirectoryPanel", "Loading"], ["reader.toc.load"]],
    ["reader-toc-offline", "offline", "offline", ["ReaderDirectoryPanel", "Offline", "Button"], ["reader.toc.offline", "reader.toc.load"]],
    ["reader-toc-error", "error", "error", ["ReaderDirectoryPanel", "ErrorState", "Button"], ["reader.toc.error", "reader.toc.load"]],
  ]),
  ...workflowExpectations("W2", "ReaderShell", "readerContentPhase", [
    ["reader-content-loading", "loading", "loading", ["ReadingTextFlow", "Loading"], ["reader.content.load"]],
    ["reader-content-offline", "offline", "offline", ["ReadingTextFlow", "Offline", "Button"], ["reader.content.offline", "reader.content.load"]],
    ["reader-content-error", "error", "error", ["ReadingTextFlow", "ErrorState", "Button"], ["reader.content.error", "reader.content.load"]],
    ["reader-page-boundary-first", "default", "boundary", ["ReadingTextFlow", "FloatingPageControl"], ["reader.page.boundary"], { pageBoundary: "first" }],
    ["reader-page-boundary-last", "default", "boundary", ["ReadingTextFlow", "FloatingPageControl"], ["reader.page.boundary"], { pageBoundary: "last" }],
    ["reader-progress-restore", "default", "ready", ["ReadingTextFlow", "Dialog", "Button"], ["reader.progress.restore"]],
    ["reader-background-restore", "loading", "ready", ["ReadingTextFlow", "Toast"], ["reader.background.restore"]],
  ]),
  ...workflowExpectations("W3", "FlowShell", "sourceSwitchPhase", [
    ["source-switch-empty", "empty", "idle", ["SourceSwitchFlowPage", "Empty", "Button"], ["source.switch.empty", "source.switch.cancel"]],
    ["source-switch-error", "error", "error", ["SourceSwitchFlowPage", "ErrorState", "Button"], ["source.switch.error", "source.switch.cancel"]],
    ["source-switch-timeout", "error", "timeout", ["SourceSwitchFlowPage", "ErrorState", "Button"], ["source.switch.timeout", "source.switch.cancel"]],
    ["source-switch-loading", "loading", "loading", ["SourceSwitchFlowPage", "Loading", "Button"], ["source.switch.loading", "source.switch.cancel"]],
    ["source-switch-rollback", "default", "rollback", ["SourceSwitchFlowPage", "Dialog", "Button"], ["source.switch.rollback"]],
    ["source-switch-preview", "default", "preview", ["SourceSwitchFlowPage", "SourceSwitchResultsPanel", "Button"], ["source.switch.preview", "source.switch.confirm"]],
  ]),
  ...workflowExpectations("W4", "ReaderShell", "fontManagePhase", [
    ["reader-font-import-confirm", "default", "importing", ["ReaderAppearancePanel", "Dialog", "Button"], ["reader.font.import"]],
    ["reader-font-delete-confirm", "default", "deleting", ["ReaderAppearancePanel", "Dialog", "Button"], ["reader.font.delete"]],
    ["reader-font-fallback", "default", "fallback", ["ReaderAppearancePanel", "Toast", "Button"], ["reader.font.fallback"]],
  ]),
  ...workflowExpectations("W4", "ReaderShell", "themeManagePhase", [
    ["reader-theme-new", "default", "new", ["ReaderAppearancePanel", "FormSection", "Button"], ["reader.theme.new"]],
    ["reader-theme-delete-confirm", "default", "delete", ["ReaderAppearancePanel", "Dialog", "Button"], ["reader.theme.delete"]],
  ]),
  ...workflowExpectations("W4", "ReaderShell", "typographyManagePhase", [
    ["reader-typography-reset-confirm", "default", "reset", ["ReaderAppearancePanel", "Dialog", "Button"], ["reader.typography.reset"]],
  ]),
  ...workflowExpectations("W5", "ReaderShell", "replaceRulePhase", [
    ["reader-replace-delete-confirm", "default", "delete", ["ReaderReplacePanel", "Dialog", "Button"], ["reader.replace.delete"]],
    ["reader-replace-apply-result", "default", "apply", ["ReaderReplacePanel", "Content", "Button"], ["reader.replace.undo"]],
    ["reader-replace-import-export", "default", "import", ["ReaderReplacePanel", "FormSection", "Button"], ["reader.replace.import", "reader.replace.export"]],
    ["reader-replace-preview", "default", "preview", ["ReaderReplacePanel", "Content", "Button"], ["reader.replace.preview", "reader.replace.apply"]],
    ["reader-replace-page", "default", "idle", ["ReaderReplacePanel", "List", "Button"], ["reader.replace.create"]],
  ]),
});

const EXPLICIT_EVENT_PROPERTIES = new Set(["uiEvent", "eventId"]);
const ACTION_EVIDENCE_PROPERTIES = new Set([...EXPLICIT_EVENT_PROPERTIES, "explicitBinding"]);
const STATE_AUTHORITIES = Object.freeze(["contract", "core", "reader-ui-runtime", "host-store", "host-layout"]);
const COMPOSITION_MODES = Object.freeze(["contract-tree", "host-composite"]);
const ACTION_SHAPED_PROPERTY = /^(?:action|actions|event|on[A-Z].*)$/;
const FORBIDDEN_PSEUDO_COMPONENTS = new Set(["Unknown", "Fallback", "Placeholder"]);

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(REPO_ROOT, relativePath), "utf8"));
}

function plainClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertAllowedKeys(value, allowed, label) {
  assert(isPlainObject(value), `${label} must be an object`);
  for (const key of Object.keys(value)) {
    assert(allowed.has(key), `${label} contains unsupported property: ${key}`);
  }
}

function uniqueMap(items, keyOf, label) {
  const result = new Map();
  for (const [index, item] of items.entries()) {
    const key = keyOf(item);
    assert(!result.has(key), `${label} duplicate: ${key}`);
    result.set(key, { item, index });
  }
  return result;
}

function sortedObject(value) {
  if (Array.isArray(value)) return value.map(sortedObject);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortedObject(value[key])]),
  );
}

export function canonicalJson(value) {
  return JSON.stringify(sortedObject(value));
}

export function formatJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function loadRouteContract() {
  const source = readFileSync(join(REPO_ROOT, SOURCE_PATHS.routeContract), "utf8");
  const window = {};
  const context = vm.createContext(
    { window },
    { codeGeneration: { strings: false, wasm: false } },
  );
  vm.runInContext(source, context, {
    filename: SOURCE_PATHS.routeContract,
    timeout: 1_000,
  });
  const contract = window.ReaderFrontendDemoDraftRouteContract;
  assert(contract && isPlainObject(contract.routes), "route-contract.js did not publish routes");
  return plainClone(contract.routes);
}

export function loadScreenGraphInputs() {
  return {
    routeSchema: readJson(SOURCE_PATHS.routeSchema),
    routeFixtures: readJson(SOURCE_PATHS.routeFixtures),
    viewStateSchema: readJson(SOURCE_PATHS.viewStateSchema),
    viewStateFixtures: readJson(SOURCE_PATHS.viewStateFixtures),
    uiEventSchema: readJson(SOURCE_PATHS.uiEventSchema),
    componentRenderSemanticsSchema: readJson(SOURCE_PATHS.componentRenderSemanticsSchema),
    componentRenderSemantics: readJson(SOURCE_PATHS.componentRenderSemantics),
    routeContract: loadRouteContract(),
  };
}

function validateComponentSemantics(value, label) {
  assertAllowedKeys(value, new Set(["stateAuthorities", "compositionMode", "notes"]), label);
  assert(Array.isArray(value.stateAuthorities) && value.stateAuthorities.length > 0, `${label}.stateAuthorities must be non-empty`);
  assert(new Set(value.stateAuthorities).size === value.stateAuthorities.length, `${label}.stateAuthorities must be unique`);
  for (const authority of value.stateAuthorities) {
    assert(STATE_AUTHORITIES.includes(authority), `${label} has unknown state authority ${authority}`);
  }
  assert(COMPOSITION_MODES.includes(value.compositionMode), `${label} has unknown compositionMode ${value.compositionMode}`);
  assert(typeof value.notes === "string" && value.notes.length > 0, `${label}.notes must be non-empty`);
  return {
    stateAuthorities: plainClone(value.stateAuthorities),
    compositionMode: value.compositionMode,
  };
}

function resolveComponentSemantics(inputs, componentTypes) {
  const source = inputs.componentRenderSemantics;
  assertAllowedKeys(source, new Set(["schemaVersion", "default", "overrides"]), "component render semantics");
  assert(source.schemaVersion === "1.0.0", "component render semantics schemaVersion must be 1.0.0");
  assert(isPlainObject(source.overrides), "component render semantics overrides must be an object");
  const typeSet = new Set(componentTypes);
  const defaultSemantics = validateComponentSemantics(source.default, "component render semantics default");
  for (const type of Object.keys(source.overrides)) {
    assert(typeSet.has(type), `component render semantics references unknown ComponentType ${type}`);
  }
  return new Map(componentTypes.map((type) => [
    type,
    type in source.overrides
      ? validateComponentSemantics(source.overrides[type], `component render semantics ${type}`)
      : plainClone(defaultSemantics),
  ]));
}

function jsonValueDefinition() {
  return {
    oneOf: [
      { type: "null" },
      { type: "boolean" },
      { type: "number" },
      { type: "string" },
      { type: "array", items: { $ref: "#/$defs/JsonValue" } },
      {
        type: "object",
        additionalProperties: { $ref: "#/$defs/JsonValue" },
      },
    ],
  };
}

export function buildScreenGraphSchema(inputs = loadScreenGraphInputs()) {
  const routeIds = inputs.routeSchema.properties.id.enum;
  const shells = inputs.routeSchema.properties.shell.enum;
  const pageStates = inputs.viewStateSchema.properties.pageState.enum;
  const componentTypes = inputs.viewStateSchema.$defs.Component.properties.type.enum;
  const eventTypes = inputs.uiEventSchema.properties.type.enum;
  const facetProperties = {};

  for (const key of FACET_KEYS) {
    const source = inputs.viewStateSchema.properties[key];
    assert(source, `view-state schema is missing facet ${key}`);
    facetProperties[key] = {
      type: source.type,
      enum: source.enum,
    };
  }

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://reader-ui/ui-spec/screen-graph.schema.json",
    title: "Reader UI Canonical Screen Graph",
    description:
      "R16A machine-executable route-to-screen foundation. Direct fixture trees, alias edges, and explicit gaps are different states; graph coverage is not native renderer proof.",
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "generatedFrom", "componentCatalog", "routes"],
    properties: {
      schemaVersion: { const: "1.2.0" },
      generatedFrom: {
        type: "array",
        const: Object.values(SOURCE_PATHS),
      },
      componentCatalog: {
        type: "array",
        minItems: componentTypes.length,
        maxItems: componentTypes.length,
        items: { $ref: "#/$defs/ComponentCatalogEntry" },
      },
      routes: {
        type: "array",
        minItems: routeIds.length,
        maxItems: routeIds.length,
        items: { $ref: "#/$defs/RouteNode" },
      },
    },
    $defs: {
      JsonValue: jsonValueDefinition(),
      JsonObject: {
        type: "object",
        additionalProperties: { $ref: "#/$defs/JsonValue" },
      },
      ActionBinding: {
        type: "object",
        additionalProperties: false,
        required: ["target", "event", "payload", "evidenceProperty", "trigger"],
        properties: {
          target: { type: "string", pattern: "^[a-z][a-z0-9.-]*$" },
          event: { type: "string", enum: eventTypes },
          payload: { $ref: "#/$defs/JsonObject" },
          evidenceProperty: {
            type: "string",
            enum: [...ACTION_EVIDENCE_PROPERTIES],
          },
          trigger: { type: "string", enum: ["tap", "change", "submit", "appear"] },
        },
      },
      StateEventEvidence: {
        type: "object",
        additionalProperties: false,
        required: ["event", "payload", "evidenceProperty", "classification"],
        properties: {
          event: { type: "string", enum: eventTypes },
          payload: { $ref: "#/$defs/JsonObject" },
          evidenceProperty: {
            type: "string",
            enum: [...EXPLICIT_EVENT_PROPERTIES],
          },
          classification: { const: "state-evidence" },
        },
      },
      ActionGap: {
        type: "object",
        additionalProperties: false,
        required: ["componentId", "property", "value", "reason"],
        properties: {
          componentId: { type: "string", minLength: 1 },
          property: { type: "string", minLength: 1 },
          value: { $ref: "#/$defs/JsonValue" },
          reason: {
            type: "string",
            enum: [
              "label-without-ui-event",
              "unknown-ui-event",
              "unsupported-action-shape",
              "missing-event-trigger",
              "unsupported-event-trigger",
              "orphan-event-trigger",
            ],
          },
        },
      },
      ComponentNode: {
        type: "object",
        additionalProperties: false,
        required: ["type", "id", "stateAuthorities", "compositionMode", "props", "children", "bindings", "stateEventEvidence"],
        properties: {
          type: { type: "string", enum: componentTypes },
          id: { type: "string", minLength: 1 },
          stateAuthorities: {
            type: "array",
            minItems: 1,
            uniqueItems: true,
            items: { type: "string", enum: STATE_AUTHORITIES },
          },
          compositionMode: { type: "string", enum: COMPOSITION_MODES },
          props: { $ref: "#/$defs/JsonObject" },
          children: {
            type: "array",
            items: { $ref: "#/$defs/ComponentNode" },
          },
          bindings: {
            type: "array",
            items: { $ref: "#/$defs/ActionBinding" },
          },
          stateEventEvidence: {
            type: "array",
            items: { $ref: "#/$defs/StateEventEvidence" },
          },
        },
      },
      ComponentCatalogGap: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "source", "detail"],
        properties: {
          kind: { const: "no-view-state-instance" },
          source: { const: SOURCE_PATHS.viewStateFixtures },
          detail: { type: "string", minLength: 1 },
        },
      },
      ComponentCatalogEntry: {
        type: "object",
        additionalProperties: false,
        required: ["type", "stateAuthorities", "compositionMode", "status", "instanceCount", "routeIds", "gap"],
        properties: {
          type: { type: "string", enum: componentTypes },
          stateAuthorities: {
            type: "array",
            minItems: 1,
            uniqueItems: true,
            items: { type: "string", enum: STATE_AUTHORITIES },
          },
          compositionMode: { type: "string", enum: COMPOSITION_MODES },
          status: { type: "string", enum: ["referenced", "explicit-gap"] },
          instanceCount: { type: "integer", minimum: 0 },
          routeIds: {
            type: "array",
            uniqueItems: true,
            items: { type: "string", enum: routeIds },
          },
          gap: {
            oneOf: [
              { type: "null" },
              { $ref: "#/$defs/ComponentCatalogGap" },
            ],
          },
        },
        oneOf: [
          {
            properties: {
              status: { const: "referenced" },
              instanceCount: { type: "integer", minimum: 1 },
              routeIds: { type: "array", minItems: 1 },
              gap: { type: "null" },
            },
          },
          {
            properties: {
              status: { const: "explicit-gap" },
              instanceCount: { const: 0 },
              routeIds: { type: "array", maxItems: 0 },
              gap: { $ref: "#/$defs/ComponentCatalogGap" },
            },
          },
        ],
      },
      VariantFacets: {
        type: "object",
        additionalProperties: false,
        properties: facetProperties,
      },
      ScreenVariant: {
        type: "object",
        additionalProperties: false,
        required: [
          "variantId",
          "pageState",
          "context",
          "facets",
          "components",
          "actionGaps",
          "viewStateFixtureIndex",
        ],
        properties: {
          variantId: {
            type: "string",
            pattern: "^[a-z0-9-]+(?:@[a-f0-9]{12})?$",
          },
          pageState: { type: "string", enum: pageStates },
          context: { $ref: "#/$defs/JsonObject" },
          facets: { $ref: "#/$defs/VariantFacets" },
          components: {
            type: "array",
            minItems: 1,
            items: { $ref: "#/$defs/ComponentNode" },
          },
          actionGaps: {
            type: "array",
            items: { $ref: "#/$defs/ActionGap" },
          },
          viewStateFixtureIndex: { type: "integer", minimum: 0 },
        },
      },
      RouteGap: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "source", "detail"],
        properties: {
          kind: {
            type: "string",
            enum: ["missing-route-fixture", "missing-view-state-fixture"],
          },
          source: {
            type: "string",
            enum: [SOURCE_PATHS.routeFixtures, SOURCE_PATHS.viewStateFixtures],
          },
          detail: { type: "string", minLength: 1 },
        },
      },
      RouteEvidence: {
        type: "object",
        additionalProperties: false,
        required: ["shellSource", "routeFixtureIndex", "viewStateFixtureIndices"],
        properties: {
          shellSource: { const: SOURCE_PATHS.routeContract },
          routeFixtureIndex: {
            type: ["integer", "null"],
            minimum: 0,
          },
          viewStateFixtureIndices: {
            type: "array",
            items: { type: "integer", minimum: 0 },
          },
        },
      },
      RouteNode: {
        type: "object",
        additionalProperties: false,
        required: [
          "routeId",
          "title",
          "shell",
          "status",
          "aliasFor",
          "variants",
          "gaps",
          "evidence",
        ],
        properties: {
          routeId: { type: "string", enum: routeIds },
          title: { type: "string", minLength: 1 },
          shell: { type: "string", enum: shells },
          status: { type: "string", enum: ["direct", "alias", "explicit-gap"] },
          aliasFor: {
            type: ["string", "null"],
            enum: [...routeIds, null],
          },
          variants: {
            type: "array",
            items: { $ref: "#/$defs/ScreenVariant" },
          },
          gaps: {
            type: "array",
            items: { $ref: "#/$defs/RouteGap" },
          },
          evidence: { $ref: "#/$defs/RouteEvidence" },
        },
        oneOf: [
          {
            properties: {
              status: { const: "direct" },
              aliasFor: { type: "null" },
              variants: { type: "array", minItems: 1 },
              gaps: { type: "array", maxItems: 0 },
            },
          },
          {
            properties: {
              status: { const: "alias" },
              aliasFor: { type: "string", enum: routeIds },
              variants: { type: "array", maxItems: 0 },
              gaps: { type: "array", maxItems: 0 },
            },
          },
          {
            properties: {
              status: { const: "explicit-gap" },
              aliasFor: { type: "null" },
              variants: { type: "array", maxItems: 0 },
              gaps: { type: "array", minItems: 1 },
            },
          },
        ],
      },
    },
  };
}

function validateInputs(inputs) {
  const routeIds = inputs.routeSchema.properties.id.enum;
  const shells = new Set(inputs.routeSchema.properties.shell.enum);
  const routeSet = new Set(routeIds);
  const contractIds = Object.keys(inputs.routeContract);
  assert(routeSet.size === routeIds.length, "route.schema.json contains duplicate RouteId values");
  assert(
    canonicalJson(contractIds.slice().sort()) === canonicalJson(routeIds.slice().sort()),
    "route-contract.js RouteId set must exactly match route.schema.json",
  );

  const routeFixtureMap = uniqueMap(inputs.routeFixtures, (item) => item.id, "route fixture");
  for (const { item } of routeFixtureMap.values()) {
    assertAllowedKeys(
      item,
      new Set(["_comment", ...Object.keys(inputs.routeSchema.properties)]),
      `route fixture ${item.id}`,
    );
    assert(routeSet.has(item.id), `route fixture references unknown route: ${item.id}`);
    assert(shells.has(item.shell), `route fixture ${item.id} has unknown shell: ${item.shell}`);
    assert(
      inputs.routeContract[item.id].shell === item.shell,
      `shell drift for ${item.id}: fixture=${item.shell}, route-contract=${inputs.routeContract[item.id].shell}`,
    );
    if (item.aliasFor != null) {
      assert(routeSet.has(item.aliasFor), `alias ${item.id} points to unknown route ${item.aliasFor}`);
    }
  }

  for (const routeId of routeIds) {
    const entry = inputs.routeContract[routeId];
    assert(entry && typeof entry.title === "string" && entry.title.length > 0, `route ${routeId} has no title`);
    assert(shells.has(entry.shell), `route-contract ${routeId} has unknown shell: ${entry.shell}`);
  }

  const viewRouteSet = new Set();
  const componentTypes = new Set(inputs.viewStateSchema.$defs.Component.properties.type.enum);
  const eventTypes = new Set(inputs.uiEventSchema.properties.type.enum);
  const semanticsByType = resolveComponentSemantics(inputs, [...componentTypes]);
  for (const [index, item] of inputs.viewStateFixtures.entries()) {
    assertAllowedKeys(
      item,
      new Set(["_comment", ...Object.keys(inputs.viewStateSchema.properties)]),
      `view-state fixture ${index}`,
    );
    assert(routeSet.has(item.routeId), `view-state fixture ${index} has unknown route ${item.routeId}`);
    viewRouteSet.add(item.routeId);
    const seen = new Set();
    const walk = (component) => {
      assertAllowedKeys(
        component,
        new Set(Object.keys(inputs.viewStateSchema.$defs.Component.properties)),
        `view-state fixture ${index} component ${component?.id ?? "missing"}`,
      );
      assert(componentTypes.has(component.type), `view-state fixture ${index} has unknown component ${component.type}`);
      assert(typeof component.id === "string" && component.id.length > 0, `view-state fixture ${index} has component without id`);
      assert(!seen.has(component.id), `view-state fixture ${index} duplicates component id ${component.id}`);
      assert(isPlainObject(component.props ?? {}), `view-state fixture ${index} component ${component.id} props must be object`);
      assert(Array.isArray(component.children ?? []), `view-state fixture ${index} component ${component.id} children must be array`);
      assert(Array.isArray(component.bindings ?? []), `view-state fixture ${index} component ${component.id} bindings must be array`);
      const bindingTargets = new Set();
      for (const binding of component.bindings ?? []) {
        assertAllowedKeys(binding, new Set(["target", "event", "payload", "trigger"]), `view-state fixture ${index} component ${component.id} binding`);
        assert(typeof binding.target === "string" && /^[a-z][a-z0-9.-]*$/.test(binding.target), `invalid binding target on ${component.id}`);
        assert(!bindingTargets.has(binding.target), `duplicate binding target ${component.id}/${binding.target}`);
        bindingTargets.add(binding.target);
        assert(eventTypes.has(binding.event), `unknown explicit UiEvent binding ${binding.event}`);
        assert(isPlainObject(binding.payload), `explicit binding payload must be object for ${binding.event}`);
        assert(["tap", "change", "submit", "appear"].includes(binding.trigger), `explicit binding trigger invalid for ${binding.event}`);
      }
      seen.add(component.id);
      for (const child of component.children ?? []) walk(child);
    };
    for (const component of item.components) walk(component);
  }

  for (const { item } of routeFixtureMap.values()) {
    if (item.aliasFor == null) {
      assert(viewRouteSet.has(item.id), `direct route fixture ${item.id} has no ViewState fixture`);
    } else {
      assert(!viewRouteSet.has(item.id), `alias route ${item.id} must not duplicate a direct ViewState fixture`);
    }
  }

  for (const [routeId, expected] of Object.entries(R16B_WORKFLOW_ROUTE_EXPECTATIONS)) {
    const routeFixture = routeFixtureMap.get(routeId)?.item;
    assert(routeFixture != null, `R16B ${expected.workflow} route fixture missing: ${routeId}`);
    assert(routeFixture.aliasFor == null, `R16B ${expected.workflow} route must be direct: ${routeId}`);
    assert(routeFixture.shell === expected.shell, `R16B ${expected.workflow} shell mismatch: ${routeId}`);

    const viewFixtures = inputs.viewStateFixtures.filter((item) => item.routeId === routeId);
    assert(viewFixtures.length === 1, `R16B ${expected.workflow} requires one direct ViewState: ${routeId}`);
    const viewFixture = viewFixtures[0];
    assert(viewFixture.pageState === expected.pageState, `R16B ${expected.workflow} pageState mismatch: ${routeId}`);
    assert(viewFixture[expected.facetKey] === expected.facetValue, `R16B ${expected.workflow} ${expected.facetKey} mismatch: ${routeId}`);
    for (const [key, value] of Object.entries(expected.context)) {
      assert(viewFixture.context?.[key] === value, `R16B ${expected.workflow} context.${key} mismatch: ${routeId}`);
    }

    const componentTypes = new Set();
    const events = new Set();
    const visit = (component) => {
      componentTypes.add(component.type);
      for (const property of EXPLICIT_EVENT_PROPERTIES) {
        if (typeof component.props?.[property] === "string") events.add(component.props[property]);
      }
      for (const binding of component.bindings ?? []) events.add(binding.event);
      for (const child of component.children ?? []) visit(child);
    };
    for (const component of viewFixture.components) visit(component);
    for (const type of expected.componentTypes) {
      assert(componentTypes.has(type), `R16B ${expected.workflow} component ${type} missing: ${routeId}`);
    }
    for (const event of expected.events) {
      assert(events.has(event), `R16B ${expected.workflow} UiEvent ${event} missing: ${routeId}`);
    }
  }

  return { routeIds, routeFixtureMap, semanticsByType };
}

function actionEvidence(component, eventTypes) {
  const bindings = [];
  const stateEventEvidence = [];
  const gaps = [];
  const props = component.props ?? {};
  const hasCanonicalExplicitEvent = [...EXPLICIT_EVENT_PROPERTIES]
    .some((property) => typeof props[property] === "string" && eventTypes.has(props[property]));

  for (const [property, value] of Object.entries(props)) {
    if (EXPLICIT_EVENT_PROPERTIES.has(property)) {
      if (typeof value === "string" && eventTypes.has(value)) {
        const payloadCandidate = props[`${property}Payload`] ?? props.uiEventPayload ?? {};
        if (isPlainObject(payloadCandidate)) {
          const triggerProperty = `${property}Trigger`;
          const trigger = props[triggerProperty];
          if (["tap", "change", "submit", "appear"].includes(trigger)) {
            bindings.push({
              target: "self",
              event: value,
              payload: plainClone(payloadCandidate),
              evidenceProperty: property,
              trigger,
            });
          } else if (trigger === "state-evidence") {
            stateEventEvidence.push({
              event: value,
              payload: plainClone(payloadCandidate),
              evidenceProperty: property,
              classification: "state-evidence",
            });
          } else {
            gaps.push({
              componentId: component.id,
              property: triggerProperty,
              value: plainClone(trigger ?? null),
              reason: trigger === undefined ? "missing-event-trigger" : "unsupported-event-trigger",
            });
          }
        } else {
          gaps.push({
            componentId: component.id,
            property,
            value: plainClone(value),
            reason: "unsupported-action-shape",
          });
        }
      } else {
        gaps.push({
          componentId: component.id,
          property,
          value: plainClone(value),
          reason: "unknown-ui-event",
        });
      }
      continue;
    }

    const triggerBase = [...EXPLICIT_EVENT_PROPERTIES]
      .find((eventProperty) => property === `${eventProperty}Trigger`);
    if (triggerBase && typeof props[triggerBase] !== "string") {
      gaps.push({
        componentId: component.id,
        property,
        value: plainClone(value),
        reason: "orphan-event-trigger",
      });
      continue;
    }

    if (ACTION_SHAPED_PROPERTY.test(property)) {
      if (property === "action" && typeof value === "string" && hasCanonicalExplicitEvent) continue;
      gaps.push({
        componentId: component.id,
        property,
        value: plainClone(value),
        reason: property === "action" && typeof value === "string"
          ? "label-without-ui-event"
          : "unsupported-action-shape",
      });
    }
  }

  for (const binding of component.bindings ?? []) {
    assert(eventTypes.has(binding.event), `unknown explicit UiEvent binding ${binding.event}`);
    assert(isPlainObject(binding.payload), `explicit binding payload must be object for ${binding.event}`);
    assert(["tap", "change", "submit", "appear"].includes(binding.trigger), `explicit binding trigger invalid for ${binding.event}`);
    bindings.push({
      target: binding.target,
      event: binding.event,
      payload: plainClone(binding.payload),
      evidenceProperty: "explicitBinding",
      trigger: binding.trigger,
    });
  }

  return { bindings, stateEventEvidence, gaps };
}

function normalizeComponent(component, eventTypes, actionGaps, semanticsByType) {
  const evidence = actionEvidence(component, eventTypes);
  const semantics = semanticsByType.get(component.type);
  actionGaps.push(...evidence.gaps);
  return {
    type: component.type,
    id: component.id,
    stateAuthorities: plainClone(semantics.stateAuthorities),
    compositionMode: semantics.compositionMode,
    props: plainClone(component.props ?? {}),
    children: (component.children ?? []).map((child) => normalizeComponent(child, eventTypes, actionGaps, semanticsByType)),
    bindings: evidence.bindings,
    stateEventEvidence: evidence.stateEventEvidence,
  };
}

function variantSelector(fixture) {
  const facets = {};
  for (const key of FACET_KEYS) {
    if (fixture[key] !== undefined) facets[key] = fixture[key];
  }
  return {
    pageState: fixture.pageState,
    context: plainClone(fixture.context ?? {}),
    facets,
  };
}

function buildVariants(entries, eventTypes, semanticsByType) {
  const pageStateCounts = new Map();
  const selectorKeys = new Set();
  for (const { item } of entries) {
    pageStateCounts.set(item.pageState, (pageStateCounts.get(item.pageState) ?? 0) + 1);
    const selectorKey = canonicalJson(variantSelector(item));
    assert(!selectorKeys.has(selectorKey), `duplicate ViewState selector for ${item.routeId}: ${selectorKey}`);
    selectorKeys.add(selectorKey);
  }

  return entries.map(({ item, index }) => {
    const selector = variantSelector(item);
    const suffix = pageStateCounts.get(item.pageState) === 1
      ? ""
      : `@${sha256(canonicalJson(selector)).slice(0, 12)}`;
    const actionGaps = [];
    return {
      variantId: `${item.pageState}${suffix}`,
      pageState: item.pageState,
      context: selector.context,
      facets: selector.facets,
      components: item.components.map((component) => normalizeComponent(component, eventTypes, actionGaps, semanticsByType)),
      actionGaps,
      viewStateFixtureIndex: index,
    };
  });
}

function assertAliasGraph(routes) {
  const byId = new Map(routes.map((route) => [route.routeId, route]));
  for (const route of routes) {
    if (route.aliasFor == null) continue;
    assert(byId.has(route.aliasFor), `orphan alias ${route.routeId} -> ${route.aliasFor}`);
    const visited = new Set([route.routeId]);
    let cursor = route;
    while (cursor.aliasFor != null) {
      assert(!visited.has(cursor.aliasFor), `alias cycle at ${route.routeId}: ${cursor.aliasFor}`);
      visited.add(cursor.aliasFor);
      cursor = byId.get(cursor.aliasFor);
      assert(cursor, `orphan alias ${route.routeId} -> ${cursor?.routeId ?? "missing"}`);
    }
    assert(cursor.status === "direct", `alias ${route.routeId} must resolve to a direct route, got ${cursor.status}`);
  }
}

export function buildScreenGraph(inputs = loadScreenGraphInputs()) {
  const { routeIds, routeFixtureMap, semanticsByType } = validateInputs(inputs);
  const eventTypes = new Set(inputs.uiEventSchema.properties.type.enum);
  const viewEntriesByRoute = new Map();
  for (const [index, item] of inputs.viewStateFixtures.entries()) {
    const entries = viewEntriesByRoute.get(item.routeId) ?? [];
    entries.push({ item, index });
    viewEntriesByRoute.set(item.routeId, entries);
  }

  const routes = routeIds.map((routeId) => {
    const contract = inputs.routeContract[routeId];
    const fixtureEntry = routeFixtureMap.get(routeId) ?? null;
    const aliasFor = fixtureEntry?.item.aliasFor ?? null;
    const viewEntries = viewEntriesByRoute.get(routeId) ?? [];
    let status;
    let variants = [];
    let gaps = [];

    if (aliasFor != null) {
      status = "alias";
    } else if (viewEntries.length > 0) {
      status = "direct";
      variants = buildVariants(viewEntries, eventTypes, semanticsByType);
    } else {
      status = "explicit-gap";
      if (fixtureEntry == null) {
        gaps.push({
          kind: "missing-route-fixture",
          source: SOURCE_PATHS.routeFixtures,
          detail: "No route fixture publishes alias/mainTab metadata; shell is retained from the canonical demo route contract.",
        });
      }
      gaps.push({
        kind: "missing-view-state-fixture",
        source: SOURCE_PATHS.viewStateFixtures,
        detail: "No direct ViewState fixture or alias publishes a component tree; no fallback component was synthesized.",
      });
    }

    return {
      routeId,
      title: contract.title,
      shell: contract.shell,
      status,
      aliasFor,
      variants,
      gaps,
      evidence: {
        shellSource: SOURCE_PATHS.routeContract,
        routeFixtureIndex: fixtureEntry?.index ?? null,
        viewStateFixtureIndices: viewEntries.map((entry) => entry.index),
      },
    };
  });

  assertAliasGraph(routes);
  const componentStats = new Map(
    inputs.viewStateSchema.$defs.Component.properties.type.enum.map((type) => [
      type,
      { instanceCount: 0, routeIds: new Set() },
    ]),
  );
  for (const route of routes) {
    for (const variant of route.variants) {
      walkComponents(variant.components, (component) => {
        const stat = componentStats.get(component.type);
        stat.instanceCount += 1;
        stat.routeIds.add(route.routeId);
      });
    }
  }
  const componentCatalog = [...componentStats].map(([type, stat]) => ({
    type,
    stateAuthorities: plainClone(semanticsByType.get(type).stateAuthorities),
    compositionMode: semanticsByType.get(type).compositionMode,
    status: stat.instanceCount > 0 ? "referenced" : "explicit-gap",
    instanceCount: stat.instanceCount,
    routeIds: [...stat.routeIds],
    gap: stat.instanceCount > 0
      ? null
      : {
          kind: "no-view-state-instance",
          source: SOURCE_PATHS.viewStateFixtures,
          detail: "The ComponentType is canonical but no current ViewState fixture references it; no synthetic component instance was created.",
        },
  }));
  return {
    schemaVersion: "1.2.0",
    generatedFrom: Object.values(SOURCE_PATHS),
    componentCatalog,
    routes,
  };
}

function walkComponents(components, visit) {
  for (const component of components) {
    visit(component);
    walkComponents(component.children, visit);
  }
}

export function validateScreenGraphSemantics(graph, inputs = loadScreenGraphInputs(), options = {}) {
  const routeIds = inputs.routeSchema.properties.id.enum;
  const routeSet = new Set(routeIds);
  const componentTypes = new Set(inputs.viewStateSchema.$defs.Component.properties.type.enum);
  const pageStates = new Set(inputs.viewStateSchema.properties.pageState.enum);
  const eventTypes = new Set(inputs.uiEventSchema.properties.type.enum);
  const semanticsByType = resolveComponentSemantics(inputs, [...componentTypes]);
  const graphIds = graph.routes.map((route) => route.routeId);
  assert(canonicalJson(graphIds) === canonicalJson(routeIds), "screen graph routes must match canonical RouteId order exactly");
  assert(new Set(graphIds).size === graphIds.length, "screen graph contains duplicate routes");

  const componentCatalogTypes = graph.componentCatalog.map((entry) => entry.type);
  const canonicalComponentTypes = inputs.viewStateSchema.$defs.Component.properties.type.enum;
  assert(
    canonicalJson(componentCatalogTypes) === canonicalJson(canonicalComponentTypes),
    "component catalog must match canonical ComponentType order exactly",
  );
  assert(
    new Set(componentCatalogTypes).size === componentCatalogTypes.length,
    "component catalog contains duplicate ComponentType values",
  );
  for (const entry of graph.componentCatalog) {
    const semantics = semanticsByType.get(entry.type);
    assert(canonicalJson(entry.stateAuthorities) === canonicalJson(semantics.stateAuthorities), `component catalog authority drift for ${entry.type}`);
    assert(entry.compositionMode === semantics.compositionMode, `component catalog composition drift for ${entry.type}`);
  }

  for (const route of graph.routes) {
    assert(routeSet.has(route.routeId), `screen graph has orphan route ${route.routeId}`);
    assert(route.shell === inputs.routeContract[route.routeId].shell, `screen graph shell drift for ${route.routeId}`);
    const variantIds = new Set();
    const selectorKeys = new Set();
    for (const variant of route.variants) {
      assert(!variantIds.has(variant.variantId), `duplicate variant ${route.routeId}/${variant.variantId}`);
      variantIds.add(variant.variantId);
      assert(pageStates.has(variant.pageState), `unknown pageState ${route.routeId}/${variant.pageState}`);
      const selectorKey = canonicalJson({
        pageState: variant.pageState,
        context: variant.context,
        facets: variant.facets,
      });
      assert(!selectorKeys.has(selectorKey), `duplicate selector ${route.routeId}/${variant.variantId}`);
      selectorKeys.add(selectorKey);

      const sourceFixture = inputs.viewStateFixtures[variant.viewStateFixtureIndex];
      assert(sourceFixture?.routeId === route.routeId, `view-state fixture index drift for ${route.routeId}/${variant.variantId}`);
      const sourceComponentsById = new Map();
      const collectSource = (components) => {
        for (const component of components) {
          sourceComponentsById.set(component.id, component);
          collectSource(component.children ?? []);
        }
      };
      collectSource(sourceFixture.components);

      const componentIds = new Set();
      const graphGaps = new Map(
        variant.actionGaps.map((gap) => [`${gap.componentId}\u0000${gap.property}`, gap]),
      );
      const expectedGaps = [];
      walkComponents(variant.components, (component) => {
        assert(componentTypes.has(component.type), `unknown ComponentType ${route.routeId}/${component.type}`);
        assert(!FORBIDDEN_PSEUDO_COMPONENTS.has(component.type), `forbidden pseudo component ${component.type}`);
        assert(!componentIds.has(component.id), `duplicate component id ${route.routeId}/${variant.variantId}/${component.id}`);
        componentIds.add(component.id);

        const sourceComponent = sourceComponentsById.get(component.id);
        assert(sourceComponent != null, `generated component has no ViewState source ${route.routeId}/${component.id}`);
        const semantics = semanticsByType.get(component.type);
        assert(canonicalJson(component.stateAuthorities) === canonicalJson(semantics.stateAuthorities), `component authority drift for ${route.routeId}/${component.id}`);
        assert(component.compositionMode === semantics.compositionMode, `component composition drift for ${route.routeId}/${component.id}`);

        const evidence = actionEvidence(sourceComponent, eventTypes);
        expectedGaps.push(...evidence.gaps);
        const bindingTargets = new Set();
        for (const binding of component.bindings) {
          assert(eventTypes.has(binding.event), `unknown UiEvent binding ${binding.event}`);
          assert(typeof binding.target === "string" && /^[a-z][a-z0-9.-]*$/.test(binding.target), `binding target invalid for ${binding.event}`);
          assert(!bindingTargets.has(binding.target), `duplicate binding target ${component.id}/${binding.target}`);
          bindingTargets.add(binding.target);
          assert(isPlainObject(binding.payload), `binding payload must be object for ${binding.event}`);
          assert(["tap", "change", "submit", "appear"].includes(binding.trigger), `binding trigger invalid for ${binding.event}`);
          if (binding.evidenceProperty === "explicitBinding") {
            assert(binding.target !== "self", `explicit binding on ${component.id} must name a semantic target`);
          } else {
            assert(
              component.props[binding.evidenceProperty] === binding.event,
              `binding ${binding.event} has no matching fixture evidence on ${component.id}`,
            );
          }
        }
        for (const evidenceEntry of component.stateEventEvidence) {
          assert(eventTypes.has(evidenceEntry.event), `unknown state event evidence ${evidenceEntry.event}`);
          assert(isPlainObject(evidenceEntry.payload), `state event evidence payload must be object for ${evidenceEntry.event}`);
          assert(evidenceEntry.classification === "state-evidence", `invalid state event classification for ${evidenceEntry.event}`);
          assert(
            component.props[evidenceEntry.evidenceProperty] === evidenceEntry.event,
            `state event evidence ${evidenceEntry.event} has no matching fixture evidence on ${component.id}`,
          );
        }
        assert(
          canonicalJson(component.bindings) === canonicalJson(evidence.bindings),
          `typed binding drift for ${route.routeId}/${variant.variantId}/${component.id}`,
        );
        assert(
          canonicalJson(component.stateEventEvidence) === canonicalJson(evidence.stateEventEvidence),
          `state event evidence drift for ${route.routeId}/${variant.variantId}/${component.id}`,
        );
      });

      for (const gap of variant.actionGaps) {
        assert(componentIds.has(gap.componentId), `action gap points to missing component ${gap.componentId}`);
      }
      assert(
        canonicalJson(variant.actionGaps) === canonicalJson(expectedGaps),
        `action gap drift for ${route.routeId}/${variant.variantId}`,
      );
      assert(graphGaps.size === variant.actionGaps.length, `duplicate action gap for ${route.routeId}/${variant.variantId}`);
    }
  }

  assertAliasGraph(graph.routes);

  const actualComponentStats = new Map(
    canonicalComponentTypes.map((type) => [type, { instanceCount: 0, routeIds: new Set() }]),
  );
  for (const route of graph.routes) {
    for (const variant of route.variants) {
      walkComponents(variant.components, (component) => {
        const stat = actualComponentStats.get(component.type);
        stat.instanceCount += 1;
        stat.routeIds.add(route.routeId);
      });
    }
  }
  for (const entry of graph.componentCatalog) {
    const stat = actualComponentStats.get(entry.type);
    assert(entry.instanceCount === stat.instanceCount, `component catalog count drift for ${entry.type}`);
    assert(canonicalJson(entry.routeIds) === canonicalJson([...stat.routeIds]), `component catalog routes drift for ${entry.type}`);
    if (stat.instanceCount === 0) {
      assert(entry.status === "explicit-gap" && entry.gap != null, `unused ComponentType ${entry.type} must be explicit-gap`);
    } else {
      assert(entry.status === "referenced" && entry.gap == null, `used ComponentType ${entry.type} must be referenced`);
    }
  }

  if (options.requireSourceParity !== false) {
    const expected = buildScreenGraph(inputs);
    assert(formatJson(graph) === formatJson(expected), "screen graph differs from deterministic canonical generation");
  }
  return true;
}

export function buildScreenGraphCoverage(graph, inputs = loadScreenGraphInputs()) {
  const statusCounts = { direct: 0, alias: 0, "explicit-gap": 0 };
  const usedComponents = new Set();
  const gapRouteIds = [];
  const actionGapCounts = {};
  let variants = 0;
  let components = 0;
  let bindings = 0;
  let stateEventEvidence = 0;
  let actionGaps = 0;
  let variantsWithActionGaps = 0;
  const componentFixtureEvidence = new Map(
    graph.componentCatalog.map((entry) => [entry.type, {
      type: entry.type,
      catalogStatus: entry.status,
      instanceCount: 0,
      typeOnlyInstanceCount: 0,
      propKeys: new Set(),
      childTypes: new Set(),
      executableBindings: 0,
      stateEventEvidence: 0,
    }]),
  );

  for (const route of graph.routes) {
    statusCounts[route.status] += 1;
    if (route.status === "explicit-gap") gapRouteIds.push(route.routeId);
    variants += route.variants.length;
    for (const variant of route.variants) {
      actionGaps += variant.actionGaps.length;
      if (variant.actionGaps.length > 0) variantsWithActionGaps += 1;
      for (const gap of variant.actionGaps) {
        actionGapCounts[gap.reason] = (actionGapCounts[gap.reason] ?? 0) + 1;
      }
      walkComponents(variant.components, (component) => {
        components += 1;
        usedComponents.add(component.type);
        bindings += component.bindings.length;
        stateEventEvidence += component.stateEventEvidence.length;
        const evidence = componentFixtureEvidence.get(component.type);
        evidence.instanceCount += 1;
        for (const key of Object.keys(component.props)) evidence.propKeys.add(key);
        for (const child of component.children) evidence.childTypes.add(child.type);
        evidence.executableBindings += component.bindings.length;
        evidence.stateEventEvidence += component.stateEventEvidence.length;
        if (
          Object.keys(component.props).length === 0 &&
          component.children.length === 0 &&
          component.bindings.length === 0 &&
          component.stateEventEvidence.length === 0
        ) {
          evidence.typeOnlyInstanceCount += 1;
        }
      });
    }
  }

  const canonicalComponents = inputs.viewStateSchema.$defs.Component.properties.type.enum;
  const missingRouteFixtureIds = inputs.routeSchema.properties.id.enum.filter(
    (routeId) => !inputs.routeFixtures.some((fixture) => fixture.id === routeId),
  );
  const componentFixtureEvidenceRecords = graph.componentCatalog.map((entry) => {
    const evidence = componentFixtureEvidence.get(entry.type);
    const evidenceClass = entry.status === "explicit-gap"
      ? "explicit-gap"
      : evidence.typeOnlyInstanceCount === evidence.instanceCount
        ? "type-only"
        : evidence.typeOnlyInstanceCount > 0
          ? "partial"
          : "data-backed";
    return {
      type: entry.type,
      catalogStatus: entry.status,
      evidenceClass,
      instanceCount: evidence.instanceCount,
      typeOnlyInstanceCount: evidence.typeOnlyInstanceCount,
      propKeys: [...evidence.propKeys].sort(),
      childTypes: [...evidence.childTypes].sort(),
      executableBindings: evidence.executableBindings,
      stateEventEvidence: evidence.stateEventEvidence,
    };
  });
  const componentFixtureEvidenceSummary = {};
  for (const entry of componentFixtureEvidenceRecords) {
    componentFixtureEvidenceSummary[entry.evidenceClass] =
      (componentFixtureEvidenceSummary[entry.evidenceClass] ?? 0) + 1;
  }

  return {
    schemaVersion: "1.2.0",
    graphSha256: sha256(formatJson(graph)),
    canonicalRoutes: inputs.routeSchema.properties.id.enum.length,
    graphRoutes: graph.routes.length,
    routeFixtureRoutes: inputs.routeFixtures.length,
    directRoutes: statusCounts.direct,
    aliasRoutes: statusCounts.alias,
    resolvableRoutes: statusCounts.direct + statusCounts.alias,
    explicitGapRoutes: statusCounts["explicit-gap"],
    viewStateFixtures: inputs.viewStateFixtures.length,
    variants,
    componentInstances: components,
    canonicalComponentTypes: canonicalComponents.length,
    componentCatalogTypes: graph.componentCatalog.length,
    usedComponentTypes: usedComponents.size,
    referencedComponentTypes: graph.componentCatalog.filter((entry) => entry.status === "referenced").length,
    explicitGapComponentTypes: graph.componentCatalog.filter((entry) => entry.status === "explicit-gap").length,
    unusedComponentTypes: canonicalComponents.filter((type) => !usedComponents.has(type)),
    componentFixtureEvidenceSummary,
    componentFixtureEvidence: componentFixtureEvidenceRecords,
    hostCompositeComponentTypes: graph.componentCatalog
      .filter((entry) => entry.compositionMode === "host-composite")
      .map((entry) => entry.type),
    typedActionBindings: bindings,
    explicitTargetBindings: graph.routes.reduce((total, route) => total + route.variants.reduce((routeTotal, variant) => {
      let count = 0;
      walkComponents(variant.components, (component) => {
        count += component.bindings.filter((binding) => binding.evidenceProperty === "explicitBinding").length;
      });
      return routeTotal + count;
    }, 0), 0),
    stateEventEvidence,
    totalCanonicalEventEvidence: bindings + stateEventEvidence,
    explicitActionGaps: actionGaps,
    variantsWithActionGaps,
    actionGapsByReason: Object.fromEntries(Object.entries(actionGapCounts).sort(([a], [b]) => a.localeCompare(b))),
    missingRouteFixtureIds,
    explicitGapRouteIds: gapRouteIds,
    proofBoundary: {
      graphGreenMeans: "canonical route/shell/alias/direct fixture tree/gap consistency",
      graphGreenDoesNotMean: [
        "iOS native renderer complete",
        "Android native renderer complete",
        "HarmonyOS native renderer complete",
        "Authoritative rollout enabled",
        "type-only or partial component fixtures contain enough semantic data for a native renderer",
      ],
    },
  };
}

export function buildScreenGraphArtifacts(inputs = loadScreenGraphInputs()) {
  const schema = buildScreenGraphSchema(inputs);
  const graph = buildScreenGraph(inputs);
  const coverage = buildScreenGraphCoverage(graph, inputs);
  const canonicalGraphJson = canonicalJson(graph);
  const nativeRegistry = buildNativeRegistryArtifacts(
    graph,
    inputs,
    canonicalGraphJson,
    sha256(canonicalGraphJson),
  );
  return { schema, graph, coverage, nativeRegistry };
}

export function writeScreenGraphArtifacts(artifacts = buildScreenGraphArtifacts()) {
  const jsonOutputs = [
    [SCREEN_GRAPH_SCHEMA_PATH, artifacts.schema],
    [SCREEN_GRAPH_PATH, artifacts.graph],
    [SCREEN_GRAPH_COVERAGE_PATH, artifacts.coverage],
  ];
  const sourceOutputs = Object.entries(artifacts.nativeRegistry.outputs);
  for (const [relativePath, value] of jsonOutputs) {
    writeFileSync(join(REPO_ROOT, relativePath), formatJson(value));
  }
  for (const [relativePath, value] of sourceOutputs) {
    writeFileSync(join(REPO_ROOT, relativePath), value);
  }
  return [...jsonOutputs, ...sourceOutputs].map(([relativePath]) => relativePath);
}

export function checkScreenGraphArtifactBytes(artifacts = buildScreenGraphArtifacts()) {
  const outputs = [
    [SCREEN_GRAPH_SCHEMA_PATH, formatJson(artifacts.schema)],
    [SCREEN_GRAPH_PATH, formatJson(artifacts.graph)],
    [SCREEN_GRAPH_COVERAGE_PATH, formatJson(artifacts.coverage)],
    ...Object.entries(artifacts.nativeRegistry.outputs),
  ];
  for (const [relativePath, expected] of outputs) {
    const absolutePath = join(REPO_ROOT, relativePath);
    assert(existsSync(absolutePath), `missing generated screen graph artifact: ${relativePath}`);
    assert(
      readFileSync(absolutePath, "utf8") === expected,
      `screen graph artifact drift: ${relativePath}; run node tools/screen-graph/generate-screen-graph.mjs`,
    );
  }
  return true;
}
