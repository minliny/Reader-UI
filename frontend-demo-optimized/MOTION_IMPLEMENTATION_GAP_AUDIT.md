# 动效实现缺口审计

状态：执行中（2026-07-19 MR3 确定性 trace 已闭合）

范围：基于当前 `frontend-demo-optimized/` 和三份动效规划文档，审计从“完整规划初稿”到“可交给各平台排期实现”的剩余缺口。

结论：canonical registry 已由 95 个 MotionSpec、53 个 MotionPolicy 和 route-shell lookup 自动生成，89 个 active exact 状态机均可精确解析；十个核心家族的 normal / rapid-repeat / opposite / interrupt / reduced 共 50 条确定性 trace 已闭合。首启、Tab、下拉、封面进入、快速打断、viewport 往返和 reduced-motion 已补 7 段代表性 WebM。当前剩余缺口集中在完整十家族 × 三档 viewport 动态媒体、平台测试映射和设备验证，不能把 browser capture 当作原生 proof。

收束原则：

- `frontend-demo-optimized/` 的下一步只补 Contract proof 和高风险链路证据，不继续扩展成三端最终实现。
- Web CSS、DOM、`data-*` selector、query 参数和 fixture route stack 只服务 demo 取证；平台只能继承 Motion ID、state fields、token 语义、打断规则、reduced-motion 和验收结果。
- 平台最终实现必须在 Android Compose / iOS SwiftUI / HarmonyOS ArkUI 内用原生组件、导航、手势、safe area、keyboard inset、fold posture、accessibility focus 和性能工具自证。

## UI / Platform Ownership Split

当前 UI 侧开发输入收束为 `frontend-demo-optimized/` 与 `contracts/`：

- `frontend-demo-optimized/route-contract.js`、`frontend-demo-optimized/render-runtime.js` 和 `frontend-demo-optimized/styles/`：当前 demo 的结构、交互和视觉语义。
- `contracts/fixtures/*.json`：平台消费的 route / state / token / motion / view-state 契约数据。
- `generated/`：Swift / Kotlin / ArkTS generated contract types。
- `frontend-demo-optimized/verify/motion/verify-motion-coverage.mjs`、`contracts/tests` 和 codegen drift check：当前可执行门禁。

旧设计导出、Stitch 草案和页面包已删除，不再作为平台开发输入。真实 Compose / SwiftUI / ArkUI 组件、原生导航、设备录屏、无障碍和性能仍由各平台仓库完成。

## P0：阻塞实装的缺口

| 缺口 | 当前状态 | 需要补充 | 验收标准 |
|---|---|---|---|
| Motion token 落地 | 已新增 `frontend-demo-optimized/motion-tokens.css`，并把 `frontend-demo-optimized/styles/` 中裸写的 `160ms`、`220ms`、`0.8s` 替换为 token；通用控件也已接入基础 motion token | 继续做视觉回归，确认 token 替换没有改变既有布局和关键节奏 | `rg "160ms|220ms|0.8s" frontend-demo-optimized/styles` 不命中；关键路径截图/录屏无非预期变化 |
| Reduced motion 实装 | 已新增 `@media (prefers-reduced-motion: reduce)`、`data-motion-reduced` 和 `?motionReduced=1/0` 测试开关；翻页、loading、通用控件 transition 已降级，当前 D2 搜索页键盘路径已通过 `?reducedMotion=1` 浏览器验证并保持焦点语义 | 补 reduced-motion capture，继续覆盖底表、弹窗、封面进入、控制层、翻页、loading、折叠重排 | 系统 reduced motion 或 `?motionReduced=1` 下移除位移/循环动画，状态反馈仍可辨认 |
| 可执行 Motion Contract Registry | `motion-contract-registry.js` 由 canonical fixtures 生成并登记 95 个 MotionSpec、53 个 MotionPolicy 与 260 route-shell lookup；89 个 active exact 均可解析，其余 6 个严格限定为 3 deprecated + 3 reserved。`motion-scenario-harness.js` 已覆盖十家族 × 5 模式、四类 interrupt policy、request-first no-match 与 reduced direct-manipulation | 给 dropdown A→B redirect / reposition 补首个真实同屏消费者页面证据，并补真实连续媒体 | 当前绑定和 runtime 必需 Motion ID 全部能解析并具备状态机；平台不能照抄 CSS，只能按 registry 的 Motion ID、state fields、state machine、token 和证据要求映射原生实现 |
| TAB / segmented 状态动效 | 已补 `tab.item.press/select/switch` 和 `segment.item.switch` contract 状态机；主 TAB、阅读模块 TAB 和 segmented control 已接入 `data-motion-tab-*` / `data-motion-segment-*` 状态、`data-motion-press-id`、token 化 pressed/select/switch CSS 和 `reader.module.switch` / `segment.item.switch` 事务 | 补主 TAB / 阅读模块 TAB / segmented control 的录屏证据，并继续确认 indicator/active 层不推动布局 | 按下、单按钮选中、A -> B 切换、重复点击 active 行为可区分；栏尺寸稳定 |
| 下拉栏统一动效 | `dropdown.trigger.press/menu.expand/menu.collapse/menu.reposition/option.press/option.select` 六项已进入 canonical exact schema / fixture / test / 三端 codegen；demo 已接入 `attachDropdownMotionState`、A→B redirect、placement snapshot/reposition、键盘循环、Escape 关闭、展开后首选项焦点与关闭/选择后的 trigger 回焦。发现筛选页已用浏览器验证展开、Tab/方向键、Escape、单选提交与 reduced-motion；menu/option/trigger/switch target 已 token 化 CSS | 当前 260 个 route 没有双 dropdown 同屏宿主，A→B redirect 与自动 reposition 仅有 adapter/专项测试证据；首个实际消费者出现时必须补同屏录屏与 resize/orientation 页面证据 | 所有下拉展开/收起/点击节奏一致；同层只留一个 open；选择后值/semantics 同步；resize/orientation 可重定位；source/test 证据不能冒充页面验收 |
| 通用交互组件族纳管 | 已新增 `MOTION_SELECTOR_MATRIX.md`，148 个唯一 `data-*` 入口均已映射到 Motion ID / route / platform component；demo 已通过 `data-motion-id`、`data-motion-component-*`、`is-motion-pressed` 和 token CSS 接入 button、toggle、choice、numeric、input、state、selection、surface 的 normalized 状态字段；当前 coverage 使用的 Motion ID 都有 contract 状态机 | 继续补每个组件族的录屏/截图证据、平台测试文件名和 async pending / focus restore 等深状态 | 所有控件族都有 token、效果、平台映射、reduced-motion、实现代码和验证路径；证据文件可追溯到 Motion ID |
| 首次打开应用动效 | 已补 `app.launch.firstOpen` 规划和第一版实现层 adapter；demo 会在 cold start 初始化 `firstOpenMotion`，在 root / screen host 写入 `data-motion-first-open-*`，用 `--fd-motion-effective-first-open` 播放一次性首屏淡入并自动 settle；reduced-motion 即时落位 | 补冷启动默认页/深链页录屏、后台恢复设备证据和平台测试映射 | 冷启动默认页/深链页只播放一次，返回和切 Tab 不重播 |
| 封面进入沉浸阅读 | 已补 `reader.entry.coverToImmersive` / `reader.entry.actionToImmersive` 实现层 adapter；书架封面、继续阅读封面和普通阅读按钮会写入 `data-motion-entry-*` 状态，封面入口有 snapshot 层，目标阅读面有 token 化淡入和 reduced-motion 降级 | 补封面入口、无封面按钮入口、返回来源页、连续点击和录屏/截图证据，并继续覆盖详情页/章节行入口 | 点击书架封面/继续阅读封面进入 `immersive-reading`；不显示控制层；返回来源页 |
| 控制层小横条拖拽 | 已补 `reader.control.handle.press/drag/release` 精确状态机和实现层 adapter；`.fd-reader-grabber` / `.fd-reader-full-grabber` 会写入 `data-motion-control-handle-*` 状态，拖动使用临时 offset，释放按阈值展开/收回，reduced-motion 即时提交；full 页小横条已可收回到对应控制层 | 补录屏/截图证据，并继续验证真实触摸设备上的长路径 drag、方向阈值和目录 full 页上拉 promote | 拖动中正文不动；释放只落到展开、收回或原状态之一；返回栈不乱 |
| 宽屏控制层 dock 长按移动 | 已补 `reader.control.dock.longPress/drag/release/rebound` 精确状态机和第一版实现层 adapter；宽屏 `.fd-reader-grabber` 长按后移动同一组 fixed-width dock，按 ReaderFrame/dock group 计算 bounds，transform offset，按 viewport class 保存位置，并在 resize 后 clamp/rebound；窄屏会清理 dock transform | 补真实鼠标/触摸录屏、折叠屏 hinge/pane 安全区验证、旋转中打断证据和平台测试映射 | fixed-width dock 可移动但不变形；不跨 hinge/安全区；正文不重排；释放位置合法 |
| 自动翻页/朗读运行胶囊动效 | `reader.session.autoPage.start` / `reader.session.tts.start` 与 `reader.session.capsule.enter/update/control.press-toggle/countdownTick/voiceIcon.active/switch/exit` 共 9 项已进入 canonical exact schema / fixture / test / 三端 codegen；沉浸页胶囊写入 `data-motion-session-capsule-*` 状态，倒计时局部更新并保留固定宽度，TTS/自动翻页互斥 | 补录屏证据、后台/切章打断验证和平台测试映射 | 从控制层或完整页开启自动翻页/朗读后回到 `immersive-reading`；只显示一个胶囊；互斥切换不排队 |
| 控制层上方胶囊锚点动效 | 当前产品明确只保留一颗沉浸阅读胶囊；`reader.session.controlSpace.*` 保留为 contract-reserved，runtime coverage 断言不渲染重复控制层胶囊 DOM | 平台实现继续保持单 owner / 单 hit target；如产品未来恢复重锚定，必须先重新审计 contract 与交互所有权 | 控制层与沉浸页不出现双主控；当前路径不把 reserved MotionId 误报为生产实现 |
| 控制胶囊内部微动效 | 已补 `.fd-ir-status-controls button` / `data-reader-capsule-control` 局部按压、play/pause 状态、`data-reader-capsule-countdown` 数字 tick、`data-reader-capsule-voice` 播放态 pulse 和 reduced-motion 静态降级 | 补录屏证据、真实触摸按压和停止/切换时的退出验证 | 按钮切换不打开控制层；数字变化不重放整颗胶囊；朗读图标播放时轻提示、暂停静态 |
| 整屏旋转适配与动效 | 已补 `viewport.orientation.prepare/reshape/settle` 第一版实现层 adapter；resize / `visualViewport.resize` 发生方向或 viewport class 变化时，root / screen host 会写入 `data-motion-orientation-*`，记录 route、session、overlay、focus、dock sync、from/to viewport 和 reanchor 状态，并用 token 化 anchor settle 动效；宽屏 dock 会复用 resize clamp/rebound | 补真实旋转录屏、折叠屏 hinge/pane 验证、正文字符锚点重分页证据、overlay/focus 恢复自动化和平台测试映射 | portrait <-> landscape、compact-landscape、tablet-expanded resize 下，route/返回栈/active session 不丢；正文不跳章；控制层/胶囊/overlay/dock 都落到合法位置 |
| 打断动画状态机 | 已补 `motion.interrupt.cancel/redirect/completeThenReplace` 第一版实现层 adapter；route push/replace/back、Tab 切换、viewport 变化、loading 完成、宽屏 dock 拖动开始、pointer cancel、连续下拉 A->B 和 reader loading 异步结果会写入 root / screen host 或 dropdown switch / async result 状态，清理 pressed、tab/segment/dropdown pressed、handle dragging 和 dock dragging 临时状态，并接入 token 化 `interruptSettle` / dropdown switch / async completion CSS；sheet/dialog/keyboard 关闭后的最终焦点字段已补二次同步 | 补连续 overlay 互斥打断、真实交互录屏和平台测试映射 | 连续点击、返回、关闭、loading 完成、拖动开始后最终状态唯一；旧异步结果不能覆盖新 route |
| Motion capture 证据 | `evidence/manifest.json` 现含 9 张历史代表截图和 7 段 Playwright WebM；WebM 记录 byteLength / SHA-256，可由 `tools/motion/capture-browser-motion-evidence.mjs` 重录，覆盖首启、Tab、下拉、封面进入、快速打断、viewport 往返和 reduced-motion；旧 controlSpace 截图只作为 reserved 历史参考 | 继续补控制层手势、session capsule、翻页/章节、overlay/keyboard/source-switch 和完整三档媒体，并回填 selector matrix | P0 高风险 Motion ID 至少一份 demo proof；证据命名和 digest 可追溯；明确 browser WebM 不等于平台真机录屏 |
| 折叠屏/大屏验证 | 当前只有 viewport class 规划和部分 adaptive PNG | 增加 fold/open/collapse/compact-landscape 的手动或模拟器验证矩阵 | ReaderContext、overlay、返回栈、正文分页映射均有证据 |
| 平台实现映射到组件 | 平台映射已补通用组件族和 Reader 主链路的组件级方向，并新增 Contract / Demo proof / Platform implementation 分层 | 继续为高风险 Motion ID 标明平台组件、state 字段、测试文件/验收方式和真机证据类型 | Compose/SwiftUI/ArkUI 可按 native work item 拆任务；不引用 Web CSS/DOM 作为实现依据 |

## P1：影响一致性的缺口

| 缺口 | 当前状态 | 需要补充 | 验收标准 |
|---|---|---|---|
| Motion ID 状态机表 | canonical registry 对 89/95 active exact 状态机执行 request-first 精确解析；D5 runtime 消费完整 exact 集合，legacy family fallback 只保留兼容用途。其余 6 个为 3 deprecated + 3 contract-reserved 非生产豁免 | 把 active 状态机与真实组件 reducer / platform test 文件持续绑定 | 状态机表能解释所有打断和降级，coverage 能失败提示缺失项 |
| 手势阈值 | Reader handle 已固定 4 drag slop、quick 34 / full 16 commit threshold；Dock 已固定 320ms long press 和 16 安全边距。亮度/进度、底表和 fling 的完整平台阈值仍待补 | 继续定义 slider、velocity、取消阈值和底表拖拽边界，并做 density 映射 | 手势跟手，无 easing 滞后；误触边界明确；跨 density 结果一致 |
| 性能预算 | 未定义 | 补 FPS、layout shift、动画属性白名单、低端设备降级 | 动画只用 transform/opacity 等优先属性；有性能验收项 |
| 无障碍/semantics | Web demo 已验证 sheet 初始焦点、dialog Tab 环、keyboard 输入焦点和三类关闭后的 trigger focus restore；原生平台尚无 VoiceOver/TalkBack 证据 | 补 VoiceOver/TalkBack 焦点迁移、原生弹窗焦点陷阱、aria/semantics 更新时机 | 动画期间不会读出隐藏 overlay；返回焦点正确 |
| Reader 互斥状态 | 已有原则，未成表 | 补 TTS、自动翻页、章节跳转、进度拖动、翻页动画互斥矩阵 | 同时触发时结果确定，不出现双状态 |
| 运行会话退出策略 | 当前只定义启动和静态胶囊，缺少生命周期表 | 补停止、暂停、返回、退出阅读、章节跳转、后台切换时的 session/capsule 结果 | 胶囊隐藏、保留或暂停的规则明确；不会拦截沉浸阅读热区 |
| 封面进入的跨场景覆盖 | 只补了书架/继续阅读/普通入口 | 细化搜索结果、详情页封面、章节行、发现页封面是否走同一 Motion ID | 每个入口都有明确动效或降级策略 |

## P2：交付治理缺口

| 缺口 | 当前状态 | 需要补充 | 验收标准 |
|---|---|---|---|
| Haptic/音效策略 | 未定义 | 决定是否需要 haptic，哪些动作触发，reduced motion 下是否保留 | 平台一致，不默认增加噪声反馈 |
| 设计验收总表 | 分散在三份文档 | 建立 Motion ID -> demo route -> 证据 -> 平台组件 -> 测试方式总表 | 评审时能逐项勾选 |
| 版本治理 | 未定义 | 规定 token/Motion ID 变更流程和平台兼容策略 | Motion 变更不会让平台实现失配 |
| 文档与 demo 同步规则 | 未定义 | 每次修改 demo 动效必须同步 contract/effects/mapping/gap audit | 文档不会变成过期规划 |

## P0 推荐落地顺序

1. 已完成：`motion-tokens.css`、裸写时长替换、reduced-motion CSS/测试开关、selector 总表、基础 `data-motion-id` / pressed state，以及由 canonical fixtures 生成的 95-spec registry；89 个 active exact 状态机全部可解析，其余 6 个为门禁固定的 3 deprecated + 3 reserved 非生产条目。十家族 × 5 模式的 50 条确定性 trace 已通过；真实连续媒体仍是独立门禁。
2. 已完成第一版：主 TAB、阅读模块 TAB 和 segmented control 已实现 `tab.item.press/select/switch` / `segment.item.switch` adapter、`reader.module.switch` / `segment.item.switch` 事务和 token 化状态；主 Tab normal / rapid interrupt / reduced-motion 已补代表性 WebM，阅读模块 TAB 与 segmented control 的完整录屏仍待补。
3. 已完成第一版：通用控件族已接入 `data-motion-component-*` normalized adapter，覆盖 button、toggle/switch、chip/filter/segment、slider/stepper/progress、input/search、feedback/state、selection、listRow/card 的 family / role / state / phase / value 字段；下一步补全族录屏、async pending、focus restore 和平台测试文件映射。
4. 已完成第八批：`dropdown.*` 六项已进入 canonical exact contract，并接入 trigger/menu/option 状态、press-id、焦点进入/回还、键盘循环、A→B redirect、placement snapshot/reposition 与 reduced-motion；发现筛选真实页已完成展开/选择/Escape/回焦验证。下一步是给尚无真实消费者的双 dropdown redirect / 自动 reposition 补首个同屏页面证据。
- 第九批补充：`input.focus/blur/clear/focus-blur/submit`、`search.state.replace`、`state.content.replace` 已进入 exact contract、三端 codegen 与 runtime adapter。D2 canonical 图书搜索页完成 before/loading/results/empty/error、Enter submit、最新请求接管、旧请求 discard、清空回焦、键盘 blur 保值和 reduced-motion 浏览器验收；Reader 外观页 18px→19px 已验证稳定内容宿主替换。
- 第十批补充：button、toggle、chip、slider start/update/release、stepper press/value、card press/select/route、listRow select 已进入 exact contract、三端 codegen 与统一 primitive runtime adapter。真实页面验收覆盖外观步进、亮度指针/键盘、自动亮度开关、书架按钮/卡片、Discover 选项、同步恢复卡片、书源候选行和 query reduced-motion；同时修复 `[data-restore-scopes]` / `[data-source-index]` 覆盖交互 MotionId 的 selector 优先级缺口。
5. 已完成第一版：`app.launch.firstOpen` 已接入 cold-start 一次性状态、root/screen host `data-motion-first-open-*`、token 化首屏淡入和 reduced-motion 即时 settle；下一步补默认页/深链页录屏、后台恢复设备证据和平台测试映射。
6. 已完成第一版：`reader.entry.coverToImmersive` / `reader.entry.actionToImmersive` 已接入 source cover/action、snapshot、target reveal 和 reduced-motion 状态；下一步补录屏、连续点击、返回来源页和详情/章节入口证据。
7. 已完成第一版：`reader.control.handle.press/drag/release` 已接入小横条 press、drag preview、release snap/expand/collapse、full 页收回和 reduced-motion；下一步补真实触摸/鼠标录屏证据和目录 full 页上拉 promote 验证。
8. 已完成第一版：`reader.control.dock.*` 已接入宽屏 fixed-width dock 长按移动、bounds clamp、viewport class offset 保存、resize 越界回弹和窄屏 transform 清理；下一步补真实设备/折叠屏/旋转打断录屏证据。
9. 已完成第一版：`viewport.orientation.prepare/reshape/settle` 已接入 root / screen host `data-motion-orientation-*`、route/session/overlay/focus/dock 元数据、token 化 reshape/anchor settle、reduced-motion 即时 settle 和宽屏 dock clamp；下一步补真实旋转录屏、折叠屏 hinge/pane、正文字符锚点重分页和 overlay/focus 恢复证据。
10. 已完成第一版：`reader.session.autoPage.start`、`reader.session.tts.start` 和 `reader.session.capsule.*` 已接入回沉浸阅读、唯一运行胶囊、内部更新、互斥切换、退出状态和 token 化 CSS；下一步补录屏、停止/退出打断和平台测试。
11. 已收回生产声明：`reader.session.controlSpace.*` 只保留 contract-reserved 与历史参考证据；当前 runtime coverage 明确断言控制层不渲染第二颗胶囊，也不把该家族提升为 canonical exact。
12. 已完成第一版：`reader.session.capsule.control.*`、`reader.session.capsule.countdownTick` 和 `reader.session.capsule.voiceIcon.active` 已接入局部按钮、倒计时数字和朗读图标状态；下一步补真实设备/录屏证据。
13. 已完成第一版：`motion.interrupt.*` 已接入统一 interrupt adapter、root/screen host `data-motion-interrupt-*`、临时 pressed/dragging/dropdown 清理、route/Tab/viewport/loading/dock drag/连续下拉 A->B 入口和 token 化短收尾；reader loading 结果已补 `data-motion-async-*` request-scoped 状态、取消/过期防覆盖和 completion CSS；下一步补 overlay 关闭、焦点恢复自动化和录屏证据。
14. 已完成第一版：`overlay.keyboard/sheet/dialog.*` 已接入 `data-motion-overlay-*` role/state/action/focus-return 字段；sheet/dialog 延迟移焦避免 click 覆盖，dialog Tab 环、keyboard canonical `overlay.keyboard.enter-exit`、三类关闭最终态二次同步和 trigger focus restore 已通过浏览器验证；D2 当前搜索 renderer 已接回可达 keyboard host；下一步补连续 overlay 打断、遮罩互斥、录屏和平台焦点测试。
15. 已建立 `frontend-demo-optimized/verify/motion/evidence/manifest.json`，并补 9 张历史截图与 7 段可重录 browser WebM；下一步补控制层显隐/手势、宽屏 dock、session capsule、翻页/章节、overlay/keyboard/source-switch、折叠和完整三档视频；controlSpace 历史图不作为当前生产证据。
16. 把平台映射继续细化到 state 字段、测试文件和平台任务拆分。

收束后的优先级：先保留并补证据的 demo 高风险链路是 TAB/dropdown、封面进阅读、阅读控制层、单一自动翻页/朗读胶囊、orientation/resize、interrupt、reduced-motion；平台侧优先拆 native work item，包括 token adapter、motion reducer、原生导航、原生 overlay、Reader 控制层手势、运行 session、orientation/fold、accessibility/performance。

## 当前不应声称完成的内容

- 不能声称 demo 已完成跨端动效实现。
- 不能声称折叠屏动效已经验证。
- 不能声称各平台可以直接照代码实现。
- 不能声称 TAB / segmented press/select/switch 已有全量录屏证据；当前已完成实现层 adapter，并补主 TAB normal / rapid interrupt / reduced-motion WebM，但阅读模块 TAB 与 segmented control 媒体仍不完整。
- 不能声称所有下拉栏已有全量录屏证据；当前已完成 trigger/menu/option/switch adapter、token CSS、coverage gate 和单菜单 expand/collapse WebM，但打开 A 后切 B 与 resize/orientation reposition 仍需证据。
- 不能声称通用按钮、chip/filter、toggle/switch、slider/stepper/progress、input/search、toast/state、selection、业务 row/card 已经完成全量交付；当前已有 selector 总表、基础 token/reduced-motion、normalized `data-motion-component-*` 状态 adapter 和 contract 状态机，但全族录屏、async pending、focus restore 和平台测试映射仍缺。
- 不能声称 `frontend-demo-optimized` 或三个 Host 已实现新的拟物书本 morph；当前闭环仅覆盖 canonical Contract、三端 generated registry 和独立本地 harness，旧 snapshot adapter、详情/章节降级、连续点击、anchor 丢失与真机视频仍需补齐。
- 不能声称宽屏控制层 dock 长按移动已有真实设备、折叠屏或录屏证据；当前只有第一版实现层 adapter、bounds clamp 和 coverage gate。
- 不能声称自动翻页/朗读运行胶囊已有完整录屏、停止/退出打断或平台测试证据；当前已有第一版实现层 adapter、局部倒计时 timer、coverage gate 和自动翻页胶囊代表截图。
- 不能声称首次打开应用已有设备证据；首启已有 browser WebM，控制胶囊按钮运行/暂停、倒计时数字变化和朗读图标已有第一版实现层 adapter，但真实设备录屏仍缺。旧控制层上方胶囊锚点截图只作 reserved 历史参考，不代表当前生产实现；控制层小横条已有第一版实现层 adapter，但真实设备录屏和 full 页 promote 证据仍缺。
- 不能声称整屏旋转已有真实设备、折叠屏、正文字符锚点重分页和完整三档录屏证据；当前已有第一版 adapter、状态/元数据、token CSS、coverage gate 与 portrait→landscape→portrait browser WebM。
- 不能声称打断动画已有完整自动化和录屏证据；当前已有第一版 `motion.interrupt.*` adapter、临时状态清理、coverage gate 与快速 Tab redirect WebM，连续 overlay、下拉 A→B、loading completion 和 source-switch 的完整录屏还需深化。
- 不能声称 reduced-motion 已完成跨端录屏验证；当前只有主 Tab 的 browser reduced-motion 代表 WebM，三个原生平台的系统设置与设备证据仍缺。
- 不能把 `frontend-demo-optimized/` 的 CSS、DOM、`data-*` 字段、截图或 route stack 作为 Android / iOS / HarmonyOS 的最终前端实现依据；它们只证明契约样板。
- 不能把 demo coverage 通过等同于平台实现完成；平台必须另行提供 native test、真机/模拟器录屏、无障碍和性能证据。
