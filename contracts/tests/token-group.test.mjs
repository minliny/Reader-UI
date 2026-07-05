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

function tokenNamesFromTables(markdown) {
  const names = [];
  for (const line of markdown.split("\n")) {
    if (!line.startsWith("|")) continue;
    for (const match of line.matchAll(/`(--reader-ds-[^`]+)`/g)) names.push(match[1]);
  }
  return names;
}

const tokenSchema = loadJson("token.schema.json");
const tokenFixtures = loadJson("fixtures/token.fixtures.json");
const tokenSpec = readText("TOKEN_SPEC.md");
const matrix = readText("ROUTE_COMPONENT_MATRIX.md");

test("TOKEN_SPEC defines the canonical semantic groups", () => {
  const groupNames = new Set([...tokenSpec.matchAll(/^### 2\.\d+ .*（([^）]+)）/gm)].map((m) => m[1]));
  for (const group of [
    "reading-theme",
    "reading-typography",
    "card",
    "list",
    "button",
    "tab",
    "overlay",
    "night-mode",
    "rss-status",
    "motion",
  ]) {
    assert.ok(groupNames.has(group), `TOKEN_SPEC missing semantic group: ${group}`);
  }
});

test("tokens listed in TOKEN_SPEC tables all exist in token fixtures", () => {
  const fixtureNames = new Set(tokenFixtures.map((item) => item.name));
  const listed = tokenNamesFromTables(section(tokenSpec, "## 2. 语义 token 分组", "## 3."));
  assert.ok(listed.length > 40, "TOKEN_SPEC should list concrete semantic token names");
  for (const name of listed) {
    assert.ok(fixtureNames.has(name), `TOKEN_SPEC references token not in fixtures: ${name}`);
  }
});

test("every TOKEN_SPEC group except policy-only groups lists token fixtures or a policy", () => {
  const groupBlocks = [...tokenSpec.matchAll(/^(### 2\.\d+ .*（([^）]+)）[\s\S]*?)(?=^### 2\.\d+ |^## 3\.)/gm)];
  for (const [block, groupName] of groupBlocks.map((m) => [m[1], m[2]])) {
    const names = tokenNamesFromTables(block);
    if (groupName === "night-mode") {
      assert.ok(block.includes("dark color set"), "night-mode group must document platform dark color set policy");
      continue;
    }
    if (groupName === "motion") {
      const categories = new Set(tokenFixtures.map((item) => item.category));
      assert.ok(categories.has("motion-duration"), "motion group needs motion-duration fixtures");
      assert.ok(categories.has("motion-easing"), "motion group needs motion-easing fixtures");
      continue;
    }
    assert.ok(names.length > 0, `TOKEN_SPEC group has no token fixture references: ${groupName}`);
  }
});

test("Route matrix token groups are canonical TOKEN_SPEC groups", () => {
  const groupNames = new Set([...tokenSpec.matchAll(/^### 2\.\d+ .*（([^）]+)）/gm)].map((m) => m[1]));
  const tokenSection = section(matrix, "## 5. Route × Token 分组映射", "## 6.");
  for (const line of tokenSection.split("\n")) {
    if (!line.startsWith("|") || line.includes("---") || line.includes("Route")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    const groups = String(cells[1] || "")
      .replace(/（[^）]*）/g, "")
      .split("+")
      .map((part) => part.trim())
      .filter(Boolean);
    for (const group of groups) {
      assert.ok(groupNames.has(group), `Route matrix uses unknown token group: ${group}`);
    }
  }
});

test("token fixture categories stay within token schema enum", () => {
  const allowed = new Set(tokenSchema.properties.category.enum);
  for (const item of tokenFixtures) {
    assert.ok(allowed.has(item.category), `token fixture category not in schema: ${item.name} -> ${item.category}`);
  }
});
