# Figma → Reader-UI → Native Agent Execution Protocol

**Status:** mandatory operating protocol

**Effective:** 2026-07-26

**Applies to:** Figma work, `Reader-UI`, `Reader-for-Android`, `Reader-for-iOS`, and `Reader-for-HarmonyOS`
**Purpose:** prevent an agent from replacing confirmed Figma design with a locally invented approximation, parallel visual system, detached frame, screenshot, or unapproved product flow.

## 1. Non-negotiable authority and precedence

The following authority order is mandatory for every visible frontend change:

1. The user's latest explicit product and visual instruction.
2. The current canonical Figma master/variant at the registered node and revision.
3. This protocol and the current `FIGMA_VISUAL_ADMISSION_REGISTRY.json` / Design Delta.
4. Reader-UI executable contracts for route, state, event, token, motion, and platform requests.
5. Native renderer, reducer, Host adapter, and Core implementation details.
6. Historical documents, screenshots, test fixtures, old pages, or a prior agent summary.

Figma is the **sole visual authority**. Reader-UI and Core/Host own behavior, state ownership, durable data, effects, and platform capability. Neither code nor an old demo may invent a visual shape, icon, hierarchy, viewport, state, or motion that Figma has not authorized.

If two sources conflict, an agent must identify the exact Figma node(s), route/state, and conflict before changing anything. It must not silently choose a convenient local interpretation.

## 2. Current source snapshot — re-read before work

This is a snapshot, not a delivery-complete claim. Every task must re-read the current registry and live-source evidence instead of relying only on this paragraph.

- Canonical Figma file: `klhs2jMM4MncaJFqZMfqEK` (`Reader-UI · Phase 2 Design System · Redraw`).
- Current checked-in Figma revision: `2379851596474967636`.
- Canonical binding and admission source: `docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json`.
- Token provenance source: `docs/design/FIGMA_VISUAL_TOKEN_LEDGER.json`.
- Phone viewport: `390 × 844`.
- Tablet viewport: `760 × 960`.
- Landscape is a Tablet alias. `compact` and `fold` are retired and must not be reintroduced as independent layouts.
- A current Figma revision/binding is source evidence only. It does **not** prove application implementation, motion, Core behavior, or fresh device evidence.
- HarmonyOS currently consumes the generated Figma visual-admission artifact. Android and iOS consume shared Reader-UI route/state/token/motion contracts, but must not be described as node/revision-equivalent Figma delivery until they consume an equivalent generated admission artifact from the same registry.

### Current progress status

| Layer | Current evidence / implementation | Must not be claimed yet |
| --- | --- | --- |
| Figma source | canonical file, current revision evidence, crosswalk, master/variant bindings, and source snapshots are recorded | that every page or interaction is product-delivered merely because a node exists |
| Reader-UI | Design Delta schema, shared contract generation, visual registry, and token ledger exist | that a changed Figma value is already in every native app before the affected batch is regenerated and consumed |
| HarmonyOS | generated ArkTS visual-admission artifact is present and intended to gate visible source-driven surfaces | full Figma parity, real behavior, motion, or fresh device delivery without the corresponding renderer/effect/device evidence |
| Android / iOS | generated Kotlin/Swift route, state, token, motion, and request contracts are consumed through their native package integrations | node/revision-equivalent Figma delivery; the Figma visual-admission artifact has not yet been generated and enforced for them from the same registry |
| Core / Host | Core and platform adapters remain the only valid owners for business facts and system operations | that a Figma prototype alone has implemented file selection, TTS, WebDAV, permissions, persistence, or any other platform behavior |

The registry's delivery status and this table are intentionally conservative. A task may only promote a claim when the evidence required in section 5 exists.

## 3. Required architecture

```text
confirmed Figma revision
  → frozen Design Delta
  → Reader-UI schema / fixture / crosswalk / token ledger
  → deterministic Swift + Kotlin + ArkTS contract generation
  → native SwiftUI / Compose / ArkUI renderer
  → native reducer + effects + Core/Host capability execution
  → browser/build/viewport/device evidence
```

There is no runtime Figma dependency and no direct Figma-to-production-code generator. Native applications must not embed screenshots or fetch Figma at runtime. Figma provides the visual source; Reader-UI makes its accepted values and semantics executable; each host implements native rendering and real platform behavior.

### Ownership matrix

| Layer | Owns | Must not own |
| --- | --- | --- |
| Figma | canonical visual layout, typography, color, icon, component/variant, responsive visual intent, reviewed prototype end states | Core data, Host calls, durable state, an invented business capability |
| Reader-UI | Figma crosswalk, Design Delta, contract schemas, shared token/route/state/event/motion definitions, code generation | a second visual design independent of Figma |
| Reader-Core-Native / Core | book data, reading location, business facts, durable domain state | platform layout or local visual substitutes |
| Android / iOS / HarmonyOS | native Compose/SwiftUI/ArkUI rendering, reducer/coordinator, system API and Host adapter, device proof | their own Figma registry, copied contracts, invented pages, fake behavior |

## 4. Mandatory agent workflow

### A. Before any visible UI write

An agent must record or read all of the following before editing a visible surface:

1. Current user instruction and scope.
2. Figma file key, page, canonical master, exact node/variant, current revision, target route/state, and target viewport.
3. Existing crosswalk/admission record and whether it is `exact-figma-binding`, `retired`, `figma-absent-fail-closed`, or `figma-unbound-fail-closed`.
4. Whether the change is D0, D1, D2, D3, or D4.
5. Existing owner of the affected `UiEvent`, state, reducer/effect, Core command, and Host capability.

If any required Figma source is absent, ambiguous, detached, or contradictory, stop that visible surface. Do not draw a local fallback or infer a new state.

### B. Change classification

| Level | Definition | Mandatory follow-through |
| --- | --- | --- |
| D0 | text, order, existing token value, default value | update the unique fixture/token source and regenerate |
| D1 | existing primitive appearance: icon, typography, padding, radius, Switch/Select/Segment/Stepper styling | update canonical primitive and all affected native primitive adapters |
| D2 | page hierarchy, slots, grouping, responsive/Phone/Tablet layout | update component/ViewState/ScreenGraph/layout adapters and verify both viewports |
| D3 | state, gesture, interaction, focus, async feedback, motion | update state/event/motion contracts; define trigger, interrupt, cancel, cleanup, and reduced motion |
| D4 | Core command, file picker, TTS, WebDAV, permissions, or other platform capability | update Core/Host contracts and obtain real platform/device proof |

D3/D4 must never be slipped in as a “style tweak.”

### C. Figma edit discipline

Figma reads may be parallel. Figma writes are single-writer, serialized transactions.

When modifying design in Figma:

1. Edit the registered canonical component/master or its registered variant.
2. Let downstream instances inherit. Do not solve a global issue with a local instance override.
3. Preserve the canonical master, component set, variant properties, and bound node identity whenever possible.
4. Check Phone and Tablet variants before freezing the batch.
5. Freeze the design batch with file key, page, node ID, revision/time, before/after evidence, route/state/viewport, and intended behavior.
6. Produce a frozen Design Delta before implementation starts.

The following are forbidden as production sources:

- detached Figma frame;
- screenshot or exported image used as page replacement;
- duplicated/recreated master in place of a bound master;
- editing one downstream instance and presenting it as a canonical component change;
- a historical revision presented as current;
- a generic fallback page or “similar” locally drawn page;
- Figma Make output that has not been copied into the canonical design file, made a real master/variant, and bound in the crosswalk.

Changing a Figma fill, font, spacing, radius, or layout does not automatically change an installed app. It remains a safe design edit if the master identity is preserved, but it must complete the Design Delta → Reader-UI → code generation → native implementation chain before it can be claimed as synchronized.

### D. Source-driven implementation, not screenshot iteration

Implementation must begin from the frozen Figma source and its Design Delta. Do not repair each native page by visually guessing against screenshots.

When native output differs from Figma, classify it first:

| Classification | Required action |
| --- | --- |
| `FIGMA_SOURCE_MISSING` | keep the surface fail-closed; request/bind a real Figma source |
| `FIGMA_SOURCE_CONTRADICTORY` | stop and report exact conflicting node IDs; only a deliberate Figma correction reopens it |
| `NATIVE_CONSTRAINT_DEFECT` | fix the Reader-UI/native contract consumer; do not change Figma to hide the bug |
| `BEHAVIOR_OR_MOTION_GAP` | preserve only confirmed static/end states; do not invent flow, duration, or business behavior |

Do not create `Figma*Root`, `Figma*Policy`, geometry manifest, alias-token layer, or other host-local parallel visual authority. If a platform needs stronger Figma admission, generate it from the single Reader-UI registry rather than hand-writing a platform copy.

### E. Native implementation rules

1. Update the unique Reader-UI source first, then regenerate Swift/Kotlin/ArkTS artifacts.
2. Android consumes Reader-UI via the Gradle composite contract/runtime packages; iOS consumes it through the SwiftPM package; HarmonyOS syncs generated ArkTS artifacts. Do not copy generated files into host repositories.
3. Native pages bind to generated route/state/token/motion contracts but own platform layout, font fallback, system controls, reducer/coordinator, and Host calls.
4. A Figma reaction is visual intent, not authorization to change `UiEvent`, state owner, business flow, Core command, or platform API.
5. A missing Figma state, target, or Tablet master is not permission to scale a Phone page, reuse an unrelated overlay, or make up an error/empty page.
6. Motion must be implemented only after static end states are frozen, with `MotionId`, trigger, interrupt, cancel, cleanup, and reduced-motion behavior explicitly defined.

## 5. Required evidence before reporting a change complete

An agent must report evidence by layer and must not collapse these into one claim:

1. **Figma source:** file/page/node/master/variant/revision and no detached substitute.
2. **Design Delta:** old value → new value, D-level, routes/states/tokens/events/motion/capability impact.
3. **Reader-UI:** schema/fixture/crosswalk/token updates and deterministic generation checks.
4. **Host implementation:** exact renderer/reducer/effect/Host adapter path changed on each affected platform.
5. **Verification:** affected viewport checks, build/tests, and—when the claim is about product behavior or visual delivery—fresh device evidence.

A passing compile, unit test, generated-contract check, browser snapshot, or HAP alone is never proof that Figma parity, real behavior, or real-device delivery is complete.

## 6. Mandatory stop conditions

Stop and ask the user or report the blocker instead of improvising when any of these is true:

- no current Figma page/master/variant exists for the requested surface;
- Figma nodes contradict each other;
- the requested action requires a new business rule, Core command, system permission, or Host capability not already specified;
- the task would delete/recreate a canonical master or cause detached instances without an approved migration;
- a requested viewport has no Figma master;
- a change touches a retired route/state/component;
- current evidence conflicts with an old plan, screenshot, test fixture, or prior agent summary.

The correct response is a precise source/contract gap, not a substitute design.

## 7. Required handoff format

Every agent handoff or completion report for visible frontend work must contain:

```text
Scope:
Figma: file / page / canonical node / revision / viewport
Classification: D0–D4
Design Delta: old → new
Reader-UI contract impact:
Native impact: Android / iOS / HarmonyOS
Behavior owner: reducer / effect / Core / Host
Verification performed:
Open gaps or fail-closed surfaces:
```

Reports that say only “done”, “matches Figma”, “build passed”, or “all pages fixed” without this evidence are incomplete.

## 8. Agent acknowledgement

Before beginning a visible UI task, the agent must state in its working update:

> “I will use the current canonical Figma binding as the visual source, preserve the component graph, change Reader-UI before native consumers, and stop rather than invent a visual/behavioral substitute when the source is missing or contradictory.”

This acknowledgement is an execution gate, not a ceremonial sentence. If the source cannot be identified, the task must not proceed.

## 9. Enforcement gates

Section 8's acknowledgement is necessary but not sufficient. On 2026-07-27 an agent acknowledged the protocol and then advanced a virtual-machine cycle on a page family whose Figma → Reader-UI → HarmonyOS chain was not actually complete. The protocol was documentary; it was not enforced by a test command. This section defines the enforcement gates that make the protocol machine-checkable.

### 9.1 The two-dimensional admission gate

A Figma binding is not a delivery. The generated visual-admission artifact must distinguish two independent dimensions for every route, overlay, and state:

| Field | Meaning | Who sets it |
| --- | --- | --- |
| `sourceBound` | A Figma file/node/master/revision is registered for this surface. | Reader-UI registry (`classification: exact-figma-binding`) |
| `implementationReady` | The page family has completed Reader-UI B2/B3 and the B4 atomic promotion has admitted it for host consumption. Host consumption and runtime proof remain B5–B7 work. | Reader-UI registry (`harmony.status: implementation-ready`) |

The admission status is derived from these two fields, never set independently:

| `sourceBound` | `implementationReady` | admission |
| --- | --- | --- |
| true | true | `implementation-ready` |
| true | false | `candidate-backport` |
| false | false | `blocked` or `retired` |

`candidate-backport` is a **stop condition**, not a renderable state. A renderer that encounters a `candidate-backport` route must fail closed (render nothing) — it must not draw a generic fallback, a diagnostic card, the old shell + hand-written component combination, or a hidden zero-size placeholder. Where Reader-UI declares an active route-reconstruction quarantine, the host must omit the old generated shell/body mapping entirely.

### 9.2 Mandatory execution gate chain

Every page family must pass through this chain in order. No step may be skipped or reordered:

```text
1. B1 — Figma current master/revision frozen
2. B2 — Reader-UI completes the static structure, state, token, and interaction contract in a clean implementation commit
3. B3 — a separate Reader-UI evidence commit binds the B2 commit, current Figma source, and fresh sourceEvidenceHash
4. B4 — dependency authority, Core pin, and shared production-writer lock pass; promote-family atomically updates harmony.status, artifacts, and the append-only ledger
5. B5 — Host consumes only the promoted implementation-ready artifact, removes old generic rendering, then runs compile + static structure checks
6. B6 — Virtual machine verifies the page family's real interaction and layout
7. B7 — Real device provides motion/system-capability evidence and the machine receipt/release identity; Reader-UI freezes the family as deliverable
```

The virtual machine is not cancelled — it is **gated**. It may run only after B5 host consumption of an `implementation-ready` artifact. Running a virtual-machine cycle on a `candidate-backport` page family is a protocol violation, regardless of whether the virtual machine "finds issues" or "passes". Machine receipts, device proof, motion proof, and release identity belong to B7; they are not B3 evidence and must not be made prerequisites that prevent B4 from ever starting.

### 9.3 Machine-enforced gates (HarmonyOS)

The following gates are enforced by test commands, not by documentation. An agent cannot bypass them by editing the protocol alone.

| Gate | Script | What it enforces |
| --- | --- | --- |
| Pre-gate | `scripts/enforce-implementation-ready-gate.mjs` (`pretest` hook) | The generated artifact uses the two-dimensional gate; every entry is internally consistent; all four admission methods check `=== 'implementation-ready'`; active renderers document `candidate-backport` as fail-closed; any active Reader-UI route-reconstruction quarantine is removed from generated RouteTable/ViewStateTable; RouteRenderer/OverlayHost/retired StateHost contain no zero-size hiding fallback. |
| Contract gate | `scripts/test_contracts.mjs` | `admission ↔ implementationReady ↔ sourceBound` consistency; `candidate-backport` fail-closed without a local substitute; active source quarantine removes all listed native mappings; no `Figma*Root` / `FigmaVisual*Policy` parallel layer; no retired `admitted` status in the generated artifact. |
| Emulator gate | `scripts/run_ohos_device_tests.mjs` (`test:arkts-emulator`) | ArkTS Hypium suite passes on the local emulator. This is an **emulator behavior test**, not a device delivery test and not a frontend visual delivery test. Its pass count must never be reported as device or frontend completion evidence. |

### 9.4 Stop conditions specific to enforcement gates

In addition to Section 6's stop conditions, an agent must stop when:

- The generated visual-admission artifact contains `'admitted'` (the retired single-dimension status) instead of `'implementation-ready'` / `'candidate-backport'`.
- A renderer file does not mention both `implementation-ready` and `candidate-backport` in its execution-gate comments.
- A gate method (`isRouteAdmitted`, `isRouteAdmittedForViewport`, `isOverlayAdmitted`, `isStateAdmitted`) uses any comparison other than `=== 'implementation-ready'`.
- A `candidate-backport` route is about to be passed to a virtual-machine or device test cycle.
- The emulator suite's pass count is about to be reported as device or frontend delivery evidence.

### 9.5 Naming discipline

- `test:arkts-emulator` is an emulator behavior test, not a device test and not a frontend delivery test.
- The script file `run_ohos_device_tests.mjs` is a historical name; the npm script name must say `emulator`.
- A `465/465` emulator pass only proves the ArkTS Hypium suite passed on `127.0.0.1:5555`. It does not prove Figma parity, Reader-UI source-side completion, HarmonyOS consumption, or real-device behavior.
- No document, report, or commit message may describe the emulator suite as "device tests" or "frontend delivery tests".

### 9.6 Atomic promotion and retraction transactions (anti-bypass layer 1)

Sections 9.1–9.5 defined the two-dimensional gate but left a bypass: an agent could hand-edit `harmony.status` to `implementation-ready` in the registry without completing source-side conversion, and the generator would happily produce `implementation-ready` admission entries because it only read `harmony.status`. The 2026-07-27 audit found 28 records in exactly this state.

A second 2026-07-27 audit found four deeper defects in the original promotion transaction:
1. **Write order was inverted.** The script mutated the registry in memory, called the generator (which read the OLD registry from disk), and only then wrote the new registry. The artifact was always stale relative to the registry.
2. **The HarmonyOS consumer copy was never synced.** `Reader-UI/generated/arkts/VisualAdmission.ets` and `Reader-for-HarmonyOS/entry/.../contract/reader_ui/VisualAdmission.ets` had diverged (different SHA-256). The HarmonyOS build consumed the stale consumer copy.
3. **`recordId` prefix did not map to handoff directories.** `reader.*` maps to `handoffs/reader-runtime`, `search.*` maps to `search-results`, `webdav.*` maps to `webdav-config`, `settings.*` maps to `settings-general`. String-prefix guessing made promotion impossible for those families.
4. **Prerequisites were too weak.** Figma revision was compared to "the first exact record's revision" (which could itself be stale), and `harmony.targets` only checked file existence — not that the `#symbol` suffix still existed in the file.

The corrected atomic promotion transaction closes all four:

| Rule | Enforcement |
| --- | --- |
| `harmony.status` must NEVER be hand-edited. | The ONLY authorized path to `implementation-ready` is `Reader-UI/tools/design/promote-family.mjs <recordId>`. If a completed promotion must be withdrawn because a prerequisite later proves false, the ONLY authorized reverse path is `Reader-UI/tools/design/promote-family.mjs --retract <recordId> --reason <reason>`. |
| `local.status` must be `implementation-ready` BEFORE `harmony.status` is promoted. | `promote-family.mjs` verifies this prerequisite and refuses to run if `local.status` is still `candidate-backport` or `not-currently-crosswalked`. |
| B3 Reader-UI evidence must not force an early native artifact copy. | `VisualAdmission.ets` hashes the canonical visual/admission projection (Figma identity, route/overlay/state membership, classification, delivery state, and `harmony.status`) instead of the entire registry file. A B3-only `local.status`, handoff, or evidence-link change therefore leaves the native artifact byte-stable. Figma binding or Harmony admission changes still change the digest. |
| An active source route-reconstruction quarantine blocks promotion. | `promote-family.mjs` refuses its listed records; `--check` requires both status dimensions to remain `candidate-backport`, requires no ledger entry, and requires its route set to match the registry. |
| `LOCAL_READY_FOR_FIGMA.json` must exist and declare `admission.localReadyForFigma: true`. | `promote-family.mjs` resolves the handoff directory via an explicit `RECORD_ID_TO_HANDOFF` map (no string-prefix guessing). |
| Figma binding revision must match the OFFICIAL current-revision evidence. | `promote-family.mjs` reads `docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json` and compares `record.figma.revision` to `evidence.currentRevision` — not to another registry record. |
| HarmonyOS consumer target files must exist AND the `#symbol` suffix must be findable. | `promote-family.mjs` splits each `harmony.targets` entry on `#` and word-boundary-matches the symbol in the file. A renamed/deleted component fails promotion. |
| The promotion must be atomic across FOUR files: registry + upstream artifact + consumer copy + ledger. | `promote-family.mjs` snapshots all four files before mutation, writes the registry FIRST (via temp+rename) so the generator reads the new state, regenerates the upstream artifact, syncs the consumer copy, verifies upstream == consumer (byte-identical SHA-256), appends the ledger entry, and does a final read-back. Any failure rolls back ALL prior writes in the transaction. |
| Every promotion must be recorded in a tamper-evident ledger. | `Reader-UI/docs/design/PROMOTION_LEDGER.json` is an append-only log with hash-chained entries. Each entry records: recordId, previousHarmonyStatus, localStatus, figma revision, official current revision, registry hash before, upstream artifact hash after, consumer artifact hash after, `artifactsInSync` flag, and a hash of all fields chained to the previous entry. **The ledger is best-effort tamper-evident, NOT a cryptographic signature** — an agent with write access can recompute the chain. The real defense is Layer 3 (CI from a clean checkout). |
| A promotion discovered to have crossed an unmet prerequisite must be withdrawn without erasing evidence. | `--retract` snapshots and rolls back the same four files on failure; on success it changes only `harmony.status` back to `candidate-backport`, regenerates/syncs `VisualAdmission.ets`, and appends a hash-chained reversal referencing the withdrawn promotion. It never deletes or rewrites the earlier promotion entry, and it preserves `local.status` as source-side history. A later promotion must use a new `LOCAL_READY_FOR_FIGMA` source-evidence hash **and** a new implementation commit; it is not a retry button. |

The HarmonyOS `enforce-implementation-ready-gate.mjs` runs `promote-family.mjs --check` (Gate I) to verify that every `implementation-ready` record has a valid ledger entry, AND compares upstream vs consumer SHA-256 directly (Gate G2) to detect divergence that bypassed the promotion flow.

### 9.7 All execution entries must pass preflight (anti-bypass layer 2)

The 2026-07-27 audit found that only `pretest` existed, which runs before `npm test` but NOT before `npm run build`, `npm run test:arkts-emulator`, `npm run test:device`, `npm run test:raw`, or direct `node scripts/...` / `hvigorw` invocation.

Every execution entry point must now run the implementation-ready gate as a preflight:

| Entry point | npm hook | Internal preflight |
| --- | --- | --- |
| `npm test` | `pretest` | — |
| `npm run build` | `prebuild` | — |
| `npm run test:arkts-emulator` | `pretest:arkts-emulator` | `run_ohos_device_tests.mjs` re-runs the gate internally |
| `npm run test:device` | `pretest:device` | `collect_device_evidence.mjs` re-runs the gate internally |
| `npm run test:raw` | `pretest:raw` | — (direct `hvigorw` cannot be gated from inside) |
| `npm run test:arkts-compile` | — | `test.mjs` re-runs the gate internally |
| Direct `node scripts/*.mjs` | — | Each runner re-runs the gate internally |
| Direct `hvigorw` | — | Cannot be gated from inside the repo — Layer 3 (CI) is the backstop |

npm lifecycle hooks alone are NOT sufficient because an agent can invoke scripts directly. The internal preflight in each runner script is the second defense line. Layer 3 (CI) is the third.

### 9.8 Independent CI/merge gate (anti-bypass layer 3)

Local gates (Layers 1–2) can all be bypassed by an agent with write access to the working tree — the agent can edit the gate script itself, the registry, the ledger, or the generator. The CI gate runs from a clean checkout on GitHub, where the agent cannot edit any file without the change being visible in the PR diff.

**Until the gate files are committed AND branch protection requires the check, Layer 3 is NOT an active defense.** A 2026-07-27 audit found the workflow YAML, `enforce-implementation-ready-gate.mjs`, `promote-family.mjs`, and `PROMOTION_LEDGER.json` were all untracked (`git ls-files` returned nothing for them). A clean checkout would not see them at all. The files have since been `git add`-ed; they must be committed and the `Reader contract gate` status check must be added to the repository's required checks before Layer 3 can be relied on.

| Rule | Enforcement |
| --- | --- |
| Every PR must pass the contract gate from a clean checkout. | `.github/workflows/reader-contract-gate.yml` runs on `pull_request` and `push` to `main`/`master`. |
| The CI gate verifies all three layers. | It runs: `promote-family.mjs --check` (ledger + upstream==consumer sync), `generate-visual-admission-contract.mjs --check` (registry→artifact sync), upstream vs consumer byte-identical SHA-256 comparison, local.status consistency, `enforce:implementation-ready-gate`, and `test_contracts.mjs`. |
| Branch protection must require this check. | The repository settings must mark `Reader contract gate` as a required status check before merge. **Without branch protection, the CI gate is advisory only and Layer 3 is not active.** |
| The CI gate must not be self-modifiable in the same PR. | An agent editing `.github/workflows/reader-contract-gate.yml` in a PR does not change the workflow that runs on that PR — GitHub uses the base branch's workflow definition. This is the property that makes Layer 3 the backstop, but ONLY after branch protection is configured. |
| Direct `hvigorw` / `hdc` invocation cannot be gated from inside the repo. | Layer 2 preflight covers npm scripts and direct `node scripts/*.mjs` calls. A direct `hvigorw assembleHap` or `hdc install` bypasses everything in-repo. Layer 3 (CI from clean checkout) is the only backstop for those paths, and only if branch protection is configured. |

### 9.9 Stop conditions specific to the three anti-bypass layers

In addition to Section 9.4's stop conditions, an agent must stop when:

- The agent is about to hand-edit `harmony.status` in `FIGMA_VISUAL_ADMISSION_REGISTRY.json`. This is ALWAYS a protocol violation. Use `promote-family.mjs` to promote or its `--retract` transaction to withdraw a completed promotion.
- The agent is about to hand-edit `PROMOTION_LEDGER.json`. The ledger is append-only by `promote-family.mjs`; hand-editing it is tampering.
- The agent is about to run `npm run build`, `npm run test:arkts-emulator`, `npm run test:device`, or `npm run test:raw` without the gate passing. The pre-hooks and internal preflight will block this, but the agent should not attempt to bypass them.
- The agent is about to invoke `hvigorw` directly, bypassing the npm scripts. Direct `hvigorw` invocation cannot be gated from inside the repo — the agent must run `npm run build` or `npm run test:raw` instead, which trigger the pre-hooks.
- The CI gate (`Reader contract gate`) is red on a PR. The agent must not merge or force-push past it. If the gate is red because the current state has hand-edited `harmony.status` records, the fix is to run `promote-family.mjs` for each record (after verifying `local.status` is truly `implementation-ready`), NOT to edit the gate or the ledger.
