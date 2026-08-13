import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const CANONICAL_RUNTIME_CSS_FILES = [
  "shared-shell-kit/kit.css",
  "tokens.css",
  "styles/00-foundation.css",
  "styles/01-shell-layout.css",
  "styles/02a-reader-control.css",
  "styles/02b-reader-toc-module.css",
  "styles/02c-reader-auto-search.css",
  "styles/02d-reader-tts-typography.css",
  "styles/03a-reader-appearance.css",
  "styles/03b-reader-settings.css",
  "styles/03c-reader-viewport.css",
  "styles/03d-reader-fullpage.css",
  "styles/03e-reader-replace-page.css",
  "styles/04-settings-source.css",
  "styles/05-flow-adaptive.css",
  "styles/06-responsive.css",
  "styles/07-control-primitives.css",
  "styles/08-developer-motion-settings.css",
  "motion-tokens.css",
];

const ROLE_PATTERNS = {
  overlay: /(?:overlay|dialog|(?:bottom-|mini-|demo-|reader-)?sheet|popover|menu|dropdown|tooltip|toast|keyboard)/i,
  media: /(?:(?:^|[-_.\s"'])cover(?:$|[-_.:\s"'\]])|artwork|thumbnail|\bimg\b|entry-snapshot)/i,
  floatingControl: /(?:reader-(?:control|more|status|selection|progress|tts|full-(?:tts|auto)|auto|restore|grabber|entry)|status-capsule|settings-fab|back-top|source-debug-panel)/i,
  focus: /(?:focus|focused|focus-visible|data-motion-(?:input|control-handle)|0%|55%|100%)/i,
  tooling: /(?:demo-mode-switch|motion-developer-switch)/i,
  motionState: /data-motion-[^\]]*(?:pressed|running|entering|open|selecting|focused|dragging)/i,
  controlState: /(?:(?:button|select|input|switch|slider|handle|pill|dot|dial|wheel|segment|toggle).*(?:active|hover|pressed|primary|current|running|entering|open|selecting|before|after)|(?:active|hover|pressed|primary|current|running|entering|open|selecting).*(?:button|select|input|switch|slider|handle|pill|dot|dial|wheel|segment|toggle)|(?:switch|pill)(?:\b|[-_])|filter-(?:menu|apply)|empty-visual|reader-selection-line)/i,
};

function splitTopLevelCommas(value) {
  const layers = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      layers.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  layers.push(value.slice(start).trim());
  return layers.filter(Boolean);
}

function hasExternalShadow(value) {
  if (!value || value === "none") return false;
  return splitTopLevelCommas(value).some((layer) => !/^inset\b/i.test(layer));
}

function roleFor(selector) {
  return Object.entries(ROLE_PATTERNS)
    .find(([, pattern]) => pattern.test(selector))?.[0] || null;
}

function roleTokenMatches(role, value) {
  if (value.includes("--fd-shadow-overlay")) return role === "overlay";
  if (value.includes("--fd-shadow-media")) return role === "media";
  if (value.includes("--fd-shadow-floating-control")) return role === "floatingControl";
  if (value.includes("--fd-shadow-transient")) return role === "tooling";
  return true;
}

export function extractShadowDeclarations(source, file) {
  const rows = [];
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1].trim().replace(/\s+/g, " ");
    for (const declaration of match[2].matchAll(/(?:^|;)\s*(box-shadow|filter)\s*:\s*([^;]+)/gm)) {
      const property = declaration[1];
      const value = declaration[2].trim().replace(/\s+/g, " ");
      if (property === "filter" && !/drop-shadow\(/i.test(value)) continue;
      if (property === "box-shadow" && !hasExternalShadow(value)) continue;
      const line = source.slice(0, match.index).split("\n").length;
      rows.push({ file, line, selector, property, value });
    }
  }
  return rows;
}

export function auditRuntimeShadowPolicy(demoRoot) {
  const violations = [];
  const allowed = [];
  for (const relativePath of CANONICAL_RUNTIME_CSS_FILES) {
    const source = readFileSync(join(demoRoot, relativePath), "utf8");
    for (const row of extractShadowDeclarations(source, relativePath)) {
      const role = roleFor(row.selector);
      if (!role || !roleTokenMatches(role, row.value)) violations.push(row);
      else allowed.push({ ...row, role });
    }
  }

  const rendererDir = join(demoRoot, "renderers");
  for (const filename of readdirSync(rendererDir).filter((name) => name.endsWith(".js"))) {
    const relativePath = `renderers/${filename}`;
    const source = readFileSync(join(rendererDir, filename), "utf8");
    for (const row of extractShadowDeclarations(source, relativePath)) {
      const role = roleFor(row.selector);
      if (!role || !roleTokenMatches(role, row.value)) violations.push(row);
      else allowed.push({ ...row, role });
    }
  }

  return { violations, allowed };
}

export function findDeprecatedShadowAliases(source) {
  return [
    ...source.matchAll(/--fd-(?:soft-)?shadow\s*:|var\(--fd-(?:soft-)?shadow\)/g),
    ...source.matchAll(/--fd-settings-card-shadow\s*:|var\(--fd-settings-card-shadow\)/g),
  ].map((match) => ({ index: match.index, value: match[0] }));
}
