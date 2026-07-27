import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");
const readDemo = (path) => readFileSync(join(demoRoot, path), "utf8");

const rendererSource = readDemo("renderers/d2-bookshelf-discover-renderers.js");
const runtimeSource = readDemo("render-runtime.js");
const routeContractSource = readDemo("route-contract.js");
const appearanceSpecSource = readDemo("appearance-spec.js");
const fixtureSource = readDemo("fixture.js");
const fixtureBundleSource = `${appearanceSpecSource}\n${fixtureSource}`;
const foundationSource = readDemo("styles/00-foundation.css");
const stylesEntrySource = readDemo("styles.css");
const indexSource = readDemo("index.html");

function evaluateWindowScript(source, filename, windowOverrides = {}) {
  const window = { ...windowOverrides };
  const context = vm.createContext({ window });
  new vm.Script(source, { filename }).runInContext(context);
  return context.window;
}

function rendererWindow() {
  return evaluateWindowScript(rendererSource, "d2-bookshelf-discover-renderers.js", {
    ReaderShellKit: {
      renderMainTabShell(config) {
        return `${config.contentHtml || ""}${config.stateHostHtml || ""}`;
      },
      renderLibraryShell(config) {
        return `${config.contentHtml || ""}${config.stateHostHtml || ""}`;
      },
      icon(name, className) {
        return `<i class="${className}" data-icon="${name}"></i>`;
      },
    },
  });
}

const books = [
  { bookId: "long-night", title: "长夜余火", author: "爱潜水的乌贼", chapter: "第 32 章 雨夜", coverKey: "longNight" },
  { bookId: "android-notes", title: "Android 开发笔记", author: "本地文档", chapter: "Compose Shell 结构", coverKey: "androidNotes" },
];

const fixture = {
  covers: { longNight: "./covers/long-night.png", androidNotes: "./covers/android-notes.png" },
  mainTabs: { books },
};

function bookItemOpenTags(html) {
  return [...html.matchAll(/<article class="fd-book-card fd-book-item"[^>]+>/g)].map((match) => match[0]);
}

function attribute(tag, name) {
  return tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] || "";
}

test("bookshelf cover and list modes render the same persistent BookItem identities", () => {
  const api = rendererWindow().ReaderD2BookshelfDiscoverRenderers;
  const coverHtml = api.bookshelfV2(fixture, "bookshelf", { bookshelfView: "cover" });
  const listHtml = api.bookshelfV2(fixture, "bookshelf", { bookshelfView: "list" });
  const coverItems = bookItemOpenTags(coverHtml);
  const listItems = bookItemOpenTags(listHtml);

  assert.equal(coverItems.length, books.length);
  assert.equal(listItems.length, books.length);
  assert.deepEqual(
    coverItems.map((tag) => attribute(tag, "data-book-id")),
    listItems.map((tag) => attribute(tag, "data-book-id")),
  );
  assert.equal(new Set(coverItems.map((tag) => attribute(tag, "data-book-id"))).size, books.length);
  assert.deepEqual(coverItems.map((tag) => attribute(tag, "data-book-id")), books.map((book) => book.bookId));
  assert.match(coverHtml, /<section class="fd-book-grid[^>]*role="list"/);
  assert.match(listHtml, /<section class="fd-book-grid[^>]*role="list"/);
  for (const tag of coverItems) {
    const bookId = attribute(tag, "data-book-id");
    assert.equal(attribute(tag, "role"), "listitem");
    assert.equal(attribute(tag, "data-motion-actor-key"), `bookshelf.book.${bookId}`);
  }
  assert.deepEqual(coverItems.map((tag) => attribute(tag, "aria-posinset")), ["1", "2"]);
  assert.ok(coverItems.every((tag) => attribute(tag, "aria-setsize") === "2"));
});

test("canonical bookshelf fixture publishes eleven explicit unique book ids", () => {
  const fixtureWindow = evaluateWindowScript(fixtureBundleSource, "appearance-spec+fixture.js");
  const fixtureBooks = fixtureWindow.READER_FRONTEND_DEMO_DRAFT_FIXTURE.mainTabs.books;
  const ids = fixtureBooks.map((book) => book.bookId);

  assert.equal(fixtureBooks.length, 11);
  assert.ok(ids.every(Boolean));
  assert.equal(new Set(ids).size, fixtureBooks.length);
});

test("the shipped stylesheet keeps the unified list row at the 72px static endpoint", () => {
  assert.match(foundationSource, /\.fd-book-grid\.is-list-view \.fd-book-item\s*\{[^}]*min-height:\s*72px/s);
  assert.match(foundationSource, /\.fd-book-grid\.is-list-view \.fd-book-item-content\s*\{[^}]*grid-template-columns:\s*minmax\(0, auto\) minmax\(0, 1fr\)/s);
  assert.match(foundationSource, /\.fd-book-grid\.is-list-view \.fd-book-item-author::after\s*\{[^}]*content:\s*" ·"/s);
  assert.match(stylesEntrySource, /00-foundation\.css\?v=[^"\n]*bookshelf-bookitem-v1-20260716/);
  assert.match(indexSource, /styles\.css\?v=[^"\n]*bookshelf-bookitem-v2-20260716/);
});

test("each BookItem owns list metadata and a sibling more action without nested row semantics", () => {
  const api = rendererWindow().ReaderD2BookshelfDiscoverRenderers;
  const html = api.bookshelfV2(fixture, "bookshelf", { bookshelfView: "cover" });

  assert.doesNotMatch(html, /fd-book-list-row/);
  assert.doesNotMatch(html, /data-book-card[^>]*role="button"/);
  assert.equal((html.match(/data-book-item(?:\s|>)/g) || []).length, books.length);
  assert.equal((html.match(/class="fd-book-item-chapter"/g) || []).length, books.length);
  assert.equal((html.match(/class="fd-book-list-meta"/g) || []).length, books.length);
  assert.equal((html.match(/data-book-source-type=/g) || []).length, books.length);
  assert.equal((html.match(/data-book-cached=/g) || []).length, books.length);
  assert.equal((html.match(/data-book-more/g) || []).length, books.length);
  assert.equal((html.match(/data-route="bookshelf-book-more-menu"/g) || []).length, books.length);
  assert.match(html, /data-book-list-detail[^>]*aria-hidden="true"/);
});

function runtimeWindow() {
  const contractWindow = evaluateWindowScript(routeContractSource, "route-contract.js");
  return evaluateWindowScript(runtimeSource, "render-runtime.js", {
    ReaderFrontendDemoDraftRouteContract: contractWindow.ReaderFrontendDemoDraftRouteContract,
  });
}

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  toggle(name, force) {
    if (force) this.values.add(name);
    else this.values.delete(name);
  }
}

class FakeNode {
  constructor(attributes = {}) {
    this.attributes = new Map(Object.entries(attributes));
    this.classList = new FakeClassList();
    this.textContent = "";
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
}

test("view application updates aria state and preserves the first visible book anchor", () => {
  const { applyBookshelfViewState } = runtimeWindow().ReaderRuntimeTestHooks;
  const scrollHost = new FakeNode();
  scrollHost.scrollTop = 100;
  scrollHost.getBoundingClientRect = () => ({ top: 0, bottom: 100 });

  const grid = new FakeNode({ "data-bookshelf-view": "cover" });
  const positions = {
    cover: [-90, 10, 90],
    list: [-140, 40, 130],
  };
  const items = ["book-a", "book-b", "book-c"].map((bookId, index) => {
    const item = new FakeNode({ "data-book-id": bookId });
    const detail = new FakeNode({ "data-book-list-detail": "" });
    const more = new FakeNode({ "data-book-more": "" });
    item.querySelectorAll = (selector) => selector === "[data-book-more]" ? [more] : [detail, more];
    item.getBoundingClientRect = () => {
      const top = positions[grid.getAttribute("data-bookshelf-view")][index];
      return { top, bottom: top + 72 };
    };
    item.detail = detail;
    item.more = more;
    return item;
  });
  grid.closest = () => scrollHost;
  grid.querySelectorAll = (selector) => selector.includes("data-book-item") ? items : [];

  const coverButton = new FakeNode({ "data-bookshelf-view-button": "cover" });
  const listButton = new FakeNode({ "data-bookshelf-view-button": "list" });
  const feedback = new FakeNode();
  const screenHost = {
    querySelector(selector) {
      if (selector === "[data-book-grid]") return grid;
      if (selector === "[data-bookshelf-view-feedback]") return feedback;
      return null;
    },
    querySelectorAll(selector) {
      return selector === "[data-bookshelf-view-button]" ? [coverButton, listButton] : [];
    },
  };
  const appState = {};

  const result = applyBookshelfViewState(screenHost, appState, "list");

  assert.equal(result.view, "list");
  assert.equal(result.anchorBookId, "book-b");
  assert.equal(scrollHost.scrollTop, 130, "anchor delta must be added to the existing scroll offset");
  assert.equal(grid.getAttribute("aria-label"), "书籍列表");
  assert.equal(appState.bookshelfView, "list");
  assert.equal(appState.bookshelfViewFeedback, "已切换到列表视图");
  assert.equal(feedback.textContent, "已切换到列表视图");
  assert.equal(coverButton.getAttribute("aria-pressed"), "false");
  assert.equal(listButton.getAttribute("aria-pressed"), "true");
  assert.equal(items[1].getAttribute("aria-posinset"), "2");
  assert.equal(items[1].getAttribute("aria-setsize"), "3");
  assert.equal(items[1].getAttribute("data-bookshelf-item-view"), "list");
  assert.equal(items[1].detail.getAttribute("aria-hidden"), "false");
  assert.equal(items[1].more.getAttribute("aria-hidden"), "false");
  assert.equal(items[1].more.getAttribute("tabindex"), "0");

  const reverseResult = applyBookshelfViewState(screenHost, appState, "cover");

  assert.equal(reverseResult.view, "cover");
  assert.equal(reverseResult.anchorBookId, "book-b");
  assert.equal(scrollHost.scrollTop, 100, "round trip must restore the original anchor offset");
  assert.equal(grid.getAttribute("aria-label"), "书籍封面网格");
  assert.equal(coverButton.getAttribute("aria-pressed"), "true");
  assert.equal(listButton.getAttribute("aria-pressed"), "false");
  for (const item of items) {
    assert.equal(item.getAttribute("data-bookshelf-item-view"), "cover");
    assert.equal(item.detail.getAttribute("aria-hidden"), "true");
    assert.equal(item.more.getAttribute("aria-hidden"), "true");
    assert.equal(item.more.getAttribute("tabindex"), "-1");
  }
});

test("anchor helper selects the first intersecting persistent BookItem", () => {
  const { bookshelfViewAnchorSnapshot } = runtimeWindow().ReaderRuntimeTestHooks;
  const scrollHost = new FakeNode();
  scrollHost.getBoundingClientRect = () => ({ top: 20, bottom: 120 });
  const rects = [
    { top: -60, bottom: 10 },
    { top: 12, bottom: 84 },
    { top: 84, bottom: 156 },
  ];
  const items = rects.map((rect, index) => {
    const item = new FakeNode({ "data-book-id": `book-${index + 1}` });
    item.getBoundingClientRect = () => rect;
    return item;
  });
  const grid = new FakeNode();
  grid.closest = () => scrollHost;
  grid.querySelectorAll = () => items;

  const snapshot = bookshelfViewAnchorSnapshot(grid);

  assert.equal(snapshot.scrollHost, scrollHost);
  assert.equal(snapshot.bookId, "book-2");
  assert.equal(snapshot.top, -8);
});

test("view application preserves the scroll end when layout height changes", () => {
  const { applyBookshelfViewState } = runtimeWindow().ReaderRuntimeTestHooks;
  const grid = new FakeNode({ "data-bookshelf-view": "cover" });
  const scrollHost = new FakeNode();
  scrollHost.scrollTop = 500;
  scrollHost.clientHeight = 100;
  Object.defineProperty(scrollHost, "scrollHeight", {
    get() {
      return grid.getAttribute("data-bookshelf-view") === "cover" ? 600 : 400;
    },
  });
  scrollHost.getBoundingClientRect = () => ({ top: 0, bottom: 100 });
  const item = new FakeNode({ "data-book-id": "book-end" });
  item.getBoundingClientRect = () => ({ top: 20, bottom: 92 });
  item.querySelectorAll = () => [];
  grid.closest = () => scrollHost;
  grid.querySelectorAll = () => [item];
  const screenHost = {
    querySelector(selector) {
      return selector === "[data-book-grid]" ? grid : null;
    },
    querySelectorAll() {
      return [];
    },
  };

  const result = applyBookshelfViewState(screenHost, {}, "list");

  assert.equal(result.anchorBookId, "book-end");
  assert.equal(scrollHost.scrollTop, 300);
});

test("an unscrollable layout is treated as top rather than scroll end", () => {
  const { applyBookshelfViewState } = runtimeWindow().ReaderRuntimeTestHooks;
  const grid = new FakeNode({ "data-bookshelf-view": "cover" });
  const scrollHost = new FakeNode();
  scrollHost.scrollTop = 0;
  scrollHost.clientHeight = 100;
  Object.defineProperty(scrollHost, "scrollHeight", {
    get() {
      return grid.getAttribute("data-bookshelf-view") === "cover" ? 100 : 400;
    },
  });
  scrollHost.getBoundingClientRect = () => ({ top: 0, bottom: 100 });
  const item = new FakeNode({ "data-book-id": "book-top" });
  item.getBoundingClientRect = () => ({ top: 20, bottom: 92 });
  item.querySelectorAll = () => [];
  grid.closest = () => scrollHost;
  grid.querySelectorAll = () => [item];
  const screenHost = {
    querySelector(selector) {
      return selector === "[data-book-grid]" ? grid : null;
    },
    querySelectorAll() {
      return [];
    },
  };

  applyBookshelfViewState(screenHost, {}, "list");

  assert.equal(scrollHost.scrollTop, 0);
});

test("each more action carries its source index and the runtime opens that book context", () => {
  const fixtureWindow = evaluateWindowScript(fixtureBundleSource, "appearance-spec+fixture.js");
  const data = fixtureWindow.READER_FRONTEND_DEMO_DRAFT_FIXTURE;
  const api = rendererWindow().ReaderD2BookshelfDiscoverRenderers;
  const html = api.bookshelfV2(data, "bookshelf", { bookshelfView: "list" });
  const moreTags = [...html.matchAll(/<button class="fd-book-list-more"[^>]+>/g)].map((match) => match[0]);

  assert.equal(moreTags.length, data.mainTabs.books.length);
  assert.deepEqual(
    moreTags.map((tag) => Number(attribute(tag, "data-book-focus-index"))),
    Array.from(data.mainTabs.books, (_, index) => index),
  );
  assert.deepEqual(
    moreTags.map((tag) => attribute(tag, "data-book-id")),
    Array.from(data.mainTabs.books, (book) => book.bookId),
  );

  const routeBindingStart = runtimeSource.indexOf('screenHost.querySelectorAll("[data-route]")');
  const routeBindingEnd = runtimeSource.indexOf('screenHost.querySelectorAll("[data-book-cover]")', routeBindingStart);
  const routeBinding = runtimeSource.slice(routeBindingStart, routeBindingEnd);
  assert.match(routeBinding, /targetEl\.hasAttribute\("data-book-focus-index"\)/);
  assert.match(routeBinding, /appState\.bookFocusIndex\s*=/);
  assert.match(routeBinding, /appState\.bookshelfFocusBookId\s*=/);
  assert.match(runtimeSource, /focusTarget\.focus\(\{ preventScroll: true \}\)/);
  assert.match(runtimeSource, /route === "bookshelf-list-mode"[\s\S]*appState\.bookshelfView = "list"/);
  assert.match(runtimeSource, /route === "bookshelf-cover-mode"[\s\S]*appState\.bookshelfView = "cover"/);
  assert.match(rendererSource, /<button type="button" data-route-back>[^<]*\$\{icon\("chevron-left"/);
  assert.doesNotMatch(rendererSource, /data-close-book-focus data-route="bookshelf"/);
  assert.match(rendererSource, /fd-book-focus-menu[^>]*data-demo-dialog aria-hidden="false"/);
  assert.match(rendererSource, /actionIndex === 0 \? " data-dialog-initial-focus"/);

  const focusIndex = 5;
  const focusedBook = data.mainTabs.books[focusIndex];
  const menuHtml = api.bookshelfBookMoreMenuScreen(data, "bookshelf-book-more-menu", { bookFocusIndex: focusIndex });
  assert.match(menuHtml, new RegExp(`<strong data-focus-title>${focusedBook.title}</strong>`));
  assert.match(menuHtml, new RegExp(`data-book-focus-index="${focusIndex}"`));
});
