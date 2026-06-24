# 书架与搜索设置组件规格

## Global

- 全局对象：`window.BookshelfSearchSettingsInput`
- 命名空间：`bks-`
- 默认画布：`833 x 1888`

## Fixture

```ts
interface BookshelfSearchSettingsFixture {
  topBar: BookshelfSearchSettingsTopBarInput;
  bookshelf: BookshelfSettingsSectionInput;
  search: SearchSettingsSectionInput;
  toast: SettingsToastInput;
  feedback: BookshelfSearchSettingsFeedbackInput;
}
```

## Public Components

### DangerActionRow

- Props：`title`、`confirmTitle`、`copy`、`confirmLabel`
- Acceptance：必须使用危险色，必须进入 `ConfirmDialog`，确认按钮必须是结果文案，例如 `确认清空`。

## States

- `default`：默认完整内容。
- `option_sheet`：搜索范围底表。
- `confirm`：清空历史确认。
- `loading`：读取设置值。
- `error`：保存失败。
- `permission`：权限说明。

## Events

- `back`
- `layoutChange`
- `columnCountChange`
- `selectOpen`
- `selectOption`
- `switchChange`
- `clearHistoryOpen`
- `clearHistoryConfirm`
- `retry`
- `openSystemSettings`

## Acceptance

- 必须渲染核心文案：`书架与搜索`、`默认展示`、`搜索范围`、`结果排序`、`搜索历史`、`清空搜索历史`。
- 必须展示封面模式和列表模式预览。
- 清空历史必须二次确认，并使用 `确认清空`。
- 状态矩阵必须包含默认、底表、确认、加载、错误和权限状态。
