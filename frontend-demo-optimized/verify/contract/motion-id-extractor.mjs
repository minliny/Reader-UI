import vm from "node:vm";

const MOTION_ID_PATTERN = /^[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9][a-zA-Z0-9-]*)+$/;

function addPublishedMotionId(ids, value) {
  if (typeof value === "string" && MOTION_ID_PATTERN.test(value)) {
    ids.add(value);
  }
}

/**
 * Execute the controller in an isolated browser-shaped context and read only
 * fields that explicitly publish MotionId identities. State-machine values,
 * token references, family prefixes and wildcard selectors are deliberately
 * outside this boundary.
 */
export function extractMotionIdsFromController(text) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(text, context);

  const controller = context.window.ReaderMotionController;
  if (!controller || !controller.CONTRACT || !controller.DEFAULT_DURATIONS) {
    throw new Error("motion-controller.js did not publish ReaderMotionController contract metadata");
  }

  const ids = new Set();
  for (const id of Object.keys(controller.DEFAULT_DURATIONS)) {
    addPublishedMotionId(ids, id);
  }
  for (const entry of controller.CONTRACT.motionIds || []) {
    addPublishedMotionId(ids, entry && entry.id);
  }
  for (const [alias, canonicalId] of Object.entries(controller.CONTRACT.aliases || {})) {
    addPublishedMotionId(ids, alias);
    addPublishedMotionId(ids, canonicalId);
  }
  return ids;
}

/**
 * CSS only publishes a MotionId when an exact data-motion-*-id selector names
 * it. Prefix/suffix/contains selectors are rules, not concrete MotionIds.
 */
export function extractMotionIdsFromCss(text) {
  const ids = new Set();
  const exactAttributeSelector = /\[\s*data-motion(?:-[a-z0-9-]+)?-id\s*=\s*["']([^"']+)["']\s*\]/gi;
  let match;
  while ((match = exactAttributeSelector.exec(text)) !== null) {
    addPublishedMotionId(ids, match[1]);
  }
  return ids;
}
