# 设置首页组件规格

## Props

- `status.time` / `status.battery`：系统状态栏展示文本。
- `topBar.title`：页面标题，固定为 `设置`。
- `overview.title`：概览卡标题。
- `overview.items[]`：本地书籍、订阅源、书源可用、最近备份。
- `quickEntries[]`：常用管理入口。
- `sections[]`：设置分组和设置行。
- `bottomNav[]`：公共主导航，固定为 `书架 / 发现 / RSS / 设置`，当前高亮 `设置`。

## States

- `default`：完整设置首页。
- `loading-overview`：本地概览局部加载，入口列表保持可见。
- `no-backup`：最近备份显示 `未设置`。
- `permission-needed`：隐私与权限行显示 `待授权`。

## Events

- `search`：设置内搜索入口。
- `more`：导入导出、恢复默认等后续入口。
- `quickEntry(target)`：常用管理入口点击。
- `openSetting(section, item)`：打开设置二级页。
- `navChange(type)`：公共主导航切换。

## Acceptance

- `preview.html` 在 852 x 1846 画布内渲染完整默认态。
- `state-matrix.html` 至少展示默认、概览加载、无备份、权限缺失四种状态。
- 页面不展示账户头像、昵称、登录入口。
- 设置首页不直接执行删除、清空、恢复默认等破坏性操作。
- 页面必须复用 `MainTabPageKit` 的 App Shell / MainNav 结构，并继续复用公共库 `rl-` Badge 与基础图标语义。
