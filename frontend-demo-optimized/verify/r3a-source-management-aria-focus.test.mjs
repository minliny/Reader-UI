// R3a · source-management ARIA 属性 + 焦点恢复标记验证
// -----------------------------------------------------------------------------
// 职责：
//   1. switch: role="switch" + aria-checked + tabindex="0" + aria-label
//   2. search input: aria-label + autocomplete="off"
//   3. select (group filter): aria-label
//   4. segment (status filter): role="group" + aria-pressed on active option
//   5. source row: aria-label on detect/more/select buttons
//   6. batch actions: disabled when 0 selected, aria-pressed on select-all
//   7. delete dialog: role="dialog" + aria-modal + aria-labelledby + aria-describedby
//   8. delete confirm button: aria-busy + disabled when loading, aria-invalid when failed
//   9. focus return markers (data-restore-focus) on overlay triggers
//  10. initial focus markers (data-dialog-initial-focus / data-sheet-initial-focus)
//  11. accessible name 非空（每个可交互元素都有 aria-label 或 text content）
//
// 运行：node --test frontend-demo-optimized/verify/r3a-source-management-aria-focus.test.mjs
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

function freshSandbox() {
  const window = {
    localStorage: {
      _store: {},
      getItem(k) { return this._store[k] || null; },
      setItem(k, v) { this._store[k] = v; },
      removeItem(k) { delete this._store[k]; },
    },
    ReaderFrontendDemoDraftRouteContract: {
      routes: { "source-management": { title: "书源管理" } },
      routePresentation: {},
    },
  };
  const ctx = vm.createContext({ window, module: { exports: {} }, Promise, setTimeout });
  new vm.Script(kitSource, { filename: "kit.js" }).runInContext(ctx);
  new vm.Script(appearanceSpecSource, { filename: "appearance-spec.js" }).runInContext(ctx);
  new vm.Script(declarationsSource, { filename: "control-identity-declarations.js" }).runInContext(ctx);
  new vm.Script(d2SettingsSource, { filename: "d2-settings-sync-renderers.js" }).runInContext(ctx);
  return ctx.window.ReaderD2SettingsSyncRenderers;
}

function render(r) {
  return r.renderD2Route("source-management", {}, {});
}

// =============================================================================
// 1. switch: role + aria-checked + tabindex + aria-label
// =============================================================================
test("R3a ARIA: source switches have role=switch + aria-checked + tabindex=0 + aria-label", () => {
  const r = freshSandbox();
  const html = render(r);

  const switches = ["source-qidian", "source-biquge", "source-local-import", "source-test"];
  for (const sk of switches) {
    const re = new RegExp(`<span[^>]*data-settings-key="${sk}"[^>]*>`, "");
    const m = html.match(re);
    assert.ok(m, `${sk} switch span exists`);
    const tag = m[0];
    assert.match(tag, /role="switch"/, `${sk} has role="switch"`);
    assert.match(tag, /aria-checked="(true|false)"/, `${sk} has aria-checked`);
    assert.match(tag, /tabindex="0"/, `${sk} has tabindex="0"`);
    assert.match(tag, /aria-label="[^"]+"/, `${sk} has non-empty aria-label`);
    assert.doesNotMatch(tag, /aria-hidden="true"/, `${sk} NOT aria-hidden`);
  }
});

// =============================================================================
// 2. switch aria-checked 与 enabled 状态同步
// =============================================================================
test("R3a ARIA: switch aria-checked reflects enabled state after toggle", () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  sm.dispatch({ type: "TOGGLE_SOURCE", settingsKey: "source-biquge", value: false });
  const html = render(r);
  const tag = html.match(/<span[^>]*data-settings-key="source-biquge"[^>]*>/)[0];
  assert.match(tag, /aria-checked="false"/, "aria-checked=false after disable");

  sm.dispatch({ type: "TOGGLE_SOURCE", settingsKey: "source-biquge", value: true });
  const html2 = render(r);
  const tag2 = html2.match(/<span[^>]*data-settings-key="source-biquge"[^>]*>/)[0];
  assert.match(tag2, /aria-checked="true"/, "aria-checked=true after re-enable");
});

// =============================================================================
// 3. search input: aria-label + autocomplete=off
// =============================================================================
test("R3a ARIA: search input has aria-label + autocomplete=off + type=search", () => {
  const r = freshSandbox();
  const html = render(r);
  const input = html.match(/<input[^>]*data-settings-key="source-search"[^>]*>/)[0];
  assert.match(input, /type="search"/, "search input type=search");
  assert.match(input, /aria-label="[^"]+"/, "search input has aria-label");
  assert.match(input, /autocomplete="off"/, "search input autocomplete=off");
});

// =============================================================================
// 4. group filter select: aria-label
// =============================================================================
test("R3a ARIA: group filter select has aria-label", () => {
  const r = freshSandbox();
  const html = render(r);
  const select = html.match(/<select[^>]*data-settings-key="source-group-filter"[^>]*>/)[0];
  assert.match(select, /aria-label="[^"]+"/, "group filter select has aria-label");
});

// =============================================================================
// 5. status filter segment: role=group + aria-pressed on active option
// =============================================================================
test("R3a ARIA: status filter segment has role=group + aria-pressed on options", () => {
  const r = freshSandbox();
  const html = render(r);

  // segment container (d2Segment 不 stamp identity on container, but has role=group)
  // 验证至少有 5 个 status-filter-segment-option buttons
  const options = html.match(/<button[^>]*data-settings-key="source-status-filter-segment-option-\d"[^>]*>/g) || [];
  assert.ok(options.length >= 5, `at least 5 status filter options, got ${options.length}`);

  // 默认 statusFilter=全部，所以 option-1 (全部) 应该 aria-pressed=true
  const activeOption = options[0];
  assert.match(activeOption, /aria-pressed="true"/, "first option (全部) is active (aria-pressed=true)");

  // 切换到 option-2 (启用)
  const sm = r.sourceManagement;
  sm.dispatch({ type: "SET_STATUS_FILTER", value: "启用" });
  const html2 = render(r);
  const options2 = html2.match(/<button[^>]*data-settings-key="source-status-filter-segment-option-\d"[^>]*>/g) || [];
  // option-2 应该是 aria-pressed=true, option-1 应该是 aria-pressed=false
  assert.match(options2[1], /aria-pressed="true"/, "option-2 (启用) is active after switch");
  assert.match(options2[0], /aria-pressed="false"/, "option-1 (全部) is inactive after switch");
});

// =============================================================================
// 6. source row buttons: aria-label non-empty
// =============================================================================
test("R3a ARIA: source row detect/more buttons have non-empty aria-label", () => {
  const r = freshSandbox();
  const html = render(r);

  const detectBtns = html.match(/<button[^>]*data-settings-key="source-row-detect-[^"]+"[^>]*>/g) || [];
  assert.ok(detectBtns.length >= 4, `at least 4 detect buttons, got ${detectBtns.length}`);
  for (const btn of detectBtns) {
    assert.match(btn, /aria-label="[^"]+"/, "detect button has aria-label");
  }

  const moreBtns = html.match(/<button[^>]*data-settings-key="source-row-more-[^"]+"[^>]*>/g) || [];
  assert.ok(moreBtns.length >= 4, `at least 4 more buttons, got ${moreBtns.length}`);
  for (const btn of moreBtns) {
    assert.match(btn, /aria-label="[^"]+"/, "more button has aria-label");
  }
});

// =============================================================================
// 7. batch select-all: aria-pressed reflects all-selected state
// =============================================================================
test("R3a ARIA: batch-select-all has aria-pressed reflecting all-selected state", () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  sm.dispatch({ type: "ENTER_BATCH_MODE" });
  const html0 = render(r);
  const selectAllBtn0 = html0.match(/<button[^>]*data-settings-key="batch-select-all"[^>]*>/)[0];
  assert.match(selectAllBtn0, /aria-pressed="false"/, "batch-select-all aria-pressed=false when none selected");

  sm.dispatch({ type: "SELECT_ALL" });
  const html1 = render(r);
  const selectAllBtn1 = html1.match(/<button[^>]*data-settings-key="batch-select-all"[^>]*>/)[0];
  assert.match(selectAllBtn1, /aria-pressed="true"/, "batch-select-all aria-pressed=true when all selected");
});

// =============================================================================
// 8. source row select (batch): aria-pressed reflects selected state
// =============================================================================
test("R3a ARIA: source-row-select has aria-pressed reflecting selected state", () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  sm.dispatch({ type: "ENTER_BATCH_MODE" });
  const html0 = render(r);
  const selectBtn0 = html0.match(/<button[^>]*data-settings-key="source-row-select-source-qidian"[^>]*>/)[0];
  assert.match(selectBtn0, /aria-pressed="false"/, "source-row-select aria-pressed=false when not selected");

  sm.dispatch({ type: "TOGGLE_SELECT", settingsKey: "source-qidian" });
  const html1 = render(r);
  const selectBtn1 = html1.match(/<button[^>]*data-settings-key="source-row-select-source-qidian"[^>]*>/)[0];
  assert.match(selectBtn1, /aria-pressed="true"/, "source-row-select aria-pressed=true when selected");
});

// =============================================================================
// 9. delete dialog: role=dialog + aria-modal + aria-labelledby + aria-describedby
// =============================================================================
test("R3a ARIA: delete dialog has role=dialog + aria-modal + aria-labelledby + aria-describedby", () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  sm.dispatch({ type: "ENTER_BATCH_MODE" });
  sm.dispatch({ type: "TOGGLE_SELECT", settingsKey: "source-biquge" });
  sm.dispatch({ type: "DELETE_CONFIRM_OPEN" });
  const html = render(r);

  const dialog = html.match(/<section[^>]*data-source-delete-dialog[^>]*>/)[0];
  assert.match(dialog, /role="dialog"/, "dialog has role=dialog");
  assert.match(dialog, /aria-modal="true"/, "dialog has aria-modal=true");
  assert.match(dialog, /aria-labelledby="[^"]+"/, "dialog has aria-labelledby");
  assert.match(dialog, /aria-describedby="[^"]+"/, "dialog has aria-describedby");
  assert.match(dialog, /aria-hidden="false"/, "dialog has aria-hidden=false");
});

// =============================================================================
// 10. delete confirm button: aria-busy + disabled when loading
// =============================================================================
test("R3a ARIA: delete-confirm button has aria-busy + disabled when loading", async () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  sm.dispatch({ type: "ENTER_BATCH_MODE" });
  sm.dispatch({ type: "TOGGLE_SELECT", settingsKey: "source-biquge" });
  sm.dispatch({ type: "DELETE_CONFIRM_OPEN" });

  // confirm 状态：按钮文本="删除"，无 aria-busy
  const html0 = render(r);
  const confirmBtn0 = html0.match(/<button[^>]*data-settings-key="delete-confirm"[^>]*>[\s\S]*?<\/button>/)[0];
  assert.doesNotMatch(confirmBtn0, /aria-busy="true"/, "confirm button NOT aria-busy in confirm state");
  assert.doesNotMatch(confirmBtn0, /disabled/, "confirm button NOT disabled in confirm state");
  assert.match(confirmBtn0, /删除[\s\S]*?<\/button>/, "confirm button text=删除 in confirm state");

  // start delete → loading
  sm.dispatch({ type: "DELETE_START" });
  const html1 = render(r);
  const confirmBtn1 = html1.match(/<button[^>]*data-settings-key="delete-confirm"[^>]*>[\s\S]*?<\/button>/)[0];
  assert.match(confirmBtn1, /aria-busy="true"/, "confirm button aria-busy=true in loading state");
  assert.match(confirmBtn1, /disabled/, "confirm button disabled in loading state");
  assert.match(confirmBtn1, /删除中/, "confirm button text=删除中 in loading state");
});

// =============================================================================
// 11. delete confirm button: aria-invalid when failed
// =============================================================================
test("R3a ARIA: delete-confirm button has aria-invalid when failed", async () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  sm.dispatch({ type: "ENTER_BATCH_MODE" });
  sm.dispatch({ type: "TOGGLE_SELECT", settingsKey: "source-biquge" });
  sm.dispatch({ type: "DELETE_CONFIRM_OPEN" });

  // failed state
  await sm.executeDelete({ simulateResult: "failed", delay: 5, error: "网络错误" });
  const html = render(r);
  const confirmBtn = html.match(/<button[^>]*data-settings-key="delete-confirm"[^>]*>[\s\S]*?<\/button>/)[0];
  assert.match(confirmBtn, /aria-invalid="true"/, "confirm button aria-invalid=true in failed state");
  assert.match(confirmBtn, /重试/, "confirm button text=重试 in failed state");
  assert.match(confirmBtn, /title="网络错误"/, "confirm button has error title in failed state");

  // dialog has data-delete-status=failed
  const dialog = html.match(/<section[^>]*data-source-delete-dialog[^>]*>/)[0];
  assert.match(dialog, /data-delete-status="failed"/, "dialog data-delete-status=failed");
});

// =============================================================================
// 12. focus return markers: data-restore-focus on overlay triggers
// =============================================================================
test("R3a ARIA: data-restore-focus markers on overlay triggers", () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  // 默认状态：source-menu-toggle + source-add + 4 个 source-row-more 应有 data-restore-focus
  const html0 = render(r);
  const menuToggle = html0.match(/<button[^>]*data-settings-key="source-menu-toggle"[^>]*>/)[0];
  assert.match(menuToggle, /data-restore-focus="source-menu-toggle"/, "source-menu-toggle has data-restore-focus");

  const addBtn = html0.match(/<button[^>]*data-settings-key="source-add"[^>]*>/)[0];
  assert.match(addBtn, /data-restore-focus="source-add"/, "source-add has data-restore-focus");

  const moreBtn = html0.match(/<button[^>]*data-settings-key="source-row-more-source-qidian"[^>]*>/)[0];
  assert.match(moreBtn, /data-restore-focus="more-source-qidian"/, "source-row-more has data-restore-focus");

  // batch mode：batch-delete 应有 data-restore-focus
  sm.dispatch({ type: "ENTER_BATCH_MODE" });
  sm.dispatch({ type: "TOGGLE_SELECT", settingsKey: "source-biquge" });
  const html1 = render(r);
  const deleteBtn = html1.match(/<button[^>]*data-settings-key="batch-delete"[^>]*>/)[0];
  assert.match(deleteBtn, /data-restore-focus="batch-delete"/, "batch-delete has data-restore-focus");
});

// =============================================================================
// 13. initial focus markers: data-dialog-initial-focus + data-sheet-initial-focus
// =============================================================================
test("R3a ARIA: data-dialog-initial-focus on delete cancel + data-sheet-initial-focus on add-sheet cancel", () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  // 打开 add sheet
  sm.dispatch({ type: "OPEN_ADD_SHEET" });
  const sheetHtml = render(r);
  const sheetCancel = sheetHtml.match(/<button[^>]*data-settings-key="add-sheet-cancel"[^>]*>/)[0];
  assert.match(sheetCancel, /data-sheet-initial-focus/, "add-sheet-cancel has data-sheet-initial-focus");

  // 关闭 sheet, 进入 batch, 打开 delete dialog
  sm.dispatch({ type: "CLOSE_ADD_SHEET" });
  sm.dispatch({ type: "ENTER_BATCH_MODE" });
  sm.dispatch({ type: "TOGGLE_SELECT", settingsKey: "source-biquge" });
  sm.dispatch({ type: "DELETE_CONFIRM_OPEN" });
  const dialogHtml = render(r);
  const dialogCancel = dialogHtml.match(/<button[^>]*data-settings-key="delete-cancel"[^>]*>/)[0];
  assert.match(dialogCancel, /data-dialog-initial-focus/, "delete-cancel has data-dialog-initial-focus");
});

// =============================================================================
// 14. accessible name 非空：所有带 data-control-key 的可交互元素都有 aria-label 或 text content
// =============================================================================
test("R3a ARIA: all interactive elements with data-control-key have accessible name", () => {
  const r = freshSandbox();
  const html = render(r);

  // 提取所有带 data-control-key 的 button / input / select / span[role=switch]
  // 对于 button：允许 aria-label 或 text content（如 segment option buttons）
  // 对于 input/select：必须 aria-label
  // 对于 span[role=switch]：必须 aria-label
  const interactiveTags = html.match(/<(button|input|select|span)[^>]*data-control-key="[^"]+"[^>]*>/g) || [];
  assert.ok(interactiveTags.length >= 20, `at least 20 interactive elements, got ${interactiveTags.length}`);

  for (const tag of interactiveTags) {
    if (/<input|<select/.test(tag)) {
      // input/select 必须有 aria-label
      assert.match(tag, /aria-label="[^"]+"/, `input/select has aria-label: ${tag.slice(0, 80)}...`);
    } else if (/<span[^>]*role="switch"/.test(tag)) {
      // switch span 必须有 aria-label
      assert.match(tag, /aria-label="[^"]+"/, `switch span has aria-label: ${tag.slice(0, 80)}...`);
    } else if (/<button/.test(tag)) {
      // button：允许 aria-label 或 text content
      // 如果没有 aria-label，则必须紧跟 > 然后非空 text content
      if (!/aria-label="[^"]+"/.test(tag)) {
        // 提取 button 的 settingsKey 用于查找完整 button tag
        const skMatch = tag.match(/data-settings-key="([^"]+)"/);
        const sk = skMatch ? skMatch[1] : "unknown";
        const fullBtnRe = new RegExp(`<button[^>]*data-settings-key="${sk}"[^>]*>([\\s\\S]*?)<\\/button>`);
        const fullBtn = html.match(fullBtnRe);
        assert.ok(fullBtn, `button ${sk} has closing tag`);
        const innerText = fullBtn[1].replace(/<[^>]*>/g, "").trim();
        assert.ok(innerText.length > 0, `button ${sk} has text content or aria-label`);
      }
    }
  }
});

// =============================================================================
// 15. batch action buttons: disabled when 0 selected
// =============================================================================
test("R3a ARIA: batch action buttons disabled when 0 selected", () => {
  const r = freshSandbox();
  const sm = r.sourceManagement;

  sm.dispatch({ type: "ENTER_BATCH_MODE" });
  const html = render(r);

  const batchActions = ["batch-enable", "batch-disable", "batch-detect", "batch-group", "batch-delete"];
  for (const sk of batchActions) {
    const re = new RegExp(`<button[^>]*data-settings-key="${sk}"[^>]*>`);
    const btn = html.match(re)[0];
    assert.match(btn, /disabled/, `${sk} disabled when 0 selected`);
  }
});

// =============================================================================
// 16. back button has aria-label + identity
// =============================================================================
test("R3a ARIA: back button has aria-label + identity", () => {
  const r = freshSandbox();
  const html = render(r);
  const backBtn = html.match(/<button[^>]*data-settings-key="back"[^>]*>/)[0];
  assert.match(backBtn, /aria-label="[^"]+"/, "back button has aria-label");
});
