# Reader UI

This repository is the canonical UI source for Reader: demo semantics, machine-readable contracts, executable interaction rules, and native-consumable Swift/Kotlin/ArkTS runtime packages.

## Current architecture role

`Reader UI` does not ship a shared Web/CSS/DOM frontend. It ships a platform-neutral state/effect runtime that native hosts consume while continuing to render with SwiftUI, Compose, and ArkUI.

The current architecture is Executable UI Spec + Native Renderer:

```text
Reader-Core-Native
  -> business source of truth

Reader UI Executable Spec
  -> route / state / event / motion / token / view-state schema + codegen
  -> deterministic runtime actions + Swift/Kotlin/ArkTS packages

Native Renderer
  -> SwiftUI / Compose / ArkUI component registry

Host Adapter
  -> platform HTTP / WebView / Cookie / file / permission / TTS / background capability

Thin Host Coordinator
  -> dispatch UiEvent, execute runtime effects, return CoreEvent / HostResult
```

Primary architecture entries:

- `contracts/ARCHITECTURE.md`
- `EXECUTABLE_UI_RUNTIME.md`

Current source directories:

- `frontend-demo-optimized/` — canonical runnable demo for route, structure, state, token, and motion semantics.
- `contracts/` — schema, fixtures, contract tests, and architecture plan.
- `tools/codegen/` — Swift / Kotlin / ArkTS generator entry.
- `generated/` — generated contract outputs.
- `ui-spec/` — executable cross-platform action descriptors.
- `packages/` — reference runtime and native Swift/Kotlin/ArkTS runtime packages.

Current 2.5.1 contract/runtime snapshot: Route 235, UiEvent 270, Motion 93, CoreCommand 71, CoreEvent 95, HostRequest 58, HostResult 58, fixtures 1233, runtime actions 61, ownership 61 implemented / 202 planned / 7 platform-ephemeral. R14.1 defines strict lossless payload contracts for all 61 actions (170 payload fixtures, 70 result mappings, and 142 result fixtures). R16D currently publishes a 235-route / 165-variant / 519-component ScreenGraph with 36 executable bindings, 19 non-executable state-event evidence records, and 6 explicit action gaps. The immutable local release manifest is generated from the current repository bytes; run its check command instead of copying historical file/test counts from this paragraph. The three Host locks cover the same 35 runtime events: directory, `book.open`, TTS, and auto-page form the 7-event Pilot set; page, import, source-switch, replace, RSS, and Sync remain the 28-event default-Shadow set. The other 26 runtime actions remain staging-only, and no workflow is Authoritative yet.

Figma is a curated visual editing surface, not a second executable source of truth. The current component and Phase 4 handoff, including the manual return path to code, is recorded in [`docs/design/FIGMA_HANDOFF_STATUS_2026-07-12.md`](./docs/design/FIGMA_HANDOFF_STATUS_2026-07-12.md).

Removed legacy sources:

- legacy documentation directory
- `artifacts/demo-baseline/`
- `_archived_planning_2026-06-24/`
- `.uploads/`

Do not reintroduce old design packages or legacy exports as current UI truth. If a platform implementation needs structure, read `frontend-demo-optimized/` and `contracts/fixtures/view-state.fixtures.json`.

Run the local UI demo from this directory:

```sh
python3 -m http.server 4177 --bind 127.0.0.1
```

Then open:

`http://127.0.0.1:4177/frontend-demo-optimized/`

Run validation (from the repository root):

```sh
node tools/codegen/generate.mjs
node tools/runtime/generate-runtime.mjs
npm test --prefix contracts/tests
node tools/codegen/check-drift.mjs
node frontend-demo-optimized/verify/contract/verify-demo-contract-consistency.mjs
node frontend-demo-optimized/verify/verify-p0-chain-matrix.mjs
node frontend-demo-optimized/verify/motion/verify-motion-coverage.mjs
swift test --disable-sandbox
./gradlew test
```

The UI validation is self-contained for the current demo and generated contracts. Platform build, navigation, device, accessibility, and performance proof must be produced in the Android / iOS / HarmonyOS repos.

Contract development rule:

- Demo route, motion, state, and token semantics should be promoted into machine-readable contracts before platform teams depend on them.
- Platform repos consume generated types and the matching ReaderUIRuntime package. Native renderers, EphemeralState, Core bridge, Host Adapter, and device proof remain platform-owned.
- A UI-only change is host-zero-touch when it stays inside registered ComponentType/token/motion/HostRequest capabilities. Adding a new native primitive or platform capability requires one renderer/adapter extension per host.
