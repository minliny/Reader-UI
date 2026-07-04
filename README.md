# Reader UI

This directory contains the UI documentation, design drafts, frontend-input demo, handoff reports, visual audit artifacts, and the new Reader UI Contract planning surface split out from:

`/Users/minliny/Documents/Reader for Android`

## Current architecture role

`Reader UI` is the contract source for the Reader multi-end native UI effort. It is not a production UI runtime and it must not become a shared Web/CSS/DOM implementation for iOS, Android, or HarmonyOS.

The current architecture direction is Contract-first Native UI Architecture:

```text
Reader-Core-Native
  -> business source of truth

Reader UI Contract
  -> route / state / event / motion / token / view-state schema + codegen

Platform Interaction Reducer
  -> native reducer/coordinator in iOS, Android, and HarmonyOS

Host Adapter
  -> platform HTTP / WebView / Cookie / file / permission / TTS / background capability

Native UI
  -> SwiftUI / Compose / ArkUI render ViewState and emit UiEvent
```

Primary planning entry:

- `contracts/CONTRACT_FIRST_NATIVE_UI_PLAN.md`

New contract directories:

- `contracts/` — schema, fixtures, contract tests, and architecture plan.
- `tools/codegen/` — future Swift / Kotlin / ArkTS generator entry.
- `generated/` — generated contract outputs after schema/codegen stabilizes.

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

Contract development rule:

- Demo route, motion, state, and token semantics should be promoted into machine-readable contracts before platform teams depend on them.
- Platform repos may consume generated types, but reducers/coordinators remain native and local to each platform.
