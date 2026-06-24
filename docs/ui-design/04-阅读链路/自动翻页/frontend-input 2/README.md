# 自动翻页 frontend-input

## 来源

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 目标

把阅读中的自动翻页配置和运行控制抽象成可复用前端输入件。页面保留阅读正文、顶部浮层和底部控制面板三层结构，不重排章节正文，也不引入主底部导航。

## 复用公共组件

- `ReaderShell`
- `ReadingSurface`
- `ReaderOverlayHost`
- `BottomSheetHost`
- `ProgressSlider` 的滑杆语义
- `RunningCapsule`
- `Switch`
- `SettingRow`

## 新增公共组件

- `SpeedSlider`
- `StartButton`
- `StopButton`

## 文件

- `fixture.js` / `fixture.json`：自动翻页默认数据。
- `render.js`：`window.AutoPageInput` 渲染器，经由 `ReaderShellKit.renderReaderShell(...)` 输出统一阅读器框架。
- `components.css`：页面和状态矩阵样式。
- `preview.html`：默认设计稿预览。
- `state-matrix.html`：default、running、paused、error 状态矩阵。
- `components.html`：组件拆分预览入口。
- `../../../frontend-input/shared-shell-kit/kit.js`：统一 `ReaderShell` 来源。
- `../../../frontend-input/asset-library/icons.js`：统一语义图标来源。

## 状态覆盖

- `default`：设置覆盖层，显示速度、模式、更多选项、取消和开始自动翻页。
- `running`：正在自动翻页胶囊，支持暂停和停止。
- `paused`：暂停态，保留速度和阅读位置，可继续或停止。
- `error`：无法翻页时停止并提示，提供重试。

## 禁止项

- 不修改章节内容。
- 不遮挡阅读控制层主操作的语义边界。
- 不使用游戏化动画。
- 不新增账号、社区、会员、推荐流、广告或云端商业化入口。

## 验收要求

- 预览页根节点必须来自 `ReaderShellKit.renderReaderShell(...)`。
- DOM 必须包含并只使用统一语义 slot：`readerFrame`、`readingSurface`、`readerOverlayHost`、`readerModuleNav`、`bottomSheetHost`、`readerStateHost`。
- 本页没有模块导航按钮，`readerModuleNav` 作为空宿主保留，不允许嵌套进 `bottomSheetHost`。
- 状态矩阵必须包含 default、running、paused、error 四张状态卡。
