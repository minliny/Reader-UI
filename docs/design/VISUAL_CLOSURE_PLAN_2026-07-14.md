# Reader 静态视觉闭环计划

状态：Reader 2 控制层已完成 VC2 / VC3；其他页面族仍是待审计的装配候选

更新时间：2026-07-15

## 1. 当前判断

Material M0–M5 已留下素材、组件、页面级 master 和三档 viewport 矩阵，但尚未完成下面这条闭环：

```text
用户逐页视觉确认
  -> 在 Figma 修正需要设计判断的差异
  -> 冻结可审计 Design Delta
  -> Codex 显式回写 Reader-UI
  -> 浏览器实页复验
  -> 进入 Motion 与三个 Host
```

因此，`23 · Pages · Final` 只是现有 Figma 节点名。它当前应解释为“最终页候选装配区”，不能据此宣称比例、圆角、图标、排版、组件关系或响应式设计已经定稿。Reader 控制层是已显式关闭的例外：其静态视觉唯一源已切换为 Figma `15 · Reader 2` (`1023:17636`)，不再消费 `23 · Pages · Final` 里的历史 Reader 候选。

## 2. 当前完成度

| 工作 | 当前状态 | 说明 |
| --- | --- | --- |
| 素材、组件与页面级 master 装配 | 已有候选 | 可以作为审计输入；不等于视觉验收通过 |
| Reader 2 静态源冻结 | 已完成 | `15 · Reader 2`；覆盖控制首页、7 快捷/模块态、4 完整页、3 响应式 master 和 3 个唯一原子源 |
| Reader 2 Design Delta / Reader-UI 回写 | VC2 已完成 | 见 [READER2_STATIC_DESIGN_DELTA_2026-07-15.md](./READER2_STATIC_DESIGN_DELTA_2026-07-15.md) |
| Reader 2 三档浏览器闭环 | VC3 已完成 | 12 primary 状态、7 兼容路由、交互/console、动态分页和仓库门禁均通过 |
| 24 个页面/状态族 × 关键 viewport 的逐页视觉复核 | 未完成 | 需要同时对照当前浏览器实页和 Figma 候选 |
| 用户对保留项与改版项的确认 | 未完成 | 未确认前不能把候选稿当成最终设计 |
| Figma 高判断视觉修改 | 未完成 | 比例、圆角、图标、排版、组件关系按确认结果修改 |
| 其他页面族 Design Delta 冻结 | 未完成 | Reader 2 已有差异矩阵；其他页面族尚无逐项连接 Figma node、route/state/viewport 与代码落点的矩阵 |
| 其他页面族 Reader-UI 回写 | 未完成 | Reader 2 已显式回写；当前没有 Figma 自动同步，其他族仍必须显式实现 |
| 其他页面族本地 demo 复验 | 未完成 | Reader 2 已通过；其他族仍需覆盖几何、状态、响应式与回归门禁 |
| 三个 Host 的最终静态 UI 实现 | 未完成 | 等静态视觉和 Motion 输入稳定后分别落地 |

## 3. VC0–VC3 执行顺序

### VC0 · Visual Audit

对 `23 · Pages · Final` 中 24 个页面/状态族按页面族审计，不按 235 个 route/alias 重复检查。每个代表状态至少保留：

1. 当前浏览器实页截图与 DOM 几何。
2. Figma 候选截图与节点坐标。
3. Phone；该页面族相关的 Compact / Expanded / Tablet 关键档。
4. 图标源与显示盒、排版、圆角、阴影、间距、safe area、正文与四角信息、导航和控制层关系。
5. 一项明确分类：`保持`、`Codex 修复`、`Figma 修改`、`两阶段`。

先完成一个代表页面并由用户确认审计口径，再扩展同一页面族。未确认的批量候选不继续向下游传播。

完成门槛：24 个页面/状态族都有当前事实、差异、责任层和优先级；不再以旧截图或内部“已通过”记录代替当前视觉判断。

### VC1 · Figma Visual Repair

只在两类情况下修改 Figma：

1. 候选稿偏离当前 demo：把 Figma 恢复到当前实页事实。
2. 用户明确要改变当前设计：在 Figma 完成需要视觉判断的比例、圆角、图标、排版和组件关系。

每次只推进一个已审计页面族；先修共享 foundations / icon / component master，再让实例继承。旧捕获和 reference-only 节点不改名冒充可复用组件。

完成门槛：目标页面族的关键 viewport 可编辑、可复用、无手绘近似图标，并由用户确认视觉结果。

### VC2 · Design Delta Freeze & Reader-UI Backport

每个已确认差异必须进入 Design Delta Matrix，至少包含：

- Figma node 与页面族。
- route / state / viewport。
- 旧值、确认值和视觉证据。
- 代码落点：token、共享 component、Shell、fixture、renderer 或响应式规则。
- 是否影响 Contract、三个 Host 或只影响 demo。
- 实现与回归状态。

Codex 再按矩阵显式修改 Reader-UI。Figma 不直接生成或覆盖本地页面结构，也不存在未经审计的一键双向同步。

完成门槛：每项 Figma 设计变化都有对应代码提交或明确的 `Figma-only reference` 结论；不存在无法解释的视觉漂移。

Reader 2 当前 Design Delta 已落盘至 [READER2_STATIC_DESIGN_DELTA_2026-07-15.md](./READER2_STATIC_DESIGN_DELTA_2026-07-15.md)，并完成 ThemeSwatch、FontCell、timer-card、控制 Shell 和正文分页边界的显式回写。

### VC3 · Browser Closure

在 `frontend-demo-optimized/` 对确认后的设计做实页复验：

1. route / state 可达。
2. DOM 几何、字体、圆角、图标盒、层级和安全区与确认稿一致。
3. Phone、相关 Compact / Expanded、Tablet 均通过。
4. 状态切换、滚动、键盘、控制层、正文和四角信息没有回归。
5. 形成可重跑的截图、坐标矩阵和测试证据。

完成门槛：用户确认静态基线，差异矩阵全部关闭，仓库门禁通过。只有此时才允许进入 MR0 / Motion Reference。

Reader 2 控制层已完成 Phone `390×844`、Compact `844×390`、Tablet 内部画布 `760×960` 的实页对照，并关闭 12 个 primary 状态、7 个兼容路由、交互、console、分页、阴影伪影和仓库门禁。Reader 2 的 VC3 因此已完成；其他页面族不因此自动通过。

## 4. 总体顺序

```text
M0–M5 既有装配候选
  -> VC0 逐页视觉审计
  -> VC1 Figma 视觉修正
  -> VC2 Design Delta + Reader-UI 回写
  -> VC3 浏览器闭环
  -> MR0–MR3 Motion Contract / Figma Motion Reference / demo harness
  -> 三个 Host 分别实现已确认的静态 UI 与 Motion
  -> 真机视觉、交互、性能和无障碍证据
```

Motion 不再是当前下一步。VC3 未通过时，不创建 Motion Reference、不批量画关键帧，也不让三个 Host 追随未稳定的静态设计。
