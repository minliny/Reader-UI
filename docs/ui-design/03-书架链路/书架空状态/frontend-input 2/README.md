# 书架空状态前端输入件

来源页面：`../UI设计图.png` 与 `../文字稿.md`

文件：
- `../../../frontend-input/component-library/library.css`：公共组件库样式。
- `../../../frontend-input/contracts.d.ts`：共享 TypeScript 输入契约。
- `../../shared-library-kit/kit.js` / `kit.css`：书架链路共享 shell。
- `components.css`：书架空状态页面布局样式，统一使用 `se-` 前缀。
- `components.html`：可摘取的组件结构说明。
- `fixture.json`：页面数据结构和示例数据。
- `fixture.js`：浏览器直开时使用的 fixture 镜像。
- `render.js`：页面级渲染入口，暴露 `BookshelfEmptyInput.renderBookshelfEmpty` 和 `BookshelfEmptyInput.renderBookshelfEmptyStateMatrix`。
- `preview.html`：fixture 驱动的默认预览。
- `state-matrix.html`：当前分组空、全书架空、加载、错误、离线、权限说明状态矩阵。
- `COMPONENT_SPEC.md`：props、states、events 和验收标准。

组件拆分：
- `LibraryPageKit.StackFrame / BackTopBar / ContentRegion / BottomActionHost / StateHost`
- `BookshelfEmptyStatusBar`
- `BookshelfEmptyTopBar`
- `ShelfGroupChips`
- `EmptyStateCard`
- `PrimaryActionButton`
- `SecondaryActionButton`
- `InlineHint`
- `MainNav`

导航统一记录：
- 本包按公共主导航统一为 `书架 / 发现 / RSS / 设置`。
- 后续页面转换统一使用公共主导航四项。
- 公共主导航在本页作为书架空态底部操作内容进入 `BottomActionHost`。
