# 书籍目录 frontend-input

来源：

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 页面定位

`书籍目录` 是从书籍详情页 `查看目录` 进入的完整目录页。当前输入件只覆盖目录页本身：返回标题栏、摘要栏、当前阅读章节、章节列表和目录状态。

## 复用组件

- `AppFrame / StatusBar`
- `LibraryPageKit.StackFrame / BackTopBar / ContentRegion / StateHost`
- `ChapterPreviewList` 的章节目录标记语义
- `Loading / Empty / Error` 状态容器
- `PrimaryActionButton`
- `SecondaryActionButton`

## 新增组件

- `BookDirectory.SummaryBar`：书名、当前来源、章节总量。
- `ChapterRow`：普通章节入口，包含标题和 `已缓存`、`书签`、`更新` 等目录标记。
- `CurrentChapterRow`：当前阅读章节高亮，使用浅蓝背景和右侧进度，不使用左侧图标。

## 文件

- `fixture.json` / `fixture.js`：书籍目录 props。
- `../../shared-library-kit/kit.js` / `kit.css`：书架链路共享 shell。
- `render.js`：`window.BookDirectoryInput` 渲染器，页面骨架由 `LibraryPageKit` 输出。
- `components.css`：页面级样式，使用 `dr-` 前缀。
- `preview.html`：834 x 1886 设计稿预览。
- `state-matrix.html`：状态矩阵。

## 验收

- 不展示底部主导航。
- 不展示换源入口。
- 不展示搜索、更多、筛选、排序等未定义入口。
- 当前阅读行没有左侧图标槽位。
- 普通章节行不得显示 `已读`、`未读`、`当前` 等阅读状态。
- 章节列表不是多张卡片堆叠。
- 状态矩阵必须覆盖 default、loading、empty、error。
- 页面加入 `docs/ui-design/frontend-input/manifest.json` 后必须通过总校验脚本。
- 必须存在 `LibraryShell` DOM slots：`stackFrame`、`backTopBar`、`contentRegion`、`bottomActionHost`、`sheetHost`、`dialogHost`、`stateHost`。
