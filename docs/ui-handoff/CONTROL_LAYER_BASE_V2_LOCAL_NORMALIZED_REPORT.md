# Control Layer Base V2 Local Normalized Report

## 1. 总体结论

CONTROL_LAYER_BASE_V2_LOCAL_NORMALIZED_READY

## 2. Stitch 状态收口

Stitch 颜色编辑不再作为最终落地方式。当前事实是：Stitch MCP 编辑事件曾声明写入目标颜色，但导出 HTML 仍返回旧颜色和旧 class，因此 Stitch raw HTML 只保留为结构参考和问题追溯来源。

从本轮开始，`normalized HTML / CSS` 作为 Reader for Android 阅读页控制层基础状态 V2 的 handoff 真源。本地 CSS 已用 `reader-*` token 接管颜色、阴影、边界和底部控制区位置关系。

## 3. Raw 导出结果

| screen 名称 | screen ID | raw HTML 路径 | 是否成功 |
|---|---|---|---|
| 阅读页控制层基础状态 V2 - 布局精修版 | `beca4c724346445d8d55eef996450f95` | `docs/ui-handoff/stitch-export/raw/control-layer-base-v2-layout-refined.raw.html` | 是 |

导出时间：2026-05-22 22:10:03 CST

raw HTML 中仍残留：`#fdf6ec`、`#eae1da`、`#f5ece6`、`#efe7e0`、`bg-surface-container`、`bg-surface-container-high`、`bg-surface-container-highest`、`text-on-surface`、`text-on-surface-variant`、`shadow-lg`、`shadow-md`。这些残留仅存在于 raw 参考，不进入 normalized 真源。

## 4. Normalized HTML 结果

| 文件 | 是否生成 | 是否引用统一 CSS | 是否通过 |
|---|---|---|---|
| `docs/ui-handoff/normalized-html/control-layer-base-v2.html` | 是 | 是，引用 4 个 reader CSS 文件 | 是 |

## 5. CSS 结果

| CSS 文件 | 用途 | 是否生成 | 是否通过 |
|---|---|---|---|
| `docs/ui-handoff/css/reader-design-tokens.css` | 颜色 token、阴影 token、布局 token | 是 | 是 |
| `docs/ui-handoff/css/reader-components.css` | 通用图标、按钮、chip、进度条组件 | 是 | 是 |
| `docs/ui-handoff/css/reader-control-layer.css` | 阅读页基础控制层结构与布局 | 是 | 是 |
| `docs/ui-handoff/css/reader-handoff-boundary.css` | handoff 虚线边界 | 是 | 是 |

## 6. 颜色落地表

| 区域 | 目标 token | 目标颜色 | 是否在 normalized HTML/CSS 中落地 | 是否通过 |
|---|---|---:|---|---|
| 页面背景 | `--reader-paper-bg` | `#fff8f4` | 是 | 是 |
| 正文文字 | `--reader-body-text` | `#53433f` | 是 | 是 |
| 控制层图标文字 | `--reader-control-ink` | `#3f4d52` | 是 | 是 |
| 强调色 | `--reader-primary` | `#366179` | 是 | 是 |
| 底栏背景 | `--reader-bottom-bar-bg` | `#e9ded6` | 是 | 是 |
| 浮动页内控制条背景 | `--reader-floating-control-bg` | `#efe2d8` | 是 | 是 |
| 浮动页内控制条备选背景 | `--reader-floating-control-bg-alt` | `#eadbd0` | 是 | 是 |
| 圆形快捷按钮背景 | `--reader-quick-button-bg` | `#f7ebe1` | 是 | 是 |
| 边界 | `--reader-boundary` / `--reader-control-border` | `rgba(63, 77, 82, 0.18)` / `0.12` | 是 | 是 |

## 7. 旧颜色 / 旧类清理表

| 旧颜色或旧类 | 是否仍残留 | 是否阻塞 | 备注 |
|---|---|---|---|
| `#fdf6ec` | 否 | 否 | normalized/CSS 已清理 |
| `#eae1da` | 否 | 否 | normalized/CSS 已清理 |
| `#f5ece6` | 否 | 否 | normalized/CSS 已清理 |
| `#efe7e0` | 否 | 否 | normalized/CSS 已清理 |
| `#8b5000` | 否 | 否 | 未使用棕橙主强调色 |
| `bg-surface-container` | 否 | 否 | 已替换为 reader 语义类 |
| `bg-surface-container-high` | 否 | 否 | 已替换为 reader 语义类 |
| `bg-surface-container-highest` | 否 | 否 | 已替换为 reader 语义类 |
| `text-on-surface` | 否 | 否 | 已替换为 reader 语义类 |
| `text-on-surface-variant` | 否 | 否 | 已替换为 reader 语义类 |
| `shadow-lg` | 否 | 否 | 已替换为轻量 token 阴影 |
| `shadow-md` | 否 | 否 | 已替换为轻量 token 阴影 |

## 8. 结构保持自检

| 检查项 | 是否保持 | 是否通过 | 备注 |
|---|---|---|---|
| 顶部三段式 | 是 | 是 | 返回 / 深空信号 / refresh + swap_horiz + more_vert |
| 顶部第二行 | 是 | 是 | 第一章：阿长与《山海经》 / 本地书籍描边 chip |
| 深空信号正文 | 是 | 是 | 章节标题和中文科幻正文保持 |
| 亮度条 | 是 | 是 | `brightness_auto` / 竖向 slider / 右向箭头 |
| 快捷按钮无文字标签 | 是 | 是 | 四个圆形按钮仅显示图标，可见文本为空 |
| 页内控制条 chevron | 是 | 是 | `chevron_left` / 进度条 / `chevron_right` |
| 底栏四项 | 是 | 是 | 目录 / 朗读 / 界面 / 设置 |
| 无弹窗 | 是 | 是 | normalized 页面无弹窗或展开态 |

## 9. 一致性审计结果

审计报告：`docs/ui-handoff/audits/control-layer-base-v2-normalized-audit.md`

审计结论：`CONTROL_LAYER_BASE_V2_NORMALIZED_AUDIT_READY`

## 10. 是否仍有 P0

无。

## 11. 是否仍有 P1

无。

## 12. 是否允许进入下一阶段

允许进入 8 个阅读控制层展开态 normalized HTML 重建。
