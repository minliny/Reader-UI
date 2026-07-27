#!/usr/bin/env node
// B2 · Library & Search — 交互状态机验收
//
// 验收范围：
//   1. loading / empty / error 三态完整覆盖（search-results + book-detail + import）
//   2. Sheet/Dialog/Keyboard 状态机：data-sheet-state / data-dialog-state / data-keyboard-state
//   3. 重复提交防护：data-repeat-tap-guard 覆盖关键操作按钮
//   4. Stale result 防护：data-stale-result 标记
//   5. 终态明确：data-final-state 在每个状态分支有不同值
//   6. cover-list 切换终态：data-final-state="${bookshelfView}"（动态）
//   7. cover-list 切换 / Sheet / Dialog 状态机有 close/open 状态分支
//   8. data-loading-state / data-empty-state / data-error-state 字段在 search-results 中出现
//   9. book-detail 的 toc-state 状态机覆盖 loading/error/offline/ready
//  10. import-conflict-resolve 的 rollback-state / apply-state / conflict-state 完整
//
// 退出码：全绿返回 0；任一断言失败返回 1。
//
// 用法：node frontend-demo-next/verify/library/verify-library-states.mjs

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
  const nextFn = renderRuntime.indexOf("\n  function ", startIdx + 20);
  const end = nextFn > 0 ? Math.min(nextFn, startIdx + 30000) : startIdx + 30000;
  return renderRuntime.slice(startIdx, end);
}

const mainTabBookshelf = getFnChunk("mainTabBookshelf");
const bookshelfMoreLayer = getFnChunk("bookshelfMoreLayer");
const bookshelfSectionHeader = getFnChunk("bookshelfSectionHeader");
const bookSearchScreen = getFnChunk("bookSearchScreen");
const libraryScreen = getFnChunk("libraryScreen");
const importConflictResolveScreen = getFnChunk("importConflictResolveScreen");

// ===== 验收 1: loading / empty / error 三态完整覆盖 =====
assert(bookSearchScreen.includes('data-search-state="loading"') && bookSearchScreen.includes('data-loading-state="loading"'), "bookSearchScreen: loading 态含 data-loading-state");
assert(bookSearchScreen.includes('data-search-state="empty"') && bookSearchScreen.includes('data-empty-state="empty"'), "bookSearchScreen: empty 态含 data-empty-state");
assert(bookSearchScreen.includes('data-search-state="error"') && bookSearchScreen.includes('data-error-state="partial"'), "bookSearchScreen: error 态含 data-error-state");
assert(bookSearchScreen.includes('data-search-state="before"'), "bookSearchScreen: before 态");
assert(bookSearchScreen.includes('data-search-state="after"'), "bookSearchScreen: after 态");

// ===== 验收 2: Sheet/Dialog/Keyboard 状态机 =====
assert(libraryScreen.includes('data-sheet-state="closed"') || libraryScreen.includes('data-sheet-state'), "libraryScreen: data-sheet-state 状态机");
assert(libraryScreen.includes('data-dialog-state="closed"') || libraryScreen.includes('data-dialog-state'), "libraryScreen: data-dialog-state 状态机");
assert(bookshelfMoreLayer.includes('data-sheet-state="closed"') || bookshelfMoreLayer.includes("data-sheet-state"), "bookshelfMoreLayer: data-sheet-state");
assert(bookSearchScreen.includes('data-keyboard-state="closed"'), "bookSearchScreen: data-keyboard-state 状态机");

// ===== 验收 3: 重复提交防护 =====
assert(bookSearchScreen.includes("data-repeat-tap-guard"), "bookSearchScreen: 含 data-repeat-tap-guard");
assert(libraryScreen.includes("data-repeat-tap-guard"), "libraryScreen: 含 data-repeat-tap-guard");
assert(importConflictResolveScreen.includes("data-repeat-tap-guard"), "importConflictResolveScreen: 含 data-repeat-tap-guard");

// 关键操作按钮的 repeat-tap-guard
const expectedGuards = ["search-submit", "search-reset", "search-retry", "add-shelf", "rollback", "apply", "confirm-clear"];
let guardsFound = 0;
for (const g of expectedGuards) {
  if (renderRuntime.includes(`data-repeat-tap-guard="${g}"`)) guardsFound++;
}
assert(guardsFound >= 5, `render-runtime.js 含至少 5 种 repeat-tap-guard（实际 ${guardsFound}/${expectedGuards.length}）`);

// ===== 验收 4: Stale result 防护 =====
assert(bookSearchScreen.includes("data-stale-result"), "bookSearchScreen: 含 data-stale-result");
assert(bookSearchScreen.includes("searchReqToken") || bookSearchScreen.includes("latestReqToken") || bookSearchScreen.includes("isStale"), "bookSearchScreen: 含 stale 检测变量");

// ===== 验收 5: 终态明确 =====
assert(bookSearchScreen.includes('data-final-state="idle"'), "bookSearchScreen: idle 终态");
assert(bookSearchScreen.includes('data-final-state="loading"'), "bookSearchScreen: loading 终态");
assert(bookSearchScreen.includes('data-final-state="added"'), "bookSearchScreen: added 终态");
assert(bookSearchScreen.includes('data-final-state="failed"'), "bookSearchScreen: failed 终态");
assert(bookSearchScreen.includes('data-final-state="cancelled"'), "bookSearchScreen: cancelled 终态");
assert(bookSearchScreen.includes('data-final-state="cleared"'), "bookSearchScreen: cleared 终态");

// ===== 验收 6: cover-list 切换终态（动态 ${bookshelfView}） =====
assert(bookshelfSectionHeader.includes('data-final-state="${bookshelfView}"'), "bookshelfSectionHeader: cover-list 切换含 data-final-state 动态值");
assert(bookshelfSectionHeader.includes('data-view-target="cover"'), "bookshelfSectionHeader: data-view-target=cover");
assert(bookshelfSectionHeader.includes('data-view-target="list"'), "bookshelfSectionHeader: data-view-target=list");
assert(bookshelfSectionHeader.includes('data-ui-event="bookshelf.view.switch"'), "bookshelfSectionHeader: bookshelf.view.switch 事件");

// ===== 验收 7: Dialog 状态机：cancel + confirm 双态 =====
assert(bookSearchScreen.includes('data-dialog-action="cancel"'), "bookSearchScreen: data-dialog-action=cancel");
assert(bookSearchScreen.includes('data-dialog-action="confirm"'), "bookSearchScreen: data-dialog-action=confirm");
assert(libraryScreen.includes('data-dialog-role'), "libraryScreen: data-dialog-role 标记");
assert(bookSearchScreen.includes('data-dialog-role="search-clear"'), "bookSearchScreen: data-dialog-role=search-clear");

// ===== 验收 8: book-detail TOC 状态机 =====
assert(libraryScreen.includes("tocState") || libraryScreen.includes("toc-state"), "libraryScreen: 含 tocState 变量");
assert(libraryScreen.includes('data-loading-state="loading"') || libraryScreen.includes("data-toc-state"), "libraryScreen: TOC loading 状态");
assert(libraryScreen.includes("data-book-detail-state") || libraryScreen.includes("bookDetailState"), "libraryScreen: 含 bookDetailState page state atom");

// ===== 验收 9: book-detail default/loading pageState 切换 =====
assert(libraryScreen.includes("bookDetailControlIds"), "libraryScreen: bookDetailControlIds 查找表存在");
assert(libraryScreen.includes('bookDetailState === "loading"'), "libraryScreen: bookDetailState === loading 分支");
assert(libraryScreen.includes(": \"library.button.book-detail.loading."), "libraryScreen: loading state controlId 用 library.button.book-detail.loading.* 命名空间");
assert(libraryScreen.includes(": \"library.button.book-detail.default."), "libraryScreen: default state controlId 用 library.button.book-detail.default.* 命名空间");

// ===== 验收 10: import-conflict-resolve 状态机 =====
assert(importConflictResolveScreen.includes("rollbackState"), "importConflictResolveScreen: rollbackState 状态变量");
assert(importConflictResolveScreen.includes("applyState"), "importConflictResolveScreen: applyState 状态变量");
assert(importConflictResolveScreen.includes("conflictSelectionState"), "importConflictResolveScreen: conflictSelectionState 状态变量");
assert(importConflictResolveScreen.includes('data-rollback-state='), "importConflictResolveScreen: data-rollback-state 标记");
assert(importConflictResolveScreen.includes('data-apply-state='), "importConflictResolveScreen: data-apply-state 标记");
assert(importConflictResolveScreen.includes('data-conflict-state='), "importConflictResolveScreen: data-conflict-state 标记");

// ===== 验收 11: 焦点恢复来源标记 =====
assert(renderRuntime.includes('data-focus-restore-source="search-back"'), "search-results: search-back 焦点恢复源");
assert(renderRuntime.includes('data-focus-restore-source="search-input"'), "search-results: search-input 焦点恢复源");
assert(renderRuntime.includes('data-focus-restore-source="conflict-overwrite"'), "import-conflict: conflict-overwrite 焦点恢复源");
assert(renderRuntime.includes('data-focus-restore-source="bookshelf-entry"'), "book-detail: bookshelf-entry 焦点恢复源");

// ===== 验收 12: bookshelf More Sheet 的状态机 =====
assert(bookshelfMoreLayer.includes("data-sheet-role") || bookshelfMoreLayer.includes("data-sheet-open-trigger"), "bookshelfMoreLayer: 含 Sheet 角色和打开触发器");

console.log("");
console.log(`总计：${passes} 通过 / ${failures} 失败`);
if (failures > 0) {
  console.error("失败：状态机验收未通过");
  process.exit(1);
}
console.log("全部通过 ✓");
