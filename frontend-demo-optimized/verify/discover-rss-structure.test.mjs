import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");

function readDemoFile(relativePath) {
  return readFileSync(join(demoRoot, relativePath), "utf8");
}

function sourceSection(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `missing source marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `missing source marker after ${startMarker}: ${endMarker}`);
  return source.slice(start, end);
}

function evaluateWindowScript(source, filename, windowOverrides = {}) {
  const window = { ...windowOverrides };
  const context = vm.createContext({ window });
  new vm.Script(source, { filename }).runInContext(context);
  return context.window;
}

function routeFamily(route, prefix) {
  return route === prefix || route.startsWith(`${prefix}-`);
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function dataActionNames(source) {
  return new Set(
    [...source.matchAll(/data-action=["']([^"']+)["']/g)].map((match) => match[1]),
  );
}

const indexSource = readDemoFile("index.html");
const runtimeSource = readDemoFile("render-runtime.js");
const routeContractSource = readDemoFile("route-contract.js");
const admissionPolicySource = readDemoFile("figma-route-admission-policy.js");
const d2BookshelfSource = readDemoFile("renderers/d2-bookshelf-discover-renderers.js");
const d2RssSource = readDemoFile("renderers/d2-rss-renderers.js");

const routeContractWindow = evaluateWindowScript(
  routeContractSource,
  "route-contract.js",
);
const routeContract = routeContractWindow.ReaderFrontendDemoDraftRouteContract;

function evaluateRuntimeForStructureTest() {
  const exportMarker = "  window.ReaderRuntimeSharedFragments = {";
  assert.ok(runtimeSource.includes(exportMarker), "runtime test export marker must exist");
  const instrumentedRuntime = runtimeSource.replace(
    exportMarker,
    `  window.__renderRouteForStructureTest = renderRoute;\n  window.__discoverSortRouteForStructureTest = discoverSortRoute;\n\n${exportMarker}`,
  );
  return evaluateWindowScript(
    `${admissionPolicySource}\n${instrumentedRuntime}`,
    "render-runtime.js",
    {
      ReaderFrontendDemoDraftRouteContract: routeContract,
      ReaderAssetIcons: {
        renderIcon(name, className) {
          return `<i class="${className || "fd-icon"}" data-icon="${name}"></i>`;
        },
      },
      ReaderShellKit: {
        renderLibraryShell(config) {
          return `<main data-test-shell="LibraryShell" data-test-title="${config.title}">${config.topBarHtml || ""}${config.contentHtml || ""}${config.bottomActionHtml || ""}${config.dialogHtml || ""}${config.trailingHtml || ""}</main>`;
        },
        renderMainTabShell(config) {
          return `<main data-test-shell="MainTabShell" data-test-title="${config.title}">${config.topBarHtml || ""}${config.contentHtml || ""}${config.bottomActionHtml || ""}${config.dialogHtml || ""}${config.trailingHtml || ""}</main>`;
        },
      },
    },
  );
}

test("index does not load the obsolete D2 RSS renderer", () => {
  assert.doesNotMatch(
    indexSource,
    /<script\b[^>]*\bsrc=["'][^"']*d2-rss-renderers\.js(?:[?][^"']*)?["'][^>]*>/i,
    "D2 RSS must remain detached so it cannot replace canonical RSS pages",
  );
});

test("runtime dispatch cannot hand canonical Discover or RSS routes to D2", () => {
  const dispatch = sourceSection(
    runtimeSource,
    "  function renderRoute(",
    "    switch (route) {",
  );

  assert.doesNotMatch(
    dispatch,
    /ReaderD2RssRenderers/,
    "the retired D2 RSS integration hook must not return before the canonical switch",
  );

  const canonicalSwitch = sourceSection(
    runtimeSource,
    "    switch (route) {",
    "  function renderStack(",
  );
  const familyRoutes = Object.keys(routeContract.routes).filter(
    (route) => routeFamily(route, "discover") || routeFamily(route, "rss"),
  );

  for (const route of familyRoutes) {
    assert.match(
      canonicalSwitch,
      new RegExp(`case ["']${route}["']:`),
      `${route} must remain explicitly owned by the canonical runtime switch`,
    );
  }
});

test("D2 bookshelf integration contains no Discover route override", () => {
  const d2Window = evaluateWindowScript(
    d2BookshelfSource,
    "d2-bookshelf-discover-renderers.js",
  );
  const moduleApi = d2Window.ReaderD2BookshelfDiscoverRenderers;
  assert.ok(moduleApi, "D2 bookshelf renderer API must still be available");

  const integrationRoutes = Object.keys(moduleApi.INTEGRATION_MAP || {});
  const stateVariantRoutes = Object.keys(moduleApi.STATE_VARIANT_MAP || {});
  const discoverOverrides = integrationRoutes
    .concat(stateVariantRoutes)
    .filter((route) => routeFamily(route, "discover"));

  assert.deepEqual(
    discoverOverrides,
    [],
    "D2 may enhance bookshelf routes, but must never reclaim a Discover route",
  );
});

test("Discover and RSS contract closure is exact and complete", () => {
  assert.ok(routeContract, "route contract must be published");
  const contractRoutes = Object.keys(routeContract.routes);
  const discoverRoutes = contractRoutes.filter((route) => routeFamily(route, "discover"));
  const rssRoutes = contractRoutes.filter((route) => routeFamily(route, "rss"));
  const discoverClosure = routeContract.deepRouteClosure?.discover?.demoRoutes || [];
  const rssClosure = routeContract.deepRouteClosure?.rss?.demoRoutes || [];

  assert.equal(discoverRoutes.length, 41, "Discover contract must contain exactly 41 routes");
  assert.equal(rssRoutes.length, 53, "RSS contract must contain exactly 53 routes");
  assert.equal(discoverClosure.length, discoverRoutes.length, "Discover closure length must match its contract family");
  assert.equal(rssClosure.length, rssRoutes.length, "RSS closure length must match its contract family");
  assert.deepEqual(sorted(discoverClosure), sorted(discoverRoutes), "Discover closure must list every contract route exactly once");
  assert.deepEqual(sorted(rssClosure), sorted(rssRoutes), "RSS closure must list every contract route exactly once");
  assert.equal(new Set(discoverClosure).size, discoverClosure.length, "Discover closure must not contain duplicates");
  assert.equal(new Set(rssClosure).size, rssClosure.length, "RSS closure must not contain duplicates");
});

test("canonical Discover keeps its documented filter, list, row, and modal structure", () => {
  const discoverSource = sourceSection(
    runtimeSource,
    "  function discoverContext(",
    "  function rssSourcesData(",
  );

  for (const selector of [
    "fd-discover-source-bar",
    "fd-discover-entry-row",
    "fd-discover-filter-control",
    "fd-discover-list-head",
    "fd-discover-book-list",
    "fd-discover-book-row",
    "fd-discover-dialog-backdrop",
    "fd-discover-confirm-dialog",
  ]) {
    assert.match(discoverSource, new RegExp(selector), `canonical Discover is missing .${selector}`);
  }

  const filterBar = sourceSection(
    discoverSource,
    "  function discoverFilterBar(",
    "  function discoverResultHeader(",
  );
  assert.match(filterBar, /return filterDisclosure\(\{/);
  assert.match(filterBar, /className:\s*["']fd-discover-filter-control["']/);

  const rows = sourceSection(
    discoverSource,
    "  function discoverBookRows(",
    "  function discoverSkeletonList(",
  );
  assert.match(rows, /<section class=["']fd-discover-book-list/);
  assert.match(rows, /<article class=["']fd-discover-book-row/);
  assert.match(rows, /<img[\s\S]*fd-discover-shelf-dot[\s\S]*<div>/);
  assert.doesNotMatch(rows, /data-action=|fd-discover-book-action/);

  const mainScreen = sourceSection(
    discoverSource,
    "  function mainTabDiscover(",
    "  function discoverSourceLoginScreen(",
  );
  assert.match(mainScreen, /renderMainTabShell/);
  assert.match(mainScreen, /contentHtml:\s*discoverMainContent\(data,\s*currentRoute,\s*appState\)/);
});

test("canonical RSS keeps its top bar, source, article, reader, and Library subpage structure", () => {
  const rssSource = sourceSection(
    runtimeSource,
    "  function rssSourcesData(",
    "  function mainTabSettings(",
  );

  for (const selector of [
    "fd-rss-top-bar",
    "fd-rss-source-overview",
    "fd-rss-article-list",
    "fd-rss-article-row",
    "fd-rss-reader-page",
    "fd-rss-reader-inline-actions",
    "fd-rss-reader-bottom-actions",
  ]) {
    assert.match(rssSource, new RegExp(selector), `canonical RSS is missing .${selector}`);
  }

  assert.doesNotMatch(rssSource, /fd-d2-rss-/);
  assert.match(rssSource, /function rssLibraryScreen\([\s\S]*renderLibraryShell/);
  assert.match(
    rssSource,
    /if\s*\(currentRoute\s*!==\s*["']rss["']\)\s*\{\s*return rssLibraryScreen\(/,
    "every RSS route except the RSS tab root must render as a Library subpage",
  );
});

test("rss-refreshing remains a contract route but cannot render without an exact Figma binding", () => {
  assert.equal(routeContract.routes["rss-refreshing"]?.shell, "LibraryShell");
  const runtimeWindow = evaluateRuntimeForStructureTest();
  assert.throws(
    () => runtimeWindow.__renderRouteForStructureTest("rss-refreshing", {}, {}, {}),
    /UNCLASSIFIED_ROUTE_NO_FIGMA_VISUAL/,
  );
});

test("Discover sort selection stays inside the single admitted discover-sort page", () => {
  const runtimeWindow = evaluateRuntimeForStructureTest();
  for (const label of ["人气", "更新", "收藏", "完本", "字数"]) {
    assert.equal(
      runtimeWindow.__discoverSortRouteForStructureTest(label),
      "discover-sort",
      `${label} must remain in discover-sort`,
    );
    const html = runtimeWindow.__renderRouteForStructureTest(
      "discover-sort",
      {},
      {},
      { discoverFilterOpen: true, discoverSort: label },
    );
    assert.match(html, new RegExp(`<em>[^<]*${label}</em>`));
    assert.match(
      html,
      new RegExp(`<button class="is-active"[^>]*data-discover-sort-option="${label}"`),
      `discover-sort must render ${label} as the selected sort option`,
    );
  }

  const sortInteraction = sourceSection(
    runtimeSource,
    '    screenHost.querySelectorAll("[data-discover-sort-option]")',
    '    screenHost.querySelectorAll("[data-restore-scope]")',
  );
  assert.match(
    sortInteraction,
    /replaceTopRoute\(\s*discoverSortRoute\(/,
    "choosing a sort option must replace the stack top with the admitted discover-sort route",
  );
});

test("unbound RSS confirmation routes fail closed instead of fabricating modal overlays", () => {
  const runtimeWindow = evaluateRuntimeForStructureTest();
  const routes = [
    "rss-source-delete-confirm", "rss-source-login-clear", "rss-source-pin",
    "rss-source-disable", "rss-source-batch-disable", "rss-record-clear",
    "rss-rule-subscription-apply", "rss-favorite-add", "rss-favorite-remove",
    "rss-favorite-clear",
  ];
  for (const route of routes) {
    assert.throws(
      () => runtimeWindow.__renderRouteForStructureTest(route, {}, {}, {}),
      /UNCLASSIFIED_ROUTE_NO_FIGMA_VISUAL/,
      route,
    );
  }
});

test("RSS source and article rows expose stable context ids", () => {
  const runtimeWindow = evaluateRuntimeForStructureTest();
  const html = runtimeWindow.__renderRouteForStructureTest("rss", {}, {}, {});
  const sourceList = sourceSection(
    html,
    '<section class="fd-rss-source-overview-list"',
    "</section>",
  );
  const articleList = sourceSection(
    html,
    '<section class="fd-rss-article-list"',
    "</section>",
  );
  const sourceIds = [...sourceList.matchAll(/data-rss-source-id="([^"]+)"/g)].map((match) => match[1]);
  const articleIds = [...articleList.matchAll(/data-rss-article-id="([^"]+)"/g)].map((match) => match[1]);

  assert.equal(sourceIds.length, 4, "each source overview row must carry a source id");
  assert.equal(new Set(sourceIds).size, sourceIds.length, "source context ids must be unique");
  assert.equal(articleIds.length, 3, "each recent unread article row must carry an article id");
  assert.equal(new Set(articleIds).size, articleIds.length, "article context ids must be unique");
  assert.ok(sourceIds.every(Boolean), "source context ids must not be empty");
  assert.ok(articleIds.every(Boolean), "article context ids must not be empty");
});

test("RSS root consumes its bound filter state while unbound management pages fail closed", () => {
  const runtimeWindow = evaluateRuntimeForStructureTest();

  const groupedHome = runtimeWindow.__renderRouteForStructureTest(
    "rss",
    {},
    {},
    { rssGroupFilter: "社区" },
  );
  const groupedSources = sourceSection(
    groupedHome,
    '<section class="fd-rss-source-overview-list"',
    "</section>",
  );
  assert.match(groupedSources, /阅读器版本讨论/);
  assert.doesNotMatch(groupedSources, /GitHub Releases|书源维护公告|本地系统通知/);

  assert.throws(
    () => runtimeWindow.__renderRouteForStructureTest(
      "rss-subscription-management",
      {},
      {},
      { rssManageFilter: "暂停" },
    ),
    /UNCLASSIFIED_ROUTE_NO_FIGMA_VISUAL/,
  );
  assert.throws(
    () => runtimeWindow.__renderRouteForStructureTest(
      "rss-starred",
      {},
      {},
      { rssFavoriteFilter: "社区" },
    ),
    /UNCLASSIFIED_ROUTE_NO_FIGMA_VISUAL/,
  );
});

test("unbound D2-only RSS actions cannot leak back into canonical Discover or RSS", () => {
  const canonicalDiscoverAndRss = sourceSection(
    runtimeSource,
    "  function discoverContext(",
    "  function mainTabSettings(",
  );
  const d2Actions = dataActionNames(d2RssSource);
  const canonicalActions = dataActionNames(canonicalDiscoverAndRss);
  const leakedActions = [...d2Actions].filter((action) => canonicalActions.has(action));

  assert.ok(d2Actions.size > 0, "the retired D2 module must expose a meaningful action sentinel set");
  assert.deepEqual(
    leakedActions,
    [],
    "canonical Discover/RSS must use routed or explicitly bound controls, not D2-only data-action hooks",
  );
});
