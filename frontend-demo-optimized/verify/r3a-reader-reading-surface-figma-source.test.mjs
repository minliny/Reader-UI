import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");
const repoRoot = join(demoRoot, "..");
const runtimeSource = readFileSync(join(demoRoot, "render-runtime.js"), "utf8");
const fixtureSource = readFileSync(join(demoRoot, "fixture.js"), "utf8");
const appearanceSpecSource = readFileSync(join(demoRoot, "appearance-spec.js"), "utf8");
const shellCssSource = readFileSync(join(demoRoot, "styles", "01-shell-layout.css"), "utf8");
const viewportCssSource = readFileSync(join(demoRoot, "styles", "03c-reader-viewport.css"), "utf8");
const registry = JSON.parse(readFileSync(join(repoRoot, "docs", "design", "FIGMA_VISUAL_ADMISSION_REGISTRY.json"), "utf8"));
const paperTexture = readFileSync(join(demoRoot, "assets", "figma", "reader-paper-layer.png"));

function loadFixtureAndRuntime() {
  const window = {};
  const context = vm.createContext({ window, document: {} });
  new vm.Script(appearanceSpecSource, { filename: "appearance-spec.js" }).runInContext(context);
  new vm.Script(fixtureSource, { filename: "fixture.js" }).runInContext(context);
  new vm.Script(runtimeSource, { filename: "render-runtime.js" }).runInContext(context);
  return {
    data: window.READER_FRONTEND_DEMO_DRAFT_FIXTURE,
    hooks: window.ReaderRuntimeTestHooks
  };
}

test("reading surface is trace-bound to the current canonical Figma master and both responsive variants", () => {
  const { hooks } = loadFixtureAndRuntime();
  assert.deepEqual(JSON.parse(JSON.stringify(hooks.readerReadingSurfaceFigmaBinding)), {
    fileKey: "klhs2jMM4MncaJFqZMfqEK",
    canonicalMasterId: "1023:18354",
    phoneNodeId: "1023:18355",
    tabletNodeId: "1023:18371",
    phonePaperLayerId: "1023:18356",
    phoneReadingContentId: "1023:18357",
    tabletPaperLayerId: "1023:18372",
    tabletReadingContentId: "1023:18373",
    paperTextureAsset: "./assets/figma/reader-paper-layer.png",
    paperTextureSha256: "bfa7f242279d457b7707a7de9116047438c6fb2d437ac143125e8b35c7987a7a",
    defaultTypography: {
      fontFamilyId: "source-han-serif",
      fontFamily: "Noto Serif SC",
      fontSize: 18,
      lineHeight: 1.96,
      paragraphGap: 15.8,
      paragraphIndent: 2,
      letterSpacing: 0,
      titleFontSize: 23,
      titleLineHeight: 1.25,
      titleToBodyGap: 18,
      ink: "#2B241D"
    },
    defaultPageSpace: {
      topMargin: 72,
      sideMargin: 32,
      paragraphIndent: 2,
      texture: "paper"
    }
  });

  const record = registry.records.find((item) => item.id === "reader.reading-surface");
  assert.ok(record);
  assert.equal(record.figma.fileKey, hooks.readerReadingSurfaceFigmaBinding.fileKey);
  assert.equal(record.figma.canonicalMasterId, hooks.readerReadingSurfaceFigmaBinding.canonicalMasterId);
  assert.equal(record.figma.viewportNodes.phone, hooks.readerReadingSurfaceFigmaBinding.phoneNodeId);
  assert.equal(record.figma.viewportNodes.tablet, hooks.readerReadingSurfaceFigmaBinding.tabletNodeId);
  assert.deepEqual(record.local.targets, [
    "frontend-demo-optimized/render-runtime.js#sharedReaderSurface",
    "frontend-demo-optimized/styles/01-shell-layout.css#reader-reading-surface"
  ]);
});

test("default chapter page retains the canonical Figma typography and unannotated source content", () => {
  const { data, hooks } = loadFixtureAndRuntime();
  const html = hooks.sharedReaderSurface(data, "", {
    readerPageMode: "horizontal",
    readerTheme: "paper",
    readerPages: [],
    readerPageIndex: 0
  });

  assert.match(html, /data-figma-canonical-master="1023:18354"/);
  assert.match(html, /data-figma-phone-node="1023:18355"/);
  assert.match(html, /data-figma-tablet-node="1023:18371"/);
  assert.match(html, /data-figma-phone-paper-layer="1023:18356"/);
  assert.match(html, /data-figma-tablet-paper-layer="1023:18372"/);
  assert.match(html, /data-figma-phone-reading-content="1023:18357"/);
  assert.match(html, /data-figma-tablet-reading-content="1023:18373"/);
  assert.match(html, /data-reader-figma-default="true"/);
  assert.match(html, /--reader-font-family:&quot;Noto Serif SC&quot;, serif/);
  assert.match(html, /--reader-font-size:18px/);
  assert.match(html, /--reader-line-height:1\.96/);
  assert.match(html, /--reader-paragraph-gap:15\.8px/);
  assert.match(html, /--reader-paragraph-indent:2em/);
  assert.match(html, /雨声在窗外连成一片，像无数细小的针/);
  assert.doesNotMatch(html, /fd-reader-annotation/);
  assert.doesNotMatch(html, /title="已标注"/);
  assert.match(hooks.readerThemeStyle(data, { readerTheme: "paper" }), /--reader-paper-start:#FBF4E9/);
  assert.match(hooks.readerThemeStyle(data, { readerTheme: "paper" }), /--reader-paper-end:#EFE2D0/);
});

test("an explicit reader-owned typography or page-space setting remains an override, not a locally invented Figma default", () => {
  const { data, hooks } = loadFixtureAndRuntime();
  const html = hooks.sharedReaderSurface(data, "", {
    readerPageMode: "horizontal",
    readerTheme: "paper",
    readerTypography: { fontSize: 20, lineHeight: 2.1, paragraphGap: 20, letterSpacing: 0.5, fontFamily: "kai" },
    readerPageSpace: { topMargin: 80, sideMargin: 40, paragraphIndent: 0, texture: "plain" },
    readerPages: [],
    readerPageIndex: 0
  });

  assert.match(html, /data-reader-figma-default="false"/);
  assert.match(html, /--reader-font-size:20px/);
  assert.match(html, /--reader-paragraph-gap:20px/);
  assert.match(html, /--reader-top-margin:80px/);
  assert.match(html, /--reader-side-margin:40px/);
});

test("Figma ReadingPaper source asset and Phone/Tablet layout values are retained without a synthetic texture", () => {
  assert.deepEqual(Array.from(paperTexture.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(
    crypto.createHash("sha256").update(paperTexture).digest("hex"),
    "bfa7f242279d457b7707a7de9116047438c6fb2d437ac143125e8b35c7987a7a"
  );
  assert.match(shellCssSource, /assets\/figma\/reader-paper-layer\.png/);
  assert.doesNotMatch(shellCssSource, /feTurbulence type='fractalNoise'/);
  assert.match(shellCssSource, /inset:\s*0\.56px/);
  assert.match(shellCssSource, /top:\s*calc\(72\.56px \+ \(var\(--reader-top-margin, 72px\) - 72px\)\)/);
  assert.match(shellCssSource, /right:\s*calc\(32\.544px \+ \(var\(--reader-side-margin, 32px\) - 32px\)\)/);
  assert.match(shellCssSource, /bottom:\s*48\.549px/);
  assert.match(viewportCssSource, /top:\s*calc\(93px \+ \(var\(--reader-top-margin, 72px\) - 72px\)\)/);
  assert.match(viewportCssSource, /right:\s*calc\(45px \+ \(var\(--reader-side-margin, 32px\) - 32px\)\)/);
  assert.match(viewportCssSource, /bottom:\s*57px/);
  assert.match(shellCssSource, /h1\s*\{[\s\S]*?margin:\s*0 0 18px/);
  assert.match(shellCssSource, /viewBox='0 0 388\.89 842\.88'/);
  assert.match(shellCssSource, /viewBox='0 0 758\.89 958\.89'/);
  assert.match(shellCssSource, /matrix\(0 -71\.799 -71\.799 0 194\.44 151\.72\)/);
  assert.match(shellCssSource, /matrix\(0 -81\.681 -140\.11 0 379\.44 172\.6\)/);
});
