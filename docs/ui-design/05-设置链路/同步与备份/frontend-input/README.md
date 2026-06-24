# 同步与备份 frontend-input

## 来源

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 目标

管理本地备份、恢复、WebDAV 同步、自动备份、备份记录和冲突提示。

## 复用公共组件

- `SettingGroupCard`
- `Switch`
- `ConfirmDialog`
- `PermissionRow`
- `StatusBadge`
- `DangerActionRow`

## 新增公共组件

- `BackupActionRow`
- `BackupRecordRow`
- `ConflictNotice`
- `RestoreConfirmDialog`

## 状态覆盖

- `default`
- `confirm`
- `loading`
- `empty`
- `error`
- `offline`
- `permission`

## 禁止项

- 不显示主底部导航。
- 恢复备份必须说明覆盖范围。
- 离线时不阻断本地备份记录查看。
