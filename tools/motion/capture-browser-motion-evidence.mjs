#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const defaultOutput = path.join(root, "frontend-demo-optimized", "verify", "motion", "evidence");

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!["--base-url", "--output-dir"].includes(flag)) throw new Error(`unknown argument: ${flag ?? "<missing>"}`);
    if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
    if (values.has(flag)) throw new Error(`duplicate argument: ${flag}`);
    values.set(flag, value);
  }
  return {
    baseUrl: values.get("--base-url") ?? "http://127.0.0.1:5177/frontend-demo-optimized/",
    outputDir: path.resolve(values.get("--output-dir") ?? defaultOutput),
  };
}

function loadPlaywright() {
  const moduleName = process.env.READER_PLAYWRIGHT_MODULE || "playwright";
  try {
    return require(moduleName);
  } catch (error) {
    throw new Error(
      `Playwright is required. Install it locally or set READER_PLAYWRIGHT_MODULE to its module path: ${error.message}`,
    );
  }
}

function assertInsideOutput(outputDir, targetPath) {
  const relative = path.relative(outputDir, targetPath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`capture output escaped the dedicated evidence directory: ${targetPath}`);
  }
}

async function assertPageReady(page, expectedRoute, errors) {
  await page.locator("[data-current-route]").waitFor({ state: "attached" });
  const state = await page.evaluate(() => ({
    currentRoute: document.querySelector("[data-current-route]")?.getAttribute("data-current-route") ?? null,
    errorOverlay: Boolean(document.querySelector("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay")),
    interactiveCount: document.querySelectorAll("button, a, input, select, textarea, [tabindex]").length,
    textLength: document.body.innerText.trim().length,
  }));
  if (state.currentRoute !== expectedRoute) throw new Error(`expected route ${expectedRoute}, got ${state.currentRoute}`);
  if (state.errorOverlay) throw new Error(`${expectedRoute} rendered a framework error overlay`);
  if (state.textLength === 0 || state.interactiveCount === 0) throw new Error(`${expectedRoute} rendered blank or non-interactive content`);
  if (errors.length > 0) throw new Error(`${expectedRoute} emitted browser errors: ${errors.join(" | ")}`);
}

const scenarios = [
  {
    file: "app.firstOpen.enter__bookshelf__normal.webm",
    route: "bookshelf",
    query: "captureRoute=bookshelf",
    run: async (page) => page.waitForTimeout(900),
  },
  {
    file: "tab.item.switch__bookshelf-to-rss__normal.webm",
    route: "bookshelf",
    query: "captureRoute=bookshelf",
    run: async (page) => {
      await page.waitForTimeout(250);
      await page.locator('[data-nav-type="rss"]').click();
      await page.locator('[data-current-route="rss"]').waitFor();
      await page.waitForTimeout(650);
    },
  },
  {
    file: "dropdown.menu.expand-collapse__bookshelf__normal.webm",
    route: "bookshelf",
    query: "captureRoute=bookshelf",
    run: async (page) => {
      await page.waitForTimeout(250);
      await page.locator('[data-top-action="more"]').click();
      await page.locator("[data-bookshelf-more-layer]").waitFor({ state: "visible" });
      await page.waitForTimeout(500);
      await page.locator("[data-close-bookshelf-more]").click();
      await page.waitForTimeout(500);
    },
  },
  {
    file: "reader.entry.coverToImmersive__bookshelf__normal.webm",
    route: "bookshelf",
    query: "captureRoute=bookshelf",
    run: async (page) => {
      await page.waitForTimeout(250);
      await page.locator('[data-book-cover][data-book-id="long-night"]').click();
      await page.locator('[data-current-route="immersive-reading"]').waitFor();
      await page.waitForTimeout(700);
    },
  },
  {
    file: "motion.interrupt.redirect__rapid-tab-switch__normal.webm",
    route: "bookshelf",
    query: "captureRoute=bookshelf",
    run: async (page) => {
      await page.waitForTimeout(250);
      await page.locator('[data-nav-type="discover"]').click();
      await page.waitForTimeout(40);
      await page.locator('[data-nav-type="rss"]').click();
      await page.locator('[data-current-route="rss"]').waitFor();
      await page.waitForTimeout(650);
    },
  },
  {
    file: "viewport.orientation.reshape-settle__reader__normal.webm",
    route: "reader",
    query: "captureRoute=reader",
    run: async (page) => {
      await page.waitForTimeout(250);
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForTimeout(700);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(700);
    },
  },
  {
    file: "tab.item.switch__bookshelf-to-rss__reduced-motion.webm",
    route: "bookshelf",
    query: "captureRoute=bookshelf&motionReduced=1",
    reducedMotion: "reduce",
    run: async (page) => {
      await page.waitForTimeout(250);
      await page.locator('[data-nav-type="rss"]').click();
      await page.locator('[data-current-route="rss"]').waitFor();
      await page.waitForTimeout(450);
    },
  },
];

async function recordScenario(browser, config, scenario, temporaryRoot) {
  const videoDir = fs.mkdtempSync(path.join(temporaryRoot, "scenario-"));
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "light",
    reducedMotion: scenario.reducedMotion ?? "no-preference",
    recordVideo: { dir: videoDir, size: { width: 390, height: 844 } },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", async (route) => {
    const requestUrl = route.request().url();
    if (requestUrl.startsWith(config.baseUrl)) return route.continue();
    return route.fulfill({ status: 200, contentType: "text/css", body: "" });
  });
  const video = page.video();
  let failure;
  try {
    const url = new URL(config.baseUrl);
    url.search = scenario.query;
    await page.goto(url.toString(), { waitUntil: "networkidle" });
    await assertPageReady(page, scenario.route, errors);
    await scenario.run(page);
    if (errors.length > 0) throw new Error(`${scenario.file} emitted browser errors: ${errors.join(" | ")}`);
  } catch (error) {
    failure = error;
  } finally {
    await context.close();
  }
  if (failure) throw failure;
  const recordedPath = await video.path();
  const targetPath = path.join(config.outputDir, scenario.file);
  assertInsideOutput(config.outputDir, targetPath);
  fs.copyFileSync(recordedPath, targetPath);
  const bytes = fs.statSync(targetPath).size;
  if (bytes <= 0) throw new Error(`empty WebM: ${scenario.file}`);
  return { file: scenario.file, bytes };
}

async function main() {
  const config = parseArguments(process.argv.slice(2));
  fs.mkdirSync(config.outputDir, { recursive: true });
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "reader-motion-capture-"));
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const outputs = [];
  try {
    for (const scenario of scenarios) outputs.push(await recordScenario(browser, config, scenario, temporaryRoot));
  } finally {
    await browser.close();
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
  console.log(`[browser-motion-evidence] PASS captures=${outputs.length}`);
  for (const output of outputs) console.log(`${output.file}\t${output.bytes}`);
}

main().catch((error) => {
  console.error(`[browser-motion-evidence] FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
