// Reader-UI Control Identity — DOM identity infrastructure
// Source of truth: contracts/control-identity.schema.json
// R1.1 · 三层身份分离 (2026-07-20, baseline 9f7a0f5)
//
// This module is the framework-agnostic DOM identity layer. Page renderers
// (B1/B2/B3/B4 work packages) MUST consume `setDataControlId` + `setDataViewport`
// to stamp the canonical logical identity + viewport instance onto the root
// element of every interactive control. Tests MUST consume `resolveControlId` /
// `querySelectorForControlId` to locate controls by their canonical logical id.
//
// R1.1 design (three-layer identity):
//   `data-entity-key`  : logical control ENTITY (cross route/state/viewport)
//                        format: {domain}.{family}.{role}[.semantic-intent]
//   `data-control-key` : logical control OCCURRENCE in (route, state)
//                        format: {entityKey}@{route}.{state}
//                        shared across viewports; shared across multiple DOM
//                        occurrences of the same logical control in (route,state)
//   `data-control-id`  : DOM occurrence TRACKING id (retained from R1)
//                        format: {domain}.{family}.{route}.{state}.{role}[.discriminator]
//                        unique per DOM occurrence; carries the R1 hash for audit
//   `data-viewport`    : viewport instance (phone/compact/tablet/fold)
//
// R1 `data-control-id` is retained for backward compatibility with R1 page
// renderers. R2 page renderers MUST stamp all four attributes so the runtime
// can resolve controls by logical entity (cross-route), by route/state
// occurrence (cross-viewport), and by per-occurrence tracking id.

export type { ControlIdentity, ControlIdRegistryEntry, ControlIdRegistry, DomIdentityMap, DomIdentityMapEntry, ScreenGraphBinding } from "../../contracts/control-identity.types";
export { ControlDomain, ControlFamily, ControlViewport, ControlRole, ControlMappingStatus } from "../../contracts/control-identity.types";

/**
 * The DOM attribute used to stamp a canonical logical controlId onto an element.
 * Page renderers MUST set this attribute on the root element of every
 * interactive control. The value is the canonical logical controlId string
 * (no viewport atom); the viewport instance is carried by `data-viewport`.
 */
export const DATA_CONTROL_ID_ATTRIBUTE = "data-control-id" as const;

/**
 * The DOM attribute used to declare the viewport instance for an element.
 * Pair with `data-control-id` so the same logical identity can carry multiple
 * viewport instances (phone / compact / tablet / fold).
 */
export const DATA_VIEWPORT_ATTRIBUTE = "data-viewport" as const;

/**
 * The DOM attribute used to declare the candidate join key for an element.
 * Reserved for the Figma backfill phase; currently always empty.
 */
export const DATA_CONTROL_CANDIDATE_KEY_ATTRIBUTE = "data-control-candidate-key" as const;

/**
 * R1.1: The DOM attribute used to stamp the logical ENTITY key onto an
 * element. Value format: `{domain}.{family}.{role}[.semantic-intent]`.
 *
 * This is the cross-route/state/viewport logical identity. The same entityKey
 * is shared by every DOM occurrence of the same logical control, regardless
 * of which route / state / viewport it appears in. Page renderers MUST set
 * this attribute so the runtime can group DOM nodes by logical entity.
 *
 * Computed ONLY from domain / family / role / stable data-* semantic-intent;
 * never depends on selector / label / variantId / domTag / viewport / DOM
 * order. See `tools/interaction-inventory/interaction-inventory-lib.mjs`
 * `buildEntityKey` for the canonical computation.
 */
export const DATA_ENTITY_KEY_ATTRIBUTE = "data-entity-key" as const;

/**
 * R1.1: The DOM attribute used to stamp the route/state occurrence key onto
 * an element. Value format: `{entityKey}@{route}.{state}`.
 *
 * This is the per-(route, state) occurrence identity, shared across
 * viewports (phone/compact/tablet/fold). Multiple DOM occurrences of the
 * same logical control in the same (route, state) SHARE the same controlKey;
 * per-occurrence disambiguation is the responsibility of `data-control-id`.
 */
export const DATA_CONTROL_KEY_ATTRIBUTE = "data-control-key" as const;

/**
 * A0 (schema 1.3.0): The four canonical mappingStatus values, derived from
 * the independent (needsActionKey, needsInstanceKey) pair. Source of truth:
 * contracts/control-identity.schema.json `mappingStatus.enum`.
 */
export const MAPPING_STATUS_VALUES = Object.freeze([
  "mapped",
  "pending-action-key",
  "pending-instance-key",
  "pending-action-and-instance-key",
] as const);

export type ControlMappingStatusValue = (typeof MAPPING_STATUS_VALUES)[number];

/**
 * A0 (schema 1.3.0): The three pending mappingStatus values. Entries in any
 * of these states MUST NOT be stamped onto the DOM as `data-control-key` —
 * the controlKey is provisional until both the action and instance gaps are
 * resolved (mappingStatus === "mapped").
 */
export const PENDING_MAPPING_STATUS_VALUES = Object.freeze([
  "pending-action-key",
  "pending-instance-key",
  "pending-action-and-instance-key",
] as const);

/**
 * A0 (schema 1.3.0): Fail-closed guard for `data-control-key` writes.
 *
 * Page renderers MUST call this before `setDataControlKey` to assert that
 * the entry's mappingStatus is "mapped". Writing a pending controlKey to
 * the DOM would leak provisional identity into the runtime, breaking the
 * A0 invariant "禁止 pending identity 写入正式 data-control-key".
 *
 * Throws when mappingStatus is any pending-* value or an unknown value.
 */
export function assertMappingStatusAllowsControlKeyWrite(
  mappingStatus: string,
  context?: string,
): void {
  if (mappingStatus === "mapped") return;
  if ((PENDING_MAPPING_STATUS_VALUES as readonly string[]).includes(mappingStatus)) {
    const suffix = context ? ` (context: ${context})` : "";
    throw new Error(
      `assertMappingStatusAllowsControlKeyWrite: refusing to write data-control-key for pending mappingStatus="${mappingStatus}"${suffix}; ` +
        `resolve the action/instance gap first so mappingStatus becomes "mapped".`,
    );
  }
  const suffix = context ? ` (context: ${context})` : "";
  throw new Error(
    `assertMappingStatusAllowsControlKeyWrite: unknown mappingStatus="${mappingStatus}"${suffix}; ` +
      `expected one of: ${MAPPING_STATUS_VALUES.join(", ")}.`,
  );
}

/**
 * Set the canonical logical controlId on a DOM element. Future page renderers
 * MUST call this on the root element of every interactive control.
 *
 * The element is returned for chaining. The function is a no-op when the
 * element is null/undefined so it can be safely called from conditional
 * render paths.
 */
export function setDataControlId(element: Element | null | undefined, controlId: string): Element | null {
  if (!element) return null;
  if (typeof controlId !== "string" || controlId.length === 0) {
    throw new Error(`setDataControlId requires a non-empty controlId, received: ${String(controlId)}`);
  }
  element.setAttribute(DATA_CONTROL_ID_ATTRIBUTE, controlId);
  return element;
}

/**
 * Read the canonical logical controlId from a DOM element. Returns null when the
 * attribute is absent.
 */
export function getDataControlId(element: Element | null | undefined): string | null {
  if (!element) return null;
  const value = element.getAttribute(DATA_CONTROL_ID_ATTRIBUTE);
  return value && value.length > 0 ? value : null;
}

/**
 * Set the viewport instance attribute on a DOM element. Pair with
 * `setDataControlId` so the same logical identity can carry multiple
 * viewport instances.
 */
export function setDataViewport(element: Element | null | undefined, viewport: string): Element | null {
  if (!element) return null;
  if (typeof viewport !== "string" || viewport.length === 0) {
    throw new Error(`setDataViewport requires a non-empty viewport, received: ${String(viewport)}`);
  }
  element.setAttribute(DATA_VIEWPORT_ATTRIBUTE, viewport);
  return element;
}

/**
 * Read the viewport instance attribute from a DOM element. Returns null when
 * the attribute is absent.
 */
export function getDataViewport(element: Element | null | undefined): string | null {
  if (!element) return null;
  const value = element.getAttribute(DATA_VIEWPORT_ATTRIBUTE);
  return value && value.length > 0 ? value : null;
}

/**
 * R1.1: Set the logical ENTITY key on a DOM element. Page renderers MUST call
 * this on the root element of every interactive control alongside
 * `setDataControlKey` and `setDataControlId`. The element is returned for
 * chaining. No-op when the element is null/undefined.
 */
export function setDataEntityKey(element: Element | null | undefined, entityKey: string): Element | null {
  if (!element) return null;
  if (typeof entityKey !== "string" || entityKey.length === 0) {
    throw new Error(`setDataEntityKey requires a non-empty entityKey, received: ${String(entityKey)}`);
  }
  element.setAttribute(DATA_ENTITY_KEY_ATTRIBUTE, entityKey);
  return element;
}

/**
 * R1.1: Read the logical entity key from a DOM element. Returns null when the
 * attribute is absent.
 */
export function getDataEntityKey(element: Element | null | undefined): string | null {
  if (!element) return null;
  const value = element.getAttribute(DATA_ENTITY_KEY_ATTRIBUTE);
  return value && value.length > 0 ? value : null;
}

/**
 * R1.1: Set the route/state occurrence key on a DOM element. Pair with
 * `setDataEntityKey` so the runtime can resolve controls by (entity, route,
 * state) and by (controlKey, viewport).
 */
export function setDataControlKey(element: Element | null | undefined, controlKey: string): Element | null {
  if (!element) return null;
  if (typeof controlKey !== "string" || controlKey.length === 0) {
    throw new Error(`setDataControlKey requires a non-empty controlKey, received: ${String(controlKey)}`);
  }
  element.setAttribute(DATA_CONTROL_KEY_ATTRIBUTE, controlKey);
  return element;
}

/**
 * R1.1: Read the route/state occurrence key from a DOM element. Returns null
 * when the attribute is absent.
 */
export function getDataControlKey(element: Element | null | undefined): string | null {
  if (!element) return null;
  const value = element.getAttribute(DATA_CONTROL_KEY_ATTRIBUTE);
  return value && value.length > 0 ? value : null;
}

/**
 * R1.1: Build a CSS attribute selector that resolves elements by their
 * logical entity key. Multiple DOM occurrences of the same logical control
 * share this selector across route/state/viewport; callers needing
 * route/state-scoped lookup should chain with `querySelectorForControlKey`.
 */
export function querySelectorForEntityKey(entityKey: string): string {
  if (typeof entityKey !== "string" || entityKey.length === 0) {
    throw new Error(`querySelectorForEntityKey requires a non-empty entityKey, received: ${String(entityKey)}`);
  }
  return `[${DATA_ENTITY_KEY_ATTRIBUTE}="${cssEscapeAttribute(entityKey)}"]`;
}

/**
 * R1.1: Build a CSS attribute selector that resolves elements by their
 * route/state occurrence key. Multiple viewport instances of the same logical
 * control share this selector; callers needing viewport-scoped lookup should
 * chain with `[data-viewport="<viewport>"]`.
 */
export function querySelectorForControlKey(controlKey: string): string {
  if (typeof controlKey !== "string" || controlKey.length === 0) {
    throw new Error(`querySelectorForControlKey requires a non-empty controlKey, received: ${String(controlKey)}`);
  }
  return `[${DATA_CONTROL_KEY_ATTRIBUTE}="${cssEscapeAttribute(controlKey)}"]`;
}

/**
 * R1.1: Resolve a logical entity key to all matching elements in document
 * order. Multiple matches indicate that the same logical control appears in
 * multiple route/state/viewport contexts in the rendered DOM.
 */
export function resolveAllByEntityKey(entityKey: string, root: ParentNode = document): Element[] {
  return Array.from(root.querySelectorAll(querySelectorForEntityKey(entityKey)));
}

/**
 * R1.1: Resolve a route/state occurrence key to all matching elements in
 * document order. Multiple matches indicate either (a) multiple viewport
 * instances of the same control, or (b) multiple DOM occurrences of the same
 * logical control in the same (route, state). Callers needing viewport-scoped
 * resolution should filter by `data-viewport`.
 */
export function resolveAllByControlKey(controlKey: string, root: ParentNode = document): Element[] {
  return Array.from(root.querySelectorAll(querySelectorForControlKey(controlKey)));
}

/**
 * Build a CSS attribute selector that uniquely resolves a control by its
 * canonical logical controlId. Use this in tests and runtime instrumentation.
 *
 * The selector is `[data-control-id="<controlId>"]` with proper CSS escaping.
 * Note: multiple viewport instances of the same logical control share this
 * selector; callers needing viewport-scoped lookup should chain
 * `[data-control-id="<id>"][data-viewport="<viewport>"]` via
 * `querySelectorForControlIdAndViewport`.
 */
export function querySelectorForControlId(controlId: string): string {
  if (typeof controlId !== "string" || controlId.length === 0) {
    throw new Error(`querySelectorForControlId requires a non-empty controlId, received: ${String(controlId)}`);
  }
  return `[${DATA_CONTROL_ID_ATTRIBUTE}="${cssEscapeAttribute(controlId)}"]`;
}

/**
 * Build a CSS attribute selector that resolves a control by its logical
 * controlId AND viewport instance. Use this when multiple viewport instances
 * of the same logical control co-exist in the DOM.
 */
export function querySelectorForControlIdAndViewport(controlId: string, viewport: string): string {
  if (typeof controlId !== "string" || controlId.length === 0) {
    throw new Error(`querySelectorForControlIdAndViewport requires a non-empty controlId, received: ${String(controlId)}`);
  }
  if (typeof viewport !== "string" || viewport.length === 0) {
    throw new Error(`querySelectorForControlIdAndViewport requires a non-empty viewport, received: ${String(viewport)}`);
  }
  return `[${DATA_CONTROL_ID_ATTRIBUTE}="${cssEscapeAttribute(controlId)}"][${DATA_VIEWPORT_ATTRIBUTE}="${cssEscapeAttribute(viewport)}"]`;
}

/**
 * Resolve a logical controlId to the first matching element in document order.
 * Returns null when no element carries the requested controlId. When multiple
 * viewport instances of the same logical control exist, the first match wins;
 * use `resolveControlIdAndViewport` for viewport-scoped resolution.
 */
export function resolveControlId(controlId: string, root: ParentNode = document): Element | null {
  return root.querySelector(querySelectorForControlId(controlId));
}

/**
 * Resolve a (controlId, viewport) pair to the first matching element.
 */
export function resolveControlIdAndViewport(controlId: string, viewport: string, root: ParentNode = document): Element | null {
  return root.querySelector(querySelectorForControlIdAndViewport(controlId, viewport));
}

/**
 * Resolve a logical controlId to all matching elements in document order.
 * Multiple matches indicate either (a) duplicate-id violation, or (b) multiple
 * viewport instances of the same logical control. Callers needing (b) should
 * filter by `data-viewport`.
 */
export function resolveAllControlIds(controlId: string, root: ParentNode = document): Element[] {
  return Array.from(root.querySelectorAll(querySelectorForControlId(controlId)));
}

/**
 * Validate that a controlId string conforms to the canonical LOGICAL format
 * `{domain}.{family}.{route}.{state}.{role}[.discriminator]` (5-7 atoms,
 * viewport is intentionally NOT part of controlId).
 *
 * This is a syntactic check only; semantic validation is the responsibility
 * of the drift test in tools/interaction-inventory/tests/control-identity-drift.test.mjs.
 */
export function isValidControlIdFormat(controlId: string): boolean {
  if (typeof controlId !== "string" || controlId.length === 0) return false;
  // Each atom is kebab-case [a-z0-9]+(?:-[a-z0-9]+)*, separated by dots.
  // R1: controlId is 5-7 atoms (domain.family.route.state.role[.discriminator]).
  // Viewport is NOT part of controlId.
  const atoms = controlId.split(".");
  if (atoms.length < 5 || atoms.length > 7) return false;
  const atomPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return atoms.every((atom) => atomPattern.test(atom));
}

/**
 * Parse a canonical logical controlId into its structural components. Returns
 * null when the format is invalid. The discriminator atom (when present) is
 * returned as a single string; callers needing slug/hash split must parse it
 * themselves. Viewport is NOT part of controlId; it lives on the registry
 * entry / DOM `data-viewport` attribute.
 */
export interface ParsedControlId {
  domain: string;
  family: string;
  route: string;
  state: string;
  role: string;
  discriminator: string | null;
}

export function parseControlId(controlId: string): ParsedControlId | null {
  if (!isValidControlIdFormat(controlId)) return null;
  const atoms = controlId.split(".");
  const [domain, family, route, state, role, ...rest] = atoms;
  return {
    domain,
    family,
    route,
    state,
    role,
    discriminator: rest.length > 0 ? rest.join(".") : null,
  };
}

/**
 * Compose a canonical logical controlId from structural parts. The
 * discriminator is optional; when omitted, the resulting id has exactly 5
 * atoms (domain.family.route.state.role). Viewport is intentionally NOT
 * part of controlId.
 */
export function composeControlId(parts: {
  domain: string;
  family: string;
  route: string;
  state: string;
  role: string;
  discriminator?: string | null;
}): string {
  const base = `${parts.domain}.${parts.family}.${parts.route}.${parts.state}.${parts.role}`;
  return parts.discriminator ? `${base}.${parts.discriminator}` : base;
}

/**
 * CSS attribute-value escaping per the CSS Syntax Module Level 3.
 * Escapes characters that would otherwise break out of the attribute selector.
 */
function cssEscapeAttribute(value: string): string {
  // The controlId format restricts atoms to [a-z0-9-] and the separator to ".",
  // neither of which requires escaping. We still escape defensively in case
  // the value is constructed from external input.
  return String(value).replace(/(["\\])/g, "\\$1");
}
