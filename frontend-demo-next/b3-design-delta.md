# B3 · Discover & RSS Design Delta

> 工作包：B3 · Discover & RSS
> 基线 commit：A2 Control Identity Foundation (c7c2730)
> 输出目的：向 Figma 团队与 contract 团队同步 B3 实现过程中识别的设计差异、契约缺口与未决项。
> 生成时间：2026-07-19（Asia/Shanghai）

## 1. 对象与范围

| 维度 | 内容 |
|---|---|
| 涉及域 | `discover`（778 registry entries）/ `rss`（417 registry entries） |
| 涉及文件 | `frontend-demo-next/discover-rss-control-ids.js`、`frontend-demo-next/discover-rss-state-runtime.js`、`frontend-demo-next/render-runtime.js`（13 处 surgical edit）、`frontend-demo-next/verify/verify-discover-rss-control-ids.mjs`、`frontend-demo-next/verify/verify-discover-rss-states.mjs` |
| 不涉及 | Settings / Library / Source Switch / Reader 域；Figma；docs/audits/；tools/interaction-inventory/；src/control-identity/ |

## 2. Design Delta 项

### 2.1 状态变体 controlId 接入缺口

**现状**：A2 registry 已为 discover/rss 域生成 5 个 state 的 controlId：
- `default`：1120 条
- `empty`：27 条
- `loading`：14 条
- `error`：17 条
- `refreshing`：17 条

**B3 实现**：`discover-rss-control-ids.js` 已收录状态变体常量（`DISCOVER_STATE`、`RSS_REFRESHING`、`RSS_STATE`），但 `render-runtime.js` 的 13 处 surgical edit 主要为 **default state** 路由的控件接入 data-control-id。状态路由（`discover-loading` / `discover-no-results` / `rss-empty` / `rss-error`）的控件 ID 接入未在本工作包完成。

**对 Figma 的请求**：
- 确认状态路由页面的控件是否需要单独的 Figma frame（目前 Figma 可能只有 default state 的设计稿）
- 若 Figma 已有状态变体设计稿，请提供 frame name 以便后续 B 工作包对齐

**对 contract 团队的请求**：
- 确认状态变体 controlId 是否需要在 `dom-identity-map.json` 中单独登记 selector

### 2.2 UiEvent canonical hints 待 contract 评审

**现状**：B3 任务规格列出 6 个 canonical hints：
| hint | ui-event.schema.json enum 状态 |
|---|---|
| `route.push` | 已收录 |
| `tab.item.select` | 已收录 |
| `refresh.invoke` | 未收录 |
| `filter.apply` | 未收录 |
| `sort.cycle` | 未收录 |
| `filter.reset` | 未收录 |

**B3 实现**：`discover-rss-control-ids.js` 的 `UI_EVENT_HINTS` map 与 `render-runtime.js` 的 `data-ui-event` 属性均使用上述 6 个 hint。`verify-discover-rss-control-ids.mjs` 测试 3 对未收录 hint 输出 WARN（不阻塞），等待 contract 评审。

**对 contract 团队的请求**：
- 评审 `refresh.invoke` / `filter.apply` / `sort.cycle` / `filter.reset` 是否应作为跨域 canonical event 加入 `ui-event.schema.json` enum
- 或确认应改用既有 domain-prefixed event（`discover.refresh` / `discover.filter.apply` / `discover.sort.toggle` / `discover.filter.reset` / `rss.refresh`）— 若如此，B3 需在后续工作包中更新 `UI_EVENT_HINTS` 与 `data-ui-event` 属性

### 2.3 三视口（Phone / Compact / Tablet）扩展

**现状**：
- A2 registry 100% phone viewport（3815/3815 entries）
- `control-identity.schema.json` 的 `viewport` enum 已预留 `compact` / `tablet` / `fold`，但 description 明确："Current inventory is phone-only; compact and tablet atoms are reserved for VC0 multi-viewport expansion."
- B3 实现的 `discover-rss-control-ids.js` 与 `discover-rss-state-runtime.js` 全部使用 `phone` viewport

**对 Figma 的请求**：
- 提供 Compact（中宽）与 Tablet（宽屏）视口下 Discover / RSS 页面族的设计稿
- 标注 Compact/Tablet 视口下哪些控件复用 Phone 的 controlId，哪些需要新 controlId（例如分屏 master-detail、侧栏导航等）

**对 contract 团队的请求**：
- 在 VC0 工作包启动前，确认 compact/tablet viewport 的 controlId 命名规则（是否需要 viewport atom 之外的 discriminator）

### 2.4 终态属性（Terminal State Attributes）新增

**现状**：B3 通过 `discover-rss-state-runtime.js` 引入以下 DOM 属性，用于稳定终态语义：
| 属性 | 取值 | 用途 |
|---|---|---|
| `data-motion` | `full` / `reduced` | prefers-reduced-motion 终态 |
| `data-focus-state` | `none` / `requested` / `restored` / `trapped` | 焦点终态（含 Dialog/Sheet focus trap） |
| `data-keyboard-state` | `none` / `activated` / `escaped` | 键盘终态（Enter/Space/Esc） |
| `data-async-stable` | `true` | async 操作稳定终态标记 |
| `data-async-refresh` / `data-async-filter` / ... | `idle` / `pending` / `success` / `partial-success` / `stale` / `repeat-tap` / `failed` / `canceled` | 异步操作阶段标记 |
| `data-loading` / `data-refreshing` / `data-empty` / `data-error` / `data-no-results` / `data-conflict` / `data-result` | `true` | pageState 终态标记 |
| `data-cache-stale` / `data-cache-fresh` | `true` | 缓存终态 |

**对 Figma 的请求**：
- 确认 Figma 设计稿是否已为 `reduced-motion` 终态提供 motion-spec（若否，B3 实现 fallback 为 `data-motion="reduced"` 时关闭非必要动画）
- 确认 `partial-success` / `stale` / `repeat-tap` 终态在 Figma 中是否有对应视觉表现（例如 stale 结果的灰显、repeat-tap 的去抖反馈）

### 2.5 重复点击（repeat-tap）防抖契约

**现状**：`discover-rss-state-runtime.js` 的 `repeatTapAttrs(count)` 返回 `data-async-repeat-tap="true"` 与 `data-async-repeat-tap-count="N"`（最低值 2）。`DISCOVER_ASYNC_CONTRACTS.refresh.repeatTap` 与 `RSS_ASYNC_CONTRACTS.refresh.repeatTap` 已定义。

**对 Figma 的请求**：
- 提供 repeat-tap 视觉反馈设计（例如按钮短暂禁用、loading spinner 叠加、去抖提示文案）

## 3. 三视口浏览器 trace 状态

### 3.1 Phone 视口（375×667 / 390×844）

| 检查项 | 状态 | 证据 |
|---|---|---|
| `data-control-id` 注入 | 静态分析通过 | `verify-discover-rss-control-ids.mjs` 测试 4：18 个字面量 controlId 全部在 render-runtime.js 中检出；测试 5：data-ui-event 与 UI_EVENT_HINTS 一致 |
| controlId 格式合规 | 通过 | 测试 1：65 个 controlId 全部匹配 `control-identity.schema.json` pattern |
| registry 冻结 | 通过 | 测试 2：65/65 controlId 在 A2 registry 中冻结 |
| 终态属性契约 | 通过 | `verify-discover-rss-states.mjs` 测试 4-6：loading/empty/error/refreshing/no-results/reduced-motion/focus/keyboard/repeat-tap/stale/partial-success 全部断言通过 |
| 运行时浏览器 trace | 未执行 | 本工作包环境无浏览器自动化基础设施（无 Puppeteer/Playwright）；静态分析已覆盖代码层契约，运行时 DOM 渲染验证待后续工作包 |

### 3.2 Compact 视口（768×1024）

| 检查项 | 状态 | 说明 |
|---|---|---|
| registry controlId | 不适用 | A2 registry 0 个 compact viewport 条目；等待 VC0 多视口扩展 |
| render-runtime.js 适配 | 不适用 | 当前渲染逻辑无 compact 分支；CSS 媒体查询存在但 controlId 不区分 viewport |
| 运行时浏览器 trace | 不适用 | 待 VC0 工作包提供 compact 设计稿与 registry 条目后执行 |

### 3.3 Tablet 视口（1024×1366 / 1180×820）

| 检查项 | 状态 | 说明 |
|---|---|---|
| registry controlId | 不适用 | A2 registry 0 个 tablet viewport 条目；等待 VC0 多视口扩展 |
| render-runtime.js 适配 | 不适用 | 当前渲染逻辑无 tablet 分支 |
| 运行时浏览器 trace | 不适用 | 待 VC0 工作包提供 tablet 设计稿与 registry 条目后执行 |

### 3.4 三视口 trace 结论

- **Phone**：静态分析层 100% 覆盖（controlId + 终态属性 + UiEvent hint 一致性）；运行时 DOM trace 待浏览器自动化基础设施就绪后补充。
- **Compact / Tablet**：A2 baseline 明确为 phone-only，本工作包不适用；后续 VC0 工作包需先扩展 registry，再执行 trace。
- **推荐**：在 B5 或后续工作包中引入 Playwright + 截图 diff 工具，建立 `frontend-demo-next/verify/trace/` 目录承载运行时 trace 产物。

## 4. 未决项汇总

| ID | 项 | 负责团队 | 阻塞 |
|---|---|---|---|
| D-01 | 状态路由（discover-loading / rss-empty 等）的控件 data-control-id 接入 | 后续 B 工作包 | 否（default state 已覆盖） |
| D-02 | 4 个 UiEvent canonical hint 加入 enum 或改用 domain-prefixed event | contract 团队 | 否（WARN 不阻塞） |
| D-03 | Compact / Tablet viewport 设计稿与 registry 扩展 | Figma + VC0 工作包 | 否（phone-only baseline） |
| D-04 | reduced-motion / partial-success / stale / repeat-tap 视觉表现确认 | Figma | 否（fallback 已实现） |
| D-05 | 运行时浏览器 trace 基础设施 | 后续工作包 | 否（静态分析已覆盖契约层） |
