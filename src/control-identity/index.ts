// Reader-UI Control Identity — public entry point
// A2 · Control Identity Foundation (2026-07-19)

export {
  DATA_CONTROL_ID_ATTRIBUTE,
  DATA_CONTROL_CANDIDATE_KEY_ATTRIBUTE,
  composeControlId,
  getDataControlId,
  isValidControlIdFormat,
  parseControlId,
  querySelectorForControlId,
  resolveAllControlIds,
  resolveControlId,
  setDataControlId,
} from "./dom-identity";
export type { ParsedControlId } from "./dom-identity";

export {
  createControlIdResolver,
  queryElementByControlId,
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
  ScreenGraphBinding,
} from "../../contracts/control-identity.types";
