# 沉浸阅读 frontend-input

## 来源

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 目标

定义阅读默认态母版，拆分阅读背景层、正文排版层、四角弱信息层和透明点击热区层。该页面不包含主底部导航，不展示总章节数。

## 复用公共组件

- `ReaderShell`
- `ReadingSurface`
- `ReaderOverlayHost`
- `ReaderStateHost`
- 阅读外观主题 token
- 阅读设置中的屏幕/翻页配置
- 阅读控制层点击热区交互规则

## 新增公共组件

- `ReadingParagraph`
- `WeakInfoText`
- `ProgressInfo`
- `TapZone`

## 文件

- `fixture.js` / `fixture.json`：沉浸阅读默认数据。
- `render.js`：`window.ImmersiveReadingInput` 渲染器，经由 `ReaderShellKit.renderReaderShell(...)` 输出统一阅读器框架。
- `components.css`：页面和状态矩阵样式。
- `preview.html`：默认设计稿预览。
- `state-matrix.html`：default、loading、error、offline 状态矩阵。
- `components.html`：组件拆分预览入口。
- `../../../frontend-input/shared-shell-kit/kit.js`：统一 `ReaderShell` 来源。
- `../../../frontend-input/asset-library/icons.js`：统一语义图标来源。

## 状态覆盖

- `default`：正文沉浸阅读，四角弱信息和透明点击热区分层。
- `loading`：章节加载中，保留阅读背景。
- `error`：章节失败，轻量错误和重试。
- `offline`：显示缓存内容并提示网络不可用。

## 禁止项

- 不显示主底部导航。
- 右下角不得显示总章节数，只显示当前章节。
- 四角弱信息不参与正文排版边距计算。
- 不新增账号、社区、会员、推荐流、广告或云端商业化入口。

## 验收要求

- 预览页根节点必须来自 `ReaderShellKit.renderReaderShell(...)`。
- DOM 必须包含并只使用统一语义 slot：`readerFrame`、`readingSurface`、`readerOverlayHost`、`readerModuleNav`、`bottomSheetHost`、`readerStateHost`。
- 本页没有模块导航和底表内容，`readerModuleNav`、`bottomSheetHost` 作为空宿主保留。
- 状态反馈属于 `readerStateHost`，不能覆盖或替换正文阅读面。
- 状态矩阵必须包含 default、loading、error、offline 四张状态卡。
