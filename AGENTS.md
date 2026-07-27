# Reader-UI Agent Rules

## Mandatory Figma-to-native protocol

Before changing any visible UI, design contract, demo route, token, component, state, motion, or Figma evidence, read and obey:

`docs/design/FIGMA_TO_NATIVE_AGENT_EXECUTION_PROTOCOL.md`

This protocol is mandatory. In particular:

1. Use the current canonical Figma master/variant as the sole visual source.
2. Preserve Figma component identity; do not use detached frames, screenshots, local approximations, generic fallbacks, or self-created replacement pages.
3. Change Reader-UI's unique contract source before any native consumer; regenerate artifacts instead of copying generated output.
4. Treat missing/contradictory Figma source, unowned behavior, and missing viewport masters as stop conditions—not invitations to guess.
5. Follow the single-writer Figma rule and the required evidence/handoff format.

If this file conflicts with older planning or test documents, the protocol and the user's latest instruction take precedence for visible frontend work.

## Execution gate checklist (enforcement gates — Section 9 of the protocol)

Reader-UI is the **sole authority** for the two-dimensional admission gate. The generated visual-admission artifact (`generated/arkts/VisualAdmission.ets`) must distinguish `sourceBound` (Figma identity registered) from `implementationReady` (page family delivered). A `candidate-backport` route is source-bound but NOT delivered — it must fail closed at every native renderer.

6. The visual-admission generator (`tools/design/generate-visual-admission-contract.mjs`) must emit `sourceBound` AND `implementationReady` for every route, overlay, and state entry. The old single `admitted` status is retired. If a future edit reintroduces `'admitted'`, the host's `enforce-implementation-ready-gate.mjs` pre-gate will fail.

7. `harmony.status` in the registry (`docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json`) is the field that controls `implementationReady`. The status state machine is:

   | `harmony.status` | Meaning | Renderer gate |
   | --- | --- | --- |
   | `candidate-backport` | Figma source bound, but Reader-UI source-side conversion not yet complete. | fail-closed |
   | `implementation-ready` | Reader-UI source-side conversion complete; host may render and collect device evidence. | passes |
   | `enforced-retired` | Page family retired. | fail-closed |

   A record with `classification: exact-figma-binding` and `harmony.status: implementation-ready` produces `admission: implementation-ready`. Any other `harmony.status` (including `candidate-backport` or unset) produces `admission: candidate-backport`.

   The **precondition** for setting `harmony.status: implementation-ready` is that the page family has completed Reader-UI source-side conversion, evidenced by a `LOCAL_READY_FOR_FIGMA.json` with `status: LOCAL_READY_FOR_FIGMA_R3a_COMPLETE`. After setting `harmony.status: implementation-ready`, Reader-UI must regenerate the visual-admission artifact and the host must consume it before the surface is considered delivered. Host consumption is a **follow-through requirement**, not a precondition — otherwise the chain in rule 8 could never start.

8. A `candidate-backport` page family is a STOP condition for downstream testing. Reader-UI must not claim a page family is `implementation-ready` just because the Figma source is bound. The mandatory execution chain is:

   1. Figma frozen (current canonical master/revision bound).
   2. Reader-UI source-side conversion complete — evidenced by `LOCAL_READY_FOR_FIGMA.json` with `status: LOCAL_READY_FOR_FIGMA_R3a_COMPLETE`.
   3. Reader-UI marks the page family `implementation-ready` (`harmony.status = implementation-ready`).
   4. Reader-UI regenerates the visual-admission artifact (`sourceBound` + `implementationReady`).
   5. Host consumes only `implementation-ready` artifacts; removes the route's old generic rendering.
   6. Compile + static structure check.
   7. Virtual machine verifies the page family's real interaction and layout.
   8. Real device provides final device/motion/system-capability evidence.
   9. Reader-UI freezes the page family as deliverable (`deliveryStatus = current-read-frozen-deliverable`).

   Marking `implementation-ready` before step 2 is complete is a protocol violation. Steps 4–9 are follow-through obligations triggered by step 3, not preconditions that block step 3.

9. The generator must never collapse the two dimensions into a single `admitted` flag. If a future edit does this, the host's `enforce-implementation-ready-gate.mjs` pre-gate will fail — but the generator should also self-check: the `admissionForRecord` function must derive admission from `implementationReadyForRecord`, not from `sourceBoundForRecord` alone.

10. When a native host reports a visual or behavioral issue, the correct response is to trace the consumption chain back to Reader-UI / Figma, NOT to instruct the host to patch its renderer. Reader-UI owns the source; the host only consumes. If the issue is a `NATIVE_CONSTRAINT_DEFECT` (the host's contract consumer is wrong), fix the host consumer. If the issue is a `FIGMA_SOURCE_MISSING` or `BEHAVIOR_OR_MOTION_GAP`, fix it in Reader-UI or Figma first, then regenerate.
