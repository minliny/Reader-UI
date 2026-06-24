# 发现首页组件规格

## Render API

```ts
window.DiscoveryHomeInput.renderDiscoveryHome(
  target: HTMLElement,
  data: DiscoveryHomeFixture,
  options?: { state?: DiscoveryHomeState }
): void

window.DiscoveryHomeInput.renderDiscoveryHomeStateMatrix(
  target: HTMLElement,
  data: DiscoveryHomeFixture
): void
```

## Props

```ts
type DiscoverySourceType = "all" | "book-source" | "subscription";

interface DiscoverySourceTypeInput {
  label: "全部" | "书源" | "订阅";
  type: DiscoverySourceType;
  active: boolean;
}

interface DiscoveryCategoryInput {
  label: string;
  active: boolean;
}

interface DiscoveryBookInput {
  title: string;
  author: string;
  source: string;
  desc: string;
  cover: string;
  actionLabel: "阅读" | "加入书架";
  inBookshelf: boolean;
}

interface DiscoveryRankingItemInput {
  rank: number;
  title: string;
  author: string;
  source: string;
  cover: string;
  state: string;
  tone: "orange" | "green" | "muted";
}
```

## States

- `default`：书源发现首页完整态。
- `subscription`：来源类型切到订阅源，分类由订阅源提供。
- `loading`：来源类型切换时内容区骨架加载。
- `empty`：当前来源暂无内容，提供刷新和管理来源。
- `error`：来源加载失败，提供重试和切换来源。
- `offline`：网络不可用，说明离线影响并保留缓存入口。

## Events

- `searchOpen`
- `moreOpen`
- `sourceTypeChange`
- `sourceSwitchOpen`
- `categoryChange`
- `moreCategoryOpen`
- `refresh`
- `openBookDetail`
- `addToBookshelf`
- `read`
- `sourceDetect`
- `rankingMore`
- `navChange`

## Acceptance

- 不生成来源选择、更多分类、榜单详情等次级页面。
- 不出现账户、头像、登录入口。
- `MainNav` 的四个按钮顺序、标签和激活样式必须和公共组件库一致。
- 来源不可用和网络失败不能替换整个页面框架，只替换内容区状态。
- 图片缺失数必须为 0。
