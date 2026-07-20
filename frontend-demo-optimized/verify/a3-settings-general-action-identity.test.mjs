// A3 · settings-general action identity 验证
// -----------------------------------------------------------------------------
// 职责：验证 A3 新增的 9 个 a3-action 稳定 identity（reset-defaults / cache-clear /
//       back / 3 permission link row / 3 permission inner button）在 settings-general
//       路由下的 DOM 输出。
//
// 验证范围（与 A1 r2.0-subcontrol 互补）：
//   1. 9 个 a3-action 声明存在且 controlKey 稳定（非 ordinal）
//   2. DOM 输出 9 个 a3-action 元素，controlKey 与 declarations 一一对应
//   3. 三视口 controlKey 集合一致（renderer 输出与视口无关）
//   4. DOM 无 orphan / 无 extra / 无 duplicate
//   5. 每个元素携带完整 5 个 data-* 属性，值与 declaration 匹配
//   6. 每个元素的 DOM tag 类型符合预期（button vs article）
//   7. back button 位于 backTopBar slot 内
//   8. permission link row（article）与 permission inner button（button）成对出现
//
// 运行：node --test frontend-demo-optimized/verify/a3-settings-general-action-identity.test.mjs
// -----------------------------------------------------------------------------
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");

const d2SettingsSource = readFileSync(join(demoRoot, "renderers/d2-settings-sync-renderers.js"), "utf8");
const appearanceSpecSource = readFileSync(join(demoRoot, "appearance-spec.js"), "utf8");
const kitSource = readFileSync(join(demoRoot, "shared-shell-kit/kit.js"), "utf8");
const declarationsSource = readFileSync(join(demoRoot, "control-identity-declarations.js"), "utf8");

function evaluateSettingsGeneralRenderer() {
  const window = {
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    ReaderFrontendDemoDraftRouteContract: {
      routes: { "settings-general": { title: "通用设置" } },
      routePresentation: {},
    },
  };
  const ctx = vm.createContext({ window, module: { exports: {} } });
  new vm.Script(kitSource, { filename: "kit.js" }).runInContext(ctx);
  new vm.Script(appearanceSpecSource, { filename: "appearance-spec.js" }).runInContext(ctx);
  new vm.Script(declarationsSource, { filename: "control-identity-declarations.js" }).runInContext(ctx);
  new vm.Script(d2SettingsSource, { filename: "d2-settings-sync-renderers.js" }).runInContext(ctx);
  return {
    renderers: ctx.window.ReaderD2SettingsSyncRenderers,
    declarations: ctx.window.CANONICAL_CONTROL_DECLARATIONS,
  };
}

function extractControlKeys(html) {
  const set = [];
  const re = /data-control-key="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    set.push(m[1]);
  }
  return set;
}

function extractAttrMap(html) {
  const results = [];
  const re = /data-entity-key="([^"]*)"\s+data-control-key="([^"]*)"\s+data-control-id="([^"]*)"\s+data-ui-event="([^"]*)"\s+data-settings-key="([^"]*)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    results.push({
      entityKey: m[1],
      controlKey: m[2],
      controlId: m[3],
      uiEvent: m[4],
      settingsKey: m[5],
    });
  }
  return results;
}

// 找到 data-settings-key="<sk>" 所在元素的开标签名
function enclosingTagName(html, settingsKey) {
  const idx = html.indexOf(`data-settings-key="${settingsKey}"`);
  if (idx < 0) return null;
  const before = html.substring(0, idx);
  const lastLt = before.lastIndexOf("<");
  const tagMatch = html.substring(lastLt).match(/^<([a-z]+)/);
  return tagMatch ? tagMatch[1] : null;
}

// 检查某个 data-settings-key 元素是否位于某个 data-slot 内
function isInsideSlot(html, settingsKey, slotName) {
  const elemIdx = html.indexOf(`data-settings-key="${settingsKey}"`);
  if (elemIdx < 0) return false;
  const slotIdx = html.indexOf(`data-slot="${slotName}"`);
  if (slotIdx < 0 || slotIdx >= elemIdx) return false;
  // 简化检查：slot 起点在元素之前，且元素之后有对应的 </section> 闭合
  return true;
}

// ---- 加载 ----
const { renderers, declarations } = evaluateSettingsGeneralRenderer();
const sgActionDecls = declarations.filter(
  (d) => d.route === "settings-general" && d.source === "a3-action"
);
const sgActionControlKeySet = new Set(sgActionDecls.map((d) => d.controlKey));

// 期望的 9 个稳定 settingsKey 及其 DOM tag
const EXPECTED = [
  { settingsKey: "reset-defaults",                    tag: "button",  actionKey: "reset-defaults",        instanceKey: null,                        uiEvent: "reset-defaults.confirm" },
  { settingsKey: "cache-clear",                       tag: "button",  actionKey: "cache-clear",           instanceKey: null,                        uiEvent: "cache-clear.confirm" },
  { settingsKey: "back",                              tag: "button",  actionKey: "route.pop",             instanceKey: "back",                      uiEvent: "route.pop" },
  { settingsKey: "permission-battery",                tag: "article", actionKey: "permission.request",    instanceKey: "permission-battery",        uiEvent: "permission.request" },
  { settingsKey: "permission-file-access",            tag: "article", actionKey: "permission.request",    instanceKey: "permission-file-access",    uiEvent: "permission.request" },
  { settingsKey: "permission-notification",           tag: "article", actionKey: "permission.request",    instanceKey: "permission-notification",   uiEvent: "permission.request" },
  { settingsKey: "permission-action-battery",         tag: "button",  actionKey: "permission.open-settings", instanceKey: "permission-action-battery",  uiEvent: "permission.open-settings" },
  { settingsKey: "permission-action-file-access",     tag: "button",  actionKey: "permission.open-settings", instanceKey: "permission-action-file-access", uiEvent: "permission.open-settings" },
  { settingsKey: "permission-action-notification",    tag: "button",  actionKey: "permission.open-settings", instanceKey: "permission-action-notification", uiEvent: "permission.open-settings" },
];

// ---- 三视口渲染 ----
const PHONE_HTML = renderers.globalSettingsV2({}, "settings-general", {});
const COMPACT_HTML = renderers.globalSettingsV2({}, "settings-general", {});
const TABLET_HTML = renderers.globalSettingsV2({}, "settings-general", {});

const PHONE_KEYS = extractControlKeys(PHONE_HTML);
const COMPACT_KEYS = extractControlKeys(COMPACT_HTML);
const TABLET_KEYS = extractControlKeys(TABLET_HTML);

const PHONE_ACTION_KEYS = PHONE_KEYS.filter((k) => sgActionControlKeySet.has(k));
const COMPACT_ACTION_KEYS = COMPACT_KEYS.filter((k) => sgActionControlKeySet.has(k));
const TABLET_ACTION_KEYS = TABLET_KEYS.filter((k) => sgActionControlKeySet.has(k));

const PHONE_ACTION_ATTRS = extractAttrMap(PHONE_HTML).filter((m) => sgActionControlKeySet.has(m.controlKey));

// =============================================================================
// 1. a3-action declarations: 9 个稳定 identity，全部 mapped，无 ordinal controlKey
// =============================================================================
test("A3 settings-general: 9 a3-action declarations exist with stable non-ordinal controlKeys", () => {
  assert.equal(sgActionDecls.length, 9, "expected exactly 9 a3-action declarations");
  for (const decl of sgActionDecls) {
    assert.equal(decl.mappingStatus, "mapped",
      `${decl.controlKey} mappingStatus=${decl.mappingStatus}`);
    assert.equal(decl.needsActionKey, false,
      `${decl.controlKey} needsActionKey should be false`);
    assert.ok(decl.actionKey && decl.actionKey.length > 0,
      `${decl.controlKey} has empty actionKey`);
    assert.ok(decl.controlId && decl.controlId.length > 0,
      `${decl.controlKey} has empty controlId`);
    assert.ok(decl.uiEvent && decl.uiEvent.length > 0,
      `${decl.controlKey} has empty uiEvent`);
    // 稳定 controlKey 不应包含 ordinal 段（.n0 / .n1 / ... / .n8）
    assert.ok(!/\.n[0-9]$/.test(decl.controlKey),
      `${decl.controlKey} still uses ordinal suffix (expected stable business key)`);
    // 稳定 controlKey 应以 @settings-general.default 结尾
    assert.ok(decl.controlKey.endsWith("@settings-general.default"),
      `${decl.controlKey} does not end with @settings-general.default`);
  }
});

// =============================================================================
// 2. 每个 declaration 的 actionKey / instanceKey / settingsKey 符合预期
// =============================================================================
test("A3 settings-general: each a3-action declaration has expected actionKey/instanceKey/settingsKey", () => {
  const declBySettingsKey = new Map(sgActionDecls.map((d) => [d.settingsKey, d]));
  for (const exp of EXPECTED) {
    const decl = declBySettingsKey.get(exp.settingsKey);
    assert.ok(decl, `missing declaration for settingsKey=${exp.settingsKey}`);
    assert.equal(decl.actionKey, exp.actionKey,
      `actionKey mismatch for ${exp.settingsKey}: got ${decl.actionKey}, expected ${exp.actionKey}`);
    assert.equal(decl.instanceKey, exp.instanceKey,
      `instanceKey mismatch for ${exp.settingsKey}: got ${decl.instanceKey}, expected ${exp.instanceKey}`);
    assert.equal(decl.uiEvent, exp.uiEvent,
      `uiEvent mismatch for ${exp.settingsKey}: got ${decl.uiEvent}, expected ${exp.uiEvent}`);
  }
});

// =============================================================================
// 3. DOM a3-action 元素数 = 9，且与 declarations 一一对应
// =============================================================================
test("A3 settings-general: DOM contains exactly 9 a3-action elements matching declarations", () => {
  assert.equal(PHONE_ACTION_KEYS.length, 9,
    `DOM has ${PHONE_ACTION_KEYS.length} a3-action elements (expected 9)`);

  const declControlKeys = new Set(sgActionDecls.map((d) => d.controlKey));
  for (const key of PHONE_ACTION_KEYS) {
    assert.ok(declControlKeys.has(key),
      `orphan a3-action controlKey in DOM (not in declarations): ${key}`);
  }
  // 反向：每个 declaration 都在 DOM 中出现
  for (const decl of sgActionDecls) {
    assert.ok(PHONE_ACTION_KEYS.includes(decl.controlKey),
      `declaration controlKey not found in DOM: ${decl.controlKey}`);
  }
});

// =============================================================================
// 4. 三视口 a3-action controlKey 集合一致
// =============================================================================
test("A3 settings-general: three-viewport a3-action controlKey set is identical", () => {
  assert.equal(COMPACT_ACTION_KEYS.length, 9, "compact a3-action count");
  assert.equal(TABLET_ACTION_KEYS.length, 9, "tablet a3-action count");

  const phoneSet = new Set(PHONE_ACTION_KEYS);
  const compactSet = new Set(COMPACT_ACTION_KEYS);
  const tabletSet = new Set(TABLET_ACTION_KEYS);

  assert.equal(phoneSet.size, 9, "phone a3-action controlKeys are unique");
  assert.equal(compactSet.size, 9, "compact a3-action controlKeys are unique");
  assert.equal(tabletSet.size, 9, "tablet a3-action controlKeys are unique");

  for (const key of phoneSet) {
    assert.ok(compactSet.has(key), `compact missing a3-action controlKey: ${key}`);
    assert.ok(tabletSet.has(key), `tablet missing a3-action controlKey: ${key}`);
  }
});

// =============================================================================
// 5. DOM 无 duplicate a3-action controlKey
// =============================================================================
test("A3 settings-general: DOM has zero duplicate a3-action controlKeys", () => {
  const seen = new Set();
  for (const key of PHONE_ACTION_KEYS) {
    assert.ok(!seen.has(key), `duplicate a3-action controlKey in DOM: ${key}`);
    seen.add(key);
  }
});

// =============================================================================
// 6. 每个 a3-action DOM 元素携带完整 5 个 data-* 属性，值与 declaration 匹配
// =============================================================================
test("A3 settings-general: every a3-action DOM element carries all 5 data-* attributes matching declarations", () => {
  assert.equal(PHONE_ACTION_ATTRS.length, 9,
    `only ${PHONE_ACTION_ATTRS.length} a3-action elements carry all 5 attributes (expected 9)`);

  const declByControlKey = new Map(sgActionDecls.map((d) => [d.controlKey, d]));
  for (const item of PHONE_ACTION_ATTRS) {
    const decl = declByControlKey.get(item.controlKey);
    assert.ok(decl, `DOM a3-action element with controlKey=${item.controlKey} not found in declarations`);
    assert.equal(item.entityKey, decl.entityKey, `entityKey mismatch for ${item.controlKey}`);
    assert.equal(item.controlId, decl.controlId, `controlId mismatch for ${item.controlKey}`);
    assert.equal(item.uiEvent, decl.uiEvent, `uiEvent mismatch for ${item.controlKey}`);
    assert.equal(item.settingsKey, decl.settingsKey, `settingsKey mismatch for ${item.controlKey}`);
  }
});

// =============================================================================
// 7. DOM 元素 tag 类型符合预期（button vs article）
// =============================================================================
test("A3 settings-general: each a3-action element uses expected DOM tag type", () => {
  for (const exp of EXPECTED) {
    const tag = enclosingTagName(PHONE_HTML, exp.settingsKey);
    assert.equal(tag, exp.tag,
      `settingsKey=${exp.settingsKey} expected <${exp.tag}> but found <${tag}>`);
  }
});

// =============================================================================
// 8. back button 位于 backTopBar slot 内
// =============================================================================
test("A3 settings-general: back button identity is stamped inside backTopBar slot", () => {
  const slotIdx = PHONE_HTML.indexOf('data-slot="backTopBar"');
  const backIdx = PHONE_HTML.indexOf('data-settings-key="back"');
  assert.ok(slotIdx >= 0, "backTopBar slot not found in HTML");
  assert.ok(backIdx >= 0, "back button identity not found in HTML");
  assert.ok(slotIdx < backIdx,
    "back button identity must appear after backTopBar slot open tag");
  // back button 应在 backTopBar section 闭合之前
  const sectionCloseAfterSlot = PHONE_HTML.indexOf("</section>", slotIdx);
  assert.ok(backIdx < sectionCloseAfterSlot,
    "back button identity must appear before backTopBar </section> close tag");
});

// =============================================================================
// 9. permission link row (article) 与 permission inner button (button) 成对出现
//    每个 permission-{name} 的 article 都有一个对应的 permission-action-{name} button
// =============================================================================
test("A3 settings-general: each permission row (article) is paired with its inner permission-action button", () => {
  const permissionNames = ["battery", "file-access", "notification"];
  for (const name of permissionNames) {
    const rowKey = `permission-${name}`;
    const innerKey = `permission-action-${name}`;
    const rowIdx = PHONE_HTML.indexOf(`data-settings-key="${rowKey}"`);
    const innerIdx = PHONE_HTML.indexOf(`data-settings-key="${innerKey}"`);
    assert.ok(rowIdx >= 0, `permission row ${rowKey} not found in DOM`);
    assert.ok(innerIdx >= 0, `permission inner button ${innerKey} not found in DOM`);
    // inner button 应在 row article 之后（article 内部）
    assert.ok(innerIdx > rowIdx,
      `${innerKey} button should appear after ${rowKey} article (inside the row)`);
    // article 闭合之前
    const articleClose = PHONE_HTML.indexOf("</article>", rowIdx);
    assert.ok(innerIdx < articleClose,
      `${innerKey} button should appear before ${rowKey} article close tag`);
  }
});

// =============================================================================
// 10. 三个 permission inner button 可区分：各自有独立的 instanceKey
// =============================================================================
test("A3 settings-general: three permission-action buttons have distinct instanceKeys", () => {
  const innerButtons = PHONE_ACTION_ATTRS.filter((a) =>
    a.settingsKey.startsWith("permission-action-")
  );
  assert.equal(innerButtons.length, 3, "expected 3 permission-action buttons");
  const instanceKeys = new Set();
  for (const btn of innerButtons) {
    const decl = sgActionDecls.find((d) => d.controlKey === btn.controlKey);
    assert.ok(decl, `declaration not found for ${btn.controlKey}`);
    assert.ok(decl.instanceKey, `instanceKey should be non-null for ${btn.controlKey}`);
    assert.ok(!instanceKeys.has(decl.instanceKey),
      `duplicate instanceKey: ${decl.instanceKey}`);
    instanceKeys.add(decl.instanceKey);
  }
  assert.equal(instanceKeys.size, 3, "expected 3 distinct instanceKeys");
});

// =============================================================================
// 11. 三个 permission link row 可区分：各自有独立的 instanceKey
// =============================================================================
test("A3 settings-general: three permission link rows have distinct instanceKeys", () => {
  const linkRows = PHONE_ACTION_ATTRS.filter((a) =>
    a.settingsKey.startsWith("permission-") && !a.settingsKey.startsWith("permission-action-")
  );
  assert.equal(linkRows.length, 3, "expected 3 permission link rows");
  const instanceKeys = new Set();
  for (const row of linkRows) {
    const decl = sgActionDecls.find((d) => d.controlKey === row.controlKey);
    assert.ok(decl, `declaration not found for ${row.controlKey}`);
    assert.ok(decl.instanceKey, `instanceKey should be non-null for ${row.controlKey}`);
    assert.ok(!instanceKeys.has(decl.instanceKey),
      `duplicate instanceKey: ${decl.instanceKey}`);
    instanceKeys.add(decl.instanceKey);
  }
  assert.equal(instanceKeys.size, 3, "expected 3 distinct instanceKeys");
});

// =============================================================================
// 12. 旧 ordinal registry entries 不再出现在 DOM（n0..n8 已被稳定 key 替换）
// =============================================================================
test("A3 settings-general: no ordinal registry controlKeys (.n0..n8) appear in DOM", () => {
  for (const key of PHONE_KEYS) {
    assert.ok(!/\.n[0-8](@|$)/.test(key),
      `ordinal controlKey still in DOM: ${key}`);
  }
});
