// Reader-UI Control Identity — DOM identity infrastructure
// Source of truth: contracts/control-identity.schema.json
// R1 · Control Identity 修复 (2026-07-20, baseline e35e739)
//
// This module is the framework-agnostic DOM identity layer. Page renderers
// (B1/B2/B3/B4 work packages) MUST consume `setDataControlId` + `setDataViewport`
// to stamp the canonical logical identity + viewport instance onto the root
// element of every interactive control. Tests MUST consume `resolveControlId` /
// `querySelectorForControlId` to locate controls by their canonical logical id.
//
// R1 design: `data-control-id` carries the LOGICAL identity
// (domain.family.route.state.role[.discriminator]) and is viewport-independent.
// `data-viewport` carries the viewport instance (phone/compact/tablet/fold).
// Phone / Compact / Tablet / Fold of the same logical control share the same
// `data-control-id` value; they differ only in `data-viewport`.

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
