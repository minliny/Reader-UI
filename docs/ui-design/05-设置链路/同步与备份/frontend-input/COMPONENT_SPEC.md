# 同步与备份组件规格

## Global

- 全局对象：`window.SyncBackupInput`
- 命名空间：`sb-` 页面标识，通用结构使用 `sk-`
- 默认画布：`836 x 1881`

## Public Components

### BackupActionRow

- Props：`title`、`meta`、`action`
- Acceptance：必须区分立即备份、导出和恢复备份。

### BackupRecordRow

- Props：`title`、`meta`、`status`
- Acceptance：必须展示备份时间、位置和可恢复状态。

### ConflictNotice

- Props：`title`、`meta`、`value`
- Acceptance：同步冲突必须说明处理方式。

### RestoreConfirmDialog

- Props：`title`、`copy`、`confirmLabel`
- Acceptance：必须说明恢复会覆盖当前数据，确认按钮为 `确认恢复`。

## States

- `default`：同步、备份、恢复和备份记录完整展示。
- `confirm`：恢复备份确认弹窗打开。
- `loading`：正在同步或备份。
- `empty`：没有备份记录。
- `error`：同步或备份失败。
- `offline`：网络不可用。
- `permission`：同步或备份前需要权限说明。

## Events

- `back`：返回设置页。
- `selectBackupLocation`：选择备份位置。
- `runBackupNow`：立即备份。
- `exportBackup`：导出备份文件。
- `restoreBackup(record)`：请求恢复指定备份。
- `restoreCancel`：取消恢复确认。
- `restoreConfirm(record)`：确认恢复备份。
- `toggleAutoBackup(enabled)`：开启或关闭自动备份。
- `openWebDavSettings`：打开 WebDAV 配置。
- `resolveConflict(choice)`：处理同步冲突。
- `retry`：重试当前错误状态。
- `grantPermission`：进入权限授权流程。

## Acceptance

- 必须覆盖 `备份位置`、`立即备份`、`恢复备份`、`自动备份`、`备份记录`。
- 状态矩阵必须覆盖 `default`、`confirm`、`loading`、`empty`、`error`、`offline`、`permission`。
