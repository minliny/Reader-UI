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

## Acceptance

- 必须覆盖 `备份位置`、`立即备份`、`恢复备份`、`自动备份`、`备份记录`。
- 状态矩阵必须覆盖 default、loading、empty、error、offline、permission。
