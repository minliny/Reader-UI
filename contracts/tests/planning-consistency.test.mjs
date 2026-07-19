import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const contractsDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(contractsDir, "..");

function loadJson(relativePath) {
  return JSON.parse(readFileSync(join(contractsDir, relativePath), "utf8"));
}

function readContract(relativePath) {
  return readFileSync(join(contractsDir, relativePath), "utf8");
}

function readRepo(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

const routeCount = loadJson("route.schema.json").properties.id.enum.length;
const componentTypeCount = loadJson("view-state.schema.json").$defs.Component.properties.type.enum.length;
const motionCount = loadJson("motion.schema.json").properties.id.enum.length;
const hostRequestCount = loadJson("host-request.schema.json").properties.type.enum.length;
const schemaNames = readdirSync(contractsDir).filter((name) => name.endsWith(".schema.json"));
const fixtureCount = schemaNames.reduce((total, schemaName) => {
  const fixtureName = schemaName.replace(/\.schema\.json$/, ".fixtures.json");
  const fixturePath = join(contractsDir, "fixtures", fixtureName);
  if (!existsSync(fixturePath)) return total;
  const document = JSON.parse(readFileSync(fixturePath, "utf8"));
  return total + (Array.isArray(document) ? document.length : 1);
}, 0);
const contractTestFileCount = readdirSync(join(contractsDir, "tests")).filter((name) => name.endsWith(".test.mjs")).length;

const routeComponentMatrix = readContract("ROUTE_COMPONENT_MATRIX.md");
const slicePlan = readContract("SLICE_PLAN.md");
const productCapabilityMatrix = readContract("FULL_PRODUCT_CAPABILITY_DELIVERY_MATRIX.md");
const platformEvidenceSpec = readContract("PLATFORM_EVIDENCE_SPEC.md");
const contractReadme = readContract("README.md");
const acceptance = readContract("ACCEPTANCE.md");
const figmaHandoff = readRepo("docs/design/FIGMA_HANDOFF_STATUS_2026-07-12.md");
const designIndex = readRepo("docs/design/README.md");

test("planning matrix denominators match the current schemas", () => {
  assert.match(
    routeComponentMatrix,
    new RegExp(`当前全部 ${routeCount} 个 RouteId`),
    `ROUTE_COMPONENT_MATRIX must publish the current ${routeCount}-route denominator`
  );
  assert.match(
    routeComponentMatrix,
    new RegExp(`enum（当前 ${routeCount} 项；以 schema 为机器权威）`),
    "route matrix denominator must remain schema-owned"
  );
  assert.match(
    routeComponentMatrix,
    new RegExp(`ComponentType enum（当前 ${componentTypeCount} 项；以 schema 为机器权威）`),
    `ROUTE_COMPONENT_MATRIX must publish the current ${componentTypeCount}-ComponentType denominator`
  );
  assert.match(
    routeComponentMatrix,
    new RegExp(`motion\\.schema\\.json.*当前 ${motionCount} 项；以 schema/fixtures 为机器权威`),
    `ROUTE_COMPONENT_MATRIX must publish the current ${motionCount}-MotionId denominator`
  );
});

test("Slice 3 is an active Reader Control slice", () => {
  assert.match(slicePlan, /\| Slice 3 \| Reader Control \/ overlay \/ full panel \|/);
  assert.match(slicePlan, /## 5\. Slice 3：Reader Control \/ overlay \/ full panel/);
  assert.doesNotMatch(slicePlan, /保留，等待新的阅读控制产品规格|Slice 3：保留|等待新的权威产品规格/);
});

test("Slice 7 uses the current HostRequest schema denominator", () => {
  assert.doesNotMatch(slicePlan, /覆盖 30 个 HostRequest|30 个 HostRequest type/);
  assert.match(
    slicePlan,
    new RegExp(`当前 enum 全集（当前机器分母 ${hostRequestCount}）`),
    `SLICE_PLAN must publish the current ${hostRequestCount}-HostRequest denominator`
  );
  assert.match(slicePlan, new RegExp(`当前全部 ${hostRequestCount} 个 HostRequest type`));
});

test("Slice 9-12 are formal execution slices with dependencies and three-host deliverables", () => {
  const formalSlices = [
    [9, "多格式、本地书、漫画与媒体交付"],
    [10, "阅读数据、编辑、规则、封面与扩展 TTS"],
    [11, "动态书源、规则订阅、登录挑战与 RSS 深链"],
    [12, "完整应用生命周期、设置、无障碍与 Release Gate"],
  ];
  for (const [sliceNumber, title] of formalSlices) {
    assert.match(slicePlan, new RegExp(`\\| Slice ${sliceNumber} \\| ${title.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")} \\|`));
    assert.match(slicePlan, new RegExp(`## ${sliceNumber + 2}\\. Slice ${sliceNumber}：${title.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}`));
  }
  assert.match(slicePlan, /Slice 9–11 分域验收全部通过 → Slice 12 全产品 Release Gate/);
  assert.match(slicePlan, /### 11\.3 Core \/ Host 前置/);
  assert.match(slicePlan, /### 12\.4 三端交付物/);
  assert.match(slicePlan, /### 13\.5 验收门槛/);
  assert.match(slicePlan, /### 14\.4 三端交付物/);
  for (const platform of ["iOS", "Android", "HarmonyOS"]) {
    assert.match(slicePlan, new RegExp(`\\| ${platform} \\|`));
  }
});

test("capability matrix and evidence spec treat Slice 9-12 as formal without completion overclaim", () => {
  assert.match(productCapabilityMatrix, /## 5\. 正式 Slice 9–12/);
  assert.doesNotMatch(productCapabilityMatrix, /## 5\. 新增 Slice 9–12 建议/);
  assert.match(productCapabilityMatrix, /计划登记不等于 runtime、原生或设备完成/);

  assert.match(platformEvidenceSpec, /Slice 0–12 每端 evidence/);
  assert.match(platformEvidenceSpec, /platform-evidence-manifest\.schema\.json/);
  assert.match(platformEvidenceSpec, /`N`：slice 编号（0–12）/);
  for (const sliceNumber of [9, 10, 11, 12]) {
    assert.match(platformEvidenceSpec, new RegExp(`\\| Slice ${sliceNumber} \\|`));
  }
  assert.match(platformEvidenceSpec, /planned \/ in-progress \/ blocked/);
  assert.match(platformEvidenceSpec, /只有测试、实际 artifact、可信 release identity 和该 slice 所有 gate 均关闭时才能标为 `passed`/);
});

test("contracts README and acceptance publish the current planning and evidence denominators", () => {
  assert.match(contractReadme, new RegExp(`Schema（${schemaNames.length} 个）`));
  assert.match(contractReadme, new RegExp(`Fixtures（${fixtureCount} 项）`));
  assert.match(contractReadme, new RegExp(`tests/\\s+# ${contractTestFileCount} 个测试文件`));
  assert.match(contractReadme, /正式 Slice 0–12/);
  assert.match(contractReadme, /platform-evidence-manifest/);
  assert.doesNotMatch(contractReadme, /Slice 9–12 的跨仓交付建议/);

  assert.match(acceptance, new RegExp(`当前合计 ${schemaNames.length} 个 schema、${fixtureCount} 项可扫描 fixtures`));
  assert.match(acceptance, /正式 Slice 0–12 启动顺序/);
  assert.match(acceptance, /Slice 12 全产品 Release Gate 未关闭/);
  assert.match(acceptance, /platform-evidence-manifest\.schema\.json/);
  assert.doesNotMatch(acceptance, /SLICE_PLAN：Slice 0-8/);
});

test("Figma handoff records the current page and Motion Reference state", () => {
  assert.match(figmaHandoff, /Figma 当前有 29 个页面（`00`–`28`）/);
  assert.match(figmaHandoff, /`25 · Motion Reference` 已存在/);
  assert.doesNotMatch(figmaHandoff, /没有独立 `Motion Reference` 页面|无独立 `Motion Reference`/);
  assert.match(figmaHandoff, /M0–M5 仅完成候选装配/);
  assert.match(figmaHandoff, /MR1 Reader Control Motion 样板 \| 已完成自验，待用户确认/);
  assert.match(figmaHandoff, /MR2 十个核心 Motion 家族 \| 进行中/);
  assert.match(figmaHandoff, /MR3 canonical registry \+ 确定性 trace \| 已完成十家族 × 5 模式/);
  assert.match(figmaHandoff, /MR4–MR5 Native\/device Motion 闭环 \| 未完成/);
});

test("design index states one VC/MR completion policy", () => {
  assert.match(designIndex, /M0–M5 只表示物料、参考、master 与候选实例已经装配/);
  assert.match(designIndex, /Reader 2 静态 VC2 \/ VC3 已关闭/);
  assert.match(designIndex, /24×3 响应式结构和 25×3 原型引用门禁/);
  assert.match(designIndex, /不会自动替代其他页面族的用户视觉确认、Design Delta 或三档动态复验/);
  assert.match(designIndex, /MR1 控制层完成自验但待用户确认/);
  assert.match(designIndex, /MR2 进行中/);
  assert.match(designIndex, /MR3 的 canonical registry、十家族 50 条确定性 trace 及 7 段代表性 browser WebM 已完成/);
  assert.match(designIndex, /7 段代表性 browser WebM 已完成/);
  assert.match(designIndex, /完整十家族\/三档 viewport 动态媒体仍待补/);
  assert.match(designIndex, /MR4–MR5 原生\/设备门禁尚未闭环/);
});
