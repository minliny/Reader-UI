(function attachReaderMotionController(window) {
  "use strict";

  const DEFAULT_DURATIONS = {
    "app.firstOpen.enter": 280,
    "app.route.push.forward": 160,
    "app.route.pop.backward": 160,
    "app.route.replace": 160,
    "tab.item.press": 80,
    "tab.item.switch": 160,
    "button.press": 80,
    "dropdown.trigger.press": 80,
    "dropdown.menu.expand": 160,
    "dropdown.menu.collapse": 120,
    "reader.entry.coverToImmersive": 240,
    "reader.session.tts.start": 200,
    "reader.session.autoPage.start": 200,
    "reader.session.capsule.control.press/toggle": 120,
    "reader.page.turn.next/prev": 220,
    "viewport.orientation.reshape": 240
  };

  const CONTRACT_VERSION = "reader-motion-contract-v1";
  const COMMON_STATE_FIELDS = ["motionId", "phase", "reducedMotion", "sequence"];
  const COMMON_EVIDENCE = ["frontend-demo/verify/motion/selector-matrix/<motion-id>__<route>__<selector>.webm"];

  const CONTRACT_RULES = [
    {
      prefix: "app.firstOpen.",
      family: "app.launch",
      tokens: ["app.motion.duration.firstOpen"],
      stateFields: ["coldStart", "entryRoute", "hasPlayedFirstOpen"],
      platformComponents: {
        web: "DemoRoot",
        android: "AppMotionHost",
        ios: "AppRootMotionHost",
        harmony: "AppMotionHost"
      },
      evidence: ["frontend-demo/verify/motion/app/app.launch.firstOpen__cold-start.webm"]
    },
    {
      prefix: "app.route.",
      family: "app.route",
      tokens: ["reader.motion.duration.base"],
      stateFields: ["fromRoute", "toRoute", "routeStack", "navigationAction"],
      platformComponents: {
        web: "DemoRouteHost",
        android: "NavHost / route reducer",
        ios: "NavigationStack / route reducer",
        harmony: "Router / route reducer"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "tab.",
      family: "tab",
      tokens: ["app.motion.duration.tabPress", "app.motion.duration.tabSelect", "app.motion.duration.tabSwitch"],
      stateFields: ["activeTab", "previousTab", "pressedTab", "tabGroup"],
      platformComponents: {
        web: "MainTabShell / ReaderModuleNav",
        android: "NavigationBar / TabRow",
        ios: "TabView / segmented controls",
        harmony: "Tabs / segmented controls"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "button.",
      family: "button",
      tokens: ["app.motion.duration.buttonPress", "app.motion.duration.buttonActivate", "app.motion.scale.press"],
      stateFields: ["pressed", "enabled", "loading", "command"],
      platformComponents: {
        web: "button / icon button",
        android: "Button / IconButton",
        ios: "ButtonStyle / PrimitiveButtonStyle",
        harmony: "Button / ImageButton"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "destructive.",
      family: "button.destructive",
      tokens: ["app.motion.duration.buttonPress", "app.motion.duration.buttonActivate", "app.motion.scale.press"],
      stateFields: ["pressed", "confirmationState", "destructiveAction"],
      platformComponents: {
        web: "DangerButton",
        android: "Destructive action Button",
        ios: "Destructive ButtonStyle",
        harmony: "Destructive Button"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "toggle.",
      family: "toggle",
      tokens: ["app.motion.duration.toggleSwitch"],
      stateFields: ["pressed", "checked", "previousChecked", "revertReason"],
      platformComponents: {
        web: "switch / checkbox",
        android: "Switch / Checkbox",
        ios: "Toggle / ToggleStyle",
        harmony: "Toggle / Checkbox"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "chip.",
      family: "chip",
      tokens: ["app.motion.duration.chipSelect"],
      stateFields: ["pressed", "selected", "groupId", "value"],
      platformComponents: {
        web: "chip / filter button",
        android: "FilterChip / AssistChip",
        ios: "custom chip ButtonStyle",
        harmony: "chip button"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "filter.",
      family: "filter",
      tokens: ["app.motion.duration.chipSelect", "app.motion.duration.filterCommit"],
      stateFields: ["filterKey", "selectedValues", "pendingValues", "resultVersion"],
      platformComponents: {
        web: "filter row",
        android: "filter state reducer",
        ios: "filter state reducer",
        harmony: "filter state reducer"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "segment.",
      family: "segment",
      tokens: ["app.motion.duration.tabSwitch", "app.motion.duration.chipSelect"],
      stateFields: ["activeSegment", "previousSegment", "segmentGroup"],
      platformComponents: {
        web: "segmented control",
        android: "SingleChoiceSegmentedButtonRow",
        ios: "Picker(.segmented) / custom segment",
        harmony: "Segmented control"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "dropdown.",
      family: "dropdown",
      tokens: [
        "app.motion.duration.dropdownPress",
        "app.motion.duration.dropdownExpand",
        "app.motion.duration.dropdownCollapse",
        "app.motion.duration.dropdownSelect",
        "app.motion.distance.dropdownY"
      ],
      stateFields: ["anchorId", "openMenuId", "placement", "selectedValue", "focusOwner"],
      platformComponents: {
        web: "anchored menu / popover",
        android: "Popup / DropdownMenu",
        ios: "popover / anchored overlay",
        harmony: "Popup / anchored menu"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "overlay.",
      family: "overlay",
      tokens: ["reader.motion.duration.base", "reader.motion.duration.overlay", "reader.motion.scale.dialogEnter"],
      stateFields: ["overlayType", "open", "focusOwner", "ariaHidden", "inertUnderlay"],
      platformComponents: {
        web: "keyboard / sheet / dialog overlay",
        android: "Dialog / ModalBottomSheet / keyboard insets",
        ios: "sheet / alert / keyboard frame",
        harmony: "Dialog / Sheet / keyboard area"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "input.",
      family: "input",
      tokens: ["app.motion.duration.inputFocus"],
      stateFields: ["focused", "value", "keyboardVisible", "submitState"],
      platformComponents: {
        web: "search input",
        android: "TextField",
        ios: "TextField / FocusState",
        harmony: "TextInput"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "search.",
      family: "search",
      tokens: ["app.motion.duration.searchState"],
      stateFields: ["query", "state", "requestVersion", "resultCount"],
      platformComponents: {
        web: "search result slot",
        android: "AnimatedContent search slot",
        ios: "search state slot",
        harmony: "search result slot"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "feedback.",
      family: "feedback",
      tokens: ["app.motion.duration.feedbackToast", "app.motion.distance.feedbackY"],
      stateFields: ["feedbackId", "message", "kind", "visible"],
      platformComponents: {
        web: "toast host",
        android: "SnackbarHost / toast host",
        ios: "toast overlay host",
        harmony: "toast overlay host"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "state.",
      family: "state",
      tokens: ["app.motion.duration.stateReplace"],
      stateFields: ["stateKey", "stateKind", "contentVersion"],
      platformComponents: {
        web: "state slot",
        android: "AnimatedContent state slot",
        ios: "state slot",
        harmony: "state slot"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "selection.",
      family: "selection",
      tokens: ["app.motion.duration.selectionToolbar", "app.motion.distance.selectionToolbarY"],
      stateFields: ["selectionRange", "toolbarAnchor", "selected", "action"],
      platformComponents: {
        web: "selection layer / batch selection",
        android: "selection overlay / selectable row",
        ios: "selection overlay / selectable row",
        harmony: "selection overlay / selectable row"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "slider.",
      family: "slider",
      tokens: ["app.motion.duration.numericCommit"],
      stateFields: ["dragging", "temporaryValue", "committedValue", "min", "max"],
      platformComponents: {
        web: "slider / progress rail",
        android: "Slider",
        ios: "Slider / DragGesture",
        harmony: "Slider"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "stepper.",
      family: "stepper",
      tokens: ["app.motion.duration.numericCommit"],
      stateFields: ["pressedStep", "value", "min", "max", "repeatActive"],
      platformComponents: {
        web: "stepper buttons",
        android: "IconButton stepper",
        ios: "Button stepper",
        harmony: "Button stepper"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "progress.",
      family: "progress",
      tokens: ["app.motion.duration.numericCommit"],
      stateFields: ["value", "previousValue", "min", "max"],
      platformComponents: {
        web: "progress meter",
        android: "LinearProgressIndicator",
        ios: "ProgressView / custom progress",
        harmony: "Progress"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "listRow.",
      family: "listRow",
      tokens: ["app.motion.duration.buttonPress", "app.motion.duration.chipSelect"],
      stateFields: ["pressed", "selected", "rowId", "routeTarget"],
      platformComponents: {
        web: "list row",
        android: "LazyColumn item",
        ios: "List / LazyVStack row",
        harmony: "List item"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "card.",
      family: "card",
      tokens: ["app.motion.duration.buttonPress", "app.motion.scale.press"],
      stateFields: ["pressed", "selected", "cardId", "routeTarget"],
      platformComponents: {
        web: "card",
        android: "Lazy grid/list card",
        ios: "card ButtonStyle",
        harmony: "card item"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "bookshelf.",
      family: "bookshelf",
      tokens: ["app.motion.duration.stateReplace"],
      stateFields: ["viewMode", "previousViewMode", "scrollAnchor"],
      platformComponents: {
        web: "bookshelf view host",
        android: "Lazy grid/list host",
        ios: "Grid/List host",
        harmony: "Grid/List host"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "reader.entry.",
      family: "reader.entry",
      tokens: ["reader.motion.duration.readerEntry", "reader.motion.distance.readerEntryY", "reader.motion.scale.coverPress"],
      stateFields: ["sourceRoute", "targetRoute", "coverRect", "readerContext"],
      platformComponents: {
        web: "book cover / reader surface",
        android: "ReaderEntryMotionHost",
        ios: "ReaderEntryMotionHost",
        harmony: "ReaderEntryMotionHost"
      },
      evidence: ["frontend-demo/verify/motion/reader/reader.entry.coverToImmersive__bookshelf__cover.webm"]
    },
    {
      prefix: "reader.control.",
      family: "reader.control",
      tokens: ["reader.motion.duration.panel", "reader.motion.duration.handleSnap", "reader.motion.distance.handlePullY"],
      stateFields: ["controlLayerOpen", "handlePressed", "dragOffset", "dockOffset", "viewportClass"],
      platformComponents: {
        web: "ReaderControlDock",
        android: "ReaderControlDock",
        ios: "ReaderControlDock",
        harmony: "ReaderControlDock"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "reader.module.",
      family: "reader.module",
      tokens: ["reader.motion.duration.panel", "app.motion.duration.tabSwitch"],
      stateFields: ["activeModule", "previousModule", "readerContext"],
      platformComponents: {
        web: "ReaderModuleNav",
        android: "ReaderModuleNav",
        ios: "ReaderModuleNav",
        harmony: "ReaderModuleNav"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "reader.quick.",
      family: "reader.quick",
      tokens: ["reader.motion.duration.panel"],
      stateFields: ["quickAction", "targetPanel", "loadingState"],
      platformComponents: {
        web: "ReaderQuickAction",
        android: "ReaderQuickAction",
        ios: "ReaderQuickAction",
        harmony: "ReaderQuickAction"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "reader.session.",
      family: "reader.session",
      tokens: [
        "reader.motion.duration.sessionReturn",
        "reader.motion.duration.capsuleEnter",
        "reader.motion.duration.capsuleControl",
        "reader.motion.duration.capsuleTick",
        "reader.motion.duration.voicePulse",
        "reader.motion.distance.capsuleY",
        "reader.motion.scale.capsuleEnter"
      ],
      stateFields: ["activeSession", "playing", "countdown", "capsuleType", "sourceRoute", "targetRoute"],
      platformComponents: {
        web: "ReaderSessionCapsule",
        android: "ReaderSessionCapsule / ActiveSessionState",
        ios: "ReaderSessionCapsule / ActiveSessionState",
        harmony: "ReaderSessionCapsule / ActiveSessionState"
      },
      evidence: ["frontend-demo/verify/motion/reader/<motion-id>__immersive-reading__session.webm"]
    },
    {
      prefix: "reader.page.",
      family: "reader.page",
      tokens: ["reader.motion.duration.pageTurn", "reader.motion.distance.pageTurnX"],
      stateFields: ["pageIndex", "previousPageIndex", "pageCount", "turnDirection"],
      platformComponents: {
        web: "ReaderPageSurface",
        android: "ReaderPageSurface",
        ios: "ReaderPageSurface",
        harmony: "ReaderPageSurface"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "reader.chapter.",
      family: "reader.chapter",
      tokens: ["app.motion.duration.stateReplace"],
      stateFields: ["chapterIndex", "previousChapterIndex", "progressAnchor"],
      platformComponents: {
        web: "ReaderChapterState",
        android: "ReaderChapterState",
        ios: "ReaderChapterState",
        harmony: "ReaderChapterState"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "reader.sourceSwitch.",
      family: "reader.sourceSwitch",
      tokens: ["reader.motion.duration.overlay", "reader.motion.distance.readerEntryY"],
      stateFields: ["sourceRoute", "targetSource", "readerContext", "overlayOpen"],
      platformComponents: {
        web: "ReaderSourceSwitchOverlay",
        android: "Reader inline source switch overlay",
        ios: "Reader inline source switch overlay",
        harmony: "Reader inline source switch overlay"
      },
      evidence: COMMON_EVIDENCE
    },
    {
      prefix: "viewport.",
      family: "viewport",
      tokens: [
        "reader.motion.duration.orientationFreeze",
        "reader.motion.duration.viewportReshape",
        "reader.motion.duration.orientationSettle",
        "reader.motion.distance.orientationPanelY"
      ],
      stateFields: ["viewportClass", "orientation", "readerAnchor", "overlayAnchor", "dockOffset"],
      platformComponents: {
        web: "ViewportMotionAdapter",
        android: "WindowSizeClass / fold posture adapter",
        ios: "Geometry / size class adapter",
        harmony: "Window metrics / fold adapter"
      },
      evidence: ["frontend-demo/verify/motion/viewport/<motion-id>__<viewport-class>__<route>.webm"]
    },
    {
      prefix: "tooling.",
      family: "tooling",
      tokens: ["reader.motion.duration.instant"],
      stateFields: ["toolingMode", "previousToolingMode"],
      platformComponents: {
        web: "DemoToolbar",
        android: "debug only",
        ios: "debug only",
        harmony: "debug only"
      },
      evidence: ["frontend-demo/verify/motion/tooling/<motion-id>.webm"]
    }
  ];

  const PREFIX_DURATIONS = [
    ["button.", 80],
    ["tab.", 120],
    ["dropdown.", 160],
    ["overlay.", 160],
    ["toggle.", 140],
    ["slider.", 120],
    ["reader.entry.", 240],
    ["reader.session.", 180],
    ["reader.control.", 160],
    ["reader.page.", 220],
    ["viewport.", 240],
    ["app.route.", 160]
  ];

  function contractFor(id) {
    const cleanId = clean(id);
    const rule = CONTRACT_RULES.find((item) => cleanId.startsWith(item.prefix));
    if (!rule) return null;
    return Object.freeze({
      id: cleanId,
      family: rule.family,
      tokens: Object.freeze(rule.tokens.slice()),
      stateFields: Object.freeze(COMMON_STATE_FIELDS.concat(rule.stateFields)),
      platformComponents: Object.freeze(Object.assign({}, rule.platformComponents)),
      evidence: Object.freeze(rule.evidence.slice())
    });
  }

  function clean(value) {
    return String(value == null ? "" : value)
      .replace(/[^\w./:-]/g, "")
      .slice(0, 96);
  }

  function setAttr(element, name, value) {
    if (!element) return;
    if (value == null || value === "") {
      element.removeAttribute(name);
      return;
    }
    element.setAttribute(name, clean(value));
  }

  function reducedFrom(root, override) {
    if (override != null) return Boolean(override);
    if (root && root.getAttribute("data-motion-reduced") === "true") return true;
    try {
      return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (error) {
      return false;
    }
  }

  function durationFor(id, explicitDuration, reduced) {
    if (reduced) return 0;
    if (Number.isFinite(Number(explicitDuration))) {
      return Math.max(0, Number(explicitDuration));
    }
    if (Object.prototype.hasOwnProperty.call(DEFAULT_DURATIONS, id)) {
      return DEFAULT_DURATIONS[id];
    }
    const matchedPrefix = PREFIX_DURATIONS.find(([prefix]) => id.startsWith(prefix));
    return matchedPrefix ? matchedPrefix[1] : 120;
  }

  function create(options) {
    const config = options || {};
    const root = config.root || null;
    const events = [];
    let active = null;
    let sequence = 0;
    let reducedOverride = config.reducedMotion;

    if (root) {
      root.setAttribute("data-motion-controller", "ready");
    }

    const dispatch = (type, transaction, extra) => {
      const event = Object.assign({
        type,
        id: transaction.id,
        action: transaction.action,
        phase: transaction.phase,
        from: transaction.from,
        to: transaction.to,
        reducedMotion: transaction.reducedMotion,
        sequence: transaction.sequence,
        timestamp: Math.round(window.performance && window.performance.now ? window.performance.now() : Date.now())
      }, extra || {});
      events.push(event);
      if (events.length > 120) {
        events.shift();
      }
      window.__readerMotionAuditLog = events.slice();
      if (root && typeof root.dispatchEvent === "function" && typeof window.CustomEvent === "function") {
        root.dispatchEvent(new window.CustomEvent("reader-motion", { detail: event }));
      }
    };

    const writeRootState = (transaction) => {
      if (!root || !transaction) return;
      setAttr(root, "data-motion-active-id", transaction.id);
      setAttr(root, "data-motion-phase", transaction.phase);
      setAttr(root, "data-motion-action", transaction.action);
      setAttr(root, "data-motion-from", transaction.from);
      setAttr(root, "data-motion-to", transaction.to);
      root.setAttribute("data-motion-reduced-active", transaction.reducedMotion ? "true" : "false");
    };

    const clearTargetState = (transaction) => {
      if (!transaction || !transaction.target) return;
      transaction.target.removeAttribute("data-motion-phase");
      transaction.target.removeAttribute("data-motion-sequence");
      transaction.target.removeAttribute("data-motion-family");
    };

    const settle = (transaction, reason) => {
      const target = transaction || active;
      if (!target || target.phase === "settled") return target;
      if (target.timer) {
        window.clearTimeout(target.timer);
        target.timer = null;
      }
      target.phase = "settled";
      target.reason = reason || "complete";
      clearTargetState(target);
      if (root) {
        setAttr(root, "data-motion-last-id", target.id);
        setAttr(root, "data-motion-active-id", "");
        setAttr(root, "data-motion-phase", "settled");
        setAttr(root, "data-motion-action", "");
        setAttr(root, "data-motion-from", "");
        setAttr(root, "data-motion-to", "");
      }
      if (active && active.sequence === target.sequence) {
        active = null;
      }
      dispatch("settle", target, { reason: target.reason });
      return target;
    };

    const interrupt = (reason) => {
      if (!active) return null;
      const target = active;
      if (target.timer) {
        window.clearTimeout(target.timer);
        target.timer = null;
      }
      target.phase = "interrupted";
      target.reason = reason || "interrupted";
      clearTargetState(target);
      writeRootState(target);
      dispatch("interrupt", target, { reason: target.reason });
      active = null;
      return target;
    };

    const start = (input) => {
      const details = input || {};
      const id = clean(details.id || "motion.unknown");
      if (active) {
        interrupt(details.interruptReason || "superseded");
      }
      const reducedMotion = reducedFrom(root, details.reducedMotion != null ? details.reducedMotion : reducedOverride);
      const transaction = {
        id,
        contract: contractFor(id),
        action: clean(details.action || id),
        from: clean(details.from || ""),
        to: clean(details.to || ""),
        phase: "running",
        target: details.target || null,
        reducedMotion,
        duration: durationFor(id, details.duration, reducedMotion),
        sequence: ++sequence,
        timer: null
      };
      active = transaction;
      writeRootState(transaction);
      if (transaction.target) {
        transaction.target.setAttribute("data-motion-phase", "running");
        transaction.target.setAttribute("data-motion-sequence", String(transaction.sequence));
        if (transaction.contract) {
          transaction.target.setAttribute("data-motion-family", transaction.contract.family);
        }
      }
      dispatch("start", transaction, {
        family: transaction.contract ? transaction.contract.family : "",
        unresolvedContract: transaction.contract ? "false" : "true"
      });
      if (transaction.duration === 0) {
        settle(transaction, "reduced-motion");
      } else {
        transaction.timer = window.setTimeout(() => settle(transaction, "complete"), transaction.duration);
      }
      return transaction;
    };

    const update = (patch) => {
      if (!active) return null;
      Object.assign(active, patch || {});
      writeRootState(active);
      dispatch("update", active);
      return active;
    };

    return {
      start,
      update,
      interrupt,
      settle,
      setReducedMotion(value) {
        reducedOverride = value == null ? null : Boolean(value);
      },
      getSnapshot() {
        return {
          active: active ? Object.assign({}, active, { target: undefined, timer: undefined }) : null,
          events: events.slice()
        };
      },
      destroy() {
        interrupt("destroy");
        if (root) {
          root.removeAttribute("data-motion-controller");
          root.removeAttribute("data-motion-active-id");
          root.removeAttribute("data-motion-phase");
          root.removeAttribute("data-motion-action");
          root.removeAttribute("data-motion-from");
          root.removeAttribute("data-motion-to");
          root.removeAttribute("data-motion-reduced-active");
        }
      }
    };
  }

  window.ReaderMotionController = {
    create,
    contractFor,
    CONTRACT: Object.freeze({
      version: CONTRACT_VERSION,
      rules: Object.freeze(CONTRACT_RULES.map((rule) => Object.freeze(Object.assign({}, rule, {
        tokens: Object.freeze(rule.tokens.slice()),
        stateFields: Object.freeze(COMMON_STATE_FIELDS.concat(rule.stateFields)),
        evidence: Object.freeze(rule.evidence.slice()),
        platformComponents: Object.freeze(Object.assign({}, rule.platformComponents))
      }))))
    }),
    DEFAULT_DURATIONS: Object.freeze(Object.assign({}, DEFAULT_DURATIONS))
  };
})(window);
