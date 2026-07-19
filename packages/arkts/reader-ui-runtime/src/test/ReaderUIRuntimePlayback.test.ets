import { describe, it, expect } from '@ohos/hypium'
import {
  GENERATED_RUNTIME_TYPED_PAYLOAD_FIXTURES,
  RuntimeTypedPayloadFixture
} from './GeneratedRuntimeTypedPayloadFixtures'
import {
  GENERATED_RUNTIME_TYPED_RESULT_FIXTURES,
  RuntimeTypedResultFixture
} from './GeneratedRuntimeTypedResultFixtures'
import { GENERATED_RUNTIME_TYPED_PAYLOAD_CONTRACTS } from '../main/ets/GeneratedRuntimeTypedPayloadContracts'
import {
  READER_FOREGROUND_TIMER_ARM,
  READER_FOREGROUND_TIMER_CANCEL,
  ReaderUIEffect,
  ReaderUIJSONPayload,
  ReaderUIJSONValue,
  ReaderUIPageLayout,
  ReaderUIRuntime,
  ReaderUIRuntimeError,
  ReaderUIState,
  validateReaderUITypedPayload,
  validateReaderUITypedResult
} from '../main/ets/ReaderUIRuntime'

function activeReaderRuntime(pageIndex: number = 0, canonicalLocation?: string): ReaderUIRuntime {
  const state: ReaderUIState = {
    routeId: 'immersive-reading',
    routeStack: ['bookshelf'],
    tab: 'bookshelf',
    loading: false,
    reducedMotion: false,
    readerPageIndex: pageIndex,
    readerCanonicalLocation: canonicalLocation
  }
  return new ReaderUIRuntime(state)
}

function measuredPageLayout(targetPageIndex: number = 5): ReaderUIPageLayout {
  return {
    anchor: 'chapter-4:offset-120',
    targetPageIndex: targetPageIndex,
    chapterIndex: 4,
    chapterOffset: 120,
    chapterProgress: 0.42,
    viewportWidth: 390,
    viewportHeight: 844,
    fontScale: 1
  }
}

function effectTypes(effects: ReaderUIEffect[]): string {
  const types: string[] = []
  effects.forEach((effect: ReaderUIEffect): void => {
    types.push(effect.type)
  })
  return types.join(',')
}

export default function ReaderUIRuntimePlaybackTests(): void {
  describe('ReaderUIRuntimePlayback', (): void => {
    it('recursive JSON payload preserves object array number boolean and null', 0, (): void => {
      const rule: ReaderUIJSONPayload = {
        'selector': '.book',
        'enabled': true,
        'weight': 2.5,
        'optional': null
      }
      const chapterThree: ReaderUIJSONPayload = { 'title': 'three', 'cached': false }
      const chapters: ReaderUIJSONValue[] = []
      chapters.push(1)
      chapters.push(2)
      chapters.push(chapterThree)
      const bookSource: ReaderUIJSONPayload = {
        'bookSourceName': 'Source One',
        'bookSourceUrl': 'https://source.test',
        'chapters': chapters
      }
      const rules: ReaderUIJSONPayload = { 'search': [rule] }
      const input: ReaderUIJSONPayload = {
        'sourceId': 'source-1',
        'rules': rules,
        'bookSource': bookSource
      }
      const payload: ReaderUIJSONPayload = {
        'kind': 'bookSource',
        'input': input
      }
      const runtime: ReaderUIRuntime = new ReaderUIRuntime()
      const transition = runtime.dispatch('import.start', payload, 'json-roundtrip')
      const canonical: ReaderUIJSONPayload = transition.effects[0].jsonPayload as ReaderUIJSONPayload
      expect(JSON.stringify(canonical)).assertEqual(JSON.stringify(payload))
      expect(transition.effects[0].payload['kind']).assertEqual('bookSource')
      expect(transition.effects[0].legacyPayloadIsComplete).assertFalse()

      input['sourceId'] = 'mutated-after-dispatch'
      chapters.push(4)
      const capturedInput: ReaderUIJSONPayload = canonical['input'] as ReaderUIJSONPayload
      const capturedBookSource: ReaderUIJSONPayload = capturedInput['bookSource'] as ReaderUIJSONPayload
      const capturedChapters: ReaderUIJSONValue[] = capturedBookSource['chapters'] as ReaderUIJSONValue[]
      expect(capturedInput['sourceId']).assertEqual('source-1')
      expect(capturedChapters.length).assertEqual(3)

      const hostCompatible: ReaderUIEffect = {
        kind: 'host',
        type: 'timer.foreground.arm',
        payload: { 'delayMs': '5000', 'oneShot': 'true' }
      }
      expect(hostCompatible.payload['delayMs']).assertEqual('5000')

      let invalidCode: string = ''
      try {
        runtime.dispatch('import.start', { 'invalid': Number.NaN }, 'json-invalid')
      } catch (error) {
        invalidCode = (error as ReaderUIRuntimeError).code
      }
      expect(invalidCode).assertEqual('INVALID_JSON_PAYLOAD')

      const cyclic: ReaderUIJSONPayload = {}
      cyclic['self'] = cyclic
      let cyclicCode: string = ''
      try {
        runtime.dispatch('import.start', cyclic, 'json-cycle')
      } catch (error) {
        cyclicCode = (error as ReaderUIRuntimeError).code
      }
      expect(cyclicCode).assertEqual('INVALID_JSON_PAYLOAD')
    })

    it('recursive JSON result boundary preserves types and fails closed', 0, (): void => {
      const runtime: ReaderUIRuntime = activeReaderRuntime(2, 'old')
      runtime.dispatch('reader.page.next', {}, 'json-result')
      runtime.providePageLayout('json-result', measuredPageLayout(3))

      const result: ReaderUIJSONPayload = {
        'canonicalLocation': 'chapter-4:p3',
        'pageIndex': 3
      }
      expect(runtime.acceptPageLocationJSONResult('json-result', result).accepted).assertTrue()
      expect(runtime.state.readerPageIndex).assertEqual(2)
      expect(runtime.acceptPageProgressJSONResult('json-result', { 'stored': true }).accepted).assertTrue()
      expect(runtime.state.readerPageIndex).assertEqual(3)
      expect(runtime.state.readerCanonicalLocation).assertEqual('chapter-4:p3')

      runtime.dispatch('reader.page.next', {}, 'json-result-invalid')
      runtime.providePageLayout('json-result-invalid', measuredPageLayout(4))
      const invalidMetadata: ReaderUIJSONPayload = { 'ratio': Number.NaN }
      let invalidCode: string = ''
      try {
        runtime.acceptPageLocationJSONResult('json-result-invalid', {
          'canonicalLocation': 'chapter-4:p4',
          'pageIndex': 4,
          'metadata': invalidMetadata
        })
      } catch (error) {
        invalidCode = (error as ReaderUIRuntimeError).code
      }
      expect(invalidCode).assertEqual('INVALID_JSON_RESULT')
      expect(runtime.state.pageTransaction?.stage).assertEqual('resolving-location')
    })

    it('generated typed payload fixtures have exact parity', 0, (): void => {
      expect(GENERATED_RUNTIME_TYPED_PAYLOAD_FIXTURES.length).assertEqual(170)
      expect(Object.keys(GENERATED_RUNTIME_TYPED_PAYLOAD_CONTRACTS).length).assertEqual(63)
      GENERATED_RUNTIME_TYPED_PAYLOAD_FIXTURES.forEach((fixture: RuntimeTypedPayloadFixture): void => {
        if (fixture.valid) {
          expect(validateReaderUITypedPayload(fixture.event, fixture.payload) !== undefined).assertTrue()
        } else {
          let code: string = ''
          try {
            validateReaderUITypedPayload(fixture.event, fixture.payload)
          } catch (error) {
            code = (error as ReaderUIRuntimeError).code
          }
          expect(code).assertEqual('INVALID_TYPED_PAYLOAD')
        }
      })
    })

    it('generated typed result fixtures have exact parity', 0, (): void => {
      expect(GENERATED_RUNTIME_TYPED_RESULT_FIXTURES.length).assertEqual(154)
      GENERATED_RUNTIME_TYPED_RESULT_FIXTURES.forEach((fixture: RuntimeTypedResultFixture): void => {
        if (fixture.valid) {
          expect(validateReaderUITypedResult(fixture.event, fixture.effectType, fixture.result).effectKind.length > 0)
            .assertTrue()
        } else {
          let code: string = ''
          try {
            validateReaderUITypedResult(fixture.event, fixture.effectType, fixture.result)
          } catch (error) {
            code = (error as ReaderUIRuntimeError).code
          }
          expect(code).assertEqual('INVALID_TYPED_RESULT')
        }
      })
    })

    it('page commits only matching canonical result and ignores late result', 0, (): void => {
      const runtime: ReaderUIRuntime = activeReaderRuntime(4, 'old-location')
      const start = runtime.dispatch('reader.page.next', {}, 'page-1')
      expect(start.effects.length).assertEqual(0)
      expect(runtime.state.readerPageIndex).assertEqual(4)

      let invalidLayoutCode: string = ''
      try {
        runtime.providePageLayout('page-1', {
          anchor: 'chapter-4:offset-120',
          targetPageIndex: 5,
          chapterIndex: 4,
          chapterOffset: 120,
          chapterProgress: 0.42,
          viewportWidth: 0,
          viewportHeight: 844,
          fontScale: 1
        })
      } catch (error) {
        invalidLayoutCode = (error as ReaderUIRuntimeError).code
      }
      expect(invalidLayoutCode).assertEqual('INVALID_PAGE_LAYOUT')
      expect(runtime.state.pageTransaction?.stage).assertEqual('awaiting-layout')
      expect(runtime.state.readerCanonicalLocation).assertEqual('old-location')

      const resolving = runtime.providePageLayout('page-1', measuredPageLayout())
      expect(effectTypes(resolving.effects)).assertEqual('reader.location.resolve')
      expect(runtime.acceptPageLocationResult('other', 'late', 5).accepted).assertFalse()
      expect(runtime.acceptPageLocationResult('page-1', undefined, undefined, 'LOCATION_FAILED').accepted).assertTrue()
      expect(runtime.state.readerPageIndex).assertEqual(4)
      expect(runtime.state.readerCanonicalLocation).assertEqual('old-location')
      expect(runtime.acceptPageLocationResult('page-1', 'late', 5).accepted).assertFalse()

      runtime.dispatch('reader.page.next', {}, 'page-invalid')
      runtime.providePageLayout('page-invalid', measuredPageLayout(5))
      expect(runtime.acceptPageLocationResult('page-invalid', '   ', 5).accepted).assertTrue()
      expect(runtime.state.error).assertEqual('PAGE_LOCATION_INVALID_RESULT')
      expect(runtime.state.readerPageIndex).assertEqual(4)
      expect(runtime.state.readerCanonicalLocation).assertEqual('old-location')

      runtime.dispatch('reader.page.prev', {}, 'page-2')
      runtime.providePageLayout('page-2', measuredPageLayout(3))
      const persisting = runtime.acceptPageLocationResult('page-2', 'canonical-ch4-p3', 3)
      expect(persisting.accepted).assertTrue()
      expect(effectTypes(persisting.effects)).assertEqual('reader.progress.update')
      expect(Object.keys(persisting.effects[0].jsonPayload).length).assertEqual(0)
      expect(runtime.state.pageTransaction?.stage).assertEqual('persisting-progress')
      expect(runtime.state.readerPageIndex).assertEqual(4)
      let pageBlockedCode: string = ''
      try {
        runtime.dispatch('reader.page.next', {}, 'page-blocked')
      } catch (error) {
        pageBlockedCode = (error as ReaderUIRuntimeError).code
      }
      expect(pageBlockedCode).assertEqual('PAGE_PROGRESS_COMMIT_PENDING')
      let autoBlockedCode: string = ''
      try {
        runtime.dispatch('reader.autoPage.start', { 'intervalMs': '4000' }, 'auto-blocked')
      } catch (error) {
        autoBlockedCode = (error as ReaderUIRuntimeError).code
      }
      expect(autoBlockedCode).assertEqual('PAGE_PROGRESS_COMMIT_PENDING')
      let cancelBlockedCode: string = ''
      try {
        runtime.cancelPageStep('page-2')
      } catch (error) {
        cancelBlockedCode = (error as ReaderUIRuntimeError).code
      }
      expect(cancelBlockedCode).assertEqual('PAGE_PROGRESS_COMMIT_PENDING')
      expect(runtime.acceptPageProgressResult('page-2', true).accepted).assertTrue()
      expect(runtime.state.readerPageIndex).assertEqual(3)
      expect(runtime.state.readerCanonicalLocation).assertEqual('canonical-ch4-p3')
      expect(runtime.acceptPageLocationResult('page-2', 'duplicate', 9).accepted).assertFalse()

      runtime.dispatch('reader.page.next', {}, 'page-progress-error')
      runtime.providePageLayout('page-progress-error', measuredPageLayout(4))
      runtime.acceptPageLocationResult('page-progress-error', 'canonical-ch4-p4', 4)
      expect(runtime.acceptPageProgressResult(
        'page-progress-error',
        undefined,
        'PROGRESS_STORE_FAILED'
      ).accepted).assertTrue()
      expect(runtime.state.readerPageIndex).assertEqual(3)
      expect(runtime.state.readerCanonicalLocation).assertEqual('canonical-ch4-p3')
      expect(runtime.state.error).assertEqual('PROGRESS_STORE_FAILED')
    })

    it('progress commit boundary blocks exit and book replacement without cross-route contamination', 0, (): void => {
      const runtime: ReaderUIRuntime = activeReaderRuntime(2, 'book-a-page-2')
      runtime.dispatch('reader.page.next', {}, 'page-boundary')
      runtime.providePageLayout('page-boundary', measuredPageLayout(3))
      runtime.acceptPageLocationResult('page-boundary', 'book-a-page-3', 3)

      let exitCode: string = ''
      try {
        runtime.dispatch('reader.exit')
      } catch (error) {
        exitCode = (error as ReaderUIRuntimeError).code
      }
      expect(exitCode).assertEqual('PAGE_PROGRESS_COMMIT_PENDING')
      let bookCode: string = ''
      try {
        runtime.dispatch(
          'book.open',
          { 'bookId': 'book-b', 'sourceId': 'source-b', 'sourceKind': 'remote' },
          'open-book-b'
        )
      } catch (error) {
        bookCode = (error as ReaderUIRuntimeError).code
      }
      expect(bookCode).assertEqual('PAGE_PROGRESS_COMMIT_PENDING')
      let routeCode: string = ''
      try {
        runtime.dispatch('route.replace', { 'routeId': 'bookshelf' })
      } catch (error) {
        routeCode = (error as ReaderUIRuntimeError).code
      }
      expect(routeCode).assertEqual('PAGE_PROGRESS_COMMIT_PENDING')
      let popCode: string = ''
      try {
        runtime.dispatch('route.pop')
      } catch (error) {
        popCode = (error as ReaderUIRuntimeError).code
      }
      expect(popCode).assertEqual('PAGE_PROGRESS_COMMIT_PENDING')
      let tabCode: string = ''
      try {
        runtime.dispatch('mainTab.select', { 'tab': 'settings' })
      } catch (error) {
        tabCode = (error as ReaderUIRuntimeError).code
      }
      expect(tabCode).assertEqual('PAGE_PROGRESS_COMMIT_PENDING')
      expect(runtime.state.routeId).assertEqual('immersive-reading')
      expect(runtime.state.pageTransaction?.correlationId).assertEqual('page-boundary')
      expect(runtime.state.readerPageIndex).assertEqual(2)

      expect(runtime.acceptPageProgressResult('page-boundary', true).accepted).assertTrue()
      const opened = runtime.dispatch(
        'book.open',
        { 'bookId': 'book-b', 'sourceId': 'source-b', 'sourceKind': 'remote' },
        'open-book-b'
      )
      expect(opened.state.bookOpenTransaction?.correlationId).assertEqual('open-book-b')
      let pageDuringOpenCode: string = ''
      try {
        runtime.dispatch('reader.page.next', {}, 'book-open-page')
      } catch (error) {
        pageDuringOpenCode = (error as ReaderUIRuntimeError).code
      }
      expect(pageDuringOpenCode).assertEqual('BOOK_OPEN_TRANSACTION_PENDING')
      expect(runtime.acceptPageProgressResult('page-boundary', true).accepted).assertFalse()
      expect(runtime.state.readerPageIndex).assertEqual(3)
      expect(runtime.state.readerCanonicalLocation).assertEqual('book-a-page-3')
    })

    it('tts advances plan queue speech exactly once and tears down in order', 0, (): void => {
      const runtime: ReaderUIRuntime = activeReaderRuntime()
      const start = runtime.dispatch('reader.tts.start', { 'voice': 'system-default' }, 'tts-1')
      expect(effectTypes(start.effects)).assertEqual('tts.queue.plan')
      expect(runtime.acceptTTSCoreResult('tts.queue.start', 'tts-1').accepted).assertFalse()
      expect(effectTypes(runtime.acceptTTSCoreResult('tts.queue.plan', 'tts-1').effects))
        .assertEqual('tts.queue.start')
      expect(runtime.acceptTTSCoreResult('tts.queue.plan', 'tts-1').accepted).assertFalse()
      expect(effectTypes(runtime.acceptTTSCoreResult('tts.queue.start', 'tts-1').effects))
        .assertEqual('tts.system.start')
      expect(runtime.acceptTTSSystemStart('tts-1').accepted).assertTrue()
      expect(runtime.state.activeSession).assertEqual('tts')
      const stop = runtime.dispatch('reader.tts.stop', {}, 'tts-1')
      expect(effectTypes(stop.effects)).assertEqual('tts.system.stop,tts.queue.stop')
      expect(stop.cancelledCorrelationIds.join(',')).assertEqual('tts-1')
      expect(runtime.acceptTTSSystemStart('tts-1').accepted).assertFalse()
    })

    it('system speech failure stops system before queue', 0, (): void => {
      const runtime: ReaderUIRuntime = activeReaderRuntime()
      runtime.dispatch('reader.tts.start', {}, 'tts-error')
      runtime.acceptTTSCoreResult('tts.queue.plan', 'tts-error')
      runtime.acceptTTSCoreResult('tts.queue.start', 'tts-error')
      const failed = runtime.acceptTTSSystemStart('tts-error', 'SPEECH_FAILED')
      expect(effectTypes(failed.effects)).assertEqual('tts.system.stop,tts.queue.stop')
      expect(runtime.state.ttsTransaction === undefined).assertTrue()
      expect(runtime.acceptTTSSystemStart('tts-error').accepted).assertFalse()
    })

    it('auto page is one shot and manual page cancels the armed timer', 0, (): void => {
      const runtime: ReaderUIRuntime = activeReaderRuntime(1, 'page-1')
      const start = runtime.dispatch('reader.autoPage.start', { 'intervalMs': '5000' }, 'auto-1')
      expect(effectTypes(start.effects)).assertEqual(READER_FOREGROUND_TIMER_ARM)
      const timerPayload: ReaderUIJSONPayload = start.effects[0].jsonPayload as ReaderUIJSONPayload
      expect(timerPayload['timerId']).assertEqual('auto-1')
      expect(timerPayload['correlationId']).assertEqual('auto-1')
      expect(timerPayload['delayMs']).assertEqual(5000)
      expect(timerPayload['oneShot']).assertEqual(true)
      expect(timerPayload['foregroundOnly']).assertEqual(true)
      expect(start.effects[0].payload['delayMs']).assertEqual('5000')
      expect(start.effects[0].payload['oneShot']).assertEqual('true')
      const generation: number = runtime.state.autoPageTransaction?.generation ?? -1
      expect(timerPayload['generation']).assertEqual(generation)
      const fired = runtime.acceptAutoPageTimerFired('auto-1', generation)
      expect(fired.accepted).assertTrue()
      expect(runtime.acceptAutoPageTimerFired('auto-1', generation).accepted).assertFalse()
      const pageCorrelation: string = runtime.state.pageTransaction?.correlationId ?? ''
      runtime.providePageLayout(pageCorrelation, measuredPageLayout(2))
      const persisting = runtime.acceptPageLocationResult(pageCorrelation, 'page-2', 2)
      expect(effectTypes(persisting.effects)).assertEqual('reader.progress.update')
      expect(runtime.state.readerPageIndex).assertEqual(1)
      const committed = runtime.acceptPageProgressResult(pageCorrelation, true)
      expect(effectTypes(committed.effects)).assertEqual(READER_FOREGROUND_TIMER_ARM)

      const beforeManualGeneration: number = runtime.state.playbackGeneration ?? 0
      const manual = runtime.dispatch('reader.page.next', {}, 'manual-1')
      expect(effectTypes(manual.effects)).assertEqual(READER_FOREGROUND_TIMER_CANCEL)
      expect(manual.cancelledCorrelationIds.join(',')).assertEqual('auto-1')
      expect(runtime.state.activeSession === undefined).assertTrue()
      expect((runtime.state.playbackGeneration ?? 0) > beforeManualGeneration).assertTrue()

      let failureCode: string = ''
      try {
        runtime.dispatch('reader.autoPage.start', { 'intervalMs': '5000' }, 'auto-rejected')
      } catch (error) {
        failureCode = (error as ReaderUIRuntimeError).code
      }
      expect(failureCode).assertEqual('PAGE_TRANSACTION_PENDING')
      expect(runtime.state.pageTransaction?.correlationId).assertEqual('manual-1')
    })

    it('auto page rejects overlap and background cancels timer page and generation', 0, (): void => {
      const runtime: ReaderUIRuntime = activeReaderRuntime(1, 'page-1')
      runtime.dispatch('reader.autoPage.start', { 'intervalMs': '5000' }, 'auto-bg')
      const generation: number = runtime.state.autoPageTransaction?.generation ?? -1
      expect(runtime.acceptAutoPageTimerFired('auto-bg', generation + 1).accepted).assertFalse()
      const fired = runtime.acceptAutoPageTimerFired('auto-bg', generation)
      const pageCorrelation: string = fired.state.pageTransaction?.correlationId ?? ''
      expect(pageCorrelation.length > 0).assertTrue()
      expect(runtime.acceptAutoPageTimerFired('auto-bg', generation).accepted).assertFalse()
      const background = runtime.suspendAutoPageForBackground('auto-bg')
      expect(effectTypes(background.effects)).assertEqual(READER_FOREGROUND_TIMER_CANCEL)
      expect(background.cancelledCorrelationIds.join(',')).assertEqual(`auto-bg,${pageCorrelation}`)
      expect((runtime.state.playbackGeneration ?? 0) > generation).assertTrue()
      expect(runtime.state.autoPageTransaction === undefined).assertTrue()
      expect(runtime.state.pageTransaction === undefined).assertTrue()
      expect(runtime.acceptAutoPageTimerFired('auto-bg', generation).accepted).assertFalse()
    })

    it('tts and auto page replace each other with ordered exactly once teardown', 0, (): void => {
      const runtime: ReaderUIRuntime = activeReaderRuntime()
      runtime.dispatch('reader.tts.start', {}, 'tts-playing')
      runtime.acceptTTSCoreResult('tts.queue.plan', 'tts-playing')
      runtime.acceptTTSCoreResult('tts.queue.start', 'tts-playing')
      runtime.acceptTTSSystemStart('tts-playing')

      const auto = runtime.dispatch('reader.autoPage.start', { 'intervalMs': '3000' }, 'auto-after-tts')
      expect(effectTypes(auto.effects)).assertEqual(`tts.system.stop,tts.queue.stop,${READER_FOREGROUND_TIMER_ARM}`)
      expect(auto.cancelledCorrelationIds.join(',')).assertEqual('tts-playing')

      const tts = runtime.dispatch('reader.tts.start', {}, 'tts-after-auto')
      expect(effectTypes(tts.effects)).assertEqual(`${READER_FOREGROUND_TIMER_CANCEL},tts.queue.plan`)
      expect(tts.cancelledCorrelationIds.join(',')).assertEqual('auto-after-tts')
    })

    it('reader exit invalidates auto page generation before route pop', 0, (): void => {
      const runtime: ReaderUIRuntime = activeReaderRuntime()
      runtime.dispatch('reader.autoPage.start', { 'intervalMs': '3000' }, 'auto-exit')
      const generation: number = runtime.state.autoPageTransaction?.generation ?? -1
      const exit = runtime.dispatch('reader.exit')
      expect(effectTypes(exit.effects)).assertEqual(READER_FOREGROUND_TIMER_CANCEL)
      expect(exit.cancelledCorrelationIds.join(',')).assertEqual('auto-exit')
      expect(exit.state.routeId).assertEqual('bookshelf')
      expect((exit.state.playbackGeneration ?? 0) > generation).assertTrue()
      expect(runtime.acceptAutoPageTimerFired('auto-exit', generation).accepted).assertFalse()
    })

    it('book open preflight preserves a playing session on invalid input', 0, (): void => {
      const runtime: ReaderUIRuntime = activeReaderRuntime()
      runtime.dispatch('reader.tts.start', {}, 'tts-nav')
      runtime.acceptTTSCoreResult('tts.queue.plan', 'tts-nav')
      runtime.acceptTTSCoreResult('tts.queue.start', 'tts-nav')
      runtime.acceptTTSSystemStart('tts-nav')
      let failureCode: string = ''
      try {
        runtime.dispatch(
          'book.open',
          { 'bookId': 'b', 'sourceId': 's', 'sourceKind': 'invalid' },
          'open-bad'
        )
      } catch (error) {
        failureCode = (error as ReaderUIRuntimeError).code
      }
      expect(failureCode).assertEqual('INVALID_TYPED_PAYLOAD')
      expect(runtime.state.ttsTransaction?.correlationId).assertEqual('tts-nav')
      expect(runtime.state.activeSession).assertEqual('tts')
      const opened = runtime.dispatch(
        'book.open',
        { 'bookId': 'b', 'sourceId': 's', 'sourceKind': 'remote' },
        'open-good'
      )
      expect(effectTypes(opened.effects)).assertEqual('tts.system.stop,tts.queue.stop,source.detail')
    })

    it('reader control and module actions are atomic route stable and fail closed', 0, (): void => {
      const runtime: ReaderUIRuntime = activeReaderRuntime()
      const routeBefore: string = runtime.state.routeId
      const opened = runtime.dispatch('reader.control.toggle', { 'overlay': 'reader-control' })
      expect(opened.state.overlay).assertEqual('reader-control')
      expect(opened.state.routeId).assertEqual(routeBefore)
      expect(opened.effects.length).assertEqual(0)

      runtime.dispatch('reader.module.switch', { 'module': 'directory' })
      expect(runtime.state.overlay).assertEqual('directory')
      runtime.dispatch('reader.module.switch', { 'module': 'directory' })
      expect(runtime.state.overlay).assertEqual('directory')
      runtime.dispatch('reader.module.switch', { 'module': 'appearance' })
      expect(runtime.state.overlay).assertEqual('appearance')
      runtime.dispatch('reader.control.toggle', { 'overlay': 'reader-control' })
      expect(runtime.state.overlay === undefined).assertTrue()
      expect(runtime.state.routeId).assertEqual(routeBefore)

      let failureCode: string = ''
      try {
        runtime.dispatch('reader.module.switch', { 'module': 'tts' })
      } catch (error) {
        failureCode = (error as ReaderUIRuntimeError).code
      }
      expect(failureCode).assertEqual('READER_CONTROL_OVERLAY_GUARD')

      const outsideReader: ReaderUIRuntime = new ReaderUIRuntime()
      failureCode = ''
      try {
        outsideReader.dispatch('reader.control.toggle', { 'overlay': 'reader-control' })
      } catch (error) {
        failureCode = (error as ReaderUIRuntimeError).code
      }
      expect(failureCode).assertEqual('READER_ROUTE_GUARD')
    })
  })
}
