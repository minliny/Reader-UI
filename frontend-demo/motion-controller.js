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
      }
      dispatch("start", transaction);
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
    DEFAULT_DURATIONS: Object.freeze(Object.assign({}, DEFAULT_DURATIONS))
  };
})(window);
