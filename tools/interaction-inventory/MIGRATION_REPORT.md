# A2 · Control Identity Foundation — 迁移报告

状态：canonical controlId schema 已冻结；3,815 候选全部获得稳定身份；零重复、零缺失、可重算；drift test 全绿
日期：2026-07-19
工作包：A2 · Control Identity Foundation（执行基线 [READER_PRODUCT_EXECUTION_BASELINE_2026-07-19.md](../../docs/READER_PRODUCT_EXECUTION_BASELINE_2026-07-19.md)）

## 1. 完成层级与原始证据

| 对象 | 层级 | 原始证据 | 未完成项 |
| --- | --- | --- | --- |
| Canonical controlId schema | 合同冻结 | `contracts/control-identity.schema.json`、`contracts/control-identity.types.ts` | Figma node 绑定字段待回填 |
| 3,815 候选稳定身份 | 本地代码候选 | `tools/interaction-inventory/generated/control-id-registry.json`（3,815 条目，3,815 唯一 ID） | 1,479 ambiguous + 63 needs-manual 仍需人工映射 |
| ScreenGraph binding | 本地代码候选 | `tools/interaction-inventory/generated/screengraph-binding.json`（66 bound / 1,052 unresolved / 2,697 pending-figma-join） | 3,749 / 3,815 候选无确定性 ScreenGraph 绑定 |
| DOM identity 基础设施 | 本地代码候选 | `src/control-identity/{dom-identity,control-id-resolver,index}.ts` | 现有页面 renderer 未消费 `data-control-id`（B1/B2/B3/B4 范围） |
| Codegen | 本地代码候选 | `tools/interaction-inventory/generated/control-identity.generated.ts`、`control-dom-selectors.generated.json`、`screengraph-binding.generated.json` | 三端 native codegen 暂未消费 |
| Drift test | 自动化通过 | `tools/interaction-inventory/tests/control-identity-drift.test.mjs`（16/16 pass） | — |
| Figma crosswalk | 待回填 | `tools/interaction-inventory/generated/figma-crosswalk-pending.json`（3,815 pending） | 全部 Figma node 候选为 null |

A2 工作包不修改页面视觉、业务行为、Motion、三端代码、Figma 或 docs/audits/，因此未升级到"浏览器已验证"或更高状态。

## 2. 输入分母

| 分母 | 当前值 | 来源 |
| --- | ---: | --- |
| IC0 候选总数 | 3,815 | `docs/audits/ic0-2026-07-19/generated/interaction-control-inventory.json` |
| 语义控件 | 3,752 | IC0 inventory `semanticControls` |
| 疑似非语义控件 | 63 | IC0 inventory `suspectedNonSemanticControls` |
| Canonical routes 覆盖 | 260 | `ui-spec/screen-graph.json` |
| ScreenGraph component instances | 615 | 同上 |
| 唯一 controlId 产出 | 3,815 | A2 registry `totals.uniqueControlIds` |
| Inventory SHA-256 | `df7a7a177ec5286b8d3f7e33df55244263716e3862af208a3eff1a75779a033e` | A2 registry `generatedFrom.inventorySha256` |
| ScreenGraph SHA-256 | `159f5434ecd5ee919588db23fa70d5fe8fbc62d9f079000bcb23b3f99e499d1b` | A2 registry `generatedFrom.screenGraphSha256` |

## 3. controlId 命名规则

```
{domain}.{family}.{route}.{state}.{viewport}.{role}.{discriminator}
```

- `domain`：12 个产品域（与 `runtimeFamily` 一致）：`discover`、`import`、`library`、`onboarding`、`reader`、`rss`、`settings`、`source`、`source-switch`、`sync`、`system`、`web-auth`。
- `family`：从 DOM tag + ARIA role + class hints 派生的组件族（19 个枚举）：`button`、`icon-button`、`link`、`switch`、`checkbox`、`radio`、`slider`、`textbox`、`searchbox`、`combobox`、`option`、`tab`、`menuitem`、`menuitemcheckbox`、`menuitemradio`、`summary`、`listrow-action`、`treeitem`、`generic-button`。
- `route`：ScreenGraph routeId（kebab-case，260 个枚举）。
- `state`：variant pageState（kebab-case）。
- `viewport`：`phone` / `compact` / `tablet` / `fold`；当前 inventory 为 phone-only。
- `role`：ARIA role 或 tag-derived role（kebab-case）。
- `discriminator`：单 atom 稳定判别符。
  - 当存在语义 data-* 属性时：`{slug}-h-{hash8}`，例如 `top-action-search-h-1c0d0896`。
  - 当无语义 data-* 时：`h-{hash8}`，例如 `h-1c0d0896`。
  - `hash8` = `sha256(candidateKey|routeId|variantId|selector|domTag|role|label|dataAttributes)` 的前 8 个 hex 字符，保证零重复。

示例：

```
library.button.bookshelf.default.phone.button.route-immersive-reading-h-d8c8f2fd
reader.icon-button.reader.default.phone.button.reader-exit-h-3a2b1c0d
settings.generic-button.settings-general.default.phone.group.h-18903315
```

## 4. 候选映射分类

| mappingStatus | 数量 | 含义 | 下一 owner |
| --- | ---: | --- | --- |
| `auto-mapped` | 2,273 | 有 canonical UiEvent 或绑定到 ScreenGraph component instance | 可直接进入 B1/B2/B3/B4 实现 |
| `ambiguous-needs-review` | 1,479 | 无 UiEvent 且无确定性 ScreenGraph 绑定；可能是导航 chrome、装饰性控件、重复控件或 IC0 UiEvent 解析缺口 | 需 Reader-UI owner 人工分类 |
| `needs-manual-mapping` | 63 | IC0 标记为 suspected-nonsemantic-control；目前 `family=generic-button`、`role=group` 等，需人工确认控件族 | 需 Reader-UI owner 人工分类 |

### 4.1 需人工映射的 63 个候选

全部为 IC0 audit 的 `suspected-nonsemantic-control`，分布在 24 个 route：

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
- Settings General `is-switch` / `is-select` / `is-segment` 8 个：需要 B1 升级为原生 Switch / Select / SegmentedControl 语义。
- import-* / reader-content-* / reader-toc-* 的 `tabindex-nonnegative` 或 `fd-setting-row` 候选：需要 B2 / Reader-UI owner 判定是否为可操作控件或装饰性容器。

### 4.2 需 ambiguous-review 的 1,479 个候选

这些候选有 IC0 标记的 semanticStatus=semantic-control，但缺少：
- canonical UiEvent（`source.uiEvent === null`），且
- ScreenGraph component instance 绑定（`screenGraphBinding.bindingStatus !== "bound"`）。

典型样本：

```
library.button.bookshelf.default.phone.button.top-action-search-h-1c0d0896   label="搜索"   data-top-action="search"
library.button.bookshelf.default.phone.button.top-action-more-h-5fd7b61f     label="更多"   data-top-action="more"
library.button.bookshelf.default.phone.button.h-9853c162                    label="封面视图" data-bookshelf-view-button="cover"
library.button.bookshelf.default.phone.button.h-5e688a2b                    label="书架筛选：全部，最近更新，全部" data-bookshelf-filter-toggle=""
```

判定方向：
- 大多数是页面级 chrome 控件（顶栏按钮、视图切换、筛选触发），UiEvent 已在 `data-*` 中暗含但未在 IC0 解析为 canonical UiEvent。
- B1/B2/B3/B4 实现 Renderer 时应同时：(1) 设置 `data-control-id`；(2) 解析为 canonical UiEvent 并写入 `data-ui-event`。
- 无法确定业务动作的控件应显式 disabled / inert / fail-closed，不可"看似可点但无行为"。

## 5. ScreenGraph binding 状态

| bindingStatus | 数量 | 含义 |
| --- | ---: | --- |
| `bound` | 66 | 候选与 ScreenGraph component instance 建立确定性绑定（UiEvent match / props.uiEvent match / label match） |
| `unresolved` | 1,052 | 候选所在 route/variant 在 ScreenGraph 中无 component instance（多为 alias route 或 ScreenGraph 未展开的 variant） |
| `pending-figma-join` | 2,697 | 候选所在 case 有 ScreenGraph component，但无确定性匹配；需要 Figma node 或人工 review 提供稳定 join key |

### 5.1 绑定启发式（顺序）

1. **Strong**：`control.uiEvent === component.bindings[].event` → `bindingReason="ui-event-binding-match"`
2. **Weak (props)**：`control.uiEvent === component.props.uiEvent` → `bindingReason="props-ui-event-match"`
3. **Weak (data-ui-event)**：`control.dataAttributes["data-ui-event"] === component.props.uiEvent` → `bindingReason="data-ui-event-props-match"`
4. **Weak (label)**：`control.label ∈ {component.props.action, .title, .label, .text}` → `bindingReason="label-match"`
5. **Fallback**：`pending-figma-join`，`bindingReason="no-deterministic-match-needs-review"`

绑定启发式只产出候选；不作为最终 join。Figma join key 缺失时，所有 binding 都保持 pending-figma-join 或 unresolved。

### 5.2 Bound 样本

```
library.button.bookshelf.default.phone.button.nav-type-bookshelf-h-65129732
  -> AppTopBar / bookshelf-topbar | uiEvent: tab.item.select
library.button.bookshelf-empty.shelf-empty.phone.button.nav-type-bookshelf-h-cc14b0b3
  -> AppTopBar / app-topbar | uiEvent: tab.item.select
```

## 6. Figma crosswalk（全部 pending）

`tools/interaction-inventory/generated/figma-crosswalk-pending.json` 包含 3,815 个条目，每条：

```json
{
  "controlId": "library.button.bookshelf.default.phone.button.route-immersive-reading-h-d8c8f2fd",
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

所有 `figmaNodeCandidate` 字段保持 null；所有 `figmaJoinStatus` / `status` 为 `pending-figma-join`。A2 不伪造 Figma node 绑定。

回填规则：
1. Figma writer 在 Figma 文件中为每个 canonical component 实例标注稳定的 `nodeId`（或导出 `node-id → page-family → route → role` 映射）。
2. 由 Reader-UI owner 通过 `figma-crosswalk-pending.json` 的 `controlId` 字段回填 `figmaNodeCandidate`。
3. 回填完成后，运行 `node tools/interaction-inventory/generate-control-ids.mjs --write` 重新生成 registry，并将 `figmaJoinStatus` 改为 `joined`。

## 7. 产出文件清单

### 7.1 合同（contracts/）

- `contracts/control-identity.schema.json` — JSON Schema，定义 ControlIdentity、ControlIdRegistryEntry、ControlIdRegistry。
- `contracts/control-identity.types.ts` — TypeScript 类型，与 schema 一致。

### 7.2 工具（tools/interaction-inventory/）

- `tools/interaction-inventory/interaction-inventory-lib.mjs` — 扩展：新增 controlId 生成、ScreenGraph binding、validator 函数（追加，未修改现有 IC0 函数）。
- `tools/interaction-inventory/generate-control-ids.mjs` — 生成器 CLI（`--write` / `--check`）。
- `tools/interaction-inventory/validate-control-ids.mjs` — 验证器 CLI（`--check` / `--report`）。
- `tools/interaction-inventory/codegen-control-ids.mjs` — codegen CLI（`--write` / `--check`）。
- `tools/interaction-inventory/MIGRATION_REPORT.md` — 本报告。

### 7.3 测试

- `tools/interaction-inventory/tests/control-identity-drift.test.mjs` — 16 项 drift test，覆盖零重复、零缺失、可重算、DOM selector 唯一性、Figma join 完整性、schema shape、codegen 字节稳定。
- `tools/interaction-inventory/tests/interaction-inventory.test.mjs` — 现有 IC0 测试，仍 10/10 通过（追加未破坏）。

### 7.4 生成物（tools/interaction-inventory/generated/）

- `control-id-registry.json` — 3,815 entries，canonical controlId registry。
- `screengraph-binding.json` — 3,815 entries，ScreenGraph component instance binding。
- `figma-crosswalk-pending.json` — 3,815 entries，Figma node 待回填。
- `dom-identity-map.json` — 3,815 entries，DOM selector → data-control-id 映射。
- `control-identity.generated.ts` — TypeScript 模块，导出 `CONTROL_ID_ENTRIES`、`CONTROL_ID_LOOKUP`、`CONTROL_ID_SET`。
- `control-dom-selectors.generated.json` — DOM selector 映射，按 route 分组。
- `screengraph-binding.generated.json` — ScreenGraph binding 映射，按 controlId 排序。

### 7.5 DOM identity 基础设施（src/control-identity/）

- `src/control-identity/dom-identity.ts` — `DATA_CONTROL_ID_ATTRIBUTE`、`setDataControlId`、`getDataControlId`、`querySelectorForControlId`、`resolveControlId`、`isValidControlIdFormat`、`parseControlId`、`composeControlId`。
- `src/control-identity/control-id-resolver.ts` — `createControlIdResolver`、`queryElementByControlId`、`verifyDomCoverage`。
- `src/control-identity/index.ts` — 公共入口，re-export 全部 API。

## 8. 退出条件验证

| 退出条件 | 状态 | 证据 |
| --- | --- | --- |
| 稳定 ID 能从 contract 映射到 ScreenGraph / DOM | 已建立 | schema + registry + binding + dom-identity-map + src/control-identity 基础设施 |
| 零重复 controlId | 通过 | drift test "A2 control identity produces zero duplicate controlIds" pass |
| 零缺失（3,815 候选全覆盖） | 通过 | drift test "A2 control identity covers every IC0 candidate with zero missing" pass |
| 可重算 | 通过 | drift test "A2 control identity is reproducible from the same inventory input" pass；`generate-control-ids.mjs --check` 字节稳定 |
| drift test 通过 | 通过 | 16/16 pass（含 codegen 字节稳定） |
| 不谎称 Figma 已 join | 通过 | 3,815 / 3,815 entries `figmaJoinStatus="pending-figma-join"`；drift test "A2 Figma crosswalk is fully pending; no forged Figma node bindings" pass |
| 说明哪些 3,815 候选仍需人工映射 | 已说明 | 63 needs-manual-mapping（24 route） + 1,479 ambiguous-needs-review，见本报告第 4 节 |

## 9. 后续工作包消费指南

### B1 / B2 / B3 / B4（页面 renderer 实现）

1. 消费 `contracts/control-identity.types.ts` 中的类型。
2. 从 `tools/interaction-inventory/generated/control-identity.generated.ts` 导入 `CONTROL_ID_LOOKUP`。
3. 在每个 interactive control 的根 element 上调用 `setDataControlId(element, controlId)`。
4. 测试中通过 `querySelectorForControlId(controlId)` 或 `resolveControlId(controlId)` 定位控件。
5. 不修改 A2 产出的 schema / lib / drift test；如发现 mapping 错误，向 A2 owner 反馈。

### Reader-UI owner（ambiguous-needs-review 处理）

1,479 个 ambiguous 候选需逐项确认：
- 是 chrome 控件 → 补 canonical UiEvent（写入 `data-ui-event`）。
- 是装饰性元素 → 移除 `tabindex` / `role` / `data-*`。
- 是重复控件 → 拆分或合并。
- 是 fail-closed 控件 → 显式 disabled / inert。

### Figma writer（figma-crosswalk 回填）

1. 在 Figma 中为每个 canonical component 实例添加稳定 `nodeId`。
2. 导出 `node-id → page-family → route → role` 映射。
3. 回填 `tools/interaction-inventory/generated/figma-crosswalk-pending.json` 的 `figmaNodeCandidate` 字段。
4. 通知 Reader-UI owner 重新生成 registry。

## 10. 风险与限制

1. **viewport 当前仅 phone**：现有 IC0 inventory 在 VM 中以 390×844（Phone）渲染，所有 controlId 的 viewport atom 固定为 `phone`。Compact / Tablet / Fold 视口需要 A1 VC0 批量审计扩展或 B1/B2/B3/B4 在多视口渲染后重新生成 inventory。
2. **componentType / componentInstanceId 在 IC0 inventory 中为 null**：A2 通过 ScreenGraph binding 启发式部分回填；66 / 3,815 候选获得 `bound`，其余需要 Figma join key 或人工 review。
3. **discriminator 包含 hash**：controlId 中包含 8 字符 hash，不影响人类可读性（前缀已包含 domain/family/route/state/viewport/role/slug），但意味着控件实现变化时 hash 会变。这是设计意图：controlId 应在控件结构稳定后冻结。
4. **现有页面 renderer 未消费 data-control-id**：A2 只提供基础设施，不修改页面视觉代码。B1/B2/B3/B4 实现时需逐步接入。
5. **三端 native codegen 暂未消费**：A2 codegen 只产出 TypeScript / JSON；Swift / Kotlin / ArkTS 的 native codegen 接入由后续工作包完成。

## 11. 复算入口

```sh
# 重新生成 IC0 inventory（A1 范围，A2 消费）
node tools/interaction-inventory/generate-interaction-inventory.mjs --write

# 重新生成 A2 controlId registry + binding + figma crosswalk + dom identity
node tools/interaction-inventory/generate-control-ids.mjs --write

# 重新生成 codegen artifacts
node tools/interaction-inventory/codegen-control-ids.mjs --write

# 验证字节稳定
node tools/interaction-inventory/generate-control-ids.mjs --check
node tools/interaction-inventory/codegen-control-ids.mjs --check
node tools/interaction-inventory/validate-control-ids.mjs

# 运行 drift test
node --test "tools/interaction-inventory/tests/*.test.mjs"
```

所有产出在相同输入下产生相同字节；`generatedAt` 字段固定为 A2 baseline `2026-07-19T00:00:00.000Z` 以保证可重算。
