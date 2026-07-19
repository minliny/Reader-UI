# 完整应用开发启动与 Figma 改稿回流策略

状态：可用于第一版开发排期；不等于三端视觉完成或 Release Ready  
设计基线：Figma `Reader 2` 负责设计意图，Reader-UI contract/demo 负责可执行真相  
当前合同版本：Reader-UI `3.0.0` 本地工作树；三个 Host 正式 consumer lock 仍为 `2.5.1`

2026-07-19 本地合同增量：Reader-UI 已扩展为 260 RouteId / 300 UiEvent / 190 ViewState variant / 615 个 ScreenGraph component instance，并为 24 个项目能力 intake route 增加 D6 demo；新增 30 个事件全部保持 planned/fail-closed。下文 iOS/Android/HarmonyOS 的 128-type / 522-instance 覆盖数字是 2026-07-17 Host 快照，尚未针对本次 138-type / 615-instance 图重新审计，不能当作当前原生完成度。

## 1. 启动结论

现在可以启动完整应用第一版开发，但应按“共享合同 + 原生 primitive + 纵向业务切片”推进，不能按 260 个 route 在三个 Host 中各复制一套静态页面。

当前适合立即并行的工作：

- App Shell、导航、Reader Shell、共享状态、Core/Host effect 链路；
- 已稳定的 token、AppearanceSpec、MotionSpec 和高频原生 primitive；
- 书架、阅读器、书源、RSS、设置等纵向业务切片；
- 构建、测试、视觉回归、无障碍和真机证据设施。

当前不能宣称完成的工作：

- 三个 Host 的 128 个已引用 ComponentType 均已 faithful 渲染；
- ScreenGraph 已成为三端生产渲染 authority；
- Reader-UI `3.0.0` 已作为不可变制品发布并被三端正式锁定；
- 动效已获得三端逐场景真机视觉证据；
- Release/device gate 已关闭。

## 2. 当前 Host 开发边界

| 端 | 当前可确认状态 | 对完整应用开发的含义 |
| --- | --- | --- |
| Reader-UI Web/demo | 260 route 可解析；新增 24 route 由 D6 显式渲染；ScreenGraph、AppearanceSpec、95 MotionId 可执行校验；Appearance route 四固定视口最终态已验证 | 可作为结构、状态、交互与视觉回归基线，不代表 Core/Host 业务或原生页面完成 |
| iOS | 128 个已引用 primitive 中 121 个可用：102 faithful、15 generic、4 host-composite；7 个 visible gaps；按 522 个 canonical 实例为 364 faithful + 41 generic + 108 host-composite + 9 gap；ScreenGraph 仍为 Shadow | Button 33 个实例与 ReadingBackgroundLayer 21 个实例已由 dedicated SwiftUI renderer 全量消费；后者的 21 个 canonical route 与 21 个生产 ReaderShell route 一一对应，实际全页颜色读取 Host palette。4 个 Reader host-composite 继续独立记账 |
| Android | 128 个已引用 primitive 中 57 个可用：19 faithful、2 integrated、36 generic；71 个 visible gaps（6 partial + 65 insufficient）；按实例为 215 faithful + 26 integrated + 73 generic + 81 partial + 127 insufficient | TapZones 已通过真实 loading/readiness 与 Compose TextLayout/viewport 边界接入生产 ReaderShell；ReadingBackgroundLayer 21/21 已闭合 schema、Host theme 与 paper 色，但 candidate 尚无 full-surface bounds 证据，故与 TapZones 一起单列 integrated，不冒充 faithful。Full Appearance / Full Settings、Source、Restore 与部分设置只读页面族已复用正式 Compose 展示 primitive |
| HarmonyOS | 128 个 referenced 类型都有显式 ArkUI 分支，当前忠实度为 84 faithful、43 generic、1 partial、0 insufficient；按实例为 352 faithful + 123 generic + 47 partial；另跟踪 4 个 host-composite / 108 个跨切面实例；ScreenGraph 明确保持 Shadow，原生 RouteTable/ViewStateTable 仍是 authority | Content、Empty、Error、Permission 共 8 个 leaf 实例已用 Store-free strict adapter 提升 faithful；Button 33 个实例仅 4 个动作具备既有 Host 语义，Dialog 9/9 虽已 dedicated 但 6 个嵌套动作均未获 Host admission，因此两类仍诚信保持 generic。正文仍来自 Core-backed Store，剩余 partial 仅为 ReaderBase |

因此，第一版开发应采用不对称推进：iOS 可以更快进入页面族；Android 先补 primitive/合同数据；HarmonyOS 先补 canonical 数据桥接，再讨论 authority 迁移。三端不必等待到同一百分比才开始，但必须消费同一合同语义。

类型数用于回答“有多少种 primitive 已接入”，实例数用于回答“实际节点受影响多大”。本节 522 个实例是 2026-07-17 的跨 Host 快照；当前 Reader-UI 图已是 615 个实例，三端在重新审计前不得沿用旧百分比。两类分母必须同时看：Android 类型覆盖低，但顶栏等高频类型已 faithful；HarmonyOS 类型都有分支，但高频壳层和 Reader 节点仍大量 partial。

Reader-UI `3.0.0` 候选 action table 现有 63 个动作，其中新增的 `reader.control.toggle` / `reader.module.switch` 是无 Core/Host effect 的原子内部动作；三个 Host 的正式 consumer lock 仍保持旧版同一安全边界：35 个 covered event 中 7 个为生产 Pilot（directory 2、book.open 1、TTS/auto-page 4），其余 28 个为 Shadow。import、source-switch、replace、RSS、sync 等实验 executor 不能按测试存在就计为生产 authority；新增内部动作也不能绕过 consumer lock 自动晋升。完整应用开发可以继续沿用原生 reducer/effect 路径，但每个事件提升必须单独证明 exactly-once ownership、回滚和真机行为。

## 3. Figma 改稿的工作量分级

以下是合同化流水线稳定后的经验区间，单位为工程人日；不含等待评审、商店发布和长周期真机兼容调查。

| 变更级别 | 典型改动 | 代码入口 | 预估总量 | 当前风险 |
| --- | --- | --- | --- | --- |
| D0 配置 | 文案、顺序、默认值、颜色 swatch、字号/间距 token | fixture/token + codegen | 0.5–2 | 低；Appearance 已证明可四端生成 |
| D1 现有 primitive 外观 | 圆角、内边距、图标、字体层级、已有控件样式 | component/token + Web renderer + 三端 primitive | 2–6 | 中；Android/Harmony primitive 尚未完全收敛 |
| D2 页面结构/响应式 | 分组、层级、插槽、横竖屏/平板重排 | ScreenGraph/ViewState + layout resolver + 各端 layout adapter | 5–15 | 中高；若按页面手写会重复返工 |
| D3 状态/交互/动效 | 新状态、手势、焦点规则、中断/清理、异步反馈 | schema + runtime action + MotionSpec + 三端消费 | 8–20 | 高；必须同时验证 reducer、动效和可访问性 |
| D4 能力/业务语义 | 新 Core 命令、权限、文件、WebView、TTS 或平台能力 | Core/Host contract + 三端 adapter + device proof | 10–30+ | 很高；不能由 Figma 直接决定完成 |

如果现在直接在三端逐页硬编码，D1/D2 的代价通常会接近上表上限，且同一个设计修改要改 Web、SwiftUI、Compose、ArkUI 四份。若先把高频 primitive、layout resolver 和合同生成链路收敛，D0 多数只需改一处，D1 通常只改一个共享定义加三个原生 primitive，页面数量不再线性放大成本。

### 3.1 现在开工后的实际改稿策略

完整应用现在开工是合理的，前提是先冻结 route/wire id、状态语义、核心 ComponentType 接口和四个响应式视口；允许 Figma 继续改视觉，不允许它在开发中无版本地改业务语义。工作量应按以下公式估算，而不是按页面总数估算：

```text
改稿成本 ≈ 合同 delta + 受影响 primitive adapter + 受影响 viewport 回归 + 新增能力证据
```

开发期间使用三条进入队列：

- 绿色连续流：D0、单个现有 primitive 的独立 D1；通过生成和受影响截图后即可进入当前迭代。
- 黄色批次流：跨页面 D1、D2；以页面族或 3–8 个 primitive 为一批，每周或每个里程碑冻结一次。
- 红色里程碑流：D3、D4；先版本化 schema/action/capability，再进入下一里程碑，不作为临时“视觉微调”插入。

因此，后续 Figma 若主要调整主题、字体、间距、圆角、图标和现有控件样式，代码返工可控；若频繁改变导航、页面层级、状态机、手势或平台能力，工作量会显著增大，且必须同时修改合同、运行时和真机证据。

## 4. 推荐更新逻辑

```text
Figma design revision
  → 结构化 Design Delta
  → Reader-UI executable contract
  → deterministic codegen
  → Web/demo + contract gates
  → Host local consumption + renderer/device gates
  → immutable artifact publication
  → consumer lock update
```

### 4.1 冻结一次可追踪设计版本

每批改稿记录：Figma file key、page、node id、revision/time、目标 route/state/viewport，以及前后截图。开发只消费已冻结批次，不持续追逐设计师工作中的中间态。

### 4.2 先写 Design Delta，不把截图当 diff

每项变更至少标明：

- `changeLevel`：D0–D4；
- 受影响的 token、ComponentType、route/state、MotionId、UiEvent；
- 是否新增 schema 字段或平台能力；
- 兼容策略和回滚点；
- 需要验证的 phone / landscape / tablet / reduced-motion 场景。

上述清单现已由 [`contracts/design-delta.schema.json`](../../contracts/design-delta.schema.json) 机器校验；[`contracts/fixtures/design-delta.fixtures.json`](../../contracts/fixtures/design-delta.fixtures.json) 固化了本次 `Reader 2/Full/AppearanceContent` 批次。它是可验证的 intake/路由清单，不是自动覆盖源码的 Figma patch：实际值仍进入各自唯一 schema/fixture，再由 codegen 和 Host adapter 消费。working revision、未知 route / ComponentType / MotionId / UiEvent、不安全文件路径、无 feature flag + milestone 的 D3/D4，以及 wire id 改动却无 major migration 都会 fail closed。

### 4.3 路由到唯一代码真源

| 设计变化 | 唯一代码入口 |
| --- | --- |
| token、主题、字体、选择项 | token / appearance fixture |
| primitive 的 props 与组合 | component schema / ViewState / ScreenGraph |
| 页面状态和用户事件 | UiState / ViewState / UiEvent / runtime action |
| 动画时间线和中断语义 | MotionSpec / MotionPolicy |
| Core 或平台能力 | CoreCommand/CoreEvent/HostRequest/HostResult |

Figma 不直接覆盖 Swift/Kotlin/ArkTS 源码。原生平台保留字体解析、系统控件、布局适配、Host API 和 EphemeralState；配置数组、wire id、状态语义不得在各端重新复制。

持久化和 reducer 只保存稳定 wire value：主题存 `theme.id`，字体存 `font.id`/平台 family adapter，选择项存 `option.value`。中文 label 只在渲染层由生成合同解析，不能作为业务状态或持久化 key。这样后续只改名称、顺序或本地化时不会触发数据迁移；只有 wire value 改名才按 breaking change 处理。

### 4.4 兼容与版本策略

- 只改 token 值、标签或 fixture 内容且 wire 不变：patch；
- 新增可选字段、ComponentType、MotionId 或 UiEvent：minor；
- 删除/改名、必填字段变化、状态语义变化：major，并提供迁移期；
- deprecated ID 只允许兼容读取，新代码和新页面不得再引用；
- 合同发布前用本地 sibling package 验证，发布后必须更新 immutable artifact digest 和 consumer lock。

### 4.5 分批落地，不做全端大爆炸

每个设计批次建议限制为一个页面族或 3–8 个 primitive：

1. Reader-UI contract/demo 合并并通过静态、交互、动效、响应式门禁；
2. iOS/Android/HarmonyOS 各自更新相同合同版本；
3. 用 feature flag 或 route-family rollout 保持旧 renderer 可回退；
4. 每端完成构建、单测、同 viewport 截图对比和关键真机路径；
5. 全部证据齐后才提升为 Authoritative。

### 4.6 设计改稿进入开发后的更新事务

每个 Figma 批次使用一个可回滚事务，不允许设计稿直接覆盖开发分支：

1. 生成唯一 `designRevision`，锁定 file key、node id、时间和截图；
2. 写 Design Delta，先判定 D0–D4，再列出 token / ComponentType / route / state / MotionId / UiEvent 影响集；
3. Reader-UI 在独立分支更新 schema/fixture/demo，并生成 Swift/Kotlin/ArkTS；
4. 自动输出受影响 Host 列表和验证矩阵，未命中的页面不得顺手重写；
5. Host 通过 adapter 消费新字段，同时保留一个合同版本的兼容读取；稳定 wire id 不变时禁止数据迁移；
6. Web 与三端验证通过后发布 immutable artifact，再更新 consumer lock；失败则整体回退到上一合同版本。

这样，后续 Figma 修改不会按“页面数 × 四端”计算，而是按“变更的 primitive / 状态 / 能力层级”计算。D0/D1 可在完整应用开发期间持续进入；D2 应按页面族冻结；D3/D4 必须进入版本化里程碑，不能作为临时视觉微调插入。

## 5. 降低未来改稿成本的当前优先级

1. Android/iOS/HarmonyOS 对 `reader.location.resolve → reader.progress.update → stored=true → visible commit` 的代码级适配与本地回归现已全绿；下一步是在精确 commit/tag 上发布 Reader-UI `3.0.0` 不可变制品并更新三个 consumer lock，消除“本地 sibling 成功、正式消费仍旧版”的分叉。不得用本地 sibling 通过替代 verified artifact 与 lock 证明。
2. Android 按出现频次补齐高复用 primitive 和 canonical 数据，而不是逐 route 补页面；Full Appearance / Full Settings 与 Source 页面族已先复用正式 Compose 内容。
3. HarmonyOS 保持 `ReaderBase` 为有证据的 partial。合同侧已补组件 authority、`host-composite` 组合语义和 TapZones target bindings；正文 identity、page/anchor、live theme 等运行时值继续由 Core/Host Store/Layout 持有，不写入 ScreenGraph。下一步是 Host adapter 按 owner 组合并补真机证据，而不是继续给 fixture 填假数据。Loading / ErrorState / Offline / Content / Empty / Error / Permission 已收口为 faithful；43 个 generic 仍需逐步做视觉 fidelity 提升，不能与 faithful 混算。
4. iOS 清掉剩余 7 个 visible gaps，再逐步把 15 个 generic 提升为 faithful；4 个 host-composite 继续单独记账，不混入普通 contract-tree renderer。
5. 将 Web 已验证的四固定视口扩展为三端截图回归；动效继续补原生 reduced motion、interrupt、focus restore。
6. 每周或每个里程碑冻结一次 Figma revision，避免开发分支跟随未完成稿实时抖动。

## 6. 开发完成与设计同步完成是两套门禁

“设计已同步”要求 Design Delta 已进入可执行合同、Web/demo 与三个 Host；“功能开发完成”还要求 Core/Host effect、错误路径、持久化、无障碍和真机证据。两者不得用一张 Figma 完稿或一次本地构建互相替代。

## 7. 当前总进度与后续任务

### 已完成

- `Reader 2/Full/AppearanceContent` 已收敛为单一 AppearanceSpec，并由 Web、Swift、Kotlin、ArkTS 生成消费；稳定 id/value 与展示 label 已分离。
- 2026-07-17 对 Figma 文件 `klhs2jMM4MncaJFqZMfqEK` 的 `15 · Reader 2` / `1023:18303` 做了只读现场复核：8 个主题、9 个字体、4 个选择项及其默认值、4 个步进器及其数值均与 `appearance.fixtures.json` 逐项一致；当前没有待进入 Design Delta 的新增漂移。
- 95 个 MotionId 已完成合同审计：89 个 active exact，3 个 deprecated，3 个 reserved；active 生产集合没有未定义项。
- Web 260 route、190 ViewState variant 与 D6 capability renderer 已通过本地合同/结构门禁；三端单测与本机构建仍保留 2026-07-17 快照，需按新图重新验收。
- 三端 renderer 已有同口径类型/实例覆盖分母；HarmonyOS 覆盖模型与 source gate 会阻止分支和分类静默漂移。
- Android canonical renderer 已直接复用 Full Appearance / Full Settings 的正式 Compose 内容，Appearance 改稿不再在这两个入口维护第二套数组。
- Android/iOS consumer 测试已去除 `2.5.1` 硬编码并从已验证 lock/artifact 派生期望版本；HarmonyOS 双 lock bump 已支持原子更新 consumer lock 与 package lock，scope 精确限制为这两个文件。
- Design Delta 已从文档约定升级为机器可校验合同：当前 AppearanceContent frozen fixture 通过 5 项专项门禁，并对合同引用、D3/D4 rollout、wire migration 与安全路径 fail closed。
- Web `reader-full-appearance` 已在 phone portrait / landscape、tablet portrait / landscape 四固定视口验证最终 `settled` 状态：每个视口均保持 1 个 Reader DOM、1 个 Appearance 面板、8 个 ThemeSwatch、9 个 FontCell，且无可见控件横向裁切；reduced-motion 旋转即时收敛到 `viewport.orientation.settle`。
- `reader.page.next / prev` 的共享 runtime 已升级为两阶段事务：location 结果只产生空 payload 的 `reader.progress.update` effect，Host 必须从 correlation-scoped DomainContext 组装真实 Core DTO，只有严格确认 `stored:true` 后才提交可见页；commit-pending 时 route/identity mutation fail closed。
- `reader.control.toggle` / `reader.module.switch` 已进入 63-action typed runtime，JS/Swift/Kotlin/ArkTS 同语义：只在 Reader control overlay family 内原子切换、route 不变、重复 module 选择 no-op；show/hide/switch/no-op Motion intent 从状态差分派生。
- 三个 Host 已完成这两个 schema 3 动作的本地候选消费，但没有绕过正式 schema 2 lock：Android 从当前原生 `ReaderUiState` hydrate 隔离 Runtime，再经既有 Show/Hide/Switch intent 与 reducer 投影；iOS 在 dispatch 前校验 Runtime/native route、stack、tab、overlay baseline，并保持 `ReaderUIState.overlay` 为唯一语义真相；HarmonyOS 从原生 route stack 构造 transient `ReaderUIRuntime` 并真实 dispatch 后再投影到既有路由栈。三端都从已校验的前后状态差分派生 show/hide/switch/no-op motion，错误、stale baseline、非 Reader overlay 和 route drift 均 fail closed。生产 allowlist 与三个 consumer lock 均未增加这两个事件。
- Android TapZones 已从 insufficient 收口为独立 integrated host-composite：生产入口以真实 BookOpen readiness、Core committed offset 与 Compose TextLayout/viewport 计算首/中/末页点击许可；canonical adapter 严格校验 5 个实例的 props、26/48/26 几何及 target/event/payload，fixture enabled 仅作一致性证据。专项、renderer、registry 与 playback 共 `53/53`，`compileDebugKotlin` 通过。
- iOS Button 已从 generic 提升为 dedicated faithful：33 个实例中 31 个 exact binding 可执行，2 个 binding gap 显式禁用，保持 `ScreenGraph → ReaderCoordinator → reducer` 单链；Button 专项 `3/3`、HostPlanner `22/22`、primitive alignment `48/48` 与 `swift build` 通过。
- iOS ReadingBackgroundLayer 21 个实例已从 generic 提升 faithful：fixture `theme=paper` 仅作 schema evidence，21 个 canonical route 与 Contract25 生产 ReaderShell 精确一一对应，真实全页背景读取 `readerThemePalette.readingPaper`；exact `5/5`、HostPlanner `22/22`、Contract25 registry `7/7` 与 `swift build` 通过。
- Android ReadingBackgroundLayer 21 个实例已从 generic 转为 integrated：strict adapter 已证明 21/21 schema、Host theme identity 与正式 `readerExtraColors().paper` 一致，但 candidate 的 full-surface bounds 仍由外层 Host 持有，因此不计 faithful；专项共 `50/50`，`compileDebugKotlin` 通过。
- HarmonyOS Button 与 Dialog 已完成 exact source gate：Button 为 33 个实例、31 bound、2 gap、4 wired；Dialog 为 9 个实例、6 个子 Button、5 bound、1 gap，9/9 已统一 dedicated ArkUI 渲染。未获得既有 Host/reducer exact owner 的动作全部 inert，两类保持 generic，不用“有分支”冒充 faithful。
- HarmonyOS Content / Empty / Error / Permission 共 8 个 leaf 实例已从 generic 提升 faithful；state-evidence 只作展示证据，`retryable` 不生成重试动作，Permission 不生成授权 fallback。最新 Host gate 为 `416/416`，ScreenGraph 与 HAP 构建通过。
- 2026-07-17 跨仓共享门禁快照为 contract `400/400`、schema fixtures `1249/0`、Web/demo `93/93`、Swift runtime `22/22`、Kotlin runtime `22/22`。本轮合同分母已变化，该快照不再代表当前 Reader-UI 字节；当前本地门禁以仓库根 README 的命令和最新测试输出为准。这些仍是本地候选字节，不是已发布 identity。
- 2026-07-19 Reader-UI 本地门禁已按新分母重跑：contract `410/410`、schema fixtures `1328/0`、Web/demo Node tests `98/98`、Swift runtime `22/22`、Gradle `test` BUILD SUCCESSFUL、manifest `315` 文件且双入口校验通过。它们证明本仓字节内部一致，仍不替代 Core corpus、三端 Host 新图审计或设备证据。

### 正在进行

- Android：71 个 visible gaps 按“合同数据不足 / 原生 adapter 缺失 / generic 待提升”拆批；Source、Restore 与部分设置只读页面族已桥接。TapZones 现为 integrated host-composite，旧的无条件 clickable 与 28/44/28 路径已移除；ReadingBackgroundLayer 也因 full-surface bounds 仍由 Host 持有而列入 integrated。两阶段翻页 Host 适配已在本地闭合：空 payload progress effect 由 correlation DomainContext 组装真实 Core DTO，完整匹配 stored/identity/location/revision/timestamp 后才提交可见页；Room 仅作 confirmed-success mirror，启动链补上 `runtime.setHostCapabilities → runtime.storage.restore`。全量 Debug JVM `1090/0`（另 5 skip）、assembleDebug 与 lintDebug（0 error/107 warning）通过。Reader control/module 本地候选专项为 `44/44`，TapZones 本批 `53/53`，background 本批 `50/50`，`compileDebugKotlin` 通过；正式 lock 仍不接纳新增动作，page pair 仍为 Shadow，真机 write-through/重启恢复尚未证明。`ReaderTopArea`、`ReaderBottomBar` 仍缺完整数据/动作投影。
- HarmonyOS：`ReaderBase` 1 个 partial（47 个实例）的边界审计已完成并保持 partial。ScreenGraph 现在能声明 authority、host-composite anatomy 和 10 个 TapZones target binding，但正文、identity、page/anchor、live theme 仍必须来自真实 Core/Store/Layout owner；不能用递归 children、fixture 值或只读壳层冒充可执行阅读器。Button 已验证真实链路 `ViewStateRenderer → Store → reducer/effects`，但 31 个 bound 节点只有 4 个 `source.import.open` 能被现有 Host 精确承接；Dialog 9/9 已统一 dedicated renderer，但其 6 个子按钮当前全部 inert。Content、Empty、Error、Permission 现已收口，覆盖为 84 faithful / 43 generic / 1 partial；两阶段 page progress 与 Reader control/module 本地候选均已闭合。最新 Host gate 为 `416/416`，ScreenGraph PASS，fresh signed HAP 构建成功。正式 lock 仍是 `2.5.1/schema 2`，`hdc` 无目标，因此不能把本地 HAP 当真机证据。
- iOS：4 个 Reader host-composite 已完成独立 admission，TapZones center 收敛到 `AppShell → ReaderCoordinator → reducer`，不再另建第二套语义状态。Button 与 ReadingBackgroundLayer 已从 generic 提升，当前为 102 faithful / 15 generic；31 个 Button binding 复用现有环境 callback，2 个无 binding 的动作 fail closed，21 个背景 route 使用 Host palette 全页渲染。两阶段 page progress Host 适配已本地闭合：typed request-scoped Core service 严格校验 identity/location/timestamp/stored，commit 期间阻断 cancel/exit/book replacement/reentry，auto-page 支持正式的 `page Shadow / autoPage Pilot` 组合。Reader control/module 本地候选专项 `8/8`、既有 Slice 3 `15/15`、ReaderApp build 通过；Coordinator `11/11`、progress service `4/4`、stage parsing `9/9`、CoreBridge `19/19`、共享 Swift runtime `22/22` 仍通过。全量 Swift 唯一失败仍是正式 consumer lock schema 2 与本地 live schema 3 的预期不一致。继续关闭剩余 7 类 gap，再把 15 个 generic 提升为 dedicated faithful；LocalBookImport、RemoteWebDavBooks 与 BookMoreMenu 在合同补齐前保持 visible gap。

### 发布前必须完成

- 将当前高度 dirty 的 Reader-UI 工作树整理成可审计提交，并在精确 commit/tag 上发布不可变 `3.0.0` 制品；候选 release manifest 已按当前冻结输入重生成并通过双入口校验，但 Reader-UI 已提交 HEAD `39685dd...` 和三个 Host lock 仍是同一套 `2.5.1` identity。
- 三端升级 consumer lock 并通过非 sibling 的制品 digest 校验。
- 将 Web 已关闭的 phone portrait / landscape、tablet portrait / landscape 四视口回归扩展到 SwiftUI / Compose / ArkUI。
- 完成原生 reduced motion、interrupt、focus restore，以及三端真机 Core/Host/阅读链证据。

当前设备快照也只支持开发门禁：`adb devices -l` 无 Android 目标，`hdc list targets` 为 `[Empty]`；iOS 26.4 / 26.5 Simulator runtime 已安装，但当前全部为 `Shutdown`，物理设备枚举在 10 秒内未返回结果。因此本机可以继续编译和单测；原生 UI/模拟器验证需要先有已启动目标，三端真机证据也尚不能在当前连接状态下关闭。

2026-07-17 冻结候选的 contract `400/400`、manifest 312 文件、Web/demo `93/93`、schema fixtures `1249/0` 已被本轮 260/300 合同增量取代，只能作为历史快照。当前字节必须重新生成 manifest 并复跑本地门禁；即使全部通过，也尚未创建 immutable 3.0 identity。只有把同一字节集合提交并在精确 commit/tag 上复跑门禁后，manifest 才能成为可被 Host 锁定的发布身份。

Host 版本无关化、Harmony 双 lock 流程与三端 page progress 本地回归保留既有证据。剩余最短发布顺序是：按当前 260/300 合同重新完成跨仓审计 → 分仓提交并恢复干净基线 → 在精确 commit/tag 上复跑当前 Web/Swift/Kotlin/ArkTS 门禁 → 生成不可变制品 → verified artifact 自动创建三端 lock bump → 三端完整构建和 consumer checker。

因此当前状态是 **Development Ready，尚非 Release Ready**。完整应用可以启动；发布锁、视觉 fidelity 和真机证据继续作为独立收口轨道，不应阻塞所有业务开发，也不能被业务开发完成所替代。
