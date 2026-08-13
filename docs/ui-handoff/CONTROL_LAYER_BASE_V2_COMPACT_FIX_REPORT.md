# Control Layer Base V2 Compact Fix Report

## 1. 总体结论

CONTROL_LAYER_BASE_V2_COMPACT_FIX_READY

本轮已通过 Stitch MCP 生成并修复新的基础控制层 screen。核心 P0 已修复：四个圆形快捷方式仅保留图标，不再显示「搜索 / 自动翻页 / 内容替换 / 夜间模式」正式文字标签。底部控制区已按 token 几何关系收紧，最终 Stitch DOM 更新事件将页内控制条与底栏、快捷按钮与页内控制条的可见间距调整为约 10px。

## 2. 修复范围

- 原 screen 名称：阅读页控制层基础状态 V2 - 无弹窗 - 布局修正版
- 原 screen ID：0cdd14b83cec4375b99ad71c894c2f7b
- 新 screen 名称：阅读页控制层基础状态 V2 - 无弹窗 - 紧凑修正版
- 新 screen ID：664894856ea14ea3827c2175f7b5b7a7
- 是否修改原 screen：否。原 screen 保留未覆盖；修复落在新生成 screen 上，并对新 screen 做了窄范围 DOM 间距补丁。

## 3. P0 修复结果表

| P0 问题 | 修复前 | 修复后 | 是否修复 | 备注 |
|---|---|---|---|---|
| 快捷方式文字标签遮挡正文 | 四个圆形快捷按钮下方显示「搜索 / 自动翻页 / 内容替换 / 夜间模式」，并压在正文区域 | 新 screen 四个快捷方式仅显示 `search`、`auto_mode`、`swap_horiz`、`dark_mode` 圆形图标按钮，无正式文字标签 | 是 | 功能名只保留在文档说明中，不作为 screen UI 文本 |

## 4. P1 修复结果表

| P1 问题 | 修复前 | 修复后 | 是否修复 | 备注 |
|---|---|---|---|---|
| 页内控制条到底栏间距偏大 | 约 20px，超过建议范围 | Stitch 最终 DOM 更新为 `bottom: calc(var(--bottom-nav-height) + var(--spacing-gap))`，可见间距约 10px | 是 | 底栏高度 68px，间距 token 10px |
| 快捷方式与页内控制条因文字标签占高导致松散 | 快捷按钮下方文字增加高度，视觉上推高并压正文 | 删除文字标签后，快捷按钮高度回到 48px；最终 DOM 更新为相对页内控制条上方 10px | 是 | 三层更紧凑，仍保持分离 |
| 硬编码 bottom 值未 token 化 | 使用 `bottom-[156px]`、`bottom-[88px]` 等硬编码 | 新 screen 引入底部高度、页内控制条高度、间距、按钮尺寸等 token，并用 calc 关系定位 | 是 | 后续 Compose handoff 可直接映射为布局常量 |

## 5. 底部控制区间距说明

- 快捷按钮尺寸：48px。
- 快捷按钮到底部页内控制条距离：约 10px。
- 页内控制条高度：52px。
- 页内控制条到底栏距离：约 10px。
- 底栏高度：68px。
- 是否按 token 关系摆放：是。

最终几何关系：

```css
--bottom-nav-height: 68px;
--page-ctrl-height: 52px;
--spacing-gap: 10px;
--btn-size: 48px;

/* Floating Page Control */
bottom: calc(var(--bottom-nav-height) + var(--spacing-gap));

/* Quick Actions */
bottom: calc(var(--bottom-nav-height) + var(--spacing-gap) + var(--page-ctrl-height) + var(--spacing-gap));
```

说明：Stitch 生成的新 screen 初版曾保留 `safe-gap + 10px` 的导出写法；已通过 Stitch DOM 更新事件对新 screen 做窄范围补丁，去掉控件之间额外叠加的 safe-gap。建议下一轮只读复审以画布实际状态为准再确认导出 HTML 是否刷新。

## 6. 自检结果

| 自检项 | 结果 |
|---|---|
| 四个圆形快捷方式是否只剩图标，没有文字标签 | 通过 |
| 是否不存在「搜索 / 自动翻页 / 内容替换 / 夜间模式」文字压在正文上 | 通过 |
| 快捷按钮是否仍为 4 个圆形图标 | 通过 |
| 快捷按钮到页内控制条距离是否约 8px-12px | 通过 |
| 页内控制条到底栏距离是否约 8px-12px | 通过 |
| 底部三个部分是否从上到下为圆形快捷方式 / 浮动页内控制条 / 控制层底栏 | 通过 |
| 三者是否紧凑但分离 | 通过 |
| 是否没有弹窗 | 通过 |
| 是否没有旧四列文字 row | 通过 |
| 是否没有旧 6 快捷入口 | 通过 |
| 是否没有 Light / Theme | 通过 |
| 是否没有 bottom-21 | 通过 |
| 上一轮已通过结构是否未回归 | 通过 |

## 7. 是否仍有 P0

无。

## 8. 是否仍有 P1

无。

## 9. 是否建议再次只读复审

建议。

