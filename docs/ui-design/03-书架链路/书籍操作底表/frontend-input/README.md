# 书籍操作底表 frontend-input

来源：

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 页面定位

`书籍操作底表` 从书架书籍更多按钮或长按书籍条目打开。它只提供单本书的最小操作入口：修改和移除书架。

## 复用组件

- `BottomSheet`
- `LibraryPageKit.StackFrame / ContentRegion / SheetHost / DialogHost / StateHost`
- `BookRow` 语义中的书籍上下文
- `ProgressBar`
- `Loading / Error` 状态容器

## 新增组件

- `BookSummary`：底表内当前书籍摘要。
- `ActionRow.Edit`：进入书籍详情进行配置修改。
- `ActionRow.Delete`：危险操作行，触发二次确认。
- `ConfirmDialog`：危险操作确认弹窗。

## 文件

- `fixture.json` / `fixture.js`：书籍操作底表 props。
- `../../shared-library-kit/kit.js` / `kit.css`：书架链路共享 shell。
- `render.js`：`window.BookActionSheetInput` 渲染器，页面骨架由 `LibraryPageKit` 输出。
- `components.css`：页面级样式，使用 `ba-` 前缀。
- `preview.html`：833 x 1888 设计稿预览。
- `state-matrix.html`：状态矩阵。

## 验收

- 默认态只展示 `修改` 和 `删除` 两个操作。
- `删除` 等于移除书架，不删除本地文件或网络来源。
- 删除必须二次确认，确认按钮文案为 `确认移除`。
- 提交中禁用重复点击。
- 失败时保留来源书架、筛选条件和当前书籍上下文。
- 不出现换源、目录、分组、阅读设置等未声明入口。
- 页面加入 `docs/ui-design/frontend-input/manifest.json` 后必须通过总校验脚本。
- 必须存在 `LibraryShell` DOM slots：`stackFrame`、`backTopBar`、`contentRegion`、`bottomActionHost`、`sheetHost`、`dialogHost`、`stateHost`。
