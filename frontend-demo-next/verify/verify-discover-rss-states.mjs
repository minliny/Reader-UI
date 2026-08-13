#!/usr/bin/env node
// B3 · Discover & RSS — 交互状态覆盖验收
//
// 验收范围：
//   1. discover-rss-state-runtime.js 暴露的状态词汇表完整（PAGE_STATES / ASYNC_RESULTS /
//      MOTION_STATES / FOCUS_STATES / KEYBOARD_STATES）
//   2. DISCOVER_ROUTE_STATE / RSS_ROUTE_STATE 覆盖 route-contract.js 中所有 discover/rss 路由
//   3. DISCOVER_ASYNC_CONTRACTS / RSS_ASYNC_CONTRACTS 每个操作至少包含
//      idle / pending / success / stableFinal 四个阶段
//   4. discoverTerminalAttrs / rssTerminalAttrs 对 loading / empty / error / refreshing /
//      no-results 等 pageState 返回正确的 data-* + aria-* 属性
//   5. discoverAsyncAttrs / rssAsyncAttrs 对 repeat-tap / stale / partial-success 等
//      终态返回正确的 data-async-* 属性
//   6. dialogFocusTrapAttrs / repeatTapAttrs / reducedMotionAttrs / focusAttrs / keyboardAttrs
//      helper 返回契约一致的属性
//   7. render-runtime.js 已为 Discover empty 状态注入稳定终态标记（data-discover-empty）
//
// 退出码：全绿返回 0；任一断言失败返回 1。
//
// 用法：node frontend-demo-next/verify/verify-discover-rss-states.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_DIR = join(__dirname, "..");
const REPO_ROOT = join(DEMO_DIR, "..");

let failures = 0;
function assert(condition, label) {
  if (condition) {
    console.log(`  [OK] ${label}`);
  } else {
    console.error(`  [FAIL] ${label}`);
    failures += 1;
  }
}

// ===== 在 vm 沙箱中执行 discover-rss-state-runtime.js =====

const stateSrc = readFileSync(join(DEMO_DIR, "discover-rss-state-runtime.js"), "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(stateSrc, sandbox);

const DRS = sandbox.window.ReaderDiscoverRssState;
if (!DRS) {
  console.error("FAIL: window.ReaderDiscoverRssState 未定义");
  process.exit(1);
}

console.log(`\n# B3 · Discover & RSS 交互状态覆盖验收`);

// ===== 测试 1：状态词汇表完整 =====

console.log("\n=== 测试 1：状态词汇表完整 ===");

const requiredPageStates = ["DEFAULT", "LOADING", "REFRESHING", "EMPTY", "ERROR", "OFFLINE", "NO_RESULTS", "CONFLICT", "RESULT"];
for (const key of requiredPageStates) {
  assert(DRS.PAGE_STATES[key] !== undefined, `PAGE_STATES.${key}`);
}

const requiredAsyncResults = ["IDLE", "PENDING", "SUCCESS", "PARTIAL_SUCCESS", "STALE", "REPEAT_TAP", "FAILED", "CANCELED"];
for (const key of requiredAsyncResults) {
  assert(DRS.ASYNC_RESULTS[key] !== undefined, `ASYNC_RESULTS.${key}`);
}

assert(DRS.MOTION_STATES.FULL === "full" && DRS.MOTION_STATES.REDUCED === "reduced", "MOTION_STATES full/reduced");
assert(DRS.FOCUS_STATES.NONE === "none" && DRS.FOCUS_STATES.REQUESTED === "requested" && DRS.FOCUS_STATES.RESTORED === "restored" && DRS.FOCUS_STATES.TRAPPED === "trapped", "FOCUS_STATES none/requested/restored/trapped");
assert(DRS.KEYBOARD_STATES.NONE === "none" && DRS.KEYBOARD_STATES.ACTIVATED === "activated" && DRS.KEYBOARD_STATES.ESCAPED === "escaped", "KEYBOARD_STATES none/activated/escaped");

// ===== 测试 2：DISCOVER_ROUTE_STATE / RSS_ROUTE_STATE 覆盖关键路由 =====

console.log("\n=== 测试 2：route → pageState 映射覆盖关键路由 ===");

const requiredDiscoverRoutes = [
  "discover", "discover-home", "discover-control", "discover-sort",
  "discover-loading", "discover-refreshing", "discover-no-results",
  "discover-cache-empty", "discover-cache-stale", "discover-cache-confirm",
  "discover-empty", "discover-error", "discover-switching-source"
];
for (const route of requiredDiscoverRoutes) {
  assert(DRS.DISCOVER_ROUTE_STATE[route] !== undefined, `DISCOVER_ROUTE_STATE[${route}]`);
}

const requiredRssRoutes = [
  "rss", "rss-all", "rss-starred", "rss-source-feed",
  "rss-refreshing", "rss-search", "rss-detail", "rss-empty", "rss-error"
];
for (const route of requiredRssRoutes) {
  assert(DRS.RSS_ROUTE_STATE[route] !== undefined, `RSS_ROUTE_STATE[${route}]`);
}

// 关键 pageState 断言
assert(DRS.DISCOVER_ROUTE_STATE["discover-loading"] === "loading", "discover-loading → loading");
assert(DRS.DISCOVER_ROUTE_STATE["discover-refreshing"] === "refreshing", "discover-refreshing → refreshing");
assert(DRS.DISCOVER_ROUTE_STATE["discover-no-results"] === "no-results", "discover-no-results → no-results");
assert(DRS.DISCOVER_ROUTE_STATE["discover-cache-empty"] === "empty", "discover-cache-empty → empty");
assert(DRS.DISCOVER_ROUTE_STATE["discover-error"] === "error", "discover-error → error");
assert(DRS.DISCOVER_ROUTE_STATE["discover-cache-confirm"] === "conflict", "discover-cache-confirm → conflict");

assert(DRS.RSS_ROUTE_STATE["rss-refreshing"] === "refreshing", "rss-refreshing → refreshing");
assert(DRS.RSS_ROUTE_STATE["rss-empty"] === "empty", "rss-empty → empty");
assert(DRS.RSS_ROUTE_STATE["rss-error"] === "error", "rss-error → error");

// ===== 测试 3：异步操作契约阶段完整 =====

console.log("\n=== 测试 3：异步操作契约阶段完整 ===");

const requiredDiscoverOps = ["refresh", "filter", "segment", "sourceSwitch", "cacheClear", "login"];
const requiredRssOps = ["refresh", "filter", "markRead", "sourceImport", "sourceExport"];

// 异步操作至少包含 idle / pending / success / stableFinal
// 同步操作（segment）包含 idle / activated / stableFinal
const asyncMinPhases = ["idle", "pending", "success", "stableFinal"];
const syncOps = new Set(["segment"]);
const syncMinPhases = ["idle", "activated", "stableFinal"];
for (const op of requiredDiscoverOps) {
  const contract = DRS.DISCOVER_ASYNC_CONTRACTS[op];
  assert(contract !== undefined, `DISCOVER_ASYNC_CONTRACTS.${op} 定义`);
  if (contract) {
    const phases = syncOps.has(op) ? syncMinPhases : asyncMinPhases;
    for (const phase of phases) {
      assert(contract[phase] !== undefined, `DISCOVER_ASYNC_CONTRACTS.${op}.${phase}`);
    }
  }
}
for (const op of requiredRssOps) {
  const contract = DRS.RSS_ASYNC_CONTRACTS[op];
  assert(contract !== undefined, `RSS_ASYNC_CONTRACTS.${op} 定义`);
  if (contract) {
    for (const phase of asyncMinPhases) {
      assert(contract[phase] !== undefined, `RSS_ASYNC_CONTRACTS.${op}.${phase}`);
    }
  }
}

// repeat-tap 阶段：refresh / filter / markRead 应有
assert(DRS.DISCOVER_ASYNC_CONTRACTS.refresh.repeatTap !== undefined, "DISCOVER refresh.repeatTap");
assert(DRS.DISCOVER_ASYNC_CONTRACTS.filter.repeatTap !== undefined, "DISCOVER filter.repeatTap");
assert(DRS.RSS_ASYNC_CONTRACTS.refresh.repeatTap !== undefined, "RSS refresh.repeatTap");
assert(DRS.RSS_ASYNC_CONTRACTS.markRead.repeatTap !== undefined, "RSS markRead.repeatTap");

// stale 阶段：refresh 应有
assert(DRS.DISCOVER_ASYNC_CONTRACTS.refresh.stale !== undefined, "DISCOVER refresh.stale");
assert(DRS.RSS_ASYNC_CONTRACTS.refresh.stale !== undefined, "RSS refresh.stale");

// partial-success：RSS refresh / sourceImport 应有
assert(DRS.RSS_ASYNC_CONTRACTS.refresh.partialSuccess !== undefined, "RSS refresh.partialSuccess");
assert(DRS.RSS_ASYNC_CONTRACTS.sourceImport.partialSuccess !== undefined, "RSS sourceImport.partialSuccess");

// failed 阶段：refresh / sourceSwitch / login / sourceImport 应有
assert(DRS.DISCOVER_ASYNC_CONTRACTS.refresh.failed !== undefined, "DISCOVER refresh.failed");
assert(DRS.DISCOVER_ASYNC_CONTRACTS.sourceSwitch.failed !== undefined, "DISCOVER sourceSwitch.failed");
assert(DRS.DISCOVER_ASYNC_CONTRACTS.login.failed !== undefined, "DISCOVER login.failed");
assert(DRS.RSS_ASYNC_CONTRACTS.sourceImport.failed !== undefined, "RSS sourceImport.failed");

// ===== 测试 4：terminalAttrs 对各 pageState 返回正确属性 =====

console.log("\n=== 测试 4：terminalAttrs 对 pageState 返回正确属性 ===");

// Discover loading
const discoverLoadingAttrs = DRS.discoverTerminalAttrs("discover-loading", { prefersReducedMotion: false });
assert(discoverLoadingAttrs["data-loading"] === "true", "discover-loading data-loading=true");
assert(discoverLoadingAttrs["aria-busy"] === "true", "discover-loading aria-busy=true");
assert(discoverLoadingAttrs["data-motion"] === "full", "discover-loading data-motion=full");

// Discover refreshing
const discoverRefreshingAttrs = DRS.discoverTerminalAttrs("discover-refreshing", { prefersReducedMotion: false });
assert(discoverRefreshingAttrs["data-refreshing"] === "true", "discover-refreshing data-refreshing=true");
assert(discoverRefreshingAttrs["aria-busy"] === "true", "discover-refreshing aria-busy=true");

// Discover empty
const discoverEmptyAttrs = DRS.discoverTerminalAttrs("discover-cache-empty", { prefersReducedMotion: false });
assert(discoverEmptyAttrs["data-empty"] === "true", "discover-cache-empty data-empty=true");

// Discover error
const discoverErrorAttrs = DRS.discoverTerminalAttrs("discover-error", { prefersReducedMotion: false });
assert(discoverErrorAttrs["data-error"] === "true", "discover-error data-error=true");
assert(discoverErrorAttrs["aria-invalid"] === "true", "discover-error aria-invalid=true");

// Discover no-results
const discoverNoResultsAttrs = DRS.discoverTerminalAttrs("discover-no-results", { prefersReducedMotion: false });
assert(discoverNoResultsAttrs["data-no-results"] === "true", "discover-no-results data-no-results=true");

// Discover reduced-motion
const discoverReducedAttrs = DRS.discoverTerminalAttrs("discover-loading", { prefersReducedMotion: true });
assert(discoverReducedAttrs["data-motion"] === "reduced", "discover-loading reduced-motion data-motion=reduced");

// RSS refreshing
const rssRefreshingAttrs = DRS.rssTerminalAttrs("rss-refreshing", { prefersReducedMotion: false });
assert(rssRefreshingAttrs["data-refreshing"] === "true", "rss-refreshing data-refreshing=true");
assert(rssRefreshingAttrs["aria-busy"] === "true", "rss-refreshing aria-busy=true");

// RSS empty
const rssEmptyAttrs = DRS.rssTerminalAttrs("rss-empty", { prefersReducedMotion: false });
assert(rssEmptyAttrs["data-empty"] === "true", "rss-empty data-empty=true");

// RSS error
const rssErrorAttrs = DRS.rssTerminalAttrs("rss-error", { prefersReducedMotion: false });
assert(rssErrorAttrs["data-error"] === "true", "rss-error data-error=true");
assert(rssErrorAttrs["aria-invalid"] === "true", "rss-error aria-invalid=true");

// ===== 测试 5：asyncAttrs 对 repeat-tap / stale / partial-success 返回正确属性 =====

console.log("\n=== 测试 5：asyncAttrs 终态属性 ===");

// Discover refresh.repeatTap
const discoverRefreshRepeatTap = DRS.discoverAsyncAttrs("refresh", "repeatTap");
assert(discoverRefreshRepeatTap["data-async-refresh"] === "repeat-tap", "discover refresh.repeatTap data-async-refresh=repeat-tap");
assert(discoverRefreshRepeatTap["data-async-repeat-tap-count"] === "2", "discover refresh.repeatTap count=2");

// Discover refresh.stale
const discoverRefreshStale = DRS.discoverAsyncAttrs("refresh", "stale");
assert(discoverRefreshStale["data-async-refresh"] === "stale", "discover refresh.stale data-async-refresh=stale");

// Discover refresh.pending (aria-busy)
const discoverRefreshPending = DRS.discoverAsyncAttrs("refresh", "pending");
assert(discoverRefreshPending["aria-busy"] === "true", "discover refresh.pending aria-busy=true");

// RSS refresh.partialSuccess
const rssRefreshPartial = DRS.rssAsyncAttrs("refresh", "partialSuccess");
assert(rssRefreshPartial["data-async-refresh"] === "partial-success", "rss refresh.partialSuccess data-async-refresh=partial-success");

// RSS refresh.stableFinal
const rssRefreshStable = DRS.rssAsyncAttrs("refresh", "stableFinal");
assert(rssRefreshStable["data-async-refresh"] === "success", "rss refresh.stableFinal data-async-refresh=success");
assert(rssRefreshStable["data-async-stable"] === "true", "rss refresh.stableFinal data-async-stable=true");

// RSS sourceImport.failed
const rssImportFailed = DRS.rssAsyncAttrs("sourceImport", "failed");
assert(rssImportFailed["data-async-source-import"] === "failed", "rss sourceImport.failed data-async-source-import=failed");

// ===== 测试 6：focus / keyboard / dialog helper =====

console.log("\n=== 测试 6：focus / keyboard / dialog helper ===");

// dialogFocusTrapAttrs open=true
const dialogOpen = DRS.dialogFocusTrapAttrs(true);
assert(dialogOpen["data-focus-state"] === "trapped", "dialog open data-focus-state=trapped");
assert(dialogOpen["aria-modal"] === "true", "dialog open aria-modal=true");
assert(dialogOpen["data-focus-trap"] === "true", "dialog open data-focus-trap=true");

// dialogFocusTrapAttrs open=false
const dialogClosed = DRS.dialogFocusTrapAttrs(false);
assert(dialogClosed["data-focus-state"] === "none", "dialog closed data-focus-state=none");

// repeatTapAttrs
const repeatTap = DRS.repeatTapAttrs(3);
assert(repeatTap["data-async-repeat-tap"] === "true", "repeatTapAttrs data-async-repeat-tap=true");
assert(repeatTap["data-async-repeat-tap-count"] === "3", "repeatTapAttrs count=3");

// repeatTapAttrs 最低值保护（< 2 时取 2）
const repeatTapLow = DRS.repeatTapAttrs(1);
assert(repeatTapLow["data-async-repeat-tap-count"] === "2", "repeatTapAttrs 最低值=2");

// reducedMotionAttrs
assert(DRS.reducedMotionAttrs(true)["data-motion"] === "reduced", "reducedMotionAttrs(true) data-motion=reduced");
assert(DRS.reducedMotionAttrs(false)["data-motion"] === "full", "reducedMotionAttrs(false) data-motion=full");

// focusAttrs
assert(DRS.focusAttrs("requested")["data-focus-state"] === "requested", "focusAttrs(requested)");
assert(DRS.focusAttrs("restored")["data-focus-state"] === "restored", "focusAttrs(restored)");

// keyboardAttrs
assert(DRS.keyboardAttrs("activated")["data-keyboard-state"] === "activated", "keyboardAttrs(activated)");
assert(DRS.keyboardAttrs("escaped")["data-keyboard-state"] === "escaped", "keyboardAttrs(escaped)");

// ===== 测试 7：render-runtime.js Discover empty 状态注入稳定终态标记 =====

console.log("\n=== 测试 7：render-runtime.js Discover empty 状态终态标记 ===");

const renderSrc = readFileSync(join(DEMO_DIR, "render-runtime.js"), "utf8");
assert(renderSrc.includes("data-discover-empty"), "render-runtime.js data-discover-empty 标记");
assert(renderSrc.includes("B3 稳定终态"), "render-runtime.js B3 稳定终态注释");
assert(renderSrc.includes("reduced-motion-aware"), "render-runtime.js reduced-motion-aware 注释");

// ===== 测试 8：TERMINAL_STATE_ATTRS 常量完整 =====

console.log("\n=== 测试 8：TERMINAL_STATE_ATTRS 常量完整 ===");

assert(DRS.TERMINAL_STATE_ATTRS.motion === "data-motion", "TERMINAL_STATE_ATTRS.motion");
assert(DRS.TERMINAL_STATE_ATTRS.focus === "data-focus-state", "TERMINAL_STATE_ATTRS.focus");
assert(DRS.TERMINAL_STATE_ATTRS.keyboard === "data-keyboard-state", "TERMINAL_STATE_ATTRS.keyboard");
assert(DRS.TERMINAL_STATE_ATTRS.asyncStable === "data-async-stable", "TERMINAL_STATE_ATTRS.asyncStable");

// ===== 总结 =====

console.log("\n=== 总结 ===");
if (failures === 0) {
  console.log("✅ 全部状态覆盖断言通过");
  process.exit(0);
} else {
  console.error(`❌ ${failures} 项断言失败`);
  process.exit(1);
}
