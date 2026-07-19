# Runtime typed payload and result protocol

`runtime-payload-contracts.json` is the executable, fail-closed contract for
all 63 entries in `runtime-actions.json`. It is intentionally broader than the
Core-only DTO registry: navigation, overlay, session, composite, Core and
ReaderUIRuntime-owned actions all carry an exact descriptor snapshot and an
explicit payload schema.

Current coverage:

- 63/63 runtime actions: 25 internal, 20 single-Core, 10 composite and 8
  ReaderUIRuntime-owned appearance transactions.
- 170 payload fixtures.
- 73 event/effect result mappings across 35 effect types and 154 result
  fixtures.
- Every internal synchronous action has `resultSchemas: []`; no missing result
  registry entry is interpreted as an untyped success.

## Dispatch and callback rules

Before state mutation, every runtime compares the generated contract against
the complete action descriptor: `action`, `value`, ordered `coreSequence` and
`hostRequest`. This covers fixed navigation, reader sessions, result-dependent
book opening and multi-effect sync actions instead of special-casing only
single `emitEffects` actions.

`validateReaderUITypedResult(event, effectType, result)` accepts only a result
declared for that exact event/effect pair. Unknown fields, undeclared effects,
wrong tagged variants, non-finite numbers and unsafe integers fail closed.
Recursive `json` nodes are permitted only where the owning Core DTO explicitly
defines an opaque JSON field; their nested integer values still obey the
IEEE-754 safe-integer fence.

The generated Swift, Kotlin and ArkTS registries encode the resolved registry
as deterministic 4 KiB JSON chunks. This avoids compiler-heavy nested literal
type inference while retaining identical runtime schemas on all platforms.

## Raw Core result versus runtime callback projection

Result schemas describe the normalized callback delivered to
`ReaderUIRuntime`, not an unchecked raw Core response.

- `source.detail` and `content.load` in `book.open` are projected to `{}` on
  success or `{ error }` on failure after the Host domain mapper retains the
  full book/content DTO.
- Raw `reader.location.resolve` contains canonical location and reflow data.
  The Host mapper validates that identity/reflow contract and projects
  `{ canonicalLocation, pageIndex }`; the runtime then validates and commits
  both fields. An empty location result can no longer complete `book.open`.
- `sync.snapshot` maps to Core `sync.merge`; `sync.push` maps to Core
  `sync.webdav.plan`, whose typed result is `{ requests: HostHttpRequest[] }`.
  The old guessed `{ pushed }` result is not accepted.

Raw Core objects must not be passed directly to a narrower callback projection.
The Host executor/domain mapper is the explicit normalization boundary.

## Rollout and known Host gaps

This contract expansion does not promote runtime authority: the existing
covered-event rollout remains 7 Pilot, 28 Shadow and 0 Authoritative.

Package-level green tests are not three-Host parity proof. In particular:

- Android's current W1 import coordinator still has legacy `{ json }` and
  `conflictMode` payload paths. They do not satisfy the strict tagged
  `import.parse` / `import.persist` / `import.rollback` DTOs and require a Host
  bridge migration before W1 promotion.
- `sync.run` contains inputs for both `sync.merge` and `sync.webdav.plan`, while
  the runtime emits two UI aliases. A production Host must project the combined
  event payload into the exact per-effect Core DTO before dispatch; forwarding
  all fields to both `deny_unknown_fields` Core methods is invalid.

These are Host integration gates, not reasons to weaken the canonical UI
contract with catch-all objects.
