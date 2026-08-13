# Compose Accessibility Contracts

| 控件 | contentDescription / semantics label | 备注 |
|---|---|---|
| 返回 | `返回` | 必须可被 TalkBack 聚焦或描述 |
| 刷新当前章节 | `刷新当前章节` | 必须可被 TalkBack 聚焦或描述 |
| 换源 | `换源` | 必须可被 TalkBack 聚焦或描述 |
| 更多 | `更多操作` | 必须可被 TalkBack 聚焦或描述 |
| 搜索本章 | `搜索本章` | 必须可被 TalkBack 聚焦或描述 |
| 自动翻页 | `自动翻页` | 必须可被 TalkBack 聚焦或描述 |
| 内容替换 | `内容替换` | 必须可被 TalkBack 聚焦或描述 |
| 切换夜间模式 / 切换日间模式 | `切换夜间模式 / 切换日间模式` | 必须可被 TalkBack 聚焦或描述 |
| 上一页 | `本章内上一页` | 必须可被 TalkBack 聚焦或描述 |
| 下一页 | `本章内下一页` | 必须可被 TalkBack 聚焦或描述 |
| 本章阅读进度 | `本章阅读进度，百分比` | 必须可被 TalkBack 聚焦或描述 |
| 自动亮度 | `自动亮度` | 必须可被 TalkBack 聚焦或描述 |
| 移动亮度条到右侧 / 左侧 | `移动亮度条到右侧 / 移动亮度条到左侧` | 必须可被 TalkBack 聚焦或描述 |
| 目录 | `目录` | 必须可被 TalkBack 聚焦或描述 |
| 朗读 | `朗读` | 必须可被 TalkBack 聚焦或描述 |
| 界面 | `界面设置` | 必须可被 TalkBack 聚焦或描述 |
| 设置 | `阅读行为设置` | 必须可被 TalkBack 聚焦或描述 |
| WebDAV 配置 | `WebDAV 配置` | 必须可被 TalkBack 聚焦或描述 |
| 同步状态 | `同步状态` | 必须可被 TalkBack 聚焦或描述 |
| 错误重试 | `重试` | 必须可被 TalkBack 聚焦或描述 |

## Semantics Rules

- 图标按钮不得只依赖图标视觉。
- 快捷按钮无可见文字标签，但必须有 `contentDescription`。
- Slider 必须暴露当前值和可调范围。
- 开关必须暴露 checked 状态。
- 错误页重试按钮必须有明确 label。
