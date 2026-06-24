# 书源管理组件规格

## Global

- 全局对象：`window.SourceManagementInput`
- 命名空间：`sm-` 页面标识，通用结构使用 `sk-`
- 默认画布：`836 x 1881`

## Public Components

### SourceRow

- Props：`title`、`meta`、`status`、`enabled`
- Acceptance：必须展示来源名称、域名、分组、检测状态和启用开关。

### DetectButton

- Props：`label`
- Acceptance：必须显示 `检测`，离线或无权限时不可提交。

### LogPanel

- Props：`items`
- Acceptance：必须展示错误级别和失败原因。

### SourceEditForm

- Props：`fields`
- Acceptance：新增和编辑都必须保留用户输入，保存失败不清空。

### SourceDetailPanel

- Props：`source`
- Acceptance：详情必须包含状态、分组和检测入口。

## Acceptance

- 必须覆盖 `书源列表`、`搜索框`、`启用开关`、`检测`、`详情`、`新增`、`编辑`、`错误日志`。
- 状态矩阵必须覆盖 default、loading、empty、error、offline、permission，并补充 edit 和 log。
