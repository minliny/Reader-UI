# 阅读入口 frontend-input

## 来源

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 目标

统一书架、详情、搜索结果进入阅读页时的打开、恢复、失败和返回规则。预览使用设计图中的阅读正文画布，并叠加入口恢复层；后续 `沉浸阅读` 页面再单独抽纯正文母版。

## 复用公共组件

- `ReaderShell`
- `ReadingSurface`
- `ReaderOverlayHost`
- `ReaderStateHost`
- `BookCard`
- `BookDetailHeader`
- `SearchResultItem`
- `PrimaryActionButton`
- `ErrorGuidance`

## 新增公共组件

- `StartReadingButton`
- `ContinueReadingButton`
- `OpenLoadingState`
- `RepairEntry`

## 文件

- `fixture.js` / `fixture.json`：阅读入口默认数据。
- `render.js`：`window.ReadingEntryInput` 渲染器，经由 `ReaderShellKit.renderReaderShell(...)` 输出统一阅读器框架。
- `components.css`：页面和状态矩阵样式。
- `preview.html`：默认设计稿预览。
- `state-matrix.html`：default、loading、error、offline 状态矩阵。
- `components.html`：组件拆分预览入口。
- `../../../frontend-input/shared-shell-kit/kit.js`：统一 `ReaderShell` 来源。
- `../../../frontend-input/asset-library/icons.js`：统一语义图标来源。

## 状态覆盖

- `default`：入口可点击，展示 `继续阅读` 和 `开始阅读`。
- `loading`：正在打开章节，提交中避免重复点击。
- `error`：内容加载异常，提供 `重试` 和 `更换来源`。
- `offline`：网络不可用但缓存可读，保留缓存阅读入口。

## 禁止项

- 不得常态展示书源信息。
- 不得绕过书籍详情修改配置。
- 不得丢失来源页滚动位置、筛选条件、分组和排序。
- 不新增账号、社区、会员、推荐流、广告或云端商业化入口。

## 验收要求

- 预览页根节点必须来自 `ReaderShellKit.renderReaderShell(...)`。
- DOM 必须包含并只使用统一语义 slot：`readerFrame`、`readingSurface`、`readerOverlayHost`、`readerModuleNav`、`bottomSheetHost`、`readerStateHost`。
- 入口浮层属于 `readerStateHost`，不是底表，也不允许嵌套进 `bottomSheetHost`。
- 状态矩阵必须包含 default、loading、error、offline 四张状态卡。
