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

function pngDimensions(buffer) {
  const isPng = buffer.length >= 24
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47;
  if (!isPng) {
    return null;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

const frontendDemoAdaptiveViewports = [
  {
    name: "compact-portrait",
    route: "bookshelf",
    viewport: { width: 320, height: 568 },
    expected: { widthClass: "compact", heightClass: "short", orientation: "portrait", viewportClass: "compact-portrait" },
    maxFrame: { width: 320, height: 568 }
  },
  {
    name: "standard-portrait",
    route: "bookshelf",
    viewport: { width: 390, height: 844 },
    expected: { widthClass: "standard", heightClass: "regular", orientation: "portrait", viewportClass: "standard-portrait" },
    maxFrame: { width: 390, height: 844 }
  },
  {
    name: "large-phone-portrait",
    route: "reader",
    viewport: { width: 430, height: 932 },
    expected: { widthClass: "standard", heightClass: "regular", orientation: "portrait", viewportClass: "standard-portrait" },
    maxFrame: { width: 390, height: 844 }
  },
  {
    name: "compact-landscape",
    route: "source-switch",
    viewport: { width: 844, height: 390 },
    expected: { widthClass: "tablet", heightClass: "compact", orientation: "landscape", viewportClass: "compact-landscape" },
    maxFrame: { width: 844, height: 390 },
    minFrameWidth: 800,
    wideFlow: true
  },
  {
    name: "reader-compact-landscape",
    route: "reader",
    viewport: { width: 844, height: 390 },
    expected: { widthClass: "tablet", heightClass: "compact", orientation: "landscape", viewportClass: "compact-landscape" },
    maxFrame: { width: 844, height: 390 },
    minFrameWidth: 800,
    readerAvoidance: true,
    wideReader: true
  },
  {
    name: "keyboard-reduced-height",
    route: "book-search",
    viewport: { width: 844, height: 390 },
    expected: { widthClass: "tablet", heightClass: "compact", orientation: "landscape", viewportClass: "compact-landscape" },
    maxFrame: { width: 390, height: 390 },
    keyboardReducedHeight: true
  },
  {
    name: "expanded-width",
    route: "settings",
    viewport: { width: 600, height: 960 },
    expected: { widthClass: "expanded", heightClass: "regular", orientation: "portrait", viewportClass: "expanded-width" },
    maxFrame: { width: 560, height: 900 },
    minFrameWidth: 520
  },
  {
    name: "tablet-expanded",
    route: "reader",
    viewport: { width: 840, height: 1180 },
    expected: { widthClass: "tablet", heightClass: "regular", orientation: "portrait", viewportClass: "tablet-expanded" },
    maxFrame: { width: 760, height: 960 },
    minFrameWidth: 720,
    readerAvoidance: true,
    wideReader: true
  },
  {
    name: "main-tab-tablet-expanded",
    route: "bookshelf",
    viewport: { width: 840, height: 1180 },
    expected: { widthClass: "tablet", heightClass: "regular", orientation: "portrait", viewportClass: "tablet-expanded" },
    maxFrame: { width: 760, height: 960 },
    minFrameWidth: 720,
    sideMainNav: true
  },
  {
    name: "library-tablet-expanded",
    route: "book-detail",
    viewport: { width: 840, height: 1180 },
    expected: { widthClass: "tablet", heightClass: "regular", orientation: "portrait", viewportClass: "tablet-expanded" },
    maxFrame: { width: 760, height: 960 },
    minFrameWidth: 720
  },
  {
    name: "settings-shell-tablet-expanded",
    route: "settings-general",
    viewport: { width: 840, height: 1180 },
    expected: { widthClass: "tablet", heightClass: "regular", orientation: "portrait", viewportClass: "tablet-expanded" },
    maxFrame: { width: 760, height: 960 },
    minFrameWidth: 720
  },
  {
    name: "flow-tablet-expanded",
    route: "source-switch",
    viewport: { width: 840, height: 1180 },
    expected: { widthClass: "tablet", heightClass: "regular", orientation: "portrait", viewportClass: "tablet-expanded" },
    maxFrame: { width: 760, height: 960 },
    minFrameWidth: 720,
    wideFlow: true
  }
];

const frontendDemoTextStressTargets = [
  { name: "main-tab-text-scale", route: "bookshelf", viewport: { width: 390, height: 844 } },
  { name: "library-text-scale", route: "book-detail", viewport: { width: 390, height: 844 } },
  { name: "reader-text-scale", route: "reader", viewport: { width: 390, height: 844 } },
  { name: "flow-text-scale", route: "source-switch", viewport: { width: 390, height: 844 } },
  { name: "settings-text-scale", route: "settings", viewport: { width: 390, height: 844 } }
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function uniqueExistingCandidates(candidates) {
  const seen = new Set();
  return candidates
    .filter(Boolean)
    .map((candidate) => path.resolve(candidate))
    .filter((candidate) => {
      if (seen.has(candidate)) return false;
      seen.add(candidate);
      return fs.existsSync(candidate);
    });
}

function resolveComposeSourceStatus(repoRoot, composeSources) {
  const entries = Object.entries(composeSources || {});
  const candidates = uniqueExistingCandidates([
    process.env.READER_ANDROID_ROOT,
    path.join(repoRoot, "..", "Reader for Android"),
    "/Users/minliny/Documents/Reader for Android",
    repoRoot
  ]);
  const candidateStatuses = candidates.map((root) => {
    const sources = entries.map(([sourceName, relativePath]) => {
      const absolutePath = path.join(root, relativePath);
      return {
        sourceName,
        relativePath,
        exists: fs.existsSync(absolutePath)
      };
    });
    return {
      root,
      sources,
      foundCount: sources.filter((source) => source.exists).length
    };
  });
  const selected = candidateStatuses.find((candidate) => candidate.foundCount > 0) ||
    candidateStatuses[0] || { root: repoRoot, sources: [], foundCount: 0 };
  const missing = selected.sources.filter((source) => !source.exists);
  const mode = selected.foundCount > 0 ? "validated" : "skipped";
  const reason = mode === "skipped"
    ? "Compose token source files are not part of this UI repo snapshot; set READER_TOKEN_CONTRACT_REQUIRE_COMPOSE=1 to require host-app source validation."
    : "";
  return {
    mode,
    reason,
    root: selected.root,
    found: selected.sources.filter((source) => source.exists),
    missing,
    candidates: candidateStatuses.map((candidate) => ({
      root: candidate.root,
      foundCount: candidate.foundCount
    }))
  };
}

function walkFiles(dir, fileName, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(absolutePath, fileName, results);
    } else if (entry.name === fileName) {
      results.push(absolutePath);
    }
  }
  return results;
}

function discoverComponentReferencePages(repoRoot) {
  const uiDesignRoot = path.join(repoRoot, "docs/ui-design");
  return walkFiles(uiDesignRoot, "components.html")
    .map((filePath) => path.relative(repoRoot, filePath).split(path.sep).join("/"))
    .filter((filePath) => filePath.endsWith("/frontend-input/components.html"))
    .filter((filePath) => !filePath.startsWith("docs/ui-design/frontend-input/"))
    .sort();
}

function discoverUiDesignScreenDirs(repoRoot) {
  const uiDesignRoot = path.join(repoRoot, "docs/ui-design");
  return walkFiles(uiDesignRoot, "UI设计图.png")
    .map((filePath) => path.relative(uiDesignRoot, path.dirname(filePath)).split(path.sep).join("/"))
    .sort();
}

function flattenTokenEntries(tokens, groupName = "", results = []) {
  for (const [name, value] of Object.entries(tokens || {})) {
    const tokenName = groupName ? `${groupName}.${name}` : name;
    if (value && typeof value === "object" && value.css && value.cssValue) {
      results.push(Object.assign({ tokenName }, value));
    } else if (value && typeof value === "object") {
      flattenTokenEntries(value, tokenName, results);
    }
  }
  return results;
}

function parseCssVariables(source) {
  const variables = new Map();
  const regex = /(--reader-ds-[A-Za-z0-9-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    variables.set(match[1], match[2].trim());
  }
  return variables;
}

function normalizeTokenValue(value) {
  return String(value)
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function validateDesignTokenContract(repoRoot, manifest) {
  const failures = [];
  const contractPath = path.join(repoRoot, manifest.shared && manifest.shared.designTokens ? manifest.shared.designTokens : "");
  assert(fs.existsSync(contractPath), "manifest.shared.designTokens does not point to an existing file", failures);
  if (!fs.existsSync(contractPath)) {
    return { passed: false, failures, tokenCount: 0, runtimeCriticalCssVars: [] };
  }

  const contract = readJson(contractPath);
  const cssPath = path.join(repoRoot, contract.cssSource);
  assert(fs.existsSync(cssPath), `${contract.cssSource} does not exist`, failures);
  const cssSource = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";
  const cssVariables = parseCssVariables(cssSource);
  const tokenEntries = flattenTokenEntries(contract.tokens);
  const tokenGroups = contract.tokens || {};
  for (const group of ["colors", "spacing", "frame", "radii", "typography", "elevation", "shadows", "zIndex", "textLimits"]) {
    assert(Boolean(tokenGroups[group]), `design token contract missing ${group} group`, failures);
  }

  for (const token of tokenEntries) {
    assert(cssVariables.has(token.css), `${token.tokenName} missing CSS variable ${token.css}`, failures);
    if (cssVariables.has(token.css)) {
      const actualValue = normalizeTokenValue(cssVariables.get(token.css));
      const expectedValue = normalizeTokenValue(token.cssValue);
      assert(
        actualValue === expectedValue,
        `${token.tokenName} CSS value ${cssVariables.get(token.css)} !== ${token.cssValue}`,
        failures
      );
    }
  }

  const composeSourceStatus = resolveComposeSourceStatus(repoRoot, contract.composeSources || {});
  const requireComposeSources = process.env.READER_TOKEN_CONTRACT_REQUIRE_COMPOSE === "1";
  if (requireComposeSources || composeSourceStatus.mode === "validated") {
    for (const source of composeSourceStatus.missing) {
      assert(
        false,
        `compose token source ${source.sourceName} missing at ${source.relativePath} under ${composeSourceStatus.root}`,
        failures
      );
    }
  }

  const runtimeCriticalCssVars = contract.runtimeCriticalCssVars || [];
  for (const cssVar of runtimeCriticalCssVars) {
    assert(cssVariables.has(cssVar), `runtime critical CSS variable ${cssVar} is not declared`, failures);
  }

  assert(
    manifest.shared && manifest.shared.tokens === contract.cssSource,
    "manifest.shared.tokens must match design token contract cssSource",
    failures
  );

  return {
    passed: failures.length === 0,
    failures,
    contract: path.relative(repoRoot, contractPath).split(path.sep).join("/"),
    cssSource: contract.cssSource,
    composeSourceRoot: composeSourceStatus.root,
    composeSourceStatus: Object.assign({ required: requireComposeSources }, composeSourceStatus),
    tokenCount: tokenEntries.length,
    runtimeCriticalCssVars
  };
}

function walkTextFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTextFiles(absolutePath, results);
    } else if (/\.(md|html|css)$/.test(entry.name)) {
      results.push(absolutePath);
    }
  }
  return results;
}

function walkAllFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkAllFiles(absolutePath, results);
    } else {
      results.push(absolutePath);
    }
  }
  return results;
}

function walkAllEntries(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name);
    results.push(absolutePath);
    if (entry.isDirectory()) {
      walkAllEntries(absolutePath, results);
    }
  }
  return results;
}

function buttonLabelsFromMainNav(source) {
  const labels = [];
  const navRegex = /<nav class="reader-main-tab-bar handoff-boundary" aria-label="主导航">([\s\S]*?)<\/nav>/g;
  let navMatch;
  while ((navMatch = navRegex.exec(source)) !== null) {
    const navSource = navMatch[1];
    const ariaLabels = Array.from(navSource.matchAll(/aria-label="([^"]+)"/g)).map((match) => match[1]);
    if (ariaLabels.length > 0) {
      labels.push(ariaLabels);
      continue;
    }
    labels.push(Array.from(navSource.matchAll(/<button[^>]*>([^<]+)<\/button>/g)).map((match) => match[1]));
  }
  return labels;
}

function validateCurrentNavigationContract(repoRoot) {
  const failures = [];
  const expectedMainNav = "书架 / 发现 / RSS / 设置";
  const forbiddenPhrases = [
    "书架 / 发现 / 书源 / 我的",
    "底部五项：书架、搜索、发现、书源、设置",
    "只显示书架 / 发现 / 书源 / 我的",
    "| 主 Tab | `mine`",
    "grid-template-columns: repeat(5, 1fr);"
  ];
  const scanRoots = [
    path.join(repoRoot, "docs/cross-platform-ui"),
    path.join(repoRoot, "docs/ui-handoff")
  ];
  const files = scanRoots.flatMap((scanRoot) => walkTextFiles(scanRoot))
    .filter((filePath) => !filePath.includes(`${path.sep}compose${path.sep}`))
    .filter((filePath) => !filePath.includes(`${path.sep}stitch-mcp-audit${path.sep}`))
    .filter((filePath) => !filePath.includes(" 2"));

  for (const filePath of files) {
    const relativePath = path.relative(repoRoot, filePath).split(path.sep).join("/");
    const source = fs.readFileSync(filePath, "utf8");
    for (const phrase of forbiddenPhrases) {
      if (source.includes(phrase)) {
        failures.push(`${relativePath} contains stale navigation phrase: ${phrase}`);
      }
    }
    if (relativePath.startsWith("docs/ui-handoff/normalized-html/") || relativePath === "docs/ui-handoff/components/app-bottom-nav.html") {
      for (const labels of buttonLabelsFromMainNav(source)) {
        const actualMainNav = labels.join(" / ");
        assert(
          actualMainNav === expectedMainNav,
          `${relativePath} main nav ${actualMainNav} !== ${expectedMainNav}`,
          failures
        );
      }
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    expectedMainNav,
    checkedFileCount: files.length
  };
}

function validateProjectStructureContract(repoRoot) {
  const failures = [];
  const scanRoots = [
    path.join(repoRoot, "docs/ui-design"),
    path.join(repoRoot, "docs/ui-handoff")
  ];
  const duplicateEntries = scanRoots.flatMap((scanRoot) => walkAllEntries(scanRoot))
    .map((entryPath) => path.relative(repoRoot, entryPath).split(path.sep).join("/"))
    .filter((relativePath) => /(^|\/)[^/]* 2($|[./])/.test(relativePath))
    .sort();

  for (const duplicateEntry of duplicateEntries) {
    failures.push(`duplicate Finder-style copy remains in current input tree: ${duplicateEntry}`);
  }

  return {
    passed: failures.length === 0,
    failures,
    duplicateEntryCount: duplicateEntries.length
  };
}

function validateManifestInventory(repoRoot, manifest) {
  const failures = [];
  const screenDirs = discoverUiDesignScreenDirs(repoRoot);
  const manifestHtmlTargets = manifest.targets.map((target) => target.html).sort();
  const pagePreviewTargets = manifest.targets.filter((target) => target.stateModel && target.stateModel.type === "preview");
  const stateMatrixTargets = manifest.targets.filter((target) => target.stateModel && target.stateModel.type === "state-matrix");
  const expectedPagePreviews = screenDirs.map((dir) => `docs/ui-design/${dir}/frontend-input/preview.html`).sort();
  const expectedStateMatrices = screenDirs.map((dir) => `docs/ui-design/${dir}/frontend-input/state-matrix.html`).sort();

  assert(screenDirs.length === 30, `formal UI design screen count ${screenDirs.length} !== 30`, failures);
  assert(pagePreviewTargets.length === 30, `manifest preview target count ${pagePreviewTargets.length} !== 30`, failures);
  assert(stateMatrixTargets.length === 30, `manifest state matrix target count ${stateMatrixTargets.length} !== 30`, failures);

  for (const html of expectedPagePreviews) {
    assert(manifestHtmlTargets.includes(html), `manifest missing page preview ${html}`, failures);
  }
  for (const html of expectedStateMatrices) {
    assert(manifestHtmlTargets.includes(html), `manifest missing state matrix ${html}`, failures);
  }

  const duplicateNames = manifest.targets
    .map((target) => target.name)
    .filter((name, index, names) => names.indexOf(name) !== index);
  assert(duplicateNames.length === 0, `manifest has duplicate target names: ${duplicateNames.join(", ")}`, failures);

  for (const target of manifest.targets) {
    assert(fs.existsSync(path.join(repoRoot, target.html)), `${target.name} html does not exist`, failures);
    assert(Boolean(target.screenshot), `${target.name} has no screenshot output`, failures);
    assert(Boolean(target.rendererGlobal), `${target.name} has no rendererGlobal`, failures);
  }

  return {
    passed: failures.length === 0,
    failures,
    screenCount: screenDirs.length,
    manifestTargetCount: manifest.targets.length,
    pagePreviewTargetCount: pagePreviewTargets.length,
    stateMatrixTargetCount: stateMatrixTargets.length
  };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function validatePlanningDocumentation(repoRoot) {
  const failures = [];
  const docsRoot = path.join(repoRoot, "docs/ui-design/frontend-input");
  const pageCardsPath = path.join(docsRoot, "FRONTEND_PAGE_PLANNING_CARDS.md");
  const detailedCardsPath = path.join(docsRoot, "FRONTEND_DETAILED_PAGE_PLANNING_CARDS.md");
  const firstCardsPath = path.join(docsRoot, "FRONTEND_FIRST_PAGE_PLANNING_CARDS.md");
  const planningRequirementsPath = path.join(docsRoot, "FRONTEND_PLANNING_REQUIREMENTS.md");
  const completionAuditPath = path.join(docsRoot, "FRONTEND_DESIGN_COMPLETION_AUDIT.md");

  const requiredDocs = [
    pageCardsPath,
    detailedCardsPath,
    firstCardsPath,
    planningRequirementsPath,
    completionAuditPath
  ];
  for (const docPath of requiredDocs) {
    assert(fs.existsSync(docPath), `${path.relative(repoRoot, docPath)} does not exist`, failures);
  }
  if (requiredDocs.some((docPath) => !fs.existsSync(docPath))) {
    return {
      passed: false,
      failures,
      pagePlanningCardCount: 0,
      detailedPageRowCount: 0,
      detailedSectionCounts: {}
    };
  }

  const pageCardsSource = fs.readFileSync(pageCardsPath, "utf8");
  const detailedSource = fs.readFileSync(detailedCardsPath, "utf8");
  const firstCardsSource = fs.readFileSync(firstCardsPath, "utf8");
  const planningRequirementsSource = fs.readFileSync(planningRequirementsPath, "utf8");
  const completionAuditSource = fs.readFileSync(completionAuditPath, "utf8");

  const pageRows = [];
  const pageRowRegex = /^\| ([^|]+（[^）]+）) \| `([^`]+-preview)` \/ `([^`]+\/frontend-input\/)` \|/gm;
  let pageRowMatch;
  while ((pageRowMatch = pageRowRegex.exec(pageCardsSource)) !== null) {
    pageRows.push({
      label: pageRowMatch[1],
      id: pageRowMatch[2],
      inputPath: pageRowMatch[3]
    });
  }

  const uniquePageLabels = new Set(pageRows.map((row) => row.label));
  const uniquePageIds = new Set(pageRows.map((row) => row.id));
  assert(pageRows.length === 30, `page planning card row count ${pageRows.length} !== 30`, failures);
  assert(uniquePageLabels.size === 30, `page planning card unique label count ${uniquePageLabels.size} !== 30`, failures);
  assert(uniquePageIds.size === 30, `page planning card unique id count ${uniquePageIds.size} !== 30`, failures);

  const detailedSections = {
    structureAndOverlay: {
      start: "## 结构与覆盖（Structure and Overlay）",
      end: "## 入口、返回、上下文、事件（Entry, Back, Context, Events）"
    },
    entryBackContextEvents: {
      start: "## 入口、返回、上下文、事件（Entry, Back, Context, Events）",
      end: "## 适配、文本、组件、验收（Adaptation, Text, Components, Acceptance）"
    },
    adaptationTextComponentsAcceptance: {
      start: "## 适配、文本、组件、验收（Adaptation, Text, Components, Acceptance）",
      end: "## 规划闭合判断（Planning Closure Judgment）"
    }
  };

  const detailedSectionCounts = {};
  for (const [sectionName, section] of Object.entries(detailedSections)) {
    const startIndex = detailedSource.indexOf(section.start);
    const endIndex = detailedSource.indexOf(section.end);
    assert(startIndex >= 0, `detailed planning missing section ${section.start}`, failures);
    assert(endIndex > startIndex, `detailed planning section ${section.start} is not followed by ${section.end}`, failures);
    if (startIndex >= 0 && endIndex > startIndex) {
      const sectionSource = detailedSource.slice(startIndex, endIndex);
      const rowCount = pageRows.filter((row) => {
        const rowRegex = new RegExp(`^\\| ${escapeRegExp(row.label)} \\|`, "m");
        return rowRegex.test(sectionSource);
      }).length;
      detailedSectionCounts[sectionName] = rowCount;
      assert(rowCount === 30, `detailed planning ${sectionName} row count ${rowCount} !== 30`, failures);
      for (const row of pageRows) {
        const rowRegex = new RegExp(`^\\| ${escapeRegExp(row.label)} \\|`, "m");
        assert(rowRegex.test(sectionSource), `detailed planning ${sectionName} missing ${row.label}`, failures);
      }
    }
  }

  const requiredDetailedFields = [
    "固定区（Fixed Regions）",
    "滚动区（Scrollable Regions）",
    "覆盖区 / 状态区（Overlay / State Hosts）",
    "可覆盖内容（Coverable Content）",
    "必须完整展示（Must Fully Display）",
    "入口来源（Entry Sources）",
    "返回路径（Back Path）",
    "上下文字段（Context Fields）",
    "事件字段（Event Fields）",
    "断点 / 安全区 / 键盘（Breakpoint / Safe Area / Keyboard）",
    "文本规则（Text Rules）",
    "组件抽象（Componentization）",
    "验收项目（Acceptance Checks）"
  ];
  for (const field of requiredDetailedFields) {
    assert(detailedSource.includes(field), `detailed planning missing required field ${field}`, failures);
  }

  for (const [docName, source] of Object.entries({
    "FRONTEND_PAGE_PLANNING_CARDS.md": pageCardsSource,
    "FRONTEND_FIRST_PAGE_PLANNING_CARDS.md": firstCardsSource,
    "FRONTEND_PLANNING_REQUIREMENTS.md": planningRequirementsSource,
    "FRONTEND_DESIGN_COMPLETION_AUDIT.md": completionAuditSource
  })) {
    assert(
      source.includes("FRONTEND_DETAILED_PAGE_PLANNING_CARDS.md"),
      `${docName} does not reference FRONTEND_DETAILED_PAGE_PLANNING_CARDS.md`,
      failures
    );
  }

  assert(
    !/\| 内容优先级规则（Content Priority Rules） \| 缺口（Gap）/.test(completionAuditSource),
    "completion audit still marks content priority rules as Gap",
    failures
  );

  return {
    passed: failures.length === 0,
    failures,
    pagePlanningCardCount: pageRows.length,
    detailedPageRowCount: Object.values(detailedSectionCounts).reduce((sum, count) => sum + count, 0),
    detailedSectionCounts,
    requiredDetailedFieldCount: requiredDetailedFields.length
  };
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

async function validateFrontendDemoInteractions(page, failures) {
  const demoUrl = page.url().split("?")[0];
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(demoUrl, { waitUntil: "load" });
  await page.waitForSelector(".fd-demo", { timeout: 5000 });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

  const snapshot = async () => page.evaluate(() => {
    const root = document.querySelector(".fd-demo");
    const screen = document.querySelector("[data-screen-host]")?.firstElementChild;
    return {
      route: root?.getAttribute("data-current-route"),
      shell: screen?.getAttribute("data-shell"),
      screenCount: document.querySelectorAll("[data-screen-host] > *").length,
      currentPage: document.querySelector("[data-current-page]")?.textContent || "",
      stackSize: document.querySelector("[data-stack-size]")?.textContent || "",
      status: document.querySelector(".fd-route-status")?.textContent || ""
    };
  });
  const activeStructure = async () => page.evaluate(() => {
    const screen = document.querySelector(".fd-active-screen");
    const content = screen?.querySelector('[data-slot="contentRegion"]');
    const sheetHost = screen?.querySelector('[data-slot="sheetHost"]');
    const dialogHost = screen?.querySelector('[data-slot="dialogHost"]');
    const moduleListRows = Array.from(screen?.querySelectorAll(".fd-reader-module-panel .fd-reader-module-list button") || []);
    const moduleControls = screen?.querySelectorAll([
      ".fd-reader-module-panel .fd-reader-module-list button",
      ".fd-reader-module-panel .fd-reader-option-grid button",
      ".fd-reader-module-panel .fd-reader-step-row",
      ".fd-reader-module-panel .fd-reader-font-row button",
      ".fd-reader-module-panel .fd-reader-swatch-row button",
      ".fd-reader-module-panel .fd-reader-transport button",
      ".fd-reader-module-panel .fd-reader-theme-grid button",
      ".fd-reader-module-panel .fd-reader-mini-control button",
      ".fd-reader-module-panel .fd-reader-segment-row button",
      ".fd-reader-module-panel .fd-reader-settings-list button",
      ".fd-reader-module-panel .fd-reader-inline-entry"
    ].join(", ")).length || 0;
    const rowHeights = moduleListRows.map((row) => Math.round(row.getBoundingClientRect().height));
    return {
      bottomFixedAction: Boolean(screen?.querySelector('[data-slot="bottomActionHost"] .fd-fixed-action-row')),
      sheetOwnsSheet: Boolean(sheetHost?.querySelector(':scope > [data-demo-sheet]')),
      dialogOwnsDialog: Boolean(dialogHost?.querySelector(':scope > [data-demo-dialog]')),
      contentHasSheet: Boolean(content?.querySelector('[data-demo-sheet]')),
      contentHasDialog: Boolean(content?.querySelector('[data-demo-dialog]')),
      quickDetailText: screen?.querySelector(".fd-reader-quick-detail")?.textContent || "",
      modulePanelText: screen?.querySelector(".fd-reader-module-panel:not(.fd-reader-quick-detail)")?.textContent || "",
      modulePanelInSheet: Boolean(screen?.querySelector(".fd-reader-sheet .fd-reader-module-panel")),
      defaultQuickActionsVisible: Boolean(screen?.querySelector(".fd-reader-sheet .fd-reader-actions")),
      activeQuickAction: screen?.querySelector(".fd-reader-actions button.is-active")?.getAttribute("data-quick-action") || "",
      activeModuleCount: screen?.querySelectorAll(".fd-reader-module.is-active").length || 0,
      moduleCompactControlCount: moduleControls,
      moduleMaxListRowHeight: rowHeights.length ? Math.max(...rowHeights) : 0
    };
  });
  const readerSurfaceSignature = async () => page.evaluate(() => {
    const layer = document.querySelector(".fd-active-screen .fd-ir-reading-layer");
    return {
      title: layer?.querySelector("h1")?.textContent || "",
      paragraphs: Array.from(layer?.querySelectorAll("p") || []).map((paragraph) => paragraph.textContent || "")
    };
  });
  const readerPageState = async () => page.evaluate(() => {
    const layer = document.querySelector(".fd-active-screen .fd-ir-reading-layer");
    const paragraphs = Array.from(layer?.querySelectorAll("p") || []);
    const lastParagraph = paragraphs[paragraphs.length - 1];
    const layerRect = layer?.getBoundingClientRect();
    const lastRect = lastParagraph?.getBoundingClientRect();
    const readingSurface = document.querySelector('.fd-active-screen [data-slot="readingSurface"]');
    return {
      route: document.querySelector(".fd-demo")?.getAttribute("data-current-route") || "",
      index: Number(layer?.getAttribute("data-reader-page-index") || 0),
      count: Number(layer?.getAttribute("data-reader-page-count") || 0),
      pagination: layer?.getAttribute("data-reader-pagination") || "",
      title: layer?.querySelector("h1")?.textContent || "",
      titleCount: layer?.querySelectorAll("h1").length || 0,
      paragraphCount: paragraphs.length,
      paragraphs: paragraphs.map((paragraph) => paragraph.textContent || ""),
      blankBottom: layerRect && lastRect ? Math.round(layerRect.bottom - lastRect.bottom) : null,
      readingSurfaceOutline: readingSurface ? window.getComputedStyle(readingSurface).outlineStyle : "",
      readingLayerOutline: layer ? window.getComputedStyle(layer).outlineStyle : "",
      devRegionCount: document.querySelectorAll(".fd-active-screen [data-dev-region]").length,
      slotCount: document.querySelectorAll(".fd-active-screen [data-slot]").length,
      readout: document.querySelector(".fd-active-screen [data-reader-page-readout]")?.textContent || "",
      turnNext: Boolean(layer?.classList.contains("fd-reader-page-turn-next")),
      turnPrev: Boolean(layer?.classList.contains("fd-reader-page-turn-prev"))
    };
  });
  const readerSurfaceGeometry = async () => page.evaluate(() => {
    const roundedRect = (element, root) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const rootRect = root?.getBoundingClientRect();
      const left = rootRect ? rect.left - rootRect.left : rect.left;
      const top = rootRect ? rect.top - rootRect.top : rect.top;
      return {
        left: Math.round(left),
        top: Math.round(top),
        right: Math.round(left + rect.width),
        bottom: Math.round(top + rect.height),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    };
    const frame = document.querySelector(".fd-active-screen .fd-reader-flow-frame");
    const layer = document.querySelector(".fd-active-screen .fd-ir-reading-layer");
    return {
      layer: roundedRect(layer, frame),
      title: roundedRect(layer?.querySelector("h1"), frame),
      firstParagraph: roundedRect(layer?.querySelector("p"), frame)
    };
  });
  const readerTypographyStyles = async () => page.evaluate(() => {
    const layer = document.querySelector(".fd-active-screen .fd-ir-reading-layer");
    const paragraph = layer?.querySelector("p");
    const style = paragraph ? window.getComputedStyle(paragraph) : null;
    return {
      fontSize: style?.fontSize || "",
      lineHeight: style?.lineHeight || "",
      paragraphGap: style?.marginBottom || "",
      letterSpacing: style?.letterSpacing || "",
      fontFamily: style?.fontFamily || "",
      fontSizeValue: style ? Number.parseFloat(style.fontSize) : 0,
      lineHeightValue: style ? Number.parseFloat(style.lineHeight) : 0,
      paragraphGapValue: style ? Number.parseFloat(style.marginBottom) : 0,
      letterSpacingValue: style ? Number.parseFloat(style.letterSpacing) || 0 : 0
    };
  });
  const waitForReaderReady = async () => {
    await page.waitForFunction(() => !document.querySelector(".fd-active-screen [data-reader-loading]"), null, { timeout: 2000 });
  };
  const assertSameReaderSurface = (actual, expected, label) => {
    assert(actual.title === expected.title, `${label} changed reading surface title`, failures);
    assert(
      JSON.stringify(actual.paragraphs) === JSON.stringify(expected.paragraphs),
      `${label} changed shared reading surface paragraphs`,
      failures
    );
  };
  const assertSameReaderGeometry = (actual, expected, label) => {
    assert(JSON.stringify(actual.layer) === JSON.stringify(expected.layer), `${label} changed reading surface text box`, failures);
    assert(JSON.stringify(actual.title) === JSON.stringify(expected.title), `${label} changed reading title geometry`, failures);
    assert(
      JSON.stringify(actual.firstParagraph) === JSON.stringify(expected.firstParagraph),
      `${label} changed first paragraph geometry`,
      failures
    );
  };
  const assertReaderParagraphFillsLayer = (actual, label) => {
    assert(Boolean(actual.layer), `${label} missing reading layer geometry`, failures);
    assert(Boolean(actual.firstParagraph), `${label} missing first paragraph geometry`, failures);
    if (actual.layer && actual.firstParagraph) {
      assert(actual.firstParagraph.left === actual.layer.left, `${label} first paragraph left edge is not aligned to reading layer`, failures);
      assert(actual.firstParagraph.width >= actual.layer.width - 2, `${label} first paragraph does not fill reading layer width`, failures);
    }
  };
  const expectReaderLoadingTransition = async (label) => {
    const loadingState = await page.evaluate(() => ({
      hasLoading: Boolean(document.querySelector(".fd-active-screen [data-reader-loading]")),
      hasSurface: Boolean(document.querySelector(".fd-active-screen .fd-ir-reading-layer")),
      hasSheet: Boolean(document.querySelector(".fd-active-screen .fd-reader-sheet")),
      hasModuleNav: Boolean(document.querySelector(".fd-active-screen .fd-reader-module-nav:not(.fd-reader-module-nav-empty)"))
    }));
    assert(loadingState.hasLoading, `${label} did not expose ReaderShell loading state`, failures);
    assert(loadingState.hasSurface, `${label} loading state lost reading surface`, failures);
    assert(loadingState.hasSheet, `${label} loading state lost bottom sheet host`, failures);
    assert(loadingState.hasModuleNav, `${label} loading state lost module navigation`, failures);
    await waitForReaderReady();
  };
  const longPressFirstBookCover = async () => {
    const cover = page.locator(".fd-active-screen .fd-book-card [data-book-cover]").first();
    await cover.scrollIntoViewIfNeeded();
    const box = await cover.boundingBox();
    assert(Boolean(box), "bookshelf first book cover was not visible for long press", failures);
    if (!box) {
      return;
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(650);
    await page.mouse.up();
  };

  const initialState = await snapshot();
  assert(initialState.route === "bookshelf", "frontend demo did not start on bookshelf route", failures);
  assert(initialState.shell === "MainTabShell", "frontend demo initial route is not MainTabShell", failures);
  assert(initialState.screenCount === 1, "frontend demo should render exactly one active screen", failures);
  const initialDisplayMode = await page.evaluate(() => {
    const root = document.querySelector(".fd-demo");
    const routePanel = document.querySelector(".fd-route-panel");
    return {
      mode: root?.getAttribute("data-demo-mode"),
      routePanelHidden: routePanel ? window.getComputedStyle(routePanel).display === "none" : false,
      regularPressed: document.querySelector('[data-demo-mode-option="regular"]')?.getAttribute("aria-pressed"),
      developerPressed: document.querySelector('[data-demo-mode-option="developer"]')?.getAttribute("aria-pressed")
    };
  });
  assert(initialDisplayMode.mode === "regular", "frontend demo should open in regular display mode", failures);
  assert(initialDisplayMode.routePanelHidden, "regular display mode should hide developer route panel", failures);
  assert(initialDisplayMode.regularPressed === "true", "regular display mode button should be pressed", failures);
  assert(initialDisplayMode.developerPressed === "false", "developer mode button should not be pressed by default", failures);
  await page.click('[data-demo-mode-option="developer"]');
  const developerDisplayMode = await page.evaluate(() => {
    const root = document.querySelector(".fd-demo");
    const routePanel = document.querySelector(".fd-route-panel");
    return {
      mode: root?.getAttribute("data-demo-mode"),
      routePanelVisible: routePanel ? window.getComputedStyle(routePanel).display !== "none" : false,
      developerPressed: document.querySelector('[data-demo-mode-option="developer"]')?.getAttribute("aria-pressed")
    };
  });
  assert(developerDisplayMode.mode === "developer", "developer mode button did not switch demo mode", failures);
  assert(developerDisplayMode.routePanelVisible, "developer mode should show route panel", failures);
  assert(developerDisplayMode.developerPressed === "true", "developer mode button should be pressed after switching", failures);
  const bookshelfHomeStructure = await page.evaluate(() => {
    const screen = document.querySelector(".fd-active-screen");
    const bookCards = Array.from(screen?.querySelectorAll(".fd-book-card") || []);
    const firstRowTop = bookCards[0]?.getBoundingClientRect().top || 0;
    const firstRowCount = bookCards.filter((card) => Math.abs(card.getBoundingClientRect().top - firstRowTop) < 2).length;
    const mainNavTop = screen?.querySelector(".fd-main-nav")?.getBoundingClientRect().top || 0;
    const cardsAboveMainNavCount = bookCards.filter((card) => card.getBoundingClientRect().bottom <= mainNavTop - 6).length;
    const continueCover = screen?.querySelector(".fd-continue-cover-button");
    const continueCoverImage = continueCover?.querySelector("img");
    const continueCoverRect = continueCover?.getBoundingClientRect();
    const continueCoverImageRect = continueCoverImage?.getBoundingClientRect();
    const continueCoverStyle = continueCover ? window.getComputedStyle(continueCover) : null;
    const continueCoverImageStyle = continueCoverImage ? window.getComputedStyle(continueCoverImage) : null;
    return {
      bookshelfEmptyEntryCount: screen?.querySelectorAll('.fd-structure-actions [data-route="bookshelf-empty"]').length || 0,
      actionSheetRouteEntryCount: screen?.querySelectorAll('[data-route="book-action-sheet"]').length || 0,
      searchEntryCount: screen?.querySelectorAll(".fd-search-entry").length || 0,
      keyboardHostCount: screen?.querySelectorAll("[data-keyboard-host]").length || 0,
      chipCount: screen?.querySelectorAll(".fd-chip-row button").length || 0,
      activeChipCount: screen?.querySelectorAll(".fd-chip-row button.is-active").length || 0,
      sectionToolButtonCount: screen?.querySelectorAll(".fd-section-head button").length || 0,
      activeSectionToolCount: screen?.querySelectorAll(".fd-section-head button.is-active").length || 0,
      settingsToolCount: screen?.querySelectorAll('.fd-section-head button[data-route="bookshelf-search-settings"]').length || 0,
      settingsIconUsesGearToken: Boolean(screen?.querySelector('.fd-section-head button[aria-label="书架显示设置"] svg[data-icon-name="gear"]')),
      moreLayerCount: screen?.querySelectorAll("[data-bookshelf-more-layer]").length || 0,
      moreLayerHidden: screen?.querySelector("[data-bookshelf-more-layer]")?.getAttribute("aria-hidden") || "",
      firstRowCount,
      cardsAboveMainNavCount,
      visibleBookChapterCount: screen?.querySelectorAll(".fd-book-card > small").length || 0,
      visibleBookProgressCount: screen?.querySelectorAll(".fd-book-card > i").length || 0,
      continueText: screen?.querySelector(".fd-continue-card")?.textContent || "",
      continueProgressCount: screen?.querySelectorAll(".fd-continue-card div > i").length || 0,
      continueCoverBackground: continueCoverStyle?.backgroundColor || "",
      continueCoverPadding: continueCoverStyle?.padding || "",
      continueCoverObjectFit: continueCoverImageStyle?.objectFit || "",
      continueCoverWidth: Math.round(continueCoverRect?.width || 0),
      continueCoverHeight: Math.round(continueCoverRect?.height || 0),
      continueCoverImageWidth: Math.round(continueCoverImageRect?.width || 0),
      continueCoverImageHeight: Math.round(continueCoverImageRect?.height || 0)
    };
  });
  assert(bookshelfHomeStructure.bookshelfEmptyEntryCount === 0, "bookshelf should not expose empty-state as a manual app route", failures);
  assert(bookshelfHomeStructure.actionSheetRouteEntryCount === 0, "bookshelf should not expose action-sheet structure route", failures);
  assert(bookshelfHomeStructure.searchEntryCount === 0, "bookshelf home should not render a body search entry", failures);
  assert(bookshelfHomeStructure.keyboardHostCount === 0, "bookshelf home should not own a hidden keyboard host", failures);
  assert(bookshelfHomeStructure.chipCount === 4, "bookshelf home should render four shelf filter chips", failures);
  assert(bookshelfHomeStructure.activeChipCount === 1, "bookshelf home should keep exactly one active filter chip", failures);
  assert(bookshelfHomeStructure.sectionToolButtonCount === 3, "bookshelf home should expose three compact shelf tools", failures);
  assert(bookshelfHomeStructure.activeSectionToolCount === 1, "bookshelf home should keep one active view tool", failures);
  assert(bookshelfHomeStructure.settingsToolCount === 1, "bookshelf home should expose exactly one bookshelf settings entry", failures);
  assert(bookshelfHomeStructure.settingsIconUsesGearToken, "bookshelf settings tool should use the asset-library gear token", failures);
  assert(bookshelfHomeStructure.moreLayerCount === 1, "bookshelf top more action should own a separate bookshelf operation layer", failures);
  assert(bookshelfHomeStructure.moreLayerHidden === "true", "bookshelf more operation layer should be hidden by default", failures);
  assert(bookshelfHomeStructure.firstRowCount === 3, "bookshelf cover grid should show three books in the first row", failures);
  assert(bookshelfHomeStructure.cardsAboveMainNavCount >= 6, "bookshelf home should show at least six complete books above the floating main navigation", failures);
  assert(bookshelfHomeStructure.continueCoverBackground === "rgba(0, 0, 0, 0)", "bookshelf continue cover button should not render an extra background frame", failures);
  assert(bookshelfHomeStructure.continueCoverPadding === "0px", "bookshelf continue cover button should not inherit action button padding", failures);
  assert(bookshelfHomeStructure.continueCoverObjectFit === "cover", "bookshelf continue cover image should fill its cover frame", failures);
  assert(bookshelfHomeStructure.continueCoverWidth === bookshelfHomeStructure.continueCoverImageWidth, "bookshelf continue cover image width should match cover frame", failures);
  assert(bookshelfHomeStructure.continueCoverHeight === bookshelfHomeStructure.continueCoverImageHeight, "bookshelf continue cover image height should match cover frame", failures);
  const bookshelfVisibleBookMeta = bookshelfHomeStructure;
  assert(bookshelfVisibleBookMeta.visibleBookChapterCount === 0, "bookshelf book cards should not display chapter text", failures);
  assert(bookshelfVisibleBookMeta.visibleBookProgressCount === 0, "bookshelf book cards should not display progress bars", failures);
  assert(!/第\s*\d+|%|雨夜/.test(bookshelfVisibleBookMeta.continueText), "bookshelf continue card should not display chapter/progress text", failures);
  assert(bookshelfVisibleBookMeta.continueProgressCount === 0, "bookshelf continue card should not display progress bar", failures);

  await page.click('.fd-active-screen [data-bookshelf-view-button="list"]');
  const bookshelfListViewState = await page.evaluate(() => {
    const screen = document.querySelector(".fd-active-screen");
    const grid = screen?.querySelector("[data-book-grid]");
    const firstCard = screen?.querySelector(".fd-book-card");
    const firstCover = firstCard?.querySelector(".fd-book-cover-frame");
    const cardRect = firstCard?.getBoundingClientRect();
    const coverRect = firstCover?.getBoundingClientRect();
    return {
      view: grid?.getAttribute("data-bookshelf-view") || "",
      gridClass: grid?.className || "",
      coverPressed: screen?.querySelector('[data-bookshelf-view-button="cover"]')?.getAttribute("aria-pressed") || "",
      listPressed: screen?.querySelector('[data-bookshelf-view-button="list"]')?.getAttribute("aria-pressed") || "",
      activeViewCount: screen?.querySelectorAll("[data-bookshelf-view-button].is-active").length || 0,
      cardWidth: Math.round(cardRect?.width || 0),
      coverWidth: Math.round(coverRect?.width || 0)
    };
  });
  assert(bookshelfListViewState.view === "list", "bookshelf list button did not switch book grid to list view", failures);
  assert(bookshelfListViewState.gridClass.includes("is-list-view"), "bookshelf list view did not apply list layout class", failures);
  assert(bookshelfListViewState.coverPressed === "false" && bookshelfListViewState.listPressed === "true", "bookshelf list view did not update view button pressed states", failures);
  assert(bookshelfListViewState.activeViewCount === 1, "bookshelf list view should keep exactly one active view button", failures);
  assert(bookshelfListViewState.cardWidth >= 300 && bookshelfListViewState.coverWidth <= 60, "bookshelf list view did not render compact row layout", failures);

  await page.click('.fd-active-screen [data-bookshelf-view-button="cover"]');
  const bookshelfCoverViewState = await page.evaluate(() => {
    const screen = document.querySelector(".fd-active-screen");
    const grid = screen?.querySelector("[data-book-grid]");
    const bookCards = Array.from(screen?.querySelectorAll(".fd-book-card") || []);
    const firstRowTop = bookCards[0]?.getBoundingClientRect().top || 0;
    return {
      view: grid?.getAttribute("data-bookshelf-view") || "",
      coverPressed: screen?.querySelector('[data-bookshelf-view-button="cover"]')?.getAttribute("aria-pressed") || "",
      listPressed: screen?.querySelector('[data-bookshelf-view-button="list"]')?.getAttribute("aria-pressed") || "",
      firstRowCount: bookCards.filter((card) => Math.abs(card.getBoundingClientRect().top - firstRowTop) < 2).length
    };
  });
  assert(bookshelfCoverViewState.view === "cover", "bookshelf cover button did not switch book grid back to cover view", failures);
  assert(bookshelfCoverViewState.coverPressed === "true" && bookshelfCoverViewState.listPressed === "false", "bookshelf cover view did not update view button pressed states", failures);
  assert(bookshelfCoverViewState.firstRowCount === 3, "bookshelf cover view should restore three-column first row", failures);

  await page.click('.fd-active-screen .fd-top-actions button[aria-label="more"]');
  const bookshelfMoreState = await page.evaluate(() => {
    const layer = document.querySelector(".fd-active-screen [data-bookshelf-more-layer]");
    const settingsButton = document.querySelector('.fd-active-screen .fd-section-head button[data-route="bookshelf-search-settings"]');
    return {
      hidden: layer?.getAttribute("aria-hidden") || "",
      text: layer?.textContent || "",
      routeCount: layer?.querySelectorAll("[data-route]").length || 0,
      settingsScope: settingsButton?.getAttribute("data-settings-scope") || "",
      settingsLabel: settingsButton?.getAttribute("aria-label") || "",
      settingsInsideMore: Boolean(layer?.querySelector('[data-route="bookshelf-search-settings"]'))
    };
  });
  assert(bookshelfMoreState.hidden === "false", "bookshelf top more action did not open operation layer", failures);
  for (const option of ["批量管理", "分组管理", "本地书导入", "排序与筛选"]) {
    assert(bookshelfMoreState.text.includes(option), `bookshelf top more operation layer missing ${option}`, failures);
  }
  assert(bookshelfMoreState.routeCount >= 3, "bookshelf top more operation layer should expose page-level operation routes", failures);
  assert(bookshelfMoreState.settingsScope === "bookshelf-display", "bookshelf section settings button should be scoped to display/search settings", failures);
  assert(bookshelfMoreState.settingsLabel === "书架显示设置", "bookshelf section settings button label should distinguish it from top more operations", failures);
  assert(!bookshelfMoreState.settingsInsideMore, "bookshelf top more operation layer should not duplicate bookshelf display settings route", failures);
  await page.click(".fd-active-screen [data-close-bookshelf-more]");
  const bookshelfMoreClosedState = await page.evaluate(() => ({
    hidden: document.querySelector(".fd-active-screen [data-bookshelf-more-layer]")?.getAttribute("aria-hidden") || ""
  }));
  assert(bookshelfMoreClosedState.hidden === "true", "bookshelf top more operation layer did not close", failures);

  await page.click('.fd-active-screen .fd-top-actions [data-top-action="more"]');
  await page.click('.fd-active-screen [data-bookshelf-more-layer] [data-route="local-import"]');
  const localImportRouteState = await snapshot();
  assert(localImportRouteState.route === "local-import", "bookshelf top more local import action did not navigate to local-import", failures);
  assert(localImportRouteState.shell === "LibraryShell", "local-import did not render LibraryShell", failures);
  const localImportTopMoreState = await page.evaluate(() => ({
    topMoreCount: document.querySelectorAll('.fd-active-screen .fd-back-bar button[aria-label="更多"]').length,
    titleText: document.querySelector(".fd-active-screen .fd-back-bar h1")?.textContent || "",
    bottomActionText: document.querySelector('.fd-active-screen [data-slot="bottomActionHost"]')?.textContent || ""
  }));
  assert(localImportTopMoreState.topMoreCount === 0, "local-import must not inherit an unplanned LibraryShell top more button", failures);
  assert(localImportTopMoreState.titleText.includes("本地书导入"), "local-import back top bar title is missing", failures);
  assert(localImportTopMoreState.bottomActionText.includes("完成"), "local-import should keep completion actions in BottomActionHost", failures);
  await page.click("[data-demo-back]");
  assert((await snapshot()).route === "bookshelf", "demo back did not restore bookshelf after local-import from more menu", failures);

  const bookshelfTopActionState = await page.evaluate(() => Array.from(document.querySelectorAll(".fd-active-screen .fd-top-actions button")).map((button) => ({
    action: button.getAttribute("data-top-action") || "",
    title: button.getAttribute("title") || ""
  })));
  assert(bookshelfTopActionState.map((item) => item.action).join("|") === "search|more", "bookshelf top actions should be search and more", failures);
  assert(bookshelfTopActionState.map((item) => item.title).join("|") === "搜索|更多", "bookshelf top actions should expose clear Chinese titles", failures);

  await page.click('.fd-active-screen .fd-book-card [data-book-cover]');
  const coverTapState = await snapshot();
  assert(coverTapState.route === "immersive-reading", "bookshelf cover tap did not navigate directly to immersive-reading", failures);
  assert(coverTapState.shell === "ReaderShell", "bookshelf cover tap did not render ReaderShell", failures);
  await page.click("[data-demo-back]");
  assert((await snapshot()).route === "bookshelf", "demo back did not restore bookshelf after cover tap", failures);

  await page.click('.fd-active-screen .fd-continue-card button[data-route="immersive-reading"]');
  const continueReadState = await snapshot();
  assert(continueReadState.route === "immersive-reading", "bookshelf continue reading did not navigate directly to immersive-reading", failures);
  assert(continueReadState.shell === "ReaderShell", "bookshelf continue reading did not render ReaderShell", failures);
  await page.click("[data-demo-back]");
  assert((await snapshot()).route === "bookshelf", "demo back did not restore bookshelf after continue reading", failures);

  await longPressFirstBookCover();
  const coverFocusState = await page.evaluate(() => {
    const phone = document.querySelector(".fd-main-tab-phone");
    const layer = phone?.querySelector("[data-book-focus-layer]");
    return {
      route: document.querySelector(".fd-demo")?.getAttribute("data-current-route"),
      hasFocusState: Boolean(phone?.classList.contains("has-book-focus")),
      focusedCoverCount: phone?.querySelectorAll(".is-cover-focused").length || 0,
      layerOpen: layer?.getAttribute("aria-hidden") === "false",
      menuText: layer?.textContent || "",
      title: layer?.querySelector("[data-focus-title]")?.textContent || ""
    };
  });
  assert(coverFocusState.route === "bookshelf", "bookshelf cover long press should not navigate away", failures);
  assert(coverFocusState.hasFocusState, "bookshelf cover long press did not mark phone focus state", failures);
  assert(coverFocusState.focusedCoverCount === 1, "bookshelf cover long press did not focus exactly one cover", failures);
  assert(coverFocusState.layerOpen, "bookshelf cover long press did not open operation layer", failures);
  assert(coverFocusState.title === "长夜余火", "bookshelf cover operation layer did not bind focused book title", failures);
  for (const option of ["多选", "分支", "书籍详情", "删除"]) {
    assert(coverFocusState.menuText.includes(option), `bookshelf cover operation layer missing ${option}`, failures);
  }
  await page.click(".fd-active-screen [data-close-book-focus]");
  const coverFocusClosedState = await page.evaluate(() => ({
    hasFocusState: document.querySelector(".fd-main-tab-phone")?.classList.contains("has-book-focus"),
    layerHidden: document.querySelector("[data-book-focus-layer]")?.getAttribute("aria-hidden") === "true"
  }));
  assert(!coverFocusClosedState.hasFocusState, "bookshelf cover operation layer did not clear focus state", failures);
  assert(coverFocusClosedState.layerHidden, "bookshelf cover operation layer did not close", failures);

  await page.click('.fd-active-screen .fd-top-actions button[aria-label="search"]');
  const searchState = await snapshot();
  assert(searchState.route === "book-search", "bookshelf search did not navigate to book-search", failures);
  assert(searchState.shell === "LibraryShell", "book-search did not render LibraryShell", failures);
  assert(searchState.stackSize === "2", "book-search did not push route stack", failures);
  const bookSearchStructure = await activeStructure();
  assert(bookSearchStructure.bottomFixedAction, "book-search primary actions are not in BottomActionHost", failures);
  const bookSearchBeforeState = await page.evaluate(() => ({
    beforeCount: document.querySelectorAll('.fd-active-screen [data-search-state="before"]').length,
    afterCount: document.querySelectorAll('.fd-active-screen [data-search-state="after"]').length,
    resultCount: document.querySelectorAll('.fd-active-screen .fd-search-result-row[data-route="book-detail"]').length,
    actionText: document.querySelector('.fd-active-screen [data-slot="bottomActionHost"]')?.textContent || "",
    topMoreCount: document.querySelectorAll('.fd-active-screen .fd-back-bar button[aria-label="更多"]').length
  }));
  assert(bookSearchBeforeState.beforeCount === 1, "book-search should enter search-before state first", failures);
  assert(bookSearchBeforeState.afterCount === 0, "book-search should not render search-after results before submit", failures);
  assert(bookSearchBeforeState.resultCount === 0, "book-search before state should not render result rows", failures);
  assert(bookSearchBeforeState.actionText.includes("开始搜索"), "book-search before state should expose submit search action", failures);
  assert(bookSearchBeforeState.topMoreCount === 0, "book-search should not inherit an unplanned LibraryShell top more button", failures);

  await page.click('.fd-active-screen [data-search-submit]');
  const bookSearchAfterState = await page.evaluate(() => ({
    beforeCount: document.querySelectorAll('.fd-active-screen [data-search-state="before"]').length,
    afterCount: document.querySelectorAll('.fd-active-screen [data-search-state="after"]').length,
    resultCount: document.querySelectorAll('.fd-active-screen .fd-search-result-row[data-route="book-detail"]').length,
    actionText: document.querySelector('.fd-active-screen [data-slot="bottomActionHost"]')?.textContent || ""
  }));
  assert(bookSearchAfterState.beforeCount === 0, "book-search after submit should hide search-before state", failures);
  assert(bookSearchAfterState.afterCount === 1, "book-search after submit should render search-after state", failures);
  assert(bookSearchAfterState.resultCount >= 6, "book-search after state should render result rows", failures);
  assert(bookSearchAfterState.actionText.includes("重新搜索"), "book-search after state should expose reset search action", failures);

  await page.click('.fd-active-screen .fd-search-result-row[data-route="book-detail"]');
  const detailState = await snapshot();
  assert(detailState.route === "book-detail", "search result did not navigate to book-detail", failures);
  assert(detailState.shell === "LibraryShell", "book-detail did not render LibraryShell", failures);
  const detailStructure = await activeStructure();
  assert(detailStructure.bottomFixedAction, "book-detail primary actions are not in BottomActionHost", failures);
  assert(detailStructure.sheetOwnsSheet, "book-detail sheet is not owned by sheetHost", failures);
  assert(detailStructure.dialogOwnsDialog, "book-detail dialog is not owned by dialogHost", failures);
  assert(!detailStructure.contentHasSheet, "book-detail contentRegion should not own bottom sheet markup", failures);
  assert(!detailStructure.contentHasDialog, "book-detail contentRegion should not own dialog markup", failures);
  const detailPptEntries = await page.evaluate(() => ({
    actionSheetRouteEntryCount: document.querySelectorAll('.fd-active-screen [data-route="book-action-sheet"]').length,
    chapterReaderRouteCount: document.querySelectorAll('.fd-active-screen .fd-chapter-list [data-route="reader"]').length,
    chapterImmersiveRouteCount: document.querySelectorAll('.fd-active-screen .fd-chapter-list [data-route="immersive-reading"]').length,
    topMoreCount: document.querySelectorAll('.fd-active-screen .fd-back-bar button[aria-label="更多"]').length
  }));
  assert(detailPptEntries.actionSheetRouteEntryCount === 0, "book-detail should open operation sheet as overlay, not route to action-sheet structure page", failures);
  assert(detailPptEntries.chapterReaderRouteCount === 0, "book-detail chapter rows should not open reader control layer directly", failures);
  assert(detailPptEntries.chapterImmersiveRouteCount > 0, "book-detail chapter rows should enter immersive reading", failures);
  assert(detailPptEntries.topMoreCount === 0, "book-detail should use declared page operations instead of inherited top more", failures);

  await page.click('.fd-active-screen .fd-chapter-list article[data-route="immersive-reading"]');
  const detailChapterReadState = await snapshot();
  assert(detailChapterReadState.route === "immersive-reading", "book-detail chapter row did not enter immersive-reading", failures);
  assert(detailChapterReadState.shell === "ReaderShell", "book-detail chapter row did not render ReaderShell", failures);
  await page.click("[data-demo-back]");
  assert((await snapshot()).route === "book-detail", "demo back did not restore book-detail after chapter row reading", failures);

  await page.click('.fd-active-screen .fd-inline-route[data-route="book-directory"]');
  const directoryState = await snapshot();
  assert(directoryState.route === "book-directory", "book-detail directory action did not navigate to book-directory", failures);
  assert(directoryState.shell === "LibraryShell", "book-directory did not render LibraryShell", failures);
  const directoryPptEntries = await page.evaluate(() => ({
    chapterReaderRouteCount: document.querySelectorAll('.fd-active-screen .fd-chapter-list [data-route="reader"]').length,
    chapterImmersiveRouteCount: document.querySelectorAll('.fd-active-screen .fd-chapter-list [data-route="immersive-reading"]').length,
    topMoreCount: document.querySelectorAll('.fd-active-screen .fd-back-bar button[aria-label="更多"]').length
  }));
  assert(directoryPptEntries.chapterReaderRouteCount === 0, "book-directory chapter rows should not open reader control layer directly", failures);
  assert(directoryPptEntries.chapterImmersiveRouteCount > 0, "book-directory chapter rows should enter immersive reading", failures);
  assert(directoryPptEntries.topMoreCount === 0, "book-directory must not show top more/search/filter entries", failures);
  await page.click('.fd-active-screen .fd-chapter-list article[data-route="immersive-reading"]');
  const directoryChapterReadState = await snapshot();
  assert(directoryChapterReadState.route === "immersive-reading", "book-directory chapter row did not enter immersive-reading", failures);
  assert(directoryChapterReadState.shell === "ReaderShell", "book-directory chapter row did not render ReaderShell", failures);
  await page.click("[data-demo-back]");
  assert((await snapshot()).route === "book-directory", "demo back did not restore book-directory after chapter row reading", failures);
  await page.click("[data-demo-back]");
  assert((await snapshot()).route === "book-detail", "demo back did not restore book-detail after directory page", failures);

  await page.click('.fd-active-screen .fd-fixed-action-row button[data-route="immersive-reading"]');
  const immersiveState = await snapshot();
  assert(immersiveState.route === "immersive-reading", "book-detail start reading did not navigate directly to immersive-reading", failures);
  assert(immersiveState.shell === "ReaderShell", "immersive-reading did not render ReaderShell", failures);
  const immersiveStructure = await page.evaluate(() => {
    const screen = document.querySelector(".fd-active-screen");
    const surface = screen?.querySelector('[data-slot="readingSurface"]');
    const overlay = screen?.querySelector('[data-slot="readerOverlayHost"]');
    const bottomSheetHost = screen?.querySelector('[data-slot="bottomSheetHost"]');
    const moduleNavHost = screen?.querySelector('[data-slot="readerModuleNav"]');
    return {
      backgroundInSurface: Boolean(surface?.querySelector(".fd-ir-background-layer")),
      readingLayerInSurface: Boolean(surface?.querySelector(".fd-ir-reading-layer")),
      infoLayerInOverlay: Boolean(overlay?.querySelector(".fd-ir-info-layer")),
      tapZonesInOverlay: overlay?.querySelectorAll(".fd-ir-tap-zone-layer .fd-immersive-hotzone").length || 0,
      bottomSheetEmpty: !bottomSheetHost?.textContent.trim(),
      bottomSheetHidden: bottomSheetHost ? window.getComputedStyle(bottomSheetHost).display === "none" : false,
      moduleNavEmpty: !moduleNavHost?.textContent.trim(),
      moduleNavHidden: moduleNavHost ? window.getComputedStyle(moduleNavHost).display === "none" : false,
      noControlFooter: !screen?.querySelector(".fd-reader-control-footer")
    };
  });
  assert(immersiveStructure.backgroundInSurface, "immersive-reading missing background layer in readingSurface", failures);
  assert(immersiveStructure.readingLayerInSurface, "immersive-reading missing reading layout layer in readingSurface", failures);
  assert(immersiveStructure.infoLayerInOverlay, "immersive-reading missing weak info layer in overlay", failures);
  assert(immersiveStructure.tapZonesInOverlay === 3, "immersive-reading should expose three transparent tap zones", failures);
  assert(immersiveStructure.bottomSheetEmpty, "immersive-reading bottomSheetHost should remain empty", failures);
  assert(immersiveStructure.bottomSheetHidden, "immersive-reading empty bottomSheetHost should not be visible", failures);
  assert(immersiveStructure.moduleNavEmpty, "immersive-reading readerModuleNav should remain empty", failures);
  assert(immersiveStructure.moduleNavHidden, "immersive-reading empty readerModuleNav should not be visible", failures);
  assert(immersiveStructure.noControlFooter, "immersive-reading should not reuse reader control footer", failures);
  const firstReaderPage = await readerPageState();
  assert(firstReaderPage.count >= 3, "immersive-reading should expose at least three reader pages", failures);
  assert(firstReaderPage.index === 0, "immersive-reading should start on page 1", failures);
  assert(firstReaderPage.title === "雨夜", "immersive-reading first page should render chapter title", failures);
  assert(firstReaderPage.titleCount === 1, "immersive-reading first page should render exactly one chapter title", failures);
  assert(firstReaderPage.paragraphCount >= 4, "immersive-reading first page should render enough body paragraphs", failures);
  assert(firstReaderPage.pagination === "runtime", "immersive-reading should paginate after measuring rendered text layer", failures);
  assert(firstReaderPage.blankBottom >= 0 && firstReaderPage.blankBottom <= 70, "immersive-reading first page body leaves too much blank space or clips text", failures);
  assert(firstReaderPage.readingSurfaceOutline === "dashed", "developer mode should outline ReadingSurface slot", failures);
  assert(firstReaderPage.readingLayerOutline === "solid", "developer mode should outline ReadingTextLayer region", failures);
  assert(firstReaderPage.devRegionCount >= 8, "developer mode should expose Reader internal render ranges", failures);
  assert(firstReaderPage.slotCount >= 6, "developer mode should expose ReaderShell slot ranges", failures);
  assert(firstReaderPage.readout.includes("第 1 /"), "immersive-reading footer did not show page 1 readout", failures);
  await page.click(".fd-active-screen .fd-hotzone-next");
  const secondReaderPage = await readerPageState();
  assert(secondReaderPage.route === "immersive-reading", "reader next page should not leave immersive-reading route", failures);
  assert(secondReaderPage.index === 1, "reader next page did not advance to page 2", failures);
  assert(secondReaderPage.titleCount === 0, "reader second page should not repeat chapter title", failures);
  assert(secondReaderPage.paragraphCount >= 4, "immersive-reading second page should render enough body paragraphs", failures);
  assert(secondReaderPage.pagination === "runtime", "reader second page should keep runtime pagination", failures);
  assert(secondReaderPage.blankBottom >= 0 && secondReaderPage.blankBottom <= 70, "immersive-reading second page body leaves too much blank space or clips text", failures);
  assert(JSON.stringify(secondReaderPage.paragraphs) !== JSON.stringify(firstReaderPage.paragraphs), "reader next page did not change body text", failures);
  assert(secondReaderPage.readout.includes("第 2 /"), "immersive-reading footer did not show page 2 readout", failures);
  assert(secondReaderPage.turnNext, "reader next page did not expose next-page transition state", failures);
  await page.click(".fd-active-screen .fd-hotzone-next");
  const thirdReaderPage = await readerPageState();
  assert(thirdReaderPage.route === "immersive-reading", "reader third page should not leave immersive-reading route", failures);
  assert(thirdReaderPage.index === 2, "reader next page did not advance to page 3", failures);
  assert(thirdReaderPage.titleCount === 0, "reader third page should not repeat chapter title", failures);
  assert(thirdReaderPage.paragraphCount >= 4, "immersive-reading third page should render enough body paragraphs", failures);
  assert(thirdReaderPage.pagination === "runtime", "reader third page should keep runtime pagination", failures);
  assert(thirdReaderPage.blankBottom >= 0 && thirdReaderPage.blankBottom <= 70, "immersive-reading third page body leaves too much blank space or clips text", failures);
  assert(thirdReaderPage.readout.includes("第 3 /"), "immersive-reading footer did not show page 3 readout", failures);
  await page.click(".fd-active-screen .fd-hotzone-prev");
  await page.click(".fd-active-screen .fd-hotzone-prev");
  const restoredReaderPage = await readerPageState();
  assert(restoredReaderPage.route === "immersive-reading", "reader previous page should not leave immersive-reading route", failures);
  assert(restoredReaderPage.index === 0, "reader previous page did not return to page 1", failures);
  assert(JSON.stringify(restoredReaderPage.paragraphs) === JSON.stringify(firstReaderPage.paragraphs), "reader previous page did not restore first page body text", failures);
  assert(restoredReaderPage.turnPrev, "reader previous page did not expose previous-page transition state", failures);
  await page.waitForTimeout(280);
  const settledReaderPage = await readerPageState();
  assert(!settledReaderPage.turnNext && !settledReaderPage.turnPrev, "reader page-turn animation class should be removed after the one-shot transition", failures);
  const immersiveSurface = await readerSurfaceSignature();
  const immersiveGeometry = await readerSurfaceGeometry();
  assertReaderParagraphFillsLayer(immersiveGeometry, "immersive-reading");

  await page.click(".fd-active-screen .fd-hotzone-center");
  const readerRouteState = await snapshot();
  assert(readerRouteState.route === "reader", "immersive center hot zone did not navigate to reader controls", failures);
  assert(readerRouteState.shell === "ReaderShell", "reader route did not render ReaderShell", failures);
  const readerControlPageState = await readerPageState();
  assert(!readerControlPageState.turnNext && !readerControlPageState.turnPrev, "reader control actions should not replay one-shot page-turn animation", failures);
  assertSameReaderSurface(await readerSurfaceSignature(), immersiveSurface, "reader control layer");
  const readerControlGeometry = await readerSurfaceGeometry();
  assertSameReaderGeometry(readerControlGeometry, immersiveGeometry, "reader control layer");
  assertReaderParagraphFillsLayer(readerControlGeometry, "reader control layer");

  const readerControlStructure = await page.evaluate(() => {
    const sheet = document.querySelector(".fd-reader-sheet");
    const nav = document.querySelector(".fd-reader-module-nav");
    const top = document.querySelector(".fd-reader-top");
    const back = document.querySelector(".fd-reader-top [data-reader-exit]");
    const frame = document.querySelector(".fd-reader-frame");
    const frameRect = frame?.getBoundingClientRect();
    const topRect = top?.getBoundingClientRect();
    const backRect = back?.getBoundingClientRect();
    const hit = backRect
      ? document.elementFromPoint(backRect.left + backRect.width / 2, backRect.top + backRect.height / 2)
      : null;
    const sheetStyle = sheet ? window.getComputedStyle(sheet) : null;
    const topStyle = top ? window.getComputedStyle(top) : null;
    return {
      hasControlMain: Boolean(document.querySelector(".fd-reader-sheet .fd-reader-control-main")),
      hasQuickActions: Boolean(document.querySelector(".fd-reader-sheet .fd-reader-actions")),
      hasChapterPanel: Boolean(document.querySelector(".fd-reader-sheet .fd-reader-chapter-panel")),
      brightnessInSheet: Boolean(sheet && sheet.querySelector(".fd-brightness-rail")),
      moduleNavOutsideSheet: Boolean(sheet && nav && !sheet.contains(nav)),
      chapterActionLabels: Array.from(document.querySelectorAll(".fd-reader-chapter-panel [data-reader-chapter-action]")).map((button) => button.textContent.trim()),
      chapterPageActionCount: document.querySelectorAll(".fd-reader-chapter-panel [data-reader-page-action]").length,
      chapterProgressIsButton: document.querySelector(".fd-reader-chapter-panel [data-reader-chapter-progress]")?.tagName === "BUTTON",
      chapterProgressValue: document.querySelector(".fd-reader-chapter-panel [data-reader-chapter-progress]")?.getAttribute("aria-valuenow") || "",
      chapterProgressLabel: document.querySelector(".fd-reader-chapter-panel [data-reader-chapter-progress]")?.getAttribute("aria-label") || "",
      chapterReadout: document.querySelector(".fd-reader-chapter-panel small")?.textContent || "",
      chapterProgressPointer: document.querySelector(".fd-reader-chapter-panel [data-reader-chapter-progress]")
        ? window.getComputedStyle(document.querySelector(".fd-reader-chapter-panel [data-reader-chapter-progress]")).cursor
        : "",
      topBarHasFourControls: document.querySelectorAll(".fd-reader-top > *").length === 4,
      topOffset: topRect && frameRect ? Math.round(topRect.top - frameRect.top) : null,
      topPointerEvents: topStyle?.pointerEvents || "",
      backHitTargetsExit: Boolean(hit?.closest("[data-reader-exit]")),
      sheetBottomLeftRadius: sheetStyle?.borderBottomLeftRadius || "",
      sheetBottomRightRadius: sheetStyle?.borderBottomRightRadius || ""
    };
  });
  assert(readerControlStructure.hasControlMain, "reader control layer missing control main panel inside bottom sheet", failures);
  assert(readerControlStructure.hasQuickActions, "reader control layer missing quick actions inside bottom sheet", failures);
  assert(readerControlStructure.hasChapterPanel, "reader control layer missing chapter progress panel inside bottom sheet", failures);
  assert(readerControlStructure.brightnessInSheet, "reader control layer brightness rail is not inside bottom sheet", failures);
  assert(readerControlStructure.moduleNavOutsideSheet, "reader module navigation should be separate from bottom sheet content", failures);
  assert(readerControlStructure.chapterActionLabels.join("|") === "上一章|下一章", "reader chapter panel should expose previous/next chapter actions, not page actions", failures);
  assert(readerControlStructure.chapterPageActionCount === 0, "reader chapter panel should not use page-turn actions", failures);
  assert(readerControlStructure.chapterProgressIsButton, "reader chapter progress should be an interactive control", failures);
  assert(Number(readerControlStructure.chapterProgressValue) >= 0, "reader chapter progress should expose aria-valuenow", failures);
  assert(readerControlStructure.chapterProgressLabel === "调整书籍进度", "reader progress control should describe book progress", failures);
  assert(readerControlStructure.chapterReadout.includes("书籍进度"), "reader chapter panel should show book progress only", failures);
  assert(/第\s*\d+\s*\/\s*128\s*章/.test(readerControlStructure.chapterReadout), "reader chapter panel should show current and total chapter count", failures);
  assert(!readerControlStructure.chapterReadout.includes("本章"), "reader chapter panel readout should not show chapter-local progress text", failures);
  assert(!readerControlStructure.chapterReadout.includes("页"), "reader chapter panel readout should not show page count", failures);
  assert(readerControlStructure.chapterProgressPointer === "pointer", "reader chapter progress should expose clickable cursor feedback", failures);
  assert(readerControlStructure.topBarHasFourControls, "reader top bar should expose back, book info, source and more controls", failures);
  assert(readerControlStructure.topOffset !== null && readerControlStructure.topOffset <= 24, "reader top bar leaves too much empty space above controls", failures);
  assert(readerControlStructure.topPointerEvents === "auto", "reader top bar does not accept pointer events", failures);
  assert(readerControlStructure.backHitTargetsExit, "reader top back button is not the topmost clickable target", failures);
  assert(readerControlStructure.sheetBottomLeftRadius !== "0px", "reader bottom sheet missing bottom-left corner radius", failures);
  assert(readerControlStructure.sheetBottomRightRadius !== "0px", "reader bottom sheet missing bottom-right corner radius", failures);

  await page.click(".fd-active-screen .fd-reader-top [data-reader-more-toggle]");
  const readerMoreState = await page.evaluate(() => ({
    route: document.querySelector(".fd-demo")?.getAttribute("data-current-route") || "",
    expanded: document.querySelector(".fd-reader-top [data-reader-more-toggle]")?.getAttribute("aria-expanded") || "",
    menuCount: document.querySelectorAll(".fd-reader-more-menu").length,
    itemLabels: Array.from(document.querySelectorAll(".fd-reader-more-menu [data-reader-more-action] strong")).map((node) => node.textContent || ""),
    menuTop: Math.round(document.querySelector(".fd-reader-more-menu")?.getBoundingClientRect().top || 0),
    topBottom: Math.round(document.querySelector(".fd-reader-top")?.getBoundingClientRect().bottom || 0)
  }));
  assert(readerMoreState.route === "reader", "reader more menu should not navigate away from reader route", failures);
  assert(readerMoreState.expanded === "true", "reader more toggle did not expose expanded state", failures);
  assert(readerMoreState.menuCount === 1, "reader top more did not open exactly one anchored menu", failures);
  for (const label of ["刷新本章", "刷新目录", "打开来源页", "复制本章链接", "书籍缓存", "调试信息"]) {
    assert(readerMoreState.itemLabels.includes(label), `reader more menu missing ${label}`, failures);
  }
  assert(readerMoreState.menuTop >= readerMoreState.topBottom - 4, "reader more menu should be anchored below the reader top bar", failures);
  await page.click(".fd-active-screen [data-reader-more-close]");
  const readerMoreClosed = await page.evaluate(() => document.querySelectorAll(".fd-reader-more-menu").length);
  assert(readerMoreClosed === 0, "reader more menu did not close from backdrop", failures);

  await page.click(".fd-active-screen .fd-reader-dismiss-zone");
  const dismissState = await snapshot();
  assert(dismissState.route === "immersive-reading", "reader body center click did not hide controls and return to immersive reading", failures);
  assertSameReaderSurface(await readerSurfaceSignature(), immersiveSurface, "dismissed immersive reading");
  assertSameReaderGeometry(await readerSurfaceGeometry(), immersiveGeometry, "dismissed immersive reading");
  await page.click(".fd-active-screen .fd-hotzone-center");
  const reopenReaderState = await snapshot();
  assert(reopenReaderState.route === "reader", "immersive center hot zone did not reopen reader controls after dismiss", failures);
  assertSameReaderSurface(await readerSurfaceSignature(), immersiveSurface, "reopened reader control layer");
  assertSameReaderGeometry(await readerSurfaceGeometry(), immersiveGeometry, "reopened reader control layer");

  await page.click('.fd-active-screen .fd-reader-actions button[data-quick-action="search"]');
  await expectReaderLoadingTransition("content-search quick action");
  const contentSearchState = await snapshot();
  assert(contentSearchState.route === "content-search", "reader search quick action did not navigate to content-search", failures);
  assert(contentSearchState.shell === "ReaderShell", "content-search did not stay in ReaderShell", failures);
  assertSameReaderSurface(await readerSurfaceSignature(), immersiveSurface, "content-search quick action");
  assertSameReaderGeometry(await readerSurfaceGeometry(), immersiveGeometry, "content-search quick action");
  const contentSearchStructure = await activeStructure();
  assert(contentSearchStructure.quickDetailText.includes("内容搜索"), "content-search did not render its own quick detail panel", failures);
  assert(contentSearchStructure.modulePanelInSheet, "content-search did not render quick panel inside bottom sheet", failures);
  assert(contentSearchStructure.activeModuleCount === 0, "content-search should not activate reader module navigation", failures);
  await page.click("[data-demo-back]");
  assert((await snapshot()).route === "reader", "demo back did not restore reader route after content-search", failures);

  await page.click('.fd-active-screen .fd-reader-actions button[data-quick-action="auto-page"]');
  await expectReaderLoadingTransition("auto-page quick action");
  const autoPageState = await snapshot();
  assert(autoPageState.route === "auto-page", "auto-page quick action did not navigate to auto-page", failures);
  assertSameReaderSurface(await readerSurfaceSignature(), immersiveSurface, "auto-page quick action");
  assertSameReaderGeometry(await readerSurfaceGeometry(), immersiveGeometry, "auto-page quick action");
  const autoPageStructure = await activeStructure();
  assert(autoPageStructure.quickDetailText.includes("自动翻页"), "auto-page did not render its own quick detail panel", failures);
  assert(autoPageStructure.modulePanelInSheet, "auto-page did not render quick panel inside bottom sheet", failures);
  assert(autoPageStructure.activeModuleCount === 0, "auto-page should not activate reader module navigation", failures);
  await page.click("[data-demo-back]");
  assert((await snapshot()).route === "reader", "demo back did not restore reader route after auto-page", failures);

  await page.click('.fd-active-screen .fd-reader-actions button[data-quick-action="replace"]');
  await expectReaderLoadingTransition("content-replacement quick action");
  const replacementState = await snapshot();
  assert(replacementState.route === "content-replacement", "replace quick action did not navigate to content-replacement", failures);
  assertSameReaderSurface(await readerSurfaceSignature(), immersiveSurface, "content-replacement quick action");
  assertSameReaderGeometry(await readerSurfaceGeometry(), immersiveGeometry, "content-replacement quick action");
  const replacementStructure = await activeStructure();
  assert(replacementStructure.quickDetailText.includes("内容替换"), "content-replacement did not render its own quick detail panel", failures);
  assert(replacementStructure.modulePanelInSheet, "content-replacement did not render quick panel inside bottom sheet", failures);
  assert(replacementStructure.activeModuleCount === 0, "content-replacement should not activate reader module navigation", failures);

  await page.click("[data-demo-back]");
  const readerAfterQuickBackState = await snapshot();
  assert(readerAfterQuickBackState.route === "reader", "demo back did not restore reader route after quick actions", failures);

  const readerRectsBefore = await page.evaluate(() => {
    const frameRect = document.querySelector(".fd-reader-frame")?.getBoundingClientRect();
    return Array.from(document.querySelectorAll(".fd-reader-module")).map((button) => {
    const rect = button.getBoundingClientRect();
    return {
      route: button.getAttribute("data-route"),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      left: Math.round(rect.left - (frameRect?.left || 0)),
      top: Math.round(rect.top - (frameRect?.top || 0)),
      active: button.classList.contains("is-active")
    };
    });
  });

  const moduleExpectations = [
    { route: "toc-bookmarks", label: "目录", module: "directory", compactControlMin: 7, maxListRowHeight: 38 },
    { route: "tts", label: "朗读", module: "tts", compactControlMin: 7, maxListRowHeight: 0 },
    { route: "reader-appearance", label: "界面", module: "appearance", compactControlMin: 13, maxListRowHeight: 0 },
    { route: "reader-settings", label: "设置", module: "settings", compactControlMin: 6, maxListRowHeight: 0 }
  ];
  for (const expected of moduleExpectations) {
    await page.click(`.fd-active-screen .fd-reader-module[data-route="${expected.route}"]`);
    await expectReaderLoadingTransition(`${expected.route} module navigation`);
    const moduleState = await snapshot();
    assert(moduleState.route === expected.route, `reader module did not navigate to ${expected.route}`, failures);
    assert(moduleState.shell === "ReaderShell", `${expected.route} did not stay in ReaderShell`, failures);
    assertSameReaderSurface(await readerSurfaceSignature(), immersiveSurface, `${expected.route} module navigation`);
    assertSameReaderGeometry(await readerSurfaceGeometry(), immersiveGeometry, `${expected.route} module navigation`);
    const moduleStructure = await activeStructure();
    assert(moduleStructure.modulePanelInSheet, `${expected.route} did not render module panel inside bottom sheet`, failures);
    assert(moduleStructure.modulePanelText.includes(expected.label), `${expected.route} module panel did not render ${expected.label}`, failures);
    assert(!moduleStructure.defaultQuickActionsVisible, `${expected.route} should replace default quick actions with module panel`, failures);
    assert(moduleStructure.activeModuleCount === 1, `${expected.route} active module count is not stable`, failures);
    assert(moduleStructure.moduleCompactControlCount >= expected.compactControlMin, `${expected.route} module panel does not expose enough compact controls`, failures);
    if (expected.maxListRowHeight) {
      assert(moduleStructure.moduleMaxListRowHeight > 0 && moduleStructure.moduleMaxListRowHeight <= expected.maxListRowHeight, `${expected.route} module list rows are too tall for compact control pages`, failures);
    }
    if (expected.route === "toc-bookmarks") {
      await page.click('.fd-active-screen [data-reader-toc-mode="bookmark"]');
      const bookmarkSegmentState = await activeStructure();
      assert(bookmarkSegmentState.modulePanelText.includes("书签"), "bookmark segment did not replace directory quick panel content", failures);
      assert((await snapshot()).route === "toc-bookmarks", "bookmark segment should stay inside toc-bookmarks route", failures);
      await page.click('.fd-active-screen [data-reader-toc-mode="directory"]');
    }
    const activeModule = await page.evaluate(() => document.querySelector(".fd-reader-module.is-active")?.getAttribute("data-module") || "");
    assert(activeModule === expected.module, `${expected.route} did not keep ${expected.module} module active`, failures);

    const readerRectsAfter = await page.evaluate(() => {
      const frameRect = document.querySelector(".fd-reader-frame")?.getBoundingClientRect();
      return Array.from(document.querySelectorAll(".fd-reader-module")).map((button) => {
      const rect = button.getBoundingClientRect();
      return {
        route: button.getAttribute("data-route"),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        left: Math.round(rect.left - (frameRect?.left || 0)),
        top: Math.round(rect.top - (frameRect?.top || 0))
      };
      });
    });
    if (readerRectsBefore.length === readerRectsAfter.length) {
      readerRectsBefore.forEach((before, index) => {
        const after = readerRectsAfter[index];
        assert(after.width === before.width, `reader module ${after.route} width changed after ${expected.route}`, failures);
        assert(after.height === before.height, `reader module ${after.route} height changed after ${expected.route}`, failures);
        assert(after.left === before.left, `reader module ${after.route} left changed after ${expected.route}`, failures);
        assert(after.top === before.top, `reader module ${after.route} top changed after ${expected.route}`, failures);
      });
    }
  }

  await page.click("[data-demo-back]");
  await page.click("[data-demo-back]");
  await page.click("[data-demo-back]");
  await page.click("[data-demo-back]");
  const readerBackState = await snapshot();
  assert(readerBackState.route === "reader", "demo back did not restore reader route after module navigation", failures);

  const chapterControlBefore = await page.evaluate(() => ({
    chapter: document.querySelector(".fd-reader-chapter-panel [data-reader-current-chapter]")?.textContent || "",
    progress: document.querySelector(".fd-reader-chapter-panel [data-reader-chapter-progress]")?.getAttribute("aria-valuenow") || "",
    readout: document.querySelector(".fd-reader-chapter-panel small")?.textContent || ""
  }));
  await page.click('.fd-active-screen .fd-reader-chapter-panel [data-reader-chapter-action="next"]');
  const chapterControlAfterNext = await page.evaluate(() => ({
    chapter: document.querySelector(".fd-reader-chapter-panel [data-reader-current-chapter]")?.textContent || "",
    progress: document.querySelector(".fd-reader-chapter-panel [data-reader-chapter-progress]")?.getAttribute("aria-valuenow") || "",
    readout: document.querySelector(".fd-reader-chapter-panel small")?.textContent || ""
  }));
  assert(chapterControlAfterNext.chapter !== chapterControlBefore.chapter, "reader next chapter action did not change current chapter", failures);
  assert(chapterControlAfterNext.chapter.includes("第 33 章"), "reader next chapter action did not move to the next chapter", failures);
  assert(Number(chapterControlAfterNext.progress) > Number(chapterControlBefore.progress), "reader next chapter action should advance book progress instead of resetting it", failures);
  assert(chapterControlAfterNext.readout.includes("书籍进度"), "reader next chapter readout should keep book progress", failures);
  assert(!chapterControlAfterNext.readout.includes("本章") && !chapterControlAfterNext.readout.includes("页"), "reader next chapter readout is too verbose", failures);

  const progressBox = await page.locator(".fd-active-screen .fd-reader-chapter-panel [data-reader-chapter-progress]").boundingBox();
  assert(Boolean(progressBox), "reader chapter progress control was not visible for interaction", failures);
  if (progressBox) {
    await page.mouse.move(progressBox.x + progressBox.width * 0.52, progressBox.y + progressBox.height / 2);
    await page.mouse.down();
    await page.mouse.up();
  }
  const chapterProgressAfterSeek = await page.evaluate(() => ({
    progress: Number(document.querySelector(".fd-reader-chapter-panel [data-reader-chapter-progress]")?.getAttribute("aria-valuenow") || 0),
    readout: document.querySelector(".fd-reader-chapter-panel small")?.textContent || ""
  }));
  assert(chapterProgressAfterSeek.progress >= 45 && chapterProgressAfterSeek.progress <= 60, "reader chapter progress control did not update progress from pointer interaction", failures);
  assert(chapterProgressAfterSeek.readout.includes("书籍进度"), "reader chapter progress readout did not stay tied to book progress", failures);
  assert(!chapterProgressAfterSeek.readout.includes("本章") && !chapterProgressAfterSeek.readout.includes("页"), "reader chapter progress readout is too verbose", failures);

  await page.click('.fd-active-screen .fd-reader-module[data-route="reader-appearance"]');
  await expectReaderLoadingTransition("reader typography controls");
  const typographyPanelState = await snapshot();
  assert(typographyPanelState.route === "reader-appearance", "reader appearance module did not open for typography controls", failures);
  const typographyBefore = await readerTypographyStyles();
  await page.click('.fd-active-screen [data-reader-typography-action="font-size-increase"]');
  const typographyAfterFont = await readerTypographyStyles();
  assert(typographyAfterFont.fontSizeValue > typographyBefore.fontSizeValue, "font size control did not update reading text", failures);
  assert((await snapshot()).route === "reader-appearance", "font size control should keep reader appearance route", failures);
  await page.click('.fd-active-screen [data-reader-typography-action="line-height-increase"]');
  const typographyAfterLine = await readerTypographyStyles();
  assert(typographyAfterLine.lineHeightValue > typographyAfterFont.lineHeightValue, "line-height control did not update reading text", failures);
  await page.click('.fd-active-screen [data-reader-typography-set="fontFamily"][data-reader-typography-value="sans"]');
  const typographyAfterFontFamily = await readerTypographyStyles();
  assert(typographyAfterFontFamily.fontFamily !== typographyAfterLine.fontFamily, "font family control did not update reading text", failures);
  await page.click("[data-demo-back]");
  assert((await snapshot()).route === "reader", "demo back did not restore reader route after typography controls", failures);

  await page.click('.fd-active-screen .fd-reader-top button[data-route="source-switch"]');
  const flowRouteState = await snapshot();
  assert(flowRouteState.route === "source-switch", "reader source button did not navigate to source-switch", failures);
  assert(flowRouteState.shell === "FlowShell", "source-switch did not render FlowShell", failures);
  const sourceSwitchWindow = await page.evaluate(() => ({
    hasWindow: Boolean(document.querySelector(".fd-source-switch-window")),
    hasReaderContinuation: Boolean(document.querySelector(".fd-source-reader-continuity .fd-ir-reading-layer")),
    hasControlTopBar: Boolean(document.querySelector(".fd-source-control-continuity .fd-reader-top")),
    hasControlBottomPanel: Boolean(document.querySelector(".fd-source-control-continuity .fd-source-control-sheet .fd-reader-control-main")),
    hasControlModuleNav: Boolean(document.querySelector(".fd-source-control-continuity .fd-source-control-nav .fd-reader-module")),
    hasDimLayer: Boolean(document.querySelector(".fd-source-continuity-dim")),
    hasResultPanel: (() => {
      const panel = document.querySelector(".fd-source-switch-result");
      const rect = panel?.getBoundingClientRect();
      const style = panel ? window.getComputedStyle(panel) : null;
      return Boolean(panel && rect && rect.width > 0 && rect.height > 0 && style?.display !== "none");
    })(),
    candidateCount: document.querySelectorAll(".fd-source-candidate-list article[data-source-index]").length,
    filterCount: document.querySelectorAll(".fd-source-switch-window nav button").length,
    hasReadingPreview: Boolean(document.querySelector(".fd-source-reading-preview")),
    checkChipCount: document.querySelectorAll(".fd-source-row-checks em").length,
    rowButtonCount: document.querySelectorAll(".fd-source-candidate-list article button").length,
    readerOpacity: window.getComputedStyle(document.querySelector(".fd-source-reader-continuity .fd-ir-reading-layer") || document.body).opacity,
    windowShadow: window.getComputedStyle(document.querySelector(".fd-source-switch-window") || document.body).boxShadow,
    selectedBackground: window.getComputedStyle(document.querySelector(".fd-source-candidate-list article.is-selected") || document.body).backgroundColor,
    rowText: Array.from(document.querySelectorAll(".fd-source-candidate-list article")).map((row) => row.textContent || ""),
    rowLatency: Array.from(document.querySelectorAll(".fd-source-candidate-list article")).map((row) => {
      const text = row.textContent || "";
      const match = text.match(/延迟\s*(\d+(?:\.\d+)?)/);
      return match ? Number.parseFloat(match[1]) : Number.MAX_SAFE_INTEGER;
    }),
    geometry: (() => {
      const rectFor = (selector) => {
        const rect = document.querySelector(selector)?.getBoundingClientRect();
        return rect ? {
          top: Math.round(rect.top),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        } : null;
      };
      return {
        window: rectFor(".fd-source-window-slot"),
        topBar: rectFor(".fd-source-control-continuity .fd-reader-top"),
        bottomSheet: rectFor(".fd-source-control-continuity .fd-reader-sheet")
      };
    })(),
    flowFrame: (() => {
      const rect = document.querySelector(".fd-flow-frame")?.getBoundingClientRect();
      return rect ? { width: Math.round(rect.width), height: Math.round(rect.height) } : null;
    })(),
    stateHostText: document.querySelector(".fd-flow-state-summary")?.textContent || "",
    detectText: document.querySelector(".fd-source-detect-strip")?.textContent || ""
  }));
  assert(sourceSwitchWindow.hasWindow, "source-switch missing formal source switch window", failures);
  assert(sourceSwitchWindow.hasReaderContinuation, "source-switch should continue the same reader surface behind the window", failures);
  assert(sourceSwitchWindow.hasControlTopBar, "source-switch should keep reader control top bar behind the window", failures);
  assert(sourceSwitchWindow.hasControlBottomPanel, "source-switch should keep reader control bottom panel behind the window", failures);
  assert(sourceSwitchWindow.hasControlModuleNav, "source-switch should keep reader module nav behind the window", failures);
  assert(!sourceSwitchWindow.hasDimLayer, "source-switch should not add a dim/highlight focus layer over the reader controls", failures);
  assert(!sourceSwitchWindow.hasResultPanel, "source-switch should not render a separate result confirmation panel", failures);
  assert(sourceSwitchWindow.candidateCount >= 4, "source-switch should expose current, switchable, cached and stale candidates", failures);
  assert(sourceSwitchWindow.filterCount === 0, "source-switch should not expose filter or sort tabs", failures);
  assert(!sourceSwitchWindow.hasReadingPreview, "source-switch should not render reading body content", failures);
  assert(sourceSwitchWindow.checkChipCount === 0, "source-switch rows should not render multi-step check chips", failures);
  assert(sourceSwitchWindow.rowButtonCount === 0, "source-switch rows should use row selection instead of extra per-row buttons", failures);
  assert(sourceSwitchWindow.rowText.every((text) => text.includes("最新章节")), "source-switch rows should show latest chapter on the second line", failures);
  assert(sourceSwitchWindow.rowLatency[0] <= sourceSwitchWindow.rowLatency[1], "source-switch candidates should be sorted by latency ascending", failures);
  assert(
    Number.parseFloat(sourceSwitchWindow.readerOpacity) >= 0.99,
    `source-switch should not fade the reading body behind the window, got opacity ${sourceSwitchWindow.readerOpacity}`,
    failures
  );
  assert(sourceSwitchWindow.windowShadow === "none", "source-switch window should use reader-control panel styling, not modal shadow focus", failures);
  assert(!sourceSwitchWindow.selectedBackground.includes("35, 121, 164"), "source-switch selection should not use blue focused-card highlight", failures);
  assert(
    sourceSwitchWindow.geometry.window &&
      sourceSwitchWindow.geometry.topBar &&
      sourceSwitchWindow.geometry.bottomSheet &&
      sourceSwitchWindow.geometry.window.top >= sourceSwitchWindow.geometry.topBar.bottom + 8 &&
      sourceSwitchWindow.geometry.window.bottom <= sourceSwitchWindow.geometry.bottomSheet.top - 8,
    "source-switch window should stay in the reading body area without overlapping reader controls",
    failures
  );
  assert(sourceSwitchWindow.flowFrame && sourceSwitchWindow.flowFrame.width <= 430 && sourceSwitchWindow.flowFrame.height <= 900, "source-switch should keep a fixed phone-page canvas size", failures);
  assert(!sourceSwitchWindow.stateHostText.includes("FlowShell StateHost"), "source-switch should not render bottom FlowShell state summary", failures);
  assert(!sourceSwitchWindow.detectText.includes("候选源检测"), "source-switch should not render candidate detection status strip", failures);

  await page.click('.fd-flow-comparison article[data-source-index="1"]');
  const flowState = await page.evaluate(() => ({
    selectedCount: document.querySelectorAll(".fd-flow-comparison article.is-selected").length
  }));
  assert(flowState.selectedCount === 1, "flow source selection did not keep one selected candidate", failures);

  await page.click('.fd-active-screen .fd-source-window-close[data-route="reader"]');
  const flowReturnState = await snapshot();
  assert(flowReturnState.route === "reader", "source-switch close did not return to reader route", failures);

  await page.reload({ waitUntil: "load" });
  const bookshelfStructureAfterReload = await page.evaluate(() => ({
    route: document.querySelector(".fd-demo")?.getAttribute("data-current-route") || "",
    emptyStateRouteCount: document.querySelectorAll('.fd-active-screen .fd-structure-actions button[data-route="bookshelf-empty"]').length,
    groupRouteCount: document.querySelectorAll('.fd-active-screen .fd-structure-actions button[data-route="group-management"]').length,
    importRouteCount: document.querySelectorAll('.fd-active-screen .fd-structure-actions button[data-route="local-import"]').length,
    sortRouteCount: document.querySelectorAll('.fd-active-screen .fd-section-head button[data-route="sort-filter"]').length,
    visualToolCount: document.querySelectorAll(".fd-active-screen .fd-section-head button").length,
    settingsToolCount: document.querySelectorAll('.fd-active-screen .fd-section-head button[data-route="bookshelf-search-settings"]').length
  }));
  assert(bookshelfStructureAfterReload.route === "bookshelf", "frontend demo reload did not restore bookshelf route", failures);
  assert(bookshelfStructureAfterReload.emptyStateRouteCount === 0, "bookshelf action area should not expose empty-state route", failures);
  assert(bookshelfStructureAfterReload.groupRouteCount === 0, "bookshelf home should not expose group-management as a primary structure action", failures);
  assert(bookshelfStructureAfterReload.importRouteCount === 0, "bookshelf home should not expose local-import as a primary structure action", failures);
  assert(bookshelfStructureAfterReload.sortRouteCount === 0, "bookshelf home should not expose sort-filter from compact visual tools", failures);
  assert(bookshelfStructureAfterReload.visualToolCount === 3, "bookshelf home should keep three compact visual tools after reload", failures);
  assert(bookshelfStructureAfterReload.settingsToolCount === 1, "bookshelf home should keep one settings tool after reload", failures);

  await page.click('.fd-active-screen .fd-section-head button[data-route="bookshelf-search-settings"]');
  const bookshelfSettingsState = await snapshot();
  assert(bookshelfSettingsState.route === "bookshelf-search-settings", "bookshelf settings tool did not navigate to bookshelf-search-settings", failures);
  assert(bookshelfSettingsState.shell === "SettingsShell", "bookshelf-search-settings did not render SettingsShell", failures);
  await page.click("[data-demo-back]");
  const bookshelfAfterSettingsBack = await snapshot();
  assert(bookshelfAfterSettingsBack.route === "bookshelf", "demo back did not restore bookshelf after bookshelf settings", failures);

  const bookshelfStructureAfterBack = await page.evaluate(() => ({
    emptyStateRouteCount: document.querySelectorAll('.fd-active-screen .fd-structure-actions button[data-route="bookshelf-empty"]').length,
    groupRouteCount: document.querySelectorAll('.fd-active-screen .fd-structure-actions button[data-route="group-management"]').length,
    importRouteCount: document.querySelectorAll('.fd-active-screen .fd-structure-actions button[data-route="local-import"]').length
  }));
  assert(bookshelfStructureAfterBack.emptyStateRouteCount === 0, "bookshelf action area should not expose empty-state route", failures);
  assert(bookshelfStructureAfterBack.groupRouteCount === 0, "bookshelf action area should not expose group-management route", failures);
  assert(bookshelfStructureAfterBack.importRouteCount === 0, "bookshelf action area should not expose local-import route", failures);

  await page.reload({ waitUntil: "load" });
  await page.click('.fd-active-screen .fd-top-actions button[aria-label="search"]');
  await page.click(".fd-active-screen [data-open-keyboard]");
  await page.waitForTimeout(220);
  const keyboardState = await page.evaluate(() => {
    const phone = document.querySelector(".fd-library-phone");
    const target = phone.querySelector("[data-open-keyboard]");
    const keyboard = phone.querySelector("[data-keyboard-host]");
    const targetRect = target.getBoundingClientRect();
    const keyboardRect = keyboard.getBoundingClientRect();
    return {
      phoneHasKeyboard: phone.classList.contains("has-keyboard"),
      hidden: keyboard.getAttribute("aria-hidden"),
      targetVisibleAboveKeyboard: Math.round(targetRect.bottom) < Math.round(keyboardRect.top),
      activeElementIsInput: document.activeElement === phone.querySelector("[data-keyboard-input]")
    };
  });
  assert(keyboardState.phoneHasKeyboard, "frontend demo keyboard did not mark phone state", failures);
  assert(keyboardState.hidden === "false", "frontend demo keyboard aria-hidden did not open", failures);
  assert(keyboardState.targetVisibleAboveKeyboard, "frontend demo keyboard covers the active search target", failures);
  assert(keyboardState.activeElementIsInput, "frontend demo keyboard did not focus the input", failures);

  await page.click("[data-close-keyboard]");
  const keyboardClosedState = await page.evaluate(() => ({
    phoneHasKeyboard: document.querySelector(".fd-library-phone")?.classList.contains("has-keyboard"),
    hidden: document.querySelector("[data-keyboard-host]")?.getAttribute("aria-hidden")
  }));
  assert(!keyboardClosedState.phoneHasKeyboard, "frontend demo keyboard did not clear phone state", failures);
  assert(keyboardClosedState.hidden === "true", "frontend demo keyboard aria-hidden did not close", failures);

  await page.reload({ waitUntil: "load" });
  await longPressFirstBookCover();
  await page.click('.fd-active-screen [data-book-focus-layer] [data-route="book-detail"]');
  const detailFromFocusState = await snapshot();
  assert(detailFromFocusState.route === "book-detail", "book focus detail action did not navigate to book-detail", failures);
  assert(detailFromFocusState.shell === "LibraryShell", "book focus detail action did not render LibraryShell", failures);
  const focusedDetailPptEntries = await page.evaluate(() => ({
    actionSheetRouteEntryCount: document.querySelectorAll('.fd-active-screen [data-route="book-action-sheet"]').length
  }));
  assert(focusedDetailPptEntries.actionSheetRouteEntryCount === 0, "book-detail should not expose standalone action-sheet route from focused book flow", failures);

  await page.click("[data-open-sheet]");
  await page.waitForTimeout(220);
  const sheetState = await page.evaluate(() => {
    const phone = document.querySelector(".fd-library-phone");
    const sheet = phone.querySelector("[data-demo-sheet]");
    return {
      phoneHasSheet: phone.classList.contains("has-sheet"),
      hidden: sheet.getAttribute("aria-hidden"),
      sheetZ: Number(window.getComputedStyle(sheet).zIndex)
    };
  });
  assert(sheetState.phoneHasSheet, "frontend demo sheet did not mark phone state", failures);
  assert(sheetState.hidden === "false", "frontend demo sheet aria-hidden did not open", failures);

  await page.click("[data-close-sheet]");
  await page.waitForTimeout(80);
  await page.click("[data-open-dialog]");
  const dialogState = await page.evaluate(() => {
    const phone = document.querySelector(".fd-library-phone");
    const sheet = phone.querySelector("[data-demo-sheet]");
    const dialog = phone.querySelector("[data-demo-dialog]");
    return {
      phoneHasDialog: phone.classList.contains("has-dialog"),
      hidden: dialog.getAttribute("aria-hidden"),
      sheetZ: Number(window.getComputedStyle(sheet).zIndex),
      dialogZ: Number(window.getComputedStyle(dialog).zIndex)
    };
  });
  assert(dialogState.phoneHasDialog, "frontend demo dialog did not mark phone state", failures);
  assert(dialogState.hidden === "false", "frontend demo dialog aria-hidden did not open", failures);
  assert(dialogState.dialogZ > dialogState.sheetZ, "frontend demo dialog is not above bottom sheet", failures);

  await page.click("[data-close-dialog]");
  const overlayClosedState = await page.evaluate(() => {
    const phone = document.querySelector(".fd-library-phone");
    return {
      hasSheet: phone.classList.contains("has-sheet"),
      hasDialog: phone.classList.contains("has-dialog"),
      sheetHidden: phone.querySelector("[data-demo-sheet]").getAttribute("aria-hidden"),
      dialogHidden: phone.querySelector("[data-demo-dialog]").getAttribute("aria-hidden")
    };
  });
  assert(!overlayClosedState.hasSheet, "frontend demo sheet state did not clear", failures);
  assert(!overlayClosedState.hasDialog, "frontend demo dialog state did not clear", failures);
  assert(overlayClosedState.sheetHidden === "true", "frontend demo sheet aria-hidden did not close", failures);
  assert(overlayClosedState.dialogHidden === "true", "frontend demo dialog aria-hidden did not close", failures);

  await page.reload({ waitUntil: "load" });
  await page.click('.fd-active-screen .fd-book-card [data-book-cover]');
  await page.click(".fd-active-screen .fd-hotzone-center");
  await page.click(".fd-active-screen .fd-reader-top [data-reader-exit]");
  const readerExitState = await snapshot();
  assert(readerExitState.route === "bookshelf", "reader top back did not exit ReaderShell to the previous non-reader page", failures);
  assert(readerExitState.shell === "MainTabShell", "reader top back did not return to MainTabShell from bookshelf entry", failures);

  await page.reload({ waitUntil: "load" });
  await page.click('.fd-active-screen .fd-main-nav-item[data-nav-type="settings"]');
  const settingsState = await snapshot();
  assert(settingsState.route === "settings", "main tab nav did not navigate to settings", failures);
  assert(settingsState.shell === "MainTabShell", "settings tab did not stay in MainTabShell", failures);
  assert(settingsState.stackSize === "1", "main tab navigation should replace the root tab instead of pushing back stack", failures);
  const settingsTopActions = await page.evaluate(() => Array.from(document.querySelectorAll(".fd-active-screen .fd-top-actions button")).map((button) => button.getAttribute("data-top-action") || ""));
  assert(settingsTopActions.length === 0, "settings tab should not expose placeholder search/more top actions", failures);

  const settingsSecondaryExpectations = [
    { route: "settings-general", texts: ["通用设置", "基础偏好", "App主题", "启动时打开", "自动检查更新", "崩溃日志", "恢复默认"], sections: ["基础偏好", "行为与反馈"], optionDropdownMin: 1, dialogTriggerMin: 1 },
    { route: "bookshelf-search-settings", texts: ["书架与搜索", "默认展示", "封面列数", "封面模式预览", "搜索范围", "结果排序", "搜索历史", "清空搜索历史"], sections: ["书架", "搜索"], optionDropdownMin: 1, dialogTriggerMin: 1 },
    { route: "privacy-permissions", texts: ["文件访问", "通知权限", "网络访问说明", "去设置", "隐私开关", "清除隐私数据"], sections: ["系统权限", "隐私设置", "数据与说明"], dialogTriggerMin: 1 },
    { route: "about-feedback", texts: ["当前版本", "个人开源", "检查更新", "问题反馈", "功能建议", "源码仓库", "开源许可", "导出诊断日志"], sections: ["项目与版本", "反馈与支持", "开源与贡献"], metricMin: 4, dialogTriggerMin: 3 },
    { route: "sync-backup", texts: ["同步与备份", "服务器地址", "测试 WebDAV", "保存配置", "WebDAV · 2026-06-23 08:00", "本地 · 2026-06-23 10:30", "恢复范围"], sections: ["WebDAV 配置", "恢复数据", "恢复范围"], dialogTriggerMin: 1, restoreRowsMin: 4 },
    { route: "source-management", texts: ["书源管理", "搜索书源名称或域名", "全部分组", "起点中文网", "启用", "异常", "批量管理", "新增书源"], sourceRowsMin: 8 }
  ];
  for (const expected of settingsSecondaryExpectations) {
    await page.click(`.fd-active-screen .fd-setting-row[data-route="${expected.route}"]`);
    const secondaryState = await snapshot();
    assert(secondaryState.route === expected.route, `settings row did not navigate to ${expected.route}`, failures);
    assert(secondaryState.shell === "SettingsShell", `${expected.route} did not render SettingsShell`, failures);
    const secondaryDetails = await page.evaluate(() => ({
      text: document.querySelector(".fd-active-screen")?.textContent || "",
      sections: Array.from(document.querySelectorAll(".fd-active-screen .fd-setting-section h2")).map((node) => node.textContent || ""),
      sheetTriggers: document.querySelectorAll('.fd-active-screen [data-settings-overlay="sheet"]').length,
      optionRows: document.querySelectorAll(".fd-active-screen [data-settings-option-key]").length,
      optionDropdownRows: document.querySelectorAll(".fd-active-screen [data-settings-option-dropdown]").length,
      dialogTriggers: document.querySelectorAll('.fd-active-screen [data-settings-overlay^="dialog"]').length,
      metricCount: document.querySelectorAll(".fd-active-screen .fd-settings-metric-grid article").length,
      sourceRows: document.querySelectorAll(".fd-active-screen .fd-settings-source-row, .fd-active-screen .fd-source-row").length,
      restoreRows: document.querySelectorAll(".fd-active-screen [data-restore-record]").length,
      records: document.querySelectorAll(".fd-active-screen .fd-settings-record-list article").length,
      subpanels: document.querySelectorAll(".fd-active-screen .fd-settings-subpanel").length
    }));
    for (const text of expected.texts) {
      assert(secondaryDetails.text.includes(text), `${expected.route} missing original UI planning text ${text}`, failures);
    }
    for (const section of expected.sections || []) {
      assert(secondaryDetails.sections.includes(section), `${expected.route} missing settings section ${section}`, failures);
    }
    assert(secondaryDetails.sheetTriggers === 0, `${expected.route} should not use bottom option sheet triggers for compact setting options`, failures);
    if (expected.optionDropdownMin) {
      assert(secondaryDetails.optionRows >= expected.optionDropdownMin, `${expected.route} missing option dropdown rows`, failures);
      await page.click(".fd-active-screen [data-settings-option-key]");
      const dropdownState = await page.evaluate(() => {
        const row = document.querySelector(".fd-active-screen .fd-setting-row.is-option-open");
        const dropdown = document.querySelector(".fd-active-screen [data-settings-option-dropdown]");
        const rowValue = row?.querySelector(".fd-settings-value");
        const buttons = Array.from(document.querySelectorAll(".fd-active-screen [data-settings-option-dropdown] button"));
        const rowBox = row?.getBoundingClientRect();
        const dropdownBox = dropdown?.getBoundingClientRect();
        const dropdownStyle = dropdown ? getComputedStyle(dropdown) : null;
        const valueFontSize = rowValue ? getComputedStyle(rowValue).fontSize : "";
        const buttonFontSizes = buttons.map((button) => getComputedStyle(button).fontSize);
        const currentValue = rowValue?.textContent?.trim() || "";
        return {
        hasSheet: document.querySelector(".fd-settings-phone")?.classList.contains("has-sheet"),
        dropdownCount: document.querySelectorAll(".fd-active-screen [data-settings-option-dropdown] button").length,
        optionSheetCount: document.querySelectorAll(".fd-active-screen .fd-settings-option-sheet").length,
        rowHeightStable: rowBox ? Math.round(rowBox.height) <= 76 : false,
        dropdownOverlaysRow: Boolean(rowBox && dropdownBox && dropdownBox.top >= rowBox.top && dropdownBox.top <= rowBox.bottom + 4),
        listLayout: dropdownStyle?.flexDirection === "column",
        selectedCount: document.querySelectorAll(".fd-active-screen [data-settings-option-dropdown] button.is-selected").length,
        selectedValue: document.querySelector(".fd-active-screen [data-settings-option-dropdown] button.is-selected")?.textContent?.trim() || "",
        currentValue,
        anchoredToRightValueArea: Boolean(rowBox && dropdownBox && dropdownBox.left >= rowBox.left + rowBox.width * 0.48 && dropdownBox.right <= rowBox.right + 1),
        startsFromRowLowerHalf: Boolean(rowBox && dropdownBox && dropdownBox.top >= rowBox.top + rowBox.height * 0.45 && dropdownBox.top <= rowBox.bottom),
        neutralPanelStyle: Boolean(dropdownStyle && dropdownStyle.borderRadius === "8px" && !dropdownStyle.backgroundColor.includes("35, 121, 164")),
        allFontsMatchCurrentValue: buttonFontSizes.length > 0 && buttonFontSizes.every((fontSize) => fontSize === valueFontSize)
        };
      });
      assert(!dropdownState.hasSheet, `${expected.route} option dropdown should not open a bottom sheet`, failures);
      assert(dropdownState.optionSheetCount === 0, `${expected.route} rendered an option sheet for compact option selection`, failures);
      assert(dropdownState.dropdownCount > 0, `${expected.route} option dropdown did not expose alternate choices`, failures);
      assert(dropdownState.rowHeightStable, `${expected.route} option dropdown should not change the setting row height`, failures);
      assert(dropdownState.dropdownOverlaysRow, `${expected.route} option dropdown should be anchored to the current row`, failures);
      assert(dropdownState.listLayout, `${expected.route} option dropdown should render as a vertical list`, failures);
      assert(dropdownState.anchoredToRightValueArea, `${expected.route} option dropdown should be anchored near the right value area`, failures);
      assert(dropdownState.startsFromRowLowerHalf, `${expected.route} option dropdown should open from the lower half of the active row`, failures);
      assert(dropdownState.neutralPanelStyle, `${expected.route} option dropdown should use the neutral popover panel style`, failures);
      assert(dropdownState.selectedCount === 1, `${expected.route} option dropdown should mark exactly one selected option`, failures);
      assert(dropdownState.selectedValue.includes(dropdownState.currentValue), `${expected.route} option dropdown should include the current selected value`, failures);
      assert(dropdownState.allFontsMatchCurrentValue, `${expected.route} option dropdown option fonts should match the selected row value`, failures);
      await page.click(".fd-active-screen [data-settings-option-dropdown] button");
      const dropdownClosed = await page.evaluate(() => document.querySelectorAll(".fd-active-screen [data-settings-option-dropdown]").length);
      assert(dropdownClosed === 0, `${expected.route} option dropdown did not close after selecting a value`, failures);
    }
    if (expected.dialogTriggerMin) {
      assert(secondaryDetails.dialogTriggers >= expected.dialogTriggerMin, `${expected.route} missing confirm dialog trigger`, failures);
      await page.click('.fd-active-screen [data-settings-overlay^="dialog"]');
      const dialogState = await page.evaluate(() => ({
        hasDialog: document.querySelector(".fd-settings-phone")?.classList.contains("has-dialog"),
        dialogVisible: document.querySelector(".fd-settings-confirm-dialog")?.getAttribute("aria-hidden")
      }));
      assert(dialogState.hasDialog && dialogState.dialogVisible === "false", `${expected.route} confirm dialog did not open`, failures);
      await page.click(".fd-active-screen [data-close-settings-overlay]");
    }
    if (expected.metricMin) assert(secondaryDetails.metricCount >= expected.metricMin, `${expected.route} missing metric cards`, failures);
    if (expected.sourceRowsMin) assert(secondaryDetails.sourceRows >= expected.sourceRowsMin, `${expected.route} missing source rows`, failures);
    if (expected.restoreRowsMin) {
      assert(secondaryDetails.restoreRows >= expected.restoreRowsMin, `${expected.route} missing selectable restore backup rows`, failures);
      await page.click('.fd-active-screen [data-restore-record="WebDAV · 2026-06-21 22:30 · 书架与设置"]');
      const restoreConfirmState = await snapshot();
      assert(restoreConfirmState.route === "restore-confirm", `${expected.route} backup row did not navigate to restore-confirm`, failures);
      const restoreConfirmText = await page.evaluate(() => document.querySelector(".fd-active-screen")?.textContent || "");
      assert(restoreConfirmText.includes("WebDAV · 2026-06-21 22:30 · 书架与设置"), "restore-confirm did not keep the selected backup point context", failures);
      await page.click("[data-demo-back]");
      const syncReturnState = await snapshot();
      assert(syncReturnState.route === expected.route, "restore-confirm back did not return to sync-backup", failures);
    }
    if (expected.recordsMin) assert(secondaryDetails.records >= expected.recordsMin, `${expected.route} missing backup records`, failures);
    if (expected.subpanelMin) assert(secondaryDetails.subpanels >= expected.subpanelMin, `${expected.route} missing source edit/log subpanels`, failures);
    await page.click("[data-demo-back]");
    const settingsBackState = await snapshot();
    assert(settingsBackState.route === "settings", `demo back did not restore settings tab after ${expected.route}`, failures);
  }

  await page.click('.fd-active-screen .fd-main-nav-item[data-nav-type="rss"]');
  const rssState = await snapshot();
  assert(rssState.route === "rss", "main tab nav did not navigate to RSS", failures);
  assert(rssState.shell === "MainTabShell", "RSS route did not stay in MainTabShell", failures);
  assert(rssState.stackSize === "1", "main tab navigation should keep a root-level tab stack after returning to settings", failures);
  const rssTopActions = await page.evaluate(() => Array.from(document.querySelectorAll(".fd-active-screen .fd-top-actions button")).map((button) => button.getAttribute("data-top-action") || ""));
  assert(rssTopActions.length === 0, "RSS tab should not expose placeholder search/more top actions", failures);

  await page.click('.fd-active-screen .fd-main-nav-item[data-nav-type="discover"]');
  const discoverState = await snapshot();
  assert(discoverState.route === "discover", "main tab nav did not navigate to discover", failures);
  const discoverTopActions = await page.evaluate(() => Array.from(document.querySelectorAll(".fd-active-screen .fd-top-actions button")).map((button) => button.getAttribute("data-top-action") || ""));
  assert(discoverTopActions.length === 0, "discover tab should not expose placeholder search/more top actions", failures);
}

async function validateFrontendDemoAdaptiveMatrix(page, htmlPath, initialViewport, failures) {
  const results = [];
  const adaptiveScreenshotDir = path.join(path.dirname(htmlPath), "verify", "adaptive");
  fs.mkdirSync(adaptiveScreenshotDir, { recursive: true });
  for (const target of frontendDemoAdaptiveViewports) {
    const query = target.route ? `?captureRoute=${encodeURIComponent(target.route)}` : "";
    await page.setViewportSize(target.viewport);
    await page.goto(`file://${htmlPath}${query}`, { waitUntil: "load" });
    await page.waitForSelector(".fd-demo", { timeout: 5000 });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.waitForFunction(
      (route) => document.querySelector(".fd-demo")?.getAttribute("data-current-route") === route,
      target.route,
      { timeout: 5000 }
    ).catch(() => {});

    const actual = await page.evaluate(() => {
      const rectFor = (selector) => {
        const element = document.querySelector(selector);
        if (!element) {
          return null;
        }
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          top: Math.round(rect.top),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          display: style.display,
          visible: rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden"
        };
      };
      const overlaps = (a, b) => Boolean(
        a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
      );
      const root = document.querySelector(".fd-demo");
      const frame = document.querySelector(".fd-active-screen .fd-phone, .fd-active-screen .fd-reader-frame, .fd-active-screen .fd-flow-frame");
      const frameRect = frame ? frame.getBoundingClientRect() : null;
      const documentElement = document.documentElement;
      const frameBox = frameRect
        ? {
            top: Math.round(frameRect.top),
            right: Math.round(frameRect.right),
            bottom: Math.round(frameRect.bottom),
            left: Math.round(frameRect.left),
            width: Math.ceil(frameRect.width),
            height: Math.ceil(frameRect.height)
          }
        : null;
      const top = rectFor(".fd-active-screen .fd-reader-top");
      const sheet = rectFor(".fd-active-screen .fd-reader-sheet:not(.fd-reader-sheet-empty)");
      const nav = rectFor(".fd-active-screen .fd-reader-module-nav:not(.fd-reader-module-nav-empty)");
      const rail = rectFor(".fd-active-screen .fd-brightness-rail");
      const actions = rectFor(".fd-active-screen .fd-reader-actions");
      const chapter = rectFor(".fd-active-screen .fd-reader-chapter-panel");
      const reading = rectFor(".fd-active-screen .fd-ir-reading-layer");
      const mainNav = rectFor(".fd-active-screen .fd-main-nav");
      const phoneContent = rectFor(".fd-active-screen .fd-phone-content");
      const flowReader = rectFor(".fd-active-screen .fd-source-continuity-slot");
      const flowWindow = rectFor(".fd-active-screen .fd-source-window-slot");
      const flowResult = rectFor(".fd-active-screen .fd-source-result-slot");
      const flowResultPanel = rectFor(".fd-active-screen .fd-source-switch-result");
      return {
        route: root?.getAttribute("data-current-route") || "",
        widthClass: root?.getAttribute("data-width-class") || "",
        heightClass: root?.getAttribute("data-height-class") || "",
        orientation: root?.getAttribute("data-orientation") || "",
        viewportClass: root?.getAttribute("data-viewport-class") || "",
        viewportWidth: Number(root?.getAttribute("data-viewport-width") || 0),
        viewportHeight: Number(root?.getAttribute("data-viewport-height") || 0),
        bodyWidth: Math.ceil(Math.max(documentElement.scrollWidth, document.body.scrollWidth)),
        bodyHeight: Math.ceil(Math.max(documentElement.scrollHeight, document.body.scrollHeight)),
        frame: frameBox,
        wideVisual: {
          reading,
          mainNav,
          phoneContent,
          flowReader,
          flowWindow,
          flowResult,
          flowResultPanel
        },
        readerAvoidance: top || sheet || nav || rail
          ? {
              top,
              sheet,
              nav,
              rail,
              actions,
              chapter,
              topOverlapsSheet: overlaps(top, sheet),
              topOverlapsNav: overlaps(top, nav),
              topOverlapsRail: overlaps(top, rail),
              actionsOverlapChapter: overlaps(actions, chapter),
              sheetInsideFrame: Boolean(frameBox && sheet && sheet.top >= frameBox.top && sheet.bottom <= frameBox.bottom),
              navInsideFrame: Boolean(frameBox && nav && nav.top >= frameBox.top && nav.bottom <= frameBox.bottom),
              railInsideSheet: Boolean(sheet && rail && rail.top >= sheet.top && rail.bottom <= sheet.bottom)
            }
          : null
      };
    });

    const screenshotPath = path.join(adaptiveScreenshotDir, `frontend-demo-draft-adaptive-${target.name}.png`);
    const screenshotBuffer = await page.screenshot({ path: screenshotPath, fullPage: false });
    const screenshotDimensions = pngDimensions(screenshotBuffer);
    const visualEvidence = {
      screenshot: screenshotPath,
      bytes: screenshotBuffer.length,
      dimensions: screenshotDimensions
    };

    const prefix = `frontend demo adaptive ${target.name}`;
    assert(actual.route === target.route, `${prefix} route ${actual.route} !== ${target.route}`, failures);
    assert(actual.widthClass === target.expected.widthClass, `${prefix} width class ${actual.widthClass} !== ${target.expected.widthClass}`, failures);
    assert(actual.heightClass === target.expected.heightClass, `${prefix} height class ${actual.heightClass} !== ${target.expected.heightClass}`, failures);
    assert(actual.orientation === target.expected.orientation, `${prefix} orientation ${actual.orientation} !== ${target.expected.orientation}`, failures);
    assert(actual.viewportClass === target.expected.viewportClass, `${prefix} viewport class ${actual.viewportClass} !== ${target.expected.viewportClass}`, failures);
    assert(actual.viewportWidth === target.viewport.width, `${prefix} viewport width ${actual.viewportWidth} !== ${target.viewport.width}`, failures);
    assert(actual.viewportHeight === target.viewport.height, `${prefix} viewport height ${actual.viewportHeight} !== ${target.viewport.height}`, failures);
    assert(actual.bodyWidth <= target.viewport.width + 1, `${prefix} horizontal overflow ${actual.bodyWidth} > ${target.viewport.width}`, failures);
    assert(Boolean(actual.frame), `${prefix} did not render an active frame`, failures);
    if (actual.frame) {
      assert(actual.frame.width <= target.maxFrame.width + 1, `${prefix} frame width ${actual.frame.width} > ${target.maxFrame.width}`, failures);
      assert(actual.frame.height <= target.maxFrame.height + 1, `${prefix} frame height ${actual.frame.height} > ${target.maxFrame.height}`, failures);
      if (target.minFrameWidth) {
        assert(actual.frame.width >= target.minFrameWidth, `${prefix} frame width ${actual.frame.width} < ${target.minFrameWidth}`, failures);
      }
    }
    assert(visualEvidence.bytes > 2000, `${prefix} screenshot evidence is too small to be useful`, failures);
    assert(Boolean(visualEvidence.dimensions), `${prefix} screenshot evidence is not a PNG`, failures);
    if (visualEvidence.dimensions) {
      assert(visualEvidence.dimensions.width === target.viewport.width, `${prefix} screenshot width ${visualEvidence.dimensions.width} !== ${target.viewport.width}`, failures);
      assert(visualEvidence.dimensions.height === target.viewport.height, `${prefix} screenshot height ${visualEvidence.dimensions.height} !== ${target.viewport.height}`, failures);
    }

    if (target.readerAvoidance) {
      const avoidance = actual.readerAvoidance || {};
      assert(Boolean(avoidance.top && avoidance.sheet && avoidance.nav && avoidance.rail), `${prefix} missing ReaderShell P0 avoidance geometry`, failures);
      assert(!avoidance.topOverlapsSheet, `${prefix} reader top bar overlaps bottom sheet`, failures);
      assert(!avoidance.topOverlapsNav, `${prefix} reader top bar overlaps module navigation`, failures);
      assert(!avoidance.topOverlapsRail, `${prefix} reader top bar overlaps brightness rail`, failures);
      assert(!avoidance.actionsOverlapChapter, `${prefix} reader quick actions overlap chapter controls`, failures);
      assert(avoidance.sheetInsideFrame, `${prefix} reader bottom sheet is outside frame`, failures);
      assert(avoidance.navInsideFrame, `${prefix} reader module navigation is outside frame`, failures);
      assert(avoidance.railInsideSheet, `${prefix} reader brightness rail is outside bottom sheet`, failures);
    }

    if (target.wideReader) {
      const wide = actual.wideVisual || {};
      const avoidance = actual.readerAvoidance || {};
      assert(Boolean(wide.reading && wide.reading.visible), `${prefix} missing wide ReaderShell reading layer`, failures);
      assert(Boolean(avoidance.sheet && avoidance.nav), `${prefix} missing wide ReaderShell side controls`, failures);
      if (wide.reading && avoidance.sheet) {
        assert(
          wide.reading.right <= avoidance.sheet.left - 8,
          `${prefix} reading layer overlaps side control panel`,
          failures
        );
      }
      if (avoidance.sheet && actual.frame) {
        assert(
          avoidance.sheet.left >= actual.frame.left + Math.round(actual.frame.width * 0.45),
          `${prefix} reader control panel did not move to the right side`,
          failures
        );
      }
    }

    if (target.sideMainNav) {
      const wide = actual.wideVisual || {};
      assert(Boolean(wide.mainNav && wide.mainNav.visible), `${prefix} missing tablet main navigation`, failures);
      assert(Boolean(wide.phoneContent && wide.phoneContent.visible), `${prefix} missing tablet main content`, failures);
      if (wide.mainNav && wide.phoneContent) {
        assert(wide.mainNav.height > wide.mainNav.width * 2, `${prefix} main navigation did not become a side rail`, failures);
        assert(wide.phoneContent.left >= wide.mainNav.right - 1, `${prefix} tablet content does not avoid side navigation`, failures);
      }
    }

    if (target.wideFlow) {
      const wide = actual.wideVisual || {};
      const avoidance = actual.readerAvoidance || {};
      assert(Boolean(wide.flowReader && wide.flowReader.visible), `${prefix} missing wide Flow reader continuity segment`, failures);
      assert(Boolean(wide.flowWindow && wide.flowWindow.visible), `${prefix} missing wide Flow candidate segment`, failures);
      assert(Boolean(wide.flowResult && wide.flowResult.visible), `${prefix} missing wide Flow result segment`, failures);
      assert(Boolean(wide.flowResultPanel && wide.flowResultPanel.visible), `${prefix} missing wide Flow result confirmation panel`, failures);
      assert(Boolean(avoidance.top && avoidance.sheet && avoidance.nav), `${prefix} missing wide Flow reader control geometry`, failures);
      assert(!avoidance.topOverlapsSheet, `${prefix} wide Flow reader top bar overlaps bottom sheet`, failures);
      assert(!avoidance.topOverlapsNav, `${prefix} wide Flow reader top bar overlaps module navigation`, failures);
      assert(!avoidance.actionsOverlapChapter, `${prefix} wide Flow reader quick actions overlap chapter controls`, failures);
      if (wide.flowReader && wide.flowWindow && wide.flowResult) {
        assert(wide.flowReader.right <= wide.flowWindow.left - 6, `${prefix} Flow reader segment overlaps candidate window`, failures);
        assert(wide.flowWindow.right <= wide.flowResult.left - 6, `${prefix} Flow candidate window overlaps result panel`, failures);
      }
      if (wide.flowReader && wide.flowWindow && wide.flowResult && actual.frame) {
        assert(wide.flowReader.left >= actual.frame.left, `${prefix} Flow reader segment escapes frame`, failures);
        assert(wide.flowResult.right <= actual.frame.right, `${prefix} Flow result segment escapes frame`, failures);
      }
    }

    if (target.keyboardReducedHeight) {
      await page.click(".fd-active-screen [data-open-keyboard]");
      await page.waitForFunction(
        () => document.activeElement === document.querySelector(".fd-active-screen .fd-phone [data-keyboard-input]"),
        null,
        { timeout: 1200 }
      ).catch(() => {});
      await page.waitForTimeout(240);
      const keyboard = await page.evaluate(() => {
        const phone = document.querySelector(".fd-active-screen .fd-phone");
        const target = phone?.querySelector("[data-open-keyboard]");
        const action = phone?.querySelector(".fd-fixed-action-row");
        const keyboardHost = phone?.querySelector("[data-keyboard-host]");
        const rectFor = (element) => {
          if (!element) {
            return null;
          }
          const rect = element.getBoundingClientRect();
          return {
            top: Math.round(rect.top),
            right: Math.round(rect.right),
            bottom: Math.round(rect.bottom),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          };
        };
        const targetRect = rectFor(target);
        const actionRect = rectFor(action);
        const keyboardRect = rectFor(keyboardHost);
        const overlaps = (a, b) => Boolean(
          a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
        );
        return {
          phoneHasKeyboard: Boolean(phone?.classList.contains("has-keyboard")),
          hidden: keyboardHost?.getAttribute("aria-hidden") || "",
          activeElementIsInput: document.activeElement === phone?.querySelector("[data-keyboard-input]"),
          keysDisplay: keyboardHost ? window.getComputedStyle(keyboardHost.querySelector(".fd-keyboard-keys")).display : "",
          target: targetRect,
          action: actionRect,
          keyboard: keyboardRect,
          targetAboveKeyboard: Boolean(targetRect && keyboardRect && targetRect.bottom < keyboardRect.top),
          actionAboveKeyboard: Boolean(actionRect && keyboardRect && actionRect.bottom <= keyboardRect.top),
          targetActionOverlap: overlaps(targetRect, actionRect)
        };
      });
      const keyboardScreenshotPath = path.join(adaptiveScreenshotDir, `frontend-demo-draft-adaptive-${target.name}-keyboard.png`);
      const keyboardScreenshotBuffer = await page.screenshot({ path: keyboardScreenshotPath, fullPage: false });
      const keyboardVisualEvidence = {
        screenshot: keyboardScreenshotPath,
        bytes: keyboardScreenshotBuffer.length,
        dimensions: pngDimensions(keyboardScreenshotBuffer)
      };
      assert(keyboard.phoneHasKeyboard, `${prefix} reduced-height keyboard did not mark phone state`, failures);
      assert(keyboard.hidden === "false", `${prefix} reduced-height keyboard aria-hidden did not open`, failures);
      assert(keyboard.activeElementIsInput, `${prefix} reduced-height keyboard did not focus input`, failures);
      assert(keyboard.targetAboveKeyboard, `${prefix} reduced-height keyboard covers active input target`, failures);
      assert(keyboard.actionAboveKeyboard, `${prefix} reduced-height keyboard covers fixed submit action`, failures);
      assert(!keyboard.targetActionOverlap, `${prefix} reduced-height submit action overlaps active input target`, failures);
      assert(keyboard.keyboard && keyboard.keyboard.height <= 180, `${prefix} keyboard height was not reduced for compact landscape`, failures);
      assert(keyboard.keysDisplay === "none", `${prefix} decorative keyboard keys should be hidden in compact landscape`, failures);
      assert(keyboardVisualEvidence.bytes > 2000, `${prefix} keyboard screenshot evidence is too small to be useful`, failures);
      actual.keyboardReducedHeight = Object.assign({}, keyboard, { visualEvidence: keyboardVisualEvidence });
    }

    results.push(Object.assign({}, target, { actual: Object.assign({}, actual, { visualEvidence }) }));
  }

  await page.setViewportSize(initialViewport);
  await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
  await page.waitForSelector(".fd-demo", { timeout: 5000 });
  return results;
}

async function validateFrontendDemoTextStressMatrix(page, htmlPath, initialViewport, failures) {
  const results = [];
  const textStressScreenshotDir = path.join(path.dirname(htmlPath), "verify", "text-stress");
  fs.mkdirSync(textStressScreenshotDir, { recursive: true });
  for (const target of frontendDemoTextStressTargets) {
    await page.setViewportSize(target.viewport);
    await page.goto(`file://${htmlPath}?captureRoute=${encodeURIComponent(target.route)}`, { waitUntil: "load" });
    await page.waitForSelector(".fd-demo", { timeout: 5000 });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.evaluate(() => {
      const root = document.querySelector(".fd-demo");
      root?.setAttribute("data-font-scale", "large");
      root?.setAttribute("data-text-stress", "extreme");
      const longChinese = "超长中文标题用于验证系统字体放大后仍然不会挤压主要操作按钮和右侧状态值";
      const longEnglish = "SupercalifragilisticExpialidociousUnbreakableIdentifierForFontScaleStress";
      const stressText = (index) => index % 2 === 0 ? longChinese : longEnglish;
      const textSelectors = [
        ".fd-active-screen .fd-top-title strong",
        ".fd-active-screen .fd-top-title small",
        ".fd-active-screen .fd-continue-card strong",
        ".fd-active-screen .fd-continue-author",
        ".fd-active-screen .fd-book-card strong",
        ".fd-active-screen .fd-book-card small",
        ".fd-active-screen .fd-book-row strong",
        ".fd-active-screen .fd-book-row small",
        ".fd-active-screen .fd-setting-row strong",
        ".fd-active-screen .fd-setting-row small",
        ".fd-active-screen .fd-setting-row em",
        ".fd-active-screen .fd-reader-top strong",
        ".fd-active-screen .fd-reader-top small",
        ".fd-active-screen .fd-reader-chapter-row strong",
        ".fd-active-screen .fd-reader-book-progress",
        ".fd-active-screen .fd-reader-total-chapters",
        ".fd-active-screen .fd-reader-module small",
        ".fd-active-screen .fd-source-row-main strong",
        ".fd-active-screen .fd-source-row-main small",
        ".fd-active-screen .fd-source-row-meta strong",
        ".fd-active-screen .fd-source-row-meta small",
        ".fd-active-screen .fd-source-row-checks em"
      ];
      let index = 0;
      for (const selector of textSelectors) {
        document.querySelectorAll(selector).forEach((node) => {
          if (node.closest(".fd-sr-only") || node.querySelector("svg")) {
            return;
          }
          node.textContent = stressText(index);
          index += 1;
        });
      }
      document.querySelectorAll(".fd-active-screen .fd-main-nav-item").forEach((button, buttonIndex) => {
        Array.from(button.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim())
          .forEach((node) => {
            node.textContent = stressText(buttonIndex);
          });
      });
    });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    const actual = await page.evaluate(() => {
      const root = document.querySelector(".fd-demo");
      const frame = document.querySelector(".fd-active-screen .fd-phone, .fd-active-screen .fd-reader-frame, .fd-active-screen .fd-flow-frame");
      const frameRect = frame?.getBoundingClientRect();
      const frameBox = frameRect
        ? {
            top: Math.round(frameRect.top),
            right: Math.round(frameRect.right),
            bottom: Math.round(frameRect.bottom),
            left: Math.round(frameRect.left),
            width: Math.round(frameRect.width),
            height: Math.round(frameRect.height)
          }
        : null;
      const rectFor = (element) => {
        if (!element) {
          return null;
        }
        const rect = element.getBoundingClientRect();
        return {
          top: Math.round(rect.top),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      };
      const visible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0
          && rect.height > 0
          && style.display !== "none"
          && style.visibility !== "hidden"
          && !element.closest(".fd-sr-only");
      };
      const stressSelectors = [
        ".fd-active-screen .fd-main-nav-item",
        ".fd-active-screen .fd-top-title strong",
        ".fd-active-screen .fd-top-title small",
        ".fd-active-screen .fd-continue-card strong",
        ".fd-active-screen .fd-continue-author",
        ".fd-active-screen .fd-book-card strong",
        ".fd-active-screen .fd-book-card small",
        ".fd-active-screen .fd-book-row strong",
        ".fd-active-screen .fd-book-row small",
        ".fd-active-screen .fd-setting-row",
        ".fd-active-screen .fd-setting-row strong",
        ".fd-active-screen .fd-setting-row small",
        ".fd-active-screen .fd-setting-row em",
        ".fd-active-screen .fd-reader-top",
        ".fd-active-screen .fd-reader-top strong",
        ".fd-active-screen .fd-reader-top small",
        ".fd-active-screen .fd-reader-chapter-panel",
        ".fd-active-screen .fd-reader-chapter-row strong",
        ".fd-active-screen .fd-reader-module",
        ".fd-active-screen .fd-reader-module small",
        ".fd-active-screen .fd-source-candidate-row",
        ".fd-active-screen .fd-source-row-main strong",
        ".fd-active-screen .fd-source-row-main small",
        ".fd-active-screen .fd-source-row-meta strong",
        ".fd-active-screen .fd-source-row-meta small",
        ".fd-active-screen .fd-source-row-checks em",
        ".fd-active-screen .fd-fixed-action-row button"
      ];
      const frameTolerance = 1;
      const outside = [];
      const fixedVerticalSelectors = [
        ".fd-main-nav-item",
        ".fd-top-title",
        ".fd-reader-top",
        ".fd-reader-chapter-panel",
        ".fd-reader-module",
        ".fd-fixed-action-row button"
      ];
      if (frameBox) {
        document.querySelectorAll(stressSelectors.join(", ")).forEach((element) => {
          if (!visible(element)) {
            return;
          }
          const rect = rectFor(element);
          const horizontalOutside = rect.left < frameBox.left - frameTolerance
            || rect.right > frameBox.right + frameTolerance;
          const fixedVerticalOutside = fixedVerticalSelectors.some((selector) => element.matches(selector))
            && (
              rect.top < frameBox.top - frameTolerance
              || rect.bottom > frameBox.bottom + frameTolerance
            );
          if (horizontalOutside || fixedVerticalOutside) {
            outside.push({
              tag: element.tagName,
              className: typeof element.className === "string" ? element.className : "",
              text: element.textContent.trim().slice(0, 80),
              rect
            });
          }
        });
      }
      return {
        route: root?.getAttribute("data-current-route") || "",
        fontScale: root?.getAttribute("data-font-scale") || "",
        textStress: root?.getAttribute("data-text-stress") || "",
        widthClass: root?.getAttribute("data-width-class") || "",
        heightClass: root?.getAttribute("data-height-class") || "",
        viewportClass: root?.getAttribute("data-viewport-class") || "",
        bodyWidth: Math.ceil(Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)),
        bodyHeight: Math.ceil(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)),
        viewport: { width: window.innerWidth, height: window.innerHeight },
        frame: frameBox,
        outsideCount: outside.length,
        outside: outside.slice(0, 8),
        visibleStressCount: document.querySelectorAll(stressSelectors.join(", ")).length
      };
    });
    const screenshotPath = path.join(textStressScreenshotDir, `frontend-demo-draft-text-stress-${target.name}.png`);
    const screenshotBuffer = await page.screenshot({ path: screenshotPath, fullPage: false });
    const visualEvidence = {
      screenshot: screenshotPath,
      bytes: screenshotBuffer.length,
      dimensions: pngDimensions(screenshotBuffer)
    };

    const prefix = `frontend demo text stress ${target.name}`;
    assert(actual.route === target.route, `${prefix} route ${actual.route} !== ${target.route}`, failures);
    assert(actual.fontScale === "large", `${prefix} did not enable large font scale`, failures);
    assert(actual.textStress === "extreme", `${prefix} did not enable extreme text stress`, failures);
    assert(actual.bodyWidth <= target.viewport.width + 1, `${prefix} horizontal overflow ${actual.bodyWidth} > ${target.viewport.width}`, failures);
    assert(Boolean(actual.frame), `${prefix} did not render an active frame`, failures);
    assert(actual.visibleStressCount > 0, `${prefix} did not find visible stress text elements`, failures);
    assert(actual.outsideCount === 0, `${prefix} has ${actual.outsideCount} visible stressed element(s) outside frame`, failures);
    assert(visualEvidence.bytes > 2000, `${prefix} screenshot evidence is too small to be useful`, failures);
    assert(Boolean(visualEvidence.dimensions), `${prefix} screenshot evidence is not a PNG`, failures);
    if (visualEvidence.dimensions) {
      assert(visualEvidence.dimensions.width === target.viewport.width, `${prefix} screenshot width ${visualEvidence.dimensions.width} !== ${target.viewport.width}`, failures);
      assert(visualEvidence.dimensions.height === target.viewport.height, `${prefix} screenshot height ${visualEvidence.dimensions.height} !== ${target.viewport.height}`, failures);
    }

    results.push(Object.assign({}, target, { actual: Object.assign({}, actual, { visualEvidence }) }));
  }

  await page.setViewportSize(initialViewport);
  await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
  await page.waitForSelector(".fd-demo", { timeout: 5000 });
  return results;
}

async function validateTarget(browser, repoRoot, target, runtimeCriticalCssVars = []) {
  const failures = [];
  const failedRequests = [];
  const consoleErrors = [];
  const pageErrors = [];
  validateShellMetadata(target, failures);
  let adaptiveViewportMatrix = null;
  let textStressMatrix = null;
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

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  const htmlPath = path.join(repoRoot, target.html);
  const screenshotPath = path.join(repoRoot, target.screenshot);
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });

  await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
  await page.waitForSelector(target.selector, { timeout: 5000 });
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const actual = await page.evaluate(({ targetInPage, runtimeCriticalCssVarsInPage }) => {
    const frame = document.querySelector(targetInPage.selector);
    const frameRect = frame ? frame.getBoundingClientRect() : null;
    const images = Array.from(document.images);
    const computedStyle = window.getComputedStyle(document.documentElement);
    const textSource = targetInPage.name === "frontend-demo-draft"
      ? document.body.textContent
      : document.body.innerText;
    const requiredTextPresent = targetInPage.requiredText.every((text) =>
      textSource.includes(text)
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
      cssTokenValues: Object.fromEntries(runtimeCriticalCssVarsInPage.map((cssVar) => [
        cssVar,
        computedStyle.getPropertyValue(cssVar).trim()
      ])),
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
  }, { targetInPage: target, runtimeCriticalCssVarsInPage: runtimeCriticalCssVars });

  assert(actual.rendererLoaded, `${target.rendererGlobal} was not loaded`, failures);
  assert(actual.requiredTextPresent, "required text was not fully rendered", failures);
  assert(failedRequests.length === 0, `${failedRequests.length} request(s) failed`, failures);
  assert(consoleErrors.length === 0, `${consoleErrors.length} console error(s) found`, failures);
  assert(pageErrors.length === 0, `${pageErrors.length} page error(s) found`, failures);
  for (const cssVar of runtimeCriticalCssVars) {
    assert(Boolean(actual.cssTokenValues[cssVar]), `${target.name} did not load runtime CSS token ${cssVar}`, failures);
  }

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

  if (target.name === "frontend-demo-draft") {
    adaptiveViewportMatrix = await validateFrontendDemoAdaptiveMatrix(page, htmlPath, target.viewport, failures);
    textStressMatrix = await validateFrontendDemoTextStressMatrix(page, htmlPath, target.viewport, failures);
    await validateFrontendDemoInteractions(page, failures);
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
    pageErrors,
    adaptiveViewportMatrix,
    textStressMatrix,
    actual
  };
}

async function validateComponentReferencePage(browser, repoRoot, html) {
  const failures = [];
  const failedRequests = [];
  const consoleErrors = [];
  const pageErrors = [];
  const htmlPath = path.join(repoRoot, html);
  const source = fs.readFileSync(htmlPath, "utf8").trimStart();

  assert(/^<!doctype html>/i.test(source), `${html} is not a standalone HTML document`, failures);

  const page = await browser.newPage({
    viewport: { width: 1180, height: 1800 },
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

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
  await page.waitForFunction(() => document.body.innerText.trim().length > 0, undefined, { timeout: 5000 }).catch(() => {});

  const actual = await page.evaluate(() => {
    const images = Array.from(document.images);
    return {
      title: document.title,
      bodyTextLength: document.body.innerText.trim().length,
      imageCount: images.length,
      missingImages: images.filter((image) => !image.complete || image.naturalWidth === 0).length
    };
  });

  assert(actual.bodyTextLength > 0, `${html} rendered an empty component reference`, failures);
  assert(failedRequests.length === 0, `${html} has ${failedRequests.length} failed request(s)`, failures);
  assert(consoleErrors.length === 0, `${html} has ${consoleErrors.length} console error(s)`, failures);
  assert(pageErrors.length === 0, `${html} has ${pageErrors.length} page error(s)`, failures);
  assert(actual.missingImages === 0, `${html} has ${actual.missingImages} missing image(s)`, failures);

  await page.close();

  return {
    html,
    passed: failures.length === 0,
    failures,
    failedRequests,
    consoleErrors,
    pageErrors,
    actual
  };
}

async function main() {
  const repoRoot = path.resolve(__dirname, "../../..");
  const manifestPath = path.join(__dirname, "manifest.json");
  const outputPath = path.join(repoRoot, "docs/ui-design/frontend-input-design-draft-validation.json");
  const manifest = readJson(manifestPath);
  const tokenContract = validateDesignTokenContract(repoRoot, manifest);
  const manifestInventory = validateManifestInventory(repoRoot, manifest);
  const planningDocumentation = validatePlanningDocumentation(repoRoot);
  const navigationContract = validateCurrentNavigationContract(repoRoot);
  const projectStructureContract = validateProjectStructureContract(repoRoot);
  const { chromium } = loadPlaywright();

  const browser = await chromium.launch({ headless: true });
  const results = [];
  const componentReferencePages = discoverComponentReferencePages(repoRoot);
  const componentReferenceResults = [];
  try {
    for (const target of manifest.targets) {
      results.push(await validateTarget(browser, repoRoot, target, tokenContract.runtimeCriticalCssVars));
    }
    for (const html of componentReferencePages) {
      componentReferenceResults.push(await validateComponentReferencePage(browser, repoRoot, html));
    }
  } finally {
    await browser.close();
  }

  const componentReferenceSmoke = {
    expectedCount: 30,
    actualCount: componentReferencePages.length,
    passed:
      componentReferencePages.length === 30 &&
      componentReferenceResults.every((result) => result.passed),
    results: componentReferenceResults
  };

  const report = {
    generatedAt: new Date().toISOString(),
    manifest: path.relative(repoRoot, manifestPath),
    passed:
      tokenContract.passed &&
      manifestInventory.passed &&
      planningDocumentation.passed &&
      navigationContract.passed &&
      projectStructureContract.passed &&
      results.every((result) => result.passed) &&
      componentReferenceSmoke.passed,
    tokenContract,
    manifestInventory,
    planningDocumentation,
    navigationContract,
    projectStructureContract,
    componentReferenceSmoke,
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
