# 阅读控制层修正任务

功能结构参考：`docs/ui-design/04-阅读链路/阅读控制层/图片/01-阅读控制层-默认总控态.png`

唯一视觉和几何对齐基准：
`docs/ui-design/04-阅读链路/阅读控制层/图片/03-当前视觉基线.png`

修正原则：

- 底部工具栏位置对齐 `04-2-reader-controls-opaque-icon-aligned.png`。
- 底部章节进度条位于底部工具栏上方。
- 不得出现贴屏幕底部的错误细进度条。
- 控制层不得改变正文排版。
- 快捷区不得挤压正文。
- 顶部栏和底部栏位置稳定。
- `16-4 / 18-2 / 19 / 22-1 / 25-1` 已完成高度对齐重画。
- 当前采用 `16-5 / 18-3 / 19-1 / 22-2 / 25-4`。
- 重画只调整相对高度，让它们与 `04-2-reader-controls-opaque-icon-aligned.png` 对齐。
- 除相对高度之外，其他元素、文字、按钮、图标、模块结构、视觉风格均不得修改。

| 原图 | 对齐基准 | 问题 | 修正结果 | 是否阻塞冻结 | 当前采用文件名 |
| -- | ---- | -- | ---- | ------ | ------ |
| `docs/ui-design/04-阅读链路/目录与书签/图片/05-目录快捷模块旧版.png` | `04-2-reader-controls-opaque-icon-aligned.png` | 目录快捷模块相对高度需与默认控制层统一。 | 已完成旧版高度修正；当前仅作内容参考，冻结前按 04-2 标准化。 | 是 | `16-5-reader-toc-quick-panel-height-aligned.png` |
| `docs/ui-design/04-阅读链路/朗读/图片/03-朗读快捷模块修正版.png` | `04-2-reader-controls-opaque-icon-aligned.png` | 朗读快捷模块相对高度需与默认控制层统一。 | 已完成旧版高度修正；当前仅作内容参考，冻结前按 04-2 标准化。 | 是 | `18-3-read-aloud-quick-panel-height-aligned.png` |
| `docs/ui-design/04-阅读链路/朗读/图片/06-朗读运行胶囊旧版.png` | `04-2-reader-controls-opaque-icon-aligned.png` | 朗读运行态相对高度需明确。 | 已完成旧版高度修正；运行胶囊不挤压正文，冻结前复核 04-2 锚点。 | 是 | `19-1-read-aloud-running-capsule-height-aligned.png` |
| `docs/ui-design/04-阅读链路/阅读设置/图片/02-设置快捷模块旧版.png` | `04-2-reader-controls-opaque-icon-aligned.png` | 设置快捷模块曾被指出控制层疑似下移。 | 已完成旧版高度修正；当前仅作内容参考，冻结前按 04-2 标准化。 | 是 | `22-2-reader-settings-quick-panel-height-aligned.png` |
| `docs/ui-design/04-阅读链路/阅读控制层/图片/05-顶部更多菜单旧版.png` | `04-2-reader-controls-opaque-icon-aligned.png` | 顶部菜单状态相对高度需明确。 | 已完成旧版高度修正；冻结前复核顶部菜单与 04-2 锚点。 | 是 | `25-4-reader-top-more-menu-height-aligned.png` |

## 完成标准

- 五张图均已完成位置对齐。
- 与 `04-2-reader-controls-opaque-icon-aligned.png` 对比，顶部栏、底部栏、正文层不漂移。
- 通过人工复审后，才可进入 `UI_FREEZE_READER_CONTROL_LAYER_V1`。
