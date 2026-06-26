import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const repoRoot = process.cwd();
const frontendRoot = path.join(repoRoot, "frontend-demo");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

const indexHtml = read("frontend-demo/index.html");
const renderLoader = read("frontend-demo/render.js");
const runtime = read("frontend-demo/render-runtime.js");
const controller = read("frontend-demo/motion-controller.js");
const routeContractSource = read("frontend-demo/route-contract.js");
const sourceFiles = [
  "frontend-demo/index.html",
  "frontend-demo/render.js",
  "frontend-demo/render-runtime.js",
  "frontend-demo/route-contract.js",
  "frontend-demo/shared-shell-kit/kit.js"
];

const context = { window: {} };
vm.createContext(context);
vm.runInContext(routeContractSource, context);
vm.runInContext(controller, context);
const routes = context.window.ReaderFrontendDemoDraftRouteContract.routes || {};
const motionController = context.window.ReaderMotionController || {};
const routeNames = Object.keys(routes);
const renderCases = [...runtime.matchAll(/case\s+"([^"]+)"\s*:/g)].map((match) => match[1]);
const renderCaseSet = new Set(renderCases);
const routeSet = new Set(routeNames);
const missingCases = routeNames.filter((route) => !renderCaseSet.has(route));
const extraCases = renderCases.filter((route) => !routeSet.has(route));

const bindMatches = [...runtime.matchAll(/bind\("([^"]+)"\s*,\s*"([^"]+)"\)/g)]
  .map(([, selector, motionId]) => ({ selector, motionId }));
const motionIds = [...new Set(bindMatches.map((item) => item.motionId))].sort();
const mappedDataAttributes = new Set();
bindMatches.forEach(({ selector }) => {
  [...selector.matchAll(/\[(data-[a-z0-9-]+)(?:[\]=~|^$*\s])/gi)]
    .forEach((match) => mappedDataAttributes.add(match[1]));
});

const sourceText = sourceFiles.map(read).join("\n");
const dataAttributes = [...new Set([...sourceText.matchAll(/\b(data-[a-z0-9-]+)(?=[\s=\]\}])/gi)]
  .map((match) => match[1]))]
  .filter((attribute) => !attribute.startsWith("data-motion-"))
  .sort();
const unmappedDataAttributes = dataAttributes.filter((attribute) => !mappedDataAttributes.has(attribute));
const indexRenderVersion = indexHtml.match(/render\.js\?v=([^"]+)/)?.[1] || "";
const loaderRuntimeVersion = renderLoader.match(/render-runtime\.js\?v=([^`"]+)/)?.[1] || "";
const indexMotionVersion = indexHtml.match(/motion-controller\.js\?v=([^"]+)/)?.[1] || "";

const requiredRuntimeMotionIds = [
  "app.firstOpen.enter",
  "app.route.push.forward",
  "app.route.pop.backward",
  "app.route.replace",
  "tab.item.switch",
  "viewport.orientation.reshape",
  "reader.entry.coverToImmersive",
  "reader.session.tts.start",
  "reader.session.autoPage.start"
];
const runtimeAndSelectorMotionIds = [...new Set(motionIds.concat(requiredRuntimeMotionIds))].sort();

const motionContract = motionController.CONTRACT || {};
const resolveMotionContract = typeof motionController.contractFor === "function"
  ? (motionId) => motionController.contractFor(motionId)
  : () => null;
const resolvedContractEntries = runtimeAndSelectorMotionIds
  .map((motionId) => ({ motionId, contract: resolveMotionContract(motionId) }));
const unresolvedMotionIds = resolvedContractEntries
  .filter((item) => !item.contract)
  .map((item) => item.motionId);
const incompleteContractEntries = resolvedContractEntries
  .filter(({ contract }) => contract && (
    !Array.isArray(contract.tokens) ||
    contract.tokens.length === 0 ||
    !Array.isArray(contract.stateFields) ||
    contract.stateFields.length < 5 ||
    !contract.platformComponents ||
    !contract.platformComponents.web ||
    !contract.platformComponents.android ||
    !contract.platformComponents.ios ||
    !contract.platformComponents.harmony ||
    !Array.isArray(contract.evidence) ||
    contract.evidence.length === 0
  ))
  .map((item) => item.motionId);

const checks = [
  {
    id: "route.contract.render-coverage",
    passed: routeNames.length === 131 && missingCases.length === 0 && extraCases.length === 0,
    detail: `${routeNames.length} routes, missing=${missingCases.length}, extra=${extraCases.length}`
  },
  {
    id: "motion.controller.file",
    passed: controller.includes("window.ReaderMotionController") && controller.includes("data-motion-controller") && Boolean(motionController.CONTRACT),
    detail: "motion-controller.js exports ReaderMotionController, writes controller state, and exposes CONTRACT"
  },
  {
    id: "motion.controller.loaded",
    passed: indexHtml.includes("motion-controller.js") && indexHtml.indexOf("motion-controller.js") < indexHtml.indexOf("render.js"),
    detail: "index.html loads controller before render.js"
  },
  {
    id: "motion.controller.runtime-cache-bust",
    passed: Boolean(indexMotionVersion && indexRenderVersion && loaderRuntimeVersion && indexRenderVersion === loaderRuntimeVersion),
    detail: `motion=${indexMotionVersion || "missing"}, render=${indexRenderVersion || "missing"}, runtime=${loaderRuntimeVersion || "missing"}`
  },
  {
    id: "motion.controller.runtime-create",
    passed: runtime.includes("ReaderMotionController.create({ root })"),
    detail: "render-runtime.js creates a controller for the active demo root"
  },
  {
    id: "motion.controller.runtime-ids",
    passed: requiredRuntimeMotionIds.every((motionId) => runtime.includes(motionId)),
    detail: requiredRuntimeMotionIds.join(", ")
  },
  {
    id: "motion.contract.executable-registry",
    passed: motionContract.version === "reader-motion-contract-v1" && Array.isArray(motionContract.rules) && motionContract.rules.length >= 25,
    detail: `${motionContract.version || "missing"}; rules=${Array.isArray(motionContract.rules) ? motionContract.rules.length : 0}`
  },
  {
    id: "motion.contract.id-resolution",
    passed: unresolvedMotionIds.length === 0 && incompleteContractEntries.length === 0,
    detail: `${runtimeAndSelectorMotionIds.length - unresolvedMotionIds.length}/${runtimeAndSelectorMotionIds.length} Motion IDs resolved; incomplete=${incompleteContractEntries.length}`
  },
  {
    id: "motion.selector.bindings",
    passed: bindMatches.length >= 58 && motionIds.length >= 50,
    detail: `${bindMatches.length} bind calls, ${motionIds.length} unique Motion IDs`
  },
  {
    id: "motion.selector.data-coverage",
    passed: dataAttributes.length >= 147 && dataAttributes.length - unmappedDataAttributes.length >= 125,
    detail: `${dataAttributes.length - unmappedDataAttributes.length}/${dataAttributes.length} data-* directly mapped`
  },
  {
    id: "motion.reduced-motion",
    passed: runtime.includes("motionReduced") && runtime.includes("prefers-reduced-motion") && controller.includes("reducedMotion"),
    detail: "URL/system reduced-motion state is visible to controller"
  }
];

const report = {
  generatedAt: new Date().toISOString(),
  source: "frontend-demo source verification",
  checks,
  summary: {
    passed: checks.filter((check) => check.passed).length,
    failed: checks.filter((check) => !check.passed).length,
    total: checks.length
  },
  routeCoverage: {
    totalRoutes: routeNames.length,
    renderCases: renderCases.length,
    missingCases,
    extraCases
  },
  selectorCoverage: {
    dataAttributeCount: dataAttributes.length,
    directMappedDataAttributeCount: dataAttributes.length - unmappedDataAttributes.length,
    unmappedDataAttributes,
    bindCallCount: bindMatches.length,
    motionIdCount: motionIds.length
  },
  executableContract: {
    version: motionContract.version || "",
    ruleCount: Array.isArray(motionContract.rules) ? motionContract.rules.length : 0,
    checkedMotionIds: runtimeAndSelectorMotionIds,
    unresolvedMotionIds,
    incompleteContractEntries
  }
};

const reportPath = path.join(frontendRoot, "verify/motion/motion-coverage-report.json");
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

checks.forEach((check) => {
  const marker = check.passed ? "PASS" : "FAIL";
  console.log(`${marker} ${check.id}: ${check.detail}`);
});
console.log(`motion coverage report: ${path.relative(repoRoot, reportPath)}`);

if (report.summary.failed > 0) {
  process.exitCode = 1;
}
