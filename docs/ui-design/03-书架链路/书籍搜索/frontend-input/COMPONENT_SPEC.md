# 书籍搜索组件规格

## Props

- `status.time` / `status.battery`：系统状态栏展示文本。
- `topBar.title`：页面标题，固定为 `书籍搜索`。
- `search.query`：当前输入关键词。
- `search.placeholder`：搜索框占位文案。
- `scopes[]`：搜索范围，固定为 `本地 / 网络 / 全局 / 分组`。
- `groupPanel.groups[]`：分组搜索范围。
- `history.items[]`：搜索历史词。
- `results[]`：搜索结果列表，包含封面、书名、作者、来源、最新章节和书架状态。
- `feedback`：加载、空、错误、离线和权限说明文案。
- `primaryAction`：底部主按钮文案，默认 `搜索`。

## Shell

- 使用 `LibraryShell`。
- 页面骨架由 `LibraryPageKit.renderPage` 输出。
- 搜索框、范围、分组、历史、结果和反馈进入 `ContentRegion`。
- 底部搜索按钮进入 `BottomActionHost`。

## States

- `default`：未提交关键词，展示搜索框、范围、分组选择和搜索历史。
- `results`：提交关键词后展示结果列表。
- `loading`：局部搜索加载，保留搜索框和范围。
- `empty`：无结果，说明空原因并提供清空关键词入口。
- `error`：加载失败，保留上下文并提供重试。
- `offline`：网络不可用，保留本地搜索路径。
- `permission`：本地搜索需要授权时先说明用途。

## Events

- `back`：返回来源页。
- `more`：更多入口，当前仅保留语义。
- `queryChange(value)`：搜索输入变化。
- `clearQuery`：清空关键词。
- `scopeChange(scopeType)`：切换搜索范围。
- `groupChange(label)`：切换分组搜索范围。
- `historySelect(label)`：选择历史词并填入搜索框。
- `clearHistory`：清空历史。
- `submitSearch`：提交搜索。
- `openDetail(result)`：进入书籍详情。
- `addToBookshelf(result)`：加入书架。
- `read(result)`：阅读已在书架中的结果。
- `retry`：重试失败请求。
- `requestPermission`：打开权限授权。

## Acceptance

- `preview.html` 在 833 x 1888 画布内渲染完整默认态。
- `state-matrix.html` 展示默认、结果、加载、空、错误、离线、权限七种状态。
- 默认态必须包含 `书籍搜索`、`搜索书名、作者、关键词`、`本地`、`网络`、`全局`、`分组`、`选择分组`、`搜索历史`、`搜索`。
- 结果态必须包含 `加入书架` 和 `阅读` 两类动作。
- 页面不展示账户、社区、广告、会员或推荐流入口。
- 页面不展示公共主导航；返回由顶部栏承担。
- 提交中禁止重复点击底部主按钮。
- 真实 DOM 必须包含完整 `LibraryShell` slots。
