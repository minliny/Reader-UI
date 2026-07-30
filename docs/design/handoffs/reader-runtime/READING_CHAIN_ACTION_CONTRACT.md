# Reading Chain Action Contract — draft v1

Status: historical narrow-slice decision record. The visual/product boundary remains
valid, but its pre-4.0 release assumptions are superseded by the current
Reader-UI 4.0 typed runtime contract and B1–B7 execution protocol. It is not a
Figma visual delta and does not authorize new Figma screens, reactions, or
native error surfaces.

## Scope

The first native vertical slice is deliberately limited to an already-persisted local book:

`Core local shelf row -> Bookshelf -> Book Detail -> immersive reading -> persist progress -> cold-start recovery`

Local import, source switching, WebDAV, backup restore, RSS, and all Reader control-panel work are outside this slice.

## Visual sources read live

| Surface | Canonical Figma source | What it establishes |
| --- | --- | --- |
| Bookshelf | `24 · Responsive Masters` / `Page/Bookshelf` `941:6`; Phone `941:3`; Tablet `941:5` | Phone/Tablet layout and pressed/hover appearance only. |
| Book Detail | `24 · Responsive Masters` / `Page/Book Detail` `941:10`; Phone `941:7`; Tablet `941:9` | Phone/Tablet static layout only; the master has zero reactions. |
| Reader | `15 · Reader 2` `1023:17636`; ReadingSurface `1023:18354`; Reader responsive master `1214:10117` | Reading/control visual states only; its reactions are component-internal visual changes. |

At the time of this draft the writer runtime could not read an official file
revision, so the draft recorded `revision=null`. Current work must instead use
`F0_FIGMA_CURRENT_REVISION_EVIDENCE.json` and the visual-admission registry;
the checked-in official revision is `2379851596474967636`. This historical
paragraph must not override that current evidence.

## Action boundary

| User action | Existing visual evidence | Owner and real input | Success terminal | Explicitly not authorized yet |
| --- | --- | --- | --- | --- |
| Select a local shelf book | Bookshelf card static/pressed state; no navigate reaction | ArkTS router + `ReaderEffects.openLocalBookshelfBook`; durable `bookId`, `sourceId`, `sourceKind=local` | Book Detail with Core TOC/metadata | A new Figma navigation reaction, demo-book fallback, invented loading screen. |
| Continue reading from Book Detail | Static Detail action; no reaction | Must converge on one owner: canonical `book.open` transaction or existing `ReaderEffects` local chain | Immersive reading at stored location or first readable chapter | A second `book.continue` event, parallel effect owner, guessed failure dialog. |
| Select a chapter | Static Detail chapter area; no reaction | Core `local_book.chapter.content(bookId, chapterIndex)` | Immersive reading at selected chapter | Treating a chapter index as a raw array index after TOC changes. |
| Render / restore reader location | Reader visual state only | `reader.location.resolve`, `reading.progress.get`; identity must match `bookId + sourceId + chapterIndex + offset/progress` | Visible character anchor after layout resolves | Fixture text, a guessed percentage, or stale progress after the chapter changed. |
| Turn page or leave reader | Previous/next and top bar provide pressed visuals only | Reader runtime + Core `reader.location.resolve -> reading.progress.update` | `stored=true` before committing the new visible page; return to the confirmed route stack | Optimistic page commit, silent write failure, or a new Figma error state. |

## Required implementation order

1. Use the current Reader-UI Contract 4.0 typed runtime payload and a verified
   host consumer lock that binds its schema/hash. A stale v2 lock or a lock
   without the 4.0 payload hash remains fail-closed. No additional
   `book.open` Pilot extension is authorized by this product policy.
2. Apply the confirmed Continue policy below by routing both local-book Continue entries through the existing durable-progress recovery owner.
3. Probe the six real Core/NAPI calls: `bookshelf.list`, `local_book.toc`, `local_book.chapter.content`, `reader.location.resolve`, `reading.progress.update`, and `reading.progress.get`.
4. Only after steps 1–3 pass, create a verified Reader-UI host release, atomically update the HarmonyOS consumer/package locks, build the HAP, and run the real-device chain.

## Current Continue-path divergence

This is a code-path finding, not a visual-design change:

- The bookshelf Continue card currently emits a direct-reader `book.open` request with `chapterIndex=0`. In the Pilot path that number is a current TOC-array position, not a durable Core chapter identity, and layout publication currently starts at offset/progress zero.
- Book Detail's existing Continue path uses the legacy local-reader effect. It reads persisted progress, matches the Core chapter identity against the TOC, loads that chapter, and restores the resolved reading location after text layout.

Therefore, merely sending the bookshelf card through the existing direct-reader flag would preserve the bug: it can open the first TOC row rather than the saved chapter and cannot restore the saved position.

## Confirmed Continue policy

The user confirmed this policy on 2026-07-22:

- The bookshelf Continue Card remains a direct entry to immersive Reader.
- It has exactly the same durable recovery semantics as Book Detail Continue: read persisted Core progress, match the Core chapter identity to the live TOC, load that chapter, then restore the measured reading offset/progress.
- If no valid record exists, or its chapter no longer exists in the TOC, open the first readable chapter without inventing a new Figma surface.

The safe implementation is to remove the card from the current
`readerEntry: true + chapterIndex: 0` Pilot path and reuse the existing
HarmonyOS `ReaderEffects` recovery chain. The product decision does not add a
UiEvent, Figma reaction, route, screen, dialog, or state owner. Its current
implementation is nevertheless governed by the Reader-UI 4.0 structured
location/result contract and therefore requires a matching verified consumer
lock.

## Outstanding product decisions

Figma currently supplies no visual source for the following. They require an explicit product decision before an agent creates UI for them:

- Detail/Reader loading failure and retry presentation.
- The exact return destination and focus restoration after reader exit.
- User-visible handling when progress persistence fails.

The default rule is fail closed in code and preserve the existing Figma static surface; no new error page, modal, toast, or navigation target may be invented.
