import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

function cssRule(source, selector) {
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(",").map((item) => item.trim());
    if (selectors.includes(selector)) return match[2];
  }
  assert.fail(`missing CSS rule: ${selector}`);
}

function declaration(rule, property) {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = rule.match(new RegExp(`(?:^|;)\\s*${escapedProperty}\\s*:\\s*([^;]+)`, "m"));
  return match?.[1]?.trim() || "";
}

function cssRuleMatching(source, predicate, description) {
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(",").map((item) => item.trim());
    const selector = selectors.find(predicate);
    if (selector) return { selector, rule: match[2] };
  }
  assert.fail(`missing CSS rule: ${description}`);
}

function subtractionCount(value) {
  return [...String(value).matchAll(/-\s*(?=(?:\d|var\(|calc\())/g)].length;
}

function numericPixelReserve(value) {
  return [...String(value).matchAll(/-\s*(\d+(?:\.\d+)?)px/g)]
    .reduce((total, match) => total + Number(match[1]), 0);
}

const runtimeSource = readDemoFile("render-runtime.js");
const shellKitSource = readDemoFile("shared-shell-kit/kit.js");
const bookshelfRendererSource = readDemoFile("renderers/d2-bookshelf-discover-renderers.js");
const settingsRendererSource = readDemoFile("renderers/d2-settings-sync-renderers.js");
const foundationCss = readDemoFile("styles/00-foundation.css");
const shellCss = readDemoFile("styles/01-shell-layout.css");
const settingsSourceCss = readDemoFile("styles/04-settings-source.css");
const flowAdaptiveCss = readDemoFile("styles/05-flow-adaptive.css");
const responsiveCss = readDemoFile("styles/06-responsive.css");
const settingsViewportCss = [foundationCss, shellCss, settingsSourceCss, flowAdaptiveCss, responsiveCss].join("\n");

const settingsHomeEntryRoutes = [
  "settings-general",
  "settings-developer",
  "source-management",
  "sync-backup",
];

test("settings home stays inside the canonical MainTabShell viewport", () => {
  const settingsHome = sourceSection(
    runtimeSource,
    "  function mainTabSettings(",
    "  function bookSearchScreen(",
  );
  const mainTabShell = sourceSection(
    shellKitSource,
    "  function renderMainTabShell(",
    "  function renderLibraryShell(",
  );

  assert.match(settingsHome, /renderMainTabShell/);
  assert.match(settingsHome, /phoneShellClasses\(["']fd-main-tab-phone["']\)/);
  assert.match(settingsHome, /contentClass:\s*["']fd-phone-content fd-settings-main-content["']/);
  assert.match(settingsHome, /<section class=["']fd-setting-section["']/);
  assert.match(settingsHome, /<article class=["']fd-setting-row["']/);
  assert.ok(
    mainTabShell.indexOf('data-slot="contentRegion"') < mainTabShell.indexOf("mainNav("),
    "settings content must remain the shell content region and the bottom nav must remain its sibling",
  );
});

test("short-screen settings content owns a bounded vertical scroll viewport", () => {
  const contentRule = cssRule(
    shellCss,
    ".fd-main-tab-phone .fd-settings-main-content",
  );

  const maxHeight = declaration(contentRule, "max-height");
  assert.match(maxHeight, /^calc\(/);
  assert.match(maxHeight, /100%\s*-\s*48px/);
  assert.match(maxHeight, /var\(--fd-ds-size-top-bar-height\)/);
  assert.match(maxHeight, /var\(--fd-ds-size-main-nav-height\)/);
  assert.match(maxHeight, /var\(--fd-ds-safe-area-bottom\)/);
  assert.match(maxHeight, /12px/);
  assert.equal(
    declaration(contentRule, "min-height"),
    "0",
    "the settings content viewport must be allowed to shrink below its intrinsic list height",
  );
  assert.equal(declaration(contentRule, "padding-bottom"), "12px");

  const sharedMainContentRule = cssRule(foundationCss, ".fd-main-tab-phone .fd-phone-content");
  assert.equal(declaration(sharedMainContentRule, "overflow-y"), "auto");
  assert.equal(declaration(sharedMainContentRule, "overscroll-behavior"), "contain");

  const sharedContentRule = cssRule(foundationCss, ".fd-phone-content");
  const padding = declaration(sharedContentRule, "padding");
  assert.match(padding, /var\(--fd-ds-size-main-nav-height\)/);
  assert.match(padding, /var\(--fd-ds-safe-area-bottom\)/);
});

test("settings bottom navigation is anchored independently of list height", () => {
  const navRule = cssRule(shellCss, ".fd-main-nav");
  const phoneRule = cssRule(foundationCss, ".fd-phone");

  assert.equal(declaration(phoneRule, "position"), "relative");
  assert.equal(declaration(phoneRule, "overflow"), "hidden");
  assert.equal(declaration(navRule, "position"), "absolute");
  assert.equal(declaration(navRule, "bottom"), "var(--fd-ds-safe-area-bottom)");
  assert.match(declaration(navRule, "z-index"), /--fd-ds-z-main-nav/);
});

test("four admitted settings-home entries render inside the shared bounded content region", () => {
  const settingsHome = sourceSection(
    runtimeSource,
    "  function mainTabSettings(",
    "  function bookSearchScreen(",
  );
  const canonicalSettingsScreen = sourceSection(
    runtimeSource,
    "  function settingsScreen(",
    "  function restoreStepBadge(",
  );
  const d2SettingsShell = sourceSection(
    settingsRendererSource,
    "  function d2SettingsShell(",
    "  // ===========================================================================\n  // 1. globalSettingsV2",
  );
  const d2IntegrationMap = sourceSection(
    settingsRendererSource,
    "  var INTEGRATION_MAP = {",
    "  // ===========================================================================\n  // 路由分发主入口",
  );
  for (const route of settingsHomeEntryRoutes) {
    assert.match(settingsHome, new RegExp(`route:\\s*["']${route}["']`), `${route} must remain a settings-home entry`);
  }
  assert.doesNotMatch(settingsHome, /route:\s*["'](?:bookshelf-search-settings|about-feedback)["']/);

  for (const route of ["settings-general", "source-management", "sync-backup"]) {
    assert.match(d2IntegrationMap, new RegExp(`["']${route}["']:\\s*["'][^"']+["']`), `${route} must be owned by the shared D2 SettingsShell renderer`);
  }
  assert.doesNotMatch(d2IntegrationMap, /["'](?:about|about-feedback|about-version)["']\s*:/);

  assert.match(d2SettingsShell, /contentClass:\s*["']fd-phone-content fd-settings-content fd-d2-settings-content["']/);
  // R2a: d2SettingsShell 现在支持 bottomActionHtml / sheetHtml / dialogHtml / trailingHtml
  // 作为 option（source-management 合法使用 bottom action bar：批量管理 + 新增书源）。
  // 约束：必须默认空字符串，避免无 action 的页面（settings-general / sync-backup）
  // 预留 phantom fixed action row。
  assert.match(d2SettingsShell, /bottomActionHtml:\s*options\.bottomActionHtml\s*\|\|\s*["']["']/, "d2SettingsShell bottomActionHtml defaults to empty string (no phantom action row for no-action entries)");
  assert.doesNotMatch(
    bookshelfRendererSource,
    /bookshelfSearchSettingsV2|bookBatchManagementV2/,
    "withdrawn Bookshelf settings and batch page renderers must be physically absent",
  );
  assert.match(canonicalSettingsScreen, /contentClass:\s*["']fd-phone-content fd-settings-content["']/);
  assert.match(runtimeSource, /["']settings-developer["']:\s*\{\s*title:\s*["']开发模式["']/);
});

test("secondary settings pages without fixed actions cannot extend below the SettingsShell viewport", () => {
  const boundedRule = cssRule(settingsViewportCss, ".fd-settings-phone .fd-settings-content");
  const maxHeight = declaration(boundedRule, "max-height");

  assert.match(maxHeight, /^calc\(/);
  assert.match(maxHeight, /100%\s*-\s*48px/);
  assert.match(maxHeight, /var\(--fd-ds-size-top-bar-height\)/);
  assert.match(maxHeight, /var\(--fd-ds-safe-area-bottom\)/);
  assert.match(maxHeight, /12px/);
  assert.equal(declaration(boundedRule, "min-height"), "0");
  assert.equal(declaration(boundedRule, "overflow-y"), "auto");
  assert.equal(
    declaration(boundedRule, "padding-bottom"),
    "12px",
    "no-action SettingsShell pages must not keep the old 112px bottom padding or render beneath the frame",
  );
});

test("SettingsShell pages with a non-empty fixed action host reserve additional vertical space", () => {
  const sourceShell = sourceSection(
    runtimeSource,
    "  function sourceShell(",
    "  function sourceBottomActions(",
  );
  assert.match(sourceShell, /bottomActionHostClass:\s*["']fd-bottom-action-host fd-source-control-host["']/);
  assert.match(sourceShell, /bottomActionHtml:\s*options\?\.bottomActionHtml\s*\|\|\s*["']["']/);

  const baseRule = cssRule(settingsViewportCss, ".fd-settings-phone .fd-settings-content");
  const fixedActionRule = cssRuleMatching(
    settingsViewportCss,
    (selector) => selector.includes(".fd-settings-phone")
      && selector.includes(".fd-settings-content")
      && (
        selector.includes(":has(.fd-bottom-action-host:not(:empty))")
        || selector.includes(".has-bottom-action")
        || selector.includes(".fd-source-demo-phone")
      ),
    "fixed-action SettingsShell content constraint",
  );
  const baseMaxHeight = declaration(baseRule, "max-height");
  const fixedMaxHeight = declaration(fixedActionRule.rule, "max-height");

  assert.match(fixedMaxHeight, /^calc\(/);
  assert.match(fixedMaxHeight, /100%/);
  assert.match(fixedMaxHeight, /var\(--fd-ds-safe-area-bottom\)/);
  assert.ok(
    /(?:bottom|action)/i.test(fixedMaxHeight)
      || subtractionCount(fixedMaxHeight) > subtractionCount(baseMaxHeight)
      || numericPixelReserve(fixedMaxHeight) > numericPixelReserve(baseMaxHeight),
    `fixed action content must reserve more height than the no-action viewport; got ${fixedMaxHeight}`,
  );
  assert.equal(declaration(fixedActionRule.rule, "min-height"), "0");
  assert.equal(declaration(fixedActionRule.rule, "overflow-y"), "auto");
});

test("landscape restore and source utility routes keep their high-specificity header and action budgets", () => {
  const landscapeRouteSelectors = ['[data-route-layout="wide-workspace"]'];

  for (const routeSelector of landscapeRouteSelectors) {
    const baseConstraint = cssRuleMatching(
      settingsViewportCss,
      (selector) => selector.includes('[data-demo-mode="regular"]')
        && selector.includes('[data-orientation="landscape"]')
        && selector.includes(routeSelector)
        && selector.includes(".fd-settings-phone")
        && selector.endsWith(".fd-settings-content")
        && !selector.includes(":has(.fd-bottom-action-host:not(:empty))")
        && !selector.includes(".has-bottom-action"),
      `landscape SettingsShell constraint for ${routeSelector}`,
    );
    const maxHeight = declaration(baseConstraint.rule, "max-height");

    assert.match(maxHeight, /^calc\(/);
    assert.match(maxHeight, /100%\s*-\s*80px/, `${routeSelector} must deduct the compact 30px status and 50px back header`);
    assert.match(maxHeight, /var\(--fd-ds-safe-area-bottom\)/, `${routeSelector} must stay above the landscape safe area`);
    assert.match(maxHeight, /12px/, `${routeSelector} must preserve the 12px viewport gap`);
    assert.doesNotMatch(maxHeight, /--fd-settings-action-row-height/, "the no-action landscape constraint must not reserve a phantom action row");
    assert.equal(declaration(baseConstraint.rule, "min-height"), "0");
    assert.equal(declaration(baseConstraint.rule, "overflow-y"), "auto");
  }

  for (const routeSelector of landscapeRouteSelectors) {
    const fixedActionConstraint = cssRuleMatching(
      settingsViewportCss,
      (selector) => selector.includes('[data-demo-mode="regular"]')
        && selector.includes('[data-orientation="landscape"]')
        && selector.includes(routeSelector)
        && selector.includes(".fd-settings-phone")
        && selector.includes(".fd-settings-content")
        && (
          selector.includes(":has(.fd-bottom-action-host:not(:empty))")
          || selector.includes(".has-bottom-action")
        ),
      `landscape fixed-action SettingsShell constraint for ${routeSelector}`,
    );
    const maxHeight = declaration(fixedActionConstraint.rule, "max-height");

    assert.match(maxHeight, /^calc\(/);
    assert.match(maxHeight, /100%\s*-\s*80px/);
    assert.match(maxHeight, /var\(--fd-settings-action-row-height\)/);
    assert.match(maxHeight, /var\(--fd-ds-safe-area-bottom\)/);
    assert.match(maxHeight, /12px/);
    assert.equal(declaration(fixedActionConstraint.rule, "min-height"), "0");
    assert.equal(declaration(fixedActionConstraint.rule, "overflow-y"), "auto");
  }
});

test("source-debug-content-log keeps its three fixed actions in one explicit row", () => {
  const contentLogScreen = sourceSection(
    runtimeSource,
    "  function sourceDebugContentLogScreen(",
    "  function sourceEditDebugScreen(",
  );
  const actionLabels = [...contentLogScreen.matchAll(/\{\s*label:\s*["']([^"']+)["']/g)].map((match) => match[1]);

  assert.deepEqual(actionLabels, ["复制日志", "回到解析", "回到编辑"]);
  assert.match(contentLogScreen, /bottomActionHtml:\s*sourceBottomActions\(/);

  const threeColumnRule = cssRuleMatching(
    settingsViewportCss,
    (selector) => selector.includes(".fd-source-bottom-bar")
      && (
        selector.includes('[data-current-route="source-debug-content-log"]')
        || selector.includes(".fd-source-debug-log-controls")
      ),
    "source-debug-content-log three-column bottom action row",
  );
  const columns = declaration(threeColumnRule.rule, "grid-template-columns");

  assert.match(columns, /^repeat\(3,\s*minmax\(0,\s*1fr\)\)$/);
  assert.doesNotMatch(columns, /repeat\(2/);
});

test("page roots and settings surfaces cannot reintroduce decorative shadows", () => {
  const phoneRootRule = cssRule(foundationCss, ".fd-phone");
  const readerRootRule = cssRule(foundationCss, ".fd-reader-frame");
  const settingsSurfaceRule = cssRule(foundationCss, ".fd-setting-section");

  assert.equal(
    declaration(phoneRootRule, "box-shadow"),
    "none",
    "application page roots must not render the elevated overlay shadow",
  );
  assert.equal(
    declaration(readerRootRule, "box-shadow"),
    "none",
    "reader page roots must not render the elevated overlay shadow",
  );
  assert.equal(
    declaration(settingsSurfaceRule, "box-shadow"),
    "none",
    "settings sections must use border and spacing instead of a surface shadow",
  );

  assert.match(foundationCss, /--fd-shadow-overlay:\s*var\(--fd-ds-shadow-elevated\)/);
  assert.match(foundationCss, /--fd-shadow-transient:\s*var\(--fd-ds-shadow-soft\)/);
  assert.match(foundationCss, /--fd-shadow-media:\s*var\(--fd-ds-shadow-soft\)/);
  assert.match(foundationCss, /--fd-shadow-floating-control:\s*var\(--fd-ds-shadow-elevated\)/);
  assert.doesNotMatch(foundationCss, /--fd-shadow\s*:|--fd-soft-shadow\s*:/);
});
