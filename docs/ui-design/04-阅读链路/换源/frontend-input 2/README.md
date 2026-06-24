# 换源 frontend-input

## 来源

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 目标

在阅读中检测和切换可用来源，覆盖横向流程：基线阅读控制层、打开换源底表、内联检测中、切换成功返回阅读页。

## 复用公共组件

- `FlowShell`
- `StepRegion`
- `ComparisonRegion`
- `ResultRegion`
- `StateHost`
- `SourceStatusBar`
- `SearchField`
- `FilterChip`
- `ConfirmDialog`
- `LoadingState`
- `ErrorState`

## 新增公共组件

- `SourceCandidateRow`
- `CurrentSourceBadge`
- `DetectStatusBadge`
- `SwitchSourceButton`

## 文件

- `fixture.js` / `fixture.json`：换源默认数据。
- `render.js`：`window.SourceSwitchInput` 渲染器，经由 `ReaderShellKit.renderFlowShell(...)` 输出统一横向流程框架。
- `components.css`：横向流程和状态矩阵样式。
- `preview.html`：1690 x 931 横向流程设计稿。
- `state-matrix.html`：default、loading、empty、error、offline、permission 状态矩阵。
- `components.html`：组件拆分预览入口。
- `../../../frontend-input/shared-shell-kit/kit.js`：统一 `FlowShell` 来源。
- `../../../frontend-input/asset-library/icons.js`：统一语义图标来源。

## 状态覆盖

- `default`：来源列表和切换按钮可达。
- `loading`：刷新来源列表中。
- `empty`：无可用来源。
- `error`：检测失败并可重试。
- `offline`：网络不可用，保留本地缓存。
- `permission`：网络权限说明和授权入口。

## 禁止项

- 不新增未声明入口。
- 不引入账号、社区、广告、会员或推荐流。
- 不压缩触控区来适配小屏。
- 不在提交中允许重复点击。

## 验收要求

- 预览页根节点必须来自 `ReaderShellKit.renderFlowShell(...)`。
- DOM 必须包含并只使用统一语义 slot：`flowFrame`、`stepRegion`、`comparisonRegion`、`resultRegion`、`stateHost`。
- 四步横向流程必须保持：基线阅读控制层、打开换源底表、内联检测中、切换成功返回阅读页。
- 状态矩阵必须包含 default、loading、empty、error、offline、permission 六张状态卡，且每张卡内部也必须通过 `FlowShell` 输出。
- 图标必须来自公共素材库，不允许保留页面级内联 SVG。
