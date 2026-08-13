// Reader-UI Control Identity — public entry point
// R1.1 · 三层身份分离 (2026-07-20, baseline 9f7a0f5)

export {
  DATA_CONTROL_ID_ATTRIBUTE,
  DATA_CONTROL_TOKEN_ATTRIBUTE,
  DATA_CONTROL_CANDIDATE_KEY_ATTRIBUTE,
  DATA_CONTROL_KEY_ATTRIBUTE,
  DATA_ENTITY_KEY_ATTRIBUTE,
  DATA_UI_EVENT_ATTRIBUTE,
  DATA_VIEWPORT_ATTRIBUTE,
  MAPPING_STATUS_VALUES,
  PENDING_MAPPING_STATUS_VALUES,
  assertMappingStatusAllowsControlKeyWrite,
  composeControlId,
  getDataControlId,
  getDataControlToken,
  getDataControlKey,
  getDataEntityKey,
  getDataUiEvent,
  getDataViewport,
  isValidControlIdFormat,
  parseControlId,
  querySelectorForControlId,
  querySelectorForControlIdAndViewport,
  querySelectorForControlKey,
  querySelectorForEntityKey,
  resolveAllByControlKey,
  resolveAllByControlIds,
  resolveAllByEntityKey,
  resolveControlId,
  resolveControlIdAndViewport,
  setDataControlId,
  setDataControlToken,
  setDataControlKey,
  setDataEntityKey,
  setDataUiEvent,
  setDataViewport,
} from "./dom-identity";
export type { ParsedControlId, ControlMappingStatusValue } from "./dom-identity";

export {
  createControlIdResolver,
  queryElementByControlId,
  queryElementByControlIdAndViewport,
  queryElementsByControlKey,
  queryElementsByEntityKey,
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
