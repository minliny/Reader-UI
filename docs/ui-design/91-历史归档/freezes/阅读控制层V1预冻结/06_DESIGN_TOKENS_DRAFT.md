# 视觉 Token 草案

说明：本表已按 `READER_CONTROL_GEOMETRY_SPEC.md`、`04-2-complete-relative-parameter-spec.md`
和 `04-2-visual-style-definition.md` 回填。`DEFINED` 表示已有权威规范值；`MEASURED_FROM_04_2`
表示由 04-2 原图测量并换算到 `390 × 884` 逻辑画布。

| Token | 当前值 | 来源 | 状态 | 问题 |
| ----- | --- | -- | -- | -- |
| 背景色 | `#F8F1E7` | 04-2 visual §2 | `MEASURED_FROM_04_2` | 阅读页纸张底色。 |
| 正文文字色 | `#11100E` | 04-2 visual §2 | `MEASURED_FROM_04_2` | 标题、正文与操作文字。 |
| 控制层遮罩色 | `#11100E` / `8%` | Geometry §3 | `DEFINED` | 主体面板保持不透明。 |
| 图标色 | 主 `#0D0D0C`；弱 `#4E4943` | 04-2 visual §2 | `MEASURED_FROM_04_2` | 普通图标不得继承正文色。 |
| 字体 | 正文 Songti/STSong/Noto Serif；控件 PingFang/Noto Sans CJK/微软雅黑 | 04-2 visual §3 | `DEFINED` | 使用平台可用字体回退栈。 |
| 字号 | 正文 18；标题 20；章节 18；控件标签 13–14；Aa 23 | 04-2 visual §3 | `MEASURED_FROM_04_2` | 单位按前端 px / Android sp 映射。 |
| 字重 | 正文/标签 400；亮度标题 500；顶部标题/章节标题 600 | 04-2 visual §3 | `DEFINED` | 禁止正文合成粗体。 |
| 行高 | 正文 36；标题/章节 24；标签 18–20 | 04-2 visual §3 | `MEASURED_FROM_04_2` | 与字号 token 配套。 |
| 圆角 | 顶栏 14；控制层 18；图标槽 10；胶囊为高度 50% | Geometry §5–§8 | `DEFINED` | 单位 dp。 |
| 阴影 | 面板 `y=H×0.12, blur=H×0.32, rgba(78,59,39,.16)`；内高光 `y=-H×.015, blur=H×.075, rgba(78,59,39,.13)` | relative spec §16 | `DEFINED` | 按组件高度等比计算。 |
| 间距 | 面板内边距 `34/10/15/10`；左列行距 `9`；左右列距 `10` | Geometry §6–§7 | `DEFINED` | 顺序为上/右/下/左，单位 dp。 |
| 顶部栏高度 | `59dp` | Geometry §5.1 | `MEASURED_FROM_04_2` | `x13 y43 width364 height59`。 |
| 底部控制层高度 | `346dp`，底距 `10dp` | Geometry §6.1 | `MEASURED_FROM_04_2` | 四角全部保留圆角。 |
| 章节进度区高度 | `97dp`；轨道为区域高 `3.85%` | Geometry §7.1/§8.2 | `MEASURED_FROM_04_2` | 屏幕底边无额外细进度条。 |
| 快捷区高度 | `94dp` | Geometry §7.1 | `MEASURED_FROM_04_2` | 模块替换区总高 `200dp`。 |
| 亮度栏尺寸 | `62 × 297dp`；轨道宽为栏宽 `5.97%`；滑块直径为栏宽 `29.85%` | Geometry §7.1/§8.4 | `MEASURED_FROM_04_2` | 固定竖向布局。 |
| 遮罩透明度 | `8%` | Geometry §3 | `DEFINED` | 暖黑 `#11100E`。 |
| 图标尺寸 | 图标槽 `42 × 42dp`；视觉图标 `27dp`；返回图标 `28dp` | Geometry §5.2/§8 | `DEFINED` | SVG 使用 `24 × 24` viewBox。 |
| 按钮间距 | 快捷区三等分；模块导航四等分；章节胶囊间距约按钮宽 `14%` | relative spec §8–§11 | `DEFINED` | 使用父容器比例，不写死屏幕坐标。 |
| 安全区规则 | 状态栏属于页面层；底部安全区由页面外壳吸收；控制层保持 `10dp` 悬浮底距 | Contract §2 / Geometry §6.1 | `DEFINED` | 不把控制层贴到物理屏幕底边。 |

## DARK mode 基础 token 草案

> 用途：仅供 Stitch Initial Draft v0 建立暗色方向，不代表最终开发冻结。正式实现前必须
> 完成真机低亮度、OLED、长时间阅读和无障碍对比度验证。此方案为暖黑纸张体系，不套用
> Material Design 3 默认暗色，不使用高饱和霓虹色。

| Token | DARK v0 | 用途与约束 |
| --- | --- | --- |
| `appBackground` | `#171512` | App 暖黑底，不使用纯黑或蓝黑。 |
| `paperBackground` | `#1D1A16` | 长时间阅读与内容页面的深暖纸张底。 |
| `cardBackground` | `#24201B` | 卡片与列表分组表面。 |
| `elevatedSurface` | `#2B2620` | 弹窗、菜单和高层表面。 |
| `primaryText` | `#E7E0D6` | 主标题与正文；避免刺眼纯白。 |
| `secondaryText` | `#B8AFA4` | 说明、元信息。 |
| `tertiaryText` | `#8F877E` | 弱提示；不得用于长正文。 |
| `divider` | `#3B352E` | 暖灰分隔线和边框。 |
| `accent` | `#72AFC4` | 低饱和蓝绿强调色。 |
| `accentSoft` | `#24383D` | 选中、轻高亮背景。 |
| `danger` | `#D38478` | 删除与失败，避免大面积填充。 |
| `success` | `#80A98A` | 成功与可用状态。 |
| `warning` | `#C2A06A` | 警告与待处理状态。 |
| `overlayScrim` | `rgba(5, 4, 3, 0.52)` | 保留底层上下文的遮罩。 |
| `readerPageBackground` | `#1B1814` | 阅读正文页暖黑纸张底。 |
| `readerText` | `#D8D0C4` | 阅读正文；保证低亮度下可读且不使用纯白。 |
| `readerControlSurface` | `#29241E` | 阅读控制层不透明表面。 |
| `readerControlBorder` | `#443C33` | 控制层边界与内部细分隔。 |
| `readerControlShadow` | `rgba(0, 0, 0, 0.38)` | 控制层环境阴影，禁止重黑悬浮感。 |
| `glassOverlayBackground` | `rgba(36, 32, 27, 0.94)` | 仅用于 lightweight overlay；保持接近不透明。 |
| `glassOverlayBlur` | `12dp` | 可用时的背景模糊上限；不可用时直接使用不透明表面。 |
| `selectionHighlight` | `#34484A` | 搜索命中、文本选择与轻选中。 |
| `currentChapterHighlight` | `#302B24` | 当前章节行背景，必须区别于普通行但保持克制。 |

阅读正文必须优先保证 `readerText` 与 `readerPageBackground` 的可读性。状态色只用于图标、
标签和短反馈，不用于正文或大面积背景。
