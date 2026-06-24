# 隐私与权限 frontend-input

## 来源

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 目标

管理系统权限、隐私开关、数据说明和隐私数据清除。

## 复用公共组件

- `SettingGroupCard`
- `SettingRow`
- `Switch`
- `Badge`
- `ConfirmDialog`
- `SettingsToast`

## 新增公共组件

- `PermissionRow`
- `StatusBadge`
- `OpenSystemSettingsButton`

## 状态覆盖

- `default`
- `confirm`
- `loading`
- `error`
- `permission`

## 禁止项

- 不显示主底部导航。
- 不新增账号、会员、社区入口。
- 权限态必须说明用途并提供 `去设置`。
