import XCTest
@testable import ReaderUIRuntime

final class ReaderUIRuntimeTests: XCTestCase {
    private func activeReaderRuntime(
        pageIndex: Int = 0,
        canonicalLocation: String? = nil
    ) -> ReaderUIRuntime {
        ReaderUIRuntime(
            state: ReaderUIState(
                routeId: "immersive-reading",
                routeStack: ["bookshelf"],
                readerPageIndex: pageIndex,
                readerCanonicalLocation: canonicalLocation
            )
        )
    }

    private func measuredPageLayout(targetPageIndex: Int = 5, viewportWidth: Int = 390) -> ReaderUIPageLayout {
        ReaderUIPageLayout(
            anchor: "chapter-4:offset-120",
            targetPageIndex: targetPageIndex,
            chapterIndex: 4,
            chapterOffset: 120,
            chapterProgress: 0.42,
            viewportWidth: viewportWidth,
            viewportHeight: 844,
            fontScale: 1
        )
    }

    func testRecursiveJSONPayloadRoundTripsWithoutStringifyingTypes() throws {
        let payload: ReaderUIJSONPayload = [
            "kind": "bookSource",
            "input": [
                "sourceId": "source-1",
                "rules": [
                    "search": [["selector": ".book", "enabled": true, "weight": 2.5, "optional": nil]],
                ],
                "bookSource": [
                    "bookSourceName": "Source One",
                    "bookSourceUrl": "https://source.test",
                    "chapters": [1, 2, ["title": "three", "cached": false]],
                ],
            ],
        ]
        let encoded = try JSONEncoder().encode(ReaderUIJSONValue.object(payload))
        let decoded = try JSONDecoder().decode(ReaderUIJSONValue.self, from: encoded)
        XCTAssertEqual(decoded, .object(payload))

        let runtime = ReaderUIRuntime()
        let transition = try runtime.dispatch(
            event: "import.start",
            jsonPayload: payload,
            correlationId: "json-roundtrip"
        )
        XCTAssertEqual(transition.effects.first?.jsonPayload, payload)
        XCTAssertNil(transition.effects.first?.legacyStringPayload)
        XCTAssertEqual(transition.effects.first?.payload, ["kind": "bookSource"])

        let hostCompatible = ReaderUIEffect(
            kind: .host,
            type: "timer.foreground.arm",
            payload: ["delayMs": "5000", "oneShot": "true"]
        )
        XCTAssertEqual(hostCompatible.payload["delayMs"], "5000")
        XCTAssertEqual(hostCompatible.jsonPayload["delayMs"], .string("5000"))

        XCTAssertThrowsError(
            try runtime.dispatch(
                event: "import.start",
                jsonPayload: ["invalid": .number(.infinity)],
                correlationId: "json-invalid"
            )
        ) { error in
            XCTAssertEqual((error as? ReaderUIRuntimeFailure)?.code, "INVALID_JSON_PAYLOAD")
        }
    }

    func testRecursiveJSONResultBoundaryPreservesTypesAndFailsClosed() throws {
        let runtime = activeReaderRuntime(pageIndex: 2, canonicalLocation: "old")
        _ = try runtime.dispatch(event: "reader.page.next", correlationId: "json-result")
        _ = try runtime.providePageLayout(
            correlationId: "json-result",
            layout: measuredPageLayout(targetPageIndex: 3)
        )
        let accepted = try runtime.acceptPageLocationJSONResult(
            correlationId: "json-result",
            result: [
                "canonicalLocation": "chapter-4:p3",
                "pageIndex": 3,
            ]
        )
        XCTAssertTrue(accepted.accepted)
        XCTAssertEqual(runtime.state.readerPageIndex, 3)
        XCTAssertEqual(runtime.state.readerCanonicalLocation, "chapter-4:p3")

        _ = try runtime.dispatch(event: "reader.page.next", correlationId: "json-result-invalid")
        _ = try runtime.providePageLayout(
            correlationId: "json-result-invalid",
            layout: measuredPageLayout(targetPageIndex: 4)
        )
        XCTAssertThrowsError(
            try runtime.acceptPageLocationJSONResult(
                correlationId: "json-result-invalid",
                result: [
                    "canonicalLocation": "chapter-4:p4",
                    "pageIndex": 4,
                    "metadata": ["ratio": .number(.infinity)],
                ]
            )
        ) { error in
            XCTAssertEqual((error as? ReaderUIRuntimeFailure)?.code, "INVALID_JSON_RESULT")
        }
        XCTAssertEqual(runtime.state.pageTransaction?.stage, "resolving-location")
    }

    func testGeneratedTypedPayloadFixturesHaveExactParity() throws {
        XCTAssertEqual(GeneratedRuntimeTypedPayloadContracts.byEvent.count, 61)
        XCTAssertEqual(GENERATED_RUNTIME_TYPED_PAYLOAD_FIXTURES.count, 170)
        for fixture in GENERATED_RUNTIME_TYPED_PAYLOAD_FIXTURES {
            if fixture.valid {
                XCTAssertNotNil(try validateReaderUITypedPayload(event: fixture.event, payload: fixture.payload), fixture.id)
            } else {
                XCTAssertThrowsError(
                    try validateReaderUITypedPayload(event: fixture.event, payload: fixture.payload),
                    fixture.id
                ) { error in
                    XCTAssertEqual((error as? ReaderUIRuntimeFailure)?.code, "INVALID_TYPED_PAYLOAD", fixture.id)
                }
            }
        }
    }

    func testGeneratedTypedResultFixturesHaveExactParity() throws {
        XCTAssertEqual(GENERATED_RUNTIME_TYPED_RESULT_FIXTURES.count, 142)
        for fixture in GENERATED_RUNTIME_TYPED_RESULT_FIXTURES {
            if fixture.valid {
                XCTAssertNoThrow(
                    try validateReaderUITypedResult(
                        event: fixture.event,
                        effectType: fixture.effectType,
                        result: fixture.result
                    ),
                    fixture.id
                )
            } else {
                XCTAssertThrowsError(
                    try validateReaderUITypedResult(
                        event: fixture.event,
                        effectType: fixture.effectType,
                        result: fixture.result
                    ),
                    fixture.id
                ) { error in
                    XCTAssertEqual((error as? ReaderUIRuntimeFailure)?.code, "INVALID_TYPED_RESULT", fixture.id)
                }
            }
        }
    }

    func testBookOpenIsSerialResultDependentTransaction() throws {
        let runtime = ReaderUIRuntime()
        let transition = try runtime.dispatch(
            event: "book.open",
            jsonPayload: [
                "bookId": .string("book-1"),
                "sourceId": .string("source-1"),
                "sourceKind": .string("remote"),
                "chapterIndex": .number(1)
            ],
            correlationId: "open-1"
        )

        XCTAssertEqual(transition.state.routeId, "immersive-reading")
        XCTAssertTrue(transition.state.loading)
        XCTAssertEqual(transition.effects.map(\.type), ["source.detail"])

        XCTAssertEqual(
            runtime.acceptBookOpenResult(coreType: "source.detail", correlationId: "open-1").effects.map(\.type),
            ["chapter.list"]
        )
        let toc = runtime.acceptBookOpenResult(coreType: "chapter.list", correlationId: "open-1", chapterCount: 3)
        XCTAssertEqual(toc.effects.map(\.type), ["content.load"])
        XCTAssertEqual(toc.effects.first?.jsonPayload["chapterIndex"], .number(1))
        XCTAssertTrue(runtime.acceptBookOpenResult(coreType: "content.load", correlationId: "open-1").accepted)
        XCTAssertTrue(runtime.state.bookOpenTransaction?.awaitingLayout == true)

        let layout = try runtime.provideBookOpenLayout(
            correlationId: "open-1",
            layout: ReaderUIBookOpenLayout(
                chapterOffset: 12,
                chapterProgress: 0.4,
                viewportWidth: 390,
                viewportHeight: 844,
                fontScale: 1
            )
        )
        XCTAssertEqual(layout.effects.map(\.type), ["reader.location.resolve"])
        XCTAssertTrue(runtime.acceptBookOpenResult(
            coreType: "reader.location.resolve",
            correlationId: "open-1",
            canonicalLocation: "chapter:1:offset:12",
            pageIndex: 1
        ).accepted)
        XCTAssertEqual(runtime.state.readerCanonicalLocation, "chapter:1:offset:12")
        XCTAssertEqual(runtime.state.readerPageIndex, 1)
        XCTAssertNil(runtime.state.bookOpenTransaction)
        XCTAssertFalse(runtime.state.loading)
    }

    func testBookOpenSupersedesAndCancelsStaleTransaction() throws {
        let runtime = ReaderUIRuntime()
        _ = try runtime.dispatch(
            event: "book.open",
            payload: ["bookId": "a", "sourceId": "s", "sourceKind": "remote"],
            correlationId: "open-a"
        )
        let replacement = try runtime.dispatch(
            event: "book.open",
            payload: ["bookId": "b", "sourceId": "s", "sourceKind": "remote"],
            correlationId: "open-b"
        )
        XCTAssertEqual(replacement.cancelledCorrelationIds, ["open-a"])
        XCTAssertFalse(runtime.acceptBookOpenResult(coreType: "source.detail", correlationId: "open-a").accepted)
        XCTAssertTrue(runtime.cancelBookOpen(correlationId: "open-b").accepted)
        XCTAssertEqual(runtime.state.routeId, "bookshelf")
    }

    func testLocalBookOpenSkipsDetailAndStopsOnEmptyToc() throws {
        let runtime = ReaderUIRuntime()
        let start = try runtime.dispatch(
            event: "book.open",
            payload: ["bookId": "local-1", "sourceId": "local", "sourceKind": "local"],
            correlationId: "local-open"
        )
        XCTAssertEqual(start.effects.map(\.type), ["chapter.list"])
        let empty = runtime.acceptBookOpenResult(coreType: "chapter.list", correlationId: "local-open", chapterCount: 0)
        XCTAssertTrue(empty.accepted)
        XCTAssertTrue(empty.effects.isEmpty)
        XCTAssertEqual(runtime.state.error, "BOOK_OPEN_EMPTY_TOC")
    }

    func testPageCommitsOnlyMatchingCanonicalLocationResult() throws {
        let runtime = activeReaderRuntime(pageIndex: 4, canonicalLocation: "old-location")
        let start = try runtime.dispatch(event: "reader.page.next", correlationId: "page-1")
        XCTAssertTrue(start.effects.isEmpty)
        XCTAssertEqual(runtime.state.readerPageIndex, 4)

        XCTAssertThrowsError(
            try runtime.providePageLayout(correlationId: "page-1", layout: measuredPageLayout(viewportWidth: 0))
        ) { error in
            XCTAssertEqual((error as? ReaderUIRuntimeFailure)?.code, "INVALID_PAGE_LAYOUT")
        }
        XCTAssertEqual(runtime.state.readerCanonicalLocation, "old-location")

        XCTAssertEqual(
            try runtime.providePageLayout(correlationId: "page-1", layout: measuredPageLayout()).effects.map(\.type),
            ["reader.location.resolve"]
        )
        XCTAssertFalse(
            runtime.acceptPageLocationResult(
                correlationId: "other",
                canonicalLocation: "late",
                pageIndex: 5
            ).accepted
        )
        XCTAssertTrue(runtime.acceptPageLocationResult(correlationId: "page-1", error: "LOCATION_FAILED").accepted)
        XCTAssertEqual(runtime.state.readerPageIndex, 4)
        XCTAssertEqual(runtime.state.readerCanonicalLocation, "old-location")
        XCTAssertFalse(
            runtime.acceptPageLocationResult(
                correlationId: "page-1",
                canonicalLocation: "late",
                pageIndex: 5
            ).accepted
        )

        _ = try runtime.dispatch(event: "reader.page.next", correlationId: "page-invalid")
        _ = try runtime.providePageLayout(
            correlationId: "page-invalid",
            layout: measuredPageLayout(targetPageIndex: 5)
        )
        XCTAssertTrue(
            runtime.acceptPageLocationResult(
                correlationId: "page-invalid",
                canonicalLocation: "   ",
                pageIndex: 5
            ).accepted
        )
        XCTAssertEqual(runtime.state.error, "PAGE_LOCATION_INVALID_RESULT")
        XCTAssertEqual(runtime.state.readerPageIndex, 4)
        XCTAssertEqual(runtime.state.readerCanonicalLocation, "old-location")

        _ = try runtime.dispatch(event: "reader.page.prev", correlationId: "page-2")
        _ = try runtime.providePageLayout(correlationId: "page-2", layout: measuredPageLayout(targetPageIndex: 3))
        XCTAssertTrue(
            runtime.acceptPageLocationResult(
                correlationId: "page-2",
                canonicalLocation: "canonical-ch4-p3",
                pageIndex: 3
            ).accepted
        )
        XCTAssertEqual(runtime.state.readerPageIndex, 3)
        XCTAssertEqual(runtime.state.readerCanonicalLocation, "canonical-ch4-p3")
        XCTAssertFalse(
            runtime.acceptPageLocationResult(
                correlationId: "page-2",
                canonicalLocation: "duplicate",
                pageIndex: 9
            ).accepted
        )
    }

    func testPageSupersessionAndExplicitLocationShareOneTransaction() throws {
        let runtime = activeReaderRuntime()
        _ = try runtime.dispatch(event: "reader.page.next", correlationId: "page-a")
        let replacement = try runtime.dispatch(event: "reader.page.prev", correlationId: "page-b")
        XCTAssertEqual(replacement.cancelledCorrelationIds, ["page-a"])
        XCTAssertFalse(
            try runtime.providePageLayout(correlationId: "page-a", layout: measuredPageLayout()).accepted
        )
        let explicit = try runtime.beginPageStep(
            direction: "explicit",
            correlationId: "page-explicit",
            payload: ["reason": "chapter-jump"]
        )
        XCTAssertEqual(explicit.cancelledCorrelationIds, ["page-b"])
        let resolving = try runtime.providePageLayout(
            correlationId: "page-explicit",
            layout: measuredPageLayout(targetPageIndex: 0)
        )
        XCTAssertEqual(resolving.effects.first?.jsonPayload["direction"], .string("explicit"))
        XCTAssertEqual(resolving.effects.first?.jsonPayload["reason"], .string("chapter-jump"))
    }

    func testTTSPlanQueueSpeechAndOrderedTeardown() throws {
        let runtime = activeReaderRuntime()
        let start = try runtime.dispatch(
            event: "reader.tts.start",
            payload: ["voice": "system-default"],
            correlationId: "tts-1"
        )
        XCTAssertEqual(start.effects.map(\.type), ["tts.queue.plan"])
        XCTAssertNil(runtime.state.activeSession)
        XCTAssertFalse(runtime.acceptTTSCoreResult(coreType: "tts.queue.start", correlationId: "tts-1").accepted)
        XCTAssertEqual(
            runtime.acceptTTSCoreResult(coreType: "tts.queue.plan", correlationId: "tts-1").effects.map(\.type),
            ["tts.queue.start"]
        )
        XCTAssertFalse(runtime.acceptTTSCoreResult(coreType: "tts.queue.plan", correlationId: "tts-1").accepted)
        XCTAssertEqual(
            runtime.acceptTTSCoreResult(coreType: "tts.queue.start", correlationId: "tts-1").effects.map(\.type),
            ["tts.system.start"]
        )
        XCTAssertTrue(runtime.acceptTTSSystemStart(correlationId: "tts-1").accepted)
        XCTAssertEqual(runtime.state.activeSession, "tts")
        let stop = try runtime.dispatch(event: "reader.tts.stop", correlationId: "tts-1")
        XCTAssertEqual(stop.effects.map(\.type), ["tts.system.stop", "tts.queue.stop"])
        XCTAssertEqual(stop.cancelledCorrelationIds, ["tts-1"])
        XCTAssertFalse(runtime.acceptTTSSystemStart(correlationId: "tts-1").accepted)
    }

    func testTTSSystemFailureTeardownIsSystemThenQueue() throws {
        let runtime = activeReaderRuntime()
        _ = try runtime.dispatch(event: "reader.tts.start", correlationId: "tts-error")
        _ = runtime.acceptTTSCoreResult(coreType: "tts.queue.plan", correlationId: "tts-error")
        _ = runtime.acceptTTSCoreResult(coreType: "tts.queue.start", correlationId: "tts-error")
        let failure = runtime.acceptTTSSystemStart(correlationId: "tts-error", error: "SPEECH_FAILED")
        XCTAssertEqual(failure.effects.map(\.type), ["tts.system.stop", "tts.queue.stop"])
        XCTAssertNil(runtime.state.ttsTransaction)
        XCTAssertNil(runtime.state.activeSession)
        XCTAssertFalse(runtime.acceptTTSSystemStart(correlationId: "tts-error").accepted)
    }

    func testAutoPageOneShotCommitRearmAndBackgroundInvalidation() throws {
        let runtime = activeReaderRuntime(pageIndex: 1, canonicalLocation: "page-1")
        let start = try runtime.dispatch(
            event: "reader.autoPage.start",
            payload: ["intervalMs": "5000"],
            correlationId: "auto-1"
        )
        XCTAssertEqual(start.effects.map(\.type), [ReaderUIPlaybackDirective.foregroundTimerArm])
        XCTAssertEqual(start.effects.first?.jsonPayload["timerId"], .string("auto-1"))
        XCTAssertEqual(start.effects.first?.jsonPayload["correlationId"], .string("auto-1"))
        XCTAssertEqual(start.effects.first?.jsonPayload["delayMs"], .number(5000))
        XCTAssertEqual(start.effects.first?.jsonPayload["oneShot"], .bool(true))
        XCTAssertEqual(start.effects.first?.jsonPayload["foregroundOnly"], .bool(true))
        XCTAssertEqual(start.effects.first?.payload["delayMs"], "5000")
        XCTAssertEqual(start.effects.first?.payload["oneShot"], "true")
        let generation = try XCTUnwrap(runtime.state.autoPageTransaction?.generation)
        XCTAssertEqual(start.effects.first?.jsonPayload["generation"], .number(Double(generation)))
        XCTAssertFalse(try runtime.acceptAutoPageTimerFired(correlationId: "auto-1", generation: generation + 1).accepted)
        let fired = try runtime.acceptAutoPageTimerFired(correlationId: "auto-1", generation: generation)
        let pageCorrelation = try XCTUnwrap(fired.state.pageTransaction?.correlationId)
        XCTAssertFalse(try runtime.acceptAutoPageTimerFired(correlationId: "auto-1", generation: generation).accepted)
        _ = try runtime.providePageLayout(
            correlationId: pageCorrelation,
            layout: measuredPageLayout(targetPageIndex: 2)
        )
        let committed = runtime.acceptPageLocationResult(
            correlationId: pageCorrelation,
            canonicalLocation: "page-2",
            pageIndex: 2
        )
        XCTAssertEqual(committed.effects.map(\.type), [ReaderUIPlaybackDirective.foregroundTimerArm])
        XCTAssertEqual(runtime.state.readerPageIndex, 2)

        let second = try runtime.acceptAutoPageTimerFired(correlationId: "auto-1", generation: generation)
        let secondPage = try XCTUnwrap(second.state.pageTransaction?.correlationId)
        let background = runtime.suspendAutoPageForBackground(correlationId: "auto-1")
        XCTAssertEqual(background.effects.map(\.type), [ReaderUIPlaybackDirective.foregroundTimerCancel])
        XCTAssertEqual(background.cancelledCorrelationIds, ["auto-1", secondPage])
        XCTAssertGreaterThan(runtime.state.playbackGeneration, generation)
        XCTAssertFalse(try runtime.acceptAutoPageTimerFired(correlationId: "auto-1", generation: generation).accepted)
    }

    func testManualPageStopsAutoAndAutoRejectsPendingManualAtomically() throws {
        let runtime = activeReaderRuntime()
        _ = try runtime.dispatch(
            event: "reader.autoPage.start",
            payload: ["intervalMs": "4000"],
            correlationId: "auto-manual"
        )
        let generation = runtime.state.playbackGeneration
        let manual = try runtime.dispatch(event: "reader.page.next", correlationId: "manual-1")
        XCTAssertEqual(manual.effects.map(\.type), [ReaderUIPlaybackDirective.foregroundTimerCancel])
        XCTAssertEqual(manual.cancelledCorrelationIds, ["auto-manual"])
        XCTAssertNil(runtime.state.activeSession)
        XCTAssertGreaterThan(runtime.state.playbackGeneration, generation)
        let before = runtime.state
        XCTAssertThrowsError(
            try runtime.dispatch(
                event: "reader.autoPage.start",
                payload: ["intervalMs": "4000"],
                correlationId: "auto-rejected"
            )
        ) { error in
            XCTAssertEqual((error as? ReaderUIRuntimeFailure)?.code, "PAGE_TRANSACTION_PENDING")
        }
        XCTAssertEqual(runtime.state, before)
    }

    func testTTSAndAutoPageReplaceEachOtherWithOrderedExactlyOnceTeardown() throws {
        let runtime = activeReaderRuntime()
        _ = try runtime.dispatch(event: "reader.tts.start", correlationId: "tts-playing")
        _ = runtime.acceptTTSCoreResult(coreType: "tts.queue.plan", correlationId: "tts-playing")
        _ = runtime.acceptTTSCoreResult(coreType: "tts.queue.start", correlationId: "tts-playing")
        _ = runtime.acceptTTSSystemStart(correlationId: "tts-playing")

        let auto = try runtime.dispatch(
            event: "reader.autoPage.start",
            payload: ["intervalMs": "3000"],
            correlationId: "auto-after-tts"
        )
        XCTAssertEqual(
            auto.effects.map(\.type),
            ["tts.system.stop", "tts.queue.stop", ReaderUIPlaybackDirective.foregroundTimerArm]
        )
        XCTAssertEqual(auto.cancelledCorrelationIds, ["tts-playing"])

        let tts = try runtime.dispatch(event: "reader.tts.start", correlationId: "tts-after-auto")
        XCTAssertEqual(
            tts.effects.map(\.type),
            [ReaderUIPlaybackDirective.foregroundTimerCancel, "tts.queue.plan"]
        )
        XCTAssertEqual(tts.cancelledCorrelationIds, ["auto-after-tts"])
    }

    func testReaderExitInvalidatesAutoPageGenerationBeforeRoutePop() throws {
        let runtime = activeReaderRuntime()
        _ = try runtime.dispatch(
            event: "reader.autoPage.start",
            payload: ["intervalMs": "3000"],
            correlationId: "auto-exit"
        )
        let generation = try XCTUnwrap(runtime.state.autoPageTransaction?.generation)
        let exit = try runtime.dispatch(event: "reader.exit")
        XCTAssertEqual(exit.effects.map(\.type), [ReaderUIPlaybackDirective.foregroundTimerCancel])
        XCTAssertEqual(exit.cancelledCorrelationIds, ["auto-exit"])
        XCTAssertEqual(exit.state.routeId, "bookshelf")
        XCTAssertGreaterThan(exit.state.playbackGeneration, generation)
        XCTAssertFalse(try runtime.acceptAutoPageTimerFired(correlationId: "auto-exit", generation: generation).accepted)
    }

    func testBookOpenPreflightIsAtomicBeforePlaybackTeardown() throws {
        let runtime = activeReaderRuntime()
        _ = try runtime.dispatch(event: "reader.tts.start", correlationId: "tts-nav")
        _ = runtime.acceptTTSCoreResult(coreType: "tts.queue.plan", correlationId: "tts-nav")
        _ = runtime.acceptTTSCoreResult(coreType: "tts.queue.start", correlationId: "tts-nav")
        _ = runtime.acceptTTSSystemStart(correlationId: "tts-nav")
        let before = runtime.state
        XCTAssertThrowsError(
            try runtime.dispatch(
                event: "book.open",
                payload: ["bookId": "b", "sourceId": "s", "sourceKind": "invalid"],
                correlationId: "open-bad"
            )
        ) { error in
            XCTAssertEqual((error as? ReaderUIRuntimeFailure)?.code, "INVALID_TYPED_PAYLOAD")
        }
        XCTAssertEqual(runtime.state, before)
        let open = try runtime.dispatch(
            event: "book.open",
            payload: ["bookId": "b", "sourceId": "s", "sourceKind": "remote"],
            correlationId: "open-good"
        )
        XCTAssertEqual(open.effects.map(\.type), ["tts.system.stop", "tts.queue.stop", "source.detail"])
        XCTAssertEqual(open.cancelledCorrelationIds, ["tts-nav"])
    }

    func testTabSwitchFailsClosedWhileOverlayIsOpen() throws {
        let runtime = ReaderUIRuntime()
        _ = try runtime.dispatch(event: "overlay.sheet.open")

        XCTAssertThrowsError(try runtime.dispatch(event: "mainTab.select", payload: ["tab": "rss"])) { error in
            XCTAssertEqual((error as? ReaderUIRuntimeFailure)?.code, "OVERLAY_GUARD")
        }
        XCTAssertEqual(runtime.state.tab, "bookshelf")
    }

    func testDirectoryCloseOnlyClearsDirectoryOverlay() throws {
        let runtime = ReaderUIRuntime()
        _ = try runtime.dispatch(event: "reader.directory.open")
        _ = try runtime.dispatch(event: "reader.directory.close")
        XCTAssertNil(runtime.state.overlay)

        _ = try runtime.dispatch(event: "reader.directory.open")
        _ = try runtime.dispatch(event: "overlay.sheet.open")
        _ = try runtime.dispatch(event: "reader.directory.close")
        XCTAssertEqual(runtime.state.overlay, "sheet")
    }

    func testUnknownEventFailsClosed() {
        let runtime = ReaderUIRuntime()
        XCTAssertThrowsError(try runtime.dispatch(event: "platform.local.event")) { error in
            XCTAssertEqual((error as? ReaderUIRuntimeFailure)?.code, "UNSUPPORTED_EVENT")
        }
    }
}
