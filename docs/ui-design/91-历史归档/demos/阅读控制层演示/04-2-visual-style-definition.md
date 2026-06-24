# 04-2 阅读控制层视觉样式定义

> 本文件不再作为当前阅读控制层参数定义源。最新几何与视觉参数以
> `../04-阅读链路/阅读控制层/03-几何规格.md` 为准。

本文保留 `docs/ui-design/04-阅读链路/阅读控制层/图片/03-当前视觉基线.png` 的历史
视觉测量记录，用于追溯图标、字体和颜色来源。

> 说明：原图尺寸为 `834 × 1886`，以下数值按 `390 × 884` 前端画布换算并进行视觉校正。它们是本项目的设计决定，不再由浏览器默认样式决定。

完整布局比例、相对路径、父子锚点、适配规则和验收误差以
`../04-阅读链路/阅读控制层/03-几何规格.md` 为唯一参数源；本文只保留历史视觉参数说明。

## 一、视觉基调

| 项目 | 定义 |
| --- | --- |
| 风格 | 暖纸张、低饱和、黑色粗线图标、浅暖色不透明面板 |
| 阅读正文 | 宋体或衬线字体，笔画清晰，不加粗 |
| 控件文字 | 中文无衬线字体，字重从常规到中等 |
| 图标 | 黑色圆角线性图标，不使用默认 Material、Lucide 或 Emoji |
| 透明度 | 面板、卡片、按钮底、胶囊按钮全部 100% 不透明 |
| 强调色 | 仅用于进度和滑块，不用于普通图标 |

## 二、颜色 Token

颜色必须按用途分开，不能只用一个“黑色”和一个“米色”覆盖全部内容。

| Token | 色值 | 用途 |
| --- | --- | --- |
| `--reader-paper` | `#F8F1E7` | 阅读页纸张底色 |
| `--reader-paper-shadow` | `#EDE2D3` | 纸张纹理与边缘明暗，不作为面板背景 |
| `--surface-primary` | `#FFFCF7` | 顶部栏、底部控制层主体 |
| `--surface-secondary` | `#FFFCF8` | 快捷区、章节区、工具栏、亮度栏 |
| `--surface-icon` | `#F4F2ED` | 图标按钮底 |
| `--surface-pill` | `#FAF6EF` | 上一章、下一章按钮 |
| `--text-primary` | `#11100E` | 标题、正文、按钮文字、图标 |
| `--text-secondary` | `#585149` | 顶部状态、副标题、辅助信息 |
| `--text-muted` | `#756C62` | 弱提示、百分比等次要信息 |
| `--icon-primary` | `#0D0D0C` | 所有普通图标 |
| `--icon-secondary` | `#4E4943` | 非当前状态的弱图标，仅在需要弱化时使用 |
| `--border-outer` | `#D5C8B8` | 顶部栏和底部控制层外边框 |
| `--border-inner` | `#E5DACB` | 内部卡片、图标按钮、胶囊边框 |
| `--track-inactive` | `#DED8CE` | 未完成进度、亮度轨道 |
| `--accent-blue` | `#087EAD` | 章节进度和亮度已完成部分 |
| `--drag-handle` | `#B9B0A4` | 控制层顶部拖拽条 |

### 颜色使用规则

- 图标和主要文字使用同一深色系，但图标固定为 `--icon-primary`，不直接继承正文颜色。
- 正文、标题、操作文字不能使用纯黑 `#000000`。
- 图标按钮底色应偏暖灰白，不使用偏绿或偏蓝灰。
- 进度蓝只用于进度轨道、滑块和必要选中状态。
- 阴影可以带透明度；所有实体背景必须使用不透明十六进制色值。

## 三、字体系统

### 字体族

| 类型 | 字体栈 |
| --- | --- |
| 阅读正文 | `"Songti SC", "STSong", "Noto Serif CJK SC", serif` |
| 控件文字 | `"PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif` |
| 拉丁文字图标 | `"Helvetica Neue", "Arial", sans-serif` |

### 字体层级

| Token | 字号 | 字重 | 行高 | 颜色 | 使用位置 |
| --- | --- | --- | --- | --- | --- |
| `reader-status` | `14px` | `400` | `20px` | `--text-secondary` | 顶部章节弱信息、时间 |
| `reader-body` | `18px` | `400` | `36px` | `--text-primary` | 阅读正文 |
| `top-title` | `20px` | `600` | `24px` | `--text-primary` | 顶部书名 |
| `top-subtitle` | `13px` | `400` | `18px` | `--text-primary` | 书源与章节 |
| `top-action-label` | `13px` | `400` | `18px` | `--text-primary` | 换源 |
| `quick-label` | `14px` | `400` | `20px` | `--text-primary` | 搜索、自动翻页、替换 |
| `chapter-title` | `18px` | `600` | `24px` | `--text-primary` | 第 32 章 雨夜 |
| `pill-label` | `13px` | `400` | `18px` | `--text-primary` | 上一章、下一章 |
| `progress-label` | `13px` | `400` | `18px` | `--text-secondary` | 本章 38% |
| `toolbar-label` | `14px` | `400` | `20px` | `--text-primary` | 目录、朗读、界面、设置 |
| `brightness-title` | `14px` | `500` | `20px` | `--text-primary` | 亮度 |
| `system-label` | `14px` | `400` | `20px` | `--text-primary` | 系统 |
| `aa-icon` | `23px` | `400` | `28px` | `--icon-primary` | 界面图标 |
| `system-a` | `22px` | `400` | `28px` | `--text-primary` | 系统亮度圆形按钮 |

### 字体规则

- 所有控件文字的字间距固定为 `0`。
- 中文正文不使用浏览器合成粗体。
- 顶部书名和章节标题使用 `600`，不使用 `700`。
- 控件标签统一 `400`，不得因为按钮类型不同出现粗细差异。
- `Aa` 是图标，不继承工具栏标签字号。

## 四、图标系统

### 通用规则

| 属性 | 定义 |
| --- | --- |
| 图标颜色 | `#0D0D0C` |
| SVG 画布 | `24 × 24` |
| 图标槽 | 快捷区与工具栏统一 `42 × 42px` |
| 图标槽底色 | `#F4F2ED` |
| 图标槽边框 | `1px solid #E5DACB` |
| 图标槽圆角 | `10px` |
| 端点 | `stroke-linecap: round` |
| 连接 | `stroke-linejoin: round` |
| 缩放 | 禁止通过 CSS 非等比缩放 |
| 填充 | 仅播放三角、目录圆点和更多菜单圆点允许填充 |

### 描边与视觉尺寸

不能给所有图标套用同一个实际描边。应按图形密度校正，使最终视觉重量一致。

| 图标 | SVG 显示尺寸 | 描边 | 特殊规则 |
| --- | --- | --- | --- |
| 返回 | `28 × 28px` | `2.4px` | 箭杆和箭头同粗，不使用超长箭杆 |
| 换源 | `25 × 25px` | `2.2px` | 两条交叉路径，箭头清楚但不拥挤 |
| 更多 | `25 × 25px` | 无描边 | 三个实心圆，圆点直径约 `3.8px` |
| 搜索 | `27 × 27px` | `2.3px` | 圆环和手柄同粗 |
| 自动翻页 | `27 × 27px` | `2.2px` | 单一缺口圆环，播放三角实心 |
| 替换 | `27 × 27px` | `2.2px` | 上下回转箭头，不画成四边形循环 |
| 目录 | `27 × 27px` | `2.2px` | 横线圆角；圆点直径约 `3px` |
| 朗读 | `27 × 27px` | `2.4px` | 五根声波线，中间最高；线距一致 |
| 设置 | `27 × 27px` | `2.3px` | 六边形外框 + 中心圆 |
| 太阳 | `27 × 27px` | `2.0px` | 中心圆与八条短射线，避免过粗 |

### 图标视觉边界

- 图标形状的有效内容应落在 `2px` 至 `22px` 的 SVG 安全区内。
- 搜索、设置、自动翻页属于封闭轮廓，视觉尺寸可比声波小约 `1px`。
- 朗读声波属于稀疏图形，允许横向内容宽度比其他图标窄 `2px`，但高度必须一致。
- 太阳射线不能贴近图标槽边缘。
- 所有图标默认使用同一颜色，不根据功能使用不同颜色。

## 五、控件内容颜色

| 内容 | 背景 | 文字/图标 | 边框 |
| --- | --- | --- | --- |
| 顶部控制栏 | `--surface-primary` | `--text-primary` / `--icon-primary` | `--border-outer` |
| 底部控制层 | `--surface-primary` | `--text-primary` | `--border-outer` |
| 快捷功能区 | `--surface-secondary` | `--text-primary` | `--border-inner` |
| 章节进度区 | `--surface-secondary` | `--text-primary` | `--border-inner` |
| 底部工具栏 | `--surface-secondary` | `--text-primary` | `--border-inner` |
| 亮度栏 | `--surface-secondary` | `--text-primary` / `--icon-primary` | `--border-inner` |
| 图标按钮 | `--surface-icon` | `--icon-primary` | `--border-inner` |
| 章节胶囊 | `--surface-pill` | `--text-primary` | `--border-inner` |
| 未完成轨道 | `--track-inactive` | - | 无 |
| 已完成轨道 | `--accent-blue` | - | 无 |

## 六、实现约束

- 不允许使用 `currentColor` 让图标意外继承弱文字颜色；普通图标应明确指定 `--icon-primary`。
- 不允许使用全局统一 `stroke-width` 覆盖全部 SVG。
- 每个图标应有独立 class，例如 `.icon-search`、`.icon-sun`，只在必要处校正描边。
- 字号、字重、颜色必须由语义 class 决定，不由父容器默认值决定。
- 控件文字不得使用宋体；阅读正文不得使用无衬线字体。
- 颜色不得使用 `opacity` 或半透明背景模拟。

## 七、调整顺序

1. 先替换颜色 Token。
2. 再冻结字体族、字号、字重和行高。
3. 为每个 SVG 添加语义 class，并分别设置描边。
4. 最后做位置和留白微调。
5. 每次调整后与 `04-2-reader-controls-opaque-icon-aligned.png` 并排检查，不再同时修改多个视觉维度。
