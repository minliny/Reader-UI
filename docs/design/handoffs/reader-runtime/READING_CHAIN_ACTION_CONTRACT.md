# Reading Chain Action Contract — draft v1

Status: `PREPARED_FROM_LIVE_FIGMA_AND_CURRENT_CORE_BOUNDARY`; it is not a Figma visual delta and does not authorize new Figma screens, reactions, or native error surfaces.

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

The current writer runtime cannot read an official file revision. These nodes are therefore bound to `revision=null` in the F0 live-rebaseline record; no historical version ID may be presented as their current revision.

## Action boundary

| User action | Existing visual evidence | Owner and real input | Success terminal | Explicitly not authorized yet |
| --- | --- | --- | --- | --- |
| Select a local shelf book | Bookshelf card static/pressed state; no navigate reaction | ArkTS router + `ReaderEffects.openLocalBookshelfBook`; durable `bookId`, `sourceId`, `sourceKind=local` | Book Detail with Core TOC/metadata | A new Figma navigation reaction, demo-book fallback, invented loading screen. |
| Continue reading from Book Detail | Static Detail action; no reaction | Must converge on one owner: canonical `book.open` transaction or existing `ReaderEffects` local chain | Immersive reading at stored location or first readable chapter | A second `book.continue` event, parallel effect owner, guessed failure dialog. |
| Select a chapter | Static Detail chapter area; no reaction | Core `local_book.chapter.content(bookId, chapterIndex)` | Immersive reading at selected chapter | Treating a chapter index as a raw array index after TOC changes. |
| Render / restore reader location | Reader visual state only | `reader.location.resolve`, `reading.progress.get`; identity must match `bookId + sourceId + chapterIndex + offset/progress` | Visible character anchor after layout resolves | Fixture text, a guessed percentage, or stale progress after the chapter changed. |
| Turn page or leave reader | Previous/next and top bar provide pressed visuals only | Reader runtime + Core `reader.location.resolve -> reading.progress.update` | `stored=true` before committing the new visible page; return to the confirmed route stack | Optimistic page commit, silent write failure, or a new Figma error state. |

## Required implementation order

1. Generate and validate HarmonyOS bindings from Reader-UI Contract 3.0 without changing the consumer lock.
2. Unify the two existing local-book entry paths so Detail Continue and the shelf Continue card have one declared effect owner.
3. Probe the six real Core/NAPI calls: `bookshelf.list`, `local_book.toc`, `local_book.chapter.content`, `reader.location.resolve`, `reading.progress.update`, and `reading.progress.get`.
4. Only after steps 1–3 pass, create a verified Reader-UI host release, atomically update the HarmonyOS consumer/package locks, build the HAP, and run the real-device chain.

## Outstanding product decisions

Figma currently supplies no visual source for the following. They require an explicit product decision before an agent creates UI for them:

- Detail/Reader loading failure and retry presentation.
- The exact return destination and focus restoration after reader exit.
- User-visible handling when progress persistence fails.

The default rule is fail closed in code and preserve the existing Figma static surface; no new error page, modal, toast, or navigation target may be invented.
