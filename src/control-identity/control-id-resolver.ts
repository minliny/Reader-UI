// Reader-UI Control Identity — runtime resolver
// R1.1 · 三层身份分离 (2026-07-20, baseline 9f7a0f5)
//
// Runtime resolver that maps controlId ↔ DOM selector ↔ ScreenGraph
// component instance. The resolver is populated from the codegen outputs in
// tools/interaction-inventory/generated/. Page renderers and tests import
// the resolver to look up the canonical identity of any element.
//
// R1.1 three-layer identity:
//   - entityKey  : logical ENTITY (cross route/state/viewport)
//   - controlKey : logical OCCURRENCE in (route, state); cross viewport
//   - controlId  : DOM occurrence TRACKING id (R1 hash retained for audit)
//
// R1 backward compatibility: controlId is still the primary lookup key. R2
// page renderers SHOULD additionally stamp `data-entity-key` and
// `data-control-key` so the runtime can resolve by logical entity / route-state
// occurrence.

import type { ControlIdRegistryEntry, ScreenGraphBinding, ControlViewport } from "../../contracts/control-identity.types";
import {
  DATA_CONTROL_ID_ATTRIBUTE,
  DATA_CONTROL_KEY_ATTRIBUTE,
  DATA_ENTITY_KEY_ATTRIBUTE,
  DATA_VIEWPORT_ATTRIBUTE,
  getDataControlId,
  getDataControlKey,
  getDataEntityKey,
  getDataViewport,
  querySelectorForControlId,
  querySelectorForControlIdAndViewport,
  querySelectorForControlKey,
  querySelectorForEntityKey,
  resolveAllByControlKey,
  resolveAllByEntityKey,
  resolveControlId,
  resolveControlIdAndViewport,
} from "./dom-identity";

/**
 * Static registry snapshot. Populated by codegen
 * (tools/interaction-inventory/codegen-control-ids.mjs) and imported here.
 *
 * For now, this is a typed placeholder; B1/B2/B3/B4 page packages will
 * import the generated registry directly. The resolver API below accepts
 * a registry argument so callers can pass the generated artifact.
 */
export interface ControlIdResolverEntry {
  /** R1.1: Logical control entity (cross route/state/viewport). */
  entityKey: string;
  /** R1.1: Logical control occurrence in (route, state); cross viewport. */
  controlKey: string;
  /** R1 / R1.1: DOM occurrence tracking id (NOT the logical identity). */
  controlId: string;
  domSelector: string;
  selectorSha256: string;
  routeId: string;
  /** Viewport instance for this entry. */
  viewport: ControlViewport;
  screenGraphBinding: ScreenGraphBinding | null;
}

export interface ControlIdResolver {
  // R1.1: logical identity lookups.
  resolveByEntityKey(entityKey: string): readonly ControlIdResolverEntry[];
  resolveByControlKey(controlKey: string): readonly ControlIdResolverEntry[];
  resolveByControlKeyAndViewport(controlKey: string, viewport: string): ControlIdResolverEntry | null;
  // R1 backward-compatible lookups.
  resolveByControlId(controlId: string): ControlIdResolverEntry | null;
  resolveByControlIdAndViewport(controlId: string, viewport: string): ControlIdResolverEntry | null;
  resolveByDomSelector(selector: string): ControlIdResolverEntry | null;
  resolveByElement(element: Element): ControlIdResolverEntry | null;
  resolveByElementAndViewport(element: Element): ControlIdResolverEntry | null;
  all(): ControlIdResolverEntry[];
}

/**
 * Build a runtime resolver from a codegen-produced registry. The resolver
 * is read-only and immutable; rebuild it when the codegen output changes.
 *
 * R1.1 invariants enforced at build time:
 *   - Each (controlId, viewport) pair must be unique.
 *   - Entries sharing the same entityKey are grouped; resolveByEntityKey
 *     returns the full list (cross route/state/viewport).
 *   - Entries sharing the same controlKey are grouped; resolveByControlKey
 *     returns the full list (cross viewport / cross DOM occurrence).
 */
export function createControlIdResolver(entries: ControlIdResolverEntry[]): ControlIdResolver {
  const byControlId = new Map<string, ControlIdResolverEntry>();
  const byControlIdAndViewport = new Map<string, ControlIdResolverEntry>();
  const byControlKey = new Map<string, ControlIdResolverEntry[]>();
  const byControlKeyAndViewport = new Map<string, ControlIdResolverEntry>();
  const byEntityKey = new Map<string, ControlIdResolverEntry[]>();
  const bySelectorSha256 = new Map<string, ControlIdResolverEntry>();
  for (const entry of entries) {
    if (byControlIdAndViewport.has(`${entry.controlId}@${entry.viewport}`)) {
      throw new Error(`duplicate (controlId, viewport) in resolver input: ${entry.controlId}@${entry.viewport}`);
    }
    byControlIdAndViewport.set(`${entry.controlId}@${entry.viewport}`, entry);
    // byControlId keeps the first occurrence of each tracking id; callers
    // needing viewport-scoped lookup should use byControlIdAndViewport.
    if (!byControlId.has(entry.controlId)) {
      byControlId.set(entry.controlId, entry);
    }
    // R1.1: group by controlKey (cross viewport / cross DOM occurrence).
    if (!byControlKey.has(entry.controlKey)) {
      byControlKey.set(entry.controlKey, []);
    }
    byControlKey.get(entry.controlKey)!.push(entry);
    if (byControlKeyAndViewport.has(`${entry.controlKey}@${entry.viewport}`)) {
      throw new Error(
        `duplicate (controlKey, viewport) in resolver input: ${entry.controlKey}@${entry.viewport}`,
      );
    }
    byControlKeyAndViewport.set(`${entry.controlKey}@${entry.viewport}`, entry);
    // R1.1: group by entityKey (cross route/state/viewport).
    if (!byEntityKey.has(entry.entityKey)) {
      byEntityKey.set(entry.entityKey, []);
    }
    byEntityKey.get(entry.entityKey)!.push(entry);
    bySelectorSha256.set(entry.selectorSha256, entry);
  }
  return {
    resolveByEntityKey(entityKey) {
      return byEntityKey.get(entityKey) ?? [];
    },
    resolveByControlKey(controlKey) {
      return byControlKey.get(controlKey) ?? [];
    },
    resolveByControlKeyAndViewport(controlKey, viewport) {
      return byControlKeyAndViewport.get(`${controlKey}@${viewport}`) ?? null;
    },
    resolveByControlId(controlId) {
      return byControlId.get(controlId) ?? null;
    },
    resolveByControlIdAndViewport(controlId, viewport) {
      return byControlIdAndViewport.get(`${controlId}@${viewport}`) ?? null;
    },
    resolveByDomSelector(selector) {
      // DOM selectors are not unique across cases (same selector may appear
      // in multiple variants). Resolution by selector returns the first
      // match; callers needing case-scoped resolution should use the
      // registry directly.
      for (const entry of byControlId.values()) {
        if (entry.domSelector === selector) return entry;
      }
      return null;
    },
    resolveByElement(element) {
      const controlId = getDataControlId(element);
      if (controlId) return byControlId.get(controlId) ?? null;
      // R1.1 fallback: resolve via data-control-key when data-control-id is
      // absent (e.g. an R2 renderer that only stamped the logical keys).
      const controlKey = getDataControlKey(element);
      if (controlKey) {
        const matches = byControlKey.get(controlKey);
        if (matches && matches.length > 0) return matches[0];
      }
      return null;
    },
    resolveByElementAndViewport(element) {
      const controlId = getDataControlId(element);
      const viewport = getDataViewport(element);
      if (controlId) {
        if (!viewport) return byControlId.get(controlId) ?? null;
        return byControlIdAndViewport.get(`${controlId}@${viewport}`) ?? null;
      }
      // R1.1 fallback: resolve via data-control-key when data-control-id is
      // absent. Pair with data-viewport for viewport-scoped lookup.
      const controlKey = getDataControlKey(element);
      if (controlKey) {
        if (!viewport) {
          const matches = byControlKey.get(controlKey);
          if (matches && matches.length > 0) return matches[0];
          return null;
        }
        return byControlKeyAndViewport.get(`${controlKey}@${viewport}`) ?? null;
      }
      return null;
    },
    all() {
      return Array.from(byControlIdAndViewport.values());
    },
  };
}

/**
 * DOM query helper that locates an element by its canonical logical controlId.
 * Equivalent to `document.querySelector(querySelectorForControlId(controlId))`
 * but goes through the resolver to ensure the controlId is known to the
 * codegen registry.
 */
export function queryElementByControlId(
  controlId: string,
  resolver: ControlIdResolver,
  root: ParentNode = typeof document !== "undefined" ? document : (null as unknown as Document),
): Element | null {
  if (!resolver.resolveByControlId(controlId)) {
    return null;
  }
  if (typeof document === "undefined") return null;
  return resolveControlId(controlId, root);
}

/**
 * DOM query helper that locates an element by its canonical logical controlId
 * AND viewport instance. Use this when multiple viewport instances of the same
 * logical control co-exist in the DOM.
 */
export function queryElementByControlIdAndViewport(
  controlId: string,
  viewport: string,
  resolver: ControlIdResolver,
  root: ParentNode = typeof document !== "undefined" ? document : (null as unknown as Document),
): Element | null {
  if (!resolver.resolveByControlIdAndViewport(controlId, viewport)) {
    return null;
  }
  if (typeof document === "undefined") return null;
  return resolveControlIdAndViewport(controlId, viewport, root);
}

/**
 * R1.1: DOM query helper that locates ALL elements carrying a given logical
 * entity key. Multiple matches indicate that the same logical control appears
 * in multiple route/state/viewport contexts in the rendered DOM.
 */
export function queryElementsByEntityKey(
  entityKey: string,
  resolver: ControlIdResolver,
  root: ParentNode = typeof document !== "undefined" ? document : (null as unknown as Document),
): Element[] {
  if (resolver.resolveByEntityKey(entityKey).length === 0) return [];
  if (typeof document === "undefined") return [];
  return resolveAllByEntityKey(entityKey, root);
}

/**
 * R1.1: DOM query helper that locates ALL elements carrying a given route/state
 * occurrence key. Multiple matches indicate multiple viewport instances of the
 * same logical control, or multiple DOM occurrences within the same (route,
 * state).
 */
export function queryElementsByControlKey(
  controlKey: string,
  resolver: ControlIdResolver,
  root: ParentNode = typeof document !== "undefined" ? document : (null as unknown as Document),
): Element[] {
  if (resolver.resolveByControlKey(controlKey).length === 0) return [];
  if (typeof document === "undefined") return [];
  return resolveAllByControlKey(controlKey, root);
}

/**
 * Verify that every controlId in the resolver is present exactly once in the
 * rendered DOM. Returns a list of missing or duplicate controlIds. Tests
 * use this to enforce DOM identity coverage.
 *
 * Note: when multiple viewport instances of the same logical control exist,
 * callers should use `verifyDomCoverageAndViewport` instead.
 */
export function verifyDomCoverage(
  resolver: ControlIdResolver,
  root: ParentNode = typeof document !== "undefined" ? document : (null as unknown as Document),
): { missing: string[]; duplicate: string[] } {
  const missing: string[] = [];
  const duplicate: string[] = [];
  if (typeof document === "undefined") {
    return { missing: resolver.all().map((e) => e.controlId), duplicate: [] };
  }
  for (const entry of resolver.all()) {
    const matches = Array.from(root.querySelectorAll(querySelectorForControlId(entry.controlId)));
    if (matches.length === 0) {
      missing.push(entry.controlId);
    } else if (matches.length > 1) {
      duplicate.push(entry.controlId);
    }
  }
  return { missing, duplicate };
}

export {
  DATA_CONTROL_ID_ATTRIBUTE,
  DATA_CONTROL_KEY_ATTRIBUTE,
  DATA_ENTITY_KEY_ATTRIBUTE,
  DATA_VIEWPORT_ATTRIBUTE,
  getDataControlId,
  getDataControlKey,
  getDataEntityKey,
  getDataViewport,
  querySelectorForControlId,
  querySelectorForControlIdAndViewport,
  querySelectorForControlKey,
  querySelectorForEntityKey,
  resolveAllByControlKey,
  resolveAllByEntityKey,
  resolveControlId,
  resolveControlIdAndViewport,
};
export type { ControlIdRegistryEntry };
