# 书籍详情组件规格

## Render API

```ts
window.BookDetailInput.renderBookDetail(
  target: HTMLElement,
  data: BookDetailFixture,
  options?: { state?: BookDetailState }
): void

window.BookDetailInput.renderBookDetailStateMatrix(
  target: HTMLElement,
  data: BookDetailFixture
): void
```

## Props

```ts
interface BookDetailBookInput {
  title: string;
  author: string;
  source: string;
  latest: string;
  cover: string;
  inBookshelf: boolean;
  readAction: string;
  bookshelfAction: string;
}

interface BookDetailChapterInput {
  title: string;
  state: "未读" | "已读";
  isNew: boolean;
}
```

## Shell

- 使用 `LibraryShell`。
- 页面骨架由 `LibraryPageKit.renderPage` 输出。
- 固定 slots：`stackFrame`、`backTopBar`、`contentRegion`、`bottomActionHost`、`sheetHost`、`dialogHost`、`stateHost`。

## States

- `default`：完整书籍详情、20 条章节预览、简介。
- `loading`：章节局部加载。
- `empty`：暂无章节预览。
- `error`：加载失败。
- `offline`：网络不可用但保留缓存阅读。
- `permission`：本地书籍详情需要授权。
- `source_sheet`：详情页内换源底表。

## Events

- `back`
- `more`
- `sourceSheetOpen`
- `sourceRefresh`
- `sourceSelect`
- `sourceConfirm`
- `sourceCancel`
- `read`
- `addToBookshelf`
- `openDirectory`
- `openChapter`
- `introExpand`
- `retry`
- `requestPermission`

## Acceptance

- 不新增账号、社区、广告、会员或推荐流。
- 不把简介放到章节预览上方。
- 不把章节预览缩成 3 到 4 条固定列表。
- 换源底表关闭后应回到书籍详情当前滚动位置。
- 图片缺失数必须为 0。
- 真实 DOM 必须包含完整 `LibraryShell` slots。
