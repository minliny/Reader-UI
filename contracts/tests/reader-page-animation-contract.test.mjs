import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";
import {
  ReaderUIRuntime,
  initialReaderUIState,
} from "../../packages/reference/reader-ui-runtime.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const runtimeActionSpec = JSON.parse(read("ui-spec/runtime-actions.json"));
const expectedOptions = [
  ["cover", "覆盖"],
  ["slide", "滑动"],
  ["simulation", "仿真"],
  ["scroll", "滚动"],
  ["none", "无动画"],
];

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function loadDemoFixture() {
  const window = {};
  const context = vm.createContext({ window });
  new vm.Script(read("frontend-demo-optimized/appearance-spec.js")).runInContext(context);
  new vm.Script(read("frontend-demo-optimized/fixture.js")).runInContext(context);
  return window.READER_FRONTEND_DEMO_DRAFT_FIXTURE;
}

function createMeasureDocument() {
  return {
    body: { appendChild() {} },
    createElement() {
      let html = "";
      let width = 0;
      let height = 0;
      const style = {};
      Object.defineProperty(style, "cssText", {
        set(value) {
          width = Number(String(value).match(/width:([\d.]+)px/)?.[1] || 0);
          height = Number(String(value).match(/height:([\d.]+)px/)?.[1] || 0);
        },
      });
      return {
        className: "",
        style,
        setAttribute() {},
        remove() {},
        set innerHTML(value) { html = String(value || ""); },
        get innerHTML() { return html; },
        get scrollHeight() {
          const paragraphs = [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((match) => match[1]);
          const charsPerLine = Math.max(1, Math.floor(width / 18));
          const paragraphHeight = paragraphs.reduce(
            (total, paragraph) => total + Math.ceil(paragraph.length / charsPerLine) * 36 + 16,
            0,
          );
          return Math.ceil(paragraphHeight + (html.includes("<h1>") ? 54 : 0));
        },
        get clientHeight() { return height; },
      };
    },
  };
}

function loadRuntimeWindow(document) {
  const window = {
    ReaderFrontendDemoDraftRouteContract: {
      routes: {},
      deepRouteClosure: {},
      routePresentation: {},
    },
  };
  const context = vm.createContext({ window, document });
  new vm.Script(read("frontend-demo-optimized/render-runtime.js"), {
    filename: "render-runtime.js",
  }).runInContext(context);
  return window;
}

function loadRuntimeHooks(document) {
  return loadRuntimeWindow(document).ReaderRuntimeTestHooks;
}

test("pageAnimation fixture preserves all five canonical options in exact order", () => {
  const fixture = JSON.parse(read("contracts/fixtures/appearance.fixtures.json"));
  const select = fixture.selects.find((entry) => entry.id === "pageAnimation");
  assert.ok(select, "pageAnimation select is required");
  assert.equal(select.label, "翻页动画");
  assert.equal(select.defaultValue, "slide");
  assert.deepEqual(
    select.options.map((option) => [option.value, option.label]),
    expectedOptions,
  );
});

test("ArkTS, Kotlin, and Swift Appearance codegen preserve the exact five-option contract", () => {
  const generated = [
    {
      platform: "ArkTS",
      source: read("generated/arkts/Appearance.ets"),
      optionPattern: /\{\s*value:\s*"([^"]+)",\s*label:\s*"([^"]+)"\s*\}/g,
      defaultPattern: /id:\s*"pageAnimation".*defaultValue:\s*"slide"/,
    },
    {
      platform: "Kotlin",
      source: read("generated/kotlin/Appearance.kt"),
      optionPattern: /ReaderAppearanceSelectOption\("([^"]+)",\s*"([^"]+)"\)/g,
      defaultPattern: /ReaderAppearanceSelect\("pageAnimation",\s*"翻页动画",\s*"slide"/,
    },
    {
      platform: "Swift",
      source: read("generated/swift/Appearance.swift"),
      optionPattern: /\.init\(value:\s*"([^"]+)",\s*label:\s*"([^"]+)"\)/g,
      defaultPattern: /\.init\(id:\s*"pageAnimation",\s*label:\s*"翻页动画",\s*defaultValue:\s*"slide"/,
    },
  ];

  for (const target of generated) {
    assert.match(
      target.source,
      /Source: contracts\/appearance\.schema\.json \+ fixtures\/appearance\.fixtures\.json/,
      `${target.platform} output must identify the canonical appearance source`,
    );
    const line = target.source.split("\n").find((entry) => entry.includes('"pageAnimation"'));
    assert.ok(line, `${target.platform} pageAnimation output is missing`);
    assert.match(line, target.defaultPattern, `${target.platform} default must remain slide`);
    assert.deepEqual(
      [...line.matchAll(target.optionPattern)].map((match) => [match[1], match[2]]),
      expectedOptions,
      `${target.platform} must preserve cover/slide/simulation/scroll/none without dropping or reordering an option`,
    );
  }
});

test("Reader demo settings consumers preserve the same five visible options", () => {
  const expectedLabels = expectedOptions.map(([, label]) => label);
  const fixtureSource = read("frontend-demo-optimized/fixture.js");
  const runtimeContractSource = read("frontend-demo-optimized/reader-runtime-contract.js");
  const runtimeSource = read("frontend-demo-optimized/render-runtime.js");
  const d3Source = read("frontend-demo-optimized/renderers/d3-control-layers-renderers.js");
  const w4Source = read("frontend-demo-optimized/renderers/w4-theme-font-typography-renderers.js");

  const parseArray = (source, pattern, label) => {
    const match = source.match(pattern);
    assert.ok(match, `${label} array is missing`);
    return JSON.parse(match[1]);
  };
  assert.deepEqual(
    parseArray(fixtureSource, /pageAnimation:\s*(\[[^\]]+\])/, "demo fixture pageAnimation"),
    expectedLabels,
    "demo fixture options must retain all five labels in canonical order",
  );
  assert.match(fixtureSource, /pageAnimation:\s*"滑动"/, "demo default must be 滑动");
  assert.deepEqual(
    parseArray(runtimeContractSource, /pageAnimation:\s*(\[[^\]]+\])/, "runtime contract pageAnimation"),
    expectedLabels,
    "runtime interaction contract must retain all five labels in canonical order",
  );
  assert.deepEqual(
    parseArray(d3Source, /var pageTurnModes = (\[[^\]]+\]);/, "D3 pageTurnModes"),
    expectedLabels,
    "D3 full settings must not collapse the five-option contract",
  );
  assert.match(
    d3Source,
    /data-reader-setting-option="pageAnimation"/,
    "D3 full settings must write the canonical pageAnimation key",
  );
  for (const source of [runtimeSource, d3Source, w4Source]) {
    assert.doesNotMatch(
      source,
      /pageAnimation[\s\S]{0,120}翻页(?:方式|样式)|翻页(?:方式|样式)[\s\S]{0,120}pageAnimation/,
      "pageAnimation consumers must use the sole canonical label 翻页动画",
    );
  }
});

test("Reader runtime keeps five semantics, one owner, and reflows only from a committed Core character anchor", () => {
  const runtimeSource = read("frontend-demo-optimized/render-runtime.js");
  const fixtureSource = read("frontend-demo-optimized/fixture.js");
  const w4Source = read("frontend-demo-optimized/renderers/w4-theme-font-typography-renderers.js");
  const shellCssSource = read("frontend-demo-optimized/styles/01-shell-layout.css");
  const mapping = runtimeSource.match(
    /const readerPageAnimationCssByLabel = \{([\s\S]*?)\n  \};/,
  );
  assert.ok(mapping, "runtime animation mapping is required");
  for (const [label, cssValue] of [
    ["覆盖", "cover"],
    ["滑动", "slide"],
    ["仿真", "simulation"],
    ["滚动", "scroll"],
    ["无动画", "none"],
  ]) {
    assert.match(
      mapping[1],
      new RegExp(`"${label}":\\s*"${cssValue}"`),
      `${label} must retain its own runtime value`,
    );
  }
  assert.doesNotMatch(fixtureSource, /\bpageMode\s*:/, "fixture must not expose a second page-mode owner");
  assert.doesNotMatch(w4Source, /data-w4-layout-set="pageMode"/, "W4 must not expose a second page-mode owner");

  const data = loadDemoFixture();
  data.reader.readingText = ["甲".repeat(1800)];
  const runtimeWindow = loadRuntimeWindow(createMeasureDocument());
  const hooks = runtimeWindow.ReaderRuntimeTestHooks;
  const screenHost = {
    querySelector(selector) {
      return selector === ".fd-ir-reading-layer"
        ? { getBoundingClientRect: () => ({ width: 260, height: 420 }) }
        : null;
    },
  };
  const appState = {
    readerPageMode: "horizontal",
    readerPageAnimation: "slide",
    readerSettings: { pageAnimation: "滑动" },
    readerTypography: { ...data.reader.typography },
    readerPages: [],
    readerPaginationKey: "",
    readerPageIndex: 0,
    readerChapterIndex: 3,
    readerCanonicalLocation: null,
    readerLocationReflow: null,
    readerReflowAnchor: null,
  };
  assert.equal(hooks.updateReaderPagination(screenHost, data, appState), true);
  const originalPages = appState.readerPages;
  appState.readerReflowAnchor = { source: "core", bookId: "book-1", chapterIndex: 3, charOffset: 760 };
  assert.equal(
    runtimeWindow.ReaderPageAnimationController.applySetting(appState, "滚动"),
    false,
    "a stale transient reflow anchor without the structured committed Core location must fail closed",
  );
  appState.readerReflowAnchor = null;
  assert.equal(appState.readerPageMode, "horizontal");
  assert.equal(appState.readerSettings.pageAnimation, "滑动");
  assert.equal(appState.readerPages, originalPages);

  const coreRuntime = new ReaderUIRuntime(runtimeActionSpec, {
    ...initialReaderUIState(),
    routeId: "immersive-reading",
    routeStack: ["bookshelf"],
    readerCanonicalLocation: {
      bookId: "book-1",
      chapterIndex: 3,
      chapterOffset: 0,
      chapterProgress: 0,
      locationRevision: "reader-location-v1:book-1:3:0",
    },
    readerLocationReflow: {
      strategy: "offsetAnchor",
      primaryAnchor: "chapterOffset",
      fallbackAnchor: "chapterProgress",
      layoutIndependent: true,
    },
  });
  coreRuntime.dispatch("reader.page.next", {}, "page-animation-anchor");
  coreRuntime.providePageLayout("page-animation-anchor", {
    anchor: "chapter:3:offset:0",
    targetPageIndex: 5,
    chapterIndex: 3,
    chapterOffset: 760,
    chapterProgress: 0.42,
    viewportWidth: 390,
    viewportHeight: 844,
    fontScale: 1,
  });
  coreRuntime.acceptPageLocationResult("page-animation-anchor", {
    canonicalLocation: {
      bookId: "book-1",
      chapterIndex: 3,
      chapterOffset: 760,
      chapterProgress: 0.42,
      locationRevision: "reader-location-v1:book-1:3:760",
    },
    resolverVersion: "reader.location.resolve.v1.reflow",
    resolved: true,
    reflow: {
      strategy: "offsetAnchor",
      primaryAnchor: "chapterOffset",
      fallbackAnchor: "chapterProgress",
      layoutIndependent: true,
    },
  });
  const committedCoreResult = coreRuntime.acceptPageProgressResult("page-animation-anchor", {
    stored: true,
  });
  runtimeWindow.ReaderRuntimeResultConsumer.bind(appState);
  assert.equal(
    runtimeWindow.ReaderRuntimeResultConsumer.accept({
      accepted: true,
      state: {
        readerCanonicalLocation: "chapter:3:offset:760",
        readerLocationReflow: null,
        readerPageIndex: 5,
      },
    }),
    false,
    "an opaque canonicalLocation string outside the Core result contract must not drive reflow",
  );
  assert.equal(
    runtimeWindow.ReaderRuntimeResultConsumer.accept(committedCoreResult),
    true,
    "the public runtime result consumer must accept the real committed ReaderUIRuntime result",
  );
  assert.deepEqual(JSON.parse(JSON.stringify(appState.readerCanonicalLocation)), {
    bookId: "book-1",
    chapterIndex: 3,
    chapterOffset: 760,
    chapterProgress: 0.42,
    locationRevision: "reader-location-v1:book-1:3:760",
  });
  assert.deepEqual(JSON.parse(JSON.stringify(appState.readerLocationReflow)), {
    strategy: "offsetAnchor",
    primaryAnchor: "chapterOffset",
    fallbackAnchor: "chapterProgress",
    layoutIndependent: true,
  });
  assert.equal(
    runtimeWindow.ReaderRuntimeResultConsumer.accept({
      accepted: true,
      state: {
        readerCanonicalLocation: {
          bookId: "other-book",
          chapterIndex: 3,
          chapterOffset: 760,
          chapterProgress: 0.42,
          locationRevision: "reader-location-v1:other-book:3:760",
        },
        readerLocationReflow: {
          strategy: "offsetAnchor",
          primaryAnchor: "chapterOffset",
          fallbackAnchor: "chapterProgress",
          layoutIndependent: true,
        },
        readerPageIndex: 5,
      },
    }),
    false,
    "a cross-book Core result must not replace the active book anchor",
  );
  assert.equal(appState.readerReflowAnchor.source, "core");
  assert.equal(appState.readerReflowAnchor.charOffset, 760);

  assert.equal(runtimeWindow.ReaderPageAnimationController.applySetting(appState, "滚动"), true);
  assert.equal(appState.readerPageMode, "vertical");
  assert.equal(appState.readerPageAnimation, "scroll");
  assert.equal(appState.readerPageIndex, 5, "mode change must preserve the committed Core page index");
  assert.equal(appState.readerReflowAnchor.source, "core");
  assert.equal(appState.readerReflowAnchor.charOffset, 760);
  assert.equal(appState.readerPages.length, 0);

  const storageWrites = [];
  const storage = {
    getItem() { return null; },
    setItem(key, value) { storageWrites.push([key, value]); },
  };
  assert.equal(
    runtimeWindow.ReaderPageAnimationController.applyAppearanceSetting(
      appState,
      "pageAnimation",
      "simulation",
      storage,
    ),
    true,
    "the public W4 handler must use the same canonical pageAnimation owner",
  );
  assert.equal(appState.readerPageMode, "horizontal");
  assert.equal(appState.readerPageAnimation, "simulation");
  assert.equal(appState.readerSettings.pageAnimation, "仿真");
  assert.equal(storageWrites.length, 0, "pageAnimation must not persist through W4 typography storage");
  assert.equal(appState.readerTypography.pageAnimation, undefined);
  assert.equal(hooks.updateReaderPagination(screenHost, data, appState), true);
  assert.ok(appState.readerPageIndex > 0);
  assert.ok(appState.readerPages[appState.readerPageIndex].characterStart <= 760);
  assert.ok(appState.readerPages[appState.readerPageIndex].characterEnd > 760);

  assert.match(
    runtimeSource,
    /querySelectorAll\("\[data-w4-appearance-select\]"\)[\s\S]*?ReaderPageAnimationController\?\.applyAppearanceSetting/,
    "the W4 select listener must call the public canonical controller",
  );
  assert.match(
    runtimeSource,
    /querySelectorAll\("\[data-w4-layout-set\]"\)[\s\S]*?ReaderPageAnimationController\?\.applyAppearanceSetting/,
    "the W4 button listener must call the same public canonical controller",
  );
  for (const value of ["cover", "slide", "simulation", "none"]) {
    assert.match(
      shellCssSource,
      new RegExp(`\\.fd-ir-reading-layer\\[data-page-animation="${value}"\\]\\.fd-reader-page-turn-next,[\\s\\S]*?animation:\\s*none`),
      `${value} must emit no local production timeline before F3 freezes its MotionId`,
    );
  }
  assert.doesNotMatch(
    shellCssSource,
    /@keyframes\s+fd-reader-page-(?:next|prev)/,
    "no locally invented PageTurn keyframes may survive",
  );
  assert.doesNotMatch(shellCssSource, /fd-reader-page-(?:next|prev)-(?:cover|curl)/);
  assert.doesNotMatch(shellCssSource, /perspective\(\s*1200px\s*\)/);
  assert.match(
    shellCssSource,
    /\.fd-ir-reading-layer\[data-page-mode="vertical"\][\s\S]*overflow-y:\s*auto/,
    "滚动 must reach a vertically scrollable reading surface",
  );
});
