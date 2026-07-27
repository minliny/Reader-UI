# Reader Control Primitives

状态：规范、合同 Token 与 `frontend-demo-optimized` 共享原语已落地；三端平台组件迁移另行验收

适用范围：Reader 中可复用的表单与交互控件本体

依赖：[Token Spec](../../contracts/TOKEN_SPEC.md)、[Paper Flow Motion Language](./PAPER_FLOW_MOTION_LANGUAGE.md)、[Paper Flow Icon System](./PAPER_FLOW_ICON_SYSTEM.md)

更新时间：2026-07-11

## 0. 文档边界与规范词

本文只定义 `FieldRow`、`Select`、`Input`、`Switch`、`Button`、`SegmentedControl`、`Slider` 的视觉和交互原语。它不定义阅读控制层的结构、层级、模块内容、导航、展开或收起逻辑。

本文只定义 UI 结构、状态、可访问性和 Token 使用规则，不定义 TTS、网络、存储或任何 Host 能力。业务字段是否存在由对应产品文档和合同决定；字段一旦存在，必须按本文渲染。

- **必须**：跨 demo 与三端实现保持一致，除非平台无等价能力且已记录降级规则。
- **应该**：默认实现；偏离时必须说明具体场景和验证证据。
- **可以**：可选增强，不得破坏状态语义与可访问性。

权威顺序：合同与 fixture 决定数据和事件；本文决定控件表达；Token Spec 与 token fixtures 决定可执行值。本文出现的参考尺寸不得直接成为组件内 raw 值，落地前必须映射到已发布 token。

## 1. 统一设计语言

Reader 控件是纸面上的安静工具，不是彼此独立的小卡片。

1. **单一表面**：一个模块只保留一个主表面；字段靠对齐、留白和细分隔线组织，不逐行套卡片。
2. **同类同形**：同一尺寸档位的 Select、Input 和 Button 共享高度、文字基线、边框强度和水平内边距。
3. **标签稳定**：字段名称永远由可见 Label 承担，placeholder 只提示格式，不能代替 Label。
4. **状态克制**：默认态安静，焦点、选择、错误和危险才提升对比度；不能叠加描边、阴影、光晕和位移表达同一状态。
5. **热区优先**：可见图形可以紧凑，命中区不能随视觉尺寸缩小。
6. **内容不漂移**：Hover、Pressed、Focus、Loading 和校验状态不得改变相邻控件位置。
7. **语义优先**：二元持久设置用 Switch；多项互斥用 Select 或 SegmentedControl；即时命令用 Button；连续值用 Slider。

## 2. Token 约束

### 2.1 已有 Token 映射

| 语义 | 必须使用的 Token |
| --- | --- |
| 页面/阅读纸面 | `--fd-ds-color-paper`、`--fd-ds-color-paper-bright` |
| 控件与软表面 | `--fd-ds-color-surface`、`--fd-ds-color-surface-soft` |
| 主文字/控件文字/次要文字 | `--fd-ds-color-ink`、`--fd-ds-color-control-ink`、`--fd-ds-color-muted` |
| 默认边界 | `--fd-ds-color-border` |
| 主操作/按下 | `--fd-ds-color-primary`、`--fd-ds-color-primary-dark` |
| 品牌强调 | `--fd-ds-color-accent` |
| 控制层标签 | `--fd-ds-type-reader-control-label-size` |
| 间距 | `--fd-ds-space-xs/sm/md/lg` |
| 控件圆角 | `--fd-ds-radius-small/medium/large/control` |
| 键盘间距 | `--fd-ds-space-keyboard-gap` |
| 焦点环 | `--fd-ds-state-focus` |
| 按压/激活/切换 | `--fd-ds-motion-duration-buttonPress`、`buttonActivate`、`toggleSwitch` |

组件代码不得硬编码颜色、间距、圆角、阴影、时长或层级。Web demo 使用 CSS variable，三端通过各自 TokenAdapter 映射。

### 2.2 已发布控件原语 Token

以下语义族已写入 fixtures、Web CSS variables 与三端生成 registry，是控件实现的唯一可执行来源。页面不得再声明同义高度、标签列、圆角或状态色。

| Token 族 | 已发布语义集合 |
| --- | --- |
| 控件尺寸 | `--fd-ds-size-control-sm-height`、`--fd-ds-size-control-md-height`、`--fd-ds-size-control-lg-height`、`--fd-ds-size-control-touch-target` |
| 字段状态 | `--fd-ds-color-control-field-surface`、`--fd-ds-color-control-field-border-default`、`--fd-ds-color-control-field-border-hover`、`--fd-ds-color-control-field-border-focus`、`--fd-ds-color-control-field-surface-disabled`、`--fd-ds-color-control-field-ink-disabled`、`--fd-ds-color-control-field-border-error`、`--fd-ds-color-control-field-border-success` |
| Switch 几何 | `--fd-ds-size-switch-track-width`、`--fd-ds-size-switch-track-height`、`--fd-ds-size-switch-thumb`、`--fd-ds-radius-switch` |
| 控件几何 | `--fd-ds-size-control-icon`、`--fd-ds-size-reader-field-label-column`、`--fd-ds-radius-field`、`--fd-ds-radius-button` |
| 控件间距 | `--fd-ds-space-control-inline`、`--fd-ds-space-control-gap`、`--fd-ds-space-control-row-block` |
| 控件文字 | `--fd-ds-type-control-label-size`、`--fd-ds-type-control-value-size`、`--fd-ds-type-control-helper-size` |

Slider 的轨道、已完成部分与 Thumb 当前分别复用 `color-border`、`color-primary` 与 `color-surface`；新增独立 Slider 颜色前必须先走 fixtures 与 TokenAdapter 发布流程，不能由页面声明私有颜色。

## 3. 尺寸档位

所有原语只允许三档尺寸。参考数值用于建立跨端视觉基线，最终实现值必须来自 §2 的尺寸 token。

| 档位 | 可见控件最小高度 | 最小命中区 | 水平内边距 | 图标画板 | 适用场景 |
| --- | ---: | ---: | --- | ---: | --- |
| Small (`sm`) | `--fd-ds-size-control-sm-height`（28px） | `--fd-ds-size-control-touch-target`（44 × 44px） | `--fd-ds-space-control-inline` | `--fd-ds-size-control-icon` | 空间受限的快捷工具栏；不能用于主要播放动作 |
| Medium (`md`) | `--fd-ds-size-control-md-height`（36px） | `--fd-ds-size-control-touch-target`（44 × 44px） | `--fd-ds-space-control-inline` | `--fd-ds-size-control-icon` | 普通 FieldRow 默认值 |
| Large (`lg`) | `--fd-ds-size-control-lg-height`（44px） | `--fd-ds-size-control-touch-target`（44 × 44px） | `--fd-ds-space-control-inline` | `--fd-ds-size-control-icon`，主要动作可使用图标系统的 24px 档 | 主要动作、触控优先或大字体环境 |

规则：

- 同一 FieldGroup 默认只使用一个档位；主要按钮可在同组提升一档，但不得降低一档。
- 高度是最小值，不是固定裁切值。文字换行、系统字体放大或辅助说明出现时，容器必须向下增长。
- `sm` 的 28px 只描述可见外形，必须通过透明 padding 或父容器补足 44px 命中区。
- Icon 的画板与按钮热区分离，遵守 [Paper Flow Icon System](./PAPER_FLOW_ICON_SYSTEM.md#7-图标按钮容器)。
- 不得为了“一屏显示更多”把文字、图标或命中区缩到本表以下；应优先允许内容滚动或减少非必要说明。

## 4. FieldRow

### 4.1 标准结构

```text
FieldRow
├── LabelBlock
│   ├── Label + RequiredIndicator（可选）
│   └── Description（可选）
├── ControlSlot
│   └── Select / Input / Switch / Button / SegmentedControl / Slider
└── AssistiveMessage（可选：Hint / Error / Success）
```

- `Label` 必须可见、短而明确，并与控件建立平台原生的可访问性关联。
- 必填标识附着在 Label 后，并提供“必填”的可访问性名称，不能只显示彩色星号。
- `Description` 解释设置的长期影响；一次性操作说明放在操作附近，不塞进 Label。
- `AssistiveMessage` 位于本字段内容下方，横跨字段可用宽度。错误出现时替换 Hint，避免高度来回叠加。
- 单一字段只有一个主要 Label、一个 ControlSlot 和至多一个当前状态消息。

### 4.2 对齐与间距

宽容器默认使用两列：左侧 LabelBlock，右侧 ControlSlot。标签列按当前 FieldGroup 内最长的合理标签计算，并受以下约束：

- 标签列最小容纳 4 个中文字符；最大不超过容器内容宽度的 40%。
- Label 与控件之间使用 `space-md`；FieldRow 内垂直间距使用 `space-xs` 或 `space-sm`。
- Select、Input、Button 的文字基线对齐；Switch 与单行 Label 的视觉中心对齐。
- ControlSlot 默认右对齐，Select/Input 可以占满槽位；短值控件不能悬在整行中央。
- 相邻 FieldRow 使用留白或一条 `color-border` 分隔线，不能同时使用卡片、阴影和粗描边。

### 4.3 行为

- 点击 Label 应把焦点交给关联控件；Switch 行可以整行点击，但行内不得再放第二个动作。
- Disabled 字段保留 Label 和当前值可读性，并在需要时显示原因。
- Read-only 与 Disabled 不同：只读值仍可聚焦和复制，但不可编辑；禁用控件不进入普通 Tab 顺序。
- Error/Success 属于字段状态，不得通过改变 FieldRow 宽度或列轨道造成偏移。

## 5. Select

### 5.1 使用条件

用于从 5 个以上选项、动态选项或空间不足的互斥集合中选择一项。2-5 个稳定且需要快速比较的短选项优先使用 SegmentedControl；二元设置使用 Switch。

### 5.2 外形与结构

```text
SelectTrigger = Value/Placeholder + trailing Chevron
SelectPopup   = Option list + selected Checkmark
```

- Trigger 使用字段表面、1px 语义边界和 `radius-medium`；不得使用与主按钮相同的实心强调面。
- 当前值左对齐，Chevron 固定在尾端，二者之间保留 `space-xs`。
- Small/Medium/Large 分别使用 `sm/md/lg` 控件高度；字段内图标统一使用 `--fd-ds-size-control-icon`，主要动作才可提升到图标系统的 24px 档。
- 短值 Select 应容纳至少 4 个中文字符、两侧 padding 与 Chevron；不能用固定四字宽度截断实际值。
- Popup 宽度不小于 Trigger，长选项可增长到安全区域内；不得被祖先容器的 `overflow` 裁切。
- 当前选项同时使用 Checkmark 和文字状态，不能只改颜色。

### 5.3 状态与交互

- Trigger 聚焦后 `Enter/Space/Alt+Down` 打开，`Escape` 关闭并把焦点还给 Trigger。
- Popup 内使用上下方向键移动，Home/End 到首尾，Enter 提交；输入字符可按平台能力执行前缀搜索。
- 打开 Popup 只旋转 Chevron 或做短淡变，不改变 Trigger 尺寸。
- Placeholder 使用 muted 色且不是有效值；必填 Select 未选择时必须可被校验。
- Loading 时保留已选值并显示小型进度，不把整个字段替换为骨架。
- 禁止把 Select 做成无 Label 的纯文字、把 Chevron 放在值旁边漂移，或用浏览器/平台默认样式与 Reader 样式混排。

## 6. Input

### 6.1 类型

本文覆盖单行 Text、Password/Credential、URL、Search 和 Number Input。多行内容使用独立 TextArea 规范，不得通过无限增高 Input 模拟。

### 6.2 外形与结构

```text
Input = optional LeadingIcon + EditableText + optional TrailingAction/Unit
```

- 与同档 Select 共享高度、边界、圆角、字体、表面和水平 padding。
- 值左对齐；单位放在尾端并与内容分离，不能写入 placeholder。
- Placeholder 只给格式示例，例如“https://…”，不能写“请输入地址”来代替可见 Label。
- Password 默认遮蔽，显隐按钮拥有独立可访问性名称和至少 `--fd-ds-size-control-touch-target` 的命中区；显隐切换不得移动文字基线。
- Number Input 必须声明合法范围和 step；不能依赖浏览器私有微型箭头作为唯一调节方式。
- Search 可以有清除按钮；普通 Input 只有在内容可安全丢弃时才显示清除按钮。

### 6.3 编辑、校验与隐私

- 输入中不因每个字符触发错误抖动；格式错误默认在 blur、显式提交或用户停止输入后校验。
- 组合输入法尚未 commit 时不得提交、截断或重排字符。
- 自动填充、粘贴、撤销和键盘类型按语义开放；禁止屏蔽系统密码管理器。
- 凭据字段不得把真实密钥写入说明、错误文案、日志或可回读的普通状态；本文只规定其视觉表现。
- Read-only 使用普通字段表面和只读语义，不伪装成 Disabled 灰块。
- Error 时保留用户输入；修正后移除错误。Success 仅用于确有价值的异步确认，不为每个普通字段永久显示绿色勾。

## 7. Switch

### 7.1 使用条件

Switch 只用于立即或保存后生效的二元持久状态。不能用于打开页面、执行一次性命令、表示三态值或代替“播放/停止”按钮。

### 7.2 外形

| 档位 | Track 参考尺寸 | Thumb 参考尺寸 | 命中区 |
| --- | --- | --- | --- |
| Small / Medium / Large | `--fd-ds-size-switch-track-width` × `--fd-ds-size-switch-track-height`（44 × 24px） | `--fd-ds-size-switch-thumb`（20px） | ≥ `--fd-ds-size-control-touch-target`（44 × 44px） |

- Off 使用 `--fd-ds-color-control-field-border-default`，On 使用 `--fd-ds-color-primary-dark`，Thumb 使用 `--fd-ds-color-surface`；必须同时通过 Thumb 位置表达状态。
- Track 与 Thumb 尺寸、边距和位移必须由组件内部统一计算，页面不得单独调整某一个 Switch。
- 不在 Track 内写“开/关”；状态由 Label、位置和平台可访问性值共同表达。
- Loading/提交中可以暂时锁定并在 Label 侧显示进度，但不得让 Thumb 停在中间制造第三状态。

### 7.3 交互

- 点击整行或 Switch 命中区切换一次；嵌套链接存在时只能点击 Switch 本体。
- 键盘使用 Space 切换；Enter 是否切换遵循平台原生控件约定。
- 状态变化使用 `toggleSwitch`/Quick 时长，Thumb 线性收束，无弹簧、回弹和轨道伸缩。
- 失败时恢复到已确认状态，并在 FieldRow 显示原因；不能静默保留错误的视觉状态。

## 8. Button

### 8.1 层级

| 层级 | 用途 | 表达 |
| --- | --- | --- |
| Primary | 当前操作组唯一主动作 | `--fd-ds-color-primary` 实心表面 + `--fd-ds-color-surface` 文字 |
| Secondary | 可并列的普通动作 | 字段/软表面 + 强边界 |
| Tertiary | 低权重、可逆动作 | 透明表面，Hover/Press 才出现软背景 |
| Destructive | 删除、清空、断开等不可逆或高风险动作 | `--fd-ds-color-control-field-border-error` 语义；高风险提交前二次确认 |
| IconButton | 图标可独立准确表达的动作 | 默认透明；遵守图标系统热区 |

- 每个可见 ActionGroup 最多一个 Primary。多个按钮权重相同时全部使用 Secondary/Tertiary。
- “取消”通常是 Tertiary；“保存/应用”可为 Primary；“测试连接”是 Secondary，不能与保存同时抢主层级。
- Destructive 不是普通取消按钮，也不能只靠红色区分；文字必须明确结果。
- 全宽按钮只用于窄容器中的单一主操作或提交页脚，不用于把每个字段动作铺满整行。

### 8.2 尺寸与内容

- 与同档 Select/Input 共享高度；纯 IconButton 使用 §3 的命中区。
- 文字按钮两侧至少使用对应档位水平 padding；图标与文字间使用 `space-xs`。
- 图标在前表示对象/动作，在后表示继续、打开外部或展开；同一语义不得在不同页面交换位置。
- Label 使用动词或明确结果，不使用“确定”承载多个不同动作。
- Loading 保持按钮宽高和原 Label 占位，显示进度并防止重复提交；完成后回到稳定状态。

### 8.3 动效

- Press 使用 Paper Flow Ink Response：60-80ms 轻微加深或缩放，热区和布局不变。
- Release/Activate 使用统一 Button token；不弹跳、不发光、不做大面积渐变流动。
- Reduced Motion 下保留颜色/描边反馈，移除缩放与位移。

## 9. SegmentedControl

### 9.1 使用条件

用于 2-5 个短、稳定、互斥且需要快速比较的选项。超过 5 项、选项动态变化、文字过长或允许多选时，不使用 SegmentedControl。

### 9.2 结构与外形

- 一个共享 `--fd-ds-color-surface-soft` 容器，内部选项等高；选中项使用 `--fd-ds-color-control-field-surface`、主色边界和强文字。
- 选中态不通过整体放大、悬浮阴影或挤压相邻项表达。
- 选项默认等分；若文本宽度差异过大，使用内容宽度但保持统一 padding。
- 容器使用 `radius-large`，选中块使用不大于容器的内层圆角；不得形成一排彼此独立的药丸按钮。
- 每项命中高度满足当前尺寸档；文字最多两行，不能缩小字号塞入。

### 9.3 交互

- 整组只有一个 Tab 停靠点；左右方向键移动选择，Home/End 到首尾，RTL 环境反转空间方向。
- 选中项同时有语义 `selected` 和视觉状态，不能只靠颜色。
- 选中块使用 Quick 原位迁移或短交叉淡变，不重新排版。
- 选择会立即改变高影响内容时，应保留撤销能力或改为 Select + Apply，不让用户误触即丢失工作。

## 10. Slider

### 10.1 标准结构

```text
SliderField
├── Label + ValueOutput
├── Track
│   ├── InactiveTrack
│   ├── ActiveTrack
│   └── Thumb
└── MinLabel / MaxLabel（仅在含义不明显时）
```

- 当前值必须以文字输出；对亮度、语速等熟悉范围可以在拖动/聚焦时显示，对精确设置必须持续显示。
- Track 使用 `--fd-ds-color-border`，已完成部分使用 `--fd-ds-color-primary`，Thumb 使用 `--fd-ds-color-surface` 与主色边界。
- 水平 Track 可见厚度保持克制，但命中高度至少 `--fd-ds-size-control-touch-target`；Thumb 默认使用 `--fd-ds-size-switch-thumb`，主要滑杆可按图标系统的 24px 档提升。
- 竖向 Slider 沿用相同状态、键盘、值输出和 Token，只改变方向，不创建第二套设计语言。
- 双端范围必须使用专门 RangeSlider，不在单 Slider 上叠第二个 Thumb。

### 10.2 交互

- 拖动阶段严格跟手；点击 Track 移到对应值，不能只允许拖 Thumb。
- 左右/上下方向键按 step 调整；PageUp/PageDown 大步进，Home/End 到最小/最大。
- 值必须声明 min、max、step 和单位；屏幕阅读器获得当前值及语义文本。
- 实时预览不得造成正文反复分页、网络请求风暴或不可逆提交；昂贵效果应节流，并在释放时提交最终值。
- Focus、Hover、Drag 可以提高 Thumb/Track 对比度，但不得改变 Track 长度和 FieldRow 高度。

## 11. 统一状态矩阵

以下矩阵适用于全部原语；不适用的状态必须明确省略，不能发明同义状态。

| 状态 | 表面与边界 | 内容 | 动效与行为 |
| --- | --- | --- | --- |
| Rest | 默认字段/透明表面，`--fd-ds-color-border` | `--fd-ds-color-control-ink` | 静止 |
| Hover | `--fd-ds-color-control-field-border-hover` 边界增强 | 不改字号/位置 | 仅精确指针设备；Touch 时长 |
| Pressed | 表面轻微加深 | 图标与文字不漂移 | Ink Response；不改热区 |
| Focus-visible | 保留原状态并叠加 `state-focus` | 焦点清楚可追踪 | 只在键盘/辅助输入焦点显示强环 |
| Selected/On | `--fd-ds-color-control-field-surface` + 主色边界，Switch 使用 `--fd-ds-color-primary-dark` | 形态 + 文字/位置共同表达 | Quick；无弹跳 |
| Disabled | `--fd-ds-color-control-field-surface-disabled`、默认边界 | `--fd-ds-color-control-field-ink-disabled`，仍可辨认 | 不响应、不播放动效 |
| Read-only | 普通或软表面 | 值可读、可复制 | 可聚焦，不可编辑 |
| Loading | 保留原尺寸和上下文 | 小型进度 + 原 Label | 阻止重复提交，不闪烁 |
| Error | `--fd-ds-color-control-field-border-error` | 错误图标 + 消息 | 不抖动；聚焦环仍可见 |
| Success | 默认边界或短暂 `--fd-ds-color-control-field-border-success` | 有价值时显示消息/勾 | 一次 Content Settle 后静止 |

状态优先级：`Disabled > Error > Focus-visible > Pressed > Selected/On > Hover > Rest`。Loading 是行为锁，不覆盖错误说明；Read-only 是交互语义，不等同 Disabled。焦点环必须叠加而不是吞掉错误边界。

## 12. 键盘、焦点与辅助技术

| 原语 | Tab | 主要按键 | 语义要求 |
| --- | --- | --- | --- |
| FieldRow | 行本身通常不进 Tab | 点击 Label 转交控件 | Label/Description/Message 与控件关联 |
| Select | Trigger 一个停靠点 | Enter/Space 打开，方向键选择，Escape 关闭 | combobox/listbox 或平台原生等价语义 |
| Input | 一个停靠点；尾部按钮单独停靠 | 平台文本编辑键 | 正确 input type、autocomplete、错误描述 |
| Switch | 一个停靠点 | Space 切换 | switch/checked 状态与可见 Label |
| Button | 每个可用按钮一个停靠点 | Enter/Space 激活 | button 语义；Loading 时报告 busy |
| SegmentedControl | 整组一个停靠点 | 左右/Home/End | 单选组 + selected 状态 |
| Slider | 一个停靠点 | 方向键、Page、Home/End | min/max/now/text 完整 |

- 焦点顺序跟随视觉阅读顺序，不用正数 `tabindex` 修补错误 DOM。
- 打开 Popup/Dialog 后把焦点移入；关闭后归还触发器。临时状态更新不得把焦点重置到页面顶部。
- 焦点环不得被 overflow 裁切；与背景对比至少 3:1。
- 普通文字对比至少 4.5:1，大号文字和非文本控件边界至少 3:1。
- 状态不能只通过颜色表达；必须有形态、位置、图标或文字中的至少一种冗余通道。
- 动态错误使用适度 live region；不要让每次 Slider 拖动都触发冗长朗读。

## 13. 错误、成功与反馈

1. 错误消息紧邻字段，写明问题和修复方式，例如“地址需以 https:// 开头”，不只写“无效”。
2. 表单级错误汇总只用于多个字段同时失败；每个错误仍需回到对应 FieldRow。
3. 提交失败保留全部用户输入、滚动位置与焦点上下文。
4. 成功反馈与动作规模匹配：即时开关通常只更新状态；显式保存可显示短成功消息；跨页任务才使用全局反馈。
5. 错误不使用持续抖动、闪烁或循环警报；遵守 Paper Flow `Flow Interrupted`。
6. 危险操作的确认必须说明对象和后果，不能只有“取消/确定”。

## 14. 响应式与系统字体放大

### 14.1 宽容器

- FieldRow 使用 LabelBlock + ControlSlot 两列，ControlSlot 右对齐。
- 同一 FieldGroup 共享标签轨道，避免每行控件起点不同。
- 两个短字段可以并列为两个完整 FieldRow；不能把两个 Label 和两个控件拆成四个无关联网格单元。

### 14.2 窄容器

当标签列会压缩控件、可用宽度不足或系统字体放大导致冲突时，FieldRow 自动变为单列：LabelBlock 在上，ControlSlot 在下并占满可用宽度，AssistiveMessage 紧随其后。

- 不以固定手机型号作为唯一断点，优先由容器可用空间和内容测量触发。
- Button 组可以换行；Primary 位于阅读顺序末尾或平台约定位置，不能靠绝对定位固定。
- SegmentedControl 放不下时优先换成 Select；禁止横向缩放文字。
- Select Popup、键盘和错误消息出现后，页面允许垂直滚动但不产生横向滚动。

### 14.3 字体放大

- 至少验证系统字体 100%、150%、200%。在 200% 下优先单列，不裁切 Label、值、按钮文字或错误消息。
- 控件高度只设 min-height；禁止固定 line-height 裁字，禁止用 `overflow: hidden` 隐藏放大文字。
- 文字最多行数只用于确有合同约束的导航标签；字段 Label、值和状态消息不得强制单行省略关键内容。
- 图标不随字体无限放大，但图标按钮热区随 `lg` 档或平台可访问性设置提升。
- 中文、英文、数字、RTL 与长翻译都必须使用逻辑方向属性；不能用硬编码 left/right 破坏 RTL。

## 15. 组合规则

- 一个模块使用 FieldGroup 组织字段；Group 标题、说明、字段和动作栏形成单一阅读顺序。
- 设置行只承载一个主要值。需要“选择 + 配置”时，先 Select 选择类型，再在其后显示从属 FieldGroup，不把多个控件挤进同一行。
- ActionGroup 与最后一个字段之间使用 `space-md/lg`；不能让按钮伪装成下一个字段。
- 同一页面的控件宽度由网格决定，不按文字长度逐个手调 margin、transform 或 absolute offset。
- 条件字段出现/消失使用 Content Settle，保留上方锚点和焦点；不能让整页跳到新位置。
- 复杂配置可以分 Section，但 Section 不重复叠加卡片、阴影、粗边框与大圆角。

## 16. 禁止项

- 页面私自定义 Select/Input/Switch/Button 的高度、圆角、边框色或过渡时长。
- 用 `margin-left`、`transform`、绝对定位逐个修复字段偏移。
- 用 placeholder 代替 Label，或只靠图标猜测字段用途。
- 同一组中一部分控件胶囊化、一部分直角、一部分使用系统默认外观。
- 为普通字段叠加多层卡片、渐变、投影和粗描边。
- 通过缩小字体或热区解决内容溢出。
- 只用颜色表示选中、错误、成功、开关或运行状态。
- Switch 执行命令、Button 表示持久状态、Select 表示简单布尔值。
- SegmentedControl 放入超过 5 项或长段文字。
- Disabled 控件没有原因，或用极低透明度使文字不可读。
- 校验错误导致行宽、列宽或控件位置变化。
- Loading 改变按钮宽度、清空已选值或允许重复提交。
- Focus ring 被裁切、被错误边界覆盖，或使用鼠标点击后永久显示强焦点环。
- 未经 fixtures/TokenAdapter 发布就在实现中新增 raw color、spacing、radius、duration。
- Reduced Motion 下继续播放缩放、滑块回弹、Chevron 位移或循环进度装饰。

## 17. 验收清单

每个使用这些原语的新建或重绘界面必须逐项验证：

- [ ] 所有字段都由 FieldRow 组织，Label/Control/Message 关系明确。
- [ ] Select、Input、Button 在同档位高度、基线、边界和圆角一致。
- [ ] Switch、Slider、IconButton 的可见尺寸与命中区分离。
- [ ] 页面只有必要的 Primary，危险动作层级正确。
- [ ] Rest/Hover/Pressed/Focus/Disabled/Loading/Error/Success 无布局偏移。
- [ ] 键盘可以完成全部操作，Popup/Dialog 焦点可进入并正确归还。
- [ ] 状态不只依赖颜色，错误与成功有可访问性描述。
- [ ] 100%/150%/200% 字体和窄宽度下不裁字、不横向滚动。
- [ ] Light/Dark、Reduced Motion、触摸和精确指针均有稳定表现。
- [ ] 组件只消费已发布语义 token，无页面级 raw 值和私有同义 token。
- [ ] 控件状态变化不改变周围布局几何位置。

## 18. 规范摘要

> Reader 的控件共享同一纸面、同一高度阶梯、同一标签结构和同一状态语法：字段靠对齐而不是卡片堆叠，选择靠形态而不是颜色猜测，反馈清楚但不扰动内容。
