(function attachReaderMotionController(window) {
  "use strict";

  const DEFAULT_DURATIONS = {
    "app.firstOpen.enter": 280,
    "app.route.push.forward": 160,
    "app.route.pop.backward": 160,
    "app.route.replace": 160,
    "tab.item.press": 80,
    "tab.item.switch": 160,
    "segment.item.switch": 160,
    "button.press": 80,
    "dropdown.trigger.press": 80,
    "dropdown.menu.expand": 160,
    "dropdown.menu.collapse": 120,
    "dropdown.menu.reposition": 160,
    "dropdown.option.press": 80,
    "dropdown.option.select": 120,
    "reader.entry.coverToImmersive": 240,
    "reader.entry.actionToImmersive": 200,
    "reader.session.tts.start": 200,
    "reader.session.autoPage.start": 200,
    "reader.session.capsule.control.press/toggle": 120,
    "reader.control.handle.press": 80,
    "reader.control.handle.drag": 0,
    "reader.control.handle.release": 120,
    "reader.control.dock.longPress": 320,
    "reader.control.dock.drag": 0,
    "reader.control.dock.release": 120,
    "reader.control.dock.rebound": 120,
    "reader.module.switch": 160,
    "reader.page.turn.next/prev": 220,
    "viewport.orientation.reshape": 240
  };

  const CONTRACT_VERSION = "reader-motion-contract-v1";
  const COMMON_STATE_FIELDS = ["motionId", "phase", "reducedMotion", "sequence"];
  const COMMON_EVIDENCE = ["frontend-demo/verify/motion/selector-matrix/<motion-id>__<route>__<selector>.webm"];
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
      from: ["grid", "list"],
      to: ["grid", "list"],
      interrupt: ["routeChange", "filterChange", "scrollAnchorLost"],
      finalState: "viewModeCommitted",
      reducedMotion: "Switch view mode while preserving item identity and scroll anchor."
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
    "dropdown.menu.expand/collapse": {
      from: ["closed", "open"],
      to: ["open", "closed"],
      interrupt: ["openAnotherDropdown", "back", "routeChange", "viewportChanged"],
      finalState: "closedOrOpenAtLegalAnchor",
      reducedMotion: "Commit final open/closed state immediately after anchor measurement."
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
      from: ["pressed", "enabled"],
      to: ["commandCommitted", "loading", "idle"],
      interrupt: ["disabledBeforeRelease", "routeChange", "submitCancelled"],
      finalState: "commandStateResolved",
      reducedMotion: "Commit button command state without scale or label crossfade."
    },
    "toggle.switch": {
      from: ["checked.previous"],
      to: ["checked.next"],
      interrupt: ["revert", "routeChange", "pointerCancel"],
      finalState: "checkedSemanticsCommitted",
      reducedMotion: "Update check/thumb/background and semantics instantly."
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
      from: ["controlLayerVisible"],
      to: ["immersiveReading"],
      interrupt: ["showAgain", "routeChange", "orientationPrepare"],
      finalState: "immersiveReadingHotZonesRestored",
      reducedMotion: "Hide control layer immediately and restore immersive hit regions."
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
    "reader.session.capsule.control.press/toggle": {
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
      from: ["readerModule.previous", "controlLayerVisible"],
      to: ["readerModule.next", "controlLayerVisible"],
      interrupt: ["routeChange", "switchTargetAgain", "hideControlLayer"],
      finalState: "oneActiveReaderModuleAndStableModuleBar",
      reducedMotion: "Commit active module and panel content immediately; keep module nav dimensions stable."
    },
    "reader.page.turn.next/prev": {
      from: ["page.current"],
      to: ["page.nextOrPrevious"],
      interrupt: ["oppositeTurn", "chapterJump", "routeChange", "sessionTick"],
      finalState: "pageIndexCommittedAndPageInfoAnchored",
      reducedMotion: "Commit page index and footer/page info immediately without slide."
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
    const cleanId = clean(id);
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
        stateMachineSource: transaction.contract ? transaction.contract.stateMachineSource : "",
        finalState: transaction.contract && transaction.contract.stateMachine ? transaction.contract.stateMachine.finalState : "",
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
