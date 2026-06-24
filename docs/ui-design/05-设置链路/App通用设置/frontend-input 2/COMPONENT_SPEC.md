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
- Acceptance：必须显示当前值和进入底表的箭头，不直接在行内展开全部选项。

### OptionSheet

- Props：`title`、`options`、`selectedValue`
- Acceptance：支持关闭、取消、当前项勾选；关闭后保留来源页滚动位置。

### SettingsToast

- Props：`type`、`label`
- Acceptance：只表达轻量反馈，不改变页面主结构。

## States

- `default`：默认完整内容。
- `option_sheet`：选择项底表。
- `loading`：读取设置值。
- `error`：操作失败和确认弹窗。
- `permission`：权限说明。

## Events

- `back`
- `themeChange`
- `selectOpen`
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
- 状态矩阵必须包含默认、选择底表、加载、错误和权限状态。
