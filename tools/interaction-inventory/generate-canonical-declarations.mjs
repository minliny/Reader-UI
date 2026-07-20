#!/usr/bin/env node
// =============================================================================
// R2.0.1 · Canonical Renderer Declarations Generator
// -----------------------------------------------------------------------------
// 职责：从 R1.2 registry + R2.0.1 renderer-dispatch-map + R1.2 nonInteractiveContainers
//       重新生成 frontend-demo-optimized/control-identity-declarations.js。
//
// 输入：
//   1. tools/interaction-inventory/generated/control-id-registry.json  (R1.2 冻结)
//   2. tools/interaction-inventory/generated/renderer-dispatch-map.json (R2.0.1 产物)
//   3. tools/interaction-inventory/generated/nonInteractiveContainers.json (R1.2 冻结)
//   4. contracts/ui-event.schema.json (用于校验 uiEvent enum)
//
// 输出：
//   frontend-demo-optimized/control-identity-declarations.js
//
// 模式：
//   默认：重写 declarations 文件
//   --check：仅比对，不写入；若内容不一致返回非 0 退出码
//
// 生成规则：
//   - 12 页面族 exact gate：严格按 dispatch map 的 12 pageFamilies
//   - route-local occurrence 1:1：对 dispatch map 中每个 route，registry 在该 route
//     上的所有 occurrence 都生成 declaration
//   - renderer owner 来自 dispatch map，不是手写
//   - 46 个 subcontrol 行展开为 50 个 declaration：
//       switch (1) → 1 declaration
//       select (1) → 1 declaration
//       stepper (2 buttons: minus + plus) → 2 declarations
//       segment (3 buttons) → 3 declarations
//   - 每个 declaration 必须有 uiEvent 或 uiEventExemption
//   - 新增 subcontrol declaration controlId=null，必须有 controlIdExemption
// =============================================================================
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { lookupSubcontrolBusinessKey } from "./settings-subcontrol-business-keys.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");

const REGISTRY_PATH = join(REPO_ROOT, "tools", "interaction-inventory", "generated", "control-id-registry.json");
const DISPATCH_MAP_PATH = join(REPO_ROOT, "tools", "interaction-inventory", "generated", "renderer-dispatch-map.json");
const NON_INTERACTIVE_PATH = join(REPO_ROOT, "tools", "interaction-inventory", "generated", "nonInteractiveContainers.json");
const UI_EVENT_SCHEMA_PATH = join(REPO_ROOT, "contracts", "ui-event.schema.json");
const OUTPUT_PATH = join(REPO_ROOT, "frontend-demo-optimized", "control-identity-declarations.js");
const READER_RUNTIME_CONTRACT_PATH = join(REPO_ROOT, "frontend-demo-optimized", "reader-runtime-contract.js");
const RSS_RUNTIME_CONTRACT_PATH = join(REPO_ROOT, "frontend-demo-optimized", "rss-runtime-contract.js");
const SOURCE_SWITCH_RENDERER_PATH = join(REPO_ROOT, "frontend-demo-optimized", "renderers", "w3-source-switch-renderers.js");
const SYNC_BACKUP_RENDERER_PATH = join(REPO_ROOT, "frontend-demo-optimized", "renderers", "d2-settings-sync-renderers.js");

const CHECK_MODE = process.argv.includes("--check");

// ---- Load inputs ----
const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
const dispatchMap = JSON.parse(readFileSync(DISPATCH_MAP_PATH, "utf8"));
const nonInteractive = JSON.parse(readFileSync(NON_INTERACTIVE_PATH, "utf8"));
const uiEventSchema = JSON.parse(readFileSync(UI_EVENT_SCHEMA_PATH, "utf8"));
const uiEventEnum = new Set(uiEventSchema.properties.type.enum);

const BOOKSHELF_ACTION_SPECS = [
  ["continue-cover", "route.push", "继续阅读封面"], ["continue-read", "route.push", "继续阅读"],
  ["view-cover", "bookshelf.view.switch", "封面视图"], ["view-list", "bookshelf.view.switch", "列表视图"],
  ["sort-filter-toggle", "bookshelf.sortFilter.open", "书架筛选"], ["search-toggle", "search.open", "书架搜索"],
  ["display-settings", "route.push", "书架显示设置"], ["search-clear", "search.clear", "清除搜索"],
  ["more-close", "dropdown.collapse", "关闭更多"], ["more-batch", "bookshelf.batchManagement.open", "批量管理"],
  ["more-group", "bookshelf.groupManagement.open", "分组管理"], ["more-local-import", "bookshelf.localImport.open", "本地导入"],
  ["more-settings", "route.push", "书架设置"], ["retry-load", "download.task.retry", "重试加载"],
  ["offline-view", "reader.content.offline", "离线查看"], ["retry-network", "download.task.retry", "重连"],
  ...["全部", "默认", "本地书", "追更"].map((v) => [`group-${v}`, "bookshelf.group.select", `分组 ${v}`]),
  ...["最近更新", "阅读进度", "书名", "作者"].map((v) => [`sort-${v}`, "bookshelf.sortFilter.apply", `排序 ${v}`]),
  ...["全部", "未读", "已完结", "更新失败"].map((v) => [`filter-${v}`, "bookshelf.sortFilter.apply", `筛选 ${v}`]),
  ...["long-night", "mystery-lord", "ming-dynasty-stories", "three-body", "renjian-cihua", "android-notes", "old-day-echoes", "among-stars", "lighthouse-and-fog", "paper-city", "long-title-layout-sample"].flatMap((id) => [
    [`book-open-${id}`, "route.push", `打开 ${id}`], [`book-more-${id}`, "route.push", `更多 ${id}`]
  ])
];

const BOOK_DETAIL_ROUTE_ACTION_SPECS = {
  "book-detail": [
    ["back", "route.pop", "返回书架"],
    ["source-sheet-open", "overlay.sheet.open", "打开快捷书源选择"],
    ["directory-open", "book.directory.open", "打开完整目录"],
    ["continue-read", "reader.entry.actionToImmersive", "继续阅读"],
    ["remove-open", "delete.confirm.open", "打开移除确认"],
    ["source-option-youshu", "source.switch.select", "选择优书网"],
    ["source-option-shucang", "source.switch.select", "选择书仓搜索"],
    ["source-option-local-cache", "source.switch.select", "选择本地缓存"],
    ["source-sheet-close", "overlay.sheet.close", "关闭快捷书源选择"],
    ["remove-cancel", "delete.cancel", "取消移除"],
    ["remove-confirm", "delete.confirm", "确认移除"],
    ["network-retry", "download.task.retry", "重试联网"],
    ["toc-retry", "download.task.retry", "重试目录解析"],
    ["source-switch-inline", "source.switch.open", "从目录错误切换书源"],
    ["source-switch-bottom", "source.switch.open", "底部切换书源"],
    ["source-debug", "source.debug.open", "调试当前书源"],
    ["readd", "book.action", "重新加入书架"],
    ["return-bookshelf", "route.popToRoot", "返回书架"],
    ["chapter-30-old-day", "reader.chapter.jump", "第 30 章 旧日"],
    ["chapter-31-return", "reader.chapter.jump", "第 31 章 归途"],
    ["chapter-32-rain-night", "reader.chapter.jump", "第 32 章 雨夜"],
    ["chapter-33-lighthouse", "reader.chapter.jump", "第 33 章 灯塔"]
  ],
  "book-detail-toc-preview": [
    ["back", "route.pop", "返回书籍详情"],
    ["source-sheet-open", "overlay.sheet.open", "打开快捷书源选择"],
    ["directory-open", "book.directory.open", "打开完整目录"],
    ["continue-read", "reader.entry.actionToImmersive", "继续阅读"],
    ["remove-open", "delete.confirm.open", "打开移除确认"],
    ["source-option-youshu", "source.switch.select", "选择优书网"],
    ["source-option-shucang", "source.switch.select", "选择书仓搜索"],
    ["source-option-local-cache", "source.switch.select", "选择本地缓存"],
    ["source-sheet-close", "overlay.sheet.close", "关闭快捷书源选择"],
    ["remove-cancel", "delete.cancel", "取消移除"],
    ["remove-confirm", "delete.confirm", "确认移除"],
    ["network-retry", "download.task.retry", "重试联网"],
    ["toc-retry", "download.task.retry", "重试目录解析"],
    ["source-switch-inline", "source.switch.open", "从目录错误切换书源"],
    ["source-switch-bottom", "source.switch.open", "底部切换书源"],
    ["source-debug", "source.debug.open", "调试当前书源"],
    ["readd", "book.action", "重新加入书架"],
    ["return-bookshelf", "route.popToRoot", "返回书架"],
    ["chapter-30-old-day", "reader.chapter.jump", "第 30 章 旧日"],
    ["chapter-31-return", "reader.chapter.jump", "第 31 章 归途"],
    ["chapter-32-rain-night", "reader.chapter.jump", "第 32 章 雨夜"],
    ["chapter-33-lighthouse", "reader.chapter.jump", "第 33 章 灯塔"]
  ],
  "book-directory": [
    ["back", "route.pop", "返回书籍详情"],
    ["toc-directory", "tab.item.select", "切换到目录"],
    ["toc-bookmark", "tab.item.select", "切换到书签"],
    ["toc-retry", "download.task.retry", "重试目录解析"],
    ["source-switch", "source.switch.open", "切换书源"],
    ["chapter-30-old-day", "reader.chapter.jump", "第 30 章 旧日"],
    ["chapter-31-return", "reader.chapter.jump", "第 31 章 归途"],
    ["chapter-32-rain-night", "reader.chapter.jump", "第 32 章 雨夜"],
    ["chapter-33-lighthouse", "reader.chapter.jump", "第 33 章 灯塔"],
    ["chapter-34-old-map", "reader.chapter.jump", "第 34 章 旧地图"],
    ["chapter-35-night-walk", "reader.chapter.jump", "第 35 章 夜行"],
    ["chapter-36-after-lighthouse", "reader.chapter.jump", "第 36 章 灯塔之后"]
  ]
};

function bookshelfActionDeclarations() {
  return BOOKSHELF_ACTION_SPECS.map(([settingsKey, uiEvent, label]) => {
    const entityKey = `library.button.button.${settingsKey}`;
    return {
      entityKey, controlKey: `${entityKey}@bookshelf.default`,
      controlId: `library.button.bookshelf.default.button.${settingsKey}`,
      actionKey: settingsKey, instanceKey: null, needsActionKey: false,
      needsInstanceKey: false, mappingStatus: "mapped", uiEvent,
      route: "bookshelf", state: "default", domain: "library", family: "button", role: "button",
      renderer: "bookshelfV2", rendererFile: "renderers/d2-bookshelf-discover-renderers.js",
      rendererSlot: "bookshelfV2@renderers/d2-bookshelf-discover-renderers.js",
      pageFamily: "bookshelf", source: "bookshelf-action", label, settingsKey
    };
  });
}

function bookDetailActionDeclarations() {
  return Object.entries(BOOK_DETAIL_ROUTE_ACTION_SPECS).flatMap(([route, specs]) =>
    specs.map(([settingsKey, uiEvent, label]) => {
      const entityKey = `library.button.button.${settingsKey}`;
      const renderer = route === "book-directory" ? "bookDirectoryV2" : "bookDetailV2";
      return {
        entityKey, controlKey: `${entityKey}@${route}.default`,
        controlId: `library.button.${route}.default.button.${settingsKey}`,
        actionKey: settingsKey, instanceKey: null, needsActionKey: false,
        needsInstanceKey: false, mappingStatus: "mapped", uiEvent,
        route, state: "default", domain: "library", family: "button", role: "button",
        renderer, rendererFile: "renderers/d2-bookshelf-discover-renderers.js",
        rendererSlot: `${renderer}@renderers/d2-bookshelf-discover-renderers.js`,
        pageFamily: "book-detail", source: "book-detail-action", label, settingsKey
      };
    })
  );
}

function readerRuntimeActionDeclarations() {
  const contractModule = { exports: {} };
  const contractWindow = {};
  const source = readFileSync(READER_RUNTIME_CONTRACT_PATH, "utf8");
  Function("module", "window", "globalThis", source)(contractModule, contractWindow, contractWindow);
  const specs = contractModule.exports.CONTROL_SPECS || contractWindow.ReaderRuntimeContract?.CONTROL_SPECS || [];
  return specs.map((spec) => {
    const entityKey = `reader.control.${spec.role}.${spec.settingsKey}`;
    return {
      entityKey,
      controlKey: `${entityKey}@${spec.route}.default`,
      controlId: `reader.control.${spec.route}.default.${spec.role}.${spec.settingsKey}`,
      actionKey: spec.settingsKey,
      instanceKey: null,
      needsActionKey: false,
      needsInstanceKey: false,
      mappingStatus: "mapped",
      uiEvent: spec.uiEvent,
      route: spec.route,
      state: "default",
      domain: "reader",
      family: "control",
      role: spec.role,
      renderer: "ReaderRuntimeContract.instrumentDom",
      rendererFile: "reader-runtime-contract.js",
      rendererSlot: "ReaderRuntimeContract.instrumentDom@reader-runtime-contract.js",
      pageFamily: "reader-runtime",
      source: "reader-runtime-action",
      label: spec.label,
      settingsKey: spec.settingsKey
    };
  });
}

function rssRuntimeActionDeclarations() {
  const contractModule = { exports: {} };
  const contractWindow = {};
  const source = readFileSync(RSS_RUNTIME_CONTRACT_PATH, "utf8");
  Function("module", "window", "globalThis", source)(contractModule, contractWindow, contractWindow);
  const specs = contractModule.exports.CONTROL_SPECS || contractWindow.ReaderRssRuntimeContract?.CONTROL_SPECS || [];
  return specs.map((spec) => {
    const entityKey = `rss.control.${spec.role}.${spec.settingsKey}`;
    return {
      entityKey,
      controlKey: `${entityKey}@${spec.route}.default`,
      controlId: `rss.control.${spec.route}.default.${spec.role}.${spec.settingsKey}`,
      actionKey: spec.settingsKey,
      instanceKey: null,
      needsActionKey: false,
      needsInstanceKey: false,
      mappingStatus: "mapped",
      uiEvent: spec.uiEvent,
      route: spec.route,
      state: "default",
      domain: "rss",
      family: "control",
      role: spec.role,
      renderer: "mainTabRss",
      rendererFile: "render-runtime.js",
      rendererSlot: "mainTabRss@render-runtime.js",
      pageFamily: "rss",
      source: "rss-action",
      label: spec.label,
      settingsKey: spec.settingsKey
    };
  });
}

function sourceSwitchActionDeclarations() {
  const rendererModule = { exports: {} };
  const rendererWindow = {};
  const source = readFileSync(SOURCE_SWITCH_RENDERER_PATH, "utf8");
  Function("module", "window", "globalThis", source)(rendererModule, rendererWindow, rendererWindow);
  const specs = rendererModule.exports.SOURCE_CONTROL_SPECS || rendererWindow.ReaderW3SourceSwitchRenderers?.SOURCE_CONTROL_SPECS || [];
  return specs.map((spec) => {
    const entityKey = `source-switch.control.button.${spec.settingsKey}`;
    return {
      entityKey,
      controlKey: `${entityKey}@${spec.route}.default`,
      controlId: `source-switch.control.${spec.route}.default.button.${spec.settingsKey}`,
      actionKey: spec.settingsKey,
      instanceKey: null,
      needsActionKey: false,
      needsInstanceKey: false,
      mappingStatus: "mapped",
      uiEvent: spec.uiEvent,
      route: spec.route,
      state: "default",
      domain: "source-switch",
      family: "control",
      role: "button",
      renderer: "sourceSwitchV2",
      rendererFile: "renderers/w3-source-switch-renderers.js",
      rendererSlot: "sourceSwitchV2@renderers/w3-source-switch-renderers.js",
      pageFamily: "source-switch",
      source: "source-switch-action",
      label: spec.label,
      settingsKey: spec.settingsKey
    };
  });
}

function syncBackupActionDeclarations() {
  const rendererWindow = {};
  const source = readFileSync(SYNC_BACKUP_RENDERER_PATH, "utf8");
  Function("window", "globalThis", source)(rendererWindow, rendererWindow);
  const specs = rendererWindow.ReaderD2SettingsSyncRenderers?.SOURCE_CONTROL_SPECS || [];
  return specs.map((spec) => {
    const entityKey = `sync-backup.control.${spec.role}.${spec.settingsKey}`;
    return {
      entityKey,
      controlKey: `${entityKey}@${spec.route}.${spec.state}`,
      controlId: `sync-backup.control.${spec.route}.${spec.state}.${spec.role}.${spec.settingsKey}`,
      actionKey: spec.settingsKey,
      instanceKey: null,
      needsActionKey: false,
      needsInstanceKey: false,
      mappingStatus: "mapped",
      uiEvent: spec.uiEvent,
      route: spec.route,
      state: spec.state,
      domain: "sync-backup",
      family: "control",
      role: spec.role,
      renderer: "backupScreenV2",
      rendererFile: "renderers/d2-settings-sync-renderers.js",
      rendererSlot: "backupScreenV2@renderers/d2-settings-sync-renderers.js",
      pageFamily: "sync-backup",
      source: "sync-backup-action",
      label: spec.label,
      settingsKey: spec.settingsKey
    };
  });
}

function restorePreviewActionDeclarations() {
  const rendererWindow = {};
  const source = readFileSync(SYNC_BACKUP_RENDERER_PATH, "utf8");
  Function("window", "globalThis", source)(rendererWindow, rendererWindow);
  const specs = rendererWindow.ReaderD2SettingsSyncRenderers?.RESTORE_CONTROL_SPECS || [];
  return specs.map((spec) => {
    const entityKey = `restore-preview.control.${spec.role}.${spec.settingsKey}`;
    return {
      entityKey,
      controlKey: `${entityKey}@${spec.route}.${spec.state}`,
      controlId: `restore-preview.control.${spec.route}.${spec.state}.${spec.role}.${spec.settingsKey}`,
      actionKey: spec.settingsKey,
      instanceKey: null,
      needsActionKey: false,
      needsInstanceKey: false,
      mappingStatus: "mapped",
      uiEvent: spec.uiEvent,
      route: spec.route,
      state: spec.state,
      domain: "restore-preview",
      family: "control",
      role: spec.role,
      renderer: "restoreFlowV2",
      rendererFile: "renderers/d2-settings-sync-renderers.js",
      rendererSlot: "restoreFlowV2@renderers/d2-settings-sync-renderers.js",
      pageFamily: "about-restore-preview",
      source: "restore-preview-action",
      label: spec.label,
      settingsKey: spec.settingsKey
    };
  });
}

function aboutActionDeclarations() {
  const rendererWindow = {};
  const source = readFileSync(SYNC_BACKUP_RENDERER_PATH, "utf8");
  Function("window", "globalThis", source)(rendererWindow, rendererWindow);
  const specs = rendererWindow.ReaderD2SettingsSyncRenderers?.ABOUT_CONTROL_SPECS || [];
  return specs.map((spec) => {
    const entityKey = `about.control.button.${spec.settingsKey}`;
    return {
      entityKey,
      controlKey: `${entityKey}@${spec.route}.default`,
      controlId: `about.control.${spec.route}.default.button.${spec.settingsKey}`,
      actionKey: spec.settingsKey,
      instanceKey: null,
      needsActionKey: false,
      needsInstanceKey: false,
      mappingStatus: "mapped",
      uiEvent: spec.uiEvent,
      route: spec.route,
      state: "default",
      domain: "about",
      family: "control",
      role: "button",
      renderer: "aboutScreenV2",
      rendererFile: "renderers/d2-settings-sync-renderers.js",
      rendererSlot: "aboutScreenV2@renderers/d2-settings-sync-renderers.js",
      pageFamily: "about-restore-preview",
      source: "about-action",
      label: spec.label,
      settingsKey: spec.settingsKey
    };
  });
}

// R2a page-family pilots add stable semantic action identities that cannot be
// recovered from the historical occurrence registry (the registry still
// contains ordinal keys for these controls). Earlier pilots wrote their
// declarations directly into the generated artifact; preserve those entries
// while the registry migration remains open.
let preservedPilotActionDeclarations = [];
let preservedPilotSubcontrolDeclarations = [];
try {
  const previousModule = { exports: {} };
  const previousSource = readFileSync(OUTPUT_PATH, "utf8");
  Function("module", "window", previousSource)(previousModule, {});
  preservedPilotActionDeclarations = (previousModule.exports.CANONICAL_CONTROL_DECLARATIONS || [])
    .filter((entry) => entry.source === "a3-action")
    .map((entry) => ({
      ...entry,
      actionKey: entry.actionKey ?? entry.settingsKey,
      instanceKey: entry.instanceKey ?? null,
      needsActionKey: entry.needsActionKey ?? false,
      needsInstanceKey: entry.needsInstanceKey ?? false,
      mappingStatus: entry.mappingStatus ?? "mapped",
      rendererSlot: entry.rendererSlot ?? `${entry.renderer}@${entry.rendererFile}`
    }));
  preservedPilotSubcontrolDeclarations = (previousModule.exports.CANONICAL_CONTROL_DECLARATIONS || [])
    .filter((entry) => entry.source === "r2.0-subcontrol")
    .map((entry) => ({
      ...entry,
      actionKey: entry.actionKey ?? entry.settingsKey,
      instanceKey: entry.instanceKey ?? null,
      needsActionKey: entry.needsActionKey ?? false,
      needsInstanceKey: entry.needsInstanceKey ?? false,
      mappingStatus: entry.mappingStatus ?? "mapped",
      rendererSlot: entry.rendererSlot ?? `${entry.renderer}@${entry.rendererFile}`
    }));
} catch (_error) {
  preservedPilotActionDeclarations = [];
}

// ---- Route → domain mapping (for subcontrol declarations) ----
// 12 page families 中的 about-restore-preview 跨 system/sync 两个 domain，所以按 route 单独映射
const ROUTE_DOMAIN = {
  "bookshelf": "library",
  "bookshelf-empty": "library",
  "bookshelf-cover-mode": "library",
  "bookshelf-list-mode": "library",
  "bookshelf-book-more-menu": "library",
  "bookshelf-search-settings": "library",
  "book-detail": "library",
  "book-detail-toc-preview": "library",
  "book-directory": "library",
  "search-results": "library",
  "search-loading": "library",
  "search-empty": "library",
  "search-error": "library",
  "import-conflict-resolve": "import",
  "import-duplicate": "import",
  "import-empty-file": "import",
  "import-format-unsupported": "import",
  "import-parsing": "import",
  "import-partial-success": "import",
  "import-permission-denied": "import",
  "import-result-detail": "import",
  "discover": "discover",
  "discover-home": "discover",
  "discover-control": "discover",
  "discover-sort": "discover",
  "discover-entry-bestseller": "discover",
  "discover-entry-booklist": "discover",
  "discover-entry-category": "discover",
  "discover-entry-finished": "discover",
  "discover-entry-latest": "discover",
  "discover-entry-new": "discover",
  "discover-entry-ranking": "discover",
  "discover-entry-source": "discover",
  "rss": "rss",
  "rss-all": "rss",
  "rss-source-feed": "rss",
  "rss-source-category-novel": "rss",
  "rss-source-category-tech": "rss",
  "rss-source-category-booklist": "rss",
  "rss-refreshing": "rss",
  "rss-source-category-releases": "rss",
  "rss-source-category-issues": "rss",
  "rss-source-category-discussions": "rss",
  "source-switch": "source-switch",
  "source-switch-results": "source-switch",
  "global-settings": "settings",
  "settings-general": "settings",
  "source-management": "source",
  "source-debug": "source",
  "source-settings-entry": "source",
  "webdav-config": "sync",
  "sync-backup": "sync",
  "sync-settings-entry": "sync",
  "backup-settings": "sync",
  "progress-sync": "sync",
  "progress-sync-status": "sync",
  "remote-webdav-books": "sync",
  "about": "system",
  "about-feedback": "system",
  "about-version": "system",
  "restore-confirm": "sync",
  "restore-scopes": "sync",
  "restore-preview": "sync",
  "restore-progress": "sync",
  "restore-running": "sync",
  "restore-conflict": "sync",
  "restore-result": "sync"
};

// ---- UiEvent exemption mapping (for null uiEvent registry entries) ----
// A0 (schema 1.3.0): mappingStatus values are derived from the independent
// (needsActionKey, needsInstanceKey) pair. The exemption conveys which kind
// of pending identity blocked the entry from carrying a canonical UiEvent.
function exemptionForMappingStatus(mappingStatus) {
  switch (mappingStatus) {
    case "pending-action-key":
      return "pending-action-key";
    case "pending-instance-key":
      return "pending-instance-key";
    case "pending-action-and-instance-key":
      return "pending-action-and-instance-key";
    case "mapped":
      return "pending-action-key";
    default:
      return "pending-action-key";
  }
}

// ---- Hash helper for deterministic slugs ----
function hash8(input) {
  return createHash("sha256").update(input, "utf8").digest("hex").slice(0, 8);
}

// ---- Build declarations from registry ----
const targetRoutes = Object.keys(dispatchMap.routes);
const targetRouteSet = new Set(targetRoutes);

const registryEntries = registry.entries
  .filter(e => targetRouteSet.has(e.route))
  .sort((a, b) => {
    if (a.route !== b.route) return a.route < b.route ? -1 : 1;
    if (a.controlKey !== b.controlKey) return a.controlKey < b.controlKey ? -1 : 1;
    return 0;
  });

const registryDeclarations = [];
for (const e of registryEntries) {
  const routeInfo = dispatchMap.routes[e.route];
  if (!routeInfo) continue;
  const uiEvent = e.source.uiEvent || null;
  // A0 (schema 1.3.0): declarations 保留 mappingStatus / actionKey / instanceKey /
  // rendererSlot 四字段。前三个直接从 registry entry 投影；rendererSlot 是
  // renderer owner 的稳定槽位标识（"renderer@rendererFile"），用于 12 个
  // renderer-owner family 的归属对账。
  const decl = {
    entityKey: e.entityKey,
    controlKey: e.controlKey,
    controlId: e.controlId,
    actionKey: e.actionKey,
    instanceKey: e.instanceKey,
    needsActionKey: e.needsActionKey,
    needsInstanceKey: e.needsInstanceKey,
    mappingStatus: e.mappingStatus,
    uiEvent: uiEvent,
    route: e.route,
    state: e.state,
    domain: e.domain,
    family: e.family,
    role: e.role,
    renderer: routeInfo.renderer,
    rendererFile: routeInfo.rendererFile,
    rendererSlot: `${routeInfo.renderer}@${routeInfo.rendererFile}`,
    pageFamily: routeInfo.pageFamily,
    source: "registry",
    label: e.source.label || null
  };
  if (uiEvent === null) {
    decl.uiEventExemption = exemptionForMappingStatus(e.mappingStatus);
  }
  registryDeclarations.push(decl);
}

// ---- Build subcontrol declarations from nonInteractiveContainers ----
const subcontrolRows = nonInteractive.entries
  .filter(e => e.containsUnenumeratedSubcontrols && targetRouteSet.has(e.routeId))
  .sort((a, b) => {
    if (a.routeId !== b.routeId) return a.routeId < b.routeId ? -1 : 1;
    if (a.candidateKey !== b.candidateKey) return a.candidateKey < b.candidateKey ? -1 : 1;
    return 0;
  });

const subcontrolDeclarations = [];
const missingBusinessKeys = [];
for (const row of subcontrolRows) {
  const routeInfo = dispatchMap.routes[row.routeId];
  if (!routeInfo) continue;
  const domain = ROUTE_DOMAIN[row.routeId] || routeInfo.pageFamily;
  // A0 (schema 1.3.0): subcontrol slug MUST be a business semantic key
  // from settings-subcontrol-business-keys.mjs, NOT a selector hash. This
  // satisfies the A0 invariant "50 个设置子控件改用业务语义 key，不再使用
  // selector hash". When the mapping is missing, fail-closed and report
  // the drift so the mapping table can be updated.
  const businessSlug = lookupSubcontrolBusinessKey(row.routeId, row.label);
  if (!businessSlug) {
    missingBusinessKeys.push({ routeId: row.routeId, label: row.label });
    continue;
  }
  const slug = businessSlug;
  const route = row.routeId;
  const state = row.state || "default";
  const candidateKey = row.candidateKey;

  // A1 (R2a): subcontrol declarations are now fully mapped. The business slug
  // from settings-subcontrol-business-keys.mjs is the actionKey (derived from
  // data-settings-key whitelist — see schema actionKey.description). Each
  // subcontrol has exactly one DOM occurrence per (route, state) shared across
  // viewports, so needsInstanceKey=false. mappingStatus="mapped" allows the
  // renderer to stamp data-control-key without tripping the fail-closed guard.
  //
  // controlId is constructed as {domain}.{family}.{route}.{state}.{role}.{slug}
  // (or .{slug}-{suffix} for stepper/segment multi-button rows). The slug is a
  // stable business semantic discriminator, NOT a selector hash — satisfying
  // the A0 invariant "50 个设置子控件改用业务语义 key".
  const subcontrolMappingStatus = "mapped";
  const subcontrolInstanceKey = null;
  const subcontrolNeedsActionKey = false;
  const subcontrolNeedsInstanceKey = false;
  const subcontrolRendererSlot = `${routeInfo.renderer}@${routeInfo.rendererFile}`;

  if (row.expectedSubcontrolType === "switch") {
    const entityKey = `${domain}.switch.switch.${slug}`;
    const controlKey = `${entityKey}@${route}.${state}`;
    const controlId = `${domain}.switch.${route}.${state}.switch.${slug}`;
    subcontrolDeclarations.push({
      entityKey, controlKey, controlId,
      actionKey: slug, instanceKey: subcontrolInstanceKey,
      needsActionKey: subcontrolNeedsActionKey, needsInstanceKey: subcontrolNeedsInstanceKey,
      mappingStatus: subcontrolMappingStatus,
      uiEvent: "toggle.switch",
      route, state, domain, family: "switch", role: "switch",
      renderer: routeInfo.renderer, rendererFile: routeInfo.rendererFile,
      rendererSlot: subcontrolRendererSlot,
      pageFamily: routeInfo.pageFamily, source: "r2.0-subcontrol",
      expectedSubcontrolType: "switch", expectedSubcontrolIndex: 0,
      label: row.label || null, candidateKey,
      settingsKey: slug
    });
  } else if (row.expectedSubcontrolType === "select") {
    const entityKey = `${domain}.combobox.combobox.${slug}`;
    const controlKey = `${entityKey}@${route}.${state}`;
    const controlId = `${domain}.combobox.${route}.${state}.combobox.${slug}`;
    subcontrolDeclarations.push({
      entityKey, controlKey, controlId,
      actionKey: slug, instanceKey: subcontrolInstanceKey,
      needsActionKey: subcontrolNeedsActionKey, needsInstanceKey: subcontrolNeedsInstanceKey,
      mappingStatus: subcontrolMappingStatus,
      uiEvent: "dropdown.option.select",
      route, state, domain, family: "combobox", role: "combobox",
      renderer: routeInfo.renderer, rendererFile: routeInfo.rendererFile,
      rendererSlot: subcontrolRendererSlot,
      pageFamily: routeInfo.pageFamily, source: "r2.0-subcontrol",
      expectedSubcontrolType: "select", expectedSubcontrolIndex: 0,
      label: row.label || null, candidateKey,
      settingsKey: slug
    });
  } else if (row.expectedSubcontrolType === "stepper") {
    const buttons = [
      { suffix: "stepper-minus", labelSuffix: "-", uiEvent: "stepper.valueChange" },
      { suffix: "stepper-plus", labelSuffix: "+", uiEvent: "stepper.valueChange" }
    ];
    for (let i = 0; i < buttons.length; i++) {
      const b = buttons[i];
      const entityKey = `${domain}.button.button.${b.suffix}.${slug}`;
      const controlKey = `${entityKey}@${route}.${state}`;
      const controlId = `${domain}.button.${route}.${state}.button.${slug}-${b.suffix}`;
      subcontrolDeclarations.push({
        entityKey, controlKey, controlId,
        actionKey: `${slug}.${b.suffix}`, instanceKey: subcontrolInstanceKey,
        needsActionKey: subcontrolNeedsActionKey, needsInstanceKey: subcontrolNeedsInstanceKey,
        mappingStatus: subcontrolMappingStatus,
        uiEvent: b.uiEvent,
        route, state, domain, family: "button", role: "button",
        renderer: routeInfo.renderer, rendererFile: routeInfo.rendererFile,
        rendererSlot: subcontrolRendererSlot,
        pageFamily: routeInfo.pageFamily, source: "r2.0-subcontrol",
        expectedSubcontrolType: "stepper", expectedSubcontrolIndex: i,
        label: (row.label || null) ? `${row.label} [${b.labelSuffix}]` : null,
        candidateKey, settingsKey: `${slug}-${b.suffix}`
      });
    }
  } else if (row.expectedSubcontrolType === "segment") {
    for (let i = 0; i < 3; i++) {
      const entityKey = `${domain}.button.button.segment-option-${i + 1}.${slug}`;
      const controlKey = `${entityKey}@${route}.${state}`;
      const controlId = `${domain}.button.${route}.${state}.button.${slug}-segment-option-${i + 1}`;
      subcontrolDeclarations.push({
        entityKey, controlKey, controlId,
        actionKey: `${slug}.segment-option-${i + 1}`, instanceKey: subcontrolInstanceKey,
        needsActionKey: subcontrolNeedsActionKey, needsInstanceKey: subcontrolNeedsInstanceKey,
        mappingStatus: subcontrolMappingStatus,
        uiEvent: "segment.item.switch",
        route, state, domain, family: "button", role: "button",
        renderer: routeInfo.renderer, rendererFile: routeInfo.rendererFile,
        rendererSlot: subcontrolRendererSlot,
        pageFamily: routeInfo.pageFamily, source: "r2.0-subcontrol",
        expectedSubcontrolType: "segment", expectedSubcontrolIndex: i,
        label: (row.label || null) ? `${row.label} [option-${i + 1}]` : null,
        candidateKey, settingsKey: `${slug}-segment-option-${i + 1}`
      });
    }
  } else {
    console.error(`WARNING: unknown expectedSubcontrolType "${row.expectedSubcontrolType}" on route ${row.routeId}`);
  }
}

// A0 (schema 1.3.0): fail-closed when the business key mapping table is out
// of sync with the audit. Every subcontrol row MUST have a business semantic
// slug; selector-hash slugs are forbidden by the A0 invariant.
if (missingBusinessKeys.length > 0) {
  console.error("FAIL: subcontrol rows missing business key mapping (selector hash forbidden by A0):");
  for (const v of missingBusinessKeys.slice(0, 20)) {
    console.error("  ", `${v.routeId}::${v.label}`);
  }
  if (missingBusinessKeys.length > 20) {
    console.error(`  ... and ${missingBusinessKeys.length - 20} more`);
  }
  console.error("Update tools/interaction-inventory/settings-subcontrol-business-keys.mjs to cover these rows.");
  process.exit(1);
}

// ---- Combine and sort declarations ----
const PAGE_FAMILY_ORDER = [
  "bookshelf", "book-detail", "reader-runtime", "search-results", "import-conflict-resolve",
  "discover", "rss", "source-switch", "settings-general",
  "source-management", "webdav-config", "sync-backup", "about-restore-preview"
];

function sourceRank(s) { return s === "registry" ? 0 : 1; }

// Once a pilot control is stamped it leaves nonInteractiveContainers and moves
// into the semantic inventory. Keep the original 50 business-key declarations
// as the stable identity source rather than shrinking the declaration set.
const effectiveSubcontrolDeclarations = preservedPilotSubcontrolDeclarations.length >= 50
  ? preservedPilotSubcontrolDeclarations
  : subcontrolDeclarations;

const allDeclarations = registryDeclarations
  .concat(effectiveSubcontrolDeclarations)
  .concat(preservedPilotActionDeclarations)
  .concat(bookshelfActionDeclarations())
  .concat(bookDetailActionDeclarations())
  .concat(readerRuntimeActionDeclarations())
  .concat(rssRuntimeActionDeclarations())
  .concat(sourceSwitchActionDeclarations())
  .concat(syncBackupActionDeclarations())
  .concat(restorePreviewActionDeclarations())
  .concat(aboutActionDeclarations());
allDeclarations.sort((a, b) => {
  const fa = PAGE_FAMILY_ORDER.indexOf(a.pageFamily);
  const fb = PAGE_FAMILY_ORDER.indexOf(b.pageFamily);
  if (fa !== fb) return fa - fb;
  if (a.route !== b.route) return a.route < b.route ? -1 : 1;
  if (a.source !== b.source) return sourceRank(a.source) - sourceRank(b.source);
  if (a.controlKey !== b.controlKey) return a.controlKey < b.controlKey ? -1 : 1;
  return 0;
});

// ---- Validate ----
const invalidUiEvents = [];
for (const d of allDeclarations) {
  if (d.uiEvent !== null && !uiEventEnum.has(d.uiEvent)) {
    invalidUiEvents.push({ entityKey: d.entityKey, uiEvent: d.uiEvent });
  }
}
if (invalidUiEvents.length > 0) {
  console.error("FAIL: invalid UiEvent values:");
  for (const v of invalidUiEvents.slice(0, 10)) console.error("  ", v);
  process.exit(1);
}

const missingUiEventExemption = [];
for (const d of allDeclarations) {
  if (d.uiEvent === null && !d.uiEventExemption) {
    missingUiEventExemption.push({ entityKey: d.entityKey, controlKey: d.controlKey });
  }
}
if (missingUiEventExemption.length > 0) {
  console.error("FAIL: declarations with null uiEvent but no uiEventExemption:");
  for (const v of missingUiEventExemption.slice(0, 10)) console.error("  ", v);
  process.exit(1);
}

const missingControlIdExemption = [];
for (const d of allDeclarations) {
  if (d.controlId === null && !d.controlIdExemption) {
    missingControlIdExemption.push({ entityKey: d.entityKey, controlKey: d.controlKey });
  }
}
if (missingControlIdExemption.length > 0) {
  console.error("FAIL: declarations with null controlId but no controlIdExemption:");
  for (const v of missingControlIdExemption.slice(0, 10)) console.error("  ", v);
  process.exit(1);
}

// ---- Compute meta ----
const subByType = { switch: 0, select: 0, stepper: 0, segment: 0 };
for (const d of effectiveSubcontrolDeclarations) {
  subByType[d.expectedSubcontrolType] = (subByType[d.expectedSubcontrolType] || 0) + 1;
}

const meta = {
  generatedAt: "2026-07-20T00:00:00.000Z",
  baselineCommit: "5ce233f",
  baselineTag: "R1.2",
  generator: "tools/interaction-inventory/generate-canonical-declarations.mjs",
  pageFamilies: PAGE_FAMILY_ORDER.slice(),
  totals: {
    registryBacked: registryDeclarations.length,
    r2Subcontrols: effectiveSubcontrolDeclarations.length,
    readerRuntimeActions: allDeclarations.filter((entry) => entry.source === "reader-runtime-action").length,
    sourceSwitchActions: allDeclarations.filter((entry) => entry.source === "source-switch-action").length,
    subcontrolsByType: subByType,
    total: allDeclarations.length
  },
  exemptionSummary: {
    registryUiEventNull: registryDeclarations.filter(d => d.uiEvent === null).length,
    subcontrolControlIdNull: effectiveSubcontrolDeclarations.filter(d => d.controlId === null).length
  }
};

// ---- Serialize ----
function serializeDeclarations(decls, metaObj) {
  const lines = [];
  lines.push("/**");
  lines.push(" * R2.0.1 · Canonical Renderer Control Identity Declarations (GENERATED)");
  lines.push(" * -----------------------------------------------------------------------------");
  lines.push(" * 职责：为 frontend-demo-optimized/ 的 canonical renderer 声明每个渲染控件对应");
  lines.push(" *       的 entityKey / controlKey / UiEvent 映射，作为 R2a/R2b/R3a/VC3-R3b 接入");
  lines.push(" *       DOM 属性（data-entity-key / data-control-key / data-control-id）的前置");
  lines.push(" *       对账源。");
  lines.push(" *");
  lines.push(" * A0 统一阶段命名（见 DENOMINATOR_RECONCILIATION.md §0）：");
  lines.push(" *   - R2a：DOM identity instrumentation（renderer 写入 data-* 属性）");
  lines.push(" *   - R2b：真实交互和状态机（UiEvent / state owner / effect owner）");
  lines.push(" *   - R3a：Figma 前功能验证（本地 handoff packet，不访问 Figma）");
  lines.push(" *   - VC3 / R3b：Figma 回写后的最终浏览器验证");
  lines.push(" *");
  lines.push(" * A0 三套分母（不混用）：");
  lines.push(" *   - 13 个视觉/交互验收单元（12 非 Reader 页面族 + Settings General 试点）");
  lines.push(" *   - 12 个 renderer-owner family（本文件覆盖的 pageFamilies）");
  lines.push(" *   - 3,752 个 DOM occurrence（registry entries）");
  lines.push(" *");
  lines.push(" * 范围（12 页面族 exact gate）：");
  lines.push(" *   bookshelf / book-detail / search-results / import-conflict-resolve /");
  lines.push(" *   discover / rss / source-switch / settings-general / source-management /");
  lines.push(" *   webdav-config / sync-backup / about-restore-preview");
  lines.push(" *");
  lines.push(" * 数据来源：");
  lines.push(" *   1. registry-backed 声明：从 R1.2 control-id-registry.json 投影 12 页面族下");
  lines.push(" *      每个 route 的所有 occurrence（route-local 1:1 对账，非全局集合）。");
  lines.push(" *      A0 (schema 1.3.0): 每个 declaration 携带 mappingStatus / actionKey /");
  lines.push(" *      instanceKey / rendererSlot 四字段；mappingStatus 派生自独立的");
  lines.push(" *      (needsActionKey, needsInstanceKey) 二元组（4 桶：mapped /");
  lines.push(" *      pending-action-key / pending-instance-key / pending-action-and-instance-key）。");
  lines.push(" *   2. r2.0-subcontrol 声明：R1.2 nonInteractiveContainers.json 标记的 46 个");
  lines.push(" *      containsUnenumeratedSubcontrols 设置行子控件，按 expectedSubcontrolCount");
  lines.push(" *      展开：switch→1, select→1, stepper→2 (minus+plus), segment→3。");
  lines.push(" *      A0: 50 个子控件 slug 来自 settings-subcontrol-business-keys.mjs 业务语义");
  lines.push(" *      映射表，不再使用 selector hash / ordinal fallback。");
  lines.push(" *");
  lines.push(" * 生成器：tools/interaction-inventory/generate-canonical-declarations.mjs");
  lines.push(" * 生成基线：commit 5ce233f（R1.2），2026-07-20；A0 (schema 1.3.0) 增量 2026-07-20");
  lines.push(" *");
  lines.push(" * 不做的事（R2.0.1 / A0 边界）：");
  lines.push(" *   - 不写 data-control-id / data-entity-key / data-control-key 到渲染输出 HTML（R2a 范围）");
  lines.push(" *   - 不重构 renderer 行为（switch 还是 span；segment/stepper 缺事件不补）");
  lines.push(" *   - 不修改 R1.2 冻结的 schema/types/src-control-identity/registry");
  lines.push(" *   - 不在 mappingStatus 非 \"mapped\" 时写 data-control-key（A0 fail-closed guard）");
  lines.push(" *");
  lines.push(" * 重算：node tools/interaction-inventory/generate-canonical-declarations.mjs");
  lines.push(" * 校验：node tools/interaction-inventory/generate-canonical-declarations.mjs --check");
  lines.push(" * -----------------------------------------------------------------------------");
  lines.push(" */");
  lines.push("");
  lines.push("// ESM-friendly: 同时提供 CommonJS module.exports 和浏览器全局挂载");
  lines.push("");
  lines.push("var CANONICAL_CONTROL_DECLARATIONS = [");
  for (let i = 0; i < decls.length; i++) {
    const d = decls[i];
    const entries = Object.entries(d);
    const isLast = i === decls.length - 1;
    lines.push("    {");
    for (let j = 0; j < entries.length; j++) {
      const [k, v] = entries[j];
      const valueJson = JSON.stringify(v);
      const comma = j < entries.length - 1 ? "," : "";
      lines.push(`      ${JSON.stringify(k)}: ${valueJson}${comma}`);
    }
    lines.push(`    }${isLast ? "" : ","}`);
  }
  lines.push("  ];");
  lines.push("");
  const metaJson = JSON.stringify(metaObj, null, 2);
  const metaIndented = metaJson.split("\n").map((line, idx) => idx === 0 ? line : "  " + line).join("\n");
  lines.push("var R2_DECLARATIONS_META = " + metaIndented + ";");
  lines.push("");
  lines.push("// ESM-friendly: 同时提供 CommonJS module.exports 和浏览器全局挂载");
  lines.push("if (typeof module !== \"undefined\" && module.exports) {");
  lines.push("  module.exports = {");
  lines.push("    CANONICAL_CONTROL_DECLARATIONS,");
  lines.push("    R2_DECLARATIONS_META,");
  lines.push("  };");
  lines.push("}");
  lines.push("if (typeof window !== \"undefined\") {");
  lines.push("  window.CANONICAL_CONTROL_DECLARATIONS = CANONICAL_CONTROL_DECLARATIONS;");
  lines.push("  window.R2_DECLARATIONS_META = R2_DECLARATIONS_META;");
  lines.push("}");
  lines.push("");
  return lines.join("\n");
}

const output = serializeDeclarations(allDeclarations, meta);

// ---- Write or check ----
if (CHECK_MODE) {
  let existing = "";
  try {
    existing = readFileSync(OUTPUT_PATH, "utf8");
  } catch (e) {
    // file doesn't exist
  }
  if (existing === output) {
    console.log(`OK: declarations up-to-date (${allDeclarations.length} entries)`);
    process.exit(0);
  } else {
    console.error(`DRIFT: declarations file is out of date`);
    console.error(`  expected: ${allDeclarations.length} entries, ${output.length} bytes`);
    console.error(`  actual:   ${existing.length} bytes`);
    console.error(`  run without --check to regenerate`);
    process.exit(1);
  }
} else {
  writeFileSync(OUTPUT_PATH, output, "utf8");
  console.log(`Wrote ${OUTPUT_PATH.replace(REPO_ROOT + "/", "")}`);
  console.log(`  total: ${allDeclarations.length} declarations`);
  console.log(`    registry-backed: ${registryDeclarations.length}`);
  console.log(`    r2.0-subcontrol: ${effectiveSubcontrolDeclarations.length} (switch ${subByType.switch} / select ${subByType.select} / stepper ${subByType.stepper} / segment ${subByType.segment})`);
  console.log(`  page families: ${PAGE_FAMILY_ORDER.length}`);
}
