import test from "node:test";
import assert from "node:assert/strict";
import { createVmRenderer } from "../../tools/interaction-inventory/interaction-inventory-lib.mjs";

const RETIRED_IMPORT_ROUTES = [
  "local-import",
  "import-permission-denied",
  "import-format-unsupported",
  "import-empty-file",
  "import-parsing",
  "import-duplicate",
  "import-conflict-resolve",
  "import-partial-success",
  "import-result-detail",
];

test("retired standalone import pages cannot expose obsolete ARIA surfaces", () => {
  const renderer = createVmRenderer();
  for (const route of RETIRED_IMPORT_ROUTES) {
    assert.throws(
      () => renderer.renderRoute(route),
      /RETIRED_FIGMA_VISUAL/,
      route,
    );
  }
});

test("retired standalone import pages cannot emit progress, retry, conflict or permission controls", () => {
  const renderer = createVmRenderer();
  for (const route of RETIRED_IMPORT_ROUTES) {
    try {
      renderer.renderRoute(route);
      assert.fail(`${route} unexpectedly rendered`);
    } catch (error) {
      assert.doesNotMatch(
        String(error),
        /progressbar|data-control-key|aria-|<button/,
        route,
      );
    }
  }
});
