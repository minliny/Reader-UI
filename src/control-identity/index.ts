// Reader-UI Control Identity — public entry point
// R1 · Control Identity 修复 (2026-07-20, baseline e35e739)

export {
  DATA_CONTROL_ID_ATTRIBUTE,
  DATA_CONTROL_CANDIDATE_KEY_ATTRIBUTE,
  DATA_VIEWPORT_ATTRIBUTE,
  composeControlId,
  getDataControlId,
  getDataViewport,
  isValidControlIdFormat,
  parseControlId,
  querySelectorForControlId,
  querySelectorForControlIdAndViewport,
  resolveAllControlIds,
  resolveControlId,
  resolveControlIdAndViewport,
  setDataControlId,
  setDataViewport,
} from "./dom-identity";
export type { ParsedControlId } from "./dom-identity";

export {
  createControlIdResolver,
  queryElementByControlId,
  queryElementByControlIdAndViewport,
  verifyDomCoverage,
} from "./control-id-resolver";
export type {
  ControlIdResolver,
  ControlIdResolverEntry,
} from "./control-id-resolver";

// Re-export the canonical types for consumer convenience.
export type {
  ControlIdentity,
  ControlIdRegistry,
  ControlIdRegistryEntry,
  ControlDomain,
  ControlFamily,
  ControlMappingStatus,
  ControlRole,
  ControlViewport,
  DomIdentityMap,
  DomIdentityMapEntry,
  NonInteractiveContainerEntry,
  NonInteractiveContainers,
  ScreenGraphBinding,
} from "../../contracts/control-identity.types";
