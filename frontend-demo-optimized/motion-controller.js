(function attachReaderMotionController(window) {
  "use strict";

  const DEFAULT_DURATIONS = {
    "app.firstOpen.enter": 280,
    "app.route.push.forward": 160,
    "app.route.pop.backward": 160,
    "app.route.replace": 160,
    "bookshelf.view.switch": 320,
    "button.activate": 120,
    "toggle.switch": 140,
    "chip.item.select": 120,
    "slider.drag.start": 0,
    "slider.drag.update": 0,
    "slider.drag.release": 120,
    "stepper.press": 80,
    "stepper.value.change": 120,
    "card.press": 80,
    "card.select": 120,
    "card.route": 160,
    "listRow.select": 120,
    "tab.item.press": 80,
    "tab.item.switch": 160,
    "segment.item.switch": 160,
    "dropdown.trigger.press": 80,
    "dropdown.menu.expand": 160,
    "dropdown.menu.collapse": 120,
    "dropdown.menu.reposition": 160,
    "dropdown.option.press": 80,
    "dropdown.option.select": 120,
    "reader.entry.coverToImmersive": 240,
    "reader.entry.actionToImmersive": 240,
    "reader.session.tts.start": 200,
    "reader.session.autoPage.start": 200,
    "reader.session.capsule.enter": 160,
    "reader.session.capsule.update": 120,
    "reader.session.capsule.control.press-toggle": 120,
    "reader.session.capsule.countdownTick": 120,
    "reader.session.capsule.voiceIcon.active": 960,
    "reader.session.capsule.switch": 160,
    "reader.session.capsule.exit": 120,
    "reader.control.handle.press": 80,
    "reader.control.handle.drag": 0,
    "reader.control.handle.release": 120,
    "reader.control.dock.longPress": 320,
    "reader.control.dock.drag": 0,
    "reader.control.dock.release": 120,
    "reader.control.dock.rebound": 120,
    "reader.control.show": 420,
    "reader.control.hide": 360,
    "reader.quick.promote": 320,
    "reader.module.switch": 360,
    "reader.panel.expand": 420,
    "reader.panel.collapse": 360,
    "reader.page.turn.next-prev": 220,
    "motion.interrupt.cancel": 80,
    "motion.interrupt.redirect": 80,
    "motion.interrupt.completeThenReplace": 80,
    "viewport.orientation.prepare": 80,
    "viewport.orientation.reshape": 240,
    "viewport.orientation.settle": 240,
    "source.switch.route.push": 280,
    "source.switch.route.pop": 240,
    "source.switch.route.replace": 200,
    "overlay.sheet.enter": 240,
    "overlay.sheet.exit": 240,
    "overlay.dialog.enter": 240,
    "overlay.dialog.exit": 240,
    "overlay.keyboard.enter-exit": 240,
    "state.loading.inline": 800,
    "feedback.toast.enter": 180,
    "feedback.toast.update": 180,
    "feedback.toast.exit": 180,
    "input.focus": 120,
    "input.blur": 120,
    "input.clear": 120,
    "input.focus-blur": 120,
    "input.submit": 160,
    "search.state.replace": 160,
    "state.content.replace": 160
  };

  const DEFAULT_EASINGS = {
    "bookshelf.view.switch": "ease-out",
    "slider.drag.start": "none",
    "slider.drag.update": "none",
    "slider.drag.release": "ease-out",
    "card.route": "ease-out",
    "reader.entry.coverToImmersive": "ease-out",
    "reader.control.show": "ease-out",
    "reader.control.hide": "ease-in",
    "reader.quick.promote": "ease-out",
    "reader.module.switch": "ease",
    "reader.panel.expand": "ease-out",
    "reader.panel.collapse": "ease-in",
    "source.switch.route.push": "ease-out",
    "source.switch.route.pop": "ease-in",
    "source.switch.route.replace": "ease-out",
    "overlay.sheet.enter": "ease-out",
    "overlay.sheet.exit": "ease-in",
    "overlay.dialog.enter": "ease-out",
    "overlay.dialog.exit": "ease-in",
    "overlay.keyboard.enter-exit": "ease-out",
    "state.loading.inline": "linear",
    "feedback.toast.enter": "ease-out",
    "feedback.toast.update": "ease",
    "feedback.toast.exit": "ease-in",
    "input.focus": "ease",
    "input.blur": "ease",
    "input.clear": "ease",
    "input.focus-blur": "ease",
    "input.submit": "ease",
    "search.state.replace": "ease",
    "state.content.replace": "ease"
  };

  const CONTRACT_VERSION = "reader-motion-contract-v1";
  const MOTION_ID_ALIASES = {
    "tab.item.switch": "tab.switch",
    "input.focus/blur": "input.focus-blur"
  };
  const COMMON_STATE_FIELDS = ["motionId", "phase", "reducedMotion", "sequence"];
  const COMMON_EVIDENCE = ["frontend-demo-optimized/verify/motion/selector-matrix/<motion-id>__<route>__<selector>.webm"];
  const DEFAULT_STATE_MACHINE = {
    from: ["idle"],
    to: ["running"],
    interrupt: ["superseded", "routeChange", "destroy"],
    finalState: "settled",
    reducedMotion: "Commit final state immediately; do not run transform, opacity, scale, or repeated motion."
  };

  const FAMILY_STATE_MACHINES = {
    "app.launch": {
      from: ["coldStart", "deepLinkStart"],
      to: ["shellVisible", "entryRouteReady"],
      interrupt: ["deepLinkRedirect", "reducedMotion", "appBackgrounded"],
      finalState: "shellVisible",
      reducedMotion: "Skip launch movement and reveal shell plus entry route in final state."
    },
    "app.route": {
      from: ["route.current"],
      to: ["route.target"],
      interrupt: ["newRoute", "back", "replace", "destroy"],
      finalState: "route.targetVisible",
      reducedMotion: "Replace route content without spatial push or pop movement."
    },
    tab: {
      from: ["inactive", "active", "pressed"],
      to: ["active", "inactive"],
      interrupt: ["pointerCancel", "switchTarget", "routeChange"],
      finalState: "oneActiveTab",
      reducedMotion: "Commit selected tab state with no indicator travel."
    },
    button: {
      from: ["enabled", "pressed", "loading"],
      to: ["enabled", "loading", "commandCommitted"],
      interrupt: ["pointerCancel", "disabled", "routeChange"],
      finalState: "commandCommittedOrIdle",
      reducedMotion: "Keep instant state feedback without scale or opacity tween."
    },
    "button.destructive": {
      from: ["armed", "pressed", "confirming"],
      to: ["confirmed", "cancelled"],
      interrupt: ["cancel", "overlayDismiss", "routeChange"],
      finalState: "confirmationResolved",
      reducedMotion: "Commit confirm or cancel state without destructive emphasis movement."
    },
    toggle: {
      from: ["unchecked", "checked", "pressed"],
      to: ["checked", "unchecked"],
      interrupt: ["pointerCancel", "revert", "routeChange"],
      finalState: "valueCommitted",
      reducedMotion: "Update semantics, thumb, check, and background instantly."
    },
    chip: {
      from: ["unselected", "selected", "pressed"],
      to: ["selected", "unselected"],
      interrupt: ["pointerCancel", "filterReset", "routeChange"],
      finalState: "selectionCommitted",
      reducedMotion: "Commit chip visual and semantics without scale or travel."
    },
    filter: {
      from: ["idle", "pendingValues"],
      to: ["valuesCommitted", "resultsRefreshing"],
      interrupt: ["reset", "routeChange", "newFilter"],
      finalState: "filterCommitted",
      reducedMotion: "Swap filter state and result count with no list movement."
    },
    segment: {
      from: ["segment.active", "segment.pressed"],
      to: ["segment.targetActive"],
      interrupt: ["pointerCancel", "switchTarget", "routeChange"],
      finalState: "oneActiveSegment",
      reducedMotion: "Commit selected segment without indicator travel."
    },
    dropdown: {
      from: ["closed", "triggerPressed", "open"],
      to: ["open", "closed", "optionSelected", "repositioned"],
      interrupt: ["outsidePress", "back", "routeChange", "resize", "openAnotherDropdown"],
      finalState: "closedOrOpenAtLegalAnchor",
      reducedMotion: "Measure anchor and commit open, close, select, or reposition state without offset tween."
    },
    overlay: {
      from: ["closed", "opening", "open"],
      to: ["open", "closed"],
      interrupt: ["dismiss", "back", "routeChange", "keyboardChange"],
      finalState: "focusAndInertStateResolved",
      reducedMotion: "Commit overlay visibility and focus ownership without scale or slide."
    },
    input: {
      from: ["blurred", "focused", "editing"],
      to: ["focused", "blurred", "submitted", "cleared"],
      interrupt: ["keyboardDismiss", "routeChange", "submit"],
      finalState: "inputSemanticsResolved",
      reducedMotion: "Update focus, value, and keyboard state without underline or state tween."
    },
    search: {
      from: ["idle", "queryPending", "resultsVisible"],
      to: ["loading", "empty", "resultsVisible", "error"],
      interrupt: ["newQuery", "clear", "routeChange"],
      finalState: "latestRequestWins",
      reducedMotion: "Replace search state instantly while preserving result ownership."
    },
    feedback: {
      from: ["hidden", "visible"],
      to: ["visible", "hidden", "updated"],
      interrupt: ["newMessage", "dismiss", "routeChange"],
      finalState: "latestFeedbackVisibleOrHidden",
      reducedMotion: "Commit toast or feedback state without y-offset movement."
    },
    state: {
      from: ["previousState"],
      to: ["nextState"],
      interrupt: ["newState", "routeChange", "requestCancel"],
      finalState: "nextStateVisible",
      reducedMotion: "Replace content state without crossfade or offset."
    },
    selection: {
      from: ["selectionHidden", "selectionVisible"],
      to: ["selectionVisible", "toolbarVisible", "selectionHidden"],
      interrupt: ["readerControlOpen", "dropdownOpen", "routeChange", "pointerCancel"],
      finalState: "selectionLayerResolved",
      reducedMotion: "Commit toolbar and selection visibility without anchor travel."
    },
    slider: {
      from: ["idle", "dragging"],
      to: ["dragging", "valueCommitted"],
      interrupt: ["pointerCancel", "routeChange", "boundsClamp"],
      finalState: "valueCommitted",
      reducedMotion: "Keep drag/value changes direct with no easing."
    },
    stepper: {
      from: ["idle", "pressed"],
      to: ["valueCommitted", "repeatActive"],
      interrupt: ["pointerCancel", "minMaxReached", "routeChange"],
      finalState: "valueCommitted",
      reducedMotion: "Commit value and disabled states instantly."
    },
    progress: {
      from: ["previousValue"],
      to: ["nextValue"],
      interrupt: ["newValue", "routeChange"],
      finalState: "latestValueVisible",
      reducedMotion: "Snap to latest progress value without tween."
    },
    listRow: {
      from: ["idle", "pressed", "selected"],
      to: ["selected", "unselected", "routePending"],
      interrupt: ["pointerCancel", "scroll", "routeChange"],
      finalState: "rowStateCommitted",
      reducedMotion: "Commit row background, check, or navigation state without height changes."
    },
    card: {
      from: ["idle", "pressed", "selected"],
      to: ["selected", "unselected", "routePending"],
      interrupt: ["pointerCancel", "scroll", "routeChange"],
      finalState: "cardStateCommitted",
      reducedMotion: "Commit card selection or navigation state without scale or grid movement."
    },
    bookshelf: {
      from: ["bookshelf.view.cover", "bookshelf.view.list"],
      to: ["bookshelf.view.target"],
      interrupt: ["bookshelf.view.switch", "filterChange", "sortChange", "routeChange", "orientationPrepare"],
      finalState: "bookshelf.view.target.settled",
      reducedMotion: "Commit the target layout immediately while preserving BookItem identity, scroll anchor, and focus."
    },
    "reader.entry": {
      from: ["sourceRoute", "coverPressed"],
      to: ["immersiveReading"],
      interrupt: ["back", "routeChange", "snapshotUnavailable"],
      finalState: "immersiveReadingWithoutControlLayer",
      reducedMotion: "Use source press plus reader surface reveal; skip shared-element movement."
    },
    "reader.control": {
      from: ["controlHidden", "controlVisible", "dragging", "docked"],
      to: ["controlHidden", "controlVisible", "dockOffsetCommitted"],
      interrupt: ["back", "routeChange", "orientationPrepare", "pointerCancel"],
      finalState: "controlLayerLegalPosition",
      reducedMotion: "Commit control visibility or dock position without snap movement."
    },
    "reader.module": {
      from: ["module.active"],
      to: ["module.targetActive"],
      interrupt: ["routeChange", "switchTarget"],
      finalState: "oneActiveReaderModule",
      reducedMotion: "Commit active module without indicator travel."
    },
    "reader.quick": {
      from: ["quickIdle", "quickPressed"],
      to: ["targetPanel", "loading", "committed"],
      interrupt: ["routeChange", "panelDismiss", "newQuickAction"],
      finalState: "quickActionResolved",
      reducedMotion: "Commit quick action state without panel offset."
    },
    "reader.panel": {
      from: ["control.quick.module", "control.full.module"],
      to: ["control.full.module", "control.quick.module"],
      interrupt: ["oppositePanelAction", "moduleSwitch", "hideControlLayer", "routeChange"],
      finalState: "oneReaderControlPanelAtTargetSize",
      reducedMotion: "Commit the target panel size immediately without sheet travel."
    },
    "reader.session": {
      from: ["inactive", "autoPage", "tts", "capsuleVisible", "controlSpaceVisible"],
      to: ["autoPage", "tts", "capsuleVisible", "controlSpaceVisible", "inactive"],
      interrupt: ["mutualSessionSwitch", "stop", "exitReader", "orientationPrepare", "routeChange"],
      finalState: "singleSessionOwner",
      reducedMotion: "Commit active session and capsule/control-space owner without container travel."
    },
    "reader.page": {
      from: ["page.current"],
      to: ["page.next", "page.previous"],
      interrupt: ["chapterJump", "autoPageTick", "manualTurn", "routeChange"],
      finalState: "pageIndexCommitted",
      reducedMotion: "Commit page index without page slide."
    },
    "reader.chapter": {
      from: ["chapter.current"],
      to: ["chapter.target"],
      interrupt: ["newJump", "routeChange", "sessionTick"],
      finalState: "chapterAnchorCommitted",
      reducedMotion: "Jump to target chapter anchor without content movement."
    },
    "reader.sourceSwitch": {
      from: ["readerVisible", "sourceOverlayOpen"],
      to: ["sourceOverlayOpen", "sourceCommitted", "readerVisible"],
      interrupt: ["dismiss", "routeChange", "newSource"],
      finalState: "readerSourceResolved",
      reducedMotion: "Commit source overlay or target source without overlay travel."
    },
    "motion.interrupt": {
      from: ["motionRunning", "pressed", "dragging", "loading", "overlayEntering"],
      to: ["latestTarget", "cancelled", "redirected", "replaced"],
      interrupt: ["newInterrupt", "destroy", "routeChange"],
      finalState: "latestStateOwnsSurface",
      reducedMotion: "Clear transient pressed, dragging, and entering states immediately."
    },
    viewport: {
      from: ["viewportStable"],
      to: ["viewportFrozen", "viewportReshaped", "viewportStable"],
      interrupt: ["newMetrics", "foldChange", "routeChange", "dragCancel"],
      finalState: "viewportLegalLayout",
      reducedMotion: "Freeze, reshape, and settle layout without animated spatial interpolation."
    },
    tooling: {
      from: ["toolingMode.current"],
      to: ["toolingMode.target"],
      interrupt: ["newToolingMode", "routeChange"],
      finalState: "toolingModeCommitted",
      reducedMotion: "Commit debug mode switch instantly."
    }
  };

  const MOTION_ID_STATE_MACHINES = {
    "app.firstOpen.enter": {
      from: ["coldStart", "deepLinkStart"],
      to: ["shellVisible", "entryRouteReady"],
      interrupt: ["deepLinkRedirect", "resumeInsteadOfColdStart", "reducedMotion"],
      finalState: "entryRouteVisibleOnce",
      reducedMotion: "Render shell and entry route immediately; do not replay on route, tab, or back actions."
    },
    "app.route.push.forward": {
      from: ["route.current"],
      to: ["route.targetOnStack"],
      interrupt: ["backBeforeSettle", "replaceBeforeSettle", "newPush"],
      finalState: "targetRouteVisibleAndStackUpdated",
      reducedMotion: "Update stack and content immediately without forward slide."
    },
    "app.route.pop.backward": {
      from: ["route.current"],
      to: ["route.previousOnStack"],
      interrupt: ["newPushBeforeSettle", "replaceBeforeSettle", "emptyBackStack"],
      finalState: "previousRouteVisibleAndStackPopped",
      reducedMotion: "Pop stack and render previous route immediately without backward slide."
    },
    "app.route.replace": {
      from: ["route.current"],
      to: ["route.replacedTarget"],
      interrupt: ["newReplace", "backBeforeCommit", "sessionStartRedirect"],
      finalState: "targetRouteVisibleWithoutNewBackEntry",
      reducedMotion: "Replace route state in place with no push/pop movement."
    },
    "bookshelf.view.switch": {
      from: ["bookshelf.view.cover", "bookshelf.view.list"],
      to: ["bookshelf.view.target"],
      interrupt: ["bookshelf.view.switch", "bookshelf.sortFilter.apply", "bookshelf.group.select", "route.replace", "viewport.orientation.prepare"],
      finalState: "bookshelf.view.target.settled",
      reducedMotion: "Commit the target layout immediately while preserving BookItem identity, scroll anchor, and focus."
    },
    "tab.item.press": {
      from: ["idle"],
      to: ["pressed"],
      interrupt: ["pointerCancel", "pointerLeave", "routeChange"],
      finalState: "pressedReleased",
      reducedMotion: "Keep pressed feedback instant and do not move tab layout."
    },
    "tab.item.select": {
      from: ["inactive"],
      to: ["active"],
      interrupt: ["switchTarget", "routeChange"],
      finalState: "selectedTabActive",
      reducedMotion: "Commit selected color/icon/text state without background travel."
    },
    "tab.item.switch": {
      from: ["activeTab.previous"],
      to: ["activeTab.next"],
      interrupt: ["switchTargetAgain", "routeChange", "pointerCancel"],
      finalState: "oneActiveTabAndStableBarSize",
      reducedMotion: "Switch active state instantly and keep indicator static."
    },
    "tab.switch": {
      from: ["activeTab.previous"],
      to: ["activeTab.next"],
      interrupt: ["switchTargetAgain", "routeChange", "pointerCancel"],
      finalState: "oneActiveTabAndStableBarSize",
      reducedMotion: "Switch active state instantly and keep indicator static."
    },
    "segment.item.switch": {
      from: ["segment.previous"],
      to: ["segment.next"],
      interrupt: ["switchTargetAgain", "routeChange", "pointerCancel", "stateReset"],
      finalState: "oneActiveSegmentAndStableGroupSize",
      reducedMotion: "Commit selected segment state immediately without indicator travel or layout movement."
    },
    "dropdown.trigger.press": {
      from: ["closed", "open"],
      to: ["triggerPressed"],
      interrupt: ["pointerCancel", "openAnotherDropdown", "routeChange"],
      finalState: "triggerReleased",
      reducedMotion: "Apply trigger pressed state instantly without chevron travel."
    },
    "dropdown.menu.expand": {
      from: ["closed", "anchorMeasured"],
      to: ["open"],
      interrupt: ["openAnotherDropdown", "back", "routeChange", "viewportChanged"],
      finalState: "openAtLegalAnchor",
      reducedMotion: "Measure anchor, then show menu immediately without fade or y-offset."
    },
    "dropdown.menu.collapse": {
      from: ["open"],
      to: ["closed"],
      interrupt: ["routeChange", "openAnotherDropdown", "destroy"],
      finalState: "closedAndFocusReturnedToTrigger",
      reducedMotion: "Hide menu and release focus/click target immediately."
    },
    "dropdown.menu.reposition": {
      from: ["openAtPreviousAnchor"],
      to: ["openAtLegalAnchor"],
      interrupt: ["collapse", "routeChange", "newViewportMetrics"],
      finalState: "openWithinViewportOrSheetFallback",
      reducedMotion: "Recompute placement and snap to legal bounds without animated travel."
    },
    "dropdown.option.press": {
      from: ["optionIdle"],
      to: ["optionPressed"],
      interrupt: ["pointerCancel", "collapse", "routeChange"],
      finalState: "optionReleased",
      reducedMotion: "Apply option pressed state instantly without moving menu container."
    },
    "dropdown.option.select": {
      from: ["open", "optionPressed"],
      to: ["valueCommitted", "closedOrOpen"],
      interrupt: ["routeChange", "newSelection", "collapse"],
      finalState: "valueAndSemanticsCommitted",
      reducedMotion: "Update value, check/icon, and close single-select menus immediately."
    },
    "button.activate": {
      from: ["button.enabled", "button.pressed"],
      to: ["button.commandCommitted", "button.pendingOrIdle"],
      interrupt: ["button.disable", "pointerCancel", "commandCancel", "routeChange"],
      finalState: "buttonCommandResolvedWithoutHitAreaChange",
      reducedMotion: "Commit button command state without scale or label crossfade."
    },
    "toggle.switch": {
      from: ["toggle.previousValue", "toggle.pressed"],
      to: ["toggle.nextValue"],
      interrupt: ["toggle.switch", "toggle.revert", "pointerCancel", "routeChange"],
      finalState: "toggleValueAndSemanticsCommitted",
      reducedMotion: "Update check/thumb/background and semantics instantly."
    },
    "chip.item.select": {
      from: ["chip.previousSelection", "chip.idle"],
      to: ["chip.targetSelected"],
      interrupt: ["chip.item.select", "pointerCancel", "routeChange"],
      finalState: "oneTargetSelectionCommittedWithinStableGroup",
      reducedMotion: "Commit the target chip and semantics immediately without indicator travel or group reflow."
    },
    "destructive.confirm.commit": {
      from: ["confirmation.armed", "confirmation.focused"],
      to: ["destructive.commandCommitted", "confirmation.pendingOrResolved"],
      interrupt: ["destructive.confirm.cancel", "overlayDismiss", "routeChange", "commandCancel"],
      finalState: "destructiveConfirmationResolvedBySingleCommittedIntent",
      reducedMotion: "Commit the single confirmed destructive intent immediately without emphasis movement."
    },
    "filter.apply.commit": {
      from: ["filter.pendingValues", "filter.results.previous"],
      to: ["filter.valuesCommitted", "filter.resultsRefreshing"],
      interrupt: ["filter.apply.commit", "filter.reset", "routeChange", "requestCancel"],
      finalState: "latestCommittedFilterOwnsStableResultHost",
      reducedMotion: "Commit the latest filter and refresh state immediately while preserving result-host geometry."
    },
    "filter.item.toggle": {
      from: ["filter.item.previousValue", "filter.item.idle"],
      to: ["filter.item.nextValue", "filter.pendingValues"],
      interrupt: ["filter.item.toggle", "filter.reset", "routeChange", "pointerCancel"],
      finalState: "latestFilterItemAndPendingSummaryCommittedWithoutResultReplacement",
      reducedMotion: "Commit the item and pending summary immediately without replacing or moving the result list."
    },
    "slider.drag.start": {
      from: ["slider.idle", "slider.valueCommitted"],
      to: ["slider.dragging"],
      interrupt: ["pointerCancel", "slider.disabled", "routeChange"],
      finalState: "sliderDraggingWithPointerOwnership",
      reducedMotion: "Keep direct manipulation and pointer ownership; no decorative motion is allowed."
    },
    "slider.drag.update": {
      from: ["slider.dragging"],
      to: ["slider.draggingValueUpdated"],
      interrupt: ["pointerCancel", "slider.drag.release", "routeChange"],
      finalState: "sliderValueMatchesLatestDirectInput",
      reducedMotion: "Keep track, thumb, and readout matched to the latest direct input with no easing."
    },
    "slider.drag.release": {
      from: ["slider.dragging", "slider.draggingValueUpdated"],
      to: ["slider.snappedValue", "slider.valueCommitted"],
      interrupt: ["slider.drag.start", "slider.disabled", "routeChange"],
      finalState: "sliderLegalValueCommittedAndPointerReleased",
      reducedMotion: "Commit the legal value immediately and release pointer ownership without snap travel."
    },
    "stepper.press": {
      from: ["stepper.idle", "stepper.valueCommitted"],
      to: ["stepper.pressed"],
      interrupt: ["pointerCancel", "pointerLeave", "stepper.disabled", "routeChange"],
      finalState: "stepperPressReleasedWithoutHitAreaChange",
      reducedMotion: "Apply and clear pressed semantics immediately without scale or hit-area changes."
    },
    "stepper.value.change": {
      from: ["stepper.previousValue", "stepper.pressed"],
      to: ["stepper.nextLegalValue"],
      interrupt: ["stepper.value.change", "stepper.disabled", "routeChange"],
      finalState: "stepperLegalValueAndReadoutCommitted",
      reducedMotion: "Commit the next legal value and preview immediately without numeric crossfade."
    },
    "card.press": {
      from: ["card.idle", "card.selected", "card.focused"],
      to: ["card.pressed"],
      interrupt: ["pointerCancel", "pointerLeave", "card.select", "routeChange"],
      finalState: "cardPressedFeedbackReleasedWithoutGeometryChange",
      reducedMotion: "Apply card pressed semantics without scale, cover movement, or scroll displacement."
    },
    "card.select": {
      from: ["card.idle", "card.previousSelection", "card.pressed"],
      to: ["card.targetSelected"],
      interrupt: ["card.select", "selection.clear", "routeChange"],
      finalState: "cardSelectionCommittedWithoutContentReflow",
      reducedMotion: "Commit selection, check, and focus semantics instantly without card reflow."
    },
    "card.route": {
      from: ["card.idle", "card.pressed", "route.current"],
      to: ["card.destinationRoute"],
      interrupt: ["card.route", "route.replace", "route.back", "asyncResult.stale"],
      finalState: "latestCardIntentOwnsVisibleDestinationRoute",
      reducedMotion: "Commit the latest destination route without card movement or source snapshot travel."
    },
    "listRow.select": {
      from: ["listRow.idle", "listRow.previousSelection", "listRow.pressed"],
      to: ["listRow.targetSelected"],
      interrupt: ["listRow.select", "selection.clear", "routeChange"],
      finalState: "listRowSelectionAndSemanticsCommitted",
      reducedMotion: "Commit row selection and semantics instantly without changing row height or scroll anchor."
    },
    "selection.group.toggle": {
      from: ["selection.group.previousState", "selection.group.idle"],
      to: ["selection.group.nextState", "selection.summary.latest"],
      interrupt: ["selection.group.toggle", "selection.clear", "routeChange", "pointerCancel"],
      finalState: "latestGroupSelectionAndSummaryCommittedWithoutListReflow",
      reducedMotion: "Commit group selection and summary immediately without list reflow."
    },
    "selection.item.toggle": {
      from: ["selection.item.previousValue", "selection.item.idle"],
      to: ["selection.item.nextValue", "selection.summary.latest"],
      interrupt: ["selection.item.toggle", "selection.clear", "routeChange", "pointerCancel"],
      finalState: "latestItemSelectionAndSummaryCommittedWithoutRowReflow",
      reducedMotion: "Commit item selection and summary immediately without row reflow."
    },
    "selection.option.toggle": {
      from: ["selection.option.previousValue", "selection.option.idle"],
      to: ["selection.option.nextValue", "selection.optionSummary.latest"],
      interrupt: ["selection.option.toggle", "selection.reset", "routeChange", "pointerCancel"],
      finalState: "latestOptionSelectionAndSummaryCommittedWithoutRowReflow",
      reducedMotion: "Commit option selection and summary immediately without row reflow."
    },
    "selection.range.show": {
      from: ["textSelection.none", "textSelection.rangeCommitted"],
      to: ["textSelection.rangeVisible", "selectionToolbar.visibleAtLegalAnchor"],
      interrupt: ["selection.range.show", "readerControlOpen", "dropdownOpen", "dialogOpen", "routeChange"],
      finalState: "latestTextRangeAndToolbarVisibleWithoutTextReflow",
      reducedMotion: "Show the latest text range and toolbar at the legal anchor without text reflow or anchor travel."
    },
    "selection.toolbar.action": {
      from: ["selectionToolbar.visible", "selectionToolbar.actionIdle"],
      to: ["selectionToolbar.actionCommittedOrPending", "textSelection.keptOrClosedByAction"],
      interrupt: ["selection.toolbar.action", "readerControlOpen", "dialogOpen", "routeChange", "commandCancel"],
      finalState: "latestToolbarActionResolvedWithDeclaredSelectionRetention",
      reducedMotion: "Commit the latest toolbar action and its declared selection retention immediately."
    },
    "selection.toolbar.exit": {
      from: ["selectionToolbar.visible", "textSelection.rangeVisible"],
      to: ["selectionToolbar.hidden", "textSelection.none", "focus.returned"],
      interrupt: ["selection.range.show", "routeChange", "destroy"],
      finalState: "selectionLayerHiddenAndPointerFocusOwnershipReleased",
      reducedMotion: "Hide the selection layer and release pointer and focus ownership immediately."
    },
    "reader.entry.coverToImmersive": {
      from: ["sourceRoute", "coverPressed", "coverSnapshotMeasured"],
      to: ["immersiveReading"],
      interrupt: ["snapshotUnavailable", "backBeforeCommit", "routeChange"],
      finalState: "immersiveReadingNoControlLayerAndSourceBackStackKept",
      reducedMotion: "Use cover press and reader surface reveal; skip shared-element movement."
    },
    "reader.entry.actionToImmersive": {
      from: ["sourceRoute", "actionPressed"],
      to: ["immersiveReading"],
      interrupt: ["backBeforeCommit", "routeChange"],
      finalState: "immersiveReadingNoControlLayerAndSourceBackStackKept",
      reducedMotion: "Use action press plus immediate reader surface reveal."
    },
    "reader.control.hide": {
      from: ["control.home", "control.quick"],
      to: ["immersive.hidden"],
      interrupt: ["reader.control.show", "app.route.replace", "viewport.orientation.prepare"],
      finalState: "immersive.hidden",
      reducedMotion: "Hide control layer immediately and restore immersive hit regions."
    },
    "reader.control.show": {
      from: ["immersive.hidden"],
      to: ["control.home"],
      interrupt: ["reader.control.hide", "app.route.replace", "viewport.orientation.prepare"],
      finalState: "control.home.visible",
      reducedMotion: "Show the control layer immediately and release immersive hit regions."
    },
    "reader.control.handle.press": {
      from: ["handleIdle", "controlLayerVisible"],
      to: ["handlePressed"],
      interrupt: ["pointerCancel", "routeChange", "orientationPrepare"],
      finalState: "handlePressedFeedbackVisible",
      reducedMotion: "Commit pressed state without scale or pull preview."
    },
    "reader.control.handle.drag": {
      from: ["handlePressed"],
      to: ["handleDragging", "dragOffsetPreview"],
      interrupt: ["pointerCancel", "routeChange", "orientationPrepare"],
      finalState: "dragOffsetPreviewOnly",
      reducedMotion: "Track drag semantics without panel translation."
    },
    "reader.control.handle.release": {
      from: ["handleDragging", "handlePressed"],
      to: ["snapBack", "expandCommitted", "collapseCommitted"],
      interrupt: ["routeChange", "orientationPrepare"],
      finalState: "controlLayerResolvedToSingleRouteState",
      reducedMotion: "Resolve expand, collapse, or snap-back immediately without panel travel."
    },
    "reader.control.dock.longPress": {
      from: ["fixedWidthDock", "handlePressed"],
      to: ["dockDragArmed"],
      interrupt: ["pointerCancel", "routeChange", "orientationPrepare", "viewportClassChange"],
      finalState: "dockDragReadyWithinBounds",
      reducedMotion: "Arm dock movement without scale or halo animation."
    },
    "reader.control.dock.drag": {
      from: ["dockDragArmed", "dockOffset.previous"],
      to: ["dockOffset.previewClamped"],
      interrupt: ["pointerCancel", "routeChange", "orientationPrepare", "viewportClassChange"],
      finalState: "dockPreviewOffsetWithinMovableSpace",
      reducedMotion: "Update clamped dock offset directly while keeping dock dimensions fixed."
    },
    "reader.control.dock.release": {
      from: ["dockDragging", "dockOffset.previewClamped"],
      to: ["dockOffset.committed"],
      interrupt: ["routeChange", "orientationPrepare", "viewportClassChange"],
      finalState: "dockOffsetSavedForViewportClass",
      reducedMotion: "Commit the legal dock offset immediately without snap movement."
    },
    "reader.control.dock.rebound": {
      from: ["dockOffset.saved", "bounds.changed"],
      to: ["dockOffset.clamped"],
      interrupt: ["routeChange", "orientationPrepare"],
      finalState: "dockOffsetLegalInCurrentBounds",
      reducedMotion: "Clamp dock offset to the current movable space immediately."
    },
    "reader.session.autoPage.start": {
      from: ["controlLayerVisible", "session.inactiveOrTts"],
      to: ["immersiveReading", "session.autoPage", "capsuleVisible"],
      interrupt: ["ttsStart", "stop", "exitReader", "routeChange"],
      finalState: "autoPageOwnsSessionAndCapsule",
      reducedMotion: "Set autoPage session, replace route, and show capsule immediately."
    },
    "reader.session.tts.start": {
      from: ["controlLayerVisible", "ttsPageVisible", "session.inactiveOrAutoPage"],
      to: ["immersiveReading", "session.tts", "capsuleVisible"],
      interrupt: ["autoPageStart", "stop", "exitReader", "routeChange"],
      finalState: "ttsOwnsSessionAndCapsule",
      reducedMotion: "Set TTS session, replace route, and show capsule immediately."
    },
    "reader.session.capsule.enter": {
      from: ["sessionActive", "capsuleHidden"],
      to: ["capsuleVisible"],
      interrupt: ["sessionSwitch", "stop", "controlLayerOpen", "exitReader"],
      finalState: "capsuleVisibleAtReaderStatusAnchor",
      reducedMotion: "Show capsule at anchor immediately without container scale or y-offset."
    },
    "reader.session.capsule.update": {
      from: ["capsuleVisible", "session.previousState"],
      to: ["capsuleVisible", "session.nextState"],
      interrupt: ["sessionSwitch", "stop", "controlLayerOpen", "exitReader"],
      finalState: "capsuleInternalStateUpdated",
      reducedMotion: "Update internal icon, text, and count without replaying capsule enter."
    },
    "reader.session.capsule.control.press-toggle": {
      from: ["capsuleVisible", "playing.previous"],
      to: ["capsuleVisible", "playing.next"],
      interrupt: ["pointerCancel", "sessionStop", "controlLayerOpen", "exitReader"],
      finalState: "playingStateCommittedInsideCapsule",
      reducedMotion: "Commit play/pause icon and state instantly; do not open control layer."
    },
    "reader.session.capsule.countdownTick": {
      from: ["countdown.previous"],
      to: ["countdown.next"],
      interrupt: ["pause", "sessionSwitch", "pageTurn", "stop"],
      finalState: "latestCountdownVisibleInFixedWidthSlot",
      reducedMotion: "Replace number immediately in the fixed-width slot."
    },
    "reader.session.capsule.voiceIcon.active": {
      from: ["ttsPlaying"],
      to: ["ttsPlayingVisualActive"],
      interrupt: ["pause", "reducedMotion", "sessionSwitch", "stop"],
      finalState: "voiceIconActiveOnlyWhilePlaying",
      reducedMotion: "Keep voice icon static while preserving playing semantics."
    },
    "reader.session.capsule.switch": {
      from: ["capsuleVisible", "session.previousType"],
      to: ["capsuleVisible", "session.nextType"],
      interrupt: ["stop", "controlLayerOpen", "exitReader"],
      finalState: "singleCapsuleWithNextSessionType",
      reducedMotion: "Swap capsule internal content immediately at the same anchor."
    },
    "reader.session.capsule.exit": {
      from: ["capsuleVisible"],
      to: ["capsuleHidden"],
      interrupt: ["sessionRestart", "routeChange", "destroy"],
      finalState: "capsuleHiddenAndHitTargetReleased",
      reducedMotion: "Hide capsule and release hit target immediately."
    },
    "reader.session.controlSpace.enter": {
      from: ["capsuleVisible", "controlLayerOpening"],
      to: ["controlSpaceVisible"],
      interrupt: ["controlLayerClose", "sessionStop", "orientationPrepare"],
      finalState: "singleRunningControlOwnerInControlLayer",
      reducedMotion: "Hide capsule and show running control space without morph."
    },
    "reader.session.controlSpace.update": {
      from: ["controlSpaceVisible", "session.previousState"],
      to: ["controlSpaceVisible", "session.nextState"],
      interrupt: ["sessionStop", "controlLayerClose", "orientationPrepare"],
      finalState: "controlSpaceInternalStateUpdated",
      reducedMotion: "Update internal running state instantly."
    },
    "reader.session.controlSpace.exit": {
      from: ["controlSpaceVisible", "controlLayerClosing"],
      to: ["capsuleVisible", "immersiveReading"],
      interrupt: ["sessionStop", "exitReader", "orientationPrepare"],
      finalState: "singleCapsuleOwnerInImmersiveReading",
      reducedMotion: "Hide running control space and show capsule without morph."
    },
    "reader.module.switch": {
      from: ["control.home", "control.quick.module.previous"],
      to: ["control.quick.module.target"],
      interrupt: ["reader.module.switch", "reader.panel.expand", "reader.control.hide", "app.route.replace"],
      finalState: "control.quick.module.singleTargetVisible",
      reducedMotion: "Commit active module and panel content immediately; keep module nav dimensions stable."
    },
    "reader.quick.promote": {
      from: ["control.home"],
      to: ["control.quick.target"],
      interrupt: ["reader.quick.promote", "reader.module.switch", "reader.control.hide", "app.route.replace"],
      finalState: "control.quick.singleTargetVisible",
      reducedMotion: "Commit the target quick panel immediately without scale or opacity motion."
    },
    "reader.panel.expand": {
      from: ["control.quick.module"],
      to: ["control.full.module"],
      interrupt: ["reader.panel.collapse", "reader.module.switch", "reader.control.hide", "app.route.replace"],
      finalState: "control.full.module.singleTargetVisible",
      reducedMotion: "Commit the full reader panel immediately without sheet travel."
    },
    "reader.panel.collapse": {
      from: ["control.full.module"],
      to: ["control.quick.module"],
      interrupt: ["reader.panel.expand", "reader.module.switch", "reader.control.hide", "app.route.replace"],
      finalState: "control.quick.module.singleTargetVisible",
      reducedMotion: "Commit the quick reader panel immediately without sheet travel."
    },
    "reader.page.turn.next-prev": {
      from: ["page.current"],
      to: ["page.nextOrPrevious"],
      interrupt: ["oppositeTurn", "chapterJump", "routeChange", "sessionTick"],
      finalState: "pageIndexCommittedAndPageInfoAnchored",
      reducedMotion: "Commit page index and footer/page info immediately without slide."
    },
    "reader.chapter.jump": {
      from: ["chapter.current"],
      to: ["chapter.target"],
      interrupt: ["newJump", "routeChange", "sessionTick"],
      finalState: "chapterAnchorCommitted",
      reducedMotion: "Commit target chapter, page index, and progress anchor immediately without content movement."
    },
    "motion.interrupt.cancel": {
      from: ["motionRunning", "pressed", "dragging", "entering"],
      to: ["latestCommittedState"],
      interrupt: ["newInterrupt", "destroy"],
      finalState: "transientMotionCleared",
      reducedMotion: "Clear transient motion flags immediately."
    },
    "motion.interrupt.redirect": {
      from: ["motionRunningTowardOldTarget"],
      to: ["motionRunningTowardNewTarget"],
      interrupt: ["newTarget", "routeChange", "destroy"],
      finalState: "newTargetOwnsMotion",
      reducedMotion: "Cancel old target and commit new target without interpolation."
    },
    "motion.interrupt.completeThenReplace": {
      from: ["requiredStateMotion", "loadingMinimumVisible"],
      to: ["replacementState"],
      interrupt: ["userBack", "routeChange", "newerAsyncResult"],
      finalState: "replacementVisibleOnlyIfStillCurrent",
      reducedMotion: "Replace with the latest valid state immediately."
    },
    "state.loading.inline": {
      from: ["inlineState.idle", "inlineState.content"],
      to: ["inlineState.loading"],
      interrupt: ["loading.result.ready", "loading.request.cancel", "loading.request.superseded", "routeChange", "destroy"],
      finalState: "latestRequestOwnsInlineStateAndTerminalResultStopsIndicator",
      reducedMotion: "Show a static loading indicator; keep request ownership and stop it on the latest terminal result."
    },
    "feedback.toast.enter": {
      from: ["toast.hidden", "toastHost.empty"],
      to: ["toast.visible", "toastHost.singleOwner"],
      interrupt: ["feedback.toast.show", "feedback.toast.update", "feedback.toast.dismiss", "routeChange", "destroy"],
      finalState: "latestToastVisibleWithSingleHostOwner",
      reducedMotion: "Show and announce the latest toast immediately without y-offset movement."
    },
    "feedback.toast.update": {
      from: ["toast.visible", "toastHost.singleOwner"],
      to: ["toast.visible", "toastHost.singleOwner", "toast.message.latest"],
      interrupt: ["feedback.toast.show", "feedback.toast.update", "feedback.toast.dismiss", "routeChange", "destroy"],
      finalState: "latestToastVisibleWithSingleHostOwner",
      reducedMotion: "Commit the latest message in the existing live-region host immediately and replace the auto-dismiss timer."
    },
    "feedback.toast.exit": {
      from: ["toast.visible", "toastHost.singleOwner"],
      to: ["toast.hidden", "toastHost.empty"],
      interrupt: ["feedback.toast.show", "feedback.toast.update", "routeChange", "destroy"],
      finalState: "toastHiddenAndHostReleased",
      reducedMotion: "Hide the toast and release its host immediately without y-offset movement."
    },
    "input.focus": {
      from: ["input.blurred", "keyboard.hidden"],
      to: ["input.focused", "caret.visible", "keyboard.requestedOrNotRequired"],
      interrupt: ["input.blur", "input.submit", "routeChange", "destroy"],
      finalState: "focusedInputOwnsCaretAndOptionalKeyboard",
      reducedMotion: "Commit focus ring, caret, and keyboard request immediately without tween."
    },
    "input.blur": {
      from: ["input.focused", "input.editing"],
      to: ["input.blurred", "value.preserved", "keyboard.dismissedOrTransferred"],
      interrupt: ["input.focus", "routeChange", "destroy"],
      finalState: "blurredInputPreservesValueAndReleasesKeyboardOwnership",
      reducedMotion: "Release focus and keyboard ownership immediately while preserving the value."
    },
    "input.clear": {
      from: ["input.focused", "input.blurred", "value.nonEmpty", "search.resultsVisible"],
      to: ["input.focused", "value.empty", "search.beforeOrEmpty"],
      interrupt: ["input.submit", "newInput", "routeChange", "destroy"],
      finalState: "emptyValueVisibleWithInputFocusPreserved",
      reducedMotion: "Clear the value and stale results immediately while preserving input focus."
    },
    "input.focus-blur": {
      from: ["input.blurred", "input.focused", "input.editing"],
      to: ["input.focusedOrBlurred", "value.preserved"],
      interrupt: ["input.submit", "input.clear", "routeChange", "destroy"],
      finalState: "latestFocusOwnerAndValueSemanticsResolved",
      reducedMotion: "Commit the latest focus owner and keyboard state immediately without tween."
    },
    "input.submit": {
      from: ["input.focused", "input.editing", "submit.idle"],
      to: ["submit.pending", "latestResult.committed"],
      interrupt: ["input.clear", "input.submit", "newInput", "routeChange", "destroy"],
      finalState: "latestSubmitResultOwnsStableInputAndResultHost",
      reducedMotion: "Commit pending and terminal submit states without visual interpolation."
    },
    "search.state.replace": {
      from: ["search.before", "search.loading", "search.results", "search.empty", "search.error"],
      to: ["search.latestState"],
      interrupt: ["search.submit", "search.clear", "search.loadMore", "routeChange", "destroy"],
      finalState: "latestSearchRequestOwnsStableResultHost",
      reducedMotion: "Replace the search state immediately while preserving result-host geometry."
    },
    "state.content.replace": {
      from: ["content.previous", "contentHost.stable"],
      to: ["content.latest", "contentHost.stable"],
      interrupt: ["state.replace", "routeChange", "requestCancel", "destroy"],
      finalState: "latestContentVisibleWithShellAndScrollAnchorPreserved",
      reducedMotion: "Commit the latest content immediately while preserving shell, scroll, and focus ownership."
    },
    "tooling.mode.switch": {
      from: ["toolingMode.current", "toolingSurface.stable"],
      to: ["toolingMode.target", "toolingSurface.stable"],
      interrupt: ["tooling.mode.switch", "routeChange", "destroy"],
      finalState: "latestToolingModeCommittedWithinStableRouteShell",
      reducedMotion: "Commit the latest tooling mode immediately while preserving the route shell and focus owner."
    },
    "viewport.orientation.prepare": {
      from: ["viewportStable"],
      to: ["viewportFrozen"],
      interrupt: ["routeChange", "newMetricsBeforeFreeze"],
      finalState: "routeReaderSessionOverlayFocusFrozen",
      reducedMotion: "Freeze motion state immediately."
    },
    "viewport.orientation.reshape": {
      from: ["viewportFrozen", "viewportStable"],
      to: ["viewportReshaped"],
      interrupt: ["newMetrics", "foldChange", "routeChange"],
      finalState: "readerOverlayCapsuleDockReanchored",
      reducedMotion: "Recompute layout, pagination anchor, overlay, capsule, and dock bounds without interpolation."
    },
    "viewport.orientation.settle": {
      from: ["viewportReshaped"],
      to: ["viewportStable"],
      interrupt: ["newMetrics", "routeChange"],
      finalState: "focusPointerSessionMicroMotionRestored",
      reducedMotion: "Restore focus, pointer, and session semantics without settle animation."
    }
  };

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
      evidence: ["frontend-demo-optimized/verify/motion/app/app.launch.firstOpen__cold-start.webm"]
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
      prefix: "source.switch.route.",
      family: "app.route",
      tokens: ["reader.motion.duration.route", "reader.motion.duration.routePop", "reader.motion.duration.routeReplace"],
      stateFields: ["fromRoute", "toRoute", "routeStack", "readerContinuityOrigin", "focusReturnTarget"],
      platformComponents: {
        web: "FlowShell / DemoRouteHost",
        android: "FlowShell NavHost / route reducer",
        ios: "FlowShell NavigationStack / route reducer",
        harmony: "FlowShell Router / route reducer"
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
      tokens: ["app.motion.duration.layoutSwitch"],
      stateFields: ["viewMode", "previousViewMode", "targetViewMode", "stableBookIds", "scrollAnchor"],
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
      evidence: ["frontend-demo-optimized/verify/motion/reader/reader.entry.coverToImmersive__bookshelf__cover.webm"]
    },
    {
      prefix: "reader.control.",
      family: "reader.control",
      tokens: ["reader.motion.duration.overlay", "reader.motion.duration.panel", "reader.motion.duration.handleSnap", "reader.motion.distance.handlePullY"],
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
      tokens: ["reader.motion.duration.fast"],
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
      prefix: "reader.panel.",
      family: "reader.panel",
      tokens: ["reader.motion.duration.panel"],
      stateFields: ["sourcePanel", "targetPanel", "controlLayerOpen", "readerContext"],
      platformComponents: {
        web: "ReaderControlPanel",
        android: "ReaderControlPanel",
        ios: "ReaderControlPanel",
        harmony: "ReaderControlPanel"
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
      evidence: ["frontend-demo-optimized/verify/motion/reader/<motion-id>__immersive-reading__session.webm"]
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
      prefix: "motion.interrupt.",
      family: "motion.interrupt",
      tokens: ["reader.motion.duration.interruptSettle"],
      stateFields: ["interruptedMotionId", "reason", "fromState", "toState", "transientCleared"],
      platformComponents: {
        web: "MotionInterruptAdapter",
        android: "Motion state reducer",
        ios: "Motion state reducer",
        harmony: "Motion state reducer"
      },
      evidence: ["frontend-demo-optimized/verify/motion/interrupt/<motion-id>__<reason>.webm"]
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
      evidence: ["frontend-demo-optimized/verify/motion/viewport/<motion-id>__<viewport-class>__<route>.webm"]
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
      evidence: ["frontend-demo-optimized/verify/motion/tooling/<motion-id>.webm"]
    }
  ];

  const PREFIX_DURATIONS = [
    ["button.", 80],
    ["tab.", 120],
    ["dropdown.", 160],
    ["overlay.", 160],
    ["feedback.", 180],
    ["state.loading.", 800],
    ["toggle.", 140],
    ["slider.", 120],
    ["reader.entry.", 240],
    ["reader.session.", 180],
    ["reader.control.", 160],
    ["reader.page.", 220],
    ["viewport.", 240],
    ["app.route.", 160]
  ];

  function cloneStateMachine(machine) {
    const source = machine || DEFAULT_STATE_MACHINE;
    return Object.freeze({
      from: Object.freeze((source.from || []).slice()),
      to: Object.freeze((source.to || []).slice()),
      interrupt: Object.freeze((source.interrupt || []).slice()),
      finalState: String(source.finalState || DEFAULT_STATE_MACHINE.finalState),
      reducedMotion: String(source.reducedMotion || DEFAULT_STATE_MACHINE.reducedMotion)
    });
  }

  function stateMachineFor(id, rule) {
    const exact = MOTION_ID_STATE_MACHINES[id];
    const fallback = FAMILY_STATE_MACHINES[rule.family] || DEFAULT_STATE_MACHINE;
    return {
      source: exact ? "motion-id" : "family",
      machine: cloneStateMachine(exact || fallback)
    };
  }

  function contractFor(id) {
    const cleanId = normalizeMotionId(id);
    const rule = CONTRACT_RULES.find((item) => cleanId.startsWith(item.prefix));
    if (!rule) return null;
    const stateMachine = stateMachineFor(cleanId, rule);
    return Object.freeze({
      id: cleanId,
      family: rule.family,
      tokens: Object.freeze(rule.tokens.slice()),
      stateFields: Object.freeze(COMMON_STATE_FIELDS.concat(rule.stateFields)),
      platformComponents: Object.freeze(Object.assign({}, rule.platformComponents)),
      evidence: Object.freeze(rule.evidence.slice()),
      stateMachineSource: stateMachine.source,
      stateMachine: stateMachine.machine
    });
  }

  function clean(value) {
    return String(value == null ? "" : value)
      .replace(/[^\w./:-]/g, "")
      .slice(0, 96);
  }

  function normalizeMotionId(value) {
    const cleanId = clean(value);
    return MOTION_ID_ALIASES[cleanId] || cleanId;
  }

  function pressMotionIdFor(value) {
    const motionId = normalizeMotionId(value);
    return motionId.includes("press") && Object.prototype.hasOwnProperty.call(MOTION_ID_STATE_MACHINES, motionId)
      ? motionId
      : "button.activate";
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

  function easingFor(id, explicitEasing) {
    const requested = clean(explicitEasing || "");
    if (requested) return requested;
    return DEFAULT_EASINGS[id] || "ease";
  }

  function create(options) {
    const config = options || {};
    const root = config.root || null;
    const events = [];
    let active = null;
    let sequence = 0;
    let reducedOverride = config.reducedMotion;
    let runtimeProfile = config.runtimeProfile || null;

    const getRuntimeProfile = () => {
      if (runtimeProfile) return runtimeProfile;
      runtimeProfile = window.ReaderMotionRuntimeProfile?.create?.({ root }) || null;
      return runtimeProfile;
    };

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
        duration: transaction.duration,
        baseDuration: transaction.baseDuration,
        speed: transaction.speed,
        effectiveDuration: transaction.effectiveDuration,
        category: transaction.category,
        easing: transaction.easing,
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
      setAttr(root, "data-motion-duration", transaction.duration);
      setAttr(root, "data-motion-base-duration", transaction.baseDuration);
      setAttr(root, "data-motion-speed", transaction.speed);
      setAttr(root, "data-motion-category", transaction.category);
      setAttr(root, "data-motion-easing", transaction.easing);
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
        setAttr(root, "data-motion-duration", "");
        setAttr(root, "data-motion-base-duration", "");
        setAttr(root, "data-motion-speed", "");
        setAttr(root, "data-motion-category", "");
        setAttr(root, "data-motion-easing", "");
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
      const id = normalizeMotionId(details.id || "motion.unknown");
      if (active) {
        interrupt(details.interruptReason || "superseded");
      }
      const reducedMotion = reducedFrom(root, details.reducedMotion != null ? details.reducedMotion : reducedOverride);
      const baseDuration = durationFor(id, details.duration, false);
      const durationResolution = getRuntimeProfile()?.resolveDuration?.({
        motionId: id,
        baseDuration,
        reducedMotion
      }) || {
        baseDuration,
        speed: reducedMotion ? 0 : 1,
        effectiveDuration: durationFor(id, details.duration, reducedMotion),
        category: "",
        enabled: false,
        reducedMotion
      };
      // Freeze the effective duration at transaction start. Profile changes
      // affect the next transaction and never desynchronise an active timer.
      const effectiveDuration = Math.max(0, Number(durationResolution.effectiveDuration) || 0);
      const transaction = {
        id,
        contract: contractFor(id),
        action: clean(details.action || id),
        from: clean(details.from || ""),
        to: clean(details.to || ""),
        phase: "running",
        target: details.target || null,
        reducedMotion,
        baseDuration,
        speed: Number(durationResolution.speed) || 0,
        effectiveDuration,
        category: clean(durationResolution.category || ""),
        duration: effectiveDuration,
        easing: easingFor(id, details.easing),
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
        stateMachineSource: transaction.contract ? transaction.contract.stateMachineSource : "",
        finalState: transaction.contract && transaction.contract.stateMachine ? transaction.contract.stateMachine.finalState : "",
        unresolvedContract: transaction.contract ? "false" : "true"
      });
      if (transaction.duration === 0) {
        settle(transaction, transaction.reducedMotion ? "reduced-motion" : "debug-instant");
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
      getRuntimeProfile,
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
          root.removeAttribute("data-motion-duration");
          root.removeAttribute("data-motion-base-duration");
          root.removeAttribute("data-motion-speed");
          root.removeAttribute("data-motion-category");
          root.removeAttribute("data-motion-easing");
          root.removeAttribute("data-motion-reduced-active");
        }
      }
    };
  }

  window.ReaderMotionController = {
    create,
    contractFor,
    pressMotionIdFor,
    CONTRACT: Object.freeze({
      version: CONTRACT_VERSION,
      aliases: Object.freeze(Object.assign({}, MOTION_ID_ALIASES)),
      rules: Object.freeze(CONTRACT_RULES.map((rule) => Object.freeze(Object.assign({}, rule, {
        tokens: Object.freeze(rule.tokens.slice()),
        stateFields: Object.freeze(COMMON_STATE_FIELDS.concat(rule.stateFields)),
        evidence: Object.freeze(rule.evidence.slice()),
        platformComponents: Object.freeze(Object.assign({}, rule.platformComponents)),
        stateMachine: cloneStateMachine(FAMILY_STATE_MACHINES[rule.family] || DEFAULT_STATE_MACHINE)
      })))),
      motionIds: Object.freeze(Object.keys(MOTION_ID_STATE_MACHINES).sort().map((id) => Object.freeze({
        id,
        stateMachineSource: "motion-id",
        stateMachine: cloneStateMachine(MOTION_ID_STATE_MACHINES[id])
      })))
    }),
    DEFAULT_DURATIONS: Object.freeze(Object.assign({}, DEFAULT_DURATIONS))
  };
})(window);
