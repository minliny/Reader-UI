# Reader 核心语义 Token 与组件视觉状态规范（墨纸青松 2.0）

> [!NOTE]
> 本文档是从唯一机器权威源（[`theme/registry.json`](../theme/registry.json)、[`theme/design-metrics.json`](../theme/design-metrics.json)、[`theme/icon-registry.json`](../theme/icon-registry.json)、[`design/harmonyos-ui-redesign/implementation-plan.md`](../design/harmonyos-ui-redesign/implementation-plan.md) 与 [`Reader-for-HarmonyOS/docs/message-ui/FRAMEWORK.md`](../../Reader-for-HarmonyOS/docs/message-ui/FRAMEWORK.md)）提炼的跨端视觉速查规范。
> 本文件**不是**运行时生成输入，也**不记录**任务排期或设备验收状态。所有精确数值发生争议时，以上述机器 JSON 权威源及锁定 HarmonyOS 主线为准。

---

## 1. 视觉权威源与生成链

| 类别 | 唯一权威源 | 生成器脚本 | 消费产物 | 只读校验命令 |
| --- | --- | --- | --- | --- |
| **应用色 & 8 套纸底** | `Reader-UI/theme/registry.json` | `Reader-for-HarmonyOS/tools/generate-theme-registry.mjs` | `Reader-UI/theme/ReaderThemeRegistry.ts`、`Reader-for-HarmonyOS/.../ui/foundation/ReaderThemeRegistry.ts`、`.../app/ReaderThemeSelection.ts` | `node tools/generate-theme-registry.mjs --check`（HarmonyOS 仓） |
| **Android / iOS 颜色表** | `Reader-UI/theme/registry.json` | `Reader-UI/scripts/generate-theme-tokens.mjs` | `theme/generated/android/ReaderThemeTokens.kt`、`theme/generated/ios/ReaderThemeTokens.swift` | `node scripts/generate-theme-tokens.mjs --check`、`node --test scripts/check-theme-tokens.test.mjs`、`node --test scripts/check-theme.test.mjs` |
| **跨端度量 & 图标映射** | `Reader-UI/theme/design-metrics.json`、`theme/icon-registry.json`、`design/source-switch/source-switch.visual.json` | `Reader-UI/scripts/generate-m1-ui.mjs` | `theme/generated/{android,ios}/ReaderDesignMetrics.*`、`ReaderIconRegistry.*`、`reader_ebook_runtime/manifest.json` | `node scripts/generate-m1-ui.mjs --check` |
| **HarmonyOS 布局预算** | `Reader-UI/design/harmonyos-ui-redesign/design-size-contract.json` | 手工双仓同步（同字节断言） | `Reader-for-HarmonyOS/tests/navigation-geometry/design-size-contract.json` | `node scripts/test-host.mjs --domain navigation-geometry`（HarmonyOS 仓） |

---

## 2. 颜色分层隔离（531 底层角色 → 27/29 核心语义色）

`ReaderThemeTokens` / `ReaderThemeRegistry` 包含 **531 个底层 `ReaderAppRole`**，用于兼容已有组件细粒度槽位与 SVG 着色。**业务页面严禁直接枚举或盲选底层角色**，必须通过 Design System 暴露的核心语义层（约 27 个设计槽位 / 29 个代码属性）消费颜色；专用组件的细分槽位仅允许封装在对应组件内部。

### 2.1 核心语义角色清单（以 `theme/registry.json` 为准，ARGB 十六进制）

| 分组 | 语义用途 | 设计角色（`implementation-plan.md`） | `ReaderAppRole` 权威键 | 日间（Day · 宣纸） | 夜间（Night · 松墨） |
| --- | --- | --- | --- | --- | --- |
| **表面与画布** | 页面纸底 | `--rd-canvas` | `TOK_PAPER` / `TOK_SURFACE` / `app.window.background` | `#FFF4EFE6` | `#FF151715` |
| | 卡片表面 | `--rd-surface` | `TOK_CARD_BG` / `TOK_CARD_BG_HI` | `#FFFBF8F2` | `#FF1F2320` |
| | 浮层弹窗 / 菜单实体 | `--rd-elevated` | `TOK_SURFACE_ELEVATED` | `#FFFFFDF9` | `#FF272C28` |
| | 输入框 / 分段槽 / 次级底 | `--rd-sunken` | `TOK_FIELD_SURFACE` / `TOK_SURFACE_FIELD` | `#FFEAE3D6` | `#FF191C19` |
| | 常规半透玻璃层 | `--rd-glass` | `app.surface.glass` | `#E0FDFAF4` (0.88) | `#E0222723` (0.88) |
| | 重模糊底盘（抽屉等） | `--rd-glass-heavy` | `app.surface.glassHeavy` | `#F0FBF8F2` (0.94) | `#F01F2320` (0.94) |
| | 阅读控制岛外壳（96% 半透） | `--rd-ctrl-shell` | `TOK_READ_SURFACE` | `#F5FFFAF4` (0.96) | `#F5212622` (0.96) |
| | 阅读控制岛内卡片 | `--rd-ctrl-card-solid` | `TOK_READ_ELEVATED` | `#FFFFFCF8` | `#FF272D28` |
| **文字与线框** | 主文字墨 | `--rd-ink` | `TOK_INK` / `app.text.heading` | `#FF1D1B18` | `#FFECE8E0` |
| | 次级文字（副标题 / 简介） | `--rd-muted` | `TOK_MUTED` | `#FF635D55` | `#FFA6A196` |
| | 弱提示灰（元信息 / 占位） | `--rd-subtle` | `app.text.emptyHint` / `TOK_SS_MUTED` | `#FF928B80` | `#FF747067` |
| | 常规分隔线 | `--rd-line` | `TOK_LINE` / `TOK_ROW_DIVIDER` | `#1A5C4F3F` (0.10) | `#17ECE8E0` (0.09) |
| | 强调描边 / 边框 | `--rd-line-strong` | `TOK_LINE_STRONG` | `#295C4F3F` (0.16) | `#29ECE8E0` (0.16) |
| | 全应用中性按压叠加 | `--rd-press` | `app.interaction.press` | `#141D1B18` (0.08) | `#1AECE8E0` (0.10) |
| | 模态遮罩 | `--rd-scrim` | `app.scrim.modal` | `#61151715` (0.38) | `#94000000` (0.58) |
| **品牌与语义** | 品牌主色（深松绿） | `--rd-primary` | `TOK_PRIMARY_DARK` / `TOK_GREEN` | `#FF1F3D31` | `#FF7BB094` |
| | 主色反白文字 / 图标 | `--rd-on-primary` | `TOK_ON_PRIMARY` / `app.control.onPrimary` | `#FFFAF7F0` | `#FF111B16` |
| | 浅松绿底（Tonal / 选中行） | `--rd-primary-soft` | `TOK_PRIMARY_SOFT` | `#171F3D31` (0.09) | `#247BB094` (0.14) |
| | 选中态边框 | `--rd-primary-border` | `TOK_PRIMARY_BORDER` | `#471F3D31` (0.28) | `#577BB094` (0.34) |
| | 古铜点缀（书签 / 在读条） | `--rd-seal` | `TOK_ACCENT` | `#FFB86B2B` | `#FFD99452` |
| | 危险警示（删除 / 失败） | `--rd-danger` | `TOK_DANGER` | `#FFB83B32` | `#FFE0645A` |
| | 危险反白文字 | `--rd-on-danger` | `app.action.onDanger` | `#FFFFFDF9` | `#FFFFFDF9` |
| | 成功 / 已缓存 | `--rd-success` | `app.status.good` | `#FF2E6F52` | `#FF6DC095` |
| | 延迟 / 警告 | `--rd-warning` | `app.status.warning` | `#FFB87424` | `#FFE0A458` |
| **悬浮胶囊与控件** | 薄雾顶栏底 | `--rd-veil-bg` | `app.header.veilSurface` | `#E0FFFCF8` (0.88) | `#E630342D` (0.90) |
| | 薄雾顶栏描边 | `--rd-veil-border` | `app.header.veilBorder` | `#9EC6BAA4` (0.62) | `#CC6C7364` (0.80) |
| | 悬浮底栏表面 | `--rd-float-bg` | `app.navigation.floatingSurface` | `#FFFDFAF4` | `#FF222723` |
| | 悬浮底栏描边 | `--rd-float-border` | `app.navigation.floatingBorder` | `#1F5C4F3F` (0.12) | `#1FECE8E0` (0.12) |
| | 开关圆形滑块 | `--rd-switch-thumb` | `app.toggle.thumb` | `#FFFFFDF9` | `#FFF4EFE6` |
| | 分段凹槽轨道 | `--rd-segment-track` | `app.segment.surface` | `#FFE2D9C9` | `#FF0B0D0B` |
| | 分段凹槽边缘 | `--rd-segment-border` | `app.segment.border` | `#245C4F3F` (0.14) | `#73000000` (0.45) |
| | 分段抬升滑块 | `--rd-segment-thumb` | `app.segment.selected` | `#FFFFFDF9` | `#FF282E29` |

> **阅读控制岛补充语义**：控制岛内部前景文字/图标优先消费 `TOK_READ_PRIMARY`（`#FF1F3D31` / `#FF7BB094`）、`TOK_READ_INK`（`#FF332C25` / `#FFECE8E0`）、`TOK_READ_MUTED`（`#FF5B5046` / `#FFA6A196`）与抓手 `TOK_READ_HANDLE`（`#FFB9AD9F` / `#47ECE8E0`）。
> **通用消息面板补充语义**：由 `ReaderTheme` 额外封装 `TOK_MESSAGE_SURFACE`、`TOK_MESSAGE_INK`、`TOK_MESSAGE_BORDER`、`TOK_MESSAGE_MUTED`、`TOK_MESSAGE_NOTICE`、`TOK_MESSAGE_NOTICE_INK`、`TOK_PRIMARY_TEXT`、`TOK_PRIMARY_BG`、`TOK_META_BG`、`TOK_BORDER`、`app.action.destructiveSoft`、`app.shadow.dialog`、`TOK_SS_DRAWER_SCRIM`。

### 2.2 业务页面禁止直接使用清单

1. **禁止直接引用的底层角色族**：`app.icon.*`（仅归 `IconRegistry` / SVG 染色映射）、`app.control.paint.*`、旧领域前缀硬编码（未封装的 `TOK_DOWNLOAD_*` / `TOK_TTS_*` / `TOK_SS_*`）不得出现在普通业务页面。
2. **禁止沿用的已淘汰色值与语义**：
   - 禁止亮橙按压叠加（旧 `TOK_ACCENT` `#F48B13` at 12%），统一使用中性墨色叠加 `app.interaction.press`（日 8% / 夜 10%）。
   - 禁止旧蓝青品牌色（`#2F6373` / `#2379A4`）回流到控制岛、朗读胶囊或导航高亮。
   - 禁止使用旧纸底（Figma 2026-09 `#fff8f4ff` 与 2026-10 `#FFF8F4EC`），当前纸底唯一值为 `#FFF4EFE6` / `#FF151715`。
   - 禁止业务页缓存静态日间色常量而不响应 `scheme` 切换。

---

## 3. 八套阅读纸底（`registry.json -> reader`）

App 日夜主题（`day` / `night`）与阅读正文 8 套纸底**相互独立**；不能以系统或 App 深色模式静默覆盖用户已选定的阅读纸底。阅读页系统状态栏必须严格跟随当前纸底的 `statusBackground` / `statusForeground`。

| ID | 名称 | Scheme | 背景 (`paperStart` / `paperEnd`) | 正文墨 (`ink`) | 页眉页脚 (`chromeMeta`) | 状态栏 (`statusBackground` / `statusForeground`) |
| --- | --- | --- | --- | --- | --- | --- |
| `day` | 日间 | `day` | `#FFF7F3EA` | `#FF2B241D` | `#FF766C61` | `#FFF7F3EA` / `#FF2B241D` |
| `warm` | 暖白 | `day` | `#FFF2E8D3` | `#FF2C241D` | `#FF766C61` | `#FFF2E8D3` / `#FF2C241D` |
| `paper` | 纸纹 | `day` | `#FFEDE2CB` | `#FF2B241D` | `#FF766C61` | `#FFEDE2CB` / `#FF2B241D` |
| `green` | 青叶 | `day` | `#FFE3EBDD` | `#FF263423` | `#FF63755F` | `#FFE3EBDD` / `#FF263423` |
| `night` | 夜间 | `night` | `#FF21221F` | `#FFE4DDD0` | `#FF9D968B` | `#FF21221F` / `#FFE4DDD0` |
| `warmNight` | 暖夜 | `night` | `#FF31271D` | `#FFE7D8C8` | `#FFB3A18F` | `#FF31271D` / `#FFE7D8C8` |
| `paperNight` | 夜纹 | `night` | `#FF202630` | `#FFE2DDD5` | `#FF9BA5B2` | `#FF202630` / `#FFE2DDD5` |
| `greenNight` | 林夜 | `night` | `#FF1D2D23` | `#FFD8E2D2` | `#FF97AA9A` | `#FF1D2D23` / `#FFD8E2D2` |

---

## 4. 核心几何、断点、字体与动效令牌

- **页面边距与间距**（`design-metrics.json` & `design-size-contract.json`）：
  - `screenInset = 16`、`cardPadding = 14`、`controlInlineSpacing = 10`、`rowBlockSpacing = 4`
  - 阶梯间距：`spaceExtraSmall = 8`、`spaceSmall = 12`、`spaceMedium = 16`、`spaceLarge = 24`、`spaceExtraLarge = 48`
  - 命中目标与紧凑控件：`minimumActionTarget = 44`、`compactControlHeight = 32`
- **圆角层级**：
  - 独立按钮、悬浮顶底栏、搜索框与状态胶囊：`pillRadius = 999`
  - 内容卡片：`cardRadius = 14`；分段控件轨道：`segmentedTrackRadius = 12`
  - 普通表单输入框：`inputRadius = 10`；小徽章：`badgeRadius = 6`（传输徽章 `5`）
  - 底部抽屉上圆角：`24`（见 `mangaDockRadius` 与规范 §5）；居中弹框：`22`
- **自适应断点**：
  - `narrowBreakpoint = 360`（超窄分屏降级阈值）；`wideBreakpoint = 600`（`< 600` 单栏、`>= 600` 宽屏分栏），宽屏判断基于当前应用窗口而非设备型号。
- **字体分工**：
  - `family = "ui"`（全字库思源黑体 / Inter）：全应用非正文界面（顶栏、书架书名、设置、搜索、弹窗、目录）。
  - `family = "literary"`（思源宋体等文学字体）：**仅用于**阅读正文、阅读章节大标题与外观字体预览。
  - Android 必须显式关闭字体额外上下留白（`includeFontPadding = false`）并锁定 `fontSize` / `lineHeight`。
- **统一动效基线**（`ProductMotionTiming.ts` & `design-metrics.json`）：
  - 路由：`navigationPushMillis = 260`、`navigationPopMillis = 240`、Tab 切换 `180`、底栏滑移 `220`
  - 减少动态效果（Reduce Motion）：统一 `reducedMotionFadeMillis = 120` 轻淡入，不强切 `0ms` 硬闪，且保留真实业务计时与取消语义
  - 控制栏：`OPEN 220`、`EXPAND 320`、`COLLAPSE 260`、`DISMISS 200`、`RESTORE 220`、`MODULE_SWITCH 240`、`LAYER_SWITCH 220`
  - 浮层与重排：Sheet `OPEN 260 / CLOSE 210 / SCRIM 160`、书架重排 `320`（首屏错峰 `24`，封顶 `120`）

---

## 5. 组件视觉规范与状态矩阵

| 组件类别 | 几何与视觉规则 | 交互与业务状态覆盖 | 溢出 / 截断与 Do / Don't |
| --- | --- | --- | --- |
| **动作按钮**（Primary / Tonal / Subtle / Danger / 图标圆钮） | 全胶囊 `r=999`；高度 `46 / 38 / 30`（可点触控区均不低于 `44×44`）；Primary 用 `--rd-primary` + `--rd-on-primary`，Danger 用 `--rd-danger` + `--rd-on-danger` | `default` / `pressed`（叠加 `app.interaction.press`）/ `disabled`（降低不透明度并禁交互）/ `loading`（保留原宿主操作身份防重复触发） | **Do**：短文本单行居中截断。<br>**Don't**：不要为了凑 44 命中区放大图标视觉尺寸，也不要使用亮橙按压色。 |
| **书架列表卡 & 继续阅读卡** | 列表为默认视图；卡片 `r=14`、`--rd-surface`、内边距 `12`；封面 `62×88`、进度条高 `3`；`···` 菜单置于首行右上角 | `default` / `pressed` / `selected`（多选态用 `--rd-primary-soft` + `--rd-primary-border`）/ `noCover`（`NoCoverCover` 宣纸无封面） | **溢出**：书名 `maxLines=2`（`shelfTitleMaxLines: 2`）；作者、已读章+百分比、最新章各 `1` 行省略；本地书隐藏“最新章节”；`<360` 窄屏优先保书名与操作钮。 |
| **搜索栏与输入域** | 搜索胶囊 `r=999`、高 `38`（与搜索钮等高）；表单输入框 `r=10`、`--rd-sunken`、表单行高 `40` | `empty`（占位提示 `--rd-subtle`）/ `focused` / `filled`（单层清空图标）/ `disabled` / `validationError`（行内提示） | **Do**：初始态与结果态共用同一输入查询值；异步重查时不得重挂载输入框导致丢焦。<br>**Don't**：不要在输入法 `composition` 未提交前触发搜索请求。 |
| **开关 / 分段控件 / 选择器** | 开关 `44×26` 区间、滑块 `--rd-switch-thumb`；分段凹槽轨道比页面画布更深（`--rd-segment-track`）且抬升滑块（`--rd-segment-thumb`）带柔和投影，常规分段轨道 `r=12`，书架封面/列表切换采用 `66×34` 全胶囊凹槽滑轨（内边距 `3`、滑块 `30×28` 同心全胶囊并支持平滑滑动）；选择器菜单表面 `--rd-elevated` | `on / off`（不乐观切换须等 Core 回执后再同步或回滚）/ `selected` / `disabled` / `expanded / collapsed`（下拉 `160ms / 120ms`） | **Do**：分段选项等宽不折行，超宽标签缩短文案或调整字阶。<br>**Don't**：不要在开关等待 Core 持久化返回时假装已保存。 |
| **悬浮顶栏与底栏** | 顶栏薄雾胶囊（`--rd-veil-bg` + `--rd-veil-border` + Blur `10–14`）；底栏悬浮胶囊（`--rd-float-bg` + `--rd-float-border`，窄屏通栏居中，宽屏限宽悬浮） | `idle` / `scrolled`（顶栏增强模糊与遮挡）/ `activeTab`（底栏内嵌主色高亮胶囊） | **溢出**：顶栏标题与副标题合计最多两行省略，为左侧返回钮与右侧操作区留固定安全槽。 |
| **抽屉 / 浮层 / 阅读控制岛** | 底部 Sheet 上圆角 `24`、`--rd-elevated` / `--rd-glass-heavy`；控制岛常规高 `330`（`--rd-ctrl-shell`）、亮度条宽 `38`、章节进度卡高 `108`；换源最大宽 `390` | `hidden / quick / full`（手势直驱与速度接续）/ `scrim`（`--rd-scrim`）/ 业务状态（换源 `discovering / candidates / empty / error / switching`） | **Do**：浮层叠在当前活跃页面上层，关闭不重排底页。<br>**Don't**：不要用整面淡切替代控制岛各几何轨道，也不要使用逐行延迟飞入。 |
| **对话框（Alert / Confirm）** | 居中卡片 `r=22`（或 `ReaderSurfaceSpecs` 规定变体 `r=12`）、`--rd-elevated`、外边距 `16–24` | `default` / `busy`（确认按钮显示加载态并禁用重复点击）/ `failed`（保留失败事实） | **Do**：危险确认仅由原宿主展示；点击确认只派发请求，不等于业务 ACK。<br>**Don't**：禁止长文案消息自动升级为模态弹窗。 |
| **5 类消息表面**（对齐 `FRAMEWORK.md`） | `TransientToast`（2000ms，换源 2200ms，同宿主同 key 去重）；`RecoveryNotice`（顶部安全区下方有界滚动）；`PageState`（内容区占位） | `loading / empty / error / pendingRecovery / taskProgress`；当控制岛/Sheet/Dialog 占前景时，`RecoveryNotice` 暂退绘制、命中与读屏 | **Do**：已有旧内容时刷新失败只弹局部/短反馈，保留原列表；严格传递 `actionGeneration`。<br>**Don't**：禁止展示内部堆栈或凭据，禁止在页面内旁路调用系统 `Toast` / `AlertDialog`。 |

### 5.1 设置页控件选型与视觉分层规范

任何设置项按**语义本质**分为 4 类，严禁仅凭“选项个数为 2–3 个”机械套用 `162vp` 分段控件：

| 语义类别 | 判断标准 | 推荐控件 |
| --- | --- | --- |
| **1. 视觉 / 版式模式** | 2–3 项互斥，能用极简缩略图一眼表达界面/版式差异，且为分组主导设置 | **全宽视觉选择卡**（2 列或 3 列，置于卡片首位作视觉锚点） |
| **2. 二元开关 / 能力启用** | 本质是开/关，或「默认 vs 启用某特性」（如 `默认 / 原生`、`关闭 / 开启`） | **开关（Toggle）** + 整行点击 + 1 句常驻短说明（禁止做成 2 段式分段器） |
| **3. 策略 / 动作枚举** | 无直观版式图、需靠文字理解的策略/动作选项 | 默认 **值 + 箭头选择行**（弹出选择器）；仅在「选项 ≤3、每项 ≤3 字、无长副标题、且本卡尚无其他分段器」时允许行内分段控件 |
| **4. 跳转 / 一次性动作** | 进入子页、清理缓存、恢复默认等 | **标准表单行**（箭头跳转 / Tonal 小按钮 / Danger 行） |

**3 条硬性红线：**
1. **单卡分段控件上限 = 1 个**：同一张分组卡片内禁止连续堆叠 2 个及以上分段控件，杜绝灰色凹槽墙与上下分割线错位。
2. **禁止 2×2 字硬撑 `162vp`**：`162vp` 分段宽仅允许 `3×≤2 字`（如 `跟随 / 浅色 / 深色`）或 `2×3~4 字`（如 `双栏对开 / 单栏居中`）；`2×2 字` 要么升格为 2 列视觉选择卡，要么降级为开关。
3. **长说明行禁配宽分段器**：`secondaryText` 超过 10 字时，右侧禁止放置 `162vp` 分段控件（防止 390vp 窄屏左列折行挤压），应改用开关或「值 + 箭头选择行」。

---

## 6. 黄金快照基线索引与维护纪律

- 遵循 `CROSS_PLATFORM_CLIENT_ARCHITECTURE.md` §6.3：每端随交付里程碑维护 **15–20 张以上高价值黄金快照**（覆盖书架日/夜/空/恢复/窄屏大字号、详情与目录、正文浅/深纸底与控制岛 `Quick`/`Full`、5 类消息、宽屏分栏、书源 v9 与漫画/听书）。
- 现行重建端基线位于对应重建分支 worktree：
  - Android：`rebuild/m3`（`app/src/test/resources/goldens/`、`scripts/golden-contact-sheet.py`）
  - iOS：`rebuild/m3`（`Tests/Goldens/Baselines/manifest.json`、`Scripts/golden-baselines.py`，含 `pins`、视口、主题、字号与 PNG/像素 SHA-256）
- **边界声明**：黄金快照仅验证静态视觉与回归防漂移，**不能替代**连续动效（跟手/重抓/中断/减动效）、真实字体渲染与真机无障碍验收。
