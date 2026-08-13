#!/usr/bin/env node
// B1 · Settings Operations — Control Identity 与交互状态验收
//
// 验收范围：
//   1. settings-shell.js 暴露的 REGISTRY controlId 全部符合 schema pattern
//   2. 所有 UI_EVENTS 名均已在 contracts/ui-event.schema.json enum 中冻结
//   3. lookupControlId 对 4 个 route 的关键 key 返回非 null
//   4. nativeSwitch/nativeSelectTrigger/nativeSegment/nativeStepper/nativeInput
//      返回的 HTML 含 data-control-id + 原生 ARIA 语义
//   5. detectRoute 能从 backTopBar <h1> 文本识别 4 个 route
//   6. stampIdentity 能正确加盖 data-control-id + data-ui-event
//   7. controlAttrs helper 拼接 data-control-id 字符串
//   8. index.html 已加载 settings-shell.js
//
// 退出码：全绿返回 0；任一断言失败返回 1。
//
// 用法：node frontend-demo-next/verify/verify-settings-control-identity.mjs

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

// ===== 在 vm 沙箱中执行 settings-shell.js =====

const controlIdsSrc = readFileSync(join(DEMO_DIR, "settings-shell.js"), "utf8");

function makeNoop() {
  return function noop() { /* vm sandbox no-op */ };
}

const documentMock = {
  readyState: "complete",
  getElementById: () => null,
  addEventListener: makeNoop(),
  querySelector: () => null,
  querySelectorAll: () => [],
  activeElement: null
};

const sandbox = {
  window: {},
  document: documentMock,
  console,
  Promise: Promise,
  MutationObserver: function MutationObserverMock() {
    this.observe = makeNoop();
    this.disconnect = makeNoop();
    this.takeRecords = () => [];
  }
};
sandbox.globalThis = sandbox;
sandbox.window.document = documentMock;
sandbox.window.addEventListener = makeNoop();

vm.createContext(sandbox);
vm.runInContext(controlIdsSrc, sandbox);

const SSS = sandbox.window.ReaderSettingsShell;
if (!SSS) {
  console.error("FAIL: window.ReaderSettingsShell 未定义");
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

// ===== 测试 1：所有暴露的 REGISTRY controlId 符合 schema pattern =====

console.log("\n=== 测试 1：controlId 格式合规 ===");

const allRegistryControlIds = [];
for (const route of Object.keys(SSS.REGISTRY)) {
  for (const [key, id] of Object.entries(SSS.REGISTRY[route])) {
    allRegistryControlIds.push({ route, key, id });
  }
}
console.log(`  共 ${allRegistryControlIds.length} 个 registry controlId`);
for (const item of allRegistryControlIds) {
  assert(CONTROL_ID_PATTERN.test(item.id), `pattern: ${item.route}:${item.key}`);
}

// ===== 测试 2：所有 UI_EVENTS 名在 ui-event.schema.json enum 中 =====

console.log("\n=== 测试 2：UiEvent 已在 contract 冻结 ===");

const allUiEvents = Object.values(SSS.UI_EVENTS);
const uniqueUiEvents = [...new Set(allUiEvents)];
console.log(`  共 ${uniqueUiEvents.length} 个唯一 UiEvent`);
for (const evt of uniqueUiEvents) {
  assert(UI_EVENT_ENUM.has(evt), `enum: ${evt}`);
}

// ===== 测试 3：lookupControlId 对 4 个 route 的关键 key 返回非 null =====

console.log("\n=== 测试 3：lookupControlId 关键 key 覆盖 ===");

const expectedKeys = {
  "settings-general": ["__back__", "__reset__", "App主题", "语言", "启动时打开", "自动检查更新", "点击当前底栏回顶部", "减少动态效果", "崩溃日志", "动画效果", "缓存清理", "文件访问", "文件访问:action", "通知权限", "通知权限:action", "电池优化", "电池优化:action"],
  "source-management": ["__back__", "__detect_all__", "__detect_action__", "__import_row__", "__import_action__", "__export_row__", "__export_action__", "__groups_row__", "__groups_action__", "__logs_row__", "__logs_action__", "__add__", "__batch_delete__", "起点中文网", "笔趣阁", "本地导入源", "测试书源"],
  "webdav-config": ["__back__", "服务器地址", "账号", "密码", "同步目录", "__test__", "__save__", "__stepper_dec__", "__stepper_inc__", "__dialog_cancel__", "__dialog_confirm__", "证书校验", "连接超时", "仅 Wi-Fi 同步", "自动同步"],
  "sync-backup": ["__back__", "服务器地址", "账号", "密码", "同步目录", "__test__", "__save__", "__restore:WebDAV · 2026-06-23 08:00 · 完整备份__", "__restore:本地 · 2026-06-23 10:30 · 完整备份__", "__restore:WebDAV · 2026-06-21 22:30 · 书架与设置__", "__restore:WebDAV · 2026-06-16 02:00 · 完整备份__", "__restore:本地 · 2026-06-20 09:40 · 阅读进度__", "__restore:WebDAV · 2026-06-12 18:10 · 书源配置__"]
};

for (const route of Object.keys(expectedKeys)) {
  for (const key of expectedKeys[route]) {
    const id = SSS.lookupControlId(route, key);
    assert(id !== null, `lookupControlId(${route}, ${key})`);
  }
}

// ===== 测试 4：native* helpers 返回 HTML 含 data-control-id + 原生 ARIA 语义 =====

console.log("\n=== 测试 4：native* helpers 原生语义 ===");

const switchHtml = SSS.nativeSwitch({
  controlId: "test.switch.default.phone.switch.demo",
  checked: true,
  ariaLabel: "自动检查更新",
  uiEvent: SSS.UI_EVENTS.SETTINGS_TOGGLE,
  stateOwner: SSS.STATE_OWNERS.SETTINGS_STORE
});
assert(switchHtml.includes('data-control-id="test.switch.default.phone.switch.demo"'), "nativeSwitch 含 data-control-id");
assert(switchHtml.includes('role="switch"'), "nativeSwitch 含 role=switch");
assert(switchHtml.includes('aria-checked="true"'), "nativeSwitch 含 aria-checked=true");

const selectHtml = SSS.nativeSelectTrigger({
  controlId: "test.select.default.phone.combo.demo",
  title: "语言",
  uiEvent: SSS.UI_EVENTS.SETTINGS_SELECT,
  stateOwner: SSS.STATE_OWNERS.SETTINGS_STORE
});
assert(selectHtml.includes('data-control-id="test.select.default.phone.combo.demo"'), "nativeSelectTrigger 含 data-control-id");
assert(selectHtml.includes('role="combobox"'), "nativeSelectTrigger 含 role=combobox");
assert(selectHtml.includes('aria-haspopup="listbox"'), "nativeSelectTrigger 含 aria-haspopup=listbox");

const segmentHtml = SSS.nativeSegment({
  controlId: "test.segment.default.phone.group.demo",
  title: "App主题",
  options: ["跟随系统", "浅色", "深色"],
  value: "跟随系统",
  uiEvent: SSS.UI_EVENTS.SETTINGS_SEGMENT,
  stateOwner: SSS.STATE_OWNERS.SETTINGS_STORE
});
assert(segmentHtml.includes('data-control-id="test.segment.default.phone.group.demo"'), "nativeSegment 含 data-control-id");
assert(segmentHtml.includes('role="group"'), "nativeSegment 含 role=group");
assert(segmentHtml.includes('aria-pressed="true"'), "nativeSegment 含 aria-pressed=true");
assert(segmentHtml.includes('aria-pressed="false"'), "nativeSegment 含 aria-pressed=false");

const stepperHtml = SSS.nativeStepper({
  controlId: "test.stepper.default.phone.group.demo",
  decControlId: "test.stepper.default.phone.button.dec",
  incControlId: "test.stepper.default.phone.button.inc",
  title: "字号",
  value: "16pt",
  uiEvent: SSS.UI_EVENTS.SETTINGS_STEPPER,
  stateOwner: SSS.STATE_OWNERS.SETTINGS_STORE
});
assert(stepperHtml.includes('data-stepper-action="decrement"'), "nativeStepper 含 data-stepper-action=decrement");
assert(stepperHtml.includes('data-stepper-action="increment"'), "nativeStepper 含 data-stepper-action=increment");
assert(stepperHtml.includes('aria-live="polite"'), "nativeStepper 含 aria-live=polite");

const inputHtml = SSS.nativeInput({
  controlId: "test.textbox.default.phone.textbox.demo",
  title: "服务器地址",
  inputType: "url",
  value: "https://dav.example.com",
  uiEvent: SSS.UI_EVENTS.WEBDAV_INPUT,
  stateOwner: SSS.STATE_OWNERS.SYNC_STORE
});
assert(inputHtml.includes('data-control-id="test.textbox.default.phone.textbox.demo"'), "nativeInput 含 data-control-id");
assert(inputHtml.includes('aria-label="服务器地址"'), "nativeInput 含 aria-label");

// ===== 测试 5：detectRoute 能从 backTopBar <h1> 文本识别 4 个 route =====

console.log("\n=== 测试 5：detectRoute 路由识别 ===");

function makeMockRoot(titleText, hasDeleteDialog) {
  const h1 = { textContent: titleText };
  return {
    querySelector: (sel) => {
      if (sel === "[data-slot=\"backTopBar\"] h1") return h1;
      if (sel === "[data-source-delete-dialog]" && hasDeleteDialog) return { exists: true };
      return null;
    },
    querySelectorAll: () => []
  };
}

assert(SSS.detectRoute(makeMockRoot("通用设置", false)) === "settings-general", "通用设置 → settings-general");
assert(SSS.detectRoute(makeMockRoot("书源管理", false)) === "source-management", "书源管理 → source-management");
assert(SSS.detectRoute(makeMockRoot("WebDAV 配置", false)) === "webdav-config", "WebDAV 配置 → webdav-config");
assert(SSS.detectRoute(makeMockRoot("同步与备份", false)) === "sync-backup", "同步与备份 → sync-backup");
assert(SSS.detectRoute(makeMockRoot("未知标题", true)) === "source-delete-confirm", "未知标题 + delete-dialog → source-delete-confirm");
assert(SSS.detectRoute(makeMockRoot("未知标题", false)) === null, "未知标题 → null");

// ===== 测试 6：stampIdentity 能正确加盖 data-control-id + data-ui-event =====

console.log("\n=== 测试 6：stampIdentity DOM 盖章 ===");

const stampedAttrs = {};
const stampedEl = {
  setAttribute: (name, value) => { stampedAttrs[name] = String(value); },
  removeAttribute: (name) => { delete stampedAttrs[name]; }
};
SSS.stampIdentity(stampedEl, {
  controlId: "test.button.default.phone.button.demo",
  uiEvent: SSS.UI_EVENTS.WEBDAV_TEST,
  stateOwner: SSS.STATE_OWNERS.SYNC_STORE,
  asyncState: SSS.ASYNC_STATES.BUSY,
  danger: true,
  focusKey: "test:focus",
  repeatTapGuard: true,
  staleResult: false
});
assert(stampedAttrs["data-control-id"] === "test.button.default.phone.button.demo", "stampIdentity 写 data-control-id");
assert(stampedAttrs["data-ui-event"] === "webdav.config.test", "stampIdentity 写 data-ui-event");
assert(stampedAttrs["data-state-owner"] === "sync-store", "stampIdentity 写 data-state-owner");
assert(stampedAttrs["data-async-state"] === "busy", "stampIdentity 写 data-async-state=busy");
assert(stampedAttrs["data-danger-confirm"] === "true", "stampIdentity 写 data-danger-confirm");
assert(stampedAttrs["data-focus-restore-key"] === "test:focus", "stampIdentity 写 data-focus-restore-key");
assert(stampedAttrs["data-repeat-tap-guard"] === "true", "stampIdentity 写 data-repeat-tap-guard");
assert(!("data-stale-result" in stampedAttrs), "stampIdentity 不写 data-stale-result（值为 false）");

// ===== 测试 7：controlAttrs helper 拼接 data-control-id 字符串 =====

console.log("\n=== 测试 7：controlAttrs helper ===");

const attrs = SSS.controlAttrs({
  controlId: "test.button.default.phone.button.demo",
  uiEvent: SSS.UI_EVENTS.WEBDAV_SAVE,
  stateOwner: SSS.STATE_OWNERS.SYNC_STORE
});
assert(attrs.includes('data-control-id="test.button.default.phone.button.demo"'), "controlAttrs 含 data-control-id");
assert(attrs.includes('data-ui-event="webdav.config.save"'), "controlAttrs 含 data-ui-event");
assert(attrs.includes('data-state-owner="sync-store"'), "controlAttrs 含 data-state-owner");

// ===== 测试 8：index.html 已加载 settings-shell.js =====

console.log("\n=== 测试 8：index.html 加载 settings-shell.js ===");

const indexHtml = readFileSync(join(DEMO_DIR, "index.html"), "utf8");
assert(indexHtml.includes("settings-shell.js"), "index.html 引用 settings-shell.js");
assert(/settings-shell\.js\?v=/.test(indexHtml), "index.html 含 settings-shell.js?v= 版本号");

// ===== 测试 9：STATE_OWNERS 与 ASYNC_STATES 值符合预期 =====

console.log("\n=== 测试 9：STATE_OWNERS 与 ASYNC_STATES 词表 ===");

assert(SSS.STATE_OWNERS.LOCAL === "local-state", "STATE_OWNERS.LOCAL");
assert(SSS.STATE_OWNERS.SETTINGS_STORE === "settings-store", "STATE_OWNERS.SETTINGS_STORE");
assert(SSS.STATE_OWNERS.SOURCE_STORE === "source-store", "STATE_OWNERS.SOURCE_STORE");
assert(SSS.STATE_OWNERS.SYNC_STORE === "sync-store", "STATE_OWNERS.SYNC_STORE");
assert(SSS.STATE_OWNERS.CORE_COMMAND === "core-command", "STATE_OWNERS.CORE_COMMAND");
assert(SSS.STATE_OWNERS.HOST_REQUEST === "host-request", "STATE_OWNERS.HOST_REQUEST");
assert(SSS.ASYNC_STATES.IDLE === "idle", "ASYNC_STATES.IDLE");
assert(SSS.ASYNC_STATES.BUSY === "busy", "ASYNC_STATES.BUSY");
assert(SSS.ASYNC_STATES.SUCCESS === "success", "ASYNC_STATES.SUCCESS");
assert(SSS.ASYNC_STATES.ERROR === "error", "ASYNC_STATES.ERROR");
assert(SSS.ASYNC_STATES.STALE === "stale", "ASYNC_STATES.STALE");

// ===== 测试 10：B1_ROUTES 覆盖 4 个页面族 + source-delete-confirm =====

console.log("\n=== 测试 10：B1_ROUTES 覆盖 ===");

assert(SSS.B1_ROUTES["settings-general"] === true, "B1_ROUTES 含 settings-general");
assert(SSS.B1_ROUTES["source-management"] === true, "B1_ROUTES 含 source-management");
assert(SSS.B1_ROUTES["webdav-config"] === true, "B1_ROUTES 含 webdav-config");
assert(SSS.B1_ROUTES["sync-backup"] === true, "B1_ROUTES 含 sync-backup");
assert(SSS.B1_ROUTES["source-delete-confirm"] === true, "B1_ROUTES 含 source-delete-confirm");
assert(SSS.isSettingsDomainRoute("settings-general") === true, "isSettingsDomainRoute(settings-general)");
assert(SSS.isSettingsDomainRoute("reader") === false, "isSettingsDomainRoute(reader) = false");

// ===== 测试 11：DOM 后处理函数已导出 =====

console.log("\n=== 测试 11：DOM 后处理 API 导出 ===");

assert(typeof SSS.stampIdentity === "function", "导出 stampIdentity");
assert(typeof SSS.detectRoute === "function", "导出 detectRoute");
assert(typeof SSS.upgradeSwitch === "function", "导出 upgradeSwitch");
assert(typeof SSS.upgradeSegment === "function", "导出 upgradeSegment");
assert(typeof SSS.upgradeStepper === "function", "导出 upgradeStepper");
assert(typeof SSS.upgradeSelectRow === "function", "导出 upgradeSelectRow");
assert(typeof SSS.upgradeInputRow === "function", "导出 upgradeInputRow");
assert(typeof SSS.stampSettingsGeneral === "function", "导出 stampSettingsGeneral");
assert(typeof SSS.stampSourceManagement === "function", "导出 stampSourceManagement");
assert(typeof SSS.stampWebdavConfig === "function", "导出 stampWebdavConfig");
assert(typeof SSS.stampSyncBackup === "function", "导出 stampSyncBackup");
assert(typeof SSS.stampSourceDeleteConfirm === "function", "导出 stampSourceDeleteConfirm");
assert(typeof SSS.stampSettingsScreen === "function", "导出 stampSettingsScreen");
assert(typeof SSS.installObserver === "function", "导出 installObserver");

// ===== 总结 =====

console.log("\n=== 总结 ===");
if (failures === 0) {
  console.log(`✅ 全部断言通过（${allRegistryControlIds.length} controlId + ${uniqueUiEvents.length} UiEvent + 4 route 路由识别 + DOM 盖章 + helper HTML）`);
  process.exit(0);
} else {
  console.error(`❌ ${failures} 项断言失败`);
  process.exit(1);
}
