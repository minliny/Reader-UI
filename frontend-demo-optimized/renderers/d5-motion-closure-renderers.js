/**
 * D5 动作与动效闭环 renderer 函数模块
 * ------------------------------------------------------------------------
 * 职责：为 Reader-UI Demo 提供动效闭环运行时辅助：
 *   1. 93 个 MotionId 的运行时元数据（layer / category / implementationKind）
 *   2. reduced-motion 降级策略（zeroDuration / keepDirectManipulation / noMotion）
 *   3. 打断策略处理（redirect / cancel / completeThenReplace / updateInSameHost）
 *   4. stale-result guard（防止过期异步动效结果覆盖最新状态）
 *   5. 焦点恢复追踪（overlay/dialog/dropdown 关闭后恢复焦点）
 *   6. 动效补齐清单覆盖（首次打开 / Tab / Dropdown / 封面进入 / 控制层 /
 *      小横条 / 平板 dock / 模块切换 / TTS 胶囊 / overlay 打断 / 旋转 resize /
 *      reduced motion / 焦点恢复）
 *
 * 集成方式：模块化加载模式
 *   - index.html 通过 <script> 加载（在 d4-visual-polish-renderers.js 之后）
 *   - 挂载到 window.ReaderD5MotionClosureRenderers
 *   - render-runtime.js 通过 dispatch hook 在 switch 之前分发
 *
 * 注意：本模块不重复 motion.schema.json 中的定义，而是提供运行时使用的辅助。
 * MotionId 删除带 `/` 的版本后，三端 codegen 不再产生重复 case 名。
 * ------------------------------------------------------------------------
 */
(function attachReaderD5MotionClosureRenderers(window) {
  "use strict";

  // ===========================================================================
  // D5 动效状态
  // ===========================================================================

  var d5MotionState = {
    reducedMotion: false,         // 是否启用 reduced motion
    currentAnimation: null,       // 当前动画 ID
    interruptPolicy: "redirect",  // 打断策略
    activeSequence: 0,            // 当前动效序列号
    focusRestoreTarget: null      // 焦点恢复目标
  };

  // ===========================================================================
  // 动效运行时元数据（93 个 MotionId）
  // 来源：contracts/motion.schema.json + contracts/fixtures/motion.fixtures.json
  // 删除 3 个带 `/` 的 MotionId 后总数从 96 降为 93。
  // ===========================================================================

  var MOTION_RUNTIME = {
    // --- app 层：首次打开 + 路由切换 ---
    "app.firstOpen.enter":                 { layer: "app",        category: "enter",    implementationKind: "routeTransition" },
    "app.route.push.forward":              { layer: "app",        category: "push",     implementationKind: "routeTransition" },
    "app.route.pop.backward":              { layer: "app",        category: "pop",      implementationKind: "routeTransition" },
    "app.route.replace":                   { layer: "app",        category: "replace",  implementationKind: "routeTransition" },

    // --- bookshelf 视图切换 ---
    "bookshelf.view.switch":               { layer: "bookshelf",  category: "switch",   implementationKind: "tabTransition" },

    // --- button / card / chip 反馈 ---
    "button.activate":                     { layer: "component",  category: "activate", implementationKind: "componentFeedback" },
    "card.press":                          { layer: "component",  category: "press",    implementationKind: "componentFeedback" },
    "card.select":                         { layer: "component",  category: "select",   implementationKind: "componentFeedback" },
    "card.route":                          { layer: "component",  category: "route",    implementationKind: "routeTransition" },
    "chip.item.select":                    { layer: "component",  category: "select",   implementationKind: "componentFeedback" },

    // --- 破坏性确认 ---
    "destructive.confirm.commit":          { layer: "component",  category: "commit",   implementationKind: "componentFeedback" },

    // --- dropdown 菜单 ---
    "dropdown.menu.collapse":              { layer: "dropdown",   category: "exit",     implementationKind: "overlayTransition" },
    "dropdown.menu.expand":                { layer: "dropdown",   category: "enter",    implementationKind: "overlayTransition" },
    "dropdown.menu.reposition":            { layer: "dropdown",   category: "update",   implementationKind: "overlayTransition" },
    "dropdown.option.press":               { layer: "dropdown",   category: "press",    implementationKind: "componentFeedback" },
    "dropdown.option.select":              { layer: "dropdown",   category: "select",   implementationKind: "overlayTransition" },
    "dropdown.trigger.press":              { layer: "dropdown",   category: "press",    implementationKind: "componentFeedback" },

    // --- feedback toast ---
    "feedback.toast.enter":                { layer: "feedback",   category: "enter",    implementationKind: "overlayTransition" },
    "feedback.toast.update":               { layer: "feedback",   category: "update",   implementationKind: "overlayTransition" },
    "feedback.toast.exit":                 { layer: "feedback",   category: "exit",     implementationKind: "overlayTransition" },

    // --- filter ---
    "filter.apply.commit":                 { layer: "filter",     category: "commit",   implementationKind: "componentFeedback" },
    "filter.item.toggle":                  { layer: "filter",     category: "toggle",   implementationKind: "componentFeedback" },

    // --- input ---
    "input.blur":                          { layer: "input",      category: "blur",     implementationKind: "componentFeedback" },
    "input.clear":                         { layer: "input",      category: "clear",    implementationKind: "componentFeedback" },
    "input.focus":                         { layer: "input",      category: "focus",    implementationKind: "componentFeedback" },
    "input.focus-blur":                    { layer: "input",      category: "focus",    implementationKind: "componentFeedback" },
    "input.submit":                        { layer: "input",      category: "submit",   implementationKind: "stateReplace" },

    // --- list row ---
    "listRow.select":                      { layer: "component",  category: "select",   implementationKind: "componentFeedback" },

    // --- motion interrupt（overlay 连续打断）---
    "motion.interrupt.cancel":             { layer: "interrupt",  category: "cancel",   implementationKind: "componentFeedback" },
    "motion.interrupt.completeThenReplace":{ layer: "interrupt",  category: "replace",  implementationKind: "componentFeedback" },
    "motion.interrupt.redirect":           { layer: "interrupt",  category: "redirect", implementationKind: "componentFeedback" },

    // --- overlay dialog / sheet / keyboard ---
    "overlay.dialog.enter":                { layer: "overlay",    category: "enter",    implementationKind: "overlayTransition" },
    "overlay.dialog.enter-exit":           { layer: "overlay",    category: "enter",    implementationKind: "overlayTransition" },
    "overlay.dialog.exit":                 { layer: "overlay",    category: "exit",     implementationKind: "overlayTransition" },
    "overlay.keyboard.enter-exit":         { layer: "overlay",    category: "enter",    implementationKind: "overlayTransition" },
    "overlay.sheet.enter":                 { layer: "overlay",    category: "enter",    implementationKind: "overlayTransition" },
    "overlay.sheet.enter-exit":            { layer: "overlay",    category: "enter",    implementationKind: "overlayTransition" },
    "overlay.sheet.exit":                  { layer: "overlay",    category: "exit",     implementationKind: "overlayTransition" },

    // --- reader chapter ---
    "reader.chapter.jump":                 { layer: "reader",     category: "jump",     implementationKind: "readerPageTurn" },

    // --- reader control dock（平板 dock）---
    "reader.control.dock.drag":            { layer: "reader",     category: "drag",     implementationKind: "directManipulation" },
    "reader.control.dock.longPress":       { layer: "reader",     category: "press",    implementationKind: "directManipulation" },
    "reader.control.dock.rebound":         { layer: "reader",     category: "settle",   implementationKind: "directManipulation" },
    "reader.control.dock.release":         { layer: "reader",     category: "release",  implementationKind: "directManipulation" },

    // --- reader control handle（小横条拖动）---
    "reader.control.handle.drag":          { layer: "reader",     category: "drag",     implementationKind: "directManipulation" },
    "reader.control.handle.press":         { layer: "reader",     category: "press",    implementationKind: "directManipulation" },
    "reader.control.handle.release":       { layer: "reader",     category: "release",  implementationKind: "directManipulation" },

    // --- reader control 显隐 ---
    "reader.control.hide":                 { layer: "reader",     category: "hide",     implementationKind: "readerEntry" },
    "reader.control.show":                 { layer: "reader",     category: "show",     implementationKind: "readerEntry" },

    // --- reader entry（封面进入阅读）---
    "reader.entry.actionToImmersive":      { layer: "reader",     category: "enter",    implementationKind: "readerEntry" },
    "reader.entry.coverToImmersive":       { layer: "reader",     category: "enter",    implementationKind: "readerEntry" },

    // --- reader module switch ---
    "reader.module.switch":                { layer: "reader",     category: "switch",   implementationKind: "readerEntry" },

    // --- reader page turn ---
    "reader.page.turn.next-prev":          { layer: "reader",     category: "turn",     implementationKind: "readerPageTurn" },

    // --- reader quick promote ---
    "reader.quick.promote":                { layer: "reader",     category: "promote",  implementationKind: "componentFeedback" },

    // --- reader session autoPage / tts ---
    "reader.session.autoPage.start":       { layer: "session",    category: "enter",    implementationKind: "sessionCapsule" },
    "reader.session.tts.start":            { layer: "session",    category: "enter",    implementationKind: "sessionCapsule" },

    // --- reader session capsule（TTS/自动翻页胶囊）---
    "reader.session.capsule.enter":        { layer: "session",    category: "enter",    implementationKind: "sessionCapsule" },
    "reader.session.capsule.update":       { layer: "session",    category: "update",   implementationKind: "sessionCapsule" },
    "reader.session.capsule.exit":         { layer: "session",    category: "exit",     implementationKind: "sessionCapsule" },
    "reader.session.capsule.switch":       { layer: "session",    category: "switch",   implementationKind: "sessionCapsule" },
    "reader.session.capsule.control.press-toggle": { layer: "session", category: "toggle", implementationKind: "sessionCapsule" },
    "reader.session.capsule.countdownTick":{ layer: "session",    category: "tick",     implementationKind: "sessionCapsule" },
    "reader.session.capsule.voiceIcon.active": { layer: "session", category: "active",   implementationKind: "sessionCapsule" },

    // --- reader session controlSpace ---
    "reader.session.controlSpace.enter":   { layer: "session",    category: "enter",    implementationKind: "sessionCapsule" },
    "reader.session.controlSpace.update":  { layer: "session",    category: "update",   implementationKind: "sessionCapsule" },
    "reader.session.controlSpace.exit":    { layer: "session",    category: "exit",     implementationKind: "sessionCapsule" },

    // --- reader sourceSwitch（deprecated）---
    "reader.sourceSwitch.open-close":      { layer: "reader",     category: "enter",    implementationKind: "overlayTransition" },

    // --- source switch route ---
    "source.switch.route.push":            { layer: "source",     category: "push",     implementationKind: "routeTransition" },
    "source.switch.route.pop":             { layer: "source",     category: "pop",      implementationKind: "routeTransition" },
    "source.switch.route.replace":         { layer: "source",     category: "replace",  implementationKind: "routeTransition" },

    // --- search ---
    "search.state.replace":                { layer: "search",     category: "replace",  implementationKind: "stateReplace" },

    // --- segment ---
    "segment.item.switch":                 { layer: "segment",    category: "switch",   implementationKind: "tabTransition" },

    // --- selection ---
    "selection.group.toggle":              { layer: "selection",  category: "toggle",   implementationKind: "componentFeedback" },
    "selection.item.toggle":               { layer: "selection",  category: "toggle",   implementationKind: "componentFeedback" },
    "selection.option.toggle":             { layer: "selection",  category: "toggle",   implementationKind: "componentFeedback" },
    "selection.range.show":                { layer: "selection",  category: "show",     implementationKind: "overlayTransition" },
    "selection.toolbar.action":            { layer: "selection",  category: "action",   implementationKind: "componentFeedback" },
    "selection.toolbar.exit":              { layer: "selection",  category: "exit",     implementationKind: "overlayTransition" },

    // --- slider drag ---
    "slider.drag.start":                   { layer: "slider",     category: "dragStart",  implementationKind: "directManipulation" },
    "slider.drag.update":                  { layer: "slider",     category: "dragUpdate", implementationKind: "directManipulation" },
    "slider.drag.release":                 { layer: "slider",     category: "dragRelease",implementationKind: "directManipulation" },

    // --- state replace / loading ---
    "state.content.replace":               { layer: "state",      category: "replace",  implementationKind: "stateReplace" },
    "state.loading.inline":                { layer: "state",      category: "loading",  implementationKind: "stateReplace" },

    // --- stepper ---
    "stepper.press":                       { layer: "component",  category: "press",    implementationKind: "componentFeedback" },
    "stepper.value.change":                { layer: "component",  category: "change",   implementationKind: "componentFeedback" },

    // --- tab 交互 ---
    "tab.item.press":                      { layer: "tab",        category: "press",    implementationKind: "componentFeedback" },
    "tab.item.select":                     { layer: "tab",        category: "select",   implementationKind: "tabTransition" },
    "tab.item.switch":                     { layer: "tab",        category: "switch",   implementationKind: "tabTransition" },
    "tab.switch":                          { layer: "tab",        category: "switch",   implementationKind: "tabTransition" },

    // --- toggle ---
    "toggle.switch":                       { layer: "component",  category: "switch",   implementationKind: "componentFeedback" },

    // --- tooling mode ---
    "tooling.mode.switch":                 { layer: "tooling",    category: "switch",   implementationKind: "tabTransition" },

    // --- viewport 旋转/resize ---
    "viewport.orientation.prepare":        { layer: "viewport",   category: "reshape",  implementationKind: "orientationReshape" },
    "viewport.orientation.reshape":        { layer: "viewport",   category: "reshape",  implementationKind: "orientationReshape" },
    "viewport.orientation.settle":         { layer: "viewport",   category: "settle",   implementationKind: "orientationReshape" }
  };

  // reduced-motion 降级策略映射（按 implementationKind）
  var REDUCED_MOTION_BY_KIND = {
    directManipulation: "keepDirectManipulation",  // 手势跟随不可降级
    routeTransition: "zeroDuration",
    tabTransition: "zeroDuration",
    overlayTransition: "zeroDuration",
    stateReplace: "zeroDuration",
    readerEntry: "zeroDuration",
    readerPageTurn: "zeroDuration",
    sessionCapsule: "zeroDuration",
    orientationReshape: "zeroDuration",
    componentFeedback: "zeroDuration"
  };

  // ===========================================================================
  // reduced motion 降级
  // ===========================================================================

  function applyReducedMotion(motionId) {
    if (!d5MotionState.reducedMotion) return null;
    var meta = MOTION_RUNTIME[motionId];
    if (!meta) return { duration: 0, easing: "none" };
    var policy = REDUCED_MOTION_BY_KIND[meta.implementationKind] || "zeroDuration";
    if (policy === "keepDirectManipulation") {
      // 手势跟随不可降级，保持原样
      return { duration: "keep", easing: "keep", policy: "keepDirectManipulation" };
    }
    // zeroDuration：时长归零
    return { duration: 0, easing: "none", policy: policy };
  }

  // ===========================================================================
  // 打断处理
  // ===========================================================================

  function handleInterrupt(currentAnim, newAnim, policy) {
    var effectivePolicy = policy || d5MotionState.interruptPolicy;
    switch (effectivePolicy) {
      case "redirect":
        // 新动效接管，取消当前
        d5MotionState.currentAnimation = newAnim;
        return { action: "cancelCurrent", startNew: true };
      case "cancel":
        // 取消当前，不启动新的
        d5MotionState.currentAnimation = null;
        return { action: "cancelCurrent", startNew: false };
      case "completeThenReplace":
        // 完成当前后替换
        return { action: "completeCurrent", startNew: true };
      case "updateInSameHost":
        // 同宿主原地更新
        d5MotionState.currentAnimation = newAnim;
        return { action: "updateInPlace", startNew: false };
      default:
        d5MotionState.currentAnimation = newAnim;
        return { action: "cancelCurrent", startNew: true };
    }
  }

  // ===========================================================================
  // stale-result guard（防止过期异步动效结果覆盖最新状态）
  // ===========================================================================

  function createStaleResultGuard() {
    var sequence = 0;
    return {
      next: function() { return ++sequence; },
      isStale: function(token) { return token !== sequence; },
      current: function() { return sequence; }
    };
  }

  // ===========================================================================
  // 焦点恢复追踪
  // ===========================================================================

  function trackFocusRestore(element) {
    if (!element) {
      d5MotionState.focusRestoreTarget = null;
      return null;
    }
    d5MotionState.focusRestoreTarget = {
      element: element,
      tagName: element.tagName,
      timestamp: Date.now()
    };
    return d5MotionState.focusRestoreTarget;
  }

  function restoreFocus() {
    var target = d5MotionState.focusRestoreTarget;
    if (!target || !target.element) return false;
    try {
      if (typeof target.element.focus === "function") {
        target.element.focus();
        d5MotionState.focusRestoreTarget = null;
        return true;
      }
    } catch (e) {
      // 元素可能已从 DOM 中移除
    }
    d5MotionState.focusRestoreTarget = null;
    return false;
  }

  // ===========================================================================
  // 动效元数据查询辅助
  // ===========================================================================

  function getMotionMeta(motionId) {
    return MOTION_RUNTIME[motionId] || null;
  }

  function getAllMotionIds() {
    return Object.keys(MOTION_RUNTIME);
  }

  function getMotionIdsByLayer(layer) {
    return Object.keys(MOTION_RUNTIME).filter(function(id) {
      return MOTION_RUNTIME[id].layer === layer;
    });
  }

  function getMotionIdsByCategory(category) {
    return Object.keys(MOTION_RUNTIME).filter(function(id) {
      return MOTION_RUNTIME[id].category === category;
    });
  }

  // ===========================================================================
  // 动效补齐清单覆盖检查
  // ===========================================================================

  var MOTION_CLOSURE_CHECKLIST = {
    "firstOpen": ["app.firstOpen.enter"],
    "tabInteraction": ["tab.item.press", "tab.item.select", "tab.item.switch", "tab.switch"],
    "dropdown": ["dropdown.menu.expand", "dropdown.menu.collapse"],
    "coverToImmersive": ["reader.entry.coverToImmersive", "reader.entry.actionToImmersive"],
    "controlShowHide": ["reader.control.show", "reader.control.hide"],
    "handleDrag": ["reader.control.handle.drag", "reader.control.handle.press", "reader.control.handle.release"],
    "dockDrag": ["reader.control.dock.drag", "reader.control.dock.longPress", "reader.control.dock.rebound", "reader.control.dock.release"],
    "moduleSwitch": ["reader.module.switch"],
    "sessionCapsule": ["reader.session.capsule.enter", "reader.session.capsule.update", "reader.session.capsule.exit", "reader.session.capsule.switch", "reader.session.capsule.countdownTick"],
    "overlayInterrupt": ["motion.interrupt.cancel", "motion.interrupt.redirect", "motion.interrupt.completeThenReplace"],
    "viewportReshape": ["viewport.orientation.prepare", "viewport.orientation.reshape", "viewport.orientation.settle"]
  };

  function verifyClosureChecklist() {
    var missing = [];
    Object.keys(MOTION_CLOSURE_CHECKLIST).forEach(function(group) {
      MOTION_CLOSURE_CHECKLIST[group].forEach(function(motionId) {
        if (!MOTION_RUNTIME[motionId]) {
          missing.push({ group: group, motionId: motionId });
        }
      });
    });
    return { passed: missing.length === 0, missing: missing };
  }

  // ===========================================================================
  // 路由集成映射
  // ===========================================================================

  var INTEGRATION_MAP = {
    // D5 动效闭环不接管真实路由渲染，仅提供运行时辅助
    // 真实路由由 W2/D3/D4 等模块处理，此处返回 null 不破坏现有渲染
  };

  function renderD5Route(route, data, appState) {
    var fnName = INTEGRATION_MAP[route];
    if (!fnName) return null;
    var fn = d5Exports[fnName];
    if (typeof fn !== "function") return null;
    return fn(data, appState);
  }

  // ===========================================================================
  // 暴露 API
  // ===========================================================================

  var d5Exports = {
    // 路由分发主入口
    renderD5Route: renderD5Route,
    // 集成映射
    INTEGRATION_MAP: INTEGRATION_MAP,
    // D5 动效状态
    state: d5MotionState,
    // 93 个 MotionId 运行时元数据
    MOTION_RUNTIME: MOTION_RUNTIME,
    // reduced-motion 降级策略映射
    REDUCED_MOTION_BY_KIND: REDUCED_MOTION_BY_KIND,
    // 动效补齐清单
    MOTION_CLOSURE_CHECKLIST: MOTION_CLOSURE_CHECKLIST,
    // reduced motion 降级
    applyReducedMotion: applyReducedMotion,
    // 打断处理
    handleInterrupt: handleInterrupt,
    // stale-result guard
    createStaleResultGuard: createStaleResultGuard,
    // 焦点恢复
    trackFocusRestore: trackFocusRestore,
    restoreFocus: restoreFocus,
    // 元数据查询
    getMotionMeta: getMotionMeta,
    getAllMotionIds: getAllMotionIds,
    getMotionIdsByLayer: getMotionIdsByLayer,
    getMotionIdsByCategory: getMotionIdsByCategory,
    // 补齐清单验证
    verifyClosureChecklist: verifyClosureChecklist
  };

  window.ReaderD5MotionClosureRenderers = d5Exports;
})(window);
