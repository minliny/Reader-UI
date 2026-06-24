# 内容搜索组件规格

## Global

- 全局对象：`window.ContentSearchInput`
- 命名空间：`cs-`
- 默认画布：`840 x 1873`
- Shell：`ReaderShellKit.renderReaderShell(...)`
- Slots：`readerFrame`、`readingSurface`、`readerOverlayHost`、`readerModuleNav`、`bottomSheetHost`、`readerStateHost`

## Fixture

```ts
interface ContentSearchFixture {
  status: ReaderStatusInput;
  search: {
    label: "搜索本书内容";
    query: string;
    placeholder: "输入关键词";
    resultCount: string;
    clearLabel: "清空";
  };
  readingText: string[];
  panel: {
    title: "本书内容搜索";
    bookTitle: string;
    resultCount: string;
    tip: string;
  };
  filters: ContentSearchFilterInput[];
  results: ContentSearchResultInput[];
  feedback: {
    loading: BookActionFeedbackInput;
    empty: Required<BookActionFeedbackInput>;
    error: Required<BookActionFeedbackInput>;
    offline: Required<BookActionFeedbackInput>;
  };
}
```

## Public Components

### SearchInput

- Props：`label`、`query`、`placeholder`、`resultCount`、`clearLabel`
- Acceptance：必须保留关闭搜索、清空关键词和当前关键词，不得把本书搜索变成全局搜索。

### ResultRow

- Props：`title`、`meta`、`excerpt`、`progressLabel`
- Acceptance：必须包含章节名、段落位置、阅读进度、摘录和关键词高亮。

### EmptySearchState

- Props：`title`、`copy`、`primaryAction`
- Acceptance：必须显示 `无匹配结果`，并提供清空或改搜动作。

### KeyboardAvoidance

- Props：安全区高度由页面状态决定。
- Acceptance：搜索输入聚焦时不得遮挡结果列表主操作和底部系统手势区。

## States

- `default`：搜索框聚焦。
- `loading`：搜索中保留输入。
- `empty`：无匹配结果。
- `error`：索引失败可重试。
- `offline`：本地内容可搜时不阻断。

## Events

- `close`
- `queryChange`
- `clear`
- `filterChange`
- `previousResult`
- `nextResult`
- `openResult`
- `retry`

## Acceptance

- 必须渲染核心文案：`搜索正文`、`输入关键词`、`未找到结果`、`上一条`、`下一条`、`搜索本书内容`、`无匹配结果`、`搜索失败，请重试`。
- default 预览必须保持 `840 x 1873` 画布。
- 状态矩阵必须包含 5 张状态卡。
- 预览和状态矩阵必须由 `ReaderShellKit` 输出统一 `ReaderShell`，不能再复制独立阅读器 frame。
- 本页 `readerModuleNav` 为空宿主，不能嵌入 `bottomSheetHost` 或额外生成第二个模块导航 slot。
- 结果行点击语义是跳转并高亮，不改变来源或正文内容。
