# Reader 全产品设计与交付唯一执行基线

状态：已由用户确认，作为当前唯一执行基线；第 1 项样板口径已确认，第 2 项 12 个非 Reader 页面族 VC0 批量审计进行中

更新时间：2026-07-19

## 0. 目的与边界

本文把散落在产品章程、能力矩阵、Slice、Figma、Motion、Reader-UI、Core、三端 Host 和发布文档中的任务归并为一条执行主线，解决以下混用：

- Figma 结构完成不等于视觉定稿；
- Reader-UI 合同可解析不等于三端原生完成；
- 本地代码与自动化测试通过不等于人工、模拟器或真机验收；
- 候选 manifest、tag 或 sibling package 不等于可信发布制品；
- 单个能力子域完成不等于 Slice、完整前端或完整产品完成。

本文是规划索引和状态控制面，不替代 schema、fixture、代码、测试、截图、录屏、设备日志、corpus 或 artifact。状态发生变化时，必须先产生对应层的原始证据，再更新本文；不得用本文反向生成“已完成”证据。

## 1. 权威顺序

冲突时按下列顺序解释，不把状态快照提升为项目范围权威：

| 层级 | 权威输入 | 回答的问题 | 不能证明什么 |
| --- | --- | --- | --- |
| 1. 项目最高约束 | [Reader 项目章程](../../Reader-Core-Native/docs/PROJECT_CHARTER.md) | 项目上界、Legado 能力底线、Core/Host 红线、首批平台 | 当前实现进度 |
| 2. 兼容能力事实 | [Legado 能力清单](../../Reader-Core-Native/docs/LEGADO_CAPABILITY_INVENTORY.md) 与 Core 当前代码/corpus | 要兼容的语义、实体和真实源行为 | UI、三端和设备完成 |
| 3. 全产品能力分母 | [全产品能力交付矩阵](../contracts/FULL_PRODUCT_CAPABILITY_DELIVERY_MATRIX.md) | 每项能力在设计、Reader-UI、Core/Host、三端与设备层的缺口 | 任一能力已经完成 |
| 4. 合同事实与验收 | [ACCEPTANCE](../contracts/ACCEPTANCE.md)、schema、fixtures、generated | 当前合同分母、可执行语义和防漂移事实 | 原生视觉或设备效果 |
| 5. 正式施工计划 | [Slice 0–12](../contracts/SLICE_PLAN.md) 与 [Platform Evidence Spec](../contracts/PLATFORM_EVIDENCE_SPEC.md) | 依赖、交付物、并行/串行关系、evidence 门槛 | 计划登记项已经实现 |
| 6. 设计实施计划 | [静态视觉闭环](./design/VISUAL_CLOSURE_PLAN_2026-07-14.md) 与 [Motion 四层交付](./design/MOTION_DELIVERY_PLAN_2026-07-14.md) | 页面族 VC0–VC3、MR0–MR5 | Core、原生或发布完成 |
| 7. 当前状态快照 | [Figma Handoff](./design/FIGMA_HANDOFF_STATUS_2026-07-12.md)、[Figma Full Audit](./design/FIGMA_FULL_AUDIT_2026-07-19.md)、各仓当前 HEAD 与原始 evidence | 当前某一时点实际有什么 | 永久完成结论 |

固定解释：`23 · Pages · Final` 是历史节点名，当前含义是“最终候选装配区”；`260/260 route resolvable` 是合同结构结果；`24×3` 和 `25×3` exact 是 Figma 结构结果。三者都不是完整设计或产品完成证明。

## 2. 统一状态口径

后续不再只使用含义模糊的“完成”，必须说明完成的是哪一层：

| 状态 | 必须具备 | 不能外推为 |
| --- | --- | --- |
| `计划已登记` | 能力、owner、Slice、输入、输出和门槛已写清 | 已实现 |
| `结构候选` | Figma master/variant/reference 或合同 route/state 已建立 | 视觉定稿、可点击或原生完成 |
| `设计已确认` | 用户确认目标页面族，Figma 视觉与共享组件闭合 | Reader-UI、Host 或设备完成 |
| `浏览器已验证` | Design Delta 已回写，目标 route/state/viewport 在当前 demo 复验 | 原生平台效果 |
| `本地代码候选` | 源码、自动化测试和本机构建通过 | 人工、模拟器、真机或发布完成 |
| `模拟器已验证` | 在指定模拟器实际运行并保存截图/录屏/日志 | 真机、性能或发布完成 |
| `真机已验证` | 真实设备、OS、operator、时间、录屏/日志/性能/无障碍证据齐全 | 其他平台或其他能力族完成 |
| `Release Ready` | 不可变 artifact、digest、consumer lock、锁定字节重跑、corpus、回滚和三端 release gate 全部通过 | — |

任何状态只能向下证明，不能向上推导。例如真机通过可以包含代码已运行的事实，但单测通过不能推导真机通过。

## 3. 各层唯一职责

| 层 | 必须完成 | 明确不负责 |
| --- | --- | --- |
| Figma | 视觉系统、canonical component、页面族关键状态、响应式约束、交互意图、Motion 关键帧与评审 | 运行时状态机、Core 业务、平台 API、设备证据 |
| Reader-UI | route/state/event/component/motion/token、ScreenGraph、runtime action、demo、Design Delta 回写、codegen、防漂移 | 三端生产 UI、真实 Core 业务、替平台生成设备证据 |
| Reader-Core-Native | Legado 语义、实体、规则、事务、持久化、canonical result、Core/Host 协议 | 视觉、原生组件、平台对象 |
| Host Adapter | HTTP、Cookie、WebView、文件、权限、凭据、系统 TTS、后台、通知等平台能力 | 解释 Legado 规则、持有 Core 业务事实、决定视觉 |
| iOS / Android / HarmonyOS UI | 原生 reducer/coordinator、renderer、MotionAdapter、手势、焦点、安全区、无障碍和平台状态恢复 | 复制一套私有合同或业务事实源 |
| 平台 evidence | 源码、测试、截图、录屏、设备、性能、无障碍、corpus 与 manifest | 由 Reader-UI 文档或 fixture 代填 |
| 发布事务 | 精确 commit/tag、不可变 artifact、digest、consumer lock、锁定字节复验和回滚 | 用手工版本号或本地 sibling 冒充正式消费 |

## 4. 唯一执行主线

每个能力族按同一条链路推进：

```text
项目能力与 Legado 语义建账
  → 确认是否需要 UI、所属 Slice 和 Core/Host owner
  → 有 UI：VC0 当前事实审计
  → 用户确认保持或改版
  → VC1 Figma 共享组件与页面族修正
  → VC2 冻结 Design Delta 并显式回写 Reader-UI
  → VC3 Phone / Compact / Tablet 浏览器闭环
  → 需要 Motion：MR0–MR3 合同、Figma Reference、浏览器动态证据
  → Core/Host 真实协议与业务实现
  → iOS / Android / HarmonyOS 原生实现
  → MR4 / 模拟器人工验收
  → MR5 / 真机、性能、无障碍和 corpus 验收
  → 发布候选预验收
  → 不可变 artifact + consumer lock
  → 对锁定字节重跑三端最终门禁
  → Release Ready 判断
```

串行规则：

1. 不能从 Figma 页面或当前 route 数量反推能力范围。
2. 同一页面族未通过 VC3，不进入该页面族的 Motion 或 Host 视觉实现；Reader 2 已通过 VC3，因此只允许 Reader 2 单独继续 MR，不代表其他页面族可跟进。
3. 每个能力族必须先冻结合同和 Core/Host 边界，再进入三端生产 effect。
4. Slice 9–11 分域验收全部通过，才允许关闭 Slice 12 全产品 Release Gate。
5. 发布前可用同一候选字节做本地/设备预验收；正式 artifact 发布并更新 lock 后，必须对精确锁定字节再跑最终构建和设备门禁。

并行规则：

- 不同页面族的事实收集可以并行，但 Figma 写入和用户视觉决策按页面族串行冻结。
- 同一冻结合同下，Core、三个平台的独立实现可并行；共享协议、wire id、状态 owner 和事务语义必须先串行冻结。
- 后端能力可提前预研或测试，但不得外推为前端、设计或产品完成。

## 5. Figma 当前状态

| 工作 | 当前状态 | 当前可证明内容 | 尚缺 |
| --- | --- | --- | --- |
| M0–M5 物料、master、页面族装配 | `结构候选` | 已有物料、组件、24 个页面级 Set、25 个候选 route | 用户逐页视觉确认与设计闭环 |
| 24×3 master / 25×3 prototype | `结构门禁通过` | 72/72 variants、75/75 viewport 引用与尺寸 exact | 视觉质量、交互、Host 实现 |
| 11 个 Compact 明确缺陷 | `已修复` | `844×390` viewport 与受限 surface 规则统一 | 其他页面的高判断视觉问题 |
| Reader 2 静态 | `VC2 / VC3 已完成` | Design Delta 已回写，三档浏览器闭环 | 用户 Motion 节奏确认、原生/设备闭环 |
| Reader 2 之外页面族 | `未完成` | 只有结构候选与部分 reference | VC0、用户确认、VC1、VC2、VC3 |
| Interaction Playground | `共享样板` | resting/pressed/disabled/loading/reduced 样板与 25 条 reaction | 全量按钮 inventory、页面消费与实际验收 |
| MR1 | `自验完成，待用户确认` | Reader Control 样板和现有 track | 用户节奏确认 |
| MR2 | `进行中` | 部分 Review artifact | 十个核心家族完整 Reference |
| MR3 | `部分完成` | canonical registry、十家族确定性 trace、7 段 browser WebM | 十家族 × 三视口完整动态媒体 |
| MR4–MR5 | `未完成` | 无法由 Figma 静态审计替代 | 三端原生、模拟器/真机、性能、无障碍 |

## 6. 交互控件覆盖门禁

现有第 27 页只证明存在共享交互样板，不能证明所有按钮已经统一。新增 `Interaction Control Coverage Gate`，覆盖所有“点击、触摸或 Enter / Space 后执行动作”的目标：Button、IconButton、导航项、Chip、Segment、ListRow action、菜单项、Disclosure、弹层 CTA、输入框尾部动作、步进按钮、危险操作和可点击卡片。Switch、Slider 等按独立控件族执行同一套身份、状态、动作、动效、无障碍和证据门禁，不能伪装成 Button 规避检查。

### 6.1 全量清单字段

每个实际可操作节点必须登记：

| 分类 | 必填字段 |
| --- | --- |
| 身份 | `controlId`、产品域、页面族、route/state、screen variant、viewport、Figma page/node/revision、Reader-UI component instance id、代码落点 |
| 组件 | semantic role、canonical ComponentType / component set / variant、size、action group、是否 instance / detached；非 canonical 必须有例外原因和消除计划 |
| 内容 | 可见 label、semantic icon id、accessible name、危险动作对象与确认文案 |
| 作用 | 用户目标、trigger、UiEvent、payload schema、runtime action、Reducer/effect owner、CoreCommand/HostRequest、前置条件、成功结果、回滚结果 |
| 状态 | rest、hover（适用平台）、pressed、focus-visible、selected/toggled/expanded、loading/busy、disabled、success、error；记录初态、转换、唯一稳定终态和 state owner，不适用项明确标记 |
| 约束 | hit target、图标盒、padding/baseline、文字截断、Auto Layout、hug/fill/min/max、safe area、Phone/Compact/Tablet/Fold、Dark、RTL、字体 100/150/200%；状态变化不得意外改变周围几何 |
| 反馈 | Ink Response、状态变化、toast/undo、haptic（如适用）、MotionId、duration/easing token |
| 中断 | async guard、repeat tap、double dispatch、幂等、取消、超时、stale result、页面退出、opposite action |
| 降级 | reduced-motion 终态、禁用动画、无 haptic/无权限/离线时的可理解反馈 |
| 无障碍 | 原生 role、label、value/state、disabled/busy/expanded/selected、Enter/Space、reading order、focus restore、目标尺寸、非颜色表达、对比度和状态播报 |
| 平台 | Web selector/renderer、SwiftUI view/handler、Compose intent、ArkUI/store；逐端标记 faithful/generic/inert/gap，并记录消费合同 identity |
| 证据 | Figma variant/reaction、Design Delta、Web screenshot/trace、合同/状态测试、四视口结果、iOS/Android/HarmonyOS 截图/录屏、模拟器/真机、读屏/键盘验证；全部绑定 commit、contract 和 design revision |

### 6.2 分阶段门禁

| Gate | 完成条件 | 当前状态 |
| --- | --- | --- |
| IC0 · Inventory Exact | Figma 页面族与 Reader-UI route/view-state/component graph 双向枚举；零遗漏、零重复、零无稳定 ID | 未建立全量清单 |
| IC1 · Canonical Design | 所有实例来自 canonical component 或有显式例外；层级、尺寸、图标、状态、约束和 hit target 经用户确认 | 第 27 页有样板；全页面未闭合 |
| IC2 · Action Contract | 每个可用控件有唯一 UiEvent/action/effect owner；缺 binding 必须 disabled/inert/fail-closed，禁止“看似可点但无行为” | Reader-UI 有通用合同；缺控件级全量映射 |
| IC3 · Web Runtime | 实际 route 逐项验证 pressed、loading、success/error、取消、重复点击、反馈、焦点恢复和稳定终态 | 未形成全量证据 |
| IC4 · Motion / Reduced | 需要 Motion 的控件有 press→activate/commit→settle、interrupt、cleanup 与 reduced-motion 对照；普通控件继承共享 Ink Response | 只有样板和部分 Motion 家族 |
| IC5 · Responsive / A11y | Phone/Compact/Tablet/Fold、横竖屏、Dark、RTL、字体 100/150/200%、键盘、读屏、目标尺寸和状态播报通过 | 未形成全量证据 |
| IC6 · Native Parity | 三端有 exact renderer、action、motion 与 accessibility 映射；generic/inert/gap 不计完成 | 局部代码候选；未全量验收 |
| IC7 · Manual Evidence | 三端模拟器/真机逐项点击并保存同版本截图、录屏、日志和人工结果 | 未完成 |
| IC8 · Release Gate | IC0–IC7 全绿，并进入正式 artifact/lock 的锁定字节复验 | 未完成 |

IC0–IC8 全部关闭前，不得使用“所有按钮/交互控件已统一规划和实现”的表述。

## 7. Slice 0–12 当前口径

| 范围 | 主要内容 | 当前统一结论 |
| --- | --- | --- |
| Slice 0–7 | 合同接入、Shell、文本阅读、控制层、TTS、RSS/source/search、同步、HostAdapter | 计划和多项局部实现存在；不得整体标记通过，仍按各端 evidence 验收 |
| Slice 8 | 既有文本阅读主链的一致性、设备、无障碍、性能 | 不是全产品验收；三端 fresh evidence 未关闭 |
| Slice 9 | 五种本地格式、PDF、漫画、音频、下载、缓存、存储 | 正式计划已建立；cache 等子域有局部代码，不代表 Slice 9 完成 |
| Slice 10 | 书签、历史、搜索、编辑、三类规则、换源、封面、段评、HttpTTS、session | 正式计划已建立；replace persist/undo 等子域有局部代码，不代表 Slice 10 完成 |
| Slice 11 | Legado DSL、动态源、订阅、WebView challenge、RSS、protected download | 正式计划已建立；完整跨端业务与设备链未完成 |
| Slice 12 | onboarding、权限、设置、全视口、无障碍、系统集成、迁移、全产品 Release Gate | 只能在 Slice 9–11 分域通过后关闭；当前未完成 |

## 8. 当前本地工作归位

| 层/仓库 | 当前落盘内容 | 证据等级 | 不能宣称 |
| --- | --- | --- | --- |
| Reader-UI `8f9eea1` | cache/replace undo 四条 runtime 合同、payload/result、生成物、ScreenGraph | 本地合同候选；自动化测试源码存在 | demo 实际按钮已可见、三端或发布完成 |
| Core `7a0718a4f` | cache、replace persist/undo、七个既有 schema 暴露及大量此前积累的 Core 工作 | 本地代码候选；提交范围混合 | Slice 9–12 或完整 Core 完成 |
| Android `f09ad272` | 可见 cache/undo 代码链，并混入 Reader Controls、TapZones、Theme、Motion 等积累 | 本地原生代码候选 | 实际视觉、动效、TalkBack、设备通过 |
| iOS `134a437` | 可见 cache 代码链；replace undo 有 reducer/coordinator，实际可见按钮仍需路由验证 | 本地原生代码候选 | replace undo 完整 UI、VoiceOver、模拟器/真机通过 |
| HarmonyOS `a50da2f` | 可见 cache/clear/undo 代码链 | 本地原生代码候选 | 动效、无障碍、真机通过 |
| 人工/模拟器/真机 | 当前五个提交没有对应新截图、录屏、`xcresult`、真机日志或人工验收包 | 未完成 | 应用效果已验证 |
| artifact / lock / release | 未创建并消费本轮可信不可变制品；consumer lock 未更新 | 未完成 | 可以正常发布 |

Core、Android、iOS 三个提交属于此前较大范围工作的整体收口；Reader-UI 与 HarmonyOS 相对聚焦。保留这些提交作为未验收代码候选，不在本轮重写历史，也不把提交存在本身当成验收。

## 9. Evidence 最低门槛

每个 Slice、页面族和高风险交互至少按以下层级留证，缺一层就保持在对应状态：

1. 规划：能力、owner、Slice、状态和验收条件。
2. 结构：Figma node、component/variant、schema/fixture、Design Delta。
3. 自动化：单元测试、reducer golden、contract/drift、构建结果。
4. 浏览器/人工：目标 route/state/viewport 的实际操作、截图、录屏和结果。
5. 模拟器：平台 App 实际运行、交互、焦点、旋转、reduced-motion 与日志。
6. 真机：设备/OS/operator/time、视频、性能、无障碍、后台、权限、恢复和真实网络/文件能力。
7. 发布：不可变 artifact、SHA-256、consumer lock、同 corpus、锁定字节重跑和回滚。

`planned / in-progress / blocked` manifest、文字报告、代码生成器、fixture、静态截图或测试数量都不能代替后续层级的原始 artifact。

## 10. 发布事务

发布分成两段，避免把“本地候选可用”误说成“正式发布完成”：

1. **候选预验收**：使用精确候选 commit 的本地字节完成 Reader-UI/Core/三端构建、关键模拟器/设备路径、视觉和交互预验收；记录候选 digest。此阶段不改正式 consumer lock。
2. **正式锁定验收**：在精确 commit/tag 发布不可变 artifact，校验 digest，自动生成或验证三端 consumer lock；三端必须对锁定的同一字节重新运行构建、contract drift、corpus、关键设备旅程和回滚。

只有第二段全部通过，且 Slice 12 evidence manifest 可重算为 `passed`，才讨论应用发布。不得手工改版本号、摘要或 lock 冒充升级。

## 11. 当前执行队列

| 顺序 | 任务 | 输出 | 当前状态 |
| --- | --- | --- | --- |
| 0 | 用户确认本文的权威顺序、状态口径和边界 | 冻结的唯一执行基线 | 已确认（2026-07-19） |
| 1 | 建立 IC0 交互控件全量清单，并选一个非 Reader 2 页面族完成 VC0 样板 | 控件 inventory + 单页面族审计包 | 已完成首版机器清单与 `Settings General` 样板；样板口径已由用户确认；IC0 因缺稳定 join key 未通过 |
| 2 | 用户确认样板口径后，批量完成其余页面族 VC0；按页面族推进 VC1 | 保持/修复/改版/两阶段清单与 Figma 修正 | 进行中：范围已精确收敛为 12 个非 Reader 页面族；Figma 25×3 / 24 static Set 结构读取与 12×3 浏览器结构观测已完成；视觉对照、交互 trace、最终分类与用户确认尚缺 |
| 3 | 每个确认页面族完成 VC2/VC3 | Design Delta、Reader-UI 回写、三视口浏览器证据 | 未开始 |
| 4 | 关闭 IC1–IC5，并按已通过 VC3 的页面族推进 MR0–MR3 | 交互、响应式、无障碍与 Motion 浏览器闭环 | 未开始/Reader 2 可单独继续 |
| 5 | 按 Slice 能力族冻结 Core/Host 协议并完成三端原生实现 | 三端源码、测试和 local build | 局部代码候选，未全量 |
| 6 | 完成 IC6–IC8、MR4–MR5 与 Slice 9–12 分域设备 evidence | 三端 parity、模拟器/真机/无障碍/性能/corpus/锁定字节包 | 未开始 |
| 7 | 候选预验收、不可变 artifact、consumer lock、锁定字节重跑 | Slice 12 Release Gate | 未开始 |

在第 0 项确认前，停止新增 Figma 页面、批量改稿、扩大本地能力、运行发布流程或更新 consumer lock。

## 12. 完成声明规则

以后状态汇报必须采用“对象 + 层级 + 证据 + 未完成项”的完整句式，例如：

> Reader 2 静态设计已完成 VC3，证据为三档浏览器闭环；Motion 用户确认、三个 Host 原生实现和设备验收仍未完成。

禁止以下表述：

- “Figma 已完成”，但不说明结构、静态、Motion 或用户确认范围；
- “本地已全量完成”，但只提供合同、代码或单测；
- “三端已完成”，但没有逐端 App/device evidence；
- “可以发布”，但 artifact、lock、corpus、回滚和设备门禁仍为空。
