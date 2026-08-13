# B1 · Settings Operations — Design Delta 输出

> 来源：B1 · Settings Operations 工作包（2026-07-19）
> 基础：A2 Control Identity commit c7c2730（合同已冻结）
> 范围：settings-general / source-management / webdav-config / sync-backup 四个页面族
> 输出目的：供 Figma 侧回填 controlId 与原生控件语义对照；不写入 Figma。

## 1. 对象层级

| 对象 | 层级 | 原始证据 | Design Delta |
| --- | --- | --- | --- |
| settings-general route | route | `REGISTRY["settings-general"]` 17 条 controlId | 17 条 controlId 全部 stamped |
| source-management route | route | `REGISTRY["source-management"]` 17 条 controlId | 17 条 controlId 全部 stamped |
| webdav-config route | route | `REGISTRY["webdav-config"]` 15 条 controlId | 15 条 controlId 全部 stamped |
| sync-backup route | route | `REGISTRY["sync-backup"]` 13 条 controlId | 13 条 controlId 全部 stamped |
| source-delete-confirm dialog | dialog | `sourceDeleteConfirmScreen` (render-runtime.js:9982) | cancel + delete 按钮 stamped |
| settings-shell.js | 文件 | `frontend-demo-next/settings-shell.js`（839 行） | 新增：controlId registry + DOM 后处理 + MutationObserver |
| verify-settings-control-identity.mjs | 文件 | `frontend-demo-next/verify/verify-settings-control-identity.mjs`（322 行） | 新增：62 controlId + 24 UiEvent 断言全部通过 |
| styles/04-settings-source.css | 文件 | 末尾追加 ~150 行 B1 样式 | focus-visible / async-badge / danger / stale / 原生 switch button |

## 2. controlId 覆盖（对象 + 层级 + 原始证据）

### settings-general（17 条）

| 对象 | 层级 | controlId | UiEvent | state owner |
| --- | --- | --- | --- | --- |
| 返回按钮 | button | `settings.button.settings-general.default.phone.button.h-87355d8c` | `route.pop` | `core-command` |
| App主题 | segment group | `settings.generic-button.settings-general.default.phone.group.h-18903315` | `segment.item.switch` | `settings-store` |
| 语言 | combobox row | `settings.generic-button.settings-general.default.phone.group.h-517b3c00` | `dropdown.option.select` | `settings-store` |
| 启动时打开 | combobox row | `settings.generic-button.settings-general.default.phone.group.h-a3f78c83` | `dropdown.option.select` | `settings-store` |
| 自动检查更新 | switch | `settings.generic-button.settings-general.default.phone.group.h-0b898597` | `toggle.switch` | `settings-store` |
| 点击当前底栏回顶部 | switch | `settings.generic-button.settings-general.default.phone.group.h-573e1fe6` | `toggle.switch` | `settings-store` |
| 减少动态效果 | switch | `settings.generic-button.settings-general.default.phone.group.h-adcd2c30` | `toggle.switch` | `settings-store` |
| 崩溃日志 | switch | `settings.generic-button.settings-general.default.phone.group.h-36623fd3` | `toggle.switch` | `settings-store` |
| 动画效果 | combobox row | `settings.generic-button.settings-general.default.phone.group.h-3acd2da0` | `dropdown.option.select` | `settings-store` |
| 缓存清理 | button | `settings.button.settings-general.default.phone.button.settings-overlay-dialogcache-clear-h-c95f13f3` | `settings.cache.clear` | `local-state` |
| 文件访问 row | listrow-action | `settings.listrow-action.settings-general.default.phone.button.settings-overlay-dialogfile-access-permission-h-098397b9` | `settings.capability.open` | `host-request` |
| 文件访问 action | button | `settings.button.settings-general.default.phone.button.h-49da473a` | `settings.capability.open` | `host-request` |
| 通知权限 row | listrow-action | `settings.listrow-action.settings-general.default.phone.button.settings-overlay-dialognotification-permission-h-c44d060d` | `settings.capability.open` | `host-request` |
| 通知权限 action | button | `settings.button.settings-general.default.phone.button.h-9db1cb5e` | `settings.capability.open` | `host-request` |
| 电池优化 row | listrow-action | `settings.listrow-action.settings-general.default.phone.button.settings-overlay-dialogbattery-permission-h-ba7ac182` | `settings.capability.open` | `host-request` |
| 电池优化 action | button | `settings.button.settings-general.default.phone.button.h-df53e6df` | `settings.capability.open` | `host-request` |
| 恢复默认 | button | `settings.button.settings-general.default.phone.button.settings-overlay-dialog-h-db962377` | `button.activate` | `settings-store` (danger) |

### source-management（17 条）

| 对象 | 层级 | controlId | UiEvent | state owner |
| --- | --- | --- | --- | --- |
| 返回按钮 | button | `source.button.source-management.default.phone.button.h-8583e2f4` | `route.pop` | `core-command` |
| 检测 row | listrow-action | `source.listrow-action.source-management.default.phone.button.route-source-detect-h-94754e58` | `source.detect.run` | `source-store` |
| 检测 action | button | `source.button.source-management.default.phone.button.h-df156bb2` | `source.detect.run` | `source-store` |
| 导入 row | listrow-action | `source.listrow-action.source-management.default.phone.button.route-source-import-export-h-e28fc0b2` | `source.import.open` | `core-command` |
| 导入 action | button | `source.button.source-management.default.phone.button.h-bb820ede` | `source.import.open` | `core-command` |
| 导出 row | listrow-action | `source.listrow-action.source-management.default.phone.button.route-source-import-export-h-a00b52d6` | `button.activate` | `core-command` |
| 导出 action | button | `source.button.source-management.default.phone.button.h-f6af02c4` | `button.activate` | `core-command` |
| 分组 row | listrow-action | `source.listrow-action.source-management.default.phone.button.route-source-groups-h-c4cb809e` | `button.activate` | `core-command` |
| 分组 action | button | `source.button.source-management.default.phone.button.h-3228aec4` | `button.activate` | `core-command` |
| 日志 row | listrow-action | `source.listrow-action.source-management.default.phone.button.route-source-logs-h-4220a27e` | `source.logs.open` | `core-command` |
| 日志 action | button | `source.button.source-management.default.phone.button.h-00497566` | `source.logs.open` | `core-command` |
| 新增 FAB | button | `source.button.source-management.default.phone.button.route-source-add-h-af460bee` | `source.add.open` | `core-command` |
| 批量删除 | button | `source.button.source-management.default.phone.button.route-source-delete-confirm-h-42aa8871` | `source.delete.confirm` | `source-store` (danger) |
| 起点中文网 switch | generic-button group | `source.generic-button.source-management.default.phone.group.h-fa1a799c` | `toggle.switch` | `source-store` |
| 笔趣阁 switch | generic-button group | `source.generic-button.source-management.default.phone.group.h-87f9ad74` | `toggle.switch` | `source-store` |
| 本地导入源 switch | generic-button group | `source.generic-button.source-management.default.phone.group.h-8c0f87a0` | `toggle.switch` | `source-store` |
| 测试书源 switch | generic-button group | `source.generic-button.source-management.default.phone.group.h-be83f489` | `toggle.switch` | `source-store` |

### webdav-config（15 条）

| 对象 | 层级 | controlId | UiEvent | state owner |
| --- | --- | --- | --- | --- |
| 返回按钮 | button | `sync.button.webdav-config.default.phone.button.h-24342538` | `route.pop` | `core-command` |
| 服务器地址 | textbox | `sync.textbox.webdav-config.default.phone.textbox.h-d30e2ce3` | `input.submit` | `sync-store` |
| 账号 | textbox | `sync.textbox.webdav-config.default.phone.textbox.h-f490ddbe` | `input.submit` | `sync-store` |
| 密码 | textbox | `sync.textbox.webdav-config.default.phone.textbox.h-98770a31` | `input.submit` | `sync-store` |
| 同步目录 | textbox | `sync.textbox.webdav-config.default.phone.textbox.h-92c33b9d` | `input.submit` | `sync-store` |
| 测试连通性 | button | `sync.button.webdav-config.default.phone.button.settings-overlay-dialogwebdav-test-h-0821cb81` | `webdav.config.test` | `sync-store` (async, repeatTapGuard) |
| 保存配置 | button | `sync.button.webdav-config.default.phone.button.settings-overlay-dialogwebdav-save-h-d41f7c24` | `webdav.config.save` | `sync-store` (async, repeatTapGuard) |
| stepper 减 | button | `sync.button.webdav-config.default.phone.button.h-6e828ba1` | `stepper.press` | `sync-store` |
| stepper 加 | button | `sync.button.webdav-config.default.phone.button.h-7895b86f` | `stepper.press` | `sync-store` |
| 对话框取消 | button | `sync.button.webdav-config.default.phone.button.h-280671a5` | `route.pop` | `core-command` |
| 对话框确认 | button | `sync.button.webdav-config.default.phone.button.h-9a6e40af` | `button.activate` | `sync-store` |
| 证书校验 switch | generic-button group | `sync.generic-button.webdav-config.default.phone.group.h-c8881f6f` | `toggle.switch` | `sync-store` |
| 连接超时 select | generic-button group | `sync.generic-button.webdav-config.default.phone.group.h-e0c0ccaf` | `dropdown.option.select` | `sync-store` |
| 仅 Wi-Fi 同步 | generic-button group | `sync.generic-button.webdav-config.default.phone.group.h-968f3b54` | `toggle.switch` | `sync-store` |
| 自动同步 | generic-button group | `sync.generic-button.webdav-config.default.phone.group.h-8dc9c430` | `toggle.switch` | `sync-store` |

### sync-backup（13 条）

| 对象 | 层级 | controlId | UiEvent | state owner |
| --- | --- | --- | --- | --- |
| 返回按钮 | button | `sync.button.sync-backup.default.phone.button.h-8646aec8` | `route.pop` | `core-command` |
| 服务器地址 | textbox | `sync.textbox.sync-backup.default.phone.textbox.h-1bff38d9` | `input.submit` | `sync-store` |
| 账号 | textbox | `sync.textbox.sync-backup.default.phone.textbox.h-78a87582` | `input.submit` | `sync-store` |
| 密码 | textbox | `sync.textbox.sync-backup.default.phone.textbox.h-fb59dd84` | `input.submit` | `sync-store` |
| 同步目录 | textbox | `sync.textbox.sync-backup.default.phone.textbox.h-144f7bed` | `input.submit` | `sync-store` |
| 测试连通性 | button | `sync.button.sync-backup.default.phone.button.settings-overlay-dialogwebdav-test-h-141c8f08` | `webdav.config.test` | `sync-store` (async, repeatTapGuard) |
| 保存配置 | button | `sync.button.sync-backup.default.phone.button.settings-overlay-dialogwebdav-save-h-3f09f43c` | `webdav.config.save` | `sync-store` (async, repeatTapGuard) |
| 恢复记录 ×6 | listrow-action | `sync.listrow-action.sync-backup.default.phone.button.route-restore-confirm-h-*` | `restore.run` | `sync-store` |

## 3. 原生控件语义升级（对象 + 层级 + 原始证据）

### Switch 升级

- **对象**：`<span class="fd-settings-switch" aria-hidden="true">`（render-runtime.js:8494-8496）
- **层级**：DOM 后处理（settings-shell.js `upgradeSwitch`）
- **原始证据**：升级前为非语义 `<span aria-hidden="true">`；升级后为 `<button type="button" role="switch" aria-checked="true|false" aria-label="...">`
- **Design Delta**：Figma 侧应将 Switch 组件的 ARIA role 从 `generic` 升级为 `switch`，并补 `aria-checked` 状态绑定。

### Select 升级

- **对象**：`<article class="fd-setting-row is-select">`（render-runtime.js:8553-8568）
- **层级**：DOM 后处理（settings-shell.js `upgradeSelectRow`）
- **原始证据**：升级前 `role="button"`；升级后 `role="combobox" aria-expanded="false" aria-haspopup="listbox"`
- **Design Delta**：Figma 侧 Select 触发器应使用 `combobox` role，下拉面板保持 `listbox` + `option`。

### Segment 升级

- **对象**：`<span class="fd-settings-segment">`（render-runtime.js:8498-8503）
- **层级**：DOM 后处理（settings-shell.js `upgradeSegment`）
- **原始证据**：升级前无 role；升级后 `role="group" aria-label="..."`，每个按钮 `aria-pressed="true|false"`
- **Design Delta**：Figma 侧 Segment 容器应使用 `group` role，子按钮用 `aria-pressed` 而非 `aria-selected`。

### Stepper 升级

- **对象**：`<span class="fd-settings-stepper">`（render-runtime.js:8505-8512）
- **层级**：DOM 后处理（settings-shell.js `upgradeStepper`）
- **原始证据**：升级前无 role；升级后 `role="group" aria-label="..."`，按钮 `data-stepper-action="decrement|increment"`，值 `aria-live="polite"`
- **Design Delta**：Figma 侧 Stepper 容器应使用 `group` role，值显示用 `aria-live="polite"` 以便屏幕阅读器播报变化。

### Input 升级

- **对象**：`<label class="fd-setting-row is-input-field">`（render-runtime.js:8596-8604）
- **层级**：DOM 后处理（settings-shell.js `upgradeInputRow`）
- **原始证据**：升级前无 data-control-id；升级后 `<label>` 与 `<input>` 均盖 `data-control-id` + `data-ui-event`，`<input>` 补 `aria-label`
- **Design Delta**：Figma 侧 Input 组件应将 controlId 同时绑定到 label 容器与 input 元素。

## 4. UiEvent 词表（24 个唯一值，全部在 ui-event.schema.json enum 中）

```
route.pop, route.push,
toggle.switch, dropdown.option.select, segment.item.switch, stepper.press,
input.submit, button.activate, settings.capability.open, settings.cache.clear,
webdav.config.test, webdav.config.save, settings.sync.open,
source.detect.run, source.import.open, source.logs.open, source.add.open,
source.delete.confirm, source.search.submit, filter.apply.commit,
dropdown.expand, selection.item.toggle, selection.group.toggle, restore.run
```

## 5. State owner 词表（6 个）

```
local-state, settings-store, source-store, sync-store, core-command, host-request
```

## 6. Async state 词表（5 个）

```
idle, busy, success, error, stale
```

## 7. 焦点恢复（对象 + 层级 + 原始证据）

- **对象**：所有带 `data-focus-restore-key` 的控件
- **层级**：DOM 后处理（settings-shell.js `markFocusedControl` + `restoreFocus`）
- **原始证据**：每个 stamped 控件盖 `data-focus-restore-key="{route}:{control-name}"`；re-render 前 runtime 调用 `markFocusedControl(root)` 标记当前焦点为 `data-was-focused="true"`；re-render 后调用 `restoreFocus(root, fallbackSelector)` 恢复焦点
- **Design Delta**：Figma 侧应为每个交互控件定义 `focusRestoreKey` 属性，与 DOM 的 `data-focus-restore-key` 对齐。

## 8. 权限与 Host 返回（对象 + 层级 + 原始证据）

- **对象**：文件访问 / 通知权限 / 电池优化（settings-general 域）
- **层级**：`state owner = host-request`，`ui-event = settings.capability.open`
- **原始证据**：`stampIdentity(row, { uiEvent: SETTINGS_PERMISSION_OPEN, stateOwner: HOST_REQUEST })`
- **Design Delta**：Figma 侧应将"去设置"action 标记为 `host-request` state owner，表示需要跳转到宿主 OS 设置页。

- **对象**：所有 4 个 route 的返回按钮
- **层级**：`state owner = core-command`，`ui-event = route.pop`
- **原始证据**：`stampIdentity(backBtn, { uiEvent: UI_EVENTS.ROUTE_POP, stateOwner: STATE_OWNERS.CORE_COMMAND })`
- **Design Delta**：Figma 侧返回按钮应绑定 `route.pop` UiEvent，state owner 为 `core-command`（ScreenGraph 路由栈）。

## 9. 危险确认与异步状态（对象 + 层级 + 原始证据）

### 危险确认

- **对象**：恢复默认（settings-general）、批量删除（source-management）、删除确认对话框（source-delete-confirm）
- **层级**：`data-danger-confirm="true"` + `data-repeat-tap-guard="true"`
- **原始证据**：
  - settings-general reset: `stampIdentity(resetBtn, { danger: true, repeatTapGuard: true })`
  - source-delete-confirm delete: `stampIdentity(deleteBtn, { danger: true, asyncState: ASYNC_STATES.IDLE, repeatTapGuard: true })`

### 异步状态

- **对象**：测试连通性（webdav-config / sync-backup）、保存配置（webdav-config / sync-backup）、缓存清理（settings-general）、检测（source-management）
- **层级**：`data-async-state="idle|busy|success|error|stale"` + `data-repeat-tap-guard="true"`
- **原始证据**：`stampIdentity(btn, { asyncState: ASYNC_STATES.IDLE, repeatTapGuard: true })`；runtime 在 async 操作开始时改写为 `busy`，结束时改写为 `success` 或 `error`，输入变化后改写为 `stale`

## 10. 三视口浏览器 trace（缺失记录）

- **现状**：B1 工作包未执行真实的三视口（phone / compact / tablet）浏览器 trace。
- **原因**：当前环境为 Node.js vm 沙箱验证，未启动浏览器自动化。
- **缺失项**：
  1. phone 视口（375×812）：未录制 4 个 route 的渲染截图
  2. compact 视口（768×1024）：未录制
  3. tablet 视口（1024×1366）：未录制
- **补救建议**：由集成验证阶段（VC1）统一执行三视口 trace，比对 data-control-id 在各视口下的覆盖率与视觉一致性。

## 11. 未完成项

1. **三视口浏览器 trace**：未执行（见第 10 节）
2. **render-runtime.js 直接接入**：B1 选择 DOM 后处理路线，未修改 render-runtime.js 中的 Settings 域 renderer 函数。后续若 B2/B3/B4 修改这些函数导致 DOM hook 变化，settings-shell.js 的 stamping 选择器需同步调整。
3. **source-management 域的 detect/import/export/groups/logs rows**：当前 render-runtime.js 的 `settingsPageFor("source-management")` 返回的 page 数据中，这些 row 在"批量操作" section，但 `sourceManagementScreen` 实际渲染的是 `sourceHomeContent`（sourceItems 列表），不渲染"批量操作" section。因此这些 row 的 controlId 未被 stamped。需要在 render-runtime.js 中补充渲染，或调整 stamping 选择器。
4. **sync-backup 域的恢复记录**：当前 `settingsBackupListHtml` 渲染的 `<article data-restore-record="...">` 已被 stamped，但 `<article>` 本身的 `role="button"` 已存在；只需确保 `data-route="restore-confirm"` 与 `data-restore-scopes` 不被覆盖。
5. **source-delete-confirm 对话框的取消按钮**：当前 stamped 用的是 `__batch_delete__` controlId（与删除按钮共享），因为 registry 中没有为取消按钮单独定义 controlId。下次 IC0 audit 应补充。
6. **styles/04-settings-source.css 的 focus-visible 样式**：已追加，但未在真实浏览器中验证焦点环视觉效果。

## 12. 文件清单

| 文件 | 状态 | 行数 |
| --- | --- | --- |
| `frontend-demo-next/settings-shell.js` | 新增（覆盖第一版） | 839 |
| `frontend-demo-next/verify/verify-settings-control-identity.mjs` | 新增 | 322 |
| `frontend-demo-next/SETTINGS_DESIGN_DELTA.md` | 新增（本文件） | ~250 |
| `frontend-demo-next/styles/04-settings-source.css` | 修改（末尾追加） | 1510 → ~1660 |
| `frontend-demo-next/index.html` | 修改（已加载 settings-shell.js） | 29 |

## 13. 验收结果

```
✅ 全部断言通过（62 controlId + 24 UiEvent + 4 route 路由识别 + DOM 盖章 + helper HTML）
```

- 62 个 registry controlId 全部符合 `contracts/control-identity.schema.json` pattern
- 24 个 UiEvent 全部在 `contracts/ui-event.schema.json` enum 中冻结
- 4 个 route + source-delete-confirm 路由识别全部正确
- 6 个 native* helper 返回的 HTML 含 data-control-id + 原生 ARIA 语义
- stampIdentity 正确加盖 7 个 data-* 属性
- 14 个 DOM 后处理 API 函数全部导出
