# Reader UI

This repository contains the current Reader UI demo and the generated contract surface consumed by native platform repos. Obsolete design drafts, legacy exports, platform package reports, Stitch captures, and visual audit artifacts have been removed so they cannot be used as implementation sources.

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

Current source directories:

- `frontend-demo/` — canonical runnable demo for route, structure, state, token, and motion semantics.
- `contracts/` — schema, fixtures, contract tests, and architecture plan.
- `tools/codegen/` — Swift / Kotlin / ArkTS generator entry.
- `generated/` — generated contract outputs.

Removed legacy sources:

- legacy documentation directory
- `artifacts/demo-baseline/`
- `_archived_planning_2026-06-24/`
- `.uploads/`

Do not reintroduce old design packages or legacy exports as current UI truth. If a platform implementation needs structure, read `frontend-demo/` and `contracts/fixtures/view-state.fixtures.json`.

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
node tools/codegen/generate.mjs
npm test --prefix contracts/tests
node tools/codegen/check-drift.mjs
node frontend-demo/verify/motion/verify-motion-coverage.mjs
```

The UI validation is self-contained for the current demo and generated contracts. Platform build, navigation, device, accessibility, and performance proof must be produced in the Android / iOS / HarmonyOS repos.

Contract development rule:

- Demo route, motion, state, and token semantics should be promoted into machine-readable contracts before platform teams depend on them.
- Platform repos may consume generated types, but reducers/coordinators remain native and local to each platform.
