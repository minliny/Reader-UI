# 书籍目录组件规格

## Render API

```ts
window.BookDirectoryInput.renderBookDirectory(
  target: HTMLElement,
  data: BookDirectoryFixture,
  options?: { state?: BookDirectoryState }
): void

window.BookDirectoryInput.renderBookDirectoryStateMatrix(
  target: HTMLElement,
  data: BookDirectoryFixture
): void
```

## Props

```ts
interface BookDirectorySummaryInput {
  title: string;
  sourceLabel: string;
  chapterCount: string;
}

interface BookDirectoryCurrentChapterInput {
  title: string;
  status: "当前阅读";
  progress: number;
}

interface ChapterRowInput {
  title: string;
  status: "未读" | "已读";
  isNew: boolean;
}
```

## Shell

- 使用 `LibraryShell`。
- 页面骨架由 `LibraryPageKit.renderPage` 输出。
- 固定 slots：`stackFrame`、`backTopBar`、`contentRegion`、`bottomActionHost`、`sheetHost`、`dialogHost`、`stateHost`。

## States

- `default`：摘要栏、当前阅读行和章节列表。
- `loading`：保留顶部栏和摘要栏，章节列表显示骨架。
- `empty`：展示 `暂无目录`、重试、返回详情。
- `error`：展示 `目录加载失败`、重试、返回详情。

## Events

- `back`
- `openCurrentChapter`
- `openChapter`
- `retry`
- `backToDetail`

## Acceptance

- 不在本页生成主 Tab 导航。
- 不在本页生成换源入口。
- 不在章节列表上方生成筛选 chip 行。
- 当前阅读章节不使用独立左侧图标。
- `ChapterRow` 必须可被阅读链路 `目录与书签` 复用。
- 真实 DOM 必须包含完整 `LibraryShell` slots。
