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

class MemoryStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

class FakeStyle {
  constructor() {
    this.values = new Map();
  }

  setProperty(name, value) {
    this.values.set(name, String(value));
  }

  removeProperty(name) {
    this.values.delete(name);
  }

  getPropertyValue(name) {
    return this.values.get(name) || "";
  }
}

class FakeRoot {
  constructor() {
    this.attributes = new Map();
    this.style = new FakeStyle();
    this.events = [];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  dispatchEvent(event) {
    this.events.push(event);
  }
}

function createRuntime({ storage = new MemoryStorage(), includeRegistry = true } = {}) {
  let timerSequence = 0;
  const timers = new Map();
  const eventListeners = new Map();
  const window = {
    localStorage: storage,
    performance: { now: () => 1 },
    matchMedia: () => ({ matches: false }),
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    },
    addEventListener(type, listener) {
      const listeners = eventListeners.get(type) || new Set();
      listeners.add(listener);
      eventListeners.set(type, listeners);
    },
    removeEventListener(type, listener) {
      eventListeners.get(type)?.delete(listener);
    },
    setTimeout(callback, delay) {
      const id = ++timerSequence;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    }
  };
  const context = vm.createContext({ window });
  if (includeRegistry) {
    new vm.Script(readDemo("renderers/d5-motion-closure-renderers.js"), { filename: "d5-motion-closure-renderers.js" }).runInContext(context);
  }
  new vm.Script(readDemo("motion-runtime-profile.js"), { filename: "motion-runtime-profile.js" }).runInContext(context);
  return {
    window,
    context,
    storage,
    timers,
    loadController() {
      new vm.Script(readDemo("motion-controller.js"), { filename: "motion-controller.js" }).runInContext(context);
      return window.ReaderMotionController;
    }
  };
}

test("runtime profile classifies every canonical MotionId without changing the contract", () => {
  const runtime = createRuntime();
  const schema = JSON.parse(readFileSync(join(repoRoot, "contracts/motion.schema.json"), "utf8"));
  const categories = new Set(runtime.window.ReaderMotionRuntimeProfile.CATEGORIES);
  const classified = schema.properties.id.enum.map((id) => [id, runtime.window.ReaderMotionRuntimeProfile.categoryFor(id)]);
  assert.equal(classified.length, 95);
  assert.deepEqual(classified.filter(([, category]) => !categories.has(category)), []);
  assert.equal(runtime.window.ReaderMotionRuntimeProfile.categoryFor("reader.panel.expand"), "readerControl");
  assert.equal(runtime.window.ReaderMotionRuntimeProfile.categoryFor("bookshelf.view.switch"), "componentFeedback");
  assert.equal(runtime.window.ReaderMotionRuntimeProfile.categoryFor("reader.page.turn.next-prev"), "readerReading");
  assert.equal(runtime.window.ReaderMotionRuntimeProfile.categoryFor("reader.session.capsule.voiceIcon.active"), "loop");
});

test("disabled is product parity; speed is persisted and updates CSS runtime variables", () => {
  const runtime = createRuntime();
  const root = new FakeRoot();
  const profile = runtime.window.ReaderMotionRuntimeProfile.create({ root });
  assert.deepEqual(JSON.parse(JSON.stringify(profile.getSnapshot())), {
    version: 1,
    enabled: false,
    globalSpeed: 1,
    categories: {
      navigation: 1,
      componentFeedback: 1,
      overlay: 1,
      readerControl: 1,
      readerReading: 1,
      session: 1,
      viewport: 1,
      loop: 1
    }
  });
  assert.equal(profile.resolveDuration({ motionId: "reader.panel.expand", baseDuration: 420 }).effectiveDuration, 420);
  assert.equal(root.style.getPropertyValue("--fd-motion-runtime-reader-panel-expand"), "");

  profile.setEnabled(true);
  profile.setSpeed("global", 0.5);
  profile.setSpeed("readerControl", 0.5);
  const slow = profile.resolveDuration({ motionId: "reader.panel.expand", baseDuration: 420 });
  assert.deepEqual(JSON.parse(JSON.stringify(slow)), {
    baseDuration: 420,
    speed: 0.25,
    effectiveDuration: 1680,
    category: "readerControl",
    enabled: true,
    reducedMotion: false,
    globalSpeed: 0.5,
    categorySpeed: 0.5
  });
  assert.equal(root.style.getPropertyValue("--fd-motion-runtime-reader-panel-expand"), "1680ms");
  assert.equal(root.getAttribute("data-motion-speed-readerControl"), "0.5");
  assert.equal(runtime.window.ReaderMotionRuntimeProfile.create({ root }), profile, "same root must share one live profile");

  const stored = JSON.parse(runtime.storage.getItem(runtime.window.ReaderMotionRuntimeProfile.STORAGE_KEY));
  assert.equal(stored.enabled, true);
  assert.equal(stored.globalSpeed, 0.5);
  assert.equal(stored.categories.readerControl, 0.5);
});

test("speed clamps, zero is debug-instant, and reduced-motion always wins", () => {
  const runtime = createRuntime();
  const root = new FakeRoot();
  const profile = runtime.window.ReaderMotionRuntimeProfile.create({ root });
  profile.setEnabled(true);
  profile.setSpeed("global", 0.01);
  profile.setSpeed("navigation", 99);
  assert.equal(profile.getSnapshot().globalSpeed, 0.25);
  assert.equal(profile.getSnapshot().categories.navigation, 4);
  assert.equal(profile.resolveDuration({ motionId: "app.route.push.forward", baseDuration: 160 }).effectiveDuration, 160);

  profile.setSpeed("loop", 0);
  assert.equal(profile.resolveDuration({ motionId: "state.loading.inline", baseDuration: 800 }).effectiveDuration, 0);
  assert.equal(root.getAttribute("data-motion-speed-loop-instant"), "true");
  assert.equal(root.style.getPropertyValue("--fd-motion-runtime-loading-spin"), "0ms");

  profile.setSpeed("loop", 4);
  profile.setSpeed("global", 4);
  const reduced = profile.resolveDuration({
    motionId: "state.loading.inline",
    baseDuration: 800,
    reducedMotion: true
  });
  assert.equal(reduced.speed, 0);
  assert.equal(reduced.effectiveDuration, 0);
  assert.equal(reduced.reducedMotion, true);
});

test("invalid persisted data falls back safely and reset removes the local override", () => {
  const storage = new MemoryStorage({ "reader.dev.motionProfile.v1": "{invalid" });
  const runtime = createRuntime({ storage });
  const profile = runtime.window.ReaderMotionRuntimeProfile.create({ root: new FakeRoot() });
  assert.equal(profile.getSnapshot().enabled, false);
  profile.setEnabled(true);
  assert.ok(storage.getItem("reader.dev.motionProfile.v1"));
  profile.reset();
  assert.equal(storage.getItem("reader.dev.motionProfile.v1"), null);
  assert.equal(profile.getSnapshot().enabled, false);
});

test("controller freezes effective duration per start and audits base, speed, category, and effective values", () => {
  const runtime = createRuntime();
  const controllerFactory = runtime.loadController();
  const root = new FakeRoot();
  root.setAttribute("data-motion-reduced", "false");
  const profile = runtime.window.ReaderMotionRuntimeProfile.create({ root });
  profile.setEnabled(true);
  profile.setSpeed("global", 0.25);
  const controller = controllerFactory.create({ root });

  const first = controller.start({ id: "reader.panel.expand" });
  assert.equal(first.baseDuration, 420);
  assert.equal(first.speed, 0.25);
  assert.equal(first.effectiveDuration, 1680);
  assert.equal(first.duration, 1680);
  assert.equal(first.category, "readerControl");
  assert.equal([...runtime.timers.values()][0].delay, 1680);
  const firstStart = controller.getSnapshot().events.find((event) => event.type === "start");
  assert.equal(firstStart.baseDuration, 420);
  assert.equal(firstStart.speed, 0.25);
  assert.equal(firstStart.effectiveDuration, 1680);
  assert.equal(firstStart.category, "readerControl");

  profile.setSpeed("global", 4);
  assert.equal(first.duration, 1680, "an active transaction must keep its start-time duration");
  controller.settle(first, "test");
  const next = controller.start({ id: "reader.panel.expand" });
  assert.equal(next.duration, 105);
  controller.settle(next, "test");

  profile.setSpeed("global", 0);
  const instant = controller.start({ id: "reader.panel.expand" });
  assert.equal(instant.duration, 0);
  assert.equal(instant.reason, "debug-instant");

  controller.setReducedMotion(true);
  profile.setSpeed("global", 4);
  const reduced = controller.start({ id: "reader.panel.expand" });
  assert.equal(reduced.duration, 0);
  assert.equal(reduced.reason, "reduced-motion");
});

test("bookshelf layout switch uses the exact 320ms state machine contract", () => {
  const runtime = createRuntime();
  const controllerFactory = runtime.loadController();
  const controller = controllerFactory.create({ root: new FakeRoot() });
  const transaction = controller.start({ id: "bookshelf.view.switch" });
  assert.equal(transaction.baseDuration, 320);
  assert.equal(transaction.easing, "ease-out");
  assert.equal(transaction.contract.stateMachineSource, "motion-id");
  assert.deepEqual(JSON.parse(JSON.stringify(transaction.contract.stateMachine)), {
    from: ["bookshelf.view.cover", "bookshelf.view.list"],
    to: ["bookshelf.view.target"],
    interrupt: ["bookshelf.view.switch", "bookshelf.sortFilter.apply", "bookshelf.group.select", "route.replace", "viewport.orientation.prepare"],
    finalState: "bookshelf.view.target.settled",
    reducedMotion: "Commit the target layout immediately while preserving BookItem identity, scroll anchor, and focus."
  });
});

test("CSS consumes runtime intermediary variables instead of bypassing the speed profile", () => {
  const tokenSource = readDemo("motion-tokens.css");
  const shellSource = readDemo("styles/01-shell-layout.css");
  const tocSource = readDemo("styles/02b-reader-toc-module.css");
  const settingsSource = readDemo("styles/04-settings-source.css");
  assert.match(tokenSource, /--fd-motion-effective-reader-panel-expand:\s*var\(--fd-motion-runtime-reader-panel-expand\)/);
  assert.match(tokenSource, /--fd-motion-effective-layout-switch:\s*var\(--fd-motion-runtime-layout-switch\)/);
  assert.match(tokenSource, /--fd-motion-effective-loading-spin:\s*var\(--fd-motion-runtime-loading-spin\)/);
  assert.doesNotMatch(shellSource, /animation:\s*fd-reader-page-(?:next|prev)[^;]*var\(--reader-motion-duration-page-turn\)/);
  assert.doesNotMatch(shellSource, /transition:\s*transform\s+var\(--app-motion-duration-dropdown-expand\)/);
  assert.doesNotMatch(tocSource, /animation:\s*fd-reader-loading-spin\s+var\(--reader-motion-duration-loading-spin\)/);
  assert.doesNotMatch(settingsSource, /animation:\s*fd-reader-loading-spin\s+var\(--reader-motion-duration-loading-spin\)/);
});

test("developer settings consumes the runtime snapshot shape and loads the profile before motion consumers", () => {
  const runtimeSource = readDemo("render-runtime.js");
  const indexSource = readDemo("index.html");
  const profileScriptIndex = indexSource.indexOf("./motion-runtime-profile.js");
  const controllerScriptIndex = indexSource.indexOf("./motion-controller.js");
  const renderScriptIndex = indexSource.indexOf("./render.js");

  assert.ok(profileScriptIndex >= 0, "index must load the runtime profile");
  assert.ok(profileScriptIndex < controllerScriptIndex, "profile must load before the motion controller");
  assert.ok(controllerScriptIndex < renderScriptIndex, "motion consumers must load before the renderer starts");
  assert.match(runtimeSource, /developerMotionProfile\.categories\s*\|\|/);
  assert.match(runtimeSource, /developerMotionProfile\.globalSpeed\s*\?\?/);
  assert.match(runtimeSource, /最终速度 = “全部动画”倍率 × 当前分类倍率/);
  assert.match(runtimeSource, /motionProfileRuntime\.setEnabled\(enabled\)/);
  assert.match(runtimeSource, /motionProfileRuntime\.setSpeed\(scope,\s*speed\)/);
  assert.match(runtimeSource, /motionProfileRuntime\.reset\(\)/);
  assert.match(runtimeSource, /motionProfileRuntime\.reset\(\);\s*if \(enabled\) \{\s*motionProfileRuntime\.setEnabled\(true\)/);
});
