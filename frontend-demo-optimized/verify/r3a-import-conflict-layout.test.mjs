import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const stylesEntry = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const workflowCss = readFileSync(new URL("../styles/09-import-workflow.css", import.meta.url), "utf8");

test("R3a import layout: production stylesheet loads the canonical workflow styles", () => {
  assert.match(stylesEntry, /styles\/09-import-workflow\.css/);
});

test("R3a import layout: the seven phases are an explicit horizontal grid", () => {
  assert.match(workflowCss, /\.fd-import-phase-breadcrumb\s*\{[\s\S]*?grid-template-columns:\s*repeat\(7,/);
  assert.match(workflowCss, /list-style:\s*none/);
});

test("R3a import layout: every shared renderer structure has a production rule", () => {
  const requiredSelectors = [
    ".fd-import-state-card",
    ".fd-import-permission-detail",
    ".fd-import-format-detail",
    ".fd-import-empty-detail",
    ".fd-import-parsing-detail",
    ".fd-import-progress",
    ".fd-import-duplicate-list",
    ".fd-import-conflict-list",
    ".fd-import-conflict-values",
    ".fd-import-partial-summary",
    ".fd-import-result-detail-summary",
    ".fd-import-result-list",
    ".fd-import-state-card .fd-action-row"
  ];
  for (const selector of requiredSelectors) {
    assert.ok(workflowCss.includes(selector), `missing production rule for ${selector}`);
  }
});

test("R3a import layout: page cards stay shadowless", () => {
  assert.match(workflowCss, /\.fd-import-state-card\s*\{[\s\S]*?box-shadow:\s*none/);
});

test("R3a import layout: trailing values and actions are right aligned", () => {
  assert.match(workflowCss, /\.fd-import-duplicate-item em,[\s\S]*?text-align:\s*right/);
  assert.match(workflowCss, /\.fd-import-state-card \.fd-action-row\s*\{[\s\S]*?justify-content:\s*flex-end/);
});

test("R3a import layout: only Phone and Tablet receive authored rules", () => {
  assert.match(workflowCss, /data-viewport-class="tablet-expanded"/);
  assert.doesNotMatch(workflowCss, /compact-landscape|fold/);
});
