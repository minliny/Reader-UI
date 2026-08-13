# Control Layer Base V2 Layout Audit

## 1. 总体结论

CONTROL_LAYER_BASE_V2_LAYOUT_NOT_READY

## 2. 审计范围

| 项目 | 内容 |
|---|---|
| 实际检查的 screen 名称 | 阅读页控制层基础状态 V2 - 无弹窗 |
| screen ID | 789f3f8b4579471c99dbb7d49d7d2bdc |
| 是否为「阅读页控制层基础状态 V2 - 无弹窗」 | 是，名称精确匹配 |

本轮仅做只读审计，未修改 Stitch 项目，未生成、删除或覆盖任何 screen。

## 3. 总体布局评价

当前 screen 不适合作为基础控制层 handoff。主要问题不是元素缺失，而是垂直层级失效：浮动页内控制条使用了无效的 `bottom-21` 定位类，导致它没有稳定落在底栏上方，截图中实际出现在顶部附近，破坏了“正文 → 快捷方式 → 页内控制条 → 底栏”的控制层顺序。

整体视觉重心偏乱：底部圆形快捷方式和底栏存在，但中间的页内控制条脱离底部控制区；正文区域也不是母版科幻正文，而是《阿长与〈山海经〉》片段，阅读主体感偏弱。当前更像控件散落在阅读页上，而不是一个稳定的阅读 App 控制层。

## 4. 模块位置检查表

| 模块 | 期望位置 | 实际位置 | 是否通过 | 问题描述 | 调整建议 |
|---|---|---|---|---|---|
| 顶部第一行 | 顶部固定，返回在左，书名居中，refresh / swap_horiz / more_vert 在右 | 顶部存在，但返回与“深空信号”被放在同一左侧组 | 否 | 标题不是主标题居中结构，视觉中心偏左 | 使用三段式 top bar：左 48dp、中心 flex-1 居中标题、右等宽图标组 |
| 顶部第二行 | 第一章信息与本地书籍描边 chip 位于顶部第二行 | 存在，位置清楚 | 是 | 无严重问题 | 保持 48dp 左右行高和描边 chip |
| 正文区域 | 顶部栏下方，章节标题“深空信号”与母版科幻正文为主体 | 使用《阿长与〈山海经〉》正文，且整体 opacity 仅 20% | 否 | 正文内容与目标不一致，阅读主体过弱 | 恢复母版科幻正文，正文层不应低到 20% opacity，可用轻遮罩而不是削弱文本本体 |
| 左侧亮度条 | 屏幕左侧中部，避开顶部与底部控制区 | left-4，top-1/2，h-64 | 是 | 位置基本可用，但视觉略重 | 可稍贴边并降低 shadow |
| 四个圆形快捷方式 | 正文下方、页内控制条上方，四个圆形自然横排 | bottom-40，按钮 48px，gap-6 | 部分通过 | 本身横向分布可用，但因页内控制条错位，整体层级不成立 | 与页内控制条一起使用 token 定位，不要单独自由摆放 |
| 浮动页内控制条 | 快捷方式下方、底栏上方的独立胶囊 | `bottom-21` 无效，实际不稳定，截图中出现在顶部附近 | 否 | P0：页内控制条未在底部控制层中，破坏模块顺序 | 改为明确 token，如 `bottom: calc(var(--reader-bottom-bar-height) + 16px)` |
| 控制层底栏 | 固定屏幕底部，目录 / 朗读 / 界面 / 设置等宽 | fixed bottom-0，h-20 | 部分通过 | 底栏存在且对齐基本可用，但高度略厚，视觉权重偏大 | 降到 64-72px，并明确安全区 padding |

## 5. 模块间距检查表

| 间距项 | 期望 | 实际判断 | 是否合理 | 调整建议 |
|---|---|---|---|---|
| 顶部第一行到顶部第二行 | 两行紧密但分层清楚 | 合理 | 是 | 保持 56px + 48px 或统一 token |
| 顶部第二行到正文 | 正文标题自然下移，不贴顶栏 | 偏小且正文缺少标题层 | 否 | 增加正文标题区域，顶部留白 20-24px |
| 正文到底部快捷方式 | 快捷方式不压正文关键文字 | 偏小 | 否 | 增加正文底部安全区，快捷方式与正文末尾至少 24px |
| 快捷方式到浮动页内控制条 | 稳定 12-16px | 不成立 | 否 | 页内控制条定位失效，先修定位，再设 12-16px gap |
| 浮动页内控制条到底栏 | 稳定 12-16px，视觉分离 | 不成立 | 否 | 使用 bottom token 固定在底栏上方 |
| 底栏到底部安全区 | 避让系统安全区 | 未显式表达 | 部分合理 | 增加 bottom safe gap token |
| 亮度条到顶部 | 避开顶部两行 | 合理 | 是 | 保持垂直居中或略下移 8px |
| 亮度条到底部控制区 | 避开底部快捷与底栏 | 偏小风险 | 部分合理 | 亮度条底部应高于快捷方式顶部至少 16px |
| 亮度条到屏幕边缘 | 贴边但不压边 | 合理但略内收 | 是 | 可从 16px 调到 10-12px |

## 6. 四个圆形快捷方式专项检查

四个圆形快捷方式存在，按钮直径为 48px，横向 `gap-6` 分布，大小与点击区一致，整体比文字 row 更接近目标形态。问题在于它们单独以 `bottom-40` 自由定位，没有与页内控制条建立稳定布局关系。

建议：保持 48px 直径，横向 gap 可从 24px 收到 18-20px，使四个入口更紧凑；将其 bottom 位置改为基于页内控制条的 token，例如 `--reader-floating-quick-actions-bottom = --reader-floating-page-control-bottom + --reader-floating-page-control-height + 16px`。当前不建议单独上移或下移，先修复页内控制条定位。

## 7. 浮动页内控制条专项检查

语义上已使用 `chevron_left / chevron_right`，不是 `skip_previous / skip_next`，这一点正确；中间有本章内进度条和拖拽圆点。

但布局不通过：控制条使用 `bottom-21`，这不是当前 Tailwind spacing 中定义的合法 token，导致实际位置不稳定。截图中它出现在顶部附近，而不是底栏上方。该问题直接破坏层级顺序，属于 P0。

建议：控制条宽度 342px 可略缩到 320-328px；高度 56px 基本合理；底部位置应改为 `bottom: calc(var(--reader-bottom-bar-height) + var(--reader-bottom-safe-gap) + 12px)`。

## 8. 控制层底栏专项检查

底栏存在并固定在底部，四项为目录 / 朗读 / 界面 / 设置，图标为 `menu_book / record_voice_over / tune / settings`，无厚重选中态或大色块。四项对齐基本稳定。

问题是底栏高度 `h-20` 为 80px，略厚，且没有明确安全区 token；当页内控制条修回底部后，如果不压缩底栏，底部控制区整体会偏厚。建议降至 64-72px，并用安全区 padding 单独处理。

## 9. 左侧亮度条专项检查

亮度条显示完整：顶部 `brightness_auto`、中间竖向 slider、底部右向箭头。位置为 `left-4 top-1/2 h-64`，避开顶部两行和底栏，未与四个快捷按钮直接冲突。

可优化点：高度 256px 和 shadow 偏重，对正文沉浸有轻微干扰；建议稍贴左边缘，降低阴影和边框存在感，必要时整体下移 8px 避开正文视觉中心。

## 10. 建议布局 token

建议定义或修正以下 token，避免当前模块自由摆放：

- `--reader-top-area-height: 56px`
- `--reader-meta-row-height: 48px`
- `--reader-bottom-bar-height: 68px`
- `--reader-bottom-safe-gap: env(safe-area-inset-bottom, 8px)`
- `--reader-floating-page-control-bottom: calc(var(--reader-bottom-bar-height) + var(--reader-bottom-safe-gap) + 12px)`
- `--reader-floating-page-control-height: 52px`
- `--reader-floating-quick-actions-bottom: calc(var(--reader-floating-page-control-bottom) + var(--reader-floating-page-control-height) + 16px)`
- `--reader-quick-circle-size: 48px`
- `--reader-quick-circle-gap: 20px`
- `--reader-brightness-left: 10px`
- `--reader-brightness-top: 50%`
- `--reader-control-layer-z-index: 50`

当前 screen 看起来没有统一 token，底部模块主要依赖 `bottom-40`、`bottom-21`、`h-20` 等自由值，其中 `bottom-21` 已直接导致布局失效。

## 11. P0 问题

1. 顶部第一行结构错误：书名与返回键同组靠左，没有形成返回 / 居中书名 / 右侧操作的稳定三段式结构。
2. 正文区域不符合目标：缺少章节标题“深空信号”，正文为《阿长与〈山海经〉》片段，不是母版中文科幻正文。
3. 浮动页内控制条定位失效：使用无效 `bottom-21`，实际没有固定在底栏上方。
4. 底部三模块层级不成立：圆形快捷方式、浮动页内控制条、底栏没有形成期望的垂直顺序，截图中页内控制条错位到顶部区域。

## 12. P1 问题

1. 四个圆形快捷方式的横向间距略大，建议从 24px 收敛到 18-20px。
2. 底栏高度 80px 略大，建议降到 64-72px。
3. 亮度条阴影和高度略重，建议稍缩小并降低 shadow。
4. 正文 opacity 20% 过低，阅读主体感不足。
5. 底栏与安全区关系未显式 token 化。
6. 快捷方式与正文底部安全距离不足，需要由 token 统一。
7. handoff 虚线边界略多，影响阅读页沉浸感。

## 13. 是否建议进入本地 normalized HTML

不建议
