package io.reader.ui.runtime

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull

/** Canonical recursive JSON representation shared with generated contracts. */
typealias ReaderUIJSONValue = JsonElement
typealias ReaderUIJSONPayload = Map<String, JsonElement>
typealias ReaderUIJSONResult = ReaderUIJSONPayload

data class ReaderUITypedResultContract(
    val effectKind: String,
    val schema: ReaderUIJSONValue
)

data class ReaderUITypedPayloadContract(
    val dispatchTarget: String,
    val operation: String,
    val descriptorAction: String,
    val descriptorValue: String?,
    val descriptorCoreSequence: List<String>,
    val descriptorHostRequest: String?,
    val schema: ReaderUIJSONValue,
    val resultSchemas: Map<String, ReaderUITypedResultContract>
)

private val readerUIJSONNumberPattern = Regex("-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?")

fun cloneReaderUIJSONValue(value: ReaderUIJSONValue, path: String = "$"): ReaderUIJSONValue = when (value) {
    JsonNull -> JsonNull
    is JsonObject -> JsonObject(value.mapValues { (key, item) ->
        cloneReaderUIJSONValue(item, "$path.$key")
    })
    is JsonArray -> JsonArray(value.mapIndexed { index, item ->
        cloneReaderUIJSONValue(item, "$path[$index]")
    })
    is JsonPrimitive -> {
        if (!value.isString && value.booleanOrNull == null && !readerUIJSONNumberPattern.matches(value.content)) {
            throw ReaderUIRuntimeException("INVALID_JSON_PAYLOAD", "$path contains an invalid JSON scalar")
        }
        value
    }
}

fun cloneReaderUIJSONPayload(payload: ReaderUIJSONPayload): ReaderUIJSONPayload =
    JsonObject(payload.mapValues { (key, value) -> cloneReaderUIJSONValue(value, "payload.$key") })

fun ReaderUIJSONPayload.legacyStringPayloadOrNull(): Map<String, String>? {
    if (values.any { it !is JsonPrimitive || !it.isString }) return null
    return mapValues { (_, value) -> (value as JsonPrimitive).content }
}

private fun legacyJSONPayload(payload: Map<String, String>): ReaderUIJSONPayload =
    JsonObject(payload.mapValues { JsonPrimitive(it.value) })

private fun ReaderUIJSONPayload.stringValue(key: String): String? =
    (this[key] as? JsonPrimitive)?.takeIf { it.isString }?.content

private fun jsonInt(value: ReaderUIJSONValue?): Int? {
    val primitive = value as? JsonPrimitive ?: return null
    return primitive.intOrNull ?: primitive.takeIf { it.isString }?.contentOrNull?.toIntOrNull()
}

private fun cloneReaderUIJSONResult(result: ReaderUIJSONResult): ReaderUIJSONResult = try {
    JsonObject(result.mapValues { (key, value) -> cloneReaderUIJSONValue(value, "result.$key") })
} catch (error: ReaderUIRuntimeException) {
    if (error.code == "INVALID_JSON_PAYLOAD") {
        throw ReaderUIRuntimeException("INVALID_JSON_RESULT", error.message ?: "result contains an invalid JSON value")
    }
    throw error
}

private fun ReaderUIJSONResult.optionalResultString(key: String): String? {
    val value = this[key]
    if (value == null || value === JsonNull) return null
    return (value as? JsonPrimitive)?.takeIf { it.isString }?.content
        ?: throw ReaderUIRuntimeException("INVALID_JSON_RESULT", "result.$key must be a JSON string or null")
}

private fun ReaderUIJSONResult.optionalResultInt(key: String): Int? {
    val value = this[key]
    if (value == null || value === JsonNull) return null
    return jsonInt(value)
        ?: throw ReaderUIRuntimeException(
            "INVALID_JSON_RESULT",
            "result.$key must be an integer JSON number or numeric string"
        )
}

private fun ReaderUIJSONResult.optionalResultBoolean(key: String): Boolean? {
    val value = this[key]
    if (value == null || value === JsonNull) return null
    return (value as? JsonPrimitive)?.takeIf { !it.isString }?.booleanOrNull
        ?: throw ReaderUIRuntimeException("INVALID_JSON_RESULT", "result.$key must be a JSON boolean or null")
}

enum class ReaderUIEffectKind { CORE, HOST }

private data class ReaderUILegacyPayloadProjection(
    val payload: Map<String, String>,
    val isComplete: Boolean
)

private fun ReaderUIJSONPayload.legacyScalarProjection(): ReaderUILegacyPayloadProjection {
    val projected = mutableMapOf<String, String>()
    var isComplete = true
    forEach { (key, value) ->
        when (value) {
            JsonNull, is JsonObject, is JsonArray -> isComplete = false
            is JsonPrimitive -> projected[key] = value.content
        }
    }
    return ReaderUILegacyPayloadProjection(projected, isComplete)
}

data class ReaderUIEffect(
    val kind: ReaderUIEffectKind,
    val type: String,
    @Deprecated("Use jsonPayload; payload is a scalar-only compatibility projection")
    val payload: Map<String, String>,
    val correlationId: String? = null,
    val jsonPayload: ReaderUIJSONPayload = legacyJSONPayload(payload),
    val legacyPayloadIsComplete: Boolean = true
) {
    /** Null when an object, array or null had to be omitted. */
    val legacyStringPayload: Map<String, String>?
        get() = payload.takeIf { legacyPayloadIsComplete }
}

private fun readerUIEffect(
    kind: ReaderUIEffectKind,
    type: String,
    jsonPayload: ReaderUIJSONPayload,
    correlationId: String? = null
): ReaderUIEffect {
    val canonical = cloneReaderUIJSONPayload(jsonPayload)
    val projection = canonical.legacyScalarProjection()
    return ReaderUIEffect(
        kind = kind,
        type = type,
        payload = projection.payload,
        correlationId = correlationId,
        jsonPayload = canonical,
        legacyPayloadIsComplete = projection.isComplete
    )
}

/** Runtime-owned ledger; typed Core DTOs remain in the Host bridge. */
data class ReaderUIBookOpenLayout(
    val chapterOffset: Int,
    val chapterProgress: Double,
    val viewportWidth: Int,
    val viewportHeight: Int,
    val fontScale: Double
)

data class ReaderUIBookOpenTransaction(
    val correlationId: String,
    val sourceKind: String,
    val stages: List<String>,
    val stageIndex: Int,
    val requestedChapterIndex: Int,
    val selectedChapterIndex: Int? = null,
    val awaitingLayout: Boolean = false,
    val payload: ReaderUIJSONPayload,
    val restoreRouteId: String,
    val restoreRouteStack: List<String>,
    val restoreOverlay: String?,
    val layout: ReaderUIBookOpenLayout? = null
) {
    val stage: String get() = stages[stageIndex]
}

object ReaderUIPlaybackDirective {
    const val FOREGROUND_TIMER_ARM = "timer.foreground.arm"
    const val FOREGROUND_TIMER_CANCEL = "timer.foreground.cancel"
    const val AUTO_PAGE_MINIMUM_INTERVAL_MS = 250
    const val AUTO_PAGE_MAXIMUM_INTERVAL_MS = 3_600_000
}

private val readerIdentityOrRouteMutationEvents = setOf(
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
)

private val readerControlOverlayFamily = setOf(
    "reader-control",
    "directory",
    "tts",
    "appearance",
    "settings"
)

data class ReaderUIPageLayout(
    val anchor: String,
    val targetPageIndex: Int,
    val chapterIndex: Int,
    val chapterOffset: Int,
    val chapterProgress: Double,
    val viewportWidth: Int,
    val viewportHeight: Int,
    val fontScale: Double
)

data class ReaderUIPageTransaction(
    val correlationId: String,
    val direction: String,
    val source: String,
    val contractEvent: String,
    val sessionCorrelationId: String? = null,
    val generation: Int? = null,
    val stage: String = "awaiting-layout",
    val payload: ReaderUIJSONPayload = emptyMap(),
    val layout: ReaderUIPageLayout? = null,
    val pendingCanonicalLocation: String? = null,
    val pendingPageIndex: Int? = null
)

data class ReaderUITTSTransaction(
    val correlationId: String,
    val event: String,
    val stage: String = "awaiting-plan",
    val queueLoaded: Boolean = false,
    val speechStarted: Boolean = false,
    val payload: ReaderUIJSONPayload = emptyMap()
)

data class ReaderUIAutoPageTransaction(
    val correlationId: String,
    val intervalMs: Int,
    val generation: Int,
    val tick: Int = 0,
    val timerArmed: Boolean = true
)

data class ReaderUIAppearanceTransaction(
    val event: String,
    val operation: String,
    val correlationId: String,
    val stage: String,
    val payload: ReaderUIJSONPayload,
    val fontRecord: ReaderUIJSONPayload? = null,
    val workingPreference: ReaderUIJSONPayload? = null
)

fun initialReaderUIAppearancePreference(): ReaderUIJSONPayload = JsonObject(
    mapOf(
        "schemaVersion" to JsonPrimitive(1),
        "revision" to JsonPrimitive(0),
        "activeThemeId" to JsonNull,
        "themes" to JsonArray(emptyList()),
        "typography" to JsonObject(
            mapOf(
                "fontFamily" to JsonNull,
                "fontSize" to JsonPrimitive(17),
                "lineHeight" to JsonPrimitive(1.6),
                "paragraphSpacing" to JsonPrimitive(8),
                "letterSpacing" to JsonPrimitive(0),
                "textAlign" to JsonPrimitive("start")
            )
        ),
        "fonts" to JsonArray(emptyList())
    )
)

object ReaderUIAppearanceDirective {
    const val PERSISTENCE_GET = "persistence.get"
    const val PERSISTENCE_PUT = "persistence.put"
    const val FONT_REGISTER_FILE = "font.registerFile"
    const val FONT_UNREGISTER_FILE = "font.unregisterFile"
}

data class ReaderUIState(
    val routeId: String = "bookshelf",
    val routeStack: List<String> = emptyList(),
    val tab: String = "bookshelf",
    val overlay: String? = null,
    val activeSession: String? = null,
    val loading: Boolean = false,
    val reducedMotion: Boolean = false,
    val readerPageIndex: Int = 0,
    val readerCanonicalLocation: String? = null,
    val focusTarget: String? = null,
    val error: String? = null,
    val bookOpenTransaction: ReaderUIBookOpenTransaction? = null,
    val pageTransaction: ReaderUIPageTransaction? = null,
    val ttsTransaction: ReaderUITTSTransaction? = null,
    val autoPageTransaction: ReaderUIAutoPageTransaction? = null,
    val playbackGeneration: Int = 0,
    val appearancePreference: ReaderUIJSONPayload = initialReaderUIAppearancePreference(),
    val appearanceTransaction: ReaderUIAppearanceTransaction? = null,
    val fontUnregisterRestartRequired: Boolean = false,
    val appearanceReconcileRequired: Boolean = false
)

data class ReaderUITransition(
    val event: String,
    val previous: ReaderUIState,
    val state: ReaderUIState,
    val effects: List<ReaderUIEffect>,
    val cancelledCorrelationIds: List<String> = emptyList()
)

data class ReaderUIAsyncTransition(
    val accepted: Boolean,
    val previous: ReaderUIState,
    val state: ReaderUIState,
    val effects: List<ReaderUIEffect>
)

data class ReaderUIPlaybackTransition(
    val accepted: Boolean,
    val previous: ReaderUIState,
    val state: ReaderUIState,
    val effects: List<ReaderUIEffect> = emptyList(),
    val cancelledCorrelationIds: List<String> = emptyList()
)

class ReaderUIRuntimeException(val code: String, message: String) : IllegalStateException(message)

/**
 * Platform-neutral Reader UI reducer. Native hosts render [state] and execute
 * the returned Core/Host effects; this module never calls a platform API.
 */
class ReaderUIRuntime(initialState: ReaderUIState = ReaderUIState()) {
    var state: ReaderUIState = initialState
        private set

    fun dispatch(
        event: String,
        payload: Map<String, String> = emptyMap(),
        correlationId: String? = null
    ): ReaderUITransition = dispatchValidated(event, legacyJSONPayload(payload), correlationId)

    fun dispatchJSON(
        event: String,
        jsonPayload: ReaderUIJSONPayload,
        correlationId: String? = null
    ): ReaderUITransition = dispatchValidated(event, cloneReaderUIJSONPayload(jsonPayload), correlationId)

    private fun dispatchValidated(
        event: String,
        payload: ReaderUIJSONPayload,
        correlationId: String?
    ): ReaderUITransition {
        val descriptor = GeneratedRuntimeActions.byEvent[event]
            ?: fail("UNSUPPORTED_EVENT", "No runtime action for $event")
        validateReaderUITypedPayload(event, payload)?.let { contract ->
            val matches = descriptor.action == contract.descriptorAction &&
                descriptor.value == contract.descriptorValue &&
                descriptor.coreSequence == contract.descriptorCoreSequence &&
                descriptor.hostRequest == contract.descriptorHostRequest
            if (!matches) fail("INVALID_TYPED_CONTRACT", "$event mapping drifted from ${contract.dispatchTarget}:${contract.operation}")
        }
        descriptor.requiredPayload.forEach { field ->
            val value = payload[field]
            if (value == null || value is JsonNull ||
                (value is JsonPrimitive && value.isString && value.content.isEmpty())) {
                fail("MISSING_PAYLOAD", "$event requires payload.$field")
            }
        }
        checkGuards(descriptor, event)
        if (event in readerIdentityOrRouteMutationEvents &&
            state.pageTransaction?.stage == "persisting-progress") {
            fail(
                "PAGE_PROGRESS_COMMIT_PENDING",
                "$event cannot replace the reader route or identity while progress persistence is pending"
            )
        }
        if (descriptor.action == "bookOpenSequence") {
            preflightBookOpen(event, payload, correlationId, descriptor)
        }
        if (descriptor.action == "appearanceTransaction") {
            preflightAppearance(event, payload, correlationId, descriptor)
        }

        val previous = state
        when (event) {
            "reader.page.next", "reader.page.prev" -> return beginPageStepTransition(
                direction = if (event == "reader.page.next") "next" else "previous",
                correlationId = correlationId,
                payload = payload,
                source = "manual",
                previous = previous,
                event = event
            )
            "reader.tts.start" -> return beginTTSTransition(correlationId, payload, previous, event)
            "reader.tts.stop" -> return stopTTSTransition(correlationId, previous, event)
            "reader.autoPage.start" -> return beginAutoPageTransition(correlationId, payload, previous, event)
            "reader.autoPage.stop" -> return stopAutoPageTransition(correlationId, previous, event)
        }

        val cancelledCorrelationIds = mutableListOf<String>()
        val prefixEffects = mutableListOf<ReaderUIEffect>()
        if (event == "reader.exit" || event == "book.open") {
            val teardown = teardownAllPlayback()
            prefixEffects += teardown.effects
            cancelledCorrelationIds += teardown.cancelledCorrelationIds
        }
        state = when (descriptor.action) {
            "pushRoute" -> {
                val routeId = descriptor.value ?: payload.stringValue("routeId") ?: payload.stringValue("route")
                if (routeId.isNullOrEmpty()) fail("MISSING_PAYLOAD", "$event requires a routeId")
                state.copy(routeId = routeId, routeStack = state.routeStack + state.routeId, overlay = null)
            }
            "replaceRoute" -> {
                val routeId = descriptor.value ?: payload.stringValue("routeId") ?: payload.stringValue("route")
                if (routeId.isNullOrEmpty()) fail("MISSING_PAYLOAD", "$event requires a routeId")
                state.copy(routeId = routeId, overlay = null)
            }
            "popRoute" -> state.copy(
                routeId = state.routeStack.lastOrNull() ?: state.routeId,
                routeStack = state.routeStack.dropLast(1),
                overlay = null
            )
            "popToRoot" -> state.copy(routeId = state.tab, routeStack = emptyList(), overlay = null)
            "selectTab" -> {
                val tab = payload.stringValue("tab") ?: fail("MISSING_PAYLOAD", "$event requires payload.tab")
                state.copy(routeId = tab, tab = tab, routeStack = emptyList())
            }
            "setOverlay" -> state.copy(overlay = descriptor.value ?: payload.stringValue("overlay"))
            "clearOverlay" -> state.copy(overlay = null)
            "clearOverlayIfMatches" -> {
                val expectedOverlay = descriptor.value ?: payload.stringValue("overlay")
                    ?: fail("MISSING_PAYLOAD", "$event requires an overlay identity")
                if (expectedOverlay.isEmpty()) fail("MISSING_PAYLOAD", "$event requires an overlay identity")
                if (state.overlay == expectedOverlay) state.copy(overlay = null) else state
            }
            "toggleReaderControl" -> {
                if (state.routeId != "immersive-reading") {
                    fail("READER_ROUTE_GUARD", "$event requires the immersive-reading route")
                }
                val currentOverlay = state.overlay
                if (currentOverlay != null && currentOverlay !in readerControlOverlayFamily) {
                    fail("READER_CONTROL_OVERLAY_GUARD", "$event cannot replace $currentOverlay")
                }
                state.copy(overlay = if (currentOverlay == null) "reader-control" else null)
            }
            "switchReaderModule" -> {
                if (state.routeId != "immersive-reading") {
                    fail("READER_ROUTE_GUARD", "$event requires the immersive-reading route")
                }
                val currentOverlay = state.overlay
                if (currentOverlay == null || currentOverlay !in readerControlOverlayFamily) {
                    fail("READER_CONTROL_OVERLAY_GUARD", "$event requires an active Reader control overlay")
                }
                state.copy(overlay = payload.stringValue("module"))
            }
            "startSession" -> state.copy(activeSession = descriptor.value, overlay = null)
            "stopSession" -> state.copy(activeSession = null)
            "setReducedMotion" -> state.copy(reducedMotion = descriptor.value == "true")
            "bookOpenSequence" -> {
                val activeCorrelationId = correlationId?.takeIf { it.isNotEmpty() }
                    ?: fail("MISSING_CORRELATION", "$event requires correlationId")
                val sourceKind = payload.stringValue("sourceKind")
                    ?: fail("INVALID_SOURCE_KIND", "$event requires payload.sourceKind=remote|local")
                if (sourceKind != "remote" && sourceKind != "local") {
                    fail("INVALID_SOURCE_KIND", "$event requires payload.sourceKind=remote|local")
                }
                val stages = descriptor.coreSequence
                val firstStage = if (sourceKind == "local") "chapter.list" else "source.detail"
                val firstStageIndex = stages.indexOf(firstStage)
                if (firstStageIndex < 0 || "content.load" !in stages || "reader.location.resolve" !in stages) {
                    fail("INVALID_TRANSACTION", "$event has an incomplete Core transaction")
                }
                val baseState = state.bookOpenTransaction?.let { active ->
                    if (active.correlationId == activeCorrelationId) {
                        fail("DUPLICATE_CORRELATION", "$event was already dispatched for $activeCorrelationId")
                    }
                    cancelledCorrelationIds += active.correlationId
                    restoreBookOpenStart(active, state)
                } ?: state
                val transaction = ReaderUIBookOpenTransaction(
                    correlationId = activeCorrelationId,
                    sourceKind = sourceKind,
                    stages = stages,
                    stageIndex = firstStageIndex,
                    requestedChapterIndex = requestedChapterIndex(payload["chapterIndex"]),
                    payload = cloneReaderUIJSONPayload(payload),
                    restoreRouteId = baseState.routeId,
                    restoreRouteStack = baseState.routeStack,
                    restoreOverlay = baseState.overlay
                )
                baseState.copy(
                    routeId = "immersive-reading",
                    routeStack = baseState.routeStack + baseState.routeId,
                    overlay = null,
                    loading = true,
                    error = null,
                    bookOpenTransaction = transaction
                )
            }
            "readerPageStep" -> fail("INVALID_TRANSACTION", "$event must use the page transaction")
            "appearanceTransaction" -> {
                val activeCorrelationId = correlationId?.takeIf { it.isNotEmpty() }
                    ?: fail("MISSING_CORRELATION", "$event requires correlationId")
                val operation = descriptor.value
                    ?: fail("INVALID_TRANSACTION", "$event requires an appearance operation")
                state.copy(
                    error = null,
                    fontUnregisterRestartRequired = false,
                    appearanceTransaction = ReaderUIAppearanceTransaction(
                        event = event,
                        operation = operation,
                        correlationId = activeCorrelationId,
                        stage = if (operation == "font.register") "registering-font" else "loading",
                        payload = cloneReaderUIJSONPayload(payload),
                        fontRecord = if (operation == "font.register") JsonObject(
                            mapOf(
                                "id" to requireNotNull(payload["fontId"]),
                                "path" to requireNotNull(payload["path"]),
                                "familyName" to requireNotNull(payload["familyName"]),
                                "fontNames" to JsonArray(listOf(requireNotNull(payload["familyName"]))),
                                "enabled" to JsonPrimitive(true)
                            )
                        ) else null
                    )
                )
            }
            "emitEffects" -> state
            else -> fail("UNSUPPORTED_ACTION", "Unsupported runtime action ${descriptor.action}")
        }

        val effects = if (descriptor.action == "bookOpenSequence") {
            prefixEffects + bookOpenEffect(requireNotNull(state.bookOpenTransaction))
        } else if (descriptor.action == "appearanceTransaction") {
            prefixEffects + appearanceInitialEffect(requireNotNull(state.appearanceTransaction))
        } else {
            prefixEffects + buildList {
                descriptor.coreSequence.forEach { type ->
                    add(readerUIEffect(ReaderUIEffectKind.CORE, type, payload, correlationId))
                }
                descriptor.hostRequest?.let { type ->
                    add(readerUIEffect(ReaderUIEffectKind.HOST, type, payload, correlationId))
                }
            }
        }
        return ReaderUITransition(event, previous, state, effects, cancelledCorrelationIds)
    }

    fun acceptAppearanceHostResult(
        hostType: String,
        correlationId: String,
        jsonResult: ReaderUIJSONResult = emptyMap()
    ): ReaderUIAsyncTransition {
        val previous = state
        var transaction = state.appearanceTransaction
        if (transaction == null || transaction.correlationId != correlationId) {
            return ReaderUIAsyncTransition(false, previous, state, emptyList())
        }
        try {
        val result = cloneReaderUIJSONResult(jsonResult)
        when (transaction.stage) {
            "registering-font" -> {
                if (hostType != ReaderUIAppearanceDirective.FONT_REGISTER_FILE) {
                    return ReaderUIAsyncTransition(false, previous, state, emptyList())
                }
                validateReaderUITypedResult(transaction.event, hostType, result)
                assertExactResultKeys(result, setOf("registered", "path", "familyName", "fontNames"), hostType)
                val names = result["fontNames"] as? JsonArray
                val path = result.stringValue("path")
                val actualFamilyName = result.stringValue("familyName")
                val fontId = transaction.payload.stringValue("fontId")
                if ((result["registered"] as? JsonPrimitive)?.booleanOrNull != true || path.isNullOrBlank() ||
                    actualFamilyName.isNullOrBlank() || names.isNullOrEmpty() ||
                    names.any { (it as? JsonPrimitive)?.takeIf { value -> value.isString }?.content.isNullOrBlank() } ||
                    fontId == null) {
                    fail("INVALID_APPEARANCE_RESULT", "font.registerFile returned an invalid registration result")
                }
                val fontRecord = JsonObject(
                    mapOf(
                        "id" to JsonPrimitive(fontId),
                        "path" to JsonPrimitive(path),
                        "familyName" to JsonPrimitive(actualFamilyName),
                        "fontNames" to names,
                        "enabled" to JsonPrimitive(true)
                    )
                )
                transaction = transaction.copy(stage = "loading", fontRecord = fontRecord)
                state = state.copy(appearanceTransaction = transaction)
                return appearanceResult(true, previous, listOf(appearanceLoadEffect(transaction)))
            }
            "loading" -> {
                if (hostType != ReaderUIAppearanceDirective.PERSISTENCE_GET) {
                    return ReaderUIAsyncTransition(false, previous, state, emptyList())
                }
                validateReaderUITypedResult(transaction.event, hostType, result)
                val current = decodeAppearanceLoadResult(result)
                if (transaction.operation == "config.loadPersisted") {
                    state = state.copy(
                        appearancePreference = current,
                        appearanceTransaction = null,
                        error = null,
                        appearanceReconcileRequired = false
                    )
                    return appearanceResult(true, previous)
                }
                val applied = applyAppearanceOperation(transaction, current)
                transaction = applied.first.copy(stage = "saving", workingPreference = applied.second)
                state = state.copy(appearanceTransaction = transaction)
                return appearanceResult(
                    true,
                    previous,
                    listOf(appearanceSaveEffect(transaction, appearanceRevision(current)))
                )
            }
            "saving" -> {
                if (hostType != ReaderUIAppearanceDirective.PERSISTENCE_PUT) {
                    return ReaderUIAsyncTransition(false, previous, state, emptyList())
                }
                validateReaderUITypedResult(transaction.event, hostType, result)
                assertExactResultKeys(result, setOf("stored", "revision"), hostType)
                val working = transaction.workingPreference
                    ?: fail("INVALID_TRANSACTION", "appearance save has no working preference")
                val revision = parseAppearanceRevision(result["revision"], "result.revision")
                if ((result["stored"] as? JsonPrimitive)?.booleanOrNull != true || revision != appearanceRevision(working)) {
                    fail("INVALID_APPEARANCE_RESULT", "persistence.put returned an invalid revision result")
                }
                state = state.copy(appearancePreference = working, appearanceReconcileRequired = false)
                if (transaction.operation == "font.unregister") {
                    transaction = transaction.copy(stage = "unregistering-font")
                    state = state.copy(appearanceTransaction = transaction)
                    return appearanceResult(true, previous, listOf(fontUnregisterEffect(transaction)))
                }
                state = state.copy(appearanceTransaction = null, error = null)
                return appearanceResult(true, previous)
            }
            "unregistering-font", "rolling-back-font" -> {
                if (hostType != ReaderUIAppearanceDirective.FONT_UNREGISTER_FILE) {
                    return ReaderUIAsyncTransition(false, previous, state, emptyList())
                }
                validateReaderUITypedResult(transaction.event, hostType, result)
                assertExactResultKeys(
                    result,
                    setOf("logicalUnregistered", "physicallyUnregistered", "restartRequired"),
                    hostType
                )
                val logical = (result["logicalUnregistered"] as? JsonPrimitive)?.booleanOrNull
                val physical = (result["physicallyUnregistered"] as? JsonPrimitive)?.booleanOrNull
                val restart = (result["restartRequired"] as? JsonPrimitive)?.booleanOrNull
                if (logical != true || physical == null || restart == null || (!physical && !restart)) {
                    fail("INVALID_APPEARANCE_RESULT", "font.unregisterFile must report logical unregister and restart requirements")
                }
                state = state.copy(
                    fontUnregisterRestartRequired = restart,
                    appearanceTransaction = null,
                    error = if (transaction.stage == "unregistering-font") null else state.error
                )
                return appearanceResult(true, previous)
            }
            else -> return ReaderUIAsyncTransition(false, previous, state, emptyList())
        }
        } catch (error: Throwable) {
            return terminateAppearanceError(previous, transaction, error)
        }
    }

    fun failAppearanceHostResult(
        hostType: String,
        correlationId: String,
        code: String = "APPEARANCE_HOST_FAILED"
    ): ReaderUIAsyncTransition {
        val previous = state
        var transaction = state.appearanceTransaction
        if (transaction == null || transaction.correlationId != correlationId) {
            return ReaderUIAsyncTransition(false, previous, state, emptyList())
        }
        val expected = when (transaction.stage) {
            "registering-font" -> ReaderUIAppearanceDirective.FONT_REGISTER_FILE
            "loading" -> ReaderUIAppearanceDirective.PERSISTENCE_GET
            "saving" -> ReaderUIAppearanceDirective.PERSISTENCE_PUT
            else -> ReaderUIAppearanceDirective.FONT_UNREGISTER_FILE
        }
        if (hostType != expected) return ReaderUIAsyncTransition(false, previous, state, emptyList())
        return terminateAppearanceError(
            previous,
            transaction,
            ReaderUIRuntimeException(code.ifEmpty { "APPEARANCE_HOST_FAILED" }, code.ifEmpty { "APPEARANCE_HOST_FAILED" })
        )
    }

    /** Accept only the expected normalized Core result; stale callbacks are no-ops. */
    fun acceptBookOpenResult(
        coreType: String,
        correlationId: String,
        chapterCount: Int? = null,
        canonicalLocation: String? = null,
        pageIndex: Int? = null,
        error: String? = null
    ): ReaderUIAsyncTransition {
        val previous = state
        var transaction = state.bookOpenTransaction
        if (transaction == null || transaction.correlationId != correlationId || transaction.awaitingLayout || transaction.stage != coreType) {
            return ReaderUIAsyncTransition(false, previous, state, emptyList())
        }
        if (!error.isNullOrEmpty()) {
            state = state.copy(loading = false, error = error, bookOpenTransaction = null)
            return ReaderUIAsyncTransition(true, previous, state, emptyList())
        }
        if (coreType == "chapter.list") {
            if (chapterCount == null || chapterCount <= 0) {
                state = state.copy(loading = false, error = "BOOK_OPEN_EMPTY_TOC", bookOpenTransaction = null)
                return ReaderUIAsyncTransition(true, previous, state, emptyList())
            }
            transaction = transaction.copy(selectedChapterIndex = minOf(transaction.requestedChapterIndex, chapterCount - 1))
        }
        if (coreType == "content.load") {
            transaction = transaction.copy(awaitingLayout = true)
            state = state.copy(bookOpenTransaction = transaction)
            return ReaderUIAsyncTransition(true, previous, state, emptyList())
        }
        if (coreType == "reader.location.resolve") {
            if (canonicalLocation.isNullOrBlank() || pageIndex == null || pageIndex < 0) {
                state = state.copy(loading = false, error = "BOOK_OPEN_LOCATION_INVALID_RESULT", bookOpenTransaction = null)
                return ReaderUIAsyncTransition(true, previous, state, emptyList())
            }
            state = state.copy(readerCanonicalLocation = canonicalLocation, readerPageIndex = pageIndex)
        }
        val nextStageIndex = transaction.stageIndex + 1
        if (nextStageIndex >= transaction.stages.size) {
            state = state.copy(loading = false, error = null, bookOpenTransaction = null)
            return ReaderUIAsyncTransition(true, previous, state, emptyList())
        }
        transaction = transaction.copy(stageIndex = nextStageIndex)
        state = state.copy(bookOpenTransaction = transaction)
        return ReaderUIAsyncTransition(true, previous, state, listOf(bookOpenEffect(transaction)))
    }

    /** Lossless JSON result entry point; the primitive overload remains for migration. */
    fun acceptBookOpenJSONResult(
        coreType: String,
        correlationId: String,
        result: ReaderUIJSONResult
    ): ReaderUIAsyncTransition {
        val transaction = state.bookOpenTransaction
        if (transaction == null || transaction.correlationId != correlationId ||
            transaction.awaitingLayout || transaction.stage != coreType) {
            return acceptBookOpenResult(coreType, correlationId)
        }
        val validated = cloneReaderUIJSONResult(result)
        validateReaderUITypedResult("book.open", coreType, validated)
        return acceptBookOpenResult(
            coreType = coreType,
            correlationId = correlationId,
            chapterCount = validated.optionalResultInt("chapterCount"),
            canonicalLocation = validated.optionalResultString("canonicalLocation"),
            pageIndex = validated.optionalResultInt("pageIndex"),
            error = validated.optionalResultString("error")
        )
    }

    /** Emits location resolution after the native renderer provides real metrics. */
    fun provideBookOpenLayout(correlationId: String, layout: ReaderUIBookOpenLayout): ReaderUIAsyncTransition {
        val previous = state
        var transaction = state.bookOpenTransaction
        if (transaction == null || transaction.correlationId != correlationId || !transaction.awaitingLayout) {
            return ReaderUIAsyncTransition(false, previous, state, emptyList())
        }
        if (layout.chapterOffset < 0 || !layout.chapterProgress.isFinite() || layout.chapterProgress !in 0.0..1.0 ||
            layout.viewportWidth <= 0 || layout.viewportHeight <= 0 ||
            !layout.fontScale.isFinite() || layout.fontScale <= 0) {
            fail("INVALID_LAYOUT", "book.open requires valid measured layout")
        }
        val locationStageIndex = transaction.stages.indexOf("reader.location.resolve")
        if (locationStageIndex < 0) fail("INVALID_TRANSACTION", "book.open has no reader.location.resolve stage")
        transaction = transaction.copy(stageIndex = locationStageIndex, awaitingLayout = false, layout = layout)
        state = state.copy(bookOpenTransaction = transaction)
        return ReaderUIAsyncTransition(true, previous, state, listOf(bookOpenEffect(transaction)))
    }

    /** Restores the pre-open route and invalidates this correlation. */
    fun cancelBookOpen(correlationId: String): ReaderUIAsyncTransition {
        val previous = state
        val transaction = state.bookOpenTransaction
        if (transaction == null || transaction.correlationId != correlationId) {
            return ReaderUIAsyncTransition(false, previous, state, emptyList())
        }
        state = restoreBookOpenStart(transaction, state).copy(bookOpenTransaction = null)
        return ReaderUIAsyncTransition(true, previous, state, emptyList())
    }

    fun beginPageStep(
        direction: String,
        correlationId: String,
        payload: Map<String, String> = emptyMap()
    ): ReaderUITransition = beginPageStepTransition(
        direction = direction,
        correlationId = correlationId,
        payload = legacyJSONPayload(payload),
        source = "manual",
        previous = state,
        event = "reader.page.explicit"
    )

    fun beginPageStepJSON(
        direction: String,
        correlationId: String,
        jsonPayload: ReaderUIJSONPayload
    ): ReaderUITransition = beginPageStepTransition(
        direction = direction,
        correlationId = correlationId,
        payload = cloneReaderUIJSONPayload(jsonPayload),
        source = "manual",
        previous = state,
        event = "reader.page.explicit"
    )

    fun providePageLayout(correlationId: String, layout: ReaderUIPageLayout): ReaderUIPlaybackTransition {
        val previous = state
        val transaction = state.pageTransaction
        if (transaction == null || transaction.correlationId != correlationId || transaction.stage != "awaiting-layout") {
            return playbackResult(false, previous)
        }
        validatePageLayout(layout)
        val updated = transaction.copy(stage = "resolving-location", layout = layout)
        state = state.copy(pageTransaction = updated)
        return playbackResult(true, previous, effects = listOf(pageLocationEffect(updated)))
    }

    fun acceptPageLocationResult(
        correlationId: String,
        canonicalLocation: String? = null,
        pageIndex: Int? = null,
        error: String? = null
    ): ReaderUIPlaybackTransition {
        val previous = state
        val transaction = state.pageTransaction
        if (transaction == null || transaction.correlationId != correlationId || transaction.stage != "resolving-location") {
            return playbackResult(false, previous)
        }
        if (!error.isNullOrEmpty()) {
            state = state.copy(pageTransaction = null)
            state = state.copy(error = error)
            finishFailedAutoPage(transaction)
            return playbackResult(true, previous)
        }
        if (canonicalLocation.isNullOrBlank() || pageIndex == null || pageIndex < 0) {
            state = state.copy(pageTransaction = null)
            state = state.copy(error = "PAGE_LOCATION_INVALID_RESULT")
            finishFailedAutoPage(transaction)
            return playbackResult(true, previous)
        }
        state = state.copy(
            pageTransaction = transaction.copy(
                stage = "persisting-progress",
                pendingCanonicalLocation = canonicalLocation,
                pendingPageIndex = pageIndex
            ),
            error = null
        )
        return playbackResult(true, previous, effects = listOf(pageProgressEffect(transaction)))
    }

    fun acceptPageProgressResult(
        correlationId: String,
        stored: Boolean? = null,
        error: String? = null
    ): ReaderUIPlaybackTransition {
        val previous = state
        val transaction = state.pageTransaction
        if (transaction == null || transaction.correlationId != correlationId || transaction.stage != "persisting-progress") {
            return playbackResult(false, previous)
        }
        state = state.copy(pageTransaction = null)
        if (!error.isNullOrEmpty()) {
            state = state.copy(error = error)
            finishFailedAutoPage(transaction)
            return playbackResult(true, previous)
        }
        val canonicalLocation = transaction.pendingCanonicalLocation
        val pageIndex = transaction.pendingPageIndex
        if (stored != true || canonicalLocation.isNullOrBlank() || pageIndex == null || pageIndex < 0) {
            state = state.copy(error = "PAGE_PROGRESS_INVALID_RESULT")
            finishFailedAutoPage(transaction)
            return playbackResult(true, previous)
        }
        state = state.copy(
            readerCanonicalLocation = canonicalLocation,
            readerPageIndex = pageIndex,
            error = null
        )
        val autoPage = state.autoPageTransaction
        val effects = if (transaction.source == "auto-page" && autoPage != null &&
            autoPage.correlationId == transaction.sessionCorrelationId &&
            autoPage.generation == transaction.generation && state.activeSession == "auto-page") {
            val armed = autoPage.copy(timerArmed = true)
            state = state.copy(autoPageTransaction = armed)
            listOf(timerEffect(ReaderUIPlaybackDirective.FOREGROUND_TIMER_ARM, armed))
        } else {
            emptyList()
        }
        return playbackResult(true, previous, effects = effects)
    }

    /** Lossless JSON result entry point for progress persistence callbacks. */
    fun acceptPageProgressJSONResult(
        correlationId: String,
        result: ReaderUIJSONResult
    ): ReaderUIPlaybackTransition {
        val transaction = state.pageTransaction
        if (transaction == null || transaction.correlationId != correlationId || transaction.stage != "persisting-progress") {
            return acceptPageProgressResult(correlationId)
        }
        val validated = cloneReaderUIJSONResult(result)
        validateReaderUITypedResult(transaction.contractEvent, "reader.progress.update", validated)
        return acceptPageProgressResult(
            correlationId = correlationId,
            stored = validated.optionalResultBoolean("stored"),
            error = validated.optionalResultString("error")
        )
    }

    /** Lossless JSON result entry point for canonical location callbacks. */
    fun acceptPageLocationJSONResult(
        correlationId: String,
        result: ReaderUIJSONResult
    ): ReaderUIPlaybackTransition {
        val transaction = state.pageTransaction
        if (transaction == null || transaction.correlationId != correlationId || transaction.stage != "resolving-location") {
            return acceptPageLocationResult(correlationId)
        }
        val validated = cloneReaderUIJSONResult(result)
        validateReaderUITypedResult(transaction.contractEvent, "reader.location.resolve", validated)
        return acceptPageLocationResult(
            correlationId = correlationId,
            canonicalLocation = validated.optionalResultString("canonicalLocation"),
            pageIndex = validated.optionalResultInt("pageIndex"),
            error = validated.optionalResultString("error")
        )
    }

    fun cancelPageStep(correlationId: String): ReaderUIPlaybackTransition {
        val previous = state
        val transaction = state.pageTransaction
        if (transaction?.correlationId != correlationId) return playbackResult(false, previous)
        if (transaction.stage == "persisting-progress") {
            fail(
                "PAGE_PROGRESS_COMMIT_PENDING",
                "reader.progress.update was already dispatched and cannot be cancelled or rolled back"
            )
        }
        state = state.copy(pageTransaction = null)
        return playbackResult(true, previous, cancelledCorrelationIds = listOf(correlationId))
    }

    fun acceptTTSCoreResult(
        coreType: String,
        correlationId: String,
        error: String? = null
    ): ReaderUIPlaybackTransition {
        val previous = state
        var transaction = state.ttsTransaction
        if (transaction == null || transaction.correlationId != correlationId) return playbackResult(false, previous)
        val expected = when (transaction.stage) {
            "awaiting-plan" -> "tts.queue.plan"
            "awaiting-queue-start" -> "tts.queue.start"
            else -> null
        }
        if (expected != coreType) return playbackResult(false, previous)
        if (!error.isNullOrEmpty()) {
            val effects = ttsTeardownEffects(transaction)
            state = state.copy(ttsTransaction = null, activeSession = null, error = error)
            return playbackResult(true, previous, effects, listOf(correlationId))
        }
        if (coreType == "tts.queue.plan") {
            transaction = transaction.copy(stage = "awaiting-queue-start")
            state = state.copy(ttsTransaction = transaction)
            return playbackResult(true, previous, listOf(ttsCoreEffect("tts.queue.start", transaction)))
        }
        transaction = transaction.copy(stage = "awaiting-speech-start", queueLoaded = true)
        state = state.copy(ttsTransaction = transaction)
        return playbackResult(true, previous, listOf(ttsHostEffect("tts.system.start", transaction)))
    }

    /** Lossless JSON result entry point for Core TTS callbacks. */
    fun acceptTTSCoreJSONResult(
        coreType: String,
        correlationId: String,
        result: ReaderUIJSONResult
    ): ReaderUIPlaybackTransition {
        val transaction = state.ttsTransaction
        if (transaction == null || transaction.correlationId != correlationId) {
            return acceptTTSCoreResult(coreType, correlationId)
        }
        val expected = when (transaction.stage) {
            "awaiting-plan" -> "tts.queue.plan"
            "awaiting-queue-start" -> "tts.queue.start"
            else -> null
        }
        if (expected != coreType) return acceptTTSCoreResult(coreType, correlationId)
        val validated = cloneReaderUIJSONResult(result)
        validateReaderUITypedResult(transaction.event, coreType, validated)
        return acceptTTSCoreResult(coreType, correlationId, validated.optionalResultString("error"))
    }

    fun acceptTTSSystemStart(correlationId: String, error: String? = null): ReaderUIPlaybackTransition {
        val previous = state
        var transaction = state.ttsTransaction
        if (transaction == null || transaction.correlationId != correlationId ||
            transaction.stage != "awaiting-speech-start") return playbackResult(false, previous)
        if (!error.isNullOrEmpty()) {
            val effects = ttsTeardownEffects(transaction, forceSystemStop = true)
            state = state.copy(ttsTransaction = null, activeSession = null, error = error)
            return playbackResult(true, previous, effects, listOf(correlationId))
        }
        transaction = transaction.copy(stage = "playing", speechStarted = true)
        state = state.copy(ttsTransaction = transaction, activeSession = "tts", error = null)
        return playbackResult(true, previous)
    }

    /** Lossless JSON result entry point for Host speech-start callbacks. */
    fun acceptTTSSystemStartJSONResult(
        correlationId: String,
        result: ReaderUIJSONResult
    ): ReaderUIPlaybackTransition {
        val transaction = state.ttsTransaction
        if (transaction == null || transaction.correlationId != correlationId ||
            transaction.stage != "awaiting-speech-start") {
            return acceptTTSSystemStart(correlationId)
        }
        val validated = cloneReaderUIJSONResult(result)
        validateReaderUITypedResult(transaction.event, "tts.system.start", validated)
        return acceptTTSSystemStart(correlationId, validated.optionalResultString("error"))
    }

    fun stopTTS(correlationId: String? = null): ReaderUIPlaybackTransition {
        val previous = state
        val transaction = state.ttsTransaction
        if (transaction == null || (correlationId != null && transaction.correlationId != correlationId)) {
            return playbackResult(false, previous)
        }
        val effects = ttsTeardownEffects(transaction)
        state = state.copy(ttsTransaction = null, activeSession = null, error = null)
        return playbackResult(true, previous, effects, listOf(transaction.correlationId))
    }

    fun acceptAutoPageTimerFired(correlationId: String, generation: Int): ReaderUIPlaybackTransition {
        val previous = state
        var transaction = state.autoPageTransaction
        if (state.pageTransaction?.stage == "persisting-progress") {
            fail("PAGE_PROGRESS_COMMIT_PENDING", "reader.autoPage.timer waits for the in-flight progress commit")
        }
        if (transaction == null || transaction.correlationId != correlationId || transaction.generation != generation ||
            !transaction.timerArmed || state.activeSession != "auto-page" || state.pageTransaction != null) {
            return playbackResult(false, previous)
        }
        transaction = transaction.copy(timerArmed = false, tick = transaction.tick + 1)
        state = state.copy(autoPageTransaction = transaction)
        val pageCorrelationId = "$correlationId:page:$generation:${transaction.tick}"
        val page = beginPageStepTransition(
            direction = "next",
            correlationId = pageCorrelationId,
            payload = emptyMap(),
            source = "auto-page",
            previous = previous,
            event = "reader.autoPage.timer",
            sessionCorrelationId = correlationId,
            generation = generation
        )
        return ReaderUIPlaybackTransition(
            true,
            previous,
            page.state,
            page.effects,
            page.cancelledCorrelationIds
        )
    }

    fun stopAutoPage(correlationId: String? = null): ReaderUIPlaybackTransition =
        stopAutoPagePlayback(correlationId, state)

    fun suspendAutoPageForBackground(correlationId: String? = null): ReaderUIPlaybackTransition =
        stopAutoPagePlayback(correlationId, state)

    fun completeAsync(error: String? = null): ReaderUIState {
        state = state.copy(loading = false, error = error)
        return state
    }

    private fun beginPageStepTransition(
        direction: String,
        correlationId: String?,
        payload: ReaderUIJSONPayload,
        source: String,
        previous: ReaderUIState,
        event: String,
        sessionCorrelationId: String? = null,
        generation: Int? = null
    ): ReaderUITransition {
        requireActiveReader(event)
        val activeCorrelationId = correlationId?.takeIf { it.isNotEmpty() }
            ?: fail("MISSING_CORRELATION", "$event requires correlationId")
        if (state.bookOpenTransaction != null) {
            fail("BOOK_OPEN_TRANSACTION_PENDING", "$event waits for the active book.open transaction")
        }
        if (direction !in listOf("next", "previous", "explicit")) {
            fail("INVALID_PAGE_DIRECTION", "$event requires next|previous|explicit")
        }
        if (state.pageTransaction?.correlationId == activeCorrelationId) {
            fail("DUPLICATE_CORRELATION", "$event was already dispatched for $activeCorrelationId")
        }
        if (state.pageTransaction?.stage == "persisting-progress") {
            fail("PAGE_PROGRESS_COMMIT_PENDING", "$event waits for the in-flight progress commit")
        }
        val cancelledCorrelationIds = mutableListOf<String>()
        val prefixEffects = mutableListOf<ReaderUIEffect>()
        if (source == "manual" && state.autoPageTransaction != null) {
            val teardown = stopAutoPagePlayback(null, state)
            prefixEffects += teardown.effects
            cancelledCorrelationIds += teardown.cancelledCorrelationIds
        }
        state.pageTransaction?.let { active ->
            cancelledCorrelationIds += active.correlationId
        }
        state = state.copy(
            pageTransaction = ReaderUIPageTransaction(
                correlationId = activeCorrelationId,
                direction = direction,
                source = source,
                contractEvent = if (source == "auto-page") "reader.autoPage.start" else event,
                sessionCorrelationId = sessionCorrelationId,
                generation = generation,
                payload = cloneReaderUIJSONPayload(payload)
            ),
            error = null
        )
        return ReaderUITransition(event, previous, state, prefixEffects, cancelledCorrelationIds)
    }

    private fun beginTTSTransition(
        correlationId: String?,
        payload: ReaderUIJSONPayload,
        previous: ReaderUIState,
        event: String
    ): ReaderUITransition {
        requireActiveReader(event)
        val activeCorrelationId = correlationId?.takeIf { it.isNotEmpty() }
            ?: fail("MISSING_CORRELATION", "$event requires correlationId")
        if (listOf("text", "content", "chapterBody").any { payload.containsKey(it) }) {
            fail("INVALID_TTS_PAYLOAD", "$event binds chapter content through Host DomainContext")
        }
        if (state.ttsTransaction?.correlationId == activeCorrelationId) {
            fail("DUPLICATE_CORRELATION", "$event was already dispatched for $activeCorrelationId")
        }
        val teardown = teardownPlaybackSession()
        val transaction = ReaderUITTSTransaction(activeCorrelationId, event, payload = cloneReaderUIJSONPayload(payload))
        state = state.copy(ttsTransaction = transaction, activeSession = null, overlay = null, error = null)
        return ReaderUITransition(
            event,
            previous,
            state,
            teardown.effects + ttsCoreEffect("tts.queue.plan", transaction),
            teardown.cancelledCorrelationIds
        )
    }

    private fun stopTTSTransition(
        correlationId: String?,
        previous: ReaderUIState,
        event: String
    ): ReaderUITransition {
        val transaction = state.ttsTransaction
        if (transaction == null || (correlationId != null && transaction.correlationId != correlationId)) {
            return ReaderUITransition(event, previous, state, emptyList())
        }
        val effects = ttsTeardownEffects(transaction)
        state = state.copy(ttsTransaction = null, activeSession = null, error = null)
        return ReaderUITransition(event, previous, state, effects, listOf(transaction.correlationId))
    }

    private fun beginAutoPageTransition(
        correlationId: String?,
        payload: ReaderUIJSONPayload,
        previous: ReaderUIState,
        event: String
    ): ReaderUITransition {
        requireActiveReader(event)
        val activeCorrelationId = correlationId?.takeIf { it.isNotEmpty() }
            ?: fail("MISSING_CORRELATION", "$event requires correlationId")
        val intervalMs = jsonInt(payload["intervalMs"])
        if (intervalMs == null || intervalMs !in
            ReaderUIPlaybackDirective.AUTO_PAGE_MINIMUM_INTERVAL_MS..ReaderUIPlaybackDirective.AUTO_PAGE_MAXIMUM_INTERVAL_MS) {
            fail(
                "INVALID_AUTO_PAGE_INTERVAL",
                "$event requires intervalMs=${ReaderUIPlaybackDirective.AUTO_PAGE_MINIMUM_INTERVAL_MS}..${ReaderUIPlaybackDirective.AUTO_PAGE_MAXIMUM_INTERVAL_MS}"
            )
        }
        if (state.autoPageTransaction?.correlationId == activeCorrelationId) {
            fail("DUPLICATE_CORRELATION", "$event was already dispatched for $activeCorrelationId")
        }
        if (state.pageTransaction != null) {
            val code = if (state.pageTransaction?.stage == "persisting-progress") {
                "PAGE_PROGRESS_COMMIT_PENDING"
            } else {
                "PAGE_TRANSACTION_PENDING"
            }
            fail(code, "$event waits for the active page transaction")
        }
        val teardown = teardownPlaybackSession()
        val generation = state.playbackGeneration + 1
        val transaction = ReaderUIAutoPageTransaction(activeCorrelationId, intervalMs, generation)
        state = state.copy(
            autoPageTransaction = transaction,
            playbackGeneration = generation,
            activeSession = "auto-page",
            overlay = null,
            error = null
        )
        return ReaderUITransition(
            event,
            previous,
            state,
            teardown.effects + timerEffect(ReaderUIPlaybackDirective.FOREGROUND_TIMER_ARM, transaction),
            teardown.cancelledCorrelationIds
        )
    }

    private fun stopAutoPageTransition(
        correlationId: String?,
        previous: ReaderUIState,
        event: String
    ): ReaderUITransition {
        val result = stopAutoPagePlayback(correlationId, previous)
        return ReaderUITransition(event, previous, result.state, result.effects, result.cancelledCorrelationIds)
    }

    private fun stopAutoPagePlayback(
        correlationId: String?,
        previous: ReaderUIState
    ): ReaderUIPlaybackTransition {
        val transaction = state.autoPageTransaction
        if (transaction == null || (correlationId != null && transaction.correlationId != correlationId)) {
            return playbackResult(false, previous)
        }
        val cancelledCorrelationIds = mutableListOf(transaction.correlationId)
        var pageTransaction = state.pageTransaction
        if (pageTransaction?.source == "auto-page" && pageTransaction.sessionCorrelationId == transaction.correlationId) {
            if (pageTransaction.stage != "persisting-progress") {
                cancelledCorrelationIds += pageTransaction.correlationId
                pageTransaction = null
            }
        }
        val effects = listOf(timerEffect(ReaderUIPlaybackDirective.FOREGROUND_TIMER_CANCEL, transaction))
        state = state.copy(
            pageTransaction = pageTransaction,
            autoPageTransaction = null,
            playbackGeneration = state.playbackGeneration + 1,
            activeSession = null,
            error = null
        )
        return playbackResult(true, previous, effects, cancelledCorrelationIds)
    }

    private data class PlaybackTeardown(
        val effects: List<ReaderUIEffect>,
        val cancelledCorrelationIds: List<String>
    )

    private fun teardownPlaybackSession(): PlaybackTeardown {
        val effects = mutableListOf<ReaderUIEffect>()
        val cancelledCorrelationIds = mutableListOf<String>()
        state.ttsTransaction?.let { tts ->
            cancelledCorrelationIds += tts.correlationId
            effects += ttsTeardownEffects(tts)
            state = state.copy(ttsTransaction = null)
        }
        state.autoPageTransaction?.let { autoPage ->
            cancelledCorrelationIds += autoPage.correlationId
            effects += timerEffect(ReaderUIPlaybackDirective.FOREGROUND_TIMER_CANCEL, autoPage)
            var pageTransaction = state.pageTransaction
            if (pageTransaction?.source == "auto-page" && pageTransaction.sessionCorrelationId == autoPage.correlationId) {
                if (pageTransaction.stage != "persisting-progress") {
                    cancelledCorrelationIds += pageTransaction.correlationId
                    pageTransaction = null
                }
            }
            state = state.copy(
                pageTransaction = pageTransaction,
                autoPageTransaction = null,
                playbackGeneration = state.playbackGeneration + 1
            )
        }
        state = state.copy(activeSession = null)
        return PlaybackTeardown(effects, cancelledCorrelationIds)
    }

    private fun teardownAllPlayback(): PlaybackTeardown {
        val teardown = teardownPlaybackSession()
        val cancelledCorrelationIds = teardown.cancelledCorrelationIds.toMutableList()
        if (state.pageTransaction?.stage != "persisting-progress") {
            state.pageTransaction?.let { cancelledCorrelationIds += it.correlationId }
            state = state.copy(pageTransaction = null)
        }
        return PlaybackTeardown(teardown.effects, cancelledCorrelationIds)
    }

    private fun ttsTeardownEffects(
        transaction: ReaderUITTSTransaction,
        forceSystemStop: Boolean = false
    ): List<ReaderUIEffect> = buildList {
        if (transaction.speechStarted || forceSystemStop) add(ttsHostEffect("tts.system.stop", transaction))
        if (transaction.queueLoaded) add(ttsCoreEffect("tts.queue.stop", transaction))
    }

    private fun ttsCoreEffect(type: String, transaction: ReaderUITTSTransaction): ReaderUIEffect =
        readerUIEffect(
            ReaderUIEffectKind.CORE,
            type,
            if (type == "tts.queue.plan") transaction.payload else emptyMap(),
            transaction.correlationId
        )

    private fun ttsHostEffect(type: String, transaction: ReaderUITTSTransaction): ReaderUIEffect =
        readerUIEffect(ReaderUIEffectKind.HOST, type, emptyMap(), transaction.correlationId)

    private fun timerEffect(type: String, transaction: ReaderUIAutoPageTransaction): ReaderUIEffect =
        readerUIEffect(
            ReaderUIEffectKind.HOST,
            type,
            mapOf(
                "timerId" to JsonPrimitive(transaction.correlationId),
                "correlationId" to JsonPrimitive(transaction.correlationId),
                "delayMs" to JsonPrimitive(transaction.intervalMs),
                "generation" to JsonPrimitive(transaction.generation),
                "oneShot" to JsonPrimitive(true),
                "foregroundOnly" to JsonPrimitive(true)
            ),
            transaction.correlationId
        )

    private fun pageLocationEffect(transaction: ReaderUIPageTransaction): ReaderUIEffect {
        val layout = requireNotNull(transaction.layout)
        val payload = buildMap {
            putAll(transaction.payload)
            put("direction", JsonPrimitive(transaction.direction))
            put("anchor", JsonPrimitive(layout.anchor))
            put("targetPageIndex", JsonPrimitive(layout.targetPageIndex))
            put("chapterIndex", JsonPrimitive(layout.chapterIndex))
            put("chapterOffset", JsonPrimitive(layout.chapterOffset))
            put("chapterProgress", JsonPrimitive(layout.chapterProgress))
            put("viewportWidth", JsonPrimitive(layout.viewportWidth))
            put("viewportHeight", JsonPrimitive(layout.viewportHeight))
            put("fontScale", JsonPrimitive(layout.fontScale))
        }
        return readerUIEffect(ReaderUIEffectKind.CORE, "reader.location.resolve", payload, transaction.correlationId)
    }

    private fun pageProgressEffect(transaction: ReaderUIPageTransaction): ReaderUIEffect =
        readerUIEffect(ReaderUIEffectKind.CORE, "reader.progress.update", emptyMap(), transaction.correlationId)

    private fun validatePageLayout(layout: ReaderUIPageLayout) {
        if (layout.anchor.isEmpty() || layout.targetPageIndex < 0 || layout.chapterIndex < 0 ||
            layout.chapterOffset < 0 || !layout.chapterProgress.isFinite() || layout.chapterProgress !in 0.0..1.0 ||
            layout.viewportWidth <= 0 || layout.viewportHeight <= 0 ||
            !layout.fontScale.isFinite() || layout.fontScale <= 0) {
            fail("INVALID_PAGE_LAYOUT", "page transaction requires a real anchor and measured viewport")
        }
    }

    private fun finishFailedAutoPage(pageTransaction: ReaderUIPageTransaction) {
        val autoPage = state.autoPageTransaction
        if (pageTransaction.source != "auto-page" || autoPage == null ||
            autoPage.correlationId != pageTransaction.sessionCorrelationId ||
            autoPage.generation != pageTransaction.generation) return
        state = state.copy(
            autoPageTransaction = null,
            playbackGeneration = state.playbackGeneration + 1,
            activeSession = null
        )
    }

    private fun requireActiveReader(event: String) {
        if (state.routeId != "immersive-reading") fail("READER_INACTIVE", "$event requires immersive-reading")
    }

    private fun preflightAppearance(
        event: String,
        payload: ReaderUIJSONPayload,
        correlationId: String?,
        descriptor: RuntimeActionDescriptor
    ) {
        if (correlationId.isNullOrEmpty()) fail("MISSING_CORRELATION", "$event requires correlationId")
        if (state.appearanceTransaction != null) fail("APPEARANCE_BUSY", "$event is blocked by an active appearance transaction")
        val allowed = setOf(
            "font.register", "font.unregister", "theme.create", "theme.update", "theme.delete",
            "typography.persist", "config.loadPersisted", "config.savePersisted"
        )
        val operation = descriptor.value
        if (operation !in allowed) fail("INVALID_TRANSACTION", "$event has an invalid appearance operation")
        if (operation == "font.register") {
            val lower = payload.stringValue("path")?.lowercase().orEmpty()
            if (!lower.endsWith(".ttf") && !lower.endsWith(".otf") && !lower.endsWith(".ttc")) {
                fail("INVALID_TYPED_PAYLOAD", "payload.path must identify a .ttf, .otf, or .ttc file")
            }
        }
        if (operation == "config.savePersisted") {
            val preference = payload["preference"] as? JsonObject
                ?: fail("INVALID_APPEARANCE_PREFERENCE", "config.savePersisted requires a preference object")
            validatedAppearancePreference(preference)
        }
    }

    private fun appearanceInitialEffect(transaction: ReaderUIAppearanceTransaction): ReaderUIEffect {
        if (transaction.stage == "registering-font") {
            val path = transaction.payload["path"]
                ?: fail("INVALID_TRANSACTION", "font.register is missing path")
            val familyName = transaction.payload["familyName"]
                ?: fail("INVALID_TRANSACTION", "font.register is missing familyName")
            return readerUIEffect(
                ReaderUIEffectKind.HOST,
                ReaderUIAppearanceDirective.FONT_REGISTER_FILE,
                mapOf("path" to path, "familyName" to familyName),
                transaction.correlationId
            )
        }
        return appearanceLoadEffect(transaction)
    }

    private fun appearanceLoadEffect(transaction: ReaderUIAppearanceTransaction): ReaderUIEffect =
        readerUIEffect(
            ReaderUIEffectKind.HOST,
            ReaderUIAppearanceDirective.PERSISTENCE_GET,
            mapOf("namespace" to JsonPrimitive("reader-ui"), "key" to JsonPrimitive("appearance.v1")),
            transaction.correlationId
        )

    private fun appearanceSaveEffect(
        transaction: ReaderUIAppearanceTransaction,
        expectedRevision: Int
    ): ReaderUIEffect {
        val working = transaction.workingPreference
            ?: fail("INVALID_TRANSACTION", "appearance save requires a working preference")
        return readerUIEffect(
            ReaderUIEffectKind.HOST,
            ReaderUIAppearanceDirective.PERSISTENCE_PUT,
            mapOf(
                "namespace" to JsonPrimitive("reader-ui"),
                "key" to JsonPrimitive("appearance.v1"),
                "value" to JsonPrimitive(JsonObject(working).toString()),
                "expectedRevision" to JsonPrimitive(expectedRevision.toString())
            ),
            transaction.correlationId
        )
    }

    private fun fontUnregisterEffect(transaction: ReaderUIAppearanceTransaction): ReaderUIEffect {
        val record = transaction.fontRecord
            ?: fail("INVALID_TRANSACTION", "font unregister requires a persisted font record")
        val path = record["path"] ?: fail("INVALID_TRANSACTION", "font record has no path")
        val familyName = record["familyName"] ?: fail("INVALID_TRANSACTION", "font record has no familyName")
        return readerUIEffect(
            ReaderUIEffectKind.HOST,
            ReaderUIAppearanceDirective.FONT_UNREGISTER_FILE,
            mapOf("path" to path, "familyName" to familyName),
            transaction.correlationId
        )
    }

    private fun decodeAppearanceLoadResult(result: ReaderUIJSONResult): ReaderUIJSONPayload {
        if ((result["found"] as? JsonPrimitive)?.booleanOrNull == false) {
            assertExactResultKeys(result, setOf("found"), ReaderUIAppearanceDirective.PERSISTENCE_GET)
            return initialReaderUIAppearancePreference()
        }
        assertExactResultKeys(
            result,
            setOf("found", "value", "revision"),
            ReaderUIAppearanceDirective.PERSISTENCE_GET
        )
        val value = result.stringValue("value")
        if ((result["found"] as? JsonPrimitive)?.booleanOrNull != true || value == null) {
            fail("INVALID_APPEARANCE_RESULT", "persistence.get returned an invalid value result")
        }
        val revision = parseAppearanceRevision(result["revision"], "result.revision")
        val decoded = try { Json.parseToJsonElement(value) as? JsonObject }
        catch (_: Throwable) { null }
            ?: fail("INVALID_APPEARANCE_PREFERENCE", "persisted appearance JSON is malformed")
        val preference = validatedAppearancePreference(decoded)
        if (appearanceRevision(preference) != revision) {
            fail("INVALID_APPEARANCE_PREFERENCE", "persisted appearance revision does not match Host revision")
        }
        return preference
    }

    private fun applyAppearanceOperation(
        input: ReaderUIAppearanceTransaction,
        current: ReaderUIJSONPayload
    ): Pair<ReaderUIAppearanceTransaction, ReaderUIJSONPayload> {
        var transaction = input
        val working = current.toMutableMap()
        when (transaction.operation) {
            "font.register" -> {
                val fonts = (working["fonts"] as? JsonArray)?.toMutableList()
                    ?: fail("INVALID_APPEARANCE_PREFERENCE", "fonts must be an array")
                val fontId = transaction.payload.stringValue("fontId")
                    ?: fail("INVALID_TRANSACTION", "font.register has no fontId")
                if (fonts.any { (it as? JsonObject)?.stringValue("id") == fontId }) {
                    fail("APPEARANCE_CONFLICT", "font $fontId already exists")
                }
                fonts += JsonObject(transaction.fontRecord
                    ?: fail("INVALID_TRANSACTION", "font.register has no Host registration result"))
                working["fonts"] = JsonArray(fonts)
            }
            "font.unregister" -> {
                val fonts = (working["fonts"] as? JsonArray)?.toMutableList()
                    ?: fail("INVALID_APPEARANCE_PREFERENCE", "fonts must be an array")
                val fontId = transaction.payload.stringValue("fontId")
                    ?: fail("INVALID_TRANSACTION", "font.unregister has no fontId")
                val index = fonts.indexOfFirst { (it as? JsonObject)?.stringValue("id") == fontId }
                if (index < 0) fail("APPEARANCE_NOT_FOUND", "font $fontId does not exist")
                val record = fonts.removeAt(index) as JsonObject
                transaction = transaction.copy(fontRecord = record)
                working["fonts"] = JsonArray(fonts)
                val typography = (working["typography"] as? JsonObject)?.toMutableMap()
                    ?: fail("INVALID_APPEARANCE_PREFERENCE", "typography must be an object")
                if (typography.stringValue("fontFamily") == record.stringValue("familyName")) {
                    typography["fontFamily"] = JsonNull
                    working["typography"] = JsonObject(typography)
                }
            }
            "theme.create" -> {
                val themes = (working["themes"] as? JsonArray)?.toMutableList()
                    ?: fail("INVALID_APPEARANCE_PREFERENCE", "themes must be an array")
                val theme = transaction.payload["theme"] as? JsonObject
                    ?: fail("INVALID_TRANSACTION", "theme.create has no theme")
                val themeId = theme.stringValue("id") ?: fail("INVALID_TRANSACTION", "theme has no id")
                if (themes.any { (it as? JsonObject)?.stringValue("id") == themeId }) {
                    fail("APPEARANCE_CONFLICT", "theme $themeId already exists")
                }
                themes += theme
                working["themes"] = JsonArray(themes)
                if (working["activeThemeId"] === JsonNull) working["activeThemeId"] = JsonPrimitive(themeId)
            }
            "theme.update" -> {
                val themes = (working["themes"] as? JsonArray)?.toMutableList()
                    ?: fail("INVALID_APPEARANCE_PREFERENCE", "themes must be an array")
                val theme = transaction.payload["theme"] as? JsonObject
                    ?: fail("INVALID_TRANSACTION", "theme.update has no theme")
                val themeId = theme.stringValue("id") ?: fail("INVALID_TRANSACTION", "theme has no id")
                val index = themes.indexOfFirst { (it as? JsonObject)?.stringValue("id") == themeId }
                if (index < 0) fail("APPEARANCE_NOT_FOUND", "theme $themeId does not exist")
                themes[index] = theme
                working["themes"] = JsonArray(themes)
            }
            "theme.delete" -> {
                val themes = (working["themes"] as? JsonArray)?.toMutableList()
                    ?: fail("INVALID_APPEARANCE_PREFERENCE", "themes must be an array")
                val themeId = transaction.payload.stringValue("themeId")
                    ?: fail("INVALID_TRANSACTION", "theme.delete has no themeId")
                val index = themes.indexOfFirst { (it as? JsonObject)?.stringValue("id") == themeId }
                if (index < 0) fail("APPEARANCE_NOT_FOUND", "theme $themeId does not exist")
                themes.removeAt(index)
                working["themes"] = JsonArray(themes)
                if (working.stringValue("activeThemeId") == themeId) {
                    working["activeThemeId"] = (themes.firstOrNull() as? JsonObject)?.get("id") ?: JsonNull
                }
            }
            "typography.persist" -> working["typography"] = transaction.payload["typography"]
                ?: fail("INVALID_TRANSACTION", "typography.persist has no typography")
            "config.savePersisted" -> {
                val requested = transaction.payload["preference"] as? JsonObject
                    ?: fail("INVALID_TRANSACTION", "config.savePersisted has no preference")
                val target = validatedAppearancePreference(requested)
                if (appearanceRevision(target) != appearanceRevision(current)) {
                    fail("APPEARANCE_CONFLICT", "config.savePersisted revision is stale")
                }
                working.clear()
                working.putAll(target)
            }
            else -> fail("INVALID_TRANSACTION", "Unsupported appearance operation ${transaction.operation}")
        }
        working["schemaVersion"] = JsonPrimitive(1)
        working["revision"] = JsonPrimitive(appearanceRevision(current) + 1)
        return transaction to validatedAppearancePreference(JsonObject(working))
    }

    private fun validatedAppearancePreference(preference: ReaderUIJSONPayload): ReaderUIJSONPayload {
        val validated = try {
            cloneReaderUIJSONPayload(preference).also {
                validateReaderUITypedPayload("reader.config.persist", mapOf("preference" to JsonObject(it)))
            }
        } catch (error: Throwable) {
            fail("INVALID_APPEARANCE_PREFERENCE", error.message ?: "appearance preference is invalid")
        }
        val themes = validated["themes"] as? JsonArray
            ?: fail("INVALID_APPEARANCE_PREFERENCE", "themes must be an array")
        val fonts = validated["fonts"] as? JsonArray
            ?: fail("INVALID_APPEARANCE_PREFERENCE", "fonts must be an array")
        val themeIds = themes.map { (it as JsonObject).stringValue("id")!! }
        val fontIds = fonts.map { (it as JsonObject).stringValue("id")!! }
        if (themeIds.toSet().size != themeIds.size || fontIds.toSet().size != fontIds.size) {
            fail("INVALID_APPEARANCE_PREFERENCE", "appearance preference contains duplicate ids")
        }
        validated.stringValue("activeThemeId")?.let { active ->
            if (active !in themeIds) fail("INVALID_APPEARANCE_PREFERENCE", "activeThemeId does not reference a stored theme")
        }
        return validated
    }

    private fun appearanceRevision(preference: ReaderUIJSONPayload): Int {
        val revision = (preference["revision"] as? JsonPrimitive)?.takeUnless { it.isString }?.intOrNull
        if (revision == null || revision < 0) fail("INVALID_APPEARANCE_PREFERENCE", "appearance revision must be non-negative")
        return revision
    }

    private fun parseAppearanceRevision(value: ReaderUIJSONValue?, path: String): Int {
        val string = (value as? JsonPrimitive)?.takeIf { it.isString }?.content
        if (string == null || !Regex("^(0|[1-9][0-9]*)$").matches(string)) {
            fail("INVALID_APPEARANCE_RESULT", "$path must be a non-negative decimal revision string")
        }
        return string.toIntOrNull()
            ?: fail("INVALID_APPEARANCE_RESULT", "$path exceeds the supported revision range")
    }

    private fun assertExactResultKeys(result: ReaderUIJSONResult, expected: Set<String>, type: String) {
        if (result.keys != expected) fail("INVALID_APPEARANCE_RESULT", "$type result has missing or unknown fields")
    }

    private fun terminateAppearanceError(
        previous: ReaderUIState,
        input: ReaderUIAppearanceTransaction,
        error: Throwable
    ): ReaderUIAsyncTransition {
        var transaction = input
        val code = (error as? ReaderUIRuntimeException)?.code ?: "APPEARANCE_HOST_FAILED"
        state = state.copy(error = code)
        if (transaction.stage == "saving") state = state.copy(appearanceReconcileRequired = true)
        if (transaction.operation == "font.register" && transaction.fontRecord != null &&
            (transaction.stage == "registering-font" || transaction.stage == "loading" || transaction.stage == "saving")) {
            transaction = transaction.copy(stage = "rolling-back-font")
            state = state.copy(appearanceTransaction = transaction)
            return appearanceResult(true, previous, listOf(fontUnregisterEffect(transaction)))
        }
        if (transaction.stage == "unregistering-font" || transaction.stage == "rolling-back-font" ||
            (transaction.operation == "font.unregister" && transaction.stage == "saving")) {
            state = state.copy(fontUnregisterRestartRequired = true)
        }
        state = state.copy(appearanceTransaction = null)
        return appearanceResult(true, previous)
    }

    private fun appearanceResult(
        accepted: Boolean,
        previous: ReaderUIState,
        effects: List<ReaderUIEffect> = emptyList()
    ): ReaderUIAsyncTransition = ReaderUIAsyncTransition(accepted, previous, state, effects)

    private fun preflightBookOpen(
        event: String,
        payload: ReaderUIJSONPayload,
        correlationId: String?,
        descriptor: RuntimeActionDescriptor
    ) {
        val activeCorrelationId = correlationId?.takeIf { it.isNotEmpty() }
            ?: fail("MISSING_CORRELATION", "$event requires correlationId")
        val sourceKind = payload.stringValue("sourceKind")
        if (sourceKind != "remote" && sourceKind != "local") {
            fail("INVALID_SOURCE_KIND", "$event requires payload.sourceKind=remote|local")
        }
        val firstStage = if (sourceKind == "local") "chapter.list" else "source.detail"
        if (firstStage !in descriptor.coreSequence || "content.load" !in descriptor.coreSequence ||
            "reader.location.resolve" !in descriptor.coreSequence) {
            fail("INVALID_TRANSACTION", "$event has an incomplete Core transaction")
        }
        if (state.bookOpenTransaction?.correlationId == activeCorrelationId) {
            fail("DUPLICATE_CORRELATION", "$event was already dispatched for $activeCorrelationId")
        }
    }

    private fun playbackResult(
        accepted: Boolean,
        previous: ReaderUIState,
        effects: List<ReaderUIEffect> = emptyList(),
        cancelledCorrelationIds: List<String> = emptyList()
    ): ReaderUIPlaybackTransition =
        ReaderUIPlaybackTransition(accepted, previous, state, effects, cancelledCorrelationIds)

    private fun bookOpenEffect(transaction: ReaderUIBookOpenTransaction): ReaderUIEffect =
        readerUIEffect(
            ReaderUIEffectKind.CORE,
            transaction.stage,
            bookOpenEffectPayload(transaction),
            transaction.correlationId
        )

    private fun bookOpenEffectPayload(transaction: ReaderUIBookOpenTransaction): ReaderUIJSONPayload =
        buildMap {
            putAll(transaction.payload)
            put("sourceKind", JsonPrimitive(transaction.sourceKind))
            put("chapterIndex", JsonPrimitive(transaction.selectedChapterIndex ?: transaction.requestedChapterIndex))
            transaction.layout?.let { layout ->
                put("chapterOffset", JsonPrimitive(layout.chapterOffset))
                put("chapterProgress", JsonPrimitive(layout.chapterProgress))
                put("viewportWidth", JsonPrimitive(layout.viewportWidth))
                put("viewportHeight", JsonPrimitive(layout.viewportHeight))
                put("fontScale", JsonPrimitive(layout.fontScale))
            }
        }

    private fun restoreBookOpenStart(
        transaction: ReaderUIBookOpenTransaction,
        current: ReaderUIState
    ): ReaderUIState = current.copy(
        routeId = transaction.restoreRouteId,
        routeStack = transaction.restoreRouteStack,
        overlay = transaction.restoreOverlay,
        loading = false,
        error = null
    )

    private fun requestedChapterIndex(value: ReaderUIJSONValue?): Int = jsonInt(value)?.coerceAtLeast(0) ?: 0

    private fun checkGuards(descriptor: RuntimeActionDescriptor, event: String) {
        descriptor.guards.forEach { guardName ->
            if (guardName == "loadingFalse" && state.loading) {
                fail("ASYNC_GUARD", "$event is blocked while loading")
            }
            if (guardName == "overlayEmpty" && state.overlay != null) {
                fail("OVERLAY_GUARD", "$event is blocked while overlay is open")
            }
        }
    }

    private fun fail(code: String, message: String): Nothing = throw ReaderUIRuntimeException(code, message)
}
