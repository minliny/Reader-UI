# Design QA — Local Import Popup

## Source and implementation

- Visual source: [Figma Make · Design Import Popup State](https://www.figma.com/make/uD7wNMW6vcQSmUFCkOors7/Design-Import-Popup-State?fullscreen=1&t=Eer0n0AoZMtLSxvD-1&code-node-id=0-9)
- Canonical runtime: `frontend-demo-optimized`
- Entry point: Bookshelf → More → Local book import. The flow stays on Bookshelf; it does not create or navigate to a standalone import page.
- Supported native file selection: `EPUB`, `PDF`, `TXT`, and `MOBI`, with `multiple` enabled and a maximum of 50 files per selection.

## Visual comparison

The source is on the left and the local implementation is on the right.

- File picker: `docs/design/evidence/local-import-popup/comparison-picker.png`
- Import result: `docs/design/evidence/local-import-popup/comparison-result.png`
- Figma Page 08 after cleanup: `docs/design/evidence/local-import-popup/figma-page08-after-cleanup.png`

The implementation preserves the Make geometry and design language: 350 px dialog width, 20 px outer radius, warm paper surface, blurred Bookshelf backdrop, compact file rows, semantic project icons, and the same primary/secondary action hierarchy. The result comparison intentionally uses real selected files; filenames and counts therefore differ from Make's illustrative data while layout and state semantics remain aligned.

## Interaction verification

- The Bookshelf import entry opens the picker dialog without route navigation.
- The system file chooser reports `multiple = true`.
- A real `.txt` plus unsupported `.md` selection was exercised.
- The same dialog transitions through processing and settles to one success and one failure.
- Failed items expose retry; completed results expose finish; closing restores focus to the originating Bookshelf control.
- No browser console errors were recorded during the verified flow.
- Phone and Tablet use the same canonical dialog component; landscape remains a Tablet alias and no Compact/Fold variant is introduced.

## Figma Page 08 cleanup

Removed only the four obsolete import-state reference nodes under `580:198`:

- `576:198` — import-permission-denied
- `577:198` — import-conflict-resolve
- `578:198` — import-parsing
- `579:198` — import-partial-success

The Bookshelf empty-state reference and canonical Local Import action/evidence components were preserved. Post-delete node lookup returned no matches for all four removed IDs, and the refreshed Page 08 screenshot contains only the Bookshelf reference in that section.

## Result

Passed. No remaining P0, P1, or P2 mismatch was found in the picker/result component geometry, visual hierarchy, or core interaction path.
