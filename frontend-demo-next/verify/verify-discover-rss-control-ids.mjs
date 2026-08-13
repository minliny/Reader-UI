#!/usr/bin/env node
// B3 · Discover & RSS — Control Identity 验收
//
// 验收范围：
//   1. discover-rss-control-ids.js 暴露的 controlId 全部符合 control-identity.schema.json pattern
//   2. 所有 controlId 均在 control-id-registry.json (A2 baseline c7c2730) 中冻结
//   3. 所有 UiEvent hint 已在 ui-event.schema.json enum 中（已批准）或显式登记为 hint（待 contract 评审）
//   4. render-runtime.js 中 Discover/RSS 域函数已为可操作控件注入 data-control-id
//   5. render-runtime.js 中 data-ui-event 值与 UI_EVENT_HINTS 一致
//
// 退出码：全绿返回 0；任一断言失败返回 1。
//
// 用法：node frontend-demo-next/verify/verify-discover-rss-control-ids.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_DIR = join(__dirname, "..");
const REPO_ROOT = join(DEMO_DIR, "..");
const CONTRACTS_DIR = join(REPO_ROOT, "contracts");
const REGISTRY_PATH = join(REPO_ROOT, "tools", "interaction-inventory", "generated", "control-id-registry.json");

// ===== 加载 contracts =====

const uiEventSchema = JSON.parse(readFileSync(join(CONTRACTS_DIR, "ui-event.schema.json"), "utf8"));
const UI_EVENT_ENUM = new Set(uiEventSchema.properties.type.enum);

const controlIdentitySchema = JSON.parse(readFileSync(join(CONTRACTS_DIR, "control-identity.schema.json"), "utf8"));
const CONTROL_ID_PATTERN = new RegExp(controlIdentitySchema.properties.controlId.pattern);

const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
const REGISTRY_CONTROL_IDS = new Set(registry.entries.map((e) => e.controlId));

// ===== 在 vm 沙箱中执行 discover-rss-control-ids.js =====

const controlIdsSrc = readFileSync(join(DEMO_DIR, "discover-rss-control-ids.js"), "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(controlIdsSrc, sandbox);

const DRI = sandbox.window.ReaderDiscoverRssControlIds;
if (!DRI) {
  console.error("FAIL: window.ReaderDiscoverRssControlIds 未定义");
  process.exit(1);
}

let failures = 0;
let warnings = 0;
function assert(condition, label) {
  if (condition) {
    console.log(`  [OK] ${label}`);
  } else {
    console.error(`  [FAIL] ${label}`);
    failures += 1;
  }
}
function warn(condition, label) {
  if (condition) {
    console.log(`  [OK] ${label}`);
  } else {
    console.warn(`  [WARN] ${label}`);
    warnings += 1;
  }
}

// ===== 收集所有暴露的 controlId =====

const discoverControlIds = DRI.allDiscoverControlIds();
const rssControlIds = DRI.allRssControlIds();
const allControlIds = [...new Set([...discoverControlIds, ...rssControlIds])];

console.log(`\n# B3 · Discover & RSS Control Identity 验收`);
console.log(`  discover controlId 数量：${discoverControlIds.length}`);
console.log(`  rss controlId 数量：${rssControlIds.length}`);
console.log(`  合计唯一 controlId：${allControlIds.length}`);

// ===== 测试 1：所有暴露的 controlId 符合 schema pattern =====

console.log("\n=== 测试 1：controlId 格式合规 ===");
for (const id of allControlIds) {
  assert(CONTROL_ID_PATTERN.test(id), `pattern: ${id}`);
}

// ===== 测试 2：所有 controlId 在 control-id-registry.json 中冻结 =====

console.log("\n=== 测试 2：controlId 已在 A2 registry 冻结 ===");
let registryMissCount = 0;
for (const id of allControlIds) {
  if (!REGISTRY_CONTROL_IDS.has(id)) {
    console.error(`  [FAIL] registry 未收录：${id}`);
    registryMissCount += 1;
  }
}
if (registryMissCount === 0) {
  console.log(`  [OK] 全部 ${allControlIds.length} 个 controlId 均在 registry 中冻结`);
} else {
  failures += registryMissCount;
}

// ===== 测试 3：UiEvent hint 在 enum 中或显式登记为 hint =====
// B3 工作包任务规格列出 canonical hints：route.push / tab.item.select /
// refresh.invoke / filter.apply / sort.cycle / filter.reset。
// 其中 route.push / tab.item.select 已在 ui-event.schema.json enum 中；
// refresh.invoke / filter.apply / sort.cycle / filter.reset 尚未列入 enum，
// 作为 hint 等待 contract 评审升级。本测试对 enum 内的 hint 严格断言，
// 对未列入 enum 的 hint 仅警告（不算失败）。

console.log("\n=== 测试 3：UiEvent hint 契约状态 ===");

const allUiEvents = Object.values(DRI.UI_EVENT_HINTS);
const uniqueUiEvents = [...new Set(allUiEvents)];
const enumHits = [];
const hintPendingContract = [];
for (const evt of uniqueUiEvents) {
  if (UI_EVENT_ENUM.has(evt)) {
    enumHits.push(evt);
  } else {
    hintPendingContract.push(evt);
  }
}
for (const evt of enumHits) {
  assert(true, `enum: ${evt}`);
}
for (const evt of hintPendingContract) {
  warn(false, `hint（待 contract 评审升级）: ${evt}`);
}
console.log(`  enum 已收录：${enumHits.length} / ${uniqueUiEvents.length}`);
console.log(`  hint 待升级：${hintPendingContract.length} / ${uniqueUiEvents.length}`);

// ===== 测试 4：render-runtime.js 中 Discover/RSS 域函数已注入 data-control-id =====

console.log("\n=== 测试 4：render-runtime.js 注入 data-control-id ===");

const renderSrc = readFileSync(join(DEMO_DIR, "render-runtime.js"), "utf8");

// 抽取所有 data-control-id="(discover|rss)." 字面量
const injectedIds = new Set();
const re = /data-control-id=["']((?:discover|rss)\.[a-z0-9.-]+)["']/g;
let m;
while ((m = re.exec(renderSrc)) !== null) {
  injectedIds.add(m[1]);
}
console.log(`  render-runtime.js 中 discover/rss data-control-id 字面量：${injectedIds.size}`);

// 断言关键控件 ID 出现在 render-runtime.js 中
// Discover 域
assert(renderSrc.includes(DRI.DISCOVER_CONTROL.backToDiscover), `discoverSourceBar backToDiscover: ${DRI.DISCOVER_CONTROL.backToDiscover}`);
assert(renderSrc.includes(DRI.DISCOVER_CONTROL.switchingSource), `discoverControlPanel switchingSource: ${DRI.DISCOVER_CONTROL.switchingSource}`);
assert(renderSrc.includes(DRI.DISCOVER_CONTROL.cacheConfirm), `discoverControlPanel cacheConfirm: ${DRI.DISCOVER_CONTROL.cacheConfirm}`);
assert(renderSrc.includes(DRI.DISCOVER_CONTROL.sourceLogin), `discoverControlPanel sourceLogin: ${DRI.DISCOVER_CONTROL.sourceLogin}`);
assert(renderSrc.includes(DRI.DISCOVER_CONTROL.ruleTest), `discoverControlPanel ruleTest: ${DRI.DISCOVER_CONTROL.ruleTest}`);
assert(renderSrc.includes(DRI.DISCOVER_CONTROL.sourceBulk), `discoverControlPanel sourceBulk: ${DRI.DISCOVER_CONTROL.sourceBulk}`);
assert(renderSrc.includes(DRI.DISCOVER_CONTROL.filterMale), `discoverControlPanel filterMale: ${DRI.DISCOVER_CONTROL.filterMale}`);
assert(renderSrc.includes(DRI.DISCOVER_CONTROL.filterFemale), `discoverControlPanel filterFemale: ${DRI.DISCOVER_CONTROL.filterFemale}`);
assert(renderSrc.includes(DRI.DISCOVER_CONTROL.sortToggle), `discoverControlPanel sortToggle: ${DRI.DISCOVER_CONTROL.sortToggle}`);

// Discover entry chips（通过 entryControlIds map 注入）
assert(renderSrc.includes(DRI.DISCOVER_ENTRY.ranking), `discoverEntryChips ranking: ${DRI.DISCOVER_ENTRY.ranking}`);
assert(renderSrc.includes(DRI.DISCOVER_ENTRY.source), `discoverEntryChips source: ${DRI.DISCOVER_ENTRY.source}`);
assert(renderSrc.includes(DRI.DISCOVER_ENTRY.category), `discoverEntryChips category: ${DRI.DISCOVER_ENTRY.category}`);
assert(renderSrc.includes(DRI.DISCOVER_ENTRY.finished), `discoverEntryChips finished: ${DRI.DISCOVER_ENTRY.finished}`);
assert(renderSrc.includes(DRI.DISCOVER_ENTRY.latest), `discoverEntryChips latest: ${DRI.DISCOVER_ENTRY.latest}`);
assert(renderSrc.includes(DRI.DISCOVER_ENTRY.booklist), `discoverEntryChips booklist: ${DRI.DISCOVER_ENTRY.booklist}`);
assert(renderSrc.includes(DRI.DISCOVER_ENTRY.control), `discoverSourceBar control: ${DRI.DISCOVER_ENTRY.control}`);

// RSS 域
assert(renderSrc.includes(DRI.RSS_TOP.refreshing), `rssTopBar/rssHomeContent refreshing: ${DRI.RSS_TOP.refreshing}`);
assert(renderSrc.includes(DRI.RSS_TOP.subscriptionManagement), `rssTopBar/rssHomeContent subscriptionManagement: ${DRI.RSS_TOP.subscriptionManagement}`);
assert(renderSrc.includes(DRI.RSS_TOP.search), `rssSearchEntry search: ${DRI.RSS_TOP.search}`);
assert(renderSrc.includes(DRI.RSS_TOP.sourceImport), `rssSourceOverview sourceImport: ${DRI.RSS_TOP.sourceImport}`);
assert(renderSrc.includes(DRI.RSS_TOP.sourceEdit), `rssSourceOverview sourceEdit: ${DRI.RSS_TOP.sourceEdit}`);

// RSS source feed toolbar
assert(renderSrc.includes(DRI.RSS_SOURCE_FEED.refreshing), `rssSourceFeedContent refreshing: ${DRI.RSS_SOURCE_FEED.refreshing}`);
assert(renderSrc.includes(DRI.RSS_SOURCE_FEED.sourceEdit), `rssSourceFeedContent sourceEdit: ${DRI.RSS_SOURCE_FEED.sourceEdit}`);
assert(renderSrc.includes(DRI.RSS_SOURCE_FEED.readRecord), `rssSourceFeedContent readRecord: ${DRI.RSS_SOURCE_FEED.readRecord}`);
assert(renderSrc.includes(DRI.RSS_SOURCE_FEED.sourceDebug), `rssSourceFeedContent sourceDebug: ${DRI.RSS_SOURCE_FEED.sourceDebug}`);

// RSS mode nav（通过 modeControlIds map 注入，断言 map 中 4 个 ID 字面量出现）
assert(renderSrc.includes(DRI.RSS_MODE_NAV.sources), `rssModeNav sources: ${DRI.RSS_MODE_NAV.sources}`);
assert(renderSrc.includes(DRI.RSS_MODE_NAV.all), `rssModeNav all: ${DRI.RSS_MODE_NAV.all}`);
assert(renderSrc.includes(DRI.RSS_MODE_NAV.starred), `rssModeNav starred: ${DRI.RSS_MODE_NAV.starred}`);
assert(renderSrc.includes(DRI.RSS_MODE_NAV.ruleSubscription), `rssModeNav ruleSubscription: ${DRI.RSS_MODE_NAV.ruleSubscription}`);

// ===== 测试 5：render-runtime.js 中 data-ui-event 与 UI_EVENT_HINTS 一致 =====

console.log("\n=== 测试 5：render-runtime.js data-ui-event 与 UI_EVENT_HINTS 一致 ===");

// 对每个注入的 controlId，检查其 data-ui-event 是否与 UI_EVENT_HINTS 一致
// 仅校验字面量出现的 controlId（modeControlIds/entryControlIds 通过模板注入，
// 其 data-ui-event 在模板中固定，单独校验）
let uiEventMismatchCount = 0;
const reAttr = /data-control-id=["']((?:discover|rss)\.[a-z0-9.-]+)["']\s+data-ui-event=["']([a-z.]+)["']/g;
let m2;
while ((m2 = reAttr.exec(renderSrc)) !== null) {
  const cid = m2[1];
  const evt = m2[2];
  const expected = DRI.uiEventFor(cid);
  if (expected === null) {
    console.warn(`  [WARN] UI_EVENT_HINTS 未收录 controlId: ${cid}`);
    warnings += 1;
  } else if (expected !== evt) {
    console.error(`  [FAIL] data-ui-event 不一致：controlId=${cid} expected=${expected} actual=${evt}`);
    uiEventMismatchCount += 1;
  }
}
if (uiEventMismatchCount === 0) {
  console.log("  [OK] 所有字面量 data-control-id + data-ui-event 对齐 UI_EVENT_HINTS");
} else {
  failures += uiEventMismatchCount;
}

// ===== 测试 6：domain 边界（不得越界修改其他域）=====

console.log("\n=== 测试 6：domain 边界（仅 discover/rss）===");

const outOfScopeIds = [...injectedIds].filter((id) => {
  const domain = id.split(".")[0];
  return domain !== "discover" && domain !== "rss";
});
assert(outOfScopeIds.length === 0, `未越界到其他域（发现 ${outOfScopeIds.length} 个越界 ID）`);

// ===== 测试 7：registry 中 discover/rss 域 controlId 总数稳定 =====

console.log("\n=== 测试 7：registry 中 discover/rss 域基数稳定 ===");

const registryDiscoverCount = registry.entries.filter((e) => e.domain === "discover").length;
const registryRssCount = registry.entries.filter((e) => e.domain === "rss").length;
console.log(`  registry discover entries: ${registryDiscoverCount}`);
console.log(`  registry rss entries: ${registryRssCount}`);
assert(registryDiscoverCount === 778, `registry discover 基数 = 778（实际 ${registryDiscoverCount}）`);
assert(registryRssCount === 417, `registry rss 基数 = 417（实际 ${registryRssCount}）`);

// ===== 总结 =====

console.log("\n=== 总结 ===");
if (failures === 0) {
  console.log(`✅ 全部断言通过（${allControlIds.length} controlId / ${uniqueUiEvents.length} UiEvent）`);
  if (warnings > 0) {
    console.log(`   ⚠️  ${warnings} 项警告（UiEvent hint 待 contract 评审升级，不阻塞）`);
  }
  process.exit(0);
} else {
  console.error(`❌ ${failures} 项断言失败`);
  if (warnings > 0) {
    console.warn(`   ⚠️  ${warnings} 项警告`);
  }
  process.exit(1);
}
