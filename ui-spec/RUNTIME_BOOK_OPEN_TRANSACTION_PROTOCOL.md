# `book.open` Result-Dependent Transaction Protocol

`book.open` is a ReaderUIRuntime-owned UI workflow, not a Core atomic method. It
must never dispatch the four Core operations concurrently. The runtime owns the
transaction stage, correlation boundary, requested chapter selection, loading
and terminal error state. Core remains the source of book, TOC, content and
canonical location facts.

## 1. Canonical input

Every Pilot request supplies a non-empty `correlationId` and these canonical
payload values:

| Field | Meaning |
| --- | --- |
| `bookId` | Stable Core book identifier / URL identity already used by the Host bridge. |
| `sourceId` | Stable Core source identity. |
| `sourceKind` | Exactly `remote` or `local`; it selects the transaction branch. |
| `chapterIndex` | Optional requested zero-based chapter index; missing means `0`. |

`book.open` means **enter the reader**, not merely open a book detail page.
`book.detail.open` and search/discover detail navigation remain separate
canonical events. A Host must not map a generic `bookshelf-book-open` UI
gesture to `book.open` unless that exact gesture enters immersive reading.

The native coordinator may retain additional domain DTOs (base book, source
definition, detail URL, Core variables, selected TOC entry) in a typed
`BookOpenDomainContext` keyed by `correlationId`. That context is Core/bridge
data, not a second UI reducer or an action table.

## 2. Runtime-owned state machine

```text
remote: book.open
  -> source.detail
  -> chapter.list
  -> content.load(selectedChapterIndex)
  -> awaiting-layout
  -> reader.location.resolve
  -> completed

local: book.open
  -> chapter.list
  -> content.load(selectedChapterIndex)
  -> awaiting-layout
  -> reader.location.resolve
  -> completed
```

`source.detail`, `chapter.list` and `content.load` are Reader-UI aliases. Each
Host bridge maps them to the correct Core method (`book.detail` / `book.toc` /
`chapter.content` for remote, local catalog/content methods for local). The
runtime does not parse source rules, JSON variables, or chapter bodies.

The first successful `book.open` transition enters `immersive-reading` with
`loading=true`. The runtime chooses the selected chapter index after
`chapter.list` from `chapterCount` using `min(max(requestedIndex, 0),
chapterCount - 1)`. A zero/invalid chapter count is a terminal error; a Host
must not silently choose a different chapter.

“Continue reading” persists the zero-based `chapterIndex` as Core-derived
progress metadata. A legacy record without that field has an explicit `0`
fallback; a Host may not wait for a remote TOC and privately substitute a
different index. If an existing persistence model stores only a chapter URL,
it must add/index-migrate the Core chapter index before this workflow enters
Pilot.

After `content.load` succeeds, the runtime is deliberately in
`awaiting-layout`: the Host first writes the real Core content to its Domain
Store and renderer, then sends measured anchor/layout values through
`provideBookOpenLayout`. Only that call may emit `reader.location.resolve`.
This avoids a fabricated `0×0` viewport or a platform-specific implicit
location decision.

## 3. Result and cancellation boundary

The generated native packages expose the same conceptual API:

1. `dispatch("book.open", payload, correlationId)` emits exactly one first
   Core effect.
2. `acceptBookOpenResult(coreType, correlationId, chapterCount?, error?)`
   accepts only the active expected stage and emits at most one next effect.
3. `provideBookOpenLayout(correlationId, layout)` is accepted only in
   `awaiting-layout` and emits `reader.location.resolve` once.
4. `cancelBookOpen(correlationId)` clears the active runtime transaction;
   later results for that correlation are ignored.

`coreType` is normalized to the Reader-UI alias by the bridge before it reaches
the runtime. A mismatched correlation, out-of-order stage, duplicate result, or
result after cancellation is an ignored no-op: it must not clear loading,
change route, or execute another effect. A matching error clears loading,
records the terminal error, and emits no next effect.

Every Core command and nested `http.execute` continuation created for this
workflow must be associated with the same UI `correlationId`. Each Host must
expose a cancellable Core command handle (including the numeric Core request
id where applicable), cancel it on `cancelBookOpen`, and discard late callbacks
before touching Domain Store or renderer state.

## 4. Host normalization contract

The Host is allowed to translate raw Core DTOs into its typed Domain Store but
must not decide workflow order:

| Runtime stage | Host writes | Required feedback to runtime |
| --- | --- | --- |
| `source.detail` | Detail book, TOC URL, variables/source context | Success or error only; the next stage is runtime-owned. |
| `chapter.list` | Full TOC including per-entry variables | `chapterCount` or terminal error. The Host reads the index returned by the next effect. |
| `content.load` | Selected real chapter body and metadata | Success or error only; then wait for renderer measurement. |
| `reader.location.resolve` | Canonical location / revision | Success or error only; success completes the transaction. |

The selected TOC entry, source variables and Core request arguments remain
typed bridge data. Do not serialize them into ad-hoc per-platform strings only
to feed the runtime; the runtime needs only stage identity, correlation,
chapter count and measured layout.

For the `local` branch, the Host must retain a real Core local-book identity
and map `chapter.list`/`content.load` to the Core local catalog/content
methods. A cached file snapshot or a synthesized URL is not sufficient proof
of this branch.

## 5. Pilot admission and proof

`book.open` may not enter a Pilot cohort until each platform proves all of the
following:

- remote and local branches are both handled, or the consumer lock describes a
  machine-checked subset rather than claiming the whole event;
- one canonical effect executor with a request-scoped cancel handle;
- typed Core result ledger, duplicate/out-of-order/stale discard, and no native
  reducer/effect double execution;
- real TOC/content data, runtime-selected chapter index, and measured layout;
- success, Core/Host error, cancel, stale result, empty TOC, and delayed-layout
  tests; plus the platform's build/unit/Host and available device proof.

Reader-UI 2.5.0 first admitted `book.open` as an independent Pilot cohort;
2.5.1 retains that rollout after the three Host implementations closed the typed executor,
correlation/stale-result, rollback, and available build/test gates. This Pilot
does not imply Authoritative status: fresh physical-device proof remains an
independent blocker, and the directory Pilot is unrelated evidence.
