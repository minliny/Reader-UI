// Phase 2 Motion Resolver 测试：移植三端 ReaderMotionResolver 纯函数逻辑到 JS 并验证解析结果。
// 这里的 JS 实现与 generated/{swift,kotlin,arkts}/MotionPolicy.* 中的 resolve 函数同构，
// 用于在不依赖平台编译器的前提下验证 resolver 行为。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACTS_DIR = join(__dirname, "..");

function loadJson(rel) {
  return JSON.parse(readFileSync(join(CONTRACTS_DIR, rel), "utf8"));
}

const policyFixtures = loadJson("fixtures/motion-policy.fixtures.json");
const routeFixtures = loadJson("fixtures/route.fixtures.json");
const motionFixtures = loadJson("fixtures/motion.fixtures.json");

const policies = policyFixtures.filter((p) => p.id);
const routeShellByRouteId = new Map(
  routeFixtures.filter((r) => r.id && r.shell).map((r) => [r.id, r.shell])
);
const motionById = new Map(motionFixtures.map((m) => [m.id, m]));

// --- Resolver JS 移植（与 generated/arkts/MotionPolicy.ets 中 resolveMotion 同构） ---

function specificity(m) {
  let count = 0;
  if (m.fromRoute !== undefined) count += 1;
  if (m.toRoute !== undefined) count += 1;
  if (m.fromShell !== undefined) count += 1;
  if (m.toShell !== undefined) count += 1;
  if (m.operation !== undefined) count += 1;
  if (m.sourceRole !== undefined) count += 1;
  if (m.targetRole !== undefined) count += 1;
  if (m.containerRole !== undefined) count += 1;
  if (m.reducedMotion !== undefined) count += 1;
  return count;
}

function matches(policyMatch, request) {
  if (policyMatch.fromRoute !== undefined && request.fromRoute !== policyMatch.fromRoute) return false;
  if (policyMatch.toRoute !== undefined && request.toRoute !== policyMatch.toRoute) return false;
  if (policyMatch.fromShell !== undefined && request.fromShell !== policyMatch.fromShell) return false;
  if (policyMatch.toShell !== undefined && request.toShell !== policyMatch.toShell) return false;
  if (policyMatch.operation !== undefined && request.operation !== policyMatch.operation) return false;
  if (policyMatch.sourceRole !== undefined && request.sourceRole !== policyMatch.sourceRole) return false;
  if (policyMatch.targetRole !== undefined && request.targetRole !== policyMatch.targetRole) return false;
  if (policyMatch.containerRole !== undefined && request.containerRole !== policyMatch.containerRole) return false;
  if (policyMatch.reducedMotion !== undefined && request.reducedMotion !== policyMatch.reducedMotion) return false;
  return true;
}

function resolveMotion(request) {
  const resolved = { ...request };
  if (resolved.fromShell === undefined && request.fromRoute !== undefined) {
    resolved.fromShell = routeShellByRouteId.get(request.fromRoute);
  }
  if (resolved.toShell === undefined && request.toRoute !== undefined) {
    resolved.toShell = routeShellByRouteId.get(request.toRoute);
  }
  const sorted = [...policies].sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    return specificity(b.match) - specificity(a.match);
  });
  for (const policy of sorted) {
    if (matches(policy.match, resolved)) {
      return policy.motionId;
    }
  }
  return undefined;
}

// --- 测试用例 ---

test("resolver 存在且可调用", () => {
  const result = resolveMotion({ operation: "push" });
  assert.ok(result, "resolveMotion({operation: push}) 应返回非 undefined");
});

test("route push 默认解析到 app.route.push.forward", () => {
  const result = resolveMotion({ operation: "push", containerRole: "appShell" });
  assert.equal(result, "app.route.push.forward");
});

test("route pop 默认解析到 app.route.pop.backward", () => {
  const result = resolveMotion({ operation: "pop", containerRole: "appShell" });
  assert.equal(result, "app.route.pop.backward");
});

test("main tab switch 解析到 tab.switch", () => {
  const result = resolveMotion({ operation: "tabSwitch", containerRole: "mainTabShell" });
  assert.equal(result, "tab.switch");
});

test("bookshelf cover to reader 通过 fromRoute/toRoute 解析（resolver 内部查 shell）", () => {
  // fromRoute=bookshelf (MainTabShell), toRoute=reader (ReaderShell), operation=push, sourceRole=bookCover
  const result = resolveMotion({
    fromRoute: "bookshelf",
    toRoute: "reader",
    operation: "push",
    sourceRole: "bookCover"
  });
  assert.equal(result, "reader.entry.coverToImmersive");
});

test("bookshelf cover to reader 通过显式 fromShell/toShell 解析", () => {
  const result = resolveMotion({
    fromShell: "MainTabShell",
    toShell: "ReaderShell",
    operation: "push",
    sourceRole: "bookCover"
  });
  assert.equal(result, "reader.entry.coverToImmersive");
});

test("reader overlay sheet enter 解析到 overlay.sheet.enter", () => {
  const result = resolveMotion({
    containerRole: "readerShell",
    operation: "enter",
    targetRole: "sheet"
  });
  assert.equal(result, "overlay.sheet.enter");
});

test("reader overlay dialog enter 解析到 overlay.dialog.enter", () => {
  const result = resolveMotion({
    containerRole: "readerShell",
    operation: "enter",
    targetRole: "dialog"
  });
  assert.equal(result, "overlay.dialog.enter");
});

test("dropdown menu expand 解析到 dropdown.menu.expand", () => {
  const result = resolveMotion({
    containerRole: "overlayHost",
    operation: "enter",
    targetRole: "dropdown"
  });
  assert.equal(result, "dropdown.menu.expand");
});

test("reader page turn 解析到 reader.page.turn.next-prev", () => {
  const result = resolveMotion({
    containerRole: "readerSurface",
    operation: "update",
    sourceRole: "page"
  });
  assert.equal(result, "reader.page.turn.next-prev");
});

test("reader chapter jump 解析到 reader.chapter.jump", () => {
  const result = resolveMotion({
    containerRole: "readerSurface",
    operation: "replace",
    sourceRole: "chapter"
  });
  assert.equal(result, "reader.chapter.jump");
});

test("slider drag start 解析到 slider.drag.start", () => {
  const result = resolveMotion({
    containerRole: "listItem",
    operation: "dragStart",
    sourceRole: "slider"
  });
  assert.equal(result, "slider.drag.start");
});

test("slider drag update 解析到 slider.drag.update", () => {
  const result = resolveMotion({
    containerRole: "listItem",
    operation: "dragUpdate",
    sourceRole: "slider"
  });
  assert.equal(result, "slider.drag.update");
});

test("slider drag release 解析到 slider.drag.release", () => {
  const result = resolveMotion({
    containerRole: "listItem",
    operation: "dragRelease",
    sourceRole: "slider"
  });
  assert.equal(result, "slider.drag.release");
});

test("session capsule enter 解析到 reader.session.capsule.enter", () => {
  const result = resolveMotion({
    containerRole: "sessionCapsule",
    operation: "enter"
  });
  assert.equal(result, "reader.session.capsule.enter");
});

test("viewport orientation reshape 解析到 viewport.orientation.prepare", () => {
  const result = resolveMotion({
    operation: "reshape",
    sourceRole: "orientation"
  });
  assert.equal(result, "viewport.orientation.prepare");
});

test("viewport orientation settle 解析到 viewport.orientation.settle", () => {
  const result = resolveMotion({
    operation: "settle",
    sourceRole: "orientation"
  });
  assert.equal(result, "viewport.orientation.settle");
});

test("高优先级 policy 优先于低优先级（bookshelf-cover-to-reader 优先于 route-push-default）", () => {
  // 同样是 push + sourceRole=bookCover，但加上 fromShell/toShell 后应命中更高优先级
  const generic = resolveMotion({ operation: "push", containerRole: "appShell" });
  const specific = resolveMotion({
    fromShell: "MainTabShell",
    toShell: "ReaderShell",
    operation: "push",
    sourceRole: "bookCover"
  });
  assert.equal(generic, "app.route.push.forward");
  assert.equal(specific, "reader.entry.coverToImmersive");
  assert.notEqual(generic, specific, "高优先级 policy 应解析到不同 motionId");
});

test("空 request 命中 priority=0 兜底 policy", () => {
  const result = resolveMotion({});
  assert.ok(result, "空 request 也应命中兜底 policy 返回非 undefined");
});

test("resolver 返回的 motionId 都能在 MotionSpecRegistry 中找到对应 spec", () => {
  // 收集所有 policy 的 motionId，验证每个都有对应 motion fixture
  for (const p of policies) {
    assert.ok(motionById.has(p.motionId), `policy ${p.id} 的 motionId ${p.motionId} 在 motion fixtures 中找不到`);
  }
});

test("resolver 优先级排序：priority 降序 + specificity 降序", () => {
  // 验证排序逻辑：同 priority 时更具体的 match 先匹配
  // toast-enter (priority 250, match: operation=enter + containerRole=overlayHost + targetRole=toast) specificity=3
  // 如果有一条 priority 250 但 specificity=1 的 policy 也匹配 enter，toast-enter 应优先
  // 这里通过构造场景验证：overlayHost + enter + targetRole=toast 应命中 toast-enter 而非更宽泛的 enter policy
  const result = resolveMotion({
    containerRole: "overlayHost",
    operation: "enter",
    targetRole: "toast"
  });
  assert.equal(result, "feedback.toast.enter");
});

test("resolver 不修改输入 request（纯函数）", () => {
  const req = { operation: "push", containerRole: "appShell" };
  const snapshot = JSON.stringify(req);
  resolveMotion(req);
  assert.equal(JSON.stringify(req), snapshot, "resolver 不应修改输入 request");
});

test("route shell lookup: bookshelf -> MainTabShell, reader -> ReaderShell, settings -> SettingsShell", () => {
  assert.equal(routeShellByRouteId.get("bookshelf"), "MainTabShell");
  assert.equal(routeShellByRouteId.get("reader"), "ReaderShell");
  assert.equal(routeShellByRouteId.get("global-settings"), "SettingsShell");
  assert.equal(routeShellByRouteId.get("global-loading"), "SettingsShell");
});
