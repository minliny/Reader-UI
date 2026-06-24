#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (error) {
    const message = [
      "Playwright is required to validate frontend input pages.",
      "Run with a Node environment that has playwright installed, or set NODE_PATH to the bundled runtime modules.",
      `Original error: ${error.message}`
    ].join("\n");
    throw new Error(message);
  }
}

function assert(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const shellSlots = {
  AssetLibraryShell: ["foundations", "screenAssets", "iconAssets", "bookCoverAssets", "missingSupplements", "usageRules"],
  ComponentLibraryShell: ["foundations", "appShell", "basicControls", "cardsRows", "sheetsPanels", "states"],
  MainTabShell: ["appFrame", "statusBar", "appTopBar", "contentRegion", "mainNav", "stateHost"],
  LibraryShell: ["stackFrame", "backTopBar", "contentRegion", "bottomActionHost", "sheetHost", "dialogHost", "stateHost"],
  ReaderShell: ["readerFrame", "readingSurface", "readerOverlayHost", "readerModuleNav", "bottomSheetHost", "readerStateHost"],
  SettingsShell: ["settingsFrame", "backTopBar", "settingsContent", "settingSection", "toastHost", "dialogHost", "settingsStateHost"],
  FlowShell: ["flowFrame", "stepRegion", "comparisonRegion", "resultRegion", "stateHost"]
};

const pageRoles = new Set([
  "asset-library",
  "component-library",
  "main-tab-root",
  "library-stack",
  "reader-flow",
  "settings-stack",
  "landscape-flow"
]);

const stateModelTypes = new Set(["asset-library", "component-library", "preview", "state-matrix"]);

function validateShellMetadata(target, failures) {
  assert(Boolean(shellSlots[target.shellName]), `${target.name} has invalid shellName`, failures);
  assert(pageRoles.has(target.pageRole), `${target.name} has invalid pageRole`, failures);
  assert(Array.isArray(target.slots) && target.slots.length > 0, `${target.name} has no slots`, failures);
  assert(Boolean(target.stateModel), `${target.name} has no stateModel`, failures);

  if (target.stateModel) {
    assert(
      stateModelTypes.has(target.stateModel.type),
      `${target.name} has invalid stateModel.type`,
      failures
    );
    if (target.stateModel.type === "state-matrix") {
      assert(
        typeof target.stateModel.expectedStateCards === "number",
        `${target.name} state matrix has no expectedStateCards metadata`,
        failures
      );
    }
  }

  const requiredSlots = shellSlots[target.shellName] || [];
  const slots = new Set(target.slots || []);
  for (const slot of requiredSlots) {
    assert(slots.has(slot), `${target.name} missing ${target.shellName} slot ${slot}`, failures);
  }
}

async function validateTarget(browser, repoRoot, target) {
  const failures = [];
  const failedRequests = [];
  const consoleErrors = [];
  validateShellMetadata(target, failures);
  const page = await browser.newPage({
    viewport: target.viewport,
    deviceScaleFactor: 1
  });

  page.on("requestfailed", (request) => {
    failedRequests.push({
      url: request.url(),
      failure: request.failure() ? request.failure().errorText : ""
    });
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  const htmlPath = path.join(repoRoot, target.html);
  const screenshotPath = path.join(repoRoot, target.screenshot);
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });

  await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
  await page.waitForSelector(target.selector, { timeout: 5000 });
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const actual = await page.evaluate((targetInPage) => {
    const frame = document.querySelector(targetInPage.selector);
    const frameRect = frame ? frame.getBoundingClientRect() : null;
    const images = Array.from(document.images);
    const requiredTextPresent = targetInPage.requiredText.every((text) =>
      document.body.innerText.includes(text)
    );

    return {
      title: document.title,
      bodyWidth: document.body.scrollWidth,
      bodyHeight: document.body.scrollHeight,
      frame: frameRect
        ? {
            width: Math.round(frameRect.width),
            height: Math.round(frameRect.height)
          }
        : null,
      requiredTextPresent,
      rendererLoaded: Boolean(window[targetInPage.rendererGlobal]),
      shellName: targetInPage.shellName,
      pageRole: targetInPage.pageRole,
      slots: targetInPage.slots,
      stateModel: targetInPage.stateModel,
      stateCardCount: document.querySelectorAll(".bs-state-card, .rc-state-card, .st-state-card, .se-state-card, .ss-state-card, .ds-state-card, .rs-state-card, .bd-state-card, .dr-state-card, .sf-state-card, .ba-state-card, .gm-state-card, .li-state-card, .tb-state-card, .ra-state-card, .al-state-card, .rset-state-card, .ap-state-card, .cs-state-card, .cr-state-card, .re-state-card, .ir-state-card, .sw-state-card, .gs-state-card, .bks-state-card, .sk-state-card").length,
      imageCount: images.length,
      missingImages: images.filter((image) => !image.complete || image.naturalWidth === 0).length,
      cssLinks: Array.from(document.styleSheets).filter((sheet) => sheet.href).length,
      mainTabDom: targetInPage.shellName === "MainTabShell"
        ? {
            slotCounts: {
              appFrame: document.querySelectorAll('.mt-app-frame[data-slot="appFrame"]').length,
              statusBar: document.querySelectorAll('.mt-status-bar[data-slot="statusBar"]').length,
              appTopBar: document.querySelectorAll('.mt-app-top-bar[data-slot="appTopBar"]').length,
              contentRegion: document.querySelectorAll('.mt-content-region[data-slot="contentRegion"]').length,
              mainNav: document.querySelectorAll('.mt-main-nav[data-slot="mainNav"]').length,
              stateHost: document.querySelectorAll('[data-slot="stateHost"]').length
            },
            navs: Array.from(document.querySelectorAll(".mt-main-nav")).map((nav) => {
              const items = Array.from(nav.querySelectorAll(".mt-main-nav-item"));
              return {
                itemCount: items.length,
                labels: items.map((item) => item.innerText.trim()),
                types: items.map((item) => item.getAttribute("data-nav-type")),
                activeCount: items.filter((item) => item.classList.contains("is-active")).length,
                iconShellCount: nav.querySelectorAll(".mt-main-nav-icon-shell").length
              };
            })
          }
        : null,
      libraryShellDom: targetInPage.shellName === "LibraryShell"
        ? {
            usesKit: document.querySelectorAll('.lk-stack-frame[data-shell="LibraryShell"], .lk-state-workbench[data-shell="LibraryShell"]').length > 0,
            slotCounts: {
              stackFrame: document.querySelectorAll('.lk-stack-frame[data-slot="stackFrame"]').length,
              backTopBar: document.querySelectorAll('.lk-back-top-bar[data-slot="backTopBar"]').length,
              contentRegion: document.querySelectorAll('.lk-content-region[data-slot="contentRegion"]').length,
              bottomActionHost: document.querySelectorAll('.lk-bottom-action-host[data-slot="bottomActionHost"]').length,
              sheetHost: document.querySelectorAll('.lk-sheet-host[data-slot="sheetHost"]').length,
              dialogHost: document.querySelectorAll('.lk-dialog-host[data-slot="dialogHost"]').length,
              stateHost: document.querySelectorAll('[data-slot="stateHost"]').length
            }
          }
        : null,
      readerShellDom: targetInPage.shellName === "ReaderShell"
        ? {
            usesKit: document.querySelectorAll('.rsk-reader-frame[data-shell="ReaderShell"]').length > 0,
            slotCounts: {
              readerFrame: document.querySelectorAll('.rsk-reader-frame[data-slot="readerFrame"]').length,
              readingSurface: document.querySelectorAll('[data-slot="readingSurface"]').length,
              readerOverlayHost: document.querySelectorAll('[data-slot="readerOverlayHost"]').length,
              readerModuleNav: document.querySelectorAll('[data-slot="readerModuleNav"]').length,
              bottomSheetHost: document.querySelectorAll('[data-slot="bottomSheetHost"]').length,
              readerStateHost: document.querySelectorAll('[data-slot="readerStateHost"]').length
            }
          }
        : null,
      flowShellDom: targetInPage.shellName === "FlowShell"
        ? {
            usesKit: document.querySelectorAll('.rsk-flow-frame[data-shell="FlowShell"]').length > 0,
            slotCounts: {
              flowFrame: document.querySelectorAll('.rsk-flow-frame[data-slot="flowFrame"]').length,
              stepRegion: document.querySelectorAll('[data-slot="stepRegion"]').length,
              comparisonRegion: document.querySelectorAll('[data-slot="comparisonRegion"]').length,
              resultRegion: document.querySelectorAll('[data-slot="resultRegion"]').length,
              stateHost: document.querySelectorAll('[data-slot="stateHost"]').length
            }
          }
        : null,
      settingsShellDom: targetInPage.shellName === "SettingsShell"
        ? {
            usesKit: document.querySelectorAll('.sk-page-frame[data-shell="SettingsShell"]').length > 0,
            slotCounts: {
              settingsFrame: document.querySelectorAll('.sk-page-frame[data-slot="settingsFrame"]').length,
              backTopBar: document.querySelectorAll('[data-slot="backTopBar"]').length,
              settingsContent: document.querySelectorAll('[data-slot="settingsContent"]').length,
              settingSection: document.querySelectorAll('[data-slot="settingSection"]').length,
              toastHost: document.querySelectorAll('[data-slot="toastHost"]').length,
              dialogHost: document.querySelectorAll('[data-slot="dialogHost"]').length,
              settingsStateHost: document.querySelectorAll('[data-slot="settingsStateHost"]').length
            }
          }
        : null,
      expectedDomCount: targetInPage.expectedDomCount
        ? document.querySelectorAll(targetInPage.expectedDomCount.selector).length
        : null
    };
  }, target);

  assert(actual.rendererLoaded, `${target.rendererGlobal} was not loaded`, failures);
  assert(actual.requiredTextPresent, "required text was not fully rendered", failures);
  assert(failedRequests.length === 0, `${failedRequests.length} request(s) failed`, failures);
  assert(consoleErrors.length === 0, `${consoleErrors.length} console error(s) found`, failures);

  if (target.expectedFrame) {
    assert(Boolean(actual.frame), "expected frame was not found", failures);
    if (actual.frame) {
      assert(
        actual.frame.width === target.expectedFrame.width,
        `frame width ${actual.frame.width} !== ${target.expectedFrame.width}`,
        failures
      );
      assert(
        actual.frame.height === target.expectedFrame.height,
        `frame height ${actual.frame.height} !== ${target.expectedFrame.height}`,
        failures
      );
    }
  }

  if (typeof target.expectedStateCards === "number") {
    assert(
      actual.stateCardCount === target.expectedStateCards,
      `state card count ${actual.stateCardCount} !== ${target.expectedStateCards}`,
      failures
    );
  }

  if (target.expectedImages) {
    assert(
      actual.imageCount >= target.expectedImages.min,
      `image count ${actual.imageCount} < ${target.expectedImages.min}`,
      failures
    );
    assert(
      actual.missingImages === target.expectedImages.missing,
      `missing image count ${actual.missingImages} !== ${target.expectedImages.missing}`,
      failures
    );
  }

  if (target.expectedDomCount) {
    assert(
      actual.expectedDomCount >= target.expectedDomCount.min,
      `${target.expectedDomCount.selector} count ${actual.expectedDomCount} < ${target.expectedDomCount.min}`,
      failures
    );
  }

  if (target.shellName === "MainTabShell") {
    const mainTabDom = actual.mainTabDom || {};
    const slotCounts = mainTabDom.slotCounts || {};
    for (const slot of shellSlots.MainTabShell) {
      assert(slotCounts[slot] > 0, `${target.name} missing MainTabShell DOM slot ${slot}`, failures);
    }

    assert((mainTabDom.navs || []).length > 0, `${target.name} has no MainTabShell nav`, failures);
    for (const nav of mainTabDom.navs || []) {
      assert(nav.itemCount === 4, `${target.name} MainTabShell nav item count ${nav.itemCount} !== 4`, failures);
      assert(
        nav.types.join("|") === "bookshelf|discover|rss|settings",
        `${target.name} MainTabShell nav types are not fixed`,
        failures
      );
      assert(
        nav.labels.join("|") === "书架|发现|RSS|设置",
        `${target.name} MainTabShell nav labels are not fixed`,
        failures
      );
      assert(nav.activeCount === 1, `${target.name} MainTabShell active nav count ${nav.activeCount} !== 1`, failures);
      assert(nav.iconShellCount === 4, `${target.name} MainTabShell icon shell count ${nav.iconShellCount} !== 4`, failures);
    }
  }

  if (target.shellName === "LibraryShell" && actual.libraryShellDom && actual.libraryShellDom.usesKit) {
    const slotCounts = actual.libraryShellDom.slotCounts || {};
    for (const slot of shellSlots.LibraryShell) {
      assert(slotCounts[slot] > 0, `${target.name} missing LibraryShell DOM slot ${slot}`, failures);
    }
  }

  if (target.shellName === "ReaderShell") {
    const readerShellDom = actual.readerShellDom || {};
    assert(readerShellDom.usesKit, `${target.name} does not use ReaderShellKit`, failures);
    const slotCounts = readerShellDom.slotCounts || {};
    for (const slot of shellSlots.ReaderShell) {
      assert(slotCounts[slot] > 0, `${target.name} missing ReaderShell DOM slot ${slot}`, failures);
    }
  }

  if (target.shellName === "FlowShell") {
    const flowShellDom = actual.flowShellDom || {};
    assert(flowShellDom.usesKit, `${target.name} does not use FlowShell kit`, failures);
    const slotCounts = flowShellDom.slotCounts || {};
    for (const slot of shellSlots.FlowShell) {
      assert(slotCounts[slot] > 0, `${target.name} missing FlowShell DOM slot ${slot}`, failures);
    }
  }

  if (target.shellName === "SettingsShell") {
    const settingsShellDom = actual.settingsShellDom || {};
    assert(settingsShellDom.usesKit, `${target.name} does not use SettingsPageKit`, failures);
    const slotCounts = settingsShellDom.slotCounts || {};
    for (const slot of shellSlots.SettingsShell) {
      assert(slotCounts[slot] > 0, `${target.name} missing SettingsShell DOM slot ${slot}`, failures);
    }
  }

  await page.close();

  return {
    name: target.name,
    html: target.html,
    screenshot: screenshotPath,
    passed: failures.length === 0,
    failures,
    failedRequests,
    consoleErrors,
    actual
  };
}

async function main() {
  const repoRoot = path.resolve(__dirname, "../../..");
  const manifestPath = path.join(__dirname, "manifest.json");
  const outputPath = path.join(repoRoot, "docs/ui-design/frontend-input-design-draft-validation.json");
  const manifest = readJson(manifestPath);
  const { chromium } = loadPlaywright();

  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const target of manifest.targets) {
      results.push(await validateTarget(browser, repoRoot, target));
    }
  } finally {
    await browser.close();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    manifest: path.relative(repoRoot, manifestPath),
    passed: results.every((result) => result.passed),
    results
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  if (!report.passed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
