# 书架封面模式前端输入件

来源页面：`../bookshelf-cover-mode.html`

文件：
- `../../../frontend-input/tokens.css`：跨页面共享设计 token。
- `../../shared-main-tab-kit/kit.js` / `kit.css`：主标签页共享 shell、状态栏、顶部栏、内容 slot、主导航和状态矩阵外壳。
- `../../../frontend-input/contracts.d.ts`：共享 TypeScript 输入契约。
- `components.css`：组件样式，统一使用 `bs-` 前缀。
- `components.html`：可摘取的组件片段。
- `fixture.json`：页面数据结构和示例数据，供工程管线读取。
- `fixture.js`：浏览器直开时使用的 fixture 镜像。
- `render.js`：页面级渲染入口，暴露 `BookshelfInput.renderBookshelf` 和 `BookshelfInput.renderBookshelfStateMatrix`。
- `preview.html`：fixture 驱动的组件组合预览，可直接打开。
- `state-matrix.html`：默认、追更筛选、加载、空书架状态矩阵。
- `COMPONENT_SPEC.md`：props、states、events 和验收标准。

组件拆分：
- `MainTabPageKit.StatusBar`
- `MainTabPageKit.AppTopBar`
- `ShelfChipGroup`
- `ContinueReadingCard`
- `RecentUpdateCard`
- `ShelfSectionHeader`
- `BookCoverGrid`
- `BookCoverCard`
- `MainTabPageKit.MainNav`

前端接入：
- 使用 `fixture.json` 生成业务类型。
- 对照 `../../../frontend-input/contracts.d.ts` 实现 `BookshelfFixture`、`BookshelfState` 和 `BookshelfEvent`。
- 使用 `render.js` 的 DOM 模板拆分真实框架组件。
- 使用 `state-matrix.html` 验收状态覆盖，避免只还原默认截图。
