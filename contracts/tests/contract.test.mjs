import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validate, assertValid } from "./mini-validator.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACTS_DIR = join(__dirname, "..");
const REPO_ROOT = join(CONTRACTS_DIR, "..");

function loadJson(rel) {
  return JSON.parse(readFileSync(join(CONTRACTS_DIR, rel), "utf8"));
}

const routeSchema = loadJson("route.schema.json");
const eventSchema = loadJson("ui-event.schema.json");
const stateSchema = loadJson("ui-state.schema.json");
const viewSchema = loadJson("view-state.schema.json");
const motionSchema = loadJson("motion.schema.json");
const tokenSchema = loadJson("token.schema.json");
const appearanceSchema = loadJson("appearance.schema.json");

const routeFixtures = loadJson("fixtures/route.fixtures.json");
const eventFixtures = loadJson("fixtures/ui-event.fixtures.json");
const stateFixtures = loadJson("fixtures/ui-state.fixtures.json");
const viewFixtures = loadJson("fixtures/view-state.fixtures.json");
const motionFixtures = loadJson("fixtures/motion.fixtures.json");
const tokenFixtures = loadJson("fixtures/token.fixtures.json");
const appearanceFixture = loadJson("fixtures/appearance.fixtures.json");
const frontendRuntimeSource = readFileSync(join(REPO_ROOT, "frontend-demo-optimized/render-runtime.js"), "utf8");

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
  assert.ok(tokenSchema.properties.name.pattern.startsWith("^--fd-ds-"));
  assert.ok(tokenSchema.properties.category.enum.includes("color"));
  assert.ok(tokenSchema.properties.category.enum.includes("motion-duration"));
});

test("appearance.schema.json 固定 Reader 2 AppearanceContent 真源", () => {
  assert.equal(appearanceSchema.title, "ReaderAppearanceSpec");
  assert.equal(appearanceSchema.additionalProperties, false);
  assert.equal(appearanceFixture.source.path, "Reader 2/Full/AppearanceContent");
  assertValid(appearanceSchema, appearanceFixture, "appearance fixture");
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

test("appearance fixture 主题字体控件 exact-set 与默认值闭合", () => {
  assert.deepEqual(
    appearanceFixture.themes.map((item) => [item.id, item.label, item.swatchHex]),
    [
      ["blue", "日间", "#FFFFFF"],
      ["warm", "暖白", "#FBF0DF"],
      ["blue-night", "夜间", "#26231F"],
      ["warm-night", "暖夜", "#302922"],
      ["paper", "纸纹", "#F5EAD8"],
      ["green", "青叶纹", "#E7F0E2"],
      ["paper-night", "夜纹", "#34302B"],
      ["green-night", "林夜纹", "#263129"],
    ]
  );
  assert.deepEqual(
    appearanceFixture.fonts.map((item) => item.label),
    ["系统", "宋体", "黑体", "楷体", "仿宋", "等宽", "思源宋体", "霞鹜文楷", "+ 导入"]
  );
  assert.deepEqual(
    appearanceFixture.selects.map((item) => [item.label, item.options.find((option) => option.value === item.defaultValue)?.label]),
    [["缩进", "无"], ["简繁", "简体"], ["翻页动画", "滑动"], ["文字对齐", "开启"]]
  );
  assert.deepEqual(
    appearanceFixture.steppers.map((item) => [item.id, item.defaultValue]),
    [["fontSize", 18], ["lineHeight", 1.96], ["paragraphGap", 16], ["letterSpacing", 0]]
  );
  const themeIds = new Set(appearanceFixture.themes.map((item) => item.id));
  const fontIds = new Set(appearanceFixture.fonts.map((item) => item.id));
  assert.equal(themeIds.size, appearanceFixture.themes.length);
  assert.equal(fontIds.size, appearanceFixture.fonts.length);
  assert.ok(themeIds.has(appearanceFixture.defaults.dayThemeId));
  assert.ok(themeIds.has(appearanceFixture.defaults.nightThemeId));
  assert.ok(fontIds.has(appearanceFixture.defaults.fontId));
  for (const theme of appearanceFixture.themes) assert.ok(themeIds.has(theme.pairId), `${theme.id} pair missing`);
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

test("bookshelf view-state 对齐 frontend-demo-optimized 书架结构", () => {
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
  assert.equal(bookGrid.id, "book-collection", "书架 collection id 必须跨布局稳定");
  assert.ok(bookGrid.children.length >= 6, "bookshelf 默认书架应覆盖至少 6 本 live demo 书卡");
  assert.deepEqual(
    bookGrid.children.map((component) => component.type),
    Array(bookGrid.children.length).fill("BookCard")
  );
  assert.deepEqual(
    bookGrid.children.slice(0, 6).map((component) => component.props?.title),
    ["长夜余火", "诡秘之主", "明朝那些事儿", "三体", "人间词话", "Android 开发笔记"]
  );
  assert.equal(
    bookGrid.children.every((component) => component.props?.semanticRole === "BookItem"),
    true,
    "BookCard canonical type 必须显式表达稳定 BookItem 语义"
  );
});

test("bookshelf cover/list view-state 复用同一 BookItem identity tree", () => {
  const cover = viewFixtures.find((item) => item.routeId === "bookshelf-cover-mode" && item.pageState === "default");
  const list = viewFixtures.find((item) => item.routeId === "bookshelf-list-mode" && item.pageState === "default");
  assert.ok(cover && list, "bookshelf cover/list fixtures 应同时存在");

  const collectionOf = (fixture) => fixture.components
    .find((component) => component.type === "BookshelfShelfSection")
    ?.children.find((component) => component.id === "book-collection");
  const coverCollection = collectionOf(cover);
  const listCollection = collectionOf(list);
  assert.ok(coverCollection && listCollection, "cover/list 应共用稳定 book-collection");
  assert.equal(coverCollection.type, "BookGrid");
  assert.equal(listCollection.type, "BookGrid");
  assert.equal(listCollection.children.some((component) => component.type === "ListRow"), false);
  assert.deepEqual(
    coverCollection.children.map((component) => [component.type, component.id, component.props?.bookId, component.props?.semanticRole]),
    listCollection.children.map((component) => [component.type, component.id, component.props?.bookId, component.props?.semanticRole])
  );
  assert.deepEqual(coverCollection.children.map((component) => component.props?.viewMode), ["cover", "cover", "cover"]);
  assert.deepEqual(listCollection.children.map((component) => component.props?.viewMode), ["list", "list", "list"]);
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

test("control-layer-base-v2 is retired from contract fixtures (A2 strict removal)", () => {
  // A2 strict physical removal retired control-layer-base-v2 (MAJOR). It must
  // not keep a view-state fixture, and it must be absent from the route schema.
  // Its frontend-demo-optimized live renderer mapping is a separate historical
  // leak (see F0_FIGMA_FIRST_GAP_MATRIX) and is not re-admitted here.
  assert.equal(
    viewFixtures.some((item) => item.routeId === "control-layer-base-v2"),
    false,
    "control-layer-base-v2 must not keep a view-state fixture after retirement"
  );
  assert.ok(!routeSchema.properties.id.enum.includes("control-layer-base-v2"),
    "control-layer-base-v2 must be absent from route.schema.json after retirement");
});

test("control-layer-base-v2 真相源固定为 frontend-demo-optimized live renderer", () => {
  assert.match(
    frontendRuntimeSource,
    /"control-layer-base-v2":\s*\{\s*mode:\s*"control"\s*\}/,
    "live demo 必须把 control-layer-base-v2 映射为 reader control mode"
  );
  assert.match(frontendRuntimeSource, /function\s+readerControlMain\s*\(/, "live demo control sheet body 来源应为 readerControlMain()");
  assert.match(frontendRuntimeSource, /function\s+readerBottomSheetHtml\s*\(/, "live demo control sheet 宿主来源应为 readerBottomSheetHtml()");
  assert.match(frontendRuntimeSource, /function\s+readerBrightnessRail\s*\(/, "live demo control sheet 内的亮度栏来源应为 readerBrightnessRail()");
  assert.doesNotMatch(frontendRuntimeSource, /FloatingBrightness|FloatingQuickActions|FloatingPageControl/, "live demo 不应恢复旧浮动控制组件名");
});

test("reader full/utility routes 对齐 frontend-demo-optimized live 全屏控制窗", () => {
  const expected = new Map([
    ["reader-full-directory", "ReaderFullDirectoryPage"],
    ["reader-full-tts", "ReaderFullTtsPage"],
    ["reader-full-appearance", "ReaderFullAppearancePage"],
    ["reader-full-font", "ReaderFullAppearancePage"],
    ["reader-full-theme", "ReaderFullAppearancePage"],
    ["reader-full-theme-edit", "ReaderFullAppearancePage"],
    ["reader-full-layout", "ReaderFullAppearancePage"],
    ["reader-full-settings", "ReaderFullSettingsPage"],
    ["reader-full-page-turn", "ReaderFullSettingsPage"],
    ["reader-book-cache", "ReaderBookCachePage"],
    ["reader-debug-info", "ReaderDebugInfoPage"]
  ]);

  assert.match(frontendRuntimeSource, /function\s+readerFullPageScreen\s*\(/, "live demo 应存在 readerFullPageScreen()");
  assert.match(frontendRuntimeSource, /function\s+readerUtilityScreen\s*\(/, "live demo 应存在 readerUtilityScreen()");
  assert.match(frontendRuntimeSource, /fd-reader-full-page-panel/, "live demo full route 应使用 fd-reader-full-page-panel");
  assert.match(frontendRuntimeSource, /fd-reader-utility-panel/, "live demo utility route 应使用 fd-reader-utility-panel");

  for (const [routeId, componentType] of expected) {
    const entry = viewFixtures.find((item) => item.routeId === routeId && item.pageState === "default");
    assert.ok(entry, `${routeId}/default fixture 应存在`);
    assert.deepEqual(
      entry.components.map((component) => component.type),
      ["ReaderBase", "ReaderTopArea", componentType],
      `${routeId} 应渲染 live demo 全屏控制窗，不应复用底部模块面板`
    );
    assert.equal(
      entry.components.some((component) => component.type === "ReaderBottomBar"),
      false,
      `${routeId} 不应渲染 ReaderBottomBar`
    );
    for (const staleType of ["ReaderDirectoryPanel", "ReaderAppearancePanel", "ReaderTtsPanel", "ReaderSettingsPanel"]) {
      assert.equal(
        entry.components.some((component) => component.type === staleType),
        false,
        `${routeId} 不应回退到 quick/module panel：${staleType}`
      );
    }
  }
});

test("reader overlay routes are retired from contract fixtures (A2 strict removal)", () => {
  // A2 strict physical removal retired the 7 reader overlay routes (MAJOR).
  // They must not keep view-state fixtures and must be absent from the route
  // schema until their Figma-backed native conversion re-adds them.
  const retiredOverlays = [
    "reader-directory-overlay-v2",
    "reader-appearance-overlay-v2",
    "reader-tts-overlay-v2",
    "reader-settings-overlay-v2",
    "reader-search-overlay-v2",
    "reader-replace-overlay-v2",
    "reader-auto-scroll-overlay-v2",
  ];
  for (const routeId of retiredOverlays) {
    assert.equal(
      viewFixtures.some((item) => item.routeId === routeId),
      false,
      `${routeId} must not keep a view-state fixture after retirement`
    );
    assert.ok(!routeSchema.properties.id.enum.includes(routeId),
      `${routeId} must be absent from route.schema.json after retirement`);
  }
});

test("未隔离的非沉浸 Reader 路由把 ReaderTopArea 作为 overlay 组件声明", () => {
  const immersiveRoutes = new Set(["immersive-reading", "reader_content"]);
  const readerEntries = viewFixtures.filter((entry) =>
    entry.components.some((component) => component.type === "ReaderBase")
  );

  for (const entry of readerEntries) {
    const componentTypes = entry.components.map((component) => component.type);
    const isCanonicalReadingSurface = entry.components.some((component) =>
      component.props?.surfaceContract === "canonical-reading-surface"
    );
    if (immersiveRoutes.has(entry.routeId) || isCanonicalReadingSurface) {
      assert.equal(
        componentTypes.includes("ReaderTopArea"),
        false,
        `${entry.routeId}/${entry.pageState} 是 canonical ReadingSurface，不应混入 ReaderTopArea`
      );
    } else {
      assert.equal(
        componentTypes[1],
        "ReaderTopArea",
        `${entry.routeId}/${entry.pageState} 应在 ReaderBase 后声明 ReaderTopArea，对齐 live demo readerOverlayHost`
      );
    }
  }
});

test("状态页文案与 frontend-demo-optimized contract fixture 对齐", () => {
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
    ["source-detail/default", ["BackTopBar", "SourceDetailPage"]],
    ["source-import-options/default", ["BackTopBar", "SourceImportOptionsPage"]],
    ["source-settings-entry/default", ["BackTopBar", "SourceManagementPage"]],
    ["source-add/default", ["BackTopBar", "SourceImportOptionsPage"]],
    ["source-edit/default", ["BackTopBar", "SourceRuleEditPage"]],
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
    ["source-add/default", ["BackTopBar", "SourceImportOptionsPage"]],
    ["source-edit/default", ["BackTopBar", "SourceRuleEditPage"]],
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
    ["webdav-config/default", ["BackTopBar", "SyncBackupPage"]],
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
    if (routeId === "sync-backup" || routeId === "webdav-config") {
      assert.equal(entry.components[0].props.title, "同步与备份", `${key} 顶栏标题应对齐 live demo`);
    }
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

test("token.fixtures 中 name 全部匹配 --fd-ds- 前缀", () => {
  for (const item of tokenFixtures) {
    assert.ok(item.name.startsWith("--fd-ds-"), `token name=${item.name} 不匹配前缀`);
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
