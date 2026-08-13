# 排序与筛选 frontend-input

来源：

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 页面定位

`排序与筛选` 是从书架首页右侧排序/筛选按钮打开的底表。它只调整书架排序、筛选范围和展示状态，不改变书籍数据本身。

## 复用组件

- `LibraryPageKit.StackFrame`
- `LibraryPageKit.ContentRegion`
- `LibraryPageKit.BottomActionHost`
- `LibraryPageKit.SheetHost`
- `BottomSheet`
- `Chip`
- `PrimaryActionButton`
- `SecondaryActionButton`
- `Loading / Empty / Error` 状态容器

## 新增组件

- `RadioOption`：排序方式和排序顺序的单选项。
- `FilterChip`：筛选条件多选项。
- `ResetButton`：恢复默认排序和全部筛选。
- `ApplyButton`：应用并返回书架。

## 文件

- `fixture.json` / `fixture.js`：排序与筛选 props。
- `render.js`：`window.SortFilterInput` 渲染器。
- `../../shared-library-kit/kit.js` / `kit.css`：书架链路共享 shell。
- `components.css`：页面级样式，使用 `sf-` 前缀。
- `preview.html`：833 x 1888 设计稿预览。
- `state-matrix.html`：状态矩阵。

## 验收

- 底表、遮罩、来源书架上下文、状态层分层实现。
- 不新增当前书架不存在的筛选维度。
- 不改变书籍数据本身。
- 不加入网络搜索范围。
- 状态矩阵必须覆盖 default、selected、empty、error。
- 页面加入 `docs/ui-design/frontend-input/manifest.json` 后必须通过总校验脚本。
- 真实 DOM 必须包含完整 `LibraryShell` slots。
