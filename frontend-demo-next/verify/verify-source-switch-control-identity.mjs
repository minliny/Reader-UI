#!/usr/bin/env node
// B4 · Source Switch — Control Identity 与交互状态验收
//
// 验收范围：
//   1. source-switch-control-ids.js 暴露的 controlId 全部符合 schema pattern
//   2. 所有 UiEvent 名均已在 contracts/ui-event.schema.json enum 中冻结
//   3. render-runtime.js 中 source-switch 函数已为可操作控件写入 data-control-id
//   4. 候选行 aria-disabled、busy、stale、reduced-motion 终态标记到位
//
// 退出码：全绿返回 0；任一断言失败返回 1。
//
// 用法：node frontend-demo-next/verify/verify-source-switch-control-identity.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_DIR = join(__dirname, "..");
const REPO_ROOT = join(DEMO_DIR, "..");
const CONTRACTS_DIR = join(REPO_ROOT, "contracts");

// ===== 加载 contracts =====

const uiEventSchema = JSON.parse(readFileSync(join(CONTRACTS_DIR, "ui-event.schema.json"), "utf8"));
const UI_EVENT_ENUM = new Set(uiEventSchema.properties.type.enum);

const controlIdentitySchema = JSON.parse(readFileSync(join(CONTRACTS_DIR, "control-identity.schema.json"), "utf8"));
const CONTROL_ID_PATTERN = new RegExp(controlIdentitySchema.properties.controlId.pattern);

// ===== 在 vm 沙箱中执行 source-switch-control-ids.js =====

const controlIdsSrc = readFileSync(join(DEMO_DIR, "source-switch-control-ids.js"), "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(controlIdsSrc, sandbox);

const SSI = sandbox.window.ReaderSourceSwitchControlIds;
if (!SSI) {
  console.error("FAIL: window.ReaderSourceSwitchControlIds 未定义");
  process.exit(1);
}

let failures = 0;
function assert(condition, label) {
  if (condition) {
    console.log(`  [OK] ${label}`);
  } else {
    console.error(`  [FAIL] ${label}`);
    failures += 1;
  }
}

// ===== 测试 1：所有暴露的 controlId 符合 schema pattern =====

console.log("\n=== 测试 1：controlId 格式合规 ===");

const registryIds = Object.values(SSI.CANDIDATE_ROW_CONTROL_IDS);
const allControlIds = [
  ...registryIds,
  SSI.CLOSE_WINDOW_CONTROL_ID,
  SSI.EMPTY_CLOSE, SSI.EMPTY_RETRY, SSI.EMPTY_RETURN_READER,
  SSI.ERROR_CLOSE, SSI.ERROR_RETRY, SSI.ERROR_RETURN_READER,
  SSI.TIMEOUT_CLOSE, SSI.TIMEOUT_RETRY, SSI.TIMEOUT_RETURN_READER,
  SSI.LOADING_CLOSE, SSI.LOADING_CANCEL,
  SSI.ROLLBACK_CLOSE, SSI.ROLLBACK_RETRY, SSI.ROLLBACK_RETURN_READER,
  SSI.PREVIEW_CLOSE, SSI.PREVIEW_CONFIRM, SSI.PREVIEW_RETURN_LIST,
  SSI.DEFAULT_PREVIEW, SSI.DEFAULT_CONFIRM, SSI.DEFAULT_VIEW_FAILED, SSI.DEFAULT_VIEW_ROLLBACK
];

for (const id of allControlIds) {
  assert(CONTROL_ID_PATTERN.test(id), `pattern: ${id}`);
}

// ===== 测试 2：所有 UiEvent 名在 ui-event.schema.json enum 中 =====

console.log("\n=== 测试 2：UiEvent 已在 contract 冻结 ===");

const allUiEvents = Object.values(SSI.UI_EVENTS);
const uniqueUiEvents = [...new Set(allUiEvents)];
for (const evt of uniqueUiEvents) {
  assert(UI_EVENT_ENUM.has(evt), `enum: ${evt}`);
}

// ===== 测试 3：candidateRowControlId 对 index 0..10 返回 registry ID，index>10 返回合成 ID =====

console.log("\n=== 测试 3：candidateRowControlId 索引边界 ===");

assert(SSI.candidateRowControlId(0) === SSI.CANDIDATE_ROW_CONTROL_IDS["0"], "index 0 = registry");
assert(SSI.candidateRowControlId(10) === SSI.CANDIDATE_ROW_CONTROL_IDS["10"], "index 10 = registry");
const fallbackId = SSI.candidateRowControlId(11);
assert(CONTROL_ID_PATTERN.test(fallbackId), "index 11 fallback pattern");
assert(fallbackId.includes("candidate-11"), "index 11 fallback discriminator");

// ===== 测试 4：controlIdAttrs 返回 data-control-id + data-ui-event 字符串 =====

console.log("\n=== 测试 4：controlIdAttrs helper ===");

const attrs = SSI.controlIdAttrs(SSI.CLOSE_WINDOW_CONTROL_ID);
assert(attrs.includes(`data-control-id="${SSI.CLOSE_WINDOW_CONTROL_ID}"`), "attrs include data-control-id");
assert(attrs.includes('data-ui-event="reader.sourceSwitch.close"'), "attrs include data-ui-event");

// ===== 测试 5：render-runtime.js 已为 source-switch 域接入 data-control-id =====
// render-runtime.js 通过 window.ReaderSourceSwitchControlIds 的常量引用写入 controlId；
// 这里验证常量引用是否出现在 source-switch 函数体中。

console.log("\n=== 测试 5：render-runtime.js source-switch 函数接入 data-control-id ===");

const renderSrc = readFileSync(join(DEMO_DIR, "render-runtime.js"), "utf8");

// 抽取 source-switch 函数体范围（从 sourceCandidateRow 到 flowScreen 结束）
const ssStart = renderSrc.indexOf("function sourceCandidateRow(");
const ssEnd = renderSrc.indexOf("function sourceStrip(", ssStart);
if (ssStart < 0 || ssEnd < 0) {
  console.error("FAIL: 无法定位 source-switch 函数体");
  process.exit(1);
}
const ssBlock = renderSrc.slice(ssStart, ssEnd);

// 候选行接入 controlId
assert(ssBlock.includes("window.ReaderSourceSwitchControlIds.candidateRowControlId(index)"), "candidateRowControlId 调用");
assert(ssBlock.includes("window.ReaderSourceSwitchControlIds.controlIdAttrs(candidateId)"), "candidateRow controlIdAttrs 调用");
assert(ssBlock.includes("DATA_SOURCE_SWITCH_CANDIDATE_STATE"), "candidateState 终态属性引用");
assert(ssBlock.includes('aria-disabled="${canSwitch ? "false" : "true"}"'), "candidateRow aria-disabled");

// flowScreen 主窗口控件接入（通过常量引用）
assert(ssBlock.includes("CLOSE_WINDOW_CONTROL_ID"), "flowScreen close button 引用");
assert(ssBlock.includes("DEFAULT_PREVIEW"), "flowScreen 预览目录 button 引用");
assert(ssBlock.includes("DEFAULT_CONFIRM"), "flowScreen 确认换源 button 引用");
assert(ssBlock.includes("DEFAULT_VIEW_FAILED"), "flowScreen 查看失败重试 button 引用");
assert(ssBlock.includes("DEFAULT_VIEW_ROLLBACK"), "flowScreen 查看回滚确认 button 引用");

// 各状态变体控件接入（通过常量引用）
assert(ssBlock.includes("EMPTY_CLOSE") && ssBlock.includes("EMPTY_RETRY") && ssBlock.includes("EMPTY_RETURN_READER"), "empty state 控件接入");
assert(ssBlock.includes("ERROR_CLOSE") && ssBlock.includes("ERROR_RETRY") && ssBlock.includes("ERROR_RETURN_READER"), "error state 控件接入");
assert(ssBlock.includes("TIMEOUT_CLOSE") && ssBlock.includes("TIMEOUT_RETRY") && ssBlock.includes("TIMEOUT_RETURN_READER"), "timeout state 控件接入");
assert(ssBlock.includes("LOADING_CLOSE") && ssBlock.includes("LOADING_CANCEL"), "loading state 控件接入");
assert(ssBlock.includes("ROLLBACK_CLOSE") && ssBlock.includes("ROLLBACK_RETRY") && ssBlock.includes("ROLLBACK_RETURN_READER"), "rollback state 控件接入");
assert(ssBlock.includes("PREVIEW_CLOSE") && ssBlock.includes("PREVIEW_CONFIRM") && ssBlock.includes("PREVIEW_RETURN_LIST"), "preview state 控件接入");

// ===== 测试 6：交互状态标记 =====

console.log("\n=== 测试 6：交互状态标记到位 ===");

// repeat tap 屏蔽：loading 状态写 data-source-switch-busy="true"
assert(ssBlock.includes("DATA_SOURCE_SWITCH_BUSY"), "loading state busy 标记引用");
// stale result：状态 sections 写 data-source-switch-stale
assert(ssBlock.includes("DATA_SOURCE_SWITCH_STALE"), "state sections stale 标记引用");
// reduced-motion 终态：sourceSwitchFlowSessionAttr 写 data-source-switch-reduced-motion
assert(ssBlock.includes("data-source-switch-reduced-motion"), "reduced-motion 默认值");
// 候选行 aria-disabled 屏蔽 disabled 行
assert(ssBlock.includes('aria-disabled="${canSwitch ? "false" : "true"}"'), "候选行 aria-disabled 终态");

// ===== 测试 7：interaction 绑定接入 repeat tap 屏蔽 =====

console.log("\n=== 测试 7：interaction 绑定 repeat tap 屏蔽 ===");

// 找到 source-switch candidate row interaction binding（在文件后续部分）
const interactionBlock = renderSrc.slice(ssEnd);
assert(interactionBlock.includes('[data-source-switch-busy=\\"true\\"]'), "busy 屏蔽 selector");
assert(interactionBlock.includes('el.setAttribute("data-source-switch-stale", "true")'), "stale setAttribute 调用");

// ===== 测试 8：所有 source-switch 域控件在 dom-identity-map.json 中有 selector =====

console.log("\n=== 测试 8：dom-identity-map.json 覆盖 source-switch 默认状态控件 ===");

const domMap = JSON.parse(readFileSync(join(REPO_ROOT, "tools/interaction-inventory/generated/dom-identity-map.json"), "utf8"));
const ssDomEntries = domMap.entries.filter((e) => e.routeId === "source-switch");
const ssDomControlIds = new Set(ssDomEntries.map((e) => e.controlId));

let domCoverageFailures = 0;
for (const id of registryIds) {
  if (!ssDomControlIds.has(id)) {
    console.error(`  [FAIL] 候选行 controlId 未在 dom-identity-map: ${id}`);
    domCoverageFailures += 1;
  }
}
if (!ssDomControlIds.has(SSI.CLOSE_WINDOW_CONTROL_ID)) {
  console.error(`  [FAIL] close window controlId 未在 dom-identity-map: ${SSI.CLOSE_WINDOW_CONTROL_ID}`);
  domCoverageFailures += 1;
}
if (domCoverageFailures === 0) {
  console.log("  [OK] registry 默认状态控件全部在 dom-identity-map.json");
} else {
  failures += domCoverageFailures;
}

// ===== 测试 9：end-to-end 渲染（在 jsdom-like 沙箱中执行 source-switch 路由） =====
// 通过执行 render-runtime.js 验证 source-switch 函数实际输出 HTML 含 data-control-id 属性。
// 由于 render-runtime.js 依赖 window/document/ReaderShellKit/ReaderAssetIcons 等，这里只
// 执行 source-switch-control-ids.js 与一段精简的 source-switch 函数模板，验证模板拼接
// 产出含 data-control-id 的 HTML 字符串。

console.log("\n=== 测试 9：HTML 模板拼接产出 data-control-id ===");

// 模拟 sourceCandidateRow 的核心模板拼接
function simulateCandidateRow(index) {
  const candidateId = SSI.candidateRowControlId(index);
  const candidateAttrs = SSI.controlIdAttrs(candidateId);
  return `<article data-source-index="${index}"${candidateAttrs}></article>`;
}

const simArticle = simulateCandidateRow(0);
assert(simArticle.includes(`data-control-id="${SSI.CANDIDATE_ROW_CONTROL_IDS["0"]}"`), "candidate 0 模板含 data-control-id");
assert(simArticle.includes('data-ui-event="source.switch.select"'), "candidate 0 模板含 data-ui-event");

// 模拟 close button 模板拼接
const simClose = `<button${SSI.controlIdAttrs(SSI.CLOSE_WINDOW_CONTROL_ID)}></button>`;
assert(simClose.includes(`data-control-id="${SSI.CLOSE_WINDOW_CONTROL_ID}"`), "close button 模板含 data-control-id");
assert(simClose.includes('data-ui-event="reader.sourceSwitch.close"'), "close button 模板含 data-ui-event");

// 模拟 loading cancel button 模板拼接
const simCancel = `<button${SSI.controlIdAttrs(SSI.LOADING_CANCEL)}></button>`;
assert(simCancel.includes(`data-control-id="${SSI.LOADING_CANCEL}"`), "loading cancel 模板含 data-control-id");
assert(simCancel.includes('data-ui-event="source.switch.cancel"'), "loading cancel 模板含 data-ui-event");

// ===== 总结 =====

console.log("\n=== 总结 ===");
if (failures === 0) {
  console.log(`✅ 全部断言通过（${allControlIds.length} controlId + ${uniqueUiEvents.length} UiEvent）`);
  process.exit(0);
} else {
  console.error(`❌ ${failures} 项断言失败`);
  process.exit(1);
}
