# Motion Spec

状态：Phase 1-2 Motion Runtime 基础规格；MR1 控制层完成自验
日期：2026-07-15
权威源：[motion.schema.json](./motion.schema.json)、[motion.fixtures.json](./fixtures/motion.fixtures.json)、[motion-policy.schema.json](./motion-policy.schema.json)、[motion-policy.fixtures.json](./fixtures/motion-policy.fixtures.json)、[token.fixtures.json](./fixtures/token.fixtures.json) motion-duration/motion-easing
来源：[frontend-demo-optimized/MOTION_CONTRACT.md](../frontend-demo-optimized/MOTION_CONTRACT.md)、[frontend-demo-optimized/MOTION_EFFECTS.md](../frontend-demo-optimized/MOTION_EFFECTS.md)、[frontend-demo-optimized/MOTION_IMPLEMENTATION_GAP_AUDIT.md](../frontend-demo-optimized/MOTION_IMPLEMENTATION_GAP_AUDIT.md)、[frontend-demo-optimized/verify/motion/motion-coverage-report.json](../frontend-demo-optimized/verify/motion/motion-coverage-report.json)、[STATE_OWNERSHIP.md](./STATE_OWNERSHIP.md) §6

本文是 Motion Runtime P0/P1 阶段的"动效和交互规范"。归并现有 `frontend-demo-optimized/MOTION_*.md` 文档到 contracts/ 权威源，定义 P0 MotionId 集合、触发/结束/打断规则、reduced-motion 降级、手势阈值、demo 等价性边界，并定义 Phase 1 MotionSpec 结构化字段与 Phase 2 MotionPolicy / ReaderMotionResolver 规则。

## 0. 文档边界

本文覆盖：
- P0 MotionId 集合（高风险 + 必须三端验证）
- 每个 P0 MotionId 的触发条件、结束状态、打断规则、reduced-motion 降级
- 通用交互规则：手势阈值、拖拽边界、焦点恢复、system back、键盘 inset
- demo 等价性边界：哪些 demo 动效只是浏览器证明
- Phase 1 Motion Runtime：MotionSpec 6 个结构化字段（implementationKind / containerRole / operation / visualPattern / interruptPolicy / reducedMotionPolicy）的 enum 与派生规则
- Phase 2 Motion Runtime：MotionPolicy 规则表与 ReaderMotionResolver 接口

本文不覆盖：
- 不重复 95 个 MotionId 全集（以 [motion.schema.json](./motion.schema.json) enum 为准）
- 不重复 motion-duration 数值（以 [token.fixtures.json](./fixtures/token.fixtures.json) 为唯一源）
- 不写 Compose / SwiftUI / ArkUI 实现代码（归三端仓库）
- 不重复视觉效果描述（以 [MOTION_EFFECTS.md](../frontend-demo-optimized/MOTION_EFFECTS.md) 为准）
- 不写平台 MotionAdapter 实现细节（归三端仓库，见 [PLATFORM_EVIDENCE_SPEC.md](./PLATFORM_EVIDENCE_SPEC.md)）

权威层级：
1. **Figma Motion Reference 层**：核心动效的关键帧、轨迹、层级、锚点和视觉节奏；不是运行时权威
2. **Contract 层**（本仓）：MotionId / trigger / state fields / from / to / interrupt / finalState / cleanup / reducedMotion 的跨端权威
3. **Demo proof 层**（`frontend-demo-optimized/`）：浏览器可执行样板，证明状态流、打断、降级成立
4. **Platform implementation 层**（三端仓库）：原生导航 / 原生组件 / 原生手势 / safe area / keyboard inset / fold posture / accessibility focus

Demo proof 不等于 Platform implementation。平台不能用 Web CSS / DOM / `data-*` selector / demo route stack 作为实现接口。

当前状态：Reader 2 静态 VC3 通过后，MR0 已把全部当前生产 MotionId 逐族提升。筛选、批量选择、文本选择、危险确认和 tooling 模式切换最后 10 项已按真实 selector、状态所有权、打断与 cleanup 完成结构化审计。当前 89 个生产 MotionSpec 的 `trigger/from/to/interrupt/finalState/cleanup` 为 schema 条件必填并同步到三端 generated registry；剩余 6 个 MotionId 均有明确非生产身份：`reader.session.controlSpace.*` 3 项为 contract-reserved，`reader.sourceSwitch.open-close`、`overlay.dialog.enter-exit`、`overlay.sheet.enter-exit` 3 项为 deprecated ABI 兼容。P0 的 47 项中已有 45 项 exact，剩余 `reader.session.controlSpace.enter/exit` 为当前产品不渲染重复控制层胶囊的 contract-reserved 项。

## 1. P0 MotionId 集合

95 个 MotionId 中，P0 阶段必须三端验证的高风险子集：

| MotionId | 等级 | 理由 |
| --- | --- | --- |
| `app.firstOpen.enter` | P0 | 冷启动首屏，只播一次 |
| `app.route.push.forward` | P0 | 路由推进，三端必须实现 |
| `app.route.pop.backward` | P0 | 路由返回，system back 等价 |
| `app.route.replace` | P0 | 状态页替换 |
| `bookshelf.view.switch` | P0 | 书架视图切换 |
| `tab.item.select` | P0 | Tab 选中反馈 |
| `tab.switch` | P0 | Tab 之间切换 |
| `reader.entry.coverToImmersive` | P0 | 封面进入沉浸阅读，高风险 |
| `reader.entry.actionToImmersive` | P0 | 按钮进入沉浸阅读 |
| `reader.page.turn.next-prev` | P0 | 阅读翻页，正文动效核心 |
| `reader.chapter.jump` | P0 | 章节跳转 |
| `reader.control.handle.press` | P0 | 小横条直接操控起点 |
| `reader.control.handle.drag` | P0 | 小横条跟手预览；此前漏列，现与 press/release 连续纳管 |
| `reader.control.handle.release` | P0 | 小横条释放并收束到 snap / expand / collapse |
| `reader.control.dock.longPress` | P0 | 宽屏 Dock 长按进入可移动状态 |
| `reader.control.dock.drag` | P0 | Dock 在 ReaderFrame 合法范围内跟手移动 |
| `reader.control.dock.release` | P0 | 保存当前 viewport class 的合法位置 |
| `reader.control.dock.rebound` | P0 | viewport / bounds 改变后的越界回弹 |
| `reader.control.show` | P0 | 沉浸阅读进入控制首页 |
| `reader.control.hide` | P0 | 控制首页或快捷栏回到沉浸阅读 |
| `reader.quick.promote` | P0 | 控制首页进入目标快捷栏 |
| `reader.module.switch` | P0 | 控制首页或模块快捷栏切换目标模块 |
| `reader.panel.expand` | P0 | 模块快捷栏提升为完整设置页 |
| `reader.panel.collapse` | P0 | 完整设置页收回对应模块快捷栏 |
| `reader.session.capsule.enter` | P0 | 运行胶囊进入 |
| `reader.session.capsule.update` | P0 | 胶囊更新 |
| `reader.session.capsule.exit` | P0 | 胶囊退出 |
| `reader.session.capsule.switch` | P0 | TTS/auto-page 互斥切换 |
| `reader.session.controlSpace.enter` | P0 | 保留 MotionId；产品语义待新规格 |
| `reader.session.controlSpace.exit` | P0 | 保留 MotionId；产品语义待新规格 |
| `reader.session.tts.start` | P0 | TTS 启动事务 |
| `reader.session.autoPage.start` | P0 | 自动翻页启动事务 |
| `source.switch.route.push` | P0 | 换源 FlowShell 入栈，保留阅读连续性锚点 |
| `source.switch.route.pop` | P0 | 取消换源并弹出 FlowShell |
| `source.switch.route.replace` | P0 | 换源确认 / 回滚后替换当前 FlowShell |
| `overlay.sheet.enter` | P0 | 底表进入 |
| `overlay.sheet.exit` | P0 | 底表退出 |
| `overlay.dialog.enter` | P0 | 弹窗进入 |
| `overlay.dialog.exit` | P0 | 弹窗退出 |
| `overlay.keyboard.enter-exit` | P0 | 键盘进入退出 |
| `motion.interrupt.cancel` | P0 | 打断取消 |
| `motion.interrupt.redirect` | P0 | 打断重定向 |
| `motion.interrupt.completeThenReplace` | P0 | 打断完成后替换 |
| `viewport.orientation.reshape` | P0 | 折叠屏 / 旋转重排 |
| `state.loading.inline` | P0 | inline loading |
| `feedback.toast.enter` | P0 | Toast 进入 |
| `feedback.toast.exit` | P0 | Toast 退出 |

P0 共 47 项。剩余 48 项 MotionId 归 P1，P1 集合见 [motion.fixtures.json](./fixtures/motion.fixtures.json) 全集。`reader.sourceSwitch.open-close` 仅保留 deprecated ABI 兼容，不再列入 P0 实现入口。

## 2. MotionSpec 结构化字段（Phase 1 Motion Runtime）

Phase 1 给每条 MotionSpec 新增 6 个结构化字段，让平台 MotionAdapter 不再依赖字符串 guardRules 解析，且 MotionPolicy / Resolver 可以按 `operation` / `containerRole` 匹配。权威源为 [motion.schema.json](./motion.schema.json)，fixture 在 [motion.fixtures.json](./fixtures/motion.fixtures.json)。

### 2.1 `implementationKind` 动效实现分类

平台 MotionAdapter 按此字段选择执行路径。enum 值：

| 值 | 含义 |
| --- | --- |
| `routeTransition` | 路由切换（push / pop / replace） |
| `tabTransition` | 主 Tab 切换 |
| `overlayTransition` | overlay / sheet / dialog / keyboard |
| `stateReplace` | 状态页原地替换（搜索 / loading / content replace） |
| `readerEntry` | 阅读器进入（coverToImmersive / actionToImmersive） |
| `readerPageTurn` | 翻页 / 章节跳转 |
| `directManipulation` | 手势跟随（drag / slider） |
| `sessionCapsule` | TTS / auto-page 胶囊事务 |
| `orientationReshape` | 折叠屏 / 旋转重排（prepare / reshape / settle） |
| `componentFeedback` | 组件级反馈（button / card / chip / toast） |

`implementationKind` 是必填字段。

### 2.2 `containerRole` 动效所属容器角色

用于 MotionPolicy 匹配。enum 值：`appShell` / `mainTabShell` / `readerShell` / `libraryShell` / `settingsShell` / `flowShell` / `overlayHost` / `inlineState` / `listItem` / `card` / `readerSurface` / `sessionCapsule`。

### 2.3 `operation` 切换意图

页面只声明 `operation`，不指定具体 MotionId，由 [ReaderMotionResolver](#7-motionpolicy--readermotionresolver-phase-2-motion-runtime) 解析。enum 值：

| 值 | 含义 |
| --- | --- |
| `push` | 路由推进 |
| `pop` | 路由返回 |
| `replace` | 原地替换 |
| `tabSwitch` | Tab 切换 |
| `enter` | overlay / session 进入 |
| `exit` | overlay / session 退出 |
| `update` | 同宿主原地更新 |
| `dragStart` | 拖拽开始 |
| `dragUpdate` | 拖拽中（跟手） |
| `dragRelease` | 拖拽释放 |
| `reshape` | 折叠屏 / 旋转重排 |
| `settle` | 重排落位 |

12 个 operation 是 MotionPolicy 匹配的主要维度，fixtures 必须覆盖全部 12 个。

### 2.4 `visualPattern` 视觉模式

平台 MotionAdapter 内部映射到原生动画 API。enum 值：`nativeStackForward` / `nativeStackBackward` / `fadeReplace` / `slideSheetUp` / `scaleDialog` / `matchedCoverToReader` / `pageTurn` / `directDrag` / `capsuleAnchorMove` / `noMotion`。

### 2.5 `interruptPolicy` 打断策略

`guardRules` 中 `interrupt:*` 的结构化投影。enum 值：

| 值 | 含义 |
| --- | --- |
| `redirect` | 新动效接管，旧动效立即停止 |
| `cancel` | 取消当前动效，回退到稳定状态 |
| `completeThenReplace` | 完成当前动效后再替换 |
| `updateInSameHost` | 同宿主原地更新（如 capsule countdown tick） |

派生规则：
- 若 `guardRules` 含 `interrupt:cancel` → `interruptPolicy = cancel`
- 若 `guardRules` 含 `interrupt:redirect` → `interruptPolicy = redirect`
- 若 `guardRules` 含 `interrupt:completeThenReplace` → `interruptPolicy = completeThenReplace`
- `guardRules` 允许多值格式 `interrupt:cancel|redirect`，`interruptPolicy` 必须取其中一个
- `motion.interrupt.*` 自身的 `interruptPolicy` 从 id 派生（如 `motion.interrupt.cancel` → `cancel`）

`interruptPolicy` 是必填字段。

### 2.6 `reducedMotionPolicy` reduced-motion 降级策略

`guardRules` 中 `reducedMotion:*` / `dragMustFollowFinger:*` / `releaseToSnap:*` 的结构化投影。enum 值：

| 值 | 含义 |
| --- | --- |
| `zeroDuration` | 时长归零，状态语义不变 |
| `keepDirectManipulation` | 手势跟随不可降级（drag / slider 必须跟手） |
| `noMotion` | 无视觉效果（瞬切） |

派生规则：
- 若 `guardRules` 含 `dragMustFollowFinger:*` 或 `releaseToSnap:*` → `reducedMotionPolicy = keepDirectManipulation`
- 否则若 `guardRules` 含 `reducedMotion:forceZeroDuration` → `reducedMotionPolicy = zeroDuration`
- `implementationKind = directManipulation` 的 MotionSpec 必须为 `keepDirectManipulation`

`reducedMotionPolicy` 是必填字段。

### 2.7 字段一致性守卫

[contracts/tests/motion-guard.test.mjs](../contracts/tests/motion-guard.test.mjs) 强制：
- 6 个字段全部存在
- `interruptPolicy` 与 `guardRules` 中 `interrupt:*` 一致
- `reducedMotionPolicy` 与 `guardRules` 中手势/reducedMotion 规则一致
- `implementationKind` / `containerRole` / `operation` / `visualPattern` 值在 schema enum 内
- `directManipulation` 类对应 `reducedMotionPolicy = keepDirectManipulation`

### 2.8 分批提升的精确状态机字段

MR0 分批为 App Route / Tab、书架布局切换、Reader 进入 / 翻页 / 章节跳转、Reader 控制层与 handle / Dock 直接操控、TTS / 自动翻页与单一 Session Capsule，以及 Orientation / Interrupt 增加六个跨端结构化字段：

- `trigger`：触发事务的语义事件集合。
- `from` / `to`：产品状态，不得写 DOM selector、CSS class 或平台私有对象。
- `interrupt`：可打断当前事务的语义事件集合；处理方式仍由 `interruptPolicy` 决定。
- `finalState`：normal、interrupt 和 reduced-motion 都必须收束到的唯一稳定终态。
- `cleanup`：退出事务前必须完成的 transient state、焦点和布局所有权清理。

[motion.schema.json](./motion.schema.json) 当前对 89 个生产 MotionId 条件必填这些字段；只有 3 个 deprecated 兼容 ID 与 3 个 contract-reserved ID 保持 optional。三端 generated model 仍以 optional 字段承载 ABI 兼容，但门禁会拒绝新增未分类的 active MotionId。

## 3. 每个 P0 MotionId 的规则

每项给出：触发 UiEvent / duration token / 结束状态 / 打断规则 / reduced-motion 降级。
完整视觉效果描述见 [MOTION_EFFECTS.md](../frontend-demo-optimized/MOTION_EFFECTS.md)。

### 3.1 应用启动 / 路由

#### `app.firstOpen.enter`
- 触发：冷启动后 `app.firstOpen.enter` UiEvent，仅播一次（`hasPlayedFirstOpen` guard）
- duration：`--fd-ds-motion-duration-firstOpen`（280ms）
- 结束状态：首屏落位，`hasPlayedFirstOpen = true`
- 打断：被 `route.push` 触发 `motion.interrupt.completeThenReplace`，跳到目标 route
- reduced-motion：duration 0ms，首屏直接落位，无淡入
- demo 等价性：浏览器 `data-motion-first-open-*` 字段证明状态流成立；不证明真机冷启动性能

#### `app.route.push.forward` / `app.route.pop.backward` / `app.route.replace`
- 触发：`route.push` / `route.pop` / `route.popToRoot` / `route.replace` UiEvent；阅读退出的 `reader.exit` 映射到 `app.route.pop.backward`
- duration：使用 `--fd-ds-motion-duration-panel`（200ms）或平台导航默认值
- 结束状态：目标 route 落位，focusTarget 回到 route 最后 focus
- 打断：新 `route.push` 触发 `motion.interrupt.redirect`；`route.pop` 触发 `motion.interrupt.cancel`
- reduced-motion：duration 0ms，直接切换
- 系统返回与阅读退出：均等价于 `app.route.pop.backward`；不新增独立 `reader.exit.*` MotionId，避免同一 back-stack 事务出现两套 ABI

### 3.2 主 Tab

#### `tab.item.select` / `tab.switch`
- 触发：`tab.item.select` / `tab.switch` UiEvent
- duration：`tabPress`（80ms）/ `tabSelect`（120ms）/ `tabSwitch`（160ms）
- 结束状态：目标 tab 选中，indicator 落位
- 打断：重复点击同 tab 触发 `motion.interrupt.cancel`；快速切 A→B→C 触发 `redirect`
- reduced-motion：duration 0ms，indicator 瞬切
- 稳定性要求：indicator 切换不推动 tab 栏布局；按下不改变热区

#### `bookshelf.view.switch`
- 触发：`bookshelf.view.switch` UiEvent；`bookshelf.view.cover | bookshelf.view.list` → `bookshelf.view.target`。
- duration：`--fd-ds-motion-duration-layoutSwitch`（320ms），easing 为 `ease-out`。
- 实现分类：`stateReplace`；所属容器为 `mainTabShell`；operation 为 `replace`；视觉模式为 `sharedLayoutMorph`。
- 视觉语义：同一批稳定 `BookItem` 在 cover/list 几何之间同步重排；不得把整个容器做 `fadeReplace`，不得把书籍作为新列表逐项飞入。
- 结束状态：`bookshelf.view.target.settled`；保留 `bookId`、滚动锚点、筛选/排序和触发器焦点。
- 打断：再次切换、`bookshelf.sortFilter.apply`、`bookshelf.group.select`、`route.replace` 或 `viewport.orientation.prepare` 按 `redirect` 收束到最新目标。
- reduced-motion：duration 0ms，直接提交目标布局；仍必须保留实体 identity、滚动锚点和焦点语义。

### 3.3 阅读器进入 / 翻页

#### `reader.entry.coverToImmersive`
- 触发：`reader.entry.coverToImmersive` UiEvent（点击书架封面）
- duration：`--fd-ds-motion-duration-readerEntry`（240ms）
- 结束状态：进入 `immersive-reading`，控制层不显示，来源 route 保留在返回栈
- 打断：连续点击触发 `motion.interrupt.redirect`；返回触发 `cancel`
- reduced-motion：duration 0ms，直接进入
- cleanup：清除封面 snapshot / pressed transient，保留来源返回栈并恢复 Reader surface focus

#### `reader.entry.actionToImmersive`
- 触发：`reader.entry.actionToImmersive`（点击 ReadButton）
- duration：`--fd-ds-motion-duration-readerEntry`（240ms）
- 结束状态与 reduced-motion 规则同上
- cleanup：清除 action transient，保留来源返回栈并恢复 Reader surface focus

#### `reader.page.turn.next-prev`
- 触发：`reader.page.next` / `reader.page.prev` UiEvent
- duration：`--fd-ds-motion-duration-pageTurn`（220ms）
- 结束状态：目标页落位，`readerPageIndex` 更新，触发 `reader.progress.update` CoreCommand
- 打断：连续翻页触发 `motion.interrupt.redirect`；chapter jump 触发 `completeThenReplace`
- reduced-motion：duration 0ms，瞬切
- 禁止：翻页动画不得改变正文排版结果；不得使用拟物翻页
- cleanup：清除临时位移和上一页 snapshot，保留页脚 / 页码锚点

#### `reader.chapter.jump`
- 触发：`reader.chapter.jump` UiEvent
- duration：`--fd-ds-motion-duration-base`（160ms）
- 结束状态：目标章节落位，Core `content.load` 返回后渲染
- 打断：连续跳转触发 `redirect`；返回触发 `cancel`
- cleanup：清除旧章节请求，页索引归零，提交新章节进度锚点并恢复 Reader surface focus

### 3.4 Reader 控制层 pilot

Reader 2 的静态控制状态按以下语义组织：`immersive.hidden`、`control.home`、七个 `control.quick.*` 和四个 `control.full.*`。正文始终占满 Reader 画布，控制层只悬浮覆盖，不得参与正文宽度或分页计算。

#### `reader.control.show` / `reader.control.hide`
- `show`：`immersive.hidden` → `control.home`；420ms、`reader.motion.duration.controlEnter`、`ease-out`。
- `hide`：`control.home | control.quick` → `immersive.hidden`；360ms、`reader.motion.duration.controlExit`、`ease-in`。
- 打断：相反显隐、route replace 或 orientation prepare 均按 `redirect` 收束到最新目标。
- 终态：只能有一个控制 surface；正文布局不变；关闭后恢复阅读热区和焦点。

#### `reader.quick.promote`
- 语义固定为 `control.home` → `control.quick.target`，对应 Search / AutoPage / Replace 等首页快捷入口；不得再用于 quick → full。
- duration：320ms、`reader.motion.duration.quickPromote`、`ease-out`。
- 终态：只显示目标快捷栏；清除旧快捷栏 transient state，正文不重排。

#### `reader.module.switch`
- 语义为 `control.home | control.quick.module.previous` → `control.quick.module.target`。
- duration：360ms、`reader.motion.duration.moduleSwitch`、合同 easing=`ease`。Figma MR1 若使用其他 easing，后续必须通过显式 Contract 变更统一，不能在 runtime 私自覆盖。
- 终态：只保留一个 active module，模块导航几何稳定。

#### `reader.panel.expand` / `reader.panel.collapse`
- `expand`：`control.quick.module` → `control.full.module`。
- `collapse`：`control.full.module` → `control.quick.module`。
- duration：expand 为 420ms、`reader.motion.duration.controlEnter`；collapse 为 360ms、`reader.motion.duration.controlExit`。expand 使用 enter easing，collapse 使用 exit easing。
- 语义 MotionId 与 `reader.control.handle.release` 分离：handle release 描述直接操控释放阶段，panel expand/collapse 描述最终业务状态迁移。
- route-bearing 抓手点击或拖拽提交时可先记录 `reader.control.handle.release`，但最终导航必须由 `reader.panel.expand/collapse` 承接，禁止绕过面板事务瞬时换页。
- 终态：清除 handle 临时 offset，只保留对应 module 的一个 quick 或 full surface，正文不重排。

#### `reader.control.handle.press` / `drag` / `release`
- `press`：`handleIdle | controlLayerVisible` → `handlePressed`；直接操控起点，duration 0，不改变热区和控制层几何。
- `drag`：`handlePressed` → `handleDragging + dragOffsetPreview`；只产生临时预览 offset，正文和分页宽度保持不变。
- `release`：`handleDragging | handlePressed` → `snapBack | expandCommitted | collapseCommitted`；120ms `reader.motion.duration.handleSnap` 仅用于释放后的收束。
- 打断：pointer cancel、route change 或 orientation prepare 必须清除临时 offset 和 pointer capture；不得留下半展开页面。
- reduced-motion：保留跟手语义，但不播放 scale、pull preview 或释放位移；直接提交唯一终态。
- route-bearing release 必须继续交给 `reader.panel.expand/collapse` 提交业务 route，handle MotionId 不独占导航事务。

#### `reader.control.dock.longPress` / `drag` / `release` / `rebound`
- `longPress`：固定宽度 Dock 长按 320ms 后进入 `dockDragArmed`；只在 `expanded-width`、`tablet-expanded`、`compact-landscape` 生效。
- `drag`：Dock sheet 与 module nav 作为一个固定尺寸组跟手移动，offset 始终 clamp 在 ReaderFrame 内 16dp/pt/vp 安全边距。
- `release`：提交合法 offset，并按 viewport class 分开保存；120ms 只用于释放后的短收束。
- `rebound`：bounds、viewport class 或尺寸变化后，把旧 offset clamp 到当前合法范围；终态只能是 `dockOffsetLegalInCurrentBounds`。
- 打断：pointer cancel、route change、orientation prepare、viewport class change 不得遗留 preview transform；正文不重排，Dock 不跨 hinge / safe area。
- reduced-motion：保留直接操控和 clamp，移除 arm halo、scale 与回弹插值。

### 3.5 阅读会话胶囊

#### `reader.session.tts.start` / `reader.session.autoPage.start`
- 触发：`reader.session.ttsStart` / `reader.session.autoPageStart` UiEvent。
- duration：`sessionReturn`（200ms）；从可见控制层提交唯一 session owner，返回沉浸阅读并显示同一颗胶囊。
- 结束状态：`ttsOwnsSessionAndCapsule` / `autoPageOwnsSessionAndCapsule`；TTS 与 auto-page 互斥，不允许同时拥有会话。
- 打断：另一种 session 启动、stop、退出阅读或 route change；latest intent 获胜并释放旧 owner。

#### `reader.session.capsule.enter` / `update` / `switch` / `exit`
- 触发：`reader.session.capsuleEnter` / `reader.tts.toggle` / `reader.session.capsuleSwitch` / `reader.session.capsuleExit` UiEvent。
- duration：enter / switch / exit 使用 `capsuleEnter`（160ms）；update 使用 `capsuleControl`（120ms）。
- 结束状态：同一 status anchor 上显示、局部更新、替换 session type 或隐藏并释放 hit target；切换不得产生第二颗胶囊。
- 打断：switch 使用 `completeThenReplace`；enter / update / exit 在 session 停止、控制层打开、退出阅读或 route change 时取消并清理瞬态状态。
- reduced-motion：duration 0ms，直接提交相同终态。

#### `reader.session.capsule.control.press-toggle` / `countdownTick` / `voiceIcon.active`
- 播放切换和倒计时只更新胶囊内部，分别使用 `capsuleControl` / `capsuleTick`（120ms）；点击播放按钮不得打开控制层。
- 倒计时保持固定宽度数字槽，不重放胶囊 enter；TTS voice icon 使用 `voicePulse`（960ms、linear、autoreverse loop）。
- pause、session switch、stop 或 reduced-motion 必须取消 voice pulse 并恢复静态图标；所有微动效保留 status anchor 和 hit area。

`reader.session.controlSpace.*` 继续作为 contract-reserved MotionId 保留，不计入当前生产路径的精确状态机；当前产品只渲染一颗沉浸阅读胶囊，不重新引入控制层重复 DOM 或双主控。

### 3.6 Overlay

#### `overlay.sheet.enter` / `overlay.sheet.exit`
- 触发：`overlay.sheet.open` / `overlay.sheet.close` UiEvent
- duration：`overlay`（240ms）
- 结束状态：底表落位 / 收起
- 方向：从底部进入
- 打断：`route.pop` 触发 `cancel`，立即收起
- reduced-motion：duration 0ms，瞬显/瞬隐

#### `overlay.dialog.enter` / `overlay.dialog.exit`
- 触发：`overlay.dialog.open` / `overlay.dialog.close`
- duration：`overlay`（240ms）
- 方向：从中心 scale + fade 进入
- 打断：系统返回触发 `cancel`

#### `overlay.keyboard.enter-exit`
- 触发：`overlay.keyboard.open` / `overlay.keyboard.close`
- duration：`overlay`（240ms）
- 方向：从底部进入
- inset：见 §4.5
- 打断：`route.pop` 触发 `cancel`，键盘关闭后路由

### 3.7 打断

#### `motion.interrupt.cancel` / `motion.interrupt.redirect` / `motion.interrupt.completeThenReplace`
- 触发：对应的 `motion.interrupt.cancel` / `redirect` / `completeThenReplace` UiEvent；runtime 入口包括返回、路由推进/替换、Tab 或 dropdown 新目标、loading 完成、拖动开始和 pointer cancel。
- duration：三种策略都使用 `interruptSettle`（80ms）；reduced-motion 直接提交同一终态。
- `cancel`：从 running / pressed / dragging / entering 回到 `latestCommittedState`，终态 `transientMotionCleared`；取消活跃事务并清除 pressed、drag preview、entering 与非法 transform。
- `redirect`：旧目标立即释放所有权，新目标成为唯一 motion owner，终态 `newTargetOwnsMotion`；不得先闪回旧终态或保留旧 target snapshot。
- `completeThenReplace`：必须可见的旧状态先完成或直接 commit，只有仍属于当前 route/request 的 replacement 可以显示；过期异步结果必须 discard。
- 连续新打断、route change、destroy 或更新的 async result 必须 latest-wins，并且不能遗留重复 target、pending request 或失效焦点。

### 3.8 折叠屏 / 旋转

#### `viewport.orientation.prepare` / `reshape` / `settle`
- 触发：三个同名 UiEvent；runtime 在 orientation 或 viewport class 改变时启动完整事务。
- `prepare`：`orientationFreeze`（80ms），从 `viewportStable` 到 `viewportFrozen`；取消直接操控，捕获当前 metrics、分页字符锚点、session / overlay / focus 快照，只保留最新一组 pending metrics。
- `reshape`：`viewportReshape`（240ms），从 frozen/stable 到 `viewportReshaped`；提交最新 metrics，恢复正文分页锚点，并把 overlay、唯一 capsule 与 dock 重新锚定和 clamp 到合法区域。
- `settle`：`orientationSettle`（240ms），从 reshaped 回到 `viewportStable`；释放 orientation role targets，恢复仍有效的焦点、指针交互和 active session 微动效。
- 结束状态：route / 返回栈 / activeSession 不丢；正文不跳章；overlay / capsule / dock 不越界；焦点只回到仍属于当前 route 的目标。
- 新 metrics / fold change 使用 `completeThenReplace` 接管；route change 取消旧事务。reduced-motion 依次提交三阶段终态但不做插值。

### 3.9 状态反馈

#### `state.loading.inline`
- 触发：`state.loading.inline` / `reader.toc.load` / `reader.content.load` / `search.loadMore` / `source.switch.loading` UiEvent
- duration：`loadingSpin`（800ms 循环）
- 结束状态：仅最新 request 拥有 inline loading；Core/Host 返回 terminal result 后停止，过期结果丢弃
- 打断：取消、更新请求、route change 使用 `completeThenReplace`，清除旧 timer/spinner/request ownership
- reduced-motion：禁用循环动画，显示静态 loading 指示

#### `feedback.toast.enter` / `feedback.toast.exit`
- 触发：`feedback.toast.show` / `feedback.toast.dismiss`
- duration：`feedbackToast`（180ms）
- 结束状态：Toast 由单一 host 持有；enter 后显示并通过 polite live region 宣告，exit 后释放 host/timer/hit target
- 打断：新 Toast 使用 `feedback.toast.update` 在同一 host 原地接管并替换 auto-dismiss timer，不叠加多个 Toast
- reduced-motion：enter/update/exit 均以 0ms 提交终态，仍保留 announce、latest-wins 与 dismiss 语义

### 3.10 换源 FlowShell 路由

#### `source.switch.route.push` / `source.switch.route.pop` / `source.switch.route.replace`
- 触发：`source.switch.open` / `source.switch.cancel` / `source.switch.confirm|rollback`
- duration：入栈 `route`（280ms）、出栈 `routePop`（240ms）、替换 `routeReplace`（200ms）
- 方向：按 FlowShell 原生路由栈前进 / 后退；替换使用同位 fade replace，不使用全屏阻断式遮罩
- 连续性：push 保留 Reader 阅读锚点，pop 恢复原阅读焦点，replace 只允许最新换源结果提交
- 打断：新换源意图、返回、异步结果覆盖与 route change 分别按 fixture 的 `cancel` / `completeThenReplace` 收口
- `reader.sourceSwitch.open-close` 已 deprecated，仅作旧消费者 ABI 兼容；新前端与三端 Host 不得再绑定该 overlay MotionId

## 4. 通用交互规则

### 4.1 手势阈值

来源：[MOTION_IMPLEMENTATION_GAP_AUDIT.md](../frontend-demo-optimized/MOTION_IMPLEMENTATION_GAP_AUDIT.md) P1 手势阈值缺口。

P0 阶段必须明确的阈值：

| 手势 | 阈值 | 规则 |
| --- | --- | --- |
| slider drag slop | 4dp / 4pt / 4vp | 小于阈值不视为 drag |
| slider drag 跟手 | 0ms easing | 拖动中无 easing，释放才 snap/commit |
| Reader handle drag slop | 4dp / 4pt / 4vp | 小于阈值仍是 press；超过后才进入 `reader.control.handle.drag` |
| Reader quick handle commit | 34dp / 34pt / 34vp | 到达方向阈值后提交 expand / collapse，否则 snap back |
| Reader full handle collapse | 16dp / 16pt / 16vp | full panel 使用短路径阈值，避免页面长距离被拉扯 |
| Reader Dock long press | 320ms | 到时才 arm Dock drag；移动或取消必须清除 timer |
| Reader Dock safe margin | 16dp / 16pt / 16vp | Dock group 的合法 bounds 与 ReaderFrame 保持安全边距 |
| list fling velocity | ≥ 500 dp/s | 触发 fling |
| tab tap debound | 80ms | 快速重复点击只触发一次 |

P1 阶段需要补的阈值（P0 不阻塞）：
- 亮度 / 进度拖动精确阈值
- 底表拖拽关闭阈值
- 翻页拖动阈值

### 4.2 拖拽边界

- slider drag：沿 slider 轴向，clamp 到 min/max
- list drag：沿列表轴向，无边界（虚拟列表）
- Reader handle drag：只修改临时 y preview；释放前不提交 route
- Reader Dock drag：sheet + module nav 作为一个固定尺寸组移动，按 ReaderFrame bounds clamp，并按 viewport class 保存
- 所有 drag 期间：不触发 `route.push`、不触发 `overlay.open`、不修改 Core state

### 4.3 焦点恢复

来源：[STATE_OWNERSHIP.md](./STATE_OWNERSHIP.md) §6 + 本仓 `motionOverlayFocusReturn` / `motionOverlayReturnTarget`。

| 场景 | 焦点恢复目标 |
| --- | --- |
| 关闭 overlay | 回到打开 overlay 的触发器 |
| 系统返回关闭 overlay | 同上 |
| `route.pop` | 回到上一页最后 focusTarget |
| `route.push` | 新页面的默认 focus（第一个可聚焦组件）|
| dialog 关闭 | 回到打开 dialog 的触发器 |
| sheet 关闭 | 回到打开 sheet 的触发器 |
| TTS / auto-page 启动 | 胶囊内主控按钮 |
| TTS / auto-page 退出 | 回到启动前记录的 focusTarget |

平台必须实现：
- 焦点变化写入 `ui-state.focusTarget`
- 关闭浮层时 reducer 把 focusTarget 写回 returnTarget
- VoiceOver / TalkBack / 屏幕阅读器焦点同步（P1 验收）

### 4.4 system back

来源：[STATE_OWNERSHIP.md](./STATE_OWNERSHIP.md) §6。

system back 等价表：

| 当前状态 | system back 行为 |
| --- | --- |
| overlay 打开 | 关闭 overlay（不退出页面）|
| dialog 打开 | 关闭 dialog |
| sheet 打开 | 关闭 sheet |
| 键盘打开 | 关闭键盘 |
| TTS / auto-page session 运行 | 退出 session |
| 阅读器内（无 overlay）| `reader.exit` → `route.pop` |
| 二级页面 | `route.pop` |
| 主 Tab 根 route | 平台决定（通常退出 App）|

平台必须实现 back handler 链：overlay > dialog > sheet > keyboard > session > route。

### 4.5 键盘 inset

- 含输入的 route（见 [PAGE_REFERENCE.md](./PAGE_REFERENCE.md) §10 keyboard）必须处理 keyboard inset
- 键盘弹出：内容区上移 `--fd-ds-space-keyboard-gap`（12px）+ 键盘高度
- 键盘关闭：内容区复位
- 键盘弹出期间禁止 `route.push`
- iOS：`KeyboardObserver` / `safeAreaInsets`；Android：`WindowInsets.ime`；HarmonyOS：`avoidArea` / `expandSafeArea`

### 4.6 safe area / fold posture

- 顶部 / 底部 / 水平 safe area 使用 `--fd-ds-space-safe-area-*` token
- 折叠屏 hinge：浮动交互面不跨 hinge
- fold posture 变化触发 `viewport.orientation.reshape`
- 平台必须使用原生 fold posture API（不依赖 Web `visualViewport`）

## 5. Reduced-motion 降级

来源：[STATE_OWNERSHIP.md](./STATE_OWNERSHIP.md) §6 + [MOTION_CONTRACT.md](../frontend-demo-optimized/MOTION_CONTRACT.md)。

启用条件：
- 系统级 reduced-motion（iOS `UIAccessibility.isReduceMotionEnabled` / Android `Animator.areAnimatorsEnabled()` / HarmonyOS `accessibility` 设置）
- URL / 测试开关 `?motionReduced=1`（仅 demo proof）
- 用户在 settings 内主动开启（`reducedMotion.enable` UiEvent）

降级规则：
- 所有 motion-duration 强制为 0ms
- 禁用循环动画（loading spin / voicePulse / capsule countdown tick）
- 禁用位移 / scale 动画；状态变化用颜色 / 透明度
- 翻页瞬切，不使用方向位移
- 状态反馈仍可辨认（loading 用静态指示，toast 用 fade）

降级不改变：
- 状态语义（`activeSession` / `overlay` / `readerMode`）
- 焦点恢复
- async guard
- transition-guard（overlay 互斥仍经 `null` 中转，但 0ms）

## 6. demo 等价性边界

哪些 demo 动效只是浏览器证明，不能直接等价为端侧完成：

| demo 表现 | 端侧不等价理由 |
| --- | --- |
| `data-motion-*` 状态字段 | 是 demo proof 字段，不是平台 API；平台用 reducer state |
| Web CSS transition / `transform` | 平台必须用原生动画 API（`Animation` / `animateTo` / `withAnimation`）|
| `visualViewport.resize` | 平台用原生 fold posture / orientation API |
| `?motionReduced=1` URL 参数 | 平台读系统 accessibility 设置 |
| demo route stack（`window.history`）| 平台用原生导航栈 |
| `data-motion-overlay-*` | 平台用 `ui-state.overlay` |
| `data-motion-session-capsule-*` | 平台用 `ui-state.activeSession` + 胶囊 reducer |
| `data-motion-orientation-*` | 平台用原生 orientation / fold API |
| 浏览器截图 / manifest | 平台必须真机录屏 |
| `frontend-demo-optimized/verify/motion/evidence/` | demo proof，不是平台 evidence；平台 evidence 见 [PLATFORM_EVIDENCE_SPEC.md](./PLATFORM_EVIDENCE_SPEC.md) |
| matched geometry（snapshot 层）| 平台用 SwiftUI `.matchedGeometryEffect` / Compose `SharedTransitionLayout` / ArkUI `sharedTransition` |

demo 等价的部分（可作为端侧实现参考）：
- MotionId 命名
- state fields（from / to / interrupt / finalState）
- duration token 数值
- 打断规则（cancel / redirect / completeThenReplace）
- reduced-motion 降级规则
- 互斥 / async guard / transition-guard 规则

## 7. MotionPolicy / ReaderMotionResolver（Phase 2 Motion Runtime）

Phase 2 引入 MotionPolicy 规则表与 ReaderMotionResolver，让平台业务页面只声明 `operation` / `sourceRole` / `targetRole` / `containerRole`，由 Resolver 解析到具体 MotionId，再从 MotionSpecRegistry 取规格交给 MotionAdapter 执行。

权威源：[motion-policy.schema.json](./motion-policy.schema.json)、[motion-policy.fixtures.json](./fixtures/motion-policy.fixtures.json)。

### 7.1 MotionPolicy 结构

```json
{
  "id": "route-push-default",
  "priority": 100,
  "match": {
    "operation": "push"
  },
  "motionId": "app.route.push.forward"
}
```

字段：
- `id`：policy 规则 id（如 `route-push-default`）
- `priority`：匹配优先级，数值越大越先匹配。同 priority 时按 match 字段数量（specificity）降序
- `match`：匹配条件，省略的字段视为通配。canonical fixtures 禁止空 `match = {}`，避免未知请求被伪装成已有 MotionId
- `match.fromRoute` / `match.toRoute`：来源 / 目标 RouteId
- `match.fromShell` / `match.toShell`：来源 / 目标 shell（`MainTabShell` / `LibraryShell` / `ReaderShell` / `SettingsShell` / `FlowShell`）
- `match.operation`：切换意图（与 [motion.schema.json](./motion.schema.json) `operation` enum 对齐，12 个值）
- `match.sourceRole`：来源语义角色（如 `bookCover` / `actionButton` / `slider` / `orientation`）
- `match.targetRole`：目标语义角色（如 `sheet` / `dialog` / `dropdown` / `toast`）
- `match.containerRole`：容器角色（与 [motion.schema.json](./motion.schema.json) `containerRole` enum 对齐，12 个值）
- `match.reducedMotion`：是否启用 reduced-motion
- `motionId`：解析结果 MotionId（必须存在于 [motion.schema.json](./motion.schema.json) `id` enum）

### 7.2 MotionPolicy fixtures 覆盖

[motion-policy.fixtures.json](./fixtures/motion-policy.fixtures.json) 当前 53 条 policy，覆盖全部 12 个 `operation`：

| priority 层级 | 覆盖场景 |
| --- | --- |
| 50 | 明确声明 targetRole 的 interrupt redirect |
| 100 | route push/pop/replace defaults + componentFeedback |
| 150 | tab item / toggle / input |
| 200 | tab switch / inline state |
| 250 | overlayHost dropdown / toast |
| 300 | readerShell overlay / readerSurface / slider / orientation |
| 320 | Reader control pilot 的 show/hide/quick/module/expand/collapse |
| 350 | reader entry / session capsule |

用户原始规格要求的 5 条示例 policy 均已落地：
- `route-push-default`（priority 100, operation=push → `app.route.push.forward`）
- `route-pop-default`（priority 100, operation=pop → `app.route.pop.backward`）
- `main-tab-switch`（priority 200, operation=tabSwitch → `tab.switch`）
- `bookshelf-cover-to-reader`（priority 350, fromShell=MainTabShell, toShell=ReaderShell, operation=push, sourceRole=bookCover → `reader.entry.coverToImmersive`）
- `reader-overlay-sheet-enter`（priority 300, containerRole=readerShell, operation=enter, targetRole=sheet → `overlay.sheet.enter`）

### 7.3 ReaderMotionResolver 接口

```text
resolveMotion({
  fromRoute,
  toRoute,
  fromShell,
  toShell,
  operation,
  sourceRole,
  targetRole,
  containerRole,
  reducedMotion
}) -> MotionResolution { motionId?, diagnostic? }
```

解析逻辑：
1. 若调用方未传 `fromShell` / `toShell` 但传了 `fromRoute` / `toRoute`，由 `RouteShellLookup`（从 [route.fixtures.json](./fixtures/route.fixtures.json) 派生，76 条 route→shell 映射）补全
2. 将全部 policy 按 `priority` 降序排序；同 priority 按 `match` 字段数（specificity）降序排序
3. 依次匹配，第一条 `match` 命中的 policy 返回其 `motionId`
4. 全部未命中返回空 `motionId` 和 `motion.policy.no-match` diagnostic；兼容的 `resolve` 便捷函数只返回 optional MotionId

Resolver 是纯函数，不修改输入 request，无副作用。未知请求不得返回 `motion.interrupt.redirect` 或其他伪造的 MotionId。

### 7.4 三端生成产物

`node tools/codegen/generate.mjs` 生成：

**MotionSpecRegistry**（Phase 1）：
- Swift：`generated/swift/Motion.swift` 的 `MotionSpecRegistry`
- Kotlin：`generated/kotlin/Motion.kt` 的 `MotionSpecRegistry`
- ArkTS：`generated/arkts/Motion.ets` 的 `motionSpecRegistry`

每条 MotionSpec 包含基础字段：`id` / `durationMs` / `easing` / `implementationKind` / `containerRole` / `operation` / `visualPattern` / `interruptPolicy` / `reducedMotionPolicy` / `tokens.durationToken` / `tokens.easingToken` / `guardRules`。当前 89 个生产 MotionId 另外包含 `trigger` / `from` / `to` / `interrupt` / `finalState` / `cleanup`；只有 3 个 deprecated 与 3 个 contract-reserved 条目保持 optional。

**MotionPolicy + ReaderMotionResolver**（Phase 2）：
- Swift：`generated/swift/MotionPolicy.swift`（`MotionPolicyRegistry` + `RouteShellLookup` + `ReaderMotionResolver.resolve`）
- Kotlin：`generated/kotlin/MotionPolicy.kt`（`MotionPolicyRegistry` + `RouteShellLookup` + `ReaderMotionResolver.resolve`）
- ArkTS：`generated/arkts/MotionPolicy.ets`（`motionPolicyRegistry` + `routeShellLookup` + `resolveMotion` 函数）

平台调用方式（Swift 示例）：
```swift
let motionId = ReaderMotionResolver.resolve(
    MotionRequest(
        fromRoute: currentRoute,
        toRoute: nextRoute,
        operation: .push,
        sourceRole: .bookCover
    )
)
readerMotion.run(motionId) {
    navigationPath.append(nextRoute)
}
```

业务页面禁止直接写 `withAnimation` / `animate*AsState` / `animateTo`，必须经 Resolver + MotionAdapter。

### 7.5 测试覆盖

- [contracts/tests/motion-policy.test.mjs](../contracts/tests/motion-policy.test.mjs)：schema、id、12 operation、pilot 显式 policy、无空 fallback 门禁
- [contracts/tests/motion-resolver.test.mjs](../contracts/tests/motion-resolver.test.mjs)：基础 resolver、pilot 显式 policy、unknown diagnostic、优先级与纯函数门禁
- [contracts/tests/motion-guard.test.mjs](../contracts/tests/motion-guard.test.mjs)：基础字段、已审计家族条件必填状态机和 duration/token 一致性门禁
- [contracts/tests/codegen-idempotent.test.mjs](../contracts/tests/codegen-idempotent.test.mjs)：三端 42 个生成文件幂等
- [contracts/tests/codegen-consistency.test.mjs](../contracts/tests/codegen-consistency.test.mjs)：三端 16 个文件存在 + enum 一致

当前 canonical 覆盖状态：
- `motion.schema.json`：95 个 MotionId + 6 个 Phase 1 基础字段 + 分批精确状态机字段
- `motion.fixtures.json`：95 条 MotionSpec fixture；89 个生产 MotionId 已有精确状态机，其余 6 条封闭为 3 个 deprecated 与 3 个 contract-reserved
- `motion-policy.schema.json`：MotionPolicy 契约
- `motion-policy.fixtures.json`：53 条显式 policy，覆盖全部 12 operation，无空 match fallback
- `generated/swift/Motion.swift` + `MotionPolicy.swift`、`generated/kotlin/Motion.kt` + `MotionPolicy.kt`、`generated/arkts/Motion.ets` + `MotionPolicy.ets`：均生成完整 registry + resolver

注意：`frontend-demo-optimized/verify/motion/motion-coverage-report.json` 的 runtime / selector resolution 数量不是 canonical schema 总数。canonical 95/95 以本节 schema + fixture + generated registry 为准。

## 8. MotionId 新增 / 废弃流程

1. 在 [motion.schema.json](./motion.schema.json) `id.enum` 新增 MotionId。
2. 在 [motion.fixtures.json](./fixtures/motion.fixtures.json) 新增对应 fixture（含 durationMs / easing / 6 个 Phase 1 结构化字段 / tokens / guardRules）。
3. 确认 [motion-policy.schema.json](./motion-policy.schema.json) 继续通过 `$ref` 引用 `motion.schema.json#/$defs/MotionId`，不得复制第二份 enum。
4. 在 [token.fixtures.json](./fixtures/token.fixtures.json) 新增对应 motion-duration token（如需新 token）。
5. 在 [MOTION_EFFECTS.md](../frontend-demo-optimized/MOTION_EFFECTS.md) 补视觉效果描述。
6. 若新 MotionId 需要被 Resolver 解析，在 [motion-policy.fixtures.json](./fixtures/motion-policy.fixtures.json) 新增对应 policy 规则。
7. 三端 `MotionAdapter` 同步新增映射（归平台仓库）。
8. 跑 `node --test contracts/tests/*.test.mjs` 校验。
9. 跑 `node tools/codegen/generate.mjs` 重新生成 `generated/{swift,kotlin,arkts}/Motion.*` 与 `MotionPolicy.*`。
10. 跑 `node tools/codegen/check-drift.mjs` 校验生成幂等。

废弃：`deprecated: true` + 至少保留一个 MINOR 周期。

## 9. 缺口与下一步

Phase 1-2 Motion Runtime 基础已完成：
- 95 个 MotionId 全部保有 6 个基础结构化字段（implementationKind / containerRole / operation / visualPattern / interruptPolicy / reducedMotionPolicy）
- App First Open / Route、Tab / Segment、dropdown、书架布局切换、Reader 进入 / 翻页 / 章节跳转、Reader control、handle / Dock、真实 Session / Capsule、Orientation / Interrupt、换源 FlowShell / Overlay / Focus、inline loading / Toast、input/search/content replace、基础交互原语，以及筛选 / 选择 / 危险确认 / tooling，共 89 个生产 MotionId 已补精确状态机字段并生成到三端 registry
- MotionPolicy 规则表（53 条显式 policy，覆盖全部 12 operation）+ 带 no-match diagnostic 的 ReaderMotionResolver 纯函数
- 三端生成 MotionSpecRegistry + MotionPolicyRegistry + RouteShellLookup + ReaderMotionResolver
- 相关 contract/runtime tests 与 generated drift check 作为持续门禁；实时结果以当前测试输出为准，不在本文固化易漂移的用例数量

静态 VC0–VC3 通过后，剩余 Motion 缺口按 MR0–MR5 处理：
- 当前没有未分类的 active MotionId。6 个无 exact 字段的条目只允许是门禁列出的 3 个 deprecated 与 3 个 contract-reserved；新增 MotionId 若进入生产路径，必须同时补 `trigger/from/to/interrupt/finalState/cleanup`。除非产品重新引入控制层重复胶囊，不得把 `controlSpace.*` 伪装为 runtime DOM。
- 平台 MotionAdapter 深化（MR4，归 `Reader-for-iOS` / `Reader-for-Android` / `Reader-for-HarmonyOS` 仓库）
- 切换入口统一改造与平台 lint（MR4，navigator.push/pop/replace、tabs.switchTo、overlay.present/dismiss，归平台 Native UI）
- 亮度 / 进度拖动精确阈值（P1 补）
- 底表拖拽关闭阈值（P1 补）
- VoiceOver / TalkBack 焦点迁移规则（P1 补）
- 性能预算（FPS / layout shift / 动画属性白名单）（P1 补）
- 真机录屏 evidence（归三端仓库，见 [PLATFORM_EVIDENCE_SPEC.md](./PLATFORM_EVIDENCE_SPEC.md)）
