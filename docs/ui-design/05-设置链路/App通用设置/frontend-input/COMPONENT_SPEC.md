# App通用设置组件规格

## Global

- 全局对象：`window.GeneralSettingsInput`
- 命名空间：`gs-`
- 默认画布：`833 x 1888`

## Fixture

```ts
interface GeneralSettingsFixture {
  topBar: GeneralSettingsTopBarInput;
  groups: GeneralSettingsGroupInput[];
  restore: RestoreGeneralSettingsInput;
  toast: SettingsToastInput;
  feedback: GeneralSettingsFeedbackInput;
}
```

## Public Components

### SelectRow

- Props：`icon`、`title`、`value`、`options`
- Acceptance：默认只显示当前值；点击当前值后在该设置行上方或下方打开选项下拉浮层，不打开屏幕底部选项框，也不改变设置列表结构。

### OptionDropdown

- Props：`title`、`options`、`selectedValue`
- Acceptance：只展示当前值之外的其他选项；选项浮层锚定当前设置行，可覆盖下一行部分内容；选择后更新当前值并收起，保留来源页滚动位置。

### SettingsToast

- Props：`type`、`label`
- Acceptance：只表达轻量反馈，不改变页面主结构。

## States

- `default`：默认完整内容。
- `option_dropdown`：选择项下拉浮层打开。
- `loading`：读取设置值。
- `error`：操作失败和确认弹窗。
- `permission`：权限说明。

## Events

- `back`
- `themeChange`
- `optionDropdownOpen`
- `selectOption`
- `switchChange`
- `restoreOpen`
- `restoreConfirm`
- `retry`
- `openSystemSettings`

## Acceptance

- 必须渲染核心文案：`通用设置`、`启动时打开`、`语言`、`主题跟随系统`、`崩溃日志`、`恢复默认`、`保存成功`。
- 默认页不得显示公共主导航。
- 危险恢复必须使用 `确认恢复`。
- 状态矩阵必须包含默认、选项下拉、加载、错误和权限状态。
