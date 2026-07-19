import { GENERATED_RUNTIME_TYPED_PAYLOAD_CONTRACTS } from "./generated-runtime-payload-contracts.mjs";

export class ReaderUIRuntimeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ReaderUIRuntimeError";
    this.code = code;
  }
}

/**
 * Validate and deep-clone a recursive JSON value without coercing types.
 * Unlike JSON.stringify/parse, this rejects non-JSON values instead of
 * silently converting Date, undefined, NaN or Infinity.
 */
export function cloneReaderUIJSONValue(value, path = "$", ancestors = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new ReaderUIRuntimeError("INVALID_JSON_PAYLOAD", `${path} must contain a finite JSON number`);
    }
    return value;
  }
  if (typeof value !== "object") {
    throw new ReaderUIRuntimeError("INVALID_JSON_PAYLOAD", `${path} contains a non-JSON value`);
  }
  if (ancestors.has(value)) {
    throw new ReaderUIRuntimeError("INVALID_JSON_PAYLOAD", `${path} contains a cyclic JSON value`);
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item, index) => cloneReaderUIJSONValue(item, `${path}[${index}]`, ancestors));
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new ReaderUIRuntimeError("INVALID_JSON_PAYLOAD", `${path} must contain only JSON objects`);
    }
    if (Reflect.ownKeys(value).some((key) => typeof key !== "string")) {
      throw new ReaderUIRuntimeError("INVALID_JSON_PAYLOAD", `${path} contains a non-string JSON object key`);
    }
    const result = {};
    for (const key of Object.keys(value)) {
      result[key] = cloneReaderUIJSONValue(value[key], `${path}.${key}`, ancestors);
    }
    return result;
  } finally {
    ancestors.delete(value);
  }
}

export function cloneReaderUIJSONPayload(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ReaderUIRuntimeError("INVALID_JSON_PAYLOAD", "payload must be a JSON object");
  }
  return cloneReaderUIJSONValue(payload, "payload");
}

/**
 * Result callbacks use the same lossless recursive JSON boundary as outgoing
 * effect payloads. Keeping a distinct entry point makes Host migrations
 * explicit while preserving the canonical JSON representation.
 */
export function cloneReaderUIJSONResult(result) {
  if (result === null || typeof result !== "object" || Array.isArray(result)) {
    throw new ReaderUIRuntimeError("INVALID_JSON_RESULT", "result must be a JSON object");
  }
  try {
    return cloneReaderUIJSONValue(result, "result");
  } catch (error) {
    if (error instanceof ReaderUIRuntimeError && error.code === "INVALID_JSON_PAYLOAD") {
      throw new ReaderUIRuntimeError("INVALID_JSON_RESULT", error.message);
    }
    throw error;
  }
}

export function legacyStringPayloadOrNull(payload) {
  const result = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value !== "string") return null;
    result[key] = value;
  }
  return result;
}

function legacyScalarProjection(payload) {
  const projected = {};
  let isComplete = true;
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") projected[key] = value;
    else if (typeof value === "number" || typeof value === "boolean") projected[key] = String(value);
    else isComplete = false;
  }
  return { payload: projected, isComplete };
}

function readerUIEffect(kind, type, jsonPayload, correlationId = null) {
  const canonical = cloneReaderUIJSONPayload(jsonPayload);
  const projection = legacyScalarProjection(canonical);
  return {
    kind,
    type,
    payload: projection.payload,
    jsonPayload: canonical,
    legacyPayloadIsComplete: projection.isComplete,
    correlationId
  };
}

function readerUIJSONString(payload, key) {
  const value = payload[key];
  return typeof value === "string" ? value : null;
}

function readerUIJSONInteger(value) {
  if (typeof value === "number") return Number.isInteger(value) ? value : null;
  if (typeof value !== "string" || !/^-?\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function readerUIJSONResultString(result, key) {
  const value = result[key];
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  throw new ReaderUIRuntimeError("INVALID_JSON_RESULT", `result.${key} must be a JSON string or null`);
}

function readerUIJSONResultInteger(result, key) {
  const value = result[key];
  if (value === undefined || value === null) return null;
  const parsed = readerUIJSONInteger(value);
  if (parsed !== null) return parsed;
  throw new ReaderUIRuntimeError("INVALID_JSON_RESULT", `result.${key} must be an integer JSON number or numeric string`);
}

function invalidTypedPayload(path, message) {
  throw new ReaderUIRuntimeError("INVALID_TYPED_PAYLOAD", `${path} ${message}`);
}

function validateTypedJSONValue(value, path) {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value))) {
      invalidTypedPayload(path, "must contain only finite numbers and IEEE-754 safe integers");
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateTypedJSONValue(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) validateTypedJSONValue(item, `${path}.${key}`);
  }
}

function validateTypedPayloadSchema(schema, value, path) {
  if (value === null) {
    if (schema.nullable === true) return;
    invalidTypedPayload(path, "must not be null");
  }
  if (Array.isArray(schema.oneOf)) {
    let accepted = 0;
    for (const branch of schema.oneOf) {
      try {
        validateTypedPayloadSchema(branch, value, path);
        accepted += 1;
      } catch (error) {
        if (!(error instanceof ReaderUIRuntimeError) || error.code !== "INVALID_TYPED_PAYLOAD") throw error;
      }
    }
    if (accepted !== 1) invalidTypedPayload(path, `must match exactly one schema variant (matched ${accepted})`);
    return;
  }
  switch (schema.type) {
    case "object": {
      if (typeof value !== "object" || Array.isArray(value)) invalidTypedPayload(path, "must be an object");
      const properties = schema.properties || {};
      for (const required of schema.required || []) {
        if (!Object.hasOwn(value, required)) invalidTypedPayload(`${path}.${required}`, "is required");
      }
      if (schema.additionalProperties === false) {
        for (const key of Object.keys(value)) {
          if (!Object.hasOwn(properties, key)) invalidTypedPayload(`${path}.${key}`, "is unknown");
        }
      } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
        for (const key of Object.keys(value)) {
          if (!Object.hasOwn(properties, key)) {
            validateTypedPayloadSchema(schema.additionalProperties, value[key], `${path}.${key}`);
          }
        }
      }
      for (const [key, childSchema] of Object.entries(properties)) {
        if (Object.hasOwn(value, key)) validateTypedPayloadSchema(childSchema, value[key], `${path}.${key}`);
      }
      for (const constraint of schema.constraints || []) {
        if (constraint.kind === "nonBlankWhen") {
          if (value[constraint.whenField] === constraint.equals &&
              (typeof value[constraint.field] !== "string" || value[constraint.field].trim().length === 0)) {
              invalidTypedPayload(`${path}.${constraint.field}`, "must be non-blank for this variant");
          }
        } else if (constraint.kind === "booleanAnyTrue") {
          const anyTrue = constraint.fields.some((field) =>
            (Object.hasOwn(value, field) ? value[field] : constraint.defaults?.[field]) === true
          );
          if (!anyTrue) invalidTypedPayload(path, `requires one of ${constraint.fields.join(", ")} to be true`);
        } else if (constraint.kind === "validRegexWhen") {
          const enabled = Object.hasOwn(value, constraint.flagField)
            ? value[constraint.flagField]
            : constraint.default;
          if (enabled === true) {
            try { new RegExp(value[constraint.field]); }
            catch { invalidTypedPayload(`${path}.${constraint.field}`, "must be a valid regular expression"); }
          }
        } else if (constraint.kind === "stringAnyNonBlank") {
          const anyNonBlank = constraint.fields.some((field) =>
            typeof value[field] === "string" && value[field].trim().length > 0
          );
          if (!anyNonBlank) invalidTypedPayload(path, `requires one of ${constraint.fields.join(", ")} to be non-blank`);
        } else {
          throw new ReaderUIRuntimeError("INVALID_TYPED_CONTRACT", `${path} has an unsupported constraint`);
        }
      }
      return;
    }
    case "array":
      if (!Array.isArray(value)) invalidTypedPayload(path, "must be an array");
      if (schema.minItems !== undefined && value.length < schema.minItems) invalidTypedPayload(path, `must contain at least ${schema.minItems} items`);
      if (schema.maxItems !== undefined && value.length > schema.maxItems) invalidTypedPayload(path, `must contain at most ${schema.maxItems} items`);
      value.forEach((item, index) => validateTypedPayloadSchema(schema.items, item, `${path}[${index}]`));
      return;
    case "string":
      if (typeof value !== "string") invalidTypedPayload(path, "must be a string");
      if (schema.minLength !== undefined && value.length < schema.minLength) invalidTypedPayload(path, `must contain at least ${schema.minLength} characters`);
      if (schema.maxLength !== undefined && value.length > schema.maxLength) invalidTypedPayload(path, `must contain at most ${schema.maxLength} characters`);
      if (schema.nonBlank === true && value.trim().length === 0) invalidTypedPayload(path, "must be non-blank");
      if (schema.pattern !== undefined && !(new RegExp(schema.pattern)).test(value)) invalidTypedPayload(path, `must match ${schema.pattern}`);
      break;
    case "integer":
      if (!Number.isSafeInteger(value)) invalidTypedPayload(path, "must be an IEEE-754 safe integer");
      break;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) invalidTypedPayload(path, "must be a finite number");
      break;
    case "boolean":
      if (typeof value !== "boolean") invalidTypedPayload(path, "must be a boolean");
      break;
    case "json":
      validateTypedJSONValue(value, path);
      return;
    default:
      throw new ReaderUIRuntimeError("INVALID_TYPED_CONTRACT", `${path} has unsupported schema type ${schema.type}`);
  }
  if (schema.const !== undefined && value !== schema.const) invalidTypedPayload(path, `must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) invalidTypedPayload(path, `must be one of ${schema.enum.join(", ")}`);
  if (schema.minimum !== undefined && value < schema.minimum) invalidTypedPayload(path, `must be >= ${schema.minimum}`);
  if (schema.maximum !== undefined && value > schema.maximum) invalidTypedPayload(path, `must be <= ${schema.maximum}`);
}

export function validateReaderUITypedPayload(event, payload) {
  const contract = GENERATED_RUNTIME_TYPED_PAYLOAD_CONTRACTS[event];
  if (!contract) return null;
  validateTypedPayloadSchema(contract.schema, payload, "payload");
  return contract;
}

export function validateReaderUITypedResult(event, effectType, result) {
  const contract = GENERATED_RUNTIME_TYPED_PAYLOAD_CONTRACTS[event];
  if (!contract) {
    throw new ReaderUIRuntimeError("INVALID_TYPED_CONTRACT", `No typed contract for ${event}`);
  }
  const resultContract = contract.resultSchemas[effectType];
  if (!resultContract) {
    throw new ReaderUIRuntimeError("UNDECLARED_TYPED_RESULT", `${event} does not declare a result for ${effectType}`);
  }
  try {
    validateTypedPayloadSchema(resultContract.schema, result, "result");
  } catch (error) {
    if (error instanceof ReaderUIRuntimeError && error.code === "INVALID_TYPED_PAYLOAD") {
      throw new ReaderUIRuntimeError("INVALID_TYPED_RESULT", error.message);
    }
    throw error;
  }
  return resultContract;
}

function descriptorMatchesTypedContract(descriptor, contract) {
  return descriptor.action === contract.descriptor.action &&
    (descriptor.value ?? null) === (contract.descriptor.value ?? null) &&
    (descriptor.hostRequest ?? null) === (contract.descriptor.hostRequest ?? null) &&
    JSON.stringify(descriptor.coreSequence || []) === JSON.stringify(contract.descriptor.coreSequence);
}

export function initialReaderUIState() {
  return {
    routeId: "bookshelf",
    routeStack: [],
    tab: "bookshelf",
    overlay: null,
    activeSession: null,
    loading: false,
    reducedMotion: false,
    readerPageIndex: 0,
    readerCanonicalLocation: null,
    focusTarget: null,
    error: null,
    bookOpenTransaction: null,
    pageTransaction: null,
    ttsTransaction: null,
    autoPageTransaction: null,
    playbackGeneration: 0,
    appearancePreference: initialReaderUIAppearancePreference(),
    appearanceTransaction: null,
    fontUnregisterRestartRequired: false,
    appearanceReconcileRequired: false
  };
}

export function initialReaderUIAppearancePreference() {
  return {
    schemaVersion: 1,
    revision: 0,
    activeThemeId: null,
    themes: [],
    typography: {
      fontFamily: null,
      fontSize: 17,
      lineHeight: 1.6,
      paragraphSpacing: 8,
      letterSpacing: 0,
      textAlign: "start"
    },
    fonts: []
  };
}

export const READER_FOREGROUND_TIMER_ARM = "timer.foreground.arm";
export const READER_FOREGROUND_TIMER_CANCEL = "timer.foreground.cancel";
export const READER_AUTO_PAGE_MIN_INTERVAL_MS = 250;
export const READER_AUTO_PAGE_MAX_INTERVAL_MS = 3_600_000;
const READER_IDENTITY_OR_ROUTE_MUTATION_EVENTS = new Set([
  "route.push",
  "route.replace",
  "route.pop",
  "route.popToRoot",
  "mainTab.select",
  "book.open",
  "reader.enter",
  "reader.exit",
  "source.switch.open",
  "source.switch.cancel"
]);
const READER_CONTROL_OVERLAY_FAMILY = new Set([
  "reader-control",
  "directory",
  "tts",
  "appearance",
  "settings"
]);
export const READER_APPEARANCE_PERSISTENCE_GET = "persistence.get";
export const READER_APPEARANCE_PERSISTENCE_PUT = "persistence.put";
export const READER_FONT_REGISTER_FILE = "font.registerFile";
export const READER_FONT_UNREGISTER_FILE = "font.unregisterFile";

export class ReaderUIRuntime {
  constructor(spec, state = initialReaderUIState()) {
    this.spec = spec;
    this.actions = new Map(spec.actions.map((item) => [item.event, item]));
    this.state = structuredClone(state);
  }

  dispatch(event, payload = {}, correlationId = null) {
    const descriptor = this.actions.get(event);
    if (!descriptor) throw new ReaderUIRuntimeError("UNSUPPORTED_EVENT", `No runtime action for ${event}`);
    payload = cloneReaderUIJSONPayload(payload);
    const typedContract = validateReaderUITypedPayload(event, payload);
    if (typedContract) {
      if (!descriptorMatchesTypedContract(descriptor, typedContract)) {
        throw new ReaderUIRuntimeError("INVALID_TYPED_CONTRACT", `${event} mapping drifted from ${typedContract.dispatchTarget}:${typedContract.operation}`);
      }
    }
    for (const field of descriptor.requiredPayload || []) {
      if (payload[field] === undefined || payload[field] === null || payload[field] === "") {
        throw new ReaderUIRuntimeError("MISSING_PAYLOAD", `${event} requires payload.${field}`);
      }
    }
    this.#checkGuards(descriptor, event);
    if (READER_IDENTITY_OR_ROUTE_MUTATION_EVENTS.has(event) &&
        this.state.pageTransaction?.stage === "persisting-progress") {
      throw new ReaderUIRuntimeError(
        "PAGE_PROGRESS_COMMIT_PENDING",
        `${event} cannot replace the reader route or identity while progress persistence is pending`
      );
    }
    if (descriptor.action === "bookOpenSequence") {
      this.#preflightBookOpen(event, payload, correlationId, descriptor);
    }
    if (descriptor.action === "appearanceTransaction") {
      this.#preflightAppearance(event, payload, correlationId, descriptor);
    }

    const previous = structuredClone(this.state);
    const effects = [];
    const cancelledCorrelationIds = [];
    const value = descriptor.value;

    if (event === "reader.page.next" || event === "reader.page.prev") {
      return this.#beginPageStep(
        event === "reader.page.next" ? "next" : "previous",
        correlationId,
        payload,
        "manual",
        previous,
        event
      );
    }
    if (event === "reader.tts.start") {
      return this.#beginTTS(correlationId, payload, previous, event);
    }
    if (event === "reader.tts.stop") {
      return this.#stopTTS(correlationId, previous, event);
    }
    if (event === "reader.autoPage.start") {
      return this.#beginAutoPage(correlationId, payload, previous, event);
    }
    if (event === "reader.autoPage.stop") {
      return this.#stopAutoPage(correlationId, previous, event);
    }

    if (event === "reader.exit" || event === "book.open") {
      const teardown = this.#teardownAllPlayback();
      effects.push(...teardown.effects);
      cancelledCorrelationIds.push(...teardown.cancelledCorrelationIds);
    }

    switch (descriptor.action) {
      case "pushRoute": {
        const routeId = value || readerUIJSONString(payload, "routeId") || readerUIJSONString(payload, "route");
        if (!routeId) throw new ReaderUIRuntimeError("MISSING_PAYLOAD", `${event} requires a routeId`);
        this.state.routeStack.push(this.state.routeId);
        this.state.routeId = routeId;
        this.state.overlay = null;
        break;
      }
      case "replaceRoute": {
        const routeId = value || readerUIJSONString(payload, "routeId") || readerUIJSONString(payload, "route");
        if (!routeId) throw new ReaderUIRuntimeError("MISSING_PAYLOAD", `${event} requires a routeId`);
        this.state.routeId = routeId;
        this.state.overlay = null;
        break;
      }
      case "popRoute":
        if (this.state.routeStack.length > 0) this.state.routeId = this.state.routeStack.pop();
        this.state.overlay = null;
        break;
      case "popToRoot":
        this.state.routeId = this.state.tab;
        this.state.routeStack = [];
        this.state.overlay = null;
        break;
      case "selectTab":
        if (!readerUIJSONString(payload, "tab")) {
          throw new ReaderUIRuntimeError("INVALID_JSON_PAYLOAD", `${event} requires payload.tab to be a string`);
        }
        this.state.tab = readerUIJSONString(payload, "tab");
        this.state.routeId = readerUIJSONString(payload, "tab");
        this.state.routeStack = [];
        break;
      case "setOverlay":
        this.state.overlay = value || readerUIJSONString(payload, "overlay");
        break;
      case "clearOverlay":
        this.state.overlay = null;
        break;
      case "clearOverlayIfMatches": {
        const expectedOverlay = value || readerUIJSONString(payload, "overlay");
        if (!expectedOverlay) throw new ReaderUIRuntimeError("MISSING_PAYLOAD", `${event} requires an overlay identity`);
        if (this.state.overlay === expectedOverlay) this.state.overlay = null;
        break;
      }
      case "toggleReaderControl": {
        if (this.state.routeId !== "immersive-reading") {
          throw new ReaderUIRuntimeError("READER_ROUTE_GUARD", `${event} requires the immersive-reading route`);
        }
        const currentOverlay = this.state.overlay;
        if (currentOverlay !== null && !READER_CONTROL_OVERLAY_FAMILY.has(currentOverlay)) {
          throw new ReaderUIRuntimeError("READER_CONTROL_OVERLAY_GUARD", `${event} cannot replace ${currentOverlay}`);
        }
        this.state.overlay = currentOverlay === null ? "reader-control" : null;
        break;
      }
      case "switchReaderModule": {
        if (this.state.routeId !== "immersive-reading") {
          throw new ReaderUIRuntimeError("READER_ROUTE_GUARD", `${event} requires the immersive-reading route`);
        }
        const currentOverlay = this.state.overlay;
        if (currentOverlay === null || !READER_CONTROL_OVERLAY_FAMILY.has(currentOverlay)) {
          throw new ReaderUIRuntimeError("READER_CONTROL_OVERLAY_GUARD", `${event} requires an active Reader control overlay`);
        }
        this.state.overlay = readerUIJSONString(payload, "module");
        break;
      }
      case "startSession":
        this.state.activeSession = value;
        this.state.overlay = null;
        break;
      case "stopSession":
        this.state.activeSession = null;
        break;
      case "setReducedMotion":
        this.state.reducedMotion = value === "true";
        break;
      case "bookOpenSequence": {
        if (!correlationId) {
          throw new ReaderUIRuntimeError("MISSING_CORRELATION", `${event} requires correlationId`);
        }
        const sourceKind = readerUIJSONString(payload, "sourceKind");
        if (sourceKind !== "remote" && sourceKind !== "local") {
          throw new ReaderUIRuntimeError("INVALID_SOURCE_KIND", `${event} requires payload.sourceKind=remote|local`);
        }
        const stages = [...(descriptor.coreSequence || [])];
        const firstStage = sourceKind === "local" ? "chapter.list" : "source.detail";
        const firstStageIndex = stages.indexOf(firstStage);
        if (firstStageIndex < 0 || !stages.includes("content.load") || !stages.includes("reader.location.resolve")) {
          throw new ReaderUIRuntimeError("INVALID_TRANSACTION", `${event} has an incomplete Core transaction`);
        }
        if (this.state.bookOpenTransaction) {
          if (this.state.bookOpenTransaction.correlationId === correlationId) {
            throw new ReaderUIRuntimeError("DUPLICATE_CORRELATION", `${event} was already dispatched for ${correlationId}`);
          }
          cancelledCorrelationIds.push(this.state.bookOpenTransaction.correlationId);
          this.#restoreBookOpenStart(this.state.bookOpenTransaction);
        }
        const restoreRouteId = this.state.routeId;
        const restoreRouteStack = this.state.routeStack.slice();
        const restoreOverlay = this.state.overlay;
        this.state.routeStack.push(this.state.routeId);
        this.state.routeId = "immersive-reading";
        this.state.overlay = null;
        this.state.loading = true;
        this.state.error = null;
        this.state.bookOpenTransaction = {
          correlationId,
          sourceKind,
          stages,
          stageIndex: firstStageIndex,
          requestedChapterIndex: this.#parseRequestedChapterIndex(payload.chapterIndex),
          selectedChapterIndex: null,
          payload: cloneReaderUIJSONPayload(payload),
          restoreRouteId,
          restoreRouteStack,
          restoreOverlay
        };
        break;
      }
      case "readerPageStep":
        throw new ReaderUIRuntimeError("INVALID_TRANSACTION", `${event} must use the page transaction`);
      case "appearanceTransaction": {
        const operation = descriptor.value;
        this.state.error = null;
        this.state.fontUnregisterRestartRequired = false;
        this.state.appearanceTransaction = {
          event,
          operation,
          correlationId,
          stage: operation === "font.register" ? "registering-font" : "loading",
          payload: cloneReaderUIJSONPayload(payload),
          fontRecord: operation === "font.register" ? {
            id: payload.fontId,
            path: payload.path,
            familyName: payload.familyName,
            fontNames: [payload.familyName],
            enabled: true
          } : null,
          workingPreference: null
        };
        break;
      }
      case "emitEffects":
        break;
      default:
        throw new ReaderUIRuntimeError("UNSUPPORTED_ACTION", `Unsupported runtime action ${descriptor.action}`);
    }

    if (descriptor.action === "bookOpenSequence") {
      effects.push(this.#bookOpenEffect(this.state.bookOpenTransaction));
    } else if (descriptor.action === "appearanceTransaction") {
      effects.push(this.#appearanceInitialEffect(this.state.appearanceTransaction));
    } else {
      for (const type of descriptor.coreSequence || []) {
        effects.push(readerUIEffect("core", type, payload, correlationId));
      }
      if (descriptor.hostRequest) {
        effects.push(readerUIEffect("host", descriptor.hostRequest, payload, correlationId));
      }
    }
    return { previous, state: structuredClone(this.state), effects, event, cancelledCorrelationIds };
  }

  acceptAppearanceHostResult(hostType, correlationId, jsonResult = {}) {
    const previous = structuredClone(this.state);
    const transaction = this.state.appearanceTransaction;
    if (!transaction || transaction.correlationId !== correlationId) {
      return { accepted: false, previous, state: structuredClone(this.state), effects: [] };
    }
    try {
    const result = cloneReaderUIJSONResult(jsonResult);
    if (transaction.stage === "registering-font") {
      if (hostType !== READER_FONT_REGISTER_FILE) return { accepted: false, previous, state: structuredClone(this.state), effects: [] };
      validateReaderUITypedResult(transaction.event, hostType, result);
      this.#assertExactResultKeys(result, ["registered", "path", "familyName", "fontNames"], "font.registerFile");
      if (result.registered !== true || typeof result.path !== "string" || result.path.trim().length === 0 ||
          typeof result.familyName !== "string" || result.familyName.trim().length === 0 ||
          !Array.isArray(result.fontNames) || result.fontNames.length === 0 ||
          result.fontNames.some((name) => typeof name !== "string" || name.trim().length === 0)) {
        throw new ReaderUIRuntimeError("INVALID_APPEARANCE_RESULT", "font.registerFile returned an invalid registration result");
      }
      transaction.fontRecord = {
        id: transaction.payload.fontId,
        path: result.path,
        familyName: result.familyName,
        fontNames: result.fontNames.slice(),
        enabled: true
      };
      transaction.stage = "loading";
      return this.#appearanceResult(true, previous, [this.#appearanceLoadEffect(transaction)]);
    }
    if (transaction.stage === "loading") {
      if (hostType !== READER_APPEARANCE_PERSISTENCE_GET) return { accepted: false, previous, state: structuredClone(this.state), effects: [] };
      validateReaderUITypedResult(transaction.event, hostType, result);
      const current = this.#decodeAppearanceLoadResult(result);
      if (transaction.operation === "config.loadPersisted") {
        this.state.appearancePreference = current;
        this.state.appearanceTransaction = null;
        this.state.error = null;
        this.state.appearanceReconcileRequired = false;
        return this.#appearanceResult(true, previous);
      }
      const working = this.#applyAppearanceOperation(transaction, current);
      transaction.workingPreference = working;
      transaction.stage = "saving";
      return this.#appearanceResult(true, previous, [this.#appearanceSaveEffect(transaction, current.revision)]);
    }
    if (transaction.stage === "saving") {
      if (hostType !== READER_APPEARANCE_PERSISTENCE_PUT) return { accepted: false, previous, state: structuredClone(this.state), effects: [] };
      validateReaderUITypedResult(transaction.event, hostType, result);
      this.#assertExactResultKeys(result, ["stored", "revision"], "persistence.put");
      const revision = this.#parseRevision(result.revision, "result.revision");
      if (result.stored !== true || !transaction.workingPreference || revision !== transaction.workingPreference.revision) {
        throw new ReaderUIRuntimeError("INVALID_APPEARANCE_RESULT", "persistence.put returned an invalid revision result");
      }
      this.state.appearancePreference = cloneReaderUIJSONValue(transaction.workingPreference);
      this.state.appearanceReconcileRequired = false;
      if (transaction.operation === "font.unregister") {
        transaction.stage = "unregistering-font";
        return this.#appearanceResult(true, previous, [this.#fontUnregisterEffect(transaction)]);
      }
      this.state.appearanceTransaction = null;
      this.state.error = null;
      return this.#appearanceResult(true, previous);
    }
    if (transaction.stage === "unregistering-font" || transaction.stage === "rolling-back-font") {
      if (hostType !== READER_FONT_UNREGISTER_FILE) return { accepted: false, previous, state: structuredClone(this.state), effects: [] };
      validateReaderUITypedResult(transaction.event, hostType, result);
      this.#assertExactResultKeys(result, ["logicalUnregistered", "physicallyUnregistered", "restartRequired"], "font.unregisterFile");
      if (result.logicalUnregistered !== true || typeof result.physicallyUnregistered !== "boolean" ||
          typeof result.restartRequired !== "boolean" || (!result.physicallyUnregistered && !result.restartRequired)) {
        throw new ReaderUIRuntimeError("INVALID_APPEARANCE_RESULT", "font.unregisterFile must report logical unregister and restart requirements");
      }
      this.state.fontUnregisterRestartRequired = result.restartRequired;
      this.state.appearanceTransaction = null;
      if (transaction.stage === "unregistering-font") this.state.error = null;
      return this.#appearanceResult(true, previous);
    }
    return { accepted: false, previous, state: structuredClone(this.state), effects: [] };
    } catch (error) {
      return this.#terminateAppearanceError(previous, transaction, error);
    }
  }

  failAppearanceHostResult(hostType, correlationId, code = "APPEARANCE_HOST_FAILED") {
    const previous = structuredClone(this.state);
    const transaction = this.state.appearanceTransaction;
    if (!transaction || transaction.correlationId !== correlationId) {
      return { accepted: false, previous, state: structuredClone(this.state), effects: [] };
    }
    const expected = transaction.stage === "registering-font" ? READER_FONT_REGISTER_FILE
      : transaction.stage === "loading" ? READER_APPEARANCE_PERSISTENCE_GET
      : transaction.stage === "saving" ? READER_APPEARANCE_PERSISTENCE_PUT
      : READER_FONT_UNREGISTER_FILE;
    if (hostType !== expected) return { accepted: false, previous, state: structuredClone(this.state), effects: [] };
    return this.#terminateAppearanceError(
      previous,
      transaction,
      new ReaderUIRuntimeError(String(code || "APPEARANCE_HOST_FAILED"), String(code || "APPEARANCE_HOST_FAILED"))
    );
  }

  beginPageStep(direction, correlationId, payload = {}) {
    return this.#beginPageStep(direction, correlationId, payload, "manual", structuredClone(this.state), "reader.page.explicit");
  }

  providePageLayout(correlationId, layout) {
    const previous = structuredClone(this.state);
    const transaction = this.state.pageTransaction;
    if (!transaction || transaction.correlationId !== correlationId || transaction.stage !== "awaiting-layout") {
      return this.#playbackResult(false, previous);
    }
    const normalized = this.#normalizePageLayout(layout);
    transaction.stage = "resolving-location";
    transaction.layout = normalized;
    return this.#playbackResult(true, previous, [this.#pageLocationEffect(transaction)]);
  }

  acceptPageLocationResult(correlationId, jsonResult = {}) {
    const previous = structuredClone(this.state);
    const transaction = this.state.pageTransaction;
    if (!transaction || transaction.correlationId !== correlationId || transaction.stage !== "resolving-location") {
      return this.#playbackResult(false, previous);
    }
    const result = cloneReaderUIJSONResult(jsonResult);
    validateReaderUITypedResult(transaction.contractEvent, "reader.location.resolve", result);
    const canonicalLocation = readerUIJSONResultString(result, "canonicalLocation");
    const pageIndex = readerUIJSONResultInteger(result, "pageIndex");
    const error = readerUIJSONResultString(result, "error");
    if (error) {
      this.state.pageTransaction = null;
      this.state.error = error;
      this.#finishFailedAutoPage(transaction);
      return this.#playbackResult(true, previous);
    }
    if (typeof canonicalLocation !== "string" || canonicalLocation.trim().length === 0 ||
        !Number.isInteger(pageIndex) || pageIndex < 0) {
      this.state.pageTransaction = null;
      this.state.error = "PAGE_LOCATION_INVALID_RESULT";
      this.#finishFailedAutoPage(transaction);
      return this.#playbackResult(true, previous);
    }
    transaction.stage = "persisting-progress";
    transaction.pendingCanonicalLocation = canonicalLocation;
    transaction.pendingPageIndex = pageIndex;
    this.state.error = null;
    return this.#playbackResult(true, previous, [this.#pageProgressEffect(transaction)]);
  }

  acceptPageProgressResult(correlationId, jsonResult = {}) {
    const previous = structuredClone(this.state);
    const transaction = this.state.pageTransaction;
    if (!transaction || transaction.correlationId !== correlationId || transaction.stage !== "persisting-progress") {
      return this.#playbackResult(false, previous);
    }
    const result = cloneReaderUIJSONResult(jsonResult);
    validateReaderUITypedResult(transaction.contractEvent, "reader.progress.update", result);
    const stored = result.stored === true;
    const error = readerUIJSONResultString(result, "error");
    this.state.pageTransaction = null;
    if (error) {
      this.state.error = error;
      this.#finishFailedAutoPage(transaction);
      return this.#playbackResult(true, previous);
    }
    if (!stored || typeof transaction.pendingCanonicalLocation !== "string" ||
        !Number.isInteger(transaction.pendingPageIndex)) {
      this.state.error = "PAGE_PROGRESS_INVALID_RESULT";
      this.#finishFailedAutoPage(transaction);
      return this.#playbackResult(true, previous);
    }
    this.state.readerCanonicalLocation = transaction.pendingCanonicalLocation;
    this.state.readerPageIndex = transaction.pendingPageIndex;
    this.state.error = null;

    const effects = [];
    const autoPage = this.state.autoPageTransaction;
    if (transaction.source === "auto-page" && autoPage &&
        autoPage.correlationId === transaction.sessionCorrelationId &&
        autoPage.generation === transaction.generation && this.state.activeSession === "auto-page") {
      autoPage.timerArmed = true;
      effects.push(this.#timerEffect(READER_FOREGROUND_TIMER_ARM, autoPage));
    }
    return this.#playbackResult(true, previous, effects);
  }

  acceptPageProgressJSONResult(correlationId, result = {}) {
    return this.acceptPageProgressResult(correlationId, result);
  }

  cancelPageStep(correlationId) {
    const previous = structuredClone(this.state);
    const transaction = this.state.pageTransaction;
    if (!transaction || transaction.correlationId !== correlationId) return this.#playbackResult(false, previous);
    if (transaction.stage === "persisting-progress") {
      throw new ReaderUIRuntimeError(
        "PAGE_PROGRESS_COMMIT_PENDING",
        "reader.progress.update was already dispatched and cannot be cancelled or rolled back"
      );
    }
    this.state.pageTransaction = null;
    return this.#playbackResult(true, previous, [], [correlationId]);
  }

  acceptTTSCoreResult(coreType, correlationId, jsonResult = {}) {
    const previous = structuredClone(this.state);
    const transaction = this.state.ttsTransaction;
    const expected = transaction?.stage === "awaiting-plan"
      ? "tts.queue.plan"
      : transaction?.stage === "awaiting-queue-start" ? "tts.queue.start" : null;
    if (!transaction || transaction.correlationId !== correlationId || expected !== coreType) {
      return this.#playbackResult(false, previous);
    }
    const result = cloneReaderUIJSONResult(jsonResult);
    validateReaderUITypedResult(transaction.event, coreType, result);
    const error = readerUIJSONResultString(result, "error");
    if (error) {
      const effects = this.#ttsTeardownEffects(transaction);
      this.state.ttsTransaction = null;
      this.state.activeSession = null;
      this.state.error = error;
      return this.#playbackResult(true, previous, effects, [correlationId]);
    }
    if (coreType === "tts.queue.plan") {
      transaction.stage = "awaiting-queue-start";
      return this.#playbackResult(true, previous, [this.#ttsCoreEffect("tts.queue.start", transaction)]);
    }
    transaction.stage = "awaiting-speech-start";
    transaction.queueLoaded = true;
    return this.#playbackResult(true, previous, [this.#ttsHostEffect("tts.system.start", transaction)]);
  }

  acceptTTSSystemStart(correlationId, jsonResult = {}) {
    const previous = structuredClone(this.state);
    const transaction = this.state.ttsTransaction;
    if (!transaction || transaction.correlationId !== correlationId || transaction.stage !== "awaiting-speech-start") {
      return this.#playbackResult(false, previous);
    }
    const result = cloneReaderUIJSONResult(jsonResult);
    validateReaderUITypedResult(transaction.event, "tts.system.start", result);
    const error = readerUIJSONResultString(result, "error");
    if (error) {
      const effects = this.#ttsTeardownEffects(transaction, true);
      this.state.ttsTransaction = null;
      this.state.activeSession = null;
      this.state.error = error;
      return this.#playbackResult(true, previous, effects, [correlationId]);
    }
    transaction.stage = "playing";
    transaction.speechStarted = true;
    this.state.activeSession = "tts";
    this.state.error = null;
    return this.#playbackResult(true, previous);
  }

  stopTTS(correlationId = null) {
    return this.#stopTTS(correlationId, structuredClone(this.state), "reader.tts.stop");
  }

  acceptAutoPageTimerFired(correlationId, generation) {
    const previous = structuredClone(this.state);
    const transaction = this.state.autoPageTransaction;
    if (this.state.pageTransaction?.stage === "persisting-progress") {
      throw new ReaderUIRuntimeError(
        "PAGE_PROGRESS_COMMIT_PENDING",
        "reader.autoPage.timer waits for the in-flight progress commit"
      );
    }
    if (!transaction || transaction.correlationId !== correlationId || transaction.generation !== generation ||
        !transaction.timerArmed || this.state.activeSession !== "auto-page" || this.state.pageTransaction) {
      return this.#playbackResult(false, previous);
    }
    transaction.timerArmed = false;
    transaction.tick += 1;
    const pageCorrelationId = `${correlationId}:page:${generation}:${transaction.tick}`;
    const page = this.#beginPageStep(
      "next",
      pageCorrelationId,
      {},
      "auto-page",
      previous,
      "reader.autoPage.timer",
      correlationId,
      generation
    );
    return {
      accepted: true,
      previous,
      state: page.state,
      effects: page.effects,
      cancelledCorrelationIds: page.cancelledCorrelationIds
    };
  }

  stopAutoPage(correlationId = null) {
    return this.#stopAutoPage(correlationId, structuredClone(this.state), "reader.autoPage.stop");
  }

  suspendAutoPageForBackground(correlationId = null) {
    return this.#stopAutoPage(correlationId, structuredClone(this.state), "reader.autoPage.background");
  }

  acceptBookOpenResult(coreType, correlationId, jsonResult = {}) {
    const previous = structuredClone(this.state);
    const transaction = this.state.bookOpenTransaction;
    if (!transaction || transaction.correlationId !== correlationId || transaction.stages[transaction.stageIndex] !== coreType) {
      return { accepted: false, previous, state: structuredClone(this.state), effects: [] };
    }
    const result = cloneReaderUIJSONResult(jsonResult);
    validateReaderUITypedResult("book.open", coreType, result);
    const chapterCount = readerUIJSONResultInteger(result, "chapterCount");
    const error = readerUIJSONResultString(result, "error");
    if (error) {
      this.state.loading = false;
      this.state.error = error;
      this.state.bookOpenTransaction = null;
      return { accepted: true, previous, state: structuredClone(this.state), effects: [] };
    }

    if (coreType === "chapter.list") {
      if (!Number.isInteger(chapterCount) || chapterCount <= 0) {
        this.state.loading = false;
        this.state.error = "BOOK_OPEN_EMPTY_TOC";
        this.state.bookOpenTransaction = null;
        return { accepted: true, previous, state: structuredClone(this.state), effects: [] };
      }
      transaction.selectedChapterIndex = Math.min(transaction.requestedChapterIndex, chapterCount - 1);
    }

    if (coreType === "content.load") {
      transaction.stageIndex = transaction.stages.indexOf("content.load");
      transaction.awaitingLayout = true;
      return { accepted: true, previous, state: structuredClone(this.state), effects: [] };
    }

    if (coreType === "reader.location.resolve") {
      this.state.readerCanonicalLocation = readerUIJSONResultString(result, "canonicalLocation");
      this.state.readerPageIndex = readerUIJSONResultInteger(result, "pageIndex");
    }

    const nextStageIndex = transaction.stageIndex + 1;
    if (nextStageIndex >= transaction.stages.length) {
      this.state.loading = false;
      this.state.error = null;
      this.state.bookOpenTransaction = null;
      return { accepted: true, previous, state: structuredClone(this.state), effects: [] };
    }
    transaction.stageIndex = nextStageIndex;
    const effect = this.#bookOpenEffect(transaction);
    return { accepted: true, previous, state: structuredClone(this.state), effects: [effect] };
  }

  provideBookOpenLayout(correlationId, layout) {
    const previous = structuredClone(this.state);
    const transaction = this.state.bookOpenTransaction;
    if (!transaction || transaction.correlationId !== correlationId || !transaction.awaitingLayout) {
      return { accepted: false, previous, state: structuredClone(this.state), effects: [] };
    }
    const normalizedLayout = this.#normalizeBookOpenLayout(layout);
    const locationStageIndex = transaction.stages.indexOf("reader.location.resolve");
    if (locationStageIndex < 0) {
      throw new ReaderUIRuntimeError("INVALID_TRANSACTION", "book.open has no reader.location.resolve stage");
    }
    transaction.stageIndex = locationStageIndex;
    transaction.awaitingLayout = false;
    transaction.layout = normalizedLayout;
    const effect = this.#bookOpenEffect(transaction);
    return { accepted: true, previous, state: structuredClone(this.state), effects: [effect] };
  }

  cancelBookOpen(correlationId) {
    const previous = structuredClone(this.state);
    const transaction = this.state.bookOpenTransaction;
    if (!transaction || transaction.correlationId !== correlationId) {
      return { accepted: false, previous, state: structuredClone(this.state), effects: [] };
    }
    this.#restoreBookOpenStart(transaction);
    this.state.bookOpenTransaction = null;
    return { accepted: true, previous, state: structuredClone(this.state), effects: [] };
  }

  completeAsync({ error = null } = {}) {
    this.state.loading = false;
    this.state.error = error;
    return structuredClone(this.state);
  }

  #beginPageStep(
    direction,
    correlationId,
    payload,
    source,
    previous,
    event,
    sessionCorrelationId = null,
    generation = null
  ) {
    this.#requireActiveReader(event);
    if (!correlationId) throw new ReaderUIRuntimeError("MISSING_CORRELATION", `${event} requires correlationId`);
    if (this.state.bookOpenTransaction) {
      throw new ReaderUIRuntimeError("BOOK_OPEN_TRANSACTION_PENDING", `${event} waits for the active book.open transaction`);
    }
    if (!["next", "previous", "explicit"].includes(direction)) {
      throw new ReaderUIRuntimeError("INVALID_PAGE_DIRECTION", `${event} requires next|previous|explicit`);
    }
    if (this.state.pageTransaction?.correlationId === correlationId) {
      throw new ReaderUIRuntimeError("DUPLICATE_CORRELATION", `${event} was already dispatched for ${correlationId}`);
    }
    if (this.state.pageTransaction?.stage === "persisting-progress") {
      throw new ReaderUIRuntimeError(
        "PAGE_PROGRESS_COMMIT_PENDING",
        `${event} waits for the in-flight progress commit`
      );
    }
    const cancelledCorrelationIds = [];
    const effects = [];
    if (source === "manual" && this.state.autoPageTransaction) {
      const teardown = this.#stopAutoPage(
        null,
        structuredClone(this.state),
        "reader.autoPage.interrupted-by-manual-page"
      );
      effects.push(...teardown.effects);
      cancelledCorrelationIds.push(...teardown.cancelledCorrelationIds);
    }
    const active = this.state.pageTransaction;
    if (active) {
      cancelledCorrelationIds.push(active.correlationId);
    }
    this.state.pageTransaction = {
      correlationId,
      direction,
      source,
      contractEvent: source === "auto-page" ? "reader.autoPage.start" : event,
      sessionCorrelationId,
      generation,
      stage: "awaiting-layout",
      payload: cloneReaderUIJSONPayload(payload)
    };
    this.state.error = null;
    return {
      previous,
      state: structuredClone(this.state),
      effects,
      event,
      cancelledCorrelationIds
    };
  }

  #beginTTS(correlationId, payload, previous, event) {
    this.#requireActiveReader(event);
    if (!correlationId) throw new ReaderUIRuntimeError("MISSING_CORRELATION", `${event} requires correlationId`);
    if (["text", "content", "chapterBody"].some((field) => payload[field] !== undefined)) {
      throw new ReaderUIRuntimeError("INVALID_TTS_PAYLOAD", `${event} binds chapter content through Host DomainContext`);
    }
    if (this.state.ttsTransaction?.correlationId === correlationId) {
      throw new ReaderUIRuntimeError("DUPLICATE_CORRELATION", `${event} was already dispatched for ${correlationId}`);
    }
    const teardown = this.#teardownPlaybackSession();
    this.state.ttsTransaction = {
      correlationId,
      event,
      stage: "awaiting-plan",
      queueLoaded: false,
      speechStarted: false,
      payload: cloneReaderUIJSONPayload(payload)
    };
    this.state.activeSession = null;
    this.state.overlay = null;
    this.state.error = null;
    teardown.effects.push(this.#ttsCoreEffect("tts.queue.plan", this.state.ttsTransaction));
    return {
      previous,
      state: structuredClone(this.state),
      effects: teardown.effects,
      event,
      cancelledCorrelationIds: teardown.cancelledCorrelationIds
    };
  }

  #stopTTS(correlationId, previous, event) {
    const transaction = this.state.ttsTransaction;
    if (!transaction || (correlationId && transaction.correlationId !== correlationId)) {
      return {
        accepted: false,
        previous,
        state: structuredClone(this.state),
        effects: [],
        event,
        cancelledCorrelationIds: []
      };
    }
    const effects = this.#ttsTeardownEffects(transaction);
    this.state.ttsTransaction = null;
    this.state.activeSession = null;
    this.state.error = null;
    return {
      accepted: true,
      previous,
      state: structuredClone(this.state),
      effects,
      event,
      cancelledCorrelationIds: [transaction.correlationId]
    };
  }

  #beginAutoPage(correlationId, payload, previous, event) {
    this.#requireActiveReader(event);
    if (!correlationId) throw new ReaderUIRuntimeError("MISSING_CORRELATION", `${event} requires correlationId`);
    const intervalMs = readerUIJSONInteger(payload.intervalMs);
    if (intervalMs === null || intervalMs < READER_AUTO_PAGE_MIN_INTERVAL_MS ||
        intervalMs > READER_AUTO_PAGE_MAX_INTERVAL_MS) {
      throw new ReaderUIRuntimeError(
        "INVALID_AUTO_PAGE_INTERVAL",
        `${event} requires intervalMs=${READER_AUTO_PAGE_MIN_INTERVAL_MS}..${READER_AUTO_PAGE_MAX_INTERVAL_MS}`
      );
    }
    if (this.state.autoPageTransaction?.correlationId === correlationId) {
      throw new ReaderUIRuntimeError("DUPLICATE_CORRELATION", `${event} was already dispatched for ${correlationId}`);
    }
    if (this.state.pageTransaction) {
      const code = this.state.pageTransaction.stage === "persisting-progress"
        ? "PAGE_PROGRESS_COMMIT_PENDING"
        : "PAGE_TRANSACTION_PENDING";
      throw new ReaderUIRuntimeError(code, `${event} waits for the active page transaction`);
    }
    const teardown = this.#teardownPlaybackSession();
    this.state.playbackGeneration += 1;
    this.state.autoPageTransaction = {
      correlationId,
      intervalMs,
      generation: this.state.playbackGeneration,
      tick: 0,
      timerArmed: true
    };
    this.state.activeSession = "auto-page";
    this.state.overlay = null;
    this.state.error = null;
    teardown.effects.push(this.#timerEffect(READER_FOREGROUND_TIMER_ARM, this.state.autoPageTransaction));
    return {
      previous,
      state: structuredClone(this.state),
      effects: teardown.effects,
      event,
      cancelledCorrelationIds: teardown.cancelledCorrelationIds
    };
  }

  #stopAutoPage(correlationId, previous, event) {
    const transaction = this.state.autoPageTransaction;
    if (!transaction || (correlationId && transaction.correlationId !== correlationId)) {
      return {
        accepted: false,
        previous,
        state: structuredClone(this.state),
        effects: [],
        event,
        cancelledCorrelationIds: []
      };
    }
    const cancelledCorrelationIds = [transaction.correlationId];
    if (this.state.pageTransaction?.source === "auto-page" &&
        this.state.pageTransaction.sessionCorrelationId === transaction.correlationId) {
      if (this.state.pageTransaction.stage !== "persisting-progress") {
        cancelledCorrelationIds.push(this.state.pageTransaction.correlationId);
        this.state.pageTransaction = null;
      }
    }
    const effects = [this.#timerEffect(READER_FOREGROUND_TIMER_CANCEL, transaction)];
    this.state.playbackGeneration += 1;
    this.state.autoPageTransaction = null;
    this.state.activeSession = null;
    this.state.error = null;
    return {
      accepted: true,
      previous,
      state: structuredClone(this.state),
      effects,
      event,
      cancelledCorrelationIds
    };
  }

  #teardownPlaybackSession() {
    const effects = [];
    const cancelledCorrelationIds = [];
    const tts = this.state.ttsTransaction;
    if (tts) {
      cancelledCorrelationIds.push(tts.correlationId);
      effects.push(...this.#ttsTeardownEffects(tts));
      this.state.ttsTransaction = null;
    }
    const autoPage = this.state.autoPageTransaction;
    if (autoPage) {
      cancelledCorrelationIds.push(autoPage.correlationId);
      effects.push(this.#timerEffect(READER_FOREGROUND_TIMER_CANCEL, autoPage));
      if (this.state.pageTransaction?.source === "auto-page" &&
          this.state.pageTransaction.sessionCorrelationId === autoPage.correlationId) {
        if (this.state.pageTransaction.stage !== "persisting-progress") {
          cancelledCorrelationIds.push(this.state.pageTransaction.correlationId);
          this.state.pageTransaction = null;
        }
      }
      this.state.playbackGeneration += 1;
      this.state.autoPageTransaction = null;
    }
    this.state.activeSession = null;
    return { effects, cancelledCorrelationIds };
  }

  #teardownAllPlayback() {
    const teardown = this.#teardownPlaybackSession();
    if (this.state.pageTransaction && this.state.pageTransaction.stage !== "persisting-progress") {
      teardown.cancelledCorrelationIds.push(this.state.pageTransaction.correlationId);
      this.state.pageTransaction = null;
    }
    return teardown;
  }

  #ttsTeardownEffects(transaction, forceSystemStop = false) {
    const effects = [];
    if (transaction.speechStarted || forceSystemStop) {
      effects.push(this.#ttsHostEffect("tts.system.stop", transaction));
    }
    if (transaction.queueLoaded) {
      effects.push(this.#ttsCoreEffect("tts.queue.stop", transaction));
    }
    return effects;
  }

  #ttsCoreEffect(type, transaction) {
    return readerUIEffect(
      "core",
      type,
      type === "tts.queue.plan" ? transaction.payload : {},
      transaction.correlationId
    );
  }

  #ttsHostEffect(type, transaction) {
    return readerUIEffect("host", type, {}, transaction.correlationId);
  }

  #timerEffect(type, transaction) {
    return readerUIEffect(
      "host",
      type,
      {
        timerId: transaction.correlationId,
        correlationId: transaction.correlationId,
        delayMs: transaction.intervalMs,
        generation: transaction.generation,
        oneShot: true,
        foregroundOnly: true
      },
      transaction.correlationId
    );
  }

  #pageLocationEffect(transaction) {
    const layout = transaction.layout;
    return readerUIEffect(
      "core",
      "reader.location.resolve",
      {
        ...cloneReaderUIJSONPayload(transaction.payload),
        direction: transaction.direction,
        anchor: layout.anchor,
        targetPageIndex: layout.targetPageIndex,
        chapterIndex: layout.chapterIndex,
        chapterOffset: layout.chapterOffset,
        chapterProgress: layout.chapterProgress,
        viewportWidth: layout.viewportWidth,
        viewportHeight: layout.viewportHeight,
        fontScale: layout.fontScale
      },
      transaction.correlationId
    );
  }

  #pageProgressEffect(transaction) {
    return readerUIEffect("core", "reader.progress.update", {}, transaction.correlationId);
  }

  #normalizePageLayout(layout) {
    const integer = (field, minimum) => {
      const value = Number(layout?.[field]);
      if (!Number.isInteger(value) || value < minimum) {
        throw new ReaderUIRuntimeError("INVALID_PAGE_LAYOUT", `page transaction requires valid ${field}`);
      }
      return value;
    };
    const numeric = (field, minimum, maximum = null) => {
      const value = Number(layout?.[field]);
      if (!Number.isFinite(value) || value < minimum || (maximum !== null && value > maximum)) {
        throw new ReaderUIRuntimeError("INVALID_PAGE_LAYOUT", `page transaction requires valid ${field}`);
      }
      return value;
    };
    if (typeof layout?.anchor !== "string" || layout.anchor.length === 0) {
      throw new ReaderUIRuntimeError("INVALID_PAGE_LAYOUT", "page transaction requires a real anchor");
    }
    return {
      anchor: layout.anchor,
      targetPageIndex: integer("targetPageIndex", 0),
      chapterIndex: integer("chapterIndex", 0),
      chapterOffset: integer("chapterOffset", 0),
      chapterProgress: numeric("chapterProgress", 0, 1),
      viewportWidth: integer("viewportWidth", 1),
      viewportHeight: integer("viewportHeight", 1),
      fontScale: numeric("fontScale", Number.EPSILON)
    };
  }

  #finishFailedAutoPage(pageTransaction) {
    const autoPage = this.state.autoPageTransaction;
    if (pageTransaction.source !== "auto-page" || !autoPage ||
        autoPage.correlationId !== pageTransaction.sessionCorrelationId ||
        autoPage.generation !== pageTransaction.generation) return;
    this.state.playbackGeneration += 1;
    this.state.autoPageTransaction = null;
    this.state.activeSession = null;
  }

  #requireActiveReader(event) {
    if (this.state.routeId !== "immersive-reading") {
      throw new ReaderUIRuntimeError("READER_INACTIVE", `${event} requires immersive-reading`);
    }
  }

  #preflightBookOpen(event, payload, correlationId, descriptor) {
    if (!correlationId) throw new ReaderUIRuntimeError("MISSING_CORRELATION", `${event} requires correlationId`);
    const sourceKind = readerUIJSONString(payload, "sourceKind");
    if (sourceKind !== "remote" && sourceKind !== "local") {
      throw new ReaderUIRuntimeError("INVALID_SOURCE_KIND", `${event} requires payload.sourceKind=remote|local`);
    }
    const stages = descriptor.coreSequence || [];
    const firstStage = sourceKind === "local" ? "chapter.list" : "source.detail";
    if (!stages.includes(firstStage) || !stages.includes("content.load") || !stages.includes("reader.location.resolve")) {
      throw new ReaderUIRuntimeError("INVALID_TRANSACTION", `${event} has an incomplete Core transaction`);
    }
    if (this.state.bookOpenTransaction?.correlationId === correlationId) {
      throw new ReaderUIRuntimeError("DUPLICATE_CORRELATION", `${event} was already dispatched for ${correlationId}`);
    }
  }

  #preflightAppearance(event, payload, correlationId, descriptor) {
    if (!correlationId) throw new ReaderUIRuntimeError("MISSING_CORRELATION", `${event} requires correlationId`);
    if (this.state.appearanceTransaction) {
      throw new ReaderUIRuntimeError("APPEARANCE_BUSY", `${event} is blocked by an active appearance transaction`);
    }
    const operation = descriptor.value;
    if (!["font.register", "font.unregister", "theme.create", "theme.update", "theme.delete",
      "typography.persist", "config.loadPersisted", "config.savePersisted"].includes(operation)) {
      throw new ReaderUIRuntimeError("INVALID_TRANSACTION", `${event} has an invalid appearance operation`);
    }
    if (operation === "font.register") {
      const path = payload.path;
      const lower = typeof path === "string" ? path.toLowerCase() : "";
      if (!lower.endsWith(".ttf") && !lower.endsWith(".otf") && !lower.endsWith(".ttc")) {
        throw new ReaderUIRuntimeError("INVALID_TYPED_PAYLOAD", "payload.path must identify a .ttf, .otf, or .ttc file");
      }
    }
    if (operation === "config.savePersisted") this.#validatedAppearancePreference(payload.preference);
  }

  #appearanceInitialEffect(transaction) {
    if (transaction.stage === "registering-font") {
      return readerUIEffect("host", READER_FONT_REGISTER_FILE, {
        path: transaction.payload.path,
        familyName: transaction.payload.familyName
      }, transaction.correlationId);
    }
    return this.#appearanceLoadEffect(transaction);
  }

  #appearanceLoadEffect(transaction) {
    return readerUIEffect("host", READER_APPEARANCE_PERSISTENCE_GET, {
      namespace: "reader-ui",
      key: "appearance.v1"
    }, transaction.correlationId);
  }

  #appearanceSaveEffect(transaction, expectedRevision) {
    return readerUIEffect("host", READER_APPEARANCE_PERSISTENCE_PUT, {
      namespace: "reader-ui",
      key: "appearance.v1",
      value: JSON.stringify(transaction.workingPreference),
      expectedRevision: String(expectedRevision)
    }, transaction.correlationId);
  }

  #fontUnregisterEffect(transaction) {
    if (!transaction.fontRecord) {
      throw new ReaderUIRuntimeError("INVALID_TRANSACTION", "font unregister requires a registered font record");
    }
    return readerUIEffect("host", READER_FONT_UNREGISTER_FILE, {
      path: transaction.fontRecord.path,
      familyName: transaction.fontRecord.familyName
    }, transaction.correlationId);
  }

  #decodeAppearanceLoadResult(result) {
    if (result.found === false) {
      this.#assertExactResultKeys(result, ["found"], "persistence.get");
      return initialReaderUIAppearancePreference();
    }
    this.#assertExactResultKeys(result, ["found", "value", "revision"], "persistence.get");
    if (result.found !== true || typeof result.value !== "string") {
      throw new ReaderUIRuntimeError("INVALID_APPEARANCE_RESULT", "persistence.get returned an invalid value result");
    }
    const revision = this.#parseRevision(result.revision, "result.revision");
    let decoded;
    try { decoded = JSON.parse(result.value); }
    catch { throw new ReaderUIRuntimeError("INVALID_APPEARANCE_PREFERENCE", "persisted appearance JSON is malformed"); }
    const preference = this.#validatedAppearancePreference(decoded);
    if (preference.revision !== revision) {
      throw new ReaderUIRuntimeError("INVALID_APPEARANCE_PREFERENCE", "persisted appearance revision does not match Host revision");
    }
    return preference;
  }

  #applyAppearanceOperation(transaction, current) {
    const working = cloneReaderUIJSONValue(current);
    switch (transaction.operation) {
      case "font.register": {
        if (working.fonts.some((font) => font.id === transaction.payload.fontId)) {
          throw new ReaderUIRuntimeError("APPEARANCE_CONFLICT", `font ${transaction.payload.fontId} already exists`);
        }
        working.fonts.push(cloneReaderUIJSONValue(transaction.fontRecord));
        break;
      }
      case "font.unregister": {
        const index = working.fonts.findIndex((font) => font.id === transaction.payload.fontId);
        if (index < 0) throw new ReaderUIRuntimeError("APPEARANCE_NOT_FOUND", `font ${transaction.payload.fontId} does not exist`);
        transaction.fontRecord = cloneReaderUIJSONValue(working.fonts[index]);
        working.fonts.splice(index, 1);
        if (working.typography.fontFamily === transaction.fontRecord.familyName) {
          working.typography.fontFamily = null;
        }
        break;
      }
      case "theme.create":
        if (working.themes.some((theme) => theme.id === transaction.payload.theme.id)) {
          throw new ReaderUIRuntimeError("APPEARANCE_CONFLICT", `theme ${transaction.payload.theme.id} already exists`);
        }
        working.themes.push(cloneReaderUIJSONValue(transaction.payload.theme));
        if (working.activeThemeId === null) working.activeThemeId = transaction.payload.theme.id;
        break;
      case "theme.update": {
        const index = working.themes.findIndex((theme) => theme.id === transaction.payload.theme.id);
        if (index < 0) throw new ReaderUIRuntimeError("APPEARANCE_NOT_FOUND", `theme ${transaction.payload.theme.id} does not exist`);
        working.themes[index] = cloneReaderUIJSONValue(transaction.payload.theme);
        break;
      }
      case "theme.delete": {
        const index = working.themes.findIndex((theme) => theme.id === transaction.payload.themeId);
        if (index < 0) throw new ReaderUIRuntimeError("APPEARANCE_NOT_FOUND", `theme ${transaction.payload.themeId} does not exist`);
        working.themes.splice(index, 1);
        if (working.activeThemeId === transaction.payload.themeId) working.activeThemeId = working.themes[0]?.id ?? null;
        break;
      }
      case "typography.persist":
        working.typography = cloneReaderUIJSONValue(transaction.payload.typography);
        break;
      case "config.savePersisted": {
        const requested = this.#validatedAppearancePreference(transaction.payload.preference);
        if (requested.revision !== current.revision) {
          throw new ReaderUIRuntimeError("APPEARANCE_CONFLICT", "config.savePersisted revision is stale");
        }
        Object.assign(working, requested);
        break;
      }
      default:
        throw new ReaderUIRuntimeError("INVALID_TRANSACTION", `Unsupported appearance operation ${transaction.operation}`);
    }
    working.schemaVersion = 1;
    working.revision = current.revision + 1;
    return this.#validatedAppearancePreference(working);
  }

  #validatedAppearancePreference(value) {
    let preference;
    try {
      preference = cloneReaderUIJSONValue(value, "preference");
      validateReaderUITypedPayload("reader.config.persist", { preference });
    } catch (error) {
      if (error instanceof ReaderUIRuntimeError && error.code === "INVALID_APPEARANCE_PREFERENCE") throw error;
      throw new ReaderUIRuntimeError("INVALID_APPEARANCE_PREFERENCE", error?.message || "appearance preference is invalid");
    }
    const themeIds = preference.themes.map((theme) => theme.id);
    const fontIds = preference.fonts.map((font) => font.id);
    if (new Set(themeIds).size !== themeIds.length || new Set(fontIds).size !== fontIds.length) {
      throw new ReaderUIRuntimeError("INVALID_APPEARANCE_PREFERENCE", "appearance preference contains duplicate ids");
    }
    if (preference.activeThemeId !== null && !themeIds.includes(preference.activeThemeId)) {
      throw new ReaderUIRuntimeError("INVALID_APPEARANCE_PREFERENCE", "activeThemeId does not reference a stored theme");
    }
    return preference;
  }

  #assertExactResultKeys(result, expected, type) {
    const actual = Object.keys(result).sort();
    const canonical = [...expected].sort();
    if (actual.length !== canonical.length || actual.some((key, index) => key !== canonical[index])) {
      throw new ReaderUIRuntimeError("INVALID_APPEARANCE_RESULT", `${type} result has missing or unknown fields`);
    }
  }

  #parseRevision(value, path) {
    if (typeof value !== "string" || !/^(0|[1-9]\d*)$/.test(value)) {
      throw new ReaderUIRuntimeError("INVALID_APPEARANCE_RESULT", `${path} must be a non-negative decimal revision string`);
    }
    const revision = Number(value);
    if (!Number.isSafeInteger(revision)) {
      throw new ReaderUIRuntimeError("INVALID_APPEARANCE_RESULT", `${path} exceeds the safe integer range`);
    }
    return revision;
  }

  #terminateAppearanceError(previous, transaction, error) {
    const code = error instanceof ReaderUIRuntimeError ? error.code : "APPEARANCE_HOST_FAILED";
    this.state.error = code;
    if (transaction.stage === "saving") this.state.appearanceReconcileRequired = true;
    if (transaction.operation === "font.register" && transaction.fontRecord &&
        (transaction.stage === "registering-font" || transaction.stage === "loading" || transaction.stage === "saving")) {
      transaction.stage = "rolling-back-font";
      this.state.appearanceTransaction = transaction;
      return this.#appearanceResult(true, previous, [this.#fontUnregisterEffect(transaction)]);
    }
    if (transaction.stage === "unregistering-font" || transaction.stage === "rolling-back-font" ||
        (transaction.operation === "font.unregister" && transaction.stage === "saving")) {
      this.state.fontUnregisterRestartRequired = true;
    }
    this.state.appearanceTransaction = null;
    return this.#appearanceResult(true, previous);
  }

  #appearanceResult(accepted, previous, effects = []) {
    return { accepted, previous, state: structuredClone(this.state), effects };
  }

  #playbackResult(accepted, previous, effects = [], cancelledCorrelationIds = []) {
    return {
      accepted,
      previous,
      state: structuredClone(this.state),
      effects,
      cancelledCorrelationIds
    };
  }

  #checkGuards(descriptor, event) {
    for (const guard of descriptor.guards || []) {
      if (guard === "loadingFalse" && this.state.loading) {
        throw new ReaderUIRuntimeError("ASYNC_GUARD", `${event} is blocked while loading`);
      }
      if (guard === "overlayEmpty" && this.state.overlay !== null) {
        throw new ReaderUIRuntimeError("OVERLAY_GUARD", `${event} is blocked while overlay is open`);
      }
    }
  }

  #bookOpenEffect(transaction) {
    return readerUIEffect(
      "core",
      transaction.stages[transaction.stageIndex],
      this.#bookOpenEffectPayload(transaction),
      transaction.correlationId
    );
  }

  #bookOpenEffectPayload(transaction) {
    const payload = cloneReaderUIJSONPayload(transaction.payload);
    payload.sourceKind = transaction.sourceKind;
    payload.chapterIndex = transaction.selectedChapterIndex ?? transaction.requestedChapterIndex;
    if (transaction.layout) Object.assign(payload, transaction.layout);
    return payload;
  }

  #restoreBookOpenStart(transaction) {
    this.state.routeId = transaction.restoreRouteId;
    this.state.routeStack = transaction.restoreRouteStack.slice();
    this.state.overlay = transaction.restoreOverlay;
    this.state.loading = false;
    this.state.error = null;
  }

  #parseRequestedChapterIndex(value) {
    const parsed = readerUIJSONInteger(value);
    return parsed !== null && parsed >= 0 ? parsed : 0;
  }

  #normalizeBookOpenLayout(layout) {
    const numeric = (field, minimum, maximum = null) => {
      const value = Number(layout?.[field]);
      if (!Number.isFinite(value) || value < minimum || (maximum !== null && value > maximum)) {
        throw new ReaderUIRuntimeError("INVALID_LAYOUT", `book.open requires valid ${field}`);
      }
      return value;
    };
    return {
      chapterOffset: numeric("chapterOffset", 0),
      chapterProgress: numeric("chapterProgress", 0, 1),
      viewportWidth: numeric("viewportWidth", 1),
      viewportHeight: numeric("viewportHeight", 1),
      fontScale: numeric("fontScale", Number.EPSILON)
    };
  }
}
