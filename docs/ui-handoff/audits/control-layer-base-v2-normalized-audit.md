# Control Layer Base V2 Normalized Audit

## 1. 总体结论

CONTROL_LAYER_BASE_V2_NORMALIZED_AUDIT_READY

## 2. 文件检查

| 检查项 | 结果 | 备注 |
|---|---|---|
| normalized HTML 存在 | 通过 | `docs/ui-handoff/normalized-html/control-layer-base-v2.html` |
| raw HTML 已保存 | 通过 | `docs/ui-handoff/stitch-export/raw/control-layer-base-v2-layout-refined.raw.html` |
| normalized HTML 引用 reader-design-tokens.css | 通过 | `../css/reader-design-tokens.css` |
| normalized HTML 引用 reader-components.css | 通过 | `../css/reader-components.css` |
| normalized HTML 引用 reader-control-layer.css | 通过 | `../css/reader-control-layer.css` |
| normalized HTML 引用 reader-handoff-boundary.css | 通过 | `../css/reader-handoff-boundary.css` |
| 目标色出现 #fff8f4 | 通过 | `#fff8f4` |
| 目标色出现 #53433f | 通过 | `#53433f` |
| 目标色出现 #3f4d52 | 通过 | `#3f4d52` |
| 目标色出现 #366179 | 通过 | `#366179` |
| 目标色出现 #e9ded6 | 通过 | `#e9ded6` |
| 目标色出现 #f7ebe1 | 通过 | `#f7ebe1` |
| 浮动层目标色出现 #efe2d8 或 #eadbd0 | 通过 | `浮动控件背景` |
| normalized/CSS 无旧颜色 #fdf6ec | 通过 | `#fdf6ec` |
| normalized/CSS 无旧颜色 #eae1da | 通过 | `#eae1da` |
| normalized/CSS 无旧颜色 #f5ece6 | 通过 | `#f5ece6` |
| normalized/CSS 无旧颜色 #efe7e0 | 通过 | `#efe7e0` |
| normalized/CSS 无旧颜色 #8b5000 | 通过 | `#8b5000` |
| normalized/CSS 无旧类 bg-surface-container | 通过 | `bg-surface-container` |
| normalized/CSS 无旧类 bg-surface-container-high | 通过 | `bg-surface-container-high` |
| normalized/CSS 无旧类 bg-surface-container-highest | 通过 | `bg-surface-container-highest` |
| normalized/CSS 无旧类 text-on-surface | 通过 | `text-on-surface` |
| normalized/CSS 无旧类 text-on-surface-variant | 通过 | `text-on-surface-variant` |
| normalized/CSS 无旧类 shadow-lg | 通过 | `shadow-lg` |
| normalized/CSS 无旧类 shadow-md | 通过 | `shadow-md` |
| 快捷按钮无可见文字标签 | 通过 | `visible_text=空` |
| 无弹窗结构 | 通过 | `未发现弹窗类结构` |
| 页内控制条使用 chevron_left | 通过 | `chevron_left` |
| 页内控制条使用 chevron_right | 通过 | `chevron_right` |
| 无 skip_previous / skip_next | 通过 | `章节跳转图标未出现` |
| 底栏包含目录 / 朗读 / 界面 / 设置 | 通过 | `底栏四项` |
| 亮度条存在 | 通过 | `亮度条` |
| Source chip 为描边 chip | 通过 | `reader-source-chip` |
| 无 bottom-21 | 通过 | `布局 token` |
| 无硬编码 bottom-[156px] / bottom-[88px] | 通过 | `布局 token` |

## 3. Raw 参考残留

raw HTML 作为 Stitch 参考源保留，允许旧颜色和旧类残留；normalized HTML/CSS 不允许继承这些旧值。

- raw 残留：#fdf6ec, #eae1da, #f5ece6, #efe7e0, bg-surface-container, bg-surface-container-high, bg-surface-container-highest, text-on-surface, text-on-surface-variant, shadow-lg, shadow-md

## 4. 失败项

无。
