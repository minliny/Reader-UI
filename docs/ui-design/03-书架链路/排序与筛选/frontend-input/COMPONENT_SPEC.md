# 排序与筛选组件规格

## Render API

```ts
window.SortFilterInput.renderSortFilter(
  target: HTMLElement,
  data: SortFilterFixture,
  options?: { state?: SortFilterState }
): void

window.SortFilterInput.renderSortFilterStateMatrix(
  target: HTMLElement,
  data: SortFilterFixture
): void
```

## Props

```ts
interface SortFilterOptionInput {
  label: string;
  type: string;
  active: boolean;
}

interface SortFilterSectionInput {
  title: string;
  mode: "single" | "multi";
  options: SortFilterOptionInput[];
}
```

## States

- `default`：展示当前排序和筛选。
- `selected`：已选项高亮，显示保存成功轻反馈。
- `empty`：筛选无结果，提示重置。
- `error`：应用失败，保留选择并提供重试。

## Shell

- 使用 `LibraryShell`。
- 页面骨架由 `LibraryPageKit.renderPage` 输出。
- 来源书架上下文进入 `ContentRegion`。
- 遮罩进入 `BottomActionHost`。
- 排序筛选底表进入 `SheetHost`。

## Events

- `dismiss`
- `sortSelect`
- `orderSelect`
- `filterToggle`
- `reset`
- `apply`
- `retry`

## Acceptance

- 提交中禁用重复点击。
- 失败时保留当前选择。
- 返回未应用变更时保持原书架状态。
- 底表关闭顺序为先关闭当前浮层，再返回上级页面。
- 真实 DOM 必须包含完整 `LibraryShell` slots。
