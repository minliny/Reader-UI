import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(here, "../..");
const repoRoot = join(demoRoot, "..");

const readDemo = (relativePath) => readFileSync(join(demoRoot, relativePath), "utf8");
const partNames = (nodes) => [...nodes].map((node) => node.getAttribute("data-motion-reader-part"));
const plain = (value) => JSON.parse(JSON.stringify(value));

class FakeClassList {
  constructor(values = []) {
    this.values = new Set(values);
  }

  add(...values) {
    values.forEach((value) => this.values.add(value));
  }

  remove(...values) {
    values.forEach((value) => this.values.delete(value));
  }

  contains(value) {
    return this.values.has(value);
  }

  clone() {
    return new FakeClassList([...this.values]);
  }
}

function selectorMatches(element, selector) {
  const normalized = selector.trim();
  if (!normalized) return false;
  const notClass = normalized.match(/:not\(\.([a-z0-9_-]+)\)/i)?.[1] || "";
  if (notClass && element.classList.contains(notClass)) return false;
  const base = normalized.replace(/:not\(\.[a-z0-9_-]+\)/gi, "");
  if (base.startsWith(".")) return element.classList.contains(base.slice(1));
  const attribute = base.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
  if (!attribute) return false;
  const [, name, value] = attribute;
  if (!element.hasAttribute(name)) return false;
  return value == null || element.getAttribute(name) === value;
}

class FakeElement {
  constructor({ attributes = {}, classes = [], rect = {} } = {}) {
    this.attributes = new Map(Object.entries(attributes).map(([key, value]) => [key, String(value)]));
    this.classList = new FakeClassList(classes);
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.isConnected = true;
    this.rect = {
      x: rect.x ?? rect.left ?? 0,
      y: rect.y ?? rect.top ?? 0,
      left: rect.left ?? rect.x ?? 0,
      top: rect.top ?? rect.y ?? 0,
      width: rect.width ?? 0,
      height: rect.height ?? 0
    };
  }

  appendChild(child) {
    child.parentNode = this;
    child.isConnected = true;
    this.children.push(child);
    return child;
  }

  replaceChildren(...children) {
    this.children.forEach((child) => {
      child.parentNode = null;
      child.isConnected = false;
    });
    this.children = [];
    children.forEach((child) => this.appendChild(child));
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    }
    this.parentNode = null;
    this.isConnected = false;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const selectors = selector.split(",").map((item) => item.trim()).filter(Boolean);
    const matches = [];
    const visit = (element) => {
      element.children.forEach((child) => {
        if (selectors.some((item) => selectorMatches(child, item))) matches.push(child);
        visit(child);
      });
    };
    visit(this);
    return matches;
  }

  cloneNode(deep = false) {
    const clone = new FakeElement({
      attributes: Object.fromEntries(this.attributes),
      classes: [...this.classList.values],
      rect: this.rect
    });
    clone.style = { ...this.style };
    if (deep) this.children.forEach((child) => clone.appendChild(child.cloneNode(true)));
    return clone;
  }

  getBoundingClientRect() {
    return { ...this.rect };
  }
}

function buildReaderFrame({ mode = "control", readingRect = { x: 0, y: 0, width: 390, height: 844 } } = {}) {
  const frame = new FakeElement({
    attributes: { "data-slot": "readerFrame", "data-reader-test-mode": mode },
    classes: ["fd-reader-frame"],
    rect: { x: 0, y: 0, width: 390, height: 844 }
  });
  const reading = new FakeElement({
    attributes: { "data-slot": "readingSurface" },
    rect: readingRect
  });
  frame.appendChild(reading);
  if (mode !== "immersive") {
    frame.appendChild(new FakeElement({
      attributes: { "data-dev-region": "ReaderTopBar" },
      classes: ["fd-reader-top"],
      rect: { x: 14, y: 18, width: 362, height: 54 }
    }));
    frame.appendChild(new FakeElement({
      attributes: { "data-slot": "bottomSheetHost" },
      classes: [mode === "full" ? "fd-reader-full-host" : "fd-reader-sheet"],
      rect: { x: 12, y: mode === "full" ? 96 : 496, width: 366, height: mode === "full" ? 730 : 330 }
    }));
    frame.appendChild(new FakeElement({
      attributes: { "data-slot": "readerModuleNav" },
      classes: ["fd-reader-module-nav"],
      rect: { x: 24, y: 741, width: 342, height: 79 }
    }));
  } else {
    frame.appendChild(new FakeElement({
      attributes: { "data-slot": "bottomSheetHost" },
      classes: ["fd-reader-sheet", "fd-reader-sheet-empty"],
      rect: { x: 0, y: 0, width: 0, height: 0 }
    }));
    frame.appendChild(new FakeElement({
      attributes: { "data-slot": "readerModuleNav" },
      classes: ["fd-reader-module-nav", "fd-reader-module-nav-empty"],
      rect: { x: 0, y: 0, width: 0, height: 0 }
    }));
  }
  return frame;
}

function createRuntime() {
  let timerSequence = 0;
  let rafSequence = 0;
  const timers = new Map();
  const rafs = new Map();
  const window = {
    performance: { now: () => 1 },
    matchMedia: () => ({ matches: false }),
    setTimeout(callback) {
      const id = ++timerSequence;
      timers.set(id, callback);
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    requestAnimationFrame(callback) {
      const id = ++rafSequence;
      rafs.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      rafs.delete(id);
    }
  };
  const context = vm.createContext({ window });
  new vm.Script(readDemo("motion-controller.js"), { filename: "motion-controller.js" }).runInContext(context);
  new vm.Script(readDemo("reader-control-transition.js"), { filename: "reader-control-transition.js" }).runInContext(context);
  return {
    window,
    flushRafs() {
      const callbacks = [...rafs.values()];
      rafs.clear();
      callbacks.forEach((callback) => callback(1));
    },
    flushTimers() {
      while (timers.size > 0) {
        const callbacks = [...timers.values()];
        timers.clear();
        callbacks.forEach((callback) => callback());
      }
    }
  };
}

function createHarness(initialMode = "control") {
  const runtime = createRuntime();
  const root = new FakeElement({ attributes: { "data-motion-reduced": "false" } });
  const screenHost = new FakeElement();
  screenHost.appendChild(buildReaderFrame({ mode: initialMode }));
  const controller = runtime.window.ReaderMotionController.create({ root });
  const transition = runtime.window.ReaderControlTransition.create({ root, screenHost, motionController: controller });
  return {
    ...runtime,
    root,
    screenHost,
    controller,
    transition,
    commit(mode, readingRect) {
      screenHost.replaceChildren(buildReaderFrame({ mode, readingRect }));
    }
  };
}

test("runtime controller timing and easing match the canonical MR1 fixtures", () => {
  const fixtures = JSON.parse(readFileSync(join(repoRoot, "contracts/fixtures/motion.fixtures.json"), "utf8"));
  const ids = [
    "reader.control.show",
    "reader.control.hide",
    "reader.quick.promote",
    "reader.module.switch",
    "reader.panel.expand",
    "reader.panel.collapse"
  ];
  const { window } = createRuntime();
  const root = new FakeElement({ attributes: { "data-motion-reduced": "false" } });
  const controller = window.ReaderMotionController.create({ root });
  ids.forEach((id) => {
    const fixture = fixtures.find((item) => item.id === id);
    assert.ok(fixture, `missing canonical fixture ${id}`);
    const transaction = controller.start({ id });
    assert.equal(transaction.duration, fixture.durationMs, `${id} duration drift`);
    assert.equal(transaction.easing, fixture.easing, `${id} easing drift`);
    assert.equal(transaction.contract.stateMachineSource, "motion-id", `${id} must use an exact state machine`);
    controller.settle(transaction, "test");
  });
});

test("ReaderControlTransition fallback timing matches the canonical MR1 fixtures", () => {
  const fixtures = JSON.parse(readFileSync(join(repoRoot, "contracts/fixtures/motion.fixtures.json"), "utf8"));
  const fixtureById = new Map(fixtures.map((item) => [item.id, item]));
  const { window } = createRuntime();
  for (const id of window.ReaderControlTransition.MOTION_IDS) {
    const fixture = fixtureById.get(id);
    const fallback = window.ReaderControlTransition.SPECS[id];
    assert.ok(fixture, `missing canonical fixture ${id}`);
    assert.ok(fallback, `missing ReaderControlTransition fallback ${id}`);
    assert.equal(fallback.duration, fixture.durationMs, `${id} fallback duration drift`);
    assert.equal(fallback.easing, fixture.easing, `${id} fallback easing drift`);
  }
});

test("MR1 CSS duration tokens and per-MotionId mappings match the reviewed timing ladder", () => {
  const tokenSource = readDemo("motion-tokens.css");
  const expected = [
    ["control-enter", 420, "reader-control-show"],
    ["control-exit", 360, "reader-control-hide"],
    ["quick-promote", 320, "reader-quick-promote"],
    ["module-switch", 360, "reader-module-switch"],
    ["control-enter", 420, "reader-panel-expand"],
    ["control-exit", 360, "reader-panel-collapse"]
  ];
  for (const [tokenName, durationMs, effectiveName] of expected) {
    assert.match(tokenSource, new RegExp(`--reader-motion-duration-${tokenName}:\\s*${durationMs}ms`));
    assert.match(
      tokenSource,
      new RegExp(`--fd-motion-runtime-${effectiveName}:\\s*var\\(--reader-motion-duration-${tokenName}\\)`)
    );
    assert.match(
      tokenSource,
      new RegExp(`--fd-motion-effective-${effectiveName}:\\s*var\\(--fd-motion-runtime-${effectiveName}\\)`)
    );
  }
});

test("press dispatch resolves to canonical IDs and produces zero unknown runtime IDs", () => {
  const schema = JSON.parse(readFileSync(join(repoRoot, "contracts/motion.schema.json"), "utf8"));
  const canonicalIds = new Set(schema.properties.id.enum);
  const { window } = createRuntime();
  const declaredIds = [
    "reader.quick.promote",
    "reader.control.hide",
    "reader.panel.expand",
    "reader.module.switch",
    "reader.control.handle.press",
    "dropdown.trigger.press",
    "tab.item.press",
    "unknown.family.press"
  ];
  const resolvedIds = declaredIds.map((id) => window.ReaderMotionController.pressMotionIdFor(id));
  const unknownIds = resolvedIds.filter((id) => !canonicalIds.has(id));
  assert.deepEqual(unknownIds, []);
  assert.equal(window.ReaderMotionController.pressMotionIdFor("reader.quick.promote"), "button.activate");
  assert.equal(window.ReaderMotionController.pressMotionIdFor("reader.control.handle.press"), "reader.control.handle.press");
  assert.equal(window.ReaderMotionController.pressMotionIdFor("unknown.family.press"), "button.activate");
});

test("ReaderControlTransition is latest-wins and only marks the panel for module/quick transitions", () => {
  const harness = createHarness("control");
  const first = harness.transition.run({
    id: "reader.module.switch",
    action: "switch-module",
    from: "control.home",
    to: "control.quick.module.target",
    commit: () => harness.commit("quick")
  });
  assert.equal(first.duration, 360);
  assert.deepEqual(partNames(first.outgoing), ["panel"]);
  assert.deepEqual(partNames(first.incoming), ["panel"]);
  assert.equal(first.frame.querySelector('[data-slot="readerModuleNav"]').hasAttribute("data-motion-reader-role"), false, "module nav geometry must stay fixed");
  assert.equal(first.frame.querySelector('[data-slot="readingSurface"]').hasAttribute("data-motion-reader-role"), false, "reading surface must never join the transition");
  assert.equal(harness.root.getAttribute("data-motion-reader-reading-stable"), "true");
  harness.flushRafs();
  assert.equal(harness.transition.getSnapshot().active.phase, "running");

  const second = harness.transition.run({
    id: "reader.quick.promote",
    action: "open-quick-panel",
    from: "control.home",
    to: "control.quick.target",
    commit: () => harness.commit("quick")
  });
  assert.equal(harness.root.getAttribute("data-motion-reader-last-reason"), "superseded");
  assert.equal(second.sequence, 2);
  assert.equal(second.duration, 320);
  assert.deepEqual(partNames(second.outgoing), ["panel"]);
  assert.equal(second.frame.querySelector('[data-slot="readingSurface"]').hasAttribute("data-motion-reader-role"), false);

  harness.flushRafs();
  harness.flushTimers();
  assert.equal(harness.transition.getSnapshot().active, null);
  assert.equal(harness.root.getAttribute("data-motion-reader-last-id"), "reader.quick.promote");
  assert.equal(harness.root.getAttribute("data-motion-reader-last-reason"), "complete");
});

test("show/hide roles cover topbar, panel, and nav while preserving the reading rect", () => {
  const showHarness = createHarness("immersive");
  const show = showHarness.transition.run({
    id: "reader.control.show",
    from: "immersive.hidden",
    to: "control.home",
    commit: () => showHarness.commit("control")
  });
  assert.deepEqual(partNames(show.incoming), ["topbar", "panel", "nav"]);
  assert.deepEqual([...show.outgoing], []);
  assert.equal(showHarness.root.getAttribute("data-motion-reader-reading-stable"), "true");

  const hideHarness = createHarness("control");
  const hide = hideHarness.transition.run({
    id: "reader.control.hide",
    from: "control.home",
    to: "immersive.hidden",
    commit: () => hideHarness.commit("immersive")
  });
  assert.deepEqual(partNames(hide.outgoing), ["topbar", "panel", "nav"]);
  assert.deepEqual([...hide.incoming], []);
  assert.equal(hide.frame.querySelector('[data-slot="readingSurface"]').hasAttribute("data-motion-reader-role"), false);
  assert.equal(hideHarness.root.getAttribute("data-motion-reader-reading-stable"), "true");
});

test("panel expand/collapse keep one panel transition owner and preserve reading/nav geometry", () => {
  const expandHarness = createHarness("quick");
  const expand = expandHarness.transition.run({
    id: "reader.panel.expand",
    from: "control.quick.module",
    to: "control.full.module",
    commit: () => expandHarness.commit("full")
  });
  assert.equal(expand.duration, 420);
  assert.deepEqual(partNames(expand.outgoing), ["panel"]);
  assert.deepEqual(partNames(expand.incoming), ["panel"]);
  assert.equal(expand.frame.querySelector('[data-slot="readerModuleNav"]').hasAttribute("data-motion-reader-role"), false);
  assert.equal(expand.frame.querySelector('[data-slot="readingSurface"]').hasAttribute("data-motion-reader-role"), false);
  assert.equal(expandHarness.root.getAttribute("data-motion-reader-reading-stable"), "true");

  const collapseHarness = createHarness("full");
  const collapse = collapseHarness.transition.run({
    id: "reader.panel.collapse",
    from: "control.full.module",
    to: "control.quick.module",
    commit: () => collapseHarness.commit("quick")
  });
  assert.equal(collapse.duration, 360);
  assert.deepEqual(partNames(collapse.outgoing), ["panel"]);
  assert.deepEqual(partNames(collapse.incoming), ["panel"]);
  assert.equal(collapseHarness.root.getAttribute("data-motion-reader-reading-stable"), "true");
});

test("reduced motion settles both before start and while a reader transition is running", () => {
  const before = createHarness("immersive");
  before.root.setAttribute("data-motion-reduced", "true");
  before.transition.setReducedMotion(true);
  const settled = before.transition.run({
    id: "reader.control.show",
    from: "immersive.hidden",
    to: "control.home",
    commit: () => before.commit("control")
  });
  assert.equal(settled.reason, "reduced-motion");
  assert.equal(before.transition.getSnapshot().active, null);
  assert.equal(before.screenHost.querySelector('[data-slot="readerFrame"]').querySelectorAll("[data-motion-reader-role]").length, 0);

  const during = createHarness("control");
  during.transition.run({
    id: "reader.control.hide",
    from: "control.home",
    to: "immersive.hidden",
    commit: () => during.commit("immersive")
  });
  during.flushRafs();
  assert.equal(during.transition.getSnapshot().active.phase, "running");
  during.root.setAttribute("data-motion-reduced", "true");
  during.transition.setReducedMotion(true);
  assert.equal(during.transition.getSnapshot().active, null);
  assert.equal(during.root.getAttribute("data-motion-reader-last-reason"), "reduced-motion");
  assert.equal(during.screenHost.querySelector('[data-slot="readerFrame"]').querySelectorAll("[data-motion-reader-role]").length, 0);
});

test("runtime uses promote only for control-home to quick and panel IDs for quick/full expansion", () => {
  const runtimeSource = readDemo("render-runtime.js");
  const tokenSource = readDemo("motion-tokens.css");
  assert.match(runtimeSource, /data-quick-action[\s\S]*id:\s*"reader\.quick\.promote"/);
  assert.match(runtimeSource, /data-reader-quick-expand[\s\S]*id:\s*"reader\.panel\.expand"/);
  assert.match(runtimeSource, /data-reader-quick-collapse[\s\S]*id:\s*"reader\.panel\.collapse"/);
  assert.match(runtimeSource, /data-reader-panel-expand[\s\S]*id:\s*"reader\.panel\.expand"/);
  assert.match(runtimeSource, /data-reader-panel-collapse[\s\S]*id:\s*"reader\.panel\.collapse"/);
  assert.match(runtimeSource, /commitHandleRoute[\s\S]*hasAttribute\("data-reader-panel-expand"\)[\s\S]*"reader\.panel\.expand"/);
  assert.match(runtimeSource, /commitHandleRoute[\s\S]*hasAttribute\("data-reader-panel-collapse"\)[\s\S]*"reader\.panel\.collapse"/);
  assert.match(runtimeSource, /bind\("\[data-reader-panel-expand\]", "reader\.panel\.expand"\)/);
  assert.match(runtimeSource, /bind\("\[data-reader-panel-collapse\]", "reader\.panel\.collapse"\)/);
  assert.doesNotMatch(runtimeSource, /id:\s*"reader\.quick\.promote"[\s\S]{0,120}action:\s*"(?:promote-full|collapse-quick)"/);
  assert.match(tokenSource, /reader\.control\.show[\s\S]*topbar[\s\S]*control-topbar-y/);
  assert.match(tokenSource, /reader\.control\.show[\s\S]*panel[\s\S]*control-panel-y/);
  assert.match(tokenSource, /reader\.control\.hide[\s\S]*outgoing[\s\S]*control-topbar-y/);
  assert.match(tokenSource, /reader\.quick\.promote[\s\S]*incoming[\s\S]*quick-panel-y/);
});

test("system back collapses full quick panels, then hides Reader controls, and leaves immersive to normal navigation", () => {
  const { window } = createRuntime();
  assert.deepEqual(
    plain(window.ReaderControlTransition.backDecision({ route: "content-search", mode: "quick", quickExpanded: "search" })),
    {
      id: "reader.panel.collapse",
      action: "system-back-collapse-panel",
      from: "content-search:full",
      to: "content-search:quick",
      targetRoute: "content-search"
    }
  );
  assert.deepEqual(
    plain(window.ReaderControlTransition.backDecision({
      route: "reader-full-tts",
      mode: "full",
      quickExpanded: "",
      targetRoute: "tts"
    })),
    {
      id: "reader.panel.collapse",
      action: "system-back-collapse-panel",
      from: "reader-full-tts",
      to: "tts",
      targetRoute: "tts"
    }
  );
  assert.deepEqual(
    plain(window.ReaderControlTransition.backDecision({ route: "reader", mode: "control", quickExpanded: "" })),
    {
      id: "reader.control.hide",
      action: "system-back-hide-control",
      from: "reader",
      to: "immersive-reading",
      targetRoute: "immersive-reading"
    }
  );
  assert.equal(window.ReaderControlTransition.backDecision({ route: "immersive-reading", mode: "immersive", quickExpanded: "" }), null);
  const runtimeSource = readDemo("render-runtime.js");
  assert.match(runtimeSource, /readerPrimaryFullQuickRoutes\[currentReaderRoute\][\s\S]*mode[\s\S]*"full"/);
  assert.match(runtimeSource, /readerBackDecision\.targetRoute !== currentReaderRoute[\s\S]*replaceTopRoute\(readerBackDecision\.targetRoute, readerBackDecision\)/);
  assert.match(runtimeSource, /readerBackDecision\?\.id === "reader\.panel\.collapse"[\s\S]*appState\.readerQuickExpanded = ""/);
  assert.match(runtimeSource, /readerBackDecision\?\.id === "reader\.control\.hide"[\s\S]*replaceTopRoute\(readerBackDecision\.targetRoute/);
  assert.match(runtimeSource, /querySelectorAll\("\[data-reader-exit\]"\)[\s\S]*addEventListener\("click", goBack\)/);
  assert.doesNotMatch(runtimeSource, /querySelectorAll\("\[data-reader-exit\]"\)[\s\S]{0,160}addEventListener\("click", exitReader\)/);
});
