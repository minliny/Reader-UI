# 书籍详情 frontend-input

来源：

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 页面定位

`书籍详情` 承接书架、搜索、发现和 RSS 的书籍入口，展示书籍头部信息、章节预览、简介、阅读入口、加入书架状态和详情页内换源底表。

## 复用组件

- `AppFrame / StatusBar`
- `LibraryPageKit.StackFrame / BackTopBar / ContentRegion / SheetHost / DialogHost / StateHost`
- `BookCover`
- `PrimaryActionButton`
- `SecondaryActionButton`
- `Loading / Empty / Error / PermissionState`

## 新增组件

- `BookDetailHeader`：封面、书名、作者、来源、换源、最新章节和操作按钮。
- `ChapterPreviewCard`：章节预览容器，必须位于简介上方。
- `ChapterPreviewList`：不少于 20 条章节预览数据。
- `IntroCard`：简介折叠卡。
- `SourceChangeSheet`：详情页内换源底表。

## 文件

- `fixture.json` / `fixture.js`：书籍详情 props。
- `../../shared-library-kit/kit.js` / `kit.css`：书架链路共享 shell。
- `render.js`：`window.BookDetailInput` 渲染器，页面骨架由 `LibraryPageKit` 输出。
- `components.css`：页面级样式，使用 `bd-` 前缀。
- `preview.html`：834 x 1886 设计稿预览。
- `state-matrix.html`：状态矩阵。

## 验收

- 章节预览必须在简介上方。
- 章节预览数据不少于 20 条。
- `查看目录` 是完整目录页入口，不替代长列表预览。
- `换源` 只打开详情页内底表，不跳转阅读控制层。
- 状态矩阵必须覆盖 default、loading、empty、error、offline、permission、source_sheet。
- 页面加入 `docs/ui-design/frontend-input/manifest.json` 后必须通过总校验脚本。
- 必须存在 `LibraryShell` DOM slots：`stackFrame`、`backTopBar`、`contentRegion`、`bottomActionHost`、`sheetHost`、`dialogHost`、`stateHost`。
