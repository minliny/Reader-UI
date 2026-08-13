# Frontend Demo Next → Host 同步矩阵

> 快照日期：2026-07-11
> 性质：只读 Host 审计与授权后同步计划；本文档不代表任何 Host 已完成同步。

## 1. 必须明确的边界

`frontend-demo-next` 替换旧 demo，不等于 Android、iOS 或 HarmonyOS 自动替换或同步。

三端当前的真实关系是：

```text
frontend-demo-next
├── 浏览器 DOM/CSS/JS 视觉与交互基线
├── Reader-UI contracts / generated types / runtime
└── Host 实现输入
    ├── Android Compose 原生重写
    ├── iOS SwiftUI 原生重写
    └── HarmonyOS ArkUI 原生重写
```

Host 不执行 demo 的 DOM、CSS 和 `render-runtime.js`。能直接消费的只是被正式合同化、生成并接入生产 reducer / renderer / Host Adapter 的状态与规则。

因此，“授权后直接替换”的合理含义是：

1. 用 `frontend-demo-next` 替换仓库中的 demo 权威目录。
2. 同步合同、fixtures、codegen 和 consumer lock。
3. 按本文档的批次分端实现原生 UI 与 Host 能力。
4. 分别获取 Android / iOS / HarmonyOS 的测试与设备证据。

未完成第 2–4 步时，不得将 demo 替换描述为“全 Host 已同步”。

## 2. Candidate 规划基线

本矩阵按以下已确认语义审计 Host：

- `ControlHome` 保留右侧竖向亮度栏；亮度栏不进入任何模块页。
- Dock 固定为“目录 / 朗读 / 界面 / 设置”；点击后 Dock 之上全部替换，模块使用完整可用宽度。
- 再次点击当前 Dock 项或系统返回，先回到 `ControlHome`；模块之间直接替换。
- 控制层具有 `Compact → Expanded → Workspace` 连续展开模型；正文不重排，只被裁剪/覆盖。
- 上拉时阅读顶栏随进度被推出屏幕，模块标题栏接管；收起时严格逆转。
- 主题工作区支持默认日间/夜间主题槽位、自定义背景、导入/编辑/删除/回退。
- 字体工作区支持 `.ttf / .otf / .ttc` 导入、注册、预览、字形覆盖诊断、删除回退与当前书/全局作用域。
- 状态栏采用 requested / effective / failed 事务；Host 提供真实视口与物理遮挡，UI 统一解算信息槽位。
- 四角信息和点击热区必须避开 system bar、cutout/打孔/刘海/中央遮挡、圆角、手势区和折叠铰链。
- TTS/自动翻页胶囊不与右下角页码共享槽位；拥有独立的沉浸锚点、控制层锚点和生命周期。

Candidate 直接证据位于：

- `frontend-demo-next/render-runtime.js`
- `frontend-demo-next/styles/07-reader-next.css`
- `docs/design/READER_CONTROL_LAYER.md`
- `docs/design/READER_APPEARANCE_WORKSPACE.md`
- `docs/design/READER_VIEWPORT_AND_CHROME_POLICY.md`
- `docs/design/PAPER_FLOW_MOTION_LANGUAGE.md`
- `docs/design/PAPER_FLOW_ICON_SYSTEM.md`

## 3. 当前 Host 实现盘点

### 3.1 Android

| 领域 | 当前主要路径 | 当前真实状态 |
|---|---|---|
| Reader 控制层 | `Reader-for-Android/app/src/main/kotlin/com/reader/ui/reading/ReaderControlScreen.kt` | `ReaderControlBottomSheet` 与 `ReaderModuleNav` 已分离，Dock 可固定；亮度栏在 ReaderShell 根层常驻，不会随模块内容替换退出。 |
| Compact 与完整页 | `ReaderControlScreen.kt` + `ReaderFullSettingsScreens.kt` + `ReaderSettingsScreen.kt` | 存在多套重叠的完整页/设置实现；部分 full route 在 `AppShell.kt` 直接分流到独立页，不是连续上拉工作区。 |
| 状态栏 | `Reader-for-Android/app/src/main/kotlin/com/reader/ui/shell/AppShell.kt` | `WindowInsetsControllerCompat.hide/show(statusBars)` 只有请求布尔值，没有 effective/failed 状态和布局提交事务。 |
| 视口/遮挡 | `ImmersiveReadingScreen.kt` + `ReaderControlScreen.kt` | 正文、四角信息与控件使用固定 dp；未找到 Reader 生产链中的 `DisplayCutout`/bounding rect 或统一解算器。 |
| 四角信息 | `ImmersiveReadingScreen.kt` 的 `ReaderImmersiveInfoLayer` 和 `ReaderControlScreen.kt` 的 `ReaderShellImmersiveInfoLayer` | 两套重复实现，顶部 8dp、底部 12dp 等固定边距，时间与页码为固定/样例表达。 |
| Session 胶囊 | `ReaderControlScreen.kt` 的 `ReaderControlSessionHost` | 只在控制层可见，固定 `end=24dp / bottom=356dp / width=110dp`；沉浸页没有同一胶囊锚点。动效 ID/修饰器已有基础，但当前组件没有完整使用生命周期。 |
| 主题/字体 | `ReaderFullSettingsScreens.kt`、`android/data/storage/FontConfig.kt`、`ThemeConfig.kt`、`ThemePreferences.kt`、`ui/theme/ReaderThemeResolver.kt` | 有内置主题、`ThemePair` 和 `customTypeface` 模型雏形；文件选择、安全复制、Typeface 注册、背景资产、默认日/夜槽位与完整持久化未闭环。 |
| 合同消费 | `Reader-for-Android/settings.gradle.kts` + `app/build.gradle.kts` | 已通过 composite build 直接消费 `Reader-UI` contract/runtime；这能传递类型和状态，不会自动生成 Compose 布局。 |

### 3.2 iOS

| 领域 | 当前主要路径 | 当前真实状态 |
|---|---|---|
| Reader 控制层 | `Reader-for-iOS/iOS/Features/Reader/ReaderView.swift` | `ReaderControlPresentation.control/module` 已能替换主体，`ReaderStageActionBar` 作为独立 Dock 存在；生产 Reader 的 `ControlHome` 没有右侧竖向亮度栏。 |
| Compact/full | `ReaderView.swift` + `ReaderDemoShellView.swift` + `ReaderSettingsPanel.swift` | 存在生产 Reader、demo full panel、独立 settings panel 多套实现。Grabber 仅预览 18pt 并在释放后跳转 route，没有连续 `Compact/Expanded/Workspace` 布局进度。 |
| 顶栏与正文 | `ReaderView.swift`、`App/Components/DemoShells.swift`、`ReaderResponsiveLayout.swift` | 顶栏与完整 panel 是独立布局；展开时没有“顶栏被推出屏幕”的共享进度。正文边距由 viewport class 的固定 token 决定。 |
| 状态栏 | `ReaderView.swift` | `.statusBarHidden(displaySettings.hideStatusBar)` 已接入，但只有 requested 值；没有 effective/failed 回执和新视口提交阶段。 |
| 物理遮挡 | `DemoShells.swift` + `ReaderResponsiveLayout.swift` | Reader shell 显式忽略顶部 safe area，未使用 `GeometryProxy.safeAreaInsets` 或与 `occlusionRects` 等价的 Reader 环境模型。应允许粗粒度安全带降级，不假定平台一定能提供精确中央遮挡矩形。 |
| 沉浸信息 | `PaginatedReaderView.swift` | 主要是底部居中页码，不是统一四槽位模型；滚动模式与分页模式也没有共享 ReaderChromeLayout。 |
| Session 胶囊 | `ReaderView.swift` 内部 `ReaderSessionCapsule` + `ReaderSessionCapsuleView.swift` | 存在两套胶囊组件；主 Reader 只在 `chromeVisible` 时显示，真实链路只投影 TTS，自动翻页主要停留在 `ReaderDemoShellView` 的局部 demo session。 |
| 主题/字体 | `AppSupport/Sources/ReaderDisplaySettings.swift`、`Modules/Theme/ReaderTheme.swift`、`ReaderThemeResolver.swift`、`ReaderDemoShellView.swift`、`ReaderSettingsPanel.swift` | 字体是字符串+内置列表；主题是一个 `readerTheme` + `appThemeMode`。缺导入/注册、背景资产、分离日/夜默认槽位和自定义主题持久化。 |
| Host 能力基础 | `ScreenBrightnessController.swift`、`ReaderTTSPlayer` 相关代码 | 亮度恢复和 TTS 有现有基础，可复用；与 candidate 的锚点解算/自动翻页 session 仍需统一。 |
| 合同消费 | `Reader-for-iOS/project.yml` + `iOS/Package.swift` | 通过本地 Swift Package 消费 `ReaderUIContract` / `ReaderUIRuntime`；同样不会自动重写 SwiftUI view。 |

### 3.3 HarmonyOS

| 领域 | 当前主要路径 | 当前真实状态 |
|---|---|---|
| Reader 控制层 | `Reader-for-HarmonyOS/entry/src/main/ets/ui/components/ReaderOverlayComponents.ets` | `ReaderControlSheet`、`ReaderBottomBar`、`ReaderModulePanelShell` 已具备底部/宽屏布局和固定 Dock；快捷页和模块页都强制保留 `ReaderBrightnessRail`，与 candidate 相反。 |
| 旧拓扑门禁 | `Reader-for-HarmonyOS/scripts/test_contracts.mjs` | 测试明确要求 reader shell/quick/module 共享亮度栏。同步时必须先改权威合同/测试语义，不能只删 ArkUI 组件。 |
| full panel | `ReaderOverlayComponents.ets` 的 `ReaderFullPanelShell` 与各 `ReaderFull*Page` | full panel 通过固定高度/顶距显示，Dock 消失；不是共享手势进度、顶栏退场和 Workspace 标题接管。 |
| Safe area | `ui/adapters/SafeAreaAdapter.ets` + `entryability/EntryAbility.ets` | 已从 `TYPE_SYSTEM` 读取 top/bottom/left/right 并转为 vp，但只发布四个标量，而且 top/bottom 被 demo fallback 强制设为最小值；不表达 cutout/中央遮挡/铰链矩形。 |
| 状态栏 | `ui/store/ReaderEffects.ets` + `EntryAbility.ets` | `setWindowSystemBarEnable` 已有失败回滚开关的能力，但状态仍是单一布尔值；无 requested/effective/pending 和新 avoid-area 同步提交。 |
| 四角信息 | `ui/components/ReaderComponents.ets` 的 `ReadingInfoLayer` | 使用固定 24/26/22vp 加 safe-area 标量定位；胶囊存在时右下页码硬编码左移 100vp。 |
| Session 胶囊 | `ReaderComponents.ets` 的 `SessionCapsule` | 沉浸/控制路由都渲染，TTS/自动翻页 reducer/effects 较完整；但锚点仍是右下角固定 padding，没有沉浸↔控制层连续迁移，也没有与信息层共享几何解算结果。 |
| 主题/字体 | `ui/tokens/ReaderThemeResolver.ets`、`ReaderOverlayComponents.ets`、`ReaderComponents.ets`、`EntryAbility.ets` | 已有 8 个内置日/夜选项和内置 Noto Serif 注册；状态是固定 union/base theme + app mode，没有用户字体文件、自定义背景资产或独立日/夜默认槽位。 |
| Host 能力 | `host/adapters/ScreenHostAdapter.ets`、`ReaderEffects.ets` | 常亮、亮度、TTS/自动翻页已有可复用基础；自定义字体/背景所需的选文件、复制、注册、删除和资源生命周期未形成 Reader Host 协议。 |

## 4. 差异与工作量矩阵

规模说明：`S` 为局部改造，`M` 为跨多个状态/组件/测试的中等改造，`L` 为涉及 Host 能力、持久化或设备矩阵的大改造。

| Candidate 能力 | Android | iOS | HarmonyOS |
|---|---|---|---|
| `ControlHome` 右侧亮度栏，模块页无亮度栏 | `M`：将根层常驻 rail 收入 home 可替换宿主，同时保持 Dock 固定。 | `M`：新增竖向 rail 及真实亮度 binding，重排 home 的宽度；模块不显示。 | `M`：已有 rail，但要移除 quick/module shell 强绑和更新静态门禁。 |
| Dock 以外整体替换 | `M`：已接近，需统一返回/重点击和 module content host。 | `S–M`：`ReaderControlPresentation` 已接近，但要去掉多套 demo/production owner。 | `M`：路由切换已有，需合并 shell 语义并更新 tests。 |
| `Compact / Expanded / Workspace` 直接手势、顶栏推出、正文不重排 | `L` | `L` | `L` |
| requested/effective 状态栏事务 | `M` | `M` | `M`（现有失败回滚可复用） |
| safe-area + cutout/occlusion/hinge 统一解算 | `L` | `M–L` | `L` |
| 四角信息槽位与热区避让 | `M–L` | `L` | `M–L` |
| 胶囊沉浸/控制/Workspace 锚点与生命周期 | `L` | `L` | `M–L` |
| 真实 TTS + 自动翻页共享 session 状态 | `M`：两种 session 已在 reducer，UI 投影与动效待合并。 | `L`：主 Reader 的 auto-page 还是 demo route 状态，且胶囊重复。 | `M`：状态/effects 较全，主要是几何、异常与动效闭环。 |
| 用户字体导入/注册/删除/回退 | `L` | `L` | `L` |
| 自定义背景、文字遮罩、可读性校验、资产持久化 | `L` | `L` | `L` |
| 默认日间/夜间主题槽位+当前书/全局作用域 | `M–L` | `M–L` | `M–L` |
| 端侧证据矩阵 | `L` | `L` | `L` |

综合结论：

- 仅同步 Compact 控制层视觉与替换语义：中等工作量。
- 再加上连续展开、顶栏推出、遮挡解算和胶囊生命周期：跨端大改造。
- 再加上字体导入、自定义背景、日/夜默认槽位和真机证据：完整同步属于大型跨仓工程，不是一次 CSS/组件替换。

粗略人日边界（不含当前工作树冲突处理）：

| 范围 | Android | iOS | HarmonyOS | 共享合同/验收 |
|---|---:|---:|---:|---:|
| 完整 Host 同步 | 12–18 | 14–20 | 14–22 | 10–18 |

总体约 50–75 人日。三端可在共享批次后并行，因此日历时间不等于人日总和。

## 5. 授权后的同步批次

执行原则：批次之间串行；每一批内 Android / iOS / HarmonyOS 并行；每仓独立提交和验收。

### B0 — 快照与替换边界

**What**

- 将 `frontend-demo-next` 冻结为 candidate 版本，生成稳定校验值。
- 分别快照三个 Host 相关文件和工作树。
- 分类 Host 已有未提交改动，禁止覆盖用户工作。

**Background**

本次审计时三个 Host 工作树都非干净，且与同步直接相关的 `ReaderControlScreen.kt`、`ReaderView.swift`、`ReaderComponents.ets` / `ReaderOverlayComponents.ets` 均有当前改动。

**Done**

- 每个 Host 都有可恢复的基线。
- 所有未提交变更都归属到明确批次，无“直接覆盖”路径。

### B1 — 合同、状态机与 fixtures

**What**

- 定义 `ReaderControlPresentation`、`ReaderViewportEnvironment`、`ReaderChromeLayout`、`ReaderSystemBarState`、`SessionCapsuleState`、`ReaderThemeAsset`、`ReaderFontAsset`。
- 增加 requested/effective/error、模块替换、展开进度、胶囊锚点、日/夜默认槽位与资产生命周期事件。
- 将 candidate 的关键场景固化为 fixtures 和纯解算期望值。

**Done**

- Swift/Kotlin/ArkTS 生成物无漂移。
- 三端可编译地消费新类型，但此时不宣称 UI 已同步。

### B2 — 视口、状态栏事务与布局解算

**What**

- 各 Host 上传实际 window size、safe/gesture insets、可用遮挡区、方向、字体缩放、折叠姿态。
- 用共享 fixtures 驱动 ReaderChromeLayout 纯解算；精确矩形不可用时使用明确的整边安全带降级。
- 状态栏切换实施 `requested → pending → effective/failed → layout commit`。

**Done**

- 四角信息、顶栏、正文、胶囊候选锚点和点击热区都从同一布局结果渲染。
- 切换、旋转、折叠和系统栏失败无首帧跳动。

### B3 — Compact 控制层

**What**

- 实现 `ControlHome` 右侧亮度栏。
- Dock 之上完整替换，模块页使用全宽且不显示亮度栏。
- 实现当前 Dock 重点击回 home、系统返回先回 home、模块直接切换。
- 消除本地模块加载闪屏和重复卡片容器。

**Done**

- 实际原生页对照 candidate 的 home / directory / tts / appearance / settings 五个 Compact 场景通过。
- Dock 坐标在五个场景中不变，亮度栏只出现于 home。

### B4 — Expanded / Workspace 与顶栏接管

**What**

- 小横条实现直接操作、速度/位置吸附与三级稳定状态。
- 阅读顶栏和 Workspace 标题栏共享展开进度。
- 正文保持原布局，只改变可见裁剪区；排版调整在 Expanded 保留实时预览。
- Workspace 中 Dock/运行状态的去留符合当前模块语义。

**Done**

- 手势可中断、可逆转，无正文重排和页码跳变。
- Reduced Motion 下仍保留状态和反馈，无长距离位移/缩放。

### B5 — TTS / 自动翻页 Session 胶囊

**What**

- 两种真实 session 共享一个互斥状态机和一个胶囊组件。
- 实现沉浸锚点、控制层锚点、Workspace 标题状态槽位和候选锚点降级。
- 启动、暂停、继续、类型切换、停止、Host 失败、入后台、回前台、旋转/折叠和倒计时局部更新全部闭环。
- 胶囊命中区从翻页热区扣除，右下页码始终不移动。

**Done**

- 真实 TTS/自动翻页 Host 状态与胶囊一致，无双胶囊、无先隐藏后失败、无旧锚点残影。

### B6 — 字体、主题和背景 Host 能力

**What**

- 平台选文件→沙盒复制→校验→注册→持久化→重启恢复。
- 主题背景支持纯色/渐变/纹理/图片，包括裁剪、定位、遮罩、模糊、对比度预警。
- 独立默认日间/夜间槽位，当前书与全局作用域。
- 删除当前字体/主题时执行确定回退。

**Done**

- `.ttf / .otf / .ttc` 样本包含成功、破损、同名、缺中文字形和删除回退证据。
- 自定义图片主题经历导入、调整、重启、日/夜切换和删除回退后仍符合状态机。

### B7 — 设备矩阵和分端发布门禁

**What**

- 执行本文档第 6 节证据矩阵。
- 分端生成视觉截图/录屏、交互断言、系统日志和持久化证据。
- 三端分别提交，不混合历史。

**Done**

- 各端的合同门禁、单测、平台构建和指定设备证据全部独立为绿。
- 任何单端失败都不被其他两端或 demo 截图掩盖。

## 6. 每端最低验收证据

### 6.1 Android

**代码/单测**

- `ReaderUiReducerTest`：control presentation、requested/effective status bar、session 互斥、主题/字体回退。
- 纯 `ReaderChromeResolver` fixtures：无异形屏、中央 cutout、左侧打孔、横屏 cutout、底部手势区、字体放大。
- Compose 交互测试：Dock 不动、亮度栏仅 home、模块全宽、返回顺序、手势吸附与中断。
- SAF 字体/背景导入、沙盒持久化和删除回退单测。

**设备**

- 至少一台打孔屏/刘海 Android 设备或等价 emulator cutout 配置。
- 状态栏显示↔隐藏、横竖屏、手势导航、系统字体放大。
- 真实 Android TTS 启停+自动翻页胶囊，证明页码不移动且热区扣除。
- 导入字体/图片主题后杀进程重开，并验证资产恢复。

### 6.2 iOS

**代码/单测**

- XCTest 纯解算 fixtures：safe-area 带、中央遮挡降级、横屏、字体放大和手势区。
- SwiftUI 状态测试：`ReaderControlPresentation`、顶栏↔Workspace 接管、正文不重排、胶囊锚点。
- 只保留一个生产 `ReaderSessionCapsule`，覆盖 TTS/自动翻页、倒计时局部更新、Host 失败和 Reduced Motion。
- 字体/背景文件复制、注册、重启恢复和删除回退测试。

**设备**

- 至少一类具有中央遮挡/Dynamic Island 的 iPhone 和一类无中央遮挡设备。
- 横竖屏、状态栏显示/隐藏、Dynamic Type 放大。
- 真实 TTS/自动翻页、入后台/回前台、胶囊锚点迁移与亮度退出恢复。
- 文档导入后重启，验证字体/背景资产与日/夜默认槽位。

### 6.3 HarmonyOS

**代码/单测**

- ArkTS reducer/effects：requested/effective status bar、失败回滚、TTS/auto-page 互斥、胶囊生命周期。
- 更新 `scripts/test_contracts.mjs`：改为只要求 `ControlHome` 保留亮度栏，并禁止 quick/module 重复 rail。
- 纯 ReaderChromeLayout fixtures：system/cutout/gesture/hinge 输入与降级安全带。
- 字体/背景选文件、沙盒复制、UIContext 注册、重启恢复和删除回退测试。

**设备**

- 真机 `avoidAreaChange` 原始数据和解算结果证据，不只提供最终截图。
- 状态栏显示/隐藏/失败回退、横竖屏、中央遮挡/打孔、底部手势区；折叠设备可用时增加铰链场景。
- 真实 TextReader TTS 和自动翻页胶囊，证明右下页码不再使用 100vp 偏移。
- 导入字体/图片主题后重启，证明注册、资产和默认槽位持久。

## 7. 共享验收场景

| 场景 | 统一期望 |
|---|---|
| ControlHome | 右侧亮度栏存在；Dock 固定；章节/进度与快捷动作可用。 |
| 点击目录/朗读/界面/设置 | Dock 不动；其余区域全替换；亮度栏不存在；模块获得完整宽度。 |
| 模块返回 | 先回 ControlHome，再关闭控制层。 |
| Compact 上拉 | 直接跟手；正文不重排；顶栏按进度退出。 |
| Expanded | 保留 30%–40% 正文预览；当前状态/滚动位置不丢失。 |
| Workspace | 只保留一个标题栏；物理遮挡仍被避开。 |
| 状态栏显示 | 不重复模拟完整系统栏；顶部信息与遮挡无交集。 |
| 状态栏隐藏 | 背景延伸，但正文/信息/热区继续避开物理遮挡。 |
| 隐藏失败 | 开关、effective mode 和布局一起回滚，无中间错位帧。 |
| TTS/自动翻页启动 | 胶囊进入独立锚点；右下页码不移动。 |
| 控制层打开/关闭 | 同一胶囊在两锚点间迁移，不销毁重建。 |
| Session 类型切换 | 外壳保持，内容更新；无双胶囊/短暂空状态。 |
| 旋转/折叠/窗口变化 | 先重算视口和锚点，再恢复内部动画；无旧位置残影。 |
| 字体导入 | 成功/破损/缺字形/同名冲突/删除回退完整。 |
| 默认日/夜主题 | 跟随系统切换时使用两个独立槽位；临时主题不静默覆盖默认值。 |
| 自定义背景 | 导入/裁剪/遮罩/对比度/持久化/删除回退完整。 |

## 8. 高风险点

1. **工作树覆盖风险**：三个 Host 都有未提交改动，授权同步前必须先完成 B0。
2. **多套实现所有权风险**：Android 和 iOS 都存在生产 Reader、demo/full page、独立 settings 组件重叠。必须先确认唯一生产 owner，否则会改中非生产页。
3. **路由与展开状态冲突**：当前 full panel 多为 route；candidate 是相同表面的连续 presentation。需合同级决定哪些仍是 route，哪些改为局部 workspace state。
4. **浏览器文件导入假闭环**：demo 的 `<input type="file">` 仅证明交互，不证明原生沙盒复制、注册、重启持久和删除回退。
5. **物理遮挡 API 差异**：三平台不能被假定为总能返回同等精度的遮挡矩形。合同必须允许精确 rect 和整边安全带两级输入。
6. **Session 真值分裂**：iOS 存在主 Reader TTS 与 demo auto-page 分裂；Android 动效基础与可见胶囊分裂；HarmonyOS 胶囊与页码各自算位置。应先合并状态所有权，再做动画。
7. **排版重算风险**：展开时若直接改正文可用高度，将改变分页结果和阅读位置。必须使用裁剪/覆盖，并用页码不变断言守护。
8. **门禁漂移**：HarmonyOS 当前测试强制了旧亮度栏语义。若不先更新权威规划和 fixtures，正确的新实现会被旧测试拦截。

## 9. 授权检查清单

只有以下项目都得到明确授权后，才开始 Host 同步：

- [ ] 同意 `frontend-demo-next` 成为唯一 demo 权威基线。
- [ ] 同意修改 Reader-UI contracts / fixtures / codegen。
- [ ] 同意分别修改 Android、iOS、HarmonyOS 仓库。
- [ ] 同意先处理三端当前脏工作树，不直接覆盖。
- [ ] 同意主题/字体/背景使用原生文件选择与沙盒资产管理。
- [ ] 同意每仓独立 commit，不将三端混成一个“Host 已同步”提交。
- [ ] 同意在每端设备证据完成前，状态标记为“合同已消费 / 设备待验证”。
