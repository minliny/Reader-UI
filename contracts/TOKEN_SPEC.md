# Token Spec

状态：Phase 1 P0 可执行参考规格
日期：2026-07-11
权威源：[token.schema.json](./token.schema.json)、[token.fixtures.json](./fixtures/token.fixtures.json)
来源：[frontend-demo-optimized/tokens.css](../frontend-demo-optimized/tokens.css)、[frontend-demo-optimized/motion-tokens.css](../frontend-demo-optimized/motion-tokens.css)、[token.fixtures.json](./fixtures/token.fixtures.json)

本文是 P0 阶段"Token 和视觉规范"。定义语义 token 分组、三端 TokenAdapter 映射规则、raw 值检查口径。Token 数值以 [token.fixtures.json](./fixtures/token.fixtures.json) 为唯一源；本文不重复数值，只定义分组、映射、检查规则。

## 0. 文档边界

本文覆盖：
- 语义 token 分组（按用途归并，不按 category）
- 三端 TokenAdapter 映射规则（SwiftUI / Compose / ArkUI）
- 禁止 raw color / spacing / radius / duration 的检查口径
- 阅读主题、字号、行距、页边距、夜间模式、卡片、列表、按钮、tab、overlay、表单控件原语的 token 分组

本文不覆盖：
- 不重复 token 数值（以 fixtures 为唯一源）
- 不写原生 TokenAdapter 实现代码（归三端仓库）
- 不规定具体平台 API（如 Color(red:...)、Color(0xFF...)、ResourceColor）

## 1. Token 命名约定

来源：[token.schema.json](./token.schema.json) `name` 字段 pattern。

```
--fd-ds-<category>-<semantic>
```

- 前缀固定 `--fd-ds-`
- `<category>` ∈ `color / font / type / spacing / size / radius / shadow / elevation / z-index / text-constraint / motion-duration / motion-easing / icon / preset`
- `<semantic>` 描述用途，不允许使用 raw 数值（如 `--fd-ds-color-fff8f4` 禁止）
- 一经发布不得改名，只能 `deprecated: true` + `replacedBy`

禁止命名：
- `--fd-ds-color-#fff8f4`（带 hex 值）
- `--fd-ds-spacing-16`（带 px 数值）
- `--fd-ds-radius-4`（带 px 数值）
- `--fd-ds-motion-duration-220`（带 ms 数值）

## 2. 语义 token 分组

按用途分组，每组对应 fixtures 中的子集。分组不是新 category，是组织视图。

### 2.1 阅读主题组（reading-theme）

阅读器主题相关 token，覆盖 `ReadingBackgroundLayer` + `ReadingTextFlow`。

| Token | Category | 用途 |
| --- | --- | --- |
| `--fd-ds-color-paper` | color | 默认纸张色 |
| `--fd-ds-color-paper-bright` | color | 亮纸张色 |
| `--fd-ds-color-ink` | color | 正文墨色 |
| `--fd-ds-color-control-ink` | color | 控制层文字色 |
| `--fd-ds-color-paper-night` | color | 夜间阅读背景色 |
| `--fd-ds-color-ink-night` | color | 夜间阅读正文色 |
| `--fd-ds-color-control-ink-night` | color | 夜间控制层文字色 |
| `--fd-ds-color-primary-night` | color | 夜间主强调色 |
| `--fd-ds-color-floating-control-bg-alt-night` | color | 夜间控制层备用背景色 |
| `--fd-ds-font-serif` | font | 阅读正文衬线字体 |
| `--fd-ds-type-reader-body-size` | type | 阅读正文字号 |
| `--fd-ds-text-reader-line-length` | text-constraint | 阅读正文行宽（ch 单位）|

夜间模式必须使用上表已发布的 `*-night` token；`reader.nightState.toggle` 只负责切换语义集合，不得在组件内临时派生夜间 raw color。

### 2.2 字号 / 行距 / 页边距组（reading-typography）

字号阶梯：

| Token | Category | 用途 |
| --- | --- | --- |
| `--fd-ds-type-app-title-size` | type | App 标题（20px）|
| `--fd-ds-type-page-title-size` | type | 页面标题（20px）|
| `--fd-ds-type-section-title-size` | type | 区段标题（15px）|
| `--fd-ds-type-book-title-size` | type | 书籍标题（14px）|
| `--fd-ds-type-book-meta-size` | type | 书籍元信息（12px）|
| `--fd-ds-type-reader-body-size` | type | 阅读正文（18px）|
| `--fd-ds-type-reader-control-label-size` | type | 阅读控制层标签（12px）|

行距：当前由 `ReadingTextFlow` 平台排版层用 platform line-height 默认值实现；如需统一行距 token，按 `--fd-ds-type-reader-line-height` 命名补入 fixtures。

页边距：

| Token | Category | 用途 |
| --- | --- | --- |
| `--fd-ds-space-screen-padding` | spacing | 屏幕边距（16px）|
| `--fd-ds-space-card-padding` | spacing | 卡片内边距（14px）|
| `--fd-ds-space-safe-area-top` | spacing | 顶部安全区（24px）|
| `--fd-ds-space-safe-area-bottom` | spacing | 底部安全区（14px）|
| `--fd-ds-space-safe-area-horizontal` | spacing | 水平安全区（16px）|
| `--fd-ds-space-keyboard-gap` | spacing | 键盘与内容间距（12px）|

阅读器正文页边距：当前由 `ReadingTextFlow` 平台排版层在 `--fd-ds-space-screen-padding` 基础上派生；如需明确阅读页边距 token，按 `--fd-ds-space-reader-margin` 命名补入 fixtures。

### 2.3 卡片组（card）

| Token | Category | 用途 |
| --- | --- | --- |
| `--fd-ds-color-surface` | color | 卡片底色 |
| `--fd-ds-color-surface-soft` | color | 软卡片底色 |
| `--fd-ds-space-card-padding` | spacing | 卡片内边距 |
| `--fd-ds-radius-card` | radius | 卡片圆角 |
| `--fd-ds-elevation-card` | elevation | 卡片高度 |
| `--fd-ds-shadow-soft` | shadow | 卡片软阴影 |

### 2.4 列表组（list）

| Token | Category | 用途 |
| --- | --- | --- |
| `--fd-ds-color-surface` | color | 列表项底色（与卡片共用）|
| `--fd-ds-color-border` | color | 列表分隔线 |
| `--fd-ds-space-md` | spacing | 列表行垂直间距 |
| `--fd-ds-space-screen-padding` | spacing | 列表水平边距 |

### 2.5 按钮组（button）

| Token | Category | 用途 |
| --- | --- | --- |
| `--fd-ds-color-primary` | color | 主按钮底色 |
| `--fd-ds-color-primary-dark` | color | 主按钮按下态 |
| `--fd-ds-color-accent` | color | 强调按钮 |
| `--fd-ds-radius-control` | radius | 按钮圆角（pill）|
| `--fd-ds-motion-duration-buttonPress` | motion-duration | 按钮按下反馈 |
| `--fd-ds-motion-duration-buttonActivate` | motion-duration | 按钮释放确认 |
| `--fd-ds-motion-duration-toggleSwitch` | motion-duration | toggle/switch/checkbox |

### 2.6 Tab 组（tab）

| Token | Category | 用途 |
| --- | --- | --- |
| `--fd-ds-color-bottom-bar-bg` | color | 底部导航背景 |
| `--fd-ds-size-bottom-bar-height` | size | 底部导航高度 |
| `--fd-ds-size-main-nav-height` | size | 主导航高度 |
| `--fd-ds-z-main-nav` | z-index | 主导航层级 |
| `--fd-ds-motion-duration-tabPress` | motion-duration | tab 按下反馈 |
| `--fd-ds-motion-duration-tabSelect` | motion-duration | tab 选中切换 |
| `--fd-ds-motion-duration-tabSwitch` | motion-duration | tab 之间切换 |

### 2.7 Overlay 组（overlay）

| Token | Category | 用途 |
| --- | --- | --- |
| `--fd-ds-color-floating-control-bg` | color | overlay 背景 |
| `--fd-ds-color-floating-control-bg-alt` | color | overlay 备用背景 |
| `--fd-ds-color-meta-bg` | color | meta 区背景 |
| `--fd-ds-size-reader-bottom-sheet-min-height` | size | reader 底表最小高度 |
| `--fd-ds-size-reader-module-nav-height` | size | 保留 token 名；产品用途待新规格 |
| `--fd-ds-radius-bottom-sheet` | radius | 底表圆角 |
| `--fd-ds-z-overlay` | z-index | overlay 层级 |
| `--fd-ds-z-bottom-sheet` | z-index | 底表层级 |
| `--fd-ds-z-reader-module-nav` | z-index | 保留 token 名；产品用途待新规格 |
| `--fd-ds-z-dialog` | z-index | dialog 层级 |
| `--fd-ds-shadow-elevated` | shadow | overlay 阴影 |
| `--fd-ds-motion-duration-overlay` | motion-duration | overlay 进入退出 |

### 2.8 夜间模式组（night-mode）

夜间模式由 `reader.nightState.toggle` 事件触发，平台 TokenAdapter 切换到 fixtures 已定义的 night semantic set；平台 dark color set 必须映射到该集合，不得成为另一套未登记颜色。

策略：
- 阅读正文、正文背景、控制层文字、主强调及控制层备用背景使用 §2.1 已发布的 `*-night` token。
- 平台 TokenAdapter 必须实现 light/dark 双值，依据 `ui-state.readerMode` 或系统 appearance 切换。
- 新增夜间语义时必须先补 fixtures 和三端 registry；不得只在某一端增加私有 dark color。

### 2.9 RSS / 状态色组（rss-status）

| Token | Category | 用途 |
| --- | --- | --- |
| `--fd-ds-color-rss-unread` | color | RSS 未读标识色 |
| `--fd-ds-color-muted` | color | 次要文字色 |
| `--fd-ds-color-border` | color | 边框色 |

### 2.10 Motion 组（motion）

motion-duration 和 motion-easing 全集见 [MOTION_SPEC.md](./MOTION_SPEC.md) §3。本组不重复列。

### 2.11 控件原语组（control-primitives）

本组是 `Input / Select / Switch / Button` 的共享视觉合同。所有 Reader 表单与设置场景必须消费同一组 token；组件不得再声明同义的局部高度、边框、圆角、标签列或状态色。该合同不定义控制层结构或模块内容。

状态颜色：

| Token | Category | 用途 |
| --- | --- | --- |
| `--fd-ds-color-control-field-surface` | color | 输入框和下拉框默认底色 |
| `--fd-ds-color-control-field-border-default` | color | 默认边框 |
| `--fd-ds-color-control-field-border-hover` | color | hover 边框 |
| `--fd-ds-color-control-field-border-focus` | color | focus / active 边框与 focus ring 基色 |
| `--fd-ds-color-control-field-surface-disabled` | color | disabled 底色 |
| `--fd-ds-color-control-field-ink-disabled` | color | disabled 标签、值和图标色 |
| `--fd-ds-color-control-field-border-error` | color | error 边框和辅助文字色 |
| `--fd-ds-color-control-field-border-success` | color | success 边框和辅助文字色 |

尺寸与几何：

| Token | Category | 用途 |
| --- | --- | --- |
| `--fd-ds-size-control-sm-height` | size | 紧凑型控件视觉高度 |
| `--fd-ds-size-control-md-height` | size | 默认控件视觉高度 |
| `--fd-ds-size-control-lg-height` | size | 强调型控件视觉高度 |
| `--fd-ds-size-control-touch-target` | size | 所有可交互控件最小触控高度/宽度 |
| `--fd-ds-size-switch-track-width` | size | Switch 轨道宽度 |
| `--fd-ds-size-switch-track-height` | size | Switch 轨道高度 |
| `--fd-ds-size-switch-thumb` | size | Switch 滑块直径 |
| `--fd-ds-size-control-icon` | size | 控件内图标标准尺寸 |
| `--fd-ds-size-reader-field-label-column` | size | Reader 设置行固定标签列宽 |
| `--fd-ds-radius-field` | radius | Input / Select 圆角 |
| `--fd-ds-radius-button` | radius | 标准 Button 圆角 |
| `--fd-ds-radius-switch` | radius | Switch 轨道胶囊圆角 |

间距与文字：

| Token | Category | 用途 |
| --- | --- | --- |
| `--fd-ds-space-control-inline` | spacing | 控件左右内边距 |
| `--fd-ds-space-control-gap` | spacing | 标签、控件、图标之间的标准间距 |
| `--fd-ds-space-control-row-block` | spacing | 控件行上下内边距 |
| `--fd-ds-type-control-label-size` | type | 字段标签字号 |
| `--fd-ds-type-control-value-size` | type | 输入值、选项值和按钮文字字号 |
| `--fd-ds-type-control-helper-size` | type | 说明、错误和成功辅助文字字号 |

消费规则：

1. 控件视觉高度只允许使用 `sm / md / lg`；视觉高度小于触控尺寸时，外层 hit target 仍必须满足 `control-touch-target`。
2. 状态优先级固定为 `disabled > error/success > focus > hover > default`，同一时刻只能呈现一个最高优先级边框状态。
3. Input 与 Select 必须共用 field surface、field border 和 field radius；标准 Button 使用 button radius；Switch 使用固定 track/thumb 几何和 switch radius。
4. `--fd-ds-radius-control` 作为已发布的 legacy pill token 保留；新表单控件不得把它当作 field/button 的默认圆角。
5. Reader 配置行默认使用固定 label column。窄屏可折叠为单列，但不得用局部 raw width 替换该 token。
6. label、value、helper 各自只使用对应 type token；错误/成功状态不得通过改变字号或布局表达。

## 3. 三端 TokenAdapter 映射规则

每个 token 在三端必须有 TokenAdapter 把语义 token 映射为平台 API。TokenAdapter 实现归三端仓库，本仓只定义映射规则。

### 3.1 SwiftUI（iOS）

| Category | 映射目标 | 形式 |
| --- | --- | --- |
| `color` | `Color` | 扩展 `extension Color { static let readerPaper = Color("ReaderPaper", bundle: ...) }` 或 `Color(red:green:blue:)` |
| `font` | `Font` | `Font.custom(...)` 或 `Font.system(...)` |
| `type` | `Font` + `CGFloat` | `Font.system(size: 20, weight: .semibold)` |
| `spacing` | `CGFloat` | 扩展 `extension CGFloat { static let readerSpaceMd: CGFloat = 16 }` |
| `size` | `CGFloat` | 同 spacing |
| `radius` | `CornerRadii` / `CGFloat` | `Rectangle().cornerRadius(CGFloat.readerRadiusCard)` |
| `shadow` | `Shadow` style | `Color.black.opacity(0.1)` + radius |
| `elevation` | `CGFloat` | z 偏移 |
| `z-index` | `Int` | `ZStack { ... }.zIndex(20)` |
| `text-constraint` | `Int` / `CGFloat` | `.lineLimit(1)` / `.frame(width: 31.ch)` |
| `motion-duration` | `TimeInterval` / `Duration` | `.animation(.easeInOut(duration: 0.16))` |
| `motion-easing` | `Animation` timing function | `.easeInOut` / `.easeOut` / `.easeIn` |

### 3.2 Compose（Android）

| Category | 映射目标 | 形式 |
| --- | --- | --- |
| `color` | `Color` | `val ReaderPaper = Color(0xFFFFF8F4)` 或 `Color(R.color.reader_paper)` |
| `font` | `FontFamily` | `FontFamily.Serif` / `FontFamily.SansSerif` |
| `type` | `TextUnit` + `TextStyle` | `TextStyle(fontSize = 20.sp, fontWeight = FontWeight.SemiBold)` |
| `spacing` | `Dp` | `val ReaderSpaceMd = 16.dp` |
| `size` | `Dp` | 同 spacing |
| `radius` | `Dp` / `CornerSize` | `RoundedCornerShape(4.dp)` |
| `shadow` | `Shadow` | `Shadow(elevation = 2.dp, shape = ...)` |
| `elevation` | `Dp` | `Modifier.shadow(2.dp)` |
| `z-index` | `Int` | `Modifier.zIndex(20f)` |
| `text-constraint` | `Int` | `Text(maxLines = 1)` |
| `motion-duration` | `Int`（毫秒）| `tween(durationMillis = 160)` |
| `motion-easing` | `Easing` / `FiniteAnimationSpec` | `tween(easing = FastOutSlowInEasing)` |

### 3.3 ArkUI（HarmonyOS）

| Category | 映射目标 | 形式 |
| --- | --- | --- |
| `color` | `ResourceColor` | `$r('app.color.reader_paper')` 或 `Color.White` |
| `font` | `string` / `FontFamily` | `'serif'` / `'sans-serif'` |
| `type` | `number` / `Length` | `20fp` / `20` |
| `spacing` | `Length` | `16vp` |
| `size` | `Length` | 同 spacing |
| `radius` | `Length` / `BorderRadiuses` | `borderRadius(4)` |
| `shadow` | `ShadowOptions` | `{ radius: 26, color: 'rgba(89,70,50,0.1)' }` |
| `elevation` | `number` | `offset({ y: 2 })` + shadow |
| `z-index` | `number` | `zIndex(20)` |
| `text-constraint` | `number` | `maxLines(1)` |
| `motion-duration` | `number`（毫秒）| `animateTo({ duration: 160 })` |
| `motion-easing` | `Curve` | `Curves.EaseInOut` / `Curves.EaseOut` |

### 3.4 TokenAdapter 实现要求

每端必须实现：
1. 一个 `TokenAdapter`（或同名）模块，提供所有 fixtures 中 token 的平台值。
2. light/dark 双值切换（夜间模式）。
3. `reducedMotion` 时把 motion-duration 全部视为 0ms（见 [STATE_OWNERSHIP.md](./STATE_OWNERSHIP.md) §6）。
4. 不允许在组件代码中硬编码 raw 值（见 §4）。

## 4. 禁止 raw 值的检查口径

三端 Native UI 代码不允许出现以下 raw 值，必须经 TokenAdapter 引用 token：

### 4.1 禁止项

| 类型 | 禁止示例 | 允许示例 |
| --- | --- | --- |
| color | `Color(red: 1, green: 0.97, blue: 0.95)` | `Color.readerPaper` |
| color | `Color(0xFFFFF8F4)` | `Color.readerPaper` |
| color | `Color.White`（作为业务色）| `Color.readerPaper`（业务色必须语义命名）|
| spacing | `CGFloat(16)` / `16.dp` / `16vp` | `CGFloat.readerSpaceMd` |
| size | `20.sp` / `20fp` | `TextUnit.readerBodySize` |
| radius | `4.dp` / `borderRadius(4)` | `ReaderRadius.card` |
| duration | `tween(160)` / `animateTo({ duration: 160 })` | `tween(ReaderMotion.tabSwitch)` |
| easing | `FastOutSlowInEasing`（直接用）| `ReaderEasing.standard` |
| shadow | `Shadow(elevation = 2.dp)`（直接用）| `ReaderShadow.soft` |
| z-index | `zIndex(20)`（直接用）| `ReaderZ.mainNav` |

允许例外：
- 系统提供的纯系统色（如 `Color.clear` / `Color.black.opacity(...)` 用于遮罩）。
- 与 token 数值巧合但语义不相关的一次性数值（如动画 keyframe 中间值）。
- 平台必需的 layout measurement 数值（如 `frame(width: 200)` 用于测量）。

### 4.2 检查脚本口径

应在三端仓库 CI 中实现的检查（本仓不实现，只定义口径）：

1. **grep 检查**：搜索 `.swift / .kt / .ets` 文件中 raw hex color、raw `.dp / .sp / .vp / .fp` 数值、raw `tween(...) / duration:` 数值。
2. **AST 检查**（更严格）：解析组件代码 AST，确认 color / spacing / radius / duration 调用都经 TokenAdapter。
3. **token coverage 检查**：三端 TokenAdapter 必须覆盖 fixtures 中所有非 deprecated token。

P0 阶段建议先实现 grep 检查；AST 检查作为 Phase 5 验收门槛（见 [PLATFORM_EVIDENCE_SPEC.md](./PLATFORM_EVIDENCE_SPEC.md)）。

### 4.3 demo 例外

`frontend-demo-optimized/` 是浏览器 demo，使用 CSS variable 直接引用 token：
```css
background: var(--fd-ds-color-paper);
padding: var(--fd-ds-space-md);
```

CSS variable 使用不算 raw 值。但 `frontend-demo-optimized/styles/*.css` 中如出现 `background: #fff8f4` 而不是 `var(--fd-ds-color-paper)`，视为漂移，应修正或补入 fixtures。

## 5. token.fixtures.json `platforms` 字段补全策略

[token.fixtures.json](./fixtures/token.fixtures.json) 当前未填 `platforms.swift / kotlin / arkts` 字段。补全策略：

- **不在 P0 阶段批量补全 fixtures 的 platforms 字段**：fixtures 是 schema 形状验证源，platforms 是"映射提示"。
- **三端实际映射由 TokenAdapter 实现决定**：三端仓库实现 TokenAdapter 时，把 fixtures 中所有 token 落到平台 API。
- **P1 阶段补 platforms 字段**：当三端 TokenAdapter 实现稳定后，把映射结果回填到 fixtures.platforms，用于 drift 检查。

P0 阶段的检查口径：
- fixtures 中所有 token 已生成到三端 `TokenRegistry` / `tokenRegistry`，平台 TokenAdapter 必须基于 registry 或等价映射覆盖所有非 deprecated token。
- 三端 TokenAdapter 不允许出现 fixtures 之外的 token（防漂移）。

## 6. 生成 registry 起点

`node tools/codegen/generate.mjs` 会把 [token.fixtures.json](./fixtures/token.fixtures.json) 中全部 fixture 生成到三端文件：

- Swift：`generated/swift/Token.swift` 的 `TokenRegistry`
- Kotlin：`generated/kotlin/Token.kt` 的 `TokenRegistry`
- ArkTS：`generated/arkts/Token.ets` 的 `tokenRegistry`

registry 保留原有 TokenCategory enum，同时给平台提供可消费的 token 列表 / map。每条 token 包含：
- `name`
- `category`
- `value`
- `platforms`
- `deprecated`

当前状态是 value registry 起点完成，不等于三端 TokenAdapter 已实现。SwiftUI / Compose / ArkUI 的真实平台 API 映射、dark color set、raw 值 grep / AST 检查仍归三端仓库完成。

## 7. Token 新增 / 废弃流程

1. 在 [token.fixtures.json](./fixtures/token.fixtures.json) 中新增条目，`name` 必须 match schema pattern。
2. 三端 TokenAdapter 同步新增映射。
3. 跑 `node --test contracts/tests/*.test.mjs` 校验。
4. 跑 `node tools/codegen/generate.mjs` 重新生成 `generated/{swift,kotlin,arkts}/Token.*`。
5. 提交时包含 fixtures + generated + 三端 TokenAdapter 变更（三端 Adapter 变更归各端仓库）。

废弃流程：
1. 在 fixtures 中把 `deprecated` 改为 `true`，新增 `replacedBy` 指向替代 token。
2. 至少保留一个 MINOR 周期。
3. 后续 MAJOR 版本才能删除。

## 8. 缺口与下一步

P0 阶段已补 token 分组、三端映射规则、raw 值检查口径。控件原语 token 层已闭环：状态颜色、三档视觉高度、最小触控尺寸、Switch 几何、控件图标、Reader 标签列、行内/行间距、组件圆角及 label/value/helper 字号均以 §2.11 为唯一来源。

跨层剩余项：
- fixtures 的 `platforms.swift / kotlin / arkts` 字段未填（P1 阶段回填）。
- 行距 / 阅读页边距 token 未明确（当前由平台排版层派生；如需统一，按 §2.2 命名补入）。
- 三端 TokenAdapter 实现归各端仓库，P0 不验证；Phase 5 验收门槛覆盖。
- Demo 及三端组件必须迁移到 §2.11；控件 selector/state 是否已消费 token 属于实现验收，不得通过新增局部同义变量绕过。
