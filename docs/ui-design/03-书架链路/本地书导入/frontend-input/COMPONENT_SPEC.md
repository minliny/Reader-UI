# 本地书导入组件规格

## Render API

```ts
window.LocalImportInput.renderLocalImport(
  target: HTMLElement,
  data: LocalImportFixture,
  options?: { state?: LocalImportState }
): void

window.LocalImportInput.renderLocalImportStateMatrix(
  target: HTMLElement,
  data: LocalImportFixture
): void
```

## Props

```ts
interface ImportResultRowInput {
  fileName: string;
  status: "已导入" | "已存在，已跳过" | "格式不支持" | "解析失败";
  reason: string;
  tone: "success" | "skip" | "failed";
}
```

## States

- `default`：导入说明、支持格式、`选择文件`。
- `importing`：解析进度、当前文件、禁用重复导入。
- `success`：成功摘要、结果列表、`完成`。
- `partial_failed`：混合结果列表、失败原因、`重新选择`、`完成`。
- `failed`：失败摘要、失败原因、`重新选择`、`返回书架`。
- `picker_cancelled`：取消系统选择器后返回书架，不展示错误页。

## Shell

- 使用 `LibraryShell`。
- 页面骨架由 `LibraryPageKit.renderPage` 输出。
- 导入说明、权限说明、格式、流程、进度和结果列表进入 `ContentRegion`。
- 结果页底部操作进入 `BottomActionHost`。

## Events

- `back`
- `openSystemFilePicker`
- `pickerCancelled`
- `importProgress`
- `resultRowOpen`
- `chooseAgain`
- `done`
- `backToBookshelf`

## Acceptance

- `FilePickerButton` 是默认页唯一主操作。
- `ImportProgressCard` 不允许重复触发选择文件。
- `ImportResultRow` 必须包含文件名、状态和失败原因；成功项可省略失败原因。
- 不请求全盘扫描权限，只使用系统文件选择器返回的授权 URI。
- 取消选择不是错误状态。
- 底部操作栏主按钮只能有一个。
- 真实 DOM 必须包含完整 `LibraryShell` slots。
