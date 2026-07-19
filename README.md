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

Reader 2 的外观配置使用 `contracts/fixtures/appearance.fixtures.json` 作为可执行单一源：codegen 同时产出 Web `appearance-spec.js` 与 Swift/Kotlin/ArkTS `Appearance.*`，三端 UI 不再维护独立的主题、字体、选择项和步进器数组。Figma 改稿仍需先形成审阅后的 design delta，再修改该 fixture；不得直接由 Figma 覆盖平台代码。

Current Reader-UI Contract head is 3.0.0: Route 260, UiEvent 300, Motion 95, CoreCommand 71, CoreEvent 95, HostRequest 58, HostResult 58, schema-scanned fixtures 1328, runtime actions 63, ownership 63 implemented / 230 planned / 7 platform-ephemeral. R14.1 defines strict lossless payload contracts for all 63 actions (170 payload fixtures, 73 result mappings across 35 effect types, and 154 result fixtures). R16D currently publishes a 260-route / 190-variant / 615-component ScreenGraph with 97 canonical action bindings: 38 bind to the executable runtime payload contract and 59 remain planned/fail-closed; it also carries 19 non-executable state-event evidence records and 6 explicit action gaps. Component nodes publish state authority and `contract-tree` / `host-composite` composition semantics so native renderers do not recursively duplicate Host-owned Reader surfaces. The current 3.0 candidate release manifest is generated from the current repository bytes; run its check command instead of copying historical file/test counts from this paragraph. The three Host consumer locks remain at 2.5.1 and cover the same 35 runtime events: directory, `book.open`, TTS, and auto-page form the 7-event Pilot set; page, import, source-switch, replace, RSS, and Sync remain the 28-event default-Shadow set. The other 28 runtime actions remain staging-only, and no workflow is Authoritative yet. Reader-UI 3.0.0 therefore does not claim release consumption until the same bytes are committed/tagged, a verified 3.0 artifact is published, and each Host lock is updated from that artifact.

Figma is a curated visual editing surface, not a second executable source of truth. The local handoff plan records 29 pages (`00`–`28`) and an existing `25 · Motion Reference`; the older 25-page inventory (497 variables, 929 components including variants, 115 component sets, 608 variants, 139 Tabler icon components, 6 raw covers, and 24 page/state candidate families) remains a dated material snapshot rather than proof of current completeness. Motion Reference is a review artifact; production timing and behavior remain governed by the executable Reader-UI contracts and verified Host implementations. The required order is recorded in [`docs/design/VISUAL_CLOSURE_PLAN_2026-07-14.md`](./docs/design/VISUAL_CLOSURE_PLAN_2026-07-14.md), with inventory and authority details in [`docs/design/FIGMA_HANDOFF_STATUS_2026-07-12.md`](./docs/design/FIGMA_HANDOFF_STATUS_2026-07-12.md) and [`docs/design/FIGMA_MATERIAL_INVENTORY_2026-07-13.md`](./docs/design/FIGMA_MATERIAL_INVENTORY_2026-07-13.md). The separate [`MR0–MR5 motion track`](./docs/design/MOTION_DELIVERY_PLAN_2026-07-14.md) remains the implementation and verification plan.

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
