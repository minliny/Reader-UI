# RSS 首页 frontend-input

来源：

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 页面定位

`RSS` 是底部公共主导航的第三个根页面。当前输入件只覆盖 RSS 首页：订阅概览、内容筛选、订阅源筛选、最新订阅列表和底部主导航。

不在本包展开 RSS 搜索、订阅管理、添加订阅源、条目详情或行内菜单。

## 复用组件

- `AppFrame / StatusBar`
- `AppTopBar`
- `IconButton`
- `MainNav`
- `Chip`
- `Loading / Empty / Error` 状态容器
- `SourceStatusBar` 的刷新语义

## 新增组件

- `SubscriptionSummaryCard`：订阅源数、未读数、最近更新时间和刷新入口。
- `FeedStatusChips`：`全部 / 未读 / 收藏 / 稍后读 / 书单`。
- `FeedSourceChips`：`全部来源 / 小说更新 / 技术文章 / 书单推送`。
- `RssEntryItem`：RSS 条目行，含封面、标题、来源、摘要、时间和更多入口。
- `UnreadIndicator`：行首和时间旁的未读状态点。

## 文件

- `fixture.json` / `fixture.js`：RSS 首页 props。
- `render.js`：`window.RssHomeInput` 渲染器，根框架由 `MainTabPageKit` 输出。
- `components.css`：页面级样式，使用 `rs-` 前缀，并引入 `../../shared-main-tab-kit/kit.css`。
- `preview.html`：866 x 1815 设计稿预览。
- `state-matrix.html`：状态矩阵。

## 验收

- 主导航固定为 `书架 / 发现 / RSS / 设置`，且 `RSS` 高亮。
- RSS 首页不混入发现页内容模块，不展示书源管理入口。
- 行内更多按钮只保留入口，不展开菜单。
- 状态矩阵必须包含默认、刷新中、无订阅、无未读、网络失败。
- 页面加入 `docs/ui-design/frontend-input/manifest.json` 后必须通过总校验脚本。
