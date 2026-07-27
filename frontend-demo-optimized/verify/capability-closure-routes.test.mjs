import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const frontendRoot = new URL("../", import.meta.url);
const repoRoot = new URL("../../", import.meta.url);
const rendererUrl = new URL("renderers/d6-capability-closure-renderers.js", frontendRoot);

const CAPABILITY_ROUTES = [
  "onboarding-welcome",
  "onboarding-capability-setup",
  "permission-recovery",
  "local-format-support",
  "pdf-reader",
  "manga-reader",
  "http-tts-management",
  "http-tts-editor",
  "http-tts-test",
  "content-edit",
  "book-cover-change",
  "book-cover-search",
  "chapter-reviews",
  "bookmarks-manager",
  "download-queue",
  "download-task-detail",
  "storage-management",
  "webview-login",
  "webview-captcha",
  "webview-challenge",
  "webview-cookie-return",
  "settings-tts",
  "settings-storage",
  "settings-accessibility"
];

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

async function loadRenderer() {
  const context = vm.createContext({});
  context.window = context;
  vm.runInContext(await readFile(new URL("asset-library/icons.js", frontendRoot), "utf8"), context);
  vm.runInContext(await readFile(new URL("shared-shell-kit/kit.js", frontendRoot), "utf8"), context);
  vm.runInContext(await readFile(rendererUrl, "utf8"), context);
  return context.ReaderD6CapabilityClosureRenderers;
}

function attributeValues(html, name) {
  const pattern = new RegExp(`${name}="([^"]+)"`, "g");
  return Array.from(html.matchAll(pattern), (match) => match[1]);
}

test("D6 explicitly owns exactly the 24 capability-closure routes", async () => {
  const renderer = await loadRenderer();
  assert.deepEqual(Array.from(renderer.CAPABILITY_ROUTES), CAPABILITY_ROUTES);
  assert.deepEqual(Object.keys(renderer.ROUTE_CONFIG), CAPABILITY_ROUTES);
  assert.deepEqual(Object.keys(renderer.INTEGRATION_MAP), CAPABILITY_ROUTES);
  assert.equal(renderer.renderD6Route("bookshelf", {}, {}), null);
});

test("every D6 route renders its canonical shell and never falls through to bookshelf", async () => {
  const renderer = await loadRenderer();
  const routeFixtures = await readJson(new URL("contracts/fixtures/route.fixtures.json", repoRoot));
  const shellByRoute = new Map(routeFixtures.map((fixture) => [fixture.id, fixture.shell]));

  for (const route of CAPABILITY_ROUTES) {
    const html = renderer.renderD6Route(route, { status: { time: "10:30", battery: "100%" } }, {});
    assert.match(html, new RegExp(`data-capability-route="${route}"`), route);
    assert.match(html, /data-renderer="d6-capability-closure"/, route);
    assert.match(html, /data-delivery-state="registered-local-fail-closed"/, route);
    assert.match(html, new RegExp(`data-shell="${shellByRoute.get(route)}"`), route);
    assert.doesNotMatch(html, /data-icon-missing=/, route);
    assert.doesNotMatch(html, /data-contract-static-route=/, route);
    assert.doesNotMatch(html, /aria-label="书架"/, route);
    assert.match(html, /data-action-policy="demo-route-only"/, `${route} should expose a live demo route transition`);
    assert.match(html, /data-action-policy="planned-fail-closed"/, `${route} should expose its disabled business boundary`);
  }
});

test("D6 action events and navigation targets stay inside canonical contracts", async () => {
  const renderer = await loadRenderer();
  const routeSchema = await readJson(new URL("contracts/route.schema.json", repoRoot));
  const eventSchema = await readJson(new URL("contracts/ui-event.schema.json", repoRoot));
  const canonicalRoutes = new Set(routeSchema.properties.id.enum);
  const canonicalEvents = new Set(eventSchema.properties.type.enum);

  for (const route of CAPABILITY_ROUTES) {
    const html = renderer.renderD6Route(route, {}, {});
    const targets = attributeValues(html, "data-route");
    const events = attributeValues(html, "data-ui-event");
    assert.ok(targets.length > 0, `${route} must have a canonical navigation target`);
    assert.ok(events.length > 0, `${route} must expose canonical UiEvent semantics`);
    for (const target of targets) assert.ok(canonicalRoutes.has(target), `${route} uses unknown RouteId ${target}`);
    for (const event of events) assert.ok(canonicalEvents.has(event), `${route} uses unknown UiEvent ${event}`);
  }
});

test("all non-route business actions are visibly and natively fail-closed", async () => {
  const renderer = await loadRenderer();
  for (const route of CAPABILITY_ROUTES) {
    const html = renderer.renderD6Route(route, {}, {});
    const plannedButtons = Array.from(html.matchAll(/<button[^>]*data-action-policy="planned-fail-closed"[^>]*>/g), (match) => match[0]);
    assert.ok(plannedButtons.length > 0, route);
    for (const button of plannedButtons) {
      assert.match(button, /\sdisabled(?:\s|>)/, route);
      assert.match(button, /aria-disabled="true"/, route);
      assert.doesNotMatch(button, /data-route=/, route);
    }
  }
});

test("index loads D6 before render bootstrap and render-runtime dispatches it before the route switch", async () => {
  const [indexHtml, runtimeSource] = await Promise.all([
    readFile(new URL("index.html", frontendRoot), "utf8"),
    readFile(new URL("render-runtime.js", frontendRoot), "utf8")
  ]);
  const d6ScriptIndex = indexHtml.indexOf("renderers/d6-capability-closure-renderers.js");
  const bootstrapIndex = indexHtml.indexOf("./render.js");
  assert.ok(d6ScriptIndex >= 0, "D6 renderer script missing from index.html");
  assert.ok(d6ScriptIndex < bootstrapIndex, "D6 renderer must load before render.js");

  const dispatchIndex = runtimeSource.indexOf("ReaderD6CapabilityClosureRenderers.renderD6Route");
  const switchIndex = runtimeSource.indexOf("switch (route)", dispatchIndex);
  assert.ok(dispatchIndex >= 0, "D6 dispatch hook missing");
  assert.ok(switchIndex > dispatchIndex, "D6 dispatch must execute before the fallback route switch");
});
