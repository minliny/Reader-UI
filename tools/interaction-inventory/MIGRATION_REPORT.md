# R1 · Control Identity 修复 — 迁移报告

状态：canonical controlId schema 已重新冻结；3,752 交互控件全部获得稳定逻辑身份；零重复、零缺失、可重算；ajv 真实校验 3,752/3,752 valid；drift test 25/25 pass
日期：2026-07-20
工作包：R1 · Control Identity 修复（基线 commit `e35e739`，A2 → R1）
对账报告：[DENOMINATOR_RECONCILIATION.md](./DENOMINATOR_RECONCILIATION.md)

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
