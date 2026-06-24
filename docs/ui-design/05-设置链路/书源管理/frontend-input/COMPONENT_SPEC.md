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

## States

- `default`：书源列表、搜索、筛选和当前来源状态完整展示。
- `edit`：新增或编辑书源表单打开。
- `log`：检测日志面板打开。
- `loading`：正在加载或检测书源。
- `empty`：当前筛选下没有书源。
- `error`：书源加载或检测失败。
- `offline`：网络不可用，检测入口不可提交。
- `permission`：检测或导入前需要权限说明。

## Events

- `back`：返回设置页。
- `queryChange(value)`：更新书源搜索关键词。
- `groupFilterChange(group)`：切换书源分组筛选。
- `toggleSource(source, enabled)`：启用或停用书源。
- `detectSource(source)`：检测单个书源。
- `detectAll`：批量检测当前筛选范围。
- `openSourceDetail(source)`：打开书源详情面板。
- `openSourceEdit(source)`：进入编辑表单。
- `addSource`：新建书源。
- `saveSource(source)`：保存新增或编辑内容。
- `openLog(source)`：打开检测日志。
- `retry`：重试当前错误状态。

## Acceptance

- 必须覆盖 `书源列表`、`搜索框`、`启用开关`、`检测`、`详情`、`新增`、`编辑`、`错误日志`。
- 状态矩阵必须覆盖 `default`、`edit`、`log`、`loading`、`empty`、`error`、`offline`、`permission`。
