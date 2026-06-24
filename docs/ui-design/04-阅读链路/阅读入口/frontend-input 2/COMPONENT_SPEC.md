# 阅读入口组件规格

## Global

- 全局对象：`window.ReadingEntryInput`
- 命名空间：`re-`
- 默认画布：`835 x 1884`
- Shell：`ReaderShellKit.renderReaderShell(...)`
- Slots：`readerFrame`、`readingSurface`、`readerOverlayHost`、`readerModuleNav`、`bottomSheetHost`、`readerStateHost`

## Fixture

```ts
interface ReadingEntryFixture {
  status: ReaderStatusInput;
  reader: {
    title: string;
    progress: string;
    chapterLabel: string;
    paragraphs: string[];
  };
  entry: {
    title: "阅读入口";
    source: string;
    context: string;
    resumeTitle: "继续阅读";
    resumeMeta: string;
    startTitle: "开始阅读";
    startMeta: string;
    backLabel: string;
    continueLabel: "继续阅读";
    startLabel: "开始阅读";
  };
  feedback: {
    loading: OpenLoadingStateInput;
    error: RepairEntryInput;
    offline: OfflineReadingEntryInput;
  };
}
```

## Public Components

### StartReadingButton

- Props：`label`、`meta`
- Acceptance：必须显示 `开始阅读`，表达从章节开头或指定章节重新打开。

### ContinueReadingButton

- Props：`label`、`meta`
- Acceptance：必须显示 `继续阅读`，同时保留章节和进度信息。

### OpenLoadingState

- Props：`title`、`copy`
- Acceptance：必须显示 `正在打开`，提交中禁止重复点击主按钮。

### RepairEntry

- Props：`title`、`copy`、`retryLabel`、`repairLabel`
- Acceptance：必须显示 `内容加载异常`、`重试`、`更换来源`，并保留来源上下文。

## States

- `default`：入口可点击。
- `loading`：正在打开章节。
- `error`：内容加载异常。
- `offline`：缓存可读时进入缓存章节。

## Events

- `backToSource`
- `continueReading`
- `startReading`
- `openLoading`
- `retryOpen`
- `switchSource`
- `continueCached`

## Acceptance

- 必须渲染核心文案：`开始阅读`、`继续阅读`、`正在打开`、`内容加载异常`、`更换来源`、`重试`。
- default 预览必须保持 `835 x 1884` 画布。
- 状态矩阵必须包含 4 张状态卡。
- 预览和状态矩阵必须由 `ReaderShellKit` 输出统一 `ReaderShell`，不能再复制独立阅读器 frame。
- 入口浮层必须渲染在 `readerStateHost`，不能放入 `bottomSheetHost`。
- 失败和离线状态必须保留阅读正文背景和来源上下文，不进入空白页。
