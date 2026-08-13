# RSS 首页视觉规格

状态：正式视觉 token
适用范围：底部主导航 `RSS` 根页面
正式页面入口：`10-正式UI设计稿.md`

## 1. 继承关系

RSS 首页是主 Tab 根页面，必须继承 `../../01-全局规范/02-应用外壳组件视觉规格.md`：

- 页面背景、顶部栏、底部导航、chip、卡片和列表行使用 `AppShell.*`。
- RSS 条目可以比设置列表更高，但图标、字号、边框和触控区不得脱离 App Shell。
- 当前阶段只冻结首页，不展开搜索、订阅管理、添加订阅源、条目详情。

## 2. 页面 Token

| Token | 值 | 说明 |
| --- | --- | --- |
| `RssHome.Page.Background` | `AppShell.Page.Background` | 主 Tab 统一背景 |
| `RssHome.Page.PaddingX` | `AppShell.Page.HorizontalPadding` | 标准手机左右边距 |
| `RssHome.Page.MaxContentWidth` | `AppShell.Page.MaxContentWidth` | 大屏居中上限 |
| `RssHome.SectionGap` | `12dp` | 组件纵向间距 |
| `RssHome.ContentBottomInset` | `AppShell.BottomNav.Height + system inset + 16dp` | 底部避让 |

## 3. 订阅概览卡

| Token | 值 | 说明 |
| --- | --- | --- |
| `RssHome.Summary.Background` | `AppShell.Card.Background` | 卡片背景 |
| `RssHome.Summary.BorderColor` | `AppShell.Card.BorderColor` | 描边 |
| `RssHome.Summary.BorderWidth` | `1dp` | 边框 |
| `RssHome.Summary.Radius` | `16dp` | 主 Tab 卡片圆角 |
| `RssHome.Summary.Padding` | `16dp` | 内边距 |
| `RssHome.Summary.MinHeight` | `116dp` | 概览卡高度 |
| `RssHome.Summary.TitleSize` | `17sp` | `订阅概览` |
| `RssHome.Summary.ValueSize` | `20sp` | 统计值 |
| `RssHome.Summary.LabelSize` | `13sp` | 字段名 |
| `RssHome.Summary.RefreshIconSize` | `20dp` | 刷新入口 |

字段为 `订阅源 / 未读 / 最近更新`。刷新入口在卡片右上或底部行内，不能做成大按钮。

## 4. 筛选 Chip

| Token | 值 | 说明 |
| --- | --- | --- |
| `RssHome.StatusChip.Height` | `AppShell.Chip.Height` | 内容筛选 |
| `RssHome.SourceChip.Height` | `AppShell.Chip.Height` | 来源筛选 |
| `RssHome.Chip.PaddingX` | `AppShell.Chip.PaddingX` | 左右内边距 |
| `RssHome.Chip.Gap` | `AppShell.Chip.Gap` | 间距 |
| `RssHome.Chip.ActiveBackground` | `AppShell.Chip.Active.Background` | 激活态 |
| `RssHome.Chip.InactiveBackground` | `AppShell.Chip.Inactive.Background` | 未激活态 |
| `RssHome.Chip.TextSize` | `AppShell.Chip.TextSize` | 文案字号 |

内容筛选和来源筛选分为两条横向滚动 chip rail，不能混成一条长标签墙。

## 5. RSS 条目行

| Token | 值 | 说明 |
| --- | --- | --- |
| `RssHome.Entry.Background` | `AppShell.Card.Background` | 行卡片背景 |
| `RssHome.Entry.BorderColor` | `AppShell.Card.BorderColor` | 描边 |
| `RssHome.Entry.BorderWidth` | `1dp` | 边框 |
| `RssHome.Entry.Radius` | `16dp` | 圆角 |
| `RssHome.Entry.PaddingX` | `16dp` | 左右内边距 |
| `RssHome.Entry.PaddingY` | `14dp` | 上下内边距 |
| `RssHome.Entry.MinHeight` | `92dp` | 条目最小高度 |
| `RssHome.Entry.TitleSize` | `16sp` | 条目标题 |
| `RssHome.Entry.TitleWeight` | `600` | 未读标题字重 |
| `RssHome.Entry.SummarySize` | `13sp` | 摘要 |
| `RssHome.Entry.MetaSize` | `12sp` | 来源、时间 |
| `RssHome.Entry.MoreIconSize` | `20dp` | 行内更多 |
| `RssHome.Entry.TouchTarget` | `48dp` | 条目触控 |

标题最多两行，摘要最多两行，来源和时间一行省略。

## 6. 未读标记

| Token | 值 | 说明 |
| --- | --- | --- |
| `RssHome.UnreadDot.Size` | `8dp` | 未读圆点 |
| `RssHome.UnreadDot.Color` | `#2F6F93` | 复用主强调色 |
| `RssHome.UnreadTitle.Weight` | `600` | 未读标题 |
| `RssHome.ReadTitle.Weight` | `500` | 已读标题 |
| `RssHome.ReadOpacity` | `82%` | 已读内容弱化 |

未读状态不能只依赖颜色，标题字重也要变化。

## 7. 底部导航

底部导航继承 `AppShell.BottomNav.*`。当前激活项为 `RSS`，顺序固定为 `书架 / 发现 / RSS / 设置`。

## 8. 响应式规则

| 条件 | 规则 |
| --- | --- |
| 宽度 `<360dp` | 两条 chip rail 横滚；条目摘要最多一行 |
| 宽度 `360-430dp` | 标准单列订阅流 |
| 宽度 `>430dp` | 内容最大宽居中，不扩展为双列 |
| 高度 `<760dp` | 概览卡压缩统计间距，优先露出首个条目 |

不通过缩小字号或隐藏底部导航适配。

## 9. 状态复用

- 刷新中：概览和筛选保持可见，列表局部 loading。
- 无订阅：使用 `AppShell.State.*`，主操作 `添加订阅源` 作为 P1。
- 无未读：保留筛选上下文，提示当前筛选无内容。
- 网络失败：保留上次内容或框架，提供 `重试`。
