# 隐私与权限组件规格

## Global

- 全局对象：`window.PrivacyPermissionsInput`
- 命名空间：`pv-` 页面标识，通用结构使用 `sk-`
- 默认画布：`836 x 1881`

## Public Components

### PermissionRow

- Props：`title`、`meta`、`status`、`actionLabel`
- Acceptance：必须展示权限用途、授权状态和必要的系统设置入口。

### StatusBadge

- Props：`label`、`tone`
- Acceptance：`已授权`、`未授权`、`受系统管理` 必须视觉区分。

### OpenSystemSettingsButton

- Props：`label`
- Acceptance：文案必须是 `去设置`，不得替换成含糊的 `确定`。

## Acceptance

- 必须覆盖 `文件访问`、`通知权限`、`网络访问说明`、`去设置`、`隐私开关` 语义。
- 清除隐私数据必须二次确认。
- 状态矩阵必须覆盖默认、确认、加载、错误和权限状态。
