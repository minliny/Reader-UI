# 缓存管理 frontend-input

## 来源

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 目标

展示缓存占用、缓存分类、缓存策略和清理确认。

## 复用公共组件

- `SettingGroupCard`
- `DangerActionRow`
- `ConfirmDialog`
- `LoadingState`
- `ErrorState`

## 新增公共组件

- `CacheSizeCard`
- `CacheCategoryRow`
- `StorageBar`
- `CleanupResult`

## 状态覆盖

- `default`
- `loading`
- `empty`
- `confirm`
- `error`

## 禁止项

- 不显示主底部导航。
- 清理缓存必须进入确认弹窗。
- 不得暗示会删除书架记录。
