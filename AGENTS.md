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

   The **B3 precondition** for promoting `harmony.status: implementation-ready` is a committed, clean `LOCAL_READY_FOR_FIGMA.json` bound to the exact B2 implementation commit and current handoff-directory hash. Its R2a/R2b/R3a/local-ready flags must be true, blockers must be empty, and its source suites must pass. A HarmonyOS machine receipt, device proof, motion proof, and release identity are B7 evidence; they must not be moved backward into B3 or used to create a dependency cycle. Never set `harmony.status` directly: B4 uses `tools/design/promote-family.mjs <recordId>` for an independent record, or `tools/design/promote-family.mjs --group <anchorRecordId>` when one B3 packet names multiple records that must change together. Both run only after dependency authority, the Core pin, and the shared production-writer lock are ready.

8. A `candidate-backport` page family is a STOP condition for downstream testing. Reader-UI must not claim a page family is natively consumed just because the Figma source is bound or B3 is complete. The mandatory execution chain is:

   1. Figma frozen (current canonical master/revision bound).
   2. B2: Reader-UI source-side conversion and source tests complete in a clean implementation commit.
   3. B3: a separate evidence commit binds that B2 commit, the current Figma source, and a newly computed `sourceEvidenceHash`; historical promotion/retraction ledger entries remain untouched.
   4. B4: dependency authority, Core pin, and the shared production-writer lock pass; `tools/design/promote-family.mjs <recordId>` atomically promotes one independent record, while `--group <anchorRecordId>` derives and atomically promotes the complete `admission.recordIds` set from one B3 packet. Both regenerate/sync the artifact and append hash-chained ledger entries. Direct registry or ledger edits and partial promotion of a shared-route group are forbidden.
   5. B5: HarmonyOS consumes only the promoted `implementation-ready` artifact, removes the route's old generic rendering, and passes compile + static structure checks.
   6. B6: the virtual machine verifies the page family's real interaction and layout.
   7. B7: the real device provides motion/system-capability evidence and the machine receipt/release identity; Reader-UI then freezes the page family as deliverable (`deliveryStatus = current-read-frozen-deliverable`).

   Marking `harmony.status: implementation-ready` before B3 and the B4 prerequisites are complete is a protocol violation. B5–B7 are downstream follow-through; they must not be recast as B3 completion conditions.

9. The generator must never collapse the two dimensions into a single `admitted` flag. If a future edit does this, the host's `enforce-implementation-ready-gate.mjs` pre-gate will fail — but the generator should also self-check: the `admissionForRecord` function must derive admission from `implementationReadyForRecord`, not from `sourceBoundForRecord` alone.

10. When a native host reports a visual or behavioral issue, the correct response is to trace the consumption chain back to Reader-UI / Figma, NOT to instruct the host to patch its renderer. Reader-UI owns the source; the host only consumes. If the issue is a `NATIVE_CONSTRAINT_DEFECT` (the host's contract consumer is wrong), fix the host consumer. If the issue is a `FIGMA_SOURCE_MISSING` or `BEHAVIOR_OR_MOTION_GAP`, fix it in Reader-UI or Figma first, then regenerate.
