# Reading-chain Figma-first consumer lock

Figma is the sole visual authority. Reader-UI stores the crosswalk, evidence, and the single visual-admission registry; HarmonyOS consumes reading-chain visual truth only through Reader-UI contract artifacts — never by reading Figma nodes directly, and never through a HarmonyOS-side geometry manifest. No host (`frontend-demo-optimized`, `DemoAliasTokens`, hand-authored SVG names, or a generated snapshot) is a visual authority.

Before accepting a visual change to Bookshelf, Book Detail, immersive Reader or Reader Control, run:

```sh
node tools/design/verify-figma-first-reading-chain.mjs --baseline
node tools/design/verify-figma-first-reading-chain.mjs --strict
```

The strict gate must pass before a component may be described as **Figma-delivery-certified**. It requires a current Figma revision, canonical master/variant binding, a frozen Design Delta, explicit icon export manifest and same-size Phone/Tablet evidence. It intentionally fails while any requirement is unresolved. It is not the development admission gate: source-driven ArkUI work first uses the automatic live-source check below.

Local source-shape regression suites (e.g. HarmonyOS `scripts/figma_reading_static_parity.test.mjs`) do not read Figma or compare images, so even a green result is not Figma parity evidence.

## Frozen-source rebuild and discrepancy classification

The current rebuild is frozen to Figma file `klhs2jMM4MncaJFqZMfqEK`, official
revision `2379851596474967636`.  HarmonyOS consumes geometry/node identity only
through Reader-UI contract artifacts and the visual-admission registry; no
HarmonyOS-side file (including any former `FigmaVisualConstraintManifest.ets`)
is a visual authority input.  Landscape aliases Tablet.

On 2026-07-25, a read-only Figma Plugin batch re-resolved all 59 node IDs
named by that manifest: all were present, retained their expected component
or component-set parent, and none resolved to a detached substitute. Its
machine-readable result is `docs/design/FIGMA_LIVE_SOURCE_SNAPSHOT.json`; run
`npm run check:figma-live-source` to validate that every manifest source is
covered. This is the normal development admission gate and never requires a
human to supply a token or run a terminal command.

The evidence model deliberately has two non-interchangeable tiers:

| Tier | What it proves | How it is refreshed | What it may not claim |
| --- | --- | --- | --- |
| `FIGMA_LIVE_SOURCE_ADMITTED` | Every native manifest node exists now, is a real component/master/variant, and retains the expected parent identity. | Codex reads Figma through the connected Plugin API and updates the snapshot. | A per-node official REST revision. |
| `REST_REVISION_PINNED` | A Figma REST `R1 -> version-pinned nodes -> R2` window covers every registered exact binding. | The checked-in official evidence is refreshed only through the approved REST reader. | That the Plugin API supplied version history, or that arbitrary unregistered descendants were version-pinned. |

The earlier Token-only terminal instruction is retired from ordinary work. The
official REST evidence already pins all 30 exact registry bindings to revision
`2379851596474967636`; the registry verifier reports `revisionBlocked=0`.
The 59 native-manifest nodes are additionally live-read through the connected
Figma Plugin API. Historical F0 inventory entries that are outside the current
registry remain live-identity evidence only; they neither block the
Figma-source-driven rebuild nor may be assigned a fabricated revision.

Do not run a page-by-page screenshot approximation loop.  When an ArkUI result
does not match the expected output, classify it before changing any design:

| Classification | Meaning | Required action |
| --- | --- | --- |
| `FIGMA_SOURCE_MISSING` | The required page, variant, state or motion target has no current Figma node. | Keep the native route/actor fail-closed; record the node/route gap. Do not draw a substitute. |
| `FIGMA_SOURCE_CONTRADICTORY` | Current Figma nodes make incompatible requirements. | Stop that surface and report the exact node IDs; only a deliberate Figma correction may reopen it. |
| `ARKUI_CONSTRAINT_DEFECT` | A current Figma node exists and has a representable value, but native code does not consume it. | Fix the manifest/ArkUI renderer; Figma remains read-only. |
| `BEHAVIOR_OR_MOTION_GAP` | Static Figma source exists but Core/Host ownership or a Figma motion contract is absent. | Keep the visual static/end state only; do not invent a flow, duration or transition. |

The currently named source gaps in the initial reading chain are Tablet
Bookshelf List, Reader More, the five unbound Reader full-option routes, and
Tablet variants for all of the following Phone-only masters:

- Quick: Directory `1023:17963`, TTS `1023:17968`, Appearance `1023:17973`,
  Settings `1023:17978`, Search `1023:17983`, Auto Page `1023:17988`, Replace
  `1023:17993`, Bookmark `1831:10897`.
- Full: Directory `1023:18274`, TTS `1023:18279`, Appearance `1023:18284`,
  Settings `1023:18289`, Search `1770:10208`, Auto Page `1771:10277`, Replace
  `1771:10452`.

The Phone-only panels must stay fail-closed on Tablet/landscape; their absence
does not authorize a scaled Phone sheet.  The route-only source gaps are
explicitly denied by the visual-admission registry (`FIGMA_VISUAL_ADMISSION_REGISTRY.json`); the viewport-specific
gaps are guarded in their Figma panel components until a real Tablet master is
supplied.  None are work items for a mid-rebuild Figma writer pass.

Business behavior remains owned by `ReaderUiStore` / `ReaderReducer` / `ReaderEffects` / Core. A Figma component does not authorize a new Core action, a local book source switch, a fallback error page, or a new visual state. If Figma has not defined a state, fail closed or obtain a product decision; do not draw it locally.

## Page-turn behavior boundary

The visual source for the Reader settings control is Figma
`Reader/Module/SettingsPanel` / `Reader/SegmentedItem`; the behavioral source
for the five selected values is the checked-in Legado reference, not its
Android implementation or visuals:

| Stored value | Required behavior |
| --- | --- |
| `cover` | Horizontal pagination; the committed page transition is a cover operation. |
| `slide` | Horizontal pagination; adjacent logical pages translate together. |
| `simulation` | Horizontal pagination with a cancellable, direct-manipulation curl semantic. |
| `scroll` | One continuous vertical text surface; the native `Scroll` owns pan and inertia. |
| `none` | Horizontal pagination; commit immediately with no visual transition. |

`scroll` is the only value that selects vertical reading. Legacy migration input
such as `平滑` may normalize to `slide`, but may never be persisted or displayed
as a sixth mode. A mode switch reflows from the durable Core content anchor
(`book + chapter + character offset`), never from a stale page index or pixel
offset.

The current Figma file has no PageTurn timeline for any of these values. It
therefore does not authorize a locally invented curl, shadow, duration, or
reduced-motion design. The first three modes keep their product semantics, but
their production motion remains an explicit F3 gap until a Figma Motion
contract is authored. This boundary is derived from the read-only Legado
reference at `constant/PageAnim.kt`, `ReadView.kt`, and its page delegates; no
Legado implementation code or visual asset is reused.
