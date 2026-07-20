import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createVmRenderer } from "../../tools/interaction-inventory/interaction-inventory-lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const contract = createRequire(import.meta.url)(join(here, "..", "discover-runtime-contract.js"));
const renderer = createVmRenderer();
const controls = (html) => [...html.matchAll(/<(button\b[^>]*|article\b(?=[^>]*\bdata-route=)[^>]*)>/g)].map((match) => match[1]);

test("R3a Discover ARIA: all 250 primary controls have accessible names", () => {
  let count = 0;
  for (const route of contract.PRIMARY_ROUTES) {
    const tags = controls(renderer.renderRoute(route)).filter((tag) => /data-control-key="discover\.control\./.test(tag));
    assert.ok(tags.every((tag) => /aria-label="[^"]+"/.test(tag)), route);
    count += tags.length;
  }
  assert.equal(count, 250);
});

test("R3a Discover focus: all route and selection launchers retain deterministic focus markers", () => {
  for (const route of contract.PRIMARY_ROUTES) {
    const tags = controls(renderer.renderRoute(route)).filter((tag) => /data-control-key="discover\.control\./.test(tag));
    const specs = contract.CONTROL_SPECS.filter((spec) => spec.route === route);
    specs.forEach((spec, index) => {
      if (spec.focusReturn) assert.match(tags[index], /data-restore-focus="[^"]+"/, `${route}/${spec.settingsKey}`);
    });
  }
});

test("R3a Discover ARIA: book cards remain keyboard-reachable named buttons with stable IDs", () => {
  const html = renderer.renderRoute("discover");
  for (const bookId of contract.BOOK_IDS) {
    const tag = controls(html).find((candidate) => candidate.includes(`data-book-id="${bookId}"`));
    assert.ok(tag, bookId);
    assert.match(tag, /role="button"/);
    assert.match(tag, /tabindex="0"/);
    assert.match(tag, /data-route="book-detail"/);
    assert.match(tag, new RegExp(`data-discover-card-id="book-${bookId}"`));
    assert.match(tag, /aria-label=/);
  }
});

test("R3a Discover ARIA: entry and navigation selections expose their current state", () => {
  const html = renderer.renderRoute("discover-entry-ranking");
  assert.match(html, /data-discover-entry="排行榜"[^>]*aria-current="page"/);
  assert.match(html, /data-nav-type="discover"[^>]*aria-current="page"/);
});

test("R3a Discover ARIA: sort disclosure and options preserve expanded and selected intent", () => {
  const html = renderer.renderRoute("discover-sort");
  assert.match(html, /data-discover-filter-toggle[^>]*aria-expanded="true"/);
  assert.match(html, /data-discover-sort-option="人气"[^>]*aria-pressed="true"/);
  for (const id of contract.SORT_IDS) assert.match(html, new RegExp(`data-settings-key="sort-${id}"`));
});

test("R3a Discover ARIA: source controls use stable source IDs and distinct event intent", () => {
  const html = renderer.renderRoute("discover-control");
  for (const sourceId of contract.SOURCE_IDS) assert.match(html, new RegExp(`data-discover-source-id="${sourceId}"`));
  assert.match(html, /data-ui-event="discover\.sourceType\.select"/);
  assert.match(html, /data-ui-event="discover\.refresh"/);
  assert.match(html, /data-ui-event="discover\.filter\.apply"/);
});

test("R3a Discover ARIA: main navigation is not misrepresented as a focus-return overlay", () => {
  const html = renderer.renderRoute("discover");
  for (const tab of ["bookshelf", "discover", "rss", "settings"]) {
    const tag = controls(html).find((candidate) => candidate.includes(`data-nav-type="${tab}"`));
    assert.ok(tag);
    assert.doesNotMatch(tag, /data-restore-focus=/);
    assert.match(tag, /data-ui-event="mainTab\.select"/);
  }
});
