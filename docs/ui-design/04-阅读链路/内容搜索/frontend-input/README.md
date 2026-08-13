# 内容搜索 frontend-input

## 来源

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 目标

在当前书籍正文中搜索关键词，并跳转到匹配位置。页面只搜索本书内容，不扩展到全网搜索，也不修改当前书籍来源。

## 复用公共组件

- `ReaderShell`
- `ReadingSurface`
- `ReaderOverlayHost`
- `BottomSheetHost`
- `SearchField`
- `SegmentTab`
- `EmptyStateCard`
- `LoadingState`
- `ErrorState`

## 新增公共组件

- `SearchInput`
- `ResultRow`
- `EmptySearchState`
- `KeyboardAvoidance`

## 文件

- `fixture.js` / `fixture.json`：内容搜索默认数据。
- `render.js`：`window.ContentSearchInput` 渲染器，经由 `ReaderShellKit.renderReaderShell(...)` 输出统一阅读器框架。
- `components.css`：页面和状态矩阵样式。
- `preview.html`：默认设计稿预览。
- `state-matrix.html`：default、loading、empty、error、offline 状态矩阵。
- `components.html`：组件拆分预览入口。
- `../../../frontend-input/shared-shell-kit/kit.js`：统一 `ReaderShell` 来源。
- `../../../frontend-input/asset-library/icons.js`：统一语义图标来源。

## 状态覆盖

- `default`：搜索框聚焦，结果列表和正文关键词高亮。
- `loading`：搜索中保留关键词和范围，只替换结果区。
- `empty`：无匹配结果，提供清空关键词。
- `error`：搜索失败，保留上下文并提供重试。
- `offline`：本地内容可搜时不阻断，只提示在线章节不刷新。

## 禁止项

- 不得搜索全网书籍。
- 不得改变当前书籍来源。
- 不得遮挡系统键盘安全区。
- 不新增账号、社区、会员、推荐流、广告或云端商业化入口。

## 验收要求

- 预览页根节点必须来自 `ReaderShellKit.renderReaderShell(...)`。
- DOM 必须包含并只使用统一语义 slot：`readerFrame`、`readingSurface`、`readerOverlayHost`、`readerModuleNav`、`bottomSheetHost`、`readerStateHost`。
- 本页没有模块导航按钮，`readerModuleNav` 作为空宿主保留，不允许嵌套进 `bottomSheetHost`。
- 状态矩阵必须包含 default、loading、empty、error、offline 五张状态卡。
