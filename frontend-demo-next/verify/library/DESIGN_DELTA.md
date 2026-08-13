# B2 · Library & Search — Design Delta

**生成时间**: 2026-07-19  
**基线 commit**: c7c2730 (A2 Control Identity Foundation)  
**B2 工作包**: Library & Search (bookshelf / book-detail / import-conflict-resolve / search-results)

> "Design Delta" = B2 修复前后 Library 域在控件身份 / 事件身份 / 交互状态 / 焦点恢复 / 视口适配 5 个维度的差异，以及由此产生的可访问性 / 测试覆盖 / 设计意图的明示化收益。

---

## Δ1 · 控件身份（Control Identity）

### 修复前

- Library 域 4 个页面族的控件**无稳定 controlId**：DOM 仅有 `data-route` / `data-bookshelf-view-button` / `data-search-submit` 等业务标记
- A2 registry 中 3,815 个候选里：bookshelf=40 / book-detail=30 (default+loading) / import-conflict-resolve=6 / search-results=11 都还停留在 mappingStatus（auto-mapped / ambiguous-needs-review），未与 DOM 关联
- 测试时无法用 `querySelectorForControlId()` 精确定位控件，回归测试依赖脆弱的 CSS 选择器

### 修复后

- 新增 `frontend-demo-next/library-shell.js`（123 行），固化 `LIBRARY_CONTROL_IDS` 查找表：51 个 canonical controlId 全部符合 A2 schema pattern
- `render-runtime.js` 中：
  - `mainTabBookshelf` / `bookshelfMoreLayer` / `bookshelfSectionHeader` / `bookCard`：18 个控件接入 `data-control-id`
  - `libraryScreen` (book-detail)：22 个控件接入（default + loading 两套，按 `bookDetailState` 切换）
  - `bookSearchScreen` (search-results)：8 个关键控件接入 + 8 个 `data-control-id-family` 命名空间
  - `importConflictResolveScreen`：5 个控件接入（back / keep-local / overwrite / keep-both / rollback）
- `verify/library/verify-library-control-identity.mjs`：24 个断言全过，证明 44 个关键 controlId 可解析、index.html 正确挂载 library-shell.js、4 个函数体内出现 data-control-id 注入

### Δ 关键差异

| 维度          | 修复前                            | 修复后                                                |
| ------------- | --------------------------------- | ----------------------------------------------------- |
| controlId 数  | 0                                 | 51 个（覆盖 4 页面族全部 phone 视图关键控件）         |
| book-detail   | 单一 default                      | default + loading 双套（state atom 切换，视觉等同身份不同）|
| search 框架   | 仅业务标记                        | search-scope / search-sort / search-history / search-suggest / search-hot / search-retry-source / search-result-row / close-keyboard 8 个族 |
| import 域     | "import.button..." 但 DOM 未接入  | 5 个 canonical ID 全部落到 DOM                        |

---

## Δ2 · 事件身份（UiEvent）

### 修复前

- 搜索按钮、加入书架、Sheet 打开/关闭、Dialog 确认/取消等控件**无 `data-ui-event`**
- A2 IC0 阶段提取的 1,479 个 ambiguous-needs-review 候选中，Library 域大量控件 UiEvent 未落回 DOM

### 修复后

- 全部 4 个页面族的关键操作按钮接入 `data-ui-event`：
  - bookshelf: `route.push` / `dropdown.menu.expand` / `dropdown.menu.collapse` / `bookshelf.view.switch` / `dropdown.trigger.press` / `tab.select`
  - book-detail: `route.back` / `route.push` / `sheet.open` / `sheet.close` / `dialog.open` / `dialog.cancel` / `dialog.confirm`
  - search-results: `open.keyboard` / `search.submit` / `search.reset` / `search.retry` / `route.back` / `route.push` / `add.shelf` / `dialog.open` / `dialog.close` / `search.clear-history`
  - import-conflict-resolve: `route.back` / `import.conflict.decision` / `import.rollback` / `import.apply`

### Δ 关键差异

- 新增 17 种 UiEvent 在 Library 域 DOM 上明示化
- `verify/library/verify-library-events.mjs`：32 个断言全过，证明 4 个函数体内出现对应 data-ui-event 注入

---

## Δ3 · 交互状态机（State Machine）

### 修复前

- search-results 的 loading / empty / error 三态仅 `data-search-state` 单一标记
- book-detail 的 TOC 状态（loading / error / offline / ready）无 DOM 标记
- Sheet / Dialog 无 `data-sheet-state` / `data-dialog-state` 状态机
- 重复提交无防护，用户连续点击会触发多次路由跳转或多次加入书架请求
- 旧搜索结果可能覆盖新搜索结果（race condition）

### 修复后

#### search-results 状态机（5 态完整）

| 状态        | data-search-state | data-loading-state | data-empty-state | data-error-state | data-stale-result |
| ----------- | ----------------- | ------------------ | ---------------- | ---------------- | ----------------- |
| before      | before            | -                  | -                | -                | -                 |
| loading     | loading           | loading            | -                | -                | `${isStale}`      |
| empty       | empty             | -                  | empty            | -                | `${isStale}`      |
| error       | error             | -                  | -                | partial          | `${isStale}`       |
| after       | after             | -                  | -                | -                | `${isStale}`      |

- `data-stale-result` 基于 `searchReqToken !== latestReqToken` 判定，覆盖 loading / empty / error / after 四态
- 加入书架按钮 4 态：idle → loading → added | failed，分别接入 `data-final-state` + `data-repeat-tap-guard`

#### book-detail 状态机

- `bookDetailState = tocState === "loading" ? "loading" : "default"` pageState atom，视觉等同但 controlId 不同（22 个控件 × 2 套 = 44 个身份）
- TOC 子状态：`data-toc-state="loading|error|offline|ready"` + `data-loading-state` / `data-error-state` / `data-empty-state`
- Sheet 状态机：`data-sheet-state="closed|open"` + `data-sheet-role="source-switch"` + `data-sheet-open-trigger`
- Dialog 状态机：`data-dialog-state="closed|open"` + `data-dialog-role="remove"` + `data-dialog-open-trigger="open-remove-dialog"` + `data-dialog-action="cancel|confirm-remove"`
- 重复提交：continueReading / openRemoveDialog / sourceOption / confirmRemove 均接入 `data-repeat-tap-guard`

#### import-conflict-resolve 状态机（新增）

```
+---------------+       rollback       +---------------+
|  undecided    | --------------------> |  pending      |
+---------------+                       +---------------+
        |                                       |
        | decision (overwrite/skip/keep-both)   | completed/failed
        v                                       v
+---------------+                       +---------------+
|  decided      |                       |  completed    |
+---------------+                       |  or failed    |
        |                               +---------------+
        | apply                                         
        v                                                
+---------------+                       
|  applying     | -----> applied / failed
+---------------+       
```

- 3 个状态机字段：`data-conflict-state` / `data-rollback-state` / `data-apply-state`
- 4 个决策按钮 + 2 个 bottom action 全部接入 `data-repeat-tap-guard`
- `disabled` 在 rollbackState="pending" / applyState="applying" 时生效（防双击）

### Δ 关键差异

| 维度              | 修复前              | 修复后                                                          |
| ----------------- | ------------------- | --------------------------------------------------------------- |
| 状态机字段种类    | 1 (data-search-state) | 11+ (search-state / loading-state / empty-state / error-state / stale-result / sheet-state / dialog-state / keyboard-state / conflict-state / rollback-state / apply-state) |
| final-state 取值  | 0                   | 8 种（added / cancelled / cleared / confirm-remove / failed / filled / idle / loading） |
| repeat-tap-guard  | 0                   | 7 种（search-submit / search-reset / search-retry / add-shelf / rollback / apply / confirm-clear） |
| Sheet/Dialog 状态机 | 无                 | 完整 (closed/open) + role + open-trigger                        |

- `verify/library/verify-library-states.mjs`：47 个断言全过

---

## Δ4 · 焦点恢复（Focus Restore）

### 修复前

- 所有按钮无 `data-focus-restore` / `data-focus-restore-source` 标记
- Sheet / Dialog 关闭后焦点跳到 body 顶部，键盘用户每次需要重新 Tab 定位
- bookshelf 视图切换（cover ↔ list）后焦点丢失

### 修复后

- 全部 4 个页面族接入 `data-focus-restore-source`：
  - bookshelf: `bookshelf-more-trigger` / `bookshelf-more-close` / `bookshelf-view-cover` / `bookshelf-view-list` / `bookshelf-filter` / `bookshelf-settings` / `bookshelf-search` / `nav-bookshelf` / `nav-discover` / `nav-rss` / `nav-settings` / `bookshelf-entry` (book-detail 返回时恢复)
  - book-detail: `bookshelf-entry` (返回按钮恢复源) / `remove-dialog-trigger` / `source-sheet-trigger`
  - search-results: `search-back` / `search-input` / `search-scope` / `search-sort` / `search-history` / `search-suggest` / `search-hot` / `search-retry` / `search-result` / `search-recent` / `search-clear-history`
  - import-conflict-resolve: `import-conflict-back` / `conflict-overwrite` / `conflict-skip` / `conflict-keep-both`
- 新增 `frontend-demo-next/library-shell.css` (162 行)：
  - `[data-control-id]:focus-visible` 强制显示焦点环（键盘可见，鼠标隐藏）
  - `[data-focus-restore-source]:focus` 用绿色 outline 区分恢复焦点
  - `@media (hover: none) and (pointer: coarse)` 触摸设备隐藏焦点环
  - `@media (prefers-reduced-motion)` 禁用 loading shimmer 动画
  - `@media (forced-colors: active)` Windows 高对比度模式焦点环调整

### Δ 关键差异

- 焦点恢复源标记从 0 增长到 25+ 个（覆盖 4 个页面族全部可交互控件）
- 新增可访问性 CSS：focus-visible / 触摸设备 / 高对比度 / reduce-motion 4 个 media query

---

## Δ5 · 视口适配（Viewport Adaptation）

### 修复前

- 仅 Phone 视口在 A2 registry 中有映射
- Compact / Tablet 视口下 DOM 完全无 controlId 身份
- 没有降级策略，A1 扩展 registry 时需要同时改 render-runtime.js

### 修复后

- B2 实现显式降级：`cid ? \` data-control-id="${cid}"\` : ""` 在 compact/tablet 下静默省略 `data-control-id`，但**保留** `data-control-id-family`（族级标记）+ 全部 `data-ui-event` + 全部状态机标记
- A1 扩展路径已就绪：只需在 `library-shell.js` 的 `LIBRARY_CONTROL_IDS` 追加 compact / tablet 条目，无需改 render-runtime.js
- 见 `VIEWPORT_TRACE.md` 三视口详细 trace

### Δ 关键差异

- 引入"视口降级"设计模式：身份降级但语义保留
- A1 扩展的解锁路径从"改 4 个函数"降为"改 1 个查找表"

---

## Δ6 · 测试覆盖（Test Coverage）

### 修复前

- 无 Library 域专用 verify 测试
- B2 修复无回归保护

### 修复后

新增 3 个测试套件（`frontend-demo-next/verify/library/`）：

| 测试文件                                | 断言数 | 通过 | 覆盖维度                                       |
| --------------------------------------- | ------ | ---- | ---------------------------------------------- |
| verify-library-control-identity.mjs     | 24     | 24   | LIBRARY_CONTROL_IDS 冻结性 / schema pattern / 关键 ID 解析 / index.html 挂载 / 函数注入痕迹 / helper 函数行为 |
| verify-library-events.mjs               | 32     | 32   | 4 函数 data-ui-event 注入 / 17 种 UiEvent / 8 个 control-id-family / 8 种 final-state / focus-restore-source |
| verify-library-states.mjs               | 47     | 47   | loading/empty/error 三态 / Sheet/Dialog/Keyboard 状态机 / repeat-tap-guard / stale-result / cover-list 切换终态 / book-detail pageState atom / import-conflict-resolve 三态机 |
| **合计**                                | **103** | **103** |                                                |

- 现有测试无回归：
  - `verify-p0-chain-matrix.mjs`: 120/120 通过
  - `verify-demo-contract-consistency.mjs`: 0 unapproved

---

## Δ7 · 不在 B2 修复范围内的事项

按任务约束，以下事项 B2 **未触碰**：

1. **Settings / Discover / RSS / Source Switch / Reader 域代码**：未修改（B1/B3/B4 各自负责）
2. **Figma 资源**：未修改
3. **docs/audits/**：未修改
4. **tools/interaction-inventory/**：未修改（A2 基础设施由 A2 维护）
5. **src/control-identity/**：未修改（A2 基础设施由 A2 维护）
6. **git commit**：未执行（任务明确禁止）
7. **render-runtime.js 冲突重试**：本次 patch 全部一次成功，未遇到冲突

---

## Δ8 · 未完成项 / 后续 follow-up

1. **Compact / Tablet 视口的精确 controlId**：当前降级为 null，等 A1 扩展 registry 后可解锁。B2 已准备好消费路径（library-shell.js 查找表）。
2. **运行时 render-runtime.js 实际渲染验证**：本次仅做静态分析 + node --check 语法验证；未在浏览器中实际渲染验证 DOM 结构。建议 B5 或 A1 提供浏览器渲染基线后再做端到端校验。
3. **search-results 的 `data-search-phase` 标记**：当前仅用于 searchBoxHtml 的 `data-search-phase`，未来可考虑扩展为 pageState atom（与 book-detail 的 pageState 一致）。
4. **import-conflict-resolve 的回滚确认 Dialog**：当前 rollback 直接走 route-back，未走 Dialog 确认；若产品决策要求"回滚前需确认"，需要追加 data-dialog-state 状态机。B2 当前实现保留了 `data-rollback-trigger="true"` 标记，便于后续接入。
5. **book-detail 的 sourceSheet stale-result 集成测试**：当前 sourceOption 接入了 `data-stale-result`，但未在 verify-library-states.mjs 单独断言；后续可加专项测试。
