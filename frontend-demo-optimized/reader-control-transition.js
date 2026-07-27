(function attachReaderControlTransition(window) {
  "use strict";

  const MOTION_IDS = Object.freeze([
    "reader.control.show",
    "reader.control.hide",
    "reader.quick.promote",
    "reader.module.switch",
    "reader.panel.expand",
    "reader.panel.collapse"
  ]);

  const MOTION_ID_SET = new Set(MOTION_IDS);
  const FALLBACK_SPECS = Object.freeze({
    "reader.control.show": Object.freeze({ duration: 420, easing: "ease-out" }),
    "reader.control.hide": Object.freeze({ duration: 360, easing: "ease-in" }),
    "reader.quick.promote": Object.freeze({ duration: 320, easing: "ease-out" }),
    "reader.module.switch": Object.freeze({ duration: 360, easing: "ease" }),
    "reader.panel.expand": Object.freeze({ duration: 420, easing: "ease-out" }),
    "reader.panel.collapse": Object.freeze({ duration: 360, easing: "ease-in" })
  });

  const PARTS_BY_ID = Object.freeze({
    "reader.control.show": Object.freeze(["topbar", "panel", "nav"]),
    "reader.control.hide": Object.freeze(["topbar", "panel", "nav"]),
    "reader.quick.promote": Object.freeze(["panel"]),
    "reader.module.switch": Object.freeze(["panel"]),
    "reader.panel.expand": Object.freeze(["panel"]),
    "reader.panel.collapse": Object.freeze(["panel"])
  });

  const PART_SELECTORS = Object.freeze({
    topbar: '[data-dev-region="ReaderTopBar"]',
    panel: '[data-slot="bottomSheetHost"]',
    nav: '[data-slot="readerModuleNav"]'
  });

  const ROOT_TRANSIENT_ATTRIBUTES = Object.freeze([
    "data-motion-reader-control",
    "data-motion-reader-id",
    "data-motion-reader-phase",
    "data-motion-reader-from",
    "data-motion-reader-to",
    "data-motion-reader-sequence",
    "data-motion-reader-duration",
    "data-motion-reader-easing"
  ]);

  const FRAME_TRANSIENT_ATTRIBUTES = Object.freeze([
    "data-motion-reader-control",
    "data-motion-reader-id",
    "data-motion-reader-phase",
    "data-motion-reader-from",
    "data-motion-reader-to",
    "data-motion-reader-sequence"
  ]);

  function accepts(id) {
    return MOTION_ID_SET.has(String(id || ""));
  }

  function backDecision(input) {
    const details = input || {};
    const route = String(details.route || "");
    const mode = String(details.mode || "");
    const quickExpanded = String(details.quickExpanded || "");
    const targetRoute = String(details.targetRoute || "");
    if (quickExpanded) {
      return {
        id: "reader.panel.collapse",
        action: "system-back-collapse-panel",
        from: `${route}:full`,
        to: `${route}:quick`,
        targetRoute: route
      };
    }
    if (mode === "full" && targetRoute) {
      return {
        id: "reader.panel.collapse",
        action: "system-back-collapse-panel",
        from: route,
        to: targetRoute,
        targetRoute
      };
    }
    if (mode && mode !== "immersive") {
      return {
        id: "reader.control.hide",
        action: "system-back-hide-control",
        from: route,
        to: "immersive-reading",
        targetRoute: "immersive-reading"
      };
    }
    return null;
  }

  function frameFor(screenHost) {
    return screenHost?.querySelector?.('[data-slot="readerFrame"]') || null;
  }

  function readingRect(frame) {
    const surface = frame?.querySelector?.('[data-slot="readingSurface"]');
    if (!surface || typeof surface.getBoundingClientRect !== "function") return null;
    const rect = surface.getBoundingClientRect();
    return {
      x: Math.round(Number(rect.x ?? rect.left ?? 0) * 10) / 10,
      y: Math.round(Number(rect.y ?? rect.top ?? 0) * 10) / 10,
      width: Math.round(Number(rect.width || 0) * 10) / 10,
      height: Math.round(Number(rect.height || 0) * 10) / 10
    };
  }

  function rectSignature(rect) {
    if (!rect) return "none";
    return `${rect.x},${rect.y},${rect.width},${rect.height}`;
  }

  function sameRect(left, right) {
    return Boolean(left && right && rectSignature(left) === rectSignature(right));
  }

  function visiblePart(frame, part) {
    const selector = PART_SELECTORS[part];
    const element = selector ? frame?.querySelector?.(selector) : null;
    if (!element) return null;
    if (part === "panel" && element.classList?.contains?.("fd-reader-sheet-empty")) return null;
    if (part === "nav" && element.classList?.contains?.("fd-reader-module-nav-empty")) return null;
    return element;
  }

  function captureParts(frame, motionId) {
    if (!frame) return [];
    return (PARTS_BY_ID[motionId] || []).flatMap((part) => {
      const element = visiblePart(frame, part);
      if (!element || typeof element.cloneNode !== "function" || typeof element.getBoundingClientRect !== "function") {
        return [];
      }
      const rect = element.getBoundingClientRect();
      return [{
        part,
        clone: element.cloneNode(true),
        rect: {
          left: Number(rect.left ?? rect.x ?? 0),
          top: Number(rect.top ?? rect.y ?? 0),
          width: Number(rect.width || 0),
          height: Number(rect.height || 0)
        }
      }];
    });
  }

  function stripCloneIdentity(clone) {
    if (!clone) return;
    clone.removeAttribute?.("data-slot");
    clone.removeAttribute?.("data-dev-region");
    clone.removeAttribute?.("id");
    clone.querySelectorAll?.("[data-slot], [data-dev-region], [id]").forEach((element) => {
      element.removeAttribute?.("data-slot");
      element.removeAttribute?.("data-dev-region");
      element.removeAttribute?.("id");
    });
    clone.setAttribute?.("aria-hidden", "true");
    clone.setAttribute?.("inert", "");
    clone.setAttribute?.("data-motion-reader-role", "outgoing");
    clone.classList?.add?.("fd-reader-control-transition-clone");
  }

  function placeOutgoing(snapshot, targetFrame) {
    const clone = snapshot.clone;
    const frameRect = targetFrame.getBoundingClientRect();
    stripCloneIdentity(clone);
    clone.setAttribute?.("data-motion-reader-part", snapshot.part);
    Object.assign(clone.style || {}, {
      position: "absolute",
      left: `${snapshot.rect.left - Number(frameRect.left ?? frameRect.x ?? 0)}px`,
      top: `${snapshot.rect.top - Number(frameRect.top ?? frameRect.y ?? 0)}px`,
      right: "auto",
      bottom: "auto",
      width: `${snapshot.rect.width}px`,
      height: `${snapshot.rect.height}px`,
      margin: "0",
      transform: "none",
      pointerEvents: "none"
    });
    targetFrame.appendChild(clone);
    return clone;
  }

  function markIncoming(frame, motionId) {
    return (PARTS_BY_ID[motionId] || []).flatMap((part) => {
      const element = visiblePart(frame, part);
      if (!element) return [];
      element.setAttribute("data-motion-reader-role", "incoming");
      element.setAttribute("data-motion-reader-part", part);
      return [element];
    });
  }

  function clearPartState(element) {
    if (!element) return;
    element.removeAttribute?.("data-motion-reader-role");
    element.removeAttribute?.("data-motion-reader-part");
  }

  function setAttributes(element, attributes) {
    if (!element) return;
    Object.entries(attributes).forEach(([name, value]) => {
      if (value == null || value === "") {
        element.removeAttribute?.(name);
      } else {
        element.setAttribute?.(name, String(value));
      }
    });
  }

  function removeAttributes(element, attributes) {
    attributes.forEach((name) => element?.removeAttribute?.(name));
  }

  function create(options) {
    const config = options || {};
    const root = config.root || null;
    const screenHost = config.screenHost || null;
    const motionController = config.motionController || null;
    let active = null;
    let sequence = 0;
    let reducedOverride = config.reducedMotion;

    const reduced = () => {
      if (reducedOverride != null) return Boolean(reducedOverride);
      return root?.getAttribute?.("data-motion-reduced") === "true";
    };

    const applyPhase = (transaction, phase) => {
      if (!transaction) return;
      transaction.phase = phase;
      const attributes = {
        "data-motion-reader-control": "true",
        "data-motion-reader-id": transaction.id,
        "data-motion-reader-phase": phase,
        "data-motion-reader-from": transaction.from,
        "data-motion-reader-to": transaction.to,
        "data-motion-reader-sequence": transaction.sequence
      };
      setAttributes(root, Object.assign({}, attributes, {
        "data-motion-reader-duration": transaction.duration,
        "data-motion-reader-easing": transaction.easing
      }));
      setAttributes(transaction.frame, attributes);
    };

    const settle = (reason) => {
      const transaction = active;
      if (!transaction) return null;
      if (transaction.raf) {
        window.cancelAnimationFrame?.(transaction.raf);
        transaction.raf = 0;
      }
      if (transaction.timer) {
        window.clearTimeout(transaction.timer);
        transaction.timer = 0;
      }
      transaction.outgoing.forEach((element) => element.remove?.());
      transaction.incoming.forEach(clearPartState);
      removeAttributes(transaction.frame, FRAME_TRANSIENT_ATTRIBUTES);
      removeAttributes(root, ROOT_TRANSIENT_ATTRIBUTES);
      setAttributes(root, {
        "data-motion-reader-last-id": transaction.id,
        "data-motion-reader-last-reason": reason || "complete",
        "data-motion-reader-last-sequence": transaction.sequence
      });
      transaction.phase = "settled";
      transaction.reason = reason || "complete";
      active = null;
      motionController?.settle?.(transaction.controllerTransaction, transaction.reason);
      return transaction;
    };

    const run = (input) => {
      const details = input || {};
      const id = String(details.id || "");
      if (!accepts(id) || typeof details.commit !== "function") return null;
      if (active) settle(details.interruptReason || "superseded");

      const sourceFrame = frameFor(screenHost);
      const beforeRect = readingRect(sourceFrame);
      const snapshots = captureParts(sourceFrame, id);
      details.commit();

      const targetFrame = frameFor(screenHost);
      if (!targetFrame) {
        return null;
      }
      const afterRect = readingRect(targetFrame);
      const spec = FALLBACK_SPECS[id];
      const controllerTransaction = motionController?.start?.({
        id,
        action: details.action || id,
        from: details.from || "",
        to: details.to || "",
        target: targetFrame,
        reducedMotion: reduced()
      }) || null;
      const duration = Number(controllerTransaction?.duration ?? (reduced() ? 0 : spec.duration));
      const easing = String(controllerTransaction?.easing || spec.easing);
      const incoming = markIncoming(targetFrame, id);
      const outgoing = snapshots.map((snapshot) => placeOutgoing(snapshot, targetFrame));
      const transaction = {
        id,
        action: details.action || id,
        from: String(details.from || ""),
        to: String(details.to || ""),
        sequence: ++sequence,
        phase: "prepare",
        duration: Number.isFinite(duration) ? Math.max(0, duration) : spec.duration,
        easing,
        frame: targetFrame,
        outgoing,
        incoming,
        controllerTransaction,
        raf: 0,
        timer: 0
      };
      active = transaction;
      setAttributes(root, {
        "data-motion-reader-reading-before": rectSignature(beforeRect),
        "data-motion-reader-reading-after": rectSignature(afterRect),
        "data-motion-reader-reading-stable": sameRect(beforeRect, afterRect) ? "true" : "false"
      });
      applyPhase(transaction, "prepare");
      targetFrame.getBoundingClientRect?.();

      if (reduced() || transaction.duration === 0) {
        return settle("reduced-motion");
      }

      transaction.raf = window.requestAnimationFrame(() => {
        if (active !== transaction) return;
        transaction.raf = 0;
        applyPhase(transaction, "running");
        transaction.timer = window.setTimeout(() => settle("complete"), transaction.duration);
      });
      return transaction;
    };

    const settleNow = (reason) => settle(reason || "settle-now");

    return {
      run,
      accepts,
      settleNow,
      setReducedMotion(value) {
        reducedOverride = value == null ? null : Boolean(value);
        motionController?.setReducedMotion?.(reducedOverride);
        if (reducedOverride === true) {
          settle("reduced-motion");
        }
      },
      getSnapshot() {
        if (!active) return { active: null, sequence };
        return {
          active: {
            id: active.id,
            action: active.action,
            from: active.from,
            to: active.to,
            sequence: active.sequence,
            phase: active.phase,
            duration: active.duration,
            easing: active.easing
          },
          sequence
        };
      },
      destroy() {
        settle("destroy");
        removeAttributes(root, ROOT_TRANSIENT_ATTRIBUTES);
      }
    };
  }

  window.ReaderControlTransition = Object.freeze({
    create,
    accepts,
    backDecision,
    MOTION_IDS,
    SPECS: FALLBACK_SPECS,
    PARTS_BY_ID
  });
})(window);
