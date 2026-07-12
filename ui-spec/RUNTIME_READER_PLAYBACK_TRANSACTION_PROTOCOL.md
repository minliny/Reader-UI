# Reader Page / TTS / Auto-Page Transaction Protocol

This protocol defines the R8 batch after `book.open`. It does not promote any
event by itself and does not change the 2.4 runtime action hash. The purpose is
to freeze the one-owner, exactly-once boundary before the shared runtime and
the three Hosts implement it.

The covered canonical events are:

- `reader.page.next` / `reader.page.prev`;
- `reader.tts.start` / `reader.tts.stop`;
- `reader.autoPage.start` / `reader.autoPage.stop`.

Directory Pilot evidence and `book.open` evidence do not admit these events.

## 1. Shared ownership boundary

ReaderUIRuntime owns semantic session state, transaction stage, correlation,
pending page direction, terminal UI error and session mutual exclusion. Core
owns canonical reader location and the TTS slice/queue state. A Host owns only
typed Domain data, native rendering/measurement and platform capabilities such
as the speech engine and a cancellable foreground timer.

A Host coordinator may keep a typed `ReaderPlaybackDomainContext`, keyed by
the active runtime correlation. It may contain the current Core chapter,
content, paginator anchors, TTS plan/snapshot and platform request handles. It
must not contain another action table or independently decide the UI workflow.

Every effect and callback carries the active correlation. A mismatched,
cancelled, superseded, duplicated or out-of-order callback is an ignored
no-op before Domain Store or UI state is written.

## 2. Page transaction

`reader.page.next` and `reader.page.prev` are result-dependent transactions,
not an immediate integer mutation followed by a speculative Core call.

```text
page intent(direction, correlation)
  -> Host paginator proposes a real chapter-local anchor
  -> runtime validates active reader + direction + measured viewport
  -> reader.location.resolve(anchor, viewport)
  -> commit canonical location and visible page index
  -> completed
```

The renderer/paginator supplies a measured, non-zero viewport and a real anchor
derived from the current Core content. At a chapter boundary it supplies the
adjacent Core TOC entry through DomainContext; the runtime still owns whether
one page intent is pending. The visible page index is committed only after the
matching `reader.location.resolve` succeeds. Failure preserves the last
committed page/location and records a recoverable error.

Only one page transaction may be active. Latest intent may supersede the old
one only by cancelling its request handle and invalidating its correlation.
Back, reader exit, book replacement and session teardown cancel it. A synthetic
`0x0` layout, an array offset substituted for Core chapter identity, or a late
location result must never advance the page.

The shared runtime implementation therefore needs conceptual APIs equivalent
to:

1. `beginPageStep(direction, correlationId)`;
2. `providePageLayout(correlationId, anchor, viewport)`;
3. `acceptPageLocationResult(correlationId, result|error)`;
4. `cancelPageStep(correlationId)`.

## 3. TTS start and stop transaction

Starting TTS requires an active Core chapter/content snapshot. The Host binds
that typed snapshot from DomainContext; UI payload must not copy a lossy
chapter body or source variables into an ad-hoc string DTO.

```text
reader.tts.start(correlation)
  -> tts.queue.plan        (Host maps to Core tts.slice)
  -> tts.queue.start       (Host maps to Core tts.queue.play)
  -> tts.system.start      (first real slice, request-scoped)
  -> activeSession=tts / playing

reader.tts.stop(active correlation)
  -> invalidate pending speech callbacks
  -> tts.system.stop       (if platform speech started)
  -> tts.queue.stop        (if Core queue loaded)
  -> clear session DomainContext and activeSession
```

Each arrow is result-dependent and emits at most one next effect. `tts.queue`
results retain the Core plan/snapshot in typed DomainContext. The Host extracts
the exact current slice text only when executing `tts.system.start`; the runtime
does not parse Core queue DTOs.

Platform utterance completion is an internal, correlation-scoped executor
callback. It reports the finished slice to Core and advances the Core queue
before speaking the next slice. It may not dispatch a second UI start event.
Stop, reader exit and supersession invalidate completion callbacks before
calling platform/Core teardown. Teardown is best-effort but terminal: an error
must not leave `activeSession=tts`, a live speech request or a reusable stale
queue handle.

TTS start is not considered successful merely because the semantic capsule is
visible. Pilot proof requires one real Core plan, one Core queue start and one
platform speech start, with no native duplicate executor.

## 4. Auto-page timer and mutual exclusion

Auto-page uses a Host-owned **foreground one-shot timer** controlled by a
runtime session generation. It is not an RSS/background task and must not be
silently mapped to `background.schedule`. The typed HostRequest pair is
`timer.foreground.arm` / `timer.foreground.cancel`; both carry `timerId`,
`correlationId`, `delayMs`, `generation`, `oneShot=true` and
`foregroundOnly=true`. The shared interval admission bound is 250 ms through
3,600,000 ms, inclusive.

```text
reader.autoPage.start(intervalMs, correlation)
  -> validate active reader and positive bounded interval
  -> cancel/finish the previous session transaction
  -> arm one cancellable timer(generation, deadline)
  -> activeSession=auto-page

timer fires(correlation, generation)
  -> begin the canonical page-next transaction
  -> after matching page commit, arm the next one-shot timer

reader.autoPage.stop / reader exit / book replacement / app background
  -> invalidate generation
  -> cancel timer
  -> cancel pending auto-page page transaction
  -> clear activeSession and countdown state
```

The timer callback never mutates page state directly. It enters the same page
transaction used by a manual next-page intent, so Core location, measured
layout, chapter boundary and stale-result behavior cannot diverge. A repeating
timer is forbidden because it can enqueue multiple page effects while a prior
location request is pending.

TTS and auto-page are mutually exclusive transactions. Starting one while the
other is active first performs the old session's teardown; it does not merely
overwrite `activeSession`. The new session is admitted only after old Core,
Host and timer handles are invalidated. Repeated start with the same
correlation is a duplicate; a new correlation follows latest-intent
supersession and must return the cancelled correlation to the Host executor.

A manual next/previous/explicit page intent while an auto-page timer is armed
first invalidates the auto-page generation and emits exactly one
`timer.foreground.cancel`, then enters the manual page transaction. Conversely,
auto-page start while a manual page transaction is pending fails closed with
`PAGE_TRANSACTION_PENDING`; it never cancels or overlaps that manual intent.

## 5. Projection and exactly-once rules

Runtime semantic state is projected narrowly into each native renderer:

- committed canonical page/location selects existing native content;
- `activeSession=tts|auto-page` selects the existing capsule/control surface;
- pending/playing/countdown values are projections of runtime transaction and
  Domain facts, not a second reducer truth.

In Pilot, the old native reducer/effect branch for the same canonical event is
disabled. Runtime effects are executed by one correlation-scoped executor.
Core commands, speech calls and timer arms are individually counted and tested
as exactly once. Fail-closed means no native fallback after a runtime guard or
executor admission failure.

## 6. Promotion units and admission proof

Promotion units are deliberately paired:

1. `reader.page.next` + `reader.page.prev`;
2. `reader.tts.start` + `reader.tts.stop`;
3. `reader.autoPage.start` + `reader.autoPage.stop`.

No start/stop or next/prev half-pair may enter Pilot alone. An effectful cohort
uses `effectPolicy=exactly-once`.

Before promotion, every platform must prove:

- success, Core error, Host error, cancellation, supersession, duplicate,
  out-of-order and late-result discard;
- real Core chapter/content/location or TTS DTOs and request-scoped handles;
- measured viewport/anchor for page commits;
- TTS plan -> queue -> speech order and stop cleanup;
- auto-page one-shot rearm, no overlap, foreground/background cleanup and
  session replacement cleanup;
- old native reducer/effect bypass in Pilot, rollback to Shadow, unit/build and
  available device proof.

Until a pair satisfies its own proof, it remains Shadow even if another pair
in this document has been promoted.

## 7. Compatibility and release staging

This implementation remains additive to the existing `ReaderUIRuntime` APIs.
The current `ui-spec/runtime-actions.json` contains 61 actions; its SHA-256 is
`0ac249341d8de651314687d8352bc1c3f62d3778371ff500f1f0a025a64be82c`.
Reader-UI 2.5.1 and all three consumer locks carry this action hash plus
HostRequest schema 1.2.0. The synchronized locks keep the page pair in Shadow
and admit the TTS and auto-page pairs to Pilot with exactly-once cohorts.
Version/lock sync and unit/build proof are still not physical-device proof or
Authoritative promotion.
