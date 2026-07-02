# Reader UI

This directory contains the UI documentation, design drafts, frontend-input demo, handoff reports, and visual audit artifacts split out from:

`/Users/minliny/Documents/Reader for Android`

Migrated groups:

- `docs/ui-design`
- `docs/ui-handoff`
- `docs/cross-platform-ui`
- `docs/HANDOFF`
- UI-only planning files under `docs/PLANNING`
- Top-level UI/control audit reports such as bottom-bar, quick-action, canonical-control, and Stitch UI reports

Not migrated:

- Android source code under `app/src/...`
- Core, network, WebDAV, adapter, release, and `ANDROID_NON_UI_*` documents

Run the local UI demo from this directory:

```sh
cd "/Users/minliny/Documents/Reader UI"
python3 -m http.server 4177 --bind 127.0.0.1
```

Then open:

`http://127.0.0.1:4177/frontend-demo/`

Run validation:

```sh
cd "/Users/minliny/Documents/Reader UI"
node docs/ui-design/frontend-input/validate-frontend-inputs.js
node frontend-demo/verify/motion/verify-motion-coverage.mjs
node frontend-demo/verify/handoff/verify-ui-handoff-readiness.mjs
```

The UI validation is self-contained for HTML/CSS tokens. Set `READER_TOKEN_CONTRACT_REQUIRE_COMPOSE=1`
with `READER_ANDROID_ROOT` only when the host Android repo still exposes the Compose token source files.

Frontend development readiness:

- `docs/ui-handoff/FRONTEND_DEVELOPMENT_READINESS.md`: UI-side start gate and ownership split.
- `docs/ui-handoff/FRONTEND_DEVELOPMENT_SLICE_MATRIX.md`: recommended bounded platform slices.
- `docs/ui-handoff/UI_PLATFORM_EVIDENCE_REQUESTS.md`: native evidence required from Android / iOS / HarmonyOS repos.
