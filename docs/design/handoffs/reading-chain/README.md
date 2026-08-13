# Reading-chain Figma-first gate

Run the structural baseline check:

```sh
node tools/design/verify-figma-first-reading-chain.mjs --baseline
```

Run the delivery gate before accepting any reading-chain visual change:

```sh
node tools/design/verify-figma-first-reading-chain.mjs --strict
```

The strict command is expected to fail at the present F0 stage. That is intentional: it prevents “looks close locally” from being reported as Figma parity while same-size local/Harmony comparison, motion closure and device evidence remain unresolved.

The baseline command also scans the named reading-chain visual sources. A file using demo aliases, hand-authored shadows or local Reader-control SVGs must be present in `F0_ARKUI_FIGMA_COMPONENT_BINDINGS.json`; an unregistered file is a baseline failure, not an implicit new visual source.

`F0_CURRENT_BINDING_RECONCILIATION.json` is the current reading-chain structural record. It references only exact bindings in the global visual-admission registry whose complete page/master/node/variant/final-assembly set is resolved by [`F0_FIGMA_CURRENT_REVISION_EVIDENCE.json`](../../F0_FIGMA_CURRENT_REVISION_EVIDENCE.json). The revision is deliberately read only once after a completed Figma writer batch; it is never inferred from the Plugin API.

`F0_FIGMA_FIRST_CROSSWALK.json` and `F0_ARKUI_FIGMA_COMPONENT_BINDINGS.json` are retained as historical F0 inventory. Their null revisions are intentional history, not a current binding source. In particular, an outer page/master revision must never be copied to an unread child node. Historical children such as Phone List `493:191` remain explicitly unreconciled until that exact node is present in official evidence.

`FIGMA_DESIGN_DELTA_LEDGER.json` names the current-revision reconciliations (local import, bookshelf multi-select, BookCard cover, Book Detail local-source variants, and the attached Book Detail Hero Component Set). They remain `current-read-unfrozen`: no Design Delta is frozen and no delivery status is promoted. The other historical pending entries remain fail-closed until all of their declared child nodes are verified.

After a completed Figma writer batch, use exactly one official read to update the canonical evidence, registry, reconciliation, and Design Delta provenance together:

```sh
zsh tools/design/finalize-figma-reading-chain.zsh
```

`F0_LAYOUT_BATCH_AUDIT.json` records writer-runtime structural checks before that final read. It is not a replacement for the official revision evidence.

Regenerate/check the non-promoted historical node catalog used for reconciliation:

```sh
node tools/design/generate-reading-chain-historical-node-catalog.mjs
node tools/design/generate-reading-chain-historical-node-catalog.mjs --check
```

`F0_LOCAL_ASSET_PROVENANCE.json` is the reviewed node-to-resource catalog. It
holds the real Figma master and current context IDs; it does not certify an
export-byte match or visual parity. The byte manifest below is generated from
that catalog and fails if a new local SVG has no explicit provenance entry.

Regenerate/check the local SVG byte manifest before accepting an icon export:

```sh
node tools/design/generate-reading-chain-local-asset-manifest.mjs
node tools/design/generate-reading-chain-local-asset-manifest.mjs --check
```
