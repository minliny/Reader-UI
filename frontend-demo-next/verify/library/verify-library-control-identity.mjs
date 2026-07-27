#!/usr/bin/env node
// B2 · Library & Search — Control Identity 验收
//
// 验收范围：
//   1. library-shell.js 暴露 window.ReaderLibraryShell 且包含 LIBRARY_CONTROL_IDS 查找表
//   2. LIBRARY_CONTROL_IDS 的全部 controlId 符合 A2 schema pattern（contract-first）
//   3. 4 个页面族（bookshelf/book-detail/import-conflict-resolve/search-results）的关键
//      controlId 都能通过 controlId(routeId, state, viewport, role, discriminator) 解析
//   4. book-detail.default 和 book-detail.loading 的 controlId 互不相同（state atom 视觉等同但身份不同）
//   5. index.html 已加载 library-shell.js（且在 render.js 之前）
//   6. render-runtime.js 中 mainTabBookshelf/bookSearchScreen/libraryScreen/importConflictResolveScreen
//      函数体内出现 data-control-id 注入痕迹
//
// 退出码：全绿返回 0；任一断言失败返回 1。
//
// 用法：node frontend-demo-next/verify/library/verify-library-control-identity.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_DIR = join(__dirname, "..", "..");
const REPO_ROOT = join(DEMO_DIR, "..");
const CONTRACTS_DIR = join(REPO_ROOT, "contracts");

// ===== 加载 contracts =====
const controlIdentitySchema = JSON.parse(readFileSync(join(CONTRACTS_DIR, "control-identity.schema.json"), "utf8"));
const CONTROL_ID_PATTERN = new RegExp(controlIdentitySchema.properties.controlId.pattern);

// ===== 在 vm 沙箱中执行 library-shell.js =====
const libraryShellSrc = readFileSync(join(DEMO_DIR, "library-shell.js"), "utf8");

const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(libraryShellSrc, sandbox);

const RLS = sandbox.window.ReaderLibraryShell;
if (!RLS) {
  console.error("FAIL: window.ReaderLibraryShell 未定义");
  process.exit(1);
}

let failures = 0;
let passes = 0;
function assert(condition, label) {
  if (condition) {
    passes++;
    console.log(`[ PASS ] ${label}`);
  } else {
    failures++;
    console.error(`[ FAIL ] ${label}`);
  }
}

// ===== 验收 1: LIBRARY_CONTROL_IDS 是冻结的对象 =====
assert(
  RLS.LIBRARY_CONTROL_IDS && typeof RLS.LIBRARY_CONTROL_IDS === "object" && Object.isFrozen(RLS.LIBRARY_CONTROL_IDS),
  "LIBRARY_CONTROL_IDS 是已冻结的对象"
);

// ===== 验收 2: 全部 controlId 符合 A2 schema pattern =====
let allCidsMatchPattern = true;
let cidCount = 0;
for (const [key, cid] of Object.entries(RLS.LIBRARY_CONTROL_IDS)) {
  cidCount++;
  if (!CONTROL_ID_PATTERN.test(cid)) {
    console.error(`  pattern mismatch: ${key} -> ${cid}`);
    allCidsMatchPattern = false;
  }
}
assert(cidCount >= 40, `LIBRARY_CONTROL_IDS 含至少 40 个 ID（实际 ${cidCount}）`);
assert(allCidsMatchPattern, "全部 controlId 符合 A2 schema pattern");

// ===== 验收 3: 4 个页面族的关键 controlId 都能解析 =====
const expectedControlIds = [
  // bookshelf
  ["bookshelf", "default", "phone", "button", "top-action-search"],
  ["bookshelf", "default", "phone", "button", "view-cover"],
  ["bookshelf", "default", "phone", "button", "view-list"],
  ["bookshelf", "default", "phone", "button", "filter-toggle"],
  ["bookshelf", "default", "phone", "button", "more-close"],
  ["bookshelf", "default", "phone", "button", "nav-bookshelf"],
  ["bookshelf", "default", "phone", "button", "nav-discover"],
  ["bookshelf", "default", "phone", "button", "nav-rss"],
  ["bookshelf", "default", "phone", "button", "nav-settings"],
  // book-detail.default
  ["book-detail", "default", "phone", "button", "back"],
  ["book-detail", "default", "phone", "button", "open-source-sheet"],
  ["book-detail", "default", "phone", "button", "full-directory"],
  ["book-detail", "default", "phone", "button", "continue-reading"],
  ["book-detail", "default", "phone", "button", "open-remove-dialog"],
  ["book-detail", "default", "phone", "button", "link-youshu"],
  ["book-detail", "default", "phone", "button", "link-shucang"],
  ["book-detail", "default", "phone", "button", "local-cache"],
  ["book-detail", "default", "phone", "button", "close-source-sheet"],
  ["book-detail", "default", "phone", "button", "dialog-cancel"],
  ["book-detail", "default", "phone", "button", "dialog-confirm-remove"],
  // book-detail.loading
  ["book-detail", "loading", "phone", "button", "back"],
  ["book-detail", "loading", "phone", "button", "open-source-sheet"],
  ["book-detail", "loading", "phone", "button", "full-directory"],
  ["book-detail", "loading", "phone", "button", "continue-reading"],
  ["book-detail", "loading", "phone", "button", "open-remove-dialog"],
  ["book-detail", "loading", "phone", "button", "link-youshu"],
  ["book-detail", "loading", "phone", "button", "link-shucang"],
  ["book-detail", "loading", "phone", "button", "local-cache"],
  ["book-detail", "loading", "phone", "button", "close-source-sheet"],
  ["book-detail", "loading", "phone", "button", "dialog-cancel"],
  ["book-detail", "loading", "phone", "button", "dialog-confirm-remove"],
  // search-results
  ["search-results", "default", "phone", "button", "back"],
  ["search-results", "default", "phone", "searchbox", "input"],
  ["search-results", "default", "phone", "button", "search-submit"],
  ["search-results", "default", "phone", "button", "add-shelf"],
  ["search-results", "default", "phone", "textbox", "input"],
  ["search-results", "default", "phone", "button", "close-keyboard"],
  ["search-results", "default", "phone", "button", "search-reset"],
  ["search-results", "default", "phone", "button", "view-detail"],
  // import-conflict-resolve
  ["import-conflict-resolve", "default", "phone", "button", "back"],
  ["import-conflict-resolve", "default", "phone", "button", "keep-local"],
  ["import-conflict-resolve", "default", "phone", "button", "overwrite"],
  ["import-conflict-resolve", "default", "phone", "button", "keep-both"],
  ["import-conflict-resolve", "default", "phone", "button", "rollback"]
];

let allResolved = true;
for (const [route, state, vp, role, disc] of expectedControlIds) {
  const cid = RLS.controlId(route, state, vp, role, disc);
  if (!cid) {
    console.error(`  unresolved: ${route}.${state}.${vp}.${role}.${disc}`);
    allResolved = false;
  }
}
assert(allResolved, `全部 ${expectedControlIds.length} 个关键 controlId 可解析`);

// ===== 验收 4: book-detail.default vs loading 的 controlId 互不相同 =====
const defaultBack = RLS.controlId("book-detail", "default", "phone", "button", "back");
const loadingBack = RLS.controlId("book-detail", "loading", "phone", "button", "back");
assert(defaultBack !== loadingBack, `book-detail.default.back (${defaultBack}) != loading.back (${loadingBack})`);

const defaultOpenSheet = RLS.controlId("book-detail", "default", "phone", "button", "open-source-sheet");
const loadingOpenSheet = RLS.controlId("book-detail", "loading", "phone", "button", "open-source-sheet");
assert(defaultOpenSheet !== loadingOpenSheet, `book-detail.default.open-source-sheet != loading.open-source-sheet`);

// ===== 验收 5: index.html 已加载 library-shell.js，且在 render.js 之前 =====
const indexHtml = readFileSync(join(DEMO_DIR, "index.html"), "utf8");
const libShellIdx = indexHtml.indexOf("library-shell.js");
const renderJsIdx = indexHtml.indexOf("render.js");
assert(libShellIdx > 0, "index.html 加载 library-shell.js");
assert(renderJsIdx > 0, "index.html 加载 render.js");
assert(libShellIdx < renderJsIdx, "library-shell.js 在 render.js 之前加载");

const libShellCssIdx = indexHtml.indexOf("library-shell.css");
assert(libShellCssIdx > 0, "index.html 加载 library-shell.css");

// ===== 验收 6: render-runtime.js 中 Library 域函数出现 data-control-id 注入痕迹 =====
const renderRuntime = readFileSync(join(DEMO_DIR, "render-runtime.js"), "utf8");
const fns = [
  { name: "mainTabBookshelf", startMarker: "function mainTabBookshelf" },
  { name: "bookSearchScreen", startMarker: "function bookSearchScreen" },
  { name: "libraryScreen", startMarker: "function libraryScreen" },
  { name: "importConflictResolveScreen", startMarker: "function importConflictResolveScreen" }
];

for (const fn of fns) {
  const startIdx = renderRuntime.indexOf(fn.startMarker);
  assert(startIdx > 0, `render-runtime.js 含 ${fn.name}`);
  // 取出该函数的前 4000 个字符做检查（足够覆盖 control ID 注入）
  const fnChunk = renderRuntime.slice(startIdx, startIdx + 8000);
  const hasControlId = fnChunk.includes("data-control-id");
  assert(hasControlId, `${fn.name} 函数体内出现 data-control-id 注入`);
}

// ===== 验收 7: helper 函数正常工作 =====
assert(RLS.controlIdAttr("bookshelf", "default", "phone", "button", "view-cover").startsWith(' data-control-id="'), 'controlIdAttr 返回 " data-control-id=..." 前缀');
assert(RLS.controlIdAttr("nonexistent", "default", "phone", "button", "x") === "", 'controlIdAttr 对未知 key 返回空字符串');
assert(RLS.uiEventAttr("route.push") === ' data-ui-event="route.push"', 'uiEventAttr 拼接正确');
assert(RLS.uiEventAttr("") === "", 'uiEventAttr 空值返回空字符串');
assert(RLS.stateAttr("sheet-state", "closed") === ' data-sheet-state="closed"', 'stateAttr 拼接正确');
assert(RLS.stateAttr("loading-state", null) === "", 'stateAttr null 返回空');

console.log("");
console.log(`总计：${passes} 通过 / ${failures} 失败`);
if (failures > 0) {
  console.error("失败：Control Identity 验收未通过");
  process.exit(1);
}
console.log("全部通过 ✓");
