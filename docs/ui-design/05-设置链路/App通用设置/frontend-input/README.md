# App通用设置 frontend-input

## 来源

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 目标

建立设置二级页通用骨架，覆盖 App 主题、语言、启动页面、行为开关、崩溃日志和恢复默认。

## 复用公共组件

- `SettingGroupCard`
- `SettingRow`
- `Switch`
- `ConfirmDialog`
- `LoadingState`
- `ErrorState`

## 新增公共组件

- `SelectRow`
- `OptionDropdown`
- `SettingsToast`

## 文件

- `fixture.js` / `fixture.json`：通用设置默认数据。
- `render.js`：`window.GeneralSettingsInput` 渲染器。
- `components.css`：默认页、选项下拉浮层、toast、确认弹窗和状态矩阵样式。
- `preview.html`：833 x 1888 默认设计稿。
- `state-matrix.html`：default、option_dropdown、loading、error、permission 状态矩阵。
- `components.html`：组件拆分预览入口。

## 状态覆盖

- `default`：展示当前设置值和保存成功 toast。
- `option_dropdown`：点击选择行后在当前行上方或下方浮层展示其他可选项，不改变列表结构。
- `loading`：读取设置值时保留页面结构。
- `error`：恢复默认确认和失败 toast。
- `permission`：崩溃日志权限说明。

## 禁止项

- 不显示主底部导航。
- 不新增账号、会员、社区入口。
- 不用 `确定` 替代 `确认恢复`。
- 提交中不得重复点击。
