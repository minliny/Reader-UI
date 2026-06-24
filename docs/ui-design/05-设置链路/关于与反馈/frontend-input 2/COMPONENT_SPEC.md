# 关于与反馈组件规格

## Global

- 全局对象：`window.AboutFeedbackInput`
- 命名空间：`af-` 页面标识，通用结构使用 `sk-`
- 默认画布：`836 x 1881`

## Public Components

### VersionCard

- Props：`version`、`status`
- Acceptance：必须展示 `当前版本` 和更新状态。

### LinkRow

- Props：`title`、`meta`
- Acceptance：源码仓库、开源许可、帮助和贡献链接必须只作为行入口，不新增商业协议流程。

### FeedbackEntry

- Props：`title`、`meta`
- Acceptance：必须明确是问题或建议反馈。

### UpdateButton

- Props：`label`、`status`
- Acceptance：检查更新失败或离线时必须保留当前版本信息。

### DiagnosticExportAction

- Props：`title`、`meta`
- Acceptance：导出内容必须说明不包含书籍正文。

## States

- `default`：版本、项目说明、反馈入口、开源入口和检查更新入口完整展示。
- `loading`：检查更新或反馈入口加载中。
- `error`：检查更新失败。
- `confirm`：反馈或外部链接确认弹窗打开。
- `offline`：网络不可用但保留当前版本信息。

## Events

- `back`：返回设置页。
- `checkUpdate`：检查版本更新。
- `openFeedback`：打开问题反馈入口。
- `openSuggestion`：打开建议反馈入口。
- `openLicense`：打开开源许可。
- `openRepository`：打开源码仓库。
- `exportDiagnosticLog`：导出诊断日志。
- `openHelp`：打开帮助说明。
- `retry`：重试检查更新失败状态。

## Acceptance

- 必须覆盖 `当前版本`、`个人开源`、`检查更新`、`问题反馈`、`功能建议`、`源码仓库`、`开源许可`、`导出诊断日志`。
- 状态矩阵必须覆盖 `default`、`loading`、`error`、`confirm`、`offline`。
