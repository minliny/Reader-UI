# 运行时适配契约（Runtime Adaptation Contract）

本文定义 Reader 前端设计稿在不同窗口、屏幕比例、安全区、键盘、文字缩放和覆盖层组合下的规划规则。它服务于 HTML 输入件、Android Compose 实现，以及后续 HarmonyOS / iOS 映射，不服务于单张截图复刻。

当前本地 demo 的执行层差距见 `ADAPTIVE_CONSTRAINT_AUDIT.md`。本文是目标契约，不代表 `frontend-demo-draft` 已经完成横屏、折叠屏、平板和多视口自动切换。

## 适用范围（Scope）

| 范围（Scope） | 说明（Description） |
|---|---|
| 页面（Pages） | `manifest.json` 中 30 个正式页面。 |
| Shell | `MainTabShell`、`LibraryShell`、`ReaderShell`、`FlowShell`、`SettingsShell`。 |
| 输出（Outputs） | HTML 输入件、状态矩阵、可互动 demo、Compose preview/test。 |
| 平台优先级（Platform Priority） | 当前实现优先 Android / HTML 输入件，同时保留 HarmonyOS 和 iOS 的语义映射。 |

## 基本原则（Core Rules）

- 按窗口而不是按机型规划布局（Window First, Not Device First）。
- 按可用内容区规划布局，不按截图像素规划布局。
- 布局单位和字体单位必须分开。
- 固定层可以覆盖内容，但内容必须有可计算的 inset。
- 键盘、安全区、底表和主导航不能各自临时加 padding，必须声明唯一 owner。
- 页面状态只能替换内容 slot 或 state host，不能替换根 Shell。
- 验收必须覆盖极端文本、键盘、底部固定层、返回顺序和最后一项可达。

## 断点契约（Breakpoint Contract）

| 断点（Breakpoint） | 窗口宽度（Window Width） | 默认布局（Default Layout） | 验收重点（Acceptance Focus） |
|---|---:|---|---|
| `xs` | `<320` | 极简单栏，只保留 P0。 | P0 可达，P1/P2 可隐藏，不出现横向溢出。 |
| `sm` | `320-599` | 手机单栏，底部导航或底部操作固定。 | 最后一项可达，键盘不遮挡输入和提交。 |
| `md` | `600-839` | 单栏增强或轻双栏。 | 状态只替换当前内容区，不误替换根 Shell。 |
| `lg` | `840-1439` | 双栏、侧边区域或横向流程。 | 面板和结果区有最小宽度，主操作不被状态区覆盖。 |
| `xl` | `>=1440` | 双栏增强或三段式。 | 不盲目拉伸卡片，内容密度和阅读宽度有上限。 |

断点选择必须同时考虑高度：

| 高度条件（Height Condition） | 规则（Rule） |
|---|---|
| 紧凑高度（Compact Height） | 不自动切双栏；优先保留 P0 和主操作。 |
| 常规高度（Regular Height） | 允许展示 P1 内容和更多列表项。 |
| 键盘占用高度（Keyboard Reduced Height） | 进入输入态布局，按键盘 owner 重算可用区域。 |

## 运行时 Class 契约（Runtime Class Contract）

`frontend-demo-draft` 和真实实现都必须把窗口判断拆成宽度等级、高度等级和方向，不能只依赖单个 `@media` 条件。当前 HTML demo 的根节点已经落地以下输出，Compose / 其他端映射时使用同名语义即可，不需要沿用 DOM 属性名。

| 输出（Output） | 当前取值（Current Values） | 规则（Rule） |
|---|---|---|
| `data-width-class` | `compact`、`standard`、`large`、`expanded`、`tablet` | `<360`、`360-479`、`480-599`、`600-839`、`>=840`。 |
| `data-height-class` | `compact`、`short`、`regular` | `<520`、`520-719`、`>=720`。 |
| `data-orientation` | `portrait`、`landscape` | 当前可视窗口宽高比较，优先使用 visual viewport。 |
| `data-viewport-class` | `compact-portrait`、`standard-portrait`、`large-portrait`、`compact-landscape`、`expanded-width`、`tablet-expanded`、其他组合兜底 | 面向 Shell 策略的合成 class，不直接代表机型。 |
| `--fd-viewport-width` / `--fd-viewport-height` | 当前可视窗口 px | 仅供 HTML 输入件运行态约束使用；跨平台实现映射到窗口 dp/vp/pt。 |

首批验收视口固定为：`320x568`、`390x844`、`430x932`、`844x390`、`600x960`、`840x1180`。验证必须同时检查 class、route、横向溢出和 frame 上限。

## 单位映射契约（Unit Mapping Contract）

| 类别（Category） | HTML 输入件 | Android Compose | HarmonyOS | iOS | 规划规则（Planning Rule） |
|---|---|---|---|---|---|
| 布局尺寸（Layout Size） | `px` 仅作输入件表达 | `dp` | `vp` | `pt` | 不把截图 px 当跨平台实现单位。 |
| 字体尺寸（Font Size） | `px` 仅作输入件表达 | `sp` | `fp` | `pt` / Dynamic Type | 字体必须参与系统缩放策略。 |
| 间距（Spacing） | token 表达 | `dp` token | `vp` token | `pt` token | 主间距基线 8，微间距 4。 |
| 圆角（Radius） | token 表达 | `dp` token | `vp` token | `pt` token | 不在页面局部硬编码散值。 |
| 图标（Icon） | 语义 token | vector / ImageVector | vector | SF / vector | 优先矢量和语义 token。 |
| 位图（Bitmap） | fixture / asset-library | density bucket | 资源组 | `@2x` / `@3x` | 必须声明比例和裁切策略。 |

## Safe Area Owner（安全区归属）

| Shell / Layer | 顶部安全区（Top Safe Area） | 底部安全区（Bottom Safe Area） | 左右安全区（Side Safe Area） | 说明（Notes） |
|---|---|---|---|---|
| `MainTabShell` | `StatusBar` / `AppTopBar` 消费。 | `MainNav` 消费，`ContentRegion` 追加尾部 inset。 | `AppFrame` 保底。 | `MainNav` 可覆盖内容底部，但不能压住最后完整项。 |
| `LibraryShell` | `BackTopBar` 消费。 | `BottomActionHost` 或 `ContentRegion` 消费。 | `StackFrame` 保底。 | 有底部操作时列表必须增加尾部 inset。 |
| `ReaderShell` | `ReaderTopBar` 避让。 | `ReaderModuleNav` 和 `BottomSheetHost` 协同避让。 | `ReaderOverlayHost` 保底。 | 覆盖层不改变正文阅读位置。 |
| `FlowShell` | `FlowFrame` 保底。 | `FlowFrame` 保底。 | `FlowFrame` 保底。 | 横向流程不能让结果按钮贴边。 |
| `SettingsShell` | `BackTopBar` 消费。 | `SettingsContent` 追加尾部 inset。 | `SettingsFrame` 保底。 | Toast 不改变设置行布局。 |
| `DialogHost` | 自身居中避让。 | 自身居中避让。 | 自身居中避让。 | 高于 Sheet 和 Toast。 |
| `BottomSheet` | 不消费顶部安全区，除非全屏。 | 自身消费底部安全区。 | 自身保底。 | Page 不重复为 Sheet 加 bottom padding。 |

## 键盘归属（Keyboard Ownership）

| 场景（Scenario） | Owner | 滚动对象（Scrollable Owner） | 固定对象（Fixed Owner） | 通过标准（Pass Criteria） |
|---|---|---|---|---|
| 书籍搜索（Book Search） | `LibraryShell` + 页面搜索内容 | 搜索内容和结果列表 | `BackTopBar`；提交动作跟随键盘或改为键盘上方动作 | 聚焦输入框、错误提示、提交动作同时可见。 |
| 分组命名（Group Naming） | `DialogHost` | Dialog 内部内容 | Dialog 按钮区 | 输入框、取消、保存不被键盘遮挡。 |
| 内容搜索（Content Search） | `ReaderShell` panel | 搜索结果面板 | `ReaderModuleNav` 或输入面板动作区 | 上一条/下一条和打开结果可达。 |
| 内容替换（Content Replacement） | `ReaderShell` panel | 规则编辑区域 | 保存/测试动作区 | 测试反馈和保存动作可达。 |
| 书源编辑（Source Edit） | `SettingsShell` 或 Source 子流程 | 表单内容 | 保存动作区 | 长表单可滚动到最后一项。 |
| 设置搜索（Settings Search） | `SettingsShell` | 设置内容 | 返回顶栏 | 搜索结果不被键盘永久遮挡。 |

## 覆盖层与 Inset（Overlay and Inset）

| 覆盖层（Overlay） | 可覆盖（Can Cover） | 禁止覆盖（Must Not Cover） | Inset Owner |
|---|---|---|---|
| `MainNav` | 内容底部过渡区。 | 最后一项完整可点击内容、系统键盘、阻塞弹窗。 | `MainTabShell`。 |
| `BottomActionHost` | 内容底部过渡区。 | 最后一项必须点击内容、底表、弹窗。 | `LibraryShell` 或页面内容。 |
| `BottomSheet` | 来源页面内容和底部操作。 | `DialogHost`、系统键盘、底表主动作。 | `BottomSheet`。 |
| `DialogHost` | 当前 Shell 内容、Sheet、Toast。 | 系统权限弹窗、系统键盘确认输入。 | `DialogHost`。 |
| `ToastHost` | 非阻塞内容区域。 | 弹窗按钮、输入框当前编辑内容、主导航 active。 | `ToastHost`。 |
| `ReaderOverlayHost` | 阅读正文可覆盖区。 | 阅读错误恢复动作、系统弹窗。 | `ReaderShell`。 |
| `ReaderModuleNav` | 正文底部过渡区。 | 阅读面板主确认按钮、系统键盘。 | `ReaderShell`。 |
| `Flow StateHost` | 流程弱状态区。 | `ResultRegion` 切换确认、返回阅读。 | `FlowShell`。 |

## 返回优先级（Back Precedence）

```text
1. 系统权限弹窗由系统处理。
2. DialogHost 关闭阻塞弹窗。
3. SheetHost / BottomSheetHost 关闭底表或半模态。
4. ReaderOverlayHost 关闭阅读模块、输入态或控制层。
5. LibraryShell / SettingsShell 返回上一页。
6. FlowShell 返回 ReaderShell 并恢复 ReaderContext。
7. MainTabShell 保留当前 tab，必要时回到 tab 根。
```

## 文本与缩放（Text and Scaling）

| 文本类型（Text Type） | 默认规则（Default Rule） | 极值策略（Extreme Strategy） |
|---|---|---|
| 页面标题（Page Title） | 单行。 | 截断，不挤压返回按钮和操作按钮。 |
| 书名（Book Title） | 卡片中一到两行。 | 超长时截断，封面比例不跟随变形。 |
| 章节名（Chapter Title） | 列表单行或两行。 | 当前章节行优先展示，辅助信息可截断。 |
| 设置行主文本（Setting Row Title） | 单行。 | 辅助说明换行，尾部值区保持可读。 |
| 按钮文案（Button Label） | 单行完整。 | 不通过缩小到不可读解决，必要时改短文案。 |
| 阅读正文（Reading Text） | 按阅读设置流式排版。 | 不截断章节内容，使用分页或滚动。 |
| 主导航标签（Main Nav Label） | 单行。 | 不换行、不改变 nav 高度。 |

## Shell 默认适配（Shell Defaults）

| Shell | `compact / standard portrait` | `large / expanded portrait` | `compact landscape` | `tablet / xl` |
|---|---|---|---|---|
| `MainTabShell` | 单栏内容 + 底部四栏导航；内容区追加 MainNav inset。 | 单栏居中，书架网格可按容器增加列数；不改变 tab 语义。 | 保留当前 route，压缩顶部/底部固定层高度，P0 工具优先；未设计前不自动切侧栏。 | 可使用更宽内容区或侧向导航，但 Android 当前优先保持底部四栏语义。 |
| `LibraryShell` | 返回顶栏 + 单栏内容 + 可选底部操作；列表末项必须在底部动作上方完整可达。 | 内容最大宽居中，底表和底部动作可加宽但不拉满。 | 底部操作降为紧凑条或进入内容滚动尾部；不能遮挡完成/保存。 | 可使用双栏详情或目录，但 `BookContext`、返回栈和当前选择不重置。 |
| `ReaderShell` | 正文底层 + 顶栏/控制层/模块导航/亮度条覆盖；正文 inset 可计算。 | 正文行宽封顶，控制面板可加宽；阅读进度不重排为新章节。 | 风险最高：不展示大型底部面板，控制层改轻量覆盖或跳全屏页；亮度条与模块导航共享避让。 | 可侧向展示目录/朗读/外观/设置，阅读正文保持最大行宽，阅读位置不重置。 |
| `FlowShell` | 窄屏为纵向分步或阅读控制层内弹窗，取消/成功/失败都回 ReaderShell。 | 可展示候选与检测结果的轻双区。 | 横向换源可以压缩为候选列表 + 当前来源对照，但确认动作必须可见。 | 标准步骤/对照/结果三块横向流程，`ReaderContext` 不丢。 |
| `SettingsShell` | 单栏设置列表；尾部值区、开关、下拉都在行右侧稳定锚定。 | 单栏居中并提升分组密度；底部控制追加 content inset。 | 下拉最大高度受可视区限制，底部固定栏不遮挡最后一项。 | 可使用侧栏或双栏设置，但 `SettingsContext`、返回顺序和弹层 owner 不变。 |

## 首批验收场景（First Validation Scenarios）

| 场景（Scenario） | 页面（Pages） | 通过标准（Pass Criteria） |
|---|---|---|
| 手机竖屏书架 | 书架 | 继续阅读不压过书籍集合，最后一本书可滚到主导航上方。 |
| 搜索键盘 | 书籍搜索、内容搜索、内容替换 | 输入框、错误提示、提交/上一条/保存动作可见。 |
| 阅读模块 active | 阅读控制层 | 四模块按钮 active 不改变尺寸、间距、相对位置。 |
| 横向换源 | 换源 | 状态区不遮挡切换确认，返回保留 ReaderContext。 |
| 设置长文本 | 设置二级页 | 主文本、说明、尾部值区不重叠。 |
| 弹层返回 | 操作底表、设置确认、阅读面板 | 返回按 Dialog、Sheet、Reader panel、Page 顺序处理。 |

## 实现落地要求（Implementation Requirements）

- `tokens.css` 和 Compose theme 已有首批 frame、inset、typography、z-index、shell geometry token；新增页面级尺寸必须继续回填 token 或页面契约。
- viewport、inset、text overflow、P0 可达、最后一项可达属于实现验证项，规划规则以本文和 `FRONTEND_EXECUTABLE_PLANNING_CONTRACT.md` 为准。
- Compose preview 必须按 `sm/md/lg` 和关键状态补充，不只保留默认态。
- 可互动 demo 必须优先验证滚动、覆盖、返回、键盘、状态切换和首批六视口 runtime class 矩阵。
- 视觉还原只能在结构和运行时契约成立后进入精修。
