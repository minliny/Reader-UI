# 分组管理 frontend-input

来源：

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 页面定位

`分组管理` 从书架更多菜单或分组 chip 管理入口进入，用于新增、重命名、排序和删除书架分组。

## 复用组件

- `LibraryPageKit.StackFrame`
- `LibraryPageKit.BackTopBar`
- `LibraryPageKit.ContentRegion`
- `LibraryPageKit.DialogHost`
- `ConfirmDialog`
- `Loading / Empty / Error` 状态容器

## 新增组件

- `GroupRow`：分组列表行，区分系统分组和自定义分组。
- `AddGroupButton`：顶部新建入口。
- `RenameDialog`：新建和重命名共用命名弹窗。
- `DeleteConfirmDialog`：删除分组确认弹窗，说明书籍去向。
- `ReorderHandle`：分组排序手柄。

## 文件

- `fixture.json` / `fixture.js`：分组管理 props。
- `render.js`：`window.GroupManagementInput` 渲染器。
- `../../shared-library-kit/kit.js` / `kit.css`：书架链路共享 shell。
- `components.css`：页面级样式，使用 `gm-` 前缀。
- `preview.html`：833 x 1888 设计稿预览，默认展示新建分组弹窗。
- `state-matrix.html`：状态矩阵。

## 验收

- `全部` 是系统聚合入口，不可编辑。
- `未分组` 可以参与排序但不可删除。
- 删除分组不等于删除书籍，必须说明书籍会移入未分组。
- 保存失败保留原分组顺序和已输入名称。
- 提交中禁用重复操作。
- 不出现社交、推荐、账号或云端商业化分组。
- 页面加入 `docs/ui-design/frontend-input/manifest.json` 后必须通过总校验脚本。
- 真实 DOM 必须包含完整 `LibraryShell` slots。
