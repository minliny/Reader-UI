# Stitch Design Source of Truth

## Status

This is a governance draft. It defines how design sources are selected and
resolved. It does not classify or adjudicate any specific current file.

The detailed taxonomy, required fields, authority levels, upload rules, and
usability gate are defined in
`docs/ui-design/90-审计与索引/Stitch审计/02-Stitch上传文档要求.md`.

## Current Source of Truth Definition

The current design source of truth is not a single file by existence alone. It
is the highest-ranked applicable source in the conflict order below that:

- belongs to an allowed category;
- identifies the relevant screen, state, theme, or scope;
- has not been deprecated or superseded;
- has passed every required human review gate for its intended use; and
- does not conflict with a higher-ranked approved source.

A human-approved `SOURCE_UI_IMAGE` is the highest design authority for its
explicit target screen mapping, theme, state, viewport, and approved version.
This document governs gaps and conflicts but does not retroactively approve any
image or specification.

## Categories That May Be Design Basis

The following categories may be used as design basis within their defined
scope:

- `SOURCE_UI_IMAGE`, only after applicable human approval
- `PAGE_SPEC`
- `INFORMATION_ARCHITECTURE`
- `DESIGN_SYSTEM`
- `TOKEN_SPEC`
- `COMPONENT_SPEC`
- `INTERACTION_SPEC`

Supporting specifications must not override a higher-ranked human-approved
source image. They may define details that the higher-ranked source leaves
unspecified.

## Categories That Are Reference Only

The following categories may inform implementation, review, provenance, or work
tracking, but are not independent design authority:

- `ANDROID_IMPL_NOTE`
- `AUDIT_DOC`
- `FIX_QUEUE`
- `MANIFEST_OR_HASH`

`ANDROID_IMPL_NOTE` must retain `mustNotOverrideDesign: true`.
`AUDIT_DOC` and `FIX_QUEUE` are `referenceOnly`.
`MANIFEST_OR_HASH` is `provenanceOnly`.

## Categories That Must Not Be Used As Authority

- `GENERATED_STITCH_OUTPUT`
- `HISTORY_OR_DEPRECATED`
- `UNKNOWN`

Generated output may be reviewed as output, but it must not be recycled as
source authority by default. Deprecated or historical material must not define
current design. Unknown material must be classified before use.

## Conflict Resolution Order

1. Human-approved `SOURCE_UI_IMAGE`
2. `STITCH_DESIGN_SOURCE_OF_TRUTH.md`
3. `PAGE_SPEC` / `INFORMATION_ARCHITECTURE`
4. `DESIGN_SYSTEM` / `TOKEN_SPEC` / `COMPONENT_SPEC`
5. `INTERACTION_SPEC`
6. `ANDROID_IMPL_NOTE`
7. `AUDIT_DOC` / `FIX_QUEUE`
8. `MANIFEST_OR_HASH`
9. `GENERATED_STITCH_OUTPUT`
10. `HISTORY_OR_DEPRECATED`

A lower-ranked category cannot override a higher-ranked category. If sources at
the same rank conflict without an explicit human-approved precedence decision,
the affected material remains `usable=false` until a human resolves the
conflict.

## Human Review Gate

- Generated, existing, mapped, hashed, inventoried, or uploaded does not mean
  usable.
- Manifest completeness does not mean usable.
- Model audit `PASS` does not mean usable.
- Only `humanReviewResult=PASS` permits `usable=true`.
- Human review must apply to an identified source version or hash and target
  screen mapping.
- A review result for one version, theme, state, viewport, or screen must not be
  silently transferred to another.

## Stitch Must Not Redesign

Stitch is an implementation and generation tool for the supplied design intent,
not an independent design authority.

Stitch must not:

- introduce a new visual direction;
- reinterpret approved layouts, hierarchy, navigation, component anatomy, or
  token choices;
- prefer its own generated output over supplied authority;
- resolve conflicts by aesthetic preference;
- use audit, queue, manifest, generated, historical, deprecated, or unknown
  material as design authority;
- invent missing decisions that require human design judgment.

When authority is missing or conflicting, generation for the affected scope
must pause and the material must remain `usable=false` until human review
resolves it.

## Conflict Repair Decisions

### Current Navigation Authority

The current primary navigation is `Bookshelf / Discovery / RSS / Settings`.
Historical references to a `My` tab are non-authoritative audit/history
material and must not be used for current page generation or implementation.

### Current Token Authority

`docs/ui-design/91-历史归档/freezes/阅读控制层V1预冻结/06_DESIGN_TOKENS_DRAFT.md` is `TOKEN_SPEC` with authority level `SUPPORTING_SPEC`.
Its lifecycle status is `PARTIAL_DRAFT`, its upload mode is `referenceOnly`,
and it is not independent design authority.

The following may be used only as supporting review inputs:

- measured `390 x 884` phone geometry;
- named warm-light surface values already cross-checked against current
  human-selected source candidates;
- documented typography, spacing, and radius measurements where they do not
  conflict with a human-approved source image.

The following remain pending human confirmation:

- final dark palette;
- complete semantic state tokens;
- complete safe-area rules across every viewport;
- cross-page icon token normalization;
- final warm-white values for global-state templates.

No page may become `usable=true` from this draft token document alone.
Every page mapping must also identify a current source image or explicitly say
`NEEDS_HUMAN_REVIEW`, plus page, component, and interaction references.

### Reference-Only Images

Images classified as `HISTORY_OR_DEPRECATED`, multi-state flow boards, and the
51-series global-state images must never appear in `mappedSourceImages`.
They may appear only in `mappedReferenceImages` for historical comparison or
interaction explanation.

The 51-series is not authority for the current warm-white Light direction.
That direction is determined only by human-approved `SOURCE_UI_IMAGE`
material and this source-of-truth policy.

### Historical Audits And Stitch Projects

Old readiness `READY`/`PASS` statements are `AUDIT_REFERENCE` only and do not
imply current usability. Old Stitch project audit/queue documents are
`AUDIT_REFERENCE` or `HISTORY_OR_DEPRECATED`; they cannot be current source
material for project `6080030181007410630`.

### Conflict Repair Gate

All repaired records remain `humanReviewResult=PENDING` and `usable=false`.
SHA256-bound inferred metadata is provenance, not approval. Upload remains
prohibited until the required human review is completed and explicit upload
approval is given.

## Responsive Scope Boundary

This is a remaining P2 scope boundary. It does not block preparation of the
source upload review package, but it blocks design freeze for responsive
variants until a human confirms the target scope.

### Phone Materials

- `390 x 884` portrait phone screens may be reviewed as primary
  `SOURCE_UI_IMAGE` candidates for matching phone pages.
- A phone candidate must be a single screen/state, identify its exact target,
  and pass SHA-bound human review.
- Phone source authority does not automatically transfer to landscape,
  tablet, or side-control variants.

### Side-Control Materials

- Side-control panel masters and portrait/landscape composites describe
  control-layer geometry and responsive intent.
- They are `referenceOnly` for the standard `390 x 884` page unless a target
  page explicitly represents that side-control viewport.
- A cropped panel master such as `45-9` cannot be mapped as a complete
  `390 x 884` page source.

### Landscape And Tablet Materials

- Landscape, tablet, and multi-panel flow boards are responsive or
  interaction references only.
- They must not appear as the primary source for a `390 x 884` portrait page.
- They may become source candidates only for an explicitly named landscape or
  tablet target after separate human review.

### Freeze Gate

P2 does not block human source-upload review. It does block responsive design
freeze until phone, side-control, landscape, and tablet target mappings are
explicitly approved.

## Human-Rejected Image Groups

Groups 48 and 51 were explicitly rejected during human visual review because
their UI design and actual functional model were not understandable or
accepted. They are `HISTORY_OR_DEPRECATED`, `DEPRECATED_NOT_AUTHORITY`,
`uploadAllowed=false`, `uploadMode=exclude`, and `usable=false`.

These images must not be uploaded as source or reference, mapped as current
page source, or used to infer product functionality. Replacement material
requires both an understandable functional specification and a new
SHA-bound human visual review.

## Page-Level Usability Gate

Image-level human PASS applies only to the exact SHA-bound image. It does not
grant page-level PASS or page-level `usable=true`.

A page remains blocked unless it has a current source image, page
specification, final token/design-system basis, component specification,
interaction specification, and an explicit human page-level decision.

The current token document remains `PARTIAL_DRAFT`,
`SUPPORTING_SPEC`, and `referenceOnly`. All 96 mapped pages depend on it, so
it cannot finalize any page. The 15 pages with human-approved source images
remain `usable=false` until final token and remaining page/component/
interaction blockers are resolved.

No approved image may be reused for a semantically different source-gap page
merely to close inventory. Candidate reuse requires an exact target match
and a separate human page-level decision.

## Superseded Source Gap Decision Package

The former 38-page decision package is retained only as an audit-history
snapshot. Its `NEED_NEW_SOURCE`, `REFERENCE_ONLY`, and `EXCLUDE`
recommendations do not override the later source-gap re-audit. Current
decisions are defined by `STITCH_MISSING_CURRENT_SOURCE_PAGES.md`.

A new source must be a `390x884` warm-white Light, single-screen image for
the exact target page/state and must receive an exact-SHA human review.
Reference-only material cannot become a main source. Excluded pages remain
outside upload scope and `usable=false`.

Proposed component and interaction specification paths are work targets only.
They do not become authority until the required fields in
`STITCH_UPLOAD_DOC_REQUIREMENTS.md` are complete and reviewed.

The token draft at `docs/ui-design/91-历史归档/freezes/阅读控制层V1预冻结/06_DESIGN_TOKENS_DRAFT.md` remains non-final. Missing final fields are the
final dark palette, complete semantic state tokens, cross-viewport safe-area
rules, normalized icon tokens, and final warm-white global-state values.
No page may become `usable=true` before token finalization and explicit
page-level human approval.

## Decision Backfill Rule

Empty or `PENDING` backfill fields are not approvals. A decision takes effect
only when a human explicitly records the page-level result. New source images
additionally require an exact SHA256 match and explicit visual PASS.
Reference-only and exclude confirmations never set page `usable=true`.

## Missing Basis Text Drafts

The four `STITCH_*_TEXT_DRAFT.md` files are proposed wording for human review.
They are not final page, token, component, or interaction authority. They must
not be uploaded as source authority or used to set page `usable=true` until
their required fields are reviewed and an explicit human decision adopts them.

Text briefs for missing source images do not replace the required images.
Component and interaction drafts for excluded groups 48 and 51 are conditional
only and do not reverse their exclusion.

## Confirmed Source Gap Decisions

- The prior `04-reader-controls` new-source decision is superseded. Its
  baseline roles are defined in the next section.
- `11-auto-page-turn-running-capsule` is confirmed reference-only and cannot
  be used as a primary page source.
- `48-app-settings-general` is confirmed excluded; the page and associated
  rejected image remain outside the source upload scope.

These confirmations do not grant page-level `usable=true`.

## Reader Control Baseline Authority

The reader-control baseline is composite:

1. `04-2-reader-controls-opaque-icon-aligned.png` defines current visual
   geometry, icon language, dimensions, positions, and fixed structure.
2. `04-reader-controls.png` defines the default control state's functional
   composition.
3. `04-1-reader-control-layer-module-plan.svg` defines module relationships,
   entries, and replacement scope.

`04` and `04-1` are standard scoped references, not deprecated material.
Neither may override the visual geometry of `04-2`. Mapping `04-2` as the
source candidate does not grant `usable=true` without exact-SHA human review.

## Source Gap Re-audit Rule

A manifest/image inventory row is not automatically an independent product
page. A source gap exists only when all of the following are true:

1. the row represents a current in-scope product page or distinct UI state;
2. no current adopted image, replacement image, or valid composite baseline
   covers that exact page/state;
3. the row is not merely a flow board, running-state reference, module-content
   reference, information-structure breakdown, historical alias, or
   human-excluded scope.

Applying this rule closes the previous 37-row source-gap list as a
classification error. The authoritative per-row result is in
`STITCH_MISSING_CURRENT_SOURCE_PAGES.md`.

Current replacement rules:

- module states combine `04-2` fixed structure with current module content and
  the matching `16-6`, `18-4`, `21-2`, or `22-3` source candidate;
- appearance pages `29` through `33` use standard candidates `35` through
  `39`; `28` is information-structure support for the `21-2` appearance
  module, not a separate visual baseline;
- discovery uses `41-1`; `41-discovery-default` is historical;
- running-state and flow materials remain scoped references and are not
  counted as missing standalone pages;
- 48/51 remain excluded by explicit human rejection.

This correction does not approve any candidate, does not finalize tokens or
component/interaction mappings, and does not make any page usable.

## 25-4 Human Review Decision

`25-4-reader-top-more-menu-height-aligned.png` with SHA256
`ccb5d87c51cfc064b73fb4606f996f4b2321f68db147d335702cfc38615dd693`
received explicit human `PASS` on 2026-06-13. It is image-level
`usable=true` and may serve as the current source image for the top-more-menu
state. This does not set the mapped page `usable=true`; final token and
page-level review gates remain.

## Appearance Pages 35-39 Review Decision

Images `35` through `39` exist, but the 2026-06-13 conditional visual review
found blocking differences. They are current scoped references only and may
not serve as final design authority:

- `35` and `36` omit required page content;
- `37` and `38` are strong layout references but do not meet the required
  viewport or final-token gate;
- `39` additionally uses iOS-style status chrome in an Android design.

All five remain `usable=false`. Their five target appearance pages require
qualified corrected sources before page-level approval.
