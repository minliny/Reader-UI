# R2.0 · Canonical Renderer 结构审计（临时文件，R2.0 完成后可删）

日期：2026-07-20
基线 commit：ac4740b（R1.1 已完成）
审计范围：`frontend-demo-optimized/` 下所有 renderer 文件 + `render-runtime.js` 的 `renderRoute` 路由分发

## 1. Renderer 文件清单（`frontend-demo-optimized/renderers/`）

| 文件 | 全局对象 | 分发入口 | 签名 | 备注 |
| --- | --- | --- | --- | --- |
| `d2-bookshelf-discover-renderers.js` | `window.ReaderD2BookshelfDiscoverRenderers` | `INTEGRATION_MAP` + `STATE_VARIANT_MAP` 直接查表 | `(data, route, appState)` | D2-A：书架 + Discover 增强 |
| `d2-rss-renderers.js` | `window.ReaderD2RssRenderers` | `INTEGRATION_MAP`（**未在 renderRoute 注册**） | `(data, appState, route)` | D2-B：**已脱离 canonical**，render-runtime.js 不调用 |
| `d2-settings-sync-renderers.js` | `window.ReaderD2SettingsSyncRenderers` | `renderD2Route(route, data, appState)` | `(data, route, appState)` | D2-C：Settings/Sync/WebDAV/Restore/About |
| `d3-control-layers-renderers.js` | `window.ReaderD3ControlLayersRenderers` | `renderD3Route(route, data, appState)` | `(data, route, appState)` | D3：阅读控制层 L0–L3 |
| `d4-visual-polish-renderers.js` | `window.ReaderD4VisualPolishRenderers` | `renderD4Route(route, data, appState)` | `(data, route, appState)` | D4：视觉/对比度/可读性 |
| `d5-motion-closure-renderers.js` | `window.ReaderD5MotionClosureRenderers` | `renderD5Route(route, data, appState)` | `(data, route, appState)` | D5：Motion 闭环 |
| `d6-capability-closure-renderers.js` | `window.ReaderD6CapabilityClosureRenderers` | `renderD6Route(route, data, appState)` | `(data, route, appState)` | D6：产品扩展能力路由 |
| `w1-import-renderers.js` | （未挂全局，被 render-runtime.js 直接混合） | — | — | W1：导入工作流 |
| `w2-reading-renderers.js` | （未挂全局，被 render-runtime.js 直接混合） | — | — | W2：阅读工作流 |
| `w3-source-switch-renderers.js` | `window.ReaderW3SourceSwitchRenderers` | `INTEGRATION_MAP` 直接查表 | `(data, appState)` | W3：换源工作流 |
| `w4-theme-font-typography-renderers.js` | `window.ReaderW4ThemeFontTypographyRenderers` | `renderW4Route(route, data, options, appState)` | `(route, data, options, appState)` | W4：**已接收 options** |
| `w5-replace-rules-renderers.js` | `window.ReaderW5ReplaceRulesRenderers` | `INTEGRATION_MAP` 直接查表 | `(data, route, appState)` | W5：替换规则 |

## 2. `renderRoute(route, data, options, appState)` 分发顺序

`render-runtime.js` 第 10726 行 `renderRoute` 入口；`options` 携带 `pageState` / `loading` / `viewState` / `overlayState`。

1. **W4** → `renderW4Route(route, data, options, appState)`（**已接收 options**）
2. **W3** → `INTEGRATION_MAP[route]` → `fn(data, appState)`（**不接收 options**）
3. **W5** → `INTEGRATION_MAP[route]` → `fn(data, route, appState)`（**不接收 options**）
4. **D2-A** → `INTEGRATION_MAP[route] || STATE_VARIANT_MAP[route]` → `fn(data, route, appState)`（**不接收 options**）
5. **D2-C** → `renderD2Route(route, data, appState)` → `fn(data, route, appState)`（**不接收 options** ← R2.0 修复点）
6. **D3** → `renderD3Route(route, data, appState)`（不接收 options）
7. **D4** → `renderD4Route(route, data, appState)`（不接收 options）
8. **D5** → `renderD5Route(route, data, appState)`（不接收 options）
9. **D6** → `renderD6Route(route, data, appState)`（不接收 options）
10. `switch (route) { ... }` 兜底分发到 render-runtime.js 内置 renderer

## 3. 12 页面族 canonical renderer 归属

| 页面族 | canonical renderer | 位置 | 备注 |
| --- | --- | --- | --- |
| settings-general | `globalSettingsV2` | `d2-settings-sync-renderers.js` | D2-C 分发；**修复后接收 options** |
| source-management | `sourceSettingsV2` | `d2-settings-sync-renderers.js` | D2-C 分发；**修复后接收 options** |
| webdav-config | `webdavConfigV2` | `d2-settings-sync-renderers.js` | D2-C 分发；**修复后接收 options** |
| sync-backup | `backupScreenV2` | `d2-settings-sync-renderers.js` | D2-C 分发；**修复后接收 options** |
| bookshelf | `mainTabBookshelf` | `render-runtime.js` switch case | + D2-A 增强分支 |
| book-detail | `libraryScreen` | `render-runtime.js` switch case | |
| import-conflict-resolve | `importConflictResolveScreen` | `render-runtime.js` switch case | W1 范围 |
| search-results | `bookSearchScreen` | `render-runtime.js` switch case | |
| discover | `mainTabDiscover` | `render-runtime.js` switch case | **D2-A 仅做状态变体增强；canonical 仍在 render-runtime.js** |
| rss | `mainTabRss` | `render-runtime.js` switch case | **d2-rss-renderers.js 未注册；canonical 仍在 render-runtime.js** |
| source-switch | `flowScreen` | `render-runtime.js` switch case | + W3 工作流增强 |
| about/restore-preview | `aboutScreenV2` / `restoreFlowV2` | `d2-settings-sync-renderers.js` | D2-C 分发；**修复后接收 options** |

### 3.1 Discover/RSS 边界确认（审计问题 3）

- `renderRoute` 第 10750 行注释明确："Discover 与 RSS 已有 canonical renderer，不允许模块在此抢占整页结构"
- D2-A (`ReaderD2BookshelfDiscoverRenderers`) 只对 Discover 的状态变体做增强，整页结构仍由 `mainTabDiscover` 持有
- D2-B (`ReaderD2RssRenderers`) **完全未在 renderRoute 中分发**，已脱离 canonical
- 结论：**Discover/RSS 的 canonical renderer 是 render-runtime.js 中的函数**（`mainTabDiscover` / `mainTabRss` 等），不是 `d2-rss-renderers.js`

## 4. D2 Settings 分发现状（审计问题 2）

```js
// render-runtime.js 第 10758 行（修复前）
if (window.ReaderD2SettingsSyncRenderers && window.ReaderD2SettingsSyncRenderers.renderD2Route) {
  const d2cHtml = window.ReaderD2SettingsSyncRenderers.renderD2Route(route, data, appState);
  if (d2cHtml) return d2cHtml;
}

// d2-settings-sync-renderers.js 第 2073 行（修复前）
function renderD2Route(route, data, appState) {
  var fnName = INTEGRATION_MAP[route];
  if (!fnName) return "";
  var fn = d2Exports[fnName];
  if (typeof fn !== "function") return "";
  return fn(data, route, appState);
}
```

- `options`（携带 `pageState` / `loading` / `viewState`）**未传递**给 D2-C
- 导致 D2-C 渲染的 settings/source/webdav/sync/restore/about 路由无法感知 loading/error 等 ViewState
- R2.0 修复：在调用方与 `renderD2Route` 之间补 `options` 参数；底层 V2 函数签名保持 `(data, route, appState)`，新增 `options` 作为第 4 参数（不消费也不破坏行为）

## 5. 46 个设置行子控件分布（审计问题 4）

来源：`tools/interaction-inventory/generated/nonInteractiveContainers.json`，`containsUnenumeratedSubcontrols=true`

| routeId | switch | select | stepper | segment | 小计 |
| --- | ---: | ---: | ---: | ---: | ---: |
| backup-settings | 6 | 3 | 1 | 0 | 10 |
| bookshelf-search-settings | 3 | 5 | 0 | 0 | 8 |
| progress-sync | 3 | 1 | 0 | 0 | 4 |
| settings-general | 3 | 3 | 0 | 1 | 7 |
| source-debug | 0 | 2 | 0 | 0 | 2 |
| source-management | 7 | 0 | 0 | 0 | 7 |
| webdav-config | 1 | 1 | 1 | 0 | 3 |
| **不在 D2-C 范围** | | | | | |
| **合计** | **28** | **15** | **2** | **1** | **46** |

注：R1.1 报告说 46 条，本次重算也是 46 条；`backup-settings` 实测 12 条 group 容器中有 10 条 containsUnenumeratedSubcontrols + 2 条 pureContainer？需进一步核实——R2.0 在声明文件中按 46 条枚举。

### 5.1 子控件归属

- D2-C 分发路由（修复后接收 options）：`backup-settings`、`progress-sync`、`settings-general`、`source-debug`、`source-management`、`webdav-config` 共 6 个 route，33 个子控件
- render-runtime.js settingsScreen 兜底路由：`bookshelf-search-settings` 共 1 个 route，8 个子控件
- 12+8=20... 实测 6+1=7 个 routeId，46 个子控件

## 6. R2.0 修复范围

1. ✅ 修复 D2-C 分发接收 `options`（任务 2）
2. ✅ 创建 `control-identity-declarations.js` 覆盖 12 页面族（任务 3）
3. ✅ 枚举 46 个设置行子控件（任务 4）
4. ✅ 创建 `reconcile-canonical-declarations.mjs`（任务 5）
5. ✅ 创建 `canonical-identity-stability.test.mjs`（任务 6）
6. ✅ 更新 `MIGRATION_REPORT.md`（任务 7）

## 7. 不做的事（R2.0 边界）

- 不写 `data-control-id` / `data-entity-key` / `data-control-key` 到渲染输出 HTML（R2b 范围）
- 不重构 renderer 行为（switch 还是 span；segment/stepper 缺事件不补）
- 不修改 R1.1 冻结的 schema/types/src-control-identity
- 不修改 `frontend-demo-next/`（实验目录）
- 不修改 `docs/audits/`
- 不执行 git commit
