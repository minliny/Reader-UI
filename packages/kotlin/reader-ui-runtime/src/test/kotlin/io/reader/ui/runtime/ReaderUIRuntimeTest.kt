package io.reader.ui.runtime

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.add
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ReaderUIRuntimeTest {
    private fun activeReaderRuntime(
        pageIndex: Int = 0,
        canonicalLocation: String? = null
    ): ReaderUIRuntime = ReaderUIRuntime(
        ReaderUIState(
            routeId = "immersive-reading",
            routeStack = listOf("bookshelf"),
            readerPageIndex = pageIndex,
            readerCanonicalLocation = canonicalLocation
        )
    )

    private fun measuredPageLayout(
        targetPageIndex: Int = 5,
        viewportWidth: Int = 390
    ): ReaderUIPageLayout = ReaderUIPageLayout(
        anchor = "chapter-4:offset-120",
        targetPageIndex = targetPageIndex,
        chapterIndex = 4,
        chapterOffset = 120,
        chapterProgress = 0.42,
        viewportWidth = viewportWidth,
        viewportHeight = 844,
        fontScale = 1.0
    )

    @Test
    fun recursiveJSONPayloadRoundTripsWithoutStringifyingTypes() {
        val payload = buildJsonObject {
            put("kind", "bookSource")
            put("input", buildJsonObject {
                put("sourceId", "source-1")
                put("rules", buildJsonObject {
                    put("search", buildJsonArray {
                        add(buildJsonObject {
                            put("selector", ".book")
                            put("enabled", true)
                            put("weight", 2.5)
                            put("optional", JsonNull)
                        })
                    })
                })
                put("bookSource", buildJsonObject {
                    put("bookSourceName", "Source One")
                    put("bookSourceUrl", "https://source.test")
                    put("chapters", buildJsonArray {
                        add(1)
                        add(2)
                        add(buildJsonObject {
                            put("title", "three")
                            put("cached", false)
                        })
                    })
                })
            })
        }
        val runtime = ReaderUIRuntime()
        val transition = runtime.dispatchJSON("import.start", payload, "json-roundtrip")
        assertEquals(payload, JsonObject(transition.effects.single().jsonPayload))
        assertEquals(payload, Json.parseToJsonElement(payload.toString()))
        assertNull(transition.effects.single().legacyStringPayload)
        assertEquals(mapOf("kind" to "bookSource"), transition.effects.single().payload)

        val hostCompatible = ReaderUIEffect(
            kind = ReaderUIEffectKind.HOST,
            type = "timer.foreground.arm",
            payload = mapOf("delayMs" to "5000", "oneShot" to "true")
        )
        assertEquals("5000", hostCompatible.payload["delayMs"])
        assertEquals(JsonPrimitive("5000"), hostCompatible.jsonPayload["delayMs"])

        val error = assertFailsWith<ReaderUIRuntimeException> {
            ReaderUIRuntime().dispatchJSON(
                "mainTab.select",
                buildJsonObject { put("tab", 1) }
            )
        }
        assertEquals("INVALID_TYPED_PAYLOAD", error.code)
    }

    @Test
    fun recursiveJSONResultBoundaryPreservesTypesAndFailsClosed() {
        val runtime = activeReaderRuntime(2, "old")
        runtime.dispatch("reader.page.next", correlationId = "json-result")
        runtime.providePageLayout("json-result", measuredPageLayout(targetPageIndex = 3))
        val accepted = runtime.acceptPageLocationJSONResult(
            "json-result",
            buildJsonObject {
                put("canonicalLocation", "chapter-4:p3")
                put("pageIndex", 3)
            }
        )
        assertTrue(accepted.accepted)
        assertEquals(listOf("reader.progress.update"), accepted.effects.map { it.type })
        assertEquals(2, runtime.state.readerPageIndex)
        assertTrue(
            runtime.acceptPageProgressJSONResult(
                "json-result",
                buildJsonObject { put("stored", true) }
            ).accepted
        )
        assertEquals(3, runtime.state.readerPageIndex)
        assertEquals("chapter-4:p3", runtime.state.readerCanonicalLocation)

        runtime.dispatch("reader.page.next", correlationId = "json-result-invalid")
        runtime.providePageLayout("json-result-invalid", measuredPageLayout(targetPageIndex = 4))
        val error = assertFailsWith<ReaderUIRuntimeException> {
            runtime.acceptPageLocationJSONResult(
                "json-result-invalid",
                buildJsonObject {
                    put("canonicalLocation", "chapter-4:p4")
                    put("pageIndex", 4)
                    put("metadata", buildJsonObject { put("ratio", JsonPrimitive(Double.NaN)) })
                }
            )
        }
        assertEquals("INVALID_JSON_RESULT", error.code)
        assertEquals("resolving-location", runtime.state.pageTransaction?.stage)
    }

    @Test
    fun generatedTypedPayloadFixturesHaveExactParity() {
        assertEquals(67, GeneratedRuntimeTypedPayloadContracts.byEvent.size)
        assertEquals(190, GENERATED_RUNTIME_TYPED_PAYLOAD_FIXTURES.size)
        GENERATED_RUNTIME_TYPED_PAYLOAD_FIXTURES.forEach { fixture ->
            if (fixture.valid) {
                requireNotNull(validateReaderUITypedPayload(fixture.event, fixture.payload)) { fixture.id }
            } else {
                val error = assertFailsWith<ReaderUIRuntimeException>(fixture.id) {
                    validateReaderUITypedPayload(fixture.event, fixture.payload)
                }
                assertEquals("INVALID_TYPED_PAYLOAD", error.code, fixture.id)
            }
        }
    }

    @Test
    fun generatedTypedResultFixturesHaveExactParity() {
        assertEquals(162, GENERATED_RUNTIME_TYPED_RESULT_FIXTURES.size)
        GENERATED_RUNTIME_TYPED_RESULT_FIXTURES.forEach { fixture ->
            if (fixture.valid) {
                validateReaderUITypedResult(fixture.event, fixture.effectType, fixture.result)
            } else {
                val error = assertFailsWith<ReaderUIRuntimeException>(fixture.id) {
                    validateReaderUITypedResult(fixture.event, fixture.effectType, fixture.result)
                }
                assertEquals("INVALID_TYPED_RESULT", error.code, fixture.id)
            }
        }
    }

    @Test
    fun bookOpenIsSerialResultDependentTransaction() {
        val runtime = ReaderUIRuntime()
        val transition = runtime.dispatchJSON(
            "book.open",
            mapOf(
                "bookId" to JsonPrimitive("book-1"),
                "sourceId" to JsonPrimitive("source-1"),
                "sourceKind" to JsonPrimitive("remote"),
                "chapterIndex" to JsonPrimitive(1)
            ),
            "open-1"
        )

        assertEquals("immersive-reading", transition.state.routeId)
        assertTrue(transition.state.loading)
        assertEquals(listOf("source.detail"), transition.effects.map { it.type })

        assertEquals(listOf("chapter.list"), runtime.acceptBookOpenResult("source.detail", "open-1").effects.map { it.type })
        val toc = runtime.acceptBookOpenResult("chapter.list", "open-1", chapterCount = 3)
        assertEquals(listOf("content.load"), toc.effects.map { it.type })
        assertEquals(JsonPrimitive(1), toc.effects.single().jsonPayload["chapterIndex"])
        assertTrue(runtime.acceptBookOpenResult("content.load", "open-1").accepted)
        assertTrue(requireNotNull(runtime.state.bookOpenTransaction).awaitingLayout)

        val layout = runtime.provideBookOpenLayout(
            "open-1",
            ReaderUIBookOpenLayout(12, 0.4, 390, 844, 1.0)
        )
        assertEquals(listOf("reader.location.resolve"), layout.effects.map { it.type })
        assertTrue(runtime.acceptBookOpenResult(
            "reader.location.resolve",
            "open-1",
            canonicalLocation = "chapter:1:offset:12",
            pageIndex = 1
        ).accepted)
        assertEquals("chapter:1:offset:12", runtime.state.readerCanonicalLocation)
        assertEquals(1, runtime.state.readerPageIndex)
        assertEquals(null, runtime.state.bookOpenTransaction)
        assertFalse(runtime.state.loading)
    }

    @Test
    fun bookOpenSupersedesAndCancelsStaleTransaction() {
        val runtime = ReaderUIRuntime()
        runtime.dispatch("book.open", mapOf("bookId" to "a", "sourceId" to "s", "sourceKind" to "remote"), "open-a")
        val replacement = runtime.dispatch(
            "book.open",
            mapOf("bookId" to "b", "sourceId" to "s", "sourceKind" to "remote"),
            "open-b"
        )
        assertEquals(listOf("open-a"), replacement.cancelledCorrelationIds)
        assertFalse(runtime.acceptBookOpenResult("source.detail", "open-a").accepted)
        assertTrue(runtime.cancelBookOpen("open-b").accepted)
        assertEquals("bookshelf", runtime.state.routeId)
    }

    @Test
    fun localBookOpenSkipsDetailAndStopsOnEmptyToc() {
        val runtime = ReaderUIRuntime()
        val start = runtime.dispatch(
            "book.open",
            mapOf("bookId" to "local-1", "sourceId" to "local", "sourceKind" to "local"),
            "local-open"
        )
        assertEquals(listOf("chapter.list"), start.effects.map { it.type })
        val empty = runtime.acceptBookOpenResult("chapter.list", "local-open", chapterCount = 0)
        assertTrue(empty.accepted)
        assertTrue(empty.effects.isEmpty())
        assertEquals("BOOK_OPEN_EMPTY_TOC", runtime.state.error)
    }

    @Test
    fun pageCommitsOnlyMatchingCanonicalLocationResult() {
        val runtime = activeReaderRuntime(4, "old-location")
        val start = runtime.dispatch("reader.page.next", correlationId = "page-1")
        assertTrue(start.effects.isEmpty())
        assertEquals(4, runtime.state.readerPageIndex)
        val invalid = assertFailsWith<ReaderUIRuntimeException> {
            runtime.providePageLayout("page-1", measuredPageLayout(viewportWidth = 0))
        }
        assertEquals("INVALID_PAGE_LAYOUT", invalid.code)
        assertEquals("old-location", runtime.state.readerCanonicalLocation)

        assertEquals(
            listOf("reader.location.resolve"),
            runtime.providePageLayout("page-1", measuredPageLayout()).effects.map { it.type }
        )
        assertFalse(runtime.acceptPageLocationResult("other", "late", 5).accepted)
        assertTrue(runtime.acceptPageLocationResult("page-1", error = "LOCATION_FAILED").accepted)
        assertEquals(4, runtime.state.readerPageIndex)
        assertEquals("old-location", runtime.state.readerCanonicalLocation)
        assertFalse(runtime.acceptPageLocationResult("page-1", "late", 5).accepted)

        runtime.dispatch("reader.page.next", correlationId = "page-invalid")
        runtime.providePageLayout("page-invalid", measuredPageLayout(targetPageIndex = 5))
        assertTrue(runtime.acceptPageLocationResult("page-invalid", "   ", 5).accepted)
        assertEquals("PAGE_LOCATION_INVALID_RESULT", runtime.state.error)
        assertEquals(4, runtime.state.readerPageIndex)
        assertEquals("old-location", runtime.state.readerCanonicalLocation)

        runtime.dispatch("reader.page.prev", correlationId = "page-2")
        runtime.providePageLayout("page-2", measuredPageLayout(targetPageIndex = 3))
        val persisting = runtime.acceptPageLocationResult("page-2", "canonical-ch4-p3", 3)
        assertTrue(persisting.accepted)
        assertEquals(listOf("reader.progress.update"), persisting.effects.map { it.type })
        assertTrue(persisting.effects.single().jsonPayload.isEmpty())
        assertEquals("persisting-progress", runtime.state.pageTransaction?.stage)
        assertEquals(4, runtime.state.readerPageIndex)
        assertEquals(
            "PAGE_PROGRESS_COMMIT_PENDING",
            assertFailsWith<ReaderUIRuntimeException> {
                runtime.dispatch("reader.page.next", correlationId = "page-blocked")
            }.code
        )
        assertEquals(
            "PAGE_PROGRESS_COMMIT_PENDING",
            assertFailsWith<ReaderUIRuntimeException> {
                runtime.dispatch(
                    "reader.autoPage.start",
                    mapOf("intervalMs" to "4000"),
                    "auto-blocked"
                )
            }.code
        )
        assertEquals(
            "PAGE_PROGRESS_COMMIT_PENDING",
            assertFailsWith<ReaderUIRuntimeException> { runtime.cancelPageStep("page-2") }.code
        )
        assertTrue(runtime.acceptPageProgressResult("page-2", stored = true).accepted)
        assertEquals(3, runtime.state.readerPageIndex)
        assertEquals("canonical-ch4-p3", runtime.state.readerCanonicalLocation)
        assertFalse(runtime.acceptPageLocationResult("page-2", "duplicate", 9).accepted)

        runtime.dispatch("reader.page.next", correlationId = "page-progress-error")
        runtime.providePageLayout("page-progress-error", measuredPageLayout(targetPageIndex = 4))
        runtime.acceptPageLocationResult("page-progress-error", "canonical-ch4-p4", 4)
        assertTrue(
            runtime.acceptPageProgressResult(
                "page-progress-error",
                error = "PROGRESS_STORE_FAILED"
            ).accepted
        )
        assertEquals(3, runtime.state.readerPageIndex)
        assertEquals("canonical-ch4-p3", runtime.state.readerCanonicalLocation)
        assertEquals("PROGRESS_STORE_FAILED", runtime.state.error)
    }

    @Test
    fun pageSupersessionAndExplicitLocationShareOneTransaction() {
        val runtime = activeReaderRuntime()
        runtime.dispatch("reader.page.next", correlationId = "page-a")
        val replacement = runtime.dispatch("reader.page.prev", correlationId = "page-b")
        assertEquals(listOf("page-a"), replacement.cancelledCorrelationIds)
        assertFalse(runtime.providePageLayout("page-a", measuredPageLayout()).accepted)
        val explicit = runtime.beginPageStep(
            "explicit",
            "page-explicit",
            mapOf("reason" to "chapter-jump")
        )
        assertEquals(listOf("page-b"), explicit.cancelledCorrelationIds)
        val resolving = runtime.providePageLayout("page-explicit", measuredPageLayout(targetPageIndex = 0))
        assertEquals(JsonPrimitive("explicit"), resolving.effects.single().jsonPayload["direction"])
        assertEquals(JsonPrimitive("chapter-jump"), resolving.effects.single().jsonPayload["reason"])
    }

    @Test
    fun progressCommitBoundaryBlocksExitAndBookReplacementWithoutCrossRouteContamination() {
        val runtime = activeReaderRuntime(2, "book-a-page-2")
        runtime.dispatch("reader.page.next", correlationId = "page-boundary")
        runtime.providePageLayout("page-boundary", measuredPageLayout(targetPageIndex = 3))
        runtime.acceptPageLocationResult("page-boundary", "book-a-page-3", 3)
        val pending = runtime.state

        assertEquals(
            "PAGE_PROGRESS_COMMIT_PENDING",
            assertFailsWith<ReaderUIRuntimeException> { runtime.dispatch("reader.exit") }.code
        )
        assertEquals(
            "PAGE_PROGRESS_COMMIT_PENDING",
            assertFailsWith<ReaderUIRuntimeException> {
                runtime.dispatch(
                    "book.open",
                    mapOf("bookId" to "book-b", "sourceId" to "source-b", "sourceKind" to "remote"),
                    "open-book-b"
                )
            }.code
        )
        assertEquals(
            "PAGE_PROGRESS_COMMIT_PENDING",
            assertFailsWith<ReaderUIRuntimeException> {
                runtime.dispatch("route.replace", mapOf("routeId" to "bookshelf"))
            }.code
        )
        assertEquals(
            "PAGE_PROGRESS_COMMIT_PENDING",
            assertFailsWith<ReaderUIRuntimeException> { runtime.dispatch("route.pop") }.code
        )
        assertEquals(
            "PAGE_PROGRESS_COMMIT_PENDING",
            assertFailsWith<ReaderUIRuntimeException> {
                runtime.dispatch("mainTab.select", mapOf("tab" to "settings"))
            }.code
        )
        assertEquals(pending, runtime.state)

        assertTrue(runtime.acceptPageProgressResult("page-boundary", stored = true).accepted)
        val opened = runtime.dispatch(
            "book.open",
            mapOf("bookId" to "book-b", "sourceId" to "source-b", "sourceKind" to "remote"),
            "open-book-b"
        )
        assertEquals("open-book-b", opened.state.bookOpenTransaction?.correlationId)
        assertEquals(
            "BOOK_OPEN_TRANSACTION_PENDING",
            assertFailsWith<ReaderUIRuntimeException> {
                runtime.dispatch("reader.page.next", correlationId = "book-open-page")
            }.code
        )
        assertFalse(runtime.acceptPageProgressResult("page-boundary", stored = true).accepted)
        assertEquals(3, runtime.state.readerPageIndex)
        assertEquals("book-a-page-3", runtime.state.readerCanonicalLocation)
    }

    @Test
    fun ttsPlanQueueSpeechAndOrderedTeardown() {
        val runtime = activeReaderRuntime()
        val start = runtime.dispatch(
            "reader.tts.start",
            mapOf("voice" to "system-default"),
            "tts-1"
        )
        assertEquals(listOf("tts.queue.plan"), start.effects.map { it.type })
        assertNull(runtime.state.activeSession)
        assertFalse(runtime.acceptTTSCoreResult("tts.queue.start", "tts-1").accepted)
        assertEquals(
            listOf("tts.queue.start"),
            runtime.acceptTTSCoreResult("tts.queue.plan", "tts-1").effects.map { it.type }
        )
        assertFalse(runtime.acceptTTSCoreResult("tts.queue.plan", "tts-1").accepted)
        assertEquals(
            listOf("tts.system.start"),
            runtime.acceptTTSCoreResult("tts.queue.start", "tts-1").effects.map { it.type }
        )
        assertTrue(runtime.acceptTTSSystemStart("tts-1").accepted)
        assertEquals("tts", runtime.state.activeSession)
        val stop = runtime.dispatch("reader.tts.stop", correlationId = "tts-1")
        assertEquals(listOf("tts.system.stop", "tts.queue.stop"), stop.effects.map { it.type })
        assertEquals(listOf("tts-1"), stop.cancelledCorrelationIds)
        assertFalse(runtime.acceptTTSSystemStart("tts-1").accepted)
    }

    @Test
    fun ttsSystemFailureTeardownIsSystemThenQueue() {
        val runtime = activeReaderRuntime()
        runtime.dispatch("reader.tts.start", correlationId = "tts-error")
        runtime.acceptTTSCoreResult("tts.queue.plan", "tts-error")
        runtime.acceptTTSCoreResult("tts.queue.start", "tts-error")
        val failure = runtime.acceptTTSSystemStart("tts-error", "SPEECH_FAILED")
        assertEquals(listOf("tts.system.stop", "tts.queue.stop"), failure.effects.map { it.type })
        assertNull(runtime.state.ttsTransaction)
        assertNull(runtime.state.activeSession)
        assertFalse(runtime.acceptTTSSystemStart("tts-error").accepted)
    }

    @Test
    fun autoPageOneShotCommitRearmAndBackgroundInvalidation() {
        val runtime = activeReaderRuntime(1, "page-1")
        val start = runtime.dispatch(
            "reader.autoPage.start",
            mapOf("intervalMs" to "5000"),
            "auto-1"
        )
        assertEquals(listOf(ReaderUIPlaybackDirective.FOREGROUND_TIMER_ARM), start.effects.map { it.type })
        assertEquals(JsonPrimitive("auto-1"), start.effects.single().jsonPayload["timerId"])
        assertEquals(JsonPrimitive("auto-1"), start.effects.single().jsonPayload["correlationId"])
        assertEquals(JsonPrimitive(5000), start.effects.single().jsonPayload["delayMs"])
        assertEquals(JsonPrimitive(true), start.effects.single().jsonPayload["oneShot"])
        assertEquals(JsonPrimitive(true), start.effects.single().jsonPayload["foregroundOnly"])
        assertEquals("5000", start.effects.single().payload["delayMs"])
        assertEquals("true", start.effects.single().payload["oneShot"])
        val generation = requireNotNull(runtime.state.autoPageTransaction).generation
        assertEquals(JsonPrimitive(generation), start.effects.single().jsonPayload["generation"])
        assertFalse(runtime.acceptAutoPageTimerFired("auto-1", generation + 1).accepted)
        val fired = runtime.acceptAutoPageTimerFired("auto-1", generation)
        val pageCorrelation = requireNotNull(fired.state.pageTransaction).correlationId
        assertFalse(runtime.acceptAutoPageTimerFired("auto-1", generation).accepted)
        runtime.providePageLayout(pageCorrelation, measuredPageLayout(targetPageIndex = 2))
        val persisting = runtime.acceptPageLocationResult(pageCorrelation, "page-2", 2)
        assertEquals(listOf("reader.progress.update"), persisting.effects.map { it.type })
        assertEquals(1, runtime.state.readerPageIndex)
        val committed = runtime.acceptPageProgressResult(pageCorrelation, stored = true)
        assertEquals(listOf(ReaderUIPlaybackDirective.FOREGROUND_TIMER_ARM), committed.effects.map { it.type })
        assertEquals(2, runtime.state.readerPageIndex)

        val second = runtime.acceptAutoPageTimerFired("auto-1", generation)
        val secondPage = requireNotNull(second.state.pageTransaction).correlationId
        val background = runtime.suspendAutoPageForBackground("auto-1")
        assertEquals(listOf(ReaderUIPlaybackDirective.FOREGROUND_TIMER_CANCEL), background.effects.map { it.type })
        assertEquals(listOf("auto-1", secondPage), background.cancelledCorrelationIds)
        assertTrue(runtime.state.playbackGeneration > generation)
        assertFalse(runtime.acceptAutoPageTimerFired("auto-1", generation).accepted)
    }

    @Test
    fun manualPageStopsAutoAndAutoRejectsPendingManualAtomically() {
        val runtime = activeReaderRuntime()
        runtime.dispatch(
            "reader.autoPage.start",
            mapOf("intervalMs" to "4000"),
            "auto-manual"
        )
        val generation = runtime.state.playbackGeneration
        val manual = runtime.dispatch("reader.page.next", correlationId = "manual-1")
        assertEquals(listOf(ReaderUIPlaybackDirective.FOREGROUND_TIMER_CANCEL), manual.effects.map { it.type })
        assertEquals(listOf("auto-manual"), manual.cancelledCorrelationIds)
        assertNull(runtime.state.activeSession)
        assertTrue(runtime.state.playbackGeneration > generation)
        val before = runtime.state
        val failure = assertFailsWith<ReaderUIRuntimeException> {
            runtime.dispatch(
                "reader.autoPage.start",
                mapOf("intervalMs" to "4000"),
                "auto-rejected"
            )
        }
        assertEquals("PAGE_TRANSACTION_PENDING", failure.code)
        assertEquals(before, runtime.state)
    }

    @Test
    fun ttsAndAutoPageReplaceEachOtherWithOrderedExactlyOnceTeardown() {
        val runtime = activeReaderRuntime()
        runtime.dispatch("reader.tts.start", correlationId = "tts-playing")
        runtime.acceptTTSCoreResult("tts.queue.plan", "tts-playing")
        runtime.acceptTTSCoreResult("tts.queue.start", "tts-playing")
        runtime.acceptTTSSystemStart("tts-playing")

        val auto = runtime.dispatch(
            "reader.autoPage.start",
            mapOf("intervalMs" to "3000"),
            "auto-after-tts"
        )
        assertEquals(
            listOf("tts.system.stop", "tts.queue.stop", ReaderUIPlaybackDirective.FOREGROUND_TIMER_ARM),
            auto.effects.map { it.type }
        )
        assertEquals(listOf("tts-playing"), auto.cancelledCorrelationIds)

        val tts = runtime.dispatch("reader.tts.start", correlationId = "tts-after-auto")
        assertEquals(
            listOf(ReaderUIPlaybackDirective.FOREGROUND_TIMER_CANCEL, "tts.queue.plan"),
            tts.effects.map { it.type }
        )
        assertEquals(listOf("auto-after-tts"), tts.cancelledCorrelationIds)
    }

    @Test
    fun readerExitInvalidatesAutoPageGenerationBeforeRoutePop() {
        val runtime = activeReaderRuntime()
        runtime.dispatch(
            "reader.autoPage.start",
            mapOf("intervalMs" to "3000"),
            "auto-exit"
        )
        val generation = requireNotNull(runtime.state.autoPageTransaction).generation
        val exit = runtime.dispatch("reader.exit")
        assertEquals(listOf(ReaderUIPlaybackDirective.FOREGROUND_TIMER_CANCEL), exit.effects.map { it.type })
        assertEquals(listOf("auto-exit"), exit.cancelledCorrelationIds)
        assertEquals("bookshelf", exit.state.routeId)
        assertTrue(exit.state.playbackGeneration > generation)
        assertFalse(runtime.acceptAutoPageTimerFired("auto-exit", generation).accepted)
    }

    @Test
    fun bookOpenPreflightIsAtomicBeforePlaybackTeardown() {
        val runtime = activeReaderRuntime()
        runtime.dispatch("reader.tts.start", correlationId = "tts-nav")
        runtime.acceptTTSCoreResult("tts.queue.plan", "tts-nav")
        runtime.acceptTTSCoreResult("tts.queue.start", "tts-nav")
        runtime.acceptTTSSystemStart("tts-nav")
        val before = runtime.state
        val invalid = assertFailsWith<ReaderUIRuntimeException> {
            runtime.dispatch(
                "book.open",
                mapOf("bookId" to "b", "sourceId" to "s", "sourceKind" to "invalid"),
                "open-bad"
            )
        }
        assertEquals("INVALID_TYPED_PAYLOAD", invalid.code)
        assertEquals(before, runtime.state)
        val open = runtime.dispatch(
            "book.open",
            mapOf("bookId" to "b", "sourceId" to "s", "sourceKind" to "remote"),
            "open-good"
        )
        assertEquals(listOf("tts.system.stop", "tts.queue.stop", "source.detail"), open.effects.map { it.type })
        assertEquals(listOf("tts-nav"), open.cancelledCorrelationIds)
    }

    @Test
    fun tabSwitchFailsClosedWhileOverlayIsOpen() {
        val runtime = ReaderUIRuntime()
        runtime.dispatch("overlay.sheet.open")
        val error = assertFailsWith<ReaderUIRuntimeException> {
            runtime.dispatch("mainTab.select", mapOf("tab" to "rss"))
        }
        assertEquals("OVERLAY_GUARD", error.code)
        assertEquals("bookshelf", runtime.state.tab)
    }

    @Test
    fun directoryCloseOnlyClearsDirectoryOverlay() {
        val runtime = ReaderUIRuntime()
        runtime.dispatch("reader.directory.open")
        runtime.dispatch("reader.directory.close")
        assertEquals(null, runtime.state.overlay)

        runtime.dispatch("reader.directory.open")
        runtime.dispatch("overlay.sheet.open")
        runtime.dispatch("reader.directory.close")
        assertEquals("sheet", runtime.state.overlay)
    }

    @Test
    fun readerControlAndModuleActionsAreAtomicAndRouteStable() {
        val runtime = activeReaderRuntime()
        val routeBefore = runtime.state.routeId

        val opened = runtime.dispatch("reader.control.toggle", mapOf("overlay" to "reader-control"))
        assertEquals("reader-control", opened.state.overlay)
        assertEquals(routeBefore, opened.state.routeId)
        assertTrue(opened.effects.isEmpty())

        runtime.dispatch("reader.module.switch", mapOf("module" to "directory"))
        assertEquals("directory", runtime.state.overlay)
        val repeated = runtime.state
        runtime.dispatch("reader.module.switch", mapOf("module" to "directory"))
        assertEquals(repeated, runtime.state)

        runtime.dispatch("reader.module.switch", mapOf("module" to "appearance"))
        assertEquals("appearance", runtime.state.overlay)
        runtime.dispatch("reader.control.toggle", mapOf("overlay" to "reader-control"))
        assertNull(runtime.state.overlay)
        assertEquals(routeBefore, runtime.state.routeId)
    }

    @Test
    fun readerControlActionsFailClosedOutsideReaderOverlayFamily() {
        val outsideReader = ReaderUIRuntime()
        assertEquals("READER_ROUTE_GUARD", assertFailsWith<ReaderUIRuntimeException> {
            outsideReader.dispatch("reader.control.toggle", mapOf("overlay" to "reader-control"))
        }.code)

        val runtime = activeReaderRuntime()
        assertEquals("READER_CONTROL_OVERLAY_GUARD", assertFailsWith<ReaderUIRuntimeException> {
            runtime.dispatch("reader.module.switch", mapOf("module" to "tts"))
        }.code)
        runtime.dispatch("overlay.dialog.open")
        assertEquals("READER_CONTROL_OVERLAY_GUARD", assertFailsWith<ReaderUIRuntimeException> {
            runtime.dispatch("reader.control.toggle", mapOf("overlay" to "reader-control"))
        }.code)
        assertEquals("INVALID_TYPED_PAYLOAD", assertFailsWith<ReaderUIRuntimeException> {
            runtime.dispatch("reader.module.switch", mapOf("module" to "search"))
        }.code)
    }

    @Test
    fun unknownEventFailsClosed() {
        val error = assertFailsWith<ReaderUIRuntimeException> {
            ReaderUIRuntime().dispatch("platform.local.event")
        }
        assertEquals("UNSUPPORTED_EVENT", error.code)
    }
}
