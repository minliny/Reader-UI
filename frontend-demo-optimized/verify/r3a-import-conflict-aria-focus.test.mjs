import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createVmRenderer } from "../../tools/interaction-inventory/interaction-inventory-lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const contract = createRequire(import.meta.url)(join(here, "..", "import-runtime-contract.js"));
const renderer = createVmRenderer();
const buttonTags = (html) => [...html.matchAll(/<button\b[^>]*>/g)].map((match) => match[0]);

test("R3a import aria: every primary control has an explicit accessible name", () => {
  let count = 0;
  for (const route of contract.PRIMARY_ROUTES) {
    const buttons = buttonTags(renderer.renderRoute(route));
    assert.ok(buttons.every((tag) => /aria-label="[^"]+"/.test(tag)), route);
    count += buttons.length;
  }
  assert.equal(count, 32);
});

test("R3a import focus: all non-back actions declare a stable focus-return marker", () => {
  for (const route of contract.PRIMARY_ROUTES) {
    const buttons = buttonTags(renderer.renderRoute(route));
    const specs = contract.CONTROL_SPECS.filter((spec) => spec.route === route);
    specs.forEach((spec, index) => {
      if (spec.focusReturn) assert.match(buttons[index], /data-restore-focus="[^"]+"/, `${route}/${spec.settingsKey}`);
      else assert.doesNotMatch(buttons[index], /data-restore-focus=/, `${route}/${spec.settingsKey}`);
    });
  }
});

test("R3a import aria: parsing exposes a polite busy status and bounded progressbar", () => {
  const html = renderer.renderRoute("import-parsing", {}, { importParseProgress: 72 });
  assert.match(html, /role="status"[^>]*aria-live="polite"[^>]*aria-busy="true"/);
  assert.match(html, /role="progressbar"[^>]*aria-valuenow="72"[^>]*aria-valuemin="0"[^>]*aria-valuemax="100"/);
});

test("R3a import aria: permission recovery keeps settings, retry, and exit semantics distinct", () => {
  const html = renderer.renderRoute("import-permission-denied");
  assert.match(html, /data-settings-key="permission-settings"[^>]*>/);
  assert.match(html, /data-ui-event="permission\.open-settings"/);
  assert.match(html, /data-ui-event="permission\.recovery\.retry"/);
  assert.match(html, /data-ui-event="route\.popToRoot"/);
});

test("R3a import aria: cancel, rollback, commit and retry events remain explicit", () => {
  const all = contract.PRIMARY_ROUTES.map((route) => renderer.renderRoute(route)).join("\n");
  for (const event of ["import.cancel", "import.conflict.resolve", "import.retry.failed", "import.apply"]) {
    assert.match(all, new RegExp(`data-ui-event="${event.replaceAll(".", "\\.")}"`));
  }
});

test("R3a import aria: production route/action attributes survive identity stamping", () => {
  assert.match(renderer.renderRoute("import-empty-file"), /data-route="local-import"/);
  assert.match(renderer.renderRoute("import-partial-success"), /data-action="import-retry-failed"/);
  assert.match(renderer.renderRoute("import-conflict-resolve"), /data-action="import-rollback"/);
});
