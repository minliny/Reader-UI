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

## States

- `default`：权限列表、隐私选项和系统设置入口完整展示。
- `confirm`：清除隐私数据确认弹窗打开。
- `loading`：正在读取权限状态。
- `error`：权限状态读取失败。
- `permission`：存在待授权权限并展示说明。

## Events

- `back`：返回设置页。
- `openSystemSettings(permission)`：打开系统权限设置。
- `togglePrivacyOption(key, enabled)`：切换隐私选项。
- `openPrivacyPolicy`：打开隐私协议说明。
- `clearPrivacyDataOpen`：打开清除隐私数据确认。
- `clearPrivacyDataCancel`：取消清除隐私数据。
- `clearPrivacyDataConfirm`：确认清除隐私数据。
- `retry`：重试当前错误状态。

## Acceptance

- 必须覆盖 `文件访问`、`通知权限`、`网络访问说明`、`去设置`、`隐私开关` 语义。
- 清除隐私数据必须二次确认。
- 状态矩阵必须覆盖 `default`、`confirm`、`loading`、`error`、`permission`。
