import assert from "node:assert/strict";
import test from "node:test";
import { createVmRenderer } from "../../tools/interaction-inventory/interaction-inventory-lib.mjs";

// The user retired the former full-page import conflict/error family in
// favour of the Figma-backed in-place local-import dialog.  This is a visual
// admission test, not a replacement UI test: none of these RouteIds may
// recover an old local approximation through a direct renderer call.
const RETIRED_IMPORT_CONFLICT_ROUTES = Object.freeze([
  "import-permission-denied",
  "import-format-unsupported",
  "import-empty-file",
  "import-parsing",
  "import-duplicate",
  "import-conflict-resolve",
  "import-partial-success",
  "import-result-detail"
]);

test("retired import conflict/error routes fail closed instead of rendering a legacy full page", () => {
  const renderer = createVmRenderer();
  for (const route of RETIRED_IMPORT_CONFLICT_ROUTES) {
    assert.throws(
      () => renderer.renderRoute(route),
      /FROZEN \(RETIRED_FIGMA_VISUAL\)/,
      route
    );
  }
});
