# Stitch 最终 Token 文字草案

状态：`PARTIAL_DRAFT / PENDING_HUMAN_REVIEW / referenceOnly`

本文用于补齐 token blocker 的候选文字内容。本文不是最终 token 权威，不得据此将任何页面设为 `usable=true`。

## 必填 Token 字段

### `lightPalette`

- `appBackground`: `#FAF7F2`
- `paperBackground`: `#F8F1E7`
- `surface`: `#FFFCF7`
- `surfaceMuted`: `#F3EEE8`
- `primaryText`: `#11100E`
- `secondaryText`: `#6F6A64`
- `tertiaryText`: `#8B857E`
- `divider`: `#DED6CC`
- `accent`: `#087EAD`
- `accentSoft`: `#E7F2F5`
- `danger`: `#B2473E`
- `success`: `#4F7D5B`，候选值
- `warning`: `#9A6B2F`，候选值

### `darkPalette`

以下为继承当前草案的暖深色候选值：

- `appBackground`: `#171512`
- `paperBackground`: `#1D1A16`
- `surface`: `#24201B`
- `surfaceElevated`: `#2B2620`
- `primaryText`: `#E7E0D6`
- `secondaryText`: `#B8AFA4`
- `tertiaryText`: `#8F877E`
- `divider`: `#3B352E`
- `accent`: `#72AFC4`
- `accentSoft`: `#24383D`
- `danger`: `#D38478`
- `success`: `#80A98A`
- `warning`: `#C2A06A`

仍需人工验证 OLED 低亮度表现、长时间阅读舒适度、WCAG 对比度和冷暖色平衡。

### `typographyScale`

- `pageTitle`: `22-24sp / 600 / 28-32sp 行高`
- `sectionTitle`: `15-16sp / 500 / 20-22sp 行高`
- `body`: `16-18sp / 400 / 24-36sp 行高`，按 App UI 或阅读正文区分
- `settingTitle`: `16-17sp / 500 / 22-24sp 行高`
- `supporting`: `12-14sp / 400 / 18-20sp 行高`
- `button`: `14-16sp / 500 / 20-22sp 行高`
- App UI 字体：平台无衬线字体回退栈。
- 阅读正文字体：用户选择的衬线/无衬线阅读字体，并提供明确回退栈。

### `spacingScale`

`2, 4, 8, 10, 12, 16, 20, 24, 32, 40dp`

- 标准页面水平边距：`20dp`。
- 紧凑页面最小水平边距：`18dp`。
- 卡片间距：`16-20dp`。
- 最小触控区域：`44 x 44dp`。

### `radiusScale`

- `small`: `4dp`
- `control`: `8dp`
- `dialog`: `8-12dp`
- `readerTopBar`: `14dp`
- `readerPanel`: `18dp`
- `capsule`: 高度的 `50%`

### `surfaceTokens`

- 标准页面使用不透明暖色表面。
- 卡片使用 `surface`、`1dp divider`，不使用阴影。
- 对话框和菜单使用不透明高层表面，只允许极弱环境阴影。
- 阅读控制面板使用不透明暖色表面，底层正文不得重排。
- 玻璃模糊只允许用于轻量浮层，且必须支持不透明表面降级。

### `textTokens`

- 定义主文字、次级文字、弱文字、危险、成功、警告语义。
- 禁用文字仍需保持可读对比度，不得只靠透明度表达状态。
- 阅读正文和 App UI 必须使用不同语义 token。

### `iconTokens`

- App 设置与导航图标：`22-24dp`，`1.8-2.2dp` 圆角描边。
- 阅读控制视觉图标：`27dp`，位于 `42 x 42dp` 图标槽。
- 返回图标：按页面类型使用 `24-28dp`。
- 同一页面不得混用实心与线性功能图标。
- 状态圆点和单选中心点可作为默认实心例外。

### `stateTokens`

- `selectedBackground`：Light `#E7F2F5`；Dark 候选 `#24383D`
- `focusOutline`：组件外侧 `2dp accent`
- `pressedOverlay`：主文字色候选 `8%`
- `disabledContent`：候选 `38%`，并增加非颜色状态提示
- `loading`：使用弱表面骨架，不引发布局跳动
- `empty`：暖色表面、明确说明、一个主要恢复操作
- `error`：危险色文字/图标，并提供重试或修复操作
- `success`：短时行内或横幅反馈，不使用整页绿色背景
- `warning`：简短警告并明确后果

### `safeAreaRules`

- 状态栏和导航栏 inset 由页面外壳吸收。
- 标准内容从 `safeTop` 下方开始；底部导航吸收 `safeBottom`。
- 阅读悬浮面板底距：`safeBottom + 8-16dp`。
- 横屏侧置面板：`safeLeft + 24dp`、`safeBottom + 24dp`。
- 宽竖屏侧置面板：`safeRight + 24dp`、`safeBottom + 24dp`。
- 刘海和手势 inset 不得将触控区域压缩至 `44dp` 以下。
- 平板、折叠屏和自由窗口按当前窗口 inset 处理，不按设备名称判断。

## 人工定稿检查清单

- 批准或替换每个候选颜色。
- 验证 Light 和 Dark 对比度。
- 验证所有语义状态。
- 验证手机、横屏、平板、折叠屏和自由窗口安全区。
- 对照人工 PASS 源图验证图标统一性。
- 在不使用已拒绝51系列图片作为权威的前提下，确认暖白全局状态值。

最终状态：`TOKEN_FINALIZATION_PENDING`
