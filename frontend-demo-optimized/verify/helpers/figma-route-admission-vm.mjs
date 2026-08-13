import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

// Test-only bootstrap for isolated VM fixtures. It executes the same two
// production scripts that index.html loads before any public renderer. Tests
// must not paper over the runtime gate with a mock: a missing production
// policy remains a fail-closed condition in public-route-renderer-admission
// tests, while ordinary renderer tests can exercise the correctly-admitted
// Figma routes they actually own.
export function installFigmaRouteAdmissionVm(context, demoRoot) {
  for (const relativePath of [
    "figma-route-admission-policy.js",
    "public-route-renderer-admission.js",
  ]) {
    const filename = join(demoRoot, relativePath);
    new vm.Script(readFileSync(filename, "utf8"), { filename }).runInContext(context);
  }
}
