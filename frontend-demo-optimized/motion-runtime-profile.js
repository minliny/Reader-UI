(function attachReaderMotionRuntimeProfile(window) {
  "use strict";

  const STORAGE_KEY = "reader.dev.motionProfile.v1";
  const PROFILE_VERSION = 1;
  const MIN_SPEED = 0.25;
  const MAX_SPEED = 4;
  const MAX_EFFECTIVE_DURATION_MS = 60000;
  const CATEGORIES = Object.freeze([
    "navigation",
    "componentFeedback",
    "overlay",
    "readerControl",
    "readerReading",
    "session",
    "viewport",
    "loop"
  ]);

  const IMPLEMENTATION_KIND_CATEGORY = Object.freeze({
    routeTransition: "navigation",
    tabTransition: "navigation",
    overlayTransition: "overlay",
    stateReplace: "componentFeedback",
    readerEntry: "readerReading",
    readerPageTurn: "readerReading",
    directManipulation: "componentFeedback",
    sessionCapsule: "session",
    orientationReshape: "viewport",
    componentFeedback: "componentFeedback"
  });

  const EXPLICIT_CATEGORY_BY_ID = Object.freeze({
    "state.loading.inline": "loop",
    "reader.session.capsule.voiceIcon.active": "loop",
    "reader.control.handle.press": "readerControl",
    "reader.control.handle.drag": "readerControl",
    "reader.control.handle.release": "readerControl",
    "reader.control.dock.longPress": "readerControl",
    "reader.control.dock.drag": "readerControl",
    "reader.control.dock.release": "readerControl",
    "reader.control.dock.rebound": "readerControl"
  });

  const PREFIX_CATEGORY_RULES = Object.freeze([
    ["loop.", "loop"],
    ["viewport.", "viewport"],
    ["reader.control.", "readerControl"],
    ["reader.quick.", "readerControl"],
    ["reader.module.", "readerControl"],
    ["reader.panel.", "readerControl"],
    ["reader.page.", "readerReading"],
    ["reader.chapter.", "readerReading"],
    ["reader.entry.", "readerReading"],
    ["reader.session.", "session"],
    ["overlay.", "overlay"],
    ["dropdown.", "overlay"],
    ["feedback.", "componentFeedback"],
    ["component.", "componentFeedback"],
    ["app.route.", "navigation"],
    ["app.firstOpen.", "navigation"],
    ["tab.", "navigation"],
    ["segment.", "navigation"]
  ]);

  // Runtime custom properties sit between canonical tokens and the final
  // --fd-motion-effective-* layer. This lets reduced-motion keep final say.
  const CSS_DURATION_BINDINGS = Object.freeze([
    ["--fd-motion-runtime-first-open", 280, "app.firstOpen.enter"],
    ["--fd-motion-runtime-tab-press", 80, "tab.item.press"],
    ["--fd-motion-runtime-tab-select", 120, "tab.item.select"],
    ["--fd-motion-runtime-tab-switch", 160, "tab.switch"],
    ["--fd-motion-runtime-layout-switch", 320, "bookshelf.view.switch"],
    ["--fd-motion-runtime-button-press", 80, "card.press"],
    ["--fd-motion-runtime-button-activate", 120, "button.activate"],
    ["--fd-motion-runtime-toggle", 140, "toggle.switch"],
    ["--fd-motion-runtime-chip", 120, "chip.item.select"],
    ["--fd-motion-runtime-numeric", 120, "stepper.value.change"],
    ["--fd-motion-runtime-state", 160, "state.content.replace"],
    ["--fd-motion-runtime-feedback", 180, "feedback.toast.enter"],
    ["--fd-motion-runtime-dropdown-press", 80, "dropdown.trigger.press"],
    ["--fd-motion-runtime-dropdown-expand", 160, "dropdown.menu.expand"],
    ["--fd-motion-runtime-dropdown-collapse", 120, "dropdown.menu.collapse"],
    ["--fd-motion-runtime-dropdown-select", 120, "dropdown.option.select"],
    ["--fd-motion-runtime-reader-entry", 240, "reader.entry.actionToImmersive"],
    ["--fd-motion-runtime-handle-snap", 120, "reader.control.handle.release"],
    ["--fd-motion-runtime-dock-release", 120, "reader.control.dock.release"],
    ["--fd-motion-runtime-capsule-enter", 160, "reader.session.capsule.enter"],
    ["--fd-motion-runtime-capsule-control", 120, "reader.session.capsule.control.press-toggle"],
    ["--fd-motion-runtime-capsule-tick", 120, "reader.session.capsule.countdownTick"],
    ["--fd-motion-runtime-voice-pulse", 960, "reader.session.capsule.voiceIcon.active"],
    ["--fd-motion-runtime-running-space", 180, "reader.session.controlSpace.enter"],
    ["--fd-motion-runtime-orientation-freeze", 80, "viewport.orientation.prepare"],
    ["--fd-motion-runtime-viewport-reshape", 240, "viewport.orientation.reshape"],
    ["--fd-motion-runtime-orientation-settle", 240, "viewport.orientation.settle"],
    ["--fd-motion-runtime-interrupt-settle", 80, "motion.interrupt.cancel"],
    ["--fd-motion-runtime-overlay-fast", 120, "overlay.sheet.enter"],
    ["--fd-motion-runtime-overlay", 160, "overlay.dialog.enter"],
    ["--fd-motion-runtime-page-turn", 220, "reader.page.turn.next-prev"],
    ["--fd-motion-runtime-reader-control-show", 420, "reader.control.show"],
    ["--fd-motion-runtime-reader-control-hide", 360, "reader.control.hide"],
    ["--fd-motion-runtime-reader-quick-promote", 320, "reader.quick.promote"],
    ["--fd-motion-runtime-reader-module-switch", 360, "reader.module.switch"],
    ["--fd-motion-runtime-reader-panel-expand", 420, "reader.panel.expand"],
    ["--fd-motion-runtime-reader-panel-collapse", 360, "reader.panel.collapse"],
    ["--fd-motion-runtime-loading-spin", 800, "state.loading.inline"],
    ["--fd-motion-runtime-night-aurora", 14000, "loop.reader.nightAurora"],
    ["--fd-motion-runtime-tts-cursor-pulse", 1400, "loop.reader.ttsCursor"],
    ["--fd-motion-runtime-download-complete", 520, "feedback.download.complete"],
    ["--fd-motion-runtime-fullpage-press", 100, "component.reader.fullpage.press"],
    ["--fd-motion-runtime-typography-feedback", 120, "component.reader.typography.feedback"]
  ].map((binding) => Object.freeze(binding.slice())));

  const instancesByRoot = typeof WeakMap === "function" ? new WeakMap() : null;
  let rootlessInstance = null;

  function defaultCategories() {
    return Object.fromEntries(CATEGORIES.map((category) => [category, 1]));
  }

  function defaultState() {
    return {
      version: PROFILE_VERSION,
      enabled: false,
      globalSpeed: 1,
      categories: defaultCategories()
    };
  }

  function normalizedSpeed(value, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    if (numeric === 0) return 0;
    return Math.min(MAX_SPEED, Math.max(MIN_SPEED, numeric));
  }

  function sanitizeState(value) {
    const source = value && typeof value === "object" ? value : {};
    const categories = defaultCategories();
    const sourceCategories = source.categories && typeof source.categories === "object" ? source.categories : {};
    CATEGORIES.forEach((category) => {
      categories[category] = normalizedSpeed(sourceCategories[category], 1);
    });
    return {
      version: PROFILE_VERSION,
      enabled: source.enabled === true,
      globalSpeed: normalizedSpeed(source.globalSpeed, 1),
      categories
    };
  }

  function snapshotOf(state) {
    return {
      version: PROFILE_VERSION,
      enabled: state.enabled,
      globalSpeed: state.globalSpeed,
      categories: Object.assign({}, state.categories)
    };
  }

  function implementationKindFor(motionId) {
    try {
      return window.ReaderD5MotionClosureRenderers?.getMotionMeta?.(motionId)?.implementationKind || "";
    } catch (error) {
      return "";
    }
  }

  function categoryFor(motionId) {
    const id = String(motionId || "");
    if (Object.prototype.hasOwnProperty.call(EXPLICIT_CATEGORY_BY_ID, id)) {
      return EXPLICIT_CATEGORY_BY_ID[id];
    }
    // Reader control transitions are deliberately grouped together even when
    // their canonical implementationKind is overlayTransition/tabTransition.
    const readerControlPrefix = PREFIX_CATEGORY_RULES.find(([prefix, category]) => (
      category === "readerControl" && id.startsWith(prefix)
    ));
    if (readerControlPrefix) return readerControlPrefix[1];
    if (id.startsWith("loop.")) return "loop";
    const implementationCategory = IMPLEMENTATION_KIND_CATEGORY[implementationKindFor(id)];
    if (implementationCategory) {
      if (implementationCategory === "componentFeedback" && id.startsWith("reader.control.")) {
        return "readerControl";
      }
      return implementationCategory;
    }
    const prefixRule = PREFIX_CATEGORY_RULES.find(([prefix]) => id.startsWith(prefix));
    return prefixRule ? prefixRule[1] : "componentFeedback";
  }

  function readStoredState(storage) {
    if (!storage || typeof storage.getItem !== "function") return defaultState();
    try {
      const raw = storage.getItem(STORAGE_KEY);
      return raw == null ? defaultState() : sanitizeState(JSON.parse(raw));
    } catch (error) {
      return defaultState();
    }
  }

  function setAttribute(root, name, value) {
    if (!root || typeof root.setAttribute !== "function") return;
    if (value == null || value === "") {
      root.removeAttribute?.(name);
      return;
    }
    root.setAttribute(name, String(value));
  }

  function create(options) {
    const config = options || {};
    const root = config.root || null;
    if (root && instancesByRoot?.has(root)) return instancesByRoot.get(root);
    if (!root && rootlessInstance) return rootlessInstance;

    let storage = null;
    if (Object.prototype.hasOwnProperty.call(config, "storage")) {
      storage = config.storage;
    } else {
      try {
        storage = window.localStorage || null;
      } catch (error) {
        storage = null;
      }
    }
    let state = readStoredState(storage);
    const listeners = new Set();

    const resolveDuration = (input) => {
      const details = input || {};
      const motionId = String(details.motionId || details.id || "");
      const baseDuration = Math.max(0, Number(details.baseDuration) || 0);
      const category = categoryFor(motionId);
      const reducedMotion = details.reducedMotion === true;
      const categorySpeed = state.categories[category] ?? 1;
      const speed = state.enabled
        ? (state.globalSpeed === 0 || categorySpeed === 0 ? 0 : state.globalSpeed * categorySpeed)
        : 1;
      const effectiveDuration = reducedMotion || speed === 0
        ? 0
        : Math.min(MAX_EFFECTIVE_DURATION_MS, Math.max(0, Math.round(baseDuration / speed)));
      return {
        baseDuration,
        speed: reducedMotion ? 0 : speed,
        effectiveDuration,
        category,
        enabled: state.enabled,
        reducedMotion,
        globalSpeed: state.globalSpeed,
        categorySpeed
      };
    };

    const clearRuntimeProperties = () => {
      if (!root?.style || typeof root.style.removeProperty !== "function") return;
      CSS_DURATION_BINDINGS.forEach(([property]) => root.style.removeProperty(property));
    };

    const applyCss = () => {
      if (!root) return;
      setAttribute(root, "data-motion-speed-profile", state.enabled ? "enabled" : "disabled");
      setAttribute(root, "data-motion-speed-global", state.globalSpeed);
      CATEGORIES.forEach((category) => {
        const speed = state.categories[category];
        setAttribute(root, `data-motion-speed-${category}`, speed);
        setAttribute(root, `data-motion-speed-${category}-instant`, state.enabled && (state.globalSpeed === 0 || speed === 0) ? "true" : "false");
      });
      if (!state.enabled) {
        clearRuntimeProperties();
        return;
      }
      if (!root.style || typeof root.style.setProperty !== "function") return;
      CSS_DURATION_BINDINGS.forEach(([property, baseDuration, motionId]) => {
        const resolution = resolveDuration({ motionId, baseDuration, reducedMotion: false });
        root.style.setProperty(property, `${resolution.effectiveDuration}ms`);
      });
    };

    const persist = () => {
      if (!storage || typeof storage.setItem !== "function") return;
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(snapshotOf(state)));
      } catch (error) {
        // Developer overrides must remain usable when storage is unavailable.
      }
    };

    const notify = (reason) => {
      applyCss();
      const snapshot = snapshotOf(state);
      listeners.forEach((listener) => listener(snapshot, reason));
      if (root && typeof root.dispatchEvent === "function" && typeof window.CustomEvent === "function") {
        root.dispatchEvent(new window.CustomEvent("reader-motion-profile-change", {
          detail: Object.assign({ reason }, snapshot)
        }));
      }
      return snapshot;
    };

    const setEnabled = (value) => {
      state.enabled = Boolean(value);
      persist();
      return notify("enabled");
    };

    const setSpeed = (scope, value) => {
      const normalizedScope = String(scope || "");
      if (normalizedScope !== "global" && !CATEGORIES.includes(normalizedScope)) {
        throw new TypeError(`Unknown motion speed scope: ${normalizedScope}`);
      }
      const current = normalizedScope === "global" ? state.globalSpeed : state.categories[normalizedScope];
      const speed = normalizedSpeed(value, current);
      if (normalizedScope === "global") {
        state.globalSpeed = speed;
      } else {
        state.categories[normalizedScope] = speed;
      }
      persist();
      return notify(`speed:${normalizedScope}`);
    };

    const reset = () => {
      state = defaultState();
      if (storage && typeof storage.removeItem === "function") {
        try {
          storage.removeItem(STORAGE_KEY);
        } catch (error) {
          // Ignore unavailable storage; the in-memory reset still applies.
        }
      }
      return notify("reset");
    };

    const handleStorage = (event) => {
      if (event && event.key !== STORAGE_KEY) return;
      state = readStoredState(storage);
      notify("storage");
    };

    if (typeof window.addEventListener === "function") {
      window.addEventListener("storage", handleStorage);
    }

    const api = {
      getSnapshot() {
        return snapshotOf(state);
      },
      setEnabled,
      setSpeed,
      reset,
      resolveDuration,
      applyCss,
      subscribe(listener) {
        if (typeof listener !== "function") return () => {};
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      destroy() {
        listeners.clear();
        if (typeof window.removeEventListener === "function") {
          window.removeEventListener("storage", handleStorage);
        }
        if (root && instancesByRoot) instancesByRoot.delete(root);
        if (!root && rootlessInstance === api) rootlessInstance = null;
      }
    };

    if (root && instancesByRoot) instancesByRoot.set(root, api);
    if (!root) rootlessInstance = api;
    applyCss();
    return api;
  }

  window.ReaderMotionRuntimeProfile = Object.freeze({
    create,
    categoryFor,
    STORAGE_KEY,
    CATEGORIES,
    CSS_DURATION_BINDINGS,
    LIMITS: Object.freeze({ minSpeed: MIN_SPEED, maxSpeed: MAX_SPEED, maxEffectiveDurationMs: MAX_EFFECTIVE_DURATION_MS })
  });
})(window);
