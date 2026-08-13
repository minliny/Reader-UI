# 内容替换 frontend-input

## 来源

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 目标

管理阅读时的正文替换规则，支持快捷启停、规则编辑、测试结果和保存。替换只影响当前阅读显示，不永久修改原始章节。

## 复用公共组件

- `ReaderShell`
- `ReadingSurface`
- `ReaderOverlayHost`
- `BottomSheetHost`
- `SettingRow`
- `Switch`
- `PreviewCard`
- `ConfirmDialog`
- `BottomActionBar`
- `SearchInput`

## 新增公共组件

- `TextField`
- `ReplacementRuleRow`
- `PatternInput`
- `SaveButton`

## 文件

- `fixture.js` / `fixture.json`：内容替换默认数据。
- `render.js`：`window.ContentReplacementInput` 渲染器，经由 `ReaderShellKit.renderReaderShell(...)` 输出统一阅读器框架。
- `components.css`：页面和状态矩阵样式。
- `preview.html`：默认设计稿预览。
- `state-matrix.html`：default、edit、empty、loading、error 状态矩阵。
- `components.html`：组件拆分预览入口。
- `../../../frontend-input/shared-shell-kit/kit.js`：统一 `ReaderShell` 来源。
- `../../../frontend-input/asset-library/icons.js`：统一语义图标来源。

## 状态覆盖

- `default`：规则列表，总开关、规则开关、替换预览和底部操作。
- `edit`：新增/编辑规则，覆盖替换前、替换后、测试和保存。
- `empty`：无规则时提供新增。
- `loading`：读取或应用替换中。
- `error`：规则格式错误时行内提示并保留输入。

## 禁止项

- 不得自动上传正文。
- 不得把替换规则当成书源规则。
- 不得在未确认时永久修改原始章节。
- 不新增账号、社区、会员、推荐流、广告或云端商业化入口。

## 验收要求

- 预览页根节点必须来自 `ReaderShellKit.renderReaderShell(...)`。
- DOM 必须包含并只使用统一语义 slot：`readerFrame`、`readingSurface`、`readerOverlayHost`、`readerModuleNav`、`bottomSheetHost`、`readerStateHost`。
- 本页没有模块导航按钮，`readerModuleNav` 作为空宿主保留，不允许嵌套进 `bottomSheetHost`。
- 状态矩阵必须包含 default、edit、empty、loading、error 五张状态卡。
