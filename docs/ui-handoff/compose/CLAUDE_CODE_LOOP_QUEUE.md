# Claude Code Loop Queue

## Queue Legend
- `[ ]` = pending
- `[~]` = in progress
- `[x]` = done
- `[!]` = blocked

---

## Slice 3：Bookshelf + Search + Detail static UI（CURRENT）

### Phase 3.1：BookshelfScreen 迁移
- [x] **LOOP-001**：迁移 `BookshelfScreen.kt` — 替换 MaterialTheme Scaffold/TopAppBar 为 `ReaderAppTopBar` + `ReaderTheme`，空状态用 `ReaderEmptyState`，保留 `onSearchClick` callback
- [x] **LOOP-002**：为 `BookshelfScreen` 新增 UI 预览测试 — 验证 `ReaderAppTopBar` 渲染、`ReaderEmptyState` 显示、semantics 完整

### Phase 3.2：SearchScreen 迁移
- [x] **LOOP-003**：迁移 `SearchScreen.kt` — 替换 `OutlinedTextField` 为 `ReaderSearchBox`，结果列表用 `SearchResultItem`，loading/empty/error 用 `ReaderLoadingState`/`ReaderEmptyState`/`ReaderErrorState`，不修改 `SearchViewModel` 逻辑
- [x] **LOOP-004**：为 `SearchScreen` 新增 UI 测试 — 验证 `ReaderSearchBox` 渲染、`SearchResultItem` 显示、状态切换、semantics 完整

### Phase 3.3：BookDetailScreen 迁移
- [x] **LOOP-005**：迁移 `BookDetailScreen.kt` — 替换 `TopAppBar` 为 `ReaderAppTopBar`，loading 状态用 `ReaderLoadingState`，intro Card 用 `ReaderCard`，不修改 `BookDetailViewModel` 逻辑
- [x] **LOOP-006**：为 `BookDetailScreen` 新增 UI 测试 — 验证 `ReaderAppTopBar` + navigationIcon、loading 状态、内容渲染

### Phase 3.4：SettingsScreen 迁移
- [x] **LOOP-007**：迁移 `SettingsScreen.kt` — 替换 `TopAppBar` 为 `ReaderAppTopBar`，替换 Switch/Slider 行用 `ReaderSettingsSwitchRow`/`ReaderSettingsRow`，分组用 `ReaderSettingsGroup`，保留 `ThemePreferences` 数据绑定
- [x] **LOOP-008**：为 `SettingsScreen` 新增 UI 测试 + Slice 3 完成报告

---

## Slice 4：Reader control layer Compose prototype（PENDING）

### Phase 4.1：基座组件
- [x] **LOOP-009**：创建 `ui/reader/components/ReaderControlBase.kt` — 实现 `BaseControlVisible` 状态：底栏 + 浮动页内控制 + 快捷按钮 + 亮度条，参照 `control-layer-base-v2.html`
- [x] **LOOP-010**：为 `ReaderControlBase` 新增 UI 测试 — 验证底部栏高度 68dp、快捷按钮无文字标签、浮动页内控制语义、亮度条

### Phase 4.2：QuickAction overlays
- [x] **LOOP-011**：创建 `ui/reader/components/ReaderQuickActionOverlay.kt` — 实现 Search/AutoScroll/Replace 三个 quick action overlay
- [x] **LOOP-012**：为 QuickAction overlays 新增测试 — 验证 overlay 显隐、内容替换只显示当前书籍规则、搜索本章

### Phase 4.3：BottomFunction overlays
- [x] **LOOP-013**：创建 `ui/reader/components/ReaderBottomFunctionOverlay.kt` — 实现 Directory/Tts/Appearance/Settings 四个底部功能 overlay
- [x] **LOOP-014**：为 BottomFunction overlays 新增测试 — 验证 设置 overlay 不混入 WebDAV/书源/RSS、目录页书签/进度标识

### Phase 4.4：Night state + 集成
- [x] **LOOP-015**：创建 `ui/reader/components/ReaderNightState.kt` — 夜间模式不是弹窗，是阅读页全局状态变体
- [x] **LOOP-016**：集成 `ReaderScreen` 与所有 reader components — 状态机切换
- [x] **LOOP-017**：为 ReaderScreen 集成新增全状态测试 — 9 个状态可独立渲染
- [x] **LOOP-018**：Slice 4 完成报告

---

## Slice 5：Source management UI integration（PENDING）

- [x] **LOOP-019**：迁移 `BookSourceScreen.kt` 到 Slice 1/2 组件 — 使用 `ReaderAppTopBar`、`ReaderListItem`、`ReaderCard`
- [x] **LOOP-020**：新增 `SourceDetailScreen.kt` 静态 UI — 参照 `source-detail.html`
- [x] **LOOP-021**：新增 `SourceEditScreen.kt` 静态 UI — 参照 `source-edit.html`
- [x] **LOOP-022**：新增 `SourceImportScreen.kt` 静态 UI — 参照 `source-import.html`
- [x] **LOOP-023**：为 Source management UI 新增测试 — 启用/禁用/删除行为不回归
- [x] **LOOP-024**：Slice 5 完成报告

---

## Slice 6：Discover / RSS / WebDAV static UI（PENDING）

- [x] **LOOP-025**：新增 `DiscoverScreen.kt` 静态 UI — 参照 `discover-home.html`
- [x] **LOOP-026**：新增 `RssListScreen.kt` / `RssDetailScreen.kt` 静态 UI — 参照 `rss-list.html`、`rss-detail.html`
- [x] **LOOP-027**：新增 `RssSubscriptionManagementScreen.kt` 静态 UI — 参照 `rss-subscription-management.html`
- [x] **LOOP-028**：新增 `WebDavConfigScreen.kt` 静态 UI — 参照 `webdav-config.html`
- [ ] **LOOP-029**：新增 `BackupSettingsScreen.kt` 静态 UI — 参照 `backup-settings.html`
- [ ] **LOOP-030**：为 Discover/RSS/WebDAV 静态 UI 新增测试
- [ ] **LOOP-031**：Slice 6 完成报告

---

## Slice 7：State integration（PENDING）

- [ ] **LOOP-032**：为 `BookshelfScreen` / `SearchScreen` / `BookDetailScreen` 注入 `ReaderUiState` sealed interface
- [ ] **LOOP-033**：为 `DiscoverScreen` / `RssListScreen` / `RssDetailScreen` 注入状态
- [ ] **LOOP-034**：为 `SourceManagementScreen` / `WebDavConfigScreen` 注入状态
- [ ] **LOOP-035**：为 state matrix 新增全覆盖测试（loading/empty/error/offline/disabled/permission）
- [ ] **LOOP-036**：Slice 7 完成报告

---

## Slice 8：Navigation integration（PENDING）

- [ ] **LOOP-037**：新增 `ReaderRouteHost` — 扩展当前 `AppNavigation` 到完整路由表
- [ ] **LOOP-038**：新增 back stack 管理 + deep link placeholder
- [ ] **LOOP-039**：迁移现有 route tests 到新 `ReaderRouteHost`
- [ ] **LOOP-040**：为 navigation 新增 smoke tests — 核心路由可导航
- [ ] **LOOP-041**：Slice 8 完成报告

---

## Slice 9：UI regression tests（PENDING）

- [ ] **LOOP-042**：新增 regression string scan tests — 无旧 Stitch class/色值
- [ ] **LOOP-043**：新增 reader semantics tests — 控制层规则全覆盖
- [ ] **LOOP-044**：新增 route smoke tests — 16 条核心路由全覆盖
- [ ] **LOOP-045**：新增 screenshot/golden smoke tests — Reader base + 8 states
- [ ] **LOOP-046**：CI 集成验证 — 所有测试在 CI 可运行
- [ ] **LOOP-047**：输出 FINAL_COMPOSE_IMPLEMENTATION_REPORT.md

---

## 总计

| Slice | 任务数 |
|---|---|
| Slice 3 | 8 |
| Slice 4 | 10 |
| Slice 5 | 6 |
| Slice 6 | 7 |
| Slice 7 | 5 |
| Slice 8 | 5 |
| Slice 9 | 6 |
| **Total** | **47** |
