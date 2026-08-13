# R1 · Control Identity 分母对账报告

状态：canonical registry 分母重新核定完成；3752 交互控件 + 63 非交互容器 = 3815 IC0 候选；ajv 真实校验 3752/3752 valid
日期：2026-07-20
工作包：R1 · Control Identity 修复（基线 commit `e35e739`）

## 0. A0 三套分母拆分（2026-07-20 增量）

A0「全局控制面纠偏」要求**分开三套分母**，不得合并表述。三套分母各自承担不同的对账责任，不允许互相替代：

| 分母 | 数量 | 来源 | 责任 | 不允许混入 |
| --- | ---: | --- | --- | --- |
| **视觉/交互验收单元** | **13** | 12 个非 Reader 页面族（F13–F24，见 `docs/audits/vc0-batch-2026-07-19/final-classification.md`）+ 1 个 Reader 试点（Settings General，见 `docs/audits/ic0-2026-07-19/SETTINGS_GENERAL_VC0_SAMPLE.md`） | R3a / VC3-R3b 验收对象粒度 | 不允许用 renderer-owner family 或 DOM occurrence 替代 |
| **renderer-owner family** | **12** | `tools/interaction-inventory/generated/renderer-dispatch-map.json` `pageFamilies`（bookshelf / book-detail / search-results / import-conflict-resolve / discover / rss / source-switch / settings-general / source-management / webdav-config / sync-backup / about-restore-preview） | R2a / R2b 渲染归属与 dispatch 对账 | 不允许用验收单元或 DOM occurrence 替代 |
| **DOM occurrence** | **3,752** | `tools/interaction-inventory/generated/control-id-registry.json` `entries.length`（仅交互控件；63 个 ARIA 容器在 `nonInteractiveContainers.json` 中单独记录） | R2a DOM identity instrumentation 的稳定身份分母 | 不允许用验收单元或 renderer-owner family 替代 |

### 0.1 三套分母的相互关系

```
13 验收单元 = 12 非 Reader 页面族 (F13-F24) + 1 Reader 试点 (Settings General)
             ↓
             ├─ 12 renderer-owner family（与 12 非 Reader 族基本对齐；
             │   Settings General 试点归入 settings-general family）
             ↓
             └─ 3,752 DOM occurrence（分布在 12 renderer-owner family 下的 67 个路由上）
                 ├─ mapped: 736
                 ├─ pending-action-key: 443
                 ├─ pending-instance-key: 1,114
                 └─ pending-action-and-instance-key: 1,459
```

### 0.2 三套分母不变式

- **13 验收单元**：在 R3a / VC3-R3b 中，每个验收单元必须独立通过；不允许用"3,752 DOM occurrence 全绿"或"12 family 全绿"替代。
- **12 renderer-owner family**：在 R2a / R2b 中，每个 family 的 declarations 与 dispatch map 1:1 对账（route-local occurrence 1:1，见 `canonical-reconciliation.json`）。
- **3,752 DOM occurrence**：在 R2a 中，每个 DOM occurrence 必须有稳定的 `entityKey` / `controlKey` / `controlId`（见 `control-id-registry.json`）；`mappingStatus="mapped"` 的 736 个可直接写入 `data-control-key`，3 个 pending 桶共 3,016 个必须 fail-closed（见 `assertMappingStatusAllowsControlKeyWrite`）。

### 0.3 历史分母（保留为 R1 §1）

下方 §1 仍保留 R1 时代的 IC0 inventory 分母（3,752 + 63 = 3,815）作为历史记录。A0 之后该分母仅用于 IC0 audit 完整性校验，**不再作为验收/renderer-owner/DOM occurrence 的分母**。

## 1. 对账结论（R1 历史 IC0 inventory 分母）

| 对象 | 数量 | 来源 | 备注 |
| --- | ---: | --- | --- |
| IC0 inventory `semanticControls` | 3,752 | `docs/audits/ic0-2026-07-19/generated/interaction-control-inventory.json` | 全部为可交互控件（button/searchbox/textbox/slider/combobox/checkbox/option/switch/tab） |
| IC0 inventory `suspectedNonSemanticControls` | 63 | 同上 | R1 核查证实全部为 ARIA 容器角色（46 group + 17 section），不是可交互控件 |
| IC0 inventory 总分母 | 3,815 | 3,752 + 63 | drift test "R1 denominator" 断言 `registry.entries.length + nonInteractiveContainers.entries.length === 3815` |
| Canonical registry candidates | 3,752 | `tools/interaction-inventory/generated/control-id-registry.json` | 仅含可交互控件；`mappingStatus` 不再含 `needs-manual-mapping`（63 容器全部移走） |
| Canonical registry unique controlIds | 3,752 | 同上 | 1:1 候选→身份，零重复 |
| Canonical registry unique selectors (by SHA-256) | 1,607 | 同上 `source.selectorSha256` | selector 唯一化后剩 1,607 个 |
| nonInteractiveContainers entries | 63 | `tools/interaction-inventory/generated/nonInteractiveContainers.json` | 46 group + 17 section，全部 `exclusionReason="aria-container-role"` |

**分母推导（1:1 invariant）**：

```
IC0 inventory      = semanticControls (3,752)  + suspectedNonSemanticControls (63)
                   = 3,815
                     ├──> canonical registry   = 3,752  (interactive candidates, 1:1)
                     └──> nonInteractiveContainers = 63 (ARIA containers, 1:1)
```

drift test "R1 denominator: registry + nonInteractiveContainers = IC0 inventory total" 强制保持该不变量。

## 2. role 分布证据

### 2.1 IC0 inventory `semanticControls` 的 role 分布（3,752 个，全部可交互）

| role | 数量 |
| --- | ---: |
| button | 3,409 |
| option | 241 |
| textbox | 27 |
| slider | 42 |
| combobox | 11 |
| switch | 11 |
| searchbox | 6 |
| tab | 4 |
| checkbox | 1 |
| **合计** | **3,752** |

### 2.2 IC0 inventory `suspectedNonSemanticControls` 的 role 分布（63 个，全部 ARIA 容器）

| role | 数量 |
| --- | ---: |
| group | 46 |
| section | 17 |
| **合计** | **63** |

证据：`nonInteractiveContainers.json` 的 `totals.byRole = {"group":46,"section":17}` 与 IC0 inventory 的 `suspectedNonSemanticControls` role 分布完全一致。

### 2.3 R1 排除决策

`group` 和 `section` 是 ARIA 容器角色，不是可交互控件。IC0 审计本应只枚举可交互控件（点击/触摸/Enter/Space 执行动作的目标）。R1 把 63 个容器候选从 canonical registry 移到 `nonInteractiveContainers.json`，保留审计记录但不让它们污染控件身份命名空间。

R1 drift test "R1 nonInteractiveContainers contains exactly the group/section candidates" 强制保持该排除决策。

## 3. mappingStatus 分布对比

| mappingStatus | A2 baseline (R0) | R1 修复后 | 差异 |
| --- | ---: | ---: | --- |
| `auto-mapped` | 2,273 | 2,273 | 0（同一候选集） |
| `ambiguous-needs-review` | 1,479 | 1,479 | 0（同一候选集） |
| `needs-manual-mapping` | 63 | 0 | -63（全部移到 nonInteractiveContainers） |
| **registry total** | **3,815** | **3,752** | **-63** |

R1 drift test "R1 mapping status buckets sum to total candidate count" 强制 `autoMapped + needsManualMapping + ambiguousNeedsReview === candidates`，并断言 `needsManualMapping === 0`。

## 4. 字节稳定证据

| 产物 | 路径 | 字节稳定校验 |
| --- | --- | --- |
| control-id-registry.json | `tools/interaction-inventory/generated/control-id-registry.json` | `generate-control-ids.mjs --check` pass |
| screengraph-binding.json | `tools/interaction-inventory/generated/screengraph-binding.json` | 同上 |
| figma-crosswalk-pending.json | `tools/interaction-inventory/generated/figma-crosswalk-pending.json` | 同上 |
| dom-identity-map.json | `tools/interaction-inventory/generated/dom-identity-map.json` | 同上 |
| nonInteractiveContainers.json | `tools/interaction-inventory/generated/nonInteractiveContainers.json` | 同上（R1 新增） |
| control-identity.generated.ts | `tools/interaction-inventory/generated/control-identity.generated.ts` | `codegen-control-ids.mjs --check` pass |
| control-dom-selectors.generated.json | `tools/interaction-inventory/generated/control-dom-selectors.generated.json` | 同上 |
| screengraph-binding.generated.json | `tools/interaction-inventory/generated/screengraph-binding.generated.json` | 同上 |

R1 drift test "R1 control identity artifacts are byte-stable against the persisted files" 与 "R1 codegen artifacts are byte-stable and match the registry input" 强制保持字节稳定。

## 5. Schema 合法性证据

| 校验项 | 结果 | 证据 |
| --- | --- | --- |
| ajv 真实校验（draft 2020-12） | 3,752 / 3,752 valid | drift test "R1 ajv schema validation: all registry entries pass real JSON Schema validation" pass |
| additionalProperties:false 负向测试 | 校验失败（如预期） | drift test "R1 ajv negative: extra field is rejected" pass |
| role enum 负向测试 | 校验失败（如预期） | drift test "R1 ajv negative: role not in enum is rejected" pass |
| controlId pattern 负向测试 | 校验失败（如预期） | drift test "R1 ajv negative: controlId pattern mismatch is rejected" pass |
| required 字段负向测试 | 校验失败（如预期） | drift test "R1 ajv negative: missing required field is rejected" pass |
| 无 per-entry `firstMaterializedAt` / `schemaVersion` | 全部 entry 已移除 | drift test "R1 no per-entry firstMaterializedAt or schemaVersion" pass |

## 6. viewport 实例身份设计

R1 重新设计：controlId 是**逻辑身份**，不含 viewport。

```
controlId (logical)  = {domain}.{family}.{route}.{state}.{role}[.discriminator]
viewport instance    = entry.viewport  ∈ {phone, compact, tablet, fold}
DOM stamping         = data-control-id = <logical controlId>
                       data-viewport   = <viewport>
```

- Phone / Compact / Tablet / Fold 同一逻辑控件共享同一 `controlId`
- Selector / Hash 仍按 viewport 分实例（在 `dom-identity-map.json` 中每条 entry 有独立 `viewport` 字段）
- 当多视口实例共存于 DOM 时，`[data-control-id="<id>"][data-viewport="<viewport>"]` 唯一定位

当前 inventory 仅 phone（3,752 / 3,752 entries 的 `viewport === "phone"`）。Compact / Tablet / Fold 待 A1 VC0 多视口审计扩展后增量加入，不会分裂已有 controlId。

## 7. 与 A2 baseline (R0) 的差异

| 维度 | A2 baseline (R0) | R1 修复 | 修复原因 |
| --- | --- | --- | --- |
| `additionalProperties` | `false`，但 entry 有 `firstMaterializedAt` + `schemaVersion` 两个未声明字段 → 0/3815 valid | 移除 per-entry `firstMaterializedAt` 与 `schemaVersion`；`schemaVersion` 移到 registry 顶层 | Schema 与 registry 不一致，drift test 用 hand-rolled 检查掩盖 |
| `role` enum | 不含 group/section，但 registry 有 63 个 group/section entry | 63 个 group/section 移到 `nonInteractiveContainers.json` | group/section 是 ARIA 容器，不是可交互控件 |
| drift test schema 校验 | hand-rolled "schema shape" 检查，把 `firstMaterializedAt` 加入 expected keys 掩盖问题 | 真实 ajv 校验（draft 2020-12），4 类负向测试全过 | 16/16 pass 是假的 |
| controlId pattern | 6-8 atoms：`{domain}.{family}.{route}.{state}.{viewport}.{role}[.discriminator]` | 5-7 atoms：`{domain}.{family}.{route}.{state}.{role}[.discriminator]`；viewport 作为独立字段 | Phone/Compact/Tablet 同一逻辑控件会变成三个互不关联的 ID |
| registry 分母 | 3,815（含 63 容器） | 3,752（仅交互控件） + 63 容器（独立文件） | 容器不应进入控件身份命名空间 |

## 8. 后续工作

- **A1 VC0 扩展**：compact / tablet / fold 视口的 IC0 审计增量加入。由于 controlId 不含 viewport，已有 phone 控件的身份不会分裂。
- **B1/B2/B3/B4 接入**：页面 renderer 在每个 interactive control 根 element 上同时调用 `setDataControlId(element, logicalControlId)` 与 `setDataViewport(element, viewport)`。
- **Figma 回填**：`figma-crosswalk-pending.json` 的 `controlId` 已是逻辑身份，Figma node 绑定按逻辑身份回填即可（不需为每个 viewport 重复回填）。
