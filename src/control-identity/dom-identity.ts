// Reader-UI Control Identity — DOM identity infrastructure
// Source of truth: contracts/control-identity.schema.json
// A2 · Control Identity Foundation (2026-07-19)
//
// This module is the framework-agnostic DOM identity layer. Page renderers
// (B1/B2/B3/B4 work packages) MUST consume `setDataControlId` to stamp the
// canonical control identity onto the root element of every interactive
// control. Tests MUST consume `resolveControlId` / `querySelectorForControlId`
// to locate controls by their canonical id, not by ad-hoc selectors.
//
// This module does NOT modify existing page visual code; it only provides
// the identity infrastructure. Wiring into actual renderers is the
// responsibility of B1/B2/B3/B4.

export type { ControlIdentity, ControlIdRegistryEntry, ControlIdRegistry, DomIdentityMap, DomIdentityMapEntry, ScreenGraphBinding } from "../../contracts/control-identity.types";
export { ControlDomain, ControlFamily, ControlViewport, ControlRole, ControlMappingStatus } from "../../contracts/control-identity.types";

/**
 * The DOM attribute used to stamp a canonical controlId onto an element.
 * Page renderers MUST set this attribute on the root element of every
 * interactive control. The value is the canonical controlId string.
 */
export const DATA_CONTROL_ID_ATTRIBUTE = "data-control-id" as const;

/**
 * The DOM attribute used to declare the candidate join key for an element.
 * Reserved for the Figma backfill phase; currently always empty.
 */
export const DATA_CONTROL_CANDIDATE_KEY_ATTRIBUTE = "data-control-candidate-key" as const;

/**
 * Set the canonical controlId on a DOM element. Future page renderers MUST
 * call this on the root element of every interactive control.
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
 * Read the canonical controlId from a DOM element. Returns null when the
 * attribute is absent.
 */
export function getDataControlId(element: Element | null | undefined): string | null {
  if (!element) return null;
  const value = element.getAttribute(DATA_CONTROL_ID_ATTRIBUTE);
  return value && value.length > 0 ? value : null;
}

/**
 * Build a CSS attribute selector that uniquely resolves a control by its
 * canonical controlId. Use this in tests and runtime instrumentation.
 *
 * The selector is `[data-control-id="<controlId>"]` with proper CSS escaping.
 */
export function querySelectorForControlId(controlId: string): string {
  if (typeof controlId !== "string" || controlId.length === 0) {
    throw new Error(`querySelectorForControlId requires a non-empty controlId, received: ${String(controlId)}`);
  }
  return `[${DATA_CONTROL_ID_ATTRIBUTE}="${cssEscapeAttribute(controlId)}"]`;
}

/**
 * Resolve a controlId to the first matching element in the document order.
 * Returns null when no element carries the requested controlId.
 */
export function resolveControlId(controlId: string, root: ParentNode = document): Element | null {
  return root.querySelector(querySelectorForControlId(controlId));
}

/**
 * Resolve a controlId to all matching elements in the document order.
 * Multiple matches indicate a duplicate-id violation and MUST be flagged.
 */
export function resolveAllControlIds(controlId: string, root: ParentNode = document): Element[] {
  return Array.from(root.querySelectorAll(querySelectorForControlId(controlId)));
}

/**
 * Validate that a controlId string conforms to the canonical format
 * `{domain}.{family}.{route}.{state}.{viewport}.{role}[.discriminator]`.
 * This is a syntactic check only; semantic validation is the responsibility
 * of the drift test in tools/interaction-inventory/tests/control-identity-drift.test.mjs.
 */
export function isValidControlIdFormat(controlId: string): boolean {
  if (typeof controlId !== "string" || controlId.length === 0) return false;
  // Each atom is kebab-case [a-z0-9]+(?:-[a-z0-9]+)*, separated by dots.
  // Minimum 6 atoms (without discriminator); maximum 8 atoms (with slug + hash).
  const atoms = controlId.split(".");
  if (atoms.length < 6 || atoms.length > 8) return false;
  const atomPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return atoms.every((atom) => atomPattern.test(atom));
}

/**
 * Parse a canonical controlId into its structural components. Returns null
 * when the format is invalid. The discriminator atom (when present) is
 * returned as a single string; callers needing slug/hash split must parse
 * it themselves.
 */
export interface ParsedControlId {
  domain: string;
  family: string;
  route: string;
  state: string;
  viewport: string;
  role: string;
  discriminator: string | null;
}

export function parseControlId(controlId: string): ParsedControlId | null {
  if (!isValidControlIdFormat(controlId)) return null;
  const atoms = controlId.split(".");
  const [domain, family, route, state, viewport, role, ...rest] = atoms;
  return {
    domain,
    family,
    route,
    state,
    viewport,
    role,
    discriminator: rest.length > 0 ? rest.join(".") : null,
  };
}

/**
 * Compose a canonical controlId from structural parts. The discriminator is
 * optional; when omitted, the resulting id has exactly 6 atoms.
 */
export function composeControlId(parts: {
  domain: string;
  family: string;
  route: string;
  state: string;
  viewport: string;
  role: string;
  discriminator?: string | null;
}): string {
  const base = `${parts.domain}.${parts.family}.${parts.route}.${parts.state}.${parts.viewport}.${parts.role}`;
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
