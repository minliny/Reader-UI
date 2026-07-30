# Native consumer receipts

These receipts close the cross-repository ordering gap without rewriting an
immutable B3 handoff packet or the append-only promotion ledger.

For each implementation commit there are two separate receipts:

1. `A2_PRE_PROMOTION_CONSUMER_RECEIPT.json` binds the exact B3 packet, A2
   disposition, Figma revision, and independent HarmonyOS cleanup commit. A
   future B4 promotion must use `ordering.mode = pre-promotion`. The two
   existing families use `historical-bootstrap` only to bind already-active
   ledger entries whose real cleanup commits preceded promotion.
2. `B4_B5_POST_PROMOTION_CONSUMPTION_RECEIPT.json` records the promotion and
   subsequent HarmonyOS VisualAdmission/runtime consumption commits. It is
   downstream evidence and can never authorize B4.

Receipt paths are indexed by
`docs/design/FIGMA_VISUAL_ADMISSION_DEPENDENCIES.json`; they are deliberately
outside `docs/design/handoffs/**`, so adding a receipt cannot change the B3
`sourceEvidenceHash`.

The post-promotion receipt proves only source-backed VisualAdmission
consumption and the named runtime wiring. It does not prove the current
Reader-UI release lock, B6 virtual-machine layout evidence, B7 device/motion
evidence, a machine receipt, or a frozen deliverable.
