# reader.reading-surface 源端谱系校正报告

> 本报告由只读谱系校正 agent 产出。未修改任何代码、git 状态、LOCAL_READY_FOR_FIGMA.json、local.status 或 harmony.status。
> 产出时间（UTC）: 2026-07-27T06:10:13Z

## 当前 main commit

- SHA: `88069f6df3bec6ad040a6c6f9f7cebc815548342`
- Subject: `feat(promote): atomic four-file transaction with fault injection (#2)`
- Date: `2026-07-27T12:27:13+08:00`
- 当前检出分支: `main`

## 旧证据包状态

- 文件: `docs/design/handoffs/reader-runtime/LOCAL_READY_FOR_FIGMA.json`
- schemaVersion: `1.1.0`
- kind: `LOCAL_READY_FOR_FIGMA`
- scope: `Reader Runtime`
- pageFamily: `reader-runtime`
- stage: `R2a-R2b-R3a`
- status: `LOCAL_READY_FOR_FIGMA_R3a_COMPLETE`
- generatedAt: `2026-07-21T11:30:00+08:00`
- implementationCommit: `06fc096e1ad294b41b9b924354d72d2ce61640d0`
- implementationCommitSubject: `feat(reader-runtime): R2a/R2b/R3a LOCAL_READY_FOR_FIGMA`
- implementationCommitAuthor: `Minliny`
- implementationCommitDate: `2026-07-21T00:55:08+08:00`
- evidenceCommit: `PENDING_EVIDENCE_COMMIT_SELF_REFERENTIAL`（自引用占位，未绑定实际证据 commit）
- identityTokenBoundaryImplementationCommit: `8c7effb3aaeb67f27af2f78fcad6291476890ec1`
- localSource.branch: `codex/motion-demo-optimizations`
- localSource.localReadyForFigma: `true`
- admission.localReadyForFigma: `true`
- admission.exactLocalCommit: `06fc096e1ad294b41b9b924354d72d2ce61640d0`
- admission.figmaWriterMayStart: `true`
- admission.requiresFreshFigmaRevisionRead: `true`
- admission.requiresSingleWriter: `true`

### 是否 main 祖先

- 命令: `git merge-base --is-ancestor 06fc096e1ad294b41b9b924354d72d2ce61640d0 main`
- 结果: **NOT_ANCESTOR**（不是当前 main 的祖先）

### 所属分支

- 命令: `git branch -a --contains 06fc096e1ad294b41b9b924354d72d2ce61640d0`
- 包含该 commit 的分支:
  - `codex/motion-demo-optimizations`（本地）
  - `remotes/origin/codex/motion-demo-optimizations`（远程）
- 该 commit 位于独立的功能分支，未合入 main。

### verification 测试结果（来自旧证据包，仅供历史参考）

- focusedR3a: tests=28, passed=28
  - `frontend-demo-optimized/verify/r3a-reader-runtime-identity.test.mjs`
  - `frontend-demo-optimized/verify/r3a-reader-runtime-flow.test.mjs`
  - `frontend-demo-optimized/verify/r3a-reader-runtime-aria-focus.test.mjs`
- frontendRegression: tests=340, passed=340, failed=0
- identityInventoryRegression: tests=84, passed=84, failed=0
- identityDenominator: 3808
- liveDomSmoke: 13 primaryRoutes, duplicateControlKeys=0, emptyChapterBusinessKeys=0

### sourceEvidenceHash 字段

- 任务步骤要求提取 `sourceEvidenceHash`，但 `LOCAL_READY_FOR_FIGMA.json` 中**不存在**该字段。
- 证据包内与源端绑定相关的字段为 `localSource.implementationCommit` / `admission.exactLocalCommit` / `localSource.identityTokenBoundaryImplementationCommit`，均指向旧分支 commit。
- 结论：旧证据包未携带独立的 sourceEvidenceHash；其源端绑定完全依赖 implementationCommit，而该 commit 不在 main 祖先链上。

### 结论

- **历史参考（不可用于本次 promotion）**
- 旧证据包的 `implementationCommit` 位于 `codex/motion-demo-optimizations` 分支，不是当前 Reader-UI main (`88069f6...`) 的祖先。
- 旧证据包的 `evidenceCommit` 仍是 `PENDING_EVIDENCE_COMMIT_SELF_REFERENTIAL` 自引用占位，未完成自引用闭环。
- 旧证据包内的测试结果与 admission 标志仅代表 `codex/motion-demo-optimizations` 分支在 2026-07-21 的状态，不能作为当前 main 上阅读页源端转换的证据。

## registry 记录（reader.reading-surface）

来源: `docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json`

- id: `reader.reading-surface`
- surfaceType: `route-family`
- routeIds: `immersive-reading`, `reader`, `reader_content`
- classification: `exact-figma-binding`
- deliveryStatus: `current-read-unfrozen`
- local.status: `candidate-backport`
- harmony.status: `candidate-backport`
- figma.fileKey: `klhs2jMM4MncaJFqZMfqEK`
- figma.pageId: `1023:17636`
- figma.canonicalMasterId: `1023:18354`
- figma.nodeId: `1023:18354`
- figma.viewportNodes:
  - phone: `1023:18355`
  - tablet: `1023:18371`
- figma.revision: `2379851596474967636`
- figma.revisionStatus: `official-rest-current-version-node-verified`
- figma.revisionEvidence.artifact: `docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json`
- figma.revisionEvidence.currentRevision: `2379851596474967636`
- figma.revisionEvidence.observedAt: `2026-07-24T17:57:17.506Z`
- figma.revisionEvidence.source: `figma-rest`
- local.targets:
  - `frontend-demo-optimized/renderers/d3-control-layers-renderers.js`
- harmony.targets:
  - `Reader-for-HarmonyOS/entry/src/main/ets/ui/components/ReaderComponents.ets#ReaderBase`
- evidence:
  - `docs/design/handoffs/reading-chain/F0_FIGMA_FIRST_CROSSWALK.json#reader-reading-surface`

### 状态机解读（依据 AGENTS.md rule 7）

- `harmony.status = candidate-backport` → 渲染门 `fail-closed`。
- 阅读页尚未达到 `implementation-ready`。前置条件（存在 `LOCAL_READY_FOR_FIGMA.json` 且 `status: LOCAL_READY_FOR_FIGMA_R3a_COMPLETE` 的源端转换证据包）**未在当前 main 上闭合**：现有证据包位于旧分支，不属于 main 谱系。
- 因此 `reader.reading-surface` 当前不可标记为 `implementation-ready`，也不可进入交付链 step 4–9。

## 官方 revision 证据

来源: `docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json`

- kind: `FIGMA_CURRENT_REVISION_EVIDENCE`
- fileKey: `klhs2jMM4MncaJFqZMfqEK`
- currentRevision: `2379851596474967636`
- lastModified: `2026-07-24T17:36:04Z`
- fileName: `Reader UI · Phase 2 Design System & Redraw`
- observedAt: `2026-07-24T17:57:17.506Z`
- provenance.source: `figma-rest`
- provenance.readOnly: `true`
- provenance.metadataEndpoint: `GET /v1/files/:key?depth=1 (version omitted = current)`
- provenance.tokenPersisted: `false`

### 与 registry 一致性

- F0 证据 currentRevision: `2379851596474967636`
- registry reader.reading-surface figma.revision: `2379851596474967636`
- **一致: YES**
- F0 证据中 `1023:18354` / `1023:18355` / `1023:18371` 三个节点均在 `resolvedNodes` 中存在，类型分别为 `COMPONENT_SET` / `COMPONENT` / `COMPONENT`。
- 注意：F0 证据的 observedAt 为 2026-07-24，距今（2026-07-27）已 3 天；本次未做新的 REST 复核（见 B1 冻结报告），不能视为"实时当前"revision。

## 结论

1. **阅读页必须从当前 main 新建源端转换和证据包。**
   - 当前 main HEAD: `88069f6df3bec6ad040a6c6f9f7cebc815548342`
   - 旧证据包 `docs/design/handoffs/reader-runtime/LOCAL_READY_FOR_FIGMA.json` 的 `implementationCommit` (`06fc096...`) 位于 `codex/motion-demo-optimizations` 分支，**不是 main 祖先**，不能作为本次 promotion 的源端证明。
   - 旧证据包的 `evidenceCommit` 仍为 `PENDING_EVIDENCE_COMMIT_SELF_REFERENTIAL` 自引用占位，证据闭环未完成。
2. **旧证据包仅作历史参考。**
   - 其测试结果（focusedR3a 28/28、frontendRegression 340/340、identityInventoryRegression 84/84）仅反映旧分支在 2026-07-21 的状态。
   - 如需复用其工作成果，必须将相关源端转换重新落到当前 main（或基于 main 的新分支），并重新生成以 main commit 为 `implementationCommit` 的新 `LOCAL_READY_FOR_FIGMA.json`，同时把 `evidenceCommit` 自引用占位替换为实际证据 commit。
3. **registry 与 F0 证据在 revision 字段上一致**（均为 `2379851596474967636`），但 F0 证据观察时间为 2026-07-24，本次未做新的 REST 复核。是否需要新一轮 REST 复核取决于 promotion 流程对"新鲜 revision"的要求（旧证据包 `requiresFreshFigmaRevisionRead: true`，提示需要新鲜读取）。
4. **registry 中 `reader.reading-surface` 的 `harmony.status` 仍为 `candidate-backport`**，与"源端转换未在 main 上闭合"一致；不可在本次 promotion 中越过 step 2 → step 3 的前置条件。
