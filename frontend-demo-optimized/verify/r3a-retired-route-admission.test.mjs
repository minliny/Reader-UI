import assert from "node:assert/strict";
import test from "node:test";
import { createVmRenderer } from "../../tools/interaction-inventory/interaction-inventory-lib.mjs";

// These screens were explicitly removed or narrowed by the user.  They are
// intentionally tested at the public runtime boundary rather than by calling
// an old renderer directly: a legacy renderer must not become a side door
// that recreates a locally authored page when a route is reached indirectly.
const RETIRED_ABOUT_ROUTES = Object.freeze([
  "about",
  "about-feedback",
  "about-version"
]);

// Restore is now a backup-list action with confirm -> loading -> complete.
// The retained dialog states have their own Figma-backed route bindings;
// everything below belonged to the removed full-page Restore Preview flow.
const RETIRED_RESTORE_PREVIEW_ROUTES = Object.freeze([
  "restore-preview",
  "restore-scopes",
  "restore-progress",
  "restore-conflict",
  "restore-failed",
  "restore-partial"
]);

// Source switching remains a direct-select overlay.  These former
// check/result/rollback variants must not be revived as a state matrix.
const RETIRED_SOURCE_SWITCH_STATE_ROUTES = Object.freeze([
  "source-switch-empty",
  "source-switch-error",
  "source-switch-timeout",
  "source-switch-loading",
  "source-switch-rollback",
  "source-switch-preview",
  "source-switch-results"
]);

const RETIRED_GROUP_MANAGEMENT_ROUTES = Object.freeze([
  "group-management",
  "bookshelf-group-management"
]);

function expectFailClosed(routes, label) {
  const renderer = createVmRenderer();
  for (const route of routes) {
    assert.throws(
      () => renderer.renderRoute(route),
      /FROZEN \((?:RETIRED_FIGMA_VISUAL|UNCLASSIFIED_ROUTE_NO_FIGMA_VISUAL)\)|group management is out of V1 scope/,
      `${label}: ${route} must not produce a legacy local surface`
    );
  }
}

test("user-retired About routes fail closed instead of reusing historical settings markup", () => {
  expectFailClosed(RETIRED_ABOUT_ROUTES, "About");
});

test("removed full-page Restore Preview branches fail closed while the retained dialog flow stays separate", () => {
  expectFailClosed(RETIRED_RESTORE_PREVIEW_ROUTES, "Restore Preview");
});

test("removed Source Switch state matrix routes fail closed instead of introducing confirmation or result screens", () => {
  expectFailClosed(RETIRED_SOURCE_SWITCH_STATE_ROUTES, "Source Switch state matrix");
});

test("cancelled bookshelf group-management routes fail closed without affecting retained multi-select", () => {
  expectFailClosed(RETIRED_GROUP_MANAGEMENT_ROUTES, "Group management");
});
