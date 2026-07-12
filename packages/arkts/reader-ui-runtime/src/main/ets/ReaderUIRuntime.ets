import { GENERATED_RUNTIME_ACTIONS, RuntimeActionDescriptor } from './GeneratedRuntimeActions'
import {
  GENERATED_RUNTIME_TYPED_PAYLOAD_CONTRACTS,
  GeneratedRuntimeTypedPayloadContract
} from './GeneratedRuntimeTypedPayloadContracts'

export type ReaderUIEffectKind = 'core' | 'host'
export type ReaderUIJSONValue = object | string | number | boolean | null
export type ReaderUIJSONPayload = Record<string, ReaderUIJSONValue>
export type ReaderUIJSONResult = ReaderUIJSONPayload

export interface ReaderUITypedPayloadContract {
  dispatchTarget: string
  operation: string
  descriptorAction: string
  descriptorValue?: string
  descriptorCoreSequence: string[]
  descriptorHostRequest?: string
  schema: ReaderUIJSONValue
  resultSchemas: Record<string, ReaderUITypedResultContract>
}

export interface ReaderUITypedResultContract {
  effectKind: string
  schema: ReaderUIJSONValue
}

export interface ReaderUIEffect {
  kind: ReaderUIEffectKind
  type: string
  /** @deprecated Use jsonPayload. This contains only legacy scalar strings. */
  payload: Record<string, string>
  jsonPayload?: ReaderUIJSONPayload
  legacyPayloadIsComplete?: boolean
  correlationId?: string
}

export interface ReaderUIBookOpenLayout {
  chapterOffset: number
  chapterProgress: number
  viewportWidth: number
  viewportHeight: number
  fontScale: number
}

// Runtime owns only transaction semantics. Raw Core DTOs remain in a
// correlation-scoped Host DomainStore.
export interface ReaderUIBookOpenTransaction {
  correlationId: string
  sourceKind: string
  stages: string[]
  stageIndex: number
  requestedChapterIndex: number
  selectedChapterIndex?: number
  awaitingLayout: boolean
  payload: ReaderUIJSONPayload
  restoreRouteId: string
  restoreRouteStack: string[]
  restoreOverlay?: string
  layout?: ReaderUIBookOpenLayout
}

export const READER_FOREGROUND_TIMER_ARM: string = 'timer.foreground.arm'
export const READER_FOREGROUND_TIMER_CANCEL: string = 'timer.foreground.cancel'
export const READER_AUTO_PAGE_MIN_INTERVAL_MS: number = 250
export const READER_AUTO_PAGE_MAX_INTERVAL_MS: number = 3600000
export const READER_APPEARANCE_PERSISTENCE_GET: string = 'persistence.get'
export const READER_APPEARANCE_PERSISTENCE_PUT: string = 'persistence.put'
export const READER_FONT_REGISTER_FILE: string = 'font.registerFile'
export const READER_FONT_UNREGISTER_FILE: string = 'font.unregisterFile'

export interface ReaderUIPageLayout {
  anchor: string
  targetPageIndex: number
  chapterIndex: number
  chapterOffset: number
  chapterProgress: number
  viewportWidth: number
  viewportHeight: number
  fontScale: number
}

export interface ReaderUIPageTransaction {
  correlationId: string
  direction: string
  source: string
  contractEvent: string
  sessionCorrelationId?: string
  generation?: number
  stage: string
  payload: ReaderUIJSONPayload
  layout?: ReaderUIPageLayout
}

export interface ReaderUITTSTransaction {
  correlationId: string
  event: string
  stage: string
  queueLoaded: boolean
  speechStarted: boolean
  payload: ReaderUIJSONPayload
}

export interface ReaderUIAutoPageTransaction {
  correlationId: string
  intervalMs: number
  generation: number
  tick: number
  timerArmed: boolean
}

export interface ReaderUIAppearanceTransaction {
  event: string
  operation: string
  correlationId: string
  stage: string
  payload: ReaderUIJSONPayload
  fontRecord?: ReaderUIJSONPayload
  workingPreference?: ReaderUIJSONPayload
}

export interface ReaderUIState {
  routeId: string
  routeStack: string[]
  tab: string
  overlay?: string
  activeSession?: string
  loading: boolean
  reducedMotion: boolean
  readerPageIndex: number
  readerCanonicalLocation?: string
  focusTarget?: string
  error?: string
  bookOpenTransaction?: ReaderUIBookOpenTransaction
  pageTransaction?: ReaderUIPageTransaction
  ttsTransaction?: ReaderUITTSTransaction
  autoPageTransaction?: ReaderUIAutoPageTransaction
  playbackGeneration?: number
  appearancePreference?: ReaderUIJSONPayload
  appearanceTransaction?: ReaderUIAppearanceTransaction
  fontUnregisterRestartRequired?: boolean
  appearanceReconcileRequired?: boolean
}

export interface ReaderUITransition {
  event: string
  previous: ReaderUIState
  state: ReaderUIState
  effects: ReaderUIEffect[]
  cancelledCorrelationIds: string[]
}

export interface ReaderUIAsyncTransition {
  accepted: boolean
  previous: ReaderUIState
  state: ReaderUIState
  effects: ReaderUIEffect[]
}

export interface ReaderUIPlaybackTransition {
  accepted: boolean
  previous: ReaderUIState
  state: ReaderUIState
  effects: ReaderUIEffect[]
  cancelledCorrelationIds: string[]
}

interface ReaderUIPlaybackTeardown {
  effects: ReaderUIEffect[]
  cancelledCorrelationIds: string[]
}

interface ReaderUIAppearanceApplyResult {
  transaction: ReaderUIAppearanceTransaction
  preference: ReaderUIJSONPayload
}

export class ReaderUIRuntimeError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export function initialReaderUIState(): ReaderUIState {
  return {
    routeId: 'bookshelf',
    routeStack: [],
    tab: 'bookshelf',
    loading: false,
    reducedMotion: false,
    readerPageIndex: 0,
    playbackGeneration: 0,
    appearancePreference: initialReaderUIAppearancePreference(),
    fontUnregisterRestartRequired: false,
    appearanceReconcileRequired: false
  }
}

export function initialReaderUIAppearancePreference(): ReaderUIJSONPayload {
  const typography: ReaderUIJSONPayload = {
    'fontFamily': null,
    'fontSize': 17,
    'lineHeight': 1.6,
    'paragraphSpacing': 8,
    'letterSpacing': 0,
    'textAlign': 'start'
  }
  return {
    'schemaVersion': 1,
    'revision': 0,
    'activeThemeId': null,
    'themes': [],
    'typography': typography,
    'fonts': []
  }
}

export function cloneReaderUIJSONValue(
  value: ReaderUIJSONValue,
  path: string = '$',
  ancestors: Set<object> = new Set<object>()
): ReaderUIJSONValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new ReaderUIRuntimeError('INVALID_JSON_PAYLOAD', `${path} must contain a finite JSON number`)
    }
    return value
  }
  if (typeof value !== 'object') {
    throw new ReaderUIRuntimeError('INVALID_JSON_PAYLOAD', `${path} contains a non-JSON value`)
  }
  if (ancestors.has(value)) {
    throw new ReaderUIRuntimeError('INVALID_JSON_PAYLOAD', `${path} contains a cyclic JSON value`)
  }
  ancestors.add(value)
  try {
    if (Array.isArray(value)) {
      const source: ReaderUIJSONValue[] = value as ReaderUIJSONValue[]
      const result: ReaderUIJSONValue[] = []
      source.forEach((item: ReaderUIJSONValue, index: number) => {
        result.push(cloneReaderUIJSONValue(item, `${path}[${index}]`, ancestors))
      })
      return result
    }
    const source: ReaderUIJSONPayload = value as ReaderUIJSONPayload
    const result: ReaderUIJSONPayload = {}
    Object.keys(source).forEach((key: string) => {
      result[key] = cloneReaderUIJSONValue(source[key], `${path}.${key}`, ancestors)
    })
    return result
  } finally {
    ancestors.delete(value)
  }
}

export function cloneReaderUIJSONPayload(payload: ReaderUIJSONPayload): ReaderUIJSONPayload {
  return cloneReaderUIJSONValue(payload, 'payload') as ReaderUIJSONPayload
}

export function cloneReaderUIJSONResult(result: ReaderUIJSONResult): ReaderUIJSONResult {
  try {
    return cloneReaderUIJSONValue(result, 'result') as ReaderUIJSONResult
  } catch (error) {
    const runtimeError: ReaderUIRuntimeError = error as ReaderUIRuntimeError
    throw new ReaderUIRuntimeError('INVALID_JSON_RESULT', runtimeError.message)
  }
}

export function legacyStringPayloadOrUndefined(payload: ReaderUIJSONPayload): Record<string, string> | undefined {
  const result: Record<string, string> = {}
  const keys: string[] = Object.keys(payload)
  for (let index: number = 0; index < keys.length; index += 1) {
    const key: string = keys[index]
    const value: ReaderUIJSONValue | undefined = payload[key]
    if (typeof value !== 'string') return undefined
    result[key] = value
  }
  return result
}

interface ReaderUILegacyPayloadProjection {
  payload: Record<string, string>
  isComplete: boolean
}

function legacyScalarProjection(payload: ReaderUIJSONPayload): ReaderUILegacyPayloadProjection {
  const projected: Record<string, string> = {}
  let isComplete: boolean = true
  Object.keys(payload).forEach((key: string): void => {
    const value: ReaderUIJSONValue | undefined = payload[key]
    if (typeof value === 'string') {
      projected[key] = value
    } else if (typeof value === 'number') {
      projected[key] = value.toString()
    } else if (typeof value === 'boolean') {
      projected[key] = value ? 'true' : 'false'
    } else {
      isComplete = false
    }
  })
  return { payload: projected, isComplete: isComplete }
}

function readerUIEffect(
  kind: ReaderUIEffectKind,
  type: string,
  jsonPayload: ReaderUIJSONPayload,
  correlationId?: string
): ReaderUIEffect {
  const canonical: ReaderUIJSONPayload = cloneReaderUIJSONPayload(jsonPayload)
  const projection: ReaderUILegacyPayloadProjection = legacyScalarProjection(canonical)
  return {
    kind: kind,
    type: type,
    payload: projection.payload,
    jsonPayload: canonical,
    legacyPayloadIsComplete: projection.isComplete,
    correlationId: correlationId
  }
}

function clonePayload(payload: ReaderUIJSONPayload): ReaderUIJSONPayload {
  return cloneReaderUIJSONPayload(payload)
}

function jsonString(payload: ReaderUIJSONPayload, key: string): string | undefined {
  const value: ReaderUIJSONValue | undefined = payload[key]
  return typeof value === 'string' ? value : undefined
}

function jsonInteger(value: ReaderUIJSONValue | undefined): number | undefined {
  if (typeof value === 'number') return Number.isInteger(value) ? value : undefined
  if (typeof value !== 'string' || !/^-?\d+$/.test(value)) return undefined
  const parsed: number = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : undefined
}

function optionalJSONResultString(result: ReaderUIJSONResult, key: string): string | undefined {
  const value: ReaderUIJSONValue | undefined = result[key]
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') return value
  throw new ReaderUIRuntimeError('INVALID_JSON_RESULT', `result.${key} must be a JSON string or null`)
}

function optionalJSONResultInteger(result: ReaderUIJSONResult, key: string): number | undefined {
  const value: ReaderUIJSONValue | undefined = result[key]
  if (value === undefined || value === null) return undefined
  const parsed: number | undefined = jsonInteger(value)
  if (parsed !== undefined) return parsed
  throw new ReaderUIRuntimeError(
    'INVALID_JSON_RESULT',
    `result.${key} must be an integer JSON number or numeric string`
  )
}

function invalidTypedPayload(path: string, message: string): never {
  throw new ReaderUIRuntimeError('INVALID_TYPED_PAYLOAD', `${path} ${message}`)
}

function validateTypedJSONValue(value: ReaderUIJSONValue, path: string): void {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value))) {
      invalidTypedPayload(path, 'must contain only finite numbers and IEEE-754 safe integers')
    }
    return
  }
  if (Array.isArray(value)) {
    const values: ReaderUIJSONValue[] = value as ReaderUIJSONValue[]
    values.forEach((item: ReaderUIJSONValue, index: number): void => {
      validateTypedJSONValue(item, `${path}[${index}]`)
    })
    return
  }
  if (value !== null && typeof value === 'object') {
    const object: ReaderUIJSONPayload = value as ReaderUIJSONPayload
    Object.keys(object).forEach((key: string): void => validateTypedJSONValue(object[key], `${path}.${key}`))
  }
}

function typedSchemaObject(value: ReaderUIJSONValue, path: string): ReaderUIJSONPayload {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ReaderUIRuntimeError('INVALID_TYPED_CONTRACT', `${path} schema must be an object`)
  }
  return value as ReaderUIJSONPayload
}

function typedSchemaString(schema: ReaderUIJSONPayload, key: string): string | undefined {
  const value: ReaderUIJSONValue | undefined = schema[key]
  return typeof value === 'string' ? value : undefined
}

function typedHasOwn(object: ReaderUIJSONPayload, key: string): boolean {
  return Object.keys(object).indexOf(key) >= 0
}

function validateTypedPayloadSchema(
  rawSchema: ReaderUIJSONValue,
  value: ReaderUIJSONValue,
  path: string
): void {
  const schema: ReaderUIJSONPayload = typedSchemaObject(rawSchema, path)
  if (value === null) {
    if (schema['nullable'] === true) return
    invalidTypedPayload(path, 'must not be null')
  }
  const variantsValue: ReaderUIJSONValue | undefined = schema['oneOf']
  if (Array.isArray(variantsValue)) {
    const variants: ReaderUIJSONValue[] = variantsValue as ReaderUIJSONValue[]
    let accepted: number = 0
    variants.forEach((variant: ReaderUIJSONValue): void => {
      try {
        validateTypedPayloadSchema(variant, value, path)
        accepted += 1
      } catch (error) {
        const failure: ReaderUIRuntimeError = error as ReaderUIRuntimeError
        if (failure.code !== 'INVALID_TYPED_PAYLOAD') throw failure
      }
    })
    if (accepted !== 1) invalidTypedPayload(path, `must match exactly one schema variant (matched ${accepted})`)
    return
  }
  const type: string | undefined = typedSchemaString(schema, 'type')
  if (type === undefined) {
    throw new ReaderUIRuntimeError('INVALID_TYPED_CONTRACT', `${path} schema type is missing`)
  }
  if (type === 'object') {
    if (typeof value !== 'object' || Array.isArray(value)) invalidTypedPayload(path, 'must be an object')
    const target: ReaderUIJSONPayload = value as ReaderUIJSONPayload
    const propertiesValue: ReaderUIJSONValue | undefined = schema['properties']
    const properties: ReaderUIJSONPayload = propertiesValue !== undefined
      ? typedSchemaObject(propertiesValue, path) : {}
    const requiredValue: ReaderUIJSONValue | undefined = schema['required']
    if (Array.isArray(requiredValue)) {
      const required: ReaderUIJSONValue[] = requiredValue as ReaderUIJSONValue[]
      required.forEach((item: ReaderUIJSONValue): void => {
        if (typeof item === 'string' && !typedHasOwn(target, item)) invalidTypedPayload(`${path}.${item}`, 'is required')
      })
    }
    if (schema['additionalProperties'] === false) {
      Object.keys(target).forEach((field: string): void => {
        if (!typedHasOwn(properties, field)) invalidTypedPayload(`${path}.${field}`, 'is unknown')
      })
    } else {
      const additionalValue: ReaderUIJSONValue | undefined = schema['additionalProperties']
      if (additionalValue !== undefined && typeof additionalValue === 'object' && !Array.isArray(additionalValue)) {
        Object.keys(target).forEach((field: string): void => {
          if (!typedHasOwn(properties, field)) {
            validateTypedPayloadSchema(additionalValue, target[field], `${path}.${field}`)
          }
        })
      }
    }
    Object.keys(properties).forEach((field: string): void => {
      if (typedHasOwn(target, field)) {
        validateTypedPayloadSchema(properties[field], target[field], `${path}.${field}`)
      }
    })
    const constraintsValue: ReaderUIJSONValue | undefined = schema['constraints']
    if (Array.isArray(constraintsValue)) {
      const constraints: ReaderUIJSONValue[] = constraintsValue as ReaderUIJSONValue[]
      constraints.forEach((constraintValue: ReaderUIJSONValue): void => {
        const constraint: ReaderUIJSONPayload = typedSchemaObject(constraintValue, path)
        const kind: string | undefined = typedSchemaString(constraint, 'kind')
        if (kind === 'nonBlankWhen') {
          const field: string = typedSchemaString(constraint, 'field') ?? ''
          const whenField: string = typedSchemaString(constraint, 'whenField') ?? ''
          if (target[whenField] === constraint['equals']) {
            const text: ReaderUIJSONValue | undefined = target[field]
            if (typeof text !== 'string' || text.trim().length === 0) {
              invalidTypedPayload(`${path}.${field}`, 'must be non-blank for this variant')
            }
          }
        } else if (kind === 'booleanAnyTrue') {
          const fieldsValue: ReaderUIJSONValue | undefined = constraint['fields']
          const defaultsValue: ReaderUIJSONValue | undefined = constraint['defaults']
          const defaults: ReaderUIJSONPayload = defaultsValue !== undefined
            ? typedSchemaObject(defaultsValue, path) : {}
          let anyTrue: boolean = false
          if (Array.isArray(fieldsValue)) {
            const fields: ReaderUIJSONValue[] = fieldsValue as ReaderUIJSONValue[]
            fields.forEach((fieldValue: ReaderUIJSONValue): void => {
              if (typeof fieldValue === 'string') {
                const candidate: ReaderUIJSONValue | undefined = typedHasOwn(target, fieldValue)
                  ? target[fieldValue] : defaults[fieldValue]
                if (candidate === true) anyTrue = true
              }
            })
          }
          if (!anyTrue) invalidTypedPayload(path, 'requires one target scope to be true')
        } else if (kind === 'validRegexWhen') {
          const field: string = typedSchemaString(constraint, 'field') ?? ''
          const flagField: string = typedSchemaString(constraint, 'flagField') ?? ''
          const enabled: ReaderUIJSONValue | undefined = typedHasOwn(target, flagField)
            ? target[flagField] : constraint['default']
          if (enabled === true && typeof target[field] === 'string') {
            try {
              new RegExp(target[field] as string)
            } catch (error) {
              invalidTypedPayload(`${path}.${field}`, 'must be a valid regular expression')
            }
          }
        } else if (kind === 'stringAnyNonBlank') {
          const fieldsValue: ReaderUIJSONValue | undefined = constraint['fields']
          let anyNonBlank: boolean = false
          if (Array.isArray(fieldsValue)) {
            const fields: ReaderUIJSONValue[] = fieldsValue as ReaderUIJSONValue[]
            fields.forEach((fieldValue: ReaderUIJSONValue): void => {
              if (typeof fieldValue === 'string') {
                const candidate: ReaderUIJSONValue | undefined = target[fieldValue]
                if (typeof candidate === 'string' && candidate.trim().length > 0) anyNonBlank = true
              }
            })
          }
          if (!anyNonBlank) invalidTypedPayload(path, 'requires one string field to be non-blank')
        } else {
          throw new ReaderUIRuntimeError('INVALID_TYPED_CONTRACT', `${path} has an unsupported constraint`)
        }
      })
    }
    return
  }
  if (type === 'array') {
    if (!Array.isArray(value)) invalidTypedPayload(path, 'must be an array')
    const array: ReaderUIJSONValue[] = value as ReaderUIJSONValue[]
    const minimum: ReaderUIJSONValue | undefined = schema['minItems']
    if (typeof minimum === 'number' && array.length < minimum) {
      invalidTypedPayload(path, `must contain at least ${minimum} items`)
    }
    const items: ReaderUIJSONValue | undefined = schema['items']
    if (items === undefined) throw new ReaderUIRuntimeError('INVALID_TYPED_CONTRACT', `${path} array schema has no items`)
    array.forEach((item: ReaderUIJSONValue, index: number): void => {
      validateTypedPayloadSchema(items, item, `${path}[${index}]`)
    })
    return
  }
  if (type === 'string') {
    if (typeof value !== 'string') invalidTypedPayload(path, 'must be a string')
    const minimum: ReaderUIJSONValue | undefined = schema['minLength']
    if (typeof minimum === 'number' && (value as string).length < minimum) {
      invalidTypedPayload(path, `must contain at least ${minimum} characters`)
    }
    const maximum: ReaderUIJSONValue | undefined = schema['maxLength']
    if (typeof maximum === 'number' && (value as string).length > maximum) {
      invalidTypedPayload(path, `must contain at most ${maximum} characters`)
    }
    if (schema['nonBlank'] === true && (value as string).trim().length === 0) {
      invalidTypedPayload(path, 'must be non-blank')
    }
    const pattern: ReaderUIJSONValue | undefined = schema['pattern']
    if (typeof pattern === 'string') {
      let regex: RegExp
      try {
        regex = new RegExp(pattern)
      } catch (error) {
        throw new ReaderUIRuntimeError('INVALID_TYPED_CONTRACT', `${path} has an invalid schema pattern`)
      }
      if (!regex.test(value as string)) invalidTypedPayload(path, 'does not match its required pattern')
    }
  } else if (type === 'integer') {
    if (typeof value !== 'number' || !Number.isInteger(value) || Math.abs(value) > 9007199254740991) {
      invalidTypedPayload(path, 'must be an IEEE-754 safe integer')
    }
  } else if (type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) invalidTypedPayload(path, 'must be a finite number')
  } else if (type === 'boolean') {
    if (typeof value !== 'boolean') invalidTypedPayload(path, 'must be a boolean')
  } else if (type === 'json') {
    validateTypedJSONValue(value, path)
    return
  } else {
    throw new ReaderUIRuntimeError('INVALID_TYPED_CONTRACT', `${path} has unsupported schema type ${type}`)
  }
  const constant: ReaderUIJSONValue | undefined = schema['const']
  if (constant !== undefined && value !== constant) invalidTypedPayload(path, 'does not equal its required constant')
  const enumValue: ReaderUIJSONValue | undefined = schema['enum']
  if (Array.isArray(enumValue)) {
    const allowed: ReaderUIJSONValue[] = enumValue as ReaderUIJSONValue[]
    let accepted: boolean = false
    allowed.forEach((candidate: ReaderUIJSONValue): void => { if (candidate === value) accepted = true })
    if (!accepted) invalidTypedPayload(path, 'is not an allowed enum value')
  }
  const minimum: ReaderUIJSONValue | undefined = schema['minimum']
  const maximum: ReaderUIJSONValue | undefined = schema['maximum']
  if (typeof value === 'number' && typeof minimum === 'number' && value < minimum) {
    invalidTypedPayload(path, `must be >= ${minimum}`)
  }
  if (typeof value === 'number' && typeof maximum === 'number' && value > maximum) {
    invalidTypedPayload(path, `must be <= ${maximum}`)
  }
}

export function validateReaderUITypedPayload(
  event: string,
  payload: ReaderUIJSONPayload
): ReaderUITypedPayloadContract | undefined {
  const generated: GeneratedRuntimeTypedPayloadContract | undefined =
    GENERATED_RUNTIME_TYPED_PAYLOAD_CONTRACTS[event]
  if (generated === undefined) return undefined
  validateTypedPayloadSchema(generated.schema as ReaderUIJSONValue, payload, 'payload')
  return {
    dispatchTarget: generated.dispatchTarget,
    operation: generated.operation,
    descriptorAction: generated.descriptorAction,
    descriptorValue: generated.descriptorValue,
    descriptorCoreSequence: generated.descriptorCoreSequence,
    descriptorHostRequest: generated.descriptorHostRequest,
    schema: generated.schema as ReaderUIJSONValue,
    resultSchemas: generated.resultSchemas as Record<string, ReaderUITypedResultContract>
  }
}

export function validateReaderUITypedResult(
  event: string,
  effectType: string,
  result: ReaderUIJSONResult
): ReaderUITypedResultContract {
  const generated: GeneratedRuntimeTypedPayloadContract | undefined =
    GENERATED_RUNTIME_TYPED_PAYLOAD_CONTRACTS[event]
  if (generated === undefined) {
    throw new ReaderUIRuntimeError('INVALID_TYPED_CONTRACT', `No typed contract for ${event}`)
  }
  const resultContract = generated.resultSchemas[effectType]
  if (resultContract === undefined) {
    throw new ReaderUIRuntimeError('UNDECLARED_TYPED_RESULT', `${event} does not declare a result for ${effectType}`)
  }
  try {
    validateTypedPayloadSchema(resultContract.schema as ReaderUIJSONValue, result, 'result')
  } catch (error) {
    const failure: ReaderUIRuntimeError = error as ReaderUIRuntimeError
    if (failure.code === 'INVALID_TYPED_PAYLOAD') {
      throw new ReaderUIRuntimeError('INVALID_TYPED_RESULT', failure.message)
    }
    throw failure
  }
  return { effectKind: resultContract.effectKind, schema: resultContract.schema as ReaderUIJSONValue }
}

function cloneState(state: ReaderUIState): ReaderUIState {
  return {
    routeId: state.routeId,
    routeStack: state.routeStack.slice(),
    tab: state.tab,
    overlay: state.overlay,
    activeSession: state.activeSession,
    loading: state.loading,
    reducedMotion: state.reducedMotion,
    readerPageIndex: state.readerPageIndex,
    readerCanonicalLocation: state.readerCanonicalLocation,
    focusTarget: state.focusTarget,
    error: state.error,
    bookOpenTransaction: cloneBookOpenTransaction(state.bookOpenTransaction),
    pageTransaction: clonePageTransaction(state.pageTransaction),
    ttsTransaction: cloneTTSTransaction(state.ttsTransaction),
    autoPageTransaction: cloneAutoPageTransaction(state.autoPageTransaction),
    playbackGeneration: state.playbackGeneration ?? 0,
    appearancePreference: clonePayload(state.appearancePreference ?? initialReaderUIAppearancePreference()),
    appearanceTransaction: cloneAppearanceTransaction(state.appearanceTransaction),
    fontUnregisterRestartRequired: state.fontUnregisterRestartRequired ?? false,
    appearanceReconcileRequired: state.appearanceReconcileRequired ?? false
  }
}

function cloneAppearanceTransaction(
  transaction?: ReaderUIAppearanceTransaction
): ReaderUIAppearanceTransaction | undefined {
  if (transaction === undefined) return undefined
  return {
    event: transaction.event,
    operation: transaction.operation,
    correlationId: transaction.correlationId,
    stage: transaction.stage,
    payload: clonePayload(transaction.payload),
    fontRecord: transaction.fontRecord === undefined ? undefined : clonePayload(transaction.fontRecord),
    workingPreference: transaction.workingPreference === undefined
      ? undefined : clonePayload(transaction.workingPreference)
  }
}

function clonePageTransaction(transaction?: ReaderUIPageTransaction): ReaderUIPageTransaction | undefined {
  if (transaction === undefined) return undefined
  const result: ReaderUIPageTransaction = {
    correlationId: transaction.correlationId,
    direction: transaction.direction,
    source: transaction.source,
    contractEvent: transaction.contractEvent,
    sessionCorrelationId: transaction.sessionCorrelationId,
    generation: transaction.generation,
    stage: transaction.stage,
    payload: clonePayload(transaction.payload)
  }
  if (transaction.layout !== undefined) {
    result.layout = {
      anchor: transaction.layout.anchor,
      targetPageIndex: transaction.layout.targetPageIndex,
      chapterIndex: transaction.layout.chapterIndex,
      chapterOffset: transaction.layout.chapterOffset,
      chapterProgress: transaction.layout.chapterProgress,
      viewportWidth: transaction.layout.viewportWidth,
      viewportHeight: transaction.layout.viewportHeight,
      fontScale: transaction.layout.fontScale
    }
  }
  return result
}

function cloneTTSTransaction(transaction?: ReaderUITTSTransaction): ReaderUITTSTransaction | undefined {
  if (transaction === undefined) return undefined
  return {
    correlationId: transaction.correlationId,
    event: transaction.event,
    stage: transaction.stage,
    queueLoaded: transaction.queueLoaded,
    speechStarted: transaction.speechStarted,
    payload: clonePayload(transaction.payload)
  }
}

function cloneAutoPageTransaction(transaction?: ReaderUIAutoPageTransaction): ReaderUIAutoPageTransaction | undefined {
  if (transaction === undefined) return undefined
  return {
    correlationId: transaction.correlationId,
    intervalMs: transaction.intervalMs,
    generation: transaction.generation,
    tick: transaction.tick,
    timerArmed: transaction.timerArmed
  }
}

function cloneBookOpenTransaction(transaction?: ReaderUIBookOpenTransaction): ReaderUIBookOpenTransaction | undefined {
  if (transaction === undefined) return undefined
  return {
    correlationId: transaction.correlationId,
    sourceKind: transaction.sourceKind,
    stages: transaction.stages.slice(),
    stageIndex: transaction.stageIndex,
    requestedChapterIndex: transaction.requestedChapterIndex,
    selectedChapterIndex: transaction.selectedChapterIndex,
    awaitingLayout: transaction.awaitingLayout,
    payload: clonePayload(transaction.payload),
    restoreRouteId: transaction.restoreRouteId,
    restoreRouteStack: transaction.restoreRouteStack.slice(),
    restoreOverlay: transaction.restoreOverlay,
    layout: transaction.layout === undefined ? undefined : {
      chapterOffset: transaction.layout.chapterOffset,
      chapterProgress: transaction.layout.chapterProgress,
      viewportWidth: transaction.layout.viewportWidth,
      viewportHeight: transaction.layout.viewportHeight,
      fontScale: transaction.layout.fontScale
    }
  }
}

/** Pure UI state machine. Platform code renders state and executes effects. */
export class ReaderUIRuntime {
  private currentState: ReaderUIState

  constructor(state: ReaderUIState = initialReaderUIState()) {
    this.currentState = cloneState(state)
  }

  get state(): ReaderUIState {
    return cloneState(this.currentState)
  }

  dispatch(event: string, payload: ReaderUIJSONPayload = {}, correlationId?: string): ReaderUITransition {
    payload = clonePayload(payload)
    const descriptor: RuntimeActionDescriptor | undefined = GENERATED_RUNTIME_ACTIONS[event]
    if (descriptor === undefined) {
      throw new ReaderUIRuntimeError('UNSUPPORTED_EVENT', `No runtime action for ${event}`)
    }
    const typedContract: ReaderUITypedPayloadContract | undefined = validateReaderUITypedPayload(event, payload)
    if (typedContract !== undefined) {
      const matches: boolean = descriptor.action === typedContract.descriptorAction &&
        descriptor.value === typedContract.descriptorValue &&
        descriptor.hostRequest === typedContract.descriptorHostRequest &&
        JSON.stringify(descriptor.coreSequence) === JSON.stringify(typedContract.descriptorCoreSequence)
      if (!matches) {
      throw new ReaderUIRuntimeError(
        'INVALID_TYPED_CONTRACT',
        `${event} mapping drifted from ${typedContract.dispatchTarget}:${typedContract.operation}`
      )
      }
    }
    descriptor.requiredPayload.forEach((field: string) => {
      if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
        throw new ReaderUIRuntimeError('MISSING_PAYLOAD', `${event} requires payload.${field}`)
      }
    })
    this.checkGuards(descriptor, event)
    if (descriptor.action === 'bookOpenSequence') {
      this.preflightBookOpen(event, payload, correlationId, descriptor)
    }
    if (descriptor.action === 'appearanceTransaction') {
      this.preflightAppearance(event, payload, correlationId, descriptor)
    }

    const previous = cloneState(this.currentState)
    const value: string | undefined = descriptor.value
    const cancelledCorrelationIds: string[] = []
    const effects: ReaderUIEffect[] = []

    if (event === 'reader.page.next' || event === 'reader.page.prev') {
      return this.beginPageStepTransition(
        event === 'reader.page.next' ? 'next' : 'previous',
        correlationId,
        payload,
        'manual',
        previous,
        event
      )
    }
    if (event === 'reader.tts.start') return this.beginTTSTransition(correlationId, payload, previous, event)
    if (event === 'reader.tts.stop') return this.stopTTSTransition(correlationId, previous, event)
    if (event === 'reader.autoPage.start') return this.beginAutoPageTransition(correlationId, payload, previous, event)
    if (event === 'reader.autoPage.stop') return this.stopAutoPageTransition(correlationId, previous, event)

    if (event === 'reader.exit' || event === 'book.open') {
      const teardown: ReaderUIPlaybackTeardown = this.teardownAllPlayback()
      effects.push(...teardown.effects)
      cancelledCorrelationIds.push(...teardown.cancelledCorrelationIds)
    }

    switch (descriptor.action) {
      case 'pushRoute': {
        const routeId: string | undefined = value ?? jsonString(payload, 'routeId') ?? jsonString(payload, 'route')
        if (routeId === undefined || routeId === '') {
          throw new ReaderUIRuntimeError('MISSING_PAYLOAD', `${event} requires a routeId`)
        }
        this.currentState.routeStack.push(this.currentState.routeId)
        this.currentState.routeId = routeId
        this.currentState.overlay = undefined
        break
      }
      case 'replaceRoute': {
        const routeId: string | undefined = value ?? jsonString(payload, 'routeId') ?? jsonString(payload, 'route')
        if (routeId === undefined || routeId === '') {
          throw new ReaderUIRuntimeError('MISSING_PAYLOAD', `${event} requires a routeId`)
        }
        this.currentState.routeId = routeId
        this.currentState.overlay = undefined
        break
      }
      case 'popRoute': {
        const routeId: string | undefined = this.currentState.routeStack.pop()
        if (routeId !== undefined) this.currentState.routeId = routeId
        this.currentState.overlay = undefined
        break
      }
      case 'popToRoot':
        this.currentState.routeId = this.currentState.tab
        this.currentState.routeStack = []
        this.currentState.overlay = undefined
        break
      case 'selectTab': {
        const tab: string | undefined = jsonString(payload, 'tab')
        if (tab === undefined || tab.length === 0) {
          throw new ReaderUIRuntimeError('MISSING_PAYLOAD', `${event} requires payload.tab`)
        }
        this.currentState.tab = tab
        this.currentState.routeId = tab
        this.currentState.routeStack = []
        break
      }
      case 'setOverlay':
        this.currentState.overlay = value ?? jsonString(payload, 'overlay')
        break
      case 'clearOverlay':
        this.currentState.overlay = undefined
        break
      case 'clearOverlayIfMatches': {
        const expectedOverlay: string | undefined = value ?? jsonString(payload, 'overlay')
        if (expectedOverlay === undefined || expectedOverlay === '') {
          throw new ReaderUIRuntimeError('MISSING_PAYLOAD', `${event} requires an overlay identity`)
        }
        if (this.currentState.overlay === expectedOverlay) this.currentState.overlay = undefined
        break
      }
      case 'startSession':
        this.currentState.activeSession = value
        this.currentState.overlay = undefined
        break
      case 'stopSession':
        this.currentState.activeSession = undefined
        break
      case 'setReducedMotion':
        this.currentState.reducedMotion = value === 'true'
        break
      case 'bookOpenSequence': {
        if (correlationId === undefined || correlationId === '') {
          throw new ReaderUIRuntimeError('MISSING_CORRELATION', `${event} requires correlationId`)
        }
        const sourceKind: string | undefined = jsonString(payload, 'sourceKind')
        if (sourceKind !== 'remote' && sourceKind !== 'local') {
          throw new ReaderUIRuntimeError('INVALID_SOURCE_KIND', `${event} requires payload.sourceKind=remote|local`)
        }
        const stages: string[] = descriptor.coreSequence.slice()
        const firstStage: string = sourceKind === 'local' ? 'chapter.list' : 'source.detail'
        const firstStageIndex: number = stages.indexOf(firstStage)
        if (firstStageIndex < 0 || stages.indexOf('content.load') < 0 || stages.indexOf('reader.location.resolve') < 0) {
          throw new ReaderUIRuntimeError('INVALID_TRANSACTION', `${event} has an incomplete Core transaction`)
        }
        const active: ReaderUIBookOpenTransaction | undefined = this.currentState.bookOpenTransaction
        if (active !== undefined) {
          if (active.correlationId === correlationId) {
            throw new ReaderUIRuntimeError('DUPLICATE_CORRELATION', `${event} was already dispatched for ${correlationId}`)
          }
          cancelledCorrelationIds.push(active.correlationId)
          this.restoreBookOpenStart(active)
        }
        const restoreRouteId: string = this.currentState.routeId
        const restoreRouteStack: string[] = this.currentState.routeStack.slice()
        const restoreOverlay: string | undefined = this.currentState.overlay
        this.currentState.routeStack.push(this.currentState.routeId)
        this.currentState.routeId = 'immersive-reading'
        this.currentState.overlay = undefined
        this.currentState.loading = true
        this.currentState.error = undefined
        this.currentState.bookOpenTransaction = {
          correlationId: correlationId,
          sourceKind: sourceKind,
          stages: stages,
          stageIndex: firstStageIndex,
          requestedChapterIndex: this.requestedChapterIndex(payload['chapterIndex']),
          awaitingLayout: false,
          payload: clonePayload(payload),
          restoreRouteId: restoreRouteId,
          restoreRouteStack: restoreRouteStack,
          restoreOverlay: restoreOverlay
        }
        break
      }
      case 'readerPageStep':
        throw new ReaderUIRuntimeError('INVALID_TRANSACTION', `${event} must use the page transaction`)
      case 'appearanceTransaction': {
        if (correlationId === undefined || correlationId.length === 0 || value === undefined) {
          throw new ReaderUIRuntimeError('INVALID_TRANSACTION', `${event} requires an appearance operation and correlationId`)
        }
        this.currentState.error = undefined
        this.currentState.fontUnregisterRestartRequired = false
        this.currentState.appearanceTransaction = {
          event: event,
          operation: value,
          correlationId: correlationId,
          stage: value === 'font.register' ? 'registering-font' : 'loading',
          payload: clonePayload(payload),
          fontRecord: value === 'font.register' ? {
            'id': payload['fontId'],
            'path': payload['path'],
            'familyName': payload['familyName'],
            'fontNames': [payload['familyName']],
            'enabled': true
          } : undefined
        }
        break
      }
      case 'emitEffects':
        break
      default:
        throw new ReaderUIRuntimeError('UNSUPPORTED_ACTION', `Unsupported runtime action ${descriptor.action}`)
    }

    if (descriptor.action === 'bookOpenSequence') {
      const transaction: ReaderUIBookOpenTransaction | undefined = this.currentState.bookOpenTransaction
      if (transaction === undefined) throw new ReaderUIRuntimeError('INVALID_TRANSACTION', 'book.open transaction was not created')
      effects.push(this.bookOpenEffect(transaction))
    } else if (descriptor.action === 'appearanceTransaction') {
      const transaction: ReaderUIAppearanceTransaction | undefined = this.currentState.appearanceTransaction
      if (transaction === undefined) {
        throw new ReaderUIRuntimeError('INVALID_TRANSACTION', 'appearance transaction was not created')
      }
      effects.push(this.appearanceInitialEffect(transaction))
    } else {
      descriptor.coreSequence.forEach((type: string) => {
        effects.push(readerUIEffect('core', type, payload, correlationId))
      })
      if (descriptor.hostRequest !== undefined) {
        effects.push(readerUIEffect('host', descriptor.hostRequest, payload, correlationId))
      }
    }
    return {
      event: event,
      previous: previous,
      state: cloneState(this.currentState),
      effects: effects,
      cancelledCorrelationIds: cancelledCorrelationIds
    }
  }

  acceptAppearanceHostResult(
    hostType: string,
    correlationId: string,
    jsonResult: ReaderUIJSONResult = {}
  ): ReaderUIAsyncTransition {
    const previous: ReaderUIState = cloneState(this.currentState)
    let transaction: ReaderUIAppearanceTransaction | undefined = this.currentState.appearanceTransaction
    if (transaction === undefined || transaction.correlationId !== correlationId) {
      return this.appearanceResult(false, previous)
    }
    try {
      const result: ReaderUIJSONResult = cloneReaderUIJSONResult(jsonResult)
      if (transaction.stage === 'registering-font') {
        if (hostType !== READER_FONT_REGISTER_FILE) return this.appearanceResult(false, previous)
        validateReaderUITypedResult(transaction.event, hostType, result)
        this.assertExactResultKeys(result, ['registered', 'path', 'familyName', 'fontNames'], hostType)
        const path: ReaderUIJSONValue | undefined = result['path']
        const actualFamilyName: ReaderUIJSONValue | undefined = result['familyName']
        const namesValue: ReaderUIJSONValue | undefined = result['fontNames']
        if (result['registered'] !== true || typeof path !== 'string' || path.trim().length === 0 ||
          typeof actualFamilyName !== 'string' || actualFamilyName.trim().length === 0 ||
          !Array.isArray(namesValue) || namesValue.length === 0) {
          throw new ReaderUIRuntimeError('INVALID_APPEARANCE_RESULT', 'font.registerFile returned an invalid result')
        }
        const names: ReaderUIJSONValue[] = namesValue as ReaderUIJSONValue[]
        let invalidName: boolean = false
        names.forEach((name: ReaderUIJSONValue): void => {
          if (typeof name !== 'string' || name.trim().length === 0) invalidName = true
        })
        const fontId: ReaderUIJSONValue | undefined = transaction.payload['fontId']
        if (invalidName || typeof fontId !== 'string') {
          throw new ReaderUIRuntimeError('INVALID_APPEARANCE_RESULT', 'font.registerFile returned invalid font names')
        }
        transaction.fontRecord = {
          'id': fontId,
          'path': path,
          'familyName': actualFamilyName,
          'fontNames': names.slice(),
          'enabled': true
        }
        transaction.stage = 'loading'
        this.currentState.appearanceTransaction = transaction
        return this.appearanceResult(true, previous, [this.appearanceLoadEffect(transaction)])
      }
      if (transaction.stage === 'loading') {
        if (hostType !== READER_APPEARANCE_PERSISTENCE_GET) return this.appearanceResult(false, previous)
        validateReaderUITypedResult(transaction.event, hostType, result)
        const current: ReaderUIJSONPayload = this.decodeAppearanceLoadResult(result)
        if (transaction.operation === 'config.loadPersisted') {
          this.currentState.appearancePreference = current
          this.currentState.appearanceTransaction = undefined
          this.currentState.error = undefined
          this.currentState.appearanceReconcileRequired = false
          return this.appearanceResult(true, previous)
        }
        const applied: ReaderUIAppearanceApplyResult = this.applyAppearanceOperation(transaction, current)
        transaction = applied.transaction
        transaction.workingPreference = applied.preference
        transaction.stage = 'saving'
        this.currentState.appearanceTransaction = transaction
        return this.appearanceResult(true, previous, [
          this.appearanceSaveEffect(transaction, this.appearanceRevision(current))
        ])
      }
      if (transaction.stage === 'saving') {
        if (hostType !== READER_APPEARANCE_PERSISTENCE_PUT) return this.appearanceResult(false, previous)
        validateReaderUITypedResult(transaction.event, hostType, result)
        this.assertExactResultKeys(result, ['stored', 'revision'], hostType)
        const working: ReaderUIJSONPayload | undefined = transaction.workingPreference
        const revision: number = this.parseAppearanceRevision(result['revision'], 'result.revision')
        if (result['stored'] !== true || working === undefined || revision !== this.appearanceRevision(working)) {
          throw new ReaderUIRuntimeError('INVALID_APPEARANCE_RESULT', 'persistence.put returned an invalid revision')
        }
        this.currentState.appearancePreference = working
        this.currentState.appearanceReconcileRequired = false
        if (transaction.operation === 'font.unregister') {
          transaction.stage = 'unregistering-font'
          this.currentState.appearanceTransaction = transaction
          return this.appearanceResult(true, previous, [this.fontUnregisterEffect(transaction)])
        }
        this.currentState.appearanceTransaction = undefined
        this.currentState.error = undefined
        return this.appearanceResult(true, previous)
      }
      if (transaction.stage === 'unregistering-font' || transaction.stage === 'rolling-back-font') {
        if (hostType !== READER_FONT_UNREGISTER_FILE) return this.appearanceResult(false, previous)
        validateReaderUITypedResult(transaction.event, hostType, result)
        this.assertExactResultKeys(
          result,
          ['logicalUnregistered', 'physicallyUnregistered', 'restartRequired'],
          hostType
        )
        const physical: ReaderUIJSONValue | undefined = result['physicallyUnregistered']
        const restart: ReaderUIJSONValue | undefined = result['restartRequired']
        if (result['logicalUnregistered'] !== true || typeof physical !== 'boolean' || typeof restart !== 'boolean' ||
          (!physical && !restart)) {
          throw new ReaderUIRuntimeError(
            'INVALID_APPEARANCE_RESULT',
            'font.unregisterFile must report logical unregister and restart requirements'
          )
        }
        this.currentState.fontUnregisterRestartRequired = restart
        this.currentState.appearanceTransaction = undefined
        if (transaction.stage === 'unregistering-font') this.currentState.error = undefined
        return this.appearanceResult(true, previous)
      }
      return this.appearanceResult(false, previous)
    } catch (error) {
      return this.terminateAppearanceError(previous, transaction, error as ReaderUIRuntimeError)
    }
  }

  failAppearanceHostResult(
    hostType: string,
    correlationId: string,
    code: string = 'APPEARANCE_HOST_FAILED'
  ): ReaderUIAsyncTransition {
    const previous: ReaderUIState = cloneState(this.currentState)
    const transaction: ReaderUIAppearanceTransaction | undefined = this.currentState.appearanceTransaction
    if (transaction === undefined || transaction.correlationId !== correlationId) {
      return this.appearanceResult(false, previous)
    }
    const expected: string = transaction.stage === 'registering-font' ? READER_FONT_REGISTER_FILE
      : transaction.stage === 'loading' ? READER_APPEARANCE_PERSISTENCE_GET
      : transaction.stage === 'saving' ? READER_APPEARANCE_PERSISTENCE_PUT
      : READER_FONT_UNREGISTER_FILE
    if (hostType !== expected) return this.appearanceResult(false, previous)
    const normalized: string = code.length === 0 ? 'APPEARANCE_HOST_FAILED' : code
    return this.terminateAppearanceError(previous, transaction, new ReaderUIRuntimeError(normalized, normalized))
  }

  acceptBookOpenResult(
    coreType: string,
    correlationId: string,
    chapterCount?: number,
    canonicalLocation?: string,
    pageIndex?: number,
    error?: string
  ): ReaderUIAsyncTransition {
    const previous: ReaderUIState = cloneState(this.currentState)
    let transaction: ReaderUIBookOpenTransaction | undefined = this.currentState.bookOpenTransaction
    if (transaction === undefined || transaction.correlationId !== correlationId ||
      transaction.awaitingLayout || transaction.stages[transaction.stageIndex] !== coreType) {
      return { accepted: false, previous: previous, state: cloneState(this.currentState), effects: [] }
    }
    if (error !== undefined && error.length > 0) {
      this.currentState.loading = false
      this.currentState.error = error
      this.currentState.bookOpenTransaction = undefined
      return { accepted: true, previous: previous, state: cloneState(this.currentState), effects: [] }
    }
    if (coreType === 'chapter.list') {
      if (chapterCount === undefined || !Number.isInteger(chapterCount) || chapterCount <= 0) {
        this.currentState.loading = false
        this.currentState.error = 'BOOK_OPEN_EMPTY_TOC'
        this.currentState.bookOpenTransaction = undefined
        return { accepted: true, previous: previous, state: cloneState(this.currentState), effects: [] }
      }
      transaction.selectedChapterIndex = Math.min(transaction.requestedChapterIndex, chapterCount - 1)
    }
    if (coreType === 'content.load') {
      transaction.awaitingLayout = true
      this.currentState.bookOpenTransaction = transaction
      return { accepted: true, previous: previous, state: cloneState(this.currentState), effects: [] }
    }
    if (coreType === 'reader.location.resolve') {
      if (canonicalLocation === undefined || canonicalLocation.trim().length === 0 ||
        pageIndex === undefined || !Number.isInteger(pageIndex) || pageIndex < 0) {
        this.currentState.loading = false
        this.currentState.error = 'BOOK_OPEN_LOCATION_INVALID_RESULT'
        this.currentState.bookOpenTransaction = undefined
        return { accepted: true, previous: previous, state: cloneState(this.currentState), effects: [] }
      }
      this.currentState.readerCanonicalLocation = canonicalLocation
      this.currentState.readerPageIndex = pageIndex
    }
    const nextStageIndex: number = transaction.stageIndex + 1
    if (nextStageIndex >= transaction.stages.length) {
      this.currentState.loading = false
      this.currentState.error = undefined
      this.currentState.bookOpenTransaction = undefined
      return { accepted: true, previous: previous, state: cloneState(this.currentState), effects: [] }
    }
    transaction.stageIndex = nextStageIndex
    this.currentState.bookOpenTransaction = transaction
    return {
      accepted: true,
      previous: previous,
      state: cloneState(this.currentState),
      effects: [this.bookOpenEffect(transaction)]
    }
  }

  acceptBookOpenJSONResult(
    coreType: string,
    correlationId: string,
    result: ReaderUIJSONResult
  ): ReaderUIAsyncTransition {
    const transaction: ReaderUIBookOpenTransaction | undefined = this.currentState.bookOpenTransaction
    if (transaction === undefined || transaction.correlationId !== correlationId ||
      transaction.awaitingLayout || transaction.stages[transaction.stageIndex] !== coreType) {
      return this.acceptBookOpenResult(coreType, correlationId)
    }
    const validated: ReaderUIJSONResult = cloneReaderUIJSONResult(result)
    validateReaderUITypedResult('book.open', coreType, validated)
    return this.acceptBookOpenResult(
      coreType,
      correlationId,
      optionalJSONResultInteger(validated, 'chapterCount'),
      optionalJSONResultString(validated, 'canonicalLocation'),
      optionalJSONResultInteger(validated, 'pageIndex'),
      optionalJSONResultString(validated, 'error')
    )
  }

  provideBookOpenLayout(correlationId: string, layout: ReaderUIBookOpenLayout): ReaderUIAsyncTransition {
    const previous: ReaderUIState = cloneState(this.currentState)
    const transaction: ReaderUIBookOpenTransaction | undefined = this.currentState.bookOpenTransaction
    if (transaction === undefined || transaction.correlationId !== correlationId || !transaction.awaitingLayout) {
      return { accepted: false, previous: previous, state: cloneState(this.currentState), effects: [] }
    }
    if (layout.chapterOffset < 0 || !Number.isFinite(layout.chapterProgress) ||
      layout.chapterProgress < 0 || layout.chapterProgress > 1 ||
      layout.viewportWidth <= 0 || layout.viewportHeight <= 0 ||
      !Number.isFinite(layout.fontScale) || layout.fontScale <= 0) {
      throw new ReaderUIRuntimeError('INVALID_LAYOUT', 'book.open requires valid measured layout')
    }
    const locationStageIndex: number = transaction.stages.indexOf('reader.location.resolve')
    if (locationStageIndex < 0) {
      throw new ReaderUIRuntimeError('INVALID_TRANSACTION', 'book.open has no reader.location.resolve stage')
    }
    transaction.stageIndex = locationStageIndex
    transaction.awaitingLayout = false
    transaction.layout = layout
    this.currentState.bookOpenTransaction = transaction
    return {
      accepted: true,
      previous: previous,
      state: cloneState(this.currentState),
      effects: [this.bookOpenEffect(transaction)]
    }
  }

  cancelBookOpen(correlationId: string): ReaderUIAsyncTransition {
    const previous: ReaderUIState = cloneState(this.currentState)
    const transaction: ReaderUIBookOpenTransaction | undefined = this.currentState.bookOpenTransaction
    if (transaction === undefined || transaction.correlationId !== correlationId) {
      return { accepted: false, previous: previous, state: cloneState(this.currentState), effects: [] }
    }
    this.restoreBookOpenStart(transaction)
    this.currentState.bookOpenTransaction = undefined
    return { accepted: true, previous: previous, state: cloneState(this.currentState), effects: [] }
  }

  beginPageStep(
    direction: string,
    correlationId: string,
    payload: ReaderUIJSONPayload = {}
  ): ReaderUITransition {
    return this.beginPageStepTransition(
      direction,
      correlationId,
      payload,
      'manual',
      cloneState(this.currentState),
      'reader.page.explicit'
    )
  }

  providePageLayout(correlationId: string, layout: ReaderUIPageLayout): ReaderUIPlaybackTransition {
    const previous: ReaderUIState = cloneState(this.currentState)
    const transaction: ReaderUIPageTransaction | undefined = this.currentState.pageTransaction
    if (transaction === undefined || transaction.correlationId !== correlationId || transaction.stage !== 'awaiting-layout') {
      return this.playbackResult(false, previous)
    }
    this.validatePageLayout(layout)
    transaction.stage = 'resolving-location'
    transaction.layout = layout
    this.currentState.pageTransaction = transaction
    return this.playbackResult(true, previous, [this.pageLocationEffect(transaction)])
  }

  acceptPageLocationResult(
    correlationId: string,
    canonicalLocation?: string,
    pageIndex?: number,
    error?: string
  ): ReaderUIPlaybackTransition {
    const previous: ReaderUIState = cloneState(this.currentState)
    const transaction: ReaderUIPageTransaction | undefined = this.currentState.pageTransaction
    if (transaction === undefined || transaction.correlationId !== correlationId || transaction.stage !== 'resolving-location') {
      return this.playbackResult(false, previous)
    }
    this.currentState.pageTransaction = undefined
    if (error !== undefined && error.length > 0) {
      this.currentState.error = error
      this.finishFailedAutoPage(transaction)
      return this.playbackResult(true, previous)
    }
    if (canonicalLocation === undefined || canonicalLocation.trim().length === 0 ||
      pageIndex === undefined || !Number.isInteger(pageIndex) || pageIndex < 0) {
      this.currentState.error = 'PAGE_LOCATION_INVALID_RESULT'
      this.finishFailedAutoPage(transaction)
      return this.playbackResult(true, previous)
    }
    this.currentState.readerCanonicalLocation = canonicalLocation
    this.currentState.readerPageIndex = pageIndex
    this.currentState.error = undefined

    const effects: ReaderUIEffect[] = []
    const autoPage: ReaderUIAutoPageTransaction | undefined = this.currentState.autoPageTransaction
    if (transaction.source === 'auto-page' && autoPage !== undefined &&
      autoPage.correlationId === transaction.sessionCorrelationId &&
      autoPage.generation === transaction.generation && this.currentState.activeSession === 'auto-page') {
      autoPage.timerArmed = true
      this.currentState.autoPageTransaction = autoPage
      effects.push(this.timerEffect(READER_FOREGROUND_TIMER_ARM, autoPage))
    }
    return this.playbackResult(true, previous, effects)
  }

  acceptPageLocationJSONResult(
    correlationId: string,
    result: ReaderUIJSONResult
  ): ReaderUIPlaybackTransition {
    const transaction: ReaderUIPageTransaction | undefined = this.currentState.pageTransaction
    if (transaction === undefined || transaction.correlationId !== correlationId ||
      transaction.stage !== 'resolving-location') {
      return this.acceptPageLocationResult(correlationId)
    }
    const validated: ReaderUIJSONResult = cloneReaderUIJSONResult(result)
    validateReaderUITypedResult(transaction.contractEvent, 'reader.location.resolve', validated)
    return this.acceptPageLocationResult(
      correlationId,
      optionalJSONResultString(validated, 'canonicalLocation'),
      optionalJSONResultInteger(validated, 'pageIndex'),
      optionalJSONResultString(validated, 'error')
    )
  }

  cancelPageStep(correlationId: string): ReaderUIPlaybackTransition {
    const previous: ReaderUIState = cloneState(this.currentState)
    if (this.currentState.pageTransaction === undefined ||
      this.currentState.pageTransaction?.correlationId !== correlationId) {
      return this.playbackResult(false, previous)
    }
    this.currentState.pageTransaction = undefined
    return this.playbackResult(true, previous, [], [correlationId])
  }

  acceptTTSCoreResult(coreType: string, correlationId: string, error?: string): ReaderUIPlaybackTransition {
    const previous: ReaderUIState = cloneState(this.currentState)
    const transaction: ReaderUITTSTransaction | undefined = this.currentState.ttsTransaction
    if (transaction === undefined || transaction.correlationId !== correlationId) {
      return this.playbackResult(false, previous)
    }
    let expected: string | undefined = undefined
    if (transaction.stage === 'awaiting-plan') expected = 'tts.queue.plan'
    if (transaction.stage === 'awaiting-queue-start') expected = 'tts.queue.start'
    if (expected !== coreType) return this.playbackResult(false, previous)
    if (error !== undefined && error.length > 0) {
      const effects: ReaderUIEffect[] = this.ttsTeardownEffects(transaction)
      this.currentState.ttsTransaction = undefined
      this.currentState.activeSession = undefined
      this.currentState.error = error
      return this.playbackResult(true, previous, effects, [correlationId])
    }
    if (coreType === 'tts.queue.plan') {
      transaction.stage = 'awaiting-queue-start'
      this.currentState.ttsTransaction = transaction
      return this.playbackResult(true, previous, [this.ttsCoreEffect('tts.queue.start', transaction)])
    }
    transaction.stage = 'awaiting-speech-start'
    transaction.queueLoaded = true
    this.currentState.ttsTransaction = transaction
    return this.playbackResult(true, previous, [this.ttsHostEffect('tts.system.start', transaction)])
  }

  acceptTTSCoreJSONResult(
    coreType: string,
    correlationId: string,
    result: ReaderUIJSONResult
  ): ReaderUIPlaybackTransition {
    const transaction: ReaderUITTSTransaction | undefined = this.currentState.ttsTransaction
    if (transaction === undefined || transaction.correlationId !== correlationId) {
      return this.acceptTTSCoreResult(coreType, correlationId)
    }
    let expected: string | undefined = undefined
    if (transaction.stage === 'awaiting-plan') expected = 'tts.queue.plan'
    if (transaction.stage === 'awaiting-queue-start') expected = 'tts.queue.start'
    if (expected !== coreType) return this.acceptTTSCoreResult(coreType, correlationId)
    const validated: ReaderUIJSONResult = cloneReaderUIJSONResult(result)
    validateReaderUITypedResult(transaction.event, coreType, validated)
    return this.acceptTTSCoreResult(coreType, correlationId, optionalJSONResultString(validated, 'error'))
  }

  acceptTTSSystemStart(correlationId: string, error?: string): ReaderUIPlaybackTransition {
    const previous: ReaderUIState = cloneState(this.currentState)
    const transaction: ReaderUITTSTransaction | undefined = this.currentState.ttsTransaction
    if (transaction === undefined || transaction.correlationId !== correlationId ||
      transaction.stage !== 'awaiting-speech-start') return this.playbackResult(false, previous)
    if (error !== undefined && error.length > 0) {
      const effects: ReaderUIEffect[] = this.ttsTeardownEffects(transaction, true)
      this.currentState.ttsTransaction = undefined
      this.currentState.activeSession = undefined
      this.currentState.error = error
      return this.playbackResult(true, previous, effects, [correlationId])
    }
    transaction.stage = 'playing'
    transaction.speechStarted = true
    this.currentState.ttsTransaction = transaction
    this.currentState.activeSession = 'tts'
    this.currentState.error = undefined
    return this.playbackResult(true, previous)
  }

  acceptTTSSystemStartJSONResult(
    correlationId: string,
    result: ReaderUIJSONResult
  ): ReaderUIPlaybackTransition {
    const transaction: ReaderUITTSTransaction | undefined = this.currentState.ttsTransaction
    if (transaction === undefined || transaction.correlationId !== correlationId ||
      transaction.stage !== 'awaiting-speech-start') {
      return this.acceptTTSSystemStart(correlationId)
    }
    const validated: ReaderUIJSONResult = cloneReaderUIJSONResult(result)
    validateReaderUITypedResult(transaction.event, 'tts.system.start', validated)
    return this.acceptTTSSystemStart(correlationId, optionalJSONResultString(validated, 'error'))
  }

  stopTTS(correlationId?: string): ReaderUIPlaybackTransition {
    const previous: ReaderUIState = cloneState(this.currentState)
    const transaction: ReaderUITTSTransaction | undefined = this.currentState.ttsTransaction
    if (transaction === undefined || (correlationId !== undefined && transaction.correlationId !== correlationId)) {
      return this.playbackResult(false, previous)
    }
    const effects: ReaderUIEffect[] = this.ttsTeardownEffects(transaction)
    this.currentState.ttsTransaction = undefined
    this.currentState.activeSession = undefined
    this.currentState.error = undefined
    return this.playbackResult(true, previous, effects, [transaction.correlationId])
  }

  acceptAutoPageTimerFired(correlationId: string, generation: number): ReaderUIPlaybackTransition {
    const previous: ReaderUIState = cloneState(this.currentState)
    const transaction: ReaderUIAutoPageTransaction | undefined = this.currentState.autoPageTransaction
    if (transaction === undefined || transaction.correlationId !== correlationId ||
      transaction.generation !== generation || !transaction.timerArmed ||
      this.currentState.activeSession !== 'auto-page' || this.currentState.pageTransaction !== undefined) {
      return this.playbackResult(false, previous)
    }
    transaction.timerArmed = false
    transaction.tick += 1
    this.currentState.autoPageTransaction = transaction
    const pageCorrelationId: string = `${correlationId}:page:${generation}:${transaction.tick}`
    const page: ReaderUITransition = this.beginPageStepTransition(
      'next',
      pageCorrelationId,
      {},
      'auto-page',
      previous,
      'reader.autoPage.timer',
      correlationId,
      generation
    )
    return {
      accepted: true,
      previous: previous,
      state: page.state,
      effects: page.effects,
      cancelledCorrelationIds: page.cancelledCorrelationIds
    }
  }

  stopAutoPage(correlationId?: string): ReaderUIPlaybackTransition {
    return this.stopAutoPagePlayback(correlationId, cloneState(this.currentState))
  }

  suspendAutoPageForBackground(correlationId?: string): ReaderUIPlaybackTransition {
    return this.stopAutoPagePlayback(correlationId, cloneState(this.currentState))
  }

  completeAsync(error?: string): ReaderUIState {
    this.currentState.loading = false
    this.currentState.error = error
    return cloneState(this.currentState)
  }

  private beginPageStepTransition(
    direction: string,
    correlationId: string | undefined,
    payload: ReaderUIJSONPayload,
    source: string,
    previous: ReaderUIState,
    event: string,
    sessionCorrelationId?: string,
    generation?: number
  ): ReaderUITransition {
    this.requireActiveReader(event)
    if (correlationId === undefined || correlationId.length === 0) {
      throw new ReaderUIRuntimeError('MISSING_CORRELATION', `${event} requires correlationId`)
    }
    if (direction !== 'next' && direction !== 'previous' && direction !== 'explicit') {
      throw new ReaderUIRuntimeError('INVALID_PAGE_DIRECTION', `${event} requires next|previous|explicit`)
    }
    if (this.currentState.pageTransaction?.correlationId === correlationId) {
      throw new ReaderUIRuntimeError('DUPLICATE_CORRELATION', `${event} was already dispatched for ${correlationId}`)
    }
    const cancelledCorrelationIds: string[] = []
    const effects: ReaderUIEffect[] = []
    if (source === 'manual' && this.currentState.autoPageTransaction !== undefined) {
      const teardown: ReaderUIPlaybackTransition = this.stopAutoPagePlayback(undefined, cloneState(this.currentState))
      effects.push(...teardown.effects)
      cancelledCorrelationIds.push(...teardown.cancelledCorrelationIds)
    }
    const active: ReaderUIPageTransaction | undefined = this.currentState.pageTransaction
    if (active !== undefined) cancelledCorrelationIds.push(active.correlationId)
    this.currentState.pageTransaction = {
      correlationId: correlationId,
      direction: direction,
      source: source,
      contractEvent: source === 'auto-page' ? 'reader.autoPage.start' : event,
      sessionCorrelationId: sessionCorrelationId,
      generation: generation,
      stage: 'awaiting-layout',
      payload: clonePayload(payload)
    }
    this.currentState.error = undefined
    return {
      event: event,
      previous: previous,
      state: cloneState(this.currentState),
      effects: effects,
      cancelledCorrelationIds: cancelledCorrelationIds
    }
  }

  private beginTTSTransition(
    correlationId: string | undefined,
    payload: ReaderUIJSONPayload,
    previous: ReaderUIState,
    event: string
  ): ReaderUITransition {
    this.requireActiveReader(event)
    if (correlationId === undefined || correlationId.length === 0) {
      throw new ReaderUIRuntimeError('MISSING_CORRELATION', `${event} requires correlationId`)
    }
    if (payload['text'] !== undefined || payload['content'] !== undefined || payload['chapterBody'] !== undefined) {
      throw new ReaderUIRuntimeError('INVALID_TTS_PAYLOAD', `${event} binds chapter content through Host DomainContext`)
    }
    if (this.currentState.ttsTransaction?.correlationId === correlationId) {
      throw new ReaderUIRuntimeError('DUPLICATE_CORRELATION', `${event} was already dispatched for ${correlationId}`)
    }
    const teardown: ReaderUIPlaybackTeardown = this.teardownPlaybackSession()
    const transaction: ReaderUITTSTransaction = {
      correlationId: correlationId,
      event: event,
      stage: 'awaiting-plan',
      queueLoaded: false,
      speechStarted: false,
      payload: clonePayload(payload)
    }
    this.currentState.ttsTransaction = transaction
    this.currentState.activeSession = undefined
    this.currentState.overlay = undefined
    this.currentState.error = undefined
    teardown.effects.push(this.ttsCoreEffect('tts.queue.plan', transaction))
    return {
      event: event,
      previous: previous,
      state: cloneState(this.currentState),
      effects: teardown.effects,
      cancelledCorrelationIds: teardown.cancelledCorrelationIds
    }
  }

  private stopTTSTransition(
    correlationId: string | undefined,
    previous: ReaderUIState,
    event: string
  ): ReaderUITransition {
    const transaction: ReaderUITTSTransaction | undefined = this.currentState.ttsTransaction
    if (transaction === undefined || (correlationId !== undefined && transaction.correlationId !== correlationId)) {
      return { event: event, previous: previous, state: cloneState(this.currentState), effects: [], cancelledCorrelationIds: [] }
    }
    const effects: ReaderUIEffect[] = this.ttsTeardownEffects(transaction)
    this.currentState.ttsTransaction = undefined
    this.currentState.activeSession = undefined
    this.currentState.error = undefined
    return {
      event: event,
      previous: previous,
      state: cloneState(this.currentState),
      effects: effects,
      cancelledCorrelationIds: [transaction.correlationId]
    }
  }

  private beginAutoPageTransition(
    correlationId: string | undefined,
    payload: ReaderUIJSONPayload,
    previous: ReaderUIState,
    event: string
  ): ReaderUITransition {
    this.requireActiveReader(event)
    if (correlationId === undefined || correlationId.length === 0) {
      throw new ReaderUIRuntimeError('MISSING_CORRELATION', `${event} requires correlationId`)
    }
    const intervalMs: number | undefined = jsonInteger(payload['intervalMs'])
    if (intervalMs === undefined || intervalMs < READER_AUTO_PAGE_MIN_INTERVAL_MS ||
      intervalMs > READER_AUTO_PAGE_MAX_INTERVAL_MS) {
      throw new ReaderUIRuntimeError(
        'INVALID_AUTO_PAGE_INTERVAL',
        `${event} requires intervalMs=${READER_AUTO_PAGE_MIN_INTERVAL_MS}..${READER_AUTO_PAGE_MAX_INTERVAL_MS}`
      )
    }
    if (this.currentState.autoPageTransaction?.correlationId === correlationId) {
      throw new ReaderUIRuntimeError('DUPLICATE_CORRELATION', `${event} was already dispatched for ${correlationId}`)
    }
    if (this.currentState.pageTransaction !== undefined) {
      throw new ReaderUIRuntimeError('PAGE_TRANSACTION_PENDING', `${event} waits for the active page transaction`)
    }
    const teardown: ReaderUIPlaybackTeardown = this.teardownPlaybackSession()
    const generation: number = this.nextPlaybackGeneration()
    const transaction: ReaderUIAutoPageTransaction = {
      correlationId: correlationId,
      intervalMs: intervalMs,
      generation: generation,
      tick: 0,
      timerArmed: true
    }
    this.currentState.autoPageTransaction = transaction
    this.currentState.activeSession = 'auto-page'
    this.currentState.overlay = undefined
    this.currentState.error = undefined
    teardown.effects.push(this.timerEffect(READER_FOREGROUND_TIMER_ARM, transaction))
    return {
      event: event,
      previous: previous,
      state: cloneState(this.currentState),
      effects: teardown.effects,
      cancelledCorrelationIds: teardown.cancelledCorrelationIds
    }
  }

  private stopAutoPageTransition(
    correlationId: string | undefined,
    previous: ReaderUIState,
    event: string
  ): ReaderUITransition {
    const result: ReaderUIPlaybackTransition = this.stopAutoPagePlayback(correlationId, previous)
    return {
      event: event,
      previous: previous,
      state: result.state,
      effects: result.effects,
      cancelledCorrelationIds: result.cancelledCorrelationIds
    }
  }

  private stopAutoPagePlayback(
    correlationId: string | undefined,
    previous: ReaderUIState
  ): ReaderUIPlaybackTransition {
    const transaction: ReaderUIAutoPageTransaction | undefined = this.currentState.autoPageTransaction
    if (transaction === undefined || (correlationId !== undefined && transaction.correlationId !== correlationId)) {
      return this.playbackResult(false, previous)
    }
    const cancelledCorrelationIds: string[] = [transaction.correlationId]
    const page: ReaderUIPageTransaction | undefined = this.currentState.pageTransaction
    if (page !== undefined && page.source === 'auto-page' && page.sessionCorrelationId === transaction.correlationId) {
      cancelledCorrelationIds.push(page.correlationId)
      this.currentState.pageTransaction = undefined
    }
    const effects: ReaderUIEffect[] = [this.timerEffect(READER_FOREGROUND_TIMER_CANCEL, transaction)]
    this.nextPlaybackGeneration()
    this.currentState.autoPageTransaction = undefined
    this.currentState.activeSession = undefined
    this.currentState.error = undefined
    return this.playbackResult(true, previous, effects, cancelledCorrelationIds)
  }

  private teardownPlaybackSession(): ReaderUIPlaybackTeardown {
    const effects: ReaderUIEffect[] = []
    const cancelledCorrelationIds: string[] = []
    const tts: ReaderUITTSTransaction | undefined = this.currentState.ttsTransaction
    if (tts !== undefined) {
      cancelledCorrelationIds.push(tts.correlationId)
      effects.push(...this.ttsTeardownEffects(tts))
      this.currentState.ttsTransaction = undefined
    }
    const autoPage: ReaderUIAutoPageTransaction | undefined = this.currentState.autoPageTransaction
    if (autoPage !== undefined) {
      cancelledCorrelationIds.push(autoPage.correlationId)
      effects.push(this.timerEffect(READER_FOREGROUND_TIMER_CANCEL, autoPage))
      const page: ReaderUIPageTransaction | undefined = this.currentState.pageTransaction
      if (page !== undefined && page.source === 'auto-page' && page.sessionCorrelationId === autoPage.correlationId) {
        cancelledCorrelationIds.push(page.correlationId)
        this.currentState.pageTransaction = undefined
      }
      this.nextPlaybackGeneration()
      this.currentState.autoPageTransaction = undefined
    }
    this.currentState.activeSession = undefined
    return { effects: effects, cancelledCorrelationIds: cancelledCorrelationIds }
  }

  private teardownAllPlayback(): ReaderUIPlaybackTeardown {
    const teardown: ReaderUIPlaybackTeardown = this.teardownPlaybackSession()
    const page: ReaderUIPageTransaction | undefined = this.currentState.pageTransaction
    if (page !== undefined) {
      teardown.cancelledCorrelationIds.push(page.correlationId)
      this.currentState.pageTransaction = undefined
    }
    return teardown
  }

  private ttsTeardownEffects(transaction: ReaderUITTSTransaction, forceSystemStop: boolean = false): ReaderUIEffect[] {
    const effects: ReaderUIEffect[] = []
    if (transaction.speechStarted || forceSystemStop) effects.push(this.ttsHostEffect('tts.system.stop', transaction))
    if (transaction.queueLoaded) effects.push(this.ttsCoreEffect('tts.queue.stop', transaction))
    return effects
  }

  private ttsCoreEffect(type: string, transaction: ReaderUITTSTransaction): ReaderUIEffect {
    return readerUIEffect(
      'core',
      type,
      type === 'tts.queue.plan' ? transaction.payload : {},
      transaction.correlationId
    )
  }

  private ttsHostEffect(type: string, transaction: ReaderUITTSTransaction): ReaderUIEffect {
    return readerUIEffect('host', type, {}, transaction.correlationId)
  }

  private timerEffect(type: string, transaction: ReaderUIAutoPageTransaction): ReaderUIEffect {
    return readerUIEffect(
      'host',
      type,
      {
        'timerId': transaction.correlationId,
        'correlationId': transaction.correlationId,
        'delayMs': transaction.intervalMs,
        'generation': transaction.generation,
        'oneShot': true,
        'foregroundOnly': true
      },
      transaction.correlationId
    )
  }

  private pageLocationEffect(transaction: ReaderUIPageTransaction): ReaderUIEffect {
    const layout: ReaderUIPageLayout | undefined = transaction.layout
    if (layout === undefined) {
      throw new ReaderUIRuntimeError('INVALID_PAGE_LAYOUT', 'page transaction has no layout')
    }
    const payload: ReaderUIJSONPayload = clonePayload(transaction.payload)
    payload['direction'] = transaction.direction
    payload['anchor'] = layout.anchor
    payload['targetPageIndex'] = layout.targetPageIndex
    payload['chapterIndex'] = layout.chapterIndex
    payload['chapterOffset'] = layout.chapterOffset
    payload['chapterProgress'] = layout.chapterProgress
    payload['viewportWidth'] = layout.viewportWidth
    payload['viewportHeight'] = layout.viewportHeight
    payload['fontScale'] = layout.fontScale
    return readerUIEffect('core', 'reader.location.resolve', payload, transaction.correlationId)
  }

  private validatePageLayout(layout: ReaderUIPageLayout): void {
    if (layout.anchor.length === 0 || layout.targetPageIndex < 0 || layout.chapterIndex < 0 ||
      layout.chapterOffset < 0 || !Number.isFinite(layout.chapterProgress) ||
      layout.chapterProgress < 0 || layout.chapterProgress > 1 ||
      layout.viewportWidth <= 0 || layout.viewportHeight <= 0 ||
      !Number.isFinite(layout.fontScale) || layout.fontScale <= 0) {
      throw new ReaderUIRuntimeError('INVALID_PAGE_LAYOUT', 'page transaction requires a real anchor and measured viewport')
    }
  }

  private finishFailedAutoPage(pageTransaction: ReaderUIPageTransaction): void {
    const autoPage: ReaderUIAutoPageTransaction | undefined = this.currentState.autoPageTransaction
    if (pageTransaction.source !== 'auto-page' || autoPage === undefined ||
      autoPage.correlationId !== pageTransaction.sessionCorrelationId ||
      autoPage.generation !== pageTransaction.generation) return
    this.nextPlaybackGeneration()
    this.currentState.autoPageTransaction = undefined
    this.currentState.activeSession = undefined
  }

  private requireActiveReader(event: string): void {
    if (this.currentState.routeId !== 'immersive-reading') {
      throw new ReaderUIRuntimeError('READER_INACTIVE', `${event} requires immersive-reading`)
    }
  }

  private preflightAppearance(
    event: string,
    payload: ReaderUIJSONPayload,
    correlationId: string | undefined,
    descriptor: RuntimeActionDescriptor
  ): void {
    if (correlationId === undefined || correlationId.length === 0) {
      throw new ReaderUIRuntimeError('MISSING_CORRELATION', `${event} requires correlationId`)
    }
    if (this.currentState.appearanceTransaction !== undefined) {
      throw new ReaderUIRuntimeError('APPEARANCE_BUSY', `${event} is blocked by an active appearance transaction`)
    }
    const operation: string | undefined = descriptor.value
    const allowed: string[] = [
      'font.register', 'font.unregister', 'theme.create', 'theme.update', 'theme.delete',
      'typography.persist', 'config.loadPersisted', 'config.savePersisted'
    ]
    if (operation === undefined || allowed.indexOf(operation) < 0) {
      throw new ReaderUIRuntimeError('INVALID_TRANSACTION', `${event} has an invalid appearance operation`)
    }
    if (operation === 'font.register') {
      const path: string | undefined = jsonString(payload, 'path')
      const lower: string = path?.toLowerCase() ?? ''
      if (!lower.endsWith('.ttf') && !lower.endsWith('.otf') && !lower.endsWith('.ttc')) {
        throw new ReaderUIRuntimeError(
          'INVALID_TYPED_PAYLOAD',
          'payload.path must identify a .ttf, .otf, or .ttc file'
        )
      }
    }
    if (operation === 'config.savePersisted') {
      const value: ReaderUIJSONValue | undefined = payload['preference']
      if (value === undefined || value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new ReaderUIRuntimeError('INVALID_APPEARANCE_PREFERENCE', 'preference must be an object')
      }
      this.validatedAppearancePreference(value as ReaderUIJSONPayload)
    }
  }

  private appearanceInitialEffect(transaction: ReaderUIAppearanceTransaction): ReaderUIEffect {
    if (transaction.stage === 'registering-font') {
      const path: ReaderUIJSONValue | undefined = transaction.payload['path']
      const familyName: ReaderUIJSONValue | undefined = transaction.payload['familyName']
      if (path === undefined || familyName === undefined) {
        throw new ReaderUIRuntimeError('INVALID_TRANSACTION', 'font.register is missing typed fields')
      }
      return readerUIEffect(
        'host',
        READER_FONT_REGISTER_FILE,
        { 'path': path, 'familyName': familyName },
        transaction.correlationId
      )
    }
    return this.appearanceLoadEffect(transaction)
  }

  private appearanceLoadEffect(transaction: ReaderUIAppearanceTransaction): ReaderUIEffect {
    return readerUIEffect(
      'host',
      READER_APPEARANCE_PERSISTENCE_GET,
      { 'namespace': 'reader-ui', 'key': 'appearance.v1' },
      transaction.correlationId
    )
  }

  private appearanceSaveEffect(
    transaction: ReaderUIAppearanceTransaction,
    expectedRevision: number
  ): ReaderUIEffect {
    if (transaction.workingPreference === undefined) {
      throw new ReaderUIRuntimeError('INVALID_TRANSACTION', 'appearance save requires a working preference')
    }
    return readerUIEffect(
      'host',
      READER_APPEARANCE_PERSISTENCE_PUT,
      {
        'namespace': 'reader-ui',
        'key': 'appearance.v1',
        'value': JSON.stringify(transaction.workingPreference),
        'expectedRevision': expectedRevision.toString()
      },
      transaction.correlationId
    )
  }

  private fontUnregisterEffect(transaction: ReaderUIAppearanceTransaction): ReaderUIEffect {
    const record: ReaderUIJSONPayload | undefined = transaction.fontRecord
    const path: ReaderUIJSONValue | undefined = record?.['path']
    const familyName: ReaderUIJSONValue | undefined = record?.['familyName']
    if (path === undefined || familyName === undefined) {
      throw new ReaderUIRuntimeError('INVALID_TRANSACTION', 'font unregister requires a persisted font record')
    }
    return readerUIEffect(
      'host',
      READER_FONT_UNREGISTER_FILE,
      { 'path': path, 'familyName': familyName },
      transaction.correlationId
    )
  }

  private decodeAppearanceLoadResult(result: ReaderUIJSONResult): ReaderUIJSONPayload {
    if (result['found'] === false) {
      this.assertExactResultKeys(result, ['found'], READER_APPEARANCE_PERSISTENCE_GET)
      return initialReaderUIAppearancePreference()
    }
    this.assertExactResultKeys(
      result,
      ['found', 'value', 'revision'],
      READER_APPEARANCE_PERSISTENCE_GET
    )
    const value: ReaderUIJSONValue | undefined = result['value']
    if (result['found'] !== true || typeof value !== 'string') {
      throw new ReaderUIRuntimeError('INVALID_APPEARANCE_RESULT', 'persistence.get returned an invalid value')
    }
    const revision: number = this.parseAppearanceRevision(result['revision'], 'result.revision')
    let decoded: ReaderUIJSONValue
    try {
      decoded = JSON.parse(value) as ReaderUIJSONValue
    } catch (error) {
      throw new ReaderUIRuntimeError('INVALID_APPEARANCE_PREFERENCE', 'persisted appearance JSON is malformed')
    }
    if (decoded === null || typeof decoded !== 'object' || Array.isArray(decoded)) {
      throw new ReaderUIRuntimeError('INVALID_APPEARANCE_PREFERENCE', 'persisted appearance must be an object')
    }
    const preference: ReaderUIJSONPayload = this.validatedAppearancePreference(decoded as ReaderUIJSONPayload)
    if (this.appearanceRevision(preference) !== revision) {
      throw new ReaderUIRuntimeError(
        'INVALID_APPEARANCE_PREFERENCE',
        'persisted appearance revision does not match Host revision'
      )
    }
    return preference
  }

  private applyAppearanceOperation(
    transaction: ReaderUIAppearanceTransaction,
    current: ReaderUIJSONPayload
  ): ReaderUIAppearanceApplyResult {
    let working: ReaderUIJSONPayload = clonePayload(current)
    if (transaction.operation === 'font.register') {
      const fonts: ReaderUIJSONValue[] = working['fonts'] as ReaderUIJSONValue[]
      const fontId: string | undefined = jsonString(transaction.payload, 'fontId')
      if (fontId === undefined || transaction.fontRecord === undefined) {
        throw new ReaderUIRuntimeError('INVALID_TRANSACTION', 'font.register has no Host result')
      }
      let exists: boolean = false
      fonts.forEach((value: ReaderUIJSONValue): void => {
        if (jsonString(value as ReaderUIJSONPayload, 'id') === fontId) exists = true
      })
      if (exists) throw new ReaderUIRuntimeError('APPEARANCE_CONFLICT', `font ${fontId} already exists`)
      fonts.push(transaction.fontRecord)
    } else if (transaction.operation === 'font.unregister') {
      const fonts: ReaderUIJSONValue[] = working['fonts'] as ReaderUIJSONValue[]
      const fontId: string | undefined = jsonString(transaction.payload, 'fontId')
      let index: number = -1
      fonts.forEach((value: ReaderUIJSONValue, candidate: number): void => {
        if (jsonString(value as ReaderUIJSONPayload, 'id') === fontId) index = candidate
      })
      if (index < 0) throw new ReaderUIRuntimeError('APPEARANCE_NOT_FOUND', `font ${fontId} does not exist`)
      transaction.fontRecord = fonts[index] as ReaderUIJSONPayload
      fonts.splice(index, 1)
      const typography: ReaderUIJSONPayload = working['typography'] as ReaderUIJSONPayload
      if (jsonString(typography, 'fontFamily') === jsonString(transaction.fontRecord, 'familyName')) {
        typography['fontFamily'] = null
      }
    } else if (transaction.operation === 'theme.create' || transaction.operation === 'theme.update') {
      const themes: ReaderUIJSONValue[] = working['themes'] as ReaderUIJSONValue[]
      const theme: ReaderUIJSONPayload = transaction.payload['theme'] as ReaderUIJSONPayload
      const themeId: string | undefined = jsonString(theme, 'id')
      let index: number = -1
      themes.forEach((value: ReaderUIJSONValue, candidate: number): void => {
        if (jsonString(value as ReaderUIJSONPayload, 'id') === themeId) index = candidate
      })
      if (transaction.operation === 'theme.create') {
        if (index >= 0) throw new ReaderUIRuntimeError('APPEARANCE_CONFLICT', `theme ${themeId} already exists`)
        themes.push(theme)
        if (working['activeThemeId'] === null) working['activeThemeId'] = themeId ?? null
      } else {
        if (index < 0) throw new ReaderUIRuntimeError('APPEARANCE_NOT_FOUND', `theme ${themeId} does not exist`)
        themes[index] = theme
      }
    } else if (transaction.operation === 'theme.delete') {
      const themes: ReaderUIJSONValue[] = working['themes'] as ReaderUIJSONValue[]
      const themeId: string | undefined = jsonString(transaction.payload, 'themeId')
      let index: number = -1
      themes.forEach((value: ReaderUIJSONValue, candidate: number): void => {
        if (jsonString(value as ReaderUIJSONPayload, 'id') === themeId) index = candidate
      })
      if (index < 0) throw new ReaderUIRuntimeError('APPEARANCE_NOT_FOUND', `theme ${themeId} does not exist`)
      themes.splice(index, 1)
      if (working['activeThemeId'] === themeId) {
        working['activeThemeId'] = themes.length === 0
          ? null : jsonString(themes[0] as ReaderUIJSONPayload, 'id') ?? null
      }
    } else if (transaction.operation === 'typography.persist') {
      working['typography'] = transaction.payload['typography']
    } else if (transaction.operation === 'config.savePersisted') {
      const requested: ReaderUIJSONPayload = this.validatedAppearancePreference(
        transaction.payload['preference'] as ReaderUIJSONPayload
      )
      if (this.appearanceRevision(requested) !== this.appearanceRevision(current)) {
        throw new ReaderUIRuntimeError('APPEARANCE_CONFLICT', 'config.savePersisted revision is stale')
      }
      working = clonePayload(requested)
    } else {
      throw new ReaderUIRuntimeError('INVALID_TRANSACTION', `Unsupported appearance operation ${transaction.operation}`)
    }
    working['schemaVersion'] = 1
    working['revision'] = this.appearanceRevision(current) + 1
    return { transaction: transaction, preference: this.validatedAppearancePreference(working) }
  }

  private validatedAppearancePreference(preference: ReaderUIJSONPayload): ReaderUIJSONPayload {
    let validated: ReaderUIJSONPayload
    try {
      validated = clonePayload(preference)
      validateReaderUITypedPayload('reader.config.persist', { 'preference': validated })
    } catch (error) {
      throw new ReaderUIRuntimeError(
        'INVALID_APPEARANCE_PREFERENCE',
        (error as Error).message
      )
    }
    const themes: ReaderUIJSONValue[] = validated['themes'] as ReaderUIJSONValue[]
    const fonts: ReaderUIJSONValue[] = validated['fonts'] as ReaderUIJSONValue[]
    const themeIds: Set<string> = new Set<string>()
    const fontIds: Set<string> = new Set<string>()
    let duplicate: boolean = false
    themes.forEach((value: ReaderUIJSONValue): void => {
      const id: string | undefined = jsonString(value as ReaderUIJSONPayload, 'id')
      if (id === undefined || themeIds.has(id)) duplicate = true
      else themeIds.add(id)
    })
    fonts.forEach((value: ReaderUIJSONValue): void => {
      const id: string | undefined = jsonString(value as ReaderUIJSONPayload, 'id')
      if (id === undefined || fontIds.has(id)) duplicate = true
      else fontIds.add(id)
    })
    if (duplicate) {
      throw new ReaderUIRuntimeError('INVALID_APPEARANCE_PREFERENCE', 'appearance preference contains duplicate ids')
    }
    const active: ReaderUIJSONValue | undefined = validated['activeThemeId']
    if (typeof active === 'string' && !themeIds.has(active)) {
      throw new ReaderUIRuntimeError(
        'INVALID_APPEARANCE_PREFERENCE',
        'activeThemeId does not reference a stored theme'
      )
    }
    return validated
  }

  private appearanceRevision(preference: ReaderUIJSONPayload): number {
    const revision: ReaderUIJSONValue | undefined = preference['revision']
    if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0) {
      throw new ReaderUIRuntimeError('INVALID_APPEARANCE_PREFERENCE', 'appearance revision must be non-negative')
    }
    return revision
  }

  private parseAppearanceRevision(value: ReaderUIJSONValue | undefined, path: string): number {
    if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) {
      throw new ReaderUIRuntimeError(
        'INVALID_APPEARANCE_RESULT',
        `${path} must be a non-negative decimal revision string`
      )
    }
    const revision: number = Number(value)
    if (!Number.isSafeInteger(revision)) {
      throw new ReaderUIRuntimeError('INVALID_APPEARANCE_RESULT', `${path} exceeds the safe integer range`)
    }
    return revision
  }

  private assertExactResultKeys(result: ReaderUIJSONResult, expected: string[], type: string): void {
    const actual: string[] = Object.keys(result).sort()
    const canonical: string[] = expected.slice().sort()
    if (actual.length !== canonical.length || actual.join('|') !== canonical.join('|')) {
      throw new ReaderUIRuntimeError('INVALID_APPEARANCE_RESULT', `${type} result has missing or unknown fields`)
    }
  }

  private terminateAppearanceError(
    previous: ReaderUIState,
    transaction: ReaderUIAppearanceTransaction,
    error: ReaderUIRuntimeError
  ): ReaderUIAsyncTransition {
    this.currentState.error = error.code ?? 'APPEARANCE_HOST_FAILED'
    if (transaction.stage === 'saving') this.currentState.appearanceReconcileRequired = true
    if (transaction.operation === 'font.register' && transaction.fontRecord !== undefined &&
      (transaction.stage === 'registering-font' || transaction.stage === 'loading' || transaction.stage === 'saving')) {
      transaction.stage = 'rolling-back-font'
      this.currentState.appearanceTransaction = transaction
      return this.appearanceResult(true, previous, [this.fontUnregisterEffect(transaction)])
    }
    if (transaction.stage === 'unregistering-font' || transaction.stage === 'rolling-back-font' ||
      (transaction.operation === 'font.unregister' && transaction.stage === 'saving')) {
      this.currentState.fontUnregisterRestartRequired = true
    }
    this.currentState.appearanceTransaction = undefined
    return this.appearanceResult(true, previous)
  }

  private appearanceResult(
    accepted: boolean,
    previous: ReaderUIState,
    effects: ReaderUIEffect[] = []
  ): ReaderUIAsyncTransition {
    return {
      accepted: accepted,
      previous: previous,
      state: cloneState(this.currentState),
      effects: effects
    }
  }

  private nextPlaybackGeneration(): number {
    const generation: number = (this.currentState.playbackGeneration ?? 0) + 1
    this.currentState.playbackGeneration = generation
    return generation
  }

  private preflightBookOpen(
    event: string,
    payload: ReaderUIJSONPayload,
    correlationId: string | undefined,
    descriptor: RuntimeActionDescriptor
  ): void {
    if (correlationId === undefined || correlationId.length === 0) {
      throw new ReaderUIRuntimeError('MISSING_CORRELATION', `${event} requires correlationId`)
    }
    const sourceKind: string | undefined = jsonString(payload, 'sourceKind')
    if (sourceKind !== 'remote' && sourceKind !== 'local') {
      throw new ReaderUIRuntimeError('INVALID_SOURCE_KIND', `${event} requires payload.sourceKind=remote|local`)
    }
    const firstStage: string = sourceKind === 'local' ? 'chapter.list' : 'source.detail'
    if (descriptor.coreSequence.indexOf(firstStage) < 0 || descriptor.coreSequence.indexOf('content.load') < 0 ||
      descriptor.coreSequence.indexOf('reader.location.resolve') < 0) {
      throw new ReaderUIRuntimeError('INVALID_TRANSACTION', `${event} has an incomplete Core transaction`)
    }
    if (this.currentState.bookOpenTransaction?.correlationId === correlationId) {
      throw new ReaderUIRuntimeError('DUPLICATE_CORRELATION', `${event} was already dispatched for ${correlationId}`)
    }
  }

  private playbackResult(
    accepted: boolean,
    previous: ReaderUIState,
    effects: ReaderUIEffect[] = [],
    cancelledCorrelationIds: string[] = []
  ): ReaderUIPlaybackTransition {
    return {
      accepted: accepted,
      previous: previous,
      state: cloneState(this.currentState),
      effects: effects,
      cancelledCorrelationIds: cancelledCorrelationIds
    }
  }

  private checkGuards(descriptor: RuntimeActionDescriptor, event: string): void {
    descriptor.guards.forEach((guardName: string) => {
      if (guardName === 'loadingFalse' && this.currentState.loading) {
        throw new ReaderUIRuntimeError('ASYNC_GUARD', `${event} is blocked while loading`)
      }
      if (guardName === 'overlayEmpty' && this.currentState.overlay !== undefined) {
        throw new ReaderUIRuntimeError('OVERLAY_GUARD', `${event} is blocked while overlay is open`)
      }
    })
  }

  private bookOpenEffect(transaction: ReaderUIBookOpenTransaction): ReaderUIEffect {
    return readerUIEffect(
      'core',
      transaction.stages[transaction.stageIndex],
      this.bookOpenEffectPayload(transaction),
      transaction.correlationId
    )
  }

  private bookOpenEffectPayload(transaction: ReaderUIBookOpenTransaction): ReaderUIJSONPayload {
    const payload: ReaderUIJSONPayload = clonePayload(transaction.payload)
    payload['sourceKind'] = transaction.sourceKind
    payload['chapterIndex'] = transaction.selectedChapterIndex ?? transaction.requestedChapterIndex
    const layout: ReaderUIBookOpenLayout | undefined = transaction.layout
    if (layout !== undefined) {
      payload['chapterOffset'] = layout.chapterOffset
      payload['chapterProgress'] = layout.chapterProgress
      payload['viewportWidth'] = layout.viewportWidth
      payload['viewportHeight'] = layout.viewportHeight
      payload['fontScale'] = layout.fontScale
    }
    return payload
  }

  private restoreBookOpenStart(transaction: ReaderUIBookOpenTransaction): void {
    this.currentState.routeId = transaction.restoreRouteId
    this.currentState.routeStack = transaction.restoreRouteStack.slice()
    this.currentState.overlay = transaction.restoreOverlay
    this.currentState.loading = false
    this.currentState.error = undefined
  }

  private requestedChapterIndex(value?: ReaderUIJSONValue): number {
    const parsed: number | undefined = jsonInteger(value)
    return parsed !== undefined && parsed >= 0 ? parsed : 0
  }
}
