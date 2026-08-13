# Reader Reading-Surface Historical Implementation Reachability Report

- **Date:** 2026-07-27
- **Scope:** Source-side symbol/call-graph reachability proof for the `reader.reading-surface` lineage correction (A2 closure).
- **Canonical consumer:** `Reader-for-HarmonyOS/entry/src/main/ets/ui/components/ReaderComponents.ets#ReaderBase`
- **Status:** Reader-UI source bindings are reproducibly reverified; HarmonyOS consumer reachability still requires an independent clean A2 commit. `ReaderControlSheet` remains a legitimate Source Switch consumer and `ReaderAutoScrollPanel` remains canonical for `auto-page`.
- **Retract reason status:** the Reader-UI source portion of *"23 historical reader implementations not proven unreachable"* is addressed; the HarmonyOS consumer portion remains open before B4.

## 1. Executive summary

The 13 retired reading-surface routes were physically removed from the canonical `RouteId` enum (260 → 247). The 3 canonical reading routes (`immersive-reading`, `reader`, `reader_content`) are bound to the Figma `ReaderBase` master and dispatch to the canonical consumer `ReaderComponents.ets#ReaderBase`.

This report enumerates the **23 historical reader implementations**. Its Reader-UI route, fixture, component-identity, and demo-renderer claims are machine-checked. Claims about `ReaderBase`, `ViewStateRenderer`, and the two ArkTS motion coordinators remain consumer-side facts that must be reverified from a clean HarmonyOS commit:

- **19 Reader-UI source implementations are globally unreachable** after the panel split: 6 retired component identities plus 13 retired demo renderers.
- **2 shared implementations are intentionally retained elsewhere**: `ReaderControlSheet` is directly composed by `SourceSwitchFlowPage`; `ReaderAutoScrollPanel` remains the canonical `auto-page` component.
- **2 HarmonyOS-only motion coordinators remain pending** the independent A2 consumer proof; this Reader-UI report does not claim their current reachability.
- **3 reader-named panel identities were split** into retained shared primitives (`DirectoryPanel` / `AppearancePanel` / `ReplacePanel`) and explicit-gap reading-surface identities (`ReaderDirectoryPanel` / `ReaderAppearancePanel` / `ReaderReplacePanel`).

The intended reading surface has a single canonical implementation path (`ReaderBase`). This report does not by itself prove the current dirty HarmonyOS working tree or authorize deleting the two shared implementations from unrelated canonical consumers.

## 2. Canonical consumer: `ReaderBase`

`ReaderComponents.ets#ReaderBase` (struct at line 1624, `build()` at line 1643) composes **only** these children:

| Child | Defined at | Called at |
|---|---|---|
| `ReadingBackgroundLayer` | `ReaderComponents.ets:66` | `:1645` |
| `ReadingTextFlow` | `ReaderComponents.ets:145` | `:1646` |
| `TapZones` | `ReaderComponents.ets:1373` | `:1654`, `:1666` |
| `ControlDismissZone` | `ReaderComponents.ets:1607` | `:1660` |
| `ReadingInfoLayer` | `ReaderComponents.ets:1073` | `:1673` |

`ReadingInfoLayer` transitively composes `SessionCapsule` (`ReaderComponents.ets:1490`).

> **Note on a brief inaccuracy corrected during analysis:** `ReaderTopArea` and `ReaderBottomBar` are *not* directly composed by `ReaderBase`. They are dispatched via `component.type` in `ViewStateRenderer.ets` (`:886`/`:891`) for the canonical `reader-night-state-v2` route, so they are reachable via a canonical route and are correctly **excluded** from the unreachable set.

## 3. Retired routes absent from the canonical enum

All 13 retired routes are confirmed **absent** from the canonical `RouteId` enum (`ui-spec/screen-graph.schema.json` `RouteNode.properties.routeId.enum`, 247 entries):

| # | Retired routeId | Absent |
|---|---|---|
| 1 | `control-layer-base-v2` | ✓ |
| 2 | `reader-directory-overlay-v2` | ✓ |
| 3 | `reader-appearance-overlay-v2` | ✓ |
| 4 | `reader-tts-overlay-v2` | ✓ |
| 5 | `reader-settings-overlay-v2` | ✓ |
| 6 | `reader-auto-scroll-overlay-v2` | ✓ |
| 7 | `reader-search-overlay-v2` | ✓ |
| 8 | `reader-replace-overlay-v2` | ✓ |
| 9 | `toc-bookmarks` | ✓ |
| 10 | `tts` | ✓ |
| 11 | `reader-appearance` | ✓ |
| 12 | `reader-settings` | ✓ |
| 13 | `content-search` | ✓ |

Canonical reading routes **present**: `immersive-reading`, `reader`, `reader_content`.

## 4. The 23 historical implementations

Categories: 1 control-layer struct · 7 overlay-component structs · 2 motion coordinators · 13 demo renderers.

### 4.1 Globally unreachable (18 original implementations)

| ID | Symbol | File:line | Category | Retired route | Evidence |
|---|---|---|---|---|---|
| 4 | `ReaderTtsPanel` | `ReaderOverlayComponents.ets:1932` | overlay-component | `reader-tts-overlay-v2` / `tts` | Not composed by `ReaderBase`. Dispatched at `ViewStateRenderer.ets:964`; 0 occurrences in canonical view-state. Both routes absent from enum. |
| 5 | `ReaderSettingsPanel` | `ReaderOverlayComponents.ets:2220` | overlay-component | `reader-settings-overlay-v2` / `reader-settings` | Not composed by `ReaderBase`. Dispatched at `ViewStateRenderer.ets:966`; 0 occurrences in canonical view-state. Both routes absent from enum. |
| 6 | `ReaderSearchPanel` | `ReaderOverlayComponents.ets:4596` | overlay-component | `reader-search-overlay-v2` / `content-search` | Not composed by `ReaderBase`. Dispatched at `ViewStateRenderer.ets:995`; 0 occurrences in canonical view-state. Both routes absent from enum. |
| 9 | `ReaderControlMotionCoordinator` | `ReaderControlMotionCoordinator.ets:13` | motion-coordinator | `control-layer-base-v2` + 7 overlay-v2 routes | Not composed by `ReaderBase`. `isControlRoute()` hard-codes the 8 retired routes. **No external call sites** — dead code (verified: grep across `entry/src/main/ets` returns only the defining file). |
| 10 | `ReaderDirectoryToTtsMotionCoordinator` | `ReaderDirectoryToTtsMotionCoordinator.ets:4` | motion-coordinator | `reader-directory-overlay-v2` / `reader-tts-overlay-v2` / `tts` | Not composed by `ReaderBase`. `DIRECTORY_ROUTE`/`TTS_ROUTE`/`TTS_MODULE` hard-code retired routes. **No external call sites** — dead code. |
| 11 | `readerControlShowV2` | `d3-control-layers-renderers.js:961` | demo-renderer | `control-layer-base-v2` (+ concept `reader-control-show`) | Demo JS renderer, not reachable from HarmonyOS `ReaderBase`. Bound via d3 `INTEGRATION_MAP:950`; route absent from canonical enum. |
| 12 | `readerControlHideV2` | `d3-control-layers-renderers.js:965` | demo-renderer | `control-layer-base-v2` motion (concept `reader-control-hide`) | Demo renderer for the control-layer hide motion (`INTEGRATION_MAP:951`); concept route absent from enum. |
| 13 | `readerModuleSwitchV2` | `d3-control-layers-renderers.js:970` | demo-renderer | `control-layer-base-v2` motion (concept `reader-module-switch`) | Demo renderer for the module-switch motion (`INTEGRATION_MAP:952`); concept route absent from enum. |
| 14 | `readerDirectoryOverlayV2Enhanced` | `d3-control-layers-renderers.js:984` | demo-renderer | `reader-directory-overlay-v2` | Demo L2 renderer; exported (`d3:1062`) but **not** in the trimmed runtime `INTEGRATION_MAP` — historical. Route absent from enum. |
| 15 | `readerAppearanceOverlayV2Enhanced` | `d3-control-layers-renderers.js:988` | demo-renderer | `reader-appearance-overlay-v2` | Exported (`d3:1063`), not in runtime `INTEGRATION_MAP`. Route absent from enum. |
| 16 | `readerTtsOverlayV2Enhanced` | `d3-control-layers-renderers.js:992` | demo-renderer | `reader-tts-overlay-v2` | Exported (`d3:1064`), not in runtime `INTEGRATION_MAP`. Route absent from enum. |
| 17 | `readerSettingsOverlayV2Enhanced` | `d3-control-layers-renderers.js:996` | demo-renderer | `reader-settings-overlay-v2` | Exported (`d3:1065`), not in runtime `INTEGRATION_MAP`. Route absent from enum. |
| 18 | `readerAutoScrollOverlayV2Enhanced` | `d3-control-layers-renderers.js:1000` | demo-renderer | `reader-auto-scroll-overlay-v2` | Exported (`d3:1066`), not in runtime `INTEGRATION_MAP`. Route absent from enum. |
| 19 | `readerSearchOverlayV2Enhanced` | `d3-control-layers-renderers.js:1004` | demo-renderer | `reader-search-overlay-v2` | Exported (`d3:1067`), not in runtime `INTEGRATION_MAP`. Route absent from enum. |
| 20 | `readerReplaceOverlayV2Enhanced` | `d3-control-layers-renderers.js:1008` | demo-renderer | `reader-replace-overlay-v2` | Exported (`d3:1068`), not in runtime `INTEGRATION_MAP`. Route absent from enum. |
| 21 | `readerAppearanceScreen` | `w4-theme-font-typography-renderers.js:1238` | demo-renderer | `reader-appearance` | Defined at `w4:1238` but **not** registered in `w4` `screenMap`/`INTEGRATION_MAP` (only canonical `reader-font-*`/`theme-*`/`full-*` routes registered) and not called — dead. Route absent from enum. |
| 22 | `readerAppearanceOverlayV2Screen` | `w4-theme-font-typography-renderers.js:1247` | demo-renderer | `reader-appearance-overlay-v2` | Defined at `w4:1247`, not in `w4` `screenMap`/`INTEGRATION_MAP`, not called — dead. Route absent from enum. |
| 23 | `readerReplaceOverlayV2Screen` | `w5-replace-rules-renderers.js:910` | demo-renderer | `reader-replace-overlay-v2` | Bound ONLY via `w5 INTEGRATION_MAP:983` to the retired route `reader-replace-overlay-v2` (absent from enum), so genuinely unreachable. **Corrected 2026-07-28:** a prior version of this report claimed the live route `content-replacement` was *not* bound to this demo renderer, but `w5:975` actually bound `content-replacement -> readerReplaceOverlayV2Screen`, falsifying `fullyUnreachable`. That binding was removed: `content-replacement` now dispatches to `contentReplacementScreen` (`w5:982`, the L2 replace-rules overlay intended by the file header). A contract regression test now guards against re-binding. See §7. |

### 4.2 Unreachable from `ReaderBase`, retained by other canonical consumers (2)

| ID | Symbol | Retained consumer | Evidence and boundary |
|---|---|---|---|
| 1 | `ReaderControlSheet` | `SourceSwitchFlowPage` | `SourceSwitchFlowComponents.ets` directly composes `ReaderControlSheet` for the current Source Switch family. The zero-instance generic `ViewStateRenderer` branch may be retired, but the shared struct may not be globally deleted by this A2 delta. |
| 8 | `ReaderAutoScrollPanel` | `auto-page` | The canonical `auto-page` view-state fixture contains one `ReaderAutoScrollPanel`, and `ViewStateRenderer` dispatches it. Only `reader-auto-scroll-overlay-v2` is retired; the component remains live for `auto-page`. |

### 4.3 Split performed: retained shared primitive + retired reading-page implementation (3)

The 3 structs that were previously "unreachable from `ReaderBase` but retained for other canonical routes" have been split at the source level. Each old reader-named type is now `status:"explicit-gap"` (0 fixtures, 0 routes - canonical-but-retired, NOT deleted); its shared-primitive content is carried by a new type bound to the surviving routes.

| Old type (now `explicit-gap`) | New shared-primitive type (`referenced`) | Surviving routes re-pointed to new type | Retired reading-page route (absent from enum) |
|---|---|---|---|
| `ReaderDirectoryPanel` | `DirectoryPanel` (4 instances) | `reader-toc-loading` / `reader-toc-offline` / `reader-toc-error` / `bookmarks-manager` | `reader-directory-overlay-v2` / `toc-bookmarks` |
| `ReaderAppearancePanel` | `AppearancePanel` (6 instances) | `reader-font-import-confirm` / `-delete-confirm` / `-fallback` / `reader-theme-new` / `-delete-confirm` / `reader-typography-reset-confirm` | `reader-appearance-overlay-v2` / `reader-appearance` |
| `ReaderReplacePanel` | `ReplacePanel` (7 instances) | `reader-replace-delete-confirm` / `-apply-result` / `-import-export` / `-preview` / `-page` / `content-edit` / `content-replacement` | `reader-replace-overlay-v2` |

The old reader-named types are retained in the `ComponentType` enum as `explicit-gap` records: they document the retired reading-page overlay identities without carrying a fixture or route binding. The new shared-primitive types carry the surviving-route bindings. **Source-side split is complete.** HarmonyOS consumption remains independently validation-gated.

## 5. Consumer sync status (source-of-truth vs consumer)

| Artifact | Location | Status |
|---|---|---|
| Canonical `RouteId` enum (247) | `Reader-UI/ui-spec/screen-graph.schema.json` | ✓ SYNCED — 13 retired absent, 3 canonical present |
| Canonical view-state fixtures | `Reader-UI/contracts/fixtures/view-state.fixtures.json` | ✓ SYNCED — 0 retired-route entries (2 `_comment` refs only) |
| HarmonyOS screen graph | `Reader-for-HarmonyOS` | Historical snapshot only; must be rerun from the independent A2 consumer commit |
| HarmonyOS static contracts | `Reader-for-HarmonyOS` | Historical snapshot only; not current admission |
| HarmonyOS execution gate | `Reader-for-HarmonyOS` | Pending; no B4 promotion is authorized |

The Reader-UI source proof is current. HarmonyOS consumption remains pending an independent clean A2 commit. Machine receipt, device proof, motion proof, and release identity belong to B7 and are not A2/B2/B3 prerequisites.

## 6. Conclusion

The Reader-UI portion of the retract reason *"23 historical reader implementations not proven unreachable"* is resolved:

1. All 13 retired routes are absent from the canonical `RouteId` enum (247 routes).
2. All 6 retired Reader component identities are `explicit-gap` with zero source fixtures.
3. All 13 retired demo renderers are machine-checked against every current integration map and have no live-route binding.
4. `ReaderControlSheet` and `ReaderAutoScrollPanel` are explicitly retained; their HarmonyOS consumers must be preserved during the consumer-side cleanup.

Full A2 closure still requires a clean HarmonyOS proof of `ReaderBase` composition, `ViewStateRenderer` dispatch, retired motion coordinators, and removal of zero-size isolation.

### Follow-ups (out of A2-closure scope)

- ~~Split the 3 retained shared structs into shared-primitive vs retired-only variants.~~ DONE - see §4.3 (retained: `DirectoryPanel`/`AppearancePanel`/`ReplacePanel`; retired: `ReaderDirectoryPanel`/`ReaderAppearancePanel`/`ReaderReplacePanel` as `explicit-gap`).
- Produce an independent clean HarmonyOS A2 consumer cleanup commit and rerun its screen-graph/static checks.
- Keep `harmony.status=candidate-backport`; do not promote until that consumer cleanup and B3 both pass.
- Defer machine receipt, device/motion proof, and release identity to B7.

### Verification artifacts

- Structured findings: `docs/audits/reader-reading-surface-historical-reachability-2026-07-27.json`
- Spot-checks performed: `ReaderBase build()` composition (`ReaderComponents.ets:1643-1681`); dead-code grep for both motion coordinators (0 external call sites in `entry/src/main/ets`).

## 7. Audit correction (2026-07-28) — entry #23 binding

A fifth audit verdict rejected this report's A2 reachability proof for entry #23 (`readerReplaceOverlayV2Screen`) as a false overclaim:

- **The false claim.** Entry #23 was marked `reachableViaRoute: false` / `fullyUnreachable: true`, and the row in §4.1 asserted that the live route `content-replacement` was *not* bound to this demo renderer. In reality, `w5-replace-rules-renderers.js` `INTEGRATION_MAP:975` bound `content-replacement -> readerReplaceOverlayV2Screen` — a surviving canonical route dispatching directly to the supposedly-unreachable demo renderer. The counts (23 total / 21 fully unreachable) were therefore built on a false premise for at least one entry.

- **Root cause.** The `w5` `INTEGRATION_MAP` pointed a surviving route at the retired-route demo renderer, instead of at `contentReplacementScreen` — the L2 replace-rules overlay renderer declared by the file header (`w5:18`) and exported at `w5:988`. The §4.1 row's parenthetical ("handled by the HarmonyOS `ReaderReplacePanel`, not this demo renderer") was true only at the ArkTS native layer, not at the source-side demo-JS layer this report actually proves over.

- **Fix applied.** `content-replacement` is unbound from `readerReplaceOverlayV2Screen` and now dispatches to `contentReplacementScreen` (`w5:982`). `readerReplaceOverlayV2Screen` is bound ONLY to the retired route `reader-replace-overlay-v2` (`w5:983`), which is absent from the 247-route canonical enum — so `fullyUnreachable: true` is now genuine rather than asserted. The counts are unchanged (23 / 21): entry #23 transitions from a *false* `fullyUnreachable` claim to a *true* one; no other entry's classification is altered by this correction.

- **Regression guard.** `contracts/tests/reader-reading-surface-contract-retirement-delta.test.mjs` now asserts (a) the live route `content-replacement` is never bound to `readerReplaceOverlayV2Screen`, and (b) `readerReplaceOverlayV2Screen` is bound only to a route that is absent from the canonical `RouteId` enum — so the false claim cannot recur silently.

- **Scope of this correction.** This originally fixed only entry #23. Section 8 records the later full Reader-UI source re-verification. HarmonyOS-only reachability remains outside that source-side test and still requires its own clean commit.

## 8. Reader-UI source re-verification (2026-07-30)

`contracts/tests/reader-reading-surface-contract-retirement-delta.test.mjs` now machine-checks the complete Reader-UI source boundary:

- all 13 retired routes are absent from the canonical enum;
- all 6 retired Reader component identities are `explicit-gap` with zero fixtures;
- all 13 historical demo renderers are checked against the current D3/W4/W5 integration maps and have no live-route binding;
- `content-replacement` remains bound to `contentReplacementScreen`.

The test deliberately does not claim that `ReaderControlMotionCoordinator`, `ReaderDirectoryToTtsMotionCoordinator`, `ReaderBase`, or `ViewStateRenderer` are closed: those are HarmonyOS consumer facts and remain the next independent A2 step.
