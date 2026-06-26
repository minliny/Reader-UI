# Motion Source Global Audit

状态：Draft v0.3

审计日期：2026-06-26

审计口径：只基于当前 `frontend-demo/` 源码和本地运行结果，不把 `MOTION_*.md`、handoff 文档或既有规划表作为事实来源。

## 1. 输入范围

源码输入：

- `frontend-demo/index.html`
- `frontend-demo/render.js`
- `frontend-demo/render-runtime.js`
- `frontend-demo/route-contract.js`
- `frontend-demo/shared-shell-kit/kit.js`
- `frontend-demo/styles.css`
- `frontend-demo/styles/*.css`
- `frontend-demo/tokens.css`
- `frontend-demo/motion-tokens.css`

显式排除：

- `frontend-demo/MOTION_*.md`
- `docs/ui-handoff/MOTION_PLATFORM_MAPPING.md`
- 既有截图、录屏和验收文档

## 2. 代码事实快照

| 项 | 代码事实 |
|---|---|
| 路由规模 | `route-contract.js` 注册 131 个 route |
| 路由渲染覆盖 | `render-runtime.js` 的 `renderRoute()` 覆盖 131/131 个 route，无缺失 case |
| Shell 分布 | MainTabShell 35、LibraryShell 52、SettingsShell 28、ReaderShell 15、FlowShell 1 |
| 非 motion adapter 的 `data-*` | 合并 `index/render/render-runtime/route-contract/shared-shell-kit` 后 147 个唯一入口 |
| motion adapter 属性 | `data-motion-id`、`data-motion-pressed`、`data-motion-reduced`、`data-motion-reduced-source` |
| 运行时代码 Motion ID | `applyMotionSelectorBindings()` 中 58 个 bind 调用，50 个唯一 Motion ID |
| 直接绑定覆盖 | 147 个 `data-*` 中 125 个被 bind selector 直接覆盖 |
| 未被 bind selector 直接覆盖 | 22 个，多数是 route/debug/metadata/slot 属性 |
| CSS 动效文件 | `01-shell-layout.css`、`02-main-library.css`、`04-settings-source.css`、`05-flow-adaptive.css`、`motion-tokens.css` |
| Reduced motion | `matchMedia("(prefers-reduced-motion: reduce)")`、URL 开关和 CSS 降级都已存在 |
| Motion controller | `motion-controller.js` 已接入 `index.html`，`render-runtime.js` 会创建 root-scoped controller |

证据文件：

- `frontend-demo/verify/motion/source-global-audit.json`

源码锚点：

- `applyMotionPreference()`：`render-runtime.js:5118`
- `applyMotionSelectorBindings()`：`render-runtime.js:5126`
- `attachMotionPressState()`：`render-runtime.js:5200`
- `renderActiveRoute()`：`render-runtime.js:5873`
- `goTo()`：`render-runtime.js:5904`
- `goTab()`：`render-runtime.js:5933`
- `replaceTopRoute()`：`render-runtime.js:5951`
- `applyReaderTtsAction()`：`render-runtime.js:6201`
- `applyReaderSettingToggle()`：`render-runtime.js:6243`
- `openBookFocus()`：`render-runtime.js:6285`
- `data-book-cover` click handler：`render-runtime.js:6820`
- 亮度拖动 `setPointerCapture`：`render-runtime.js:6999`
- 章节进度拖动 `setPointerCapture`：`render-runtime.js:7068`
- `motion-controller.js`：root 写入 `data-motion-controller` / `data-motion-phase` / `data-motion-last-id`

浏览器 smoke：

- 本地加载 `http://127.0.0.1:5177/frontend-demo/?motionReduced=1&captureRoute=<route>`。
- 131/131 route 的 `data-current-route` 与 `captureRoute` 匹配。
- 131/131 route 非空渲染。
- 131/131 route 的 `data-motion-reduced="true"` 生效。
- `data-screen-host` 范围内，75/131 route 仍存在交互元素没有 `data-motion-id`。
- `data-screen-host` 范围内，`about-feedback` 和 `source-groups` 当前没有任何 `data-motion-id`。

## 3. 已经有代码实现的动效能力

### 3.1 Motion token 与 reduced-motion 基础层

代码事实：

- `styles.css` 引入 `motion-tokens.css`。
- `motion-tokens.css` 定义 app/reader motion duration、distance、scale、easing token。
- `.fd-demo[data-motion-reduced="true"]` 把通用时长降到 `0ms`。
- `@media (prefers-reduced-motion: reduce)` 也会把 transition/animation duration 降到 `0ms`，并禁用翻页和 loading 动画。
- `render-runtime.js` 支持 `?motionReduced=1/0` 和 `?reducedMotion=...`。

判定：基础 token 和 reduced-motion 代码已落地，可以作为后续平台实现的输入，但仍缺视觉证据和平台测试映射。

### 3.2 Motion ID adapter

代码事实：

- `applyMotionSelectorBindings(screenHost)` 在每次 route render 后执行。
- 主要 `data-*` selector 会被写入 `data-motion-id`。
- `attachMotionPressState(screenHost)` 为 `button`、`[role="button"]`、`[data-route]`、`[data-route-back]`、`[data-motion-id]` 加 pressed class 和 `data-motion-pressed`。

判定：有基础 adapter，但作用域是 `screenHost`。外层 demo chrome 不纳入；无 `data-*` 的普通业务按钮只能靠 fallback，且当前仍有不少 route 的普通按钮没有 Motion ID。

### 3.3 当前真实动画

代码事实：

- 键盘：`.fd-demo-keyboard` 使用 `transform translateY()` 和 `visibility` transition。
- 筛选/下拉触发器：filter chevron、discover sort chevron 有 rotate transition。
- 阅读翻页：`.fd-ir-reading-layer.fd-reader-page-turn-next/prev` 使用 `fd-reader-page-next/prev` keyframes。
- 阅读 loading：`.fd-reader-loading-panel i` 使用 `fd-reader-loading-spin` infinite animation。
- 设置/书源部分 overlay：存在 transform/visibility 或 transform/box-shadow transition。
- 通用控件：`motion-tokens.css` 给 button、active/selected、switch、progress、state、toast、selection 加基础 transition。

判定：当前 demo 已有一批真实 CSS 动效，但覆盖的是基础状态和少量 Reader 主链路，不是完整跨端动效系统。

### 3.4 阅读会话状态

代码事实：

- 朗读 `data-reader-tts-action="toggle"` 会设置 `readerTtsSession=true`，播放时关闭自动翻页并 `replaceTopRoute("immersive-reading")`。
- 自动翻页 `data-reader-setting-toggle="autoPage"` 会设置 `readerAutoPageSession=true`、`readerAutoPageCountdown=8`，开启时关闭朗读并 `replaceTopRoute("immersive-reading")`。
- 沉浸页会渲染 `.fd-ir-status-capsule`，区分 `data-reader-immersive-status-type="tts|autoPage"` 和 `data-reader-immersive-status-playing`。

判定：自动翻页/朗读互斥与回沉浸页逻辑已在代码里存在；胶囊本身仍主要是静态渲染，没有进入/退出、倒计时 tick、语音 icon active 的动画实现。

## 4. 关键缺口

### P0-1：全局 motion controller 只有最小实现

代码事实：

- `motion-controller.js` 已提供 `start/update/interrupt/settle/destroy`。
- `render-runtime.js` 已接入首次打开、route push/pop/replace、Tab switch、viewport reshape、封面进入沉浸阅读、TTS/自动翻页 session start。
- 普通 route 切换仍走 `screenHost.innerHTML = renderRoute(...)`。
- 只有 reader loading 使用 `pendingRouteTimer`，翻页用 class + `animationend` 清理。
- controller 当前负责 transaction 记录、root `data-motion-*` 状态和 reduced-motion 时长归零；还没有统一驱动视觉 enter/exit class、shared element、dropdown lifecycle 或 dock drag。

影响：

- 连续点击、返回、关闭 overlay、loading 完成、拖动开始、route 替换已经有统一接入点，但还没有完整组件状态机。
- 平台实现仍不能只看当前 demo 直接复刻完整动画，只能复用 controller 事件命名和 reduced-motion 口径。

### P0-2：route push/pop 和 Tab 切换不是动画系统

代码事实：

- `goTo()` / `goTab()` 主要是更新 routeStack 后即时 render。
- 主 Tab、Reader module tab、segmented button 大多只是 class/aria 状态变化。
- 没有 indicator 迁移、A -> B 切换、重复点击 active、route push/pop 方向等状态字段。

影响：

- “同一 TAB 栏选中”和“从一个按钮切换到另一个按钮”还没有可复用实现。
- 平台无法只看 demo 代码就复刻 tab motion。

### P0-3：dropdown/filter 只有基础触发与重渲染

代码事实：

- filter disclosure 通过 `appState.*Open` 控制 open/close，然后 `renderCurrentRoute()` 重渲染。
- CSS 主要覆盖 chevron rotate；菜单本体没有统一 enter/exit/reposition 动画生命周期。
- Reader dropdown 有 placement 计算，但不等于统一 dropdown motion controller。

影响：

- 展开、收起、选项点击、外部点击关闭、返回关闭、resize/orientation reposition 还没有完整统一实现。

### P0-4：封面进入沉浸阅读没有 shared transition

代码事实：

- `[data-book-cover]` 支持 560ms long press 打开聚焦层。
- 普通 click 直接 `goTo(data-route || "immersive-reading")`。
- 代码里没有 cover clone/snapshot layer、source/target rect、crossfade 或 shared-element 状态。

影响：

- “点击封面进入沉浸阅读页”的效果目前只是 route 切换，不是封面过渡动画。

### P0-5：控制层小横条和宽屏 dock 不能拖动

代码事实：

- `.fd-reader-grabber` 和 `.fd-reader-full-grabber` 是 button/span，点击进入完整控制页或返回 reader。
- CSS 里有宽屏 dock 变量：`--reader-dock-right`、`--reader-dock-width`、`--reader-dock-*`。
- 没有针对 grabber/dock 的 pointerdown/pointermove、long press、bounds clamp、offset persistence。

影响：

- 宽屏固定宽度控制层不随屏幕变形这件事有布局基础，但“长按小横条拖动控制层”没有实现。

### P0-6：运行胶囊和控制层运行空间没有动画连接

代码事实：

- 沉浸页 capsule 是 `.fd-ir-status-capsule` 静态结构。
- 控制层内没有与 capsule 匹配的 running-space anchor/snapshot。
- 没有胶囊停靠、展开到运行空间、从运行空间折回胶囊的动画代码。

影响：

- 自动翻页/朗读开启后回到沉浸页并出现控制胶囊这一状态存在，但相关过渡动画不完整。

### P0-7：胶囊内部微动效缺实现

代码事实：

- 自动翻页 countdown 只读取 `readerAutoPageCountdown`，初始为 8。
- 没有 countdown interval/tick 逻辑。
- motion token 定义了 `--reader-motion-duration-voice-pulse` 和 `--reader-motion-scale-voice-pulse`，但 CSS/JS 没有语音 icon pulse class。
- 胶囊按钮按压目前只受通用 button pressed 影响，没有专属 run/pause morph。

影响：

- 控制胶囊倒计时数字变化、语音图标活动提示、运行/暂停按钮动画没有实现级闭环。

### P0-8：viewport/orientation 只有分类和响应式布局，没有旋转动效

代码事实：

- `applyViewportClass()` 写入 `data-width-class`、`data-height-class`、`data-orientation`、`data-viewport-class`、viewport width/height。
- `resize` / `visualViewport.resize` 会重新计算 class，并调整 reader dropdown placement。
- CSS 对 compact-landscape、tablet-expanded、expanded-width 等有布局规则。
- 没有 prepare/freeze/reshape/settle 状态，也没有 route/ReaderContext/session/overlay/focus 的旋转中冻结逻辑。

影响：

- 整屏旋转适配有布局基础，但没有旋转动效和打断状态机。

### P0-9：代码级 Motion ID 覆盖仍不完整

代码事实：

- 147 个 `data-*` 中 125 个被 bind selector 直接覆盖。
- 未直接覆盖的 22 个包括 `data-current-route`、`data-route-stack`、`data-screen-host`、`data-module`、`data-nav-type`、`data-book-title` 等 route/debug/metadata/slot 属性。
- 浏览器 smoke 显示 `data-screen-host` 内 75/131 route 存在普通业务按钮没有 `data-motion-id`。
- `about-feedback`、`source-groups` 两个 route 的 screen 内没有任何 `data-motion-id`。

影响：

- 当前 adapter 对已有 `data-*` 的覆盖已较大，但普通业务按钮、管理页 segment、批量选择、调试页 action 等还没有统一纳管。

## 5. 全局判定

当前 demo 已经具备：

- Motion token 基础层。
- Reduced-motion CSS 和 URL 测试开关。
- 最小全局 motion controller。
- 运行时 `data-motion-id` adapter。
- 通用 pressed state。
- 翻页、loading、键盘、chevron、overlay/状态类 transition 的基础实现。
- 自动翻页/朗读互斥和回沉浸页胶囊的状态逻辑。
- 131 个 route 的可渲染性。

当前 demo 还不能声称：

- 已经形成完整跨端动效规格。
- 各平台可直接沿用当前实现。
- 所有交互组件都被实现级统一纳管。
- 打断、折叠/旋转、控制层拖动、运行胶囊、封面进入、dropdown、tab motion 已闭环。

结论：当前处于“最小 motion controller + 基础 motion adapter + 局部 CSS 动效 + 完整 route 可渲染”的阶段。要作为 iOS / Android / HarmonyOS 可直接排期复用的动效规格，还需要补全组件状态机、Reader 专属主链路动画和视觉证据自动化。

## 6. 全局组件纳管矩阵

| 组件族 | 当前源码入口 | 已有实现 | 缺口 | 纳管要求 |
|---|---|---|---|---|
| App 首次打开 | `render()`、`captureRoute` 初始化、`goTo(initialRoute)` | 直接渲染首屏，reduced-motion 可生效 | 没有 first-open staged enter、首屏 skeleton、恢复 route settle | 新增 `app.firstOpen.enter/settle`，只在正常启动首屏执行；capture/test 模式允许关闭 |
| 路由 push/pop/replace | `data-route`、`data-route-back`、`data-route-replace`、`goTo()`、`goBack()`、`replaceTopRoute()` | Motion ID 有 `app.route.push/pop`；Reader 局部 loading 有 360ms timer | route 大多即时替换，无方向、打断、返回取消、replace 无动画差异 | controller 记录 `fromRoute/toRoute/action/direction/interruption/finalState` |
| 底部 Tab / 模块 Tab | `.fd-main-nav-item`、Reader module nav、RSS mode row、source module tabs | active class / aria 状态切换 | 没有 press/select/switch 分离；没有 indicator 从 A 到 B 迁移 | 统一 `tab.item.press/select/switch`，重复点击只给 press，不触发 switch |
| Button / Icon button | `button`、`[role=button]`、`data-top-action`、`data-book-action` | 通用 pressed class 和 scale | 普通业务按钮缺语义 Motion ID；activate/commit/loading/disabled 反馈不统一 | fallback 只做 press，业务命令补 family ID：`button.activate`、`button.commit`、`button.destructive.confirm` |
| Chip / Filter / Segment | `data-discover-entry`、`data-*filter`、`data-reader-*set`、`fd-chip-row` | 部分 selector 已绑定 chip/filter/segment ID | 多个路由重渲染，缺 selected->selected 状态迁移和取消规则 | 统一 `item.press -> item.select -> group.commit`；选中态移动不改变容器尺寸 |
| Dropdown / Menu | `filterDisclosure()`、settings option dropdown、reader more/setting/tts dropdown | trigger/option/menu Motion ID 存在；chevron 有 rotate | 菜单 enter/exit/select/cancel/reposition 没有统一生命周期 | `dropdown.opening/open/closing/closed/selecting`，外点/返回/resize 都走同一 exit |
| Sheet / Dialog / Toast / Keyboard | `data-demo-sheet`、`data-demo-dialog`、settings overlay、keyboard host | 基础 overlay、toast、keyboard transition/ID 存在 | 没有统一遮罩、focus return、连续打开打断规则 | `overlay.enter/exit/interrupted`，结束态必须恢复 focus 和 aria |
| List row / Card | `role=button`、`data-book-card`、`data-restore-record`、RSS/source rows | fallback `listRow.press`，部分 card route ID | rows/cards 与 route push、selection、multi-select 混用 | rows 分为 `listRow.press/select/route/reorder`，card 分为 `card.press/select/route` |
| Input / Search | `data-open-keyboard`、`data-search-submit`、`data-search-reset`、search state | keyboard enter/exit 和 search state ID 存在 | focus、clear、submit、result replace 的动效没有统一证据 | `input.focus/blur/clear/submit`、`search.state.replace` 统一 token |
| Toggle / Switch | `data-reader-setting-toggle`、`data-source-switch`、`data-restore-scope` | switch knob/active transition 基础存在 | toggle 与 session start、dialog confirm、bulk selection 的运行中反馈混在一起 | `toggle.press/offToOn/onToOff/settle`，需要支持 async pending |
| Slider / Progress / Stepper | 亮度、章节进度、字号/间距 stepper | 亮度和章节进度有 pointer capture；progress width 有 transition | drag start/update/release 没有统一事件状态；stepper value tick 未统一 | `slider.drag.start/update/release/cancel`、`stepper.press/value.change` |
| Selection toolbar | `data-reader-selection-layer`、`data-reader-selection-action` | selection layer 和 toolbar action ID 存在 | range show、toolbar enter/exit、action commit 缺打断规则 | `selection.range.show/update`、`selection.toolbar.enter/action/exit` |
| Reader 封面进入 | `data-book-cover`、`openBookFocus()`、`immersive-reading` route | 长按封面 focus layer 已有；普通点击直接 route | 没有 cover shared element 到沉浸阅读页 | `reader.entry.coverToImmersive.prepare/clone/expand/fade/settle` |
| Reader 翻页 | `data-reader-page-action`、`readerTurnDirection`、keyframes | next/prev keyframes 已有，reduced-motion 可关闭 | 章节跳转、目录跳转、自动翻页没有统一进入/中断规则 | `reader.page.turn.next/prev/interrupt/settle` |
| Reader 控制层小横条 | `.fd-reader-grabber`、`.fd-reader-full-grabber` | 点击展开/收起 | 没有拉动、长按、宽屏可移动 dock | `reader.control.handle.press/longPress/drag/snap/cancel` |
| Reader 控制层运行空间 | 自动翻页/朗读控制页、沉浸页 capsule | session 状态能回沉浸页 | 控制层 running space 与 capsule 没有形变/停靠关系 | `reader.session.runningSpace.enter/expand/collapse/toCapsule` |
| Reader 控制胶囊 | `data-reader-immersive-status`、`data-reader-tts-action`、`data-reader-setting-toggle=autoPage` | capsule 静态渲染、run/pause icon 切换 | enter/exit、倒计时数字 tick、语音 pulse、run/pause morph 未实现 | `reader.session.capsule.enter/update/tick/voicePulse/control.press/pause/resume/exit` |
| Viewport / Orientation / Fold | `data-orientation`、`data-viewport-class`、resize listeners | 只做分类和响应式 CSS | 没有 prepare/freeze/reshape/settle；折叠屏展开/折叠无状态 | `viewport.orientation.prepare/freeze/reshape/settle`、`viewport.fold.expand/collapse` |

判定：除 Reader 翻页、loading、keyboard、pressed、部分 overlay/chevron 之外，多数组件目前只有选择器 ID 或静态状态变化，不能算“实现级统一纳管”。

## 7. 宽屏控制层拖动约束

适用条件：

- 只在宽屏固定控制层场景启用，当前源码对应 `data-viewport-class="tablet-expanded"` 或后续等价平台断点。
- 控制层保持固定宽度，不随屏幕继续变宽；拖动改变的是 dock 的 `x/y offset`，不是 `width`。
- 沉浸阅读、Reader 控制层、Reader 全屏控制页可以共享约束，但普通 MainTab/Library/Settings 路由不启用。

可移动空间：

- 水平范围：`safeArea.left + 16px` 到 `viewport.width - safeArea.right - dock.width - 16px`。
- 垂直范围：`safeArea.top + 16px` 到 `viewport.height - safeArea.bottom - dock.height - 16px`。
- 拖动过程中面板不能遮住系统手势区、底部主导航、Reader 亮度侧栏；冲突时优先贴近右下阅读控制区。
- 横竖屏切换、窗口 resize、折叠屏展开/折叠后，旧 offset 需要重新 clamp 到新 bounds。
- reduced-motion 下取消拖动过程中的惯性/弹性，只保留位置更新和最终贴边。

对应动效：

- `reader.control.handle.press`：80ms，grabber 轻微压缩。
- `reader.control.handle.longPress`：320ms 后进入可拖动态，dock 阴影和 handle 高亮。
- `reader.control.handle.drag.start`：dock 提升到拖动层，scale 0.98 -> 1。
- `reader.control.handle.drag.update`：跟随 pointer，使用 `transform: translate3d(...)`，不改布局宽高。
- `reader.control.handle.drag.snap`：释放后 120ms clamp/snap 到合法位置。
- `reader.control.handle.drag.cancel`：被 route 切换、返回、旋转、reduced-motion 切换打断时，80ms settle 到最近合法点。

当前源码结论：已有 `.fd-reader-grabber` / `.fd-reader-full-grabber` 和宽屏响应式布局基础，但只有点击展开/收起；`setPointerCapture` 仅用于亮度和章节进度，控制层 dock 拖动未实现。

## 8. Reader 主链路补充清单

| Motion ID | 当前源码状态 | 需要补齐的实现 |
|---|---|---|
| `reader.entry.coverToImmersive.prepare` | `data-book-cover` 已绑定，click 直接 route | 点击时读取 cover rect、目标阅读 surface rect，生成 clone layer |
| `reader.entry.coverToImmersive.expand` | 无 shared transition | cover clone 从源 rect 扩展到沉浸阅读页视觉锚点，正文层淡入 |
| `reader.entry.coverToImmersive.settle` | 无 settle | 移除 clone，恢复真实页面可交互，失败/返回时回滚 |
| `reader.session.autoPage.start` | 自动翻页开启会回沉浸页并显示 capsule | 控制层按钮 -> running space -> immersive capsule 的连续过渡 |
| `reader.session.tts.start` | 朗读开启会回沉浸页并显示 capsule | TTS 控制按钮 -> voice capsule 的连续过渡 |
| `reader.session.capsule.enter` | capsule 静态出现 | 160ms 从底部/控制层锚点进入，reduced-motion 只淡入或直接出现 |
| `reader.session.capsule.tick` | countdown 固定为 8，无 interval | 数字旧值上移淡出，新值下移淡入；低频 tick，不触发布局跳动 |
| `reader.session.capsule.voicePulse` | token 有 voice pulse，但无实际 pulse class | 朗读播放时 icon 960ms 循环轻微 scale/opacity，暂停停止并 settle |
| `reader.session.capsule.control.press` | run/pause icon 替换，通用 pressed 生效 | 按压 80ms，icon 120ms crossfade/morph，状态 settle 后更新 `aria-label` |
| `reader.session.runningSpace.enter` | 控制层内没有 running-space anchor | 自动翻页/朗读开启后，控制层出现运行中空间，显示相同状态源 |
| `reader.session.runningSpace.toCapsule` | 无空间到胶囊关系 | 返回沉浸页时 running-space 缩放/位移到 capsule 锚点 |

## 9. 通用组件补充清单

| Motion ID | 适用组件 | 当前状态 | 需要补齐 |
|---|---|---|---|
| `app.route.push.forward` | 所有 `data-route` | `app.route.push` 仅 ID | 新 route 进入方向、旧 route exit、连续点击打断 |
| `app.route.pop.backward` | `data-route-back` / demo back | `app.route.pop` 仅 ID | 返回方向、overlay 优先关闭、栈回退 settle |
| `tab.item.press` | Main tab、RSS mode、Reader module nav | 通用 pressed | active 重复点击只反馈 press |
| `tab.item.select` | 同一 tab 组首次选中 | class 切换 | active 背景/图标/label 120ms settle |
| `tab.item.switch` | A tab -> B tab | ID 存在 | indicator 从旧按钮移动到新按钮，内容轻微 crossfade |
| `dropdown.trigger.press` | 所有 dropdown trigger | ID 存在 | trigger press、chevron、menu opening 同步 |
| `dropdown.menu.expand` | filter/settings/reader/source/RSS dropdown | 部分 chevron/menu CSS | 菜单从 trigger 锚点 6px 位移进入，支持 reposition |
| `dropdown.option.select` | dropdown option | ID 存在 | option selected 120ms，随后 menu collapse 或保持打开 |
| `dropdown.menu.collapse` | 外点、返回、选择、resize | 部分关闭后重渲染 | 统一 exit，避免直接消失 |
| `button.activate` | 普通业务按钮 | pressed fallback | 激活/提交/危险操作状态分层 |
| `toggle.switch` | switches | knob transition | on/off、pending、disabled、session-start 分开 |
| `slider.drag.*` | 亮度、章节进度 | pointer capture 已有 | drag start/update/release/cancel 统一事件和 token |
| `search.state.replace` | 搜索前/后、结果为空 | ID 存在 | 输入、提交、结果替换、清空的状态过渡 |
| `feedback.toast.enter/update/exit` | toast / nav feedback | ID 存在 | 多 toast 更新与自动退出 |
| `selection.toolbar.enter/action/exit` | Reader selection | ID 存在 | 选区出现、toolbar command、关闭 |
| `viewport.orientation.*` | 旋转/窗口变化/折叠 | 只有 CSS 响应式 | freeze 当前内容、reshape 面板、settle 交互 |

## 10. 实现优先级

P0：

1. 扩展已落地的 `motionController`，把 root transaction 变成可驱动 CSS class / shared-element / async settle 的状态机。
2. 把 route、tab、dropdown、overlay、button、toggle、slider 这些通用组件完整接入 controller。
3. 先补 `reader.entry.coverToImmersive`、`reader.session.capsule.*`、`reader.control.handle.drag.*` 三条 Reader 主链路。
4. 浏览器验证脚本输出 route 覆盖、Motion ID 覆盖、reduced-motion 覆盖和组件族缺口。

P1：

1. 补 orientation/fold 的 prepare/freeze/reshape/settle。
2. 把普通业务按钮、管理页 segment、批量选择和设置行全部补语义 Motion ID。
3. 给 toast/search/selection/input 做统一动效证据。
4. 把 CSS 裸动效声明收敛到 token，并给 reduced-motion 写自动测试。

P2：

1. 平台映射 iOS/Android/HarmonyOS 的默认 easing、duration、reduced-motion 行为。
2. 加录屏/截图验收，证明关键 motion 在标准、宽屏、横屏、reduced-motion 下均成立。

## 11. 建议落地顺序

1. 扩展全局 motion controller：统一 `from/to/interruption/finalState/reducedMotion` 并驱动视觉 class。
2. 先收敛所有普通业务按钮：让无 `data-*` 的 button 也进入 button/listRow/segment/toggle family。
3. 做 `tab.item.press/select/switch` 的真实状态机和 indicator 迁移。
4. 做 `dropdown.*` 统一 controller，覆盖 filter、sort、reader setting、TTS、source menu。
5. 做 `reader.entry.coverToImmersive` shared transition。
6. 做 `reader.control.handle.*` 和宽屏 dock 拖动。
7. 做 `reader.session.capsule.*`、control-space、countdown tick、voice icon active。
8. 做 `viewport.orientation.prepare/reshape/settle` 和 fold/resize clamp。
9. 把浏览器 route smoke 固化成脚本，输出 Motion ID 覆盖率和 reduced-motion 覆盖率。

## 12. 本次验证命令

已执行：

```bash
node --check frontend-demo/render-runtime.js
```

```bash
node --check frontend-demo/motion-controller.js
```

```bash
node frontend-demo/verify/motion/verify-motion-coverage.mjs
```

```bash
node # route-contract routes vs renderRoute case 覆盖：131/131
```

```bash
node # data-* 抽取：147 个非 adapter 入口；125 个被 bind selector 直接覆盖
```

```bash
python3 -m http.server 5177 --bind 127.0.0.1
```

```text
Browser smoke: 131/131 route matched, 0 blank, 0 reduced-motion failure.
Browser smoke: data-screen-host 内 75/131 route 有普通交互元素缺 data-motion-id。
```
