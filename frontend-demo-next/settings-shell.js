(function attachReaderSettingsShell(window) {
  "use strict";

  // B1 · Settings Operations — Control Identity registry + native control helpers +
  // DOM post-processing. Consumes the frozen A2 control-id-registry.json (commit
  // c7c2730) for the four Settings page families: settings-general,
  // source-management, webdav-config, sync-backup.
  //
  // Strategy: rather than editing the shared render-runtime.js (15,916 lines,
  // co-owned by B1/B2/B3/B4), settings-shell.js installs a MutationObserver on
  // #frontend-demo-root. After each render, the observer detects the active route
  // via the backTopBar <h1> text, then stamps data-control-id / data-ui-event /
  // data-state-owner / data-async-state onto every operable control and upgrades
  // the legacy non-semantic <span class="fd-settings-switch"> to native
  // role="switch" + aria-checked. Existing data-* hooks (data-settings-overlay,
  // data-source-switch, data-route, ...) are preserved so existing event
  // bindings keep working.

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // --- Canonical UiEvent vocabulary (B1 · Settings Operations) -----------------
  // All names below MUST appear in contracts/ui-event.schema.json enum so the
  // verify script can assert full contract coverage. Names that previously
  // appeared in the v1 helper (settings.preference.toggle, webdav.connection.test,
  // source.enabled.toggle, ...) were not in the enum and have been remapped to
  // the closest frozen enum value.
  var UI_EVENTS = Object.freeze({
    ROUTE_POP: "route.pop",
    ROUTE_PUSH: "route.push",
    SETTINGS_TOGGLE: "toggle.switch",
    SETTINGS_SELECT: "dropdown.option.select",
    SETTINGS_SEGMENT: "segment.item.switch",
    SETTINGS_STEPPER: "stepper.press",
    SETTINGS_INPUT: "input.submit",
    SETTINGS_RESET: "button.activate",
    SETTINGS_PERMISSION_OPEN: "settings.capability.open",
    SETTINGS_CACHE_CLEAR: "settings.cache.clear",
    SETTINGS_OPTION_PICK: "dropdown.option.select",
    WEBDAV_TEST: "webdav.config.test",
    WEBDAV_SAVE: "webdav.config.save",
    WEBDAV_INPUT: "input.submit",
    SYNC_BACKUP_OPEN: "settings.sync.open",
    SOURCE_DETECT: "source.detect.run",
    SOURCE_IMPORT_OPEN: "source.import.open",
    SOURCE_EXPORT_OPEN: "button.activate",
    SOURCE_GROUPS_OPEN: "button.activate",
    SOURCE_LOGS_OPEN: "source.logs.open",
    SOURCE_ADD_OPEN: "source.add.open",
    SOURCE_DELETE_OPEN: "source.delete.confirm",
    SOURCE_TOGGLE: "toggle.switch",
    SOURCE_SORT: "dropdown.option.select",
    SOURCE_FILTER: "filter.apply.commit",
    SOURCE_SEARCH: "source.search.submit",
    SOURCE_MENU: "dropdown.expand",
    SOURCE_SELECT_ROW: "selection.item.toggle",
    SOURCE_SELECT_ALL: "selection.group.toggle",
    SOURCE_DELETE_CONFIRM: "source.delete.confirm",
    RESTORE_RECORD_OPEN: "restore.run"
  });

  var STATE_OWNERS = Object.freeze({
    LOCAL: "local-state",
    SETTINGS_STORE: "settings-store",
    SOURCE_STORE: "source-store",
    SYNC_STORE: "sync-store",
    CORE_COMMAND: "core-command",
    HOST_REQUEST: "host-request"
  });

  var ASYNC_STATES = Object.freeze({
    IDLE: "idle",
    BUSY: "busy",
    SUCCESS: "success",
    ERROR: "error",
    STALE: "stale"
  });

  // --- Frozen controlId registry (A2 commit c7c2730) ---------------------------
  var REGISTRY = Object.freeze({
    "settings-general": {
      "__back__": "settings.button.settings-general.default.phone.button.h-87355d8c",
      "__reset__": "settings.button.settings-general.default.phone.button.settings-overlay-dialog-h-db962377",
      "App主题": "settings.generic-button.settings-general.default.phone.group.h-18903315",
      "语言": "settings.generic-button.settings-general.default.phone.group.h-517b3c00",
      "启动时打开": "settings.generic-button.settings-general.default.phone.group.h-a3f78c83",
      "自动检查更新": "settings.generic-button.settings-general.default.phone.group.h-0b898597",
      "点击当前底栏回顶部": "settings.generic-button.settings-general.default.phone.group.h-573e1fe6",
      "减少动态效果": "settings.generic-button.settings-general.default.phone.group.h-adcd2c30",
      "崩溃日志": "settings.generic-button.settings-general.default.phone.group.h-36623fd3",
      "动画效果": "settings.generic-button.settings-general.default.phone.group.h-3acd2da0",
      "缓存清理": "settings.button.settings-general.default.phone.button.settings-overlay-dialogcache-clear-h-c95f13f3",
      "文件访问": "settings.listrow-action.settings-general.default.phone.button.settings-overlay-dialogfile-access-permission-h-098397b9",
      "文件访问:action": "settings.button.settings-general.default.phone.button.h-49da473a",
      "通知权限": "settings.listrow-action.settings-general.default.phone.button.settings-overlay-dialognotification-permission-h-c44d060d",
      "通知权限:action": "settings.button.settings-general.default.phone.button.h-9db1cb5e",
      "电池优化": "settings.listrow-action.settings-general.default.phone.button.settings-overlay-dialogbattery-permission-h-ba7ac182",
      "电池优化:action": "settings.button.settings-general.default.phone.button.h-df53e6df"
    },
    "source-management": {
      "__back__": "source.button.source-management.default.phone.button.h-8583e2f4",
      "__detect_all__": "source.listrow-action.source-management.default.phone.button.route-source-detect-h-94754e58",
      "__detect_action__": "source.button.source-management.default.phone.button.h-df156bb2",
      "__import_row__": "source.listrow-action.source-management.default.phone.button.route-source-import-export-h-e28fc0b2",
      "__import_action__": "source.button.source-management.default.phone.button.h-bb820ede",
      "__export_row__": "source.listrow-action.source-management.default.phone.button.route-source-import-export-h-a00b52d6",
      "__export_action__": "source.button.source-management.default.phone.button.h-f6af02c4",
      "__groups_row__": "source.listrow-action.source-management.default.phone.button.route-source-groups-h-c4cb809e",
      "__groups_action__": "source.button.source-management.default.phone.button.h-3228aec4",
      "__logs_row__": "source.listrow-action.source-management.default.phone.button.route-source-logs-h-4220a27e",
      "__logs_action__": "source.button.source-management.default.phone.button.h-00497566",
      "__add__": "source.button.source-management.default.phone.button.route-source-add-h-af460bee",
      "__batch_delete__": "source.button.source-management.default.phone.button.route-source-delete-confirm-h-42aa8871",
      "起点中文网": "source.generic-button.source-management.default.phone.group.h-fa1a799c",
      "笔趣阁": "source.generic-button.source-management.default.phone.group.h-87f9ad74",
      "本地导入源": "source.generic-button.source-management.default.phone.group.h-8c0f87a0",
      "测试书源": "source.generic-button.source-management.default.phone.group.h-be83f489"
    },
    "webdav-config": {
      "__back__": "sync.button.webdav-config.default.phone.button.h-24342538",
      "服务器地址": "sync.textbox.webdav-config.default.phone.textbox.h-d30e2ce3",
      "账号": "sync.textbox.webdav-config.default.phone.textbox.h-f490ddbe",
      "密码": "sync.textbox.webdav-config.default.phone.textbox.h-98770a31",
      "同步目录": "sync.textbox.webdav-config.default.phone.textbox.h-92c33b9d",
      "__test__": "sync.button.webdav-config.default.phone.button.settings-overlay-dialogwebdav-test-h-0821cb81",
      "__save__": "sync.button.webdav-config.default.phone.button.settings-overlay-dialogwebdav-save-h-d41f7c24",
      "__stepper_dec__": "sync.button.webdav-config.default.phone.button.h-6e828ba1",
      "__stepper_inc__": "sync.button.webdav-config.default.phone.button.h-7895b86f",
      "__dialog_cancel__": "sync.button.webdav-config.default.phone.button.h-280671a5",
      "__dialog_confirm__": "sync.button.webdav-config.default.phone.button.h-9a6e40af",
      "证书校验": "sync.generic-button.webdav-config.default.phone.group.h-c8881f6f",
      "连接超时": "sync.generic-button.webdav-config.default.phone.group.h-e0c0ccaf",
      "仅 Wi-Fi 同步": "sync.generic-button.webdav-config.default.phone.group.h-968f3b54",
      "自动同步": "sync.generic-button.webdav-config.default.phone.group.h-8dc9c430"
    },
    "sync-backup": {
      "__back__": "sync.button.sync-backup.default.phone.button.h-8646aec8",
      "服务器地址": "sync.textbox.sync-backup.default.phone.textbox.h-1bff38d9",
      "账号": "sync.textbox.sync-backup.default.phone.textbox.h-78a87582",
      "密码": "sync.textbox.sync-backup.default.phone.textbox.h-fb59dd84",
      "同步目录": "sync.textbox.sync-backup.default.phone.textbox.h-144f7bed",
      "__test__": "sync.button.sync-backup.default.phone.button.settings-overlay-dialogwebdav-test-h-141c8f08",
      "__save__": "sync.button.sync-backup.default.phone.button.settings-overlay-dialogwebdav-save-h-3f09f43c",
      "__restore:WebDAV · 2026-06-23 08:00 · 完整备份__": "sync.listrow-action.sync-backup.default.phone.button.route-restore-confirm-h-a6b96bfb",
      "__restore:本地 · 2026-06-23 10:30 · 完整备份__": "sync.listrow-action.sync-backup.default.phone.button.route-restore-confirm-h-8cc84dbf",
      "__restore:WebDAV · 2026-06-21 22:30 · 书架与设置__": "sync.listrow-action.sync-backup.default.phone.button.route-restore-confirm-h-9f2c4a88",
      "__restore:WebDAV · 2026-06-16 02:00 · 完整备份__": "sync.listrow-action.sync-backup.default.phone.button.route-restore-confirm-h-bdd6c90c",
      "__restore:本地 · 2026-06-20 09:40 · 阅读进度__": "sync.listrow-action.sync-backup.default.phone.button.route-restore-confirm-h-e8272b6b",
      "__restore:WebDAV · 2026-06-12 18:10 · 书源配置__": "sync.listrow-action.sync-backup.default.phone.button.route-restore-confirm-h-888ebf01"
    }
  });

  var B1_ROUTES = Object.freeze({
    "settings-general": true,
    "source-management": true,
    "source-settings-entry": true,
    "webdav-config": true,
    "sync-backup": true,
    "source-delete-confirm": true
  });

  function isSettingsDomainRoute(route) {
    return Object.prototype.hasOwnProperty.call(B1_ROUTES, route);
  }

  function lookupControlId(route, key) {
    var table = REGISTRY[route];
    if (!table) return null;
    var id = table[key];
    return id || null;
  }

  // --- HTML attribute helpers (used by native* helpers and verify tests) -------

  function attr(name, value) {
    if (value === false || value == null || value === "") return "";
    if (value === true) return " " + name;
    return " " + name + "=\"" + esc(value) + "\"";
  }

  function controlAttrs(config) {
    if (!config || !config.controlId) return "";
    var parts = [attr("data-control-id", config.controlId)];
    if (config.uiEvent) parts.push(attr("data-ui-event", config.uiEvent));
    if (config.stateOwner) parts.push(attr("data-state-owner", config.stateOwner));
    if (config.asyncState) parts.push(attr("data-async-state", config.asyncState));
    if (config.danger) parts.push(attr("data-danger-confirm", "true"));
    if (config.focusKey) parts.push(attr("data-focus-restore-key", config.focusKey));
    if (config.repeatTapGuard) parts.push(attr("data-repeat-tap-guard", "true"));
    return parts.join("");
  }

  // --- Native control HTML helpers (used by verify tests; renderer may also call) ---

  function nativeSwitch(config) {
    var checked = Boolean(config.checked);
    var disabled = Boolean(config.disabled);
    var busy = Boolean(config.busy);
    var cls = "fd-settings-switch" + (checked ? " is-on" : "") + (busy ? " is-busy" : "") + (config.className ? " " + config.className : "");
    var ariaDisabled = disabled || busy ? "true" : null;
    var asyncState = busy ? ASYNC_STATES.BUSY : (config.asyncState || null);
    var extraAttrs = config.extraAttrs || "";
    return "<button" +
      " class=\"" + esc(cls) + "\"" +
      " type=\"button\"" +
      " role=\"switch\"" +
      attr("aria-checked", checked ? "true" : "false") +
      attr("aria-disabled", ariaDisabled) +
      attr("aria-label", config.ariaLabel || config.title || null) +
      attr("aria-busy", busy ? "true" : null) +
      controlAttrs(config) +
      extraAttrs +
      "><i aria-hidden=\"true\"></i></button>";
  }

  function nativeSelectTrigger(config) {
    var cls = "fd-setting-row is-select" + (config.optionOpen ? " is-option-open" : "") + (config.danger ? " is-danger" : "");
    var extraAttrs = config.extraAttrs || "";
    return "<article" +
      " class=\"" + esc(cls) + "\"" +
      " role=\"combobox\"" +
      attr("aria-expanded", config.optionOpen ? "true" : "false") +
      attr("aria-haspopup", "listbox") +
      attr("aria-label", config.title || null) +
      attr("aria-disabled", config.disabled ? "true" : null) +
      " tabindex=\"" + (config.disabled ? "-1" : "0") + "\"" +
      controlAttrs(config) +
      extraAttrs +
      ">";
  }

  function nativeSegment(config) {
    var controlId = config.controlId || null;
    var disabled = Boolean(config.disabled);
    var cls = "fd-settings-segment" + (config.className ? " " + config.className : "");
    var groupAttrs = attr("role", "group") + attr("aria-label", config.title || null) + controlAttrs({ controlId: controlId, uiEvent: config.uiEvent, stateOwner: config.stateOwner });
    var buttons = (config.options || []).map(function (option) {
      var selected = option === config.value;
      return "<button" +
        " class=\"" + (selected ? "is-active" : "") + "\"" +
        " type=\"button\"" +
        attr("aria-pressed", selected ? "true" : "false") +
        attr("aria-disabled", disabled ? "true" : null) +
        attr("data-segment-value", option) +
        ">" + esc(option) + "</button>";
    }).join("");
    return "<span class=\"" + esc(cls) + "\"" + groupAttrs + ">" + buttons + "</span>";
  }

  function nativeStepper(config) {
    var cls = "fd-settings-stepper" + (config.className ? " " + config.className : "");
    var disabled = Boolean(config.disabled);
    var busy = Boolean(config.busy);
    var decDisabled = disabled || busy || (config.atMin === true);
    var incDisabled = disabled || busy || (config.atMax === true);
    var groupAttrs = attr("role", "group") + attr("aria-label", config.title || null) +
      controlAttrs({ controlId: config.controlId, uiEvent: config.uiEvent, stateOwner: config.stateOwner, asyncState: busy ? ASYNC_STATES.BUSY : config.asyncState });
    return "<span class=\"" + esc(cls) + "\"" + groupAttrs + ">" +
      "<button type=\"button\"" +
      attr("data-stepper-action", "decrement") +
      attr("aria-label", "减少" + (config.title || "")) +
      attr("aria-disabled", decDisabled ? "true" : null) +
      controlAttrs({ controlId: config.decControlId, uiEvent: UI_EVENTS.SETTINGS_STEPPER, stateOwner: config.stateOwner }) +
      ">" + esc(config.minLabel || "-") + "</button>" +
      "<strong aria-live=\"polite\">" + esc(config.value) + "</strong>" +
      "<button type=\"button\"" +
      attr("data-stepper-action", "increment") +
      attr("aria-label", "增加" + (config.title || "")) +
      attr("aria-disabled", incDisabled ? "true" : null) +
      controlAttrs({ controlId: config.incControlId, uiEvent: UI_EVENTS.SETTINGS_STEPPER, stateOwner: config.stateOwner }) +
      ">" + esc(config.maxLabel || "+") + "</button>" +
      "</span>";
  }

  function nativeInput(config) {
    var inputType = ["text", "url", "password", "search", "email"].includes(config.inputType) ? config.inputType : "text";
    var disabled = Boolean(config.disabled);
    var readonly = Boolean(config.readonly);
    var error = Boolean(config.error);
    var busy = Boolean(config.busy);
    var cls = "fd-setting-row is-input-field" + (error ? " is-error" : "") + (config.className ? " " + config.className : "");
    var labelAttrs = controlAttrs({ controlId: config.controlId, uiEvent: config.uiEvent, stateOwner: config.stateOwner, asyncState: busy ? ASYNC_STATES.BUSY : config.asyncState });
    return "<label class=\"" + esc(cls) + "\"" + labelAttrs + ">" +
      "<span>" + (config.iconHtml || "") + "</span>" +
      "<strong>" + esc(config.title) + (config.meta ? "<small>" + esc(config.meta) + "</small>" : "") + "</strong>" +
      "<input type=\"" + esc(inputType) + "\"" +
      " value=\"" + esc(config.value || "") + "\"" +
      attr("placeholder", config.placeholder || null) +
      attr("aria-label", config.title || null) +
      attr("aria-disabled", disabled ? "true" : null) +
      attr("aria-readonly", readonly ? "true" : null) +
      attr("aria-invalid", error ? "true" : null) +
      attr("aria-busy", busy ? "true" : null) +
      attr("data-control-id", config.controlId || null) +
      attr("data-ui-event", config.uiEvent || null) +
      (disabled ? " disabled" : "") +
      (readonly ? " readonly" : "") +
      " autocomplete=\"off\">" +
      (config.error ? "<em class=\"fd-settings-input-error\">" + esc(config.error) + "</em>" : "") +
      "</label>";
  }

  function asyncBadge(state, label) {
    var tone = state === ASYNC_STATES.BUSY ? "info"
      : state === ASYNC_STATES.SUCCESS ? "good"
      : state === ASYNC_STATES.ERROR ? "warn"
      : state === ASYNC_STATES.STALE ? "muted"
      : null;
    if (!tone) return "";
    return "<span class=\"fd-settings-async-badge is-" + tone + "\" data-async-state=\"" + esc(state) + "\" aria-live=\"polite\">" + esc(label || state) + "</span>";
  }

  // --- Focus restore helpers ---------------------------------------------------
  function focusRestoreAttrs(key) {
    return key ? attr("data-focus-restore-key", key) : "";
  }

  function restoreFocus(root, fallbackSelector) {
    if (!root || !root.querySelector) return null;
    var lastFocused = root.querySelector("[data-focus-restore-key][data-was-focused=\"true\"]");
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
      return lastFocused;
    }
    if (fallbackSelector) {
      var fallback = root.querySelector(fallbackSelector);
      if (fallback && typeof fallback.focus === "function") {
        fallback.focus();
        return fallback;
      }
    }
    return null;
  }

  function markFocusedControl(root) {
    if (!root || !root.querySelector) return;
    var markers = root.querySelectorAll("[data-was-focused=\"true\"]");
    for (var i = 0; i < markers.length; i++) {
      markers[i].removeAttribute("data-was-focused");
    }
    var active = (root.ownerDocument || document).activeElement;
    if (active && root.contains(active) && active.hasAttribute("data-focus-restore-key")) {
      active.setAttribute("data-was-focused", "true");
    }
  }

  function repeatTapGuardAttrs(enabled) {
    return enabled ? attr("data-repeat-tap-guard", "true") : "";
  }

  function staleResultAttrs(stale) {
    return stale ? attr("data-stale-result", "true") : "";
  }

  // ===========================================================================
  // DOM post-processing — stamps data-control-id + native ARIA semantics after
  // render-runtime.js emits HTML. Avoids editing the shared 15,916-line file.
  // ===========================================================================

  function setAttr(el, name, value) {
    if (!el || !el.setAttribute) return;
    if (value === false || value == null || value === "") {
      el.removeAttribute(name);
      return;
    }
    el.setAttribute(name, value === true ? "true" : String(value));
  }

  function stampIdentity(el, config) {
    if (!el || !config || !config.controlId) return;
    setAttr(el, "data-control-id", config.controlId);
    if (config.uiEvent) setAttr(el, "data-ui-event", config.uiEvent);
    if (config.stateOwner) setAttr(el, "data-state-owner", config.stateOwner);
    if (config.asyncState) setAttr(el, "data-async-state", config.asyncState);
    if (config.danger) setAttr(el, "data-danger-confirm", "true");
    if (config.focusKey) setAttr(el, "data-focus-restore-key", config.focusKey);
    if (config.repeatTapGuard) setAttr(el, "data-repeat-tap-guard", "true");
    if (config.staleResult) setAttr(el, "data-stale-result", "true");
  }

  // Read the row title from a .fd-setting-row <article>: the first <strong> child text.
  function rowTitle(rowEl) {
    if (!rowEl) return "";
    var strong = rowEl.querySelector("strong");
    if (!strong) return "";
    // Use textContent of <strong> only (exclude nested <small> meta).
    var clone = strong.cloneNode(true);
    var smalls = clone.querySelectorAll("small");
    for (var i = 0; i < smalls.length; i++) {
      smalls[i].remove();
    }
    return String(clone.textContent || "").trim();
  }

  // Upgrade legacy <span class="fd-settings-switch" aria-hidden="true"> to native
  // <button role="switch" aria-checked="...">. We mutate the span in-place by
  // changing its tag name via outerHTML replacement, then re-query the new node.
  // To stay idempotent, we check for role="switch" and skip if already upgraded.
  function upgradeSwitch(span, config) {
    if (!span || !span.classList || !span.classList.contains("fd-settings-switch")) return null;
    if (span.getAttribute("role") === "switch") {
      // Already upgraded; just stamp identity.
      stampIdentity(span, config);
      return span;
    }
    var isOn = span.classList.contains("is-on");
    var ariaLabel = config && config.ariaLabel ? config.ariaLabel : "";
    var html = "<button" +
      " class=\"" + span.className + "\"" +
      " type=\"button\"" +
      " role=\"switch\"" +
      " aria-checked=\"" + (isOn ? "true" : "false") + "\"" +
      (ariaLabel ? " aria-label=\"" + esc(ariaLabel) + "\"" : "") +
      "><i aria-hidden=\"true\"></i></button>";
    var outer = span.outerHTML;
    if (span.outerHTML === outer) return span;
    span.outerHTML = html;
    // The original span is now detached; caller should re-query.
    return null;
  }

  // Upgrade <span class="fd-settings-segment"> to role="group" with aria-pressed
  // on each button. Stamps controlId on the group container.
  function upgradeSegment(span, config) {
    if (!span || !span.classList || !span.classList.contains("fd-settings-segment")) return;
    setAttr(span, "role", "group");
    if (config && config.ariaLabel) setAttr(span, "aria-label", config.ariaLabel);
    stampIdentity(span, config);
    var buttons = span.querySelectorAll("button");
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var active = btn.classList.contains("is-active");
      setAttr(btn, "aria-pressed", active ? "true" : "false");
      setAttr(btn, "type", "button");
    }
  }

  // Upgrade <span class="fd-settings-stepper"> to role="group" + aria-live value
  // + data-stepper-action on each button. Stamps controlId on the group.
  function upgradeStepper(span, config) {
    if (!span || !span.classList || !span.classList.contains("fd-settings-stepper")) return;
    setAttr(span, "role", "group");
    if (config && config.ariaLabel) setAttr(span, "aria-label", config.ariaLabel);
    stampIdentity(span, config);
    var buttons = span.querySelectorAll("button");
    if (buttons.length >= 2) {
      setAttr(buttons[0], "data-stepper-action", "decrement");
      setAttr(buttons[1], "data-stepper-action", "increment");
      setAttr(buttons[0], "aria-label", "减少" + (config && config.ariaLabel ? config.ariaLabel : ""));
      setAttr(buttons[1], "aria-label", "增加" + (config && config.ariaLabel ? config.ariaLabel : ""));
    }
    var strong = span.querySelector("strong");
    if (strong) setAttr(strong, "aria-live", "polite");
  }

  // Upgrade <article class="fd-setting-row is-select"> to role="combobox" with
  // aria-expanded / aria-haspopup. Stamps controlId on the row.
  function upgradeSelectRow(row, config) {
    if (!row || !row.classList || !row.classList.contains("is-select")) return;
    setAttr(row, "role", "combobox");
    setAttr(row, "aria-haspopup", "listbox");
    var open = row.classList.contains("is-option-open");
    setAttr(row, "aria-expanded", open ? "true" : "false");
    if (config && config.ariaLabel) setAttr(row, "aria-label", config.ariaLabel);
    stampIdentity(row, config);
  }

  // Upgrade <label class="fd-setting-row is-input-field"> with data-control-id +
  // aria-invalid / aria-busy on the <input>. Stamps identity on the <label> root.
  function upgradeInputRow(label, config) {
    if (!label || !label.classList || !label.classList.contains("is-input-field")) return;
    stampIdentity(label, config);
    var input = label.querySelector("input");
    if (input) {
      setAttr(input, "data-control-id", config && config.controlId);
      setAttr(input, "data-ui-event", config && config.uiEvent);
      setAttr(input, "aria-label", config && config.ariaLabel ? config.ariaLabel : null);
      if (config && config.error) setAttr(input, "aria-invalid", "true");
      if (config && config.busy) setAttr(input, "aria-busy", "true");
    }
  }

  // --- Route detection --------------------------------------------------------
  // Maps backTopBar <h1> text → B1 route id. Falls back to data-source-delete-dialog
  // presence for the source-delete-confirm dialog (its title is dynamic).
  var TITLE_TO_ROUTE = {
    "通用设置": "settings-general",
    "书源管理": "source-management",
    "WebDAV 配置": "webdav-config",
    "同步与备份": "sync-backup"
  };

  function detectRoute(root) {
    if (!root || !root.querySelector) return null;
    var bar = root.querySelector("[data-slot=\"backTopBar\"] h1");
    if (bar) {
      var title = String(bar.textContent || "").trim();
      if (TITLE_TO_ROUTE[title]) return TITLE_TO_ROUTE[title];
    }
    if (root.querySelector("[data-source-delete-dialog]")) return "source-delete-confirm";
    return null;
  }

  // --- Per-route stamping -----------------------------------------------------

  function stampSettingsGeneral(root) {
    var route = "settings-general";
    // Back button
    var backBtn = root.querySelector("[data-slot=\"backTopBar\"] button[aria-label=\"返回\"]");
    stampIdentity(backBtn, { controlId: lookupControlId(route, "__back__"), uiEvent: UI_EVENTS.ROUTE_POP, stateOwner: STATE_OWNERS.CORE_COMMAND, focusKey: "settings-general:back" });

    // Rows
    var rows = root.querySelectorAll(".fd-setting-row");
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var title = rowTitle(row);
      var cid = lookupControlId(route, title);
      if (!cid) continue;
      // Upgrade by row type
      if (row.classList.contains("is-segment")) {
        var segSpan = row.querySelector(".fd-settings-segment");
        upgradeSegment(segSpan, { controlId: cid, ariaLabel: title, uiEvent: UI_EVENTS.SETTINGS_SEGMENT, stateOwner: STATE_OWNERS.SETTINGS_STORE, focusKey: "settings-general:" + title });
      } else if (row.classList.contains("is-select")) {
        upgradeSelectRow(row, { controlId: cid, ariaLabel: title, uiEvent: UI_EVENTS.SETTINGS_SELECT, stateOwner: STATE_OWNERS.SETTINGS_STORE, focusKey: "settings-general:" + title });
      } else if (row.classList.contains("is-switch")) {
        // Legacy: switch rows don't have is-switch class; the switch is inside the row.
        var swSpan = row.querySelector(".fd-settings-switch");
        if (swSpan) {
          // Stamp identity on the row (group root) and upgrade the switch.
          stampIdentity(row, { controlId: cid, ariaLabel: title, uiEvent: UI_EVENTS.SETTINGS_TOGGLE, stateOwner: STATE_OWNERS.SETTINGS_STORE, focusKey: "settings-general:" + title });
          upgradeSwitch(swSpan, { ariaLabel: title });
          // Re-query because upgradeSwitch may have replaced the node.
          var newSw = row.querySelector(".fd-settings-switch");
          stampIdentity(newSw, { controlId: cid, uiEvent: UI_EVENTS.SETTINGS_TOGGLE, stateOwner: STATE_OWNERS.SETTINGS_STORE, repeatTapGuard: true });
        }
      } else if (row.classList.contains("is-cache-cleanup")) {
        // Cache cleanup row has a button action with data-settings-overlay.
        stampIdentity(row, { controlId: cid, ariaLabel: title, uiEvent: UI_EVENTS.SETTINGS_CACHE_CLEAR, stateOwner: STATE_OWNERS.LOCAL, asyncState: ASYNC_STATES.IDLE, repeatTapGuard: true, focusKey: "settings-general:" + title });
        var cacheBtn = row.querySelector("button[data-settings-overlay]");
        stampIdentity(cacheBtn, { controlId: cid, uiEvent: UI_EVENTS.SETTINGS_CACHE_CLEAR, stateOwner: STATE_OWNERS.LOCAL, repeatTapGuard: true });
      } else if (row.classList.contains("is-link")) {
        // Permission rows: 文件访问 / 通知权限 / 电池优化
        stampIdentity(row, { controlId: cid, ariaLabel: title, uiEvent: UI_EVENTS.SETTINGS_PERMISSION_OPEN, stateOwner: STATE_OWNERS.HOST_REQUEST, focusKey: "settings-general:" + title });
        var actionBtn = row.querySelector("button.fd-settings-row-action");
        var actionCid = lookupControlId(route, title + ":action");
        if (actionBtn && actionCid) {
          stampIdentity(actionBtn, { controlId: actionCid, uiEvent: UI_EVENTS.SETTINGS_PERMISSION_OPEN, stateOwner: STATE_OWNERS.HOST_REQUEST, repeatTapGuard: true });
        }
      } else {
        // Fallback: stamp on the row.
        stampIdentity(row, { controlId: cid, ariaLabel: title, uiEvent: UI_EVENTS.SETTINGS_SELECT, stateOwner: STATE_OWNERS.SETTINGS_STORE });
      }
    }

    // Reset action (恢复默认) in the action list.
    var resetBtn = root.querySelector(".fd-settings-action-list button[data-settings-overlay]");
    if (resetBtn) {
      var resetCid = lookupControlId(route, "__reset__");
      stampIdentity(resetBtn, { controlId: resetCid, uiEvent: UI_EVENTS.SETTINGS_RESET, stateOwner: STATE_OWNERS.SETTINGS_STORE, danger: true, repeatTapGuard: true, focusKey: "settings-general:reset" });
    }
  }

  function stampSourceManagement(root) {
    var route = "source-management";
    var backBtn = root.querySelector("[data-slot=\"backTopBar\"] button[aria-label=\"返回\"]");
    stampIdentity(backBtn, { controlId: lookupControlId(route, "__back__"), uiEvent: UI_EVENTS.ROUTE_POP, stateOwner: STATE_OWNERS.CORE_COMMAND, focusKey: "source-management:back" });

    // Source rows (起点中文网 / 笔趣阁 / 本地导入源 / 测试书源) — each has a switch.
    var sourceRows = root.querySelectorAll(".fd-source-row");
    for (var i = 0; i < sourceRows.length; i++) {
      var row = sourceRows[i];
      var strong = row.querySelector("strong");
      if (!strong) continue;
      var title = String(strong.textContent || "").trim();
      var cid = lookupControlId(route, title);
      if (!cid) continue;
      stampIdentity(row, { controlId: cid, ariaLabel: title, uiEvent: UI_EVENTS.SOURCE_TOGGLE, stateOwner: STATE_OWNERS.SOURCE_STORE, focusKey: "source-management:" + title });
      // Upgrade the switch inside .fd-source-row-toggle
      var swSpan = row.querySelector(".fd-source-row-toggle .fd-settings-switch");
      if (swSpan) {
        upgradeSwitch(swSpan, { ariaLabel: "启用 " + title });
        var newSw = row.querySelector(".fd-source-row-toggle .fd-settings-switch");
        stampIdentity(newSw, { controlId: cid, uiEvent: UI_EVENTS.SOURCE_TOGGLE, stateOwner: STATE_OWNERS.SOURCE_STORE, repeatTapGuard: true });
      }
      // Detect button (data-route="source-detect")
      var detectBtn = row.querySelector("button[data-route=\"source-detect\"]");
      if (detectBtn) {
        stampIdentity(detectBtn, { controlId: lookupControlId(route, "__detect_action__"), uiEvent: UI_EVENTS.SOURCE_DETECT, stateOwner: STATE_OWNERS.SOURCE_STORE, asyncState: ASYNC_STATES.IDLE, repeatTapGuard: true });
      }
    }

    // Sort buttons (data-source-sort)
    var sortBtns = root.querySelectorAll("button[data-source-sort]");
    for (var j = 0; j < sortBtns.length; j++) {
      stampIdentity(sortBtns[j], { controlId: lookupControlId(route, "__detect_action__"), uiEvent: UI_EVENTS.SOURCE_SORT, stateOwner: STATE_OWNERS.SOURCE_STORE });
      // Note: sort buttons share a single ambiguous candidate; controlId is reused.
    }

    // Menu toggle (data-source-menu-toggle)
    var menuToggle = root.querySelector("[data-source-menu-toggle]");
    stampIdentity(menuToggle, { controlId: lookupControlId(route, "__add__"), uiEvent: UI_EVENTS.SOURCE_MENU, stateOwner: STATE_OWNERS.LOCAL });

    // Select-all (data-source-select-all) — appears in batch mode
    var selectAll = root.querySelector("[data-source-select-all]");
    stampIdentity(selectAll, { controlId: lookupControlId(route, "__batch_delete__"), uiEvent: UI_EVENTS.SOURCE_SELECT_ALL, stateOwner: STATE_OWNERS.SOURCE_STORE });

    // Search box
    var searchBox = root.querySelector(".fd-settings-search-box");
    if (searchBox) {
      stampIdentity(searchBox, { controlId: lookupControlId(route, "__add__"), uiEvent: UI_EVENTS.SOURCE_SEARCH, stateOwner: STATE_OWNERS.SOURCE_STORE });
    }

    // Filter chips
    var filterChips = root.querySelectorAll(".fd-settings-chip-row button");
    for (var k = 0; k < filterChips.length; k++) {
      stampIdentity(filterChips[k], { controlId: lookupControlId(route, "__add__"), uiEvent: UI_EVENTS.SOURCE_FILTER, stateOwner: STATE_OWNERS.SOURCE_STORE });
    }

    // FAB (新增) — .fd-settings-fab button
    var fab = root.querySelector(".fd-settings-fab");
    if (fab) {
      stampIdentity(fab, { controlId: lookupControlId(route, "__add__"), uiEvent: UI_EVENTS.SOURCE_ADD_OPEN, stateOwner: STATE_OWNERS.CORE_COMMAND, focusKey: "source-management:add" });
    }
  }

  function stampWebdavConfig(root) {
    var route = "webdav-config";
    var backBtn = root.querySelector("[data-slot=\"backTopBar\"] button[aria-label=\"返回\"]");
    stampIdentity(backBtn, { controlId: lookupControlId(route, "__back__"), uiEvent: UI_EVENTS.ROUTE_POP, stateOwner: STATE_OWNERS.CORE_COMMAND, focusKey: "webdav-config:back" });

    // Input rows (服务器地址 / 账号 / 密码 / 同步目录)
    var inputRows = root.querySelectorAll(".fd-setting-row.is-input-field");
    for (var i = 0; i < inputRows.length; i++) {
      var label = inputRows[i];
      var title = rowTitle(label);
      var cid = lookupControlId(route, title);
      if (!cid) continue;
      upgradeInputRow(label, { controlId: cid, ariaLabel: title, uiEvent: UI_EVENTS.WEBDAV_INPUT, stateOwner: STATE_OWNERS.SYNC_STORE, focusKey: "webdav-config:" + title });
    }

    // Switch rows (证书校验 / 断点续传)
    var allRows = root.querySelectorAll(".fd-setting-row");
    for (var r = 0; r < allRows.length; r++) {
      var row = allRows[r];
      var rowTitleText = rowTitle(row);
      var swSpan = row.querySelector(".fd-settings-switch");
      if (swSpan) {
        var switchCid = lookupControlId(route, rowTitleText);
        if (switchCid) {
          stampIdentity(row, { controlId: switchCid, ariaLabel: rowTitleText, uiEvent: UI_EVENTS.SETTINGS_TOGGLE, stateOwner: STATE_OWNERS.SYNC_STORE, focusKey: "webdav-config:" + rowTitleText });
          upgradeSwitch(swSpan, { ariaLabel: rowTitleText });
          var newSw = row.querySelector(".fd-settings-switch");
          stampIdentity(newSw, { controlId: switchCid, uiEvent: UI_EVENTS.SETTINGS_TOGGLE, stateOwner: STATE_OWNERS.SYNC_STORE, repeatTapGuard: true });
        }
      }
      // Select rows (连接超时 / 上传分块大小)
      if (row.classList.contains("is-select")) {
        var selCid = lookupControlId(route, rowTitleText);
        if (selCid) {
          upgradeSelectRow(row, { controlId: selCid, ariaLabel: rowTitleText, uiEvent: UI_EVENTS.SETTINGS_SELECT, stateOwner: STATE_OWNERS.SYNC_STORE, focusKey: "webdav-config:" + rowTitleText });
        }
      }
    }

    // Test / Save action buttons (data-settings-overlay="dialog:webdav-test" / "dialog:webdav-save")
    var actionBtns = root.querySelectorAll(".fd-settings-section-actions button[data-settings-overlay]");
    for (var j = 0; j < actionBtns.length; j++) {
      var btn = actionBtns[j];
      var overlay = btn.getAttribute("data-settings-overlay") || "";
      if (overlay.indexOf("webdav-test") >= 0) {
        stampIdentity(btn, { controlId: lookupControlId(route, "__test__"), uiEvent: UI_EVENTS.WEBDAV_TEST, stateOwner: STATE_OWNERS.SYNC_STORE, asyncState: ASYNC_STATES.IDLE, repeatTapGuard: true, focusKey: "webdav-config:test" });
      } else if (overlay.indexOf("webdav-save") >= 0) {
        stampIdentity(btn, { controlId: lookupControlId(route, "__save__"), uiEvent: UI_EVENTS.WEBDAV_SAVE, stateOwner: STATE_OWNERS.SYNC_STORE, asyncState: ASYNC_STATES.IDLE, repeatTapGuard: true, focusKey: "webdav-config:save" });
      }
    }
  }

  function stampSyncBackup(root) {
    var route = "sync-backup";
    var backBtn = root.querySelector("[data-slot=\"backTopBar\"] button[aria-label=\"返回\"]");
    stampIdentity(backBtn, { controlId: lookupControlId(route, "__back__"), uiEvent: UI_EVENTS.ROUTE_POP, stateOwner: STATE_OWNERS.CORE_COMMAND, focusKey: "sync-backup:back" });

    // Input rows (服务器地址 / 账号 / 密码 / 同步目录)
    var inputRows = root.querySelectorAll(".fd-setting-row.is-input-field");
    for (var i = 0; i < inputRows.length; i++) {
      var label = inputRows[i];
      var title = rowTitle(label);
      var cid = lookupControlId(route, title);
      if (!cid) continue;
      upgradeInputRow(label, { controlId: cid, ariaLabel: title, uiEvent: UI_EVENTS.WEBDAV_INPUT, stateOwner: STATE_OWNERS.SYNC_STORE, focusKey: "sync-backup:" + title });
    }

    // Test / Save action buttons
    var actionBtns = root.querySelectorAll(".fd-settings-section-actions button[data-settings-overlay]");
    for (var j = 0; j < actionBtns.length; j++) {
      var btn = actionBtns[j];
      var overlay = btn.getAttribute("data-settings-overlay") || "";
      if (overlay.indexOf("webdav-test") >= 0) {
        stampIdentity(btn, { controlId: lookupControlId(route, "__test__"), uiEvent: UI_EVENTS.WEBDAV_TEST, stateOwner: STATE_OWNERS.SYNC_STORE, asyncState: ASYNC_STATES.IDLE, repeatTapGuard: true, focusKey: "sync-backup:test" });
      } else if (overlay.indexOf("webdav-save") >= 0) {
        stampIdentity(btn, { controlId: lookupControlId(route, "__save__"), uiEvent: UI_EVENTS.WEBDAV_SAVE, stateOwner: STATE_OWNERS.SYNC_STORE, asyncState: ASYNC_STATES.IDLE, repeatTapGuard: true, focusKey: "sync-backup:save" });
      }
    }

    // Restore record cards (data-restore-record)
    var restoreCards = root.querySelectorAll("[data-restore-record]");
    for (var k = 0; k < restoreCards.length; k++) {
      var card = restoreCards[k];
      var record = card.getAttribute("data-restore-record") || "";
      var restoreCid = lookupControlId(route, "__restore:" + record + "__");
      if (restoreCid) {
        stampIdentity(card, { controlId: restoreCid, uiEvent: UI_EVENTS.RESTORE_RECORD_OPEN, stateOwner: STATE_OWNERS.SYNC_STORE, focusKey: "sync-backup:" + record });
      }
    }
  }

  function stampSourceDeleteConfirm(root) {
    var route = "source-management";
    // Cancel button (data-route-back data-dialog-initial-focus)
    var cancelBtn = root.querySelector("[data-route-back]");
    stampIdentity(cancelBtn, { controlId: lookupControlId(route, "__batch_delete__"), uiEvent: UI_EVENTS.ROUTE_POP, stateOwner: STATE_OWNERS.CORE_COMMAND, focusKey: "source-delete-confirm:cancel" });
    // Delete confirm button (data-source-delete-confirm)
    var deleteBtn = root.querySelector("[data-source-delete-confirm]");
    stampIdentity(deleteBtn, { controlId: lookupControlId(route, "__batch_delete__"), uiEvent: UI_EVENTS.SOURCE_DELETE_CONFIRM, stateOwner: STATE_OWNERS.SOURCE_STORE, danger: true, asyncState: ASYNC_STATES.IDLE, repeatTapGuard: true, focusKey: "source-delete-confirm:delete" });
  }

  // Main entry: detect route and dispatch.
  function stampSettingsScreen(root) {
    if (!root) return;
    var route = detectRoute(root);
    if (!route) return;
    try {
      if (route === "settings-general") stampSettingsGeneral(root);
      else if (route === "source-management") stampSourceManagement(root);
      else if (route === "webdav-config") stampWebdavConfig(root);
      else if (route === "sync-backup") stampSyncBackup(root);
      else if (route === "source-delete-confirm") stampSourceDeleteConfirm(root);
    } catch (err) {
      // Defensive: never break rendering. Log and continue.
      if (window.console && console.warn) {
        console.warn("[ReaderSettingsShell] stampSettingsScreen failed for route " + route + ":", err);
      }
    }
    // Mark the active route so verify tests can read it from the DOM.
    setAttr(root, "data-b1-route", route);
  }

  // --- MutationObserver installation ------------------------------------------
  var observer = null;
  var stampScheduled = false;

  function scheduleStamp(target) {
    if (stampScheduled) return;
    stampScheduled = true;
    // Microtask-style flush so we stamp once per render turn.
    Promise.resolve().then(function () {
      stampScheduled = false;
      stampSettingsScreen(target);
    }).catch(function () {
      stampScheduled = false;
    });
  }

  function installObserver() {
    var root = document.getElementById("frontend-demo-root");
    if (!root) {
      // Retry once after DOMContentLoaded.
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", installObserver, { once: true });
      }
      return;
    }
    if (observer) return;
    observer = new MutationObserver(function () {
      scheduleStamp(root);
    });
    observer.observe(root, { childList: true, subtree: true, attributes: false, characterData: false });
    // Initial stamp pass.
    stampSettingsScreen(root);
  }

  // Auto-install on script load. The script is loaded before render.js in index.html,
  // so document may not have #frontend-demo-root yet; installObserver handles that.
  if (window.document && typeof window.document.addEventListener === "function") {
    if (window.document.readyState === "loading") {
      window.document.addEventListener("DOMContentLoaded", installObserver, { once: true });
    } else {
      installObserver();
    }
  }

  // --- Public API --------------------------------------------------------------
  window.ReaderSettingsShell = {
    UI_EVENTS: UI_EVENTS,
    STATE_OWNERS: STATE_OWNERS,
    ASYNC_STATES: ASYNC_STATES,
    REGISTRY: REGISTRY,
    B1_ROUTES: B1_ROUTES,
    TITLE_TO_ROUTE: TITLE_TO_ROUTE,
    isSettingsDomainRoute: isSettingsDomainRoute,
    lookupControlId: lookupControlId,
    attr: attr,
    controlAttrs: controlAttrs,
    nativeSwitch: nativeSwitch,
    nativeSelectTrigger: nativeSelectTrigger,
    nativeSegment: nativeSegment,
    nativeStepper: nativeStepper,
    nativeInput: nativeInput,
    asyncBadge: asyncBadge,
    focusRestoreAttrs: focusRestoreAttrs,
    restoreFocus: restoreFocus,
    markFocusedControl: markFocusedControl,
    repeatTapGuardAttrs: repeatTapGuardAttrs,
    staleResultAttrs: staleResultAttrs,
    // DOM post-processing API
    setAttr: setAttr,
    stampIdentity: stampIdentity,
    rowTitle: rowTitle,
    detectRoute: detectRoute,
    upgradeSwitch: upgradeSwitch,
    upgradeSegment: upgradeSegment,
    upgradeStepper: upgradeStepper,
    upgradeSelectRow: upgradeSelectRow,
    upgradeInputRow: upgradeInputRow,
    stampSettingsGeneral: stampSettingsGeneral,
    stampSourceManagement: stampSourceManagement,
    stampWebdavConfig: stampWebdavConfig,
    stampSyncBackup: stampSyncBackup,
    stampSourceDeleteConfirm: stampSourceDeleteConfirm,
    stampSettingsScreen: stampSettingsScreen,
    installObserver: installObserver
  };
})(window);
