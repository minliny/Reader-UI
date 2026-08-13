# 自动翻页组件规格

## Global

- 全局对象：`window.AutoPageInput`
- 命名空间：`ap-`
- 默认画布：`840 x 1871`
- Shell：`ReaderShellKit.renderReaderShell(...)`
- Slots：`readerFrame`、`readingSurface`、`readerOverlayHost`、`readerModuleNav`、`bottomSheetHost`、`readerStateHost`

## Fixture

```ts
interface AutoPageFixture {
  status: ReaderStatusInput;
  topControl: {
    title: "自动翻页";
    sourceLine: string;
  };
  readingText: string[];
  speed: AutoPageSpeedInput;
  modes: AutoPageModeInput[];
  optionsTitle: "更多选项";
  options: AutoPageOptionInput[];
  actions: {
    cancelLabel: "取消";
    startLabel: "开始自动翻页";
    stopLabel: "停止";
  };
  runningCapsule: AutoPageRunningCapsuleInput;
  feedback: {
    error: Required<BookActionFeedbackInput>;
  };
}
```

## Public Components

### SpeedSlider

- Props：`title`、`valueLabel`、`value`、`slowLabel`、`fastLabel`
- Acceptance：必须显示 `翻页速度`、当前速度、慢/快端点和固定滑块位置。

### StartButton

- Props：`label`
- Acceptance：主按钮必须使用 `开始自动翻页`，不能替换为 `确定`。

### StopButton

- Props：`label`
- Acceptance：运行态停止按钮必须与暂停按钮同时可辨识，不能用暂停替代停止。

### AutoPageOptionRow

- Props：`title`、`meta`、`icon`、`enabled`
- Acceptance：行内开关不改变行高；文案必须覆盖屏幕常亮、到章末停止、音量键调速。

## States

- `default`：设置覆盖层。
- `running`：运行胶囊。
- `paused`：暂停态。
- `error`：无法翻页时停止并提示。

## Events

- `close`
- `more`
- `speedChange`
- `modeChange`
- `toggleOption`
- `startAutoPage`
- `pauseAutoPage`
- `continueAutoPage`
- `stopAutoPage`
- `retry`

## Acceptance

- 必须渲染核心文案：`自动翻页`、`开始`、`暂停`、`停止`、`翻页速度`。
- default 预览必须保持 `840 x 1871` 画布。
- 状态矩阵必须包含 4 张状态卡。
- 预览和状态矩阵必须由 `ReaderShellKit` 输出统一 `ReaderShell`，不能再复制独立阅读器 frame。
- 本页 `readerModuleNav` 为空宿主，不能嵌入 `bottomSheetHost` 或额外生成第二个模块导航 slot。
- 失败态必须说明原因和下一步，不能只显示通用失败。
- 返回和关闭不得丢失当前章节或阅读位置。
