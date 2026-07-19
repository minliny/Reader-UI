// Reader-UI Control Identity TypeScript contract
// Source of truth: contracts/control-identity.schema.json
// R1 · Control Identity 修复 (2026-07-20, baseline e35e739)
//
// This file is hand-curated to match the JSON Schema; regenerating it from
// the schema requires the codegen pipeline (see tools/interaction-inventory/codegen-control-ids.mjs).

/**
 * Canonical logical control identity. The string form
 * `{domain}.{family}.{route}.{state}.{role}[.discriminator]`
 * is the stable join key across Figma / ScreenGraph / Web DOM / native runtimes.
 *
 * Viewport is intentionally excluded from `controlId` so that Phone / Compact /
 * Tablet / Fold share the same logical id. The viewport instance is carried by
 * the separate `viewport` field on `ControlIdentity` and on `DomIdentityMapEntry`.
 */
export interface ControlIdentity {
  /** Canonical logical control identity string (no viewport atom). */
  controlId: string;
  /** Product domain; matches ScreenGraph runtimeFamily. */
  domain: ControlDomain;
  /** Component family derived from DOM tag + ARIA role + class hints. */
  family: ControlFamily;
  /** ScreenGraph routeId (kebab-case). */
  route: string;
  /** Variant pageState (kebab-case). */
  state: string;
  /** Viewport instance for this entry. Not part of controlId. */
  viewport: ControlViewport;
  /** Semantic role atom. */
  role: ControlRole;
  /** Stable disambiguator within (domain, family, route, state, role). */
  discriminator: string;
  /** Source audit provenance. */
  source: ControlIdentitySource;
  /** Whether the candidate was auto-mapped or requires manual mapping. */
  mappingStatus: ControlMappingStatus;
  /** Optional human-readable mapping explanation. */
  mappingNotes: string | null;
  /** ScreenGraph component instance binding, if any. */
  screenGraphBinding: ScreenGraphBinding | null;
  /** Reserved Figma node id; always null in R1 baseline. */
  figmaNodeCandidate: string | null;
  /** Figma join status; always 'pending-figma-join' in R1 baseline. */
  figmaJoinStatus: "pending-figma-join" | "joined";
  /** Optional non-interactive-container marker; null in canonical registry. */
  nonInteractiveContainer: boolean | null;
}

export type ControlDomain =
  | "discover"
  | "import"
  | "library"
  | "onboarding"
  | "reader"
  | "rss"
  | "settings"
  | "source"
  | "source-switch"
  | "sync"
  | "system"
  | "web-auth";

export type ControlFamily =
  | "button"
  | "icon-button"
  | "link"
  | "switch"
  | "checkbox"
  | "radio"
  | "slider"
  | "textbox"
  | "searchbox"
  | "combobox"
  | "option"
  | "tab"
  | "menuitem"
  | "menuitemcheckbox"
  | "menuitemradio"
  | "summary"
  | "listrow-action"
  | "treeitem"
  | "generic-button";

export type ControlViewport = "phone" | "compact" | "tablet" | "fold";

export type ControlRole =
  | "button"
  | "checkbox"
  | "combobox"
  | "link"
  | "menuitem"
  | "menuitemcheckbox"
  | "menuitemradio"
  | "option"
  | "radio"
  | "searchbox"
  | "slider"
  | "switch"
  | "tab"
  | "textbox"
  | "treeitem"
  | "summary";

export type ControlMappingStatus =
  | "auto-mapped"
  | "needs-manual-mapping"
  | "ambiguous-needs-review";

export interface ControlIdentitySource {
  candidateKey: string;
  selectorSha256: string;
  semanticStatus: "semantic-control" | "suspected-nonsemantic-control";
  domTag?: string;
  label?: string | null;
  uiEvent?: string | null;
  dataAttributes?: Record<string, string>;
}

export interface ScreenGraphBinding {
  componentInstanceId: string | null;
  componentType: string | null;
  bindingStatus: "bound" | "unresolved" | "pending-figma-join";
}

/**
 * Registry entry record as persisted to
 * `tools/interaction-inventory/generated/control-id-registry.json`.
 *
 * R1 change: `firstMaterializedAt` and `schemaVersion` are removed from
 * per-entry records. `schemaVersion` lives on the registry top-level object;
 * `firstMaterializedAt` was a fixed timestamp with no drift value.
 */
export type ControlIdRegistryEntry = ControlIdentity;

export interface ControlIdRegistry {
  schemaVersion: string;
  generatedAt: string;
  generatedFrom: {
    inventoryPath: string;
    inventorySha256: string;
    screenGraphPath: string;
    screenGraphSha256: string;
    generatorPath: string;
  };
  totals: {
    candidates: number;
    semanticControls: number;
    suspectedNonSemanticControls: number;
    autoMapped: number;
    needsManualMapping: number;
    ambiguousNeedsReview: number;
    uniqueControlIds: number;
    pendingFigmaJoin: number;
    nonInteractiveContainers: number;
  };
  entries: ControlIdRegistryEntry[];
}

/**
 * DOM identity mapping record. Describes how a logical `controlId` lands on
 * the DOM via the `data-control-id` attribute. The `data-control-id` value
 * is the logical id (no viewport); the viewport instance is carried by the
 * separate `data-viewport` DOM attribute (see dom-identity.ts).
 *
 * Persisted to `tools/interaction-inventory/generated/dom-identity-map.json`.
 */
export interface DomIdentityMapEntry {
  /** Logical control identity (no viewport atom). */
  controlId: string;
  /** CSS attribute selector that uniquely resolves the control in the rendered DOM. */
  domSelector: string;
  /** Stable selector SHA-256, inherited from the IC0 audit. */
  selectorSha256: string;
  /** The `data-control-id` value to set on the matched element (logical id). */
  dataControlId: string;
  /** Route where this selector was first observed. */
  routeId: string;
  /** Viewport where this selector was first observed. */
  viewport: ControlViewport;
}

export interface DomIdentityMap {
  schemaVersion: string;
  generatedAt: string;
  entries: DomIdentityMapEntry[];
}

/**
 * Non-interactive ARIA container record (group/section). Persisted to
 * `tools/interaction-inventory/generated/nonInteractiveContainers.json`.
 * These candidates are excluded from the canonical registry because they are
 * ARIA container roles, not interactive controls.
 */
export interface NonInteractiveContainerEntry {
  candidateKey: string;
  selectorSha256: string;
  routeId: string;
  state: string;
  viewport: ControlViewport;
  role: "group" | "section";
  domTag: string;
  label: string | null;
  dataAttributes: Record<string, string>;
  exclusionReason: "aria-container-role";
}

export interface NonInteractiveContainers {
  schemaVersion: string;
  generatedAt: string;
  totals: {
    entries: number;
    byRole: Record<string, number>;
    byRoute: Record<string, number>;
  };
  entries: NonInteractiveContainerEntry[];
}
