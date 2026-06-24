# Control Layer Base V2 Color Token Landing Report

## 1. 总体结论

CONTROL_LAYER_BASE_V2_COLOR_TOKEN_LANDING_NOT_READY

说明：本轮已通过 Stitch MCP 对目标 screen 发起颜色落地修复，Stitch 返回的 DOM 操作中包含对 body、正文文字、底栏、浮动页内控制条、圆形快捷按钮、左侧亮度条的直接颜色替换。但随后下载目标 screen HTML 进行字符串级自检时，导出的 HTML 仍返回旧颜色与旧类。因此以导出 HTML 为准，本轮颜色 token 尚未完成可靠落地。

## 2. 修复范围

- screen 名称：阅读页控制层基础状态 V2 - 布局精修版
- screen ID：`beca4c724346445d8d55eef996450f95`
- 是否修改原 screen：是，已通过 Stitch MCP 对原 screen 发起编辑
- 是否下载 HTML 自检：是，已下载 `/tmp/color-token-landing.html` 与 `/tmp/color-token-landing-2.html` 进行字符串检查

## 3. 颜色落地检查表

| 区域 | 目标颜色 | HTML 实际颜色 | 是否通过 | 备注 |
|---|---:|---:|---|---|
| body / 页面背景 | `#fff8f4` | `bg-[#fdf6ec]` / `background-color: #fdf6ec` | 否 | token 中有 `#fff8f4`，但 body 实际仍是旧背景 |
| 正文文字 | `#53433f` | 未见 `#53433f` 实际应用 | 否 | 正文标题与段落未在导出 HTML 中落地目标色 |
| 控制层图标文字 | `#3f4d52` | 仍使用 `text-on-surface-variant` / token `#41484c` | 否 | Stitch DOM 操作写入过 `#3f4d52`，但导出 HTML 未体现 |
| 强调色 | `#366179` | `#366179` | 是 | `primary` 与进度强调色已为青蓝系 |
| 底栏背景 | `#e9ded6` | `bg-surface-container-highest` / `#eae1da` | 否 | footer 仍引用旧语义类 |
| 浮动页内控制条背景 | `#efe2d8` / `#eadbd0` | `bg-surface-container` / `#f5ece6` | 否 | 胶囊控制条未落到中层浮动色 |
| 圆形快捷按钮背景 | `#f7ebe1` | `bg-surface-container-high` / `#efe7e0` | 否 | 四个按钮仍引用旧语义类 |
| 左侧亮度条 | `#efe2d8` + `#366179` | `bg-surface-container shadow-lg` | 否 | 背景与阴影重量均未在导出 HTML 中完成落地 |

## 4. 旧颜色残留检查表

| 旧颜色 / 旧类 | 是否仍出现 | 出现位置 | 是否阻塞 | 备注 |
|---|---|---|---|---|
| `#fdf6ec` | 是 | body CSS 与 body class | 是 | body 仍使用旧页面背景 |
| `#eae1da` | 是 | `surface-variant` / `surface-container-highest` token | 是 | footer 仍通过 `bg-surface-container-highest` 使用旧色 |
| `#f5ece6` | 是 | `surface-container` token | 是 | 页内控制条和亮度条仍引用该类 |
| `#efe7e0` | 是 | `surface-container-high` token | 是 | 圆形快捷按钮仍引用该类 |
| `#8b5000` | 否 | 未发现 | 否 | 棕橙主强调色未残留 |
| `bg-surface-container` | 是 | 左侧亮度条、浮动页内控制条 | 是 | 关键组件仍引用旧语义类 |
| `bg-surface-container-high` | 是 | 四个圆形快捷按钮 | 是 | 快捷按钮未落地 `#f7ebe1` |
| `bg-surface-container-highest` | 是 | footer | 是 | 底栏未落地 `#e9ded6` |
| `shadow-lg` | 是 | 左侧亮度条 | 是 | 亮度条阴影仍偏重 |

## 5. 阴影和边界修复表

| 组件 | 修复前 | 修复后 | 是否通过 | 备注 |
|---|---|---|---|---|
| 圆形快捷按钮 | `shadow-md`，旧暖纸按钮色 | 导出 HTML 仍为 `shadow-md` / `bg-surface-container-high` | 否 | DOM 操作曾写入 `shadow-sm` 与 `#f7ebe1`，但导出未落地 |
| 浮动页内控制条 | `shadow-md`，`bg-surface-container` | 导出 HTML 仍为 `shadow-md` / `bg-surface-container` | 否 | 胶囊层级仍接近正文纸面 |
| 底栏 | `bg-surface-container-highest` | 导出 HTML 仍为旧类 | 否 | 未落地 `#e9ded6` 与轻分割线 |
| 左侧亮度条 | `shadow-lg`，`bg-surface-container` | 导出 HTML 仍为 `shadow-lg` | 否 | 视觉重量仍偏高 |
| handoff 边界 | `#d8cfbe` 虚线 | 导出 HTML 仍为旧边界 | 部分通过 | 未阻塞结构，但未按新低干扰色完成 |

## 6. 结构回归自检

| 检查项 | 是否保持 | 是否通过 | 备注 |
|---|---|---|---|
| 顶部三段式 | 是 | 是 | 返回 / 深空信号 / refresh + swap_horiz + more_vert 保持 |
| 顶部第二行 | 是 | 是 | 第一章：阿长与《山海经》 / 本地书籍 chip 保持 |
| 深空信号正文 | 是 | 是 | 未回退到旧章节或旧正文 |
| 快捷按钮无文字标签 | 是 | 是 | 未发现“搜索 / 自动翻页 / 内容替换 / 夜间模式”作为正式标签出现 |
| 页内控制条 chevron 图标 | 是 | 是 | `chevron_left` / `chevron_right` 保持，未出现 `skip_previous` / `skip_next` |
| 底栏四项 | 是 | 是 | 目录 / 朗读 / 界面 / 设置 保持 |
| 左侧亮度条 | 是 | 是 | `brightness_auto` / 竖向 slider / 右向箭头结构保持 |
| 无弹窗 | 是 | 是 | 未新增弹窗或展开态 |

## 7. 是否仍有 P0

无。

## 8. 是否仍有 P1

1. body / 页面背景仍导出为 `#fdf6ec`，未落地 `#fff8f4`。
2. 底栏仍导出为 `bg-surface-container-highest` / `#eae1da`，未落地 `#e9ded6`。
3. 浮动页内控制条仍导出为 `bg-surface-container` / `#f5ece6`，未落地 `#efe2d8`。
4. 圆形快捷按钮仍导出为 `bg-surface-container-high` / `#efe7e0`，未落地 `#f7ebe1`。
5. 正文文字与控制层图标文字未在导出 HTML 中落地 `#53433f` / `#3f4d52`。
6. 左侧亮度条仍导出 `shadow-lg`，视觉重量仍偏重。

## 9. 是否建议只读复审

不建议。建议先解决 Stitch 编辑结果与 HTML 导出结果不一致的问题，再进入只读复审。
