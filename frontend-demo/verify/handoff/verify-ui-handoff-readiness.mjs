import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const repoRoot = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(repoRoot, relativePath));

const checks = [];
const addCheck = (id, passed, detail) => {
  checks.push({ id, passed, detail });
};

const requiredDocs = [
  "README.md",
  "frontend-demo/README.md",
  "frontend-demo/route-contract.js",
  "frontend-demo/MOTION_CONTRACT.md",
  "frontend-demo/MOTION_EFFECTS.md",
  "frontend-demo/MOTION_IMPLEMENTATION_GAP_AUDIT.md",
  "frontend-demo/MOTION_SELECTOR_MATRIX.md",
  "docs/cross-platform-ui/CROSS_PLATFORM_UI_BASELINE.md",
  "docs/cross-platform-ui/CROSS_PLATFORM_ROUTE_MATRIX.md",
  "docs/cross-platform-ui/CROSS_PLATFORM_STATE_MATRIX.md",
  "docs/cross-platform-ui/CROSS_PLATFORM_COMPONENT_MAPPING.md",
  "docs/ui-handoff/README.md",
  "docs/ui-handoff/ROUTE_MAP.md",
  "docs/ui-handoff/STATE_MATRIX.md",
  "docs/ui-handoff/SCREEN_MATRIX.md",
  "docs/ui-handoff/MOTION_PLATFORM_MAPPING.md",
  "docs/ui-handoff/FRONTEND_DEVELOPMENT_READINESS.md",
  "docs/ui-handoff/FRONTEND_DEVELOPMENT_SLICE_MATRIX.md",
  "docs/ui-handoff/UI_PLATFORM_EVIDENCE_REQUESTS.md",
  "frontend-demo/verify/motion/motion-coverage-report.json",
  "frontend-demo/verify/motion/evidence/manifest.json"
];

const missingDocs = requiredDocs.filter((relativePath) => !exists(relativePath));
addCheck(
  "handoff.required-files",
  missingDocs.length === 0,
  missingDocs.length === 0 ? `${requiredDocs.length} files present` : `missing: ${missingDocs.join(", ")}`
);

const routeContext = { window: {} };
vm.createContext(routeContext);
vm.runInContext(read("frontend-demo/route-contract.js"), routeContext);
const routeContract = routeContext.window.ReaderFrontendDemoDraftRouteContract || {};
const routes = routeContract.routes || {};
const shellCounts = Object.values(routes).reduce((acc, route) => {
  acc[route.shell] = (acc[route.shell] || 0) + 1;
  return acc;
}, {});
addCheck(
  "handoff.route-contract",
  Object.keys(routes).length === 131 &&
    shellCounts.MainTabShell === 36 &&
    shellCounts.LibraryShell === 51 &&
    shellCounts.SettingsShell === 28 &&
    shellCounts.ReaderShell === 15 &&
    shellCounts.FlowShell === 1,
  `routes=${Object.keys(routes).length}; shells=${JSON.stringify(shellCounts)}`
);

const coverage = JSON.parse(read("frontend-demo/verify/motion/motion-coverage-report.json"));
addCheck(
  "handoff.motion-coverage",
  coverage.summary?.passed === coverage.summary?.total &&
    coverage.routeCoverage?.totalRoutes === 131 &&
    coverage.routeCoverage?.missingCases?.length === 0 &&
    coverage.executableContract?.unresolvedMotionIds?.length === 0 &&
    coverage.executableContract?.missingStateMachineMotionIds?.length === 0,
  `checks=${coverage.summary?.passed}/${coverage.summary?.total}; routes=${coverage.routeCoverage?.totalRoutes}; unresolved=${coverage.executableContract?.unresolvedMotionIds?.length ?? "n/a"}`
);

const evidence = JSON.parse(read("frontend-demo/verify/motion/evidence/manifest.json"));
const requiredEvidenceIds = new Set([
  "app.firstOpen.enter",
  "tab.item.switch",
  "dropdown.menu.expand",
  "reader.entry.coverToImmersive",
  "reader.session.capsule.enter",
  "reader.session.controlSpace.enter",
  "viewport.orientation.reshape",
  "motion.interrupt.redirect"
]);
const evidenceIds = new Set((evidence.entries || []).map((entry) => entry.motionId));
const missingEvidenceIds = [...requiredEvidenceIds].filter((motionId) => !evidenceIds.has(motionId));
const evidenceFileProblems = (evidence.entries || []).filter((entry) => {
  if (!entry.file || entry.file.includes("..") || path.isAbsolute(entry.file)) return true;
  const evidencePath = path.join(repoRoot, "frontend-demo/verify/motion/evidence", entry.file);
  return !fs.existsSync(evidencePath) || fs.statSync(evidencePath).size === 0;
});
addCheck(
  "handoff.motion-evidence",
  evidence.entries?.length >= 9 && missingEvidenceIds.length === 0 && evidenceFileProblems.length === 0,
  `entries=${evidence.entries?.length || 0}; missing=${missingEvidenceIds.length}; fileProblems=${evidenceFileProblems.length}`
);

const readiness = read("docs/ui-handoff/FRONTEND_DEVELOPMENT_READINESS.md");
const sliceMatrix = read("docs/ui-handoff/FRONTEND_DEVELOPMENT_SLICE_MATRIX.md");
const evidenceRequests = read("docs/ui-handoff/UI_PLATFORM_EVIDENCE_REQUESTS.md");
addCheck(
  "handoff.readiness-markers",
  readiness.includes("UI_HANDOFF_READY_FOR_BOUNDED_PLATFORM_SLICE") &&
    readiness.includes("Design / Contract ready") &&
    readiness.includes("Demo proof ready") &&
    readiness.includes("Platform implementation missing") &&
    readiness.includes("Web CSS") &&
    readiness.includes("Platform implementation"),
  "readiness document contains required boundary markers"
);
addCheck(
  "handoff.slice-matrix",
  sliceMatrix.includes("UI_SLICE_MATRIX_READY") &&
    sliceMatrix.includes("Slice 1: AppShell + Main Tabs") &&
    sliceMatrix.includes("Slice 2: Bookshelf to Immersive Reading") &&
    sliceMatrix.includes("Slice 5: Session Capsule Minimum") &&
    sliceMatrix.includes("Deferred Full-Scale Work"),
  "slice matrix defines bounded startup and deferred full-scale work"
);
addCheck(
  "handoff.platform-evidence-requests",
  evidenceRequests.includes("UI_EVIDENCE_REQUEST_READY") &&
    evidenceRequests.includes("Build and smoke") &&
    evidenceRequests.includes("Native navigation") &&
    evidenceRequests.includes("Accessibility") &&
    evidenceRequests.includes("Performance") &&
    evidenceRequests.includes("WebView"),
  "platform evidence request separates UI proof from native proof"
);

const productionEntries = [
  "package.json",
  "vite.config.js",
  "vite.config.ts",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "build.gradle",
  "build.gradle.kts",
  "settings.gradle",
  "settings.gradle.kts",
  "Package.swift",
  "oh-package.json5",
  "hvigorfile.ts"
];
const presentProductionEntries = productionEntries.filter((relativePath) => exists(relativePath));
addCheck(
  "handoff.project-role",
  presentProductionEntries.length === 0 && read("README.md").includes("Not migrated:") && read("README.md").includes("Android source code"),
  presentProductionEntries.length === 0
    ? "design/handoff repository; no production frontend entry detected"
    : `unexpected production entries: ${presentProductionEntries.join(", ")}`
);

checks.forEach((check) => {
  const prefix = check.passed ? "PASS" : "FAIL";
  console.log(`${prefix} ${check.id}: ${check.detail}`);
});

const failed = checks.filter((check) => !check.passed);
if (failed.length > 0) {
  console.error(`ui handoff readiness failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}

console.log(`ui handoff readiness passed: ${checks.length}/${checks.length}`);
