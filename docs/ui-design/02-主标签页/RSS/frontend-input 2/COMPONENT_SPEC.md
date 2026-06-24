# RSS 首页组件规格

## Render API

```ts
window.RssHomeInput.renderRssHome(
  target: HTMLElement,
  data: RssHomeFixture,
  options?: { state?: RssHomeState }
): void

window.RssHomeInput.renderRssHomeStateMatrix(
  target: HTMLElement,
  data: RssHomeFixture
): void
```

## Props

```ts
type RssStatusFilterType = "all" | "unread" | "favorite" | "later" | "booklist";
type RssSourceFilterType = "all" | "novel" | "tech" | "booklist";

interface RssFilterInput<TType extends string> {
  label: string;
  type: TType;
  active: boolean;
}

interface RssEntryInput {
  title: string;
  source: string;
  excerpt: string;
  time: string;
  cover: string;
  unread: boolean;
  menuLabel: string;
}
```

## States

- `default`：完整订阅概览、筛选和最新订阅列表。
- `loading`：刷新中，列表局部骨架加载。
- `empty`：还没有订阅内容，提供添加订阅源入口。
- `unreadEmpty`：未读筛选为空，保留筛选上下文。
- `error`：订阅流加载失败，提供重试和查看缓存。

## Events

- `searchOpen`
- `moreOpen`
- `refresh`
- `statusFilterChange`
- `sourceFilterChange`
- `openEntry`
- `entryMoreOpen`
- `addSubscription`
- `retry`
- `navChange`

## Acceptance

- 不生成订阅管理、添加订阅源、条目详情或行内菜单完整页面。
- 不出现账户、头像、登录入口。
- `MainNav` 的四个按钮顺序、标签和激活样式必须和公共组件库一致。
- 列表 loading/empty/error 不能移除订阅概览和筛选上下文。
- 图片缺失数必须为 0。
