import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACTS_DIR = join(__dirname, "..");

function loadJson(rel) {
  return JSON.parse(readFileSync(join(CONTRACTS_DIR, rel), "utf8"));
}

function readText(rel) {
  return readFileSync(join(CONTRACTS_DIR, rel), "utf8");
}

function section(markdown, start, end) {
  const startIndex = markdown.indexOf(start);
  assert.notEqual(startIndex, -1, `missing section: ${start}`);
  const endIndex = end ? markdown.indexOf(end, startIndex + start.length) : -1;
  return endIndex === -1 ? markdown.slice(startIndex) : markdown.slice(startIndex, endIndex);
}

function tableRows(markdown) {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .filter((line) => !line.includes("---"))
    .filter((line) => !/^\|\s*(Route|RouteId|ComponentType|PageState|状态|Shell)/.test(line))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
}

function codeSpans(text) {
  return [...String(text).matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}

function cellCoversRoute(cell, routeId) {
  return codeSpans(cell).some((value) => {
    if (value === routeId) return true;
    if (value.endsWith("*")) return routeId.startsWith(value.slice(0, -1));
    return false;
  });
}

const routeSchema = loadJson("route.schema.json");
const motionSchema = loadJson("motion.schema.json");
const matrix = readText("ROUTE_COMPONENT_MATRIX.md");
const tokenSpec = readText("TOKEN_SPEC.md");

const P0_ROUTES = [
  "app-shell",
  "main-tabs",
  "bookshelf",
  "discover",
  "rss",
  "settings",
  "bookshelf-empty",
  "book-search",
  "search-home",
  "search-results",
  "search-loading",
  "search-empty",
  "search-error",
  "book-detail",
  "book-detail-toc-preview",
  "book-directory",
  "immersive-reading",
  "reader",
  "reader_content",
  // A2 strict physical removal retired the 8 reader control/overlay routes and
  // the legacy tts module route (MAJOR); they are no longer P0 until their
  // Figma-backed native conversion re-adds them to route.schema.json.
  "auto-page",
  "source-switch",
  "source-switch-results",
  "reader-night-state-v2",
  "global-settings",
  "sync-backup",
  "webdav-config",
  "sync-error",
  "restore-scopes",
  "restore-preview",
  "restore-running",
  "restore-result",
  "restore-conflict",
  "source-management",
  "source-detail",
  "source-add",
  "source-edit",
  "rss-detail",
  "rss-original",
  "rss-original-browser",
  "permission-required",
  "global-loading",
  "offline-state",
];

const MOTION_CRITICAL_ROUTES = [
  "app-shell",
  "main-tabs",
  "bookshelf",
  "book-search",
  "book-detail",
  "immersive-reading",
  "reader",
  "control-layer-base-v2",
  "reader-appearance-overlay-v2",
  "tts",
  "auto-page",
  "source-switch",
  "global-settings",
  "sync-backup",
  "restore-running",
  "source-management",
  "rss-original-browser",
  "global-loading",
  "offline-state",
  "permission-required",
];

test("P0 route set exists in route.schema.json", () => {
  const allowed = new Set(routeSchema.properties.id.enum);
  for (const routeId of P0_ROUTES) {
    assert.ok(allowed.has(routeId), `P0 route missing from schema: ${routeId}`);
  }
});

test("P0 routes have token group mapping in ROUTE_COMPONENT_MATRIX.md", () => {
  const tokenSection = section(matrix, "## 5. Route × Token 分组映射", "## 6.");
  const rows = tableRows(tokenSection);
  for (const routeId of P0_ROUTES) {
    assert.ok(
      rows.some((cells) => cellCoversRoute(cells[0], routeId)),
      `P0 route missing token group mapping: ${routeId}`
    );
  }
});

test("motion-critical routes have motion mapping in ROUTE_COMPONENT_MATRIX.md", () => {
  const motionSection = section(matrix, "## 4. Route × MotionId 映射", "## 5.");
  const rows = tableRows(motionSection);
  for (const routeId of MOTION_CRITICAL_ROUTES) {
    assert.ok(
      rows.some((cells) => cellCoversRoute(cells[0], routeId)),
      `motion-critical route missing motion mapping: ${routeId}`
    );
  }
});

test("Route × MotionId mapping only references schema MotionIds", () => {
  const motionSection = section(matrix, "## 4. Route × MotionId 映射", "## 5.");
  const rows = tableRows(motionSection);
  const allowed = new Set(motionSchema.properties.id.enum);
  for (const cells of rows) {
    for (const id of codeSpans(cells[1] || "")) {
      assert.ok(allowed.has(id), `ROUTE_COMPONENT_MATRIX references unknown MotionId: ${id}`);
    }
  }
});

test("Route × Token mapping only uses TOKEN_SPEC semantic groups", () => {
  const groupNames = new Set([...tokenSpec.matchAll(/^### 2\.\d+ .*（([^）]+)）/gm)].map((m) => m[1]));
  const tokenSection = section(matrix, "## 5. Route × Token 分组映射", "## 6.");
  const rows = tableRows(tokenSection);
  for (const cells of rows) {
    const groups = String(cells[1] || "")
      .replace(/（[^）]*）/g, "")
      .split("+")
      .map((part) => part.trim())
      .filter(Boolean);
    for (const group of groups) {
      assert.ok(groupNames.has(group), `ROUTE_COMPONENT_MATRIX uses unknown token group: ${group}`);
    }
  }
});
