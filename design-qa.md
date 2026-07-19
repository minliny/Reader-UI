# Reader 2 Static Design QA

Date: 2026-07-15  
Scope: Reader control layer only  
Figma source: `15 · Reader 2` (`1023:17636`)  
Implementation: `frontend-demo-optimized/`

## Inputs

- Control home: `654:674`
- Seven quick/module states: `1023:18314`
- Four primary full pages: `1023:18294`
- Responsive masters: `1023:18737`, `1023:18741`, `1023:18745`
- Unique atoms: ThemeSwatch `1023:17824`, FontCell `1023:17903`, timer-card `1137:10098`
- Design Delta: `docs/design/READER2_STATIC_DESIGN_DELTA_2026-07-15.md`

## Visual comparison

- Phone, 12 primary states: `/tmp/reader2-vc3-implementation/phone-all-after-comparison.png`
- Phone measurements: `/tmp/reader2-vc3-implementation/phone-audit-after.json`
- Responsive matrix: `/tmp/reader2-vc3-implementation/responsive-after-comparison.png`
- Figma reference exports: `/tmp/reader2-vc2-reference/`
- Replacement quick-panel source: `/tmp/reader2-replace-figma-phone.png` (`1023:18339`)
- Replacement quick-panel implementation: `/tmp/reader2-replace-local-after.png`
- Replacement side-by-side comparison: `/tmp/reader2-replace-figma-local-comparison.png`

The comparisons use the same route/state and device canvas. Screenshots were taken with `motionReduced=1` and `captureChrome=0` after the page, fonts, and geometry stabilized.

## Viewport results

| Canvas | Runtime class | Frame | TopBar | Sheet | ModuleNav | Result |
| --- | --- | --- | --- | --- | --- | --- |
| Phone 390×844 | `standard-portrait` | 390×844 R34 | 360.903×53.993 at 14.549,18.550 | 364.896×330 at 12.552,495.443 | 340.903×79.089 at 24.549,732.352 | pass |
| Compact 844×390 | `compact-landscape` | 844.444×390 R0 | 815.347×47.995 at 14.549,12.552 | 340×230 at 487.891,90.451 | 340×53.993 at 487.891,319.453 | pass |
| Tablet internal 760×960 | `tablet-expanded` | 760×959.774 R24 | relative 702.899×53.993 at 28.550,18.550 | relative 340×251.997 at 395.451,597.222 | relative 340×78.533 at 395.451,848.689 | pass |

All frozen outer geometry differs by no more than approximately 1px. The Tablet target is the internal device frame; the browser outer viewport must be at least 840px wide.

## State and interaction results

- 12/12 primary states rendered with one Reader frame and the expected control surface.
- Four module controls reach `toc-bookmarks`, `tts`, `reader-appearance`, and `reader-settings`; clicking the active module returns to `reader`.
- Search, AutoPage, and Replace reach their compact quick states. Search and AutoPage expand and collapse without changing route.
- Immersive reading opens and dismisses the control layer. Source switch reaches `source-switch`.
- Seven compatibility routes match the canonical overlay geometry while retaining their `page` surface semantics.
- `content-replacement` and `reader-replace-overlay-v2` both consume the same W5 quick-panel implementation. Its deleted footer actions remain absent; full management remains reachable through the shared grabber.
- Browser console: 0 warnings, 0 errors.

## Rendering and component results

- Reading content remains full-width beneath the floating control layer in all three viewports; no left/right split is present.
- Runtime pagination is active and recalculates from the complete chapter. Observed page counts are Phone 7, Compact 13, Tablet 5.
- ThemeSwatch, FontCell, and timer-card each have one shared implementation source; page renderers consume those sources.
- Full Appearance uses the frozen Theme / Typography / Font section structure without compressing scroll content.
- Full Directory header and tabs use Tabler instances at 16px / 15px. No handcrafted SVG was introduced.
- All 12 primary states pass the forbidden-shadow audit. Brightness dim nodes have `box-shadow: none`, `filter: none`, and `pointer-events: none`; the top-left square artifact is absent.

## Replacement quick-panel comparison history

- Earlier implementation evidence: the panel was approximately 286×190, retained `预览效果 / 完整管理`, and left a larger gap above ModuleNav.
- Fix applied: the active W5 renderer now uses quick mode and the shared action-quick size constraint; footer markup and footer-only CSS were removed. Header and rule-list geometry remain 28px and 264×115 / 250×112 respectively.
- Post-fix evidence at the 390×844 device canvas: Search, AutoPage, `content-replacement`, and `reader-replace-overlay-v2` all report the same runtime panel box, approximately 287.795×196.901 after browser sub-pixel layout. The Figma component source is 286×196.
- Responsive evidence: Search, AutoPage, and Replace remain identical at CompactLandscape (approximately 280.894×188.898) and TabletExpanded (approximately 262.899×190.894); no panel-specific translation or Dock resize is present.
- Unchanged shared structure: one BrightnessRail, four ModuleNav buttons, a 330px Sheet, and the existing grabber route to `reader-replace-page`.
- Interaction evidence: the `雨容称呼` switch was toggled `true → false → true`, then the grabber navigated to `reader-replace-page`; browser warning/error log remained empty.
- Full-view and focused control-region comparison are both represented by `/tmp/reader2-replace-figma-local-comparison.png`; no additional focused crop was needed because the source and implementation are both readable at 390×844.
- Required fidelity surfaces: typography, spacing, control colors, Tabler icons, and copy match the frozen component at the intended state. There are no image assets specific to this quick panel.
- Post-fix finding: no actionable P0, P1, or P2 difference remains for this delta.

## Automated gates

| Gate | Result |
| --- | --- |
| JavaScript syntax checks | pass |
| `node --test frontend-demo-optimized/verify/*.test.mjs` | 46/46 pass |
| Tabler icon registry | `staticGaps=0` |
| Contract consistency | `unapproved=0` |
| P0 chain matrix | 120/120 pass |
| `git diff --check` | pass |

## Findings

- P0: none.
- P1: none.
- P2: the demo preserves several visually small controls from the frozen design (the 42×4 grabber, 24×20 auto-brightness button, and 30px-high progress hit area). All have accessible names, but native Host implementations should enlarge their invisible hit targets without changing the static geometry.

This QA closes Reader 2 control-layer VC3 only. It does not close other product page families, Motion Reference, or any Host implementation.

final result: passed
