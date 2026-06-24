# 目录与书签组件规格

## Render API

```ts
window.ReadingTocBookmarkInput.renderReadingTocBookmark(
  target: HTMLElement,
  data: ReadingTocBookmarkFixture,
  options?: { state?: ReadingTocBookmarkState }
): void

window.ReadingTocBookmarkInput.renderReadingTocBookmarkStateMatrix(
  target: HTMLElement,
  data: ReadingTocBookmarkFixture
): void
```

## Props

```ts
interface ReadingChapterRowInput {
  title: string;
  status: "缓存" | "已读" | "未读" | string;
  current: boolean;
  read: boolean;
}

interface BookmarkRowInput {
  chapter: string;
  excerpt: string;
  location: string;
  time: string;
}
```

## States

- `default`：目录列表。
- `bookmark`：书签列表。
- `search`：搜索结果。
- `empty`：暂无书签。
- `loading`：目录加载中。
- `error`：目录加载失败。
- `more_menu`：更多菜单展开。

## Events

- `back`
- `sourceChange`
- `segmentChange`
- `chapterJump`
- `bookmarkJump`
- `searchChange`
- `moreMenuOpen`
- `cacheCurrentVolume`
- `filterUnread`
- `retry`

## Acceptance

- 页面根节点必须由 `ReaderShellKit.renderReaderShell(...)` 输出，并带有 `data-shell="ReaderShell"`。
- DOM 必须包含 `readerFrame`、`readingSurface`、`readerOverlayHost`、`bottomSheetHost`、`readerModuleNav`、`readerStateHost` 六个 slot。
- `readerModuleNav` 只能由 shell 顶层 slot 输出，不能嵌套在 `bottomSheetHost` 内重复声明。
- 不新增评论 / 笔记社区。
- 不设置独立当前章节摘要卡。
- 当前阅读只可作为章节列表中的弱状态标识。
- 搜索只过滤目录或书签。
- 失败时保留当前阅读位置。
