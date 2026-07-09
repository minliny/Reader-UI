# Motion Spec

状态：Phase 1-2 Motion Runtime 可执行参考规格
日期：2026-07-04
权威源：[motion.schema.json](./motion.schema.json)、[motion.fixtures.json](./fixtures/motion.fixtures.json)、[motion-policy.schema.json](./motion-policy.schema.json)、[motion-policy.fixtures.json](./fixtures/motion-policy.fixtures.json)、[token.fixtures.json](./fixtures/token.fixtures.json) motion-duration/motion-easing
来源：[frontend-demo/MOTION_CONTRACT.md](../frontend-demo/MOTION_CONTRACT.md)、[frontend-demo/MOTION_EFFECTS.md](../frontend-demo/MOTION_EFFECTS.md)、[frontend-demo/MOTION_IMPLEMENTATION_GAP_AUDIT.md](../frontend-demo/MOTION_IMPLEMENTATION_GAP_AUDIT.md)、[frontend-demo/verify/motion/motion-coverage-report.json](../frontend-demo/verify/motion/motion-coverage-report.json)、[STATE_OWNERSHIP.md](./STATE_OWNERSHIP.md) §6

本文是 Motion Runtime P0/P1 阶段的"动效和交互规范"。归并现有 `frontend-demo/MOTION_*.md` 文档到 contracts/ 权威源，定义 P0 MotionId 集合、触发/结束/打断规则、reduced-motion 降级、手势阈值、demo 等价性边界，并定义 Phase 1 MotionSpec 结构化字段与 Phase 2 MotionPolicy / ReaderMotionResolver 规则。

## 0. 文档边界

本文覆盖：
- P0 MotionId 集合（高风险 + 必须三端验证）
- 每个 P0 MotionId 的触发条件、结束状态、打断规则、reduced-motion 降级
- 通用交互规则：手势阈值、拖拽边界、焦点恢复、system back、键盘 inset
- demo 等价性边界：哪些 demo 动效只是浏览器证明
- Phase 1 Motion Runtime：MotionSpec 6 个结构化字段（implementationKind / containerRole / operation / visualPattern / interruptPolicy / reducedMotionPolicy）的 enum 与派生规则
- Phase 2 Motion Runtime：MotionPolicy 规则表与 ReaderMotionResolver 接口

本文不覆盖：
- 不重复 84 个 MotionId 全集（以 [motion.schema.json](./motion.schema.json) enum 为准）
- 不重复 motion-duration 数值（以 [token.fixtures.json](./fixtures/token.fixtures.json) 为唯一源）
- 不写 Compose / SwiftUI / ArkUI 实现代码（归三端仓库）
- 不重复视觉效果描述（以 [MOTION_EFFECTS.md](../frontend-demo/MOTION_EFFECTS.md) 为准）
- 不写平台 MotionAdapter 实现细节（归三端仓库，见 [PLATFORM_EVIDENCE_SPEC.md](./PLATFORM_EVIDENCE_SPEC.md)）

权威层级：
1. **Contract 层**（本仓）：MotionId / state fields / from / to / interrupt / finalState / reducedMotion
2. **Demo proof 层**（`frontend-demo/`）：浏览器可执行样板，证明状态流、打断、降级成立
3. **Platform implementation 层**（三端仓库）：原生导航 / 原生组件 / 原生手势 / safe area / keyboard inset / fold posture / accessibility focus

Demo proof 不等于 Platform implementation。平台不能用 Web CSS / DOM / `data-*` selector / demo route stack 作为实现接口。

## 1. P0 MotionId 集合

84 个 MotionId 中，P0 阶段必须三端验证的高风险子集：

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
| `reader.control.handle.press` | P0 | 控制层小横条按下 |
| `reader.control.handle.release` | P0 | 控制层小横条释放 |
| `reader.control.dock.longPress` | P0 | 宽屏 dock 长按移动 |
| `reader.control.dock.drag` | P0 | 宽屏 dock 拖拽 |
| `reader.control.dock.release` | P0 | dock 释放 |
| `reader.control.dock.rebound` | P0 | dock 回弹（resize clamp）|
| `reader.control.hide` | P0 | 控制层隐藏 |
| `reader.module.switch` | P0 | 阅读模块切换 |
| `reader.session.capsule.enter` | P0 | 运行胶囊进入 |
| `reader.session.capsule.update` | P0 | 胶囊更新 |
| `reader.session.capsule.exit` | P0 | 胶囊退出 |
| `reader.session.capsule.switch` | P0 | TTS/auto-page 互斥切换 |
| `reader.session.controlSpace.enter` | P0 | 控制层上方胶囊锚定 |
| `reader.session.controlSpace.exit` | P0 | 控制层上方胶囊退出 |
| `reader.session.tts.start` | P0 | TTS 启动事务 |
| `reader.session.autoPage.start` | P0 | 自动翻页启动事务 |
| `reader.sourceSwitch.open-close` | P0 | 换源窗口 |
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

P0 共 40 项。剩余 44 项 MotionId 归 P1，P1 集合见 [motion.fixtures.json](./fixtures/motion.fixtures.json) 全集。

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
| `directManipulation` | 手势跟随（drag / slider / dock） |
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

## 3. 每个 P0 MotionId 的规则

每项给出：触发 UiEvent / duration token / 结束状态 / 打断规则 / reduced-motion 降级。
完整视觉效果描述见 [MOTION_EFFECTS.md](../frontend-demo/MOTION_EFFECTS.md)。

### 3.1 应用启动 / 路由

#### `app.firstOpen.enter`
- 触发：冷启动后 `app.firstOpen.enter` UiEvent，仅播一次（`hasPlayedFirstOpen` guard）
- duration：`--fd-ds-motion-duration-firstOpen`（280ms）
- 结束状态：首屏落位，`hasPlayedFirstOpen = true`
- 打断：被 `route.push` 触发 `motion.interrupt.completeThenReplace`，跳到目标 route
- reduced-motion：duration 0ms，首屏直接落位，无淡入
- demo 等价性：浏览器 `data-motion-first-open-*` 字段证明状态流成立；不证明真机冷启动性能

#### `app.route.push.forward` / `app.route.pop.backward` / `app.route.replace`
- 触发：`route.push` / `route.pop` / `route.popToRoot` / `route.replace` UiEvent
- duration：使用 `--fd-ds-motion-duration-panel`（200ms）或平台导航默认值
- 结束状态：目标 route 落位，focusTarget 回到 route 最后 focus
- 打断：新 `route.push` 触发 `motion.interrupt.redirect`；`route.pop` 触发 `motion.interrupt.cancel`
- reduced-motion：duration 0ms，直接切换
- 系统返回：等价于 `app.route.pop.backward`

### 3.2 主 Tab

#### `tab.item.select` / `tab.switch`
- 触发：`tab.item.select` / `tab.switch` UiEvent
- duration：`tabPress`（80ms）/ `tabSelect`（120ms）/ `tabSwitch`（160ms）
- 结束状态：目标 tab 选中，indicator 落位
- 打断：重复点击同 tab 触发 `motion.interrupt.cancel`；快速切 A→B→C 触发 `redirect`
- reduced-motion：duration 0ms，indicator 瞬切
- 稳定性要求：indicator 切换不推动 tab 栏布局；按下不改变热区

#### `bookshelf.view.switch`
- 触发：`bookshelf.view.switch` UiEvent（cover-mode ↔ list-mode）
- duration：`--fd-ds-motion-duration-stateReplace`（160ms）
- 结束状态：目标视图模式落位
- 打断：切换中再次切换触发 `redirect`
- reduced-motion：duration 0ms

### 3.3 阅读器进入 / 翻页

#### `reader.entry.coverToImmersive`
- 触发：`reader.entry.coverToImmersive` UiEvent（点击书架封面）
- duration：`--fd-ds-motion-duration-readerEntry`（240ms）
- 结束状态：进入 `immersive-reading`，控制层不显示
- 打断：连续点击触发 `motion.interrupt.cancel`；返回触发 `app.route.pop.backward`
- reduced-motion：duration 0ms，直接进入阅读
- demo 等价性：浏览器 snapshot 层证明封面到阅读面状态流成立；不证明平台 matched geometry 效果

#### `reader.entry.actionToImmersive`
- 触发：`reader.entry.actionToImmersive`（点击 ReadButton）
- 其余同 `coverToImmersive`

#### `reader.page.turn.next-prev`
- 触发：`reader.page.next` / `reader.page.prev` UiEvent
- duration：`--fd-ds-motion-duration-pageTurn`（220ms）
- 结束状态：目标页落位，`readerPageIndex` 更新，触发 `reader.progress.update` CoreCommand
- 打断：连续翻页触发 `motion.interrupt.redirect`；chapter jump 触发 `completeThenReplace`
- reduced-motion：duration 0ms，瞬切
- 禁止：翻页动画不得改变正文排版结果；不得使用拟物翻页

#### `reader.chapter.jump`
- 触发：`reader.chapter.jump` UiEvent
- duration：`--fd-ds-motion-duration-pageTurn`（220ms）
- 结束状态：目标章节落位，Core `content.load` 返回后渲染
- 打断：连续跳转触发 `redirect`；返回触发 `cancel`

### 3.4 阅读控制层

#### `reader.control.handle.press` / `reader.control.handle.release`
- 触发：`reader.control.handlePress` / `reader.control.handleRelease` UiEvent
- duration：`handleLongPress`（320ms 长按识别）/ `handleSnap`（120ms 释放 snap）
- 结束状态：展开 / 收回 / 原状态（按阈值）
- 打断：拖动中 `route.pop` 触发 `cancel`，立即收回
- reduced-motion：拖动跟手无 easing（dragMustFollowFinger），释放即时提交
- 手势阈值：见 §4.1

#### `reader.control.dock.longPress` / `reader.control.dock.drag` / `reader.control.dock.release` / `reader.control.dock.rebound`
- 触发：`reader.control.dockLongPress` / `reader.control.dockDrag` / `reader.control.dockRelease` / `reader.control.dockRebound`
- duration：`handleLongPress`（320ms）/ drag 0ms（跟手）/ `handleSnap`（120ms rebound）
- 结束状态：dock 落到合法位置；resize 时 clamp 后 rebound
- 打断：drag 中 `viewport.orientation.reshape` 触发 `completeThenReplace`，clamp 后落位
- reduced-motion：drag 跟手无 easing；rebound duration 0ms
- 边界：见 §4.2

#### `reader.control.hide`
- 触发：`reader.control.toggle`（关闭）/ 系统返回
- duration：`--fd-ds-motion-duration-overlay`（240ms）
- 结束状态：overlay = null，focusTarget 回到 `reader.control.handle`
- 打断：被新 `reader.*.open` 触发 `redirect`

#### `reader.module.switch`
- 触发：`reader.module.switch` UiEvent
- duration：`--fd-ds-motion-duration-panel`（200ms）
- 结束状态：目标模块 overlay 落位
- 打断：快速切换触发 `redirect`；overlay 互斥规则强制经 `null` 中转（transition-guard）

### 3.5 阅读会话胶囊

#### `reader.session.capsule.enter` / `update` / `exit` / `switch`
- 触发：`reader.session.capsuleEnter/Exit/Switch` UiEvent
- duration：`capsuleEnter`（160ms）/ `capsuleControl`（120ms update）/ `sessionReturn`（200ms exit）/ `capsuleEnter`（160ms switch）
- 结束状态：胶囊显示 / 隐藏 / 切换到目标 session
- 打断：TTS→auto-page 切换触发 `completeThenReplace`，先 exit TTS 胶囊再 enter auto-page
- 互斥：TTS 与 auto-page session 互斥（state-rule fixtures）
- reduced-motion：duration 0ms，胶囊瞬显/瞬隐
- 稳定性：胶囊切换时尺寸不抖动；countdown 数字局部更新不重放整颗胶囊

#### `reader.session.controlSpace.enter` / `exit`
- 触发：`reader.session.controlSpaceEnter/Exit` UiEvent（打开/关闭控制层）
- duration：`runningSpace`（180ms）
- 结束状态：胶囊锚定到控制层上方 / 回到沉浸页脚
- 打断：关闭控制层触发 `completeThenReplace`
- 禁止：切换控制层子页时胶囊不可见（双主控禁令）

#### `reader.session.tts.start` / `reader.session.autoPage.start`
- 触发：`reader.session.ttsStart` / `reader.session.autoPageStart` UiEvent
- duration：复合事务，包含 `capsule.enter` + `control.hide`
- 结束状态：`activeSession = tts` / `auto-page`，控制层关闭，胶囊显示
- 打断：互斥切换触发 `completeThenReplace`

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
- 触发：新输入 / 返回 / 路由替换 / overlay 互斥 / loading 完成 / 拖动开始
- duration：`interruptSettle`（80ms）
- 结束状态：旧动画清理（pressed / dragging / dropdown flags），新动画接管
- 清理：必须清除 transient `pressedState` / `dragOffset` / `dropdownOpen` flags
- async guard：request-scoped async state 必须有 cancellation/discard guards
- reduced-motion：duration 0ms，瞬切

### 3.8 折叠屏 / 旋转

#### `viewport.orientation.reshape`
- 触发：`viewport.orientation.reshape` UiEvent（resize / orientation change）
- duration：`viewportReshape`（240ms）
- 三个阶段：`prepare`（80ms freeze）→ `reshape`（240ms 重排）→ `settle`（240ms 落位）
- 结束状态：route / 返回栈 / activeSession 不丢；正文不跳章；overlay / 胶囊 / dock 落到合法位置
- 打断：reshape 中再次 reshape 触发 `completeThenReplace`
- reduced-motion：duration 0ms，直接 settle

### 3.9 状态反馈

#### `state.loading.inline`
- 触发：`state.loading.inline` UiEvent
- duration：`loadingSpin`（800ms 循环）
- 结束状态：Core 返回后停止
- reduced-motion：禁用循环动画，显示静态 loading 指示

#### `feedback.toast.enter` / `feedback.toast.exit`
- 触发：`feedback.toast.show` / `feedback.toast.dismiss`
- duration：`feedbackToast`（180ms）
- 结束状态：Toast 显示 / 隐藏
- 打断：新 Toast 触发 `redirect`，旧 Toast 立即隐藏

### 3.10 换源

#### `reader.sourceSwitch.open-close`
- 触发：`reader.sourceSwitch.open` / `reader.sourceSwitch.close`
- duration：`overlay`（240ms）
- 方向：从阅读平面内轻浮现（不是全屏遮罩）
- FlowShell 不使用全屏阻断
- 打断：`reader.exit` 触发 `cancel`

## 4. 通用交互规则

### 4.1 手势阈值

来源：[MOTION_IMPLEMENTATION_GAP_AUDIT.md](../frontend-demo/MOTION_IMPLEMENTATION_GAP_AUDIT.md) P1 手势阈值缺口。

P0 阶段必须明确的阈值：

| 手势 | 阈值 | 规则 |
| --- | --- | --- |
| 控制层 handle drag slop | 8dp / 8pt / 8vp | 小于阈值不视为 drag，按 tap 处理 |
| handle drag 展开阈值 | 拖动距离 ≥ 50% 展开高度 | 释放后展开 |
| handle drag 收回阈值 | 拖动距离 ≤ 50% 展开高度 | 释放后收回 |
| handle drag velocity | ≥ 400 dp/s | 快速滑动直接展开/收回，不等阈值 |
| dock longPress 识别 | 320ms | 长按 320ms 后进入 drag |
| dock drag bounds | ReaderFrame + dock group | 不跨 hinge / 安全区；clamp 到合法位置 |
| slider drag slop | 4dp / 4pt / 4vp | 小于阈值不视为 drag |
| slider drag 跟手 | 0ms easing | 拖动中无 easing，释放才 snap/commit |
| list fling velocity | ≥ 500 dp/s | 触发 fling |
| tab tap debound | 80ms | 快速重复点击只触发一次 |

P1 阶段需要补的阈值（P0 不阻塞）：
- 亮度 / 进度拖动精确阈值
- 底表拖拽关闭阈值
- 翻页拖动阈值

### 4.2 拖拽边界

- handle drag：垂直方向，不超出展开高度
- dock drag：水平 + 垂直，clamp 到 ReaderFrame + dock group + 安全区
- slider drag：沿 slider 轴向，clamp 到 min/max
- list drag：沿列表轴向，无边界（虚拟列表）
- 所有 drag 期间：不触发 `route.push`、不触发 `overlay.open`、不修改 Core state

### 4.3 焦点恢复

来源：[STATE_OWNERSHIP.md](./STATE_OWNERSHIP.md) §6 + 本仓 `motionOverlayFocusReturn` / `motionOverlayReturnTarget`。

| 场景 | 焦点恢复目标 |
| --- | --- |
| 关闭 overlay | 回到打开 overlay 的触发器（如 `reader.control.handle`）|
| 系统返回关闭 overlay | 同上 |
| `route.pop` | 回到上一页最后 focusTarget |
| `route.push` | 新页面的默认 focus（第一个可聚焦组件）|
| dialog 关闭 | 回到打开 dialog 的触发器 |
| sheet 关闭 | 回到打开 sheet 的触发器 |
| TTS / auto-page 启动 | 胶囊内主控按钮 |
| TTS / auto-page 退出 | 回到 `reader.control.handle` |

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
- 折叠屏 hinge：dock 不跨 hinge
- fold posture 变化触发 `viewport.orientation.reshape`
- 平台必须使用原生 fold posture API（不依赖 Web `visualViewport`）

## 5. Reduced-motion 降级

来源：[STATE_OWNERSHIP.md](./STATE_OWNERSHIP.md) §6 + [MOTION_CONTRACT.md](../frontend-demo/MOTION_CONTRACT.md)。

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
| `frontend-demo/verify/motion/evidence/` | demo proof，不是平台 evidence；平台 evidence 见 [PLATFORM_EVIDENCE_SPEC.md](./PLATFORM_EVIDENCE_SPEC.md) |
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
- `match`：匹配条件，省略的字段视为通配。空 `match = {}` 表示全匹配（最低优先级兜底）
- `match.fromRoute` / `match.toRoute`：来源 / 目标 RouteId
- `match.fromShell` / `match.toShell`：来源 / 目标 shell（`MainTabShell` / `LibraryShell` / `ReaderShell` / `SettingsShell` / `FlowShell`）
- `match.operation`：切换意图（与 [motion.schema.json](./motion.schema.json) `operation` enum 对齐，12 个值）
- `match.sourceRole`：来源语义角色（如 `bookCover` / `actionButton` / `handle` / `dock` / `slider` / `orientation`）
- `match.targetRole`：目标语义角色（如 `sheet` / `dialog` / `dropdown` / `toast`）
- `match.containerRole`：容器角色（与 [motion.schema.json](./motion.schema.json) `containerRole` enum 对齐，12 个值）
- `match.reducedMotion`：是否启用 reduced-motion
- `motionId`：解析结果 MotionId（必须存在于 [motion.schema.json](./motion.schema.json) `id` enum）

### 7.2 MotionPolicy fixtures 覆盖

[motion-policy.fixtures.json](./fixtures/motion-policy.fixtures.json) 当前 28 条 policy（外加 13 条 `_comment` 注释），覆盖全部 12 个 `operation`：

| priority 层级 | 覆盖场景 |
| --- | --- |
| 0 | 兜底（`fallback-no-motion` → `motion.interrupt.redirect`） |
| 50 | interrupt 兜底 |
| 100 | route push/pop/replace defaults + componentFeedback |
| 150 | tab item / toggle / input |
| 200 | tab switch / inline state |
| 250 | overlayHost dropdown / toast |
| 300 | readerShell overlay / readerSurface / slider / orientation |
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
}) -> MotionId | null
```

解析逻辑：
1. 若调用方未传 `fromShell` / `toShell` 但传了 `fromRoute` / `toRoute`，由 `RouteShellLookup`（从 [route.fixtures.json](./fixtures/route.fixtures.json) 派生，76 条 route→shell 映射）补全
2. 将全部 policy 按 `priority` 降序排序；同 priority 按 `match` 字段数（specificity）降序排序
3. 依次匹配，第一条 `match` 命中的 policy 返回其 `motionId`
4. 全部未命中返回 `null`（fixtures 中 `fallback-no-motion` priority=0 兜底确保极少返回 null）

Resolver 是纯函数，不修改输入 request，无副作用。

### 7.4 三端生成产物

`node tools/codegen/generate.mjs` 生成：

**MotionSpecRegistry**（Phase 1）：
- Swift：`generated/swift/Motion.swift` 的 `MotionSpecRegistry`
- Kotlin：`generated/kotlin/Motion.kt` 的 `MotionSpecRegistry`
- ArkTS：`generated/arkts/Motion.ets` 的 `motionSpecRegistry`

每条 MotionSpec 包含：`id` / `durationMs` / `easing` / `implementationKind` / `containerRole` / `operation` / `visualPattern` / `interruptPolicy` / `reducedMotionPolicy` / `tokens.durationToken` / `tokens.easingToken` / `guardRules`。

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

- [contracts/tests/motion-policy.test.mjs](../contracts/tests/motion-policy.test.mjs)：13 项 — schema 校验、id 唯一、motionId 引用合法、覆盖全部 12 operation、用户规格 5 个示例 policy 存在且正确
- [contracts/tests/motion-resolver.test.mjs](../contracts/tests/motion-resolver.test.mjs)：21 项 — JS 移植 resolver 逻辑验证 route push/pop、tab switch、bookshelf-cover-to-reader、reader overlay sheet/dialog、dropdown、reader page turn、chapter jump、slider drag、session capsule、orientation reshape/settle、高优先级优先、空 request 命中兜底、resolver 纯函数不修改输入
- [contracts/tests/motion-guard.test.mjs](../contracts/tests/motion-guard.test.mjs)：8 项 Phase 1 字段守卫 — 6 字段存在性、interruptPolicy 与 guardRules 一容、reducedMotionPolicy 与 guardRules 一致、enum 值合法、directManipulation 对应 keepDirectManipulation
- [contracts/tests/codegen-idempotent.test.mjs](../contracts/tests/codegen-idempotent.test.mjs)：三端 42 个生成文件幂等
- [contracts/tests/codegen-consistency.test.mjs](../contracts/tests/codegen-consistency.test.mjs)：三端 14 个文件存在 + enum 一致

当前 canonical 覆盖状态：
- `motion.schema.json`：84 个 MotionId + 6 个 Phase 1 结构化字段
- `motion.fixtures.json`：84 条 MotionSpec fixture，每条都有 6 个新字段 + `tokens` + `guardRules`
- `motion-policy.schema.json`：MotionPolicy 契约
- `motion-policy.fixtures.json`：28 条 policy + 13 条注释，覆盖全部 12 operation
- `generated/swift/Motion.swift` + `MotionPolicy.swift`、`generated/kotlin/Motion.kt` + `MotionPolicy.kt`、`generated/arkts/Motion.ets` + `MotionPolicy.ets`：均生成完整 registry + resolver

注意：`frontend-demo/verify/motion/motion-coverage-report.json` 的 `83/83` 指 demo runtime / selector alias resolution，不是 canonical schema 总数。canonical 84/84 以本节 schema + fixture + generated registry 为准。

## 8. MotionId 新增 / 废弃流程

1. 在 [motion.schema.json](./motion.schema.json) `id.enum` 新增 MotionId。
2. 在 [motion.fixtures.json](./fixtures/motion.fixtures.json) 新增对应 fixture（含 durationMs / easing / 6 个 Phase 1 结构化字段 / tokens / guardRules）。
3. 在 [motion-policy.schema.json](./motion-policy.schema.json) `motionId.enum` 同步新增（保持与 motion.schema.json 一致）。
4. 在 [token.fixtures.json](./fixtures/token.fixtures.json) 新增对应 motion-duration token（如需新 token）。
5. 在 [MOTION_EFFECTS.md](../frontend-demo/MOTION_EFFECTS.md) 补视觉效果描述。
6. 若新 MotionId 需要被 Resolver 解析，在 [motion-policy.fixtures.json](./fixtures/motion-policy.fixtures.json) 新增对应 policy 规则。
7. 三端 `MotionAdapter` 同步新增映射（归平台仓库）。
8. 跑 `node --test contracts/tests/*.test.mjs` 校验。
9. 跑 `node tools/codegen/generate.mjs` 重新生成 `generated/{swift,kotlin,arkts}/Motion.*` 与 `MotionPolicy.*`。
10. 跑 `node tools/codegen/check-drift.mjs` 校验生成幂等。

废弃：`deprecated: true` + 至少保留一个 MINOR 周期。

## 9. 缺口与下一步

Phase 1-2 Motion Runtime 已完成：
- 84 个 MotionId 全部补齐 6 个结构化字段（implementationKind / containerRole / operation / visualPattern / interruptPolicy / reducedMotionPolicy）
- MotionPolicy 规则表（28 条 policy，覆盖全部 12 operation）+ ReaderMotionResolver 纯函数
- 三端生成 MotionSpecRegistry + MotionPolicyRegistry + RouteShellLookup + ReaderMotionResolver
- 215 项测试全部通过，46 个文件 drift check 通过

剩余缺口（归三端平台仓库或 P1）：
- 44 个 P1 MotionId 已有 MotionSpec fixture，但精确状态机还未在本文逐项展开。
- 平台 MotionAdapter 实现（Phase 4，归 `Reader for iOS` / `Reader for Android` / `Reader for HarmonyOS` 仓库）
- 切换入口统一改造（Phase 5，navigator.push/pop/replace、tabs.switchTo、overlay.present/dismiss，归平台仓库）
- 平台 lint 禁止裸动画（Phase 6，归平台仓库）
- 亮度 / 进度拖动精确阈值（P1 补）
- 底表拖拽关闭阈值（P1 补）
- VoiceOver / TalkBack 焦点迁移规则（P1 补）
- 性能预算（FPS / layout shift / 动画属性白名单）（P1 补）
- 真机录屏 evidence（归三端仓库，见 [PLATFORM_EVIDENCE_SPEC.md](./PLATFORM_EVIDENCE_SPEC.md)）
