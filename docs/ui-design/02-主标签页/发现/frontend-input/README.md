# 发现首页 frontend-input

来源：

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 页面定位

`发现` 是底部公共主导航的第二个根页面。当前输入件只覆盖发现首页结构：搜索入口、来源类型、当前来源、来源分类、推荐内容、来源状态条、榜单更新和底部主导航。

不在本包展开来源选择底表、更多分类、榜单详情、发现设置或来源检测详情。

## 复用组件

- `AppFrame / StatusBar`
- `AppTopBar`
- `IconButton`
- `MainNav`
- `SearchBar` 语义，当前页作为只读 `SearchEntry`
- `Chip`
- `SearchResultItem` 的书籍行动作结构
- `Loading / Empty / Error` 状态容器

## 新增组件

- `SearchEntry`：发现页进入书籍搜索链路的只读入口。
- `SourceTypeSegment`：`全部 / 书源 / 订阅` 的来源类型切换。
- `CurrentSourceCard`：当前来源、来源数量、切换入口。
- `SourceCategoryChips`：由当前来源提供的分类 chips。
- `DiscoveryContentCard`：推荐内容卡，支持阅读或加入书架。
- `SourceStatusBar`：来源数量、可用数、更新时间和检测入口。
- `DiscoveryRankingCard`：来源榜单更新列表。

## 文件

- `fixture.json` / `fixture.js`：发现首页 props。
- `render.js`：`window.DiscoveryHomeInput` 渲染器，根框架由 `MainTabPageKit` 输出。
- `components.css`：页面级样式，使用 `ds-` 前缀，并引入 `../../shared-main-tab-kit/kit.css`。
- `preview.html`：831 x 1893 设计稿预览。
- `state-matrix.html`：状态矩阵。
- `components.html`：拆分组件参考。

## 验收

- 主导航固定为 `书架 / 发现 / RSS / 设置`，且 `发现` 高亮。
- 分类必须来自当前来源，不做固定全局分类池。
- 搜索入口只跳转书籍搜索，不在发现页内展开。
- 状态矩阵必须包含默认、来源类型切换、加载、空、错误、离线。
- 页面加入 `docs/ui-design/frontend-input/manifest.json` 后必须通过总校验脚本。
