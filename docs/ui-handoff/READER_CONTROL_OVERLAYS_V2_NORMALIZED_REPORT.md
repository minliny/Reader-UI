# Reader Control Overlays V2 Normalized Report

## 1. 总体结论

READER_CONTROL_OVERLAYS_V2_NORMALIZED_READY

## 2. 基础状态引用

- 基础状态 HTML：`docs/ui-handoff/normalized-html/control-layer-base-v2.html`
- 统一 CSS：
  - `docs/ui-handoff/css/reader-design-tokens.css`
  - `docs/ui-handoff/css/reader-components.css`
  - `docs/ui-handoff/css/reader-control-layer.css`
  - `docs/ui-handoff/css/reader-handoff-boundary.css`
- 基础状态审计结果：`CONTROL_LAYER_BASE_V2_NORMALIZED_AUDIT_READY`

## 3. 生成页面清单

| 页面 | 文件路径 | 类型 | 是否生成 | 是否通过 |
|---|---|---|---|---|
| 搜索快捷弹窗 | `docs/ui-handoff/normalized-html/reader-search-overlay-v2.html` | 快捷方式状态 | 是 | 是 |
| 自动翻页快捷弹窗 | `docs/ui-handoff/normalized-html/reader-auto-scroll-overlay-v2.html` | 快捷方式状态 | 是 | 是 |
| 内容替换快捷弹窗 | `docs/ui-handoff/normalized-html/reader-replace-overlay-v2.html` | 快捷方式状态 | 是 | 是 |
| 夜间模式基础状态 | `docs/ui-handoff/normalized-html/reader-night-state-v2.html` | 夜间状态 | 是 | 是 |
| 目录 / 书签弹窗 | `docs/ui-handoff/normalized-html/reader-directory-overlay-v2.html` | 底栏功能弹窗 | 是 | 是 |
| 朗读弹窗 | `docs/ui-handoff/normalized-html/reader-tts-overlay-v2.html` | 底栏功能弹窗 | 是 | 是 |
| 界面弹窗 | `docs/ui-handoff/normalized-html/reader-appearance-overlay-v2.html` | 底栏功能弹窗 | 是 | 是 |
| 设置弹窗 | `docs/ui-handoff/normalized-html/reader-settings-overlay-v2.html` | 底栏功能弹窗 | 是 | 是 |

## 4. 快捷方式状态检查

- 搜索：包含搜索输入框、清除按钮、结果摘要、结果片段、命中词高亮、上一个结果、下一个结果。
- 自动翻页：包含未开启状态、开始 / 暂停 / 停止、翻页速度 slider、滚动 / 点击翻页 / 连续滚动方式和状态提示。
- 内容替换：只显示当前书籍“深空信号”的 3 条匹配规则，包含启用状态、应用、取消、恢复原文。
- 夜间状态：无弹窗，基础控制层保持，第四个快捷图标切换为 `light_mode`，使用柔和夜间色。

## 5. 底栏功能弹窗检查

- 目录 / 书签：包含目录 / 书签按钮、章节分级小字、多级目录缩进、右侧常驻进度条、书签标识列、当前阅读标识列和当前阅读章节提示。
- 朗读：分为标题与状态、主播放控制、朗读进度、朗读参数 4 组；未使用 `skip_previous` / `skip_next`。
- 界面：分为文字、段落、界面三部分，按“小标题 / 具体信息”模式展示。
- 设置：只包含固定 9 项阅读行为设置，未包含 WebDAV、书源、RSS 或全局 App 设置。

## 6. Overlay 显隐规则检查

| 页面 | 顶栏 | 底栏 | 亮度条 | 圆形快捷方式 | 浮动页内控制条 | 是否通过 |
|---|---|---|---|---|---|---|
| 搜索 | 显示 | 显示 | 隐藏 | 显示 | 显示 | 是 |
| 自动翻页 | 显示 | 显示 | 隐藏 | 显示 | 显示 | 是 |
| 内容替换 | 显示 | 显示 | 隐藏 | 显示 | 显示 | 是 |
| 夜间状态 | 显示 | 显示 | 显示 | 显示 | 显示 | 是 |
| 目录 / 书签 | 显示 | 显示 | 隐藏 | 隐藏 | 隐藏 | 是 |
| 朗读 | 显示 | 显示 | 隐藏 | 隐藏 | 隐藏 | 是 |
| 界面 | 显示 | 显示 | 隐藏 | 隐藏 | 隐藏 | 是 |
| 设置 | 显示 | 显示 | 隐藏 | 隐藏 | 隐藏 | 是 |

## 7. CSS / token 一致性检查

8 个页面全部引用统一 CSS，且未使用 Stitch 旧色、旧类或旧 Bottom Control Stack 三层堆叠。页面继续使用 `reader-*` 语义类，包括 `.reader-page`、`.reader-top-area`、`.reader-content-layer`、`.reader-overlay-panel`、`.reader-floating-quick-actions`、`.reader-floating-page-control`、`.reader-control-bottom-bar` 和 `.handoff-boundary`。

## 8. 审计脚本结果

审计报告：`docs/ui-handoff/audits/reader-control-overlays-v2-normalized-audit.md`

审计结论：`READER_CONTROL_OVERLAYS_V2_NORMALIZED_AUDIT_READY`

## 9. 是否仍有 P0

无。

## 10. 是否仍有 P1

无。

## 11. 是否允许进入下一阶段

允许进入完整 Reader 前端页面 normalized HTML 设计阶段。
