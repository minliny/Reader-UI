(function attachReaderMotionScenarioHarness(window) {
  "use strict";

  const SCENARIO_MODES = Object.freeze(["normal", "rapid-repeat", "opposite", "interrupt", "reduced"]);
  const CORE_FAMILIES = Object.freeze([
    Object.freeze({
      id: "route-tab-flow",
      label: "Route / Tab Page Flow",
      primaryId: "app.route.push.forward",
      oppositeId: "app.route.pop.backward",
      request: Object.freeze({ operation: "push", containerRole: "appShell" }),
      viewports: Object.freeze(["phone", "compact", "tablet"]),
      production: true
    }),
    Object.freeze({
      id: "reader-entry",
      label: "Cover / Action to Reader",
      primaryId: "reader.entry.coverToImmersive",
      oppositeId: "reader.entry.actionToImmersive",
      request: Object.freeze({
        fromRoute: "bookshelf",
        toRoute: "reader",
        operation: "push",
        sourceRole: "bookCover",
        targetRole: "readerSurface"
      }),
      viewports: Object.freeze(["phone", "compact", "tablet"]),
      production: true
    }),
    Object.freeze({
      id: "reader-page-chapter",
      label: "Page Turn / Chapter Jump",
      primaryId: "reader.page.turn.next-prev",
      oppositeId: "reader.chapter.jump",
      viewports: Object.freeze(["phone", "compact", "tablet"]),
      production: true
    }),
    Object.freeze({
      id: "reader-control-module",
      label: "Reader Control / Module",
      primaryId: "reader.control.show",
      oppositeId: "reader.control.hide",
      viewports: Object.freeze(["phone", "compact", "tablet"]),
      production: true
    }),
    Object.freeze({
      id: "handle-dock-slider",
      label: "Handle / Dock / Slider",
      primaryId: "slider.drag.update",
      oppositeId: "slider.drag.release",
      viewports: Object.freeze(["phone", "compact", "tablet"]),
      production: true
    }),
    Object.freeze({
      id: "session-capsule",
      label: "Session Capsule",
      primaryId: "reader.session.capsule.enter",
      oppositeId: "reader.session.capsule.exit",
      viewports: Object.freeze(["phone", "compact", "tablet"]),
      production: true
    }),
    Object.freeze({
      id: "capsule-anchor-reserved",
      label: "Capsule Anchor Morph (reserved)",
      primaryId: "reader.session.controlSpace.enter",
      oppositeId: "reader.session.controlSpace.exit",
      viewports: Object.freeze(["phone", "compact", "tablet"]),
      production: false
    }),
    Object.freeze({
      id: "tts-auto-page-local",
      label: "TTS / Auto-page Local State",
      primaryId: "reader.session.tts.start",
      oppositeId: "reader.session.autoPage.start",
      viewports: Object.freeze(["phone", "compact", "tablet"]),
      production: true
    }),
    Object.freeze({
      id: "edge-overlay-source",
      label: "Edge Tools / Overlay / Source Switch",
      primaryId: "overlay.sheet.enter",
      oppositeId: "overlay.sheet.exit",
      viewports: Object.freeze(["phone", "compact", "tablet"]),
      production: true
    }),
    Object.freeze({
      id: "orientation-interrupt",
      label: "Orientation / Interrupt",
      primaryId: "viewport.orientation.reshape",
      oppositeId: "motion.interrupt.redirect",
      viewports: Object.freeze(["phone", "compact", "tablet"]),
      production: true
    })
  ]);

  const INTERRUPT_POLICY_IDS = Object.freeze({
    completeThenReplace: "app.firstOpen.enter",
    redirect: "app.route.push.forward",
    cancel: "app.route.pop.backward",
    updateInSameHost: "feedback.toast.enter"
  });

  function create(options) {
    const controller = options?.controller;
    const registry = options?.registry || window.ReaderMotionContractRegistry;
    if (!controller || !registry) throw new Error("motion scenario harness requires controller and canonical registry");

    function settleActive(reason) {
      const active = controller.getSnapshot().active;
      if (active) controller.settle(undefined, reason || "scenario-complete");
    }

    function runScenario(input) {
      const family = CORE_FAMILIES.find((candidate) => candidate.id === input?.familyId);
      if (!family) throw new Error(`unknown motion family: ${input?.familyId || "<missing>"}`);
      const mode = input?.mode || "normal";
      if (!SCENARIO_MODES.includes(mode)) throw new Error(`unknown motion scenario mode: ${mode}`);
      const viewport = input?.viewport || family.viewports[0];
      if (!family.viewports.includes(viewport)) throw new Error(`unsupported viewport ${viewport} for ${family.id}`);
      if (!family.production && input?.allowReserved !== true) {
        return Object.freeze({
          familyId: family.id,
          mode,
          viewport,
          status: "reserved",
          passed: true,
          motionIds: Object.freeze([family.primaryId])
        });
      }

      const beforeSequence = controller.getSnapshot().events.at(-1)?.sequence || 0;
      const primaryInput = family.request
        ? { request: family.request, reducedMotion: mode === "reduced" }
        : { id: family.primaryId, reducedMotion: mode === "reduced" };
      const primary = controller.start(primaryInput);
      if (primary.id !== family.primaryId) {
        throw new Error(`${family.id} resolved ${primary.id}, expected ${family.primaryId}`);
      }

      if (mode === "rapid-repeat") {
        controller.start({ id: family.primaryId, interruptReason: "rapid-repeat" });
      } else if (mode === "opposite") {
        controller.start({ id: family.oppositeId, interruptReason: "opposite-operation" });
      } else if (mode === "interrupt") {
        controller.interrupt("scenario-interrupt");
        controller.start({ id: "motion.interrupt.redirect" });
      }
      settleActive(mode === "reduced" ? "reduced-motion" : "scenario-complete");

      const snapshot = controller.getSnapshot();
      const events = snapshot.events
        .filter((event) => event.sequence > beforeSequence)
        .map((event) => Object.freeze(Object.assign({}, event)));
      const lastStartedId = [...events].reverse().find((event) => event.type === "start")?.id || primary.id;
      const lastSpec = registry.specFor(lastStartedId);
      const trace = {
        familyId: family.id,
        mode,
        viewport,
        status: "executed",
        production: family.production,
        motionIds: Object.freeze([...new Set(events.map((event) => event.id))]),
        finalMotionId: lastStartedId,
        finalState: lastSpec?.finalState || "settled",
        cleanup: Object.freeze((lastSpec?.cleanup || []).slice()),
        reducedMotion: mode === "reduced",
        events: Object.freeze(events),
        passed: snapshot.active === null && Boolean(lastSpec)
      };
      return Object.freeze(trace);
    }

    function runInterruptPolicy(policy) {
      const currentId = INTERRUPT_POLICY_IDS[policy];
      const currentSpec = registry.specFor(currentId);
      if (!currentSpec || currentSpec.interruptPolicy !== policy) {
        throw new Error(`canonical interrupt policy fixture missing: ${policy}`);
      }
      const beforeSequence = controller.getSnapshot().events.at(-1)?.sequence || 0;
      controller.start({ id: currentId });
      if (policy === "redirect") {
        controller.start({ id: "app.route.replace", interruptReason: "policy-redirect" });
      } else if (policy === "cancel") {
        controller.interrupt("policy-cancel");
      } else if (policy === "completeThenReplace") {
        controller.settle(undefined, "policy-complete");
        controller.start({ id: "app.route.replace" });
      } else if (policy === "updateInSameHost") {
        controller.update({ action: "feedback.toast.update", to: "toast.updated" });
      }
      settleActive(`policy-${policy}`);
      const snapshot = controller.getSnapshot();
      return Object.freeze({
        policy,
        sourceMotionId: currentId,
        events: Object.freeze(snapshot.events
          .filter((event) => event.sequence > beforeSequence)
          .map((event) => Object.freeze(Object.assign({}, event)))),
        passed: snapshot.active === null
      });
    }

    return Object.freeze({
      runScenario,
      runSuite() {
        return Object.freeze(CORE_FAMILIES.flatMap((family) => (
          SCENARIO_MODES.map((mode) => runScenario({ familyId: family.id, mode }))
        )));
      },
      runInterruptPolicySuite() {
        return Object.freeze(Object.keys(INTERRUPT_POLICY_IDS).map(runInterruptPolicy));
      }
    });
  }

  window.ReaderMotionScenarioHarness = Object.freeze({
    create,
    families: CORE_FAMILIES,
    scenarioModes: SCENARIO_MODES,
    interruptPolicyIds: INTERRUPT_POLICY_IDS
  });
})(window);
