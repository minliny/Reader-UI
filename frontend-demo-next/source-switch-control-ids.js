// Source Switch 域 Control Identity 与 UiEvent 映射
// B4 · Source Switch 工作包（2026-07-19）
//
// 消费 A2 · Control Identity Foundation 的稳定身份基础设施。
// - 默认状态（state=default）的 controlId 来自 control-id-registry.json（IC0 审计产出）。
// - 状态变体（empty/error/timeout/loading/rollback/preview/results）的 controlId 按
//   contracts/control-identity.schema.json 的命名规则 composeControlId 生成；
//   这些变体尚未在 IC0 审计中枚举，下一次 IC0 audit 会将其纳入 registry。
// - UiEvent 名来自 contracts/ui-event.schema.json 的 enum；source.switch.* 已冻结。
//
// 本文件只暴露纯数据与无副作用 helper；不修改 DOM，不依赖 document。
// render-runtime.js 中的 source-switch 函数消费本文件，将 data-control-id 与
// data-ui-event 写入对应 element。

(function attachReaderSourceSwitchControlIds(window) {
  "use strict";

  // ===== 默认状态（state=default）controlId —— 来自 control-id-registry.json =====
  // 这些 ID 在 A2 baseline 已冻结；hash8 来自 candidateKey 的 SHA-256 前 8 个字符。

  /** @type {Record<string, string>} 候选行 data-source-index -> controlId */
  const CANDIDATE_ROW_CONTROL_IDS = Object.freeze({
    "0": "source-switch.listrow-action.source-switch.default.phone.button.h-951ebeb7",
    "1": "source-switch.listrow-action.source-switch.default.phone.button.h-e34f7db5",
    "2": "source-switch.listrow-action.source-switch.default.phone.button.h-b773e24e",
    "3": "source-switch.listrow-action.source-switch.default.phone.button.h-13a6acac",
    "4": "source-switch.listrow-action.source-switch.default.phone.button.h-09ffea84",
    "5": "source-switch.listrow-action.source-switch.default.phone.button.h-6f9e802e",
    "6": "source-switch.listrow-action.source-switch.default.phone.button.h-2537c4fe",
    "7": "source-switch.listrow-action.source-switch.default.phone.button.h-7243f957",
    "8": "source-switch.listrow-action.source-switch.default.phone.button.h-2618d53d",
    "9": "source-switch.listrow-action.source-switch.default.phone.button.h-7570f281",
    "10": "source-switch.listrow-action.source-switch.default.phone.button.h-4bd6fcc3"
  });

  /** 默认状态 close 按钮（关闭换源窗口回到 reader） */
  const CLOSE_WINDOW_CONTROL_ID =
    "source-switch.button.source-switch.default.phone.button.route-reader-h-bb3698f4";

  // ===== 状态变体 controlId —— 按 schema 命名规则 compose 生成 =====
  // 这些 controlId 不在 A2 registry（IC0 仅审计 state=default），但符合 schema
  // pattern：{domain}.{family}.{route}.{state}.{viewport}.{role}[.discriminator]
  // 下一次 IC0 审计会将这些控件纳入 registry 并回填 hash8 discriminator。

  /** @type {Record<string, string>} state -> route atom（registry route 命名） */
  const STATE_ROUTE = Object.freeze({
    "default": "source-switch",
    "empty": "source-switch",
    "error": "source-switch",
    "timeout": "source-switch",
    "loading": "source-switch",
    "rollback": "source-switch",
    "preview": "source-switch",
    "results": "source-switch"
  });

  /** @type {Record<string, string>} state -> state atom */
  const STATE_ATOM = Object.freeze({
    "default": "default",
    "empty": "empty",
    "error": "error",
    "timeout": "timeout",
    "loading": "loading",
    "rollback": "rollback",
    "preview": "preview",
    "results": "results"
  });

  /**
   * 按 schema 命名规则合成 controlId。
   * @param {string} stateKey 状态键（default/empty/error/timeout/loading/rollback/preview/results）
   * @param {string} role 角色（button/option/...）
   * @param {string} discriminator 稳定判别符（语义 slug，不含 hash）
   * @returns {string} canonical controlId
   */
  function composeSourceSwitchControlId(stateKey, role, discriminator) {
    const route = STATE_ROUTE[stateKey] || "source-switch";
    const state = STATE_ATOM[stateKey] || stateKey;
    const family = role === "slider" ? "slider" : "button";
    return `source-switch.${family}.${route}.${state}.phone.${role}.${discriminator}`;
  }

  // ===== 状态变体控件 ID 常量 =====

  // empty 状态
  const EMPTY_CLOSE = composeSourceSwitchControlId("empty", "button", "close-window");
  const EMPTY_RETRY = composeSourceSwitchControlId("empty", "button", "retry-load");
  const EMPTY_RETURN_READER = composeSourceSwitchControlId("empty", "button", "return-reader");

  // error 状态
  const ERROR_CLOSE = composeSourceSwitchControlId("error", "button", "close-window");
  const ERROR_RETRY = composeSourceSwitchControlId("error", "button", "retry-load");
  const ERROR_RETURN_READER = composeSourceSwitchControlId("error", "button", "return-reader");

  // timeout 状态
  const TIMEOUT_CLOSE = composeSourceSwitchControlId("timeout", "button", "close-window");
  const TIMEOUT_RETRY = composeSourceSwitchControlId("timeout", "button", "retry-load");
  const TIMEOUT_RETURN_READER = composeSourceSwitchControlId("timeout", "button", "return-reader");

  // loading 状态
  const LOADING_CLOSE = composeSourceSwitchControlId("loading", "button", "cancel-switch");
  const LOADING_CANCEL = composeSourceSwitchControlId("loading", "button", "cancel-switch");

  // rollback 状态
  const ROLLBACK_CLOSE = composeSourceSwitchControlId("rollback", "button", "close-window");
  const ROLLBACK_RETRY = composeSourceSwitchControlId("rollback", "button", "retry-select");
  const ROLLBACK_RETURN_READER = composeSourceSwitchControlId("rollback", "button", "return-reader");

  // preview 状态
  const PREVIEW_CLOSE = composeSourceSwitchControlId("preview", "button", "return-list");
  const PREVIEW_CONFIRM = composeSourceSwitchControlId("preview", "button", "confirm-switch");
  const PREVIEW_RETURN_LIST = composeSourceSwitchControlId("preview", "button", "return-list");

  // default 状态（flowScreen）的 result action 按钮
  const DEFAULT_PREVIEW = composeSourceSwitchControlId("default", "button", "preview-toc");
  const DEFAULT_CONFIRM = composeSourceSwitchControlId("default", "button", "confirm-switch");
  const DEFAULT_VIEW_FAILED = composeSourceSwitchControlId("results", "button", "view-failed-retry");
  const DEFAULT_VIEW_ROLLBACK = composeSourceSwitchControlId("results", "button", "view-rollback-confirm");

  // ===== UiEvent 映射 =====
  // UiEvent 名来自 contracts/ui-event.schema.json 的 enum。
  // source.switch.* 与 reader.sourceSwitch.* 已冻结。

  /** @type {Record<string, string>} controlId -> canonical UiEvent */
  const UI_EVENTS = Object.freeze({
    // 候选行选择
    [CANDIDATE_ROW_CONTROL_IDS["0"]]: "source.switch.select",
    [CANDIDATE_ROW_CONTROL_IDS["1"]]: "source.switch.select",
    [CANDIDATE_ROW_CONTROL_IDS["2"]]: "source.switch.select",
    [CANDIDATE_ROW_CONTROL_IDS["3"]]: "source.switch.select",
    [CANDIDATE_ROW_CONTROL_IDS["4"]]: "source.switch.select",
    [CANDIDATE_ROW_CONTROL_IDS["5"]]: "source.switch.select",
    [CANDIDATE_ROW_CONTROL_IDS["6"]]: "source.switch.select",
    [CANDIDATE_ROW_CONTROL_IDS["7"]]: "source.switch.select",
    [CANDIDATE_ROW_CONTROL_IDS["8"]]: "source.switch.select",
    [CANDIDATE_ROW_CONTROL_IDS["9"]]: "source.switch.select",
    [CANDIDATE_ROW_CONTROL_IDS["10"]]: "source.switch.select",
    // 关闭换源窗口
    [CLOSE_WINDOW_CONTROL_ID]: "reader.sourceSwitch.close",
    [EMPTY_CLOSE]: "reader.sourceSwitch.close",
    [ERROR_CLOSE]: "reader.sourceSwitch.close",
    [TIMEOUT_CLOSE]: "reader.sourceSwitch.close",
    [ROLLBACK_CLOSE]: "reader.sourceSwitch.close",
    [PREVIEW_CLOSE]: "reader.sourceSwitch.close",
    // 重试加载
    [EMPTY_RETRY]: "source.switch.empty",
    [ERROR_RETRY]: "source.switch.error",
    [TIMEOUT_RETRY]: "source.switch.timeout",
    [ROLLBACK_RETRY]: "source.switch.rollback",
    // 返回阅读
    [EMPTY_RETURN_READER]: "route.replace",
    [ERROR_RETURN_READER]: "route.replace",
    [TIMEOUT_RETURN_READER]: "route.replace",
    [ROLLBACK_RETURN_READER]: "route.replace",
    // 取消切换
    [LOADING_CLOSE]: "source.switch.cancel",
    [LOADING_CANCEL]: "source.switch.cancel",
    // 确认换源
    [PREVIEW_CONFIRM]: "source.switch.confirm",
    [DEFAULT_CONFIRM]: "source.switch.confirm",
    // 预览
    [DEFAULT_PREVIEW]: "source.switch.preview",
    [PREVIEW_RETURN_LIST]: "route.replace",
    // 结果状态查看失败/回滚
    [DEFAULT_VIEW_FAILED]: "source.switch.error",
    [DEFAULT_VIEW_ROLLBACK]: "source.switch.rollback"
  });

  // ===== 业务状态属性 =====
  // 这些 data-* 属性由 renderer 写入，供 interaction 层判定 repeat tap / stale result /
  // reduced-motion 终态。所有属性都是 B4 新增，不破坏既有 data-* 约定。

  /** 当 source-switch 处于异步切换中时设置；interaction 层据此屏蔽 repeat tap */
  const DATA_SOURCE_SWITCH_BUSY = "data-source-switch-busy";

  /** 当结果区已 stale（用户已看过结果但触发了新一次换源）时设置 */
  const DATA_SOURCE_SWITCH_STALE = "data-source-switch-stale";

  /** 当系统 reduced-motion 启用时由 interaction 层回写 */
  const DATA_SOURCE_SWITCH_REDUCED_MOTION = "data-source-switch-reduced-motion";

  /** 当候选行已 stale（不再是当前次刷新的候选）时设置 */
  const DATA_SOURCE_SWITCH_CANDIDATE_STALE = "data-source-switch-candidate-stale";

  /** 候选行稳定终态：selected / unselected / disabled / current */
  const DATA_SOURCE_SWITCH_CANDIDATE_STATE = "data-source-switch-candidate-state";

  // ===== 公共 API =====

  /**
   * 根据 data-source-index 取候选行 controlId。
   * 当 index 超出 registry（>10）时，回退到按 index 合成的稳定 ID，
   * 保证未来 candidate 列表扩展时仍有稳定身份。
   * @param {number|string} index
   * @returns {string}
   */
  function candidateRowControlId(index) {
    const key = String(index);
    if (Object.prototype.hasOwnProperty.call(CANDIDATE_ROW_CONTROL_IDS, key)) {
      return CANDIDATE_ROW_CONTROL_IDS[key];
    }
    // 回退：为扩展候选行合成稳定 ID（不在 A2 registry，符合 schema pattern）
    return composeSourceSwitchControlId("default", "button", `candidate-${key}`);
  }

  /**
   * 根据 controlId 取 canonical UiEvent。
   * 未映射的 controlId 返回 null（不抛错，允许 B1/B2/B3 域有未映射控件）。
   * @param {string} controlId
   * @returns {string|null}
   */
  function uiEventFor(controlId) {
    return Object.prototype.hasOwnProperty.call(UI_EVENTS, controlId)
      ? UI_EVENTS[controlId]
      : null;
  }

  /**
   * 构造 data-control-id + data-ui-event 属性字符串。
   * @param {string} controlId
   * @returns {string} 形如 ` data-control-id="..." data-ui-event="..."`
   */
  function controlIdAttrs(controlId) {
    const event = uiEventFor(controlId);
    return ` data-control-id="${controlId}"${event ? ` data-ui-event="${event}"` : ""}`;
  }

  window.ReaderSourceSwitchControlIds = Object.freeze({
    // 默认状态 registry controlId
    CANDIDATE_ROW_CONTROL_IDS,
    CLOSE_WINDOW_CONTROL_ID,
    // 状态变体合成 controlId
    EMPTY_CLOSE,
    EMPTY_RETRY,
    EMPTY_RETURN_READER,
    ERROR_CLOSE,
    ERROR_RETRY,
    ERROR_RETURN_READER,
    TIMEOUT_CLOSE,
    TIMEOUT_RETRY,
    TIMEOUT_RETURN_READER,
    LOADING_CLOSE,
    LOADING_CANCEL,
    ROLLBACK_CLOSE,
    ROLLBACK_RETRY,
    ROLLBACK_RETURN_READER,
    PREVIEW_CLOSE,
    PREVIEW_CONFIRM,
    PREVIEW_RETURN_LIST,
    DEFAULT_PREVIEW,
    DEFAULT_CONFIRM,
    DEFAULT_VIEW_FAILED,
    DEFAULT_VIEW_ROLLBACK,
    // UiEvent 映射
    UI_EVENTS,
    // 业务状态属性
    DATA_SOURCE_SWITCH_BUSY,
    DATA_SOURCE_SWITCH_STALE,
    DATA_SOURCE_SWITCH_REDUCED_MOTION,
    DATA_SOURCE_SWITCH_CANDIDATE_STALE,
    DATA_SOURCE_SWITCH_CANDIDATE_STATE,
    // helper
    candidateRowControlId,
    uiEventFor,
    controlIdAttrs,
    composeSourceSwitchControlId
  });
})(window);
