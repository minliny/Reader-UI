# 沉浸阅读组件规格

## Global

- 全局对象：`window.ImmersiveReadingInput`
- 命名空间：`ir-`
- 默认画布：`835 x 1884`
- Shell：`ReaderShellKit.renderReaderShell(...)`
- Slots：`readerFrame`、`readingSurface`、`readerOverlayHost`、`readerModuleNav`、`bottomSheetHost`、`readerStateHost`

## Fixture

```ts
interface ImmersiveReadingFixture {
  info: {
    topLeft: string;
    time: string;
    progress: string;
    chapterOnly: string;
  };
  reading: {
    title: string;
    paragraphs: string[];
  };
  zones: TapZoneInput[];
  feedback: {
    loading: BookActionFeedbackInput;
    error: Required<BookActionFeedbackInput>;
    offline: Required<BookActionFeedbackInput>;
  };
  rules: {
    chapterOnlyNote: string;
  };
}
```

## Public Components

### ReadingParagraph

- Props：`text`
- Acceptance：正文段落使用阅读字体、固定行高和首行缩进，不承载点击逻辑。

### WeakInfoText

- Props：`position`、`text`
- Acceptance：四角弱信息属于独立信息层，与控制层顶部栏互斥。

### ProgressInfo

- Props：`progress`、`chapterOnly`
- Acceptance：左下显示阅读进度，右下只显示当前章节，不显示总章节数。

### TapZone

- Props：`type`、`label`
- Acceptance：点击热区透明存在，不作为可见组件，也不能承载唯一关键操作。

## States

- `default`：正文沉浸阅读。
- `loading`：章节加载中保留阅读背景。
- `error`：章节失败显示轻量错误和重试。
- `offline`：可显示缓存内容。

## Events

- `tapPrevious`
- `tapCenter`
- `tapNext`
- `retry`
- `continueCached`
- `backToSource`

## Acceptance

- 必须渲染核心文案：`雨夜`、`38%`、`第 32 章`、`正在加载`、`加载失败，请重试`、`网络不可用，请稍后重试`。
- default 预览必须保持 `835 x 1884` 画布。
- 状态矩阵必须包含 4 张状态卡。
- 预览和状态矩阵必须由 `ReaderShellKit` 输出统一 `ReaderShell`，不能再复制独立阅读器 frame。
- 状态反馈必须渲染在 `readerStateHost`，不能替换正文阅读面。
- 右下角不得显示总章节数，不得出现主底部导航。
