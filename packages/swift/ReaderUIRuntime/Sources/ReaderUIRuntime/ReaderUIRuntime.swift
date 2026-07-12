import Foundation

public enum ReaderUIEffectKind: String, Sendable, Equatable {
    case core
    case host
}

public struct ReaderUIEffect: Sendable, Equatable {
    public let kind: ReaderUIEffectKind
    public let type: String
    @available(*, deprecated, message: "Use jsonPayload; payload is a scalar-only compatibility projection")
    public let payload: [String: String]
    public let jsonPayload: ReaderUIJSONPayload
    public let legacyPayloadIsComplete: Bool
    public let correlationId: String?

    /// Source-compatible initializer for existing Host code.
    public init(
        kind: ReaderUIEffectKind,
        type: String,
        payload: [String: String],
        correlationId: String? = nil
    ) {
        self.kind = kind
        self.type = type
        self.payload = payload
        self.jsonPayload = .readerUIStrings(payload)
        self.legacyPayloadIsComplete = true
        self.correlationId = correlationId
    }

    /// Canonical lossless initializer used by the runtime.
    public init(
        kind: ReaderUIEffectKind,
        type: String,
        jsonPayload: ReaderUIJSONPayload,
        correlationId: String? = nil
    ) {
        let projection = jsonPayload.readerUILegacyScalarProjection
        self.kind = kind
        self.type = type
        self.payload = projection.payload
        self.jsonPayload = jsonPayload
        self.legacyPayloadIsComplete = projection.isComplete
        self.correlationId = correlationId
    }

    /// Transitional projection for Host code that still consumes string-only
    /// effects. Returns nil when an object, array or null had to be omitted.
    public var legacyStringPayload: [String: String]? {
        legacyPayloadIsComplete ? payload : nil
    }
}

/// Runtime-owned ledger for the non-atomic `book.open` workflow. Domain DTOs
/// stay in the Host bridge; this record owns only order, selection and stale
/// result boundaries.
public struct ReaderUIBookOpenTransaction: Sendable, Equatable {
    public var correlationId: String
    public var sourceKind: String
    public var stages: [String]
    public var stageIndex: Int
    public var requestedChapterIndex: Int
    public var selectedChapterIndex: Int?
    public var awaitingLayout: Bool
    public var payload: ReaderUIJSONPayload
    public var restoreRouteId: String
    public var restoreRouteStack: [String]
    public var restoreOverlay: String?
    public var layout: ReaderUIBookOpenLayout?

    public var stage: String { stages[stageIndex] }
}

/// The smallest layout handoff needed for Core's layout-independent location
/// resolver. It is supplied only after the real content is rendered.
public struct ReaderUIBookOpenLayout: Sendable, Equatable {
    public let chapterOffset: Int
    public let chapterProgress: Double
    public let viewportWidth: Int
    public let viewportHeight: Int
    public let fontScale: Double

    public init(
        chapterOffset: Int,
        chapterProgress: Double,
        viewportWidth: Int,
        viewportHeight: Int,
        fontScale: Double
    ) {
        self.chapterOffset = chapterOffset
        self.chapterProgress = chapterProgress
        self.viewportWidth = viewportWidth
        self.viewportHeight = viewportHeight
        self.fontScale = fontScale
    }
}

public enum ReaderUIPlaybackDirective {
    public static let foregroundTimerArm = "timer.foreground.arm"
    public static let foregroundTimerCancel = "timer.foreground.cancel"
    public static let autoPageMinimumIntervalMs = 250
    public static let autoPageMaximumIntervalMs = 3_600_000
}

public struct ReaderUIPageLayout: Sendable, Equatable {
    public let anchor: String
    public let targetPageIndex: Int
    public let chapterIndex: Int
    public let chapterOffset: Int
    public let chapterProgress: Double
    public let viewportWidth: Int
    public let viewportHeight: Int
    public let fontScale: Double

    public init(
        anchor: String,
        targetPageIndex: Int,
        chapterIndex: Int,
        chapterOffset: Int,
        chapterProgress: Double,
        viewportWidth: Int,
        viewportHeight: Int,
        fontScale: Double
    ) {
        self.anchor = anchor
        self.targetPageIndex = targetPageIndex
        self.chapterIndex = chapterIndex
        self.chapterOffset = chapterOffset
        self.chapterProgress = chapterProgress
        self.viewportWidth = viewportWidth
        self.viewportHeight = viewportHeight
        self.fontScale = fontScale
    }
}

public struct ReaderUIPageTransaction: Sendable, Equatable {
    public var correlationId: String
    public var direction: String
    public var source: String
    public var contractEvent: String
    public var sessionCorrelationId: String?
    public var generation: Int?
    public var stage: String
    public var payload: ReaderUIJSONPayload
    public var layout: ReaderUIPageLayout?
}

public struct ReaderUITTSTransaction: Sendable, Equatable {
    public var correlationId: String
    public var event: String
    public var stage: String
    public var queueLoaded: Bool
    public var speechStarted: Bool
    public var payload: ReaderUIJSONPayload
}

public struct ReaderUIAutoPageTransaction: Sendable, Equatable {
    public var correlationId: String
    public var intervalMs: Int
    public var generation: Int
    public var tick: Int
    public var timerArmed: Bool
}

public struct ReaderUIAppearanceTransaction: Sendable, Equatable {
    public var event: String
    public var operation: String
    public var correlationId: String
    public var stage: String
    public var payload: ReaderUIJSONPayload
    public var fontRecord: ReaderUIJSONPayload?
    public var workingPreference: ReaderUIJSONPayload?
}

public func initialReaderUIAppearancePreference() -> ReaderUIJSONPayload {
    [
        "schemaVersion": 1,
        "revision": 0,
        "activeThemeId": .null,
        "themes": [],
        "typography": [
            "fontFamily": .null,
            "fontSize": 17,
            "lineHeight": 1.6,
            "paragraphSpacing": 8,
            "letterSpacing": 0,
            "textAlign": "start",
        ],
        "fonts": [],
    ]
}

public enum ReaderUIAppearanceDirective {
    public static let persistenceGet = "persistence.get"
    public static let persistencePut = "persistence.put"
    public static let fontRegisterFile = "font.registerFile"
    public static let fontUnregisterFile = "font.unregisterFile"
}

public struct ReaderUIState: Sendable, Equatable {
    public var routeId: String
    public var routeStack: [String]
    public var tab: String
    public var overlay: String?
    public var activeSession: String?
    public var loading: Bool
    public var reducedMotion: Bool
    public var readerPageIndex: Int
    public var readerCanonicalLocation: String?
    public var focusTarget: String?
    public var error: String?
    public var bookOpenTransaction: ReaderUIBookOpenTransaction?
    public var pageTransaction: ReaderUIPageTransaction?
    public var ttsTransaction: ReaderUITTSTransaction?
    public var autoPageTransaction: ReaderUIAutoPageTransaction?
    public var playbackGeneration: Int
    public var appearancePreference: ReaderUIJSONPayload
    public var appearanceTransaction: ReaderUIAppearanceTransaction?
    public var fontUnregisterRestartRequired: Bool
    public var appearanceReconcileRequired: Bool

    public init(
        routeId: String = "bookshelf",
        routeStack: [String] = [],
        tab: String = "bookshelf",
        overlay: String? = nil,
        activeSession: String? = nil,
        loading: Bool = false,
        reducedMotion: Bool = false,
        readerPageIndex: Int = 0,
        readerCanonicalLocation: String? = nil,
        focusTarget: String? = nil,
        error: String? = nil,
        bookOpenTransaction: ReaderUIBookOpenTransaction? = nil,
        pageTransaction: ReaderUIPageTransaction? = nil,
        ttsTransaction: ReaderUITTSTransaction? = nil,
        autoPageTransaction: ReaderUIAutoPageTransaction? = nil,
        playbackGeneration: Int = 0,
        appearancePreference: ReaderUIJSONPayload = initialReaderUIAppearancePreference(),
        appearanceTransaction: ReaderUIAppearanceTransaction? = nil,
        fontUnregisterRestartRequired: Bool = false,
        appearanceReconcileRequired: Bool = false
    ) {
        self.routeId = routeId
        self.routeStack = routeStack
        self.tab = tab
        self.overlay = overlay
        self.activeSession = activeSession
        self.loading = loading
        self.reducedMotion = reducedMotion
        self.readerPageIndex = readerPageIndex
        self.readerCanonicalLocation = readerCanonicalLocation
        self.focusTarget = focusTarget
        self.error = error
        self.bookOpenTransaction = bookOpenTransaction
        self.pageTransaction = pageTransaction
        self.ttsTransaction = ttsTransaction
        self.autoPageTransaction = autoPageTransaction
        self.playbackGeneration = playbackGeneration
        self.appearancePreference = appearancePreference
        self.appearanceTransaction = appearanceTransaction
        self.fontUnregisterRestartRequired = fontUnregisterRestartRequired
        self.appearanceReconcileRequired = appearanceReconcileRequired
    }
}

public struct ReaderUITransition: Sendable, Equatable {
    public let event: String
    public let previous: ReaderUIState
    public let state: ReaderUIState
    public let effects: [ReaderUIEffect]
    /// Correlation-scoped Core, speech or timer handles that the Host must
    /// invalidate before executing the returned effects.
    public let cancelledCorrelationIds: [String]

    public init(
        event: String,
        previous: ReaderUIState,
        state: ReaderUIState,
        effects: [ReaderUIEffect],
        cancelledCorrelationIds: [String] = []
    ) {
        self.event = event
        self.previous = previous
        self.state = state
        self.effects = effects
        self.cancelledCorrelationIds = cancelledCorrelationIds
    }
}

public struct ReaderUIAsyncTransition: Sendable, Equatable {
    public let accepted: Bool
    public let previous: ReaderUIState
    public let state: ReaderUIState
    public let effects: [ReaderUIEffect]

    public init(accepted: Bool, previous: ReaderUIState, state: ReaderUIState, effects: [ReaderUIEffect]) {
        self.accepted = accepted
        self.previous = previous
        self.state = state
        self.effects = effects
    }
}

public struct ReaderUIPlaybackTransition: Sendable, Equatable {
    public let accepted: Bool
    public let previous: ReaderUIState
    public let state: ReaderUIState
    public let effects: [ReaderUIEffect]
    public let cancelledCorrelationIds: [String]

    public init(
        accepted: Bool,
        previous: ReaderUIState,
        state: ReaderUIState,
        effects: [ReaderUIEffect] = [],
        cancelledCorrelationIds: [String] = []
    ) {
        self.accepted = accepted
        self.previous = previous
        self.state = state
        self.effects = effects
        self.cancelledCorrelationIds = cancelledCorrelationIds
    }
}

public struct ReaderUIRuntimeFailure: Error, Sendable, Equatable, LocalizedError {
    public let code: String
    public let message: String

    public init(code: String, message: String) {
        self.code = code
        self.message = message
    }

    public var errorDescription: String? { message }
}

/// Platform-neutral UI state machine generated from Reader-UI runtime actions.
///
/// Hosts render `state` with native UI, execute returned `effects`, then feed the
/// resulting Core/Host events back into their coordinator. No platform API is
/// referenced here, so the same transition semantics can ship to every host.
public final class ReaderUIRuntime {
    public private(set) var state: ReaderUIState

    public init(state: ReaderUIState = ReaderUIState()) {
        self.state = state
    }

    @discardableResult
    public func dispatch(
        event: String,
        payload: [String: String] = [:],
        correlationId: String? = nil
    ) throws -> ReaderUITransition {
        try dispatch(
            event: event,
            jsonPayload: .readerUIStrings(payload),
            correlationId: correlationId
        )
    }

    /// Lossless JSON entry point. The legacy string-map overload remains for
    /// source compatibility and delegates here without coercing result types.
    @discardableResult
    public func dispatch(
        event: String,
        jsonPayload: ReaderUIJSONPayload,
        correlationId: String? = nil
    ) throws -> ReaderUITransition {
        let payload = try jsonPayload.readerUIValidated()
        guard let descriptor = GeneratedRuntimeActions.byEvent[event] else {
            throw failure("UNSUPPORTED_EVENT", "No runtime action for \(event)")
        }
        if let contract = try validateReaderUITypedPayload(event: event, payload: payload) {
            let matches = descriptor.action == contract.descriptorAction
                && descriptor.value == contract.descriptorValue
                && descriptor.coreSequence == contract.descriptorCoreSequence
                && descriptor.hostRequest == contract.descriptorHostRequest
            if !matches {
                throw failure("INVALID_TYPED_CONTRACT", "\(event) mapping drifted from \(contract.dispatchTarget):\(contract.operation)")
            }
        }
        for field in descriptor.requiredPayload where requiredPayloadMissing(payload[field]) {
            throw failure("MISSING_PAYLOAD", "\(event) requires payload.\(field)")
        }
        try checkGuards(descriptor, event: event)
        if descriptor.action == "bookOpenSequence" {
            try preflightBookOpen(event: event, payload: payload, correlationId: correlationId, descriptor: descriptor)
        }
        if descriptor.action == "appearanceTransaction" {
            try preflightAppearance(event: event, payload: payload, correlationId: correlationId, descriptor: descriptor)
        }

        let previous = state
        if event == "reader.page.next" || event == "reader.page.prev" {
            return try beginPageStepTransition(
                direction: event == "reader.page.next" ? "next" : "previous",
                correlationId: correlationId,
                payload: payload,
                source: "manual",
                previous: previous,
                event: event
            )
        }
        if event == "reader.tts.start" {
            return try beginTTSTransition(correlationId: correlationId, payload: payload, previous: previous, event: event)
        }
        if event == "reader.tts.stop" {
            return stopTTSTransition(correlationId: correlationId, previous: previous, event: event)
        }
        if event == "reader.autoPage.start" {
            return try beginAutoPageTransition(correlationId: correlationId, payload: payload, previous: previous, event: event)
        }
        if event == "reader.autoPage.stop" {
            return stopAutoPageTransition(correlationId: correlationId, previous: previous, event: event)
        }

        var cancelledCorrelationIds: [String] = []
        var effects: [ReaderUIEffect] = []
        if event == "reader.exit" || event == "book.open" {
            let teardown = teardownAllPlayback()
            effects.append(contentsOf: teardown.effects)
            cancelledCorrelationIds.append(contentsOf: teardown.cancelledCorrelationIds)
        }
        switch descriptor.action {
        case "pushRoute":
            let routeId = descriptor.value ?? payload["routeId"]?.stringValue ?? payload["route"]?.stringValue
            guard let routeId, !routeId.isEmpty else {
                throw failure("MISSING_PAYLOAD", "\(event) requires a routeId")
            }
            state.routeStack.append(state.routeId)
            state.routeId = routeId
            state.overlay = nil
        case "replaceRoute":
            let routeId = descriptor.value ?? payload["routeId"]?.stringValue ?? payload["route"]?.stringValue
            guard let routeId, !routeId.isEmpty else {
                throw failure("MISSING_PAYLOAD", "\(event) requires a routeId")
            }
            state.routeId = routeId
            state.overlay = nil
        case "popRoute":
            if let routeId = state.routeStack.popLast() { state.routeId = routeId }
            state.overlay = nil
        case "popToRoot":
            state.routeId = state.tab
            state.routeStack.removeAll()
            state.overlay = nil
        case "selectTab":
            guard let tab = payload["tab"]?.stringValue, !tab.isEmpty else {
                throw failure("MISSING_PAYLOAD", "\(event) requires payload.tab")
            }
            state.tab = tab
            state.routeId = tab
            state.routeStack.removeAll()
        case "setOverlay":
            state.overlay = descriptor.value ?? payload["overlay"]?.stringValue
        case "clearOverlay":
            state.overlay = nil
        case "clearOverlayIfMatches":
            guard let expectedOverlay = descriptor.value ?? payload["overlay"]?.stringValue, !expectedOverlay.isEmpty else {
                throw failure("MISSING_PAYLOAD", "(event) requires an overlay identity")
            }
            if state.overlay == expectedOverlay { state.overlay = nil }
        case "startSession":
            state.activeSession = descriptor.value
            state.overlay = nil
        case "stopSession":
            state.activeSession = nil
        case "setReducedMotion":
            state.reducedMotion = descriptor.value == "true"
        case "bookOpenSequence":
            guard let correlationId, !correlationId.isEmpty else {
                throw failure("MISSING_CORRELATION", "\(event) requires correlationId")
            }
            guard let sourceKind = payload["sourceKind"]?.stringValue, sourceKind == "remote" || sourceKind == "local" else {
                throw failure("INVALID_SOURCE_KIND", "\(event) requires payload.sourceKind=remote|local")
            }
            let stages = descriptor.coreSequence
            let firstStage = sourceKind == "local" ? "chapter.list" : "source.detail"
            guard let firstStageIndex = stages.firstIndex(of: firstStage),
                  stages.contains("content.load"),
                  stages.contains("reader.location.resolve") else {
                throw failure("INVALID_TRANSACTION", "\(event) has an incomplete Core transaction")
            }
            if let active = state.bookOpenTransaction {
                guard active.correlationId != correlationId else {
                    throw failure("DUPLICATE_CORRELATION", "\(event) was already dispatched for \(correlationId)")
                }
                cancelledCorrelationIds.append(active.correlationId)
                restoreBookOpenStart(active)
            }
            let restoreRouteId = state.routeId
            let restoreRouteStack = state.routeStack
            let restoreOverlay = state.overlay
            state.routeStack.append(state.routeId)
            state.routeId = "immersive-reading"
            state.overlay = nil
            state.loading = true
            state.error = nil
            state.bookOpenTransaction = ReaderUIBookOpenTransaction(
                correlationId: correlationId,
                sourceKind: sourceKind,
                stages: stages,
                stageIndex: firstStageIndex,
                requestedChapterIndex: requestedChapterIndex(payload["chapterIndex"]),
                selectedChapterIndex: nil,
                awaitingLayout: false,
                payload: payload,
                restoreRouteId: restoreRouteId,
                restoreRouteStack: restoreRouteStack,
                restoreOverlay: restoreOverlay,
                layout: nil
            )
        case "readerPageStep":
            throw failure("INVALID_TRANSACTION", "\(event) must use the page transaction")
        case "appearanceTransaction":
            guard let correlationId, let operation = descriptor.value else {
                throw failure("INVALID_TRANSACTION", "\(event) requires an appearance operation and correlationId")
            }
            state.error = nil
            state.fontUnregisterRestartRequired = false
            state.appearanceTransaction = ReaderUIAppearanceTransaction(
                event: event,
                operation: operation,
                correlationId: correlationId,
                stage: operation == "font.register" ? "registering-font" : "loading",
                payload: payload,
                fontRecord: operation == "font.register" ? [
                    "id": payload["fontId"] ?? .string(""),
                    "path": payload["path"] ?? .string(""),
                    "familyName": payload["familyName"] ?? .string(""),
                    "fontNames": .array([payload["familyName"] ?? .string("")]),
                    "enabled": .bool(true),
                ] : nil,
                workingPreference: nil
            )
        case "emitEffects":
            break
        default:
            throw failure("UNSUPPORTED_ACTION", "Unsupported runtime action \(descriptor.action)")
        }

        if descriptor.action == "bookOpenSequence", let transaction = state.bookOpenTransaction {
            effects.append(bookOpenEffect(transaction))
        } else if descriptor.action == "appearanceTransaction", let transaction = state.appearanceTransaction {
            effects.append(try appearanceInitialEffect(transaction))
        } else {
            effects.append(contentsOf: descriptor.coreSequence.map {
                ReaderUIEffect(kind: .core, type: $0, jsonPayload: payload, correlationId: correlationId)
            })
        }
        if let hostRequest = descriptor.hostRequest {
            effects.append(
                ReaderUIEffect(kind: .host, type: hostRequest, jsonPayload: payload, correlationId: correlationId)
            )
        }
        return ReaderUITransition(
            event: event,
            previous: previous,
            state: state,
            effects: effects,
            cancelledCorrelationIds: cancelledCorrelationIds
        )
    }

    @discardableResult
    public func acceptAppearanceHostResult(
        hostType: String,
        correlationId: String,
        jsonResult: ReaderUIJSONResult = [:]
    ) throws -> ReaderUIAsyncTransition {
        let previous = state
        guard var transaction = state.appearanceTransaction,
              transaction.correlationId == correlationId else {
            return ReaderUIAsyncTransition(accepted: false, previous: previous, state: state, effects: [])
        }
        do {
        let result = try jsonResult.readerUIValidated()
        switch transaction.stage {
        case "registering-font":
            guard hostType == ReaderUIAppearanceDirective.fontRegisterFile else {
                return ReaderUIAsyncTransition(accepted: false, previous: previous, state: state, effects: [])
            }
            try validateReaderUITypedResult(event: transaction.event, effectType: hostType, result: result)
            try assertExactResultKeys(result, expected: ["registered", "path", "familyName", "fontNames"], type: hostType)
            guard result["registered"]?.boolValue == true,
                  let path = result["path"]?.stringValue, !path.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  let actualFamilyName = result["familyName"]?.stringValue,
                  !actualFamilyName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  case .array(let names)? = result["fontNames"], !names.isEmpty,
                  names.allSatisfy({ $0.stringValue?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false }),
                  let fontId = transaction.payload["fontId"]?.stringValue else {
                throw failure("INVALID_APPEARANCE_RESULT", "font.registerFile returned an invalid registration result")
            }
            transaction.fontRecord = [
                "id": .string(fontId),
                "path": .string(path),
                "familyName": .string(actualFamilyName),
                "fontNames": .array(names),
                "enabled": .bool(true),
            ]
            transaction.stage = "loading"
            state.appearanceTransaction = transaction
            return appearanceResult(true, previous: previous, effects: [appearanceLoadEffect(transaction)])
        case "loading":
            guard hostType == ReaderUIAppearanceDirective.persistenceGet else {
                return ReaderUIAsyncTransition(accepted: false, previous: previous, state: state, effects: [])
            }
            try validateReaderUITypedResult(event: transaction.event, effectType: hostType, result: result)
            let current = try decodeAppearanceLoadResult(result)
            if transaction.operation == "config.loadPersisted" {
                state.appearancePreference = current
                state.appearanceTransaction = nil
                state.error = nil
                state.appearanceReconcileRequired = false
                return appearanceResult(true, previous: previous)
            }
            let working = try applyAppearanceOperation(&transaction, current: current)
            transaction.workingPreference = working
            transaction.stage = "saving"
            state.appearanceTransaction = transaction
            return appearanceResult(
                true,
                previous: previous,
                effects: [try appearanceSaveEffect(transaction, expectedRevision: try appearanceRevision(current))]
            )
        case "saving":
            guard hostType == ReaderUIAppearanceDirective.persistencePut else {
                return ReaderUIAsyncTransition(accepted: false, previous: previous, state: state, effects: [])
            }
            try validateReaderUITypedResult(event: transaction.event, effectType: hostType, result: result)
            try assertExactResultKeys(result, expected: ["stored", "revision"], type: hostType)
            guard result["stored"]?.boolValue == true,
                  let working = transaction.workingPreference else {
                throw failure("INVALID_APPEARANCE_RESULT", "persistence.put did not store the preference")
            }
            let revision = try parseAppearanceRevision(result["revision"], path: "result.revision")
            let workingRevision = try appearanceRevision(working)
            guard revision == workingRevision else {
                throw failure("INVALID_APPEARANCE_RESULT", "persistence.put returned an unexpected revision")
            }
            state.appearancePreference = working
            state.appearanceReconcileRequired = false
            if transaction.operation == "font.unregister" {
                transaction.stage = "unregistering-font"
                state.appearanceTransaction = transaction
                return appearanceResult(true, previous: previous, effects: [try fontUnregisterEffect(transaction)])
            }
            state.appearanceTransaction = nil
            state.error = nil
            return appearanceResult(true, previous: previous)
        case "unregistering-font", "rolling-back-font":
            guard hostType == ReaderUIAppearanceDirective.fontUnregisterFile else {
                return ReaderUIAsyncTransition(accepted: false, previous: previous, state: state, effects: [])
            }
            try validateReaderUITypedResult(event: transaction.event, effectType: hostType, result: result)
            try assertExactResultKeys(
                result,
                expected: ["logicalUnregistered", "physicallyUnregistered", "restartRequired"],
                type: hostType
            )
            guard result["logicalUnregistered"]?.boolValue == true,
                  let physicallyUnregistered = result["physicallyUnregistered"]?.boolValue,
                  let restartRequired = result["restartRequired"]?.boolValue,
                  physicallyUnregistered || restartRequired else {
                throw failure("INVALID_APPEARANCE_RESULT", "font.unregisterFile must report logical unregister and restart requirements")
            }
            state.fontUnregisterRestartRequired = restartRequired
            state.appearanceTransaction = nil
            if transaction.stage == "unregistering-font" { state.error = nil }
            return appearanceResult(true, previous: previous)
        default:
            return ReaderUIAsyncTransition(accepted: false, previous: previous, state: state, effects: [])
        }
        } catch {
            return try terminateAppearanceError(previous: previous, transaction: transaction, error: error)
        }
    }

    @discardableResult
    public func failAppearanceHostResult(
        hostType: String,
        correlationId: String,
        code: String = "APPEARANCE_HOST_FAILED"
    ) throws -> ReaderUIAsyncTransition {
        let previous = state
        guard var transaction = state.appearanceTransaction,
              transaction.correlationId == correlationId else {
            return ReaderUIAsyncTransition(accepted: false, previous: previous, state: state, effects: [])
        }
        let expected: String
        switch transaction.stage {
        case "registering-font": expected = ReaderUIAppearanceDirective.fontRegisterFile
        case "loading": expected = ReaderUIAppearanceDirective.persistenceGet
        case "saving": expected = ReaderUIAppearanceDirective.persistencePut
        default: expected = ReaderUIAppearanceDirective.fontUnregisterFile
        }
        guard hostType == expected else {
            return ReaderUIAsyncTransition(accepted: false, previous: previous, state: state, effects: [])
        }
        return try terminateAppearanceError(
            previous: previous,
            transaction: transaction,
            error: failure(code.isEmpty ? "APPEARANCE_HOST_FAILED" : code, code.isEmpty ? "APPEARANCE_HOST_FAILED" : code)
        )
    }

    /// Accepts exactly the next normalized Core result for the active book-open
    /// transaction. Stale, duplicate and out-of-order callbacks are ignored.
    @discardableResult
    public func acceptBookOpenResult(
        coreType: String,
        correlationId: String,
        chapterCount: Int? = nil,
        canonicalLocation: String? = nil,
        pageIndex: Int? = nil,
        error: String? = nil
    ) -> ReaderUIAsyncTransition {
        let previous = state
        guard var transaction = state.bookOpenTransaction,
              transaction.correlationId == correlationId,
              !transaction.awaitingLayout,
              transaction.stage == coreType else {
            return ReaderUIAsyncTransition(accepted: false, previous: previous, state: state, effects: [])
        }
        if let error, !error.isEmpty {
            state.loading = false
            state.error = error
            state.bookOpenTransaction = nil
            return ReaderUIAsyncTransition(accepted: true, previous: previous, state: state, effects: [])
        }

        if coreType == "chapter.list" {
            guard let chapterCount, chapterCount > 0 else {
                state.loading = false
                state.error = "BOOK_OPEN_EMPTY_TOC"
                state.bookOpenTransaction = nil
                return ReaderUIAsyncTransition(accepted: true, previous: previous, state: state, effects: [])
            }
            transaction.selectedChapterIndex = min(transaction.requestedChapterIndex, chapterCount - 1)
        }

        if coreType == "content.load" {
            transaction.awaitingLayout = true
            state.bookOpenTransaction = transaction
            return ReaderUIAsyncTransition(accepted: true, previous: previous, state: state, effects: [])
        }

        if coreType == "reader.location.resolve" {
            guard let canonicalLocation,
                  !canonicalLocation.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  let pageIndex, pageIndex >= 0 else {
                state.loading = false
                state.error = "BOOK_OPEN_LOCATION_INVALID_RESULT"
                state.bookOpenTransaction = nil
                return ReaderUIAsyncTransition(accepted: true, previous: previous, state: state, effects: [])
            }
            state.readerCanonicalLocation = canonicalLocation
            state.readerPageIndex = pageIndex
        }

        let nextStageIndex = transaction.stageIndex + 1
        guard nextStageIndex < transaction.stages.count else {
            state.loading = false
            state.error = nil
            state.bookOpenTransaction = nil
            return ReaderUIAsyncTransition(accepted: true, previous: previous, state: state, effects: [])
        }
        transaction.stageIndex = nextStageIndex
        state.bookOpenTransaction = transaction
        return ReaderUIAsyncTransition(accepted: true, previous: previous, state: state, effects: [bookOpenEffect(transaction)])
    }

    /// Lossless JSON result entry point for new Host bridges. The primitive
    /// overload remains available during migration.
    @discardableResult
    public func acceptBookOpenJSONResult(
        coreType: String,
        correlationId: String,
        result: ReaderUIJSONResult
    ) throws -> ReaderUIAsyncTransition {
        guard let transaction = state.bookOpenTransaction,
              transaction.correlationId == correlationId,
              !transaction.awaitingLayout,
              transaction.stage == coreType else {
            return acceptBookOpenResult(coreType: coreType, correlationId: correlationId)
        }
        let result = try validatedJSONResult(result)
        _ = try validateReaderUITypedResult(event: "book.open", effectType: coreType, result: result)
        return acceptBookOpenResult(
            coreType: coreType,
            correlationId: correlationId,
            chapterCount: try optionalJSONResultInteger(result, key: "chapterCount"),
            canonicalLocation: try optionalJSONResultString(result, key: "canonicalLocation"),
            pageIndex: try optionalJSONResultInteger(result, key: "pageIndex"),
            error: try optionalJSONResultString(result, key: "error")
        )
    }

    /// Emits the location resolver only after a real native renderer has
    /// measured the loaded content. Invalid values fail closed without changing
    /// the active transaction.
    @discardableResult
    public func provideBookOpenLayout(
        correlationId: String,
        layout: ReaderUIBookOpenLayout
    ) throws -> ReaderUIAsyncTransition {
        let previous = state
        guard var transaction = state.bookOpenTransaction,
              transaction.correlationId == correlationId,
              transaction.awaitingLayout else {
            return ReaderUIAsyncTransition(accepted: false, previous: previous, state: state, effects: [])
        }
        guard layout.chapterOffset >= 0,
              layout.chapterProgress.isFinite,
              (0...1).contains(layout.chapterProgress),
              layout.viewportWidth > 0,
              layout.viewportHeight > 0,
              layout.fontScale.isFinite,
              layout.fontScale > 0 else {
            throw failure("INVALID_LAYOUT", "book.open requires valid measured layout")
        }
        guard let locationStageIndex = transaction.stages.firstIndex(of: "reader.location.resolve") else {
            throw failure("INVALID_TRANSACTION", "book.open has no reader.location.resolve stage")
        }
        transaction.stageIndex = locationStageIndex
        transaction.awaitingLayout = false
        transaction.layout = layout
        state.bookOpenTransaction = transaction
        return ReaderUIAsyncTransition(accepted: true, previous: previous, state: state, effects: [bookOpenEffect(transaction)])
    }

    /// Restores the pre-open route and invalidates all subsequent callbacks for
    /// this correlation. The Host cancels its Core/HTTP handle using the same id.
    @discardableResult
    public func cancelBookOpen(correlationId: String) -> ReaderUIAsyncTransition {
        let previous = state
        guard let transaction = state.bookOpenTransaction, transaction.correlationId == correlationId else {
            return ReaderUIAsyncTransition(accepted: false, previous: previous, state: state, effects: [])
        }
        restoreBookOpenStart(transaction)
        state.bookOpenTransaction = nil
        return ReaderUIAsyncTransition(accepted: true, previous: previous, state: state, effects: [])
    }

    @discardableResult
    public func beginPageStep(
        direction: String,
        correlationId: String,
        payload: [String: String] = [:]
    ) throws -> ReaderUITransition {
        try beginPageStep(
            direction: direction,
            correlationId: correlationId,
            jsonPayload: .readerUIStrings(payload)
        )
    }

    @discardableResult
    public func beginPageStep(
        direction: String,
        correlationId: String,
        jsonPayload: ReaderUIJSONPayload
    ) throws -> ReaderUITransition {
        try beginPageStepTransition(
            direction: direction,
            correlationId: correlationId,
            payload: try jsonPayload.readerUIValidated(),
            source: "manual",
            previous: state,
            event: "reader.page.explicit"
        )
    }

    @discardableResult
    public func providePageLayout(
        correlationId: String,
        layout: ReaderUIPageLayout
    ) throws -> ReaderUIPlaybackTransition {
        let previous = state
        guard var transaction = state.pageTransaction,
              transaction.correlationId == correlationId,
              transaction.stage == "awaiting-layout" else {
            return playbackResult(false, previous)
        }
        try validatePageLayout(layout)
        transaction.stage = "resolving-location"
        transaction.layout = layout
        state.pageTransaction = transaction
        return playbackResult(true, previous, effects: [pageLocationEffect(transaction)])
    }

    @discardableResult
    public func acceptPageLocationResult(
        correlationId: String,
        canonicalLocation: String? = nil,
        pageIndex: Int? = nil,
        error: String? = nil
    ) -> ReaderUIPlaybackTransition {
        let previous = state
        guard let transaction = state.pageTransaction,
              transaction.correlationId == correlationId,
              transaction.stage == "resolving-location" else {
            return playbackResult(false, previous)
        }
        state.pageTransaction = nil
        if let error, !error.isEmpty {
            state.error = error
            finishFailedAutoPage(transaction)
            return playbackResult(true, previous)
        }
        guard let canonicalLocation,
              !canonicalLocation.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              let pageIndex, pageIndex >= 0 else {
            state.error = "PAGE_LOCATION_INVALID_RESULT"
            finishFailedAutoPage(transaction)
            return playbackResult(true, previous)
        }
        state.readerCanonicalLocation = canonicalLocation
        state.readerPageIndex = pageIndex
        state.error = nil

        var effects: [ReaderUIEffect] = []
        if transaction.source == "auto-page",
           var autoPage = state.autoPageTransaction,
           autoPage.correlationId == transaction.sessionCorrelationId,
           autoPage.generation == transaction.generation,
           state.activeSession == "auto-page" {
            autoPage.timerArmed = true
            state.autoPageTransaction = autoPage
            effects.append(timerEffect(ReaderUIPlaybackDirective.foregroundTimerArm, autoPage))
        }
        return playbackResult(true, previous, effects: effects)
    }

    /// Lossless JSON result entry point for canonical location callbacks.
    @discardableResult
    public func acceptPageLocationJSONResult(
        correlationId: String,
        result: ReaderUIJSONResult
    ) throws -> ReaderUIPlaybackTransition {
        guard let transaction = state.pageTransaction,
              transaction.correlationId == correlationId,
              transaction.stage == "resolving-location" else {
            return acceptPageLocationResult(correlationId: correlationId)
        }
        let result = try validatedJSONResult(result)
        _ = try validateReaderUITypedResult(event: transaction.contractEvent, effectType: "reader.location.resolve", result: result)
        return acceptPageLocationResult(
            correlationId: correlationId,
            canonicalLocation: try optionalJSONResultString(result, key: "canonicalLocation"),
            pageIndex: try optionalJSONResultInteger(result, key: "pageIndex"),
            error: try optionalJSONResultString(result, key: "error")
        )
    }

    @discardableResult
    public func cancelPageStep(correlationId: String) -> ReaderUIPlaybackTransition {
        let previous = state
        guard state.pageTransaction?.correlationId == correlationId else {
            return playbackResult(false, previous)
        }
        state.pageTransaction = nil
        return playbackResult(true, previous, cancelledCorrelationIds: [correlationId])
    }

    @discardableResult
    public func acceptTTSCoreResult(
        coreType: String,
        correlationId: String,
        error: String? = nil
    ) -> ReaderUIPlaybackTransition {
        let previous = state
        guard var transaction = state.ttsTransaction,
              transaction.correlationId == correlationId else {
            return playbackResult(false, previous)
        }
        let expected = transaction.stage == "awaiting-plan"
            ? "tts.queue.plan"
            : transaction.stage == "awaiting-queue-start" ? "tts.queue.start" : nil
        guard expected == coreType else { return playbackResult(false, previous) }
        if let error, !error.isEmpty {
            let effects = ttsTeardownEffects(transaction)
            state.ttsTransaction = nil
            state.activeSession = nil
            state.error = error
            return playbackResult(true, previous, effects: effects, cancelledCorrelationIds: [correlationId])
        }
        if coreType == "tts.queue.plan" {
            transaction.stage = "awaiting-queue-start"
            state.ttsTransaction = transaction
            return playbackResult(true, previous, effects: [ttsCoreEffect("tts.queue.start", transaction)])
        }
        transaction.stage = "awaiting-speech-start"
        transaction.queueLoaded = true
        state.ttsTransaction = transaction
        return playbackResult(true, previous, effects: [ttsHostEffect("tts.system.start", transaction)])
    }

    /// Lossless JSON result entry point for Core TTS callbacks.
    @discardableResult
    public func acceptTTSCoreJSONResult(
        coreType: String,
        correlationId: String,
        result: ReaderUIJSONResult
    ) throws -> ReaderUIPlaybackTransition {
        guard let transaction = state.ttsTransaction,
              transaction.correlationId == correlationId else {
            return acceptTTSCoreResult(coreType: coreType, correlationId: correlationId)
        }
        let expected = transaction.stage == "awaiting-plan"
            ? "tts.queue.plan"
            : transaction.stage == "awaiting-queue-start" ? "tts.queue.start" : nil
        guard expected == coreType else {
            return acceptTTSCoreResult(coreType: coreType, correlationId: correlationId)
        }
        let result = try validatedJSONResult(result)
        _ = try validateReaderUITypedResult(event: transaction.event, effectType: coreType, result: result)
        return acceptTTSCoreResult(
            coreType: coreType,
            correlationId: correlationId,
            error: try optionalJSONResultString(result, key: "error")
        )
    }

    @discardableResult
    public func acceptTTSSystemStart(
        correlationId: String,
        error: String? = nil
    ) -> ReaderUIPlaybackTransition {
        let previous = state
        guard var transaction = state.ttsTransaction,
              transaction.correlationId == correlationId,
              transaction.stage == "awaiting-speech-start" else {
            return playbackResult(false, previous)
        }
        if let error, !error.isEmpty {
            let effects = ttsTeardownEffects(transaction, forceSystemStop: true)
            state.ttsTransaction = nil
            state.activeSession = nil
            state.error = error
            return playbackResult(true, previous, effects: effects, cancelledCorrelationIds: [correlationId])
        }
        transaction.stage = "playing"
        transaction.speechStarted = true
        state.ttsTransaction = transaction
        state.activeSession = "tts"
        state.error = nil
        return playbackResult(true, previous)
    }

    /// Lossless JSON result entry point for Host speech-start callbacks.
    @discardableResult
    public func acceptTTSSystemStartJSONResult(
        correlationId: String,
        result: ReaderUIJSONResult
    ) throws -> ReaderUIPlaybackTransition {
        guard let transaction = state.ttsTransaction,
              transaction.correlationId == correlationId,
              transaction.stage == "awaiting-speech-start" else {
            return acceptTTSSystemStart(correlationId: correlationId)
        }
        let result = try validatedJSONResult(result)
        _ = try validateReaderUITypedResult(event: transaction.event, effectType: "tts.system.start", result: result)
        return acceptTTSSystemStart(
            correlationId: correlationId,
            error: try optionalJSONResultString(result, key: "error")
        )
    }

    @discardableResult
    public func stopTTS(correlationId: String? = nil) -> ReaderUIPlaybackTransition {
        let previous = state
        guard let transaction = state.ttsTransaction,
              correlationId == nil || transaction.correlationId == correlationId else {
            return playbackResult(false, previous)
        }
        let effects = ttsTeardownEffects(transaction)
        state.ttsTransaction = nil
        state.activeSession = nil
        state.error = nil
        return playbackResult(
            true,
            previous,
            effects: effects,
            cancelledCorrelationIds: [transaction.correlationId]
        )
    }

    @discardableResult
    public func acceptAutoPageTimerFired(
        correlationId: String,
        generation: Int
    ) throws -> ReaderUIPlaybackTransition {
        let previous = state
        guard var transaction = state.autoPageTransaction,
              transaction.correlationId == correlationId,
              transaction.generation == generation,
              transaction.timerArmed,
              state.activeSession == "auto-page",
              state.pageTransaction == nil else {
            return playbackResult(false, previous)
        }
        transaction.timerArmed = false
        transaction.tick += 1
        state.autoPageTransaction = transaction
        let pageCorrelationId = "\(correlationId):page:\(generation):\(transaction.tick)"
        let page = try beginPageStepTransition(
            direction: "next",
            correlationId: pageCorrelationId,
            payload: [:],
            source: "auto-page",
            previous: previous,
            event: "reader.autoPage.timer",
            sessionCorrelationId: correlationId,
            generation: generation
        )
        return ReaderUIPlaybackTransition(
            accepted: true,
            previous: previous,
            state: page.state,
            effects: page.effects,
            cancelledCorrelationIds: page.cancelledCorrelationIds
        )
    }

    @discardableResult
    public func stopAutoPage(correlationId: String? = nil) -> ReaderUIPlaybackTransition {
        stopAutoPagePlayback(correlationId: correlationId, previous: state)
    }

    @discardableResult
    public func suspendAutoPageForBackground(correlationId: String? = nil) -> ReaderUIPlaybackTransition {
        stopAutoPagePlayback(correlationId: correlationId, previous: state)
    }

    @discardableResult
    public func completeAsync(error: String? = nil) -> ReaderUIState {
        state.loading = false
        state.error = error
        return state
    }

    private func beginPageStepTransition(
        direction: String,
        correlationId: String?,
        payload: ReaderUIJSONPayload,
        source: String,
        previous: ReaderUIState,
        event: String,
        sessionCorrelationId: String? = nil,
        generation: Int? = nil
    ) throws -> ReaderUITransition {
        try requireActiveReader(event)
        guard let correlationId, !correlationId.isEmpty else {
            throw failure("MISSING_CORRELATION", "\(event) requires correlationId")
        }
        guard ["next", "previous", "explicit"].contains(direction) else {
            throw failure("INVALID_PAGE_DIRECTION", "\(event) requires next|previous|explicit")
        }
        if state.pageTransaction?.correlationId == correlationId {
            throw failure("DUPLICATE_CORRELATION", "\(event) was already dispatched for \(correlationId)")
        }
        var cancelledCorrelationIds: [String] = []
        var effects: [ReaderUIEffect] = []
        if source == "manual", state.autoPageTransaction != nil {
            let teardown = stopAutoPagePlayback(correlationId: nil, previous: state)
            effects.append(contentsOf: teardown.effects)
            cancelledCorrelationIds.append(contentsOf: teardown.cancelledCorrelationIds)
        }
        if let active = state.pageTransaction {
            cancelledCorrelationIds.append(active.correlationId)
        }
        state.pageTransaction = ReaderUIPageTransaction(
            correlationId: correlationId,
            direction: direction,
            source: source,
            contractEvent: source == "auto-page" ? "reader.autoPage.start" : event,
            sessionCorrelationId: sessionCorrelationId,
            generation: generation,
            stage: "awaiting-layout",
            payload: payload,
            layout: nil
        )
        state.error = nil
        return ReaderUITransition(
            event: event,
            previous: previous,
            state: state,
            effects: effects,
            cancelledCorrelationIds: cancelledCorrelationIds
        )
    }

    private func beginTTSTransition(
        correlationId: String?,
        payload: ReaderUIJSONPayload,
        previous: ReaderUIState,
        event: String
    ) throws -> ReaderUITransition {
        try requireActiveReader(event)
        guard let correlationId, !correlationId.isEmpty else {
            throw failure("MISSING_CORRELATION", "\(event) requires correlationId")
        }
        guard !["text", "content", "chapterBody"].contains(where: { payload[$0] != nil }) else {
            throw failure("INVALID_TTS_PAYLOAD", "\(event) binds chapter content through Host DomainContext")
        }
        if state.ttsTransaction?.correlationId == correlationId {
            throw failure("DUPLICATE_CORRELATION", "\(event) was already dispatched for \(correlationId)")
        }
        var teardown = teardownPlaybackSession()
        let transaction = ReaderUITTSTransaction(
            correlationId: correlationId,
            event: event,
            stage: "awaiting-plan",
            queueLoaded: false,
            speechStarted: false,
            payload: payload
        )
        state.ttsTransaction = transaction
        state.activeSession = nil
        state.overlay = nil
        state.error = nil
        teardown.effects.append(ttsCoreEffect("tts.queue.plan", transaction))
        return ReaderUITransition(
            event: event,
            previous: previous,
            state: state,
            effects: teardown.effects,
            cancelledCorrelationIds: teardown.cancelledCorrelationIds
        )
    }

    private func stopTTSTransition(
        correlationId: String?,
        previous: ReaderUIState,
        event: String
    ) -> ReaderUITransition {
        guard let transaction = state.ttsTransaction,
              correlationId == nil || transaction.correlationId == correlationId else {
            return ReaderUITransition(event: event, previous: previous, state: state, effects: [])
        }
        let effects = ttsTeardownEffects(transaction)
        state.ttsTransaction = nil
        state.activeSession = nil
        state.error = nil
        return ReaderUITransition(
            event: event,
            previous: previous,
            state: state,
            effects: effects,
            cancelledCorrelationIds: [transaction.correlationId]
        )
    }

    private func beginAutoPageTransition(
        correlationId: String?,
        payload: ReaderUIJSONPayload,
        previous: ReaderUIState,
        event: String
    ) throws -> ReaderUITransition {
        try requireActiveReader(event)
        guard let correlationId, !correlationId.isEmpty else {
            throw failure("MISSING_CORRELATION", "\(event) requires correlationId")
        }
        guard let intervalMs = payload["intervalMs"]?.intValue,
              (ReaderUIPlaybackDirective.autoPageMinimumIntervalMs...ReaderUIPlaybackDirective.autoPageMaximumIntervalMs)
                .contains(intervalMs) else {
            throw failure(
                "INVALID_AUTO_PAGE_INTERVAL",
                "\(event) requires intervalMs=\(ReaderUIPlaybackDirective.autoPageMinimumIntervalMs)..\(ReaderUIPlaybackDirective.autoPageMaximumIntervalMs)"
            )
        }
        if state.autoPageTransaction?.correlationId == correlationId {
            throw failure("DUPLICATE_CORRELATION", "\(event) was already dispatched for \(correlationId)")
        }
        if state.pageTransaction != nil {
            throw failure("PAGE_TRANSACTION_PENDING", "\(event) waits for the active page transaction")
        }
        var teardown = teardownPlaybackSession()
        state.playbackGeneration += 1
        let transaction = ReaderUIAutoPageTransaction(
            correlationId: correlationId,
            intervalMs: intervalMs,
            generation: state.playbackGeneration,
            tick: 0,
            timerArmed: true
        )
        state.autoPageTransaction = transaction
        state.activeSession = "auto-page"
        state.overlay = nil
        state.error = nil
        teardown.effects.append(timerEffect(ReaderUIPlaybackDirective.foregroundTimerArm, transaction))
        return ReaderUITransition(
            event: event,
            previous: previous,
            state: state,
            effects: teardown.effects,
            cancelledCorrelationIds: teardown.cancelledCorrelationIds
        )
    }

    private func stopAutoPageTransition(
        correlationId: String?,
        previous: ReaderUIState,
        event: String
    ) -> ReaderUITransition {
        let result = stopAutoPagePlayback(correlationId: correlationId, previous: previous)
        return ReaderUITransition(
            event: event,
            previous: previous,
            state: result.state,
            effects: result.effects,
            cancelledCorrelationIds: result.cancelledCorrelationIds
        )
    }

    private func stopAutoPagePlayback(
        correlationId: String?,
        previous: ReaderUIState
    ) -> ReaderUIPlaybackTransition {
        guard let transaction = state.autoPageTransaction,
              correlationId == nil || transaction.correlationId == correlationId else {
            return playbackResult(false, previous)
        }
        var cancelledCorrelationIds = [transaction.correlationId]
        if let page = state.pageTransaction,
           page.source == "auto-page",
           page.sessionCorrelationId == transaction.correlationId {
            cancelledCorrelationIds.append(page.correlationId)
            state.pageTransaction = nil
        }
        let effects = [timerEffect(ReaderUIPlaybackDirective.foregroundTimerCancel, transaction)]
        state.playbackGeneration += 1
        state.autoPageTransaction = nil
        state.activeSession = nil
        state.error = nil
        return playbackResult(
            true,
            previous,
            effects: effects,
            cancelledCorrelationIds: cancelledCorrelationIds
        )
    }

    private func teardownPlaybackSession() -> (effects: [ReaderUIEffect], cancelledCorrelationIds: [String]) {
        var effects: [ReaderUIEffect] = []
        var cancelledCorrelationIds: [String] = []
        if let tts = state.ttsTransaction {
            cancelledCorrelationIds.append(tts.correlationId)
            effects.append(contentsOf: ttsTeardownEffects(tts))
            state.ttsTransaction = nil
        }
        if let autoPage = state.autoPageTransaction {
            cancelledCorrelationIds.append(autoPage.correlationId)
            effects.append(timerEffect(ReaderUIPlaybackDirective.foregroundTimerCancel, autoPage))
            if let page = state.pageTransaction,
               page.source == "auto-page",
               page.sessionCorrelationId == autoPage.correlationId {
                cancelledCorrelationIds.append(page.correlationId)
                state.pageTransaction = nil
            }
            state.playbackGeneration += 1
            state.autoPageTransaction = nil
        }
        state.activeSession = nil
        return (effects, cancelledCorrelationIds)
    }

    private func teardownAllPlayback() -> (effects: [ReaderUIEffect], cancelledCorrelationIds: [String]) {
        var teardown = teardownPlaybackSession()
        if let page = state.pageTransaction {
            teardown.cancelledCorrelationIds.append(page.correlationId)
            state.pageTransaction = nil
        }
        return teardown
    }

    private func ttsTeardownEffects(
        _ transaction: ReaderUITTSTransaction,
        forceSystemStop: Bool = false
    ) -> [ReaderUIEffect] {
        var effects: [ReaderUIEffect] = []
        if transaction.speechStarted || forceSystemStop {
            effects.append(ttsHostEffect("tts.system.stop", transaction))
        }
        if transaction.queueLoaded {
            effects.append(ttsCoreEffect("tts.queue.stop", transaction))
        }
        return effects
    }

    private func ttsCoreEffect(_ type: String, _ transaction: ReaderUITTSTransaction) -> ReaderUIEffect {
        ReaderUIEffect(
            kind: .core,
            type: type,
            jsonPayload: type == "tts.queue.plan" ? transaction.payload : [:],
            correlationId: transaction.correlationId
        )
    }

    private func ttsHostEffect(_ type: String, _ transaction: ReaderUITTSTransaction) -> ReaderUIEffect {
        ReaderUIEffect(kind: .host, type: type, jsonPayload: [:], correlationId: transaction.correlationId)
    }

    private func timerEffect(_ type: String, _ transaction: ReaderUIAutoPageTransaction) -> ReaderUIEffect {
        ReaderUIEffect(
            kind: .host,
            type: type,
            jsonPayload: [
                "timerId": .string(transaction.correlationId),
                "correlationId": .string(transaction.correlationId),
                "delayMs": .number(Double(transaction.intervalMs)),
                "generation": .number(Double(transaction.generation)),
                "oneShot": .bool(true),
                "foregroundOnly": .bool(true)
            ],
            correlationId: transaction.correlationId
        )
    }

    private func pageLocationEffect(_ transaction: ReaderUIPageTransaction) -> ReaderUIEffect {
        guard let layout = transaction.layout else {
            return ReaderUIEffect(kind: .core, type: "reader.location.resolve", jsonPayload: [:], correlationId: transaction.correlationId)
        }
        var payload = transaction.payload
        payload["direction"] = .string(transaction.direction)
        payload["anchor"] = .string(layout.anchor)
        payload["targetPageIndex"] = .number(Double(layout.targetPageIndex))
        payload["chapterIndex"] = .number(Double(layout.chapterIndex))
        payload["chapterOffset"] = .number(Double(layout.chapterOffset))
        payload["chapterProgress"] = .number(layout.chapterProgress)
        payload["viewportWidth"] = .number(Double(layout.viewportWidth))
        payload["viewportHeight"] = .number(Double(layout.viewportHeight))
        payload["fontScale"] = .number(layout.fontScale)
        return ReaderUIEffect(
            kind: .core,
            type: "reader.location.resolve",
            jsonPayload: payload,
            correlationId: transaction.correlationId
        )
    }

    private func validatePageLayout(_ layout: ReaderUIPageLayout) throws {
        guard !layout.anchor.isEmpty,
              layout.targetPageIndex >= 0,
              layout.chapterIndex >= 0,
              layout.chapterOffset >= 0,
              layout.chapterProgress.isFinite,
              (0...1).contains(layout.chapterProgress),
              layout.viewportWidth > 0,
              layout.viewportHeight > 0,
              layout.fontScale.isFinite,
              layout.fontScale > 0 else {
            throw failure("INVALID_PAGE_LAYOUT", "page transaction requires a real anchor and measured viewport")
        }
    }

    private func finishFailedAutoPage(_ pageTransaction: ReaderUIPageTransaction) {
        guard pageTransaction.source == "auto-page",
              let autoPage = state.autoPageTransaction,
              autoPage.correlationId == pageTransaction.sessionCorrelationId,
              autoPage.generation == pageTransaction.generation else { return }
        state.playbackGeneration += 1
        state.autoPageTransaction = nil
        state.activeSession = nil
    }

    private func requireActiveReader(_ event: String) throws {
        guard state.routeId == "immersive-reading" else {
            throw failure("READER_INACTIVE", "\(event) requires immersive-reading")
        }
    }

    private func preflightAppearance(
        event: String,
        payload: ReaderUIJSONPayload,
        correlationId: String?,
        descriptor: RuntimeActionDescriptor
    ) throws {
        guard let correlationId, !correlationId.isEmpty else {
            throw failure("MISSING_CORRELATION", "\(event) requires correlationId")
        }
        guard state.appearanceTransaction == nil else {
            throw failure("APPEARANCE_BUSY", "\(event) is blocked by an active appearance transaction")
        }
        let allowed = Set([
            "font.register", "font.unregister", "theme.create", "theme.update", "theme.delete",
            "typography.persist", "config.loadPersisted", "config.savePersisted",
        ])
        guard let operation = descriptor.value, allowed.contains(operation) else {
            throw failure("INVALID_TRANSACTION", "\(event) has an invalid appearance operation")
        }
        if operation == "font.register" {
            let lower = payload["path"]?.stringValue?.lowercased() ?? ""
            guard lower.hasSuffix(".ttf") || lower.hasSuffix(".otf") || lower.hasSuffix(".ttc") else {
                throw failure("INVALID_TYPED_PAYLOAD", "payload.path must identify a .ttf, .otf, or .ttc file")
            }
        }
        if operation == "config.savePersisted",
           case .object(let preference)? = payload["preference"] {
            _ = try validatedAppearancePreference(preference)
        }
    }

    private func appearanceInitialEffect(_ transaction: ReaderUIAppearanceTransaction) throws -> ReaderUIEffect {
        if transaction.stage == "registering-font" {
            guard let path = transaction.payload["path"], let familyName = transaction.payload["familyName"] else {
                throw failure("INVALID_TRANSACTION", "font.register is missing its typed fields")
            }
            return ReaderUIEffect(
                kind: .host,
                type: ReaderUIAppearanceDirective.fontRegisterFile,
                jsonPayload: ["path": path, "familyName": familyName],
                correlationId: transaction.correlationId
            )
        }
        return appearanceLoadEffect(transaction)
    }

    private func appearanceLoadEffect(_ transaction: ReaderUIAppearanceTransaction) -> ReaderUIEffect {
        ReaderUIEffect(
            kind: .host,
            type: ReaderUIAppearanceDirective.persistenceGet,
            jsonPayload: ["namespace": "reader-ui", "key": "appearance.v1"],
            correlationId: transaction.correlationId
        )
    }

    private func appearanceSaveEffect(
        _ transaction: ReaderUIAppearanceTransaction,
        expectedRevision: Int
    ) throws -> ReaderUIEffect {
        guard let working = transaction.workingPreference else {
            throw failure("INVALID_TRANSACTION", "appearance save requires a working preference")
        }
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        let data = try encoder.encode(ReaderUIJSONValue.object(working))
        guard let value = String(data: data, encoding: .utf8) else {
            throw failure("INVALID_APPEARANCE_PREFERENCE", "appearance preference did not encode as UTF-8 JSON")
        }
        return ReaderUIEffect(
            kind: .host,
            type: ReaderUIAppearanceDirective.persistencePut,
            jsonPayload: [
                "namespace": "reader-ui",
                "key": "appearance.v1",
                "value": .string(value),
                "expectedRevision": .string(String(expectedRevision)),
            ],
            correlationId: transaction.correlationId
        )
    }

    private func fontUnregisterEffect(_ transaction: ReaderUIAppearanceTransaction) throws -> ReaderUIEffect {
        guard let record = transaction.fontRecord,
              let path = record["path"], let familyName = record["familyName"] else {
            throw failure("INVALID_TRANSACTION", "font unregister requires a persisted font record")
        }
        return ReaderUIEffect(
            kind: .host,
            type: ReaderUIAppearanceDirective.fontUnregisterFile,
            jsonPayload: ["path": path, "familyName": familyName],
            correlationId: transaction.correlationId
        )
    }

    private func decodeAppearanceLoadResult(_ result: ReaderUIJSONResult) throws -> ReaderUIJSONPayload {
        if result["found"]?.boolValue == false {
            try assertExactResultKeys(result, expected: ["found"], type: ReaderUIAppearanceDirective.persistenceGet)
            return initialReaderUIAppearancePreference()
        }
        try assertExactResultKeys(
            result,
            expected: ["found", "value", "revision"],
            type: ReaderUIAppearanceDirective.persistenceGet
        )
        guard result["found"]?.boolValue == true,
              let value = result["value"]?.stringValue,
              let data = value.data(using: .utf8) else {
            throw failure("INVALID_APPEARANCE_RESULT", "persistence.get returned an invalid value result")
        }
        let revision = try parseAppearanceRevision(result["revision"], path: "result.revision")
        let decoded: ReaderUIJSONValue
        do { decoded = try JSONDecoder().decode(ReaderUIJSONValue.self, from: data) }
        catch { throw failure("INVALID_APPEARANCE_PREFERENCE", "persisted appearance JSON is malformed") }
        guard case .object(let object) = decoded else {
            throw failure("INVALID_APPEARANCE_PREFERENCE", "persisted appearance must be a JSON object")
        }
        let preference = try validatedAppearancePreference(object)
        guard try appearanceRevision(preference) == revision else {
            throw failure("INVALID_APPEARANCE_PREFERENCE", "persisted appearance revision does not match Host revision")
        }
        return preference
    }

    private func applyAppearanceOperation(
        _ transaction: inout ReaderUIAppearanceTransaction,
        current: ReaderUIJSONPayload
    ) throws -> ReaderUIJSONPayload {
        var working = current
        switch transaction.operation {
        case "font.register":
            guard case .array(var fonts)? = working["fonts"],
                  let fontId = transaction.payload["fontId"]?.stringValue,
                  let record = transaction.fontRecord else {
                throw failure("INVALID_TRANSACTION", "font.register is missing its Host registration result")
            }
            if fonts.contains(where: { value in
                guard case .object(let font) = value else { return false }
                return font["id"]?.stringValue == fontId
            }) { throw failure("APPEARANCE_CONFLICT", "font \(fontId) already exists") }
            fonts.append(.object(record))
            working["fonts"] = .array(fonts)
        case "font.unregister":
            guard case .array(var fonts)? = working["fonts"],
                  let fontId = transaction.payload["fontId"]?.stringValue,
                  let index = fonts.firstIndex(where: { value in
                      guard case .object(let font) = value else { return false }
                      return font["id"]?.stringValue == fontId
                  }), case .object(let record) = fonts[index] else {
                throw failure("APPEARANCE_NOT_FOUND", "font does not exist")
            }
            transaction.fontRecord = record
            fonts.remove(at: index)
            working["fonts"] = .array(fonts)
            if case .object(var typography)? = working["typography"],
               typography["fontFamily"]?.stringValue == record["familyName"]?.stringValue {
                typography["fontFamily"] = .null
                working["typography"] = .object(typography)
            }
        case "theme.create":
            guard case .array(var themes)? = working["themes"],
                  case .object(let theme)? = transaction.payload["theme"],
                  let themeId = theme["id"]?.stringValue else {
                throw failure("INVALID_TRANSACTION", "theme.create is missing its typed theme")
            }
            if themes.contains(where: { value in
                guard case .object(let stored) = value else { return false }
                return stored["id"]?.stringValue == themeId
            }) { throw failure("APPEARANCE_CONFLICT", "theme \(themeId) already exists") }
            themes.append(.object(theme))
            working["themes"] = .array(themes)
            if working["activeThemeId"] == .null { working["activeThemeId"] = .string(themeId) }
        case "theme.update":
            guard case .array(var themes)? = working["themes"],
                  case .object(let theme)? = transaction.payload["theme"],
                  let themeId = theme["id"]?.stringValue,
                  let index = themes.firstIndex(where: { value in
                      guard case .object(let stored) = value else { return false }
                      return stored["id"]?.stringValue == themeId
                  }) else { throw failure("APPEARANCE_NOT_FOUND", "theme does not exist") }
            themes[index] = .object(theme)
            working["themes"] = .array(themes)
        case "theme.delete":
            guard case .array(var themes)? = working["themes"],
                  let themeId = transaction.payload["themeId"]?.stringValue,
                  let index = themes.firstIndex(where: { value in
                      guard case .object(let stored) = value else { return false }
                      return stored["id"]?.stringValue == themeId
                  }) else { throw failure("APPEARANCE_NOT_FOUND", "theme does not exist") }
            themes.remove(at: index)
            working["themes"] = .array(themes)
            if working["activeThemeId"]?.stringValue == themeId {
                if let first = themes.first, case .object(let theme) = first, let firstId = theme["id"] {
                    working["activeThemeId"] = firstId
                } else {
                    working["activeThemeId"] = .null
                }
            }
        case "typography.persist":
            guard let typography = transaction.payload["typography"] else {
                throw failure("INVALID_TRANSACTION", "typography.persist is missing its typed value")
            }
            working["typography"] = typography
        case "config.savePersisted":
            guard case .object(let requested)? = transaction.payload["preference"] else {
                throw failure("INVALID_TRANSACTION", "config.savePersisted is missing its typed preference")
            }
            let target = try validatedAppearancePreference(requested)
            guard try appearanceRevision(target) == appearanceRevision(current) else {
                throw failure("APPEARANCE_CONFLICT", "config.savePersisted revision is stale")
            }
            working = target
        default:
            throw failure("INVALID_TRANSACTION", "Unsupported appearance operation \(transaction.operation)")
        }
        working["schemaVersion"] = 1
        working["revision"] = .number(Double(try appearanceRevision(current) + 1))
        return try validatedAppearancePreference(working)
    }

    private func validatedAppearancePreference(_ preference: ReaderUIJSONPayload) throws -> ReaderUIJSONPayload {
        let validated: ReaderUIJSONPayload
        do {
            validated = try preference.readerUIValidated()
            _ = try validateReaderUITypedPayload(
                event: "reader.config.persist",
                payload: ["preference": .object(validated)]
            )
        } catch {
            throw failure("INVALID_APPEARANCE_PREFERENCE", String(describing: error))
        }
        guard case .array(let themes)? = validated["themes"],
              case .array(let fonts)? = validated["fonts"] else {
            throw failure("INVALID_APPEARANCE_PREFERENCE", "themes and fonts must be arrays")
        }
        let themeIds = themes.compactMap { value -> String? in
            guard case .object(let theme) = value else { return nil }
            return theme["id"]?.stringValue
        }
        let fontIds = fonts.compactMap { value -> String? in
            guard case .object(let font) = value else { return nil }
            return font["id"]?.stringValue
        }
        guard Set(themeIds).count == themeIds.count, Set(fontIds).count == fontIds.count else {
            throw failure("INVALID_APPEARANCE_PREFERENCE", "appearance preference contains duplicate ids")
        }
        if let active = validated["activeThemeId"]?.stringValue, !themeIds.contains(active) {
            throw failure("INVALID_APPEARANCE_PREFERENCE", "activeThemeId does not reference a stored theme")
        }
        return validated
    }

    private func appearanceRevision(_ preference: ReaderUIJSONPayload) throws -> Int {
        guard let revision = preference["revision"]?.intValue, revision >= 0 else {
            throw failure("INVALID_APPEARANCE_PREFERENCE", "appearance revision must be a non-negative integer")
        }
        return revision
    }

    private func parseAppearanceRevision(_ value: ReaderUIJSONValue?, path: String) throws -> Int {
        guard let string = value?.stringValue, !string.isEmpty,
              string.allSatisfy(\.isNumber), string == "0" || !string.hasPrefix("0"),
              let revision = Int(string), revision >= 0 else {
            throw failure("INVALID_APPEARANCE_RESULT", "\(path) must be a non-negative decimal revision string")
        }
        return revision
    }

    private func assertExactResultKeys(
        _ result: ReaderUIJSONResult,
        expected: Set<String>,
        type: String
    ) throws {
        guard Set(result.keys) == expected else {
            throw failure("INVALID_APPEARANCE_RESULT", "\(type) result has missing or unknown fields")
        }
    }

    private func terminateAppearanceError(
        previous: ReaderUIState,
        transaction input: ReaderUIAppearanceTransaction,
        error: Error
    ) throws -> ReaderUIAsyncTransition {
        var transaction = input
        let code = (error as? ReaderUIRuntimeFailure)?.code ?? "APPEARANCE_HOST_FAILED"
        state.error = code
        if transaction.stage == "saving" { state.appearanceReconcileRequired = true }
        if transaction.operation == "font.register", transaction.fontRecord != nil,
           transaction.stage == "registering-font" || transaction.stage == "loading" || transaction.stage == "saving" {
            transaction.stage = "rolling-back-font"
            state.appearanceTransaction = transaction
            return appearanceResult(true, previous: previous, effects: [try fontUnregisterEffect(transaction)])
        }
        if transaction.stage == "unregistering-font" || transaction.stage == "rolling-back-font" ||
           (transaction.operation == "font.unregister" && transaction.stage == "saving") {
            state.fontUnregisterRestartRequired = true
        }
        state.appearanceTransaction = nil
        return appearanceResult(true, previous: previous)
    }

    private func appearanceResult(
        _ accepted: Bool,
        previous: ReaderUIState,
        effects: [ReaderUIEffect] = []
    ) -> ReaderUIAsyncTransition {
        ReaderUIAsyncTransition(accepted: accepted, previous: previous, state: state, effects: effects)
    }

    private func preflightBookOpen(
        event: String,
        payload: ReaderUIJSONPayload,
        correlationId: String?,
        descriptor: RuntimeActionDescriptor
    ) throws {
        guard let correlationId, !correlationId.isEmpty else {
            throw failure("MISSING_CORRELATION", "\(event) requires correlationId")
        }
        guard let sourceKind = payload["sourceKind"]?.stringValue, sourceKind == "remote" || sourceKind == "local" else {
            throw failure("INVALID_SOURCE_KIND", "\(event) requires payload.sourceKind=remote|local")
        }
        let firstStage = sourceKind == "local" ? "chapter.list" : "source.detail"
        guard descriptor.coreSequence.contains(firstStage),
              descriptor.coreSequence.contains("content.load"),
              descriptor.coreSequence.contains("reader.location.resolve") else {
            throw failure("INVALID_TRANSACTION", "\(event) has an incomplete Core transaction")
        }
        if state.bookOpenTransaction?.correlationId == correlationId {
            throw failure("DUPLICATE_CORRELATION", "\(event) was already dispatched for \(correlationId)")
        }
    }

    private func playbackResult(
        _ accepted: Bool,
        _ previous: ReaderUIState,
        effects: [ReaderUIEffect] = [],
        cancelledCorrelationIds: [String] = []
    ) -> ReaderUIPlaybackTransition {
        ReaderUIPlaybackTransition(
            accepted: accepted,
            previous: previous,
            state: state,
            effects: effects,
            cancelledCorrelationIds: cancelledCorrelationIds
        )
    }

    private func bookOpenEffect(_ transaction: ReaderUIBookOpenTransaction) -> ReaderUIEffect {
        ReaderUIEffect(
            kind: .core,
            type: transaction.stage,
            jsonPayload: bookOpenEffectPayload(transaction),
            correlationId: transaction.correlationId
        )
    }

    private func bookOpenEffectPayload(_ transaction: ReaderUIBookOpenTransaction) -> ReaderUIJSONPayload {
        var payload = transaction.payload
        payload["sourceKind"] = .string(transaction.sourceKind)
        payload["chapterIndex"] = .number(Double(transaction.selectedChapterIndex ?? transaction.requestedChapterIndex))
        if let layout = transaction.layout {
            payload["chapterOffset"] = .number(Double(layout.chapterOffset))
            payload["chapterProgress"] = .number(layout.chapterProgress)
            payload["viewportWidth"] = .number(Double(layout.viewportWidth))
            payload["viewportHeight"] = .number(Double(layout.viewportHeight))
            payload["fontScale"] = .number(layout.fontScale)
        }
        return payload
    }

    private func restoreBookOpenStart(_ transaction: ReaderUIBookOpenTransaction) {
        state.routeId = transaction.restoreRouteId
        state.routeStack = transaction.restoreRouteStack
        state.overlay = transaction.restoreOverlay
        state.loading = false
        state.error = nil
    }

    private func requestedChapterIndex(_ value: ReaderUIJSONValue?) -> Int {
        max(0, value?.intValue ?? 0)
    }

    private func requiredPayloadMissing(_ value: ReaderUIJSONValue?) -> Bool {
        guard let value else { return true }
        if value == .null { return true }
        return value.stringValue == ""
    }

    private func validatedJSONResult(_ result: ReaderUIJSONResult) throws -> ReaderUIJSONResult {
        do {
            return try result.reduce(into: [:]) { validated, pair in
                validated[pair.key] = try pair.value.validated(path: "result.\(pair.key)")
            }
        } catch let error as ReaderUIRuntimeFailure where error.code == "INVALID_JSON_PAYLOAD" {
            throw failure("INVALID_JSON_RESULT", error.message)
        }
    }

    private func optionalJSONResultString(_ result: ReaderUIJSONResult, key: String) throws -> String? {
        guard let value = result[key], value != .null else { return nil }
        guard let string = value.stringValue else {
            throw failure("INVALID_JSON_RESULT", "result.\(key) must be a JSON string or null")
        }
        return string
    }

    private func optionalJSONResultInteger(_ result: ReaderUIJSONResult, key: String) throws -> Int? {
        guard let value = result[key], value != .null else { return nil }
        guard let integer = value.intValue else {
            throw failure("INVALID_JSON_RESULT", "result.\(key) must be an integer JSON number or numeric string")
        }
        return integer
    }

    private func checkGuards(_ descriptor: RuntimeActionDescriptor, event: String) throws {
        for guardName in descriptor.guards {
            if guardName == "loadingFalse", state.loading {
                throw failure("ASYNC_GUARD", "\(event) is blocked while loading")
            }
            if guardName == "overlayEmpty", state.overlay != nil {
                throw failure("OVERLAY_GUARD", "\(event) is blocked while overlay is open")
            }
        }
    }

    private func failure(_ code: String, _ message: String) -> ReaderUIRuntimeFailure {
        ReaderUIRuntimeFailure(code: code, message: message)
    }
}
