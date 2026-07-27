# Reader Page / TTS / Auto-Page Transaction Protocol

This protocol defines the shared playback transaction batch after `book.open`.
It does not promote any event by itself. Runtime action schema 3 adds the
required progress-persistence stage to the page pair before any Host may treat
the visible page as committed.

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
  -> runtime stores pending canonical location/page index
  -> reader.progress.update({})
     Host fills the correlation-scoped Core DTO from DomainContext
  -> commit canonical location and visible page index only after stored=true
  -> completed
```

The renderer/paginator supplies a measured, non-zero viewport and a real anchor
derived from the current Core content. At a chapter boundary it supplies the
adjacent Core TOC entry through DomainContext; the runtime still owns whether
one page intent is pending. The visible page index is committed only after the
matching `reader.progress.update` succeeds with `{stored:true}`. Resolve or
persistence failure preserves the last committed page/location and records a
recoverable error. The progress effect payload is deliberately `{}`:
book/source/device, chapter offset/progress, location revision and timestamp
are typed Core facts that the Host binds from correlation-scoped DomainContext.
They must not be reconstructed from UI payload aliases.

Only one page transaction may be active. Latest intent may supersede the old
one while it is awaiting layout or resolving location by cancelling its request
handle and invalidating its correlation. Emitting `reader.progress.update` is
the commit boundary: `persisting-progress` cannot be cancelled, rolled back or
superseded. A new manual/explicit/automatic page intent, auto-page start/tick,
or explicit page cancellation fails closed with
`PAGE_PROGRESS_COMMIT_PENDING`. Any route/reader-identity mutation, including
`reader.exit`, `book.open`, generic push/replace/pop/pop-to-root and tab select,
also fails with the same code before state changes, so an old terminal callback
cannot contaminate another route/book. A page intent is likewise rejected with
`BOOK_OPEN_TRANSACTION_PENDING` while `book.open` owns the reader identity. A
non-identity session teardown may stop
timers or sessions, but it retains the in-flight progress transaction and must
accept its matching terminal callback; it must not report that Core mutation as
cancelled. A synthetic `0x0` layout, an array offset substituted for Core
chapter identity, or a late result must never advance the page.

The shared runtime implementation therefore needs conceptual APIs equivalent
to:

1. `beginPageStep(direction, correlationId)`;
2. `providePageLayout(correlationId, anchor, viewport)`;
3. `acceptPageLocationResult(correlationId, result|error)`;
4. `acceptPageProgressResult(correlationId, stored|error)`;
5. `cancelPageStep(correlationId)` before the progress commit boundary only.

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
  -> resolve location and persist progress
  -> after matching stored=true page commit, arm the next one-shot timer

reader.autoPage.stop / app background
  -> invalidate generation
  -> cancel timer
  -> cancel a pre-commit auto-page page transaction
  -> retain an already dispatched progress update until its terminal callback
  -> clear activeSession and countdown state

reader.exit / book replacement while progress is pending
  -> fail PAGE_PROGRESS_COMMIT_PENDING before route or identity mutation
  -> retry only after the matching progress callback terminates
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
If any page transaction has already entered `persisting-progress`, both paths
fail with `PAGE_PROGRESS_COMMIT_PENDING` and emit no cancellation or replacement
effect. Auto-page rearms only after progress persistence succeeds; persistence
failure keeps the old visible page and terminates the matching auto-page session.

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

The new callback APIs are additive, but page next/previous semantics and their
action descriptor sequence are intentionally breaking: consumers must execute
both Core effects in order and keep DomainContext alive through the progress
callback. Runtime action schema 3 and typed payload/result schema 2 therefore
require a coordinated consumer upgrade. Host consumer locks remain unchanged
until each platform implements the correlation-scoped progress DTO bridge and
proves the sequence. Version/lock sync and unit/build proof are still not
physical-device proof or Authoritative promotion.
