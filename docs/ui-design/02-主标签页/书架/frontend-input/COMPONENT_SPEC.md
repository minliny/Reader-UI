# 书架封面模式组件规格

## Props

- `status.time` / `status.battery`：系统状态栏展示文本。
- `topBar.title`：页面标题。
- `groups[]`：书架分组，`active` 决定选中态。
- `continueReading`：继续阅读卡片；为空时进入导入引导态。
- `recentUpdates[]`：最近更新列表；为空时展示刷新提示。
- `books[]`：封面网格数据；为空时展示空书架态。
- `bottomNav[]`：公共主导航，固定为 `书架 / 发现 / RSS / 设置`，`type` 映射图标。
- 根框架由 `MainTabPageKit` 输出：`AppFrame / StatusBar / AppTopBar / ContentRegion / MainNav / StateHost`。

## States

- `default`：完整封面书架。
- `filtering`：追更分组筛选态。
- `loading`：封面网格骨架态。
- `empty`：无书籍、无更新、无继续阅读。

## Events

- `search`：顶部搜索按钮。
- `more`：顶部更多菜单。
- `groupChange(label)`：分组切换。
- `read(book)`：继续阅读。
- `sortFilter`：排序筛选入口。
- `settings`：书架设置入口。
- `openBook(book)`：封面卡片点击。
- `navChange(type)`：公共主导航切换。

## Acceptance

- `preview.html` 在 853 x 1844 画布内渲染完整默认态。
- `state-matrix.html` 至少展示默认、筛选、加载、空书架四种状态。
- 图片资源加载失败数为 0。
- 样式只使用 `bs-` 前缀和共享 token。
- `MainNav` 必须使用 `mt-main-nav` 结构，active 只改变图标背景、图标颜色和文字颜色，不改变四按钮相对位置。
