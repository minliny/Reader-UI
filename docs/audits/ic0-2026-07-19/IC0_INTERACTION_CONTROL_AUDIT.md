# IC0 交互控件全量事实审计

状态：首版机器清单已建立；`IC0 · Inventory Exact` 未通过

日期：2026-07-19

范围：Figma `klhs2jMM4MncaJFqZMfqEK`、Reader-UI ScreenGraph / runtime action / Web renderer / Motion 当前事实。本文只做控件分母和连接关系审计，不修改 Figma、产品 runtime、合同或发布状态。

## 1. 结论

当前不能使用“所有按钮和交互控件已经统一规划并实现”的表述。

- Figma 已有一部分可信的 canonical 微状态链：Button、IconButton、Switch、Chip / Choice、RowAction、AsyncButton。
- `27 · Interaction Playground` 的 25 条 reaction 确实来自组件实例继承，不是覆盖热点伪造；但它只展示 6 类控件，未覆盖 Select、SegmentedControl、Dialog / Sheet 和 Settings 业务结果。
- Reader-UI 已有完整 route 和 UiEvent 分母，但 ScreenGraph、Web DOM 与 Figma 节点之间没有控件级稳定连接键。
- Web 当前可展开 3,752 个原生 / actionable ARIA 语义控件，并额外识别出 63 个“看似可操作但缺原生 / actionable ARIA 语义”的候选；3,815 个候选都不能被证明与 ScreenGraph component instance 或 Figma node 一一对应。
- `Settings General` 证明静态视觉接近不等于交互闭环：多项控件看似可操作，实际无状态变化或可见结果。

因此本轮完成的是“可重复枚举当前事实和明确缺口”，不是把 IC0 标绿。

## 2. 可重复机器清单

生成入口：

```sh
node tools/interaction-inventory/generate-interaction-inventory.mjs --write
node tools/interaction-inventory/generate-interaction-inventory.mjs --check
node --test tools/interaction-inventory/tests/interaction-inventory.test.mjs
```

产物：

- [interaction-control-inventory.json](./generated/interaction-control-inventory.json)
- [interaction-control-coverage.json](./generated/interaction-control-coverage.json)

两份机器清单放在审计目录，不进入 `generated/` release group，不会扩大 Host 消费或发布字节。

当前重算结果：

| 分母 | 当前值 | 解释 |
| --- | ---: | --- |
| Canonical routes | 260 | 184 direct + 76 alias |
| Direct route / variant cases | 190 | 对应当前 ViewState fixtures |
| Alias cases | 76 | 解析到 direct route 后渲染 |
| 全部渲染 case | 266 | 当前 ScreenGraph 默认 / fixture 状态展开 |
| Web 语义控件候选 | 3,752 | 3,276 button、389 `role=button` article 及 input / select / option / slider 等 |
| 疑似交互但缺语义候选 | 63 | 另表记录，不与 3,752 个语义控件混算；`settings-general` 命中 8 个 |
| 全部当前交互候选 | 3,815 | 语义控件 + 疑似非语义控件，只是审计分母 |
| 有 canonical UiEvent 提示 | 2,271 | 已按 route push / pop / replace 上下文区分；提示不等于 runtime 已消费或已 join |
| 有 raw runtime Motion hint | 3,700 | renderer selector 当前写法，可能是 alias / compound / generic fallback |
| 有 canonical MotionId | 3,692 | 对照 95 项 Motion schema 规范化后的结果；仍不等于动态 evidence |
| canonical MotionId 缺口 | 60 | 52 个无 raw hint，8 个只有无法映射的 raw hint |
| 缺 accessible name | 21 | 已解析 `aria-labelledby`、祖先 / `for` label，仍须进入 IC5 修复 |
| UiEvent 未解析 | 1,481 | 不能证明唯一业务动作 |
| 缺稳定 join key | 3,815 | 3,752 个语义控件 + 63 个疑似非语义候选 |

生成器没有虚构 `controlId`。每条记录只有标记为 `noncanonical-audit-candidate` 的 deterministic `candidateKey`，`componentType` / `componentInstanceId` 保持 `null`，`joinStatus` 固定为 `unjoined-no-stable-key`。这些字段只能用于重复定位审计候选，不能作为产品身份。

另有 5 个 route 的 11 个 variant case 当前产生相同 HTML：`app-shell`、`book-detail`、`reader`、`source-management`、`sync-backup`。清单把它们登记为 `IC0_VARIANT_CASES_RENDER_IDENTICALLY` review gap；相同输出需要复核，但不被自动判成实现错误。

## 3. Reader-UI 合同事实

| 项目 | 当前值 | 关键缺口 |
| --- | ---: | --- |
| ScreenGraph component instances | 615 | DOM 无同一 instance id |
| ComponentType | 174 | 138 referenced，36 explicit-gap |
| 有 binding 的 component instance | 86 | 绝大多数实例没有控件级 action binding |
| Typed action bindings | 97 | 41 个 instance 对应 implemented runtime，56 个仍 planned |
| Canonical UiEvent | 300 | 67 implemented、226 planned、7 platform |
| Implemented 但未出现在 ScreenGraph binding 的事件 | 46 | 合同存在，但页面消费不可证明 |
| 明确 label-without-ui-event | 6 | 需要补 binding 或显式 fail-closed |

36 个 explicit-gap ComponentType 中直接包含 `AddToShelfButton`、`ReadButton`、`Chip`、`Stepper`、`Segment`、`FilterBar`、`FloatingBrightness`、`FloatingQuickActions` 等交互类型。Component catalog 中有类型名，不能替代页面实例、动作和证据。

当前全仓没有 canonical `controlId` / `data-control-id`；`data-ui-event` 主要是 D6 失败关闭元数据，现有 Web runtime 仍以分散 selector handler 为主。必须建立同一身份键，才能完成：

```text
Figma node
  ↔ page family / viewport
  ↔ ScreenGraph route / variant / component instance
  ↔ Web DOM
  ↔ UiEvent / runtime action / Core or Host owner
  ↔ MotionId / reduced-motion / evidence
```

## 4. Figma 控件事实

### 4.1 Shared Primitives（页面 06，`259:8`）

| Component set | 状态与 reaction | 当前判断 |
| --- | --- | --- |
| `Primitive/Button` `281:122` | 72 variants；48 个变体、60 reactions；Disabled / Loading 无 reaction | rest / hover / pressed / focus / disabled / loading 的微状态链已建立 |
| `Primitive/Switch` `283:35` | 10 variants；8 个变体、10 reactions；Pressed MouseUp 切换 On / Off | 视觉与本地切换样板已建立 |
| `Primitive/Select` `282:124` | 15 variants；0 reaction | 只有视觉状态，无展开 / 选择闭环 |
| `Primitive/SegmentedControl` `283:100` | 6 variants；0 reaction | 只有视觉状态，无选择闭环 |
| `Interaction/AsyncButton` | 28 variants；Standard 有 loading / result chain，Reduced 无 transition | 可作为异步按钮样板，不代表页面消费 |
| Input / Slider / FieldRow / OptionList / Stepper / FilterBar / WebView | 0 reaction | 仍缺交互样板或明确例外 |

页面 06 没有 Dialog / Modal / Sheet canonical component。

### 4.2 Settings & About（页面 12，`259:11`）

- `Settings/Switch`、`Settings/SettingRow`、`Settings/NavigationRow`、`Settings/InlineAction`、`Settings/DangerActionRow` 已覆盖 hover / pressed / focus / disabled / loading 等视觉微状态。
- 这些 reactions 只做 `CHANGE_TO` 状态变化，没有编码缓存清理、权限跳转、恢复默认的成功、失败、取消或回滚结果。
- 页面 12 没有 Dialog / Modal / Sheet，也没有真正可展开的 Select / Segmented 交互组件。

### 4.3 Interaction Playground（页面 27，`2009:2`）

- 204 descendants、22 instances、17 reaction nodes、25 reactions。
- 17 个 reaction node 全部是 instance；FRAME / RECTANGLE 没有 reaction。
- 当前只展示 Primary Button、IconButton、Switch、RowAction、Choice、AsyncButton。
- Standard 和 Reduced 配置了 prototype start；State Matrix 没有 flow start，且标注 Static 的部分实例仍继承 reaction / timeout，不是严格静态矩阵。

页面 27 可以证明“这 6 类组件有共享交互样板”，不能证明“全产品控件已统一”。

### 4.4 页面 23 prototype

页面 23 有 75 个三视口 prototype frame 和 354 个 `PrototypeHit/*` 热点；每个热点通常有 click + key 两条 reaction。热点可以证明 route prototype 可导航，但不证明下面的视觉控件来自 canonical component，也不证明业务动作或状态闭环。

## 5. Motion 当前边界

- canonical Motion fixture：95；exact state machine：89；reserved / deprecated：6。
- runtime 源码有 89 个 bind call、66 个 unique MotionId。
- 当前 16 份媒体 evidence 只覆盖 8 个 unique MotionId。
- `MOTION_SELECTOR_MATRIX.md` 仍写 148 selector，而当前生成报告扫描到 377 个非-motion data attribute；文档口径已漂移。
- 所有 button 可得到 generic press fallback，不等于每个控件有专属语义 MotionId、interrupt / cleanup 和 reduced-motion 对照。
- inventory 已把 11 次非 canonical runtime binding 规范化为 schema MotionId；8 个控件仍只有无法映射的 `listRow.press` 等 raw hint，不能计为 canonical Motion coverage。

## 6. IC0 判定与下一门槛

| 条件 | 当前结果 |
| --- | --- |
| Figma 与 Reader-UI 双向枚举 | 部分完成；已有各自分母，无 crosswalk |
| 零遗漏、零重复 | 未证明 |
| 每个控件有稳定 ID | 未完成；3,815 / 3,815 个当前候选缺失 |
| DOM 与 ScreenGraph component instance 可 join | 未完成 |
| Figma page set / node 与 route family 可 join | 未完成 |
| 生成物可重复、可 drift check | 已完成 |

`IC0 · Inventory Exact` 保持未通过。下一批本地修复必须先增加 canonical `controlId` / `data-control-id` 和 Figma page-family crosswalk，再把 `contract-only`、`web-only`、`ambiguous` 候选逐步转成 exact join；在此之前不能扩写完成声明。

代表页面审计见 [Settings General VC0 样板](./SETTINGS_GENERAL_VC0_SAMPLE.md)。
