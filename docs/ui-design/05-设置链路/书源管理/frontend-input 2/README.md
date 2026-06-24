# 书源管理 frontend-input

## 来源

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 目标

管理书源列表、搜索、分组筛选、启用开关、检测、详情、编辑和错误日志。

## 复用公共组件

- `SearchField`
- `FilterChip`
- `Switch`
- `ConfirmDialog`
- `SourceStatusBar`
- `DiscoveryContentCard`
- `SourceCandidateRow`
- `DetectStatusBadge`

## 新增公共组件

- `SourceRow`
- `DetectButton`
- `LogPanel`
- `SourceEditForm`
- `SourceDetailPanel`

## 状态覆盖

- `default`
- `edit`
- `log`
- `loading`
- `empty`
- `error`
- `offline`
- `permission`

## 禁止项

- 不显示主底部导航。
- 不新增账号、会员、社区入口。
- 检测失败必须进入错误日志，不吞掉原因。
