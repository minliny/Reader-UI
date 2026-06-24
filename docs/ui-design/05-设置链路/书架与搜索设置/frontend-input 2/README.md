# 书架与搜索设置 frontend-input

## 来源

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 目标

配置书架展示、搜索范围、结果排序和搜索历史规则，建立设置页危险操作行规则。

## 复用公共组件

- `SettingGroupCard`
- `SegmentControl`
- `Switch`
- `ConfirmDialog`
- `SelectRow`
- `OptionSheet`
- P2 书架筛选组件语义

## 新增公共组件

- `DangerActionRow`

## 文件

- `fixture.js` / `fixture.json`：书架与搜索设置默认数据。
- `render.js`：`window.BookshelfSearchSettingsInput` 渲染器。
- `components.css`：默认页、预览卡、底表、确认弹窗和状态矩阵样式。
- `preview.html`：833 x 1888 默认设计稿。
- `state-matrix.html`：default、option_sheet、confirm、loading、error、permission 状态矩阵。
- `components.html`：组件拆分预览入口。

## 状态覆盖

- `default`：展示当前设置值、预览和清空入口。
- `option_sheet`：搜索范围选择底表。
- `confirm`：清空搜索历史二次确认。
- `loading`：读取设置值。
- `error`：保存失败。
- `permission`：搜索历史权限说明。

## 禁止项

- 不显示主底部导航。
- 不新增账号、会员、社区入口。
- 危险操作必须说明影响范围并使用 `确认清空`。
