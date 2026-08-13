# 本地书导入 frontend-input

来源：

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 页面定位

`本地书导入` 用于通过 Android 系统文件选择器导入 TXT / EPUB 文件，展示解析进度和逐项导入结果。

## 复用组件

- `LibraryPageKit.StackFrame`
- `LibraryPageKit.BackTopBar`
- `LibraryPageKit.ContentRegion`
- `LibraryPageKit.BottomActionHost`
- `PrimaryActionButton`
- `SecondaryActionButton`
- `Loading / Error` 状态容器

## 新增组件

- `ImportIntroCard`：说明系统文件选择器授权边界。
- `SupportedFormatRow`：展示支持格式。
- `FilePickerButton`：唯一默认主操作，调用系统文件选择器。
- `ImportProgressCard`：展示解析进度和当前文件。
- `ImportResultSummary`：汇总成功、跳过和失败数量。
- `ImportResultRow`：展示文件名、状态和失败原因。
- `ErrorGuidance`：说明失败原因和下一步。
- `BottomActionBar`：结果页底部操作。

## 文件

- `fixture.json` / `fixture.js`：本地书导入 props。
- `render.js`：`window.LocalImportInput` 渲染器。
- `../../shared-library-kit/kit.js` / `kit.css`：书架链路共享 shell。
- `components.css`：页面级样式，使用 `li-` 前缀。
- `preview.html`：853 x 1844 设计稿预览。
- `state-matrix.html`：状态矩阵。

## 验收

- 默认页只有 `选择文件` 一个主操作。
- 不请求全盘扫描权限，不默认申请 `MANAGE_EXTERNAL_STORAGE`。
- 文件访问只来自 Android 系统文件选择器返回的用户授权 URI。
- 取消系统选择器不是错误状态。
- 部分失败和全部失败必须展示失败原因。
- 重复文件不当作失败，使用 `已存在，已跳过`。
- 结果页底部主按钮只能有一个。
- 真实 DOM 必须包含完整 `LibraryShell` slots。
