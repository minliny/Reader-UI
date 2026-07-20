# R1.1 · 三层身份分离 — 迁移报告（R1 基线之上增量）

状态：R1.1 三层身份模型已落地（entityKey / controlKey / controlId）；3,752 个 DOM occurrence 共享 414 个 entityKey 与 2,114 个 controlKey；碰撞 fail-closed；ajv 真实校验 3,752/3,752 valid；drift test 25 (R1) + 9 (R1.1) = 34/34 pass
日期：2026-07-20（R1.1 增量，基线 commit `9f7a0f5`，R1 → R1.1）
工作包：R1.1 · 三层身份分离（在 R1 修复之上引入 entityKey / controlKey 逻辑层）
对账报告：[DENOMINATOR_RECONCILIATION.md](./DENOMINATOR_RECONCILIATION.md)

> 本报告在 R1 报告之上以增量方式记录 R1.1 的设计与产出。下方所有 R1 章节（1～9）保留为历史记录，仅反映 R1 基线状态。R1.1 的设计、产出、退出条件见新增的 **§0 R1.1 三层身份模型** 与 **§10 R1.1 退出条件**。

## 0. R1.1 三层身份模型（新增）

### 0.1 动机

R1 把 `controlId` 当作逻辑身份，但 `controlId` 的 hash 输入含 `selector` / `candidateKey` / `label` / `variantId` / `domTag` / `semanticStatus` 等 DOM occurrence 因素，导致：

1. 响应式 DOM 位置变化 → selector 变 → controlId 漂移。
2. 文案国际化（label 变化） → controlId 漂移。
3. 状态切换（state 变化） → controlId 漂移，但其实是同一逻辑控件。
4. 同一逻辑控件跨视口（Phone / Compact / Tablet / Fold）出现时，R1 通过"controlId 不含 viewport"做了正确合并，但跨 route/state 出现时无合并机制。
5. IC0 把 3,752 个 DOM occurrence 全部当作 3,752 个逻辑控件；同逻辑控件跨状态/视口复用时应共享 ID。
6. 63 个 `group` / `section` 分类结论原本一刀切——17 个 `section` 确为纯状态容器，但 46 个 `group` 是设置行（`fd-setting-row` + `is-switch` / `is-select` / `is-segment` / `is-stepper`），承载了真实的 Switch / Select / SegmentedControl / Stepper 子控件，仅因 IC0 DOM walk 未枚举到这些运行时渲染的子控件而被排除。

### 0.2 三层身份定义

```
entityKey  = {domain}.{family}.{role}[.semantic-intent]
             仅依赖 domain / family / role / 语义 data-* 属性白名单
             跨 route / state / viewport 共享
             不含 selector / label / variantId / domTag / DOM order / candidateKey / viewport

controlKey = {entityKey}@{route}.{state}
             跨 viewport 共享
             同 entityKey 在同 (route, state) 的多个 DOM occurrence 共享同一 controlKey
             不含 ordinal、不含 viewport

controlId  = {domain}.{family}.{route}.{state}.{role}[.discriminator]
             保留 R1 语义：DOM occurrence 追踪 ID
             仍含 hash(selector+variantId+...)，仅用于审计可重算与 DOM 追踪
             不是逻辑身份
```

### 0.3 semantic-intent 提取规则

`semantic-intent` 仅从 `CONTROL_ID_PRIORITY_DATA_ATTRIBUTES` 白名单中提取：

- 白名单为稳定 data-* 属性（例如 `data-top-action` / `data-reader-action` / `data-settings-key` 等）。
- **不含** `selector` / `label` / `variantId` / `domTag` / `semanticStatus`。
- 多个白名单属性按字母序拼接后 kebab-case 化。

### 0.4 碰撞 fail-closed

- `assertEntityKeyNoCollision(candidateControls)` 在生成期验证：两个 (domain, family, role, semantic-intent) 签名不同的控件不得映射到同一 `entityKey`。
- 一旦碰撞，生成器抛错；**不允许静默合并**。
- `controlKey` 共享模式：同 `entityKey` 在同 (route, state) 的多个 DOM occurrence 共享一个 `controlKey`；per-occurrence 区分由 `controlId` 负责。

### 0.5 46 个设置行子控件标记

`nonInteractiveContainers.json` 的每个 entry 新增三个字段：

- `suspectedReasons?: string[]` — 来自 IC0 audit 的疑似原因快照。
- `containsUnenumeratedSubcontrols?: boolean` — 当 group 是设置行（`fd-setting-row` + `is-switch` / `is-select` / `is-segment` / `is-stepper`）时为 true。
- `expectedSubcontrolType?: "switch" | "select" | "segment" | "stepper"` — 从设置行 control class 派生。
- `pureContainer?: boolean` — 当 container 是纯 ARIA section（不含子控件）时为 true。

实测分布：
- `containsUnenumeratedSubcontrols = true`：46 条（switch 28 / select 15 / stepper 2 / segment 1）。
- `pureContainer = true`：17 条（全部 section）。
- 合计 63 条，覆盖全部 `nonInteractiveContainers` 记录。

R2.0 必须把这 46 个设置行的运行时子控件枚举进 canonical registry，并赋予独立 entityKey / controlKey / controlId。

### 0.6 R1.1 产出清单（在 R1 产出之上增量）

| 路径 | 变更 |
| --- | --- |
| `contracts/control-identity.schema.json` | 新增 `entityKey` / `controlKey` required 字段；保持 `additionalProperties:false` |
| `contracts/control-identity.types.ts` | `ControlIdentity` 新增 `entityKey` / `controlKey`；`ControlIdRegistry.totals` 新增 `uniqueEntityKeys` / `uniqueControlKeys`；`NonInteractiveContainerEntry` 新增 `suspectedReasons` / `containsUnenumeratedSubcontrols` / `expectedSubcontrolType` / `pureContainer` |
| `tools/interaction-inventory/interaction-inventory-lib.mjs` | 新增 `buildEntityKey` / `buildControlKey` / `assertEntityKeyNoCollision`；`buildControlIdForCandidate` 返回 `entityKey` / `controlKey`；`buildRegistryEntry` / `buildNonInteractiveContainers` / `buildFigmaCrosswalkPending` / `buildDomIdentityMap` / `buildScreenGraphBindingArtifacts` 全部携带新字段；`validateControlIdRegistry` 新增模式校验、required 校验、不变式 `uniqueEntityKeys <= uniqueControlKeys <= uniqueControlIds` 校验 |
| `tools/interaction-inventory/codegen-control-ids.mjs` | 新增导出 `ENTITY_KEY_LOOKUP` / `ENTITY_KEY_SET` / `CONTROL_KEY_LOOKUP` / `CONTROL_KEY_SET` / `CONTROL_ID_REGISTRY_UNIQUE_ENTITY_KEYS` / `CONTROL_ID_REGISTRY_UNIQUE_CONTROL_KEYS` / `getEntriesByEntityKey` / `isKnownEntityKey` / `getEntriesByControlKey` / `isKnownControlKey`；所有产物 entry 含 `entityKey` / `controlKey` |
| `tools/interaction-inventory/generated/*.json` 与 `*.generated.ts` | 重新生成；3,752 entries，414 unique entityKeys，2,114 unique controlKeys，3,752 unique controlIds |
| `tools/interaction-inventory/generated/nonInteractiveContainers.json` | 63 entries：46 containsUnenumeratedSubcontrols + 17 pureContainer |
| `tools/interaction-inventory/tests/control-identity-drift.test.mjs` | 新增 9 项 R1.1 drift test（见 §10） |
| `src/control-identity/dom-identity.ts` | 新增 `DATA_ENTITY_KEY_ATTRIBUTE` / `DATA_CONTROL_KEY_ATTRIBUTE` 常量；新增 `setDataEntityKey` / `getDataEntityKey` / `setDataControlKey` / `getDataControlKey` / `querySelectorForEntityKey` / `querySelectorForControlKey` / `resolveAllByEntityKey` / `resolveAllByControlKey` |
| `src/control-identity/control-id-resolver.ts` | `ControlIdResolverEntry` 新增 `entityKey` / `controlKey` 字段；`ControlIdResolver` 新增 `resolveByEntityKey` / `resolveByControlKey` / `resolveByControlKeyAndViewport`；`createControlIdResolver` 校验 `(controlKey, viewport)` 唯一性；新增 `queryElementsByEntityKey` / `queryElementsByControlKey` |
| `src/control-identity/index.ts` | 导出全部 R1.1 API |


## 1. 完成层级与原始证据

| 对象 | 层级 | 原始证据 | 未完成项 |
| --- | --- | --- | --- |
| Canonical controlId schema | 合同冻结（R1 修复） | `contracts/control-identity.schema.json`、`contracts/control-identity.types.ts` | Figma node 绑定字段待回填 |
| 3,752 交互控件稳定身份 | 本地代码候选 | `tools/interaction-inventory/generated/control-id-registry.json`（3,752 条目，3,752 唯一 ID） | 1,479 ambiguous 仍需人工映射 |
| 63 非交互容器记录 | 本地代码候选 | `tools/interaction-inventory/generated/nonInteractiveContainers.json`（63 条目，46 group + 17 section） | 全部 `exclusionReason="aria-container-role"`；如未来确认含可交互控件需手动提升 |
| ScreenGraph binding | 本地代码候选 | `tools/interaction-inventory/generated/screengraph-binding.json`（66 bound / 1,052 unresolved / 2,634 pending-figma-join） | 3,686 / 3,752 候选无确定性 ScreenGraph 绑定 |
| DOM identity 基础设施 | 本地代码候选 | `src/control-identity/{dom-identity,control-id-resolver,index}.ts`（R1：`data-control-id` 逻辑身份 + `data-viewport` 实例属性） | 现有页面 renderer 未消费 `data-control-id`（R2 范围） |
| Codegen | 本地代码候选 | `tools/interaction-inventory/generated/control-identity.generated.ts`、`control-dom-selectors.generated.json`、`screengraph-binding.generated.json` | 三端 native codegen 暂未消费 |
| Drift test | 自动化通过 | `tools/interaction-inventory/tests/control-identity-drift.test.mjs`（25/25 pass，含 ajv 真实校验 + 4 类负向测试） | — |
| Figma crosswalk | 待回填 | `tools/interaction-inventory/generated/figma-crosswalk-pending.json`（3,752 pending，controlId 已是逻辑身份） | 全部 Figma node 候选为 null |

R1 工作包不修改页面视觉、业务行为、Motion、三端代码、Figma 或 docs/audits/，因此未升级到"浏览器已验证"或更高状态。R2 时 canonical renderer 才接入 `data-control-id` 基础设施。

## 2. 输入分母（R1 重新核定）

| 分母 | 当前值 | 来源 |
| --- | ---: | --- |
| IC0 候选总数 | 3,815 | `docs/audits/ic0-2026-07-07-19/generated/interaction-control-inventory.json` |
| IC0 语义控件 | 3,752 | 同上 `semanticControls` |
| IC0 疑似非语义控件 | 63 | 同上 `suspectedNonSemanticControls`（R1 核查证实全部为 group/section 容器） |
| Canonical registry candidates | 3,752 | `tools/interaction-inventory/generated/control-id-registry.json`（仅交互控件） |
| nonInteractiveContainers entries | 63 | `tools/interaction-inventory/generated/nonInteractiveContainers.json` |
| 唯一 controlId 产出 | 3,752 | A2 registry `totals.uniqueControlIds`（1:1 候选→身份） |
| 唯一 selectorSha256 | 1,607 | registry `source.selectorSha256` 唯一化 |
| Canonical routes 覆盖 | 260 | `ui-spec/screen-graph.json` |
| ScreenGraph component instances | 615 | 同上 |
| Inventory SHA-256 | `df7a7a177ec5286b8d3f7e33df55244263716e3862af208a3eff1a75779a033e` | R1 registry `generatedFrom.inventorySha256` |
| ScreenGraph SHA-256 | `159f5434ecd5ee919588db23fa70d5fe8fbc62d9f079000bcb23b3f99e499d1b` | 同上 |

**分母推导（1:1 invariant）**：

```
IC0 inventory (3,815) = semanticControls (3,752) + suspectedNonSemanticControls (63, 全部 group/section)
                      ↓                              ↓
                      ↓                              └──> nonInteractiveContainers.json (63, 1:1)
                      └──> control-id-registry.json (3,752, 1:1)
```

drift test "R1 denominator: registry + nonInteractiveContainers = IC0 inventory total" 强制保持 `3,752 + 63 === 3,815`。

## 3. controlId 命名规则（R1 重新设计）

```
controlId (logical)  = {domain}.{family}.{route}.{state}.{role}[.discriminator]
viewport instance    = entry.viewport  ∈ {phone, compact, tablet, fold}
```

R1 关键变更：**controlId 不含 viewport**。Phone / Compact / Tablet / Fold 同一逻辑控件共享同一 `controlId`；viewport 作为 entry 的独立字段记录实例所属视口。

- `domain`：12 个产品域（与 `runtimeFamily` 一致）：`discover`、`import`、`library`、`onboarding`、`reader`、`rss`、`settings`、`source`、`source-switch`、`sync`、`system`、`web-auth`。
- `family`：从 DOM tag + ARIA role + class hints 派生的组件族（19 个枚举）：`button`、`icon-button`、`link`、`switch`、`checkbox`、`radio`、`slider`、`textbox`、`searchbox`、`combobox`、`option`、`tab`、`menuitem`、`menuitemcheckbox`、`menuitemradio`、`summary`、`listrow-action`、`treeitem`、`generic-button`。
- `route`：ScreenGraph routeId（kebab-case，260 个枚举）。
- `state`：variant pageState（kebab-case）。
- `role`：ARIA role 或 tag-derived role（kebab-case）。**R1：排除 `group` / `section` 等 ARIA 容器角色**。
- `discriminator`：单 atom 稳定判别符。
  - 当存在语义 data-* 属性时：`{slug}-h-{hash8}`，例如 `top-action-search-h-1c0d0896`。
  - 当无语义 data-* 时：`h-{hash8}`，例如 `h-1c0d0896`。
  - `hash8` = `sha256(candidateKey|routeId|variantId|selector|domTag|role|label|dataAttributes)` 的前 8 个 hex 字符，保证零重复。

示例（R1 修复后，不含 viewport）：

```
library.button.bookshelf.default.button.top-action-search-h-1c0d0896
reader.icon-button.reader.default.button.reader-exit-h-3a2b1c0d
settings.switch.settings-general.default.switch.toggle-h-7e8f9a0b
```

## 4. 候选映射分类（R1 修复后）

| mappingStatus | 数量 | 含义 | 下一 owner |
| --- | ---: | --- | --- |
| `auto-mapped` | 2,273 | 有 canonical UiEvent 或绑定到 ScreenGraph component instance | 可直接进入 R2 实现 |
| `ambiguous-needs-review` | 1,479 | 无 UiEvent 且无确定性 ScreenGraph 绑定；可能是导航 chrome、装饰性控件、重复控件或 IC0 UiEvent 解析缺口 | 需 Reader-UI owner 人工分类 |
| `needs-manual-mapping` | 0 | R1：63 个原 `needs-manual-mapping` 候选全部为 ARIA 容器（group/section），已移到 `nonInteractiveContainers.json` | — |

### 4.1 需 ambiguous-review 的 1,479 个候选

这些候选有 IC0 标记的 semanticStatus=semantic-control，但缺少：
- canonical UiEvent（`source.uiEvent === null`），且
- ScreenGraph component instance 绑定（`screenGraphBinding.bindingStatus !== "bound"`）。

典型样本：

```
library.button.bookshelf.default.button.top-action-search-h-1c0d0896   label="搜索"   data-top-action="search"
library.button.bookshelf.default.button.top-action-more-h-5fd7b61f     label="更多"   data-top-action="more"
library.button.bookshelf.default.button.h-9853c162                    label="封面视图" data-bookshelf-view-button="cover"
library.button.bookshelf.default.button.h-5e688a2b                    label="书架筛选：全部，最近更新，全部" data-bookshelf-filter-toggle=""
```

判定方向：
- 大多数是页面级 chrome 控件（顶栏按钮、视图切换、筛选触发），UiEvent 已在 `data-*` 中暗含但未在 IC0 解析为 canonical UiEvent。
- R2 实现 Renderer 时应同时：(1) 设置 `data-control-id`（逻辑身份） + `data-viewport`；(2) 解析为 canonical UiEvent 并写入 `data-ui-event`。
- 无法确定业务动作的控件应显式 disabled / inert / fail-closed，不可"看似可点但无行为"。

### 4.2 63 个非交互容器（R1 新增记录）

R1 把 63 个 ARIA 容器候选从 canonical registry 移到 `nonInteractiveContainers.json`。分布在 24 个 route：

```
backup-settings, bookshelf-search-settings, import-conflict-resolve, import-duplicate,
import-empty-file, import-format-unsupported, import-parsing, import-partial-success,
import-permission-denied, import-result-detail, progress-sync, reader-background-restore,
reader-content-error, reader-content-loading, reader-content-offline,
reader-page-boundary-first, reader-page-boundary-last, reader-toc-error,
reader-toc-loading, reader-toc-offline, settings-general, source-debug,
source-management, webdav-config
```

主要类别：
- `group` (46) / `section` (17) 容器：ARIA 容器角色，不是可交互控件，不应进入控件身份命名空间。
- 如未来确认其中部分容器实际承担可交互职责（例如 `settings-general` 的 `is-switch` / `is-select` row），需要 B1 升级为原生 Switch / Select / SegmentedControl 语义，再从 `nonInteractiveContainers.json` 提升回 canonical registry。

## 5. ScreenGraph binding 状态（R1 修复后）

| bindingStatus | 数量 | 含义 |
| --- | ---: | --- |
| `bound` | 66 | 候选与 ScreenGraph component instance 建立确定性绑定（UiEvent match / props.uiEvent match / label match） |
| `unresolved` | 1,052 | 候选所在 route/variant 在 ScreenGraph 中无 component instance（多为 alias route 或 ScreenGraph 未展开的 variant） |
| `pending-figma-join` | 2,634 | 候选所在 case 有 ScreenGraph component，但无确定性匹配；需要 Figma node 或人工 review 提供稳定 join key |

### 5.1 绑定启发式（顺序）

1. **Strong**：`control.uiEvent === component.bindings[].event` → `bindingReason="ui-event-binding-match"`
2. **Weak (props)**：`control.uiEvent === component.props.uiEvent` → `bindingReason="props-ui-event-match"`
3. **Weak (data-ui-event)**：`control.dataAttributes["data-ui-event"] === component.props.uiEvent` → `bindingReason="data-ui-event-props-match"`
4. **Weak (label)**：`control.label ∈ {component.props.action, .title, .label, .text}` → `bindingReason="label-match"`
5. **Fallback**：`pending-figma-join`，`bindingReason="no-deterministic-match-needs-review"`

绑定启发式只产出候选；不作为最终 join。Figma join key 缺失时，所有 binding 都保持 pending-figma-join 或 unresolved。

### 5.2 Bound 样本

```
library.button.bookshelf.default.button.nav-type-bookshelf-h-65129732
  -> AppTopBar / bookshelf-topbar | uiEvent: tab.item.select
library.button.bookshelf-empty.shelf-empty.button.nav-type-bookshelf-h-cc14b0b3
  -> AppTopBar / app-topbar | uiEvent: tab.item.select
```

## 6. Figma crosswalk（全部 pending，controlId 为逻辑身份）

`tools/interaction-inventory/generated/figma-crosswalk-pending.json` 包含 3,752 个条目，每条：

```json
{
  "controlId": "library.button.bookshelf.default.button.route-immersive-reading-h-d8c8f2fd",
  "candidateKey": "candidate:...",
  "routeId": "bookshelf",
  "state": "default",
  "viewport": "phone",
  "role": "button",
  "family": "button",
  "label": "阅读",
  "uiEvent": "route.push",
  "figmaNodeCandidate": null,
  "figmaJoinStatus": "pending-figma-join",
  "status": "pending-figma-join"
}
```

所有 `figmaNodeCandidate` 字段保持 null；所有 `figmaJoinStatus` / `status` 为 `pending-figma-join`。R1 不伪造 Figma node 绑定。

R1 关键变更：`controlId` 已是逻辑身份（不含 viewport）。Figma node 绑定按逻辑身份回填，Phone / Compact / Tablet / Fold 共享同一条 Figma 绑定。

回填规则：
1. Figma writer 在 Figma 文件中为每个 canonical component 实例标注稳定的 `nodeId`（或导出 `node-id → page-family → route → role` 映射）。
2. 由 Reader-UI owner 通过 `figma-crosswalk-pending.json` 的 `controlId`（逻辑身份）字段回填 `figmaNodeCandidate`。
3. 回填完成后，运行 `node tools/interaction-inventory/generate-control-ids.mjs --write` 重新生成 registry，并将 `figmaJoinStatus` 改为 `joined`。

## 7. 产出文件清单（R1 修复后）

### 7.1 合同（contracts/）

- `contracts/control-identity.schema.json` — JSON Schema，R1 重新设计：controlId 5-7 atoms（无 viewport）；viewport 独立字段；`additionalProperties:false` 严格执行；新增 `nonInteractiveContainer` 标记字段；role enum 不含 group/section。
- `contracts/control-identity.types.ts` — TypeScript 类型，与 schema 对齐。`ControlIdRegistryEntry` 不再含 `firstMaterializedAt` / `schemaVersion`；新增 `NonInteractiveContainerEntry` / `NonInteractiveContainers` 类型。

### 7.2 工具（tools/interaction-inventory/）

- `tools/interaction-inventory/interaction-inventory-lib.mjs` — R1 修复：`buildControlIdForCandidate` 不含 viewport；`buildRegistryEntry` 移除 `firstMaterializedAt` / `schemaVersion`；`buildControlIdRegistry` 过滤 group/section；新增 `buildNonInteractiveContainers`；`validateControlIdRegistry` 校验新分母 + 容器排除 + 字段移除。
- `tools/interaction-inventory/generate-control-ids.mjs` — 生成器 CLI（`--write` / `--check`），日志含 `nonInteractiveContainers` 计数。
- `tools/interaction-inventory/validate-control-ids.mjs` — 验证器 CLI（`--check` / `--report`）。
- `tools/interaction-inventory/codegen-control-ids.mjs` — codegen CLI（`--write` / `--check`）。
- `tools/interaction-inventory/control-identity-schema-validator.mjs` — **R1 新增**：ajv 真实 schema 校验 helper，提供 `compileEntryValidator` / `validateEntry` / `validateEntries`。
- `tools/interaction-inventory/package.json` — **R1 新增**：声明 `ajv` / `ajv-formats` 依赖。
- `tools/interaction-inventory/MIGRATION_REPORT.md` — 本报告（R1 修复版）。
- `tools/interaction-inventory/DENOMINATOR_RECONCILIATION.md` — **R1 新增**：分母对账报告。

### 7.3 测试

- `tools/interaction-inventory/tests/control-identity-drift.test.mjs` — R1 重写：25 项 drift test，覆盖零重复、零缺失、可重算、DOM selector 唯一性、Figma join 完整性、ajv 真实校验、4 类负向测试、分母对账、容器排除、字段移除。
- `tools/interaction-inventory/tests/interaction-inventory.test.mjs` — 现有 IC0 测试，仍 10/10 通过（追加未破坏）。

### 7.4 生成物（tools/interaction-inventory/generated/）

- `control-id-registry.json` — 3,752 entries，canonical controlId registry（R1：不含 viewport / firstMaterializedAt / schemaVersion）。
- `screengraph-binding.json` — 3,752 entries，ScreenGraph component instance binding。
- `figma-crosswalk-pending.json` — 3,752 entries，Figma node 待回填（controlId 为逻辑身份）。
- `dom-identity-map.json` — 3,752 entries，DOM selector → data-control-id 映射（data-control-id 为逻辑身份）。
- `nonInteractiveContainers.json` — **R1 新增**：63 entries，ARIA 容器候选记录（46 group + 17 section）。
- `control-identity.generated.ts` — TypeScript 模块，导出 `CONTROL_ID_ENTRIES`、`CONTROL_ID_LOOKUP`、`CONTROL_ID_SET`。
- `control-dom-selectors.generated.json` — DOM selector 映射，按 route 分组。
- `screengraph-binding.generated.json` — ScreenGraph binding 映射，按 controlId 排序。

### 7.5 DOM identity 基础设施（src/control-identity/）

- `src/control-identity/dom-identity.ts` — R1 重新设计：`DATA_CONTROL_ID_ATTRIBUTE`（逻辑身份） + `DATA_VIEWPORT_ATTRIBUTE`（实例视口）；新增 `setDataViewport` / `getDataViewport` / `querySelectorForControlIdAndViewport` / `resolveControlIdAndViewport`；`isValidControlIdFormat` 改为 5-7 atoms；`ParsedControlId` 不含 viewport；`composeControlId` 不含 viewport。
- `src/control-identity/control-id-resolver.ts` — R1 修复：`ControlIdResolver` 新增 `resolveByControlIdAndViewport` / `resolveByElementAndViewport`；`createControlIdResolver` 用 `(controlId, viewport)` 复合键去重；新增 `queryElementByControlIdAndViewport`。
- `src/control-identity/index.ts` — 公共入口，re-export 全部 R1 API + 新增 `NonInteractiveContainerEntry` / `NonInteractiveContainers` 类型。

## 8. 退出条件验证（R1 修复后）

| 退出条件 | 状态 | 证据 |
| --- | --- | --- |
| 所有 registry 记录 Schema 合法（ajv 真实校验，0 invalid） | 通过 | drift test "R1 ajv schema validation: all registry entries pass real JSON Schema validation" pass；3,752 / 3,752 valid |
| 分母可解释（3,752 + 63 = 3,815） | 通过 | drift test "R1 denominator" pass；DENOMINATOR_RECONCILIATION.md |
| canonical renderer 实际消费（基础设施就绪） | 部分通过 | `src/control-identity/` 基础设施更新，`data-control-id` 是逻辑身份；R2 时 canonical renderer 才接入 |
| 无伪造 Figma join | 通过 | 3,752 / 3,752 entries `figmaJoinStatus="pending-figma-join"`；drift test "R1 Figma crosswalk is fully pending" pass |
| 真实 Schema 负向测试（4 类全过） | 通过 | drift test "R1 ajv negative: extra field" / "role not in enum" / "controlId pattern mismatch" / "missing required field" 全部 pass |
| drift test 全过（含真实 ajv + 负向测试） | 通过 | 25 / 25 pass |
| 字节稳定 | 通过 | `generate-control-ids.mjs --check` pass；`codegen-control-ids.mjs --check` pass |
| 零重复 controlId | 通过 | drift test "R1 control identity produces zero duplicate controlIds" pass |
| 零缺失（3,752 交互控件全覆盖） | 通过 | drift test "R1 registry covers every IC0 semantic control with zero missing" pass |
| 可重算 | 通过 | drift test "R1 control identity is reproducible" pass |
| 不含 per-entry firstMaterializedAt / schemaVersion | 通过 | drift test "R1 no per-entry firstMaterializedAt or schemaVersion" pass |
| 63 个 group/section 移到 nonInteractiveContainers.json | 通过 | drift test "R1 nonInteractiveContainers contains exactly the group/section candidates" pass |

## 9. 后续工作包消费指南

### R2（canonical renderer 接入）

1. 消费 `contracts/control-identity.types.ts` 中的类型。
2. 从 `tools/interaction-inventory/generated/control-identity.generated.ts` 导入 `CONTROL_ID_LOOKUP`。
3. 在每个 interactive control 的根 element 上同时调用：
   - `setDataControlId(element, logicalControlId)` — 逻辑身份
   - `setDataViewport(element, viewport)` — 实例视口
4. 测试中通过 `querySelectorForControlId(controlId)` 或 `querySelectorForControlIdAndViewport(controlId, viewport)` 定位控件。
5. 不修改 R1 产出的 schema / lib / drift test；如发现 mapping 错误，向 R1 owner 反馈。

### Reader-UI owner（ambiguous-needs-review 处理）

1,479 个 ambiguous 候选需逐项确认：
- 是 chrome 控件 → 补 canonical UiEvent（写入 `data-ui-event`）。
- 是装饰性元素 → 移除 `tabindex` / `role` / `data-*`。
- 是重复控件 → 拆分或合并。
- 是 fail-closed 控件 → 显式 disabled / inert。

### Figma writer（figma-crosswalk 回填）

1. 在 Figma 中为每个 canonical component 实例添加稳定 `nodeId`。
2. 导出 `node-id → page-family → route → role` 映射。
3. 回填 `tools/interaction-inventory/generated/figma-crosswalk-pending.json` 的 `figmaNodeCandidate` 字段（按逻辑 controlId 回填，不需为每个 viewport 重复）。
4. 通知 Reader-UI owner 重新生成 registry。

## 10. 风险与限制

1. **viewport 当前仅 phone**：现有 IC0 inventory 在 VM 中以 390×844（Phone）渲染，所有 registry entry 的 `viewport === "phone"`。Compact / Tablet / Fold 视口需要 A1 VC0 批量审计扩展。R1 设计已保证：扩展时 Phone/Compact/Tablet 共享同一逻辑 controlId，不会分裂。
2. **componentType / componentInstanceId 在 IC0 inventory 中为 null**：R1 通过 ScreenGraph binding 启发式部分回填；66 / 3,752 候选获得 `bound`，其余需要 Figma join key 或人工 review。
3. **discriminator 包含 hash**：controlId 中包含 8 字符 hash，不影响人类可读性（前缀已包含 domain/family/route/state/role/slug），但意味着控件实现变化时 hash 会变。这是设计意图：controlId 应在控件结构稳定后冻结。
4. **现有页面 renderer 未消费 data-control-id**：R1 只提供基础设施，不修改页面视觉代码。R2 实现 Renderer 时需逐步接入。
5. **三端 native codegen 暂未消费**：R1 codegen 只产出 TypeScript / JSON；Swift / Kotlin / ArkTS 的 native codegen 接入由后续工作包完成。
6. **63 个 nonInteractiveContainer 仍需人工复核**：R1 默认全部 group/section 为非交互容器。如未来发现某些容器实际承担可交互职责（例如 `settings-general` 的 `is-switch` row），需要 B1 升级语义后从 `nonInteractiveContainers.json` 提升回 canonical registry。

## 11. 复算入口

```sh
# 重新生成 IC0 inventory（A1 范围，R1 消费）
node tools/interaction-inventory/generate-interaction-inventory.mjs --write

# 重新生成 R1 controlId registry + binding + figma crosswalk + dom identity + nonInteractiveContainers
node tools/interaction-inventory/generate-control-ids.mjs --write

# 重新生成 codegen artifacts
node tools/interaction-inventory/codegen-control-ids.mjs --write

# 验证字节稳定
node tools/interaction-inventory/generate-control-ids.mjs --check
node tools/interaction-inventory/codegen-control-ids.mjs --check
node tools/interaction-inventory/validate-control-ids.mjs

# 运行 drift test（含 ajv 真实校验 + 4 类负向测试）
cd tools/interaction-inventory && node --test tests/*.test.mjs
```

所有产出在相同输入下产生相同字节；`generatedAt` 字段固定为 A2 baseline `2026-07-19T00:00:00.000Z` 以保证可重算。R1 修复不改变 `generatedAt`，只改变 entry 结构与分母分布。


## 10. R1.1 退出条件验证（在 R1 §8 之上增量）

| 退出条件 | 状态 | 证据 |
| --- | --- | --- |
| entityKey 不依赖 DOM occurrence 因素（selector / label / variantId / domTag / candidateKey / DOM order） | 通过 | drift test "R1.1 entityKey does NOT depend on selector / label / variantId / domTag / DOM order" pass |
| controlKey 不依赖 viewport（Phone / Compact / Tablet / Fold 共享） | 通过 | drift test "R1.1 controlKey does NOT depend on viewport" pass |
| controlKey 不含 ordinal、不含 viewport 原子 | 通过 | drift test "R1.1 buildControlKey is a pure function of (entityKey, route, state)" pass |
| 同 entityKey 在同 (route, state) 的多个 DOM occurrence 共享 controlKey | 通过 | drift test "R1.1 controlKey groups multiple DOM occurrences of the same entity in (route, state)" pass |
| entityKey 碰撞 fail-closed（不同签名映射到同 entityKey 必须抛错） | 通过 | drift test "R1.1 entityKey collision is fail-closed" pass |
| 真实 IC0 inventory 零 entityKey 碰撞 | 通过 | drift test "R1.1 assertEntityKeyNoCollision passes on the real IC0 inventory" pass |
| Schema 合法（ajv 真实校验，全 3,752 entries 含 entityKey / controlKey 通过） | 通过 | drift test "R1.1 registry entries carry entityKey and controlKey on every entry" pass；drift test "R1.1 schema requires entityKey and controlKey (ajv real validation)" pass |
| Schema 负向（entityKey / controlKey pattern 不匹配、required 缺失均拒绝） | 通过 | drift test "R1.1 schema rejects malformed entityKey / controlKey patterns" pass |
| 分母可解释（uniqueEntityKeys < uniqueControlKeys < uniqueControlIds） | 通过 | drift test "R1.1 totals carry uniqueEntityKeys and uniqueControlKeys with monotonic invariant" pass；实测 414 < 2,114 < 3,752 |
| 46 个设置行子控件标记（containsUnenumeratedSubcontrols=true，含 expectedSubcontrolType） | 通过 | drift test "R1.1 nonInteractiveContainers marks 46 settings rows with un-enumerated subcontrols" pass；实测分布 switch 28 / select 15 / stepper 2 / segment 1 |
| 17 个 pureContainer 标记 | 通过 | drift test "R1.1 nonInteractiveContainers marks 46 settings rows" 中包含 17 pureContainer 断言 pass |
| DOM identity map / ScreenGraph binding / Figma crosswalk 全部携带 entityKey + controlKey | 通过 | drift test "R1.1 DOM identity map and ScreenGraph binding carry entityKey + controlKey on every entry" pass |
| 逻辑身份可重算（entityKey + controlKey + controlId 三层均字节稳定） | 通过 | drift test "R1.1 logical identity is reproducible from the same inventory input" pass |
| 字节稳定（生成器 `--check` 通过） | 通过 | `generate-control-ids.mjs --check` pass；`codegen-control-ids.mjs --check` pass |
| 无伪造 Figma join | 通过 | 3,752 / 3,752 entries `figmaJoinStatus="pending-figma-join"`（与 R1 一致） |
| drift test 全过（R1 25 项 + R1.1 9 项 = 34 项） | 通过 | 34 / 34 pass |

## 11. R1.1 三层身份数据快照

| 度量 | 当前值 | 来源 |
| --- | ---: | --- |
| 唯一 entityKey（逻辑控件实体） | 414 | `tools/interaction-inventory/generated/control-id-registry.json` `totals.uniqueEntityKeys` |
| 唯一 controlKey（route/state 出现） | 2,114 | 同上 `totals.uniqueControlKeys` |
| 唯一 controlId（DOM occurrence 追踪 ID） | 3,752 | 同上 `totals.uniqueControlIds` |
| containsUnenumeratedSubcontrols（设置行） | 46 | `nonInteractiveContainers.json` |
| pureContainer（纯 ARIA section） | 17 | 同上 |
| 非交互容器总数 | 63 | 同上（46 + 17 = 63，与 IC0 suspectedNonSemanticControls 一致） |
| IC0 候选总数 | 3,815 | `docs/audits/ic0-2026-07-19/generated/interaction-control-inventory.json`（3,752 + 63） |

### 11.1 不变式

```
uniqueEntityKeys (414) <= uniqueControlKeys (2,114) <= uniqueControlIds (3,752) <= IC0 (3,815)

3,815 IC0 = 3,752 canonical registry + 63 nonInteractiveContainers
          = 3,752 DOM occurrence + 46 设置行 + 17 纯 section

414 entityKey 折叠维度：domain × family × role × semantic-intent
2,114 controlKey 折叠维度：entityKey × route × state（不含 viewport、不含 ordinal）
3,752 controlId 折叠维度：domain × family × route × state × role × discriminator+hash8
```

## 12. R1.1 后续工作包消费指南（在 R1 §9 之上增量）

### R2.0（canonical renderer 接入三层身份）

1. 在每个 interactive control 的根 element 上同时调用：
   - `setDataEntityKey(element, entityKey)` — 逻辑实体（跨 route/state/viewport 共享）
   - `setDataControlKey(element, controlKey)` — route/state 出现（跨 viewport 共享）
   - `setDataControlId(element, controlId)` — DOM occurrence 追踪 ID（保留 R1 语义）
   - `setDataViewport(element, viewport)` — 实例视口
2. 从 `tools/interaction-inventory/generated/control-identity.generated.ts` 导入：
   - `ENTITY_KEY_LOOKUP` / `ENTITY_KEY_SET` / `getEntriesByEntityKey` / `isKnownEntityKey`
   - `CONTROL_KEY_LOOKUP` / `CONTROL_KEY_SET` / `getEntriesByControlKey` / `isKnownControlKey`
   - 保留 R1 的 `CONTROL_ID_LOOKUP` / `CONTROL_ID_SET` / `getControlIdEntry` / `isKnownControlId`
3. 枚举 46 个设置行（`containsUnenumeratedSubcontrols=true`）的运行时子控件：
   - 为每个子控件分配独立 `entityKey`（例如 `settings.switch.switch.toggle.<settings-key>`）。
   - 写入 `tools/interaction-inventory/generated/control-id-registry.json`。
   - 把对应 `nonInteractiveContainers` 条目升级为 `pureContainer=true` 或完全移除。
4. 测试中：
   - 跨 route/state/viewport 共享身份的断言用 `resolveByEntityKey(entityKey)`。
   - 单一 (route, state) 内跨 viewport 共享身份的断言用 `resolveByControlKey(controlKey)`。
   - 单一 DOM occurrence 追踪用 `resolveByControlId(controlId)`。

### Reader-UI owner（46 设置行子控件枚举）

R1.1 把 46 个 `group` 标记为 `containsUnenumeratedSubcontrols=true` 但**未**枚举其运行时子控件。owner 需：

1. 在 IC0 audit 的 DOM walk 中加入运行时渲染的 Switch / Select / SegmentedControl / Stepper 探测。
2. 为每个子控件分配 `entityKey` / `controlKey` / `controlId`。
3. 把这些子控件从 `nonInteractiveContainers.json` 移到 `control-id-registry.json`。
4. 重新运行 `generate-control-ids.mjs --write` + `codegen-control-ids.mjs --write`。


## 13. R2.0 · canonical renderer 共享前置（新增，2026-07-20）

状态：R2.0 canonical renderer 共享前置已落地；在 R1.1 三层身份（entityKey / controlKey / controlId）基础上，于 canonical renderer（`frontend-demo-optimized/`）补齐 UiEvent / controlKey / entityKey 声明，为 R2a / R2b 做准备。615 条 control identity 声明（569 registry-backed + 46 R2.0 subcontrols）；对账 7/7 pass；稳定性测试 12/12 pass；碰撞为零；不写 DOM 属性；不重构 renderer 行为。
基线 commit：`ac4740b`（R1.1 已完成）
工作包：R2.0 · canonical renderer 共享前置

### 13.1 动机

R1.1 完成了三层身份分离，但 canonical renderer（`frontend-demo-optimized/`）尚未消费三层身份：
1. D2 Settings 分发（`renderD2Route`）不接收 `options` / `pageState`，无法感知 loading / error 等 ViewState。
2. 12 个页面族（settings-general / source-management / webdav-config / sync-backup / bookshelf / book-detail / import-conflict-resolve / search-results / discover / rss / source-switch / about-restore-preview）的 control identity 声明分散在 registry 与 renderer 之间，缺中央对账。
3. 46 个设置行子控件（`containsUnenumeratedSubcontrols=true`，switch 28 / select 15 / stepper 2 / segment 1）在 IC0 DOM walk 中未枚举，R1.1 仅标记，未分配独立 entityKey / controlKey / controlId。
4. UiEvent / controlKey / entityKey 的稳定性不变式（selector 变化、label 变化、viewport 变化时身份不变）缺自动化测试守护。

R2.0 在不写 DOM 属性（R2b 范围）、不重构 renderer 行为（switch 仍是 `<span>`）的边界下，完成声明层与对账层。

### 13.2 R2.0 产出清单

| 路径 | 变更 |
| --- | --- |
| `frontend-demo-optimized/render-runtime.js` | D2-C 分发调用补传 `options` 参数（`renderD2Route(route, data, appState, options)`），让 D2-C 渲染的 settings / source / webdav / sync / restore / about 路由可感知 loading / error 等 ViewState |
| `frontend-demo-optimized/renderers/d2-settings-sync-renderers.js` | `renderD2Route` 签名补 `options` 第 4 参数，透传给底层 V2 renderer；底层 V2 函数签名保持 `(data, route, appState)`，`options` 作为第 4 参数不强制消费，留给 R2a / R2b 接入 ViewState 时使用 |
| `frontend-demo-optimized/RENDERER_STRUCTURE_AUDIT.md` | 新建（临时审计文档）：12 个 renderer 文件清单、`renderRoute` 分发顺序（W4→W3→W5→D2-A→D2-C→D3→D4→D5→D6→switch）、12 页面族归属、46 子控件分布 |
| `frontend-demo-optimized/control-identity-declarations.js` | 新建（R2.0 核心产物）：615 条 control identity 声明（569 registry-backed + 46 R2.0 subcontrols）；12 页面族映射表 `pageFamilies`；46 项 `route::label → slug` 复合键映射 `labelSlugMap`（避免跨 route 同名碰撞）；导出 `CANONICAL_CONTROL_DECLARATIONS` 与 `R2_DECLARATIONS_META`；CommonJS + `window.ReaderCanonicalControlDeclarations` 全局挂载 |
| `tools/interaction-inventory/reconcile-canonical-declarations.mjs` | 新建（对账工具）：7 项检查（entityKeyInRegistry / registryEntityKeyInDeclarations / controlKeyInRegistry / collisionDetection / uiEventInSchemaEnum / subcontrolCompleteness / r2SubcontrolsAreNew）；输出 `canonical-reconciliation.json`；碰撞检测区分 registry-backed（允许跨 route/state 共享 entityKey，label 可不同）与 R2.0 subcontrol（同 entityKey 不同 label 视为碰撞） |
| `tools/interaction-inventory/tests/canonical-identity-stability.test.mjs` | 新建（稳定性测试）：12 项测试，含 selector/label/viewport 稳定性、registry 对账、UiEvent enum、碰撞检测、46 子控件、12 页面族、模式合法、D2 options 修复、不写 DOM 属性、不重构行为 |
| `tools/interaction-inventory/generated/canonical-reconciliation.json` | 新建（对账报告）：7/7 pass，615 declarations（569 registry-backed + 46 R2.0 subcontrols） |
| `tools/interaction-inventory/MIGRATION_REPORT.md` | 增量：新增 §13 R2.0 章节 |

### 13.3 R2.0 度量与不变式

| 度量 | 当前值 | 来源 |
| --- | ---: | --- |
| control identity 声明总数 | 615 | `frontend-demo-optimized/control-identity-declarations.js` `R2_DECLARATIONS_META.totals.total` |
| registry-backed 声明 | 569 | 同上 `R2_DECLARATIONS_META.totals.registryBacked` |
| R2.0 subcontrol 声明 | 46 | 同上 `R2_DECLARATIONS_META.totals.r2Subcontrols` |
| R2.0 subcontrol 类型分布 | switch 28 / select 15 / stepper 2 / segment 1 | 同上 `R2_DECLARATIONS_META.totals.subcontrolsByType` |
| 覆盖页面族数 | 12 | 同上 `R2_DECLARATIONS_META.totals.pageFamilies` |
| entityKey 多次出现（registry-backed，跨 route/state 共享） | 4 | 同上 `R2_DECLARATIONS_META.collisionCheck.entityKeyMultiOccurrence` |
| entityKey 真实碰撞（同 entityKey 不同 label） | 0 | 同上 `R2_DECLARATIONS_META.collisionCheck.realCollisions` |
| controlKey 碰撞 | 0 | 同上 `R2_DECLARATIONS_META.collisionCheck.controlKeyCollisions` |

R2.0 不变式（在 R1.1 §11.1 之上增量）：

```
615 declarations = 569 registry-backed + 46 R2.0 subcontrols
46 R2.0 subcontrols = switch 28 + select 15 + stepper 2 + segment 1
12 page families 全部覆盖
entityKey 真实碰撞 = 0（同 entityKey 不同 label）
controlKey 碰撞 = 0（全局唯一）
UiEvent 非法 = 0（全部在 ui-event.schema.json enum）
```

### 13.4 R2.0 退出门槛验证

| # | 门槛 | 状态 | 原始证据 |
| --- | --- | --- | --- |
| 1 | D2 Settings 分发接收 options/pageState | ✅ pass | `render-runtime.js` 第 10757-10764 行 `renderD2Route(route, data, appState, options)`；`d2-settings-sync-renderers.js` 第 2069-2085 行 `function renderD2Route(route, data, appState, options)` |
| 2 | control identity 声明覆盖 12 页面族 | ✅ pass | 稳定性测试 Test 8 `R2.0 coverage: declarations cover 12 page families` pass；`canonical-reconciliation.json` `totals.pageFamilyRoutes = 12` |
| 3 | 46 个设置行子控件枚举 | ✅ pass | 稳定性测试 Test 7 `R2.0 completeness: 46 settings row subcontrols all declared` pass；`canonical-reconciliation.json` `checks.subcontrolCompleteness.status = pass` |
| 4 | 中央重生成对账 | ✅ pass | `node tools/interaction-inventory/reconcile-canonical-declarations.mjs` 退出码 0；7/7 pass |
| 5 | 目标域碰撞为零 | ✅ pass | `canonical-reconciliation.json` `checks.collisionDetection.status = pass`；R2.0 subcontrol entityKey 碰撞 0，controlKey 碰撞 0 |
| 6 | UiEvent 在 Schema enum | ✅ pass | 稳定性测试 Test 5 pass；`canonical-reconciliation.json` `checks.uiEventInSchemaEnum.status = pass` |
| 7 | 稳定性测试全过 | ✅ pass | `node --test tools/interaction-inventory/tests/canonical-identity-stability.test.mjs` 12/12 pass |
| 8 | 不写 data-control-id | ✅ pass | 稳定性测试 Test 11 `R2.0 boundary: declarations do not write data-control-id to HTML` pass；`control-identity-declarations.js` 源码无 `data-control-id=` / `data-entity-key=` / `data-control-key=` |
| 9 | 不重构行为 | ✅ pass | 稳定性测试 Test 12 `R2.0 boundary: d2Switch still renders span` pass；`d2Switch` 仍渲染 `<span class="fd-settings-switch">`，未补 `role="switch"` |

### 13.5 R2.0 严格禁止项遵守

| 禁止项 | 遵守状态 | 证据 |
| --- | --- | --- |
| 写 data-control-id / data-entity-key / data-control-key 到渲染输出 HTML | ✅ 未违反 | Test 11 pass；declarations 文件不含 DOM 属性写入逻辑 |
| 重构 renderer 行为（switch → role=switch，segment/stepper 补事件） | ✅ 未违反 | Test 12 pass；`d2Switch` / `d2Segment` / `d2Stepper` 实现未变 |
| 修改 frontend-demo-next/（实验目录） | ✅ 未违反 | 无文件变更 |
| 修改 docs/audits/ | ✅ 未违反 | 无文件变更 |
| 修改 contracts/control-identity.schema.json（R1.1 冻结） | ✅ 未违反 | 无文件变更 |
| 修改 contracts/control-identity.types.ts（R1.1 冻结） | ✅ 未违反 | 无文件变更 |
| 修改 src/control-identity/（R1.1 冻结） | ✅ 未违反 | 无文件变更 |
| 执行 git commit / git add | ✅ 未违反 | 仅文件编辑，未执行 git 操作 |

### 13.6 R2.0 子控件 entityKey 设计

46 个 R2.0 subcontrol 的 entityKey 采用 `{domain}.{family}.{role}.{slug}` 模式，其中 `slug` 来自 `labelSlugMap`（`route::label → slug` 复合键），避免跨 route 同名碰撞。

类型映射：
- `switch` → `toggle.switch`（UiEvent: `toggle.switch`）
- `select` → `dropdown.option.select`（UiEvent: `dropdown.option.select`）
- `stepper` → `stepper.valueChange`（UiEvent: `stepper.valueChange`）
- `segment` → `segment.item.switch`（UiEvent: `segment.item.switch`）

跨 route/state 共享 entityKey 的 R2.0 subcontrol（同逻辑控件，同 label）：
- `source.switch.switch.source-biquge` × 2（source-management: default + source-unavailable）
- `source.switch.switch.source-local-import` × 2（同上）
- `source.switch.switch.source-qidian` × 2（同上）
- `source.switch.switch.source-test` × 2（同上）

这 4 个 entityKey 多次出现是同一逻辑控件跨 state 共享（label 相同，controlKey 不同因 `@route.state` 后缀不同），与 R1.1 registry-backed 设计一致，不算碰撞。

### 13.7 R2.0 后续工作（R2a / R2b）

R2.0 完成声明层与对账层，后续工作：

#### R2a（renderer 消费三层身份）
1. 在 `frontend-demo-optimized/` 的 renderer 中，对每个 interactive control 的根 element 调用 `setDataEntityKey` / `setDataControlKey` / `setDataControlId` / `setDataViewport`。
2. 从 `tools/interaction-inventory/generated/control-identity.generated.ts` 导入 `ENTITY_KEY_LOOKUP` / `CONTROL_KEY_LOOKUP` / `CONTROL_ID_LOOKUP`。
3. D2-C 底层 V2 renderer 函数消费 `options` 参数（`pageState` / `loading` / `viewState` / `overlayState`），渲染 loading / error 状态变体。

#### R2b（DOM 属性写入）
1. 把 `data-control-id` / `data-entity-key` / `data-control-key` 写入渲染输出 HTML。
2. 更新 IC0 audit 的 DOM walk，使其能枚举到 `data-entity-key` / `data-control-key` 属性。
3. 把 46 个 R2.0 subcontrol 从 `nonInteractiveContainers.json` 移到 `control-id-registry.json`（升级 `pureContainer=true` 或完全移除）。
4. 重新运行 `generate-control-ids.mjs --write` + `codegen-control-ids.mjs --write`。
