// Reader-UI Control Identity — runtime resolver
// A2 · Control Identity Foundation (2026-07-19)
//
// Runtime resolver that maps controlId ↔ DOM selector ↔ ScreenGraph
// component instance. The resolver is populated from the codegen outputs in
// tools/interaction-inventory/generated/. Page renderers and tests import
// the resolver to look up the canonical identity of any element.

import type { ControlIdRegistryEntry, ScreenGraphBinding } from "../../contracts/control-identity.types";
import { DATA_CONTROL_ID_ATTRIBUTE, getDataControlId, querySelectorForControlId, resolveControlId } from "./dom-identity";

/**
 * Static registry snapshot. Populated by codegen
 * (tools/interaction-inventory/codegen-control-ids.mjs) and imported here.
 *
 * For now, this is a typed placeholder; B1/B2/B3/B4 page packages will
 * import the generated registry directly. The resolver API below accepts
 * a registry argument so callers can pass the generated artifact.
 */
export interface ControlIdResolverEntry {
  controlId: string;
  domSelector: string;
  selectorSha256: string;
  routeId: string;
  viewport: string;
  screenGraphBinding: ScreenGraphBinding | null;
}

export interface ControlIdResolver {
  resolveByControlId(controlId: string): ControlIdResolverEntry | null;
  resolveByDomSelector(selector: string): ControlIdResolverEntry | null;
  resolveByElement(element: Element): ControlIdResolverEntry | null;
  all(): ControlIdResolverEntry[];
}

/**
 * Build a runtime resolver from a codegen-produced registry. The resolver
 * is read-only and immutable; rebuild it when the codegen output changes.
 */
export function createControlIdResolver(entries: ControlIdResolverEntry[]): ControlIdResolver {
  const byControlId = new Map<string, ControlIdResolverEntry>();
  const bySelectorSha256 = new Map<string, ControlIdResolverEntry>();
  for (const entry of entries) {
    if (byControlId.has(entry.controlId)) {
      throw new Error(`duplicate controlId in resolver input: ${entry.controlId}`);
    }
    byControlId.set(entry.controlId, entry);
    bySelectorSha256.set(entry.selectorSha256, entry);
  }
  return {
    resolveByControlId(controlId) {
      return byControlId.get(controlId) ?? null;
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
      if (!controlId) return null;
      return byControlId.get(controlId) ?? null;
    },
    all() {
      return Array.from(byControlId.values());
    },
  };
}

/**
 * DOM query helper that locates an element by its canonical controlId.
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
 * Verify that every controlId in the resolver is present exactly once in the
 * rendered DOM. Returns a list of missing or duplicate controlIds. Tests
 * use this to enforce DOM identity coverage.
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

export { DATA_CONTROL_ID_ATTRIBUTE, getDataControlId, querySelectorForControlId, resolveControlId };
export type { ControlIdRegistryEntry };
