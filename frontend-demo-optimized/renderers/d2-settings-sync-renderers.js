/**
 * D2 设置与同步增强 renderer 函数模块
 * -----------------------------------------------------------------------------
 * 职责：为 Reader-UI Demo 的「设置与同步」集群补全状态变体与完整交互。
 *       覆盖 D0 审计中标记为 schema-only / scaffold 的 42 个路由，提供完整
 *       renderer 实现，包括：
 *         - 全局设置（阅读偏好 / 网络 / 缓存 / 隐私 4 个分区）
 *         - 阅读设置（默认排版 / 翻页方式 / 亮度）
 *         - 书源设置（书源管理 / 调试 / 导入导出）
 *         - WebDAV（配置 / 测试连接 / 错误处理）
 *         - 备份管理（手动 / 自动 / 历史）
 *         - 恢复流程（确认 → 范围 → 预览 → 进行中 → 冲突 → 结果/失败/部分成功）
 *         - 关于 / 版本 / 反馈
 *
 * 约束：
 *   - 不编辑 render-runtime.js，仅通过 window.ReaderD2SettingsSyncRenderers 暴露
 *   - 所有 renderer 函数签名统一为 (data, route, appState) → HTML 字符串
 *   - 通过 localStorage 模拟持久化（key 前缀 reader-d2-）
 *   - 使用中文注释
 *
 * 集成映射（INTEGRATION_MAP）：
 *   见文件末尾 INTEGRATION_MAP 常量；render-runtime.js 的 renderRoute 入口
 *   需在 switch 之前增加 D2 dispatch hook（详见输出集成映射）。
 * -----------------------------------------------------------------------------
 */
(function attachReaderD2SettingsSyncRenderers(window) {
  "use strict";

  // ============ 基础依赖：shell kit / 转义 / 图标 ============

  function shellKit() {
    if (!window.ReaderShellKit) {
      throw new Error("ReaderShellKit is required before d2-settings-sync-renderers.js");
    }
    return window.ReaderShellKit;
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function icon(name, className) {
    if (window.ReaderShellKit && typeof window.ReaderShellKit.icon === "function") {
      return window.ReaderShellKit.icon(name, className || "fd-icon");
    }
    if (window.ReaderAssetIcons && typeof window.ReaderAssetIcons.renderIcon === "function") {
      return window.ReaderAssetIcons.renderIcon(name, className || "fd-icon");
    }
    return `<span class="${esc(className || "fd-icon")}" data-icon-missing="${esc(name)}" aria-hidden="true"></span>`;
  }

  function chevron(className) {
    return icon("chevron", className || "fd-small-icon");
  }

  // Reader 2 / Full / AppearanceContent 的唯一数据源。D2 设置页只投影展示，
  // 不再保留主题、字体、离散选项或步进器默认值的第二份手写数组。
  function readerAppearanceSpec() {
    if (!window.ReaderAppearanceSpec) {
      throw new Error("ReaderAppearanceSpec is required before d2-settings-sync-renderers.js");
    }
    return window.ReaderAppearanceSpec;
  }

  function readerAppearanceTheme(id) {
    var item = readerAppearanceSpec().themes.find(function (theme) { return theme.id === id; });
    if (!item) throw new Error("Missing Reader Appearance theme: " + id);
    return item;
  }

  function readerAppearanceFont(id) {
    var item = readerAppearanceSpec().fonts.find(function (font) { return font.id === id; });
    if (!item) throw new Error("Missing Reader Appearance font: " + id);
    return item;
  }

  function readerAppearanceSelect(id) {
    var item = readerAppearanceSpec().selects.find(function (select) { return select.id === id; });
    if (!item) throw new Error("Missing Reader Appearance select: " + id);
    return item;
  }

  function readerAppearanceStepper(id) {
    var item = readerAppearanceSpec().steppers.find(function (stepper) { return stepper.id === id; });
    if (!item) throw new Error("Missing Reader Appearance stepper: " + id);
    return item;
  }

  function readerAppearanceOptionLabels(select) {
    return select.options.map(function (option) { return option.label; });
  }

  function readerAppearanceDefaultLabel(select) {
    var option = select.options.find(function (item) { return item.value === select.defaultValue; });
    if (!option) throw new Error("Missing Reader Appearance default option: " + select.id);
    return option.label;
  }

  function readerAppearanceValue(stepper) {
    return Number(stepper.defaultValue).toFixed(stepper.precision);
  }

  // 路由标题（去掉括号后缀）
  function routeTitle(route) {
    var contract = window.ReaderFrontendDemoDraftRouteContract || {};
    var routes = contract.routes || {};
    return String((routes[route] && routes[route].title) || route).replace(/（.*$/, "").trim();
  }

  // 百分比归一化（0~100%）
  function pct(value) {
    var numeric = Number(String(value == null ? "0" : value).replace("%", ""));
    if (!Number.isFinite(numeric)) numeric = 0;
    return Math.max(0, Math.min(100, numeric)) + "%";
  }

  // ============ localStorage 持久化（demo 模拟） ============
  // 所有 key 统一加 reader-d2- 前缀
  var STORAGE_PREFIX = "reader-d2-";

  function d2Get(key, fallback) {
    try {
      var raw = window.localStorage.getItem(STORAGE_PREFIX + key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function d2Set(key, value) {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      // 无痕模式等场景静默降级
    }
  }

  function d2Remove(key) {
    try {
      window.localStorage.removeItem(STORAGE_PREFIX + key);
    } catch (e) {
      // 静默降级
    }
  }

  // ============ A2 Phase 2: settings-general 状态 owner + reducer ============
  // A2 (R2b): 把 "控件身份已经清楚" 推进为 "控件真的能工作"。
  // 本段是 settings-general 路由的唯一权威状态 owner：
  //   - d2SettingsGeneralInitState(appState): 从 localStorage 恢复 + 默认值合并
  //   - d2SettingsGeneralReducer(state, action): 纯函数 reducer
  //   - d2SettingsGeneralDispatch(action): dispatch + 持久化 + 通知订阅者
  //   - d2SettingsGeneralSubscribe(listener): 状态变更订阅
  //   - d2SettingsGeneralGetState(): 读取当前 state（用于 renderer 读取）
  //
  // 状态结构：
  //   state = {
  //     values: { "app-theme": ..., "language": ..., ... 8 个 settingsKey },
  //     cacheClear: { status, lastError, lastClearedAt },
  //     permissions: { "file-access": ..., "notification": ..., "battery": ... },
  //     resetDefaults: { status }
  //   }
  //
  // Action types（与 UiEvent schema 对齐）：
  //   "INIT"                                    — 从 localStorage 恢复
  //   "TOGGLE_SWITCH"   { settingsKey, value }  — 对应 uiEvent="toggle.switch"
  //   "SELECT_OPTION"   { settingsKey, value }  — 对应 uiEvent="dropdown.option.select" / "segment.item.switch"
  //   "CACHE_CLEAR_CONFIRM" / "CACHE_CLEAR_START" / "CACHE_CLEAR_SUCCESS" / "CACHE_CLEAR_FAILED"
  //   "PERMISSION_REQUEST" { name } / "PERMISSION_RESULT" { name, result }
  //   "RESET_DEFAULTS_CONFIRM" / "RESET_DEFAULTS_SUBMIT" / "RESET_DEFAULTS_SUCCESS" / "RESET_DEFAULTS_CANCEL"
  // ---------------------------------------------------------------------------

  // 默认值：与 appearance-spec.js / R1.2 inventory 对齐
  var D2_SETTINGS_GENERAL_DEFAULTS = {
    // segment (3 options: 跟随系统 / 浅色 / 深色)
    "app-theme": "follow-system",
    // select (3 options: 简体中文 / 繁體中文 / English)
    "language": "zh-CN",
    // select (4 options: 书架 / 发现 / 订阅 / 设置)
    "startup-screen": "bookshelf",
    // select (3 options: 减少 / 标准 / 增强)
    "animation-effect": "standard",
    // switch
    "auto-check-update": true,
    "tap-bottom-scroll-top": true,
    "reduce-motion": false,
    "crash-log": true
  };

  // 持久化 key：所有 settings-general 值打包存一个 key，减少 IO
  var D2_SETTINGS_GENERAL_STORAGE_KEY = "settings-general-values";

  // 3 个权限请求名字
  var D2_PERMISSION_NAMES = ["file-access", "notification", "battery"];

  function d2SettingsGeneralDefaultState() {
    return {
      values: Object.assign({}, D2_SETTINGS_GENERAL_DEFAULTS),
      cacheClear: { status: "idle", lastError: null, lastClearedAt: null },
      permissions: {
        "file-access": "prompt",
        "notification": "prompt",
        "battery": "prompt"
      },
      resetDefaults: { status: "idle" }
    };
  }

  // 从 localStorage 恢复 values，合并到默认值上（防止旧版本 key 缺失）
  function d2SettingsGeneralInitState(appState) {
    var state = d2SettingsGeneralDefaultState();
    var stored = d2Get(D2_SETTINGS_GENERAL_STORAGE_KEY, null);
    if (stored && typeof stored === "object") {
      var merged = Object.assign({}, state.values, stored);
      state.values = merged;
    }
    // 兼容 appState 注入（测试 / 路由级 state override）
    if (appState && appState.settingsGeneralValues) {
      state.values = Object.assign({}, state.values, appState.settingsGeneralValues);
    }
    return state;
  }

  // 纯函数 reducer
  function d2SettingsGeneralReducer(state, action) {
    if (!state) state = d2SettingsGeneralDefaultState();
    if (!action || !action.type) return state;
    switch (action.type) {
      case "INIT":
        return d2SettingsGeneralInitState(action.appState || {});

      case "TOGGLE_SWITCH": {
        if (!action.settingsKey) return state;
        var nextValues = Object.assign({}, state.values);
        nextValues[action.settingsKey] = !!action.value;
        return Object.assign({}, state, { values: nextValues });
      }

      case "SELECT_OPTION": {
        if (!action.settingsKey) return state;
        var nextValues2 = Object.assign({}, state.values);
        nextValues2[action.settingsKey] = action.value;
        return Object.assign({}, state, { values: nextValues2 });
      }

      // ---- 清缓存流程：5 个状态 idle / confirm / loading / success / failed ----
      case "CACHE_CLEAR_CONFIRM":
        return Object.assign({}, state, {
          cacheClear: Object.assign({}, state.cacheClear, { status: "confirm", lastError: null })
        });
      case "CACHE_CLEAR_START":
        // 重复点击 guard：只有 confirm 状态才能进入 loading
        if (state.cacheClear.status === "loading") return state;
        return Object.assign({}, state, {
          cacheClear: Object.assign({}, state.cacheClear, { status: "loading", lastError: null })
        });
      case "CACHE_CLEAR_SUCCESS":
        return Object.assign({}, state, {
          cacheClear: Object.assign({}, state.cacheClear, {
            status: "success", lastError: null, lastClearedAt: Date.now()
          })
        });
      case "CACHE_CLEAR_FAILED":
        return Object.assign({}, state, {
          cacheClear: Object.assign({}, state.cacheClear, {
            status: "failed", lastError: action.error || "unknown error"
          })
        });
      case "CACHE_CLEAR_RESET":
        return Object.assign({}, state, {
          cacheClear: Object.assign({}, state.cacheClear, { status: "idle", lastError: null })
        });

      // ---- 3 权限请求：5 个状态 prompt / requesting / granted / denied / error ----
      case "PERMISSION_REQUEST": {
        if (!action.name || D2_PERMISSION_NAMES.indexOf(action.name) < 0) return state;
        var nextPerms = Object.assign({}, state.permissions);
        nextPerms[action.name] = "requesting";
        return Object.assign({}, state, { permissions: nextPerms });
      }
      case "PERMISSION_RESULT": {
        if (!action.name || D2_PERMISSION_NAMES.indexOf(action.name) < 0) return state;
        var validResults = ["granted", "denied", "error"];
        if (validResults.indexOf(action.result) < 0) return state;
        var nextPerms2 = Object.assign({}, state.permissions);
        nextPerms2[action.name] = action.result;
        return Object.assign({}, state, { permissions: nextPerms2 });
      }

      // ---- 恢复默认流程：5 个状态 idle / confirm / submitting / success / cancelled ----
      case "RESET_DEFAULTS_CONFIRM":
        return Object.assign({}, state, {
          resetDefaults: Object.assign({}, state.resetDefaults, { status: "confirm" })
        });
      case "RESET_DEFAULTS_CANCEL":
        return Object.assign({}, state, {
          resetDefaults: Object.assign({}, state.resetDefaults, { status: "cancelled" })
        });
      case "RESET_DEFAULTS_SUBMIT":
        // 重复点击 guard：只有 confirm 才能进入 submitting
        if (state.resetDefaults.status === "submitting") return state;
        return Object.assign({}, state, {
          resetDefaults: Object.assign({}, state.resetDefaults, { status: "submitting" })
        });
      case "RESET_DEFAULTS_SUCCESS":
        // 提交成功 → 实际重置 values + 进入 success 状态
        return Object.assign({}, state, {
          values: Object.assign({}, D2_SETTINGS_GENERAL_DEFAULTS),
          resetDefaults: Object.assign({}, state.resetDefaults, { status: "success" })
        });
      case "RESET_DEFAULTS_RESET":
        return Object.assign({}, state, {
          resetDefaults: Object.assign({}, state.resetDefaults, { status: "idle" })
        });

      default:
        return state;
    }
  }

  // 当前 state（单例）
  var d2SettingsGeneralState = null;
  // 订阅者列表
  var d2SettingsGeneralListeners = [];

  function d2SettingsGeneralGetState() {
    if (!d2SettingsGeneralState) {
      d2SettingsGeneralState = d2SettingsGeneralInitState({});
    }
    return d2SettingsGeneralState;
  }

  function d2SettingsGeneralSubscribe(listener) {
    if (typeof listener !== "function") return function () { return; };
    d2SettingsGeneralListeners.push(listener);
    return function unsubscribe() {
      var idx = d2SettingsGeneralListeners.indexOf(listener);
      if (idx >= 0) d2SettingsGeneralListeners.splice(idx, 1);
    };
  }

  // dispatch: 跑 reducer → 持久化 values → 通知订阅者
  // 持久化只对 values 做（cacheClear / permissions / resetDefaults 都是瞬态，不持久化）
  function d2SettingsGeneralDispatch(action) {
    var prev = d2SettingsGeneralGetState();
    var next = d2SettingsGeneralReducer(prev, action);
    if (next === prev) return prev;
    d2SettingsGeneralState = next;
    // 持久化 values
    if (next.values && action && (action.type === "TOGGLE_SWITCH" || action.type === "SELECT_OPTION" || action.type === "RESET_DEFAULTS_SUCCESS")) {
      d2Set(D2_SETTINGS_GENERAL_STORAGE_KEY, next.values);
    }
    // 通知订阅者
    for (var i = 0; i < d2SettingsGeneralListeners.length; i++) {
      try {
        d2SettingsGeneralListeners[i](next, prev, action);
      } catch (e) {
        // 订阅者异常不阻塞 dispatch
        if (window.console && console.warn) {
          console.warn("d2SettingsGeneralSubscribe listener error:", e);
        }
      }
    }
    return next;
  }

  // 将 state 注入到 appState.settingsGeneral，供 renderer 读取
  function d2SettingsGeneralInjectAppState(appState) {
    appState = appState || {};
    appState.settingsGeneral = d2SettingsGeneralGetState();
    return appState;
  }

  // A2 Phase 5: 权限请求桥接函数
  // 调用 window.ReaderPermissionBridge.request(name) 返回 Promise<result>
  // result ∈ {"granted", "denied", "error"}
  // 事件层调用：d2RequestPermission("file-access").then(result => ...)
  // 如果 window.ReaderPermissionBridge 不存在（demo 环境），返回 "error"
  function d2RequestPermission(name) {
    if (D2_PERMISSION_NAMES.indexOf(name) < 0) {
      return Promise.reject(new Error("unknown permission name: " + name));
    }
    d2SettingsGeneralDispatch({ type: "PERMISSION_REQUEST", name: name });
    var bridge = window.ReaderPermissionBridge;
    if (!bridge || typeof bridge.request !== "function") {
      // demo 环境无桥接 → 模拟 error
      d2SettingsGeneralDispatch({ type: "PERMISSION_RESULT", name: name, result: "error" });
      return Promise.resolve("error");
    }
    // 用 try/catch 包裹同步调用，bridge.request 可能同步抛错
    var requestPromise;
    try {
      requestPromise = Promise.resolve(bridge.request(name));
    } catch (e) {
      d2SettingsGeneralDispatch({ type: "PERMISSION_RESULT", name: name, result: "error" });
      return Promise.resolve("error");
    }
    return requestPromise
      .then(function (result) {
        var validResults = ["granted", "denied", "error"];
        var finalResult = validResults.indexOf(result) >= 0 ? result : "error";
        d2SettingsGeneralDispatch({ type: "PERMISSION_RESULT", name: name, result: finalResult });
        return finalResult;
      })
      .catch(function () {
        d2SettingsGeneralDispatch({ type: "PERMISSION_RESULT", name: name, result: "error" });
        return "error";
      });
  }

  // A2 Phase 4: 清缓存执行函数（事件层调用）
  // 调用方负责在 CACHE_CLEAR_CONFIRM 后调用此函数执行实际清理
  // demo 环境无真实清理 → 模拟成功或失败
  function d2ExecuteCacheClear(options) {
    options = options || {};
    d2SettingsGeneralDispatch({ type: "CACHE_CLEAR_START" });
    var simulate = options.simulateResult || "success";
    return new Promise(function (resolve) {
      var delay = options.delay || 0;
      setTimeout(function () {
        if (simulate === "failed") {
          d2SettingsGeneralDispatch({
            type: "CACHE_CLEAR_FAILED",
            error: options.error || "清理失败"
          });
          resolve("failed");
        } else {
          d2SettingsGeneralDispatch({ type: "CACHE_CLEAR_SUCCESS" });
          resolve("success");
        }
      }, delay);
    });
  }

  // A2 Phase 6: 恢复默认执行函数（事件层调用）
  // 调用方负责在 RESET_DEFAULTS_CONFIRM 后调用此函数执行实际重置
  function d2ExecuteResetDefaults(options) {
    options = options || {};
    d2SettingsGeneralDispatch({ type: "RESET_DEFAULTS_SUBMIT" });
    return new Promise(function (resolve) {
      var delay = options.delay || 0;
      setTimeout(function () {
        d2SettingsGeneralDispatch({ type: "RESET_DEFAULTS_SUCCESS" });
        resolve("success");
      }, delay);
    });
  }

  // ============ 通用 UI 块（与 render-runtime.js 风格一致） ============

  // A1 (R2a): Control identity lookup — 从 CANONICAL_CONTROL_DECLARATIONS 构建
  // settings-general subcontrol 的身份查找表。key = route::settingsKey。
  // renderer 在输出 subcontrol 时调用 d2ResolveSubcontrolIdentity 查找身份，
  // 然后 d2StampIdentityAttrs 把 5 个 data-* 属性 stamp 到 HTML。
  // A3: 扩展 lookup 同时容纳 r2.0-subcontrol（值型 subcontrol）和 a3-action
  //     （action button / listrow-action / back），二者都用 settingsKey 索引。
  var d2SubcontrolIdentityLookup = null;
  function d2GetSubcontrolIdentityLookup() {
    if (d2SubcontrolIdentityLookup) return d2SubcontrolIdentityLookup;
    d2SubcontrolIdentityLookup = {};
    var decls = window.CANONICAL_CONTROL_DECLARATIONS || [];
    for (var i = 0; i < decls.length; i++) {
      var d = decls[i];
      if ((d.source === "r2.0-subcontrol" || d.source === "a3-action") && d.settingsKey && d.route) {
        d2SubcontrolIdentityLookup[d.route + "::" + d.settingsKey] = d;
      }
    }
    return d2SubcontrolIdentityLookup;
  }

  function d2ResolveSubcontrolIdentity(route, settingsKey) {
    if (!route || !settingsKey) return null;
    var lookup = d2GetSubcontrolIdentityLookup();
    return lookup[route + "::" + settingsKey] || null;
  }

  // A1 (R2a): stamp 5 个 data-* 属性到 HTML 字符串。
  // data-viewport 由 render-runtime.js 的 applyViewportClass 在 viewport 切换时
  // 同步 stamp，renderer 不输出 data-viewport。
  function d2StampIdentityAttrs(identity) {
    if (!identity) return "";
    var attrs = "";
    if (identity.entityKey) attrs += ` data-entity-key="${esc(identity.entityKey)}"`;
    if (identity.controlKey) attrs += ` data-control-key="${esc(identity.controlKey)}"`;
    if (identity.controlId) attrs += ` data-control-id="${esc(identity.controlId)}"`;
    if (identity.uiEvent) attrs += ` data-ui-event="${esc(identity.uiEvent)}"`;
    if (identity.settingsKey) attrs += ` data-settings-key="${esc(identity.settingsKey)}"`;
    return attrs;
  }

  // 状态徽章
  function d2Badge(label, tone) {
    if (!label) return "";
    return `<span class="fd-settings-badge is-${esc(tone || "muted")}" title="${esc(label)}" aria-label="${esc(label)}"><i aria-hidden="true"></i></span>`;
  }

  // 开关 — A1 (R2a): stamp 5 个 data-* 属性到 switch span
  // A2 Phase 7: 补 role=switch + aria-checked + tabindex=0（移除 aria-hidden）
  function d2Switch(row, route) {
    var identity = d2ResolveSubcontrolIdentity(route, row.settingsKey);
    var attrs = d2StampIdentityAttrs(identity);
    var checked = !!row.enabled;
    return `<span class="fd-settings-switch${checked ? " is-on" : ""}"${attrs} role="switch" aria-checked="${checked ? "true" : "false"}" tabindex="0" aria-label="${esc(row.title || "")}"><i></i></span>`;
  }

  // 段选器（segment control） — A1 (R2a): 每个 button stamp 自己的 identity
  // A2 Phase 7: active button 补 aria-pressed="true"（segment 用 aria-pressed 而非 aria-selected，
  //   因为 segment 是 button group 而非 listbox/role=option）
  function d2Segment(row, route) {
    if (!row || !row.options || !row.options.length) return "";
    return `
      <span class="fd-settings-segment" role="group" aria-label="${esc(row.title)}">
        ${row.options.map(function (option, index) {
          var settingsKey = (row.settingsKey || "") + "-segment-option-" + (index + 1);
          var identity = d2ResolveSubcontrolIdentity(route, settingsKey);
          var attrs = d2StampIdentityAttrs(identity);
          var isActive = option === row.value;
          return `<button class="${isActive ? "is-active" : ""}" type="button"${attrs} aria-pressed="${isActive ? "true" : "false"}">${esc(option)}</button>`;
        }).join("")}
      </span>`;
  }

  // 步进器 — A1 (R2a): minus / plus button 各自 stamp identity
  function d2Stepper(row, route) {
    if (!row) return "";
    var minusKey = (row.settingsKey || "") + "-stepper-minus";
    var plusKey = (row.settingsKey || "") + "-stepper-plus";
    var minusIdentity = d2ResolveSubcontrolIdentity(route, minusKey);
    var plusIdentity = d2ResolveSubcontrolIdentity(route, plusKey);
    var minusAttrs = d2StampIdentityAttrs(minusIdentity);
    var plusAttrs = d2StampIdentityAttrs(plusIdentity);
    return `
      <span class="fd-settings-stepper" aria-label="${esc(row.title)}">
        <button type="button"${minusAttrs}>${esc(row.minLabel || "-")}</button>
        <strong>${esc(row.value)}</strong>
        <button type="button"${plusAttrs}>${esc(row.maxLabel || "+")}</button>
      </span>`;
  }

  // 输入框行
  // R2a (webdav-config): 接收 route + state 用于 stamp identity 和反映 inputErrors。
  //   - 当 row.settingsKey 存在时，stamp 5 data-* 属性到 <input>。
  //   - 当 state.inputErrors[settingsKey] 存在时，添加 aria-invalid + aria-describedby。
  //   - 其它调用方（无 route / 无 settingsKey）保持原行为，向后兼容。
  function d2InputRow(row, route, state) {
    var inputType = ["text", "url", "password", "number"].indexOf(row.inputType) >= 0 ? row.inputType : "text";
    var identity = (row.settingsKey && route)
      ? d2ResolveSubcontrolIdentity(route, row.settingsKey) : null;
    var identityAttrs = d2StampIdentityAttrs(identity);
    var errorObj = (state && state.inputErrors && row.settingsKey)
      ? state.inputErrors[row.settingsKey] : null;
    var ariaAttrs = "";
    var describedBy = "";
    if (errorObj) {
      var descId = "input-error-" + (row.settingsKey || "generic");
      ariaAttrs = ' aria-invalid="true" aria-describedby="' + esc(descId) + '"';
      describedBy = '<small class="fd-settings-input-error" id="' + esc(descId) + '" role="alert">' + esc(errorObj.message || errorObj) + '</small>';
    }
    return `
      <label class="fd-setting-row is-input-field">
        <span>${icon(row.icon || "settings", "fd-small-icon")}</span>
        <strong>${esc(row.title)}${row.meta ? `<small>${esc(row.meta)}</small>` : ""}</strong>
        <input type="${esc(inputType)}" value="${esc(row.value || "")}" placeholder="${esc(row.placeholder || "")}" aria-label="${esc(row.title)}" autocomplete="off"${identityAttrs}${ariaAttrs}>
        ${describedBy}
      </label>`;
  }

  // 通用设置行（switch / select / link / action / stepper / cache-cleanup / segment）
  // A1 (R2a): d2RowSide 接收 route 参数，传递给 d2Switch / d2Stepper / d2Segment
  // A2 (R2b): cache-cleanup row 反映 cacheClear.status（loading/success/failed），
  //   支持 aria-busy / disabled / 重复点击 guard
  function d2RowSide(row, route) {
    var status = d2Badge(row.status, row.statusTone);
    var segment = row.type === "segment" ? d2Segment(row, route) : "";
    var stepper = row.type === "stepper" ? d2Stepper(row, route) : "";
    var toggle = row.type === "switch" ? d2Switch(row, route) : "";
    var value = row.value && !stepper && !segment ? `<strong class="fd-settings-value">${esc(row.value)}</strong>` : "";
    var actionOverlay = row.type === "cache-cleanup" && row.overlay ? ` data-settings-overlay="${esc(row.overlay)}"` : "";
    // A3: cache-cleanup inner button 与 permission inner button 各自 stamp 稳定 identity
    //     cache-cleanup → settingsKey="cache-clear"
    //     permission    → settingsKey="permission-action-<name>"
    var innerActionIdentity = null;
    if (row.type === "cache-cleanup") {
      innerActionIdentity = d2ResolveSubcontrolIdentity(route, "cache-clear");
    } else if (row.type === "link" && row.permissionName) {
      innerActionIdentity = d2ResolveSubcontrolIdentity(route, "permission-action-" + row.permissionName);
    }
    var innerActionAttrs = d2StampIdentityAttrs(innerActionIdentity);
    // A2 Phase 4: cache-cleanup row 根据 cacheStatus 渲染 action button
    // A2 Phase 5: permission row 根据 rawPermissionStatus 渲染 action button
    var action = "";
    if (row.actionLabel) {
      if (row.type === "cache-cleanup") {
        var cacheStatus = row.cacheStatus || "idle";
        var cacheError = row.cacheError || null;
        var actionClass = "fd-settings-row-action";
        var actionLabel = row.actionLabel;
        var actionAttrs = actionOverlay + innerActionAttrs;
        var titleAttr = "";
        if (cacheStatus === "loading") {
          actionClass += " is-busy";
          actionLabel = "清理中…";
          actionAttrs += ' aria-busy="true" disabled';
        } else if (cacheStatus === "success") {
          actionClass += " is-success";
          actionLabel = "已清理";
        } else if (cacheStatus === "failed") {
          actionClass += " is-failed";
          actionLabel = "重试";
          titleAttr = cacheError ? ` title="${esc(cacheError)}"` : "";
          actionAttrs += ' aria-invalid="true"';
        } else if (cacheStatus === "confirm") {
          actionClass += " is-confirm";
        }
        action = `<button class="${actionClass}" type="button"${actionAttrs}${titleAttr}>${esc(actionLabel)}</button>`;
      } else if (row.type === "link" && row.permissionName) {
        // A2 Phase 5: 权限 row 的 button 根据 rawPermissionStatus 调整
        var permStatus = row.rawPermissionStatus || "prompt";
        var permClass = "fd-settings-row-action";
        var permLabel = row.actionLabel;
        var permAttrs = actionOverlay + innerActionAttrs;
        var permTitle = "";
        if (permStatus === "requesting") {
          permClass += " is-busy";
          permLabel = "请求中…";
          permAttrs += ' aria-busy="true" disabled';
        } else if (permStatus === "granted") {
          permClass += " is-success";
          permLabel = "已授权";
          permAttrs += " disabled";
        } else if (permStatus === "denied") {
          permClass += " is-denied";
          permLabel = "去设置";
        } else if (permStatus === "error") {
          permClass += " is-failed";
          permLabel = "重试";
          permAttrs += ' aria-invalid="true"';
        }
        action = `<button class="${permClass}" type="button"${permAttrs}${permTitle}>${esc(permLabel)}</button>`;
      } else {
        action = `<button class="fd-settings-row-action" type="button"${actionOverlay}>${esc(row.actionLabel)}</button>`;
      }
    }
    var chev = (row.options && !segment) || ["link", "select", "danger"].indexOf(row.type) >= 0 ? `<span class="fd-settings-trailing-icon">${chevron()}</span>` : "";
    return `${status}${segment}${stepper}${value}${action}${toggle}${chev}`;
  }

  function d2RowSideKind(row) {
    if (row.type === "switch") return "switch";
    if (row.type === "stepper") return "stepper";
    if (row.status && row.actionLabel) return "rich";
    if (row.type === "cache-cleanup" || row.actionLabel) return "action";
    if (row.status) return "status";
    if (row.value || row.options) return "value";
    if (row.route || row.overlay || row.type === "link" || row.type === "select" || row.type === "danger") return "icon";
    return "compact";
  }

  // A1 (R2a): d2Row 在 <article> 上 stamp select row 的 identity。
  // switch / segment / stepper 的 identity 已在子控件（span/button）上 stamp，
  // 因为 <article> 是 row 容器，子控件才是真正的可交互元素。
  // select row 的可交互元素是整个 <article>（点击打开选项列表）。
  // A2 Phase 7: select row 补 aria-haspopup="listbox" + aria-expanded="false"
  //   link row (permission) 补 aria-haspopup="dialog"
  //   cache-cleanup row 补 aria-haspopup="dialog"
  //   所有带 overlay 的 row 补 data-restore-focus（焦点恢复锚点）
  function d2Row(row, route, appState) {
    if (row.type === "input") return d2InputRow(row, route, appState && appState.webdavConfig ? appState.webdavConfig : null);
    var overlayAttr = row.overlay && row.type !== "cache-cleanup" ? ` data-settings-overlay="${esc(row.overlay)}"` : "";
    var routeAttr = row.route ? ` data-route="${esc(row.route)}"` : "";
    // select row 的 identity stamp 在 <article> 上
    var selectIdentity = row.type === "select" && row.settingsKey
      ? d2ResolveSubcontrolIdentity(route, row.settingsKey) : null;
    // A3: permission link row 的 identity 也 stamp 在 <article> 上
    //     settingsKey="permission-<permissionName>"
    var permissionIdentity = (row.type === "link" && row.permissionName)
      ? d2ResolveSubcontrolIdentity(route, "permission-" + row.permissionName) : null;
    // R2a (webdav-config): link row with settingsKey 也 stamp identity 在 <article> 上
    //   用于 webdav-error 页面的 "可能原因" 和 "建议操作" 行
    var linkIdentity = (row.type === "link" && !row.permissionName && row.settingsKey)
      ? d2ResolveSubcontrolIdentity(route, row.settingsKey) : null;
    var selectAttrs = d2StampIdentityAttrs(selectIdentity) + d2StampIdentityAttrs(permissionIdentity) + d2StampIdentityAttrs(linkIdentity);
    // A2 Phase 7: ARIA 属性
    var ariaAttrs = "";
    var roleAttr = "group";
    var tabindexAttr = "-1";
    if (row.type === "select") {
      ariaAttrs = ' aria-haspopup="listbox" aria-expanded="false"';
      roleAttr = "button";
      tabindexAttr = "0";
    } else if (overlayAttr || routeAttr) {
      ariaAttrs = ' aria-haspopup="dialog"';
      roleAttr = "button";
      tabindexAttr = "0";
    }
    // focus restore: 带 overlay 的 row 在 dialog 关闭后焦点应回到此 row
    // A2 Phase 7: 优先用 settingsKey（select），其次 permissionName（权限 row），最后才回退 overlay
    var restoreFocusAttr = overlayAttr ? ` data-restore-focus="${esc(row.settingsKey || row.permissionName || row.overlay)}"` : "";
    return `
      <article class="fd-setting-row${row.type ? ` is-${esc(row.type)}` : ""}${row.tone === "danger" ? " is-danger" : ""}"${overlayAttr}${routeAttr}${selectAttrs}${ariaAttrs}${restoreFocusAttr} role="${roleAttr}" tabindex="${tabindexAttr}">
        <span>${icon(row.icon || "settings", "fd-small-icon")}</span>
        <strong>${esc(row.title)}${row.meta ? `<small>${esc(row.meta)}</small>` : ""}</strong>
        <em class="fd-settings-row-side is-${d2RowSideKind(row)}">${d2RowSide(row, route)}</em>
      </article>`;
  }

  // 设置区块
  // R2a/R2b (webdav-config): section.actions 支持 identity（item.settingsKey）+
  //   asyncStatus + 焦点恢复锚点 + dialogInitialFocus。
  function d2Section(section, route, appState) {
    var body = (section.rows || []).map(function (row) { return d2Row(row, route, appState); }).join("");
    var actions = "";
    if (section.actions && section.actions.length) {
      actions = `
        <div class="fd-settings-section-actions" aria-label="配置操作">
          ${section.actions.map(function (item) {
            var overlayAttr = item.overlay ? ` data-settings-overlay="${esc(item.overlay)}"` : "";
            var routeAttr = item.route ? ` data-route="${esc(item.route)}"` : "";
            var actionIdentity = item.settingsKey ? d2ResolveSubcontrolIdentity(route, item.settingsKey) : null;
            var identityAttrs = d2StampIdentityAttrs(actionIdentity);
            var restoreFocusAttr = item.restoreFocus ? ` data-restore-focus="${esc(item.restoreFocus)}"` : "";
            var dialogInitialFocusAttr = item.dialogInitialFocus ? ` data-dialog-initial-focus="${esc(item.dialogInitialFocus)}"` : "";
            var asyncStatus = item.asyncStatus || null;
            var asyncError = item.asyncError || null;
            var buttonClass = item.tone === "danger" ? "is-danger" : "";
            var buttonLabel = item.title;
            var buttonAttrs = overlayAttr + routeAttr + identityAttrs + restoreFocusAttr + dialogInitialFocusAttr;
            if (asyncStatus === "loading") {
              buttonClass += " is-busy";
              buttonLabel = item.loadingLabel || (item.title + "…");
              buttonAttrs += ' aria-busy="true" disabled';
            } else if (asyncStatus === "success") {
              buttonClass += " is-success";
              buttonLabel = item.successLabel || "已完成";
              buttonAttrs += " disabled";
            } else if (asyncStatus === "failed") {
              buttonClass += " is-failed";
              buttonLabel = item.failedLabel || "重试";
              var titleAttr = asyncError ? ` title="${esc(asyncError)}"` : "";
              buttonAttrs += ' aria-invalid="true"' + titleAttr;
            } else if (asyncStatus === "confirm") {
              buttonClass += " is-confirm";
            }
            return `<button class="${buttonClass}" type="button"${buttonAttrs}>${icon(item.icon || "info", "fd-small-icon")}<span><strong>${esc(buttonLabel)}</strong>${item.meta ? `<small>${esc(item.meta)}</small>` : ""}</span></button>`;
          }).join("")}
        </div>`;
    }
    return `
      <section class="fd-setting-section${section.layout ? ` is-${esc(section.layout)}` : ""}" data-slot="settingSection">
        <h2>${esc(section.title)}</h2>
        ${body}
        ${actions}
      </section>`;
  }

  // 指标网格
  function d2MetricGrid(metrics) {
    if (!metrics || !metrics.length) return "";
    return `
      <section class="fd-settings-metric-grid" aria-label="设置概览指标">
        ${metrics.map(function (item) {
          return `<article>${icon(item.icon, "fd-small-icon")}<span><strong>${esc(item.value)}</strong><small>${esc(item.label)}</small></span></article>`;
        }).join("")}
      </section>`;
  }

  // 缓存占用卡
  function d2StorageCard(storage) {
    if (!storage) return "";
    return `
      <section class="fd-settings-storage-card" aria-label="缓存占用">
        <header><strong>${esc(storage.title)}</strong><span>${esc(storage.value)}</span></header>
        <i style="--used:${esc(pct(storage.percent || "0%"))}"><b></b></i>
        <p>${esc(storage.copy)}</p>
      </section>`;
  }

  // 操作列表（底部按钮）
  // A2 Phase 6: "恢复默认" action button 反映 resetDefaults.status
  // A3: reset-defaults button stamp 稳定 identity（settingsKey="reset-defaults"）
  // R2a/R2b (webdav-config): 支持 item.settingsKey 查找 identity；支持 item.asyncStatus
  //   反映 loading/success/failed；支持 item.restoreFocus / item.dialogInitialFocus
  //   作为焦点恢复锚点；支持 item.confirmLabel 在 confirm 状态显示。
  function d2ActionList(actions, route) {
    if (!actions || !actions.length) return "";
    return `
      <section class="fd-settings-action-list" aria-label="设置操作">
        ${actions.map(function (item) {
          var routeAttr = item.route ? ` data-route="${esc(item.route)}"` : "";
          var overlayAttr = item.overlay ? ` data-settings-overlay="${esc(item.overlay)}"` : "";
          // A3 / R2a: stamp 稳定 identity
          //   - reset-defaults: 由 item.resetStatus 触发（settings-general 用）
          //   - 其它: 由 item.settingsKey 显式指定（webdav-config 等用）
          var actionIdentity = null;
          if (item.resetStatus !== undefined) {
            actionIdentity = d2ResolveSubcontrolIdentity(route, "reset-defaults");
          } else if (item.settingsKey) {
            actionIdentity = d2ResolveSubcontrolIdentity(route, item.settingsKey);
          }
          var identityAttrs = d2StampIdentityAttrs(actionIdentity);
          // 焦点恢复锚点
          var restoreFocusAttr = item.restoreFocus ? ` data-restore-focus="${esc(item.restoreFocus)}"` : "";
          var dialogInitialFocusAttr = item.dialogInitialFocus ? ` data-dialog-initial-focus="${esc(item.dialogInitialFocus)}"` : "";
          // A2 Phase 6: 如果 item 带 resetStatus，根据状态调整 button
          var resetStatus = item.resetStatus || null;
          // R2b: webdav asyncStatus (loading/success/failed/confirm)
          var asyncStatus = item.asyncStatus || null;
          var asyncError = item.asyncError || null;
          var buttonClass = item.tone === "danger" ? "is-danger" : "";
          var buttonLabel = item.title;
          var buttonAttrs = overlayAttr + routeAttr + identityAttrs + restoreFocusAttr + dialogInitialFocusAttr;
          if (resetStatus === "submitting") {
            buttonClass += " is-busy";
            buttonLabel = "恢复中…";
            buttonAttrs += ' aria-busy="true" disabled';
          } else if (resetStatus === "success") {
            buttonClass += " is-success";
            buttonLabel = "已恢复";
            buttonAttrs += " disabled";
          } else if (resetStatus === "confirm") {
            buttonClass += " is-confirm";
          } else if (resetStatus === "cancelled") {
            buttonClass += " is-cancelled";
          } else if (asyncStatus === "loading") {
            buttonClass += " is-busy";
            buttonLabel = item.loadingLabel || (item.title + "…");
            buttonAttrs += ' aria-busy="true" disabled';
          } else if (asyncStatus === "success") {
            buttonClass += " is-success";
            buttonLabel = item.successLabel || "已完成";
            buttonAttrs += " disabled";
          } else if (asyncStatus === "failed") {
            buttonClass += " is-failed";
            buttonLabel = item.failedLabel || "重试";
            var titleAttr = asyncError ? ` title="${esc(asyncError)}"` : "";
            buttonAttrs += ' aria-invalid="true"' + titleAttr;
          } else if (asyncStatus === "confirm") {
            buttonClass += " is-confirm";
          }
          return `<button class="${buttonClass}" type="button"${buttonAttrs}>${icon(item.icon || "info", "fd-small-icon")}<span><strong>${esc(buttonLabel)}</strong><small>${esc(item.meta || "")}</small></span>${chevron()}</button>`;
        }).join("")}
      </section>`;
  }

  // 分区入口卡（用于 global-settings 等入口页）
  function d2EntryCard(item) {
    var routeAttr = item.route ? ` data-route="${esc(item.route)}"` : "";
    return `
      <article class="fd-setting-row is-link"${routeAttr} role="button" tabindex="0">
        <span>${icon(item.icon || "settings", "fd-small-icon")}</span>
        <strong>${esc(item.title)}<small>${esc(item.meta || "")}</small></strong>
        <em class="fd-settings-row-side is-icon">
          ${item.badge ? d2Badge(item.badge, item.tone) : ""}
          <span class="fd-settings-trailing-icon">${chevron()}</span>
        </em>
      </article>`;
  }

  // 备份卡（恢复记录列表项）
  function d2BackupCard(backup, options) {
    var scopes = (backup.scopes || []).join(",");
    var restoreRecord = backup.restoreRecord || `${backup.source} · ${backup.time} · ${backup.type}`;
    var content = backup.content || backup.includes || backup.type || "";
    var groupLabel = options && options.showGroup && backup.group ? `<h3>${esc(backup.group)}</h3>` : "";
    return `
      ${groupLabel}
      <article class="fd-settings-backup-card" role="button" tabindex="0" data-route="restore-confirm" data-restore-record="${esc(restoreRecord)}" data-restore-scopes="${esc(scopes)}">
        <span>${icon(backup.icon || "cloud", "fd-small-icon")}</span>
        <strong>
          ${esc(backup.source || "")}
          <small>${esc(backup.time || "")}</small>
          <small>${esc(content)}</small>
          <small>${esc(backup.size || "")}</small>
        </strong>
        <em>${backup.badge ? d2Badge(backup.badge, backup.tone) : chevron()}</em>
      </article>`;
  }

  // 备份列表区块
  function d2BackupList(section) {
    var backups = section.backups || [];
    var currentGroup = "";
    return `
      <div class="fd-settings-backup-list" aria-label="${esc(section.title)}备份列表">
        ${section.summary ? `<p>${esc(section.summary)}</p>` : ""}
        ${backups.map(function (backup) {
          var showGroup = backup.group && backup.group !== currentGroup;
          if (showGroup) currentGroup = backup.group;
          return d2BackupCard(backup, { showGroup: showGroup });
        }).join("")}
      </div>`;
  }

  // 恢复流程阶段条
  function d2RestoreStageList(stages) {
    return `
      <section class="fd-restore-stage-list" aria-label="恢复阶段">
        ${stages.map(function (stage) {
          return `
            <article class="${stage.active ? "is-active" : ""}${stage.done ? " is-done" : ""}">
              ${icon(stage.done ? "check" : stage.active ? "refresh" : "clock", "fd-small-icon")}
              <span>
                <strong>${esc(stage.title)}</strong>
                <small>${esc(stage.meta)}</small>
              </span>
              ${d2Badge(stage.status, stage.tone)}
              <i style="--restore-progress:${esc(stage.progress || "0%")}"><b></b></i>
            </article>`;
        }).join("")}
      </section>`;
  }

  // 恢复流程冲突列表（本地 vs 远程对比）
  function d2ConflictRows(items) {
    return `
      <section class="fd-restore-conflict-list" aria-label="恢复冲突列表">
        ${items.map(function (item) {
          return `
            <article>
              <span>
                <strong>${esc(item.title)}</strong>
                <small>${esc(item.meta)}</small>
              </span>
              <div class="fd-d2-conflict-pair">
                <button class="fd-d2-conflict-local${item.localSelected ? " is-selected" : ""}" type="button" data-d2-conflict-choice="local" data-d2-conflict-id="${esc(item.id || item.title)}">
                  <em>本地</em>
                  <strong>${esc(item.local)}</strong>
                  <small>${esc(item.localMeta || "")}</small>
                </button>
                <button class="fd-d2-conflict-remote${item.remoteSelected !== false ? " is-selected" : ""}" type="button" data-d2-conflict-choice="remote" data-d2-conflict-id="${esc(item.id || item.title)}">
                  <em>远程</em>
                  <strong>${esc(item.remote)}</strong>
                  <small>${esc(item.remoteMeta || "")}</small>
                </button>
              </div>
            </article>`;
        }).join("")}
      </section>`;
  }

  // 恢复流程摘要行
  function d2SummaryRows(rows) {
    return rows.map(function (pair) {
      return `<article><span>${esc(pair[0])}</span><strong>${esc(pair[1])}</strong></article>`;
    }).join("");
  }

  // ============ SettingsShell 包装 ============
  // 与 render-runtime.js 的 settingsScreen 保持一致的 shell 结构
  function d2PhoneShellClasses(extra) {
    return {
      frameClass: `fd-phone ${extra || ""}`.trim(),
      statusBarClass: "fd-status-bar",
      systemIconsClass: "fd-system-icons",
      signalClass: "fd-signal",
      wifiClass: "fd-wifi",
      batteryClass: "fd-battery",
      topBarClass: "fd-top-bar",
      topActionsClass: "fd-top-actions",
      iconButtonClass: "fd-icon-button",
      iconClass: "fd-icon",
      contentClass: "fd-phone-content",
      navClass: "fd-main-nav",
      navItemClass: "fd-main-nav-item",
      navIconShellClass: "fd-main-nav-icon-shell",
      navIconClass: "fd-nav-icon",
      stateHostClass: "fd-state-host"
    };
  }

  function d2SettingsShell(data, title, contentHtml, options) {
    options = options || {};
    var phoneClass = "fd-settings-phone fd-d2-settings-phone";
    if (options.frameState) phoneClass += " " + options.frameState;
    return shellKit().renderSettingsShell(Object.assign(d2PhoneShellClasses(phoneClass), {
      data: data,
      title: title,
      ariaLabel: title,
      topBarClass: "fd-back-bar",
      contentClass: "fd-phone-content fd-settings-content fd-d2-settings-content",
      bottomActionHostClass: options.bottomActionHostClass || "fd-bottom-action-host",
      sheetHostClass: options.sheetHostClass || "fd-sheet-host",
      toastHostClass: "fd-toast-host",
      dialogHostClass: "fd-dialog-host",
      stateHostClass: "fd-settings-state-host",
      contentHtml: contentHtml,
      bottomActionHtml: options.bottomActionHtml || "",
      sheetHtml: options.sheetHtml || "",
      toastHtml: options.toastHtml || "",
      dialogHtml: options.dialogHtml || "",
      trailingHtml: options.trailingHtml !== undefined ? options.trailingHtml : undefined,
      // A3: back button 稳定 identity attrs（由调用方通过 options.backButtonAttrs 传入，
      //     由 d2StampIdentityAttrs 生成）。未传时为空字符串，backTopBar 保持原行为。
      backButtonAttrs: options.backButtonAttrs || ""
    }));
  }

  // ===========================================================================
  // 1. globalSettingsV2 — 全局设置增强（阅读偏好 / 网络 / 缓存 / 隐私 4 分区）
  // 覆盖路由：
  //   global-settings / settings-general
  //   settings-reading-preferences / settings-network / settings-cache / settings-privacy
  //
  // A2 Phase 1 FROZEN: 本函数是 settings-general 路由的唯一权威 renderer。
  // render-runtime.js 的 switch case 已移除 fallback 到 settingsScreen 的路径，
  // 改为 fail-loud guard。任何对 settings-general DOM 的修改必须通过本函数。
  // 旧 settingsScreen 实现已被隔离，不再处理 settings-general 路由。
  // ===========================================================================
  function globalSettingsV2(data, route, appState) {
    if (route === "settings-general") {
      // A2 Phase 1 invariant: settings-general 必须由 globalSettingsV2 渲染。
      // 如果 appState 不存在，初始化空对象避免下游 NPE。
      appState = appState || {};
    }
    var page = d2GlobalSettingsPage(route, appState);
    var contentHtml = `
      ${d2MetricGrid(page.metrics)}
      ${d2StorageCard(page.storage)}
      ${(page.sections || []).map(function (section) {
        if (section.layout === "backup-list") return d2BackupList(section);
        return d2Section(section, route, appState);
      }).join("")}
      ${d2ActionList(page.actions, route)}`;
    // A3: back button 稳定 identity — 由 d2ResolveSubcontrolIdentity(route, "back")
    //     查找 a3-action 声明。settings-general 路由有 back 声明，会 stamp 5 个 data-*；
    //     其它路由无声明时返回 null，d2StampIdentityAttrs 返回 ""，backTopBar 保持原行为。
    var backIdentity = d2ResolveSubcontrolIdentity(route, "back");
    var backAttrs = d2StampIdentityAttrs(backIdentity);
    return d2SettingsShell(data, page.title, contentHtml, {
      toastHtml: page.toast ? `<section class="fd-settings-toast">${esc(page.toast)}</section>` : "",
      backButtonAttrs: backAttrs
    });
  }

  // A2 (R2b): settings-general page data 从 state owner 派生
  // 把 state.values 里的 raw value（"follow-system" / true 等）映射到 page data
  // 中的 label（"跟随系统" / enabled=true 等）。state.values 不存在时回落到默认值。
  var D2_SETTINGS_GENERAL_LABEL_MAP = {
    "app-theme": {
      values: ["follow-system", "light", "dark"],
      labels: ["跟随系统", "浅色", "深色"]
    },
    "language": {
      values: ["zh-CN", "zh-TW", "en"],
      labels: ["简体中文", "繁體中文", "English"]
    },
    "startup-screen": {
      values: ["bookshelf", "discover", "rss", "settings"],
      labels: ["书架", "发现", "RSS", "设置"]
    },
    "animation-effect": {
      values: ["reduce", "standard", "enhance"],
      labels: ["减少", "标准", "增强"]
    }
  };

  function d2SettingsGeneralLabelFor(settingsKey, rawValue) {
    var map = D2_SETTINGS_GENERAL_LABEL_MAP[settingsKey];
    if (!map) return rawValue;
    var idx = map.values.indexOf(rawValue);
    if (idx < 0) return map.labels[0]; // 未知值回落到第一个
    return map.labels[idx];
  }

  function d2SettingsGeneralRawFor(settingsKey, labelValue) {
    var map = D2_SETTINGS_GENERAL_LABEL_MAP[settingsKey];
    if (!map) return labelValue;
    var idx = map.labels.indexOf(labelValue);
    if (idx < 0) return map.values[0];
    return map.values[idx];
  }

  // 权限状态 → 中文 label
  function d2SettingsGeneralPermissionStatus(status) {
    switch (status) {
      case "granted": return { status: "已授权", tone: "good" };
      case "denied": return { status: "已拒绝", tone: "danger" };
      case "requesting": return { status: "请求中…", tone: "info" };
      case "error": return { status: "请求失败", tone: "warn" };
      case "prompt":
      default: return { status: "未授权", tone: "warn" };
    }
  }

  function d2SettingsGeneralPageData() {
    var state = d2SettingsGeneralGetState();
    var v = state.values;
    return {
      title: "通用设置",
      sections: [
        {
          title: "基础偏好",
          rows: [
            {
              type: "segment", icon: "palette", title: "App主题",
              value: d2SettingsGeneralLabelFor("app-theme", v["app-theme"]),
              options: D2_SETTINGS_GENERAL_LABEL_MAP["app-theme"].labels,
              settingsKey: "app-theme",
              rawValue: v["app-theme"]
            },
            {
              type: "select", icon: "globe", title: "语言",
              value: d2SettingsGeneralLabelFor("language", v["language"]),
              options: D2_SETTINGS_GENERAL_LABEL_MAP["language"].labels,
              settingsKey: "language",
              rawValue: v["language"]
            },
            {
              type: "select", icon: "home", title: "启动时打开",
              value: d2SettingsGeneralLabelFor("startup-screen", v["startup-screen"]),
              options: D2_SETTINGS_GENERAL_LABEL_MAP["startup-screen"].labels,
              settingsKey: "startup-screen",
              rawValue: v["startup-screen"]
            }
          ]
        },
        {
          title: "行为与反馈",
          rows: [
            {
              type: "switch", icon: "refresh", title: "自动检查更新",
              enabled: !!v["auto-check-update"], settingsKey: "auto-check-update"
            },
            {
              type: "switch", icon: "top", title: "点击当前底栏回顶部",
              enabled: !!v["tap-bottom-scroll-top"], settingsKey: "tap-bottom-scroll-top"
            },
            {
              type: "switch", icon: "motion", title: "减少动态效果",
              enabled: !!v["reduce-motion"], settingsKey: "reduce-motion"
            },
            {
              type: "switch", icon: "bug", title: "崩溃日志",
              enabled: !!v["crash-log"], status: v["crash-log"] ? "已开启" : "已关闭",
              statusTone: v["crash-log"] ? "good" : "warn",
              settingsKey: "crash-log"
            },
            {
              type: "select", icon: "play", title: "动画效果",
              value: d2SettingsGeneralLabelFor("animation-effect", v["animation-effect"]),
              options: D2_SETTINGS_GENERAL_LABEL_MAP["animation-effect"].labels,
              settingsKey: "animation-effect",
              rawValue: v["animation-effect"]
            },
            {
              type: "cache-cleanup", icon: "trash", title: "缓存清理",
              actionLabel: "清理缓存", overlay: "dialog:cache-clear",
              // A2 Phase 4: 清缓存流程状态从 state owner 派生
              cacheStatus: state.cacheClear.status,
              cacheError: state.cacheClear.lastError
            }
          ]
        },
        {
          title: "系统权限",
          rows: [
            (function () {
              var raw = state.permissions["file-access"];
              var s = d2SettingsGeneralPermissionStatus(raw);
              return { type: "link", icon: "folder", title: "文件访问", status: s.status, statusTone: s.tone, actionLabel: "去设置", overlay: "dialog:file-access-permission", permissionName: "file-access", rawPermissionStatus: raw };
            })(),
            (function () {
              var raw = state.permissions["notification"];
              var s = d2SettingsGeneralPermissionStatus(raw);
              return { type: "link", icon: "bell", title: "通知权限", status: s.status, statusTone: s.tone, actionLabel: "去设置", overlay: "dialog:notification-permission", permissionName: "notification", rawPermissionStatus: raw };
            })(),
            (function () {
              var raw = state.permissions["battery"];
              var s = d2SettingsGeneralPermissionStatus(raw);
              return { type: "link", icon: "battery", title: "电池优化", status: s.status, statusTone: s.tone, actionLabel: "去设置", overlay: "dialog:battery-permission", permissionName: "battery", rawPermissionStatus: raw };
            })()
          ]
        }
      ],
      actions: [
        {
          tone: "danger", icon: "refresh", title: "恢复默认", overlay: "dialog",
          // A2 Phase 6: 恢复默认流程状态从 state owner 派生
          resetStatus: state.resetDefaults.status
        }
      ]
    };
  }

  function d2GlobalSettingsPage(route, appState) {
    var appearance = readerAppearanceSpec();
    var defaultTheme = readerAppearanceTheme(appearance.defaults.dayThemeId);
    var defaultNightTheme = readerAppearanceTheme(appearance.defaults.nightThemeId);
    var defaultFont = readerAppearanceFont(appearance.defaults.fontId);
    var fontLabels = appearance.fonts
      .filter(function (font) { return !font.importAction; })
      .map(function (font) { return font.label; });
    var fontSize = readerAppearanceStepper("fontSize");
    var lineHeight = readerAppearanceStepper("lineHeight");
    var paragraphGap = readerAppearanceStepper("paragraphGap");
    var pageAnimation = readerAppearanceSelect("pageAnimation");
    var pages = {
      // 全局设置入口：4 个分区入口
      "global-settings": {
        title: "全局设置",
        sections: [
          {
            title: "设置分区",
            rows: [
              { type: "link", icon: "book", title: "阅读偏好", meta: "主题、字号、翻页、亮度默认值", route: "settings-reading-preferences" },
              { type: "link", icon: "globe", title: "网络", meta: "Wi-Fi 限制、并发、超时、代理", route: "settings-network", badge: "Wi-Fi", tone: "good" },
              { type: "link", icon: "download", title: "缓存", meta: "占用 1.28 GB · 上限 2 GB", route: "settings-cache", badge: "62%", tone: "warn" },
              { type: "link", icon: "shield", title: "隐私", meta: "历史、统计、应用锁、数据擦除", route: "settings-privacy" }
            ]
          },
          {
            title: "快速操作",
            rows: [
              { type: "link", icon: "refresh", title: "通用设置", meta: "主题、语言、行为与权限", route: "settings-general" },
              { type: "link", icon: "info", title: "关于与反馈", meta: "版本、源码、许可、反馈", route: "about-feedback" }
            ]
          }
        ]
      },
      // 通用设置（与 render-runtime.js 一致 + 状态变体补全）
      // A2 (R2b): 8 个 subcontrol 的 value/enabled 从 state owner 派生，
      // 不再是写死的默认值。state owner 是 d2SettingsGeneralGetState()。
      "settings-general": d2SettingsGeneralPageData(),
      // 阅读偏好分区
      "settings-reading-preferences": {
        title: "阅读偏好",
        metrics: [
          { icon: "palette", label: "当前主题", value: defaultTheme.label },
          { icon: "font", label: "默认字号", value: readerAppearanceValue(fontSize) },
          { icon: "book", label: "翻页模式", value: "覆盖" },
          { icon: "sun", label: "默认亮度", value: "62%" }
        ],
        sections: [
          {
            title: "排版默认值",
            rows: [
              { type: "select", icon: "palette", title: "默认主题", value: defaultTheme.label, options: appearance.themes.map(function (theme) { return theme.label; }) },
              { type: "stepper", icon: "font", title: "默认字号", value: readerAppearanceValue(fontSize), minLabel: "-", maxLabel: "+" },
              { type: "stepper", icon: "motion", title: "默认行距", value: readerAppearanceValue(lineHeight), minLabel: "-", maxLabel: "+" },
              { type: "select", icon: "font", title: "默认字体", value: defaultFont.label, options: fontLabels },
              { type: "switch", icon: "indent", title: "首行缩进", enabled: true },
              { type: "switch", icon: "spacing", title: "段间空行", enabled: true }
            ]
          },
          {
            title: "翻页与交互",
            rows: [
              { type: "select", icon: "book", title: "默认翻页模式", value: "覆盖", options: ["滚动", "左右", "覆盖", "无动画"] },
              { type: "select", icon: "file", title: "默认翻页动画", value: readerAppearanceDefaultLabel(pageAnimation), options: readerAppearanceOptionLabels(pageAnimation) },
              { type: "switch", icon: "volume", title: "音量键翻页", enabled: true },
              { type: "switch", icon: "sun", title: "屏幕常亮", enabled: false },
              { type: "switch", icon: "permission", title: "横屏锁定", enabled: false }
            ]
          },
          {
            title: "亮度与夜间",
            rows: [
              { type: "stepper", icon: "sun", title: "默认亮度", value: "62%", minLabel: "-", maxLabel: "+" },
              { type: "switch", icon: "auto", title: "自动亮度", enabled: true },
              { type: "switch", icon: "moon", title: "夜间跟随系统", enabled: true },
              { type: "select", icon: "palette", title: "夜间配色", value: defaultNightTheme.label, options: appearance.themes.filter(function (theme) { return theme.scheme === "night"; }).map(function (theme) { return theme.label; }) }
            ]
          }
        ],
        actions: [
          { icon: "check", title: "应用为默认", overlay: "dialog:apply-default" },
          { tone: "danger", icon: "refresh", title: "恢复默认", overlay: "dialog:reset-prefs" }
        ]
      },
      // 网络分区
      "settings-network": {
        title: "网络设置",
        metrics: [
          { icon: "wifi", label: "当前网络", value: "Wi-Fi" },
          { icon: "download", label: "下载速度", value: "1.2 MB/s" },
          { icon: "warning", label: "失败次数", value: "3" },
          { icon: "clock", label: "最近检测", value: "10:30" }
        ],
        sections: [
          {
            title: "下载策略",
            rows: [
              { type: "switch", icon: "wifi", title: "仅 Wi-Fi 下载", enabled: true, status: "已开启", statusTone: "good" },
              { type: "switch", icon: "warning", title: "流量警告", enabled: true },
              { type: "switch", icon: "download", title: "自动缓存后续章节", enabled: true },
              { type: "stepper", icon: "book", title: "缓存后续章节数", value: "5 章", minLabel: "-", maxLabel: "+" }
            ]
          },
          {
            title: "连接参数",
            rows: [
              { type: "stepper", icon: "layers", title: "并发请求数", value: "2", minLabel: "-", maxLabel: "+" },
              { type: "stepper", icon: "clock", title: "连接超时", value: "15 秒", minLabel: "-", maxLabel: "+" },
              { type: "stepper", icon: "refresh", title: "失败重试", value: "3 次", minLabel: "-", maxLabel: "+" },
              { type: "select", icon: "globe", title: "DNS", value: "系统", options: ["系统", "阿里", "Cloudflare", "自定义"] }
            ]
          },
          {
            title: "代理",
            rows: [
              { type: "switch", icon: "shield", title: "启用代理", enabled: false },
              { type: "input", inputType: "text", icon: "link", title: "代理地址", value: "", placeholder: "http://127.0.0.1:7890" },
              { type: "switch", icon: "lock", title: "代理书源请求", enabled: false }
            ]
          }
        ]
      },
      // 缓存分区
      "settings-cache": {
        title: "缓存管理",
        storage: { title: "缓存占用", value: "1.28 GB / 2 GB", percent: "64%", copy: "封面 256 MB · 章节 820 MB · 临时 208 MB" },
        metrics: [
          { icon: "image", label: "封面缓存", value: "256 MB" },
          { icon: "book", label: "章节缓存", value: "820 MB" },
          { icon: "folder", label: "临时文件", value: "208 MB" },
          { icon: "trash", label: "可清理", value: "186 MB" }
        ],
        sections: [
          {
            title: "缓存上限",
            rows: [
              { type: "select", icon: "download", title: "总缓存上限", value: "2 GB", options: ["1 GB", "2 GB", "4 GB", "不限"] },
              { type: "stepper", icon: "book", title: "每书章节缓存", value: "50 章", minLabel: "-", maxLabel: "+" },
              { type: "switch", icon: "refresh", title: "低于上限自动清理", enabled: true }
            ]
          },
          {
            title: "清理策略",
            rows: [
              { type: "select", icon: "clock", title: "自动清理周期", value: "每周", options: ["关闭", "每天", "每周", "每月"] },
              { type: "switch", icon: "image", title: "缓存封面图", enabled: true },
              { type: "switch", icon: "folder", title: "保留离线章节", enabled: true },
              { type: "cache-cleanup", icon: "trash", title: "立即清理临时文件", actionLabel: "清理 186 MB", overlay: "dialog:cache-clear-temp" }
            ]
          },
          {
            title: "高级",
            rows: [
              { type: "link", icon: "folder", title: "缓存目录", value: "/sdcard/Reader/cache" },
              { type: "switch", icon: "warning", title: "低空间警告", enabled: true, status: "剩余 4.2 GB", statusTone: "warn" }
            ]
          }
        ],
        actions: [
          { tone: "danger", icon: "trash", title: "清空全部缓存", overlay: "dialog:cache-clear-all" }
        ]
      },
      // 隐私分区
      "settings-privacy": {
        title: "隐私与安全",
        sections: [
          {
            title: "历史记录",
            rows: [
              { type: "switch", icon: "clock", title: "保存阅读历史", enabled: true },
              { type: "switch", icon: "search", title: "保存搜索历史", enabled: true },
              { type: "select", icon: "refresh", title: "自动清理", value: "永不", options: ["永不", "7 天后", "30 天后", "退出时"] },
              { type: "link", icon: "trash", title: "立即清空阅读历史", tone: "danger", overlay: "dialog:clear-history" }
            ]
          },
          {
            title: "数据采集",
            rows: [
              { type: "switch", icon: "bug", title: "崩溃日志上报", enabled: true, status: "匿名", statusTone: "good" },
              { type: "switch", icon: "chart", title: "使用统计", enabled: false },
              { type: "switch", icon: "bell", title: "运营推送", enabled: false }
            ]
          },
          {
            title: "应用安全",
            rows: [
              { type: "switch", icon: "lock", title: "应用锁", enabled: false, meta: "启动时需指纹解锁" },
              { type: "switch", icon: "eye", title: "隐藏书架封面", enabled: false },
              { type: "select", icon: "shield", title: "隐藏书籍分组", value: "未设置", options: ["未设置", "私密", "隐藏"] }
            ]
          },
          {
            title: "数据管理",
            rows: [
              { type: "link", icon: "download", title: "导出我的数据", route: "backup-manual" },
              { type: "link", icon: "trash", title: "擦除所有数据", tone: "danger", overlay: "dialog:erase-all" }
            ]
          }
        ]
      }
    };
    return pages[route] || pages["global-settings"];
  }

  // ===========================================================================
  // 2. readingSettingsV2 — 阅读设置增强（默认排版 / 翻页方式 / 亮度）
  // 覆盖路由：
  //   reading-settings-entry / reading-typography-default
  //   reading-page-turn-default / reading-brightness
  // ===========================================================================
  function readingSettingsV2(data, route, appState) {
    var page = d2ReadingSettingsPage(route, appState);
    var contentHtml = `
      ${d2MetricGrid(page.metrics)}
      ${(page.sections || []).map(function (section) {
        return d2Section(section, route, appState);
      }).join("")}
      ${d2ActionList(page.actions)}`;
    return d2SettingsShell(data, page.title, contentHtml);
  }

  function d2ReadingSettingsPage(route, appState) {
    var appearance = readerAppearanceSpec();
    var defaultFont = readerAppearanceFont(appearance.defaults.fontId);
    var fontLabels = appearance.fonts
      .filter(function (font) { return !font.importAction; })
      .map(function (font) { return font.label; });
    var fontSize = readerAppearanceStepper("fontSize");
    var lineHeight = readerAppearanceStepper("lineHeight");
    var paragraphGap = readerAppearanceStepper("paragraphGap");
    var paragraphIndent = readerAppearanceSelect("paragraphIndentMode");
    var textAlignment = readerAppearanceSelect("textAlignment");
    var pageAnimation = readerAppearanceSelect("pageAnimation");
    var pages = {
      // 阅读设置入口
      "reading-settings-entry": {
        title: "阅读设置",
        sections: [
          {
            title: "默认值管理",
            rows: [
              { type: "link", icon: "font", title: "默认排版", meta: "字体、字号、行距、对齐", route: "reading-typography-default" },
              { type: "link", icon: "book", title: "翻页方式", meta: "翻页模式、动画、音量键", route: "reading-page-turn-default" },
              { type: "link", icon: "sun", title: "亮度", meta: "亮度、自动、夜间", route: "reading-brightness" }
            ]
          },
          {
            title: "其它",
            rows: [
              { type: "link", icon: "settings", title: "通用设置", route: "settings-general" },
              { type: "link", icon: "book", title: "阅读偏好", route: "settings-reading-preferences" }
            ]
          }
        ]
      },
      // 默认排版
      "reading-typography-default": {
        title: "默认排版",
        metrics: [
          { icon: "font", label: "默认字号", value: readerAppearanceValue(fontSize) },
          { icon: "motion", label: "行距", value: readerAppearanceValue(lineHeight) },
          { icon: "align", label: "对齐", value: readerAppearanceDefaultLabel(textAlignment) },
          { icon: "palette", label: "默认字体", value: defaultFont.label }
        ],
        sections: [
          {
            title: "字体与字号",
            rows: [
              { type: "select", icon: "font", title: "默认字体", value: defaultFont.label, options: fontLabels },
              { type: "stepper", icon: "font", title: "字号", value: readerAppearanceValue(fontSize), minLabel: "A-", maxLabel: "A+" },
              { type: "stepper", icon: "motion", title: "行距", value: readerAppearanceValue(lineHeight), minLabel: "-", maxLabel: "+" },
              { type: "stepper", icon: "spacing", title: "段距", value: readerAppearanceValue(paragraphGap), minLabel: "-", maxLabel: "+" }
            ]
          },
          {
            title: "排版样式",
            rows: [
              { type: "select", icon: "align", title: textAlignment.label, value: readerAppearanceDefaultLabel(textAlignment), options: readerAppearanceOptionLabels(textAlignment) },
              { type: "select", icon: "indent", title: paragraphIndent.label, value: readerAppearanceDefaultLabel(paragraphIndent), options: readerAppearanceOptionLabels(paragraphIndent) },
              { type: "switch", icon: "spacing", title: "段间空行", enabled: true },
              { type: "switch", icon: "punctuation", title: "标点压缩", enabled: true },
              { type: "switch", icon: "bold", title: "加粗正文", enabled: false }
            ]
          },
          {
            title: "高级",
            rows: [
              { type: "switch", icon: "eye", title: "繁简自动转换", enabled: false },
              { type: "select", icon: "globe", title: "转换方向", value: "繁→简", options: ["繁→简", "简→繁"] },
              { type: "switch", icon: "type", title: "自定义 CSS", enabled: false }
            ]
          }
        ],
        actions: [
          { tone: "danger", icon: "refresh", title: "恢复默认排版", overlay: "dialog:reset-typography" }
        ]
      },
      // 翻页方式
      "reading-page-turn-default": {
        title: "翻页方式",
        metrics: [
          { icon: "book", label: "翻页模式", value: "覆盖" },
          { icon: "file", label: "动画", value: readerAppearanceDefaultLabel(pageAnimation) },
          { icon: "volume", title: "音量键", label: "音量键", value: "开" },
          { icon: "gesture", label: "点击翻页", value: "左右" }
        ],
        sections: [
          {
            title: "翻页模式",
            rows: [
              { type: "segment", icon: "book", title: "模式", value: "覆盖", options: ["滚动", "左右", "覆盖", "无动画"] },
              { type: "select", icon: "file", title: "翻页动画", value: readerAppearanceDefaultLabel(pageAnimation), options: readerAppearanceOptionLabels(pageAnimation) },
              { type: "stepper", icon: "motion", title: "动画时长", value: "280 ms", minLabel: "-", maxLabel: "+" }
            ]
          },
          {
            title: "交互",
            rows: [
              { type: "select", icon: "gesture", title: "点击翻页方式", value: "左右", options: ["左右", "上下", "仅中间", "关闭"] },
              { type: "switch", icon: "volume", title: "音量键翻页", enabled: true },
              { type: "switch", icon: "permission", title: "横屏锁定", enabled: false },
              { type: "switch", icon: "top", title: "点击底栏回顶部", enabled: true }
            ]
          },
          {
            title: "自动翻页",
            rows: [
              { type: "switch", icon: "refresh", title: "自动翻页", enabled: false },
              { type: "stepper", icon: "clock", title: "翻页间隔", value: "8 秒", minLabel: "-", maxLabel: "+" },
              { type: "switch", icon: "play", title: "自动翻页动画", enabled: true }
            ]
          }
        ]
      },
      // 亮度
      "reading-brightness": {
        title: "亮度与夜间",
        metrics: [
          { icon: "sun", label: "当前亮度", value: "62%" },
          { icon: "auto", label: "自动亮度", value: "开" },
          { icon: "moon", label: "夜间模式", value: "跟随" },
          { icon: "palette", label: "夜间配色", value: "墨黑" }
        ],
        sections: [
          {
            title: "亮度",
            rows: [
              { type: "stepper", icon: "sun", title: "默认亮度", value: "62%", minLabel: "-", maxLabel: "+" },
              { type: "switch", icon: "auto", title: "自动亮度", enabled: true, status: "跟随环境光", statusTone: "good" },
              { type: "switch", icon: "sun", title: "屏幕常亮", enabled: false }
            ]
          },
          {
            title: "夜间模式",
            rows: [
              { type: "switch", icon: "moon", title: "跟随系统", enabled: true },
              { type: "select", icon: "clock", title: "定时切换", value: "关闭", options: ["关闭", "日落到日出", "自定义"] },
              { type: "select", icon: "palette", title: "夜间配色", value: "墨黑", options: ["墨黑", "深灰", "纸纹夜"] },
              { type: "stepper", icon: "contrast", title: "夜间对比度", value: "标准", minLabel: "-", maxLabel: "+" }
            ]
          },
          {
            title: "护眼",
            rows: [
              { type: "switch", icon: "eye", title: "护眼滤镜", enabled: false },
              { type: "stepper", icon: "palette", title: "色温", value: "暖", minLabel: "冷", maxLabel: "暖" }
            ]
          }
        ]
      }
    };
    return pages[route] || pages["reading-settings-entry"];
  }

  // ===========================================================================
  // 3. sourceSettingsV2 — 书源设置增强（书源管理 / 调试 / 导入导出）
  // 覆盖路由：source-settings-entry / source-management / source-debug / source-import-export
  //
  // R2a-1: source-management 路由由 sourceManagementV2 完整渲染（列表/搜索/筛选/
  //   批量/更多菜单/添加 Sheet/删除确认 Dialog/状态矩阵），render-runtime.js 的
  //   sourceManagementScreen fallback 已 FROZEN（throw Error）。
  // ===========================================================================

  // ---- R2b: source-management 状态 owner ----
  var D2_SOURCE_MANAGEMENT_STORAGE_KEY = "source-management-values";

  // 4 个书源，settingsKey 与 control-identity-declarations.js switch 声明一致
  var D2_SOURCE_MANAGEMENT_DEFAULT_SOURCES = [
    { settingsKey: "source-qidian", title: "起点中文网", domain: "qidian.com", group: "起点导入", status: "可用", tone: "good", enabled: true },
    { settingsKey: "source-biquge", title: "笔趣阁", domain: "biquge.example", group: "玄幻书源", status: "异常", tone: "warn", enabled: true },
    { settingsKey: "source-local-import", title: "本地导入源", domain: "本地文件导入", group: "自定义", status: "未检测", tone: "muted", enabled: false },
    { settingsKey: "source-test", title: "测试书源", domain: "test.example", group: "测试书源", status: "可用", tone: "good", enabled: true }
  ];

  function d2SourceManagementDefaultState() {
    return {
      sources: D2_SOURCE_MANAGEMENT_DEFAULT_SOURCES.map(function (s) { return Object.assign({}, s); }),
      search: "",
      statusFilter: "全部",
      groupFilter: "全部分组",
      batchMode: false,
      selectedSources: {},
      menuOpen: false,
      addSheetOpen: false,
      deleteConfirm: { open: false, count: 0, logCleanup: false, status: "idle", error: null }
    };
  }

  function d2SourceManagementInitState(appState) {
    var state = d2SourceManagementDefaultState();
    var stored = d2Get(D2_SOURCE_MANAGEMENT_STORAGE_KEY, null);
    if (stored && typeof stored === "object" && stored.sourceEnabled) {
      state.sources = state.sources.map(function (s) {
        if (Object.prototype.hasOwnProperty.call(stored.sourceEnabled, s.settingsKey)) {
          return Object.assign({}, s, { enabled: !!stored.sourceEnabled[s.settingsKey] });
        }
        return s;
      });
    }
    if (appState) {
      if (appState.sourceEnabled) {
        state.sources = state.sources.map(function (s) {
          if (Object.prototype.hasOwnProperty.call(appState.sourceEnabled, s.title)) {
            return Object.assign({}, s, { enabled: !!appState.sourceEnabled[s.title] });
          }
          return s;
        });
      }
      if (appState.sourceStatusFilter) state.statusFilter = appState.sourceStatusFilter;
      if (appState.sourceGroupFilter) state.groupFilter = appState.sourceGroupFilter;
      if (appState.sourceMenuOpen) state.menuOpen = !!appState.sourceMenuOpen;
    }
    return state;
  }

  function d2SourceManagementReducer(state, action) {
    if (!state) state = d2SourceManagementDefaultState();
    if (!action || !action.type) return state;
    switch (action.type) {
      case "INIT":
        return d2SourceManagementInitState(action.appState || {});

      case "TOGGLE_SOURCE": {
        if (!action.settingsKey) return state;
        var nextSources = state.sources.map(function (s) {
          if (s.settingsKey === action.settingsKey) return Object.assign({}, s, { enabled: !!action.value });
          return s;
        });
        return Object.assign({}, state, { sources: nextSources });
      }

      case "SET_SEARCH":
        return Object.assign({}, state, { search: action.value || "" });

      case "SET_STATUS_FILTER":
        return Object.assign({}, state, { statusFilter: action.value || "全部" });

      case "SET_GROUP_FILTER":
        return Object.assign({}, state, { groupFilter: action.value || "全部分组" });

      case "TOGGLE_MENU":
        return Object.assign({}, state, { menuOpen: !state.menuOpen });
      case "CLOSE_MENU":
        return Object.assign({}, state, { menuOpen: false });

      case "OPEN_ADD_SHEET":
        return Object.assign({}, state, { addSheetOpen: true, menuOpen: false });
      case "CLOSE_ADD_SHEET":
        return Object.assign({}, state, { addSheetOpen: false });

      case "ENTER_BATCH_MODE":
        return Object.assign({}, state, { batchMode: true, menuOpen: false });
      case "EXIT_BATCH_MODE":
        return Object.assign({}, state, { batchMode: false, selectedSources: {} });

      case "TOGGLE_SELECT": {
        if (!action.settingsKey) return state;
        var nextSelected = Object.assign({}, state.selectedSources);
        if (nextSelected[action.settingsKey]) delete nextSelected[action.settingsKey];
        else nextSelected[action.settingsKey] = true;
        return Object.assign({}, state, { selectedSources: nextSelected });
      }
      case "SELECT_ALL": {
        var allSelected = {};
        state.sources.forEach(function (s) { allSelected[s.settingsKey] = true; });
        return Object.assign({}, state, { selectedSources: allSelected });
      }
      case "DESELECT_ALL":
        return Object.assign({}, state, { selectedSources: {} });

      case "DELETE_CONFIRM_OPEN": {
        var count = Object.keys(state.selectedSources).length;
        return Object.assign({}, state, {
          deleteConfirm: { open: true, count: count, logCleanup: false, status: "confirm", error: null }
        });
      }
      case "DELETE_CONFIRM_CLOSE":
        return Object.assign({}, state, {
          deleteConfirm: Object.assign({}, state.deleteConfirm, { open: false, status: "idle" })
        });
      case "DELETE_CONFIRM_TOGGLE_LOG":
        return Object.assign({}, state, {
          deleteConfirm: Object.assign({}, state.deleteConfirm, { logCleanup: !state.deleteConfirm.logCleanup })
        });
      case "DELETE_START":
        // 重复点击 guard：只有 confirm 状态才能进入 loading
        if (state.deleteConfirm.status === "loading") return state;
        return Object.assign({}, state, {
          deleteConfirm: Object.assign({}, state.deleteConfirm, { status: "loading", error: null })
        });
      case "DELETE_SUCCESS": {
        // stale async result guard：只有 loading 状态才接受 success
        if (state.deleteConfirm.status !== "loading") return state;
        var remainingSources = state.sources.filter(function (s) { return !state.selectedSources[s.settingsKey]; });
        return Object.assign({}, state, {
          sources: remainingSources,
          selectedSources: {},
          batchMode: false,
          deleteConfirm: { open: false, count: 0, logCleanup: false, status: "success", error: null }
        });
      }
      case "DELETE_FAILED":
        if (state.deleteConfirm.status !== "loading") return state;
        return Object.assign({}, state, {
          deleteConfirm: Object.assign({}, state.deleteConfirm, { status: "failed", error: action.error || "unknown error" })
        });
      case "DELETE_RESET":
        return Object.assign({}, state, {
          deleteConfirm: { open: false, count: 0, logCleanup: false, status: "idle", error: null }
        });

      default:
        return state;
    }
  }

  var d2SourceManagementState = null;
  var d2SourceManagementListeners = [];

  function d2SourceManagementGetState() {
    if (!d2SourceManagementState) {
      d2SourceManagementState = d2SourceManagementDefaultState();
    }
    return d2SourceManagementState;
  }

  function d2SourceManagementSubscribe(listener) {
    d2SourceManagementListeners.push(listener);
    return function unsubscribe() {
      d2SourceManagementListeners = d2SourceManagementListeners.filter(function (l) { return l !== listener; });
    };
  }

  function d2SourceManagementDispatch(action) {
    var prev = d2SourceManagementState || d2SourceManagementDefaultState();
    var next = d2SourceManagementReducer(prev, action);
    if (next === prev) return;
    // 持久化 source enabled 状态
    if (next.sources !== prev.sources) {
      var sourceEnabled = {};
      next.sources.forEach(function (s) { sourceEnabled[s.settingsKey] = s.enabled; });
      d2Set(D2_SOURCE_MANAGEMENT_STORAGE_KEY, { sourceEnabled: sourceEnabled });
    }
    d2SourceManagementState = next;
    for (var i = 0; i < d2SourceManagementListeners.length; i++) {
      try { d2SourceManagementListeners[i](next, prev, action); } catch (e) { /* ignore listener errors */ }
    }
  }

  function d2SourceManagementInjectAppState(appState) {
    d2SourceManagementState = d2SourceManagementInitState(appState || {});
    return d2SourceManagementState;
  }

  // R2b: 删除书源执行函数（事件层 / 测试调用）
  // 调用方负责在 DELETE_CONFIRM_OPEN 后调用此函数执行实际删除。
  // demo 环境无真实删除 → 模拟 success / failed / timeout。
  // stale async guard：reducer 内 DELETE_SUCCESS / DELETE_FAILED 仅在 status=loading 时接受。
  // duplicate-click guard：reducer 内 DELETE_START 仅在 status=confirm 时接受。
  function d2ExecuteSourceDelete(options) {
    options = options || {};
    d2SourceManagementDispatch({ type: "DELETE_START" });
    var simulate = options.simulateResult || "success";
    return new Promise(function (resolve) {
      var delay = options.delay || 0;
      setTimeout(function () {
        if (simulate === "failed") {
          d2SourceManagementDispatch({
            type: "DELETE_FAILED",
            error: options.error || "删除失败，请稍后重试"
          });
          resolve("failed");
        } else {
          d2SourceManagementDispatch({ type: "DELETE_SUCCESS" });
          resolve("success");
        }
      }, delay);
    });
  }

  // ---- R2a/R2b: source-management 完整渲染 ----

  // 辅助：source row more-actions button identity
  function d2SourceRowMoreAttrs(settingsKey) {
    var identity = d2ResolveSubcontrolIdentity("source-management", "source-row-more-" + settingsKey);
    return d2StampIdentityAttrs(identity);
  }

  // 辅助：source row detect button identity
  function d2SourceRowDetectAttrs(settingsKey) {
    var identity = d2ResolveSubcontrolIdentity("source-management", "source-row-detect-" + settingsKey);
    return d2StampIdentityAttrs(identity);
  }

  // 辅助：source row checkbox (batch mode) identity
  function d2SourceRowSelectAttrs(settingsKey) {
    var identity = d2ResolveSubcontrolIdentity("source-management", "source-row-select-" + settingsKey);
    return d2StampIdentityAttrs(identity);
  }

  // 辅助：action button identity stamping (a3-action pattern)
  function d2SourceActionAttrs(settingsKey) {
    var identity = d2ResolveSubcontrolIdentity("source-management", settingsKey);
    return d2StampIdentityAttrs(identity);
  }

  // 搜索输入
  function d2SourceSearchInput(state) {
    var identity = d2ResolveSubcontrolIdentity("source-management", "source-search");
    var attrs = d2StampIdentityAttrs(identity);
    return `<label class="fd-source-search">
      ${icon("search", "fd-small-icon")}
      <input type="search"${attrs} value="${esc(state.search)}" placeholder="搜索书源名称或域名" aria-label="搜索书源" autocomplete="off">
    </label>`;
  }

  // 状态筛选 segment + 分组筛选 select
  function d2SourceFilters(state) {
    // status filter segment — 使用 d2Segment（每个 option button 自带 identity，
    // container 不 stamp，与 settings-general 一致）
    var statusRow = {
      settingsKey: "source-status-filter",
      title: "状态筛选",
      options: ["全部", "启用", "异常", "未检测", "自定义"],
      value: state.statusFilter
    };
    var statusSegment = d2Segment(statusRow, "source-management");

    // group filter select — <select> 元素 stamp identity
    var groupIdentity = d2ResolveSubcontrolIdentity("source-management", "source-group-filter");
    var groupAttrs = d2StampIdentityAttrs(groupIdentity);
    var groupOptions = ["全部分组", "玄幻书源", "起点导入", "测试书源", "自定义"];
    var groupSelect = `<label class="fd-source-group-filter">
      <span>${icon("folder", "fd-small-icon")}<strong>分组</strong></span>
      <select${groupAttrs} aria-label="分组筛选">
        ${groupOptions.map(function (g) {
          return `<option value="${esc(g)}"${state.groupFilter === g ? " selected" : ""}>${esc(g)}</option>`;
        }).join("")}
      </select>
    </label>`;

    var enabledCount = state.sources.filter(function (s) { return s.enabled; }).length;
    var errorCount = state.sources.filter(function (s) { return s.status === "异常"; }).length;
    var statLine = `<p class="fd-source-stat-line">${state.sources.length} 个书源 · ${enabledCount} 个启用 · ${errorCount} 个异常 · 10:30 检测</p>`;

    return `${statLine}${statusSegment}${groupSelect}`;
  }

  // 单行书源
  function d2SourceRow(row, state) {
    var isSelected = !!state.selectedSources[row.settingsKey];
    var rowClass = "fd-source-row" + (isSelected ? " is-selected" : "");
    var selectAttrs = d2SourceRowSelectAttrs(row.settingsKey);
    var detectAttrs = d2SourceRowDetectAttrs(row.settingsKey);
    var moreAttrs = d2SourceRowMoreAttrs(row.settingsKey);

    var checkbox = state.batchMode
      ? `<button class="fd-source-check${isSelected ? " is-checked" : ""}" type="button"${selectAttrs} aria-label="${esc(row.title)}${isSelected ? "已选择" : "未选择"}" aria-pressed="${isSelected ? "true" : "false"}">${isSelected ? icon("check", "fd-small-icon") : ""}</button>`
      : "";

    // switch identity uses the existing switch declarations (source-biquge etc.)
    var switchIdentity = d2ResolveSubcontrolIdentity("source-management", row.settingsKey);
    var switchAttrs = d2StampIdentityAttrs(switchIdentity);
    var switchHtml = `<span class="fd-settings-switch${row.enabled ? " is-on" : ""}"${switchAttrs} role="switch" aria-checked="${row.enabled ? "true" : "false"}" tabindex="0" aria-label="${esc(row.title)}${row.enabled ? "已启用，点击禁用" : "已禁用，点击启用"}"><i></i></span>`;

    var detectBtn = state.batchMode ? "" : `<button class="fd-source-row-test" type="button"${detectAttrs} aria-label="检测 ${esc(row.title)}">检测</button>`;
    var moreBtn = state.batchMode ? "" : `<button class="fd-source-row-more" type="button"${moreAttrs} data-restore-focus="more-${esc(row.settingsKey)}" aria-label="更多操作 ${esc(row.title)}">${icon("more", "fd-small-icon")}</button>`;

    return `<article class="${rowClass}">
      ${checkbox}
      <span class="fd-source-row-main"><strong>${esc(row.title)}</strong><small>${esc(row.domain)} · ${esc(row.group)}</small></span>
      <em class="fd-source-row-state">${d2Badge(row.status, row.tone)}</em>
      ${detectBtn}
      <span class="fd-source-row-toggle">${state.batchMode ? "" : switchHtml}</span>
      ${moreBtn}
    </article>`;
  }

  // source list
  function d2SourceList(state, filteredSources) {
    if (filteredSources.length === 0) {
      return `<section class="fd-source-list fd-source-list-empty" aria-label="书源列表">
        <p class="fd-source-empty">没有匹配的书源</p>
      </section>`;
    }
    return `<section class="fd-source-list" aria-label="书源列表">
      ${filteredSources.map(function (s) { return d2SourceRow(s, state); }).join("")}
    </section>`;
  }

  // batch mode top bar
  function d2SourceBatchTop(state) {
    var selectedCount = Object.keys(state.selectedSources).length;
    var allSelected = selectedCount === state.sources.length && selectedCount > 0;
    var exitAttrs = d2SourceActionAttrs("batch-exit");
    var selectAllAttrs = d2SourceActionAttrs("batch-select-all");
    return `<div class="fd-source-batch-top">
      <button type="button"${exitAttrs} aria-label="退出批量模式">取消</button>
      <strong>已选 ${selectedCount} 个</strong>
      <button type="button"${selectAllAttrs} aria-pressed="${allSelected ? "true" : "false"}" aria-label="${allSelected ? "取消全选" : "全选"}">${allSelected ? "取消全选" : "全选"}</button>
    </div>`;
  }

  // home bottom actions (non-batch)
  function d2SourceHomeActions(state) {
    var batchAttrs = d2SourceActionAttrs("batch-enter");
    var addAttrs = d2SourceActionAttrs("source-add");
    return `<div class="fd-source-bottom-bar is-fixed">
      <button type="button"${batchAttrs} aria-label="进入批量管理">批量管理</button>
      <button type="button"${addAttrs} data-restore-focus="source-add" aria-label="新增书源">${icon("add", "fd-small-icon")}新增书源</button>
    </div>`;
  }

  // batch bottom actions
  function d2SourceBatchActions(state) {
    var selectedCount = Object.keys(state.selectedSources).length;
    var disabled = selectedCount === 0 ? " disabled" : "";
    var enableAttrs = d2SourceActionAttrs("batch-enable");
    var disableAttrs = d2SourceActionAttrs("batch-disable");
    var detectAttrs = d2SourceActionAttrs("batch-detect");
    var groupAttrs = d2SourceActionAttrs("batch-group");
    var deleteAttrs = d2SourceActionAttrs("batch-delete");
    return `<div class="fd-source-bottom-bar fd-source-batch-actions">
      <button type="button"${enableAttrs}${disabled} aria-label="启用已选">启用</button>
      <button type="button"${disableAttrs}${disabled} aria-label="禁用已选">禁用</button>
      <button type="button"${detectAttrs}${disabled} aria-label="检测已选">检测</button>
      <button type="button"${groupAttrs}${disabled} aria-label="分组已选">分组</button>
      <button class="is-danger" type="button"${deleteAttrs}${disabled} data-restore-focus="batch-delete" aria-label="删除已选 ${selectedCount} 个书源">删除</button>
    </div>`;
  }

  // more menu overlay
  function d2SourceMoreMenu(state) {
    if (!state.menuOpen) return "";
    var items = [
      { settingsKey: "menu-import-network", label: "网络导入" },
      { settingsKey: "menu-import-local", label: "本地导入" },
      { settingsKey: "menu-create-new", label: "新建书源" },
      { settingsKey: "menu-batch-manage", label: "批量管理" },
      { settingsKey: "menu-group-manage", label: "分组管理" },
      { settingsKey: "menu-detect-selected", label: "校验所选" },
      { settingsKey: "menu-error-logs", label: "错误日志" }
    ];
    return `<nav class="fd-source-more-menu" aria-label="书源更多操作">
      ${items.map(function (item) {
        var attrs = d2SourceActionAttrs(item.settingsKey);
        return `<button type="button"${attrs}>${esc(item.label)}</button>`;
      }).join("")}
    </nav>`;
  }

  // add source sheet overlay
  function d2SourceAddSheet(state) {
    if (!state.addSheetOpen) return "";
    var cancelAttrs = d2SourceActionAttrs("add-sheet-cancel");
    var items = [
      { settingsKey: "add-sheet-network", icon: "cloud", title: "网络导入", meta: "从 URL 拉取书源包" },
      { settingsKey: "add-sheet-local", icon: "folder", title: "本地导入", meta: "选择本地 JSON 或 TXT 文件" },
      { settingsKey: "add-sheet-clipboard", icon: "file", title: "剪贴板导入", meta: "解析剪贴板中的书源内容" },
      { settingsKey: "add-sheet-manual", icon: "edit", title: "手动新建", meta: "进入空白书源编辑页" }
    ];
    return `<section class="fd-demo-sheet fd-source-bottom-sheet" aria-label="添加书源" aria-hidden="false" data-demo-sheet>
      <div class="fd-sheet-grabber"></div>
      <h2>添加书源</h2>
      ${items.map(function (item) {
        var attrs = d2SourceActionAttrs(item.settingsKey);
        return `<button type="button"${attrs}>${icon(item.icon, "fd-small-icon")}<span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>${chevron("fd-small-icon")}</button>`;
      }).join("")}
      <button class="is-cancel" type="button"${cancelAttrs} data-sheet-initial-focus aria-label="取消添加书源">取消</button>
    </section>`;
  }

  // delete confirm dialog overlay
  function d2SourceDeleteDialog(state) {
    if (!state.deleteConfirm.open) return "";
    var dc = state.deleteConfirm;
    var cancelAttrs = d2SourceActionAttrs("delete-cancel");
    var confirmAttrs = d2SourceActionAttrs("delete-confirm");
    var logAttrs = d2SourceActionAttrs("delete-log-cleanup");
    var isBusy = dc.status === "loading";
    var isFailed = dc.status === "failed";
    var titleAttr = isFailed && dc.error ? ` title="${esc(dc.error)}"` : "";
    var confirmLabel = isBusy ? "删除中…" : isFailed ? "重试" : "删除";
    var confirmDisabled = isBusy ? " disabled aria-busy=\"true\"" : "";
    var confirmInvalid = isFailed ? " aria-invalid=\"true\"" : "";
    var dialogStatus = isBusy ? " data-delete-status=\"loading\"" : isFailed ? " data-delete-status=\"failed\"" : "";
    return `<section class="fd-demo-dialog fd-source-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="source-delete-title" aria-describedby="source-delete-desc" aria-hidden="false" data-demo-dialog data-source-delete-dialog${dialogStatus}>
      <h2 id="source-delete-title">删除书源？</h2>
      <p id="source-delete-desc">将删除已选 ${dc.count} 个书源。不会删除书架书籍，但这些书源将不再参与搜索、发现和换源。${isFailed && dc.error ? "<br><strong>" + esc(dc.error) + "</strong>" : ""}</p>
      <label class="fd-source-delete-option"><input type="checkbox"${logAttrs} ${dc.logCleanup ? "checked" : ""}> <span>同时清除相关检测日志</span></label>
      <div class="fd-source-delete-actions">
        <button type="button"${cancelAttrs}${isBusy ? " disabled" : ""} data-dialog-initial-focus>取消</button>
        <button class="is-danger" type="button"${confirmAttrs}${confirmDisabled}${confirmInvalid}${titleAttr}>${confirmLabel}</button>
      </div>
    </section>`;
  }

  // source-management 完整页面内容
  function d2SourceManagementContent(state) {
    var filtered = state.sources.filter(function (s) {
      if (state.search) {
        var q = state.search.toLowerCase();
        if (s.title.toLowerCase().indexOf(q) < 0 && s.domain.toLowerCase().indexOf(q) < 0) return false;
      }
      if (state.statusFilter === "启用" && !s.enabled) return false;
      if (state.statusFilter === "异常" && s.status !== "异常") return false;
      if (state.statusFilter === "未检测" && s.status !== "未检测") return false;
      if (state.statusFilter === "自定义" && s.group !== "自定义") return false;
      if (state.groupFilter !== "全部分组" && s.group !== state.groupFilter) return false;
      return true;
    });

    var batchTop = state.batchMode ? d2SourceBatchTop(state) : "";
    var searchInput = state.batchMode ? "" : d2SourceSearchInput(state);
    var filters = state.batchMode ? "" : d2SourceFilters(state);
    var moreMenu = d2SourceMoreMenu(state);
    var list = d2SourceList(state, filtered);

    return `<section class="fd-source-home">
      ${moreMenu}
      ${batchTop}
      ${searchInput}
      ${filters}
      ${list}
    </section>`;
  }

  // source-management 完整 renderer（R2a-1: 唯一 production renderer）
  function sourceManagementV2(data, appState) {
    var state = d2SourceManagementGetState();
    var selectedCount = Object.keys(state.selectedSources).length;
    var title = state.batchMode ? "已选 " + selectedCount + " 个" : "书源管理";

    var contentHtml = d2SourceManagementContent(state);
    var trailingHtml = state.batchMode ? "" : `<button type="button" aria-label="更多"${d2SourceActionAttrs("source-menu-toggle")} data-source-menu-toggle data-restore-focus="source-menu-toggle">${icon("more", "fd-small-icon")}</button>`;
    var bottomActionHtml = state.batchMode ? d2SourceBatchActions(state) : d2SourceHomeActions(state);
    var sheetHtml = d2SourceAddSheet(state);
    var dialogHtml = d2SourceDeleteDialog(state);
    var backIdentity = d2ResolveSubcontrolIdentity("source-management", "back");
    var backAttrs = d2StampIdentityAttrs(backIdentity);
    var frameState = state.addSheetOpen ? " has-sheet" : state.deleteConfirm.open ? " has-dialog" : "";

    return d2SettingsShell(data, title, contentHtml, {
      trailingHtml: trailingHtml,
      bottomActionHtml: bottomActionHtml,
      sheetHtml: sheetHtml,
      dialogHtml: dialogHtml,
      backButtonAttrs: backAttrs,
      bottomActionHostClass: "fd-bottom-action-host fd-source-control-host",
      sheetHostClass: "fd-sheet-host",
      frameState: frameState
    });
  }

  function sourceSettingsV2(data, route, appState) {
    // R2a-1: source-management 由 sourceManagementV2 完整渲染
    if (route === "source-management") {
      return sourceManagementV2(data, appState);
    }
    var page = d2SourceSettingsPage(route, appState);
    var contentHtml = `
      ${d2MetricGrid(page.metrics)}
      ${d2StorageCard(page.storage)}
      ${(page.sections || []).map(function (section) {
        return d2Section(section, route, appState);
      }).join("")}
      ${d2ActionList(page.actions)}`;
    return d2SettingsShell(data, page.title, contentHtml);
  }

  function d2SourceSettingsPage(route, appState) {
    var pages = {
      // 书源设置入口
      "source-settings-entry": {
        title: "书源设置",
        sections: [
          {
            title: "书源管理",
            rows: [
              { type: "link", icon: "source-stack", title: "书源管理", meta: "12 个书源 · 8 启用 · 4 异常", route: "source-management", badge: "12", tone: "info" },
              { type: "link", icon: "activity", title: "书源调试", meta: "搜索 / 详情 / 目录 / 正文 调测", route: "source-debug" },
              { type: "link", icon: "download", title: "导入与导出", meta: "网络 / 本地 / 剪贴板 / 导出", route: "source-import-export" }
            ]
          },
          {
            title: "其它",
            rows: [
              { type: "link", icon: "folder", title: "分组管理", route: "source-groups" },
              { type: "link", icon: "log", title: "错误日志", route: "source-logs" }
            ]
          }
        ]
      },
      // 书源管理（R2a-1: SUPERSDED — 完整版由 sourceManagementV2 渲染。
      //   此 page data 仅保留给 source-settings-entry 等其它路由的 link row 引用，
      //   source-management 路由不再消费此 page data。）
      "source-management": {
        title: "书源管理",
        metrics: [
          { icon: "source", label: "个书源", value: "12" },
          { icon: "check", label: "个启用", value: "8" },
          { icon: "warning", label: "个异常", value: "4" },
          { icon: "clock", label: "刚刚检测", value: "10:30" }
        ],
        sections: [
          {
            title: "批量操作",
            rows: [
              { type: "action", icon: "refresh", title: "检测全部", actionLabel: "开始检测", route: "source-detect" },
              { type: "action", icon: "download", title: "导入书源", actionLabel: "导入", route: "source-import-export" },
              { type: "action", icon: "upload", title: "导出全部", actionLabel: "导出", route: "source-import-export" },
              { type: "action", icon: "folder", title: "分组管理", actionLabel: "管理", route: "source-groups" },
              { type: "action", icon: "log", title: "错误日志", actionLabel: "查看", route: "source-logs" }
            ]
          },
          {
            title: "启用状态",
            rows: [
              { type: "switch", icon: "source", title: "起点中文网", meta: "qidian.com · 起点导入", enabled: true, status: "可用", statusTone: "good" },
              { type: "switch", icon: "source", title: "笔趣阁", meta: "biquge.example · 玄幻书源", enabled: true, status: "异常", statusTone: "warn" },
              { type: "switch", icon: "source", title: "本地导入源", meta: "本地文件 · 自定义", enabled: false, status: "未检测", statusTone: "muted" },
              { type: "switch", icon: "source", title: "测试书源", meta: "test.example · 测试书源", enabled: true, status: "可用", statusTone: "good" }
            ]
          }
        ],
        actions: [
          { icon: "add", title: "新增书源", route: "source-add" },
          { tone: "danger", icon: "trash", title: "批量删除", route: "source-delete-confirm" }
        ]
      },
      // 书源调试
      "source-debug": {
        title: "书源调试",
        metrics: [
          { icon: "activity", label: "调测模块", value: "5 项" },
          { icon: "check", label: "通过", value: "4 项" },
          { icon: "warning", label: "失败", value: "1 项" },
          { icon: "clock", label: "耗时", value: "1.2 秒" }
        ],
        sections: [
          {
            title: "调试目标",
            rows: [
              { type: "select", icon: "source", title: "选择书源", value: "笔趣阁", options: ["笔趣阁", "起点中文网", "测试书源", "本地导入源"] },
              { type: "select", icon: "book", title: "调测模块", value: "正文", options: ["搜索", "详情", "目录", "正文"] },
              { type: "input", inputType: "text", icon: "search", title: "搜索关键词", value: "长夜余火", placeholder: "输入关键词" },
              { type: "input", inputType: "url", icon: "link", title: "详情 URL", value: "https://biquge.example/book/123", placeholder: "https://" }
            ]
          },
          {
            title: "调测结果",
            rows: [
              { type: "link", icon: "check", title: "站点访问", status: "200 OK · 126ms", statusTone: "good", route: "source-debug-result" },
              { type: "link", icon: "check", title: "搜索规则", status: "返回 12 条", statusTone: "good", route: "source-debug-search-result" },
              { type: "link", icon: "check", title: "详情规则", status: "字段解析成功", statusTone: "good", route: "source-debug-detail-result" },
              { type: "link", icon: "check", title: "目录规则", status: "812 章", statusTone: "good", route: "source-debug-catalog-result" },
              { type: "link", icon: "warning", title: "正文规则", status: "返回空内容", statusTone: "warn", route: "source-debug-content-log" }
            ]
          }
        ],
        actions: [
          { icon: "refresh", title: "重新调测", route: "source-debug-running" },
          { icon: "edit", title: "编辑规则", route: "source-rule-edit" },
          { icon: "code", title: "查看源码", route: "source-code-view" }
        ]
      },
      // 导入导出
      "source-import-export": {
        title: "书源导入与导出",
        metrics: [
          { icon: "source", label: "当前书源", value: "12" },
          { icon: "download", label: "已导入", value: "24" },
          { icon: "upload", label: "已导出", value: "12" },
          { icon: "clock", label: "最近导入", value: "今天" }
        ],
        sections: [
          {
            title: "导入",
            rows: [
              { type: "link", icon: "cloud", title: "网络导入", meta: "从 URL 拉取书源包", route: "source-import-preview" },
              { type: "link", icon: "folder", title: "本地导入", meta: "选择本地 JSON 或 TXT 文件", route: "source-import-preview" },
              { type: "link", icon: "file", title: "剪贴板导入", meta: "解析剪贴板中的书源内容", route: "source-import-preview" },
              { type: "link", icon: "edit", title: "手动新建", meta: "进入空白书源编辑页", route: "source-rule-edit" }
            ]
          },
          {
            title: "导出",
            rows: [
              { type: "link", icon: "upload", title: "导出全部书源", meta: "12 个书源 · JSON 格式", overlay: "dialog:export-all" },
              { type: "link", icon: "upload", title: "按分组导出", meta: "选择分组后导出", overlay: "dialog:export-by-group" },
              { type: "select", icon: "file", title: "导出格式", value: "JSON", options: ["JSON", "TXT"] },
              { type: "switch", icon: "lock", title: "包含敏感字段", enabled: false, meta: "Cookie、登录信息" }
            ]
          },
          {
            title: "冲突处理",
            rows: [
              { type: "segment", icon: "warning", title: "默认策略", value: "跳过重复", options: ["跳过重复", "覆盖旧源", "保留两份"] },
              { type: "switch", icon: "folder", title: "保持原分组", enabled: true }
            ]
          }
        ]
      }
    };
    return pages[route] || pages["source-settings-entry"];
  }

  // ===========================================================================
  // 4. webdavConfigV2 — WebDAV 配置 + 测试连接 + 错误处理
  // 覆盖路由：webdav-config / webdav-test / webdav-error
  // R2a/R2b: webdav-config 路由接入完整 state owner + reducer + 异步流程；
  //   webdav-test / webdav-error 保持静态展示页，但 action button 和 link row
  //   都有稳定 identity（settingsKey-based）。
  // ===========================================================================

  // ---- R2a/R2b: webdav-config state owner ----
  var D2_WEBDAV_CONFIG_STORAGE_KEY = "webdav-config-values";

  var D2_WEBDAV_CONFIG_DEFAULTS = {
    serverUrl: "https://dav.example.com/reader/backup",
    account: "reader@example.com",
    password: "reader-demo-password",
    syncDir: "/ReaderBackup/ReaderAndroid",
    sslVerify: true,
    connectTimeout: 15,  // seconds
    wifiOnly: true,
    autoSync: "每小时"
  };

  var D2_WEBDAV_AUTO_SYNC_OPTIONS = ["关闭", "每小时", "每天", "手动"];

  function d2WebdavConfigDefaultState() {
    return {
      values: Object.assign({}, D2_WEBDAV_CONFIG_DEFAULTS),
      inputErrors: {},
      test: { open: false, status: "idle", error: null, result: null },
      save: { open: false, status: "idle", error: null },
      clear: { open: false, status: "idle", error: null }
    };
  }

  function d2WebdavConfigInitState(appState) {
    var state = d2WebdavConfigDefaultState();
    var stored = d2Get(D2_WEBDAV_CONFIG_STORAGE_KEY, null);
    if (stored && typeof stored === "object") {
      state.values = Object.assign({}, state.values, stored);
    }
    if (appState && appState.webdavConfigValues) {
      state.values = Object.assign({}, state.values, appState.webdavConfigValues);
    }
    return state;
  }

  // 输入校验：serverUrl / account / password 必填；syncDir 可空（默认 /ReaderBackup）
  function d2ValidateWebdavInputs(values) {
    var errors = {};
    if (!values.serverUrl || !String(values.serverUrl).trim()) {
      errors.serverUrl = { message: "服务器地址不能为空" };
    } else if (!/^https?:\/\//.test(String(values.serverUrl).trim())) {
      errors.serverUrl = { message: "服务器地址必须以 http:// 或 https:// 开头" };
    }
    if (!values.account || !String(values.account).trim()) {
      errors.account = { message: "账号不能为空" };
    }
    if (!values.password || !String(values.password).trim()) {
      errors.password = { message: "密码不能为空" };
    }
    return errors;
  }

  // 纯函数 reducer
  // R2b 防重保护：TEST_START / SAVE_START / CLEAR_START 仅在 confirm 状态才接受 → loading
  // R2b 过期响应保护：TEST_SUCCESS/FAILED / SAVE_SUCCESS/FAILED / CLEAR_SUCCESS/FAILED
  //   仅在 loading 状态才接受
  function d2WebdavConfigReducer(state, action) {
    if (!state) state = d2WebdavConfigDefaultState();
    if (!action || !action.type) return state;
    switch (action.type) {
      case "INIT":
        return d2WebdavConfigInitState(action.appState || {});

      case "SET_INPUT": {
        if (!action.settingsKey) return state;
        var nextValues = Object.assign({}, state.values);
        nextValues[action.settingsKey] = action.value;
        // 清除该字段的 inputError
        var nextErrors = Object.assign({}, state.inputErrors);
        delete nextErrors[action.settingsKey];
        return Object.assign({}, state, { values: nextValues, inputErrors: nextErrors });
      }

      case "TOGGLE_SWITCH": {
        if (!action.settingsKey) return state;
        var nextValues2 = Object.assign({}, state.values);
        nextValues2[action.settingsKey] = !!action.value;
        return Object.assign({}, state, { values: nextValues2 });
      }

      case "STEP_TIMEOUT": {
        // delta = +1 / -1；范围 [5, 60]
        var nextTimeout = Math.max(5, Math.min(60, Number(state.values.connectTimeout || 15) + (action.delta || 0)));
        var nextValues3 = Object.assign({}, state.values, { connectTimeout: nextTimeout });
        return Object.assign({}, state, { values: nextValues3 });
      }

      case "SELECT_AUTO_SYNC": {
        if (D2_WEBDAV_AUTO_SYNC_OPTIONS.indexOf(action.value) < 0) return state;
        var nextValues4 = Object.assign({}, state.values, { autoSync: action.value });
        return Object.assign({}, state, { values: nextValues4 });
      }

      case "INPUT_VALIDATE": {
        var errors = d2ValidateWebdavInputs(state.values);
        return Object.assign({}, state, { inputErrors: errors });
      }

      case "INPUT_ERROR_CLEAR": {
        if (!action.settingsKey) return state;
        var nextErrors2 = Object.assign({}, state.inputErrors);
        delete nextErrors2[action.settingsKey];
        return Object.assign({}, state, { inputErrors: nextErrors2 });
      }

      // ---- 测试连接流程：idle / confirm / loading / success / failed ----
      case "TEST_CONFIRM_OPEN":
        // 同一时间只允许一个 dialog 打开
        if (state.save.open || state.clear.open) return state;
        return Object.assign({}, state, {
          test: Object.assign({}, state.test, { open: true, status: "confirm", error: null, result: null })
        });
      case "TEST_CONFIRM_CLOSE":
        // loading 期间不允许关闭（防重复点击 / 误操作）
        if (state.test.status === "loading") return state;
        return Object.assign({}, state, {
          test: Object.assign({}, state.test, { open: false, status: "idle", error: null, result: null })
        });
      case "TEST_START":
        // 重复点击 guard：只有 confirm 状态才能进入 loading
        if (state.test.status !== "confirm") return state;
        return Object.assign({}, state, {
          test: Object.assign({}, state.test, { status: "loading", error: null, result: null })
        });
      case "TEST_SUCCESS":
        // stale async guard：只有 loading 状态才接受 success
        if (state.test.status !== "loading") return state;
        return Object.assign({}, state, {
          test: Object.assign({}, state.test, { status: "success", error: null, result: action.result || null })
        });
      case "TEST_FAILED":
        if (state.test.status !== "loading") return state;
        return Object.assign({}, state, {
          test: Object.assign({}, state.test, { status: "failed", error: action.error || "连接失败" })
        });
      case "TEST_RESET":
        return Object.assign({}, state, {
          test: { open: false, status: "idle", error: null, result: null }
        });

      // ---- 保存配置流程：idle / confirm / loading / success / failed ----
      case "SAVE_CONFIRM_OPEN":
        if (state.test.open || state.clear.open) return state;
        return Object.assign({}, state, {
          save: Object.assign({}, state.save, { open: true, status: "confirm", error: null })
        });
      case "SAVE_CONFIRM_CLOSE":
        if (state.save.status === "loading") return state;
        return Object.assign({}, state, {
          save: Object.assign({}, state.save, { open: false, status: "idle", error: null })
        });
      case "SAVE_START":
        if (state.save.status !== "confirm") return state;
        return Object.assign({}, state, {
          save: Object.assign({}, state.save, { status: "loading", error: null })
        });
      case "SAVE_SUCCESS":
        if (state.save.status !== "loading") return state;
        return Object.assign({}, state, {
          save: Object.assign({}, state.save, { status: "success", error: null })
        });
      case "SAVE_FAILED":
        if (state.save.status !== "loading") return state;
        return Object.assign({}, state, {
          save: Object.assign({}, state.save, { status: "failed", error: action.error || "保存失败" })
        });
      case "SAVE_RESET":
        return Object.assign({}, state, {
          save: { open: false, status: "idle", error: null }
        });

      // ---- 清除配置流程：idle / confirm / loading / success / failed ----
      case "CLEAR_CONFIRM_OPEN":
        if (state.test.open || state.save.open) return state;
        return Object.assign({}, state, {
          clear: Object.assign({}, state.clear, { open: true, status: "confirm", error: null })
        });
      case "CLEAR_CONFIRM_CLOSE":
        if (state.clear.status === "loading") return state;
        return Object.assign({}, state, {
          clear: Object.assign({}, state.clear, { open: false, status: "idle", error: null })
        });
      case "CLEAR_START":
        if (state.clear.status !== "confirm") return state;
        return Object.assign({}, state, {
          clear: Object.assign({}, state.clear, { status: "loading", error: null })
        });
      case "CLEAR_SUCCESS":
        if (state.clear.status !== "loading") return state;
        // 清除配置成功 → values 回到默认值
        return Object.assign({}, state, {
          values: Object.assign({}, D2_WEBDAV_CONFIG_DEFAULTS),
          inputErrors: {},
          clear: Object.assign({}, state.clear, { status: "success", error: null })
        });
      case "CLEAR_FAILED":
        if (state.clear.status !== "loading") return state;
        return Object.assign({}, state, {
          clear: Object.assign({}, state.clear, { status: "failed", error: action.error || "清除失败" })
        });
      case "CLEAR_RESET":
        return Object.assign({}, state, {
          clear: { open: false, status: "idle", error: null }
        });

      default:
        return state;
    }
  }

  var d2WebdavConfigState = null;
  var d2WebdavConfigListeners = [];

  function d2WebdavConfigGetState() {
    if (!d2WebdavConfigState) {
      d2WebdavConfigState = d2WebdavConfigDefaultState();
    }
    return d2WebdavConfigState;
  }

  function d2WebdavConfigSubscribe(listener) {
    if (typeof listener !== "function") return function () { return; };
    d2WebdavConfigListeners.push(listener);
    return function unsubscribe() {
      var idx = d2WebdavConfigListeners.indexOf(listener);
      if (idx >= 0) d2WebdavConfigListeners.splice(idx, 1);
    };
  }

  function d2WebdavConfigDispatch(action) {
    var prev = d2WebdavConfigGetState();
    var next = d2WebdavConfigReducer(prev, action);
    if (next === prev) return prev;
    d2WebdavConfigState = next;
    // 持久化 values（只在 values 变更时写）
    if (next.values !== prev.values) {
      d2Set(D2_WEBDAV_CONFIG_STORAGE_KEY, next.values);
    }
    for (var i = 0; i < d2WebdavConfigListeners.length; i++) {
      try { d2WebdavConfigListeners[i](next, prev, action); } catch (e) { /* ignore */ }
    }
    return next;
  }

  function d2WebdavConfigInjectAppState(appState) {
    appState = appState || {};
    appState.webdavConfig = d2WebdavConfigGetState();
    return appState;
  }

  // R2b: 测试连接执行函数（事件层 / 测试调用）
  // 调用方负责在 TEST_CONFIRM_OPEN 后调用此函数执行实际测试。
  // demo 环境无真实连接 → 模拟 success / failed。
  // stale async guard：reducer 内 TEST_SUCCESS / TEST_FAILED 仅在 status=loading 时接受。
  // duplicate-click guard：reducer 内 TEST_START 仅在 status=confirm 时接受。
  function d2ExecuteWebdavTest(options) {
    options = options || {};
    d2WebdavConfigDispatch({ type: "TEST_START" });
    var simulate = options.simulateResult || "success";
    return new Promise(function (resolve) {
      var delay = options.delay || 0;
      setTimeout(function () {
        if (simulate === "failed") {
          d2WebdavConfigDispatch({
            type: "TEST_FAILED",
            error: options.error || "连接失败，请检查服务器地址和账号"
          });
          resolve("failed");
        } else {
          d2WebdavConfigDispatch({
            type: "TEST_SUCCESS",
            result: options.result || { latencyMs: 286, permission: "读写", dirExists: true }
          });
          resolve("success");
        }
      }, delay);
    });
  }

  // R2b: 保存配置执行函数
  function d2ExecuteWebdavSave(options) {
    options = options || {};
    d2WebdavConfigDispatch({ type: "SAVE_START" });
    var simulate = options.simulateResult || "success";
    return new Promise(function (resolve) {
      var delay = options.delay || 0;
      setTimeout(function () {
        if (simulate === "failed") {
          d2WebdavConfigDispatch({
            type: "SAVE_FAILED",
            error: options.error || "保存失败，请稍后重试"
          });
          resolve("failed");
        } else {
          d2WebdavConfigDispatch({ type: "SAVE_SUCCESS" });
          resolve("success");
        }
      }, delay);
    });
  }

  // R2b: 清除配置执行函数
  function d2ExecuteWebdavClear(options) {
    options = options || {};
    d2WebdavConfigDispatch({ type: "CLEAR_START" });
    var simulate = options.simulateResult || "success";
    return new Promise(function (resolve) {
      var delay = options.delay || 0;
      setTimeout(function () {
        if (simulate === "failed") {
          d2WebdavConfigDispatch({
            type: "CLEAR_FAILED",
            error: options.error || "清除失败，请稍后重试"
          });
          resolve("failed");
        } else {
          d2WebdavConfigDispatch({ type: "CLEAR_SUCCESS" });
          resolve("success");
        }
      }, delay);
    });
  }

  // ---- webdavConfigV2 main renderer ----
  function webdavConfigV2(data, route, appState) {
    // R2a/R2b: webdav-config 路由接入 state owner；其它路由保持静态。
    var state = (route === "webdav-config") ? d2WebdavConfigGetState() : null;
    var injectedAppState = state ? d2WebdavConfigInjectAppState(appState || {}) : appState;
    var page = d2WebdavPage(route, state);
    var contentHtml = `
      ${d2MetricGrid(page.metrics)}
      ${d2StorageCard(page.storage)}
      ${(page.sections || []).map(function (section) {
        if (section.layout === "backup-list") return d2BackupList(section);
        return d2Section(section, route, injectedAppState);
      }).join("")}
      ${d2ActionList(page.actions, route)}`;
    var dialogHtml = d2WebdavDialogHtml(route, state);
    var toastHtml = page.toast ? `<section class="fd-settings-toast">${esc(page.toast)}</section>` : "";
    var frameState = "";
    if (state) {
      if (state.test.open) frameState = " has-dialog";
      else if (state.save.open) frameState = " has-dialog";
      else if (state.clear.open) frameState = " has-dialog";
    }
    var backIdentity = d2ResolveSubcontrolIdentity(route, "back");
    var backAttrs = d2StampIdentityAttrs(backIdentity);
    return d2SettingsShell(data, page.title, contentHtml, {
      frameState: frameState,
      toastHtml: toastHtml,
      dialogHtml: dialogHtml,
      backButtonAttrs: backAttrs
    });
  }

  // 3 个 dialog（test / save / clear）基于 state 渲染，带 ARIA + 焦点恢复。
  function d2WebdavDialogHtml(route, state) {
    if (!state) return "";
    // 测试连接 dialog
    if (state.test.open) {
      var testStatus = state.test.status;
      var testBusy = testStatus === "loading";
      var testFailed = testStatus === "failed";
      var testSuccess = testStatus === "success";
      var testConfirm = testStatus === "confirm";
      var testError = state.test.error;
      var testResult = state.test.result;
      var testTitle = testSuccess ? "测试成功" : testFailed ? "测试失败" : "测试网络连通性";
      var testCopy = testSuccess
        ? "连接正常 · 耗时 " + (testResult && testResult.latencyMs ? testResult.latencyMs : "—") + " ms · 权限 " + (testResult && testResult.permission ? testResult.permission : "—")
        : testFailed
          ? (testError || "连接失败，请检查服务器地址和账号")
          : "将使用当前服务器地址和账号发起一次连接验证。";
      // confirm: 取消 + 开始测试；loading: 关闭按钮 disabled；success/failed: 知道了
      var testButtons = "";
      var testConfirmIdentity = d2ResolveSubcontrolIdentity(route, "webdav-test-confirm");
      var testConfirmAttrs = d2StampIdentityAttrs(testConfirmIdentity);
      var testCancelIdentity = d2ResolveSubcontrolIdentity(route, "webdav-test-cancel");
      var testCancelAttrs = d2StampIdentityAttrs(testCancelIdentity);
      if (testConfirm) {
        testButtons = `<button type="button" data-close-settings-overlay data-dialog-initial-focus="webdav-test-cancel"${testCancelAttrs}>取消</button><button type="button" data-settings-overlay="dialog:webdav-test-execute"${testConfirmAttrs}>开始测试</button>`;
      } else if (testBusy) {
        testButtons = `<button type="button" disabled aria-busy="true">测试中…</button>`;
      } else if (testSuccess) {
        var testOkIdentity = d2ResolveSubcontrolIdentity(route, "webdav-test-confirm");
        var testOkAttrs = d2StampIdentityAttrs(testOkIdentity);
        testButtons = `<button type="button" data-close-settings-overlay data-dialog-initial-focus="webdav-test-confirm"${testOkAttrs}>知道了</button>`;
      } else if (testFailed) {
        var testRetryIdentity = d2ResolveSubcontrolIdentity(route, "webdav-test-confirm");
        var testRetryAttrs = d2StampIdentityAttrs(testRetryIdentity);
        var testCloseIdentity = d2ResolveSubcontrolIdentity(route, "webdav-test-cancel");
        var testCloseAttrs = d2StampIdentityAttrs(testCloseIdentity);
        testButtons = `<button type="button" data-close-settings-overlay data-dialog-initial-focus="webdav-test-cancel"${testCloseAttrs}>关闭</button><button type="button" data-settings-overlay="dialog:webdav-test-execute" aria-invalid="true"${testRetryAttrs}>重试</button>`;
      }
      var testBusyAttr = testBusy ? ' aria-busy="true"' : "";
      var testInvalidAttr = testFailed ? ' aria-invalid="true"' : "";
      return `
        <section class="fd-demo-dialog fd-settings-confirm-dialog" aria-hidden="false" data-demo-dialog data-settings-overlay-panel="dialog" role="dialog" aria-modal="true" aria-labelledby="webdav-test-dialog-title"${testBusyAttr}${testInvalidAttr}>
          <h2 id="webdav-test-dialog-title">${esc(testTitle)}</h2>
          <p>${esc(testCopy)}</p>
          <div>${testButtons}</div>
        </section>`;
    }
    // 保存配置 dialog
    if (state.save.open) {
      var saveStatus = state.save.status;
      var saveBusy = saveStatus === "loading";
      var saveFailed = saveStatus === "failed";
      var saveSuccess = saveStatus === "success";
      var saveConfirm = saveStatus === "confirm";
      var saveError = state.save.error;
      var saveTitle = saveSuccess ? "保存成功" : saveFailed ? "保存失败" : "保存配置";
      var saveCopy = saveSuccess
        ? "WebDAV 配置已保存。"
        : saveFailed
          ? (saveError || "保存失败，请稍后重试")
          : "将当前服务器地址、账号和密码保存为 WebDAV 配置。";
      var saveConfirmIdentity = d2ResolveSubcontrolIdentity(route, "webdav-save-confirm");
      var saveConfirmAttrs = d2StampIdentityAttrs(saveConfirmIdentity);
      var saveCancelIdentity = d2ResolveSubcontrolIdentity(route, "webdav-save-cancel");
      var saveCancelAttrs = d2StampIdentityAttrs(saveCancelIdentity);
      var saveButtons = "";
      if (saveConfirm) {
        saveButtons = `<button type="button" data-close-settings-overlay data-dialog-initial-focus="webdav-save-cancel"${saveCancelAttrs}>取消</button><button type="button" data-settings-overlay="dialog:webdav-save-execute"${saveConfirmAttrs}>确认保存</button>`;
      } else if (saveBusy) {
        saveButtons = `<button type="button" disabled aria-busy="true">保存中…</button>`;
      } else if (saveSuccess) {
        saveButtons = `<button type="button" data-close-settings-overlay data-dialog-initial-focus="webdav-save-confirm"${saveConfirmAttrs}>知道了</button>`;
      } else if (saveFailed) {
        saveButtons = `<button type="button" data-close-settings-overlay data-dialog-initial-focus="webdav-save-cancel"${saveCancelAttrs}>关闭</button><button type="button" data-settings-overlay="dialog:webdav-save-execute" aria-invalid="true"${saveConfirmAttrs}>重试</button>`;
      }
      var saveBusyAttr = saveBusy ? ' aria-busy="true"' : "";
      var saveInvalidAttr = saveFailed ? ' aria-invalid="true"' : "";
      return `
        <section class="fd-demo-dialog fd-settings-confirm-dialog" aria-hidden="false" data-demo-dialog data-settings-overlay-panel="dialog" role="dialog" aria-modal="true" aria-labelledby="webdav-save-dialog-title"${saveBusyAttr}${saveInvalidAttr}>
          <h2 id="webdav-save-dialog-title">${esc(saveTitle)}</h2>
          <p>${esc(saveCopy)}</p>
          <div>${saveButtons}</div>
        </section>`;
    }
    // 清除配置 dialog
    if (state.clear.open) {
      var clearStatus = state.clear.status;
      var clearBusy = clearStatus === "loading";
      var clearFailed = clearStatus === "failed";
      var clearSuccess = clearStatus === "success";
      var clearConfirm = clearStatus === "confirm";
      var clearError = state.clear.error;
      var clearTitle = clearSuccess ? "已清除" : clearFailed ? "清除失败" : "清除 WebDAV 配置";
      var clearCopy = clearSuccess
        ? "WebDAV 配置已恢复默认值。"
        : clearFailed
          ? (clearError || "清除失败，请稍后重试")
          : "将清除服务器地址、账号、密码等所有 WebDAV 配置，恢复为默认值。此操作不可撤销。";
      var clearConfirmIdentity = d2ResolveSubcontrolIdentity(route, "webdav-clear-confirm");
      var clearConfirmAttrs = d2StampIdentityAttrs(clearConfirmIdentity);
      var clearCancelIdentity = d2ResolveSubcontrolIdentity(route, "webdav-clear-cancel");
      var clearCancelAttrs = d2StampIdentityAttrs(clearCancelIdentity);
      var clearButtons = "";
      if (clearConfirm) {
        clearButtons = `<button type="button" data-close-settings-overlay data-dialog-initial-focus="webdav-clear-cancel"${clearCancelAttrs}>取消</button><button type="button" data-settings-overlay="dialog:webdav-clear-execute" class="is-danger"${clearConfirmAttrs}>确认清除</button>`;
      } else if (clearBusy) {
        clearButtons = `<button type="button" disabled aria-busy="true">清除中…</button>`;
      } else if (clearSuccess) {
        clearButtons = `<button type="button" data-close-settings-overlay data-dialog-initial-focus="webdav-clear-confirm"${clearConfirmAttrs}>知道了</button>`;
      } else if (clearFailed) {
        clearButtons = `<button type="button" data-close-settings-overlay data-dialog-initial-focus="webdav-clear-cancel"${clearCancelAttrs}>关闭</button><button type="button" data-settings-overlay="dialog:webdav-clear-execute" class="is-danger" aria-invalid="true"${clearConfirmAttrs}>重试</button>`;
      }
      var clearBusyAttr = clearBusy ? ' aria-busy="true"' : "";
      var clearInvalidAttr = clearFailed ? ' aria-invalid="true"' : "";
      return `
        <section class="fd-demo-dialog fd-settings-confirm-dialog" aria-hidden="false" data-demo-dialog data-settings-overlay-panel="dialog" role="dialog" aria-modal="true" aria-labelledby="webdav-clear-dialog-title"${clearBusyAttr}${clearInvalidAttr}>
          <h2 id="webdav-clear-dialog-title">${esc(clearTitle)}</h2>
          <p>${esc(clearCopy)}</p>
          <div>${clearButtons}</div>
        </section>`;
    }
    return "";
  }

  function d2WebdavPage(route, state) {
    // ---- webdav-config: state-driven page ----
    if (route === "webdav-config" && state) {
      var v = state.values;
      var testStatus = state.test.status;
      var saveStatus = state.save.status;
      var connectionStatus = "未测试";
      if (testStatus === "success") connectionStatus = "已连接";
      else if (testStatus === "failed") connectionStatus = "连接失败";
      else if (testStatus === "loading") connectionStatus = "测试中…";
      return {
        title: "WebDAV 配置",
        metrics: [
          { icon: "cloud", label: "连接状态", value: connectionStatus },
          { icon: "clock", label: "连接超时", value: v.connectTimeout + " 秒" },
          { icon: "wifi", label: "Wi-Fi 限制", value: v.wifiOnly ? "开启" : "关闭" },
          { icon: "refresh", label: "自动同步", value: v.autoSync }
        ],
        sections: [
          {
            title: "连接信息",
            layout: "webdav-form",
            rows: [
              { type: "input", inputType: "url", icon: "link", title: "服务器地址", value: v.serverUrl, placeholder: "https://example.com/dav", settingsKey: "serverUrl" },
              { type: "input", inputType: "text", icon: "people", title: "账号", value: v.account, placeholder: "请输入账号", settingsKey: "account" },
              { type: "input", inputType: "password", icon: "shield", title: "密码", value: v.password, placeholder: "请输入密码", settingsKey: "password" },
              { type: "input", inputType: "text", icon: "folder", title: "同步目录", value: v.syncDir, placeholder: "/ReaderBackup", settingsKey: "syncDir" }
            ],
            actions: [
              {
                icon: "refresh",
                title: "测试网络连通性",
                overlay: "dialog:webdav-test",
                settingsKey: "webdav-test-connection",
                restoreFocus: "webdav-test-connection",
                asyncStatus: testStatus === "loading" ? "loading" : testStatus === "success" ? "success" : testStatus === "failed" ? "failed" : null,
                asyncError: state.test.error,
                loadingLabel: "测试中…",
                successLabel: "已测试",
                failedLabel: "重试"
              },
              {
                icon: "check",
                title: "保存配置",
                overlay: "dialog:webdav-save",
                settingsKey: "webdav-save-config",
                restoreFocus: "webdav-save-config",
                asyncStatus: saveStatus === "loading" ? "loading" : saveStatus === "success" ? "success" : saveStatus === "failed" ? "failed" : null,
                asyncError: state.save.error,
                loadingLabel: "保存中…",
                successLabel: "已保存",
                failedLabel: "重试"
              }
            ]
          },
          {
            title: "高级",
            rows: [
              { type: "switch", icon: "lock", title: "SSL 证书校验", enabled: v.sslVerify, settingsKey: "sslVerify" },
              { type: "stepper", icon: "clock", title: "连接超时", value: v.connectTimeout + " 秒", minLabel: "-", maxLabel: "+", settingsKey: "webdav-connect-timeout" },
              { type: "switch", icon: "wifi", title: "仅 Wi-Fi 同步", enabled: v.wifiOnly, settingsKey: "wifiOnly" },
              { type: "select", icon: "refresh", title: "自动同步", value: v.autoSync, options: D2_WEBDAV_AUTO_SYNC_OPTIONS, settingsKey: "autoSync" }
            ]
          }
        ],
        toast: testStatus === "success" ? "WebDAV 测试成功" : testStatus === "failed" ? "WebDAV 测试失败" : saveStatus === "success" ? "WebDAV 配置已保存" : saveStatus === "failed" ? "WebDAV 保存失败" : ""
      };
    }
    // ---- webdav-test: static result page (with stable identity on actions) ----
    if (route === "webdav-test") {
      return {
        title: "WebDAV 测试连接",
        metrics: [
          { icon: "refresh", label: "测试状态", value: "成功" },
          { icon: "clock", label: "耗时", value: "286 ms" },
          { icon: "check", label: "权限", value: "读写" },
          { icon: "folder", label: "目录存在", value: "是" }
        ],
        sections: [
          {
            title: "连接目标",
            rows: [
              { type: "link", icon: "link", title: "服务器地址", value: "https://dav.example.com" },
              { type: "link", icon: "people", title: "账号", value: "reader@example.com" },
              { type: "link", icon: "folder", title: "同步目录", value: "/ReaderBackup/ReaderAndroid" }
            ]
          },
          {
            title: "测试阶段",
            rows: [
              { type: "link", icon: "check", title: "DNS 解析", status: "dav.example.com", statusTone: "good" },
              { type: "link", icon: "check", title: "TCP 连接", status: "126 ms", statusTone: "good" },
              { type: "link", icon: "check", title: "TLS 握手", status: "TLS 1.3", statusTone: "good" },
              { type: "link", icon: "check", title: "认证", status: "Basic Auth 通过", statusTone: "good" },
              { type: "link", icon: "check", title: "目录探测", status: "目录存在", statusTone: "good" },
              { type: "link", icon: "check", title: "读写测试", status: "可读写", statusTone: "good" }
            ]
          }
        ],
        actions: [
          { icon: "refresh", title: "再次测试", overlay: "dialog:webdav-test", settingsKey: "webdav-test-again", restoreFocus: "webdav-test-again" },
          { icon: "check", title: "保存配置", overlay: "dialog:webdav-save", settingsKey: "webdav-save-config", restoreFocus: "webdav-save-config" },
          { icon: "cloud", title: "查看远程备份", route: "remote-webdav-books", settingsKey: "webdav-view-remote-backup" }
        ],
        toast: "测试成功 · 286 ms"
      };
    }
    // ---- webdav-error: static error page (with stable identity on actions + link rows) ----
    if (route === "webdav-error") {
      return {
        title: "WebDAV 错误处理",
        metrics: [
          { icon: "warning", label: "错误类型", value: "认证失败" },
          { icon: "clock", label: "发生时间", value: "10:30" },
          { icon: "refresh", label: "重试次数", value: "3 次" },
          { icon: "code", label: "HTTP 码", value: "401" }
        ],
        sections: [
          {
            title: "错误详情",
            rows: [
              { type: "link", icon: "warning", title: "错误类型", value: "认证失败 (401 Unauthorized)" },
              { type: "link", icon: "code", title: "服务器响应", value: "WWW-Authenticate: Basic realm=\"dav\"" },
              { type: "link", icon: "link", title: "请求 URL", value: "https://dav.example.com/reader/backup" },
              { type: "link", icon: "clock", title: "发生时间", value: "2026-07-11 10:30:42" }
            ]
          },
          {
            title: "可能原因",
            rows: [
              { type: "link", icon: "people", title: "账号错误", status: "请检查", statusTone: "warn", overlay: "dialog:check-account", settingsKey: "webdav-check-account" },
              { type: "link", icon: "shield", title: "密码错误", status: "请检查", statusTone: "warn", overlay: "dialog:check-password", settingsKey: "webdav-check-password" },
              { type: "link", icon: "lock", title: "权限不足", status: "请检查", statusTone: "warn", overlay: "dialog:check-permission", settingsKey: "webdav-check-permission" },
              { type: "link", icon: "folder", title: "目录不存在", status: "可创建", statusTone: "info", overlay: "dialog:create-dir", settingsKey: "webdav-create-dir" }
            ]
          },
          {
            title: "建议操作",
            rows: [
              { type: "link", icon: "edit", title: "重新输入账号密码", route: "webdav-config", settingsKey: "webdav-edit-config" },
              { type: "link", icon: "refresh", title: "重新测试连接", route: "webdav-test", settingsKey: "webdav-retry-test" },
              { type: "link", icon: "log", title: "查看完整日志", route: "source-logs", settingsKey: "webdav-view-log" }
            ]
          }
        ],
        actions: [
          { icon: "refresh", title: "重试连接", route: "webdav-test", settingsKey: "webdav-retry-connection" },
          { icon: "edit", title: "修改配置", route: "webdav-config", settingsKey: "webdav-edit-config-action" },
          { tone: "danger", icon: "trash", title: "清除配置", overlay: "dialog:webdav-clear", settingsKey: "webdav-clear-config", restoreFocus: "webdav-clear-config" }
        ],
        toast: "WebDAV 连接失败 · 401"
      };
    }
    // 默认回退到 webdav-config 静态结构（无 state）
    return {
      title: "WebDAV 配置",
      metrics: [
        { icon: "cloud", label: "连接状态", value: "未测试" },
        { icon: "clock", label: "连接超时", value: "15 秒" },
        { icon: "wifi", label: "Wi-Fi 限制", value: "开启" },
        { icon: "refresh", label: "自动同步", value: "每小时" }
      ],
      sections: [],
      toast: ""
    };
  }

  // ===========================================================================
  // 5. backupScreenV2 — 备份管理增强（手动 / 自动 / 历史）
  // 覆盖路由：
  //   sync-settings-entry / sync-backup / backup-settings
  //   backup-manual / backup-auto / backup-history
  //   progress-sync / progress-sync-status / remote-webdav-books
  // ===========================================================================
  function backupScreenV2(data, route, appState) {
    var page = d2BackupPage(route, appState);
    var contentHtml = `
      ${d2MetricGrid(page.metrics)}
      ${d2StorageCard(page.storage)}
      ${(page.sections || []).map(function (section) {
        if (section.layout === "backup-list") return d2BackupList(section);
        return d2Section(section, route, appState);
      }).join("")}
      ${d2ActionList(page.actions)}`;
    return d2SettingsShell(data, page.title, contentHtml, {
      toastHtml: page.toast ? `<section class="fd-settings-toast">${esc(page.toast)}</section>` : ""
    });
  }

  function d2BackupPage(route, appState) {
    var pages = {
      // 同步设置入口
      "sync-settings-entry": {
        title: "同步与备份",
        sections: [
          {
            title: "同步",
            rows: [
              { type: "link", icon: "cloud", title: "WebDAV 配置", meta: "已连接 · dav.example.com", route: "webdav-config", badge: "已连接", tone: "good" },
              { type: "link", icon: "refresh", title: "进度同步", meta: "最近：10:30 · 成功", route: "progress-sync" },
              { type: "link", icon: "book", title: "远程 WebDAV 书籍", meta: "8 本 · 12.8 MB", route: "remote-webdav-books" }
            ]
          },
          {
            title: "备份",
            rows: [
              { type: "link", icon: "backup", title: "备份设置", meta: "自动备份 · 每天 02:00", route: "backup-settings" },
              { type: "link", icon: "download", title: "手动备份", meta: "立即创建备份", route: "backup-manual" },
              { type: "link", icon: "clock", title: "备份历史", meta: "8 个备份 · 64.5 MB", route: "backup-history" },
              { type: "link", icon: "refresh", title: "恢复数据", meta: "从备份恢复", route: "restore-confirm" }
            ]
          }
        ]
      },
      // 同步与备份（包含 WebDAV 状态 + 备份列表）
      "sync-backup": {
        title: "同步与备份",
        metrics: [
          { icon: "cloud", label: "WebDAV", value: "已连接" },
          { icon: "clock", label: "最近备份", value: "08:00" },
          { icon: "backup", label: "备份数量", value: "8 个" },
          { icon: "download", label: "占用空间", value: "64.5 MB" }
        ],
        sections: [
          {
            title: "WebDAV 配置",
            layout: "webdav-form",
            rows: [
              { type: "input", inputType: "url", icon: "link", title: "服务器地址", value: "https://dav.example.com/reader/backup", placeholder: "https://example.com/dav" },
              { type: "input", inputType: "text", icon: "people", title: "账号", value: "reader@example.com", placeholder: "请输入账号" },
              { type: "input", inputType: "password", icon: "shield", title: "密码", value: "reader-demo-password", placeholder: "请输入密码" },
              { type: "input", inputType: "text", icon: "folder", title: "同步目录", value: "/ReaderBackup/ReaderAndroid", placeholder: "/ReaderBackup" }
            ],
            actions: [
              { icon: "refresh", title: "测试网络连通性", overlay: "dialog:webdav-test" },
              { icon: "check", title: "保存配置", overlay: "dialog:webdav-save" }
            ]
          },
          {
            title: "恢复数据",
            layout: "backup-list",
            summary: "点击备份卡进入恢复流程。最近备份位于列表顶部。",
            backups: [
              { group: "最近备份", icon: "cloud", source: "WebDAV", title: "自动备份", time: "2026-06-23 08:00", type: "完整备份", size: "12.8 MB", device: "Mac mini · 自动同步", includes: "书架、进度、设置、书源", badge: "最新", tone: "good", scopes: ["bookshelf", "progress", "settings", "sources"], restoreRecord: "WebDAV · 2026-06-23 08:00 · 完整备份" },
              { group: "最近备份", icon: "folder", source: "本地", title: "手动备份", time: "2026-06-23 10:30", type: "完整备份", size: "12.8 MB", device: "本机文件", includes: "书架、进度、设置、书源", badge: "本机", tone: "info", scopes: ["bookshelf", "progress", "settings", "sources"], restoreRecord: "本地 · 2026-06-23 10:30 · 完整备份" },
              { group: "历史备份", icon: "cloud", source: "WebDAV", title: "夜间备份", time: "2026-06-21 22:30", type: "书架与设置", size: "8.6 MB", device: "远程备份", includes: "书架、分组、设置", badge: "局部", tone: "warn", scopes: ["bookshelf", "settings"], restoreRecord: "WebDAV · 2026-06-21 22:30 · 书架与设置" },
              { group: "历史备份", icon: "cloud", source: "WebDAV", title: "周备份", time: "2026-06-16 02:00", type: "完整备份", size: "12.1 MB", device: "远程备份", includes: "书架、进度、设置、书源", badge: "历史", tone: "muted", scopes: ["bookshelf", "progress", "settings", "sources"], restoreRecord: "WebDAV · 2026-06-16 02:00 · 完整备份" },
              { group: "历史备份", icon: "folder", source: "本地", title: "阅读进度快照", time: "2026-06-20 09:40", type: "阅读进度", size: "2.4 MB", device: "本机文件", includes: "阅读进度", badge: "进度", tone: "muted", scopes: ["progress"], restoreRecord: "本地 · 2026-06-20 09:40 · 阅读进度" },
              { group: "历史备份", icon: "cloud", source: "WebDAV", title: "迁移前备份", time: "2026-06-12 18:10", type: "书源配置", size: "1.6 MB", device: "远程备份", includes: "书源、分组", badge: "配置", tone: "muted", scopes: ["sources"], restoreRecord: "WebDAV · 2026-06-12 18:10 · 书源配置" }
            ]
          }
        ]
      },
      // 备份设置（自动备份策略）
      "backup-settings": {
        title: "备份设置",
        sections: [
          {
            title: "自动备份",
            rows: [
              { type: "switch", icon: "refresh", title: "启用自动备份", enabled: true, status: "已开启", statusTone: "good" },
              { type: "select", icon: "clock", title: "备份频率", value: "每天", options: ["每小时", "每天", "每周", "手动"] },
              { type: "select", icon: "clock", title: "备份时间", value: "02:00", options: ["00:00", "02:00", "06:00", "12:00"] },
              { type: "switch", icon: "wifi", title: "仅 Wi-Fi 备份", enabled: true }
            ]
          },
          {
            title: "备份内容",
            rows: [
              { type: "switch", icon: "bookshelf", title: "书架与分组", enabled: true },
              { type: "switch", icon: "clock", title: "阅读进度", enabled: true },
              { type: "switch", icon: "settings", title: "App 设置", enabled: true },
              { type: "switch", icon: "source", title: "书源配置", enabled: true },
              { type: "switch", icon: "search", title: "搜索历史", enabled: false }
            ]
          },
          {
            title: "保留策略",
            rows: [
              { type: "stepper", icon: "folder", title: "保留备份数", value: "10 个", minLabel: "-", maxLabel: "+" },
              { type: "select", icon: "clock", title: "保留时长", value: "30 天", options: ["7 天", "30 天", "90 天", "永久"] },
              { type: "switch", icon: "trash", title: "自动清理过期备份", enabled: true }
            ]
          }
        ],
        actions: [
          { icon: "download", title: "立即备份", route: "backup-manual" },
          { icon: "clock", title: "查看历史", route: "backup-history" }
        ]
      },
      // 手动备份（进行中 + 完成）
      "backup-manual": {
        title: "手动备份",
        metrics: [
          { icon: "refresh", label: "备份状态", value: "进行中" },
          { icon: "download", label: "已上传", value: "8.2 MB" },
          { icon: "folder", label: "总大小", value: "12.8 MB" },
          { icon: "clock", label: "预计剩余", value: "12 秒" }
        ],
        sections: [
          {
            title: "备份范围",
            rows: [
              { type: "switch", icon: "bookshelf", title: "书架与分组", enabled: true, status: "128 本", statusTone: "info" },
              { type: "switch", icon: "clock", title: "阅读进度", enabled: true, status: "96 条", statusTone: "info" },
              { type: "switch", icon: "settings", title: "App 设置", enabled: true },
              { type: "switch", icon: "source", title: "书源配置", enabled: true, status: "12 个", statusTone: "info" }
            ]
          },
          {
            title: "备份目标",
            rows: [
              { type: "link", icon: "cloud", title: "WebDAV", value: "dav.example.com · /ReaderBackup" },
              { type: "link", icon: "folder", title: "本地", value: "/sdcard/Reader/backup" }
            ]
          }
        ],
        actions: [
          { icon: "refresh", title: "开始备份", overlay: "dialog:start-backup" },
          { icon: "check", title: "完成后查看", route: "backup-history" }
        ],
        toast: "正在备份 · 已上传 8.2 MB"
      },
      // 自动备份
      "backup-auto": {
        title: "自动备份",
        metrics: [
          { icon: "check", label: "上次备份", value: "成功" },
          { icon: "clock", label: "时间", value: "今天 02:00" },
          { icon: "cloud", label: "上传", value: "12.8 MB" },
          { icon: "folder", label: "下次", value: "明天 02:00" }
        ],
        sections: [
          {
            title: "自动备份配置",
            rows: [
              { type: "switch", icon: "refresh", title: "启用自动备份", enabled: true, status: "已开启", statusTone: "good" },
              { type: "select", icon: "clock", title: "备份频率", value: "每天", options: ["每小时", "每天", "每周", "手动"] },
              { type: "select", icon: "clock", title: "备份时间", value: "02:00", options: ["00:00", "02:00", "06:00", "12:00"] },
              { type: "switch", icon: "wifi", title: "仅 Wi-Fi 备份", enabled: true }
            ]
          },
          {
            title: "触发条件",
            rows: [
              { type: "switch", icon: "book", title: "新书添加后触发", enabled: false },
              { type: "switch", icon: "settings", title: "设置变更后触发", enabled: true },
              { type: "switch", icon: "source", title: "书源变更后触发", enabled: true },
              { type: "stepper", icon: "clock", title: "最大延迟", value: "30 分钟", minLabel: "-", maxLabel: "+" }
            ]
          },
          {
            title: "最近自动备份",
            rows: [
              { type: "link", icon: "check", title: "今天 02:00", status: "成功 · 12.8 MB", statusTone: "good", route: "backup-history" },
              { type: "link", icon: "check", title: "昨天 02:00", status: "成功 · 12.6 MB", statusTone: "good", route: "backup-history" },
              { type: "link", icon: "warning", title: "前天 02:00", status: "失败 · 网络不可用", statusTone: "warn", route: "backup-history" }
            ]
          }
        ]
      },
      // 备份历史
      "backup-history": {
        title: "备份历史",
        metrics: [
          { icon: "folder", label: "总备份数", value: "8 个" },
          { icon: "download", label: "总占用", value: "64.5 MB" },
          { icon: "cloud", label: "远程", value: "6 个" },
          { icon: "folder", label: "本地", value: "2 个" }
        ],
        sections: [
          {
            title: "备份列表",
            layout: "backup-list",
            summary: "按时间倒序展示。点击备份进入恢复流程。",
            backups: [
              { group: "今天", icon: "cloud", source: "WebDAV", title: "自动备份", time: "2026-07-11 02:00", type: "完整备份", size: "12.8 MB", device: "Mac mini · 自动", includes: "书架、进度、设置、书源", badge: "最新", tone: "good", scopes: ["bookshelf", "progress", "settings", "sources"], restoreRecord: "WebDAV · 2026-07-11 02:00 · 完整备份" },
              { group: "今天", icon: "folder", source: "本地", title: "手动备份", time: "2026-07-11 10:30", type: "完整备份", size: "12.8 MB", device: "本机文件", includes: "书架、进度、设置、书源", badge: "本机", tone: "info", scopes: ["bookshelf", "progress", "settings", "sources"], restoreRecord: "本地 · 2026-07-11 10:30 · 完整备份" },
              { group: "本周", icon: "cloud", source: "WebDAV", title: "夜间备份", time: "2026-07-10 02:00", type: "完整备份", size: "12.6 MB", device: "远程备份", includes: "书架、进度、设置、书源", badge: "历史", tone: "muted", scopes: ["bookshelf", "progress", "settings", "sources"], restoreRecord: "WebDAV · 2026-07-10 02:00 · 完整备份" },
              { group: "本周", icon: "cloud", source: "WebDAV", title: "夜间备份", time: "2026-07-09 02:00", type: "书架与设置", size: "8.6 MB", device: "远程备份", includes: "书架、分组、设置", badge: "局部", tone: "warn", scopes: ["bookshelf", "settings"], restoreRecord: "WebDAV · 2026-07-09 02:00 · 书架与设置" },
              { group: "本月", icon: "cloud", source: "WebDAV", title: "周备份", time: "2026-07-02 02:00", type: "完整备份", size: "12.4 MB", device: "远程备份", includes: "书架、进度、设置、书源", badge: "历史", tone: "muted", scopes: ["bookshelf", "progress", "settings", "sources"], restoreRecord: "WebDAV · 2026-07-02 02:00 · 完整备份" },
              { group: "本月", icon: "folder", source: "本地", title: "阅读进度快照", time: "2026-06-28 09:40", type: "阅读进度", size: "2.4 MB", device: "本机文件", includes: "阅读进度", badge: "进度", tone: "muted", scopes: ["progress"], restoreRecord: "本地 · 2026-06-28 09:40 · 阅读进度" },
              { group: "更早", icon: "cloud", source: "WebDAV", title: "迁移前备份", time: "2026-06-23 18:10", type: "完整备份", size: "12.1 MB", device: "远程备份", includes: "书架、进度、设置、书源", badge: "历史", tone: "muted", scopes: ["bookshelf", "progress", "settings", "sources"], restoreRecord: "WebDAV · 2026-06-23 18:10 · 完整备份" },
              { group: "更早", icon: "cloud", source: "WebDAV", title: "书源配置", time: "2026-06-12 18:10", type: "书源配置", size: "1.6 MB", device: "远程备份", includes: "书源、分组", badge: "配置", tone: "muted", scopes: ["sources"], restoreRecord: "WebDAV · 2026-06-12 18:10 · 书源配置" }
            ]
          }
        ],
        actions: [
          { icon: "download", title: "立即备份", route: "backup-manual" },
          { icon: "settings", title: "备份设置", route: "backup-settings" },
          { tone: "danger", icon: "trash", title: "清理历史", overlay: "dialog:clear-history" }
        ]
      },
      // 进度同步
      "progress-sync": {
        title: "阅读进度同步",
        metrics: [
          { icon: "check", label: "上次同步", value: "成功" },
          { icon: "clock", label: "时间", value: "10:30" },
          { icon: "book", label: "同步书籍", value: "96 本" },
          { icon: "refresh", label: "冲突", value: "0 项" }
        ],
        sections: [
          {
            title: "同步配置",
            rows: [
              { type: "switch", icon: "refresh", title: "自动同步阅读进度", enabled: true, status: "已开启", statusTone: "good" },
              { type: "select", icon: "clock", title: "同步频率", value: "实时", options: ["实时", "每章", "手动"] },
              { type: "switch", icon: "wifi", title: "仅 Wi-Fi 同步", enabled: true },
              { type: "switch", icon: "warning", title: "冲突时询问", enabled: true }
            ]
          },
          {
            title: "同步状态",
            rows: [
              { type: "link", icon: "check", title: "今天 10:30", status: "成功 · 96 本", statusTone: "good", route: "progress-sync-status" },
              { type: "link", icon: "check", title: "今天 09:15", status: "成功 · 96 本", statusTone: "good", route: "progress-sync-status" },
              { type: "link", icon: "warning", title: "昨天 22:30", status: "部分成功 · 2 项冲突", statusTone: "warn", route: "progress-sync-status" }
            ]
          }
        ],
        actions: [
          { icon: "refresh", title: "立即同步", route: "progress-sync-status" },
          { icon: "cloud", title: "WebDAV 配置", route: "webdav-config" }
        ]
      },
      // 进度同步状态（进行中 + 结果）
      "progress-sync-status": {
        title: "进度同步状态",
        metrics: [
          { icon: "refresh", label: "状态", value: "进行中" },
          { icon: "book", label: "已同步", value: "62 本" },
          { icon: "book", label: "总数", value: "96 本" },
          { icon: "clock", label: "预计剩余", value: "8 秒" }
        ],
        sections: [
          {
            title: "同步阶段",
            rows: [
              { type: "link", icon: "check", title: "拉取远程进度", status: "96 条", statusTone: "good" },
              { type: "link", icon: "refresh", title: "比对本地进度", status: "进行中", statusTone: "warn" },
              { type: "link", icon: "clock", title: "上传本地变更", status: "等待", statusTone: "muted" },
              { type: "link", icon: "clock", title: "写入数据库", status: "等待", statusTone: "muted" }
            ]
          },
          {
            title: "本次同步",
            rows: [
              { type: "link", icon: "book", title: "长夜余火", value: "第 32 章 → 第 35 章" },
              { type: "link", icon: "book", title: "三体", value: "第 12 章 → 第 18 章" },
              { type: "link", icon: "warning", title: "雨夜", value: "冲突 · 本地优先" }
            ]
          }
        ],
        actions: [
          { icon: "refresh", title: "重新同步", route: "progress-sync" },
          { icon: "log", title: "查看日志", route: "source-logs" }
        ],
        toast: "正在同步 · 62 / 96 本"
      },
      // 远程 WebDAV 书籍
      "remote-webdav-books": {
        title: "远程 WebDAV 书籍",
        metrics: [
          { icon: "cloud", label: "远程书籍", value: "8 本" },
          { icon: "download", label: "已下载", value: "5 本" },
          { icon: "folder", label: "占用", value: "12.8 MB" },
          { icon: "clock", label: "最近同步", value: "10:30" }
        ],
        sections: [
          {
            title: "远程书籍列表",
            rows: [
              { type: "link", icon: "book", title: "长夜余火", meta: "第 35 章 · 2.1 MB · 已下载", route: "reader", status: "已下载", statusTone: "good" },
              { type: "link", icon: "book", title: "三体", meta: "第 18 章 · 3.6 MB · 已下载", route: "reader", status: "已下载", statusTone: "good" },
              { type: "link", icon: "book", title: "雨夜", meta: "第 32 章 · 1.8 MB · 已下载", route: "reader", status: "已下载", statusTone: "good" },
              { type: "link", icon: "book", title: "神秘岛", meta: "第 24 章 · 2.4 MB · 已下载", route: "reader", status: "已下载", statusTone: "good" },
              { type: "link", icon: "book", title: "人间词话", meta: "第 8 章 · 0.9 MB · 已下载", route: "reader", status: "已下载", statusTone: "good" },
              { type: "link", icon: "cloud", title: "亮剑", meta: "第 42 章 · 4.2 MB · 仅远程", route: "reader", status: "仅远程", statusTone: "info" },
              { type: "link", icon: "cloud", title: "白夜行", meta: "第 28 章 · 3.1 MB · 仅远程", route: "reader", status: "仅远程", statusTone: "info" },
              { type: "link", icon: "cloud", title: "时间简史", meta: "第 6 章 · 1.4 MB · 仅远程", route: "reader", status: "仅远程", statusTone: "info" }
            ]
          }
        ],
        actions: [
          { icon: "download", title: "下载全部", overlay: "dialog:download-all" },
          { icon: "refresh", title: "刷新列表", route: "remote-webdav-books" },
          { tone: "danger", icon: "trash", title: "清理远程", overlay: "dialog:clear-remote" }
        ]
      }
    };
    return pages[route] || pages["sync-settings-entry"];
  }

  // ===========================================================================
  // 6. restoreFlowV2 — 恢复流程增强（范围 / 预览 / 进行中 / 冲突 / 结果）
  // 覆盖路由：
  //   restore-confirm / restore-scopes / restore-preview
  //   restore-progress / restore-running / restore-conflict
  //   restore-result / restore-failed / restore-partial
  // ===========================================================================
  function restoreFlowV2(data, route, appState) {
    var page = d2RestorePage(route, appState);
    var restoreRecord = (appState && appState.selectedRestoreRecord) || "WebDAV · 2026-07-11 02:00 · 完整备份";
    var contentHtml = `
      <section class="fd-restore-flow fd-d2-restore-flow" aria-label="${esc(page.title)}">
        <article class="fd-source-detail-head fd-restore-head">
          <span><strong>${esc(page.title)}</strong><small>${esc(restoreRecord)}</small></span>
          ${page.badge || ""}
        </article>
        ${page.content}
      </section>`;
    return d2SettingsShell(data, page.title, contentHtml, {
      toastHtml: page.toast ? `<section class="fd-settings-toast">${esc(page.toast)}</section>` : ""
    });
  }

  // 恢复范围目录（与 render-runtime.js restoreScopeCatalog 一致）
  var d2RestoreScopeCatalog = [
    { key: "bookshelf", icon: "bookshelf", title: "书架与分组", meta: "恢复书架书籍、分组和排序", impact: "128 本书 · 12 个分组" },
    { key: "progress", icon: "clock", title: "阅读进度", meta: "恢复章节位置和阅读进度", impact: "96 条阅读进度" },
    { key: "settings", icon: "settings", title: "阅读与 App 设置", meta: "恢复主题、排版和通用设置", impact: "主题、排版、通用设置" },
    { key: "sources", icon: "source", title: "书源配置", meta: "恢复书源、分组和启用状态", impact: "12 个书源 · 4 个分组" }
  ];

  function d2RestoreSelectedScopes(appState) {
    var selected = appState && Array.isArray(appState.restoreSelectedScopes) && appState.restoreSelectedScopes.length
      ? appState.restoreSelectedScopes
      : d2RestoreScopeCatalog.map(function (item) { return item.key; });
    return selected;
  }

  function d2RestoreScopeLabel(keys) {
    var selected = keys.length ? keys : d2RestoreScopeCatalog.map(function (item) { return item.key; });
    return d2RestoreScopeCatalog
      .filter(function (item) { return selected.indexOf(item.key) >= 0; })
      .map(function (item) { return item.title; })
      .join("、");
  }

  function d2RestoreScopeImpact(keys) {
    var selected = keys.length ? keys : d2RestoreScopeCatalog.map(function (item) { return item.key; });
    var impacts = d2RestoreScopeCatalog
      .filter(function (item) { return selected.indexOf(item.key) >= 0; })
      .map(function (item) { return item.impact; });
    return impacts.length > 2 ? impacts.slice(0, 2).join(" · ") + " 等 " + impacts.length + " 项" : impacts.join(" · ");
  }

  // 恢复范围选择列表
  function d2RestoreScopeChoiceList(appState) {
    var selected = d2RestoreSelectedScopes(appState);
    return `
      <section class="fd-restore-card fd-restore-scope-card fd-d2-restore-scope-card">
        <h2>选择恢复范围</h2>
        <p>至少保留一项。开始恢复前可在这里调整。</p>
        <div class="fd-restore-scope-list" aria-label="恢复范围">
          ${d2RestoreScopeCatalog.map(function (item) {
            var isSelected = selected.indexOf(item.key) >= 0;
            return `
              <button class="${isSelected ? "is-selected" : ""}" type="button" data-restore-scope="${esc(item.key)}" aria-pressed="${isSelected ? "true" : "false"}">
                ${icon(item.icon, "fd-small-icon")}
                <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
                ${d2Switch(isSelected)}
              </button>`;
          }).join("")}
        </div>
      </section>`;
  }

  function d2RestorePage(route, appState) {
    var restoreRecord = (appState && appState.selectedRestoreRecord) || "WebDAV · 2026-07-11 02:00 · 完整备份";
    var selectedScopes = d2RestoreSelectedScopes(appState);
    var scopeRows = [
      ["备份来源", restoreRecord],
      ["恢复范围", d2RestoreScopeLabel(selectedScopes)],
      ["预计影响", d2RestoreScopeImpact(selectedScopes)],
      ["可回退点", "恢复前自动生成本地快照"]
    ];

    var pages = {
      // 恢复确认
      "restore-confirm": {
        title: "恢复确认",
        badge: d2Badge("待确认", "warn"),
        content: `
          <section class="fd-restore-card">
            <h2>确认恢复数据</h2>
            <p>将使用选中的备份覆盖本机同类数据。恢复前会创建本地快照，取消不会改变当前数据。</p>
            <div class="fd-restore-summary-grid">${d2SummaryRows(scopeRows)}</div>
          </section>
          ${d2RestoreScopeChoiceList(appState)}
          <section class="fd-restore-warning">
            ${icon("warning", "fd-small-icon")}
            <span><strong>覆盖提醒</strong><small>冲突项会在恢复过程中单独确认，不会静默覆盖。</small></span>
          </section>
          <section class="fd-restore-actions">
            <button type="button" data-route="sync-backup">取消</button>
            <button class="is-primary" type="button" data-route="restore-scopes">下一步：范围</button>
          </section>`
      },
      // 恢复范围（全量 / 选择范围）
      "restore-scopes": {
        title: "恢复范围",
        badge: d2Badge("选择范围", "warn"),
        content: `
          <section class="fd-restore-card">
            <h2>全量恢复或选择范围</h2>
            <p>全量恢复会覆盖书架、进度、设置和书源；选择范围可只恢复部分数据。</p>
            <div class="fd-restore-summary-grid">${d2SummaryRows([
              ["全量恢复", "书架、进度、设置、书源"],
              ["选择范围", "至少保留一项"],
              ["预计影响", d2RestoreScopeImpact(selectedScopes)]
            ])}</div>
          </section>
          <section class="fd-restore-card fd-d2-restore-mode-card">
            <h2>恢复模式</h2>
            <div class="fd-d2-restore-mode-buttons">
              <button class="is-primary" type="button" data-d2-restore-mode="full" data-route="restore-preview">
                ${icon("backup", "fd-small-icon")}<span><strong>全量恢复</strong><small>覆盖所有数据</small></span>
              </button>
              <button type="button" data-d2-restore-mode="partial" data-route="restore-preview">
                ${icon("filter", "fd-small-icon")}<span><strong>选择范围</strong><small>自定义恢复项</small></span>
              </button>
            </div>
          </section>
          ${d2RestoreScopeChoiceList(appState)}
          <section class="fd-restore-actions">
            <button type="button" data-route="restore-confirm">上一步</button>
            <button class="is-primary" type="button" data-route="restore-preview">下一步：预览</button>
          </section>`
      },
      // 恢复预览（恢复内容预览）
      "restore-preview": {
        title: "恢复预览",
        badge: d2Badge("预览中", "info"),
        content: `
          <section class="fd-restore-card">
            <h2>恢复内容预览</h2>
            <p>以下是将要恢复的内容。请确认无误后开始恢复。</p>
            <div class="fd-restore-summary-grid">${d2SummaryRows([
              ["备份来源", restoreRecord],
              ["恢复范围", d2RestoreScopeLabel(selectedScopes)],
              ["预计影响", d2RestoreScopeImpact(selectedScopes)]
            ])}</div>
          </section>
          <section class="fd-restore-card fd-d2-restore-preview-card">
            <h2>书架预览（128 本）</h2>
            <article class="fd-d2-restore-preview-row"><span>${icon("book", "fd-small-icon")}</span><strong>长夜余火</strong><small>第 35 章 · 玄幻连载</small><em>新增</em></article>
            <article class="fd-d2-restore-preview-row"><span>${icon("book", "fd-small-icon")}</span><strong>三体</strong><small>第 18 章 · 科幻</small><em>更新进度</em></article>
            <article class="fd-d2-restore-preview-row"><span>${icon("book", "fd-small-icon")}</span><strong>雨夜</strong><small>第 32 章 · 悬疑</small><em>冲突</em></article>
            <article class="fd-d2-restore-preview-row"><span>${icon("book", "fd-small-icon")}</span><strong>神秘岛</strong><small>第 24 章 · 经典</small><em>无变化</em></article>
            <article class="fd-d2-restore-preview-more">还有 124 本未展示</article>
          </section>
          <section class="fd-restore-card fd-d2-restore-preview-card">
            <h2>设置预览</h2>
            <article class="fd-d2-restore-preview-row"><span>${icon("palette", "fd-small-icon")}</span><strong>主题</strong><small>纸纹</small><em>覆盖</em></article>
            <article class="fd-d2-restore-preview-row"><span>${icon("font", "fd-small-icon")}</span><strong>字号</strong><small>18</small><em>覆盖</em></article>
            <article class="fd-d2-restore-preview-row"><span>${icon("book", "fd-small-icon")}</span><strong>翻页模式</strong><small>覆盖</small><em>冲突</em></article>
          </section>
          <section class="fd-restore-card fd-d2-restore-preview-card">
            <h2>书源预览（12 个）</h2>
            <article class="fd-d2-restore-preview-row"><span>${icon("source", "fd-small-icon")}</span><strong>起点中文网</strong><small>qidian.com</small><em>无变化</em></article>
            <article class="fd-d2-restore-preview-row"><span>${icon("source", "fd-small-icon")}</span><strong>笔趣阁</strong><small>biquge.example</small><em>覆盖</em></article>
            <article class="fd-d2-restore-preview-row"><span>${icon("source", "fd-small-icon")}</span><strong>旧规则源</strong><small>old.example</small><em>跳过 · 版本不兼容</em></article>
          </section>
          <section class="fd-restore-actions">
            <button type="button" data-route="restore-scopes">上一步</button>
            <button class="is-primary" type="button" data-route="restore-progress">开始恢复</button>
          </section>`
      },
      // 恢复进度
      "restore-progress": {
        title: "恢复进度",
        badge: d2Badge("进行中", "warn"),
        content: `
          <section class="fd-restore-card">
            <h2>正在恢复</h2>
            <p>当前正在合并书架和阅读进度。离开页面不会中断恢复，完成后会进入结果状态。</p>
            <div class="fd-restore-progress-meter" style="--restore-progress:68%"><i><b></b></i><span>68%</span></div>
          </section>
          ${d2RestoreStageList([
            { title: "下载备份", meta: "12.8 MB · WebDAV", status: "完成", tone: "good", progress: "100%", done: true },
            { title: "校验文件", meta: "manifest、hash、版本兼容", status: "完成", tone: "good", progress: "100%", done: true },
            { title: "合并数据", meta: "书架 128 本 · 进度 96 条", status: "进行中", tone: "warn", progress: "68%", active: true },
            { title: "写入设置", meta: "等待合并完成", status: "等待", tone: "muted", progress: "0%" }
          ])}
          <section class="fd-restore-actions">
            <button type="button" data-route="restore-conflict">处理冲突</button>
            <button class="is-primary" type="button" data-route="restore-result">查看结果</button>
          </section>`
      },
      // 恢复进行中（与 restore-progress 类似，但强调取消能力）
      "restore-running": {
        title: "恢复进行中",
        badge: d2Badge("运行中", "warn"),
        content: `
          <section class="fd-restore-card">
            <h2>恢复正在后台运行</h2>
            <p>恢复过程不会阻塞阅读。可继续使用 App，完成后会通知你查看结果。</p>
            <div class="fd-restore-progress-meter" style="--restore-progress:42%"><i><b></b></i><span>42%</span></div>
          </section>
          ${d2RestoreStageList([
            { title: "下载备份", meta: "12.8 MB · WebDAV", status: "完成", tone: "good", progress: "100%", done: true },
            { title: "校验文件", meta: "manifest、hash、版本兼容", status: "完成", tone: "good", progress: "100%", done: true },
            { title: "合并数据", meta: "书架 128 本 · 进度 96 条", status: "进行中", tone: "warn", progress: "42%", active: true },
            { title: "写入设置", meta: "等待合并完成", status: "等待", tone: "muted", progress: "0%" }
          ])}
          <section class="fd-restore-warning">
            ${icon("info", "fd-small-icon")}
            <span><strong>取消说明</strong><small>取消会停止后续恢复步骤，已合并的数据不会回滚，可从本地快照恢复。</small></span>
          </section>
          <section class="fd-restore-actions">
            <button type="button" data-route="restore-result">查看结果</button>
            <button class="is-danger" type="button" data-route="sync-backup">取消恢复</button>
          </section>`,
        toast: "恢复运行中 · 42% · 可继续使用 App"
      },
      // 恢复冲突（本地 vs 远程对比）
      "restore-conflict": {
        title: "恢复冲突",
        badge: d2Badge("3 项冲突", "warn"),
        content: `
          <section class="fd-restore-card">
            <h2>选择冲突处理方式</h2>
            <p>以下项目本地和备份均有更新。请选择保留本地或使用备份，选择后恢复会继续。</p>
            <div class="fd-d2-conflict-legend">
              <span><em>本地</em>当前设备上的数据</span>
              <span><em>远程</em>备份中的数据</span>
            </div>
          </section>
          ${d2ConflictRows([
            { id: "group", title: "分组：玄幻连载", meta: "本地 42 本 · 远程 46 本", local: "保留本地 42 本", localMeta: "本地较新", localSelected: false, remote: "使用备份 46 本", remoteMeta: "备份较新", remoteSelected: true },
            { id: "progress", title: "阅读进度：长夜余火", meta: "本地第 32 章 · 远程第 35 章", local: "本地第 32 章", localMeta: "落后 3 章", localSelected: false, remote: "远程第 35 章", remoteMeta: "领先 3 章", remoteSelected: true },
            { id: "settings", title: "阅读设置：浅色主题", meta: "本地字号 18 · 远程字号 17", local: "本机字号 18", localMeta: "字号更大", localSelected: true, remote: "备份字号 17", remoteMeta: "字号更小", remoteSelected: false }
          ])}
          <section class="fd-restore-card fd-d2-conflict-batch">
            <h2>批量处理</h2>
            <div class="fd-d2-conflict-batch-buttons">
              <button type="button" data-d2-conflict-batch="local">${icon("phone", "fd-small-icon")}全部保留本地</button>
              <button type="button" data-d2-conflict-batch="remote">${icon("cloud", "fd-small-icon")}全部使用备份</button>
            </div>
          </section>
          <section class="fd-restore-actions">
            <button type="button" data-route="restore-progress">返回进度</button>
            <button class="is-primary" type="button" data-route="restore-result">应用选择</button>
          </section>`
      },
      // 恢复结果（成功）
      "restore-result": {
        title: "恢复结果",
        badge: d2Badge("成功", "good"),
        content: `
          <section class="fd-restore-card is-result">
            <h2>恢复完成</h2>
            <p>书架、分组、阅读进度、设置和书源已全部恢复。可继续阅读。</p>
            <div class="fd-restore-summary-grid">${d2SummaryRows([
              ["恢复书籍", "128 本"],
              ["恢复分组", "12 个"],
              ["恢复进度", "96 条"],
              ["恢复设置", "全部"],
              ["恢复书源", "12 个"],
              ["跳过项目", "0 条"]
            ])}</div>
          </section>
          <section class="fd-restore-stage-list" aria-label="恢复结果明细">
            <article class="is-done">${icon("check", "fd-small-icon")}<span><strong>书架与分组</strong><small>已恢复 128 本书和 12 个分组</small></span>${d2Badge("成功", "good")}</article>
            <article class="is-done">${icon("check", "fd-small-icon")}<span><strong>阅读进度</strong><small>已恢复 96 条进度记录</small></span>${d2Badge("成功", "good")}</article>
            <article class="is-done">${icon("check", "fd-small-icon")}<span><strong>App 设置</strong><small>主题、排版、通用设置已恢复</small></span>${d2Badge("成功", "good")}</article>
            <article class="is-done">${icon("check", "fd-small-icon")}<span><strong>书源配置</strong><small>已恢复 12 个书源和 4 个分组</small></span>${d2Badge("成功", "good")}</article>
          </section>
          <section class="fd-restore-actions">
            <button type="button" data-route="source-logs">查看日志</button>
            <button class="is-primary" type="button" data-route="bookshelf">返回书架</button>
          </section>`,
        toast: "恢复完成 · 全部成功"
      },
      // 恢复失败
      "restore-failed": {
        title: "恢复失败",
        badge: d2Badge("失败", "warn"),
        content: `
          <section class="fd-restore-card is-result is-failed">
            <h2>恢复失败</h2>
            <p>恢复过程在「合并数据」阶段失败。本机数据未被修改，可从本地快照回退或重试。</p>
            <div class="fd-restore-summary-grid">${d2SummaryRows([
              ["失败阶段", "合并数据"],
              ["错误类型", "ManifestHashMismatch"],
              ["已恢复", "0 条"],
              ["可回退", "本地快照可用"]
            ])}</div>
          </section>
          <section class="fd-restore-stage-list" aria-label="恢复失败明细">
            <article class="is-done">${icon("check", "fd-small-icon")}<span><strong>下载备份</strong><small>12.8 MB · WebDAV</small></span>${d2Badge("完成", "good")}</article>
            <article class="is-done">${icon("check", "fd-small-icon")}<span><strong>校验文件</strong><small>manifest、hash、版本兼容</small></span>${d2Badge("完成", "good")}</article>
            <article>${icon("warning", "fd-small-icon")}<span><strong>合并数据</strong><small>hash 不匹配 · 备份可能损坏</small></span>${d2Badge("失败", "warn")}</article>
            <article>${icon("clock", "fd-small-icon")}<span><strong>写入设置</strong><small>未执行</small></span>${d2Badge("跳过", "muted")}</article>
          </section>
          <section class="fd-restore-actions">
            <button type="button" data-route="sync-backup">返回同步页</button>
            <button type="button" data-route="source-logs">查看日志</button>
            <button class="is-primary" type="button" data-route="restore-confirm">重新恢复</button>
          </section>`,
        toast: "恢复失败 · 备份可能损坏"
      },
      // 部分成功
      "restore-partial": {
        title: "部分成功",
        badge: d2Badge("部分成功", "warn"),
        content: `
          <section class="fd-restore-card is-result is-partial">
            <h2>恢复部分完成</h2>
            <p>书架、分组和阅读进度已恢复。1 条书源配置因版本不兼容被跳过，可在日志中查看详情。</p>
            <div class="fd-restore-summary-grid">${d2SummaryRows([
              ["恢复书籍", "128 本"],
              ["恢复分组", "12 个"],
              ["恢复进度", "96 条"],
              ["恢复设置", "全部"],
              ["恢复书源", "11 个"],
              ["跳过项目", "1 条"]
            ])}</div>
          </section>
          <section class="fd-restore-stage-list" aria-label="恢复部分成功明细">
            <article class="is-done">${icon("check", "fd-small-icon")}<span><strong>书架与分组</strong><small>已恢复 128 本书和 12 个分组</small></span>${d2Badge("成功", "good")}</article>
            <article class="is-done">${icon("check", "fd-small-icon")}<span><strong>阅读进度</strong><small>已恢复 96 条进度记录</small></span>${d2Badge("成功", "good")}</article>
            <article class="is-done">${icon("check", "fd-small-icon")}<span><strong>App 设置</strong><small>主题、排版、通用设置已恢复</small></span>${d2Badge("成功", "good")}</article>
            <article>${icon("warning", "fd-small-icon")}<span><strong>书源配置</strong><small>1 条旧版规则字段不兼容</small></span>${d2Badge("跳过", "warn")}</article>
          </section>
          <section class="fd-restore-actions">
            <button type="button" data-route="source-logs">查看日志</button>
            <button type="button" data-route="sync-backup">返回同步页</button>
            <button class="is-primary" type="button" data-route="bookshelf">返回书架</button>
          </section>`,
        toast: "恢复完成 · 1 项跳过"
      }
    };
    return pages[route] || pages["restore-confirm"];
  }

  // ===========================================================================
  // 7. aboutScreenV2 — 关于 / 版本 / 反馈
  // 覆盖路由：about-feedback / about / about-version / feedback
  // ===========================================================================
  function aboutScreenV2(data, route, appState) {
    var page = d2AboutPage(route, appState);
    var contentHtml = `
      ${d2MetricGrid(page.metrics)}
      ${(page.sections || []).map(function (section) {
        return d2Section(section, route, appState);
      }).join("")}
      ${d2ActionList(page.actions)}`;
    return d2SettingsShell(data, page.title, contentHtml, {
      toastHtml: page.toast ? `<section class="fd-settings-toast">${esc(page.toast)}</section>` : ""
    });
  }

  function d2AboutPage(route, appState) {
    var pages = {
      // 关于与反馈（增强版）
      "about-feedback": {
        title: "关于与反馈",
        metrics: [
          { icon: "info", label: "版本", value: "1.4.2" },
          { icon: "code", label: "构建", value: "20260711" },
          { icon: "refresh", label: "更新", value: "已是最新" },
          { icon: "people", label: "团队", value: "Reader" }
        ],
        sections: [
          {
            title: "项目信息",
            rows: [
              { type: "link", icon: "refresh", title: "检查更新", value: "已是最新", route: "about-version" },
              { type: "link", icon: "code", title: "源码仓库", value: "github.com/reader", route: "about" },
              { type: "link", icon: "link", title: "开源许可", route: "about" },
              { type: "link", icon: "mail", title: "参与贡献", route: "feedback" },
              { type: "link", icon: "people", title: "团队与致谢", route: "about" }
            ]
          },
          {
            title: "反馈",
            rows: [
              { type: "link", icon: "feedback", title: "提交反馈", meta: "问题、建议、功能请求", route: "feedback" },
              { type: "link", icon: "bug", title: "上报崩溃", meta: "自动附带日志", route: "feedback" },
              { type: "link", icon: "star", title: "评分支持", meta: "在应用商店评分", route: "feedback" }
            ]
          },
          {
            title: "社区",
            rows: [
              { type: "link", icon: "people", title: "用户群", value: "QQ 群 · 123456" },
              { type: "link", icon: "bell", title: "订阅更新", value: "已订阅", status: "已开启", statusTone: "good" }
            ]
          }
        ]
      },
      // 关于
      "about": {
        title: "关于",
        sections: [
          {
            title: "项目介绍",
            rows: [
              { type: "link", icon: "book", title: "应用名称", value: "Reader" },
              { type: "link", icon: "info", title: "版本", value: "1.4.2 (20260711)", route: "about-version" },
              { type: "link", icon: "people", title: "开发者", value: "Reader 团队" },
              { type: "link", icon: "globe", title: "官网", value: "reader.example.com" }
            ]
          },
          {
            title: "团队与致谢",
            rows: [
              { type: "link", icon: "people", title: "核心团队", value: "8 人" },
              { type: "link", icon: "heart", title: "致谢", value: "开源社区" },
              { type: "link", icon: "code", title: "依赖项目", value: "32 个", route: "about-version" }
            ]
          },
          {
            title: "法律",
            rows: [
              { type: "link", icon: "shield", title: "隐私政策" },
              { type: "link", icon: "file", title: "用户协议" },
              { type: "link", icon: "link", title: "开源许可", route: "about-version" }
            ]
          }
        ],
        actions: [
          { icon: "refresh", title: "检查更新", route: "about-version" },
          { icon: "mail", title: "反馈", route: "feedback" }
        ]
      },
      // 关于版本
      "about-version": {
        title: "版本信息",
        metrics: [
          { icon: "info", label: "当前版本", value: "1.4.2" },
          { icon: "code", label: "构建号", value: "20260711" },
          { icon: "refresh", label: "更新状态", value: "最新" },
          { icon: "clock", label: "发布时间", value: "2026-07-11" }
        ],
        sections: [
          {
            title: "版本详情",
            rows: [
              { type: "link", icon: "info", title: "版本号", value: "1.4.2" },
              { type: "link", icon: "code", title: "构建号", value: "20260711" },
              { type: "link", icon: "clock", title: "发布日期", value: "2026-07-11" },
              { type: "link", icon: "phone", title: "适配版本", value: "Android 8.0+" },
              { type: "link", icon: "download", title: "安装包大小", value: "12.4 MB" }
            ]
          },
          {
            title: "更新日志",
            rows: [
              { type: "link", icon: "refresh", title: "1.4.2", meta: "新增备份设置分区 · 修复进度同步冲突 · 优化书源调试", status: "当前", statusTone: "good" },
              { type: "link", icon: "history", title: "1.4.1", meta: "修复夜间模式亮度 · 增强导入冲突处理" },
              { type: "link", icon: "history", title: "1.4.0", meta: "新增书源调试 · 改进 WebDAV 错误处理" },
              { type: "link", icon: "history", title: "1.3.8", meta: "性能优化 · 修复若干崩溃" }
            ]
          },
          {
            title: "依赖",
            rows: [
              { type: "link", icon: "code", title: "开源依赖", value: "32 个" },
              { type: "link", icon: "link", title: "查看许可", route: "about" }
            ]
          }
        ],
        actions: [
          { icon: "refresh", title: "检查更新", overlay: "dialog:check-update" },
          { icon: "download", title: "下载最新版", overlay: "dialog:download-latest" }
        ],
        toast: "当前已是最新版本"
      },
      // 反馈
      "feedback": {
        title: "反馈",
        sections: [
          {
            title: "反馈类型",
            rows: [
              { type: "segment", icon: "feedback", title: "类型", value: "功能建议", options: ["问题反馈", "功能建议", "崩溃上报", "其它"] }
            ]
          },
          {
            title: "反馈内容",
            rows: [
              { type: "input", inputType: "text", icon: "edit", title: "标题", value: "", placeholder: "简短描述" },
              { type: "input", inputType: "text", icon: "file", title: "详情", value: "", placeholder: "详细描述（可填遇到的问题、期待的功能等）" },
              { type: "input", inputType: "url", icon: "link", title: "相关链接", value: "", placeholder: "可选" }
            ]
          },
          {
            title: "附加信息",
            rows: [
              { type: "switch", icon: "bug", title: "附带日志", enabled: true, status: "已开启", statusTone: "good" },
              { type: "switch", icon: "info", title: "附带设备信息", enabled: true },
              { type: "switch", icon: "bookshelf", title: "附带书架快照", enabled: false, meta: "不含书源" },
              { type: "link", icon: "mail", title: "联系方式", value: "reader@example.com" }
            ]
          }
        ],
        actions: [
          { icon: "check", title: "提交反馈", overlay: "dialog:submit-feedback" },
          { icon: "log", title: "查看历史反馈", route: "source-logs" }
        ]
      }
    };
    return pages[route] || pages["about-feedback"];
  }

  // ===========================================================================
  // 集成映射：route → renderer 函数名
  // ===========================================================================
  var INTEGRATION_MAP = {
    // 1. globalSettingsV2 — 全局设置
    "global-settings": "globalSettingsV2",
    "settings-general": "globalSettingsV2",
    "settings-reading-preferences": "globalSettingsV2",
    "settings-network": "globalSettingsV2",
    "settings-cache": "globalSettingsV2",
    "settings-privacy": "globalSettingsV2",

    // 2. readingSettingsV2 — 阅读设置
    "reading-settings-entry": "readingSettingsV2",
    "reading-typography-default": "readingSettingsV2",
    "reading-page-turn-default": "readingSettingsV2",
    "reading-brightness": "readingSettingsV2",

    // 3. sourceSettingsV2 — 书源设置
    "source-settings-entry": "sourceSettingsV2",
    "source-management": "sourceSettingsV2",
    "source-debug": "sourceSettingsV2",
    "source-import-export": "sourceSettingsV2",

    // 4. webdavConfigV2 — WebDAV
    "webdav-config": "webdavConfigV2",
    "webdav-test": "webdavConfigV2",
    "webdav-error": "webdavConfigV2",

    // 5. backupScreenV2 — 备份管理
    "sync-settings-entry": "backupScreenV2",
    "sync-backup": "backupScreenV2",
    "backup-settings": "backupScreenV2",
    "backup-manual": "backupScreenV2",
    "backup-auto": "backupScreenV2",
    "backup-history": "backupScreenV2",
    "progress-sync": "backupScreenV2",
    "progress-sync-status": "backupScreenV2",
    "remote-webdav-books": "backupScreenV2",

    // 6. restoreFlowV2 — 恢复流程
    "restore-confirm": "restoreFlowV2",
    "restore-scopes": "restoreFlowV2",
    "restore-preview": "restoreFlowV2",
    "restore-progress": "restoreFlowV2",
    "restore-running": "restoreFlowV2",
    "restore-conflict": "restoreFlowV2",
    "restore-result": "restoreFlowV2",
    "restore-failed": "restoreFlowV2",
    "restore-partial": "restoreFlowV2",

    // 7. aboutScreenV2 — 关于/版本/反馈
    "about-feedback": "aboutScreenV2",
    "about": "aboutScreenV2",
    "about-version": "aboutScreenV2",
    "feedback": "aboutScreenV2"
  };

  // ===========================================================================
  // 路由分发主入口（render-runtime.js dispatch hook 调用）
  // 返回空字符串表示该路由不属于 D2 模块
  // ===========================================================================
  // R2.0：新增 options 参数（携带 pageState / loading / viewState / overlayState），
  //       透传给底层 V2 renderer。底层 V2 函数签名保持 (data, route, appState)，
  //       options 作为第 4 参数；当前 V2 实现不消费 options，留给 R2a/R2b 接入
  //       loading/error 等 ViewState 时使用。不重构现有行为。
  function renderD2Route(route, data, appState, options) {
    var fnName = INTEGRATION_MAP[route];
    if (!fnName) return "";
    var fn = d2Exports[fnName];
    if (typeof fn !== "function") return "";
    return fn(data, route, appState, options);
  }

  // ===========================================================================
  // 暴露 API
  // ===========================================================================
  var d2Exports = {
    // 路由分发主入口
    renderD2Route: renderD2Route,
    // 集成映射（route → renderer 函数名）
    INTEGRATION_MAP: INTEGRATION_MAP,
    // 7 个 V2 renderer 函数（签名统一为 data, route, appState）
    globalSettingsV2: globalSettingsV2,
    readingSettingsV2: readingSettingsV2,
    sourceSettingsV2: sourceSettingsV2,
    webdavConfigV2: webdavConfigV2,
    backupScreenV2: backupScreenV2,
    restoreFlowV2: restoreFlowV2,
    aboutScreenV2: aboutScreenV2,
    // 通用 UI 块（供外部事件层或测试调用）
    ui: {
      esc: esc,
      icon: icon,
      chevron: chevron,
      routeTitle: routeTitle,
      pct: pct,
      badge: d2Badge,
      switch: d2Switch,
      segment: d2Segment,
      stepper: d2Stepper,
      inputRow: d2InputRow,
      row: d2Row,
      section: d2Section,
      metricGrid: d2MetricGrid,
      storageCard: d2StorageCard,
      actionList: d2ActionList,
      entryCard: d2EntryCard,
      backupCard: d2BackupCard,
      backupList: d2BackupList,
      restoreStageList: d2RestoreStageList,
      conflictRows: d2ConflictRows,
      summaryRows: d2SummaryRows,
      settingsShell: d2SettingsShell
    },
    // 持久化 API
    storage: {
      prefix: STORAGE_PREFIX,
      get: d2Get,
      set: d2Set,
      remove: d2Remove
    },
    // A2 Phase 2: settings-general 状态 owner / reducer / dispatch
    // 外部事件层（render-runtime.js 的事件 dispatcher）通过此 API 与状态交互：
    //   state = settingsGeneral.getState()
    //   settingsGeneral.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "...", value: true })
    //   unsubscribe = settingsGeneral.subscribe((next, prev, action) => { ... })
    settingsGeneral: {
      defaults: D2_SETTINGS_GENERAL_DEFAULTS,
      labelMap: D2_SETTINGS_GENERAL_LABEL_MAP,
      permissionNames: D2_PERMISSION_NAMES,
      initState: d2SettingsGeneralInitState,
      defaultState: d2SettingsGeneralDefaultState,
      reducer: d2SettingsGeneralReducer,
      getState: d2SettingsGeneralGetState,
      dispatch: d2SettingsGeneralDispatch,
      subscribe: d2SettingsGeneralSubscribe,
      injectAppState: d2SettingsGeneralInjectAppState,
      labelFor: d2SettingsGeneralLabelFor,
      rawFor: d2SettingsGeneralRawFor,
      permissionStatus: d2SettingsGeneralPermissionStatus,
      pageData: d2SettingsGeneralPageData,
      // A2 Phase 4-6 执行函数（事件层调用）
      requestPermission: d2RequestPermission,
      executeCacheClear: d2ExecuteCacheClear,
      executeResetDefaults: d2ExecuteResetDefaults
    },
    // R2a/R2b: source-management 状态 owner / reducer / dispatch
    // 外部事件层通过此 API 与 source-management 状态交互：
    //   state = sourceManagement.getState()
    //   sourceManagement.dispatch({ type: "TOGGLE_SOURCE", settingsKey: "source-biquge", value: false })
    //   unsubscribe = sourceManagement.subscribe((next, prev, action) => { ... })
    sourceManagement: {
      storageKey: D2_SOURCE_MANAGEMENT_STORAGE_KEY,
      defaultSources: D2_SOURCE_MANAGEMENT_DEFAULT_SOURCES,
      initState: d2SourceManagementInitState,
      defaultState: d2SourceManagementDefaultState,
      reducer: d2SourceManagementReducer,
      getState: d2SourceManagementGetState,
      dispatch: d2SourceManagementDispatch,
      subscribe: d2SourceManagementSubscribe,
      injectAppState: d2SourceManagementInjectAppState,
      renderSourceManagement: sourceManagementV2,
      // R2b 执行函数（事件层 / 测试调用）
      executeDelete: d2ExecuteSourceDelete
    },
    // R2a/R2b: webdav-config 状态 owner / reducer / dispatch
    // 外部事件层通过此 API 与 webdav-config 状态交互：
    //   state = webdavConfig.getState()
    //   webdavConfig.dispatch({ type: "SET_INPUT", settingsKey: "serverUrl", value: "https://..." })
    //   webdavConfig.dispatch({ type: "TOGGLE_SWITCH", settingsKey: "sslVerify", value: false })
    //   webdavConfig.dispatch({ type: "STEP_TIMEOUT", delta: +1 })
    //   webdavConfig.dispatch({ type: "SELECT_AUTO_SYNC", value: "每小时" })
    //   webdavConfig.dispatch({ type: "TEST_CONFIRM_OPEN" }) → executeTest() → TEST_SUCCESS/FAILED
    //   webdavConfig.dispatch({ type: "SAVE_CONFIRM_OPEN" }) → executeSave() → SAVE_SUCCESS/FAILED
    //   webdavConfig.dispatch({ type: "CLEAR_CONFIRM_OPEN" }) → executeClear() → CLEAR_SUCCESS/FAILED
    //   unsubscribe = webdavConfig.subscribe((next, prev, action) => { ... })
    webdavConfig: {
      storageKey: D2_WEBDAV_CONFIG_STORAGE_KEY,
      defaults: D2_WEBDAV_CONFIG_DEFAULTS,
      autoSyncOptions: D2_WEBDAV_AUTO_SYNC_OPTIONS,
      initState: d2WebdavConfigInitState,
      defaultState: d2WebdavConfigDefaultState,
      reducer: d2WebdavConfigReducer,
      getState: d2WebdavConfigGetState,
      dispatch: d2WebdavConfigDispatch,
      subscribe: d2WebdavConfigSubscribe,
      injectAppState: d2WebdavConfigInjectAppState,
      validateInputs: d2ValidateWebdavInputs,
      renderWebdavConfig: webdavConfigV2,
      // R2b 执行函数（事件层 / 测试调用）
      executeTest: d2ExecuteWebdavTest,
      executeSave: d2ExecuteWebdavSave,
      executeClear: d2ExecuteWebdavClear
    },
    // 恢复流程数据
    restore: {
      scopeCatalog: d2RestoreScopeCatalog,
      selectedScopes: d2RestoreSelectedScopes,
      scopeLabel: d2RestoreScopeLabel,
      scopeImpact: d2RestoreScopeImpact,
      scopeChoiceList: d2RestoreScopeChoiceList
    },
    // 页面数据生成器（供事件层 / 测试直接访问）
    pages: {
      globalSettings: d2GlobalSettingsPage,
      readingSettings: d2ReadingSettingsPage,
      sourceSettings: d2SourceSettingsPage,
      webdav: d2WebdavPage,
      backup: d2BackupPage,
      restore: d2RestorePage,
      about: d2AboutPage
    }
  };

  window.ReaderD2SettingsSyncRenderers = d2Exports;
})(window);
