import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  auditRuntimeShadowPolicy,
  CANONICAL_RUNTIME_CSS_FILES,
  findDeprecatedShadowAliases,
} from "./shadow-policy-lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");

test("canonical runtime has no ambiguous shadow aliases", () => {
  const files = [
    ...CANONICAL_RUNTIME_CSS_FILES,
    "render-runtime.js",
    ...readdirSync(join(demoRoot, "renderers"))
      .filter((name) => name.endsWith(".js"))
      .map((name) => `renderers/${name}`),
  ];
  const hits = files.flatMap((file) =>
    findDeprecatedShadowAliases(readFileSync(join(demoRoot, file), "utf8"))
      .map((hit) => ({ file, ...hit })),
  );
  assert.deepEqual(hits, []);
});

test("every external runtime shadow has an explicit semantic role", () => {
  const audit = auditRuntimeShadowPolicy(demoRoot);
  assert.deepEqual(
    audit.violations,
    [],
    `unclassified external shadows:\n${audit.violations
      .map((row) => `${row.file}:${row.line} ${row.selector} => ${row.value}`)
      .join("\n")}`,
  );
  assert.ok(audit.allowed.length > 0, "semantic allowlist must exercise real runtime declarations");
});

test("persistent page surfaces remain shadowless in canonical CSS", () => {
  const audit = auditRuntimeShadowPolicy(demoRoot);
  const persistentSurfacePattern = /(?:main-nav|bookshelf-empty-state|discover-(?:source-bar|book-list|no-results|empty-state|error-card|control-panel|subpage-head|login-card|rule-fields|rule-test-box|rule-result|source-bulk-list)|rss-(?:summary-card|article-list|source-list|source-settings|reader-card|search-panel|state-card|reader-source|reader-title|reader-body|original-card|web-preview|source-overview|source-hero|action-source-card|debug-panel|import-panel|edit-list|record-list|rule-sub-list|source-overview-list|import-list|action-grid|confirm-card)|filter-panel|management-list|import-card|batch-summary|restore-(?:card|warning|stage-list|conflict-list)|settings-(?:metric-grid|storage-card|record-list|source-list|subpanel|action-list|search-box|backup-card)|flow-(?:frame|step|comparison|result)|source-phone-bar)/i;
  const leaks = audit.allowed.filter((row) =>
    persistentSurfacePattern.test(row.selector)
    && !/(?:focus|is-focused|\bimg\b|cover|data-motion)/i.test(row.selector),
  );
  assert.deepEqual(leaks, []);
});
