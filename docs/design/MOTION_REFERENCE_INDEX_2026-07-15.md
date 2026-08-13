# Reader Motion Reference Index

状态：MR1 控制层 F3 证据已补齐，待用户确认审查节奏；MR2 Review Batch 进行中，十个核心家族尚未闭环
日期：2026-07-22
静态输入：[`15 · Reader 2`](https://www.figma.com/design/klhs2jMM4MncaJFqZMfqEK?node-id=1023-17636)  
动效参考：[`25 · Motion Reference / MR1 · Reader Control Layer`](https://www.figma.com/design/klhs2jMM4MncaJFqZMfqEK?node-id=1247-2)

## 边界

- `15 · Reader 2` 继续作为 Reader 控制层静态视觉唯一输入源；MR1 没有修改其中的 canonical components。
- `25 · Motion Reference` 只实例化 Reader 2 已有主件，定义关键帧、层级和节奏；它不是页面结构或运行时状态的权威源。
- Motion Contract 负责 MotionId、trigger、from/to、duration/easing token、interrupt、finalState、cleanup 和 reduced-motion。
- `frontend-demo-optimized/` 负责可执行状态、连续操作、打断、响应式与 reduced-motion 验证。

## MR1 样板

| MotionId | Figma timeline frame | 静态起止输入 | 时长 / 缓动 | 关键视觉规则 |
| --- | --- | --- | --- | --- |
| `reader.control.show` | `1247:28` | ReadingSurface + TopBar + ControlDock | 420ms / ease-out | 正文固定；TopBar 8px、Dock 18px 轻位移进入 |
| `reader.control.hide` | `1247:489` | ReadingSurface + TopBar + ControlDock | 360ms / ease-in | 正文固定；TopBar 与 Dock 退出后恢复沉浸热区 |
| `reader.quick.promote` | `1247:627` | ControlHome -> Search quick state | 320ms / ease-out | 快捷面板 12px 轻位移进入；不触发正文重排 |
| `reader.module.switch` | `1247:1275` | Directory -> TTS module state | 360ms / ease | 模块内容交叉淡化；底部 ModuleNav 几何不移动 |
| `reader.panel.expand` | `1505:16662`（Review J；MR1 规格 `2672:49089`） | Quick panel -> Full panel | 420ms / ease-out | Review J 的 0.7s 仅供人工审查；正文、焦点、route 与终态以 Contract 为准 |
| `reader.panel.collapse` | `1505:17003`（Review K；MR1 规格 `2672:49094`） | Full panel -> Quick panel | 360ms / ease-in | Review K 的 4.0s 仅供人工审查；反向动作立即接管到最新终态 |

四个 timeline 已写入可编辑的 Figma Motion Opacity / Position tracks；本轮 Contract / 本地 demo 可观察性校准后的 canonical duration 分别为 `0.42 / 0.36 / 0.32 / 0.36s`，Figma timeline 也必须按本表同步后才能作为同一轮节奏参考。Figma 静态截图只验证 resting composition；动态正确性必须继续由本地 harness 与实际播放验证。

2026-07-22 的 MR1 补充只修改 `25 · Motion Reference`，未触碰 `15 · Reader 2` 静态组件：新增 panel expand/collapse 规格卡，并在 Review J/K 的既有关键帧 storyboard 中标明 Contract、反向动作打断、最终 settle 和 reduced-motion 同终态。Production token 与 Review 计时明确分开：J=`0.7s`、K=`4.0s` 为审查节奏，不替代 `420ms` / `360ms` 的 canonical runtime token。Figma `export_video` 已成功渲染 Review A 与 Review J；导出文件为短期审查产物，不能代替可追溯的本地/设备媒体证据。

本地样板由 `reader-control-transition.js` 统一承接，并复用 `motion-controller.js` 的 canonical duration / easing。控制层过渡只拥有 TopBar、BottomSheet 和 ModuleNav；`ReadingSurface` 不进入 outgoing / incoming clone，也不参与位移或重排。

## Live Review Batch（2026-07-16）

当前 `25 · Motion Reference` live page 共包含 21 个 Review artifact：

| 范围 | Review | 当前结构化状态 |
| --- | --- | --- |
| Reader control / session | A、B Show、B Hide、C、D、E、F | 手工关键帧 |
| Bookshelf / reader entry | G、H、R | 手工关键帧；R 当前只有进入方向 |
| TTS timer | I | 手工关键帧 |
| Quick / Full panel | J、K、L、M、N、O、P、Q | N 为手工关键帧；J/K/L/M/O/P/Q 主要依赖 Motion Style |
| Dropdown | J1、J2 | 手工 height / rotation 关键帧 |

汇总为 14 个手工关键帧 artifact、7 个 Motion Style 主导 artifact。轨道或 Style 存在只证明结构可编辑，不证明实际播放已经验收；通用 Route/Tab、翻页/章节跳转、直接操控手势、Overlay/Keyboard/换源、完整 orientation/interrupt/reduced-motion storyboard 仍需继续闭环。

## 验收场景

每条样板至少覆盖：

1. normal：单次动作到唯一终态。
2. redirect：执行中触发新目标，旧 transaction 被接管。
3. opposite action：show/hide 或快速 A->B->C，最终状态以最后输入为准。
4. reduced-motion：启动前或运行中开启时立即提交同一终态，时长为 0ms。
5. responsive：Phone、CompactLandscape、TabletExpanded 下正文 rect 不因控制层动效变化。

## 2026-07-15 自验结果

| 画布 | viewport class | normal | interrupt / opposite | reduced-motion | 正文与控制层终态 |
| --- | --- | --- | --- | --- | --- |
| 390×844 | `standard-portrait` | show / hide / promote / module / expand / collapse 通过 | latest-wins 与 A→B→C 通过 | 立即提交唯一终态 | reading rect 稳定；role / clone 归零；单一 panel / nav |
| 844×390 | `compact-landscape` | 同上 | 同上 | 同上 | reading rect 稳定；控制层仅悬浮，不切分正文 |
| 760×960 | `tablet-expanded` | 同上 | 同上 | 同上 | reading rect 稳定；控制层仅悬浮，不改变分页宽度 |

顶栏返回层级已经实页验证为：主完整控制页先执行 `reader.panel.collapse` 回到对应快捷栏；再次返回执行 `reader.control.hide` 回到沉浸阅读。Control / Module / Replace 的 route-bearing 抓手和主完整页收起入口也已统一接入 panel 事务，不再只触发 handle release 后瞬时换页。自动化回归、canonical Motion fixture coverage 95/95 与 demo contract consistency unknown MotionId=0 共同作为门禁；实时用例总数以测试输出为准。

## 当前限制

当前 connector 已暴露 `export_video`，可对顶层 review frame 生成短期 MP4 审查产物；它证明 Figma timeline 可渲染，但不替代可追溯的 demo/browser 或设备媒体证据。Figma timeline 的节点、动画样式和 duration 已结构化读取验证；MR1 仍须由用户确认节奏，MR2/MR3/MR4/MR5 的缺口不因此关闭。
