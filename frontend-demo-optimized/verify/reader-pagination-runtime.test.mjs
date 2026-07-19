import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");
const runtimeSource = readFileSync(join(demoRoot, "render-runtime.js"), "utf8");
const appearanceSpecSource = readFileSync(join(demoRoot, "appearance-spec.js"), "utf8");
const fixtureSource = readFileSync(join(demoRoot, "fixture.js"), "utf8");
const readerViewportCssSource = readFileSync(join(demoRoot, "styles", "03c-reader-viewport.css"), "utf8");

function loadFixture() {
  const context = vm.createContext({ window: {} });
  new vm.Script(appearanceSpecSource, { filename: "appearance-spec.js" }).runInContext(context);
  new vm.Script(fixtureSource, { filename: "fixture.js" }).runInContext(context);
  return context.window.READER_FRONTEND_DEMO_DRAFT_FIXTURE;
}

function decodeText(value) {
  return String(value || "")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

function createMeasureDocument() {
  return {
    body: {
      appendChild() {}
    },
    createElement() {
      let cssText = "";
      let html = "";
      let width = 0;
      let height = 0;
      const style = {};
      Object.defineProperty(style, "cssText", {
        get() {
          return cssText;
        },
        set(value) {
          cssText = String(value || "");
          width = Number(cssText.match(/width:([\d.]+)px/)?.[1] || 0);
          height = Number(cssText.match(/height:([\d.]+)px/)?.[1] || 0);
        }
      });
      return {
        className: "",
        style,
        setAttribute() {},
        remove() {},
        set innerHTML(value) {
          html = String(value || "");
        },
        get innerHTML() {
          return html;
        },
        get scrollHeight() {
          const fontSize = 18;
          const lineHeight = fontSize * 1.96;
          const paragraphGap = 16;
          const charsPerLine = Math.max(1, Math.floor(width / fontSize));
          const firstLineChars = Math.max(1, charsPerLine - 2);
          const paragraphs = Array.from(html.matchAll(/<p>([\s\S]*?)<\/p>/g), (match) => decodeText(match[1]));
          const paragraphHeight = paragraphs.reduce((total, paragraph) => {
            const charCount = Array.from(paragraph).length;
            const lineCount = charCount <= firstLineChars
              ? 1
              : 1 + Math.ceil((charCount - firstLineChars) / charsPerLine);
            return total + lineCount * lineHeight + paragraphGap;
          }, 0);
          const titleHeight = html.includes("<h1>") ? 23 * 1.25 + 24 : 0;
          return Math.min(Number.MAX_SAFE_INTEGER, Math.ceil(titleHeight + paragraphHeight));
        },
        get clientHeight() {
          return height;
        }
      };
    }
  };
}

function loadRuntimeHooks(document) {
  const window = {
    ReaderFrontendDemoDraftRouteContract: {
      routes: {},
      deepRouteClosure: {},
      routePresentation: {}
    }
  };
  const context = vm.createContext({ window, document });
  new vm.Script(runtimeSource, { filename: "render-runtime.js" }).runInContext(context);
  return context.window.ReaderRuntimeTestHooks;
}

function createPaginationHarness(rect) {
  const layer = {
    getBoundingClientRect() {
      return { width: rect.width, height: rect.height };
    }
  };
  return {
    layer,
    screenHost: {
      querySelector(selector) {
        return selector === ".fd-ir-reading-layer" ? layer : null;
      }
    }
  };
}

function joinedPageText(pages) {
  return pages.flatMap((page) => Array.from(page.paragraphs || [])).join("");
}

test("reader pagination refreshes when the reading box changes from 390x844 to 1000x900", () => {
  const data = loadFixture();
  const hooks = loadRuntimeHooks(createMeasureDocument());
  const rect = { width: 324, height: 722 };
  const { screenHost } = createPaginationHarness(rect);
  const appState = {
    readerPageMode: "horizontal",
    readerTypography: { ...data.reader.typography },
    readerPages: [],
    readerPaginationKey: "",
    readerPageIndex: 0
  };
  const sourceText = data.reader.readingText.join("");

  assert.equal(data.reader.readingText.length, 38);
  assert.deepEqual(Array.from(hooks.readerTextBlocks(data)), Array.from(data.reader.readingText));
  assert.equal(hooks.refreshReaderPaginationForLayout(screenHost, data, appState), true);
  const phonePageCount = appState.readerPages.length;
  const phoneFirstPage = joinedPageText([appState.readerPages[0]]);
  assert.equal(joinedPageText(appState.readerPages), sourceText);

  rect.width = 670;
  rect.height = 682;
  assert.equal(hooks.refreshReaderPaginationForLayout(screenHost, data, appState), true);
  const tabletPageCount = appState.readerPages.length;
  const tabletFirstPage = joinedPageText([appState.readerPages[0]]);

  assert.notEqual(tabletPageCount, phonePageCount);
  assert.notEqual(tabletFirstPage, phoneFirstPage);
  assert.match(appState.readerPaginationKey, /^670\|682\|/);
  assert.equal(joinedPageText(appState.readerPages), sourceText);
});

test("viewport and reading-box changes are wired to the pagination refresh", () => {
  const viewportHandler = runtimeSource.slice(
    runtimeSource.indexOf("    const handleViewportChange = () => {"),
    runtimeSource.indexOf("    const syncMotionPreference = () => {"),
  );
  const resizeObserver = runtimeSource.slice(
    runtimeSource.indexOf("    const observeReaderPaginationBox = () => {"),
    runtimeSource.indexOf("    const handleViewportChange = () => {"),
  );

  assert.match(viewportHandler, /scheduleReaderPaginationRefresh\(\)/);
  assert.match(runtimeSource, /addEventListener\("orientationchange", handleViewportChange\)/);
  assert.match(resizeObserver, /new window\.ResizeObserver/);
  assert.match(resizeObserver, /nextBox === readerPaginationObservedBox/);
  assert.match(runtimeSource, /observeReaderPaginationBox\(\);/);
  assert.match(runtimeSource, /document\.fonts\.ready\.then\(handleReaderFontMetricsChange\)/);
  assert.match(runtimeSource, /addEventListener\("loadingdone", handleReaderFontMetricsChange\)/);
});

test("pagination never caps a chapter at 80 pages and invalidates equal-length content changes", () => {
  const data = loadFixture();
  const hooks = loadRuntimeHooks(createMeasureDocument());
  const { screenHost } = createPaginationHarness({ width: 18, height: 40 });
  const appState = {
    readerPageMode: "horizontal",
    readerTypography: { ...data.reader.typography },
    readerPages: [],
    readerPaginationKey: "",
    readerPageIndex: 0
  };

  data.reader.readingText = ["甲".repeat(120)];
  assert.equal(hooks.updateReaderPagination(screenHost, data, appState), true);
  assert.ok(appState.readerPages.length > 80);
  assert.equal(joinedPageText(appState.readerPages), data.reader.readingText.join(""));
  const firstKey = appState.readerPaginationKey;

  data.reader.readingText = ["乙".repeat(120)];
  assert.equal(hooks.updateReaderPagination(screenHost, data, appState), true);
  assert.notEqual(appState.readerPaginationKey, firstKey);
  assert.equal(joinedPageText(appState.readerPages), data.reader.readingText.join(""));
});

test("wide Reader viewports keep the full reading width while the control dock overlays it", () => {
  assert.doesNotMatch(
    readerViewportCssSource,
    /right:\s*calc\(var\(--reader-dock-right\)\s*\+\s*var\(--reader-dock-width\)/
  );
  assert.match(
    readerViewportCssSource,
    /compact-landscape"\]\s+\.fd-ir-reading-layer\s*\{[\s\S]*?inset:\s*74px\s+30px\s+24px;/
  );
});
