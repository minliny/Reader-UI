# 书籍搜索前端输入件

来源页面：`../UI设计图.png` 与 `../文字稿.md`

文件：
- `../../../frontend-input/component-library/library.css`：公共组件库样式。
- `../../../frontend-input/contracts.d.ts`：共享 TypeScript 输入契约。
- `../../shared-library-kit/kit.js` / `kit.css`：书架链路共享 shell。
- `components.css`：书籍搜索页面布局样式，统一使用 `ss-` 前缀。
- `components.html`：可摘取的组件结构说明。
- `fixture.json`：页面数据结构和示例数据，供工程管线读取。
- `fixture.js`：浏览器直开时使用的 fixture 镜像。
- `render.js`：页面级渲染入口，暴露 `BookSearchInput.renderBookSearch` 和 `BookSearchInput.renderBookSearchStateMatrix`。
- `preview.html`：fixture 驱动的默认分组搜索预览。
- `state-matrix.html`：默认、结果、加载、空、错误、离线、权限状态矩阵。
- `COMPONENT_SPEC.md`：props、states、events 和验收标准。

组件拆分：
- `LibraryPageKit.StackFrame / BackTopBar / ContentRegion / BottomActionHost / StateHost`
- `BookSearchStatusBar`
- `BookSearchTopBar`
- `SearchBar`
- `SearchScopeTabs`
- `SearchGroupPanel`
- `SearchHistoryPanel`
- `SearchResultList`
- `SearchResultItem`
- `PrimaryActionButton`

公共库复用：
- `ReaderAssetIcons`
- `rl-icon`
- `SearchBar` 语义
- `BookRow` / `BookCover` 视觉语言
- `EmptyState` / `ErrorState` / `PermissionState` 反馈规则

前端接入：
- 使用 `fixture.json` 生成业务类型。
- 对照 `../../../frontend-input/contracts.d.ts` 实现 `BookSearchFixture`、`BookSearchState` 和 `BookSearchEvent`。
- 搜索结果进入 `书籍详情`，加入书架成功后当前行可切换为 `阅读`。
- 提交中禁止重复点击，错误状态保留关键词和范围。
- 页面必须保留 `LibraryShell` 的真实 DOM slots。
