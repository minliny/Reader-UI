# Reader Reading-Surface Historical Implementation Reachability Report

- **Date:** 2026-07-27
- **Scope:** Source-side symbol/call-graph reachability proof for the `reader.reading-surface` lineage correction (A2 closure).
- **Canonical consumer:** `Reader-for-HarmonyOS/entry/src/main/ets/ui/components/ReaderComponents.ets#ReaderBase`
- **Status:** Source-side proof holds. 23/23 historical implementations fully unreachable from `ReaderBase` (split complete: 3 shared structs split into retained primitives `DirectoryPanel`/`AppearancePanel`/`ReplacePanel` + retired reading-page overlays `ReaderDirectoryPanel`/`ReaderAppearancePanel`/`ReaderReplacePanel` as `explicit-gap`).
- **Retract reason addressed:** *"23 historical reader implementations not proven unreachable"* (PROMOTION_LEDGER retract-002).

## 1. Executive summary

The 13 retired reading-surface routes were physically removed from the canonical `RouteId` enum (260 → 247). The 3 canonical reading routes (`immersive-reading`, `reader`, `reader_content`) are bound to the Figma `ReaderBase` master and dispatch to the canonical consumer `ReaderComponents.ets#ReaderBase`.

This report enumerates the **23 historical reader implementations** (the code symbols that historically rendered the reading surface for the 13 retired routes) and proves each is **unreachable from `ReaderBase`** at the symbol/call-graph level:

- **20 of 23 are fully unreachable** — no path from `ReaderBase` *and* no canonical route dispatch (owning retired route absent from the enum, no surviving dispatch, dead code).
- **3 of 23 (`ReaderDirectoryPanel`, `ReaderAppearancePanel`, `ReaderReplacePanel`) were previously unreachable from `ReaderBase` but retained for other canonical routes; they have now been split** into a **retained shared primitive** (`DirectoryPanel` / `AppearancePanel` / `ReplacePanel`, `status:"referenced"`, serving the 17 surviving non-reading-surface routes) and a **retired reading-page implementation** (`ReaderDirectoryPanel` / `ReaderAppearancePanel` / `ReaderReplacePanel`, `status:"explicit-gap"`, 0 fixtures / 0 routes - the reading-page overlay record retained as a canonical-but-retired marker, NOT deleted). All 23 historical reading-page implementations are now fully unreachable.

The reading surface therefore has a **single canonical implementation path** (`ReaderBase`). The lineage correction is valid at the source level.

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

### 4.1 Fully unreachable (20)

| ID | Symbol | File:line | Category | Retired route | Evidence |
|---|---|---|---|---|---|
| 1 | `ReaderControlSheet` | `ReaderOverlayComponents.ets:368` | control-layer | `control-layer-base-v2` | Not composed by `ReaderBase`. Dispatched only at `ViewStateRenderer.ets:889` when `component.type==='ReaderControlSheet'`; 0 occurrences in canonical view-state / `ViewStateTable.ets`. Owning route absent from enum. |
| 4 | `ReaderTtsPanel` | `ReaderOverlayComponents.ets:1932` | overlay-component | `reader-tts-overlay-v2` / `tts` | Not composed by `ReaderBase`. Dispatched at `ViewStateRenderer.ets:964`; 0 occurrences in canonical view-state. Both routes absent from enum. |
| 5 | `ReaderSettingsPanel` | `ReaderOverlayComponents.ets:2220` | overlay-component | `reader-settings-overlay-v2` / `reader-settings` | Not composed by `ReaderBase`. Dispatched at `ViewStateRenderer.ets:966`; 0 occurrences in canonical view-state. Both routes absent from enum. |
| 6 | `ReaderSearchPanel` | `ReaderOverlayComponents.ets:4596` | overlay-component | `reader-search-overlay-v2` / `content-search` | Not composed by `ReaderBase`. Dispatched at `ViewStateRenderer.ets:995`; 0 occurrences in canonical view-state. Both routes absent from enum. |
| 8 | `ReaderAutoScrollPanel` | `ReaderOverlayComponents.ets:4860` | overlay-component | `reader-auto-scroll-overlay-v2` | Not composed by `ReaderBase`. Dispatched at `ViewStateRenderer.ets:1016`; 0 occurrences in canonical view-state. Route absent from enum. |
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
| 23 | `readerReplaceOverlayV2Screen` | `w5-replace-rules-renderers.js:910` | demo-renderer | `reader-replace-overlay-v2` | Bound via `w5 INTEGRATION_MAP:976`; route absent from enum. (`w5:975` binds `content-replacement`, a surviving route handled by the HarmonyOS `ReaderReplacePanel`, not this demo renderer.) |

### 4.2 Split performed: retained shared primitive + retired reading-page implementation (3)

The 3 structs that were previously "unreachable from `ReaderBase` but retained for other canonical routes" have been split at the source level. Each old reader-named type is now `status:"explicit-gap"` (0 fixtures, 0 routes - canonical-but-retired, NOT deleted); its shared-primitive content is carried by a new type bound to the surviving routes.

| Old type (now `explicit-gap`) | New shared-primitive type (`referenced`) | Surviving routes re-pointed to new type | Retired reading-page route (absent from enum) |
|---|---|---|---|
| `ReaderDirectoryPanel` | `DirectoryPanel` (4 instances) | `reader-toc-loading` / `reader-toc-offline` / `reader-toc-error` / `bookmarks-manager` | `reader-directory-overlay-v2` / `toc-bookmarks` |
| `ReaderAppearancePanel` | `AppearancePanel` (6 instances) | `reader-font-import-confirm` / `-delete-confirm` / `-fallback` / `reader-theme-new` / `-delete-confirm` / `reader-typography-reset-confirm` | `reader-appearance-overlay-v2` / `reader-appearance` |
| `ReaderReplacePanel` | `ReplacePanel` (7 instances) | `reader-replace-delete-confirm` / `-apply-result` / `-import-export` / `-preview` / `-page` / `content-edit` / `content-replacement` | `reader-replace-overlay-v2` |

The old reader-named types are retained in the `ComponentType` enum as `explicit-gap` records (mirroring the existing `ReaderTtsPanel` / `ReaderSettingsPanel` retirement pattern): they document the retired reading-page overlay implementation without being deleted, and have no fixture or route binding. The new shared-primitive types carry the surviving-route bindings. **Source-side split is complete.** The consumer-side counterpart (struct rename `ReaderDirectoryPanel`->`DirectoryPanel` etc. + retirement of the reading-page sheet shells `ReaderModulePanelShell` / `ReaderQuickPanelShell` + close-event wiring) is tracked as task #13; it does not affect the source-side reachability proof, which rests on the canonical enum + view-state fixtures + component catalog. All 3 reader-named types are now fully unreachable as reading-page implementations at the source level.

## 5. Consumer sync status (source-of-truth vs consumer)

| Artifact | Location | Status |
|---|---|---|
| Canonical `RouteId` enum (247) | `Reader-UI/ui-spec/screen-graph.schema.json` | ✓ SYNCED — 13 retired absent, 3 canonical present |
| Canonical view-state fixtures | `Reader-UI/contracts/fixtures/view-state.fixtures.json` | ✓ SYNCED — 0 retired-route entries (2 `_comment` refs only) |
| Consumer `ViewStateTable.ets` | `Reader-for-HarmonyOS/.../generated/ViewStateTable.ets` | ✓ SYNCED — retired routes absent as routeId entries |
| Consumer `RouteReconstructionQuarantine.ets` | `Reader-for-HarmonyOS/.../contract/reader_ui/` | ✓ Confirms 13 `ROUTE_IDS` quarantined, `RELEASED_ROUTE_IDS=['immersive-reading','reader','reader_content']` |
| Consumer `RouteTable.ets` | `Reader-for-HarmonyOS/.../generated/RouteTable.ets:5` | ⚠ STALE — still lists all 13 retired routes in the `RouteId` type union (sync pending — separate later task) |
| Demo runtime (`render-runtime.js`, `d3`/`w4`/`w5` renderers, `reader-runtime-contract.js`) | `Reader-UI/frontend-demo-optimized/` | ⚠ NOT synced — still carries retired-route bindings (`render-runtime.js:11152-11167`, d3 `INTEGRATION_MAP`, `w5 INTEGRATION_MAP:976`, `reader-runtime-contract.js PRIMARY_ROUTES:4-18` + `COMPATIBILITY_ROUTE_CROSSWALK:20-28`). Demo-side, not the canonical contract; source-side proof rests on the canonical enum + view-state fixtures. |

The source-side proof is complete and does not depend on the pending consumer `RouteTable.ets` sync or the demo-runtime cleanup. Those are tracked separately.

## 6. Conclusion

The retract reason *"23 historical reader implementations not proven unreachable"* is **resolved at the source level**:

1. All 13 retired routes are absent from the canonical `RouteId` enum (247 routes).
2. The canonical consumer `ReaderComponents.ets#ReaderBase` composes only `ReadingBackgroundLayer`, `ReadingTextFlow`, `TapZones`, `ControlDismissZone`, `ReadingInfoLayer` — none of the 23 historical implementations appear in its composition tree.
3. 20 of 23 are fully unreachable (no `ReaderBase` path + no canonical route dispatch + dead code verified for the 2 motion coordinators).
4. 3 of 23 (`ReaderDirectoryPanel`, `ReaderAppearancePanel`, `ReaderReplacePanel`) were split: shared-primitive content retained as new types (`DirectoryPanel`/`AppearancePanel`/`ReplacePanel`, referenced by 17 surviving routes) + reading-page overlay record retired as `status:"explicit-gap"` (0 fixtures/0 routes, canonical-but-retired NOT deleted). All 23 are now fully unreachable.

**The reading surface has a single canonical implementation: `ReaderBase`.** The lineage correction is valid.

### Follow-ups (out of A2-closure scope)

- ~~Split the 3 retained shared structs into shared-primitive vs retired-only variants.~~ DONE - see §4.2 (retained: `DirectoryPanel`/`AppearancePanel`/`ReplacePanel`; retired: `ReaderDirectoryPanel`/`ReaderAppearancePanel`/`ReaderReplacePanel` as `explicit-gap`).
- Consumer `RouteTable.ets` sync (remove 13 retired routes from the type union) — tracked as the separate consumer-sync task.
- Demo-runtime retired-route binding cleanup (`render-runtime.js`, `d3`/`w4`/`w5`, `reader-runtime-contract.js`) — demo-side, non-canonical.

### Verification artifacts

- Structured findings: `docs/audits/reader-reading-surface-historical-reachability-2026-07-27.json`
- Spot-checks performed: `ReaderBase build()` composition (`ReaderComponents.ets:1643-1681`); dead-code grep for both motion coordinators (0 external call sites in `entry/src/main/ets`).
