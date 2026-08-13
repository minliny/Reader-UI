# 换源组件规格

## Global

- 全局对象：`window.SourceSwitchInput`
- 命名空间：`sw-`
- 默认画布：`1690 x 931`
- Shell：`ReaderShellKit.renderFlowShell(...)`
- Slots：`flowFrame`、`stepRegion`、`comparisonRegion`、`resultRegion`、`stateHost`
- Layer Model：换源窗口是阅读控制层上的同层弹窗，不是覆盖页；顶部阅读栏、底部控制面板、亮度栏和四模块导航必须在换源打开时保持可操作。
- StateHost：在当前手机 demo 中不展示底部流程摘要；状态摘要只保留在横向审计输入件，不进入阅读中的换源窗口。

## Fixture

```ts
interface SourceSwitchFixture {
  status: ReaderStatusInput;
  reader: SourceSwitchReaderInput;
  controls: SourceSwitchControlInput;
  sheet: SourceSwitchSheetInput;
  sources: SourceCandidateInput[];
  checking: SourceCheckingInput;
  success: SourceSwitchSuccessInput;
  feedback: SourceSwitchFeedbackInput;
}
```

## Public Components

### SourceCandidateRow

- Props：`name`、`chapter`、`updated`、`latency`、`status`
- Acceptance：必须同时展示来源名、章节、延迟、可用状态和切换入口。

### CurrentSourceBadge

- Props：`label`
- Acceptance：当前来源必须显示 `当前`，并禁用重复切换。

### DetectStatusBadge

- Props：`status`
- Acceptance：检测中必须显示 `检测中`，可用/失效必须语义分离。

### SwitchSourceButton

- Props：`label`
- Acceptance：必须显示 `切换` 或 `切换来源`，提交中禁止重复点击。

## States

- `default`：来源列表。
- `loading`：来源加载。
- `empty`：无可用来源。
- `error`：检测失败。
- `offline`：网络不可用。
- `permission`：权限说明。

## Events

- `backToReading`
- `openSourceSheet`
- `filterChange`
- `startDetect`
- `cancelDetect`
- `switchSource`
- `retry`
- `grantPermission`

## Acceptance

- 必须渲染核心文案：`换源`、`当前来源`、`检测中`、`可用`、`失效`、`切换来源`、`重试`。
- 预览必须保持 `1690 x 931` 横向流程画布。
- 状态矩阵必须包含 6 张状态卡。
- 预览和状态矩阵必须由 `ReaderShellKit` 输出统一 `FlowShell`，不能再复制独立横向 frame。
- 手机 demo 的换源窗口不得使用全屏遮罩、暗色聚焦层或 `pointer-events: none` 禁用阅读控制层。
- 换源窗口打开后，用户必须能直接点击顶部阅读栏、底部控制面板和四模块导航；不需要先关闭换源窗口。
- 页面图标必须来自 `asset-library/icons.js`，不能保留页面级内联 SVG。
- 切换成功必须返回阅读页并保留阅读位置。
