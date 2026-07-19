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
  "data-route-back", "data-search-reset", "data-search-submit", "data-settings-option-choice",
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

export const CONTROL_ID_SCHEMA_VERSION = "1.0.0";
export const CONTROL_ID_REGISTRY_PATH = "tools/interaction-inventory/generated/control-id-registry.json";
export const SCREENGRAPH_BINDING_PATH = "tools/interaction-inventory/generated/screengraph-binding.json";
export const FIGMA_CROSSWALK_PENDING_PATH = "tools/interaction-inventory/generated/figma-crosswalk-pending.json";
export const DOM_IDENTITY_MAP_PATH = "tools/interaction-inventory/generated/dom-identity-map.json";
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
  const base = `${domain}.${family}.${route}.${state}.${viewport}.${role}`;
  const slug = deriveSemanticSlug(control);
  const hash = shortHash(controlHashInputs(control));
  const discriminator = slug ? `${slug}-h-${hash}` : `h-${hash}`;
  return {
    controlId: `${base}.${discriminator}`,
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

function classifyMapping(control, binding) {
  if (control.semanticStatus === "suspected-nonsemantic-control") {
    return {
      mappingStatus: "needs-manual-mapping",
      mappingNotes: "Suspected non-semantic control from IC0 audit; needs human review to confirm control identity and ScreenGraph binding.",
    };
  }
  if (!control.uiEvent && binding.bindingStatus !== "bound") {
    return {
      mappingStatus: "ambiguous-needs-review",
      mappingNotes: "No canonical UiEvent and no ScreenGraph binding match; candidate may be navigation chrome, decorative, or duplicate control.",
    };
  }
  return {
    mappingStatus: "auto-mapped",
    mappingNotes: null,
  };
}

function buildRegistryEntry(control, viewport, binding, generatedAt) {
  const idParts = buildControlIdForCandidate(control, viewport);
  const { mappingStatus, mappingNotes } = classifyMapping(control, binding);
  return {
    controlId: idParts.controlId,
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
    firstMaterializedAt: generatedAt,
    schemaVersion: CONTROL_ID_SCHEMA_VERSION,
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

  const candidates = [
    ...inventory.semanticControls.map((c) => ({ ...c, semanticStatus: "semantic-control" })),
    ...inventory.suspectedNonSemanticControls.map((c) => ({ ...c, semanticStatus: "suspected-nonsemantic-control" })),
  ];

  const entries = [];
  for (const control of candidates) {
    const binding = bindControlToScreenGraph(control, screenGraphIndex);
    const entry = buildRegistryEntry(control, viewport, binding, generatedAt);
    entries.push(entry);
  }

  const controlIdSet = new Set();
  for (const entry of entries) {
    if (controlIdSet.has(entry.controlId)) {
      throw new Error(`duplicate controlId generated: ${entry.controlId}`);
    }
    controlIdSet.add(entry.controlId);
  }

  const totals = {
    candidates: entries.length,
    semanticControls: entries.filter((e) => e.source.semanticStatus === "semantic-control").length,
    suspectedNonSemanticControls: entries.filter((e) => e.source.semanticStatus === "suspected-nonsemantic-control").length,
    autoMapped: entries.filter((e) => e.mappingStatus === "auto-mapped").length,
    needsManualMapping: entries.filter((e) => e.mappingStatus === "needs-manual-mapping").length,
    ambiguousNeedsReview: entries.filter((e) => e.mappingStatus === "ambiguous-needs-review").length,
    uniqueControlIds: controlIdSet.size,
    pendingFigmaJoin: entries.filter((e) => e.figmaJoinStatus === "pending-figma-join").length,
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

export function buildScreenGraphBindingArtifacts() {
  const registry = buildControlIdRegistry();
  const index = buildScreenGraphBindingIndex();
  const entries = registry.entries.map((entry) => ({
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
    note: "Figma does not currently expose a canonical join key. All entries are pending-figma-join; figmaNodeCandidate fields must be backfilled by a Figma writer with explicit node-id mapping. A2 does not forge Figma bindings.",
    totalPending: registry.entries.length,
    entries: registry.entries.map((entry) => ({
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
  const outputs = [
    [CONTROL_ID_REGISTRY_PATH, registry],
    [SCREENGRAPH_BINDING_PATH, binding],
    [FIGMA_CROSSWALK_PENDING_PATH, figmaCrosswalk],
    [DOM_IDENTITY_MAP_PATH, domIdentity],
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
  const expected = [
    [CONTROL_ID_REGISTRY_PATH, formatJson(registry)],
    [SCREENGRAPH_BINDING_PATH, formatJson(binding)],
    [FIGMA_CROSSWALK_PENDING_PATH, formatJson(figmaCrosswalk)],
    [DOM_IDENTITY_MAP_PATH, formatJson(domIdentity)],
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
  const expectedCount = inventory.semanticControls.length + inventory.suspectedNonSemanticControls.length;
  if (registry.entries.length !== expectedCount) {
    errors.push(`entry count mismatch: registry=${registry.entries.length} vs inventory=${expectedCount}`);
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

  // Figma join integrity: no forged joins in A2 baseline.
  const forged = registry.entries.filter((e) => e.figmaJoinStatus !== "pending-figma-join");
  if (forged.length > 0) {
    errors.push(`forged figma join: ${forged.length} entries claim non-pending figma status`);
  }
  const forgedNode = registry.entries.filter((e) => e.figmaNodeCandidate !== null);
  if (forgedNode.length > 0) {
    errors.push(`forged figma node candidate: ${forgedNode.length} entries carry non-null figmaNodeCandidate`);
  }

  // Schema shape sanity
  const requiredFields = [
    "controlId", "domain", "family", "route", "state", "viewport", "role",
    "discriminator", "source", "mappingStatus", "screenGraphBinding",
    "figmaNodeCandidate", "figmaJoinStatus",
  ];
  for (const entry of registry.entries) {
    for (const field of requiredFields) {
      if (!Object.prototype.hasOwnProperty.call(entry, field)) {
        errors.push(`entry ${entry.controlId || "(unknown)"} missing field: ${field}`);
      }
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
