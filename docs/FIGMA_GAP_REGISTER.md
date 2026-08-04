# Figma 缺口登记与未阻塞的前端执行流程

记录日期：2026-08-04  
唯一视觉来源：[Reader UI - Phase 2 Design System](https://www.figma.com/design/klhs2jMM4MncaJFqZMfqEK)  
本次依据：对 `25 · Motion Reference`、`27 · Interaction Playground`、`15 · Reader 2` 的只读 Plugin API 检查。

## 1. 使用规则

本文件只登记当前实时 Figma 中的缺口、暂停边界和工作顺序；它不是设计稿、导出物、Token、生成输入或第二视觉来源。

- 可见页面、组件、状态、素材、响应式规则和动效轨迹，只有 Figma 可以定义或补齐。
- Reader Core 定义正文、章节、搜索、书源、同步、阅读位置与持久化；HarmonyOS Host 定义文件、网络、存储和系统能力。
- 本地不得用默认样式、通用动效、示例像素或其他端实现补齐 Figma 缺口。
- 缺口关闭后，必须重新读取相应 Figma 节点；本文件只能更新登记结果，不能替代重新读取。

## 2. 当前 Figma 缺口与暂停范围

| 编号 | 现有实时 Figma 证据 | 缺失内容 | 暂停范围 | 必须由谁决定/补齐 |
| --- | --- | --- | --- | --- |
| `M-RESP-01` | MR1 的正式轨迹是 Phone 390×844：`1247:28`、`1247:489`、`1247:627`、`1247:1275`；五种翻页节点也都是 Phone 390×844。 | 没有 TabletExpanded 的起点、终点、过渡轨迹或明确的跨尺寸映射规则。 | 所有非零动效的 Tablet 实现；五种翻页的多端交付。 | Figma 补 TabletExpanded 动效，或明确写入可复用的相对/约束规则。 |
| `M-PANEL-01` | `reader.panel.expand`/`collapse` 有正式目标与时长：420ms/360ms；现有动画分别是 Review J 0.7s、Review K 4.0s。 | 没有与正式时长对应的逐轨关键帧、相位和缓动。 | 阅读面板展开/收起动画。静态起止状态可以实现。 | 由 Figma 将 Review 轨迹明确提升为生产轨迹，或补正式关键帧。 |
| `PT-INPUT-01` | `3342:10564`、`3342:10588`、`3391:10526`、`3391:10546`、`3394:10546` 都有时间线，但当前节点树没有 prototype reaction。 | 用户触发方式、拖动进度、阈值、半程取消/回弹、提交时刻、反向翻页和重排恢复时的可见状态。 | 全部 `reader.page.turn.*` 前端实现。 | Figma 定义可见交互合同；Core/Host 另行实现实际阅读位置持久化。 |
| `PT-SLIDE-COVER-01` | slide：`3391:10526`，720ms、Phone、next、`review-only`；cover：`3391:10546`，720ms、Phone、next、fixed-z、`review-only`。 | previous、手势中间态、取消、Tablet，以及从 `review-only` 升格为生产规则的决定。 | slide 与 cover。 | Figma/产品决定后补齐。不得由本地反推反向或拖动轨迹。 |
| `PT-SIMULATION-01` | `3394:10546` 是 13 帧、2 秒的 `WebGL sample`/video replay，且仅 next。 | 可随真实正文变化的 3D 渲染模型、输入进度、反向/取消、Tablet，以及是否要真实 3D 而非回放。 | simulation。 | Figma/产品先确定目标；HarmonyOS 再评估平台实现能力。 |
| `M-REVIEW-01` | AutoPage/TTS session、书架视图切换、Dropdown、阅读进入等目前只有名为 `Review` 的时间线。MR1 正式 Motion Contract 只有六项：control show/hide、quick promote、module switch、panel expand/collapse。 | 对应生产 MotionId、状态、时长、缓动、Reduced 规则和多端定义。 | 上述 Review 动效；页面的静态终态与业务流程不暂停。 | Figma 补生产 Motion Contract，或产品明确不交付该动效。 |

### 2.1 已定义但仅限 Phone 的正式阅读控制动效

以下项目不是设计缺失，但受 `M-RESP-01` 限制：可按 Figma 在 Phone 实现，不能被宣称为多端完成。

| MotionId | 生产定义 | 运行规则 |
| --- | --- | --- |
| `reader.control.show` | 420ms、ease-out；顶部栏 `-8 → 0`、控制栏 `+18 → 0`，均由透明到可见。 | latest action wins；Reduced 为 0ms 并提交 shown。 |
| `reader.control.hide` | 360ms、ease-in；show 的反向轨迹。 | 恢复热区；Reduced 为 0ms 并提交 hidden。 |
| `reader.quick.promote` | 320ms、ease-out；Search Quick `+12 → 0`、由透明到可见。 | 不重排正文；Reduced 为 0ms 并提交目标面板。 |
| `reader.module.switch` | 360ms、ease；Directory 淡出、TTS 淡入。 | 导航固定；Reduced 为 0ms 并提交 active module。 |

Figma 的 Motion Reference 为审阅而循环播放；原生实现必须在一次用户事件中播放一次，不能把预览循环当成产品循环。

### 2.2 翻页节点当前的视觉事实

- `scroll`：连续正文条使用 Page 15 的 PaperLayer/正文样式；`0 → -599 → 0` 是 Phone 审阅演示，不是可写死的运行时滚动距离。
- `none`：两个稳定 ReadingSurface 在 Figma 中以 HOLD 切换；产品视觉定义是 `0ms 瞬切`，不是 2 秒循环。
- `slide`：旧页 `0 → -388`，新页 `+388 → 0`，overlap 2，720ms。
- `cover`：新页固定在下层，旧页上层 `0 → -390`，带 edge shadow，720ms。
- `simulation`：视频/样本帧回放，不等于真实正文的原生 3D 翻页。

这些事实只可用于未来的实现对照；在上表缺口关闭前，不得生成任何翻页替代效果。

## 3. 不受上述 Figma 缺口阻塞的前端流程

以下顺序是完整 HarmonyOS 前端的实施顺序，不是先做静态页面、以后再补业务。每一批都必须同时完成 Figma 静态终态、页面状态、Core 命令接线和该批所需 Host 能力。

### 阶段 A：最小应用脊柱

在 `Reader-for-HarmonyOS` 建立正常应用所需的入口、导航入口、唯一的 Reader-Core runtime 生命周期入口，以及集中注册的 Host capability 入口。

这不是路由框架、状态管理平台或生成器。页面不得自行创建 Core runtime，也不得自行处理 Core 协议。

### 阶段 B：书架到阅读入口

按 `23 · Pages · Final` 的 Bookshelf、Book Detail、相关导入终态和 `15 · Reader 2` 的静态 ReadingSurface，实现：书籍列表、详情、目录、章节正文进入阅读面。

Phone 与 TabletExpanded 都要实现。当前不实现翻页动效，但必须接入真实书籍、章节与阅读位置，而不是固定演示文本。

### 阶段 C：阅读正文与排版设置

实现 Phone/Tablet 的 PaperLayer、标题与正文、动态正文测量、重新分页、Unicode 阅读位置恢复，以及阅读控制的静态终态。

完整设置页中的“首行缩进”使用 Figma 已有的三项选择：`不缩进`、`单字缩进`、`双字缩进`。运行时分别按无缩进、1em、2em 计算，随当前字号重排；不得写死 Figma 演示视口中的像素值。

在动效暂停期间，控制显示、Quick/Module/Full 面板只实现最终可见状态和真实业务行为；不播放未解锁的动画。

### 阶段 D：其余最终页面与真实流程

依次实现 Figma Final 中的 Search、Discover、RSS、Settings、Source Management、Source Switch、Sync/Backup/Restore，以及各自的 loading、empty、error、confirm 等已画状态。

每条流程只增加它确实需要的 Core 命令和 Host capability；不因复用方便而新建通用页面引擎、设计系统或跨端抽象。

### 阶段 E：响应式与运行验收

按 Figma 的 Phone/Tablet 组件变体和约束验证静态布局、文本度量、真实状态、导航和阅读恢复。验收使用节点属性、原生布局树、文字度量和事件/状态结果；不使用截图作为结论。

### 阶段 F：按缺口逐项恢复动效

只有当某一条 `M-*` 或 `PT-*` 缺口被 Figma 补齐并由你确认后，才重新读取该节点并解锁对应局部：

1. Phone 已完整定义的四个阅读控制动效可先单独恢复；Tablet 仍须等待 `M-RESP-01`。
2. panel expand/collapse 在 `M-PANEL-01` 关闭后恢复。
3. 五种翻页在 `PT-INPUT-01`、`M-RESP-01` 及其模式专属缺口关闭后恢复。
4. 其余 Review 动效在 `M-REVIEW-01` 关闭后恢复。

## 4. 每次前端改动的防越界检查

每项实现开始前必须写明：本次 Figma 节点、目标页面/状态、所用 Core 命令、所需 Host capability 和本次不触碰的暂停项。

出现以下任一情况即停止该局部，不补画、不改 Figma、不写默认视觉：

- Figma 没有可见元素、状态、素材、响应式规则或动效轨迹；
- 需要从 Phone 轨迹推断 Tablet 轨迹；
- 需要从 next 推断 previous、拖动、取消或提交过程；
- 需要把 Review 时间线、演示像素或示例内容提升为生产规则。
