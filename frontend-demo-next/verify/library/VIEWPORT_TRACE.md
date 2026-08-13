# B2 · Library & Search — 三视口浏览器 Trace

**生成时间**: 2026-07-19  
**基线 commit**: c7c2730 (A2 Control Identity Foundation)  
**B2 工作包**: Library & Search (bookshelf / book-detail / import-conflict-resolve / search-results)

## 视口定义

| 视口       | 宽度范围         | 备注                                                       |
| ---------- | ---------------- | ---------------------------------------------------------- |
| Phone      | < 600px          | A2 registry 当前唯一覆盖的视口；B2 全部 controlId 已注册    |
| Compact    | 600px – 839px    | A1 待扩展；B2 暂复用 Phone 的 controlId（视口降级）         |
| Tablet     | ≥ 840px          | A1 待扩展；B2 暂复用 Phone 的 controlId（视口降级）         |

> **降级策略**: 当 viewport 未在 A2 registry 中时，`controlId(route, state, "compact"|"tablet", role, discriminator)` 返回 null，B2 通过 `cid ? \` data-control-id="${cid}"\` : ""` 静默降级——不写无效 controlId，但保留 `data-control-id-family`（族级标记不依赖视口）和所有 `data-ui-event`、`data-final-state`、`data-loading-state` 等状态机标记。这样 B2 域控件在 compact/tablet 下仍有可访问的语义身份，等 A1 扩展后只需追加 registry 条目即可解锁精确 controlId。

---

## Trace 1 · Phone 视口（基准）

### 1.1 bookshelf (MainTabShell)

| 控件                         | controlId                                                              | ui-event                  | final-state (动态)     | 焦点恢复源            |
| ---------------------------- | ---------------------------------------------------------------------- | ------------------------- | ---------------------- | --------------------- |
| 顶部搜索                     | `library.button.bookshelf.default.phone.button.top-action-search-h-1c0d0896` | `route.push`              | idle                   | bookshelf-search      |
| 顶部更多                     | `library.button.bookshelf.default.phone.button.top-action-more-h-5fd7b61f` | `dropdown.menu.expand`    | idle                   | bookshelf-more-trigger |
| 视图切换·封面                | `library.button.bookshelf.default.phone.button.h-9853c162`            | `bookshelf.view.switch`   | `${bookshelfView}` (cover/list) | bookshelf-view-cover |
| 视图切换·列表                | `library.button.bookshelf.default.phone.button.h-101bc6a1`            | `bookshelf.view.switch`   | `${bookshelfView}`     | bookshelf-view-list   |
| 筛选                         | `library.button.bookshelf.default.phone.button.h-5e688a2b`             | `dropdown.trigger.press`  | `${state.open ? "open" : "closed"}` | bookshelf-filter     |
| 设置                         | `library.button.bookshelf.default.phone.button.route-bookshelf-search-settings-h-3170b979` | `route.push` | idle                   | bookshelf-settings    |
| More Sheet 关闭              | `library.button.bookshelf.default.phone.button.h-ec1177a8`             | `dropdown.menu.collapse`  | idle                   | bookshelf-more-close  |
| 底部导航·书架                | `library.button.bookshelf.default.phone.button.nav-type-bookshelf-h-65129732` | `tab.select`    | active                 | nav-bookshelf         |
| 底部导航·发现                | `library.button.bookshelf.default.phone.button.nav-type-discover-h-0b616465` | `tab.select`    | idle                   | nav-discover          |
| 底部导航·RSS                 | `library.button.bookshelf.default.phone.button.nav-type-rss-h-26836052` | `tab.select`        | idle                   | nav-rss               |
| 底部导航·设置                | `library.button.bookshelf.default.phone.button.nav-type-settings-h-7985f763` | `tab.select`    | idle                   | nav-settings          |

**状态机**:
- `data-sheet-state="closed|open"` (bookshelfMoreLayer)
- `data-final-state` 在 cover/list 切换时为动态 `${bookshelfView}`，明确终态
- `data-loading-state="loading|idle"` 在 shelf section（B2 早期 patch 已注入）

### 1.2 book-detail (LibraryShell, pageState: default | loading)

| 控件                  | default controlId                                                          | loading controlId                                                          | ui-event        | final-state |
| --------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------- | ----------- |
| 返回                  | `library.button.book-detail.default.phone.button.h-26b6dc06`               | `library.button.book-detail.loading.phone.button.h-8e013e5e`               | `route.back`    | idle        |
| 打开换源 Sheet        | `library.button.book-detail.default.phone.button.open-sheet-h-89d3856b`    | `library.button.book-detail.loading.phone.button.open-sheet-h-dbced97d`    | `sheet.open`    | idle        |
| 全部目录              | `library.button.book-detail.default.phone.button.route-book-directory-h-61303ebc` | `library.button.book-detail.loading.phone.button.route-book-directory-h-43a5142f` | `route.push` | idle        |
| 继续阅读              | `library.button.book-detail.default.phone.button.route-immersive-reading-h-6e3349ba` | `library.button.book-detail.loading.phone.button.route-immersive-reading-h-b8e9c1ea` | `route.push` | idle        |
| 移除书架 Dialog       | `library.button.book-detail.default.phone.button.open-dialog-h-01b8801a`   | `library.button.book-detail.loading.phone.button.open-dialog-h-ee4a1410`    | `dialog.open`   | idle        |
| 优书网外链            | `library.button.book-detail.default.phone.button.h-23bde952`              | `library.button.book-detail.loading.phone.button.h-a00a075e`               | `route.push`    | idle        |
| 书仓外链              | `library.button.book-detail.default.phone.button.h-fa2cbba6`              | `library.button.book-detail.loading.phone.button.h-2ba23a0d`               | `route.push`    | idle        |
| 本地缓存              | `library.button.book-detail.default.phone.button.h-2070f028`              | `library.button.book-detail.loading.phone.button.h-7f1a5c43`               | `route.push`    | idle        |
| 关闭换源 Sheet        | `library.button.book-detail.default.phone.button.close-sheet-h-68d3e051`   | `library.button.book-detail.loading.phone.button.close-sheet-h-9c70cbb6`   | `sheet.close`   | idle        |
| Dialog·取消           | `library.button.book-detail.default.phone.button.close-dialog-h-20037587`  | `library.button.book-detail.loading.phone.button.close-dialog-h-52739496`  | `dialog.cancel` | cancelled   |
| Dialog·确认移除       | `library.button.book-detail.default.phone.button.close-dialog-h-a5584917`   | `library.button.book-detail.loading.phone.button.close-dialog-h-bab81d89`   | `dialog.confirm` | confirm-remove |

**状态机**:
- `bookDetailState` = `tocState === "loading" ? "loading" : "default"` (pageState atom)
- `data-loading-state` 在 hero / toc 状态分别覆盖 (loading / error / offline / ready)
- `data-sheet-state="closed"` 在 sourceSheet (B2 早期 patch)
- `data-dialog-state="closed"` 在 removeDialog（B2 后期 normalize）
- `data-repeat-tap-guard` 在 continueReading / openRemoveDialog / sourceOption / confirmRemove
- `data-stale-result` 在 sourceOption（旧书源搜索结果）

### 1.3 search-results (LibraryShell, pageState: before | loading | empty | error | after)

| 控件                  | controlId                                                              | ui-event              | final-state       | repeat-tap-guard    |
| --------------------- | ---------------------------------------------------------------------- | --------------------- | ----------------- | ------------------- |
| 返回                  | `library.button.search-results.default.phone.button.h-39928eb3`         | `route.back`          | idle              | -                   |
| 搜索框                | `library.searchbox.search-results.default.phone.searchbox.open-keyboard-h-1a89a922` | `open.keyboard` | idle              | -                   |
| 开始搜索 (before)     | `library.button.search-results.default.phone.button.search-submit-h-566dbcbf` | `search.submit` | idle              | search-submit       |
| 加入书架 (after)      | `library.button.search-results.default.phone.button.h-4c594032`        | `add.shelf`           | idle/loading/added/failed | add-shelf/add-shelf-loading |
| 搜索输入框 (keyboard) | `library.textbox.search-results.default.phone.textbox.h-a6b91afe`       | (隐式 - 由 keyboard layer) | idle              | -                   |
| 关闭键盘 (after/before)| `library.button.search-results.default.phone.button.close-keyboard-h-5c83efee` | `route.push`    | idle              | search-cancel       |
| 重新搜索 (empty/after)| `library.button.search-results.default.phone.button.search-reset-h-a329a491` | `search.reset`  | idle              | search-reset        |
| 查看详情 (after)      | `library.button.search-results.default.phone.button.route-book-detail-h-02559ee3` | `route.push`    | idle              | view-detail         |

**状态机**:
- `data-search-state` 五态: before / loading / empty / error / after
- `data-loading-state="loading"` (loading 态)
- `data-empty-state="empty"` (empty 态)
- `data-error-state="partial"` (error 态，部分书源失败)
- `data-stale-result="true|false"` (基于 searchReqToken ≠ latestReqToken 判定)
- `data-dialog-state="closed"` + `data-dialog-role="search-clear"` + `data-dialog-open-trigger="search-clear-history"`
- `data-keyboard-state="closed"` (keyboardLayer 包装)
- `data-control-id-family` 覆盖 8 个族：search-scope / search-sort / search-history / search-suggest / search-hot / search-retry-source / search-result-row / close-keyboard

### 1.4 import-conflict-resolve (LibraryShell)

| 控件                | controlId                                                                     | ui-event                   | final-state (动态)              | repeat-tap-guard    |
| ------------------- | ----------------------------------------------------------------------------- | -------------------------- | ------------------------------- | ------------------- |
| 返回                | `import.button.import-conflict-resolve.default.phone.button.h-f9ecca4e`       | `route.back`               | idle                            | -                   |
| 决策·跳过 (=保留本地) | `import.button.import-conflict-resolve.default.phone.button.action-conflict-keep-local-h-216ce734` | `import.conflict.decision` | `${item.decision === "skip" ? "active" : "idle"}` | conflict-skip       |
| 决策·覆盖           | `import.button.import-conflict-resolve.default.phone.button.action-conflict-overwrite-h-36ec8719` | `import.conflict.decision` | `${item.decision === "overwrite" ? "active" : "idle"}` | conflict-overwrite |
| 决策·保留两份       | `import.button.import-conflict-resolve.default.phone.button.action-conflict-keep-both-h-61694be3` | `import.conflict.decision` | `${item.decision === "keep-both" ? "active" : "idle"}` | conflict-keep-both |
| 上一步·回滚         | `import.button.import-conflict-resolve.default.phone.button.action-import-rollback-h-1f9b141d` | `import.rollback`           | idle/pending/completed/failed   | rollback            |

**状态机**:
- `rollbackState`: idle → pending → completed | failed
- `applyState`: idle → applying → applied | failed
- `conflictSelectionState`: undecided → decided → applying
- `data-conflict-state` / `data-rollback-state` / `data-apply-state` 三态机
- `data-repeat-tap-guard` 覆盖 4 个决策按钮 + rollback + apply
- `data-final-state` 动态值：active/idle（按 item.decision）、completed/failed（按 rollbackState）、applied/failed（按 applyState）
- `disabled` 在 rollbackState="pending" / applyState="applying" 时生效

---

## Trace 2 · Compact 视口（600–839px，待 A1 扩展）

### 当前状态

A2 registry 未覆盖 compact 视口的 controlId。B2 实现的降级行为：

1. `window.ReaderLibraryShell.controlId(route, state, "compact", role, discriminator)` 返回 `null`
2. 渲染层 `cid ? \` data-control-id="${cid}"\` : ""` 静默省略 `data-control-id` 属性
3. **保留**的属性（不依赖视口）：
   - `data-control-id-family`（族级标记）
   - `data-ui-event`（事件身份）
   - `data-final-state` / `data-loading-state` / `data-empty-state` / `data-error-state`
   - `data-sheet-state` / `data-dialog-state` / `data-keyboard-state`
   - `data-repeat-tap-guard` / `data-stale-result` / `data-focus-restore-source`
4. **CSS 视觉**：`library-shell.css` 选择器 `[data-shell="LibraryShell"]` 不依赖 viewport，焦点环 / stale 视觉提示在 compact 下完全可用

### 可观察的差异

| 维度         | Phone                            | Compact (降级)                    |
| ------------ | -------------------------------- | --------------------------------- |
| data-control-id | 完整（44 个关键控件全部有值） | 缺失（仅有 family 级标记）         |
| 焦点恢复     | data-control-id 精确定位          | 通过 data-focus-restore-source 间接定位 |
| Sheet/Dialog | data-sheet-state 完整           | 完整（与视口无关）                 |

### A1 扩展后的解锁路径

只需在 `library-shell.js` 的 `LIBRARY_CONTROL_IDS` 中追加 compact / tablet 条目，例如：

```js
"bookshelf.default.compact.button.top-action-search": "library.button.bookshelf.default.compact.button.top-action-search-h-xxxxxxxx",
```

即可让 compact 视口获得精确 controlId，无需改 render-runtime.js。

---

## Trace 3 · Tablet 视口（≥ 840px，待 A1 扩展）

与 Compact 相同的降级策略。Tablet 视口下额外观察到：

- `fd-library-phone` 类名仍生效（kit.js 默认 phone 类名），不阻碍功能
- 书架 grid 在 Tablet 下可能显示更多列（B2 不改 kit.css 的网格定义，避免越界）
- 主导航 `mainNav` 仍为底部 tab bar 形态（A1 待扩展为侧栏时，需要 B5 / B6 跟进）

---

## 验收清单

- [x] Phone 视口：44 个关键 controlId 全部解析成功（见 verify-library-control-identity.mjs）
- [x] Phone 视口：8 种 final-state、7 种 repeat-tap-guard、3 种状态机标记覆盖
- [x] Compact 视口：controlId 降级为 null，但 data-control-id-family + 全部状态机标记保留
- [x] Tablet 视口：同 Compact
- [x] 焦点恢复：data-focus-restore-source 在 4 个页面族全部出现
- [x] stale result：data-stale-result 在 search-results 全部状态分支覆盖
- [ ] Compact/Tablet 精确 controlId：等 A1 扩展 registry 后解锁（B2 已准备好消费路径）
