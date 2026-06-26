# 动效实现缺口审计

状态：Draft v0.1

范围：基于当前 `frontend-demo/` 和三份动效规划文档，审计从“完整规划初稿”到“可交给各平台排期实现”的剩余缺口。

结论：当前已有方向、Motion ID、效果描述、平台映射、第一版可执行 registry 和关键 Motion ID 的 contract 层状态机，但仍缺组件级实现状态机、录屏证据、平台测试映射和设备验证。以下缺口全部需要补齐。

## P0：阻塞实装的缺口

| 缺口 | 当前状态 | 需要补充 | 验收标准 |
|---|---|---|---|
| Motion token 落地 | 已新增 `frontend-demo/motion-tokens.css`，并把 `frontend-demo/styles/` 中裸写的 `160ms`、`220ms`、`0.8s` 替换为 token；通用控件也已接入基础 motion token | 继续做视觉回归，确认 token 替换没有改变既有布局和关键节奏 | `rg "160ms|220ms|0.8s" frontend-demo/styles` 不命中；关键路径截图/录屏无非预期变化 |
| Reduced motion 实装 | 已新增 `@media (prefers-reduced-motion: reduce)`、`data-motion-reduced` 和 `?motionReduced=1/0` 测试开关；翻页、loading、通用控件 transition 已降级 | 补 reduced-motion capture，覆盖键盘、底表、弹窗、封面进入、控制层、翻页、loading、折叠重排 | 系统 reduced motion 或 `?motionReduced=1` 下移除位移/循环动画，状态反馈仍可辨认 |
| 可执行 Motion Contract Registry | `motion-controller.js` 已暴露 `ReaderMotionController.CONTRACT`，可把当前 renderer 的 Motion ID 解析到 family、token、state fields、state machine、平台组件和证据规则；`verify-motion-coverage.mjs` 已校验 registry 解析、状态机字段和 35 个关键 Motion ID 的精确状态机 | 继续把 exact state machine 扩展到全部 P0/P1 Motion ID，并绑定实际组件状态机 | 当前绑定和 runtime 必需 Motion ID 全部能解析并具备状态机；平台不能照抄 CSS，只能按 registry 的 Motion ID、state fields、state machine、token 和证据要求映射原生实现 |
| TAB 栏状态动效 | 已补 `tab.item.press/select/switch` contract 状态机，demo 仍是分散的 active class 样式 | 为主 TAB、阅读模块 TAB、segmented TAB 建统一 pressed/select/switch 实现和录屏 | 按下、单按钮选中、A -> B 切换、重复点击 active 行为可区分；栏尺寸稳定 |
| 下拉栏统一动效 | 已补 `dropdown.*` contract 状态机；demo 有阅读/朗读 dropdown placement、发现排序 chevron 和多个即时 mount/unmount 菜单，但没有统一实现状态机 | 补 `dropdown.trigger.press`、`dropdown.menu.expand/collapse/reposition`、`dropdown.option.press/select` 的组件实现，覆盖阅读设置、朗读设置、设置页选项、发现排序、书源更多、书架更多和书籍焦点菜单 | 所有下拉展开/收起/点击节奏一致；同层只留一个 open；选择后值/semantics 同步；resize/orientation 可重定位 |
| 通用交互组件族纳管 | 已新增 `MOTION_SELECTOR_MATRIX.md`，148 个唯一 `data-*` 入口均已映射到 Motion ID / route / platform component；demo 已通过 `data-motion-id`、`is-motion-pressed` 和 token CSS 接入基础状态；当前使用的 60 个 Motion ID 都有 contract 状态机 | 继续把基础 selector binding 深化成组件级实现状态机，并补每个组件族的录屏/截图证据 | 所有控件族都有 token、效果、平台映射、reduced-motion、实现代码和验证路径；证据文件可追溯到 Motion ID |
| 首次打开应用动效 | 已补 `app.launch.firstOpen` 规划，demo 没有 cold-start flag | 增加一次性首启动画状态；区分冷启动、后台恢复、普通 route render | 冷启动默认页/深链页只播放一次，返回和切 Tab 不重播 |
| 封面进入沉浸阅读 | 已补 Motion ID 和效果规划，demo 未实现 | 为 `[data-book-cover] -> immersive-reading` 增加 pressed、snapshot/降级、reader surface 淡入 | 点击书架封面/继续阅读封面进入 `immersive-reading`；不显示控制层；返回来源页 |
| 控制层小横条拖拽 | 当前 `.fd-reader-grabber` / `.fd-reader-full-grabber` 只有点击结构和静态样式 | 补 pointer/gesture 处理、pressed 态、拖动跟手、释放阈值和吸附动画 | 拖动中正文不动；释放只落到展开、收回或原状态之一；返回栈不乱 |
| 宽屏控制层 dock 长按移动 | 已补 `reader.control.dock.*` 规划，demo 只有固定宽度 dock 布局变量，没有长按移动状态 | 补长按识别、dock group bounds 计算、transform offset、按 viewport class 保存位置、resize/fold 越界回弹 | fixed-width dock 可移动但不变形；不跨 hinge/安全区；正文不重排；释放位置合法 |
| 自动翻页/朗读运行胶囊动效 | demo 已有 `readerAutoPageSession`、`readerTtsSession` 和 `.fd-ir-status-capsule` 静态 UI | 补 `reader.session.*` 的 route replace、胶囊进入/更新/切换/退出 token 化实现 | 从控制层或完整页开启自动翻页/朗读后回到 `immersive-reading`；只显示一个胶囊；互斥切换不排队 |
| 控制层运行中空间动效 | 文档已补 `reader.session.controlSpace.*`；demo 没有运行胶囊与控制层运行空间的 snapshot/matched 过渡 | 补控制层运行中空间组件、锚点测量、snapshot/降级 crossfade 和唯一主控规则 | 打开控制层时胶囊停靠/展开到运行空间；隐藏控制层时回到胶囊；结束态没有双主控 |
| 控制胶囊内部微动效 | 已补暂停/继续按钮、倒计时 tick 和朗读图标 active 规划，demo 仍是静态按钮/数字/图标 | 补 `.fd-ir-status-controls button` 按压与 play/pause 图标切换、`.fd-ir-countdown-dot` 数字替换和 TTS icon active/pause/reduced-motion 状态 | 按钮切换不打开控制层；数字变化不重放整颗胶囊；朗读图标播放时轻提示、暂停静态 |
| 整屏旋转适配与动效 | 已补 `viewport.orientation.prepare/reshape/settle` contract 状态机；demo 已有 `data-orientation`、`viewportClass`、`compact-landscape`、`tablet-expanded` 和 `visualViewport` resize 基础，但没有统一旋转实现状态机 | 补实现层 prepare/reshape/settle，覆盖 route/ReaderContext/session/overlay/focus 冻结、正文重分页、控制层等价容器、胶囊重锚定、宽屏 dock offset clamp 和旋转中打断 | portrait <-> landscape、compact-landscape、tablet-expanded resize 下，route/返回栈/active session 不丢；正文不跳章；控制层/胶囊/overlay/dock 都落到合法位置 |
| 打断动画状态机 | 文档有 `motion.interrupt.*`，demo 未统一控制 | 增加统一 motion state/reducer，清理 animation class、focus、pointer、route async 结果 | 连续点击、返回、关闭、loading 完成、拖动开始后最终状态唯一 |
| Motion capture 证据 | 已建立 `frontend-demo/verify/motion/` 和 `selector-matrix/` 证据目录说明，但还没有按 Motion ID 的录屏/截图媒体 | 按 Motion ID 存放录屏/GIF/关键帧截图，并回填到 `MOTION_SELECTOR_MATRIX.md` 的 Evidence 列 | 每个 P0 Motion ID 至少一份证据，命名可追溯 |
| 折叠屏/大屏验证 | 当前只有 viewport class 规划和部分 adaptive PNG | 增加 fold/open/collapse/compact-landscape 的手动或模拟器验证矩阵 | ReaderContext、overlay、返回栈、正文分页映射均有证据 |
| 平台实现映射到组件 | 平台映射已补通用组件族和 Reader 主链路的组件级方向，但仍缺 state 字段、测试文件和任务拆分 | 为每个 Motion ID 标明平台组件、state 字段、测试文件/验收方式 | Compose/SwiftUI/ArkUI 可直接拆任务 |

## P1：影响一致性的缺口

| 缺口 | 当前状态 | 需要补充 | 验收标准 |
|---|---|---|---|
| Motion ID 状态机表 | 已在 `ReaderMotionController.CONTRACT` 中建立 family fallback，并为 35 个关键 Motion ID 补 `from/to/interrupt/finalState/reducedMotion` 精确状态机 | 扩展到剩余 P0/P1 Motion ID，并把状态机与真实组件 reducer / platform test 文件绑定 | 状态机表能解释所有打断和降级，coverage 能失败提示缺失项 |
| 手势阈值 | 亮度/进度拖动有原则，无阈值 | 定义 drag slop、velocity、取消阈值、底表拖拽边界 | 手势跟手，无 easing 滞后；误触边界明确 |
| 性能预算 | 未定义 | 补 FPS、layout shift、动画属性白名单、低端设备降级 | 动画只用 transform/opacity 等优先属性；有性能验收项 |
| 无障碍/semantics | 只有 reduced motion | 补 VoiceOver/TalkBack 焦点迁移、弹窗焦点陷阱、aria/semantics 更新时机 | 动画期间不会读出隐藏 overlay；返回焦点正确 |
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

1. 已完成第一版：`motion-tokens.css`、裸写时长替换、reduced-motion CSS/测试开关、148 个 `data-*` selector 总表、基础 `data-motion-id` / pressed state 接入、`ReaderMotionController.CONTRACT` 可执行 registry，以及 35 个关键 Motion ID 的精确 contract 状态机。
2. 实现 `tab.item.press/select/switch`，先覆盖主 TAB 和阅读模块 TAB。
3. 深化通用控件族状态机：button、toggle/switch、chip/filter/segment、slider/stepper/progress、input/search、feedback/state、selection、listRow/card。
4. 实现 `dropdown.*`，覆盖全部下拉栏/锚定菜单的展开、收起、选项点击、reposition 和 reduced-motion。
5. 实现 `app.launch.firstOpen`，建立 cold-start 与 resume/route render 的区分。
6. 实现 `reader.entry.coverToImmersive`，优先覆盖书架封面和继续阅读封面。
7. 实现 `reader.control.handle.*`，覆盖控制层小横条按压、拖动、释放。
8. 实现 `reader.control.dock.*`，覆盖宽屏固定宽度 dock 长按移动、bounds clamp 和越界回弹。
9. 实现 `viewport.orientation.prepare/reshape/settle`，覆盖整屏旋转、正文重分页、控制层等价容器、运行胶囊重锚定、overlay 重锚定和宽屏 dock clamp。
10. 实现 `reader.session.autoPage.start`、`reader.session.tts.start` 和 `reader.session.capsule.*`，覆盖回沉浸阅读与运行胶囊。
11. 实现 `reader.session.controlSpace.*`，覆盖运行胶囊和控制层运行空间的停靠/展开。
12. 实现 `reader.session.capsule.control.*`、`reader.session.capsule.countdownTick` 和 `reader.session.capsule.voiceIcon.active`。
13. 抽出统一 motion state/reducer，先覆盖 tab、dropdown、通用控件族、overlay、reader entry、control handle、wide dock drag、orientation reshape、session capsule、control running space、loading、page turn。
14. 建立 `frontend-demo/verify/motion/`，录制 TAB press/select/switch、下拉栏展开/收起/点击、通用控件族、首启、封面进入、控制层显隐、小横条、宽屏 dock 拖动、整屏旋转、运行胶囊、控制层运行中空间、翻页、打断、折叠/resize。
15. 把平台映射继续细化到 state 字段、测试文件和平台任务拆分。

## 当前不应声称完成的内容

- 不能声称 demo 已完成跨端动效实现。
- 不能声称折叠屏动效已经验证。
- 不能声称各平台可以直接照代码实现。
- 不能声称 TAB 栏 press/select/switch 已有统一实现和录屏证据。
- 不能声称所有下拉栏已有统一展开、收起、选项点击、reposition 和 reduced-motion 实现证据。
- 不能声称通用按钮、chip/filter、toggle/switch、slider/stepper/progress、input/search、toast/state、selection、业务 row/card 已经完成实现层纳管；当前只有 selector 总表、基础 token/reduced-motion、基础 pressed state 接入和 contract 状态机。
- 不能声称封面进入沉浸阅读已有录屏证据。
- 不能声称宽屏控制层 dock 长按移动已有实现和 bounds 证据。
- 不能声称自动翻页/朗读运行胶囊已有完整进入、更新、切换、退出动画证据。
- 不能声称首次打开应用、控制层小横条拖拽、控制层运行中空间、控制胶囊按钮运行/暂停、倒计时数字变化或朗读图标动效已有实现证据。
- 不能声称整屏旋转已有完整实现层 `prepare/reshape/settle` 状态机、宽屏 dock clamp、运行胶囊/overlay 重锚定和录屏证据。
- 不能声称 reduced-motion 已完成录屏验证。
