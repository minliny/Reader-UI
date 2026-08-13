// Reader-UI Control Identity TypeScript contract
// Source of truth: contracts/control-identity.schema.json
// A0 + identity-token boundary (2026-07-22, baseline a6993b4, schema 1.4.0)
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
 *
 * R1.2 three-layer identity:
 *   - entityKey  : {domain}.{family}.{role}[.{actionKey}] (logical entity)
 *   - controlKey : {entityKey}@{route}.{state}[.{instanceKey}] (route/state occurrence)
 *   - controlId  : DOM occurrence tracking id (retained from R1 for audit)
 *
 * R1.2 key change: actionKey is derived ONLY from the explicit semantic
 * attribute whitelist (data-action / data-route / data-route-back / etc.).
 * It is never inferred from label / text / class / selector / role. When no
 * explicit semantic attribute is present, actionKey = null and mappingStatus
 * = pending-explicit-semantics.
 */
export interface ControlIdentity {
  /**
   * R1.2: DOM occurrence tracking id (NOT the logical identity).
   * Retained from R1 for audit reproducibility and DOM tracking. The logical
   * identity is split into `entityKey` (cross-route/state/viewport entity)
   * and `controlKey` (per route/state occurrence).
   */
  controlId: string;
  /**
   * R1.2: Logical control entity identity (3+ atoms):
   * `{domain}.{family}.{role}[.{actionKey}]`. Shared across every
   * route/state/viewport occurrence of the same logical control. Computed
   * ONLY from domain / family / role / actionKey (explicit semantic whitelist);
   * never depends on selector / label / variantId / domTag / viewport / DOM order.
   * When actionKey is null, entityKey = {domain}.{family}.{role} (pending).
   */
  entityKey: string;
  /**
   * R1.2: Logical control occurrence in (route, state):
   * `{entityKey}@{route}.{state}[.{instanceKey}]`. Viewport-independent.
   * When instanceKey is non-null, it disambiguates multiple occurrences.
   * When instanceKey is null and multiple occurrences exist, an ordinal
   * (n0, n1, ...) sorted by candidateKey is used and mappingStatus
   * = pending-instance-disambiguation.
   */
  controlKey: string;
  /**
   * R1.2: Explicit semantic action key, derived ONLY from the whitelist:
   * data-action (value is the actionKey), data-route (-> 'route.push'),
   * data-route-replace (-> 'route.replace'), data-route-back (-> 'route.back'),
   * data-demo-back (-> 'route.back'). null when no explicit semantic attribute
   * is present; mappingStatus = pending-explicit-semantics. Never inferred
   * from label / text / class / selector / role.
   */
  actionKey: string | null;
  /**
   * R1.2: Explicit instance disambiguator, derived from instance identifier
   * attributes (data-instance / data-book-id / data-reader-tts-timer-value /
   * data-rss-source-id / etc.). null when no instance attribute is present.
   * When multiple occurrences of the same (route, state, entityKey) all have
   * null instanceKey, needsInstanceKey = true.
   */
  instanceKey: string | null;
  /**
   * A0 (schema 1.3.0): Independent boolean flag — true when actionKey is null.
   * Independent of needsInstanceKey; both can be true simultaneously.
   * mappingStatus is derived from the (needsActionKey, needsInstanceKey) pair.
   */
  needsActionKey: boolean;
  /**
   * A0 (schema 1.3.0): Independent boolean flag — true when the entry belongs
   * to a multi-occurrence (route, state, entityKey) group with null instanceKey
   * and ordinal fallback was applied. Independent of needsActionKey; both can
   * be true simultaneously. mappingStatus is derived from the pair.
   */
  needsInstanceKey: boolean;
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
  /**
   * A0 (schema 1.3.0): Derived from (needsActionKey, needsInstanceKey).
   * Read-only — callers MUST set needsActionKey / needsInstanceKey instead.
   */
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
  | "mapped"
  | "pending-action-key"
  | "pending-instance-key"
  | "pending-action-and-instance-key";

export interface ControlIdentitySource {
  candidateKey: string;
  selectorSha256: string;
  semanticStatus: "semantic-control" | "suspected-nonsemantic-control";
  domTag?: string;
  label?: string | null;
  uiEvent?: string | null;
  /** Stable DOM-only vocabulary; explicitly not a released cross-platform UiEvent. */
  controlIdentityToken?: string | null;
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
    /** A0 (1.3.0): both needsActionKey=false and needsInstanceKey=false. */
    mapped: number;
    /** A0 (1.3.0): needsActionKey=true, needsInstanceKey=false. */
    pendingActionKey: number;
    /** A0 (1.3.0): needsActionKey=false, needsInstanceKey=true. */
    pendingInstanceKey: number;
    /** A0 (1.3.0): both needsActionKey=true and needsInstanceKey=true. */
    pendingActionAndInstanceKey: number;
    uniqueControlIds: number;
    /** R1.1: unique entityKey count (logical entities). */
    uniqueEntityKeys: number;
    /** R1.1: unique controlKey count (route/state occurrences). */
    uniqueControlKeys: number;
    /** R1.2: unique actionKey count (explicit semantic actions). */
    uniqueActionKeys: number;
    /** R1.2: unique instanceKey count (explicit instance disambiguators). */
    uniqueInstanceKeys: number;
    pendingFigmaJoin: number;
    nonInteractiveContainers: number;
  };
  entries: ControlIdRegistryEntry[];
}

/**
 * DOM identity mapping record. Describes how a logical `controlId` lands on
 * the DOM via the `data-control-id` attribute.
 */
export interface DomIdentityMapEntry {
  /** Logical control identity (no viewport atom). */
  controlId: string;
  /** R1.2: Explicit semantic action key (null when pending). */
  actionKey: string | null;
  /** R1.2: Explicit instance disambiguator (null when not present). */
  instanceKey: string | null;
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
  suspectedReasons?: string[];
  containsUnenumeratedSubcontrols?: boolean;
  expectedSubcontrolType?: "switch" | "select" | "segment" | "stepper";
  /**
   * R1.2: Expected interactive sub-control count for settings rows.
   * - is-switch rows: 1 (the switch itself)
   * - is-select rows: 1 (the combobox)
   * - is-segment rows: 3 (three option buttons)
   * - is-stepper rows: 2 (decrement + increment buttons)
   * R2.0.1 will enumerate these into the canonical registry.
   */
  expectedSubcontrolCount?: number;
  pureContainer?: boolean;
}

export interface NonInteractiveContainers {
  schemaVersion: string;
  generatedAt: string;
  totals: {
    entries: number;
    byRole: Record<string, number>;
    byRoute: Record<string, number>;
    /** R1.2: sum of expectedSubcontrolCount across all settings rows. */
    totalExpectedSubcontrols: number;
  };
  entries: NonInteractiveContainerEntry[];
}
