// WebDAV Config · live Figma ActionDialog parity
// -----------------------------------------------------------------------------
// Source: file klhs2jMM4MncaJFqZMfqEK
// Canonical/WebDAV/ActionDialog 2222:159 (12 variants, 304×160)
//
// These checks deliberately cover the rendered local variants and the narrow
// runtime bridge separately. The state reducer already owns business flow;
// this file prevents a later renderer/runtime edit from falling back to the
// generic settings overlay or drifting from the current Figma dialog copy.

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
const rendererSource = readFileSync(join(demoRoot, "renderers/d2-settings-sync-renderers.js"), "utf8");
const runtimeSource = readFileSync(join(demoRoot, "render-runtime.js"), "utf8");
const dialogCss = readFileSync(join(demoRoot, "styles/04-settings-source.css"), "utf8");

function freshRenderer() {
  const window = {
    localStorage: {
      _store: {},
      getItem(key) { return this._store[key] || null; },
      setItem(key, value) { this._store[key] = value; },
      removeItem(key) { delete this._store[key]; },
    },
    ReaderFrontendDemoDraftRouteContract: {
      routes: { "webdav-config": { title: "WebDAV 配置" } },
      routePresentation: {},
    },
  };
  const context = vm.createContext({ window, module: { exports: {} }, Promise, setTimeout });
  new vm.Script(kitSource, { filename: "kit.js" }).runInContext(context);
  new vm.Script(appearanceSpecSource, { filename: "appearance-spec.js" }).runInContext(context);
  new vm.Script(declarationsSource, { filename: "control-identity-declarations.js" }).runInContext(context);
  new vm.Script(rendererSource, { filename: "d2-settings-sync-renderers.js" }).runInContext(context);
  return context.window.ReaderD2SettingsSyncRenderers.webdavConfig;
}

function renderVariant(flow, state) {
  const owner = freshRenderer();
  const actionPrefix = flow.toUpperCase();
  owner.dispatch({ type: actionPrefix + "_CONFIRM_OPEN" });
  if (state !== "confirm") owner.dispatch({ type: actionPrefix + "_START" });
  if (state === "success") owner.dispatch({ type: actionPrefix + "_SUCCESS" });
  if (state === "failed") owner.dispatch({ type: actionPrefix + "_FAILED", error: "ignore local fallback text" });
  return owner.renderWebdavConfig({}, "webdav-config", {});
}

const figmaVariants = [
  ["test", "confirm", "测试网络连通性？", "将使用当前服务器地址和账号发起一次连接验证。", "取消", "开始测试"],
  ["test", "loading", "正在测试连接", "正在验证服务器和账号，请稍候。", "取消", "处理中…"],
  ["test", "success", "连接测试成功", "服务器可访问，当前账号具备同步权限。", "关闭", "完成"],
  ["test", "failed", "连接测试失败", "请检查网络、地址、账号或证书设置。", "取消", "重试"],
  ["save", "confirm", "保存 WebDAV 配置？", "保存后将使用当前设置进行同步。", "取消", "确认保存"],
  ["save", "loading", "正在保存配置", "正在安全保存 WebDAV 连接信息。", "取消", "处理中…"],
  ["save", "success", "配置已保存", "新的 WebDAV 配置已经生效。", "关闭", "完成"],
  ["save", "failed", "保存失败", "配置未保存，请检查输入后重试。", "取消", "重试"],
  ["clear", "confirm", "清除 WebDAV 配置？", "清除后需要重新输入服务器和账号信息。", "取消", "确认清除"],
  ["clear", "loading", "正在清除配置", "正在移除本机保存的 WebDAV 配置。", "取消", "处理中…"],
  ["clear", "success", "配置已清除", "本机 WebDAV 配置已安全移除。", "关闭", "完成"],
  ["clear", "failed", "清除失败", "配置仍保留，请稍后重试。", "取消", "重试"],
];

test("all 12 local WebDAV dialog states match live Figma copy and controls", () => {
  for (const [flow, state, title, copy, firstAction, secondAction] of figmaVariants) {
    const html = renderVariant(flow, state);
    assert.match(html, /fd-webdav-action-dialog/, flow + "/" + state + " uses canonical class");
    assert.match(html, new RegExp('data-webdav-dialog-flow="' + flow + '"'), flow + " marks canonical flow");
    assert.match(html, new RegExp('data-webdav-dialog-state="' + state + '"'), flow + "/" + state + " marks visible state");
    assert.ok(html.includes(title), flow + "/" + state + " title");
    assert.ok(html.includes(copy), flow + "/" + state + " copy");
    assert.ok(html.includes(">" + firstAction + "</button>"), flow + "/" + state + " first action");
    assert.ok(html.includes(">" + secondAction + "</button>"), flow + "/" + state + " second action");
    if (state === "loading") {
      assert.match(html, /disabled aria-disabled="true"/, flow + " loading keeps cancel visibly present but reducer-guarded");
      assert.match(html, /disabled aria-busy="true">处理中…/, flow + " loading primary is busy");
    }
  }
});

test("WebDAV default overview grid matches the live configured Figma master", () => {
  const html = freshRenderer().renderWebdavConfig({}, "webdav-config", {});
  const overview = html.match(/<section class="fd-settings-metric-grid"[\s\S]*?<\/section>/)?.[0] || "";
  [
    ["连接状态", "已连接"],
    ["最近测试", "10:30"],
    ["远程备份", "8 个"],
    ["同步目录", "/ReaderBackup"],
  ].forEach(([label, value]) => {
    assert.ok(overview.includes(label), "overview includes Figma label " + label);
    assert.ok(overview.includes(value), "overview includes Figma value " + value);
  });
  assert.doesNotMatch(overview, /连接超时|Wi-Fi 限制/, "source overview does not duplicate Advanced-only controls");
});

test("WebDAV actions use the private owner bridge, never the legacy overlay", () => {
  const idleHtml = freshRenderer().renderWebdavConfig({}, "webdav-config", {});
  assert.match(idleHtml, /data-webdav-config-action="open-test"/);
  assert.match(idleHtml, /data-webdav-config-action="open-save"/);
  assert.doesNotMatch(idleHtml, /data-settings-overlay="dialog:webdav-(test|save)"/);

  [
    'const isWebdavConfigRoute',
    'data-webdav-config-action',
    'INPUT_VALIDATE',
    'TEST_CONFIRM_OPEN',
    'SAVE_CONFIRM_OPEN',
    'STEP_TIMEOUT',
    'TOGGLE_SWITCH',
    'SET_INPUT',
    'executeTest',
    'executeSave',
    'webdavVisibleLoadingDelayMs',
    'delay: webdavVisibleLoadingDelayMs',
  ].forEach((needle) => {
    assert.ok(runtimeSource.includes(needle), "runtime bridge includes " + needle);
  });
});

test("WebDAV dialog surface retains live Figma 304×160 shadowless geometry", () => {
  assert.match(dialogCss, /fd-webdav-action-dialog/);
  assert.match(dialogCss, /width:\s*304px/);
  assert.match(dialogCss, /height:\s*160px/);
  assert.match(dialogCss, /left:\s*calc\(50% - 152px\)/);
  assert.match(dialogCss, /grid-template-rows:\s*24px 40px 38px/);
  assert.match(dialogCss, /border-radius:\s*8px/);
  assert.match(dialogCss, /box-shadow:\s*none/);
  assert.match(dialogCss, /grid-template-columns:\s*128px 128px/);
});
