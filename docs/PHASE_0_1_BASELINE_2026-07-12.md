# Reader UI Phase 0/1 baseline

Date: 2026-07-12

## Canonical source

- Runnable design and interaction source: `frontend-demo-optimized/`
- Route, state, event, motion, token and view-state contract: `contracts/`
- Native generated output: `generated/`
- `frontend-demo-next/` is an experimental redraw lane and is not a release input.

The repository may be dirty while the redraw work is in progress. Phase 0 does
not create a commit implicitly. A release identity is valid only after the
commands below pass against the exact bytes recorded in
`UI_RELEASE_MANIFEST.json`.

## Phase 1 structural invariants

1. A route id is a stable wire value, not permission to create a new device
   canvas. `routePresentation` assigns every route a family, surface and layout
   profile.
2. Shells own geometry. Page renderers fill slots and must not redefine the
   device viewport.
3. `ReaderShell` owns `readingSurface`, `readerOverlayHost`,
   `bottomSheetHost`, `readerModuleNav`, `readerAccessoryHost` and
   `readerStateHost`.
4. Brightness is a single `readerAccessoryHost` control. Reader panels may not
   append their own rail to panel content.
5. Loading, empty, error, offline and confirmation routes keep their stable ids
   but render as state/overlay surfaces inside their owning Shell.
6. Wide workspace and flow-continuity behavior is selected by a layout profile,
   never by CSS branching on individual route ids.
7. The current product renders one running-session capsule in immersive reader
   information chrome. `controlSpace` ids remain protocol-reserved and do not
   create a second capsule.

## Reproducible gates

```sh
node --test frontend-demo-optimized/verify/*.test.mjs
node frontend-demo-optimized/verify/contract/verify-demo-contract-consistency.mjs
node frontend-demo-optimized/verify/motion/verify-motion-coverage.mjs
node tools/screen-graph/generate-screen-graph.mjs
npm test --prefix contracts/tests
node tools/codegen/check-drift.mjs
node tools/release/generate-ui-release-manifest.mjs --check
git diff --check
```

Platform builds, accessibility, performance and device proof remain owned by
the Android, iOS and HarmonyOS repositories and are not implied by these gates.
