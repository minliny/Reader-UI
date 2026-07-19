# Reader Motion 四层交付规划

状态：Reader 2 控制层 MR1 已完成自验；MR2 Reference Batch 进行中；89/95 canonical MotionId 已有精确状态机，其余 6 条严格限定为 3 个 deprecated 与 3 个 contract-reserved；P0 仅有两个 contract-reserved controlSpace 项不进入生产路径

更新时间：2026-07-16

## 1. 结论

Reader 后续不在 Figma、文字契约、本地 demo、三个 Host 之间三选一，而采用四层分工：

| 层 | 职责 | 权威性 / 最终性 |
| --- | --- | --- |
| Figma Motion Reference | 核心动效的起止画面、关键帧、轨迹、层级、锚点和视觉节奏 | 视觉参考；不是运行时权威，也不是最终实现 |
| Motion Contract | `MotionId`、触发、from/to、时长 token、缓动、打断、终态、cleanup、reduced-motion | 跨端语义与规则的唯一权威 |
| `frontend-demo-optimized/` | 状态切换、连续操作、打断、响应式、降级和证据采集 | 浏览器可执行参考实现；不等于原生平台实现 |
| iOS / Android / HarmonyOS | SwiftUI / Compose / ArkUI 原生动画、手势、导航、安全区、系统辅助功能与真机证明 | 产品最终实现 |

Motion 的视觉和状态逻辑属于 Native UI / MotionAdapter。HTTP、文件、系统 TTS、通知等设备能力仍属于 HostAdapter；Motion 不进入 HostAdapter 或 Core。

## 2. 前置门禁与对原建议的调整

Reader 2 控制层的静态输入现已冻结，Reader-UI 回写和 Phone / CompactLandscape / TabletExpanded 浏览器复验已经完成，因此控制层 Motion 可以启动；这不等于其他产品域的全部静态页面都已关闭。

当前按以下顺序推进：

1. 当前 Contract 文档与真实 schema 已发生漂移，Motion 的第一步才是 `MR0 · Contract Truth Reset`。否则 Figma 会绑定错误数量、重复 ID 或不完整状态机。
2. Figma 先建总索引和一个端到端样板，不一次画完十个家族。首个家族必须同时通过视觉、结构化 Contract 和 demo 行为门禁，之后才批量扩展。

Figma 可以用 Smart Animate 或 prototype 辅助评审，但 reaction 不是交付门槛。必须交付的是可编辑关键帧、时间轴标注、层级/锚点关系和 reduced-motion / interrupt storyboard。

## 3. 当前审计事实

### 3.1 Figma

- Material M0–M5 已形成静态页面和三档响应式装配候选；结构存在不等于视觉定稿。
- 当前已新增独立的 `25 · Motion Reference`，其中 `MR1 · Reader Control Layer` 只实例化 `15 · Reader 2` 的 canonical components。
- `15 · Reader` 与 `23 · Pages · Final` 当前均为零 prototype reaction。
- MR1 已建立 `reader.control.show/hide`、`reader.quick.promote`、`reader.module.switch` 四条可编辑 timeline 与 `MotionId -> keyframe` 映射。
- 2026-07-16 live page 已扩展到 21 个 Review artifact：14 个包含手工关键帧，J/K/L/M/O/P/Q 七个主要依赖 Motion Style；这些新增样板表示 MR2 已启动，但不等于十个家族闭环或动态播放验收完成。

因此，当前应写成“控制层 MR1 已自验、MR2 样板批次进行中”，不能扩写成全部动效或全部页面完成；Motion 是独立工作轨，不叫 Material M6。

### 3.2 Motion Contract

- 当前 canonical 数量为 95 个 `MotionId`、95 条 MotionSpec fixture、53 条显式 MotionPolicy，覆盖 12 个 operation。
- Swift / Kotlin / ArkTS 已生成 MotionSpec registry、MotionPolicy registry 和 resolver。
- 现有结构化字段覆盖实现分类、容器、operation、visual pattern、interrupt policy 和 reduced-motion policy。
- 真实 schema 已完成当前生产集合的逐族审计：前十批 79 项之后，筛选、批量选择、文本选择、危险确认和 tooling 模式切换 10 项也已纳入条件必填，当前共 89 个 MotionId 具有 `trigger`、`from`、`to`、`interrupt`、`finalState`、`cleanup`。其余 6 项不是待实现生产动效，而是 3 个 deprecated 兼容 ID 与 3 个 contract-reserved ID。
- 旧审计和 Host 镜像文档仍可能混有 84/93/95、28/50/53 等不同批次数量，必须以当前 schema / fixtures 为准。
- `loop` 等字段的 Swift / Kotlin / ArkTS 生成等价性仍需在 MR0 收口。

因此，不能把 95 个 MotionSpec 全部宣称为生产实现；准确状态是“89 个 active MotionId 已具备完整跨端状态机，3 个 deprecated 仅保 ABI，3 个 contract-reserved 当前不渲染”。

### 3.3 本地 demo

- canonical contract registry 已更新为 95/95；其中 53 条已审计 fixtures 逐字段对齐。
- demo controller 仍维护一套手写 duration、prefix 和状态机，没有直接以 canonical generated registry 作为唯一输入。
- 当前证据 manifest 只有 9 条静态 JPG 记录，没有 WebM 动态闭环。
- 已新增 Reader 控制层最小 transition harness，覆盖 normal、latest-wins、相反操作、完整页展开/收起、返回层级和最终状态清理；它还不是覆盖全部十个家族的 MR3 统一 harness。
- 控制层之外已出现书架、阅读进入、Session Capsule、TTS Timer、Dropdown 等 Review 样板，但仍需逐族补齐 Contract、harness、interrupt、reduced-motion 与动态证据。

### 3.4 三个 Host

三个 Host 都不是“尚无 MotionAdapter”，而是“已有骨架和部分生产接入，但没有原生动效闭环”：

| Host | 已有基础 | 主要缺口 |
| --- | --- | --- |
| iOS | generated enum/spec、`ReaderMotionAdapter`、resolver、系统 Reduce Motion；Tab/路由/翻页/胶囊/部分 Reader 手势已接入 | transaction 生命周期、Dock reducer、完整跟手翻页、orientation/reshape、回弹、Instruments 与真机证据 |
| Android | generated adapter/policy/controller、ViewModel transaction、系统动画缩放读取 | 实际 Compose 视觉层仍有硬编码 duration；Reader gestures、Dock、fold/orientation、JankStats/Macrobenchmark 与真机证据 |
| HarmonyOS | generated table、resolver、`MotionAdapter`、路由与少数组件接入 | resolver-first、系统 reduced-motion、复杂手势、interrupt controller、visual-pattern 映射、Profiler 与真机证据 |

已有单测只能证明 registry / resolver / 基础映射，不能替代画面、手势、系统返回、旋转和性能验收。

## 4. Figma Motion Reference 范围

计划新增 `25 · Motion Reference`，只覆盖十个核心家族，不复制 235 个 route，也不为每个普通控件逐项画 storyboard。

| 家族 | 代表 MotionId | Figma 交付 |
| --- | --- | --- |
| 1. Route / Tab Page Flow | `app.route.*`、`tab.item.*`、`tab.switch` | 页面层级、方向、Tab indicator 与内容区节奏 |
| 2. 封面进入阅读 | `reader.entry.coverToImmersive`、`reader.entry.actionToImmersive` | source / anchor / target、封面进入上下文和无封面降级 |
| 3. 翻页与章节跳转 | `reader.page.turn.next-prev`、`reader.chapter.jump` | 前后页层级、方向、正文稳定和章节替换 |
| 4. 控制层与模块 | `reader.control.show/hide`、`reader.quick.promote`、`reader.module.switch`、`reader.panel.expand/collapse` | 控制层显隐、控制首页到快捷栏、模块切换、快捷栏与完整页互转 |
| 5. Handle / Dock / Slider | `reader.control.handle.*`、`reader.control.dock.*`、`slider.drag.*` | 手势轨迹、合法边界、释放、回弹与跟手阶段 |
| 6. Session Capsule | `reader.session.capsule.enter/update/switch/exit` | 唯一胶囊、内容局部更新、互斥切换与退出 |
| 7. Capsule Anchor Morph（reserved） | `reader.session.controlSpace.*` | 当前产品不渲染控制层重复胶囊；只保留未来可能恢复重锚定时的参考位，不计入生产 exact 状态机 |
| 8. TTS / 自动翻页局部状态 | `reader.session.tts.start`、`reader.session.autoPage.start`、capsule control/tick/voice | 播放、暂停、倒计时和语音状态的局部微动效 |
| 9. Edge Tools / Overlay | `overlay.sheet.*`、`overlay.dialog.*`、`overlay.keyboard.*`、`source.switch.route.*` | 进入方向、遮罩、焦点、换源锚点和退出 |
| 10. Orientation / Interrupt | `viewport.orientation.*`、`motion.interrupt.*` | prepare/reshape/settle、A→B 接管、取消、替换和 reduced-motion |

按钮、Switch、Chip、普通 Toast 等只做一个共享 `Ink Response` 样板。Figma 标注 canonical token 名称，不写页面私有毫秒值。

每个核心家族至少包含：

1. MotionId 与 Contract version。
2. 代表 route / state / viewport。
3. 起点、1–3 个中间关键帧、终点。
4. z-order、裁切、锚点、轨迹和不应移动的区域。
5. duration / easing token 名称。
6. 至少一种打断 storyboard。
7. reduced-motion 终态。
8. 对应 demo harness scenario id。

## 5. MR0–MR5 执行计划

下面是 VC3 通过后才启动的 Motion Reference / Runtime 工作轨：

| 阶段 | 当前状态 | 工作内容 | 完成门槛 |
| --- | --- | --- | --- |
| MR0 · Contract Truth Reset | Route / Tab、Reader 主链路、input/search、基础交互、筛选/选择/确认/tooling 闭环 | 已统一 95 MotionId / 53 explicit policy；89 个 active MotionId 已进入 fixture/test/codegen exact registry，剩余 6 个由门禁固定为 3 deprecated + 3 reserved。Reader 外观/亮度、书架、Discover、同步恢复和换源真实页完成 pointer、keyboard、redirect、reduced-motion 验证，并修复恢复卡片/书源候选行的 selector 覆盖冲突；unknown request 返回 no-match diagnostic。剩余工作是首个双 dropdown/reposition 实际消费者页面证据 | active exact-set 与 drift gate 通过；两个 P0 controlSpace 保持 contract-reserved |
| MR1 · One-family Pilot | 自验完成，待用户确认 | 已建立 `25 · Motion Reference`，完成控制层 show/hide/promote/module switch 与 panel expand/collapse 的 Contract、Figma timeline 和最小 harness | Reader 2 组件未被重画；三档 viewport 的 normal / interrupt / reduced 场景通过；用户确认视觉节奏后关闭 MR1 |
| MR2 · Reference Batch | 进行中 | `Review A-R`（含 Dropdown J1/J2）已形成第一批 Figma 样板；继续按风险补十个核心家族的 Contract 精化与本地 harness | 十个家族全部有 Figma/Contract/harness 三方映射；普通控件没有重复 storyboard；无私有 duration |
| MR3 · Unified Demo Harness | 未开始 | demo 直接消费 canonical registry / resolver；实现四种 interrupt policy、动态 reduced-motion 收束、连续操作、resize/orientation 和确定性 trace | 每个核心家族有 normal、快速重复、相反操作、打断、reduced、关键 viewport 场景；最终状态断言通过；产出截图、WebM 和事件 trace |
| MR4 · Native Motion Closure | 未开始 | iOS / Android / HarmonyOS 分别收口 resolver-first 和原生 visual pattern；清理未经批准的裸动画 | 生产调用都能反查 canonical spec；未知 motion 不静默伪装为 interrupt；Motion 不进入 HostAdapter/Core；三端目标测试通过 |
| MR5 · Device Evidence | 未开始 | 真机/模拟器录屏、帧率/卡顿、手势、系统返回、键盘、安全区、旋转/折叠、reduced-motion、无障碍 | 建立 `MotionId -> test -> video -> device/OS -> result` 清单；核心家族三端都有最终状态和性能证明 |

## 6. 首个样板为什么选 Reader 控制层

首个 Motion 样板已经选择 `reader.control.show/hide`、`reader.quick.promote`、`reader.module.switch` 和 `reader.panel.expand/collapse`，原因是：

- 对应静态 Phone / Compact / Tablet 组件必须先在 VC0–VC3 中完成验收，届时才可作为关键帧起止画面。
- 同时包含 overlay 层级、模块切换、快捷到完整页和打断，足以验证四层流程。
- 这是此前返工最集中的区域；先把方法在这里锁死，比一次画完十个家族风险更低。

后续 Reference 可以继续分批扩展，但每个家族仍需独立通过 Figma、Contract、demo harness 与动态证据门禁，不能因为画布上已有 Review frame 就视为完成。

## 7. 统一验收规则

1. Figma 只定义“看起来怎样”，不生成或替换本地页面结构。
2. Contract 只接受 canonical MotionId 和 token；精确数值来自 token fixture，不来自 Figma 手写标注。
3. Demo 必须验证行为和最终状态，不能只提供静态截图或源码字符串 coverage。
4. Host 必须使用原生 API；Web CSS、DOM、`data-*` 和 route query 不是平台接口。
5. 直接操控阶段必须跟手，不应用预设 easing；释放阶段才允许 snap/rebound。
6. reduced-motion 不改变状态语义、焦点恢复、互斥、async guard 或最终状态。
7. 未知 MotionId / policy 缺失必须 fail safe 为无动画并记录诊断，不能伪装成另一个 MotionId。
8. Figma、Contract、demo、任一 Host 的单层通过都不能单独宣称该动效完成。

## 8. 回写与仓库边界

```text
静态 VC0–VC3 关闭并冻结起止画面
  -> Figma Motion Reference 确认关键帧与视觉节奏
  -> 更新 canonical Motion Contract / token
  -> Codex 显式实现或调整 demo harness
  -> iOS / Android / HarmonyOS 各自实现已确认静态 UI 并映射原生 Motion API
  -> 真机证据与跨端验收
```

当前没有 Figma → Reader-UI 或 Figma → Host 的自动同步。Figma 可以辅助提取关键帧、轨迹、token 名称和时间值，但所有代码变更必须显式、可审计地进入对应仓库。
