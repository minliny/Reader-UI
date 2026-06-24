# 书架空状态组件规格

## Props

- `status.time`：系统状态栏时间。
- `topBar.title`：页面标题。
- `groups[]`：书架分组 Chip，`active` 决定当前空态语义。
- `emptyState`：默认当前分组空态文案、动作和提示。
- `variants`：全书架空、加载、错误、离线、权限说明状态。
- `bottomNav[]`：公共主导航，统一为 `书架 / 发现 / RSS / 设置`。

## Shell

- 使用 `LibraryShell`。
- 页面骨架由 `LibraryPageKit.renderPage` 输出。
- 分组 chip 进入 `ContentRegion`。
- 空态内容和提示进入 `StateHost`。
- 公共主导航进入 `BottomActionHost`。

## States

- `default`：当前分组没有书籍。
- `all-empty`：全书架暂无书籍，提供添加书籍和导入本地书。
- `loading`：首次检查书架数据。
- `error`：书架数据读取失败，提供重试。
- `offline`：网络不可用，联网搜索不可用，本地导入仍可达。
- `permission`：本地导入前说明权限用途。

## Events

- `search`：顶部搜索入口。
- `more`：顶部更多入口。
- `groupChange(label)`：切换分组。
- `primaryAction(state)`：执行当前状态主操作。
- `secondaryAction(state)`：执行当前状态次操作。
- `navChange(type)`：公共主导航切换。

## Acceptance

- `preview.html` 在 833 x 1888 画布内渲染完整默认态。
- `state-matrix.html` 至少展示当前分组空、全书架空、加载、错误、离线、权限说明六种状态。
- 底部导航必须使用公共主导航四项：`书架 / 发现 / RSS / 设置`。
- 空态必须说明原因，并提供明确下一步。
- 不得出现账号、会员、推荐流、广告或云端商业化入口。
- 本地导入不得作为 P0 强制流程。
- 真实 DOM 必须包含完整 `LibraryShell` slots。
