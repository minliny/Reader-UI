# 目录与书签 frontend-input

来源：

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 页面定位

`目录与书签` 从阅读控制层底部 `目录` 按钮打开，用于在阅读页上下文内切换目录、书签、搜索章节和更多菜单。

## 复用组件

- `ReaderShell`
- `ReadingSurface`
- `ReaderOverlayHost`
- `BottomSheetHost`
- `BottomSheet`
- `ReaderModuleNav`
- `BrightnessSlider`
- `ChapterRow`
- `Loading / Empty / Error` 状态容器

## 新增组件

- `SegmentTab`：目录 / 书签切换。
- `BookmarkRow`：书签章节、摘录、位置和时间。
- `SearchField`：只过滤目录或书签。
- `MoreMenu`：只包含当前图中声明的缓存和筛选操作。

## 文件

- `fixture.json` / `fixture.js`：目录与书签 props。
- `render.js`：`window.ReadingTocBookmarkInput` 渲染器。
- `../../../frontend-input/shared-shell-kit/kit.js`：统一 `ReaderShell` 页面外壳。
- `../../../frontend-input/asset-library/icons.js`：统一语义图标来源。
- `components.css`：页面级样式，使用 `tb-` 前缀。
- `preview.html`：841 x 1870 设计稿预览。
- `state-matrix.html`：状态矩阵。

## 验收

- 当前阅读只能作为章节列表中的弱状态标识。
- 不新增评论、笔记社区或账号入口。
- 切换目录 / 书签不重建页面。
- 搜索只过滤当前目录或书签。
- 更多菜单只包含声明操作。
- 页面根节点必须由 `ReaderShellKit.renderReaderShell(...)` 输出。
- DOM 必须包含 `readerFrame`、`readingSurface`、`readerOverlayHost`、`bottomSheetHost`、`readerModuleNav`、`readerStateHost` 六个 slot。
- `readerModuleNav` 只能由 shell 顶层 slot 输出，不能嵌套在 `bottomSheetHost` 内重复声明。
- 页面加入 `docs/ui-design/frontend-input/manifest.json` 后必须通过总校验脚本。
