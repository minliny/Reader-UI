import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validate, assertValid } from "./mini-validator.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACTS_DIR = join(__dirname, "..");

function loadJson(rel) {
  return JSON.parse(readFileSync(join(CONTRACTS_DIR, rel), "utf8"));
}

const routeSchema = loadJson("route.schema.json");
const eventSchema = loadJson("ui-event.schema.json");
const stateSchema = loadJson("ui-state.schema.json");
const viewSchema = loadJson("view-state.schema.json");
const motionSchema = loadJson("motion.schema.json");
const tokenSchema = loadJson("token.schema.json");

const routeFixtures = loadJson("fixtures/route.fixtures.json");
const eventFixtures = loadJson("fixtures/ui-event.fixtures.json");
const stateFixtures = loadJson("fixtures/ui-state.fixtures.json");
const viewFixtures = loadJson("fixtures/view-state.fixtures.json");
const motionFixtures = loadJson("fixtures/motion.fixtures.json");
const tokenFixtures = loadJson("fixtures/token.fixtures.json");

// --- Schema 自检 ---
test("route.schema.json 结构合法", () => {
  assert.equal(routeSchema.title, "Route");
  assert.equal(routeSchema.additionalProperties, false);
  assert.ok(routeSchema.properties.id.enum.length > 100, "route id enum 应覆盖 demo 全量 route");
  assert.ok(routeSchema.properties.shell.enum.length === 5);
});

test("ui-event.schema.json 结构合法", () => {
  assert.equal(eventSchema.title, "UiEvent");
  assert.equal(eventSchema.additionalProperties, false);
  assert.ok(eventSchema.properties.type.enum.length > 100);
});

test("ui-state.schema.json 结构合法", () => {
  assert.equal(stateSchema.title, "UiState");
  assert.equal(stateSchema.additionalProperties, false);
  assert.deepEqual(stateSchema.required, ["route", "tab", "readerMode", "overlay", "activeSession", "focusTarget", "loading", "error", "reducedMotion"]);
  assert.ok(stateSchema.properties.tab.enum.includes("bookshelf"));
  assert.ok(stateSchema.properties.tab.enum.includes("discover"));
  assert.ok(stateSchema.properties.tab.enum.includes("rss"));
  assert.ok(stateSchema.properties.tab.enum.includes("settings"));
});

test("view-state.schema.json 结构合法", () => {
  assert.equal(viewSchema.title, "ViewState");
  assert.ok(viewSchema.$defs.Component.properties.type.enum.length > 30);
});

test("motion.schema.json 结构合法", () => {
  assert.equal(motionSchema.title, "Motion");
  assert.ok(motionSchema.properties.id.enum.length > 60);
  assert.ok(motionSchema.properties.easing.enum.includes("ease"));
  assert.ok(motionSchema.properties.easing.enum.includes("ease-in-out"));
});

test("token.schema.json 结构合法", () => {
  assert.equal(tokenSchema.title, "Token");
  assert.ok(tokenSchema.properties.name.pattern.startsWith("^--reader-ds-"));
  assert.ok(tokenSchema.properties.category.enum.includes("color"));
  assert.ok(tokenSchema.properties.category.enum.includes("motion-duration"));
});

// --- Fixtures 校验 ---
test("route.fixtures.json 全部通过 schema", () => {
  for (const item of routeFixtures) {
    assertValid(routeSchema, item, `route fixture ${item.id}`);
  }
});

test("ui-event.fixtures.json 全部通过 schema", () => {
  for (const item of eventFixtures) {
    assertValid(eventSchema, item, `ui-event fixture ${item.type}`);
  }
});

test("ui-state.fixtures.json 全部通过 schema", () => {
  for (const item of stateFixtures) {
    assertValid(stateSchema, item, `ui-state fixture route=${item.route?.id}`);
  }
});

test("view-state.fixtures.json 全部通过 schema", () => {
  for (const item of viewFixtures) {
    assertValid(viewSchema, item, `view-state fixture ${item.routeId}`);
  }
});

test("motion.fixtures.json 全部通过 schema", () => {
  for (const item of motionFixtures) {
    assertValid(motionSchema, item, `motion fixture ${item.id}`);
  }
});

test("token.fixtures.json 全部通过 schema", () => {
  for (const item of tokenFixtures) {
    assertValid(tokenSchema, item, `token fixture ${item.name}`);
  }
});

// --- 跨文件一致性 ---
test("ui-state.route.id 出现在 route schema enum 中", () => {
  const allowed = new Set(routeSchema.properties.id.enum);
  for (const item of stateFixtures) {
    assert.ok(allowed.has(item.route.id), `ui-state fixture route.id=${item.route.id} 不在 route schema 中`);
  }
});

test("ui-state.tab 限制为 4 个主 Tab", () => {
  for (const item of stateFixtures) {
    assert.ok(["bookshelf", "discover", "rss", "settings"].includes(item.tab));
  }
});

test("ui-state.overlay 取值在 overlay enum 中", () => {
  const allowed = new Set([...stateSchema.properties.overlay.enum]);
  for (const item of stateFixtures) {
    if (item.overlay != null) {
      assert.ok(allowed.has(item.overlay), `overlay=${item.overlay} 不在 enum 中`);
    }
  }
});

test("view-state.routeId 出现在 route schema enum 中", () => {
  const allowed = new Set(routeSchema.properties.id.enum);
  for (const item of viewFixtures) {
    assert.ok(allowed.has(item.routeId), `view-state routeId=${item.routeId} 不在 route schema 中`);
  }
});

test("view-state.pageState 出现在 PageState enum 中", () => {
  const allowed = new Set(stateSchema.properties.pageState.enum);
  for (const item of viewFixtures) {
    assert.ok(allowed.has(item.pageState), `view-state pageState=${item.pageState} 不在 PageState enum 中`);
  }
});

test("view-state 组件 type 在 ComponentType enum 中", () => {
  const allowed = new Set(viewSchema.$defs.Component.properties.type.enum);
  function walk(component) {
    assert.ok(allowed.has(component.type), `组件 type=${component.type} 不在 enum 中`);
    if (component.children) for (const c of component.children) walk(c);
  }
  for (const item of viewFixtures) {
    for (const c of item.components) walk(c);
  }
});

test("bookshelf view-state 对齐 frontend-demo 书架结构", () => {
  const bookshelf = viewFixtures.find((item) => item.routeId === "bookshelf" && item.pageState === "default");
  assert.ok(bookshelf, "bookshelf/default fixture 应存在");

  assert.deepEqual(
    bookshelf.components.map((component) => component.type),
    ["AppTopBar", "ContinueReadingCard", "BookshelfShelfSection", "BottomNav"]
  );

  const allTypes = [];
  function collect(component) {
    allTypes.push(component.type);
    if (component.children) for (const child of component.children) collect(child);
  }
  for (const component of bookshelf.components) collect(component);

  assert.equal(allTypes.includes("ShelfChipGroup"), false, "bookshelf 不应出现 demo 中不存在的顶部 chips");
  assert.equal(allTypes.includes("ProgressBar"), false, "bookshelf 默认书卡不应内嵌进度条");

  const shelfSection = bookshelf.components.find((component) => component.type === "BookshelfShelfSection");
  assert.ok(shelfSection, "bookshelf 应包含 shelf section 包装器");
  assert.deepEqual(
    shelfSection.children.map((component) => component.type),
    ["ShelfSectionHeader", "BookGrid"]
  );

  const bookGrid = shelfSection.children.find((component) => component.type === "BookGrid");
  assert.ok(bookGrid, "shelf section 应包含 BookGrid");
  assert.deepEqual(
    bookGrid.children.map((component) => component.type),
    ["BookCard", "BookCard", "BookCard"]
  );
});

test("book-detail view-state 使用详情页复合结构", () => {
  const detail = viewFixtures.find((item) => item.routeId === "book-detail" && item.pageState === "default");
  assert.ok(detail, "book-detail/default fixture 应存在");

  assert.deepEqual(
    detail.components.map((component) => component.type),
    ["AppTopBar", "BookHero", "BookSummaryCard", "BookChapterList"]
  );

  assert.equal(
    detail.components.some((component) => component.type === "BookCover"),
    false,
    "book-detail 不应把 BookCover 作为顶层 body 组件渲染"
  );
});

test("control-layer-base-v2 对齐 normalized HTML 的浮动控制结构", () => {
  const control = viewFixtures.find((item) => item.routeId === "control-layer-base-v2" && item.pageState === "default");
  assert.ok(control, "control-layer-base-v2/default fixture 应存在");

  assert.deepEqual(
    control.components.map((component) => component.type),
    ["ReaderBase", "FloatingBrightness", "FloatingQuickActions", "FloatingPageControl", "ReaderBottomBar"]
  );

  assert.equal(
    control.components.some((component) => component.type === "ReaderControlSheet"),
    false,
    "control-layer-base-v2 不应回退到过期 bottom sheet 结构"
  );
});

test("normalized 状态页文案与 handoff HTML 对齐", () => {
  const cases = [
    ["bookshelf-empty", "shelf-empty", "BookshelfEmptyPage", { title: "书架还是空的", message: "导入本地书籍或通过搜索加入书架。" }],
    ["rss-detail", "default", "RssDetailPage", { title: "深空信号更新" }],
    ["search-loading", "loading", "SearchStatePage", { title: "正在搜索", message: "正在从启用书源获取结果。" }],
    ["search-empty", "empty", "SearchStatePage", { title: "没有找到结果", message: "换个关键词或检查书源状态。" }],
    ["search-error", "error", "SearchStatePage", { title: "搜索失败", message: "网络源暂时不可用。", action: "重试" }],
    ["rss-empty", "empty", "RssEmptyState", { title: "暂无订阅", message: "添加 RSS 订阅后查看更新。", action: "添加订阅" }],
    ["rss-error", "error", "RssErrorState", { title: "订阅加载失败", message: "网络异常或订阅源不可访问。", action: "重试" }],
    ["sync-error", "error", "SyncErrorPage", { title: "同步失败", message: "WebDAV auth error，请重新登录。" }],
    ["global-loading", "loading", "GlobalStatePage", { title: "加载中", message: "正在准备内容。" }],
    ["global-empty", "empty", "GlobalStatePage", { title: "暂无内容", message: "当前列表为空。" }],
    ["global-error", "error", "GlobalStatePage", { title: "出错了", message: "请稍后重试。", action: "重试" }],
    ["offline-state", "offline", "OfflineStatePage", { title: "当前离线", message: "可继续阅读已缓存书籍。" }],
    ["permission-required", "permission", "PermissionRequiredPage", { title: "需要存储权限", message: "授予权限后可导入本地书籍。", action: "授予权限" }],
    ["about-version", "default", "AboutVersionPage", { title: "Reader for Android", version: "1.0.0" }],
  ];

  for (const [routeId, pageState, type, expectedProps] of cases) {
    const entry = viewFixtures.find((item) => item.routeId === routeId && item.pageState === pageState);
    assert.ok(entry, `${routeId}/${pageState} fixture 应存在`);
    const component = entry.components.find((item) => item.type === type);
    assert.ok(component, `${routeId}/${pageState} 应包含 ${type}`);
    assert.deepEqual(
      Object.fromEntries(Object.keys(expectedProps).map((key) => [key, component.props[key]])),
      expectedProps
    );
  }
});

test("normalized 设置/表单类页面使用页面级组件，避免退回通用拼装", () => {
  const expected = new Map([
    ["settings/default", ["AppTopBar", "SettingsHomePage", "BottomNav"]],
    ["settings-general/default", ["BackTopBar", "SettingsGeneralPage"]],
    ["about/default", ["BackTopBar", "AboutFeedbackPage"]],
    ["bookshelf-search-settings/default", ["BackTopBar", "BookshelfSearchSettingsPage"]],
    ["bookshelf-book-more-menu/default", ["AppTopBar", "BookMoreMenuPage", "BottomNav"]],
    ["bookshelf-group-management/default", ["BackTopBar", "BookGroupManagementPage"]],
    ["rss-subscription-management/default", ["BackTopBar", "RssSubscriptionManagementPage"]],
    ["source-add/default", ["BackTopBar", "SourceFormPage"]],
    ["source-edit/default", ["BackTopBar", "SourceFormPage"]],
    ["global-settings/default", ["BackTopBar", "GlobalSettingsPage"]],
    ["backup-settings/default", ["BackTopBar", "BackupSettingsPage"]],
    ["progress-sync/default", ["BackTopBar", "ProgressSyncPage"]],
  ]);

  for (const [key, types] of expected.entries()) {
    const [routeId, pageState] = key.split("/");
    const entry = viewFixtures.find((item) => item.routeId === routeId && item.pageState === pageState);
    assert.ok(entry, `${key} fixture 应存在`);
    assert.deepEqual(entry.components.map((item) => item.type), types, `${key} 应使用页面级组件`);
  }
});

test("书架排序筛选路由复用书架 DOM 并展开筛选浮层", () => {
  const entry = viewFixtures.find((item) => item.routeId === "sort-filter" && item.pageState === "default");
  assert.ok(entry, "sort-filter/default fixture 应存在");
  assert.deepEqual(
    entry.components.map((component) => component.type),
    ["AppTopBar", "ContinueReadingCard", "BookshelfShelfSection", "BottomNav"],
    "sort-filter 应是书架结构加筛选态，不应是独立 SettingsSection"
  );
  const shelfSection = entry.components.find((component) => component.type === "BookshelfShelfSection");
  assert.equal(shelfSection.props.filterOpen, true, "sort-filter 应通过 filterOpen 展开书架筛选浮层");
});

test("书源工具流使用页面级组件，避免退回通用 scaffold", () => {
  const expected = new Map([
    ["source-import-preview/default", ["BackTopBar", "SourceImportPreviewPage"]],
    ["source-batch/default", ["BackTopBar", "SourceBatchPage"]],
    ["source-groups/default", ["BackTopBar", "SourceGroupsPage"]],
    ["source-detect/default", ["BackTopBar", "SourceDetectPage"]],
    ["source-rule-edit/default", ["BackTopBar", "SourceRuleEditPage"]],
    ["source-edit-debug/default", ["BackTopBar", "SourceRuleEditPage"]],
    ["source-debug/default", ["BackTopBar", "SourceDebugPage"]],
    ["source-debug-running/loading", ["BackTopBar", "SourceDebugRunningPage"]],
    ["source-debug-result/default", ["BackTopBar", "SourceDebugResultPage"]],
    ["source-debug-search-result/default", ["BackTopBar", "SourceDebugResultPage"]],
    ["source-debug-detail-result/default", ["BackTopBar", "SourceDebugResultPage"]],
    ["source-debug-catalog-result/default", ["BackTopBar", "SourceDebugResultPage"]],
    ["source-debug-content-log/default", ["BackTopBar", "SourceDebugContentLogPage"]],
    ["source-code-view/default", ["BackTopBar", "SourceCodeViewPage"]],
    ["source-logs/default", ["BackTopBar", "SourceLogsPage"]],
    ["source-delete-confirm/default", ["BackTopBar", "SourceDeleteConfirmPage"]],
  ]);

  for (const [key, types] of expected.entries()) {
    const [routeId, pageState] = key.split("/");
    const entry = viewFixtures.find((item) => item.routeId === routeId && item.pageState === pageState);
    assert.ok(entry, `${key} fixture 应存在`);
    assert.deepEqual(entry.components.map((item) => item.type), types, `${key} 应使用书源工具页级组件`);
    for (const type of ["List", "Content", "Loading", "Card", "Button", "SettingsSection"]) {
      assert.equal(entry.components.some((item) => item.type === type), false, `${key} 不应退回 ${type}`);
    }
  }
});

test("同步恢复流使用页面级组件，避免退回通用 scaffold", () => {
  const expected = new Map([
    ["sync-backup/default", ["BackTopBar", "SyncBackupPage"]],
    ["sync-backup/loading", ["BackTopBar", "SyncBackupPage"]],
    ["restore-confirm/default", ["BackTopBar", "RestoreConfirmPage"]],
    ["restore-scopes/default", ["BackTopBar", "RestoreConfirmPage"]],
    ["restore-preview/default", ["BackTopBar", "RestoreConfirmPage"]],
    ["restore-progress/loading", ["BackTopBar", "RestoreProgressPage"]],
    ["restore-running/loading", ["BackTopBar", "RestoreProgressPage"]],
    ["restore-conflict/error", ["BackTopBar", "RestoreConflictPage"]],
    ["restore-result/default", ["BackTopBar", "RestoreResultPage"]],
  ]);

  for (const [key, types] of expected.entries()) {
    const [routeId, pageState] = key.split("/");
    const entry = viewFixtures.find((item) => item.routeId === routeId && item.pageState === pageState);
    assert.ok(entry, `${key} fixture 应存在`);
    assert.deepEqual(entry.components.map((item) => item.type), types, `${key} 应使用同步恢复页级组件`);
    for (const type of ["FormSection", "List", "Content", "Loading", "ErrorState", "Button"]) {
      assert.equal(entry.components.some((item) => item.type === type), false, `${key} 不应退回 ${type}`);
    }
  }
});

test("书架工具流使用页面级组件，避免退回通用 scaffold", () => {
  const expected = new Map([
    ["group-management/default", ["BackTopBar", "GroupManagementPage"]],
    ["book-batch-management/default", ["BackTopBar", "BookBatchManagementPage"]],
    ["book-directory/default", ["BackTopBar", "BookDirectoryPage"]],
  ]);

  for (const [key, types] of expected.entries()) {
    const [routeId, pageState] = key.split("/");
    const entry = viewFixtures.find((item) => item.routeId === routeId && item.pageState === pageState);
    assert.ok(entry, `${key} fixture 应存在`);
    assert.deepEqual(entry.components.map((item) => item.type), types, `${key} 应使用书架工具页级组件`);
    for (const type of ["List", "ListRow", "Button", "Content", "Card"]) {
      assert.equal(entry.components.some((item) => item.type === type), false, `${key} 不应退回 ${type}`);
    }
  }
});

test("Discover 与关于反馈使用页面级组件，避免退回通用 scaffold", () => {
  const expected = new Map([
    ["about-feedback/default", ["BackTopBar", "AboutFeedbackPage"]],
    ["discover-source-bulk/default", ["BackTopBar", "DiscoverSourceBulkPage"]],
    ["discover-source-login/default", ["BackTopBar", "DiscoverSourceLoginPage"]],
    ["discover-rule-test/default", ["BackTopBar", "DiscoverRuleTestPage"]],
    ["discover-empty/empty", ["AppTopBar", "DiscoverStatePage", "BottomNav"]],
    ["discover-error/error", ["AppTopBar", "DiscoverStatePage", "BottomNav"]],
    ["discover-loading/loading", ["AppTopBar", "DiscoverStatePage", "BottomNav"]],
    ["discover-no-results/empty", ["AppTopBar", "DiscoverStatePage", "BottomNav"]],
  ]);

  for (const [key, types] of expected.entries()) {
    const [routeId, pageState] = key.split("/");
    const entry = viewFixtures.find((item) => item.routeId === routeId && item.pageState === pageState);
    assert.ok(entry, `${key} fixture 应存在`);
    assert.deepEqual(entry.components.map((item) => item.type), types, `${key} 应使用页面级组件`);
    for (const type of ["List", "ListRow", "Button", "Content", "Loading", "Empty", "ErrorState"]) {
      assert.equal(entry.components.some((item) => item.type === type), false, `${key} 不应退回 ${type}`);
    }
  }
});

test("RSS 源编辑流使用页面级组件，避免退回通用 scaffold", () => {
  const expected = new Map([
    ["rss-source-add/default", ["BackTopBar", "RssSourceEditPage"]],
    ["rss-source-edit/default", ["BackTopBar", "RssSourceEditPage"]],
  ]);

  for (const [key, types] of expected.entries()) {
    const [routeId, pageState] = key.split("/");
    const entry = viewFixtures.find((item) => item.routeId === routeId && item.pageState === pageState);
    assert.ok(entry, `${key} fixture 应存在`);
    assert.deepEqual(entry.components.map((item) => item.type), types, `${key} 应使用 RSS 源编辑页级组件`);
    for (const type of ["FormSection", "List", "Content", "Button", "Input", "SettingsSection"]) {
      assert.equal(entry.components.some((item) => item.type === type), false, `${key} 不应退回 ${type}`);
    }
  }
});

test("motion.fixtures 中 id 全部在 motion schema enum 中", () => {
  const allowed = new Set(motionSchema.properties.id.enum);
  for (const item of motionFixtures) {
    assert.ok(allowed.has(item.id), `motion id=${item.id} 不在 schema enum 中`);
  }
});

test("motion durationMs 非负整数", () => {
  for (const item of motionFixtures) {
    assert.ok(Number.isInteger(item.durationMs) && item.durationMs >= 0);
  }
});

test("token.fixtures 中 name 全部匹配 --reader-ds- 前缀", () => {
  for (const item of tokenFixtures) {
    assert.ok(item.name.startsWith("--reader-ds-"), `token name=${item.name} 不匹配前缀`);
  }
});

test("token.fixtures 中 category 在 enum 中", () => {
  const allowed = new Set(tokenSchema.properties.category.enum);
  for (const item of tokenFixtures) {
    assert.ok(allowed.has(item.category), `token category=${item.category} 不在 enum 中`);
  }
});

test("ui-event type 在 schema enum 中", () => {
  const allowed = new Set(eventSchema.properties.type.enum);
  for (const item of eventFixtures) {
    assert.ok(allowed.has(item.type), `ui-event type=${item.type} 不在 enum 中`);
  }
});

// --- 唯一性 ---
test("route id 在 schema 中唯一", () => {
  const ids = routeSchema.properties.id.enum;
  const set = new Set(ids);
  assert.equal(set.size, ids.length, "route id 重复");
});

test("motion id 在 schema 中唯一", () => {
  const ids = motionSchema.properties.id.enum;
  const set = new Set(ids);
  assert.equal(set.size, ids.length, "motion id 重复");
});

test("ui-event type 在 schema 中唯一", () => {
  const types = eventSchema.properties.type.enum;
  const set = new Set(types);
  assert.equal(set.size, types.length, "ui-event type 重复");
});

test("token name 在 fixtures 中唯一", () => {
  const names = tokenFixtures.map((t) => t.name);
  const set = new Set(names);
  assert.equal(set.size, names.length, "token name 重复");
});
