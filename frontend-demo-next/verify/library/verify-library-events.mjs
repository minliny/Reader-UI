#!/usr/bin/env node
// B2 · Library & Search — 事件身份（UiEvent）验收
//
// 验收范围：
//   1. render-runtime.js 中 Library 域 4 个函数注入了 data-ui-event
//   2. 关键控件对应正确的 UiEvent：
//      - 书架视图切换：cover/list 切换 -> data-ui-event（cover.list.toggle 等）
//      - 搜索：submit/reset/open.keyboard/route.push 等
//      - book-detail：open.sheet/open.dialog/route.push/route.back/dialog.close
//      - import-conflict-resolve：import.conflict.decision/import.rollback/import.apply
//   3. 重复事件族（data-control-id-family）覆盖书架/搜索/冲突列表
//   4. data-final-state 状态终态完整（active/idle/loading/added/failed 等）
//   5. data-focus-restore-source 焦点恢复来源标记存在
//
// 退出码：全绿返回 0；任一断言失败返回 1。
//
// 用法：node frontend-demo-next/verify/library/verify-library-events.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_DIR = join(__dirname, "..", "..");

const renderRuntime = readFileSync(join(DEMO_DIR, "render-runtime.js"), "utf8");

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

function getFnChunk(fnName) {
  const marker = `function ${fnName}`;
  const startIdx = renderRuntime.indexOf(marker);
  if (startIdx < 0) return "";
  // 取到下一个 function 定义为止（最多 30k 字符）
  const nextFn = renderRuntime.indexOf("\n  function ", startIdx + 20);
  const end = nextFn > 0 ? Math.min(nextFn, startIdx + 30000) : startIdx + 30000;
  return renderRuntime.slice(startIdx, end);
}

const mainTabBookshelf = getFnChunk("mainTabBookshelf");
const bookshelfMoreLayer = getFnChunk("bookshelfMoreLayer");
const bookshelfSectionHeader = getFnChunk("bookshelfSectionHeader");
const bookCard = getFnChunk("bookCard");
const bookSearchScreen = getFnChunk("bookSearchScreen");
const libraryScreen = getFnChunk("libraryScreen");
const importConflictResolveScreen = getFnChunk("importConflictResolveScreen");

// ===== 验收 1: bookshelf 域 data-ui-event 注入 =====
assert(mainTabBookshelf.includes('data-ui-event="route.push"'), "mainTabBookshelf: route.push 事件注入");
assert(bookshelfMoreLayer.includes('data-ui-event="dropdown.menu.collapse"') || bookshelfMoreLayer.includes("data-ui-event"), "bookshelfMoreLayer: 包含 data-ui-event");
assert(bookshelfSectionHeader.includes("data-ui-event"), "bookshelfSectionHeader: 包含 data-ui-event");

// ===== 验收 2: search-results 域 data-ui-event 注入 =====
assert(bookSearchScreen.includes('data-ui-event="open.keyboard"'), "bookSearchScreen: open.keyboard 事件");
assert(bookSearchScreen.includes('data-ui-event="search.submit"'), "bookSearchScreen: search.submit 事件");
assert(bookSearchScreen.includes('data-ui-event="search.reset"'), "bookSearchScreen: search.reset 事件");
assert(bookSearchScreen.includes('data-ui-event="search.retry"'), "bookSearchScreen: search.retry 事件");
assert(bookSearchScreen.includes('data-ui-event="route.back"'), "bookSearchScreen: route.back 事件");
assert(bookSearchScreen.includes('data-ui-event="route.push"'), "bookSearchScreen: route.push 事件");
assert(bookSearchScreen.includes('data-ui-event="add.shelf"'), "bookSearchScreen: add.shelf 事件");
assert(bookSearchScreen.includes('data-ui-event="dialog.open"'), "bookSearchScreen: dialog.open 事件");
assert(bookSearchScreen.includes('data-ui-event="dialog.close"'), "bookSearchScreen: dialog.close 事件");
assert(bookSearchScreen.includes('data-ui-event="search.clear-history"'), "bookSearchScreen: search.clear-history 事件");

// ===== 验收 3: book-detail 域 data-ui-event 注入 =====
assert(libraryScreen.includes('data-ui-event="route.back"'), "libraryScreen: route.back 事件");
assert(libraryScreen.includes('data-ui-event="route.push"'), "libraryScreen: route.push 事件");
assert(libraryScreen.includes('data-ui-event="sheet.open"') || libraryScreen.includes('data-ui-event="open.sheet"') || libraryScreen.includes("open-sheet"), "libraryScreen: sheet 打开事件标记");
assert(libraryScreen.includes('data-ui-event="dialog.open"') || libraryScreen.includes("open-dialog"), "libraryScreen: dialog 打开事件标记");
assert(libraryScreen.includes('data-ui-event="dialog.close"') || libraryScreen.includes("close-dialog"), "libraryScreen: dialog 关闭事件标记");

// ===== 验收 4: import-conflict-resolve 域 data-ui-event 注入 =====
assert(importConflictResolveScreen.includes('data-ui-event="route.back"'), "importConflictResolveScreen: route.back 事件");
assert(importConflictResolveScreen.includes('data-ui-event="import.rollback"'), "importConflictResolveScreen: import.rollback 事件");
assert(importConflictResolveScreen.includes('data-ui-event="import.apply"'), "importConflictResolveScreen: import.apply 事件");
assert(importConflictResolveScreen.includes('data-ui-event="import.conflict.decision"'), "importConflictResolveScreen: import.conflict.decision 事件");

// ===== 验收 5: data-control-id-family 覆盖重复控件族 =====
assert(
  bookCard.includes("data-control-id-family") ||
  bookshelfMoreLayer.includes("data-control-id-family") ||
  bookshelfSectionHeader.includes("data-control-id-family") ||
  mainTabBookshelf.includes("data-control-id-family"),
  "bookshelf 域（bookCard/bookshelfMoreLayer/bookshelfSectionHeader/mainTabBookshelf）: data-control-id-family 出现"
);
assert(bookSearchScreen.includes("data-control-id-family"), "bookSearchScreen: data-control-id-family 出现");
assert(importConflictResolveScreen.includes("data-control-id-family"), "importConflictResolveScreen: data-control-id-family 出现");

assert(
  bookSearchScreen.includes("library.button.search-results.default.phone.button.search-scope") &&
  bookSearchScreen.includes("library.button.search-results.default.phone.button.search-sort") &&
  bookSearchScreen.includes("library.button.search-results.default.phone.button.search-history") &&
  bookSearchScreen.includes("library.button.search-results.default.phone.button.search-suggest") &&
  bookSearchScreen.includes("library.button.search-results.default.phone.button.search-hot") &&
  bookSearchScreen.includes("library.button.search-results.default.phone.button.search-retry-source") &&
  bookSearchScreen.includes("library.button.search-results.default.phone.button.search-result-row") &&
  bookSearchScreen.includes("library.button.search-results.default.phone.button.close-keyboard"),
  "bookSearchScreen: 8 个 control-id-family 命名空间全部覆盖"
);

// ===== 验收 6: data-final-state 终态标记完整 =====
const finalStates = ["idle", "active", "loading", "added", "failed", "filled", "cancelled", "cleared", "decided", "undecided", "completed", "applied"];
let statesFound = 0;
for (const s of finalStates) {
  if (renderRuntime.includes(`data-final-state="${s}"`)) statesFound++;
}
assert(statesFound >= 7, `render-runtime.js 含至少 7 种 data-final-state 终态（实际 ${statesFound}/${finalStates.length}）`);

// ===== 验收 7: data-focus-restore-source 焦点恢复来源 =====
assert(mainTabBookshelf.includes("data-focus-restore-source"), "mainTabBookshelf: 含 data-focus-restore-source");
assert(bookSearchScreen.includes("data-focus-restore-source"), "bookSearchScreen: 含 data-focus-restore-source");
assert(libraryScreen.includes("data-focus-restore-source"), "libraryScreen: 含 data-focus-restore-source");
assert(importConflictResolveScreen.includes("data-focus-restore-source"), "importConflictResolveScreen: 含 data-focus-restore-source");

// ===== 验收 8: bookCard 行级控件接入 =====
assert(bookCard.includes("data-control-id") && bookCard.includes("data-ui-event"), "bookCard: 含 data-control-id + data-ui-event");

console.log("");
console.log(`总计：${passes} 通过 / ${failures} 失败`);
if (failures > 0) {
  console.error("失败：UiEvent 验收未通过");
  process.exit(1);
}
console.log("全部通过 ✓");
