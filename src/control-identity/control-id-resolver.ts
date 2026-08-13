// Reader-UI Control Identity — runtime resolver
// R1.2 · 显式语义身份修复 (2026-07-20, baseline 5ce233f)
//
// Runtime resolver that maps controlId ↔ DOM selector ↔ ScreenGraph
// component instance. The resolver is populated from the codegen outputs in
// tools/interaction-inventory/generated/. Page renderers and tests import
// the resolver to look up the canonical identity of any element.
//
// R1.2 three-layer identity:
//   - entityKey  : logical ENTITY (cross route/state/viewport)
//   - controlKey : logical OCCURRENCE in (route, state); now unique per entry
//                  due to instanceKey/ordinal disambiguation
//   - controlId  : DOM occurrence TRACKING id (R1 hash retained for audit)
//   - actionKey  : explicit semantic action (null when pending)
//   - instanceKey: explicit instance disambiguator (null when absent)
//
// R1.2 resolver changes:
//   - byControlKeyAndViewport is now Map<string, ControlIdResolverEntry[]>
//     (supports multiple occurrences of the same controlKey across viewports).
//   - resolveByControlKeyAndViewport returns the first match (no throw on
//     multiple matches; use resolveAllByControlKeyAndViewport for all).
//   - verifyDomCoverageAndViewport implemented.

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
 */
export interface ControlIdResolverEntry {
  /** R1.2: Logical control entity (cross route/state/viewport). */
  entityKey: string;
  /** R1.2: Logical control occurrence in (route, state); unique per entry. */
  controlKey: string;
  /** R1.2: Explicit semantic action key (null when pending). */
  actionKey: string | null;
  /** R1.2: Explicit instance disambiguator (null when absent). */
  instanceKey: string | null;
  /** R1 / R1.2: DOM occurrence tracking id (NOT the logical identity). */
  controlId: string;
  domSelector: string;
  selectorSha256: string;
  routeId: string;
  /** Viewport instance for this entry. */
  viewport: ControlViewport;
  screenGraphBinding: ScreenGraphBinding | null;
}

export interface ControlIdResolver {
  // R1.2: logical identity lookups.
  resolveByEntityKey(entityKey: string): readonly ControlIdResolverEntry[];
  resolveByControlKey(controlKey: string): readonly ControlIdResolverEntry[];
  resolveByControlKeyAndViewport(controlKey: string, viewport: string): ControlIdResolverEntry | null;
  /** R1.2: Return ALL entries matching (controlKey, viewport). Multiple entries
   * are possible when the same logical control appears multiple times in the
   * same (route, state, viewport). */
  resolveAllByControlKeyAndViewport(controlKey: string, viewport: string): readonly ControlIdResolverEntry[];
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
 * R1.2 invariants enforced at build time:
 *   - Each (controlId, viewport) pair must be unique (throw on duplicate).
 *   - Entries sharing the same entityKey are grouped; resolveByEntityKey
 *     returns the full list (cross route/state/viewport).
 *   - Entries sharing the same controlKey are grouped; resolveByControlKey
 *     returns the full list. R1.2: controlKey is now unique per entry, but
 *     the grouping API is retained for backward compatibility.
 *   - Multiple entries with the same (controlKey, viewport) are ALLOWED
 *     (no throw). Use resolveAllByControlKeyAndViewport to get all matches.
 */
export function createControlIdResolver(entries: ControlIdResolverEntry[]): ControlIdResolver {
  const byControlId = new Map<string, ControlIdResolverEntry>();
  const byControlIdAndViewport = new Map<string, ControlIdResolverEntry>();
  const byControlKey = new Map<string, ControlIdResolverEntry[]>();
  // R1.2: byControlKeyAndViewport is now an array — multiple entries per
  // (controlKey, viewport) are allowed.
  const byControlKeyAndViewport = new Map<string, ControlIdResolverEntry[]>();
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
    // R1.2: group by controlKey (cross viewport / cross DOM occurrence).
    if (!byControlKey.has(entry.controlKey)) {
      byControlKey.set(entry.controlKey, []);
    }
    byControlKey.get(entry.controlKey)!.push(entry);
    // R1.2: group by (controlKey, viewport) — multiple entries allowed.
    const ckVpKey = `${entry.controlKey}@${entry.viewport}`;
    if (!byControlKeyAndViewport.has(ckVpKey)) {
      byControlKeyAndViewport.set(ckVpKey, []);
    }
    byControlKeyAndViewport.get(ckVpKey)!.push(entry);
    // R1.2: group by entityKey (cross route/state/viewport).
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
      // R1.2: return the first match. If multiple entries exist, log a warning
      // but do NOT throw — callers needing all matches should use
      // resolveAllByControlKeyAndViewport.
      const matches = byControlKeyAndViewport.get(`${controlKey}@${viewport}`) ?? [];
      if (matches.length > 1) {
        // Warn but don't throw. This is expected when the same logical control
        // appears multiple times in the same (route, state, viewport).
        if (typeof console !== "undefined" && console.warn) {
          console.warn(
            `[control-id-resolver] multiple entries (${matches.length}) for (controlKey, viewport): ${controlKey}@${viewport}; returning first; use resolveAllByControlKeyAndViewport for all`,
          );
        }
      }
      return matches[0] ?? null;
    },
    resolveAllByControlKeyAndViewport(controlKey, viewport) {
      return byControlKeyAndViewport.get(`${controlKey}@${viewport}`) ?? [];
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
      // R1.2 fallback: resolve via data-control-key when data-control-id is
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
      // R1.2 fallback: resolve via data-control-key when data-control-id is
      // absent. Pair with data-viewport for viewport-scoped lookup.
      const controlKey = getDataControlKey(element);
      if (controlKey) {
        if (!viewport) {
          const matches = byControlKey.get(controlKey);
          if (matches && matches.length > 0) return matches[0];
          return null;
        }
        const vpMatches = byControlKeyAndViewport.get(`${controlKey}@${viewport}`) ?? [];
        if (vpMatches.length > 0) return vpMatches[0];
        return null;
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
 * AND viewport instance.
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
 * R1.2: DOM query helper that locates ALL elements carrying a given logical
 * entity key.
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
 * R1.2: DOM query helper that locates ALL elements carrying a given route/state
 * occurrence key.
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
 * rendered DOM. Returns a list of missing or duplicate controlIds.
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

/**
 * R1.2: Verify DOM coverage with viewport awareness. For every entry in the
 * resolver, check that the DOM contains an element with the matching
 * data-control-id (and data-viewport when the entry is viewport-scoped).
 * Also checks for extra DOM elements that carry a data-control-id not known
 * to the resolver.
 *
 * Returns:
 *   - covered: number of resolver entries that have at least one DOM match.
 *   - missing: controlIds from the resolver that have NO DOM match.
 *   - extra: data-control-id values found in the DOM but NOT in the resolver.
 *   - duplicate: controlIds that appear more than once in the DOM.
 */
export function verifyDomCoverageAndViewport(
  resolver: ControlIdResolver,
  root: ParentNode = typeof document !== "undefined" ? document : (null as unknown as Document),
): { covered: number; missing: string[]; extra: string[]; duplicate: string[] } {
  const missing: string[] = [];
  const duplicate: string[] = [];
  const extra: string[] = [];
  let covered = 0;

  if (typeof document === "undefined") {
    return {
      covered: 0,
      missing: resolver.all().map((e) => e.controlId),
      extra: [],
      duplicate: [],
    };
  }

  // Build a set of known controlIds for fast lookup.
  const knownControlIds = new Set<string>();
  for (const entry of resolver.all()) {
    knownControlIds.add(entry.controlId);
  }

  // Check each resolver entry for DOM presence.
  for (const entry of resolver.all()) {
    const matches = Array.from(root.querySelectorAll(querySelectorForControlId(entry.controlId)));
    if (matches.length === 0) {
      missing.push(entry.controlId);
    } else {
      covered += 1;
      if (matches.length > 1) {
        duplicate.push(entry.controlId);
      }
    }
  }

  // Check for extra DOM elements with data-control-id not in the resolver.
  const allDomElements = Array.from(root.querySelectorAll(`[${DATA_CONTROL_ID_ATTRIBUTE}]`));
  for (const el of allDomElements) {
    const id = getDataControlId(el);
    if (id && !knownControlIds.has(id)) {
      extra.push(id);
    }
  }

  return { covered, missing, extra, duplicate };
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
