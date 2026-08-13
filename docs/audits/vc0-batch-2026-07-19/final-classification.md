# VC0 推荐分类（12 族，待用户确认） — 2026-07-19

> **工作包**：A1 · VC0 Evidence Closure
> **分支**：`codex/motion-demo-optimizations`
> **HEAD**：`8f9eea1c31cb4b3328f76a06fd286868ea7b9f13`
> **范围**：12 个非 Reader 页面族（F13-F24）
> **Figma 文件**：`klhs2jMM4MncaJFqZMfqEK`
> **执行者**：A1 工作包执行者
> **状态**：VC0 事实收口完成；本文件是 A1 的**推荐分类**，**待用户确认后方可进入 R3a / VC3-R3b 串行流程**；IC0 仍因 3,815 / 3,815 controls 缺稳定 join key 未通过
>
> **A0 阶段命名对齐**：本文件原使用"VC1 / VC2 / VC3"作为后续阶段标签，A0「全局控制面纠偏」之后统一为 **R2a / R2b / R3a / VC3-R3b**（见 `tools/interaction-inventory/MIGRATION_REPORT.md` §16.1）。下方"VC1 / VC2 / VC3"字样保留为历史引用，等价于 R3a（Figma 前功能验证）/ VC3-R3b（Figma 回写后的最终浏览器验证）的子步骤。

## 0. 分类口径

本推荐分类只回答 VC0 层面的「事实」问题：当前 12 个非 Reader 页面族在静态 DOM / Figma 结构 / IC0 motion normalization 三层的事实证据下，应被分类为以下哪一类。**这是 A1 的推荐，需要用户确认后才算"最终分类"。**

- **保持（keep）**：当前静态候选与 motion 覆盖证据足以维持现状，进入 R3a 之前仅需补齐全局稳定 ID / crosswalk；不需要 Reader-UI 先修视觉或 Codex 修复 Figma 结构。
- **Codex 修复（codex-fix）**：Figma 结构可以保留，但 Reader-UI 代码层需要补稳定身份 / UiEvent 映射；不需要改 Figma。
- **两阶段（two-stage）**：Reader-UI 先修（视觉 / 状态 / 控件语义），再在 A2 冻结稳定 ID 后做 Codex 修复；Figma 结构可保留，但当前静态候选在视觉、状态或 motion 覆盖上有缺口。
- **Figma 修改（figma-modify）**：必须有同状态、同尺寸的当前 Figma / Browser 对照证据，或用户明确改版决定；本批无证据支持此类。

**预分类（来自 `docs/READER_MULTI_AGENT_EXECUTION_GUIDE_2026-07-19.md` 第 3 节）**：keep=2, codex-fix=1, two-stage=9, figma-modify=0。

**本推荐分类结论**：保持预分类。无新证据推翻任何一族的预分类。**待用户确认后方可称为"最终分类"并进入 R3a / VC3-R3b 串行流程。**

## 1. 分类汇总表

| 顺序 | familyId | routeId | runtimeFamily | 推荐分类 | 下一 owner | 预分类 | 是否变更 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | F13-source-management | `source-management` | source | 两阶段 | Reader-UI 先修 | 两阶段 | 否 |
| 2 | F14-webdav-config | `webdav-config` | sync | 两阶段 | Reader-UI 先修 | 两阶段 | 否 |
| 3 | F15-sync-backup | `sync-backup` | sync | 两阶段 | Reader-UI 先修 | 两阶段 | 否 |
| 4 | F16-search-results | `search-results` | library | 两阶段 | Reader-UI 先修 | 两阶段 | 否 |
| 5 | F17-bookshelf | `bookshelf` | library | 两阶段 | Reader-UI 先修 | 两阶段 | 否 |
| 6 | F18-book-detail | `book-detail` | library | 两阶段 | Reader-UI 先修 | 两阶段 | 否 |
| 7 | F19-import-conflict-resolve | `import-conflict-resolve` | import | 两阶段 | Reader-UI 先修 | 两阶段 | 否 |
| 8 | F20-discover | `discover` | discover | 两阶段 | Reader-UI 先修 | 两阶段 | 否 |
| 9 | F21-rss | `rss` | rss | 两阶段 | Reader-UI 先修 | 两阶段 | 否 |
| 10 | F22-source-switch | `source-switch` | source-switch | Codex 修复 | Reader-UI | Codex 修复 | 否 |
| 11 | F23-about | `about` | settings | 保持 | VC0 确认 | 保持 | 否 |
| 12 | F24-restore-preview | `restore-preview` | sync | 保持 | VC0 确认 | 保持 | 否 |

合计：保持 2、Codex 修复 1、两阶段 9、Figma 修改 0。

## 2. 逐族分类与证据

### 2.1 F13-source-management — 两阶段

**对象 + 层级 + 原始证据 + 未完成项**

- **对象**：`source-management` route，runtimeFamily=source。
- **层级**：Figma 24 Set 静态 / Reader-UI runtime / Browser DOM 三层。
- **原始证据**：
  - Figma：`docs/audits/vc0-batch-2026-07-19/generated/family-manifest.json` F13 登记 figmaSource 指向 `24 · Responsive Masters · Phase 4` pageNodeId `941:2`。
  - Browser DOM：`docs/audits/vc0-batch-2026-07-19/generated/browser-structure-observations.json` L1470-L1664，phone 视口 13 button + 4 group，4 nonSemanticCandidates。
  - IC0 normalization：`docs/audits/ic0-2026-07-19/generated/interaction-control-coverage.json`，source family 共 392 semantic controls，全部 unjoined-no-stable-key。
  - Motion：`interaction-traces.json` F13-T01 / F13-T02，motionRegistered=true，motionIdsObserved=[`app.route.pop`, `app.route.push`, `state.content.replace`, `state.loading.inline`]。
  - 视觉对照：`visual-comparison-manifest.json` F13，browserRaw phone=true，figmaScreenshots=0，comparisonImages=0。
- **分类理由**：
  1. 4 个 nonSemanticCandidates（Switch 类）未带 data-motion-id，IC0 raw motion hint 未覆盖，motion 行为在 DOM 层缺失。
  2. Figma 截图未采集，无法做同尺寸视觉对照。
  3. IC0 全部 392 source family controls 缺稳定 join key，需要 A2 先修。
- **未完成项**：Figma 截图、compact / tablet 视口 DOM、after / focus / console / 稳定终态、删除确认 dialog 实际播放。

### 2.2 F14-webdav-config — 两阶段

- **对象**：`webdav-config` route，runtimeFamily=sync。
- **原始证据**：
  - family-manifest.json F14，figmaSource page 24。
  - browser-structure-observations.json L1893-L2085，phone 视口 5 button + 4 group + 4 input，3 nonSemanticCandidates。
  - IC0：sync family 113 semantic controls，全部 unjoined。
  - Motion：F14-T01 / F14-T02，motionRegistered=true，motionIdsObserved=[`app.route.pop`, `overlay.dialog.enter/exit`]。两个 dialog overlay（webdav-test / webdav-save）通过 data-settings-overlay 绑定。
  - 视觉对照：F14 browserRaw phone=true，figmaScreenshots=0，comparisonImages=0。
  - alias：sync-backup-state-matrix 与 webdav-config 渲染等价（renderSha256 一致）。
- **分类理由**：
  1. 4 个 input（服务器地址 / 账号 / 密码 / 同步目录）未带 data-motion-id；input.focus / input.blur / input.submit 等 motion 行为在 DOM 层缺失。
  2. 3 个 nonSemanticCandidates（SSL 证书校验 / 连接超时 / 仅 Wi-Fi 同步 group）需要 Switch / Stepper 语义补齐。
  3. dialog:webdav-test / dialog:webdav-save overlay 的 focus-return 标记为 none，未在浏览器自动化中验证。
- **未完成项**：Figma 截图、input motion 绑定、Switch / Stepper / Select 语义、async 状态、compact / tablet 视口。

### 2.3 F15-sync-backup — 两阶段

- **对象**：`sync-backup` route，runtimeFamily=sync。
- **原始证据**：
  - family-manifest.json F15。
  - browser-structure-observations.json L1665-L1891，phone 视口 9 button + 4 input，0 nonSemanticCandidates。
  - IC0：sync family 113 semantic controls；explicitGapSummaries.identicalVariantRenders 列出 sync-backup default / loading 渲染相同（renderSha256 一致）。
  - Motion：F15-T01 / F15-T02，motionRegistered=true，motionIdsObserved=[`app.route.pop`, `overlay.dialog.enter/exit`, `card.route`]。5 个恢复记录卡片均带 data-motion-id=`card.route` + data-route=`restore-confirm`。
  - 视觉对照：F15 browserRaw phone=true，figmaScreenshots=0，comparisonImages=0。
- **分类理由**：
  1. IC0 标记 sync-backup default / loading 视觉等同（identicalVariantRenders），需要 Reader-UI 先修 loading 状态。
  2. 4 个 input 未带 data-motion-id。
  3. card.route → restore-confirm 的 push 路径未在浏览器自动化中验证。
- **未完成项**：loading 状态视觉差异、input motion、card push 焦点归宿、compact / tablet 视口。

### 2.4 F16-search-results — 两阶段

- **对象**：`search-results` route，runtimeFamily=library。
- **原始证据**：
  - family-manifest.json F16。
  - browser-structure-observations.json L1084-L1275，phone 视口 8 button + 1 input，2 emptyAccessibleName。
  - IC0：library family 403 semantic controls，全部 unjoined。
  - Motion：F16-T01 / F16-T02 / F16-T03，motionRegistered=true，motionIdsObserved=[`app.route.pop`, `app.route.push`, `input.focus`, `input.submit`, `input.clear`]。input 与 submit 按钮 accessible name 为空。
  - 视觉对照：F16 browserRaw phone=true，figmaScreenshots=0，comparisonImages=0。
- **分类理由**：
  1. 2 个 emptyAccessibleName（input + submit 按钮）违反 IC0_ACCESSIBLE_LABEL_MISSING，需要 Reader-UI 先修。
  2. 加入书架按钮（data-search-add-to-bookshelf）未带 data-motion-id。
  3. 重复提交 / 焦点路径未在浏览器自动化中验证。
- **未完成项**：accessible name、加入书架 motion、重复提交防护、focus 路径、compact / tablet 视口。

### 2.5 F17-bookshelf — 两阶段

- **对象**：`bookshelf` route，runtimeFamily=library。
- **原始证据**：
  - family-manifest.json F17。
  - browser-structure-observations.json L9-L264（phone）、L2443-L2699（compact）、L4877-L5133（tablet），三视口齐备，phone 24 button。
  - IC0：library family 403 semantic controls，全部 unjoined。
  - Motion：F17-T01 / F17-T02，motionRegistered=true，motionIdsObserved=[`button.activate`, `bookshelf.view.switch`, `dropdown.trigger.press`, `state.content.replace`, `reader.entry.actionToImmersive`]。
  - 视觉对照：F17 browserRaw 三视口齐备，figmaScreenshots=0，comparisonImages=0。
- **分类理由**：
  1. 三视口齐备但仍无 Figma 截图，无法做同尺寸对照。
  2. 24 button 中仅 5 个有 data-motion-id，其余 19 个 motion 行为未在 DOM 层登记。
  3. 稳定事件身份（controlId）缺失，需要 A2 先修。
- **未完成项**：Figma 截图、Sheet / Dialog 状态、稳定事件身份、19 button motion 绑定、compact / tablet motion 等价验证。

### 2.6 F18-book-detail — 两阶段

- **对象**：`book-detail` route，runtimeFamily=library。
- **原始证据**：
  - family-manifest.json F18。
  - browser-structure-observations.json L266-L474，phone 视口 9 button，0 nonSemanticCandidates。
  - IC0：explicitGapSummaries.identicalVariantRenders 列出 book-detail default / loading 渲染相同。
  - Motion：F18-T01 / F18-T02，motionRegistered=true，motionIdsObserved=[`app.route.pop`, `app.route.push`, `overlay.sheet.enter`, `overlay.dialog.enter`, `reader.entry.actionToImmersive`]。更换书源 Sheet 与移除书架 Dialog 均带 overlay motion + data-motion-overlay-focus-return=`none`。
  - 视觉对照：F18 browserRaw phone=true，figmaScreenshots=0，comparisonImages=0。
- **分类理由**：
  1. IC0 标记 book-detail default / loading 视觉等同，需要 Reader-UI 先修 loading 状态。
  2. overlay.sheet.enter（更换书源）与 overlay.dialog.enter（移除书架）的 focus-return 标记为 none，未在浏览器自动化中验证。
  3. 章节列表 article 按钮 data-motion-entry-key 各不相同但 canonical motion id 相同（reader.entry.actionToImmersive），需要 A2 提供稳定 entry 身份。
- **未完成项**：loading 状态、overlay focus-return 验证、章节 entry 身份、compact / tablet 视口。

### 2.7 F19-import-conflict-resolve — 两阶段

- **对象**：`import-conflict-resolve` route，runtimeFamily=import。
- **原始证据**：
  - family-manifest.json F19。
  - browser-structure-observations.json L476-L612，phone 视口 5 button，0 nonSemanticCandidates。
  - IC0：import family 43 semantic + 8 suspected non-semantic，全部 unjoined。
  - Motion：F19-T01 / F19-T02，motionRegistered=true，但 motion 覆盖率仅 1/5 = 20%。4 个冲突解决按钮（保留本地 / 覆盖本地 / 保留两份 / 取消并回滚）仅有 data-action，无 data-motion-id。
  - 视觉对照：F19 browserRaw phone=true，figmaScreenshots=0，comparisonImages=0。
- **分类理由**：
  1. motion 覆盖率最低（20%），4 个核心冲突解决控件无 motion 绑定，需要 Reader-UI 先修。
  2. 冲突选择后的状态机迁移与回滚未在浏览器自动化中验证。
  3. import family 8 个 suspected non-semantic 控件需要 A2 补身份。
- **未完成项**：4 button motion 绑定、状态机迁移、回滚验证、suspected non-semantic 身份、compact / tablet 视口。

### 2.8 F20-discover — 两阶段

- **对象**：`discover` route，runtimeFamily=discover。
- **原始证据**：
  - family-manifest.json F20。
  - browser-structure-observations.json L614-L862，phone 视口 19 button，0 nonSemanticCandidates。
  - IC0：discover family 778 semantic controls（最大 family），全部 unjoined。
  - Motion：F20-T01 / F20-T02，motionRegistered=true，motionIdsObserved=[`button.activate`, `app.route.push`, `chip.item.select`, `dropdown.trigger.press`, `filter.apply.commit`]。6 个 chip 通过 data-discover-entry 区分但 canonical motion id 相同（chip.item.select）。
  - 视觉对照：F20 browserRaw phone=true，figmaScreenshots=0，comparisonImages=0。alias discover-home 与 discover 等价。
- **分类理由**：
  1. filter / segment / source-confirm 状态未在浏览器自动化中验证。
  2. 6 个 chip 的 data-discover-entry 身份未与 canonical motion id 关联，需要 A2 补稳定身份。
  3. discover 是最大 family（778 controls），两阶段路径风险最高。
- **未完成项**：filter 应用后状态、segment 切换、source-confirm、chip 身份、compact / tablet 视口。

### 2.9 F21-rss — 两阶段

- **对象**：`rss` route，runtimeFamily=rss。
- **原始证据**：
  - family-manifest.json F21。
  - browser-structure-observations.json L865-L1082，phone 视口 22 button，0 nonSemanticCandidates。
  - IC0：rss family 417 semantic controls，全部 unjoined。
  - Motion：F21-T01 / F21-T02，motionRegistered=true，motionIdsObserved=[`app.route.push`, `dropdown.trigger.press`]。12 个 sample 中 10 个为 app.route.push（订阅源卡片 / 分组入口）。
  - 视觉对照：F21 browserRaw phone=true，figmaScreenshots=0，comparisonImages=0。
- **分类理由**：
  1. refresh / 筛选 / Toast / Dialog / async 结果未在浏览器自动化中验证。
  2. 12 个 app.route.push 控件的 data-route 各不相同但 canonical motion id 相同，需要 A2 补稳定 route 身份。
  3. 22 button 中仅 12 个在 sample 中出现，其余 10 个 motion 行为未登记。
- **未完成项**：refresh 状态、Toast / Dialog、async 结果、route 身份、compact / tablet 视口。

### 2.10 F22-source-switch — Codex 修复

- **对象**：`source-switch` route，runtimeFamily=source-switch。
- **原始证据**：
  - family-manifest.json F22。
  - browser-structure-observations.json L2211-L2442（phone）、L4645-L4876（compact）、L7079-L7310（tablet），三视口齐备，phone 28 button + 1 slider。
  - IC0：source-switch family 173 semantic controls，全部 unjoined。motionNormalization.bindings 中 `[data-source-switch-window]` 已绑定 `reader.sourceSwitch.open-close`。
  - Motion：F22-T01 / F22-T02，motionRegistered=true，motionIdsObserved=[`app.route.pop`, `app.route.push`, `reader.control.hide`, `reader.panel.expand`, `card.route`, `overlay.sheet.enter/exit`, `dropdown.trigger.press`, `reader.sourceSwitch.open/close`]。
  - 视觉对照：F22 browserRaw 三视口齐备，figmaScreenshots=0，comparisonImages=0。
  - Figma：`docs/design/FIGMA_HANDOFF_STATUS_2026-07-12.md` 标注 Figma CandidateRow / Window / Overlay 组件链可以保留。
- **分类理由**：
  1. Figma 结构可保留（CandidateRow / Window / Overlay 已在 Figma 端完成），无需 figma-modify。
  2. motion 覆盖最完整（28 button + 1 slider，含 reader.* 全套 motion），视觉与 motion 事实足以维持。
  3. 缺口仅在 Reader-UI 代码层的稳定身份（controlId）与 UiEvent 映射，属于 Codex 修复范围。
- **未完成项**：Figma 截图、controlId / ScreenGraph component instance、焦点路径、compact / tablet motion 等价验证。

### 2.11 F23-about — 保持

- **对象**：`about` route，runtimeFamily=settings。
- **原始证据**：
  - family-manifest.json F23。
  - browser-structure-observations.json L1277-L1468，phone 视口 6 button + 7 group，0 nonSemanticCandidates（但 7 个 group 为 suspected non-semantic 候选）。
  - IC0：settings family 83 semantic + 8 suspected non-semantic controls。
  - Motion：F23-T01 / F23-T02，motionRegistered=true，motionIdsObserved=[`app.route.pop`, `app.route.push`]。两个 push 控件（版本 / 检查更新）均指向 about-version。
  - 视觉对照：F23 browserRaw phone=true，figmaScreenshots=0，comparisonImages=0。
- **分类理由**：
  1. 静态候选已覆盖核心 motion（app.route.pop / app.route.push），无视觉缺口。
  2. 7 个 group（应用名称 / 开发者 / 官网 / 核心团队 / 致谢 / 隐私政策 / 用户协议）为信息展示型，无交互 motion 需求。
  3. 进入 VC1 之前仅需补齐全局稳定 ID / crosswalk，不需要 Reader-UI 先修或 Figma 修改。
- **未完成项**：全局 controlId / crosswalk、about-version push 焦点归宿、compact / tablet 视口。

### 2.12 F24-restore-preview — 保持

- **对象**：`restore-preview` route，runtimeFamily=sync。
- **原始证据**：
  - family-manifest.json F24。
  - browser-structure-observations.json L2087-L2209（phone）、L4521-L4644（compact）、L6955-L7078（tablet），三视口齐备，phone 3 button。
  - IC0：sync family 113 semantic controls（含 restore-preview）。
  - Motion：F24-T01 / F24-T02，motionRegistered=true，motion 覆盖率 100%（3/3 button 均带 data-motion-id）。motionIdsObserved=[`app.route.pop`, `app.route.push`]。
  - 视觉对照：F24 browserRaw 三视口齐备，figmaScreenshots=0，comparisonImages=0。
- **分类理由**：
  1. motion 覆盖率 100%，三视口齐备，宽屏结构（routeLayout=wide-workspace）已是目标形态。
  2. 3 button 路径清晰（返回 / 上一步 → restore-scopes / 开始恢复 → restore-progress）。
  3. 进入 VC1 之前仅需补齐全局稳定 ID / crosswalk，不需要 Reader-UI 先修或 Figma 修改。
- **未完成项**：全局 controlId / crosswalk、push 焦点归宿、Figma 截图、compact / tablet motion 等价验证。

## 3. 分类变更说明

无变更。12 族推荐分类与预分类一致（**待用户确认后方可称为"最终分类"**）：

- **保持 2**：F23-about、F24-restore-preview。
- **Codex 修复 1**：F22-source-switch。
- **两阶段 9**：F13-source-management、F14-webdav-config、F15-sync-backup、F16-search-results、F17-bookshelf、F18-book-detail、F19-import-conflict-resolve、F20-discover、F21-rss。
- **Figma 修改 0**：无证据支持。

## 4. 全局缺口与限制

1. **IC0 仍因 3,815 / 3,815 controls 缺稳定 join key 未通过**。本推荐分类不解决 IC0 问题；所有 12 族在 A2 冻结稳定 ID 后需要重新跑 IC0 门禁。
2. **Figma 截图全部缺失**：12 族均未在 `docs/audits/vc0-batch-2026-07-19/evidence/` 下采集 Figma 静态截图，无法做同尺寸 Figma / Browser 对照。Figma 端 Node ID 已在 family-manifest.json 登记，但未导出为 PNG。
3. **comparison 图全部缺失**：因 Figma 截图缺失，12 族 0 张同尺寸 comparison 图可生成；不伪造。
4. **after / focus / console / 稳定终态全部缺失**：未启动浏览器自动化，interaction-traces.json 中 12 族 23 个 trace 的动态字段一律标记为 missing-needs-browser-automation。
5. **compact / tablet 视口 DOM 部分缺失**：仅 F17-bookshelf / F22-source-switch / F24-restore-preview 三族三视口齐备，其余 9 族仅 phone 视口。
6. **motionReduced=1 模式采集**：所有 DOM 观测在 motionReduced=1 模式下采集，未在 motionReduced=0 下做对比，无法判断 motionReduced=1 是否掩盖了动效缺陷。
7. **本推荐分类不替代 R3a / VC3-R3b**：每个族在**用户确认推荐分类后**仍需依次完成 R3a（Figma 前功能验证，含视觉对照与本地 handoff packet）→ VC3-R3b（Figma 回写后的最终浏览器验证）。A0 之前的 "VC1 / VC2 / VC3" 命名已统一为 R3a / VC3-R3b（见 `tools/interaction-inventory/MIGRATION_REPORT.md` §16.1）。

## 5. 退出条件检查

| 退出条件 | 状态 | 证据 |
| --- | --- | --- |
| 24 族 manifest | 完成 | `generated/family-manifest.json`（24 族，F01-F24） |
| 12 族事实 | 完成 | `generated/visual-comparison-manifest.json` + `generated/browser-structure-observations.json` + `generated/interaction-traces.json` |
| 推荐分类（待用户确认） | 完成 | 本文件 `final-classification.md`（A1 推荐分类，待用户确认后方可称为"最终分类"并进入 R3a / VC3-R3b） |
| 证据 hash | 完成 | `artifact-hashes.json`（见同目录） |
| 证据限制 | 完成 | 本文件第 4 节 + 各 generated JSON 的 limitations / globalMissing 字段 |
| IC0 状态 | 仍失败 | 3,815 / 3,815 controls 缺稳定 join key（`docs/audits/ic0-2026-07-19/generated/interaction-control-coverage.json` byJoinStatus） |
| JSON 合法 | 待验证 | 任务 6 / 任务 8 验证 |
| hash 可重算 | 待验证 | 任务 6 / 任务 8 验证 |
| git diff --check | 待验证 | 任务 8 验证 |

## 6. 引用文件清单

- `docs/audits/vc0-batch-2026-07-19/generated/family-manifest.json`
- `docs/audits/vc0-batch-2026-07-19/generated/visual-comparison-manifest.json`
- `docs/audits/vc0-batch-2026-07-19/generated/browser-structure-observations.json`
- `docs/audits/vc0-batch-2026-07-19/generated/interaction-traces.json`
- `docs/audits/ic0-2026-07-19/generated/interaction-control-coverage.json`
- `docs/audits/ic0-2026-07-19/settings-general-browser-observation.json`
- `docs/audits/ic0-2026-07-19/SETTINGS_GENERAL_VC0_SAMPLE.md`
- `docs/design/FIGMA_HANDOFF_STATUS_2026-07-12.md`
- `docs/READER_MULTI_AGENT_EXECUTION_GUIDE_2026-07-19.md`
- `docs/READER_PRODUCT_EXECUTION_BASELINE_2026-07-19.md`
