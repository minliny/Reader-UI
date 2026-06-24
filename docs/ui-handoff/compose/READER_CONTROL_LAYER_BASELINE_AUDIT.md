# Reader Control Layer Baseline Audit

## 1. 总体结论

READER_CONTROL_LAYER_BASELINE_NOT_READY

核心原因：快捷弹窗和底栏弹窗的覆盖规则与基线严重不符 — 当前为全屏 opaque overlay，基线要求分层定位弹窗，仅覆盖正文区域并保留外围控件可见。

## 2. 当前实现与基线差距表

### 2.1 顶部第一行：返回 / 居中书名 / refresh / swap_horiz / more_vert

| 基线要求 | 当前实现 | 判定 |
|----------|----------|------|
| 返回按钮 | `Icons.AutoMirrored.Filled.ArrowBack` + IconButton | 匹配 |
| 居中书名 | `Text(bookTitle, textAlign = TextAlign.Center, weight(1f))` + heading semantics | 匹配 |
| refresh | `Icons.Filled.Refresh` + IconButton | 匹配 |
| swap_horiz | `Icons.Filled.SwapHoriz` + IconButton | 匹配 |
| more_vert | `Icons.Filled.MoreVert` + IconButton | 匹配 |

**结论**: 匹配。`ReaderControlBase.kt:146-180`

### 2.2 顶部第二行：当前章节 / 本地书籍描边 chip

| 基线要求 | 当前实现 | 判定 |
|----------|----------|------|
| 当前章节 | `Text(chapterTitle)` maxLines=1 | 匹配 |
| 本地书籍描边 chip | `Text(sourceName)` with `clip+background+border` chip style | 匹配 |

**结论**: 匹配。`ReaderControlBase.kt:181-212`

### 2.3 正文：章节标题 + 正文内容，不能被控制层遮挡

| 基线要求 | 当前实现 | 判定 |
|----------|----------|------|
| 正文内容 | `Text(text)` with `readerBody` style, `verticalScroll` | 匹配 |
| 不被遮挡 | `padding(horizontal = 24.dp, vertical = 128.dp)` 固定值 | P2 |
| 章节标题在正文区 | **缺失** — 正文区只渲染 body text，无章节标题 | P1 |

**结论**: 正文存在，但缺少正文区章节标题，且 padding 为固定值而非计算值。`ReaderScreen.kt:120-131, 170-182`

### 2.4 左侧亮度条：自动亮度图标 / 竖向 slider / 圆润左右停靠箭头

| 基线要求 | 当前实现 | 判定 |
|----------|----------|------|
| 自动亮度图标 | `Icons.Filled.BrightnessAuto` 顶部 20dp | 匹配 |
| 竖向 slider | **缺失** — 当前为静态 `fillMaxSize()` Box，非 `Slider` 组件，无 `onValueChange`、无 thumb | P1 |
| 圆润左右停靠箭头 | `ChevronRight`/`ChevronLeft` + CircleShape wrapper | 匹配 |
| 左右停靠切换 | `BrightnessDock.Left`/`Right` enum，`Modifier.align(CenterStart/CenterEnd)` | 匹配 |

**结论**: 视觉效果正确，但非交互式 slider，当前为静态 100% 亮度占位。`ReaderControlBase.kt:222-263`

### 2.5 底部三层

#### 第一层：四个圆形快捷图标，无文字标签

| 基线要求 | 当前实现 | 判定 |
|----------|----------|------|
| 搜索 | `Icons.Filled.Search` + contentDescription "搜索本章" | 匹配 |
| 自动翻页 | `Icons.Filled.AutoMode` + contentDescription "自动翻页" | 匹配 |
| 内容替换 | `Icons.Filled.SwapHoriz` + contentDescription "内容替换" | P2（与顶栏换源图标相同） |
| 夜间模式 | `Icons.Filled.DarkMode` + contentDescription "切换夜间模式" | 匹配 |
| 无文字标签 | `ReaderQuickCircle` 不含 `Text(` composable，测试验证通过 | 匹配 |
| 圆形样式 | `CircleShape`, `quickCircleSize=48.dp`, `quickCircleGap=20.dp` | 匹配 |

**结论**: 匹配（SwapHoriz 复用为 P2）。`ReaderControlBase.kt:265-298`

#### 第二层：浮动页内控制条

| 基线要求 | 当前实现 | 判定 |
|----------|----------|------|
| 本章内上一页 | `Icons.Filled.ChevronLeft` + IconButton | 匹配 |
| 本章进度 | `LinearProgressIndicator` with `progress.coerceIn(0f,1f)` | 匹配 |
| 本章内下一页 | `Icons.Filled.ChevronRight` + IconButton | 匹配 |
| 浮动样式 | `floatingControlBg` + `controlBorder` + `floatingControl` shape | 匹配 |

**结论**: 匹配。`ReaderControlBase.kt:300-352`

#### 第三层：固定阅读页底栏

| 基线要求 | 当前实现 | 判定 |
|----------|----------|------|
| 目录 | `Icons.Filled.MenuBook` + "目录" | 匹配 |
| 朗读 | `Icons.Filled.RecordVoiceOver` + "朗读" | 匹配 |
| 界面 | `Icons.Filled.Tune` + "界面设置" | P2（标签差异：基线"界面"，实现"界面设置"） |
| 设置 | `Icons.Filled.Settings` + "阅读行为设置" | P2（标签差异：基线"设置"，实现"阅读行为设置"） |

**结论**: 结构匹配，标签微调为 P2。`ReaderControlBase.kt:354-398`

### 2.6 快捷弹窗规则

| 基线要求 | 当前实现 | 判定 |
|----------|----------|------|
| 隐藏亮度条 | **未实现** — overlay 全屏 opaque 覆盖，但非显式隐藏 | P0 |
| 保留快捷按钮 | **未实现** — 被全屏 overlay 遮挡 | P0 |
| 保留页内控制条 | **未实现** — 被全屏 overlay 遮挡 | P0 |
| 保留底栏 | **未实现** — 被全屏 overlay 遮挡 | P0 |
| 弹窗覆盖顶栏下方到快捷按钮上方的正文区域约 3/4 | **未实现** — 使用 `Modifier.fillMaxSize()` 全屏覆盖 | P0 |

**当前行为**: `ReaderSearchOverlay`/`ReaderAutoScrollOverlay`/`ReaderReplaceOverlay` 均通过 `Modifier.fillMaxSize()` 渲染为全屏 opaque panel。`ReaderQuickActionPanel` 虽有 `padding(horizontal = 18.dp)`，但 `fillMaxSize()` 确保覆盖全部区域。

**源码位置**: `ReaderScreen.kt:204-228`, `ReaderQuickActionOverlay.kt:389-431`

**结论**: P0 — 结构与基线完全不符。`ReaderControlBase` 不接收 overlay 状态，无 sub-component 显隐逻辑；overlays 不进行 Zone 定位。

### 2.7 底栏弹窗规则

| 基线要求 | 当前实现 | 判定 |
|----------|----------|------|
| 隐藏亮度条 | **未实现** — 同样被全屏 overlay 遮挡 | P0 |
| 隐藏快捷按钮 | **未实现** — 同样被全屏 overlay 遮挡 | P0 |
| 隐藏页内控制条 | **未实现** — 同样被全屏 overlay 遮挡 | P0 |
| 保留顶栏 | **未实现** — 被全屏 overlay 遮挡 | P0 |
| 保留底栏 | **未实现** — 被全屏 overlay 遮挡 | P0 |
| 弹窗覆盖顶栏与底栏之间正文区域约 3/4 | **未实现** — 使用 `Modifier.fillMaxSize()` 全屏覆盖 | P0 |

**当前行为**: `ReaderDirectoryOverlay`/`ReaderTtsOverlay`/`ReaderAppearanceOverlay`/`ReaderSettingsOverlay` 均通过 `Modifier.fillMaxSize()` 渲染为全屏 opaque panel。

**源码位置**: `ReaderScreen.kt:231-285`, `ReaderBottomFunctionOverlay.kt:484-502`

**结论**: P0 — 结构与基线完全不符。`ReaderControlBase` 无 overlay-aware sub-component 显隐；`ReaderBottomPanel` 无法约束 overlay 到限定区域。

### 2.8 目录页

| 基线要求 | 当前实现 | 判定 |
|----------|----------|------|
| 顶部目录/书签 tabs | "目录"+"书签" segmented tabs | 匹配 |
| 左上层级小字 | **缺失** — 仅 indentation 缩进，无 level 文字标签 | P1 |
| 章节缩进 | `(entry.level - 1) * 10` dp 缩进 | 匹配 |
| 右侧常驻进度条 | **缺失** — `TocEntry.progress` 字段存在但未渲染 | P1 |
| 书签标识 | `Icons.Filled.ChevronRight` 蓝色图标 | 匹配 |
| 当前阅读章节标识 | `Icons.Filled.MyLocation` + `isCurrent` 高亮背景 | 匹配 |
| 底部当前阅读章节 | `"当前阅读章节：$currentChapter"` | 匹配 |

**结论**: 结构基本匹配，缺层级文字和进度条。`ReaderBottomFunctionOverlay.kt:67-173`

### 2.9 界面页

| 基线要求 | 当前实现 | 判定 |
|----------|----------|------|
| 文字 | AppGroup("文字"): 字体, 字号, 字距, 繁简 | 匹配 |
| 段落 | AppGroup("段落"): 缩进, 行距, 段距 | 匹配 |
| 界面 | AppGroup("界面"): 信息, 翻页动画, 主题 | 匹配 |

**结论**: 匹配。`ReaderBottomFunctionOverlay.kt:334-406`

### 2.10 设置页

| 基线要求 | 当前实现 | 判定 |
|----------|----------|------|
| 阅读行为设置 | "设置" + "阅读行为" subtitle | 匹配 |
| 不包含 WebDAV | ✓ 无 WebDAV 内容 | 匹配 |
| 不包含书源 | ✓ 无书源管理 | 匹配 |
| 不包含 RSS | ✓ 无 RSS | 匹配 |
| 不包含关于 | ✓ 无关于 | 匹配 |

**结论**: 匹配。`ReaderBottomFunctionOverlay.kt:409-480`

## 3. P0：结构错误、显隐规则错误、模块混淆

| ID | 描述 | 源码位置 |
|----|------|----------|
| P0-1 | **快捷弹窗全屏覆盖**：搜索/自动翻页/内容替换 overlay 使用 `Modifier.fillMaxSize()` opaque 全屏，应定位在顶栏第二行下方到快捷按钮上方约 3/4 区域 | `ReaderScreen.kt:204-228`, `ReaderQuickActionOverlay.kt:389-431` |
| P0-2 | **底栏弹窗全屏覆盖**：目录/朗读/界面/设置 overlay 同样 `fillMaxSize()` 全屏 opaque，应定位在顶栏与底栏之间约 3/4 区域 | `ReaderScreen.kt:231-285`, `ReaderBottomFunctionOverlay.kt:484-502` |
| P0-3 | **ReaderControlBase 无 overlay-aware 显隐**：`ReaderControlBase` 不接收 overlay 状态参数，无法在快捷弹窗时隐藏亮度条、在底栏弹窗时隐藏亮度条+快捷按钮+页内控制条 | `ReaderControlBase.kt:53-131` |

## 4. P1：布局、层级、遮挡、密度问题

| ID | 描述 | 源码位置 |
|----|------|----------|
| P1-1 | **亮度条为静态视觉占位**：内部 Box 使用 `fillMaxSize()` 始终满亮，缺少 `Slider` 组件、`onValueChange`、thumb | `ReaderControlBase.kt:242-255` |
| P1-2 | **正文区缺少章节标题**：`ReaderScreen` content 区仅渲染 body text，无章节 heading | `ReaderScreen.kt:120-131` |
| P1-3 | **目录页缺少右侧进度条**：`TocEntry.progress: Float?` 字段存在但 `ReaderDirectoryOverlay` 中未渲染 | `ReaderBottomFunctionOverlay.kt:115-163`, `ReaderRuntimeState.kt:76-82` |
| P1-4 | **目录页缺少层级小字**：仅有 `(entry.level - 1) * 10` dp 缩进，无 level 数字/文字标签 | `ReaderBottomFunctionOverlay.kt:115-163` |

## 5. P2：颜色、间距、图标、文字细节

| ID | 描述 | 源码位置 |
|----|------|----------|
| P2-1 | **SwapHoriz 图标复用**：顶栏"换源"和快捷按钮"内容替换"均使用 `Icons.Filled.SwapHoriz`，语义混淆 | `ReaderControlBase.kt:177, 279` |
| P2-2 | **底栏标签微调**："界面设置" vs 基线"界面"，"阅读行为设置" vs 基线"设置" | `ReaderControlBase.kt:373-375` |
| P2-3 | **正文 padding 固定值**：`vertical = 128.dp` 硬编码，非从 top bar(56+36)+bottom bars 计算 | `ReaderScreen.kt:124` |

## 6. 是否建议重构

**建议按阅读页控制层基线重构，不建议继续小修小补。**

理由：
1. P0 覆盖了 overlay 定位系统和 ReaderControlBase sub-component 显隐逻辑两大核心模块，属于架构层面问题。
2. 当前 `ReaderControlBase` 无 overlay 状态感知能力，添加 overlay type 参数会改变其函数签名和内部渲染逻辑。
3. overlay 需从全屏 `fillMaxSize()` opaque 改为 Zone-based 定位（`Modifier.align()` + 约束高度），涉及 `ReaderQuickActionPanel` 和 `ReaderBottomPanel` 的重设计。
4. P1 中的亮度 slider 替换和 TOC 进度条补完属于组件级改动，可与重构同步进行。
5. 当前已有完整的 state model（`ReaderControlLayerState.QuickActionOverlay`/`BottomFunctionOverlay`）和 fixture 体系（`ReaderRuntimeFixture.allNineStates`），重构基础良好。

建议重构路径：
- 在 `ReaderControlBase` 增加 `overlayState: ReaderControlLayerState?` 参数
- 根据 overlayState 控制子组件显隐（`AnimatedVisibility` 或 `if`）
- 将 overlay 从 `ReaderScreen` Box 的后置层改为 `ReaderControlBase` 内部的 Zone-attached 层
- 快捷弹窗：`align(Alignment.TopCenter).padding(top = 92.dp)`，底部约束在 `quickActions` 上方
- 底栏弹窗：`align(Alignment.TopCenter).padding(top = 56.dp, bottom = 68.dp)`，顶部和底部分别留出 top bar 和 bottom bar
