# Stitch 交互规格文字草案

状态：`DRAFT / PENDING_HUMAN_REVIEW / NOT_AUTHORITY`

本文覆盖当前缺少交互规格的13个页面。

## 书源管理流程

页面：`44-source-management-home`、`47-source-detail`、
`47-1-source-create`、`47-2-source-edit`、`47-3-source-check-running`、
`47-4-source-check-result`、`47-5-source-debug-info`、`47-6-source-error-logs`。

### 触发与流程

1. 从设置页或依赖书源的故障恢复入口打开书源管理。
2. 选择已有书源、新建书源或导入书源数据。
3. 保存前校验字段。
4. 按需手动执行检测，或在保存后执行必要检测。
5. 展示检测进度，并明确取消和离开页面策略。
6. 展示包含可执行修复操作的检测结果。
7. 只有用户明确请求时才打开经过脱敏的调试信息或错误日志。

### 打开与关闭行为

- 完整页面使用标准返回导航。
- 新建/编辑存在未保存修改时，离开前必须确认放弃。
- 只有产品明确支持后台检测时，离开页面后检测才可继续；否则必须确认取消。
- 结果、调试和日志页返回时必须回到准确的书源上下文。

### 状态转换

- `draft -> validating -> saved`
- `idle -> checking -> success | warning | failure | cancelled`
- `failure -> edit source | retry | inspect sanitized diagnostics`

### 错误、空状态与加载

- 空状态：说明如何新增或导入书源。
- 加载：保持列表几何稳定并防止重复操作。
- 校验错误：附着于对应字段，并保留用户输入。
- 网络/解析错误：说明失败阶段、影响以及重试或编辑入口。
- 调试信息必须脱敏凭据、Cookie、Token 和私有内容。

### 手势规则

- 任何必要操作都不得只依赖滑动手势。
- 破坏性操作必须明确确认。
- 下拉刷新可刷新状态，但不得自动执行破坏性检测。

## 全局状态流程

条件性排除页面：`51-global-state-loading`、`51-1-global-state-empty`、
`51-2-global-state-error-network`、`51-3-global-state-permission-delete-confirm`、
`51-4-global-state-operation-feedback`。

### 触发与流程

- 明确导航或操作后进入加载状态。
- 只有加载成功但无内容时才显示空状态。
- 网络错误必须说明是否可重试。
- 权限提示必须解释用途，并在适用时提供系统设置入口。
- 删除确认必须明确对象和后果。
- 操作反馈必须说明成功/失败及后续可执行操作。

### 打开与关闭行为

- 加载和空状态属于宿主页面。
- 权限与删除确认使用可取消的模态框或对话框。
- 短时成功反馈可以自动消失；需要用户操作的错误不得自动消失。

### 状态转换

- `loading -> content | empty | error`
- `permission required -> granted | denied | cancelled`
- `delete requested -> confirmed -> deleting -> success | failure`
- `operation -> success | warning | failure`

### 错误、空状态与加载

- 加载不得在没有取消或超时策略时无限持续。
- 空状态不是错误，应提供一个相关的下一步操作。
- 重试应尽可能具备幂等性。
- 失败后必须保留用户输入和操作上下文。

### 手势规则

- 关闭模态框不得误触发破坏性确认。
- 不可逆操作开始前，返回操作应取消待确认对话框。
- 无障碍焦点应移动到状态标题或对话框标题。

这些交互草案不会撤销51组的明确排除结论。

最终状态：`INTERACTION_SPEC_REVIEW_REQUIRED`
