# Stitch Visual Review — After Capability Smoke

**Date**: 2026-05-29
**Status**: `ANDROID_STITCH_P1_VISUAL_POLISH_READY`

---

## 1. Baseline

| Field | Value |
|-------|-------|
| HEAD | `d12426b` — `feat: wire UI capability smoke flow` |
| Parent | `58789ac` — `[S16-FIXTURE] Add biquges123.com real source offline replay fixture` |
| git status | Clean — `.claude/*` files stashed |
| App Shell used | Yes — `ReaderRouteHost` → `StitchAppShell` |
| Prototype Gallery used | No |

---

## 2. Scope Compliance

| Rule | Status |
|------|--------|
| Modified UI visually? | No — read-only audit |
| Modified Reader-Core? | No |
| Accessed real network? | No |
| Used Prototype Gallery? | No |
| Changed capability smoke path? | No |

---

## 3. Page Visual Audit Matrix

| Page | Route | Capability Wired | Stitch Visual Consistency | Key Issues | Severity | Blocking? |
|------|-------|-----------------|--------------------------|------------|----------|-----------|
| Bookshelf | `BOOKSHELF` | Yes — hardcoded data | Partial — colors OK, typography/spacing hardcoded | No state handling; custom sizes vs theme tokens | P1 | No |
| Search | `SEARCH` | Yes — FakeCoreBridge | Good — uses theme tokens + standard components | `else -> {}` silently drops some ReaderUiState subtypes | P1 | No |
| Detail | `DETAIL/{detailUrl}` | Yes — FakeCoreBridge | Good — uses ReaderTheme throughout | Missing cover image, "加入书架" button | P1 | No |
| TOC | `TOC/{tocUrl}` | Yes — FakeCoreBridge | **Poor** — Material3 throughout, no ReaderTheme | Entirely different visual language; no error state display | P1 | No |
| Reader | `READER_CONTENT/{url}/{title}` | Yes — FakeCoreBridge | Good — uses theme + standard states | Zone metrics hardcoded (fragility); no-contentUrl shows bare Text | P1 | No |
| Error | inline / error route | Yes — via ViewModel catch | Good — standard components used | TOCScreen error field unused | P1 | No |

---

## 4. P0 Issues: NONE

No page crash, no broken navigation, no content invisible, no real network trigger, no Prototype Gallery fallback. The Search → Detail → TOC → Content smoke path works through the official App Shell routes.

---

## 5. P1 Issues — Fixed (2026-05-29)

| # | Issue | Fix | Status |
|---|-------|-----|--------|
| P1-1 | TOCScreen Material3 theme exclusively | Rewrapped in ReaderTheme, replaced TopAppBar→ReaderAppTopBar, replaced progress→ReaderLoadingState, replaced typography→ReaderTheme.typography, replaced colors→ReaderTheme.colors | **FIXED** |
| P1-2 | TOCScreen error not displayed | Added `ReaderErrorState` in error branch with retry placeholder | **FIXED** |
| P1-3 | StitchBottomNav duplicate Search icons | "发现"→Icons.Filled.Explore, "我的"→Icons.Filled.Person | **FIXED** |
| P1-4 | StitchAppShell hardcoded sizes | Deferred — sizes are part of Stitch design spec, cannot trivially map to ReaderTheme tokens without visual design change | **DEFERRED** |
| P1-5 | `READER` prototype route + duplicate READER_CONTENT | Removed standalone READER route, removed shadow READER_CONTENT block that rendered StitchReaderPage (was shadowing correct ReaderScreen block). Removed StitchReaderPage import. Updated AppNavigation + 2 tests. | **FIXED** |
| P1-6 | Component duplication | Deferred — low-risk cosmetic, no behavioral impact, needs coordinated rename/consolidation | **DEFERRED** |

## 5b. Original P1 Issues (unchanged for history)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| P1-1 | TOCScreen uses Material3 theme exclusively — no ReaderTheme wrapping, uses `MaterialTheme.typography`, `MaterialTheme.colorScheme`, `CircularProgressIndicator`, `TopAppBar` instead of `ReaderAppTopBar` | `TOCScreen.kt` | Visual mismatch with all other pages |
| P1-2 | StitchBottomNav: "发现" and "我的" tabs use identical `Icons.Filled.Search` icon | `StitchAppShell.kt` line 62-63 | Users cannot distinguish tabs by icon |
| P1-3 | StitchBottomNav icons don't match `AppNavigation.kt` definitions (MenuBook/Search/MoreVert/Search vs Book/Explore/Hub/Person) | `StitchAppShell.kt` vs `AppNavigation.kt` | Design inconsistency between data model and UI |
| P1-4 | StitchAppShell uses hardcoded font sizes (24sp, 18sp, 14sp) instead of ReaderTheme.typography tokens | `StitchAppShell.kt` | Typography drift from theme |
| P1-5 | TOCScreen ViewModel has `error` field that is never displayed | `TOCScreen.kt` | Missing error feedback |
| P1-6 | `READER` route still uses `StitchReaderPage` (hardcoded prototype) instead of `ReaderScreen` | `ReaderRouteHost.kt` line 238-239 | Legacy prototype route still active |

---

## 6. Component Health

| Component | Status | Notes |
|-----------|--------|-------|
| `ReaderAppTopBar` | Consistent use | Used by Search, Detail, Reader; missing from TOC, StitchAppShell |
| `ReaderCard` | Consistent use | Used by Detail, CommonComponents |
| `ReaderPrimaryButton` | Consistent use | One instance in Detail |
| `ReaderEmptyState` | Consistent use | Search, Reader |
| `ReaderErrorState` | Consistent use | Search, Detail, Reader |
| `ReaderLoadingState` | Consistent use | Search, Detail, Reader |
| `ReaderOfflineState` | Consistent use | Search |
| `ReaderMainTabBar` | Unused | Defined but not in nav graph — StitchBottomNav used instead |
| `ReaderIconButton` | Duplicated | Two variants in CommonComponents + ReaderNativeComponents |
| `ReaderChip` | Duplicated | Two variants with different selected-state rendering |

---

## 7. Verification

| Command | Result |
|---------|--------|
| `git status` | Clean (`.claude/*` stashed) |
| `./gradlew :app:testDebugUnitTest --tests "*UiCapabilitySmokeTest"` | PASS |
| `./gradlew :app:testDebugUnitTest` | PASS |
| `./gradlew :app:assembleDebug` | PASS |
| Network access | 0 |

---

## 8. Conclusion

**0 P0 issues found.** The App Shell search-to-reader smoke path works correctly through official routes. All pages render without crash. The visual inconsistencies are all P1 polish items (typography drift, component duplication, TOCScreen Material3 migration).

**Next**: Proceed to P1 visual polish or device review. The baseline is stable for either path.

---

## 9. P1 Polish Priority Order

| Priority | Issue | Effort |
|----------|-------|--------|
| 1 | TOCScreen: migrate to ReaderTheme + standard components | Small — wrap in ReaderTheme, swap components |
| 2 | StitchBottomNav: fix icon mismatch with AppNavigation | Tiny — change 2 icon references |
| 3 | TOCScreen: wire error state display | Tiny — add ReaderErrorState |
| 4 | StitchAppShell: use ReaderTheme.typography tokens | Small — replace hardcoded sizes |
| 5 | Clean up `READER` prototype route | Tiny — remove or redirect to READER_CONTENT |
| 6 | Resolve component duplication | Medium — unify ReaderIconButton, ReaderChip |
