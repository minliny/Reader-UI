# 分组管理组件规格

## Render API

```ts
window.GroupManagementInput.renderGroupManagement(
  target: HTMLElement,
  data: GroupManagementFixture,
  options?: { state?: GroupManagementState }
): void

window.GroupManagementInput.renderGroupManagementStateMatrix(
  target: HTMLElement,
  data: GroupManagementFixture
): void
```

## Props

```ts
interface GroupRowInput {
  id: string;
  title: string;
  count: number;
  meta: string;
  system: boolean;
  canRename: boolean;
  canDelete: boolean;
  canReorder: boolean;
}
```

## States

- `default`：展示系统分组、自定义分组、排序手柄和更多操作。
- `new`：新建分组弹窗。
- `rename`：重命名弹窗。
- `delete`：删除分组确认弹窗。
- `empty`：无自定义分组，展示系统分组说明和新建入口。
- `loading`：保存中，禁用重复操作。
- `error`：保存失败，保留原顺序和已输入名称。

## Shell

- 使用 `LibraryShell`。
- 页面骨架由 `LibraryPageKit.renderPage` 输出。
- 分组列表和空状态进入 `ContentRegion`。
- 新建、重命名和删除确认进入 `DialogHost`。

## Events

- `back`
- `addGroupOpen`
- `groupRenameOpen`
- `groupDeleteOpen`
- `groupReorder`
- `dialogCancel`
- `dialogSave`
- `deleteConfirm`
- `retry`

## Acceptance

- 不得删除系统默认分组。
- 不得把删除分组理解为删除书籍。
- 删除确认必须说明书籍去向。
- 保存失败必须保留用户已输入名称和原分组顺序。
- 拖拽或排序操作必须保留来源页滚动位置和筛选条件。
- 真实 DOM 必须包含完整 `LibraryShell` slots。
