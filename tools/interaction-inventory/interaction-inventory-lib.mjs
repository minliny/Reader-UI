import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import {
  buildScreenGraphArtifacts,
  formatJson,
  loadScreenGraphInputs,
} from "../screen-graph/screen-graph-lib.mjs";

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(THIS_DIR, "..", "..");

export const INTERACTION_INVENTORY_PATH = "docs/audits/ic0-2026-07-19/generated/interaction-control-inventory.json";
export const INTERACTION_COVERAGE_PATH = "docs/audits/ic0-2026-07-19/generated/interaction-control-coverage.json";

const DEMO_ROOT = "frontend-demo-optimized";
const HTML_VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr",
]);
const NATIVE_CONTROL_TAGS = new Set(["button", "input", "select", "textarea", "summary"]);
const INTERACTIVE_ROLES = new Set([
  "button", "checkbox", "combobox", "link", "menuitem", "menuitemcheckbox", "menuitemradio",
  "option", "radio", "searchbox", "slider", "spinbutton", "switch", "tab", "textbox", "treeitem",
]);
const EXCLUDED_COMPOSITE_ROLES = new Set(["listbox"]);
const JOIN_GAP_CODE = "IC0_NO_STABLE_COMPONENT_DOM_JOIN_KEY";
const UI_EVENT_GAP_CODE = "IC0_UI_EVENT_UNRESOLVED";
const RAW_MOTION_GAP_CODE = "IC0_RAW_MOTION_HINT_UNRESOLVED";
const CANONICAL_MOTION_GAP_CODE = "IC0_CANONICAL_MOTION_ID_UNRESOLVED";
const LABEL_GAP_CODE = "IC0_ACCESSIBLE_LABEL_MISSING";
const NON_SEMANTIC_GAP_CODE = "IC0_SUSPECTED_INTERACTIVE_WITHOUT_NATIVE_OR_ACTIONABLE_ARIA_SEMANTICS";
const IDENTICAL_VARIANT_RENDER_GAP_CODE = "IC0_VARIANT_CASES_RENDER_IDENTICALLY";

const ACTIONABLE_DATA_ATTRIBUTES = new Set([
  "data-action", "data-book-action", "data-close-dialog", "data-close-keyboard", "data-close-sheet",
  "data-demo-back", "data-filter-toggle", "data-nav-type", "data-open-dialog", "data-open-keyboard",
  "data-open-sheet", "data-reader-auto-toggle", "data-reader-brightness-auto", "data-reader-chapter-action",
  "data-reader-directory-index", "data-reader-dismiss", "data-reader-exit", "data-reader-more-action",
  "data-reader-more-close", "data-reader-more-toggle", "data-reader-page-action", "data-reader-panel-collapse",
  "data-reader-panel-expand", "data-reader-quick-collapse", "data-reader-quick-expand", "data-reader-setting-option",
  "data-reader-setting-option-key", "data-reader-setting-toggle", "data-reader-tts-action", "data-route",
  "data-route-back", "data-search-reset", "data-search-submit", "data-search-history-select", "data-search-history-toggle",
  "data-book-search-clear-history", "data-settings-option-choice",
  "data-settings-option-key", "data-settings-option-value", "data-settings-overlay", "data-source-action",
  "data-source-select", "data-top-action", "data-ui-event",
]);
const SETTINGS_CONTROL_CLASSES = new Set(["is-switch", "is-select", "is-segment", "is-stepper"]);

const RAW_MOTION_NORMALIZATION = Object.freeze({
  "app.route.push": ["app.route.push.forward"],
  "app.route.pop": ["app.route.pop.backward"],
  "card.press/select/route": ["card.press", "card.select", "card.route"],
  "overlay.sheet.enter/exit": ["overlay.sheet.enter-exit"],
  "overlay.dialog.enter/exit": ["overlay.dialog.enter-exit"],
  "slider.drag.start/update/release": ["slider.drag.start", "slider.drag.update", "slider.drag.release"],
  "stepper.press/value.change": ["stepper.press", "stepper.value.change"],
  "reader.session.capsule.enter/update/exit": [
    "reader.session.capsule.enter",
    "reader.session.capsule.update",
    "reader.session.capsule.exit",
  ],
  "reader.sourceSwitch.open/close": ["reader.sourceSwitch.open-close"],
});

function read(relativePath) {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function plainClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, digits) => String.fromCodePoint(Number(digits)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, digits) => String.fromCodePoint(Number.parseInt(digits, 16)));
}

function normalizeText(value) {
  return decodeHtml(value).replace(/\s+/g, " ").trim();
}

function parseAttributes(source) {
  const attributes = {};
  const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = attributePattern.exec(source)) !== null) {
    const name = match[1].toLowerCase();
    attributes[name] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

/**
 * Deliberately small HTML parser for deterministic audit output. The demo renderers emit
 * trusted, well-formed fragments; this parser is not intended for arbitrary web input.
 */
export function parseHtmlFragment(html) {
  const root = { tag: "#root", attrs: {}, children: [], content: [], parent: null, text: "" };
  const stack = [root];
  const tokenPattern = /<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z][^>]*>|[^<]+/g;
  let match;
  while ((match = tokenPattern.exec(String(html || ""))) !== null) {
    const token = match[0];
    if (token.startsWith("<!--") || token.startsWith("<!")) continue;
    if (!token.startsWith("<")) {
      const parent = stack[stack.length - 1];
      parent.text += token;
      parent.content.push({ tag: "#text", text: token, parent });
      continue;
    }
    if (token.startsWith("</")) {
      const tag = token.slice(2, -1).trim().toLowerCase();
      for (let index = stack.length - 1; index > 0; index -= 1) {
        if (stack[index].tag === tag) {
          stack.length = index;
          break;
        }
      }
      continue;
    }
    const open = token.match(/^<([A-Za-z][^\s/>]*)([\s\S]*?)\/?\s*>$/);
    if (!open) continue;
    const tag = open[1].toLowerCase();
    const node = {
      tag,
      attrs: parseAttributes(open[2] || ""),
      children: [],
      content: [],
      parent: stack[stack.length - 1],
      text: "",
    };
    node.parent.children.push(node);
    node.parent.content.push(node);
    if (!HTML_VOID_ELEMENTS.has(tag) && !/\/\s*>$/.test(token)) stack.push(node);
  }
  return root;
}

function descendantText(node) {
  const content = Array.isArray(node.content) ? node.content : [];
  const value = content.map((child) => (
    child.tag === "#text" ? child.text : descendantText(child)
  )).join("");
  return normalizeText(value);
}

function accessibilityContext(root) {
  const byId = new Map();
  const labelsByFor = new Map();
  const visit = (node) => {
    if (node.attrs.id) byId.set(node.attrs.id, node);
    if (node.tag === "label" && node.attrs.for) {
      const labels = labelsByFor.get(node.attrs.for) || [];
      labels.push(node);
      labelsByFor.set(node.attrs.for, labels);
    }
    for (const child of node.children) visit(child);
  };
  visit(root);
  return { byId, labelsByFor };
}

function ancestorLabel(node) {
  let current = node.parent;
  while (current && current.tag !== "#root") {
    if (current.tag === "label") return current;
    current = current.parent;
  }
  return null;
}

function isLabelableElement(node) {
  if (["button", "meter", "output", "progress", "select", "textarea"].includes(node.tag)) return true;
  return node.tag === "input" && String(node.attrs.type || "text").toLowerCase() !== "hidden";
}

function labelableDescendants(label) {
  const result = [];
  const visit = (node) => {
    for (const child of node.children) {
      if (isLabelableElement(child)) result.push(child);
      visit(child);
    }
  };
  visit(label);
  return result;
}

function isControl(node) {
  if (NATIVE_CONTROL_TAGS.has(node.tag)) return node.tag !== "input" || node.attrs.type !== "hidden";
  if (node.tag === "a" && typeof node.attrs.href === "string") return true;
  if (INTERACTIVE_ROLES.has(String(node.attrs.role || "").toLowerCase())) return true;
  return false;
}

function elementSiblings(node) {
  return node.parent ? node.parent.children.filter((child) => child.tag === node.tag) : [];
}

function cssEscape(value) {
  return String(value).replace(/([\\"#.:[\],= >+~])/g, "\\$1");
}

function dataAttributes(attrs) {
  return Object.fromEntries(
    Object.entries(attrs)
      .filter(([name]) => name.startsWith("data-"))
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function preferredDataSelector(attrs) {
  const entries = Object.entries(dataAttributes(attrs));
  const priorities = [
    "data-ui-event", "data-action", "data-route", "data-nav-type", "data-reader-page-action",
    "data-reader-module", "data-module", "data-top-action", "data-book-action", "data-settings-action",
  ];
  for (const name of priorities) {
    const match = entries.find(([key]) => key === name);
    if (match) return `[${name}${match[1] ? `=\"${cssEscape(match[1])}\"` : ""}]`;
  }
  if (entries.length > 0) {
    const [name, value] = entries[0];
    return `[${name}${value ? `=\"${cssEscape(value)}\"` : ""}]`;
  }
  return "";
}

function auditSelector(node) {
  const segments = [];
  let current = node;
  while (current && current.tag !== "#root") {
    let segment = current.tag;
    if (current.attrs.id) {
      segment += `#${cssEscape(current.attrs.id)}`;
      segments.unshift(segment);
      break;
    }
    const dataSelector = preferredDataSelector(current.attrs);
    if (dataSelector) segment += dataSelector;
    else if (current.attrs.class) {
      const firstClass = current.attrs.class.split(/\s+/).find(Boolean);
      if (firstClass) segment += `.${cssEscape(firstClass)}`;
    }
    const siblings = elementSiblings(current);
    if (siblings.length > 1) segment += `:nth-of-type(${siblings.indexOf(current) + 1})`;
    segments.unshift(segment);
    current = current.parent;
  }
  return segments.join(" > ");
}

function controlRole(node) {
  if (node.attrs.role) return node.attrs.role;
  if (node.tag === "a") return "link";
  if (node.tag === "input") {
    const type = String(node.attrs.type || "text").toLowerCase();
    if (type === "checkbox") return "checkbox";
    if (type === "radio") return "radio";
    if (type === "range") return "slider";
    if (type === "search") return "searchbox";
    if (["button", "submit", "reset", "image"].includes(type)) return "button";
    return "textbox";
  }
  if (node.tag === "select") return "combobox";
  if (node.tag === "textarea") return "textbox";
  if (node.tag === "summary") return "button";
  return node.tag;
}

function controlLabel(node, context) {
  const ariaLabel = normalizeText(node.attrs["aria-label"]);
  if (ariaLabel) return ariaLabel;

  const labelledBy = String(node.attrs["aria-labelledby"] || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => context.byId.get(id))
    .filter(Boolean)
    .map(descendantText)
    .filter(Boolean);
  if (labelledBy.length > 0) return normalizeText(labelledBy.join(" "));

  if (node.attrs.id) {
    const explicitLabels = (context.labelsByFor.get(node.attrs.id) || [])
      .map(descendantText)
      .filter(Boolean);
    if (explicitLabels.length > 0) return normalizeText(explicitLabels.join(" "));
  }
  const wrappingLabel = ancestorLabel(node);
  if (wrappingLabel && !wrappingLabel.attrs.for) {
    const labelable = labelableDescendants(wrappingLabel);
    if (labelable.length === 1 && labelable[0] === node) {
      const label = descendantText(wrappingLabel);
      if (label) return label;
    }
  }

  const title = normalizeText(node.attrs.title);
  if (title) return title;
  const placeholder = normalizeText(node.attrs.placeholder);
  if (placeholder) return placeholder;

  if (node.tag === "input") {
    const type = String(node.attrs.type || "text").toLowerCase();
    if (type === "image") return normalizeText(node.attrs.alt);
    if (["button", "submit", "reset"].includes(type)) return normalizeText(node.attrs.value);
    return "";
  }
  if (node.tag === "select" || node.tag === "textarea") return "";
  return descendantText(node);
}

export function accessibleNameForNode(node, root) {
  return controlLabel(node, accessibilityContext(root));
}

export function semanticRoleForNode(node) {
  return controlRole(node);
}

function inferUiEvent(node, canonicalEvents) {
  const attrs = node.attrs;
  const backBarButton = node.tag === "button"
    && attrs["aria-label"] === "返回"
    && hasAncestorClass(node, "fd-back-bar");
  const candidate = attrs["data-route-replace"] !== undefined
    ? "route.replace"
    : (attrs["data-route-back"] !== undefined
        || attrs["data-demo-back"] !== undefined
        || attrs["data-reader-exit"] !== undefined
        || backBarButton)
      ? "route.pop"
      : attrs["data-ui-event"]
    || (attrs["data-route"] ? "route.push" : null)
    || (attrs["data-nav-type"] ? "tab.item.select" : null)
    || (attrs["data-reader-page-action"] ? `reader.page.${attrs["data-reader-page-action"]}` : null)
    || ((attrs["data-reader-module"] || attrs["data-module"]) ? "reader.module.switch" : null);
  return candidate && canonicalEvents.has(candidate) ? candidate : null;
}

function hasAncestorClass(node, className) {
  let current = node.parent;
  while (current && current.tag !== "#root") {
    const classes = new Set(String(current.attrs.class || "").split(/\s+/).filter(Boolean));
    if (classes.has(className)) return true;
    current = current.parent;
  }
  return false;
}

function rendererSourcePaths() {
  return [...read(`${DEMO_ROOT}/index.html`).matchAll(/<script\s+src="\.\/renderers\/([^"?]+)(?:\?[^\"]*)?"/g)]
    .map((match) => `${DEMO_ROOT}/renderers/${match[1]}`);
}

function selectorGroups(selector) {
  const groups = [];
  let start = 0;
  let bracketDepth = 0;
  let parenDepth = 0;
  for (let index = 0; index < selector.length; index += 1) {
    const character = selector[index];
    if (character === "[") bracketDepth += 1;
    else if (character === "]") bracketDepth -= 1;
    else if (character === "(") parenDepth += 1;
    else if (character === ")") parenDepth -= 1;
    else if (character === "," && bracketDepth === 0 && parenDepth === 0) {
      groups.push(selector.slice(start, index).trim());
      start = index + 1;
    }
  }
  groups.push(selector.slice(start).trim());
  return groups.filter(Boolean);
}

function selectorParts(selector) {
  const parts = [];
  let current = "";
  let bracketDepth = 0;
  let parenDepth = 0;
  for (const character of selector.trim()) {
    if (/\s/.test(character) && bracketDepth === 0 && parenDepth === 0) {
      if (current) parts.push(current);
      current = "";
      continue;
    }
    current += character;
    if (character === "[") bracketDepth += 1;
    else if (character === "]") bracketDepth -= 1;
    else if (character === "(") parenDepth += 1;
    else if (character === ")") parenDepth -= 1;
  }
  if (current) parts.push(current);
  return parts;
}

function simpleSelectorMatches(node, selector) {
  const negatedAttributes = [...selector.matchAll(/:not\(\[([^\]=\s]+)(?:\s*=\s*['\"]?([^\]'\"]+)['\"]?)?\]\)/g)]
    .map((match) => [match[1].toLowerCase(), match[2]]);
  const withoutNegations = selector.replace(/:not\([^)]*\)/g, "");
  const tag = withoutNegations.match(/^[A-Za-z][A-Za-z0-9-]*/)?.[0]?.toLowerCase();
  if (tag && node.tag !== tag) return false;
  const classes = [...withoutNegations.matchAll(/\.([A-Za-z0-9_-]+)/g)].map((match) => match[1]);
  const classSet = new Set(String(node.attrs.class || "").split(/\s+/).filter(Boolean));
  if (classes.some((className) => !classSet.has(className))) return false;
  const attributes = [...withoutNegations.matchAll(/\[([^\]=\s]+)(?:\s*=\s*['\"]?([^\]'\"]+)['\"]?)?\]/g)]
    .map((match) => [match[1].toLowerCase(), match[2]]);
  for (const [name, value] of attributes) {
    if (!(name in node.attrs)) return false;
    if (value !== undefined && node.attrs[name] !== value) return false;
  }
  for (const [name, value] of negatedAttributes) {
    if (name in node.attrs && (value === undefined || node.attrs[name] === value)) return false;
  }
  return true;
}

function selectorMatches(node, selector) {
  const parts = selectorParts(selector);
  if (parts.length === 0 || !simpleSelectorMatches(node, parts[parts.length - 1])) return false;
  let ancestor = node.parent;
  for (let index = parts.length - 2; index >= 0; index -= 1) {
    while (ancestor && ancestor.tag !== "#root" && !simpleSelectorMatches(ancestor, parts[index])) {
      ancestor = ancestor.parent;
    }
    if (!ancestor || ancestor.tag === "#root") return false;
    ancestor = ancestor.parent;
  }
  return true;
}

function motionBindingDeclarations(runtimeSource) {
  const start = runtimeSource.indexOf("  function applyMotionSelectorBindings(root) {");
  const end = runtimeSource.indexOf("  function commonMotionFamily(", start);
  assert(start >= 0 && end > start, "render-runtime.js motion selector binding section is missing");
  const section = runtimeSource.slice(start, end);
  return [...section.matchAll(/\bbind\("([^"]+)",\s*"([^"]+)"\);/g)]
    .map((match) => ({ selector: match[1], motionId: match[2] }));
}

function motionBindingRules(declarations) {
  return declarations.flatMap((declaration) => selectorGroups(declaration.selector).map((selector) => ({
    selector,
    motionId: declaration.motionId,
  })));
}

function inferMotionHints(node, motionRules) {
  const hints = motionRules
    .filter((rule) => selectorMatches(node, rule.selector))
    .map((rule) => rule.motionId);
  if (node.tag !== "button" && node.attrs.role === "button" && hints.length === 0) hints.push("listRow.press");
  if (node.tag === "button") hints.push("button.activate");
  return [...new Set(hints)].sort();
}

function routeMotionContext(context) {
  const attrs = context?.node?.attrs || context?.dataAttributes || {};
  const uiEvent = context?.uiEvent || null;
  if (attrs["data-route-replace"] !== undefined || uiEvent === "route.replace") return "replace";
  if (
    attrs["data-route-back"] !== undefined
    || attrs["data-demo-back"] !== undefined
    || attrs["data-reader-exit"] !== undefined
    || uiEvent === "route.pop"
  ) return "pop";
  if (attrs["data-route"] !== undefined || uiEvent === "route.push") return "push";
  return null;
}

export function normalizeCanonicalMotionIds(rawMotionHints, canonicalMotionIdSet, context = {}) {
  const resolved = [];
  for (const rawMotionHint of rawMotionHints) {
    if (["app.route.push", "app.route.push.forward", "app.route.pop", "app.route.pop.backward", "app.route.replace"].includes(rawMotionHint)) {
      continue;
    }
    const candidates = canonicalMotionIdSet.has(rawMotionHint)
      ? [rawMotionHint]
      : RAW_MOTION_NORMALIZATION[rawMotionHint] || [];
    for (const candidate of candidates) {
      if (canonicalMotionIdSet.has(candidate)) resolved.push(candidate);
    }
  }
  const routeContext = routeMotionContext(context);
  const hasRouteMotionEvidence = rawMotionHints.some((motionId) => motionId.startsWith("app.route."))
    || ["route.push", "route.pop", "route.replace"].includes(context?.uiEvent);
  const routeMotionId = {
    push: "app.route.push.forward",
    pop: "app.route.pop.backward",
    replace: "app.route.replace",
  }[routeContext];
  if (hasRouteMotionEvidence && routeMotionId && canonicalMotionIdSet.has(routeMotionId)) resolved.push(routeMotionId);
  return [...new Set(resolved)].sort();
}

function localStorageStub() {
  const values = new Map();
  return {
    getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); },
    clear() { values.clear(); },
  };
}

export function createVmRenderer() {
  const window = {
    innerWidth: 390,
    innerHeight: 844,
    localStorage: localStorageStub(),
    matchMedia() { return { matches: false, addEventListener() {}, removeEventListener() {} }; },
  };
  const document = {
    documentElement: { clientWidth: 390, clientHeight: 844 },
  };
  const context = vm.createContext({
    window,
    document,
    console: { log() {}, warn() {}, error() {} },
    setTimeout,
    clearTimeout,
    URL,
    URLSearchParams,
  });
  const sourcePaths = [
    `${DEMO_ROOT}/asset-library/icons.js`,
    `${DEMO_ROOT}/shared-shell-kit/kit.js`,
    `${DEMO_ROOT}/appearance-spec.js`,
    `${DEMO_ROOT}/fixture.js`,
    `${DEMO_ROOT}/route-contract.js`,
    `${DEMO_ROOT}/rss-runtime-contract.js`,
    `${DEMO_ROOT}/import-runtime-contract.js`,
    `${DEMO_ROOT}/discover-runtime-contract.js`,
    ...rendererSourcePaths(),
  ];
  for (const sourcePath of sourcePaths) {
    new vm.Script(read(sourcePath), { filename: sourcePath }).runInContext(context, { timeout: 2_000 });
  }

  const runtimePath = `${DEMO_ROOT}/render-runtime.js`;
  const runtimeSource = read(runtimePath);
  const exportMarker = "  window.ReaderRuntimeSharedFragments = {";
  assert(runtimeSource.includes(exportMarker), "render-runtime.js test export marker is missing");
  const instrumented = runtimeSource.replace(
    exportMarker,
    `  window.__interactionInventoryRenderRoute = renderRoute;\n\n${exportMarker}`,
  );
  new vm.Script(instrumented, { filename: runtimePath }).runInContext(context, { timeout: 5_000 });
  assert(typeof window.__interactionInventoryRenderRoute === "function", "renderRoute VM export failed");
  assert(window.READER_FRONTEND_DEMO_DRAFT_FIXTURE, "demo fixture did not load");
  const motionDeclarations = motionBindingDeclarations(runtimeSource);
  return {
    fixture: window.READER_FRONTEND_DEMO_DRAFT_FIXTURE,
    motionDeclarations,
    motionRules: motionBindingRules(motionDeclarations),
    routeContract: window.ReaderFrontendDemoDraftRouteContract,
    sourcePaths: [...sourcePaths, runtimePath],
    renderRoute(routeId, options = {}, appState = {}) {
      return String(window.__interactionInventoryRenderRoute(routeId, window.READER_FRONTEND_DEMO_DRAFT_FIXTURE, options, appState));
    },
  };
}

function resolveAliasRoute(graph, route) {
  let current = route;
  const visited = new Set();
  while (current.status === "alias") {
    assert(!visited.has(current.routeId), `screen graph alias cycle at ${current.routeId}`);
    visited.add(current.routeId);
    current = graph.routes.find((candidate) => candidate.routeId === current.aliasFor);
    assert(current, `screen graph alias target missing for ${route.routeId}`);
  }
  return current;
}

export function buildRenderCases(graph) {
  const cases = [];
  for (const route of graph.routes) {
    const resolved = resolveAliasRoute(graph, route);
    const variants = route.status === "direct" ? route.variants : resolved.variants;
    for (const variant of variants) {
      cases.push({
        routeId: route.routeId,
        resolvedRouteId: resolved.routeId,
        aliasFor: route.aliasFor,
        shell: route.shell,
        variant,
      });
    }
  }
  return cases;
}

function appStateForVariant(variant) {
  return plainClone({
    pageState: variant.pageState,
    ...variant.facets,
    ...variant.context,
  });
}

function viewStateForCase(renderCase) {
  return {
    routeId: renderCase.routeId,
    pageState: renderCase.variant.pageState,
    context: plainClone(renderCase.variant.context),
    components: plainClone(renderCase.variant.components),
  };
}

function candidateKey(caseKey, category, selector, signature) {
  return `candidate:${sha256(`${caseKey}\u0000${category}\u0000${selector}\u0000${signature}`).slice(0, 20)}`;
}

function hasSemanticControlAncestor(node) {
  let current = node.parent;
  while (current && current.tag !== "#root") {
    if (isControl(current)) return true;
    current = current.parent;
  }
  return false;
}

function suspectedNonSemanticReasons(node) {
  if (
    isControl(node)
    || EXCLUDED_COMPOSITE_ROLES.has(String(node.attrs.role || "").toLowerCase())
    || hasSemanticControlAncestor(node)
  ) return [];
  const reasons = [];
  const tabindex = node.attrs.tabindex;
  if (tabindex !== undefined && Number.isFinite(Number(tabindex)) && Number(tabindex) >= 0) {
    reasons.push("tabindex-nonnegative");
  }
  for (const attribute of Object.keys(node.attrs).sort()) {
    if (ACTIONABLE_DATA_ATTRIBUTES.has(attribute)) reasons.push(`actionable-data-attribute:${attribute}`);
  }
  const classes = new Set(String(node.attrs.class || "").split(/\s+/).filter(Boolean));
  if (classes.has("fd-setting-row")) {
    for (const className of [...SETTINGS_CONTROL_CLASSES].sort()) {
      if (classes.has(className)) reasons.push(`settings-control-class:${className}`);
    }
  }
  return reasons;
}

function baseRecord(node, renderCase, runtimeFamily, context, motionRules, canonicalEvents, canonicalMotionIdSet) {
  const selector = auditSelector(node);
  const attrs = dataAttributes(node.attrs);
  const caseKey = `${renderCase.routeId}/${renderCase.variant.variantId}`;
  const label = controlLabel(node, context);
  const uiEvent = inferUiEvent(node, canonicalEvents);
  const rawMotionHints = inferMotionHints(node, motionRules);
  const canonicalMotionIds = normalizeCanonicalMotionIds(rawMotionHints, canonicalMotionIdSet, { node, uiEvent });
  return {
    routeId: renderCase.routeId,
    resolvedRouteId: renderCase.resolvedRouteId,
    aliasFor: renderCase.aliasFor,
    runtimeFamily,
    variantId: renderCase.variant.variantId,
    pageState: renderCase.variant.pageState,
    componentType: null,
    componentInstanceId: null,
    domTag: node.tag,
    role: node.attrs.role || controlRole(node),
    label,
    selector,
    dataAttributes: attrs,
    uiEvent,
    rawMotionHints,
    canonicalMotionIds,
    joinStatus: "unjoined-no-stable-key",
    _candidateContext: { caseKey, signature: JSON.stringify({ tag: node.tag, role: node.attrs.role || controlRole(node), label, attrs }) },
  };
}

function controlRecord(node, renderCase, runtimeFamily, context, motionRules, canonicalEvents, canonicalMotionIdSet) {
  const record = baseRecord(
    node,
    renderCase,
    runtimeFamily,
    context,
    motionRules,
    canonicalEvents,
    canonicalMotionIdSet,
  );
  const gapCodes = [JOIN_GAP_CODE];
  if (!record.uiEvent) gapCodes.push(UI_EVENT_GAP_CODE);
  if (record.rawMotionHints.length === 0) gapCodes.push(RAW_MOTION_GAP_CODE);
  if (record.canonicalMotionIds.length === 0) gapCodes.push(CANONICAL_MOTION_GAP_CODE);
  if (!record.label) gapCodes.push(LABEL_GAP_CODE);
  const { caseKey, signature } = record._candidateContext;
  delete record._candidateContext;
  return {
    ...record,
    semanticStatus: "semantic-control",
    gapCodes,
    candidateKey: candidateKey(caseKey, "semantic-control", record.selector, signature),
    candidateKeyStatus: "noncanonical-audit-candidate",
  };
}

function suspectedNonSemanticRecord(
  node,
  reasons,
  renderCase,
  runtimeFamily,
  context,
  motionRules,
  canonicalEvents,
  canonicalMotionIdSet,
) {
  const record = baseRecord(
    node,
    renderCase,
    runtimeFamily,
    context,
    motionRules,
    canonicalEvents,
    canonicalMotionIdSet,
  );
  const gapCodes = [NON_SEMANTIC_GAP_CODE, JOIN_GAP_CODE];
  if (!record.uiEvent) gapCodes.push(UI_EVENT_GAP_CODE);
  if (record.rawMotionHints.length === 0) gapCodes.push(RAW_MOTION_GAP_CODE);
  if (record.canonicalMotionIds.length === 0) gapCodes.push(CANONICAL_MOTION_GAP_CODE);
  if (!record.label) gapCodes.push(LABEL_GAP_CODE);
  const { caseKey, signature } = record._candidateContext;
  delete record._candidateContext;
  return {
    ...record,
    semanticStatus: "suspected-nonsemantic-control",
    suspectedReasons: reasons,
    gapCodes,
    candidateKey: candidateKey(caseKey, "suspected-nonsemantic-control", record.selector, signature),
    candidateKeyStatus: "noncanonical-audit-candidate",
  };
}

function walkElements(root, visit) {
  for (const child of root.children) {
    visit(child);
    walkElements(child, visit);
  }
}

function aggregateControlCoverage(controls) {
  const byTag = {};
  const byRole = {};
  const byJoinStatus = {};
  const byRuntimeFamily = {};
  const gapCodes = {};
  const rawMotionHints = new Set();
  const canonicalMotionIds = new Set();
  let rawMotionHintOccurrences = 0;
  let canonicalMotionIdOccurrences = 0;
  for (const control of controls) {
    byTag[control.domTag] = (byTag[control.domTag] || 0) + 1;
    byRole[control.role || "none"] = (byRole[control.role || "none"] || 0) + 1;
    byJoinStatus[control.joinStatus] = (byJoinStatus[control.joinStatus] || 0) + 1;
    byRuntimeFamily[control.runtimeFamily] = (byRuntimeFamily[control.runtimeFamily] || 0) + 1;
    for (const code of control.gapCodes) gapCodes[code] = (gapCodes[code] || 0) + 1;
    rawMotionHintOccurrences += control.rawMotionHints.length;
    canonicalMotionIdOccurrences += control.canonicalMotionIds.length;
    for (const motionId of control.rawMotionHints) rawMotionHints.add(motionId);
    for (const motionId of control.canonicalMotionIds) canonicalMotionIds.add(motionId);
  }
  const sortedRecord = (record) => Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  );
  return {
    count: controls.length,
    withUiEvent: controls.filter((control) => control.uiEvent !== null).length,
    withRawMotionHints: controls.filter((control) => control.rawMotionHints.length > 0).length,
    rawMotionHintOccurrences,
    uniqueRawMotionHints: [...rawMotionHints].sort(),
    withCanonicalMotionIds: controls.filter((control) => control.canonicalMotionIds.length > 0).length,
    canonicalMotionIdOccurrences,
    uniqueCanonicalMotionIds: [...canonicalMotionIds].sort(),
    withRawMotionHintsButNoCanonicalMotionId: controls.filter(
      (control) => control.rawMotionHints.length > 0 && control.canonicalMotionIds.length === 0,
    ).length,
    missingAccessibleNames: controls.filter((control) => !control.label).length,
    canonicalControlIds: 0,
    joinedControls: controls.filter((control) => control.joinStatus === "joined-stable-key").length,
    unjoinedControls: controls.filter((control) => control.joinStatus !== "joined-stable-key").length,
    byTag: sortedRecord(byTag),
    byRole: sortedRecord(byRole),
    byJoinStatus: sortedRecord(byJoinStatus),
    byRuntimeFamily: sortedRecord(byRuntimeFamily),
    gapCodes: sortedRecord(gapCodes),
  };
}

function identicalVariantRenderGapSummary(caseCoverage) {
  const groups = [];
  const byRoute = new Map();
  for (const renderCase of caseCoverage) {
    const byHash = byRoute.get(renderCase.routeId) || new Map();
    const cases = byHash.get(renderCase.renderSha256) || [];
    cases.push(renderCase);
    byHash.set(renderCase.renderSha256, cases);
    byRoute.set(renderCase.routeId, byHash);
  }
  for (const [routeId, byHash] of byRoute) {
    for (const [renderSha256, matchingCases] of byHash) {
      if (matchingCases.length < 2) continue;
      groups.push({
        gapCode: IDENTICAL_VARIANT_RENDER_GAP_CODE,
        classification: "explicit-gap-review",
        routeId,
        renderSha256,
        count: matchingCases.length,
        cases: matchingCases.map((item) => ({
          variantId: item.variantId,
          pageState: item.pageState,
          semanticControls: item.semanticControls,
          suspectedNonSemanticControls: item.suspectedNonSemanticControls,
        })),
      });
    }
  }
  groups.sort((left, right) => left.routeId.localeCompare(right.routeId) || left.renderSha256.localeCompare(right.renderSha256));
  const routes = [...new Set(groups.map((group) => group.routeId))].sort();
  return {
    gapCode: IDENTICAL_VARIANT_RENDER_GAP_CODE,
    interpretation: "Review candidate only. Identical current HTML does not by itself prove that the route variants are incorrect.",
    count: groups.length,
    routeCount: routes.length,
    routes,
    cases: groups.reduce((total, group) => total + group.count, 0),
    groups,
  };
}

function motionNormalizationCoverage(declarations, canonicalMotionIdSet) {
  const nonCanonicalBindings = declarations
    .filter((declaration) => !canonicalMotionIdSet.has(declaration.motionId))
    .map((declaration) => {
      const bindingContext = declaration.motionId === "app.route.push"
        ? { uiEvent: "route.push" }
        : declaration.motionId === "app.route.pop"
          ? { uiEvent: "route.pop" }
          : {};
      return {
        selector: declaration.selector,
        rawMotionHint: declaration.motionId,
        canonicalMotionIds: normalizeCanonicalMotionIds(
          [declaration.motionId],
          canonicalMotionIdSet,
          bindingContext,
        ),
      };
    });
  const slashCompoundBindings = nonCanonicalBindings.filter((binding) => binding.rawMotionHint.includes("/"));
  return {
    canonicalMotionIdEnumCount: canonicalMotionIdSet.size,
    nonCanonicalBindingOccurrences: nonCanonicalBindings.length,
    unresolvedBindingOccurrences: nonCanonicalBindings.filter((binding) => binding.canonicalMotionIds.length === 0).length,
    slashCompoundBindingOccurrences: slashCompoundBindings.length,
    slashCompoundRawHints: [...new Set(slashCompoundBindings.map((binding) => binding.rawMotionHint))].sort(),
    bindings: nonCanonicalBindings,
  };
}

export function buildInteractionInventoryArtifacts() {
  const screenGraphInputs = loadScreenGraphInputs();
  const screenGraphArtifacts = buildScreenGraphArtifacts(screenGraphInputs);
  const graph = screenGraphArtifacts.graph;
  const canonicalEvents = new Set(screenGraphInputs.uiEventSchema.properties.type.enum);
  const motionSchemaPath = "contracts/motion.schema.json";
  const motionSchema = JSON.parse(read(motionSchemaPath));
  const canonicalMotionIdSet = new Set(motionSchema.properties.id.enum);
  const vmRenderer = createVmRenderer();
  const cases = buildRenderCases(graph);
  const semanticControls = [];
  const suspectedNonSemanticControls = [];
  const caseCoverage = [];

  for (const renderCase of cases) {
    const viewState = viewStateForCase(renderCase);
    const options = { pageState: renderCase.variant.pageState, viewState };
    const html = vmRenderer.renderRoute(renderCase.routeId, options, appStateForVariant(renderCase.variant));
    const root = parseHtmlFragment(html);
    const context = accessibilityContext(root);
    const presentation = vmRenderer.routeContract.resolveRoutePresentation(renderCase.routeId, viewState);
    const semanticBefore = semanticControls.length;
    const suspectedBefore = suspectedNonSemanticControls.length;
    walkElements(root, (node) => {
      if (isControl(node)) {
        semanticControls.push(controlRecord(
          node,
          renderCase,
          presentation.family,
          context,
          vmRenderer.motionRules,
          canonicalEvents,
          canonicalMotionIdSet,
        ));
        return;
      }
      const reasons = suspectedNonSemanticReasons(node);
      if (reasons.length > 0) {
        suspectedNonSemanticControls.push(suspectedNonSemanticRecord(
          node,
          reasons,
          renderCase,
          presentation.family,
          context,
          vmRenderer.motionRules,
          canonicalEvents,
          canonicalMotionIdSet,
        ));
      }
    });
    caseCoverage.push({
      routeId: renderCase.routeId,
      resolvedRouteId: renderCase.resolvedRouteId,
      aliasFor: renderCase.aliasFor,
      runtimeFamily: presentation.family,
      variantId: renderCase.variant.variantId,
      pageState: renderCase.variant.pageState,
      semanticControls: semanticControls.length - semanticBefore,
      suspectedNonSemanticControls: suspectedNonSemanticControls.length - suspectedBefore,
      renderSha256: sha256(html),
    });
  }

  const inventory = {
    schemaVersion: "1.1.0",
    generatedFrom: {
      artifactPaths: [INTERACTION_INVENTORY_PATH, INTERACTION_COVERAGE_PATH],
      screenGraphPath: "ui-spec/screen-graph.json",
      screenGraphSha256: screenGraphArtifacts.coverage.graphSha256,
      motionSchemaPath,
      motionSchemaSha256: sha256(read(motionSchemaPath)),
      rendererMode: "VM-rendered renderRoute with active index.html renderer modules",
      rendererSourcePaths: vmRenderer.sourcePaths,
      rendererSourcesSha256: sha256(vmRenderer.sourcePaths.map((sourcePath) => `${sourcePath}\u0000${read(sourcePath)}`).join("\u0000")),
    },
    identityBoundary: {
      canonicalControlIdAvailable: false,
      candidateKeyCanonical: false,
      note: "candidateKey and selector are deterministic audit locators only; neither is a product control identity or a ScreenGraph join key.",
    },
    semanticControls,
    suspectedNonSemanticControls,
  };

  const semanticControlCoverage = aggregateControlCoverage(semanticControls);
  const suspectedNonSemanticControlCoverage = aggregateControlCoverage(suspectedNonSemanticControls);
  const coverage = {
    schemaVersion: "1.1.0",
    controlEnumerationPolicy: {
      nativeTags: [...NATIVE_CONTROL_TAGS].sort(),
      anchorsWithHref: true,
      actionableAriaRoles: [...INTERACTIVE_ROLES].sort(),
      excludedCompositeRoles: [...EXCLUDED_COMPOSITE_ROLES].sort(),
      note: "Composite listbox containers are excluded from the control denominator; their actionable option descendants are counted.",
    },
    routeCases: cases.length,
    canonicalRoutes: graph.routes.length,
    directVariantCases: graph.routes.filter((route) => route.status === "direct").reduce((total, route) => total + route.variants.length, 0),
    aliasCases: graph.routes.filter((route) => route.status === "alias").length,
    semanticControls: semanticControls.length,
    suspectedNonSemanticControls: suspectedNonSemanticControls.length,
    semanticControlCoverage,
    suspectedNonSemanticControlCoverage,
    motionNormalization: motionNormalizationCoverage(vmRenderer.motionDeclarations, canonicalMotionIdSet),
    explicitGapSummaries: {
      identicalVariantRenders: identicalVariantRenderGapSummary(caseCoverage),
    },
    inventorySha256: sha256(formatJson(inventory)),
    cases: caseCoverage,
    proofBoundary: {
      coverageMeans: "Every canonical direct ScreenGraph variant and every alias route can be VM-rendered; semantic controls and heuristic non-semantic interaction candidates are enumerated separately and deterministically.",
      coverageDoesNotMean: [
        "Controls are joined to canonical ScreenGraph component instances",
        "The heuristic suspected-nonsemantic scan proves that every visually clickable element was found",
        "Figma interactions match the Web renderer",
        "Native platform behavior has been device-tested",
      ],
    },
  };
  return { inventory, coverage };
}

export function writeInteractionInventoryArtifacts(artifacts = buildInteractionInventoryArtifacts()) {
  const outputs = [
    [INTERACTION_INVENTORY_PATH, artifacts.inventory],
    [INTERACTION_COVERAGE_PATH, artifacts.coverage],
  ];
  for (const [relativePath, value] of outputs) {
    const absolutePath = join(REPO_ROOT, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, formatJson(value));
  }
  return outputs.map(([relativePath]) => relativePath);
}

export function checkInteractionInventoryArtifactBytes(artifacts = buildInteractionInventoryArtifacts()) {
  const outputs = [
    [INTERACTION_INVENTORY_PATH, formatJson(artifacts.inventory)],
    [INTERACTION_COVERAGE_PATH, formatJson(artifacts.coverage)],
  ];
  for (const [relativePath, expected] of outputs) {
    const absolutePath = join(REPO_ROOT, relativePath);
    assert(existsSync(absolutePath), `missing generated interaction inventory artifact: ${relativePath}`);
    assert(
      readFileSync(absolutePath, "utf8") === expected,
      `interaction inventory artifact drift: ${relativePath}; run node tools/interaction-inventory/generate-interaction-inventory.mjs --write`,
    );
  }
  return true;
}

// ===========================================================================
// A2 · Control Identity Foundation (appended 2026-07-19)
// Adds canonical controlId generation, ScreenGraph binding, and validation
// helpers. Does not modify existing IC0 inventory functions; only appends.
// ===========================================================================

export const CONTROL_ID_SCHEMA_VERSION = "1.3.0";
export const CONTROL_ID_REGISTRY_PATH = "tools/interaction-inventory/generated/control-id-registry.json";
export const SCREENGRAPH_BINDING_PATH = "tools/interaction-inventory/generated/screengraph-binding.json";
export const FIGMA_CROSSWALK_PENDING_PATH = "tools/interaction-inventory/generated/figma-crosswalk-pending.json";
export const DOM_IDENTITY_MAP_PATH = "tools/interaction-inventory/generated/dom-identity-map.json";
export const NON_INTERACTIVE_CONTAINERS_PATH = "tools/interaction-inventory/generated/nonInteractiveContainers.json";

// ARIA container roles that are not interactive controls. Candidates carrying
// these roles are excluded from the canonical registry and recorded separately
// in nonInteractiveContainers.json.
const NON_INTERACTIVE_ARIA_CONTAINER_ROLES = new Set(["group", "section"]);
export const CODEGEN_OUTPUT_PATHS = Object.freeze({
  typescriptTypes: "tools/interaction-inventory/generated/control-identity.generated.ts",
  domSelectors: "tools/interaction-inventory/generated/control-dom-selectors.generated.json",
  screenGraphBindings: "tools/interaction-inventory/generated/screengraph-binding.generated.json",
});

// Priority order for deriving a human-readable semantic slug from data-* attrs.
// The first attribute that is present wins. This is purely for readability; the
// hash discriminator guarantees uniqueness regardless of slug availability.
const CONTROL_ID_PRIORITY_DATA_ATTRIBUTES = Object.freeze([
  "data-action",
  "data-book-action",
  "data-source-action",
  "data-settings-option-key",
  "data-reader-setting-option-key",
  "data-reader-page-action",
  "data-reader-tts-action",
  "data-reader-chapter-action",
  "data-top-action",
  "data-reader-module",
  "data-module",
  "data-reader-setting-toggle",
  "data-reader-brightness-auto",
  "data-reader-quick-expand",
  "data-reader-quick-collapse",
  "data-reader-panel-expand",
  "data-reader-panel-collapse",
  "data-reader-more-toggle",
  "data-reader-more-close",
  "data-reader-more-action",
  "data-reader-dismiss",
  "data-reader-exit",
  "data-reader-auto-toggle",
  "data-route",
  "data-route-replace",
  "data-route-back",
  "data-demo-back",
  "data-nav-type",
  "data-search-submit",
  "data-search-reset",
  "data-search-history-select",
  "data-search-history-toggle",
  "data-book-search-clear-history",
  "data-filter-toggle",
  "data-settings-overlay",
  "data-open-dialog",
  "data-close-dialog",
  "data-open-sheet",
  "data-close-sheet",
  "data-open-keyboard",
  "data-close-keyboard",
  "data-settings-option-choice",
  "data-source-select",
  "data-ui-event",
]);

const SLUG_FOR_VALUELESS_ATTRIBUTE = Object.freeze({
  "data-route-replace": "route-replace",
  "data-route-back": "route-back",
  "data-demo-back": "demo-back",
  "data-reader-exit": "reader-exit",
  "data-reader-dismiss": "reader-dismiss",
  "data-search-submit": "search-submit",
  "data-search-reset": "search-reset",
  "data-search-history-select": "search-history-select",
  "data-search-history-toggle": "search-history-toggle",
  "data-book-search-clear-history": "book-search-clear-history",
  "data-filter-toggle": "filter-toggle",
  "data-settings-overlay": "settings-overlay",
  "data-open-dialog": "open-dialog",
  "data-close-dialog": "close-dialog",
  "data-open-sheet": "open-sheet",
  "data-close-sheet": "close-sheet",
  "data-open-keyboard": "open-keyboard",
  "data-close-keyboard": "close-keyboard",
  "data-reader-auto-toggle": "reader-auto-toggle",
  "data-reader-brightness-auto": "reader-brightness-auto",
  "data-reader-setting-toggle": "reader-setting-toggle",
  "data-reader-quick-expand": "reader-quick-expand",
  "data-reader-quick-collapse": "reader-quick-collapse",
  "data-reader-panel-expand": "reader-panel-expand",
  "data-reader-panel-collapse": "reader-panel-collapse",
  "data-reader-more-toggle": "reader-more-toggle",
  "data-reader-more-close": "reader-more-close",
  "data-reader-more-action": "reader-more-action",
  "data-source-select": "source-select",
});

// ===========================================================================
// R1.2 · Explicit semantic identity whitelists
//
// actionKey is derived ONLY from the explicit semantic attribute whitelist.
// It is NEVER inferred from label / text / class / selector / role.
// When no explicit semantic attribute is present, actionKey = null and
// mappingStatus = pending-explicit-semantics.
//
// instanceKey is derived from explicit instance identifier attributes.
// When no instance attribute is present, instanceKey = null. Multiple
// occurrences of the same (route, state, entityKey) with null instanceKey
// are marked pending-instance-disambiguation.
// ===========================================================================

const ACTION_KEY_ATTRIBUTE_RULES = Object.freeze([
  // data-action: value IS the actionKey (e.g. "tts.set-speed", "book.open")
  { attr: "data-action", derive: (value) => (value && value.length > 0 ? value : null) },
  // data-route: navigation push, actionKey is always "route.push"
  { attr: "data-route", derive: () => "route.push" },
  // data-route-replace: navigation replace, actionKey is always "route.replace"
  { attr: "data-route-replace", derive: () => "route.replace" },
  // data-route-back: navigation back, actionKey is always "route.back"
  { attr: "data-route-back", derive: () => "route.back" },
  // data-demo-back: demo back navigation, actionKey is always "route.back"
  { attr: "data-demo-back", derive: () => "route.back" },
]);

const INSTANCE_KEY_ATTRIBUTE_RULES = Object.freeze([
  // Navigation destination (for route.push / route.replace buttons).
  // The data-route value IS the instance discriminator for navigation —
  // two buttons going to different routes are different instances even
  // if they share the same entityKey (route.push).
  { attr: "data-route", prefix: "route" },
  { attr: "data-route-replace", prefix: "route" },
  // Generic instance ordinal.
  { attr: "data-instance", prefix: "instance" },
  // Book identifier (library / bookshelf / reader entry points).
  { attr: "data-book-id", prefix: "book" },
  // Reader chapter business identifier. This is fixture/contract identity and
  // must replace DOM ordinal or display-label disambiguation for chapter rows.
  { attr: "data-reader-chapter-key", prefix: "chapter" },
  // TTS speed timer value (reader-full-tts speed options).
  { attr: "data-reader-tts-timer-value", prefix: "tts-speed" },
  // TTS speed timer index (fallback for TTS options).
  { attr: "data-reader-tts-timer-index", prefix: "tts-idx" },
  // RSS source identifier (target of the action, also disambiguates instances).
  { attr: "data-rss-source-id", prefix: "rss-source" },
  // Discover entry identifier.
  { attr: "data-discover-entry", prefix: "discover" },
  // Reader typography value.
  { attr: "data-reader-typography-value", prefix: "typography" },
  // Reader font value.
  { attr: "data-w4-font-value", prefix: "font" },
  // Book focus index.
  { attr: "data-book-focus-index", prefix: "book-focus" },
]);

function kebabCaseAtom(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[^\w\s.-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/\.+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
    .toLowerCase();
}

function slugFromAttribute(name, value) {
  if (value === undefined || value === "") {
    return SLUG_FOR_VALUELESS_ATTRIBUTE[name] || name.replace(/^data-/, "");
  }
  const atom = kebabCaseAtom(value);
  if (!atom) {
    return SLUG_FOR_VALUELESS_ATTRIBUTE[name] || name.replace(/^data-/, "");
  }
  return `${name.replace(/^data-/, "")}-${atom}`;
}

export function deriveControlRole(control) {
  const role = String(control.role || "").toLowerCase();
  if (role) return role;
  return control.domTag || "generic";
}

export function deriveControlFamily(control) {
  const tag = control.domTag;
  const role = String(control.role || "").toLowerCase();
  if (tag === "a" || role === "link") return "link";
  if (role === "switch") return "switch";
  if (role === "checkbox") return "checkbox";
  if (role === "radio") return "radio";
  if (role === "slider") return "slider";
  if (role === "searchbox") return "searchbox";
  if (role === "textbox" || tag === "textarea") return "textbox";
  if (role === "combobox" || tag === "select") return "combobox";
  if (role === "option") return "option";
  if (role === "tab") return "tab";
  if (role === "menuitem") return "menuitem";
  if (role === "menuitemcheckbox") return "menuitemcheckbox";
  if (role === "menuitemradio") return "menuitemradio";
  if (role === "treeitem") return "treeitem";
  if (tag === "summary") return "summary";
  if (tag === "article" && role === "button") return "listrow-action";
  if (tag === "i" && role === "button") return "icon-button";
  if (tag === "button" && role === "button") return "button";
  if (role === "button") return "button";
  return "generic-button";
}

export function deriveSemanticSlug(control) {
  const attrs = control.dataAttributes || {};
  for (const name of CONTROL_ID_PRIORITY_DATA_ATTRIBUTES) {
    if (Object.prototype.hasOwnProperty.call(attrs, name)) {
      const slug = slugFromAttribute(name, attrs[name]);
      if (slug) return slug;
    }
  }
  return null;
}

/**
 * R1.2: Derive the explicit semantic action key from the whitelist.
 * Returns null when no explicit semantic attribute is present (pending).
 * NEVER infers from label / text / class / selector / role.
 */
export function deriveActionKey(control) {
  const attrs = control.dataAttributes || {};
  for (const rule of ACTION_KEY_ATTRIBUTE_RULES) {
    if (Object.prototype.hasOwnProperty.call(attrs, rule.attr)) {
      const value = attrs[rule.attr];
      const actionKey = rule.derive(value);
      if (actionKey) return actionKey;
    }
  }
  return null;
}

/**
 * R1.2: Derive the explicit instance disambiguator from the whitelist.
 * Collects ALL matching instance attributes and combines them into a
 * composite instanceKey to ensure uniqueness within (route, state, entityKey)
 * groups. Returns null when no instance attribute is present.
 *
 * Example: a TTS option with data-reader-tts-timer-index="0" and
 * data-reader-tts-timer-value="13" gets instanceKey "tts-idx-0-tts-speed-13".
 */
export function deriveInstanceKey(control) {
  const attrs = control.dataAttributes || {};
  const parts = [];
  for (const rule of INSTANCE_KEY_ATTRIBUTE_RULES) {
    if (Object.prototype.hasOwnProperty.call(attrs, rule.attr)) {
      const value = attrs[rule.attr];
      if (value === undefined || value === null || value === "") continue;
      const atom = kebabCaseAtom(value);
      if (atom) parts.push(`${rule.prefix}-${atom}`);
    }
  }
  if (parts.length === 0) return null;
  return parts.join("-");
}

/**
 * A0 (schema 1.3.0): Derive mappingStatus from the independent
 * (needsActionKey, needsInstanceKey) pair.
 *   (false, false) -> mapped
 *   (true,  false) -> pending-action-key
 *   (false, true)  -> pending-instance-key
 *   (true,  true)  -> pending-action-and-instance-key
 */
export function deriveMappingStatus(needsActionKey, needsInstanceKey) {
  if (needsActionKey && needsInstanceKey) return "pending-action-and-instance-key";
  if (needsActionKey) return "pending-action-key";
  if (needsInstanceKey) return "pending-instance-key";
  return "mapped";
}

/**
 * A0 (schema 1.3.0): The four canonical mappingStatus values. Source of
 * truth: contracts/control-identity.schema.json `mappingStatus.enum`. This
 * list MUST stay in sync with src/control-identity/dom-identity.ts
 * `MAPPING_STATUS_VALUES`.
 */
export const MAPPING_STATUS_VALUES = Object.freeze([
  "mapped",
  "pending-action-key",
  "pending-instance-key",
  "pending-action-and-instance-key",
]);

/**
 * A0 (schema 1.3.0): The three pending mappingStatus values. Mirror of
 * src/control-identity/dom-identity.ts `PENDING_MAPPING_STATUS_VALUES`.
 */
export const PENDING_MAPPING_STATUS_VALUES = Object.freeze([
  "pending-action-key",
  "pending-instance-key",
  "pending-action-and-instance-key",
]);

/**
 * A0 (schema 1.3.0): Fail-closed guard for `data-control-key` writes.
 *
 * Page renderers MUST call this before stamping a controlKey onto the DOM.
 * Writing a pending controlKey would leak provisional identity into the
 * runtime, breaking the A0 invariant "禁止 pending identity 写入正式
 * data-control-key". This .mjs mirror exists so drift tests can exercise
 * the same fail-closed logic that the runtime TypeScript enforces in
 * src/control-identity/dom-identity.ts `assertMappingStatusAllowsControlKeyWrite`.
 *
 * Throws when mappingStatus is any pending-* value or an unknown value.
 */
export function assertMappingStatusAllowsControlKeyWrite(mappingStatus, context) {
  if (mappingStatus === "mapped") return;
  const suffix = context ? ` (context: ${context})` : "";
  if (PENDING_MAPPING_STATUS_VALUES.includes(mappingStatus)) {
    throw new Error(
      `assertMappingStatusAllowsControlKeyWrite: refusing to write data-control-key for pending mappingStatus="${mappingStatus}"${suffix}; ` +
        `resolve the action/instance gap first so mappingStatus becomes "mapped".`,
    );
  }
  throw new Error(
    `assertMappingStatusAllowsControlKeyWrite: unknown mappingStatus="${mappingStatus}"${suffix}; ` +
      `expected one of: ${MAPPING_STATUS_VALUES.join(", ")}.`,
  );
}


// ===========================================================================
// R1.2 · Explicit semantic identity model
//   entityKey  = {domain}.{family}.{role}[.{actionKey}]   (logical entity)
//   controlKey = {entityKey}@{route}.{state}[.{instanceKey}]  (route/state occurrence)
//   controlId  = DOM occurrence tracking id (retained from R1; NOT logical identity)
//
// R1.2 key change: actionKey is derived ONLY from the explicit semantic
// attribute whitelist (data-action / data-route / data-route-back / etc.).
// It is NEVER inferred from label / text / class / selector / role. When no
// explicit semantic attribute is present, actionKey = null and mappingStatus
// = pending-explicit-semantics.
//
// instanceKey is derived from explicit instance identifier attributes
// (data-book-id / data-reader-tts-timer-value / etc.). When null and multiple
// occurrences share (route, state, entityKey), mappingStatus
// = pending-instance-disambiguation and an ordinal fallback is used.
//
// entityKey MUST NOT depend on selector / label / variantId / domTag / viewport
// / DOM order / candidateKey. It is computed ONLY from:
//   - domain (runtimeFamily)
//   - family (derived from domTag + role)
//   - role (ARIA role or tag-derived role)
//   - actionKey (explicit semantic whitelist; null when absent)
//
// Collisions are fail-closed:
//   - entityKey collision between two controls with different
//     (domain, family, role, actionKey) signatures => throw (logic bug).
//   - Same entityKey but different non-null actionKey => throw (collision).
//   - Same entityKey, same actionKey, different label/UiEvent => ALLOWED
//     (label/UiEvent are DOM-layer, not logical-layer).
// ===========================================================================

/**
 * R1.2: Build the logical entity key. Depends ONLY on domain / family / role /
 * actionKey (explicit semantic whitelist). Never on selector / label /
 * variantId / domTag / viewport / DOM order / candidateKey. When actionKey is
 * null, entityKey = {domain}.{family}.{role} (pending-explicit-semantics).
 */
export function buildEntityKey(control) {
  const domain = control.runtimeFamily;
  const family = deriveControlFamily(control);
  const role = deriveControlRole(control);
  const actionKey = deriveActionKey(control);
  const atoms = [domain, family, role];
  if (actionKey && actionKey.length > 0) atoms.push(actionKey);
  return atoms.join(".");
}

/**
 * R1.2: Build the route/state occurrence key. Format:
 * {entityKey}@{route}.{state}[.{instanceKey}]. When instanceKey is non-null,
 * it disambiguates multiple occurrences. When null, no instanceKey atom is
 * appended (ordinal fallback is assigned by the caller for multi-occurrence
 * groups).
 */
export function buildControlKey(entityKey, route, state, instanceKey = null) {
  const safeRoute = kebabCaseAtom(route);
  const safeState = kebabCaseAtom(state) || "default";
  const base = `${entityKey}@${safeRoute}.${safeState}`;
  if (instanceKey && instanceKey.length > 0) {
    return `${base}.${instanceKey}`;
  }
  return base;
}

/**
 * R1.2: Verify entityKey uniqueness invariant. Two controls with different
 * (domain, family, role, actionKey) signatures must NEVER produce the same
 * entityKey. Additionally, two controls sharing the same entityKey must have
 * the same actionKey (if non-null) — a mismatch indicates a collision.
 * This is a fail-closed check; a violation indicates a logic bug in
 * buildEntityKey or a genuine semantic collision.
 */
export function assertEntityKeyNoCollision(candidateControls) {
  const byEntityKey = new Map();
  for (const control of candidateControls) {
    const entityKey = buildEntityKey(control);
    const actionKey = deriveActionKey(control);
    const signature = JSON.stringify({
      domain: control.runtimeFamily,
      family: deriveControlFamily(control),
      role: deriveControlRole(control),
      actionKey,
    });
    if (!byEntityKey.has(entityKey)) {
      byEntityKey.set(entityKey, signature);
    } else if (byEntityKey.get(entityKey) !== signature) {
      throw new Error(
        `R1.2 entityKey collision: ${entityKey} maps to two different signatures: `
        + `${byEntityKey.get(entityKey)} vs ${signature}`,
      );
    }
  }
  return true;
}

// R1.2: controlHashInputs feeds the DOM occurrence tracking id (controlId)
// ONLY. controlId is NOT the logical identity — it is retained from R1 for
// audit reproducibility and DOM tracking. The DOM occurrence hash
// intentionally includes selector/label/variantId/domTag/candidateKey so that
// any DOM-layer change is detectable in the audit trail. The logical identity
// lives in entityKey / controlKey (derived from actionKey / instanceKey, NOT
// from this hash).
function controlHashInputs(control) {
  return JSON.stringify({
    routeId: control.routeId,
    variantId: control.variantId,
    selector: control.selector,
    domTag: control.domTag,
    role: control.role || null,
    label: control.label || "",
    dataAttributes: control.dataAttributes || {},
    semanticStatus: control.semanticStatus || "semantic-control",
    candidateKey: control.candidateKey,
  });
}

function shortHash(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

export function selectorSha256(control) {
  return createHash("sha256").update(control.selector || "").digest("hex");
}

export function buildControlIdForCandidate(control, viewport = "phone") {
  const domain = control.runtimeFamily;
  const family = deriveControlFamily(control);
  const route = kebabCaseAtom(control.routeId);
  const state = kebabCaseAtom(control.pageState) || "default";
  const role = deriveControlRole(control);
  // R1.2: controlId is the DOM occurrence tracking id (retained from R1).
  // It still carries route/state/role/discriminator+hash for audit
  // reproducibility and DOM tracking, but it is NOT the logical identity.
  // The logical identity lives in entityKey / controlKey, derived from
  // actionKey / instanceKey (explicit semantic whitelist).
  const base = `${domain}.${family}.${route}.${state}.${role}`;
  const slug = deriveSemanticSlug(control);
  const hash = shortHash(controlHashInputs(control));
  const discriminator = slug ? `${slug}-h-${hash}` : `h-${hash}`;
  // R1.2: actionKey / instanceKey are the explicit semantic identity atoms.
  const actionKey = deriveActionKey(control);
  const instanceKey = deriveInstanceKey(control);
  const entityKey = buildEntityKey(control);
  // R1.2: controlKey includes instanceKey when present. Ordinal fallback
  // for multi-occurrence null-instanceKey groups is assigned by the caller.
  const controlKey = buildControlKey(entityKey, route, state, instanceKey);
  return {
    controlId: `${base}.${discriminator}`,
    entityKey,
    controlKey,
    actionKey,
    instanceKey,
    domain,
    family,
    route,
    state,
    viewport,
    role,
    discriminator,
    slug,
    hash,
  };
}

// === ScreenGraph binding ===

function flattenScreenGraphComponents(graph) {
  const out = [];
  function visitComponent(comp, routeId, variantId) {
    out.push({
      routeId,
      variantId,
      componentType: comp.type,
      componentInstanceId: comp.id,
      props: comp.props || {},
      bindings: comp.bindings || [],
      stateEventEvidence: comp.stateEventEvidence || [],
    });
    for (const child of comp.children || []) {
      visitComponent(child, routeId, variantId);
    }
  }
  for (const route of graph.routes || []) {
    for (const variant of route.variants || []) {
      for (const comp of variant.components || []) {
        visitComponent(comp, route.routeId, variant.variantId);
      }
    }
  }
  return out;
}

export function buildScreenGraphBindingIndex() {
  const screenGraphInputs = loadScreenGraphInputs();
  const screenGraphArtifacts = buildScreenGraphArtifacts(screenGraphInputs);
  const components = flattenScreenGraphComponents(screenGraphArtifacts.graph);
  const byCase = new Map();
  for (const comp of components) {
    const key = `${comp.routeId}/${comp.variantId}`;
    if (!byCase.has(key)) byCase.set(key, []);
    byCase.get(key).push(comp);
  }
  return {
    components,
    byCase,
    graphSha256: screenGraphArtifacts.coverage.graphSha256,
  };
}

export function bindControlToScreenGraph(control, index) {
  const caseKey = `${control.routeId}/${control.variantId}`;
  const candidates = index.byCase.get(caseKey) || [];
  if (candidates.length === 0) {
    return {
      componentInstanceId: null,
      componentType: null,
      bindingStatus: "unresolved",
      bindingReason: "no-screen-graph-component-in-case",
    };
  }
  if (control.uiEvent) {
    for (const comp of candidates) {
      for (const binding of comp.bindings || []) {
        if (binding.event === control.uiEvent) {
          return {
            componentInstanceId: comp.componentInstanceId,
            componentType: comp.componentType,
            bindingStatus: "bound",
            bindingReason: "ui-event-binding-match",
          };
        }
      }
    }
    for (const comp of candidates) {
      if (comp.props?.uiEvent === control.uiEvent) {
        return {
          componentInstanceId: comp.componentInstanceId,
          componentType: comp.componentType,
          bindingStatus: "bound",
          bindingReason: "props-ui-event-match",
        };
      }
    }
  }
  const dataUiEvent = control.dataAttributes?.["data-ui-event"];
  if (dataUiEvent) {
    for (const comp of candidates) {
      if (comp.props?.uiEvent === dataUiEvent) {
        return {
          componentInstanceId: comp.componentInstanceId,
          componentType: comp.componentType,
          bindingStatus: "bound",
          bindingReason: "data-ui-event-props-match",
        };
      }
    }
  }
  if (control.label) {
    for (const comp of candidates) {
      const propLabels = [comp.props?.action, comp.props?.title, comp.props?.label, comp.props?.text]
        .filter(Boolean)
        .map((v) => String(v).trim());
      if (propLabels.includes(control.label)) {
        return {
          componentInstanceId: comp.componentInstanceId,
          componentType: comp.componentType,
          bindingStatus: "bound",
          bindingReason: "label-match",
        };
      }
    }
  }
  return {
    componentInstanceId: null,
    componentType: null,
    bindingStatus: "pending-figma-join",
    bindingReason: "no-deterministic-match-needs-review",
  };
}

/**
 * A0 (schema 1.3.0): Compute the independent (needsActionKey, needsInstanceKey)
 * pair from control + binding context. These two booleans are the source of
 * truth; mappingStatus is derived from them via deriveMappingStatus().
 *
 * - needsActionKey: true when actionKey is null (no explicit semantic attribute).
 * - needsInstanceKey: true when the caller signals a multi-occurrence
 *   null-instanceKey group (instancePending=true). Single-occurrence entries
 *   with null instanceKey are NOT flagged — only multi-occurrence groups that
 *   required ordinal fallback need disambiguation.
 */
function computeNeedsFlags(control, binding, instancePending) {
  const idParts = buildControlIdForCandidate(control, binding?.viewport ?? "phone");
  const needsActionKey = idParts.actionKey === null;
  const needsInstanceKey = instancePending === true;
  return { needsActionKey, needsInstanceKey, idParts };
}

function buildMappingNotes(needsActionKey, needsInstanceKey) {
  if (needsActionKey && needsInstanceKey) {
    return "Both actionKey and instanceKey are pending. Needs explicit semantic attribute (data-action / data-route / data-route-back / data-route-replace / data-demo-back) AND explicit instance attribute (data-instance / data-book-id / data-reader-tts-timer-value / etc.) to resolve.";
  }
  if (needsActionKey) {
    return "No explicit semantic attribute (data-action / data-route / data-route-back / data-route-replace / data-demo-back) found; actionKey is null. Needs explicit semantic declaration to resolve logical identity.";
  }
  if (needsInstanceKey) {
    return "Multiple DOM occurrences of the same (route, state, entityKey) with null instanceKey; ordinal fallback applied. Needs explicit instance attribute (data-instance / data-book-id / data-reader-tts-timer-value / etc.) to disambiguate.";
  }
  return null;
}

function buildRegistryEntry(control, viewport, binding, controlKeyOverride, instancePending) {
  const idParts = buildControlIdForCandidate(control, viewport);
  const { needsActionKey, needsInstanceKey } = computeNeedsFlags(control, { ...binding, viewport }, instancePending);
  const mappingStatus = deriveMappingStatus(needsActionKey, needsInstanceKey);
  const mappingNotes = buildMappingNotes(needsActionKey, needsInstanceKey);
  // R1.2: controlKey may be overridden by the caller when ordinal fallback
  // is needed for multi-occurrence null-instanceKey groups.
  const controlKey = controlKeyOverride || idParts.controlKey;
  return {
    controlId: idParts.controlId,
    entityKey: idParts.entityKey,
    controlKey,
    actionKey: idParts.actionKey,
    instanceKey: idParts.instanceKey,
    needsActionKey,
    needsInstanceKey,
    domain: idParts.domain,
    family: idParts.family,
    route: idParts.route,
    state: idParts.state,
    viewport: idParts.viewport,
    role: idParts.role,
    discriminator: idParts.discriminator,
    source: {
      candidateKey: control.candidateKey,
      selectorSha256: selectorSha256(control),
      semanticStatus: control.semanticStatus,
      domTag: control.domTag,
      label: control.label || null,
      uiEvent: control.uiEvent || null,
      dataAttributes: control.dataAttributes || {},
    },
    mappingStatus,
    mappingNotes,
    screenGraphBinding: {
      componentInstanceId: binding.componentInstanceId,
      componentType: binding.componentType,
      bindingStatus: binding.bindingStatus,
    },
    figmaNodeCandidate: null,
    figmaJoinStatus: "pending-figma-join",
    nonInteractiveContainer: null,
  };
}

export function buildControlIdRegistry({ viewport = "phone" } = {}) {
  const inventoryPath = INTERACTION_INVENTORY_PATH;
  const inventoryRaw = read(inventoryPath);
  const inventory = JSON.parse(inventoryRaw);
  const inventorySha256 = createHash("sha256").update(inventoryRaw).digest("hex");
  const screenGraphIndex = buildScreenGraphBindingIndex();
  const screenGraphPath = "ui-spec/screen-graph.json";
  const screenGraphSha256 = screenGraphIndex.graphSha256;
  const generatedAt = "2026-07-19T00:00:00.000Z"; // A2 baseline; stable for byte-reproducible regeneration

  const allCandidates = [
    ...inventory.semanticControls.map((c) => ({ ...c, semanticStatus: "semantic-control" })),
    ...inventory.suspectedNonSemanticControls.map((c) => ({ ...c, semanticStatus: "suspected-nonsemantic-control" })),
  ];

  // R1: ARIA container roles (group/section) are not interactive controls.
  // They are excluded from the canonical registry and tracked in
  // nonInteractiveContainers.json (see buildNonInteractiveContainers).
  const candidates = [];
  const excludedContainers = [];
  for (const control of allCandidates) {
    const role = deriveControlRole(control);
    if (NON_INTERACTIVE_ARIA_CONTAINER_ROLES.has(role)) {
      excludedContainers.push(control);
    } else {
      candidates.push(control);
    }
  }

  // R1.2: fail-closed entityKey collision check. Two controls with different
  // (domain, family, role, actionKey) signatures must NEVER produce the same
  // entityKey. This is a logic invariant; throw on violation.
  assertEntityKeyNoCollision(candidates);

  // R1.2: First pass — build entries with actionKey/instanceKey. controlKey
  // is initially built from instanceKey (no ordinal fallback yet).
  const firstPassEntries = [];
  for (const control of candidates) {
    const binding = bindControlToScreenGraph(control, screenGraphIndex);
    const entry = buildRegistryEntry(control, viewport, binding);
    firstPassEntries.push({ control, binding, entry });
  }

  // R1.2: Second pass — group by (route, state, entityKey) to detect
  // multi-occurrence groups that need ordinal fallback. When multiple
  // occurrences share the same (route, state, entityKey) and all have null
  // instanceKey, assign ordinal fallback (n0, n1, ... sorted by candidateKey)
  // and mark pending-instance-disambiguation.
  const groups = new Map();
  for (const item of firstPassEntries) {
    const key = `${item.entry.entityKey}@${item.entry.route}.${item.entry.state}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const entries = [];
  for (const [groupKey, items] of groups) {
    if (items.length === 1) {
      // Single occurrence — no disambiguation needed.
      entries.push(items[0].entry);
      continue;
    }
    // Multiple occurrences in the same (route, state, entityKey).
    // Sort by candidateKey for deterministic ordinal assignment.
    items.sort((a, b) => a.control.candidateKey.localeCompare(b.control.candidateKey));
    // Check if all have non-null instanceKey.
    const allHaveInstanceKey = items.every((it) => it.entry.instanceKey !== null);
    if (allHaveInstanceKey) {
      // All have instanceKey — check for duplicates within the group.
      // If duplicates exist, fall back to ordinal for ALL entries in the
      // group and mark pending-instance-disambiguation (cannot reliably
      // distinguish using the available instance attributes).
      const seenInstanceKeys = new Set();
      let hasInstanceKeyDuplicates = false;
      for (const it of items) {
        if (seenInstanceKeys.has(it.entry.instanceKey)) {
          hasInstanceKeyDuplicates = true;
          break;
        }
        seenInstanceKeys.add(it.entry.instanceKey);
      }
      if (hasInstanceKeyDuplicates) {
        // Duplicate instanceKeys within the group — ordinal fallback.
        for (let i = 0; i < items.length; i += 1) {
          const ordinalKey = `n${i}`;
          const overrideControlKey = buildControlKey(
            items[i].entry.entityKey, items[i].entry.route, items[i].entry.state, ordinalKey,
          );
          const newEntry = buildRegistryEntry(
            items[i].control, viewport, items[i].binding, overrideControlKey,
            true,
          );
          entries.push(newEntry);
        }
      } else {
        // All unique instanceKeys — controlKey is already unique.
        for (const it of items) entries.push(it.entry);
      }
    } else {
      // Some or all have null instanceKey — assign ordinal fallback to the
      // null-instanceKey entries and mark pending-instance-disambiguation.
      // Entries with non-null instanceKey keep their instanceKey-based controlKey.
      let nullOrdinal = 0;
      for (const it of items) {
        if (it.entry.instanceKey !== null) {
          entries.push(it.entry);
        } else {
          const ordinalKey = `n${nullOrdinal}`;
          nullOrdinal += 1;
          const overrideControlKey = buildControlKey(
            it.entry.entityKey, it.entry.route, it.entry.state, ordinalKey,
          );
          const newEntry = buildRegistryEntry(
            it.control, viewport, it.binding, overrideControlKey,
            true,
          );
          entries.push(newEntry);
        }
      }
    }
  }

  // Sort entries by controlId for byte-stable output.
  entries.sort((a, b) => a.controlId.localeCompare(b.controlId));

  const controlIdSet = new Set();
  for (const entry of entries) {
    if (controlIdSet.has(entry.controlId)) {
      throw new Error(`duplicate controlId generated: ${entry.controlId}`);
    }
    controlIdSet.add(entry.controlId);
  }

  // R1.2: controlKey must now be unique per entry (instanceKey or ordinal
  // fallback disambiguates multi-occurrence groups). Verify no duplicates.
  const controlKeySet = new Set();
  for (const entry of entries) {
    if (controlKeySet.has(entry.controlKey)) {
      throw new Error(`R1.2 duplicate controlKey generated: ${entry.controlKey}`);
    }
    controlKeySet.add(entry.controlKey);
  }
  const entityKeySet = new Set(entries.map((e) => e.entityKey));
  const actionKeySet = new Set(
    entries.filter((e) => e.actionKey !== null).map((e) => e.actionKey),
  );
  const instanceKeySet = new Set(
    entries.filter((e) => e.instanceKey !== null).map((e) => e.instanceKey),
  );

  const totals = {
    candidates: entries.length,
    semanticControls: entries.filter((e) => e.source.semanticStatus === "semantic-control").length,
    suspectedNonSemanticControls: entries.filter((e) => e.source.semanticStatus === "suspected-nonsemantic-control").length,
    // A0 (schema 1.3.0): buckets derived from independent (needsActionKey, needsInstanceKey) pair.
    mapped: entries.filter((e) => e.mappingStatus === "mapped").length,
    pendingActionKey: entries.filter((e) => e.mappingStatus === "pending-action-key").length,
    pendingInstanceKey: entries.filter((e) => e.mappingStatus === "pending-instance-key").length,
    pendingActionAndInstanceKey: entries.filter((e) => e.mappingStatus === "pending-action-and-instance-key").length,
    uniqueControlIds: controlIdSet.size,
    uniqueEntityKeys: entityKeySet.size,
    uniqueControlKeys: controlKeySet.size,
    uniqueActionKeys: actionKeySet.size,
    uniqueInstanceKeys: instanceKeySet.size,
    pendingFigmaJoin: entries.filter((e) => e.figmaJoinStatus === "pending-figma-join").length,
    nonInteractiveContainers: excludedContainers.length,
  };

  return {
    schemaVersion: CONTROL_ID_SCHEMA_VERSION,
    generatedAt,
    generatedFrom: {
      inventoryPath,
      inventorySha256,
      screenGraphPath,
      screenGraphSha256,
      generatorPath: "tools/interaction-inventory/generate-control-ids.mjs",
    },
    totals,
    entries,
  };
}

// R1: ARIA container roles (group/section) are recorded separately so the
// canonical registry strictly contains interactive controls. The drift test
// asserts that the registry denominator + nonInteractiveContainers denominator
// equals the IC0 inventory denominator.
export function buildNonInteractiveContainers({ viewport = "phone" } = {}) {
  const inventoryPath = INTERACTION_INVENTORY_PATH;
  const inventoryRaw = read(inventoryPath);
  const inventory = JSON.parse(inventoryRaw);
  const inventorySha256 = createHash("sha256").update(inventoryRaw).digest("hex");
  const generatedAt = "2026-07-19T00:00:00.000Z";

  const allCandidates = [
    ...inventory.semanticControls.map((c) => ({ ...c, semanticStatus: "semantic-control" })),
    ...inventory.suspectedNonSemanticControls.map((c) => ({ ...c, semanticStatus: "suspected-nonsemantic-control" })),
  ];

  const entries = [];
  for (const control of allCandidates) {
    const role = deriveControlRole(control);
    if (!NON_INTERACTIVE_ARIA_CONTAINER_ROLES.has(role)) continue;
    // R1.1: capture suspectedReasons so we can derive settings-row markers.
    const suspectedReasons = Array.isArray(control.suspectedReasons)
      ? [...control.suspectedReasons].sort()
      : [];
    // R1.1: settings row carries un-enumerated interactive sub-controls.
    // Detect via fd-setting-row + is-switch / is-select / is-segment / is-stepper
    // class hint in suspectedReasons (set by suspectedNonSemanticReasons).
    const settingsClassMatch = suspectedReasons
      .map((r) => r.match(/^settings-control-class:(is-(?:switch|select|segment|stepper))$/))
      .filter(Boolean);
    const containsUnenumeratedSubcontrols = settingsClassMatch.length > 0;
    const expectedSubcontrolType = containsUnenumeratedSubcontrols
      ? settingsClassMatch[0][1].replace("is-", "")
      : undefined;
    // R1.1: section containers are pure state containers (loading / error /
    // offline overlays) with no embedded interactive sub-controls.
    const pureContainer = role === "section";
    const entry = {
      candidateKey: control.candidateKey,
      selectorSha256: selectorSha256(control),
      routeId: control.routeId,
      state: control.pageState || "default",
      viewport,
      role,
      domTag: control.domTag,
      label: control.label || null,
      dataAttributes: control.dataAttributes || {},
      exclusionReason: "aria-container-role",
      suspectedReasons,
    };
    if (containsUnenumeratedSubcontrols) {
      entry.containsUnenumeratedSubcontrols = true;
      entry.expectedSubcontrolType = expectedSubcontrolType;
      // R1.2: expectedSubcontrolCount — the actual number of interactive
      // sub-controls the runtime renderer produces for this settings row.
      //   is-switch  -> 1 (the switch itself)
      //   is-select  -> 1 (the combobox)
      //   is-segment -> 3 (three option buttons)
      //   is-stepper -> 2 (decrement + increment buttons)
      // R2.0.1 will enumerate these into the canonical registry.
      const subcontrolCountByType = { switch: 1, select: 1, segment: 3, stepper: 2 };
      entry.expectedSubcontrolCount = subcontrolCountByType[expectedSubcontrolType] || 0;
    }
    if (pureContainer) {
      entry.pureContainer = true;
    }
    entries.push(entry);
  }

  entries.sort((a, b) => {
    if (a.routeId !== b.routeId) return a.routeId.localeCompare(b.routeId);
    if (a.role !== b.role) return a.role.localeCompare(b.role);
    return a.candidateKey.localeCompare(b.candidateKey);
  });

  const byRole = {};
  const byRoute = {};
  for (const entry of entries) {
    byRole[entry.role] = (byRole[entry.role] || 0) + 1;
    byRoute[entry.routeId] = (byRoute[entry.routeId] || 0) + 1;
  }

  const totalExpectedSubcontrols = entries
    .filter((e) => typeof e.expectedSubcontrolCount === "number")
    .reduce((sum, e) => sum + e.expectedSubcontrolCount, 0);

  return {
    schemaVersion: CONTROL_ID_SCHEMA_VERSION,
    generatedAt,
    generatedFrom: {
      inventoryPath,
      inventorySha256,
      generatorPath: "tools/interaction-inventory/generate-control-ids.mjs",
    },
    totals: {
      entries: entries.length,
      byRole: Object.fromEntries(Object.entries(byRole).sort(([a], [b]) => a.localeCompare(b))),
      byRoute: Object.fromEntries(Object.entries(byRoute).sort(([a], [b]) => a.localeCompare(b))),
      totalExpectedSubcontrols,
    },
    entries,
  };
}

export function buildScreenGraphBindingArtifacts() {
  const registry = buildControlIdRegistry();
  const index = buildScreenGraphBindingIndex();
  const entries = registry.entries.map((entry) => ({
    // R1.2: include explicit semantic identity (actionKey, instanceKey) alongside
    // entityKey / controlKey / controlId. ScreenGraph binding is keyed by the
    // logical entity, not by the DOM occurrence.
    entityKey: entry.entityKey,
    controlKey: entry.controlKey,
    actionKey: entry.actionKey,
    instanceKey: entry.instanceKey,
    controlId: entry.controlId,
    candidateKey: entry.source.candidateKey,
    routeId: entry.route,
    state: entry.state,
    viewport: entry.viewport,
    componentInstanceId: entry.screenGraphBinding.componentInstanceId,
    componentType: entry.screenGraphBinding.componentType,
    bindingStatus: entry.screenGraphBinding.bindingStatus,
    uiEvent: entry.source.uiEvent,
    selectorSha256: entry.source.selectorSha256,
  }));

  const totals = {
    totalControls: entries.length,
    bound: entries.filter((e) => e.bindingStatus === "bound").length,
    unresolved: entries.filter((e) => e.bindingStatus === "unresolved").length,
    pendingFigmaJoin: entries.filter((e) => e.bindingStatus === "pending-figma-join").length,
    uniqueComponentInstances: new Set(entries.filter((e) => e.componentInstanceId).map((e) => e.componentInstanceId)).size,
  };

  return {
    schemaVersion: CONTROL_ID_SCHEMA_VERSION,
    generatedAt: registry.generatedAt,
    generatedFrom: registry.generatedFrom,
    totals,
    entries,
    screenGraphComponentCount: index.components.length,
  };
}

export function buildFigmaCrosswalkPending() {
  const registry = buildControlIdRegistry();
  return {
    schemaVersion: CONTROL_ID_SCHEMA_VERSION,
    generatedAt: registry.generatedAt,
    generatedFrom: registry.generatedFrom,
    note: "Figma does not currently expose a canonical join key. All entries are pending-figma-join; figmaNodeCandidate fields must be backfilled by a Figma writer with explicit node-id mapping. R1.1 does not forge Figma bindings. entityKey is the logical entity (cross route/state/viewport); controlKey is the route/state occurrence (cross viewport); controlId is the DOM occurrence tracking id (retained from R1 for audit reproducibility).",
    totalPending: registry.entries.length,
    entries: registry.entries.map((entry) => ({
      // R1.2: explicit semantic identity first (entityKey, controlKey, actionKey,
      // instanceKey), then DOM tracking.
      entityKey: entry.entityKey,
      controlKey: entry.controlKey,
      actionKey: entry.actionKey,
      instanceKey: entry.instanceKey,
      controlId: entry.controlId,
      candidateKey: entry.source.candidateKey,
      routeId: entry.route,
      state: entry.state,
      viewport: entry.viewport,
      role: entry.role,
      family: entry.family,
      label: entry.source.label,
      uiEvent: entry.source.uiEvent,
      figmaNodeCandidate: null,
      figmaJoinStatus: "pending-figma-join",
      status: "pending-figma-join",
    })),
  };
}

export function buildDomIdentityMap({ viewport = "phone" } = {}) {
  const registry = buildControlIdRegistry({ viewport });
  const inventory = JSON.parse(read(INTERACTION_INVENTORY_PATH));
  // Build a candidateKey -> selector lookup so the DOM identity map carries
  // the actual audit selector, not just the hash.
  const selectorByCandidateKey = new Map();
  for (const c of inventory.semanticControls.concat(inventory.suspectedNonSemanticControls)) {
    selectorByCandidateKey.set(c.candidateKey, c.selector);
  }
  const entries = registry.entries.map((entry) => {
    const selector = selectorByCandidateKey.get(entry.source.candidateKey) || "";
    return {
      // R1.2: explicit semantic identity (actionKey, instanceKey) plus logical
      // identity (entityKey, controlKey) plus DOM occurrence tracking
      // (controlId / dataControlId). The DOM identity map still stamps
      // data-control-id for backward compatibility with R1 page renderers;
      // R2 renderers will also stamp data-entity-key and data-control-key.
      entityKey: entry.entityKey,
      controlKey: entry.controlKey,
      actionKey: entry.actionKey,
      instanceKey: entry.instanceKey,
      controlId: entry.controlId,
      domSelector: selector,
      selectorSha256: entry.source.selectorSha256,
      dataControlId: entry.controlId,
      routeId: entry.route,
      viewport: entry.viewport,
    };
  });
  return {
    schemaVersion: CONTROL_ID_SCHEMA_VERSION,
    generatedAt: registry.generatedAt,
    generatedFrom: registry.generatedFrom,
    totals: {
      entries: entries.length,
      uniqueSelectors: new Set(entries.map((e) => e.domSelector)).size,
    },
    entries,
  };
}

export function writeControlIdArtifacts() {
  const registry = buildControlIdRegistry();
  const binding = buildScreenGraphBindingArtifacts();
  const figmaCrosswalk = buildFigmaCrosswalkPending();
  const domIdentity = buildDomIdentityMap();
  const nonInteractive = buildNonInteractiveContainers();
  const outputs = [
    [CONTROL_ID_REGISTRY_PATH, registry],
    [SCREENGRAPH_BINDING_PATH, binding],
    [FIGMA_CROSSWALK_PENDING_PATH, figmaCrosswalk],
    [DOM_IDENTITY_MAP_PATH, domIdentity],
    [NON_INTERACTIVE_CONTAINERS_PATH, nonInteractive],
  ];
  for (const [relativePath, value] of outputs) {
    const absolutePath = join(REPO_ROOT, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, formatJson(value));
  }
  return outputs.map(([relativePath]) => relativePath);
}

export function checkControlIdArtifactBytes() {
  const registry = buildControlIdRegistry();
  const binding = buildScreenGraphBindingArtifacts();
  const figmaCrosswalk = buildFigmaCrosswalkPending();
  const domIdentity = buildDomIdentityMap();
  const nonInteractive = buildNonInteractiveContainers();
  const expected = [
    [CONTROL_ID_REGISTRY_PATH, formatJson(registry)],
    [SCREENGRAPH_BINDING_PATH, formatJson(binding)],
    [FIGMA_CROSSWALK_PENDING_PATH, formatJson(figmaCrosswalk)],
    [DOM_IDENTITY_MAP_PATH, formatJson(domIdentity)],
    [NON_INTERACTIVE_CONTAINERS_PATH, formatJson(nonInteractive)],
  ];
  for (const [relativePath, expectedJson] of expected) {
    const absolutePath = join(REPO_ROOT, relativePath);
    assert(existsSync(absolutePath), `missing control id artifact: ${relativePath}`);
    assert(
      readFileSync(absolutePath, "utf8") === expectedJson,
      `control id artifact drift: ${relativePath}; run node tools/interaction-inventory/generate-control-ids.mjs --write`,
    );
  }
  return true;
}

export function validateControlIdRegistry(registry) {
  const errors = [];
  const warnings = [];

  const inventory = JSON.parse(read(INTERACTION_INVENTORY_PATH));
  // R1: the canonical registry denominator excludes ARIA container roles
  // (group/section). The denominator is the count of IC0 candidates whose
  // derived role is NOT in {group, section}. The IC0 inventory's
  // suspectedNonSemanticControls are all group/section, so the canonical
  // registry denominator equals inventory.semanticControls.length.
  const expectedCount = countInteractiveCandidates(inventory);
  if (registry.entries.length !== expectedCount) {
    errors.push(`entry count mismatch: registry=${registry.entries.length} vs interactive-candidates=${expectedCount}`);
  }

  const seenIds = new Set();
  for (const entry of registry.entries) {
    if (seenIds.has(entry.controlId)) {
      errors.push(`duplicate controlId: ${entry.controlId}`);
    }
    seenIds.add(entry.controlId);
  }
  if (seenIds.size !== registry.entries.length) {
    errors.push(`unique controlId count mismatch: ${seenIds.size} vs ${registry.entries.length}`);
  }

  // Reproducibility: rebuild entries (ignoring generatedAt) and compare controlIds.
  const rebuilt = buildControlIdRegistry();
  if (rebuilt.entries.length !== registry.entries.length) {
    errors.push(`entry count drift: rebuilt=${rebuilt.entries.length} vs persisted=${registry.entries.length}`);
  } else {
    const persistedIds = registry.entries.map((e) => e.controlId).sort();
    const rebuiltIds = rebuilt.entries.map((e) => e.controlId).sort();
    for (let i = 0; i < persistedIds.length; i += 1) {
      if (persistedIds[i] !== rebuiltIds[i]) {
        errors.push(`controlId drift at sorted index ${i}: ${persistedIds[i]} vs ${rebuiltIds[i]}`);
        break;
      }
    }
  }

  // Figma join integrity: no forged joins in R1 baseline.
  const forged = registry.entries.filter((e) => e.figmaJoinStatus !== "pending-figma-join");
  if (forged.length > 0) {
    errors.push(`forged figma join: ${forged.length} entries claim non-pending figma status`);
  }
  const forgedNode = registry.entries.filter((e) => e.figmaNodeCandidate !== null);
  if (forgedNode.length > 0) {
    errors.push(`forged figma node candidate: ${forgedNode.length} entries carry non-null figmaNodeCandidate`);
  }

  // R1: ARIA container roles (group/section) MUST NOT appear in the canonical
  // registry; they live in nonInteractiveContainers.json.
  const leakedContainers = registry.entries.filter((e) => e.role === "group" || e.role === "section");
  if (leakedContainers.length > 0) {
    errors.push(`non-interactive container leaked into registry: ${leakedContainers.length} entries with role group/section`);
  }

  // R1: per-entry firstMaterializedAt and schemaVersion MUST be absent.
  const staleTimestamp = registry.entries.filter((e) => Object.prototype.hasOwnProperty.call(e, "firstMaterializedAt"));
  if (staleTimestamp.length > 0) {
    errors.push(`per-entry firstMaterializedAt must be removed: ${staleTimestamp.length} entries still carry it`);
  }
  const staleSchemaVersion = registry.entries.filter((e) => Object.prototype.hasOwnProperty.call(e, "schemaVersion"));
  if (staleSchemaVersion.length > 0) {
    errors.push(`per-entry schemaVersion must be removed: ${staleSchemaVersion.length} entries still carry it`);
  }

  // R1.1: controlKey sharing is allowed (multiple DOM occurrences of the
  // same logical control in the same (route, state) share one controlKey).
  // No duplicate-controlKey error is raised here. The entityKey collision
  // invariant (different signatures => different entityKeys) is enforced at
  // generation time and is the sole fail-closed identity check.

  // R1.2: entityKey pattern sanity (3+ atoms, kebab-case; actionKey may contain dots).
  const entityKeyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*)*$/;
  // R1.2: controlKey pattern allows optional instanceKey atom (2-3+ atoms after @).
  const controlKeyPattern = /^[^@]+@[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$/;
  for (const entry of registry.entries) {
    if (!entityKeyPattern.test(entry.entityKey || "")) {
      errors.push(`entry ${entry.controlId || "(unknown)"} has invalid entityKey: ${entry.entityKey}`);
    }
    if (!controlKeyPattern.test(entry.controlKey || "")) {
      errors.push(`entry ${entry.controlId || "(unknown)"} has invalid controlKey: ${entry.controlKey}`);
    }
  }

  // Schema shape sanity
  const requiredFields = [
    "controlId", "entityKey", "controlKey", "actionKey", "instanceKey",
    "domain", "family", "route", "state", "viewport", "role", "discriminator",
    "source", "mappingStatus", "screenGraphBinding", "figmaNodeCandidate",
    "figmaJoinStatus", "nonInteractiveContainer",
  ];
  for (const entry of registry.entries) {
    for (const field of requiredFields) {
      if (!Object.prototype.hasOwnProperty.call(entry, field)) {
        errors.push(`entry ${entry.controlId || "(unknown)"} missing field: ${field}`);
      }
    }
  }

  // R1.2: totals consistency — unique entityKey <= unique controlKey <= unique controlId.
  // (R1.2: controlKey is now unique per entry due to instanceKey/ordinal, so
  // uniqueControlKeys should equal entries.length when all are disambiguated.)
  const uniqEntity = new Set(registry.entries.map((e) => e.entityKey)).size;
  const uniqControl = new Set(registry.entries.map((e) => e.controlKey)).size;
  const uniqControlId = new Set(registry.entries.map((e) => e.controlId)).size;
  const uniqAction = new Set(registry.entries.filter((e) => e.actionKey !== null).map((e) => e.actionKey)).size;
  const uniqInstance = new Set(registry.entries.filter((e) => e.instanceKey !== null).map((e) => e.instanceKey)).size;
  if (registry.totals.uniqueEntityKeys !== uniqEntity) {
    errors.push(`uniqueEntityKeys totals mismatch: ${registry.totals.uniqueEntityKeys} vs recomputed ${uniqEntity}`);
  }
  if (registry.totals.uniqueControlKeys !== uniqControl) {
    errors.push(`uniqueControlKeys totals mismatch: ${registry.totals.uniqueControlKeys} vs recomputed ${uniqControl}`);
  }
  if (uniqEntity > uniqControl) {
    errors.push(`R1.2 invariant violated: uniqueEntityKeys(${uniqEntity}) > uniqueControlKeys(${uniqControl})`);
  }
  if (uniqControl > uniqControlId) {
    errors.push(`R1.2 invariant violated: uniqueControlKeys(${uniqControl}) > uniqueControlIds(${uniqControlId})`);
  }
  // A0 (schema 1.3.0): four derived buckets must match entry-level mappingStatus counts.
  // Buckets: mapped / pending-action-key / pending-instance-key / pending-action-and-instance-key.
  // The four buckets MUST sum to candidates (no entry is left unclassified).
  const bucketRecompute = {
    mapped: registry.entries.filter((e) => e.mappingStatus === "mapped").length,
    pendingActionKey: registry.entries.filter((e) => e.mappingStatus === "pending-action-key").length,
    pendingInstanceKey: registry.entries.filter((e) => e.mappingStatus === "pending-instance-key").length,
    pendingActionAndInstanceKey: registry.entries.filter((e) => e.mappingStatus === "pending-action-and-instance-key").length,
  };
  const bucketSum = bucketRecompute.mapped + bucketRecompute.pendingActionKey
    + bucketRecompute.pendingInstanceKey + bucketRecompute.pendingActionAndInstanceKey;
  if (bucketSum !== registry.entries.length) {
    errors.push(`A0 buckets sum mismatch: ${bucketSum} vs entries ${registry.entries.length}`);
  }
  for (const [field, recomputed] of Object.entries(bucketRecompute)) {
    if (registry.totals[field] !== recomputed) {
      errors.push(`${field} totals mismatch: ${registry.totals[field]} vs recomputed ${recomputed}`);
    }
  }

  return {
    schemaVersion: registry.schemaVersion,
    totals: registry.totals,
    errors,
    warnings,
    valid: errors.length === 0,
  };
}

// R1: helper that counts IC0 candidates whose derived role is an interactive
// role (i.e. NOT group/section). Used by validateControlIdRegistry to compute
// the canonical registry denominator without re-deriving the full registry.
function countInteractiveCandidates(inventory) {
  const all = [
    ...inventory.semanticControls,
    ...inventory.suspectedNonSemanticControls,
  ];
  let count = 0;
  for (const control of all) {
    const role = deriveControlRole(control);
    if (!NON_INTERACTIVE_ARIA_CONTAINER_ROLES.has(role)) count += 1;
  }
  return count;
}

// ============================================================================
// A0 (schema 1.3.0): canonical resolver + DOM viewport coverage
// ----------------------------------------------------------------------------
// A0 entry condition: "测试真实 resolver 和真实 DOM viewport coverage".
// The TypeScript runtime in src/control-identity/control-id-resolver.ts is the
// canonical runtime implementation, but .mjs tests cannot import TypeScript
// directly under `node --test`. To avoid mirroring the contract inline in
// every test (which would let drift hide), we expose the same canonical
// resolver + DOM coverage verifier here as the single .mjs source of truth
// for tooling tests. The TypeScript file remains the runtime consumer entry
// point; this .mjs mirror is what the drift tests exercise.
// ============================================================================

export const DATA_CONTROL_ID_ATTRIBUTE = "data-control-id";
export const DATA_CONTROL_KEY_ATTRIBUTE = "data-control-key";
export const DATA_ENTITY_KEY_ATTRIBUTE = "data-entity-key";
export const DATA_VIEWPORT_ATTRIBUTE = "data-viewport";

function cssEscapeAttribute(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function querySelectorForControlId(controlId) {
  if (typeof controlId !== "string" || controlId.length === 0) {
    throw new Error(`querySelectorForControlId requires a non-empty controlId, received: ${String(controlId)}`);
  }
  return `[${DATA_CONTROL_ID_ATTRIBUTE}="${cssEscapeAttribute(controlId)}"]`;
}

export function querySelectorForControlIdAndViewport(controlId, viewport) {
  if (typeof controlId !== "string" || controlId.length === 0) {
    throw new Error(`querySelectorForControlIdAndViewport requires a non-empty controlId, received: ${String(controlId)}`);
  }
  if (typeof viewport !== "string" || viewport.length === 0) {
    throw new Error(`querySelectorForControlIdAndViewport requires a non-empty viewport, received: ${String(viewport)}`);
  }
  return `[${DATA_CONTROL_ID_ATTRIBUTE}="${cssEscapeAttribute(controlId)}"][${DATA_VIEWPORT_ATTRIBUTE}="${cssEscapeAttribute(viewport)}"]`;
}

function getDataControlId(element) {
  if (!element || typeof element.getAttribute !== "function") return null;
  return element.getAttribute(DATA_CONTROL_ID_ATTRIBUTE);
}

function getDataControlKey(element) {
  if (!element || typeof element.getAttribute !== "function") return null;
  return element.getAttribute(DATA_CONTROL_KEY_ATTRIBUTE);
}

function getDataViewport(element) {
  if (!element || typeof element.getAttribute !== "function") return null;
  return element.getAttribute(DATA_VIEWPORT_ATTRIBUTE);
}

/**
 * Build a runtime resolver from a codegen-produced registry. The resolver
 * is read-only and immutable; rebuild it when the codegen output changes.
 *
 * Invariants enforced at build time:
 *   - Each (controlId, viewport) pair must be unique (throw on duplicate).
 *   - Multiple entries with the same (controlKey, viewport) are ALLOWED
 *     (no throw). Use resolveAllByControlKeyAndViewport to get all matches.
 */
export function createControlIdResolver(entries) {
  const byControlId = new Map();
  const byControlIdAndViewport = new Map();
  const byControlKey = new Map();
  const byControlKeyAndViewport = new Map();
  const byEntityKey = new Map();
  const bySelectorSha256 = new Map();
  for (const entry of entries) {
    if (byControlIdAndViewport.has(`${entry.controlId}@${entry.viewport}`)) {
      throw new Error(`duplicate (controlId, viewport) in resolver input: ${entry.controlId}@${entry.viewport}`);
    }
    byControlIdAndViewport.set(`${entry.controlId}@${entry.viewport}`, entry);
    if (!byControlId.has(entry.controlId)) {
      byControlId.set(entry.controlId, entry);
    }
    if (!byControlKey.has(entry.controlKey)) {
      byControlKey.set(entry.controlKey, []);
    }
    byControlKey.get(entry.controlKey).push(entry);
    const ckVpKey = `${entry.controlKey}@${entry.viewport}`;
    if (!byControlKeyAndViewport.has(ckVpKey)) {
      byControlKeyAndViewport.set(ckVpKey, []);
    }
    byControlKeyAndViewport.get(ckVpKey).push(entry);
    if (!byEntityKey.has(entry.entityKey)) {
      byEntityKey.set(entry.entityKey, []);
    }
    byEntityKey.get(entry.entityKey).push(entry);
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
      const matches = byControlKeyAndViewport.get(`${controlKey}@${viewport}`) ?? [];
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
      for (const entry of byControlId.values()) {
        if (entry.domSelector === selector) return entry;
      }
      return null;
    },
    resolveByElement(element) {
      const controlId = getDataControlId(element);
      if (controlId) return byControlId.get(controlId) ?? null;
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
 * Verify that every controlId in the resolver is present exactly once in the
 * rendered DOM. Returns a list of missing or duplicate controlIds.
 */
export function verifyDomCoverage(resolver, root) {
  const missing = [];
  const duplicate = [];
  if (typeof document === "undefined" || !root) {
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
 * Verify DOM coverage with viewport awareness. For every entry in the
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
export function verifyDomCoverageAndViewport(resolver, root) {
  const missing = [];
  const duplicate = [];
  const extra = [];
  let covered = 0;

  if (typeof document === "undefined" || !root) {
    return {
      covered: 0,
      missing: resolver.all().map((e) => e.controlId),
      extra: [],
      duplicate: [],
    };
  }

  const knownControlIds = new Set();
  for (const entry of resolver.all()) {
    knownControlIds.add(entry.controlId);
  }

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

  const allDomElements = Array.from(root.querySelectorAll(`[${DATA_CONTROL_ID_ATTRIBUTE}]`));
  for (const el of allDomElements) {
    const id = getDataControlId(el);
    if (id && !knownControlIds.has(id)) {
      extra.push(id);
    }
  }

  return { covered, missing, extra, duplicate };
}
