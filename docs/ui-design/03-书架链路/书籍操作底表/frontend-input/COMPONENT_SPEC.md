# 书籍操作底表组件规格

## Render API

```ts
window.BookActionSheetInput.renderBookActionSheet(
  target: HTMLElement,
  data: BookActionSheetFixture,
  options?: { state?: BookActionSheetState }
): void

window.BookActionSheetInput.renderBookActionSheetStateMatrix(
  target: HTMLElement,
  data: BookActionSheetFixture
): void
```

## Props

```ts
interface BookActionBookInput {
  title: string;
  author: string;
  chapter: string;
  progress: number;
  coverLabel: string;
  coverTone: "blue" | "brown" | "green";
}

interface BookActionInput {
  type: "edit" | "delete";
  title: "修改" | "删除";
  copy: string;
  tone: "normal" | "danger";
}

interface ConfirmDialogInput {
  title: "删除书架记录？";
  copy: string;
  cancelLabel: "取消";
  confirmLabel: "确认移除";
  loadingLabel: string;
}
```

## Shell

- 使用 `LibraryShell`。
- 页面骨架由 `LibraryPageKit.renderPage` 输出。
- `SheetHost` 承载底表，`DialogHost` 承载危险操作确认弹窗。
- 固定 slots：`stackFrame`、`backTopBar`、`contentRegion`、`bottomActionHost`、`sheetHost`、`dialogHost`、`stateHost`。

## States

- `default`：底表只展示书籍摘要、修改和删除两项。
- `danger`：点击删除后打开二次确认。
- `loading`：确认移除提交中，禁用重复点击。
- `error`：删除失败，保留底表、当前书籍和来源上下文。

## Events

- `dismiss`
- `edit`
- `deleteRequest`
- `deleteCancel`
- `deleteConfirm`
- `deleteRetry`

## Acceptance

- 不得生成第三个主操作入口。
- `删除` 必须说明只移除书架记录，不删除本地文件或网络来源。
- `确认移除` 不得被替换为含糊的 `确定`。
- 提交中按钮禁用，失败后允许重试或取消。
- 关闭顺序为先关闭确认弹窗，再关闭底表，再返回入口页。
- 真实 DOM 必须包含完整 `LibraryShell` slots。
