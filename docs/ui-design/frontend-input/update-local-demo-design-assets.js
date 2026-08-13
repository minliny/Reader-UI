#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (error) {
    throw new Error([
      "Playwright is required to update local demo design assets.",
      "Run with the bundled Node runtime or set NODE_PATH to a node_modules directory that contains playwright.",
      `Original error: ${error.message}`
    ].join("\n"));
  }
}

const repoRoot = path.resolve(__dirname, "../../..");
const demoHtml = path.join(repoRoot, "frontend-demo/index.html");
const generatedAt = new Date().toISOString();

const targets = [
  { label: "书架", route: "bookshelf", dir: "docs/ui-design/02-主标签页/书架" },
  { label: "发现", route: "discover", dir: "docs/ui-design/02-主标签页/发现" },
  { label: "RSS", route: "rss", dir: "docs/ui-design/02-主标签页/RSS" },
  { label: "设置", route: "settings", dir: "docs/ui-design/02-主标签页/设置" },
  { label: "书架空状态", route: "bookshelf-empty", dir: "docs/ui-design/03-书架链路/书架空状态" },
  { label: "书籍搜索", route: "book-search", dir: "docs/ui-design/03-书架链路/书籍搜索" },
  { label: "书籍详情", route: "book-detail", dir: "docs/ui-design/03-书架链路/书籍详情" },
  { label: "书籍目录", route: "book-directory", dir: "docs/ui-design/03-书架链路/书籍目录" },
  {
    label: "书籍操作底表",
    route: "bookshelf",
    dir: "docs/ui-design/03-书架链路/书籍操作底表",
    action: "open-book-focus",
    note: "当前 demo 不再提供独立 book-action-sheet 路由，本图捕获书架封面长按/右键操作层。"
  },
  { label: "排序与筛选", route: "sort-filter", dir: "docs/ui-design/03-书架链路/排序与筛选" },
  { label: "分组管理", route: "group-management", dir: "docs/ui-design/03-书架链路/分组管理" },
  { label: "本地书导入", route: "local-import", dir: "docs/ui-design/03-书架链路/本地书导入" },
  { label: "沉浸阅读", route: "immersive-reading", dir: "docs/ui-design/04-阅读链路/沉浸阅读" },
  {
    label: "阅读入口",
    route: "immersive-reading",
    dir: "docs/ui-design/04-阅读链路/阅读入口",
    note: "阅读入口不定义单独视觉路由，本图对齐当前沉浸阅读入口态。"
  },
  { label: "阅读控制层", route: "reader", dir: "docs/ui-design/04-阅读链路/阅读控制层" },
  { label: "目录与书签", route: "toc-bookmarks", dir: "docs/ui-design/04-阅读链路/目录与书签" },
  { label: "朗读", route: "tts", dir: "docs/ui-design/04-阅读链路/朗读" },
  { label: "阅读外观", route: "reader-appearance", dir: "docs/ui-design/04-阅读链路/阅读外观" },
  { label: "阅读设置", route: "reader-settings", dir: "docs/ui-design/04-阅读链路/阅读设置" },
  { label: "自动翻页", route: "auto-page", dir: "docs/ui-design/04-阅读链路/自动翻页" },
  { label: "内容搜索", route: "content-search", dir: "docs/ui-design/04-阅读链路/内容搜索" },
  { label: "内容替换", route: "content-replacement", dir: "docs/ui-design/04-阅读链路/内容替换" },
  { label: "换源", route: "source-switch", dir: "docs/ui-design/04-阅读链路/换源" },
  { label: "App通用设置", route: "settings-general", dir: "docs/ui-design/05-设置链路/App通用设置" },
  { label: "书架与搜索设置", route: "bookshelf-search-settings", dir: "docs/ui-design/05-设置链路/书架与搜索设置" },
  { label: "隐私与权限", route: "privacy-permissions", dir: "docs/ui-design/05-设置链路/隐私与权限" },
  { label: "缓存管理", route: "cache-management", dir: "docs/ui-design/05-设置链路/缓存管理" },
  { label: "关于与反馈", route: "about-feedback", dir: "docs/ui-design/05-设置链路/关于与反馈" },
  { label: "同步与备份", route: "sync-backup", dir: "docs/ui-design/05-设置链路/同步与备份" },
  { label: "书源管理", route: "source-management", dir: "docs/ui-design/05-设置链路/书源管理" }
];

function assertKnownTargets() {
  const missing = targets.filter((target) => !fs.existsSync(path.join(repoRoot, target.dir)));
  if (missing.length) {
    throw new Error(`Missing target directories: ${missing.map((target) => target.dir).join(", ")}`);
  }
  const duplicateDirs = targets
    .map((target) => target.dir)
    .filter((dir, index, dirs) => dirs.indexOf(dir) !== index);
  if (duplicateDirs.length) {
    throw new Error(`Duplicate target directories: ${duplicateDirs.join(", ")}`);
  }
}

async function waitForStableDemo(page, route) {
  await page.waitForSelector(".fd-active-screen > *", { timeout: 8000 });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const currentRoute = await page.evaluate(() => document.querySelector(".fd-demo")?.getAttribute("data-current-route") || "");
  if (currentRoute !== route) {
    throw new Error(`Expected route ${route}, got ${currentRoute || "<empty>"}`);
  }
}

async function applyTargetAction(page, target) {
  if (!target.action) {
    return;
  }
  if (target.action === "open-book-focus") {
    await page.locator(".fd-active-screen [data-book-cover]").first().click({ button: "right" });
    await page.waitForSelector('.fd-active-screen [data-book-focus-layer][aria-hidden="false"]', { timeout: 3000 });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    return;
  }
  throw new Error(`Unsupported target action: ${target.action}`);
}

async function hideDemoCaptureChrome(page) {
  await page.addStyleTag({
    content: [
      ".fd-demo-mode-switch { display: none !important; }",
      ".fd-route-panel { pointer-events: none !important; }"
    ].join("\n")
  });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
}

function localDemoSection(target) {
  const actionLine = target.action
    ? `- 截图操作态：\`${target.action}\`。${target.note || ""}\n`
    : target.note
      ? `- 说明：${target.note}\n`
      : "";
  return [
    "<!-- LOCAL_DEMO_STYLE_ANCHOR -->",
    "## 本地 Demo 对齐",
    "",
    `- 当前视觉以本地 \`/frontend-demo/?captureRoute=${target.route}\` 运行态为准。`,
    "- 顶层 `UI设计图.png` 已由当前 demo 截图生成；旧 `图片/` 候选图只保留为历史参考。",
    "- 结构、比例、控件位置、字体、颜色和图标约束如与旧文字描述冲突，以本节和当前 demo 为准。",
    actionLine.trimEnd(),
    "<!-- /LOCAL_DEMO_STYLE_ANCHOR -->",
    ""
  ].filter(Boolean).join("\n");
}

function updateFormalDesignSpec(target) {
  const specPath = path.join(repoRoot, target.dir, "10-正式UI设计稿.md");
  if (!fs.existsSync(specPath)) {
    return false;
  }
  const source = fs.readFileSync(specPath, "utf8");
  const section = localDemoSection(target);
  const anchorPattern = /<!-- LOCAL_DEMO_STYLE_ANCHOR -->[\s\S]*?<!-- \/LOCAL_DEMO_STYLE_ANCHOR -->\n?/;
  let nextSource;
  if (anchorPattern.test(source)) {
    nextSource = source.replace(anchorPattern, `${section}\n`);
  } else {
    const insertAt = source.indexOf("\n## ");
    nextSource = insertAt >= 0
      ? `${source.slice(0, insertAt).trimEnd()}\n\n${section}\n${source.slice(insertAt + 1)}`
      : `${source.trimEnd()}\n\n${section}\n`;
  }
  if (nextSource !== source) {
    fs.writeFileSync(specPath, nextSource);
    return true;
  }
  return false;
}

function hasLocalDemoSpecAnchor(target) {
  const specPath = path.join(repoRoot, target.dir, "10-正式UI设计稿.md");
  return fs.existsSync(specPath) && fs.readFileSync(specPath, "utf8").includes("LOCAL_DEMO_STYLE_ANCHOR");
}

function writeMappingReport(results, formalSpecCount, docUpdatedCount) {
  const reportPath = path.join(repoRoot, "docs/ui-design/frontend-input/LOCAL_DEMO_DESIGN_ASSET_MAP.md");
  const rows = results.map((item) => [
    `| ${item.label} | \`${item.route}\` | \`${item.output}\` | ${item.action ? `\`${item.action}\`` : "-"} | ${item.note || "-"} |`
  ].join(""));
  const report = [
    "# 本地 Demo 设计图同步表",
    "",
    `生成时间：${generatedAt}`,
    "",
    "## 规则",
    "",
    "- `frontend-demo/` 是当前 UI 设计图的视觉源头。",
    "- 每个页面目录的 `UI设计图.png` 由对应 `captureRoute` 截图生成。",
    "- `frontend-input/verify/design-draft-preview.png` 和 `design-draft-state-matrix.png` 仍是页面包结构验证产物，不作为新的视觉源头。",
    "- 旧 `图片/` 目录中的候选稿只作历史参考；与本地 demo 冲突时，以当前 demo 和顶层 `UI设计图.png` 为准。",
    "",
    "## 同步结果",
    "",
    `- 页面图：${results.length} 张`,
    `- 已对齐正式 UI 设计稿：${formalSpecCount} 个`,
    `- 本次脚本实际改写正式稿：${docUpdatedCount} 个`,
    "",
    "| 页面 | Demo route | 输出图 | 操作态 | 备注 |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
    ""
  ].join("\n");
  fs.writeFileSync(reportPath, report);
  return path.relative(repoRoot, reportPath);
}

async function main() {
  assertKnownTargets();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  await page.addInitScript(() => {
    window.localStorage.setItem("readerFrontendDemoMode", "regular");
  });

  const results = [];
  let docUpdatedCount = 0;
  try {
    for (const target of targets) {
      const query = new URLSearchParams({
        captureRoute: target.route,
        auditRefresh: `local-demo-design-assets-${generatedAt}`
      });
      await page.goto(`${pathToFileURL(demoHtml).href}?${query.toString()}`, { waitUntil: "load" });
      await waitForStableDemo(page, target.route);
      await hideDemoCaptureChrome(page);
      await applyTargetAction(page, target);

      const outputPath = path.join(repoRoot, target.dir, "UI设计图.png");
      await page.locator(".fd-active-screen > *").first().screenshot({ path: outputPath });
      if (updateFormalDesignSpec(target)) {
        docUpdatedCount += 1;
      }
      results.push({
        label: target.label,
        route: target.route,
        output: path.relative(repoRoot, outputPath),
        action: target.action || "",
        note: target.note || ""
      });
    }
  } finally {
    await browser.close();
  }

  const formalSpecCount = targets.filter(hasLocalDemoSpecAnchor).length;
  const report = writeMappingReport(results, formalSpecCount, docUpdatedCount);
  console.log(JSON.stringify({
    generatedAt,
    imageCount: results.length,
    formalSpecCount,
    docUpdatedCount,
    report
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
