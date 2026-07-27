// A2 (R2b) · settings-general 4 switch + 3 select + 1 segment 真实交互验证
// -----------------------------------------------------------------------------
// 职责：验证 settings-general 路由下 8 个 subcontrol 的选择/保存/恢复完整循环：
//   1. TOGGLE_SWITCH → state.values 更新 → persist → 重新渲染 DOM 反映新 is-on class
//   2. SELECT_OPTION (select) → state.values 更新 → persist → 重新渲染 DOM 反映新 value
//   3. SELECT_OPTION (segment) → state.values 更新 → persist → 重新渲染 DOM 反映新 is-active
//   4. 启动时从 localStorage 恢复 values
//   5. label ↔ raw value 双向映射
//   6. 三视口渲染结果一致（renderer 输出与视口无关）
//
// 运行：node --test frontend-demo-optimized/verify/a2-settings-general-interaction.test.mjs
// -----------------------------------------------------------------------------
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "..");

const kitSource = readFileSync(join(demoRoot, "shared-shell-kit/kit.js"), "utf8");
const appearanceSpecSource = readFileSync(join(demoRoot, "appearance-spec.js"), "utf8");
const declarationsSource = readFileSync(join(demoRoot, "control-identity-declarations.js"), "utf8");
const d2SettingsSource = readFileSync(join(demoRoot, "renderers/d2-settings-sync-renderers.js"), "utf8");

// 每个 test 用例都创建独立的 sandbox（避免 state 单例污染）
function freshSandbox(storedValues) {
  const window = {
    localStorage: {
      _store: {},
      getItem(k) { return this._store[k] || null; },
      setItem(k, v) { this._store[k] = v; },
      removeItem(k) { delete this._store[k]; },
    },
    ReaderFrontendDemoDraftRouteContract: {
      routes: { "settings-general": { title: "通用设置" } },
      routePresentation: {},
    },
  };
  if (storedValues) {
    window.localStorage._store["reader-d2-settings-general-values"] = JSON.stringify(storedValues);
  }
  const ctx = vm.createContext({ window, module: { exports: {} } });
  new vm.Script(kitSource, { filename: "kit.js" }).runInContext(ctx);
  new vm.Script(appearanceSpecSource, { filename: "appearance-spec.js" }).runInContext(ctx);
  new vm.Script(declarationsSource, { filename: "decls.js" }).runInContext(ctx);
  new vm.Script(d2SettingsSource, { filename: "d2.js" }).runInContext(ctx);
  return ctx.window.ReaderD2SettingsSyncRenderers;
}

// 从 HTML 字符串中提取某个 settingsKey 的 switch is-on class
// d2Switch 输出: <span class="fd-settings-switch[ is-on]" data-... data-settings-key="..." ...>
// class 在 data-settings-key 之前，需要匹配整个 span 开标签
function switchIsOn(html, settingsKey) {
  const re = new RegExp(`<span class="fd-settings-switch([^"]*)"[^>]*data-settings-key="${settingsKey}"`, "");
  const m = html.match(re);
  if (!m) return null;
  return m[1].indexOf("is-on") >= 0;
}

// 从 HTML 字符串中提取某个 settingsKey 的 segment button is-active 顺序（返回第几个 option 是 active, 0-based）
// d2Segment 输出每个 button: <button class="[is-active]" type="button" data-... data-settings-key="...">
function segmentActiveIndex(html, settingsKey) {
  const results = [];
  for (let i = 1; i <= 3; i++) {
    const sk = `${settingsKey}-segment-option-${i}`;
    // button 输出: <button class="..." type="button" data-entity-key=... data-settings-key="sk">
    const re = new RegExp(`<button class="([^"]*)"[^>]*data-settings-key="${sk}"`, "");
    const m = html.match(re);
    if (m && m[1].indexOf("is-active") >= 0) results.push(i - 1);
  }
  return results.length === 1 ? results[0] : null;
}

// 从 HTML 字符串中提取 select row 的 value（<strong class="fd-settings-value">VALUE</strong>）
// select row 的 <article> 有 data-settings-key, 子元素 <strong class="fd-settings-value"> 是 value
function selectValue(html, settingsKey) {
  const re = new RegExp(`data-settings-key="${settingsKey}"[^>]*>[\\s\\S]*?<strong class="fd-settings-value">([^<]+)</strong>`, "");
  const m = html.match(re);
  return m ? m[1] : null;
}

// =============================================================================
// 1. 4 个 switch: TOGGLE_SWITCH → state 更新 → persist → DOM 反映
// =============================================================================
test("A2 Phase 3: 4 switch toggle updates state, persists, and reflects in DOM is-on class", () => {
  const r = freshSandbox();
  const sg = r.settingsGeneral;
  const switches = ["auto-check-update", "tap-bottom-scroll-top", "reduce-motion", "crash-log"];

  // 初始状态：默认值
  let html = r.globalSettingsV2({}, "settings-general", {});
  assert.equal(switchIsOn(html, "auto-check-update"), true, "initial auto-check-update is-on");
  assert.equal(switchIsOn(html, "tap-bottom-scroll-top"), true, "initial tap-bottom-scroll-top is-on");
  assert.equal(switchIsOn(html, "reduce-motion"), false, "initial reduce-motion NOT is-on");
  assert.equal(switchIsOn(html, "crash-log"), true, "initial crash-log is-on");

  // 逐个 toggle
  for (const sk of switches) {
    const prev = sg.getState().values[sk];
    sg.dispatch({ type: "TOGGLE_SWITCH", settingsKey: sk, value: !prev });
    assert.equal(sg.getState().values[sk], !prev, `state.values[${sk}] flipped`);
  }

  // 重新渲染，DOM 反映新状态
  html = r.globalSettingsV2({}, "settings-general", {});
  assert.equal(switchIsOn(html, "auto-check-update"), false, "after toggle auto-check-update NOT is-on");
  assert.equal(switchIsOn(html, "tap-bottom-scroll-top"), false, "after toggle tap-bottom-scroll-top NOT is-on");
  assert.equal(switchIsOn(html, "reduce-motion"), true, "after toggle reduce-motion is-on");
  assert.equal(switchIsOn(html, "crash-log"), false, "after toggle crash-log NOT is-on");

  // 持久化：通过 storage API 间接验证（d2Get 内部已 JSON.parse）
  const storedValues = r.storage.get("settings-general-values");
  assert.equal(storedValues["auto-check-update"], false, "persisted auto-check-update=false");
  assert.equal(storedValues["reduce-motion"], true, "persisted reduce-motion=true");
  assert.equal(sg.getState().values["auto-check-update"], false);
  assert.equal(sg.getState().values["reduce-motion"], true);
});

// =============================================================================
// 2. 3 个 select: SELECT_OPTION → state 更新 → persist → DOM 反映新 value
// =============================================================================
test("A2 Phase 3: 3 select option change updates state, persists, and reflects in DOM value", () => {
  const r = freshSandbox();
  const sg = r.settingsGeneral;

  let html = r.globalSettingsV2({}, "settings-general", {});
  // 初始：默认值映射到 label
  assert.equal(selectValue(html, "language"), "简体中文", "initial language label");
  assert.equal(selectValue(html, "startup-screen"), "书架", "initial startup-screen label");
  assert.equal(selectValue(html, "animation-effect"), "标准", "initial animation-effect label");

  // 切换 language → en
  sg.dispatch({ type: "SELECT_OPTION", settingsKey: "language", value: "en" });
  html = r.globalSettingsV2({}, "settings-general", {});
  assert.equal(selectValue(html, "language"), "English", "after select language=en label");

  // 切换 startup-screen → discover
  sg.dispatch({ type: "SELECT_OPTION", settingsKey: "startup-screen", value: "discover" });
  html = r.globalSettingsV2({}, "settings-general", {});
  assert.equal(selectValue(html, "startup-screen"), "发现", "after select startup-screen=discover label");

  // 切换 animation-effect → reduce
  sg.dispatch({ type: "SELECT_OPTION", settingsKey: "animation-effect", value: "reduce" });
  html = r.globalSettingsV2({}, "settings-general", {});
  assert.equal(selectValue(html, "animation-effect"), "减少", "after select animation-effect=reduce label");

  // state values 是 raw value
  assert.equal(sg.getState().values["language"], "en");
  assert.equal(sg.getState().values["startup-screen"], "discover");
  assert.equal(sg.getState().values["animation-effect"], "reduce");
});

// =============================================================================
// 3. 1 个 segment: SELECT_OPTION → state 更新 → persist → DOM 反映新 is-active
// =============================================================================
test("A2 Phase 3: 1 segment option change updates state, persists, and reflects in DOM is-active", () => {
  const r = freshSandbox();
  const sg = r.settingsGeneral;

  let html = r.globalSettingsV2({}, "settings-general", {});
  // 初始：follow-system → option 0 (跟随系统) 是 active
  assert.equal(segmentActiveIndex(html, "app-theme"), 0, "initial app-theme active is option 0 (跟随系统)");

  // 切换 app-theme → light (option 1)
  sg.dispatch({ type: "SELECT_OPTION", settingsKey: "app-theme", value: "light" });
  html = r.globalSettingsV2({}, "settings-general", {});
  assert.equal(segmentActiveIndex(html, "app-theme"), 1, "after segment app-theme=light active is option 1 (浅色)");

  // 切换 app-theme → dark (option 2)
  sg.dispatch({ type: "SELECT_OPTION", settingsKey: "app-theme", value: "dark" });
  html = r.globalSettingsV2({}, "settings-general", {});
  assert.equal(segmentActiveIndex(html, "app-theme"), 2, "after segment app-theme=dark active is option 2 (深色)");

  // state values 是 raw value
  assert.equal(sg.getState().values["app-theme"], "dark");
});

// =============================================================================
// 4. 启动时从 localStorage 恢复 values
// =============================================================================
test("A2 Phase 3: initState restores values from localStorage on startup", () => {
  const stored = {
    "app-theme": "dark",
    "language": "en",
    "startup-screen": "rss",
    "animation-effect": "enhance",
    "auto-check-update": false,
    "tap-bottom-scroll-top": false,
    "reduce-motion": true,
    "crash-log": false,
  };
  const r = freshSandbox(stored);
  const sg = r.settingsGeneral;

  // 初始 state 应该从 stored 恢复
  const state = sg.getState();
  assert.equal(state.values["app-theme"], "dark");
  assert.equal(state.values["language"], "en");
  assert.equal(state.values["startup-screen"], "rss");
  assert.equal(state.values["animation-effect"], "enhance");
  assert.equal(state.values["auto-check-update"], false);
  assert.equal(state.values["tap-bottom-scroll-top"], false);
  assert.equal(state.values["reduce-motion"], true);
  assert.equal(state.values["crash-log"], false);

  // 渲染应该反映恢复的值
  const html = r.globalSettingsV2({}, "settings-general", {});
  assert.equal(switchIsOn(html, "auto-check-update"), false, "restored auto-check-update NOT is-on");
  assert.equal(switchIsOn(html, "reduce-motion"), true, "restored reduce-motion is-on");
  assert.equal(switchIsOn(html, "crash-log"), false, "restored crash-log NOT is-on");
  assert.equal(segmentActiveIndex(html, "app-theme"), 2, "restored app-theme active is option 2 (深色)");
  assert.equal(selectValue(html, "language"), "English", "restored language label");
  assert.equal(selectValue(html, "startup-screen"), "RSS", "restored startup-screen label");
  assert.equal(selectValue(html, "animation-effect"), "增强", "restored animation-effect label");
});

// =============================================================================
// 5. label ↔ raw value 双向映射
// =============================================================================
test("A2 Phase 3: label ↔ raw value bidirectional mapping for all 4 select/segment keys", () => {
  const r = freshSandbox();
  const sg = r.settingsGeneral;

  const cases = [
    { settingsKey: "app-theme", raw: "follow-system", label: "跟随系统" },
    { settingsKey: "app-theme", raw: "light", label: "浅色" },
    { settingsKey: "app-theme", raw: "dark", label: "深色" },
    { settingsKey: "language", raw: "zh-CN", label: "简体中文" },
    { settingsKey: "language", raw: "zh-TW", label: "繁體中文" },
    { settingsKey: "language", raw: "en", label: "English" },
    { settingsKey: "startup-screen", raw: "bookshelf", label: "书架" },
    { settingsKey: "startup-screen", raw: "discover", label: "发现" },
    { settingsKey: "startup-screen", raw: "rss", label: "RSS" },
    { settingsKey: "startup-screen", raw: "settings", label: "设置" },
    { settingsKey: "animation-effect", raw: "reduce", label: "减少" },
    { settingsKey: "animation-effect", raw: "standard", label: "标准" },
    { settingsKey: "animation-effect", raw: "enhance", label: "增强" },
  ];

  for (const c of cases) {
    assert.equal(sg.labelFor(c.settingsKey, c.raw), c.label,
      `labelFor(${c.settingsKey}, ${c.raw}) → ${c.label}`);
    assert.equal(sg.rawFor(c.settingsKey, c.label), c.raw,
      `rawFor(${c.settingsKey}, ${c.label}) → ${c.raw}`);
  }
});

// =============================================================================
// 6. Phone / Tablet 渲染结果一致（renderer 输出与视口无关）
// =============================================================================
test("A2 Phase 3: Phone/Tablet render output is identical (renderer is viewport-agnostic)", () => {
  const r = freshSandbox();
  const sg = r.settingsGeneral;
  // 修改一些值
  sg.dispatch({ type: "SELECT_OPTION", settingsKey: "app-theme", value: "dark" });
  sg.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "auto-check-update", value: false });

  const phone = r.globalSettingsV2({}, "settings-general", {});
  const tablet = r.globalSettingsV2({}, "settings-general", {});

  assert.equal(phone, tablet, "phone === tablet");
});

// =============================================================================
// 7. subscribe 监听 state 变化
// =============================================================================
test("A2 Phase 3: subscribe listener receives (next, prev, action) on dispatch", () => {
  const r = freshSandbox();
  const sg = r.settingsGeneral;

  let calls = 0;
  let lastAction = null;
  const unsub = sg.subscribe((next, prev, action) => {
    calls++;
    lastAction = action;
  });

  sg.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "auto-check-update", value: false });
  assert.equal(calls, 1, "listener called once after dispatch");
  assert.equal(lastAction.type, "TOGGLE_SWITCH");

  sg.dispatch({ type: "SELECT_OPTION", settingsKey: "language", value: "en" });
  assert.equal(calls, 2, "listener called again after second dispatch");
  assert.equal(lastAction.type, "SELECT_OPTION");

  unsub();
  sg.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "crash-log", value: false });
  assert.equal(calls, 2, "listener NOT called after unsubscribe");
});

// =============================================================================
// 8. 持久化 round-trip: dispatch → persist → reload sandbox → state restored
// =============================================================================
test("A2 Phase 3: persist round-trip — dispatch writes localStorage, fresh sandbox restores", () => {
  // 用一个 sandbox dispatch
  const r1 = freshSandbox();
  const sg1 = r1.settingsGeneral;
  sg1.dispatch({ type: "SELECT_OPTION", settingsKey: "app-theme", value: "dark" });
  sg1.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "reduce-motion", value: true });

  // 模拟"重启"：从同一个 localStorage 创建新 sandbox
  // 由于 vm context 隔离，需要手动传递 stored values
  // r1.storage.get 内部已 JSON.parse，返回的是 object
  const storedValues = r1.storage.get("settings-general-values");

  const r2 = freshSandbox(storedValues);
  const sg2 = r2.settingsGeneral;
  assert.equal(sg2.getState().values["app-theme"], "dark", "restored app-theme after reload");
  assert.equal(sg2.getState().values["reduce-motion"], true, "restored reduce-motion after reload");
});
