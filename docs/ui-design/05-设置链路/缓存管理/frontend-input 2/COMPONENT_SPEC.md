# 缓存管理组件规格

## Global

- 全局对象：`window.CacheManagementInput`
- 命名空间：`cm-` 页面标识，通用结构使用 `sk-`
- 默认画布：`835 x 1884`

## Public Components

### CacheSizeCard

- Props：`title`、`value`、`percent`、`copy`
- Acceptance：必须显示总缓存占用和计算说明。

### CacheCategoryRow

- Props：`title`、`meta`、`value`
- Acceptance：必须展示缓存分类、说明和占用大小。

### StorageBar

- Props：`percent`
- Acceptance：必须稳定展示存储占用比例。

### CleanupResult

- Props：`title`、`copy`
- Acceptance：清理完成必须显示结果反馈，不改变页面结构。

## Acceptance

- 必须覆盖 `缓存占用`、`正在计算`、`清理缓存`、`缓存分类`、`确认清理`。
- 状态矩阵必须覆盖 default、loading、empty、confirm、error。
